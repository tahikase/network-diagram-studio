# Production development

The parent folder is the main production project. Follow its `AGENTS.md`.
Maintain that generated instruction file through `package\AGENTS.md`.
This project is independent of the separate demo/testing project.

Read `README.md` for setup, preview, review and publication. Normal builds use
the committed/generated icon sprite; an external Azure icon folder is not
required. Never share dependencies through a junction or a sibling folder.

`src\demo` is a historical UI directory name, not a demo-only feature gate.
Keep native runtime namespace adaptation in `scripts\patch-sidecars.mjs` and
`vite.config.ts` consistent. The dev server loads the same local production
sidecars as the packaged app, before application initialization.

Every sealed-input change needs a version bump and a classification in
`releases\release-records.json`. What's new is strictly for new product features
and genuine product enhancements, not bug fixes. Use `ui` or `functionality`
only for those product updates, with concrete `userImpact`, a localized entry
and reviewed images. Classify bug-fix-only releases as `fix` with a `reason`;
use `internal` for maintenance. Neither may create a public entry, translations,
images or New badge. Mixed releases describe only the new product update.
Never relabel a bug fix as a feature, usability or performance enhancement.
The build rejects public Fix categories and nonpublic classifications.
Keep genuine older product history and the shared dialog style unchanged.
Authorized withdrawals retain their original sealed content in `releases\archive`.
`build` stages only; `release:verify` accepts that exact candidate;
`release:publish` verifies and updates only the parent production package.
