import { useViewport } from '@xyflow/react';
import { alignmentGuides } from './placement-feedback';
import type { BBox } from '../model/containment';
import type { Point } from './tabs-store';

export function PlacementGuides({ box, targets, width, height, point }: {
  box: BBox; targets: readonly BBox[];
  width: number; height: number; point?: Point;
}) {
  const viewport = useViewport();
  const { zoom } = viewport;
  const position = point ?? box;
  const text = `X: ${Math.round(position.x)}, Y: ${Math.round(position.y)}`;
  const labelWidth = text.length * 7.2 + 16;
  const x = (Math.max(8, Math.min(viewport.x + (box.x + box.w / 2) * zoom - labelWidth / 2, width - labelWidth - 8)) - viewport.x) / zoom;
  const y = (Math.max(8, Math.min(viewport.y + (box.y + box.h) * zoom + 12, height - 32)) - viewport.y) / zoom;
  return <g data-nds-placement-feedback="guides" style={{ pointerEvents: 'none' }} aria-hidden="true">
    {alignmentGuides(box, targets, zoom).map(guide => <line key={guide.axis}
      data-nds-alignment-guide={guide.axis} data-nds-guide-value={guide.value}
      x1={guide.axis === 'x' ? guide.value : guide.from} y1={guide.axis === 'x' ? guide.from : guide.value}
      x2={guide.axis === 'x' ? guide.value : guide.to} y2={guide.axis === 'x' ? guide.to : guide.value}
      stroke="var(--nds-degraded)" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`}
    />)}
    <rect data-nds-position-outline x={box.x} y={box.y} width={box.w} height={box.h}
      fill="none" stroke="var(--nds-accent-text)" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} />
    <g data-nds-position-tooltip data-x={position.x} data-y={position.y}
      transform={`translate(${x}, ${y}) scale(${1 / zoom})`}>
      <rect width={labelWidth} height={24} rx={4} fill="var(--nds-panel)" stroke="var(--nds-border)" />
      <text x={8} y={16} fontSize={12} fill="var(--nds-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</text>
    </g>
  </g>;
}
