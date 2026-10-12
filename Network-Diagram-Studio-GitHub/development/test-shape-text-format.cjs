const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { SHAPE_TILES, RETIRED_VARIANTS } = require('./test-networking-palette.cjs');

const FIELDS = ['textAlign', 'textIndent', 'textSpaceBefore', 'textSpaceAfter', 'textLineHeight'];
const TEXT_SIZES = [10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 96, 128];
const LARGE_TEXT_SIZES = [48, 56, 64, 72, 96, 128];
const evidence = process.env.NDS_SHAPE_TEXT_EVIDENCE;
const editor = page => page.locator('[data-nds-shape-text-input]');
const shapeNode = (page, id) => page.locator(`[data-nds-shape="${id}"]`);
const readShapes = page => page.evaluate(() => structuredClone(window.__nds_tabsStore.getState().activeTab().shapes));
const history = page => page.evaluate(() => window.__nds_tabsStore.getState().undoStack.length);
const settle = page => page.waitForTimeout(120);
const camera = page => page.locator('.react-flow__viewport').getAttribute('style');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const styles = shape => Object.fromEntries(FIELDS.map(key => [key, shape[key]]));
const formatted = { textAlign: 'left', textIndent: 1, textSpaceBefore: 4, textSpaceAfter: 8, textLineHeight: 1.5 };

function fixture(shapes, nodes = []) {
  return {
    version: 1, meta: { title: 'Shape text example', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
    nodes, edges: [], annotations: [], shapes, strokes: [], notes: '', comments: [], images: [],
  };
}

function placed(template, id) {
  const common = { ...template, id, color: '#0f172a', textColor: '#0f172a', textSize: 24,
    textBold: false, text: 'Alpha\nBeta\nGamma', rotation: 0 };
  if (template.kind === 'arrow') return { ...common, from: { x: 100, y: 360 }, to: { x: 720, y: 360 } };
  if (template.kind === 'ellipse') return { ...common, cx: 390, cy: 370, rx: 310, ry: 220 };
  if (template.kind === 'callout') return { ...common, x: 80, y: 190, w: 620, h: 360, anchor: { x: 60, y: 600 } };
  return { ...common, x: 80, y: 190, w: 620, h: 360 };
}

async function load(page, shapes, nodes = []) {
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
  await (await choosing).setFiles({ name: 'shape-text-example.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture(shapes, nodes))) });
  await page.waitForFunction(id => window.__nds_tabsStore.getState().activeTab().shapes[0]?.id === id, shapes[0].id);
  await shapeNode(page, shapes[0].id).waitFor();
  await settle(page);
}

async function open(page, id) {
  const label = shapeNode(page, id).locator('[data-nds-shape-label]');
  const point = await label.evaluate(el => {
    const paragraph = [...el.querySelectorAll('[data-nds-shape-paragraph]')].find(p => p.textContent.trim());
    if (!paragraph) throw new Error('The test requires a nonempty visible paragraph.');
    const range = document.createRange(); range.selectNodeContents(paragraph);
    const box = range.getBoundingClientRect();
    return { x: box.x + Math.min(12, box.width / 3), y: box.y + box.height / 2 };
  });
  await page.mouse.dblclick(point.x, point.y, { delay: 65 });
  await editor(page).waitFor();
  assert(await editor(page).evaluate(el => document.activeElement === el), `${id}: text receives focus`);
  assert.equal(await label.count(), 0, 'The passive label is hidden while its live editor is visible');
  return editor(page);
}

async function align(page, value) {
  await page.locator('[data-nds-text-align-trigger]').click();
  await page.locator(`[data-nds-text-align="${value}"]`).click();
}

async function spacing(page, before = '4', after = '8', lineHeight = '1.5') {
  await page.locator('[data-nds-text-align-trigger]').click();
  await page.locator('[data-nds-text-paragraph-open]').click();
  await page.locator('[data-nds-paragraph-before]').fill(before);
  await page.locator('[data-nds-paragraph-after]').fill(after);
  await page.locator('[data-nds-paragraph-line-height]').selectOption(lineHeight);
  await page.locator('[data-nds-paragraph-apply]').click();
}

async function metrics(locator) {
  return locator.evaluate(el => {
    const css = getComputedStyle(el);
    const matrix = el.closest('foreignObject').getScreenCTM();
    const paragraphs = [...el.querySelectorAll('[data-nds-shape-paragraph]')].map(paragraph => {
      const box = paragraph.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const ink = range.getBoundingClientRect();
      return { text: paragraph.textContent, x: ink.x, right: ink.right, y: box.y, height: box.height,
        align: getComputedStyle(paragraph).textAlign, color: getComputedStyle(paragraph).color };
    });
    return { scale: Math.hypot(matrix.a, matrix.b), size: parseFloat(css.fontSize), lineHeight: parseFloat(css.lineHeight), align: css.textAlign,
      indent: parseFloat(css.paddingLeft), before: parseFloat(css.paddingTop), after: parseFloat(css.paddingBottom),
      bold: css.fontWeight, color: css.color, fill: css.webkitTextFillColor, paragraphs };
  });
}

async function undo(page) {
  await page.locator('[data-nds-tool="move"]').focus();
  await page.keyboard.press('Control+z');
  await settle(page);
}

async function plainPaste(page, text) {
  await editor(page).evaluate((el, text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    data.setData('text/html', '<b>Rich clipboard content must not become the shape text</b>');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
  await settle(page);
}

async function verify(entry) {
  const preview = /^https?:/.test(entry);
  const originalHash = preview ? null : digest(entry);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1680, height: 1050 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], network = [], results = [], legacy = [], downloads = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-shape-text-'));
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  let stage = 'startup';
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => {
    if (preview && route.request().url().startsWith(new URL(entry).origin + '/')) return route.continue();
    network.push(route.request().url());
    return route.abort();
  });
  const save = async (name, filename) => {
    const destination = path.join(temp, filename);
    downloads.push(destination);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    await (await pending).saveAs(destination);
    return fs.readFileSync(destination);
  };
  const capture = async name => {
    if (evidence) await page.screenshot({ path: path.join(evidence, name), fullPage: true });
  };
  const assertInsideCanvas = async locator => {
    const canvas = await page.locator('[data-nds-shape-overlay]').boundingBox();
    const box = await locator.boundingBox();
    assert(box.x >= canvas.x - 1 && box.y >= canvas.y - 1 &&
      box.x + box.width <= canvas.x + canvas.width + 1 && box.y + box.height <= canvas.y + canvas.height + 1,
    `Floating controls stay inside the visible canvas: ${JSON.stringify({ box, canvas })}`);
  };
  const assertOpaque = async locator => assert(await locator.evaluate(el => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(el).backgroundColor; ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[3] === 255;
  }), 'Text controls use a defined opaque theme surface so artwork cannot obscure their labels');
  const inkRows = async (bytes, mime) => page.evaluate(async ({ data, mime }) => {
    const image = new Image();
    image.src = `data:${mime};base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const rows = [];
    for (let y = 0; y < canvas.height; y++) {
      let count = 0, minX = canvas.width;
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i + 3] > 180 && pixels[i] > 120 && pixels[i + 2] > 130 &&
            pixels[i + 1] < 115 && pixels[i] - pixels[i + 1] > 55 && pixels[i + 2] - pixels[i + 1] > 55) {
          count++; minX = Math.min(minX, x);
        }
      }
      if (count > 3) rows.push({ y, count, minX });
    }
    const groups = [];
    for (const row of rows) {
      const previous = groups.at(-1);
      if (!previous || row.y - previous.end > 2) groups.push({ start: row.y, end: row.y, minX: row.minX, count: row.count });
      else { previous.end = row.y; previous.minX = Math.min(previous.minX, row.minX); previous.count += row.count; }
    }
    return { width: canvas.width, height: canvas.height, groups };
  }, { data: bytes.toString('base64'), mime });
  try {
    await page.goto(preview ? entry : pathToFileURL(path.resolve(entry)).href);
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_imagesUi);
    stage = 'palette coverage';
    await page.evaluate(empty => {
      window.__nds_diagramStore.getState().loadDiagram(empty, { relayout: false });
      window.__nds_layoutStore.getState().expandSection('shapes');
    }, fixture([]));
    for (const variant of SHAPE_TILES) {
      await page.locator(`[data-nds-accordion-section="shapes"] [data-nds-shape-variant="${variant}"]`).click();
      if (variant === 'text-box') await editor(page).press('Escape');
    }
    const templates = await readShapes(page);
    assert.equal(templates.length, SHAPE_TILES.length);
    const cases = templates.map((template, i) => placed(template, SHAPE_TILES[i]));
    const box = cases.find(shape => shape.id === 'text-box');
    const representatives = ['arrow', 'rect', 'ellipse', 'callout'].map(kind => cases.find(shape => shape.kind === kind));
    for (const sample of cases) {
      stage = `formatting ${sample.id}`;
      await load(page, [sample]);
      const before = await readShapes(page), steps = await history(page);
      const label = shapeNode(page, sample.id).locator('[data-nds-shape-text]');
      const original = await metrics(label);
      assert.equal(original.align, 'center');
      assert.equal(original.indent, 0);
      assert(original.paragraphs.length === 3 && FIELDS.every(key => !(key in before[0])));
      const input = await open(page, sample.id);
      assert.deepEqual(await page.locator('[data-nds-text-size] option').evaluateAll(options => options.map(option => Number(option.value))),
        TEXT_SIZES, `${sample.id}: every text-capable shape offers the same sizes through 128px`);
      assert.equal((await metrics(input)).size, original.size, 'Editor and committed label use identical fitting');
      await input.press('Control+Enter');
      assert.deepEqual(await readShapes(page), before, 'Opening/closing an old shape does not write default formatting');
      assert.equal(await history(page), steps, 'Unchanged text adds no undo entry');
      await open(page, sample.id);
      await editor(page).press('Control+End');
      await editor(page).press('Enter');
      assert.equal(await editor(page).count(), 1, `${sample.id}: Enter keeps the editor open`);
      assert.equal(await editor(page).evaluate(el => el.children.length), 4, `${sample.id}: Enter inserts one paragraph`);
      assert.deepEqual(await readShapes(page), before, 'Enter changes the draft, not saved shape text');
      assert.equal(await history(page), steps, 'A new paragraph stays in native typing history until committed');
      await editor(page).press('Control+z');
      assert.equal(await editor(page).evaluate(el => [...el.children].map(p => p.textContent).join('\n')),
        sample.text, 'Native undo reverses an Enter paragraph without leaving the editor');
      await align(page, 'right');
      const right = await metrics(editor(page));
      assert(right.paragraphs.every(p => p.align === 'right'));
      assert(Math.max(...right.paragraphs.map(p => p.right)) - Math.min(...right.paragraphs.map(p => p.right)) < 1);
      await align(page, 'left');
      await page.locator('[data-nds-text-indent-increase]').click();
      await spacing(page);
      const live = await metrics(editor(page));
      assert.equal(live.align, 'left');
      assert.equal(live.indent, live.size * 1.5);
      assert.equal(live.before, 4); assert.equal(live.after, 8);
      assert(live.paragraphs.every(p => p.align === 'left'));
      assert(Math.max(...live.paragraphs.map(p => p.x)) - Math.min(...live.paragraphs.map(p => p.x)) < 1);
      assert(Math.abs((live.paragraphs[1].y - live.paragraphs[0].y) / live.scale - (live.lineHeight + 12)) < 1);
      await editor(page).press('Control+Enter');
      assert.deepEqual(styles((await readShapes(page))[0]), formatted);
      const rendered = await metrics(label);
      assert.equal(rendered.size, live.size);
      assert.equal(rendered.lineHeight, live.lineHeight);
      assert.equal(rendered.indent, live.indent);
      assert(Math.abs(rendered.paragraphs[0].x - live.paragraphs[0].x) < 1);
      assert(Math.abs(rendered.paragraphs[0].y - live.paragraphs[0].y) < 1);
      results.push(sample.id);
    }

    stage = 'larger text sizes on every palette shape';
    for (const sample of cases) {
      const large = { ...sample, text: 'Large', textSize: 40 };
      await load(page, [large]);
      await open(page, large.id);
      await page.locator('[data-nds-text-size]').selectOption('128');
      assert.equal((await metrics(editor(page))).size, 128, `${large.id}: actual editor text can exceed 40px`);
      await editor(page).press('Control+Enter');
      assert.deepEqual((await readShapes(page))[0], { ...large, textSize: 128 }, 'Changing size does not resize or otherwise alter the shape');
      assert.equal((await metrics(shapeNode(page, large.id).locator('[data-nds-shape-text]'))).size, 128,
        `${large.id}: committed text keeps the actual 128px size when it fits`);
    }
    const largeBox = { ...box, text: 'Large', textSize: 40 };
    await load(page, [largeBox]);
    await open(page, largeBox.id);
    const sizePicker = page.locator('[data-nds-text-size]');
    await sizePicker.focus();
    await sizePicker.press('End');
    assert.equal(await sizePicker.inputValue(), '128', 'The largest preset is reachable with the keyboard');
    assert.equal((await metrics(editor(page))).size, 128);
    await editor(page).press('Control+Enter');
    await undo(page);
    assert.deepEqual((await readShapes(page))[0], largeBox, 'Undo restores the original font size in one step');
    await page.keyboard.press('Control+y'); await settle(page);
    assert.equal((await readShapes(page))[0].textSize, 128);
    await open(page, largeBox.id);
    for (const size of LARGE_TEXT_SIZES) {
      await sizePicker.selectOption(String(size));
      assert.equal((await readShapes(page))[0].textSize, size);
      assert.equal((await metrics(editor(page))).size, size, `The ${size}px preset changes actual rendered text`);
    }
    await editor(page).press('Control+Enter');
    const largeJson = await save('Save JSON', 'large-text.json');
    assert.equal(JSON.parse(largeJson).shapes[0].textSize, 128);
    await load(page, JSON.parse(largeJson).shapes);
    const largePersisted = await readShapes(page);
    await page.waitForTimeout(1600); await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore);
    assert.deepEqual(await readShapes(page), largePersisted, 'Save/Load and browser restore retain the larger font size');
    for (const size of [73, 160]) {
      const custom = { ...largeBox, textSize: size };
      await load(page, [custom]); await open(page, custom.id);
      assert.equal(await sizePicker.inputValue(), String(size), 'Imported non-preset sizes remain selected');
      await editor(page).press('Control+Enter');
      assert.deepEqual((await readShapes(page))[0], custom, 'Opening the menu does not clamp or rewrite an imported size');
    }

    for (const variant of RETIRED_VARIANTS.filter(value => value.startsWith('geom-'))) {
      stage = `legacy caption ${variant}`;
      const sample = { ...representatives.find(shape => shape.kind === 'rect'), ...formatted,
        id: variant, geom: variant.slice(5) };
      await load(page, [sample]);
      await open(page, sample.id);
      await align(page, 'right');
      await editor(page).press('Control+Enter');
      assert.deepEqual(styles((await readShapes(page))[0]), { ...formatted, textAlign: 'right' });
      legacy.push(variant);
    }

    stage = 'fitting wrapped paragraphs';
    const dense = { ...box, ...formatted, w: 160, h: 125, textSize: 40,
      text: 'A longer paragraph with several wrapped words\nAnother paragraph with wrapped words' };
    await load(page, [dense]);
    await open(page, dense.id);
    const fitted = await metrics(editor(page));
    assert(fitted.size < 40 && fitted.size >= 6, 'Fitting includes indentation and paragraph spacing');
    assert.equal(fitted.paragraphs.length, 2, 'Wrapping does not create extra paragraphs');
    assert(Math.abs(fitted.before - 4 * fitted.size / 40) < 0.01);
    assert(await editor(page).evaluate(el => el.scrollHeight <= el.closest('foreignObject').height.baseVal.value + 1),
      'Fitted paragraphs fit the actual editable frame');
    await editor(page).press('Control+Enter');
    assert.equal((await readShapes(page))[0].textSize, 40, 'Fitting never overwrites the requested font size');
    await load(page, [{ ...dense, textSize: 128 }]);
    await open(page, dense.id);
    const largeFitted = await metrics(editor(page));
    assert(largeFitted.size < 128 && largeFitted.size >= 6);
    assert.equal(await page.locator('[data-nds-text-size]').inputValue(), '128', 'The menu retains the chosen size while text auto-fits');
    assert(await editor(page).evaluate(el => el.scrollHeight <= el.closest('foreignObject').height.baseVal.value + 1),
      'Larger presets preserve existing dense-text fitting rather than overflowing the editor');
    await editor(page).press('Control+Enter');
    assert.equal((await readShapes(page))[0].textSize, 128);

    stage = 'selection, keyboard, limits and undo';
    await load(page, [box]);
    const base = (await readShapes(page))[0], initialSteps = await history(page);
    await open(page, box.id);
    await editor(page).evaluate(el => {
      const range = document.createRange();
      range.setStart(el.firstChild.firstChild, 1); range.setEnd(el.firstChild.firstChild, 4);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    await align(page, 'left');
    assert.equal(await page.evaluate(() => getSelection().toString()), 'lph', 'Formatting restores the selected text/caret');
    await editor(page).press('Control+Enter');
    assert.equal(await history(page), initialSteps + 1, 'Closing unchanged text does not mask the formatting undo frame');
    await undo(page);
    assert.deepEqual((await readShapes(page))[0], base, 'One undo reverses one alignment change');
    await open(page, box.id);
    await page.locator('[data-nds-text-align-trigger]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.locator('[data-nds-paragraph-before]').waitFor();
    const beforeLimits = await readShapes(page);
    await page.locator('[data-nds-paragraph-before]').dispatchEvent('keydown',
      { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true });
    assert.equal(await page.locator('[data-nds-paragraph-before]').count(), 1, 'IME Enter does not apply a spacing dialog');
    assert.deepEqual(await readShapes(page), beforeLimits);
    for (const invalid of ['49', '-1', '']) {
      await page.locator('[data-nds-paragraph-before]').fill(invalid);
      assert(await page.locator('[data-nds-paragraph-apply]').isDisabled());
      assert.equal(await page.getByRole('alert').count(), 1);
      await page.keyboard.press('Enter');
      assert.deepEqual(await readShapes(page), beforeLimits, 'Invalid spacing cannot change the shape');
    }
    await page.keyboard.press('Escape');
    assert.equal(await editor(page).count(), 1, 'Escape closes the spacing panel, not the text editor');
    assert.equal(await page.locator('[data-nds-paragraph-before]').count(), 0);
    await page.locator('[data-nds-text-align-trigger]').click();
    await page.locator('[data-nds-text-paragraph-open]').click();
    await page.locator('[data-nds-paragraph-before]').fill('6');
    await page.locator('[data-nds-paragraph-before]').press('Enter');
    assert.equal(await page.locator('[data-nds-paragraph-before]').count(), 0, 'Enter still applies the spacing form');
    assert.equal(await editor(page).count(), 1, 'Applying spacing does not finish shape text editing');
    assert.equal((await readShapes(page))[0].textSpaceBefore, 6);
    await page.locator('[data-nds-text-bold]').focus();
    await page.keyboard.press('Delete');
    await page.keyboard.press('Backspace');
    assert.equal((await readShapes(page)).length, 1, 'Toolbar keyboard focus cannot delete the shape');
    await page.keyboard.press('Space');
    assert.equal((await metrics(editor(page))).bold, '700', 'Bold works by keyboard');
    await page.locator('[data-nds-text-size]').selectOption('32');
    await page.locator('[data-nds-text-color="red"]').click();
    assert.equal((await readShapes(page))[0].textSize, 32);
    assert.equal((await metrics(editor(page))).fill, (await metrics(editor(page))).color);
    await page.locator('[data-nds-text-custom-color]').fill('#c026d3');
    assert.equal((await readShapes(page))[0].textColor, '#c026d3', 'Custom colors remain available');
    for (let i = 0; i < 8; i++) await page.locator('[data-nds-text-indent-increase]').click();
    assert(await page.locator('[data-nds-text-indent-increase]').isDisabled());
    assert.equal((await readShapes(page))[0].textIndent, 8);
    for (let i = 0; i < 8; i++) await page.locator('[data-nds-text-indent-decrease]').click();
    assert(await page.locator('[data-nds-text-indent-decrease]').isDisabled());
    await editor(page).press('Escape');

    stage = 'native paragraphs, paste, IME and cancellation';
    await load(page, [box]);
    await open(page, box.id);
    await plainPaste(page, 'Root\nBranch\n\nLeaf');
    await editor(page).press('Control+z');
    assert.equal(await editor(page).evaluate(el => [...el.children].map(p => p.textContent).join('\n')), box.text,
      'Native undo restores a plain-text paste without losing the editable DOM');
    await editor(page).press('Control+a');
    await plainPaste(page, '\nAlpha\n\nBeta\n');
    await editor(page).press('Control+Enter');
    assert.equal((await readShapes(page))[0].text, '\nAlpha\n\nBeta\n', 'Blank paragraphs round-trip without extra placeholder newlines');
    await open(page, box.id);
    await editor(page).press('Control+a');
    await page.keyboard.insertText('First');
    await editor(page).press('Enter');
    await page.keyboard.insertText('Second');
    await editor(page).press('Shift+Enter');
    await editor(page).press('Enter');
    await page.keyboard.insertText('Fourth');
    await spacing(page, '0', '10', '1.25');
    await editor(page).press('Control+Enter');
    assert.equal((await readShapes(page))[0].text, 'First\nSecond\n\nFourth',
      'Enter and Shift+Enter preserve new lines and intentional blank paragraphs');
    await open(page, box.id);
    const beforeCmd = await readShapes(page), cmdSteps = await history(page);
    await editor(page).press('Meta+Enter');
    assert.equal(await editor(page).count(), 0, 'Cmd+Enter also finishes without inserting a newline');
    assert.deepEqual(await readShapes(page), beforeCmd);
    assert.equal(await history(page), cmdSteps, 'An unchanged Cmd+Enter commit is history-free');
    const committed = (await readShapes(page))[0];
    await open(page, box.id);
    await editor(page).fill('Temporary');
    await editor(page).dispatchEvent('compositionstart');
    await editor(page).dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true });
    assert.equal(await editor(page).count(), 1, 'IME Enter does not commit or split text');
    await editor(page).dispatchEvent('keydown',
      { key: 'Enter', code: 'Enter', ctrlKey: true, isComposing: true, bubbles: true });
    assert.equal(await editor(page).count(), 1, 'IME Ctrl+Enter does not commit text');
    await editor(page).dispatchEvent('compositionend');
    await editor(page).press('Escape');
    assert.deepEqual((await readShapes(page))[0], committed, 'Escape discards text changes without discarding saved formatting');
    await open(page, box.id);
    await editor(page).fill('Saved on blur');
    await editor(page).evaluate(el => el.blur());
    await editor(page).waitFor({ state: 'detached' });
    assert.equal((await readShapes(page))[0].text, 'Saved on blur');

    stage = 'schema, all shape kinds';
    const bad = [
      { textAlign: 'justify' }, { textIndent: -1 }, { textIndent: 1.5 }, { textIndent: 9 },
      { textSpaceBefore: -1 }, { textSpaceBefore: 49 }, { textSpaceAfter: 49 },
      { textLineHeight: 0.9 }, { textLineHeight: 3.1 },
    ];
    const invalid = representatives.flatMap((sample, kind) => bad.map((patch, i) => ({
      ...sample, ...patch, id: `invalid-${kind}-${i}`,
    })));
    const valid = { ...box, ...formatted };
    const checked = await page.evaluate(file => {
      const result = window.__nds_tabsStore.getState().loadStudioFile(JSON.stringify(file));
      return { result, shapes: window.__nds_tabsStore.getState().activeTab().shapes };
    }, fixture([valid, ...invalid]));
    assert.equal(checked.result.ok, true); assert.equal(checked.result.dropped, invalid.length);
    assert.deepEqual(checked.shapes, [valid], 'Invalid formatting is reported and dropped consistently for every shape kind');

    stage = 'copy, Save/Load, tab switching and auto-save';
    await load(page, [valid]);
    await shapeNode(page, box.id).click();
    const copied = await page.evaluate(() => {
      getSelection().removeAllRanges();
      const target = document.querySelector('[data-nds-tool="move"]'); target.focus();
      const data = new DataTransfer();
      const copy = new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true });
      const paste = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      target.dispatchEvent(copy); target.dispatchEvent(paste);
      return copy.defaultPrevented && paste.defaultPrevented;
    });
    assert(copied, 'The real canvas clipboard handlers accept a shape copy/paste');
    await page.waitForFunction(() => window.__nds_tabsStore.getState().activeTab().shapes.length === 2);
    const copies = await readShapes(page);
    assert.deepEqual(styles(copies[1]), formatted);
    assert.equal(copies[1].text, valid.text);
    assert.notEqual(copies[1].id, valid.id);
    await undo(page);
    assert.equal((await readShapes(page)).length, 1);
    const json = await save('Save JSON', 'formatted.json');
    assert.deepEqual(styles(JSON.parse(json).shapes[0]), formatted);
    await load(page, JSON.parse(json).shapes);
    const firstTab = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    await page.evaluate(() => window.__nds_tabsStore.getState().addTab());
    const secondTab = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    await page.locator(`[data-nds-tab="${firstTab}"]`).click();
    await open(page, box.id);
    await editor(page).fill('Committed before tab switch');
    await page.locator(`[data-nds-tab="${secondTab}"]`).click();
    await page.locator(`[data-nds-tab="${firstTab}"]`).click();
    assert.equal((await readShapes(page))[0].text, 'Committed before tab switch');
    assert.deepEqual(styles((await readShapes(page))[0]), formatted);
    const persisted = await readShapes(page);
    await page.waitForTimeout(1600);
    await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore);
    assert.deepEqual(await readShapes(page), persisted, 'Auto-save/reload keeps every text-formatting field');

    stage = 'native move and resize';
    await load(page, [valid]);
    const originalPosition = (await readShapes(page))[0];
    const body = await shapeNode(page, box.id).boundingBox();
    await page.mouse.move(body.x + 25, body.y + 30); await page.mouse.down();
    await page.mouse.move(body.x + 65, body.y + 55, { steps: 8 }); await page.mouse.up();
    await settle(page);
    const moved = (await readShapes(page))[0];
    assert(moved.x > originalPosition.x + 20 && moved.y > originalPosition.y + 10, 'Native dragging still moves a formatted shape');
    assert.deepEqual(styles(moved), formatted);
    const corner = await page.evaluate(shape => {
      const matrix = document.querySelector('[data-nds-shape-overlay] > g').getScreenCTM();
      const point = new DOMPoint(shape.x + shape.w, shape.y + shape.h).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    }, moved);
    await page.mouse.move(corner.x, corner.y); await page.mouse.down();
    await page.mouse.move(corner.x + 45, corner.y + 30, { steps: 8 }); await page.mouse.up();
    await settle(page);
    const resized = (await readShapes(page))[0];
    assert(resized.w > moved.w + 20 && resized.h > moved.h + 10, 'Native resizing still works');
    assert.deepEqual(styles(resized), formatted);
    await undo(page);
    assert.deepEqual((await readShapes(page))[0], moved, 'Resizing remains one undo step');

    stage = 'caption hit testing over resources';
    const covering = { ...valid, text: 'Editable caption', x: 80, y: 190, w: 620, h: 260 };
    const resource = { id: 'under-caption', type: 'vm', position: { x: 50, y: 160 }, size: { w: 700, h: 350 },
      data: { name: 'Example server', fields: {} } };
    await load(page, [covering], [resource]);
    const caption = await metrics(shapeNode(page, covering.id).locator('[data-nds-shape-text]'));
    await page.mouse.dblclick(caption.paragraphs[0].x + 20, caption.paragraphs[0].y + caption.lineHeight / 2, { delay: 65 });
    await editor(page).waitFor();
    await editor(page).press('Escape');
    const icon = page.locator('.react-flow__node[data-id="under-caption"] .rounded-full svg').first();
    await icon.click();
    assert.equal(await page.evaluate(() => window.__nds_diagramStore.getState().selectedNodeId), 'under-caption',
      'Bare caption-frame space still allows the underlying resource to be selected');
    await load(page, [{ ...covering, rotation: 180 }], [resource]);
    const flipped = await metrics(shapeNode(page, covering.id).locator('[data-nds-shape-text]'));
    await page.mouse.dblclick(flipped.paragraphs[0].x + 20, flipped.paragraphs[0].y + flipped.lineHeight / 2, { delay: 65 });
    await editor(page).waitFor();
    await editor(page).press('Escape');

    stage = 'themes, localization, compact canvas and zoom';
    await load(page, [{ ...valid, text: 'Large', textSize: 128 }]);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
      for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
        await page.evaluate(language => window.__nds_i18nStore.getState().setLang(language), language);
        await open(page, valid.id);
        await assertInsideCanvas(page.locator('[data-nds-text-toolbar]'));
        await assertOpaque(page.locator('[data-nds-text-toolbar]'));
        assert.equal(await page.locator('[data-nds-text-size]').inputValue(), '128');
        assert(await page.locator('[data-nds-text-size]').evaluate(select => {
          const css = getComputedStyle(select), canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d'); ctx.font = `${css.fontSize} ${css.fontFamily}`;
          return ctx.measureText('128px').width <= select.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 18;
        }), 'The three-digit size fits beside the native dropdown arrow');
        assert(await page.locator('[data-nds-text-align-trigger]').evaluate(button => {
          const box = button.lastElementChild.getBoundingClientRect();
          return button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        }), 'Rotation handles cannot intercept the alignment chevron');
        const label = await page.locator('[data-nds-text-align-trigger]').getAttribute('aria-label');
        assert(label && (language === 'en' || label !== 'Text alignment'));
        await page.locator('[data-nds-text-align-trigger]').click();
        if (language !== 'en') {
          assert.notEqual(await page.locator('[data-nds-text-paragraph-open]').textContent(), 'Paragraph spacing');
        }
        await page.locator('[data-nds-text-paragraph-open]').click();
        await assertInsideCanvas(page.getByRole('dialog'));
        await assertOpaque(page.getByRole('dialog').locator('..'));
        if (language !== 'en') assert.notEqual(await page.locator('[data-nds-paragraph-apply]').textContent(), 'Apply');
        await capture(`format-${theme}-${language}.png`);
        await page.keyboard.press('Escape'); await editor(page).press('Escape');
      }
    }
    await page.evaluate(() => {
      window.__nds_i18nStore.getState().setLang('en');
      window.__nds_themeStore.getState().setPref('light');
    });
    await page.setViewportSize({ width: 780, height: 700 });
    await settle(page);
    await open(page, valid.id);
    await assertInsideCanvas(page.locator('[data-nds-text-toolbar]'));
    assert((await page.locator('[data-nds-text-toolbar]').boundingBox()).height > 46, 'Compact controls wrap instead of shrinking');
    await page.locator('[data-nds-text-align-trigger]').click();
    await page.locator('[data-nds-text-paragraph-open]').click();
    await assertInsideCanvas(page.getByRole('dialog'));
    await capture('format-compact.png');
    await page.keyboard.press('Escape'); await editor(page).press('Escape');
    await page.setViewportSize({ width: 1680, height: 1050 }); await settle(page);
    for (let i = 0; i < 8; i++) await page.locator('.react-flow__controls-zoomout').click();
    await settle(page);
    await open(page, valid.id);
    const toolbar = await page.locator('[data-nds-text-toolbar]').boundingBox();
    assert(Math.abs(toolbar.width - 500) < 2, 'The toolbar stays readable even below 20% canvas zoom');
    await assertInsideCanvas(page.locator('[data-nds-text-toolbar]'));
    await editor(page).press('Escape');
    for (let i = 0; i < 8; i++) await page.locator('.react-flow__controls-zoomin').click();
    await settle(page);

    stage = 'real PNG and SVG exports';
    for (const sample of representatives) {
      const exporting = { ...sample, ...formatted, textSize: 32, textColor: '#c026d3',
        text: 'First paragraph\nSecond paragraph\nThird paragraph' };
      await load(page, [exporting]);
      const before = await readShapes(page), viewport = await camera(page);
      const svg = await save('SVG', `${sample.kind}.svg`);
      const png = await save('PNG', `${sample.kind}.png`);
      const svgText = svg.toString('utf8');
      assert(svgText.includes('First paragraph') && svgText.includes('Third paragraph'));
      assert(svgText.includes('text-align: left') || svgText.includes('text-align:left'));
      const pngInk = await inkRows(png, 'image/png');
      const svgInk = await inkRows(svg, 'image/svg+xml');
      assert.equal(pngInk.groups.length, 3, `${sample.kind}: every paragraph is present in PNG`);
      assert.equal(svgInk.groups.length, 3, `${sample.kind}: every paragraph is present in SVG`);
      const scale = pngInk.width / svgInk.width;
      for (let i = 1; i < 3; i++) {
        assert(Math.abs(svgInk.groups[i].start - svgInk.groups[i - 1].start - 60) < 3, 'SVG preserves line and paragraph spacing');
        assert(Math.abs((pngInk.groups[i].start - pngInk.groups[i - 1].start) / scale - 60) < 3, 'PNG preserves line and paragraph spacing');
      }
      assert.deepEqual(await readShapes(page), before);
      assert.equal(await camera(page), viewport, 'Export restores the canvas viewport');
      if (evidence) {
        fs.writeFileSync(path.join(evidence, `${sample.kind}.png`), png);
        fs.writeFileSync(path.join(evidence, `${sample.kind}.svg`), svg);
      }
      await load(page, [{ ...exporting, rotation: 135 }]);
      const rotated = await save('PNG', `${sample.kind}-rotated.png`);
      const rotatedInk = await inkRows(rotated, 'image/png');
      const count = data => data.groups.reduce((sum, group) => sum + group.count, 0);
      assert(count(rotatedInk) > count(pngInk) * 0.75, `${sample.kind}: rotated export must not crop the text`);
      assert(rotatedInk.groups[0].start > 3 && rotatedInk.groups.at(-1).end < rotatedInk.height - 3);
      if (evidence) fs.writeFileSync(path.join(evidence, `${sample.kind}-rotated.png`), rotated);
    }

    stage = 'large-font PNG and SVG exports';
    for (const sample of representatives) {
      await load(page, [{ ...sample, textSize: 128, textColor: '#c026d3', text: 'Large\nText' }]);
      assert.equal((await metrics(shapeNode(page, sample.id).locator('[data-nds-shape-text]'))).size, 128);
      for (const [button, mime, extension] of [['PNG', 'image/png', 'png'], ['SVG', 'image/svg+xml', 'svg']]) {
        const bytes = await save(button, `large-${sample.kind}.${extension}`);
        const ink = await inkRows(bytes, mime);
        assert.equal(ink.groups.length, 2, `${sample.kind}/${button}: both large-text lines appear in actual export pixels`);
        assert(ink.groups.every(group => group.end - group.start >= 70), 'Export contains genuinely larger glyphs, not just a larger saved value');
        assert(ink.groups[0].start > 0 && ink.groups.at(-1).end < ink.height - 1, 'Larger glyphs are not cropped');
        if (evidence) fs.writeFileSync(path.join(evidence, `large-${sample.kind}.${extension}`), bytes);
      }
    }

    stage = 'large-font region screenshot';
    await load(page, [{ ...box, ...formatted, x: 50, y: 60, w: 1000, h: 700, textSize: 128, textColor: '#c026d3',
      text: 'First\nSecond\nThird' }]);
    assert.equal((await metrics(shapeNode(page, box.id).locator('[data-nds-shape-text]'))).size, 128);
    const shotBox = await shapeNode(page, box.id).boundingBox();
    const crop = { x: shotBox.x - 8, y: shotBox.y - 8, width: shotBox.width + 16, height: shotBox.height + 16 };
    const shotBefore = await readShapes(page);
    await page.locator('[data-nds-screenshot]').click();
    await page.locator('[data-nds-capture-layer]').waitFor();
    await page.mouse.move(crop.x, crop.y); await page.mouse.down();
    await page.mouse.move(crop.x + crop.width, crop.y + crop.height, { steps: 10 }); await page.mouse.up();
    await page.locator('[data-nds-shot-canvas]').waitFor();
    await page.waitForFunction(() => window.__nds_shot?.w > 0);
    const shot = await page.locator('[data-nds-shot-canvas]').evaluate(el => el.toDataURL('image/png'));
    const bytes = Buffer.from(shot.split(',')[1], 'base64');
    const pixels = await inkRows(bytes, 'image/png');
    assert.equal(pixels.groups.length, 3, 'A real region screenshot includes every formatted paragraph');
    assert.deepEqual(await readShapes(page), shotBefore);
    if (evidence) fs.writeFileSync(path.join(evidence, 'region-screenshot.png'), bytes);

    assert.deepEqual(errors, [], 'No browser errors');
    assert.deepEqual(network, [], 'The installed application requires no network requests');
    if (!preview) assert.equal(digest(entry), originalHash, 'Tests never modify the installed or candidate application');
    if (evidence) fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ entry, shapes: results, legacy, errors, network }, null, 2));
    console.log(`PASS shape text formatting: ${results.length} palette variants, ${legacy.length} legacy geometries, 48-128px presets, actual large-font rendering, native editing, persistence, keyboard, fitting, layout and image exports.`);
  } catch (error) {
    console.error(`Shape text stage: ${stage}`);
    await capture('failure.png');
    throw error;
  } finally {
    await browser.close();
    for (const file of downloads) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
}

if (require.main === module) {
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
  (async () => { for (const entry of entries) await verify(entry); })()
    .catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { fixture, placed };
