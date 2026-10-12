import type { Shape } from '../demo/tabs-store';
import { shapeBBox, type BBox } from '../model/containment';

export interface ScreenPoint { x: number; y: number }

export const MIN_SELECTION_PX = 24;

export function minimumHitBox(box: BBox, zoom: number): BBox {
  const w = Math.max(box.w, MIN_SELECTION_PX / zoom);
  const h = Math.max(box.h, MIN_SELECTION_PX / zoom);
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

export function subtractHitBoxes(body: BBox, exclusions: readonly BBox[]): BBox[] {
  let regions = [body];
  for (const hole of exclusions) {
    regions = regions.flatMap(box => {
      const left = Math.max(box.x, hole.x), top = Math.max(box.y, hole.y);
      const right = Math.min(box.x + box.w, hole.x + hole.w);
      const bottom = Math.min(box.y + box.h, hole.y + hole.h);
      if (left >= right || top >= bottom) return [box];
      return [
        { x: box.x, y: box.y, w: box.w, h: top - box.y },
        { x: box.x, y: bottom, w: box.w, h: box.y + box.h - bottom },
        { x: box.x, y: top, w: left - box.x, h: bottom - top },
        { x: right, y: top, w: box.x + box.w - right, h: bottom - top },
      ].filter(part => part.w > 0 && part.h > 0);
    });
  }
  return regions;
}

export const boxHitPath = ({ x, y, w, h }: BBox) => `M${x},${y}h${w}v${h}h${-w}Z`;

export function svgHitContains(element: SVGGeometryElement, point: ScreenPoint, mode: string): boolean {
  const matrix = element.getScreenCTM();
  if (!matrix || matrix.a * matrix.d === matrix.b * matrix.c) return false;
  const local = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
  return (mode !== 'stroke' && element.isPointInFill(local)) ||
    (mode !== 'fill' && element.isPointInStroke(local));
}

export function shapeHitsAt(root: ParentNode, point: ScreenPoint, includePadding = false): Set<string> {
  const ids = new Set<string>();
  const padding = new Set<string>();
  for (const element of root.querySelectorAll<SVGGeometryElement>('[data-nds-shape-hit]')) {
    if (!svgHitContains(element, point, element.dataset.ndsShapeHit ?? 'all')) continue;
    const id = element.closest('[data-nds-shape]')?.getAttribute('data-nds-shape');
    if (id) (element.hasAttribute('data-nds-selection-padding') ||
      element.hasAttribute('data-nds-selection-band') ? padding : ids).add(id);
  }
  if (includePadding || !ids.size) for (const id of padding) ids.add(id);
  return ids;
}

export function rotatedShapeBounds(shape: Shape): BBox {
  const box = shapeBBox(shape);
  const radians = (shape.rotation ?? 0) * Math.PI / 180;
  if (!radians) return box;
  const cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians));
  const w = box.w * cos + box.h * sin, h = box.w * sin + box.h * cos;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
