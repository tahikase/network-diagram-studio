// Demo v0.7.7: cross-store Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z handler.
//
// The demo app has TWO independent undo stacks:
//   • `useDiagramStore.history`   — diagram nodes/edges
//   • `useTabsStore.undoStack`    — annotation shapes/strokes
//
// A single `Ctrl+Z` must undo exactly ONE — the LAST one the user
// touched — not both. Before v0.7.7 both `useKeyboardShortcuts` and
// `useAnnotationShortcuts` attached a `window keydown` and each called
// its own store's `undo()` on Ctrl+Z, so one press popped both stacks
// at once (two undos per press).
//
// This hook is the SOLE Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z handler in the
// app. `useKeyboardShortcuts` no longer handles those keys at all.
//
// NOTE: both entries (`src/main.tsx` for prod and `src/main-demo.tsx`
// for non-prod) render the same `DemoApp` root, so this file ships in
// BOTH bundles. It must never be gated on `IS_DEMO` — doing so is what
// caused the v0.8.1 double-undo bug in prod.
//
// Routing:
//   1. Peek the router's undo journal.
//   2. If the tail marker points at a store that CAN undo, run it.
//   3. Otherwise drop the stale marker and retry.
//      Stale markers come from `collapseTailUpdatesTo` merging N frames
//      into 1 (drops N-1 tail records), from tabs-store's `slice(-100)`
//      capping the oldest entries silently, or from any code path that
//      doesn't route through the router.
//   4. Fall back to whichever store CAN undo when the journal is
//      empty — preserves undo functionality if the router ever drifts
//      out of sync with the stores.
import { useEffect } from 'react';
import { useDiagramStore } from '../store/diagram-store';
import { undoRouter } from '../store/undo-router';
import { useTabsStore } from './tabs-store';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useDemoUndoShortcut() {
  useEffect(() => {
    const canDiagramUndo = () =>
      useDiagramStore.getState().history.past.length > 0;
    const canDiagramRedo = () =>
      useDiagramStore.getState().history.future.length > 0;
    const canAnnotationUndo = () =>
      useTabsStore.getState().undoStack.length > 0;
    // tabs-store has no redo — annotation is undo-only. Any
    // 'annotation' marker on the redo journal is by definition stale.
    const canAnnotationRedo = () => false;

    const routeUndo = (): 'diagram' | 'annotation' | undefined => {
      const initialLen = undoRouter.snapshot().undoJournal.length;
      for (let i = 0; i <= initialLen; i++) {
        const src = undoRouter.peekUndo();
        if (!src) return undefined;
        if (src === 'diagram' && canDiagramUndo()) return 'diagram';
        if (src === 'annotation' && canAnnotationUndo()) return 'annotation';
        undoRouter.dropTailUndo();
      }
      return undefined;
    };

    const routeRedo = (): 'diagram' | 'annotation' | undefined => {
      const initialLen = undoRouter.snapshot().redoJournal.length;
      for (let i = 0; i <= initialLen; i++) {
        const src = undoRouter.peekRedo();
        if (!src) return undefined;
        if (src === 'diagram' && canDiagramRedo()) return 'diagram';
        if (src === 'annotation' && canAnnotationRedo()) return 'annotation';
        undoRouter.dropTailRedo();
      }
      return undefined;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const routed = routeUndo();
        if (routed === 'diagram') {
          useDiagramStore.getState().undo();
          // commitUndo() runs inside diagramStore.undo() itself.
        } else if (routed === 'annotation') {
          useTabsStore.getState().undo();
          // commitUndo() runs inside tabsStore.undo() itself.
        } else if (canDiagramUndo()) {
          useDiagramStore.getState().undo();
        } else if (canAnnotationUndo()) {
          useTabsStore.getState().undo();
        }
        return;
      }

      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        const routed = routeRedo();
        if (routed === 'diagram') {
          useDiagramStore.getState().redo();
        } else if (routed === 'annotation') {
          // tabsStore has no redo — no-op. Left for symmetry if
          // annotation ever gains redo.
        } else if (canDiagramRedo()) {
          useDiagramStore.getState().redo();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
