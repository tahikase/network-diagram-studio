// useAutoSave
// -------------------------------------------------------------------------
// Wire the auto-save mechanism to the studio's stores. On mount we
// hydrate from any prior snapshot, then subscribe to changes in both the
// diagram-store and the tabs-store and debounce a save. We also force a
// synchronous save on `beforeunload` so the last few edits survive a
// close-tab or refresh.
import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../store/diagram-store';
import { useTabsStore } from '../demo/tabs-store';
import { restore, snapshot, type RestoreSummary } from './auto-save';

const SAVE_DEBOUNCE_MS = 800;

export type AutoSaveStatus = 'idle' | 'dirty' | 'saved' | 'error';

export interface AutoSaveState {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
  restoredSummary: RestoreSummary | null;
}

export function useAutoSave(): AutoSaveState {
  const [state, setState] = useState<AutoSaveState>({
    status: 'idle',
    lastSavedAt: null,
    restoredSummary: null,
  });

  // We need to know when hydration is done before we start listening for
  // changes — otherwise the `loadDiagram()` call during restore looks like
  // a fresh edit and immediately re-saves the same state.
  const hydratedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const summary = restore();
    hydratedRef.current = true;
    if (summary) {
      setState({
        status: 'saved',
        lastSavedAt: Date.parse(summary.savedAtIso),
        restoredSummary: summary,
      });
    }
  }, []);

  useEffect(() => {
    const scheduleSave = () => {
      if (!hydratedRef.current) return;
      setState((s) => s.status === 'dirty' ? s : { ...s, status: 'dirty' });
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        const saved = snapshot();
        setState((s) => ({ ...s, status: saved ? 'saved' : 'error', lastSavedAt: saved ? Date.now() : s.lastSavedAt }));
        timerRef.current = null;
      }, SAVE_DEBOUNCE_MS);
    };

    // Subscribe to the two stores that own studio state.
    const unsubDiagram = useDiagramStore.subscribe(scheduleSave);
    const unsubTabs = useTabsStore.subscribe(scheduleSave);

    // A last-ditch synchronous save if the user closes / reloads the tab
    // while a debounced save is still pending.
    const onBeforeUnload = () => {
      if (!hydratedRef.current) return;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      snapshot();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      unsubDiagram();
      unsubTabs();
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return state;
}
