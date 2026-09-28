import { useEffect } from 'react';
import { useDiagramStore } from '../store/diagram-store';
import { collectNodeSubtree, type NodeClipboardPayload } from '../model/node-clipboard';
import { useTabsStore, type Shape } from './tabs-store';
import { useAnnotationStore } from './annotation-store';
import { runtimeExtensions } from '../runtime/extensions';

// Ctrl+C / Ctrl+V for the canvas.
//
// Sits alongside `useKeyboardShortcuts` (Ctrl+D) and `useDemoUndoShortcut`
// (Ctrl+Z / Ctrl+Y), and like them is mounted from `DemoApp` so it ships in
// BOTH bundles. It must never be gated on IS_DEMO — see the header comment in
// useKeyboardShortcuts.ts for what happened the last time a shortcut hook
// was.
//
// The packaged runtime uses browser copy/paste events and an opaque clipboard
// token. Editable payloads stay in this window; bitmap pastes cannot replay a
// stale resource selection. Source-only development retains keyboard fallback.
type Clip =
  | { kind: 'nodes'; payload: NodeClipboardPayload }
  | { kind: 'shapes'; shapes: Shape[] };

let clipboard: Clip | null = null;
// Successive pastes of the same clip cascade instead of stacking exactly on
// top of each other, so pressing Ctrl+V three times gives three visible
// copies rather than one apparent copy with two hidden underneath.
let pasteCount = 0;

const PASTE_STEP = 40;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null;
  if (!el) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true;
  return el.isContentEditable || !!el.closest('[data-nds-text-editor]');
}

/**
 * True when the user has actually highlighted some text. Ctrl+C must then fall
 * through to the browser — silently swallowing a genuine text copy (a node
 * name, a value out of the property panel) to copy a node instead would be a
 * regression, not a feature.
 */
function hasTextSelection(): boolean {
  const sel = window.getSelection();
  return !!sel && !sel.isCollapsed && sel.toString().trim().length > 0;
}

function makeShapeId(): string {
  return `sh_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Offset a shape for pasting.
 *
 * Deliberately different from ShapeOverlay's `translateShapeGeometry`, which
 * keeps a callout's anchor pinned in world space because it is dragging the
 * existing shape. A *pasted* callout must bring its anchor along, or the copy
 * lands with its leader line still pointing at whatever the original was
 * annotating.
 */
function offsetShapeForPaste(sh: Shape, d: number): Shape {
  const id = makeShapeId();
  if (sh.kind === 'arrow') {
    return {
      ...sh,
      id,
      from: { x: sh.from.x + d, y: sh.from.y + d },
      to: { x: sh.to.x + d, y: sh.to.y + d },
    };
  }
  // Ellipses are stored as a centre + radii, not a top-left box.
  if (sh.kind === 'ellipse') return { ...sh, id, cx: sh.cx + d, cy: sh.cy + d };
  if (sh.kind === 'callout') {
    return { ...sh, id, x: sh.x + d, y: sh.y + d, anchor: { x: sh.anchor.x + d, y: sh.anchor.y + d } };
  }
  return { ...sh, id, x: sh.x + d, y: sh.y + d };
}

function copySelection(): Clip | null {
  // Shapes win when any are selected, mirroring how ShapeOverlay's Delete
  // handler resolves the same ambiguity.
  const shapeIds = useAnnotationStore.getState().selectedShapeIds;
  if (shapeIds.length > 0) {
    const picked = new Set(shapeIds);
    const shapes = useTabsStore
      .getState()
      .activeTab()
      .shapes.filter((sh) => picked.has(sh.id));
    if (shapes.length > 0) {
      return { kind: 'shapes', shapes: shapes.map((sh) => structuredCloneShape(sh)) };
    }
  }

  const state = useDiagramStore.getState();
  if (state.selectedNodeIds.length) {
    const payload = collectNodeSubtree(state.diagram, state.selectedNodeIds);
    if (payload.nodes.length > 0) return { kind: 'nodes', payload };
  }
  return null;
}

// Snapshot the shape so a later edit (or delete) of the original can't reach
// back into what is sitting on the clipboard.
function structuredCloneShape(sh: Shape): Shape {
  return JSON.parse(JSON.stringify(sh)) as Shape;
}

export function useClipboardShortcuts() {
  useEffect(() => {
    const copy = () => {
      if (hasTextSelection()) return false;
      const clip = copySelection();
      if (!clip) return false;
      clipboard = clip;
      pasteCount = 0;
      return true;
    };
    const paste = () => {
      if (!clipboard) throw new Error('No canvas selection has been copied.');
      const d = PASTE_STEP * ++pasteCount;
      if (clipboard.kind === 'nodes') {
        useDiagramStore.getState().pasteNodes(clipboard.payload, { x: d, y: d });
        return;
      }
      const copies = clipboard.shapes.map((shape) => offsetShapeForPaste(shape, d));
      useTabsStore.getState().addShapes(copies);
      useAnnotationStore.getState().setSelectedShapes(copies.map((shape) => shape.id));
    };
    const images = runtimeExtensions().ndsCanvasImages;
    if (images) return images.installClipboard(copy, paste);

    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'c' && key !== 'v') return;
      // A text field owns its own clipboard behaviour, always.
      if (isTypingTarget(e.target)) return;

      if (key === 'c') {
        if (copy()) e.preventDefault();
        return;
      }

      if (!clipboard) return;
      e.preventDefault();
      paste();
    };

    // Capture phase, matching Ctrl+D, so the handler runs before anything
    // inside the React Flow pane can stop propagation.
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);
}
