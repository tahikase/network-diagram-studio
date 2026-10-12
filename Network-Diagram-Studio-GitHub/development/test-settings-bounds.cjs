const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const panel = page => page.locator('[data-nds-settings-panel]');
const trigger = page => page.locator('[data-nds-settings-button]');
const body = page => panel(page).locator(':scope > .nds-scroll');
const settle = page => page.waitForTimeout(120);
const state = page => page.evaluate(() => {
  const store = window.__nds_diagramStore.getState(), tabs = window.__nds_tabsStore.getState();
  return JSON.stringify({ diagram: store.diagram, history: store.history, tabs: tabs.tabs, active: tabs.activeTabId });
});

async function bounds(page, label) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-nds-settings-panel]');
    if (!panel) return false;
    const p = panel.getBoundingClientRect();
    const c = document.querySelector('[data-nds-fullscreen-target]').getBoundingClientRect();
    const t = document.querySelector('[data-nds-tabbar]').getBoundingClientRect();
    const v = window.visualViewport;
    const left = v?.offsetLeft ?? 0, top = v?.offsetTop ?? 0;
    const right = Math.min(document.documentElement.clientWidth, left + (v?.width ?? innerWidth));
    const bottom = Math.min(document.documentElement.clientHeight, top + (v?.height ?? innerHeight));
    return p.width > 0 && p.height > 0 &&
      p.top >= c.top + 7 && p.top >= top + 7 &&
      p.bottom <= c.bottom - 7 && p.bottom <= t.top - 7 && p.bottom <= bottom - 7 &&
      p.left >= c.left + 7 && p.left >= left + 7 && p.right <= c.right - 7 && p.right <= right - 7;
  }, null, { timeout: 10000 });
  const measured = await panel(page).evaluate(element => {
    const box = element => element.getBoundingClientRect().toJSON();
    const scroller = element.querySelector(':scope > .nds-scroll');
    return { panel: box(element), title: box(element.firstElementChild), footer: box(element.lastElementChild),
      body: box(scroller), bodyOverflow: getComputedStyle(scroller).overflowY,
      bodyScrollHeight: scroller.scrollHeight, bodyClientHeight: scroller.clientHeight };
  });
  assert(measured.title.top >= measured.panel.top && measured.title.bottom <= measured.body.top + 1,
    label + ': heading stays above the scroll area');
  assert(measured.footer.bottom <= measured.panel.bottom && measured.footer.top >= measured.body.bottom - 1,
    label + ': version stays below the scroll area and inside Settings');
  assert.equal(measured.bodyOverflow, 'auto');
  assert(measured.bodyClientHeight > 0, label + ': Settings content remains usable');
  return measured;
}

async function openSettings(page) {
  if (!(await panel(page).count())) await trigger(page).click();
  await bounds(page, 'opened Settings');
}

async function layout(page, context, evidence, edition) {
  await openSettings(page);
  const initial = await state(page);
  const opening = await bounds(page, 'default placement');
  const button = await trigger(page).boundingBox();
  assert(Math.abs(opening.panel.right - (button.x + button.width)) < 1, 'normal placement remains aligned with the Settings button');
  for (const [width, height] of [[1440, 1400], [1440, 540], [1024, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await bounds(page, `${width} x ${height}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const collapsed of [false, true, false]) {
    await page.evaluate(collapsed => window.__nds_layoutStore.getState().setPaletteCollapsed(collapsed), collapsed);
    await bounds(page, 'palette layout change while Settings is open');
  }
  await page.evaluate(() => {
    const store = window.__nds_diagramStore.getState();
    store.selectNode(window.__settingsFixture);
  });
  await page.locator('[data-nds-property-panel]').waitFor();
  await bounds(page, 'open property inspector');
  await page.evaluate(() => window.__nds_layoutStore.getState().setNotesOpen(true));
  await bounds(page, 'Notes open');
  await page.evaluate(() => {
    window.__nds_layoutStore.getState().setNotesOpen(false);
    window.__nds_diagramStore.getState().selectNode(null);
  });
  const aside = page.locator('aside').filter({ has: page.locator('[data-nds-palette-accordion]') });
  for (const width of [520, 180, 300]) {
    const current = await aside.boundingBox();
    const handle = await aside.getByRole('separator').boundingBox();
    const x = handle.x + handle.width / 2, y = handle.y + 90;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + width - current.width, y, { steps: 10 });
    await page.mouse.up();
    assert.equal(await panel(page).count(), 1, 'pointer resizing keeps the existing Settings panel open');
    assert(Math.abs((await aside.boundingBox()).width - width) < 2, 'real pointer resizing still works');
    await openSettings(page);
    await bounds(page, `resized ${width}px palette`);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => window.__nds_diagramStore.getState().selectNode(window.__settingsFixture));
  const narrow = await bounds(page, 'Settings narrows to fit the drawing area');
  const canvas = await page.locator('[data-nds-fullscreen-target]').boundingBox();
  assert(narrow.panel.width <= canvas.width - 16 + 1);
  await page.evaluate(() => {
    window.__nds_diagramStore.getState().selectNode(null);
    window.__nds_layoutStore.getState().setPaletteCollapsed(true);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const cdp = await context.newCDPSession(page);
  try {
    for (const factor of [1.25, 1.5]) {
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: factor });
      await page.waitForFunction(factor => window.visualViewport.scale >= factor - .01, factor);
      await bounds(page, `visual viewport scale ${factor}`);
    }
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }
  await bounds(page, 'restored visual viewport');
  assert.equal(await state(page), initial, 'window/side-panel layout changes do not edit the diagram or history');
  if (evidence) await page.screenshot({ path: path.join(evidence, `${edition}-bounds.png`) });
}

async function scrollingAndControls(page, evidence, edition) {
  await page.setViewportSize({ width: 1440, height: 650 });
  await openSettings(page);
  const before = await state(page);
  const pinned = await bounds(page, 'short window');
  assert(pinned.bodyScrollHeight > pinned.bodyClientHeight, 'long Settings content scrolls internally');
  const wheelBox = await body(page).boundingBox();
  await page.mouse.move(wheelBox.x + wheelBox.width / 2, wheelBox.y + wheelBox.height / 2);
  await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => document.querySelector('[data-nds-settings-panel] > .nds-scroll').scrollTop > 0);
  const afterWheel = await bounds(page, 'native wheel inside Settings');
  assert.deepEqual(afterWheel.title, pinned.title);
  assert.deepEqual(afterWheel.footer, pinned.footer);
  for (const group of ['Tools', 'Editing', 'Tabs', 'Selection', 'Screenshot editor']) {
    await page.locator(`[data-nds-shortcut-group="${group}"]`).click();
    await bounds(page, 'expanded keyboard shortcut group');
    assert(await page.locator('[data-nds-shortcut]').count() > 0);
  }
  for (const group of ['Saving and sharing', 'Exporting a picture', 'Working faster', 'Working in the Notes']) {
    await page.locator(`[data-nds-guide-group="${group}"]`).click();
    await bounds(page, 'expanded guide group');
    assert(await page.locator('[data-nds-guide-item]').count() > 0);
  }
  await body(page).evaluate(element => { element.scrollTop = element.scrollHeight; });
  const lastControl = body(page).locator('button:visible, a:visible, input:visible').last();
  await lastControl.scrollIntoViewIfNeeded();
  const last = await lastControl.boundingBox();
  const bottom = await bounds(page, 'last Settings option');
  assert(last.y + last.height <= bottom.footer.top + 1, 'the last visible Settings control is reachable above the version');
  assert.match(await page.locator('[data-nds-feedback-link]').getAttribute('href'), /^https:\/\/forms\.cloud\.microsoft\//);
  if (await page.locator('[data-nds-feedback-header]').count()) {
    assert(await page.locator('[data-nds-feedback-header]').isVisible(), 'packaged Feedback remains in the header');
    assert(await page.locator('[data-nds-feedback-link]').isHidden(), 'its duplicate Settings link stays hidden');
    assert.match(await page.evaluate(() => window.ndsFeedback.url), /^https:\/\/forms\.cloud\.microsoft\//);
  } else {
    assert(await page.locator('[data-nds-feedback-link]').isVisible(), 'the source-only Feedback fallback remains reachable');
  }
  const name = page.locator('[data-nds-comment-name]');
  await name.fill('Sample Reviewer');
  assert.equal(await name.inputValue(), 'Sample Reviewer');
  for (const theme of ['dark', 'light']) {
    await page.locator(`[data-nds-theme-option="${theme}"]`).click();
    assert.equal(await page.locator(`[data-nds-theme-option="${theme}"]`).getAttribute('aria-checked'), 'true');
    await bounds(page, theme);
    if (evidence) await page.screenshot({ path: path.join(evidence, `${edition}-${theme}.png`) });
  }
  for (const language of ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko', 'en']) {
    await page.locator(`[data-nds-lang-option="${language}"]`).click();
    assert.equal(await page.locator(`[data-nds-lang-option="${language}"]`).getAttribute('aria-checked'), 'true');
    await bounds(page, language);
  }
  assert.equal(await state(page), before, 'Settings controls and scrolling leave diagram content/history untouched');
  await page.locator('[data-nds-updates-open="settings"]').click();
  await panel(page).waitFor({ state: 'hidden' });
  await page.locator('[data-nds-updates-dialog]').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'hidden' });
  assert(await trigger(page).evaluate(element => element === document.activeElement));
  await openSettings(page);
  await name.focus();
  assert(await name.evaluate(element => element === document.activeElement));
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'hidden' });
  await openSettings(page);
  const canvas = await page.locator('[data-nds-fullscreen-target]').boundingBox();
  await page.mouse.click(canvas.x + 40, canvas.y + 120);
  await panel(page).waitFor({ state: 'hidden' });
  await openSettings(page);
  const tab = page.locator('[data-nds-tab]').last();
  const tabId = await tab.getAttribute('data-nds-tab');
  await tab.click({ position: { x: 20, y: 20 } });
  await panel(page).waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId), tabId,
    'the exposed diagram tab receives a real pointer click while Settings is open');
  await openSettings(page);
  await trigger(page).click();
  await panel(page).waitFor({ state: 'hidden' });
  assert.equal(await trigger(page).getAttribute('aria-expanded'), 'false');
}

async function scrollingPage(page) {
  await page.setViewportSize({ width: 800, height: 650 });
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('de'));
  await openSettings(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(overflow, 'this fixture exercises the existing horizontally scrollable header');
  await page.evaluate(() => window.scrollTo(0, 0));
  await bounds(page, 'horizontal document scroll left');
  await page.evaluate(() => window.scrollTo(document.documentElement.scrollWidth, 0));
  await page.waitForFunction(() => window.scrollX > 0);
  await bounds(page, 'horizontal document scroll right');
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    window.__nds_i18nStore.getState().setLang('en');
    window.scrollTo(0, 0);
  });
}

async function main() {
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(process.env.NDS_BUNDLE || path.join(__dirname, '..', 'index.html'));
  const evidence = process.env.NDS_SETTINGS_EVIDENCE;
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    for (const entry of entries) {
      const development = /^https?:/.test(entry);
      const edition = development ? 'development' : path.basename(entry).startsWith('non_') ? 'non-production' : 'production';
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
      context.setDefaultTimeout(12000);
      await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
      await context.addInitScript(() => {
        localStorage.setItem('nds.lang', 'en');
        localStorage.setItem('nds.paletteWidth', '300');
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(development ? entry : pathToFileURL(path.resolve(entry)).href);
        await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_layoutStore);
        await page.evaluate(() => {
          window.__nds_i18nStore.getState().setLang('en');
          window.__nds_themeStore.getState().setPref('light');
          window.__nds_layoutStore.getState().setPaletteCollapsed(true);
          window.__nds_layoutStore.getState().setNotesOpen(false);
          for (let i = 0; i < 9; i++) window.__nds_tabsStore.getState().addTab();
          const store = window.__nds_diagramStore.getState();
          window.__settingsFixture = store.addNode('vm', { x: 180, y: 180 });
          store.selectNode(null);
        });
        await settle(page);
        await layout(page, context, evidence, edition);
        console.log(`PASS ${edition}: Settings clears toolbar/tabs, follows window and side-panel sizes, and fits the visual viewport`);
        await scrollingAndControls(page, evidence, edition);
        console.log(`PASS ${edition}: internal scrolling, pinned heading/version, all controls, eight languages and unchanged diagram/history`);
        await scrollingPage(page);
        assert.deepEqual(errors, []);
        console.log(`PASS ${edition}: viewport scrolling, outside click/Escape, Settings toggle and What's new handoff`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
