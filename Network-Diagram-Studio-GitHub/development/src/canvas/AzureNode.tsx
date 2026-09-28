import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { NodeResizer, NodeToolbar, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  ConnectHandles,
  RESIZE_HANDLE_STYLE,
  RESIZE_LINE_STYLE,
  RESIZE_TAIL_MS,
} from './handles';
import { CATEGORIES_ORDER, RESOURCE_TYPES, getResourceType } from '../model/resource-types';
import { leafFootprint, NAME_MAX_LINES } from '../model/professional-layout';
import { leafAppearance } from '../model/leaf-appearance';
import { LEAF_RESIZE_MIN_H, LEAF_RESIZE_MIN_W } from '../model/size-match';
import { useDiagramStore } from '../store/diagram-store';
import { DIAGRAM_TYPE_SCALE, useDiagramTextFactor } from '../theme/type-scale';
import { STATE_BG, STATE_STROKE } from './state';
import type { StateColor } from '../model/types';
import { useT } from '../i18n/useT';
import type { DiagramNode } from '../model/types';
import { customFieldLabel } from '../model/custom-fields';
import { runtimeExtensions } from '../runtime/extensions';
import type { BBox } from '../model/containment';
import { ResourceHitRegion } from './ResourceHitRegion';

/**
 * Ceiling on how much dragging a card bigger scales its text. Without a cap,
 * a node stretched across half the canvas would render a 60px name. 2.5x is
 * about where a card stops reading as a card.
 */
const MAX_BOX_TEXT_SCALE = 2.5;

export interface AzureNodeData extends Record<string, unknown> {
  name: string;
  subtitle?: string;
  state?: StateColor;
  typeSlug: string;
  iconId?: string;
  iconSize?: number;
  typeLabel?: string;
  typeCaption?: string;
  fields?: Record<string, string>;
  notes?: string;
  /** Multiplier on default font sizes for name + type. 1 = default. */
  textScale?: number;
  /**
   * True while MORE THAN ONE node is selected. The floating A− / A+ toolbar
   * hides then: it edits exactly one card, and a marquee over ten of them
   * would otherwise stack ten identical toolbars over the diagram.
   */
  multiSelected?: boolean;
  /** Render-only, node-local holes in the transparent card's background hit area. */
  hitExclusions?: BBox[];
}

type AzureFlowNode = Node<AzureNodeData, 'azure'>;

export function AzureNode(props: NodeProps<AzureFlowNode>) {
  return <AzureNodeInner {...props} />;
}

// Memoized inner component. React.memo's default shallow compare is safe
// because React Flow passes the SAME data/id/selected/width/height object
// references when nothing has changed for this node — so unrelated store
// updates (moving another node, editing another node's fields) no longer
// re-render every card on the canvas. Big win on large diagrams.
const AzureNodeInner = memo(function AzureNodeInner({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<AzureFlowNode>) {
  const t = useT();
  const rt = getResourceType(data.typeSlug);
  const iconId = data.iconId ?? rt.iconId;
  const typeLabel = data.typeLabel ?? rt.label;
  // Every card wears the same ring. `state` used to tint it (amber for
  // degraded, red for broken) alongside the badge that was removed in
  // v0.9.60; a diagram loaded with `state: 'broken'` therefore painted
  // resources red. Both signals are gone now — a resource always renders
  // the neutral "ok" ring, and `state` survives only in the file.
  const stroke = STATE_STROKE.ok;
  const bg = STATE_BG.ok;

  // Inline name editor — activated by double-clicking the name label.
  // Enter/blur commits; Esc cancels. Uses the diagram store's
  // `updateNodeName` so undo history captures the rename.
  const updateNodeName = useDiagramStore((s) => s.updateNodeName);
  const updateNodeType = useDiagramStore((s) => s.updateNodeType);
  const updateNodeTextScale = useDiagramStore((s) => s.updateNodeTextScale);
  // Resize writes to the store on every pointer move, so the gesture
  // brackets itself and contributes exactly one undo frame on release.
  const beginGesture = useDiagramStore((s) => s.beginGesture);
  const commitGesture = useDiagramStore((s) => s.commitGesture);
  // v0.9.61 — resize snapping. See GroupNode for why these read primitives
  // out of `resizeHint` instead of subscribing to the object itself.
  const beginResize = useDiagramStore((s) => s.beginResize);
  const endResize = useDiagramStore((s) => s.endResize);
  const sizeReadout = useDiagramStore((s) => {
    const h = s.resizeHint;
    if (!h || h.nodeId !== id) return null;
    const size = `${Math.round(h.w)} × ${Math.round(h.h)}`;
    return h.matchName ? `${size}  =  ${h.matchName}` : size;
  });
  const isSnapped = useDiagramStore(
    (s) => !!s.resizeHint && s.resizeHint.nodeId === id && !!s.resizeHint.matchName
  );
  const isSnapTarget = useDiagramStore((s) => !!s.resizeHint && s.resizeHint.matchId === id);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editingName) {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editingName]);
  const commitName = () => {
    const next = draftName.trim();
    if (next !== data.name) updateNodeName(id, next);
    setEditingName(false);
  };
  const cancelName = () => {
    setDraftName(data.name);
    setEditingName(false);
  };

  // Inline type editor — double-click the small "type" caption above the
  // name to open a compact <select> populated with every resource type
  // (grouped by category, alphabetized inside each group) so users can
  // change the resource type without opening the property panel. Pick →
  // commit via onChange + blur; Esc cancels without applying.
  const [editingType, setEditingType] = useState(false);
  const typeSelectRef = useRef<HTMLSelectElement | null>(null);
  useEffect(() => {
    if (editingType) typeSelectRef.current?.focus();
  }, [editingType]);
  const groupedTypes = useMemo(() => {
    const g = new Map<string, typeof RESOURCE_TYPES>();
    for (const r of RESOURCE_TYPES) {
      if (r.isGroup) continue; // Leaf editor: only offer non-group types.
      const arr = g.get(r.category) ?? [];
      arr.push(r);
      g.set(r.category, arr);
    }
    return g;
  }, []);
  const commitType = (next: string) => {
    if (next && next !== data.typeSlug) updateNodeType(id, next);
    setEditingType(false);
  };

  // Font sizes. Four multipliers compose: the shared baseline in
  // DIAGRAM_TYPE_SCALE, the workspace-wide "Diagram text size" setting,
  // this node's own A- / A+ scale (property panel or floating toolbar,
  // clamped 0.5..3 by the store action), and how far the user has dragged
  // the card past its natural size. Every piece of text on the card scales
  // together — previously only the name and type caption responded, which
  // left the detail rows unreadably small on an enlarged node.
  const textScale = typeof data.textScale === 'number' ? data.textScale : 1;
  const globalFactor = useDiagramTextFactor();

  // Non-empty user-filled properties, resolved through the resource-type
  // field definitions so we get proper labels (e.g. "Private IP") rather
  // than raw keys ("privateIp"). Kept in the field-definition order so the
  // card order matches the property panel.
  //
  // Custom fields (keys added via "+ Add custom field" in the panel that
  // aren't in `rt.fields`) are appended AFTER the type-defined ones,
  // preserving insertion order via Object.entries. The user types the
  // field name themselves, so the key IS the display label.
  const filledFields: { label: string; value: string }[] = [];
  const fieldValues = data.fields;
  if (fieldValues) {
    const knownKeys = new Set<string>();
    for (const def of rt.fields) {
      knownKeys.add(def.key);
      const v = fieldValues[def.key];
      if (v && String(v).trim() !== '') {
        filledFields.push({ label: def.label, value: String(v) });
      }
    }
    for (const [key, value] of Object.entries(fieldValues)) {
      if (knownKeys.has(key)) continue;
      if (!value || String(value).trim() === '') continue;
      filledFields.push({ label: customFieldLabel(key), value: String(value) });
    }
  }
  const hasFields = filledFields.length > 0;
  const hasNotes = !!(data.notes && data.notes.trim() !== '');

  const w = width ?? 180;
  const h = height ?? 150;

  // Dragging a card bigger should make what's INSIDE it bigger — otherwise
  // enlarging a node just adds empty space around the same tiny text, which
  // is the opposite of what the gesture implies. `leafFootprint` already
  // knows the card's natural size for this data at the current global
  // factor, so the ratio between the actual box and that natural box is a
  // direct "how much roomier did the user make this?" multiplier.
  //
  // Uses the SMALLER of the two axis ratios: widening a card alone must not
  // scale text up, or the taller text would overflow the unchanged height.
  // Clamped at 1 so a card narrower than natural (several templates author
  // 180px-wide boxes) never shrinks its text below the design scale.
  const natural = useMemo(
    () =>
      leafFootprint(
        { id, type: data.typeSlug, position: { x: 0, y: 0 }, data } as DiagramNode,
        globalFactor,
        w
      ),
    [id, data, globalFactor, w]
  );
  const boxScale = Math.min(
    MAX_BOX_TEXT_SCALE,
    Math.max(1, Math.min(w / natural.w, h / natural.h))
  );

  const px = (base: number) => base * globalFactor * textScale * boxScale;
  const nameFontPx = px(DIAGRAM_TYPE_SCALE.nodeName);
  const typeFontPx = px(DIAGRAM_TYPE_SCALE.nodeType);

  // The icon ring is sized from the TYPE SCALE, not from the card box.
  //
  // It used to be `0.36 * min(w, h)`, which coupled the two: shrinking a
  // card down to its content also shrank its icon, so there was no way to
  // remove dead space without losing the glyph that makes a resource
  // recognisable at a glance. Deriving it from the font factor lets the card
  // hug its content while the icon stays big, and `boxScale` already grows
  // it in step with the text when the card is dragged bigger — so there is
  // no `min(w, h)` term any more. Keeping one made the ring grow FASTER
  // than the text on an enlarged card and pushed the notes past the bottom.
  // 52 for every card. This used to be 64 on a bare card to fill the dead
  // space a 260x161 box left around the icon; now that a bare card is
  // 208x137 there is no dead space to fill, and a 64 ring no longer fits
  // above the name. Detail cards were already 52 and are unchanged.
  const ringPx = Math.round(52 * globalFactor * boxScale);
  const iconPx = Math.round(ringPx * 0.65);

  // The row card comes from the optional `appearance.js` sidecar, and only
  // for real leaves: a node other nodes sit inside is drawn as a container
  // and keeps the plain box. Absent sidecar, everything below is inert and
  // the built-in centred card renders unchanged.
  const appearance = leafAppearance();
  const rowAppearance = appearance && !appearance.isContainer(id) ? appearance : undefined;
  const rowCard = !!rowAppearance;
  const showTypeCaption = rowAppearance?.showTypeCaption?.(data, typeLabel) ?? true;
  const minResizeW = rowAppearance?.minimumWidth(globalFactor, textScale, data.iconSize) ?? LEAF_RESIZE_MIN_W;
  const minResizeH = rowAppearance ? natural.h : LEAF_RESIZE_MIN_H;
  const captions = runtimeExtensions().ndsNonProductionCaptions;
  const hitExclusions = rowCard ? data.hitExclusions : undefined;

  return (
    <>
    {hitExclusions && <ResourceHitRegion width={w} height={h} exclusions={hitExclusions} />}
    {/* ⚠️ The card is `overflow-hidden` (to clip content to its rounded
        corners), so anything that must stick OUT past the border — the
        connect dots, which straddle it, and the resize grips — has to be a
        SIBLING of it, not a child. Rendered after the card so they paint
        on top of it. React Flow's own `.react-flow__node` wrapper is the
        positioning context either way, so the geometry is unchanged. */}
    <div
      data-nds-node-id={id}
      className={`nds-node rounded-xl shadow-sm border overflow-hidden flex flex-col w-full h-full relative ${rowCard ? 'nds-leaf-row ' : ''}${hitExclusions ? 'nds-resource-hit-through ' : ''}${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        background: 'var(--nds-node-bg)',
        borderColor: 'var(--nds-node-border)',
        /* The row skin is driven entirely by these three custom properties,
           so they travel with the class — see `model/leaf-appearance.ts`. */
        ...rowAppearance?.variables(globalFactor, textScale, data.iconSize),
        /* v0.9.61 — this is the card whose size is being copied by a
           resize happening elsewhere. Outline, not ring: it sits outside
           the border so it cannot nudge the card's own geometry. */
        ...(isSnapTarget ? { outline: '2px dashed #2563eb', outlineOffset: '3px' } : null),
      }}
    >

      {/* Floating text-size toolbar. Rendered via React Flow's built-in
          `NodeToolbar`, which portals into the pane overlay layer while
          keeping selection tracking intact — a manual `absolute` floater
          above the node body would break ReactFlow's on-node click
          detection and instantly deselect the node on the first press.
          The three buttons apply a multiplier: A- shrinks by 0.1, the %
          badge resets to 1.0, A+ grows by 0.1 (clamped 0.5..3). */}
      <NodeToolbar isVisible={selected && data.multiSelected !== true} position={Position.Top} offset={8}>
        <div
          className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md shadow-sm"
          style={{ padding: '2px' }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-6 h-6 leading-none rounded hover:bg-slate-100 text-slate-700"
            style={{ fontSize: 11, fontWeight: 600 }}
            title={t('Shrink text')}
            data-nds-text-scale="down"
            onClick={(e) => {
              e.stopPropagation();
              updateNodeTextScale(id, Math.max(0.5, textScale - 0.1));
            }}
          >
            A−
          </button>
          <button
            type="button"
            className="px-1.5 h-6 leading-none rounded hover:bg-slate-100 text-slate-500 tabular-nums"
            style={{ fontSize: 10 }}
            title={t('Reset to default size')}
            data-nds-text-scale="reset"
            onClick={(e) => {
              e.stopPropagation();
              updateNodeTextScale(id, 1);
            }}
          >
            {Math.round(textScale * 100)}%
          </button>
          <button
            type="button"
            className="w-6 h-6 leading-none rounded hover:bg-slate-100 text-slate-700"
            style={{ fontSize: 14, fontWeight: 700 }}
            title={t('Enlarge text')}
            data-nds-text-scale="up"
            onClick={(e) => {
              e.stopPropagation();
              updateNodeTextScale(id, Math.min(3, textScale + 0.1));
            }}
          >
            A+
          </button>
        </div>
      </NodeToolbar>

      {/* Content is vertically centered so the icon + text stay together
          as the card is enlarged (rather than sticking to the top). */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-2 py-1.5 gap-0.5">
        <div
          className="rounded-full grid place-items-center border-2 flex-shrink-0"
          style={{
            borderColor: stroke,
            background: bg,
            width: ringPx,
            height: ringPx,
          }}
        >
          <svg width={iconPx} height={iconPx} aria-hidden="true">
            <use href={`#ic-${iconId}`} />
          </svg>
        </div>

        <div className="text-center w-full px-1 min-w-0">
          {showTypeCaption && (captions ? captions.caption({ id, data, fontSize: typeFontPx }) : <div
            /* `nds-type-caption` marks this as the small type caption rather
               than the node name. The row-card skin in `appearance.css` sizes
               everything else in here as the name, so without the marker the
               caption is drawn at the name's 19px and wraps. */
            className="nds-type-caption font-semibold uppercase tracking-wide leading-tight"
            style={{
              color: 'var(--color-slate-500)',
              fontSize: typeFontPx,
              cursor: editingType ? 'default' : 'pointer',
            }}
            title={
              editingType ? t('Choose a type…') : `${typeLabel} — ${t('double-click to change type')}`
            }
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingType(true);
            }}
          >
            {editingType ? (
              <select
                ref={typeSelectRef}
                value={data.typeSlug}
                onChange={(e) => commitType(e.target.value)}
                onBlur={() => setEditingType(false)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') setEditingType(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-center font-semibold uppercase tracking-wide leading-tight bg-white border border-blue-400 rounded px-1 outline-none focus:ring-2 focus:ring-blue-500"
                style={{ color: 'var(--color-slate-900)', fontSize: typeFontPx }}
              >
                {CATEGORIES_ORDER.filter((c) => groupedTypes.has(c)).map((c) => (
                  <optgroup key={c} label={c}>
                    {(groupedTypes.get(c) ?? [])
                      .slice()
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              typeLabel
            )}
          </div>)}
          <div
            className="font-semibold leading-tight break-words"
            style={{
              color: 'var(--color-slate-900)',
              cursor: editingName ? 'text' : 'pointer',
              fontSize: nameFontPx,
              // The card was sized to fit this name (see `leafFootprint`),
              // so it normally renders whole. The clamp is the backstop for
              // a name past LEAF_MAX_W, or a card the user dragged narrower
              // than its content — and it MUST agree with `nameLines`, which
              // bought the height for the second line.
              display: editingName ? undefined : '-webkit-box',
              WebkitLineClamp: NAME_MAX_LINES,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={editingName ? t('Editing…') : `${data.name} — ${t('double-click to rename')}`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraftName(data.name);
              setEditingName(true);
            }}
          >
            {editingName ? (
              <input
                ref={inputRef}
                type="text"
                value={draftName}
                onDoubleClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') commitName();
                  else if (e.key === 'Escape') cancelName();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onBlur={commitName}
                className="w-full text-center font-semibold leading-tight bg-white border border-blue-400 rounded px-1 outline-none focus:ring-2 focus:ring-blue-500"
                style={{ color: 'var(--color-slate-900)', fontSize: nameFontPx }}
              />
            ) : (
              data.name
            )}
          </div>
          {data.subtitle && (
            <div
              className="truncate mt-0.5 leading-tight"
              style={{ color: 'var(--color-slate-500)', fontSize: px(DIAGRAM_TYPE_SCALE.nodeSubtitle) }}
              title={data.subtitle}
            >
              {data.subtitle}
            </div>
          )}
        </div>

        {hasFields && (
          <div className="w-full px-1 mt-0.5 min-w-0 flex flex-col gap-[1px]">
            {filledFields.map((f) => (
              <div
                key={f.label}
                className="flex items-baseline gap-1.5 leading-tight min-w-0"
                title={`${f.label}: ${f.value}`}
              >
                <span
                  className="uppercase tracking-wide font-semibold shrink-0"
                  style={{ color: 'var(--color-slate-400)', fontSize: px(DIAGRAM_TYPE_SCALE.fieldLabel) }}
                >
                  {f.label}
                </span>
                <span
                  className="truncate min-w-0 flex-1 text-right"
                  style={{ color: 'var(--color-slate-700)', fontSize: px(DIAGRAM_TYPE_SCALE.fieldValue) }}
                >
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasNotes && (
          <div
            className="w-full px-1 min-w-0"
            style={{
              marginTop: 3,
              paddingTop: hasFields ? 3 : 0,
              borderTop: hasFields ? '1px solid var(--nds-node-border)' : undefined,
            }}
            title={data.notes}
          >
            <div
              className="uppercase tracking-wide font-semibold leading-tight"
              style={{ color: 'var(--color-slate-400)', fontSize: px(DIAGRAM_TYPE_SCALE.notesLabel) }}
            >
              NOTES
            </div>
            <div
              className="whitespace-pre-wrap break-words leading-tight italic"
              data-nds-node-notes="1"
              style={{
                color: 'var(--color-slate-600)',
                fontSize: px(DIAGRAM_TYPE_SCALE.notesBody),
              }}
            >
              {data.notes}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Explicit resize UI, shown while the card is selected. SQUARE grips
        at the four corners resize both axes; the accent frame between them
        resizes one axis (React Flow gives each side an ns-/ew-resize
        cursor). There is deliberately NO grip at a side MIDPOINT: that is
        where the connect dot lives, and keeping the two affordances on
        different pixels is what lets both stay live at the same time. */}
    <NodeResizer
      /* `beginResize` marks this as a hand-driven resize so Canvas may
         snap it to another card's width or height. */
      onResizeStart={() => {
        beginGesture();
        beginResize(id, width ?? minResizeW, height ?? minResizeH);
      }}
      onResizeEnd={() => {
        commitGesture();
        window.setTimeout(() => endResize(id), RESIZE_TAIL_MS);
      }}
      isVisible={selected}
      minWidth={minResizeW}
      minHeight={minResizeH}
      lineStyle={RESIZE_LINE_STYLE}
      handleStyle={RESIZE_HANDLE_STYLE}
    />

    {/* Live size readout while a grip is dragged; turns blue and names the
        other card when the box locks onto its size. Mirrors GroupNode. */}
    <NodeToolbar isVisible={!!sizeReadout} position={Position.Bottom} offset={8} align="end">
      <div
        data-nds-size-readout="1"
        className="rounded-md px-2 py-0.5 tabular-nums text-white shadow-sm"
        style={{
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          background: isSnapped ? '#2563eb' : 'rgba(15,23,42,0.85)',
        }}
      >
        {sizeReadout}
      </div>
    </NodeToolbar>

    {/* Connect points: 4 side midpoints + 8 quarter dots, source and
        target on each so an edge can enter/exit whichever face is
        nearest its peer. Canvas.tsx picks the source/target handle per
        edge from the relative absolute positions of the two nodes
        (Top↔Bottom for vertical neighbours, Left↔Right for horizontal).
        Hidden via CSS until the card is hovered or selected. */}
    <ConnectHandles />
    </>
  );
});