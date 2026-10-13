import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { NodeResizer, NodeToolbar, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  ConnectHandles,
  RESIZE_HANDLE_STYLE,
  RESIZE_LINE_STYLE,
  RESIZE_TAIL_MS,
} from './handles';
import { getResourceType } from '../model/resource-types';
import { useDiagramStore } from '../store/diagram-store';
import { DIAGRAM_TYPE_SCALE, useDiagramTextFactor } from '../theme/type-scale';
import {
  GROUP_ICON_PX,
  GROUP_MIN_W,
  GROUP_MIN_H,
  groupHeaderScale,
  groupNotesTop,
  GROUP_FIELDS_MAX_FRACTION,
} from '../model/professional-layout';
import {
  GROUP_RESIZE_MIN_H,
  GROUP_RESIZE_MIN_W,
  isGroupNode,
  renderedSize,
} from '../model/size-match';
import type { StateColor } from '../model/types';
import { useT } from '../i18n/useT';
import { customFieldLabel } from '../model/custom-fields';

export interface GroupNodeData extends Record<string, unknown> {
  name: string;
  typeSlug: string;
  state?: StateColor;
  iconId?: string;
  typeLabel?: string;
  fields?: Record<string, string>;
  notes?: string;
  /** Multiplier on the default header font size. 1 = default. */
  textScale?: number;
  /** True while MORE THAN ONE node is selected — see AzureNodeData. */
  multiSelected?: boolean;
}

type GroupFlowNode = Node<GroupNodeData, 'azureGroup'>;

function GroupFieldChip({
  nodeId, fieldKey, label, value, fontSize,
}: {
  nodeId: string;
  fieldKey: string;
  label: string;
  value: string;
  fontSize: number;
}) {
  const t = useT();
  const updateNodeField = useDiagramStore((s) => s.updateNodeField);
  const [draft, setDraft] = useState<string | null>(null);
  const activeEdit = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    }
  }, [editing]);

  const start = () => {
    activeEdit.current = true;
    setDraft(value);
  };
  const finish = (save: boolean, restoreFocus = false) => {
    // Enter/Escape removes the input; its later blur must not commit twice.
    if (!activeEdit.current) return;
    activeEdit.current = false;
    const group = inputRef.current?.closest<HTMLElement>('.react-flow__node');
    setDraft(null);
    if (save && draft !== null && draft !== value) {
      updateNodeField(nodeId, fieldKey, draft, { coalesce: false });
    }
    if (restoreFocus) {
      requestAnimationFrame(() => (chipRef.current ?? group)?.focus({ preventScroll: true }));
    }
  };
  const chipStyle: CSSProperties = {
    background: 'var(--color-slate-100)',
    color: 'var(--color-slate-700)',
    border: '1px solid var(--color-slate-200)',
    fontSize,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    pointerEvents: 'auto',
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    lineHeight: 1.5,
  };

  if (draft !== null) {
    return <input
      ref={inputRef}
      data-nds-group-field-input={fieldKey}
      aria-label={label}
      type="text"
      value={draft}
      autoComplete="off"
      spellCheck={false}
      className="nodrag nopan nowheel px-1 rounded shrink-0 outline-none ring-2 ring-blue-500"
      style={{ ...chipStyle, width: `${Math.min(60, Math.max(8, value.length, draft.length)) + 1}ch` }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          finish(event.key === 'Enter', true);
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    />;
  }

  return <span
    ref={chipRef}
    data-nds-group-field={fieldKey}
    role="button"
    tabIndex={0}
    aria-label={`${label}: ${value}`}
    className="px-1 rounded shrink-0 focus-visible:outline-2 focus-visible:outline-blue-500"
    style={{ ...chipStyle, cursor: 'text' }}
    title={`${label}: ${value} — ${t('Double-click to edit value')}`}
    onDoubleClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      start();
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'F2') {
        event.preventDefault();
        event.stopPropagation();
        start();
      }
    }}
  >{value}</span>;
}

export function GroupNode(props: NodeProps<GroupFlowNode>) {
  return <GroupNodeInner {...props} />;
}

// Memoized inner component — see AzureNode for rationale.
const GroupNodeInner = memo(function GroupNodeInner({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<GroupFlowNode>) {
  const t = useT();
  const rt = getResourceType(data.typeSlug);
  const iconId = data.iconId ?? rt.iconId;
  const color = rt.color ?? '#94a3b8';

  // Inline name editor for the container header.
  const updateNodeName = useDiagramStore((s) => s.updateNodeName);
  const updateNodeTextScale = useDiagramStore((s) => s.updateNodeTextScale);
  // Resize writes to the store on every pointer move, so the gesture
  // brackets itself and contributes exactly one undo frame on release.
  const beginGesture = useDiagramStore((s) => s.beginGesture);
  const commitGesture = useDiagramStore((s) => s.commitGesture);
  // v0.9.61 — resize snapping. `beginResize`/`endResize` mark the drag as
  // hand-driven so `Canvas` knows it may snap this box to a neighbour's
  // dimensions; `matchNodeSize` is the deliberate one-click version.
  const beginResize = useDiagramStore((s) => s.beginResize);
  const endResize = useDiagramStore((s) => s.endResize);
  const matchNodeSize = useDiagramStore((s) => s.matchNodeSize);
  /* Both of these read PRIMITIVES out of `resizeHint`, never the object.
     The hint is rewritten on every pointer move of a resize, so a
     `(s) => s.resizeHint` selector would re-render every container on the
     canvas at pointer rate for a drag happening on ONE of them. A string
     and a boolean compare equal for the containers that aren't involved,
     and zustand then skips them entirely. */
  const sizeReadout = useDiagramStore((s) => {
    const h = s.resizeHint;
    if (!h || h.nodeId !== id) return null;
    const size = `${Math.round(h.w)} × ${Math.round(h.h)}`;
    return h.matchName ? `${size}  =  ${h.matchName}` : size;
  });
  const isSnapped = useDiagramStore(
    (s) => !!s.resizeHint && s.resizeHint.nodeId === id && !!s.resizeHint.matchName
  );
  // True on the OTHER container — the one whose size is being copied. It
  // outlines itself so the match is visible at both ends of the gesture.
  const isSnapTarget = useDiagramStore(
    (s) => !!s.resizeHint && s.resizeHint.matchId === id
  );
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
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
    if (next && next !== data.name) updateNodeName(id, next);
    setEditingName(false);
  };
  const cancelName = () => {
    setDraftName(data.name);
    setEditingName(false);
  };

  // v0.9.74 — the container header shows icon + name + field chips only. The
  // uppercase TYPE caption that used to sit beside the name was removed as
  // clutter: a box drawn as a container, carrying a CIDR chip and a VNet
  // icon, has already said what it is. Changing a container's type now lives
  // solely in the Property Panel's "Resource type" dropdown, which is why the
  // inline <select> and its state are gone from here too.

  const textScale = typeof data.textScale === 'number' ? data.textScale : 1;
  const globalFactor = useDiagramTextFactor();

  /* "Match size" menu. The peer list is snapshotted when the menu OPENS
     rather than subscribed to, for the same reason as `sizeReadout` above:
     a live `s.diagram.nodes` subscription in a node component re-renders
     every container whenever anything anywhere moves. Nothing can change
     the list while the menu is open — it closes on deselect. */
  const [matchOpen, setMatchOpen] = useState(false);
  const [peers, setPeers] = useState<{ id: string; name: string; w: number; h: number }[]>([]);
  useEffect(() => {
    if (!selected) setMatchOpen(false);
  }, [selected]);
  const openMatchMenu = () => {
    const all = useDiagramStore.getState().diagram.nodes;
    setPeers(
      all
        .filter((n) => n.id !== id && isGroupNode(n))
        .map((n) => {
          const s = renderedSize(n, globalFactor);
          return { id: n.id, name: n.data.name, w: Math.round(s.w), h: Math.round(s.h) };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setMatchOpen(true);
  };

  // Enlarging a container should enlarge its label, exactly as enlarging a
  // leaf card enlarges its contents. The ratio is damped and capped, though:
  // a leaf is only big because the user dragged it, but a container is big
  // because of what it HOLDS, so the raw box ratio would turn a region into
  // a billboard. See `groupHeaderScale`.
  const boxScale = groupHeaderScale(width ?? GROUP_MIN_W, height ?? GROUP_MIN_H);

  const px = (base: number) => base * globalFactor * textScale * boxScale;
  const nameFontPx = px(DIAGRAM_TYPE_SCALE.groupName);
  const iconPx = Math.round(px(GROUP_ICON_PX));
  // The notes preview is absolutely positioned under the header pill, so it
  // has to clear whatever height the pill actually takes at the current
  // scale. `groupNotesTop` owns that arithmetic and is the same helper the
  // layout uses to reserve room above the first child.
  const headerContent = { name: data.name, fields: data.fields, boxW: width ?? GROUP_MIN_W };
  const notesTopPx = headerHeight > 0 ? 6 + headerHeight + 3 :
    groupNotesTop(globalFactor * textScale, boxScale, headerContent);

  // Inline the group's non-empty properties (CIDR, region, RG name, etc.)
  // right in the header pill so containers show their scope at a glance —
  // exactly like Microsoft reference diagrams show "10.0.0.0/16" next to
  // a VNet's name.
  //
  // Custom fields (added via "+ Add custom field" in the panel) are
  // appended after the type-defined ones so containers surface user
  // annotations on the canvas too. The typed field name IS the label.
  const filledFields: { key: string; label: string; value: string }[] = [];
  const fieldValues = data.fields;
  if (fieldValues) {
    const knownKeys = new Set<string>();
    for (const def of rt.fields) {
      knownKeys.add(def.key);
      const v = fieldValues[def.key];
      if (v && String(v).trim() !== '') {
        filledFields.push({ key: def.key, label: def.label, value: String(v) });
      }
    }
    for (const [key, value] of Object.entries(fieldValues)) {
      if (knownKeys.has(key)) continue;
      if (!value || String(value).trim() === '') continue;
      filledFields.push({ key, label: customFieldLabel(key), value: String(value) });
    }
  }
  const hasNotes = !!(data.notes && data.notes.trim() !== '');
  useLayoutEffect(() => {
    if (!hasNotes) return;
    const header = headerRef.current!;
    const measure = () => setHeaderHeight(header.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [hasNotes]);

  return (
    <div
      className={`nds-group-box h-full w-full relative rounded-xl ${selected ? 'ring-2 ring-blue-500' : ''}`}
      data-nds-selected={selected ? 'true' : undefined}
      style={
        {
          // Exposed to CSS so dark mode can derive a brighter dashed border
          // from the container's own brand colour (see .nds-group-box).
          '--nds-gc': color,
          background: `${color}0F`,
          border: `1.5px dashed ${color}`,
          boxSizing: 'border-box',
          /* v0.9.61 — this is the container someone is currently snapping
             TO. An outline (not a border, not a ring) because it sits
             OUTSIDE the box and so cannot shift the dashed brand border by
             a pixel while it flashes. */
          ...(isSnapTarget
            ? { outline: '2px dashed #2563eb', outlineOffset: '3px' }
            : null),
        } as React.CSSProperties
      }
    >
      <NodeResizer
        /* The gesture bracket is the undo frame; `beginResize` is what
           tells Canvas this dimensions change came from a HAND and may be
           snapped to a neighbour. See `resizeHint` in the diagram store. */
        onResizeStart={() => {
          beginGesture();
          beginResize(id, width ?? GROUP_MIN_W, height ?? GROUP_MIN_H);
        }}
        onResizeEnd={() => {
          commitGesture();
          window.setTimeout(() => endResize(id), RESIZE_TAIL_MS);
        }}
        isVisible={selected}
        minWidth={GROUP_RESIZE_MIN_W}
        minHeight={GROUP_RESIZE_MIN_H}
        lineStyle={RESIZE_LINE_STYLE}
        handleStyle={RESIZE_HANDLE_STYLE}
      />
      {/* Resize UI: SQUARE grips at the corners, accent frame between them
          for single-axis drags. No grip at a side midpoint — that pixel
          belongs to the connect dot. Matches AzureNode. */}

      <ConnectHandles />

      {/* Floating text-size toolbar for group headers — see AzureNode for
          rationale. Uses ReactFlow's NodeToolbar so selection tracking
          isn't broken. Positioned top-right to leave room for the header
          pill on the left. */}
      <NodeToolbar isVisible={selected && data.multiSelected !== true} position={Position.Top} offset={8} align="end">
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

          {/* v0.9.61 — "match size". Copies another container's box onto
              this one, clamped so it still fits its own children and its
              own header pill. The menu is the deliberate counterpart to
              drag-snapping: it needs no aim and it works when the two
              containers are nowhere near each other on the canvas. */}
          <span
            aria-hidden="true"
            style={{ width: 1, height: 16, background: 'var(--color-slate-200)', margin: '0 2px' }}
          />
          <span className="relative flex items-center">
            <button
              type="button"
              className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 ${
                matchOpen ? 'bg-slate-100 text-blue-600' : 'text-slate-700'
              }`}
              title={t('Match size')}
              aria-label={t('Match size')}
              data-nds-match-size="toggle"
              onClick={(e) => {
                e.stopPropagation();
                if (matchOpen) setMatchOpen(false);
                else openMatchMenu();
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2.5" y="7" width="9" height="10" rx="1.5" />
                <rect x="14.5" y="4" width="7" height="16" rx="1.5" strokeDasharray="3 2" />
              </svg>
            </button>
            {matchOpen && (
              <div
                data-nds-match-size-menu="1"
                className="absolute right-0 top-7 z-50 min-w-[210px] max-h-[220px] overflow-auto rounded-md border border-slate-300 bg-white py-1 shadow-lg"
              >
                <div
                  className="px-2 pb-1 pt-0.5 text-slate-400"
                  style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {t('Copy the size of another container')}
                </div>
                {peers.length === 0 ? (
                  <div className="px-2 py-1 text-slate-400" style={{ fontSize: 11 }}>
                    {t('No other containers yet')}
                  </div>
                ) : (
                  peers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-2 py-1 text-left hover:bg-slate-100"
                      style={{ fontSize: 11 }}
                      data-nds-match-size-item={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        matchNodeSize(id, p.id);
                        setMatchOpen(false);
                      }}
                    >
                      <span className="truncate text-slate-700">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-slate-400">
                        {p.w} × {p.h}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </span>
        </div>
      </NodeToolbar>

      {/* Live size readout, shown only while a grip is being dragged. It
          turns blue and names the other container the moment the box locks
          onto its width or height, which is the entire feedback for the
          snap — there is no ghost line to draw because the box itself has
          already moved to the matching size. */}
      <NodeToolbar
        isVisible={!!sizeReadout}
        position={Position.Bottom}
        offset={8}
        align="end"
      >
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

      <div
        ref={headerRef}
        data-nds-group-header="1"
        className="absolute top-1.5 left-2 flex items-start gap-1.5 rounded px-1.5 py-0.5 pointer-events-none max-w-[calc(100%-1rem)]"
        style={{ background: 'var(--nds-pill-bg)', width: 'calc(100% - 1rem)' }}
      >
        <div className="flex flex-1 items-start gap-1.5 min-w-0">
        <svg width={iconPx} height={iconPx} className="shrink-0" aria-hidden="true">
          <use href={`#ic-${iconId}`} />
        </svg>
        <span
          data-nds-resource-name={id}
          className="font-semibold min-w-0 flex-1"
          style={{
            color: 'var(--color-slate-900)',
            pointerEvents: 'auto',
            cursor: editingName ? 'text' : 'pointer',
            fontSize: nameFontPx,
            lineHeight: 1.4,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
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
              onDoubleClick={(e) => e.stopPropagation()}
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitName();
                else if (e.key === 'Escape') cancelName();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={commitName}
              className="font-semibold leading-tight bg-white border border-blue-400 rounded px-1 outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: 'var(--color-slate-900)', width: '100%', minWidth: 0, fontSize: nameFontPx }}
            />
          ) : (
            data.name
          )}
        </span>
        </div>
        {filledFields.length > 0 && <div data-nds-group-fields
          className="flex flex-wrap justify-end gap-1.5 min-w-0 shrink-0"
          style={{ maxWidth: `min(${GROUP_FIELDS_MAX_FRACTION * 100}%, max(0px, calc(100% - ${iconPx + nameFontPx + 12}px)))`, marginTop: 2 }}>
        {filledFields.map((f) => (
          <GroupFieldChip
            key={f.key}
            nodeId={id}
            fieldKey={f.key}
            label={f.label}
            value={f.value}
            fontSize={px(DIAGRAM_TYPE_SCALE.groupChip)}
          />
        ))}
        </div>}
      </div>

      {hasNotes && (
        /* Inline notes preview so the annotation is actually visible on
           the diagram, not just discoverable on hover. Placed under the
           header pill. NOT clamped — a "…" in the middle of a diagram is
           not acceptable, so `groupHeaderClearance` reserves room for the
           note's real line count and the container grows to fit. */
        <div
          data-nds-group-header="1"
          data-nds-group-notes="1"
          className="absolute left-2 rounded px-1.5 py-0.5 pointer-events-none max-w-[calc(100%-1rem)]"
          style={{
            top: notesTopPx,
            background: 'var(--nds-pill-bg)',
            border: '1px solid var(--nds-chip-border)',
          }}
          title={data.notes}
        >
          <div
            className="whitespace-pre-wrap break-words leading-tight italic"
            style={{
              color: 'var(--color-slate-600)',
              fontSize: px(DIAGRAM_TYPE_SCALE.groupNotes),
            }}
          >
            {data.notes}
          </div>
        </div>
      )}
    </div>
  );
});
