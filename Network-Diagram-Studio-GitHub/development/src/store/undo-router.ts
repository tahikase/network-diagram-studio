/**
 * Cross-store undo/redo router — v0.7.7.
 *
 * The app keeps two independent undo stacks:
 *   • `useDiagramStore.history`   — nodes/edges (via `withHistory`)
 *   • `useTabsStore.undoStack`    — shapes/strokes (per active tab)
 *
 * Each store's own toolbar button (Header ↶ Undo / annotation ↶ Undo)
 * intentionally pops ONLY its own stack — that scoped behaviour is
 * correct because each button lives next to the content it undoes.
 *
 * A global keyboard shortcut, however, must behave like every other
 * drawing app: `Ctrl+Z` undoes the LAST thing the user did, whether it
 * was a diagram change or an annotation change. The pre-v0.7.7 bug was
 * that BOTH `useKeyboardShortcuts` (diagram) and `useAnnotationShortcuts`
 * (annotation) attached a `window keydown` listener and both called
 * their own `undo()` on `Ctrl+Z`, so a single keystroke popped both
 * stacks at once — undoing two operations per press when only one
 * was intended.
 *
 * This router keeps a chronological journal of every `record(...)` call
 * emitted by the two stores. `peekUndo` tells the shortcut handler which
 * store to route to; `commitUndo` moves the marker to the redo journal
 * so `Ctrl+Y` / `Ctrl+Shift+Z` can replay it in reverse order.
 *
 * Consumers:
 *   • `diagram-store.ts` — `withHistory` calls `undoRouter.record('diagram')`
 *   • `tabs-store.ts`    — every action that pushes to `undoStack` calls
 *                          `undoRouter.record('annotation')`
 *   • `useKeyboardShortcuts.ts` — the SOLE `Ctrl+Z` / `Ctrl+Y` handler,
 *                                 routes via `peekUndo` / `peekRedo`.
 *
 * The router is a plain module singleton — no Zustand, no React, no
 * subscriptions — because a global keyboard shortcut is a global concern.
 */

/** Which store originated the recorded undo frame. */
export type UndoSource = 'diagram' | 'annotation';

let undoJournal: UndoSource[] = [];
let redoJournal: UndoSource[] = [];

export const undoRouter = {
  /**
   * Called by a store IMMEDIATELY after it pushes a new frame onto its
   * own undo stack. A brand-new action always invalidates any pending
   * redo trail — mirrors the classic "linear undo" model where a new
   * edit disables Redo.
   */
  record(source: UndoSource): void {
    undoJournal.push(source);
    if (redoJournal.length > 0) redoJournal = [];
  },

  /**
   * Peek the tail without mutating. Used by the shortcut handler to
   * decide WHICH store's `undo()` to call before actually invoking it,
   * so the router state stays consistent with the store state (see
   * `commitUndo` below).
   */
  peekUndo(): UndoSource | undefined {
    return undoJournal[undoJournal.length - 1];
  },

  /**
   * Peek the tail of the redo journal without mutating. Used the same
   * way `peekUndo` is used but for `Ctrl+Y` / `Ctrl+Shift+Z`.
   */
  peekRedo(): UndoSource | undefined {
    return redoJournal[redoJournal.length - 1];
  },

  /**
   * Move the tail marker from the undo journal onto the redo journal.
   * Called by the shortcut handler AFTER the store's `undo()` has run,
   * so ordering matches the store's actual state transition.
   */
  commitUndo(): void {
    const s = undoJournal.pop();
    if (s !== undefined) redoJournal.push(s);
  },

  /**
   * Reverse of `commitUndo` — move the tail marker back from redo to
   * undo. Called AFTER the store's `redo()` runs.
   */
  commitRedo(): void {
    const s = redoJournal.pop();
    if (s !== undefined) undoJournal.push(s);
  },

  /**
   * Wipe both journals. Called when the whole diagram or tab is
   * replaced (`loadDiagram`, `clear`, `loadFromJson`, `loadSample`) so
   * the router doesn't retain markers pointing at frames that no
   * longer exist in the corresponding store's `past`/`undoStack`.
   */
  reset(): void {
    undoJournal = [];
    redoJournal = [];
  },

  /**
   * Drop ALL markers of a given source from both journals. Called by a
   * store that is resetting its OWN undo stack without wanting to lose
   * the other store's history — for example
   * `resetActiveTabAnnotations` in `tabs-store.ts` wipes only the
   * annotation-undo stack, not the diagram's.
   */
  dropSource(source: UndoSource): void {
    undoJournal = undoJournal.filter((s) => s !== source);
    redoJournal = redoJournal.filter((s) => s !== source);
  },

  /**
   * Drop the tail-most undo marker WITHOUT moving it to the redo
   * journal. Used by the shortcut handler when the store the marker
   * points at has nothing left to undo (a "stale" marker) — this
   * happens whenever undo entries are collapsed after the fact
   * (e.g. `collapseTailUpdatesTo` in ShapeOverlay merges N shape-update
   * frames into 1) or when the store caps its stack (e.g. tabs-store's
   * 100-entry `slice(-100)`) and drops the oldest entries silently.
   *
   * The shortcut handler calls this in a loop until either `peekUndo`
   * returns `undefined` or the tail marker points at a store that DOES
   * have something to undo.
   */
  dropTailUndo(): UndoSource | undefined {
    return undoJournal.pop();
  },

  /**
   * Redo-journal counterpart of `dropTailUndo`. Same rationale.
   */
  dropTailRedo(): UndoSource | undefined {
    return redoJournal.pop();
  },

  /**
   * Test hooks — inspect the journals without exposing the underlying
   * arrays. Consumed by the Playwright verify script; also useful for
   * debugging in the browser devtools console via
   * `window.__nds_undoRouter.snapshot()`.
   */
  snapshot(): { undoJournal: UndoSource[]; redoJournal: UndoSource[] } {
    return { undoJournal: [...undoJournal], redoJournal: [...redoJournal] };
  },
};

// Testing hook — mirrors `window.__nds_diagramStore`. Playwright reads
// `snapshot()` to confirm the journals track store pushes correctly.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_undoRouter?: typeof undoRouter }).__nds_undoRouter =
    undoRouter;
}
