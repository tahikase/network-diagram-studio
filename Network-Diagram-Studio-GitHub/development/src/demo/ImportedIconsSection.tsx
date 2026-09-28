import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import { useT } from '../i18n/useT';
import { useDiagramStore } from '../store/diagram-store';
import { StarToggle } from '../panel/IconGrid';
import { getFlowViewportCenter } from '../canvas/viewport-utils';
import { NDS_DRAG_MIME, type NdsDragPayload } from '../canvas/Canvas';
import {
  removeLibraryIcon, renameLibraryIcon, useImportedIcons,
} from '../icons/imported-library';
import type { ImportedIconAsset } from '../icons/imported-assets';
import { useFavoritesStore } from './favorites-store';
import { IconLibraryActions } from './IconLibraryActions';

type Edit = { asset: ImportedIconAsset; action: 'rename' | 'remove'; returnTo: HTMLElement };

function IconEditDialog({ edit, onClose }: { edit: Edit; onClose: () => void }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(edit.asset.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => {
      node.close();
      if (edit.returnTo.isConnected) edit.returnTo.focus();
      else document.querySelector<HTMLButtonElement>('[data-nds-import-icons]')?.focus();
    };
  }, [edit.returnTo]);
  const remove = edit.action === 'remove';
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby="nds-icon-dialog-title"
      data-nds-imported-icon-dialog={edit.action}
      className="nds-modal m-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl text-slate-700 backdrop:bg-black/40"
      style={{ width: 'min(440px, calc(100vw - 32px))' }}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    >
      <form onSubmit={async event => {
        event.preventDefault();
        setBusy(true); setError('');
        try {
          if (remove) {
            await removeLibraryIcon(edit.asset.id);
            const favorites = useFavoritesStore.getState();
            if (favorites.icons.has(edit.asset.id)) favorites.toggleFavorite('icon', edit.asset.id);
          } else await renameLibraryIcon(edit.asset.id, name);
          onClose();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Could not update icon storage.');
          setBusy(false);
        }
      }}>
        <h2 id="nds-icon-dialog-title" className="text-base font-semibold mb-2">
          {remove ? t('Remove from Imported icons?') : t('Rename imported icon')}
        </h2>
        <p className="text-xs leading-relaxed mb-4">
          {remove
            ? t('Existing diagrams keep this artwork. Only the library entry and its Favorite are removed.')
            : t('This changes the library name, not labels already on the canvas.')}
        </p>
        {remove ? <p className="text-sm font-semibold break-words">{edit.asset.label}</p> : (
          <label className="block text-xs">
            {t('Icon name')}
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              disabled={busy}
              onChange={event => setName(event.target.value)}
              data-nds-imported-icon-name
              className="mt-1 w-full h-9 px-2 border border-slate-300 rounded-md bg-white text-sm"
            />
          </label>
        )}
        {error && <p role="alert" className="text-xs text-red-700 mt-2">{t(error)}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} disabled={busy} className="px-3 py-2 text-xs border border-slate-300 rounded-md hover:bg-slate-100">
            {t('Cancel')}
          </button>
          <button
            type="submit"
            disabled={busy || (!remove && !name.trim())}
            data-nds-imported-icon-confirm
            className={`px-3 py-2 text-xs rounded-md text-white font-semibold disabled:opacity-50 ${remove ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {remove ? t('Remove from library') : t('Save name')}
          </button>
        </div>
      </form>
    </dialog>, document.body,
  );
}

export function ImportedIconsSection() {
  const t = useT();
  const items = useImportedIcons(s => s.items);
  const results = useImportedIcons(s => s.results);
  const notices = results.filter(result => result.status !== 'imported');
  const busy = useImportedIcons(s => s.busy);
  const favorites = useFavoritesStore(s => s.icons);
  const toggleFavorite = useFavoritesStore(s => s.toggleFavorite);
  const addIcon = useDiagramStore(s => s.addCustomIconNode);
  const flow = useReactFlow();
  const dropCount = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ asset: ImportedIconAsset; button: HTMLButtonElement } | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !menu.button.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);
  const box = menu?.button.getBoundingClientRect();
  const visible = items.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="px-3 py-2" data-nds-imported-icons>
      <IconLibraryActions />
      {items.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('Filter imported icons…')}
          aria-label={t('Filter imported icons')}
          className="w-full h-8 px-2 mb-2 text-xs border border-slate-300 rounded-md bg-white"
        />
      )}
      {!items.length && <p className="text-xs leading-relaxed text-slate-500 py-3">{t('Your library is empty. Use + Import Icons below.')}</p>}
      {items.length > 0 && !visible.length && <p className="text-xs text-slate-500 py-3">{t('No matching imported icons.')}</p>}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
        {visible.map(asset => (
          <div key={asset.id} className="relative min-w-0">
            <button
              type="button"
              data-nds-imported-icon={asset.id}
              draggable
              onDragStart={event => {
                const payload: NdsDragPayload = { kind: 'icon', iconId: asset.id, label: asset.label };
                event.dataTransfer.setData(NDS_DRAG_MIME, JSON.stringify(payload));
                event.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => {
                const offset = (dropCount.current++ % 6) * 24;
                const point = getFlowViewportCenter(flow, { dx: offset, dy: offset });
                addIcon(asset.id, asset.label, { x: Math.round(point.x - 90), y: Math.round(point.y - 75) });
              }}
              title={`${asset.label} — ${t('Click to drop at centre, or drag onto the canvas.')}`}
              className="w-full min-h-24 pt-6 pb-2 px-1 flex flex-col items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-400 cursor-grab active:cursor-grabbing"
            >
              <svg width={32} height={32} aria-hidden="true"><use href={`#ic-${asset.id}`} /></svg>
              <span className="text-[10px] text-slate-700 text-center leading-tight line-clamp-2 break-words">{asset.label}</span>
              <span className="text-[9px] text-slate-400">{asset.mime === 'image/png' ? 'PNG' : 'SVG'}</span>
            </button>
            <StarToggle filled={favorites.has(asset.id)} onToggle={() => toggleFavorite('icon', asset.id)} />
            <button
              type="button"
              aria-label={`${t('Manage icon')}: ${asset.label}`}
              aria-haspopup="menu"
              aria-expanded={menu?.asset.id === asset.id}
              data-nds-imported-manage={asset.id}
              onClick={event => setMenu(menu?.asset.id === asset.id ? null : { asset, button: event.currentTarget })}
              className="absolute left-0.5 top-0.5 w-6 h-5 rounded text-slate-500 hover:bg-slate-200 text-sm leading-none"
            >⋯</button>
          </div>
        ))}
      </div>
      {busy && <p role="status" className="text-xs text-blue-700 mt-2">{t('Importing…')}</p>}
      {notices.length > 0 && (
        <div className="mt-2 max-h-32 overflow-y-auto text-[10px] leading-relaxed" role="status" aria-live="polite" data-nds-import-results>
          {notices.map((result, i) => (
            <p key={i} data-nds-import-result={result.status} className={`mb-1 rounded px-2 py-1 break-words ${result.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
              <strong>{result.filename}</strong>{' — '}
              {result.status === 'duplicate' ? t('Already in your library; skipped.') : t(result.message ?? 'The icon could not be imported.')}
            </p>
          ))}
        </div>
      )}
      {menu && box && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('Manage icon')}
          data-nds-imported-icon-menu
          className="fixed z-50 w-44 p-1 bg-white border border-slate-200 rounded-md shadow-lg text-slate-700"
          style={{ left: Math.min(box.left, innerWidth - 184), top: Math.min(box.bottom + 4, innerHeight - 90) }}
          onKeyDown={event => {
            const buttons = [...menuRef.current!.querySelectorAll<HTMLButtonElement>('button')];
            if (event.key === 'Escape') {
              event.preventDefault(); menu.button.focus(); setMenu(null);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
              buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length].focus();
            } else if (event.key === 'Tab') setMenu(null);
          }}
        >
          {(['rename', 'remove'] as const).map(action => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="block w-full text-left px-2 py-2 rounded text-xs hover:bg-slate-100 focus:bg-slate-100"
              onClick={() => { setEdit({ asset: menu.asset, action, returnTo: menu.button }); setMenu(null); }}
            >
              {action === 'rename' ? t('Rename') : t('Remove from library')}
            </button>
          ))}
        </div>, document.body,
      )}
      {edit && <IconEditDialog edit={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
