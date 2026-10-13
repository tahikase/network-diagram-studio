// Canvas text metrics — how wide a label will actually render.
//
// Why this exists
// ---------------
// Card *height* has always been data-driven (`leafFootprint` adds a row per
// property, a block for notes, a line per wrapped type caption), but the
// *width* was a flat constant: 160px for a bare card, 200px for one with
// detail. Every name longer than roughly twenty characters therefore hit the
// `truncate` class and rendered with an ellipsis — "SWA application servi…",
// "ocisoaiu1nexagg1-k08…", "soai-u1-vnet1-g…". On a diagram generated from a
// case description that is most of the nodes, because real Azure resource
// names are long by convention.
//
// Guessing an average character width does not work here. The names in play
// are a mix of narrow lowercase runs ("iiillll"), wide uppercase ("SWA"),
// digits and hyphens, and a single em-based average is off by 30-40% at both
// extremes — which either truncates anyway or leaves a card half empty. So
// measure for real, with the same 2D text engine that will draw it.
//
// The measurement is cached: the layout packer sizes every node on every
// relayout, and AzureNode re-measures on each render, so the same handful of
// strings is asked for hundreds of times.

/** Matches the `font-family` used by every canvas label. */
const FONT_STACK = 'system-ui, sans-serif';

let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  try {
    ctx = document.createElement('canvas').getContext('2d');
  } catch {
    ctx = null;
  }
  return ctx;
}

const cache = new Map<string, number>();
/** Plenty for a large diagram, and bounded so a long session can't leak. */
const CACHE_MAX = 4000;

/**
 * Fallback used when there is no DOM (unit tests, SSR).
 *
 * Per-character buckets rather than one average: at the sizes cards use, an
 * `i`/`l`/`.` is about a third the width of an `M`/`W`, so a flat factor
 * misjudges an all-caps name and an all-lowercase one in opposite
 * directions. Ratios are em fractions for system-ui at weight 600.
 */
function estimate(text: string, fontPx: number): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.26;
    else if ('iljt.,:;|!\'`'.includes(ch)) em += 0.3;
    else if ('rfI()[]{}/\\-'.includes(ch)) em += 0.37;
    else if (ch >= 'A' && ch <= 'Z') em += 0.68;
    else if ('mw'.includes(ch)) em += 0.85;
    else em += 0.55;
  }
  return em * fontPx;
}

/**
 * Rendered width of `text` in px.
 *
 * `letterSpacing` is an em fraction — pass 0.025 for Tailwind's
 * `tracking-wide`, which the uppercase type caption and field labels use.
 * Canvas `letterSpacing` is not supported everywhere, so it is applied
 * arithmetically instead: one gap per character, matching CSS.
 */
export function measureTextPx(
  text: string,
  fontPx: number,
  weight: 400 | 500 | 600 = 400,
  letterSpacing = 0
): number {
  if (!text) return 0;
  const key = `${weight}|${Math.round(fontPx * 10)}|${letterSpacing}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const c = context();
  let w: number;
  if (c) {
    c.font = `${weight} ${fontPx}px ${FONT_STACK}`;
    w = c.measureText(text).width;
  } else {
    w = estimate(text, fontPx) * (weight >= 600 ? 1.02 : 1);
  }
  if (letterSpacing) w += text.length * fontPx * letterSpacing;

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, w);
  return w;
}

/**
 * How many lines `text` needs at `fontPx` inside `avail` px.
 *
 * This runs a real greedy wrap — the same algorithm the browser uses — because
 * the obvious shortcut is wrong. `Math.ceil(totalWidth / avail)` is the count
 * you'd get if you could break at ANY character; it is a lower bound, not an
 * upper one. When every word is wider than `avail / 2` no two words can share
 * a line, so the true count is the number of words and the shortcut undercounts
 * badly (18 half-width words → 7 predicted, 18 rendered). The result feeds a
 * card-height calculation, so undercounting spills the text out of its card.
 */
export function wrappedLineCount(
  text: string,
  fontPx: number,
  avail: number,
  weight: 400 | 500 | 600 = 400,
  breakLongWords = false
): number {
  if (!text || avail <= 0) return 1;
  if (measureTextPx(text, fontPx, weight) <= avail) return 1;
  // A string with no spaces or hyphens cannot break at all, so it will
  // overflow one line no matter how many notional lines it "needs".
  if (!breakLongWords && !/[\s\-_/.]/.test(text)) return 1;

  const spaceW = measureTextPx(' ', fontPx, weight);
  let lines = 1;
  let lineW = 0;
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    // Browsers may also break *after* a hyphen/slash/underscore/dot, so treat
    // each such run as its own placeable piece (the delimiter stays attached
    // to the piece before the break, exactly as it renders).
    const pieces = word.match(/[^-_/.]*[-_/.]+|[^-_/.]+/g) ?? [word];
    let first = true;
    for (const piece of pieces) {
      const pw = measureTextPx(piece, fontPx, weight);
      // A space only precedes the first piece of a word; the pieces inside a
      // word butt up against each other.
      const gap = lineW > 0 && first ? spaceW : 0;
      if (breakLongWords && pw > avail) {
        if (lineW > 0) { lines++; lineW = 0; }
        let fragment = '';
        for (const character of piece) {
          const next = fragment + character;
          const width = measureTextPx(next, fontPx, weight);
          if (fragment && width > avail) {
            lines++;
            fragment = character;
            lineW = measureTextPx(character, fontPx, weight);
          } else {
            fragment = next;
            lineW = width;
          }
        }
        first = false;
        continue;
      }
      if (lineW > 0 && lineW + gap + pw > avail) {
        lines += 1;
        lineW = pw;
      } else {
        lineW += gap + pw;
      }
      first = false;
    }
  }
  return Math.max(1, lines);
}

/** Nothing is legible below this, so the fit stops here and clips instead. */
export const MIN_FIT_PX = 6;

export interface ParagraphMetrics {
  indentEm: number;
  spaceBefore: number;
  spaceAfter: number;
}

export function measureTextBlock(
  text: string,
  px: number,
  availW: number,
  weight: 400 | 500 | 600 = 500,
  lineHeight = 1.25,
  paragraph?: ParagraphMetrics,
  basePx = px
): { width: number; height: number; indent: number } {
  const indent = Math.min((paragraph?.indentEm ?? 0) * px, Math.max(0, availW - 1));
  const contentWidth = Math.max(1, availW - indent);
  const segments = text.split('\n');
  let lines = 0;
  let width = 0;
  for (const segment of segments) {
    const measured = measureTextPx(segment, px, weight);
    // Unbroken tokens wrap too: the shape uses word-break: break-word.
    lines += Math.max(1, wrappedLineCount(segment, px, contentWidth, weight), Math.ceil(measured / contentWidth));
    width = Math.max(width, Math.min(contentWidth, measured));
  }
  const spacing = ((paragraph?.spaceBefore ?? 0) + (paragraph?.spaceAfter ?? 0)) * px / Math.max(1, basePx);
  return { width, height: lines * px * lineHeight + segments.length * spacing, indent };
}

/**
 * The largest whole-px font size, at most `maxPx`, at which `text` still fits
 * inside `availW × availH`.
 *
 * This is what stops a shape's caption being clipped when the shape is dragged
 * smaller. It is a RENDER-TIME fit: the caller keeps its stored `textSize`, so
 * growing the shape again restores the size the user actually chose.
 *
 * Explicit newlines are honoured because the label renders with
 * `white-space: pre-wrap`.
 */
export function fitFontPx(
  text: string,
  maxPx: number,
  availW: number,
  availH: number,
  weight: 400 | 500 | 600 = 500,
  lineHeight = 1.25,
  paragraph?: ParagraphMetrics
): number {
  if (!text || availW <= 0 || availH <= 0) return maxPx;

  const fits = (px: number): boolean =>
    measureTextBlock(text, px, availW, weight, lineHeight, paragraph, maxPx).height <= availH;

  // The overwhelmingly common case is a shape big enough for its text.
  if (fits(maxPx)) return maxPx;

  let lo = MIN_FIT_PX;
  let hi = Math.floor(maxPx);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
