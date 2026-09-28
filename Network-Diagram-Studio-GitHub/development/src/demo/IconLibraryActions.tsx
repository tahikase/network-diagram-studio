import { Fragment, useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/useT';
import { downloadBlob } from '../export/exporters';
import { iconErrorMessage } from '../icons/imported-assets';
import {
  createIconLibraryBackup, deleteIconLibrary, importIconFiles, importIconFolder,
  prepareIconLibraryDeletion, reportIconStorageError, restoreIconLibrary, useImportedIcons,
  type IconLibraryDeletion,
} from '../icons/imported-library';
import {
  checkLibraryLimits, prepareIconFolder, readIconLibraryBackup,
  type IconFolderPlan, type IconLibraryBackup,
} from '../icons/library-transfer';
import { useFavoritesStore } from './favorites-store';

function Chevron() {
  return <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
    <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth={1.5} />
  </svg>;
}

interface MenuItem { id: string; label: string; run: () => void; disabled?: boolean; hint?: string; destructive?: boolean }

function LibraryMenu({ anchor, kind, items, setOpen }: {
  anchor: HTMLButtonElement; kind: 'import' | 'library'; items: MenuItem[];
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target) && !anchor.contains(event.target)) setOpen(false);
    };
    const resize = () => setOpen(false);
    document.addEventListener('mousedown', outside);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('resize', resize);
    };
  }, [anchor, setOpen]);
  const box = anchor.getBoundingClientRect();
  const above = box.top > innerHeight / 2;
  const width = Math.min(280, Math.max(210, box.width), innerWidth - 16);
  return createPortal(
    <div ref={ref} role="menu" aria-label={t(kind === 'import' ? '+ Import Icons' : 'Library actions')}
      data-nds-icon-menu={kind}
      className="fixed z-50 p-1 border border-slate-300 rounded-md bg-white shadow-lg text-slate-700 overflow-y-auto"
      style={{
        width, left: Math.max(8, Math.min(box.left, innerWidth - width - 8)),
        ...(above ? { bottom: innerHeight - box.top + 4 } : { top: box.bottom + 4 }),
        maxHeight: Math.max(40, (above ? box.top : innerHeight - box.bottom) - 12),
      }}
      onKeyDown={event => {
        event.stopPropagation();
        const buttons = [...ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        if (event.key === 'Escape' || event.key === 'Tab') {
          if (event.key === 'Escape') event.preventDefault();
          setOpen(false); anchor.focus();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && buttons.length) {
          event.preventDefault();
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
            : (current + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length;
          buttons[next].focus();
        }
      }}
    >
      {items.map(item => <Fragment key={item.id}>
        {item.destructive && <div role="separator" className="border-t border-slate-200 my-1" />}
        <button type="button" role="menuitem"
          data-nds-icon-command={item.id} disabled={item.disabled} title={item.hint}
          className={`block w-full px-3 py-2 text-left text-sm rounded disabled:opacity-50 ${item.destructive
            ? 'text-red-700 hover:bg-red-50 focus:bg-red-50' : 'hover:bg-slate-100 focus:bg-slate-100'}`}
          onClick={() => { setOpen(false); anchor.focus(); item.run(); }}
        >{t(item.label)}</button>
      </Fragment>)}
    </div>, document.body,
  );
}

type Review =
  | { kind: 'files'; files: File[] }
  | { kind: 'folder'; name: string; plan: IconFolderPlan }
  | { kind: 'restore'; name: string; backup: IconLibraryBackup };

function TransferReview({ review, returnTo, onClose, onComplete }: {
  review: Review; returnTo: HTMLButtonElement | null; onClose: () => void;
  onComplete?: () => void;
}) {
  const t = useT();
  const rightsNoticeId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const existing = useImportedIcons(state => state.items);
  const libraryBusy = useImportedIcons(state => state.busy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (returnTo?.isConnected && returnTo.getClientRects().length) returnTo.focus();
      else document.querySelector<HTMLButtonElement>('[data-nds-import-icons]')?.focus();
    };
  }, [returnTo]);
  const seen = new Set(existing.map(item => item.dataUrl));
  const merged = [...existing];
  const rows = review.kind === 'files' ? [] : review.kind === 'folder' ? review.plan.entries : review.backup.icons.map(item => {
    const duplicate = seen.has(item.asset.dataUrl);
    if (!duplicate) { seen.add(item.asset.dataUrl); merged.push(item.asset); }
    return { filename: item.label, status: duplicate ? 'duplicate' as const : 'ready' as const };
  });
  const counts = {
    ready: rows.filter(item => item.status === 'ready').length,
    duplicate: rows.filter(item => item.status === 'duplicate').length,
    error: rows.filter(item => item.status === 'error').length,
    ignored: review.kind === 'folder' ? review.plan.ignored : 0,
  };
  const empty = review.kind === 'files' ? !review.files.length : review.kind === 'folder' && !counts.ready;
  let blocked = '';
  if (review.kind === 'restore') {
    try { checkLibraryLimits(merged); }
    catch (reason) { blocked = iconErrorMessage(reason); }
  }
  return createPortal(
    <dialog ref={ref} className="nds-modal m-auto p-5 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-xl backdrop:bg-black/40 overflow-y-auto"
      style={{ width: 'min(560px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)' }}
      aria-labelledby="nds-library-review-title" data-nds-library-preview={review.kind}
      aria-describedby={review.kind === 'restore' ? undefined : rightsNoticeId}
      onKeyDown={event => event.stopPropagation()}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    >
      <form onSubmit={async event => {
        event.preventDefault();
        if (busy || libraryBusy || blocked || empty) return;
        setBusy(true); setError('');
        try {
          if (review.kind === 'files') {
            onComplete?.();
            await importIconFiles(review.files);
          } else if (review.kind === 'folder') await importIconFolder(review.plan);
          else {
            const favorites = await restoreIconLibrary(review.backup);
            if (favorites.length) {
              try { useFavoritesStore.getState().restoreIconFavorites(favorites); }
              catch (reason) {
                console.error('Network Diagram Studio restored icons but could not restore Favorites.', reason);
                reportIconStorageError(new Error('Icons were restored, but Favorites could not be saved in this tab.'));
              }
            }
          }
          onComplete?.();
          onClose();
        } catch (reason) {
          setError(iconErrorMessage(reason, 'Could not update icon storage.'));
          setBusy(false);
        }
      }}>
        <h2 id="nds-library-review-title" className="text-base font-semibold">
          {t(review.kind === 'files' ? 'Import files' : review.kind === 'folder' ? 'Import folder preview' : 'Restore library preview')}
        </h2>
        {review.kind === 'files' ? (
          <ul className="mt-3 space-y-1 overflow-y-auto text-xs break-all" style={{ maxHeight: 'min(240px, 25vh)' }}>
            {review.files.map((file, index) => <li key={index} data-nds-import-file>{file.name}</li>)}
          </ul>
        ) : <>
          <p className="mt-1 text-xs break-all text-slate-500">{review.name}</p>
          <p className="mt-3 text-xs leading-relaxed">
            {t(review.kind === 'folder'
              ? 'Files are copied once into this browser. Existing icons are kept.'
              : 'Existing names are kept. Backup Favorites are added, and original icon IDs are preserved.')}
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-xs">
            {([
              ['ready', 'Ready to add'], ['duplicate', 'Duplicates skipped'],
              ['error', 'Files with problems'], ['ignored', 'Other files skipped'],
            ] as const).map(([key, label]) => <div key={key} className="p-2 rounded bg-slate-50">
              <dt>{t(label)}</dt><dd className="font-bold mt-1" data-nds-transfer-count={key}>{counts[key]}</dd>
            </div>)}
          </dl>
          <ul className="space-y-1 overflow-y-auto text-xs" style={{ maxHeight: 'min(320px, 30vh)' }}>
            {rows.map((item, index) => <li key={index} data-nds-transfer-file={item.status} className="border border-slate-200 rounded p-2">
              <div className="font-semibold break-all">{item.filename}</div>
              <div className={item.status === 'error' ? 'text-red-700 mt-1' : 'text-slate-500 mt-1'}>
                {t(item.status === 'ready' ? 'Ready to add' : item.status === 'duplicate' ? 'Duplicate artwork; skipped.'
                  : ('message' in item && item.message) || 'The icon could not be imported.')}
              </div>
            </li>)}
          </ul>
        </>}
        {(error || blocked) && <p role="alert" className="mt-3 text-xs text-red-700">{t(error || blocked)}</p>}
        {review.kind !== 'restore' && <div data-nds-import-warning
          className="mt-4 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900">
          <p className="text-[12px] font-semibold">{t('Copyright warning')}</p>
          <p id={rightsNoticeId} data-nds-import-rights className="mt-1 text-[12px] leading-relaxed">
            {t('Only import and share images you have the legal right to use.')}
          </p>
        </div>}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" disabled={busy} onClick={onClose} data-nds-transfer-cancel
            className="px-3 py-2 rounded border border-slate-300 text-xs hover:bg-slate-100 disabled:opacity-50">{t('Cancel')}</button>
          <button type="submit" data-nds-transfer-confirm aria-busy={busy}
            disabled={busy || libraryBusy || !!blocked || empty}
            className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
            {t(busy ? 'Working…' : review.kind === 'files' ? 'Import icons' : review.kind === 'folder' ? 'Import ready icons' : 'Restore library')}
          </button>
        </div>
      </form>
    </dialog>, document.body,
  );
}

function LibraryDeleteDialog({ plan, returnTo, onClose }: {
  plan: IconLibraryDeletion; returnTo: HTMLButtonElement | null; onClose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState('');
  const [removedIds, setRemovedIds] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [returnTo]);
  return createPortal(
    <dialog ref={ref} data-nds-library-delete aria-labelledby="nds-library-delete-title"
      className="nds-modal m-auto p-5 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-xl backdrop:bg-black/40 overflow-y-auto"
      style={{ width: 'min(480px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)' }}
      onKeyDown={event => event.stopPropagation()}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    >
      <form onSubmit={async event => {
        event.preventDefault();
        if (busy || (!removedIds && confirmation !== plan.confirmation)) return;
        setBusy(true); setError(''); useImportedIcons.setState({ error: null });
        let removed = removedIds;
        try {
          if (!removed) {
            removed = await deleteIconLibrary(plan, confirmation);
            setRemovedIds(removed);
          }
          useFavoritesStore.getState().removeIconFavorites(removed);
          onClose();
        } catch (reason) {
          if (removed) {
            console.error('Network Diagram Studio could not finish clearing imported-icon Favorites.', reason);
            setError(reportIconStorageError(new Error('The library was cleared, but Favorites could not be saved. Retry cleanup.')));
          } else setError(iconErrorMessage(reason, 'Could not update icon storage.'));
        } finally { setBusy(false); }
      }}>
        <h2 id="nds-library-delete-title" className="text-base font-semibold">{t('Delete all imported icons?')}</h2>
        <p id="nds-library-delete-scope" className="text-xs leading-relaxed mt-3">
          {t('Existing diagrams and original files are kept. Favorites for these icons are removed.')}
        </p>
        {!removedIds && <>
          <p className="text-sm mt-3">{t('Icons to remove')}: <strong data-nds-delete-count>{plan.ids.length}</strong></p>
          <p className="text-xs leading-relaxed mt-2">{t('This cannot be undone. Back up your library first if you may need it again.')}</p>
          <label className="block text-xs mt-4">
            {t(plan.sourceFolder ? 'Type the folder name to confirm:' : 'Type DELETE ALL to confirm:')}
            <code data-nds-delete-token className="block bg-slate-50 rounded p-2 mt-1 mb-2 font-semibold whitespace-pre-wrap break-all select-text">{plan.confirmation}</code>
            <input autoFocus required autoComplete="off" autoCapitalize="off" spellCheck={false}
              data-nds-delete-input maxLength={255} disabled={busy}
              value={confirmation} onChange={event => setConfirmation(event.target.value)}
              aria-describedby="nds-library-delete-scope"
              className="w-full h-9 px-2 border border-slate-300 rounded-md bg-white text-sm"
            />
          </label>
        </>}
        {error && <p role="alert" className="text-xs text-red-700 mt-3">{t(error)}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" data-nds-delete-cancel disabled={busy} onClick={onClose}
            className="px-3 py-2 text-xs rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-50">
            {t(removedIds ? 'Close' : 'Cancel')}
          </button>
          <button type="submit" data-nds-delete-confirm aria-busy={busy}
            disabled={busy || (!removedIds && confirmation !== plan.confirmation)}
            className="px-3 py-2 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
            {t(busy ? 'Working…' : removedIds ? 'Retry cleanup' : 'Delete all imported icons')}
          </button>
        </div>
      </form>
    </dialog>, document.body,
  );
}

export function ImportIconsButton({ onImport }: { onImport: () => void }) {
  const t = useT();
  const formatHintId = useId();
  const fileHint = t('SVG or PNG. Up to 2 MB per file; PNG up to 2048 × 2048.');
  const input = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const scan = useRef<AbortController | null>(null);
  const busy = useImportedIcons(state => state.busy);
  const error = useImportedIcons(state => state.error);
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const folderSupported = typeof HTMLInputElement !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;
  useEffect(() => () => scan.current?.abort(), []);
  return <div className="flex-1 min-w-0">
    <input ref={input} hidden type="file" accept=".svg,.png,image/svg+xml,image/png" multiple data-nds-import-icons-input
      onChange={event => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = '';
        if (!files.length) return;
        setReview({ kind: 'files', files });
      }}
    />
    <input ref={node => { folder.current = node; if (node && folderSupported) node.setAttribute('webkitdirectory', ''); }}
      hidden type="file" accept=".svg,.png,image/svg+xml,image/png" multiple data-nds-import-folder-input
      onChange={async event => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = '';
        scan.current?.abort();
        const controller = new AbortController();
        scan.current = controller;
        setPreparing(true); useImportedIcons.setState({ error: null });
        try {
          const plan = await prepareIconFolder(files, useImportedIcons.getState().items, controller.signal);
          setReview({ kind: 'folder', name: plan.name, plan });
        } catch (reason) {
          if (!controller.signal.aborted) reportIconStorageError(reason);
        } finally { if (!controller.signal.aborted) setPreparing(false); }
      }}
    />
    <button ref={button} type="button" data-nds-import-icons disabled={busy || preparing}
      aria-busy={busy || preparing} aria-haspopup="menu" aria-expanded={open}
      aria-describedby={formatHintId}
      onClick={() => setOpen(value => !value)}
      title={fileHint}
      className="w-full min-h-[44px] px-3 py-2 rounded-md border border-blue-300 bg-blue-50 text-blue-700 text-[16px] font-bold leading-tight flex items-center justify-center gap-2 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-wait">
      <span>{t(preparing ? 'Preparing…' : busy ? 'Importing…' : '+ Import Icons')}</span><Chevron />
    </button>
    <span id={formatHintId} className="sr-only">{fileHint}</span>
    {error && <p role="alert" className="mt-1 text-[10px] text-red-700">{t(error)}</p>}
    {open && button.current && <LibraryMenu anchor={button.current} kind="import" setOpen={setOpen} items={[
      { id: 'files', label: 'Import files', run: () => input.current?.click() },
      { id: 'folder', label: 'Import folder', disabled: !folderSupported,
        hint: !folderSupported ? t('Folder selection is not supported here. Use Import files.') : undefined,
        run: () => folder.current?.click() },
    ]} />}
    {review && <TransferReview review={review} returnTo={button.current} onClose={() => setReview(null)}
      onComplete={() => onImport()} />}
  </div>;
}

export function IconLibraryActions() {
  const t = useT();
  const items = useImportedIcons(state => state.items);
  const busy = useImportedIcons(state => state.busy);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const reading = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [deletion, setDeletion] = useState<IconLibraryDeletion | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => () => reading.current?.abort(), []);
  const backup = async () => {
    setPreparing(true); setNotice(''); useImportedIcons.setState({ error: null });
    try {
      const saved = await createIconLibraryBackup(useFavoritesStore.getState().icons);
      downloadBlob('icon-library.nds-icons.json', JSON.stringify(saved, null, 2), 'application/json');
      setNotice('Backup download started.');
    } catch (reason) { reportIconStorageError(reason); }
    finally { setPreparing(false); }
  };
  const prepareDelete = async () => {
    setPreparing(true); setNotice(''); useImportedIcons.setState({ error: null });
    try { setDeletion(await prepareIconLibraryDeletion()); }
    catch (reason) { reportIconStorageError(reason); }
    finally { setPreparing(false); }
  };
  return <div className="mb-2">
    <div className="flex justify-end">
      <button ref={button} type="button" data-nds-library-actions disabled={busy || preparing}
        aria-haspopup="menu" aria-expanded={open} aria-busy={preparing}
        onClick={() => setOpen(value => !value)}
        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-xs hover:bg-slate-100 disabled:opacity-50">
        {t(preparing ? 'Preparing…' : 'Library actions')}<Chevron />
      </button>
    </div>
    <input ref={input} hidden type="file" accept=".json,application/json" data-nds-library-restore-input
      onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        reading.current?.abort();
        const controller = new AbortController();
        reading.current = controller;
        setPreparing(true); setNotice(''); useImportedIcons.setState({ error: null });
        try {
          const backup = await readIconLibraryBackup(file, controller.signal);
          setReview({ kind: 'restore', name: file.name, backup });
        } catch (reason) {
          if (!controller.signal.aborted) reportIconStorageError(reason);
        } finally { if (!controller.signal.aborted) setPreparing(false); }
      }}
    />
    {notice && <p role="status" data-nds-library-notice className="text-[10px] leading-relaxed mt-2 text-slate-500">{t(notice)}</p>}
    {open && button.current && <LibraryMenu anchor={button.current} kind="library" setOpen={setOpen} items={[
      { id: 'backup', label: 'Back up library', disabled: !items.length, run: () => { void backup(); } },
      { id: 'restore', label: 'Restore library', run: () => input.current?.click() },
      { id: 'delete', label: 'Delete all imported icons', destructive: true, disabled: !items.length,
        run: () => { void prepareDelete(); } },
    ]} />}
    {review && <TransferReview review={review} returnTo={button.current} onClose={() => setReview(null)} />}
    {deletion && <LibraryDeleteDialog plan={deletion} returnTo={button.current} onClose={() => setDeletion(null)} />}
  </div>;
}
