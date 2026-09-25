(function () {
  'use strict';

  const WIDTH_KEY = 'nds.production.notesWidth.v1';
  const HEIGHT_KEY = 'nds.notesHeight';
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 260;
  const GAP = 12;
  const EDGE = 16;
  const COPY = {
    en: ['Resize notes width', 'Drag the left edge, or use Left/Right. Home: minimum; End: maximum; Escape: cancel.', 'Resize notes height', 'Drag the top edge, or use Up/Down. Home: minimum; End: maximum; Escape: cancel.'],
    ja: ['\u30ce\u30fc\u30c8\u306e\u5e45\u3092\u5909\u66f4', '\u5de6\u7aef\u3092\u30c9\u30e9\u30c3\u30b0\u3001\u307e\u305f\u306f\u5de6\u53f3\u77e2\u5370\u30ad\u30fc\u3002Home: \u6700\u5c0f\u3001End: \u6700\u5927\u3001Esc: \u53d6\u308a\u6d88\u3057\u3002', '\u30ce\u30fc\u30c8\u306e\u9ad8\u3055\u3092\u5909\u66f4', '\u4e0a\u7aef\u3092\u30c9\u30e9\u30c3\u30b0\u3001\u307e\u305f\u306f\u4e0a\u4e0b\u77e2\u5370\u30ad\u30fc\u3002Home: \u6700\u5c0f\u3001End: \u6700\u5927\u3001Esc: \u53d6\u308a\u6d88\u3057\u3002'],
    de: ['Notizbreite anpassen', 'Linken Rand ziehen oder Links/Rechts. Pos1: Minimum; Ende: Maximum; Escape: abbrechen.', 'Notizh\u00f6he anpassen', 'Oberen Rand ziehen oder Auf/Ab. Pos1: Minimum; Ende: Maximum; Escape: abbrechen.'],
    es: ['Cambiar el ancho de notas', 'Arrastra el borde izquierdo o usa Izquierda/Derecha. Inicio: m\u00ednimo; Fin: m\u00e1ximo; Escape: cancelar.', 'Cambiar la altura de notas', 'Arrastra el borde superior o usa Arriba/Abajo. Inicio: m\u00ednimo; Fin: m\u00e1ximo; Escape: cancelar.'],
    fr: ['Redimensionner la largeur des notes', 'Glissez le bord gauche ou utilisez Gauche/Droite. D\u00e9but : minimum ; Fin : maximum ; \u00c9chap : annuler.', 'Redimensionner la hauteur des notes', 'Glissez le bord sup\u00e9rieur ou utilisez Haut/Bas. D\u00e9but : minimum ; Fin : maximum ; \u00c9chap : annuler.'],
    pt: ['Redimensionar a largura das notas', 'Arraste a borda esquerda ou use Esquerda/Direita. Home: m\u00ednimo; End: m\u00e1ximo; Escape: cancelar.', 'Redimensionar a altura das notas', 'Arraste a borda superior ou use Cima/Baixo. Home: m\u00ednimo; End: m\u00e1ximo; Escape: cancelar.'],
    ko: ['\uba54\ubaa8 \ub108\ube44 \uc870\uc808', '\uc67c\ucabd \uac00\uc7a5\uc790\ub9ac\ub97c \ub4dc\ub798\uadf8\ud558\uac70\ub098 \uc88c\uc6b0 \ud0a4\ub97c \uc0ac\uc6a9\ud558\uc138\uc694. Home: \ucd5c\uc18c; End: \ucd5c\ub300; Esc: \ucde8\uc18c.', '\uba54\ubaa8 \ub192\uc774 \uc870\uc808', '\uc704\ucabd \uac00\uc7a5\uc790\ub9ac\ub97c \ub4dc\ub798\uadf8\ud558\uac70\ub098 \uc0c1\ud558 \ud0a4\ub97c \uc0ac\uc6a9\ud558\uc138\uc694. Home: \ucd5c\uc18c; End: \ucd5c\ub300; Esc: \ucde8\uc18c.'],
    zh: ['\u8c03\u6574\u7b14\u8bb0\u5bbd\u5ea6', '\u62d6\u52a8\u5de6\u8fb9\u7f18\u6216\u4f7f\u7528\u5de6/\u53f3\u65b9\u5411\u952e\u3002Home\uff1a\u6700\u5c0f\uff1bEnd\uff1a\u6700\u5927\uff1bEsc\uff1a\u53d6\u6d88\u3002', '\u8c03\u6574\u7b14\u8bb0\u9ad8\u5ea6', '\u62d6\u52a8\u4e0a\u8fb9\u7f18\u6216\u4f7f\u7528\u4e0a/\u4e0b\u65b9\u5411\u952e\u3002Home\uff1a\u6700\u5c0f\uff1bEnd\uff1a\u6700\u5927\uff1bEsc\uff1a\u53d6\u6d88\u3002']
  };
  let width = 560;
  let frame = 0;
  let drag;
  let observed = [];
  let background;
  let backgroundSource;
  const copy = () => COPY[document.documentElement.lang] || COPY.en;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (raw !== null) {
      const saved = Number(raw);
      if (!Number.isFinite(saved) || saved < MIN_WIDTH) throw new Error('Invalid notes width');
      width = saved;
    }
  } catch (error) {
    console.warn('Production notes width could not be restored:', error);
  }

  function persist(axis, value) {
    try {
      localStorage.setItem(axis === 'width' ? WIDTH_KEY : HEIGHT_KEY,
        String(Math.round(Math.max(axis === 'width' ? MIN_WIDTH : MIN_HEIGHT, value))));
    } catch (error) {
      console.warn('Notes ' + axis + ' could not be saved:', error);
    }
  }

  function bounds() {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const viewWidth = viewport?.width || window.innerWidth;
    const viewHeight = viewport?.height || window.innerHeight;
    const host = document.querySelector('[data-nds-fullscreen-target]');
    const canvas = host?.getBoundingClientRect();
    const tabs = document.querySelector('[data-nds-tabbar]');
    const strip = tabs?.getBoundingClientRect();
    let bottom = Math.min(top + viewHeight - EDGE, (canvas?.bottom ?? window.innerHeight) - EDGE);
    // Measure the whole bar (including wrapped rows), never a one-row estimate.
    if (strip?.width && strip.height) bottom = Math.min(bottom, strip.top - GAP);
    const ceiling = Math.max(top + GAP, (canvas?.top ?? top) + GAP);
    const right = Math.max(EDGE, window.innerWidth - left - viewWidth + EDGE);
    // The palette is a fixed column, not canvas, so the notes stop at the edge
    // of the drawing surface instead of the edge of the window. Without this
    // the panel can be dragged straight across the palette.
    const limit = Math.max(left + EDGE, (canvas?.left ?? left) + GAP);
    return {
      host, tabs, right,
      bottom: window.innerHeight - bottom,
      height: Math.max(0, bottom - ceiling),
      width: Math.max(0, window.innerWidth - right - limit)
    };
  }

  function variable(name, value) {
    const style = document.documentElement.style;
    const next = value + 'px';
    if (style.getPropertyValue(name) !== next) style.setProperty(name, next);
  }

  function range(axis, box) {
    const max = box[axis];
    return { min: Math.min(axis === 'width' ? MIN_WIDTH : MIN_HEIGHT, max), max };
  }

  function describe(handle, axis, box, rect) {
    if (!handle) return;
    const index = axis === 'width' ? 0 : 2;
    const words = copy();
    const limits = range(axis, box);
    for (const [key, value] of Object.entries({
      'aria-label': words[index], title: words[index + 1],
      'aria-valuemin': Math.round(limits.min), 'aria-valuemax': Math.round(limits.max),
      'aria-valuenow': Math.round(rect[axis]), 'aria-valuetext': Math.round(rect[axis]) + ' px'
    })) {
      if (handle.getAttribute(key) !== String(value)) handle.setAttribute(key, value);
    }
  }

  function matchBackground(source, inspector) {
    if (source !== backgroundSource) {
      backgroundChanges.disconnect();
      backgroundSource = source;
      if (source) backgroundChanges.observe(source, {
        attributes: true, subtree: true, attributeFilter: ['id', 'fill', 'class', 'style']
      });
    }
    const paint = source?.querySelector(':scope > rect');
    const canvas = source?.getBoundingClientRect();
    const pane = inspector?.getBoundingClientRect();
    const fullscreen = document.fullscreenElement;
    if (!paint || !canvas.width || !pane?.width || pane.bottom >= canvas.bottom ||
        (fullscreen && !fullscreen.contains(inspector))) {
      background?.remove();
      background = undefined;
      return;
    }
    if (!background?.isConnected) {
      background = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      background.setAttribute('data-nds-notes-background', '1');
      background.setAttribute('aria-hidden', 'true');
      background.setAttribute('focusable', 'false');
      // Share the native pattern: pan/zoom updates it directly, without a
      // second pattern, duplicate IDs, or a per-frame synchronization loop.
      background.appendChild(paint.cloneNode(true));
    }
    if (background.parentElement !== inspector.parentElement) inspector.parentElement.appendChild(background);
    const fill = paint.getAttribute('fill');
    if (background.firstElementChild.getAttribute('fill') !== fill) {
      background.firstElementChild.setAttribute('fill', fill);
    }
    const color = getComputedStyle(source);
    // Retain the native SVG origin, then clip to the exposed inspector strip.
    // Moving the origin changes subpixel rasterization even on an aligned grid.
    for (const [name, value] of Object.entries({
      left: canvas.left + 'px', top: canvas.top + 'px',
      width: pane.right - canvas.left + 'px', height: canvas.height + 'px',
      'clip-path': `inset(${Math.max(0, pane.bottom - canvas.top)}px 0 0 ${Math.max(0, pane.left - canvas.left)}px)`,
      'background-color': color.backgroundColor,
      '--xy-background-pattern-color-props': color.getPropertyValue('--xy-background-pattern-color-props'),
      opacity: color.opacity, visibility: color.visibility
    })) {
      if (background.style.getPropertyValue(name) !== value) background.style.setProperty(name, value);
    }
  }

  function layout() {
    const box = bounds();
    const panel = document.querySelector('[data-nds-notes-panel]');
    const rail = document.querySelector('[data-nds-notes-rail]');
    const inspector = document.querySelector('aside.nds-scroll');
    const source = inspector ? box.host?.querySelector('.react-flow__background') : null;
    const targets = [box.host, box.tabs, panel, inspector, source].filter(Boolean);
    if (targets.length !== observed.length || targets.some((item, i) => item !== observed[i])) {
      resize.disconnect();
      observed = targets;
      observed.forEach(item => resize.observe(item));
    }
    variable('--nds-notes-right', box.right);
    variable('--nds-notes-bottom', box.bottom);
    variable('--nds-notes-max-height', box.height);
    variable('--nds-notes-width', Math.min(width, box.width));
    if (rail) rail.toggleAttribute('data-nds-notes-no-room', box.height < 44);
    if (panel) {
      panel.toggleAttribute('data-nds-notes-no-room', box.height < 44);
      panel.toggleAttribute('data-nds-notes-short', box.height < MIN_HEIGHT);
      const rect = panel.getBoundingClientRect();
      describe(panel.querySelector('[data-nds-notes-width-resize]'), 'width', box, rect);
      describe(panel.querySelector('[data-nds-notes-resize]'), 'height', box, rect);
    } else if (drag) finish({}, true);
    matchBackground(source, inspector);
    return box;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; layout(); });
  }
  const resize = new ResizeObserver(schedule);
  const backgroundChanges = new MutationObserver(schedule);

  function apply(axis, value, setHeight) {
    if (axis === 'width') width = value;
    else setHeight(value);
    layout();
  }

  function move(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const box = layout();
    const limits = range(drag.axis, box);
    drag.last = clamp(drag.start + drag.origin - (drag.axis === 'width' ? event.clientX : event.clientY), limits.min, limits.max);
    apply(drag.axis, drag.last, drag.setHeight);
    event.preventDefault();
  }

  function finish(event, cancel) {
    if (!drag || (event.pointerId != null && event.pointerId !== drag.id)) return;
    const previous = drag;
    drag = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', commit);
    window.removeEventListener('pointercancel', cancelDrag);
    window.removeEventListener('keydown', escape, true);
    previous.handle.removeEventListener('lostpointercapture', cancelDrag);
    if (previous.handle.hasPointerCapture(previous.id)) previous.handle.releasePointerCapture(previous.id);
    document.body.style.userSelect = previous.selection;
    if (cancel) apply(previous.axis, previous.preferred, previous.setHeight);
    else persist(previous.axis, previous.last);
  }
  const commit = event => finish(event, false);
  const cancelDrag = event => finish(event, true);
  function escape(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    finish(event, true);
  }

  function start(event, axis, setHeight, preferred) {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    event.stopPropagation();
    layout();
    const handle = event.currentTarget;
    const panel = handle.closest('[data-nds-notes-panel]');
    if (!panel) throw new Error('Notes resize handle has no panel');
    const size = panel.getBoundingClientRect()[axis];
    handle.focus({ preventScroll: true });
    drag = {
      id: event.pointerId, axis, handle, setHeight, preferred: axis === 'width' ? width : preferred,
      start: size, last: size, origin: axis === 'width' ? event.clientX : event.clientY,
      selection: document.body.style.userSelect
    };
    document.body.style.userSelect = 'none';
    handle.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', commit);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('keydown', escape, true);
    handle.addEventListener('lostpointercapture', cancelDrag);
  }

  function key(event, axis, setHeight) {
    event.stopPropagation();
    if (drag) return;
    const directions = axis === 'width' ? { ArrowLeft: 1, ArrowRight: -1 } : { ArrowUp: 1, ArrowDown: -1 };
    if (!(event.key in directions) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const box = layout();
    const limits = range(axis, box);
    const current = event.currentTarget.closest('[data-nds-notes-panel]').getBoundingClientRect()[axis];
    const next = event.key === 'Home' ? limits.min : event.key === 'End' ? limits.max
      : clamp(current + directions[event.key] * (event.shiftKey ? 40 : 10), limits.min, limits.max);
    apply(axis, next, setHeight);
    persist(axis, next);
  }

  function widthHandleProps() {
    const words = copy();
    return {
      'data-nds-notes-width-resize': '1',
      role: 'separator', tabIndex: 0, 'aria-orientation': 'vertical', 'aria-controls': 'nds-production-notes',
      'aria-label': words[0], title: words[1],
      onPointerDown: event => start(event, 'width'),
      onKeyDown: event => key(event, 'width')
    };
  }

  function heightHandleProps(setHeight, preferred) {
    return {
      tabIndex: 0, 'aria-controls': 'nds-production-notes',
      onPointerDown: event => start(event, 'height', setHeight, preferred),
      onKeyDown: event => key(event, 'height', setHeight)
    };
  }

  function prepareExport(source, clone) {
    if (!source.matches?.('[data-nds-notes-width-resize],[data-nds-notes-resize]')) return;
    if (source === clone || clone.isConnected) throw new Error('Notes export requires a detached clone');
    clone.style.setProperty('visibility', 'hidden', 'important');
  }

  window.ndsNotesLayout = Object.freeze({ widthHandleProps, heightHandleProps, prepareExport });
  function init() {
    new MutationObserver(records => {
      const drawing = '.react-flow__viewport, [data-nds-shape-overlay], [data-nds-annotation-overlay]';
      if (records.some(record => !(record.target instanceof Element) || !record.target.closest(drawing))) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(schedule).observe(document.documentElement, { attributes: true });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('blur', cancelDrag);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('fullscreenchange', schedule);
    layout();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
