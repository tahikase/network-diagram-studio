// Demo v0.6: SHAPE OVERLAY
// -------------------------------------------------------------------------
// Transparent SVG that renders and edits structured annotations (arrows,
// rectangles, ellipses, callouts). Coordinates are FLOW / world space so
// shapes stick to the diagram at any zoom level.
//
// Pointer-event routing
// ---------------------
// The SVG ROOT is `pointer-events: none` — empty canvas passes through to
// ReactFlow (nodes & edges keep working). Individual shape rects/lines are
// `pointer-events: auto` so clicks on a shape land here.
//
// When a shape TOOL is active (arrow / rect / ellipse / callout) or the
// user is actively dragging a shape / handle, we flip the root to
// `pointer-events: auto` so click-drag lands on empty canvas too.
import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { jsx } from 'react/jsx-runtime';
import { runtimeExtensions } from '../runtime/extensions';
import {
  useConnection,
  useReactFlow,
  useStore,
  getBezierPath,
  getSmoothStepPath,
  Position,
} from '@xyflow/react';
import {
  isShapeTool,
  useAnnotationStore,
  dashArrayFor,
  type Tool,
  type ArrowStyle,
  type BoxStyle,
  type EllipseStyle,
  type CalloutStyle,
} from './annotation-store';
import {
  hitTestShape,
  normalizeBox,
  useTabsStore,
  type Point,
  type Shape,
  type ShapeArrow,
  type ShapeCallout,
  type ShapeEllipse,
  type ShapeEndRef,
  type ShapeRect,
} from './tabs-store';
import { undoRouter } from '../store/undo-router';
import { useDiagramStore } from '../store/diagram-store';
import {
  BIND_SLACK_PX,
  buildBindTargets,
  CONTAINER_EDGE_BAND_PX,
  handleKeyForAnchor,
  isBound,
  pickTargetAt,
  refForDrop,
  refPoint,
  resolveShapes,
  type BindTarget,
  type NodeBox,
} from './shape-binding';
import { geomPath, geomDetailPath } from './shape-geometry';
import {
  boxNestedIn,
  collectCargo,
  shapeBBox,
  translateShapeGeometry as translateShapeGeom,
  type BBox,
} from '../model/containment';
import { absoluteNodeBoxes } from '../model/endpoints';

/** Reused so a cargo scan never allocates an empty Set per drag. */
const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>();
import { arrowTextSize, fitShapeText, measureShapeText, shapeTextCss, shapeParagraphCss, type ShapeTextStyle } from '../model/shape-text';
import { measureTextPx } from '../model/text-metrics';
import { paintColor, paintTextColor, paperFor } from '../theme/palette';
import { ShapeTextToolbar } from './ShapeTextToolbar';
import { CONNECTION_LINE_STYLE } from '../theme/connection-line';
import { useT } from '../i18n/useT';
import { CANVAS_PLACEMENT_FEEDBACK } from '../env';
import { clearPlacementFeedback, feedbackBox, isPreviewArrow, rotatePoint, unionBoxes, usePlacementFeedback } from './placement-feedback';
import { PlacementGuides } from './PlacementGuides';
import { SvgViewport } from '../canvas/SvgViewport';
import { ExcludeHitRegions, ExcludeStrokeHitRegions } from '../canvas/ExcludeHitRegions';
import { boxHitPath, minimumHitBox, rotatedShapeBounds, shapeHitsAt, subtractHitBoxes } from '../canvas/shape-hit-test';

const MIN_SHAPE_SIZE = 10;

/** v0.9.30 — anchor side → the React Flow `Position` a handle on that side
 *  would carry, so the connection preview curves out of the shape exactly
 *  the way it curves out of a resource card's handle. */
const SIDE_TO_POSITION: Record<'n' | 'e' | 's' | 'w', Position> = {
  n: Position.Top,
  e: Position.Right,
  s: Position.Bottom,
  w: Position.Left,
};

/** React Flow's own ConnectionLine faces the free end back at the source
 *  while there is no target handle. Mirroring that keeps the curve's shape
 *  identical to the resource one. */
const OPPOSITE_POSITION: Record<Position, Position> = {
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
};

/** The slice of a React Flow internal node this file reads. Declared locally
 *  because `InternalNode` is not exported from the public entry point. */
interface InternalNodeLike {
  id: string;
  position?: { x: number; y: number };
  internals?: { positionAbsolute?: { x: number; y: number } };
  measured?: { width?: number; height?: number };
  /** React Flow node type — `azureGroup` for a container. */
  type?: string;
}

const DEFAULT_FILL_OPACITY = 0.08;
const HANDLE_SIZE = 8; // in screen px — scales with zoom
const HIT_PAD = 6; // in flow px
/** v0.9.27 — screen-px radius around a connect dot inside which a drop
 *  PINS that dot instead of creating a floating binding. Divided by zoom at
 *  the call site so the zone stays the same size on screen.
 *
 *  v0.9.57 — 14 → 18, now that `refForDrop` resolves NEAREST-of-twelve
 *  rather than first-of-four. First-match made a wide radius dangerous
 *  because it could return a dot the user was not pointing at; nearest-wins
 *  cannot, so the radius is free to match the 18 world-px hit circle the
 *  anchor already paints and aiming stops being pixel-perfect work. */
const ANCHOR_PIN_PX = 18;
// CONTAINER_EDGE_BAND_PX / BIND_SLACK_PX moved to `shape-binding` so the
// React Flow connection gesture handled in Canvas resolves a drop with
// exactly the tolerances this overlay uses. Two copies would drift apart.
/** v0.9.50 — screen-px distance from a shape's bounding box within which its
 *  connect anchors appear. Before this, anchors only showed while the pointer
 *  was literally over the shape's painted body, which meant a `fill: none`
 *  frame or a thin glyph had a near-invisible affordance. */
const ANCHOR_REVEAL_PX = 26;
/** v0.9.56 — the same distance, but while a connection is actually being
 *  DRAGGED.
 *
 *  The 26px above is a HOVER affordance. It answers "can I start a connection
 *  here", and it is deliberately tight so that merely sweeping the pointer
 *  across a busy canvas does not light every shape up at once.
 *
 *  Aiming is the opposite problem. The user has already committed to a
 *  connection and now needs to see the candidate BEFORE the pointer gets
 *  there — otherwise there is nothing on screen to aim AT, and the anchors
 *  only appear once the pointer is already touching the shape, by which point
 *  the question has answered itself. That was the remaining half of "I cannot
 *  see where I am connecting the line to". */
const ANCHOR_AIM_REVEAL_PX = 120;

function makeShapeId() {
  return `sh_${Math.random().toString(36).slice(2, 10)}`;
}

function snap45(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 4;
  const snapped = Math.round(angle / step) * step;
  const len = Math.hypot(dx, dy);
  return { x: from.x + Math.cos(snapped) * len, y: from.y + Math.sin(snapped) * len };
}

// -------- rendering helpers --------------------------------------------

// Demo v0.6: arrowhead marker — supports triangle (default) OR a filled dot
// when the shape's `head` prop is 'dot'. The dot is rendered as a large
// circle in the marker's viewBox, sized so it looks proportional at
// varying stroke widths.
function ArrowMarker({ id, color, variant = 'triangle' }: { id: string; color: string; variant?: 'triangle' | 'dot' }) {
  if (variant === 'dot') {
    return (
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <circle cx="5" cy="5" r="4" fill={color} />
      </marker>
    );
  }
  // Fixed 18×18-px filled triangle in absolute user-space units so the
  // arrowhead renders at the same absolute size as a React Flow
  // `MarkerType.ArrowClosed` edge marker (see
  // `src/canvas/edge-styles.ts` — `width:18, height:18`). This is what
  // makes a hand-drawn shape-arrow visually indistinguishable from a
  // diagram edge — the whole point of v0.7.6. `markerUnits="userSpaceOnUse"`
  // decouples marker size from stroke-width so a 1 px vs 4 px annotation
  // arrow both get the same head, matching how React Flow renders diagram
  // edges regardless of `strokeWidth`.
  return (
    <marker
      id={id}
      viewBox="0 0 20 20"
      refX="18"
      refY="10"
      markerWidth="18"
      markerHeight="18"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 20 10 L 0 20 z" fill={color} />
    </marker>
  );
}

/**
 * Build the SVG path `d` string for an arrow shape, honouring its
 * `shape` variant (straight / curved / elbow).
 *
 *   straight → single line
 *   curved   → cubic bezier, sagged perpendicular to the chord so short
 *              arrows still show a visible curve (min |sag| = 24 px)
 *   elbow    → two-segment 90° polyline; horizontal-first when |dx|
 *              dominates, vertical-first otherwise. Corner is at the
 *              elbow point.
 */
/**
 * Which face of each box a stepped route should leave from and arrive at.
 *
 * Derived from the dominant axis, which is what makes two boxes side by side
 * connect edge-to-edge horizontally instead of looping over the top. React
 * Flow gets this from the handle a resource edge is attached to; a shape has
 * no handles, so the geometry has to say it.
 */
function stepSides(from: Point, to: Point): [Position, Position] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? [Position.Right, Position.Left] : [Position.Left, Position.Right];
  }
  return dy >= 0 ? [Position.Bottom, Position.Top] : [Position.Top, Position.Bottom];
}

export function buildArrowPathD(a: ShapeArrow): string {
  // A BOUND arrow is a connector between two boxes, so it defaults to the
  // same orthogonal route resource edges use. An UNBOUND arrow is a free
  // annotation the user drew at whatever angle they meant, so it stays
  // straight — stepping it would bend a deliberate diagonal into a jog.
  const shape = a.shape ?? (isBound(a) ? 'step' : 'straight');
  const { from, to } = a;
  if (shape === 'straight') {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  if (shape === 'step') {
    // React Flow's own path builder, with the same borderRadius/offset that
    // `SmartLabelEdge` passes for resource edges. Calling the library rather
    // than hand-rolling a lookalike is the only way "same as a resource
    // edge" stays true when React Flow changes its routing.
    const [sourcePosition, targetPosition] = stepSides(from, to);
    const [d] = getSmoothStepPath({
      sourceX: from.x,
      sourceY: from.y,
      targetX: to.x,
      targetY: to.y,
      sourcePosition,
      targetPosition,
      borderRadius: 12,
      offset: 20,
    });
    return d;
  }
  if (shape === 'elbow') {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`;
    }
    return `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}`;
  }
  // curved — cubic bezier along chord, sagged perpendicular.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit (rotated -90°, i.e. bulges above/left of chord)
  const px = -dy / len;
  const py = dx / len;
  // Sag magnitude — 25 % of chord, capped so it looks natural.
  const sag = Math.max(24, Math.min(120, len * 0.25));
  const c1x = from.x + dx * 0.3 + px * sag;
  const c1y = from.y + dy * 0.3 + py * sag;
  const c2x = from.x + dx * 0.7 + px * sag;
  const c2y = from.y + dy * 0.7 + py * sag;
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

/** An axis-aligned box in world space. */
type HoleBox = { x: number; y: number; w: number; h: number };

function shapeBodyPathD(shape: Shape): string | null {
  // Geometry detail (Actor limbs, cloud lobes, open brackets) must not define
  // the grab target. Every rect-backed shape has the same complete body box.
  if (shape.kind === 'rect' || shape.kind === 'callout') return boxHitPath(shape);
  if (shape.kind === 'ellipse') {
    const e = shape as ShapeEllipse;
    const { cx, cy, rx, ry } = e;
    if (!(rx > 0 && ry > 0)) return null;
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }
  return null;
}

function rotatedBoxPath(box: HoleBox, center: Point, rotation: number): string {
  if (!rotation) return boxHitPath(box);
  const corners = [
    { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h },
  ].map(point => rotatePoint(point, center, rotation));
  return corners.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ') + 'Z';
}

function localHolePath(shape: Shape, hole: HoleBox): string {
  const rotation = shape.rotation ?? 0;
  if (!rotation) return boxHitPath(hole);
  return rotatedBoxPath(hole, shapeCenter(shape), -rotation);
}

/**
 * v0.9.54 — the box the shape's own caption actually paints into.
 *
 * `HoleHitRegion` punches a hole for every resource card a shape covers so the
 * click reaches the card. That is right for bare interior, but it also
 * swallowed the shape's OWN text: a card under the middle of the box made the
 * caption — which paints ON TOP of that card — impossible to hit, so the shape
 * could be neither selected nor text-edited from the one spot users aim at
 * first. Clicks now match what is painted.
 *
 * The box is the glyph block, not the whole label frame, so the surrounding
 * hole stays as large as possible. It shares the label's fitting, paragraph
 * metrics, alignment and upright-text rotation.
 */
function textHitBox(
  style: ShapeTextStyle & { rotation?: number }, text: string,
  cx: number, cy: number, width: number, height: number, px: number
): HoleBox | null {
  const metrics = measureShapeText(text, style, width, px);
  const w = metrics.width;
  const scale = px / Math.max(1, style.textSize ?? 14);
  const y = Math.max(cy - height / 2, cy - metrics.height / 2 + (style.textSpaceBefore ?? 0) * scale);
  const bottom = Math.min(cy + height / 2, cy + metrics.height / 2 - (style.textSpaceAfter ?? 0) * scale);
  const h = bottom - y;
  if (!(w > 0 && h > 0)) return null;
  const left = cx - width / 2 + metrics.indent;
  const x = style.textAlign === 'left' ? left : style.textAlign === 'right' ? cx + width / 2 - w
    : left + (width - metrics.indent - w) / 2;
  const rotation = (((style.rotation ?? 0) % 360) + 360) % 360;
  return rotation > 90 && rotation < 270
    ? { x: 2 * cx - x - w, y: 2 * cy - y - h, w, h }
    : { x, y, w, h };
}

function captionHitBox(shape: Shape): HoleBox | null {
  if (shape.kind === 'arrow') return null;
  if (shape.kind === 'rect' && shape.canvasImage !== undefined) return null;
  const text = shape.text;
  if (!text) return null;
  const isRect = shape.kind !== 'ellipse';
  const cx = isRect ? shape.x + shape.w / 2 : shape.cx;
  const cy = isRect ? shape.y + shape.h / 2 : shape.cy;
  const availW = isRect ? Math.max(10, shape.w - 12) : Math.max(10, shape.rx * 1.6);
  const availH = isRect ? Math.max(10, shape.h - 8) : Math.max(10, shape.ry * 1.6);
  const px = fitShapeText(text, shape, availW, availH);
  return textHitBox(shape, text, cx, cy, availW, availH, px);
}

function HoleHitRegion({
  bodyD,
  holes,
  caption,
  strokeWidth,
  cursor,
  onPointerDown,
  shape,
  preferResource,
  paddingD,
  paddingHoles,
  paddingBox,
}: {
  bodyD: string;
  holes: HoleBox[];
  caption: HoleBox | null;
  strokeWidth: number;
  cursor: string;
  onPointerDown: (e: React.PointerEvent) => void;
  shape: Shape;
  preferResource: boolean;
  paddingD: string | null;
  paddingHoles: HoleBox[];
  paddingBox: HoleBox;
}) {
  const exclusions = holes.map(hole => localHolePath(shape, hole));
  return (
    <>
      {paddingD && !shape.rotation && subtractHitBoxes(paddingBox, paddingHoles).map((box, index) =>
        <path key={index} data-nds-selection-padding data-nds-shape-hit="fill" d={boxHitPath(box)}
          fill="transparent" onPointerDown={onPointerDown}
          style={{ cursor, pointerEvents: 'fill' }} />)}
      {paddingD && !!shape.rotation && <ExcludeHitRegions body={paddingD}
        exclusions={paddingHoles.map(hole => localHolePath(shape, hole))}>
        <path data-nds-selection-padding data-nds-shape-hit="fill" d={paddingD}
          fill="transparent" onPointerDown={onPointerDown}
          style={{ cursor, pointerEvents: 'fill' }} />
      </ExcludeHitRegions>}
      <ExcludeHitRegions body={bodyD} exclusions={exclusions}>
        <path
          data-nds-shape-hit="fill"
          d={bodyD}
          fill="transparent"
          stroke="none"
          onPointerDown={onPointerDown}
          style={{ cursor, pointerEvents: 'fill' }}
        />
      </ExcludeHitRegions>
      {!preferResource && <path
        data-nds-shape-hit="stroke"
        data-nds-selection-band
        d={bodyD}
        fill="none"
        stroke="#000"
        strokeOpacity={0}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        onPointerDown={onPointerDown}
        style={{ cursor, pointerEvents: 'stroke' }}
      />}
      {caption && !preferResource && (
        <rect
          data-nds-shape-caption-hit
          data-nds-shape-hit="fill"
          x={caption.x}
          y={caption.y}
          width={caption.w}
          height={caption.h}
          fill="#000"
          fillOpacity={0}
          stroke="none"
          onPointerDown={onPointerDown}
          style={{ cursor, pointerEvents: 'fill' }}
        />
      )}
    </>
  );
}

const RenderShape = memo(function RenderShape({
  shape,
  selected,
  onPointerDownBody,
  interactive,
  holes,
  hideText = false,
  preferredNode,
  zoom = 1,
  paddingHoles = [],
}: {
  shape: Shape;
  selected: boolean;
  onPointerDownBody: (e: React.PointerEvent, shape: Shape) => void;
  interactive: boolean;
  holes?: HoleBox[];
  hideText?: boolean;
  preferredNode?: HoleBox;
  zoom?: number;
  paddingHoles?: HoleBox[];
}) {
  const t = useT();
  const cursor = interactive ? (selected ? 'move' : 'pointer') : 'default';
  const bodyD = interactive ? shapeBodyPathD(shape) : null;
  const pe: React.CSSProperties['pointerEvents'] = bodyD ? 'none' : interactive ? 'auto' : 'none';
  const commonProps = {
    onPointerDown: (e: React.PointerEvent) => onPointerDownBody(e, shape),
    style: { cursor, pointerEvents: pe },
  };
  const caption = captionHitBox(shape);
  const box = shapeBBox(shape);
  const hitBox = minimumHitBox(box, zoom);
  const paddingD = bodyD && (hitBox.w > box.w || hitBox.h > box.h) ? boxHitPath(hitBox) : null;
  const paddingBounds = paddingD ? rotatedShapeBounds(shape.kind === 'ellipse'
    ? { ...shape, rx: hitBox.w / 2, ry: hitBox.h / 2 }
    : shape.kind === 'arrow' ? shape : { ...shape, ...hitBox }) : box;
  const bodyRegion =
    bodyD ? (
      <HoleHitRegion
        bodyD={bodyD}
        holes={holes ?? []}
        caption={caption}
        strokeWidth={Math.max(10, shape.kind === 'arrow' ? 10 : (shape as ShapeRect).width ?? 2)}
        cursor={cursor}
        onPointerDown={(e) => onPointerDownBody(e, shape)}
        shape={shape}
        preferResource={!!preferredNode && boxesIntersect(rotatedShapeBounds(shape), preferredNode)}
        paddingD={paddingD}
        paddingHoles={paddingD ? paddingHoles.filter(hole => boxesIntersect(hole, paddingBounds)) : []}
        paddingBox={hitBox}
      />
    ) : null;
  if (shape.kind === 'rect' && shape.canvasImage !== undefined) {
    const images = runtimeExtensions().ndsCanvasImages;
    if (!images) throw new Error('Canvas image rendering requires the packaged editor extensions.');
    return images.render(jsx, shape, selected, onPointerDownBody, false, bodyRegion);
  }
  // v0.7.9: shape selection halo. Rendered UNDER the actual shape so the
  // shape itself is untouched but the user gets an obvious bright-blue
  // glow around whatever they've selected. Non-interactive.
  const HALO = '#3b82f6';
  const HALO_OPACITY = 0.28;

  if (shape.kind === 'arrow') {
    const a = shape as ShapeArrow;
    const markerId = `nds-arrowhead-${a.id}`;
    const markerStartId = `nds-arrowstart-${a.id}`;
    const mid = { x: (a.from.x + a.to.x) / 2, y: (a.from.y + a.to.y) / 2 };
    // Text label sits at the midpoint on a white pill so it stays readable
    // over any background.
    const label = a.text ?? '';
    const { width: labelWidth, height: labelHeight } =
      arrowTextSize(label, a, Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y));
    const labelHit = label ? textHitBox(a, label, mid.x, mid.y, labelWidth - 12, labelHeight, a.textSize ?? 14) : null;
    // Demo v0.6: dash + head variants. Default head = 'end' (BC).
    const head = a.head ?? 'end';
    const headVariant: 'triangle' | 'dot' = head === 'dot' ? 'dot' : 'triangle';
    const dashArray = dashArrayFor(a.dash, a.width);
    const pathD = buildArrowPathD(a);
    // v0.7.16 — arrows can rotate. The rotation is applied via SVG
    // transform around the arrow midpoint so the stored from/to remain
    // in their pre-rotation frame (endpoint dragging behaves normally
    // in that frame).
    const rotDeg = a.rotation ?? 0;
    const rotXform = rotDeg ? `rotate(${rotDeg} ${mid.x} ${mid.y})` : undefined;
    const hitStrokeWidth = Math.max(24, a.width + 10);
    const hitRegion = <g>
      <path data-nds-shape-hit="stroke" d={pathD} fill="none" stroke="transparent"
        strokeWidth={hitStrokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...commonProps} />
      {labelHit && <rect data-nds-shape-caption-hit data-nds-shape-hit="fill" x={labelHit.x - 6} y={labelHit.y - 1}
        width={labelHit.w + 12} height={labelHit.h + 2} fill="transparent" {...commonProps} />}
    </g>;
    return (
      <g data-nds-shape={a.id} data-nds-shape-kind="arrow" transform={rotXform}>
        <defs>
          {(head === 'end' || head === 'both' || head === 'dot') && (
            <ArrowMarker id={markerId} color={paintColor(a.color)} variant={headVariant} />
          )}
          {head === 'both' && <ArrowMarker id={markerStartId} color={paintColor(a.color)} variant="triangle" />}
        </defs>
        {/* Invisible fat hit target. `non-scaling-stroke` makes the width
            SCREEN px, so the grab band stays comfortable at every zoom —
            a thin diagonal line is otherwise near-impossible to hit. */}
        {preferredNode ? <ExcludeStrokeHitRegions exclusions={[localHolePath(a, preferredNode)]}
          strokeWidth={hitStrokeWidth}>{hitRegion}</ExcludeStrokeHitRegions> : hitRegion}
        {selected && (
          <path
            d={pathD}
            fill="none"
            stroke={HALO}
            strokeOpacity={HALO_OPACITY}
            strokeWidth={a.width + 8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        )}
        <path
          d={pathD}
          fill="none"
          stroke={paintColor(a.color)}
          strokeWidth={a.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashArray}
          markerEnd={head === 'end' || head === 'both' || head === 'dot' ? `url(#${markerId})` : undefined}
          markerStart={head === 'both' ? `url(#${markerStartId})` : undefined}
          style={{ pointerEvents: 'none' }}
        />
        {label && !hideText && (
          <ShapeLabel
            cx={mid.x}
            cy={mid.y}
            width={labelWidth}
            height={labelHeight}
            text={label}
            color={paintTextColor(a.textColor ?? a.color)}
            textStyle={a}
            withBackground
            parentRotation={rotDeg}
          />
        )}
      </g>
    );
  }
  if (shape.kind === 'rect') {
    const r = shape as ShapeRect;
    // Demo v0.6: variants — dash, corner, fill preset.
    const dashArray = dashArrayFor(r.dash, r.width);
    const rx = r.corner === 'sharp' ? 0 : 4;
    // v0.7.15 — apply the shape's rotation via an SVG transform on the
    // container group. Center point = geometric center of the box so the
    // rotation feels natural to the user.
    const rotDeg = r.rotation ?? 0;
    const rotCx = r.x + r.w / 2;
    const rotCy = r.y + r.h / 2;
    const rotXform = rotDeg ? `rotate(${rotDeg} ${rotCx} ${rotCy})` : undefined;
    // v0.9 — non-rectangular geometry. `geomPath` returns null for a
    // plain rect (or an id this build doesn't know), in which case we
    // fall through to the original <rect> render.
    const outlineD = geomPath(r.geom, r.x, r.y, r.w, r.h);
    const detailD = outlineD ? geomDetailPath(r.geom, r.x, r.y, r.w, r.h) : null;
    return (
      <g data-nds-shape={r.id} data-nds-shape-kind="rect" data-nds-shape-geom={r.geom} transform={rotXform}>
        {selected && (
          <rect
            x={r.x - 4}
            y={r.y - 4}
            width={r.w + 8}
            height={r.h + 8}
            fill="none"
            stroke={HALO}
            strokeOpacity={HALO_OPACITY}
            strokeWidth={6}
            rx={rx + 3}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {outlineD ? (
          <>
            <path
              d={outlineD}
              fill={paintColor(r.color)}
              fillOpacity={r.fillOpacity}
              stroke={paintColor(r.color)}
              strokeWidth={r.width}
              strokeDasharray={dashArray}
              strokeLinejoin="round"
              {...commonProps}
            />
            {detailD && (
              <path
                d={detailD}
                fill="none"
                stroke={paintColor(r.color)}
                strokeWidth={r.width}
                strokeDasharray={dashArray}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </>
        ) : (
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={paintColor(r.color)}
            fillOpacity={r.fillOpacity}
            stroke={paintColor(r.color)}
            strokeWidth={r.width}
            strokeDasharray={dashArray}
            rx={rx}
            {...commonProps}
          />
        )}
        {bodyRegion}
        {r.text && !hideText && (
          <ShapeLabel
            cx={r.x + r.w / 2}
            cy={r.y + r.h / 2}
            width={Math.max(10, r.w - 12)}
            height={Math.max(10, r.h - 8)}
            text={r.text}
            color={paintTextColor(r.textColor ?? r.color)}
            textStyle={r}
            autoFit
            parentRotation={rotDeg}
          />
        )}
      </g>
    );
  }
  if (shape.kind === 'ellipse') {
    const el = shape as ShapeEllipse;
    // Demo v0.6: dash variant on the outline.
    const dashArray = dashArrayFor(el.dash, el.width);
    // v0.7.15 — rotation around ellipse center.
    const rotDeg = el.rotation ?? 0;
    const rotXform = rotDeg ? `rotate(${rotDeg} ${el.cx} ${el.cy})` : undefined;
    return (
      <g data-nds-shape={el.id} data-nds-shape-kind="ellipse" transform={rotXform}>
        {selected && (
          <ellipse
            cx={el.cx}
            cy={el.cy}
            rx={el.rx + 4}
            ry={el.ry + 4}
            fill="none"
            stroke={HALO}
            strokeOpacity={HALO_OPACITY}
            strokeWidth={6}
            style={{ pointerEvents: 'none' }}
          />
        )}
        <ellipse
          cx={el.cx}
          cy={el.cy}
          rx={el.rx}
          ry={el.ry}
          fill={paintColor(el.color)}
          fillOpacity={el.fillOpacity}
          stroke={paintColor(el.color)}
          strokeWidth={el.width}
          strokeDasharray={dashArray}
          {...commonProps}
        />
        {bodyRegion}
        {el.text && !hideText && (
          <ShapeLabel
            cx={el.cx}
            cy={el.cy}
            width={Math.max(10, el.rx * 1.6)}
            height={Math.max(10, el.ry * 1.6)}
            text={el.text}
            color={paintTextColor(el.textColor ?? el.color)}
            textStyle={el}
            autoFit
            parentRotation={rotDeg}
          />
        )}
      </g>
    );
  }
  if (shape.kind === 'callout') {
    const c = shape as ShapeCallout;
    // v0.7.16 — callouts can rotate. Box + text are wrapped in the
    // rotation transform. The leader line + anchor stay in world space
    // (per the doc comment on ShapeCallout.rotation in tabs-store.ts):
    // the anchor was chosen to point at a specific spot on the canvas
    // and should NOT drift when the note is rotated.
    const rotDeg = c.rotation ?? 0;
    const rotCx = c.x + c.w / 2;
    const rotCy = c.y + c.h / 2;
    const rotXform = rotDeg ? `rotate(${rotDeg} ${rotCx} ${rotCy})` : undefined;
    // v0.7.18 BUG 3 fix — counter-rotate the callout text when the parent
    // rotation would make it upside-down. Same policy as ShapeLabel.
    const normRotC = ((rotDeg % 360) + 360) % 360;
    const needsFlipC = normRotC > 90 && normRotC < 270;
    const textFlipXform = needsFlipC ? `rotate(180 ${rotCx} ${rotCy})` : undefined;
    // Pick the box edge midpoint closest to the anchor AFTER
    // accounting for rotation, so the leader attaches to whichever
    // side is actually facing the anchor on screen.
    const anchorSide = rotDeg
      ? pickRotatedBoxSideTowards(c, c.anchor, rotDeg)
      : pickBoxSideTowards(c, c.anchor);
    // Demo v0.6: dash / corner variants. Default leader = 'dashed' (BC).
    const leaderDash = c.dash ?? 'dashed';
    const leaderDashArray = dashArrayFor(leaderDash, Math.max(1, c.width - 0.5)) ?? '4 3';
    const boxRx = c.corner === 'sharp' ? 0 : 6;
    // Also let the box outline honor a solid/dashed/dotted dash (default 'solid').
    const boxDashArray = dashArrayFor(c.dash === 'solid' ? undefined : c.dash, c.width);
    const leaderHit = <line data-nds-shape-hit="stroke"
      x1={anchorSide.x} y1={anchorSide.y} x2={c.anchor.x} y2={c.anchor.y}
      stroke="transparent" strokeWidth={18} vectorEffect="non-scaling-stroke"
      style={{ cursor, pointerEvents: 'stroke' }}
      onPointerDown={e => onPointerDownBody(e, shape)} />;
    return (
      <g data-nds-shape={c.id} data-nds-shape-kind="callout">
        {interactive && (preferredNode
          ? <ExcludeStrokeHitRegions exclusions={[boxHitPath(preferredNode)]} strokeWidth={18}>{leaderHit}</ExcludeStrokeHitRegions>
          : leaderHit)}
        {/* Leader line + anchor circle stay in world space so a rotated
            note keeps pointing at the same on-canvas spot. */}
        <line
          x1={anchorSide.x}
          y1={anchorSide.y}
          x2={c.anchor.x}
          y2={c.anchor.y}
          stroke={paintColor(c.color)}
          strokeWidth={Math.max(1, c.width - 0.5)}
          strokeDasharray={leaderDashArray}
          style={{ pointerEvents: 'none' }}
        />
        <circle
          cx={c.anchor.x}
          cy={c.anchor.y}
          r={4}
          fill={paintColor(c.color)}
          style={{ pointerEvents: 'none' }}
        />
        {/* Box + text rotate together. */}
        <g transform={rotXform}>
          {selected && (
            <rect
              x={c.x - 4}
              y={c.y - 4}
              width={c.w + 8}
              height={c.h + 8}
              fill="none"
              stroke={HALO}
              strokeOpacity={HALO_OPACITY}
              strokeWidth={6}
              rx={boxRx + 3}
              style={{ pointerEvents: 'none' }}
            />
          )}
          <rect
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            fill={paperFor(paintTextColor(c.textColor ?? c.color))}
            fillOpacity={0.95}
            stroke={paintColor(c.color)}
            strokeWidth={c.width}
            strokeDasharray={boxDashArray}
            rx={boxRx}
            {...commonProps}
          />
          {bodyRegion}
          {!hideText && (
            <g transform={textFlipXform}>
              <ShapeLabel cx={rotCx} cy={rotCy} width={Math.max(10, c.w - 12)}
                height={Math.max(10, c.h - 8)} text={c.text || t('Note')}
                color={paintTextColor(c.textColor ?? c.color)} textStyle={c} />
            </g>
          )}
        </g>
      </g>
    );
  }
  return null;
}, (before, after) => {
  const sameBox = (a: HoleBox | undefined, b: HoleBox | undefined) =>
    a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);
  const sameBoxes = (a: HoleBox[] = [], b: HoleBox[] = []) =>
    a === b || (a.length === b.length && a.every((box, index) => sameBox(box, b[index])));
  return before.shape === after.shape && before.selected === after.selected &&
    before.interactive === after.interactive && before.hideText === after.hideText &&
    before.zoom === after.zoom && before.onPointerDownBody === after.onPointerDownBody &&
    sameBox(before.preferredNode, after.preferredNode) && sameBoxes(before.holes, after.holes) &&
    sameBoxes(before.paddingHoles, after.paddingHoles);
});

/**
 * A read-only label rendered inside/next to a shape via foreignObject so we
 * get proper multi-line wrapping and centering "for free". The label is
 * pointer-events:none so it never blocks clicks on the shape body underneath.
 */
function ShapeLabel({
  cx,
  cy,
  width,
  height,
  text,
  color,
  textStyle,
  withBackground,
  autoFit,
  parentRotation,
}: {
  cx: number;
  cy: number;
  width: number;
  height: number;
  text: string;
  color: string;
  textStyle: ShapeTextStyle;
  withBackground?: boolean;
  /**
   * Shrink the rendered text so it fits the box (v0.9.46). Only shapes with a
   * box the user controls set this — an arrow label derives its own box FROM
   * the text, so fitting it would shrink long labels on short arrows for no
   * reason.
   *
   * The fit is visual only. The stored `textSize` is untouched, so growing the
   * shape again brings the caption straight back to the chosen size.
   */
  autoFit?: boolean;
  /**
   * v0.7.18 — BUG 3 fix. The label is rendered INSIDE the parent shape's
   * rotation transform, so at rotations that would flip text upside-down
   * (normalized angle in (90°, 270°)) we counter-rotate the label by 180°
   * around its own center. Result: rotations of 0 / 45° keep text normal;
   * rotations of 135° / 180° / 225° flip the label back so it stays readable.
   * At 90° / 270° text remains sideways (that's the correct orientation for
   * a vertically-rotated shape and users still want it to follow the shape).
   */
  parentRotation?: number;
}) {
  const normRot = (((parentRotation ?? 0) % 360) + 360) % 360;
  const needsFlip = normRot > 90 && normRot < 270;
  const labelTransform = needsFlip ? `rotate(180 ${cx} ${cy})` : undefined;
  const basePx = textStyle.textSize ?? 14;
  const renderPx = autoFit
    ? fitShapeText(text, textStyle, width, height)
    : basePx;
  const foreignObj = (
    <foreignObject
      data-nds-shape-label="1"
      x={cx - width / 2}
      y={cy - height / 2}
      width={width}
      height={height}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          // v0.9.48 — export colour fix. html-to-image inlines each cloned
          // HTML element's full computed `cssText`, which includes
          // `-webkit-text-fill-color`. It does NOT walk into <foreignObject>,
          // so this label keeps only React's inline style while every HTML
          // ancestor gains `-webkit-text-fill-color: <theme ink>`. That
          // property INHERITS and OUTRANKS `color` when painting glyphs, so a
          // red caption exported as theme-black. Declaring it here stops the
          // inheritance at the label. Must be kept in lock-step with `color`.
          WebkitTextFillColor: color,
          overflow: 'hidden',
          padding: withBackground ? '0 6px' : undefined,
          boxSizing: 'border-box',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <div data-nds-shape-text="1" style={shapeTextCss(textStyle, renderPx, color)}>
          {text.split('\n').map((paragraph, index) => (
            <div key={index} data-nds-shape-paragraph style={shapeParagraphCss(textStyle, renderPx, index)}>
              {paragraph ? withBackground
                ? <span style={{ background: paperFor(color), padding: '1px 6px', borderRadius: 4 }}>{paragraph}</span>
                : paragraph : <br />}
            </div>
          ))}
        </div>
      </div>
    </foreignObject>
  );
  return labelTransform ? <g transform={labelTransform}>{foreignObj}</g> : foreignObj;
}

function readShapeEditorText(root: Node): string {
  if (root.childNodes.length === 1 && root.firstChild instanceof HTMLBRElement) return '';
  let text = '';
  let afterBlock = false;
  for (const child of root.childNodes) {
    const block = child instanceof HTMLElement && (child.tagName === 'DIV' || child.tagName === 'P');
    if (afterBlock || (block && text !== '')) text += '\n';
    text += child instanceof HTMLBRElement ? '\n' : child.nodeType === Node.TEXT_NODE
      ? child.textContent ?? '' : readShapeEditorText(child);
    afterBlock = block;
  }
  return text;
}

function styleEditorParagraphs(root: HTMLDivElement, style: ShapeTextStyle, px: number) {
  [...root.children].forEach((child, index) => {
    if (!(child instanceof HTMLElement) || (child.tagName !== 'DIV' && child.tagName !== 'P')) return;
    const paragraph = shapeParagraphCss(style, px, index);
    child.dataset.ndsShapeParagraph = '';
    child.style.margin = '0';
    child.style.marginTop = `${paragraph.marginTop}px`;
    child.style.minHeight = `${paragraph.minHeight}px`;
  });
}

/**
 * Inline shape text editor, positioned in the SVG viewport at any zoom.
 * Focuses and selects existing text so typing replaces it.
 *
 * Enter / Shift+Enter inserts a paragraph. Ctrl/Cmd+Enter or blur commits.
 * Escape cancels text edits.
 */
function ShapeInlineEditor({
  shape,
  zoom,
  onCommit,
  onCancel,
  onStyleChange,
}: {
  shape: Shape;
  /** Live canvas zoom, so the toolbar can hold a constant on-screen size. */
  zoom: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
  onStyleChange: (patch: Partial<ShapeTextStyle>) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<SVGGElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const endedRef = useRef(false);
  const composingRef = useRef(false);
  const [initialText] = useState(shape.text ?? '');
  // Tracked so the auto-fit below follows what is being typed, not just the
  // text the editor opened with.
  const [liveText, setLiveText] = useState(initialText);

  const currentSize = shape.textSize ?? 14;
  const currentTextColor = shape.textColor ?? shape.color;
  const viewport = useStore(state => state.transform);
  const canvasWidth = useStore(state => state.width);
  const canvasHeight = useStore(state => state.height);
  const toolbarWidth = Math.max(160, Math.min(500, canvasWidth - 16));
  const [toolbarHeight, setToolbarHeight] = useState(toolbarWidth < 486 ? 86 : 46);

  // Position depends on shape kind.
  let ex = 0,
    ey = 0,
    ew = 0,
    eh = 0;
  if (shape.kind === 'rect' || shape.kind === 'callout') {
    ex = shape.x + 6;
    ey = shape.y + 4;
    ew = Math.max(10, shape.w - 12);
    eh = Math.max(10, shape.h - 8);
  } else if (shape.kind === 'ellipse') {
    ew = Math.max(10, shape.rx * 1.6);
    eh = Math.max(10, shape.ry * 1.6);
    ex = shape.cx - ew / 2;
    ey = shape.cy - eh / 2;
  } else {
    // arrow: pill at midpoint
    const mid = { x: (shape.from.x + shape.to.x) / 2, y: (shape.from.y + shape.to.y) / 2 };
    const size = arrowTextSize(liveText, shape, Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y));
    ew = size.width;
    eh = size.height;
    ex = mid.x - ew / 2;
    ey = mid.y - eh / 2;
  }

  // The editor must render at the SAME size the committed label will, or the
  // text visibly jumps on commit — and on a small shape it would overflow the
  // editor while being typed. Scoped to the two kinds `ShapeLabel` auto-fits.
  const editFit =
    shape.kind === 'rect' || shape.kind === 'ellipse'
      ? fitShapeText(liveText, shape, ew, eh)
      : currentSize;

  const cx = ex + ew / 2;
  const cy = ey + eh / 2;
  const rotation = ((shape.rotation ?? 0) % 360 + 360) % 360;
  const textRotation = rotation > 90 && rotation < 270 ? rotation + 180 : rotation;
  const textTransform = textRotation ? `rotate(${textRotation} ${cx} ${cy})` : undefined;
  const radians = rotation * Math.PI / 180;
  const rotatedHeight = Math.abs(Math.sin(radians)) * ew + Math.abs(Math.cos(radians)) * eh;
  const uiScale = 1 / Math.max(0.01, zoom);
  const screenX = Math.max(8, Math.min(canvasWidth - toolbarWidth - 8, cx * zoom + viewport[0] - toolbarWidth / 2));
  const aboveY = (cy - rotatedHeight / 2) * zoom + viewport[1] - toolbarHeight - 8;
  const belowY = (cy + rotatedHeight / 2) * zoom + viewport[1] + 8;
  const screenY = Math.max(8, Math.min(canvasHeight - toolbarHeight - 8,
    aboveY >= 8 ? aboveY : belowY + toolbarHeight <= canvasHeight - 8 ? belowY : aboveY));
  const tx = (screenX - viewport[0]) * uiScale;
  const ty = (screenY - viewport[1]) * uiScale;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Keep the editable subtree browser-owned so formatting never resets the caret or native undo.
    for (const paragraph of initialText.split('\n')) {
      const block = document.createElement('div');
      if (paragraph) block.textContent = paragraph;
      else block.append(document.createElement('br'));
      el.append(block);
    }
    el.focus();
    // Select all so typing replaces; user can click to position caret.
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    return () => el.replaceChildren();
  }, [initialText]);

  useLayoutEffect(() => {
    if (ref.current) styleEditorParagraphs(ref.current, shape, editFit);
  }, [shape, editFit, liveText]);

  const finish = useCallback((commit: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (commit) onCommit(ref.current ? readShapeEditorText(ref.current) : '');
    else onCancel();
  }, [onCommit, onCancel]);

  useEffect(() => {
    const outside = (event: Event) => {
      if (event.target instanceof Node && !groupRef.current?.contains(event.target)) finish(true);
    };
    // Commit before a tab switch, save or other outside control reads the store.
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside);
    };
  }, [finish]);

  const focusText = () => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    el.focus();
    if (selectionRef.current && el.contains(selectionRef.current.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(selectionRef.current);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    // Stop the shape overlay's global Delete/Escape handlers from firing
    // while the editor is open.
    e.stopPropagation();
    if (e.nativeEvent.isComposing || composingRef.current || e.keyCode === 229) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      onStyleChange({ textBold: !shape.textBold });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) finish(true);
      else document.execCommand('insertParagraph');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
      return;
    }
  };

  const onBlur: React.FocusEventHandler<SVGGElement> = (event) => {
    const selection = window.getSelection();
    if (selection?.rangeCount && ref.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    if (!event.relatedTarget && event.target instanceof HTMLInputElement && event.target.type === 'color') return;
    const group = event.currentTarget;
    queueMicrotask(() => {
      if (!group.contains(document.activeElement)) finish(true);
    });
  };

  // The editor paints its text through `paintColor()`, so its backdrop has to
  // move with the theme too — a hardcoded white box meant near-white ink on
  // white paper in dark mode, i.e. invisible while typing. `paperFor` adds the
  // second half: literal White ink gets a dark paper in either theme.
  const bg = paperFor(paintTextColor(currentTextColor));

  return (
    <g ref={groupRef} data-nds-text-editor="1" onBlur={onBlur} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
    }}>
      {/* The actual editable field */}
      <foreignObject
        x={ex}
        y={ey}
        width={ew}
        height={eh}
        transform={textTransform}
        style={{ pointerEvents: 'auto' }}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: shape.kind === 'arrow' ? '0 6px' : undefined,
            boxSizing: 'border-box',
            borderRadius: 4,
            background: bg,
            outline: '2px solid var(--nds-accent)',
            outlineOffset: 0,
            overflow: 'auto',
          }}
        >
          <div
            ref={ref}
            data-nds-shape-text-input="1"
            role="textbox"
            aria-label={t('Shape text')}
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            onKeyDown={onKeyDown}
            onInput={event => {
              if (composingRef.current) return;
              styleEditorParagraphs(event.currentTarget, shape, editFit);
              setLiveText(readShapeEditorText(event.currentTarget));
            }}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={event => {
              composingRef.current = false;
              styleEditorParagraphs(event.currentTarget, shape, editFit);
              setLiveText(readShapeEditorText(event.currentTarget));
            }}
            onPaste={event => {
              event.preventDefault();
              event.stopPropagation();
              const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
              if (text) document.execCommand('insertText', false, text);
            }}
            style={{
              ...shapeTextCss(shape, editFit, paintTextColor(currentTextColor)),
              outline: 'none',
              userSelect: 'text',
              cursor: 'text',
              minHeight: '1em',
            }}
          />
        </div>
      </foreignObject>
      <g transform={`translate(${tx} ${ty}) scale(${uiScale})`}>
        <foreignObject x={0} y={0} width={toolbarWidth} height={toolbarHeight}
          style={{ pointerEvents: 'auto', overflow: 'visible' }}
          onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
          <ShapeTextToolbar shape={shape} onChange={onStyleChange} focusText={focusText}
            onHeightChange={setToolbarHeight} spaceAbove={screenY - 8}
            spaceBelow={canvasHeight - screenY - toolbarHeight - 8} />
        </foreignObject>
      </g>
    </g>
  );
}

function pickBoxSideTowards(c: ShapeCallout, p: Point): Point {
  // Choose the closest of the 4 midpoints.
  const midpoints: Point[] = [
    { x: c.x + c.w / 2, y: c.y },
    { x: c.x + c.w / 2, y: c.y + c.h },
    { x: c.x, y: c.y + c.h / 2 },
    { x: c.x + c.w, y: c.y + c.h / 2 },
  ];
  let best = midpoints[0];
  let bestD = Infinity;
  for (const m of midpoints) {
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

// v0.7.16 — same as pickBoxSideTowards but for a rotated callout box.
// Rotates each of the 4 edge midpoints around the box center by
// `rotDeg`, then picks the one whose rotated on-screen position is
// closest to the world-space anchor.
function pickRotatedBoxSideTowards(c: ShapeCallout, p: Point, rotDeg: number): Point {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (mx: number, my: number): Point => {
    const dx = mx - cx;
    const dy = my - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };
  const midpoints: Point[] = [
    rotate(c.x + c.w / 2, c.y),
    rotate(c.x + c.w / 2, c.y + c.h),
    rotate(c.x, c.y + c.h / 2),
    rotate(c.x + c.w, c.y + c.h / 2),
  ];
  let best = midpoints[0];
  let bestD = Infinity;
  for (const m of midpoints) {
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

// -------- selection handles --------------------------------------------

// v0.7.15 — added 'rotate' handle. Positioned above the top-center of the
// (unrotated) bounding box; drags around the shape center to change the
// shape's `rotation` field. Arrow shapes have no rotate handle because
// dragging their start/end endpoints already changes direction.
type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'start' | 'end' | 'anchor' | 'rotate';
interface HandleSpec {
  id: HandleId;
  x: number;
  y: number;
  cursor: string;
}

// v0.7.15 — degree of rotation the shape currently has. Absent = 0.
// Arrows always return 0 (they don't rotate — endpoints are the direction).
function shapeRotation(shape: Shape): number {
  // v0.7.16 — all four shape kinds (arrow, rect, ellipse, callout)
  // can now be rotated. Rotation is stored as an optional `rotation`
  // field in degrees on each shape.
  const r = (shape as { rotation?: number }).rotation;
  return typeof r === 'number' ? r : 0;
}

// v0.7.15 — center point of the shape (used as the rotation pivot AND
// as the anchor for the "rotate 15 px above the top" handle placement).
// v0.9.2 — double-click-to-type has always worked on every shape, but
// nothing on screen said so. This renders a faint centred prompt inside an
// empty shape while it is hovered. Purely an affordance: `pointerEvents`
// is off, so it never intercepts the double-click it is advertising.
function ShapeTextHint({ shape, label }: { shape: Shape; label: string }) {
  if (shape.kind === 'arrow') return null;

  const c = shapeCenter(shape);
  const w = shape.kind === 'ellipse' ? shape.rx * 2 : shape.w;
  const h = shape.kind === 'ellipse' ? shape.ry * 2 : shape.h;

  // Too small to read a sentence in — a hint that overflows its own shape
  // is worse than no hint.
  if (w < 70 || h < 34) return null;

  // v0.9.47 — the hint used to cap at 12 px, which on a normal 200×120
  // shape rendered as unreadable grey mist. It now scales with the shape.
  //
  // This is an SVG <text>, so it does NOT wrap — the wrap-aware `fitFontPx`
  // would happily hand back a size that "fits" on two lines and then
  // overflow horizontally. Canvas text width is linear in font size, so one
  // measurement at a reference size gives the exact width ceiling.
  const unitW = measureTextPx(label, 100) / 100;
  const fit = Math.min(
    Math.max(12, w / 9), // scales with the shape, but stays sane when huge
    (w - 28) / Math.max(0.0001, unitW), // never wider than the shape
    (h - 8) / 1.25 // never taller than the shape
  );

  // Below this the hint is mist, not a prompt. Clamping UP to a floor would
  // reintroduce the overflow the fit exists to prevent — a shape ~70-110 px
  // wide is simply too narrow for the sentence, so it gets no hint at all.
  // (The fixed `w < 70` test above cannot catch that on its own: it does not
  // know how wide the translated label actually is, and the string differs
  // per language.)
  const HINT_MIN_PX = 9;
  if (fit < HINT_MIN_PX) return null;
  const fontSize = Math.floor(fit);
  const rotation = shape.kind === 'callout' ? 0 : (shape.rotation ?? 0);

  return (
    <text
      x={c.x}
      y={c.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fontSize}
      fill="#94a3b8"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      transform={rotation ? `rotate(${rotation} ${c.x} ${c.y})` : undefined}
    >
      {label}
    </text>
  );
}

function shapeCenter(shape: Shape): Point {
  if (shape.kind === 'arrow') {
    return { x: (shape.from.x + shape.to.x) / 2, y: (shape.from.y + shape.to.y) / 2 };
  }
  if (shape.kind === 'ellipse') return { x: shape.cx, y: shape.cy };
  return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 };
}

// v0.7.15 — rotate a 2D vector (dx, dy) by `angleDeg` degrees around the
// origin. Used to un-rotate pointer deltas so `applyResize` can work in
// the shape's LOCAL (unrotated) frame even when the shape is visually
// rotated on screen.
function rotateVec(dx: number, dy: number, angleDeg: number): { x: number; y: number } {
  if (angleDeg === 0) return { x: dx, y: dy };
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function handlesFor(shape: Shape): HandleSpec[] {
  if (shape.kind === 'arrow') {
    // v0.7.16 — arrows can now rotate too. Place the rotate handle
    // perpendicular to the arrow line at the midpoint, on the "left"
    // side of the arrow direction (so for a right-pointing arrow the
    // handle sits above the midpoint). Because the arrow render group
    // is wrapped in the rotation transform, everything here is in the
    // LOCAL (pre-rotation) frame.
    const midX = (shape.from.x + shape.to.x) / 2;
    const midY = (shape.from.y + shape.to.y) / 2;
    const dx = shape.to.x - shape.from.x;
    const dy = shape.to.y - shape.from.y;
    const len = Math.hypot(dx, dy) || 1;
    // In SVG (y-down) coords, rotating the direction vector +90° CW
    // gives (dy, -dx). For a right-pointing arrow (dx>0, dy=0) that
    // is (0, -dx/len) → straight up, which is what we want.
    const perpX = dy / len;
    const perpY = -dx / len;
    const ROT_OFFSET = 26;
    return [
      { id: 'start', x: shape.from.x, y: shape.from.y, cursor: 'grab' },
      { id: 'end', x: shape.to.x, y: shape.to.y, cursor: 'grab' },
      { id: 'rotate', x: midX + perpX * ROT_OFFSET, y: midY + perpY * ROT_OFFSET, cursor: 'grab' },
    ];
  }
  if (shape.kind === 'rect' || shape.kind === 'callout') {
    const box = shape as ShapeRect | ShapeCallout;
    const list: HandleSpec[] = [
      { id: 'nw', x: box.x, y: box.y, cursor: 'nwse-resize' },
      { id: 'ne', x: box.x + box.w, y: box.y, cursor: 'nesw-resize' },
      { id: 'sw', x: box.x, y: box.y + box.h, cursor: 'nesw-resize' },
      { id: 'se', x: box.x + box.w, y: box.y + box.h, cursor: 'nwse-resize' },
    ];
    // v0.7.16 — both rect AND callout can rotate. The rotation handle
    // sits 26 flow-units above the top-center of the (unrotated) box.
    // SelectionUI applies the shape's rotation transform to the handle
    // as well, so on-screen it always appears "above" the visually
    // rotated top edge.
    list.push({ id: 'rotate', x: box.x + box.w / 2, y: box.y - 26, cursor: 'grab' });
    if (shape.kind === 'callout') {
      list.push({
        id: 'anchor',
        x: shape.anchor.x,
        y: shape.anchor.y,
        cursor: 'move',
      });
    }
    return list;
  }
  // ellipse
  return [
    { id: 'nw', x: shape.cx - shape.rx, y: shape.cy - shape.ry, cursor: 'nwse-resize' },
    { id: 'ne', x: shape.cx + shape.rx, y: shape.cy - shape.ry, cursor: 'nesw-resize' },
    { id: 'sw', x: shape.cx - shape.rx, y: shape.cy + shape.ry, cursor: 'nesw-resize' },
    { id: 'se', x: shape.cx + shape.rx, y: shape.cy + shape.ry, cursor: 'nwse-resize' },
    { id: 'rotate', x: shape.cx, y: shape.cy - shape.ry - 26, cursor: 'grab' },
  ];
}

// -------- drag state ----------------------------------------------------

type DragState =
  | null
  | {
      mode: 'creating';
      tool: Tool;
      origin: Point;
      current: Point;
      shift: boolean;
    }
  | {
      // Group move: N ≥ 1 shapes translate together by (currentDelta).
      mode: 'moving-group';
      shapeIds: string[];
      origin: Point;
      snapshots: Shape[];
      /**
       * v0.9.49 — resource cards wholly inside a dragged shape ride along
       * with it, so dragging a hand-drawn boundary box moves the topology
       * it encloses. Empty unless exactly one shape is being dragged and
       * Alt was not held.
       */
      nodeCargo: Array<{ id: string; x: number; y: number }>;
    }
  | {
      mode: 'resizing';
      shapeId: string;
      handle: HandleId;
      origin: Point;
      snapshot: Shape;
    }
  | {
      // v0.7.15 — rotation gesture. Started when the user grabs the
      // rotate handle above the shape. `snapshot` holds the pre-drag
      // shape; `initialAngle` is the angle from the shape center to the
      // pointer at drag-start (degrees, 0 = east). Each pointer move
      // computes the new angle and sets rotation = snapshot.rotation +
      // (currentAngle − initialAngle).
      mode: 'rotating';
      shapeId: string;
      origin: Point;
      snapshot: Shape;
      initialAngleDeg: number;
    }
  | {
      // Alt+drag marquee for area-select. `additive` starts true when the
      // user held Shift at drag-start (extend existing selection instead of
      // replacing it).
      mode: 'marquee';
      origin: Point;
      current: Point;
      additive: boolean;
      preSelection: string[];
    }
  | {
      // v0.7.20 — arrow-connect gesture. Started when the user grabs a
      // connection-anchor dot on a rect/ellipse/callout and drags outward.
      // The drag previews the connection exactly the way a resource
      // handle does — React Flow's own connection line — and on release
      // either commits a real DiagramEdge or commits nothing at all.
      mode: 'connecting';
      fromShapeId: string;
      fromPoint: Point;
      current: Point;
      /** v0.9.30 — the side the anchor sits on, so the preview can leave
       *  the shape in the same direction React Flow's connection line
       *  leaves a handle. */
      fromSide: 'n' | 'e' | 's' | 'w';
      /** v0.9.57 — the exact connect dot this drag STARTED from, so the
       *  committed edge pins to it instead of the nearest side midpoint. */
      fromRef: ShapeEndRef | null;
      /** ID of shape currently being previewed as connection target (for
       *  the highlight ring). null when dragging over empty canvas. */
      targetShapeId: string | null;
      /** v0.9.57 — the connect dot under the pointer, mirroring `rebinding`.
       *  Null while over empty canvas or over a body (a floating drop). */
      targetRef: ShapeEndRef | null;
    }
  | {
      // v0.9.27 — dragging an EXISTING arrow's start/end handle. Separate
      // from `resizing` because releasing over a shape or node must BIND
      // the endpoint, and releasing over empty canvas must UNBIND it.
      mode: 'rebinding';
      shapeId: string;
      end: 'start' | 'end';
      snapshot: ShapeArrow;
      current: Point;
      targetShapeId: string | null;
      targetRef: ShapeEndRef | null;
    };

// Demo v0.6: bundle of the CURRENT style variants for every shape tool. We
// pass this into draftShapeFrom so a freshly-created shape carries the
// user's chosen dash / head / corner / fill / thickness. Also drives the
// `color` and legacy `width` fallback for backwards-compat call sites.
export interface DraftStyles {
  color: string;
  fallbackWidth: number;
  arrow: ArrowStyle;
  rect: BoxStyle;
  ellipse: EllipseStyle;
  callout: CalloutStyle;
}

// Demo v0.6: BoxStyle.fill / EllipseStyle.fill → fillOpacity (0..1).
function fillPresetToOpacity(fill: 'none' | 'tint' | 'solid'): number {
  if (fill === 'none') return 0;
  if (fill === 'solid') return 0.4;
  return DEFAULT_FILL_OPACITY; // 'tint'
}

/**
 * Build a default-size shape centered at the given world-space point,
 * using the current style state for the tool. Used by
 * AnnotationToolbar so clicking Arrow / Rect / Ellipse / Callout drops a
 * ready-to-use shape at the viewport center — no drag required. Users can
 * still drag on the canvas to draw a custom-size shape.
 */
export function buildDefaultShapeAt(
  kind: 'shape-arrow' | 'shape-rect' | 'shape-ellipse' | 'shape-callout',
  center: Point,
  styles: DraftStyles
): Shape {
  const { color, arrow, rect, ellipse, callout } = styles;
  const id = `sh_${Math.random().toString(36).slice(2, 10)}`;
  if (kind === 'shape-arrow') {
    // v0.7.9: when the current arrow variant is 'elbow', place `from` and
    // `to` on DIFFERENT y-coords so buildArrowPathD emits a real
    // two-segment 90° polyline. If from.y === to.y the elbow branch
    // collapses to a straight line (dy = 0), which is why picking Elbow
    // then clicking the toolbar previously produced a straight arrow.
    // Straight / Curved keep the original horizontal drop for
    // backwards-compat.
    const isElbow = arrow.shape === 'elbow';
    const fromPt = isElbow
      ? { x: center.x - 80, y: center.y - 40 }
      : { x: center.x - 80, y: center.y };
    const toPt = isElbow
      ? { x: center.x + 80, y: center.y + 40 }
      : { x: center.x + 80, y: center.y };
    return {
      id,
      kind: 'arrow',
      from: fromPt,
      to: toPt,
      color,
      width: arrow.thickness,
      dash: arrow.dash,
      head: arrow.head,
      shape: arrow.shape,
      textSize: arrow.textSize,
    };
  }
  if (kind === 'shape-rect') {
    // 200 × 120 rectangle centered.
    return {
      id,
      kind: 'rect',
      x: center.x - 100,
      y: center.y - 60,
      w: 200,
      h: 120,
      color,
      width: rect.thickness,
      fillOpacity: fillPresetToOpacity(rect.fill),
      dash: rect.dash,
      corner: rect.corner,
      fill: rect.fill,
      textSize: rect.textSize,
    };
  }
  if (kind === 'shape-ellipse') {
    // rx=100, ry=60 centered.
    return {
      id,
      kind: 'ellipse',
      cx: center.x,
      cy: center.y,
      rx: 100,
      ry: 60,
      color,
      width: ellipse.thickness,
      fillOpacity: fillPresetToOpacity(ellipse.fill),
      dash: ellipse.dash,
      fill: ellipse.fill,
      textSize: ellipse.textSize,
    };
  }
  // callout: 180 × 90 box with leader line pointing down-right.
  const x = center.x - 90;
  const y = center.y - 45;
  return {
    id,
    kind: 'callout',
    x,
    y,
    w: 180,
    h: 90,
    anchor: { x: x + 180 + 60, y: y + 90 + 60 },
    text: 'Note',
    color,
    width: callout.thickness,
    dash: callout.dash,
    corner: callout.corner,
    textSize: callout.textSize,
  };
}

function draftShapeFrom(d: Extract<DragState, { mode: 'creating' }>, styles: DraftStyles): Shape | null {
  const { color, arrow, rect, ellipse, callout } = styles;
  const from = d.origin;
  const rawTo = d.current;
  if (d.tool === 'shape-arrow') {
    const to = d.shift ? snap45(from, rawTo) : rawTo;
    return {
      id: '__draft__',
      kind: 'arrow',
      from,
      to,
      color,
      width: arrow.thickness,
      dash: arrow.dash,
      head: arrow.head,
      shape: arrow.shape,
      textSize: arrow.textSize,
    };
  }
  const dx = rawTo.x - from.x;
  const dy = rawTo.y - from.y;
  if (d.tool === 'shape-rect') {
    let w = dx;
    let h = dy;
    if (d.shift) {
      const sz = Math.max(Math.abs(w), Math.abs(h));
      w = sz * Math.sign(w || 1);
      h = sz * Math.sign(h || 1);
    }
    const norm = normalizeBox(from.x, from.y, w, h);
    return {
      id: '__draft__',
      kind: 'rect',
      x: norm.x,
      y: norm.y,
      w: norm.w,
      h: norm.h,
      color,
      width: rect.thickness,
      fillOpacity: fillPresetToOpacity(rect.fill),
      dash: rect.dash,
      corner: rect.corner,
      fill: rect.fill,
      textSize: rect.textSize,
    };
  }
  if (d.tool === 'shape-ellipse') {
    let w = dx;
    let h = dy;
    if (d.shift) {
      const sz = Math.max(Math.abs(w), Math.abs(h));
      w = sz * Math.sign(w || 1);
      h = sz * Math.sign(h || 1);
    }
    const norm = normalizeBox(from.x, from.y, w, h);
    return {
      id: '__draft__',
      kind: 'ellipse',
      cx: norm.x + norm.w / 2,
      cy: norm.y + norm.h / 2,
      rx: norm.w / 2,
      ry: norm.h / 2,
      color,
      width: ellipse.thickness,
      fillOpacity: fillPresetToOpacity(ellipse.fill),
      dash: ellipse.dash,
      fill: ellipse.fill,
      textSize: ellipse.textSize,
    };
  }
  if (d.tool === 'shape-callout') {
    const norm = normalizeBox(from.x, from.y, dx, dy);
    // Default anchor: 60 px below-right of the box.
    const anchor: Point = { x: norm.x + norm.w + 60, y: norm.y + norm.h + 60 };
    return {
      id: '__draft__',
      kind: 'callout',
      x: norm.x,
      y: norm.y,
      w: norm.w,
      h: norm.h,
      anchor,
      text: '',
      color,
      width: callout.thickness,
      dash: callout.dash,
      corner: callout.corner,
      textSize: callout.textSize,
    };
  }
  return null;
}

function applyMove(prev: Shape, dx: number, dy: number): Shape {
  if (prev.kind === 'arrow') {
    return {
      ...prev,
      from: { x: prev.from.x + dx, y: prev.from.y + dy },
      to: { x: prev.to.x + dx, y: prev.to.y + dy },
    };
  }
  if (prev.kind === 'rect') return { ...prev, x: prev.x + dx, y: prev.y + dy };
  if (prev.kind === 'ellipse') return { ...prev, cx: prev.cx + dx, cy: prev.cy + dy };
  // callout: move box AND anchor together
  return {
    ...prev,
    x: prev.x + dx,
    y: prev.y + dy,
    anchor: { x: prev.anchor.x + dx, y: prev.anchor.y + dy },
  };
}

/**
 * Screen-space dead zone before a move is allowed to detach an arrow. A
 * click that jiggles a pixel or two must not silently unbind anything.
 */
const MOVE_DETACH_PX = 3;

/**
 * Moving an arrow DETACHES it from whatever it was bound to.
 *
 * `resolveShapes` re-derives a bound endpoint from its ref on every render,
 * so an arrow carrying a `fromRef` / `toRef` cannot be dragged away from its
 * target: the bound end snaps straight back each frame and the arrow stays
 * glued to — and overlapping — the shape. A floating ref resolves to the
 * outline point facing the other end, which for a diagonal approach is the
 * target's corner, so the arrowhead visibly sits ON the object.
 *
 * Translating an arrow is a deliberate act of repositioning, so the gesture
 * drops the bindings and the arrow lands exactly where it was dropped.
 *
 * A ref is KEPT when its target travels in the same gesture: dragging a
 * shape together with an arrow attached to it (or a boundary box carrying
 * its enclosed resources) is not a detach — everything simply moves by the
 * same delta, and the binding is still true afterwards.
 */
function detachMovedArrow(next: Shape, movingIds: ReadonlySet<string>): Shape {
  if (next.kind !== 'arrow') return next;
  const holds = (ref: ShapeEndRef | undefined) => Boolean(ref) && !movingIds.has(ref!.id);
  if (!holds(next.fromRef) && !holds(next.toRef)) return next;
  const out: ShapeArrow = { ...next };
  if (holds(out.fromRef)) delete out.fromRef;
  if (holds(out.toRef)) delete out.toRef;
  return out;
}


function applyResize(prev: Shape, handle: HandleId, dx: number, dy: number): Shape {
  // v0.7.18 — BUG 1 fix. Compute the raw resize in the shape-LOCAL frame,
  // then (for rotated shapes) translate the result so the OPPOSITE corner
  // stays pinned in world space. Without this correction, rotating a
  // shape and then resizing causes the shape to visibly drift because the
  // rotation pivot (its center) is moved by the resize while the rotation
  // angle stays the same.
  let next: Shape;
  if (prev.kind === 'arrow') {
    if (handle === 'start') next = { ...prev, from: { x: prev.from.x + dx, y: prev.from.y + dy } };
    else if (handle === 'end') next = { ...prev, to: { x: prev.to.x + dx, y: prev.to.y + dy } };
    else return prev;
  } else if (prev.kind === 'rect' || prev.kind === 'callout') {
    if (prev.kind === 'callout' && handle === 'anchor') {
      // Anchor is world-space and never triggers "pin opposite" logic.
      return { ...prev, anchor: { x: prev.anchor.x + dx, y: prev.anchor.y + dy } };
    }
    let { x, y, w, h } = prev;
    if (handle === 'nw') {
      x += dx; y += dy; w -= dx; h -= dy;
    } else if (handle === 'ne') {
      y += dy; w += dx; h -= dy;
    } else if (handle === 'sw') {
      x += dx; w -= dx; h += dy;
    } else if (handle === 'se') {
      w += dx; h += dy;
    }
    // Clamping w/h alone is not enough for the handles that move the origin:
    // dragging NW past the SE corner drives w negative, and while w snaps back
    // to the minimum, x keeps tracking the cursor — so the shape detaches from
    // the corner that is supposed to stay pinned and flies off with the mouse.
    // Pull the moved edge back so the opposite edge holds still.
    const movesX = handle === 'nw' || handle === 'sw';
    const movesY = handle === 'nw' || handle === 'ne';
    if (w < MIN_SHAPE_SIZE) {
      if (movesX) x = prev.x + prev.w - MIN_SHAPE_SIZE;
      w = MIN_SHAPE_SIZE;
    }
    if (h < MIN_SHAPE_SIZE) {
      if (movesY) y = prev.y + prev.h - MIN_SHAPE_SIZE;
      h = MIN_SHAPE_SIZE;
    }
    next = { ...prev, x, y, w, h };
  } else {
    // ellipse — bounding box approach
    const { cx, cy, rx, ry } = prev;
    let bx = cx - rx, by = cy - ry, bw = rx * 2, bh = ry * 2;
    const px = bx, py = by, pw = bw, ph = bh;
    if (handle === 'nw') { bx += dx; by += dy; bw -= dx; bh -= dy; }
    else if (handle === 'ne') { by += dy; bw += dx; bh -= dy; }
    else if (handle === 'sw') { bx += dx; bw -= dx; bh += dy; }
    else if (handle === 'se') { bw += dx; bh += dy; }
    // Same origin-correction as the rect branch above.
    const movesX = handle === 'nw' || handle === 'sw';
    const movesY = handle === 'nw' || handle === 'ne';
    if (bw < MIN_SHAPE_SIZE) {
      if (movesX) bx = px + pw - MIN_SHAPE_SIZE;
      bw = MIN_SHAPE_SIZE;
    }
    if (bh < MIN_SHAPE_SIZE) {
      if (movesY) by = py + ph - MIN_SHAPE_SIZE;
      bh = MIN_SHAPE_SIZE;
    }
    next = {
      ...prev,
      cx: bx + bw / 2,
      cy: by + bh / 2,
      rx: bw / 2,
      ry: bh / 2,
    };
  }
  return pinOppositeCornerWorld(prev, next, handle);
}

// v0.7.18 — Given a shape BEFORE and AFTER a local-frame resize, translate
// the AFTER shape so the corner/endpoint OPPOSITE the dragged handle stays
// at the same WORLD-space position as it was before the drag. This is the
// standard "opposite corner stays pinned" behavior of PowerPoint / Figma /
// draw.io when resizing a rotated shape.
function pinOppositeCornerWorld(prev: Shape, next: Shape, handle: HandleId): Shape {
  const rot = shapeRotation(prev);
  if (!rot) return next;
  if (handle === 'rotate' || handle === 'anchor') return next;
  const before = fixedCornerWorld(prev, handle);
  const after = fixedCornerWorld(next, handle);
  if (!before || !after) return next;
  const tx = before.x - after.x;
  const ty = before.y - after.y;
  return translateShapeGeometry(next, tx, ty);
}

// The "fixed corner" is the local coordinate of the corner/endpoint
// opposite the dragged handle. For a corner handle it's the diagonally
// opposite corner of the AABB; for an arrow endpoint it's the other
// endpoint. Returns the WORLD position of that point (rotation applied).
function fixedCornerWorld(sh: Shape, handle: HandleId): Point | null {
  const rot = shapeRotation(sh);
  const c = shapeCenter(sh);
  let local: Point | null = null;
  if (sh.kind === 'arrow') {
    if (handle === 'start') local = { x: sh.to.x, y: sh.to.y };
    else if (handle === 'end') local = { x: sh.from.x, y: sh.from.y };
  } else if (sh.kind === 'rect' || sh.kind === 'callout') {
    if (handle === 'nw') local = { x: sh.x + sh.w, y: sh.y + sh.h };
    else if (handle === 'ne') local = { x: sh.x, y: sh.y + sh.h };
    else if (handle === 'sw') local = { x: sh.x + sh.w, y: sh.y };
    else if (handle === 'se') local = { x: sh.x, y: sh.y };
  } else if (sh.kind === 'ellipse') {
    const bx = sh.cx - sh.rx, by = sh.cy - sh.ry;
    const bw = sh.rx * 2, bh = sh.ry * 2;
    if (handle === 'nw') local = { x: bx + bw, y: by + bh };
    else if (handle === 'ne') local = { x: bx, y: by + bh };
    else if (handle === 'sw') local = { x: bx + bw, y: by };
    else if (handle === 'se') local = { x: bx, y: by };
  }
  if (!local) return null;
  const v = rotateVec(local.x - c.x, local.y - c.y, rot);
  return { x: c.x + v.x, y: c.y + v.y };
}

// Translate all geometric coordinates of a shape by (tx, ty). Rotation
// and non-positional fields (color, text, etc.) are preserved.
function translateShapeGeometry(sh: Shape, tx: number, ty: number): Shape {
  return translateShapeGeom(sh, tx, ty);
}

// -------- multi-select helpers ----------------------------------------

function boxesIntersect(a: BBox, b: BBox): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function resolveNestedShapeAt(shapes: readonly Shape[], hit: Shape, hits: ReadonlySet<string>): Shape {
  if (hit.kind === 'arrow') return hit;
  const outer = rotatedShapeBounds(hit);
  let best: Shape | null = null;
  let bestArea = Infinity;
  for (const sh of [...shapes].reverse()) {
    if (sh.id === hit.id || !hits.has(sh.id)) continue;
    const b = rotatedShapeBounds(sh);
    if (!boxNestedIn(b, outer)) continue;
    const area = b.w * b.h;
    if (area < bestArea) {
      bestArea = area;
      best = sh;
    }
  }
  return best ?? hit;
}

// -------- connection anchors (arrow-drag from shape edges) -------------

// v0.7.20 — the four side-midpoint anchors on a shape. These are the
// "handles" a user grabs to drag a new arrow OUT of a shape. Arrows are
// themselves the connectors, so they don't expose anchors of their own.
interface ConnectAnchor {
  side: 'n' | 'e' | 's' | 'w';
  x: number;
  y: number;
}

function shapeConnectAnchors(shape: Shape): ConnectAnchor[] {
  if (shape.kind === 'arrow') return [];
  return rotateAnchors(shape, shapeSideAnchors(shape, [0.5]));
}

/**
 * Extra connect dots at 25 % and 75 % along each side, on top of the four
 * midpoints above — 12 per shape instead of 4, matching what a resource
 * card now offers (see canvas/handles.tsx).
 *
 * They behave identically to a midpoint anchor: same `side`, same
 * `onAnchorPointerDown`, same commit path. Only the grab point differs.
 *
 * ⚠️ They are tagged with their OWN data attributes
 * (`data-nds-shape-connect-dot…`) rather than reusing
 * `data-nds-shape-connect-anchor…`, so "the anchor on side e of shape X"
 * stays a single, unambiguous element for anything that addresses one.
 */
function shapeConnectDots(shape: Shape): ConnectAnchor[] {
  if (shape.kind === 'arrow') return [];
  return rotateAnchors(shape, shapeSideAnchors(shape, [0.25, 0.75]));
}

/** Points at the given fractions along each of the four sides, in the
 *  shape's own unrotated frame. */
function shapeSideAnchors(shape: Shape, fractions: number[]): ConnectAnchor[] {
  if (shape.kind === 'arrow') return [];
  let x = 0, y = 0, w = 0, h = 0;
  if (shape.kind === 'rect' || shape.kind === 'callout') {
    x = shape.x; y = shape.y; w = shape.w; h = shape.h;
  } else {
    x = shape.cx - shape.rx; y = shape.cy - shape.ry;
    w = shape.rx * 2; h = shape.ry * 2;
  }
  const out: ConnectAnchor[] = [];
  for (const f of fractions) {
    out.push(
      { side: 'n', x: x + w * f, y },
      { side: 'e', x: x + w,     y: y + h * f },
      { side: 's', x: x + w * f, y: y + h },
      { side: 'w', x,            y: y + h * f },
    );
  }
  return out;
}

/** Apply the shape's rotation around its centre so anchor positions are
 *  reported in WORLD coordinates (matching what the user sees). */
function rotateAnchors(shape: Shape, sides: ConnectAnchor[]): ConnectAnchor[] {
  const rot = shapeRotation(shape);
  if (rot === 0) return sides;
  const center = shapeCenter(shape);
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return sides.map((s) => {
    const dx = s.x - center.x;
    const dy = s.y - center.y;
    return {
      side: s.side,
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  });
}

/** v0.9.27 — superseded by `pickTargetAt` / `refForDrop` in
 *  `shape-binding.ts`, which also understand diagram NODES as drop targets
 *  and return a binding rather than a bare coordinate. */

/** Dashed ring marking the drop target during a connect / rebind drag.
 *  Takes a `BindTarget` rather than a `Shape` so diagram nodes highlight
 *  identically to annotation shapes. */
function BindTargetRing({ target }: { target: BindTarget | undefined }) {
  if (!target) return null;
  const rot = target.rotation;
  const xf = rot ? `rotate(${rot} ${target.cx} ${target.cy})` : undefined;
  return (
    <g transform={xf} data-nds-bind-target={target.id}>
      <rect
        x={target.cx - target.hw - 6}
        y={target.cy - target.hh - 6}
        width={target.hw * 2 + 12}
        height={target.hh * 2 + 12}
        fill="none"
        stroke="#0078d4"
        strokeOpacity={0.6}
        strokeWidth={2}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
        rx={8}
      />
    </g>
  );
}

/**
 * v0.9.56 — the dot on the end of a connection that is being dragged.
 *
 * Answers one question the preview line could not: "if I let go RIGHT NOW,
 * where does this land?" Two states:
 *
 *   locked=false  hollow white dot with an accent rim — floating. The line
 *                 tip is wherever the pointer is and nothing will be bound.
 *   locked=true   solid accent dot with a white rim and a halo — the tip has
 *                 SNAPPED to a real anchor, and releasing binds there.
 *
 * Radii divide by zoom so the marker keeps one constant size on screen, the
 * same trick the shape anchors use. Purely decorative: it must never take a
 * pointer event, or it would sit under the cursor and eat the drop it exists
 * to describe.
 */
function ConnectEndpointDot({
  at,
  locked,
  zoom,
}: {
  at: Point;
  locked: boolean;
  zoom: number;
}) {
  const k = Math.max(0.2, zoom);
  const r = 7 / k;
  const inv = 1 / k;
  return (
    <g
      data-nds-connect-endpoint={locked ? 'locked' : 'free'}
      style={{ pointerEvents: 'none' }}
    >
      <circle
        cx={at.x}
        cy={at.y}
        r={r * 2.2}
        fill={locked ? 'rgba(0, 120, 212, 0.20)' : 'rgba(15, 23, 42, 0.10)'}
      />
      <circle
        cx={at.x}
        cy={at.y}
        r={r}
        fill={locked ? '#0078d4' : '#ffffff'}
        stroke={locked ? '#ffffff' : '#0078d4'}
        strokeWidth={2.5 * inv}
      />
    </g>
  );
}

// -------- component ----------------------------------------------------

export function ShapeOverlay() {
  const rf = useReactFlow();
  const connectClipPrefix = useId();
  const zoom = useStore(s => s.transform[2]);
  const t = useT();

  const tool = useAnnotationStore((s) => s.tool);
  const color = useAnnotationStore((s) => s.color);
  const width = useAnnotationStore((s) => s.width);
  const selectedShapeIds = useAnnotationStore((s) => s.selectedShapeIds);
  const pickedObject = useAnnotationStore(s => s.pickedObject);
  const selectedNodeId = useDiagramStore(s => s.selectedNodeId);
  const pickedShapeId = pickedObject?.kind === 'shape' && selectedShapeIds.includes(pickedObject.id) ? pickedObject.id : null;
  const pickedNodeId = pickedObject?.kind === 'node' && selectedNodeId === pickedObject.id ? pickedObject.id : null;
  const setTool = useAnnotationStore((s) => s.setTool);
  const setSelectedShapes = useAnnotationStore((s) => s.setSelectedShapes);
  const clearShapeSelection = useAnnotationStore((s) => s.clearShapeSelection);
  // Demo v0.6: per-tool style variants used when creating a new shape.
  const arrowStyle = useAnnotationStore((s) => s.arrowStyle);
  const rectStyle = useAnnotationStore((s) => s.rectStyle);
  const ellipseStyle = useAnnotationStore((s) => s.ellipseStyle);
  const calloutStyle = useAnnotationStore((s) => s.calloutStyle);

  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const addShape = useTabsStore((s) => s.addShape);
  const updateShape = useTabsStore((s) => s.updateShape);
  const updateShapes = useTabsStore((s) => s.updateShapes);
  const deleteShape = useTabsStore((s) => s.deleteShape);
  const deleteShapes = useTabsStore((s) => s.deleteShapes);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const rawShapes = useMemo(() => activeTab?.shapes ?? [], [activeTab]);
  const syncArrowEnds = useTabsStore((s) => s.syncArrowEnds);

  // v0.9.27 — arrows may be BOUND to a shape or to a diagram node, and a
  // bound end has to follow its target. Two things are needed for that:
  //
  //   1. node geometry, which lives in the React Flow store, not ours; and
  //   2. a re-render when a node moves, which ShapeOverlay did not get
  //      before — it only subscribed to the viewport.
  //
  // `nodeLookup` is a Map that React Flow MUTATES in place, so subscribing
  // to it directly never fires. Derive a cheap signature string instead, and
  // only when at least one arrow actually references a node, so a diagram
  // with no node bindings pays nothing on every node drag.
  // Which node ids EXIST. Read from the diagram store, not from React Flow.
  //
  // These are two different questions with two different right answers:
  //   existence -> the diagram store, which is authoritative and updates
  //                synchronously;
  //   geometry  -> React Flow, which is the only thing that knows how big a
  //                node rendered.
  //
  // Reading existence from React Flow as well looks tidier and loses data:
  // when a file is opened, the shapes land before React Flow has mounted the
  // new nodes, so every node ref in the file is judged dangling and pruned —
  // opening a saved diagram would silently destroy every arrow bound to a
  // resource. Same class of bug as the re-measure gap below, one step
  // earlier in the lifecycle.
  const nodeIdSig = useDiagramStore(
    useCallback((s: { diagram: { nodes: { id: string }[] } }) => {
      let sig = '';
      for (const n of s.diagram.nodes) sig += `${n.id};`;
      return sig;
    }, []),
  );

  // A signature of every node's absolute position and measured size, in the
  // form `id:x,y,wxh;` — which is also, deliberately, everything a NodeBox
  // needs. `bindTargets` parses its boxes straight back out of this string
  // rather than re-reading React Flow, so the geometry that triggers a
  // recompute is guaranteed to be the geometry that gets used. Reading it
  // twice is how a node ends up in the map at its pre-measurement size.
  //
  // `nodeLookup` is a Map React Flow MUTATES IN PLACE, so subscribing to it
  // directly never re-renders — the reference is always identical. Deriving
  // a string forces a real comparison.
  //
  // This is deliberately NOT gated on "does any arrow already bind to a
  // node". That gate looks like a free optimisation and is actually a
  // chicken-and-egg bug: node boxes are only usable once React Flow has
  // MEASURED them, a frame or two after the node mounts. With the gate on,
  // that measurement never triggers a recompute, so nodes sit in
  // `bindTargets` at zero size, get skipped, and the FIRST binding to a node
  // can never be made. Cost is one O(nodes) string build per React Flow
  // store update, the same order as React Flow's own per-tick work.
  const nodeSig = useStore(
    useCallback((s: { nodeLookup: Map<string, unknown> }) => {
      let sig = '';
      (s.nodeLookup as Map<string, InternalNodeLike>).forEach((n) => {
        const p = n.internals?.positionAbsolute ?? n.position;
        const w = n.measured?.width ?? 0;
        const h = n.measured?.height ?? 0;
        sig += `${n.id}|${p?.x ?? 0}|${p?.y ?? 0}|${w}|${h}|${n.type ?? ''};`;
      });
      return sig;
    }, []),
  );

  const { bindTargets, liveTargetIds, nodeBoxes } = useMemo(() => {
    const live = new Set<string>();
    for (const id of nodeIdSig.split(';')) if (id) live.add(id);
    const boxes: NodeBox[] = [];
    for (const entry of nodeSig.split(';')) {
      if (!entry) continue;
      const [id, x, y, w, h, type] = entry.split('|');
      // Routing-only shape anchors are not resources. Their rounded bounds
      // must neither punch holes in shapes nor replace shape binding geometry.
      if (!live.has(id)) continue;
      const nw = Number(w);
      const nh = Number(h);
      // 0×0 means "not measured yet" — no usable geometry this render. It
      // reappears the moment measurement updates the signature.
      if (!(nw > 0 && nh > 0)) continue;
      boxes.push({
        id,
        x: Number(x),
        y: Number(y),
        w: nw,
        h: nh,
        container: type === 'azureGroup',
      });
    }
    for (const s of rawShapes) live.add(s.id);
    return {
      bindTargets: buildBindTargets(rawShapes, boxes),
      liveTargetIds: live,
      nodeBoxes: boxes,
    };
  }, [rawShapes, nodeSig, nodeIdSig]);

  const { shapes: resolvedShapes, syncs } = useMemo(
    () => resolveShapes(rawShapes, bindTargets, liveTargetIds),
    [rawShapes, bindTargets, liveTargetIds],
  );

  /* v0.9.54 — drop feedback for React Flow's OWN connection gesture (the one
     that starts on a resource card's connect handle). RF only ever highlights
     its own handles, and a shape has none, so dragging an arrow from a VM
     toward a rectangle previously gave the user no sign that releasing there
     would work. This paints the same ring the overlay's connect gesture uses.

     v0.9.55 — the ring now covers RESOURCE cards too, and is suppressed the
     moment RF's own connection turns valid. Those two rules together make the
     affordance exactly the set of drops `Canvas.onConnectEnd` will commit:
     while `isValid` is true RF has a handle and draws its own highlight;
     while it is not, whatever `pickTargetAt` returns here is precisely what
     releasing will connect to. Restricting the ring to shapes left the
     "release on a card's body" case — which now works — with no feedback at
     all, and painting it during a valid handle drop would double up on RF. */
  const rfConnection = useConnection();
  /* Extracted as a boolean on purpose: `rfConnection` is a NEW object on
     every pointer move of a React Flow drag, so putting it in an effect's
     dependency list tears the effect down and rebuilds it dozens of times a
     second. The anchor-reveal effect only cares whether a drag is happening. */
  const rfConnecting = rfConnection.inProgress;
  const rfConnectTargetId = useMemo(() => {
    if (!rfConnection.inProgress || rfConnection.isValid) return null;
    // NOTE the asymmetry with `Canvas.onConnectEnd`: `useConnection()` already
    // runs its result through `pointToRendererPoint`, so `to` here is WORLD
    // space and must NOT be divided by the viewport again. The
    // `FinalConnectionState` handed to `onConnectEnd` is raw RENDERER space
    // and does need converting. Same field name, two different spaces —
    // measured, not assumed; see the v0.9.55 note in README.md.
    const hit = pickTargetAt(
      rfConnection.to,
      bindTargets,
      null,
      CONTAINER_EDGE_BAND_PX / zoom,
      BIND_SLACK_PX / zoom,
    );
    // Releasing back on the card the drag started from cancels the gesture,
    // so it must not advertise itself as a target.
    return hit && hit.id !== rfConnection.fromNode?.id ? hit.id : null;
  }, [rfConnection, bindTargets, zoom]);

  // Write the resolved coordinates back so `from`/`to` stay honest: that is
  // what lets a deleted target leave the arrow frozen in place rather than
  // snapping back to wherever it was first drawn. Runs in an effect (never
  // during render) and is a no-op once everything agrees.
  useEffect(() => {
    if (syncs.length > 0) syncArrowEnds(syncs);
  }, [syncs, syncArrowEnds]);

  const shapes = resolvedShapes;
  const pickedNodeBox = pickedNodeId ? nodeBoxes.find(node => node.id === pickedNodeId) : undefined;
  const paintedShapes = useMemo(() => pickedShapeId
    ? [...shapes.filter(shape => shape.id !== pickedShapeId), ...shapes.filter(shape => shape.id === pickedShapeId)]
    : shapes, [shapes, pickedShapeId]);

  /**
   * v0.9.29 — turn a completed connect gesture into a REAL diagram edge.
   *
   * A connection between two boxes is the same object whether the boxes are
   * resource cards or hand-drawn shapes: a `DiagramEdge`, with a kind, a
   * colour, a line style, a label and a state, drawn by React Flow, editable
   * from the inline edge toolbar and the SELECTED EDGE panel. Users build
   * network diagrams out of shapes as much as out of resources, so anything
   * less than that leaves half the canvas second-class.
   *
   * Returns the new edge id, or `null` when this gesture is NOT a connection
   * and the caller should fall back to drawing a `ShapeArrow` annotation:
   *
   *   • one end (or neither) landed on nothing — a half-attached arrow is a
   *     deliberate free annotation, e.g. pointing at a region of the canvas;
   *   • both ends landed on the SAME box — a self-loop has no meaning here;
   *   • an end is not connectable. `bindTargets` is the single predicate for
   *     that, so a callout — which can start a drag but can never be bound
   *     to — keeps producing an annotation arrow rather than an edge that
   *     could never be rendered.
   */
  const commitConnection = useCallback(
    (
      fromId: string | null,
      toId: string | null,
      refs?: { from?: ShapeEndRef | null; to?: ShapeEndRef | null },
    ): string | null => {
      if (!fromId || !toId || fromId === toId) return null;
      if (!bindTargets.has(fromId) || !bindTargets.has(toId)) return null;
      const store = useDiagramStore.getState();
      // v0.9.57 — carry the DOT the user aimed at into the edge.
      //
      // Until now this called `addEdge(from, to)` with no handles, so every
      // shape-to-shape connection came out auto-routed: the preview snapped
      // to a quarter dot, the release threw that away, and the finished edge
      // attached to a side midpoint. Reported as "I see the dots, but I can
      // only connect to the middle circle".
      //
      // A floating ref yields no key, which correctly leaves the endpoint
      // auto-routed — dropping on a body still means "attach to this thing,
      // wherever it faces".
      const sourceKey = handleKeyForAnchor(refs?.from?.anchor);
      const targetKey = handleKeyForAnchor(refs?.to?.anchor);
      const edgeId = store.addEdge(fromId, toId, {
        ...(sourceKey ? { sourceHandle: `s-${sourceKey}` } : {}),
        ...(targetKey ? { targetHandle: `t-${targetKey}` } : {}),
      });
      if (!edgeId) return null;
      clearShapeSelection();
      store.selectEdge(edgeId);
      // Same one-flow naming affordance a resource-to-resource connection
      // gets in Canvas's `onConnect`.
      store.setPendingEdgeLabelEditId(edgeId);
      return edgeId;
    },
    [bindTargets, clearShapeSelection],
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const shapeConnecting = drag?.mode === 'connecting';
  useLayoutEffect(() => {
    const host = svgRef.current?.closest('[data-nds-fullscreen-target]');
    if (!host || !shapeConnecting) return;
    // A canvas-wide :has(preview) invalidates every handle during ordinary drags.
    host.setAttribute('data-nds-shape-connecting', '1');
    return () => host.removeAttribute('data-nds-shape-connecting');
  }, [shapeConnecting]);
  const placement = usePlacementFeedback();
  const canvasWidth = useStore(state => state.width);
  const canvasHeight = useStore(state => state.height);
  useEffect(() => {
    if (!CANVAS_PLACEMENT_FEEDBACK) return;
    setDrag(null);
    clearPlacementFeedback();
  }, [activeTabId]);
  useEffect(() => {
    if (!CANVAS_PLACEMENT_FEEDBACK || !drag) return;
    const stop = () => { finishShapeFeedbackGesture(drag); setDrag(null); };
    window.addEventListener('blur', stop);
    return () => window.removeEventListener('blur', stop);
  }, [drag]);
  // Track Alt key so the SVG root can capture drags on empty canvas for
  // marquee-select in Move mode.
  const [altHeld, setAltHeld] = useState(false);
  // v0.7.20 — which shape the pointer is currently hovering over. Used to
  // decide when to show the 4 connection-anchor dots on rect/ellipse/
  // callout borders. Only tracked in Move tool.
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  /**
   * v0.9.50 — the shape whose anchors are revealed because the pointer is
   * merely NEAR it (see the proximity effect below).
   *
   * ⚠️ Deliberately NOT `hoveredShapeId`. That state also gates the
   * "Double-click to add text" hint, so writing proximity into it made the
   * hint appear on whichever shape happened to be first in the array rather
   * than the one actually under the pointer — visible as three failures in
   * test-hint on stacked shapes. Proximity affects anchors only.
   */
  const [nearShapeId, setNearShapeId] = useState<string | null>(null);
  // Which shape (if any) is currently being edited inline via a
  // contentEditable overlay. `null` means no editor open.
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);

  // Bridge with `useAnnotationStore.pendingTextEditShapeId`. The toolbar's
  // "Text box" button drops a shape via `addShape(...)` and then writes
  // the new shape id here. We pick it up on the next render, open the
  // inline text editor for it, and clear the pending flag.
  const pendingTextEditShapeId = useAnnotationStore((s) => s.pendingTextEditShapeId);
  const setPendingTextEditShapeId = useAnnotationStore(
    (s) => s.setPendingTextEditShapeId,
  );
  useEffect(() => {
    if (!pendingTextEditShapeId) return;
    // Only enter edit mode if the shape actually exists in the current
    // tab's shape list — guards against stale ids from tab switches.
    const found = shapes.some((s) => s.id === pendingTextEditShapeId);
    if (found) setEditingShapeId(pendingTextEditShapeId);
    setPendingTextEditShapeId(null);
  }, [pendingTextEditShapeId, shapes, setPendingTextEditShapeId]);

  const toolIsShape = isShapeTool(tool);
  const selectedIdSet = useMemo(() => new Set(selectedShapeIds), [selectedShapeIds]);

  /**
   * v0.9.50 — for each shape, the resource cards it covers.
   *
   * Reported: "I've added two resources, then added a shape on top. Users
   * should be able to select the resources in the shape." These boxes become
   * holes in the shape's hit region (see `HoleHitRegion`), so a click on a
   * covered card reaches React Flow instead of the shape.
   *
   * The smaller-area test is not optional. Without it, a shape drawn INSIDE
   * a big `azureGroup` VNet node would have that node punched right through
   * it and become unclickable except along its own border — the reverse of
   * the reported bug. A hole is only ever punched for something the shape is
   * plausibly drawn *over*.
   */
  const holesByShape = useMemo(() => {
    const out = new Map<string, HoleBox[]>();
    if (nodeBoxes.length === 0) return out;
    for (const sh of shapes) {
      if (sh.kind === 'arrow' || sh.id === pickedShapeId) continue;
      const box = rotatedShapeBounds(sh);
      const size = shapeBBox(sh);
      const area = size.w * size.h;
      if (!(area > 0)) continue;
      const hits = nodeBoxes.filter(
        (n) => (n.id === pickedNodeId || n.w * n.h < area) && boxesIntersect(n, box),
      );
      if (hits.length) out.set(sh.id, hits.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })));
    }
    return out;
  }, [shapes, nodeBoxes, pickedShapeId, pickedNodeId]);

  /**
   * v0.9.50 — reveal a shape's connect anchors when the pointer comes NEAR
   * it, not only when it is over the painted body.
   *
   * Part of "connecting resources and shapes is very difficult". Anchors sit
   * ON the outline, so approaching one from outside the shape meant the
   * pointer was never over the body and the anchors never appeared — worst
   * of all for the `fill: 'none'` boundary shapes, whose body is a 2 px line.
   *
   * A window listener rather than an enlarged invisible halo per shape: a
   * halo would be a real element that steals clicks from whatever is behind
   * it, which is precisely the bug item 3 above exists to fix. React bails
   * out of the re-render when the id is unchanged, so the steady-state cost
   * of this is one pass over the shape list per pointer move.
   */
  useEffect(() => {
    // Leaving Move mode (or starting a drag) must clear the reveal, or a
    // stale near-shape keeps its anchors on screen for the whole gesture.
    //
    // v0.9.56 — with one exception, and it is the case that matters most.
    // While an arrow is being pulled out of an anchor (`connecting`), "which
    // dot am I about to hit" is the entire question the user is asking.
    // Clearing the reveal for that case is what left the target shape
    // showing nothing but its highlight ring, with every anchor invisible —
    // reported as "I cannot see where I am connecting the line to".
    //
    // v0.9.58 — `rebinding` is deliberately NOT in this list any more.
    // Dragging an annotation arrow's endpoint no longer attaches it to
    // anything, so lighting up every dot on a shape the arrow passes over
    // advertised a connection that was never going to happen. Reported as
    // "it is detecting the other shape — we do not want that".
    const aiming = drag?.mode === 'connecting' || rfConnecting;
    if (tool !== 'move' || (drag !== null && !aiming)) {
      setNearShapeId((cur) => (cur === null ? cur : null));
      return;
    }
    const reveal =
      (aiming ? ANCHOR_AIM_REVEAL_PX : ANCHOR_REVEAL_PX) / Math.max(0.2, zoom);
    const onMove = (e: PointerEvent) => {
      // The target of a window-level pointermove is not always an Element —
      // it can be the document (pointer over no content at all), which has
      // no `closest` and would throw on every move.
      const el = e.target instanceof Element ? e.target : null;
      if (!el || !el.closest('[data-nds-fullscreen-target]')) return;
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      let bestId: string | null = null;
      let bestD = Infinity;
      for (const sh of shapes) {
        if (!bindTargets.has(sh.id)) continue;
        const b = shapeBBox(sh);
        const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
        const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
        const d = Math.hypot(dx, dy);
        // `<=` so that among overlapping shapes (every distance 0) the LAST
        // one wins — that is the one painted on top, and the one the user
        // believes they are pointing at.
        if (d <= reveal && d <= bestD) {
          bestD = d;
          bestId = sh.id;
        }
      }
      setNearShapeId((cur) => (cur === bestId ? cur : bestId));
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [tool, drag, shapes, bindTargets, zoom, rf, rfConnecting]);

  const toFlow = (e: React.PointerEvent | React.MouseEvent | PointerEvent): Point => {
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    return { x: p.x, y: p.y };
  };
  const resolveShapeHit = (hit: Shape, event: React.PointerEvent | React.MouseEvent) => {
    if (hit.id === pickedShapeId || !svgRef.current) return hit;
    const hits = shapeHitsAt(svgRef.current, { x: event.clientX, y: event.clientY });
    const target = hits.has(hit.id) ? hit : [...paintedShapes].reverse().find(shape => hits.has(shape.id)) ?? hit;
    return resolveNestedShapeAt(shapes, target, hits);
  };

  // ROOT captures pointer events when a shape tool is active, mid-drag on
  // a shape (moving/resizing/creating), OR Alt held in Move mode (for the
  // legacy Alt+drag marquee). We DON'T capture for the new plain-left-drag
  // marquee: that runs via a window-level listener so ReactFlow's built-in
  // rubber-band selection can grab nodes/edges in parallel.
  const rootCaptures =
    toolIsShape ||
    (drag !== null && drag.mode !== 'marquee') ||
    (tool === 'move' && altHeld);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(false);
    };
    const onBlur = () => setAltHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Native pointer listener for the NEW plain-left-drag / Ctrl+Shift-drag
  // shape marquee. Runs alongside ReactFlow's `selectionOnDrag` node
  // selection so a single left-drag selects BOTH nodes/edges (via
  // ReactFlow) AND shapes (via us).
  useEffect(() => {
    if (tool !== 'move') return;
    const host = document.querySelector('[data-nds-fullscreen-target]');
    if (!host) return;

    let start: Point | null = null;
    let additive = false;
    let preSelection: string[] = [];

    const shouldStart = (e: PointerEvent): boolean => {
      if (e.button !== 0) return false;
      const target = e.target as Element | null;
      if (!target) return false;
      // Skip if the pointer hit anything interactive.
      if (target.closest('[data-nds-shape]')) return false;
      if (target.closest('[data-nds-shape-handle]')) return false;
      if (target.closest('.react-flow__node')) return false;
      if (target.closest('.react-flow__edge')) return false;
      if (target.closest('.react-flow__controls')) return false;
      if (target.closest('.react-flow__minimap')) return false;
      if (target.closest('.react-flow__attribution')) return false;
      if (target.closest('.react-flow__handle')) return false;
      if (target.closest('[data-nds-annotation-toolbar]')) return false;
      if (target.closest('[data-nds-tab]')) return false;
      if (target.closest('[data-nds-fullscreen]')) return false;
      if (target.closest('[data-nds-text-editor]')) return false;
      if (target.closest('button')) return false;
      if (target.closest('input')) return false;
      if (target.closest('select')) return false;
      // Must be on the ReactFlow pane (empty area) OR its viewport.
      const onPane =
        !!target.closest('.react-flow__pane') ||
        !!target.closest('.react-flow__viewport');
      return onPane;
    };

    const onDown = (e: Event) => {
      const pe = e as PointerEvent;
      if (!shouldStart(pe)) return;
      const p = rf.screenToFlowPosition({ x: pe.clientX, y: pe.clientY });
      start = p;
      additive = pe.shiftKey;
      preSelection = [...useAnnotationStore.getState().selectedShapeIds];
      setDrag({
        mode: 'marquee',
        origin: p,
        current: p,
        additive,
        preSelection,
      });
    };

    const onMove = (e: Event) => {
      if (!start) return;
      const pe = e as PointerEvent;
      const p = rf.screenToFlowPosition({ x: pe.clientX, y: pe.clientY });
      setDrag((prev) =>
        prev && prev.mode === 'marquee' ? { ...prev, current: p } : prev,
      );
    };

    const onUp = (e: Event) => {
      if (!start) return;
      const pe = e as PointerEvent;
      const endP = rf.screenToFlowPosition({ x: pe.clientX, y: pe.clientY });
      const norm = normalizeBox(
        start.x,
        start.y,
        endP.x - start.x,
        endP.y - start.y,
      );
      if (norm.w > 4 && norm.h > 4) {
        const shapesNow = useTabsStore.getState().activeTab().shapes;
        const hits = shapesNow
          .filter((sh) => boxesIntersect(shapeBBox(sh), norm))
          .map((sh) => sh.id);
        if (additive) {
          const set = new Set([...preSelection, ...hits]);
          useAnnotationStore.getState().setSelectedShapes([...set]);
        } else {
          useAnnotationStore.getState().setSelectedShapes(hits);
        }
      } else if (!additive) {
        // A bare click on empty pane (no drag) with no Shift held → clear
        // the shape selection. ReactFlow's own onPaneClick handles the
        // node/edge side in parallel.
        useAnnotationStore.getState().clearShapeSelection();
      }
      start = null;
      additive = false;
      preSelection = [];
      setDrag(null);
    };

    host.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      host.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [tool, rf]);

  const onRootPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Ignore clicks that already landed on a shape body / handle.
    if ((e.target as Element).closest?.('[data-nds-shape]')) return;
    if ((e.target as Element).closest?.('[data-nds-shape-handle]')) return;

    const p = toFlow(e);

    if (toolIsShape) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDrag({ mode: 'creating', tool, origin: p, current: p, shift: e.shiftKey });
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // Move + Alt: start marquee.
    if (tool === 'move' && e.altKey) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDrag({
        mode: 'marquee',
        origin: p,
        current: p,
        additive: e.shiftKey,
        preSelection: [...selectedShapeIds],
      });
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // Move tool + empty canvas + no modifier → deselect all.
    if (tool === 'move' && selectedShapeIds.length > 0) {
      clearShapeSelection();
    }
  };

  const onRootPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toFlow(e);
    if (drag.mode === 'creating') {
      setDrag({ ...drag, current: p, shift: e.shiftKey });
    } else if (drag.mode === 'moving-group') {
      const dx = p.x - drag.origin.x;
      const dy = p.y - drag.origin.y;
      // Past the dead zone this is a real reposition, so any arrow in the
      // selection comes off its target instead of being snapped back onto
      // it by the resolver. Targets travelling in the same gesture keep
      // their bindings.
      const detaching = Math.hypot(dx, dy) * zoom > MOVE_DETACH_PX;
      const movingIds = new Set<string>(drag.shapeIds);
      for (const n of drag.nodeCargo) movingIds.add(n.id);
      const moved = drag.snapshots.map((snap) => {
        const next = applyMove(snap, dx, dy);
        return detaching ? detachMovedArrow(next, movingIds) : next;
      });
      updateShapes(moved);
      if (drag.nodeCargo.length) {
        const mv = useDiagramStore.getState().moveNode;
        for (const n of drag.nodeCargo) mv(n.id, { x: n.x + dx, y: n.y + dy });
      }
    } else if (drag.mode === 'resizing') {
      let dx = p.x - drag.origin.x;
      let dy = p.y - drag.origin.y;
      // v0.7.15/16 — if the shape is rotated, un-rotate the pointer
      // delta so `applyResize` sees it in shape-LOCAL coords. Without
      // this, dragging the SE handle of a shape rotated 45° would push
      // the corner in the world-space SE direction, not the shape's
      // own SE. This applies to every handle on a rotatable shape —
      // arrow endpoints, rect/ellipse corners, callout corners —
      // EXCEPT the callout anchor, which stays pinned to a world-space
      // spot on the canvas and therefore uses world-space deltas.
      const rot = shapeRotation(drag.snapshot);
      const isCalloutAnchor = drag.snapshot.kind === 'callout' && drag.handle === 'anchor';
      if (rot !== 0 && !isCalloutAnchor) {
        const local = rotateVec(dx, dy, -rot);
        dx = local.x;
        dy = local.y;
      }
      const next = applyResize(drag.snapshot, drag.handle, dx, dy);
      updateShape(next);
    } else if (drag.mode === 'rotating') {
      // v0.7.15 — rotation drag. Compute current pointer angle from the
      // shape center, subtract the drag-start angle to get an angular
      // delta, and apply that to the pre-drag rotation.
      const center = shapeCenter(drag.snapshot);
      const currentAngleDeg =
        (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
      let deltaDeg = currentAngleDeg - drag.initialAngleDeg;
      const startRot = shapeRotation(drag.snapshot);
      let nextRot = startRot + deltaDeg;
      // Shift snaps to 15° increments (cardinal & diagonal alignment).
      if (e.shiftKey) {
        nextRot = Math.round(nextRot / 15) * 15;
      }
      // Normalize to [-180, 180] for cleaner storage / debugging.
      while (nextRot > 180) nextRot -= 360;
      while (nextRot < -180) nextRot += 360;
      updateShape({ ...drag.snapshot, rotation: nextRot } as Shape);
    } else if (drag.mode === 'marquee') {
      setDrag({ ...drag, current: p });
    } else if (drag.mode === 'rebinding') {
      // v0.9.58 — an annotation arrow endpoint is FREE. It follows the
      // pointer exactly and never attaches itself to whatever it happens to
      // pass over.
      //
      // Auto-attaching read as the arrow "hitting" things: the endpoint was
      // captured by any shape it came near, then resolved to a point on that
      // shape's outline, so it could not be parked next to a box, inside
      // one, or anywhere along its edge — the very placements an annotation
      // arrow exists to make.
      //
      // Connecting two things is a different gesture with its own
      // affordance: drag from a shape's connect dot, which builds a real
      // diagram edge that tracks both ends properly. Nothing here replaces
      // that, so nothing is lost by letting arrows be arrows.
      setDrag({
        ...drag,
        current: p,
        targetShapeId: null,
        targetRef: null,
      });
      // Live-update the real shape so the user drags the actual arrow, not
      // a ghost. The whole gesture collapses to ONE undo frame on release.
      //
      // Any ref on the end being dragged is dropped: leave it in place and
      // the resolver dutifully snaps the endpoint back to its old target on
      // every frame, so the handle cannot be pulled off at all.
      const preview: ShapeArrow = { ...drag.snapshot };
      if (drag.end === 'start') {
        preview.from = p;
        delete preview.fromRef;
      } else {
        preview.to = p;
        delete preview.toRef;
      }
      updateShape(preview);
    } else if (drag.mode === 'connecting') {
      // v0.7.20 — live-preview an arrow from the source anchor to the
      // pointer.
      // v0.9.27 — the target may now be a diagram NODE as well as a shape,
      // and the endpoint BINDS rather than merely snapping, so the arrow
      // follows whatever it was dropped on.
      const target = pickTargetAt(
        p,
        bindTargets,
        drag.fromShapeId,
        CONTAINER_EDGE_BAND_PX / zoom,
        BIND_SLACK_PX / zoom,
      );
      if (target) {
        const ref = refForDrop(target, p, ANCHOR_PIN_PX / zoom);
        setDrag({
          ...drag,
          current: refPoint(target, ref, drag.fromPoint),
          targetShapeId: target.id,
          targetRef: ref,
        });
      } else {
        setDrag({ ...drag, current: p, targetShapeId: null, targetRef: null });
      }
    }
  };

  const onRootPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    if (drag.mode === 'creating') {
      const draft = draftShapeFrom(drag, {
        color,
        fallbackWidth: width,
        arrow: arrowStyle,
        rect: rectStyle,
        ellipse: ellipseStyle,
        callout: calloutStyle,
      });
      if (draft) {
        // Reject degenerate shapes (single-click without drag).
        const bigEnough =
          draft.kind === 'arrow'
            ? Math.hypot(draft.to.x - draft.from.x, draft.to.y - draft.from.y) > 6
            : draft.kind === 'ellipse'
            ? draft.rx > 4 && draft.ry > 4
            : draft.w > MIN_SHAPE_SIZE && draft.h > MIN_SHAPE_SIZE;
        if (bigEnough) {
          const id = makeShapeId();
          let committed: Shape = { ...draft, id };
          // v0.9.27 — an arrow DRAWN across two shapes binds to them, the
          // same as one dragged out of a connect anchor. This is the
          // gesture people actually use: pick the arrow tool, drag from one
          // box to another. Without this the arrow looks connected and
          // silently isn't, which is exactly the bug being fixed.
          if (committed.kind === 'arrow') {
            const tol = ANCHOR_PIN_PX / zoom;
            const band = CONTAINER_EDGE_BAND_PX / zoom;
            const slack = BIND_SLACK_PX / zoom;
            const a = pickTargetAt(committed.from, bindTargets, null, band, slack);
            const b = pickTargetAt(committed.to, bindTargets, null, band, slack);
            // v0.9.29 — an arrow drawn from one box to another is a
            // CONNECTION, so it becomes a real diagram edge with a kind, a
            // colour, a label and a state, exactly like one drawn between
            // two resource cards. Only a one-ended arrow stays an
            // annotation.
            const edgeId = commitConnection(a?.id ?? null, b?.id ?? null, {
              from: a ? refForDrop(a, committed.from, tol) : null,
              to: b ? refForDrop(b, committed.to, tol) : null,
            });
            if (edgeId) {
              setTool('move');
              setDrag(null);
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              return;
            }
            // A one-ended arrow stays a plain annotation, bound to nothing.
            // It keeps the exact geometry it was drawn with — see the
            // `rebinding` branch for why endpoints are free.
          }
          addShape(committed);
          setSelectedShapes([id]);
          setTool('move');
          // Callouts are meant to hold text — auto-open the editor so the
          // user can just start typing right after drawing.
          if (committed.kind === 'callout') {
            setEditingShapeId(id);
          }
        }
      }
    } else if (drag.mode === 'moving-group') {
      // Collapse the flurry of updateShapes() calls into one undo entry
      // that captures the pre-drag snapshots vs. the final positions.
      commitGroupMove(drag.shapeIds, drag.snapshots);
      // The carried nodes live in the OTHER store, so they get their own
      // single frame. Two presses of Ctrl+Z is the honest cost of a move
      // that spans both layers — one frame cannot span two stores.
      if (drag.nodeCargo.length) useDiagramStore.getState().commitGesture();
    } else if (drag.mode === 'resizing') {
      collapseTailUpdatesTo(drag.shapeId, drag.snapshot);
    } else if (drag.mode === 'rotating') {
      // Same collapse pattern as resize — the flurry of intermediate
      // rotation updates during the drag become ONE undo entry (from the
      // pre-drag snapshot to the final orientation).
      collapseTailUpdatesTo(drag.shapeId, drag.snapshot);
    } else if (drag.mode === 'marquee') {
      const marqueeBox = normalizeBox(
        drag.origin.x,
        drag.origin.y,
        drag.current.x - drag.origin.x,
        drag.current.y - drag.origin.y,
      );
      // Nothing to select for tiny marquee (accidental click).
      if (marqueeBox.w > 4 && marqueeBox.h > 4) {
        const hits = shapes
          .filter((sh) => boxesIntersect(shapeBBox(sh), marqueeBox))
          .map((sh) => sh.id);
        if (drag.additive) {
          // Union with the pre-drag selection.
          const set = new Set([...drag.preSelection, ...hits]);
          setSelectedShapes([...set]);
        } else {
          setSelectedShapes(hits);
        }
      }
    } else if (drag.mode === 'connecting') {
      // v0.9.30 — this gesture is a CONNECT, and it behaves exactly like
      // dragging a resource card's handle: landing on a valid target makes
      // a real DiagramEdge, and landing on empty canvas — or on something
      // that cannot be an endpoint — makes NOTHING.
      //
      // Until v0.9.29 the miss case silently dropped a one-ended ShapeArrow
      // on the canvas. Nobody pulls a connector out of a box intending to
      // create a dangling annotation, so that was pure surprise: a stray
      // arrow the user then had to notice and delete. A free arrow is still
      // one click away on the arrow TOOL, and an existing arrow's endpoint
      // can still be dragged onto a shape to bind it (`rebinding`), so no
      // capability is lost — only the accident.
      commitConnection(drag.fromShapeId, drag.targetShapeId, {
        from: drag.fromRef,
        to: drag.targetRef,
      });
      setTool('move');
    } else if (drag.mode === 'rebinding') {
      // v0.9.27 — an existing endpoint was dragged. Over a target it binds;
      // over empty canvas it unbinds and stays where it was dropped, so a
      // connector can always be detached again.
      const next: ShapeArrow = { ...drag.snapshot };
      if (drag.end === 'start') {
        next.from = drag.current;
        if (drag.targetRef) next.fromRef = drag.targetRef;
        else delete next.fromRef;
      } else {
        next.to = drag.current;
        if (drag.targetRef) next.toRef = drag.targetRef;
        else delete next.toRef;
      }
      updateShape(next);
      collapseTailUpdatesTo(drag.shapeId, drag.snapshot);
    }
    setDrag(null);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const onShapeBodyPointerDown = (e: React.PointerEvent, hitShape: Shape) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (tool !== 'move') setTool('move');

    // A click that lands on a container belongs to whatever is nested at
    // that point, not to the container that happens to be painted on top.
    const shape = resolveShapeHit(hitShape, e);

    // Selection semantics:
    //   plain click on unselected → replace with just this one
    //   plain click on already-selected → keep whole selection (for group drag)
    //   shift-click → toggle in the set
    let nextSelected: string[];
    if (e.shiftKey) {
      // Toggle in — but don't proceed to drag if we JUST deselected.
      const wasSelected = selectedIdSet.has(shape.id);
      nextSelected = wasSelected
        ? selectedShapeIds.filter((x) => x !== shape.id)
        : [...selectedShapeIds, shape.id];
      setSelectedShapes(nextSelected);
      // If deselected, no drag: user is trimming the selection.
      if (wasSelected) return;
    } else if (selectedIdSet.has(shape.id) && selectedShapeIds.length > 1) {
      // Keep multi-selection, we're about to drag the whole group.
      nextSelected = selectedShapeIds;
    } else {
      nextSelected = [shape.id];
      setSelectedShapes(nextSelected);
    }

    const selectedSnapshots = shapes.filter((sh) => nextSelected.includes(sh.id));
    const p = toFlow(e);

    // v0.9.49 — a single shape dragged without Ctrl carries everything drawn
    // wholly inside it, across BOTH layers. Restricted to a single-shape
    // drag: with a multi-selection the user has already said exactly what
    // they want to move, and a container plus one of its own occupants in
    // the same selection would move that occupant twice.
    let snapshots = selectedSnapshots;
    let nodeCargo: Array<{ id: string; x: number; y: number }> = [];
    if (selectedSnapshots.length === 1 && !e.ctrlKey && !e.metaKey) {
      const container = shapeBBox(selectedSnapshots[0]);
      const selectedIds = new Set(nextSelected);

      // Shape cargo just joins the snapshot list, so the existing
      // commitGroupMove undo frame covers it with no extra bookkeeping.
      snapshots = [
        ...selectedSnapshots,
        ...collectCargo(container, shapes, shapeBBox, selectedIds),
      ];

      const diagNodes = useDiagramStore.getState().diagram.nodes;
      const boxes = absoluteNodeBoxes(diagNodes);
      const carried = collectCargo(
        container,
        diagNodes,
        (n) => boxes.get(n.id) ?? null,
        EMPTY_ID_SET,
      );
      // A child whose parent is also cargo is moved by React Flow's own
      // parent/extent handling, so it must not be translated again here.
      const carriedIds = new Set(carried.map((n) => n.id));
      nodeCargo = carried
        .filter((n) => !n.parent || !carriedIds.has(n.parent))
        .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    }

    if (nodeCargo.length) useDiagramStore.getState().beginGesture();
    setDrag({
      mode: 'moving-group',
      shapeIds: snapshots.map((sh) => sh.id),
      origin: p,
      snapshots,
      nodeCargo,
    });
  };

  const shapeBodyHandler = useRef(onShapeBodyPointerDown);
  useLayoutEffect(() => { shapeBodyHandler.current = onShapeBodyPointerDown; });
  const onStableShapeBodyPointerDown = useCallback((event: React.PointerEvent, shape: Shape) =>
    shapeBodyHandler.current(event, shape), []);

  const onHandlePointerDown = (
    e: React.PointerEvent,
    shape: Shape,
    handle: HandleId,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toFlow(e);
    if (handle === 'rotate') {
      // v0.7.15 — start a rotation drag. Snapshot the current angle from
      // shape center to pointer so pointer-move can compute an angular
      // delta.
      const center = shapeCenter(shape);
      const initialAngleDeg =
        (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
      setDrag({ mode: 'rotating', shapeId: shape.id, origin: p, snapshot: shape, initialAngleDeg });
      return;
    }
    // v0.9.27 — an arrow's start/end handle is a BINDING gesture, not a
    // resize: released over a shape or node it attaches, released over
    // empty canvas it detaches.
    if (shape.kind === 'arrow' && (handle === 'start' || handle === 'end')) {
      setDrag({
        mode: 'rebinding',
        shapeId: shape.id,
        end: handle,
        snapshot: shape,
        current: handle === 'start' ? shape.from : shape.to,
        targetShapeId: null,
        targetRef: null,
      });
      return;
    }
    setDrag({ mode: 'resizing', shapeId: shape.id, handle, origin: p, snapshot: shape });
  };

  // v0.7.20 — connect-anchor pointer-down. Grabs the anchor at a side
  // midpoint and starts a `connecting` drag. v0.9.30: the drag commits a
  // DiagramEdge on a valid target and nothing otherwise — the same
  // contract as pulling a resource card's handle.
  const onAnchorPointerDown = (
    e: React.PointerEvent,
    shape: Shape,
    anchor: ConnectAnchor,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const from: Point = { x: anchor.x, y: anchor.y };
    // v0.9.57 — record WHICH dot this is, not just which side it is on, so
    // the finished edge leaves from the dot the user grabbed. The pointer is
    // exactly on the anchor here, so this resolves to that dot at distance 0.
    const self = bindTargets.get(shape.id);
    const fromRef = self ? refForDrop(self, from, ANCHOR_PIN_PX / zoom) : null;
    setDrag({
      mode: 'connecting',
      fromShapeId: shape.id,
      fromPoint: from,
      current: from,
      fromSide: anchor.side,
      fromRef,
      targetShapeId: null,
      targetRef: null,
    });
    // Clear any existing selection so the preview arrow reads cleanly.
    if (selectedShapeIds.length > 0) clearShapeSelection();
    // Force move tool so the ghost overlay doesn't collide with shape-tool
    // creation.
    if (tool !== 'move') setTool('move');
  };

  // Keyboard: Delete removes ALL selected. Escape clears. Ctrl/Cmd+A selects all.
  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (CANVAS_PLACEMENT_FEEDBACK && e.key === 'Escape' && drag) {
        finishShapeFeedbackGesture(drag);
        setDrag(null);
        clearPlacementFeedback();
      }
      // Ctrl/Cmd+A → select all shapes on the active tab.
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        const allShapes = useTabsStore.getState().activeTab().shapes;
        if (allShapes.length === 0) return;
        e.preventDefault();
        setSelectedShapes(allShapes.map((sh) => sh.id));
        return;
      }
      if (selectedShapeIds.length === 0) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        clearShapeSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedShapeIds.length === 1) {
          deleteShape(selectedShapeIds[0]);
        } else {
          deleteShapes(selectedShapeIds);
        }
        clearShapeSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedShapeIds, deleteShape, deleteShapes, clearShapeSelection, setSelectedShapes, drag]);

  // Double-click any shape → open inline text editor. Works for ALL shape
  // kinds (arrow / rect / ellipse / callout). No modal prompt.
  const onShapeDoubleClick = (shape: Shape) => {
    if (shape.kind === 'rect' && shape.canvasImage !== undefined) return;
    setEditingShapeId(shape.id);
  };

  const commitEditingText = (shapeId: string, nextText: string) => {
    const target = useTabsStore.getState().activeTab().shapes.find(sh => sh.id === shapeId);
    if (target && (target.text ?? '') !== nextText) {
      if (target.kind === 'callout') updateShape({ ...target, text: nextText });
      else updateShape({ ...target, text: nextText || undefined });
    }
    setEditingShapeId(null);
  };

  // Live style update while the inline editor is open — dispatched from the
  // floating text toolbar. An unchanged commit must not hide the formatting's undo frame.
  const applyStyleToShape = (
    shapeId: string,
    patch: Partial<ShapeTextStyle>,
  ) => {
    const target = useTabsStore.getState().activeTab().shapes.find(sh => sh.id === shapeId);
    if (!target) return;
    if ((Object.keys(patch) as (keyof ShapeTextStyle)[]).every(key => patch[key] === target[key])) return;
    updateShape({ ...target, ...patch });
  };

  const draftShape = useMemo<Shape | null>(() => {
    if (drag && drag.mode === 'creating') {
      return draftShapeFrom(drag, {
        color,
        fallbackWidth: width,
        arrow: arrowStyle,
        rect: rectStyle,
        ellipse: ellipseStyle,
        callout: calloutStyle,
      });
    }
    return null;
  }, [drag, color, width, arrowStyle, rectStyle, ellipseStyle, calloutStyle]);

  const marqueeRect = useMemo<BBox | null>(() => {
    if (drag && drag.mode === 'marquee') {
      return normalizeBox(
        drag.origin.x,
        drag.origin.y,
        drag.current.x - drag.origin.x,
        drag.current.y - drag.origin.y,
      );
    }
    return null;
  }, [drag]);

  const singleSelected =
    selectedShapeIds.length === 1
      ? shapes.find((s) => s.id === selectedShapeIds[0]) ?? null
      : null;

  const cursor = toolIsShape
    ? 'crosshair'
    : tool === 'move' && altHeld
    ? 'crosshair'
    : 'default';
  const handlePxSize = HANDLE_SIZE / Math.max(0.2, zoom);
  const marqueeStrokeInv = 1 / Math.max(0.2, zoom);
  const feedback = useMemo(() => {
    if (!CANVAS_PLACEMENT_FEEDBACK || (!drag && !placement.paletteShape && !placement.nodeIds.length)) return null;
    const originals = drag?.mode === 'moving-group' ? drag.snapshots : drag && 'snapshot' in drag ? [drag.snapshot] : [];
    const moving = new Set([
      ...placement.nodeIds, ...placement.carriedShapeIds, ...originals.map(shape => shape.id),
      ...(drag?.mode === 'moving-group' ? drag.nodeCargo.map(node => node.id) : []),
    ]);
    const diagramNodes = useDiagramStore.getState().diagram.nodes;
    const byId = new Map(diagramNodes.map(node => [node.id, node]));
    for (const node of diagramNodes) {
      const visited = new Set<string>();
      let parent = node.parent;
      while (parent && !visited.has(parent)) {
        visited.add(parent);
        if (moving.has(parent)) { moving.add(node.id); break; }
        parent = byId.get(parent)?.parent;
      }
    }
    const active = placement.paletteShape ? [placement.paletteShape]
      : draftShape && isPreviewArrow(draftShape) ? [draftShape]
      : shapes.filter(shape => moving.has(shape.id));
    const realNodes = nodeBoxes.filter(box => byId.has(box.id));
    const boxes = [...active.map(feedbackBox), ...realNodes.filter(box => moving.has(box.id))];
    const box = unionBoxes(boxes);
    if (!box) return null;
    const targets = [
      ...realNodes.filter(target => !moving.has(target.id)),
      ...shapes.filter(shape => !moving.has(shape.id)).map(feedbackBox),
    ];
    const arrows = placement.nodeIds.length ? [] : active.filter(isPreviewArrow);
    const single = active.length === 1 ? active[0] : null;
    const point = drag?.mode === 'rebinding' && single?.kind === 'arrow'
      ? rotatePoint(drag.end === 'start' ? single.from : single.to, shapeCenter(single), single.rotation ?? 0) : undefined;
    return { box, targets, arrows, point, originals: originals.filter(isPreviewArrow) };
  }, [drag, draftShape, nodeBoxes, placement, shapes]);
  const previewIds = new Set(feedback?.originals.map(shape => shape.id));

  return (
    <svg
      ref={svgRef}
      data-nds-shape-overlay="1"
      className="absolute inset-0 z-20"
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: rootCaptures ? 'auto' : 'none',
        cursor,
      }}
      onPointerDown={onRootPointerDown}
      onPointerMove={onRootPointerMove}
      onPointerUp={onRootPointerUp}
      onPointerCancel={() => {
        if (CANVAS_PLACEMENT_FEEDBACK) finishShapeFeedbackGesture(drag);
        setDrag(null);
      }}
    >
      <SvgViewport>
        {paintedShapes.map((sh) => (
          <g
            key={sh.id}
            data-nds-preview-hidden={previewIds.has(sh.id) ? '1' : undefined}
            style={previewIds.has(sh.id) ? { visibility: 'hidden' } : undefined}
            onDoubleClick={(e) =>
              onShapeDoubleClick(resolveShapeHit(sh, e))
            }
            onPointerEnter={
              tool !== 'move' ? undefined : () => setHoveredShapeId(sh.id)
            }
            onPointerLeave={
              tool !== 'move'
                ? undefined
                : () => setHoveredShapeId((cur) => (cur === sh.id ? null : cur))
            }
          >
            <RenderShape
              shape={sh}
              selected={selectedIdSet.has(sh.id)}
              onPointerDownBody={onStableShapeBodyPointerDown}
              interactive={tool === 'move'}
              holes={holesByShape.get(sh.id)}
              preferredNode={pickedNodeBox}
              zoom={zoom}
              paddingHoles={nodeBoxes.filter(node => !node.container || node.id === pickedNodeId)}
              hideText={editingShapeId === sh.id}
            />
            {tool === 'move' &&
              hoveredShapeId === sh.id &&
              editingShapeId !== sh.id &&
              !sh.text && <ShapeTextHint shape={sh} label={t('Double-click to add text')} />}
          </g>
        ))}

        {draftShape && !(CANVAS_PLACEMENT_FEEDBACK && isPreviewArrow(draftShape)) && (
          <g opacity={0.75}>
            <RenderShape
              shape={draftShape}
              selected={false}
              onPointerDownBody={() => {}}
              interactive={false}
            />
          </g>
        )}
        {feedback && <g data-nds-placement-feedback="arrows" style={{ pointerEvents: 'none' }} aria-hidden="true">
          {feedback.originals.map(shape => <RenderShape key={`original-${shape.id}`}
            shape={{ ...shape, id: `placement-original-${shape.id}` }} selected={false}
            onPointerDownBody={() => {}} interactive={false} />)}
          {feedback.arrows.map(shape => {
            const preview = {
              ...shape, id: `placement-preview-${shape.id}`, color: 'var(--nds-accent-text)',
              width: 1.5 / zoom, dash: 'dashed' as const, text: undefined,
              ...(shape.kind === 'rect' ? { fillOpacity: 0 } : {}),
            };
            return <g key={shape.id} data-nds-arrow-preview={shape.id}>
              <RenderShape shape={preview} selected={false} onPointerDownBody={() => {}} interactive={false} />
            </g>;
          })}
        </g>}
        {feedback && <PlacementGuides box={feedback.box} targets={feedback.targets}
          width={canvasWidth} height={canvasHeight} point={feedback.point} />}

        {/* v0.7.20 — connection anchors. Rendered for the currently-
            hovered shape (or the singly-selected shape) so users have an
            obvious "grab me to connect" affordance on every side. Also
            kept visible during an active `connecting` drag so the captured
            anchor DOM node stays mounted (otherwise React unmounts it
            mid-drag and the browser releases pointer capture, killing
            pointer-move events). Anchors are painted at side midpoints in
            WORLD coordinates (rotation already applied by
            shapeConnectAnchors), so no rotation transform is needed on
            this wrapper.

            v0.9.30 — gated on `bindTargets`, the same predicate
            `commitConnection` uses. An anchor now means exactly what a
            resource card's handle means: "a connection can start OR end
            here". Arrows and callouts are deliberately not bindable, so
            they no longer show one — advertising a connect point on
            something that can never be connected was the affordance half
            of this bug. */}
        {tool === 'move' &&
         (!pickedNodeId || rfConnecting) &&
         (!drag || drag.mode === 'connecting' || drag.mode === 'rebinding') &&
          (() => {
            const anchorShapes: Shape[] = [];
            // While actively connecting, always keep the source shape's
            // anchors visible so the captured element stays in the DOM.
            const activeSourceId =
              drag && drag.mode === 'connecting' ? drag.fromShapeId : null;
            if (activeSourceId) {
              const src = shapes.find((s) => s.id === activeSourceId);
              if (src && bindTargets.has(src.id)) anchorShapes.push(src);
            }
            /* v0.9.56 — the shape being AIMED AT mid-drag.

               Every reveal branch below is gated on `!drag`, so during a
               connect the only anchors on screen were the SOURCE shape's
               own. The user was being asked to hit a dot that was never
               drawn — the shapes half of "I cannot see where I am
               connecting the line to". The proximity effect above now
               deliberately keeps `nearShapeId` live through these two
               drags to feed this list. */
            const aimingIds = new Set<string>();
            const aimCandidates: (string | null)[] =
              drag && (drag.mode === 'connecting' || drag.mode === 'rebinding')
                ? [drag.targetShapeId, nearShapeId]
                : // React Flow's OWN drag, out of a resource card's handle
                  // toward a shape. `drag` is null for the whole of it, so
                  // without this the shape got a ring and no dots.
                  rfConnecting
                  ? [rfConnectTargetId, nearShapeId]
                  : [];
            for (const id of aimCandidates) {
              if (!id || id === activeSourceId || aimingIds.has(id)) continue;
              const sh = shapes.find((s) => s.id === id);
              if (!sh || !bindTargets.has(sh.id)) continue;
              aimingIds.add(id);
              anchorShapes.push(sh);
            }
            if (!drag) {
              if (
                hoveredShapeId &&
                hoveredShapeId !== activeSourceId &&
                !aimingIds.has(hoveredShapeId)
              ) {
                const h = shapes.find((s) => s.id === hoveredShapeId);
                if (h && bindTargets.has(h.id)) anchorShapes.push(h);
              }
              // v0.9.50 — the shape the pointer is merely APPROACHING.
              if (
                nearShapeId &&
                nearShapeId !== hoveredShapeId &&
                nearShapeId !== activeSourceId &&
                !aimingIds.has(nearShapeId)
              ) {
                const n = shapes.find((s) => s.id === nearShapeId);
                if (n && bindTargets.has(n.id)) anchorShapes.push(n);
              }
              if (
                singleSelected &&
                bindTargets.has(singleSelected.id) &&
                singleSelected.id !== hoveredShapeId &&
                singleSelected.id !== nearShapeId &&
                singleSelected.id !== activeSourceId &&
                !aimingIds.has(singleSelected.id)
              ) {
                anchorShapes.push(singleSelected);
              }
            }
            if (anchorShapes.length === 0) return null;
            // v0.9.50 — 5 → 6 world-px dot, fat hit 2.4× → 3.0×. Part of
            // "connecting resources and shapes is very difficult": the
            // anchor is the target of a precision drag, so it gets the
            // largest hit area the affordance can carry without the four
            // anchors of a small shape overlapping each other.
            const anchorStrokeInv = 1 / Math.max(0.2, zoom);
            return (
              <g data-nds-connect-anchors="1">
                {anchorShapes.map((sh) => {
                  const anchors = shapeConnectAnchors(sh);
                  const dots = shapeConnectDots(sh);
                  const box = shapeBBox(sh);
                  const shortSide = Math.min(box.w, box.h);
                  const anchorR = Math.min(6 / zoom, shortSide / 8);
                  const anchorHitR = Math.min(18 / zoom, shortSide / 8);
                  const dotHitR = Math.min(11.4 / zoom, shortSide / 8);
                  const clipId = `${connectClipPrefix}-${encodeURIComponent(sh.id)}`;
                  const bounds = rotatedShapeBounds(sh);
                  const pad = 20 / zoom;
                  const epsilon = Math.min(0.01 / zoom, shortSide / 1000);
                  const interior = { x: box.x + epsilon, y: box.y + epsilon,
                    w: box.w - 2 * epsilon, h: box.h - 2 * epsilon };
                  const outsidePath = boxHitPath({ x: bounds.x - pad, y: bounds.y - pad,
                    w: bounds.w + 2 * pad, h: bounds.h + 2 * pad }) +
                    rotatedBoxPath(interior, shapeCenter(sh), sh.rotation ?? 0);
                  return (
                    <Fragment key={sh.id}>
                      <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                        <path d={outsidePath} clipRule="evenodd" />
                      </clipPath></defs>
                      {anchors.map((a) => (
                    <g
                      key={`${sh.id}-${a.side}`}
                      onPointerEnter={() => setHoveredShapeId(sh.id)}
                      onPointerLeave={() =>
                        setHoveredShapeId((cur) => (cur === sh.id ? null : cur))
                      }
                    >
                      {/* Fat invisible hit-target so users don't have to
                          hit the 5px dot pixel-perfectly. Uses
                          `pointer-events: all` (not the default
                          `visiblePainted`) so the transparent fill is
                          still hit-testable — critical, otherwise
                          the anchor click falls through to the shape
                          body underneath. Also treats hovering the
                          anchor as still hovering the source shape so
                          the anchors don't unmount when the pointer
                          crosses from shape body to anchor. */}
                      <circle
                        cx={a.x}
                        cy={a.y}
                        r={anchorHitR}
                        clipPath={`url(#${clipId})`}
                        fill="transparent"
                        style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                        onPointerDown={(e) => onAnchorPointerDown(e, sh, a)}
                        data-nds-shape-connect-anchor={a.side}
                        data-nds-shape-connect-anchor-shape={sh.id}
                      />
                      <circle
                        cx={a.x}
                        cy={a.y}
                        r={anchorR}
                        fill="#ffffff"
                        stroke="#0078d4"
                        strokeWidth={2 * anchorStrokeInv}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                      ))}
                      {/* Quarter-point dots. Same gesture, more places to
                          start it — and on a tall or wide shape the side
                          midpoint alone is a long way from wherever the
                          pointer happens to be. Their hit area is smaller
                          than a midpoint's so three dots on one side never
                          overlap each other. */}
                      {dots.map((a, i) => (
                        <g
                          key={`${sh.id}-dot-${i}`}
                          onPointerEnter={() => setHoveredShapeId(sh.id)}
                          onPointerLeave={() =>
                            setHoveredShapeId((cur) => (cur === sh.id ? null : cur))
                          }
                        >
                          <circle
                            cx={a.x}
                            cy={a.y}
                            r={dotHitR}
                            clipPath={`url(#${clipId})`}
                            fill="transparent"
                            style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                            onPointerDown={(e) => onAnchorPointerDown(e, sh, a)}
                            data-nds-shape-connect-dot={a.side}
                            data-nds-shape-connect-dot-shape={sh.id}
                          />
                          <circle
                            cx={a.x}
                            cy={a.y}
                            r={anchorR * 0.8}
                            fill="#ffffff"
                            stroke="#0078d4"
                            strokeWidth={2 * anchorStrokeInv}
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      ))}
                    </Fragment>
                  );
                })}
              </g>
            );
          })()}

        {/* v0.9.30 — the in-flight connection preview. This is NOT a
            drawn arrow: connecting two boxes is the same gesture whether
            they are resource cards or shapes, so the preview is React
            Flow's own connection line — the same `getBezierPath` its
            default ConnectionLine calls, the same `#b1b1b7` stroke from
            `--xy-connectionline-stroke`, the same 1px screen width, and
            no arrowhead. Calling the library is the only implementation
            of "exactly like a resource" that stays true when React Flow
            changes how it draws. `drag.current` is snapped to the target
            anchor by onRootPointerMove.

            The stroke comes from `CONNECTION_LINE_STYLE` — the very
            object Canvas hands to `connectionLineStyle` — and must be an
            inline `style`, because React Flow's own
            `.react-flow__connection-path` rule would otherwise win and
            resolve to `stroke: none` here. */}
        {drag && drag.mode === 'connecting' && (
          <g data-nds-connect-preview="1" style={{ pointerEvents: 'none' }}>
            <path
              className="react-flow__connection-path"
              d={
                getBezierPath({
                  sourceX: drag.fromPoint.x,
                  sourceY: drag.fromPoint.y,
                  sourcePosition: SIDE_TO_POSITION[drag.fromSide],
                  targetX: drag.current.x,
                  targetY: drag.current.y,
                  targetPosition: OPPOSITE_POSITION[SIDE_TO_POSITION[drag.fromSide]],
                })[0]
              }
              fill="none"
              style={CONNECTION_LINE_STYLE}
            />
            {/* Highlight ring around the currently-hovered target.
                Driven from `bindTargets`, not from `shapes`, so a diagram
                NODE lights up exactly like a shape does — a user dropping
                an arrow on a VM has to see the same feedback. */}
            {drag.targetShapeId && <BindTargetRing target={bindTargets.get(drag.targetShapeId)} />}
            {/* v0.9.56 — THE ENDPOINT DOT.

                Until now the preview line simply stopped in mid-air. With
                no marker at its tip there was nothing to read the drop off
                of: the line ended somewhere near a shape and the user had
                to guess whether that counted. Reported, twice, as "I
                cannot see where I am connecting the line to".

                It has two states, and the difference is the whole point:
                  · HOLLOW  — floating. Releasing here binds nothing.
                  · SOLID   — `drag.current` has been snapped to a real
                              anchor by onRootPointerMove, so releasing
                              lands exactly on the dot being drawn.
                Same white-on-accent vocabulary as a connect dot, so the
                thing you are dragging looks like the things you can drop
                on. */}
            <ConnectEndpointDot
              at={drag.current}
              locked={!!drag.targetShapeId}
              zoom={zoom}
            />
          </g>
        )}

        {/* v0.9.27 — feedback while re-binding an existing endpoint. There
            is no ghost line here: the real arrow is being dragged, so only
            the drop target needs marking. */}
        {drag && drag.mode === 'rebinding' && drag.targetShapeId && (
          <g data-nds-rebind-target="1" style={{ pointerEvents: 'none' }}>
            <BindTargetRing target={bindTargets.get(drag.targetShapeId)} />
          </g>
        )}

        {/* v0.9.54 — the same ring while React Flow drags a connection out
            of a resource handle toward a shape or another card. Canvas's
            `onConnectEnd` commits that drop, so the affordance and the
            outcome agree. */}
        {rfConnectTargetId && (
          <g data-nds-rf-connect-target="1" style={{ pointerEvents: 'none' }}>
            <BindTargetRing target={bindTargets.get(rfConnectTargetId)} />
          </g>
        )}

        {/* v0.9.56 — the same endpoint dot for React Flow's own gesture (a
            drag out of a resource card's connect handle).

            Only while RF's connection is NOT valid. When it IS valid the
            pointer is over a real handle, and that handle already grows and
            fills in via `.nds-connect-handle.connectingto` — a second marker
            on the same pixel would just be two rings fighting.

            `rfConnection.to` is WORLD space here: `useConnection()` has
            already run it through `pointToRendererPoint`. The identical
            field on `onConnectEnd`'s state is RENDERER space. Do not
            "simplify" one into the other. */}
        {rfConnection.inProgress && !rfConnection.isValid && rfConnection.to && (
          <g data-nds-rf-connect-endpoint="1" style={{ pointerEvents: 'none' }}>
            <ConnectEndpointDot
              at={rfConnection.to}
              locked={!!rfConnectTargetId}
              zoom={zoom}
            />
          </g>
        )}

        {/* Multi-select outline for every selected shape (dashed blue box).
            Only the single-selected shape gets full resize handles. */}
        {selectedShapeIds.length > 0 && tool === 'move' && (
          <g data-nds-shape-selection-set="1" style={{ pointerEvents: 'none' }}>
            {selectedShapeIds.map((id) => {
              const sh = shapes.find((s) => s.id === id);
              if (!sh) return null;
              const b = shapeBBox(sh);
              // v0.7.15 — respect per-shape rotation so the outline
              // aligns visually with the rotated shape (not with the
              // unrotated AABB, which looks wrong the moment the shape
              // is turned even a few degrees).
              const rot = shapeRotation(sh);
              const center = shapeCenter(sh);
              const rotXform = rot ? `rotate(${rot} ${center.x} ${center.y})` : undefined;
              return (
                <g key={id} transform={rotXform}>
                  <rect
                    x={b.x - 2}
                    y={b.y - 2}
                    width={b.w + 4}
                    height={b.h + 4}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </g>
        )}

        {singleSelected && tool === 'move' && (
          <SelectionUI
            shape={singleSelected}
            handleSize={handlePxSize}
            onHandlePointerDown={onHandlePointerDown}
          />
        )}

        {marqueeRect && (
          <rect
            data-nds-shape-marquee="1"
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.w}
            height={marqueeRect.h}
            fill="#3b82f6"
            fillOpacity={0.08}
            stroke="#2563eb"
            strokeWidth={marqueeStrokeInv * 1.5}
            strokeDasharray={`${marqueeStrokeInv * 4} ${marqueeStrokeInv * 3}`}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {/* Paint editing controls after handles so rotation grips cannot cover the toolbar. */}
        {editingShapeId &&
          (() => {
            const sh = shapes.find(s => s.id === editingShapeId);
            if (!sh) return null;
            return (
              <ShapeInlineEditor key={sh.id} shape={sh} zoom={zoom}
                onCommit={text => commitEditingText(sh.id, text)}
                onCancel={() => setEditingShapeId(null)}
                onStyleChange={patch => applyStyleToShape(sh.id, patch)} />
            );
          })()}
      </SvgViewport>
    </svg>
  );
}

// Collapse the tail of the undo stack while a move/resize gesture was
// dispatching many updateShape() calls. Rewrite them into a single
// "shape-update" entry with the original snapshot as prevShape.
function finishShapeFeedbackGesture(drag: DragState) {
  if (!drag) return;
  if (drag.mode === 'moving-group') {
    commitGroupMove(drag.shapeIds, drag.snapshots);
    if (drag.nodeCargo.length) useDiagramStore.getState().commitGesture();
  } else if ('snapshot' in drag) collapseTailUpdatesTo(drag.shapeId, drag.snapshot);
}

function collapseTailUpdatesTo(shapeId: string, originalSnapshot: Shape) {
  const s = useTabsStore.getState();
  const stack = s.undoStack;
  // Find the contiguous tail of shape-update entries for this shape.
  let end = stack.length;
  let start = end;
  for (let i = stack.length - 1; i >= 0; i--) {
    const u = stack[i];
    if (u.kind === 'shape-update' && u.shape && u.shape.id === shapeId) {
      start = i;
    } else {
      break;
    }
  }
  if (start >= end) return;
  const finalEntry = stack[end - 1];
  if (!finalEntry.shape) return;
  const collapsed = {
    tabId: finalEntry.tabId,
    kind: 'shape-update' as const,
    shape: finalEntry.shape,
    prevShape: originalSnapshot,
  };
  const nextStack = [...stack.slice(0, start), collapsed];
  useTabsStore.setState({ undoStack: nextStack });
  // Router bookkeeping — every updateShape() call during the drag
  // recorded 'annotation' on the router. We merged (end - start) of
  // them into 1, so drop (end - start - 1) trailing router markers.
  // Without this, the router would leak stale 'annotation' markers
  // and Ctrl+Z would appear to "do nothing" until all leaks were
  // burned off via the shortcut handler's stale-marker fallback loop.
  const collapsedCount = end - start;
  for (let i = 0; i < collapsedCount - 1; i++) undoRouter.dropTailUndo();
}

// After a group move ends, push ONE undo entry per participating shape
// with the pre-drag snapshot as prevShape. `updateShapes()` in the store
// intentionally emits NO undo entries — this function is the whole record
// of the gesture.
function commitGroupMove(shapeIds: string[], snapshots: Shape[]) {
  const tabsState = useTabsStore.getState();
  const active = tabsState.activeTab();
  if (!active) return;
  const currentById = new Map(active.shapes.map((sh) => [sh.id, sh]));
  const entries: {
    tabId: string;
    kind: 'shape-update';
    shape: Shape;
    prevShape: Shape;
  }[] = [];
  for (const snap of snapshots) {
    const now = currentById.get(snap.id);
    if (!now) continue;
    // Skip no-op (drag with zero movement).
    if (JSON.stringify(now) === JSON.stringify(snap)) continue;
    entries.push({
      tabId: active.id,
      kind: 'shape-update',
      shape: now,
      prevShape: snap,
    });
  }
  if (entries.length === 0) return;
  const nextStack = [...tabsState.undoStack, ...entries].slice(-100);
  useTabsStore.setState({ undoStack: nextStack });
  // Router bookkeeping — updateShapes() (plural) during the drag does
  // NOT push per-move entries, so the router hasn't heard anything
  // yet. Emit one 'annotation' marker per pushed entry so Ctrl+Z can
  // route correctly.
  for (let i = 0; i < entries.length; i++) undoRouter.record('annotation');
  void shapeIds;
}

// -------- selection UI (border + handles) ------------------------------

function SelectionUI({
  shape,
  handleSize,
  onHandlePointerDown,
}: {
  shape: Shape;
  handleSize: number;
  onHandlePointerDown: (e: React.PointerEvent, shape: Shape, handle: HandleId) => void;
}) {
  const shapeMid = shapeCenter(shape);
  const handles = handlesFor(shape).map(handle => {
    if (handle.id !== 'rotate') return handle;
    const dx = handle.x - shapeMid.x, dy = handle.y - shapeMid.y;
    const scale = Math.max(1, handleSize * 2 / Math.hypot(dx, dy));
    return { ...handle, x: shapeMid.x + dx * scale, y: shapeMid.y + dy * scale };
  });
  // Bounding rectangle for the visual selection outline.
  let bx = 0, by = 0, bw = 0, bh = 0;
  if (shape.kind === 'arrow') {
    bx = Math.min(shape.from.x, shape.to.x);
    by = Math.min(shape.from.y, shape.to.y);
    bw = Math.abs(shape.to.x - shape.from.x);
    bh = Math.abs(shape.to.y - shape.from.y);
  } else if (shape.kind === 'rect' || shape.kind === 'callout') {
    bx = shape.x; by = shape.y; bw = shape.w; bh = shape.h;
  } else {
    bx = shape.cx - shape.rx; by = shape.cy - shape.ry;
    bw = shape.rx * 2; bh = shape.ry * 2;
  }
  const resizeSize = shape.kind === 'arrow' ? handleSize : Math.min(handleSize, Math.min(bw, bh) / 4);
  const padHandle = resizeSize / 2;
  // v0.7.15 — rotate the entire selection UI (border, resize handles,
  // AND the rotation handle) with the shape. Because handle positions
  // come from `handlesFor` in the shape's LOCAL (unrotated) frame,
  // wrapping them in the same rotation transform as the shape body
  // makes every handle land on the correct rotated screen position with
  // zero extra math.
  const rot = shapeRotation(shape);
  const center = shapeCenter(shape);
  const rotXform = rot ? `rotate(${rot} ${center.x} ${center.y})` : undefined;

  // The rotation handle (if present) needs a "leader stem" — a short
  // vertical line connecting the top-center of the bounding box to the
  // handle circle above it. Draw radius is a good bit larger than a
  // resize handle so the user's eye is drawn to it AND the icon inside
  // has room to read as a rotate glyph, not a squiggle.
  const rotateHandle = handles.find((h) => h.id === 'rotate');
  const rotateStemFromY = by;
  const rotateStemToY = rotateHandle ? rotateHandle.y + handleSize * 0.85 : 0;
  const rotateCircleR = handleSize * 1.15;

  return (
    <g data-nds-shape-selection="1" style={{ pointerEvents: 'none' }}>
      {/* Rotated group: the shape's own outline + resize/rotate handles
          (all rendered in shape-LOCAL coords) get spun by the shape's
          rotation transform so they visually track the rotated shape. */}
      <g transform={rotXform}>
        {shape.kind !== 'arrow' && (
          <rect
            x={bx - 2}
            y={by - 2}
            width={bw + 4}
            height={bh + 4}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {rotateHandle && (
          <line
            x1={bx + bw / 2}
            y1={rotateStemFromY}
            x2={bx + bw / 2}
            y2={rotateStemToY}
            stroke="#2563eb"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        )}
        {handles.filter((h) => h.id !== 'anchor').map((h) => {
          if (h.id === 'rotate') {
            // Rotation handle — a small blue-outlined circle with a
            // curly arrow inside, drawn on top of the leader stem above
            // the top-center of the shape. `onPointerDown` triggers the
            // rotation drag mode.
            return (
              <g
                key={h.id}
                data-nds-shape-handle={h.id}
                style={{ cursor: h.cursor, pointerEvents: 'auto' }}
                onPointerDown={(e) => onHandlePointerDown(e, shape, h.id)}
              >
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={rotateCircleR}
                  fill="#fff"
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
                {/* v0.7.16 — redesigned rotate glyph: a bold 270° arc
                    going CW from 12 o'clock to 9 o'clock, ending in a
                    solid filled arrowhead triangle. Reads unambiguously
                    as "rotate" at any zoom level. */}
                <path
                  d={
                    `M ${h.x} ${h.y - rotateCircleR * 0.55} ` +
                    `A ${rotateCircleR * 0.55} ${rotateCircleR * 0.55} 0 1 1 ` +
                    `${h.x - rotateCircleR * 0.55} ${h.y}`
                  }
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
                <path
                  d={
                    `M ${h.x - rotateCircleR * 0.55} ${h.y + rotateCircleR * 0.3} ` +
                    `L ${h.x - rotateCircleR * 0.85} ${h.y - rotateCircleR * 0.08} ` +
                    `L ${h.x - rotateCircleR * 0.25} ${h.y - rotateCircleR * 0.08} ` +
                    `Z`
                  }
                  fill="#2563eb"
                  stroke="#2563eb"
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          }
          // An arrow's two endpoints are its main control: they set where it
          // points. At the shared 8 px they were very hard to see and to
          // hit, so they are drawn half again as large and given a generous
          // transparent grab pad. Opposite ends of a line can never overlap,
          // so the pad cannot steal a neighbouring handle's clicks.
          const isArrowEnd = shape.kind === 'arrow' && (h.id === 'start' || h.id === 'end');
          if (isArrowEnd) {
            const vis = Math.min(handleSize * 1.5, Math.hypot(bw, bh) / 4);
            const pad = Math.min(handleSize * 3, Math.hypot(bw, bh) / 3);
            return (
              <g
                key={h.id}
                data-nds-shape-handle={h.id}
                style={{ cursor: h.cursor, pointerEvents: 'auto' }}
                onPointerDown={(e) => onHandlePointerDown(e, shape, h.id)}
              >
                <rect
                  x={h.x - pad / 2}
                  y={h.y - pad / 2}
                  width={pad}
                  height={pad}
                  fill="transparent"
                  stroke="none"
                />
                <rect
                  x={h.x - vis / 2}
                  y={h.y - vis / 2}
                  width={vis}
                  height={vis}
                  rx={vis * 0.22}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          }
          return (
            <rect
              key={h.id}
              data-nds-shape-handle={h.id}
              x={h.x - padHandle}
              y={h.y - padHandle}
              width={resizeSize}
              height={resizeSize}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: h.cursor, pointerEvents: 'fill' }}
              onPointerDown={(e) => onHandlePointerDown(e, shape, h.id)}
            />
          );
        })}
      </g>
      {/* v0.7.16 — callout anchor handle stays in WORLD coords (outside
          the rotation transform) so a rotated note keeps pointing at
          the same on-canvas spot the user picked. */}
      {handles
        .filter((h) => h.id === 'anchor')
        .map((h) => (
          <rect
            key={h.id}
            data-nds-shape-handle={h.id}
            x={h.x - padHandle}
            y={h.y - padHandle}
            width={handleSize}
            height={handleSize}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: h.cursor, pointerEvents: 'auto' }}
            onPointerDown={(e) => onHandlePointerDown(e, shape, h.id)}
          />
        ))}
    </g>
  );
}

// Suppress unused: kept for future eraser hit-testing on shapes.
void hitTestShape;
void HIT_PAD;
