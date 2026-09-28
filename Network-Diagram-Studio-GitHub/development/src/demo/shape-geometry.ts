// Shape geometry registry — parametric SVG path generators for the
// flowchart / basic shape family (diamond, cylinder, cloud, block
// arrows, ...) that the palette offers alongside the four built-in
// geometric kinds.
//
// WHY THIS EXISTS
// The shape system only understands four kinds: arrow / rect / ellipse
// / callout. Rather than add a fifth kind (which would mean touching
// hit-testing, resize, rotation, text layout, undo and export), a
// "geom" shape is stored as a normal `kind: 'rect'` and simply RENDERS
// a different outline inside its x/y/w/h box. Everything downstream —
// selection, resize handles, rotation, labels, persistence — keeps
// working unchanged because the shape really is a rectangle as far as
// the rest of the app is concerned.
//
// Each geometry has an OUTLINE (one closed path, safe to fill) and an
// optional DETAIL path (the fold on a note, the seam on a cylinder, the
// limbs on a stick figure). Detail is drawn stroke-only — folding it
// into the outline would make filled variants render as solid blobs.
//
// Everything is computed from the bounding box, so shapes stay correct
// at any aspect ratio and no bitmap or external stencil data is used.

/** Rounded to 2dp to keep generated path strings short. */
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Helpers handed to each generator, mapping unit space → world space. */
export interface GeomCtx {
  /** Unit width → world width (for arc radii). */
  W: (u: number) => number;
  /** Unit height → world height (for arc radii). */
  H: (v: number) => number;
  /** Unit point → "x y" pair ready to drop into a path command. */
  P: (u: number, v: number) => string;
}

type GeomBuilder = (c: GeomCtx) => string;

/** Build a closed polygon path from unit-space points. */
function poly(pts: readonly (readonly [number, number])[]): GeomBuilder {
  return (c) =>
    `M ${c.P(pts[0][0], pts[0][1])} ` +
    pts.slice(1).map(([u, v]) => `L ${c.P(u, v)}`).join(' ') +
    ' Z';
}

/** Open polyline through unit-space points (detail lines). */
function line(pts: readonly (readonly [number, number])[]): GeomBuilder {
  return (c) =>
    `M ${c.P(pts[0][0], pts[0][1])} ` +
    pts.slice(1).map(([u, v]) => `L ${c.P(u, v)}`).join(' ');
}

/** Concatenate several builders into one path string. */
function join(...bs: GeomBuilder[]): GeomBuilder {
  return (c) => bs.map((b) => b(c)).join(' ');
}

/** Regular n-gon inscribed in the box, first vertex pointing up. */
function regular(n: number): GeomBuilder {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    pts.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]);
  }
  return poly(pts);
}

/** Star with `n` points, `inner` as a fraction of the outer radius. */
function star(n: number, inner: number): GeomBuilder {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? 0.5 : 0.5 * inner;
    const a = (-90 + (180 / n) * i) * (Math.PI / 180);
    pts.push([0.5 + rad * Math.cos(a), 0.5 + rad * Math.sin(a)]);
  }
  return poly(pts);
}

const BOX = poly([[0, 0], [1, 0], [1, 1], [0, 1]]);

/** Full ellipse inscribed in the box, drawn as two half-arcs. */
const ELLIPSE: GeomBuilder = (c) =>
  `M ${c.P(0, 0.5)} ` +
  `A ${c.W(0.5)} ${c.H(0.5)} 0 1 1 ${c.P(1, 0.5)} ` +
  `A ${c.W(0.5)} ${c.H(0.5)} 0 1 1 ${c.P(0, 0.5)} Z`;

interface Geom {
  outline: GeomBuilder;
  detail?: GeomBuilder;
}

// ---------------------------------------------------------------------------
// The registry. Keys are stable ids persisted inside saved diagrams —
// renaming one silently breaks previously saved shapes, so treat them
// as an on-disk format.
// ---------------------------------------------------------------------------

const GEOMS: Record<string, Geom> = {
  // ----------------------------------------------------- basic polygons
  diamond: { outline: poly([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]) },
  triangle: { outline: poly([[0.5, 0], [1, 1], [0, 1]]) },
  'triangle-right': { outline: poly([[0, 0], [1, 0.5], [0, 1]]) },
  parallelogram: { outline: poly([[0.22, 0], [1, 0], [0.78, 1], [0, 1]]) },
  trapezoid: { outline: poly([[0.2, 0], [0.8, 0], [1, 1], [0, 1]]) },
  'trapezoid-flip': { outline: poly([[0, 0], [1, 0], [0.8, 1], [0.2, 1]]) },
  hexagon: {
    outline: poly([[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]]),
  },
  pentagon: { outline: regular(5) },
  octagon: { outline: regular(8) },
  star5: { outline: star(5, 0.382) },
  star6: { outline: star(6, 0.55) },
  cross: {
    outline: poly([
      [0.33, 0], [0.67, 0], [0.67, 0.33], [1, 0.33], [1, 0.67],
      [0.67, 0.67], [0.67, 1], [0.33, 1], [0.33, 0.67], [0, 0.67],
      [0, 0.33], [0.33, 0.33],
    ]),
  },
  chevron: {
    outline: poly([[0, 0], [0.78, 0], [1, 0.5], [0.78, 1], [0, 1], [0.22, 0.5]]),
  },
  card: { outline: poly([[0.24, 0], [1, 0], [1, 1], [0, 1], [0, 0.24]]) },

  // ----------------------------------------------------- block arrows
  'arrow-right': {
    outline: poly([
      [0, 0.28], [0.62, 0.28], [0.62, 0.04], [1, 0.5],
      [0.62, 0.96], [0.62, 0.72], [0, 0.72],
    ]),
  },
  'arrow-left': {
    outline: poly([
      [1, 0.28], [0.38, 0.28], [0.38, 0.04], [0, 0.5],
      [0.38, 0.96], [0.38, 0.72], [1, 0.72],
    ]),
  },
  'arrow-up': {
    outline: poly([
      [0.28, 1], [0.28, 0.38], [0.04, 0.38], [0.5, 0],
      [0.96, 0.38], [0.72, 0.38], [0.72, 1],
    ]),
  },
  'arrow-down': {
    outline: poly([
      [0.28, 0], [0.28, 0.62], [0.04, 0.62], [0.5, 1],
      [0.96, 0.62], [0.72, 0.62], [0.72, 0],
    ]),
  },
  'arrow-both': {
    outline: poly([
      [0, 0.5], [0.24, 0.06], [0.24, 0.3], [0.76, 0.3], [0.76, 0.06],
      [1, 0.5], [0.76, 0.94], [0.76, 0.7], [0.24, 0.7], [0.24, 0.94],
    ]),
  },

  // ----------------------------------------------------- flowchart
  process: {
    outline: BOX,
    detail: join(line([[0.12, 0], [0.12, 1]]), line([[0.88, 0], [0.88, 1]])),
  },
  'internal-storage': {
    outline: BOX,
    detail: join(line([[0.22, 0], [0.22, 1]]), line([[0, 0.26], [1, 0.26]])),
  },
  'manual-input': { outline: poly([[0, 0.26], [1, 0], [1, 1], [0, 1]]) },
  preparation: {
    outline: poly([[0.18, 0], [0.82, 0], [1, 0.5], [0.82, 1], [0.18, 1], [0, 0.5]]),
  },
  delay: {
    outline: (c) =>
      `M ${c.P(0, 0)} L ${c.P(0.6, 0)} ` +
      `A ${c.W(0.4)} ${c.H(0.5)} 0 0 1 ${c.P(0.6, 1)} L ${c.P(0, 1)} Z`,
  },
  display: {
    outline: (c) =>
      `M ${c.P(0.14, 0)} L ${c.P(0.84, 0)} ` +
      `C ${c.P(1, 0.16)}, ${c.P(1, 0.84)}, ${c.P(0.84, 1)} ` +
      `L ${c.P(0.14, 1)} L ${c.P(0, 0.5)} Z`,
  },
  document: {
    outline: (c) =>
      `M ${c.P(0, 0)} L ${c.P(1, 0)} L ${c.P(1, 0.84)} ` +
      `C ${c.P(0.76, 0.68)}, ${c.P(0.5, 1)}, ${c.P(0.26, 0.88)} ` +
      `C ${c.P(0.14, 0.82)}, ${c.P(0.08, 0.84)}, ${c.P(0, 0.88)} Z`,
  },
  tape: {
    outline: (c) =>
      `M ${c.P(0, 0.18)} C ${c.P(0.26, 0.02)}, ${c.P(0.74, 0.34)}, ${c.P(1, 0.18)} ` +
      `L ${c.P(1, 0.82)} C ${c.P(0.74, 0.98)}, ${c.P(0.26, 0.66)}, ${c.P(0, 0.82)} Z`,
  },
  note: {
    outline: poly([[0, 0], [0.75, 0], [1, 0.25], [1, 1], [0, 1]]),
    detail: line([[0.75, 0], [0.75, 0.25], [1, 0.25]]),
  },
  cube: {
    outline: poly([[0, 0.22], [0.22, 0], [1, 0], [1, 0.78], [0.78, 1], [0, 1]]),
    detail: join(
      line([[0, 0.22], [0.78, 0.22], [1, 0]]),
      line([[0.78, 0.22], [0.78, 1]]),
    ),
  },

  // ----------------------------------------------------- curved
  cylinder: {
    outline: (c) =>
      `M ${c.P(0, 0.14)} A ${c.W(0.5)} ${c.H(0.14)} 0 0 1 ${c.P(1, 0.14)} ` +
      `L ${c.P(1, 0.86)} A ${c.W(0.5)} ${c.H(0.14)} 0 0 1 ${c.P(0, 0.86)} Z`,
    detail: (c) =>
      `M ${c.P(0, 0.14)} A ${c.W(0.5)} ${c.H(0.14)} 0 0 0 ${c.P(1, 0.14)}`,
  },
  database: {
    outline: (c) =>
      `M ${c.P(0, 0.16)} A ${c.W(0.5)} ${c.H(0.16)} 0 0 1 ${c.P(1, 0.16)} ` +
      `L ${c.P(1, 0.84)} A ${c.W(0.5)} ${c.H(0.16)} 0 0 1 ${c.P(0, 0.84)} Z`,
    detail: (c) => [0.16, 0.39, 0.61].map(y =>
      `M ${c.P(0, y)} A ${c.W(0.5)} ${c.H(0.16)} 0 0 0 ${c.P(1, y)}`,
    ).join(' '),
  },
  cloud: {
    outline: (c) =>
      `M ${c.P(0.3, 0.82)} ` +
      `C ${c.P(0.13, 0.82)}, ${c.P(0.04, 0.68)}, ${c.P(0.14, 0.55)} ` +
      `C ${c.P(0.04, 0.4)}, ${c.P(0.18, 0.24)}, ${c.P(0.34, 0.3)} ` +
      `C ${c.P(0.4, 0.14)}, ${c.P(0.64, 0.12)}, ${c.P(0.72, 0.28)} ` +
      `C ${c.P(0.88, 0.26)}, ${c.P(0.98, 0.4)}, ${c.P(0.9, 0.55)} ` +
      `C ${c.P(0.99, 0.7)}, ${c.P(0.88, 0.84)}, ${c.P(0.72, 0.82)} Z`,
  },
  heart: {
    // Retired from the palette in v0.9.33 (decorative, no network meaning).
    // The geometry stays because geom ids are an on-disk format — a diagram
    // saved before v0.9.33 must still render the heart it was drawn with.
    outline: (c) =>
      `M ${c.P(0.5, 0.96)} ` +
      `C ${c.P(0.2, 0.76)}, ${c.P(0.02, 0.56)}, ${c.P(0.02, 0.35)} ` +
      `C ${c.P(0.02, 0.14)}, ${c.P(0.28, 0.04)}, ${c.P(0.5, 0.28)} ` +
      `C ${c.P(0.72, 0.04)}, ${c.P(0.98, 0.14)}, ${c.P(0.98, 0.35)} ` +
      `C ${c.P(0.98, 0.56)}, ${c.P(0.8, 0.76)}, ${c.P(0.5, 0.96)} Z`,
  },
  drop: {
    outline: (c) =>
      `M ${c.P(0.5, 0)} ` +
      `C ${c.P(0.8, 0.3)}, ${c.P(1, 0.5)}, ${c.P(1, 0.68)} ` +
      `C ${c.P(1, 0.87)}, ${c.P(0.78, 1)}, ${c.P(0.5, 1)} ` +
      `C ${c.P(0.22, 1)}, ${c.P(0, 0.87)}, ${c.P(0, 0.68)} ` +
      `C ${c.P(0, 0.5)}, ${c.P(0.2, 0.3)}, ${c.P(0.5, 0)} Z`,
  },
  shield: {
    outline: (c) =>
      `M ${c.P(0.5, 0)} L ${c.P(1, 0.18)} L ${c.P(1, 0.55)} ` +
      `C ${c.P(1, 0.8)}, ${c.P(0.75, 0.95)}, ${c.P(0.5, 1)} ` +
      `C ${c.P(0.25, 0.95)}, ${c.P(0, 0.8)}, ${c.P(0, 0.55)} L ${c.P(0, 0.18)} Z`,
  },
  moon: {
    // Retired from the palette in v0.9.33 alongside `heart`. Geometry kept so
    // pre-v0.9.33 saved diagrams still render — see the note on `heart`.
    outline: (c) =>
      `M ${c.P(0.74, 0.03)} ` +
      `C ${c.P(0.36, 0.1)}, ${c.P(0.12, 0.34)}, ${c.P(0.12, 0.55)} ` +
      `C ${c.P(0.12, 0.8)}, ${c.P(0.38, 0.99)}, ${c.P(0.7, 0.97)} ` +
      `C ${c.P(0.46, 0.84)}, ${c.P(0.33, 0.68)}, ${c.P(0.33, 0.5)} ` +
      `C ${c.P(0.33, 0.3)}, ${c.P(0.49, 0.13)}, ${c.P(0.74, 0.03)} Z`,
  },
  speech: {
    outline: (c) =>
      `M ${c.P(0.08, 0)} L ${c.P(0.92, 0)} Q ${c.P(1, 0)} ${c.P(1, 0.12)} ` +
      `L ${c.P(1, 0.6)} Q ${c.P(1, 0.72)} ${c.P(0.92, 0.72)} ` +
      `L ${c.P(0.44, 0.72)} L ${c.P(0.2, 1)} L ${c.P(0.28, 0.72)} ` +
      `L ${c.P(0.08, 0.72)} Q ${c.P(0, 0.72)} ${c.P(0, 0.6)} ` +
      `L ${c.P(0, 0.12)} Q ${c.P(0, 0)} ${c.P(0.08, 0)} Z`,
  },
  actor: {
    outline: (c) =>
      `M ${c.P(0.36, 0.12)} A ${c.W(0.14)} ${c.H(0.12)} 0 1 0 ${c.P(0.64, 0.12)} ` +
      `A ${c.W(0.14)} ${c.H(0.12)} 0 1 0 ${c.P(0.36, 0.12)} Z`,
    detail: join(
      line([[0.5, 0.24], [0.5, 0.64]]),
      line([[0.14, 0.38], [0.86, 0.38]]),
      line([[0.5, 0.64], [0.18, 1]]),
      line([[0.5, 0.64], [0.82, 1]]),
    ),
  },

  // ----------------------------------------------------- rounded forms
  // A pill / stadium — flowchart "terminator" (Start / End).
  terminator: {
    outline: (c) =>
      `M ${c.P(0.25, 0)} L ${c.P(0.75, 0)} ` +
      `A ${c.W(0.25)} ${c.H(0.5)} 0 0 1 ${c.P(0.75, 1)} ` +
      `L ${c.P(0.25, 1)} ` +
      `A ${c.W(0.25)} ${c.H(0.5)} 0 0 1 ${c.P(0.25, 0)} Z`,
  },
  circle: { outline: ELLIPSE },

  semicircle: {    outline: (c) =>
      `M ${c.P(0, 1)} A ${c.W(0.5)} ${c.H(1)} 0 0 1 ${c.P(1, 1)} Z`,
  },
  'quarter-circle': {
    outline: (c) =>
      `M ${c.P(0, 0)} L ${c.P(0, 1)} L ${c.P(1, 1)} ` +
      `A ${c.W(1)} ${c.H(1)} 0 0 0 ${c.P(0, 0)} Z`,
  },
  // Mirror of `delay` — flat right edge, rounded left.
  'half-round-left': {
    outline: (c) =>
      `M ${c.P(1, 0)} L ${c.P(0.4, 0)} ` +
      `A ${c.W(0.4)} ${c.H(0.5)} 0 0 0 ${c.P(0.4, 1)} L ${c.P(1, 1)} Z`,
  },
  // Home plate pointing right (draw.io "step" without the back notch).
  step: { outline: poly([[0, 0], [0.78, 0], [1, 0.5], [0.78, 1], [0, 1]]) },
  'loop-limit': {
    outline: poly([[0.2, 0], [0.8, 0], [1, 0.2], [1, 1], [0, 1], [0, 0.2]]),
  },

  // ----------------------------------------------------- container frames
  // These read as UI / structure frames: a body plus rule lines. The rules
  // are `detail` so a filled variant stays a clean solid block.
  container: { outline: BOX, detail: line([[0, 0.24], [1, 0.24]]) },
  table: {
    outline: BOX,
    detail: join(line([[0, 0.3], [1, 0.3]]), line([[0.5, 0.3], [0.5, 1]])),
  },
  list: {
    outline: BOX,
    detail: join(
      line([[0, 0.26], [1, 0.26]]),
      line([[0.1, 0.46], [0.9, 0.46]]),
      line([[0.1, 0.64], [0.9, 0.64]]),
      line([[0.1, 0.82], [0.9, 0.82]]),
    ),
  },
  window: {
    outline: BOX,
    detail: join(
      line([[0, 0.22], [1, 0.22]]),
      line([[0.05, 0.08], [0.05, 0.14]]),
      line([[0.1, 0.08], [0.1, 0.14]]),
      line([[0.15, 0.08], [0.15, 0.14]]),
    ),
  },

  // ----------------------------------------------------- brackets
  // Open outlines. They stroke correctly and, because `fill` is still a
  // colour (at zero opacity) rather than `none`, the interior stays
  // hit-testable so the user can grab them anywhere inside the box.
  'bracket-left': {
    outline: (c) =>
      `M ${c.P(0.7, 0)} L ${c.P(0.15, 0)} L ${c.P(0.15, 1)} L ${c.P(0.7, 1)}`,
  },
  'bracket-right': {
    outline: (c) =>
      `M ${c.P(0.3, 0)} L ${c.P(0.85, 0)} L ${c.P(0.85, 1)} L ${c.P(0.3, 1)}`,
  },
  'brace-left': {
    outline: (c) =>
      `M ${c.P(0.85, 0)} C ${c.P(0.5, 0.02)}, ${c.P(0.55, 0.1)}, ${c.P(0.55, 0.35)} ` +
      `C ${c.P(0.55, 0.45)}, ${c.P(0.35, 0.48)}, ${c.P(0.12, 0.5)} ` +
      `C ${c.P(0.35, 0.52)}, ${c.P(0.55, 0.55)}, ${c.P(0.55, 0.65)} ` +
      `C ${c.P(0.55, 0.9)}, ${c.P(0.5, 0.98)}, ${c.P(0.85, 1)}`,
  },
  'brace-right': {
    outline: (c) =>
      `M ${c.P(0.15, 0)} C ${c.P(0.5, 0.02)}, ${c.P(0.45, 0.1)}, ${c.P(0.45, 0.35)} ` +
      `C ${c.P(0.45, 0.45)}, ${c.P(0.65, 0.48)}, ${c.P(0.88, 0.5)} ` +
      `C ${c.P(0.65, 0.52)}, ${c.P(0.45, 0.55)}, ${c.P(0.45, 0.65)} ` +
      `C ${c.P(0.45, 0.9)}, ${c.P(0.5, 0.98)}, ${c.P(0.15, 1)}`,
  },
  's-curve': {
    outline: (c) =>
      `M ${c.P(0.16, 0.96)} C ${c.P(0.95, 0.82)}, ${c.P(0.05, 0.34)}, ${c.P(0.8, 0.14)}`,
    detail: join(
      line([[0.6, 0.08], [0.8, 0.14]]),
      line([[0.63, 0.29], [0.8, 0.14]]),
    ),
  },

  // ----------------------------------------------------- more flowchart
  // Hourglass / bowtie.
  collate: {
    outline: poly([[0, 0], [1, 0], [0.5, 0.5], [1, 1], [0, 1], [0.5, 0.5]]),
  },
  // Both vertical edges curve the same way, unlike `direct-data`.
  'stored-data': {
    outline: (c) =>
      `M ${c.P(0.16, 0)} L ${c.P(0.84, 0)} ` +
      `A ${c.W(0.16)} ${c.H(0.5)} 0 0 1 ${c.P(0.84, 1)} ` +
      `L ${c.P(0.16, 1)} ` +
      `A ${c.W(0.16)} ${c.H(0.5)} 0 0 0 ${c.P(0.16, 0)} Z`,
  },
  // Cylinder on its side.
  'direct-data': {
    outline: (c) =>
      `M ${c.P(0.12, 0)} L ${c.P(0.88, 0)} ` +
      `A ${c.W(0.12)} ${c.H(0.5)} 0 0 1 ${c.P(0.88, 1)} ` +
      `L ${c.P(0.12, 1)} ` +
      `A ${c.W(0.12)} ${c.H(0.5)} 0 0 1 ${c.P(0.12, 0)} Z`,
    detail: (c) =>
      `M ${c.P(0.12, 0)} A ${c.W(0.12)} ${c.H(0.5)} 0 0 1 ${c.P(0.12, 1)}`,
  },
  'sequential-data': { outline: ELLIPSE, detail: line([[0.5, 1], [1, 1]]) },
  merge: { outline: poly([[0, 0], [1, 0], [0.5, 1]]) },
  'off-page': { outline: poly([[0, 0], [1, 0], [1, 0.62], [0.5, 1], [0, 0.62]]) },
  'summing-junction': {
    outline: ELLIPSE,
    detail: join(
      line([[0.146, 0.146], [0.854, 0.854]]),
      line([[0.854, 0.146], [0.146, 0.854]]),
    ),
  },
  'or-gate': {
    outline: ELLIPSE,
    detail: join(line([[0, 0.5], [1, 0.5]]), line([[0.5, 0], [0.5, 1]])),
  },
  sort: { outline: poly([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]), detail: line([[0, 0.5], [1, 0.5]]) },
  'paper-tape': {
    outline: (c) =>
      `M ${c.P(0, 0.14)} C ${c.P(0.25, -0.04)}, ${c.P(0.75, 0.32)}, ${c.P(1, 0.14)} ` +
      `L ${c.P(1, 0.86)} C ${c.P(0.75, 1.04)}, ${c.P(0.25, 0.68)}, ${c.P(0, 0.86)} Z`,
  },
  'multi-document': {
    outline: (c) =>
      `M ${c.P(0, 0.18)} L ${c.P(0.82, 0.18)} L ${c.P(0.82, 0.82)} ` +
      `C ${c.P(0.61, 1)}, ${c.P(0.21, 0.66)}, ${c.P(0, 0.84)} Z`,
    detail: join(
      line([[0.09, 0.18], [0.09, 0.09], [0.91, 0.09], [0.91, 0.72]]),
      line([[0.18, 0.09], [0.18, 0], [1, 0], [1, 0.63]]),
    ),
  },

  // ----------------------------------------------------- network diagram
  // Furniture you draw AROUND or BETWEEN nodes rather than as nodes
  // themselves: zone boundaries, racks, encapsulation, and the status
  // marks a troubleshooting diagram needs (blocked, failed, degraded).
  // The equipment itself lives in the icon palette — see the
  // "On-premises icon set" section of the README. Nothing here
  // duplicates an existing geometry: a horizontal cylinder is already
  // `direct-data` and the bowtie is already `collate`.

  /** Rectangle with a name tab — a VNet / zone / site boundary. */
  'tab-frame': {
    outline: poly([[0, 0], [0.38, 0], [0.38, 0.16], [1, 0.16], [1, 1], [0, 1]]),
    detail: line([[0, 0.16], [0.38, 0.16]]),
  },
  /** 19-inch rack: outer frame, two mounting rails, U markings. */
  'rack-frame': {
    outline: BOX,
    detail: join(
      line([[0.16, 0.04], [0.16, 0.96]]),
      line([[0.84, 0.04], [0.84, 0.96]]),
      ...[0.18, 0.34, 0.5, 0.66, 0.82].flatMap((v) => [
        line([[0.04, v], [0.16, v]]),
        line([[0.84, v], [0.96, v]]),
      ]),
    ),
  },
  /** Encapsulation: an outer pipe, an inner pipe, and a direction. */
  tunnel: {
    outline: (c) =>
      `M ${c.P(0.1, 0)} L ${c.P(0.9, 0)} ` +
      `A ${c.W(0.1)} ${c.H(0.5)} 0 0 1 ${c.P(0.9, 1)} ` +
      `L ${c.P(0.1, 1)} ` +
      `A ${c.W(0.1)} ${c.H(0.5)} 0 0 1 ${c.P(0.1, 0)} Z`,
    detail: join(
      (c) =>
        `M ${c.P(0.17, 0.2)} L ${c.P(0.85, 0.2)} ` +
        `A ${c.W(0.07)} ${c.H(0.3)} 0 0 1 ${c.P(0.85, 0.8)} ` +
        `L ${c.P(0.17, 0.8)} ` +
        `A ${c.W(0.07)} ${c.H(0.3)} 0 0 1 ${c.P(0.17, 0.2)} Z`,
      line([[0.3, 0.5], [0.68, 0.5]]),
      line([[0.58, 0.4], [0.7, 0.5], [0.58, 0.6]]),
    ),
  },
  /** U-turn block arrow — hairpin / NAT loopback / traffic tromboning. */
  hairpin: {
    outline: (c) =>
      `M ${c.P(0, 0.05)} L ${c.P(0.55, 0.05)} ` +
      `A ${c.W(0.45)} ${c.H(0.45)} 0 0 1 ${c.P(0.55, 0.95)} ` +
      `L ${c.P(0.22, 0.95)} L ${c.P(0.22, 1)} L ${c.P(0.02, 0.84)} ` +
      `L ${c.P(0.22, 0.68)} L ${c.P(0.22, 0.73)} L ${c.P(0.55, 0.73)} ` +
      `A ${c.W(0.23)} ${c.H(0.23)} 0 0 0 ${c.P(0.55, 0.27)} ` +
      `L ${c.P(0, 0.27)} Z`,
  },
  /** Bolt — link down, flap, packet loss. */
  lightning: {
    outline: poly([
      [0.56, 0], [0.16, 0.56], [0.44, 0.56], [0.3, 1],
      [0.86, 0.42], [0.56, 0.42], [0.8, 0],
    ]),
  },
  /** Circle-slash — traffic denied. */
  'no-entry': { outline: ELLIPSE, detail: line([[0.15, 0.15], [0.85, 0.85]]) },
  /** Circle-tick — traffic allowed / path verified. */
  'check-badge': { outline: ELLIPSE, detail: line([[0.28, 0.52], [0.44, 0.7], [0.73, 0.32]]) },
  /** Triangle-bang — degraded / misconfigured. */
  'warn-triangle': {
    outline: poly([[0.5, 0], [1, 1], [0, 1]]),
    detail: join(
      line([[0.5, 0.4], [0.5, 0.68]]),
      // A dot has to be a tiny closed diamond: a zero-length segment
      // only renders with a round linecap, which isn't set here.
      poly([[0.5, 0.76], [0.53, 0.8], [0.5, 0.84], [0.47, 0.8]]),
    ),
  },
  /** Box with an X — decommissioned or failed device. */
  'crossed-box': {
    outline: BOX,
    detail: join(line([[0, 0], [1, 1]]), line([[1, 0], [0, 1]])),
  },
  /** Brick wall — a firewall or security boundary you stretch across a path. */
  'brick-wall': {
    outline: BOX,
    detail: join(
      ...[0.25, 0.5, 0.75].map((v) => line([[0, v], [1, v]])),
      ...[0, 0.5].flatMap((base) =>
        [0.34, 0.67].map((u) => line([[u, base], [u, base + 0.25]])),
      ),
      ...[0.25, 0.75].flatMap((base) =>
        [0.17, 0.5, 0.83].map((u) => line([[u, base], [u, base + 0.25]])),
      ),
    ),
  },
  /** Offset rectangles — N identical instances (a scale set, an AZ pair). */
  stack: {
    outline: poly([[0, 0.18], [0.82, 0.18], [0.82, 1], [0, 1]]),
    detail: join(
      line([[0.09, 0.18], [0.09, 0.09], [0.91, 0.09], [0.91, 0.91]]),
      line([[0.18, 0.09], [0.18, 0], [1, 0], [1, 0.82]]),
    ),
  },
  /** Three stacked planes — tiers, or the layers of a stack. */
  layers: {
    outline: poly([[0.2, 0], [1, 0], [0.8, 0.28], [0, 0.28]]),
    detail: join(
      poly([[0.2, 0.36], [1, 0.36], [0.8, 0.64], [0, 0.64]]),
      poly([[0.2, 0.72], [1, 0.72], [0.8, 1], [0, 1]]),
    ),
  },
  /** Span arrow with extension lines — label a distance, latency or bandwidth. */
  dimension: {
    outline: poly([
      [0.06, 0.5], [0.16, 0.38], [0.16, 0.46], [0.84, 0.46], [0.84, 0.38],
      [0.94, 0.5], [0.84, 0.62], [0.84, 0.54], [0.16, 0.54], [0.16, 0.62],
    ]),
    detail: join(line([[0.06, 0.06], [0.06, 0.94]]), line([[0.94, 0.06], [0.94, 0.94]])),
  },
  // Open outlines, same rationale as the bracket family above.
  'bracket-top': {
    outline: (c) =>
      `M ${c.P(0, 0.7)} L ${c.P(0, 0.15)} L ${c.P(1, 0.15)} L ${c.P(1, 0.7)}`,
  },
  'bracket-bottom': {
    outline: (c) =>
      `M ${c.P(0, 0.3)} L ${c.P(0, 0.85)} L ${c.P(1, 0.85)} L ${c.P(1, 0.3)}`,
  },
  /** Corner marks only — scope a region without a heavy border. */
  'region-frame': {
    outline: join(
      line([[0, 0.28], [0, 0], [0.28, 0]]),
      line([[0.72, 0], [1, 0], [1, 0.28]]),
      line([[1, 0.72], [1, 1], [0.72, 1]]),
      line([[0.28, 1], [0, 1], [0, 0.72]]),
    ),
  },

  // ----------------------------------------------------- more block arrows
  'arrow-quad': {
    outline: poly([
      [0.5, 0], [0.7, 0.2], [0.58, 0.2], [0.58, 0.42], [0.8, 0.42], [0.8, 0.3],
      [1, 0.5], [0.8, 0.7], [0.8, 0.58], [0.58, 0.58], [0.58, 0.8], [0.7, 0.8],
      [0.5, 1], [0.3, 0.8], [0.42, 0.8], [0.42, 0.58], [0.2, 0.58], [0.2, 0.7],
      [0, 0.5], [0.2, 0.3], [0.2, 0.42], [0.42, 0.42], [0.42, 0.2], [0.3, 0.2],
    ]),
  },
  /** Bent arrow — up the left side, then away to the right. */
  'arrow-corner': {
    outline: poly([
      [0.06, 1], [0.06, 0.06], [0.72, 0.06], [0.72, 0], [1, 0.18],
      [0.72, 0.36], [0.72, 0.3], [0.3, 0.3], [0.3, 1],
    ]),
  },
  'arrow-notched': {
    outline: poly([
      [0, 0.28], [0.62, 0.28], [0.62, 0.04], [1, 0.5], [0.62, 0.96],
      [0.62, 0.72], [0, 0.72], [0.14, 0.5],
    ]),
  },
  /** Home plate — the head of a chevron chain. */
  'arrow-pentagon': { outline: poly([[0, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0, 1]]) },
  'arrow-curved': {
    outline: (c) =>
      `M ${c.P(0, 1)} ` +
      `C ${c.P(0, 0.3)}, ${c.P(0.3, 0.06)}, ${c.P(0.74, 0.06)} ` +
      `L ${c.P(0.74, 0)} L ${c.P(1, 0.2)} L ${c.P(0.74, 0.4)} L ${c.P(0.74, 0.34)} ` +
      `C ${c.P(0.42, 0.34)}, ${c.P(0.26, 0.5)}, ${c.P(0.26, 1)} Z`,
  },

  // ----------------------------------------------------- more basics
  cone: {
    outline: (c) =>
      `M ${c.P(0.5, 0)} L ${c.P(1, 0.82)} ` +
      `A ${c.W(0.5)} ${c.H(0.18)} 0 0 1 ${c.P(0, 0.82)} Z`,
    detail: (c) => `M ${c.P(0, 0.82)} A ${c.W(0.5)} ${c.H(0.18)} 0 0 0 ${c.P(1, 0.82)}`,
  },
  pyramid: {
    outline: poly([[0.5, 0], [1, 1], [0, 1]]),
    detail: join(line([[0.5, 0], [0.68, 0.84]]), line([[0, 1], [0.68, 0.84], [1, 1]])),
  },
  'right-triangle': { outline: poly([[0, 0], [1, 1], [0, 1]]) },
  /** Rectangle with concave corners. */
  plaque: {
    outline: (c) =>
      `M ${c.P(0.16, 0)} L ${c.P(0.84, 0)} ` +
      `A ${c.W(0.16)} ${c.H(0.16)} 0 0 0 ${c.P(1, 0.16)} ` +
      `L ${c.P(1, 0.84)} A ${c.W(0.16)} ${c.H(0.16)} 0 0 0 ${c.P(0.84, 1)} ` +
      `L ${c.P(0.16, 1)} A ${c.W(0.16)} ${c.H(0.16)} 0 0 0 ${c.P(0, 0.84)} ` +
      `L ${c.P(0, 0.16)} A ${c.W(0.16)} ${c.H(0.16)} 0 0 0 ${c.P(0.16, 0)} Z`,
  },
  frame: {
    outline: BOX,
    detail: poly([[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88]]),
  },
  /** Quarter ring — a curved band for elbow routes. */
  arc: {
    outline: (c) =>
      `M ${c.P(0, 1)} A ${c.W(1)} ${c.H(1)} 0 0 0 ${c.P(1, 0)} ` +
      `L ${c.P(0.72, 0)} A ${c.W(0.72)} ${c.H(0.72)} 0 0 1 ${c.P(0, 0.72)} Z`,
  },
  corner: { outline: poly([[0, 0], [0.4, 0], [0.4, 0.6], [1, 0.6], [1, 1], [0, 1]]) },
  tee: {
    outline: poly([
      [0, 0], [1, 0], [1, 0.4], [0.68, 0.4], [0.68, 1], [0.32, 1], [0.32, 0.4], [0, 0.4],
    ]),
  },
};

/** A registered geometry id, e.g. `'diamond'`. */
export type ShapeGeomId = string;

/** Is this a known geometry id? */
export function isGeomId(id: string | undefined): id is ShapeGeomId {
  return !!id && Object.prototype.hasOwnProperty.call(GEOMS, id);
}

function ctxFor(x: number, y: number, w: number, h: number): GeomCtx {
  return {
    W: (u) => r2(Math.abs(u * w)),
    H: (v) => r2(Math.abs(v * h)),
    P: (u, v) => `${r2(x + u * w)} ${r2(y + v * h)}`,
  };
}

/**
 * Build the fillable outline path for a geometry inside the given box.
 * Returns `null` for unknown ids so callers fall back to a plain
 * rectangle — important for forwards-compatibility with diagrams saved
 * by a newer build that knows geometries this one does not.
 */
export function geomPath(
  id: string | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  if (!isGeomId(id)) return null;
  return GEOMS[id].outline(ctxFor(x, y, w, h));
}

/**
 * Build the stroke-only detail path (note fold, cylinder seam, stick
 * figure limbs). Returns `null` when the geometry has no detail.
 */
export function geomDetailPath(
  id: string | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  if (!isGeomId(id)) return null;
  const d = GEOMS[id].detail;
  return d ? d(ctxFor(x, y, w, h)) : null;
}

/** Every registered geometry id, in registration order. */
export const GEOM_IDS: readonly string[] = Object.keys(GEOMS);
