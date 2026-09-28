// v0.9.67 — the annotation editor that opens after a region is captured.
//
// Greenshot's editor is the reason people install Greenshot, so this follows
// its shape: capture, then a modal with a tool rail, then copy or insert. What
// it does NOT copy is Greenshot's habit of opening a second OS window — this
// is a `file://` page, so everything stays in one overlay.
//
// THE CANVAS IS THE DOCUMENT. Shapes are drawn with the same `paintScene` the
// exporter uses, so the preview is the file, not an approximation of it. The
// only thing drawn on top is the selection outline, by a separate function the
// exporter never calls.
//
// SCALE. The bitmap is 2x the screen it came from and can be 2600px wide, so
// it is displayed scaled to fit. `scale` converts pointer positions into image
// pixels exactly once, in `toImage`. Nothing downstream knows about display
// units, which is what keeps shapes still when the window is resized.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { NOTES_IMAGES } from '../env';
import { copyPngToClipboard, useImagesUi } from './notes-images';
import { saveEdited } from './notes-image-insert';
import { PEN_COLORS } from '../theme/palette';
import {
  DEFAULT_COLOR,
  FONT_SIZE,
  HIGHLIGHT_HEX,
  THICKNESS,
  canvasOf,
  cropScene,
  decodeToCanvas,
  handleAt,
  hitTest,
  isBoxy,
  normBox,
  boundsOf,
  paintHandles,
  paintScene,
  pixelateRegion,
  PLATE,
  resized,
  shapeId,
  snapAngle,
  snapSquare,
  translated,
  type Box,
  type EditorTool,
  type HandleId,
  type Shape,
  type SizeKey,
} from './screenshot-annot';

interface Snapshot {
  base: HTMLCanvasElement;
  shapes: Shape[];
}

/** Tools that are drawn by dragging a box rather than placed by a click. */
const BOX_TOOLS = new Set<EditorTool>([
  'rect', 'ellipse', 'highlight', 'callout', 'blur', 'crop',
]);

const TOOL_ORDER: EditorTool[] = [
  'select', 'arrow', 'rect', 'ellipse', 'callout', 'highlight',
  'text', 'counter', 'blur', 'crop',
];

/**
 * Single-key tool switches. Plain letters only — every one of these is also a
 * printable character, so they are ignored while a text field has focus.
 */
const SHORTCUT: Record<EditorTool, string> = {
  select: 'v', arrow: 'a', rect: 'r', ellipse: 'o', callout: 'c', highlight: 'h',
  text: 't', counter: 'n', blur: 'b', crop: 'x',
};

function toolLabel(tool: EditorTool, t: (s: string) => string): string {
  switch (tool) {
    case 'select': return t('Select');
    case 'arrow': return t('Arrow');
    case 'rect': return t('Box');
    case 'ellipse': return t('Ellipse');
    case 'callout': return t('Callout');
    case 'highlight': return t('Highlight');
    case 'text': return t('Text');
    case 'counter': return t('Step number');
    case 'blur': return t('Blur');
    case 'crop': return t('Crop');
  }
}

function ToolIcon({ tool }: { tool: EditorTool }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (tool) {
    case 'select':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><path d="m4 3 7 17 2-7 7-2z" /></svg>;
    case 'arrow':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><path d="M5 19 19 5M11 5h8v8" /></svg>;
    case 'rect':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /></svg>;
    case 'ellipse':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><ellipse cx="12" cy="12" rx="9" ry="7" /></svg>;
    case 'callout':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><path d="M4 4h16v11h-7l-4 4v-4H4z" /></svg>;
    case 'highlight':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><path d="M4 14h10l6-9H10z" /><path d="M4 19h16" /></svg>;
    case 'text':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><path d="M5 6V4h14v2M12 4v16M9 20h6" /></svg>;
    case 'counter':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="M11 8.5 13 7.5V17" /></svg>;
    case 'blur':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /><rect x="13" y="3" width="8" height="8" opacity="0.4" /><rect x="3" y="13" width="8" height="8" opacity="0.4" /></svg>;
    case 'crop':
      return <svg width={18} height={18} viewBox="0 0 24 24" {...p}><path d="M6 2v16h16M2 6h16v16" /></svg>;
  }
}

export function ScreenshotEditor() {
  const t = useT();
  const editing = useImagesUi((s) => s.editing);
  const existing = useImagesUi((s) => s.editingExisting);
  const closeEditor = useImagesUi((s) => s.closeEditor);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<EditorTool>('arrow');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [sizeKey, setSizeKey] = useState<SizeKey>('sm');
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<Box | null>(null);
  const [caption, setCaption] = useState('');
  const [toast, setToast] = useState('');
  const [typing, setTyping] = useState<
    { x: number; y: number; id: string | null; value: string; box: Box | null } | null
  >(null);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const gesture = useRef<
    | { mode: 'draw'; ax: number; ay: number }
    | { mode: 'move'; id: string; ax: number; ay: number; from: Shape; snap: Shape[] }
    | { mode: 'resize'; id: string; handle: HandleId; from: Shape; snap: Shape[] }
    | null
  >(null);
  const [historyRev, setHistoryRev] = useState(0);

  // Load the incoming picture into a canvas we can paint over.
  useEffect(() => {
    if (!editing) {
      setBase(null);
      setShapes([]);
      return;
    }
    let live = true;
    setCaption(editing.caption ?? '');
    setSelected(null);
    setTyping(null);
    // Size starts at S for every capture. It is the one control that carries a
    // cost when it is wrong — an L arrow drawn on a small crop covers what it
    // was meant to point at — and the last picture's choice is a poor guess for
    // the next one, which may be a different size entirely.
    setSizeKey('sm');
    past.current = [];
    future.current = [];
    setHistoryRev((r) => r + 1);
    void decodeToCanvas(editing.png).then((c) => {
      if (!live || !c) return;
      setBase(c);
      setShapes((editing.shapes ?? []) as Shape[]);
    });
    return () => { live = false; };
  }, [editing]);

  // Fit-to-window. Recomputed on resize so the editor is usable on a laptop
  // and on a 4K panel without two sets of numbers.
  useEffect(() => {
    if (!base) return;
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      // clientWidth/Height include padding, so measure it rather than hard-coding
      // the p-4: a canvas sized to the padding box always overflows by 2x pad.
      const cs = getComputedStyle(el);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const availW = el.clientWidth - padX;
      const availH = el.clientHeight - padY;
      if (availW < 10 || availH < 10) return;
      setScale(Math.min(1, availW / base.width, availH / base.height));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [base]);

  const repaint = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !base) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    paintScene(ctx, base, shapes);
    const sel = shapes.find((s) => s.id === selected);
    if (sel) paintHandles(ctx, sel, scale);
    if (drag) {
      ctx.save();
      ctx.setLineDash([8 / scale, 6 / scale]);
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = tool === 'crop' ? '#0ea5e9' : '#64748b';
      if (tool === 'arrow') {
        // A line, not a box: Shift snapping to 45° is invisible otherwise.
        ctx.beginPath();
        ctx.moveTo(drag.x, drag.y);
        ctx.lineTo(drag.x + drag.w, drag.y + drag.h);
        ctx.stroke();
      } else if (tool === 'ellipse') {
        const b = normBox(drag.x, drag.y, drag.x + drag.w, drag.y + drag.h);
        ctx.beginPath();
        ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w / 2, 1), Math.max(b.h / 2, 1), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(drag.x, drag.y, drag.w, drag.h);
      }
      if (tool === 'crop') {
        // Show what is about to be thrown away, so it does not land as a
        // surprise after the mouse comes up.
        ctx.fillStyle = 'rgba(15,23,42,0.45)';
        ctx.fillRect(0, 0, base.width, drag.y);
        ctx.fillRect(0, drag.y + drag.h, base.width, base.height - drag.y - drag.h);
        ctx.fillRect(0, drag.y, drag.x, drag.h);
        ctx.fillRect(drag.x + drag.w, drag.y, base.width - drag.x - drag.w, drag.h);
      }
      ctx.restore();
    }
  }, [base, shapes, selected, scale, drag, tool]);

  useEffect(() => { repaint(); }, [repaint]);

  // Test hook. A window handle rather than a `data-` attribute because the
  // shape list changes on every pointer move while drawing, and re-serialising
  // it into the DOM that often would be real work done for nobody.
  useEffect(() => {
    window.__nds_shot = {
      shapes,
      w: base?.width ?? 0,
      h: base?.height ?? 0,
      selected,
      tool,
    };
  }, [shapes, base, selected, tool]);

  const push = useCallback(() => {
    if (!base) return;
    past.current.push({ base, shapes: shapes.slice() });
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    setHistoryRev((r) => r + 1);
  }, [base, shapes]);

  /**
   * Record a state captured EARLIER in the same gesture.
   *
   * `push` snapshots the live state, which is right for every tool that pushes
   * before it mutates. A move or a resize cannot: the shape changes on every
   * mouse-move, so by the time the button comes up the pre-gesture state is
   * already gone. Those gestures keep their own snapshot from mouse-down and
   * hand it back here — otherwise Undo restores the state it is meant to leave
   * and appears to do nothing at all.
   */
  const pushSnapshot = useCallback((snap: Shape[]) => {
    if (!base) return;
    past.current.push({ base, shapes: snap });
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    setHistoryRev((r) => r + 1);
  }, [base]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !base) return;
    future.current.push({ base, shapes: shapes.slice() });
    setBase(prev.base);
    setShapes(prev.shapes);
    setSelected(null);
    setHistoryRev((r) => r + 1);
  }, [base, shapes]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !base) return;
    past.current.push({ base, shapes: shapes.slice() });
    setBase(next.base);
    setShapes(next.shapes);
    setSelected(null);
    setHistoryRev((r) => r + 1);
  }, [base, shapes]);

  const nextCounter = useMemo(
    () => shapes.reduce((n, s) => (s.kind === 'counter' ? Math.max(n, s.n) : n), 0) + 1,
    [shapes],
  );

  /** The one place display pixels become image pixels. */
  const toImage = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const commitTyping = useCallback(() => {
    const ty = typing;
    if (!ty) return;
    setTyping(null);
    const text = ty.value.replace(/\s+$/, '');
    if (ty.id) {
      push();
      setShapes((list) =>
        text
          ? list.map((s) => (s.id === ty.id && (s.kind === 'text' || s.kind === 'callout')
            ? { ...s, text } : s))
          : list.filter((s) => s.id !== ty.id),
      );
      return;
    }
    if (!text) return;
    push();
    if (ty.box) {
      const b = ty.box;
      // The tail starts below the bubble rather than at its edge, so the shape
      // reads as a callout immediately and the user drags it rather than
      // discovering it. Capped: a tail that scales freely with a tall bubble
      // ends up longer than the thing it points at, or off the picture.
      const drop = Math.max(40, Math.min(b.h * 0.55, 90));
      const ty0 = Math.min(b.y + b.h + drop, (base?.height ?? b.y + b.h) - 6);
      setShapes((list) => [
        ...list,
        {
          id: shapeId(), kind: 'callout', ...b,
          tx: b.x + b.w / 2, ty: ty0,
          text, color, size: FONT_SIZE[sizeKey], width: THICKNESS[sizeKey],
        },
      ]);
      return;
    }
    setShapes((list) => [
      ...list,
      { id: shapeId(), kind: 'text', x: ty.x, y: ty.y, text, color, size: FONT_SIZE[sizeKey] },
    ]);
  }, [typing, push, color, sizeKey, base]);

  const onDown = (e: React.MouseEvent) => {
    if (!base) return;
    if (typing) { commitTyping(); return; }
    e.preventDefault();
    const p = toImage(e);

    if (tool === 'select') {
      const ctx = canvasRef.current?.getContext('2d') ?? undefined;
      // A handle on the CURRENT selection is checked before any hit test:
      // handles sit on the shape's edge, where a neighbouring shape drawn
      // later would otherwise win the click and the handle become unusable.
      const sel = shapes.find((s) => s.id === selected);
      if (sel) {
        const h = handleAt(sel, p.x, p.y, 9 / scale);
        if (h) {
          gesture.current = { mode: 'resize', id: sel.id, handle: h, from: sel, snap: shapes.slice() };
          return;
        }
      }
      const hit = hitTest(shapes, p.x, p.y, ctx);
      // A selected box can also be dragged from its interior. Frames are
      // hollow so that a click can reach whatever they surround — but once
      // the frame IS the thing being worked on, that rule leaves only its
      // stroke to grab, and on a small box the eight handles eat the stroke
      // entirely. Interior-drag applies to the selection only, so clicking
      // through an unselected frame still works.
      const inside = sel && isBoxy(sel) ? boundsOf(sel, ctx) : null;
      if (!hit && inside && p.x >= inside.x && p.x <= inside.x + inside.w
          && p.y >= inside.y && p.y <= inside.y + inside.h) {
        gesture.current = { mode: 'move', id: sel!.id, ax: p.x, ay: p.y, from: sel!, snap: shapes.slice() };
        return;
      }
      setSelected(hit?.id ?? null);
      if (hit) gesture.current = { mode: 'move', id: hit.id, ax: p.x, ay: p.y, from: hit, snap: shapes.slice() };
      return;
    }

    if (tool === 'text') {
      setTyping({ x: p.x, y: p.y, id: null, value: '', box: null });
      return;
    }

    if (tool === 'counter') {
      push();
      setShapes((list) => [
        ...list,
        { id: shapeId(), kind: 'counter', x: p.x, y: p.y, n: nextCounter, color, size: FONT_SIZE[sizeKey] },
      ]);
      return;
    }

    gesture.current = { mode: 'draw', ax: p.x, ay: p.y };
    setDrag({ x: p.x, y: p.y, w: 0, h: 0 });
    setSelected(null);
  };

  /**
   * Where the pointer counts as being, once Shift has had its say.
   * Boxes become squares; arrows snap to the nearest 45°.
   */
  const constrained = (ax: number, ay: number, p: { x: number; y: number }, shift: boolean) => {
    if (!shift) return p;
    return BOX_TOOLS.has(tool) ? snapSquare(ax, ay, p.x, p.y) : snapAngle(ax, ay, p.x, p.y);
  };

  const onMove = (e: React.MouseEvent) => {
    const g = gesture.current;
    if (!g || !base) return;
    const p = toImage(e);
    if (g.mode === 'move') {
      const dx = p.x - g.ax;
      const dy = p.y - g.ay;
      setShapes((list) => list.map((s) => (s.id === g.id ? translated(g.from, dx, dy) : s)));
      return;
    }
    if (g.mode === 'resize') {
      setShapes((list) =>
        list.map((s) => (s.id === g.id ? resized(g.from, g.handle, p.x, p.y, e.shiftKey) : s)));
      return;
    }
    const q = constrained(g.ax, g.ay, p, e.shiftKey);
    setDrag(BOX_TOOLS.has(tool)
      ? normBox(g.ax, g.ay, q.x, q.y)
      : { x: g.ax, y: g.ay, w: q.x - g.ax, h: q.y - g.ay });
  };

  const onUp = (e: React.MouseEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !base) return;

    if (g.mode === 'move' || g.mode === 'resize') {
      // The shapes array already carries the change, so what gets recorded is
      // the snapshot taken at mouse-down — not the live state, which is the
      // result. A gesture that changed nothing (a plain click on a shape)
      // leaves no undo frame.
      const now = shapes.find((s) => s.id === g.id);
      if (now && JSON.stringify(now) !== JSON.stringify(g.from)) pushSnapshot(g.snap);
      return;
    }

    const raw = toImage(e);
    const p = constrained(g.ax, g.ay, raw, e.shiftKey);
    setDrag(null);
    const box = normBox(g.ax, g.ay, p.x, p.y);
    const tiny = box.w < 6 && box.h < 6;

    if (tool === 'crop') {
      if (box.w < 16 || box.h < 16) return;
      push();
      const out = cropScene(base, shapes, box);
      setBase(out.base);
      setShapes(out.shapes);
      return;
    }
    if (tool === 'blur') {
      if (tiny) return;
      push();
      setBase(pixelateRegion(base, box));
      return;
    }
    if (tiny) return;

    if (tool === 'callout') {
      // No shape yet — an empty bubble is not worth undoing, so the text is
      // collected first and the shape created on commit.
      setTyping({ x: box.x, y: box.y, id: null, value: '', box });
      return;
    }

    push();
    if (tool === 'arrow') {
      setShapes((list) => [
        ...list,
        { id: shapeId(), kind: 'arrow', x1: g.ax, y1: g.ay, x2: p.x, y2: p.y, color, width: THICKNESS[sizeKey] },
      ]);
    } else if (tool === 'rect') {
      setShapes((list) => [
        ...list,
        { id: shapeId(), kind: 'rect', ...box, color, width: THICKNESS[sizeKey] },
      ]);
    } else if (tool === 'ellipse') {
      setShapes((list) => [
        ...list,
        { id: shapeId(), kind: 'ellipse', ...box, color, width: THICKNESS[sizeKey] },
      ]);
    } else if (tool === 'highlight') {
      setShapes((list) => [...list, { id: shapeId(), kind: 'highlight', ...box, color: HIGHLIGHT_HEX }]);
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!base) return;
    const p = toImage(e);
    const ctx = canvasRef.current?.getContext('2d') ?? undefined;
    const hit = hitTest(shapes, p.x, p.y, ctx);
    if (hit?.kind === 'text') {
      setTool('select');
      setTyping({ x: hit.x, y: hit.y, id: hit.id, value: hit.text, box: null });
    } else if (hit?.kind === 'callout') {
      setTool('select');
      setTyping({ x: hit.x, y: hit.y, id: hit.id, value: hit.text, box: hit });
    }
  };

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    push();
    setShapes((list) => list.filter((s) => s.id !== selected));
    setSelected(null);
  }, [selected, push]);

  /** Recolour / resize whatever is selected, so a mistake is fixable in place. */
  const restyle = useCallback((patch: Partial<{ color: string; size: SizeKey }>) => {
    if (!selected) return;
    push();
    setShapes((list) =>
      list.map((s) => {
        if (s.id !== selected) return s;
        const next = { ...s } as Shape;
        // A highlighter that is not translucent yellow is just a filled box,
        // so its colour is left alone on purpose.
        if (patch.color && next.kind !== 'highlight') next.color = patch.color;
        if (patch.size) {
          if (next.kind === 'text' || next.kind === 'counter') next.size = FONT_SIZE[patch.size];
          else if (next.kind === 'callout') {
            next.size = FONT_SIZE[patch.size];
            next.width = THICKNESS[patch.size];
          } else if (next.kind === 'arrow' || next.kind === 'rect' || next.kind === 'ellipse') {
            next.width = THICKNESS[patch.size];
          }
        }
        return next;
      }),
    );
  }, [selected, push]);

  const flatten = useCallback((): string | null => {
    if (!base) return null;
    const out = canvasOf(base.width, base.height);
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    paintScene(ctx, base, shapes);
    return out.toDataURL('image/png');
  }, [base, shapes]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1800);
  };

  const onCopy = useCallback(async () => {
    const png = flatten();
    if (!png) return;
    flash(await copyPngToClipboard(png) ? t('Copied to clipboard') : t('Could not copy — use Add to Notes'));
  }, [flatten, t]);

  const onSaveFile = useCallback(() => {
    const png = flatten();
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
  }, [flatten]);

  const onInsert = useCallback(() => {
    if (!editing || !base) return;
    // `base` is stored, NOT the flattened result: shapes stay editable, and
    // the picture is held once rather than twice. Blur and crop are already
    // part of `base`, so a redaction is gone for good either way.
    const png = base.toDataURL('image/png');
    saveEdited(
      { ...editing, png, w: base.width, h: base.height, caption, shapes: shapes.length ? shapes : undefined },
      existing,
    );
  }, [editing, base, shapes, caption, existing]);

  // Keys are bound on the document with capture: the canvas is not focusable
  // and the notes editor below would otherwise eat Delete and Ctrl+Z.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const inField = (e.target as HTMLElement | null)?.tagName?.match(/INPUT|TEXTAREA/);
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (typing) { setTyping(null); return; }
        closeEditor();
        return;
      }
      if (inField) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        void onCopy();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const hit = TOOL_ORDER.find((k) => SHORTCUT[k] === e.key.toLowerCase());
      if (hit) {
        e.preventDefault();
        // The diagram behind the modal has its own letter shortcuts. Stop the
        // event here or picking a pen also does something to the diagram.
        e.stopPropagation();
        setTool(hit);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [editing, typing, selected, deleteSelected, undo, redo, onCopy, closeEditor]);

  if (!NOTES_IMAGES || !editing) return null;

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  void historyRev; // re-render hook for the two refs above

  const sizeKeys: SizeKey[] = ['sm', 'md', 'lg'];

  return (
    <div
      data-nds-shot-editor="1"
      className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: 'rgba(15,23,42,0.72)' }}
    >
      <div className="flex-1 min-h-0 m-4 mb-0 rounded-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Tool rail */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex-wrap">
          <div className="flex items-center gap-1">
            {TOOL_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                data-nds-shot-tool={k}
                title={`${toolLabel(k, t)} (${SHORTCUT[k].toUpperCase()})`}
                aria-pressed={tool === k}
                onClick={() => { setTool(k); setSelected(null); }}
                className={`h-8 w-8 grid place-items-center rounded-md border transition
                  ${tool === k
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <ToolIcon tool={k} />
              </button>
            ))}
          </div>

          <span className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-1" role="radiogroup" aria-label={t('Annotation colour')}>
            {PEN_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                data-nds-shot-color={c.key}
                title={c.label}
                role="radio"
                aria-checked={color.toLowerCase() === c.hex.toLowerCase()}
                aria-label={c.label}
                onClick={() => { setColor(c.hex); restyle({ color: c.hex }); }}
                className={`h-6 w-6 rounded-full border-2 transition
                  ${color.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-sky-500 scale-110'
                    : 'border-slate-300 dark:border-slate-600'}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>

          <span className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-1" role="radiogroup" aria-label={t('Size')}>
            {sizeKeys.map((k) => (
              <button
                key={k}
                type="button"
                data-nds-shot-size={k}
                role="radio"
                aria-checked={sizeKey === k}
                onClick={() => { setSizeKey(k); restyle({ size: k }); }}
                className={`h-8 px-2.5 rounded-md border text-xs font-semibold transition
                  ${sizeKey === k
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {k === 'sm' ? t('S') : k === 'md' ? t('M') : t('L')}
              </button>
            ))}
          </div>

          <span className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            data-nds-shot-undo
            disabled={!canUndo}
            onClick={undo}
            title={t('Undo')}
            className="h-8 px-2.5 rounded-md border text-xs font-medium bg-white dark:bg-slate-800
                       text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600
                       hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          >
            {t('Undo')}
          </button>
          <button
            type="button"
            data-nds-shot-redo
            disabled={!canRedo}
            onClick={redo}
            title={t('Redo')}
            className="h-8 px-2.5 rounded-md border text-xs font-medium bg-white dark:bg-slate-800
                       text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600
                       hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          >
            {t('Redo')}
          </button>
          {selected && (
            <button
              type="button"
              data-nds-shot-delete
              onClick={deleteSelected}
              className="h-8 px-2.5 rounded-md border text-xs font-medium border-rose-300 text-rose-700
                         bg-rose-50 hover:bg-rose-100"
            >
              {t('Delete')}
            </button>
          )}
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className="flex-1 min-h-0 overflow-auto grid place-items-center bg-slate-100 dark:bg-slate-950 p-4 relative">
          {base && (
            <div className="relative" style={{ width: base.width * scale, height: base.height * scale }}>
              <canvas
                ref={canvasRef}
                data-nds-shot-canvas
                width={base.width}
                height={base.height}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={onUp}
                onDoubleClick={onDoubleClick}
                className="block shadow-md rounded"
                style={{
                  width: base.width * scale,
                  height: base.height * scale,
                  cursor: tool === 'select' ? 'default' : 'crosshair',
                }}
              />
              {typing && (
                <textarea
                  autoFocus
                  data-nds-shot-text
                  value={typing.value}
                  onChange={(e) => setTyping({ ...typing, value: e.target.value })}
                  onBlur={commitTyping}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTyping(); }
                  }}
                  placeholder={t('Type, then Enter')}
                  className="absolute bg-white/95 border-2 border-sky-500 rounded px-1 py-0.5
                             outline-none resize-none shadow-lg"
                  style={{
                    left: typing.x * scale,
                    top: typing.y * scale,
                    // A callout types inside its own bubble, so what you see
                    // while typing is the space the text will actually get.
                    width: typing.box ? typing.box.w * scale : undefined,
                    minWidth: typing.box ? undefined : 140,
                    height: typing.box
                      ? typing.box.h * scale
                      : Math.max(28, (typing.value.split('\n').length) * FONT_SIZE[sizeKey] * scale * 1.3),
                    color: typing.box ? undefined : color,
                    fontSize: Math.max(11, FONT_SIZE[sizeKey] * scale),
                    fontWeight: 600,
                    lineHeight: 1.25,
                    textAlign: typing.box ? 'center' : 'start',
                  }}
                />
              )}
            </div>
          )}
          {toast && (
            <div
              data-nds-shot-toast
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md
                         text-white text-xs shadow-lg"
              style={{ background: PLATE }}
            >
              {toast}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 flex-wrap">
          <input
            data-nds-shot-caption
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 120))}
            placeholder={t('Caption (optional)')}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-sm
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 min-w-[180px] flex-1 max-w-xs"
          />
          <span className="flex-1" />
          <button
            type="button"
            data-nds-shot-savefile
            onClick={onSaveFile}
            className="h-9 px-3.5 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t('Save .png')}
          </button>
          <button
            type="button"
            data-nds-shot-copy
            onClick={() => void onCopy()}
            className="h-9 px-3.5 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t('Copy')}
          </button>
          <button
            type="button"
            data-nds-shot-insert
            onClick={onInsert}
            className="h-9 px-4 rounded-md bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500"
          >
            {existing ? t('Save changes') : t('Add to Notes')}
          </button>
          <button
            type="button"
            data-nds-shot-cancel
            onClick={closeEditor}
            className="h-9 px-3.5 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t('Cancel')}
          </button>
        </div>
      </div>
      <div className="h-4" />
    </div>
  );
}

declare global {
  interface Window {
    __nds_shot?: {
      shapes: Shape[];
      w: number;
      h: number;
      selected: string | null;
      tool: EditorTool;
    };
  }
}
