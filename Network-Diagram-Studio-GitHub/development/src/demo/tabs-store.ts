// Demo v0.5: TAB MANAGEMENT
//
// Each tab is its OWN independent workspace: its own network diagram
// (nodes / edges / annotations) AND its own pencil strokes. Adding a new
// tab creates a totally blank canvas — the previous tab's diagram is
// preserved and returned to when you switch back.
//
// Wiring
// ------
// The shared `useDiagramStore` (which the Canvas / Palette / Header / etc.
// read and write) holds the ACTIVE tab's diagram. On tab switch we
// snapshot `useDiagramStore.diagram` back into the outgoing tab, then
// `loadDiagram()` the incoming tab's diagram.
//
// Strokes are stored per-tab here (not in useDiagramStore), so they don't
// need snapshot-on-switch logic — the AnnotationOverlay just reads the
// active tab's strokes directly.
import { create } from 'zustand';
import type { Diagram, DiagramEdge } from '../model/types';
import type { NoteComment, NoteImage } from '../model/schema';
import type { ShapeTextStyle } from '../model/shape-text';
import { makeEmptyTopology } from '../model/sample-topology';
import { useDiagramStore } from '../store/diagram-store';
import { undoRouter } from '../store/undo-router';
import { persistImage } from './notes-images';

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Lets this store save and restore the canvas pan/zoom without importing
 * React Flow (which is only available inside `<ReactFlowProvider>`).
 * `Canvas` installs the three callbacks on mount and clears them on
 * unmount; every call site must tolerate them being `null`.
 */
export const viewportBridge: {
  get: (() => CanvasViewport) | null;
  set: ((v: CanvasViewport) => void) | null;
  fit: (() => void) | null;
} = { get: null, set: null, fit: null };

/**
 * Apply a tab's saved viewport, or frame the diagram when the tab has
 * never been shown. Deferred because React Flow can only fit nodes it has
 * measured, and the freshly-loaded diagram has not been rendered yet at
 * the moment the tab switches.
 */
function applyViewportSoon(v: CanvasViewport | undefined) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (v && viewportBridge.set) viewportBridge.set(v);
      else viewportBridge.fit?.();
    });
  });
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  points: Point[];
  /** Demo v0.6: line style for the pencil stroke. Optional for BC. */
  dash?: 'solid' | 'dashed' | 'dotted';
}

// -------- SHAPES (arrows, rectangles, ellipses, callouts) ---------------
// Structured annotation primitives. Unlike pencil strokes, shapes are
// selectable / movable / resizable and export as crisp vectors. All
// coordinates are in FLOW / world space so shapes stick to the diagram.

/**
 * v0.9.27 — one end of an arrow, attached to a shape or a diagram node.
 *
 * `ShapeArrow.from` / `to` stay as the LAST RESOLVED coordinates, so an
 * arrow whose target is deleted freezes where it was drawn instead of
 * disappearing, and any consumer that ignores refs still renders correctly.
 */
export interface ShapeEndRef {
  /** `'node'` means a React Flow node (a resource); `'shape'` an annotation. */
  kind: 'shape' | 'node';
  id: string;
  /** Absent = FLOATING: the endpoint slides around the target's outline so
   *  the arrow always faces it, exactly like a React Flow edge. Present = a
   *  fixed anchor in 0..1 target-local space, so it survives a resize. */
  anchor?: Point;
}

export interface ShapeArrow extends ShapeTextStyle {
  id: string;
  kind: 'arrow';
  from: Point;
  to: Point;
  color: string;
  width: number;
  text?: string;
  /** Demo v0.6: line-style variants (default 'solid'). */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** Demo v0.6: arrowhead variants (default 'end'). */
  head?: 'none' | 'end' | 'both' | 'dot';
  /** Demo v0.6.2: line-shape variants (default 'straight'). */
  shape?: 'straight' | 'step' | 'curved' | 'elbow';
  /** Demo v0.7.16: rotation about the arrow midpoint, in degrees.
   *  Absent / 0 = no rotation. Positive = clockwise.
   *  The stored `from` and `to` remain in the pre-rotation frame; the
   *  renderer applies a rotate() transform around the midpoint. */
  rotation?: number;
  /** v0.9.27: endpoint bindings — see `shape-binding.ts`. An arrow with a
   *  ref FOLLOWS its target the way a React Flow edge follows a node. */
  fromRef?: ShapeEndRef;
  toRef?: ShapeEndRef;
}

export interface ShapeRect extends ShapeTextStyle {
  id: string;
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  width: number;
  fillOpacity: number; // 0..1
  text?: string;
  /** Demo v0.6: line-style variants (default 'solid'). */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** Demo v0.6: corner style (default 'rounded'). */
  corner?: 'sharp' | 'rounded';
  /** Demo v0.6: fill preset. Overrides fillOpacity when present. */
  fill?: 'none' | 'tint' | 'solid';
  /** v0.9: optional non-rectangular geometry (diamond, cylinder, cloud,
   *  block arrow, ...). The shape stays a `rect` for every other purpose
   *  — hit-testing, resize, rotation, text and undo all operate on the
   *  x/y/w/h box — only the rendered outline changes. Unknown ids fall
   *  back to a plain rectangle, so a diagram saved by a newer build
   *  still opens here. See `shape-geometry.ts`. */
  geom?: string;
  /** Validated inline PNG; stored with the native shape for JSON and undo. */
  canvasImage?: string;
  /** Demo v0.7.15: rotation about the shape center, in degrees.
   *  Absent / 0 = no rotation. Positive = clockwise. */
  rotation?: number;
}

export interface ShapeEllipse extends ShapeTextStyle {
  id: string;
  kind: 'ellipse';
  // Center + radii — simpler to draw & resize than xywh.
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  width: number;
  fillOpacity: number;
  text?: string;
  /** Demo v0.6: line-style variants (default 'solid'). */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** Demo v0.6: fill preset. Overrides fillOpacity when present. */
  fill?: 'none' | 'tint' | 'solid';
  /** Demo v0.7.15: rotation about the shape center, in degrees. */
  rotation?: number;
}

export interface ShapeCallout extends ShapeTextStyle {
  id: string;
  kind: 'callout';
  // Box top-left in flow coords
  x: number;
  y: number;
  w: number;
  h: number;
  // World-coord anchor the leader-line points to
  anchor: Point;
  text: string;
  color: string;
  width: number;
  /** Demo v0.6: leader-line style (default 'dashed'). */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** Demo v0.6: corner style for the note box (default 'rounded'). */
  corner?: 'sharp' | 'rounded';
  /** Demo v0.7.15: rotation about the box center, in degrees.
   *  Note: the callout's anchor stays in world space and does NOT
   *  rotate with the box — the leader line is redrawn each frame to
   *  point from the rotated box edge to the anchor. */
  rotation?: number;
}

export type Shape = ShapeArrow | ShapeRect | ShapeEllipse | ShapeCallout;
export type ShapeKind = Shape['kind'];

interface UndoAction {
  tabId: string;
  kind: 'stroke-add' | 'stroke-erase' | 'shape-add' | 'shape-add-many' | 'shape-update' | 'shape-delete' | 'shape-delete-many' | 'shape-update-many';
  stroke?: Stroke;
  shape?: Shape;
  // For shape-update we also need the PREVIOUS version of the shape.
  prevShape?: Shape;
  // For shape-delete-many — the batch of shapes removed.
  // For shape-add-many — the batch of shapes inserted.
  // For shape-update-many — the NEW shapes after the batch patch.
  shapes?: Shape[];
  // For shape-update-many — the PREVIOUS shapes before the batch patch,
  // in the same order as `shapes` so undo() can restore them one-to-one.
  prevShapes?: Shape[];
  /**
   * v0.9.29 — diagram edges that were attached to the deleted shape(s).
   *
   * They are detached from the diagram store WITHOUT a frame of its own and
   * carried here instead, so deleting a connected shape and undoing it stays
   * a single step across two undo stacks.
   */
  edges?: DiagramEdge[];
}

export interface Tab {
  id: string;
  name: string;
  diagram: Diagram;
  strokes: Stroke[];
  shapes: Shape[];
  /**
   * v0.9.35 — this tab's Notes page, held as Markdown.
   *
   * Per TAB rather than global because a tab is already "one case": the
   * write-up belongs with the diagram it describes, travels with it in the
   * saved `.json`, and a second case opened in a second tab gets its own
   * blank page instead of inheriting someone else's notes.
   */
  notes: string;
  /**
   * v0.9.65 — comment threads anchored into `notes`.
   *
   * Kept beside the note, never inside it: the highlight itself lives only in
   * the DOM (see notes-comments.ts), so the Markdown in `notes` stays exactly
   * what it would have been without this feature. These two fields must be
   * loaded and cleared TOGETHER — a note replaced without its comments leaves
   * every thread orphaned, and comments replaced without their note anchor
   * themselves to quotes that are no longer there.
   */
  comments: NoteComment[];
  /**
   * v0.9.66 — screenshots referenced from `notes`.
   *
   * Same rule as `comments`: loaded and cleared WITH the note. The Markdown
   * only carries `![caption](nds-img:id)`, so images left behind when a note
   * is replaced would be bytes nothing points at.
   */
  images: NoteImage[];
  /**
   * Saved pan + zoom for this tab. `undefined` means "never shown yet" —
   * the canvas fits the diagram instead of inheriting whatever pan/zoom
   * the previous tab happened to be at.
   */
  viewport?: CanvasViewport;
}

export interface TabsState {
  tabs: Tab[];
  activeTabId: string;
  undoStack: UndoAction[];

  addTab: () => void;
  addTabWithDiagram: (name: string, diagram: Diagram) => void;
  switchTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  moveTab: (id: string, targetId: string, side: 'before' | 'after') => boolean;
  deleteTab: (id: string) => void;

  addStroke: (stroke: Stroke) => void;
  eraseStrokeById: (strokeId: string) => void;

  addShape: (shape: Shape) => void;
  /** Insert several shapes as ONE undo frame (used by paste). */
  addShapes: (shapes: Shape[]) => void;
  updateShape: (shape: Shape) => void;
  updateShapes: (shapes: Shape[]) => void;
  deleteShape: (shapeId: string) => void;
  deleteShapes: (shapeIds: string[]) => void;

  /**
   * v0.7.8: Apply a partial style patch to every SELECTED shape whose
   * `kind` matches. Used by the toolbar style-dropdown panels
   * (ArrowStylePanel / RectStylePanel / EllipseStylePanel /
   * CalloutStylePanel) so that picking a new SHAPE / dash / head /
   * corner / fill / weight in the dropdown immediately updates the
   * arrows / rects / ellipses / callouts the user has selected — not
   * just the default template for the NEXT-drawn shape.
   *
   * Emits a SINGLE `shape-update-many` undo entry (one Ctrl+Z reverts
   * the whole batch, no matter how many shapes were selected).
   *
   * `selectedIds` is passed in explicitly so this store doesn't need
   * to depend on `annotation-store`.
   */
  applyStylePatch: (
    kind: ShapeKind,
    selectedIds: string[],
    patch: Partial<Shape>,
  ) => void;

  /**
   * v0.9.27 — write back where bound arrow endpoints actually ended up.
   *
   * Deliberately **does NOT push an undo frame**: this is derived state
   * catching up with a move the user already made (and already undid in one
   * step). Recording it would mean Ctrl+Z first rewinds the arrow, then the
   * node, for a single drag.
   *
   * `dropFromRef` / `dropToRef` unbind an end whose target no longer exists.
   * The arrow keeps its coordinates and freezes in place — deleting a shape
   * must never silently delete arrows the user drew.
   */
  syncArrowEnds: (
    updates: {
      id: string;
      from: Point;
      to: Point;
      dropFromRef?: boolean;
      dropToRef?: boolean;
    }[],
  ) => void;

  /** Wipe strokes + shapes on the active tab and drop its undo stack.
   *  Used by the header "New" button so a fresh canvas is truly blank.
   *  Does NOT touch the diagram — that is owned by `useDiagramStore`. */
  resetActiveTabAnnotations: () => void;

  /**
   * Replace the active tab's Notes page (Markdown).
   *
   * Deliberately NOT routed through the undo stack. The notes editor is a
   * plain textarea, so the browser already gives it a native per-field undo
   * history; pushing every keystroke onto the shared canvas stack as well
   * would mean one Ctrl+Z ambiguously either un-types a letter or un-deletes
   * a node, depending on where focus happened to be.
   */
  setActiveTabNotes: (notes: string) => void;

  /** Replace this tab's comment threads. Not routed through undo, like notes. */
  setActiveTabComments: (comments: NoteComment[]) => void;

  /** Replace this tab's stored screenshots. Not routed through undo, like notes. */
  setActiveTabImages: (images: NoteImage[]) => void;

  /**
   * Load a saved `.json` file: BOTH the diagram and its shapes / strokes.
   *
   * This is the only correct way to open a file. `useDiagramStore
   * .loadFromJson` replaces the diagram alone, which used to leave the
   * previous diagram's shapes floating over the newly loaded topology.
   *
   * A loaded file always REPLACES the canvas: a file with no `shapes` key
   * (anything saved before v0.9.26) clears the shapes that were on screen
   * rather than silently mixing two diagrams together.
   */
  loadStudioFile: (raw: string) => { ok: boolean; error?: string; dropped?: number };

  undo: () => void;

  activeTab: () => Tab;
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const initialTabId = makeId('tab');
const initialDiagram = makeEmptyTopology();

// Snapshot the CURRENT shared diagram into the outgoing tab so edits
// aren't lost when the user switches away. The canvas pan/zoom goes with
// it, so returning to a tab puts the user back exactly where they were.
function captureCurrentInto(tabs: Tab[], tabId: string): Tab[] {
  const currentDiagram = useDiagramStore.getState().diagram;
  const snapshot: Diagram = JSON.parse(JSON.stringify(currentDiagram)) as Diagram;
  const viewport = viewportBridge.get?.();
  return tabs.map((t) => (t.id === tabId ? { ...t, diagram: snapshot, viewport } : t));
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [{ id: initialTabId, name: 'Overview', diagram: initialDiagram, strokes: [], shapes: [], notes: '', comments: [], images: [] }],
  activeTabId: initialTabId,
  undoStack: [],

  addTab: () => {
    const s = get();
    // 1. Save current shared diagram into outgoing tab.
    const withSaved = captureCurrentInto(s.tabs, s.activeTabId);
    // 2. Create fresh blank tab.
    const id = makeId('tab');
    const n = withSaved.length + 1;
    const fresh: Tab = {
      id,
      name: `Tab ${n}`,
      diagram: makeEmptyTopology(),
      strokes: [],
      shapes: [],
      notes: '',
      comments: [],
      images: [],
    };
    set({ tabs: [...withSaved, fresh], activeTabId: id });
    // 3. Push blank diagram into shared store. Nothing to lay out, and a
    //    brand-new tab must not inherit the last tab's pan/zoom.
    useDiagramStore.getState().loadDiagram(fresh.diagram, { relayout: false });
    applyViewportSoon(undefined);
  },

  addTabWithDiagram: (name, diagram) => {
    const s = get();
    // 1. Save current shared diagram into outgoing tab.
    const withSaved = captureCurrentInto(s.tabs, s.activeTabId);
    // 2. Create new tab preloaded with the given diagram.
    const id = makeId('tab');
    const fresh: Tab = {
      id,
      name,
      diagram: JSON.parse(JSON.stringify(diagram)) as Diagram,
      strokes: [],
      shapes: [],
      notes: '',
      comments: [],
      images: [],
    };
    set({ tabs: [...withSaved, fresh], activeTabId: id });
    // 3. Load into shared store (this also runs relayoutForNoOverlap,
    //    which templates and AI-generated topologies genuinely need), then
    //    frame it — the incoming diagram is brand new to this tab.
    useDiagramStore.getState().loadDiagram(fresh.diagram);
    applyViewportSoon(undefined);
  },

  switchTab: (id) => {
    const s = get();
    if (id === s.activeTabId) return;
    const target = s.tabs.find((t) => t.id === id);
    if (!target) return;
    // 1. Save outgoing tab's diagram.
    const withSaved = captureCurrentInto(s.tabs, s.activeTabId);
    // 2. Switch pointer.
    set({ tabs: withSaved, activeTabId: id });
    // 3. Restore the incoming tab EXACTLY as the user left it. Re-running
    //    auto layout here is what used to grow containers and shift groups
    //    every time a tab was revisited.
    useDiagramStore.getState().loadDiagram(target.diagram, { relayout: false });
    applyViewportSoon(withSaved.find((t) => t.id === id)?.viewport);
  },

  renameTab: (id, name) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
    })),

  moveTab: (id, targetId, side) => {
    if (id === targetId) return false;
    const tabs = get().tabs;
    const from = tabs.findIndex(tab => tab.id === id);
    const target = tabs.findIndex(tab => tab.id === targetId);
    if (from < 0 || target < 0) {
      console.warn('Cannot reorder an unavailable diagram tab.', { id, targetId });
      return false;
    }
    let to = target + (side === 'after' ? 1 : 0);
    if (from < to) to--;
    if (from === to) return false;
    const next = [...tabs];
    const [moving] = next.splice(from, 1);
    next.splice(to, 0, moving);
    // Keep the live canvas and every tab object intact; auto-save merges by ID.
    set({ tabs: next });
    return true;
  },

  deleteTab: (id) => {
    const s = get();
    if (s.tabs.length <= 1) return;
    const idx = s.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const remaining = s.tabs.filter((t) => t.id !== id);
    let nextActiveId = s.activeTabId;
    let loadIntoShared: Diagram | null = null;
    let restoreViewport: CanvasViewport | undefined;
    if (s.activeTabId === id) {
      // Fall back to the previous tab (or the first one).
      const fallback = remaining[Math.max(0, idx - 1)];
      nextActiveId = fallback.id;
      loadIntoShared = fallback.diagram;
      restoreViewport = fallback.viewport;
    }
    // Also drop any undo entries for the deleted tab.
    const undoStack = s.undoStack.filter((u) => u.tabId !== id);
    set({ tabs: remaining, activeTabId: nextActiveId, undoStack });
    if (loadIntoShared) {
      // Same as switchTab: this is a restore, not an import.
      useDiagramStore.getState().loadDiagram(loadIntoShared, { relayout: false });
      applyViewportSoon(restoreViewport);
    }
  },

  addStroke: (stroke) =>
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, strokes: [...t.strokes, stroke] } : t
      );
      const undoStack: UndoAction[] = [
        ...s.undoStack,
        { tabId: s.activeTabId, kind: 'stroke-add', stroke },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    }),

  eraseStrokeById: (strokeId) =>
    set((s) => {
      const active = s.tabs.find((t) => t.id === s.activeTabId);
      if (!active) return s;
      const erased = active.strokes.find((k) => k.id === strokeId);
      if (!erased) return s;
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId
          ? { ...t, strokes: t.strokes.filter((k) => k.id !== strokeId) }
          : t
      );
      const undoStack: UndoAction[] = [
        ...s.undoStack,
        { tabId: s.activeTabId, kind: 'stroke-erase', stroke: erased },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    }),

  addShape: (shape) =>
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, shapes: [...t.shapes, shape] } : t
      );
      const undoStack: UndoAction[] = [
        ...s.undoStack,
        { tabId: s.activeTabId, kind: 'shape-add', shape },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    }),

  addShapes: (shapes) =>
    set((s) => {
      if (shapes.length === 0) return s;
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, shapes: [...t.shapes, ...shapes] } : t
      );
      // One frame for the whole batch — pasting three shapes must take one
      // Ctrl+Z, not three.
      const undoStack: UndoAction[] = [
        ...s.undoStack,
        { tabId: s.activeTabId, kind: 'shape-add-many', shapes },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    }),

  updateShape: (shape) =>
    set((s) => {
      const active = s.tabs.find((t) => t.id === s.activeTabId);
      if (!active) return s;
      const prev = active.shapes.find((sh) => sh.id === shape.id);
      if (!prev) return s;
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId
          ? { ...t, shapes: t.shapes.map((sh) => (sh.id === shape.id ? shape : sh)) }
          : t
      );
      const undoStack: UndoAction[] = [
        ...s.undoStack,
        { tabId: s.activeTabId, kind: 'shape-update', shape, prevShape: prev },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    }),

  deleteShape: (shapeId) => {
    const s = get();
    const active = s.tabs.find((t) => t.id === s.activeTabId);
    if (!active) return;
    const removed = active.shapes.find((sh) => sh.id === shapeId);
    if (!removed) return;
    // v0.9.29 — a shape can now be the endpoint of a real diagram edge, so
    // deleting it has to take those edges with it or the canvas keeps an
    // edge pointing at nothing. They ride along on THIS undo entry (rather
    // than pushing a frame on the diagram store's own stack) so the whole
    // deletion is still a single Ctrl+Z.
    const edges = useDiagramStore.getState().detachEdgesFor([shapeId]);
    set((cur) => {
      const tabs = cur.tabs.map((t) =>
        t.id === cur.activeTabId
          ? { ...t, shapes: t.shapes.filter((sh) => sh.id !== shapeId) }
          : t
      );
      const undoStack: UndoAction[] = [
        ...cur.undoStack,
        { tabId: cur.activeTabId, kind: 'shape-delete', shape: removed, edges },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    });
  },

  deleteShapes: (shapeIds) => {
    if (shapeIds.length === 0) return;
    const s = get();
    const active = s.tabs.find((t) => t.id === s.activeTabId);
    if (!active) return;
    const idSet = new Set(shapeIds);
    const removed = active.shapes.filter((sh) => idSet.has(sh.id));
    if (removed.length === 0) return;
    const edges = useDiagramStore.getState().detachEdgesFor(shapeIds);
    set((cur) => {
      const tabs = cur.tabs.map((t) =>
        t.id === cur.activeTabId
          ? { ...t, shapes: t.shapes.filter((sh) => !idSet.has(sh.id)) }
          : t
      );
      const undoStack: UndoAction[] = [
        ...cur.undoStack,
        { tabId: cur.activeTabId, kind: 'shape-delete-many', shapes: removed, edges },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    });
  },

  applyStylePatch: (kind, selectedIds, patch) =>
    set((s) => {
      if (selectedIds.length === 0) return s;
      const active = s.tabs.find((t) => t.id === s.activeTabId);
      if (!active) return s;
      const idSet = new Set(selectedIds);
      const prevShapes: Shape[] = [];
      const newShapes: Shape[] = [];
      const shapesAfter = active.shapes.map((sh) => {
        if (sh.kind !== kind || !idSet.has(sh.id)) return sh;
        prevShapes.push(sh);
        // Cast — TS can't narrow that `patch` matches `sh`'s exact
        // subtype (arrow/rect/ellipse/callout), but callers guard by
        // passing `kind` explicitly and only fields valid for that
        // kind. Runtime shape stays consistent.
        const next = { ...sh, ...patch } as Shape;
        newShapes.push(next);
        return next;
      });
      if (prevShapes.length === 0) return s;
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, shapes: shapesAfter } : t,
      );
      const undoStack: UndoAction[] = [
        ...s.undoStack,
        {
          tabId: s.activeTabId,
          kind: 'shape-update-many',
          shapes: newShapes,
          prevShapes,
        },
      ];
      undoRouter.record('annotation');
      return { tabs, undoStack: undoStack.slice(-100) };
    }),

  // Batch shape mutation with a single undo entry. Used by group move where
  // many shapes update on every pointer-move event.
  updateShapes: (updated) =>
    set((s) => {
      if (updated.length === 0) return s;
      const active = s.tabs.find((t) => t.id === s.activeTabId);
      if (!active) return s;
      const byId = new Map(updated.map((u) => [u.id, u]));
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId
          ? {
              ...t,
              shapes: t.shapes.map((sh) => (byId.has(sh.id) ? byId.get(sh.id)! : sh)),
            }
          : t
      );
      // Intentional: no undo entry here — the collapse pass in ShapeOverlay
      // is responsible for pushing a single "shape-update-batch" entry
      // with the pre-drag snapshots. See collapseTailGroupMove().
      return { tabs };
    }),

  undo: () => {
    const pending = get().undoStack;
    if (pending.length === 0) return;
    // v0.9.29 — put back the edges that rode along on a shape deletion.
    // Done BEFORE the set() below so the reducer stays a pure state
    // transition, and history-free so this stays one Ctrl+Z.
    const tail = pending[pending.length - 1];
    if (tail.edges && tail.edges.length > 0) {
      useDiagramStore.getState().restoreEdges(tail.edges);
    }
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const last = s.undoStack[s.undoStack.length - 1];
      const undoStack = s.undoStack.slice(0, -1);
      const tabs = s.tabs.map((t) => {
        if (t.id !== last.tabId) return t;
        if (last.kind === 'stroke-add' && last.stroke) {
          return { ...t, strokes: t.strokes.filter((k) => k.id !== last.stroke!.id) };
        }
        if (last.kind === 'stroke-erase' && last.stroke) {
          return { ...t, strokes: [...t.strokes, last.stroke] };
        }
        if (last.kind === 'shape-add' && last.shape) {
          return { ...t, shapes: t.shapes.filter((sh) => sh.id !== last.shape!.id) };
        }
        if (last.kind === 'shape-add-many' && last.shapes) {
          const drop = new Set(last.shapes.map((sh) => sh.id));
          return { ...t, shapes: t.shapes.filter((sh) => !drop.has(sh.id)) };
        }
        if (last.kind === 'shape-delete' && last.shape) {
          return { ...t, shapes: [...t.shapes, last.shape] };
        }
        if (last.kind === 'shape-delete-many' && last.shapes) {
          return { ...t, shapes: [...t.shapes, ...last.shapes] };
        }
        if (last.kind === 'shape-update' && last.prevShape) {
          return {
            ...t,
            shapes: t.shapes.map((sh) => (sh.id === last.prevShape!.id ? last.prevShape! : sh)),
          };
        }
        if (last.kind === 'shape-update-many' && last.prevShapes) {
          // Restore every shape in `prevShapes` by id. Any shapes not
          // in the batch keep their current form.
          const prevById = new Map(last.prevShapes.map((sh) => [sh.id, sh]));
          return {
            ...t,
            shapes: t.shapes.map((sh) => prevById.get(sh.id) ?? sh),
          };
        }
        return t;
      });
      // Router bookkeeping — mirror the pop the tabs-store just did.
      // The shortcut handler `useKeyboardShortcuts` also calls
      // commitUndo when it routes here, so this stays in sync whether
      // undo() is triggered by the toolbar button OR the shortcut.
      undoRouter.commitUndo();
      return { tabs, undoStack };
    });
  },

  syncArrowEnds: (updates) =>
    set((s) => {
      if (updates.length === 0) return s;
      const byId = new Map(updates.map((u) => [u.id, u]));
      let touched = false;
      const tabs = s.tabs.map((t) => {
        if (t.id !== s.activeTabId) return t;
        const shapes = t.shapes.map((sh) => {
          const u = byId.get(sh.id);
          if (!u || sh.kind !== 'arrow') return sh;
          touched = true;
          const next: ShapeArrow = { ...sh, from: u.from, to: u.to };
          if (u.dropFromRef) delete next.fromRef;
          if (u.dropToRef) delete next.toRef;
          return next;
        });
        return { ...t, shapes };
      });
      return touched ? { tabs } : s;
    }),

  resetActiveTabAnnotations: () =>
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, strokes: [], shapes: [] } : t,
      );
      // Reset the undo stack — undoing a "New" click should not resurrect
      // strokes/shapes from a diagram the user just cleared.
      undoRouter.dropSource('annotation');
      return { tabs, undoStack: [] };
    }),

  setActiveTabNotes: (notes) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, notes } : t)),
    })),

  setActiveTabComments: (comments) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, comments } : t)),
    })),

  setActiveTabImages: (images) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, images } : t)),
    })),

  loadStudioFile: (raw) => {
    const res = useDiagramStore.getState().loadFromJson(raw);
    if (!res.ok) return { ok: false, error: res.error };

    // Unconditional replace. `res.shapes` is [] for a pre-v0.9.26 file, and
    // that is exactly right: the canvas must show the file that was opened,
    // never a mix of it and whatever was there before.
    //
    // NOTES ARE THE ONE EXCEPTION, AND THE `??` IS LOAD-BEARING (v0.9.38)
    //
    // `res.notes` is `undefined` only when the file has NO `notes` key at
    // all — i.e. it was written before v0.9.35. Such a file has no opinion
    // about notes, so it must not be allowed to destroy them. A file saved
    // by any current build always carries the key, so `notes: ""` still
    // clears the page exactly as it should.
    //
    // Falling back to `''` here instead of `t.notes` is what made opening an
    // older diagram wipe the engineer's write-up with no undo — the load
    // clears `undoStack` two lines down, so there was nothing to recover
    // with. Losing a customer case write-up is far worse than the staleness
    // this once guarded against, which the user can see and delete.
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === s.activeTabId
          ? {
              ...t,
              shapes: res.shapes ?? [],
              strokes: res.strokes ?? [],
              notes: res.notes ?? t.notes,
              // In lockstep with `notes` above, and for the same reason: a
              // file with no `comments` key predates v0.9.65 and has no
              // opinion, so it must not wipe threads the user is holding. A
              // file that DOES carry the key replaces them outright, including
              // with `[]`, which is how "I resolved and deleted them all"
              // survives a save/load round trip.
              comments: res.comments ?? (res.notes === undefined ? t.comments : []),
              // Same rule again. The bytes are also pushed into the in-memory
              // resolver and IndexedDB below, because `markdownToDom` reads
              // them synchronously and a reload has to find them again.
              images: res.images ?? (res.notes === undefined ? t.images : []),
            }
          : t,
      );
      // The undo stack described shapes that no longer exist.
      undoRouter.dropSource('annotation');
      return { tabs, undoStack: [] };
    });
    (res.images ?? []).forEach(persistImage);
    return { ok: true, dropped: res.dropped };
  },

  activeTab: () => {
    const s = get();
    return s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
  },
}));

// Testing hook — mirrors `window.__nds_diagramStore`. Lets Playwright
// scripts call `addShape` / `updateShape` / etc. directly without going
// through drag-draw gestures on invisible overlay SVG surfaces.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_tabsStore?: typeof useTabsStore }).__nds_tabsStore =
    useTabsStore;
}

// Geometry helpers used by the eraser hit-test.
export function distSqPointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return ex * ex + ey * ey;
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = p.x - cx;
  const ey = p.y - cy;
  return ex * ex + ey * ey;
}

export function findStrokeAt(strokes: Stroke[], p: Point, radius: number): Stroke | null {
  const r2 = radius * radius;
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    const pts = s.points;
    if (pts.length === 1) {
      const d = (pts[0].x - p.x) ** 2 + (pts[0].y - p.y) ** 2;
      if (d <= r2 + s.width * s.width) return s;
      continue;
    }
    for (let j = 0; j < pts.length - 1; j++) {
      const d = distSqPointToSegment(p, pts[j], pts[j + 1]);
      if (d <= r2 + (s.width * s.width) / 4) return s;
    }
  }
  return null;
}

export function strokeToPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const { x, y } = points[0];
    return `M ${x} ${y} L ${x + 0.01} ${y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

// -------- SHAPE HIT-TEST -----------------------------------------------
// Returns the top-most shape whose "hit region" contains `p`.
// The hit region for arrows is the segment ± width/2 + a small pad.
// For rect / callout: inside the box, OR within pad of the border.
// For ellipse: inside the ellipse.
// v0.7.18 — BUG 2 fix: when a shape has a non-zero rotation, we un-rotate
// the click point around the shape's rotation center BEFORE testing the
// local (pre-rotation) region. This makes the hit region match what the
// user actually sees on screen.

export function hitTestShape(shapes: Shape[], p: Point, pad: number): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const sh = shapes[i];
    // Compute rotation and its geometric center for this shape.
    const rot =
      sh.kind === 'rect' || sh.kind === 'ellipse' || sh.kind === 'callout' || sh.kind === 'arrow'
        ? sh.rotation ?? 0
        : 0;
    let cx = 0;
    let cy = 0;
    if (sh.kind === 'rect' || sh.kind === 'callout') {
      cx = sh.x + sh.w / 2;
      cy = sh.y + sh.h / 2;
    } else if (sh.kind === 'ellipse') {
      cx = sh.cx;
      cy = sh.cy;
    } else if (sh.kind === 'arrow') {
      cx = (sh.from.x + sh.to.x) / 2;
      cy = (sh.from.y + sh.to.y) / 2;
    }
    // Un-rotate the click point into shape-local frame.
    let lp: Point = p;
    if (rot) {
      const rad = (-rot * Math.PI) / 180;
      const s = Math.sin(rad);
      const co = Math.cos(rad);
      const vx = p.x - cx;
      const vy = p.y - cy;
      lp = { x: cx + vx * co - vy * s, y: cy + vx * s + vy * co };
    }
    if (sh.kind === 'arrow') {
      const d2 = distSqPointToSegment(lp, sh.from, sh.to);
      const r = pad + sh.width;
      if (d2 <= r * r) return sh;
    } else if (sh.kind === 'rect' || sh.kind === 'callout') {
      if (
        lp.x >= sh.x - pad &&
        lp.x <= sh.x + sh.w + pad &&
        lp.y >= sh.y - pad &&
        lp.y <= sh.y + sh.h + pad
      ) {
        return sh;
      }
    } else if (sh.kind === 'ellipse') {
      const dx = (lp.x - sh.cx) / Math.max(1, sh.rx);
      const dy = (lp.y - sh.cy) / Math.max(1, sh.ry);
      if (dx * dx + dy * dy <= 1.05) return sh;
    }
  }
  return null;
}

/**
 * Normalize a Rect (or Callout) so w/h are positive. Users can drag
 * from bottom-right to top-left, so w/h can go negative during creation.
 */
export function normalizeBox(x: number, y: number, w: number, h: number) {
  const nx = w < 0 ? x + w : x;
  const ny = h < 0 ? y + h : y;
  return { x: nx, y: ny, w: Math.abs(w), h: Math.abs(h) };
}
