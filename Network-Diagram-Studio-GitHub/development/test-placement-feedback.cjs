const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { openHeaderMenu, clickHeaderAction } = require('./test-header-menu-helper.cjs');

const VARIANTS = [
  'arrow-straight', 'arrow-line', 'arrow-dashed',
  'arrow-double', 'arrow-curved', 'geom-arrow-right', 'geom-arrow-quad',
];
const PREVIEW = process.env.NDS_PLACEMENT_PREVIEW_DIR;
const settle = page => page.waitForTimeout(180);
const near = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < .8, `${message}: ${actual} vs ${expected}`);
const shapes = page => page.evaluate(() => window.__nds_tabsStore.getState().activeTab().shapes);
const shapeElement = id => `[data-nds-shape="${id}"]`;
const hasFeedback = page => page.locator('[data-nds-position-tooltip]').count();

async function reset(page) {
  await page.evaluate(() => {
    window.__nds_diagramStore.getState().clear();
    window.__nds_tabsStore.getState().resetActiveTabAnnotations();
    window.__nds_annotationStore.getState().clearShapeSelection();
    window.__nds_annotationStore.getState().setTool('move');
    window.__nds_layoutStore.getState().expandSection('shapes');
  });
  await page.locator('[data-nds-palette-search-all]').fill('');
  await settle(page);
}

async function screen(page, point) {
  return page.evaluate(point => {
    const matrix = document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM();
    const result = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    return { x: result.x, y: result.y, zoom: matrix.a };
  }, point);
}

async function signature(page, selector) {
  return page.locator(selector).evaluate(element => {
    const root = element.matches('[data-nds-shape]') ? element : element.querySelector('[data-nds-shape]');
    return {
      paths: [...root.querySelectorAll(':scope > path:not([stroke-opacity]):not([data-nds-shape-hit])')].map(p => p.getAttribute('d')),
      rotation: root.getAttribute('transform'),
    };
  });
}

async function pointOnShape(page, id) {
  return page.locator(shapeElement(id)).evaluate(root => {
    const path = root.querySelector('path[stroke="transparent"]') ?? root.querySelector(':scope > path');
    const box = root.getBBox();
    const point = root.dataset.ndsShapeKind === 'arrow' ? path.getPointAtLength(path.getTotalLength() * .38)
      : root.dataset.ndsShapeGeom ? { x: box.x + box.width * .35, y: box.y + box.height * .55 }
      : { x: box.x + 20, y: box.y + 15 };
    const result = new DOMPoint(point.x, point.y).matrixTransform(root.getScreenCTM());
    return { x: result.x, y: result.y };
  });
}

async function beginMove(page, id, dx, dy) {
  const start = await pointOnShape(page, id);
  const { zoom } = await screen(page, { x: 0, y: 0 });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx * zoom, start.y + dy * zoom, { steps: 8 });
  await page.locator('[data-nds-position-tooltip]').waitFor();
}

async function selectArrow(page, variant) {
  await reset(page);
  await page.locator(`[data-nds-accordion-section="shapes"] [data-nds-shape-variant="${variant}"]`).click();
  await settle(page);
  return (await shapes(page))[0];
}

async function undoRedo(page, original, final) {
  await page.locator('[data-nds-fullscreen]').focus();
  await page.keyboard.press('Control+z');
  await settle(page);
  assert.deepEqual((await shapes(page))[0], original, 'one undo restores the original geometry');
  await page.keyboard.press('Control+y');
  await settle(page);
  assert.deepEqual((await shapes(page))[0], final, 'redo restores the final geometry');
}

async function finishEdit(page, original) {
  const candidate = await signature(page, '[data-nds-arrow-preview]');
  assert.equal(await page.locator('[data-nds-preview-hidden]').count(), 1, 'the original live arrow is temporarily hidden');
  const before = await signature(page, shapeElement(`placement-original-${original.id}`));
  await page.mouse.up();
  await settle(page);
  assert.equal(await hasFeedback(page), 0, 'feedback is removed on release');
  assert.equal(await page.locator('[data-nds-preview-hidden]').count(), 0);
  assert.deepEqual(await signature(page, shapeElement(original.id)), candidate, 'the dashed candidate exactly matches the final path/rotation');
  const final = (await shapes(page))[0];
  assert.notDeepEqual(final, original, 'the interaction actually changes the arrow');
  await undoRedo(page, original, final);
  assert.notDeepEqual(candidate, before, 'the original snapshot and candidate show different positions');
  return final;
}

async function nativePaletteDrag(page, source, target) {
  await source.scrollIntoViewIfNeeded();
  const box = await source.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 14, box.y + box.height / 2, { steps: 4 });
  await page.mouse.move(target.x, target.y, { steps: 14 });
  await page.mouse.move(target.x + 1, target.y + 1);
  await page.locator('[data-nds-arrow-preview]').waitFor({ state: 'attached' });
  await page.locator('[data-nds-position-tooltip]').waitFor();
}

async function palette(page) {
  await reset(page);
  await page.locator('.react-flow__controls-zoomout').click();
  await page.locator('.react-flow__controls-zoomout').click();
  await settle(page);
  const pane = await page.locator('.react-flow').boundingBox();
  await page.mouse.move(pane.x + pane.width * .7, pane.y + pane.height * .7);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(pane.x + pane.width * .7 + 70, pane.y + pane.height * .7 + 30, { steps: 6 });
  await page.mouse.up({ button: 'middle' });
  const matrix = await screen(page, { x: 0, y: 0 });
  assert.ok(Math.abs(matrix.zoom - 1) > .1, 'palette coverage runs at non-unit zoom');

  for (const variant of VARIANTS) {
    await reset(page);
    const prior = await page.evaluate(() => ({
      shapes: window.__nds_tabsStore.getState().activeTab().shapes,
      undo: window.__nds_tabsStore.getState().undoStack.length,
      diagram: window.__nds_diagramStore.getState().toJson(),
    }));
    const source = page.locator(`[data-nds-accordion-section="shapes"] [data-nds-shape-variant="${variant}"]`);
    await nativePaletteDrag(page, source, { x: pane.x + pane.width * .58, y: pane.y + pane.height * .3 });
    const candidate = await signature(page, '[data-nds-arrow-preview]');
    assert.ok(candidate.paths.length > 0, 'preview uses real vector geometry');
    const unchanged = await page.evaluate(() => ({
      shapes: window.__nds_tabsStore.getState().activeTab().shapes,
      undo: window.__nds_tabsStore.getState().undoStack.length,
      diagram: window.__nds_diagramStore.getState().toJson(),
    }));
    assert.deepEqual(unchanged, prior, variant + ': native drag preview never changes the document/history');
    assert.ok(await page.locator('[data-nds-arrow-preview] [stroke-dasharray]').count());
    await page.mouse.up();
    await settle(page);
    const added = await shapes(page);
    assert.equal(added.length, 1, variant + ': releasing a native drag creates exactly one arrow');
    assert.deepEqual(await signature(page, shapeElement(added[0].id)), candidate, variant + ': final geometry equals the preview');
    assert.equal(await hasFeedback(page), 0);
    assert.equal(await page.evaluate(() => window.__nds_tabsStore.getState().undoStack.length), prior.undo + 1);
  }

  await reset(page);
  await page.evaluate(() => {
    window.__nds_favoritesStore.getState().toggleFavorite('shape', 'arrow-straight');
    window.__nds_layoutStore.getState().expandSection('favorites');
  });
  await nativePaletteDrag(page,
    page.locator('[data-nds-accordion-section="favorites"] [data-nds-shape-variant="arrow-straight"]'),
    { x: pane.x + pane.width * .58, y: pane.y + pane.height * .3 });
  await page.mouse.up(); await settle(page);
  assert.equal((await shapes(page)).length, 1, 'Favorites uses the same native preview/drop path');

  await reset(page);
  await page.locator('[data-nds-palette-search-all]').fill('arrow');
  await nativePaletteDrag(page, page.locator('[data-nds-search-hit-kind="shape"]').first(),
    { x: pane.x + pane.width * .58, y: pane.y + pane.height * .3 });
  await page.mouse.up(); await settle(page);
  assert.equal((await shapes(page)).length, 1, 'search uses the same native preview/drop path');
  console.log('PASS native palette/Favorites/search previews, exact geometry, pan/zoom and no premature history');
}

async function edits(page) {
  for (const variant of VARIANTS) {
    let original = await selectArrow(page, variant);
    await beginMove(page, original.id, 36, 29);
    await finishEdit(page, original);

    original = await selectArrow(page, variant);
    const handle = page.locator('[data-nds-shape-handle="rotate"] circle');
    const box = await handle.boundingBox();
    const center = original.kind === 'arrow'
      ? { x: (original.from.x + original.to.x) / 2, y: (original.from.y + original.to.y) / 2 }
      : { x: original.x + original.w / 2, y: original.y + original.h / 2 };
    const pivot = await screen(page, center);
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.keyboard.down('Shift');
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(pivot.x - (start.y - pivot.y), pivot.y + (start.x - pivot.x), { steps: 12 });
    await page.keyboard.up('Shift');
    await finishEdit(page, original);

    original = await selectArrow(page, variant);
    const resize = page.locator(`[data-nds-shape-handle="${original.kind === 'arrow' ? 'end' : 'se'}"]`);
    const bounds = await resize.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 40, bounds.y + bounds.height / 2 + 26, { steps: 10 });
    await finishEdit(page, original);
  }
  let rotated = await selectArrow(page, 'arrow-straight');
  await page.evaluate(shape => window.__nds_tabsStore.getState().updateShape({ ...shape, rotation: 37 }), rotated);
  await settle(page);
  rotated = (await shapes(page))[0];
  const end = await page.locator('[data-nds-shape-handle="end"]').boundingBox();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2); await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2 + 33, end.y + end.height / 2 + 24, { steps: 8 });
  const displayedEnd = await page.locator('[data-nds-arrow-preview] [data-nds-shape]').evaluate(root => {
    const path = root.querySelector('path[stroke="transparent"]');
    const p = path.getPointAtLength(path.getTotalLength());
    const screen = new DOMPoint(p.x, p.y).matrixTransform(root.getScreenCTM());
    const world = screen.matrixTransform(document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM().inverse());
    return { x: world.x, y: world.y };
  });
  await assertPosition(page, displayedEnd.x, displayedEnd.y);
  await finishEdit(page, rotated);
  console.log('PASS every offered arrow/line: move, rotate, endpoint/resize previews, one-step undo and redo');
}

async function positions(page) {
  await reset(page);
  const ids = await page.evaluate(() => {
    const store = window.__nds_diagramStore.getState();
    store.addNode('vm', { x: 80, y: 150 });
    store.addNode('vm', { x: 480, y: 430 });
    return window.__nds_diagramStore.getState().diagram.nodes.map(node => node.id);
  });
  await settle(page);
  const node = page.locator(`[data-nds-node-id="${ids[0]}"]`);
  await node.click(); await page.waitForTimeout(350);
  const box = await node.boundingBox();
  const { zoom } = await screen(page, { x: 0, y: 0 });
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 402 * zoom, y + 11 * zoom, { steps: 16 });
  await settle(page);
  // React Flow starts its drag delta after the movement threshold, in both
  // production and non-production. Drive the remaining distance explicitly.
  const afterThreshold = await page.evaluate(id =>
    window.__nds_diagramStore.getState().diagram.nodes.find(node => node.id === id).position, ids[0]);
  await page.mouse.move(x + (402 + 482 - afterThreshold.x) * zoom, y + (11 + 161 - afterThreshold.y) * zoom);
  await settle(page);
  await page.locator('[data-nds-position-tooltip]').waitFor();
  const feedback = await page.locator('[data-nds-position-tooltip]').evaluate(el => ({
    x: Number(el.dataset.x), y: Number(el.dataset.y), height: el.getBoundingClientRect().height,
  }));
  near(feedback.x, 482, 'world X is independent of zoom/pan');
  near(feedback.y, 161, 'world Y is independent of zoom/pan');
  near(feedback.height, 24, 'coordinate label remains a readable screen size');
  const guide = await page.locator('[data-nds-alignment-guide="x"]').getAttribute('data-nds-guide-value');
  near(Number(guide), 480, 'alignment uses the stationary object, not the moving object');
  const current = await page.evaluate(id => window.__nds_diagramStore.getState().diagram.nodes.find(n => n.id === id), ids[0]);
  near(current.position.x, 482, 'a nearby alignment guide does not magnetically snap the node');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
    await settle(page);
    const colors = await page.locator('[data-nds-position-tooltip]').evaluate(el => ({
      text: getComputedStyle(el.querySelector('text')).fill, background: getComputedStyle(el.querySelector('rect')).fill,
    }));
    assert.notEqual(colors.text, colors.background, 'position readout is legible in ' + theme);
    if (PREVIEW) await page.screenshot({ path: path.join(PREVIEW, `position-guides-${theme}.png`) });
  }
  await page.mouse.up(); await settle(page);
  assert.equal(await hasFeedback(page), 0);
  console.log('PASS live world coordinates, screen-sized labels, theme-aware guides and no new snapping');
}

async function cleanup(page) {
  for (const event of ['escape', 'pointercancel', 'blur']) {
    const original = await selectArrow(page, 'arrow-straight');
    await beginMove(page, original.id, 38, 27);
    if (event === 'escape') await page.keyboard.press('Escape');
    else await page.evaluate(event => {
      if (event === 'blur') window.dispatchEvent(new Event('blur'));
      else document.querySelector('[data-nds-shape-overlay]').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
    }, event);
    await settle(page);
    assert.equal(await hasFeedback(page), 0, event + ' removes the feedback');
    const final = (await shapes(page))[0];
    await page.mouse.up();
    await undoRedo(page, original, final);
  }
  const original = await selectArrow(page, 'arrow-straight');
  await beginMove(page, original.id, 26, 17);
  await page.evaluate(() => window.__nds_tabsStore.getState().addTab());
  await settle(page);
  assert.equal(await hasFeedback(page), 0, 'switching tabs never leaves previous-tab previews');
  await page.mouse.up();
  console.log('PASS Escape, pointer cancellation, blur, tab changes and interrupted-gesture undo');
}

async function boundaries(page) {
  await reset(page);
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  const source = page.locator('[data-nds-accordion-section="shapes"] [data-nds-shape-variant="arrow-straight"]');
  const pane = page.locator('.react-flow__pane');
  const box = await pane.boundingBox();
  const position = { clientX: box.x + box.width * .4, clientY: box.y + box.height * .4 };
  await source.dispatchEvent('dragstart', { dataTransfer: transfer });
  await transfer.evaluate(value => Object.defineProperty(value, 'getData', {
    configurable: true, value: () => { throw new Error('Drag data is protected until drop'); },
  }));
  await pane.dispatchEvent('dragover', { dataTransfer: transfer, ...position });
  await page.locator('[data-nds-position-tooltip]').waitFor();
  await pane.evaluate(el => el.dispatchEvent(new DragEvent('dragleave', {
    bubbles: true, relatedTarget: document.querySelector('[data-nds-palette-search-all]'),
  })));
  await settle(page);
  assert.equal(await hasFeedback(page), 0, 'leaving the canvas clears the candidate');
  await pane.dispatchEvent('dragover', { dataTransfer: transfer, ...position });
  await page.locator('[data-nds-position-tooltip]').waitFor();
  await source.dispatchEvent('dragend', { dataTransfer: transfer });
  await settle(page);
  assert.equal(await hasFeedback(page), 0, 'cancelled/outside drops clear the drag state');
  assert.equal((await shapes(page)).length, 0, 'cancelled placement never creates an arrow');
  await pane.dispatchEvent('dragover', { dataTransfer: transfer, ...position });
  await settle(page);
  assert.equal(await hasFeedback(page), 0, 'an old MIME payload cannot revive a finished drag');
  await transfer.dispose();

  await page.locator('[data-nds-fullscreen]').focus();
  await page.evaluate(() => window.__nds_annotationStore.getState().setTool('shape-arrow'));
  const start = { x: box.x + box.width * .35, y: box.y + box.height * .45 };
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + 135, start.y + 64, { steps: 10 });
  await page.locator('[data-nds-position-tooltip]').waitFor();
  const candidate = await signature(page, '[data-nds-arrow-preview]');
  assert.equal((await shapes(page)).length, 0, 'drawing preview is not a saved annotation');
  await page.mouse.up(); await settle(page);
  assert.deepEqual(await signature(page, shapeElement((await shapes(page))[0].id)), candidate);
  console.log('PASS protected drag data, canvas leave/re-entry, cancelled placement and free-drawn arrow previews');
}

const fixtureNode = (id, type, x, y, extra = {}) => ({
  id, type, position: { x, y }, size: { w: 150, h: 130 },
  data: { name: id, fields: {}, state: 'ok' }, ...extra,
});
const fixtureArrow = (id, x, y) => ({
  id, kind: 'arrow', from: { x, y }, to: { x: x + 100, y: y + 30 },
  color: '#0f172a', width: 2, shape: 'straight', head: 'end',
});
async function fixture(page, nodes, annotations = []) {
  await reset(page);
  await page.evaluate(({ nodes, annotations }) => {
    const store = window.__nds_diagramStore.getState();
    store.loadDiagram({ ...store.diagram, nodes, edges: [], annotations: [] }, { relayout: false });
    window.__nds_tabsStore.getState().addShapes(annotations);
    store.selectNode(null);
  }, { nodes, annotations });
  await page.waitForTimeout(350);
}
async function nodes(page) {
  return page.evaluate(() => window.__nds_diagramStore.getState().diagram.nodes);
}
function absolute(items, id) {
  const node = items.find(item => item.id === id);
  const parent = node.parent ? absolute(items, node.parent) : { x: 0, y: 0 };
  return { x: node.position.x + parent.x, y: node.position.y + parent.y };
}
async function nodeDrag(page, id, dx, dy, header = false) {
  const before = absolute(await nodes(page), id);
  const bounds = await page.locator(`.react-flow__node[data-id="${id}"]`).boundingBox();
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + (header ? 18 : bounds.height / 2) };
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 8, point.y + 4);
  await settle(page);
  const primed = absolute(await nodes(page), id);
  const { zoom } = await screen(page, { x: 0, y: 0 });
  await page.mouse.move(point.x + 8 + (before.x + dx - primed.x) * zoom,
    point.y + 4 + (before.y + dy - primed.y) * zoom, { steps: 8 });
  await settle(page);
  await page.locator('[data-nds-position-tooltip]').waitFor();
}
async function assertPosition(page, x, y) {
  const feedback = await page.locator('[data-nds-position-tooltip]').evaluate(el => ({
    x: Number(el.dataset.x), y: Number(el.dataset.y),
  }));
  near(feedback.x, x, 'selection world X');
  near(feedback.y, y, 'selection world Y');
}
async function groups(page) {
  await fixture(page, [
    fixtureNode('parent', 'group-rg', 80, 80, { size: { w: 580, h: 390 } }),
    fixtureNode('child', 'vm', 50, 95, { parent: 'parent' }),
  ]);
  await page.evaluate(() => window.__nds_diagramStore.getState().selectNode('child'));
  await page.waitForTimeout(350);
  await nodeDrag(page, 'child', 31, 23);
  await assertPosition(page, 161, 198);
  assert.deepEqual((await nodes(page)).find(n => n.id === 'child').position, { x: 81, y: 118 }, 'nested model positions remain parent-relative');
  await page.mouse.up(); await settle(page);

  await fixture(page, [
    fixtureNode('parent', 'group-rg', 80, 80, { size: { w: 580, h: 390 } }),
    fixtureNode('child', 'vm', 50, 95, { parent: 'parent' }),
    fixtureNode('guest', 'vm', 370, 210),
  ], [fixtureArrow('cargo', 420, 370)]);
  await page.evaluate(() => window.__nds_diagramStore.getState().selectNode('parent'));
  await page.waitForTimeout(350);
  await nodeDrag(page, 'parent', 37, 29, true);
  await assertPosition(page, 117, 109);
  assert.equal(await page.locator('[data-nds-alignment-guide]').count(), 0, 'descendants and carried nodes/shapes cannot self-align');
  const carried = await nodes(page);
  assert.deepEqual(carried.find(n => n.id === 'child').position, { x: 50, y: 95 }, 'the child is not translated twice');
  assert.deepEqual(carried.find(n => n.id === 'guest').position, { x: 407, y: 239 });
  assert.deepEqual((await shapes(page))[0].from, { x: 457, y: 399 });
  await page.mouse.up(); await settle(page);
  assert.equal(await hasFeedback(page), 0);

  await fixture(page, [fixtureNode('a', 'vm', 80, 110), fixtureNode('b', 'vm', 280, 280)]);
  await page.evaluate(() => window.__nds_diagramStore.getState().applyNodeSelection([
    { id: 'a', selected: true }, { id: 'b', selected: true },
  ]));
  await page.waitForTimeout(350);
  await nodeDrag(page, 'a', 27, 21);
  await assertPosition(page, 107, 131);
  assert.deepEqual((await nodes(page)).find(n => n.id === 'b').position, { x: 307, y: 301 }, 'both selected resources move together');
  assert.equal(await page.locator('[data-nds-alignment-guide]').count(), 0);
  await page.mouse.up(); await settle(page);

  await fixture(page, [], [
    { id: 'cube', kind: 'rect', geom: 'cube', x: 100, y: 150, w: 120, h: 110, color: '#0f172a', width: 2, fillOpacity: 0 },
    fixtureArrow('second', 330, 180),
  ]);
  await page.evaluate(() => window.__nds_annotationStore.getState().setSelectedShapes(['cube', 'second']));
  await beginMove(page, 'cube', 37, 24);
  await assertPosition(page, 137, 174);
  assert.equal(await page.locator('[data-nds-arrow-preview]').count(), 1);
  assert.equal(await page.locator('[data-nds-alignment-guide]').count(), 0);
  await page.mouse.up(); await settle(page);
  assert.deepEqual((await shapes(page)).find(shape => shape.id === 'second').from, { x: 367, y: 204 });

  await fixture(page, [fixtureNode('inside', 'vm', 180, 200)], [
    { id: 'frame', kind: 'rect', x: 100, y: 120, w: 500, h: 360, color: '#0f172a', width: 2, fillOpacity: 0 },
    fixtureArrow('inside-arrow', 400, 350),
  ]);
  await page.evaluate(() => window.__nds_annotationStore.getState().setSelectedShapes(['frame']));
  await beginMove(page, 'frame', 29, 17);
  await assertPosition(page, 129, 137);
  assert.equal(await page.locator('[data-nds-alignment-guide]').count(), 0);
  assert.deepEqual((await nodes(page))[0].position, { x: 209, y: 217 }, 'a moving shape frame still carries its resource');
  await page.mouse.up(); await settle(page);
  assert.equal(await hasFeedback(page), 0);
  console.log('PASS nested world positions, resource/shape cargo, multi-selection and self-guide exclusion');
}

async function downloaded(page, title, programmatic = false) {
  const pending = page.waitForEvent('download');
  if (title.startsWith('Export the full diagram')) await openHeaderMenu(page, 'export', programmatic);
  const button = page.getByTitle(title, { exact: true });
  if (programmatic) await button.evaluate(el => el.click());
  else await button.click();
  const result = await pending;
  const chunks = [];
  for await (const chunk of await result.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function exportsAndHeader(page, context) {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await settle(page);
  const original = await selectArrow(page, 'geom-arrow-right');
  await page.evaluate(shape => window.__nds_tabsStore.getState().updateShape({ ...shape, text: 'Flow' }), original);
  await settle(page);
  await beginMove(page, original.id, 36, 28);
  if (PREVIEW) await page.screenshot({ path: path.join(PREVIEW, 'arrow-placement-preview.png') });
  const saved = JSON.parse((await downloaded(page, 'Save current diagram as JSON', true)).toString());
  assert.equal(saved.shapes.length, 1, 'Save JSON includes only the real arrow, never its preview');
  assert.ok(!JSON.stringify(saved).includes('placement-'));
  const svg = (await downloaded(page, 'Export the full diagram as SVG', true)).toString();
  const inspection = await context.newPage();
  await inspection.setContent(svg);
  const result = await inspection.evaluate(id => ({
    previews: [...document.querySelectorAll('[data-nds-placement-feedback]')].every(el => getComputedStyle(el).display === 'none'),
    real: getComputedStyle(document.querySelector(`[data-nds-shape="${id}"]`)).visibility,
  }), original.id);
  assert.equal(result.previews, true, 'SVG omits all visible preview/guide graphics');
  assert.equal(result.real, 'visible', 'SVG still shows the actual current arrow');
  await inspection.close();
  await page.bringToFront();
  await page.mouse.up();
  await beginMove(page, original.id, 21, 15);
  // Compare artwork with ordinary selection/hover controls absent in both
  // captures; those controls intentionally differ during and after a drag.
  await page.evaluate(() => {
    window.__nds_annotationStore.getState().clearShapeSelection();
    document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 }));
  });
  await settle(page);
  assert.equal(await hasFeedback(page), 1, 'PNG is captured during a live preview too');
  const png = await downloaded(page, 'Export the full diagram as PNG', true);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  if (PREVIEW) fs.writeFileSync(path.join(PREVIEW, 'placement-export.png'), png);
  await page.mouse.up(); await settle(page);
  await page.mouse.move(400, 30);
  const finalPng = await downloaded(page, 'Export the full diagram as PNG', true);
  assert.deepEqual(png, finalPng, 'PNG during preview is pixel-identical to the committed diagram export');

  for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
    await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
    await settle(page);
    assert.equal(await page.locator('#nds-arm-open').evaluate(el =>
      el.parentElement.matches('[data-nds-arm-menu]') && Boolean(el.closest('#nds-menu-file'))),
    true, lang + ': Import ARM remains in the File menu');
  }
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
  const choosing = page.waitForEvent('filechooser');
  await clickHeaderAction(page, 'Import ARM');
  await page.locator('#nds-arm-choose').click();
  const chooser = await choosing;
  assert.equal(await page.locator('#nds-arm-dialog').evaluate(el => el.open), true, 'Import ARM still opens its dialog');
  await chooser.setFiles([]);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1000, height: 900 }); await settle(page);
  assert.equal(await page.locator('#nds-arm-open').evaluate(el => el.parentElement.matches('[data-nds-arm-menu]')), true);
  await page.setViewportSize({ width: 1600, height: 1050 }); await settle(page);
  assert.equal(await page.locator('#nds-arm-open').evaluate(el => el.parentElement.matches('[data-nds-arm-menu]')), true);
  console.log('PASS JSON/SVG/PNG exports, header ordering in every language, ARM dialog and compact layout');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, locale: 'en-US', acceptDownloads: true });
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(10000);
  try {
    if (PREVIEW) fs.mkdirSync(PREVIEW, { recursive: true });
    await page.goto(pathToFileURL(path.resolve(process.env.NDS_BUNDLE || path.join(__dirname, '..', 'index.html'))).href);
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_diagramStore);
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    const cases = { palette, edits, positions, groups, boundaries, cleanup, exports: () => exportsAndHeader(page, context) };
    const chosen = process.argv.slice(2).map(value => value.replace(/^--/, ''));
    assert.ok(chosen.every(name => Object.hasOwn(cases, name)), 'unknown test group');
    for (const [name, run] of Object.entries(cases)) if (!chosen.length || chosen.includes(name)) await run(page);
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS approved placement feedback');
  } catch (error) {
    if (errors.length) console.error('Browser errors:', errors);
    if (PREVIEW) await page.screenshot({ path: path.join(PREVIEW, 'failure.png') });
    throw error;
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
