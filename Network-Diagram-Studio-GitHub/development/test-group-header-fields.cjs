const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const evidence = process.env.NDS_HEADER_FIELDS_EVIDENCE;
const node = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
const field = (page, id, key) => node(page, id).locator(
  `[data-nds-group-field="${key.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\u0001', '\\1 ')}"]`);
const input = (page, id) => node(page, id).locator('[data-nds-group-field-input]');
const settle = page => page.waitForTimeout(120);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const content = page => page.evaluate(() => {
  const store = window.__nds_diagramStore.getState();
  const tab = window.__nds_tabsStore.getState().activeTab();
  return structuredClone({ nodes: store.diagram.nodes, edges: store.diagram.edges,
    shapes: tab.shapes, strokes: tab.strokes, notes: tab.notes });
});
const historySize = page => page.evaluate(() => window.__nds_diagramStore.getState().history.past.length);
const value = (page, id, key) => page.evaluate(([id, key]) =>
  window.__nds_diagramStore.getState().diagram.nodes.find(node => node.id === id).data.fields[key], [id, key]);
const camera = page => page.locator('.react-flow__viewport').getAttribute('style');

function fixture() {
  return {
    version: 1,
    meta: { title: 'Group properties example', createdUtc: '2026-01-01T00:00:00Z', updatedUtc: '2026-01-01T00:00:00Z' },
    nodes: [
      { id: 'network', type: 'group-vnet', position: { x: 20, y: 80 }, size: { w: 1450, h: 760 },
        data: { name: 'vnet-example', fields: { cidr: '10.40.0.0/16', region: 'East US', 'DNS server': '10.40.0.4' } } },
      { id: 'subnet', type: 'group-subnet', parent: 'network', position: { x: 60, y: 200 }, size: { w: 1250, h: 480 },
        data: { name: 'subnet-web', fields: { cidr: '10.40.1.0/24', NSG: 'nsg-web' } } },
      { id: 'server', type: 'vm', parent: 'subnet', position: { x: 90, y: 170 }, size: { w: 270, h: 170 },
        data: { name: 'Example server', fields: { ip: '10.40.1.10' } } },
    ],
    edges: [], shapes: [], strokes: [], annotations: [], notes: '', comments: [], images: [],
  };
}

async function load(page, file = fixture()) {
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load JSON', exact: true }).click();
  await (await choosing).setFiles({
    name: 'group-properties-example.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)),
  });
  await page.waitForFunction(count => window.__nds_diagramStore.getState().diagram.nodes.length === count, file.nodes.length);
  await node(page, file.nodes[0].id).waitFor();
  await page.locator('.react-flow__controls-fitview').click();
  await page.waitForTimeout(400);
}

async function frameField(page, id, key) {
  await settle(page);
  const visible = await field(page, id, key).evaluate(element => {
    const box = element.getBoundingClientRect();
    const canvas = element.closest('.react-flow').getBoundingClientRect();
    return box.left >= canvas.left + 8 && box.right <= canvas.right - 8 &&
      box.top >= canvas.top + 8 && box.bottom <= canvas.bottom - 8;
  });
  if (!visible) {
    await page.locator('.react-flow__controls-fitview').click();
    await page.waitForTimeout(400);
  }
}

async function openField(page, id, key) {
  await frameField(page, id, key);
  // Selecting a wide group opens the inspector and can obscure its right-hand fields.
  await field(page, id, key).click();
  await frameField(page, id, key);
  const before = await camera(page);
  await field(page, id, key).dblclick({ delay: 60 });
  const editor = input(page, id);
  await editor.waitFor();
  assert.equal(await editor.getAttribute('data-nds-group-field-input'), key);
  assert(await editor.evaluate(element => document.activeElement === element));
  assert.equal(await camera(page), before, 'Double-click edits the property without zooming or panning.');
  return editor;
}

async function undo(page, redo = false) {
  await page.locator('[data-nds-tool="move"]').focus();
  await page.keyboard.press(redo ? 'Control+Shift+z' : 'Control+z');
  await settle(page);
}

async function capture(page, name) {
  if (!evidence) return;
  const b = await node(page, 'network').boundingBox();
  const nested = await node(page, 'subnet').locator('[data-nds-group-header]').first().boundingBox();
  const clip = { x: Math.max(0, Math.floor(b.x - 8)), y: Math.max(0, Math.floor(b.y - 8)),
    width: Math.ceil(Math.min(b.width + 16, 1000)), height: Math.ceil(nested.y + nested.height + 16 - (b.y - 8)) };
  clip.width = Math.min(clip.width, page.viewportSize().width - clip.x);
  clip.height = Math.min(clip.height, page.viewportSize().height - clip.y);
  await page.screenshot({ path: path.join(evidence, name), clip });
}

async function edits(page) {
  const original = await content(page);
  const history = await historySize(page);
  let editor = await openField(page, 'network', 'cidr');
  assert.deepEqual(await editor.evaluate(el => [el.selectionStart, el.selectionEnd]), [0, '10.40.0.0/16'.length]);
  await editor.fill('10.50.0.0/16');
  assert.deepEqual(await content(page), original, 'Typing is a draft, not a saved edit per character.');
  await editor.press('Enter');
  await editor.waitFor({ state: 'detached' });
  assert.equal(await value(page, 'network', 'cidr'), '10.50.0.0/16');
  assert.equal(await historySize(page), history + 1, 'A committed field edit adds one undo step.');
  const panelValue = page.locator('[data-nds-property-panel] label').filter({ hasText: /^CIDR$/ })
    .locator('..').locator('input');
  assert.equal(await panelValue.inputValue(), '10.50.0.0/16', 'The property inspector reads the same value.');
  await undo(page);
  assert.deepEqual(await content(page), original, 'Undo restores both the value and any fitted geometry.');
  await undo(page, true);
  assert.equal(await value(page, 'network', 'cidr'), '10.50.0.0/16');

  const prior = await historySize(page);
  for (const next of ['10.60.0.0/16', '10.70.0.0/16']) {
    editor = await openField(page, 'network', 'cidr');
    await editor.fill(next);
    await editor.press('Enter');
  }
  assert.equal(await historySize(page), prior + 2, 'Separate inline commits never coalesce into one undo step.');
  await undo(page);
  assert.equal(await value(page, 'network', 'cidr'), '10.60.0.0/16');

  const canceled = await content(page), canceledHistory = await historySize(page);
  editor = await openField(page, 'network', 'region');
  await editor.fill('Discard this draft');
  await editor.press('Escape');
  await page.locator('[data-nds-tool="move"]').click();
  assert.deepEqual(await content(page), canceled, 'Escape cannot commit through a later blur.');
  assert.equal(await historySize(page), canceledHistory);
  editor = await openField(page, 'network', 'region');
  await editor.press('Enter');
  assert.equal(await historySize(page), canceledHistory, 'An unchanged value adds no undo step.');
  editor = await openField(page, 'network', 'region');
  await editor.fill('West US');
  await page.locator('[data-nds-tool="move"]').click();
  assert.equal(await value(page, 'network', 'region'), 'West US', 'Clicking away saves the draft.');

  editor = await openField(page, 'subnet', 'NSG');
  await editor.fill('nsg-web-updated');
  await capture(page, 'after.png');
  await editor.press('Enter');
  assert.equal(await value(page, 'subnet', 'NSG'), 'nsg-web-updated');
  assert.equal(await value(page, 'subnet', 'cidr'), '10.40.1.0/24', 'Editing NSG does not edit the adjacent CIDR.');
  assert.equal(await value(page, 'network', 'DNS server'), '10.40.0.4');
  const nodes = (await content(page)).nodes;
  assert.deepEqual(nodes.map(n => [n.id, n.parent, n.position]), original.nodes.map(n => [n.id, n.parent, n.position]),
    'Editing nested header properties preserves names, nesting and positions.');
  assert.deepEqual(nodes.map(n => n.data.name), original.nodes.map(n => n.data.name));
  console.log('PASS group properties: double-click, focus, draft, Enter/blur, Escape, no-op, separate undo/redo and inspector synchronization');
}

async function keyboardAndIdentity(page) {
  let editor = await openField(page, 'subnet', 'cidr');
  const before = await content(page);
  await editor.press('Control+a');
  await editor.press('Delete');
  assert.equal((await content(page)).nodes.length, before.nodes.length, 'Delete edits text, not the selected container.');
  await editor.press('Backspace');
  await editor.press('Escape');
  assert.deepEqual(await content(page), before);
  await page.waitForFunction(() =>
    document.activeElement?.getAttribute('data-nds-group-field') === 'cidr');
  await field(page, 'subnet', 'NSG').focus();
  await page.keyboard.press('Enter');
  editor = input(page, 'subnet');
  await editor.waitFor();
  await editor.fill('nsg-keyboard');
  await editor.press('Tab');
  await page.waitForFunction(() =>
    window.__nds_diagramStore.getState().diagram.nodes.find(node => node.id === 'subnet').data.fields.NSG === 'nsg-keyboard');
  assert.equal(await value(page, 'subnet', 'NSG'), 'nsg-keyboard', 'Tab commits before moving focus.');

  await field(page, 'network', 'region').focus();
  await page.keyboard.press('Space');
  editor = input(page, 'network');
  await editor.fill('Japan East');
  await editor.dispatchEvent('compositionstart');
  await editor.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true });
  assert.equal(await editor.count(), 1, 'IME Enter does not finish the property edit.');
  assert.equal(await value(page, 'network', 'region'), 'West US');
  await editor.dispatchEvent('compositionend', { data: 'Japan East' });
  await editor.press('Enter');
  assert.equal(await value(page, 'network', 'region'), 'Japan East');

  await page.evaluate(() => {
    const s = window.__nds_diagramStore.getState();
    s.updateNodeField('subnet', 'Address', '192.0.2.10');
    s.updateNodeField('subnet', 'Address\u00012', '192.0.2.10');
  });
  await settle(page);
  editor = await openField(page, 'subnet', 'Address\u00012');
  await editor.fill('192.0.2.20');
  await editor.press('Enter');
  assert.equal(await value(page, 'subnet', 'Address'), '192.0.2.10');
  assert.equal(await value(page, 'subnet', 'Address\u00012'), '192.0.2.20', 'Duplicate labels/values retain distinct storage keys.');
  editor = await openField(page, 'subnet', 'Address\u00012');
  await editor.fill('');
  await editor.press('Enter');
  assert.equal(await value(page, 'subnet', 'Address\u00012'), '');
  assert.equal(await field(page, 'subnet', 'Address\u00012').count(), 0, 'Cleared values disappear from the header, not the inspector.');
  assert.equal(await node(page, 'subnet').count(), 1);
  await undo(page);
  assert.equal(await value(page, 'subnet', 'Address\u00012'), '192.0.2.20');
  await page.evaluate(() => {
    const s = window.__nds_diagramStore.getState();
    s.removeNodeField('subnet', 'Address'); s.removeNodeField('subnet', 'Address\u00012');
  });
  console.log('PASS group properties: keyboard access, Tab, Delete/Backspace isolation, IME, duplicate custom keys and empty-value undo');
}

async function gesturesAndAppearance(page) {
  await load(page);
  await field(page, 'network', 'region').click();
  assert.equal(await input(page, 'network').count(), 0, 'Single-click still selects without opening an editor.');
  assert.equal(await page.evaluate(() => window.__nds_diagramStore.getState().selectedNodeId), 'network');
  await frameField(page, 'network', 'region');
  const before = await content(page), originalCamera = await camera(page);
  const box = await field(page, 'network', 'region').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 60, y + 30, { steps: 12 }); await page.mouse.up(); await settle(page);
  assert.notDeepEqual((await content(page)).nodes[0].position, before.nodes[0].position, 'The header remains a native group drag target.');
  assert.equal(await camera(page), originalCamera);
  await undo(page);
  assert.deepEqual(await content(page), before);

  const editor = await openField(page, 'network', 'region');
  const textBox = await editor.boundingBox();
  const state = await content(page), view = await camera(page);
  await page.mouse.move(textBox.x + 5, textBox.y + textBox.height / 2);
  await page.mouse.down(); await page.mouse.move(textBox.x + textBox.width - 5, textBox.y + textBox.height / 2, { steps: 8 });
  await page.mouse.up(); await settle(page);
  assert.deepEqual(await content(page), state, 'Selecting input text never drags the group.');
  assert.equal(await camera(page), view);
  await editor.press('Escape');
  const grip = node(page, 'network').locator('.react-flow__resize-control.handle.bottom.left');
  const gripBox = await grip.boundingBox();
  assert(gripBox, 'The selected group retains its resize handles.');
  assert(await grip.evaluate(el => {
    const b = el.getBoundingClientRect();
    return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) === el;
  }), 'Resize from an exposed corner, not through the open property inspector.');
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down(); await page.mouse.move(gripBox.x - 60, gripBox.y + 55, { steps: 12 }); await page.mouse.up();
  await settle(page);
  assert((await content(page)).nodes[0].size.w > state.nodes[0].size.w, 'Native resizing still works.');
  await undo(page);
  assert.deepEqual(await content(page), state);
  const name = node(page, 'network').getByText('vnet-example', { exact: true });
  await name.dblclick();
  const nameEditor = node(page, 'network').locator('input:not([data-nds-group-field-input])');
  await nameEditor.fill('Renamed example');
  await nameEditor.press('Enter');
  assert.equal((await content(page)).nodes[0].data.name, 'Renamed example');
  await undo(page);
  assert.deepEqual(await content(page), state, 'The existing group-name editor still works.');

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => window.__nds_themeStore.getState().setPref(theme), theme);
    for (const scale of [1, 1.5]) {
      await page.evaluate(scale => window.__nds_diagramStore.getState().updateNodeTextScale('subnet', scale), scale);
      await page.locator('.react-flow__controls-fitview').click(); await page.waitForTimeout(300);
      const size = await field(page, 'subnet', 'NSG').evaluate(el => getComputedStyle(el).fontSize);
      const editor = await openField(page, 'subnet', 'NSG');
      assert.equal(await editor.evaluate(el => getComputedStyle(el).fontSize), size, 'Editing preserves the scaled header typography.');
      const colors = await editor.evaluate(el => {
        const style = getComputedStyle(el); return [style.color, style.backgroundColor];
      });
      assert.notEqual(colors[0], colors[1], 'The editor has contrasting text and background in both themes.');
      if (scale === 1) await capture(page, `editor-${theme}.png`);
      await editor.press('Escape');
    }
  }
  await page.evaluate(() => {
    window.__nds_themeStore.getState().setPref('light');
    window.__nds_diagramStore.getState().updateNodeTextScale('subnet', 1);
  });
  const hints = [];
  for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
    await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
    const title = await field(page, 'subnet', 'NSG').getAttribute('title');
    hints.push(title);
    const editor = await openField(page, 'subnet', 'NSG');
    assert.equal(await editor.getAttribute('aria-label'), 'NSG');
    await editor.press('Escape');
  }
  assert.equal(new Set(hints).size, 8, 'The edit hint is translated in all eight languages.');
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await load(page);
  const compactEditor = await openField(page, 'network', 'DNS server');
  await compactEditor.fill('10.40.0.5');
  await compactEditor.press('Enter');
  assert.equal(await value(page, 'network', 'DNS server'), '10.40.0.5');
  await page.setViewportSize({ width: 1920, height: 1150 });
  console.log('PASS group properties: single-click, native drag/resize, text selection, unchanged camera, scaled light/dark UI and eight languages');
}

async function persistence(page) {
  await load(page);
  let editor = await openField(page, 'network', 'region');
  await editor.fill('Japan West');
  await editor.press('Enter');
  editor = await openField(page, 'subnet', 'NSG');
  await editor.fill('nsg-saved');
  await editor.press('Enter');
  const expected = await content(page);
  await page.evaluate(() => {
    window.__headerSaved = null;
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = object => {
      if (object instanceof Blob && object.type === 'application/json') {
        object.text().then(text => { window.__headerSaved = text; });
      }
      return create(object);
    };
  });
  await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
  await page.waitForFunction(() => window.__headerSaved !== null);
  const saved = JSON.parse(await page.evaluate(() => window.__headerSaved));
  assert.equal(saved.nodes.find(n => n.id === 'network').data.fields.region, 'Japan West');
  assert.equal(saved.nodes.find(n => n.id === 'subnet').data.fields.NSG, 'nsg-saved');
  assert(!JSON.stringify(saved).includes('group-field-input'), 'Only data, not editor state, is saved.');
  await load(page, saved);
  assert.deepEqual(await content(page), expected, 'Save/Load JSON preserves edited values and geometry.');
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('nds.autoSave.v1') || 'null');
    if (!saved) return false;
    const tab = saved.tabs.find(t => t.id === saved.activeTabId);
    return tab?.diagram?.nodes.some(n => n.id === 'subnet' && n.data.fields.NSG === 'nsg-saved');
  });
  await page.reload();
  await field(page, 'subnet', 'NSG').waitFor();
  assert.deepEqual(await content(page), expected, 'Browser auto-save restores edited values.');
  const originalTab = await page.evaluate(() => window.__nds_tabsStore.getState().activeTabId);
  await page.locator('[data-nds-tab-add]').click();
  assert.equal(await page.locator('[data-nds-group-field-input]').count(), 0);
  await page.evaluate(id => window.__nds_tabsStore.getState().switchTab(id), originalTab);
  await field(page, 'subnet', 'NSG').waitFor();
  assert.deepEqual(await content(page), expected, 'Switching tabs preserves the edited diagram.');
  console.log('PASS group properties: Save JSON, Load JSON, browser auto-save/reload and tab switching');
}

function wrappingFixture() {
  const file = fixture();
  file.meta.title = 'Full resource names';
  file.nodes = [
    { id: 'wrap-network', type: 'group-vnet', position: { x: 20, y: 80 }, size: { w: 330, h: 410 },
      data: { name: 'vnet' + 'a'.repeat(80), notes: 'Notes stay below the full name.', fields: {} } },
    { id: 'wrap-subnet', type: 'group-subnet', position: { x: 400, y: 80 }, size: { w: 330, h: 410 },
      data: { name: 'subnet-production-application-services-for-the-primary-business-workload',
        notes: 'Property values remain editable.', fields: { cidr: '10.40.1.0/24', NSG: 'nsg-workload' } } },
    { id: 'wrap-rg', type: 'group-rg', position: { x: 20, y: 530 }, size: { w: 330, h: 410 },
      data: { name: 'Production resource group for networking and application integration services', fields: {} } },
    { id: 'wrap-region', type: 'group-region', position: { x: 400, y: 530 }, size: { w: 330, h: 410 },
      data: { name: 'ネットワークアプリケーションサービスのリソース'.repeat(3), fields: {} } },
    { id: 'wrap-server', type: 'vm', position: { x: 830, y: 80 }, size: { w: 270, h: 400 },
      data: { name: 'server' + 'b'.repeat(90), fields: {} } },
    { id: 'wrap-storage', type: 'storage', position: { x: 830, y: 530 }, size: { w: 270, h: 400 },
      data: { name: 'Storage for production application data and long term business records in the primary region', fields: {} } },
  ];
  return file;
}

async function assertWrappedNames(page, file) {
  for (const resource of file.nodes) {
    const name = node(page, resource.id).locator('[data-nds-resource-name]');
    assert.equal(await name.textContent(), resource.data.name);
    const measurement = await name.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const lines = [...range.getClientRects()].filter(rect => rect.width > 0);
      const label = element.getBoundingClientRect(), box = element.closest('.react-flow__node').getBoundingClientRect();
      const css = getComputedStyle(element);
      return { lines: lines.length, allInside: lines.every(rect =>
        rect.left >= label.left - 1 && rect.right <= label.right + 1 &&
        rect.left >= box.left - 1 && rect.right <= box.right + 1),
      clipped: element.scrollHeight > element.clientHeight + 1,
      ellipsis: css.textOverflow === 'ellipsis',
      clamp: css.webkitLineClamp };
    });
    assert(measurement.lines >= 3, `${resource.id}: full names wrap beyond two lines`);
    assert(measurement.allInside && !measurement.clipped && !measurement.ellipsis &&
      (!measurement.clamp || ['none', 'unset'].includes(measurement.clamp)), `${resource.id}: ${JSON.stringify(measurement)}`);
    if (resource.data.notes) {
      const header = await node(page, resource.id).locator('[data-nds-group-header]').first().boundingBox();
      const notes = await node(page, resource.id).locator('[data-nds-group-notes]').boundingBox();
      assert(notes.y >= header.y + header.height + 1, `${resource.id}: notes clear the wrapped header`);
    }
    if (resource.type.startsWith('group-') && Object.values(resource.data.fields).some(Boolean)) {
      const nameBox = await name.boundingBox();
      const header = await node(page, resource.id).locator('[data-nds-group-header]').first().boundingBox();
      for (const chip of await node(page, resource.id).locator('[data-nds-group-field]').all()) {
        const box = await chip.boundingBox();
        assert(box.x >= nameBox.x + nameBox.width - 1, `${resource.id}: fields remain to the right of the wrapped name`);
        assert(box.x + box.width <= header.x + header.width + 1, `${resource.id}: fields stay inside the header`);
      }
    }
  }
}

async function wrapping(page) {
  const file = wrappingFixture();
  await load(page, file);
  const before = await content(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => window.__nds_themeStore.getState().setPref(value), theme);
    await settle(page);
    await assertWrappedNames(page, file);
  }
  assert.deepEqual(await content(page), before, 'Rendering full names does not rewrite names or diagram geometry.');
  await page.evaluate(() => window.__nds_themeStore.getState().setPref('light'));
  await page.evaluate(() => window.__nds_diagramStore.getState().updateNodeSize('wrap-network', { w: 180, h: 600 }));
  await settle(page);
  await assertWrappedNames(page, file);
  await page.evaluate(() => window.__nds_diagramStore.getState().updateNodeTextScale('wrap-network', 1.8));
  await settle(page);
  await assertWrappedNames(page, file);
  await load(page, file);
  const name = node(page, 'wrap-network').locator('[data-nds-resource-name]');
  const box = await name.boundingBox();
  await page.mouse.dblclick(box.x + 20, box.y + 8, { delay: 60 });
  const editor = name.locator('input');
  await editor.waitFor();
  const renamed = 'renamed-vnet-' + 'c'.repeat(84);
  await editor.fill(renamed);
  await editor.press('Enter');
  await editor.waitFor({ state: 'detached' });
  file.nodes[0].data.name = renamed;
  await assertWrappedNames(page, file);
  await undo(page);
  assert.deepEqual(await content(page), before, 'Renaming wrapped names remains one reversible edit.');
  await load(page);
  console.log('PASS resource names: full unbroken, hyphenated, spaced and Japanese names; group notes, themes, rename and undo');
}

async function rightAlignedProperties(page) {
  const file = wrappingFixture();
  file.nodes = [file.nodes.find(resource => resource.id === 'wrap-subnet')];
  file.nodes[0].position = { x: 50, y: 80 };
  for (const width of [700, 330, 160]) {
    file.nodes[0].size = { w: width, h: 600 };
    await load(page, file);
    const original = await content(page);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.__nds_themeStore.getState().setPref(value), theme);
      await settle(page);
      await assertWrappedNames(page, file);
    }
    if (width === 700) {
      const ip = await field(page, 'wrap-subnet', 'cidr').boundingBox();
      const custom = await field(page, 'wrap-subnet', 'NSG').boundingBox();
      assert(Math.abs(ip.y - custom.y) < 1, 'Wide headers match the approved side-by-side property preview.');
      assert(custom.x >= ip.x + ip.width, 'IP and custom value do not overlap.');
    }
    assert.deepEqual(await content(page), original, 'Right-hand layout preserves stored resource sizes, names and values.');
    const editor = await openField(page, 'wrap-subnet', 'NSG');
    await editor.fill('nsg-editing-on-the-right');
    await editor.press('Escape');
    await editor.waitFor({ state: 'detached' });
    await assertWrappedNames(page, file);
    assert.deepEqual(await content(page), original, 'Cancelling a right-hand field edit preserves the resource.');
  }
  await load(page);
  console.log('PASS group headers: approved right-hand IP/custom layout, narrow boxes, themes, editing and unchanged data');
}

async function main() {
  const target = process.argv[2] || path.join(__dirname, '..', 'index.html');
  const url = /^https?:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const beforeHash = url.startsWith('file:') ? hash(target) : null;
  const beforeMode = process.argv.includes('--before');
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1150 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const page = await context.newPage(), errors = [], network = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await context.route(/^https?:/, route => {
    if (url.startsWith('http') && new URL(route.request().url()).origin === new URL(url).origin) return route.continue();
    network.push(route.request().url()); return route.abort();
  });
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.__nds_tabsStore && window.__nds_diagramStore);
    await load(page);
    if (beforeMode) {
      const initial = await content(page);
      const chip = node(page, 'subnet').getByText('nsg-web', { exact: true });
      const b = await chip.boundingBox();
      await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
      await settle(page);
      assert.equal(await node(page, 'subnet').locator('input').count(), 0);
      assert.deepEqual(await content(page), initial);
      await capture(page, 'before.png');
      console.log('REPRODUCED: double-clicking a subnet header property cannot open an editor in the installed old build.');
    } else {
      await edits(page);
      await keyboardAndIdentity(page);
      await gesturesAndAppearance(page);
      await persistence(page);
      await wrapping(page);
      await rightAlignedProperties(page);
    }
    assert.deepEqual(errors, [], 'No browser errors or duplicate React keys.');
    assert.deepEqual(network, [], 'Header editing remains completely offline.');
    if (beforeHash) assert.equal(hash(target), beforeHash, 'Tests never rewrite the application.');
  } finally { await context.close(); await browser.close(); }
}

module.exports = { fixture, wrappingFixture, load, node, field, openField, capture };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
