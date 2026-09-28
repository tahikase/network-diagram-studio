// Demo v0.7.13: Shapes accordion body redesigned as a rich, draggable
// shape grid. The default-styles panel has been removed per user
// feedback — style now lives inside the shape's own edit UI once
// dropped on the canvas, and per-variant style choices are baked into
// the tile itself (Dashed / Filled / Rounded / etc.).
//
// Each tile:
//   - Has a distinct thumbnail so the user can tell the variants apart.
//   - Is DRAGGABLE — sets the NDS_DRAG_MIME payload with
//     `{ kind: 'shape', variant }` so Canvas.tsx can build the correct
//     Shape at the drop point via `buildShapeFromVariantAt`.
//   - Is also CLICKABLE — click drops the shape at the viewport centre
//     (with the same tiny fan-out offset used by resource / icon rows).
//
// One continuous 4-column grid with one tile per design. New arrows face
// right; users rotate individual arrows with the existing canvas handle.

import { useMemo, useState } from 'react';
import {
  SHAPE_TILE_PRESETS,
  type ShapePreset,
} from './shape-presets';
import { geomPath, geomDetailPath } from './shape-geometry';
import { NDS_DRAG_MIME, type NdsDragPayload } from '../canvas/Canvas';
import { useT } from '../i18n/useT';
import { useFavoritesStore } from './favorites-store';
import { useShapeDropper } from './use-shape-dropper';
import { StarToggle } from '../panel/IconGrid';
import { beginPalettePreview } from './placement-feedback';

// ---------------------------------------------------------------------------
// Thumbnails — one per variant. Each is a tiny SVG that mirrors what the
// shape actually looks like when dropped (curved / elbow / dashed / filled
// / round / etc.). Icons are 30 × 22 so five columns fit in the default
// 300-px palette without cramping.
// ---------------------------------------------------------------------------

const STROKE = 'currentColor';

// v0.7.15 — all arrow thumbnails redrawn as clean HORIZONTAL, right-
// pointing glyphs on a shared 32×24 canvas. Matches the draw.io / PPT /
// Figma convention where arrow icons in shape palettes read left-to-right
// and are instantly recognizable as "arrow" without the reader having to
// interpret an unusual diagonal geometry. Each glyph shares the same
// baseline (y=12) and same right-endpoint (x=26) so the whole family
// looks unified when placed in the palette grid.

function ArrowStraight() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12 L23 12" />
      <path d="M19 7 L24 12 L19 17" />
    </svg>
  );
}
function ArrowCurved() {
  // v0.7.17 — J-curve: shaft rises straight up from lower-left, then
  // curves smoothly to horizontal, ending in a clean right-pointing
  // arrowhead at the top-right. Reads unambiguously as "curved arrow"
  // at 28×22 tile size, and is visually distinct from the straight
  // arrow (horizontal line) AND the elbow arrow (sharp L-corner).
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20 C 4 10, 12 8, 24 8" />
      <path d="M19 4 L24 8 L19 12" />
    </svg>
  );
}
function ArrowElbow() {
  // v0.7.16 — bigger, unambiguous L-shape so the "elbow" is obvious
  // even at 28×22 tile size. Vertical stub (12px) + horizontal (20px).
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4 L6 16 L26 16" />
      <path d="M22 12 L26 16 L22 20" />
    </svg>
  );
}
function LineNoHead() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
      <path d="M4 12 L26 12" />
    </svg>
  );
}
function ArrowDouble() {
  // Universal double-headed arrow: horizontal shaft, chevron heads at
  // BOTH ends. Reads as ↔ at a glance.
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 12 L24 12" />
      <path d="M11 7 L6 12 L11 17" />
      <path d="M19 7 L24 12 L19 17" />
    </svg>
  );
}
function ArrowDashed() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12 L23 12" strokeDasharray="3 3" />
      <path d="M19 7 L24 12 L19 17" />
    </svg>
  );
}

function RectSharp() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <rect x="4" y="4" width="24" height="16" />
    </svg>
  );
}
function RectRounded() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <rect x="4" y="4" width="24" height="16" rx="4" />
    </svg>
  );
}
function RectDashed() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <rect x="4" y="4" width="24" height="16" strokeDasharray="3 3" />
    </svg>
  );
}
function RectFilled() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill={STROKE} fillOpacity={0.25} stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <rect x="4" y="4" width="24" height="16" />
    </svg>
  );
}
function RectRoundedFilled() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill={STROKE} fillOpacity={0.25} stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <rect x="4" y="4" width="24" height="16" rx="4" />
    </svg>
  );
}
function TextBoxThumb() {
  // v0.9.47 — the preset no longer draws a border, so the tile shouldn't
  // advertise one. A dotted box hints at the (invisible) bounds without
  // implying a stroke will be painted.
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="26" height="12" rx="1.5" strokeWidth={1} strokeDasharray="2 2" opacity={0.35} />
      <path d="M10 10 L22 10" />
      <path d="M16 10 L16 16" />
    </svg>
  );
}

function EllipseThumb() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <ellipse cx="16" cy="12" rx="12" ry="8" />
    </svg>
  );
}
function CircleThumb() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <circle cx="16" cy="12" r="9" />
    </svg>
  );
}
function EllipseFilled() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill={STROKE} fillOpacity={0.25} stroke={STROKE} strokeWidth={1.75} aria-hidden="true">
      <ellipse cx="16" cy="12" rx="12" ry="8" />
    </svg>
  );
}

function CalloutThumb() {
  return (
    <svg width={28} height={22} viewBox="0 0 32 24" fill="none" stroke={STROKE} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="20" height="13" rx="2" />
      <path d="M18 17 L25 22" strokeDasharray="2 2" />
      <circle cx="26" cy="22" r="1.4" fill={STROKE} stroke="none" />
    </svg>
  );
}

const ARROW_STYLE_THUMBS: Record<string, () => React.ReactElement> = {
  straight: ArrowStraight,
  curved: ArrowCurved,
  elbow: ArrowElbow,
  line: LineNoHead,
  double: ArrowDouble,
  dashed: ArrowDashed,
};

/** Clockwise rotation that turns the right-pointing base glyph each way. */
const DIR_ROTATION: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };

/**
 * v0.9.47 — 24 arrow tiles from 6 hand-drawn glyphs.
 *
 * Every base glyph is drawn right-pointing on a shared 32×24 canvas, so a
 * quarter-turn is all that separates the directions. Rotating beats drawing
 * 18 more SVGs: the family cannot drift apart, and a tweak to one glyph
 * still shows up in all four of its directions.
 *
 * The rotation is applied to a wrapper rather than the <svg> so the tile's
 * flex centring still sees an unrotated box — a rotated 28×22 element
 * reports a 22×28 layout box and would otherwise sit off-centre.
 */
function buildArrowThumbs(): Record<string, () => React.ReactElement> {
  const out: Record<string, () => React.ReactElement> = {};
  for (const [styleKey, Glyph] of Object.entries(ARROW_STYLE_THUMBS)) {
    for (const dir of ['right', 'left', 'up', 'down']) {
      const variant = dir === 'right' ? `arrow-${styleKey}` : `arrow-${styleKey}-${dir}`;
      const deg = DIR_ROTATION[dir];
      out[variant] =
        deg === 0
          ? Glyph
          : () => (
              <span
                className="inline-flex items-center justify-center"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <Glyph />
              </span>
            );
    }
  }
  return out;
}

const THUMB_BY_VARIANT: Record<string, () => React.ReactElement> = {
  ...buildArrowThumbs(),
  'rect-sharp': RectSharp,
  'rect-rounded': RectRounded,
  'rect-dashed': RectDashed,
  'rect-filled': RectFilled,
  'rect-rounded-filled': RectRoundedFilled,
  'text-box': TextBoxThumb,
  ellipse: EllipseThumb,
  circle: CircleThumb,
  'ellipse-filled': EllipseFilled,
  callout: CalloutThumb,
};

// ---------------------------------------------------------------------------
// v0.9 — generic geometry thumbnail. Instead of hand-drawing ~37 more
// SVGs (which would inevitably drift from what actually gets dropped),
// the tile art is produced by the SAME `geomPath` the canvas renderer
// uses. The preset's drop size supplies the aspect ratio so a star reads
// square and a block arrow reads wide, exactly as they will on canvas.
// ---------------------------------------------------------------------------

function GeomThumb({ geom, aspect }: { geom: string; aspect: number }) {
  // Fit `aspect` (w / h) into the 26 × 18 content box of a 32 × 24 tile.
  const maxW = 26;
  const maxH = 18;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  const x = (32 - w) / 2;
  const y = (24 - h) / 2;
  const d = geomPath(geom, x, y, w, h);
  const detail = geomDetailPath(geom, x, y, w, h);
  if (!d) return null;
  return (
    <svg
      width={28}
      height={22}
      viewBox="0 0 32 24"
      fill="none"
      stroke={STROKE}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
      {detail && <path d={detail} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tile — one draggable thumbnail. `variant` is the ShapePreset id.
// ---------------------------------------------------------------------------

interface TileProps {
  variant: string;
  label: string;
  /** v0.9 — when set, the tile art is generated from shape-geometry. */
  geom?: string;
  /** Drop aspect ratio (w / h), used to size the generated art. */
  aspect?: number;
  onClickDrop: () => void;
  /** Omitted by callers that don't offer pinning; the star is then hidden. */
  starred?: boolean;
  onToggleStar?: () => void;
}

function Tile({ variant, label, geom, aspect, onClickDrop, starred, onToggleStar }: TileProps) {
  const t = useT();
  const Thumb = THUMB_BY_VARIANT[variant];
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        const payload: NdsDragPayload = { kind: 'shape', variant };
        e.dataTransfer.setData(NDS_DRAG_MIME, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'copy';
        beginPalettePreview(variant);
      }}
      onClick={onClickDrop}
      title={`${label} — ${t('click to drop, or drag onto the canvas')}`}
      aria-label={label}
      data-nds-tool={variant}
      data-nds-shape-tile="1"
      data-nds-shape-variant={variant}
      className="relative aspect-square w-full flex items-center justify-center rounded-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 transition cursor-grab active:cursor-grabbing"
    >
      {onToggleStar && <StarToggle filled={!!starred} onToggle={onToggleStar} />}
      {Thumb ? <Thumb /> : geom ? <GeomThumb geom={geom} aspect={aspect ?? 1} /> : null}
    </button>
  );
}

/**
 * A shape tile addressed by preset, for callers outside this file (the
 * Favorites tab). Keeps thumbnail resolution — hand-drawn `THUMB_BY_VARIANT`
 * art vs. generated `GeomThumb` — in the one place that knows about it, so a
 * favorited shape looks exactly like it does in the Shapes section.
 */
export function ShapePresetTile({
  preset,
  onDrop,
  starred,
  onToggleStar,
}: {
  preset: ShapePreset;
  onDrop: () => void;
  starred?: boolean;
  onToggleStar?: () => void;
}) {
  return (
    <Tile
      variant={preset.variant}
      label={preset.label}
      geom={typeof preset.overrides?.geom === 'string' ? preset.overrides.geom : undefined}
      aspect={preset.size ? preset.size.w / preset.size.h : 1}
      onClickDrop={onDrop}
      starred={starred}
      onToggleStar={onToggleStar}
    />
  );
}

function ShapeGrid({
  presets,
  onDropVariant,
}: {
  presets: ShapePreset[];
  onDropVariant: (v: string) => void;
}) {
  const favShapes = useFavoritesStore((s) => s.shapes);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  if (presets.length === 0) return null;
  return (
    <div className="grid grid-cols-4 gap-1.5" data-nds-shape-grid="1">
      {presets.map((preset) => (
        <ShapePresetTile
          key={preset.variant}
          preset={preset}
          onDrop={() => onDropVariant(preset.variant)}
          starred={favShapes.has(preset.variant)}
          onToggleStar={() => toggleFavorite('shape', preset.variant)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Shapes accordion body.
// ---------------------------------------------------------------------------

export function PaletteShapesSection() {
  const t = useT();
  const [query, setQuery] = useState('');

  const onDropVariant = useShapeDropper();

  const presets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHAPE_TILE_PRESETS.filter((p) =>
      !q || p.label.toLowerCase().includes(q) || p.variant.toLowerCase().includes(q));
  }, [query]);
  const shown = presets.length;

  return (
    <div className="px-3 py-3" data-nds-palette-shapes="1">
      {/* v0.9.80 — Shapes gets the filter every other section already had. */}
      <div className="mb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Filter shapes…')}
          aria-label={t('Filter shapes')}
          data-nds-shape-filter="1"
          className="w-full h-8 px-2 text-sm border rounded-md"
          style={{ borderColor: 'var(--color-slate-300)' }}
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-normal text-slate-400 select-none">
          {t('Click a tile to drop at centre, or drag onto the canvas.')}
        </div>
        <div
          className="text-[10px] text-slate-400 tabular-nums select-none shrink-0 pl-2"
          data-nds-shape-count={shown}
        >
          {query.trim() ? `${shown} / ${SHAPE_TILE_PRESETS.length}` : SHAPE_TILE_PRESETS.length}
        </div>
      </div>

      {shown === 0 && (
        <div className="py-6 text-center text-xs text-slate-400 select-none">
          {t('No shapes match that filter.')}
        </div>
      )}

      <ShapeGrid presets={presets} onDropVariant={onDropVariant} />
    </div>
  );
}
