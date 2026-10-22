/**
 * test-public-build.cjs — the portable production package for external users.
 *
 * The approved production release consists of index.html, its Windows
 * launcher and the four production asset folders. Two contracts matter:
 *
 *   1. THE EDITOR NEEDS NO ACCOUNT OR NETWORK. Feedback deliberately opens
 *      the original Microsoft Forms survey; its sharing settings control
 *      access. Only that exact approved URL is exempted from the internal
 *      host scan. No survey is contacted or submitted by this test.
 *
 *   2. ALL APPROVED PRODUCTION FEATURES REMAIN AVAILABLE. An optional explicit
 *      comparison bundle can additionally verify a migration's visible UI.
 *
 * Section 7 is the one that matters most and is the least obvious: it counts
 * outbound requests. "It works offline" is the product promise, and the only
 * honest way to check it is to watch the wire while the app is used.
 *
 * Usage: node test-public-build.cjs [publicBundle] [optionalComparisonBundle]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PUBLIC =
  process.argv[2] || path.join(__dirname, '..', 'index.html');
const COMPARISON = process.argv[3];
const PACKAGE = path.dirname(path.resolve(PUBLIC));
const FEEDBACK = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR2VJmW1D0XZAg4tjAfjgezRUNE45SUdSRFFJS0VRWjQyWjk5RzAxMFBDRy4u';

// Hosts that only resolve to something useful from inside the company, or
// that imply a corporate identity. learn.microsoft.com is deliberately NOT
// here: public documentation is fine to link, and the knowledge base is full
// of it.
const INTERNAL_HOSTS = [
  'forms.cloud.microsoft',
  'forms.office.com',
  'microsoft.sharepoint.com',
  'teams.microsoft.com',
  'supportability.visualstudio.com',
  'dev.azure.com/Supportability',
  'msit.',
  'aka.ms/',
];

let fails = 0;
const ok = (cond, msg, detail) => {
  if (cond) console.log('  PASS  ' + msg);
  else {
    fails += 1;
    console.log('  FAIL  ' + msg + (detail === undefined ? '' : '  ' + JSON.stringify(detail)));
  }
};
const section = (s) => console.log('\n--- ' + s + ' ---');

/** Everything about the UI that is not a build mark. Mirrors test-build-parity. */
const FINGERPRINT = () => {
  const txt = (el) => (el.innerText || '').trim().replace(/\s+/g, ' ');
  const isBadge = (el) => el.getAttribute('title') === 'Demo build \u00b7 v0.6 preview';
  const label = (el) =>
    (txt(el) || el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('data-testid') || '')
      .replace(/\bv\d+\.\d+\.\d+\b/g, 'v<version>');

  const buttons = [...document.querySelectorAll('button')]
    .filter((b) => !isBadge(b))
    .map(label)
    .filter(Boolean)
    .sort();

  const sections = [...document.querySelectorAll('[data-nds-section], details, section')]
    .map((el) => el.getAttribute('data-nds-section') || label(el).split('\n')[0])
    .filter(Boolean)
    .sort();

  const railButtons = [...document.querySelectorAll('[class*="rail"] button, nav button')]
    .map((b) => b.getAttribute('title') || '')
    .filter(Boolean)
    .sort();

  const badge = document.querySelector('span[title="Demo build \u00b7 v0.6 preview"]');
  const prevDisplay = badge ? badge.style.display : null;
  if (badge) badge.style.display = 'none';
  const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim()
    .replace(/\bv\d+\.\d+\.\d+\b/g, 'vRELEASE');
  if (badge) badge.style.display = prevDisplay;

  return {
    buttons,
    sections,
    railButtons,
    selects: [...document.querySelectorAll('select')].length,
    inputs: [...document.querySelectorAll('input')].length,
    bodyText,
  };
};

async function open(browser, file) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage();
  await page.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('file:///' + path.resolve(file).replace(/\\/g, '/'));
  await page.waitForSelector('.react-flow', { timeout: 20000 });
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
  await page.waitForTimeout(600);
  return { page, errors, requests };
}

/** Open Settings and scroll to the bottom, where the feedback card lives. */
async function openSettings(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => (x.getAttribute('title') || x.getAttribute('aria-label') || '').toLowerCase().includes('setting')
    );
    if (b) b.click();
  });
  await page.waitForTimeout(500);
}

/**
 * Settings must be shut again before section 6 fingerprints the page.
 * An open menu contributes ~18 buttons (languages, themes, Guide groups) and
 * the comments author-name <input>, and comparing an open page against a
 * closed one reports every one of them as a difference the build introduced.
 */
async function closeSettings(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return page.evaluate(() => !document.querySelector('[data-nds-feedback-link="1"]'));
}

async function checkFeedbackClicks(page, edition) {
  const url = page.url();
  await page.evaluate(() => {
    window.__feedbackOriginalOpen = window.open;
    window.__feedbackOpened = [];
    window.open = (...args) => { window.__feedbackOpened.push(args); return null; };
  });
  try {
    for (const lang of ['en', 'ja', 'de', 'es', 'fr', 'pt', 'ko', 'zh']) {
      await page.evaluate(value => window.__nds_i18nStore.getState().setLang(value), lang);
      const button = page.locator('[data-nds-feedback-header]');
      await button.click();
      const opened = await page.evaluate(() => window.__feedbackOpened.at(-1));
      ok(opened?.[0] === FEEDBACK && opened[1] === '_blank' && opened[2] === 'noopener,noreferrer',
        `${edition}/${lang}: Feedback opens the original Microsoft Form safely`, opened);
      ok(!!(await button.getAttribute('aria-label'))?.trim(), `${edition}/${lang}: Feedback remains accessible`);
    }
    ok(page.url() === url, `${edition}: feedback leaves the editor open`);
  } finally {
    await page.evaluate(() => {
      window.open = window.__feedbackOriginalOpen;
      delete window.__feedbackOriginalOpen;
      delete window.__feedbackOpened;
      window.__nds_i18nStore.getState().setLang('en');
    });
  }
}

(async () => {
  console.log('public : ' + PUBLIC);
  if (COMPARISON) console.log('comparison: ' + COMPARISON);

  section('1. the build landed where it says it does');
  ok(fs.existsSync(PUBLIC), 'production index.html exists', PUBLIC);
  if (!fs.existsSync(PUBLIC)) {
    console.log('\nFAILED - build and wire the complete staged production package first');
    process.exit(1);
  }
  const bytes = fs.readFileSync(PUBLIC, 'utf8');
  ok(bytes.length > 1_000_000, 'it contains the full application bundle, not a stub', bytes.length);
  const references = [...bytes.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\.\/production_[^"]+)"/g)]
    .map(match => match[1]);
  ok(references.length === 28 && new Set(references).size === 28, 'all 28 local runtime references occur exactly once');
  for (const reference of references) {
    const relative = reference.split('?')[0].slice(2);
    ok(fs.existsSync(path.join(PACKAGE, relative)), 'packaged dependency exists: ' + relative);
  }
  ok(!bytes.includes('./non_production_'), 'no non-production asset references');
  for (const name of ['ndsProductionConnectors', 'ndsProductionCaptions', 'ndsProductionVendors',
    'ndsProductionGroupCopy', 'ndsProductionGroupPaste', '__ndsProductionCapture']) {
    ok(bytes.includes(name), 'production runtime binding is present: ' + name);
  }
  ok(!/ndsNonProduction|__ndsNonProdCapture|nds-nonprod-notes/.test(bytes), 'runtime identifiers match the existing production assets');

  section('2. only the approved external feedback URL is exempted');
  const reviewedBytes = bytes.replaceAll(FEEDBACK, '');
  for (const host of INTERNAL_HOSTS) {
    ok(!reviewedBytes.includes(host), 'no other reference to ' + host);
  }
  ok(bytes.includes(FEEDBACK), 'the original Microsoft Forms feedback link is present');
  const feedbackScript = fs.readFileSync(path.join(PACKAGE, 'production_editor', 'feedback.js'), 'utf8');
  ok(feedbackScript.includes(FEEDBACK) && !feedbackScript.includes('app.formbricks.com') &&
    !bytes.includes('app.formbricks.com'), 'the previous feedback destination is absent');
  ok(bytes.includes('feedback.js?v=feedback-ms-forms-1'), 'the updated feedback script has a fresh cache key');

  section('3. it carries no demo mark');
  const title = /<title>([^<]*)<\/title>/.exec(bytes);
  ok(!!title && title[1].trim() === 'Network Diagram Studio', 'plain title', title && title[1]);
  ok(!/Demo build/.test(bytes), 'no "Demo build" anywhere in the file');
  ok(!/%23dc2626/.test(bytes.slice(0, 2000)), 'favicon is not the red demo one');

  const browser = await chromium.launch();
  try {
  const pub = await open(browser, PUBLIC);

  section('4. the app boots');
  ok(pub.errors.length === 0, 'no page errors on load', pub.errors.slice(0, 3));
  const badge = await pub.page.evaluate(
    () => !!document.querySelector('span[title="Demo build \u00b7 v0.6 preview"]')
  );
  ok(badge === false, 'no DEMO badge in the header');
  const brand = pub.page.locator('header img[alt="Network Diagram Studio"]');
  ok((await brand.getAttribute('src')).startsWith('./production_editor/nds-logo.svg'), 'the blue production artwork is used');
  ok(fs.readFileSync(path.join(PACKAGE, 'production_editor', 'nds-logo.svg'), 'utf8').includes('#026ed9'),
    'the supplied production logo stays blue');
  const bindings = await pub.page.evaluate(() => ({
    connectors: typeof window.ndsProductionConnectors?.install,
    captions: typeof window.ndsProductionCaptions?.install,
    capture: typeof window.__ndsProductionCapture?.prepareSvg,
    vendors: window.ndsProductionVendorCatalog?.entries.length,
    notes: document.querySelector('[data-nds-notes-panel]')?.id,
  }));
  ok(bindings.connectors === 'function' && bindings.captions === 'function' &&
    bindings.capture === 'function' && bindings.vendors === 15, 'production extension bindings are live', bindings);

  section('5. header and Settings use the original Microsoft Form');
  await openSettings(pub.page);
  const link = await pub.page.evaluate(() => {
    const a = document.querySelector('[data-nds-feedback-link="1"]');
    if (!a) return null;
    return {
      href: a.getAttribute('href') || '',
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      text: (a.innerText || '').trim().replace(/\s+/g, ' '),
      visible: a.getBoundingClientRect().height > 0,
    };
  });
  ok(!!link, 'the feedback card is still there', link);
  ok(!!link && link.href === FEEDBACK, 'Settings uses the original Microsoft Forms link', link && link.href);
  ok(!!link && link.target === '_blank', 'feedback opens separately so the diagram is not replaced', link && link.target);
  ok(await pub.page.locator('[data-nds-feedback-header]').isVisible(), 'the existing header Feedback button is visible');
  ok(await pub.page.evaluate(expected => window.ndsFeedback.url === expected, FEEDBACK),
    'header feedback uses the same Microsoft Forms link');

  section('6. approved production features and optional explicit UI comparison');
  ok(await closeSettings(pub.page), 'Settings closed again before comparing');
  await checkFeedbackClicks(pub.page, 'production');
  if (COMPARISON) {
  const comparison = await open(browser, COMPARISON);
  await checkFeedbackClicks(comparison.page, 'comparison');
  const pf = await pub.page.evaluate(FINGERPRINT);
  const nf = await comparison.page.evaluate(FINGERPRINT);
  const only = (a, b) => a.filter((x) => !b.includes(x));
  ok(only(nf.buttons, pf.buttons).length === 0, 'no button missing from the public build', only(nf.buttons, pf.buttons));
  ok(only(pf.buttons, nf.buttons).length === 0, 'no button added by the public build', only(pf.buttons, nf.buttons));
  ok(only(nf.sections, pf.sections).length === 0, 'no palette section missing', only(nf.sections, pf.sections));
  ok(only(nf.railButtons, pf.railButtons).length === 0, 'no rail button missing', only(nf.railButtons, pf.railButtons));
  ok(pf.selects === nf.selects, 'same number of <select> controls', { pub: pf.selects, comparison: nf.selects });
  ok(pf.inputs === nf.inputs, 'same number of <input> controls', { pub: pf.inputs, comparison: nf.inputs });
  ok(pf.bodyText === nf.bodyText, 'visible text matches apart from the DEMO mark and release version',
    pf.bodyText === nf.bodyText ? undefined : { production: pf.bodyText, comparison: nf.bodyText });
  ok(comparison.errors.length === 0, 'the explicit comparison bundle was clean', comparison.errors.slice(0, 3));
  }
  ok(await pub.page.locator('[data-nds-accordion-section="shapes"] [data-nds-shape-tile]').count() === 24,
    'the full approved 24-shape palette is present');
  ok(await pub.page.locator('[data-nds-shape-variant="text-box"]').count() === 1, 'Text box is included');
  ok(await pub.page.locator('[data-nds-import-icons]').count() === 1, 'icon import is available');
  ok(await pub.page.locator('[data-nds-accordion-header][draggable="true"]').count() === 5, 'all five section headers can be reordered');

  section('7. it never touches the network');
  // The offline promise, checked on the wire rather than asserted. Load a
  // sample, place a node, open a panel - the things a reader does in the
  // first minute - and watch what leaves the page.
  await pub.page.evaluate(() => window.__nds_diagramStore.getState().loadSample());
  await pub.page.waitForTimeout(1200);
  await pub.page.evaluate(() => window.__nds_diagramStore.getState().addNode('vm', { x: 40, y: 40 }));
  await pub.page.waitForTimeout(800);
  const offsite = pub.requests.filter((u) => /^(https?|ws|wss):/i.test(u));
  ok(offsite.length === 0, 'zero http/ws requests across the whole session', offsite.slice(0, 5));
  const fonts = /@font-face/.test(bytes) && /src:\s*url\(["']?https?:/i.test(bytes);
  ok(!fonts, 'no webfont fetched from a CDN');

  section('8. the features a reader came for are present');
  const feat = await pub.page.evaluate(() => {
    const labels = [...document.querySelectorAll('button')].map(
      (b) => (b.innerText || '') + '|' + (b.getAttribute('title') || '') + '|' + (b.getAttribute('aria-label') || '')
    );
    const has = (re) => labels.some((l) => re.test(l));
    return {
      screenshot: has(/screenshot/i),
      png: has(/\bPNG\b/i),
      svg: has(/\bSVG\b/i),
      save: has(/save|\.json/i),
      nodes: document.querySelectorAll('.react-flow__node').length,
    };
  });
  ok(feat.screenshot, 'the Screenshot button is there', feat);
  ok(feat.png && feat.svg, 'PNG and SVG export are there', feat);
  ok(feat.nodes > 0, 'the sample diagram rendered', feat);
  ok(pub.errors.length === 0, 'production stayed free of page errors', pub.errors.slice(0, 3));

  } finally { await browser.close(); }
  console.log(fails === 0 ? '\nPASS' : '\n' + fails + ' FAILED');
  process.exit(fails === 0 ? 0 : 1);
})();
