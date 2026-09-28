// Demo v0.6: SHAPE STYLE DROPDOWN
// -----------------------------------------------------------------------
// Split-button chevron that pops up a compact panel of dropdown selects
// for whichever shape/pen tool it is attached to.
//
// Layout of the popover (Arrow example):
//
//   ┌─────────────── Arrow style ─────────────────┐
//   │ SHAPE     [ ── →  Straight        ▾ ]      │
//   │ LINE      [ ────  Solid           ▾ ]      │
//   │ HEAD      [ ──►   End arrow       ▾ ]      │
//   │ WEIGHT    [ ──    2 px            ▾ ]      │
//   │ TEXT SIZE [ 14    14              ▾ ]      │
//   └─────────────────────────────────────────────┘
//
// Each row is a compact select showing an SVG preview + a label of the
// current value. Clicking the row opens a listbox with all options.
// The panel is anchored under the chevron button. Clicking outside or
// pressing Escape closes it. Selecting a value updates the store; the
// panel STAYS open so the user can quickly try combinations.
//
// v0.7.8: picking a value in ANY row now ALSO updates every selected
// shape whose kind matches this panel (Arrow / Rect / Ellipse /
// Callout). Previously the panel only mutated the "default template
// used for the NEXT-drawn shape" — so selecting an existing arrow and
// picking Elbow in SHAPE did nothing. Now the arrow updates on the
// spot, matching how every other drawing app behaves.
import { memo, useEffect, useRef, useState } from 'react';
import {
  useAnnotationStore,
  type ArrowShape,
  type DashStyle,
  type ArrowHead,
  type CornerStyle,
  type FillStyle,
} from './annotation-store';
import { useTabsStore, type Shape, type ShapeKind } from './tabs-store';
import { useT } from '../i18n/useT';
import { SHAPE_TEXT_SIZES } from '../model/shape-text';

/**
 * v0.7.8: Wrap a style-panel setter so it also patches any currently
 * selected shapes of `kind`.
 *
 * - `set(patch)` updates the annotation-store's default template for
 *   the next-drawn shape (existing behaviour, needed so consecutive
 *   drops of the same shape carry the picked style).
 * - `applyStylePatch(kind, ids, shapePatch)` mutates the selected
 *   shapes with a SINGLE batched undo entry (Ctrl+Z reverts the whole
 *   style change, even across a multi-select).
 *
 * Style-field names don't perfectly match Shape-field names. The one
 * mismatch is `thickness` (on ArrowStyle / BoxStyle / EllipseStyle /
 * CalloutStyle) → `width` (on ShapeArrow / ShapeRect / ShapeEllipse /
 * ShapeCallout). We translate it before forwarding.
 *
 * If no shapes of `kind` are selected, only the default is updated.
 */
function useApplyStyleAndTemplate<P extends Record<string, unknown>>(
  kind: ShapeKind,
  set: (patch: P) => void,
): (patch: P) => void {
  return (patch: P) => {
    set(patch);
    const selectedIds = useAnnotationStore.getState().selectedShapeIds;
    if (selectedIds.length === 0) return;
    // Translate style-space fields → shape-space fields.
    // - thickness → width  (only mismatch across the four style types)
    // - everything else already shares a name with Shape.
    const shapePatch: Partial<Shape> = { ...(patch as object) } as Partial<Shape>;
    if ('thickness' in patch) {
      (shapePatch as { width?: number }).width = patch.thickness as number;
      delete (shapePatch as { thickness?: number }).thickness;
    }
    useTabsStore.getState().applyStylePatch(kind, selectedIds, shapePatch);
  };
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-16 text-[10px] font-semibold uppercase tracking-wide text-slate-500 select-none flex-shrink-0">
        {t(label)}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ---------- Compact select-style dropdown -----------------------------
// Word/Excel-style single-attribute dropdown. Clicking the trigger opens
// a small list of options; each option shows a preview + label.
//
//   ┌─────────────┐
//   │ ── →     ▾ │  ← trigger (current value + chevron)
//   └─────────────┘
//         ↓ open
//   ┌─────────────┐
//   │ ── →   None │
//   │ ──►    End   │◄── selected (blue tint)
//   │ ◄─►    Both │
//   │ ──●    Dot  │
//   └─────────────┘
//
// Closes on outside click or Escape. Options render their preview via a
// caller-supplied render function so we reuse the existing SVG previews.
function StyleSelect<T extends string | number>({
  value,
  options,
  onChange,
  renderPreview,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  renderPreview: (opt: { value: T; label: string }) => React.ReactNode;
  ariaLabel: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t(ariaLabel)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`${t(ariaLabel)}: ${t(current.label)}`}
        className={`w-full h-8 flex items-center justify-between gap-2 px-2 border rounded-md bg-white transition text-slate-700 ${
          open
            ? 'border-blue-500 ring-2 ring-blue-400'
            : 'border-slate-300 hover:bg-slate-50 hover:border-slate-400'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="flex-shrink-0">{renderPreview(current)}</span>
          <span className="text-xs text-slate-600 truncate">{t(current.label)}</span>
        </span>
        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" className="flex-shrink-0">
          <path d="M2 3 L5 7 L8 3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 z-50 w-full max-h-72 overflow-y-auto rounded-md border bg-white shadow-lg py-1"
          style={{ borderColor: '#cbd5e1' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition ${
                  active ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex-shrink-0">{renderPreview(opt)}</span>
                <span className="truncate">{t(opt.label)}</span>
                {active && (
                  <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true" className="ml-auto text-blue-600 flex-shrink-0">
                    <path d="M2 6 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Dash previews ---------------------------------------------
// Each preview is a horizontal line with the actual SVG stroke-dasharray
// so the user sees the real pattern. All previews are wrapped in
// React.memo — their props are primitives, so shallow compare skips
// re-renders when the value hasn't changed.
const DashPreview = memo(function DashPreview({ dash, color = '#0f172a' }: { dash: DashStyle; color?: string }) {
  const da = dash === 'dashed' ? '5 3' : dash === 'dotted' ? '0.5 3' : undefined;
  return (
    <svg width={36} height={12} viewBox="0 0 36 12" aria-hidden="true">
      <line x1={2} y1={6} x2={34} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray={da} />
    </svg>
  );
});

// ---------- Head previews ---------------------------------------------
const HeadPreview = memo(function HeadPreview({ head, color = '#0f172a' }: { head: ArrowHead; color?: string }) {
  return (
    <svg width={36} height={12} viewBox="0 0 36 12" aria-hidden="true">
      <defs>
        <marker id={`sw-h-${head}-t`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
        <marker id={`sw-h-${head}-d`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <circle cx="5" cy="5" r="4" fill={color} />
        </marker>
      </defs>
      <line
        x1={3}
        y1={6}
        x2={30}
        y2={6}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd={head === 'end' || head === 'both' ? `url(#sw-h-${head}-t)` : head === 'dot' ? `url(#sw-h-${head}-d)` : undefined}
        markerStart={head === 'both' ? `url(#sw-h-${head}-t)` : undefined}
      />
    </svg>
  );
});

// ---------- Corner previews -------------------------------------------
const CornerPreview = memo(function CornerPreview({ corner, color = '#0f172a' }: { corner: CornerStyle; color?: string }) {
  return (
    <svg width={26} height={20} viewBox="0 0 26 20" aria-hidden="true">
      <rect x={3} y={3} width={20} height={14} rx={corner === 'rounded' ? 4 : 0} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
});

// ---------- Fill previews ---------------------------------------------
const FillPreview = memo(function FillPreview({ fill, color = '#0f172a' }: { fill: FillStyle; color?: string }) {
  const op = fill === 'none' ? 0 : fill === 'tint' ? 0.15 : 0.5;
  return (
    <svg width={26} height={20} viewBox="0 0 26 20" aria-hidden="true">
      <rect x={3} y={3} width={20} height={14} rx={2} fill={color} fillOpacity={op} stroke={color} strokeWidth={2} />
    </svg>
  );
});

// ---------- Thickness previews ----------------------------------------
const ThicknessPreview = memo(function ThicknessPreview({ thickness, color = '#0f172a' }: { thickness: number; color?: string }) {
  return (
    <svg width={36} height={12} viewBox="0 0 36 12" aria-hidden="true">
      <line x1={3} y1={6} x2={33} y2={6} stroke={color} strokeWidth={thickness} strokeLinecap="round" />
    </svg>
  );
});

// ---------- Arrow shape (straight / curved / elbow) previews -----------
const ArrowShapePreview = memo(function ArrowShapePreview({ shape, color = '#0f172a' }: { shape: ArrowShape; color?: string }) {
  const markerId = `sw-as-${shape}`;
  return (
    <svg width={36} height={20} viewBox="0 0 36 20" aria-hidden="true">
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      {shape === 'straight' && (
        <line x1={3} y1={10} x2={30} y2={10} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${markerId})`} />
      )}
      {shape === 'curved' && (
        <path d="M 3 14 C 12 2, 21 2, 30 14" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${markerId})`} />
      )}
      {shape === 'step' && (
        // Two rounded corners with a mid-span jog — the same route resource
        // edges take, which is what this option promises.
        <path
          d="M 3 5 L 11 5 Q 15 5 15 9 L 15 11 Q 15 15 19 15 L 30 15"
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={`url(#${markerId})`}
        />
      )}
      {shape === 'elbow' && (
        // v0.7.9: redesigned elbow preview — clearly distinct from
        // Straight/Curved. Wider stroke, generous corner spacing so both
        // right-angles are visible, and a filled joint dot at the elbow
        // so users immediately read it as "L-shaped connector".
        <>
          <polyline
            points="3,5 17,5 17,15 30,15"
            fill="none"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={`url(#${markerId})`}
          />
          <circle cx={17} cy={5} r={1.5} fill={color} />
          <circle cx={17} cy={15} r={1.5} fill={color} />
        </>
      )}
    </svg>
  );
});

// ---------- Numeric text-size swatch ---------------------------------
/**
 * Text-size swatch — shows the literal number ("12", "16", "24") so the
 * user picks by numeric value rather than an abstract S/M/L label.
 * Rendered as a small character preview scaled proportionally to the
 * chosen font size (capped for the palette).
 */
const TextSizePreview = memo(function TextSizePreview({ size, color = '#0f172a' }: { size: number; color?: string }) {
  // Cap the on-screen preview so large text sizes do not overflow the swatch.
  const capped = Math.min(20, Math.max(9, size));
  return (
    <svg width={36} height={22} viewBox="0 0 36 22" aria-hidden="true">
      <text
        x={18}
        y={16}
        textAnchor="middle"
        fill={color}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize={capped}
        fontWeight={600}
      >
        {size}
      </text>
    </svg>
  );
});

// ---------- Popover wrapper -------------------------------------------
/**
 * `side` controls which edge of the anchor the popover extends from:
 *   - 'right' (default) — popover's right edge sits at the anchor's right
 *     edge, so it extends LEFT. Correct for the top-right toolbar.
 *   - 'left' — popover's left edge sits at the anchor's left edge, so it
 *     extends RIGHT. Correct for the left-side palette (extends INTO the
 *     canvas rather than off the screen edge).
 *   - 'left-full' — popover's left edge sits at the anchor's RIGHT edge
 *     (menu-style, sits BESIDE the anchor). Also good for left-side
 *     palette when you want no overlap on the anchor.
 *
 * `verticalSide` controls which edge of the anchor the popover attaches
 * to vertically:
 *   - 'bottom' (default) — popover opens downward (top edge at anchor
 *     bottom).
 *   - 'top' — popover opens upward (bottom edge at anchor top). Useful
 *     when the anchor sits near the bottom of a scroll container so a
 *     downward popover would be clipped.
 */
function PopoverPanel({
  onClose,
  title,
  children,
  side = 'right',
  verticalSide = 'bottom',
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: 'right' | 'left' | 'left-full';
  verticalSide?: 'top' | 'bottom';
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      // Also ignore clicks on the chevron that opened us (parent handles
      // toggle logic); we detect that via a data attribute.
      const el = e.target as HTMLElement | null;
      if (el && el.closest('[data-nds-style-chevron]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const horizontalCls =
    side === 'left'
      ? 'left-0'
      : side === 'left-full'
        ? 'left-full ml-2'
        : 'right-0';
  const verticalCls = verticalSide === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  return (
    <div
      ref={ref}
      data-nds-style-popover="1"
      data-nds-popover-side={side}
      className={`absolute ${verticalCls} ${horizontalCls} z-40 w-[240px] rounded-lg bg-white border border-slate-200 shadow-lg p-3 flex flex-col gap-1.5`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none">
        {t(title)}
      </div>
      {children}
    </div>
  );
}

// ---------- Chevron button (split-button trigger) ---------------------
export function StyleChevron({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      title={t(label)}
      aria-label={t(label)}
      aria-expanded={open}
      data-nds-style-chevron="1"
      className={`w-4 h-8 -ml-0.5 flex items-center justify-center rounded-r-md border-y border-r border-l-0 transition ${
        open
          ? 'bg-[color:var(--nds-accent)] text-white border-[color:var(--nds-accent)]'
          : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 3 L5 7 L8 3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ---------- Per-tool panels -------------------------------------------
// ---------- Reusable option lists (human-readable labels for the
//            new dropdown UI) --------------------------------------
const SHAPE_OPTS: { value: ArrowShape; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Stepped' },
  { value: 'curved', label: 'Curved' },
  { value: 'elbow', label: 'Elbow' },
];
const DASH_OPTS: { value: DashStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];
const HEAD_OPTS: { value: ArrowHead; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'end', label: 'End arrow' },
  { value: 'both', label: 'Both arrows' },
  { value: 'dot', label: 'Dot' },
];
const CORNER_OPTS: { value: CornerStyle; label: string }[] = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'rounded', label: 'Rounded' },
];
const FILL_OPTS: { value: FillStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'tint', label: 'Tint' },
  { value: 'solid', label: 'Solid' },
];
const WEIGHT_OPTS: { value: number; label: string }[] = [
  { value: 1, label: '1 px' },
  { value: 2, label: '2 px' },
  { value: 4, label: '4 px' },
  { value: 6, label: '6 px' },
];
const PEN_WEIGHT_OPTS: { value: number; label: string }[] = [
  { value: 1.5, label: '1.5 px' },
  { value: 3, label: '3 px' },
  { value: 5, label: '5 px' },
  { value: 8, label: '8 px' },
];
const TEXT_SIZE_OPTS: { value: number; label: string }[] = SHAPE_TEXT_SIZES.map((sz) => ({
  value: sz,
  label: `${sz} px`,
}));

type StylePanelProps = {
  onClose: () => void;
  side?: 'right' | 'left' | 'left-full';
  verticalSide?: 'top' | 'bottom';
};

export function ArrowStylePanel({ onClose, side, verticalSide }: StylePanelProps) {
  const style = useAnnotationStore((s) => s.arrowStyle);
  const setRaw = useAnnotationStore((s) => s.setArrowStyle);
  const set = useApplyStyleAndTemplate('arrow', setRaw);
  return (
    <PopoverPanel onClose={onClose} title="Arrow style" side={side} verticalSide={verticalSide}>
      <Section label="Shape">
        <StyleSelect
          value={style.shape ?? 'straight'}
          options={SHAPE_OPTS}
          onChange={(v) => set({ shape: v })}
          renderPreview={(o) => <ArrowShapePreview shape={o.value} />}
          ariaLabel="Arrow shape"
        />
      </Section>
      <Section label="Line">
        <StyleSelect
          value={style.dash}
          options={DASH_OPTS}
          onChange={(v) => set({ dash: v })}
          renderPreview={(o) => <DashPreview dash={o.value} />}
          ariaLabel="Line style"
        />
      </Section>
      <Section label="Head">
        <StyleSelect
          value={style.head}
          options={HEAD_OPTS}
          onChange={(v) => set({ head: v })}
          renderPreview={(o) => <HeadPreview head={o.value} />}
          ariaLabel="Arrowhead"
        />
      </Section>
      <Section label="Weight">
        <StyleSelect
          value={style.thickness}
          options={WEIGHT_OPTS}
          onChange={(v) => set({ thickness: v as 1 | 2 | 3 | 5 | 8 })}
          renderPreview={(o) => <ThicknessPreview thickness={o.value} />}
          ariaLabel="Stroke weight"
        />
      </Section>
      <Section label="Text size">
        <StyleSelect
          value={style.textSize}
          options={TEXT_SIZE_OPTS}
          onChange={(v) => set({ textSize: v })}
          renderPreview={(o) => <TextSizePreview size={o.value} />}
          ariaLabel="Text size"
        />
      </Section>
    </PopoverPanel>
  );
}

export function RectStylePanel({ onClose, side, verticalSide }: StylePanelProps) {
  const style = useAnnotationStore((s) => s.rectStyle);
  const setRaw = useAnnotationStore((s) => s.setRectStyle);
  const set = useApplyStyleAndTemplate('rect', setRaw);
  return (
    <PopoverPanel onClose={onClose} title="Rectangle style" side={side} verticalSide={verticalSide}>
      <Section label="Corner">
        <StyleSelect
          value={style.corner}
          options={CORNER_OPTS}
          onChange={(v) => set({ corner: v })}
          renderPreview={(o) => <CornerPreview corner={o.value} />}
          ariaLabel="Corner style"
        />
      </Section>
      <Section label="Fill">
        <StyleSelect
          value={style.fill}
          options={FILL_OPTS}
          onChange={(v) => set({ fill: v })}
          renderPreview={(o) => <FillPreview fill={o.value} />}
          ariaLabel="Fill style"
        />
      </Section>
      <Section label="Line">
        <StyleSelect
          value={style.dash}
          options={DASH_OPTS}
          onChange={(v) => set({ dash: v })}
          renderPreview={(o) => <DashPreview dash={o.value} />}
          ariaLabel="Border line style"
        />
      </Section>
      <Section label="Weight">
        <StyleSelect
          value={style.thickness}
          options={WEIGHT_OPTS}
          onChange={(v) => set({ thickness: v as 1 | 2 | 3 | 5 | 8 })}
          renderPreview={(o) => <ThicknessPreview thickness={o.value} />}
          ariaLabel="Border weight"
        />
      </Section>
      <Section label="Text size">
        <StyleSelect
          value={style.textSize}
          options={TEXT_SIZE_OPTS}
          onChange={(v) => set({ textSize: v })}
          renderPreview={(o) => <TextSizePreview size={o.value} />}
          ariaLabel="Text size"
        />
      </Section>
    </PopoverPanel>
  );
}

export function EllipseStylePanel({ onClose, side, verticalSide }: StylePanelProps) {
  const style = useAnnotationStore((s) => s.ellipseStyle);
  const setRaw = useAnnotationStore((s) => s.setEllipseStyle);
  const set = useApplyStyleAndTemplate('ellipse', setRaw);
  return (
    <PopoverPanel onClose={onClose} title="Ellipse style" side={side} verticalSide={verticalSide}>
      <Section label="Fill">
        <StyleSelect
          value={style.fill}
          options={FILL_OPTS}
          onChange={(v) => set({ fill: v })}
          renderPreview={(o) => <FillPreview fill={o.value} />}
          ariaLabel="Fill style"
        />
      </Section>
      <Section label="Line">
        <StyleSelect
          value={style.dash}
          options={DASH_OPTS}
          onChange={(v) => set({ dash: v })}
          renderPreview={(o) => <DashPreview dash={o.value} />}
          ariaLabel="Outline style"
        />
      </Section>
      <Section label="Weight">
        <StyleSelect
          value={style.thickness}
          options={WEIGHT_OPTS}
          onChange={(v) => set({ thickness: v as 1 | 2 | 3 | 5 | 8 })}
          renderPreview={(o) => <ThicknessPreview thickness={o.value} />}
          ariaLabel="Outline weight"
        />
      </Section>
      <Section label="Text size">
        <StyleSelect
          value={style.textSize}
          options={TEXT_SIZE_OPTS}
          onChange={(v) => set({ textSize: v })}
          renderPreview={(o) => <TextSizePreview size={o.value} />}
          ariaLabel="Text size"
        />
      </Section>
    </PopoverPanel>
  );
}

export function CalloutStylePanel({ onClose, side, verticalSide }: StylePanelProps) {
  const style = useAnnotationStore((s) => s.calloutStyle);
  const setRaw = useAnnotationStore((s) => s.setCalloutStyle);
  const set = useApplyStyleAndTemplate('callout', setRaw);
  return (
    <PopoverPanel onClose={onClose} title="Callout style" side={side} verticalSide={verticalSide}>
      <Section label="Corner">
        <StyleSelect
          value={style.corner}
          options={CORNER_OPTS}
          onChange={(v) => set({ corner: v })}
          renderPreview={(o) => <CornerPreview corner={o.value} />}
          ariaLabel="Corner style"
        />
      </Section>
      <Section label="Leader">
        <StyleSelect
          value={style.dash}
          options={DASH_OPTS}
          onChange={(v) => set({ dash: v })}
          renderPreview={(o) => <DashPreview dash={o.value} />}
          ariaLabel="Leader line style"
        />
      </Section>
      <Section label="Weight">
        <StyleSelect
          value={style.thickness}
          options={WEIGHT_OPTS}
          onChange={(v) => set({ thickness: v as 1 | 2 | 3 | 5 | 8 })}
          renderPreview={(o) => <ThicknessPreview thickness={o.value} />}
          ariaLabel="Border weight"
        />
      </Section>
      <Section label="Text size">
        <StyleSelect
          value={style.textSize}
          options={TEXT_SIZE_OPTS}
          onChange={(v) => set({ textSize: v })}
          renderPreview={(o) => <TextSizePreview size={o.value} />}
          ariaLabel="Text size"
        />
      </Section>
    </PopoverPanel>
  );
}

export function PenStylePanel({ onClose }: { onClose: () => void }) {
  const style = useAnnotationStore((s) => s.penStyle);
  const set = useAnnotationStore((s) => s.setPenStyle);
  return (
    <PopoverPanel onClose={onClose} title="Pencil style">
      <Section label="Line">
        <StyleSelect
          value={style.dash}
          options={DASH_OPTS}
          onChange={(v) => set({ dash: v })}
          renderPreview={(o) => <DashPreview dash={o.value} />}
          ariaLabel="Stroke style"
        />
      </Section>
      <Section label="Weight">
        <StyleSelect
          value={style.thickness}
          options={PEN_WEIGHT_OPTS}
          onChange={(v) => set({ thickness: v })}
          renderPreview={(o) => <ThicknessPreview thickness={o.value} />}
          ariaLabel="Stroke weight"
        />
      </Section>
    </PopoverPanel>
  );
}

// ---------- Convenience: attach chevron + panel to a tool button -----
// Wraps its children (the tool icon button) with a right-hand chevron and
// a popover that opens on chevron click. `openKey` identifies which
// dropdown is currently open (the parent owns exclusion so only one is
// visible at a time).
export function StyleSplit({
  toolKey,
  openKey,
  setOpenKey,
  panel,
  children,
  panelLabel,
}: {
  toolKey: string;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  panel: (onClose: () => void) => React.ReactNode;
  panelLabel: string;
  children: React.ReactNode;
}) {
  const open = openKey === toolKey;
  return (
    <div className="relative flex items-stretch" data-nds-style-split={toolKey}>
      {children}
      <StyleChevron
        open={open}
        onToggle={() => setOpenKey(open ? null : toolKey)}
        label={panelLabel}
      />
      {open && panel(() => setOpenKey(null))}
    </div>
  );
}

// Hook: parent-owned open key (only one dropdown open at a time).
export function useStyleDropdownKey() {
  return useState<string | null>(null);
}
