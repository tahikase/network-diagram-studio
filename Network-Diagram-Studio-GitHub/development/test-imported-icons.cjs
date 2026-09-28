const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { chromium } = require('playwright');

const ENTRY = path.resolve(process.argv.find(arg => arg.endsWith('.html')) || path.join(__dirname, '..', 'index.html'));
const DIST = path.dirname(ENTRY);
const ONLY = process.argv.includes('--deletion') ? 'deletion' : process.argv.includes('--transfers') ? 'transfers' : process.argv.includes('--workflow') ? 'workflow' : process.argv.includes('--limits') ? 'limits' : process.argv.includes('--safety') ? 'safety' : 'all';
const MB = 1024 * 1024;
const RIGHTS_NOTICE = 'Only import and share images you have the legal right to use.';
const SVG = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect x="6" y="6" width="52" height="52" rx="7" fill="${color}"/></svg>`;
const file = (name, content, mimeType = 'image/svg+xml') => ({ name, mimeType, buffer: Buffer.isBuffer(content) ? content : Buffer.from(content) });
const pngFile = (name, content) => file(name, content, 'image/png');
const stamp = () => 'imported--' + crypto.randomUUID();
const errors = [], external = [];
let browser;

async function boot(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  if (!options.portable) await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'icons.nds.test') {
      external.push(url.href);
      return route.abort();
    }
    const target = url.pathname === '/entry.html' ? ENTRY : path.join(DIST, decodeURIComponent(url.pathname.slice(1)));
    if (!target.startsWith(DIST + path.sep) || !fs.existsSync(target)) return route.fulfill({ status: 404, body: '' });
    const ext = path.extname(target);
    return route.fulfill({ body: fs.readFileSync(target), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[ext] || 'application/octet-stream' });
  });
  if (options.init) await context.addInitScript(options.init);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  if (options.portable) page.on('request', request => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  await page.goto(options.portable ? 'file:///' + ENTRY.replace(/\\/g, '/') : 'https://icons.nds.test/entry.html');
  await page.locator('[data-nds-import-icons]').waitFor();
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
  await page.waitForTimeout(120);
  return { context, page };
}

async function importFiles(page, files) {
  await page.locator('[data-nds-import-icons-input]').setInputFiles(files);
  await confirmTransfer(page);
  await page.waitForFunction(() => !document.querySelector('[data-nds-import-icons]').disabled);
  await page.waitForTimeout(100);
  return page.locator('[data-nds-import-result]').evaluateAll(nodes =>
    nodes.map(node => ({ status: node.dataset.ndsImportResult, text: node.textContent })));
}
async function importClean(page, files) {
  const before = await page.locator('[data-nds-imported-icon]').count();
  assert.deepEqual(await importFiles(page, files), [], 'successful files do not leave a report');
  assert.equal(await page.locator('[data-nds-import-results]').count(), 0);
  assert.equal(await page.locator('[data-nds-imported-icon]').count(), before + files.length);
  const persisted = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('nds-imported-icons', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction('library').objectStore('library').count();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  });
  assert.equal(persisted, before + files.length, 'quiet successful imports are durably stored');
}

const graph = page => page.evaluate(() => window.__nds_diagramStore.getState().diagram);
const node = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
const settle = page => page.waitForTimeout(160);
async function openSection(page, section) {
  const header = page.locator(`[data-nds-accordion-header="${section}"]`);
  if (await header.getAttribute('aria-expanded') !== 'true') await header.click();
}
async function download(page, title) {
  const pending = page.waitForEvent('download');
  await page.getByTitle(title, { exact: true }).click();
  const result = await pending;
  const chunks = [];
  for await (const chunk of await result.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function backupLibrary(page) {
  await openSection(page, 'imported');
  await page.locator('[data-nds-library-actions]').click();
  const pending = page.waitForEvent('download');
  await page.locator('[data-nds-icon-command="backup"]').click();
  const result = await pending;
  assert.ok(result.suggestedFilename().endsWith('.nds-icons.json'));
  const chunks = [];
  for await (const chunk of await result.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function previewBackup(page, payload) {
  await openSection(page, 'imported');
  await page.locator('[data-nds-library-actions]').click();
  const pending = page.waitForEvent('filechooser');
  await page.locator('[data-nds-icon-command="restore"]').click();
  const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  const diskFile = buffer.length > 50 * MB ? path.join(os.tmpdir(), `nds-icon-backup-${crypto.randomUUID()}.nds-icons.json`) : null;
  if (diskFile) fs.writeFileSync(diskFile, buffer, { flag: 'wx' });
  try {
    await (await pending).setFiles(diskFile || file('icons.nds-icons.json', buffer, 'application/json'));
    await page.waitForFunction(() =>
      document.querySelector('[data-nds-library-preview="restore"]') ||
      document.querySelector('[data-nds-palette-focused-section] [role="alert"]'), null, { timeout: 90000 });
    await settle(page);
  } finally { if (diskFile) fs.unlinkSync(diskFile); }
}
async function previewFolder(page, directory) {
  await page.locator('[data-nds-import-icons]').click();
  const pending = page.waitForEvent('filechooser');
  await page.locator('[data-nds-icon-command="folder"]').click();
  await (await pending).setFiles(directory);
  await page.waitForFunction(() =>
    document.querySelector('[data-nds-library-preview="folder"]') ||
    document.querySelector('[data-nds-palette-focused-section] [role="alert"]'));
  await settle(page);
}
async function confirmTransfer(page) {
  await page.locator('[data-nds-transfer-confirm]').click();
  await page.locator('[data-nds-library-preview]').waitFor({ state: 'detached', timeout: 90000 });
  await settle(page);
}
async function checkRightsWarning(page, kind) {
  const dialog = page.locator(`[data-nds-library-preview="${kind}"]`);
  await dialog.waitFor();
  const notice = dialog.locator('[data-nds-import-rights]');
  assert.equal(await notice.count(), 1);
  assert.equal(await notice.textContent(), RIGHTS_NOTICE);
  assert.equal(await dialog.getAttribute('aria-describedby'), await notice.getAttribute('id'),
    'the import dialog announces the copyright warning');
  assert.equal(await page.locator('[data-nds-palette-focused-section] [data-nds-import-rights]').count(), 0);
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
    await settle(page);
    const appearance = await notice.evaluate(notice => {
      const dialog = notice.closest('dialog');
      const panel = notice.closest('[data-nds-import-warning]');
      const style = getComputedStyle(notice);
      const box = notice.getBoundingClientRect();
      const action = dialog.querySelector('[data-nds-transfer-confirm]').getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      const luminance = color => {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
          .map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const foreground = luminance(style.color);
      const background = luminance(getComputedStyle(panel).backgroundColor);
      return {
        size: parseFloat(style.fontSize),
        contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
        positioned: box.top >= panelBox.top && panelBox.bottom <= action.top && action.bottom <= innerHeight,
        visible: box.width > 0 && box.height > 0 && style.visibility === 'visible',
        fits: notice.scrollWidth <= notice.clientWidth + 1 && notice.scrollHeight <= notice.clientHeight + 1,
      };
    });
    assert.equal(appearance.size, 12);
    assert.ok(appearance.contrast >= 4.5, 'copyright warning text contrast in ' + theme + ': ' + appearance.contrast);
    assert.ok(appearance.visible && appearance.positioned && appearance.fits,
      'copyright warning is readable immediately above Import in ' + theme + ': ' + JSON.stringify(appearance));
    const preview = process.env.NDS_IMPORT_PREVIEW_DIR || process.env.NDS_TRANSFER_PREVIEW_DIR;
    if (preview) await page.screenshot({ path: path.join(preview, `import-warning-${kind}-${theme}.png`) });
  }
}
async function previewDeletion(page) {
  await openSection(page, 'imported');
  await page.locator('[data-nds-library-actions]').click();
  await page.locator('[data-nds-icon-command="delete"]').click();
  await page.locator('[data-nds-library-delete]').waitFor();
  await settle(page);
}
async function confirmDeletion(page) {
  await page.locator('[data-nds-delete-input]').fill(await page.locator('[data-nds-delete-token]').textContent());
  await page.locator('[data-nds-delete-confirm]').click();
  await page.locator('[data-nds-library-delete]').waitFor({ state: 'detached' });
  await settle(page);
}
async function iconStorage(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('nds-imported-icons', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      const tx = db.transaction(['assets', 'library']);
      const read = name => new Promise((resolve, reject) => {
        const request = tx.objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const [assets, library] = await Promise.all([read('assets'), read('library')]);
      return { assets, library };
    } finally { db.close(); }
  });
}
async function clearIconStorage(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('nds-imported-icons', 1);
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    try {
      const tx = db.transaction(['assets', 'library'], 'readwrite');
      tx.objectStore('assets').clear(); tx.objectStore('library').clear();
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); });
    } finally { db.close(); }
    window.__nds_favoritesStore.getState().clearAll();
  });
}
async function loadFile(page, saved) {
  const pending = page.waitForEvent('filechooser');
  await page.getByTitle('Load a diagram from JSON', { exact: true }).click();
  await (await pending).setFiles(file('shared-icons.json', JSON.stringify(saved), 'application/json'));
  await page.waitForFunction(count => window.__nds_diagramStore.getState().diagram.nodes.length === count, saved.nodes.length);
  await settle(page);
}
async function drag(page, element, target) {
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2, { steps: 3 });
  await page.mouse.move(target.x, target.y, { steps: 20 });
  await page.mouse.move(target.x + 1, target.y, { steps: 2 });
  await page.mouse.up();
  await settle(page);
}
async function manage(page, id, action) {
  await openSection(page, 'imported');
  await page.locator(`[data-nds-imported-manage="${id}"]`).click();
  await page.locator('[data-nds-imported-icon-menu]').getByRole('menuitem', { name: action, exact: true }).click();
  await page.locator('[data-nds-imported-icon-dialog]').waitFor();
}
async function makePng(page, side = 32) {
  const base64 = await page.evaluate(side => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = side;
    const c = canvas.getContext('2d'); c.fillStyle = '#00b878'; c.fillRect(0, 0, side, side);
    return canvas.toDataURL('image/png').split(',')[1];
  }, side);
  return Buffer.from(base64, 'base64');
}
async function artworkPixels(page, dataUrl) {
  return page.evaluate(async dataUrl => {
    const image = new Image(); image.src = dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
    const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
    let green = 0, blue = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < 30 && pixels[i + 1] > 140 && pixels[i + 1] < 210 && pixels[i + 2] > 80 && pixels[i + 2] < 155 && pixels[i + 3] > 200) green++;
      if (pixels[i] > 20 && pixels[i] < 60 && pixels[i + 1] > 75 && pixels[i + 1] < 125 && pixels[i + 2] > 210 && pixels[i + 3] > 200) blue++;
    }
    return { green, blue };
  }, dataUrl);
}

async function workflow() {
  const { page, context } = await boot();
  try {
    assert.deepEqual(await page.locator('[data-nds-accordion-header]').evaluateAll(nodes => nodes.map(n => n.dataset.ndsAccordionHeader)),
      ['favorites', 'shapes', 'resources', 'imported', 'icons']);
    const version = fs.readFileSync(path.join(__dirname, 'src', 'version.ts'), 'utf8')
      .match(/export const APP_VERSION = '([^']+)'/)?.[1];
    assert.equal(await page.locator('[data-nds-app-version]').textContent(), 'v' + version);
    const buttonType = await page.locator('[data-nds-import-icons]').evaluate(button => {
      const footer = button.closest('[data-nds-palette-focused-section]');
      const style = getComputedStyle(footer);
      const box = button.getBoundingClientRect();
      const version = footer.querySelector('[data-nds-app-version]').getBoundingClientRect();
      return {
        size: parseFloat(getComputedStyle(button).fontSize),
        weight: Number(getComputedStyle(button).fontWeight),
        height: box.height,
        fullWidth: Math.abs(box.width - footer.clientWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)) < 1,
        versionBelow: version.top >= box.bottom,
      };
    });
    assert.ok(buttonType.size === 16 && buttonType.weight >= 700 && buttonType.height === 44,
      'the Import Icons action uses balanced 16px bold text and a 44px target: ' + JSON.stringify(buttonType));
    assert.ok(buttonType.fullWidth && buttonType.versionBelow, 'the import action spans the footer with the version below');
    const rightsNotice = page.locator('[data-nds-import-rights]');
    assert.equal(await rightsNotice.count(), 0, 'the permanent footer message is removed');
    const descriptions = await page.locator('[data-nds-import-icons]').evaluate(button =>
      button.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id)?.textContent));
    assert.deepEqual(descriptions, [await page.locator('[data-nds-import-icons]').getAttribute('title')],
      'the action keeps its accessible file-format guidance');
    assert.equal(await page.locator('dialog[open], [role="alertdialog"]').count(), 0, 'no warning before file selection');
    assert.ok(!(await page.locator('[data-nds-palette-focused-section]').textContent()).includes('Custom node'));
    const chooserEvent = page.waitForEvent('filechooser');
    await page.locator('[data-nds-import-icons]').click();
    await page.locator('[data-nds-icon-command="files"]').click();
    const chooser = await chooserEvent;
    assert.equal(chooser.isMultiple(), true);
    const png = await makePng(page);
    const selectedFiles = [file('Branch Router.svg', SVG('#2563eb')), pngFile('Partner Cloud.png', png), file('Unused Private.svg', SVG('#ff7300'))];
    await chooser.setFiles(selectedFiles);
    await checkRightsWarning(page, 'files');
    assert.equal(await page.locator('[data-nds-import-file]').count(), 3);
    assert.deepEqual(await iconStorage(page), { assets: [], library: [] }, 'selected SVG/PNG files are not imported before confirmation');
    const beforeCancel = await graph(page);
    await page.keyboard.press('Escape');
    await page.locator('[data-nds-library-preview]').waitFor({ state: 'detached' });
    assert.deepEqual(await iconStorage(page), { assets: [], library: [] });
    assert.deepEqual(await graph(page), beforeCancel);
    assert.equal(await page.locator('[data-nds-import-icons]').evaluate(button => button === document.activeElement), true);
    await page.locator('[data-nds-import-icons-input]').setInputFiles(selectedFiles);
    await page.locator('[data-nds-transfer-cancel]').click();
    await page.locator('[data-nds-library-preview]').waitFor({ state: 'detached' });
    assert.deepEqual(await iconStorage(page), { assets: [], library: [] }, 'Cancel leaves the library unchanged');
    assert.deepEqual(await graph(page), beforeCancel);
    await page.locator('[data-nds-import-icons-input]').setInputFiles(selectedFiles);
    assert.equal(await rightsNotice.textContent(), RIGHTS_NOTICE, 'every new file selection requires confirmation');
    await confirmTransfer(page);
    assert.equal(await rightsNotice.count(), 0, 'the warning does not return to the palette footer');
    await page.locator('[data-nds-imported-icon]').nth(2).waitFor();
    await page.waitForFunction(() => {
      const tile = document.querySelector('[data-nds-imported-icon]')?.getBoundingClientRect();
      const scroller = document.querySelector('[data-nds-palette-accordion]')?.getBoundingClientRect();
      return tile && scroller && tile.top >= scroller.top && tile.bottom <= scroller.bottom;
    }, null, { timeout: 5000 });
    let tiles = await page.locator('[data-nds-imported-icon]').evaluateAll(nodes => nodes.map(n => ({ id: n.dataset.ndsImportedIcon, text: n.textContent })));
    const router = tiles.find(tile => tile.text.includes('Branch Router')).id;
    const cloud = tiles.find(tile => tile.text.includes('Partner Cloud')).id;
    const unused = tiles.find(tile => tile.text.includes('Unused Private')).id;
    assert.equal(await page.locator('[data-nds-import-results]').count(), 0);
    const libraryText = await page.locator('[data-nds-imported-icons]').textContent();
    for (const removed of ['Import results', 'Dismiss', 'SVG / PNG', 'Library: 200 icons', 'Stored in this browser.', 'Saved diagrams include used icons']) {
      assert.ok(!libraryText.includes(removed), 'unnecessary palette text is absent: ' + removed);
    }
    assert.equal((await graph(page)).nodes.length, 0, 'importing does not place nodes');
    assert.equal((await importFiles(page, [file('Copy.svg', SVG('#2563eb'))]))[0].status, 'duplicate');
    await importClean(page, [file('Branch Router.svg', SVG('#cf3288'))]);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 4);
    const chooserInput = page.locator('[data-nds-import-icons-input]');
    assert.equal(await chooserInput.inputValue(), '', 'the same file can be selected again');

    await page.locator('[data-nds-accordion-header="shapes"]').click();
    const canvas = await page.locator('.react-flow').boundingBox();
    await drag(page, page.locator(`[data-nds-imported-icon="${router}"]`), { x: canvas.x + 270, y: canvas.y + 320 });
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 1);
    const first = (await graph(page)).nodes[0].id;
    await page.locator(`[data-nds-imported-icon="${cloud}"]`).click();
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 2);
    const second = (await graph(page)).nodes.find(n => n.id !== first).id;
    assert.equal((await graph(page)).nodes.find(n => n.id === first).data.iconSize, undefined);
    assert.equal((await graph(page)).nodes.find(n => n.id === second).data.iconSize, 96);
    assert.equal(await node(page, second).locator('.rounded-full svg').evaluate(el => getComputedStyle(el).width), '96px');
    await drag(page, page.locator(`[data-nds-imported-icon="${cloud}"]`), { x: canvas.x + 470, y: canvas.y + 510 });
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 3);
    const dropped = (await graph(page)).nodes.find(n => n.id !== first && n.id !== second);
    assert.equal(dropped.data.iconSize, 96, 'native drag and click use the same PNG default');
    assert.equal(await node(page, dropped.id).locator('.rounded-full svg').evaluate(el => getComputedStyle(el).width), '96px');
    await page.locator('[data-nds-fullscreen]').focus();
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 2);
    await page.waitForTimeout(500);
    const view = await page.locator('.react-flow').boundingBox();
    await drag(page, node(page, second).locator('svg').first(), { x: view.x + view.width * .68, y: view.y + 340 });
    await drag(page, node(page, first).locator('svg').first(), { x: view.x + view.width * .24, y: view.y + 340 });
    assert.ok((await graph(page)).nodes.every(n => n.type === 'custom'));
    await node(page, first).locator('[title$="double-click to rename"]').dblclick();
    await node(page, first).locator('input').fill('Branch Office');
    await page.keyboard.press('Enter');
    await node(page, first).locator('svg').first().click();
    const box = await node(page, first).boundingBox();
    const beforeSize = (await graph(page)).nodes.find(n => n.id === first).size;
    await drag(page, node(page, first).locator('.react-flow__resize-control.handle.bottom.right'), { x: box.x + box.width + 45, y: box.y + box.height + 30 });
    assert.ok((await graph(page)).nodes.find(n => n.id === first).size.w > beforeSize.w);
    const target = await node(page, second).locator('[data-handleid="t-l"]').boundingBox();
    await drag(page, node(page, first).locator('[data-handleid="s-r"]'), { x: target.x + target.width / 2, y: target.y + target.height / 2 });
    await page.locator('[data-nds-edge-label-input]').fill('HTTPS');
    await page.keyboard.press('Enter');
    assert.equal((await graph(page)).edges.length, 1);

    await node(page, first).locator('svg').first().click();
    await page.waitForFunction(id => window.__nds_diagramStore.getState().selectedNodeId === id, first);
    await page.keyboard.press('Control+d');
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 3);
    const copy = (await graph(page)).nodes.find(n => n.id !== first && n.id !== second);
    assert.equal(copy.data.iconId, router);
    assert.equal(copy.data.name, 'Branch Office copy');
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 2);
    await page.keyboard.press('Control+y');
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 3);
    await page.keyboard.press('Control+z');
    await node(page, first).locator('svg').first().click();
    const token = await page.evaluate(() => {
      document.activeElement?.blur();
      const data = new DataTransfer();
      document.querySelector('.react-flow__pane').dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }));
      return data.getData('text/plain');
    });
    assert.ok(token);
    await page.evaluate(token => {
      const data = new DataTransfer(); data.setData('text/plain', token);
      document.querySelector('.react-flow__pane').dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, token);
    assert.equal((await graph(page)).nodes.filter(n => n.data.iconId === router).length, 2);
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 2);
    console.log('PASS native click/drag, labels, resize, connectors, Ctrl+D, copy/paste and one-step undo/redo');

    await page.locator(`[data-nds-imported-icon="${router}"]`).locator('..').getByRole('button', { name: 'Add to Favorites', exact: true }).click();
    await manage(page, router, 'Rename');
    await page.locator('[data-nds-imported-icon-name]').fill('Office Router');
    await page.locator('[data-nds-imported-icon-confirm]').click();
    await page.locator('[data-nds-imported-icon-dialog]').waitFor({ state: 'detached' });
    assert.equal((await graph(page)).nodes.find(n => n.id === first).data.name, 'Branch Office');
    await openSection(page, 'favorites');
    assert.ok((await page.locator('[data-nds-accordion-section="favorites"]').textContent()).includes('Office Router'));
    const search = page.locator('[data-nds-palette-search-all]');
    await search.fill('Office Router');
    await page.locator(`[data-nds-search-hit="${router}"]`).waitFor();
    await page.locator('[data-nds-palette-search-clear]').click();
    await page.locator('[data-nds-palette-collapse]').click();
    assert.deepEqual(await page.locator('[data-nds-palette-rail] button').evaluateAll(buttons => buttons.map(b => b.title.replace(/\s+\(\d+\)$/, ''))),
      ['Show palette', 'Favorites', 'Shapes', 'Resources', 'Imported icons', 'All icons']);
    await page.locator('[data-nds-palette-rail]').getByRole('button', { name: 'Imported icons (4)', exact: true }).click();

    await node(page, first).locator('svg').first().click();
    await page.getByRole('button', { name: 'Change icon…', exact: true }).click();
    const picker = page.getByRole('dialog').filter({ hasText: 'Choose an icon' });
    await picker.getByRole('searchbox').fill('Partner Cloud');
    await picker.getByRole('button', { name: 'Partner Cloud', exact: true }).click();
    assert.equal((await graph(page)).nodes.find(n => n.id === first).data.iconId, cloud);
    await page.keyboard.press('Control+z');
    await page.waitForFunction(({ first, router }) => window.__nds_diagramStore.getState().diagram.nodes.find(n => n.id === first).data.iconId === router, { first, router });
    await page.waitForTimeout(1000);
    assert.ok(!(await page.evaluate(() => localStorage.getItem('nds.autoSave.v1'))).includes('data:image/'), 'icon bytes do not fill localStorage');
    const beforeReload = await graph(page);
    const libraryOrder = await page.locator('[data-nds-imported-icon]').evaluateAll(tiles => tiles.map(tile => tile.dataset.ndsImportedIcon));
    await page.reload();
    await page.locator('[data-nds-imported-icon]').nth(3).waitFor();
    assert.equal(await rightsNotice.count(), 0, 'reload does not bring back the footer message');
    assert.deepEqual(await page.locator('[data-nds-imported-icon]').evaluateAll(tiles => tiles.map(tile => tile.dataset.ndsImportedIcon)),
      libraryOrder, 'import and rename preserve library order after a full-page reload');
    assert.deepEqual((await graph(page)).nodes, beforeReload.nodes);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    assert.equal(await page.evaluate(id => window.__nds_favoritesStore.getState().icons.has(id), router), true);
    console.log('PASS library rename, Favorites, global search, collapsed rail, icon picker and full-page persistence');

    for (const lang of ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      await settle(page);
      assert.notEqual(await page.locator('[data-nds-import-icons]').textContent(), '+ Import Icons');
      await page.locator('[data-nds-import-icons-input]').setInputFiles([file('Language check.svg', SVG('#875432'))]);
      const translatedNotice = await rightsNotice.textContent();
      assert.ok(translatedNotice.trim() && translatedNotice !== RIGHTS_NOTICE, 'translated rights reminder: ' + lang);
      const missing = await page.evaluate(() => window.__nds_i18nMissing?.() ?? {});
      assert.deepEqual(missing[lang] ?? [], [], 'localized import UI: ' + lang);
      await page.locator('[data-nds-transfer-cancel]').click();
      await page.locator('[data-nds-library-preview]').waitFor({ state: 'detached' });
    }
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    for (const id of ['favorites', 'shapes', 'resources', 'icons']) {
      const header = page.locator(`[data-nds-accordion-header="${id}"]`);
      if (await header.getAttribute('aria-expanded') === 'true') await header.click();
    }
    await openSection(page, 'imported');
    const palette = page.locator('[data-nds-palette-accordion]').locator('..');
    if (process.env.NDS_IMPORT_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.NDS_IMPORT_PREVIEW_DIR, 'imported-icons-light.png') });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.screenshot({ path: path.join(process.env.NDS_IMPORT_PREVIEW_DIR, 'imported-icons-dark.png') });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    }
    await palette.evaluate(aside => { aside.style.width = '180px'; });
    assert.ok(await page.locator('[data-nds-imported-icons]').evaluate(section => section.scrollWidth <= section.clientWidth + 1),
      'imported cards do not create horizontal overflow at the minimum palette width');
    assert.ok(await page.locator('[data-nds-import-icons]').evaluate(button => button.scrollWidth <= button.clientWidth + 1),
      'the footer action fits the minimum palette width');
    for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      await settle(page);
      assert.ok(await page.locator('[data-nds-import-icons]').evaluate(button =>
        button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1),
      'the prominent action fits at minimum width in ' + lang);
      assert.equal(await rightsNotice.count(), 0, 'no footer warning in ' + lang);
    }
    const viewport = page.viewportSize();
    await page.setViewportSize({ width: 420, height: 720 });
    for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      await page.locator('[data-nds-import-icons-input]').setInputFiles([file('Small screen.svg', SVG('#875432'))]);
      await page.locator('[data-nds-library-preview="files"]').waitFor();
      assert.ok(await rightsNotice.evaluate(notice => {
        const dialog = notice.closest('dialog').getBoundingClientRect();
        const action = notice.closest('dialog').querySelector('[data-nds-transfer-confirm]').getBoundingClientRect();
        return notice.scrollWidth <= notice.clientWidth + 1 && notice.scrollHeight <= notice.clientHeight + 1
          && dialog.left >= 0 && dialog.right <= innerWidth && dialog.bottom <= innerHeight && action.bottom <= innerHeight;
      }), 'the warning and confirmation fit a narrow viewport in ' + lang);
      await page.locator('[data-nds-transfer-cancel]').click();
      await page.locator('[data-nds-library-preview]').waitFor({ state: 'detached' });
    }
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 4, 'cancelled language previews add no icons');
    console.log('PASS warning before file imports, Cancel/Escape without writes, repeated confirmation, accessible light/dark UI and eight languages');
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    if (process.env.NDS_IMPORT_PREVIEW_DIR) await page.screenshot({ path: path.join(process.env.NDS_IMPORT_PREVIEW_DIR, 'imported-icons-narrow.png') });
    await palette.evaluate(aside => { aside.style.width = '300px'; });
    const manageButton = page.locator(`[data-nds-imported-manage="${router}"]`);
    await manageButton.click();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Remove from library');
    await page.keyboard.press('Escape');
    assert.equal(await manageButton.evaluate(button => button === document.activeElement), true);
    await manage(page, router, 'Remove from library');
    await page.locator('[data-nds-imported-icon-confirm]').click();
    await page.locator('[data-nds-imported-icon-dialog]').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(id => window.__nds_favoritesStore.getState().icons.has(id), router), false);
    assert.equal(await page.locator(`[data-nds-imported-symbol="${router}"]`).count(), 1);
    assert.equal((await graph(page)).nodes.length, 2);
    const portable = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    assert.deepEqual(portable.iconAssets.map(a => a.id).sort(), [router, cloud].sort());
    assert.ok(portable.iconAssets.every(a => a.dataUrl && a.bytes > 0));
    const exportedSvg = (await download(page, 'Export the full diagram as SVG')).toString();
    assert.ok(exportedSvg.includes(router) && exportedSvg.includes(cloud));
    assert.ok(!exportedSvg.includes(unused), 'SVG never contains unused private artwork');
    const exportedPng = await download(page, 'Export the full diagram as PNG');
    const pixels = await artworkPixels(page, 'data:image/png;base64,' + exportedPng.toString('base64'));
    assert.ok(pixels.green > 500 && pixels.blue > 500, JSON.stringify(pixels));
    await page.reload();
    await page.locator('.react-flow__node').nth(1).waitFor();
    await openSection(page, 'imported');
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 3);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0, 'removed artwork survives an auto-save reload');

    const fresh = await boot();
    try {
      await loadFile(fresh.page, portable);
      await openSection(fresh.page, 'imported');
      assert.equal(await fresh.page.locator('[data-nds-imported-icon]').count(), 0, 'sharing does not populate the personal library');
      assert.deepEqual((await graph(fresh.page)).nodes, portable.nodes);
      const again = JSON.parse((await download(fresh.page, 'Save current diagram as JSON')).toString());
      assert.deepEqual(again.iconAssets, portable.iconAssets);
      await fresh.page.waitForTimeout(1000);
      await fresh.page.reload();
      await fresh.page.locator('.react-flow__node').nth(1).waitFor();
      assert.equal(await fresh.page.locator('[data-nds-imported-missing]').count(), 0);
      await fresh.page.evaluate(() => {
        const tabs = window.__nds_tabsStore.getState(); const id = tabs.activeTabId;
        tabs.addTab(); window.__nds_tabsStore.getState().switchTab(id);
      });
      assert.deepEqual((await graph(fresh.page)).nodes, portable.nodes);
      if (process.env.NDS_IMPORT_PREVIEW) await fresh.page.screenshot({ path: process.env.NDS_IMPORT_PREVIEW });
    } finally { await fresh.context.close(); }
    console.log('PASS safe removal, used-only JSON/SVG embedding, PNG pixels, sharing with an empty library and tab/auto-save restoration');
    return { png, portable };
  } finally { await context.close(); }
}

async function safety() {
  const { page, context } = await boot();
  try {
    const bad = [
      ['Script.svg', '<script>window.__iconExecuted=1</script>'],
      ['Event.svg', '<rect width="10" height="10" onload="window.__iconExecuted=1"/>'],
      ['Foreign.svg', '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">HTML</div></foreignObject>'],
      ['External.svg', '<use href="https://example.test/image.svg#x"/>'],
      ['External paint.svg', '<rect width="10" height="10" fill="url(https://example.test/paint)"/>'],
      ['Style.svg', '<style>@import "https://example.test/font.css";</style><rect width="10" height="10"/>'],
      ['Cycle.svg', '<defs><g id="a"><use href="#a"/></g></defs><use href="#a"/>'],
      ['Animation.svg', '<rect width="10" height="10"><animate attributeName="x" values="0;10"/></rect>'],
    ].map(([name, body]) => file(name, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`));
    bad.push(file('Entity.svg', '<!DOCTYPE svg [<!ENTITY x SYSTEM "https://example.test/secret">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">&x;</svg>'));
    bad.push(file('Too many elements.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + '<rect width="1" height="1"/>'.repeat(5001) + '</svg>'));
    bad.push(file('Too deep.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + '<g>'.repeat(66) + '<rect width="1" height="1"/>' + '</g>'.repeat(66) + '</svg>'));
    let expansion = '<g id="n0"><rect width="1" height="1"/></g>';
    for (let i = 1; i <= 18; i++) expansion += `<g id="n${i}"><use href="#n${i - 1}"/><use href="#n${i - 1}"/></g>`;
    bad.push(file('Exponential references.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${expansion}</defs><use href="#n18"/></svg>`));
    bad.push(file('Oversize.svg', Buffer.alloc(2 * MB + 1)));
    bad.push(pngFile('Fake.png', '<svg onload="window.__iconExecuted=1"/>'));
    const valid = file('Valid.svg', SVG('#2563eb'));
    const results = await importFiles(page, [...bad, valid]);
    assert.equal(results.filter(r => r.status === 'error').length, bad.length, JSON.stringify(results));
    assert.equal(results.length, bad.length, 'mixed imports report only the files with problems');
    assert.equal(await page.evaluate(() => window.__iconExecuted), undefined);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 1);
    const localSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#2563eb"/></linearGradient><path id="p" d="M4 4H60V60H4Z"/></defs><use href="#p" style="fill:url(#g);stroke:#000;stroke-width:1"/></svg>';
    await importClean(page, [file('Gradient.svg', localSvg)]);
    const metadataSvg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:editor="urn:editor" viewBox="0 0 20 20" data-name="Layer 1" editor:label="Artwork" xml:space="preserve" style="enable-background:new 0 0 20 20"><defs><path id="1" d="M2 2H18V18H2Z"/></defs><use xlink:href="#1" fill="#362791"/></svg>';
    await importClean(page, [file('Editor metadata.svg', metadataSvg)]);
    const basic = SVG('#125884');
    const exact = basic.replace('</svg>', '<!--' + 'x'.repeat(2 * MB - Buffer.byteLength(basic) - 7) + '--></svg>');
    assert.equal(Buffer.byteLength(exact), 2 * MB);
    await importClean(page, [file('Exactly 2 MiB.svg', exact)]);
    const maxPng = await makePng(page, 2048);
    await importClean(page, [pngFile('2048.png', maxPng)]);
    const overPng = await makePng(page, 2049);
    assert.equal((await importFiles(page, [pngFile('2049.png', overPng)]))[0].status, 'error');
    assert.equal(await page.locator('[data-nds-imported-symbol] script, [data-nds-imported-symbol] foreignObject').count(), 0);
    await page.locator('[data-nds-imported-icon]').first().click();
    const saved = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    const before = await graph(page);
    for (const change of [
      asset => ({ ...asset, id: 'networking--virtual-networks' }),
      asset => ({ ...asset, dataUrl: 'javascript:alert(1)' }),
      asset => ({ ...asset, dataUrl: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2" onload="window.__iconExecuted=1"/>').toString('base64') }),
      asset => ({ ...asset, dataUrl: 'data:image/svg+xml;base64,' + Buffer.from(SVG('#ee0000')).toString('base64') }),
    ]) {
      const payload = { ...saved, iconAssets: saved.iconAssets.map(change) };
      const result = await page.evaluate(raw => window.__nds_tabsStore.getState().loadStudioFile(raw), JSON.stringify(payload));
      assert.equal(result.ok, false);
      assert.deepEqual(await graph(page), before, 'failed loads are atomic');
    }
    const missing = { ...saved }; delete missing.iconAssets;
    assert.equal((await page.evaluate(raw => window.__nds_tabsStore.getState().loadStudioFile(raw), JSON.stringify(missing))).ok, false);
    console.log('PASS hostile SVG/URLs/entities/cycles, per-file errors, exact 2 MiB boundary, PNG dimension boundary and atomic file validation');
  } finally { await context.close(); }

  const denied = await boot({ init: () => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(...args) {
      if (this.name === 'library') throw new DOMException('Test quota exceeded.', 'QuotaExceededError');
      return original.apply(this, args);
    };
  } });
  try {
    const result = await importFiles(denied.page, [file('Quota.svg', SVG('#2a5699'))]);
    assert.equal(result[0].status, 'error');
    assert.equal(await denied.page.locator('[data-nds-imported-icon]').count(), 0);
    const count = await denied.page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open('nds-imported-icons', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      return new Promise((resolve, reject) => { const r = db.transaction('assets').objectStore('assets').count(); r.onsuccess = () => { db.close(); resolve(r.result); }; r.onerror = () => reject(r.error); });
    });
    assert.equal(count, 0, 'a failed library commit rolls back its asset write');
    console.log('PASS storage failure is visible and the transaction rolls back atomically');
  } finally { await denied.context.close(); }
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}
function paddedPng(png, size, index) {
  const length = size - png.length - 12;
  const chunk = Buffer.alloc(length + 12);
  chunk.writeUInt32BE(length, 0); chunk.write('tEXt', 4); chunk.write(`Demo${index}\0`, 8);
  chunk.fill(32, 8 + Buffer.byteLength(`Demo${index}\0`), 8 + length);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + length)), 8 + length);
  const result = Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)]);
  assert.equal(result.length, size);
  return result;
}
async function seed(page, items) {
  await page.evaluate(async items => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('nds-imported-icons', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const tx = db.transaction(['assets', 'library'], 'readwrite');
    const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
    for (const item of items) {
      tx.objectStore('assets').put(item);
      tx.objectStore('library').put({ id: item.id, label: item.label });
    }
    await done; db.close();
  }, items);
  await page.reload();
  await page.locator('[data-nds-import-icons]').waitFor();
  await openSection(page, 'imported');
}
async function limits() {
  const countCase = await boot();
  try {
    const fixtures = Array.from({ length: 199 }, (_, i) => ({
      id: stamp(), label: `Icon ${i}`, mime: 'image/svg+xml',
      dataUrl: 'data:image/svg+xml;base64,' + Buffer.from(SVG('#' + i.toString(16).padStart(6, '0'))).toString('base64'),
    }));
    await seed(countCase.page, fixtures);
    assert.equal(await countCase.page.locator('[data-nds-imported-icon]').count(), 199);
    await importClean(countCase.page, [file('Icon 200.svg', SVG('#337788'))]);
    assert.equal(await countCase.page.locator('[data-nds-imported-icon]').count(), 200);
    assert.equal((await importFiles(countCase.page, [file('Icon 201.svg', SVG('#997755'))]))[0].status, 'error');
    assert.equal(await countCase.page.locator('[data-nds-imported-icon]').count(), 200);
    const countBackup = await backupLibrary(countCase.page);
    const recovered = await boot();
    try {
      await previewBackup(recovered.page, countBackup); await confirmTransfer(recovered.page);
      assert.equal(await recovered.page.locator('[data-nds-imported-icon]').count(), 200, 'all 200 library entries can be restored');
      const extra = JSON.parse(countBackup.toString());
      extra.icons = [{ ...extra.icons[0], asset: {
        ...extra.icons[0].asset, id: stamp(),
        dataUrl: 'data:image/svg+xml;base64,' + Buffer.from(SVG('#fefafa')).toString('base64'),
      } }];
      await previewBackup(recovered.page, extra);
      assert.equal(await recovered.page.locator('[data-nds-transfer-confirm]').isDisabled(), true);
      assert.ok((await recovered.page.locator('[data-nds-library-preview] [role="alert"]').textContent()).includes('200'));
      assert.equal(await recovered.page.locator('[data-nds-imported-icon]').count(), 200);
    } finally { await recovered.context.close(); }
    console.log('PASS personal library accepts icon 200 and rejects icon 201');
  } finally { await countCase.context.close(); }

  const bytesCase = await boot();
  try {
    const png = await makePng(bytesCase.page, 16);
    const svg = SVG('#713485');
    const canonicalBytes = Buffer.byteLength(svg);
    const fixtures = Array.from({ length: 25 }, (_, i) => ({
      id: stamp(), label: `Large ${i}`, mime: 'image/png',
      dataUrl: 'data:image/png;base64,' + paddedPng(png, i === 24 ? 2 * MB - canonicalBytes : 2 * MB, i).toString('base64'),
    }));
    assert.equal(fixtures.reduce((sum, f) => sum + Buffer.from(f.dataUrl.split(',')[1], 'base64').length, 0), 50 * MB - canonicalBytes);
    await seed(bytesCase.page, fixtures);
    assert.equal(await bytesCase.page.locator('[data-nds-imported-icon]').count(), 25);
    await importClean(bytesCase.page, [file('Exact 50 MiB.svg', svg)]);
    assert.equal(await bytesCase.page.locator('[data-nds-imported-icon]').count(), 26);
    const result = await importFiles(bytesCase.page, [file('Over 50 MiB.svg', SVG('#772394'))]);
    assert.equal(result[0].status, 'error', JSON.stringify(result));
    assert.ok(result[0].text.includes('50 MB'));
    const fullBackup = await backupLibrary(bytesCase.page);
    assert.ok(fullBackup.length > 50 * MB && fullBackup.length < Math.ceil(50 * MB * 4 / 3) + MB);
    const recovered = await boot();
    try {
      await previewBackup(recovered.page, fullBackup);
      await confirmTransfer(recovered.page);
      assert.equal(await recovered.page.locator('[data-nds-imported-icon]').count(), 26);
      const bytes = await recovered.page.evaluate(async () => {
        const db = await new Promise(resolve => { const r = indexedDB.open('nds-imported-icons', 1); r.onsuccess = () => resolve(r.result); });
        try {
          return await new Promise((resolve, reject) => {
            const r = db.transaction('assets').objectStore('assets').getAll();
            r.onsuccess = () => resolve(r.result.reduce((sum, item) => sum + item.bytes, 0));
            r.onerror = () => reject(r.error);
          });
        } finally { db.close(); }
      });
      assert.equal(bytes, 50 * MB, 'a genuine full-size library survives backup and restore');
    } finally { await recovered.context.close(); }
    console.log('PASS actual stored artwork reaches exactly 50 MiB and rejects further bytes');
  } finally { await bytesCase.context.close(); }
}

async function transfers() {
  const { page, context } = await boot();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-icon-folder-'));
  const subfolder = path.join(directory, 'Subfolder');
  const unsupported = path.join(directory, 'Unsupported');
  const generated = [];
  const write = (relative, content) => {
    const target = path.join(directory, relative);
    fs.writeFileSync(target, content); generated.push(target);
  };
  let backup, saved;
  try {
    fs.mkdirSync(subfolder);
    write('Router.svg', SVG('#2563eb'));
    write(path.join('Subfolder', 'Gateway.png'), await makePng(page));
    write(path.join('Subfolder', 'Router duplicate.svg'), SVG('#2563eb'));
    write(path.join('Subfolder', 'Spare.svg'), SVG('#ff7300'));
    write('Unsafe.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><script>window.__folderExecuted=1</script></svg>');
    write('Readme.txt', 'Unsupported files are ignored, never uploaded.');
    write('Metadata.json', '{}');

    const trigger = page.locator('[data-nds-import-icons]');
    await trigger.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.ndsIconCommand), 'files');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.ndsIconCommand), 'folder');
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(button => button === document.activeElement), true);
    await previewFolder(page, directory);
    await checkRightsWarning(page, 'folder');
    const counts = await page.locator('[data-nds-transfer-count]').evaluateAll(elements =>
      Object.fromEntries(elements.map(el => [el.dataset.ndsTransferCount, Number(el.textContent)])));
    assert.deepEqual(counts, { ready: 3, duplicate: 1, error: 1, ignored: 2 });
    assert.equal(await page.locator('[data-nds-transfer-file]').count(), 5);
    assert.deepEqual(await iconStorage(page), { assets: [], library: [] }, 'preview never writes any artwork');
    if (process.env.NDS_TRANSFER_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.NDS_TRANSFER_PREVIEW_DIR, 'folder-preview.png') });
    }
    await page.locator('[data-nds-transfer-cancel]').click();
    assert.deepEqual(await iconStorage(page), { assets: [], library: [] });
    assert.equal(await trigger.evaluate(button => button === document.activeElement), true);
    await previewFolder(page, directory);
    assert.equal(await page.locator('[data-nds-import-rights]').textContent(), RIGHTS_NOTICE, 'folder warning is shown again before importing');
    await confirmTransfer(page);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 3);
    assert.equal((await graph(page)).nodes.length, 0, 'folder imports do not place nodes');
    assert.equal(await page.evaluate(() => window.__folderExecuted), undefined);
    assert.deepEqual(await page.locator('[data-nds-import-result]').evaluateAll(elements =>
      elements.map(el => el.dataset.ndsImportResult).sort()), ['duplicate', 'error']);
    const beforeDuplicate = await iconStorage(page);
    await previewFolder(page, directory);
    assert.equal(await page.locator('[data-nds-transfer-count="ready"]').textContent(), '0');
    assert.equal(await page.locator('[data-nds-transfer-count="duplicate"]').textContent(), '4');
    assert.equal(await page.locator('[data-nds-transfer-confirm]').isDisabled(), true);
    await page.locator('[data-nds-transfer-cancel]').click();
    assert.deepEqual(await iconStorage(page), beforeDuplicate);

    const router = await page.locator('[data-nds-imported-icon]').filter({ hasText: 'Router' }).first().getAttribute('data-nds-imported-icon');
    await manage(page, router, 'Rename');
    await page.locator('[data-nds-imported-icon-name]').fill('Edge Router');
    await page.locator('[data-nds-imported-icon-confirm]').click();
    await page.locator('[data-nds-imported-icon-dialog]').waitFor({ state: 'detached' });
    await page.evaluate(id => window.__nds_favoritesStore.getState().toggleFavorite('icon', id), router);
    await page.locator(`[data-nds-imported-icon="${router}"]`).click();
    saved = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    backup = JSON.parse((await backupLibrary(page)).toString());
    assert.equal(backup.format, 'nds-icon-library');
    assert.equal(backup.version, 2);
    assert.equal(backup.icons.length, 3, 'unused personal-library icons are included in the backup');
    assert.equal(backup.icons.find(item => item.asset.id === router).label, 'Edge Router');
    assert.equal(backup.icons.find(item => item.asset.id === router).favorite, true);
    assert.equal(saved.iconAssets.length, 1, 'diagram JSON remains used-artwork only');
    assert.deepEqual(await page.locator('[data-nds-imported-icon]').evaluateAll(elements => elements.map(el => el.dataset.ndsImportedIcon)),
      backup.icons.map(item => item.asset.id), 'backup array order matches the visible library');
    await page.waitForTimeout(1000);
    await clearIconStorage(page);
    await page.reload();
    await page.locator('[data-nds-imported-missing]').waitFor({ state: 'attached' });
    await openSection(page, 'imported');
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 0);
    await previewBackup(page, backup);
    await page.locator('[data-nds-transfer-cancel]').click();
    assert.deepEqual(await iconStorage(page), { assets: [], library: [] });
    await page.evaluate(() => {
      const favorites = window.__nds_favoritesStore.getState();
      favorites.toggleFavorite('resource', 'vm'); favorites.toggleFavorite('shape', 'ellipse');
    });
    await previewBackup(page, backup);
    if (process.env.NDS_TRANSFER_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.NDS_TRANSFER_PREVIEW_DIR, 'restore-preview.png') });
    }
    await confirmTransfer(page);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0, 'original IDs repair existing diagram references');
    assert.equal(await page.locator('[data-nds-library-notice]').count(), 0, 'restore does not leave a success message');
    assert.equal(await page.locator('[data-nds-import-results]').count(), 0, 'restored entries do not leave successful result rows');
    assert.deepEqual((await graph(page)).nodes, saved.nodes);
    const again = JSON.parse((await backupLibrary(page)).toString());
    assert.deepEqual(again.icons, backup.icons, 'artwork, original IDs, renamed labels, order and Favorites are restored exactly');
    assert.deepEqual(await page.evaluate(() => {
      const s = window.__nds_favoritesStore.getState();
      return { resources: [...s.resources], shapes: [...s.shapes] };
    }), { resources: ['vm'], shapes: ['ellipse'] });
    await page.waitForTimeout(1000); await page.reload();
    await page.locator('.react-flow__node').waitFor();
    await openSection(page, 'imported');
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    assert.equal(await page.evaluate(id => window.__nds_favoritesStore.getState().icons.has(id), router), true);
    assert.deepEqual(await page.locator('[data-nds-imported-icon]').evaluateAll(elements => elements.map(el => el.dataset.ndsImportedIcon)),
      backup.icons.map(item => item.asset.id));

    await manage(page, router, 'Rename');
    await page.locator('[data-nds-imported-icon-name]').fill('Keep my current name');
    await page.locator('[data-nds-imported-icon-confirm]').click();
    await page.locator('[data-nds-imported-icon-dialog]').waitFor({ state: 'detached' });
    await importFiles(page, [file('Keep this extra.svg', SVG('#772288'))]);
    await previewBackup(page, backup);
    assert.equal(await page.locator('[data-nds-transfer-count="ready"]').textContent(), '0');
    await confirmTransfer(page);
    const merged = JSON.parse((await backupLibrary(page)).toString());
    assert.equal(merged.icons.length, 4);
    assert.equal(merged.icons.find(item => item.asset.id === router).label, 'Keep my current name');

    for (const lang of ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      await trigger.click();
      assert.notEqual(await page.locator('[data-nds-icon-command="files"]').textContent(), 'Import files');
      await page.keyboard.press('Escape');
      await previewFolder(page, directory);
      assert.notEqual(await page.locator('#nds-library-review-title').textContent(), 'Import folder preview');
      await page.locator('[data-nds-transfer-cancel]').click();
      await previewBackup(page, backup);
      assert.notEqual(await page.locator('#nds-library-review-title').textContent(), 'Restore library preview');
      await page.locator('[data-nds-transfer-cancel]').click();
      const missing = await page.evaluate(() => window.__nds_i18nMissing?.() ?? {});
      assert.deepEqual(missing[lang] ?? [], [], 'translated library-recovery controls: ' + lang);
    }
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    const beforeOversizedFolder = await iconStorage(page);
    fs.mkdirSync(unsupported);
    write(path.join('Unsupported', 'Readme.txt'), 'No supported files here.');
    await previewFolder(page, unsupported);
    assert.equal(await page.locator('[data-nds-library-preview]').count(), 0);
    assert.ok((await page.locator('[data-nds-palette-focused-section] [role="alert"]').textContent()).includes('No SVG or PNG'));
    for (let i = 0; i < 201; i++) write(`Limit-${i}.svg`, SVG('#010203'));
    await previewFolder(page, directory);
    assert.equal(await page.locator('[data-nds-library-preview]').count(), 0);
    assert.ok((await page.locator('[data-nds-palette-focused-section] [role="alert"]').textContent()).includes('200'));
    assert.deepEqual(await iconStorage(page), beforeOversizedFolder, 'unsupported/oversized folder selections never change storage');
    console.log('PASS native folder selection, recursive filtering, preview/cancel, merge, original-ID recovery, Favorites, order, reload and localization');
  } finally {
    await context.close();
    for (const target of generated) fs.unlinkSync(target);
    if (fs.existsSync(unsupported)) fs.rmdirSync(unsupported);
    if (fs.existsSync(subfolder)) fs.rmdirSync(subfolder);
    fs.rmdirSync(directory);
  }

  const aliases = await boot();
  try {
    await importFiles(aliases.page, [file('Local Router.svg', SVG('#2563eb'))]);
    const localId = await aliases.page.locator('[data-nds-imported-icon]').getAttribute('data-nds-imported-icon');
    await previewBackup(aliases.page, backup); await confirmTransfer(aliases.page);
    const merged = JSON.parse((await backupLibrary(aliases.page)).toString());
    assert.equal(merged.icons.length, 3, 'identical artwork is not duplicated in the library');
    assert.equal(merged.icons[0].asset.id, localId);
    assert.equal(merged.icons[0].label, 'Local Router');
    assert.equal(merged.icons[0].favorite, true, 'backup Favorites map to the retained library entry');
    assert.ok((await iconStorage(aliases.page)).assets.some(asset => asset.id === saved.iconAssets[0].id),
      'the original ID is still retained for document references');
    await loadFile(aliases.page, saved);
    assert.equal(await aliases.page.locator('[data-nds-imported-missing]').count(), 0);
    assert.deepEqual((await graph(aliases.page)).nodes, saved.nodes);
  } finally { await aliases.context.close(); }

  const rejected = await boot();
  try {
    await importFiles(rejected.page, [file('Existing.svg', SVG('#663344'))]);
    const before = await iconStorage(rejected.page);
    for (const change of [
      value => { value.format = 'diagram'; },
      value => { value.version = 999; },
      value => { value.icons.push(value.icons[0]); },
      value => { value.icons[0].favorite = 'yes'; },
      value => { value.icons[0].label = 'x'.repeat(81); },
      value => { value.icons[0].sourceFolder = '../Other'; },
      value => { value.icons[0].sourceFolder = 'x'.repeat(256); },
      value => { value.icons[0].sourceFolder = 'Bad\nFolder'; },
      value => { value.icons[0].asset.dataUrl = 'javascript:alert(1)'; },
      value => { value.icons[0].asset.id = 'networking--virtual-networks'; },
      value => { value.icons[0].asset.dataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" onload="window.__backupExecuted=1"/>').toString('base64'); },
      value => { value.icons = Array.from({ length: 201 }, () => value.icons[0]); },
    ]) {
      const value = structuredClone(backup); change(value);
      await previewBackup(rejected.page, value);
      assert.equal(await rejected.page.locator('[data-nds-library-preview]').count(), 0, 'invalid backups never reach confirmation');
      assert.deepEqual(await iconStorage(rejected.page), before, 'invalid backups do not mutate any stored artwork');
    }
    const conflict = structuredClone(backup);
    conflict.icons[0].asset.id = before.library[0].id;
    await previewBackup(rejected.page, conflict);
    await rejected.page.locator('[data-nds-transfer-confirm]').click();
    await rejected.page.locator('[data-nds-library-preview] [role="alert"]').waitFor();
    assert.deepEqual(await iconStorage(rejected.page), before);
    await rejected.page.locator('[data-nds-transfer-cancel]').click();
    const oversized = Buffer.alloc(Math.ceil(50 * MB * 4 / 3) + MB + 1, 32);
    await previewBackup(rejected.page, oversized);
    assert.equal(await rejected.page.locator('[data-nds-library-preview]').count(), 0);
    assert.deepEqual(await iconStorage(rejected.page), before);
    assert.equal(await rejected.page.evaluate(() => window.__backupExecuted), undefined);
    await rejected.page.evaluate(async id => {
      const db = await new Promise(resolve => { const r = indexedDB.open('nds-imported-icons', 1); r.onsuccess = () => resolve(r.result); });
      try {
        const tx = db.transaction('assets', 'readwrite');
        const request = tx.objectStore('assets').get(id);
        request.onsuccess = () => tx.objectStore('assets').put({ ...request.result, dataUrl: 'javascript:alert(1)' });
        await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); });
      } finally { db.close(); }
    }, before.assets[0].id);
    let downloads = 0;
    rejected.page.on('download', () => downloads++);
    await rejected.page.locator('[data-nds-library-actions]').click();
    await rejected.page.locator('[data-nds-icon-command="backup"]').click();
    await rejected.page.locator('[data-nds-palette-focused-section] [role="alert"]').waitFor();
    assert.equal(downloads, 0, 'backup reads and validates persisted artwork instead of silently exporting a stale cache');
    console.log('PASS malformed, hostile, wrong-version, oversized and conflicting backups are rejected without changes');
  } finally { await rejected.context.close(); }

  const denied = await boot({ init: () => {
    const original = IDBObjectStore.prototype.put;
    let count = 0;
    IDBObjectStore.prototype.put = function(...args) {
      if (this.name === 'library' && ++count === 2) throw new DOMException('Injected recovery quota failure.', 'QuotaExceededError');
      return original.apply(this, args);
    };
  } });
  try {
    await previewBackup(denied.page, backup);
    await denied.page.locator('[data-nds-transfer-confirm]').click();
    await denied.page.locator('[data-nds-library-preview] [role="alert"]').waitFor();
    assert.deepEqual(await iconStorage(denied.page), { assets: [], library: [] }, 'a late restore failure rolls back every asset and membership');
    assert.equal(await denied.page.locator('[data-nds-imported-icon]').count(), 0);
    await confirmTransfer(denied.page);
    assert.equal(await denied.page.locator('[data-nds-imported-icon]').count(), 3, 'the same preview can be retried after a transient failure');
  } finally { await denied.context.close(); }

  const favoriteFailure = await boot({ init: () => {
    const original = Storage.prototype.setItem;
    window.__failFavorites = true;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'nds.favorites.v1' && window.__failFavorites) throw new DOMException('Injected Favorites failure.', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  } });
  try {
    await previewBackup(favoriteFailure.page, backup); await confirmTransfer(favoriteFailure.page);
    assert.equal(await favoriteFailure.page.locator('[data-nds-imported-icon]').count(), 3);
    assert.ok((await favoriteFailure.page.locator('[data-nds-palette-focused-section] [role="alert"]').textContent()).includes('Icons were restored'));
    await favoriteFailure.page.evaluate(() => { window.__failFavorites = false; });
    await previewBackup(favoriteFailure.page, backup); await confirmTransfer(favoriteFailure.page);
    assert.equal(await favoriteFailure.page.evaluate(id => window.__nds_favoritesStore.getState().icons.has(id),
      backup.icons.find(item => item.favorite).asset.id), true);
    console.log('PASS transactional rollback, retry, and explicit partial-success reporting for blocked Favorites storage');
  } finally { await favoriteFailure.context.close(); }

  const unsupportedBrowser = await boot({ init: () => { delete HTMLInputElement.prototype.webkitdirectory; } });
  try {
    await unsupportedBrowser.page.locator('[data-nds-import-icons]').click();
    assert.equal(await unsupportedBrowser.page.locator('[data-nds-icon-command="folder"]').isDisabled(), true);
    assert.equal(await unsupportedBrowser.page.locator('[data-nds-icon-command="files"]').isEnabled(), true);
    await unsupportedBrowser.page.keyboard.press('Escape');
    await importClean(unsupportedBrowser.page, [file('Fallback.svg', SVG('#399388'))]);
    console.log('PASS browsers without folder selection retain file import');
  } finally { await unsupportedBrowser.context.close(); }
}

async function deletion() {
  const { page, context } = await boot();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-library-delete-'));
  const unicodeName = '\u6771\u4eac & Icons (2026)';
  const folders = ['Logos', 'Other', unicodeName].map(name => path.join(root, name));
  const files = [];
  const write = (folder, name, content) => {
    const target = path.join(folder, name);
    fs.writeFileSync(target, content); files.push(target);
  };
  let backup;
  try {
    for (const folder of folders) fs.mkdirSync(folder);
    write(folders[0], 'Router.svg', SVG('#2563eb'));
    write(folders[0], 'Cloud.png', await makePng(page));
    write(folders[0], 'Spare.svg', SVG('#ff7300'));
    write(folders[1], 'Other.svg', SVG('#663399'));
    write(folders[2], 'Unicode.svg', SVG('#884477'));
    await previewFolder(page, folders[0]); await confirmTransfer(page);
    const before = await iconStorage(page);
    assert.equal(before.library.length, 3);
    assert.ok(before.library.every(item => item.sourceFolder === 'Logos'));
    const ids = before.library.map(item => item.id);
    await page.locator('[data-nds-imported-icon]').filter({ hasText: 'Router' }).click();
    await page.locator('[data-nds-imported-icon]').filter({ hasText: 'Cloud' }).click();
    await page.evaluate(ids => {
      const store = window.__nds_diagramStore.getState();
      store.diagram.nodes.forEach((node, index) => store.moveNode(node.id, { x: 100 + index * 240, y: 100 }));
      store.selectNode(null);
      const favorites = window.__nds_favoritesStore.getState();
      for (const id of ids) favorites.toggleFavorite('icon', id);
      favorites.toggleFavorite('icon', 'networking--virtual-networks');
      favorites.toggleFavorite('resource', 'vm'); favorites.toggleFavorite('shape', 'ellipse');
    }, ids);
    const saved = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    backup = JSON.parse((await backupLibrary(page)).toString());
    assert.equal(backup.version, 2);
    assert.ok(backup.icons.every(item => item.sourceFolder === 'Logos'));
    await page.waitForTimeout(1000); await page.reload();
    await page.locator('.react-flow__node').nth(1).waitFor();
    await openSection(page, 'imported');
    await page.locator('[data-nds-library-actions]').click();
    const menu = page.locator('[data-nds-icon-menu="library"]');
    assert.deepEqual(await menu.locator('[data-nds-icon-command]').evaluateAll(elements => elements.map(el => el.dataset.ndsIconCommand)),
      ['backup', 'restore', 'delete']);
    assert.equal(await menu.getByRole('separator').count(), 1);
    assert.ok((await page.locator('[data-nds-icon-command="delete"]').getAttribute('class')).includes('text-red-700'));
    if (process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR) {
      await menu.screenshot({ path: path.join(process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR, 'library-actions.png') });
    }
    await page.keyboard.press('End'); await page.keyboard.press('Enter');
    await page.locator('[data-nds-library-delete]').waitFor(); await settle(page);
    assert.equal(await page.locator('[data-nds-delete-token]').textContent(), 'Logos', 'the saved folder name survives reload');
    assert.equal(await page.locator('[data-nds-delete-count]').textContent(), '3');
    assert.equal(await page.locator('[data-nds-delete-input]').evaluate(el => el === document.activeElement), true);
    for (const wrong of ['', 'logos', 'Logos ', 'Other', 'DELETE ALL']) {
      await page.locator('[data-nds-delete-input]').fill(wrong);
      assert.equal(await page.locator('[data-nds-delete-confirm]').isDisabled(), true);
    }
    await page.locator('[data-nds-library-delete] form').evaluate(form => form.requestSubmit());
    assert.deepEqual(await iconStorage(page), before, 'a wrong confirmation cannot submit or change storage');
    await page.locator('[data-nds-delete-input]').fill('Logos');
    assert.equal(await page.locator('[data-nds-delete-confirm]').isEnabled(), true);
    if (process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR) {
      await page.locator('[data-nds-library-delete]').screenshot({ path: path.join(process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR, 'delete-folder-confirmation.png') });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.locator('[data-nds-library-delete]').screenshot({ path: path.join(process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR, 'delete-confirmation-dark.png') });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    }
    await page.locator('[data-nds-delete-cancel]').click();
    assert.deepEqual(await iconStorage(page), before);
    assert.equal(await page.locator('[data-nds-library-actions]').evaluate(el => el === document.activeElement), true);
    await previewDeletion(page); await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nds-library-delete]').count(), 0);
    assert.deepEqual(await iconStorage(page), before);
    for (const lang of ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      await previewDeletion(page);
      assert.notEqual(await page.locator('#nds-library-delete-title').textContent(), 'Delete all imported icons?');
      assert.equal(await page.locator('[data-nds-delete-token]').textContent(), 'Logos');
      await page.locator('[data-nds-delete-cancel]').click();
      const missing = await page.evaluate(() => window.__nds_i18nMissing?.() ?? {});
      assert.deepEqual(missing[lang] ?? [], [], 'localized deletion dialog: ' + lang);
    }
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    const history = await page.evaluate(() => window.__nds_diagramStore.getState().history);
    await previewDeletion(page); await confirmDeletion(page);
    const cleared = await iconStorage(page);
    assert.deepEqual(cleared.library, []);
    assert.deepEqual(cleared.assets, before.assets, 'bulk deletion retains all artwork, including archive-only icons');
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 0);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    assert.deepEqual((await graph(page)).nodes, saved.nodes);
    assert.deepEqual(await page.evaluate(() => window.__nds_diagramStore.getState().history), history);
    assert.deepEqual(await page.evaluate(() => {
      const favorites = window.__nds_favoritesStore.getState();
      return { icons: [...favorites.icons], resources: [...favorites.resources], shapes: [...favorites.shapes] };
    }), { icons: ['networking--virtual-networks'], resources: ['vm'], shapes: ['ellipse'] });
    const after = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    assert.deepEqual(after.iconAssets, saved.iconAssets);
    assert.deepEqual(after.nodes, saved.nodes);
    const exported = await download(page, 'Export the full diagram as PNG');
    const pixels = await artworkPixels(page, 'data:image/png;base64,' + exported.toString('base64'));
    assert.ok(pixels.blue > 200 && pixels.green > 200, 'retained SVG and PNG artwork still exports');
    await page.locator('[data-nds-library-actions]').click();
    assert.equal(await page.locator('[data-nds-icon-command="delete"]').isDisabled(), true);
    await page.keyboard.press('Escape');
    for (const target of files) assert.ok(fs.statSync(target).size > 0, 'the original files are never removed');
    await page.waitForTimeout(1000); await page.reload();
    await page.locator('.react-flow__node').nth(1).waitFor();
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    await previewBackup(page, backup); await confirmTransfer(page);
    await previewDeletion(page);
    assert.equal(await page.locator('[data-nds-delete-token]').textContent(), 'Logos', 'v2 backups restore folder metadata');
    await page.locator('[data-nds-delete-cancel]').click();

    await previewFolder(page, folders[1]); await confirmTransfer(page);
    await previewDeletion(page);
    assert.equal(await page.locator('[data-nds-delete-token]').textContent(), 'DELETE ALL');
    await page.locator('[data-nds-delete-cancel]').click();
    await importClean(page, [file('Individual.svg', SVG('#771199'))]);
    await previewDeletion(page);
    assert.equal(await page.locator('[data-nds-delete-token]').textContent(), 'DELETE ALL');
    assert.equal(await page.locator('[data-nds-delete-count]').textContent(), '5');
    if (process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR) {
      await page.locator('[data-nds-library-delete]').screenshot({ path: path.join(process.env.NDS_LIBRARY_DELETE_PREVIEW_DIR, 'delete-fallback-confirmation.png') });
    }
    await confirmDeletion(page);
    await previewFolder(page, folders[2]); await confirmTransfer(page);
    await previewDeletion(page);
    assert.equal(await page.locator('[data-nds-delete-token]').textContent(), unicodeName);
    await confirmDeletion(page);
    console.log('PASS exact folder confirmation, cancel/Escape, language support, mixed origins, Favorites and retained diagrams/files');
  } finally {
    await context.close();
    for (const target of files) fs.unlinkSync(target);
    for (const folder of folders) if (fs.existsSync(folder)) fs.rmdirSync(folder);
    fs.rmdirSync(root);
  }

  const legacy = await boot();
  try {
    const oldBackup = structuredClone(backup); oldBackup.version = 1;
    for (const item of oldBackup.icons) delete item.sourceFolder;
    await previewBackup(legacy.page, oldBackup); await confirmTransfer(legacy.page);
    await previewDeletion(legacy.page);
    assert.equal(await legacy.page.locator('[data-nds-delete-token]').textContent(), 'DELETE ALL');
    await legacy.page.locator('[data-nds-delete-input]').fill('delete all');
    assert.equal(await legacy.page.locator('[data-nds-delete-confirm]').isDisabled(), true);
    await confirmDeletion(legacy.page);
    await importClean(legacy.page, [file('Individual.svg', SVG('#125578'))]);
    await previewDeletion(legacy.page);
    assert.equal(await legacy.page.locator('[data-nds-delete-token]').textContent(), 'DELETE ALL');
    await confirmDeletion(legacy.page);
    console.log('PASS legacy backups and individual files use the explicit DELETE ALL fallback');
  } finally { await legacy.context.close(); }

  for (const change of ['folder', 'membership']) {
    const stale = await boot();
    try {
      await previewBackup(stale.page, backup); await confirmTransfer(stale.page);
      await previewDeletion(stale.page);
      await stale.page.evaluate(async ({ change, newId }) => {
        const db = await new Promise(resolve => { const r = indexedDB.open('nds-imported-icons', 1); r.onsuccess = () => resolve(r.result); });
        try {
          const tx = db.transaction(['library', 'assets'], 'readwrite');
          const request = tx.objectStore('library').getAll();
          request.onsuccess = () => {
            const entry = request.result[0];
            if (change === 'folder') tx.objectStore('library').put({ ...entry, sourceFolder: 'Changed folder' });
            else {
              const asset = tx.objectStore('assets').get(entry.id);
              asset.onsuccess = () => {
                tx.objectStore('assets').put({ ...asset.result, id: newId });
                tx.objectStore('library').delete(entry.id);
                tx.objectStore('library').put({ ...entry, id: newId });
              };
            }
          };
          await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); });
        } finally { db.close(); }
      }, { change, newId: stamp() });
      const changed = await iconStorage(stale.page);
      await stale.page.locator('[data-nds-delete-input]').fill('Logos');
      await stale.page.locator('[data-nds-delete-confirm]').click();
      await stale.page.locator('[data-nds-library-delete] [role="alert"]').waitFor();
      assert.ok((await stale.page.locator('[data-nds-library-delete] [role="alert"]').textContent()).includes('library changed'));
      assert.deepEqual(await iconStorage(stale.page), changed, 'a stale confirmation never clears a changed library');
      await stale.page.locator('[data-nds-delete-cancel]').click();
      await previewDeletion(stale.page); await confirmDeletion(stale.page);
      assert.deepEqual((await iconStorage(stale.page)).library, []);
    } finally { await stale.context.close(); }
  }

  const denied = await boot({ init: () => {
    const original = IDBObjectStore.prototype.clear;
    window.__failDelete = true;
    IDBObjectStore.prototype.clear = function() {
      const request = original.call(this);
      if (this.name === 'library' && window.__failDelete) this.transaction.abort();
      return request;
    };
  } });
  try {
    await previewBackup(denied.page, backup); await confirmTransfer(denied.page);
    const before = await iconStorage(denied.page);
    await previewDeletion(denied.page);
    await denied.page.locator('[data-nds-delete-input]').fill('Logos');
    await denied.page.locator('[data-nds-delete-confirm]').click();
    await denied.page.locator('[data-nds-library-delete] [role="alert"]').waitFor();
    assert.deepEqual(await iconStorage(denied.page), before, 'a failed deletion rolls back its membership changes');
    assert.equal(await denied.page.locator('[data-nds-imported-icon]').count(), 3);
    assert.equal(await denied.page.evaluate(() => window.__nds_favoritesStore.getState().icons.size), 3);
    await denied.page.evaluate(() => { window.__failDelete = false; });
    await confirmDeletion(denied.page);
    assert.deepEqual((await iconStorage(denied.page)).library, []);
  } finally { await denied.context.close(); }

  const favorites = await boot({ init: () => {
    const setItem = Storage.prototype.setItem;
    const clear = IDBObjectStore.prototype.clear;
    window.__deleteCalls = 0;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'nds.favorites.v1' && window.__failFavoriteCleanup) throw new DOMException('Injected cleanup failure.', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
    IDBObjectStore.prototype.clear = function() {
      if (this.name === 'library') window.__deleteCalls++;
      return clear.call(this);
    };
  } });
  try {
    await previewBackup(favorites.page, backup); await confirmTransfer(favorites.page);
    await favorites.page.evaluate(() => { window.__failFavoriteCleanup = true; });
    await previewDeletion(favorites.page);
    await favorites.page.locator('[data-nds-delete-input]').fill('Logos');
    await favorites.page.locator('[data-nds-delete-confirm]').click();
    await favorites.page.locator('[data-nds-library-delete] [role="alert"]').waitFor();
    assert.deepEqual((await iconStorage(favorites.page)).library, []);
    assert.equal(await favorites.page.locator('[data-nds-delete-input]').count(), 0);
    assert.ok((await favorites.page.locator('[data-nds-library-delete] [role="alert"]').textContent()).includes('library was cleared'));
    for (const lang of ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await favorites.page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
      assert.notEqual(await favorites.page.locator('[data-nds-delete-confirm]').textContent(), 'Retry cleanup');
      assert.notEqual(await favorites.page.locator('[data-nds-delete-cancel]').textContent(), 'Close');
      const missing = await favorites.page.evaluate(() => window.__nds_i18nMissing?.() ?? {});
      assert.deepEqual(missing[lang] ?? [], []);
    }
    await favorites.page.evaluate(() => { window.__failFavoriteCleanup = false; });
    await favorites.page.locator('[data-nds-delete-confirm]').click();
    await favorites.page.locator('[data-nds-library-delete]').waitFor({ state: 'detached' });
    assert.equal(await favorites.page.evaluate(() => window.__nds_favoritesStore.getState().icons.size), 0);
    assert.equal(await favorites.page.evaluate(() => window.__deleteCalls), 1, 'Favorites retries never repeat the destructive transaction');
    console.log('PASS stale-preview protection, atomic rollback/retry and explicit retryable Favorites cleanup');
  } finally { await favorites.context.close(); }
}

async function portableFile() {
  const { page, context } = await boot({ portable: true });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-offline-folder-'));
  const folderFile = path.join(directory, 'Recovery.svg');
  try {
    await importClean(page, [file('Offline.svg', SVG('#2563eb'))]);
    const id = await page.locator('[data-nds-imported-icon]').first().getAttribute('data-nds-imported-icon');
    await page.locator('[data-nds-imported-icon]').first().click();
    await page.waitForTimeout(1000);
    await page.reload();
    await page.locator('.react-flow__node').waitFor();
    await openSection(page, 'imported');
    assert.equal(await page.locator(`[data-nds-imported-icon="${id}"]`).count(), 1);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    const saved = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    assert.equal(saved.iconAssets[0].id, id);
    fs.writeFileSync(folderFile, SVG('#458977'));
    await previewFolder(page, directory); await confirmTransfer(page);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 2);
    const backup = await backupLibrary(page);
    await clearIconStorage(page); await page.reload();
    await page.locator('[data-nds-imported-missing]').waitFor({ state: 'attached' });
    await previewBackup(page, backup); await confirmTransfer(page);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 2);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    await previewDeletion(page);
    assert.equal(await page.locator('[data-nds-delete-token]').textContent(), 'DELETE ALL');
    await confirmDeletion(page);
    assert.equal(await page.locator('[data-nds-imported-icon]').count(), 0);
    assert.equal(await page.locator('[data-nds-imported-missing]').count(), 0);
    const afterDeletion = JSON.parse((await download(page, 'Save current diagram as JSON')).toString());
    assert.deepEqual(afterDeletion.iconAssets, saved.iconAssets);
    console.log('PASS portable file:// files/folders, auto-save, library recovery and embedded JSON without a web server');
  } finally {
    await context.close();
    if (fs.existsSync(folderFile)) fs.unlinkSync(folderFile);
    fs.rmdirSync(directory);
  }
}

(async () => {
  browser = await chromium.launch({ headless: true });
  try {
    if (ONLY === 'all' || ONLY === 'workflow') await workflow();
    if (ONLY === 'all' || ONLY === 'safety') await safety();
    if (ONLY === 'all' || ONLY === 'limits') await limits();
    if (ONLY === 'all' || ONLY === 'transfers') await transfers();
    if (ONLY === 'all' || ONLY === 'deletion') await deletion();
    if (ONLY === 'all') await portableFile();
    assert.deepEqual(errors, [], 'No uncaught page errors');
    assert.deepEqual(external, [], 'Imported content must never make external requests');
    console.log('PASS imported-icons suite');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
