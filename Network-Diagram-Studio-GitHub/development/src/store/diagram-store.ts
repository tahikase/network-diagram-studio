import { create } from 'zustand';
import { IMPORTED_ICONS } from '../env';
import type { Diagram, DiagramEdge, DiagramNode, StateColor, EdgeKind, EdgeLineStyle } from '../model/types';
import type { Shape, Stroke } from '../demo/tabs-store';
import {
  shapeSchema,
  strokeSchema,
  studioFileSchema,
  noteCommentSchema,
  noteImageSchema,
  type NoteComment,
  type NoteImage,
} from '../model/schema';
import { makeEmptyTopology, makeSampleTopology } from '../model/sample-topology';
import { getResourceType, getResourceTypeByIcon } from '../model/resource-types';
import { customFieldLabel } from '../model/custom-fields';
import { leafAppearance } from '../model/leaf-appearance';
import { currentTextFactor } from '../theme/type-scale';
import { runtimeExtensions } from '../runtime/extensions';
import {
  relayoutForNoOverlap,
  isFullyLaidOut,
  grownLeafSize,
  grownGroupSize,
  naturalLeafSize,
} from '../model/auto-layout';
import type { NodeClipboardPayload } from '../model/node-clipboard';
import { expandWithDescendants } from '../model/node-clipboard';
import { matchedSize } from '../model/size-match';
import { newId, nowIso } from '../utils/id';
import { undoRouter } from './undo-router';
import { checkDocumentIconAssets, iconAsset, registerIconAssets, withIconAssets } from '../icons/imported-library';

const HISTORY_LIMIT = 100;

interface HistoryState {
  past: Diagram[];
  future: Diagram[];
}

export interface DiagramStore {
  diagram: Diagram;
  history: HistoryState;
  /**
   * Snapshot taken when a continuous gesture (node drag, node resize)
   * begins. Continuous gestures fire dozens of store writes per second,
   * so they deliberately skip `withHistory`; this holds the pre-gesture
   * diagram so `commitGesture` can push ONE correct frame on mouse-up.
   * `null` whenever no gesture is in flight.
   */
  gestureBase: Diagram | null;
  /**
   * The ONE node the property panel edits, or `null`. It is a *derived*
   * value: set only while `selectedNodeIds` holds exactly one id and no
   * edge is selected. A multi-selection therefore has no single-object
   * panel, which is the only honest thing to show for it.
   */
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  /**
   * Every selected node / edge, in diagram order.
   *
   * React Flow owns the selection *gesture* (click, Shift+click, marquee)
   * and reports it as `select` changes; these arrays are what `Canvas`
   * feeds back into the controlled `nodes` / `edges` props. Deriving
   * `selected` from `selectedNodeId` alone — as it did before — silently
   * overwrote React Flow's multi-selection on the very next render, so
   * only one card could ever be selected and Delete only ever removed one.
   */
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  /**
   * The line pattern most recently chosen in the edge style picker. Session
   * state, NOT part of the diagram — it is never saved and never restored, so
   * opening a file can't silently restyle the connections you draw next.
   */
  lastEdgeLine?: EdgeLineStyle;
  /**
   * Bumped whenever the diagram is replaced with NEW content (Sample,
   * Load JSON, New, an AI import). The canvas re-frames on every change
   * so an incoming diagram is never left half-outside the visible area
   * at the previous diagram's pan/zoom. Deliberately NOT bumped when a
   * tab is restored — that path puts back the pan/zoom the user left.
   */
  fitNonce: number;

  // Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  /**
   * Fold a batch of React Flow `select` changes into the multi-selection.
   * Additive/subtractive rather than replacing, because Shift+click sends
   * only the id that changed. React Flow already emits the matching
   * `selected: false` changes for the other collection when a plain click
   * moves the selection between nodes and edges, so neither of these
   * clears the other.
   */
  applyNodeSelection: (changes: { id: string; selected: boolean }[]) => void;
  applyEdgeSelection: (changes: { id: string; selected: boolean }[]) => void;

  // Node ops
  addNode: (typeSlug: string, position: { x: number; y: number }) => string;
  addCustomIconNode: (iconId: string, iconLabel: string, position: { x: number; y: number }) => string;
  updateNode: (id: string, patch: Partial<DiagramNode>) => void;
  updateNodeName: (id: string, name: string) => void;
  updateNodeField: (id: string, key: string, value: string, options?: { coalesce?: boolean }) => void;
  removeNodeField: (id: string, key: string) => void;
  updateNodeSubtitle: (id: string, subtitle: string) => void;
  updateNodeState: (id: string, state: StateColor) => void;
  updateNodeNotes: (id: string, notes: string) => void;
  updateNodeTextScale: (id: string, scale: number) => void;
  updateNodeType: (id: string, newType: string) => void;
  updateNodeIconOverride: (id: string, iconId: string | undefined, typeLabel?: string) => void;
  updateNodeSize: (id: string, size: { w: number; h: number }) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  /** Delete several nodes (with their descendants) as ONE undo frame. */
  removeNodes: (ids: string[]) => void;
  /**
   * Insert a copy of a previously collected subtree, offset by `offset`.
   * Returns the ids of the newly created nodes. One undo frame.
   */
  pasteNodes: (
    payload: NodeClipboardPayload,
    offset: { x: number; y: number },
  ) => string[];

  // Edge ops
  /**
   * `handles` pins the new edge to the connect dots the gesture actually
   * used (v0.9.41). Omit it — as the shape-overlay connect gesture and the
   * test helpers do — and the edge auto-routes through the facing sides.
   */
  addEdge: (
    source: string,
    target: string,
    handles?: { sourceHandle?: string; targetHandle?: string }
  ) => string;
  updateEdge: (id: string, patch: Partial<DiagramEdge>) => void;
  updateEdgeKind: (id: string, kind: EdgeKind) => void;
  /** Set an explicit stroke colour; pass `undefined` to revert to the kind default. */
  updateEdgeColor: (id: string, color?: string) => void;
  /** Set an explicit line pattern; pass `undefined` to revert to the kind default. */
  updateEdgeLine: (id: string, line?: EdgeLineStyle) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  /** Multiplier on this edge's label font size. Clamped 0.5..3. */
  updateEdgeTextScale: (id: string, scale: number) => void;
  updateEdgeState: (id: string, state: StateColor) => void;
  removeEdge: (id: string) => void;
  /** Delete several edges as ONE undo frame. */
  removeEdges: (ids: string[]) => void;
  /** v0.9.29 — history-free edge detach/restore used by shape deletion. */
  detachEdgesFor: (ids: string[]) => DiagramEdge[];
  restoreEdges: (edges: DiagramEdge[]) => void;

  // Demo-only bridge: after `onConnect` handshakes a new edge into the
  // diagram, DemoApp sets this to that edge's id so `SmartLabelEdge` can
  // pop the inline label editor open automatically. Same pattern as
  // `annotation-store.pendingTextEditShapeId` (T text-box drop → editor).
  // Consumers set this back to null the moment they open the editor.
  pendingEdgeLabelEditId: string | null;
  setPendingEdgeLabelEditId: (id: string | null) => void;

  // Meta
  setTitle: (title: string) => void;
  setCaseId: (id: string) => void;
  setAuthor: (author: string) => void;

  // Whole-diagram ops
  /**
   * Replace the whole diagram.
   *
   * `relayout` (default `true`) runs `relayoutForNoOverlap` first, which
   * is what a freshly imported / AI-generated / templated topology needs
   * because its coordinates are usually placeholders.
   *
   * Pass `{ relayout: false }` when RESTORING a diagram that was already
   * laid out and then hand-arranged by the user (tab switching). Auto
   * layout is only idempotent for diagrams it produced itself: run it
   * over a hand-arranged one and it grows containers and shifts groups,
   * so the user's arrangement silently changes every time they leave and
   * come back to a tab.
   */
  loadDiagram: (d: Diagram, opts?: { relayout?: boolean }) => void;
  /**
   * Parse a saved file and replace the diagram.
   *
   * Returns the file's shapes/strokes rather than applying them: they belong
   * to the tabs-store, and diagram-store must not import it (tabs-store
   * already imports diagram-store at runtime). `useTabsStore.loadStudioFile`
   * is the single caller that applies both halves — use it, not this, or the
   * canvas keeps the PREVIOUS diagram's shapes.
   */
  loadFromJson: (raw: string) => {
    ok: boolean;
    error?: string;
    shapes?: Shape[];
    strokes?: Stroke[];
    /** The tab's Notes page (Markdown). `undefined` for a pre-v0.9.35 file. */
    notes?: string;
    /**
     * Comment threads for the Notes page. `undefined` for any file written
     * before v0.9.65 — which, exactly like `notes`, must leave whatever the
     * user already has alone rather than clearing it.
     */
    comments?: NoteComment[];
    /**
     * Screenshots referenced from the Notes page. `undefined` for any file
     * written before v0.9.66, with the same "no opinion" meaning as above.
     */
    images?: NoteImage[];
    /** Entries the schema could not read; they are skipped, not fatal. */
    dropped?: number;
  };
  toJson: () => string;
  loadSample: () => void;
  clear: () => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  /**
   * Continuous-gesture history. Call `beginGesture` on drag/resize start
   * and `commitGesture` on release; everything in between mutates the
   * diagram freely without polluting the undo stack.
   */
  beginGesture: () => void;
  commitGesture: () => void;
  cancelGesture: () => void;

  /**
   * The resize drag currently in flight, or `null`. Session state, never
   * saved.
   *
   * It exists for two reasons. It tells `Canvas` that an incoming
   * `dimensions` change came from a HAND on a grip and may therefore be
   * snapped to a neighbour's size — React Flow also emits `dimensions` when
   * it merely MEASURES a node on mount, and snapping those would silently
   * resize half a diagram the moment it loaded. And it carries the readout
   * the node draws while the drag lasts, including which box it has locked
   * onto so that box can light up.
   */
  resizeHint: ResizeHint | null;
  beginResize: (id: string, w: number, h: number) => void;
  setResizeHint: (hint: ResizeHint) => void;
  /**
   * End the gesture for `id`. Ignored when some OTHER node's resize has
   * already started, because the call is deliberately delayed — see
   * `RESIZE_TAIL_MS` in the node components.
   */
  endResize: (id?: string) => void;
  /**
   * Give `id` the same box as `sourceId`, clamped so it still fits its own
   * children and header. One undo frame.
   */
  matchNodeSize: (id: string, sourceId: string) => void;
}

/** Live readout for the resize gesture in flight. See `resizeHint`. */
export interface ResizeHint {
  nodeId: string;
  w: number;
  h: number;
  /** The node whose width/height this box has snapped to, if any. */
  matchId?: string;
  matchName?: string;
}

function cloneDiagram(d: Diagram): Diagram {
  return JSON.parse(JSON.stringify(d)) as Diagram;
}

/**
 * Keep one node's card fitted to its own content after a text edit.
 *
 * Editing a node changed `data` and nothing else, so a longer name or an
 * added notes block left `size` describing the OLD content. The card wrapped
 * or ellipsized, and the size was only repaired by the next full relayout —
 * which, for a diagram the user was working on, meant the next FILE LOAD.
 * "Save JSON → Load JSON" therefore resized cards by up to ~100px and pushed
 * them outside a container that had been snug around their old size.
 *
 * Fitting on edit keeps the stored size honest at all times: what is on
 * screen is what gets saved, and what gets saved is what loads back.
 *
 * Grow-only, matching the layout engine — a card the user deliberately
 * widened is never pulled back in, and deleting text does not make the card
 * jump smaller mid-sentence. Containers are skipped; they are sized from
 * their children and their header pill instead.
 */
export function refitNode(nodes: DiagramNode[], id: string): DiagramNode[] {
  // A node with children is a container, whatever its type says.
  const hasChildren = nodes.some((n) => n.parent === id);
  return nodes.map((n) => {
    if (n.id !== id) return n;
    if (hasChildren) return { ...n, size: grownGroupSize(n) };
    const size = grownLeafSize(n);
    return size ? { ...n, size } : n;
  });
}

/**
 * Continuous typing must not become one undo frame per keystroke.
 *
 * Text edits (`updateNodeName`, `updateNodeNotes`, `updateEdgeLabel`, …)
 * fire on every character. Pushing a frame each time made Ctrl+Z rewind
 * a name one letter at a time AND — because `past` is capped at
 * `HISTORY_LIMIT` — typing a single long name silently evicted every
 * real action that came before it. Consecutive writes carrying the same
 * `coalesceKey` within `COALESCE_MS` therefore reuse the frame already
 * on the stack instead of pushing a new one.
 */
const COALESCE_MS = 700;
let lastCoalesceKey: string | null = null;
let lastCoalesceAt = 0;

/** Forget any in-flight coalesce window. */
function breakCoalesce(): void {
  lastCoalesceKey = null;
  lastCoalesceAt = 0;
}

/** Structural equality over the parts a gesture can touch. */
function sameContent(a: Diagram, b: Diagram): boolean {
  return (
    JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
    JSON.stringify(a.edges) === JSON.stringify(b.edges)
  );
}

function withHistory(
  prev: Diagram,
  history: HistoryState,
  next: Diagram,
  coalesceKey?: string
): { diagram: Diagram; history: HistoryState } {
  const appearance = leafAppearance();
  if (appearance) {
    next = appearance.fitChanges(prev, next, currentTextFactor(), getResourceType, customFieldLabel);
  }
  const now = Date.now();
  const coalesce =
    coalesceKey !== undefined &&
    coalesceKey === lastCoalesceKey &&
    now - lastCoalesceAt < COALESCE_MS &&
    history.past.length > 0;

  lastCoalesceKey = coalesceKey ?? null;
  lastCoalesceAt = now;

  // Folding into the previous frame means the undo stack — and therefore
  // the router journal — must NOT grow, otherwise the two drift apart and
  // the global Ctrl+Z routes to a store with nothing left to undo.
  const past = coalesce
    ? history.past
    : [...history.past, cloneDiagram(prev)].slice(-HISTORY_LIMIT);
  if (!coalesce) {
    // Log this mutation on the cross-store undo router so the global
    // Ctrl+Z shortcut knows a diagram-side undo frame was just pushed.
    // See `src/store/undo-router.ts` for the full rationale (v0.7.7 bug
    // fix: single Ctrl+Z was popping BOTH the diagram AND annotation
    // stacks at once).
    undoRouter.record('diagram');
  }
  return {
    diagram: { ...next, meta: { ...next.meta, updatedUtc: nowIso() } },
    history: { past, future: [] },
  };
}

/**
 * Which single element — if any — the property panel should edit.
 *
 * Exactly one node and nothing else, or exactly one edge and nothing else.
 * Anything larger is a multi-selection and gets no single-object panel.
 */
function derivePrimary(
  nodeIds: string[],
  edgeIds: string[],
): { selectedNodeId: string | null; selectedEdgeId: string | null } {
  if (nodeIds.length === 1 && edgeIds.length === 0) {
    return { selectedNodeId: nodeIds[0], selectedEdgeId: null };
  }
  if (edgeIds.length === 1 && nodeIds.length === 0) {
    return { selectedNodeId: null, selectedEdgeId: edgeIds[0] };
  }
  return { selectedNodeId: null, selectedEdgeId: null };
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** Selection state for "nothing is selected". */
const NO_SELECTION = {
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedNodeIds: [] as string[],
  selectedEdgeIds: [] as string[],
};

/** Selection state for "this one node, and nothing else". */
function soleNode(id: string) {
  return {
    selectedNodeId: id,
    selectedEdgeId: null,
    selectedNodeIds: [id],
    selectedEdgeIds: [] as string[],
  };
}

/** Selection state for "this one edge, and nothing else". */
function soleEdge(id: string) {
  return {
    selectedEdgeId: id,
    selectedNodeId: null,
    selectedEdgeIds: [id],
    selectedNodeIds: [] as string[],
  };
}

/**
 * Drop from the selection anything `next` no longer contains. Used by every
 * removal path so a deleted card cannot leave its id behind — a stale id
 * would keep the property panel pointed at nothing and would come back to
 * life the moment an unrelated node reused it.
 */
function pruneSelection(next: Diagram, nodeIds: string[], edgeIds: string[]) {
  const keptNodes = new Set(nodeIds);
  const keptEdges = new Set(edgeIds);
  const nodes = next.nodes.filter((n) => keptNodes.has(n.id)).map((n) => n.id);
  const edges = next.edges.filter((e) => keptEdges.has(e.id)).map((e) => e.id);
  return {
    selectedNodeIds: nodes,
    selectedEdgeIds: edges,
    ...derivePrimary(nodes, edges),
  };
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  diagram: makeEmptyTopology(),
  history: { past: [], future: [] },
  gestureBase: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  lastEdgeLine: undefined,
  fitNonce: 0,
  resizeHint: null,

  /* Both of these BAIL OUT when the selection is already what is being asked
     for. That matters more than it looks: `selectedNodeIds` is an array, so a
     fresh literal on every call would change Canvas's `useMemo` dependency,
     rebuild the whole nodes/edges array, and remount the React Flow elements
     — which throws away component state such as the edge's open inline label
     editor. The old single-string fields compared equal for free; arrays have
     to be told. */
  selectNode: (id) =>
    set((s) => {
      const next = id ? [id] : [];
      if (sameIds(next, s.selectedNodeIds) && s.selectedEdgeIds.length === 0) return s;
      return {
        ...s,
        selectedNodeId: id,
        selectedEdgeId: null,
        selectedNodeIds: next,
        selectedEdgeIds: s.selectedEdgeIds.length === 0 ? s.selectedEdgeIds : [],
      };
    }),
  selectEdge: (id) =>
    set((s) => {
      const next = id ? [id] : [];
      if (sameIds(next, s.selectedEdgeIds) && s.selectedNodeIds.length === 0) return s;
      return {
        ...s,
        selectedEdgeId: id,
        selectedNodeId: null,
        selectedEdgeIds: next,
        selectedNodeIds: s.selectedNodeIds.length === 0 ? s.selectedNodeIds : [],
      };
    }),

  applyNodeSelection: (changes) =>
    set((s) => {
      const picked = new Set(s.selectedNodeIds);
      for (const c of changes) {
        if (c.selected) picked.add(c.id);
        else picked.delete(c.id);
      }
      // Walk the diagram rather than the set so the order is stable and any
      // id left over from an undone deletion drops out on its own.
      const nodeIds = s.diagram.nodes.filter((n) => picked.has(n.id)).map((n) => n.id);
      if (sameIds(nodeIds, s.selectedNodeIds)) return s;
      return { ...s, selectedNodeIds: nodeIds, ...derivePrimary(nodeIds, s.selectedEdgeIds) };
    }),

  applyEdgeSelection: (changes) =>
    set((s) => {
      const picked = new Set(s.selectedEdgeIds);
      for (const c of changes) {
        if (c.selected) picked.add(c.id);
        else picked.delete(c.id);
      }
      const edgeIds = s.diagram.edges.filter((e) => picked.has(e.id)).map((e) => e.id);
      if (sameIds(edgeIds, s.selectedEdgeIds)) return s;
      return { ...s, selectedEdgeIds: edgeIds, ...derivePrimary(s.selectedNodeIds, edgeIds) };
    }),

  addNode: (typeSlug, position) => {
    const rt = getResourceType(typeSlug);
    const id = newId(typeSlug.replace(/[^a-z]/gi, '').slice(0, 4) || 'node');
    const initialFields = Object.fromEntries(rt.fields.map((f) => [f.key, '']));
    const newNode: DiagramNode = {
      id,
      type: typeSlug,
      position,
      size: rt.isGroup ? { w: 260, h: 200 } : undefined,
      data: {
        name: rt.defaultName,
        state: 'ok',
        fields: initialFields,
      },
    };
    const { diagram, history } = get();
    const next: Diagram = { ...diagram, nodes: [...diagram.nodes, newNode] };
    set({ ...withHistory(diagram, history, next), ...soleNode(id) });
    return id;
  },

  addCustomIconNode: (iconId, iconLabel, position) => {
    // If the dropped icon corresponds to a known ResourceType (e.g. the
    // user dragged the "Virtual Machines" icon from the All icons tab),
    // upgrade the node to that ResourceType so it picks up the same
    // rich property fields (OS / Size / Private IP …) it would have
    // gotten from the Resources tab or a Template. This is what makes
    // Resources, Templates, and All icons produce consistent nodes.
    const matched = getResourceTypeByIcon(iconId);
    if (matched) {
      return get().addNode(matched.slug, position);
    }

    // Truly custom icon (no ResourceType match) — keep the historical
    // behavior: a `custom` node that shows the icon's own label as its
    // type chip and starts with no pre-defined property slots. Users
    // can still add fields via "+ Add custom field" in PropertyPanel.
    const id = newId('cust');
    const newNode: DiagramNode = {
      id,
      type: 'custom',
      position,
      data: {
        name: iconLabel,
        state: 'ok',
        iconId,
        ...(IMPORTED_ICONS && iconAsset(iconId)?.mime === 'image/png' ? { iconSize: 96 } : {}),
        typeLabel: iconLabel,
        fields: {},
      },
    };
    const { diagram, history } = get();
    const next: Diagram = { ...diagram, nodes: [...diagram.nodes, newNode] };
    set({ ...withHistory(diagram, history, next), ...soleNode(id) });
    return id;
  },

  updateNode: (id, patch) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      nodes: diagram.nodes.map((n) => (n.id === id ? { ...n, ...patch, data: { ...n.data, ...(patch.data ?? {}) } } : n)),
    };
    set(withHistory(diagram, history, next));
  },

  updateNodeName: (id, name) => {
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, name } } : n)),
        id
      ),
    };
    set(withHistory(diagram, history, next, `name:${id}`));
  },

  updateNodeField: (id, key, value, { coalesce = true } = {}) => {
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, fields: { ...n.data.fields, [key]: value } } } : n
        ),
        id
      ),
    };
    set(withHistory(diagram, history, next, coalesce ? `field:${id}:${key}` : undefined));
  },

  removeNodeField: (id, key) => {
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) => {
          if (n.id !== id) return n;
          const nextFields = { ...(n.data.fields ?? {}) };
          delete nextFields[key];
          return { ...n, data: { ...n.data, fields: nextFields } };
        }),
        id
      ),
    };
    set(withHistory(diagram, history, next));
  },

  updateNodeSubtitle: (id, subtitle) => {
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, subtitle } } : n)),
        id
      ),
    };
    set(withHistory(diagram, history, next, `subtitle:${id}`));
  },

  updateNodeState: (id, state) => {
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, state } } : n)),
        id
      ),
    };
    set(withHistory(diagram, history, next));
  },

  updateNodeNotes: (id, notes) => {
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, notes } } : n)),
        id
      ),
    };
    set(withHistory(diagram, history, next, `notes:${id}`));
  },

  updateNodeTextScale: (id, scale) => {
    // Clamp to a sane range so extreme values can't blow the card up or
    // shrink text to nothing. Undefined / 1 both mean "default size".
    const clamped = Math.max(0.5, Math.min(3, Number.isFinite(scale) ? scale : 1));
    const { diagram, history } = get();
    const next = {
      ...diagram,
      nodes: diagram.nodes.map((n) => {
        if (n.id !== id) return n;
        const nextData = { ...n.data };
        if (clamped === 1) delete nextData.textScale;
        else nextData.textScale = clamped;
        return { ...n, data: nextData };
      }),
    };
    set(withHistory(diagram, history, next));
  },

  updateNodeType: (id, newType) => {
    const rt = getResourceType(newType);
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      nodes: diagram.nodes.map((n) => {
        if (n.id !== id) return n;
        const newFields: Record<string, string> = { ...n.data.fields };
        for (const f of rt.fields) if (!(f.key in newFields)) newFields[f.key] = '';
        const updated = { ...n, type: newType, data: { ...n.data, fields: newFields } };
        if (rt.isGroup) return { ...updated, size: n.size ?? { w: 260, h: 200 } };
        const appearance = leafAppearance();
        if (appearance) {
          return {
            ...updated,
            size: appearance.isContainer(id) ? updated.size
              : appearance.growNode(updated, currentTextFactor(), getResourceType, customFieldLabel),
          };
        }
        // A leaf gets a freshly measured box rather than the old type's, but it
        // must still HAVE one: clearing `size` made isFullyLaidOut() false for
        // the whole diagram, so the next load repacked every node on the canvas
        // and the user saw their arrangement destroyed by one type change.
        return { ...updated, size: naturalLeafSize(updated) };
      }),
    };
    set(withHistory(diagram, history, next));
  },

  updateNodeIconOverride: (id, iconId, typeLabel) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      nodes: refitNode(
        diagram.nodes.map((n) => {
          if (n.id !== id) return n;
          const nextData = { ...n.data };
          if (iconId === undefined) delete nextData.iconId;
          else nextData.iconId = iconId;
          if (!iconId || iconAsset(iconId)?.mime !== 'image/png') delete nextData.iconSize;
          if (typeLabel === undefined) delete nextData.typeLabel;
          else nextData.typeLabel = typeLabel;
          return { ...n, data: nextData };
        }),
        id
      ),
    };
    set(withHistory(diagram, history, next));
  },

  updateNodeSize: (id, size) => {
    // No history push for continuous resize; committed on mouse up by caller if desired.
    set((s) => {
      const resized = leafAppearance()?.resize(s.diagram, id, size, currentTextFactor(), getResourceType, customFieldLabel);
      if (resized) return resized === s.diagram ? s : { ...s, diagram: resized };
      const node = s.diagram.nodes.find((n) => n.id === id);
      if (!node) return s;
      if (node.size && node.size.w === size.w && node.size.h === size.h) return s;
      return {
        ...s,
        diagram: {
          ...s.diagram,
          nodes: s.diagram.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
        },
      };
    });
  },

  matchNodeSize: (id, sourceId) => {
    if (id === sourceId) return;
    const { diagram, history } = get();
    const target = diagram.nodes.find((n) => n.id === id);
    const source = diagram.nodes.find((n) => n.id === sourceId);
    if (!target || !source) return;
    const size = matchedSize(target, source, diagram.nodes);
    if (target.size && target.size.w === size.w && target.size.h === size.h) return;
    breakCoalesce();
    const next: Diagram = {
      ...diagram,
      nodes: diagram.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
    };
    set(withHistory(diagram, history, next));
  },

  moveNode: (id, position) => {
    // Same story: continuous drag; caller can commit via updateNode(pos) on drag end.
    set((s) => {
      const node = s.diagram.nodes.find((n) => n.id === id);
      if (!node) return s;
      if (node.position.x === position.x && node.position.y === position.y) return s;
      return {
        ...s,
        diagram: {
          ...s.diagram,
          nodes: s.diagram.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
        },
      };
    });
  },

  removeNode: (id) => {
    const { diagram, history } = get();
    // Deleting a container deletes everything nested inside it, to any depth.
    // Filtering on `n.parent !== id` alone only detached the DIRECT children:
    // grandchildren survived pointing at a parent that no longer existed
    // (orphans the layout cannot place), and edges touching those descendants
    // were left dangling.
    const doomed = new Set(expandWithDescendants(diagram.nodes, [id]));
    const next: Diagram = {
      ...diagram,
      nodes: diagram.nodes.filter((n) => !doomed.has(n.id)),
      edges: diagram.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)),
    };
    set({
      ...withHistory(diagram, history, next),
      ...pruneSelection(next, get().selectedNodeIds, get().selectedEdgeIds),
    });
  },

  removeNodes: (ids) => {
    if (ids.length === 0) return;
    const { diagram, history, selectedNodeIds, selectedEdgeIds } = get();
    const doomed = new Set(expandWithDescendants(diagram.nodes, ids));
    if (doomed.size === 0) return;
    const next: Diagram = {
      ...diagram,
      nodes: diagram.nodes.filter((n) => !doomed.has(n.id)),
      edges: diagram.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)),
    };
    // `'remove'` is shared with `removeEdges` on purpose. One Delete keypress
    // over a multi-selection reaches this store twice — React Flow emits the
    // edge removals and the node removals as two separate change batches —
    // and coalescing folds them into the ONE undo frame the user expects.
    set({
      ...withHistory(diagram, history, next, 'remove'),
      ...pruneSelection(next, selectedNodeIds, selectedEdgeIds),
    });
  },

  pasteNodes: (payload, offset) => {
    if (payload.nodes.length === 0) return [];
    const { diagram, history } = get();

    const copied = new Set(payload.nodes.map((n) => n.id));
    const idMap = new Map<string, string>();
    for (const n of payload.nodes) {
      idMap.set(n.id, newId(n.type.replace(/[^a-z]/gi, '').slice(0, 4) || 'node'));
    }

    const nodes: DiagramNode[] = payload.nodes.map((n) => {
      // A node whose parent came along in the copy keeps its position, because
      // a child's position is RELATIVE to its parent — offsetting it too would
      // tear the copy apart, sliding every VM out of its subnet. Only the roots
      // of the pasted set move.
      const insideCopy = !!n.parent && copied.has(n.parent);
      const copy: DiagramNode = {
        ...n,
        id: idMap.get(n.id)!,
        // A root that was nested in something NOT copied (e.g. copying one
        // subnet out of a VNet) keeps its original parent, so the copy lands
        // in the same container rather than escaping to the canvas root.
        parent: insideCopy ? idMap.get(n.parent!) : n.parent,
        position: insideCopy
          ? { ...n.position }
          : { x: n.position.x + offset.x, y: n.position.y + offset.y },
        size: n.size ? { ...n.size } : undefined,
        data: { ...n.data, fields: { ...n.data.fields } },
      };
      return copy;
    });

    const edges: DiagramEdge[] = payload.edges.map((e) => ({
      ...e,
      id: newId('e'),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));

    const next: Diagram = {
      ...diagram,
      nodes: [...diagram.nodes, ...nodes],
      edges: [...diagram.edges, ...edges],
    };
    // Select a root of the pasted set, never a nested child — selecting a VM
    // deep inside a freshly pasted VNet would leave the user unable to drag
    // what they just pasted. `parent` here is already remapped, so the test
    // has to be against the NEW ids.
    const pastedIds = new Set(nodes.map((n) => n.id));
    const firstRoot = nodes.find((n) => !n.parent || !pastedIds.has(n.parent)) ?? nodes[0];
    set({
      ...withHistory(diagram, history, next),
      ...soleNode(firstRoot.id),
    });
    return nodes.map((n) => n.id);
  },

  addEdge: (source, target, handles) => {
    const { diagram, history, lastEdgeLine } = get();
    if (source === target) return '';
    const id = newId('e');
    // New connections inherit the last pattern the user picked, so drawing a
    // run of dashed "backup" links doesn't mean re-selecting Dashed each time
    // (draw.io behaves the same way). Reset to Auto by picking Auto.
    const newEdge: DiagramEdge = {
      id, source, target, kind: 'link',
      ...runtimeExtensions().ndsNonProductionConnectors?.defaults(),
    };
    if (lastEdgeLine) newEdge.line = lastEdgeLine;
    // Only write the keys we were actually given: an `undefined` value would
    // still serialise as a present key in some JSON paths, and "absent" is
    // what marks an endpoint as auto-routed.
    if (handles?.sourceHandle) newEdge.sourceHandle = handles.sourceHandle;
    if (handles?.targetHandle) newEdge.targetHandle = handles.targetHandle;
    const next: Diagram = { ...diagram, edges: [...diagram.edges, newEdge] };
    set({ ...withHistory(diagram, history, next), ...soleEdge(id) });
    return id;
  },

  updateEdge: (id, patch) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    };
    set(withHistory(diagram, history, next));
  },

  updateEdgeKind: (id, kind) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => (e.id === id ? { ...e, kind } : e)),
    };
    set(withHistory(diagram, history, next));
  },

  updateEdgeColor: (id, color) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => {
        if (e.id !== id) return e;
        // Passing undefined clears the override so the edge goes back to
        // being coloured by its kind. Drop the key entirely rather than
        // storing `undefined`, so saved JSON stays clean.
        const { color: _drop, ...rest } = e;
        return color ? { ...rest, color } : rest;
      }),
    };
    set(withHistory(diagram, history, next));
  },

  updateEdgeLine: (id, line) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => {
        if (e.id !== id) return e;
        // Same contract as updateEdgeColor: undefined restores the kind's own
        // pattern, and the key is dropped rather than stored as undefined.
        const { line: _drop, ...rest } = e;
        return line ? { ...rest, line } : rest;
      }),
    };
    set({ ...withHistory(diagram, history, next), lastEdgeLine: line });
  },

  updateEdgeLabel: (id, label) => {
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => (e.id === id ? { ...e, label } : e)),
    };
    set(withHistory(diagram, history, next, `edgelabel:${id}`));
  },

  /**
   * Multiplier on this edge's label font size — the A− / A+ pair under
   * Line style in the property panel. Same clamp and same "1 means default,
   * so drop the key" contract as `updateNodeTextScale`, which keeps a
   * default-sized edge byte-identical in the saved JSON.
   */
  updateEdgeTextScale: (id, scale) => {
    const clamped = Math.max(0.5, Math.min(3, Number.isFinite(scale) ? scale : 1));
    const { diagram, history } = get();
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => {
        if (e.id !== id) return e;
        const { textScale: _drop, ...rest } = e;
        return clamped === 1 ? rest : { ...rest, textScale: clamped };
      }),
    };
    set(withHistory(diagram, history, next));
  },

  updateEdgeState: (id, state) => {
    const { diagram, history } = get();

    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.map((e) => (e.id === id ? { ...e, state } : e)),
    };
    set(withHistory(diagram, history, next));
  },

  removeEdge: (id) => {
    const { diagram, history, selectedNodeIds, selectedEdgeIds } = get();
    const next: Diagram = { ...diagram, edges: diagram.edges.filter((e) => e.id !== id) };
    set({
      ...withHistory(diagram, history, next),
      ...pruneSelection(next, selectedNodeIds, selectedEdgeIds),
    });
  },

  removeEdges: (ids) => {
    if (ids.length === 0) return;
    const { diagram, history, selectedNodeIds, selectedEdgeIds } = get();
    const doomed = new Set(ids);
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.filter((e) => !doomed.has(e.id)),
    };
    // Nothing actually went: React Flow reports the edges attached to a
    // deleted node in its own batch, and `removeNodes` has usually taken
    // them already. Pushing a frame for a no-op would cost a wasted Ctrl+Z.
    if (next.edges.length === diagram.edges.length) return;
    set({
      ...withHistory(diagram, history, next, 'remove'),
      ...pruneSelection(next, selectedNodeIds, selectedEdgeIds),
    });
  },

  /**
   * v0.9.29 — remove every edge touching these ids and hand them back,
   * WITHOUT recording a diagram undo frame.
   *
   * Deleting a shape has to take its connections with it, but the shape
   * itself is deleted by the tabs-store, which owns a *separate* undo stack.
   * If this pushed a frame of its own, one Delete keypress would cost two
   * Ctrl+Z presses — the exact double-undo bug `undo-router` exists to
   * prevent. Instead the caller stores the returned edges on its own undo
   * entry and calls `restoreEdges` to put them back, so the whole deletion
   * remains a single reversible step.
   */
  detachEdgesFor: (ids) => {
    const { diagram, selectedNodeIds, selectedEdgeIds } = get();
    if (ids.length === 0) return [];
    const doomed = new Set(ids);
    const removed = diagram.edges.filter(
      (e) => doomed.has(e.source) || doomed.has(e.target),
    );
    if (removed.length === 0) return [];
    const goneIds = new Set(removed.map((e) => e.id));
    const next: Diagram = {
      ...diagram,
      edges: diagram.edges.filter((e) => !goneIds.has(e.id)),
      meta: { ...diagram.meta, updatedUtc: nowIso() },
    };
    set({
      diagram: next,
      ...pruneSelection(next, selectedNodeIds, selectedEdgeIds),
    });
    return removed;
  },

  /** Counterpart of `detachEdgesFor`. Also history-free, same reason. */
  restoreEdges: (edges) => {
    if (edges.length === 0) return;
    const { diagram } = get();
    const present = new Set(diagram.edges.map((e) => e.id));
    const missing = edges.filter((e) => !present.has(e.id));
    if (missing.length === 0) return;
    set({
      diagram: {
        ...diagram,
        edges: [...diagram.edges, ...missing],
        meta: { ...diagram.meta, updatedUtc: nowIso() },
      },
    });
  },

  pendingEdgeLabelEditId: null,
  setPendingEdgeLabelEditId: (id) => set({ pendingEdgeLabelEditId: id }),

  setTitle: (title) => {
    const { diagram, history } = get();
    const next: Diagram = { ...diagram, meta: { ...diagram.meta, title } };
    set(withHistory(diagram, history, next, 'meta:title'));
  },

  setCaseId: (caseId) => {
    const { diagram, history } = get();
    const next: Diagram = { ...diagram, meta: { ...diagram.meta, caseId } };
    set(withHistory(diagram, history, next, 'meta:caseId'));
  },

  setAuthor: (author) => {
    const { diagram, history } = get();
    const next: Diagram = { ...diagram, meta: { ...diagram.meta, author } };
    set(withHistory(diagram, history, next, 'meta:author'));
  },

  loadDiagram: (d, opts) => {
    const appearance = leafAppearance();
    if (appearance) {
      d = appearance.fitChanges(null, d, currentTextFactor(), getResourceType, customFieldLabel, true);
    }
    const relayout = opts?.relayout !== false;
    set({
      diagram: relayout ? relayoutForNoOverlap(d) : d,
      history: { past: [], future: [] },
      gestureBase: null,
      ...NO_SELECTION,
      // A restore keeps the tab's own pan/zoom; a real import gets framed.
      fitNonce: relayout ? get().fitNonce + 1 : get().fitNonce,
    });
    // Any diagram markers now point at frames that were just wiped.
    // Drop them but preserve annotation markers (shapes on the tab
    // survive a diagram reload).
    undoRouter.dropSource('diagram');
    breakCoalesce();
  },

  loadFromJson: (raw) => {
    try {
      const parsed = studioFileSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
      }
      const {
        iconAssets = [],
        shapes: rawShapes,
        strokes: rawStrokes,
        notes,
        comments: rawComments,
        images: rawImages,
        ...diagramPart
      } = parsed.data;
      const loaded = diagramPart as Diagram;
      checkDocumentIconAssets(loaded.nodes, iconAssets);
      registerIconAssets(iconAssets);

      // Validate annotations entry-by-entry. One unreadable shape — a `kind`
      // invented by a future build, say — must not fail the load and cost the
      // user their nodes and edges.
      let dropped = 0;
      const shapes: Shape[] = [];
      for (const s of rawShapes ?? []) {
        const r = shapeSchema.safeParse(s);
        if (r.success) shapes.push(r.data as Shape);
        else dropped++;
      }
      const strokes: Stroke[] = [];
      for (const s of rawStrokes ?? []) {
        const r = strokeSchema.safeParse(s);
        if (r.success) strokes.push(r.data as Stroke);
        else dropped++;
      }
      // `undefined` (key absent) and `[]` (saved with none) have to stay
      // distinguishable here for the same reason `notes` does — see the
      // load-bearing `??` in tabs-store.loadStudioFile.
      let comments: NoteComment[] | undefined;
      if (rawComments) {
        comments = [];
        for (const c of rawComments) {
          const r = noteCommentSchema.safeParse(c);
          if (r.success) comments.push(r.data);
          else dropped++;
        }
      }

      // Same absent-vs-empty rule. A screenshot that fails validation — a
      // truncated data URL, a `javascript:` src someone hand-edited in — is
      // dropped on its own; the note keeps its `![…](nds-img:…)` reference and
      // renders a placeholder rather than the whole file failing to open.
      let images: NoteImage[] | undefined;
      if (rawImages) {
        images = [];
        for (const i of rawImages) {
          const r = noteImageSchema.safeParse(i);
          if (r.success) images.push(r.data);
          else dropped++;
        }
      }

      // A file this app saved is already fully laid out, so re-running the
      // packer over it is not a repair — it is damage. The overlap sweep
      // discards any arrangement where two siblings touch and re-flows the
      // children into rows, so "Save JSON" then "Load JSON" came back with
      // every node moved and every container grown. It also never settled:
      // each round trip grew the groups another 4px, forever.
      //
      // Files that are NOT fully laid out (hand-written, or model output
      // that skipped sizes) still get the full treatment — that is what the
      // packer is actually for.
      set({
        diagram: relayoutForNoOverlap(loaded, {
          preservePositions: isFullyLaidOut(loaded),
        }),
        history: { past: [], future: [] },
        gestureBase: null,
        ...NO_SELECTION,
        fitNonce: get().fitNonce + 1,
      });
      undoRouter.dropSource('diagram');
    breakCoalesce();
      return { ok: true, shapes, strokes, notes, comments, images, dropped };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  toJson: () => JSON.stringify(withIconAssets(get().diagram), null, 2),

  loadSample: () => {
    set({
      diagram: relayoutForNoOverlap(makeSampleTopology()),
      history: { past: [], future: [] },
      gestureBase: null,
      ...NO_SELECTION,
      fitNonce: get().fitNonce + 1,
    });
    undoRouter.dropSource('diagram');
    breakCoalesce();
  },

  clear: () => {
    set({
      diagram: makeEmptyTopology(),
      history: { past: [], future: [] },
      gestureBase: null,
      ...NO_SELECTION,
      fitNonce: get().fitNonce + 1,
    });
    undoRouter.dropSource('diagram');
    breakCoalesce();
  },

  undo: () => {
    const { diagram, history } = get();
    if (history.past.length === 0) return;
    breakCoalesce();
    const previous = history.past[history.past.length - 1];
    const past = history.past.slice(0, -1);
    const future = [cloneDiagram(diagram), ...history.future].slice(0, HISTORY_LIMIT);
    set({ diagram: previous, history: { past, future }, gestureBase: null });
    // Router bookkeeping — moves the diagram marker from undo→redo so
    // the next Ctrl+Y knows to redo the diagram side (not the annotation
    // side). Called after `set` so router + store are ordered.
    undoRouter.commitUndo();
  },

  redo: () => {
    const { diagram, history } = get();
    if (history.future.length === 0) return;
    breakCoalesce();
    const next = history.future[0];
    const future = history.future.slice(1);
    const past = [...history.past, cloneDiagram(diagram)].slice(-HISTORY_LIMIT);
    set({ diagram: next, history: { past, future }, gestureBase: null });
    undoRouter.commitRedo();
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  // --- Continuous-gesture history -------------------------------------
  // A drag or resize writes to the store on every pointer move. Those
  // writes deliberately bypass `withHistory` (100+ frames per gesture
  // would be useless and would blow the history cap), so the gesture has
  // to bracket itself: snapshot on start, push exactly one frame on end.
  //
  // The pre-fix code instead committed at drag-STOP via `updateNode`,
  // which snapshots `get().diagram` — by then already mutated to the
  // final position. Every drag therefore stored an undo frame identical
  // to the current state, so Undo appeared to do nothing at all.

  beginGesture: () => {
    // Re-entrant by design: React Flow can fire a drag start for each
    // node in a multi-selection, but they are all one user gesture.
    if (get().gestureBase) return;
    breakCoalesce();
    set({ gestureBase: cloneDiagram(get().diagram) });
  },

  commitGesture: () => {
    const { gestureBase, diagram, history } = get();
    if (!gestureBase) return;
    // A click that selects without moving still fires start/stop. Pushing
    // a frame for it would make the user press Ctrl+Z twice to undo the
    // edit before it.
    if (sameContent(gestureBase, diagram)) {
      set({ gestureBase: null });
      return;
    }
    const past = [...history.past, gestureBase].slice(-HISTORY_LIMIT);
    undoRouter.record('diagram');
    set({
      gestureBase: null,
      diagram: { ...diagram, meta: { ...diagram.meta, updatedUtc: nowIso() } },
      history: { past, future: [] },
    });
  },

  cancelGesture: () => set({ gestureBase: null }),

  beginResize: (id, w, h) => set({ resizeHint: { nodeId: id, w, h } }),
  setResizeHint: (hint) => set({ resizeHint: hint }),
  endResize: (id) =>
    set((s) => (id && s.resizeHint && s.resizeHint.nodeId !== id ? s : { resizeHint: null })),
}));

// Testing hook — expose the store on `window.__nds_diagramStore` so
// Playwright-driven E2E scripts can call actions directly (e.g.,
// `addEdge`) instead of trying to simulate drag-drop mouse gestures on
// invisible ReactFlow handles. Not documented, not part of the public
// API; kept namespaced with `__` so it can't be reached by accident.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_diagramStore?: typeof useDiagramStore }).__nds_diagramStore =
    useDiagramStore;
}
