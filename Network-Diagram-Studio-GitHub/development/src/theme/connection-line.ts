// v0.9.30 — the in-flight connection line, shared by BOTH ways of starting a
// connection so they cannot drift apart:
//
//   • a resource card's handle → React Flow draws it, from `connectionLineStyle`
//   • a shape's connect anchor  → ShapeOverlay draws it, with the same values
//
// React Flow's own default (`--xy-connectionline-stroke: #b1b1b7`, 1px) is too
// faint to follow — reported as "the user doesn't see the line when attempting
// to connect". The stroke is a CSS variable so dark mode brightens it without a
// React re-render, exactly like every edge stroke in `canvas/edge-styles.ts`.
//
// This lives in `theme/` rather than in the demo overlay because the prod
// bundle's Canvas needs it too, and importing from `demo/` would drag the
// drawing-tool state machine into production.

export const CONNECTION_LINE_COLOR = 'var(--nds-connection-line)';

/**
 * Stroke width, in WORLD units — i.e. it scales with zoom.
 *
 * React Flow's connection line svg is a child of `.react-flow__viewport`, so
 * its `stroke-width: 2` is already scaled by the viewport transform. The shape
 * overlay is transformed by the same viewport, so it must NOT divide by zoom:
 * doing so would make a shape's preview a constant screen width while the
 * resource one grew and shrank — the exact drift this module exists to prevent.
 */
export const CONNECTION_LINE_WIDTH = 2;

/**
 * Ready to hand to React Flow's `connectionLineStyle`, and applied as an inline
 * `style` on the shape overlay's preview path.
 *
 * It has to be `style`, not presentation attributes: React Flow ships
 * `.react-flow__connection-path { stroke: var(--xy-connectionline-stroke) }`,
 * and a stylesheet rule beats a presentation attribute. That variable is not
 * defined here, so the declaration resolves to the inherited `stroke` — which
 * on the overlay's own `<svg>` is `none`, painting nothing at all.
 */
export const CONNECTION_LINE_STYLE: React.CSSProperties = {
  stroke: CONNECTION_LINE_COLOR,
  strokeWidth: CONNECTION_LINE_WIDTH,
  strokeLinecap: 'round',
};
