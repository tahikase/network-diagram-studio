// v0.9.68 — the region selector, and the header button that opens it.
//
// Greenshot's region capture commits on mouse-up, and this follows it. An
// earlier build kept the selection adjustable after release, on the reasoning
// that missing by three pixels shouldn't cost you the whole capture — but that
// reasoning predates the editor. Overshooting is now repaired by the crop tool
// one screen later, so the confirm step bought a click and nothing else.
// Undershooting still means re-capturing; that is the accepted trade.
//
// Mouse-up is bound on the WINDOW, not the layer. A release outside the
// viewport must end the drag, or the selection follows the pointer afterwards
// with no button held.
//
// Everything is absolutely positioned in VIEWPORT coordinates and the layer
// carries `data-nds-capture-layer`, which the capture filter excludes — so the
// selector can never photograph itself.

import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { NOTES_IMAGES } from '../env';
import { captureHost, useImagesUi } from './notes-images';
import { captureAndEdit } from './notes-image-insert';
import { PLATE } from './screenshot-annot';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Below this, a drag was a stray click and must not become a picture. */
const MIN_SIDE = 8;

function normalise(ax: number, ay: number, bx: number, by: number): Rect {
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    w: Math.abs(bx - ax),
    h: Math.abs(by - ay),
  };
}

function clampToHost(r: Rect, host: DOMRect): Rect {
  const x = Math.max(host.left, Math.min(r.x, host.right - MIN_SIDE));
  const y = Math.max(host.top, Math.min(r.y, host.bottom - MIN_SIDE));
  return {
    x,
    y,
    w: Math.min(r.w, host.right - x),
    h: Math.min(r.h, host.bottom - y),
  };
}

export function CaptureLayer() {
  const t = useT();
  const capturing = useImagesUi((s) => s.capturing);
  const endCapture = useImagesUi((s) => s.endCapture);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const drag = useRef<{ ax: number; ay: number } | null>(null);
  const hostRect = useRef<DOMRect | null>(null);
  // Mirrors `rect` for the window-level mouse-up, which fires outside React's
  // render cycle and would otherwise read a stale closure.
  const rectRef = useRef<Rect | null>(null);

  const putRect = (r: Rect | null) => {
    rectRef.current = r;
    setRect(r);
  };

  useEffect(() => {
    if (!capturing) {
      putRect(null);
      drag.current = null;
      return;
    }
    hostRect.current = captureHost()?.getBoundingClientRect() ?? null;
  }, [capturing]);

  // Keys are bound on the document, not the layer: the layer has no focus of
  // its own and stealing focus from the canvas would scroll it.
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        endCapture();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [capturing, endCapture]);

  // Release commits, wherever the pointer happens to be.
  useEffect(() => {
    if (!capturing) return;
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      const r = rectRef.current;
      if (r && r.w >= MIN_SIDE && r.h >= MIN_SIDE) void captureAndEdit(r);
      else putRect(null);
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [capturing]);

  if (!NOTES_IMAGES || !capturing) return null;

  const host = hostRect.current;

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { ax: e.clientX, ay: e.clientY };
    putRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const onMove = (e: React.MouseEvent) => {
    setCursor({ x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    const next = normalise(d.ax, d.ay, e.clientX, e.clientY);
    putRect(host ? clampToHost(next, host) : next);
  };

  const ready = !!rect && rect.w >= MIN_SIDE && rect.h >= MIN_SIDE;

  return (
    <div
      data-nds-capture-layer="1"
      className="fixed inset-0 z-[80] select-none"
      style={{ cursor: 'crosshair' }}
      onMouseDown={onDown}
      onMouseMove={onMove}
    >
      {/* Four panes rather than one dimmed box with a hole: a hole needs
          either an SVG mask or `clip-path`, and both are slower to repaint
          than four plain divs while the pointer is moving.
          The dim is an inline colour, not a `bg-slate-900/45` class, so it
          cannot be lost to a CSS purge — a selector that fails to dim is a
          selector the user cannot see the edges of. */}
      {rect
        ? [
            { left: 0, top: 0, width: '100vw', height: rect.y },
            { left: 0, top: rect.y, width: rect.x, height: rect.h },
            { left: rect.x + rect.w, top: rect.y, width: `calc(100vw - ${rect.x + rect.w}px)`, height: rect.h },
            { left: 0, top: rect.y + rect.h, width: '100vw', height: `calc(100vh - ${rect.y + rect.h}px)` },
          ].map((s, i) => (
            <div key={i} className="absolute" style={{ ...s, background: 'rgba(15,23,42,0.5)' }} />
          ))
        : <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.5)' }} />}

      {rect && (
        <div
          className="absolute border-2 border-sky-400 pointer-events-none"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        />
      )}

      {/* Live size readout, kept on screen when the selection runs off an edge. */}
      {rect && rect.w > 0 && (
        <div
          data-nds-capture-size
          className="absolute px-2 py-1 rounded text-white text-[11px] font-mono
                     pointer-events-none whitespace-nowrap"
          style={{
            background: PLATE,
            left: Math.min(rect.x, window.innerWidth - 120),
            top: rect.y > 26 ? rect.y - 24 : rect.y + rect.h + 6,
          }}
        >
          {Math.round(rect.w)} x {Math.round(rect.h)}
        </div>
      )}

      <div
        className="absolute px-3 py-2 rounded-lg text-white text-xs
                   pointer-events-none shadow-lg max-w-[280px]"
        style={{
          background: PLATE,
          left: Math.min(cursor.x + 16, window.innerWidth - 300),
          top: Math.min(cursor.y + 18, window.innerHeight - 70),
        }}
      >
        <div className="font-semibold mb-0.5">
          {ready ? t('Release to open the editor') : t('Drag to select an area')}
        </div>
        <div className="opacity-75">{t('Esc cancels.')}</div>
      </div>
    </div>
  );
}

/**
 * The header entry point. Renders nothing at all when the feature is off, so
 * the prod bundle keeps the exact export group it had.
 */
export function ScreenshotButton({ menuItem = false }: { menuItem?: boolean } = {}) {
  const t = useT();
  const startCapture = useImagesUi((s) => s.startCapture);
  const busy = useImagesUi((s) => s.busy);
  if (!NOTES_IMAGES) return null;
  return (
    <button
      type="button"
      role={menuItem ? 'menuitem' : undefined}
      tabIndex={menuItem ? -1 : undefined}
      aria-label={t('Screenshot')}
      data-nds-screenshot
      disabled={busy}
      onClick={() => startCapture()}
      title={t('Capture part of the diagram into Notes')}
      className={menuItem ? 'nds-menu-item' : `h-8 px-3 rounded-md text-sm font-medium border transition
        whitespace-nowrap shrink-0 inline-flex items-center gap-1.5
        ${busy
          ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed'
          : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-100'}`}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
      </svg>
      <span className="nds-menu-item-copy"><span>{t('Screenshot')}</span>{menuItem && <small>{t('Select an area of the diagram')}</small>}</span>
    </button>
  );
}
