const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const entries = process.argv.slice(2);
if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
const evidence = process.env.NDS_SELECTION_EVIDENCE;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const template = {
  $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
  contentVersion: '1.0.0.0',
  resources: [
    { type: 'Microsoft.Web/sites', apiVersion: '2023-12-01', name: 'diagram-demo-app',
      location: 'eastus', properties: {} },
    { type: 'Microsoft.Storage/storageAccounts', apiVersion: '2023-05-01',
      name: 'diagramdemostorage', location: 'eastus', kind: 'StorageV2',
      sku: { name: 'Standard_LRS' }, properties: {} },
    { type: 'Microsoft.Network/virtualNetworks', apiVersion: '2023-09-01', name: 'diagram-demo-vnet',
      location: 'eastus', properties: { addressSpace: { addressPrefixes: ['10.40.0.0/16'] },
        subnets: [{ name: 'private-endpoints', properties: { addressPrefix: '10.40.2.0/24' } }] } },
    { type: 'Microsoft.Network/privateEndpoints', apiVersion: '2023-09-01', name: 'diagram-demo-pe',
      location: 'eastus', properties: {
        subnet: { id: "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'diagram-demo-vnet', 'private-endpoints')]" },
        privateLinkServiceConnections: [{ name: 'storage', properties: {
          privateLinkServiceId: "[resourceId('Microsoft.Storage/storageAccounts', 'diagramdemostorage')]",
          groupIds: ['blob'],
        } }],
      } },
  ],
};

async function verify(entry, index) {
  const entryHash = digest(entry);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1050 }, locale: 'en-US', acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [], network = [], selections = [], created = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-connector-selection-'));
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  const settle = () => page.waitForTimeout(140);
  const graph = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__nds_diagramStore.getState().diagram)));
  const node = id => page.locator(`.react-flow__node[data-id="${id}"]`);
  const screenshot = async name => {
    if (evidence) await page.screenshot({ path: path.join(evidence, `${index}-${name}.png`) });
  };
  async function reset(diagram) {
    await page.evaluate(value => window.__nds_diagramStore.getState().loadDiagram(value, { relayout: false }), diagram);
    await settle();
  }
  async function selectNode(id) {
    await page.evaluate(value => window.__nds_diagramStore.getState().selectNode(value), id);
    await settle();
  }
  async function point(id, zone) {
    const candidate = await page.evaluate(({ id, zone }) => {
      const hit = document.querySelector(`[data-nds-edge-hit="${id}"]`);
      const rect = element => ({ id: element.getAttribute('data-id'), selected: element.classList.contains('selected'),
        ...element.getBoundingClientRect().toJSON() });
      const groups = [...document.querySelectorAll('.react-flow__node-azureGroup')].map(rect);
      const leaves = [...document.querySelectorAll('.react-flow__node-azure')].map(rect);
      const labels = [...document.querySelectorAll('[data-nds-edge-label], [data-nds-edge-delete]')].map(rect);
      const pane = rect(document.querySelector('.react-flow'));
      const inside = (p, r, margin = 0) => p.x > r.x - margin && p.x < r.right + margin &&
        p.y > r.y - margin && p.y < r.bottom + margin;
      const length = hit.getTotalLength();
      for (let fraction = .12; fraction < .9; fraction += .02) {
        const world = hit.getPointAtLength(length * fraction);
        const p = new DOMPoint(world.x, world.y).matrixTransform(hit.getScreenCTM());
        const owner = groups.filter(r => inside(p, r, -8)).sort((a, b) => a.width * a.height - b.width * b.height)[0];
        const controlBorder = groups.some(r => r.selected && inside(p, r, 14) && !inside(p, r, -14));
        if (!inside(p, pane, -20) || (owner?.id ?? null) !== zone || leaves.some(r => inside(p, r, 12)) ||
            controlBorder || labels.some(r => r.width && r.height && inside(p, r, 8))) continue;
        const top = document.elementFromPoint(p.x, p.y);
        return { x: p.x, y: p.y, world: { x: world.x, y: world.y },
          hitNode: top?.closest('.react-flow__node')?.getAttribute('data-id'),
          hitEdge: top?.closest('.react-flow__edge')?.getAttribute('data-id') };
      }
      return null;
    }, { id, zone });
    assert(candidate, `A visible connector segment must exist in ${zone || 'the open canvas'}`);
    return candidate;
  }
  async function selectEdge(id, zone, name) {
    const hit = await point(id, zone);
    await page.mouse.click(hit.x, hit.y);
    await settle();
    const selection = await page.evaluate(() => {
      const state = window.__nds_diagramStore.getState();
      return { nodes: state.selectedNodeIds, edges: state.selectedEdgeIds };
    });
    selections.push({ name, zone, hit, selection });
    assert.deepEqual(selection.edges, [id], `${name}: native pointer selection must reach the connector, not its group`);
    assert.deepEqual(selection.nodes, [], `${name}: selecting an arrow must not select a resource group`);
    assert.equal(hit.hitEdge, id, `${name}: the connector owns its hit target`);
    await layers();
    return hit;
  }
  async function layers() {
    const actual = await page.evaluate(() => {
      const z = element => Number(getComputedStyle(element).zIndex);
      const groups = [...document.querySelectorAll('.react-flow__node-azureGroup')].map(z);
      const cards = [...document.querySelectorAll('.react-flow__node-azure')].map(z);
      return { groups, cards, edges: z(document.querySelector('.react-flow__edges')),
        labels: z(document.querySelector('.react-flow__edgelabel-renderer')) };
    });
    assert.equal(actual.edges, 900 + actual.groups.length);
    assert.equal(actual.labels, 3000 + actual.groups.length);
    assert(actual.groups.every(z => z < actual.edges), 'Every group stays below connectors');
    assert(actual.cards.every(z => z > actual.edges && z < actual.labels), 'Cards shield lines; labels stay above cards');
  }
  async function shortcut(keys) {
    await page.locator('[data-nds-fullscreen]').focus();
    await page.keyboard.press(keys);
    await settle();
  }
  async function save(label, filename) {
    const destination = path.join(temp, filename);
    created.push(destination);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    await (await pending).saveAs(destination);
    return destination;
  }
  try {
    await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
    await page.goto(pathToFileURL(path.resolve(entry)).href);
    const choose = page.waitForEvent('filechooser');
    await page.locator('#nds-arm-open').click();
    await page.locator('#nds-arm-choose').click();
    await (await choose).setFiles({ name: 'template.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(template)) });
    await page.locator('#nds-arm-group').fill('diagram-demo');
    await page.locator('#nds-arm-sub').fill('00000000-0000-0000-0000-000000000000');
    await page.locator('#nds-arm-start').click();
    await page.waitForFunction(() => !document.querySelector('#nds-arm-result').hidden ||
      !document.querySelector('#nds-arm-error').hidden);
    assert(await page.locator('#nds-arm-error').isHidden(), await page.locator('#nds-arm-error').textContent());
    await page.locator('#nds-arm-cancel').click();
    const imported = await graph();
    const ids = await page.evaluate(() => {
      const store = window.__nds_diagramStore.getState();
      const diagram = structuredClone(store.diagram);
      const find = name => diagram.nodes.find(node => node.data.name === name);
      const app = find('diagram-demo-app'), storage = find('diagramdemostorage');
      const vnet = find('diagram-demo-vnet'), pe = find('diagram-demo-pe');
      const subnet = diagram.nodes.find(node => node.id === pe.parent);
      const group = diagram.nodes.find(node => node.id === app.parent);
      for (const [node, x, y, w, h] of [
        [group, 0, 0, 1200, 850], [vnet, 30, 110, 610, 690],
        [subnet, 30, 90, 450, 330], [pe, 60, 80, 220, 175],
        [app, 870, 80, 220, 175], [storage, 820, 460, 220, 175],
      ]) { node.position = { x, y }; node.size = { w, h }; }
      store.loadDiagram(diagram, { relayout: false });
      return { app: app.id, storage: storage.id, pe: pe.id, group: group.id,
        subnet: subnet.id, vnet: vnet.id,
        privateLink: diagram.edges.find(edge => edge.source === pe.id && edge.target === storage.id)?.id,
        link: window.__nds_diagramStore.getState().addEdge(app.id, storage.id) };
    });
    assert(ids.privateLink, 'ARM import creates a real Private Link connector');
    await settle();
    await page.locator('.react-flow__controls-fitview').click();
    await settle();
    const original = await graph();
    for (const n of original.nodes) {
      const before = imported.nodes.find(value => value.id === n.id);
      assert.equal(n.parent, before.parent);
      assert.deepEqual(n.data, before.data, 'Arranging the fixture preserves the imported ARM metadata');
    }

    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const selected of [null, ids.group, ids.vnet, ids.subnet]) {
        for (const [edge, zone] of [
          [ids.link, ids.group], [ids.privateLink, ids.subnet],
          [ids.privateLink, ids.vnet], [ids.privateLink, ids.group],
        ]) {
          await selectNode(selected);
          await selectEdge(edge, zone, `${theme}/${selected || 'none'}/${zone}`);
        }
      }
    }
    await layers();
    await screenshot('selected');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });

    await selectNode(ids.group);
    const editPoint = await point(ids.link, ids.group);
    // Give the selection render time between the two physical clicks.
    await page.mouse.dblclick(editPoint.x, editPoint.y, { delay: 80 });
    const input = page.locator(`[data-nds-edge-label-input="${ids.link}"]`);
    await input.fill('Application traffic');
    await input.press('Enter');
    await settle();
    assert.equal((await graph()).edges.find(edge => edge.id === ids.link).label, 'Application traffic');
    assert.equal(await page.evaluate(() => window.__nds_tabsStore.getState().activeTab().shapes.length), 0,
      'Double-clicking a connector does not create a canvas text shape');
    await page.locator('[data-nds-connector-route="straight"]').click();
    await page.locator('[data-nds-connector-head="none"]').click();
    await shortcut('Control+z');
    assert.notEqual((await graph()).edges.find(edge => edge.id === ids.link).data?.['nds.connector.head'], 'none');
    await shortcut('Control+y');
    assert.equal((await graph()).edges.find(edge => edge.id === ids.link).data['nds.connector.head'], 'none');
    await page.locator('[data-nds-connector-head="end"]').click();
    await selectNode(ids.group);
    await selectEdge(ids.link, ids.group, 'edited straight connector');
    const edited = await graph();
    assert.deepEqual(edited.nodes, original.nodes, 'Editing a connector does not modify imported resources');
    await shortcut('Delete');
    assert.equal((await graph()).edges.length, edited.edges.length - 1);
    assert.deepEqual((await graph()).nodes, edited.nodes, 'Delete removes the arrow, not its resource group');
    await shortcut('Control+z');
    assert.deepEqual((await graph()).edges, edited.edges);
    await screenshot('edited');

    const json = await save('Save JSON', 'edited.json');
    await reset(original);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await chooser).setFiles(json);
    await settle();
    assert.deepEqual((await graph()).edges, edited.edges);
    const owner = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    await page.locator('[data-nds-tab-add="1"]').click();
    await page.locator(`[data-nds-tab="${owner}"]`).click();
    await settle();
    await selectNode(ids.group);
    await page.locator('.react-flow__controls-fitview').click();
    await settle();
    await selectEdge(ids.link, ids.group, 'JSON and tab restoration');
    const svg = await save('SVG', 'edited.svg'), png = await save('PNG', 'edited.png');
    assert(fs.readFileSync(svg, 'utf8').includes('Application traffic'));
    assert.equal(fs.readFileSync(png).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    await page.waitForTimeout(1200);
    await page.reload();
    await node(ids.app).waitFor();
    assert.deepEqual((await graph()).edges, edited.edges);
    assert.deepEqual((await graph()).nodes, edited.nodes);
    await selectNode(ids.group);
    await page.locator('.react-flow__controls-fitview').click();
    await settle();
    await selectEdge(ids.link, ids.group, 'browser restoration');

    await reset(original);
    await selectNode(null);
    const crossing = await point(ids.link, ids.group);
    await page.evaluate(({ id, world }) => {
      const store = window.__nds_diagramStore.getState();
      const byId = new Map(store.diagram.nodes.map(node => [node.id, node]));
      const resource = byId.get(id);
      let x = 0, y = 0, parent = byId.get(resource.parent);
      while (parent) { x += parent.position.x; y += parent.position.y; parent = byId.get(parent.parent); }
      store.moveNode(id, { x: world.x - x - resource.size.w / 2, y: world.y - y - resource.size.h / 2 });
    }, { id: ids.pe, world: crossing.world });
    await settle();
    const protectedCard = await page.evaluate(({ x, y }) =>
      document.elementFromPoint(x, y)?.closest('.react-flow__node')?.getAttribute('data-id'), crossing);
    assert.equal(protectedCard, ids.pe, 'A resource card shields the connector running underneath it');
    await page.mouse.click(crossing.x, crossing.y);
    await settle();
    assert.equal(await page.evaluate(() => window.__nds_diagramStore.getState().selectedNodeId), ids.pe);
    await layers();
    const beforeDrag = (await graph()).nodes.find(n => n.id === ids.pe);
    const label = await node(ids.pe).locator('[title$="double-click to rename"]').first().boundingBox();
    await page.mouse.move(label.x + label.width / 2, label.y + label.height / 2);
    await page.mouse.down();
    await page.mouse.move(label.x + label.width / 2 + 75, label.y + label.height / 2 + 45, { steps: 20 });
    await page.mouse.up();
    await settle();
    const afterDrag = (await graph()).nodes.find(n => n.id === ids.pe);
    assert(Math.abs(afterDrag.position.x - beforeDrag.position.x) > 30, 'The shielded card still drags natively');
    assert.equal(afterDrag.parent, beforeDrag.parent);
    await screenshot('protected-card');

    const flat = structuredClone(original);
    const byId = new Map(original.nodes.map(n => [n.id, n]));
    for (const n of flat.nodes) {
      let parent = byId.get(n.parent);
      while (parent) { n.position.x += parent.position.x; n.position.y += parent.position.y; parent = byId.get(parent.parent); }
      delete n.parent;
    }
    await reset(flat);
    await selectNode(ids.group);
    await selectEdge(ids.link, ids.group, 'unparented resources inside a drawn group');
    await layers();
    flat.nodes = flat.nodes.filter(n => !n.type.startsWith('group-'));
    await reset(flat);
    await selectEdge(ids.link, null, 'ordinary connectors without groups');
    await layers();

    const controls = { ...original, nodes: [
      { id: 'frame-a', type: 'group-vnet', position: { x: 0, y: 0 }, size: { w: 400, h: 300 }, data: { name: 'VNet A', fields: {}, state: 'ok' } },
      { id: 'frame-b', type: 'group-vnet', position: { x: 650, y: 0 }, size: { w: 400, h: 300 }, data: { name: 'VNet B', fields: {}, state: 'ok' } },
      { id: 'above', type: 'vm', position: { x: 280, y: -220 }, size: { w: 240, h: 160 }, data: { name: 'Above', fields: {}, state: 'ok' } },
      { id: 'below', type: 'vm', position: { x: 280, y: 450 }, size: { w: 240, h: 160 }, data: { name: 'Below', fields: {}, state: 'ok' } },
    ], edges: [
      { id: 'peering', source: 'frame-a', target: 'frame-b', kind: 'peering' },
      { id: 'border-line', source: 'above', target: 'below', sourceHandle: 's-b', targetHandle: 't-t',
        kind: 'link', data: { 'nds.connector.route': 'straight' } },
    ] };
    await reset(controls);
    await selectNode('frame-a');
    await page.locator('.react-flow__controls-fitview').click();
    await settle();
    const port = node('frame-a').locator('[data-handleid="s-r"]');
    const portOwnsHit = await port.evaluate(element => {
      const r = element.getBoundingClientRect();
      return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.react-flow__handle');
    });
    assert(portOwnsHit, 'An existing peering must not cover its selected group connection dot');
    const from = await port.boundingBox();
    const to = await node('frame-b').locator('[data-handleid="t-t"]').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 24 });
    await page.mouse.up();
    await settle();
    assert.equal((await graph()).edges.length, 3, 'A used group connection dot can start another real connector');
    await page.keyboard.press('Escape');
    await selectNode('frame-a');
    const sizeBefore = (await graph()).nodes.find(n => n.id === 'frame-a').size;
    const grip = await node('frame-a').locator('.react-flow__resize-control.handle.bottom.right').boundingBox();
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 + 40, grip.y + grip.height / 2 + 30, { steps: 20 });
    await page.mouse.up();
    await settle();
    const sizeAfter = (await graph()).nodes.find(n => n.id === 'frame-a').size;
    assert(sizeAfter.w > sizeBefore.w && sizeAfter.h > sizeBefore.h,
      'A selected group still resizes where an existing connector crosses its corner');
    await layers();
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    assert.equal(digest(entry), entryHash, 'The entry did not change during verification');
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-result.json`), JSON.stringify({
      entry: path.resolve(entry), entryHash, importedNodes: imported.nodes.length,
      nativeSelections: selections.length, selections, editing: true, history: true,
      protectedCards: true, groupControls: true, saveLoad: true, tabRestore: true, browserRestore: true,
      exports: ['SVG', 'PNG'], errors, network,
    }, null, 2));
    console.log(`PASS ${path.basename(entry)}: ARM import, ${selections.length} native connector selections, nested groups, themes, editing, protected cards, history, persistence and exports`);
  } catch (error) {
    await screenshot('failure');
    const nodeLayers = await page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => ({
      id: node.getAttribute('data-id'), selected: node.classList.contains('selected'),
      z: getComputedStyle(node).zIndex,
    })));
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-failure.json`), JSON.stringify({
      entry, error: error.message, selections, nodeLayers, errors, network,
    }, null, 2));
    throw error;
  } finally {
    await context.close();
    await browser.close();
    for (const file of created) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
}

(async () => {
  for (let index = 0; index < entries.length; index++) await verify(entries[index], index);
})().catch(error => { console.error(error); process.exitCode = 1; });
