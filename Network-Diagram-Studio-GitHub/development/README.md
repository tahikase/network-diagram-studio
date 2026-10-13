# Production development

This is the editable source of the parent **main production project**.
It does not require or update the separate demo/testing project. The parent
folder can be copied or renamed; all build and publication paths are relative
to this project. Opening the installed app still requires no development tools.

## Setup and preview

Install Node.js 22.12 or later. From this `development` folder:

```powershell
npm ci
npx playwright install chromium
npm run dev
```

Open the loopback URL printed by Vite. The preview includes the production
sidecars, artwork, vendor icons, capture hooks and feedback controls. It does
not replace the installed parent `index.html`. Internet is needed to install
dependencies/browsers; the packaged editor continues to work offline.

## Maintained files

| Location | Purpose |
| --- | --- |
| `src` | Editable React/TypeScript application, icons, localization and history |
| `package` | Editable runtime sidecars, walkthrough, launcher, notices and root documentation templates |
| `scripts` | Standalone build, release validation, publication and optional icon authoring |
| `releases` | Required release classifications and development-only archives of authorized withdrawals; never bundled into the app |
| `test-*.cjs` | Release and browser regression checks |
| `src\version.ts` | Single application version |
| `.release` | Local candidates, test logs, acceptance records and publication backups; do not share |

The `src\demo` name is historical: these are production UI components too.
Normal builds use `src\icons\icon-sprite.svg` and `manifest.ts`, which are
included. To deliberately regenerate icons, obtain the licensed Azure V24
Icons directory and run `npm run build:icons -- "C:\path\to\Icons"`. That is an
explicit source change requiring review; it is never part of a normal build.

Edit `package` rather than generated root files. The launcher and both readme
templates use `{{VERSION}}`, filled from `src\version.ts` during the build.
The publisher preserves BAT CRLF, launch paths and unchanged asset bytes.

## Shape geometry and text

Resource names, including group headers, wrap without an ellipsis or a line
limit. Unbroken identifiers wrap within the available width. Group property
chips stay to the right of the name and wrap within that area when necessary;
notes and layout clearance use
the same header measurements. Double-click renaming and stored names are unchanged.

The Shapes catalogue has 24 tiles. Database is the last tile, after the brick
wall. Its native `kind: 'rect', geom: 'database'` uses a closed cylinder outline
and separate stroke-only tier seams, shared by the thumbnail and canvas.
The older `cylinder` geometry and its saved dimensions remain unchanged.

Connected shapes remain selectable from their interiors after arrow edits.
React Flow's invisible `shapeAnchor` nodes exist only for edge routing.
ShapeOverlay accepts resource boxes only for authoritative `diagram.nodes`
IDs, so rounded helper measurements cannot cut selection holes or overwrite
native shape binding geometry. Keep real-resource click-through holes and
the invisible routing adapters themselves intact.

All rect-backed shapes, including Actor, open geometry and pasted images,
use a full-box native SVG hit target independently of their visible artwork.
Nested selection tests the actual SVG hit regions, including rotated bodies
and curved arrows, rather than treating an arrow's empty bounding box as ink.
Resource holes use intersected clips so overlapping holes never cancel out;
rotated shapes transform those holes into their local coordinates. Connection
targets shrink with small shapes to leave a draggable centre.

Right-click opens the object picker when an object is under the pointer.
An explicit choice temporarily prioritizes its native hit target and selection
without rewriting shape/node order, parenting, geometry or undo history.
Changing selection, tool or tab clears that preference. Keep native body drags,
container cargo, Ctrl/Cmd frame-only dragging and right-button panning intact.
The picker also reaches completely covered connectors for editing.

Shape text uses the same paragraph layout for editing, rendering, fitting and
caption hit regions. Optional formatting fields preserve centered legacy text.
Indent is 0-8 steps of 1.5 em; paragraph spacing is 0-48 pixels at the chosen
font size and scales with fitted text. Line spacing is 1-3, default 1.25.
Each explicit newline starts a paragraph; automatic wrapping does not.
Formatting applies to all text in a shape, never only its selected characters.
The shared `SHAPE_TEXT_SIZES` list supplies both shape-text size selectors,
including 48, 56, 64, 72, 96 and 128px. Keep default sizes and existing
auto-fitting unchanged; imported non-preset sizes remain valid and selected.
The inline size control accommodates three-digit values without truncation.
Enter and Shift+Enter insert a paragraph without committing the draft.
Ctrl/Cmd+Enter or clicking outside finishes editing; Escape cancels text edits.
Single-line resource names, group properties and spacing inputs keep their
existing Enter behavior.

## ARM import help

Import ARM opens a compact, single-column instructions dialog. Step 5 reads
`template.json` in every language. Only Choose template.json opens the native
file picker; cancelling file selection leaves the instructions open.
A highlighted selection panel provides
a larger Choose template.json button, folder icon, localized guidance and
an announced filename status. It supports all eight languages, narrow screens
and both themes. The ARM demo and its packaged media have been removed at the
user's request; the import engine and the other dialog text are unchanged.

## Release workflow

1. Bump `src\version.ts` and prepend a dated classification to
   `releases\release-records.json`. Choose `ui` or `functionality` and describe
   the concrete `userImpact` only for a new product feature or genuine product
   enhancement. Restoring broken or expected behavior is a bug fix, not a
   product update: choose `fix` with a `reason` for bug-fix-only releases.
   Choose `internal` with a `reason` for
   development, packaging, CI, test, documentation or release-policy maintenance.
2. Only product-update `ui`/`functionality` releases get an entry in
   `src\updates\release-history.json`, all seven translations in
   `src\i18n\strings-updates.json` and real reviewed before/after PNGs in
   `src\updates\release-images`. Use synthetic diagrams, never customer data.
   Only New feature, Appearance, Usability and Performance categories are
   permitted. Fix is archive-only. Bug-fix and internal releases need none of
   these public artifacts and must not appear in What's new. Mixed releases
   describe only the new product update, never accompanying fixes. Do not
   relabel a bug fix as a feature or enhancement to pass the gate.
3. Keep the common `UpdatesDialog.tsx` / `updates.css` presentation and genuine
   older product entries. Do not add per-release styles or manufacture an
   announcement for fixes or internal work. Content and product impact require review.
4. Run the following from this folder:

```powershell
npm run typecheck
npm run lint
npm run release:seal
npm run build
```

The build checks the seal before producing output, stages the full package in
`.release\builds\<id>\package`, and prints its `index.html` path. **It never
changes the installed app.** Open and review that candidate, then run:

```powershell
npm run release:verify
npm run release:publish
```

The audience check is enforced by Vite and the release validator: missing or
unknown classifications, blank product impact, public Fix categories, public
entries classified as `fix` or `internal`, missing product entries and nonpublic
PNGs in the public image folder are errors. Bundle checks reject archived
nonpublic copy/images. Categories enforce the declared policy, not the meaning
of prose; authors must never disguise a bug fix as a product enhancement.
The application's version may be newer than the latest public history entry.
The dialog header, version selector and New badge follow product updates only;
bug-fix-only and internal builds do not create a badge.

At startup, an unread product update previews the existing What's new dialog
once per browser for five visible seconds. Clicking, scrolling or using the
keyboard keeps it open until dismissed; hidden-tab time does not count.
Manual viewing has no timer. Preference-storage errors are reported, and
another open dialog is never interrupted. Diagram data and editing state are
unchanged by the preview.

If the user explicitly authorizes withdrawing a previously published bug-fix or internal
announcement, preserve its original `entry.json`, `strings.json` and PNGs under
`releases\archive\<version>`. Change its classification to `fix` or `internal`,
as appropriate, and record `withdrawnIn` as the new correction version. Remove
its public entry and unshared translations/images, not the application fix.
Original entry/image hashes remain sealed; never edit the lock or silently
remove a genuine product update.

`release:verify` runs release-history, runtime, launcher, offline app, history,
All Icons, Settings, group header editing, shape text formatting, Database shapes,
connected-shape and overlapping-object selection, tab order, transparent controls, Save/Load JSON, screenshot,
walkthrough and canvas-motion checks. Logs and `accepted.json` stay beside the
candidate. The individual `test:*` commands normally target the installed app;
most test files also accept an explicit entry HTML argument.

`release:publish` accepts only that exact verified candidate and source. It
refuses installed files changed since the build, backs up changed files, updates
the parent package, checks the installed app, and advances the release lock.
Failure restores only files still matching this publication's own writes;
concurrent edits are retained and reported. Backup/report files remain under
the candidate directory. Do not delete those records until the release is
accepted.

If an unpublished input changes, review it, re-seal, rebuild and re-verify.
Published source, entries and images cannot be silently re-sealed under the
same version. A new version is required. Never edit the lock to bypass this.
If `.release\operation.lock` survives an interrupted process, inspect its PID
and confirm that process has stopped before deleting just that lock.

## Sharing or moving the project

Copy the whole parent project, including this folder, `package`, `releases`, the source,
lockfile, tests, notices and license files. Exclude `node_modules`, `.release`
and temporary test artifacts. On the recipient's computer, run the setup
commands above. No machine-specific path, original folder name, original Azure
icon download, original source tree or sibling demo is needed for a normal
build. Runtime-only recipients can omit `development`; they can run the app
but do not have its editable source or release gates.

Production and demo versions may differ. Never synchronize the demo or publish
to a remote repository unless the user explicitly requests it.
