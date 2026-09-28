// Demo v0.5: transparent SVG overlay that
//   (a) renders the ACTIVE tab's strokes on top of ReactFlow
//   (b) captures pointer events when the Pen or Eraser tool is active
//   (c) is invisible-to-events when the Move tool is active (so nodes /
//       edges receive clicks and drags normally)
//
// Strokes are stored in FLOW / WORLD coordinates. The overlay listens to
// ReactFlow's viewport and applies the same
// translate(x,y) scale(zoom) transform so strokes stick to the diagram.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { SvgViewport } from '../canvas/SvgViewport';
import { useAnnotationStore, dashArrayFor } from './annotation-store';
import { paintColor } from '../theme/palette';
import {
  findStrokeAt,
  strokeToPath,
  useTabsStore,
  type Point,
  type Stroke,
} from './tabs-store';

// Radius (in FLOW coords) around the eraser pointer that counts as a hit.
// Scaled down at low zoom so the eraser doesn't over-erase when zoomed out.
const ERASER_BASE_RADIUS = 8;

function makeStrokeId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

export function AnnotationOverlay() {
  const rf = useReactFlow();
  const zoom = useStore(s => s.transform[2]);

  const tool = useAnnotationStore((s) => s.tool);
  const color = useAnnotationStore((s) => s.color);
  // Demo v0.6: pen dash/thickness variant (setPenStyle also mirrors
  // thickness into legacy `width` above).
  const penStyle = useAnnotationStore((s) => s.penStyle);
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const addStroke = useTabsStore((s) => s.addStroke);
  const eraseStrokeById = useTabsStore((s) => s.eraseStrokeById);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const strokes = activeTab?.strokes ?? [];
  const strokePaths = useMemo(
    () => strokes.map(stroke => ({ stroke, path: strokeToPath(stroke.points) })),
    [strokes],
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drawing, setDrawing] = useState<Stroke | null>(null);
  const isErasing = useRef(false);

  const toFlow = (e: React.PointerEvent | PointerEvent): Point => {
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    return { x: p.x, y: p.y };
  };

  const captureOn = tool === 'pen' || tool === 'eraser';

  const onPointerDown = (e: React.PointerEvent) => {
    if (!captureOn) return;
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toFlow(e);

    if (tool === 'pen') {
      setDrawing({
        id: makeStrokeId(),
        color,
        width: penStyle.thickness,
        points: [p],
        dash: penStyle.dash,
      });
    } else if (tool === 'eraser') {
      isErasing.current = true;
      const eraserRadius = ERASER_BASE_RADIUS / Math.max(0.2, zoom);
      const hit = findStrokeAt(strokes, p, eraserRadius);
      if (hit) eraseStrokeById(hit.id);
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!captureOn) return;
    const p = toFlow(e);
    if (tool === 'pen' && drawing) {
      const last = drawing.points[drawing.points.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const minStep2 = 1 / Math.max(0.2, zoom);
      if (dx * dx + dy * dy < minStep2) return;
      setDrawing({ ...drawing, points: [...drawing.points, p] });
    } else if (tool === 'eraser' && isErasing.current) {
      const eraserRadius = ERASER_BASE_RADIUS / Math.max(0.2, zoom);
      const hit = findStrokeAt(strokes, p, eraserRadius);
      if (hit) eraseStrokeById(hit.id);
    }
  };

  const finishStroke = () => {
    if (drawing && drawing.points.length > 0) addStroke(drawing);
    setDrawing(null);
    isErasing.current = false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!captureOn) return;
    finishStroke();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    e.stopPropagation();
  };

  const onPointerCancel = () => finishStroke();

  useEffect(() => {
    if (!captureOn && drawing) setDrawing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const cursor =
    tool === 'pen'
      ? 'crosshair'
      : tool === 'eraser'
      ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='9' fill='none' stroke='%23dc2626' stroke-width='2'/></svg>") 12 12, crosshair`
      : 'default';

  return (
    <svg
      ref={svgRef}
      data-nds-annotation-overlay="1"
      className="absolute inset-0 z-20"
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: captureOn ? 'auto' : 'none',
        cursor,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <SvgViewport>
        {strokePaths.map(({ stroke: s, path }) => (
          <path
            key={s.id}
            d={path}
            fill="none"
            stroke={paintColor(s.color)}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashArrayFor(s.dash, s.width)}
            data-nds-stroke={s.id}
          />
        ))}
        {drawing && (
          <path
            d={strokeToPath(drawing.points)}
            fill="none"
            stroke={paintColor(drawing.color)}
            strokeWidth={drawing.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashArrayFor(drawing.dash, drawing.width)}
          />
        )}
      </SvgViewport>
    </svg>
  );
}
