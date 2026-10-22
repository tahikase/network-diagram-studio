async function openHeaderMenu(page, id, programmatic = false) {
  const trigger = page.locator(`[data-nds-menu-trigger="${id}"]`);
  if (await trigger.getAttribute('aria-expanded') !== 'true') {
    if (programmatic) await trigger.evaluate(element => element.click());
    else await trigger.click();
  }
  await page.locator(`#nds-menu-${id}`).waitFor();
}

async function clickHeaderAction(page, action) {
  if (action === 'Save JSON') {
    await page.getByRole('button', { name: action, exact: true }).click();
    return;
  }
  await openHeaderMenu(page, ['PNG', 'SVG', 'Screenshot'].includes(action) ? 'export' : 'file');
  const item = action === 'Import ARM' ? page.locator('#nds-arm-open')
    : page.getByRole('menuitem', { name: action, exact: true });
  await item.click();
}

module.exports = { openHeaderMenu, clickHeaderAction };
