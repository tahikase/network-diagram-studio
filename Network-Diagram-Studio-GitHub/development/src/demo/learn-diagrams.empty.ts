// Prod-build stand-in for `learn-diagrams.generated.ts`.
//
// The generated catalog is ~370 KB of metadata for 631 Microsoft Learn
// diagrams. Every consumer of it is gated on `IS_DEMO`, but that gating alone
// does NOT keep it out of the prod bundle: `favorites-store.ts` builds
// `KNOWN_DIAGRAM_IDS` from the array at module scope, so Rollup can see the
// array is reachable and keeps all 631 entries. Measured cost of leaving it
// in: dist/index.html grew 3,357 KB → 3,728 KB for a feature prod cannot
// reach.
//
// So the prod build swaps this file in via the `stub-learn-diagrams` plugin in
// vite.config.ts. Same module shape, empty data — nothing downstream needs a
// code change, and `LEARN_DIAGRAMS.length` reads 0.
//
// ⚠️ tsc resolves the REAL generated file, not this one, so keep the exported
// shape identical or prod will fail at runtime in a way type-checking cannot
// catch.

export type { LearnDiagram } from './learn-diagrams.generated';
import type { LearnDiagram } from './learn-diagrams.generated';

export const LEARN_DIAGRAM_SERVICES = [] as const;

export const LEARN_DIAGRAMS: LearnDiagram[] = [];
