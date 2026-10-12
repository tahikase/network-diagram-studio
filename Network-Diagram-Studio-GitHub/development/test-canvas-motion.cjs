const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

function motionFixture() {
  const file = {
    version: 1,
    meta: { title: 'Synthetic motion workload', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
    nodes: [], edges: [], annotations: [], notes: '', shapes: [], strokes: [],
  };
  for (let row = 0; row < 6; row++) {
    file.nodes.push({
      id: `group-${row}`, type: 'group-vnet', position: { x: 30, y: 40 + row * 300 },
      size: { w: 2320, h: 275 }, data: { name: `Test network ${row + 1}`, fields: {} },
    });
    for (let col = 0; col < 8; col++) {
      const id = `resource-${row}-${col}`, x = 35 + col * 285;
      file.nodes.push({
        id, type: col % 2 ? 'storage' : 'private-endpoint', parent: `group-${row}`,
        position: { x, y: 75 }, size: { w: 235, h: 170 },
        data: { name: `Service ${row + 1}.${col + 1}`, fields: {
          'custom:Role': 'Synthetic workload', 'custom:Address': `192.0.2.${row * 8 + col + 1}`,
        } },
      });
      if (col > 0) file.edges.push({
        id: `edge-${row}-${col}`, source: `resource-${row}-${col - 1}`, target: id,
        kind: 'link', label: `HTTPS ${row + 1}.${col}`, sourceHandle: 's-r', targetHandle: 't-l',
      });
      if (row > 0 && col % 2 === 0) file.edges.push({
        id: `vertical-${row}-${col}`, source: `resource-${row - 1}-${col}`, target: id,
        kind: 'link', label: 'TCP 443', sourceHandle: 's-b', targetHandle: 't-t',
      });
      file.shapes.push({
        id: `text-${row}-${col}`, kind: 'rect', x: x + 35, y: 325 + row * 300, w: 230, h: 40,
        color: '#0f766e', width: 0, fillOpacity: 0, text: `Route ${row + 1}.${col + 1} - HTTPS`,
        textSize: 16, textColor: '#0f766e', geom: 'text-box',
      });
    }
  }
  for (let i = 0; i < 12; i++) file.strokes.push({
    id: `stroke-${i}`, color: '#c026d3', width: 2,
    points: Array.from({ length: 80 }, (_, j) => ({ x: 70 + j * 8, y: 316 + i * 150 + Math.sin(j / 8) * 3 })),
  });
  return file;
}

const evidence = process.env.NDS_MOTION_EVIDENCE;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function verify(entry, index) {
  const beforeHash = hash(entry);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], requests = [], reports = [], files = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-motion-'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const settle = () => page.waitForTimeout(350);
  const state = () => page.evaluate(() => {
    const tab = window.__nds_tabsStore.getState().activeTab();
    const diagram = window.__nds_diagramStore.getState().diagram;
    return structuredClone({ nodes: diagram.nodes, edges: diagram.edges, shapes: tab.shapes, strokes: tab.strokes });
  });
  async function layers() {
    return page.evaluate(() => {
      const numbers = value => value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
      const viewport = numbers(document.querySelector('.react-flow__viewport').style.transform);
      const transforms = [...document.querySelectorAll('[data-nds-shape-overlay] > g, [data-nds-annotation-overlay] > g')]
        .map(el => numbers(el.getAttribute('transform')));
      return { viewport, transforms };
    });
  }
  async function assertLayers() {
    const { viewport, transforms } = await layers();
    assert.equal(transforms.length, 2);
    for (const transform of transforms) transform.forEach((value, i) =>
      assert(Math.abs(value - viewport[i]) < .01, 'Resources, shapes and pencil strokes must share the camera.'));
  }
  async function load(value) {
    const chosen = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
    await (await chosen).setFiles({
      name: 'motion.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)),
    });
    await settle();
  }
  async function shortcut(key) {
    await page.locator('[data-nds-tool="move"]').focus();
    await page.keyboard.press(key);
    await settle();
  }
  async function controls() {
    const before = await state();
    const toolbar = page.locator('[data-nds-annotation-toolbar]');
    const grip = page.locator('[data-nds-dock-grip]');
    for (const [key, edge] of [['ArrowDown', 'bottom'], ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'top']]) {
      await grip.focus();
      await page.keyboard.press(key);
      await settle();
      assert.equal(await toolbar.getAttribute('data-nds-dock'), edge);
      const b = await toolbar.boundingBox();
      const host = await page.locator('[data-nds-fullscreen-target]').boundingBox();
      assert(b.x >= host.x && b.y >= host.y && b.x + b.width <= host.x + host.width + 1 &&
        b.y + b.height <= host.y + host.height + 1, `${edge}: drawing toolbar stays on the canvas`);
    }
    await page.locator('[data-nds-style-chevron]').first().click();
    await settle();
    const panel = await page.locator('[data-nds-style-popover]').boundingBox();
    const host = await page.locator('[data-nds-fullscreen-target]').boundingBox();
    assert(panel && panel.x >= host.x && panel.y >= host.y &&
      panel.x + panel.width <= host.x + host.width + 1, 'New style popovers must still be positioned.');
    await page.keyboard.press('Escape');
    await page.locator('[data-nds-notes-open]').click();
    const width = page.locator('[data-nds-notes-width-resize]');
    await width.focus();
    await page.keyboard.press('Home');
    await settle();
    assert.equal(Number(await width.getAttribute('aria-valuenow')), 320);
    await page.keyboard.press('Shift+ArrowLeft');
    await settle();
    assert.equal(Number(await width.getAttribute('aria-valuenow')), 360);
    await page.evaluate(() => window.__nds_layoutStore.getState().setNotesOpen(false));
    for (const language of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
      await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), language);
      await settle();
      assert(await page.locator('#nds-arm-open').evaluate(el => {
        const buttons = [...document.querySelectorAll('header button')].filter(b => b.textContent.includes('JSON'));
        return buttons.length === 2 && el.previousElementSibling === buttons[1];
      }), `${language}: ARM stays after Save JSON when the header changes`);
    }
    await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
    await page.setViewportSize({ width: 1000, height: 850 });
    await settle();
    assert(await page.locator('#nds-arm-open').evaluate(el => el.parentElement.matches('[data-nds-tabbar]')));
    const compactToolbar = await toolbar.boundingBox();
    const compactHost = await page.locator('[data-nds-fullscreen-target]').boundingBox();
    assert(compactToolbar.x >= compactHost.x &&
      compactToolbar.x + compactToolbar.width <= compactHost.x + compactHost.width + 1);
    await page.setViewportSize({ width: 1600, height: 1050 });
    await settle();
    assert(await page.locator('#nds-arm-open').evaluate(el => el.previousElementSibling.textContent.includes('Save')));
    const choosing = page.waitForEvent('filechooser');
    await page.locator('#nds-arm-open').click();
    const chooser = await choosing;
    assert(await page.locator('#nds-arm-dialog').evaluate(el => el.open));
    await chooser.setFiles([]);
    await page.keyboard.press('Escape');
    assert.deepEqual(await state(), before, 'Toolbar, Notes, language and compact layout do not edit the diagram.');
    await assertLayers();
  }
  async function connectionReveal() {
    await load({
      ...motionFixture(), shapes: [{
        id: 'connection-shape', kind: 'rect', x: 70, y: 180, w: 210, h: 130,
        width: 2, color: '#0f766e', fillOpacity: .1, text: 'Source',
      }], strokes: [], edges: [], nodes: [
        { id: 'connection-frame', type: 'group-vnet', position: { x: 0, y: 0 }, size: { w: 960, h: 700 },
          data: { name: 'Connection check', fields: {} } },
        ...['connection-target', 'connection-distant'].map((id, i) => ({
          id, type: 'vm', position: { x: 550, y: 160 + i * 310 }, size: { w: 260, h: 180 },
          data: { name: id, fields: {} },
        })),
      ],
    });
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForTimeout(600);
    async function begin() {
      await page.evaluate(() => {
        window.__nds_diagramStore.getState().selectNode(null);
        window.__nds_diagramStore.getState().selectEdge(null);
        window.__nds_annotationStore.getState().setTool('move');
        window.__nds_annotationStore.getState().setSelectedShapes(['connection-shape']);
      });
      await settle();
      const anchor = await page.locator('[data-nds-shape-connect-anchor-shape="connection-shape"][data-nds-shape-connect-anchor="e"]').boundingBox();
      const x = anchor.x + anchor.width / 2, y = anchor.y + anchor.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 55, y + 12, { steps: 6 });
      await page.locator('[data-nds-connect-preview]').waitFor();
      await settle();
      assert.equal(await page.locator('[data-nds-fullscreen-target]').getAttribute('data-nds-shape-connecting'), '1');
      const opacity = await page.locator('.react-flow__node[data-id="connection-distant"] .nds-connect-handle')
        .evaluateAll(els => els.map(el => Number(getComputedStyle(el).opacity)));
      assert.equal(opacity.length, 24);
      assert(opacity.every(value => value > .99), 'Shape connections still reveal every distant resource connection dot.');
    }
    await begin();
    const target = await page.locator('.react-flow__node[data-id="connection-target"] [data-handleid="t-l"]').boundingBox();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 });
    await page.mouse.up();
    await settle();
    await page.keyboard.press('Escape');
    const connected = await state();
    assert.equal(connected.edges.length, 1);
    assert.equal(connected.edges[0].source, 'connection-shape');
    assert.equal(connected.edges[0].target, 'connection-target');
    assert.equal(await page.locator('[data-nds-shape-connecting]').count(), 0);
    for (const cancel of ['Escape', 'pointercancel', 'blur', 'tab']) {
      await begin();
      const tab = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
      if (cancel === 'Escape') await page.keyboard.press('Escape');
      else if (cancel === 'tab') await page.evaluate(() => window.__nds_tabsStore.getState().addTab());
      else await page.evaluate(event => {
        if (event === 'blur') window.dispatchEvent(new Event('blur'));
        else document.querySelector('[data-nds-shape-overlay]').dispatchEvent(
          new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
      }, cancel);
      await settle();
      assert.equal(await page.locator('[data-nds-shape-connecting]').count(), 0, cancel + ': connection reveal clears');
      await page.mouse.up();
      if (cancel === 'tab') {
        await page.evaluate(id => window.__nds_tabsStore.getState().switchTab(id), tab);
        await settle();
      }
      assert.equal((await state()).edges.length, 1, cancel + ': cancellation never adds a connector');
    }
  }
  async function measure(label, gesture) {
    await page.evaluate(() => {
      const viewport = document.querySelector('.react-flow__viewport');
      const layers = [...document.querySelectorAll('[data-nds-shape-overlay] > g, [data-nds-annotation-overlay] > g')];
      const labels = [...document.querySelectorAll('[data-nds-edge-label]')];
      const labelTransforms = labels.map(el => el.style.transform);
      const originalBounds = Element.prototype.getBoundingClientRect;
      const result = { frames: [], mismatches: 0, cameraChanges: 0, labelChanges: 0, hostReads: 0, longTasks: [] };
      let last = 0, active = true, camera = viewport.style.transform;
      Element.prototype.getBoundingClientRect = function (...args) {
        if (this.hasAttribute('data-nds-fullscreen-target')) result.hostReads++;
        return originalBounds.apply(this, args);
      };
      const observer = new PerformanceObserver(list => result.longTasks.push(...list.getEntries().map(e => e.duration)));
      observer.observe({ type: 'longtask' });
      const numbers = value => value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
      const tick = time => {
        if (!active) return;
        if (last) result.frames.push(time - last);
        last = time;
        if (camera !== viewport.style.transform) { result.cameraChanges++; camera = viewport.style.transform; }
        const expected = numbers(camera);
        for (const layer of layers) {
          if (numbers(layer.getAttribute('transform')).some((value, i) => Math.abs(value - expected[i]) > .01)) result.mismatches++;
        }
        if (labels.some((el, i) => el.style.transform !== labelTransforms[i])) result.labelChanges++;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__finishMotion = () => {
        active = false;
        observer.disconnect();
        Element.prototype.getBoundingClientRect = originalBounds;
        return result;
      };
    });
    const before = await metrics();
    const started = performance.now();
    await gesture();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await metrics();
    const result = await page.evaluate(() => window.__finishMotion());
    const frames = result.frames.sort((a, b) => a - b);
    const report = {
      label, elapsedMs: performance.now() - started, frames: frames.length,
      p95FrameMs: frames[Math.floor(frames.length * .95)], hostReads: result.hostReads,
      cameraChanges: result.cameraChanges, labelChanges: result.labelChanges, layerMismatches: result.mismatches,
      longTasks: result.longTasks.length,
      scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
      styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
    };
    reports.push(report);
    assert.equal(report.layerMismatches, 0, label + ': no one-frame layer drift');
    assert(report.hostReads <= 12, `${label}: diagram motion must not repeatedly lay out floating toolbars (${report.hostReads} reads)`);
    assert(report.p95FrameMs < 80, `${label}: detailed-diagram frame gaps exceed the 80 ms regression ceiling`);
    assert(report.longTasks <= 8, `${label}: repeated main-thread stalls (${report.longTasks})`);
    return report;
  }
  try {
    await page.goto(pathToFileURL(path.resolve(entry)).href);
    await page.waitForFunction(() => window.__nds_tabsStore);
    const fixture = motionFixture();
    await load(fixture);
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForTimeout(600);
    const loaded = await state();
    assert.equal(loaded.nodes.length, 54);
    assert.equal(loaded.edges.length, 62);
    assert.equal(loaded.shapes.length, 48);
    assert.equal(loaded.strokes.length, 12);
    assert.equal(await page.locator('[data-nds-stroke]').count(), 12);
    assert.equal(await page.locator('[data-nds-edge-label]').count(), 62);
    await page.locator('[data-nds-tool="pan"]').click();
    await settle();
    const panPoint = await page.locator('.react-flow').evaluate(el => {
      const b = el.getBoundingClientRect();
      for (let y = b.y + 150; y < b.bottom - 180; y += 10) {
        for (let x = b.x + 32; x < b.right - 200; x += 10) {
          if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y };
        }
      }
      throw new Error('No blank native pan target found.');
    });
    await page.mouse.move(panPoint.x, panPoint.y);
    await page.mouse.down();
    const pan = await measure('hand-pan', async () => {
      for (let i = 1; i <= 80; i++) await page.mouse.move(
        panPoint.x + Math.sin(i / 80 * Math.PI * 2) * 95,
        panPoint.y + Math.cos(i / 80 * Math.PI * 2) * 45 - 45);
      await page.mouse.up();
    });
    assert(pan.cameraChanges > 30, 'The benchmark must really pan the camera.');
    assert.equal(pan.labelChanges, 0, 'World-space connector labels must not move during panning.');
    assert.deepEqual(await state(), loaded, 'Hand panning must not edit any diagram content.');
    for (const control of ['zoomin', 'zoomout']) {
      await page.locator(`.react-flow__controls-${control}`).click();
      await settle();
      await assertLayers();
    }
    await page.locator('[data-nds-tool="move"]').click();
    const resourceId = 'resource-2-3';
    await page.evaluate(id => window.__nds_diagramStore.getState().selectNode(id), resourceId);
    await page.waitForTimeout(600);
    const card = page.locator(`.react-flow__node[data-id="${resourceId}"]`);
    const bounds = await card.locator('[title$="double-click to rename"]').first().boundingBox();
    const origin = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const beforeDrag = await state();
    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(origin.x + 5, origin.y + 3);
    await page.waitForFunction(() => window.__nds_diagramStore.getState().gestureBase);
    await settle();
    await measure('resource-drag', async () => {
      for (let i = 1; i <= 100; i++) await page.mouse.move(
        origin.x + 5 + Math.sin(i / 100 * Math.PI * 2) * 30,
        origin.y + 3 + Math.cos(i / 100 * Math.PI * 2) * 15 - 15);
      await page.mouse.move(origin.x + 25, origin.y + 15);
      await page.mouse.up();
    });
    const afterDrag = await state();
    assert.notDeepEqual(afterDrag.nodes.find(n => n.id === resourceId).position, beforeDrag.nodes.find(n => n.id === resourceId).position);
    assert.deepEqual(afterDrag.nodes.filter(n => n.id !== resourceId), beforeDrag.nodes.filter(n => n.id !== resourceId));
    assert.deepEqual(afterDrag.edges, beforeDrag.edges);
    assert.deepEqual(afterDrag.shapes, beforeDrag.shapes);
    assert.deepEqual(afterDrag.strokes, beforeDrag.strokes);
    await shortcut('Control+z');
    assert.deepEqual(await state(), beforeDrag, 'One Undo must restore the whole drag.');
    await shortcut('Control+y');
    assert.deepEqual(await state(), afterDrag, 'One Redo must restore the final position.');
    await page.evaluate(id => window.__nds_diagramStore.getState().updateNodeName(id, 'Renamed after motion'), resourceId);
    await settle();
    assert.equal(await card.locator('[title$="double-click to rename"]').innerText(), 'Renamed after motion');
    await shortcut('Control+z');
    assert.deepEqual(await state(), afterDrag, 'Stable render identities must not hide data edits or Undo.');

    const shapeId = 'text-2-3';
    await page.evaluate(() => window.__nds_diagramStore.getState().selectNode(null));
    await settle();
    const shape = await page.locator(`[data-nds-shape="${shapeId}"]`).first().boundingBox();
    const shapeBefore = await state();
    await page.mouse.move(shape.x + shape.width / 2, shape.y + shape.height / 2);
    await page.mouse.down();
    await page.mouse.move(shape.x + shape.width / 2 + 40, shape.y + shape.height / 2 + 24, { steps: 12 });
    await page.mouse.up();
    await settle();
    const shapeAfter = await state();
    assert.notDeepEqual(shapeAfter.shapes.find(s => s.id === shapeId), shapeBefore.shapes.find(s => s.id === shapeId));
    assert.deepEqual(shapeAfter.nodes, shapeBefore.nodes, 'Moving a text shape must not move resources.');
    await shortcut('Control+z');
    assert.deepEqual(await state(), shapeBefore);
    await shortcut('Control+y');
    assert.deepEqual(await state(), shapeAfter);
    await assertLayers();

    const originalTab = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
    await page.evaluate(() => window.__nds_tabsStore.getState().addTab());
    await settle();
    await assertLayers();
    await page.evaluate(id => window.__nds_tabsStore.getState().switchTab(id), originalTab);
    await page.waitForTimeout(600);
    assert.deepEqual(await state(), shapeAfter);
    await assertLayers();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
    const saved = path.join(temp, 'motion.json');
    files.push(saved);
    await (await pending).saveAs(saved);
    const json = JSON.parse(fs.readFileSync(saved, 'utf8'));
    await load(json);
    await page.waitForFunction(expected => {
      const persisted = JSON.parse(localStorage.getItem('nds.autoSave.v1') || 'null');
      const active = persisted?.tabs.find(tab => tab.id === persisted.activeTabId);
      return !!active && JSON.stringify({
        nodes: active.diagram.nodes, edges: active.diagram.edges,
        shapes: active.shapes, strokes: active.strokes,
      }) === JSON.stringify(expected);
    }, shapeAfter);
    assert.deepEqual(await state(), shapeAfter, 'Native Save/Load must retain the final geometry and vector content.');
    await page.reload();
    await page.waitForFunction(() => window.__nds_tabsStore?.getState().activeTab()?.shapes.length === 48);
    await page.waitForTimeout(600);
    assert.deepEqual(await state(), shapeAfter, 'Auto-save/reload must retain all final motion edits.');
    await assertLayers();
    assert.equal(await page.locator('[data-nds-shape-overlay] canvas').count(), 0, 'Shapes stay vector artwork, not a raster shortcut.');
    assert.equal(await page.locator('[data-nds-annotation-overlay] path[data-nds-stroke]').count(), 12);
    await controls();
    await connectionReveal();
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    assert.equal(hash(entry), beforeHash);
    if (evidence) {
      fs.mkdirSync(evidence, { recursive: true });
      fs.writeFileSync(path.join(evidence, `${index}-motion.json`), JSON.stringify({ entry, reports }, null, 2));
    }
    console.log(`PASS ${entry}: native pan/zoom/drag, synchronized vector layers, bounded layout work, history, JSON, tabs, auto-save, dock/Notes/ARM layout and connection reveal/cancellation`);
    console.log(JSON.stringify(reports));
  } finally {
    await browser.close();
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
}

module.exports = { motionFixture };
if (require.main === module) {
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(path.join(__dirname, '..', 'index.html'));
  (async () => {
    for (let i = 0; i < entries.length; i++) await verify(path.resolve(entries[i]), i);
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
