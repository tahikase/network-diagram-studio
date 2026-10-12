const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const palette = page => page.locator('[data-nds-palette-accordion]');
const grid = page => page.locator('#section-body-icons [data-nds-icon-grid]');
const search = page => grid(page).locator('input[type="search"]');
const tiles = page => grid(page).locator('[data-nds-icon-tile]');
const settle = page => page.waitForTimeout(100);
const documentState = page => page.evaluate(() => ({
  diagram: window.__nds_diagramStore.getState().toJson(),
  history: window.__nds_diagramStore.getState().history,
  shapes: window.__nds_tabsStore.getState().activeTab().shapes,
}));

async function open(browser, entry) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: 'en-US' });
  context.setDefaultTimeout(10000);
  await context.addInitScript(() => localStorage.setItem('nds.paletteWidth', '460'));
  await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(/^https?:/.test(entry) ? entry : pathToFileURL(path.resolve(entry)).href);
  await page.waitForFunction(() => window.__nds_layoutStore && window.__nds_diagramStore && window.__nds_favoritesStore);
  await page.evaluate(() => {
    window.__nds_i18nStore.getState().setLang('en');
    window.__nds_themeStore.getState().setPref('light');
    const layout = window.__nds_layoutStore.getState();
    for (const section of [...layout.expandedSections]) if (section !== 'icons') layout.toggleSection(section);
    layout.expandSection('icons');
    layout.setNotesOpen(false);
  });
  await settle(page);
  return { page, context, errors };
}

async function scroll(page, top) {
  await palette(page).evaluate((element, top) => { element.scrollTop = top; }, top);
  await settle(page);
}

async function resize(page, width) {
  const aside = palette(page).locator('..');
  const box = await aside.boundingBox();
  const handle = await aside.getByRole('separator').boundingBox();
  const x = handle.x + handle.width / 2, y = handle.y + 80;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + width - box.width, y, { steps: 10 });
  await page.mouse.up();
  await settle(page);
  assert(Math.abs((await aside.boundingBox()).width - width) < 2, `native palette resize to ${width}`);
}

async function noGap(page, label, pinned) {
  const result = await grid(page).evaluate(grid => {
    const outer = document.querySelector('[data-nds-palette-accordion]');
    const p = outer.getBoundingClientRect();
    const search = grid.querySelector('[data-nds-icon-search]').getBoundingClientRect();
    const bottomTiles = [...grid.querySelectorAll('[data-nds-icon-tile]')].filter(tile => {
      const r = tile.getBoundingClientRect();
      return r.bottom > p.bottom - 80 && r.top < p.bottom - 4;
    });
    const visibleBottomTile = bottomTiles.some(tile => {
      const r = tile.getBoundingClientRect();
      const y = (Math.max(r.top, p.bottom - 80) + Math.min(r.bottom, p.bottom - 4)) / 2;
      return document.elementFromPoint(r.x + r.width / 2, y)?.closest('[data-nds-icon-tile]') === tile;
    });
    return {
      mode: grid.dataset.ndsIconGrid, visibleBottomTile,
      innerScrollers: [...grid.querySelectorAll('*')].filter(element =>
        ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1).length,
      outerScrolls: outer.scrollHeight > outer.clientHeight,
      horizontalOverflow: outer.scrollWidth - outer.clientWidth,
      searchTop: search.top, outerTop: p.top,
      searchHeight: search.height,
      offset: parseFloat(getComputedStyle(grid).getPropertyValue('--nds-icon-search-height')),
      footerGap: document.querySelector('[data-nds-palette-focused-section]').getBoundingClientRect().top - p.bottom,
    };
  });
  assert.equal(result.mode, 'flow', label + ': the catalog uses the palette scroll owner');
  assert.equal(result.innerScrollers, 0, label + ': no nested scroll port');
  assert(result.outerScrolls, label + ': all remaining icons are accessible in the outer scroller');
  assert(result.visibleBottomTile, label + ': an actual icon occupies the lower 80px, not an empty reserved area');
  assert(result.horizontalOverflow <= 1, label + ': no horizontal palette overflow');
  assert(Math.abs(result.footerGap) < 1, label + ': the palette reaches the footer');
  assert(Math.abs(result.offset - result.searchHeight) < 1, label + ': category offset follows the measured search height');
  if (pinned) assert(Math.abs(result.searchTop - result.outerTop) < 1, label + ': search remains pinned');
}

async function categoryHeaders(page) {
  await scroll(page, 0);
  const target = await grid(page).locator('[data-nds-icon-category]').evaluateAll(elements => {
    const outer = document.querySelector('[data-nds-palette-accordion]');
    const search = document.querySelector('#section-body-icons [data-nds-icon-search]');
    const header = elements.find(element => element.parentElement.getBoundingClientRect().height > outer.clientHeight + 100);
    if (!header) throw new Error('No catalog category spans the palette height.');
    return { name: header.dataset.ndsIconCategory,
      scroll: header.parentElement.getBoundingClientRect().top + outer.scrollTop -
        outer.getBoundingClientRect().top - search.getBoundingClientRect().height + 100 };
  });
  await scroll(page, target.scroll);
  const position = await grid(page).locator(`[data-nds-icon-category="${target.name}"]`).evaluate(element => ({
    top: element.getBoundingClientRect().top,
    searchBottom: document.querySelector('#section-body-icons [data-nds-icon-search]').getBoundingClientRect().bottom,
  }));
  assert(Math.abs(position.top - position.searchBottom) < 1, 'sticky category headers sit below, not on top of, pinned search');
  await noGap(page, 'category transition', true);
}

async function sizing(page) {
  const before = await documentState(page);
  const count = await tiles(page).count();
  assert(count > 800, 'the full native catalog is present');
  await noGap(page, 'reported tall/wide layout', false);
  for (const height of [600, 1050, 1600]) {
    await page.setViewportSize({ width: 1440, height });
    for (const width of [180, 300, 520]) {
      await resize(page, width);
      for (const top of [500, 2500, 11000]) {
        await scroll(page, top);
        await noGap(page, `${height}px window / ${width}px palette / scroll ${top}`, true);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  await resize(page, 300);
  await categoryHeaders(page);
  const p = await palette(page).boundingBox();
  const oldTop = await palette(page).evaluate(element => element.scrollTop);
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.wheel(0, 500);
  await page.waitForFunction(oldTop => document.querySelector('[data-nds-palette-accordion]').scrollTop > oldTop, oldTop);
  await noGap(page, 'native wheel over an icon', true);
  for (const lang of ['en', 'ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko']) {
    await page.evaluate(lang => window.__nds_i18nStore.getState().setLang(lang), lang);
    await resize(page, 180);
    await scroll(page, 500);
    await noGap(page, `narrow ${lang} palette`, true);
    await categoryHeaders(page);
  }
  await page.evaluate(() => {
    window.__nds_i18nStore.getState().setLang('en');
    window.__nds_themeStore.getState().setPref('dark');
  });
  await noGap(page, 'dark theme', true);
  await page.evaluate(() => window.__nds_themeStore.getState().setPref('light'));
  await resize(page, 300);
  await scroll(page, 100000);
  const last = await tiles(page).last().boundingBox();
  const outer = await palette(page).boundingBox();
  assert(last.y >= outer.y && last.y + last.height <= outer.y + outer.height, 'the last icon is fully reachable');
  await tiles(page).last().focus();
  assert(await tiles(page).last().evaluate(element => element === document.activeElement), 'last icon is keyboard-focusable');
  assert.equal(await tiles(page).count(), count);
  assert.deepEqual(await documentState(page), before, 'layout, wheel, resize, locale and focus do not change the diagram');
}

async function filteringAndOrder(page) {
  const expectedMatches = await tiles(page).evaluateAll(elements => elements.filter(element =>
    `${element.title} ${element.dataset.ndsIconTile}`.toLowerCase().includes('kubernetes')).length);
  assert(expectedMatches > 0 && expectedMatches < 12);
  await scroll(page, 2500);
  await search(page).fill('nds-no-matching-icon-12345');
  await settle(page);
  assert.equal(await tiles(page).count(), 0);
  assert((await grid(page).boundingBox()).height < 200, 'no-results state does not reserve a fixed-height area');
  assert(await grid(page).getByText('No matches. Try a different keyword.').isVisible());
  await search(page).fill('kubernetes');
  await settle(page);
  assert.equal(await tiles(page).count(), expectedMatches);
  const shortResults = await grid(page).evaluate(element => ({
    height: element.getBoundingClientRect().height,
    content: element.querySelector('[data-nds-icon-search]').getBoundingClientRect().height +
      [...element.querySelector('[data-nds-icon-list]').children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0),
  }));
  assert(Math.abs(shortResults.height - shortResults.content) < 1,
    'short results reserve exactly their content height, without a fixed-height remainder');
  await search(page).fill('');
  await settle(page);
  await page.evaluate(() => {
    const layout = window.__nds_layoutStore.getState();
    layout.movePaletteSection('icons', 'favorites', 'before');
    layout.expandSection('shapes');
  });
  await scroll(page, 500);
  await noGap(page, 'All Icons reordered first', true);
  await scroll(page, 100000);
  const following = await page.locator('[data-nds-accordion-header="shapes"]').boundingBox();
  const outer = await palette(page).boundingBox();
  assert(following.y >= outer.y && following.y < outer.y + outer.height, 'sections after the full catalog are reachable');
  await scroll(page, 2500);
  await search(page).fill('nds-no-matching-icon-12345');
  await settle(page);
  const iconRegion = await grid(page).boundingBox();
  const nextHeader = await page.locator('[data-nds-accordion-header="favorites"]').boundingBox();
  assert(Math.abs(nextHeader.y - (iconRegion.y + iconRegion.height)) < 2, 'following sections close up to an empty catalog');
  await search(page).fill('');
  await page.evaluate(() => {
    const layout = window.__nds_layoutStore.getState();
    layout.movePaletteSection('icons', 'shapes', 'after');
  });
  await scroll(page, 1500);
  await noGap(page, 'All Icons reordered between sections', true);
  await page.evaluate(() => {
    const layout = window.__nds_layoutStore.getState();
    layout.resetPaletteOrder();
    layout.toggleSection('shapes');
  });
  await scroll(page, 0);
  await page.locator('[data-nds-accordion-header="icons"]').click();
  assert.equal(await grid(page).count(), 0, 'collapsing All Icons releases its entire body');
  await page.locator('[data-nds-accordion-header="icons"]').click();
  await settle(page);
  await noGap(page, 'reopened All Icons', false);
  const global = page.locator('[data-nds-palette-search-all]');
  await global.fill('kubernetes');
  assert(await page.locator('[data-nds-search-hit-kind="icon"]').count() > 0, 'global search still finds icons');
  await global.fill('');
  await settle(page);
  await noGap(page, 'restored from global search', false);
}

async function editingAndPicker(page) {
  const count = await page.evaluate(() => window.__nds_diagramStore.getState().diagram.nodes.length);
  const tile = tiles(page).first();
  const id = await tile.getAttribute('data-nds-icon-tile');
  await tile.getByRole('button', { name: 'Add to Favorites', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__nds_diagramStore.getState().diagram.nodes.length), count);
  assert(await page.evaluate(id => window.__nds_favoritesStore.getState().icons.has(id), id));
  await tile.locator(':scope > svg').click();
  await page.waitForFunction(count => window.__nds_diagramStore.getState().diagram.nodes.length === count + 1, count);
  const placed = await page.evaluate(() => window.__nds_diagramStore.getState().diagram.nodes.at(-1));
  if (id.startsWith('vendor-')) {
    assert.equal(placed.type, id, 'a registered vendor icon retains its rich native resource type');
  } else {
    assert.equal(placed.data.iconId, id, 'an unmatched icon retains its custom artwork');
  }
  await tile.dragTo(page.locator('.react-flow__pane'), { sourcePosition: { x: 25, y: 25 }, targetPosition: { x: 400, y: 250 } });
  await page.waitForFunction(count => window.__nds_diagramStore.getState().diagram.nodes.length === count + 2, count);
  await page.getByRole('button', { name: /^Change icon/ }).click();
  const picker = page.getByRole('dialog').filter({ has: page.locator('[data-nds-icon-grid="contained"]') });
  const pickerSearch = picker.locator('input[type="search"]');
  assert(await pickerSearch.evaluate(element => document.activeElement === element), 'picker search retains autofocus');
  const list = picker.locator('[data-nds-icon-list]');
  const metrics = await list.evaluate(element => ({
    overflow: getComputedStyle(element).overflowY, height: element.clientHeight, content: element.scrollHeight,
    columns: getComputedStyle(element.querySelector('.grid')).gridTemplateColumns.split(' ').length,
  }));
  assert.equal(metrics.overflow, 'auto');
  assert(metrics.content > metrics.height && metrics.height > 200, 'the bounded modal retains its own scroller');
  assert.equal(metrics.columns, 7);
  const searchTop = (await pickerSearch.boundingBox()).y;
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await settle(page);
  assert.equal((await pickerSearch.boundingBox()).y, searchTop, 'modal search stays outside the contained scroller');
  const finalTile = await picker.locator('[data-nds-icon-tile]').last().boundingBox();
  const listBox = await list.boundingBox();
  assert(finalTile.y + finalTile.height <= listBox.y + listBox.height + 1, 'last modal icon is reachable');
  await pickerSearch.fill('oracle');
  const chosen = picker.locator('[data-nds-icon-tile]').first();
  const chosenId = await chosen.getAttribute('data-nds-icon-tile');
  await chosen.click();
  await picker.waitFor({ state: 'hidden' });
  assert(await page.evaluate(chosenId => window.__nds_diagramStore.getState().diagram.nodes.some(node => node.data.iconId === chosenId), chosenId));
  await page.getByRole('button', { name: /^Change icon/ }).click();
  await picker.waitFor();
  await page.keyboard.press('Escape');
  await picker.waitFor({ state: 'hidden' });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#246abc"/></svg>';
  await page.locator('[data-nds-import-icons-input]').setInputFiles({
    name: 'All Icons Layout Sample.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg),
  });
  await page.locator('[data-nds-transfer-confirm]').click();
  await page.locator('[data-nds-library-preview="files"]').waitFor({ state: 'detached' });
  await search(page).fill('All Icons Layout Sample');
  await page.waitForFunction(() => document.querySelectorAll('#section-body-icons [data-nds-icon-tile]').length === 1);
  assert.match(await tiles(page).first().getAttribute('data-nds-icon-tile'), /^imported-/);
  await tiles(page).first().locator(':scope > svg').click();
  await page.waitForFunction(count => window.__nds_diagramStore.getState().diagram.nodes.length === count + 3, count);
  await search(page).fill('');
  await scroll(page, 500);
  await noGap(page, 'native and imported catalog after editing', true);
}

async function main() {
  const entries = process.argv.slice(2);
  if (!entries.length) entries.push(process.env.NDS_BUNDLE || path.join(__dirname, '..', 'index.html'));
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    for (const entry of entries) {
      const { page, context, errors } = await open(browser, entry);
      try {
        await sizing(page);
        console.log(`PASS ${entry}: no All Icons gap across tall/short windows, three live widths, eight languages and native scrolling`);
        await filteringAndOrder(page);
        console.log(`PASS ${entry}: natural result/empty heights, pinned search/categories, reorder, collapse and global search`);
        await editingAndPicker(page);
        assert.deepEqual(errors, []);
        console.log(`PASS ${entry}: Favorites, click/drag/imported icons and bounded seven-column icon picker`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
