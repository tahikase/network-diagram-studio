// Prod-build stand-in for `learn-topologies.generated.ts`.
//
// Same reasoning as `learn-diagrams.empty.ts`: the topologies are demo-only,
// but being demo-only is not enough to keep them out of the prod bundle, so
// the `stub-learn-diagrams` plugin in vite.config.ts swaps this file in.
//
// ⚠️ tsc resolves the REAL generated file, not this one, so keep the exported
// shape identical or prod will fail at runtime in a way type-checking cannot
// catch.

export type {
  LearnTopology,
  LearnTopologyEdge,
  LearnTopologyNode,
} from './learn-topologies.generated';
import type { LearnTopology } from './learn-topologies.generated';

export const LEARN_TOPOLOGIES: Record<string, LearnTopology> = {};
