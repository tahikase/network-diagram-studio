const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { clickHeaderAction } = require('./test-header-menu-helper.cjs');
const { SHAPE_TILES } = require('./test-networking-palette.cjs');

const editorTextOnly = process.argv.includes('--editor-text');
const editorControlsOnly = process.argv.includes('--editor-controls');
assert(!(editorTextOnly && editorControlsOnly), 'Choose one focused Screenshot test.');
const entries = process.argv.slice(2).filter(arg => arg !== '--editor-text' && arg !== '--editor-controls');
if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
const evidence = process.env.NDS_SCREENSHOT_EVIDENCE;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const empty = {
  version: 1, meta: { title: 'Screenshot shapes', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes: [], edges: [], annotations: [], notes: '',
};

function recordEditorText() {
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  const clearRect = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (...args) {
    if (this.canvas.hasAttribute('data-nds-shot-canvas')) window.__shotTextDraws = [];
    return clearRect.apply(this, args);
  };
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
    if (this.canvas.hasAttribute('data-nds-shot-canvas')) {
      const m = this.measureText(text);
      window.__shotTextDraws.push({ text, font: this.font,
        left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
        top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent });
    }
    return fillText.call(this, text, x, y, ...args);
  };
}

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
    await clickHeaderAction(page, 'Screenshot');
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
    await clickHeaderAction(page, 'Load JSON');
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

async function verifyEditorText(entry, index) {
 const hash = digest(fs.readFileSync(entry));
 const browser = await chromium.launch();
 const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: 'en-US' });
 await context.addInitScript(version => {
   localStorage.setItem('nds.lang', 'en');
   localStorage.setItem('nds.updates.seen.v1', version);
 }, require('./src/updates/release-history.json')[0].version);
 await context.addInitScript(recordEditorText);
 const page = await context.newPage();
 page.setDefaultTimeout(20000);
 const errors = [], network = [];
 page.on('pageerror', error => errors.push(error.message));
 await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
 const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-screenshot-text-'));
 const saved = path.join(temp, 'annotation.png');
 const callout = { id: 'text-containment', kind: 'callout', x: 120, y: 100, w: 340, h: 116,
   tx: 290, ty: 270, text: 'a'.repeat(80), size: 24, width: 4, color: '#ef4444' };
 async function open(shape) {
   await page.evaluate(shape => {
     const base = document.createElement('canvas');
     base.width = 840; base.height = 460;
     const ctx = base.getContext('2d');
     ctx.fillStyle = '#cbd5e1';
     ctx.fillRect(0, 0, base.width, base.height);
     window.__nds_imagesUi.getState().openEditor({
       id: 'textfixture', png: base.toDataURL('image/png'), w: base.width, h: base.height,
       caption: 'Screenshot annotation text', createdUtc: '2026-01-01T00:00:00Z', shapes: [shape],
     }, false);
   }, shape);
   await page.waitForFunction(shape => {
     const current = window.__nds_shot?.shapes[0];
     return current?.kind === shape.kind && current.text === shape.text && current.n === shape.n;
   }, shape);
   await page.waitForTimeout(100);
 }
 async function contained(label) {
   const actual = await page.evaluate(() => {
     const canvas = document.querySelector('[data-nds-shot-canvas]');
     const ctx = canvas.getContext('2d');
     const shape = window.__nds_shot.shapes[0];
     const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
     let inside = 0, outside = 0;
     for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
       const i = (y * canvas.width + x) * 4;
       if (pixels[i] < 80 && pixels[i + 1] < 90 && pixels[i + 2] < 110 && pixels[i + 3] > 200) {
         if (x > shape.x + shape.width / 2 && x < shape.x + shape.w - shape.width / 2 &&
             y > shape.y + shape.width / 2 && y < shape.y + shape.h - shape.width / 2) inside++;
         else outside++;
       }
     }
     const segment = text => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' })
       .segment(text.replace(/\s+/g, ''))].map(part => part.segment);
     return { shape, inside, outside, draws: window.__shotTextDraws,
       expected: segment(shape.text), painted: window.__shotTextDraws.flatMap(draw => segment(draw.text)),
       png: canvas.toDataURL('image/png') };
   });
   if (evidence) await page.locator('[data-nds-shot-canvas]').screenshot({
     path: path.join(evidence, `${index}-editor-${label}.png`),
   });
   assert.equal(actual.outside, 0, `${label}: text pixels must stay inside the bubble (${actual.outside} escaped)`);
   assert(actual.inside > 10, `${label}: fitting must paint visible text, not hide it`);
   assert.deepEqual(actual.painted, actual.expected, `${label}: every grapheme remains intact and painted`);
   for (const draw of actual.draws.filter(draw => draw.text)) {
     const s = actual.shape, inset = s.width / 2;
     assert(draw.left >= s.x + inset - 0.5 && draw.right <= s.x + s.w - inset + 0.5 &&
       draw.top >= s.y + inset - 0.5 && draw.bottom <= s.y + s.h - inset + 0.5,
     `${label}: complete glyph bounds must fit, not merely be clipped (${JSON.stringify(draw)})`);
   }
   return actual;
 }
 async function resize(w, h) {
   await page.locator('[data-nds-shot-tool="select"]').click();
   const canvas = page.locator('[data-nds-shot-canvas]');
   const s = await page.evaluate(() => window.__nds_shot.shapes[0]);
   const box = await canvas.boundingBox(), sx = box.width / 840, sy = box.height / 460;
   await page.mouse.click(box.x + (s.x + s.w / 2) * sx, box.y + (s.y + s.h / 2) * sy);
   await page.mouse.move(box.x + (s.x + s.w) * sx, box.y + (s.y + s.h) * sy);
   await page.mouse.down();
   await page.mouse.move(box.x + (s.x + w) * sx, box.y + (s.y + h) * sy, { steps: 8 });
   await page.mouse.up();
   await page.locator('[data-nds-shot-tool="callout"]').click();
   await page.waitForTimeout(100);
 }
 try {
   await page.goto(pathToFileURL(path.resolve(entry)).href);
   await page.waitForFunction(() => window.__nds_imagesUi && window.__nds_tabsStore && window.__nds_diagramStore);
   await page.evaluate(diagram => window.__nds_diagramStore.getState().loadDiagram(diagram, { relayout: false }), empty);
   await open({ ...callout, text: 'Short label' });
   const short = await contained('short-label');
   assert.equal(Number(short.draws[0].font.match(/([\d.]+)px/)[1]), callout.size,
     'A label that already fits retains its preferred font size');
   await page.locator('[data-nds-shot-cancel]').click();
   await open(callout);
   const original = await contained('long-word');
   assert(original.draws.length > 1, 'An unbroken identifier wraps onto multiple lines');
   await resize(140, 80);
   const small = await contained('resized-small');
   assert.equal(small.shape.size, callout.size, 'Fitting must preserve the chosen font size');
   assert(small.shape.w < 150 && small.shape.h < 90, 'The real resize handle shrinks the bubble');
   assert(parseFloat(small.draws[0].font.match(/([\d.]+)px/)[1]) <
     parseFloat(original.draws[0].font.match(/([\d.]+)px/)[1]), 'Text fits again after shrinking');
   await resize(callout.w, callout.h);
   const grown = await contained('resized-large');
   assert.equal(grown.draws[0].font, original.draws[0].font, 'Growing restores the fitted font without losing the preferred size');
   await page.locator('[data-nds-shot-undo]').click();
   await page.waitForTimeout(100);
   await contained('undo-resize');
   await page.locator('[data-nds-shot-redo]').click();
   await page.waitForTimeout(100);
   await contained('redo-resize');
   await page.locator('[data-nds-shot-cancel]').click();
   await open({ ...callout, text: 'First line\n\n接続先の確認'.repeat(5) +
     '\nhttps://example.invalid/very-long-identifier-without-breaks\n👨‍👩‍👧‍👦'.repeat(4) + ' e\u0301'.repeat(8),
   w: 300, h: 160, size: 56 });
   await contained('unicode-paragraphs');
   await page.locator('[data-nds-shot-canvas]').dblclick({ position: { x: 250, y: 160 } });
   const input = page.locator('[data-nds-shot-text]');
   await input.fill('Edited identifier ' + 'Z'.repeat(100) + '\nSecond paragraph');
   await input.press('Enter');
   await page.waitForTimeout(100);
   await page.locator('[data-nds-shot-tool="callout"]').click();
   const edited = await contained('edited-large-font');
   assert.equal(edited.shape.size, 56, 'Editing does not overwrite the selected font size');
   const pending = page.waitForEvent('download');
   await page.locator('[data-nds-shot-savefile]').click();
   await (await pending).saveAs(saved);
   const png = `data:image/png;base64,${fs.readFileSync(saved).toString('base64')}`;
   assert.equal(png, edited.png, 'Save .png paints exactly the contained preview without selection handles');
   if (evidence) fs.copyFileSync(saved, path.join(evidence, `${index}-editor-export.png`));
   await page.evaluate(() => {
     Object.defineProperty(navigator.clipboard, 'write', { configurable: true, value: async items => {
       const blob = await items[0].getType('image/png');
       window.__copiedShot = await new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve(reader.result);
         reader.onerror = () => reject(reader.error);
         reader.readAsDataURL(blob);
       });
     } });
   });
   await page.locator('[data-nds-shot-copy]').click();
   await page.waitForFunction(() => window.__copiedShot);
   assert.equal(await page.evaluate(() => window.__copiedShot), png, 'Copy uses the identical contained layout');
   await page.locator('[data-nds-shot-insert]').click();
   await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().images.some(image => image.id === 'textfixture'));
   const stored = await page.evaluate(() => {
     const image = window.__nds_tabsStore.getState().activeTab().images.find(image => image.id === 'textfixture');
     return { shape: image.shapes[0], png: window.__nds_imageUrl(image.id) };
   });
   assert.deepEqual(stored.shape, edited.shape, 'Notes preserve the full editable text, dimensions and chosen font size');
   assert.equal(stored.png, png, 'Notes use the identical contained PNG');
   await page.waitForTimeout(1200);
   await page.reload();
   await page.waitForFunction(() => window.__nds_tabsStore?.getState().activeTab()?.images.some(image => image.id === 'textfixture'));
   await page.evaluate(() => {
     const image = window.__nds_tabsStore.getState().activeTab().images.find(image => image.id === 'textfixture');
     window.__nds_imagesUi.getState().openEditor(image, true);
   });
   await page.waitForFunction(() => window.__nds_shot?.shapes.length);
   await page.waitForTimeout(100);
   const restored = await contained('restored-notes');
   assert.deepEqual(restored.shape, edited.shape, 'Browser recovery retains all editable annotation data');
   assert.equal(restored.png, png, 'Reopening a stored annotation reproduces the same fitted output');
   await page.locator('[data-nds-shot-cancel]').click();
   await open({ id: 'counter-containment', kind: 'counter', x: 420, y: 230, size: 24, n: 123456, color: '#ef4444' });
   const counter = await page.evaluate(() => ({ shape: window.__nds_shot.shapes[0], draws: window.__shotTextDraws }));
   assert.equal(counter.draws.length, 1, 'A step number remains a single line');
   assert.equal(counter.draws[0].text, '123456', 'The complete step number remains visible');
   const radius = counter.shape.size * 0.75;
   const innerRadius = radius - Math.max(2, radius * 0.12) / 2;
   for (const x of [counter.draws[0].left, counter.draws[0].right]) {
     for (const y of [counter.draws[0].top, counter.draws[0].bottom]) {
       assert(Math.hypot(x - counter.shape.x, y - counter.shape.y) <= innerRadius,
         'Every corner of the step-number glyph bounds stays inside its circle');
     }
   }
   assert.deepEqual(errors, [], 'No screenshot text runtime errors');
   assert.deepEqual(network, [], 'Screenshot annotation fitting stays offline');
   assert.equal(digest(fs.readFileSync(entry)), hash, 'The tested bundle remains unchanged');
   console.log(`PASS ${path.basename(entry)}: Screenshot text containment; short labels, long identifiers, multiline/Unicode graphemes, resize/grow, Undo/Redo, edit, identical Save .png/Copy/Notes, browser recovery and step numbers`);
 } finally {
   if (fs.existsSync(saved)) fs.unlinkSync(saved);
   fs.rmdirSync(temp);
   await context.close();
   await browser.close();
 }
}

async function verifyEditorControls(entry, index) {
  const local = /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/.test(entry);
  const origin = local ? new URL(entry).origin : null;
  const hash = local ? null : digest(fs.readFileSync(entry));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(version => {
    if (!localStorage.getItem('nds.lang')) localStorage.setItem('nds.lang', 'en');
    localStorage.setItem('nds.updates.seen.v1', version);
  }, require('./src/updates/release-history.json')[0].version);
  await context.addInitScript(recordEditorText);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [], network = [], downloads = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-screenshot-controls-'));
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => {
    if (origin && new URL(route.request().url()).origin === origin) return route.continue();
    network.push(route.request().url()); return route.abort();
  });
  const settle = () => page.waitForTimeout(100);
  const canvas = page.locator('[data-nds-shot-canvas]');
  const editor = page.locator('[data-nds-shot-editor]');
  const font = page.locator('[data-nds-shot-text-size]');
  const input = page.locator('[data-nds-shot-text]');
  const callout = { id: 'font-callout', kind: 'callout', x: 110, y: 70, w: 340, h: 116,
    tx: 330, ty: 250, text: 'Check the route', size: 24, width: 4, color: '#dc2626' };
  const text = { id: 'font-text', kind: 'text', x: 600, y: 80, text: 'VM', size: 24, color: '#dc2626' };
  const counter = { id: 'font-counter', kind: 'counter', x: 650, y: 280, size: 24, n: 1, color: '#dc2626' };
  async function shapes() { return page.evaluate(() => structuredClone(window.__nds_shot.shapes)); }
  async function png() { return canvas.evaluate(element => element.toDataURL('image/png')); }
  async function open(annotations = [callout, text, counter], w = 900, h = 500) {
    await page.evaluate(({ annotations, w, h }) => {
      const base = document.createElement('canvas');
      base.width = w; base.height = h;
      const ctx = base.getContext('2d');
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#cbd5e1';
      for (let x = 0; x < w; x += 7) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      window.__nds_imagesUi.getState().openEditor({
        id: 'editorcontrols', caption: 'Screenshot controls', png: base.toDataURL('image/png'),
        w, h, shapes: annotations,
      }, false);
    }, { annotations, w, h });
    await page.waitForFunction(({ w, h, count }) =>
      window.__nds_shot?.w === w && window.__nds_shot.h === h && window.__nds_shot.shapes.length === count,
    { w, h, count: annotations.length });
    await settle();
  }
  async function point(x, y) {
    const bounds = await canvas.boundingBox();
    const dimensions = await page.evaluate(() => ({ w: window.__nds_shot.w, h: window.__nds_shot.h }));
    return { x: bounds.x + x * bounds.width / dimensions.w, y: bounds.y + y * bounds.height / dimensions.h };
  }
  async function clickPoint(x, y) {
    const p = await point(x, y); await page.mouse.click(p.x, p.y); await settle();
  }
  async function drag(tool, x, y, dx, dy, shift = false) {
    await page.locator(`[data-nds-shot-tool="${tool}"]`).click();
    const a = await point(x, y), b = await point(x + dx, y + dy);
    if (shift) await page.keyboard.down('Shift');
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
    if (shift) await page.keyboard.up('Shift');
    await settle();
  }
  async function select(id) {
    await page.locator('[data-nds-shot-tool="select"]').click();
    const shape = (await shapes()).find(shape => shape.id === id);
    assert(shape, `Fixture contains ${id}`);
    await clickPoint(shape.x + (shape.w ?? 0) / 2 + (shape.kind === 'text' ? 5 : 0),
      shape.y + (shape.h ?? 0) / 2 + (shape.kind === 'text' ? 5 : 0));
    assert.equal(await page.evaluate(() => window.__nds_shot.selected), id);
  }
  async function textSize(value) {
    await font.fill(String(value)); await font.press('Enter'); await settle();
  }
  async function save(action, name) {
    const destination = path.join(temp, name);
    downloads.push(destination);
    const download = page.waitForEvent('download');
    await action();
    await (await download).saveAs(destination);
    return fs.readFileSync(destination);
  }
  async function mainState() {
    return page.evaluate(() => {
      const diagram = window.__nds_diagramStore.getState(), tabs = window.__nds_tabsStore.getState();
      return { diagram: structuredClone(diagram.diagram), selected: diagram.selectedNodeIds.slice(),
        history: [diagram.history.past.length, diagram.history.future.length], shapes: structuredClone(tabs.activeTab().shapes),
        tool: window.__nds_annotationStore.getState().tool, viewport: document.querySelector('.react-flow__viewport').style.transform };
    });
  }
  async function closeClean() {
    const prompts = [];
    const handler = dialog => { prompts.push(dialog.message()); return dialog.dismiss(); };
    page.on('dialog', handler);
    await page.locator('[data-nds-shot-cancel]').click();
    page.off('dialog', handler);
    assert.deepEqual(prompts, [], 'View/selection-only changes do not prompt to discard');
    await editor.waitFor({ state: 'hidden' });
  }
  async function discard() {
    const prompt = page.waitForEvent('dialog');
    const click = page.locator('[data-nds-shot-cancel]').click();
    const dialog = await prompt;
    assert.equal(dialog.type(), 'confirm');
    await dialog.accept(); await click;
    await editor.waitFor({ state: 'hidden' });
  }
  try {
    await page.goto(local ? entry : pathToFileURL(path.resolve(entry)).href);
    await page.waitForFunction(() => window.__nds_imagesUi && window.__nds_tabsStore && window.__nds_diagramStore);
    await page.evaluate(diagram => {
      const state = window.__nds_diagramStore.getState();
      state.loadDiagram({ ...diagram, nodes: [{
        id: 'behind-editor', type: 'group-subscription', position: { x: 70, y: 70 }, size: { w: 300, h: 200 },
        data: { name: 'Underlying diagram', fields: {} },
      }] }, { relayout: false });
      state.selectNode('behind-editor');
      state.updateNodeName('behind-editor', 'Keep this diagram unchanged');
    }, empty);
    await settle();
    await open();
    const main = await mainState();
    assert.equal(await font.isEnabled(), false);
    await select(callout.id);
    await textSize(32.5);
    assert.deepEqual((await shapes())[0], { ...callout, fontSize: 32.5 }, 'Font-only edits preserve bubble, pointer, stroke and base preset');
    await page.locator('[data-nds-shot-text-larger]').click();
    assert.equal((await shapes())[0].fontSize, 33.5);
    await page.locator('[data-nds-shot-text-smaller]').click();
    assert.equal((await shapes())[0].fontSize, 32.5);
    for (const invalid of ['', '7', '513']) {
      await font.fill(invalid); await font.press('Enter');
      assert.equal(await font.getAttribute('aria-invalid'), 'true');
      assert.deepEqual((await shapes())[0], { ...callout, fontSize: 32.5 }, 'Invalid input does not change annotations');
    }
    let badDownloads = 0;
    const badDownload = () => badDownloads++;
    page.on('download', badDownload);
    await page.locator('[data-nds-shot-savefile]').click(); await settle();
    page.off('download', badDownload);
    assert.equal(badDownloads, 0, 'Invalid text size blocks export with visible feedback');
    assert.match(await page.locator('#nds-shot-font-hint').innerText(), /8.*512/);
    await font.press('Escape'); await settle();
    assert.equal(await font.getAttribute('aria-invalid'), 'false');
    await canvas.focus(); await page.keyboard.press('Control+z'); await settle();
    assert.equal((await shapes())[0].fontSize, 33.5, 'Invalid input and Escape add no Undo frames');
    await page.keyboard.press('Control+Shift+z'); await settle();
    assert.equal((await shapes())[0].fontSize, 32.5);
    await select(callout.id);
    await page.locator('[data-nds-shot-size="md"]').click();
    assert.deepEqual((await shapes())[0], { ...callout, size: 36, width: 8 }, 'S/M/L removes the independent font override');
    await page.locator('[data-nds-shot-size="sm"]').click();
    await textSize(32.5);
    await canvas.focus();
    await page.keyboard.press('Control+d'); await settle();
    const duplicated = (await shapes()).at(-1);
    const duplicateId = duplicated.id;
    assert.notEqual(duplicateId, callout.id);
    assert.deepEqual(duplicated, { ...callout, id: duplicateId, x: callout.x + 12, y: callout.y + 12,
      tx: callout.tx + 12, ty: callout.ty + 12, fontSize: 32.5 });
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown'); await settle();
    const nudged = (await shapes()).at(-1);
    assert.equal(nudged.x, duplicated.x + 1); assert.equal(nudged.y, duplicated.y + 10);
    assert.equal(nudged.tx, duplicated.tx + 1); assert.equal(nudged.ty, duplicated.ty + 10);
    await page.keyboard.press('Delete'); await settle();
    assert.equal((await shapes()).length, 3);
    await page.keyboard.press('Control+z'); await settle();
    assert.deepEqual((await shapes()).at(-1), nudged);
    await page.keyboard.press('Control+y'); await settle();
    assert.equal((await shapes()).length, 3);
    await page.keyboard.press('p');
    assert.deepEqual(await mainState(), main, 'Screenshot duplicate/nudge/Delete/Undo/Redo never affect the selected underlying resource');

    await select(callout.id);
    const beforeMove = await shapes(), a = await point(280, 130);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(a.x + 35, a.y + 25, { steps: 5 });
    assert.notDeepEqual(await shapes(), beforeMove);
    await canvas.dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true, pointerType: 'mouse' });
    await page.mouse.up(); await settle();
    assert.deepEqual(await shapes(), beforeMove, 'Cancelled pointer gestures restore the pre-drag annotation');
    await select(text.id); await textSize(41.75);
    assert.deepEqual((await shapes())[1], { ...text, fontSize: 41.75 });
    await page.locator('[data-nds-shot-color="blue"]').click();
    assert.equal((await shapes())[1].color, '#0078d4');
    await select(counter.id); await textSize(512);
    assert.deepEqual((await shapes())[2], { ...counter, fontSize: 512 }, 'Font-only step changes preserve its circle');
    const glyph = await page.evaluate(() => window.__shotTextDraws.find(draw => draw.text === '1'));
    const r = counter.size * 0.75, inner = r - Math.max(2, r * .12) / 2;
    for (const x of [glyph.left, glyph.right]) for (const y of [glyph.top, glyph.bottom]) {
      assert(Math.hypot(x - counter.x, y - counter.y) <= inner, 'Even a 512px preferred step label stays inside its unchanged circle');
    }

    await drag('callout', 80, 330, 320, 120);
    const draft = 'Draft annotation ' + 'Z'.repeat(450);
    await input.fill(draft);
    await textSize(48.5);
    assert.equal(await input.isVisible(), true, 'Applying a draft font does not finish the text edit');
    assert.equal((await shapes()).length, 3);
    await page.locator('[data-nds-shot-text-larger]').click();
    assert.equal(await input.evaluate(element => element === document.activeElement), true);
    await page.locator('[data-nds-shot-text-smaller]').click();
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true, bubbles: true });
    assert.equal(await input.isVisible(), true, 'IME Enter does not commit the annotation');
    await input.press('Shift+Enter');
    assert.equal(await input.inputValue(), `${draft}\n`);
    await font.fill('49.25');
    await page.locator('[data-nds-shot-caption]').focus(); await settle();
    const committed = (await shapes()).at(-1);
    assert.equal(committed.text, draft); assert.equal(committed.fontSize, 49.25,
      'Leaving the numeric row applies its pending value to the same committed draft');
    assert.equal(committed.size, 24); assert.equal(committed.width, 4);
    assert.equal(committed.w, 320); assert.equal(committed.h, 120);
    const draftGlyphs = await page.evaluate(() => window.__shotTextDraws.filter(draw => draw.top >= 330 && draw.left < 400));
    assert.equal(draftGlyphs.map(draw => draw.text).join('').replace(/\s/g, ''), draft.replace(/\s/g, ''),
      'Long draft text is fully painted, not lost at the old 400-character limit');
    for (const glyph of draftGlyphs) {
      assert(glyph.left >= 82 && glyph.right <= 398 && glyph.top >= 332 && glyph.bottom <= 448,
        'The preferred font override continues to fit all text inside the callout');
    }
    await canvas.focus(); await page.keyboard.press('Control+z'); await settle();
    assert.equal((await shapes()).length, 3, 'Draft text/font changes are one Undo step');
    await page.keyboard.press('Control+y'); await settle();
    assert.deepEqual((await shapes()).at(-1), committed);
    await page.locator('[data-nds-shot-tool="text"]').click();
    await clickPoint(240, 390);
    assert.equal(await input.inputValue(), draft, 'The Text tool re-edits a label with one click');
    await input.fill('Do not save this edit'); await input.press('Escape'); await settle();
    assert.deepEqual((await shapes()).at(-1), committed, 'Escape discards only the active text draft');
    await clickPoint(240, 390);
    await input.fill(`Re-edited ${draft}`); await input.press('Enter'); await settle();
    assert.deepEqual((await shapes()).at(-1), { ...committed, text: `Re-edited ${draft}` }, 'Re-editing preserves the actual style, not the current preset');

    const edited = await shapes();
    await page.locator('[data-nds-shot-tool="arrow"]').click(); await settle();
    const preview = await png();
    await canvas.focus();
    const savedPng = await save(() => page.keyboard.press('Control+s'), 'controls.png');
    assert.equal(`data:image/png;base64,${savedPng.toString('base64')}`, preview, 'PNG output exactly matches the preview without handles');
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, 'write', { configurable: true, value: async items => {
        const blob = await items[0].getType('image/png');
        window.__controlsCopied = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      } });
    });
    await page.keyboard.press('Control+c');
    await page.waitForFunction(() => window.__controlsCopied);
    assert.equal(await page.evaluate(() => window.__controlsCopied), preview, 'Copy uses the same font overrides and contained layout');
    assert.deepEqual(await mainState(), main, 'Screenshot Copy/Save do not mutate diagram or selection');
    await page.locator('[data-nds-shot-insert]').click();
    await editor.waitFor({ state: 'hidden' });
    const stored = await page.evaluate(() => {
      const image = window.__nds_tabsStore.getState().activeTab().images.find(image => image.id === 'editorcontrols');
      return { shapes: image.shapes, png: window.__nds_imageUrl(image.id) };
    });
    assert.deepEqual(stored.shapes, edited); assert.equal(stored.png, preview);
    const json = await save(() => page.getByRole('button', { name: 'Save JSON', exact: true }).click(), 'controls.json');
    assert.deepEqual(JSON.parse(json).images[0].shapes, edited, 'JSON keeps all independent fonts and text longer than 400 characters');
    const chooser = page.waitForEvent('filechooser');
    await clickHeaderAction(page, 'Load JSON'); await (await chooser).setFiles(path.join(temp, 'controls.json'));
    await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().images.some(image => image.id === 'editorcontrols'));
    assert.deepEqual(await page.evaluate(() => window.__nds_tabsStore.getState().activeTab().images[0].shapes), edited,
      'JSON validation retains the new optional metadata');
    await page.waitForTimeout(1200); await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore?.getState().activeTab()?.images.some(image => image.id === 'editorcontrols'));
    await page.evaluate(() => {
      const image = window.__nds_tabsStore.getState().activeTab().images.find(image => image.id === 'editorcontrols');
      window.__nds_imagesUi.getState().openEditor(image, true);
    });
    await canvas.waitFor(); await settle();
    assert.deepEqual(await shapes(), edited, 'Browser recovery preserves fonts and full editable text');
    assert.equal(await png(), preview, 'Reopening reproduces the same flattened output');
    await closeClean();
    await open([{ ...callout, fontSize: 31.125 }]);
    await select(callout.id); await font.focus(); await canvas.focus();
    assert.equal((await shapes())[0].fontSize, 31.125, 'Merely visiting a rounded numeric display never rounds saved metadata');
    await closeClean();
    await open([callout]);
    await page.locator('[data-nds-shot-tool="text"]').click(); await clickPoint(280, 130);
    await textSize(24); await input.press('Enter'); await settle();
    assert.deepEqual((await shapes())[0], callout, 'Unchanged draft text size does not create a redundant override');
    assert.equal(await page.locator('[data-nds-shot-undo]').isEnabled(), false, 'A no-op text edit has no Undo frame');
    await closeClean();
    await open([{ ...callout, size: 6, text: 'Legacy small text' }]);
    await page.locator('[data-nds-shot-tool="text"]').click(); await clickPoint(280, 130);
    await input.fill('Legacy text still edits'); await font.focus();
    await page.locator('[data-nds-shot-caption]').focus(); await settle();
    assert.deepEqual((await shapes())[0], { ...callout, size: 6, text: 'Legacy text still edits' },
      'Visiting Text size does not reject or silently change a valid legacy base size');
    await select(callout.id); await page.locator('[data-nds-shot-text-larger]').click();
    assert.equal((await shapes())[0].fontSize, 8, 'A+ enters the supported override range from a smaller legacy size');
    await discard();

    await open([callout], 1600, 1000);
    const unchanged = await shapes();
    const fittedWidth = (await canvas.boundingBox()).width;
    assert(fittedWidth < 1600);
    await canvas.focus(); await page.keyboard.press('Control+1'); await settle();
    assert.equal((await canvas.boundingBox()).width, 1600);
    await page.keyboard.press('+'); await settle();
    const zoomed = (await canvas.boundingBox()).width;
    assert(zoomed > 1600);
    const view = page.locator('[data-nds-shot-viewport]'), v = await view.boundingBox();
    await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
    await page.keyboard.down('Control'); await page.mouse.wheel(0, -100); await page.keyboard.up('Control'); await settle();
    assert((await canvas.boundingBox()).width > zoomed);
    const beforePan = await view.evaluate(element => element.scrollLeft);
    await canvas.focus(); await page.keyboard.down('Space');
    await page.mouse.down(); await page.mouse.move(v.x + v.width / 2 - 60, v.y + v.height / 2 - 35, { steps: 8 });
    await page.mouse.up(); await page.keyboard.up('Space'); await settle();
    assert((await view.evaluate(element => element.scrollLeft)) > beforePan, 'Space-drag pans the zoomed image');
    await page.keyboard.press('Control+0'); await settle();
    assert(Math.abs((await canvas.boundingBox()).width - fittedWidth) < 1);
    assert.deepEqual(await shapes(), unchanged, 'View controls never rewrite annotations');
    await closeClean();

    await open([]);
    await drag('arrow', 40, 40, 110, 70, true);
    await drag('rect', 220, 40, 60, 40, true);
    await drag('ellipse', 380, 40, 80, 50, true);
    await drag('highlight', 560, 40, 130, 80);
    const drawn = await shapes();
    assert.equal(drawn.length, 4);
    assert(Math.abs((drawn[0].x2 - drawn[0].x1) - (drawn[0].y2 - drawn[0].y1)) < 1);
    assert.equal(drawn[1].w, drawn[1].h); assert.equal(drawn[2].w, drawn[2].h);
    assert.equal(drawn[3].color, '#fde047');
    const beforeBlur = await png();
    await drag('blur', 40, 240, 170, 140);
    assert.deepEqual(await shapes(), drawn); assert.notEqual(await png(), beforeBlur);
    const blurred = await png();
    await canvas.focus(); await page.keyboard.press('Control+z'); await settle();
    assert.equal(await png(), beforeBlur);
    await page.keyboard.press('Control+y'); await settle(); assert.equal(await png(), blurred);
    await drag('crop', 30, 30, 700, 420);
    assert.deepEqual(await page.evaluate(() => [window.__nds_shot.w, window.__nds_shot.h]), [700, 420]);
    await page.keyboard.press('Control+z'); await settle();
    assert.deepEqual(await page.evaluate(() => [window.__nds_shot.w, window.__nds_shot.h]), [900, 500]);
    assert.equal(await png(), blurred);
    const rejected = page.waitForEvent('dialog');
    const cancel = page.locator('[data-nds-shot-cancel]').click();
    const warning = await rejected; assert.match(warning.message(), /Discard unsaved/);
    await warning.dismiss(); await cancel;
    assert.equal(await editor.isVisible(), true, 'Rejecting discard leaves edits open');
    assert.deepEqual(await shapes(), drawn);
    await discard();

    for (const [language, width, theme] of [['en', 1500, 'light'], ['ja', 390, 'dark'], ['de', 390, 'light']]) {
      await page.evaluate(language => localStorage.setItem('nds.lang', language), language);
      await page.reload(); await page.waitForFunction(() => window.__nds_imagesUi && window.__nds_themeStore);
      await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
      await page.setViewportSize({ width, height: 900 });
      await open([{ ...callout, fontSize: 32.5 }]); await select(callout.id);
      const bounds = await editor.boundingBox();
      assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width);
      for (const control of ['savefile', 'copy', 'insert', 'cancel']) {
        const box = await page.locator(`[data-nds-shot-${control}]`).boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= 900,
          `${language}: output controls remain within the viewport`);
      }
      if (language !== 'en') {
        assert.notEqual(await page.locator('.nds-shot-text-options label').innerText(), 'Text size');
        assert.notEqual(await page.locator('[data-nds-shot-tool="callout"]').getAttribute('aria-label'), 'Callout');
      }
      if (evidence) await page.screenshot({ path: path.join(evidence, `${index}-controls-${language}-${theme}-${width}.png`) });
      await closeClean();
    }
    assert.deepEqual(errors, [], 'No Screenshot controls runtime errors');
    assert.deepEqual(network, [], 'The editor never requests remote content');
    if (!local) assert.equal(digest(fs.readFileSync(entry)), hash, 'The tested bundle remains unchanged');
    console.log(`PASS ${local ? 'development preview' : path.basename(entry)}: Screenshot controls; font-only geometry, numeric limits/precision, draft/IME/editing, presets, contained steps, duplicate/nudge, keyboard isolation, pointer cancellation, exact PNG/Copy/Notes, JSON/recovery, Fit/100%/zoom/pan, draw/blur/crop/Undo, discard protection and responsive localized themes`);
  } finally {
    for (const file of downloads) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
    await context.close(); await browser.close();
  }
}

(async () => {
 for (const [index, entry] of entries.entries()) {
   if (!editorTextOnly && !editorControlsOnly) await verify(entry, index);
   if (!editorControlsOnly) await verifyEditorText(entry, index);
   if (!editorTextOnly) await verifyEditorControls(entry, index);
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
