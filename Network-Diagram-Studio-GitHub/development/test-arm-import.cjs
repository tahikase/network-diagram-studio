const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const vm = require('node:vm');

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

function verifyEngine(file) {
  const sandbox = { TextEncoder };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  const engine = sandbox.ndsArmEngine();
  const sub = '11111111-1111-1111-1111-111111111111';
  const otherSub = '22222222-2222-2222-2222-222222222222';
  const id = (group, name = 'vnet-example', subscription = sub) =>
    `/subscriptions/${subscription}/resourceGroups/${group}/providers/Microsoft.Network/virtualNetworks/${name}`;
  const input = (value, group, subscription = '') => ({
    raw: typeof value === 'string' ? value : JSON.stringify(value), resourceGroupName: group, subscriptionId: subscription,
  });
  const linked = (group, peer, literal = false) => {
    const value = template();
    if (literal) value.resources[0].id = id(group);
    value.resources[0].properties.virtualNetworkPeerings = [{
      name: 'to-peer', properties: { remoteVirtualNetwork: { id: id(peer) } },
    }];
    return value;
  };
  const single = engine.convert(JSON.stringify(template()), { resourceGroupName: 'rg-single' });
  assert.equal(single.diagram.nodes.length, 3, 'Existing single-template conversion stays available');
  const combined = engine.convert([input(linked('rg-hub', 'rg-spoke'), 'rg-hub', sub),
    input(linked('rg-spoke', 'rg-hub'), 'rg-spoke', sub)]);
  assert.equal(combined.diagram.nodes.filter(node => node.type === 'group-rg').length, 2);
  assert.equal(combined.diagram.nodes.filter(node => node.type === 'group-subnet').length, 2,
    'Same type/name subnets in separate files are not merged');
  assert.equal(combined.diagram.edges.filter(edge => edge.kind === 'peering').length, 1,
    'Exact scoped reciprocal peering references produce one combined edge');
  assert.equal(new Set(combined.diagram.nodes.map(node => node.id)).size, combined.diagram.nodes.length);
  assert(combined.diagram.notes.includes('Template 2:'), 'Combined findings persist in Notes');
  assert.equal(combined.report.templates[0].resourceCount, 1);
  const noScopes = engine.convert([input(linked('rg-hub', 'rg-spoke'), 'rg-hub'),
    input(linked('rg-spoke', 'rg-hub'), 'rg-spoke')]);
  assert.equal(noScopes.diagram.edges.length, 0, 'Reference subscriptions are never assumed to host the exported group');
  assert(noScopes.report.warnings.some(warning => warning.includes('scope is unproved')));
  const exact = engine.convert([input(linked('rg-hub', 'rg-spoke', true), 'rg-hub'),
    input(linked('rg-spoke', 'rg-hub', true), 'rg-spoke')]);
  assert.equal(exact.diagram.edges.filter(edge => edge.kind === 'peering').length, 1,
    'Literal exported IDs can establish exact scope without manual subscriptions');
  const crossSubscription = engine.convert([input(template(), 'rg-same', sub), input(template(), 'rg-same', otherSub)]);
  assert.equal(crossSubscription.diagram.nodes.filter(node => node.type === 'group-vnet').length, 2,
    'Identically named groups in different supplied subscriptions stay separate');
  const isolated = ['alpha', 'beta'].map((name, index) => {
    const value = template();
    value.variables = { vnet: name, prefix: `10.${60 + index}.0.0/16` };
    value.resources[0].name = "[variables('vnet')]";
    value.resources[0].properties.addressSpace.addressPrefixes = ["[variables('prefix')]"];
    return input(value, 'rg-' + name);
  });
  const isolatedResult = engine.convert(isolated);
  const vnets = isolatedResult.diagram.nodes.filter(node => node.type === 'group-vnet');
  assert.deepEqual(Array.from(vnets, node => node.data.name), ['alpha', 'beta'], 'Variable caches stay isolated per template');
  assert(vnets[0].data.fields.cidr !== vnets[1].data.fields.cidr, 'Network properties resolve in the owning file');
  const local = template();
  local.resources.push({ type: 'Microsoft.Network/networkInterfaces', name: 'nic', properties: {
    ipConfigurations: [{ name: 'ip', properties: { subnet: { id: "[resourceId('Microsoft.Network/virtualNetworks/subnets','vnet-example','app')]" } } }],
  } }, { type: 'Microsoft.Compute/virtualMachines', name: 'vm', properties: {
    networkProfile: { networkInterfaces: [{ id: "[resourceId('Microsoft.Network/networkInterfaces','nic')]" }] },
  } });
  const localResult = engine.convert([input(local, 'rg-one'), input(local, 'rg-two')]);
  const byId = new Map(localResult.diagram.nodes.map(node => [node.id, node]));
  for (const node of localResult.diagram.nodes.filter(node => node.type === 'vm')) {
    const subnet = byId.get(node.parent), vnet = byId.get(subnet.parent), group = byId.get(vnet.parent);
    assert.equal(subnet.type, 'group-subnet');
    assert.equal(group.type, 'group-rg');
  }
  assert.throws(() => engine.convert([input(template(), 'rg-A', sub), input(template(), 'RG-a', sub)]), /Duplicate resource group scope/);
  assert.throws(() => engine.convert([input(linked('rg-hub', 'rg-spoke', true), 'wrong'), input(template(), 'other')]), /conflicts/);
  assert.throws(() => engine.convert([input(template(), 'rg-good'), input('{"secret":"must-not-leak"', 'rg-bad')]),
    error => /Template 2: Invalid JSON/.test(error.message) && !error.message.includes('must-not-leak'));
  assert.throws(() => engine.convert(Array.from({ length: 11 }, (_, i) => input(template(), 'rg-' + i))), /1 and 10/);
  assert.throws(() => engine.convert([input(JSON.stringify(template()) + ' '.repeat(6 * 1024 * 1024), 'rg-one'),
    input(JSON.stringify(template()) + ' '.repeat(5 * 1024 * 1024), 'rg-two')]), /combined 10 MiB/);
  const large = { resources: Array.from({ length: 1001 }, (_, i) => ({ type: 'Microsoft.Web/sites', name: 'app-' + i })) };
  assert.throws(() => engine.convert([input(large, 'rg-one'), input(large, 'rg-two')]), /2,000-resource limit/);
  const nodes = { resources: Array.from({ length: 150 }, (_, i) => ({ type: 'Microsoft.Web/sites', name: 'app-' + i })) };
  assert.throws(() => engine.convert([input(nodes, 'rg-one'), input(nodes, 'rg-two')]), /300-rendered-node limit/);
  console.log('PASS ARM engine: isolated file scope, exact cross-group matching, unique identities, atomic errors and combined limits');
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

async function verifyCombined(page) {
  const sub = '11111111-1111-1111-1111-111111111111';
  const file = (group, peer) => {
    const value = template();
    value.resources[0].properties.virtualNetworkPeerings = [{ name: 'to-peer', properties: {
      remoteVirtualNetwork: { id: `/subscriptions/${sub}/resourceGroups/${peer}/providers/Microsoft.Network/virtualNetworks/vnet-example` },
    } }];
    return { name: 'template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) };
  };
  const setFiles = async (button, files) => {
    const choosing = page.waitForEvent('filechooser');
    await button.click();
    await (await choosing).setFiles(files);
  };
  const cards = page.locator('[data-arm-entry]');
  await page.locator('#nds-arm-open').click();
  await setFiles(cards.first().locator('[data-arm-choose]'), file('rg-hub', 'rg-spoke'));
  await cards.first().locator('[data-arm-group]').fill('rg-hub');
  await cards.first().locator('[data-arm-sub]').fill(sub);
  await setFiles(page.locator('#nds-arm-add'), [file('rg-spoke', 'rg-hub')]);
  assert.equal(await cards.count(), 2);
  assert.equal(await cards.first().locator('[data-arm-group]').inputValue(), 'rg-hub', 'Adding preserves prior metadata');
  assert.equal(await cards.first().locator('[data-arm-sub]').inputValue(), sub);
  assert(await page.locator('#nds-arm-start').isDisabled(), 'Every selected file needs its own group');
  await cards.nth(1).locator('[data-arm-group]').fill('rg-hub');
  await cards.nth(1).locator('[data-arm-sub]').fill(sub);
  assert(await page.locator('#nds-arm-start').isDisabled(), 'Duplicate group scopes cannot import');
  assert(await cards.nth(1).locator('[data-arm-entry-error]').isVisible());
  await cards.nth(1).locator('[data-arm-group]').fill('rg-spoke');
  await cards.nth(1).locator('[data-arm-sub]').fill('invalid-subscription');
  assert(await page.locator('#nds-arm-start').isDisabled());
  await cards.nth(1).locator('[data-arm-sub]').fill(sub);
  assert(await page.locator('#nds-arm-start').isEnabled());
  const names = await page.locator('[data-arm-filename]').allTextContents();
  await page.locator('#nds-arm-file').dispatchEvent('cancel');
  assert.deepEqual(await page.locator('[data-arm-filename]').allTextContents(), names);
  await setFiles(page.locator('#nds-arm-add'), [file('extra', 'rg-hub'), file('extra-2', 'rg-hub')]);
  assert.equal(await cards.count(), 4, 'Several files can be added in one selection');
  await cards.last().locator('[data-arm-remove]').click();
  await cards.last().locator('[data-arm-remove]').click();
  assert.equal(await cards.count(), 2);
  assert.equal(await cards.nth(1).locator('[data-arm-group]').inputValue(), 'rg-spoke');
  for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
    await page.evaluate(language => window.__nds_i18nStore.getState().setLang(language), language);
    for (const [width, theme] of [[375, 'dark'], [1440, 'light']]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
      assert(await page.locator('#nds-arm-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth + 1),
        `${language}/${theme}: multiple cards fit the viewport`);
    }
    assert.equal(await cards.first().locator('[data-arm-group]').inputValue(), 'rg-hub');
    assert.equal(await cards.nth(1).locator('[data-arm-sub]').inputValue(), sub, 'Language/theme changes preserve per-file values');
  }
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
  await setFiles(cards.nth(1).locator('[data-arm-choose]'), {
    name: 'bad-template.json', mimeType: 'application/json', buffer: Buffer.from('{"secret":"do-not-leak"'),
  });
  assert.equal(await cards.nth(1).locator('[data-arm-group]').inputValue(), 'rg-spoke', 'Replacing a file keeps its scope fields');
  const original = await snapshot(page);
  const tabIds = await page.evaluate(() => window.__nds_tabsStore.getState().tabs.map(tab => tab.id));
  await page.locator('#nds-arm-start').click();
  await page.locator('#nds-arm-error').waitFor({ state: 'visible' });
  assert.match(await page.locator('#nds-arm-error').textContent(), /Template 2: Invalid JSON/);
  assert.equal(await snapshot(page), original, 'Invalid second file creates no partial diagram');
  assert.deepEqual(await page.evaluate(() => window.__nds_tabsStore.getState().tabs.map(tab => tab.id)), tabIds);
  await setFiles(cards.nth(1).locator('[data-arm-choose]'), file('rg-spoke', 'rg-hub'));
  await page.locator('#nds-arm-start').click();
  await page.locator('#nds-arm-cancel').click();
  assert.equal(await snapshot(page), original, 'Cancelling combined import restores the original transaction');
  assert.deepEqual(await page.evaluate(() => window.__nds_tabsStore.getState().tabs.map(tab => tab.id)), tabIds);
  await page.locator('#nds-arm-open').click();
  await page.locator('#nds-arm-start').click();
  await page.waitForFunction(() => document.getElementById('nds-arm-percent').textContent === '100%', null, { timeout: 30000 });
  const imported = await page.evaluate(() => structuredClone(window.__nds_diagramStore.getState().diagram));
  assert.equal(imported.nodes.filter(node => node.type === 'group-rg').length, 2);
  assert.equal(imported.edges.filter(edge => edge.kind === 'peering').length, 1);
  assert(imported.notes.includes('Template 2:'), 'Combined import findings are saved with the diagram');
  assert.equal(await page.locator('#nds-arm-template-report li').count(), 2);
  assert(await page.evaluate(() => window.ndsArmLayout.checkGeometry(window.__nds_diagramStore.getState().diagram)),
    'Both imported groups have measured, non-overlapping native layout');
  await page.locator('#nds-arm-cancel').click();
  console.log('PASS ARM combined UI: add/change/remove, required scope, duplicate/invalid scope, atomic failure, cancellation, peering and Notes');
}

async function verify(target) {
  const remote = /^https?:/.test(target);
  const url = remote ? target : pathToFileURL(path.resolve(target)).href;
  const directory = path.dirname(path.resolve(target));
  const files = remote ? [] : [path.resolve(target),
    path.join(directory, 'production_arm', 'engine.js'),
    path.join(directory, 'production_arm', 'import.js'),
    path.join(directory, 'production_arm', 'import.css')];
  const hashes = files.map(hash);
  if (!remote) {
    verifyEngine(path.join(directory, 'production_arm', 'engine.js'));
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

    assert.equal(await page.locator('#nds-arm-help').evaluate(help => help.open), false, 'Help starts collapsed');
    assert.equal(await page.locator('.nds-arm-file > h3, .nds-arm-file > p, .nds-arm-list-heading').count(), 0,
      'Redundant headings and file paragraphs are absent');
    assert(!/ZIP|2,000|matching resource references/.test(await page.locator('#nds-arm-dialog').innerText()),
      'Detailed guidance is outside the default view');
    const helpSummary = page.locator('#nds-arm-help > summary');
    await helpSummary.focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#nds-arm-file-help').isVisible(), 'Keyboard activation reveals file guidance');
    const limits = await page.locator('#nds-arm-help [data-arm-text="limits"]').textContent();
    assert.match(limits, /10 templates.*10 MiB.*2,000.*300.*including groups/);
    assert(await page.locator('#nds-arm-help [data-arm-text="scopeHelp"]').isVisible());
    assert.equal(await snapshot(page), before, 'Opening help preserves existing work');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#nds-arm-help').evaluate(help => help.open), false);
    assert(await page.locator('#nds-arm-selected').evaluate(status =>
      status.getAttribute('aria-live') === 'polite' && getComputedStyle(status).clipPath === 'inset(50%)'),
    'File-count announcements remain available without adding visible text');

    const helpTitles = new Set(), fileHelp = new Set();
    for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(language => window.__nds_i18nStore.getState().setLang(language), language);
      helpTitles.add(await helpSummary.textContent());
      fileHelp.add(await page.locator('#nds-arm-file-help').textContent());
      assert(await page.locator('#nds-arm-choose svg[aria-hidden="true"]').isVisible());
      const steps = await page.locator('#nds-arm-export li').allTextContents();
      assert.equal(steps.length, 5);
      assert.equal(await page.locator('#nds-arm-export').evaluate(list => list.closest('details')), null,
        `${language}: Steps are not hidden in expandable help`);
      assert(await page.locator('#nds-arm-export li').last().isVisible(), `${language}: all Steps stay visible`);
      assert.equal(steps[4], 'template.json', `${language}: Step 5 is only template.json`);
      assert.deepEqual([steps[0], steps[1], steps[3]], [
        'Azure Portal', 'Resource groups', 'Automation \u2192 Export template \u2192 ARM Template \u2192 Download',
      ], 'The unchanged Portal labels and export path are preserved');
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
        for (const width of [1440, 375]) {
          await page.setViewportSize({ width, height: 960 });
          await helpSummary.click();
          assert(await page.locator('#nds-arm-file-help').isVisible(), `${language}: expanded help is readable`);
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
          assert(!bounds.overflow && bounds.withinViewport && bounds.width <= 790, `${language}/${theme}/${width}: ${JSON.stringify(bounds)}`);
          assert.equal(bounds.columns, 1, 'Compact dialog has only one column');
          assert(bounds.selectionContained && bounds.buttonHeight >= 44);
          await helpSummary.click();
        }
      }
    }
    assert.equal(helpTitles.size, 8);
    assert.equal(fileHelp.size, 8);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.evaluate(() => {
      window.__nds_i18nStore.getState().setLang('en');
      window.__nds_themeStore.getState().setPref('light');
    });
    console.log('PASS ARM import: concise controls, visible Steps, keyboard help, explicit combined limits, eight languages and both themes');

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
    await verifyCombined(page);
    await page.locator('[data-nds-updates-open="palette"]').click();
    await page.locator('[data-nds-updates-dialog]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-nds-release-version="0.9.133"]').count(), 0, 'Demo announcement is withdrawn');
    assert.equal(await page.locator('[data-nds-release-version="0.9.136"]').count(), 0, 'Removal and correction create no announcement');
    assert.equal(await page.locator('[data-nds-release-version="0.9.135"]').count(), 1, 'Other genuine updates are preserved');
    assert(!/video|demo/i.test(await page.locator('[data-nds-release-version="0.9.135"]').textContent()),
      'The corrected ARM selection announcement contains no retired video wording');
    assert.equal(await page.locator('[data-nds-release-version="0.9.137"]').count(), 0,
      'Correcting an announcement does not advertise a maintenance release as a new feature');
    assert.equal(await page.locator('[data-nds-release-version="0.9.138"]').count(), 1, 'Combined import has a genuine feature announcement');
    assert.equal(await page.locator('[data-nds-release-version="0.9.139"]').count(), 1, 'The approved simpler interface has a usability announcement');
    await page.locator('[data-nds-updates-close]').click();
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'Import remains offline');
    assert.deepEqual(media, [], 'No retired ARM media is requested');
    assert.deepEqual(files.map(hash), hashes, 'Tests never rewrite installed or staged assets');
    console.log('PASS ARM import: explicit keyboard file selection, cancellation, close/reopen, unchanged original tab and real offline import');
    console.log('PASS ARM import: withdrawn demo announcement, preserved genuine history and new combined-import announcement');
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = { template, openARM, verifyEngine };
if (require.main === module) verify(process.argv[2] || path.join(__dirname, '..', 'index.html'))
  .catch(error => { console.error(error); process.exitCode = 1; });
