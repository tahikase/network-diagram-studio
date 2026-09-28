/**
 * Shared connect / resize affordances for the two connectable node types
 * (`AzureNode` resource cards and `GroupNode` containers).
 *
 * ## The two affordances must never look alike — or share a pixel
 *
 * Both used to be identical 16–18 px blue circles, and — worse — the four
 * side-midpoint ones were drawn at the SAME point: a `NodeResizeControl`
 * and a connect `Handle` stacked on top of each other. There was no way to
 * tell "drag me to resize" from "drag me to connect", and which one you got
 * depended on paint order (the handle won, so those resize grips were dead
 * weight). So the vocabulary is now:
 *
 *   • **resize** = a SOLID BLUE SQUARE at each CORNER, plus the accent
 *     frame drawn between them — grab any side of the frame to resize that
 *     one axis (`RESIZE_HANDLE_STYLE`, `RESIZE_LINE_STYLE`)
 *   • **connect** = a WHITE CIRCLE with a blue ring, sitting ON the border
 *     (`.nds-connect-handle`)
 *
 * Squares and circles never overlap: a square is only ever at a corner,
 * and the nearest circle is a quarter of a side away. A press is therefore
 * never ambiguous, and both affordances stay live at the same time.
 *
 * The same square/circle pairing is used by annotation shapes in
 * `ShapeOverlay`, so the vocabulary is identical whatever the user clicked.
 */
import { Fragment } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * v0.9.50 — 12 → 16 px. Reported as "connecting resources and shapes is very
 * difficult". A 12 px target is below the 24 px minimum every desktop
 * pointer-target guideline asks for, and it shrinks further with the zoom.
 */
const HANDLE_SIZE: React.CSSProperties = { width: 16, height: 16 };

/**
 * The four canonical sides. `Canvas.pickHandles` routes EVERY edge through
 * one of these ids (`s-r`→`t-l` and so on), so they must exist on every
 * connectable node and must stay exactly at the side midpoint — that is
 * where the edge visually attaches.
 */
const SIDES = [
  { key: 'l', pos: Position.Left },
  { key: 'r', pos: Position.Right },
  { key: 't', pos: Position.Top },
  { key: 'b', pos: Position.Bottom },
] as const;

/**
 * Extra connect points at 25 % and 75 % along each side, on top of the
 * midpoint — 12 dots per card instead of 4. Two reasons:
 *
 *   1. Discoverability. Four dots on a 208 px card read as decoration; a
 *      run of dots down each face reads as "this whole edge is connectable".
 *   2. Aim. A quarter dot is usually the connect point nearest to wherever
 *      the pointer already is, so the user drags less to start an edge.
 *
 * 25 %/75 % also keeps every dot clear of the corner resize squares, which
 * is what lets both affordances stay live at once.
 *
 * They are ordinary handles, so a drag can start *or* end on one — and
 * since v0.9.41 the edge STAYS on the dot the drag started from instead of
 * snapping back to the side midpoint. See `pickHandles` in `Canvas.tsx`.
 */
const QUARTERS = [25, 75] as const;

/**
 * Every connect point a connectable node exposes, as DATA rather than JSX:
 * the four side midpoints first, then the 25 %/75 % dots.
 *
 * Exported so `ShapeAnchorNode` can render the SAME id set. It used to carry
 * the four midpoint pairs alone, which is why an edge dropped on a shape's
 * quarter dot jumped back to the middle of that side — the handle the user
 * aimed at simply did not exist on that node, so the router had nothing to
 * pin to. Deriving both components from one list keeps them in step.
 *
 * ⚠️ Order matters — see `ConnectHandles`.
 */
export const CONNECT_POINTS: ReadonlyArray<{
  key: string;
  pos: Position;
  along?: React.CSSProperties;
}> = [
  ...SIDES.map(({ key, pos }) => ({ key: key as string, pos })),
  ...SIDES.flatMap(({ key, pos }) =>
    QUARTERS.map((q) => ({
      key: `${key}${q}`,
      pos,
      // React Flow centres a handle on its side with `left`/`top` + a
      // translate; overriding the cross-axis offset slides it along that
      // side without disturbing the centring (see index.css).
      along: (key === 'l' || key === 'r'
        ? { top: `${q}%` }
        : { left: `${q}%` }) as React.CSSProperties,
    }))
  ),
];

/**
 * Every handle id a connectable node renders, e.g. `s-r`, `t-b75`.
 *
 * Canvas uses this to validate the handle a user actually dragged from
 * before pinning an edge to it — a stale or hand-edited id in a `.json`
 * would otherwise leave React Flow looking for a handle that does not
 * exist, and the edge would render from the node's origin.
 *
 * ⚠️ Since v0.9.56 `ShapeAnchorNode` renders this SAME set, so a quarter id
 * is now meaningful on a shape too and Canvas pins shape endpoints as well.
 */
export const CONNECT_HANDLE_IDS: ReadonlySet<string> = new Set(
  CONNECT_POINTS.flatMap(({ key }) => [`s-${key}`, `t-${key}`])
);

/**
 * Every handle a connectable node needs, in a fixed order: the four
 * midpoints first (target then source per side), then the quarter dots.
 *
 * ⚠️ Order matters. `.react-flow__handle.source.react-flow__handle-right`
 * is how several tests and probes find "the right-hand source handle", and
 * `querySelector` returns the first match — which must stay `s-r`.
 */
export function ConnectHandles() {
  return (
    <>
      {CONNECT_POINTS.map(({ key, pos, along }) => {
        const style = along ? { ...HANDLE_SIZE, ...along } : HANDLE_SIZE;
        const kind = along ? 'nds-connect-quarter' : 'nds-connect-mid';
        return (
          <Fragment key={key}>
            <Handle
              type="target"
              id={`t-${key}`}
              position={pos}
              className={`nds-connect-handle ${kind}`}
              style={style}
            />
            <Handle
              type="source"
              id={`s-${key}`}
              position={pos}
              className={`nds-connect-handle ${kind}`}
              style={style}
            />
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * How long the snap stays armed after the pointer is released.
 *
 * React Flow does not stop at `onResizeEnd`: it dispatches one more
 * `dimensions` change carrying ITS OWN idea of the box — the raw pointer
 * position, 5px shy of the neighbour you just snapped to — and the DOM
 * measurement that follows it. Disarming the snap the instant the button
 * came up therefore un-did the snap on release: the box locked on, and then
 * quietly slid back off it. Staying armed for a fraction of a second lets
 * that tail get snapped too, which is idempotent — it lands on the same
 * neighbour's dimension it already had.
 */
export const RESIZE_TAIL_MS = 200;

/** Corner grips of `NodeResizer`. A solid blue SQUARE, so it can never be
 *  mistaken for a connect dot — and only ever at a corner, which is the one
 *  place on the border where no connect dot lives. */
export const RESIZE_HANDLE_STYLE: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  width: 18,
  height: 18,
  borderRadius: 3,
  border: '3px solid #ffffff',
  boxShadow: '0 2px 6px rgba(15,23,42,0.45), 0 0 0 1px rgba(59,130,246,0.35)',
};

/**
 * The accent frame `NodeResizer` draws between the corner grips.
 *
 * This is the SINGLE-AXIS resize affordance: React Flow makes each side of
 * the frame a drag target with an `ns-resize` / `ew-resize` cursor. It
 * replaces the four side-midpoint `NodeResizeControl`s this file used to
 * export — those sat exactly under the side-midpoint connect dot, which is
 * painted later and therefore swallowed every press aimed at them. A thick,
 * clearly drawn frame says "grab an edge to resize" without competing with
 * a dot for the same pixel.
 */
export const RESIZE_LINE_STYLE: React.CSSProperties = {
  borderColor: '#3b82f6',
  borderWidth: 3,
  padding: 3,
};
