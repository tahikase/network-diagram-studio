/**
 * Making one box the same size as another — v0.9.61.
 *
 * Two containers that hold the same KIND of thing should look like siblings,
 * and until now the only way to get there was to drag a corner grip until it
 * looked about right. "About right" is never right: `groupHeaderScale` grows a
 * container's header text with its box, so a VNet 40px narrower than the one
 * beside it also renders its NAME a little smaller, and the eye reads that as
 * two different levels of importance rather than two boxes of different width.
 *
 * This module owns both halves of the fix, so the drag path and the menu path
 * can never disagree about what "the same size" means:
 *
 *  - `snapNodeSize` — while a resize drag is in flight, stick the box to a
 *    neighbour's width or height once it comes within `SIZE_SNAP_TOLERANCE`.
 *    Each axis snaps independently: matching only the width of the container
 *    next door is a perfectly ordinary thing to want.
 *  - `matchedSize` — the deliberate version, driven by the "match size" menu
 *    on a container's toolbar, clamped so a container can never be shrunk
 *    underneath its own children or its own header pill.
 *
 * The minimums also live here rather than inline on each `NodeResizer`,
 * because a clamp that disagreed with the resizer's `minWidth` would let the
 * menu produce a box the hand could not.
 */
import type { DiagramNode } from './types';
import { getResourceType } from './resource-types';
import { groupBoxWidthForHeader, leafFootprint } from './professional-layout';
import { currentTextFactor } from '../theme/type-scale';

/**
 * How close, in canvas pixels, a dragged edge has to come to another box's
 * dimension before it sticks to it.
 *
 * 8 is deliberately small. The snap has to be reachable without aiming, but a
 * generous window on a canvas where containers are routinely within 20px of
 * each other would make it impossible to choose a size NEAR a neighbour's
 * without landing exactly on it.
 */
export const SIZE_SNAP_TOLERANCE = 8;

/** Floor for a container drag-resize, shared with `GroupNode`'s resizer. */
export const GROUP_RESIZE_MIN_W = 160;
export const GROUP_RESIZE_MIN_H = 100;
/** Floor for a resource-card drag-resize, shared with `AzureNode`'s resizer. */
export const LEAF_RESIZE_MIN_W = 140;
export const LEAF_RESIZE_MIN_H = 120;

/**
 * Breathing room kept between the far edge of the last child and the inside
 * of the container. Mirrors the layout engine's `PARENT_PAD_LR`.
 */
const CHILD_PAD = 28;

/**
 * The box `Canvas` gives a container that has never been sized. Duplicated
 * from the node builder on purpose: this module has to reason about what is
 * ON SCREEN, and on screen an unsized container is 260 x 200.
 */
const UNSIZED_GROUP = { w: 260, h: 200 };

export function isGroupNode(node: DiagramNode): boolean {
  try {
    return getResourceType(node.type).isGroup === true;
  } catch {
    return false;
  }
}

/**
 * The size a node actually occupies on the canvas right now — its stored box
 * if it has one, otherwise the same fallback `Canvas` renders it at.
 */
export function renderedSize(
  node: DiagramNode,
  factor: number = currentTextFactor()
): { w: number; h: number } {
  if (node.size) return node.size;
  return isGroupNode(node) ? { ...UNSIZED_GROUP } : leafFootprint(node, factor);
}

export interface SizeSnap {
  size: { w: number; h: number };
  /** The node whose dimension was adopted, if any. */
  matchId?: string;
  matchName?: string;
}

/**
 * Pull `raw` onto a neighbour's width and/or height when it is close enough.
 *
 * Only nodes of the same KIND are candidates — a container snapping to the
 * width of a resource card would be a coincidence, not an intent. Ties go to
 * the nearest candidate, and a node that supplies BOTH axes wins the label
 * over two nodes that each supply one.
 */
export function snapNodeSize(
  nodeId: string,
  raw: { w: number; h: number },
  nodes: DiagramNode[],
  factor: number = currentTextFactor()
): SizeSnap {
  const self = nodes.find((n) => n.id === nodeId);
  if (!self) return { size: raw };
  const selfIsGroup = isGroupNode(self);

  let wNode: DiagramNode | null = null;
  let wValue = raw.w;
  let wDist = SIZE_SNAP_TOLERANCE + 1;
  let hNode: DiagramNode | null = null;
  let hValue = raw.h;
  let hDist = SIZE_SNAP_TOLERANCE + 1;

  for (const other of nodes) {
    if (other.id === nodeId) continue;
    if (isGroupNode(other) !== selfIsGroup) continue;
    const s = renderedSize(other, factor);
    const dw = Math.abs(s.w - raw.w);
    if (dw <= SIZE_SNAP_TOLERANCE && dw < wDist) {
      wDist = dw;
      wValue = s.w;
      wNode = other;
    }
    const dh = Math.abs(s.h - raw.h);
    if (dh <= SIZE_SNAP_TOLERANCE && dh < hDist) {
      hDist = dh;
      hValue = s.h;
      hNode = other;
    }
  }

  // Prefer to name the node that gave us both axes — that is the one the
  // user is visually matching, and highlighting it is the whole feedback.
  const both = wNode && hNode && wNode.id === hNode.id ? wNode : null;
  const credited = both ?? wNode ?? hNode;

  return {
    size: { w: wValue, h: hValue },
    matchId: credited?.id,
    matchName: credited?.data.name,
  };
}

/**
 * The smallest box `node` can be without clipping something it owns: every
 * child has to stay inside it, and its header pill has to render un-truncated.
 *
 * Called with a container. Leaves have no children and no pill, so they clamp
 * to the flat resizer floor instead.
 */
export function minContainerSize(
  node: DiagramNode,
  nodes: DiagramNode[],
  factor: number = currentTextFactor()
): { w: number; h: number } {
  let w = GROUP_RESIZE_MIN_W;
  let h = GROUP_RESIZE_MIN_H;
  for (const child of nodes) {
    if (child.parent !== node.id) continue;
    const s = renderedSize(child, factor);
    w = Math.max(w, child.position.x + s.w + CHILD_PAD);
    h = Math.max(h, child.position.y + s.h + CHILD_PAD);
  }
  // The pill floats OVER the box, so the child arithmetic above never sees
  // it. Same call the layout engine makes for the same reason.
  return { w: Math.max(w, groupBoxWidthForHeader(node, factor, w, h)), h };
}

/**
 * The size `target` should take to match `source`, never smaller than what
 * `target` needs for its own contents.
 *
 * The clamp is why this is a request rather than an assignment: matching a
 * packed VNet to an empty one would otherwise bury the packed one's children
 * outside its own border.
 */
export function matchedSize(
  target: DiagramNode,
  source: DiagramNode,
  nodes: DiagramNode[],
  factor: number = currentTextFactor()
): { w: number; h: number } {
  const want = renderedSize(source, factor);
  const min = isGroupNode(target)
    ? minContainerSize(target, nodes, factor)
    : { w: LEAF_RESIZE_MIN_W, h: LEAF_RESIZE_MIN_H };
  return {
    w: Math.max(Math.round(want.w), min.w),
    h: Math.max(Math.round(want.h), min.h),
  };
}
