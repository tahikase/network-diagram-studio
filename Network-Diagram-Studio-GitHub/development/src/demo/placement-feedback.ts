import { create } from 'zustand';
import { CANVAS_PLACEMENT_FEEDBACK } from '../env';
import { shapeBBox, type BBox } from '../model/containment';
import type { Point, Shape, ShapeArrow, ShapeRect } from './tabs-store';

interface PlacementState {
  paletteVariant: string | null;
  paletteShape: Shape | null;
  nodeIds: readonly string[];
  carriedShapeIds: readonly string[];
}

const empty: PlacementState = { paletteVariant: null, paletteShape: null, nodeIds: [], carriedShapeIds: [] };
export const usePlacementFeedback = create<PlacementState>(() => empty);

export function clearPlacementFeedback(): void {
  usePlacementFeedback.setState(empty);
}

export function beginPalettePreview(variant: string): void {
  if (CANVAS_PLACEMENT_FEEDBACK) usePlacementFeedback.setState({ ...empty, paletteVariant: variant });
}

export function isPreviewArrow(shape: Shape): shape is ShapeArrow | ShapeRect {
  return shape.kind === 'arrow' ||
    (shape.kind === 'rect' && shape.canvasImage === undefined && !!shape.geom?.startsWith('arrow-'));
}

export function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180;
  const c = Math.cos(radians), s = Math.sin(radians);
  const dx = point.x - center.x, dy = point.y - center.y;
  return { x: center.x + dx * c - dy * s, y: center.y + dx * s + dy * c };
}

export function unionBoxes(boxes: readonly BBox[]): BBox | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map(box => box.x)), y = Math.min(...boxes.map(box => box.y));
  return { x, y, w: Math.max(...boxes.map(box => box.x + box.w)) - x, h: Math.max(...boxes.map(box => box.y + box.h)) - y };
}

/** World-space selection bounds; never modifies placement or snapping. */
export function feedbackBox(shape: Shape): BBox {
  const box = shapeBBox(shape);
  if (!shape.rotation) return box;
  const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const points = shape.kind === 'arrow' ? [shape.from, shape.to] : [
    { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y },
    { x: box.x, y: box.y + box.h }, { x: box.x + box.w, y: box.y + box.h },
  ];
  return unionBoxes(points.map(point => ({ ...rotatePoint(point, center, shape.rotation ?? 0), w: 0, h: 0 })))!;
}

export function alignmentGuides(moving: BBox, targets: readonly BBox[], zoom: number) {
  return (['x', 'y'] as const).flatMap(axis => {
    const span = axis === 'x' ? 'w' : 'h';
    const across = axis === 'x' ? 'y' : 'x';
    const acrossSpan = axis === 'x' ? 'h' : 'w';
    let nearest: { distance: number; value: number; from: number; to: number } | null = null;
    for (const target of targets) for (const a of [0, .5, 1]) for (const b of [0, .5, 1]) {
      const value = target[axis] + target[span] * b;
      const distance = Math.abs(moving[axis] + moving[span] * a - value);
      if (distance > 4 / zoom || (nearest && nearest.distance <= distance)) continue;
      nearest = {
        distance, value,
        from: Math.min(moving[across], target[across]) - 12 / zoom,
        to: Math.max(moving[across] + moving[acrossSpan], target[across] + target[acrossSpan]) + 12 / zoom,
      };
    }
    return nearest ? [{ axis, ...nearest }] : [];
  });
}
