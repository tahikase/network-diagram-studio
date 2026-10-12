import { useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { boxHitPath } from './shape-hit-test';

export function ExcludeHitRegions({ body, exclusions, children }: {
  body: string;
  exclusions: string[];
  children: ReactElement;
}) {
  const prefix = useId();
  const clips = exclusions.map((path, index) => ({ id: `${prefix}-hit-${index}`, path: body + path }));
  let region = children;
  // Separate clips subtract the union; one even-odd path refills overlapping holes.
  for (const clip of clips) region = <g clipPath={`url(#${clip.id})`}>{region}</g>;
  return <>
    <defs>{clips.map(clip => (
      <clipPath key={clip.id} id={clip.id} clipPathUnits="userSpaceOnUse">
        <path d={clip.path} clipRule="evenodd" />
      </clipPath>
    ))}</defs>
    {region}
  </>;
}

export function ExcludeStrokeHitRegions({ exclusions, strokeWidth, children }: {
  exclusions: string[];
  strokeWidth: number;
  children: ReactElement;
}) {
  const ref = useRef<SVGGElement>(null);
  const [body, setBody] = useState<string | null>(null);
  useLayoutEffect(() => {
    const element = ref.current, matrix = element?.getScreenCTM();
    if (!element || !matrix) return;
    const scale = Math.hypot(matrix.a, matrix.b);
    if (!scale) return;
    const bounds = element.getBBox();
    const pad = (strokeWidth / 2 + 1) / scale;
    setBody(boxHitPath({ x: bounds.x - pad, y: bounds.y - pad, w: bounds.width + 2 * pad, h: bounds.height + 2 * pad }));
  }, [children, strokeWidth]);
  return <g ref={ref}>{body
    ? <ExcludeHitRegions body={body} exclusions={exclusions}>{children}</ExcludeHitRegions>
    : children}</g>;
}
