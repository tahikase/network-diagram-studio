// Demo v0.5: keyboard shortcuts for the annotation tools.
// C → Move, V → Hand, P → Pencil, E → Eraser.
//
// v0.7.7: Ctrl/Cmd+Z was REMOVED from this hook — the sole Ctrl+Z /
// Ctrl+Y handler now lives in `useKeyboardShortcuts.ts` and routes via
// `undoRouter`. Previously this hook ALSO listened for Ctrl+Z and ran
// tabsStore.undo() unconditionally, so a single keystroke popped both
// the diagram AND annotation stacks at once — undoing two operations
// per press. See `src/store/undo-router.ts` for the design.
//
// Shortcuts are IGNORED when focus is inside any text input, textarea, or
// contenteditable, so typing "e" into a case-title field doesn't switch
// tools.
import { useEffect } from 'react';
import { useAnnotationStore } from './annotation-store';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useAnnotationShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // Ctrl+Z is intentionally NOT handled here — see file header.
      // Skip any modified-key press so tool letters don't fire while
      // the user holds Ctrl/Cmd/Alt for the shortcut handled elsewhere.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const setTool = useAnnotationStore.getState().setTool;

      switch (e.key.toLowerCase()) {
        case 'c':
          setTool('move');
          break;
        case 'v':
          setTool('pan');
          break;
        case 'p':
          setTool('pen');
          break;
        case 'e':
          setTool('eraser');
          break;
        case 'a':
          setTool('shape-arrow');
          break;
        case 'r':
          setTool('shape-rect');
          break;
        case 'o':
          setTool('shape-ellipse');
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
