// v0.9.67 — the annotation model for a captured screenshot, and the one
// routine that draws it.
//
// ONE RENDERER, TWO CALLERS. `paintScene` is used both for the live editor
// canvas and for the flattened PNG that ends up in the note. That is not a
// tidiness preference — a second "export" renderer is how annotation tools end
// up shipping a picture that does not match what the user drew. Anything that
// must appear on screen but NOT in the file (selection handles) is drawn by
// `paintHandles`, which the export simply never calls.
//
// COORDINATES ARE BASE-IMAGE PIXELS, never screen pixels. The editor shows the
// capture scaled to fit a modal, and that scale changes with the window; if
// shapes were stored in display units every resize would move them. Callers
// convert once, at the pointer boundary, via `toImageSpace`.
//
// WHAT IS DESTRUCTIVE AND WHAT IS NOT
// Blur and crop are applied to the bitmap immediately and cannot be undone by
// deleting a shape — only by Undo, which restores the previous bitmap. Every
// other tool is a shape in a list and stays editable forever. That split is
// deliberate: a redaction that is "just a layer" is recoverable by anyone who
// opens the file, which makes it worse than no redaction at all, because it
// looks safe. Subscription IDs and tenant names get destroyed, not covered.

import { INK_HEX } from '../theme/palette';
import { MIN_FIT_PX } from '../model/text-metrics';

export type ShapeKind =
  | 'arrow' | 'rect' | 'ellipse' | 'highlight' | 'text' | 'counter' | 'callout';

export interface ShapeBase {
  id: string;
  kind: ShapeKind;
  color: string;
}

export interface ArrowShape extends ShapeBase {
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface BoxShape extends ShapeBase {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  width: number;
}

export interface EllipseShape extends ShapeBase {
  kind: 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  width: number;
}

/**
 * A bubble carrying text, with a tail that points somewhere else entirely.
 * The tail tip is a free point rather than an offset, so the bubble can sit in
 * white space and still name the thing it is about — which is the whole reason
 * to prefer it over a bare text label.
 */
export interface CalloutShape extends ShapeBase {
  kind: 'callout';
  x: number;
  y: number;
  w: number;
  h: number;
  tx: number;
  ty: number;
  text: string;
  size: number;
  fontSize?: number;
  width: number;
}

export interface HighlightShape extends ShapeBase {
  kind: 'highlight';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextShape extends ShapeBase {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  size: number;
  fontSize?: number;
}

export interface CounterShape extends ShapeBase {
  kind: 'counter';
  x: number;
  y: number;
  n: number;
  size: number;
  fontSize?: number;
}

export type Shape =
  | ArrowShape | BoxShape | EllipseShape | HighlightShape
  | TextShape | CounterShape | CalloutShape;

export function hasTextSize(s: Shape | undefined): s is TextShape | CounterShape | CalloutShape {
  return s?.kind === 'text' || s?.kind === 'counter' || s?.kind === 'callout';
}

export function annotationTextSize(s: TextShape | CounterShape | CalloutShape): number {
  return s.fontSize ?? (s.kind === 'counter' ? s.size * 0.82 : s.size);
}

/** Shapes stored as an axis-aligned box, and therefore resized the same way. */
export type BoxyShape = BoxShape | EllipseShape | HighlightShape | CalloutShape;

export function isBoxy(s: Shape): s is BoxyShape {
  return s.kind === 'rect' || s.kind === 'ellipse' || s.kind === 'highlight'
    || s.kind === 'callout';
}

/** Tools the editor offers. `select` and `blur`/`crop` are modes, not shapes. */
export type EditorTool = 'select' | ShapeKind | 'blur' | 'crop';

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

// Expressed in base-image pixels. A capture is rendered at CAPTURE_RATIO = 2,
// so `md` thickness of 8 reads as a 4px line at the size the user was looking
// at when they took the shot.
export const THICKNESS = { sm: 4, md: 8, lg: 14 } as const;
export const FONT_SIZE = { sm: 24, md: 36, lg: 56 } as const;
export type SizeKey = keyof typeof THICKNESS;

export const HIGHLIGHT_HEX = '#fde047';

let seq = 0;
export function shapeId(): string {
  seq += 1;
  return `s${Date.now().toString(36)}${seq.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function normBox(ax: number, ay: number, bx: number, by: number): Box {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
}

/** Axis-aligned bounds of any shape, used for hit-testing and selection. */
export function boundsOf(s: Shape, ctx?: CanvasRenderingContext2D): Box {
  switch (s.kind) {
    case 'arrow': {
      const pad = s.width * 2;
      const b = normBox(s.x1, s.y1, s.x2, s.y2);
      return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
    }
    case 'rect':
    case 'ellipse':
    case 'highlight':
    case 'callout':
      return { x: s.x, y: s.y, w: s.w, h: s.h };
    case 'text': {
      const lines = s.text.split('\n');
      const size = annotationTextSize(s);
      let wide = 0;
      if (ctx) {
        ctx.save();
        ctx.font = textFont(size);
        for (const ln of lines) wide = Math.max(wide, ctx.measureText(ln).width);
        ctx.restore();
      } else {
        // Rough fallback when no context is to hand; only used for hit tests
        // before the first paint.
        for (const ln of lines) wide = Math.max(wide, ln.length * size * 0.55);
      }
      return { x: s.x, y: s.y, w: Math.max(wide, size), h: lines.length * size * 1.25 };
    }
    case 'counter': {
      const r = s.size * 0.75;
      return { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
    }
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Topmost shape under a point, or null.
 *
 * Iterated back to front because later shapes paint over earlier ones, so the
 * one the user can see is the one they mean.
 */
export function hitTest(shapes: Shape[], x: number, y: number, ctx?: CanvasRenderingContext2D): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const s = shapes[i];
    if (s.kind === 'arrow') {
      if (distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= Math.max(s.width, 10)) return s;
      continue;
    }
    if (s.kind === 'rect') {
      // A box is hollow: clicking the middle of one that frames a resource
      // should not grab it, or the frame becomes impossible to draw around.
      const t = Math.max(s.width, 10);
      const outer = { x: s.x - t, y: s.y - t, w: s.w + t * 2, h: s.h + t * 2 };
      const inner = { x: s.x + t, y: s.y + t, w: s.w - t * 2, h: s.h - t * 2 };
      if (inBox(outer, x, y) && !inBox(inner, x, y)) return s;
      continue;
    }
    if (s.kind === 'ellipse') {
      // Hollow too, measured on the ring rather than the bounding box.
      const rx = Math.max(s.w / 2, 1);
      const ry = Math.max(s.h / 2, 1);
      const nx = (x - (s.x + rx)) / rx;
      const ny = (y - (s.y + ry)) / ry;
      const d = Math.hypot(nx, ny);
      const tol = Math.max(s.width, 12) / Math.max(Math.min(rx, ry), 1);
      if (Math.abs(d - 1) <= tol) return s;
      continue;
    }
    if (s.kind === 'callout') {
      if (inBox(boundsOf(s), x, y)) return s;
      if (Math.hypot(x - s.tx, y - s.ty) <= 18) return s;
      continue;
    }
    if (inBox(boundsOf(s, ctx), x, y)) return s;
  }
  return null;
}

export function inBox(b: Box, x: number, y: number): boolean {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

/** Move a shape by a delta, whatever its coordinate shape. */
export function translated(s: Shape, dx: number, dy: number): Shape {
  if (s.kind === 'arrow') return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
  // A callout's tail travels with its bubble, or dragging the bubble would
  // silently re-point it at something it is not about.
  if (s.kind === 'callout') {
    return { ...s, x: s.x + dx, y: s.y + dy, tx: s.tx + dx, ty: s.ty + dy };
  }
  return { ...s, x: s.x + dx, y: s.y + dy } as Shape;
}

// ---------------------------------------------------------------------------
// Resizing
// ---------------------------------------------------------------------------

/**
 * Handle names. The box handles are compass points, so which edges a handle
 * moves can be read straight off the letters ('nw' moves north and west).
 */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'p1' | 'p2' | 'tail';

export interface HandlePoint {
  id: HandleId;
  x: number;
  y: number;
}

const BOX_HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Smallest box a resize may produce, in base-image pixels. */
const MIN_BOX = 12;

/**
 * The grab points for a shape.
 *
 * Text and counters have none: they are anchored points whose size comes from
 * the S/M/L control, so a corner drag would have nothing to change.
 */
export function handlesOf(s: Shape): HandlePoint[] {
  if (s.kind === 'arrow') {
    return [{ id: 'p1', x: s.x1, y: s.y1 }, { id: 'p2', x: s.x2, y: s.y2 }];
  }
  if (!isBoxy(s)) return [];
  const out: HandlePoint[] = BOX_HANDLES.map((id) => {
    const x = id.includes('w') ? s.x : id.includes('e') ? s.x + s.w : s.x + s.w / 2;
    const y = id.includes('n') ? s.y : id.includes('s') ? s.y + s.h : s.y + s.h / 2;
    return { id, x, y };
  });
  if (s.kind === 'callout') out.push({ id: 'tail', x: s.tx, y: s.ty });
  return out;
}

/** The handle under a point, or null. `slop` is in base-image pixels. */
export function handleAt(s: Shape, x: number, y: number, slop: number): HandleId | null {
  for (const h of handlesOf(s)) {
    if (Math.abs(x - h.x) <= slop && Math.abs(y - h.y) <= slop) return h.id;
  }
  return null;
}

/** Snap a point to the nearest 45° ray from an anchor. */
export function snapAngle(ax: number, ay: number, px: number, py: number): { x: number; y: number } {
  const dx = px - ax;
  const dy = py - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { x: px, y: py };
  const step = Math.PI / 4;
  const ang = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: ax + Math.cos(ang) * len, y: ay + Math.sin(ang) * len };
}

/** Force a drag from an anchor into a square, keeping the pointer's quadrant. */
export function snapSquare(ax: number, ay: number, px: number, py: number): { x: number; y: number } {
  const side = Math.max(Math.abs(px - ax), Math.abs(py - ay));
  return {
    x: ax + (px < ax ? -side : side),
    y: ay + (py < ay ? -side : side),
  };
}

/**
 * Apply a handle drag.
 *
 * `from` is the shape as it was when the gesture started, so a drag that
 * crosses over the opposite edge flips cleanly instead of accumulating error.
 */
export function resized(from: Shape, h: HandleId, x: number, y: number, square = false): Shape {
  if (from.kind === 'arrow') {
    if (h === 'p1') {
      const p = square ? snapAngle(from.x2, from.y2, x, y) : { x, y };
      return { ...from, x1: p.x, y1: p.y };
    }
    if (h === 'p2') {
      const p = square ? snapAngle(from.x1, from.y1, x, y) : { x, y };
      return { ...from, x2: p.x, y2: p.y };
    }
    return from;
  }
  if (!isBoxy(from)) return from;
  if (h === 'tail' && from.kind === 'callout') return { ...from, tx: x, ty: y };
  if (!BOX_HANDLES.includes(h)) return from;

  let x0 = from.x;
  let y0 = from.y;
  let x1 = from.x + from.w;
  let y1 = from.y + from.h;
  if (square && h.length === 2) {
    const ax = h.includes('w') ? x1 : x0;
    const ay = h.includes('n') ? y1 : y0;
    const p = snapSquare(ax, ay, x, y);
    x = p.x;
    y = p.y;
  }
  if (h.includes('w')) x0 = x;
  if (h.includes('e')) x1 = x;
  if (h.includes('n')) y0 = y;
  if (h.includes('s')) y1 = y;
  const b = normBox(x0, y0, x1, y1);
  return {
    ...from,
    x: b.x,
    y: b.y,
    w: Math.max(b.w, MIN_BOX),
    h: Math.max(b.h, MIN_BOX),
  } as Shape;
}

// ---------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------

export function textFont(size: number): string {
  return `600 ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
}

function paintArrow(ctx: CanvasRenderingContext2D, s: ArrowShape): void {
  const head = Math.max(s.width * 3.2, 14);
  const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  // The shaft stops short of the tip so the stroke's round cap does not poke
  // out of the side of the head.
  const bx = s.x2 - Math.cos(ang) * head * 0.85;
  const by = s.y2 - Math.sin(ang) * head * 0.85;

  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(s.x2, s.y2);
  ctx.lineTo(s.x2 - Math.cos(ang - 0.42) * head, s.y2 - Math.sin(ang - 0.42) * head);
  ctx.lineTo(s.x2 - Math.cos(ang + 0.42) * head, s.y2 - Math.sin(ang + 0.42) * head);
  ctx.closePath();
  ctx.fill();
}

function paintText(ctx: CanvasRenderingContext2D, s: TextShape): void {
  const size = annotationTextSize(s);
  ctx.font = textFont(size);
  ctx.textBaseline = 'top';
  ctx.fillStyle = s.color;
  // A thin halo in the opposite luminance keeps a callout readable over both
  // a white card and a dark canvas without the user having to think about it.
  ctx.strokeStyle = isDark(s.color) ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)';
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineJoin = 'round';
  const lines = s.text.split('\n');
  lines.forEach((ln, i) => {
    const y = s.y + i * size * 1.25;
    if (ln) {
      ctx.strokeText(ln, s.x, y);
      ctx.fillText(ln, s.x, y);
    }
  });
}

function paintCounter(ctx: CanvasRenderingContext2D, s: CounterShape): void {
  const r = s.size * 0.75;
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.fillStyle = s.color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.strokeStyle = isDark(s.color) ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.85)';
  ctx.stroke();
  const label = String(s.n);
  const preferredSize = annotationTextSize(s);
  ctx.font = textFont(preferredSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(label);
  const halfWidth = Math.max(metrics.width / 2, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxRight);
  const halfHeight = Math.max(metrics.actualBoundingBoxAscent, metrics.actualBoundingBoxDescent);
  const availableRadius = Math.max(1, r - ctx.lineWidth / 2 - 2 - r * 0.04);
  const fit = Math.min(1, availableRadius / Math.max(1, Math.hypot(halfWidth, halfHeight)));
  ctx.font = textFont(preferredSize * fit);
  ctx.fillStyle = isDark(s.color) ? '#ffffff' : '#0f172a';
  ctx.fillText(label, s.x, s.y + r * 0.04);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

/** Perceived luminance, used to pick a contrasting halo. */
export function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

/**
 * Rounded-rectangle path, written out rather than using `ctx.roundRect`.
 * `roundRect` is recent enough that a browser without it would throw mid-paint
 * and lose the whole picture, and the arc version costs four lines.
 */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Wrap words and unbroken identifiers without splitting Unicode graphemes. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r\n?/g, '\n').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
      if (line) { out.push(line); line = ''; }
      if (ctx.measureText(word).width <= maxWidth) { line = word; continue; }
      for (const { segment } of graphemes.segment(word)) {
        if (line && ctx.measureText(line + segment).width > maxWidth) {
          out.push(line);
          line = segment;
        } else line += segment;
      }
    }
    out.push(line);
  }
  return out;
}

function calloutTextLayout(ctx: CanvasRenderingContext2D, s: CalloutShape) {
  const pad = Math.max(s.width / 2 + 1, Math.min(Math.max(10, s.width * 2), Math.min(s.w, s.h) / 3));
  const availableWidth = Math.max(0, s.w - pad * 2);
  const availableHeight = Math.max(0, s.h - pad * 2);
  const measure = (size: number) => {
    ctx.font = textFont(size);
    const lines = wrapText(ctx, s.text, availableWidth);
    let ascent = size * 0.8, descent = size * 0.2, width = 0;
    for (const line of lines) {
      const m = ctx.measureText(line);
      width = Math.max(width, m.width, m.actualBoundingBoxLeft * 2, m.actualBoundingBoxRight * 2);
      ascent = Math.max(ascent, m.actualBoundingBoxAscent);
      descent = Math.max(descent, m.actualBoundingBoxDescent);
    }
    const step = Math.max(size * 1.22, ascent + descent);
    return { size, lines, ascent, step, width, height: ascent + descent + (lines.length - 1) * step };
  };
  const fits = (layout: ReturnType<typeof measure>) =>
    layout.width <= availableWidth && layout.height <= availableHeight;
  const preferredSize = annotationTextSize(s);
  let layout = measure(preferredSize);
  if (!fits(layout)) {
    let low = Math.min(MIN_FIT_PX, preferredSize), high = preferredSize;
    layout = measure(low);
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const next = measure(mid);
      if (fits(next)) { layout = next; low = mid; }
      else high = mid;
    }
  }
  return { ...layout, pad, availableWidth, availableHeight };
}

function paintEllipse(ctx: CanvasRenderingContext2D, s: EllipseShape): void {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w / 2, 1), Math.max(s.h / 2, 1), 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * The bubble, its tail, and the text inside.
 *
 * Fill and ink are derived from the chosen colour rather than being separate
 * settings: a white border on a white bubble is invisible, and making the user
 * responsible for avoiding that is making them do the machine's job.
 */
function paintCallout(ctx: CanvasRenderingContext2D, s: CalloutShape): void {
  const light = !isDark(s.color);
  const fill = light ? '#0f172a' : '#ffffff';
  const ink = light ? '#ffffff' : '#0f172a';
  const r = Math.min(18, s.w / 3, s.h / 3);
  const half = Math.max(10, Math.min(Math.min(s.w, s.h) * 0.2, 34));

  // Which edge does the tail leave from? Whichever one faces the tip.
  const overX = s.tx < s.x ? s.x - s.tx : s.tx > s.x + s.w ? s.tx - (s.x + s.w) : 0;
  const overY = s.ty < s.y ? s.y - s.ty : s.ty > s.y + s.h ? s.ty - (s.y + s.h) : 0;
  const vertical = overY >= overX;
  const hasTail = overX > 0 || overY > 0;
  let a: { x: number; y: number };
  let b: { x: number; y: number };
  if (vertical) {
    const edgeY = s.ty < s.y + s.h / 2 ? s.y : s.y + s.h;
    const cx = Math.max(s.x + r + half, Math.min(s.tx, s.x + s.w - r - half));
    a = { x: cx - half, y: edgeY };
    b = { x: cx + half, y: edgeY };
  } else {
    const edgeX = s.tx < s.x + s.w / 2 ? s.x : s.x + s.w;
    const cy = Math.max(s.y + r + half, Math.min(s.ty, s.y + s.h - r - half));
    a = { x: edgeX, y: cy - half };
    b = { x: edgeX, y: cy + half };
  }

  ctx.lineJoin = 'round';
  ctx.fillStyle = fill;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;

  if (hasTail) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(s.tx, s.ty);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  roundRectPath(ctx, s.x, s.y, s.w, s.h, r);
  ctx.fill();
  ctx.stroke();

  // Erase the bubble border where the tail joins it, so the two read as one
  // outline rather than a triangle stuck onto a box.
  if (hasTail) {
    ctx.beginPath();
    ctx.moveTo(a.x + (vertical ? 3 : 0), a.y + (vertical ? 0 : 3));
    ctx.lineTo(b.x - (vertical ? 3 : 0), b.y - (vertical ? 0 : 3));
    ctx.strokeStyle = fill;
    ctx.lineWidth = s.width + 2;
    ctx.stroke();
  }

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const layout = calloutTextLayout(ctx, s);
  ctx.font = textFont(layout.size);
  const top = s.y + (s.h - layout.height) / 2 + layout.ascent;
  // A final guard for boxes too small even at the shared minimum font size.
  ctx.save();
  ctx.beginPath();
  ctx.rect(s.x + layout.pad, s.y + layout.pad, layout.availableWidth, layout.availableHeight);
  ctx.clip();
  layout.lines.forEach((ln, i) => ctx.fillText(ln, s.x + s.w / 2, top + i * layout.step));
  ctx.restore();
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function paintShape(ctx: CanvasRenderingContext2D, s: Shape): void {
  ctx.save();
  switch (s.kind) {
    case 'highlight':
      // `multiply` is what makes this a highlighter rather than a coloured
      // sheet: yellow over white stays yellow, and the black text underneath
      // stays black instead of going muddy.
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      break;
    case 'rect':
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineJoin = 'round';
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      break;
    case 'ellipse':
      paintEllipse(ctx, s);
      break;
    case 'callout':
      paintCallout(ctx, s);
      break;
    case 'arrow':
      paintArrow(ctx, s);
      break;
    case 'text':
      paintText(ctx, s);
      break;
    case 'counter':
      paintCounter(ctx, s);
      break;
  }
  ctx.restore();
}

/**
 * The whole picture: bitmap, then every shape in order.
 *
 * This is the function whose output is the file. `paintHandles` is separate so
 * that the export physically cannot include them.
 */
export function paintScene(ctx: CanvasRenderingContext2D, base: HTMLCanvasElement, shapes: Shape[]): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, base.width, base.height);
  ctx.drawImage(base, 0, 0);
  for (const s of shapes) paintShape(ctx, s);
}

/** Selection chrome, drawn on the live canvas only. `scale` keeps it a constant size on screen. */
export function paintHandles(ctx: CanvasRenderingContext2D, s: Shape, scale: number): void {
  const b = boundsOf(s, ctx);
  const pad = 6 / scale;
  ctx.save();
  ctx.setLineDash([6 / scale, 4 / scale]);
  ctx.lineWidth = 1.5 / scale;
  ctx.strokeStyle = '#0ea5e9';
  ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
  ctx.setLineDash([]);

  // Grab points. The tail tip is a circle rather than a square so it reads as
  // a different kind of thing from the eight that resize the bubble.
  const half = 5 / scale;
  ctx.lineWidth = 2 / scale;
  for (const h of handlesOf(s)) {
    ctx.beginPath();
    if (h.id === 'tail') ctx.arc(h.x, h.y, half * 1.3, 0, Math.PI * 2);
    else ctx.rect(h.x - half, h.y - half, half * 2, half * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Destructive operations
// ---------------------------------------------------------------------------

export function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvasOf(src.width, src.height);
  c.getContext('2d')?.drawImage(src, 0, 0);
  return c;
}

/**
 * Pixelate a region, irreversibly.
 *
 * Downscale-then-upscale with smoothing off, rather than a `ctx.filter` blur:
 * a Gaussian blur of readable text is famously reversible, and `filter` is not
 * supported identically across browsers. Averaged blocks throw the information
 * away for good.
 */
export function pixelateRegion(base: HTMLCanvasElement, r: Box): HTMLCanvasElement {
  const x = Math.max(0, Math.round(r.x));
  const y = Math.max(0, Math.round(r.y));
  const w = Math.min(Math.round(r.w), base.width - x);
  const h = Math.min(Math.round(r.h), base.height - y);
  if (w < 2 || h < 2) return base;

  const out = cloneCanvas(base);
  const ctx = out.getContext('2d');
  if (!ctx) return base;

  const block = Math.max(4, Math.round(Math.min(w, h) / 8));
  const tw = Math.max(1, Math.round(w / block));
  const th = Math.max(1, Math.round(h / block));
  const tmp = canvasOf(tw, th);
  const tctx = tmp.getContext('2d');
  if (!tctx) return base;

  tctx.drawImage(base, x, y, w, h, 0, 0, tw, th);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(x, y, w, h);
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
  return out;
}

/** Trim the bitmap and bring the shapes with it. */
export function cropScene(
  base: HTMLCanvasElement,
  shapes: Shape[],
  r: Box,
): { base: HTMLCanvasElement; shapes: Shape[] } {
  const x = Math.max(0, Math.round(r.x));
  const y = Math.max(0, Math.round(r.y));
  const w = Math.min(Math.round(r.w), base.width - x);
  const h = Math.min(Math.round(r.h), base.height - y);
  if (w < 8 || h < 8) return { base, shapes };

  const out = canvasOf(w, h);
  const ctx = out.getContext('2d');
  if (!ctx) return { base, shapes };
  ctx.drawImage(base, x, y, w, h, 0, 0, w, h);

  // Shapes entirely outside the new frame are dropped rather than left
  // hovering off-canvas where they can never be selected again.
  const moved = shapes
    .map((s) => translated(s, -x, -y))
    .filter((s) => {
      const b = boundsOf(s);
      return b.x + b.w > 0 && b.y + b.h > 0 && b.x < w && b.y < h;
    });
  return { base: out, shapes: moved };
}

// ---------------------------------------------------------------------------
// Flattening
// ---------------------------------------------------------------------------

export function decodeToCanvas(dataUrl: string): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = canvasOf(img.width, img.height);
      c.getContext('2d')?.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Burn shapes into the bitmap and return a PNG data URL.
 *
 * Used by the editor on commit AND at load time, so a note that was written on
 * another machine shows its annotations even in a build with the editor turned
 * off. That is why this module has no dependency on the editor UI or the
 * feature flag.
 */
export async function flattenToPng(basePng: string, shapes: Shape[]): Promise<string | null> {
  if (!shapes.length) return basePng;
  const base = await decodeToCanvas(basePng);
  if (!base) return null;
  const out = canvasOf(base.width, base.height);
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  paintScene(ctx, base, shapes);
  return out.toDataURL('image/png');
}

export const DEFAULT_COLOR = '#dc2626';
export const FALLBACK_COLOR = INK_HEX;

/**
 * The plate colour behind the screenshot feature's floating chips — the
 * capture hint, the size readout and the editor's toast. Written literally
 * rather than as a `bg-slate-900` class, for two reasons.
 *
 * First, the theme remaps the whole slate scale for dark mode rather than
 * relying on `dark:` variants, so in dark mode `slate-900` resolves to
 * #f1f5fa — near white. `text-white` is NOT remapped, so `bg-slate-900
 * text-white` reads white-on-white the moment the theme flips. That was a
 * real bug: the capture hint was unreadable in dark mode.
 *
 * Second, these chips float over a dimmed screenshot. They must stay a dark
 * plate in BOTH themes; they are not a surface that should follow the theme.
 */
export const PLATE = 'rgba(15,23,42,0.95)';
