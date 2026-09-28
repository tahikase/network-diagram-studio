const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { SHAPE_TILES, RETIRED_VARIANTS } = require('./test-networking-palette.cjs');

const evidence = process.env.NDS_DATABASE_EVIDENCE;
const readShapes = page => page.evaluate(() => structuredClone(window.__nds_tabsStore.getState().activeTab().shapes));
const shapeNode = (page, id) => page.locator(`[data-nds-shape="${id}"]`);
const editor = page => page.locator('[data-nds-shape-text-input]');
const settle = page => page.waitForTimeout(150);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fixture = (shapes, edges = []) => ({
  version: 1, meta: { title: 'Database example', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes: [], edges, annotations: [], shapes, strokes: [], notes: '', comments: [], images: [],
});

function expectedPaths({ x, y, w, h }, legacy = false) {
  const r = n => Math.round(n * 100) / 100;
  const point = (u, v) => `${r(x + u * w)} ${r(y + v * h)}`;
  const top = legacy ? 0.14 : 0.16, bottom = legacy ? 0.86 : 0.84;
  const arc = `${r(w / 2)} ${r(h * top)}`;
  return [
    `M ${point(0, top)} A ${arc} 0 0 1 ${point(1, top)} L ${point(1, bottom)} A ${arc} 0 0 1 ${point(0, bottom)} Z`,
    (legacy ? [top] : [top, 0.39, 0.61]).map(level =>
      `M ${point(0, level)} A ${arc} 0 0 0 ${point(1, level)}`).join(' '),
  ];
}

async function geometry(page, shape, legacy = false) {
  const paths = shapeNode(page, shape.id).locator(':scope > path');
  assert.deepEqual(await paths.evaluateAll(elements => elements.map(el => el.getAttribute('d'))),
    expectedPaths(shape, legacy), 'Canvas uses the exact closed outline and curved, separate tier seams');
  assert.equal(await paths.nth(1).getAttribute('fill'), 'none', 'Tier details never become filled blobs');
}

async function load(page, shapes, edges) {
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
  await (await choosing).setFiles({ name: 'database-example.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture(shapes, edges))) });
  await page.waitForFunction(count => window.__nds_tabsStore.getState().activeTab().shapes.length === count, shapes.length);
  if (shapes.length) await shapeNode(page, shapes[0].id).waitFor();
  await settle(page);
}

async function screen(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const matrix = document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM();
    const point = new DOMPoint(x, y).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  }, { x, y });
}

async function drag(page, start, end) {
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  await settle(page);
}

async function undoRedo(page, before, after) {
  await page.locator('[data-nds-tool="move"]').focus();
  await page.keyboard.press('Control+z'); await settle(page);
  assert.deepEqual(await readShapes(page), before, 'The native edit is one undo step');
  await page.keyboard.press('Control+y'); await settle(page);
  assert.deepEqual(await readShapes(page), after, 'Native redo restores the complete Database shape');
}

async function pixels(page, bytes, mime) {
  return page.evaluate(async ({ data, mime }) => {
    const image = new Image(); image.src = `data:${mime};base64,${data}`; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const ink = (x, y) => {
      const i = (y * canvas.width + x) * 4;
      return rgba[i + 3] > 180 && rgba[i] > 130 && rgba[i + 2] > 140 && rgba[i + 1] < 110 &&
        rgba[i] - rgba[i + 1] > 65 && rgba[i + 2] - rgba[i + 1] > 65;
    };
    let left = canvas.width, right = -1, top = canvas.height, bottom = -1, count = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (ink(x, y)) {
      count++; left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    const bands = [], a = Math.round(left + (right - left) * 0.47), b = Math.round(left + (right - left) * 0.53);
    for (let y = top; y <= bottom; y++) {
      let found = false;
      for (let x = a; x <= b; x++) if (ink(x, y)) { found = true; break; }
      if (!found) continue;
      const last = bands.at(-1);
      if (!last || y - last.end > 2) bands.push({ start: y, end: y });
      else last.end = y;
    }
    return { width: canvas.width, height: canvas.height, left, right, top, bottom, count, bands };
  }, { data: bytes.toString('base64'), mime });
}

function assertTiers(result, label) {
  assert(result.count > 300, `${label}: Database outline is present in actual rendered pixels`);
  assert.equal(result.bands.length, 5, `${label}: top ellipse, two internal tiers and curved bottom all render`);
  for (const [i, expected] of [0, 0.32, 0.55, 0.77, 1].entries()) {
    const band = result.bands[i], actual = ((band.start + band.end) / 2 - result.top) / (result.bottom - result.top);
    assert(Math.abs(actual - expected) < 0.035, `${label}: curved tier ${i} stays at its expected height`);
  }
  assert(result.left > 0 && result.top > 0 && result.right < result.width - 1 && result.bottom < result.height - 1,
    `${label}: no Database stroke is clipped`);
}

async function verify(entry) {
  const preview = /^https?:/.test(entry), originalHash = preview ? null : digest(entry);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = [], network = [], images = {}, downloads = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-database-'));
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  let stage = 'startup';
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => {
    if (preview && route.request().url().startsWith(new URL(entry).origin + '/')) return route.continue();
    network.push(route.request().url()); return route.abort();
  });
  const save = async (button, filename) => {
    const destination = path.join(temp, filename); downloads.push(destination);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: button, exact: true }).click();
    await (await pending).saveAs(destination);
    const bytes = fs.readFileSync(destination);
    if (evidence) fs.writeFileSync(path.join(evidence, filename), bytes);
    return bytes;
  };
  try {
    await page.goto(preview ? entry : pathToFileURL(path.resolve(entry)).href);
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_favoritesStore && window.__nds_imagesUi);
    await load(page, []);
    await page.evaluate(() => {
      window.__nds_themeStore.getState().setPref('light');
      window.__nds_layoutStore.getState().expandSection('shapes');
    });
    stage = 'exact palette slot and thumbnail';
    const tiles = page.locator('[data-nds-accordion-section="shapes"] [data-nds-shape-tile]');
    assert.equal(SHAPE_TILES.length, 24); assert.equal(RETIRED_VARIANTS.length, 101);
    const inventory = await tiles.evaluateAll(elements => elements.map(el => ({
      variant: el.dataset.ndsShapeVariant, x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y),
    })));
    assert.deepEqual(inventory.map(item => item.variant), SHAPE_TILES, 'The original 23 tiles keep their order');
    assert.deepEqual(inventory.slice(-2).map(item => item.variant), ['geom-brick-wall', 'geom-database']);
    assert.equal(new Set(inventory.map(item => item.y)).size, 6);
    assert.equal(inventory[23].y, inventory[22].y); assert.equal(inventory[23].x, inventory[3].x);
    const tile = tiles.last();
    assert.equal(await tile.getAttribute('aria-label'), 'Database');
    const thumb = tile.locator('svg[viewBox="0 0 32 24"]');
    const thumbSize = { x: (32 - 18 * 150 / 160) / 2, y: 3, w: 18 * 150 / 160, h: 18 };
    assert.deepEqual(await thumb.locator('path').evaluateAll(elements => elements.map(el => el.getAttribute('d'))),
      expectedPaths(thumbSize), 'The palette previews the same upright tiered geometry as the canvas');
    await page.locator('[data-nds-shape-filter]').fill('database');
    assert.equal(await tiles.count(), 1); assert.equal(await tiles.first().getAttribute('data-nds-shape-variant'), 'geom-database');
    await page.locator('[data-nds-shape-filter]').fill('');

    stage = 'click, drag, search and Favorites';
    await tile.click(); await settle(page);
    const clicked = (await readShapes(page))[0];
    assert.equal(clicked.kind, 'rect'); assert.equal(clicked.geom, 'database');
    assert.equal(clicked.w, 150); assert.equal(clicked.h, 160);
    await geometry(page, clicked);
    await undoRedo(page, [], [clicked]);
    await load(page, []);
    await tile.dragTo(page.locator('.react-flow__pane'), { targetPosition: { x: 480, y: 340 } });
    await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().shapes.length === 1);
    const dropped = (await readShapes(page))[0];
    const appearance = ({ id, x, y, ...rest }) => rest;
    assert.deepEqual(appearance(dropped), appearance(clicked), 'Native click and drag share defaults and geometry');
    await geometry(page, dropped);
    await load(page, []);
    await tile.locator('button[aria-label*="Favorites"]').click();
    assert.deepEqual(await readShapes(page), [], 'Pinning does not place a Database');
    await page.evaluate(() => window.__nds_layoutStore.getState().expandSection('favorites'));
    await page.locator('[data-nds-accordion-section="favorites"] [data-nds-shape-variant="geom-database"]').click();
    assert.equal((await readShapes(page))[0].geom, 'database');
    await load(page, []);
    const search = page.locator('[data-nds-palette-search-all]');
    await search.fill('database');
    const hit = page.locator('[data-nds-search-hit-kind="shape"]');
    assert.equal(await hit.count(), 1); assert.equal(await hit.getAttribute('data-nds-search-hit'), 'geom-database');
    await hit.click(); assert.equal((await readShapes(page))[0].geom, 'database');
    await search.fill('');

    stage = 'native text editing and formatting';
    const sample = { ...clicked, id: 'database-example', x: 180, y: 220 };
    await load(page, [sample]);
    const center = await screen(page, sample.x + sample.w / 2, sample.y + sample.h / 2);
    await page.mouse.dblclick(center.x, center.y, { delay: 65 });
    await editor(page).waitFor();
    await editor(page).fill('Primary'); await editor(page).press('End'); await editor(page).press('Enter');
    assert.equal(await editor(page).count(), 1, 'Enter stays in the Database text editor');
    await page.keyboard.insertText('Replica');
    await page.locator('[data-nds-text-align-trigger]').click();
    await page.locator('[data-nds-text-align="left"]').click();
    await editor(page).press('Control+Enter');
    const edited = (await readShapes(page))[0];
    assert.equal(edited.text, 'Primary\nReplica'); assert.equal(edited.textAlign, 'left');
    await geometry(page, edited);

    stage = 'native move, resize and rotation';
    const start = await screen(page, edited.x + 15, edited.y + 65);
    await drag(page, start, { x: start.x + 45, y: start.y + 30 });
    const moved = (await readShapes(page))[0];
    assert(moved.x > edited.x + 20 && moved.y > edited.y + 10);
    assert.equal(moved.text, edited.text); assert.equal(moved.textAlign, 'left');
    await geometry(page, moved); await undoRedo(page, [edited], [moved]);
    const resizeBox = await page.locator('[data-nds-shape-handle="se"]').boundingBox();
    const resizeStart = { x: resizeBox.x + resizeBox.width / 2, y: resizeBox.y + resizeBox.height / 2 };
    await drag(page, resizeStart, { x: resizeStart.x + 60, y: resizeStart.y + 80 });
    const resized = (await readShapes(page))[0];
    assert(resized.w > moved.w + 25 && resized.h > moved.h + 35);
    await geometry(page, resized); await undoRedo(page, [moved], [resized]);
    const handle = await page.locator('[data-nds-shape-handle="rotate"] circle').boundingBox();
    const pivot = await screen(page, resized.x + resized.w / 2, resized.y + resized.h / 2);
    const rotateStart = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    await page.keyboard.down('Shift');
    await drag(page, rotateStart, { x: pivot.x - (rotateStart.y - pivot.y), y: pivot.y + (rotateStart.x - pivot.x) });
    await page.keyboard.up('Shift');
    const rotated = (await readShapes(page))[0];
    assert.equal(rotated.rotation, 90, 'The native rotation handle turns the Database by 90 degrees');
    assert.match(await shapeNode(page, rotated.id).getAttribute('transform'), /^rotate\(90 /);
    await geometry(page, rotated); await undoRedo(page, [resized], [rotated]);

    stage = 'Save JSON, reload and legacy cylinder';
    const saved = await save('Save JSON', 'database.json');
    assert.deepEqual(JSON.parse(saved).shapes, [rotated]);
    await load(page, []);
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await choosing).setFiles(path.join(temp, 'database.json'));
    await shapeNode(page, rotated.id).waitFor();
    assert.deepEqual(await readShapes(page), [rotated]);
    await page.waitForTimeout(1600); await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_favoritesStore);
    await shapeNode(page, rotated.id).waitFor();
    assert.deepEqual(await readShapes(page), [rotated], 'Auto-save keeps native geometry, rotation and multiline text');
    assert(await page.evaluate(() => window.__nds_favoritesStore.getState().shapes.has('geom-database')),
      'Database pin survives reload');
    const old = { ...sample, id: 'old-cylinder', geom: 'cylinder', w: 200, h: 120 };
    await load(page, [old]); await geometry(page, old, true);
    assert.deepEqual(await readShapes(page), [old], 'The older cylinder and its saved size remain untouched');

    stage = 'fill, themes and languages';
    for (const fillOpacity of [0, 0.25, 1]) {
      const filled = { ...sample, fillOpacity };
      await load(page, [filled]); await geometry(page, filled);
      assert.equal(Number(await shapeNode(page, filled.id).locator(':scope > path').first().getAttribute('fill-opacity')), fillOpacity);
    }
    await load(page, [sample]);
    const colors = [];
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
      await settle(page); await geometry(page, sample);
      colors.push(await shapeNode(page, sample.id).locator(':scope > path').first().evaluate(el => getComputedStyle(el).stroke));
      if (evidence) await page.screenshot({ path: path.join(evidence, `${theme}.png`) });
    }
    assert.notEqual(colors[0], colors[1], 'Default Database ink adapts to light and dark themes');
    for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      assert.equal(await tile.getAttribute('aria-label'), 'Database', 'Shape names follow the existing palette naming convention');
      await geometry(page, sample);
    }
    await page.evaluate(() => {
      window.__nds_i18nStore.getState().setLang('en'); window.__nds_themeStore.getState().setPref('light');
    });

    stage = 'shape connector binding';
    const peer = { ...sample, id: 'database-peer', x: sample.x + 380 };
    const edge = { id: 'database-link', source: sample.id, target: peer.id, kind: 'link',
      color: '#0078d4', sourceHandle: 's-r', targetHandle: 't-l' };
    await load(page, [sample, peer], [edge]);
    const connector = page.locator('.react-flow__edge[data-id="database-link"] .react-flow__edge-path');
    await connector.waitFor({ state: 'attached' });
    const connectorPath = await connector.getAttribute('d');
    assert(connectorPath && !/NaN|Infinity|undefined/.test(connectorPath), 'Database connects using native shape handles');

    stage = 'actual PNG, SVG and region screenshot pixels';
    const artwork = { ...sample, w: 240, h: 256, color: '#c026d3', text: '', width: 3, fillOpacity: 0 };
    await load(page, [artwork]); await geometry(page, artwork);
    const beforeExport = await readShapes(page);
    for (const [button, mime, name] of [['PNG', 'image/png', 'database.png'], ['SVG', 'image/svg+xml', 'database.svg']]) {
      const bytes = await save(button, name);
      const result = await pixels(page, bytes, mime);
      assertTiers(result, button); images[button] = result;
      assert.deepEqual(await readShapes(page), beforeExport, 'Image export does not flatten or mutate the editable Database');
    }
    const box = await shapeNode(page, artwork.id).boundingBox();
    const crop = { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 };
    await page.locator('[data-nds-screenshot]').click();
    await page.locator('[data-nds-capture-layer]').waitFor();
    await drag(page, crop, { x: crop.x + crop.width, y: crop.y + crop.height });
    await page.locator('[data-nds-shot-canvas]').waitFor();
    await page.waitForFunction(() => window.__nds_shot?.w > 0);
    const shot = await page.locator('[data-nds-shot-canvas]').evaluate(el => el.toDataURL('image/png'));
    const bytes = Buffer.from(shot.split(',')[1], 'base64');
    images.screenshot = await pixels(page, bytes, 'image/png'); assertTiers(images.screenshot, 'Region screenshot');
    if (evidence) fs.writeFileSync(path.join(evidence, 'database-screenshot.png'), bytes);
    assert.deepEqual(await readShapes(page), beforeExport, 'Region capture leaves the editable Database unchanged');

    assert.deepEqual(errors, [], 'No browser errors'); assert.deepEqual(network, [], 'No external network dependency');
    if (!preview) assert.equal(digest(entry), originalHash, 'The test does not rewrite the application');
    if (evidence) fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ entry, inventory, colors, images, errors, network }, null, 2));
    console.log('PASS Database: exact final palette slot, native placement/editing/rotation/undo, search/Favorites, persistence, legacy cylinder, themes, bindings and real export/capture pixels.');
  } catch (error) {
    console.error(`Database stage: ${stage}`);
    if (evidence) await page.screenshot({ path: path.join(evidence, 'failure.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
    for (const file of downloads) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
}

if (require.main === module) verify(process.argv[2] || path.join(__dirname, '..', 'index.html'))
  .catch(error => { console.error(error); process.exitCode = 1; });
