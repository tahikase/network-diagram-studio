const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const appMode = process.argv.includes('--edge-app');
const supplied = process.argv.slice(2).filter(value => value !== '--edge-app');
const entries = supplied.length ? supplied : [path.join(__dirname, '..', 'index.html')];
const output = process.env.NDS_DEMO_TEST_OUTPUT;
if (output) fs.mkdirSync(output, { recursive: true });

async function verify(entry, index) {
  entry = path.resolve(entry);
  assert.equal(path.basename(entry), 'index.html', 'This check targets the production project');
  const directory = path.dirname(entry);
  for (const file of ['demo.js', 'demo.css', 'walkthrough.mp4', 'poster.jpg'])
    assert(!fs.existsSync(path.join(directory, 'production_demo', file)), `${file} must not be packaged`);
  assert(fs.statSync(path.join(directory, 'production_demo', 'group-copy.js')).isFile());
  const retired = /production_demo\/(?:demo\.(?:js|css)|walkthrough\.mp4|poster\.jpg)/;
  assert.doesNotMatch(fs.readFileSync(entry, 'utf8'), retired);
  assert.doesNotMatch(fs.readFileSync(path.join(directory, 'Network Diagram Studio.bat'), 'utf8'),
    /demo\.js|demo\.css|walkthrough\.mp4|poster\.jpg/);
  const errors = [], network = [], playerRequests = [];
  const browser = appMode ? null : await chromium.launch();
  let context;
  try {
    const options = { locale: 'en-US', colorScheme: 'light', viewport: { width: 1440, height: 1000 } };
    context = appMode ? await chromium.launchPersistentContext('', {
      ...options, headless: false,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      args: [`--app=${pathToFileURL(entry).href}`],
    }) : await browser.newContext(options);
    await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
    await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version),
      require('./src/updates/release-history.json')[0].version);
    await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const page = appMode ? context.pages()[0] : await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (retired.test(request.url())) playerRequests.push(request.url()); });
    await page.goto(pathToFileURL(entry).href);
    await page.locator('#nds-arm-open').waitFor({ state: 'attached' });
    assert(await page.evaluate(() => typeof window.ndsProductionGroupCopy === 'function' &&
      typeof window.ndsProductionGroupPaste === 'function'), 'Shared copy/paste support remains loaded');
    const before = await page.evaluate(() => {
      const diagram = window.__nds_diagramStore.getState(), tabs = window.__nds_tabsStore.getState();
      return JSON.stringify({ diagram: diagram.diagram, history: diagram.history, tabs: tabs.tabs, active: tabs.activeTabId });
    });
    const trigger = page.locator('[data-nds-settings-button]');
    const absent = async () => {
      assert.equal(await page.locator('#nds-demo-settings-entry, #nds-demo-settings-open, #nds-demo-dialog, #nds-demo-video').count(), 0);
      assert(await page.locator('[data-nds-guide="1"]').isVisible(), 'The Guide remains available in Settings');
    };
    await trigger.click();
    for (const theme of ['light', 'dark']) {
      await page.locator(`[data-nds-theme-option="${theme}"]`).click();
      for (const language of ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko', 'en']) {
        await page.locator(`[data-nds-lang-option="${language}"]`).click();
        await page.waitForTimeout(60);
        await absent();
      }
      if (output) await page.screenshot({ path: path.join(output, `${index}-production-settings-${theme}.png`) });
    }
    await page.keyboard.press('Escape');
    await page.locator('[data-nds-settings-panel]').waitFor({ state: 'hidden' });
    await trigger.click();
    await absent();
    assert.equal(await page.evaluate(() => {
      const diagram = window.__nds_diagramStore.getState(), tabs = window.__nds_tabsStore.getState();
      return JSON.stringify({ diagram: diagram.diagram, history: diagram.history, tabs: tabs.tabs, active: tabs.activeTabId });
    }), before, 'Settings changes leave diagram content, tabs and history unchanged');
    assert.deepEqual(errors, []); assert.deepEqual(network, []); assert.deepEqual(playerRequests, []);
    console.log('PASS retired Settings video: no player/media/launcher references, eight languages, both themes, Guide, copy/paste and offline operation');
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

(async () => {
  for (let index = 0; index < entries.length; index++) await verify(entries[index], index);
})().catch(error => { console.error(error); process.exitCode = 1; });
