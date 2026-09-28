// The one place a user-pickable colour is defined.
//
// Both the freehand pen/shape tools (demo-only) and the per-edge stroke
// override (prod + demo) offer this list, so "orange" means the same orange
// everywhere and a diagram never accumulates six near-identical blues.
//
// This lives in `theme/` rather than `demo/annotation-store.ts` on purpose:
// annotation-store creates a zustand store at module scope, so importing the
// palette from it would pull the entire demo drawing-tool state machine into
// the production bundle.

export const PEN_COLORS = [
  { key: 'black', hex: '#0f172a', label: 'Black' },
  { key: 'white', hex: '#ffffff', label: 'White' },
  { key: 'red', hex: '#dc2626', label: 'Red' },
  { key: 'blue', hex: '#0078d4', label: 'Blue' },
  { key: 'green', hex: '#16a34a', label: 'Green' },
  { key: 'orange', hex: '#ea580c', label: 'Orange' },
  { key: 'yellow', hex: '#eab308', label: 'Yellow' },
] as const;

export type PenColorKey = (typeof PEN_COLORS)[number]['key'];

/** The stored hex of the Black swatch — also the default for every shape. */
export const INK_HEX = '#0f172a';

/**
 * Hexes that older builds stored for "black" from a palette that no longer
 * exists, kept here so diagrams saved before v0.9.31 also adapt to the theme.
 *
 * `#111827` is the black the inline text editor used to offer from its own
 * private six-colour list (v0.9.31 replaced that list with `PEN_COLORS`). Any
 * label typed before then carries it, and without this alias that text stays
 * near-black on the dark canvas — which is exactly what was reported.
 *
 * Painting it as ink shifts it by ~2% in the light theme, which is
 * imperceptible, and makes it readable in dark. Add to this set, never remove:
 * a saved file can carry any of these forever.
 */
const LEGACY_INK_HEXES = new Set(['#111827']);

/**
 * v0.9.30 — resolve a STORED colour into the value actually painted.
 *
 * Only **Black** is theme-aware, and it is really "ink": a black box drawn in
 * the light theme has to stay readable when the user flips to dark. Otherwise
 * every diagram made in one theme is invisible in the other — which is exactly
 * what was reported: a canvas of `#0f172a` boxes on a `#0b1220` background.
 *
 * **White is deliberately NOT inverted.** It is an explicit choice, not a
 * default, and it exists so a user can draw something genuinely white. Making
 * it swap would mean picking White in dark mode paints black — the opposite of
 * what the swatch is for, and there would then be no way to draw a white line
 * at all. So: Black adapts, White is literal, and the other five are chosen for
 * MEANING and are legible on both backgrounds.
 *
 * The flip is done with a CSS variable rather than by rewriting the shape,
 * for three reasons:
 *   1. the file on disk keeps its literal hex, so a diagram is portable and
 *      no migration is needed;
 *   2. the repaint costs no React render — the same trick `edge-styles.ts`
 *      already uses for every edge stroke;
 *   3. PNG/SVG export forces `data-theme="light"` on <html> before it
 *      rasterises (`export/exporters.ts`), so an exported image is correct
 *      no matter which theme was on screen. A colour resolved in JS from
 *      the theme store would export white-on-white.
 */
export function paintColor(hex: string): string;
export function paintColor(hex: string | undefined): string | undefined;
export function paintColor(hex: string | undefined): string | undefined {
  if (!hex) return hex;
  const k = hex.toLowerCase();
  if (k === INK_HEX || LEGACY_INK_HEXES.has(k)) return 'var(--nds-shape-ink)';
  return hex;
}

/**
 * v0.9.32 — the same resolution, but for TEXT rather than a stroke.
 *
 * Text and outlines want different amounts of ink on a dark canvas. A
 * full-strength white **stroke** glares, because a diagram is mostly outline
 * and every one of them would be at maximum contrast — which is why
 * `--nds-shape-ink` is deliberately `#e8eef7` and not `#fff`. Label **text**
 * is the opposite case: it is a small amount of ink, it frequently sits on
 * top of a shape's own tinted fill rather than on the bare canvas, and it is
 * the part the reader actually has to decode. It gets pure white.
 *
 * Everything else is identical to `paintColor` — only the ink swatch is
 * theme-aware, White stays literal, and the legacy hexes are honoured — so a
 * label the user explicitly coloured red is still red.
 */
export function paintTextColor(hex: string): string;
export function paintTextColor(hex: string | undefined): string | undefined;
export function paintTextColor(hex: string | undefined): string | undefined {
  if (!hex) return hex;
  const k = hex.toLowerCase();
  if (k === INK_HEX || LEGACY_INK_HEXES.has(k)) return 'var(--nds-shape-ink-text)';
  return hex;
}

/** The White swatch, in the two forms a saved file can carry it. */
const PAPER_HEXES = new Set(['#fff', '#ffffff', 'rgb(255, 255, 255)', 'white']);

/**
 * v0.9.62 — the backdrop painted BEHIND shape text.
 *
 * Three surfaces force a paper under a label rather than letting it sit on
 * the bare canvas: a callout's body, an arrow label's pill, and the inline
 * editor while text is being typed. All three previously hardcoded white,
 * which produced two separate unreadable states:
 *
 *   1. the callout in the DARK theme — its text is painted through
 *      `paintTextColor()`, so ink text becomes pure white while the paper
 *      stayed white. That is the "Test" box reported as impossible to read;
 *   2. any of the three when the user picks the **White** swatch, in the
 *      LIGHT theme — white is deliberately literal (see `paintColor`), so
 *      white text landed on white paper.
 *
 * `--nds-label-paper` is the theme-aware inverse of `--nds-shape-ink` and
 * fixes (1). It cannot fix (2), because the ink there is literal rather than
 * theme-aware — so white ink gets a fixed dark paper in BOTH themes, which is
 * the only backdrop it can ever be read on. Every other colour keeps the
 * theme-aware paper.
 */
export function paperFor(inkColor: string | undefined): string {
  if (inkColor && PAPER_HEXES.has(inkColor.toLowerCase().trim())) {
    return 'rgba(15, 23, 42, 0.94)';
  }
  return 'var(--nds-label-paper)';
}
