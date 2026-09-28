/**
 * Edge endpoints — v0.9.29.
 *
 * Before this version an edge could only join two `DiagramNode`s, so the
 * whole app was free to assume `nodesById.get(edge.source)` returns
 * something. Shapes are now connectable too, which means an endpoint id may
 * resolve to a **shape** instead — and every consumer that renders,
 * narrates, exports or prunes an edge has to agree on what that means.
 *
 * This module is that agreement. It is pure (no React, no store) so the
 * canvas, Story Mode, the exporters and the stores can all share it.
 *
 * ## Why a shape endpoint is safe to add
 *
 * Shape ids and node ids have never been able to collide — shapes are minted
 * as `sh-…` by `makeShapeId()` while diagram ids come from `newId()` — so a
 * single flat index over both is unambiguous, exactly as `buildBindTargets`
 * already does for arrow binding.
 *
 * ## Rotation is deliberately ignored
 *
 * An endpoint box is the shape's **unrotated axis-aligned box**. React Flow
 * routes edges between axis-aligned rectangles and has no concept of a
 * rotated node, so honouring rotation here would move the anchor a few
 * pixels off the drawn outline while breaking nothing else. `targetFromShape`
 * makes the same trade for `geom` variants (a diamond binds to its bounding
 * box), and keeping the two consistent matters more than the pixels.
 */
import type { Shape } from '../demo/tabs-store';
import { targetFromShape } from '../demo/shape-binding';
import type { DiagramNode } from './types';
import { getResourceType } from './resource-types';
import type { BBox } from './containment';

/** An axis-aligned box an edge can attach to, plus what to call it. */
export interface EndpointBox {
  id: string;
  /** Human-readable label used by Story Mode and the text exporters. */
  name: string;
  /** Top-left in flow/world coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** `false` for a `DiagramNode`, `true` for an annotation shape. */
  isShape: boolean;
  /** Resource slug for a node; `undefined` for a shape. */
  typeSlug?: string;
}

export type EndpointIndex = Map<string, EndpointBox>;

/**
 * What to call a shape that an edge lands on.
 *
 * A shape's only human-authored text is its label, so that is the name. When
 * it has none we fall back to the geometry's own name (`Diamond`, `Cloud`, …)
 * rather than a bare "Shape", because a Story Mode sentence reading "traffic
 * flows from Cloud to Firewall" is still useful whereas "from Shape to
 * Shape" is not.
 */
export function shapeEndpointName(shape: Shape): string {
  const text = 'text' in shape ? shape.text : undefined;
  const firstLine = text?.split('\n')[0]?.trim();
  if (firstLine) return firstLine;
  if (shape.kind === 'rect' && shape.geom) return humaniseGeom(shape.geom);
  return shape.kind === 'ellipse' ? 'Ellipse' : 'Box';
}

/** `block-arrow` → `Block arrow`. Geometry ids are kebab-case by convention. */
function humaniseGeom(geom: string): string {
  const words = geom.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Box';
}

/**
 * The endpoint box for a shape, or `null` when the shape cannot be an
 * endpoint at all.
 *
 * Connectability is delegated to `targetFromShape` — the same predicate that
 * decides what an arrow may bind to — so a shape can never be connectable by
 * one gesture and not the other. Arrows and callouts return `null`.
 */
export function shapeEndpointBox(shape: Shape): EndpointBox | null {
  const t = targetFromShape(shape);
  if (!t) return null;
  return {
    id: t.id,
    name: shapeEndpointName(shape),
    x: t.cx - t.hw,
    y: t.cy - t.hh,
    w: t.hw * 2,
    h: t.hh * 2,
    isShape: true,
  };
}

/** True when this shape can sit at the end of an edge. */
export function isConnectableShape(shape: Shape): boolean {
  return targetFromShape(shape) !== null;
}

/**
 * Absolute (root-space) box for a diagram node, unwinding any parent chain.
 *
 * A child node's `position` is relative to its parent, so a nested node's
 * true position is the sum of the chain. The `guard` set makes a corrupt
 * file with a parent cycle fail as a wrong position rather than a hang.
 */
function nodeEndpointBox(
  n: DiagramNode,
  byId: Map<string, DiagramNode>,
): EndpointBox {
  let x = n.position.x;
  let y = n.position.y;
  let cur = n;
  const guard = new Set<string>([n.id]);
  while (cur.parent && !guard.has(cur.parent)) {
    guard.add(cur.parent);
    const p = byId.get(cur.parent);
    if (!p) break;
    x += p.position.x;
    y += p.position.y;
    cur = p;
  }
  const rt = getResourceType(n.type);
  return {
    id: n.id,
    name: n.data.name,
    x,
    y,
    w: n.size?.w ?? (rt.isGroup ? 320 : 180),
    h: n.size?.h ?? (rt.isGroup ? 220 : 150),
    isShape: false,
    typeSlug: n.type,
  };
}

/**
 * Index every id an edge is allowed to point at.
 *
 * Pass `shapes: []` (or omit it) to get the pre-v0.9.29 behaviour — useful
 * for the prod build's non-annotation paths and for tests.
 */
export function buildEndpointIndex(
  nodes: DiagramNode[],
  shapes: Shape[] = [],
): EndpointIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const index: EndpointIndex = new Map();
  for (const n of nodes) index.set(n.id, nodeEndpointBox(n, byId));
  for (const s of shapes) {
    const box = shapeEndpointBox(s);
    if (box) index.set(box.id, box);
  }
  return index;
}

/** Centre of an endpoint box — what the edge router actually needs. */
export function endpointCenter(b: EndpointBox): { x: number; y: number } {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/**
 * v0.9.49 — absolute (root-space) boxes for every node, keyed by id.
 *
 * Container drags need real geometry to decide what is inside what, and a
 * nested node's stored `position` is parent-relative. This reuses
 * `nodeEndpointBox`, so containment and edge routing can never disagree
 * about where a node actually is — including its parent-cycle guard.
 */
export function absoluteNodeBoxes(nodes: DiagramNode[]): Map<string, BBox> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, BBox>();
  for (const n of nodes) {
    const b = nodeEndpointBox(n, byId);
    out.set(n.id, { x: b.x, y: b.y, w: b.w, h: b.h });
  }
  return out;
}
