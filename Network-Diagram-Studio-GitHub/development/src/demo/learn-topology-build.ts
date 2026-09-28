// Build an editable Diagram from a catalogued Microsoft Learn diagram.
//
// The published artwork is a flat PNG or SVG, and we deliberately never mirror
// it (see LICENSE-DIAGRAMS.md). What we can rebuild is the STRUCTURE, because
// every `:::image type="complex":::` doc block carries a screen-reader long
// description that names the frames, what sits inside each one, and which
// lines connect what. `scripts/lib/topology-from-text.mjs` converts that prose
// into nodes and edges at harvest time; this module turns the result into a
// Diagram the studio can open, re-lay out, annotate, and export.
//
// Positions are all (0,0) on purpose — `useDiagramStore.loadDiagram()` runs
// `relayoutForNoOverlap`, exactly as it does for the hand-written templates.

import type { Diagram, DiagramEdge, DiagramNode } from '../model/types';
import type { LearnDiagram } from './learn-diagrams.generated';
import { LEARN_TOPOLOGIES, type LearnTopology } from './learn-topologies.generated';
import { containerSize } from './templates/container-size';

export type { LearnTopology };

export function topologyFor(id: string): LearnTopology | undefined {
  return LEARN_TOPOLOGIES[id];
}

export function hasTopology(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEARN_TOPOLOGIES, id);
}

/**
 * Draft a diagram from a catalog entry, or `undefined` when the entry has no
 * usable topology.
 *
 * The provenance is written into `meta.notes` rather than left implicit. A
 * draft can be exported, mailed to a customer, and read months later by
 * someone who was never told where it came from, so the note has to carry both
 * the link back to the article and — for the `outline` tier — an unambiguous
 * statement that the shape is ours and not Microsoft's.
 */
export function buildLearnDiagram(entry: LearnDiagram): Diagram | undefined {
  const topo = LEARN_TOPOLOGIES[entry.id];
  if (!topo) return undefined;

  const now = new Date().toISOString();
  const nodes: DiagramNode[] = topo.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    parent: n.parent,
    position: { x: 0, y: 0 },
    size: containerSize(n.type),
    data: {
      name: n.name,
      subtitle: n.typeLabel,
      state: 'ok',
      fields: {},
    },
  }));

  const edges: DiagramEdge[] = topo.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    kind: e.kind,
    label: e.label,
  }));

  const provenance =
    topo.fidelity === 'described'
      ? `Rebuilt from the accessibility description Microsoft publishes with this diagram. Check it against the original before relying on it.`
      : `AUTO-GENERATED STARTING POINT — not Microsoft's design. This article publishes only a one-line description of its diagram, so this topology is a generic skeleton for the service, not a reproduction. Compare it with the original and edit freely.`;

  return {
    version: 1,
    meta: {
      title: entry.title,
      caseId: '',
      author: '',
      createdUtc: now,
      updatedUtc: now,
      notes: `${provenance}\n\nSource: ${entry.article}\n${entry.docUrl}\n\nDiagram content © Microsoft, CC BY 4.0.`,
    },
    nodes,
    edges,
    annotations: [],
  };
}
