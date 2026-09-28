// Shared shape-drop behaviour.
//
// Lives in its own module rather than in `PaletteShapesSection.tsx` because a
// file that exports both components and a hook loses React Fast Refresh.
//
// Three places drop a shape onto the canvas — the Shapes accordion, the
// Favorites tab, and palette search. They must behave identically: same
// diagonal fan-out so repeated clicks don't pile on one pixel, same
// auto-select so the resize handles appear, same text-box edit affordance.

import { useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useAnnotationStore } from './annotation-store';
import { useTabsStore } from './tabs-store';
import { buildShapeFromVariantAt } from './shape-presets';
import { getFlowViewportCenter } from '../canvas/viewport-utils';

export function useShapeDropper() {
  const rf = useReactFlow();
  const dropCountRef = useRef(0);
  const setTool = useAnnotationStore((s) => s.setTool);
  const setSelectedShapes = useAnnotationStore((s) => s.setSelectedShapes);
  const setPendingTextEditShapeId = useAnnotationStore((s) => s.setPendingTextEditShapeId);

  return (variant: string) => {
    const i = dropCountRef.current++ % 6;
    const center = getFlowViewportCenter(rf, { dx: i * 24, dy: i * 24 });
    const shape = buildShapeFromVariantAt(variant, center);
    if (!shape) return;
    useTabsStore.getState().addShape(shape);
    setTool('move');
    // v0.7.15 — auto-select the freshly-dropped shape so the resize +
    // rotation handles appear immediately. Users otherwise wouldn't
    // realize the shape is clickable.
    setSelectedShapes([shape.id]);
    if (variant === 'text-box') {
      setPendingTextEditShapeId(shape.id);
    }
  };
}
