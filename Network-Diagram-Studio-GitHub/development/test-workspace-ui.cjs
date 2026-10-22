const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { openHeaderMenu, clickHeaderAction } = require('./test-header-menu-helper.cjs');

const entry = process.argv[2] || path.join(__dirname, '..', 'index.html');
const preview = /^https?:/.test(entry);
const url = preview ? entry : pathToFileURL(path.resolve(entry)).href;
const latest = require('./src/updates/release-history.json')[0].version;
const evidence = process.env.NDS_WORKSPACE_EVIDENCE;
const backgroundKey = 'nds.canvas.background';
const fixture = {
  version: 1,
  meta: { title: 'Workspace controls', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
  nodes: [
    { id: 'app', type: 'vm', position: { x: 160, y: 220 }, size: { w: 260, h: 180 }, data: { name: 'App', fields: {} } },
    { id: 'storage', type: 'storage', position: { x: 660, y: 220 }, size: { w: 260, h: 180 }, data: { name: 'Storage', fields: {} } },
  ],
  edges: [{ id: 'https', source: 'app', target: 'storage', kind: 'link', label: 'HTTPS' }],
  annotations: [], shapes: [], strokes: [], notes: 'Keep this note.', comments: [], images: [],
};
const settle = page => page.waitForTimeout(140);
const trigger = (page, id) => page.locator(`[data-nds-menu-trigger="${id}"]`);
const state = page => page.evaluate(() => {
  const diagram = window.__nds_diagramStore.getState();
  const tabs = window.__nds_tabsStore.getState();
  return JSON.stringify({
    diagram: diagram.diagram, history: diagram.history, node: diagram.selectedNodeId,
    nodes: diagram.selectedNodeIds, edge: diagram.selectedEdgeId, tabs: tabs.tabs, active: tabs.activeTabId,
    tool: window.__nds_annotationStore.getState().tool,
    shapes: window.__nds_annotationStore.getState().selectedShapeIds,
    camera: document.querySelector('.react-flow__viewport').style.transform,
  });
});
async function downloaded(page, action) {
  const pending = page.waitForEvent('download');
  await clickHeaderAction(page, action);
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function boot(browser, init) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 960 }, locale: 'en-US', acceptDownloads: true });
  await context.addInitScript(version => {
    localStorage.setItem('nds.lang', 'en');
    localStorage.setItem('nds.updates.seen.v1', version);
  }, latest);
  if (init) await context.addInitScript(init);
  const page = await context.newPage(), errors = [], external = [], warnings = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  await context.route(/^https?:/, route => {
    if (preview && new URL(route.request().url()).origin === new URL(url).origin) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_diagramStore);
  await page.locator('#nds-arm-open').waitFor({ state: 'attached' });
  await settle(page);
  return { context, page, errors, external, warnings };
}
async function matchedControls(page, english = false) {
  const full = await page.locator('[data-nds-fullscreen]').boundingBox();
  const canvas = await trigger(page, 'canvas-background').boundingBox();
  assert(full && canvas);
  assert.equal(full.width, canvas.width, 'Fullscreen and Canvas have identical widths');
  assert.equal(full.height, 32);
  assert.equal(canvas.height, 32);
  assert.equal(canvas.x - full.x - full.width, 8);
  if (english) assert.equal(full.width, 136);
  const toolbar = await page.locator('[data-nds-annotation-toolbar]').boundingBox();
  assert(toolbar.x + toolbar.width <= full.x || toolbar.x >= canvas.x + canvas.width ||
    toolbar.y + toolbar.height <= full.y || toolbar.y >= full.y + full.height,
  'Drawing tools do not overlap either view control');
}
async function boundedMenu(page, id) {
  await openHeaderMenu(page, id);
  const result = await page.locator(`#nds-menu-${id}`).evaluate(el => {
    const box = el.getBoundingClientRect();
    const canvas = el.closest('[data-nds-fullscreen-target]')?.getBoundingClientRect();
    const bounds = canvas || { left: 0, right: innerWidth, top: 0, bottom: innerHeight };
    return {
      inside: box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom,
      readable: el.scrollWidth <= el.clientWidth,
      labelsFit: [...el.querySelectorAll('.nds-menu-item-copy')].every(copy => copy.scrollWidth <= copy.clientWidth),
      reachable: [...el.querySelectorAll('[role="menuitem"], [role="menuitemradio"]')].every(item => {
        const box = item.getBoundingClientRect();
        return item.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }),
      opaque: getComputedStyle(el).backgroundColor,
    };
  });
  assert(result.inside, `${id}: dropdown stays inside its viewport`);
  assert(result.readable && result.labelsFit, `${id}: translations wrap without clipping`);
  assert(result.reachable, `${id}: every command is above other canvas controls and clickable`);
  assert(!result.opaque.startsWith('rgba('), `${id}: menu remains opaque`);
  await page.keyboard.press('Escape');
}
async function paletteDrops(browser) {
  for (const route of ['resource', 'icon']) {
    const { context, page, errors, external } = await boot(browser);
    const read = () => page.evaluate(() => {
      const pane = document.querySelector('.react-flow').getBoundingClientRect();
      const camera = new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__viewport')).transform);
      const store = window.__nds_diagramStore.getState();
      return {
        pane: pane.toJSON(), camera: { x: camera.e, y: camera.f, zoom: camera.a },
        nodes: store.diagram.nodes, selected: store.selectedNodeId, undo: store.history.past.length,
      };
    });
    const near = (actual, expected, label) =>
      assert(Math.abs(actual - expected) < .01, `${label}: ${actual} versus ${expected}`);
    async function drag(source, point, label) {
      await source.scrollIntoViewIfNeeded();
      const before = await read(), tile = await source.boundingBox();
      assert(tile);
      await page.mouse.move(tile.x + tile.width / 2, tile.y + tile.height / 2);
      await page.mouse.down();
      await page.mouse.move(tile.x + tile.width / 2 + 14, tile.y + tile.height / 2, { steps: 4 });
      await page.mouse.move(point.x, point.y, { steps: 14 });
      await page.mouse.move(point.x + 1, point.y + 1);
      await page.mouse.move(point.x, point.y);
      await page.mouse.up();
      await page.waitForFunction(count => window.__nds_diagramStore.getState().diagram.nodes.length === count,
        before.nodes.length + 1);
      await page.waitForTimeout(350);
      const after = await read(), added = after.nodes.find(node => !before.nodes.some(old => old.id === node.id));
      assert(added, `${label}: exactly one native drop creates a resource`);
      const box = await page.locator(`.react-flow__node[data-id="${added.id}"]`).boundingBox();
      if (evidence) {
        fs.writeFileSync(path.join(evidence, `drop-${route}-${label}.json`), JSON.stringify({ point, before, after, box }, null, 2));
        await page.screenshot({ path: path.join(evidence, `drop-${route}-${label}.png`) });
      }
      assert.deepEqual(after.camera, before.camera, `${route}/${label}: a palette drop must not recenter or zoom the canvas`);
      assert(box && point.x >= box.x && point.x <= box.x + box.width &&
        point.y >= box.y && point.y <= box.y + box.height, `${route}/${label}: the visible resource stays under the drop point`);
      near(box.x, before.pane.x + before.camera.x + added.position.x * before.camera.zoom,
        `${route}/${label}: rendered X uses the unchanged viewport`);
      near(box.y, before.pane.y + before.camera.y + added.position.y * before.camera.zoom,
        `${route}/${label}: rendered Y uses the unchanged viewport`);
      assert.equal(after.selected, added.id);
      assert.equal(after.undo, before.undo + 1, 'One drop creates one undo step');
      assert.deepEqual(after.nodes.filter(node => node.id !== added.id), before.nodes, 'Existing resources do not move');
      return added;
    }
    async function framed(label) {
      const { pane, nodes } = await read();
      for (const node of nodes) {
        const box = await page.locator(`.react-flow__node[data-id="${node.id}"]`).boundingBox();
        assert(box && box.x >= pane.x - 1 && box.x + box.width <= pane.right + 1 &&
          box.y >= pane.y - 1 && box.y + box.height <= pane.bottom + 1, `${label}: resources are framed inside the canvas`);
      }
    }
    try {
      let source;
      if (route === 'resource') {
        source = page.locator('[data-nds-accordion-section="resources"] button[draggable="true"]')
          .filter({ hasText: /^Virtual Machine$/ }).first();
      } else {
        await page.locator('[data-nds-accordion-header="icons"]').click();
        source = page.locator('[data-nds-accordion-section="icons"] [data-nds-icon-tile]').first();
        await page.locator('.react-flow__controls-zoomout').click();
        await page.locator('.react-flow__controls-zoomout').click();
        const pane = await page.locator('.react-flow').boundingBox();
        await page.mouse.move(pane.x + pane.width * .7, pane.y + pane.height * .6);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(pane.x + pane.width * .7 + 70, pane.y + pane.height * .6 - 40, { steps: 8 });
        await page.mouse.up({ button: 'middle' });
        await settle(page);
        assert((await read()).camera.zoom < .9, 'First-icon coverage uses real non-unit zoom and pan');
      }
      let { pane } = await read();
      const first = await drag(source, { x: pane.x + 180, y: pane.y + 235 }, 'first');
      await page.getByTitle('Undo (Ctrl+Z)', { exact: true }).click();
      assert.equal((await read()).nodes.length, 0, 'One undo removes the first drop');
      await page.getByTitle('Redo (Ctrl+Y)', { exact: true }).click();
      await settle(page);
      assert.deepEqual((await read()).nodes, [first], 'Redo restores the exact drop position and properties');
      ({ pane } = await read());
      await drag(source, { x: pane.x + 420, y: pane.y + 520 }, 'later');
      const placed = (await read()).nodes;
      const saved = JSON.parse((await downloaded(page, 'Save JSON')).toString());
      assert.deepEqual(saved.nodes, placed, 'Save JSON preserves native drop positions');

      // Keep recovery framing covered when the deferred first-node Fit is removed.
      for (const node of saved.nodes) {
        node.position.x += 6000;
        node.position.y -= 4000;
      }
      const choosing = page.waitForEvent('filechooser');
      await clickHeaderAction(page, 'Load JSON');
      await (await choosing).setFiles({ name: 'placed-resources.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(saved)) });
      await page.waitForFunction(position =>
        window.__nds_diagramStore.getState().diagram.nodes[0]?.position.x === position, saved.nodes[0].position.x);
      await page.waitForTimeout(350);
      assert.deepEqual((await read()).nodes, saved.nodes, 'Loading does not rewrite placement coordinates');
      await framed('Load JSON');
      await page.waitForTimeout(1100);
      await page.reload();
      await page.locator(`.react-flow__node[data-id="${first.id}"]`).waitFor();
      await page.waitForTimeout(350);
      assert.deepEqual((await read()).nodes, saved.nodes, 'Browser recovery preserves resource positions');
      await framed('Browser recovery');
      await page.locator('.react-flow__controls-zoomout').click();
      await page.locator('.react-flow__controls-fitview').click();
      await page.waitForTimeout(350);
      await framed('Manual Fit');
      assert.deepEqual((await read()).nodes, saved.nodes, 'Manual Fit changes only the viewport');
      assert.deepEqual(errors, []); assert.deepEqual(external, []);
      console.log(`PASS native ${route} drops: first/later pointer placement, unchanged camera, zoom/pan, one-step undo/redo, JSON, recovery and manual Fit`);
    } finally { await context.close(); }
  }
}
async function main(browser) {
  const { context, page, errors, external } = await boot(browser);
  try {
    await matchedControls(page, true);
    assert.equal(await page.locator('[data-nds-feedback-slot] [data-nds-feedback-header]').count(), 1);
    for (const title of ['Undo (Ctrl+Z)', 'Redo (Ctrl+Y)', 'Save current diagram as JSON'])
      assert(await page.getByTitle(title, { exact: true }).isVisible());

    await trigger(page, 'file').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'New');
    await page.keyboard.press('End');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'nds-arm-open');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Load JSON');
    await page.keyboard.press('Escape');
    assert(await trigger(page, 'file').evaluate(el => el === document.activeElement));
    await openHeaderMenu(page, 'file');
    assert.deepEqual(await page.locator('#nds-menu-file [role="menuitem"]').allTextContents()
      .then(labels => labels.map(label => label.replace(/\s+/g, ' ').trim())),
    ['NewStart with an empty canvas', 'Load JSONOpen an editable diagram', 'Import ARMBuild from Azure resource exports']);
    await openHeaderMenu(page, 'export');
    assert.equal(await trigger(page, 'file').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByRole('menu').count(), 1);
    assert.deepEqual(await page.locator('#nds-menu-export [role="menuitem"]').evaluateAll(items =>
      items.map(item => item.getAttribute('aria-label'))), ['PNG', 'SVG', 'Screenshot']);
    await page.mouse.click(4, 4);
    assert.equal(await trigger(page, 'export').getAttribute('aria-expanded'), 'false');
    await trigger(page, 'file').focus(); await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'nds-arm-open');
    await page.keyboard.press('Tab');
    assert.equal(await trigger(page, 'file').getAttribute('aria-expanded'), 'false');
    assert(await page.getByRole('button', { name: 'Save JSON', exact: true }).evaluate(el => el === document.activeElement));

    const choosing = page.waitForEvent('filechooser');
    await clickHeaderAction(page, 'Load JSON');
    await (await choosing).setFiles({ name: 'workspace.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.meta.title === 'Workspace controls');
    const title = page.getByRole('textbox', { name: 'Diagram title', exact: true });
    await title.fill('Edited workspace');
    await page.getByTitle('Undo (Ctrl+Z)', { exact: true }).click();
    assert.equal(await title.inputValue(), fixture.meta.title);
    await page.getByTitle('Redo (Ctrl+Y)', { exact: true }).click();
    assert.equal(await title.inputValue(), 'Edited workspace');
    await page.getByTitle('Undo (Ctrl+Z)', { exact: true }).click();
    await page.evaluate(() => window.__nds_diagramStore.getState().selectNode('app'));
    await settle(page);
    const original = await state(page), saved = JSON.parse((await downloaded(page, 'Save JSON')).toString());
    for (const style of ['blank', 'dots', 'grid']) {
      await openHeaderMenu(page, 'canvas-background');
      await page.locator(`[data-nds-background-option="${style}"]`).click();
      await settle(page);
      assert.equal(await trigger(page, 'canvas-background').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('.react-flow__background').count(), { blank: 0, dots: 1, grid: 2 }[style]);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), backgroundKey), style);
      assert.equal(await state(page), original, `${style}: diagram, tabs, undo, selection, tool and camera are unchanged`);
      await matchedControls(page, true);
      await openHeaderMenu(page, 'canvas-background');
      assert.equal(await page.locator('[role="menuitemradio"][aria-checked="true"]').getAttribute('data-nds-background-option'), style);
      await page.keyboard.press('Delete');
      assert.equal(await state(page), original, 'Editing shortcuts do not leak through an open menu');
      await page.keyboard.press('Escape');
    }
    const patterns = await page.locator('.react-flow__background').evaluateAll(elements => {
      return elements.map(el => ({
        id: el.querySelector('pattern').id,
        gap: Number(el.querySelector('pattern').getAttribute('width')),
        lines: Boolean(el.querySelector('pattern path')),
        transparent: getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)',
      }));
    });
    assert.equal(new Set(patterns.map(pattern => pattern.id)).size, 2);
    assert(patterns.every((pattern, index) => Math.abs(pattern.gap - [18, 90][index]) < .001));
    assert(patterns.every(pattern => pattern.lines) && patterns[1].transparent, 'Minor and major native grid lines are both visible');
    assert.deepEqual(JSON.parse((await downloaded(page, 'Save JSON')).toString()), saved);
    const png = await downloaded(page, 'PNG'), svg = (await downloaded(page, 'SVG')).toString();
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert(svg.includes('<svg') && svg.includes('Storage'));
    await clickHeaderAction(page, 'Screenshot');
    await page.locator('[data-nds-capture-layer]').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('[data-nds-capture-layer]').waitFor({ state: 'detached' });
    await clickHeaderAction(page, 'Import ARM');
    assert(await page.locator('#nds-arm-dialog').evaluate(el => el.open));
    await page.keyboard.press('Escape');
    assert(await trigger(page, 'file').evaluate(el => el === document.activeElement));
    console.log('PASS workspace commands: keyboard/outside/Tab/focus, JSON load/save, PNG/SVG downloads, Screenshot, native ARM and unchanged background-only state');

    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.__nds_themeStore.getState().setPref(value), theme);
      for (const width of [1600, 1024]) {
        await page.setViewportSize({ width, height: 960 });
        for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
          await page.evaluate(value => window.__nds_i18nStore.getState().setLang(value), language);
          await settle(page);
          await matchedControls(page, language === 'en');
          const header = await page.locator('header').evaluate(el => ({
            fits: el.scrollWidth <= el.clientWidth,
            labelsFit: [...el.querySelectorAll('button')].filter(button => button.getClientRects().length)
              .every(button => button.scrollWidth <= button.clientWidth),
          }));
          assert(header.fits && header.labelsFit, `${theme}/${width}/${language}: header fits with full labels`);
          for (const id of ['file', 'export', 'canvas-background']) await boundedMenu(page, id);
          if (evidence && width === 1024 && ['en', 'ja', 'de'].includes(language))
            await page.screenshot({ path: path.join(evidence, `${theme}-${language}-${width}.png`) });
        }
      }
    }
    const misses = await page.evaluate(() => window.__nds_i18nMissing?.() || {});
    const newKeys = new Set(['File', 'Export', 'Create or open', 'Open an editable diagram', 'Build from Azure resource exports',
      'Download full diagram', 'Image file', 'Scalable vector file', 'Capture to Notes', 'Select an area of the diagram',
      'Canvas: {style}', 'Canvas background', 'Blank', 'Dots', 'Grid', 'Current default', 'Changes the background only',
      'Fullscreen', 'Enter fullscreen', 'Exit fullscreen', 'Exit fullscreen (Esc)']);
    for (const [language, missing] of Object.entries(misses))
      assert.deepEqual(missing.filter(key => newKeys.has(key)), [], `${language}: new controls are translated`);
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    for (const direction of ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp']) {
      await page.locator('[data-nds-dock-grip]').focus();
      await page.keyboard.press(direction);
      await settle(page);
      await matchedControls(page, true);
      await boundedMenu(page, 'canvas-background');
    }
    await page.setViewportSize({ width: 1600, height: 960 });
    await page.locator('[data-nds-fullscreen]').click();
    await page.waitForFunction(() => document.fullscreenElement);
    await matchedControls(page, true);
    await boundedMenu(page, 'canvas-background');
    await page.locator('[data-nds-fullscreen]').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore);
    assert.equal(await trigger(page, 'canvas-background').getAttribute('aria-label'), 'Canvas: Grid');
    assert.equal(await page.locator('.react-flow__background').count(), 2);
    assert.equal(await page.locator('header input').inputValue(), fixture.meta.title);
    await clickHeaderAction(page, 'New');
    assert.equal(await page.locator('.react-flow__node').count(), 0);
    assert.equal(await page.locator('.react-flow__edge').count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS workspace layouts: identical 136x32 English controls, equal translated sizes, eight languages, both themes, 1024px, bounded menus, no tool overlap, fullscreen and browser persistence');
  } finally { await context.close(); }
}
async function storageFailures(browser) {
  const blocked = await boot(browser, () => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'nds.canvas.background') throw new DOMException('Storage blocked', 'SecurityError');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nds.canvas.background') throw new DOMException('Storage blocked', 'SecurityError');
      return set.call(this, key, value);
    };
  });
  try {
    const before = await state(blocked.page);
    assert.equal(await trigger(blocked.page, 'canvas-background').getAttribute('aria-label'), 'Canvas: Grid');
    assert.equal(await blocked.page.locator('.react-flow__background').count(), 2);
    await openHeaderMenu(blocked.page, 'canvas-background');
    assert(await blocked.page.locator('#nds-menu-canvas-background [role="status"]').isVisible());
    await blocked.page.locator('[data-nds-background-option="dots"]').click();
    await openHeaderMenu(blocked.page, 'canvas-background');
    assert(await blocked.page.locator('#nds-menu-canvas-background [role="status"]').isVisible());
    assert.equal(await blocked.page.locator('.react-flow__background circle').count(), 1);
    assert.equal(await state(blocked.page), before);
    assert(blocked.warnings.some(warning => warning.includes('could not read the canvas background')));
    assert(blocked.warnings.some(warning => warning.includes('could not save the canvas background')));
    assert.deepEqual(blocked.errors, []); assert.deepEqual(blocked.external, []);
  } finally { await blocked.context.close(); }
  const invalid = await boot(browser, () => localStorage.setItem('nds.canvas.background', 'unknown'));
  try {
    assert.equal(await trigger(invalid.page, 'canvas-background').getAttribute('aria-label'), 'Canvas: Grid');
    await openHeaderMenu(invalid.page, 'canvas-background');
    assert(await invalid.page.locator('#nds-menu-canvas-background [role="status"]').isVisible());
    await invalid.page.locator('[data-nds-background-option="blank"]').click();
    await openHeaderMenu(invalid.page, 'canvas-background');
    assert.equal(await invalid.page.locator('#nds-menu-canvas-background [role="status"]').count(), 0);
    assert.equal(await invalid.page.evaluate(key => localStorage.getItem(key), backgroundKey), 'blank');
    assert.deepEqual(invalid.errors, []); assert.deepEqual(invalid.external, []);
  } finally { await invalid.context.close(); }
  console.log('PASS background storage: blocked reads/writes and invalid values are reported without changing diagrams; valid selections repair invalid preferences');
}
async function backgroundDefaults(browser) {
  const { context, page, errors, external } = await boot(browser);
  try {
    assert.equal(await trigger(page, 'canvas-background').getAttribute('aria-label'), 'Canvas: Grid');
    assert.equal(await page.locator('.react-flow__background').count(), 2);
    assert.equal(await page.locator('.react-flow__background circle').count(), 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), backgroundKey), null);
    await openHeaderMenu(page, 'canvas-background');
    assert(await page.locator('[data-nds-background-option="grid"]').getByText('Current default', { exact: true }).isVisible());
    assert.equal(await page.locator('[data-nds-background-option="dots"]').getByText('Current default', { exact: true }).count(), 0);
    await page.keyboard.press('Escape');
    for (const style of ['blank', 'dots']) {
      await openHeaderMenu(page, 'canvas-background');
      await page.locator(`[data-nds-background-option="${style}"]`).click();
      await page.reload();
      await page.waitForFunction(() => window.__nds_tabsStore);
      await settle(page);
      assert.equal(await trigger(page, 'canvas-background').getAttribute('aria-label'), `Canvas: ${style === 'blank' ? 'Blank' : 'Dots'}`);
      assert.equal(await page.locator('.react-flow__background').count(), style === 'blank' ? 0 : 1);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), backgroundKey), style);
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS canvas default: Grid renders initially and is labeled as default; saved Blank and Dots choices survive reload');
  } finally { await context.close(); }
}
async function backgroundVisibility(browser) {
  const { context, page, errors, external } = await boot(browser);
  const reports = [];
  const choose = async style => {
    await openHeaderMenu(page, 'canvas-background');
    await page.locator(`[data-nds-background-option="${style}"]`).click();
    await page.mouse.move(4, 4);
    await settle(page);
  };
  const geometry = () => page.locator('.react-flow__background').evaluateAll(elements => {
    const camera = new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__viewport')).transform);
    return {
      zoom: camera.a, x: camera.e, y: camera.f,
      patterns: elements.map(el => {
        const pattern = el.querySelector('pattern'), circle = pattern.querySelector('circle');
        return {
          spacing: Number(pattern.getAttribute('width')), height: Number(pattern.getAttribute('height')),
          x: Number(pattern.getAttribute('x')), y: Number(pattern.getAttribute('y')),
          diameter: circle ? Number(circle.getAttribute('r')) * 2 : null,
        };
      }),
    };
  });
  const checkGeometry = (value, style, label) => {
    const spacing = style === 'grid' ? [18, 90] : [30];
    assert.equal(value.patterns.length, spacing.length, `${label}: native pattern count`);
    value.patterns.forEach((pattern, index) => {
      assert(Math.abs(pattern.spacing - spacing[index]) < .001, `${label}: ${style} horizontal spacing stays ${spacing[index]}px`);
      assert(Math.abs(pattern.height - spacing[index]) < .001, `${label}: ${style} vertical spacing stays ${spacing[index]}px`);
      if (style === 'dots') assert(Math.abs(pattern.diameter - 4) < .001, `${label}: dots stay 4px across`);
    });
  };
  const pixels = async (background, blank, style) => page.evaluate(async ({ images, style }) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const samples = [];
    for (const bytes of images) {
      const image = new Image(); image.src = 'data:image/png;base64,' + bytes; await image.decode();
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      samples.push(context.getImageData(0, 0, canvas.width, canvas.height).data);
    }
    const luminance = (data, offset) => [.2126, .7152, .0722].reduce((sum, weight, channel) => {
      const value = data[offset + channel] / 255;
      return sum + weight * (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    }, 0);
    let maximumContrast = 1, visible = 0;
    for (let offset = 0; offset < samples[0].length; offset += 4) {
      const dot = luminance(samples[0], offset), background = luminance(samples[1], offset);
      const contrast = (Math.max(dot, background) + .05) / (Math.min(dot, background) + .05);
      maximumContrast = Math.max(maximumContrast, contrast);
      if (contrast >= (style === 'grid' ? 1.03 : 1.35)) visible++;
    }
    const period = style === 'grid' ? 90 : 30, width = canvas.width, height = canvas.height;
    let difference = 0, comparisons = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      for (const shifted of [x + period < width ? offset + period * 4 : -1,
        y + period < height ? offset + period * width * 4 : -1]) {
        if (shifted < 0) continue;
        for (let channel = 0; channel < 3; channel++) {
          difference += Math.abs(samples[0][offset + channel] - samples[0][shifted + channel]);
          comparisons++;
        }
      }
    }
    return { maximumContrast, visibleFraction: visible / (samples[0].length / 4), repeatError: difference / comparisons };
  }, { images: [background.toString('base64'), blank.toString('base64')], style });
  try {
    await clickHeaderAction(page, 'New');
    assert.equal(await page.locator('.react-flow__node').count(), 0);
    const canvas = await page.locator('.react-flow').boundingBox();
    const clip = { x: Math.ceil(canvas.x + 48), y: Math.ceil(canvas.y + 180), width: 240, height: 160 };
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => {
        window.__nds_themeStore.getState().setPref(value);
        window.__nds_tabsStore.getState().addTab();
      }, theme);
      await settle(page);
      for (const [level, direction, count, minimum, maximum] of [
        ['normal', 'out', 0, 1, 1], ['half', 'out', 4, .4, .6], ['quarter', 'out', 4, .2, .3],
        ['minimum', 'out', 20, .1, .1], ['maximum', 'in', 30, 2.5, 2.5],
      ]) {
        const button = page.locator(`.react-flow__controls-zoom${direction}`);
        for (let i = 0; i < count && await button.isEnabled(); i++) await button.click();
        for (const style of ['grid', 'dots']) {
          await choose(style);
          const initial = await geometry();
          assert(initial.zoom >= minimum && initial.zoom <= maximum, `${theme}/${level}: native zoom reaches the intended range`);
          checkGeometry(initial, style, `${theme}/${level}`);
          await page.mouse.move(canvas.x + canvas.width * .7, canvas.y + canvas.height * .6);
          await page.mouse.down({ button: 'middle' });
          await page.mouse.move(canvas.x + canvas.width * .7 + 37, canvas.y + canvas.height * .6 + 29, { steps: 5 });
          await page.mouse.up({ button: 'middle' });
          await settle(page);
          const panned = await geometry();
          checkGeometry(panned, style, `${theme}/${level}/pan`);
          assert(Math.abs(panned.x - initial.x - 37) < .01 && Math.abs(panned.y - initial.y - 29) < .01,
            `${theme}/${level}: native middle-drag moves the camera`);
          panned.patterns.forEach((pattern, index) => {
            for (const [axis, delta] of [['x', 37], ['y', 29]]) {
              const remainder = (pattern[axis] - initial.patterns[index][axis] - delta) % pattern.spacing;
              assert(Math.min(Math.abs(remainder), pattern.spacing - Math.abs(remainder)) < .01,
                `${theme}/${level}: ${style} follows the native pan origin`);
            }
          });
          const before = await state(page);
          const background = await page.screenshot({ clip, animations: 'disabled' });
          if (evidence) {
            fs.writeFileSync(path.join(evidence, `${theme}-${style}-${level}.png`), background);
            if (level === 'normal') await page.screenshot({
              path: path.join(evidence, `${theme}-${style}-controls.png`),
              clip: { x: canvas.x, y: canvas.y, width: 700, height: 300 }, animations: 'disabled',
            });
          }
          await choose('blank');
          const blank = await page.screenshot({ clip, animations: 'disabled' });
          assert.equal(await state(page), before, `${theme}/${level}: background does not change the document or camera`);
          const measured = await pixels(background, blank, style);
          reports.push({ theme, level, style, ...panned, ...measured });
        }
      }
    }
    const wideFixture = { ...fixture, nodes: fixture.nodes.map((node, index) => ({
      ...node, position: { x: index * 4000, y: index * 1200 },
    })) };
    const choosing = page.waitForEvent('filechooser');
    await clickHeaderAction(page, 'Load JSON');
    await (await choosing).setFiles({ name: 'wide-background.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wideFixture)) });
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.meta.title === 'Workspace controls');
    await settle(page);
    const documentState = () => page.evaluate(() => {
      const store = window.__nds_diagramStore.getState();
      return JSON.stringify({ diagram: store.diagram, history: store.history, selection: store.selectedNodeIds });
    });
    const documentBefore = await documentState();
    for (const stage of ['load', 'fit', 'recovery']) {
      if (stage === 'fit') {
        await page.locator('.react-flow__controls-zoomin').click();
        await page.locator('.react-flow__controls-fitview').click();
      } else if (stage === 'recovery') {
        await page.waitForTimeout(1100);
        await page.reload();
        await page.locator('.react-flow__node[data-id="app"]').waitFor();
      }
      await settle(page);
      for (const style of ['grid', 'dots']) {
        await choose(style);
        const value = await geometry();
        assert(value.zoom < .5, `${stage}: wide content is fitted at reduced zoom`);
        checkGeometry(value, style, stage);
      }
      if (stage !== 'recovery') assert.equal(await documentState(), documentBefore, `${stage}: backgrounds and Fit preserve diagram, undo and selection`);
      else assert.deepEqual(JSON.parse(await documentState()).diagram, JSON.parse(documentBefore).diagram, 'Recovery preserves the loaded diagram');
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    if (evidence) fs.writeFileSync(path.join(evidence, 'background-sizing.json'), JSON.stringify(reports, null, 2));
    console.log(JSON.stringify(reports, null, 2));
    for (const report of reports) {
      const grid = report.style === 'grid', label = `${report.theme}/${report.level}/${report.style}`;
      assert(report.maximumContrast >= (grid ? 1.1 : 1.8), `${label}: background must remain visibly distinct from Blank`);
      assert(report.visibleFraction >= (grid ? .03 : .003) && report.visibleFraction <= (grid ? .35 : .08),
        `${label}: background must not disappear or merge into a solid field`);
      assert(report.repeatError < .5, `${label}: screenshot pixels repeat at the requested screen spacing in both directions`);
    }
    console.log('PASS canvas backgrounds: fixed 18/90px Grid and 30px/4px Dots through native zoom, pan, Fit, load and recovery; actual screenshot spacing, theme visibility and unchanged diagram state');
  } finally { await context.close(); }
}
(async () => {
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch();
  try {
    const backgroundsOnly = process.argv.includes('--backgrounds'), defaultsOnly = process.argv.includes('--defaults');
    const paletteOnly = process.argv.includes('--palette-drops');
    assert([backgroundsOnly, defaultsOnly, paletteOnly].filter(Boolean).length <= 1, 'Choose only one focused workspace check');
    if (paletteOnly) {
      await paletteDrops(browser);
      return;
    }
    if (!backgroundsOnly) {
      await backgroundDefaults(browser);
      if (!defaultsOnly) {
        await main(browser);
        await paletteDrops(browser);
      }
      await storageFailures(browser);
    }
    if (!defaultsOnly) await backgroundVisibility(browser);
  }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
