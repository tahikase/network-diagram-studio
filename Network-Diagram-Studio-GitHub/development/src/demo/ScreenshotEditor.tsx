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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { NOTES_IMAGES } from '../env';
import { copyPngToClipboard, useImagesUi } from './notes-images';
import { saveEdited } from './notes-image-insert';
import { PEN_COLORS } from '../theme/palette';
import { MAX_NOTE_SHAPES, MAX_NOTE_TEXT_LENGTH, MAX_NOTE_TEXT_SIZE, MIN_NOTE_TEXT_SIZE } from '../model/schema';
import './screenshot-editor.css';
import {
  DEFAULT_COLOR,
  FONT_SIZE,
  HIGHLIGHT_HEX,
  THICKNESS,
  canvasOf,
  annotationTextSize,
  cropScene,
  decodeToCanvas,
  handleAt,
  hitTest,
  hasTextSize,
  isBoxy,
  isDark,
  normBox,
  boundsOf,
  paintHandles,
  paintScene,
  pixelateRegion,
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

interface TextDraft {
  x: number;
  y: number;
  id: string | null;
  value: string;
  box: Box | null;
  size: number;
  fontSize?: number;
  width: number;
  color: string;
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

const TOOL_HINTS: Record<EditorTool, string> = {
  select: 'Select an outline or label. Drag to move; use handles to resize.',
  arrow: 'Drag an arrow. Hold Shift to snap to 45-degree angles.',
  rect: 'Drag a rectangle. Hold Shift to draw a square.',
  ellipse: 'Drag an ellipse. Hold Shift to draw a circle.',
  callout: 'Drag a callout, then type. Select it to change Text size, move its pointer or resize its box.',
  highlight: 'Drag a yellow highlight. The image underneath stays visible.',
  text: 'Click to add text. Enter finishes; double-click a label to edit.',
  counter: 'Click to add the next numbered step.',
  blur: 'Drag to pixelate the image. Undo restores it. Blur is not secure redaction.',
  crop: 'Drag to crop the image. Undo restores the previous area.',
};

const formatTextSize = (size: number) => String(Number(size.toFixed(2)));

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
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const fontRef = useRef<HTMLInputElement | null>(null);
  const lastFontTarget = useRef<string | null>(null);
  const fontEdited = useRef(false);
  const draftFont = useRef<{ target: string; value: number } | null>(null);
  const autoFit = useRef(true);
  const spaceDown = useRef(false);
  const zoomCenter = useRef<{ x: number; y: number } | null>(null);
  const saved = useRef<(Snapshot & { caption: string }) | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<EditorTool>('arrow');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [sizeKey, setSizeKey] = useState<SizeKey>('sm');
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [panning, setPanning] = useState(false);
  const [drag, setDrag] = useState<Box | null>(null);
  const [caption, setCaption] = useState('');
  const [toast, setToast] = useState('');
  const [typing, setTyping] = useState<TextDraft | null>(null);
  const [fontInput, setFontInput] = useState('');
  const [fontInvalid, setFontInvalid] = useState(false);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const gesture = useRef<
    | { mode: 'draw'; ax: number; ay: number }
    | { mode: 'move'; id: string; ax: number; ay: number; from: Shape; snap: Shape[] }
    | { mode: 'resize'; id: string; handle: HandleId; from: Shape; snap: Shape[] }
    | { mode: 'pan'; ax: number; ay: number; left: number; top: number }
    | null
  >(null);
  const [historyRev, setHistoryRev] = useState(0);
  const selectedShape = shapes.find(s => s.id === selected);
  const fontValue = typing ? typing.fontSize ?? typing.size
    : hasTextSize(selectedShape) ? annotationTextSize(selectedShape) : null;
  const fontTarget = typing ? `draft-${typing.id ?? 'new'}` : hasTextSize(selectedShape) ? selectedShape.id : null;

  useEffect(() => {
    if (lastFontTarget.current !== fontTarget || document.activeElement !== fontRef.current) {
      setFontInput(fontValue === null ? '' : formatTextSize(fontValue));
      fontEdited.current = false;
    }
    if (lastFontTarget.current !== fontTarget) draftFont.current = null;
    lastFontTarget.current = fontTarget;
    setFontInvalid(false);
  }, [fontTarget, fontValue]);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  // Load the incoming picture into a canvas we can paint over.
  useEffect(() => {
    if (!editing) {
      setBase(null);
      setShapes([]);
      saved.current = null;
      return;
    }
    let live = true;
    setCaption(editing.caption ?? '');
    setSelected(null);
    setTyping(null);
    setToast('');
    setFontInvalid(false);
    autoFit.current = true;
    gesture.current = null;
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
      saved.current = { base: c, shapes: editing.shapes ?? [], caption: editing.caption ?? '' };
      setBase(c);
      setShapes(editing.shapes ?? []);
    });
    return () => { live = false; };
  }, [editing]);

  const fitView = useCallback(() => {
    const el = wrapRef.current;
    if (!base || !el) return;
    autoFit.current = true;
    zoomCenter.current = null;
    setScale(Math.max(0.005, Math.min(1, (el.clientWidth - 48) / base.width, (el.clientHeight - 48) / base.height)));
    el.scrollTo(0, 0);
  }, [base]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!base || !el) return;
    const measure = () => {
      setViewport(current => current.w === el.clientWidth && current.h === el.clientHeight
        ? current : { w: el.clientWidth, h: el.clientHeight });
      if (autoFit.current && !gesture.current) fitView();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [base, fitView]);

  useEffect(() => {
    if (base && editing) canvasRef.current?.focus({ preventScroll: true });
  }, [base, editing]);

  const changeZoom = useCallback((value: number) => {
    const el = wrapRef.current, cv = canvasRef.current;
    if (!base || !el || !cv) return;
    const next = Math.max(0.005, Math.min(8, value));
    const area = el.getBoundingClientRect(), image = cv.getBoundingClientRect();
    zoomCenter.current = {
      x: (area.left + el.clientWidth / 2 - image.left) / scale,
      y: (area.top + el.clientHeight / 2 - image.top) / scale,
    };
    autoFit.current = false;
    setScale(next);
  }, [base, scale]);

  useLayoutEffect(() => {
    const el = wrapRef.current, cv = canvasRef.current, point = zoomCenter.current;
    if (!el || !cv) return;
    if (point) {
      const area = el.getBoundingClientRect(), image = cv.getBoundingClientRect();
      el.scrollLeft += image.left + point.x * scale - area.left - el.clientWidth / 2;
      el.scrollTop += image.top + point.y * scale - area.top - el.clientHeight / 2;
      zoomCenter.current = null;
    }
  }, [scale, viewport, base]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!editing || !el) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      changeZoom(scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [editing, changeZoom, scale]);

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

  const applyTextSize = useCallback((value: number) => {
    if (!Number.isFinite(value) || value < MIN_NOTE_TEXT_SIZE || value > MAX_NOTE_TEXT_SIZE) {
      setFontInvalid(true);
      flash(t('Enter a text size from 8 to 512 px.'));
      return false;
    }
    setFontInvalid(false);
    fontEdited.current = false;
    setFontInput(String(value));
    if (typing) {
      if ((typing.fontSize ?? typing.size) !== value) {
        if (fontTarget) draftFont.current = { target: fontTarget, value };
        setTyping({ ...typing, fontSize: value });
      }
    } else if (hasTextSize(selectedShape) && annotationTextSize(selectedShape) !== value) {
      push();
      setShapes(list => list.map(s => s.id === selectedShape.id ? { ...s, fontSize: value } : s));
    }
    return true;
  }, [typing, selectedShape, push, flash, t, fontTarget]);

  const canAdd = useCallback(() => {
    if (shapes.length < MAX_NOTE_SHAPES) return true;
    flash(t('This screenshot has 200 annotations. Delete one before adding another.'));
    return false;
  }, [shapes.length, flash, t]);

  const cancelGesture = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.mode === 'move' || g?.mode === 'resize') setShapes(g.snap);
    setDrag(null);
    setPanning(false);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !base) return;
    future.current.push({ base, shapes: shapes.slice() });
    if (base.width !== prev.base.width || base.height !== prev.base.height) autoFit.current = true;
    setBase(prev.base);
    setShapes(prev.shapes);
    setSelected(null);
    setHistoryRev((r) => r + 1);
  }, [base, shapes]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !base) return;
    past.current.push({ base, shapes: shapes.slice() });
    if (base.width !== next.base.width || base.height !== next.base.height) autoFit.current = true;
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
    const pending = draftFont.current;
    const ty = typing && pending?.target === fontTarget ? { ...typing, fontSize: pending.value } : typing;
    if (!ty) return true;
    if (fontInvalid) {
      flash(t('Enter a text size from 8 to 512 px.'));
      fontRef.current?.focus();
      return false;
    }
    const text = ty.value.replace(/\s+$/, '');
    if (!ty.id && text && !canAdd()) return false;
    setTyping(null);
    if (ty.id) {
      const next = text ? shapes.map(s => {
        if (s.id !== ty.id || (s.kind !== 'text' && s.kind !== 'callout')) return s;
        const updated = { ...s, text, size: ty.size, color: ty.color };
        if (updated.kind === 'callout') updated.width = ty.width;
        if (ty.fontSize === undefined) delete updated.fontSize;
        else updated.fontSize = ty.fontSize;
        return updated;
      }) : shapes.filter(s => s.id !== ty.id);
      if (JSON.stringify(next) !== JSON.stringify(shapes)) { push(); setShapes(next); }
      return true;
    }
    if (!text) return true;
    push();
    const customFont = ty.fontSize === undefined ? {} : { fontSize: ty.fontSize };
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
          text, color: ty.color, size: ty.size, width: ty.width, ...customFont,
        },
      ]);
      return true;
    }
    setShapes((list) => [
      ...list,
      { id: shapeId(), kind: 'text', x: ty.x, y: ty.y, text, color: ty.color, size: ty.size, ...customFont },
    ]);
    return true;
  }, [typing, fontInvalid, flash, t, canAdd, shapes, push, base, fontTarget]);

  const isDirty = useCallback(() => {
    const original = saved.current;
    if (!base || !original) return false;
    if (base !== original.base || caption !== original.caption ||
        JSON.stringify(shapes) !== JSON.stringify(original.shapes)) return true;
    if (fontEdited.current && fontValue !== null && Number(fontInput) !== fontValue) return true;
    if (!typing) return false;
    if (!typing.id) return !!typing.value.trim();
    const previous = shapes.find(s => s.id === typing.id);
    return !!previous && (previous.kind === 'text' || previous.kind === 'callout') &&
      (previous.text !== typing.value || previous.size !== typing.size ||
       previous.fontSize !== typing.fontSize || previous.color !== typing.color);
  }, [base, caption, shapes, fontValue, fontInput, typing]);

  const requestClose = useCallback(() => {
    if (isDirty() && !window.confirm(t('Discard unsaved screenshot edits?'))) return;
    closeEditor();
  }, [isDirty, closeEditor, t]);

  useEffect(() => {
    if (!editing) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const blur = () => { spaceDown.current = false; cancelGesture(); };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('blur', blur);
    };
  }, [editing, isDirty, cancelGesture]);

  const changeTool = useCallback((next: EditorTool) => {
    if (!commitTyping()) return;
    cancelGesture();
    setTool(next);
    setSelected(null);
    canvasRef.current?.focus({ preventScroll: true });
  }, [commitTyping, cancelGesture]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!base || !e.isPrimary || (e.button !== 0 && e.button !== 1)) return;
    if (typing) { commitTyping(); return; }
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toImage(e);

    if (spaceDown.current || e.button === 1) {
      const view = wrapRef.current;
      if (!view) return;
      gesture.current = { mode: 'pan', ax: e.clientX, ay: e.clientY, left: view.scrollLeft, top: view.scrollTop };
      setPanning(true);
      return;
    }

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
      const hit = hitTest(shapes, p.x, p.y, canvasRef.current?.getContext('2d') ?? undefined);
      if (hit?.kind === 'text' || hit?.kind === 'callout') {
        setSelected(hit.id);
        setTyping({ x: hit.x, y: hit.y, id: hit.id, value: hit.text, box: hit.kind === 'callout' ? hit : null,
          size: hit.size, fontSize: hit.fontSize, color: hit.color, width: hit.kind === 'callout' ? hit.width : THICKNESS[sizeKey] });
      } else {
        setTyping({ x: p.x, y: p.y, id: null, value: '', box: null,
          size: FONT_SIZE[sizeKey], color, width: THICKNESS[sizeKey] });
      }
      return;
    }

    if (tool === 'counter') {
      if (!canAdd()) return;
      if (nextCounter > 999) { flash(t('Step numbers cannot exceed 999.')); return; }
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

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    const g = gesture.current;
    if (!g || !base) return;
    if (g.mode === 'pan') {
      const view = wrapRef.current;
      if (view) {
        view.scrollLeft = g.left + g.ax - e.clientX;
        view.scrollTop = g.top + g.ay - e.clientY;
      }
      return;
    }
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

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    const g = gesture.current;
    gesture.current = null;
    if (!g || !base) return;
    if (g.mode === 'pan') { setPanning(false); return; }

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
      autoFit.current = true;
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
      setTyping({ x: box.x, y: box.y, id: null, value: '', box,
        size: FONT_SIZE[sizeKey], color, width: THICKNESS[sizeKey] });
      return;
    }

    if (!canAdd()) return;
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
      setSelected(hit.id);
      setTyping({ x: hit.x, y: hit.y, id: hit.id, value: hit.text, box: null,
        size: hit.size, fontSize: hit.fontSize, color: hit.color, width: THICKNESS[sizeKey] });
    } else if (hit?.kind === 'callout') {
      setTool('select');
      setSelected(hit.id);
      setTyping({ x: hit.x, y: hit.y, id: hit.id, value: hit.text, box: hit,
        size: hit.size, fontSize: hit.fontSize, color: hit.color, width: hit.width });
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
          if (hasTextSize(next)) delete next.fontSize;
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

  const onCopy = useCallback(async () => {
    if (fontInvalid) { flash(t('Enter a text size from 8 to 512 px.')); return; }
    const png = flatten();
    if (!png) return;
    const copied = await copyPngToClipboard(png);
    if (copied && base) saved.current = { base, shapes: shapes.slice(), caption };
    flash(copied ? t('Copied to clipboard') : t('Could not copy — use Add to Notes'));
  }, [flatten, fontInvalid, flash, t, base, shapes, caption]);

  const onSaveFile = useCallback(() => {
    if (fontInvalid) { flash(t('Enter a text size from 8 to 512 px.')); return; }
    const png = flatten();
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
    if (base) saved.current = { base, shapes: shapes.slice(), caption };
  }, [flatten, fontInvalid, flash, t, base, shapes, caption]);

  const onInsert = useCallback(() => {
    if (!editing || !base) return;
    if (fontInvalid) { flash(t('Enter a text size from 8 to 512 px.')); return; }
    // `base` is stored, NOT the flattened result: shapes stay editable, and
    // the picture is held once rather than twice. Blur and crop are already
    // part of `base`, so a redaction is gone for good either way.
    const png = base.toDataURL('image/png');
    saveEdited(
      { ...editing, png, w: base.width, h: base.height, caption, shapes: shapes.length ? shapes : undefined },
      existing,
    );
  }, [editing, base, shapes, caption, existing, fontInvalid, flash, t]);

  // Capture editing shortcuts before the underlying diagram can handle them.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const inField = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');
      if (inField) return;
      const key = e.key.toLowerCase(), control = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (gesture.current) cancelGesture();
        else if (typing) setTyping(null);
        else if (selected) setSelected(null);
        else requestClose();
      } else if (control) {
        if (key === 'z') { if (e.shiftKey) redo(); else undo(); }
        else if (key === 'y') redo();
        else if (key === 'c') void onCopy();
        else if (key === 's') onSaveFile();
        else if (key === '0') fitView();
        else if (key === '1') changeZoom(1);
        else if (key === 'd' && selectedShape) {
          if (canAdd()) {
            push();
            const copy = { ...translated(selectedShape, 12 / scale, 12 / scale), id: shapeId() };
            setShapes(list => [...list, copy]);
            setSelected(copy.id);
          }
        } else return;
      } else if (e.altKey) return;
      else if (key === 'delete' || key === 'backspace') deleteSelected();
      else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key) && selectedShape) {
        const step = e.shiftKey ? 10 : 1;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        push();
        setShapes(list => list.map(s => s.id === selectedShape.id ? translated(s, dx, dy) : s));
      } else if (key === ' ' && e.target === canvasRef.current) spaceDown.current = true;
      else if (key === '+' || key === '=') changeZoom(scale * 1.2);
      else if (key === '-') changeZoom(scale / 1.2);
      else {
        const hit = TOOL_ORDER.find(k => SHORTCUT[k] === key);
        if (!hit) return;
        changeTool(hit);
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === ' ') spaceDown.current = false; };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [editing, typing, selected, selectedShape, deleteSelected, undo, redo, onCopy, onSaveFile,
    fitView, changeZoom, scale, canAdd, push, cancelGesture, requestClose, changeTool]);

  if (!NOTES_IMAGES || !editing) return null;

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  void historyRev; // re-render hook for the two refs above

  const sizeKeys: SizeKey[] = ['sm', 'md', 'lg'];

  return (
    <div
      data-nds-shot-editor="1"
      className="nds-shot-editor"
      role="dialog"
      aria-modal="true"
      aria-label={t('Screenshot editor')}
      onKeyDown={event => event.stopPropagation()}
      onKeyUp={event => event.stopPropagation()}
    >
      <div className="nds-shot-window">
        <div className="nds-shot-toolbar" data-nds-shot-toolbar>
          <div className="nds-shot-group nds-shot-tools" role="group" aria-label={t('Annotation tools')}>
            {TOOL_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                data-nds-shot-tool={k}
                title={`${toolLabel(k, t)} (${SHORTCUT[k].toUpperCase()}). ${t(TOOL_HINTS[k])}`}
                aria-label={toolLabel(k, t)}
                aria-pressed={tool === k}
                onClick={() => changeTool(k)}
              >
                <ToolIcon tool={k} />
              </button>
            ))}
          </div>

          <div className="nds-shot-group nds-shot-palette" role="radiogroup" aria-label={t('Annotation colour')}>
            {PEN_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                data-nds-shot-color={c.key}
                title={t(c.label)}
                role="radio"
                aria-checked={color.toLowerCase() === c.hex.toLowerCase()}
                aria-label={t(c.label)}
                onClick={() => { if (!commitTyping()) return; setColor(c.hex); restyle({ color: c.hex }); }}
                className="nds-shot-color"
                style={{ background: c.hex }}
              />
            ))}
          </div>

          <div className="nds-shot-group nds-shot-presets" role="radiogroup" aria-label={t('Size')}>
            {sizeKeys.map((k) => (
              <button
                key={k}
                type="button"
                data-nds-shot-size={k}
                role="radio"
                aria-checked={sizeKey === k}
                onClick={() => { if (!commitTyping()) return; setSizeKey(k); restyle({ size: k }); }}
              >
                {k === 'sm' ? t('S') : k === 'md' ? t('M') : t('L')}
              </button>
            ))}
          </div>

          <div className="nds-shot-group nds-shot-history" role="group" aria-label={t('History and selection')}>
          <button
            type="button"
            data-nds-shot-undo
            disabled={!canUndo}
            onClick={undo}
            title={`${t('Undo')} (Ctrl+Z)`}
          >
            {t('Undo')}
          </button>
          <button
            type="button"
            data-nds-shot-redo
            disabled={!canRedo}
            onClick={redo}
            title={`${t('Redo')} (Ctrl+Shift+Z / Ctrl+Y)`}
          >
            {t('Redo')}
          </button>
          {selected && (
            <button
              type="button"
              data-nds-shot-delete
              onClick={deleteSelected}
              className="nds-shot-delete"
              aria-label={t('Delete')}
              title={`${t('Delete')} (Delete)`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 6h14M9 6V3h6v3M7 6l1 15h8l1-15M10 10v7M14 10v7" />
              </svg>
            </button>
          )}
          </div>
          <div className="nds-shot-view">
            <span data-nds-shot-dimensions>{base ? `${base.width} × ${base.height}` : ''}</span>
            <button type="button" data-nds-shot-fit onClick={fitView} title={`${t('Fit image to window')} (Ctrl+0)`}>
              {t('Fit')}
            </button>
            <button type="button" data-nds-shot-actual onClick={() => changeZoom(1)} title={`${t('Actual image size')} (Ctrl+1)`}>100%</button>
          </div>
        </div>

        <div className="nds-shot-text-options" data-nds-shot-text-options role="group" aria-label={t('Selected text size')}
          onBlur={event => {
            if (!typing || event.relatedTarget === textRef.current ||
                (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) return;
            const value = fontRef.current?.valueAsNumber;
            if ((fontEdited.current || fontInvalid) &&
                (value === undefined || !Number.isFinite(value) || value < MIN_NOTE_TEXT_SIZE || value > MAX_NOTE_TEXT_SIZE)) return;
            commitTyping();
          }}>
          <label htmlFor="nds-shot-font-size">{t('Text size')}</label>
          <button type="button" data-nds-shot-text-smaller disabled={fontValue === null || fontValue <= MIN_NOTE_TEXT_SIZE}
            aria-label={t('Decrease text size')}
            onPointerDown={event => { if (typing && document.activeElement === textRef.current) event.preventDefault(); }}
            onClick={() => fontValue !== null && applyTextSize(Math.max(MIN_NOTE_TEXT_SIZE, Math.round((fontValue - 1) * 100) / 100))}>A-</button>
          <input ref={fontRef} id="nds-shot-font-size" data-nds-shot-text-size type="number" min={MIN_NOTE_TEXT_SIZE} max={MAX_NOTE_TEXT_SIZE}
            step="any" inputMode="decimal" placeholder="--" disabled={fontValue === null} value={fontInput}
            title={t('Enter a text size from 8 to 512 px.')}
            aria-label={t('Text size in pixels')} aria-invalid={fontInvalid} aria-describedby="nds-shot-font-hint"
            onChange={event => {
              fontEdited.current = true;
              setFontInput(event.target.value);
              const value = event.target.valueAsNumber;
              setFontInvalid(!Number.isFinite(value) || value < MIN_NOTE_TEXT_SIZE || value > MAX_NOTE_TEXT_SIZE);
            }}
            onBlur={event => { if (fontTarget && fontEdited.current) applyTextSize(event.currentTarget.valueAsNumber); }}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Enter') {
                event.preventDefault(); event.stopPropagation();
                if (!fontEdited.current || applyTextSize(event.currentTarget.valueAsNumber)) {
                  window.requestAnimationFrame(() => (typing ? textRef.current : canvasRef.current)?.focus({ preventScroll: true }));
                }
              } else if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation();
                fontEdited.current = false;
                setFontInput(fontValue === null ? '' : String(fontValue)); setFontInvalid(false);
                window.requestAnimationFrame(() => (typing ? textRef.current : canvasRef.current)?.focus({ preventScroll: true }));
              }
            }} />
          <span>px</span>
          <button type="button" data-nds-shot-text-larger disabled={fontValue === null || fontValue >= MAX_NOTE_TEXT_SIZE}
            aria-label={t('Increase text size')}
            onPointerDown={event => { if (typing && document.activeElement === textRef.current) event.preventDefault(); }}
            onClick={() => fontValue !== null && applyTextSize(Math.max(MIN_NOTE_TEXT_SIZE, Math.min(MAX_NOTE_TEXT_SIZE, Math.round((fontValue + 1) * 100) / 100)))}>A+</button>
          <span id="nds-shot-font-hint" className={fontInvalid ? 'nds-shot-font-error' : 'nds-shot-font-hint'}>
            {fontInvalid ? t('Enter a text size from 8 to 512 px.') : fontValue === null ? t('Select a callout, text or step.') : ''}
          </span>
        </div>

        <div ref={wrapRef} className="nds-shot-viewport" data-nds-shot-viewport>
          {base && (
            <div className="nds-shot-board" style={{ width: Math.max(viewport.w, base.width * scale + 48), height: Math.max(viewport.h, base.height * scale + 48) }}>
            <div className="nds-shot-stage" style={{ width: base.width * scale, height: base.height * scale }}>
              <canvas
                ref={canvasRef}
                data-nds-shot-canvas
                width={base.width}
                height={base.height}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={cancelGesture}
                onLostPointerCapture={cancelGesture}
                onDoubleClick={onDoubleClick}
                tabIndex={0}
                aria-label={t('Screenshot canvas')}
                style={{
                  width: base.width * scale,
                  height: base.height * scale,
                  cursor: panning ? 'grabbing' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair',
                }}
              />
              {typing && (
                <textarea
                  autoFocus
                  ref={textRef}
                  data-nds-shot-text
                  value={typing.value}
                  onChange={(e) => setTyping({ ...typing, value: e.target.value })}
                  maxLength={MAX_NOTE_TEXT_LENGTH}
                  aria-label={t('Annotation text')}
                  onBlur={event => {
                    if (event.relatedTarget instanceof Element && event.relatedTarget.closest('[data-nds-shot-text-options]')) return;
                    commitTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setTyping(null); return; }
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTyping(); }
                  }}
                  placeholder={t('Type, then Enter')}
                  className="nds-shot-input"
                  style={{
                    left: typing.x * scale,
                    top: typing.y * scale,
                    // A callout types inside its own bubble, so what you see
                    // while typing is the space the text will actually get.
                    width: typing.box ? typing.box.w * scale : undefined,
                    minWidth: typing.box ? undefined : 140,
                    height: typing.box
                      ? typing.box.h * scale
                      : Math.max(28, (typing.value.split('\n').length) * (typing.fontSize ?? typing.size) * scale * 1.3),
                    color: typing.box ? (isDark(typing.color) ? '#0f172a' : '#ffffff') : typing.color,
                    background: isDark(typing.color) ? '#fffffff5' : '#0f172af5',
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
                    fontSize: Math.max(12, (typing.fontSize ?? typing.size) * scale),
                    fontWeight: 600,
                    lineHeight: 1.25,
                    textAlign: typing.box ? 'center' : 'start',
                  }}
                />
              )}
            </div>
            </div>
          )}
        </div>

        <div className="nds-shot-actions">
          <input
            data-nds-shot-caption
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 120))}
            placeholder={t('Caption (optional)')}
            className="nds-shot-caption"
            aria-label={t('Caption (optional)')}
          />
          <span className="nds-shot-status" data-nds-shot-status data-nds-shot-toast={toast ? '1' : undefined}
            data-error={fontInvalid} role="status" aria-live="polite">
            {toast || t(typing ? 'Enter finishes. Shift+Enter adds a line. Escape cancels.' : TOOL_HINTS[tool])}
          </span>
          <div className="nds-shot-buttons">
          <button
            type="button"
            data-nds-shot-savefile
            onClick={onSaveFile}
            title={`${t('Save .png')} (Ctrl+S)`}
          >
            {t('Save .png')}
          </button>
          <button
            type="button"
            data-nds-shot-copy
            onClick={() => void onCopy()}
            title={`${t('Copy')} (Ctrl+C)`}
          >
            {t('Copy')}
          </button>
          <button
            type="button"
            data-nds-shot-insert
            onClick={onInsert}
            className="nds-shot-primary"
          >
            {existing ? t('Save changes') : t('Add to Notes')}
          </button>
          <button
            type="button"
            data-nds-shot-cancel
            onClick={requestClose}
          >
            {t('Cancel')}
          </button>
          </div>
        </div>
      </div>
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
