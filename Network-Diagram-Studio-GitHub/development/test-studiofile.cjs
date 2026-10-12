// v0.9.26 — shapes and strokes belong in the saved file.
//
// Guards the two data-loss bugs found while designing connectable shapes:
//   Bug A  Save JSON serialised the Diagram only, so every shape and pencil
//          stroke was silently dropped. Auto-save kept them, so the loss only
//          appeared once the file was shared.
//   Bug B  Load JSON replaced the diagram but never touched tab.shapes, so
//          the PREVIOUS diagram's shapes stayed floating over the new one.
//
// Run:  node test-studiofile.cjs [path-to-bundle]
const { chromium } = require('playwright');
const path = require('path');

const BUNDLE =
  process.argv[2] ||
  path.join(__dirname, '..', 'index.html');

let pass = 0;
let fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    fails.push(name);
    console.log(`  FAIL  ${name}${extra === undefined ? '' : ` -> ${JSON.stringify(extra)}`}`);
  }
}

// Deep equality that does not care about key ORDER. zod rebuilds a parsed
// object in schema-declaration order, so a plain JSON.stringify comparison
// fails on a perfectly correct round trip. Sort keys recursively first.
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canon(v[k]);
    return out;
  }
  return v;
}
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// Capture whatever saveJson writes, without the download plumbing.
// saveJson uses URL.createObjectURL (PNG/SVG use an <a download> data: URL).
const HOOK_SAVE = `
  window.__nds_saved = null;
  const orig = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (o) => {
    if (o instanceof Blob && o.type === 'application/json') {
      o.text().then((t) => { window.__nds_saved = t; });
    }
    return orig(o);
  };
`;

async function saveAndRead(page) {
  await page.evaluate(() => {
    window.__nds_saved = null;
  });
  // Exact titles: `title*="Load"` also matches the palette's Load Balancer
  // row, and clicking that adds a node instead of opening a file.
  await page.click('button[title="Save current diagram as JSON"]');
  await page.waitForFunction(() => window.__nds_saved !== null, { timeout: 5000 });
  return JSON.parse(await page.evaluate(() => window.__nds_saved));
}

// Every shape kind, every optional field that matters, plus rotation and geom.
const SHAPES = [
  {
    id: 'sh-rect',
    kind: 'rect',
    x: 40,
    y: 60,
    w: 220,
    h: 140,
    color: '#d13438',
    width: 3,
    fillOpacity: 0.15,
    text: 'PROBE RECT',
    textSize: 14,
    textBold: true,
    textColor: '#111111',
    dash: 'dashed',
    corner: 'sharp',
    fill: 'tint',
    geom: 'hexagon',
    rotation: 37,
  },
  {
    id: 'sh-ellipse',
    kind: 'ellipse',
    cx: 400,
    cy: 200,
    rx: 90,
    ry: 55,
    color: '#0078d4',
    width: 2,
    fillOpacity: 0.3,
    text: 'PROBE ELLIPSE',
    textSize: 12,
    textBold: false,
    textColor: '#222222',
    dash: 'dotted',
    fill: 'solid',
    rotation: -18,
  },
  {
    id: 'sh-arrow',
    kind: 'arrow',
    from: { x: 10, y: 20 },
    to: { x: 300, y: 240 },
    color: '#107c10',
    width: 4,
    text: 'PROBE ARROW',
    textSize: 11,
    textBold: true,
    textColor: '#333333',
    dash: 'dashed',
    head: 'both',
    shape: 'elbow',
    rotation: 12,
  },
  {
    id: 'sh-callout',
    kind: 'callout',
    x: 500,
    y: 400,
    w: 180,
    h: 90,
    anchor: { x: 620, y: 330 },
    text: 'PROBE CALLOUT',
    color: '#8661c5',
    width: 2,
    textSize: 13,
    textBold: false,
    textColor: '#444444',
    dash: 'solid',
    corner: 'rounded',
    rotation: 5,
  },
];

const STROKES = [
  {
    id: 'st-1',
    color: '#ff8c00',
    width: 5,
    points: [
      { x: 0, y: 0 },
      { x: 50, y: 40 },
      { x: 90, y: 10 },
    ],
    dash: 'dotted',
  },
];

function setShapes(page, shapes, strokes) {
  return page.evaluate(
    ([sh, st]) => {
      const s = window.__nds_tabsStore.getState();
      s.tabs.forEach(() => {});
      window.__nds_tabsStore.setState({
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId ? { ...t, shapes: sh, strokes: st } : t,
        ),
      });
    },
    [shapes, strokes],
  );
}

function loadFile(page, obj) {
  const raw = typeof obj === 'string' ? obj : JSON.stringify(obj);
  // Reported as a failed load rather than allowed to throw, so a bundle that
  // predates loadStudioFile fails every assertion instead of killing the run
  // — which is the whole point of the negative test.
  return page.evaluate((r) => {
    const s = window.__nds_tabsStore.getState();
    if (typeof s.loadStudioFile !== 'function') {
      return { ok: false, error: 'loadStudioFile is not implemented in this bundle' };
    }
    return s.loadStudioFile(r);
  }, raw);
}

function readShapes(page) {
  return page.evaluate(() => {
    const s = window.__nds_tabsStore.getState();
    const t = s.tabs.find((x) => x.id === s.activeTabId) ?? s.tabs[0];
    return { shapes: t.shapes, strokes: t.strokes };
  });
}

(async () => {
  console.log(`\nBUNDLE: ${BUNDLE}\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.addInitScript(HOOK_SAVE);
  await page.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
  await page.goto('file:///' + BUNDLE.replace(/\\/g, '/'));
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.evaluate(() => window.__nds_i18nStore.getState().setLang('en'));
  await page.waitForTimeout(300);

  // ---------------------------------------------------------------- 0. API
  console.log('0. The single load entry point exists');
  ok(
    'tabs-store exposes loadStudioFile',
    await page.evaluate(
      () => typeof window.__nds_tabsStore.getState().loadStudioFile === 'function',
    ),
  );

  // ---------------------------------------------------------------- 1. SAVE
  console.log('1. Save writes shapes and strokes (Bug A)');
  await page.evaluate(() => window.__nds_diagramStore.getState().loadSample());
  await page.waitForTimeout(200);
  await setShapes(page, SHAPES, STROKES);
  await page.waitForTimeout(150);

  const saved = await saveAndRead(page);
  ok('saved file has a shapes key', Object.hasOwn(saved, 'shapes'), Object.keys(saved));
  ok('saved file has a strokes key', Object.hasOwn(saved, 'strokes'));
  ok('all 4 shapes written', saved.shapes && saved.shapes.length === 4, saved.shapes?.length);
  ok('stroke written', saved.strokes && saved.strokes.length === 1);
  ok('diagram survives alongside', Array.isArray(saved.nodes) && saved.nodes.length > 0);
  ok('shape text is in the bytes', JSON.stringify(saved).includes('PROBE CALLOUT'));

  // ------------------------------------------------------- 2. ROUND-TRIP EQ
  console.log('\n2. Load restores every shape byte-for-byte');
  const rawFile = JSON.stringify(saved);
  const loadRes = await loadFile(page, rawFile);
  ok('loadStudioFile returns ok', loadRes.ok === true, loadRes);
  ok('nothing was dropped', (loadRes.dropped ?? 0) === 0, loadRes.dropped);

  await page.waitForTimeout(200);
  const after = await readShapes(page);
  ok('4 shapes back', after.shapes.length === 4, after.shapes.length);
  ok('1 stroke back', after.strokes.length === 1);

  for (const want of SHAPES) {
    const got = after.shapes.find((s) => s.id === want.id);
    ok(`${want.kind} round-trips deep-equal`, same(got, want), { want, got });
    // Belt and braces: no key may be silently dropped by the schema.
    ok(
      `${want.kind} keeps every key`,
      got && Object.keys(want).every((k) => Object.hasOwn(got, k)),
      got && Object.keys(want).filter((k) => !Object.hasOwn(got, k)),
    );
  }
  ok('stroke round-trips deep-equal', same(after.strokes[0], STROKES[0]), after.strokes[0]);
  // rotation and geom are the fields most likely to be dropped by a schema
  // that was written from the interface without reading it.
  const rt = after.shapes.find((s) => s.id === 'sh-rect');
  ok('rotation survives', rt && rt.rotation === 37, rt && rt.rotation);
  ok('geom survives', rt && rt.geom === 'hexagon', rt && rt.geom);
  const cal = after.shapes.find((s) => s.id === 'sh-callout');
  ok('callout anchor survives', cal && cal.anchor.x === 620 && cal.anchor.y === 330, cal?.anchor);

  // ------------------------------------------------------- 3. STALE CLEARED
  console.log('\n3. Loading a file with no shapes CLEARS the old ones (Bug B)');
  await setShapes(page, [{ ...SHAPES[0], id: 'sh-stale', text: 'BELONGS TO OLD DIAGRAM' }], []);
  await page.waitForTimeout(120);
  const bare = { ...saved };
  delete bare.shapes;
  delete bare.strokes;
  bare.meta = { ...bare.meta, title: 'File with no shapes' };
  const r2 = await loadFile(page, bare);
  ok('bare file loads', r2.ok === true, r2);
  await page.waitForTimeout(200);
  const afterBare = await readShapes(page);
  ok('stale shape is gone', afterBare.shapes.length === 0, afterBare.shapes);
  ok('stale stroke is gone', afterBare.strokes.length === 0);
  ok(
    'the new diagram did load',
    (await page.evaluate(() => window.__nds_diagramStore.getState().diagram.meta.title)) ===
      'File with no shapes',
  );

  // --------------------------------------------------- 4. PRE-v0.9.26 FILE
  console.log('\n4. A file written before v0.9.26 still opens');
  const legacy = {
    version: bare.version,
    meta: { ...bare.meta, title: 'Legacy file' },
    nodes: bare.nodes,
    edges: bare.edges,
    annotations: bare.annotations ?? [],
  };
  const r3 = await loadFile(page, legacy);
  ok('legacy file loads', r3.ok === true, r3);
  await page.waitForTimeout(200);
  ok(
    'legacy nodes are on the canvas',
    (await page.evaluate(() => window.__nds_diagramStore.getState().diagram.nodes.length)) ===
      legacy.nodes.length,
  );

  // ------------------------------------------- 5. UNREADABLE ENTRY IS DROPPED
  console.log('\n5. One unreadable shape must not cost the user the diagram');
  const mixed = {
    ...saved,
    meta: { ...saved.meta, title: 'Mixed file' },
    shapes: [
      SHAPES[0],
      { id: 'sh-future', kind: 'quantum-blob', mystery: true },
      SHAPES[1],
      { id: 'sh-broken', kind: 'rect' }, // right kind, missing every field
    ],
  };
  const r4 = await loadFile(page, mixed);
  ok('mixed file still loads', r4.ok === true, r4);
  ok('2 unreadable entries reported', r4.dropped === 2, r4.dropped);
  await page.waitForTimeout(200);
  const afterMixed = await readShapes(page);
  ok('the 2 readable shapes survived', afterMixed.shapes.length === 2, afterMixed.shapes.length);
  ok(
    'nodes were NOT lost to a bad shape',
    (await page.evaluate(() => window.__nds_diagramStore.getState().diagram.nodes.length)) > 0,
  );

  // ------------------------------------------------ 6. FORWARD-COMPAT FIELDS
  console.log('\n6. Fields v0.9.27-29 will add already round-trip');
  // The node ref has to name a node that is actually IN this file. From
  // v0.9.27 a ref whose target does not exist is pruned on load as dangling,
  // which is the correct behaviour and is asserted in test-shape-binding.
  // Pointing this fixture at a real node is what makes it a persistence test
  // rather than an accidental test of the prune.
  const futureNodeId = saved.nodes[0].id;
  const future = {
    ...saved,
    meta: { ...saved.meta, title: 'Future file' },
    shapes: [
      { ...SHAPES[0], resourceType: 'firewall' },
      {
        ...SHAPES[2],
        fromRef: { kind: 'shape', id: 'sh-rect' },
        toRef: { kind: 'node', id: futureNodeId, anchor: { x: 0.5, y: 1 } },
      },
    ],
  };
  const r5 = await loadFile(page, future);
  ok('future-field file loads with nothing dropped', r5.ok === true && r5.dropped === 0, r5);
  await page.waitForTimeout(200);
  const afterFuture = await readShapes(page);
  const fr = afterFuture.shapes.find((s) => s.id === 'sh-rect');
  const fa = afterFuture.shapes.find((s) => s.id === 'sh-arrow');
  ok('resourceType survives', fr && fr.resourceType === 'firewall', fr && fr.resourceType);
  ok('fromRef survives', fa && fa.fromRef && fa.fromRef.id === 'sh-rect', fa && fa.fromRef);
  ok(
    'toRef anchor survives',
    fa && fa.toRef && fa.toRef.anchor && fa.toRef.anchor.y === 1,
    fa && fa.toRef,
  );

  // ------------------------------------------------ 7. NO SHAPES => NO KEYS
  console.log('\n7. A shape-free diagram writes the same bytes it always did');
  await setShapes(page, [], []);
  await page.waitForTimeout(120);
  const plain = await saveAndRead(page);
  ok('no shapes key when there are none', !Object.hasOwn(plain, 'shapes'), Object.keys(plain));
  ok('no strokes key when there are none', !Object.hasOwn(plain, 'strokes'));
  ok(
    // v0.9.38 — `notes` is the one key written even when empty. Absent has to
    // mean "pre-v0.9.35 file, no opinion" so the loader can decline to wipe
    // the user's write-up; only an explicit "" may clear it. shapes/strokes
    // keep the omit-when-empty rule, which is why they are asserted above.
    'top-level keys unchanged',
    JSON.stringify(Object.keys(plain).sort()) ===
      JSON.stringify(['annotations', 'edges', 'meta', 'nodes', 'notes', 'version']),
    Object.keys(plain).sort(),
  );

  // ------------------------------------------------------ 8. BAD JSON / ERR
  console.log('\n8. Garbage is refused, not half-applied');
  await setShapes(page, [SHAPES[0]], []);
  await page.waitForTimeout(120);
  const r6 = await loadFile(page, '{not json');
  ok('malformed JSON is refused', r6.ok === false && typeof r6.error === 'string', r6);
  const r7 = await loadFile(page, '{"version":99}');
  ok('a non-diagram object is refused', r7.ok === false, r7);
  const afterBad = await readShapes(page);
  ok('a refused load leaves the canvas alone', afterBad.shapes.length === 1, afterBad.shapes.length);

  // --------------------------------------------- 9. REAL LOAD BUTTON WIRING
  // Everything above drives the store. This drives the actual toolbar button
  // through its real onchange handler, because the bug was that Header called
  // loadFromJson (diagram only) instead of loadStudioFile.
  //
  // `loadJsonFile` never appends its <input> to the document, so Playwright's
  // filechooser event never fires. Capture the element as it is created and
  // hand it a real File instead.
  console.log('\n9. The toolbar Load button restores shapes');
  await setShapes(page, [{ ...SHAPES[0], id: 'sh-before', text: 'BELONGS TO OLD DIAGRAM' }], []);
  await page.waitForTimeout(120);

  const onDisk = JSON.stringify({
    ...saved,
    meta: { ...saved.meta, title: 'Opened from disk' },
    shapes: [SHAPES[1], SHAPES[3]],
    strokes: STROKES,
  });

  await page.evaluate(() => {
    window.__nds_lastInput = null;
    const orig = document.createElement.bind(document);
    document.createElement = function (tag, ...rest) {
      const el = orig(tag, ...rest);
      if (String(tag).toLowerCase() === 'input') window.__nds_lastInput = el;
      return el;
    };
  });
  // NOT title*="Load" — that also matches the palette's Load Balancer row.
  await page.click('button[title="Load a diagram from JSON"]');
  const fed = await page.evaluate((raw) => {
    const input = window.__nds_lastInput;
    if (!input || input.type !== 'file') return false;
    const dt = new DataTransfer();
    dt.items.add(new File([raw], 'probe.json', { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
    return true;
  }, onDisk);
  ok('the Load button opened a file input', fed === true);
  await page.waitForTimeout(700);

  const viaButton = await readShapes(page);
  ok(
    'the file opened',
    (await page.evaluate(() => window.__nds_diagramStore.getState().diagram.meta.title)) ===
      'Opened from disk',
  );
  ok('its 2 shapes are on the canvas', viaButton.shapes.length === 2, viaButton.shapes.length);
  ok('its stroke is on the canvas', viaButton.strokes.length === 1);
  ok(
    'the PREVIOUS shape is gone',
    !viaButton.shapes.some((s) => s.id === 'sh-before'),
    viaButton.shapes.map((s) => s.id),
  );
  ok(
    'shapes really render',
    (await page.locator('[data-nds-shape]').count()) >= 2,
    await page.locator('[data-nds-shape]').count(),
  );

  // -------------------------------------------------------- 10. PAGE ERRORS
  console.log('\n10. No page errors');
  ok('zero uncaught page errors', pageErrors.length === 0, pageErrors);

  await browser.close();
  console.log(`\n${pass} passed / ${fail} failed`);
  if (fail) console.log('FAILED:\n  ' + fails.join('\n  '));
  process.exit(fail ? 1 : 0);
})();
