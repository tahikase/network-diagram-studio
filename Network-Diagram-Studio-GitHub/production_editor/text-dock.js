(function () {
  'use strict';

  const KEY = 'nds.production.annotationDock.v1';
  const EDGES = ['top', 'right', 'bottom', 'left'];
  const COPY = {
    en: ['Move drawing toolbar', 'Drag to a canvas edge, or use the arrow keys. Escape cancels a drag.', 'Toolbar position', 'Top', 'Right', 'Bottom', 'Left'],
    ja: ['\u63cf\u753b\u30c4\u30fc\u30eb\u30d0\u30fc\u3092\u79fb\u52d5', '\u30ad\u30e3\u30f3\u30d0\u30b9\u306e\u7aef\u3078\u30c9\u30e9\u30c3\u30b0\u3002\u77e2\u5370\u30ad\u30fc\u3067\u3082\u79fb\u52d5\u3067\u304d\u307e\u3059\u3002Esc \u3067\u30ad\u30e3\u30f3\u30bb\u30eb\u3002', '\u30c4\u30fc\u30eb\u30d0\u30fc\u306e\u4f4d\u7f6e', '\u4e0a', '\u53f3', '\u4e0b', '\u5de6'],
    de: ['Zeichenleiste verschieben', 'An einen Leinwandrand ziehen oder die Pfeiltasten verwenden. Escape bricht das Ziehen ab.', 'Position der Werkzeugleiste', 'Oben', 'Rechts', 'Unten', 'Links'],
    es: ['Mover herramientas de dibujo', 'Arrastra al borde del lienzo o usa las flechas. Escape cancela el movimiento.', 'Posici\u00f3n de herramientas', 'Arriba', 'Derecha', 'Abajo', 'Izquierda'],
    fr: ['D\u00e9placer les outils de dessin', 'Glissez vers un bord du canevas ou utilisez les fl\u00e8ches. \u00c9chap annule le d\u00e9placement.', 'Position des outils', 'Haut', 'Droite', 'Bas', 'Gauche'],
    pt: ['Mover ferramentas de desenho', 'Arraste para uma borda da tela ou use as setas. Escape cancela o movimento.', 'Posi\u00e7\u00e3o das ferramentas', 'Superior', 'Direita', 'Inferior', 'Esquerda'],
    ko: ['\uadf8\ub9ac\uae30 \ub3c4\uad6c \ubaa8\uc74c \uc774\ub3d9', '\uce94\ubc84\uc2a4 \uac00\uc7a5\uc790\ub9ac\ub85c \ub4dc\ub798\uadf8\ud558\uac70\ub098 \ubc29\ud5a5\ud0a4\ub97c \uc0ac\uc6a9\ud558\uc138\uc694. Esc\ub85c \ucde8\uc18c\ud569\ub2c8\ub2e4.', '\ub3c4\uad6c \ubaa8\uc74c \uc704\uce58', '\uc704', '\uc624\ub978\ucabd', '\uc544\ub798', '\uc67c\ucabd'],
    zh: ['\u79fb\u52a8\u7ed8\u56fe\u5de5\u5177\u680f', '\u62d6\u52a8\u5230\u753b\u5e03\u8fb9\u7f18\uff0c\u6216\u4f7f\u7528\u65b9\u5411\u952e\u3002Esc \u53d6\u6d88\u62d6\u52a8\u3002', '\u5de5\u5177\u680f\u4f4d\u7f6e', '\u9876\u90e8', '\u53f3\u4fa7', '\u5e95\u90e8', '\u5de6\u4fa7']
  };
  const clamp = (v, low, high) => Math.min(Math.max(v, low), Math.max(low, high));
  let preference = { edge: 'top', offset: 1 };
  let toolbar, host, grip, status, drag, frame;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved || !EDGES.includes(saved.edge) || !Number.isFinite(saved.offset)) {
        throw new Error('Invalid toolbar position');
      }
      preference = { edge: saved.edge, offset: clamp(saved.offset, 0, 1) };
    }
  } catch (error) {
    console.warn('Production toolbar position could not be restored:', error);
  }

  function copy() {
    return COPY[document.documentElement.lang] || COPY.en;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(preference));
    } catch (error) {
      console.warn('Production toolbar position could not be saved:', error);
    }
  }

  function text(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function announce() {
    const words = copy();
    text(status, words[2] + ': ' + words[3 + EDGES.indexOf(preference.edge)]);
  }

  function choose(edge) {
    preference = { edge, offset: edge === 'top' ? 1 : 0.5 };
    place();
    persist();
    announce();
  }

  function bounds() {
    const r = host.getBoundingClientRect();
    // Notes is a fixed overlay, never a change to the toolbar's docking area.
    return { r, left: 12, top: 12, right: Math.max(12, r.width - 12), bottom: Math.max(12, r.height - 68) };
  }

  function positionPanel(panel, anchor, b) {
    if (panel.hidden) return;
    const parent = panel.offsetParent;
    if (!parent) return;
    const p = parent.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    const room = Math.max(80, b.r.height - 24);
    panel.style.maxHeight = room + 'px';
    panel.style.maxWidth = Math.max(80, b.right - b.left) + 'px';
    panel.style.overflowY = 'auto';
    let x = a.right - box.width;
    let y = a.bottom + 8;
    if (preference.edge === 'left') x = toolbar.getBoundingClientRect().right + 8;
    if (preference.edge === 'right') x = toolbar.getBoundingClientRect().left - box.width - 8;
    if (y + box.height > b.r.bottom - 12) y = a.top - box.height - 8;
    x = clamp(x, b.r.left + b.left, b.r.left + b.right - box.width);
    y = clamp(y, b.r.top + 12, b.r.bottom - Math.min(box.height, room) - 12);
    Object.assign(panel.style, {
      left: (x - p.left) + 'px', top: (y - p.top) + 'px',
      right: 'auto', bottom: 'auto', margin: '0'
    });
  }

  function place() {
    if (!toolbar?.isConnected || !host?.isConnected) return;
    const b = bounds();
    const vertical = preference.edge === 'left' || preference.edge === 'right';
    toolbar.dataset.ndsDock = preference.edge;
    toolbar.dataset.ndsDockOrientation = vertical ? 'vertical' : 'horizontal';
    const rightInset = b.r.width - b.right;
    const bottomInset = b.r.height - b.bottom;
    toolbar.style.maxWidth = `calc(100% - ${rightInset + b.left}px)`;
    if (vertical && toolbar.offsetHeight > b.bottom - b.top - 44) {
      toolbar.dataset.ndsDockOrientation = 'horizontal';
    }
    const w = toolbar.offsetWidth;
    const top = toolbar.dataset.ndsDockOrientation === 'vertical' ? b.top + 44 : b.top;
    const left = preference.edge === 'top' && b.right - b.left > w + 108 ? b.left + 108 : b.left;
    // CSS resolves both host and toolbar size in the same layout frame.
    // Pixel coordinates recalculated in ResizeObserver lag inspector changes.
    const anchor = (near, far) => `calc(${preference.offset * 100}% + ${near * (1 - preference.offset) - far * preference.offset}px)`;
    Object.assign(toolbar.style, {
      left: vertical ? (preference.edge === 'left' ? b.left + 'px' : 'auto') : anchor(left, rightInset),
      right: preference.edge === 'right' ? rightInset + 'px' : 'auto',
      top: vertical ? anchor(top, bottomInset + (preference.edge === 'left' ? 28 : 0)) : (preference.edge === 'bottom' ? 'auto' : b.top + 'px'),
      bottom: preference.edge === 'bottom' ? bottomInset + 'px' : 'auto',
      transform: `translate${vertical ? 'Y' : 'X'}(${-preference.offset * 100}%)`
    });
    const words = copy();
    grip.setAttribute('aria-label', words[0]);
    grip.title = words[1];
    toolbar.querySelectorAll('[data-nds-style-popover]').forEach(panel => {
      const anchor = panel.parentElement.querySelector('[data-nds-style-chevron]');
      if (anchor) positionPanel(panel, anchor, b);
    });
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; attach(); place(); });
  }
  const resize = new ResizeObserver(schedule);

  function finish(event, cancel) {
    if (!drag || (event.pointerId != null && event.pointerId !== drag.id)) return;
    const previous = drag;
    drag = null;
    if (cancel) preference = previous.preference;
    toolbar.removeAttribute('data-nds-dragging');
    if (grip.hasPointerCapture(previous.id)) grip.releasePointerCapture(previous.id);
    place();
    if (!cancel && previous.moved) { persist(); announce(); }
  }

  function attach() {
    const found = document.querySelector('[data-nds-annotation-toolbar]');
    if (!found || found === toolbar) return;
    resize.disconnect();
    toolbar = found;
    host = toolbar.closest('[data-nds-fullscreen-target]');
    if (!host) throw new Error('Drawing toolbar has no canvas host');
    grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'nds-dock-grip';
    grip.dataset.ndsDockGrip = '1';
    grip.innerHTML = '<svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true" fill="currentColor"><circle cx="4" cy="4" r="1.3"/><circle cx="10" cy="4" r="1.3"/><circle cx="4" cy="10" r="1.3"/><circle cx="10" cy="10" r="1.3"/><circle cx="4" cy="16" r="1.3"/><circle cx="10" cy="16" r="1.3"/></svg>';
    status = document.createElement('span');
    status.className = 'nds-dock-status';
    status.setAttribute('role', 'status');
    toolbar.prepend(grip);
    toolbar.append(status);
    toolbar.addEventListener('keydown', e => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-nds-dock-grip]')) return;
      e.stopPropagation();
      if (e.key === 'Escape') finish(e, true);
    });
    grip.addEventListener('keydown', e => {
      const edge = { ArrowUp: 'top', ArrowDown: 'bottom', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (edge) { e.preventDefault(); choose(edge); }
    });
    grip.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      grip.focus({ preventScroll: true });
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, preference: { ...preference } };
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      drag.moved = true;
      toolbar.dataset.ndsDragging = '1';
      const b = bounds();
      const x = e.clientX - b.r.left, y = e.clientY - b.r.top;
      const distances = [Math.abs(y - b.top), Math.abs(b.right - x), Math.abs(b.bottom - y), Math.abs(x - b.left)];
      preference.edge = EDGES[distances.indexOf(Math.min(...distances))];
      const horizontal = preference.edge === 'top' || preference.edge === 'bottom';
      preference.offset = clamp(horizontal ? (x - b.left) / Math.max(1, b.right - b.left) : (y - b.top) / Math.max(1, b.bottom - b.top), 0, 1);
      place();
    });
    grip.addEventListener('pointerup', e => finish(e, false));
    grip.addEventListener('pointercancel', e => finish(e, true));
    grip.addEventListener('lostpointercapture', e => finish(e, true));
    resize.observe(host);
    resize.observe(toolbar);
  }

  function createText(event, reactFlow, buildShape) {
    const target = event.target;
    if (!(target instanceof Element) || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!target.matches('.react-flow__pane, .react-flow__viewport, .react-flow__renderer')) return;
    const tools = window.__nds_annotationStore.getState();
    if (tools.tool !== 'move' || document.querySelector('[data-nds-capture-layer], [role="dialog"][aria-modal="true"]')) return;
    const center = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const shape = buildShape('text-box', center);
    if (!shape) throw new Error('Native text-box preset is unavailable');
    event.preventDefault();
    event.stopPropagation();
    window.__nds_diagramStore.getState().selectNode(null);
    window.__nds_diagramStore.getState().selectEdge(null);
    window.__nds_tabsStore.getState().addShape(shape);
    tools.setSelectedShapes([shape.id]);
    tools.setPendingTextEditShapeId(shape.id);
  }

  window.ndsTextDock = { createText };
  function start() {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    document.addEventListener('fullscreenchange', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('blur', () => finish({}, true));
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
