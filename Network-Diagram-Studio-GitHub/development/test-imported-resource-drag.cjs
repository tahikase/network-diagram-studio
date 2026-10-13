const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const entries = process.argv.slice(2);
if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
const evidence = process.env.NDS_DRAG_EVIDENCE;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const template = {
  $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
  contentVersion: '1.0.0.0',
  resources: [
    { type: 'Microsoft.Web/sites', apiVersion: '2023-12-01', name: 'diagram-demo-app', location: 'eastus', properties: {} },
    { type: 'Microsoft.Network/virtualNetworks', apiVersion: '2023-09-01', name: 'diagram-demo-vnet',
      location: 'eastus', properties: { addressSpace: { addressPrefixes: ['10.20.0.0/16'] },
        subnets: [{ name: 'application', properties: { addressPrefix: '10.20.1.0/24' } }] } },
    { type: 'Microsoft.Network/networkInterfaces', apiVersion: '2023-09-01', name: 'diagram-demo-nic',
      properties: { ipConfigurations: [{ name: 'primary', properties: { privateIPAddress: '10.20.1.4',
        subnet: { id: "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'diagram-demo-vnet', 'application')]" } } }] } },
    { type: 'Microsoft.Compute/virtualMachines', apiVersion: '2023-09-01', name: 'diagram-demo-vm',
      properties: { networkProfile: { networkInterfaces: [
        { id: "[resourceId('Microsoft.Network/networkInterfaces', 'diagram-demo-nic')]" },
      ] } } },
  ],
};

async function verify(entry, index) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1050 }, locale: 'en-US', acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [], network = [], results = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-imported-drag-'));
  const created = [];
  const node = id => page.locator(`.react-flow__node[data-id="${id}"]`);
  const graph = () => page.evaluate(() => window.__nds_diagramStore.getState().diagram);
  const stateNodes = async () => (await graph()).nodes;
  const settle = () => page.waitForTimeout(250);
  const positions = nodes => nodes.map(n => ({ id: n.id, parent: n.parent, position: n.position, size: n.size }));
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  async function save(label, filename) {
    const destination = path.join(temp, filename);
    created.push(destination);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    await (await pending).saveAs(destination);
    return destination;
  }
  async function load(filename) {
    const pending = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await pending).setFiles(filename);
    await settle();
  }
  async function frame(id, selected = [id]) {
    await page.evaluate(ids => {
      const store = window.__nds_diagramStore.getState();
      store.selectNode(null);
      store.applyNodeSelection(ids.map(id => ({ id, selected: true })));
    }, selected);
    await settle();
    await page.locator('.react-flow__controls-fitview').click();
    await settle();
    for (let i = 0; i < 2; i++) {
      await page.locator('.react-flow__controls-zoomout').click();
      await settle();
    }
  }
  async function dragBeyond(id, direction, name) {
    const data = (await stateNodes()).find(n => n.id === id);
    assert(data.parent);
    const box = await node(id).boundingBox();
    const parent = await node(data.parent).boundingBox();
    const label = await node(id).locator('[title$="double-click to rename"]').first().boundingBox();
    const pane = await page.locator('.react-flow').boundingBox();
    assert(box && parent && label && pane);
    const start = { x: label.x + label.width / 2, y: label.y + label.height / 2 };
    const left = direction === 'left' ? parent.x - 30 :
      direction === 'right' ? parent.x + parent.width - box.width + 30 : box.x;
    const top = direction === 'top' ? parent.y - 30 :
      direction === 'bottom' ? parent.y + parent.height - box.height + 30 : box.y;
    const end = { x: start.x + left - box.x, y: start.y + top - box.y };
    assert(end.x > pane.x + 20 && end.x < pane.x + pane.width - 20 &&
      end.y > pane.y + 20 && end.y < pane.y + pane.height - 20,
    `${name}: target must stay inside the visible canvas`);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Cross the native drag threshold before measuring the requested movement.
    await page.mouse.move(start.x + 2, start.y + 2);
    await page.waitForFunction(() => window.__nds_diagramStore.getState().gestureBase !== null);
    const active = await node(id).boundingBox();
    await page.mouse.move(end.x + 2 - (active.x - box.x), end.y + 2 - (active.y - box.y), { steps: 24 });
    await page.waitForTimeout(75);
    await page.mouse.up();
    await settle();
    const after = await node(id).boundingBox();
    const result = { name, direction, parent, before: box, expected: { x: left, y: top }, after };
    results.push(result);
    if (evidence) {
      await page.screenshot({ path: path.join(evidence, `${index}-${name}.png`) });
      fs.writeFileSync(path.join(evidence, `${index}-movements.json`), JSON.stringify(results, null, 2));
    }
    assert(Math.abs(after.x - left) < 2 && Math.abs(after.y - top) < 2,
      `${name}: resource stopped at its parent instead of following the pointer; expected (${left.toFixed(1)}, ${top.toFixed(1)}), actual (${after.x.toFixed(1)}, ${after.y.toFixed(1)})`);
    return result;
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
    await settle();
    const imported = await stateNodes();
    const app = imported.find(n => n.data.name === 'diagram-demo-app');
    const vm = imported.find(n => n.data.name === 'diagram-demo-vm');
    const vnet = imported.find(n => n.data.name === 'diagram-demo-vnet');
    const subnet = imported.find(n => n.type === 'group-subnet');
    assert(app?.parent && vm?.parent && vnet?.parent && subnet?.parent);
    assert.equal(vm.parent, subnet.id);
    assert.equal(subnet.parent, vnet.id);
    const edge = await page.evaluate(([source, target]) => {
      const store = window.__nds_diagramStore.getState();
      const id = store.addEdge(source, target);
      store.updateEdgeLabel(id, 'Application link');
      return id;
    }, [app.id, vm.id]);
    await settle();
    const original = await graph();
    async function reset() {
      await page.evaluate(diagram => window.__nds_diagramStore.getState().loadDiagram(diagram, { relayout: false }), original);
      await settle();
    }
    for (const [target, direction, name] of [
      ...['left', 'right', 'top', 'bottom'].map(direction => [app, direction, `app-${direction}`]),
      [vm, 'left', 'nested-vm-left'],
      [vnet, 'top', 'nested-vnet-top'],
      [subnet, 'right', 'nested-subnet-right'],
    ]) {
      await reset();
      await frame(target.id);
      const before = await graph();
      const oldPath = await page.locator(`.react-flow__edge[data-id="${edge}"] .react-flow__edge-path`).getAttribute('d');
      await dragBeyond(target.id, direction, name);
      const after = await graph();
      for (const n of after.nodes) {
        const old = before.nodes.find(previous => previous.id === n.id);
        assert.equal(n.parent, old.parent, 'Dragging does not silently change group membership');
        assert.deepEqual(n.data, old.data, 'ARM IDs and resource properties stay intact');
        if (n.id !== target.id) assert.deepEqual(n.position, old.position, 'Other nodes keep their relative positions');
      }
      assert.deepEqual(after.edges, before.edges);
      const newPath = await page.locator(`.react-flow__edge[data-id="${edge}"] .react-flow__edge-path`).getAttribute('d');
      assert.notEqual(newPath, oldPath, 'Connections follow moved nodes and nested descendants');
      assert.equal(await page.evaluate(() => window.__nds_diagramStore.getState().history.past.length), 1);
      await page.keyboard.press('Control+z');
      await settle();
      assert.deepEqual(positions(await stateNodes()), positions(before.nodes), 'One undo restores the drag');
      await page.keyboard.press('Control+y');
      await settle();
      assert.deepEqual(positions(await stateNodes()), positions(after.nodes), 'Redo restores the outside position');
    }

    await reset();
    await frame(app.id, [app.id, vnet.id]);
    const multiBefore = await stateNodes();
    await dragBeyond(app.id, 'left', 'multi-selection-left');
    const multiAfter = await stateNodes();
    const delta = id => {
      const a = multiBefore.find(n => n.id === id), b = multiAfter.find(n => n.id === id);
      return { x: b.position.x - a.position.x, y: b.position.y - a.position.y };
    };
    for (const axis of ['x', 'y']) assert(Math.abs(delta(app.id)[axis] - delta(vnet.id)[axis]) < .001,
      'Selected imported nodes move by the same delta');
    assert.deepEqual(multiAfter.find(n => n.id === vm.id).position, multiBefore.find(n => n.id === vm.id).position);

    await reset();
    await frame(app.id);
    await dragBeyond(app.id, 'left', 'persist-outside-left');
    await dragBeyond(app.id, 'top', 'persist-outside-top');
    const negative = await stateNodes();
    const negativeFile = await save('Save JSON', 'negative-position.json');
    await reset();
    await load(negativeFile);
    assert.deepEqual(positions(await stateNodes()), positions(negative), 'Negative parent-relative positions survive JSON');

    await reset();
    await frame(app.id);
    await dragBeyond(app.id, 'right', 'persist-outside-right');
    await dragBeyond(app.id, 'bottom', 'persist-outside-bottom');
    const arranged = await graph();
    const file = await save('Save JSON', 'arranged.json');
    assert.deepEqual(positions(JSON.parse(fs.readFileSync(file, 'utf8')).nodes), positions(arranged.nodes));
    await reset();
    await load(file);
    assert.deepEqual(positions(await stateNodes()), positions(arranged.nodes), 'Save/Load preserves outside positions');
    const owner = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    await page.locator('[data-nds-tab-add="1"]').click();
    await page.locator(`[data-nds-tab="${owner}"]`).click();
    await settle();
    assert.deepEqual(positions(await stateNodes()), positions(arranged.nodes), 'Switching tabs preserves outside positions');
    const svg = await save('SVG', 'outside.svg');
    const png = await save('PNG', 'outside.png');
    assert(fs.readFileSync(svg, 'utf8').includes('diagram-demo-app'));
    assert.equal(fs.readFileSync(png).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    await page.waitForTimeout(1200);
    await page.reload();
    await node(app.id).waitFor();
    assert.deepEqual(positions(await stateNodes()), positions(arranged.nodes), 'Browser auto-save restores outside positions');
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-result.json`), JSON.stringify({
      entry: path.resolve(entry), importedNodes: imported.length, cases: results.length,
      groupingPreserved: true, connectionsPreserved: true, history: true, saveLoad: true,
      tabRestore: true, browserRestore: true, exports: ['SVG', 'PNG'], errors, network,
    }, null, 2));
    console.log(`PASS ${path.basename(entry)}: real ARM import, ${results.length} boundary drags, hierarchy, connections, undo/redo, JSON, tabs, browser restore and exports`);
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
