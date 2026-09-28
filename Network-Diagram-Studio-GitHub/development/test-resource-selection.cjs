const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const entries = process.argv.slice(2);
if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
const evidence = process.env.NDS_RESOURCE_SELECTION_EVIDENCE;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const input = process.env.NDS_SELECTION_FIXTURE;
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const resource = (id, type, name, x, y, w, h, extra = {}) => ({
  id, type, position: { x, y }, size: { w, h }, data: { name, state: 'ok', fields: {}, ...extra },
});
const fixture = input ? JSON.parse(fs.readFileSync(input, 'utf8')) : {
  version: 1,
  meta: { title: 'Overlapping resources', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes: [
    resource('logic', 'custom', 'Logic Apps', -83, 23, 140, 129, { iconId: 'integration--logic-apps', typeLabel: 'Logic Apps' }),
    resource('storage', 'storage', 'st-example', 309, 14, 140, 129),
    resource('vnet', 'group-vnet', 'vnet', -236, -113, 909, 572),
    resource('subnet-one', 'group-subnet', 'subnet-1', -142, -28, 317, 295),
    resource('subnet-two', 'group-subnet', 'subnet-2', 225, -31, 378, 312),
    resource('endpoint', 'private-endpoint', 'pe-example', 262, -9, 323, 259),
  ],
  edges: [], annotations: [], notes: '',
};

async function verify(entry, index) {
  const entryHash = digest(entry), inputHash = input && digest(input);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, locale: 'en-US' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [], network = [], results = [], files = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-resource-selection-'));
  const node = id => page.locator(`.react-flow__node[data-id="${id}"]`);
  const graph = () => page.evaluate(() => structuredClone(window.__nds_diagramStore.getState().diagram));
  const settle = () => page.waitForTimeout(100);
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  async function settleSelection() {
    await page.evaluate(() => new Promise((resolve, reject) => {
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) { reject(new Error('The canvas viewport is missing')); return; }
      const start = performance.now();
      let previous = '', unchangedSince = start;
      const frame = () => {
        const now = performance.now();
        if (viewport.style.transform !== previous) {
          previous = viewport.style.transform;
          unchangedSince = now;
        }
        // Selection schedules a 160 ms keep-visible pan after two frames.
        if (now - start >= 220 && now - unchangedSince >= 80) { resolve(); return; }
        if (now - start > 4000) { reject(new Error('The selection viewport did not settle')); return; }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }));
  }
  async function select(id) {
    await page.evaluate(value => window.__nds_diagramStore.getState().selectNode(value), id);
    await settleSelection();
  }
  async function fit() {
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForTimeout(250);
    for (let index = 0; index < 2; index++) {
      await page.locator('.react-flow__controls-zoomout').click();
      await page.waitForTimeout(200);
    }
  }
  async function reset(diagram) {
    await page.evaluate(value => window.__nds_diagramStore.getState().loadDiagram(value, { relayout: false }), diagram);
    await settle();
  }
  async function point(id, part) {
    const selector = part === 'header' ? '.nds-group-box svg' :
      part === 'icon' ? '.rounded-full svg' : '[title$="double-click to rename"]';
    const bounds = await node(id).locator(selector).first().boundingBox();
    assert(bounds, `${id}/${part}: visible artwork must exist`);
    // The endpoint's icon really overlaps the storage caption at its centre.
    // Aim at its visibly separate upper glyph, not at two painted labels.
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * (part === 'icon' ? .2 : .5) };
  }
  async function click(id, part, label, modifiers = []) {
    const p = await point(id, part);
    const pane = await page.locator('.react-flow').boundingBox();
    assert(p.x > pane.x && p.x < pane.x + pane.width && p.y > pane.y && p.y < pane.y + pane.height,
      `${label}/${part}: the test must click inside the visible canvas`);
    const hit = await page.evaluate(({ x, y }) => {
      const top = document.elementFromPoint(x, y);
      return { node: top?.closest('.react-flow__node')?.getAttribute('data-id'),
        element: top?.getAttribute('class') };
    }, p);
    assert.equal(hit.node, id, `${label}/${part}: transparent space must not intercept visible resource artwork (${JSON.stringify(hit)})`);
    for (const key of modifiers) await page.keyboard.down(key);
    try {
      await page.mouse.click(p.x, p.y);
    } finally {
      for (const key of [...modifiers].reverse()) await page.keyboard.up(key);
    }
    await settleSelection();
    const selected = await page.evaluate(() => window.__nds_diagramStore.getState().selectedNodeIds);
    if (!modifiers.length) assert.deepEqual(selected, [id], `${label}/${part}: native click selects the intended resource`);
    results.push({ label, part, id, selected, hit });
    return p;
  }
  async function shortcut(keys) {
    await page.locator('[data-nds-fullscreen]').focus();
    await page.keyboard.press(keys);
    await settle();
  }
  async function save(label, filename) {
    const destination = path.join(temp, filename);
    files.push(destination);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    await (await pending).saveAs(destination);
    return destination;
  }
  async function load(file) {
    const pending = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await pending).setFiles(file);
    await settle();
  }
  async function drag(p, dx, dy) {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 3, p.y + 3);
    await page.waitForFunction(() => window.__nds_diagramStore.getState().gestureBase !== null);
    await page.mouse.move(p.x + dx, p.y + dy, { steps: 20 });
    await page.mouse.up();
    await settle();
  }
  try {
    await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
    await page.goto(pathToFileURL(path.resolve(entry)).href);
    await load(input || { name: 'overlapping-resources.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixture)) });
    await fit();
    const original = await graph();
    const storage = original.nodes.find(n => n.type === 'storage').id;
    const endpoint = original.nodes.find(n => n.type === 'private-endpoint').id;
    const logic = original.nodes.find(n => n.type === 'custom').id;
    const leaves = [storage, endpoint, logic];
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const order of ['original', 'reversed', 'groups-first', 'groups-last']) {
        const diagram = structuredClone(original);
        if (order === 'reversed') diagram.nodes.reverse();
        if (order === 'groups-first' || order === 'groups-last') {
          const sign = order === 'groups-first' ? -1 : 1;
          diagram.nodes.sort((a, b) => sign * (Number(a.type.startsWith('group-')) - Number(b.type.startsWith('group-'))));
        }
        await reset(diagram);
        for (const prior of [null, storage, endpoint]) {
          for (const id of leaves) {
            for (const part of ['icon', 'name']) {
              await select(prior);
              await click(id, part, `${theme}/${order}/${prior || 'none'}/${id}`);
            }
          }
        }
        assert.deepEqual((await graph()).nodes, diagram.nodes, 'Selection never changes geometry, metadata or saved ordering');
      }
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    await reset(original);
    for (const group of original.nodes.filter(n => n.type.startsWith('group-'))) {
      await click(group.id, 'header', 'visible group header');
      await click(storage, 'icon', 'resource after group selection');
    }
    await select(endpoint);
    await click(storage, 'icon', 'native drag setup');
    const beforeDrag = await graph();
    await drag(await point(storage, 'icon'), -55, -35);
    const dragged = await graph();
    assert(Math.abs(dragged.nodes.find(n => n.id === storage).position.x - beforeDrag.nodes.find(n => n.id === storage).position.x) > 20,
      'The resource actually moves through the overlapping transparent card');
    assert.deepEqual(dragged.nodes.filter(n => n.id !== storage), beforeDrag.nodes.filter(n => n.id !== storage));
    await shortcut('Control+z');
    assert.deepEqual((await graph()).nodes, beforeDrag.nodes, 'One undo restores the native drag');
    await shortcut('Control+y');
    assert.deepEqual((await graph()).nodes, dragged.nodes);
    await reset(original);
    await select(endpoint);
    const namePoint = await point(storage, 'name');
    await page.mouse.dblclick(namePoint.x, namePoint.y, { delay: 80 });
    const editor = node(storage).locator('input:not([data-nds-caption-inline])');
    await editor.fill('Storage edited');
    await editor.press('Enter');
    await settle();
    assert.equal((await graph()).nodes.find(n => n.id === storage).data.name, 'Storage edited');
    await shortcut('Control+z');
    assert.equal((await graph()).nodes.find(n => n.id === storage).data.name, original.nodes.find(n => n.id === storage).data.name);
    await reset(original);
    await click(storage, 'icon', 'resize setup');
    const grip = await node(storage).locator('.react-flow__resize-control.bottom.left.handle').boundingBox();
    assert(grip);
    const oldSize = (await graph()).nodes.find(n => n.id === storage).size;
    await drag({ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }, -28, 26);
    const newSize = (await graph()).nodes.find(n => n.id === storage).size;
    assert(newSize.w > oldSize.w + 10 && newSize.h > oldSize.h + 10, 'Resize grips remain native targets inside the overlap');
    await reset(original);
    await click(storage, 'icon', 'connection setup');
    const source = await node(storage).locator('[data-handleid="s-l"]').boundingBox();
    const target = await node(logic).locator('[data-handleid="t-r"]').boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 30 });
    await page.mouse.up();
    await settle();
    const connected = await graph();
    assert.equal(connected.edges.length, original.edges.length + 1, 'A connection dot covered by transparent padding still starts a real connector');
    assert(connected.edges.some(e => e.source === storage && e.target === logic));
    await reset(original);
    await click(storage, 'name', 'multi-select first');
    await click(endpoint, 'name', 'multi-select second', ['Shift']);
    assert.deepEqual(new Set(await page.evaluate(() => window.__nds_diagramStore.getState().selectedNodeIds)), new Set([storage, endpoint]));
    await shortcut('Delete');
    assert.equal((await graph()).nodes.length, original.nodes.length - 2);
    await shortcut('Control+z');
    assert.deepEqual((await graph()).nodes, original.nodes);

    const triple = structuredClone(original);
    triple.nodes.push(resource('third-overlap', 'vm', 'Third overlapping card', 200, -100, 900, 400));
    await reset(triple);
    await fit();
    for (const prior of [endpoint, 'third-overlap']) {
      await select(prior);
      await click(storage, 'icon', 'three overlapping cards');
      await click(storage, 'name', 'three overlapping cards');
    }
    const nested = structuredClone(original);
    const vnet = nested.nodes.find(n => n.type === 'group-vnet');
    const subnetOne = nested.nodes.find(n => n.data.name === 'subnet-1');
    const subnetTwo = nested.nodes.find(n => n.data.name === 'subnet-2');
    const absolute = new Map(nested.nodes.map(n => [n.id, { ...n.position }]));
    for (const [id, parent] of [[subnetOne.id, vnet.id], [subnetTwo.id, vnet.id],
      [logic, subnetOne.id], [storage, subnetTwo.id], [endpoint, subnetTwo.id]]) {
      const child = nested.nodes.find(n => n.id === id);
      child.parent = parent;
      child.position = { x: absolute.get(id).x - absolute.get(parent).x, y: absolute.get(id).y - absolute.get(parent).y };
    }
    nested.nodes.reverse();
    await reset(nested);
    await fit();
    await select(endpoint);
    await click(storage, 'icon', 'nested parents and reversed order');
    await click(storage, 'name', 'nested parents and reversed order');
    assert.deepEqual((await graph()).nodes, nested.nodes);

    await reset(original);
    await fit();
    const json = await save('Save JSON', 'selection.json');
    const saved = JSON.parse(fs.readFileSync(json, 'utf8'));
    assert.deepEqual(saved.nodes, original.nodes, 'Hit regions are render-only, never saved in JSON');
    assert(!JSON.stringify(saved).includes('hitExclusions'));
    await reset({ ...original, nodes: [], edges: [] });
    await load(json);
    const tab = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    await page.locator('[data-nds-tab-add="1"]').click();
    await page.locator(`[data-nds-tab="${tab}"]`).click();
    await settle();
    await fit();
    await select(endpoint);
    await click(storage, 'icon', 'JSON and tab restoration');
    const png = await save('PNG', 'selection.png'), svg = await save('SVG', 'selection.svg');
    assert.equal(fs.readFileSync(png).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert(fs.readFileSync(svg, 'utf8').includes(original.nodes.find(n => n.id === storage).data.name));
    await page.waitForTimeout(1200);
    await page.reload();
    await node(storage).waitFor();
    await fit();
    await select(endpoint);
    await click(storage, 'icon', 'browser restoration');
    await click(storage, 'name', 'browser restoration');
    assert.deepEqual((await graph()).nodes, original.nodes);
    assert.deepEqual(errors, [], 'No browser runtime errors');
    assert.deepEqual(network, [], 'No network traffic');
    assert.equal(digest(entry), entryHash, 'The tested bundle is read-only');
    if (input) assert.equal(digest(input), inputHash, 'The supplied diagram file was not modified');
    if (evidence) await page.screenshot({ path: path.join(evidence, `${index}-selection.png`) });
    console.log(`PASS ${entry}: ${results.length} native selections; overlap orders/themes, native drag/undo/redo, editing, resizing, connections, multi-select, nested parents, triple overlap, JSON/tabs/reload and PNG/SVG`);
  } catch (error) {
    if (evidence) await page.screenshot({ path: path.join(evidence, `${index}-failure.png`) });
    throw error;
  } finally {
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-selections.json`), JSON.stringify(results, null, 2));
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
    await context.close();
    await browser.close();
  }
}

(async () => {
  for (const [index, entry] of entries.entries()) await verify(entry, index);
})().catch(error => { console.error(error); process.exitCode = 1; });
