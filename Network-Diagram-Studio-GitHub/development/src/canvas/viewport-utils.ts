// Viewport helpers used by the palette (add-resource-on-click),
// the shape toolbar (drop-shape-on-click), and the icons tab.
//
// All coordinates are returned in FLOW / world space so callers can pass
// them directly to addNode / addShape without any further math.
import type { ReactFlowInstance } from '@xyflow/react';

/**
 * Returns the center of the visible canvas (the <main data-nds-fullscreen-target>
 * element) in flow / world coordinates. Falls back to a reasonable default
 * when the canvas element or React Flow instance is unavailable.
 */
export function getFlowViewportCenter(
  rf: ReactFlowInstance,
  offset?: { dx?: number; dy?: number }
): { x: number; y: number } {
  const main = document.querySelector<HTMLElement>('[data-nds-fullscreen-target]');
  const fallback = { x: 300, y: 220 };
  if (!main) return fallback;
  const rect = main.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return fallback;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const flow = rf.screenToFlowPosition({ x: cx, y: cy });
  return {
    x: flow.x + (offset?.dx ?? 0),
    y: flow.y + (offset?.dy ?? 0),
  };
}
