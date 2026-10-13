const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const snapshot = page => page.evaluate(() => JSON.stringify({
  diagram: window.__nds_diagramStore.getState().diagram,
  undo: window.__nds_undoRouter.snapshot(),
  selected: window.__nds_diagramStore.getState().selectedNodeId,
}));

function template() {
  return {
    contentVersion: '1.0.0.0',
    resources: [{
      type: 'Microsoft.Network/virtualNetworks', apiVersion: '2024-05-01',
      name: 'vnet-example', location: 'eastus',
      properties: {
        addressSpace: { addressPrefixes: ['10.50.0.0/16'] },
        subnets: [{ name: 'app', properties: { addressPrefix: '10.50.1.0/24' } }],
      },
    }],
  };
}

async function choose(page, opener, keyboard = false, filename = 'template.json') {
  const choosing = page.waitForEvent('filechooser');
  if (keyboard) {
    await page.locator(opener).focus();
    await page.locator(opener).press('Enter');
  } else {
    await page.locator(opener).click();
  }
  await (await choosing).setFiles({
    name: filename, mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(template())),
  });
}

async function openARM(page) {
  await page.locator('#nds-arm-open').click();
  assert(await page.locator('#nds-arm-dialog').evaluate(el => el.open));
  await choose(page, '#nds-arm-choose');
  await page.locator('#nds-arm-group').fill('rg-example');
}

async function verify(target) {
  const remote = /^https?:/.test(target);
  const url = remote ? target : pathToFileURL(path.resolve(target)).href;
  const directory = path.dirname(path.resolve(target));
  const files = remote ? [] : [path.resolve(target),
    path.join(directory, 'production_arm', 'import.js'),
    path.join(directory, 'production_arm', 'import.css')];
  const hashes = files.map(hash);
  if (!remote) {
    for (const name of ['import-demo.mp4', 'import-demo.jpg']) {
      assert(!fs.existsSync(path.join(directory, 'production_arm', name)), 'Retired ARM media is not packaged or installed');
    }
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version),
    require('./src/updates/release-history.json')[0].version);
  const page = await context.newPage(), errors = [], requests = [], media = [];
  let chooserCount = 0;
  page.on('filechooser', () => { chooserCount++; });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => {
    if (/import-demo\.(mp4|jpg)/.test(request.url())) media.push(request.url());
  });
  await context.route(/^https?:/, route => {
    if (remote && new URL(route.request().url()).origin === new URL(url).origin) return route.continue();
    requests.push(route.request().url());
    return route.abort();
  });
  try {
    await page.goto(url);
    await page.locator('#nds-arm-open').waitFor();
    await page.getByRole('textbox', { name: 'Search the whole palette' }).fill('group virtual network');
    await page.locator('[data-nds-search-hit-kind="resource"]').first().click();
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 1);
    const before = await snapshot(page);
    const camera = await page.locator('.react-flow__viewport').getAttribute('style');
    await page.locator('#nds-arm-open').click();
    assert(await page.locator('#nds-arm-dialog').evaluate(el => el.open));
    assert.equal(chooserCount, 0, 'Import ARM opens instructions without a blocking file picker');
    assert.equal(await page.locator('#nds-arm-filename').textContent(), 'No file selected');
    assert(await page.locator('#nds-arm-start').isDisabled());
    assert.equal(await page.locator('#nds-arm-dialog video, .nds-arm-demo').count(), 0, 'The complete demo panel is absent');
    await page.locator('#nds-arm-file').dispatchEvent('cancel');
    assert(await page.locator('#nds-arm-dialog').evaluate(el => el.open), 'Cancelling an empty file selection leaves the dialog open');
    await page.locator('#nds-arm-choose').focus();
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Delete');
    assert.equal(await snapshot(page), before, 'Dialog keys do not undo or delete the selected resource');
    assert.equal(await page.locator('.react-flow__viewport').getAttribute('style'), camera);

    const fileTitles = new Set(), fileHelp = new Set();
    for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(language => window.__nds_i18nStore.getState().setLang(language), language);
      fileTitles.add(await page.locator('#nds-arm-file-title').textContent());
      fileHelp.add(await page.locator('#nds-arm-file-help').textContent());
      assert(await page.locator('#nds-arm-choose svg[aria-hidden="true"]').isVisible());
      const steps = await page.locator('#nds-arm-export li').allTextContents();
      assert.equal(steps.length, 5);
      assert.equal(steps[4], 'template.json', `${language}: Step 5 is only template.json`);
      assert.deepEqual([steps[0], steps[1], steps[3]], [
        'Azure Portal', 'Resource groups', 'Automation \u2192 Export template \u2192 ARM Template \u2192 Download',
      ], 'The unchanged Portal labels and export path are preserved');
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
        for (const width of [1440, 375]) {
          await page.setViewportSize({ width, height: 960 });
          const bounds = await page.locator('#nds-arm-dialog').evaluate(dialog => {
            const box = dialog.getBoundingClientRect();
            const card = dialog.querySelector('.nds-arm-file').getBoundingClientRect();
            const button = dialog.querySelector('#nds-arm-choose').getBoundingClientRect();
            const filename = dialog.querySelector('#nds-arm-filename').getBoundingClientRect();
            return { overflow: dialog.scrollWidth > dialog.clientWidth + 1,
              width: box.width, withinViewport: box.left >= 0 && box.right <= innerWidth + 1,
              columns: getComputedStyle(dialog.querySelector('.nds-arm-layout')).gridTemplateColumns.split(' ').length,
              selectionContained: button.left >= card.left && button.right <= card.right + 1
                && filename.left >= card.left && filename.right <= card.right + 1,
              buttonHeight: button.height };
          });
          assert(!bounds.overflow && bounds.withinViewport && bounds.width <= 620, `${language}/${theme}/${width}: ${JSON.stringify(bounds)}`);
          assert.equal(bounds.columns, 1, 'Compact dialog has only one column');
          assert(bounds.selectionContained && bounds.buttonHeight >= 44);
        }
      }
    }
    assert.equal(fileTitles.size, 8);
    assert.equal(fileHelp.size, 8);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.evaluate(() => {
      window.__nds_i18nStore.getState().setLang('en');
      window.__nds_themeStore.getState().setPref('light');
    });
    console.log('PASS ARM import: demo removed, compact single column, exact Step 5, eight languages and both themes');

    await choose(page, '#nds-arm-choose', true, 'template-with-a-long-unbroken-resource-group-name-' + 'a'.repeat(120) + '.json');
    assert.equal(chooserCount, 1, 'Only Choose template.json opens the file picker');
    await page.setViewportSize({ width: 375, height: 960 });
    assert(await page.locator('#nds-arm-filename').evaluate(filename => {
      const card = filename.closest('.nds-arm-file').getBoundingClientRect();
      const bounds = filename.getBoundingClientRect();
      return bounds.left >= card.left && bounds.right <= card.right + 1
        && filename.scrollWidth <= filename.clientWidth + 1
        && bounds.height > parseFloat(getComputedStyle(filename).lineHeight) * 2;
    }), 'Long selected filenames wrap within the small-screen panel');
    await page.setViewportSize({ width: 1440, height: 960 });
    const filename = await page.locator('#nds-arm-filename').textContent();
    await page.locator('#nds-arm-file').dispatchEvent('cancel');
    assert(await page.locator('#nds-arm-dialog').evaluate(el => el.open));
    assert.equal(await page.locator('#nds-arm-filename').textContent(), filename);
    await page.keyboard.press('Escape');
    assert(await page.locator('#nds-arm-open').evaluate(el => document.activeElement === el));
    await openARM(page);
    assert(await page.locator('#nds-arm-start').isEnabled());
    const originalId = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    const original = await page.evaluate(() => structuredClone(window.__nds_diagramStore.getState().diagram.nodes));
    await page.locator('#nds-arm-start').click();
    await page.waitForFunction(() => document.getElementById('nds-arm-percent').textContent === '100%', null, { timeout: 30000 });
    assert(await page.evaluate(id => {
      const tabs = window.__nds_tabsStore.getState();
      return tabs.activeTabId !== id && window.__nds_diagramStore.getState().diagram.nodes.length >= 2;
    }, originalId));
    const preserved = await page.evaluate(id => window.__nds_tabsStore.getState().tabs.find(tab => tab.id === id).diagram.nodes, originalId);
    assert.deepEqual(preserved, original);
    await page.locator('#nds-arm-cancel').click();
    await page.locator('[data-nds-updates-open="palette"]').click();
    await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-nds-release-version="0.9.133"]').count(), 0, 'Demo announcement is withdrawn');
    assert.equal(await page.locator('[data-nds-release-version="0.9.136"]').count(), 0, 'Removal and correction create no announcement');
    assert.equal(await page.locator('[data-nds-release-version="0.9.135"]').count(), 1, 'Other genuine updates are preserved');
    await page.locator('[data-nds-updates-close]').click();
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'Import remains offline');
    assert.deepEqual(media, [], 'No retired ARM media is requested');
    assert.deepEqual(files.map(hash), hashes, 'Tests never rewrite installed or staged assets');
    console.log('PASS ARM import: explicit keyboard file selection, cancellation, close/reopen, unchanged original tab and real offline import');
    console.log('PASS ARM import: withdrawn demo announcement, unchanged remaining history and no new announcement');
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = { template, openARM };
if (require.main === module) verify(process.argv[2] || path.join(__dirname, '..', 'index.html'))
  .catch(error => { console.error(error); process.exitCode = 1; });
