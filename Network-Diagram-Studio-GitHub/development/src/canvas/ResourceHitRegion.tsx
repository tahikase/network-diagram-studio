import type { BBox } from '../model/containment';
import { useStore } from '@xyflow/react';
import { ExcludeHitRegions } from './ExcludeHitRegions';
import { boxHitPath, minimumHitBox, subtractHitBoxes } from './shape-hit-test';

export function ResourceHitRegion({ width, height, exclusions, paddingExclusions }: {
  width: number;
  height: number;
  exclusions: BBox[];
  paddingExclusions: BBox[];
}) {
  const zoom = useStore(state => state.transform[2]);
  const body = boxHitPath({ x: 0, y: 0, w: width, h: height });
  const hitBox = minimumHitBox({ x: 0, y: 0, w: width, h: height }, zoom);
  return (
    <svg
      data-nds-resource-hit="1"
      aria-hidden="true"
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      {(hitBox.w > width || hitBox.h > height) &&
        subtractHitBoxes(hitBox, paddingExclusions).map((box, index) =>
          <rect key={index} data-nds-resource-padding x={box.x} y={box.y} width={box.w} height={box.h}
            fill="transparent" style={{ pointerEvents: 'fill' }} />)}
      <ExcludeHitRegions body={body} exclusions={exclusions.map(boxHitPath)}>
        <rect width={width} height={height} fill="transparent" style={{ pointerEvents: 'fill' }} />
      </ExcludeHitRegions>
      <rect x={1} y={1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)}
        rx={12} fill="none" stroke="transparent" strokeWidth={6}
        style={{ pointerEvents: 'stroke' }} />
    </svg>
  );
}
