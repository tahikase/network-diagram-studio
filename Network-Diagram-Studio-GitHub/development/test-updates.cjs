const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const releases = require('./src/updates/release-history.json');
const dictionary = require('./src/i18n/strings-updates.json');
const nonpublicReleases = require('./releases/release-records.json').filter(record => ['fix', 'internal'].includes(record.kind));
const productCategories = ['New feature', 'Appearance', 'Usability', 'Performance'];
assert(releases.every(release => productCategories.includes(release.category)), 'Only new product updates belong in public history');
const key = 'nds.updates.seen.v1';
const evidence = process.env.NDS_UPDATES_EVIDENCE;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const settle = page => page.waitForTimeout(250);
const fixture = {
  version: 1, meta: { title: 'Release history regression', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes: [
    { id: 'vm-a', type: 'vm', position: { x: 80, y: 100 }, size: { w: 240, h: 170 }, data: { name: 'Sample server A', fields: {} } },
    { id: 'vm-b', type: 'vm', position: { x: 440, y: 100 }, size: { w: 240, h: 170 }, data: { name: 'Sample server B', fields: {} } },
  ],
  edges: [{ id: 'link', source: 'vm-a', target: 'vm-b', kind: 'backend', label: 'HTTPS 443' }],
  shapes: [{ id: 'sample-note', kind: 'rect', x: 100, y: 330, w: 250, h: 100, width: 2, color: '#0078d4', fillOpacity: 0, text: 'Synthetic example', textSize: 16 }],
  annotations: [], strokes: [], notes: 'Synthetic regression data only.', comments: [], images: [],
};
async function snapshot(page) {
  return page.evaluate(() => {
    const diagram = window.__nds_diagramStore.getState(), tabs = window.__nds_tabsStore.getState(), tools = window.__nds_annotationStore.getState();
    return JSON.stringify({ diagram: diagram.diagram, history: diagram.history, selected: diagram.selectedNodeIds,
      selectedEdge: diagram.selectedEdgeId, tabs: tabs.tabs, active: tabs.activeTabId, shapes: tools.selectedShapeIds, tool: tools.tool,
      viewport: document.querySelector('.react-flow__viewport').style.transform });
  });
}
async function saved(page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
  const chunks = [];
  for await (const chunk of await (await download).createReadStream()) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (data.meta) delete data.meta.updatedUtc;
  return data;
}
async function checkPresentation(page) {
  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = color => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const values = [...context.getImageData(0, 0, 1, 1).data]; return [...values.slice(0, 3), values[3] / 255];
    };
    const panel = rgba(getComputedStyle(document.querySelector('[data-nds-updates-dialog]')).backgroundColor);
    const pairs = [
      ['.nds-updates-heading h1', '.nds-updates-heading'],
      ['.nds-updates-description', '[data-nds-updates-dialog]'],
      ['.nds-updates-version', '.nds-updates-version'],
      ['.nds-updates-note', '[data-nds-updates-dialog]'],
      ['.nds-updates-image-heading[data-phase="after"] strong', '.nds-updates-image-heading[data-phase="after"]'],
      ['.nds-updates-enlarge', '.nds-updates-enlarge'],
    ].map(([selector, surface]) => {
      const foreground = rgba(getComputedStyle(document.querySelector(selector)).color);
      const background = rgba(getComputedStyle(document.querySelector(surface)).backgroundColor);
      return { selector, foreground, background: background.slice(0, 3).map((value, index) => value * background[3] + panel[index] * (1 - background[3])) };
    });
    const titles = [...document.querySelectorAll('.nds-updates-release h2')].map(element => {
      const css = getComputedStyle(element); return [css.fontFamily, css.fontSize, css.fontWeight, css.lineHeight, css.color].join('|');
    });
    return { pairs, titles };
  });
  const luminance = color => color.slice(0, 3).map(value => value / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  for (const pair of result.pairs) {
    const foreground = luminance(pair.foreground), background = luminance(pair.background);
    const contrast = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    assert(contrast >= 4.5, `${pair.selector}: text contrast ${contrast.toFixed(2)} must be at least 4.5:1.`);
  }
  assert.equal(new Set(result.titles).size, 1, 'All release entries must share one presentation.');
}
async function geometry(page, width, height) {
  await page.setViewportSize({ width, height }); await settle(page);
  const box = await page.locator('[data-nds-updates-dialog]').boundingBox();
  const expectedWidth = width <= 640 ? width - 24 : Math.min(960, width - 48);
  const expectedHeight = width <= 640 ? height - 32 : Math.min(760, height * .8);
  assert(Math.abs(box.width - expectedWidth) < 1 && Math.abs(box.height - expectedHeight) < 1, JSON.stringify(box));
  assert(Math.abs(box.x - (width - box.width) / 2) < 1 && Math.abs(box.y - (height - box.height) / 2) < 1,
    `The window must stay centered in ${width}x${height}: ${JSON.stringify(box)}`);
  assert(await page.locator('[data-nds-updates-dialog]').evaluate(el => el.scrollWidth <= el.clientWidth));
  return box;
}
async function verify(browser, entry) {
  const beforeHash = hash(entry), edition = path.basename(entry).startsWith('non_') ? 'non-production' : 'production';
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'en-US', acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  const page = await context.newPage(), errors = [], network = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  try {
    await page.goto(pathToFileURL(entry).href);
    await page.waitForFunction(() => window.__nds_tabsStore && document.querySelector('[data-nds-updates-open="palette"]'));
    await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'visible' });
    const openedAt = Date.now();
    await page.waitForTimeout(800);
    const automaticState = await snapshot(page);
    await page.waitForTimeout(2200);
    assert(await page.locator('[data-nds-updates-dialog]').isVisible(), 'The preview must not disappear before five seconds.');
    await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'detached' });
    assert(Date.now() - openedAt >= 4600 && Date.now() - openedAt < 8000, 'The idle preview closes after about five visible seconds.');
    assert.equal(await snapshot(page), automaticState, 'Automatic preview and dismissal preserve the diagram and editing state.');
    assert.equal(await page.locator('[data-nds-updates-unread]').count(), 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), releases[0].version);
    await page.evaluate(file => {
      const loaded = window.__nds_tabsStore.getState().loadStudioFile(JSON.stringify(file));
      if (!loaded.ok || loaded.dropped) throw new Error(JSON.stringify(loaded));
      window.__nds_diagramStore.getState().selectNode('vm-a');
      window.__nds_diagramStore.getState().updateNodeName('vm-a', 'Updated sample server');
    }, fixture);
    await page.waitForTimeout(800);
    const dataBefore = await saved(page), stateBefore = await snapshot(page);
    await page.locator('[data-nds-updates-open="palette"]').click();
    await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'visible' });
    const large = await geometry(page, 1600, 1000);
    assert.equal(large.width, 960); assert.equal(large.height, 760);
    assert.equal(await page.locator('[data-nds-updates-unread]').count(), 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), releases[0].version);
    assert.deepEqual(await page.locator('[data-nds-release-version]').evaluateAll(elements => elements.map(el => el.dataset.ndsReleaseVersion)),
      releases.map(release => release.version));
    assert.equal(await page.locator('.nds-updates-heading p').innerText(),
      `Latest v${releases[0].version} | ${releases.length} releases`, 'Latest refers to product updates, not bug-fix or maintenance build versions.');
    assert.deepEqual(await page.locator('.nds-updates-meta > span:nth-child(2)').allTextContents(),
      releases.map(release => release.category), 'Only product categories are rendered, never Fix');
    for (const release of nonpublicReleases) {
      assert.equal(await page.locator(`[data-nds-release-version="${release.version}"]`).count(), 0);
      assert.equal(await page.locator(`[data-nds-updates-jump] option[value="${release.version}"]`).count(), 0);
    }
    assert(await page.evaluate(async () => {
      const images = [...document.querySelectorAll('[data-nds-updates-dialog] img')];
      await Promise.all(images.map(img => img.decode()));
      return images.every(img => img.naturalWidth >= 100 && img.src.startsWith('data:image/png;base64,'));
    }));
    for (const combo of ['Control+d', 'Control+z', 'Control+y', 'Control+c', 'Control+v', 'Delete', 'Backspace', 'v', 'p', 'r']) {
      await page.locator('[data-nds-updates-close]').focus(); await page.keyboard.press(combo);
    }
    assert.equal(await snapshot(page), stateBefore, 'Viewing history must not edit the diagram, selection, tools, tabs, view or undo stack.');
    const header = await page.locator('.nds-updates-heading').boundingBox();
    const footer = await page.locator('.nds-updates-footer').boundingBox();
    await page.locator('[data-nds-updates-jump]').selectOption(releases.at(-1).version);
    await page.waitForTimeout(750);
    assert.equal(await page.locator('[data-nds-updates-jump]').inputValue(), releases.at(-1).version);
    assert(await page.locator('[data-nds-updates-scroll]').evaluate(el => el.scrollTop > 0));
    await page.locator('[data-nds-updates-scroll]').focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(500);
    assert(await page.locator('[data-nds-updates-scroll]').evaluate(el => el.scrollTop > 0 && Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 2));
    assert.deepEqual(await page.locator('.nds-updates-heading').boundingBox(), header);
    assert.deepEqual(await page.locator('.nds-updates-footer').boundingBox(), footer);
    const imageButton = page.locator(`[data-nds-release-version="${releases.at(-1).version}"] [data-nds-release-image="after"] button`);
    await imageButton.click();
    assert(await page.locator('[data-nds-updates-image-preview]').isVisible());
    await page.locator('[data-nds-updates-phase="before"]').click();
    assert(await page.locator('[data-nds-updates-image-preview] img').evaluate(img => img.complete && img.naturalWidth > 0));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nds-updates-image-preview]').count(), 0);
    assert(await imageButton.evaluate(el => el === document.activeElement));
    assert.equal(await page.locator('[data-nds-updates-jump]').inputValue(), releases.at(-1).version);
    await page.locator('[data-nds-updates-done]').focus(); await page.keyboard.press('Tab');
    assert(await page.locator('[data-nds-updates-close]').evaluate(el => el === document.activeElement));
    await page.keyboard.press('Shift+Tab');
    assert(await page.locator('[data-nds-updates-done]').evaluate(el => el === document.activeElement));
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.__nds_themeStore.getState().setPref(value), theme);
      await page.locator('[data-nds-updates-jump]').selectOption(releases[0].version); await page.waitForTimeout(700);
      assert(await page.locator('[data-nds-updates-dialog]').evaluate(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'));
      await checkPresentation(page);
      if (evidence) await page.screenshot({ path: path.join(evidence, `${edition}-${theme}.png`) });
    }
    for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(value => window.__nds_i18nStore.getState().setLang(value), language);
      assert.equal(await page.locator('.nds-updates-heading h1').textContent(), language === 'en' ? "What's new" : dictionary["What's new"][language]);
      assert.equal(await page.locator('[data-nds-release-version]').first().locator('h2').textContent(),
        language === 'en' ? releases[0].title : dictionary[releases[0].title][language]);
      await geometry(page, 390, 844);
      assert(await page.locator('[data-nds-updates-scroll]').evaluate(el => el.scrollWidth <= el.clientWidth));
      await geometry(page, 1600, 1000);
    }
    await page.evaluate(() => { window.__nds_i18nStore.getState().setLang('en'); window.__nds_themeStore.getState().setPref('light'); });
    await geometry(page, 1440, 900);
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await page.locator('[data-nds-updates-jump]').selectOption(releases.at(-1).version);
    await settle(page);
    assert(await page.locator('[data-nds-updates-scroll]').evaluate(el => el.scrollTop > 0));
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0);
    assert(await page.locator('[data-nds-updates-open="palette"]').evaluate(el => el === document.activeElement));
    await geometryViewportOnly(page);
    assert.equal(await snapshot(page), stateBefore);
    assert.deepEqual(await saved(page), dataBefore, 'Save JSON stays current-diagram-only and contains no release-history state.');
    await page.locator('[data-nds-settings-button]').click();
    await page.locator('[data-nds-updates-open="settings"]').click();
    assert(await page.locator('[data-nds-updates-dialog]').isVisible());
    assert.equal(await page.locator('[data-nds-settings-panel]').count(), 0);
    await page.keyboard.press('Escape');
    assert(await page.locator('[data-nds-settings-button]').evaluate(el => el === document.activeElement));
    await page.reload();
    await page.waitForSelector('[data-nds-updates-open="palette"]');
    assert.equal(await page.locator('[data-nds-updates-unread]').count(), 0);
    for (const seen of [releases[0].version, ...nonpublicReleases.map(release => release.version)]) {
      const unread = releases[0].version.localeCompare(seen, 'en', { numeric: true }) > 0;
      await page.evaluate(([key, seen]) => {
        localStorage.setItem(key, seen);
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: seen }));
      }, [key, seen]);
      await page.waitForFunction(expected => !!document.querySelector('[data-nds-updates-unread]') === expected, unread);
      assert.equal((await page.locator('[data-nds-updates-unread]').count()) > 0, unread,
        'Only a newer product release creates a badge, including after bug-fix and maintenance versions.');
      assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0,
        'A preference change during drawing never automatically interrupts the active session.');
      await page.reload(); await page.waitForSelector('[data-nds-updates-open="palette"]');
      if (unread) {
        await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), releases[0].version,
          'Opening a newer product release previews it once and remembers that version.');
        await page.keyboard.press('Escape');
        await page.reload(); await page.waitForSelector('[data-nds-updates-open="palette"]');
        await settle(page);
        assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0, 'Seen product updates do not reopen on reload.');
      } else {
        await settle(page);
        assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0,
          'Equal or newer seen versions never trigger an automatic announcement.');
        await page.locator('[data-nds-updates-open="palette"]').click();
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), seen,
          'Withdrawing a later bug-fix announcement never rolls back the remembered seen version');
        await page.keyboard.press('Escape');
      }
    }
    await page.evaluate(key => localStorage.setItem(key, '0.9.114'), key);
    await page.reload(); await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.evaluate(key => localStorage.setItem(key, '99.0.0'), key);
    await page.reload(); await page.waitForSelector('[data-nds-updates-open="palette"]');
    assert.equal(await page.locator('[data-nds-updates-unread]').count(), 0, 'A downgrade does not announce an old release as new.');
    await page.locator('[data-nds-updates-open="palette"]').click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '99.0.0');
    await page.keyboard.press('Escape');
    await page.locator('[data-nds-fullscreen]').click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.locator('[data-nds-updates-open="palette"]').evaluate(el => el.click());
    assert(await page.locator('[data-nds-updates-dialog]').isVisible());
    await geometry(page, 1600, 1000);
    await page.locator('[data-nds-updates-close]').click();
    await page.evaluate(() => document.exitFullscreen());
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    assert.equal(hash(entry), beforeHash);
    console.log(`PASS ${edition}: smaller centered history, native images, scrolling, enlargement, focus, eight languages, themes and fullscreen`);
    console.log(`PASS ${edition}: unchanged editing/JSON, Settings reopening, unread persistence, upgrades, downgrades and offline operation`);
    console.log(`PASS ${edition}: no bug-fix/internal cards or jump options; unread and seen versions follow product updates only`);
  } finally { await context.close(); }
}
async function geometryViewportOnly(page) {
  await page.setViewportSize({ width: 1600, height: 1000 }); await settle(page);
}
async function storageFailure(browser, entry) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  await context.addInitScript(key => {
    localStorage.setItem('nds.lang', 'en');
    const originalGet = Storage.prototype.getItem, originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) { if (name === key) throw new DOMException('Storage denied', 'SecurityError'); return originalGet.call(this, name); };
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Storage denied', 'SecurityError'); return originalSet.call(this, name, value); };
  }, key);
  const page = await context.newPage(), warnings = [], errors = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(pathToFileURL(entry).href);
    await page.waitForSelector('[data-nds-updates-open="palette"]');
    await settle(page);
    assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0,
      'Unread preference failures must not create repeated automatic popups.');
    await page.locator('[data-nds-updates-open="palette"]').click();
    assert(await page.locator('.nds-updates-warning').isVisible());
    assert(warnings.some(message => message.includes('could not read the viewed release version')));
    assert(warnings.some(message => message.includes('could not save the viewed release version')));
    assert.deepEqual(errors, []);
    console.log(`PASS ${path.basename(entry)}: blocked preference storage is reported without breaking history`);
  } finally { await context.close(); }
}

async function automaticInteractions(browser, entry) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const dialog = page.locator('[data-nds-updates-dialog]');
  try {
    await page.goto(pathToFileURL(entry).href);
    await dialog.waitFor({ state: 'visible' });
    for (const action of ['keyboard', 'scroll', 'image']) {
      if (action !== 'keyboard') {
        await page.evaluate(([key, previous]) => localStorage.setItem(key, previous), [key, releases[1].version]);
        await page.reload();
        await dialog.waitFor({ state: 'visible' });
      }
      if (action === 'keyboard') await page.keyboard.press('Tab');
      if (action === 'scroll') {
        const box = await page.locator('[data-nds-updates-scroll]').boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 160);
      }
      if (action === 'image') {
        await page.locator('[data-nds-release-version]').first().locator('[data-nds-release-image="after"] button').click();
        await page.locator('[data-nds-updates-image-preview]').waitFor({ state: 'visible' });
      }
      await page.waitForTimeout(5400);
      assert(await dialog.isVisible(), `${action} interaction cancels auto-close for continued reading.`);
      if (action === 'image') await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
    }
    await page.locator('[data-nds-updates-open="palette"]').click();
    await page.waitForTimeout(5400);
    assert(await dialog.isVisible(), 'Manually opened history has no auto-close timer.');
    await page.keyboard.press('Escape');
    await page.evaluate(([key, previous]) => localStorage.setItem(key, previous), [key, releases[1].version]);
    await page.reload();
    await dialog.waitFor({ state: 'visible' });
    await page.waitForTimeout(1800);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(5400);
    assert(await dialog.isVisible(), 'Time in a hidden tab does not dismiss the preview.');
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1500);
    assert(await dialog.isVisible(), 'The remaining visible time continues after returning to the tab.');
    await dialog.waitFor({ state: 'detached', timeout: 2300 });
    console.log('PASS automatic updates: keyboard/scroll/image interaction, untimed manual viewing and visible-tab countdown');
  } finally { await context.close(); }
}

async function occupiedStartup(browser, entry) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const dialog = document.createElement('dialog');
      dialog.dataset.startupFixture = '1';
      document.body.append(dialog);
      dialog.showModal();
    }, { once: true });
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(entry).href);
    await page.waitForSelector('[data-nds-updates-open="palette"]');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('[data-startup-fixture][open]').count(), 1);
    assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0,
      'Automatic history never interrupts another startup dialog.');
    assert(await page.locator('[data-nds-updates-unread]').isVisible());
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null,
      'A skipped announcement is not marked as seen.');
    await page.locator('[data-startup-fixture]').evaluate(dialog => { dialog.close(); dialog.remove(); });
    await settle(page);
    assert.equal(await page.locator('[data-nds-updates-dialog]').count(), 0,
      'The startup offer is not retried while the user is already working.');
    await page.locator('[data-nds-updates-open="palette"]').click();
    assert(await page.locator('[data-nds-updates-dialog]').isVisible());
    console.log('PASS automatic updates: occupied startup is not interrupted and unread history remains available');
  } finally { await context.close(); }
}
async function main() {
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const entries = process.argv.slice(2).length ? process.argv.slice(2).map(file => path.resolve(file))
    : [path.join(__dirname, '..', 'index.html')];
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  try { for (const entry of entries) {
    await verify(browser, entry);
    await automaticInteractions(browser, entry);
    await occupiedStartup(browser, entry);
    await storageFailure(browser, entry);
  } }
  finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
