import { useEffect } from 'react';
import { useDiagramStore } from '../store/diagram-store';
import { isImportedIconId } from '../icons/imported-assets';
import { collectNodeSubtree } from '../model/node-clipboard';

// Global keyboard shortcuts. Delete/Backspace are handled by React Flow's
// deleteKeyCode; we handle duplicate (Ctrl+D) here.
//
// v0.8.1 — Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z are NOT handled here at all.
// Both the prod entry (`src/main.tsx`) and the demo entry
// (`src/main-demo.tsx`) render the same `DemoApp` root, which always
// mounts `useDemoUndoShortcut`. That hook owns undo/redo so a single
// keypress pops exactly one of the two undo stacks (diagram +
// annotation) via the cross-store `undoRouter`.
//
// This used to be gated behind `IS_DEMO`, which was correct only while
// prod had its own root component. Once prod switched to `DemoApp`,
// `IS_DEMO === false` meant BOTH this hook and `useDemoUndoShortcut`
// answered Ctrl+Z, popping two history frames per press — a bug that
// reproduced in the prod bundle and on the dev server, but never in
// the demo bundle.
//
// v0.8 — Ctrl+D shortcut hardening. Two changes:
//   1. Register with `{ capture: true }` so browsers can't claim
//      Ctrl+D for their bookmark dialog before our handler runs.
//   2. Read `selectedNodeId` / `nodes` from `useDiagramStore.getState()`
//      inside the handler so the shortcut always uses the freshest
//      selection — never a stale closure from an earlier render.
export function useKeyboardShortcuts() {
  const addNode = useDiagramStore((s) => s.addNode);
  const updateNodeName = useDiagramStore((s) => s.updateNodeName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.isContentEditable || (target instanceof Element && target.closest('[data-nds-text-editor]'))) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        // Live read — freshest selection + nodes, no stale closure.
        const state = useDiagramStore.getState();
        const selectedId = state.selectedNodeId;
        if (!selectedId) return;
        const src = state.diagram.nodes.find((n) => n.id === selectedId);
        if (!src) return;
        if (isImportedIconId(src.data.iconId)) {
          const payload = collectNodeSubtree(state.diagram, [selectedId]);
          payload.nodes = payload.nodes.map(node => node.id === selectedId
            ? { ...node, data: { ...node.data, name: `${src.data.name} copy` } } : node);
          state.pasteNodes(payload, { x: 40, y: 40 });
          return;
        }
        const newId = addNode(src.type, {
          x: src.position.x + 40,
          y: src.position.y + 40,
        });
        updateNodeName(newId, `${src.data.name} copy`);
      }
    };
    // Capture phase preempts browser default (Ctrl+D bookmarks) even
    // when focus is on a nested element inside ReactFlow's canvas.
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [addNode, updateNodeName]);
}
