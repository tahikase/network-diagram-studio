# Network Diagram Studio - main production project

This folder is the authoritative production project. Its editable application,
tests, package assets and release tools are in `development`. The root
`index.html`, launcher and `production_*` folders are the installed application.
Do not patch the bundled HTML or use another project as the source of truth.

The separate `network-diagram-studio` project is for demo/testing. Production
releases must not read, build, synchronize or publish that project unless the
user explicitly requests it. Copying or renaming this whole production folder
must not introduce a dependency on its original location or a sibling folder.

## Changes and publication

- Read `development\README.md` before editing.
- Edit application files in `development\src`, release tools in
  `development\scripts`, and runtime assets/package templates in
  `development\package`. Historical component names such as `src\demo` do not
  make those components demo-only.
- Increment `development\src\version.ts` for every application or release-input
  change. Package tooling, runtime assets and regression tests are sealed too.
- Run checks from `development`. `npm run build` stages a complete candidate
  under `.release`; it never publishes. It uses the included icon sprite.
- Review the staged app and run `npm run release:verify`. Only then run
  `npm run release:publish` to update this project's root application.
- Publication checks the reviewed source and package hashes, refuses concurrent
  installed edits, backs up changed files, verifies the installed app and seals
  the published history. Never bypass the gate or hand-edit its lock.
- Preserve root launch paths, offline assets, licenses, BAT CRLF and versioned
  launcher/readmes. Never upload or modify remote GitHub without permission.
- Do not copy caches, `.release`, `node_modules`, customer data or credentials
  into a source handoff. Recipients install dependencies from the lockfile.

## What's new: new product updates only

This is a mandatory build check, not an optional writing guideline.

1. Classify every version in `development\releases\release-records.json`.
   Use `ui` or `functionality` only for a new product feature or a genuine
   product enhancement, and state its concrete `userImpact`. New capabilities,
   appearance, usability and performance enhancements qualify; restoring
   broken or expected behavior is a bug fix and does NOT qualify.
2. Use `fix` with a `reason` for bug-fix-only releases. Use `internal` with a
   `reason` for source ownership, development tools, packaging, CI, tests,
   documentation or release-policy maintenance. Both still get a version and
   seal, but MUST NOT have a public history entry, translations, images or New
   badge. Do not announce fixes or maintenance merely to satisfy the gate.
3. For product-update `ui`/`functionality` versions only, add a complete entry to
   `development\src\updates\release-history.json`, all seven translations in
   `development\src\i18n\strings-updates.json`, and real reviewed before/after
   PNGs in `development\src\updates\release-images`. Use synthetic diagrams.
   Only New feature, Appearance, Usability and Performance categories are
   allowed. Fix is archive-only. In mixed releases, announce only the new
   product update, not its accompanying fixes. Never relabel a bug fix as a
   feature or enhancement. Preserve genuine older product entries and layout.
4. Review classification and product impact before `npm run release:seal`.
   Preview/build and release gates reject Fix categories, `fix`/`internal`
   entries in What's new, missing product entries, orphan public images and
   archived nonpublic content in bundles. Authors must review the actual
   content; a product category is not permission to announce a bug fix.

The history's Latest version and New badge follow the newest public update,
not the application's build number. Bug-fix-only and internal releases do not
cause an unread badge or replace the latest product announcement.

Removing a previously published entry requires explicit user authorization and
a new version. Preserve its exact entry, translations and images under
`development\releases\archive\<version>` and classify it as `fix` or `internal`,
as appropriate, with `withdrawnIn` identifying the authorized correction release.
The original published hashes remain protected. Never delete or hand-edit the
history lock. Withdrawing an announcement must not undo the application fix.

## Keep the approved What's new presentation

`development\src\updates\UpdatesDialog.tsx` and `updates.css` are the single
renderer/style. Future releases add data, not custom HTML/CSS.

- Keep the window centered, at most 960 x 760 pixels and 80% viewport height,
  with its existing small-screen adaptation.
- Keep fixed header/footer, newest-first scrolling, version selection,
  before/after pairs, image enlargement, all eight languages and light/dark UI.
- Preserve keyboard focus and the quiet unread badge. Never auto-open history.
- History must not change diagram content, selection, viewport, tabs, undo or
  Save JSON. Keep editing shortcuts out of open dialogs.
- Change presentation only when the user requests a design change.
