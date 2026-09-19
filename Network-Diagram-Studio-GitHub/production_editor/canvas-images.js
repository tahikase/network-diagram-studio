(function () {
  'use strict';

  const LIMITS = Object.freeze({
    inputBytes: 8 * 1024 * 1024,
    pngBytes: 2 * 1024 * 1024,
    edge: 8192,
    pixels: 16000000,
    timeoutMs: 15000
  });
  const PNG_PREFIX = 'data:image/png;base64,';
  const MAX_URL = PNG_PREFIX.length + 4 * Math.ceil(LIMITS.pngBytes / 3);
  const EXCLUDED = [
    'input', 'textarea', 'select', '[contenteditable]:not([contenteditable="false"])',
    '[role="textbox"]', '[role="dialog"]', '[aria-modal="true"]', 'dialog',
    '[data-nds-notes-panel]', '[data-nds-notes-rail]', '[data-nds-screenshot-editor]',
    '[data-nds-canvas-image-message]'
  ].join(',');
  const COPY_PREFIX = 'Network Diagram Studio selection: ';
  let pointer = null;
  let clipboard = null;
  let clipboardToken = null;
  let queue = Promise.resolve();
  let pendingCount = 0;
  const validated = new Map();
  const reported = new Set();

  function message(text, error) {
    let box = document.querySelector('[data-nds-canvas-image-message]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-nds-canvas-image-message', '');
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      const content = document.createElement('span');
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Dismiss';
      close.addEventListener('click', () => box.remove());
      box.append(content, close);
      (document.fullscreenElement || document.body).appendChild(box);
    }
    box.dataset.error = error ? 'true' : 'false';
    box.firstElementChild.textContent = text;
  }

  function blocked(target) {
    const el = target instanceof Element ? target : null;
    if (el && (el.closest(EXCLUDED) || el.isContentEditable)) return true;
    return Array.from(document.querySelectorAll('[role="dialog"],[aria-modal="true"],dialog[open],[data-nds-capture-layer],[data-nds-shot-canvas]'))
      .some(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
  }

  function canvasFor(target) {
    if (blocked(target) || blocked(document.activeElement)) return null;
    const tool = window.__nds_annotationStore?.getState().tool;
    if (tool !== 'move' && tool !== 'pan') return null;
    const canvas = document.querySelector('.react-flow');
    if (!canvas || !canvas.getClientRects().length) return null;
    const el = target instanceof Element ? target : null;
    if (el && el !== document.body && el !== document.documentElement &&
        !canvas.contains(el) && !el.closest('[data-nds-annotation-toolbar]') &&
        !el.closest('[data-nds-shape-overlay]') &&
        !el.matches('[data-nds-fullscreen]')) return null;
    return canvas;
  }

  function dimensions(w, h) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
      throw new Error('The clipboard image has invalid dimensions.');
    }
    if (w > LIMITS.edge || h > LIMITS.edge || w * h > LIMITS.pixels) {
      throw new Error('Image is too large: maximum 8192 pixels per side and 16 megapixels. Resize it before pasting.');
    }
    return { w, h };
  }

  function headerDimensions(bytes) {
    const b = bytes;
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (b.length >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) {
      return dimensions(v.getUint32(16), v.getUint32(20));
    }
    if (b.length >= 10 && b[0] === 71 && b[1] === 73 && b[2] === 70) {
      return dimensions(v.getUint16(6, true), v.getUint16(8, true));
    }
    if (b.length >= 30 && b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69) {
      if (b[15] === 88) {
        return dimensions(1 + b[24] + (b[25] << 8) + (b[26] << 16),
          1 + b[27] + (b[28] << 8) + (b[29] << 16));
      }
      if (b[15] === 76 && b[20] === 47) {
        return dimensions(1 + b[21] + ((b[22] & 63) << 8),
          1 + (b[22] >> 6) + (b[23] << 2) + ((b[24] & 15) << 10));
      }
      if (b[15] === 32 && b[23] === 157 && b[24] === 1 && b[25] === 42) {
        return dimensions(v.getUint16(26, true) & 16383, v.getUint16(28, true) & 16383);
      }
    }
    if (b.length >= 26 && b[0] === 66 && b[1] === 77) {
      return v.getUint32(14, true) === 12
        ? dimensions(v.getUint16(18, true), v.getUint16(20, true))
        : dimensions(v.getInt32(18, true), Math.abs(v.getInt32(22, true)));
    }
    if (b.length > 4 && b[0] === 255 && b[1] === 216) {
      for (let i = 2; i + 9 < b.length;) {
        if (b[i++] !== 255) break;
        while (b[i] === 255) i++;
        if (i + 3 > b.length) break;
        const marker = b[i++];
        if (marker === 217 || marker === 218) break;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        const length = v.getUint16(i);
        if (length < 2 || i + length > b.length) break;
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
          if (length < 8) break;
          return dimensions(v.getUint16(i + 5), v.getUint16(i + 3));
        }
        i += length;
      }
    }
    return null;
  }

  // Only a bounded, inline PNG can reach an SVG href, including on JSON load
  // and unvalidated native auto-save hydration. Never accept URLs or SVG data.
  function validPng(url) {
    if (typeof url !== 'string' || url.length > MAX_URL || !url.startsWith(PNG_PREFIX)) return false;
    if (validated.has(url)) return validated.get(url);
    let valid = false;
    const base64 = url.slice(PNG_PREFIX.length);
    const decodedLength = base64.length / 4 * 3 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (decodedLength > LIMITS.pngBytes) return false;
    if (base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64) && base64.length >= 44) {
      const h = Uint8Array.from(atob(base64.slice(0, 44)), c => c.charCodeAt(0));
      const signature = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82];
      if (signature.every((byte, i) => h[i] === byte)) {
        const v = new DataView(h.buffer);
        const w = v.getUint32(16), height = v.getUint32(20);
        valid = w > 0 && height > 0 && w <= LIMITS.edge && height <= LIMITS.edge && w * height <= LIMITS.pixels;
      }
    }
    if (validated.size >= 24) validated.delete(validated.keys().next().value);
    validated.set(url, valid);
    return valid;
  }

  function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the clipboard image.'));
      reader.onabort = () => reject(new Error('Reading the clipboard image was cancelled.'));
      reader.readAsDataURL(blob);
    });
  }

  async function normalize(file) {
    if (!file || !file.size) throw new Error('The clipboard did not provide readable image bytes. Copy the actual image, not its URL.');
    if (!/^image\//i.test(file.type) || /svg|xml/i.test(file.type)) {
      throw new Error('Unsupported clipboard image format. Copy a bitmap such as PNG, JPEG or WebP; SVG and remote image URLs are not imported.');
    }
    if (file.size > LIMITS.inputBytes) throw new Error('Clipboard image exceeds 8 MiB. Resize or compress it before pasting.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    headerDimensions(bytes);
    // Explicitly reject mislabeled SVG/HTML before handing any bytes to an
    // image decoder. Raster formats never begin with markup.
    if (/^\s*</.test(new TextDecoder().decode(bytes.subarray(0, 256)))) {
      throw new Error('Unsupported image content: vector/HTML clipboard data is not a bitmap.');
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    let timer;
    try {
      const loaded = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('This browser could not decode the clipboard image. Copy it as PNG, JPEG or WebP and try again.'));
        timer = setTimeout(() => reject(new Error('Image decoding timed out. Try a smaller PNG image.')), LIMITS.timeoutMs);
      });
      image.src = url;
      await loaded;
      const { w, h } = dimensions(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not prepare the image canvas.');
      context.drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      canvas.width = canvas.height = 1;
      if (!blob) throw new Error('The browser could not encode this image safely.');
      if (blob.size > LIMITS.pngBytes) throw new Error('The normalized PNG exceeds 2 MiB. Resize the image or use a simpler bitmap before pasting.');
      const png = await readDataUrl(blob);
      if (!validPng(png)) throw new Error('The browser produced an invalid image. Nothing was pasted.');
      return { png, w, h };
    } finally {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
    }
  }

  function placement(canvas) {
    const overlay = document.querySelector('[data-nds-shape-overlay] > g');
    const matrix = overlay?.getScreenCTM();
    if (!matrix) throw new Error('The canvas is not ready for an image. Try again when the diagram is visible.');
    const b = canvas.getBoundingClientRect();
    const p = pointer && pointer.x >= b.left && pointer.x <= b.right && pointer.y >= b.top && pointer.y <= b.bottom
      ? pointer : { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    const inverse = matrix.inverse();
    const world = new DOMPoint(p.x, p.y).matrixTransform(inverse);
    const topLeft = new DOMPoint(b.left + 32, b.top + 72).matrixTransform(inverse);
    const bottomRight = new DOMPoint(b.right - 32, b.bottom - 64).matrixTransform(inverse);
    return { world, topLeft, bottomRight };
  }

  async function insert(files, request) {
    const normalized = [];
    for (const file of files) normalized.push(await normalize(file));
    const tabs = window.__nds_tabsStore.getState();
    if (tabs.activeTabId !== request.tabId || tabs.activeTab().shapes !== request.shapes ||
        window.__nds_diagramStore.getState().fitNonce !== request.fitNonce || !canvasFor(document.activeElement)) {
      throw new Error('Canvas changed while the image was decoding. Nothing was pasted; return to the intended tab and paste again.');
    }
    const p = request.position;
    const availableW = Math.max(40, p.bottomRight.x - p.topLeft.x);
    const availableH = Math.max(40, p.bottomRight.y - p.topLeft.y);
    const shapes = normalized.map((img, i) => {
      const scale = Math.min(1, 600 / img.w, 450 / img.h, availableW / img.w, availableH / img.h);
      const w = img.w * scale, h = img.h * scale;
      const x = Math.max(p.topLeft.x, Math.min(p.world.x - w / 2 + i * 24, p.bottomRight.x - w));
      const y = Math.max(p.topLeft.y, Math.min(p.world.y - h / 2 + i * 24, p.bottomRight.y - h));
      return { id: 'sh_img_' + crypto.randomUUID(), kind: 'rect', x, y, w, h,
        color: '#0f172a', width: 0, fillOpacity: 0, fill: 'none', corner: 'sharp', canvasImage: img.png };
    });
    tabs.addShapes(shapes);
    window.__nds_diagramStore.getState().selectNode(null);
    window.__nds_diagramStore.getState().selectEdge(null);
    const annotation = window.__nds_annotationStore.getState();
    annotation.setTool('move');
    annotation.setSelectedShapes(shapes.map(shape => shape.id));
    document.querySelector('[data-nds-canvas-image-message][data-error="false"]')?.remove();
  }

  function installClipboard(copy, paste) {
    const bridge = { copy, paste };
    clipboard = bridge;
    return () => { if (clipboard === bridge) clipboard = null; };
  }

  // Native code owns snapshots and undo. Clipboard events own routing, including
  // browser-menu actions. Match the exact copy, never an unrelated OS clipboard.
  window.addEventListener('copy', event => {
    if (event.defaultPrevented || !clipboard || !canvasFor(event.target)) return;
    try {
      if (!clipboard.copy()) return;
      clipboardToken = null;
      if (!event.clipboardData) throw new Error('The browser did not provide clipboard access. Focus the canvas and copy again.');
      const token = COPY_PREFIX + crypto.randomUUID();
      event.clipboardData.setData('text/plain', token);
      clipboardToken = token;
      event.preventDefault();
      event.stopImmediatePropagation();
    } catch (error) {
      clipboardToken = null;
      event.preventDefault();
      message('Could not copy the selection: ' + error.message, true);
    }
  }, true);

  // A plain resource click replaces the annotation selection. Otherwise the
  // native clipboard keeps copying the previously selected shape or image.
  window.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey ||
        blocked(event.target)) return;
    const target = event.target instanceof Element ? event.target : null;
    const node = target?.closest('.react-flow__node');
    if (!node || target.closest('button,a,.react-flow__handle')) return;
    const id = node.getAttribute('data-id');
    if (!window.__nds_diagramStore?.getState().diagram.nodes.some(resource => resource.id === id)) return;
    const annotation = window.__nds_annotationStore?.getState();
    if (annotation?.selectedShapeIds.length) annotation.clearShapeSelection();
  }, true);

  window.addEventListener('pointermove', event => {
    const canvas = document.querySelector('.react-flow');
    if (canvas?.contains(event.target) || event.target.closest?.('[data-nds-shape-overlay]')) {
      pointer = { x: event.clientX, y: event.clientY };
    }
  }, true);
  window.addEventListener('blur', () => { pointer = null; });

  window.addEventListener('paste', event => {
    if (event.defaultPrevented) return;
    const canvas = canvasFor(event.target);
    if (!canvas) return;
    const data = event.clipboardData;
    const files = data ? Array.from(data.items || []).filter(item => item.kind === 'file').map(item => item.getAsFile()) : [];
    if (!files.length && data?.files?.length) files.push(...data.files);
    if (!files.length) {
      const text = data?.getData('text/plain') || '';
      if (clipboard && clipboardToken && text === clipboardToken) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try { clipboard.paste(); }
        catch (error) { message('Could not paste the selection: ' + error.message, true); }
      } else if (text.startsWith(COPY_PREFIX)) {
        event.preventDefault();
        message('This copied selection is no longer available in this window. Copy it again, or use Save JSON / Load JSON to move diagrams between windows.', true);
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (files.length > 4) { message('Paste at most 4 bitmap images at once.', true); return; }
    if (pendingCount) { message('An image paste is already processing. Wait for it to finish before pasting again.', true); return; }
    const tabs = window.__nds_tabsStore.getState();
    let position;
    try { position = placement(canvas); }
    catch (error) { message(error.message, true); return; }
    const request = { tabId: tabs.activeTabId, shapes: tabs.activeTab().shapes,
      fitNonce: window.__nds_diagramStore.getState().fitNonce, position };
    pendingCount++;
    message('Preparing local clipboard image...', false);
    queue = queue.then(() => insert(files, request)).catch(error => {
      message('Image paste failed: ' + error.message, true);
    }).finally(() => { pendingCount--; });
  }, true);

  function render(jsx, shape, selected, onPointerDownBody, interactive) {
    const safe = validPng(shape.canvasImage);
    const rotation = shape.rotation || 0;
    const props = { x: shape.x, y: shape.y, width: shape.w, height: shape.h,
      onPointerDown: e => onPointerDownBody(e, shape),
      style: { cursor: interactive ? 'move' : 'default', pointerEvents: interactive ? 'all' : 'none' } };
    const failed = () => {
      if (reported.has(shape.id)) return;
      reported.add(shape.id);
      message('Canvas image could not be displayed. Its data is unsupported or damaged. Delete it and paste a fresh bitmap; no remote URL was fetched.', true);
    };
    if (!safe) queueMicrotask(failed);
    return jsx('g', {
      'data-nds-shape': shape.id, 'data-nds-shape-kind': 'rect', 'data-nds-canvas-image': shape.id,
      onDoubleClick: e => e.stopPropagation(),
      transform: rotation ? 'rotate(' + rotation + ' ' + (shape.x + shape.w / 2) + ' ' + (shape.y + shape.h / 2) + ')' : undefined,
      children: [
        safe ? jsx('image', { ...props, href: shape.canvasImage, preserveAspectRatio: 'xMidYMid meet', onError: failed }, 'image')
          : jsx('rect', { ...props, fill: '#fee2e2', stroke: '#dc2626' }, 'invalid'),
        selected ? jsx('rect', { x: shape.x - 3, y: shape.y - 3, width: shape.w + 6, height: shape.h + 6,
          fill: 'none', stroke: '#3b82f6', strokeWidth: 2, style: { pointerEvents: 'none' } }, 'selection') : null
      ]
    });
  }

  function autoSaveFailed(error) {
    if (window.__nds_tabsStore?.getState().tabs.some(tab => tab.shapes.some(shape => shape.canvasImage))) {
      message('Browser auto-save failed (' + (error?.name || 'storage unavailable') + '). Your canvas is still open; use Save JSON now to keep its images.', true);
    }
  }

  // Native screenshots only capture .react-flow, but annotations are its
  // siblings. Use the export root when a canvas image needs to be captured.
  function captureHost(fallback) {
    const overlay = document.querySelector('[data-nds-shape-overlay]');
    const host = fallback?.closest('[data-nds-fullscreen-target]');
    return host && overlay && host.contains(overlay) && overlay.querySelector('[data-nds-canvas-image]') ? host : fallback;
  }

  window.ndsCanvasImages = Object.freeze({ validPng, render, blocked, installClipboard, autoSaveFailed, captureHost, limits: LIMITS });
})();
