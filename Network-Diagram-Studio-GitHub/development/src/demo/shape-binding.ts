// v0.9.27 — arrow endpoints that BIND to a shape or a diagram node.
//
// Until now `ShapeArrow.from` / `to` were raw world coordinates, so an arrow
// drawn between two rectangles was decoration: move either rectangle and the
// arrow stayed behind. Resources (React Flow nodes) never had this problem
// because a React Flow edge stores node *ids*.
//
// Users build topologies out of shapes, not only out of the resource
// palette, so shape arrows have to behave the same way.
//
// HOW IT WORKS
//   `fromRef` / `toRef` name a target. `from` / `to` remain the LAST RESOLVED
//   coordinates, which buys three things:
//     * an unbound arrow is byte-identical to one written by any older build;
//     * export, hit-testing and every other consumer keep working untouched;
//     * when a target is deleted the arrow simply FREEZES where it was
//       instead of vanishing (see `resolveShapes`, which unbinds dangling
//       refs rather than cascading a delete).
//
// This module is pure geometry — no React, no store — so it can be unit
// tested and reused by the Story Mode projection in v0.9.28.

import type { Point, Shape, ShapeArrow, ShapeEndRef } from './tabs-store';

/** A thing an arrow endpoint may attach to, normalised to one shape:
 *  a centre, a half-size, a rotation, and an outline kind. Both annotation
 *  shapes and React Flow nodes reduce to this. */
export interface BindTarget {
  id: string;
  kind: 'shape' | 'node';
  cx: number;
  cy: number;
  /** Half-width / half-height of the unrotated box. */
  hw: number;
  hh: number;
  /** Degrees, clockwise, about (cx, cy). */
  rotation: number;
  outline: 'rect' | 'ellipse';
  /**
   * A container (VNet / subnet / region / resource group) rather than a
   * resource card. A container is background the user draws *inside*, so
   * only a band along its outline attaches — see `pickTargetAt`.
   */
  container?: boolean;
}

export type BindTargets = Map<string, BindTarget>;

/** The four side midpoints, in 0..1 shape-local space. Storing the anchor
 *  normalised (rather than as a world point) is what makes a binding survive
 *  the target being resized. */
export const SIDE_ANCHORS: Record<'n' | 'e' | 's' | 'w', Point> = {
  n: { x: 0.5, y: 0 },
  e: { x: 1, y: 0.5 },
  s: { x: 0.5, y: 1 },
  w: { x: 0, y: 0.5 },
};

/**
 * v0.9.57 — EVERY connect dot a shape paints, in the same 0..1 local space:
 * the four side midpoints, then the eight quarter points at 25 % and 75 %
 * along each side.
 *
 * This has to stay the exact counterpart of `shapeConnectAnchors` +
 * `shapeConnectDots` in ShapeOverlay, which build their dots from
 * `shapeSideAnchors(shape, [0.5])` and `[0.25, 0.75]` on the shape's
 * BOUNDING BOX — the same box `anchorToWorld` maps onto. Drawing the dots
 * from one list and resolving drops from another is precisely the bug this
 * fixes: twelve dots were painted, four could be landed on.
 *
 * `key` is the React Flow handle suffix for the same point on the shape's
 * `ShapeAnchorNode` (`l`, `r`, `t`, `b`, `l25` … `b75` — see `CONNECT_POINTS`
 * in canvas/handles.tsx). Carrying it here is what lets a committed EDGE pin
 * to the dot the user aimed at instead of being auto-routed.
 *
 * Midpoints come first so an exact tie prefers the midpoint, which is what
 * every diagram saved before this release already resolved to.
 */
export const CONNECT_ANCHORS: ReadonlyArray<{ key: string; at: Point }> = [
  0.5, 0.25, 0.75,
].flatMap((f) => {
  const q = f === 0.5 ? '' : String(Math.round(f * 100));
  return [
    { key: `t${q}`, at: { x: f, y: 0 } },
    { key: `r${q}`, at: { x: 1, y: f } },
    { key: `b${q}`, at: { x: f, y: 1 } },
    { key: `l${q}`, at: { x: 0, y: f } },
  ];
});

/**
 * The handle key for a pinned anchor, or null when the ref is floating (or
 * sits on a point no handle exists for, which would route the edge to
 * nowhere). Compared with a small epsilon because anchors travel through
 * JSON and arithmetic before they get back here.
 */
export function handleKeyForAnchor(a: Point | undefined | null): string | null {
  if (!a) return null;
  const hit = CONNECT_ANCHORS.find(
    (c) => Math.abs(c.at.x - a.x) < 1e-6 && Math.abs(c.at.y - a.y) < 1e-6,
  );
  return hit ? hit.key : null;
}

/** v0.9.46 — screen-px band inside a CONTAINER's outline within which an
 *  arrow endpoint still attaches to it. Past that band the container's
 *  interior is free, so an arrow can finally be drawn inside a VNet or a
 *  subnet instead of being ejected back out to its border. Resource cards
 *  are unaffected — their whole body still binds. Divide by zoom at the
 *  call site so the band stays the same size on screen. */
export const CONTAINER_EDGE_BAND_PX = 24;
/** v0.9.50 — screen-px tolerance around a bind target, applied only as a
 *  FALLBACK when a drop lands on nothing at all. Reported as "connecting
 *  resources and shapes is very difficult": the drop point previously had to
 *  be strictly inside the target, so releasing a few pixels short of a card
 *  silently produced an unbound arrow that looked connected but was not.
 *  An exact hit always wins, so this can never redirect a good drop. */
export const BIND_SLACK_PX = 28;

/**
 * Reduce an annotation shape to a bind target.
 *
 * Arrows and callouts are deliberately NOT bindable:
 *   * arrow → arrow would let a user build a connector chain with no
 *     meaning, and every resolution pass would need cycle detection;
 *   * a callout already has a leader line pointing at its subject, so a
 *     second connector on the same shape is ambiguous.
 */
export function targetFromShape(shape: Shape): BindTarget | null {
  if (shape.kind === 'arrow' || shape.kind === 'callout') return null;
  if (shape.kind === 'rect') {
    return {
      id: shape.id,
      kind: 'shape',
      cx: shape.x + shape.w / 2,
      cy: shape.y + shape.h / 2,
      hw: shape.w / 2,
      hh: shape.h / 2,
      rotation: shape.rotation ?? 0,
      // Non-rectangular `geom` variants (diamond, cloud, cylinder …) bind to
      // their bounding box. Exact path intersection would move an endpoint a
      // few pixels at most and is not worth the complexity.
      outline: 'rect',
    };
  }
  return {
    id: shape.id,
    kind: 'shape',
    cx: shape.cx,
    cy: shape.cy,
    hw: shape.rx,
    hh: shape.ry,
    rotation: shape.rotation ?? 0,
    outline: 'ellipse',
  };
}

export interface NodeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** True for a group node (VNet, subnet, region, resource group …). */
  container?: boolean;
}

export function targetFromNode(n: NodeBox): BindTarget {
  return {
    id: n.id,
    kind: 'node',
    cx: n.x + n.w / 2,
    cy: n.y + n.h / 2,
    hw: n.w / 2,
    hh: n.h / 2,
    rotation: 0,
    outline: 'rect',
    container: n.container === true,
  };
}

/** Index every bindable shape and node by id. Shape ids and node ids share
 *  one map because `ShapeEndRef.kind` already disambiguates them, and a
 *  collision between the two id spaces has never been possible (`sh-…` vs
 *  the diagram's own ids). */
export function buildBindTargets(shapes: Shape[], nodes: NodeBox[]): BindTargets {
  const map: BindTargets = new Map();
  for (const s of shapes) {
    const t = targetFromShape(s);
    if (t) map.set(t.id, t);
  }
  for (const n of nodes) map.set(n.id, targetFromNode(n));
  return map;
}

function rotatePoint(p: Point, cx: number, cy: number, deg: number): Point {
  if (deg === 0) return p;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** World position of a fixed 0..1 anchor on a target, rotation applied. */
export function anchorToWorld(t: BindTarget, a: Point): Point {
  const local = {
    x: t.cx - t.hw + a.x * t.hw * 2,
    y: t.cy - t.hh + a.y * t.hh * 2,
  };
  return rotatePoint(local, t.cx, t.cy, t.rotation);
}

/**
 * Where the outline of `t` meets the ray from its centre towards `toward`.
 *
 * Used for a FLOATING binding (no fixed anchor) — the endpoint slides around
 * the target so the arrow always points at it, which is how React Flow
 * behaves for resources and therefore what the canvas already teaches.
 */
export function outlinePointTowards(t: BindTarget, toward: Point): Point {
  // Work in the target's own unrotated frame, then rotate the answer back.
  const local = rotatePoint(toward, t.cx, t.cy, -t.rotation);
  const dx = local.x - t.cx;
  const dy = local.y - t.cy;
  if (dx === 0 && dy === 0) return { x: t.cx, y: t.cy - t.hh };

  let s: number;
  if (t.outline === 'ellipse') {
    const nx = dx / Math.max(1e-6, t.hw);
    const ny = dy / Math.max(1e-6, t.hh);
    s = 1 / Math.hypot(nx, ny);
  } else {
    // Largest scale that keeps the point inside the box on both axes.
    const sx = dx === 0 ? Infinity : t.hw / Math.abs(dx);
    const sy = dy === 0 ? Infinity : t.hh / Math.abs(dy);
    s = Math.min(sx, sy);
  }
  const edge = { x: t.cx + dx * s, y: t.cy + dy * s };
  return rotatePoint(edge, t.cx, t.cy, t.rotation);
}

function resolveEnd(
  ref: ShapeEndRef | undefined,
  fallback: Point,
  otherEnd: Point,
  targets: BindTargets,
  liveIds: Set<string> | null,
): { point: Point; dangling: boolean } {
  if (!ref) return { point: fallback, dangling: false };
  const t = targets.get(ref.id);
  if (!t || t.kind !== ref.kind) {
    // Two very different situations reach this branch and they must NOT be
    // treated the same:
    //
    //  1. The target was DELETED. Freeze the endpoint and report it so the
    //     caller drops the ref — deleting a shape must never silently delete
    //     arrows the user drew. Freezing is recoverable; deleting is not.
    //  2. The target still exists but has no usable geometry THIS RENDER.
    //     React Flow reports a node as 0x0 for a frame or two while it
    //     re-measures after a move, and an unmeasured node is deliberately
    //     left out of `targets`. Dropping the ref here would mean any node
    //     move silently unbinds every arrow attached to it — the binding
    //     would appear to work and then destroy itself on first use.
    //
    // `liveIds` is what tells them apart: it lists every target that EXISTS,
    // measured or not. Absent from it = really gone.
    const reallyGone = liveIds ? !liveIds.has(ref.id) : true;
    return { point: fallback, dangling: reallyGone };
  }
  if (ref.anchor) return { point: anchorToWorld(t, ref.anchor), dangling: false };
  return { point: outlinePointTowards(t, otherEnd), dangling: false };
}

export interface ResolvedArrow {
  from: Point;
  to: Point;
  /** True when a ref named a target that no longer exists. */
  fromDangling: boolean;
  toDangling: boolean;
}

/**
 * Compute where a (possibly bound) arrow's ends actually are right now.
 *
 * A floating end needs the OTHER end's position to know which way to face,
 * and when both ends float that is circular. Seed each side with the other's
 * last-known coordinate and then refine once; a second pass is below the
 * width of the stroke and nobody can see it.
 */
export function resolveArrow(
  a: ShapeArrow,
  targets: BindTargets,
  liveIds: Set<string> | null = null,
): ResolvedArrow {
  const first = {
    from: resolveEnd(a.fromRef, a.from, a.to, targets, liveIds),
    to: resolveEnd(a.toRef, a.to, a.from, targets, liveIds),
  };
  const from = resolveEnd(a.fromRef, a.from, first.to.point, targets, liveIds);
  const to = resolveEnd(a.toRef, a.to, first.from.point, targets, liveIds);
  return {
    from: from.point,
    to: to.point,
    fromDangling: from.dangling,
    toDangling: to.dangling,
  };
}

export function isBound(a: ShapeArrow): boolean {
  return Boolean(a.fromRef || a.toRef);
}

/** True only when BOTH ends name a live target — the condition Story Mode
 *  (v0.9.28) uses to decide an arrow is a real connection rather than
 *  decoration. */
export function isFullyBound(a: ShapeArrow, targets: BindTargets): boolean {
  if (!a.fromRef || !a.toRef) return false;
  return targets.has(a.fromRef.id) && targets.has(a.toRef.id);
}

const EPS = 0.01;
const moved = (a: Point, b: Point) => Math.abs(a.x - b.x) > EPS || Math.abs(a.y - b.y) > EPS;

export interface ArrowSync {
  id: string;
  from: Point;
  to: Point;
  /** Present and true when that end's target vanished and the ref must go. */
  dropFromRef?: boolean;
  dropToRef?: boolean;
}

/**
 * Apply every binding, and report which arrows need their stored
 * coordinates written back.
 *
 * The write-back is what keeps `from` / `to` honest, so that a deleted
 * target leaves the arrow exactly where it was drawn, and so a saved file
 * is meaningful to any reader that ignores the refs.
 */
export function resolveShapes(
  shapes: Shape[],
  targets: BindTargets,
  /** Every target id that EXISTS right now, including ones with no usable
   *  geometry this render (an unmeasured React Flow node). A ref is only
   *  dropped when its id is absent from here. Pass `null` to fall back to
   *  `targets`, which treats unmeasurable and deleted as the same thing —
   *  correct only when every target is guaranteed measurable. */
  liveIds: Set<string> | null = null,
): { shapes: Shape[]; syncs: ArrowSync[] } {
  const syncs: ArrowSync[] = [];
  let changed = false;
  const out = shapes.map((sh) => {
    if (sh.kind !== 'arrow' || !isBound(sh)) return sh;
    const r = resolveArrow(sh, targets, liveIds);
    const needsSync =
      r.fromDangling || r.toDangling || moved(r.from, sh.from) || moved(r.to, sh.to);
    if (needsSync) {
      syncs.push({
        id: sh.id,
        from: r.from,
        to: r.to,
        ...(r.fromDangling ? { dropFromRef: true } : {}),
        ...(r.toDangling ? { dropToRef: true } : {}),
      });
    }
    if (moved(r.from, sh.from) || moved(r.to, sh.to)) {
      changed = true;
      return { ...sh, from: r.from, to: r.to };
    }
    return sh;
  });
  return { shapes: changed ? out : shapes, syncs };
}

/**
 * The bind target under a world-space point, or null.
 *
 * Searched back-to-front so the topmost target wins, matching what the user
 * sees. Shapes are checked before nodes because the shape overlay paints
 * above every node.
 *
 * `edgeBand` (world units) carves a free interior out of CONTAINER targets
 * only. A VNet or subnet is background you draw arrows *inside*, so binding
 * on its whole body made it impossible to place an endpoint there at all —
 * the drop bound, and `outlinePointTowards` immediately ejected the endpoint
 * back out to the border. Only a band along the container's outline attaches
 * now. Resource cards are unchanged: they are things you point AT, so the
 * whole body still binds. A container too small to have an interior keeps
 * binding everywhere, so the gesture never becomes unhittable.
 * `slack` (world units) is a FALLBACK tolerance: when nothing is hit exactly,
 * the search is repeated with every target grown by `slack` on all sides.
 * The exact pass runs first and always wins, so slack can never steal a drop
 * from the target it actually landed on — it only rescues a drop that would
 * otherwise have bound to nothing. This is the fix for "connecting resources
 * and shapes is very difficult": the previous behaviour required the release
 * point to be strictly INSIDE the target, which on a small resource card at
 * a zoomed-out viewport is a very small area to hit.
 */
export function pickTargetAt(
  p: Point,
  targets: BindTargets,
  excludeId?: string | null,
  edgeBand = 0,
  slack = 0,
): BindTarget | null {
  const exact = pickTargetWithin(p, targets, excludeId, edgeBand, 0);
  if (exact || slack <= 0) return exact;
  return pickTargetWithin(p, targets, excludeId, edgeBand, slack);
}

function pickTargetWithin(
  p: Point,
  targets: BindTargets,
  excludeId: string | null | undefined,
  edgeBand: number,
  slack: number,
): BindTarget | null {
  let hit: BindTarget | null = null;
  for (const t of targets.values()) {
    if (excludeId && t.id === excludeId) continue;
    const local = rotatePoint(p, t.cx, t.cy, -t.rotation);
    const dx = local.x - t.cx;
    const dy = local.y - t.cy;
    const hw = t.hw + slack;
    const hh = t.hh + slack;
    const inside =
      t.outline === 'ellipse'
        ? (dx / Math.max(1e-6, hw)) ** 2 + (dy / Math.max(1e-6, hh)) ** 2 <= 1
        : Math.abs(dx) <= hw && Math.abs(dy) <= hh;
    if (!inside) continue;
    if (t.container && edgeBand > 0) {
      // Shrink the box by the band. Nothing left to shrink means the
      // container is smaller than the band, so keep the old behaviour.
      const iw = t.hw - edgeBand;
      const ih = t.hh - edgeBand;
      if (iw > 0 && ih > 0) {
        const inInterior =
          t.outline === 'ellipse'
            ? (dx / iw) ** 2 + (dy / ih) ** 2 <= 1
            : Math.abs(dx) <= iw && Math.abs(dy) <= ih;
        if (inInterior) continue;
      }
    }
    // Prefer a shape over a node, then the smaller target — dropping an
    // endpoint on a rectangle drawn inside a VNet container should bind to
    // the rectangle, not to the container behind it.
    if (
      !hit ||
      (t.kind === 'shape' && hit.kind === 'node') ||
      (t.kind === hit.kind && t.hw * t.hh < hit.hw * hit.hh)
    ) {
      hit = t;
    }
  }
  return hit;
}

/** Nearest side-midpoint anchor of `t` to a world point, as a ref. */
export function nearestSideRef(t: BindTarget, p: Point): ShapeEndRef {
  let bestSide: 'n' | 'e' | 's' | 'w' = 'n';
  let bestD = Infinity;
  for (const side of ['n', 'e', 's', 'w'] as const) {
    const w = anchorToWorld(t, SIDE_ANCHORS[side]);
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d < bestD) {
      bestD = d;
      bestSide = side;
    }
  }
  return { kind: t.kind, id: t.id, anchor: SIDE_ANCHORS[bestSide] };
}

/** A floating binding — the endpoint slides around the target so the arrow
 *  always faces it. This is what dropping an endpoint on a target's BODY
 *  produces; dropping it on a specific anchor dot pins that side instead. */
export function floatingRef(t: BindTarget): ShapeEndRef {
  return { kind: t.kind, id: t.id };
}

/**
 * Choose the binding for a drop at `p`.
 *
 * Near one of the twelve connect dots the user is clearly aiming at that
 * point, so pin it. Anywhere else on the body they just mean "attach to this
 * thing", and a FLOATING binding is better: the endpoint slides around the
 * outline so the arrow keeps facing its partner as either end moves, which
 * is how the resource edges on the same canvas already behave.
 *
 * `tolerance` is in world units — pass something that scales with zoom, or
 * the pin zone becomes unhittable when zoomed out.
 *
 * v0.9.57 — two changes, both required to make an aimed drop land:
 *
 *   1. It considers all twelve dots, not just the four side midpoints.
 *      Every dot was painted and only a midpoint could ever be returned, so
 *      aiming at a quarter dot snapped the endpoint to the middle of that
 *      side instead — reported as "I can only connect to the middle circle".
 *
 *   2. NEAREST wins, rather than the first candidate inside `tolerance`.
 *      With four well-separated midpoints first-match was harmless; with
 *      twelve dots, three to a side, it would hand back whichever happened
 *      to be earlier in the list and the endpoint would jump to a dot the
 *      user was not pointing at.
 */
export function refForDrop(t: BindTarget, p: Point, tolerance: number): ShapeEndRef {
  let best: Point | null = null;
  let bestD = Infinity;
  for (const a of CONNECT_ANCHORS) {
    const w = anchorToWorld(t, a.at);
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d <= tolerance && d < bestD) {
      bestD = d;
      best = a.at;
    }
  }
  return best ? { kind: t.kind, id: t.id, anchor: best } : floatingRef(t);
}

/** Where a ref's endpoint sits right now, given the other end's position. */
export function refPoint(t: BindTarget, ref: ShapeEndRef, otherEnd: Point): Point {
  return ref.anchor ? anchorToWorld(t, ref.anchor) : outlinePointTowards(t, otherEnd);
}
