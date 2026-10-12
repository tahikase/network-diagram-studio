const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { SHAPE_TILES } = require('./test-networking-palette.cjs');

const entries = process.argv.slice(2);
if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
const evidence = process.env.NDS_SCREENSHOT_EVIDENCE;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const empty = {
  version: 1, meta: { title: 'Screenshot shapes', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes: [], edges: [], annotations: [], notes: '',
};

async function verify(entry, index) {
  const hash = digest(fs.readFileSync(entry));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1700, height: 1150 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [], network = [], results = [], files = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-screenshot-shapes-'));
  const settle = () => page.waitForTimeout(240);
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  async function save(button, filename) {
    const destination = path.join(temp, filename);
    files.push(destination);
    const pending = page.waitForEvent('download');
    await button.click();
    await (await pending).saveAs(destination);
    return fs.readFileSync(destination);
  }
  async function snapshot() {
    return page.evaluate(() => {
      const tab = window.__nds_tabsStore.getState().activeTab();
      return { diagram: structuredClone(window.__nds_diagramStore.getState().diagram),
        shapes: structuredClone(tab.shapes), strokes: structuredClone(tab.strokes),
        viewport: document.querySelector('.react-flow__viewport').style.transform };
    });
  }
  async function classify(png, regions, crop) {
    return page.evaluate(async ({ png, regions, crop }) => {
      const image = new Image();
      image.src = png;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const sx = canvas.width / crop.width, sy = canvas.height / crop.height;
      return regions.map(region => {
        const x = Math.max(0, Math.round((region.x - crop.x) * sx));
        const y = Math.max(0, Math.round((region.y - crop.y) * sy));
        const width = Math.min(canvas.width - x, Math.max(1, Math.round(region.width * sx)));
        const height = Math.min(canvas.height - y, Math.max(1, Math.round(region.height * sy)));
        if (width < 1 || height < 1) throw new Error('The pixel test sampled outside the captured bitmap.');
        const pixels = ctx.getImageData(x, y, width, height).data;
        let magenta = 0, green = 0, blue = 0, yellow = 0, paleInk = 0;
        const rgb = [0, 0, 0];
        for (let i = 0; i < pixels.length; i += 4) {
          const [r, g, b, a] = pixels.subarray(i, i + 4);
          if (a < 200) continue;
          if (r > 130 && b > 140 && g < 105 && r - g > 65 && b - g > 65) magenta++;
          if (g > 110 && r < 90 && b < 135 && g - r > 45) green++;
          if (b > 140 && r < 100 && b - g > 35) blue++;
          if (r > 170 && g > 100 && b < 100 && g - b > 40) yellow++;
          if (r > 200 && g > 210 && b > 220) paleInk++;
          if (region.kind === 'background') { rgb[0] += r; rgb[1] += g; rgb[2] += b; }
        }
        return { id: region.id, kind: region.kind, magenta, green, blue, yellow, paleInk,
          rgb: rgb.map(sum => sum / (width * height)), area: width * height };
      });
    }, { png, regions, crop });
  }
  function assertPixels(actual, label) {
    for (const region of actual) {
      if (region.kind === 'background') continue;
      const color = region.kind || 'magenta';
      assert(region[color] >= 30, `${label}/${region.id}: missing ${color} artwork (${JSON.stringify(region)})`);
    }
  }
  async function screenRegions(cells) {
    return page.evaluate(cells => {
      const matrix = document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM();
      return cells.map(cell => {
        const a = new DOMPoint(cell.x, cell.y).matrixTransform(matrix);
        const b = new DOMPoint(cell.x + cell.w, cell.y + cell.h).matrixTransform(matrix);
        return { id: cell.id, kind: cell.kind, x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
      });
    }, cells);
  }
  async function capture(label, cells, requested) {
    const host = await page.locator('[data-nds-fullscreen-target]').boundingBox();
    const crop = requested || { x: Math.ceil(host.x + 5), y: Math.ceil(host.y + 5),
      width: Math.floor(host.width - 10), height: Math.floor(host.height - 10) };
    const regions = await screenRegions(cells);
    for (const r of regions) assert(r.x >= crop.x && r.y >= crop.y &&
      r.x + r.width <= crop.x + crop.width && r.y + r.height <= crop.y + crop.height,
    `${label}/${r.id}: fixture artwork must be inside the selected area`);
    regions.push({ id: 'canvas-background', kind: 'background',
      x: crop.x + 2, y: crop.y + 2, width: 4, height: 4 });
    const before = await snapshot();
    const live = await page.screenshot({ clip: crop });
    const livePixels = await classify(`data:image/png;base64,${live.toString('base64')}`, regions, crop);
    assertPixels(livePixels, `${label}/live`);
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-${label}-live.png`), live);
    await page.locator('[data-nds-screenshot]').click();
    await page.locator('[data-nds-capture-layer]').waitFor();
    await page.mouse.move(crop.x, crop.y);
    await page.mouse.down();
    await page.mouse.move(crop.x + crop.width, crop.y + crop.height, { steps: 12 });
    await page.mouse.up();
    await page.locator('[data-nds-shot-canvas]').waitFor();
    await page.waitForFunction(() => window.__nds_shot?.w > 0);
    await settle();
    const png = await page.locator('[data-nds-shot-canvas]').evaluate(canvas => canvas.toDataURL('image/png'));
    const pixels = await classify(png, regions, crop);
    results.push({ label, crop, pixels });
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-${label}-captured.png`), Buffer.from(png.split(',')[1], 'base64'));
    assertPixels(pixels, label);
    assert(pixels.at(-1).rgb.every((value, i) => Math.abs(value - livePixels.at(-1).rgb[i]) < 25),
      `${label}: the captured background must preserve the on-screen theme`);
    assert.deepEqual(await snapshot(), before, 'Screenshot must not mutate diagram data, shape geometry or viewport');
    assert.equal(await page.evaluate(() => window.__nds_shot.shapes.length), 0,
      'Diagram shapes are captured in the bitmap, not confused with screenshot-editor annotations');
    const size = await page.evaluate(() => ({ w: window.__nds_shot.w, h: window.__nds_shot.h }));
    const scale = Math.min(2, 2600 / Math.max(crop.width, crop.height));
    assert(Math.abs(size.w - crop.width * scale) <= 1 && Math.abs(size.h - crop.height * scale) <= 1,
      'The selected region retains its dimensions and capture-resolution limit');
    return { png, regions, crop, size };
  }
  try {
    await page.goto(pathToFileURL(path.resolve(entry)).href);
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_imagesUi);
    await page.evaluate(value => {
      window.__nds_diagramStore.getState().loadDiagram(value, { relayout: false });
      window.__nds_layoutStore.getState().expandSection('shapes');
    }, empty);
    const cells = SHAPE_TILES.map((variant, i) => ({
      id: variant, x: 50 + (i % 6) * 185, y: 110 + Math.floor(i / 6) * 155, w: 160, h: 125,
    }));
    for (const variant of SHAPE_TILES) {
      await page.locator(`[data-nds-accordion-section="shapes"] [data-nds-shape-variant="${variant}"]`).click();
      if (variant === 'text-box') await page.locator('[data-nds-text-editor] [contenteditable="true"]').press('Escape');
    }
    const shapes = await page.evaluate(cells => {
      return window.__nds_tabsStore.getState().activeTab().shapes.map((shape, i) => {
        const cell = cells[i], x = cell.x + 10, y = cell.y + 10, w = cell.w - 20, h = cell.h - 20;
        const common = { ...shape, id: `capture-${cell.id}`, color: '#c026d3', textColor: '#c026d3',
          width: cell.id === 'text-box' ? 0 : 3, textSize: 20,
          text: cell.id === 'text-box' ? 'Shape text' : shape.kind === 'callout' ? 'Callout' : '' };
        if (shape.kind === 'arrow') return { ...common, from: { x, y: y + 35 }, to: { x: x + w, y: y + h - 35 } };
        if (shape.kind === 'ellipse') return { ...common, cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 };
        if (shape.kind === 'callout') return { ...common, x, y, w: w - 25, h: h - 25, anchor: { x: x + w, y: y + h } };
        return { ...common, x, y, w, h };
      });
    }, cells);
    const stroke = { id: 'capture-pencil', color: '#16a34a', width: 5,
      points: [{ x: 440, y: 795 }, { x: 510, y: 775 }, { x: 600, y: 800 }] };
    const diagram = { ...empty, nodes: [
      { id: 'capture-group', type: 'group-subscription', position: { x: 0, y: 0 },
        size: { w: 1200, h: 890 }, data: { name: 'Subscription', fields: {} } },
    ], edges: [
      { id: 'capture-edge', source: 'capture-rect-sharp', target: 'capture-rect-rounded',
        kind: 'link', color: '#0078d4', sourceHandle: 's-b', targetHandle: 't-t' },
    ] };
    const auxiliary = [
      { id: 'pencil', kind: 'green', x: 430, y: 765, w: 180, h: 50 },
      { id: 'subscription-icon', kind: 'yellow', x: 0, y: 0, w: 160, h: 75 },
      { id: 'shape-connector', kind: 'blue', x: 100, y: 235, w: 900, h: 30 },
    ];
    await page.evaluate(({ diagram, shapes, stroke }) => {
      const result = window.__nds_tabsStore.getState().loadStudioFile(JSON.stringify({ ...diagram, shapes, strokes: [stroke] }));
      if (!result.ok) throw new Error('The screenshot fixture did not load.');
      window.__nds_diagramStore.getState().selectNode(null);
      window.__nds_annotationStore.getState().clearShapeSelection();
    }, { diagram, shapes, stroke });
    await settle();
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForTimeout(500);
    const first = await capture('light-all-shapes', [...cells, ...auxiliary]);
    const downloaded = await save(page.locator('[data-nds-shot-savefile]'), 'screenshot.png');
    assertPixels(await classify(`data:image/png;base64,${downloaded.toString('base64')}`, first.regions, first.crop), 'Save .png');
    await page.evaluate(() => {
      const original = navigator.clipboard.write;
      window.__shotRestoreClipboard = () => { navigator.clipboard.write = original; };
      navigator.clipboard.write = async items => {
        const blob = await items[0].getType('image/png');
        window.__shotCopiedPng = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Clipboard PNG could not be read.'));
          reader.readAsDataURL(blob);
        });
      };
    });
    await page.locator('[data-nds-shot-copy]').click();
    await page.waitForFunction(() => window.__shotCopiedPng);
    const copied = await page.evaluate(() => { window.__shotRestoreClipboard(); return window.__shotCopiedPng; });
    assertPixels(await classify(copied, first.regions, first.crop), 'Copy');
    await page.locator('[data-nds-shot-caption]').fill('All diagram shapes');
    await page.locator('[data-nds-shot-insert]').click();
    await page.locator('[data-nds-shot-editor]').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().images.length === 1);
    const image = await page.evaluate(() => window.__nds_tabsStore.getState().activeTab().images[0]);
    assertPixels(await classify(image.png, first.regions, first.crop), 'Add to Notes');
    const saved = await save(page.getByRole('button', { name: 'Save JSON', exact: true }), 'with-screenshot.json');
    const parsed = JSON.parse(saved);
    assert.deepEqual(parsed.shapes, shapes);
    assert.equal(parsed.images[0].png, image.png, 'JSON carries the captured shapes in the Notes image');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await chooser).setFiles(path.join(temp, 'with-screenshot.json'));
    await settle();
    assert.equal(await page.evaluate(() => window.__nds_tabsStore.getState().activeTab().images[0].png), image.png);
    await page.waitForTimeout(1200);
    await page.reload();
    await page.waitForFunction(() => window.__nds_imageUrl?.(window.__nds_tabsStore?.getState().activeTab().images[0]?.id));
    const restored = await page.evaluate(() => window.__nds_imageUrl(window.__nds_tabsStore.getState().activeTab().images[0].id));
    assertPixels(await classify(restored, first.regions, first.crop), 'browser-restored Notes image');
    await page.evaluate(() => window.__nds_layoutStore.getState().setNotesOpen(false));
    await settle();
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__nds_themeStore.getState().setPref('dark'));
    await settle();
    await capture('dark-all-shapes', [...cells, ...auxiliary]);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'Screenshot keeps the current theme');
    await page.locator('[data-nds-shot-cancel]').click();
    await page.evaluate(() => {
      const tabs = window.__nds_tabsStore.getState();
      tabs.updateShapes(tabs.activeTab().shapes.map(shape => ({ ...shape, color: '#0f172a', textColor: '#0f172a' })));
    });
    await settle();
    await capture('dark-default-ink', cells.map(cell => ({ ...cell, kind: 'paleInk' })));
    await page.locator('[data-nds-shot-cancel]').click();
    await page.evaluate(shapes => window.__nds_tabsStore.getState().updateShapes(shapes), shapes);
    await page.evaluate(() => window.__nds_themeStore.getState().setPref('light'));
    await page.locator('.react-flow__controls-zoomout').click();
    await page.waitForTimeout(400);
    const host = await page.locator('.react-flow').boundingBox();
    await page.mouse.move(host.x + host.width * .5, host.y + host.height * .8);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(host.x + host.width * .5 + 24, host.y + host.height * .8 + 16, { steps: 10 });
    await page.mouse.up({ button: 'middle' });
    await settle();
    await capture('zoomed-panned', cells);
    await page.locator('[data-nds-shot-cancel]').click();
    const onlyShapes = await snapshot();
    await page.evaluate(diagram => window.__nds_diagramStore.getState().loadDiagram({ ...diagram, nodes: [], edges: [] }, { relayout: false }), onlyShapes.diagram);
    await settle();
    await page.evaluate(() => {
      window.__shotImageExtension = window.ndsCanvasImages;
      delete window.ndsCanvasImages;
    });
    await capture('shapes-only-without-image-extension', cells);
    await page.locator('[data-nds-shot-cancel]').click();
    await page.evaluate(() => { window.ndsCanvasImages = window.__shotImageExtension; });
    const one = cells.find(cell => cell.id === 'geom-brick-wall');
    const [roi] = await screenRegions([one]);
    const cropped = await capture('brick-wall-region', [one], {
      x: Math.floor(roi.x - 4), y: Math.floor(roi.y - 4),
      width: Math.ceil(roi.width + 8), height: Math.ceil(roi.height + 8),
    });
    assert(cropped.size.w < first.size.w / 2 && cropped.size.h < first.size.h / 2, 'A partial screenshot remains a crop, not a full-diagram export');
    await page.locator('[data-nds-shot-cancel]').click();
    await page.evaluate(() => {
      const image = document.createElement('canvas');
      image.width = 140;
      image.height = 105;
      const ctx = image.getContext('2d');
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, 0, image.width, image.height);
      window.__nds_tabsStore.getState().addShapes([{
        id: 'capture-bitmap', kind: 'rect', x: 985, y: 585, w: 140, h: 105,
        color: '#0f172a', width: 0, fillOpacity: 0, fill: 'none', corner: 'sharp',
        canvasImage: image.toDataURL('image/png'),
      }]);
    });
    await settle();
    await capture('shapes-and-canvas-image', [...cells,
      { id: 'canvas-image', kind: 'yellow', x: 975, y: 575, w: 160, h: 125 }]);
    await page.locator('[data-nds-shot-cancel]').click();
    assert.deepEqual(errors, [], 'No browser runtime errors');
    assert.deepEqual(network, [], 'Capture stays offline');
    assert.equal(digest(fs.readFileSync(entry)), hash, 'The tested bundle remains unchanged');
    console.log(`PASS ${path.basename(entry)}: all ${SHAPE_TILES.length} palette shapes in ${results.length} native screenshots; pencil, connectors, resources, theme/ink, pan/zoom, shapes-only without image extension, crop, bitmap, Save .png, Copy, Notes, JSON and browser restore`);
  } finally {
    if (evidence) fs.writeFileSync(path.join(evidence, `${index}-pixels.json`), JSON.stringify(results, null, 2));
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
    await context.close();
    await browser.close();
  }
}

(async () => {
  for (const [index, entry] of entries.entries()) await verify(entry, index);
})().catch(error => { console.error(error); process.exitCode = 1; });
