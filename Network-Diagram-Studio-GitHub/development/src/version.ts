/**
 * Single source of truth for the build number shown in the UI.
 *
 * Bump this on EVERY change, without being asked — a colleague reporting a
 * problem reads their version off the palette footer and we both need to know
 * which bundle they are actually running. `package.json` is left at 0.0.0
 * deliberately: this app is never published to a registry, and a second number
 * that nobody remembers to bump is worse than no number.
 *
 *   0.9.59  in-app Guide + version readout
 *   0.9.60  keyboard shortcuts became collapsible groups
 *   0.9.61  Settings restyled — one header and one card style per section
 *   0.9.62  theme-aware paper behind shape text (callouts were white-on-white
 *           in the dark theme); automated light/dark contrast audit
 *   0.9.63  multi-select is real again (Shift+click / marquee hold more than
 *           one node or edge, and Delete removes all of them as one undo
 *           frame); edge labels get their own A- / A+ text size
 *   0.9.64  text colour in the Notes — five meaning colours from the app
 *           palette, stored in the Markdown as an inline colour span
 *   0.9.65  comments on a highlighted run of a note — select text, attach a
 *           thread, reply and resolve; a self-declared name in Settings signs
 *           them. The anchor is DOM-only, so the note's Markdown is unchanged
 *           and builds that predate this feature still read the file
 *   0.9.66  screenshots in the Notes — the Screenshot button beside PNG/SVG
 *           drags a region out of the diagram and drops it into the note, and
 *           an image on the clipboard can be pasted straight in. The note
 *           carries only `![caption](nds-img:id)`; the bytes travel in the
 *           .json and are kept in IndexedDB for reload. NON-PROD ONLY for now
 *   0.9.67  the screenshot annotation editor — after a region is captured it
 *           opens with arrow, box, highlighter, text, step numbers, pixelate
 *           and crop, plus undo/redo, copy to clipboard and save as .png.
 *           Shapes are stored as data and stay editable (double-click a
 *           picture in a note to reopen it); pixelate and crop are burned into
 *           the bitmap so a redaction cannot be undone by a reader.
 *           NON-PROD ONLY for now
 *   0.9.68  releasing the capture region opens the editor straight away. The
 *           confirm step and the resize handles are gone: overshooting is
 *           repaired by the crop tool one screen later, so the extra click
 *           bought nothing. NON-PROD ONLY.
 *   0.9.69  the editor stops being write-once: every shape has resize handles
 *           and a callout's tail can be dragged to whatever it points at.
 *           Three new tools — ellipse, callout (a speech bubble that holds its
 *           own text) and spotlight (dims everything except one box). Single
 *           key picks a tool (V A R E C N T H S P X) and Shift constrains:
 *           45° arrows, circles, squares. NON-PROD ONLY.
 *   0.9.70  the Guide learned about the Notes — a fourth group covering
 *           comments, screenshots, annotating and what Pixelate/Crop really
 *           do, plus a Screenshot-editor group in the shortcut reference.
 *           The screenshot entries are gated on NOTES_IMAGES so production
 *           never advertises a button it does not have; the comments entry is
 *           not, and reaches production on its next build. Also fixed
 *           check-coverage.cjs, which never read strings-guide.ts and so
 *           reported every translated Guide key as missing
 *   0.9.71  the screenshot editor starts on size S, every time. It was M, and
 *           the choice persisted between captures — an L arrow drawn on a
 *           small crop covers the thing it points at. Size and colour buttons
 *           also became real radios; they sat in a role="radiogroup" that told
 *           a screen reader nothing
 *   0.9.72  the capture hint chip stayed readable in dark mode, and the
 *           Spotlight tool was removed. The theme remaps the whole slate
 *           scale for dark mode but leaves `text-white` alone, so
 *           `bg-slate-900 text-white` turned white-on-white the moment the
 *           theme flipped; the three screenshot chips now use a literal
 *           PLATE colour that opts out of the theme entirely. Spotlight is
 *           gone from the toolbar, the model, the schema, the Guide and the
 *           shortcut reference — a .json saved earlier with a spotlight loads
 *           fine, but that one shape is dropped. NON-PROD ONLY.
 *   0.9.73  Notes screenshots promoted to production. NOTES_IMAGES was
 *           IS_DEMO while the feature was trialled in non-prod; it is now
 *           `true`, so both bundles are the same program again and
 *           test-build-parity passes its size check. Production gains the
 *           Screenshot button, the region selector, the annotation editor and
 *           the <img> branch of the notes serialiser — and the Guide entries
 *           that were gated on the same flag. Also fixed the missing-picture
 *           placeholder, which the promotion would otherwise have shipped:
 *           its "1x1 transparent PNG" was really a half-opaque GREEN pixel,
 *           `width:100%` on a 1x1 made it a full-width square that swallowed
 *           the note, and a src that loads suppresses alt text, so the
 *           caption never rendered. Dropping the src fixes all three.
 *   0.9.74  the uppercase TYPE caption is gone from container headers. A box
 *           drawn as a container, wearing a VNet icon and a CIDR chip, has
 *           already said it is a VNet; "VIRTUAL NETWORK" spelled next to the
 *           name was ink spent on a fact the reader had. The header is now
 *           icon + name + field chips. Two things went with it: the
 *           double-click-the-caption shortcut for changing a container's type
 *           (the Property Panel's "Resource type" dropdown still does it),
 *           and the width groupHeaderWidth reserved for that text — left in,
 *           it would have sized every container for a label it no longer
 *           draws. Resource CARDS keep their type caption. NON-PROD ONLY.
 *   0.9.75  a third build, for people outside Microsoft:
 *           `npm run build:public` writes ../net-diag-studio/
 *           net-diag-studio.html. It is the same program as the other two —
 *           the app makes no network calls, so nothing in it needed a
 *           corporate account to begin with — except for the one control that
 *           did: Settings > Share your feedback opened a Microsoft Forms
 *           survey, which an external reader meets as a sign-in page. Under
 *           `IS_PUBLIC` that becomes a mailto, and the anchor drops
 *           target="_blank", which on a mailto leaves a blank tab over the
 *           diagram. No DEMO badge, plain title, blue favicon.
 *   0.9.76  refreshed the GitHub and Hackathon distributions as public-only
 *           packages. They now use the standalone public build and no longer
 *           ship demo/non-production launchers, assets, labels, or runtime
 *           identifiers.
 *   0.9.77  restored the complete frozen production runtime to the GitHub and
 *           Hackathon packages. The standalone Vite public bundle omitted the
 *           production ARM, walkthrough, editor and vendor sidecars, including
 *           the Line/Arrow and Straight/Bent connection controls.
 *   0.9.78  GitHub distribution feedback email now CCs Ryuji Iwasa.
 *   0.9.79  GitHub distribution feedback now opens the public Formbricks
 *           survey for internal and external users.
 *   0.9.80  the palette is ordered by what gets used, and Shapes stops
 *           shipping the same six pictures four times. NON-PROD ONLY.
 *           Sections run Favorites → Resources → Shapes → All icons: the
 *           two curated sets come before the 836-icon fallback, in the
 *           accordion, in the collapsed rail and in global search results,
 *           which had three different answers between them.
 *           `CATEGORIES_ORDER` leads with Azure's own building blocks and
 *           moves the two big specialist sets (On-premises 77, Microsoft 365
 *           40) below them — Compute was 2,308 px down the scroller and is
 *           now 804. Networking's 30 entries were re-ranked so NSG, Route
 *           Table, Azure Firewall, Load Balancer, Application Gateway,
 *           Public IP, Network Interface and Private Endpoint come first.
 *           Shape groups lead with Arrows / Lines and Rectangles; Text box
 *           moved third in Rectangles; arrow styles read straight, elbow,
 *           line, dashed, double, curved.
 *           Arrow DIRECTION became a four-way control instead of four tiles
 *           per style: 24 arrow tiles became 6, so the section draws 106
 *           tiles rather than 124. The other 18 presets are NOT deleted —
 *           their variant ids are persisted in favourites and in saved
 *           .json, so `findPreset` still resolves every one of them.
 *           Shapes also gained the filter and count every other section
 *           already had, and Resources and Favorites lost their nested
 *           `max-h-[380px]` scrollboxes, which trapped the wheel inside a
 *           380-px window in the middle of the palette's own scroller.
 *           No telemetry exists in this app, so the ranking is a reasoned
 *           default; Favorites remains the per-user correction.
 *           The eight new strings ship in all seven dictionaries. Four of
 *           them reach t() dynamically as t(DIR_LABEL[d]), which
 *           check-coverage.cjs cannot see — test-language.cjs caught them
 *           rendering as raw English in every locale.
 *           Also fixed test-shapes.cjs, which pointed at the intermediate
 *           dist-demo/index.demo.html the build deletes, so it had not been
 *           able to run at all; it was the last file still using that path.
 *   0.9.81  the build now re-applies the sidecar wiring it used to destroy.
 *           Neither entry template carries the `production_*` /
 *           `non_production_*` script and stylesheet tags: they had been
 *           added to `dist/*.html` by hand, so every `vite build` silently
 *           shipped an entry HTML with zero sidecars. That is not a missing
 *           decoration. `appearance.js` defines `window.ndsLeafAppearance`,
 *           which canvas layout consults in ~15 places, so without it every
 *           leaf node reverted from the 274x70 row card to the old 250x137
 *           card with the 2 px green ring — and ARM import, capture,
 *           captions, notes layout, history, the vendor catalog and feedback
 *           were absent too. Rebuilding non-prod for 0.9.80 is what stripped
 *           them. `scripts/patch-sidecars.mjs` now owns that step for both
 *           builds, from one manifest so the two cannot drift, and refuses
 *           to write if any referenced sidecar is missing from dist/.
 *           Three hooks the sidecars need had also only ever existed in the
 *           pinned page, so they are now in source: `leafFootprint`
 *           delegates to the sidecar's measured `footprint` (it is the one
 *           leaf size in the app, so renderer, packer, size-match and the
 *           resizer all follow), `AzureNode` carries `nds-leaf-row` and the
 *           three CSS variables, and its type caption carries
 *           `nds-type-caption` — without that marker the row skin drew the
 *           caption at the name's 19px and it wrapped. The header brand mark
 *           is the supplied nds-logo.svg from the sidecar folder again,
 *           falling back to the drawn letter tile when it cannot load, so
 *           `npm run dev` and a bundle mailed without its folder still work.
 *           All of it is optional: with no sidecar the built-in centred card
 *           renders exactly as before.
 *           STILL PINNED-PAGE ONLY, not yet in source: the vendor palette
 *           (15 AWS/OCI/Kubernetes icons) and the text dock's C/V tool
 *           shortcuts. test-build-parity.cjs reports those, plus the
 *           deliberate 0.9.80 palette difference, until prod is rebuilt.
 */
// 0.9.82 restores the frozen production runtime's native extension bridges:
// connectors, captions, vendor icons, clipboard/images, capture, resource IDs,
// content fitting, notes resizing, container stacking, help and C/V shortcuts.
// The approved palette changes remain non-production-only; prod is not rebuilt.
// 0.9.83 restores red non-production branding without changing the N geometry
// or editor behavior. Production keeps its blue artwork and is not rebuilt.
// 0.9.84 makes arrow direction control the preview, label, drag payload,
// click-to-add and Favorites together, using the existing directional presets.
// 0.9.85 orders Favorites, Shapes, Resources, All icons and curates creation
// to six arrow styles plus the 21 requested networking shapes. Search and
// Favorites use the same catalogue; legacy diagram geometry stays supported.
// 0.9.86 merges the Shapes subgroups into one 27-tile grid. The labeled
// direction control affects only line/arrow styles, never block arrows.
// 0.9.87 removes the Palette direction selector and duplicate block-arrow
// designs. Seven arrow designs and the plain line use right-facing defaults;
// the existing canvas rotation handles set individual orientations.
// 0.9.88 adds the non-production imported-icon library and portable artwork.
// 0.9.89 places plain leaf icons above readable centered labels in non-prod;
// duplicate type captions are hidden without changing artwork or saved data.
// 0.9.90 makes the non-production Import Icons label larger and bold.
// 0.9.91 gives Import Icons a prominent full-width action above the version.
// 0.9.92 balances the Import Icons action at 16px bold text and 44px height.
// 0.9.93 adds folder-import previews and portable icon-library backup/restore.
// 0.9.94 quiets import feedback and gives new PNG nodes a larger image box.
// 0.9.95 adds folder-aware, typed confirmation for clearing the icon library.
// 0.9.96 adds non-prod placement previews, position guides and header ordering.
// 0.9.97 retires the non-prod elbow-arrow tile without removing saved arrows.
// 0.9.98 adds an isolated, read-only Issue Analysis preview in future-testing.
// 0.9.99 adds saved, accessible drag-and-drop ordering of non-prod palette sections.
// 0.9.100 keeps the normal palette-header cursor until a reorder drag starts.
// 0.9.101 adds launcher-backed, read-only Azure collection to the isolated Issue Analysis preview.
// 0.9.102 restores the Text box tile to the non-production Shapes palette.
// 0.9.103 promotes the approved palette, imported icons and canvas UI to production.
// 0.9.104 adds the non-blocking icon rights reminder to both current builds.
// 0.9.105 moves the rights warning to file/folder import confirmation.
// 0.9.106 refreshes both current editions with a three-minute UI walkthrough.
// 0.9.107 lets imported resources and nested groups move beyond their frame borders.
// 0.9.108 keeps connectors selectable inside groups without covering resource cards.
// 0.9.109 restores Microsoft Forms feedback in both current editions.
// 0.9.110 lets overlapping resources be selected through transparent card space.
// 0.9.111 includes diagram shapes and pencil strokes in region screenshots.
// 0.9.112 reduces canvas-motion redraws and unrelated toolbar/Notes layout work.
// 0.9.113 adds saved diagram-tab reordering with drag/drop and keyboard support.
// 0.9.114 adds approved translucent canvas controls without fading text or icons.
// 0.9.115 adds centered release history and enforces complete versioned update entries.
// 0.9.116 lets All Icons use the full palette scroll area without a capped-height gap.
// 0.9.117 keeps Settings inside the drawing surface, above the diagram tabs.
// 0.9.118 makes the main production project independently editable and releasable.
// 0.9.119 enforces user-facing-only release communication without announcing maintenance work.
// 0.9.120 makes group header property values editable by double-clicking.
// 0.9.121 adds whole-shape text alignment, indentation and paragraph spacing.
// 0.9.122 makes Enter insert shape text paragraphs; Ctrl/Cmd+Enter finishes editing.
// 0.9.123 adds the editable tiered Database shape after the brick wall.
// 0.9.124 adds 48-128px shape text presets without changing existing auto-fit.
export const APP_VERSION = '0.9.136';
