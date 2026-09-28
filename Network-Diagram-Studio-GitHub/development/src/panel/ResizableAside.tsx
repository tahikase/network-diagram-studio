// Vertical drag-to-resize wrapper for the left palette and the right
// property panel. Persists the chosen width in localStorage, clamps to a
// [min, max] range, and offers a double-click reset back to default.
//
// Usage:
//   <ResizableAside side="right" storageKey="nds.paletteWidth"
//                   defaultWidth={300} minWidth={180} maxWidth={520}
//                   className="h-full flex flex-col bg-white border-r"
//                   style={{ borderColor: 'var(--color-slate-200)' }}>
//     ...panel body...
//   </ResizableAside>
//
// `side` = the side of the aside the drag-handle sits on:
//   "right" for the LEFT panel  (handle on its right inner edge)
//   "left"  for the RIGHT panel (handle on its left inner edge)
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type HandleSide = 'right' | 'left';

interface Props {
  side: HandleSide;
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Optional data-* passthrough for testing hooks etc. */
  [dataAttr: `data-${string}`]: string | undefined;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function readStoredWidth(key: string, fallback: number, min: number, max: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
  } catch {
    return fallback;
  }
}

export function ResizableAside({
  side,
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  className,
  style,
  children,
  ...rest
}: Props) {
  const [width, setWidth] = useState<number>(() =>
    readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth)
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(width));
    } catch {
      // ignore quota / private mode
    }
  }, [storageKey, width]);

  const dragRef = useRef<{
    lastX: number;
    startWidth: number;
    prevBodyCursor: string;
    prevBodySelect: string;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        lastX: e.clientX,
        startWidth: width,
        prevBodyCursor: document.body.style.cursor,
        prevBodySelect: document.body.style.userSelect,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    },
    [width]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.lastX;
      drag.lastX = e.clientX;
      const delta = side === 'right' ? dx : -dx;
      setWidth((prev) => clamp(prev + delta, minWidth, maxWidth));
    },
    [side, minWidth, maxWidth]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    document.body.style.cursor = drag.prevBodyCursor;
    document.body.style.userSelect = drag.prevBodySelect;
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => {
    setWidth(defaultWidth);
  }, [defaultWidth]);

  const handlePosition = side === 'right' ? { right: -3 } : { left: -3 };

  return (
    <aside
      className={className}
      style={{ ...style, width, position: 'relative', flexShrink: 0 }}
      {...rest}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        title="Drag to resize · double-click to reset"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          touchAction: 'none',
          zIndex: 20,
          ...handlePosition,
        }}
        className="group"
      >
        <div
          className="w-[2px] h-full mx-auto bg-transparent group-hover:bg-blue-400 transition-colors"
        />
      </div>
    </aside>
  );
}
