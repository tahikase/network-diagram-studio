// Demo v0.5: bottom-of-canvas tab strip. Each tab is a SEPARATE
// workspace: its own nodes / edges / annotations AND its own pencil
// strokes. See `tabs-store.ts` for the state model.
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ [ Overview ] [ Failure point ✎ ×] [ + New tab ]               │
//   └──────────────────────────────────────────────────────────────┘
//
// Click the pencil icon or double-click a tab name to rename inline.
// Hover a tab to reveal ✎ + ×. Cannot delete the last remaining tab.
import { useEffect, useId, useRef, useState } from 'react';
import { useTabsStore } from './tabs-store';
import { useT } from '../i18n/useT';
import { useTabReorder } from './use-tab-reorder';

const REORDER_HELP = 'Drag to reorder. Use Alt+Left/Right to move. Escape cancels.';

function EditableTab({
  id,
  name,
  active,
  editing,
  canDelete,
  reorder,
  helpId,
  onKeyDown,
  onActivate,
  onStartEdit,
  onCommitEdit,
  onDelete,
}: {
  id: string;
  name: string;
  active: boolean;
  editing: boolean;
  canDelete: boolean;
  reorder: ReturnType<typeof useTabReorder>;
  helpId: string;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onActivate: () => void;
  onStartEdit: () => void;
  onCommitEdit: (name: string, restoreFocus?: boolean) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragging = reorder.source === id;
  const dropSide = reorder.target?.id === id ? reorder.target.side : undefined;

  useEffect(() => {
    if (editing) {
      setDraft(name);
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, name]);

  const commit = (restoreFocus = false) => {
    const trimmed = draft.trim();
    onCommitEdit(trimmed.length > 0 ? trimmed : name, restoreFocus);
  };

  return (
    <div
      role="tab"
      tabIndex={active ? 0 : -1}
      aria-label={name}
      aria-selected={active}
      aria-describedby={canDelete && !editing ? helpId : undefined}
      aria-keyshortcuts={canDelete && !editing ? 'Alt+ArrowLeft Alt+ArrowRight' : undefined}
      data-nds-tab={id}
      data-nds-tab-dragging={dragging ? '1' : undefined}
      data-nds-tab-drop={dropSide}
      draggable={canDelete && !editing}
      className={`relative group flex shrink-0 items-center gap-1.5 pl-3.5 pr-1.5 h-9 rounded-t-lg text-[13px] border-t border-l border-r select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition ${dragging ? 'cursor-grabbing opacity-50' : 'cursor-pointer'} ${
        active
          ? 'text-slate-900 border-slate-300 font-bold'
          : 'text-slate-600 font-semibold hover:text-slate-800'
      }`}
      onClick={event => { if (!reorder.suppressClick(event)) onActivate(); }}
      onDoubleClick={event => { if (!reorder.suppressClick(event)) onStartEdit(); }}
      onPointerDown={event => reorder.press(event, id)}
      onDragStart={editing ? undefined : event => reorder.start(event, id)}
      onKeyDown={onKeyDown}
    >
      {dropSide && <span aria-hidden="true" data-nds-tab-insertion={dropSide}
        className={`absolute inset-y-0 w-[3px] rounded bg-blue-500 pointer-events-none ${dropSide === 'before' ? '-left-1' : '-right-1'}`} />}
      {editing ? (
        <input
          ref={inputRef}
          aria-label={`${t('Rename tab')} ${name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(true); }
            else if (e.key === 'Escape') { e.preventDefault(); onCommitEdit(name, true); }
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="h-6 px-1.5 text-[13px] font-semibold w-32 border rounded bg-white text-slate-800 select-text"
          style={{ borderColor: 'var(--color-slate-400)' }}
        />
      ) : (
        <span
          className="truncate max-w-[180px]"
          title={`${name} — ${t('double-click to rename')}${canDelete ? '. ' + t(REORDER_HELP) : ''}`}
        >
          {name}
        </span>
      )}
      {!editing && (
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          title={t('Rename tab')}
          aria-label={`${t('Rename tab')} ${name}`}
          data-nds-tab-rename={id}
          className={`w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}
      {canDelete && !editing && (
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={t('Delete tab')}
          aria-label={`${t('Delete tab')} ${name}`}
          data-nds-tab-delete={id}
          className={`w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <svg width={12} height={12} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function TabBar() {
  const t = useT();
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const addTab = useTabsStore((s) => s.addTab);
  const renameTab = useTabsStore((s) => s.renameTab);
  const deleteTab = useTabsStore((s) => s.deleteTab);
  const switchTab = useTabsStore((s) => s.switchTab);

  const [editingId, setEditingId] = useState<string | null>(null);
  const canDelete = tabs.length > 1;
  const bar = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const reorder = useTabReorder(bar, JSON.stringify(tabs.map(tab => tab.id)));
  const navigate = (event: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.target !== event.currentTarget || editingId === id) return;
    if (reorder.key(event, id) || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = tabs.findIndex(tab => tab.id === id);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : ['Enter', ' '].includes(event.key) ? index : -1;
    if (next >= 0) {
      event.preventDefault();
      event.stopPropagation();
      switchTab(tabs[next].id);
      reorder.focusTab(tabs[next].id);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      // Focus is on tab navigation, not on the selected canvas objects.
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    // The bar used to be `absolute left-1/2 -translate-x-1/2` on its own. With
    // `left` set and `right` unset, CSS caps a shrink-to-fit box at
    // `containingWidth - left` — i.e. HALF the canvas — so a third tab, or a
    // long tab name, silently squeezed the buttons instead of widening the
    // bar. Translated labels then wrapped, and CJK (which may break between
    // ANY two characters) collapsed "New tab" into a vertical column.
    // A full-width centring wrapper gives the bar the whole canvas to size
    // against; it scrolls only once it genuinely runs out of room.
    <div className="absolute bottom-3 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <div
        ref={bar}
        data-nds-tabbar="1"
        role="tablist"
        aria-label={t('Diagram tabs')}
        onDragOver={reorder.over}
        onDragLeave={reorder.leave}
        onDrop={reorder.drop}
        className="nds-canvas-chrome pointer-events-auto max-w-full overflow-x-auto flex items-end gap-1.5 px-2 py-1.5 rounded-lg border"
      >
        {tabs.map((tab) => (
          <EditableTab
            key={tab.id}
            id={tab.id}
            name={tab.name}
            active={tab.id === activeTabId}
            editing={editingId === tab.id}
            canDelete={canDelete}
            reorder={reorder}
            helpId={helpId}
            onKeyDown={event => navigate(event, tab.id)}
            onActivate={() => switchTab(tab.id)}
            onStartEdit={() => setEditingId(tab.id)}
            onCommitEdit={(name, restoreFocus) => {
              renameTab(tab.id, name);
              setEditingId(null);
              if (restoreFocus) reorder.focusTab(tab.id);
            }}
            onDelete={() => {
              if (editingId === tab.id) setEditingId(null);
              deleteTab(tab.id);
              reorder.focusTab(useTabsStore.getState().activeTabId);
            }}
          />
        ))}
        <button
          type="button"
          onClick={addTab}
          title={t('Add tab')}
          aria-label={t('Add tab')}
          data-nds-tab-add="1"
          className="h-9 px-3 shrink-0 flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-transparent hover:border-slate-200"
        >
          <svg width={14} height={14} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" className="shrink-0">
            <path d="M6 2v8M2 6h8" />
          </svg>
          <span className="whitespace-nowrap">{t('New tab')}</span>
        </button>
      </div>
      <span id={helpId} className="sr-only">{t(REORDER_HELP)}</span>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true"
        data-nds-tab-order-status="1">{reorder.announcement}</span>
    </div>
  );
}
