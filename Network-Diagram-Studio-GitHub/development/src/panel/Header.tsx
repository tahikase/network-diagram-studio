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

interface HeaderProps {
  rightSlot?: React.ReactNode;
}

function IconBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 px-3 rounded-md text-sm font-medium border transition
        whitespace-nowrap shrink-0
        ${disabled
          ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed'
          : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
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

  return (
    <header
      className="flex items-center gap-3 px-4 border-b bg-white"
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
        className="h-8 px-3 text-sm border rounded-md min-w-[60px] flex-1 max-w-[420px]"
        style={{ borderColor: 'var(--nds-border)' }}
      />

      <div className="flex items-center gap-1 shrink-0">
        <IconBtn onClick={undo} disabled={!canUndo} title={`${t('Undo')} (Ctrl+Z)`}>
          ↶ {t('Undo')}
        </IconBtn>
        <IconBtn onClick={redo} disabled={!canRedo} title={`${t('Redo')} (Ctrl+Y)`}>
          ↷ {t('Redo')}
        </IconBtn>
      </div>

      <div className="flex items-center gap-1 pl-2 border-l shrink-0" style={{ borderColor: 'var(--nds-border)' }}>
        <IconBtn
          onClick={() => {
            // Start fresh: wipe the diagram AND any pencil strokes / shapes
            // on the active tab, and drop the selection state so no
            // resize-handle ghosts are left over.
            clear();
            useTabsStore.getState().resetActiveTabAnnotations();
            useAnnotationStore.getState().clearShapeSelection();
          }}
          title={t('Start with an empty canvas')}
        >
          {t('New')}
        </IconBtn>
        <IconBtn
          onClick={() =>
            loadJsonFile((raw) => {
              // loadStudioFile, NOT loadFromJson: the latter replaces the
              // diagram alone and leaves the old diagram's shapes behind.
              const res = useTabsStore.getState().loadStudioFile(raw);
              if (!res.ok) window.alert(`${t('Load failed')}: ${res.error}`);
            })
          }
          title={t('Load a diagram from JSON')}
        >
          {t('Load')} JSON
        </IconBtn>
        <IconBtn onClick={() => {
          try { saveJson(diagram); }
          catch (error) { window.alert(`${t('Save failed')}: ${error instanceof Error ? error.message : t('Unknown error')}`); }
        }} title={t('Save current diagram as JSON')}>
          {t('Save')} JSON
        </IconBtn>
      </div>

      <div className="flex items-center gap-1 pl-2 border-l shrink-0" style={{ borderColor: 'var(--nds-border)' }}>
        <IconBtn onClick={() => exportPng(diagram, rf)} title={t('Export the full diagram as PNG')}>PNG</IconBtn>
        <IconBtn onClick={() => exportSvg(diagram, rf)} title={t('Export the full diagram as SVG')}>SVG</IconBtn>
        <ScreenshotButton />
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {rightSlot}
        <SettingsMenu />
      </div>
    </header>
  );
}
