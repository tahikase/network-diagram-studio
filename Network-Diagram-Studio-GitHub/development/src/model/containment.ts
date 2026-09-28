/**
 * v0.9.49 — "move the box, move what's in it".
 *
 * Dragging a container (a VNet/subnet group node, or a plain rectangle used
 * as a frame) should carry everything drawn inside it. Two facts make this
 * non-trivial, and both are the reason this lives in its own module rather
 * than inside either overlay:
 *
 *  1. **The canvas has two independent layers.** Resource cards are React
 *     Flow nodes; rectangles/arrows/callouts are shapes in the annotation
 *     store. Neither knows about the other, and React Flow's own parenting
 *     can only ever move nodes. A container therefore has to collect cargo
 *     from BOTH layers, which no single existing drag path could do.
 *
 *  2. **Containment here is geometric, not structural.** `addNode` never
 *     assigns a `parent`, so a card the user dropped inside a VNet is only
 *     *visually* inside it. Requiring a real parent link would have fixed
 *     template diagrams and left every hand-built one broken — which is the
 *     case that was actually reported.
 *
 * The rule is deliberately strict: an item is cargo only when its bounding
 * box is WHOLLY inside the container's and is genuinely smaller. Items that
 * merely overlap the edge are left alone, so nudging a frame that happens to
 * cross a neighbour cannot drag half the diagram with it.
 */
import type { Shape } from '../demo/tabs-store';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Axis-aligned box of a shape. Rotation is ignored, exactly as endpoints.ts does. */
export function shapeBBox(sh: Shape): BBox {
  if (sh.kind === 'arrow') {
    const x = Math.min(sh.from.x, sh.to.x);
    const y = Math.min(sh.from.y, sh.to.y);
    return {
      x,
      y,
      w: Math.abs(sh.to.x - sh.from.x),
      h: Math.abs(sh.to.y - sh.from.y),
    };
  }
  if (sh.kind === 'rect' || sh.kind === 'callout') {
    return { x: sh.x, y: sh.y, w: sh.w, h: sh.h };
  }
  return { x: sh.cx - sh.rx, y: sh.cy - sh.ry, w: sh.rx * 2, h: sh.ry * 2 };
}

export function translateShapeGeometry(sh: Shape, tx: number, ty: number): Shape {
  if (tx === 0 && ty === 0) return sh;
  if (sh.kind === 'arrow') {
    return {
      ...sh,
      from: { x: sh.from.x + tx, y: sh.from.y + ty },
      to: { x: sh.to.x + tx, y: sh.to.y + ty },
    };
  }
  if (sh.kind === 'rect') return { ...sh, x: sh.x + tx, y: sh.y + ty };
  if (sh.kind === 'ellipse') return { ...sh, cx: sh.cx + tx, cy: sh.cy + ty };
  // callout: translate box only; keep anchor pinned in world space.
  return { ...sh, x: sh.x + tx, y: sh.y + ty };
}

/** Is `inner` wholly inside `outer`, and genuinely smaller? */
export function boxNestedIn(inner: BBox, outer: BBox): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h &&
    inner.w * inner.h < outer.w * outer.h
  );
}

/**
 * Pick the cargo for a container out of a set of candidates.
 *
 * `skip` holds ids that must NOT be collected. Callers use it for two very
 * different reasons, and getting either wrong double-moves an item:
 *
 *   - React Flow already moves nodes that have a real `parent` link, so
 *     those are excluded or they travel twice as far as the container.
 *   - In a multi-select drag every selected item receives its own delta,
 *     so selected items are excluded too.
 */
export function collectCargo<T extends { id: string }>(
  container: BBox,
  candidates: readonly T[],
  boundsOf: (item: T) => BBox | null,
  skip: ReadonlySet<string>
): T[] {
  const out: T[] = [];
  for (const item of candidates) {
    if (skip.has(item.id)) continue;
    const b = boundsOf(item);
    if (!b) continue;
    if (!boxNestedIn(b, container)) continue;
    out.push(item);
  }
  return out;
}
