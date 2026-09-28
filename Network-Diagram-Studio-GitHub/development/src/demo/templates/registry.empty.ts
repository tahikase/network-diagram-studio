// Prod-build stand-in for `templates/registry.ts`.
//
// The real registry is ~2,500 lines describing 78 starter topologies. Every
// consumer of it is gated on `IS_DEMO`, but that gating alone does NOT keep it
// out of the prod bundle: `TEMPLATES` is walked at module scope (the
// `TEMPLATE_SOURCES` fixup near the bottom of the file), so Rollup can see the
// array is reachable and keeps all 78 entries plus their node/edge payloads.
//
// So the prod build swaps this file in via the `stub-demo-catalogs` plugin in
// vite.config.ts. Same module shape, empty data — nothing downstream needs a
// code change, and `TEMPLATES.length` reads 0.
//
// ⚠️ tsc resolves the REAL registry, not this one, so keep the exported shape
// identical or prod will fail at runtime in a way type-checking cannot catch.

export type { Template } from './registry';
import type { Template } from './registry';

// Typed as a plain readonly string[] rather than `[] as const`: DemoPalette
// narrows a category with `(typeof TEMPLATE_CATEGORIES)[number]`, which would
// collapse to `never` against an empty const tuple.
export const TEMPLATE_CATEGORIES: readonly string[] = [];

export const TEMPLATES: Template[] = [];

export function searchTemplates(_query: string): Template[] {
  return [];
}
