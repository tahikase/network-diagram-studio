import { useId } from 'react';
import type { BBox } from '../model/containment';

const boxPath = ({ x, y, w, h }: BBox) => `M${x},${y}h${w}v${h}h${-w}Z`;

export function ResourceHitRegion({ width, height, exclusions }: {
  width: number;
  height: number;
  exclusions: BBox[];
}) {
  const prefix = useId();
  const body = boxPath({ x: 0, y: 0, w: width, h: height });
  const clips = exclusions.map((box, index) => ({
    id: `${prefix}-resource-hit-${index}`,
    path: body + boxPath(box),
  }));
  let interior = <rect width={width} height={height} fill="transparent" style={{ pointerEvents: 'fill' }} />;
  // Intersect the exclusions; an even-odd path alone refills overlapping holes.
  for (const clip of clips) interior = <g clipPath={`url(#${clip.id})`}>{interior}</g>;
  return (
    <svg
      data-nds-resource-hit="1"
      aria-hidden="true"
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs>{clips.map(clip => (
        <clipPath key={clip.id} id={clip.id} clipPathUnits="userSpaceOnUse">
          <path d={clip.path} clipRule="evenodd" />
        </clipPath>
      ))}</defs>
      {interior}
      <rect x={1} y={1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)}
        rx={12} fill="none" stroke="transparent" strokeWidth={6}
        style={{ pointerEvents: 'stroke' }} />
    </svg>
  );
}
