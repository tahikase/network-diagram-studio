// Build-time flags.
//
// `IS_DEMO` is **build identity only** — it marks the non-prod bundle so you
// can tell the two files apart at a glance (the red DEMO badge in the header,
// plus the title and favicon set in index.demo.html). It must NOT be used to
// switch features on or off.
//
// v0.9.56: the non-prod build is now *the prod app with a demo mark on it*.
// It used to carry an extra Learn-diagrams palette section, an extra rail
// button, learn hits in palette search, and a floating edge-style toolbar, so
// "test it in non-prod, ship it in prod" was never testing the same program.
// Every one of those gates moved to `DEMO_FEATURES` below.
export const IS_DEMO = import.meta.env.MODE === 'demo';

// v0.9.75 — `IS_PUBLIC` marks the build handed to people OUTSIDE Microsoft
// (`npm run build:public` → ../net-diag-studio/net-diag-studio.html).
//
// Like `IS_DEMO` this is build identity. Since v0.9.109 every build shares
// the original Microsoft Forms feedback link. The editor itself needs no
// account or network connection. The rule that `IS_DEMO` must not
// gate features applies here too: if a future feature genuinely cannot ship
// outside the company, give it its own named flag rather than piling onto
// this one, or the public build stops being the same program as the other
// two and nothing tested here proves anything about what a reader downloads.
export const IS_PUBLIC = import.meta.env.MODE === 'public';

// In-progress features that ship in NEITHER build. This is a hard `false`, so
// Rollup drops the guarded branches (and anything only they reach) from both
// bundles — that is what keeps the two files the same size.
//
// Flip it to `IS_DEMO` to bring the non-prod build's extras back, but expect
// the two bundles to diverge again the moment you do, and expect
// `test-build-parity.cjs` to fail.
export const DEMO_FEATURES = false;

// Approved for production in v0.9.103. Keep the retired demo extras disabled.
export const IMPORTED_ICONS = true;
export const CANVAS_PLACEMENT_FEEDBACK = true;
export const PALETTE_SECTION_REORDER = true;

// v0.9.65 — Notes comments: highlight text in a note, attach a thread to it.
//
// SCOPED SEPARATELY FROM `DEMO_FEATURES` ON PURPOSE. That flag is the switch
// for the RETIRED extras (the Learn-diagrams palette section, the rail button,
// learn hits in palette search, the floating edge-style toolbar). Wiring this
// feature to it would drag all of those back in at the same time, which is
// precisely the "the two builds are not the same program" problem v0.9.56 was
// spent removing.
//
// It was `IS_DEMO` while the feature was being trialled in the non-prod
// bundle. It is now `true`: the feature ships in BOTH builds, so the two
// bundles are the same program again and `test-build-parity.cjs` passes.
//
// Kept as a named constant rather than deleted, because it is the one switch
// that takes the whole feature back out — set it to `false` and Rollup drops
// the comment UI, the anchoring module and the Settings name field from both
// files. The stored data is unaffected either way: comments live under their
// own key in the .json, and a build without this feature ignores that key
// rather than destroying it.
export const NOTES_COMMENTS = true;

// v0.9.66 — Notes screenshots: capture a region of the diagram (or paste one
// from the clipboard) and drop it into a note, with an annotation editor.
//
// It was `IS_DEMO` while the feature was being trialled in the non-prod
// bundle, exactly as NOTES_COMMENTS was above. It is now `true`: the feature
// ships in BOTH builds, so the two bundles are the same program again and
// `test-build-parity.cjs` passes its size check.
//
// Flipping this to `false` removes the whole feature — the header button, the
// region selector, the annotation editor, the image store and the `<img>`
// branch of the notes serialiser — without touching stored data. A note keeps
// its `![caption](nds-img:id)` reference as plain text and the bytes stay in
// the file's `images` array, so turning the flag back on restores the
// pictures.
export const NOTES_IMAGES = true;
