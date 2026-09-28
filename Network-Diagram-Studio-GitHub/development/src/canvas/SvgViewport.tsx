import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useStoreApi, type ReactFlowState } from '@xyflow/react';

function svgTransform([x, y, zoom]: ReactFlowState['transform']): string {
  return `translate(${x}, ${y}) scale(${zoom})`;
}

export function SvgViewport({ children }: { children: ReactNode }) {
  const store = useStoreApi();
  const ref = useRef<SVGGElement>(null);
  const [initialTransform] = useState(() => svgTransform(store.getState().transform));

  // Match React Flow's viewport: move the layer, not its React content.
  useLayoutEffect(() => {
    let previous: ReactFlowState['transform'] | undefined;
    const apply = () => {
      const transform = store.getState().transform;
      if (previous && transform[0] === previous[0] &&
          transform[1] === previous[1] && transform[2] === previous[2]) return;
      previous = transform;
      ref.current?.setAttribute('transform', svgTransform(transform));
    };
    apply();
    return store.subscribe(apply);
  }, [store]);

  return <g ref={ref} transform={initialTransform}>{children}</g>;
}
