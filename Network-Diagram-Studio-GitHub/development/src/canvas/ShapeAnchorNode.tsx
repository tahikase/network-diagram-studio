/**
 * ShapeAnchorNode — v0.9.29.
 *
 * An **invisible** React Flow node that stands in for an annotation shape so
 * a real `DiagramEdge` can attach to it.
 *
 * ## Why this exists
 *
 * A connection between two resources is a `DiagramEdge`: it carries a kind,
 * a colour, a line style, a label and a state, it gets the inline edge
 * toolbar and the SELECTED EDGE panel, and it is drawn by React Flow. Users
 * build network diagrams out of shapes as much as out of resource cards, so
 * a shape-to-shape connection has to be the *same object*, not a lookalike.
 *
 * React Flow can only draw an edge between two React Flow **nodes**, and a
 * shape is not one — it lives in an SVG overlay mounted outside the flow. An
 * anchor node closes exactly that gap and nothing else: it contributes the
 * box geometry and the handle ids the router expects, and renders no pixels.
 *
 * ## Why it renders nothing and captures nothing
 *
 * `ShapeOverlay` still owns every shape interaction — selection, move,
 * resize, rotate, text editing and the connect-anchor gesture. If this node
 * painted anything it would double-draw the shape, and if it accepted
 * pointer events it would swallow clicks meant for the overlay sitting above
 * it. So the wrapper is `pointer-events: none`, and Canvas marks the node
 * non-selectable, non-draggable and non-focusable.
 *
 * The handles carry the **same ids as `AzureNode`** — all twelve connect
 * points (`s-l`/`s-r`/`s-t`/`s-b` plus the 25 %/75 % dots such as `s-r75`,
 * and the `t-…` twins) — so Canvas's existing per-edge handle picker works
 * on a shape edge with no special casing, and an endpoint the user pinned to
 * a quarter dot stays on that dot instead of sliding to the side midpoint.
 */
import { memo, Fragment } from 'react';
import { Handle, type NodeProps } from '@xyflow/react';
import { CONNECT_POINTS } from './handles';

/** Handles must exist for the router, but must never be seen or hit. */
const HIDDEN: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: 'none',
  background: 'transparent',
  pointerEvents: 'none',
};

function ShapeAnchorNodeInner({ id }: NodeProps) {
  return (
    <div
      data-nds-shape-anchor={id}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', opacity: 0 }}
    >
      {CONNECT_POINTS.map(({ key, pos, along }) => {
        // The quarter dots need the same cross-axis offset a resource card
        // gives them, or all three ids on a side would resolve to the exact
        // same pixel and an edge "pinned" to a quarter would still render
        // from the middle of that side.
        const style = along ? { ...HIDDEN, ...along } : HIDDEN;
        return (
          <Fragment key={key}>
            <Handle
              type="target"
              id={`t-${key}`}
              position={pos}
              style={style}
              isConnectable={false}
            />
            <Handle
              type="source"
              id={`s-${key}`}
              position={pos}
              style={style}
              isConnectable={false}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

export const ShapeAnchorNode = memo(ShapeAnchorNodeInner);
