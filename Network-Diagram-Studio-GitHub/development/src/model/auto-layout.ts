import type { Diagram, DiagramNode } from './types';
import { getResourceType } from './resource-types';
import { customFieldLabel } from './custom-fields';
import { leafAppearance } from './leaf-appearance';
import {
  packTiered,
  packRowFlowSimple,
  shouldTier,
  leafFootprint,
  groupHeaderClearance,
  groupHeaderScale,
  groupHeaderWidth,
  groupBoxWidthForHeader,
  GROUP_HEADER_MAX_SCALE,
  GROUP_MIN_W,
  GROUP_MIN_H,
  TARGET_INNER_WIDTH,
  type Sized as ProSized,
} from './professional-layout';
import { currentTextFactor } from '../theme/type-scale';

// Leaf / group size + gap defaults.
//
// Guiding principle: sizes here are UPPER bounds on the actual DOM
// dimensions of a rendered node card so the packer never places two
// nodes that will end up visually touching each other. If we
// underestimate here, the packer's math works on paper but the DOM
// renders slightly larger, causing visible overlap. Gaps are chosen
// generously (48–56 px) to leave breathing room for edge labels that
// route between siblings.
//
// Leaf footprints come from `leafFootprint` in professional-layout.ts,
// which is the SAME function Canvas.tsx renders with — so the packer's
// idea of a card and the card the browser draws can never drift apart.
const DEFAULT_GROUP_W = GROUP_MIN_W;
const DEFAULT_GROUP_H = GROUP_MIN_H;
/** Footprint for a container that ended up with no children — just enough
 *  for the header pill and a CIDR/region field. */
const EMPTY_GROUP_W = 240;
const EMPTY_GROUP_H = 120;
// Sibling gap constants. Prefer the ones exported from
// professional-layout.ts since those are what the tiered packer uses;
// row-flow's local ones are kept only for legacy shim compatibility.
const _GAP_X_UNUSED = 40;
const _GAP_Y_UNUSED = 56;
void _GAP_X_UNUSED;
void _GAP_Y_UNUSED;
const PARENT_PAD_LR = 28;
const PARENT_PAD_BOT = 22;

// A container's header pill floats over its top-left corner, so the layout has
// to reserve room for it above the first child. `groupHeaderClearance` derives
// that from the SAME metrics GroupNode renders with, at the current text
// factor. This used to be two fixed constants (44 plain / 80 with notes)
// calibrated at a factor of 1.0, which silently under-reserved as the global
// type scale moved up — at XL a container with notes overlapped its first
// child by ~8px.
//
// The header also scales with the box, and the box's height depends on this
// very pad, so the two are mutually recursive. Reserving the ceiling for every
// container is safe but wasteful: it inflated the diagram enough to cost up to
// 15% of on-screen text on container-heavy templates. Instead, walk the fixed
// point — clearance only ever GROWS with size, so the loop converges upward in
// a step or two, and the ceiling backstops the (unreachable) non-convergent
// case so it can never under-reserve.
function resolveParentPadTop(
  parent: DiagramNode | null,
  totalW: number,
  totalH: number,
  stackedAtOrigin: boolean
): number {
  if (!parent) return ROOT_START_Y;
  const notes = parent.data?.notes;
  const hasNotes = !!notes && String(notes).trim() !== '';
  const factor = currentTextFactor() *
    (typeof parent.data.textScale === 'number' ? parent.data.textScale : 1);
  const cur = parent.size ?? { w: DEFAULT_GROUP_W, h: DEFAULT_GROUP_H };
  const floorW = stackedAtOrigin ? DEFAULT_GROUP_W : cur.w;
  const floorH = stackedAtOrigin ? DEFAULT_GROUP_H : cur.h;
  const needW = Math.max(floorW, totalW + PARENT_PAD_LR * 2);

  let pad = groupHeaderClearance(factor, hasNotes, 1, {
    notes: notes ? String(notes) : undefined,
    boxW: needW,
    name: parent.data.name,
    fields: parent.data.fields,
  });
  for (let i = 0; i < 4; i++) {
    const needH = Math.max(floorH, totalH + pad + PARENT_PAD_BOT);
    const next = groupHeaderClearance(
      factor,
      hasNotes,
      groupHeaderScale(needW, needH),
      { notes: notes ? String(notes) : undefined, boxW: needW, name: parent.data.name, fields: parent.data.fields }
    );
    if (next <= pad) return pad;
    pad = next;
  }
  return groupHeaderClearance(factor, hasNotes, GROUP_HEADER_MAX_SCALE, {
    notes: notes ? String(notes) : undefined,
    boxW: needW,
    name: parent.data.name,
    fields: parent.data.fields,
  });
}
const ROOT_START_X = 48;
const ROOT_START_Y = 48;
const ROOT_INNER_WIDTH = 1600;
// Vertical gap between the "externals band" (Internet, on-prem, users)
// on TOP and the "regions band" BELOW at root. This matches the current
// prod look — client above, region beneath.
const ROOT_BAND_GAP = 96;

interface Sized {
  node: DiagramNode;
  w: number;
  h: number;
}

function nodeSize(node: DiagramNode): { w: number; h: number } {
  if (node.size) return node.size;
  const f = currentTextFactor();
  try {
    const rt = getResourceType(node.type);
    if (rt.isGroup) {
      return {
        w: Math.max(Math.round(DEFAULT_GROUP_W * f), groupHeaderWidth(node, f)),
        h: Math.round(DEFAULT_GROUP_H * f),
      };
    }
  } catch {
    // Unknown type — treat as leaf.
  }
  return leafFootprint(node, f);
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

// Minimum breathing room between sibling nodes. Two boxes that don't
// technically overlap but are closer than this render as visually
// touching, which the user sees as an overlap. Treating "too close" as
// overlap forces a relayout so there is always at least MIN_SEPARATION
// clear space between siblings.
const MIN_SEPARATION = 16;

function boxesTooClose(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  const inflated = {
    x: a.x - MIN_SEPARATION,
    y: a.y - MIN_SEPARATION,
    w: a.w + MIN_SEPARATION * 2,
    h: a.h + MIN_SEPARATION * 2,
  };
  return boxesOverlap(inflated, b);
}

function hasSiblingOverlap(sized: Sized[]): boolean {
  const items = sized.map((s) => ({
    x: s.node.position.x,
    y: s.node.position.y,
    w: s.w,
    h: s.h,
  }));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (boxesTooClose(items[i], items[j])) return true;
    }
  }
  return false;
}

/** True when any child extends outside its parent's rectangle. */
function childrenSpillParent(sized: Sized[], parent: DiagramNode): boolean {
  const size = parent.size ?? { w: DEFAULT_GROUP_W, h: DEFAULT_GROUP_H };
  for (const s of sized) {
    const { x, y } = s.node.position;
    if (x < 0 || y < 0) return true;
    if (x + s.w > size.w) return true;
    if (y + s.h > size.h) return true;
  }
  return false;
}

/**
 * Router that picks between the professional tier-aware packer and the
 * legacy row-flow packer. Tiered when children come from ≥2 different
 * tiers (e.g. an AppGw + a VM + a Storage account), row-flow otherwise
 * (e.g. a subnet holding 3 VMs is fine as a single row).
 */
function packRowFlow(
  sized: Sized[],
  innerWidth: number
): { positions: Map<string, { x: number; y: number }>; totalW: number; totalH: number } {
  const children = sized.map((s) => s.node);
  const proSized: ProSized[] = sized as unknown as ProSized[];
  if (shouldTier(children)) {
    return packTiered(proSized, innerWidth);
  }
  return packRowFlowSimple(proSized, innerWidth);
}

/**
 * Compute a "natural" inner width for a container, so tier rows aren't
 * squeezed into 2 columns when the parent's initial size hint was small.
 *
 * Rules:
 *  - Never less than the parent's currently-stored inner width (respects
 *    author-hinted sizes upward, but grows past them when needed).
 *  - Aim for at least 4 columns of the widest child, so tier rows don't
 *    look tall and narrow.
 *  - Bounded by `TARGET_INNER_WIDTH`, so the "4 columns" aim cannot run
 *    away. It is a multiple of the WIDEST child, and cards became
 *    content-sized in v0.9.5 — a single 440px card (long name plus an FQDN
 *    property) asked for a 1880px-wide container, which packed six
 *    children into one enormous row. The diagram still fit on paper, but
 *    fit-view then zoomed out far enough to shrink every label, which is
 *    the readability problem the sizing work was meant to solve.
 *  - Always fit the widest single child, even past that bound — a child
 *    wider than the target has to fit somewhere.
 *
 * The final parent width will still be grown by the caller when the
 * packer's returned totalW+padding exceeds the hinted size.
 */
function computeNaturalInnerWidth(parent: DiagramNode, sized: Sized[]): number {
  const parentInner = Math.max(
    (parent.size?.w ?? DEFAULT_GROUP_W) - PARENT_PAD_LR * 2,
    200
  );
  const maxChildW = sized.reduce((m, s) => Math.max(m, s.w), 0);
  const TARGET_COLS = 4;
  const naturalGrid = TARGET_COLS * maxChildW + (TARGET_COLS - 1) * 40;
  const aim = Math.min(Math.max(parentInner, naturalGrid), TARGET_INNER_WIDTH);
  return Math.max(aim, maxChildW);
}

/**
 * The size a container needs for its header pill, never smaller than the size
 * it already carries. The pill is absolutely positioned and floats OVER the
 * box, so no packing math consults it — a container sized purely by its
 * children truncates its own name.
 *
 * Same contract and same reason as `grownLeafSize`: the store calls it when
 * a container's text is edited so the stored size never falls behind what is
 * on screen.
 */
export function grownGroupSize(
  node: DiagramNode,
  factor: number = currentTextFactor()
): { w: number; h: number } {
  const cur = node.size ?? { w: DEFAULT_GROUP_W, h: DEFAULT_GROUP_H };
  return { w: Math.max(cur.w, groupBoxWidthForHeader(node, factor, cur.w, cur.h)), h: cur.h };
}

/**
 * The size a leaf card wants for its content, ignoring whatever size it
 * currently has. Used when a node has no trustworthy box yet — e.g. its type
 * just changed, so the old box described a different card.
 */
export function naturalLeafSize(
  node: DiagramNode,
  factor: number = currentTextFactor()
): { w: number; h: number } {
  const natural = leafFootprint(node, factor);
  // Re-measure the height against the width the card will really have:
  // widening it can drop the type caption or the name back to one line
  // and so needs LESS height than the natural box implies.
  const need = leafFootprint(node, factor, natural.w);
  return { w: natural.w, h: need.h };
}

/**
 * The size a leaf card needs to render its own content, never smaller than
 * the size it already carries.
 *
 * Exported because TWO places must agree on it: the layout engine below, and
 * the store actions that edit a node's text. They used to disagree — the
 * layout engine grew a card to fit, but typing a longer name only changed
 * `data`, leaving `size` stale. The card wrapped or ellipsized until the next
 * relayout, and the next relayout was a FILE LOAD, so "Save JSON → Load JSON"
 * silently resized cards by up to ~100px and spilled them out of a container
 * that was snug around their old size. One function, one rule, no drift.
 *
 * Returns `null` for containers and unsized nodes, which are sized from their
 * children and their header instead.
 */
export function grownLeafSize(
  node: DiagramNode,
  factor: number = currentTextFactor()
): { w: number; h: number } | null {
  if (!node.size) return null;
  const appearance = leafAppearance();
  if (appearance && !getResourceType(node.type).isGroup && !appearance.isContainer(node.id)) {
    return appearance.growNode(node, factor, getResourceType, customFieldLabel) ?? null;
  }
  let isGroup = false;
  try {
    isGroup = getResourceType(node.type).isGroup === true;
  } catch {
    isGroup = false;
  }
  if (isGroup) return null;
  const natural = naturalLeafSize(node, factor);
  const w = Math.max(node.size.w, natural.w);
  const need = leafFootprint(node, factor, w);
  return { w, h: Math.max(node.size.h, need.h) };
}

/**
 * Is this diagram already carrying a complete, explicit layout?
 *
 * Every node the app itself creates is given a concrete `size` (see
 * `addNode`), so a diagram whose nodes are all sized is one this app laid
 * out and the user then arranged — there is nothing left for the packer to
 * compute. Model-generated JSON is the opposite case: `buildPrompt` in
 * `ai/prompt.ts` explicitly instructs the model NOT to emit `position`,
 * `size`, `w` or `h`, so those arrive unsized and genuinely do need a
 * layout pass.
 *
 * That makes "every node is sized" a statement about the DATA rather than a
 * guess about provenance, and it is why this needs no file-format flag and
 * works on every diagram ever saved.
 */
export function isFullyLaidOut(diagram: Diagram): boolean {
  return (
    diagram.nodes.length > 0 &&
    diagram.nodes.every(
      (n) =>
        !!n.size &&
        Number.isFinite(n.size.w) &&
        Number.isFinite(n.size.h) &&
        Number.isFinite(n.position?.x) &&
        Number.isFinite(n.position?.y)
    )
  );
}

/**
 * Guarantee no two sibling nodes overlap.
 *
 * Walks parents bottom-up (deepest first). For each parent whose direct
 * children overlap, replaces the children's positions with a clean
 * row-flow layout inside the parent's content area and grows the parent
 * when needed. Parents whose children are already collision-free are
 * left untouched so hand-arranged diagrams round-trip cleanly.
 *
 * `preservePositions` runs the size repairs but skips every step that
 * MOVES a node. Pass it when the caller is restoring a diagram the user
 * already arranged — see the note on `isFullyLaidOut`. The claim above
 * that collision-free diagrams round-trip cleanly only holds for
 * collision-free ones; the moment two siblings touch, the sweep discards
 * the whole arrangement and re-flows it into rows, which is exactly what
 * a user who deliberately stacked or tightly packed nodes did not ask
 * for. The remaining phases only ever GROW a box that would otherwise
 * clip its own text, so they are idempotent and never reposition.
 */
export function relayoutForNoOverlap(
  diagram: Diagram,
  opts?: { preservePositions?: boolean }
): Diagram {
  const preserve = opts?.preservePositions === true;
  const nodes = diagram.nodes.map((n) => ({ ...n, data: { ...n.data } }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const childrenByParent = new Map<string, DiagramNode[]>();
  for (const n of nodes) {
    const key = n.parent ?? '';
    const arr = childrenByParent.get(key) ?? [];
    arr.push(n);
    childrenByParent.set(key, arr);
  }

  // v0.10: a container with nothing inside it should not occupy the same
  // footprint as a full one. Imported diagrams routinely contain a VNet or
  // on-prem site that was named but never populated, and rendering those at
  // the 700x450 authoring default leaves large empty rectangles that make
  // the whole diagram look wrong. Shrink them to a label-sized box.
  //
  // Skipped when preserving: this SHRINKS, so an empty container the user
  // deliberately sized large would come back smaller than they saved it.
  for (const n of preserve ? [] : nodes) {
    if (childrenByParent.has(n.id)) continue;
    let isGroup = false;
    try {
      isGroup = getResourceType(n.type).isGroup === true;
    } catch {
      isGroup = false;
    }
    if (!isGroup) continue;
    const f = currentTextFactor();
    const w = n.size?.w ?? DEFAULT_GROUP_W;
    const h = n.size?.h ?? DEFAULT_GROUP_H;
    // Shrink to a label-sized box, but never below what the label needs.
    const shrunkH = Math.min(h, EMPTY_GROUP_H);
    n.size = {
      w: Math.max(
        Math.min(w, EMPTY_GROUP_W),
        groupBoxWidthForHeader(n, f, Math.min(w, EMPTY_GROUP_W), shrunkH)
      ),
      h: shrunkH,
    };
  }

  // Stored leaf sizes predate the current type scale — every template in
  // the library hard-codes a card box that was tuned when the smallest
  // detail row was 9px. Raising the type scale made those boxes clip
  // their own content (a wrapped type caption or a notes block would run
  // past the bottom edge). Grow any leaf that no longer fits; never
  // shrink one, so a deliberately-widened card round-trips unchanged.
  //
  // WIDTH is grown here too, for the same reason and with the same rule.
  // It used to be left alone, so a stored 200px box holding a 38-character
  // name rendered "SWA application servi…" forever — re-laying out could
  // not fix a defect that was baked into the size. Growing it BEFORE the
  // overlap sweep below is what makes this safe: wider cards may now
  // collide, and the sweep that follows sees the new widths and repacks.
  //
  // SKIPPED when preserving. A file the user saved is a statement about
  // what the diagram looked like, sizes included, and re-fitting it on the
  // way in is not a repair — it is the app overruling the user. It also
  // could not be done safely here: this grows a CHILD without growing its
  // parent, so a container that was snug around its cards ended up with
  // them hanging outside its own border after a save/load round trip.
  // Cards are now kept fitted as they are edited (`grownLeafSize`, used by
  // the store's text actions), so a well-formed file needs no repair at
  // all — and one that is genuinely stale is repaired the moment any of
  // its text is touched.
  if (!preserve) {
    const f = currentTextFactor();
    for (const n of nodes) {
      if (!n.size || childrenByParent.has(n.id)) continue;
      const grown = grownLeafSize(n, f);
      if (grown) n.size = grown;
    }
  }

  // Containers get the same treatment, against their header pill rather
  // than their body: the pill is absolutely positioned and floats OVER the
  // box, so nothing in the packing math ever consults it and a container
  // sized purely by its children truncated its own name. Runs for every
  // container, not just repacked ones — a diagram whose children happen not
  // to collide skips the sweep below entirely.
  //
  // Skipped when preserving, for the same reason as the leaf grow above.
  if (!preserve) {
    const f = currentTextFactor();
    for (const n of nodes) {
      let isGroup = false;
      try {
        isGroup = getResourceType(n.type).isGroup === true;
      } catch {
        isGroup = false;
      }
      if (!isGroup) continue;
      const cur = n.size ?? { w: DEFAULT_GROUP_W, h: DEFAULT_GROUP_H };
      n.size = { w: Math.max(cur.w, groupBoxWidthForHeader(n, f, cur.w, cur.h)), h: cur.h };
    }
  }

  const depthOf = (n: DiagramNode): number => {
    let d = 0;
    let cur: DiagramNode | undefined = n;
    const guard = new Set<string>();
    while (cur?.parent && !guard.has(cur.id)) {
      guard.add(cur.id);
      d++;
      cur = byId.get(cur.parent);
      if (!cur) break;
    }
    return d;
  };

  const groups = nodes.filter((n) => childrenByParent.has(n.id));
  const parents: Array<DiagramNode | null> = preserve
    ? []
    : [...groups].sort((a, b) => depthOf(b) - depthOf(a));
  if (!preserve) parents.push(null);

  for (const parent of parents) {
    const key = parent ? parent.id : '';
    const children = childrenByParent.get(key);
    if (!children || children.length === 0) continue;

    // ROOT LEVEL: split into two bands (externals top, region groups bottom)
    // so edges from Internet/Users/on-prem don't cut across region containers.
    if (!parent) {
      // On-prem, on-prem-DC, subscription-level connectivity are semantically
      // "external" — they sit alongside Internet/User leaves, NOT with
      // Azure region containers. This keeps the entity-relationship natural
      // (on-prem left, Azure right) and avoids edges from an NVA inside
      // on-prem needing to reach nodes above it.
      const EXTERNAL_GROUP_TYPES = new Set([
        'group-onprem',
      ]);

      const externals: DiagramNode[] = [];
      const groups: DiagramNode[] = [];
      for (const c of children) {
        let isAzureGroup = false;
        try {
          const rt = getResourceType(c.type);
          isAzureGroup = !!rt.isGroup && !EXTERNAL_GROUP_TYPES.has(c.type);
        } catch {
          isAzureGroup = false;
        }
        (isAzureGroup ? groups : externals).push(c);
      }

      // If we have a mix, use the two-band layout. Otherwise fall through
      // to the original single-row-flow behavior (no regression).
      if (externals.length > 0 && groups.length > 0) {
        const extSized: Sized[] = externals.map((n) => ({ node: n, ...nodeSize(n) }));
        const grpSized: Sized[] = groups.map((n) => ({ node: n, ...nodeSize(n) }));

        const extOverlap = hasSiblingOverlap(extSized);
        const grpOverlap = hasSiblingOverlap(grpSized);
        // Also relayout if any external and any group overlap (mixed positions from unpositioned templates).
        const mixedOverlap =
          extSized.some((e) => grpSized.some((g) =>
            boxesOverlap(
              { x: e.node.position.x, y: e.node.position.y, w: e.w, h: e.h },
              { x: g.node.position.x, y: g.node.position.y, w: g.w, h: g.h }
            )
          ));

        if (extOverlap || grpOverlap || mixedOverlap) {
          // Externals on TOP, regions BELOW — matches current prod look.
          const extPack = packRowFlow(extSized, ROOT_INNER_WIDTH);
          for (const s of extSized) {
            const p = extPack.positions.get(s.node.id)!;
            s.node.position = { x: ROOT_START_X + p.x, y: ROOT_START_Y + p.y };
          }

          // Regions sit BELOW the externals row with a big gap so edges
          // crossing the boundary have room to route.
          const grpStartY = ROOT_START_Y + extPack.totalH + ROOT_BAND_GAP;
          const grpPack = packRowFlow(grpSized, ROOT_INNER_WIDTH);
          for (const s of grpSized) {
            const p = grpPack.positions.get(s.node.id)!;
            s.node.position = { x: ROOT_START_X + p.x, y: grpStartY + p.y };
          }
        }
        continue;
      }
    }

    const sized: Sized[] = children.map((n) => ({ node: n, ...nodeSize(n) }));

    const overlapping = children.length >= 2 && hasSiblingOverlap(sized);
    const spilling = parent ? childrenSpillParent(sized, parent) : false;
    // v0.7.19 — also relayout when children are stacked at the origin.
    // Freshly-loaded templates create every child at (0, 0); without this
    // check, a parent with only ONE child would keep the child pinned at
    // its top-left corner (overlapping the container's label pill), and
    // nested single-child chains would collapse every leaf to (0, 0).
    const stackedAtOrigin =
      children.length >= 1 &&
      sized.every((s) => s.node.position.x === 0 && s.node.position.y === 0);
    if (!overlapping && !spilling && !stackedAtOrigin) continue;

    const innerWidth = parent
      ? computeNaturalInnerWidth(parent, sized)
      : ROOT_INNER_WIDTH;

    const { positions, totalW, totalH } = packRowFlow(sized, innerWidth);
    const padTop = resolveParentPadTop(parent, totalW, totalH, stackedAtOrigin);

    for (const s of sized) {
      const p = positions.get(s.node.id)!;
      s.node.position = {
        x: (parent ? PARENT_PAD_LR : ROOT_START_X) + p.x,
        y: padTop + p.y,
      };
    }

    if (parent) {
      const needW = totalW + PARENT_PAD_LR * 2;
      const needH = totalH + padTop + PARENT_PAD_BOT;
      const cur = parent.size ?? { w: DEFAULT_GROUP_W, h: DEFAULT_GROUP_H };
      // A container is normally sized by what it holds, but it also has to
      // be wide enough to print its own header pill — otherwise a VNet with
      // one small subnet in it shows "soai-u1n-…" forever.
      const headerW = groupBoxWidthForHeader(
        parent,
        currentTextFactor(),
        Math.max(cur.w, needW),
        Math.max(cur.h, needH)
      );
      if (stackedAtOrigin) {
        // Fresh template layout — tighten the container so it snugly
        // fits its children. Templates hint at a max-width via the
        // starting `size`, but that hint is only useful for multi-child
        // parents; single-child (or few-child) containers should shrink
        // to remove the visual empty-space overlap the user complained
        // about (v0.7.19).
        parent.size = {
          w: Math.max(DEFAULT_GROUP_W, needW, headerW),
          h: Math.max(DEFAULT_GROUP_H, needH),
        };
      } else if (needW > cur.w || needH > cur.h || headerW > cur.w) {
        parent.size = {
          w: Math.max(cur.w, needW, headerW),
          h: Math.max(cur.h, needH),
        };
      }
    }
  }

  return { ...diagram, nodes };
}
