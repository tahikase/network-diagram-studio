const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const evidence = process.env.NDS_SHAPE_CONNECTOR_EVIDENCE;
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const shapes = [
  { id: 'source', kind: 'rect', x: 80, y: 100, w: 200, h: 145, color: '#0f172a', width: 2, fillOpacity: 0.15 },
  { id: 'database', kind: 'rect', geom: 'database', x: 590, y: 100, w: 165, h: 160, color: '#0f172a', width: 2, fillOpacity: 0 },
  { id: 'target', kind: 'rect', x: 570, y: 390, w: 250.4, h: 150.4, color: '#0f172a', width: 2, fillOpacity: 0.15 },
];
const edges = [
  { id: 'into-database', source: 'source', target: 'database', kind: 'link', sourceHandle: 's-r', targetHandle: 't-l' },
  { id: 'into-target', source: 'database', target: 'target', kind: 'link', sourceHandle: 's-b', targetHandle: 't-t' },
];
const fixture = (items = shapes, links = edges, nodes = []) => ({
  version: 1, meta: { title: 'Connected shape example', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes, edges: links, annotations: [], shapes: items, strokes: [], notes: '',
});
const bounds = shape => shape.kind === 'ellipse'
  ? { x: shape.cx - shape.rx, y: shape.cy - shape.ry, w: shape.rx * 2, h: shape.ry * 2 } : shape;

async function verify(entry) {
  const preview = /^https?:/.test(entry), originalHash = preview ? null : digest(entry);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, locale: 'en-US' });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const errors = [], network = [], results = [], downloads = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-shape-connector-'));
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  let stage = 'startup', loadCount = 0;
  const settle = () => page.waitForTimeout(250);
  const readShapes = () => page.evaluate(() => structuredClone(window.__nds_tabsStore.getState().activeTab().shapes));
  const graph = () => page.evaluate(() => structuredClone(window.__nds_diagramStore.getState().diagram));
  const shape = async id => (await readShapes()).find(item => item.id === id);
  const screen = (x, y) => page.evaluate(({ x, y }) => {
    const point = new DOMPoint(x, y).matrixTransform(document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM());
    return { x: point.x, y: point.y };
  }, { x, y });
  const hit = p => page.evaluate(({ x, y }) => {
    const top = document.elementFromPoint(x, y);
    return { shape: top?.closest('[data-nds-shape]')?.dataset.ndsShape ?? null,
      node: top?.closest('.react-flow__node')?.dataset.id ?? null, tag: top?.tagName };
  }, p);
  async function load(document) {
    const title = `Connected shape example ${++loadCount}`;
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await choosing).setFiles({ name: 'connected-shapes.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...document, meta: { ...document.meta, title } })) });
    await page.waitForFunction(value => window.__nds_diagramStore.getState().diagram.meta.title === value, title);
    await settle();
  }
  async function center(id) {
    const box = bounds(await shape(id));
    return screen(box.x + box.w / 2, box.y + box.h / 2);
  }
  async function select(id, label, point, expectedHit = id) {
    const p = point || await center(id);
    const actual = await hit(p);
    assert.equal(actual.shape, expectedHit, `${label}: visible shape body must receive the pointer (${JSON.stringify(actual)})`);
    await page.mouse.click(p.x, p.y); await settle();
    assert.deepEqual(await page.evaluate(() => window.__nds_annotationStore.getState().selectedShapeIds), [id],
      `${label}: native body click selects the shape`);
    results.push({ label, id, hit: actual });
    return p;
  }
  async function drag(start, end) {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 16 }); await page.mouse.up(); await settle();
  }
  async function edgePoint(id) {
    return page.locator(`[data-nds-edge-hit="${id}"]`).evaluate(el => {
      const p = el.getPointAtLength(el.getTotalLength() / 2);
      const point = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
      return { x: point.x, y: point.y };
    });
  }
  async function editEdge(id, attribute, value) {
    const p = await edgePoint(id); await page.mouse.click(p.x, p.y);
    await page.locator(`[data-nds-connector-${attribute}="${value}"]`).click(); await settle();
    const edge = (await graph()).edges.find(item => item.id === id);
    const defaultValue = attribute === 'route' ? 'bent' : 'end';
    assert.equal(edge.data?.[`nds.connector.${attribute}`], value === defaultValue ? undefined : value,
      `Native connector ${attribute} uses its canonical stored value`);
    assert.equal(await page.locator(`[data-nds-connector-${attribute}="${value}"]`).getAttribute('aria-pressed'), 'true');
    for (const key of ['source', 'target', 'sourceHandle', 'targetHandle']) {
      assert.equal(edge[key], edges[1][key], `Changing ${attribute} preserves ${key}`);
    }
    const empty = await screen(350, 330); await page.mouse.click(empty.x, empty.y); await settle();
    assert.deepEqual(await page.evaluate(() => window.__nds_diagramStore.getState().selectedEdgeIds), [],
      'Close the edge panel before exercising the shape body');
  }
  async function shortcut(keys) {
    await page.locator('[data-nds-tool="move"]').focus(); await page.keyboard.press(keys); await settle();
  }
  async function undoRedo(before, after) {
    await shortcut('Control+z'); assert.deepEqual(await readShapes(), before, 'Native edit is one undo step');
    await shortcut('Control+y'); assert.deepEqual(await readShapes(), after, 'Redo restores shape geometry and text');
  }
  async function save() {
    const destination = path.join(temp, 'connected-shapes.json'); downloads.push(destination);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
    await (await pending).saveAs(destination);
    return JSON.parse(fs.readFileSync(destination, 'utf8'));
  }
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => {
    if (preview && route.request().url().startsWith(new URL(entry).origin + '/')) return route.continue();
    network.push(route.request().url()); return route.abort();
  });
  try {
    await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
    await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
    await page.goto(preview ? entry : pathToFileURL(path.resolve(entry)).href);
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_diagramStore);
    await load(fixture(shapes, edges.slice(0, 1)));
    await select('target', 'Unconnected fractional box');

    stage = 'fractional box after changing its arrow';
    await load(fixture());
    await editEdge('into-target', 'route', 'straight');
    await select('target', 'Connected fractional box after changing to straight');
    assert.equal(await page.locator('[data-nds-shape="target"] path[fill-rule="evenodd"]').count(), 0,
      'Routing helpers never cut a hole in their own shape');
    const adapter = page.locator('.react-flow__node-shapeAnchor[data-id="target"]');
    assert.equal(await adapter.count(), 1, 'The invisible routing adapter is retained');
    assert.equal(await adapter.evaluate(el => el.offsetWidth), 250, 'The regression exercises real fractional measurement rounding');
    for (const [attribute, value] of [['head', 'none'], ['route', 'bent'], ['head', 'end']]) {
      await editEdge('into-target', attribute, value);
      await select('target', `Connected box after ${attribute}=${value}`);
    }

    stage = 'native movement, resize, text and undo';
    const beforeMove = await readShapes(), start = await center('target');
    const oldRoute = await page.locator('[data-nds-edge-hit="into-target"]').getAttribute('d');
    await drag(start, { x: start.x - 60, y: start.y + 30 });
    const moved = await shape('target');
    assert(Math.abs(moved.x - (shapes[2].x - 60)) < 0.1 && Math.abs(moved.y - (shapes[2].y + 30)) < 0.1,
      'The connected box follows a real body drag');
    assert.notEqual(await page.locator('[data-nds-edge-hit="into-target"]').getAttribute('d'), oldRoute, 'The attached arrow follows');
    await undoRedo(beforeMove, await readShapes());
    const beforeResize = await readShapes();
    const handle = await page.locator('[data-nds-shape-handle="se"]').boundingBox();
    assert(handle, 'Selected connected box has a native resize handle');
    await drag({ x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
      { x: handle.x + handle.width / 2 + 35, y: handle.y + handle.height / 2 + 25 });
    const resized = await shape('target');
    assert(resized.w > moved.w + 20 && resized.h > moved.h + 15);
    await undoRedo(beforeResize, await readShapes());
    const beforeText = await readShapes(), textPoint = await center('target');
    await page.mouse.dblclick(textPoint.x, textPoint.y, { delay: 65 });
    const editor = page.locator('[data-nds-shape-text-input]');
    await editor.waitFor(); await editor.fill('Editable box'); await editor.press('End'); await editor.press('Enter');
    await page.keyboard.insertText('Still connected'); await editor.press('Control+Enter'); await settle();
    assert.equal((await shape('target')).text, 'Editable box\nStill connected');
    await undoRedo(beforeText, await readShapes());
    const saved = await save();
    assert.deepEqual(saved.shapes, await readShapes(), 'Save JSON preserves editable connected shapes');
    assert.deepEqual(saved.edges, JSON.parse(JSON.stringify((await graph()).edges)),
      'Save JSON preserves edited connectors and handles, omitting undefined default metadata');
    await load(saved); await select('target', 'Reloaded JSON body');
    await page.waitForTimeout(1600); await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore?.getState().activeTab().shapes.some(item => item.id === 'target'));
    await settle(); await select('target', 'Browser auto-save body');
    assert.equal((await shape('target')).text, 'Editable box\nStill connected');

    stage = 'new connection from native shape dots';
    await load(fixture(shapes, edges.slice(0, 1)));
    await select('target', 'Before connecting with shape dots');
    const db = await center('database'); await page.mouse.move(db.x, db.y);
    const dot = page.locator('[data-nds-shape-connect-anchor-shape="database"][data-nds-shape-connect-anchor="s"]');
    const dotBounds = await dot.boundingBox(); assert(dotBounds, 'Native Database connection dot is visible');
    const endpoint = await screen(shapes[2].x + shapes[2].w / 2, shapes[2].y);
    await drag({ x: dotBounds.x + dotBounds.width / 2, y: dotBounds.y + dotBounds.height / 2 }, endpoint);
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.edges.length === 2);
    await page.keyboard.press('Escape');
    const created = (await graph()).edges.find(item => item.target === 'target');
    assert.equal(created.source, 'database');
    assert.equal(created.sourceHandle, 's-b'); assert.equal(created.targetHandle, 't-t', 'Exact shape dots stay pinned');
    await editEdge(created.id, 'route', 'straight'); await select('target', 'Newly connected box after arrow edit');

    stage = 'shape variants, rounded dimensions, zoom and themes';
    const variants = [
      ['filled-rect', { ...shapes[2] }],
      ['outline-rect', { ...shapes[2], fillOpacity: 0 }],
      ['database', { ...shapes[2], geom: 'database', fillOpacity: 0 }],
      ['ellipse', { id: 'target', kind: 'ellipse', cx: 695.2, cy: 465.2, rx: 125.2, ry: 75.2, color: '#0f172a', width: 2, fillOpacity: 0 }],
      ['rotated-rect', { ...shapes[2], rotation: 25 }],
    ];
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.__nds_themeStore.getState().setPref(value), theme);
      for (const [name, variant] of variants) {
        await load(fixture([...shapes.slice(0, 2), variant]));
        await page.locator('.react-flow__controls-fitview').click(); await settle();
        await page.locator('.react-flow__controls-zoomout').click(); await settle();
        await editEdge('into-target', 'route', 'straight');
        for (let zoom = 0; zoom < 3; zoom++) {
          if (zoom) { await page.locator('.react-flow__controls-zoomout').click(); await settle(); }
          await select('target', `${theme}/${name}/zoom-${zoom}`);
        }
      }
    }
    for (const [w, h] of [[250, 150], [250.4, 150.4], [250.6, 150.6], [250.8, 150.1]]) {
      await load(fixture([...shapes.slice(0, 2), { ...shapes[2], w, h }]));
      await select('target', `Connected box ${w}x${h}`);
    }

    stage = 'other shape adapters are not resource holes';
    const outer = { id: 'outer', kind: 'rect', x: 520, y: 350, w: 360.4, h: 260.4, fillOpacity: 0.1, color: '#0f172a', width: 2 };
    await load(fixture([...shapes, outer]));
    assert.equal(await page.locator('[data-nds-shape="outer"] path[fill-rule="evenodd"]').count(), 0,
      'Another connected shape cannot be mistaken for a resource hole');
    await select('target', 'Nested connected shape keeps native targeting', undefined, 'outer');
    await select('outer', 'Outer shape remains selectable', await screen(550, 575));

    stage = 'real resources still receive clicks through shapes';
    const card = { id: 'real-card', type: 'storage', position: { x: 610, y: 415 }, size: { w: 145, h: 150 },
      data: { name: 'Storage example', state: 'ok', fields: {} } };
    // Keep the caption inside the frame, away from its native connection dots.
    await load(fixture([...shapes.slice(0, 2), { ...shapes[2], w: 350.4, h: 250.4 }], edges, [card]));
    const cardNode = page.locator('.react-flow__node[data-id="real-card"]');
    const title = await cardNode.locator('[title$="double-click to rename"]').first().boundingBox();
    assert(title, 'Underlying real resource caption is visible');
    const cardPoint = { x: title.x + title.width / 2, y: title.y + title.height / 2 };
    assert.equal((await hit(cardPoint)).node, 'real-card', 'Only genuine resources get a click-through hole');
    await page.mouse.click(cardPoint.x, cardPoint.y); await settle();
    assert.deepEqual(await page.evaluate(() => window.__nds_diagramStore.getState().selectedNodeIds), ['real-card']);
    await select('target', 'Box outside its real-resource hole', await screen(790, 515));

    stage = 'legacy shape-bound arrows keep shape geometry';
    const rotated = { id: 'target', kind: 'ellipse', cx: 695.2, cy: 465.2, rx: 125.2, ry: 75.2,
      rotation: 30, fillOpacity: 0.1, color: '#0f172a', width: 2 };
    const annotation = { id: 'legacy-arrow', kind: 'arrow', from: { x: 500, y: 600 }, to: { x: 500, y: 700 },
      fromRef: { kind: 'shape', id: 'target', anchor: { x: 1, y: 0.5 } }, color: '#0078d4', width: 2, head: 'end', shape: 'straight' };
    await load(fixture([...shapes.slice(0, 2), rotated, annotation]));
    const bound = await shape('legacy-arrow'), radians = Math.PI / 6;
    assert(Math.abs(bound.from.x - (rotated.cx + rotated.rx * Math.cos(radians))) < 0.01);
    assert(Math.abs(bound.from.y - (rotated.cy + rotated.rx * Math.sin(radians))) < 0.01,
      'Connected ellipse binding keeps its native rotated shape geometry, not an unrotated node proxy');
    const beforeBoundMove = await readShapes(), boundStart = await center('target');
    await drag(boundStart, await screen(rotated.cx - 40, rotated.cy));
    const boundAfter = await shape('legacy-arrow');
    assert(Math.abs(boundAfter.from.x - (bound.from.x - 40)) < 0.1, 'Legacy shape binding follows native movement');
    assert.deepEqual(boundAfter.fromRef, annotation.fromRef); await undoRedo(beforeBoundMove, await readShapes());

    stage = 'free annotation arrow endpoints stay free';
    await load(fixture([...shapes, { ...annotation, id: 'free-arrow', fromRef: undefined,
      from: { x: 350, y: 540 }, to: { x: 350, y: 350 } }]));
    const arrowPoint = await screen(350, 445); await page.mouse.click(arrowPoint.x, arrowPoint.y);
    const freeEnd = await page.locator('[data-nds-shape-handle="end"]').boundingBox(); assert(freeEnd);
    await drag({ x: freeEnd.x + freeEnd.width / 2, y: freeEnd.y + freeEnd.height / 2 }, await center('target'));
    assert.equal((await shape('free-arrow')).toRef, undefined, 'Annotation arrow edits do not turn into connections');
    await select('target', 'Box after editing a free arrow endpoint', await screen(770, 495));
    assert.deepEqual(errors, [], 'No browser errors'); assert.deepEqual(network, [], 'The editor remains offline');
    if (evidence) {
      await page.screenshot({ path: path.join(evidence, 'final.png') });
      fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ entry, results, errors, network }, null, 2));
    }
    if (!preview) assert.equal(digest(entry), originalHash, 'The tested package is unchanged');
    console.log(`PASS connected-shape selection: ${results.length} native body clicks; arrow edits, creation, drag, resize, text, undo, persistence, zoom, resources and legacy bindings (${entry})`);
  } catch (error) {
    if (evidence) {
      await page.screenshot({ path: path.join(evidence, 'failure.png') });
      fs.writeFileSync(path.join(evidence, 'failure.json'), JSON.stringify({ stage, message: error.message, results, errors, network }, null, 2));
    }
    error.message = `${stage}: ${error.message}`; throw error;
  } finally {
    await browser.close();
    for (const file of new Set(downloads)) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
}

if (require.main === module) (async () => {
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
  for (const entry of entries) await verify(entry);
})().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { shapes, edges, fixture };
