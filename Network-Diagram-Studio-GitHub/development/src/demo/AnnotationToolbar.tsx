// Demo v0.6: floating annotation toolbar overlaid on the top-right of the
// canvas viewport. Layout (v0.7.10 — Shape tools MOVED to Palette):
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ [Move] [Pan] │ [Pencil▾] [Eraser] │ ● ● ● ● ● ● │ [Undo]              │
//   └──────────────────────────────────────────────────────────────────────┘
//
// The `▾` chevron next to Pencil opens a compact dropdown of variant
// swatches (line style / weight). The main icon still activates the tool
// with a single click. Chevron logic lives in ShapeStyleDropdown.tsx.
//
// v0.7.10: The 5 shape tools (Arrow / Rect / Ellipse / Callout / Text
// box) previously in this toolbar were moved into the Palette on the
// LEFT side of the app in a new "Shapes" tab. See
// `src/demo/PaletteShapesSection.tsx`. Move / Pan / Pencil / Eraser /
// Colors / Undo stay here because they're modal "brush" tools rather
// than drop-a-shape actions and belong with the canvas cursor.
import { useAnnotationStore, PEN_COLORS, type Tool } from './annotation-store';
import { useTabsStore } from './tabs-store';
import {
  PenStylePanel,
  StyleSplit,
  useStyleDropdownKey,
} from './ShapeStyleDropdown';
import { useT } from '../i18n/useT';

function ToolBtn({
  tool,
  active,
  onClick,
  children,
  title,
  withChevron = false,
}: {
  tool: Tool;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  withChevron?: boolean;
}) {
  // When a split-button chevron is glued to the right, drop the
  // right-side rounding so the two look like one control.
  //
  // v0.9.50 — the ACTIVE fill is the Azure accent, not slate-800. A near-
  // black square floating over a pale canvas read as a dead/disabled chip
  // rather than as "this tool is on", and it was the only selected-state
  // in the app that wasn't accent-blue. `StyleSplit`'s glued chevron uses
  // the same fill when open, or the two halves of one control disagree.
  const rounding = withChevron ? 'rounded-l-md' : 'rounded-md';
  const border = withChevron ? 'border-r-0' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      data-nds-tool={tool}
      className={`w-8 h-8 flex items-center justify-center border ${rounding} ${border} transition ${
        active
          ? 'bg-[color:var(--nds-accent)] text-white border-[color:var(--nds-accent)] shadow-inner'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

// Cursor / arrow (Move) icon.
const MoveIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </svg>
);

// Hand / pan icon (grab hand for panning the canvas).
const HandIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 11V7a2 2 0 0 0-4 0v4" />
    <path d="M14 10V5a2 2 0 0 0-4 0v6" />
    <path d="M10 10V6a2 2 0 0 0-4 0v10" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8" />
  </svg>
);

// Pencil icon.
const PencilIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

// Eraser icon (rectangle at an angle).
const EraserIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 20H8L3 15l7-7 12 12z" />
    <path d="M14 8l6 6" />
  </svg>
);

// Undo (counter-clockwise arrow).
const UndoIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7v6h6" />
    <path d="M3 13a9 9 0 1 0 3-6.7L3 9" />
  </svg>
);

// v0.7.10: shape icons (ArrowIcon / RectIcon / EllipseIcon / CalloutIcon
// / TextBoxIcon) moved to `src/demo/PaletteShapesSection.tsx` along with
// the drop-shape logic — they now render inside the Palette instead of
// the top toolbar.

export function AnnotationToolbar() {
  const t = useT();
  const tool = useAnnotationStore((s) => s.tool);
  const color = useAnnotationStore((s) => s.color);
  const setTool = useAnnotationStore((s) => s.setTool);
  const setColor = useAnnotationStore((s) => s.setColor);
  const undoLen = useTabsStore((s) => s.undoStack.length);
  const undo = useTabsStore((s) => s.undo);

  // Only one style dropdown can be open at a time — parent-owned key.
  const [openStyleKey, setOpenStyleKey] = useStyleDropdownKey();

  return (
    <div
      data-nds-annotation-toolbar="1"
      className="nds-canvas-chrome absolute top-3 right-3 z-30 flex items-center gap-2 px-2.5 py-2 rounded-xl border"
    >
      {/* Group 1: Move / Pan */}
      <div className="flex items-center gap-1 px-1 py-0.5 rounded-md">
        <ToolBtn tool="move" active={tool === 'move'} onClick={() => setTool('move')} title={t('Move / select (C)')}>
          <MoveIcon />
        </ToolBtn>
        <ToolBtn tool="pan" active={tool === 'pan'} onClick={() => setTool('pan')} title={t('Hand — drag to pan canvas (V)')}>
          <HandIcon />
        </ToolBtn>
      </div>

      {/* Group 2: Pencil / Eraser */}
      <div className="flex items-center gap-1 px-1 py-0.5 rounded-md">
        <StyleSplit
          toolKey="pen"
          openKey={openStyleKey}
          setOpenKey={setOpenStyleKey}
          panelLabel="Pencil style"
          panel={(onClose) => <PenStylePanel onClose={onClose} />}
        >
          <ToolBtn
            tool="pen"
            active={tool === 'pen'}
            onClick={() => setTool('pen')}
            title={t('Pencil (P) — drag to draw. Click ▾ for line style.')}
            withChevron
          >
            <PencilIcon />
          </ToolBtn>
        </StyleSplit>

        <ToolBtn tool="eraser" active={tool === 'eraser'} onClick={() => setTool('eraser')} title={t('Eraser (E)')}>
          <EraserIcon />
        </ToolBtn>
      </div>

      {/* v0.7.10: Group 3 (Shape tools — Arrow / Rect / Ellipse / Callout
          / Text box) MOVED to the Palette on the left. See the "Shapes"
          tab in DemoPalette.tsx and the implementation in
          PaletteShapesSection.tsx. */}

      {/* Group 4: Colour picker */}
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" role="radiogroup" aria-label={t('Pen color')}>
        {PEN_COLORS.map((c) => {
          const selected = color.toLowerCase() === c.hex.toLowerCase();
          // v0.9.30 — the White swatch is invisible against the toolbar's own
          // white chip border, so it borrows the slate ring the others get
          // from `border-white`. Without this the user sees five colours and
          // a gap.
          const isPaper = c.key === 'white';
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.hex)}
              title={`${c.label} ${t('pen')}`}
              aria-label={`${c.label} ${t('pen')}`}
              aria-pressed={selected}
              data-nds-color={c.key}
              className={`w-6 h-6 rounded-full border-2 transition ${
                selected
                  ? 'border-slate-800 scale-110 ring-2 ring-slate-300'
                  : isPaper
                    ? 'border-slate-400 shadow hover:scale-110 hover:ring-2 hover:ring-slate-200'
                    : 'border-white shadow hover:scale-110 hover:ring-2 hover:ring-slate-200'
              }`}
              style={{ background: c.hex }}
            />
          );
        })}
      </div>

      {/* Group 5: Undo */}
      <button
        type="button"
        onClick={undo}
        disabled={undoLen === 0}
        title={`${t('Undo annotation (Ctrl+Z)')} — ${undoLen} ${undoLen === 1 ? t('action left') : t('actions left')}`}
        aria-label={t('Undo annotation')}
        data-nds-annotation-undo="1"
        className="w-8 h-8 flex items-center justify-center rounded-md border bg-white text-slate-700 border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        <UndoIcon />
      </button>
    </div>
  );
}
