// Demo v0.7.13: shape preset registry — the source of truth for what
// tiles appear in the Palette Shapes accordion AND what drops on the
// canvas when a shape tile is drag-dropped or clicked.
//
// The underlying shape system only supports FOUR geometric kinds
// (arrow / rect / ellipse / callout) plus a text-box variant. To give
// users a richer visual palette without inventing new geometry, each
// tile is a STYLE PRESET applied on top of `buildDefaultShapeAt`. E.g.
// "Dashed rectangle" = base rect with `dash: 'dashed'`, "Circle" = base
// ellipse with `rx === ry`, "Double arrow" = base arrow with
// `head: 'both'`.
//
// A drag payload only needs to carry the preset's `variant` string —
// the canvas resolves that string back to a full Shape via
// `buildShapeFromVariantAt`. This keeps the drag data tiny and stable
// across preset edits.

import type { Point, Shape } from './tabs-store';
import { buildDefaultShapeAt } from './ShapeOverlay';
import { DEFAULT_SHAPE_TEXT_PX, useAnnotationStore } from './annotation-store';

export type ShapeCategory =
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'callout'
  | 'text'
  | 'basic'
  | 'flowchart'
  | 'blockarrow'
  | 'network';
export type ShapeBaseKind = 'shape-arrow' | 'shape-rect' | 'shape-ellipse' | 'shape-callout';

/**
 * v0.9.47 — which way an arrow preset points when dropped.
 *
 * `right` is the historical behaviour and keeps the original, unsuffixed
 * variant IDs (`arrow-straight`, `arrow-elbow`, …) so favourites saved
 * before this change still resolve.
 */
export type ArrowDir = 'right' | 'left' | 'up' | 'down';
export const ARROW_DIRS: readonly ArrowDir[] = ['right', 'left', 'up', 'down'];

export interface ShapePreset {
  /** Stable ID used in drag payloads and DOM data-attributes. */
  variant: string;
  /** Tooltip / accessible name. */
  label: string;
  /** Catalogue family used by search and creation filtering. */
  category: ShapeCategory;
  /** Underlying geometric kind before overrides. Text-box is a rect. */
  baseKind: ShapeBaseKind;
  /** Field overrides applied to the Shape returned by
   *  `buildDefaultShapeAt`. Field names match `Shape` union members. */
  overrides?: Record<string, string | number>;
  /** Extra flag for the special text-box preset (small borderless rect,
   *  starts an inline text edit on drop). */
  isTextBox?: boolean;
  /** Extra flag for the circle preset (rx === ry). */
  isCircle?: boolean;
  /** Which way an arrow preset points when dropped. Arrows only. */
  dir?: ArrowDir;
  /** Drop size override. The default rect is 200 × 120, which looks
   *  stretched for square-ish geometry (star, cross, stick figure), so
   *  those presets ask for their own proportions. */
  size?: { w: number; h: number };
}

/** Square-ish drop size for radially symmetric geometry. */
const SQ = { w: 150, h: 150 };
/** Slightly wide box — the default for most flowchart geometry. */
const WIDE = { w: 200, h: 120 };

/**
 * The six arrow STYLES. Direction is a separate axis, applied below.
 *
 * v0.9.80 — ordered by what a network diagram reaches for, not by how the
 * geometry was implemented. Straight and elbow carry nearly every connection
 * anyone draws here (an elbow is what you use the moment two boxes are not
 * on the same axis); line and dashed carry the "logical / planned" links;
 * curved is decoration and goes last. This order is what the palette shows,
 * so it is the one that matters.
 */
const ARROW_STYLES: readonly {
  key: string;
  label: string;
  overrides: Record<string, string>;
}[] = [
  { key: 'straight', label: 'Straight arrow', overrides: { shape: 'straight', head: 'end', dash: 'solid' } },
  { key: 'elbow', label: 'Elbow arrow', overrides: { shape: 'elbow', head: 'end', dash: 'solid' } },
  { key: 'line', label: 'Line', overrides: { shape: 'straight', head: 'none', dash: 'solid' } },
  { key: 'dashed', label: 'Dashed arrow', overrides: { shape: 'straight', head: 'end', dash: 'dashed' } },
  { key: 'double', label: 'Double arrow', overrides: { shape: 'straight', head: 'both', dash: 'solid' } },
  { key: 'curved', label: 'Curved arrow', overrides: { shape: 'curved', head: 'end', dash: 'solid' } },
];

const DIR_WORD: Record<ArrowDir, string> = {
  right: 'right',
  left: 'left',
  up: 'up',
  down: 'down',
};

/**
 * 6 styles × 4 directions = 24 variants, represented by six style tiles.
 *
 * Generated rather than hand-written so a new style or direction cannot be
 * added to one axis and forgotten on the other. The `right` variants keep
 * their original unsuffixed IDs — those strings are persisted in the
 * favourites store, so renaming them would silently orphan a user's
 * starred arrows.
 */
const ARROW_PRESETS: readonly ShapePreset[] = ARROW_STYLES.flatMap((style) =>
  ARROW_DIRS.map((dir) => ({
    variant: dir === 'right' ? `arrow-${style.key}` : `arrow-${style.key}-${dir}`,
    label: dir === 'right' ? style.label : `${style.label} (${DIR_WORD[dir]})`,
    category: 'arrow' as const,
    baseKind: 'shape-arrow' as const,
    overrides: style.overrides,
    dir,
  }))
);

export const SHAPE_PRESETS: readonly ShapePreset[] = [
  // ------------------------------------ Arrows / Lines
  ...ARROW_PRESETS,

  // ------------------------------------ Rectangles / Boxes
  {
    variant: 'rect-sharp',
    label: 'Rectangle',
    category: 'rect',
    baseKind: 'shape-rect',
    overrides: { corner: 'sharp', fill: 'none', dash: 'solid' },
  },
  {
    variant: 'rect-rounded',
    label: 'Rounded rectangle',
    category: 'rect',
    baseKind: 'shape-rect',
    overrides: { corner: 'rounded', fill: 'none', dash: 'solid' },
  },
  // Borderless text; placing it starts inline editing.
  {
    variant: 'text-box',
    label: 'Text box',
    category: 'text',
    baseKind: 'shape-rect',
    isTextBox: true,
  },
  {
    variant: 'rect-dashed',
    label: 'Dashed rectangle',
    category: 'rect',
    baseKind: 'shape-rect',
    overrides: { corner: 'sharp', fill: 'none', dash: 'dashed' },
  },
  {
    variant: 'rect-filled',
    label: 'Filled rectangle',
    category: 'rect',
    baseKind: 'shape-rect',
    overrides: { corner: 'sharp', fill: 'tint', dash: 'solid' },
  },
  {
    variant: 'rect-rounded-filled',
    label: 'Rounded filled',
    category: 'rect',
    baseKind: 'shape-rect',
    overrides: { corner: 'rounded', fill: 'tint', dash: 'solid' },
  },

  // ------------------------------------ Ellipses / Circles
  {
    variant: 'ellipse',
    label: 'Ellipse',
    category: 'ellipse',
    baseKind: 'shape-ellipse',
    overrides: { fill: 'none', dash: 'solid' },
  },
  {
    variant: 'circle',
    label: 'Circle',
    category: 'ellipse',
    baseKind: 'shape-ellipse',
    overrides: { fill: 'none', dash: 'solid' },
    isCircle: true,
  },
  {
    variant: 'ellipse-filled',
    label: 'Filled ellipse',
    category: 'ellipse',
    baseKind: 'shape-ellipse',
    overrides: { fill: 'tint', dash: 'solid' },
  },

  // ------------------------------------ Callouts
  {
    variant: 'callout',
    label: 'Callout',
    category: 'callout',
    baseKind: 'shape-callout',
    overrides: { dash: 'dashed', corner: 'rounded' },
  },

  // ------------------------------------ Basic shapes (v0.9)
  // Every entry below is an ordinary `rect` carrying a `geom` id. The
  // shape is still a bounding box for hit-testing, resize, rotation and
  // text — only the drawn outline differs. See `shape-geometry.ts`.
  ...([
    ['diamond', 'Diamond', WIDE],
    ['triangle', 'Triangle', SQ],
    ['triangle-right', 'Right triangle', SQ],
    ['parallelogram', 'Parallelogram', WIDE],
    ['trapezoid', 'Trapezoid', WIDE],
    ['trapezoid-flip', 'Trapezoid (flipped)', WIDE],
    ['pentagon', 'Pentagon', SQ],
    ['hexagon', 'Hexagon', WIDE],
    ['octagon', 'Octagon', SQ],
    ['star5', 'Star', SQ],
    ['star6', '6-point star', SQ],
    ['cross', 'Cross', SQ],
    ['chevron', 'Chevron', WIDE],
    ['drop', 'Teardrop', SQ],
    // NOTE: no `heart` or `moon` preset. Both were decorative shapes with no
    // use in a network diagram, so they were retired from the palette in
    // v0.9.33. Their GEOMETRY is deliberately left in `shape-geometry.ts` —
    // geom ids are an on-disk format, so a diagram saved before v0.9.33 still
    // renders its heart or crescent correctly. Only the palette tile is gone.
    ['shield', 'Shield', { w: 130, h: 150 }],
    ['cloud', 'Cloud', WIDE],
    ['speech', 'Speech bubble', WIDE],
    ['actor', 'Actor', { w: 100, h: 150 }],
    // NOTE: no `circle` preset here — the Ellipses group already ships one,
    // and two tiles with the same variant id would collide in `findPreset`.
    ['terminator', 'Rounded / pill', WIDE],
    ['semicircle', 'Semicircle', { w: 150, h: 90 }],
    ['quarter-circle', 'Quarter circle', SQ],
    ['half-round-left', 'Half round (left)', WIDE],
    ['step', 'Step', WIDE],
    ['loop-limit', 'Loop limit', WIDE],
    ['bracket-left', 'Bracket [', { w: 70, h: 160 }],
    ['bracket-right', 'Bracket ]', { w: 70, h: 160 }],
    ['brace-left', 'Brace {', { w: 70, h: 160 }],
    ['brace-right', 'Brace }', { w: 70, h: 160 }],
    ['s-curve', 'S-curve', SQ],
    ['cone', 'Cone', { w: 140, h: 160 }],
    ['pyramid', 'Pyramid', { w: 160, h: 140 }],
    ['right-triangle', 'Right-angle triangle', SQ],
    ['plaque', 'Plaque', WIDE],
    ['frame', 'Frame', WIDE],
    ['arc', 'Arc', SQ],
    ['corner', 'Corner', SQ],
    ['tee', 'Tee', SQ],
  ] as const).map(
    ([geom, label, size]): ShapePreset => ({
      variant: `geom-${geom}`,
      label,
      category: 'basic',
      baseKind: 'shape-rect',
      overrides: { geom, fill: 'none', dash: 'solid', corner: 'sharp' },
      size: { w: size.w, h: size.h },
    }),
  ),

  // ------------------------------------ Flowchart shapes (v0.9)
  ...([
    ['process', 'Process'],
    ['internal-storage', 'Internal storage'],
    ['manual-input', 'Manual input'],
    ['preparation', 'Preparation'],
    ['delay', 'Delay'],
    ['display', 'Display'],
    ['document', 'Document'],
    ['tape', 'Tape / data'],
    ['note', 'Note'],
    ['card', 'Card'],
    ['cube', 'Cube'],
    ['cylinder', 'Cylinder / database'],
    ['collate', 'Collate'],
    ['merge', 'Merge'],
    ['sort', 'Sort'],
    ['stored-data', 'Stored data'],
    ['direct-data', 'Direct data'],
    ['sequential-data', 'Sequential data'],
    ['multi-document', 'Multi-document'],
    ['paper-tape', 'Paper tape'],
    ['off-page', 'Off-page connector'],
    ['summing-junction', 'Summing junction'],
    ['or-gate', 'Or'],
    ['container', 'Container'],
    ['table', 'Table'],
    ['list', 'List'],
    ['window', 'Window'],
  ] as const).map(
    ([geom, label]): ShapePreset => ({
      variant: `geom-${geom}`,
      label,
      category: 'flowchart',
      baseKind: 'shape-rect',
      overrides: { geom, fill: 'none', dash: 'solid', corner: 'sharp' },
      size: { w: WIDE.w, h: WIDE.h },
    }),
  ),

  // ------------------------------------ Block arrows (v0.9)
  ...([
    ['arrow-right', 'Block arrow right', { w: 180, h: 100 }],
    ['arrow-left', 'Block arrow left', { w: 180, h: 100 }],
    ['arrow-up', 'Block arrow up', { w: 100, h: 180 }],
    ['arrow-down', 'Block arrow down', { w: 100, h: 180 }],
    ['arrow-both', 'Block arrow both ways', { w: 200, h: 100 }],
    ['arrow-quad', 'Four-way arrow', SQ],
    ['arrow-corner', 'Bent arrow', { w: 170, h: 150 }],
    ['arrow-notched', 'Notched arrow', { w: 180, h: 100 }],
    ['arrow-pentagon', 'Arrow pentagon', { w: 180, h: 110 }],
    ['arrow-curved', 'Curved arrow', { w: 170, h: 150 }],
  ] as const).map(
    ([geom, label, size]): ShapePreset => ({
      variant: `geom-${geom}`,
      label,
      category: 'blockarrow',
      baseKind: 'shape-rect',
      overrides: { geom, fill: 'tint', dash: 'solid', corner: 'sharp' },
      size: { w: size.w, h: size.h },
    }),
  ),

  // ------------------------------------ Network diagram (v0.9.4)
  // Boundaries, racks, encapsulation and status marks — the furniture
  // you draw around and between nodes. Equipment itself is an icon, not
  // a shape; see the On-premises category in the resource palette.
  //
  // These default to `fill: 'none'` for the same reason the flowchart
  // presets do: a boundary you drop over existing nodes must not hide
  // them. The two block-arrow-like members (`hairpin`, `dimension`) and
  // the status marks are the exceptions — a solid bolt or a tinted
  // "denied" badge reads far better than an outline.
  ...([
    ['tab-frame', 'Zone boundary', { w: 260, h: 180 }, 'none'],
    ['region-frame', 'Region marker', { w: 240, h: 170 }, 'none'],
    ['rack-frame', 'Rack', { w: 130, h: 220 }, 'none'],
    ['brick-wall', 'Firewall boundary', { w: 200, h: 110 }, 'none'],
    ['tunnel', 'Tunnel / encapsulation', { w: 220, h: 100 }, 'none'],
    ['hairpin', 'Hairpin / U-turn', { w: 170, h: 150 }, 'tint'],
    ['dimension', 'Span measure', { w: 220, h: 90 }, 'tint'],
    ['stack', 'Instance stack', WIDE, 'none'],
    ['layers', 'Layers / tiers', { w: 190, h: 150 }, 'none'],
    ['bracket-top', 'Bracket top', { w: 180, h: 70 }, 'none'],
    ['bracket-bottom', 'Bracket bottom', { w: 180, h: 70 }, 'none'],
    ['lightning', 'Link down', { w: 110, h: 150 }, 'tint'],
    ['no-entry', 'Denied', SQ, 'tint'],
    ['check-badge', 'Allowed', SQ, 'tint'],
    ['warn-triangle', 'Degraded', SQ, 'tint'],
    ['crossed-box', 'Failed / retired', { w: 160, h: 120 }, 'none'],
    ['database', 'Database', { w: 150, h: 160 }, 'none'],
  ] as const).map(
    ([geom, label, size, fill]): ShapePreset => ({
      variant: `geom-${geom}`,
      label,
      category: 'network',
      baseKind: 'shape-rect',
      overrides: { geom, fill, dash: 'solid', corner: 'sharp' },
      size: { w: size.w, h: size.h },
    }),
  ),
];

/**
 * Look up a preset by variant. Returns `undefined` for unknown variants
 * so the caller can bail without throwing.
 */
export function findPreset(variant: string): ShapePreset | undefined {
  return SHAPE_PRESETS.find((p) => p.variant === variant);
}

// Keep one single-headed block arrow and the four-way design. Other directions
// are made with the canvas rotation handle, not additional creation tiles.
// The full registry above still resolves saved preset IDs and legacy drops.
const NETWORKING_SHAPE_VARIANTS: ReadonlySet<string> = new Set([
  'rect-sharp', 'rect-rounded', 'text-box', 'rect-dashed', 'rect-filled', 'rect-rounded-filled',
  'ellipse', 'circle', 'ellipse-filled', 'callout',
  'geom-cloud', 'geom-speech', 'geom-actor', 'geom-terminator', 'geom-sequential-data',
  'geom-arrow-right', 'geom-arrow-quad', 'geom-brick-wall', 'geom-database',
]);

/** One creation catalogue shared by Shapes, global search and Favorites. */
export const PALETTE_SHAPE_PRESETS: readonly ShapePreset[] = SHAPE_PRESETS.filter(
  (p) => (p.category === 'arrow' && p.dir === 'right' && p.variant !== 'arrow-elbow') ||
    NETWORKING_SHAPE_VARIANTS.has(p.variant),
);
const PALETTE_SHAPE_VARIANTS = new Set(PALETTE_SHAPE_PRESETS.map((p) => p.variant));

export function isPaletteShapeVariant(variant: string): boolean {
  return PALETTE_SHAPE_VARIANTS.has(variant);
}

/** The picker and search offer the same 24 unique creation presets. */
export const SHAPE_TILE_PRESETS = PALETTE_SHAPE_PRESETS;

/**
 * Resolve an arrow STYLE tile plus the chosen direction to the concrete
 * preset variant. The `right` presets kept their original unsuffixed ids,
 * which is why that one case is not suffixed.
 */
export function arrowVariantFor(styleVariant: string, dir: ArrowDir): string {
  return dir === 'right' ? styleVariant : `${styleVariant}-${dir}`;
}

function makePaletteShapeId(): string {
  return `sh_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build a canvas Shape from a preset variant at the given world-space
 * point. The result is fully self-contained — callers can pass it
 * straight to `useTabsStore.getState().addShape(shape)`.
 *
 * Reads style defaults from `useAnnotationStore` (color, per-shape style
 * groups) so drops respect user-tuned defaults; the preset's
 * `overrides` are then layered on top.
 */
export function buildShapeFromVariantAt(variant: string, center: Point): Shape | null {
  const preset = findPreset(variant);
  if (!preset) return null;

  const store = useAnnotationStore.getState();

  // v0.7.14 fix — pre-apply preset overrides into the draft styles
  // BEFORE calling `buildDefaultShapeAt`. The default builder makes
  // geometric decisions based on style fields (e.g. an 'elbow' arrow
  // needs from.y !== to.y or the polyline collapses to a straight
  // horizontal line, and a rounded rect needs `corner: 'rounded'` at
  // build time to get the initial cornerRadius). Layering overrides
  // AFTER the build only patches the style field — it doesn't fix the
  // geometry that was already frozen from the wrong style.
  const overrides = preset.overrides ?? {};
  const draftStyles = {
    color: store.color,
    fallbackWidth: 2,
    arrow: {
      ...store.arrowStyle,
      ...(preset.baseKind === 'shape-arrow' ? overrides : {}),
    },
    rect: {
      ...store.rectStyle,
      ...(preset.baseKind === 'shape-rect' ? overrides : {}),
    },
    ellipse: {
      ...store.ellipseStyle,
      ...(preset.baseKind === 'shape-ellipse' ? overrides : {}),
    },
    callout: {
      ...store.calloutStyle,
      ...(preset.baseKind === 'shape-callout' ? overrides : {}),
    },
  };

  // Special-case: text-box is a small BORDERLESS rect with an editable
  // text payload — very different geometry from the default 200×120 rect
  // that `buildDefaultShapeAt('shape-rect')` produces, so we build it
  // inline instead of layering overrides on the default.
  if (preset.isTextBox) {
    // Sized FROM the caption, not hardcoded: the old fixed 100×32 was
    // chosen when captions defaulted to 14 px, so a larger default left a
    // 24 px line box crammed into a 24 px slot and clipped descenders. The
    // 1.9 / 6.5 ratios reproduce the original proportions at 14 px, and the
    // floors keep a deliberately tiny caption from producing a box too
    // small to grab.
    const size = store.rectStyle.textSize ?? DEFAULT_SHAPE_TEXT_PX;
    const w = Math.max(100, Math.round(size * 6.5));
    const h = Math.max(32, Math.round(size * 1.9));
    return {
      id: makePaletteShapeId(),
      kind: 'rect' as const,
      x: center.x - w / 2,
      y: center.y - h / 2,
      w,
      h,
      color: store.color,
      // v0.9.47 — a text box is TEXT, not a box. `width: 0` paints no
      // stroke, so a label can be dropped over a diagram without a
      // rectangle around it. The rect still hit-tests through its
      // interior (SVG `visiblePainted` ignores `fill-opacity`), so the
      // shape stays clickable, draggable and resizable while invisible.
      width: 0,
      fillOpacity: 0,
      fill: 'none' as const,
      dash: 'solid' as const,
      corner: 'sharp' as const,
      text: 'Text',
      textSize: size,
      textBold: false,
      textColor: store.color,
    };
  }

  const base = buildDefaultShapeAt(preset.baseKind, center, draftStyles);

  // Layer preset overrides directly onto the built shape too. Most
  // fields are already correct (they were baked in during the build via
  // the modified draftStyles above), but this belt-and-braces spread
  // catches any downstream field the builder didn't propagate (e.g.
  // `head` on non-arrow branches, custom text sizing).
  const shape = { ...base, ...overrides } as Shape;

  // Special-case: circle preset — force rx === ry so it renders as a
  // true circle regardless of what the ellipse defaults say.
  if (preset.isCircle && shape.kind === 'ellipse') {
    shape.rx = 70;
    shape.ry = 70;
  }

  // v0.9.47 — point the arrow the way its tile advertises. `buildDefaultShapeAt`
  // only ever produces a rightward arrow, so the endpoints are rewritten here
  // around the SAME drop centre, keeping the arrow's length identical in every
  // direction.
  if (shape.kind === 'arrow' && preset.dir) {
    const LONG = 80;
    const JOG = 40;
    const { x: cx, y: cy } = center;

    let ends: { from: Point; to: Point };
    if (overrides.shape === 'elbow') {
      // An elbow's arrowhead sits on its FINAL segment, and `buildArrowPathD`
      // picks the corner from whichever of dx/dy is larger:
      //   |dx| >= |dy|  → horizontal, then VERTICAL   → head points up/down
      //   |dx| <  |dy|  → vertical, then HORIZONTAL   → head points left/right
      // So a rightward elbow needs the LONG run on Y and the jog on X — the
      // opposite of the intuitive reading, and the reason the old single
      // elbow preset dropped an arrow pointing DOWN while its tile showed one
      // pointing right. Both axes stay non-zero or the elbow collapses into a
      // plain diagonal.
      const elbow: Record<ArrowDir, { from: Point; to: Point }> = {
        right: { from: { x: cx - JOG, y: cy - LONG }, to: { x: cx + JOG, y: cy + LONG } },
        left: { from: { x: cx + JOG, y: cy - LONG }, to: { x: cx - JOG, y: cy + LONG } },
        down: { from: { x: cx - LONG, y: cy - JOG }, to: { x: cx + LONG, y: cy + JOG } },
        up: { from: { x: cx - LONG, y: cy + JOG }, to: { x: cx + LONG, y: cy - JOG } },
      };
      ends = elbow[preset.dir];
    } else {
      const straight: Record<ArrowDir, { from: Point; to: Point }> = {
        right: { from: { x: cx - LONG, y: cy }, to: { x: cx + LONG, y: cy } },
        left: { from: { x: cx + LONG, y: cy }, to: { x: cx - LONG, y: cy } },
        down: { from: { x: cx, y: cy - LONG }, to: { x: cx, y: cy + LONG } },
        up: { from: { x: cx, y: cy + LONG }, to: { x: cx, y: cy - LONG } },
      };
      ends = straight[preset.dir];
    }
    shape.from = ends.from;
    shape.to = ends.to;
  }

  // Filled variants: `fill: 'tint'` alone isn't enough because
  // `buildDefaultShapeAt` also sets `fillOpacity` from the CURRENT store
  // preset. Recompute so the fill actually shows.
  if ('fill' in overrides) {
    if (shape.kind === 'rect' || shape.kind === 'ellipse') {
      const f = overrides.fill;
      shape.fillOpacity = f === 'none' ? 0 : f === 'solid' ? 0.4 : 0.15;
    }
  }

  // v0.9 — per-preset drop size, re-centred on the drop point. Only
  // meaningful for rects (that's the only base kind that declares one).
  if (preset.size && shape.kind === 'rect') {
    shape.w = preset.size.w;
    shape.h = preset.size.h;
    shape.x = center.x - preset.size.w / 2;
    shape.y = center.y - preset.size.h / 2;
  }

  return shape;
}
