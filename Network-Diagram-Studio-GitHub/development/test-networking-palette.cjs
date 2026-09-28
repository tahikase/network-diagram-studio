// Exact approved picker inventory, creation behavior and legacy-file parity.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const NETWORK_SHAPES = [
  'rect-sharp', 'rect-rounded', 'text-box', 'rect-dashed', 'rect-filled', 'rect-rounded-filled',
  'ellipse', 'circle', 'ellipse-filled', 'callout',
  'geom-cloud', 'geom-speech', 'geom-actor', 'geom-terminator', 'geom-sequential-data',
  'geom-arrow-right', 'geom-arrow-quad', 'geom-brick-wall', 'geom-database',
];
const ARROW_STYLES = ['straight', 'elbow', 'line', 'dashed', 'double', 'curved'];
const PALETTE_ARROW_STYLES = ['straight', 'line', 'dashed', 'double', 'curved'];
const ARROW_VARIANTS = ARROW_STYLES.flatMap(style =>
  ['right', 'left', 'up', 'down'].map(direction =>
    `arrow-${style}${direction === 'right' ? '' : '-' + direction}`));
const SHAPE_TILES = [...PALETTE_ARROW_STYLES.map(style => 'arrow-' + style), ...NETWORK_SHAPES];
const PALETTE_VARIANTS = SHAPE_TILES;
const RETIRED_VARIANTS = [
  ...ARROW_VARIANTS.filter(id => !SHAPE_TILES.includes(id)),
  ...[
  'diamond', 'triangle', 'triangle-right', 'parallelogram', 'trapezoid',
  'trapezoid-flip', 'pentagon', 'hexagon', 'octagon', 'star5', 'star6',
  'cross', 'chevron', 'drop', 'shield', 'semicircle', 'quarter-circle',
  'half-round-left', 'step', 'loop-limit', 'bracket-left', 'bracket-right',
  'brace-left', 'brace-right', 's-curve', 'cone', 'pyramid', 'right-triangle',
  'plaque', 'frame', 'arc', 'corner', 'tee',
  'process', 'internal-storage', 'manual-input', 'preparation', 'delay',
  'display', 'document', 'tape', 'note', 'card', 'cube', 'cylinder', 'collate',
  'merge', 'sort', 'stored-data', 'direct-data', 'multi-document', 'paper-tape',
  'off-page', 'summing-junction', 'or-gate', 'container', 'table', 'list', 'window',
  'arrow-left', 'arrow-up', 'arrow-down', 'arrow-both',
  'arrow-corner', 'arrow-notched', 'arrow-pentagon', 'arrow-curved',
  'tab-frame', 'region-frame', 'rack-frame', 'tunnel', 'hairpin', 'dimension',
  'stack', 'layers', 'bracket-top', 'bracket-bottom', 'lightning', 'no-entry',
  'check-badge', 'warn-triangle', 'crossed-box',
].map(geom => 'geom-' + geom)];

module.exports = { NETWORK_SHAPES, SHAPE_TILES, PALETTE_VARIANTS, RETIRED_VARIANTS };

const settle = page => page.waitForTimeout(120);
const shapeTiles = page => page.locator('[data-nds-accordion-section="shapes"] [data-nds-shape-tile]');
const tileIds = locator => locator.evaluateAll(elements => elements.map(el => el.dataset.ndsShapeVariant));
const activeShapes = page => page.evaluate(() => window.__nds_tabsStore.getState().activeTab().shapes);
const textEditor = page => page.locator('[data-nds-text-editor] [contenteditable="true"]');

async function cancelTextEdit(page) {
  const editor = textEditor(page);
  await editor.waitFor();
  await editor.press('Escape');
  await editor.waitFor({ state: 'hidden' });
}

async function open(browser, entry) {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1600, height: 1050 } });
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(entry).href);
  await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_favoritesStore);
  await page.evaluate(() => {
    window.__nds_i18nStore.getState().setLang('en');
    window.__nds_themeStore.getState().setPref('light');
  });
  await settle(page);
  return { page, errors };
}

async function clearShapes(page) {
  await page.evaluate(() => {
    window.__nds_tabsStore.getState().resetActiveTabAnnotations();
    window.__nds_annotationStore.getState().clearShapeSelection();
  });
  await settle(page);
}

function appearance(shape) {
  const result = { ...shape };
  delete result.id;
  if ('x' in result) result.x = result.y = 0;
  if ('cx' in result) result.cx = result.cy = 0;
  if (shape.anchor) result.anchor = {
    x: Math.round((shape.anchor.x - shape.x) * 1e6) / 1e6,
    y: Math.round((shape.anchor.y - shape.y) * 1e6) / 1e6,
  };
  return result;
}

async function creation(page) {
  assert.deepEqual(await tileIds(shapeTiles(page)), SHAPE_TILES, 'exact 24-tile inventory and retained order');
  assert.deepEqual(await page.locator('[data-nds-accordion-header]').evaluateAll(elements =>
    elements.map(el => el.dataset.ndsAccordionHeader)), ['favorites', 'shapes', 'resources', 'imported', 'icons']);
  assert.equal(await page.locator('[data-nds-shape-count]').getAttribute('data-nds-shape-count'), '24');
  const grid = page.locator('[data-nds-shape-grid]');
  assert.equal(await grid.count(), 1, 'Shapes uses a single grid');
  assert.deepEqual(await tileIds(grid.locator(':scope > [data-nds-shape-tile]')), SHAPE_TILES);
  const rows = await shapeTiles(page).evaluateAll(elements =>
    elements.map(el => Math.round(el.getBoundingClientRect().top)));
  assert.equal(new Set(rows).size, 6, '24 tiles fill six four-column rows');
  assert.equal(rows[4], rows[7], 'rectangles and Text box follow the final line style in the second row');
  assert.equal(rows[23], rows[22], 'Database follows the brick wall in the final row');
  const columns = await shapeTiles(page).evaluateAll(elements =>
    elements.map(el => Math.round(el.getBoundingClientRect().left)));
  assert.equal(columns[23], columns[3], 'Database occupies the fourth column, not a new row');
  const shapesSection = page.locator('[data-nds-palette-shapes]');
  for (const title of ['Arrows / Lines', 'Network', 'Line/arrow direction']) {
    assert.equal(await shapesSection.getByText(title, { exact: true }).count(), 0, 'no retired ' + title + ' label');
  }
  assert.equal(await page.locator('[data-nds-arrow-direction], [data-nds-dir]').count(), 0, 'no Palette direction selector remains');
  const designs = (await tileIds(shapeTiles(page))).filter(id =>
    (id.startsWith('arrow-') && id !== 'arrow-line') || id.startsWith('geom-arrow-'));
  assert.deepEqual(designs, [
    'arrow-straight', 'arrow-dashed', 'arrow-double', 'arrow-curved',
    'geom-arrow-right', 'geom-arrow-quad',
  ], 'exactly six arrow designs, without the retired elbow or directional duplicates');
  assert.equal(await shapesSection.locator('[data-nds-shape-variant="arrow-line"]').count(), 1, 'the plain line remains');
  const filter = page.locator('[data-nds-shape-filter]');
  await filter.fill('geom-arrow');
  await settle(page);
  assert.deepEqual(await tileIds(shapeTiles(page)), NETWORK_SHAPES.filter(id => id.startsWith('geom-arrow')));
  assert.equal(await shapeTiles(page).count(), 2, 'only the single block arrow and four-way design remain');
  await filter.fill('elbow');
  await settle(page);
  assert.deepEqual(await tileIds(shapeTiles(page)), [], 'the retired elbow tile cannot reappear through filtering');
  await filter.fill('text');
  await settle(page);
  assert.deepEqual(await tileIds(shapeTiles(page)), ['text-box'], 'the restored Text box is filterable');
  await filter.fill('');
  assert.deepEqual(await tileIds(shapeTiles(page)), SHAPE_TILES);
  console.log('PASS one 24-tile grid ending in Database; six arrow designs plus the plain line; no elbow tile or direction selector');
  await page.evaluate(() => {
    document.addEventListener('dragstart', event => {
      const raw = event.dataTransfer.getData('application/x-nds-drag');
      if (raw) window.__networkingDrag = JSON.parse(raw);
    });
  });
  for (const variant of NETWORK_SHAPES) {
    await clearShapes(page);
    const tile = page.locator(`[data-nds-accordion-section="shapes"] [data-nds-shape-variant="${variant}"]`);
    await tile.click();
    if (variant === 'text-box') await cancelTextEdit(page);
    let placed = await activeShapes(page);
    assert.equal(placed.length, 1, variant + ': click places exactly one shape');
    const clicked = placed[0];
    const expectedKind = variant === 'callout' ? 'callout' :
      ['ellipse', 'circle', 'ellipse-filled'].includes(variant) ? 'ellipse' : 'rect';
    assert.equal(clicked.kind, expectedKind, variant + ': original geometry kind');
    if (variant.startsWith('geom-')) assert.equal(clicked.geom, variant.slice(5));
    await page.locator(`[data-nds-shape="${clicked.id}"]`).waitFor({ state: 'attached' });
    await clearShapes(page);
    await tile.dragTo(page.locator('.react-flow__pane'), { targetPosition: { x: 420, y: 230 } });
    await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().shapes.length === 1);
    if (variant === 'text-box') await cancelTextEdit(page);
    placed = await activeShapes(page);
    assert.deepEqual(await page.evaluate(() => window.__networkingDrag), { kind: 'shape', variant });
    assert.deepEqual(appearance(placed[0]), appearance(clicked), variant + ': drag retains click geometry and styling');
    await page.locator(`[data-nds-shape="${placed[0].id}"]`).waitFor({ state: 'attached' });
  }
  console.log('PASS exact section/tile order; all 19 non-line-style shapes click, drag and render');
}

async function restoredTextBox(page) {
  await clearShapes(page);
  const tile = page.locator('[data-nds-accordion-section="shapes"] [data-nds-shape-variant="text-box"]');
  assert.equal(await tile.getAttribute('aria-label'), 'Text box');
  assert.equal(await tile.locator('svg[width="28"] rect[stroke-dasharray="2 2"]').count(), 1,
    'the original dotted-boundary T thumbnail is retained');
  await tile.locator('button[aria-label*="Favorites"]').click();
  assert.equal((await activeShapes(page)).length, 0, 'starring the restored tile does not place text');
  await page.evaluate(() => window.__nds_layoutStore.getState().expandSection('favorites'));
  const search = page.locator('[data-nds-palette-search-all]');
  for (const source of ['shapes', 'favorites', 'search']) {
    await clearShapes(page);
    if (source === 'search') {
      await search.fill('text-box');
      await page.locator('[data-nds-search-hit-kind="shape"][data-nds-search-hit="text-box"]').click();
    } else {
      await page.locator(`[data-nds-accordion-section="${source}"] [data-nds-shape-variant="text-box"]`).click();
    }
    const editor = textEditor(page);
    await editor.waitFor();
    const [shape] = await activeShapes(page);
    assert.equal(shape.kind, 'rect');
    assert.equal(shape.width, 0, source + ': Text box stays borderless');
    assert.equal(shape.fillOpacity, 0, source + ': Text box has no background fill');
    assert.equal(shape.text, 'Text');
    const caption = 'Network note from ' + source;
    await editor.fill(caption);
    await editor.press('Control+Enter');
    await editor.waitFor({ state: 'hidden' });
    assert.equal((await activeShapes(page))[0].text, caption, source + ': placing text opens a working inline editor');
    assert.ok((await page.locator(`[data-nds-shape="${shape.id}"]`).textContent()).includes(caption));
    await page.locator('[data-nds-fullscreen]').focus();
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().shapes[0]?.text === 'Text');
    await page.keyboard.press('Control+y');
    await page.waitForFunction(caption => window.__nds_tabsStore.getState().activeTab().shapes[0]?.text === caption, caption);
  }
  await search.fill('');
  const expected = await activeShapes(page);
  const saved = await page.evaluate(() => JSON.stringify({
    ...JSON.parse(window.__nds_diagramStore.getState().toJson()),
    shapes: window.__nds_tabsStore.getState().activeTab().shapes,
  }));
  await clearShapes(page);
  const restored = await page.evaluate(raw => window.__nds_tabsStore.getState().loadStudioFile(raw), saved);
  assert.ok(restored.ok && !restored.dropped);
  assert.deepEqual(await activeShapes(page), expected, 'edited text and its original geometry survive a saved-diagram roundtrip');
  await page.evaluate(() => window.__nds_favoritesStore.getState().clearAll());
  console.log('PASS restored Text box thumbnail, Shapes/Favorites/search placement, inline editing, Undo/Redo and saved-diagram roundtrip');
}

async function search(page) {
  const input = page.locator('[data-nds-palette-search-all]');
  const shapeHits = page.locator('[data-nds-search-hit-kind="shape"]');
  const seen = new Set();
  for (const [query, expected] of [
    ['geom', NETWORK_SHAPES.filter(id => id.startsWith('geom-'))],
    ['rect', NETWORK_SHAPES.filter(id => id.startsWith('rect-'))],
    ['ellipse', ['ellipse', 'circle', 'ellipse-filled']],
    ['callout', ['callout']],
    ['text', ['text-box']],
    ...PALETTE_ARROW_STYLES.map(style => ['arrow-' + style, ['arrow-' + style]]),
  ]) {
    await input.fill(query);
    await settle(page);
    const found = await shapeHits.evaluateAll(elements => elements.map(el => el.dataset.ndsSearchHit));
    assert.deepEqual(found.sort(), [...expected].sort(), query + ': exact curated search inventory');
    assert.equal(Number(await page.locator('[data-nds-search-group-count="shape"]').textContent()),
      expected.length, query + ': total count cannot hide retired hits behind the result cap');
    found.forEach(id => seen.add(id));
  }
  assert.deepEqual([...seen].sort(), [...PALETTE_VARIANTS].sort(), 'all 24 creation presets remain searchable');
  for (const retired of RETIRED_VARIANTS.filter(id => id.startsWith('arrow-') || id.startsWith('geom-arrow-'))) {
    await input.fill(retired);
    await settle(page);
    assert.equal(await shapeHits.count(), 0, retired + ': retired choices do not reappear through search');
  }
  await input.fill('firewall');
  await settle(page);
  assert.deepEqual(await page.locator('[data-nds-search-group-count]').evaluateAll(elements =>
    elements.map(el => el.dataset.ndsSearchGroupCount)), ['shape', 'resource', 'icon']);
  await input.fill('');
  await settle(page);
  assert.deepEqual(await tileIds(shapeTiles(page)), SHAPE_TILES, 'clearing global search restores the curated grid');
  console.log('PASS search uses the same 24 unique presets; no directional duplicates or retired shapes leak through');
}

async function favorites(page) {
  const all = [...PALETTE_VARIANTS, ...RETIRED_VARIANTS];
  const iconId = (await page.locator('[data-nds-sprite] symbol').first().getAttribute('id')).slice(3);
  await page.evaluate(({ all, iconId }) => {
    const store = window.__nds_favoritesStore.getState();
    store.clearAll();
    for (const id of all) store.toggleFavorite('shape', id);
    store.toggleFavorite('resource', 'vm');
    store.toggleFavorite('icon', iconId);
    window.__nds_layoutStore.getState().expandSection('favorites');
  }, { all, iconId });
  const verify = async () => {
    await settle(page);
    const state = await page.evaluate(() => {
      const store = window.__nds_favoritesStore.getState();
      return { shapes: [...store.shapes], total: store.totalCount(),
        saved: JSON.parse(sessionStorage.getItem('nds.favorites.v1')).shapes };
    });
    assert.deepEqual(state.shapes.sort(), [...all].sort(), 'all valid legacy pins remain in memory');
    assert.deepEqual(state.saved.sort(), [...all].sort(), 'curation does not delete saved pins');
    assert.equal(state.total, 26, '24 visible shapes, one resource and one icon');
    assert.deepEqual(await tileIds(page.locator('[data-nds-accordion-section="favorites"] [data-nds-shape-tile]')),
      PALETTE_VARIANTS, 'Favorites renders only the shared curated catalogue, in order');
    const header = await page.locator('[data-nds-accordion-header="favorites"]').textContent();
    assert.equal(Number(header.match(/(\d+)\s*$/)?.[1]), 26, 'header counts only visible items');
  };
  await verify();
  await page.reload();
  await page.waitForFunction(() => window.__nds_favoritesStore);
  await verify();
  await page.locator('[data-nds-palette-collapse]').click();
  const rail = page.locator('[data-nds-palette-rail]');
  await rail.waitFor();
  assert.deepEqual(await rail.locator('button').evaluateAll(elements =>
    elements.map(el => el.title.replace(/\s+\(\d+\)$/, ''))),
    ['Show palette', 'Favorites', 'Shapes', 'Resources', 'Imported icons', 'All icons'], 'collapsed rail follows the same order');
  assert.equal(await rail.getByRole('button', { name: 'Favorites (26)', exact: true }).count(), 1);
  await rail.getByRole('button', { name: 'Shapes', exact: true }).click();
  await page.locator('[data-nds-accordion-header="shapes"]').waitFor();
  await page.evaluate(() => window.__nds_favoritesStore.getState().clearAll());
  await settle(page);
  assert.deepEqual(await page.locator('[data-nds-accordion-section="favorites"] button:not([data-nds-accordion-header])').allTextContents(),
    ['Browse Shapes', 'Browse Resources', 'Browse All icons'], 'empty-state navigation follows the section order');
  console.log('PASS Favorites list/header/rail agree; all 125 known pins survive reload without exposing retired tiles');
}

async function collectLegacyFixtures(page) {
  await page.evaluate(() => {
    window.__nds_layoutStore.getState().expandSection('shapes');
    window.__nds_tabsStore.getState().resetActiveTabAnnotations();
  });
  await settle(page);
  // Capture real production presets, including directional arrows. A generic
  // rect fixture would not prove that retired arrow geometry still works.
  const fixtures = await page.evaluate(variants => {
    return variants.map(variant => {
      const tile = document.querySelector(`[data-nds-accordion-section="shapes"] [data-nds-shape-variant="${variant}"]`);
      if (!tile) throw new Error('Missing production preset: ' + variant);
      const before = window.__nds_tabsStore.getState().activeTab().shapes.length;
      tile.click();
      const shapes = window.__nds_tabsStore.getState().activeTab().shapes;
      if (shapes.length !== before + 1) throw new Error('Production preset did not place: ' + variant);
      return JSON.parse(JSON.stringify({ ...shapes.at(-1), id: 'legacy-' + variant }));
    });
  }, [...RETIRED_VARIANTS, 'text-box']);
  await settle(page);
  await cancelTextEdit(page);
  return fixtures;
}

async function legacyRoundtrip(page, fixtures) {
  const result = await page.evaluate(shapes => {
    const diagram = JSON.parse(window.__nds_diagramStore.getState().toJson());
    return window.__nds_tabsStore.getState().loadStudioFile(JSON.stringify({
      ...diagram, nodes: [], edges: [], shapes, strokes: [],
    }));
  }, fixtures);
  assert.ok(result.ok && !result.dropped, 'all 101 retired presets and the restored Text box load without loss: ' + JSON.stringify(result));
  await settle(page);
  assert.deepEqual(await activeShapes(page), fixtures);
  const rendered = await page.evaluate(fixtures => fixtures.map(shape => {
    const root = document.querySelector(`[data-nds-shape="${shape.id}"]`);
    if (!root) throw new Error('Legacy shape did not render: ' + shape.id);
    return { id: shape.id, geom: root.getAttribute('data-nds-shape-geom'),
      paths: [...root.querySelectorAll('path')].map(el => el.getAttribute('d')),
      text: root.textContent.trim() };
  }), fixtures);
  for (const shape of rendered) {
    if (shape.id === 'legacy-text-box') assert.ok(shape.text.includes(fixtures.find(s => s.id === shape.id).text));
    else {
      assert.ok(shape.paths.length > 0, shape.id + ': geometry path exists');
      assert.ok(shape.paths.every(d => d && !/NaN|Infinity|undefined|null/i.test(d)), shape.id + ': finite path data');
    }
  }
  const saved = await page.evaluate(() => {
    const d = JSON.parse(window.__nds_diagramStore.getState().toJson());
    return JSON.stringify({ ...d, shapes: window.__nds_tabsStore.getState().activeTab().shapes });
  });
  await clearShapes(page);
  const restored = await page.evaluate(raw => window.__nds_tabsStore.getState().loadStudioFile(raw), saved);
  assert.ok(restored.ok && !restored.dropped);
  assert.deepEqual(await activeShapes(page), fixtures, 'save/load preserves every retired preset, including arrows and Text box');
  return rendered;
}

async function main() {
  assert.equal(SHAPE_TILES.length, 24);
  assert.equal(PALETTE_VARIANTS.length, 24);
  assert.equal(RETIRED_VARIANTS.length, 101);
  assert.equal(new Set([...PALETTE_VARIANTS, ...RETIRED_VARIANTS]).size, 125);
  const browser = await chromium.launch();
  try {
    const candidate = await open(browser, process.argv[2] || path.join(__dirname, '..', 'index.html'));
    await creation(candidate.page);
    await restoredTextBox(candidate.page);
    await search(candidate.page);
    await favorites(candidate.page);
    const production = await open(browser, process.argv[3] || path.join(__dirname, '..', 'index.html'));
    const fixtures = await collectLegacyFixtures(production.page);
    const expected = await legacyRoundtrip(production.page, fixtures);
    assert.deepEqual(await legacyRoundtrip(candidate.page, fixtures), expected,
      'retired shapes render exactly as production, not merely as valid rectangles');
    console.log('PASS all 101 retired presets and the restored Text box render identically to production and survive Studio file roundtrips');
    assert.deepEqual(candidate.errors, []);
    assert.deepEqual(production.errors, []);
    if (process.env.NDS_PALETTE_PREVIEW) {
      await clearShapes(candidate.page);
      await candidate.page.setViewportSize({ width: 1440, height: 1250 });
      await candidate.page.evaluate(() => {
        const layout = window.__nds_layoutStore.getState();
        for (const id of ['favorites', 'resources', 'icons']) {
          if (layout.expandedSections.has(id)) layout.toggleSection(id);
        }
        layout.expandSection('shapes');
        document.querySelector('[data-nds-palette-accordion]').scrollTo(0, 0);
      });
      await settle(candidate.page);
      await candidate.page.locator('[data-nds-palette-accordion]').locator('..')
        .screenshot({ path: process.env.NDS_PALETTE_PREVIEW });
    }
    console.log('PASS networking palette');
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
