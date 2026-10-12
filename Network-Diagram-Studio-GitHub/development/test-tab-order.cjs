const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const KEY = 'nds.autoSave.v1';
const MIME = 'application/x-nds-diagram-tab';
const EVIDENCE = process.env.NDS_TAB_EVIDENCE;
const tab = (page, id) => page.locator(`[data-nds-tab="${id}"]`);
const settle = page => page.waitForTimeout(300);
const active = page => page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
const camera = page => page.locator('.react-flow__viewport').evaluate(el => el.style.transform);
const order = page => page.evaluate(() => window.__nds_tabsStore.getState().tabs.map(t => t.id));
const workspace = page => page.evaluate(() => {
  const tabs = window.__nds_tabsStore.getState(), diagram = window.__nds_diagramStore.getState();
  return {
    active: tabs.activeTabId, diagram: diagram.diagram, history: diagram.history,
    nodes: diagram.selectedNodeIds, edges: diagram.selectedEdgeIds, undo: tabs.undoStack,
    shapes: window.__nds_annotationStore.getState().selectedShapeIds,
    data: Object.fromEntries(tabs.tabs.map(t => [t.id, t])),
  };
});
const content = page => page.evaluate(() => {
  const state = window.__nds_tabsStore.getState();
  return Object.fromEntries(state.tabs.map(({ viewport: _viewport, ...t }) =>
    [t.id, { ...t, diagram: t.id === state.activeTabId ? window.__nds_diagramStore.getState().diagram : t.diagram }]));
});
async function expectOrder(page, expected) {
  await page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('[data-nds-tab]')]
    .map(el => el.dataset.ndsTab)) === JSON.stringify(expected), expected);
  assert.deepEqual(await order(page), expected, 'The store and DOM share the same order.');
  const lefts = await page.locator('[data-nds-tab]').evaluateAll(els => els.map(el => el.getBoundingClientRect().left));
  assert.deepEqual(lefts, [...lefts].sort((a, b) => a - b), 'Visual order matches the DOM, even with overflow.');
}
async function idle(page) {
  await page.waitForFunction(() => !document.querySelector('[data-nds-tab-dragging], [data-nds-tab-drop]'));
}
async function focus(page, id) {
  await page.waitForFunction(id => document.activeElement?.getAttribute('data-nds-tab') === id, id);
}
async function start(page, id) {
  await tab(page, id).scrollIntoViewIfNeeded();
  const box = await tab(page, id).boundingBox(), x = box.x + 24, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 17, y, { steps: 4 });
  await page.locator(`[data-nds-tab="${id}"][data-nds-tab-dragging="1"]`).waitFor();
}
async function hover(page, source, destination, side = 'before') {
  await start(page, source);
  const box = await tab(page, destination).boundingBox();
  const x = box.x + (side === 'before' ? 8 : box.width - 8), y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 12 }); await page.mouse.move(x + 1, y);
  await page.locator(`[data-nds-tab="${destination}"][data-nds-tab-drop="${side}"]`).waitFor();
  const cue = await page.locator('[data-nds-tab-insertion]').evaluate(el => ({
    width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
    color: getComputedStyle(el).backgroundColor,
  }));
  assert(cue.width >= 2 && cue.height > 20 && cue.color !== 'rgba(0, 0, 0, 0)',
    'A visible insertion line marks the destination: ' + JSON.stringify(cue));
}
async function saveJson(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function seed(page) {
  const ids = await page.evaluate(() => {
    const ts = window.__nds_tabsStore;
    const ids = [];
    for (let i = 0; i < 4; i++) {
      if (i) ts.getState().addTab();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 4;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = ['#0369a1', '#0f766e', '#c2410c', '#7e22ce'][i];
      ctx.fillRect(0, 0, 4, 4);
      const file = {
        version: 1, meta: { title: `Workspace ${i}`, createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
        nodes: [
          { id: `n${i}a`, type: 'vm', position: { x: 60 + i * 9, y: 110 }, size: { w: 280, h: 185 }, data: { name: `VM ${i}`, fields: {} } },
          { id: `n${i}b`, type: 'storage', position: { x: 460, y: 180 + i * 6 }, size: { w: 280, h: 185 }, data: { name: `Storage ${i}`, fields: {} } },
        ],
        edges: [{ id: `e${i}`, source: `n${i}a`, target: `n${i}b`, kind: 'link', label: `HTTPS ${i}` }],
        annotations: [],
        shapes: [{ id: `s${i}`, kind: 'rect', x: 170, y: 420, w: 250, h: 65, width: 2, color: '#0f766e', fillOpacity: .1, text: `Shape ${i}` }],
        strokes: [{ id: `p${i}`, width: 2, color: '#c026d3', points: [{ x: 480, y: 430 }, { x: 530 + i * 4, y: 460 }] }],
        notes: `Note ${i}\n\n![Snapshot ${i}](nds-img:img${i})`,
        comments: [{ id: `c${i}`, quote: `Note ${i}`, prefix: '', suffix: '', messages: [{ author: 'Synthetic reviewer', text: `Comment ${i}`, at: '2026-01-01T00:00:00Z' }] }],
        images: [{ id: `img${i}`, caption: `Snapshot ${i}`, w: 4, h: 4, png: canvas.toDataURL() }],
      };
      const loaded = ts.getState().loadStudioFile(JSON.stringify(file));
      if (!loaded.ok || loaded.dropped) throw new Error(`Fixture load failed: ${JSON.stringify(loaded)}`);
      const id = ts.getState().activeTabId;
      ts.getState().renameTab(id, ['Overview', 'Region B', 'Review', 'Archive'][i]);
      ids.push(id);
    }
    return ids;
  });
  const views = {};
  for (let i = 0; i < ids.length; i++) {
    await page.evaluate(id => window.__nds_tabsStore.getState().switchTab(id), ids[i]);
    await settle(page);
    await page.locator('[data-nds-tool="pan"]').click();
    const point = await page.locator('.react-flow').evaluate(el => {
      const box = el.getBoundingClientRect();
      for (let y = box.top + 120; y < box.bottom - 180; y += 20)
        for (let x = box.left + 40; x < box.right - 160; x += 20)
          if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y };
      throw new Error('No blank pan target.');
    });
    await page.mouse.move(point.x, point.y); await page.mouse.down();
    await page.mouse.move(point.x + 25 + i * 11, point.y + 10 + i * 7, { steps: 8 }); await page.mouse.up();
    views[ids[i]] = await camera(page);
  }
  await page.locator('[data-nds-tool="move"]').click();
  await page.evaluate(id => {
    const ts = window.__nds_tabsStore.getState(), ds = window.__nds_diagramStore.getState();
    ts.switchTab(id);
    ds.updateNodeName('n1a', 'LIVE unsaved resource');
    ts.addShape({ id: 'history-shape', kind: 'rect', x: 490, y: 480, w: 130, h: 65, width: 2, color: '#7e22ce', fillOpacity: 0 });
    ds.selectNode('n1a');
    window.__nds_annotationStore.getState().setSelectedShapes(['s1']);
  }, ids[1]);
  await page.waitForTimeout(1100);
  views[ids[1]] = await camera(page);
  return { ids, views };
}

async function verify(browser, entry, edition) {
  const context = await browser.newContext({ viewport: { width: 1700, height: 1050 }, locale: 'en-US', acceptDownloads: true });
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  await context.addInitScript(() => {
    localStorage.setItem('nds.lang', 'en');
    window.__tabEvents = [];
    for (const type of ['dragstart', 'dragover', 'dragleave', 'drop', 'dragend', 'blur'])
      window.addEventListener(type, event => {
        const el = event.target instanceof Element ? event.target : null;
        window.__tabEvents.push({ type, x: event.clientX, y: event.clientY,
          effect: event.dataTransfer?.dropEffect, target: el?.tagName,
          tab: el?.closest('[data-nds-tab]')?.dataset.ndsTab,
          inBar: !!el?.closest('[data-nds-tabbar]') });
        window.__tabEvents = window.__tabEvents.slice(-24);
      }, true);
  });
  const page = await context.newPage(), errors = [], requests = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  try {
    await page.goto(pathToFileURL(entry).href);
    await page.waitForFunction(() => window.__nds_tabsStore);
    assert.equal(await page.evaluate(() => typeof window.__nds_tabsStore.getState().moveTab), 'function',
      'Diagram tabs must support reordering; the old release does not expose moveTab.');
    const { ids: [a, b, c, d], views } = await seed(page);
    let expected = [a, b, c, d];
    const before = await workspace(page), initialCamera = await camera(page), savedBefore = await saveJson(page);
    const canonical = await content(page);
    assert.notEqual(before.diagram.nodes[0].data.name, before.data[b].diagram.nodes[0].data.name,
      'The fixture must contain live edits not yet captured into the cached tab diagram.');
    assert(before.history.past.length && before.undo.length, 'Both undo histories must be nonempty.');
    await page.evaluate(() => {
      const ts = window.__nds_tabsStore.getState();
      window.__tabReferences = Object.fromEntries(ts.tabs.map(t => [t.id, t]));
    });
    for (const [source, destination, side, next, theme] of [
      [d, a, 'before', [d, a, b, c], 'light'],
      [b, c, 'after', [d, a, c, b], 'dark'],
      [a, b, 'after', [d, c, b, a], 'light'],
    ]) {
      await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
      await settle(page);
      const persisted = await page.evaluate(key => localStorage.getItem(key), KEY);
      await hover(page, source, destination, side);
      await expectOrder(page, expected);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), persisted, 'Hover does not commit or auto-save a move.');
      if (EVIDENCE) await page.screenshot({ path: path.join(EVIDENCE, `${edition}-${theme}-${source === a ? 'overview' : 'drag'}.png`) });
      await page.mouse.up(); expected = next;
      await expectOrder(page, expected); await idle(page); await focus(page, source);
      assert.equal(await active(page), b, 'Dragging an inactive tab must not activate it.');
      assert.equal(await camera(page), initialCamera, 'Moving a tab must not pan or zoom its canvas.');
      assert.deepEqual(await workspace(page), before, 'All tab data, live edits, selection and undo histories stay intact.');
      assert(await page.evaluate(() => window.__nds_tabsStore.getState().tabs.every(t => window.__tabReferences[t.id] === t)),
        'Reordering preserves the original tab objects.');
    }
    assert.deepEqual(await saveJson(page), savedBefore, 'Save JSON still exports only the active workspace.');
    assert.equal(savedBefore.nodes.length, 2);
    assert.equal(savedBefore.images.length, 1);
    assert(!Object.hasOwn(savedBefore, 'tabs'));
    for (const id of [a, c, d, b]) {
      await tab(page, id).click({ position: { x: 24, y: 18 } }); await settle(page);
      assert.equal(await camera(page), views[id], 'Switching after reorder restores each tab\'s in-session viewport.');
      assert.deepEqual(await content(page), canonical, 'Content follows the same tab IDs, never their positions.');
    }
    await page.waitForTimeout(1100);
    const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    assert.deepEqual(persisted.tabs.map(t => t.id), expected);
    assert.equal(persisted.activeTabId, b);
    assert.equal(persisted.tabs.find(t => t.id === b).diagram.nodes[0].data.name, 'LIVE unsaved resource');
    await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore?.getState().tabs.length === 4 &&
      window.__nds_tabsStore.getState().tabs.every(t => t.images.length === 1 && t.images[0].png.length > 0));
    await expectOrder(page, expected);
    assert.equal(await active(page), b);
    assert.deepEqual(await content(page), canonical, 'Auto-save restores order and all associated content, including image bytes.');
    console.log(`PASS ${edition}: native drag/drop, Overview, live edits, selection/history, all tab content, viewports and auto-save`);

    const noOps = await page.evaluate(([a, b]) => {
      const store = window.__nds_tabsStore, original = store.getState().tabs;
      let notifications = 0;
      const unsubscribe = store.subscribe(() => notifications++);
      const results = [store.getState().moveTab(a, a, 'before'),
        store.getState().moveTab(b, a, 'before'), store.getState().moveTab('unavailable-tab', a, 'after')];
      unsubscribe();
      return { results, notifications, same: original === store.getState().tabs };
    }, [a, b]);
    assert.deepEqual(noOps, { results: [false, false, false], notifications: 0, same: true });
    await tab(page, a).focus(); await page.keyboard.press('Alt+ArrowRight');
    await expectOrder(page, expected);
    await page.keyboard.press('Alt+ArrowLeft');
    expected = [d, c, a, b]; await expectOrder(page, expected); await focus(page, a);
    assert.equal(await active(page), b, 'Keyboard reorder preserves the active workspace.');
    await page.keyboard.press('Home'); await focus(page, d); assert.equal(await active(page), d);
    await page.keyboard.press('End'); await focus(page, b); assert.equal(await active(page), b);
    await page.keyboard.press('ArrowRight'); await focus(page, d); assert.equal(await active(page), d);
    await page.keyboard.press('ArrowLeft'); await focus(page, b);
    await tab(page, c).focus(); await page.keyboard.press('Space'); await focus(page, c);
    assert.equal(await active(page), c);
    await page.evaluate(() => {
      window.__nds_diagramStore.getState().selectNode('n2a');
      window.__nds_annotationStore.getState().setSelectedShapes(['s2']);
    });
    await settle(page);
    const deletionGuard = await workspace(page);
    await page.keyboard.press('Delete'); await page.keyboard.press('Backspace');
    assert.deepEqual(await workspace(page), deletionGuard, 'Tab navigation must not delete selected canvas content.');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('[data-nds-tab-rename]:focus').getAttribute('data-nds-tab-rename'), c);
    await page.keyboard.press('Enter');
    const input = tab(page, c).locator('input');
    await input.fill('Renamed {count} {position} {tab} $&');
    await page.keyboard.press('ArrowLeft');
    await expectOrder(page, expected);
    assert.equal(await tab(page, c).getAttribute('draggable'), 'false', 'An editing tab must not be draggable.');
    await page.keyboard.press('Enter'); await focus(page, c);
    await page.keyboard.press('Alt+ArrowLeft');
    expected = [c, d, a, b]; await expectOrder(page, expected);
    assert.equal(await page.locator('[data-nds-tab-order-status]').textContent(),
      'Moved Renamed {count} {position} {tab} $& to position 1 of 4.');
    await tab(page, c).dblclick({ position: { x: 24, y: 18 }, delay: 80 });
    await input.fill('Discard this rename'); await page.keyboard.press('Escape');
    assert.equal(await tab(page, c).getAttribute('aria-label'), 'Renamed {count} {position} {tab} $&');
    await tab(page, c).dblclick({ position: { x: 24, y: 18 }, delay: 80 });
    await input.fill('Click-away rename');
    await tab(page, d).click({ position: { x: 24, y: 18 } });
    await focus(page, d);
    assert.equal(await active(page), d, 'Committing a rename by clicking elsewhere must not steal focus back.');
    assert.equal(await tab(page, c).getAttribute('aria-label'), 'Click-away rename');
    console.log(`PASS ${edition}: keyboard moves/navigation, focus, no-op boundaries, safe Delete and inline renaming`);

    for (const method of ['Escape', 'outside', 'blur']) {
      const current = await active(page), beforeOrder = await order(page);
      await hover(page, b, c);
      if (method === 'Escape') await page.keyboard.press('Escape');
      else if (method === 'outside') await page.mouse.move(900, 250, { steps: 8 });
      else {
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.keyboard.press('Escape');
      }
      await page.mouse.up(); await idle(page); await expectOrder(page, beforeOrder);
      assert.equal(await active(page), current, `${method} cancellation does not switch workspaces.`);
      await tab(page, c).click({ position: { x: 24, y: 18 } });
      assert.equal(await active(page), c, 'The next deliberate click after cancellation still works.');
    }
    for (const action of ['rename', 'delete']) {
      await tab(page, c).hover();
      const from = await page.locator(`[data-nds-tab-${action}="${c}"]`).boundingBox();
      const to = await tab(page, a).boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
      await page.mouse.move(to.x + 24, to.y + to.height / 2, { steps: 12 }); await page.mouse.up();
      await idle(page); await expectOrder(page, expected);
      assert.equal(await page.locator('[data-nds-tab] input').count(), 0);
    }
    const external = await page.evaluate(mime => {
      const element = document.querySelector('[data-nds-tabbar]'), box = element.getBoundingClientRect();
      return [mime, 'application/x-nds-palette-section', 'text/plain', 'application/json'].map(type => {
        const dataTransfer = new DataTransfer(); dataTransfer.setData(type, 'external');
        return ['dragover', 'drop'].map(name => {
          const event = new DragEvent(name, { bubbles: true, cancelable: true, dataTransfer, clientX: box.x + 40, clientY: box.y + 20 });
          element.dispatchEvent(event); return event.defaultPrevented;
        });
      });
    }, MIME);
    assert(external.flat().every(prevented => !prevented), 'External drags, even spoofed tab MIME, are ignored.');
    await expectOrder(page, expected);
    await hover(page, b, c);
    await page.evaluate(() => window.__nds_tabsStore.getState().setActiveTabNotes('Edited during a tab drag'));
    assert.equal(await page.locator('[data-nds-tab-dragging]').count(), 1,
      'Content updates do not cancel a drag when tab IDs and their order are unchanged.');
    await page.keyboard.press('Escape'); await page.mouse.up(); await idle(page);
    await hover(page, b, c);
    await page.evaluate(() => window.__nds_tabsStore.getState().addTab());
    expected = await order(page);
    await idle(page); await page.mouse.up(); await expectOrder(page, expected);
    console.log(`PASS ${edition}: Escape/outside/blur cancellation, control isolation, external drops and changed membership`);

    for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(({ language, c }) => {
        window.__nds_i18nStore.getState().setLang(language);
        window.__nds_tabsStore.getState().renameTab(c, 'Literal {count} $&');
      }, { language, c });
      await tab(page, c).focus(); await page.keyboard.press('Alt+ArrowRight'); await idle(page); await focus(page, c);
      const hint = await tab(page, c).locator('span[title]').getAttribute('title');
      assert.match(hint, /Alt/);
      const announcement = await page.locator('[data-nds-tab-order-status]').textContent();
      assert(announcement.includes('Literal {count} $&'), 'Announcements retain user names literally.');
      if (language !== 'en') {
        assert(!hint.includes('Drag to reorder.'));
        assert(!announcement.startsWith('Moved '));
      }
      await page.keyboard.press('Alt+ArrowLeft'); await idle(page); await focus(page, c);
      await page.locator('[data-nds-settings-button]').click();
      const guide = page.locator('[data-nds-guide-group="Working faster"]');
      if (await guide.getAttribute('aria-expanded') !== 'true') await guide.click();
      const description = await page.locator('[data-nds-guide-item="Tabs"] p').textContent();
      assert(description.includes('Alt+') && description.includes('JSON'), 'The Guide documents reordering and current-tab JSON.');
      if (language !== 'en') assert(!description.includes('Drag tabs to reorder'));
      await page.locator('[data-nds-settings-button]').click();
    }
    const missing = await page.evaluate(() => window.__nds_i18nMissing?.() ?? {});
    for (const values of Object.values(missing)) assert(!values.some(value =>
      /Drag to reorder|Moved \{tab\}|Tab reordering|Each tab holds its own diagram, shapes and notes\.|Reorder the focused tab|Navigate tabs|Activate the focused tab|Cancel tab reordering/.test(value)));
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    await page.setViewportSize({ width: 1000, height: 850 }); await settle(page);
    assert(await page.locator('#nds-arm-open').evaluate(el => el.parentElement.matches('[data-nds-tabbar]')));
    assert.equal(await page.locator('#nds-arm-open').getAttribute('data-nds-tab'), null);
    await page.evaluate(() => {
      const store = window.__nds_tabsStore;
      for (let i = 0; i < 10; i++) {
        store.getState().addTab();
        store.getState().renameTab(store.getState().activeTabId, `Overflow workspace ${i + 1}`);
      }
    });
    await settle(page);
    expected = await order(page);
    const first = expected[0], overflowActive = await active(page);
    const scroll = page.locator('[data-nds-tabbar]');
    assert(await scroll.evaluate(el => el.scrollWidth > el.clientWidth + 500));
    for (const direction of ['right', 'left']) {
      await start(page, first);
      const box = await scroll.boundingBox(), tabBox = await tab(page, first).boundingBox();
      const x = direction === 'right' ? box.x + box.width - 8 : box.x + 8, y = tabBox.y + tabBox.height / 2;
      await page.mouse.move(x, y, { steps: 8 }); await page.mouse.move(x + 1, y);
      await page.waitForFunction(direction => {
        const area = document.querySelector('[data-nds-tabbar]');
        return direction === 'right' ? area.scrollLeft >= area.scrollWidth - area.clientWidth - 1 : area.scrollLeft <= 1;
      }, direction);
      await expectOrder(page, expected);
      // CDP does not send periodic dragovers while RAF scrolls beneath a stationary mouse.
      await page.mouse.move(x + 2, y); await page.mouse.move(x + 1, y);
      await page.mouse.up();
      expected = direction === 'right' ? [...expected.slice(1), first] : [first, ...expected.slice(0, -1)];
      await expectOrder(page, expected); await idle(page);
      assert.equal(await active(page), overflowActive, 'Scrolling and reordering do not activate the dragged tab.');
    }
    const keyboardSource = expected[4], keyboardCamera = await camera(page);
    await page.evaluate(id => {
      const area = document.querySelector('[data-nds-tabbar]'), el = document.querySelector(`[data-nds-tab="${id}"]`);
      area.scrollLeft += el.getBoundingClientRect().left - area.getBoundingClientRect().left - 40;
      el.focus({ preventScroll: true });
    }, keyboardSource);
    for (const key of ['Alt+ArrowLeft', 'Alt+ArrowRight']) {
      await page.keyboard.press(key); await focus(page, keyboardSource);
      const visible = await tab(page, keyboardSource).evaluate(el => {
        const tab = el.getBoundingClientRect(), arm = document.querySelector('#nds-arm-open').getBoundingClientRect();
        const area = el.closest('[data-nds-tabbar]').getBoundingClientRect();
        return tab.left >= arm.right && tab.right <= area.right;
      });
      assert(visible, 'A keyboard-moved tab must be fully visible, not hidden behind the pinned Import ARM button.');
      assert.equal(await camera(page), keyboardCamera, 'Revealing a focused tab scrolls only the tab strip.');
    }
    await expectOrder(page, expected);
    await scroll.evaluate(el => { el.scrollLeft = 0; });
    await start(page, first);
    const area = await scroll.boundingBox(), sourceBox = await tab(page, first).boundingBox();
    await page.mouse.move(area.x + area.width - 8, sourceBox.y + 18, { steps: 8 });
    await page.mouse.move(area.x + area.width - 7, sourceBox.y + 18);
    await page.waitForFunction(() => document.querySelector('[data-nds-tabbar]').scrollLeft > 60);
    await page.mouse.move(area.x + area.width / 2, area.y - 100, { steps: 4 });
    await page.waitForTimeout(100);
    const stopped = await scroll.evaluate(el => el.scrollLeft);
    await page.waitForTimeout(200);
    assert.equal(await scroll.evaluate(el => el.scrollLeft), stopped, 'Leaving the strip stops edge auto-scroll.');
    await page.mouse.up(); await idle(page); await expectOrder(page, expected);
    console.log(`PASS ${edition}: eight languages, compact ARM placement and native overflow scrolling in both directions`);

    await page.evaluate(() => {
      const store = window.__nds_tabsStore;
      while (store.getState().tabs.length > 3) store.getState().deleteTab(store.getState().tabs.at(-1).id);
    });
    expected = await order(page);
    const closing = expected[1];
    await page.evaluate(id => window.__nds_tabsStore.getState().switchTab(id), closing);
    await tab(page, closing).scrollIntoViewIfNeeded();
    await page.locator(`[data-nds-tab-delete="${closing}"]`).click();
    assert.equal(await active(page), expected[0], 'Closing the active tab selects its neighbor in the reordered strip.');
    await focus(page, expected[0]);
    await page.evaluate(() => {
      const store = window.__nds_tabsStore;
      while (store.getState().tabs.length > 1) store.getState().deleteTab(store.getState().tabs.at(-1).id);
    });
    await settle(page);
    assert.equal(await page.locator('[data-nds-tab-delete]').count(), 0);
    assert.equal(await page.locator('[data-nds-tab]').getAttribute('draggable'), 'false');
    await page.locator('[data-nds-tab]').focus(); await page.keyboard.press('Alt+ArrowLeft');
    await page.keyboard.press('Alt+ArrowRight');
    assert.equal((await order(page)).length, 1);
    await page.locator('[data-nds-tab-add]').click();
    assert.equal((await order(page)).length, 2, 'New tab remains functional after reordering.');
    const lastOrder = await order(page), lastActive = await active(page);
    await tab(page, lastActive).focus(); await page.keyboard.press('Alt+ArrowLeft');
    await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore);
    await expectOrder(page, [...lastOrder].reverse());
    assert.equal(await active(page), lastActive, 'Closing/reloading before the debounce still saves the new order.');
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'Tab reordering works entirely offline.');
    console.log(`PASS ${edition}: reordered close fallback, last-tab guard, add tab, no browser errors or network requests`);
  } catch (error) {
    console.error('Tab-order diagnostic', await page.evaluate(() => ({
      tabs: window.__nds_tabsStore?.getState().tabs.map(t => ({ id: t.id, name: t.name })),
      events: window.__tabEvents,
      scroll: document.querySelector('[data-nds-tabbar]')?.scrollLeft,
      dragging: document.querySelector('[data-nds-tab-dragging]')?.getAttribute('data-nds-tab'),
      cue: document.querySelector('[data-nds-tab-drop]')?.getAttribute('data-nds-tab'),
    })));
    if (EVIDENCE) await page.screenshot({ path: path.join(EVIDENCE, `${edition}-failure.png`) });
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  if (EVIDENCE) fs.mkdirSync(EVIDENCE, { recursive: true });
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
  const browser = await chromium.launch();
  try {
    for (const [index, entry] of entries.entries())
      await verify(browser, path.resolve(entry), `${path.basename(entry).startsWith('non_') ? 'non-production' : 'production'}-${index}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
