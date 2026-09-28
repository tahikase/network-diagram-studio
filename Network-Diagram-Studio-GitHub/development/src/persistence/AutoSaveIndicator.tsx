// AutoSaveIndicator
// -------------------------------------------------------------------------
// Compact status pill designed to sit inline in the header. Shows one of:
//   • "Restored N tabs" — briefly on load when a prior snapshot was hydrated
//   • "Saving…"         — while a debounced save is pending
//   • "Saved · Xs ago"  — after the debounced save flushed to localStorage
//
// Clicking the pill opens a small menu with "Clear saved data".
import { useEffect, useRef, useState } from 'react';
import { clearSaved } from './auto-save';
import type { AutoSaveState } from './useAutoSave';
import { useT } from '../i18n/useT';

function formatRelative(ms: number | null, t: (source: string) => string): string {
  if (ms === null) return '';
  const delta = Math.max(0, Date.now() - ms);
  if (delta < 5_000) return t('just now');
  if (delta < 60_000) return `${Math.round(delta / 1000)}${t('s ago')}`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}${t('m ago')}`;
  return new Date(ms).toLocaleTimeString();
}

export function AutoSaveIndicator({ state }: { state: AutoSaveState }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [showRestored, setShowRestored] = useState<boolean>(!!state.restoredSummary);
  const [, forceRepaint] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Auto-dismiss the "Restored" flash after ~6 s.
  useEffect(() => {
    if (!state.restoredSummary) return;
    setShowRestored(true);
    const t = window.setTimeout(() => setShowRestored(false), 6000);
    return () => window.clearTimeout(t);
  }, [state.restoredSummary]);

  // Repaint the relative-time label every 15 s.
  useEffect(() => {
    const iv = window.setInterval(() => forceRepaint((n) => n + 1), 15_000);
    return () => window.clearInterval(iv);
  }, []);

  // Close the menu on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  let label = t('Auto-save ready');
  let dot = '#94a3b8';
  if (state.status === 'error') {
    label = t('Auto-save failed');
    dot = '#dc2626';
  } else if (showRestored && state.restoredSummary) {
    label = `${t('Restored')} ${state.restoredSummary.tabCount} ${state.restoredSummary.tabCount === 1 ? t('tab') : t('tabs')}`;
    dot = '#0ea5e9';
  } else if (state.status === 'dirty') {
    label = t('Saving…');
    dot = '#f59e0b';
  } else if (state.status === 'saved') {
    label = `${t('Saved')} · ${formatRelative(state.lastSavedAt, t)}`;
    dot = '#10b981';
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      data-nds-autosave-indicator="1"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('Auto-save keeps a copy of your work in this browser')}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white border border-slate-300 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: dot }}
        />
        <span className="hidden xl:inline-block min-w-[92px] text-left">{label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-9 right-0 min-w-[240px] rounded-md border border-slate-200 bg-white shadow-lg p-1 text-slate-700 z-50">
          <div className="px-2 py-1.5 text-[11px] text-slate-500 border-b border-slate-100">
            {t('Your tabs, diagrams, and pencil marks are auto-saved to this browser.')}
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('Reset to a blank studio? This clears the auto-saved snapshot AND replaces your current tabs with one blank canvas.'))) {
                clearSaved();
                setOpen(false);
              }
            }}
            className="w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-red-50 text-red-600"
          >
            Clear saved data
          </button>
        </div>
      )}
    </div>
  );
}
