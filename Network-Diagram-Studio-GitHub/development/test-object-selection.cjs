const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const evidence = process.env.NDS_OBJECT_SELECTION_EVIDENCE;
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const box = (id, x, y, w, h, extra = {}) => ({
  id, kind: 'rect', x, y, w, h, color: '#0f172a', width: 2, fillOpacity: 0, ...extra,
});
const actor = box('actor', 260, 160, 100, 150, { geom: 'actor' });
const frame = box('frame', 160, 90, 370, 340, { fillOpacity: 0.1 });
const node = (id, x, y, w = 160, h = 150, type = 'storage') => ({
  id, type, position: { x, y }, size: { w, h },
  data: { name: id, state: 'ok', fields: {} },
});
const fixture = (shapes = [], nodes = [], edges = []) => ({
  version: 1, meta: { title: 'Object selection example', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes, edges, annotations: [], shapes, strokes: [], notes: '',
});

async function verify(entry) {
  const preview = /^https?:/.test(entry), originalHash = preview ? null : digest(entry);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, locale: 'en-US' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [], network = [], results = [];
  let stage = 'startup', loadCount = 0;
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const settle = () => page.waitForTimeout(220);
  const shapes = () => page.evaluate(() => structuredClone(window.__nds_tabsStore.getState().activeTab().shapes));
  const graph = () => page.evaluate(() => structuredClone(window.__nds_diagramStore.getState().diagram));
  const selected = () => page.evaluate(() => ({
    shapes: window.__nds_annotationStore.getState().selectedShapeIds,
    nodes: window.__nds_diagramStore.getState().selectedNodeIds,
    edges: window.__nds_diagramStore.getState().selectedEdgeIds,
  }));
  const screen = (x, y) => page.evaluate(({ x, y }) => {
    const p = new DOMPoint(x, y).matrixTransform(document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM());
    return { x: p.x, y: p.y };
  }, { x, y });
  async function load(document) {
    const title = `Object selection example ${++loadCount}`;
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await choosing).setFiles({ name: 'object-selection.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...document, meta: { ...document.meta, title } })) });
    await page.waitForFunction(value => window.__nds_diagramStore.getState().diagram.meta.title === value, title);
    await settle();
  }
  async function shapePoint(id, u = .5, v = .5) {
    const shape = (await shapes()).find(s => s.id === id);
    if (shape.kind === 'arrow') {
      return page.locator(`[data-nds-shape="${id}"] path[stroke="transparent"]`).first().evaluate(el => {
        const local = el.getPointAtLength(el.getTotalLength() * .4);
        const p = new DOMPoint(local.x, local.y).matrixTransform(el.getScreenCTM());
        return { x: p.x, y: p.y };
      });
    }
    const b = shape.kind === 'ellipse' ? { x: shape.cx - shape.rx, y: shape.cy - shape.ry, w: 2 * shape.rx, h: 2 * shape.ry } : shape;
    const rad = (shape.rotation || 0) * Math.PI / 180;
    const dx = (u - .5) * b.w, dy = (v - .5) * b.h;
    return screen(b.x + b.w / 2 + dx * Math.cos(rad) - dy * Math.sin(rad),
      b.y + b.h / 2 + dx * Math.sin(rad) + dy * Math.cos(rad));
  }
  async function drag(start, dx = 35, dy = 22) {
    await page.mouse.move(start.x, start.y); await page.waitForTimeout(40); await page.mouse.down();
    await page.mouse.move(start.x + 3, start.y + 3); await page.waitForTimeout(40);
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 14 }); await page.mouse.up(); await settle();
  }
  async function shortcut(keys) {
    await page.locator('[data-nds-tool="move"]').focus();
    await page.keyboard.press(keys); await settle();
  }
  async function moveShape(id, label, u = .5, v = .5) {
    const before = await shapes(), start = await shapePoint(id, u, v);
    const pane = await page.locator('.react-flow').boundingBox();
    assert(start.x > pane.x && start.x < pane.x + pane.width - 40 && start.y > pane.y && start.y < pane.y + pane.height - 30,
      `${label}: test pointer is inside the canvas`);
    await drag(start);
    assert.deepEqual((await selected()).shapes, [id], `${label}: a body drag selects the intended shape`);
    const after = await shapes();
    const a = before.find(s => s.id === id), b = after.find(s => s.id === id);
    const delta = b.kind === 'ellipse' ? [b.cx - a.cx, b.cy - a.cy] :
      b.kind === 'arrow' ? [b.from.x - a.from.x, b.from.y - a.from.y] : [b.x - a.x, b.y - a.y];
    const zoom = await page.evaluate(() => document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM().a);
    assert(Math.abs(delta[0] * zoom - 35) < 1 && Math.abs(delta[1] * zoom - 22) < 1,
      `${label}: the shape follows the pointer, not a connection gesture (${delta})`);
    assert.deepEqual(after.filter(s => s.id !== id), before.filter(s => s.id !== id), `${label}: other shapes stay in place`);
    if (evidence && label === 'Actor body') await page.screenshot({ path: path.join(evidence, 'actor-moved.png') });
    await shortcut('Control+z');
    assert.deepEqual(await shapes(), before, `${label}: one undo restores the drag`);
    await shortcut('Control+y');
    assert.deepEqual(await shapes(), after, `${label}: redo restores the drag`);
    results.push(label);
  }
  async function openPicker(p, expectedIds) {
    await page.mouse.click(p.x, p.y, { button: 'right' });
    const menu = page.locator('[data-nds-object-picker]');
    await menu.waitFor();
    const ids = await menu.locator('[data-nds-pick-id]').evaluateAll(items => items.map(item => item.dataset.ndsPickId));
    for (const id of expectedIds) assert(ids.includes(id), `The object picker includes ${id}, not just the top painted object: ${ids}`);
    return menu;
  }
  async function pick(p, id, kind, expectedIds) {
    const menu = await openPicker(p, expectedIds);
    if (evidence && id === 'lower') await page.screenshot({ path: path.join(evidence, 'overlap-picker.png') });
    await menu.locator(`[data-nds-pick-id="${id}"][data-nds-pick-kind="${kind}"]`).click();
    await settle();
    assert.deepEqual((await selected())[kind === 'shape' ? 'shapes' : kind === 'node' ? 'nodes' : 'edges'], [id]);
    assert.equal(await page.locator('[data-nds-object-picker]').count(), 0);
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

    stage = 'actor body, limbs and empty interior';
    for (const [label, u, v] of [['body', .5, .5], ['arm', .35, .38], ['leg', .34, .82], ['interior', .35, .6]]) {
      await load(fixture([actor]));
      await moveShape('actor', `Actor ${label}`, u, v);
    }

    stage = 'Move / Select owns the Actor head and feet at every size';
    for (const [w, h] of [[80, 64], [10, 10], [240, 180]]) {
      for (const rotation of [0, 35]) {
        for (const [label, u, v] of [['head', .5, .12], ['left foot', .2, .9], ['right foot', .8, .9]]) {
          for (const preselected of [false, true]) {
            await load(fixture([box('actor-body', 300, 240, w, h, { geom: 'actor', rotation })]));
            if (preselected) {
              await page.evaluate(() => window.__nds_annotationStore.getState().setSelectedShapes(['actor-body']));
              await settle();
            }
            await moveShape('actor-body', `Actor ${w}x${h} rotation=${rotation} ${label} selected=${preselected}`, u, v);
          }
        }
      }
    }

    stage = 'entire Shapes palette';
    const shapesToggle = page.getByRole('button', { name: /^Shapes(?:\s|$)/ }).first();
    if (await page.locator('[data-nds-shape-tile]').count() === 0) await shapesToggle.click();
    const variants = await page.locator('[data-nds-shape-tile]').evaluateAll(items => items.map(item => item.dataset.ndsShapeVariant));
    assert.equal(variants.length, 24, 'Exercise every current Shapes tile');
    for (const variant of variants) {
      await load(fixture());
      await page.locator(`[data-nds-shape-tile][data-nds-shape-variant="${variant}"]`).click();
      await settle();
      const editor = page.locator('[data-nds-shape-text-input]');
      if (await editor.count()) await editor.press('Control+Enter');
      const created = (await shapes())[0];
      assert(created, `${variant}: native palette placement creates a shape`);
      await page.keyboard.press('Escape'); await settle();
      await moveShape(created.id, `Palette ${variant}`);
    }

    stage = 'nested shapes in either paint order';
    for (const rotation of [0, 35, 125]) {
      for (const reverse of [false, true]) {
        const items = [{ ...actor, rotation }, frame];
        await load(fixture(reverse ? items.reverse() : items));
        await moveShape('actor', `Nested actor rotation=${rotation} reverse=${reverse}`);
      }
    }
    const arrow = { id: 'inner-arrow', kind: 'arrow', from: { x: 240, y: 200 }, to: { x: 430, y: 290 },
      color: '#0f172a', width: 2, shape: 'curved', head: 'end' };
    await load(fixture([arrow, frame]));
    await moveShape('inner-arrow', 'Curved arrow inside a later frame');
    await load(fixture([arrow, frame]));
    const awayFromArrow = await screen(490, 350);
    await page.mouse.click(awayFromArrow.x, awayFromArrow.y); await settle();
    assert.deepEqual((await selected()).shapes, ['frame'], 'An arrow bounding box does not steal frame clicks');
    await load(fixture([{ ...actor, rotation: 45 }, frame]));
    const emptyCorner = await screen(225, 150);
    await page.mouse.click(emptyCorner.x, emptyCorner.y); await settle();
    assert.deepEqual((await selected()).shapes, ['frame'], 'The empty corner of a rotated child bounding box belongs to the frame');
    for (const reverse of [false, true]) {
      const items = [actor, box('partial-overlap', 315, 120, 180, 210)];
      await load(fixture(reverse ? items.reverse() : items));
      await moveShape('actor', `Partly overlapping actor reverse=${reverse}`, .35, .6);
    }

    stage = 'small and zoomed-out shapes keep a draggable centre';
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.__nds_themeStore.getState().setPref(value), theme);
      await load(fixture([box('small-actor', 260, 160, 45, 65, { geom: 'actor' })]));
      for (let i = 0; i < 3; i++) {
        await page.locator('.react-flow__controls-zoomout').click(); await settle();
        await moveShape('small-actor', `${theme} small actor zoom ${i}`);
      }
    }
    await page.evaluate(() => window.__nds_themeStore.getState().setPref('light'));

    stage = 'minimum screen-space targets for tiny and rotated shapes';
    for (const rotation of [0, 35]) {
      const tinyShapes = [
        box('tiny-actor', 300, 240, 8, 12, { geom: 'actor', rotation }),
        box('tiny-rect', 300, 240, 8, 12, { rotation }),
        { id: 'tiny-ellipse', kind: 'ellipse', cx: 304, cy: 246, rx: 4, ry: 6,
          color: '#0f172a', width: 2, fillOpacity: 0, rotation },
        { ...box('tiny-callout', 300, 240, 8, 12, { rotation }), kind: 'callout',
          text: '', anchor: { x: 330, y: 270 } },
      ];
      for (const shape of tinyShapes) {
        await load(fixture([shape]));
        for (let i = 0; i < 14; i++) {
          if (!await page.locator('.react-flow__controls-zoomout').isEnabled()) break;
          await page.locator('.react-flow__controls-zoomout').click(); await settle();
        }
        const padding = page.locator(`[data-nds-shape="${shape.id}"] [data-nds-selection-padding]`);
        assert.equal(await padding.count(), 1, `${shape.id}: a tiny shape has a minimum-size target; loaded=${JSON.stringify(await shapes())}`);
        const zoom = await page.evaluate(() => document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM().a);
        const u = .5 + 10 / (8 * zoom);
        await moveShape(shape.id, `${shape.id} rotation=${rotation} outside artwork`, u);
        await moveShape(shape.id, `${shape.id} rotation=${rotation} selected body`);
        const p = await shapePoint(shape.id, u);
        await pick(p, shape.id, 'shape', [shape.id]);
      }
    }

    stage = 'direct shape hits take priority over neighbouring padding';
    await load(fixture([box('neighbour', 330, 230, 50, 50), box('tiny-nearby', 325, 249, 2, 2)]));
    const direct = await screen(332, 250);
    await page.mouse.click(direct.x, direct.y); await settle();
    assert.deepEqual((await selected()).shapes, ['neighbour'], 'Tiny-object padding must not steal a direct neighbour hit');

    stage = 'short selected arrows retain a draggable middle';
    await load(fixture([{ id: 'tiny-arrow', kind: 'arrow', from: { x: 300, y: 240 },
      to: { x: 308, y: 252 }, color: '#0f172a', width: 2, head: 'end' }]));
    for (let i = 0; i < 14; i++) {
      if (!await page.locator('.react-flow__controls-zoomout').isEnabled()) break;
      await page.locator('.react-flow__controls-zoomout').click(); await settle();
    }
    await moveShape('tiny-arrow', 'Tiny arrow body');
    await moveShape('tiny-arrow', 'Selected tiny arrow body');

    stage = 'fully overlapping shapes';
    const identical = [box('lower', 220, 130, 200, 160), box('upper', 220, 130, 200, 160)];
    await load(fixture(identical));
    await pick(await shapePoint('lower'), 'lower', 'shape', ['lower', 'upper']);
    assert.deepEqual(await shapes(), identical, 'Choosing an object never rewrites saved stacking order');
    await moveShape('lower', 'Explicitly chosen shape underneath an identical shape');
    await page.keyboard.press('Escape'); await settle();
    await load(fixture([actor, frame]));
    await pick(await shapePoint('actor'), 'frame', 'shape', ['actor', 'frame']);
    const beforeFrame = await shapes();
    await drag(await shapePoint('actor'));
    assert.deepEqual((await selected()).shapes, ['frame'], 'An explicit frame choice is not redirected to its child');
    const movedFrame = await shapes();
    const dx = movedFrame.find(s => s.id === 'frame').x - frame.x;
    assert(dx > 5);
    assert.equal(movedFrame.find(s => s.id === 'actor').x - actor.x, dx, 'Frame dragging retains its existing cargo behavior');
    // Container cargo retains the existing per-shape undo records.
    for (let i = 0; i < beforeFrame.length; i++) await shortcut('Control+z');
    assert.deepEqual(await shapes(), beforeFrame);

    stage = 'resources, overlapping holes and rotated frames';
    const cards = [node('card-one', 220, 170), node('card-two', 270, 175)];
    const covering = box('covering', 170, 90, 470, 380, { fillOpacity: .12 });
    for (const rotation of [0, 30]) {
      await load(fixture([{ ...covering, rotation }], cards));
      const icon = await page.locator('.react-flow__node[data-id="card-one"] .rounded-full svg').first().boundingBox();
      assert(icon);
      // The first icon is visible inside both cards' boxes; their captions
      // genuinely overlap a connection dot, so that is not a body target.
      const p = { x: icon.x + icon.width / 2, y: icon.y + icon.height * .2 };
      await page.mouse.click(p.x, p.y); await settle();
      assert.deepEqual((await selected()).nodes, ['card-one'], 'Overlapping resource holes stay open, including through rotated shapes');
    }
    await load(fixture([box('small-cover', 300, 180, 60, 70)], [node('large-card', 260, 130, 210, 200)]));
    await pick(await shapePoint('small-cover'), 'large-card', 'node', ['large-card', 'small-cover']);
    const beforeCard = await graph();
    await drag(await shapePoint('small-cover'));
    const afterCard = await graph();
    assert(afterCard.nodes[0].position.x > beforeCard.nodes[0].position.x + 5, 'A selected larger resource drags through a smaller shape');
    await shortcut('Control+z'); assert.deepEqual((await graph()).nodes, beforeCard.nodes);

    stage = 'chosen resources beneath arrow strokes, captions and callout leaders';
    for (const coveringShape of [
      { id: 'arrow-cover', kind: 'arrow', from: { x: 230, y: 230 }, to: { x: 450, y: 230 },
        color: '#0f172a', width: 2, head: 'end', shape: 'curved', text: 'Overlapping arrow', rotation: 25 },
      { id: 'callout-cover', kind: 'callout', x: 490, y: 140, w: 160, h: 100,
        color: '#0f172a', width: 2, text: 'Callout', anchor: { x: 240, y: 265 } },
    ]) {
      await load(fixture([coveringShape], [node('under-stroke', 210, 130, 260, 220)]));
      const strokePoint = () => page.locator(`[data-nds-shape="${coveringShape.id}"] [data-nds-shape-hit="stroke"]`).first().evaluate(el => {
        const p = el.getPointAtLength(el.getTotalLength() * .6);
        const q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
        return { x: q.x, y: q.y };
      });
      const start = await strokePoint();
      await pick(start, 'under-stroke', 'node', ['under-stroke', coveringShape.id]);
      const before = await graph();
      await drag(await strokePoint());
      const after = await graph();
      assert(after.nodes[0].position.x > before.nodes[0].position.x + 5, 'The selected resource takes priority over the covering stroke');
      assert.deepEqual((await selected()).nodes, ['under-stroke']);
      await shortcut('Control+z'); assert.deepEqual((await graph()).nodes, before.nodes);
    }
    await load(fixture([box('thin-rotated', 245, 200, 300, 35, { rotation: 45 })],
      [node('larger-card', 225, 150, 350, 230)]));
    await moveShape('thin-rotated', 'A rotated thin shape remains grabbable over a larger resource');

    stage = 'identical resources and groups';
    for (const type of ['storage', 'group-vnet']) {
      await load(fixture([], [node('lower-node', 220, 130, 230, 190, type), node('upper-node', 220, 130, 230, 190, type)]));
      const p = await screen(290, 230);
      await pick(p, 'lower-node', 'node', ['lower-node', 'upper-node']);
      const before = await graph();
      await drag(p);
      const after = await graph();
      assert(after.nodes[0].position.x > before.nodes[0].position.x + 5, `The chosen ${type} follows a native body drag`);
      assert.deepEqual(after.nodes[1], before.nodes[1], 'The covering peer does not move');
      await shortcut('Control+z'); assert.deepEqual((await graph()).nodes, before.nodes);
    }

    stage = 'canvas images and covered connectors';
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
      canvas.getContext('2d').fillRect(0, 0, 40, 40); return canvas.toDataURL();
    });
    const image = box('image', 260, 160, 100, 140, { canvasImage: png, width: 0 });
    await load(fixture([image, frame]));
    await moveShape('image', 'Image inside a later frame');
    const endpoints = [node('source', 120, 170), node('target', 610, 170)];
    await load(fixture([box('edge-cover', 320, 160, 190, 210)], endpoints,
      [{ id: 'covered-edge', source: 'source', target: 'target', kind: 'link', sourceHandle: 's-r', targetHandle: 't-l' }]));
    const edgePoint = await page.locator('[data-nds-edge-hit="covered-edge"]').evaluate(el => {
      const p = el.getPointAtLength(el.getTotalLength() / 2);
      const q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM()); return { x: q.x, y: q.y };
    });
    await pick(edgePoint, 'covered-edge', 'edge', ['covered-edge', 'edge-cover']);
    assert.deepEqual((await selected()).edges, ['covered-edge'], 'Covered connectors remain selectable for editing');

    stage = 'picker dismissal and keyboard operation';
    await load(fixture(identical));
    const pickerPoint = await shapePoint('lower');
    const beforeDismiss = await selected();
    await openPicker(pickerPoint, ['lower', 'upper']);
    const beforeKeys = await shapes();
    for (const key of ['Delete', 'Control+d', 'Control+z', 'Control+a', 'p']) await page.keyboard.press(key);
    assert.deepEqual(await shapes(), beforeKeys, 'Editing shortcuts do not mutate the canvas behind the picker');
    assert(await page.evaluate(() => !window.getSelection()?.toString()), 'Menu shortcuts do not select the whole page');
    assert.equal(await page.evaluate(() => window.__nds_annotationStore.getState().tool), 'move');
    await page.keyboard.press('Escape'); await settle();
    assert.equal(await page.locator('[data-nds-object-picker]').count(), 0);
    assert.deepEqual(await selected(), beforeDismiss, 'Dismissing the picker does not change selection');
    await openPicker(pickerPoint, ['lower', 'upper']); await page.keyboard.press('End'); await page.keyboard.press('Enter'); await settle();
    assert.equal((await selected()).shapes.length, 1, 'The picker is keyboard accessible');
    await openPicker(pickerPoint, ['lower', 'upper']);
    await page.getByRole('button', { name: 'Save JSON', exact: true }).focus();
    await page.keyboard.press('Escape'); await settle();
    assert.equal(await page.locator('[data-nds-object-picker]').count(), 0);

    stage = 'selection priority resets and right-button panning';
    await pick(await shapePoint('lower'), 'lower', 'shape', ['lower', 'upper']);
    await page.keyboard.press('Escape'); await settle();
    assert.equal(await page.evaluate(() => window.__nds_annotationStore.getState().pickedObject), null);
    await pick(await shapePoint('lower'), 'lower', 'shape', ['lower', 'upper']);
    await page.locator('[data-nds-tool="pan"]').click(); await settle();
    assert.equal(await page.evaluate(() => window.__nds_annotationStore.getState().pickedObject), null);
    await page.locator('[data-nds-tool="move"]').click(); await settle();
    const pane = await page.locator('.react-flow').boundingBox();
    const panStart = { x: pane.x + pane.width * .75, y: pane.y + pane.height * .7 };
    const oldViewport = await page.locator('.react-flow__viewport').getAttribute('style');
    await page.mouse.move(panStart.x, panStart.y); await page.mouse.down({ button: 'right' });
    await page.mouse.move(panStart.x - 65, panStart.y - 35, { steps: 12 }); await page.mouse.up({ button: 'right' }); await settle();
    assert.notEqual(await page.locator('.react-flow__viewport').getAttribute('style'), oldViewport, 'Right-drag still pans');
    assert.equal(await page.locator('[data-nds-object-picker]').count(), 0, 'A pan does not leave an object picker open');
    await pick(await shapePoint('lower'), 'lower', 'shape', ['lower', 'upper']);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
    const stream = await (await pending).createReadStream();
    const chunks = []; for await (const chunk of stream) chunks.push(chunk);
    const saved = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.deepEqual(saved.shapes, identical, 'Temporary selection priority never changes saved paint order or geometry');
    assert.equal(saved.pickedObject, undefined, 'The object picker is not diagram data');
    await page.locator('[data-nds-tab-add]').click(); await settle();
    assert.equal(await page.evaluate(() => window.__nds_annotationStore.getState().pickedObject), null, 'Tab changes clear temporary priority');

    stage = 'localized object picker';
    await load(fixture(identical));
    for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(value => window.__nds_i18nStore.getState().setLang(value), language);
      const menu = await openPicker(await shapePoint('lower'), ['lower', 'upper']);
      const title = await menu.getAttribute('aria-label');
      assert(title && (language === 'en' ? title === 'Select object' : title !== 'Select object'), `${language}: localized picker heading`);
      assert.deepEqual(await page.evaluate(language => (window.__nds_i18nMissing?.()[language] || [])
        .filter(key => ['Select object', 'Select an object to move or edit.', 'Shape', 'Rectangle'].includes(key)), language), [],
      `${language}: picker labels are translated`);
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));

    assert.deepEqual(errors, [], 'No browser errors');
    assert.deepEqual(network, [], 'The packaged editor stays offline');
    if (!preview) assert.equal(digest(entry), originalHash, 'The test does not change the installed package');
    if (evidence) {
      await page.screenshot({ path: path.join(evidence, 'final.png') });
      fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ entry, results, errors, network }, null, 2));
    }
    console.log(`PASS object selection: ${results.length} native shape drags; all palette shapes, nesting, overlap, resources, groups, images, connectors, undo, themes and zoom (${entry})`);
  } catch (error) {
    if (evidence) {
      await page.screenshot({ path: path.join(evidence, 'failure.png') });
      fs.writeFileSync(path.join(evidence, 'failure.json'), JSON.stringify({ stage, message: error.message, results, errors, network }, null, 2));
    }
    error.message = `${stage}: ${error.message}`; throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) (async () => {
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
  for (const entry of entries) await verify(entry);
})().catch(error => { console.error(error); process.exitCode = 1; });
