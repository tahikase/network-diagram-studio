import { useDiagramStore } from '../store/diagram-store';
import { useState } from 'react';
import { useTabsStore } from '../demo/tabs-store';
import { useAnnotationStore } from '../demo/annotation-store';
import { useReactFlow } from '@xyflow/react';
import { exportPng, exportSvg, loadJsonFile, saveJson } from '../export/exporters';
import { IS_DEMO } from '../env';
import { SettingsMenu } from './SettingsMenu';
import { ScreenshotButton } from '../demo/NotesScreenshot';
import { useT } from '../i18n/useT';
import { CommandMenu, CommandMenuItem } from './CommandMenu';
import { NOTES_IMAGES } from '../env';

interface HeaderProps {
  rightSlot?: React.ReactNode;
}

function IconBtn({
  onClick,
  disabled,
  title,
  children,
  primary = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`nds-header-button${primary ? ' nds-header-save' : ''}`}
    >
      {children}
    </button>
  );
}

function ActionIcon({ kind }: { kind: 'file' | 'new' | 'load' | 'save' | 'export' | 'undo' | 'redo' | 'png' | 'svg' }) {
  const paths = {
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
    new: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 12v6 M9 15h6',
    load: 'M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1 M3 7v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-1.6L22 11H6l-3 8',
    save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h9',
    export: 'M12 16V3 m-4 4 4-4 4 4 M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
    undo: 'M3 7v6h6 M3 13a9 9 0 1 0 3-6.7L3 9',
    redo: 'M21 7v6h-6 M21 13a9 9 0 1 1-3-6.7L21 9',
    png: 'M3 3h18v18H3z M21 15l-6-6L5 21 M7 7h1v1H7z',
    svg: 'M3 3h5v5H3z M16 16h5v5h-5z M8 5.5h7a3.5 3.5 0 0 1 3.5 3.5v7 M5.5 8v7a3.5 3.5 0 0 0 3.5 3.5h7',
  };
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

/**
 * The header brand mark.
 *
 * The supplied artwork is `nds-logo.svg`, which ships in the build's sidecar
 * folder (`production_editor/` or `non_production_editor/`) rather than in the
 * bundle — see `scripts/patch-sidecars.mjs`. That file is next to the entry
 * HTML, so a relative href resolves in the portable builds.
 *
 * It is NOT there under `npm run dev`, and a portable bundle can be mailed on
 * without its folder, so a failed load falls back to the drawn letter tile and
 * the header never shows a broken image.
 */
function BrandMark() {
  const [artworkFailed, setArtworkFailed] = useState(false);
  const brandVersion = IS_DEMO ? 'node-n-red-1' : 'node-n-1';
  const src = `./${IS_DEMO ? 'non_production' : 'production'}_editor/nds-logo.svg?v=${brandVersion}`;

  if (artworkFailed) {
    return (
      <div
        className="w-9 h-9 rounded-lg grid place-items-center text-white font-bold text-lg shadow-sm"
        style={{ background: IS_DEMO ? '#dc2626' : 'var(--nds-accent)' }}
        aria-label="Network Diagram Studio"
      >
        N
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Network Diagram Studio"
      /* Both, to match the pinned page: `alt` is what the parity check reads,
         and the shell smoke test looks for the aria-label the drawn tile used
         to carry. */
      aria-label="Network Diagram Studio"
      width={36}
      height={36}
      /* No rounding here — the artwork draws its own rounded tile. `contain`
         so the 1024-square master is never cropped into the 2.25rem box, and
         not draggable so dragging the mark cannot start a browser image drag
         over the canvas. */
      className="w-9 h-9 shrink-0 shadow-sm"
      style={{ display: 'block', objectFit: 'contain' }}
      draggable={false}
      onError={() => setArtworkFailed(true)}
    />
  );
}

export function Header({ rightSlot }: HeaderProps) {
  const title = useDiagramStore((s) => s.diagram.meta.title);
  const setTitle = useDiagramStore((s) => s.setTitle);
  const diagram = useDiagramStore((s) => s.diagram);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const canUndo = useDiagramStore((s) => s.history.past.length > 0);
  const canRedo = useDiagramStore((s) => s.history.future.length > 0);
  const clear = useDiagramStore((s) => s.clear);
  // React Flow instance — used by the PNG / SVG exporters to compute the
  // total content bounds (nodes + shapes + strokes) and temporarily reset
  // the viewport so the export captures the WHOLE diagram, not just what
  // fits in the current viewport.
  const rf = useReactFlow();
  const t = useT();
  const downloadImage = async (format: 'png' | 'svg') => {
    try {
      await (format === 'png' ? exportPng(diagram, rf) : exportSvg(diagram, rf));
    } catch (error) {
      window.alert(`${t('Export failed')}: ${error instanceof Error ? error.message : t('Unknown error')}`);
    }
  };

  return (
    <header
      className="nds-workspace-header flex items-center gap-3 px-4 border-b bg-white"
      style={{ borderColor: 'var(--nds-border)', height: 56 }}
    >
      <div className="flex items-center gap-2 pr-3 border-r shrink-0" style={{ borderColor: 'var(--nds-border)' }}>
        <BrandMark />
        {/* The brand wordmark stays gated at 2xl, and it is the ONLY thing in
            the header that is. The action buttons below always show their full
            label; the ~170px this wordmark costs is what used to make that
            overflow in de/fr/es/pt/ja/ko. With it hidden, the title input
            (flex-1, min 60px) absorbs the longest translation down to 1024px —
            German, the worst case, still leaves the input 71px wide. */}
        <div className="hidden 2xl:flex items-center">
          <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">Network Diagram Studio</span>
        </div>
        {IS_DEMO && (
          <span
            title="Demo build · v0.6 preview"
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                       text-white"
            style={{ background: '#dc2626' }}
          >
            Demo
          </span>
        )}
      </div>

      <input
        aria-label={t('Diagram title')}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('Diagram title')}
        className="nds-header-title h-8 px-3 text-sm border rounded-md min-w-[60px] flex-1 max-w-[360px]"
        style={{ borderColor: 'var(--nds-border)' }}
      />

      <CommandMenu id="file" label={t('File')} icon={<ActionIcon kind="file" />}>
        <div className="nds-menu-heading">{t('Create or open')}</div>
        <CommandMenuItem
          label={t('New')}
          description={t('Start with an empty canvas')}
          icon={<ActionIcon kind="new" />}
          onClick={() => {
            clear();
            useTabsStore.getState().resetActiveTabAnnotations();
            useAnnotationStore.getState().clearShapeSelection();
          }}
        />
        <CommandMenuItem
          label={`${t('Load')} JSON`}
          title={t('Load a diagram from JSON')}
          description={t('Open an editable diagram')}
          icon={<ActionIcon kind="load" />}
          onClick={() => loadJsonFile(raw => {
            const res = useTabsStore.getState().loadStudioFile(raw);
            if (!res.ok) window.alert(`${t('Load failed')}: ${res.error}`);
          })}
        />
        <div data-nds-arm-menu data-nds-arm-description={t('Build from Azure resource exports')} />
      </CommandMenu>

      <div className="nds-header-quick-actions">
        <IconBtn onClick={undo} disabled={!canUndo} title={`${t('Undo')} (Ctrl+Z)`}>
          <ActionIcon kind="undo" />{t('Undo')}
        </IconBtn>
        <IconBtn onClick={redo} disabled={!canRedo} title={`${t('Redo')} (Ctrl+Y)`}>
          <ActionIcon kind="redo" />{t('Redo')}
        </IconBtn>
        <IconBtn primary onClick={() => {
          try { saveJson(diagram); }
          catch (error) { window.alert(`${t('Save failed')}: ${error instanceof Error ? error.message : t('Unknown error')}`); }
        }} title={t('Save current diagram as JSON')}>
          <ActionIcon kind="save" />{t('Save')} JSON
        </IconBtn>
      </div>

      <CommandMenu id="export" label={t('Export')} icon={<ActionIcon kind="export" />}>
        <div className="nds-menu-heading">{t('Download full diagram')}</div>
        <CommandMenuItem label="PNG" description={t('Image file')} title={t('Export the full diagram as PNG')} icon={<ActionIcon kind="png" />} onClick={() => { void downloadImage('png'); }} />
        <CommandMenuItem label="SVG" description={t('Scalable vector file')} title={t('Export the full diagram as SVG')} icon={<ActionIcon kind="svg" />} onClick={() => { void downloadImage('svg'); }} />
        {NOTES_IMAGES && <><div className="nds-menu-separator" /><div className="nds-menu-heading">{t('Capture to Notes')}</div><ScreenshotButton menuItem /></>}
      </CommandMenu>

      <div className="nds-header-utilities ml-auto flex items-center gap-2 shrink-0">
        <span data-nds-feedback-slot />
        {rightSlot}
        <SettingsMenu />
      </div>
    </header>
  );
}
