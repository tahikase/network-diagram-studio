import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useStore,
  type EdgeProps,
  type ReactFlowState,
} from '@xyflow/react';
import { useDiagramStore } from '../store/diagram-store';
import { DIAGRAM_TYPE_SCALE, useDiagramTextFactor, currentTextFactor } from '../theme/type-scale';
import { groupHeaderClearance, groupHeaderScale } from '../model/professional-layout';
import { measureTextPx } from '../model/text-metrics';
import { DEMO_FEATURES } from '../env';
import { EDGE_KIND_META, EDGE_LINE_STYLES, resolveEdgeDash } from './edge-styles';
import { PEN_COLORS, paintColor } from '../theme/palette';
import type { EdgeKind, EdgeLineStyle } from '../model/types';
import { useT } from '../i18n/useT';
import { runtimeExtensions } from '../runtime/extensions';

// Kinds shown in the on-canvas quick-picker. Same enum used by templates
// (see src/demo/templates/registry.ts and src/panel/PropertyPanel.tsx),
// so every arrow style you see in a template can be reproduced from the
// picker without leaving the canvas.
const EDGE_KIND_OPTIONS: EdgeKind[] = [
  'peering',
  'vpn',
  'expressroute',
  'privateendpoint',
  'backend',
  'dns',
  'internet',
  'link',
];

/**
 * Custom edge that keeps its label ALWAYS VISIBLE even when the natural
 * midpoint of the smoothstep path happens to fall inside a leaf node card.
 *
 * How:
 *  1. The label is portalled into React Flow's <EdgeLabelRenderer>, which is
 *     an HTML overlay stacked ABOVE all nodes and edges — so even if the
 *     label's position would collide with a node's paint layer, it still
 *     renders on top.
 *  2. We also shift the label along the source→target line if the natural
 *     midpoint lands inside any leaf card, so the label doesn't merely
 *     "sit on top" of a card but instead moves to empty space where possible.
 *     This preserves the reference-diagram look where labels always sit on
 *     the background (see Microsoft's hub-and-spoke reference).
 */
export interface SmartEdgeData extends Record<string, unknown> {
  connector?: Record<string, string>;
  groupControls?: LeafBox[];
  borderRadius?: number;
  offset?: number;
  kind?: string;
  state?: string;
  color?: string;
  line?: EdgeLineStyle;
  /** Label font-size multiplier (0.5..3). Absent = 1. */
  textScale?: number;
}

interface LeafBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxPath({ x, y, w, h }: LeafBox): string {
  return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
}

// Selector that returns the absolute bounding boxes for label-collision
// avoidance. For each node:
//   • LEAF: full card rect (labels must never overlap a resource card).
//   • GROUP: only the TOP header strip — the container body is a valid
//     label host because most intra-group edges have their midpoint inside
//     the parent group, and forbidding the whole group would push every
//     such label off-canvas.
//
// The strip used to be a flat 52px. That was already optimistic for a plain
// pill at the pinned 1.3 text factor, and plain wrong for the two cases that
// actually matter: a container with a NOTES preview (which adds two more
// clamped lines under the pill) and a LARGE container (whose header scales
// up with the box, by design). Both push the real header past 120px, so
// labels were landing squarely on a VNet's name — the "VNet peering /
// gateway transit" chip sitting across two container titles.
//
// `groupHeaderClearance` is the same function the layout uses to reserve
// vertical room above a container's first child, so the strip now matches
// the space the header genuinely occupies.
function groupHeaderStrip(
  w: number,
  h: number,
  data: { notes?: unknown; name?: string; fields?: Record<string, string>; textScale?: number } | undefined
): number {
  const hasNotes = !!(data?.notes && String(data.notes).trim() !== '');
  const clearance = groupHeaderClearance(
    currentTextFactor() * (typeof data?.textScale === 'number' ? data.textScale : 1),
    hasNotes,
    groupHeaderScale(w, h),
    { notes: data?.notes ? String(data.notes) : undefined, boxW: w, name: data?.name, fields: data?.fields }
  );
  // Never claim the whole container: an edge between two children of the
  // same small group would then have nowhere legal to put its label.
  return Math.min(clearance, Math.max(0, h * 0.6));
}

// `useStore` defaults to `Object.is`, so a selector that builds a fresh array
// on every call reports "changed" on every store tick. For unlabeled edges the
// selector result is constant, so hand back one shared frozen array instead of
// allocating `[]` each render.
const NO_BOXES: LeafBox[] = [];
const selectNoBoxes = (): LeafBox[] => NO_BOXES;

interface BoxSnapshot {
  state: ReactFlowState;
  factor: number;
  all: LeafBox[];
  leaves: LeafBox[];
}

const boxSnapshots = new WeakMap<ReactFlowState['nodeLookup'], BoxSnapshot>();

function sameBoxes(a: LeafBox[], b: LeafBox[]): boolean {
  return a.length === b.length && a.every((box, i) =>
    box.x === b[i].x && box.y === b[i].y && box.w === b[i].w && box.h === b[i].h);
}

function labelBoxes(s: ReactFlowState): BoxSnapshot {
  const previous = boxSnapshots.get(s.nodeLookup);
  const factor = currentTextFactor();
  if (previous?.state === s && previous.factor === factor) return previous;
  const all: LeafBox[] = [];
  const leaves: LeafBox[] = [];
  s.nodeLookup.forEach((n) => {
    const abs = n.internals?.positionAbsolute ?? n.position;
    const w = n.measured?.width ?? n.width ?? 180;
    const h = n.measured?.height ?? n.height ?? 150;
    if (n.type === 'azureGroup') {
      all.push({ x: abs.x, y: abs.y, w, h: groupHeaderStrip(w, h, n.data) });
    } else {
      const box = { x: abs.x, y: abs.y, w, h };
      all.push(box);
      leaves.push(box);
    }
  });
  // The lookup is mutated in place. Read each new store snapshot once for
  // all edges, retaining arrays when only the camera/connection changed.
  const snapshot = {
    state: s,
    factor,
    all: previous && sameBoxes(previous.all, all) ? previous.all : all,
    leaves: previous && sameBoxes(previous.leaves, leaves) ? previous.leaves : leaves,
  };
  boxSnapshots.set(s.nodeLookup, snapshot);
  return snapshot;
}

function selectAllBoxes(s: ReactFlowState): LeafBox[] {
  return labelBoxes(s).all;
}

function selectLeafOnlyBoxes(s: ReactFlowState): LeafBox[] {
  return labelBoxes(s).leaves;
}

function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return !(ax + aw < bx || bx + bw < ax || ay + ah < by || by + bh < ay);
}

function labelInsideAnyBox(
  cx: number,
  cy: number,
  lw: number,
  lh: number,
  boxes: LeafBox[],
): boolean {
  const lx = cx - lw / 2;
  const ly = cy - lh / 2;
  for (const b of boxes) {
    if (rectOverlap(lx, ly, lw, lh, b.x, b.y, b.w, b.h)) return true;
  }
  return false;
}

function totalOverlapArea(
  cx: number,
  cy: number,
  lw: number,
  lh: number,
  boxes: LeafBox[],
): number {
  const lx = cx - lw / 2;
  const ly = cy - lh / 2;
  const lx2 = lx + lw;
  const ly2 = ly + lh;
  let sum = 0;
  for (const b of boxes) {
    const ox = Math.max(0, Math.min(lx2, b.x + b.w) - Math.max(lx, b.x));
    const oy = Math.max(0, Math.min(ly2, b.y + b.h) - Math.max(ly, b.y));
    sum += ox * oy;
  }
  return sum;
}

function pickClearLabelPosition({
  sourceX, sourceY, targetX, targetY,
  defaultX, defaultY,
  labelW, labelH,
  boxes,
  leafBoxes,
}: {
  sourceX: number; sourceY: number;
  targetX: number; targetY: number;
  defaultX: number; defaultY: number;
  labelW: number; labelH: number;
  boxes: LeafBox[];
  leafBoxes: LeafBox[];
}): { x: number; y: number } {
  if (!labelInsideAnyBox(defaultX, defaultY, labelW, labelH, boxes)) {
    return { x: defaultX, y: defaultY };
  }

  // Direction of the source→target line, and its perpendicular unit vector.
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;

  const fractions = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75, 0.2, 0.8, 0.15, 0.85, 0.1, 0.9];
  const perpOffsets = [0, 40, -40, 80, -80, 120, -120, 160, -160, 200, -200, 250, -250, 300, -300];

  /* Candidate positions, cheapest/prettiest first.
     Family A slides along the edge and offsets perpendicular to it — the
     label stays visually attached to its line, so this is always preferred.
     Family B offsets straight up/down instead. It exists because family A
     alone cannot escape a box whose long axis is parallel to the edge: for
     a peering edge between two side-by-side VNets the perpendicular is
     vertical, but for a vertically-stacked pair it is HORIZONTAL, and
     sliding sideways along a 1200px-wide container header never leaves it.
     A chip is wide and short, so a vertical escape nearly always exists. */
  const candidates: Array<{ x: number; y: number }> = [];
  for (const t of fractions) {
    const bx = sourceX + dx * t;
    const by = sourceY + dy * t;
    for (const o of perpOffsets) candidates.push({ x: bx + px * o, y: by + py * o });
  }
  const vertical = Math.abs(py) > Math.abs(px);
  for (const t of fractions) {
    const bx = sourceX + dx * t;
    const by = sourceY + dy * t;
    for (const o of perpOffsets) {
      if (o === 0) continue;
      // Whichever axis family A did NOT already cover.
      candidates.push(vertical ? { x: bx + o, y: by } : { x: bx, y: by + o });
    }
  }

  // Pass 1: prefer a position that clears BOTH leaves AND group headers.
  for (const c of candidates) {
    if (!labelInsideAnyBox(c.x, c.y, labelW, labelH, boxes)) return c;
  }
  // Pass 2: no ideal spot — accept touching a group header, but insist the
  // label still clears every LEAF card (leaves are the most visually
  // damaging place for a label to land).
  for (const c of candidates) {
    if (!labelInsideAnyBox(c.x, c.y, labelW, labelH, leafBoxes)) return c;
  }
  // Pass 3 (last resort): every candidate collides with something. Pick the
  // one with the SMALLEST total overlap area against the full box set. This
  // guarantees we never fall back to a position that's worse than one we
  // already evaluated — the label always lands on the least-bad spot.
  let best = { x: defaultX, y: defaultY };
  let bestArea = totalOverlapArea(defaultX, defaultY, labelW, labelH, boxes);
  for (const c of candidates) {
    const area = totalOverlapArea(c.x, c.y, labelW, labelH, boxes);
    if (area < bestArea) {
      bestArea = area;
      best = c;
    }
  }
  return best;
}

export function SmartLabelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const t = useT();
  const clipPrefix = useId();
  const d = (data ?? {}) as SmartEdgeData;
  const routeOptions = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: d.borderRadius ?? 12,
    offset: d.offset ?? 20,
  };
  const connectors = runtimeExtensions().ndsNonProductionConnectors;
  const [edgePath, defaultLabelX, defaultLabelY] = connectors
    ? connectors.route(d.connector, routeOptions)
    : getSmoothStepPath(routeOptions);

  // Only subscribe to node boxes when this edge actually has a label —
  // avoids per-edge re-renders on drag for unlabeled edges.
  const boxes = useStore(label ? selectAllBoxes : selectNoBoxes);
  const leafBoxes = useStore(label ? selectLeafOnlyBoxes : selectNoBoxes);

  const labelStr = typeof label === 'string' ? label : '';
  // Three multipliers compose, exactly as they do on a card: the shared
  // baseline, the workspace-wide factor, and this edge's own A− / A+ scale.
  // It has to feed `measureTextPx` below too, or the collision search would
  // clear a box the wrong size for the chip that actually renders.
  const labelScale = typeof d.textScale === 'number' ? d.textScale : 1;
  const labelFontPx = DIAGRAM_TYPE_SCALE.edgeLabel * useDiagramTextFactor() * labelScale;
  /* Measure the chip, don't estimate it. The old `length * 7 + 8` rule
     under-measured every label that carried an emoji prefix (a glyph is
     ~1.3em wide, not 7px) and ignored the text factor entirely, so at the
     pinned 1.3 factor the search cleared a box ~40% narrower than the chip
     that actually rendered — which is how labels ended up sitting on group
     titles despite the avoidance passes "succeeding".
     Chrome: padding 2px 6px + 1px border on each side. The body div is
     `whiteSpace: nowrap` with NO max-width, so width is genuinely unbounded
     — the old 260px clamp was inventing a ceiling that does not exist. */
  const labelW = Math.max(24, measureTextPx(labelStr, labelFontPx) + 14);
  const labelH = Math.round(labelFontPx * 1.3) + 6;

  const { x: labelX, y: labelY } = useMemo(
    () =>
      label
        ? pickClearLabelPosition({
            sourceX,
            sourceY,
            targetX,
            targetY,
            defaultX: defaultLabelX,
            defaultY: defaultLabelY,
            labelW,
            labelH,
            boxes,
            leafBoxes,
          })
        : { x: defaultLabelX, y: defaultLabelY },
    [
      label,
      sourceX,
      sourceY,
      targetX,
      targetY,
      defaultLabelX,
      defaultLabelY,
      labelW,
      labelH,
      boxes,
      leafBoxes,
    ],
  );

  const removeEdge = useDiagramStore((s) => s.removeEdge);
  const updateEdgeLabel = useDiagramStore((s) => s.updateEdgeLabel);
  const updateEdgeKind = useDiagramStore((s) => s.updateEdgeKind);
  const updateEdgeColor = useDiagramStore((s) => s.updateEdgeColor);
  const updateEdgeLine = useDiagramStore((s) => s.updateEdgeLine);
  const selectEdge = useDiagramStore((s) => s.selectEdge);
  const kind = (d.kind ?? 'link') as EdgeKind;

  // Inline label editor state. Ships in BOTH bundles. Users can:
  //   * Double-click the edge path OR the existing label pill to open it.
  //   * A brand-new edge auto-opens the editor (via the
  //     `pendingEdgeLabelEditId` bridge in diagram-store, set by
  //     DemoApp/Canvas's onConnect right after `addEdge`).
  //   * Enter commits, Escape cancels, blur commits (matches the
  //     shape-text-box editor pattern in ShapeOverlay).
  //
  // v0.9.53 — this was `IS_DEMO`-gated, which made prod the only build where
  // an edge label could not be edited on the canvas: double-clicking a label
  // pill did nothing at all. Shape text and node names were never gated, so
  // edge labels were the lone dead spot and it read as "text editing is
  // broken". Same class of over-gating already documented in
  // `useKeyboardShortcuts.ts` / `useClipboardShortcuts.ts`. Editing a label
  // is core authoring, not a demo flourish — do NOT re-gate it. The
  // `selected && DEMO_FEATURES` style toolbar below now ships in NEITHER
  // build (v0.9.56, so the two bundles behave identically); both offer
  // kind / colour / line-style in the SELECTED EDGE panel instead.
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingEdgeLabelEditId = useDiagramStore((s) => s.pendingEdgeLabelEditId);
  const setPendingEdgeLabelEditId = useDiagramStore(
    (s) => s.setPendingEdgeLabelEditId,
  );
  useEffect(() => {
    if (pendingEdgeLabelEditId === id) {
      setDraftLabel(typeof label === 'string' ? label : '');
      setIsEditing(true);
      selectEdge(id);
      setPendingEdgeLabelEditId(null);
    }
  }, [pendingEdgeLabelEditId, id, label, selectEdge, setPendingEdgeLabelEditId]);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const openEditor = () => {
    setDraftLabel(typeof label === 'string' ? label : '');
    setIsEditing(true);
    selectEdge(id);
  };
  const commitEdit = () => {
    updateEdgeLabel(id, draftLabel);
    setIsEditing(false);
  };
  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Wide invisible hit path over the visible edge path, so the double-click
  // target is generous — the visible path is often 1-2 px wide and hard to
  // hit. Ships in both bundles (see the v0.9.53 note above).
  const wideHitStroke = 18;
  const controlFrames = d.groupControls ?? [];
  const margin = Math.abs(d.offset ?? 20) + wideHitStroke + (d.borderRadius ?? 12);
  const hitBounds = boxPath({
    x: Math.min(sourceX, targetX) - margin,
    y: Math.min(sourceY, targetY) - margin,
    w: Math.abs(targetX - sourceX) + 2 * margin,
    h: Math.abs(targetY - sourceY) + 2 * margin,
  });
  // Cut only the hit target, not the drawn line. Selected frames retain
  // their resize border and connection dots, including dots already in use.
  const clips = controlFrames.map((box, index) => {
    const pad = Math.min(12, box.w / 2, box.h / 2);
    return {
      id: `${clipPrefix}-${index}`,
      d: hitBounds +
        boxPath({ x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad }) +
        boxPath({ x: box.x + pad, y: box.y + pad, w: box.w - 2 * pad, h: box.h - 2 * pad }),
    };
  });
  let hitRegion = (
      <path
        d={edgePath}
        data-nds-edge-hit={id}
        fill="none"
        stroke="transparent"
        strokeWidth={wideHitStroke}
        strokeLinecap="round"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          openEditor();
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectEdge(id);
        }}
      />
  );
  // Nested clips intersect, so overlapping selected borders never cancel out.
  for (const clip of clips) hitRegion = <g clipPath={`url(#${clip.id})`}>{hitRegion}</g>;

  return (
    <>
      <BaseEdge id={id} path={edgePath}
        style={clips.length ? { ...style, pointerEvents: 'none' } : style}
        interactionWidth={clips.length ? 0 : undefined} markerEnd={markerEnd} />
      {clips.length > 0 && <defs>{clips.map(clip => (
        <clipPath key={clip.id} id={clip.id} clipPathUnits="userSpaceOnUse">
          <path d={clip.d} clipRule="evenodd" />
        </clipPath>
      ))}</defs>}
      {hitRegion}
      {(label || selected || isEditing) && (
        <EdgeLabelRenderer>
          <div
            data-nds-edge-label={id}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            className="nodrag nopan"
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                  // Prevent RF's Delete-key shortcut from firing while
                  // the user is editing text.
                  e.stopPropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                data-nds-edge-label-input={id}
                placeholder={t('Label')}
                style={{
                  background: 'var(--nds-chip-bg)',
                  border: '1px solid #2563eb',
                  outline: 'none',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: labelFontPx,
                  lineHeight: 1.3,
                  color: 'var(--color-slate-900)',
                  fontFamily: 'system-ui, sans-serif',
                  minWidth: 80,
                  maxWidth: 260,
                }}
              />
            ) : (
              label && (
                <div
                  data-nds-edge-label-body={id}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openEditor();
                  }}
                  title={t('Double-click to edit label')}
                  style={{
                    background: 'var(--nds-chip-bg)',
                    border: selected ? '1px solid #2563eb' : '1px solid var(--nds-chip-border)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: labelFontPx,
                    lineHeight: 1.3,
                    color: 'var(--color-slate-700)',
                    fontFamily: 'system-ui, sans-serif',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.08)',
                    userSelect: 'none',
                    cursor: 'text',
                  }}
                >
                  {label}
                </div>
              )
            )}
            {/* Controls live in their OWN absolutely-positioned layer rather
                than as flex siblings of the label. v0.9.53: they used to sit
                in the same centred flex row, so the moment the first click
                selected the edge the row grew by the toolbar's width and the
                row's `translate(-50%, …)` slid the label pill left, out from
                under the pointer — the second click missed and `dblclick`
                never fired. The label was therefore un-editable by an
                ordinary double-click in the demo build (~200px of toolbar);
                prod only grew by the 20px delete button, so it merely felt
                twitchy. Anchoring the controls at `left: 100%` keeps the
                pill's box fixed whether or not the edge is selected. */}
            <div
              style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginLeft: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
            {selected && DEMO_FEATURES && !isEditing && (
              <>
                {/* Kind quick-picker — recreate any templated arrow style
                    (VPN dashed, ExpressRoute, HTTPS/backend, DNS, …) in
                    one click without leaving the canvas. */}
                <select
                  value={kind}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateEdgeKind(id, e.target.value as EdgeKind);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  data-nds-edge-kind={id}
                  title={t('Change arrow style')}
                  style={{
                    height: 20,
                    fontSize: 10,
                    fontFamily: 'system-ui, sans-serif',
                    padding: '0 4px',
                    background: 'var(--nds-panel)',
                    color: 'var(--color-slate-700)',
                    border: '1px solid var(--color-slate-300)',
                    borderRadius: 4,
                    boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  {EDGE_KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {EDGE_KIND_META[k]?.label ?? k}
                    </option>
                  ))}
                </select>
                {/* Colour swatches — same palette as the pen, so the app has
                    ONE set of colours. "Default" clears the override and
                    hands the edge back to its kind. Grouped in their own
                    chip so a 7-swatch row still reads as a single control
                    rather than loose dots floating over the canvas. */}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 4px',
                    borderRadius: 4,
                    background: 'var(--nds-panel)',
                    border: '1px solid var(--color-slate-300)',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                  }}
                >
                  {[undefined, ...PEN_COLORS.map((c) => c.hex)].map((hex) => {
                    const active = (d.color ?? undefined) === hex;
                    return (
                      <button
                        key={hex ?? 'default'}
                        type="button"
                        data-nds-edge-color={hex ?? 'default'}
                        title={hex ? t('Line colour') : t('Default colour')}
                        aria-label={hex ? t('Line colour') : t('Default colour')}
                        aria-pressed={active}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateEdgeColor(id, hex);
                        }}
                        style={{
                          width: 12,
                          height: 12,
                          padding: 0,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          flexShrink: 0,
                          // The "default" chip shows the kind's own colour, so
                          // you can see what you'd be reverting to. v0.9.30 —
                          // the rest go through `paintColor` so the chip
                          // previews what the edge will actually look like on
                          // the current theme.
                          background: paintColor(hex) ?? (EDGE_KIND_META[kind]?.color ?? 'var(--nds-edge-muted)'),
                          border: active
                            ? '2px solid var(--color-slate-900)'
                            : '1px solid var(--color-slate-400)',
                          boxShadow: hex ? 'none' : 'inset 0 0 0 2px var(--nds-panel)',
                        }}
                      />
                    );
                  })}
                </span>
                {/* Line pattern — solid vs dashed vs dotted. Kept beside the
                    colour chip because the two answer the same question
                    ("how should this connection look?") and are almost always
                    used together: a Primary/Backup pair is one colour, two
                    patterns. "Auto" previews the kind's own pattern. */}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    padding: '2px 3px',
                    borderRadius: 4,
                    background: 'var(--nds-panel)',
                    border: '1px solid var(--color-slate-300)',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                  }}
                >
                  {EDGE_LINE_STYLES.map((opt) => {
                    const active = (d.line ?? undefined) === opt.id;
                    const dash = opt.id ? opt.preview : (resolveEdgeDash(kind) ?? '');
                    return (
                      <button
                        key={opt.id ?? 'auto'}
                        type="button"
                        data-nds-edge-line={opt.id ?? 'auto'}
                        title={t(opt.label)}
                        aria-label={t(opt.label)}
                        aria-pressed={active}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateEdgeLine(id, opt.id);
                        }}
                        style={{
                          width: 22,
                          height: 14,
                          padding: 0,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 3,
                          cursor: 'pointer',
                          flexShrink: 0,
                          // Tint the "Auto" slot so it reads as REVERT rather
                          // than a fourth pattern — its preview is identical
                          // to one of the others whenever the kind matches.
                          background:
                            active || !opt.id ? 'var(--color-slate-100)' : 'transparent',
                          border: active
                            ? '1.5px solid var(--color-slate-900)'
                            : '1px solid var(--color-slate-300)',
                        }}
                      >
                        <svg width={16} height={8} aria-hidden="true">
                          <line
                            x1={1}
                            y1={4}
                            x2={15}
                            y2={4}
                            stroke={paintColor(d.color) ?? (EDGE_KIND_META[kind]?.color ?? 'var(--nds-edge-muted)')}
                            strokeWidth={1.75}
                            strokeLinecap="butt"
                            strokeDasharray={dash || undefined}
                          />
                        </svg>
                      </button>
                    );
                  })}
                </span>
                {!label && (
                  <button
                    type="button"
                    title={t('Add label')}
                    aria-label={t('Add label')}
                    data-nds-edge-add-label={id}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditor();
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--nds-panel)',
                      border: '1px solid #2563eb',
                      color: '#2563eb',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                    }}
                  >
                    A
                  </button>
                )}
              </>
            )}
            {selected && !isEditing && (
              <button
                type="button"
                title={t('Delete arrow')}
                aria-label={t('Delete arrow')}
                data-nds-edge-delete={id}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeEdge(id);
                }}
                style={{
                  width: 20,
                  height: 20,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--nds-panel)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                }}
              >
                ×
              </button>
            )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
