const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const targets = {
  fullscreen: '[data-nds-fullscreen]',
  canvas: '[data-nds-menu-trigger="canvas-background"]',
  toolbar: '[data-nds-annotation-toolbar]',
  tabs: '[data-nds-tabbar]',
  notes: '[data-nds-notes-open]',
};
const evidence = process.env.NDS_CHROME_EVIDENCE;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const settle = page => page.waitForTimeout(220);
const closeTo = (actual, expected, label) =>
  assert(Math.abs(actual - expected) < .007, `${label}: expected ${expected}, received ${actual}`);

async function styles(page, selectors = targets) {
  return page.evaluate(selectors => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = value => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const color = [...ctx.getImageData(0, 0, 1, 1).data];
      return [...color.slice(0, 3), color[3] / 255];
    };
    return Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Missing ${name}: ${selector}`);
      const css = getComputedStyle(el);
      let effectiveOpacity = 1;
      for (let ancestor = el; ancestor; ancestor = ancestor.parentElement)
        effectiveOpacity *= Number(getComputedStyle(ancestor).opacity);
      return [name, {
        background: rgba(css.backgroundColor), color: rgba(css.color), border: rgba(css.borderTopColor),
        opacity: effectiveOpacity, filter: css.backdropFilter, outline: css.outlineStyle,
        outlineWidth: parseFloat(css.outlineWidth), shadow: css.boxShadow,
        box: el.getBoundingClientRect().toJSON(),
      }];
    }));
  }, selectors);
}
async function expectSurfaces(page, alpha = .45) {
  await page.waitForFunction(selectors => selectors.every(selector => {
    const el = document.querySelector(selector);
    if (!el) return false;
    getComputedStyle(el).getPropertyValue('background-color');
    return el.getAnimations().every(animation => !animation.pending && animation.playState !== 'running');
  }), Object.values(targets));
  const result = await styles(page);
  for (const [name, style] of Object.entries(result)) {
    closeTo(style.background[3], alpha, `${name} has the approved 55%-transparent background`);
    assert.equal(style.opacity, 1, `${name}: translucency must not fade text or icons.`);
    assert.equal(style.color[3], 1, `${name}: foreground ink stays solid.`);
    assert.equal(style.filter, alpha === 1 ? 'none' : 'blur(2px)', `${name}: expected background filter.`);
  }
  return result;
}
async function savedDocument(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
  const buffers = [];
  for await (const buffer of await (await pending).createReadStream()) buffers.push(buffer);
  return JSON.parse(Buffer.concat(buffers).toString('utf8'));
}
async function paintBackdrop(page, color) {
  await page.evaluate(({ targets, color }) => {
    document.querySelector('[data-chrome-test-background]')?.remove();
    const svg = document.querySelector('.react-flow__background'), bounds = svg.getBoundingClientRect();
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('data-chrome-test-background', '1');
    for (const selector of Object.values(targets)) {
      const box = document.querySelector(selector).getBoundingClientRect();
      const rect = document.createElementNS(svg.namespaceURI, 'rect');
      for (const [name, value] of Object.entries({
        x: box.x - bounds.x - 8, y: box.y - bounds.y - 8, width: box.width + 16, height: box.height + 16, fill: color,
      })) rect.setAttribute(name, String(value));
      layer.append(rect);
    }
    svg.append(layer);
  }, { targets, color });
}
function contrast(foreground, background) {
  const luminance = rgb => rgb.slice(0, 3).map(c => c / 255)
    .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function pixelProof(page, theme, label) {
  const backgrounds = theme === 'light' ? ['#b9d6ea', '#e5c4a3'] : ['#1a3552', '#433226'];
  const shots = [];
  for (const color of backgrounds) {
    await paintBackdrop(page, color);
    shots.push((await page.screenshot({ animations: 'disabled' })).toString('base64'));
  }
  const measured = await page.evaluate(async ({ shots, targets }) => {
    const images = await Promise.all(shots.map(async bytes => {
      const image = new Image(); image.src = 'data:image/png;base64,' + bytes; await image.decode();
      return image;
    }));
    const canvas = document.createElement('canvas');
    canvas.width = images[0].naturalWidth; canvas.height = images[0].naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = images.map(image => {
      ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    });
    return Object.fromEntries(Object.entries(targets).map(([name, selector]) => {
      const b = document.querySelector(selector).getBoundingClientRect();
      let difference = 0, count = 0, changed = 0;
      for (let y = Math.ceil(b.top + 4); y < b.bottom - 4; y++) {
        for (let x = Math.ceil(b.left + 4); x < b.right - 4; x++) {
          const offset = (y * canvas.width + x) * 4;
          const delta = [0, 1, 2].reduce((sum, c) => sum + Math.abs(pixels[0][offset + c] - pixels[1][offset + c]), 0) / 3;
          difference += delta; count++; if (delta > 4) changed++;
        }
      }
      return [name, { averageDifference: difference / count, changedFraction: changed / count }];
    }));
  }, { shots, targets });
  for (const [name, result] of Object.entries(measured))
    assert(result.averageDifference > 5 && result.changedFraction > .4,
      `${theme} ${name}: the diagram must actually show through (${JSON.stringify(result)}).`);
  const foregrounds = await styles(page, {
    fullscreen: targets.fullscreen, notes: targets.notes, newTab: '[data-nds-tab-add]',
    tab: '[data-nds-tab][aria-selected="false"]', tool: '[data-nds-tool="pan"]',
  });
  const surfaces = await styles(page);
  for (const [name, style] of Object.entries(foregrounds)) {
    const container = name === 'newTab' || name === 'tab' ? surfaces.tabs
      : name === 'tool' ? surfaces.toolbar : null;
    for (const hex of backgrounds) {
      let backdrop = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      for (const layer of [container?.background, style.background].filter(Boolean)) {
        backdrop = backdrop.map((channel, i) => layer[i] * layer[3] + channel * (1 - layer[3]));
      }
      assert(contrast(style.color, backdrop) >= 4.5, `${theme} ${name}: text/primary tool contrast must remain at least 4.5:1.`);
    }
  }
  if (evidence) {
    fs.writeFileSync(path.join(evidence, `${label}-${theme}-through-controls.png`), Buffer.from(shots[0], 'base64'));
    fs.writeFileSync(path.join(evidence, `${label}-${theme}-pixels.json`), JSON.stringify(measured, null, 2));
  }
  await page.evaluate(() => document.querySelector('[data-chrome-test-background]').remove());
}
async function verify(browser, entry, index) {
  const originalHash = hash(entry), label = `${path.basename(entry).startsWith('non_') ? 'non-production' : 'production'}-${index}`;
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'en-US', acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const errors = [], network = [], page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto(pathToFileURL(entry).href);
    await page.waitForFunction(() => window.__nds_tabsStore);
    await page.mouse.move(4, 4);
    await expectSurfaces(page);
    const first = await page.evaluate(() => {
      const tabs = window.__nds_tabsStore;
      const loaded = tabs.getState().loadStudioFile(JSON.stringify({
        version: 1, meta: { title: 'Transparent controls', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
        nodes: [{ id: 'a', type: 'vm', position: { x: 80, y: 160 }, size: { w: 280, h: 185 }, data: { name: 'App', fields: {} } },
          { id: 'b', type: 'storage', position: { x: 550, y: 190 }, size: { w: 280, h: 185 }, data: { name: 'Storage', fields: {} } }],
        edges: [{ id: 'link', source: 'a', target: 'b', kind: 'link', label: 'HTTPS' }], annotations: [],
        shapes: [{ id: 'box', kind: 'rect', x: 160, y: 410, w: 280, h: 70, color: '#0f766e', width: 2, fillOpacity: .1, text: 'Editable shape' }],
        strokes: [{ id: 'ink', color: '#7e22ce', width: 2, points: [{ x: 540, y: 435 }, { x: 590, y: 460 }] }],
        notes: 'Notes remain an opaque editing surface.', comments: [], images: [],
      }));
      if (!loaded.ok) throw new Error(loaded.error);
      const first = tabs.getState().activeTabId;
      tabs.getState().addTab(); tabs.getState().switchTab(first);
      return first;
    });
    await page.waitForTimeout(700);
    const saved = await savedDocument(page);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
      await page.mouse.move(4, 4); await settle(page);
      const resting = await expectSurfaces(page);
      assert.equal(await page.locator('.nds-canvas-chrome').count(), 5);
      const children = await styles(page, {
        tool: '[data-nds-tool="pan"]', chevron: '[data-nds-style-chevron]',
        tab: '[data-nds-tab][aria-selected="false"]', selectedTab: '[data-nds-tab][aria-selected="true"]',
        selectedTool: '[data-nds-tool][aria-pressed="true"]', color: '[data-nds-color="blue"]',
      });
      for (const name of ['tool', 'chevron', 'tab']) closeTo(children[name].background[3], .1, `${theme} ${name} has no opaque inner panel`);
      closeTo(children.selectedTab.background[3], .5, 'The selected tab keeps a stronger background.');
      for (const name of ['selectedTool', 'color']) {
        assert.equal(children[name].background[3], 1, `${name} keeps its solid fill.`);
        assert.equal(children[name].opacity, 1);
      }
      assert(await page.locator('[data-nds-annotation-toolbar] > div').evaluateAll(elements =>
        elements.every(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)')));
      await pixelProof(page, theme, label);
      for (const selector of [targets.fullscreen, targets.notes, '[data-nds-tool="pan"]']) {
        await page.locator(selector).hover(); await settle(page);
        closeTo((await styles(page, { target: selector })).target.background[3], .85, 'Hover feedback stays visible.');
      }
      await page.mouse.move(4, 4); await settle(page);
      await page.keyboard.press('Tab'); await page.locator(targets.fullscreen).focus();
      const focused = (await styles(page)).fullscreen;
      assert(focused.outlineWidth >= 2 && focused.outline !== 'none', 'Keyboard focus remains visible.');
      await page.locator('[data-nds-tool="pan"]').click();
      assert.equal(await page.locator('[data-nds-tool="pan"]').getAttribute('aria-pressed'), 'true');
      await page.locator('[data-nds-tool="move"]').click();
      await page.locator('[data-nds-style-chevron]').click();
      await settle(page);
      const expanded = await styles(page, { chevron: '[data-nds-style-chevron][aria-expanded="true"]', menu: '[data-nds-style-popover]' });
      assert.equal(expanded.chevron.background[3], 1, 'An open style chevron keeps its selected blue fill.');
      assert.equal(expanded.menu.background[3], 1, 'Style menus are not made translucent.');
      assert(contrast(expanded.chevron.color, expanded.chevron.background) >= 4.5);
      await page.keyboard.press('Escape');
      await page.locator(targets.notes).click();
      assert.equal((await styles(page, { editor: '[data-nds-notes-panel]' })).editor.background[3], 1);
      await page.locator('[data-nds-notes-close]').click();
      await page.mouse.move(4, 4); await settle(page);
      assert.deepEqual((await styles(page)).toolbar.box, resting.toolbar.box, 'Changing chrome does not move controls.');
      if (evidence) await page.screenshot({ path: path.join(evidence, `${label}-${theme}.png`) });
    }
    console.log(`PASS ${label}: approved opacity/blur, visible transmitted pixels, solid foregrounds, readable themes, hover/focus and opaque menus/Notes`);
    await page.evaluate(() => window.__nds_themeStore.getState().setPref('light'));
    await page.locator(targets.fullscreen).click();
    await page.waitForFunction(() => document.fullscreenElement);
    await page.mouse.move(4, 4); await settle(page);
    const full = await styles(page, { fullscreen: targets.fullscreen, toolbar: targets.toolbar, tabs: targets.tabs });
    for (const value of Object.values(full)) closeTo(value.background[3], .45, 'Fullscreen retains transparency.');
    await page.locator(targets.fullscreen).click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await settle(page);
    await page.setViewportSize({ width: 1000, height: 850 }); await settle(page);
    assert(await page.locator('#nds-arm-open').evaluate(el => el.parentElement.matches('[data-nds-arm-menu]')));
    const grip = page.locator('[data-nds-dock-grip]');
    for (const [key, edge] of [['ArrowLeft', 'left'], ['ArrowDown', 'bottom'], ['ArrowRight', 'right'], ['ArrowUp', 'top']]) {
      await grip.focus(); await page.keyboard.press(key); await settle(page);
      assert.equal(await page.locator(targets.toolbar).getAttribute('data-nds-dock'), edge);
      closeTo((await styles(page)).toolbar.background[3], .45, 'Every toolbar docking position keeps its translucency.');
    }
    await page.setViewportSize({ width: 1600, height: 1000 }); await settle(page);
    await page.mouse.move(4, 4);
    for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang); await settle(page);
      await expectSurfaces(page);
    }
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    const undo = page.locator('[data-nds-annotation-undo]');
    assert(await undo.isDisabled());
    await page.evaluate(() => window.__nds_tabsStore.getState().addStroke({
      id: 'undo-check', color: '#0369a1', width: 2, points: [{ x: 600, y: 410 }, { x: 640, y: 445 }],
    }));
    assert(await undo.isEnabled()); await undo.click(); assert(await undo.isDisabled());
    await page.locator('[data-nds-tab-add]').click();
    await page.locator(`[data-nds-tab="${first}"]`).click({ position: { x: 25, y: 17 } });
    await settle(page);
    assert.deepEqual(await savedDocument(page), saved, 'Tool styling and its interactions never enter the saved diagram.');
    console.log(`PASS ${label}: native fullscreen, compact File menu, all toolbar docks, eight languages, undo, tab creation and unchanged JSON`);
    await page.mouse.move(4, 4);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    assert(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches));
    await settle(page); await expectSurfaces(page, 1);
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    await page.emulateMedia({ forcedColors: 'active' }); await settle(page);
    assert(await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
    await expectSurfaces(page, 1);
    await page.emulateMedia({ forcedColors: 'none' }); await settle(page); await expectSurfaces(page);
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    assert.equal(hash(entry), originalHash);
    console.log(`PASS ${label}: reduced-transparency/forced-color accessibility, no browser errors and fully offline behavior`);
  } catch (error) {
    if (evidence) await page.screenshot({ path: path.join(evidence, `${label}-failure.png`) });
    throw error;
  } finally { await context.close(); }
}
(async () => {
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
  const browser = await chromium.launch();
  try {
    for (const [index, entry] of entries.entries()) await verify(browser, path.resolve(entry), index);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
