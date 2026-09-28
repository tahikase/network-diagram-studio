import type { Diagram, StudioFile } from '../model/types';
import { toPng, toSvg } from 'html-to-image';
import type { ReactFlowInstance } from '@xyflow/react';
import { useTabsStore, type Point, type Shape, type Stroke } from '../demo/tabs-store';
import { referencedImageIds } from '../demo/notes-images';
import { studioFileSchema } from '../model/schema';
import { checkDocumentIconAssets, persistIconAssets, withIconAssets } from '../icons/imported-library';
import { decodeIconAsset } from '../icons/imported-assets';
import { translate } from '../i18n/useT';
import { useI18nStore } from '../i18n/i18n-store';
import { getCanvasHost } from '../canvas/canvas-host';
import { arrowTextSize } from '../model/shape-text';

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Write the diagram AND the active tab's shapes + pencil strokes + notes.
 *
 * Before v0.9.26 this wrote the `Diagram` alone. Shapes live on the
 * tabs-store, not on the Diagram, so every shape and stroke was silently
 * dropped — a user who drew their topology with shapes, saved, and reopened
 * the file elsewhere got an empty canvas. Auto-save persisted them, so the
 * loss only ever showed up once the file left the browser.
 *
 * v0.9.35 adds `notes` for exactly the same reason: a write-up that did not
 * travel with the file it describes would be lost the moment the file was
 * shared, which is the failure this key exists to prevent.
 *
 * Shapes and strokes are omitted when empty, so a diagram without them
 * produces exactly the same bytes it did before.
 *
 * WHY `notes` IS WRITTEN EVEN WHEN EMPTY (v0.9.38)
 *
 * It is the one key here whose ABSENCE has to mean something different from
 * its being empty:
 *
 *   - key absent   → the file predates v0.9.35 and cannot express any intent
 *                    about notes, so loading it must LEAVE the user's notes
 *                    alone.
 *   - `notes: ""`  → this diagram was saved with an empty page on purpose,
 *                    so loading it must CLEAR the page.
 *
 * Omitting the key when empty collapsed those two cases together, which
 * forced the loader to guess — and it guessed "clear", so opening any
 * pre-v0.9.35 file silently destroyed a write-up the user had not saved
 * anywhere else. Three bytes of JSON is a cheap price for that distinction.
 */
export function saveJson(diagram: Diagram) {
  const tabsState = useTabsStore.getState();
  const activeTab =
    tabsState.tabs.find((t) => t.id === tabsState.activeTabId) ?? tabsState.tabs[0];
  const shapes = activeTab?.shapes ?? [];
  const strokes = activeTab?.strokes ?? [];
  const notes = activeTab?.notes ?? '';
  const comments = activeTab?.comments ?? [];
  // Only pictures the note still points at travel with the file. Deleting a
  // screenshot from a note is therefore a real delete — the next save drops
  // the bytes instead of carrying an invisible payload around forever.
  const referenced = referencedImageIds(notes);
  const images = (activeTab?.images ?? []).filter((i) => referenced.includes(i.id));

  const file: StudioFile = {
    ...withIconAssets(diagram),
    ...(shapes.length > 0 ? { shapes } : {}),
    ...(strokes.length > 0 ? { strokes } : {}),
    notes,
    // Omitted when empty, like shapes and strokes. A note with no comments
    // therefore produces exactly the bytes it did before v0.9.65 — which is
    // what lets a file written by this build open cleanly in an older one.
    ...(comments.length > 0 ? { comments } : {}),
    ...(images.length > 0 ? { images } : {}),
  };

  const filename = safeFilename(diagram.meta.title || 'diagram') + '.json';
  downloadBlob(filename, JSON.stringify(file, null, 2), 'application/json');
}

export function loadJsonFile(onLoad: (raw: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = studioFileSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.iconAssets?.length) {
        checkDocumentIconAssets(parsed.data.nodes, parsed.data.iconAssets);
        for (const asset of parsed.data.iconAssets) await decodeIconAsset(asset);
        await persistIconAssets(parsed.data.iconAssets);
      }
      onLoad(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The diagram could not be loaded.';
      window.alert(translate(useI18nStore.getState().lang, 'Load failed') + ': ' + message);
    }
  };
  input.click();
}

async function withHiddenOverlays<T>(fn: () => Promise<T>): Promise<T> {
  // Hide chrome that should NOT appear in exports: the React Flow Controls
  // (zoom in/out/fit), the top-left Fullscreen button (marked
  // with data-nds-fullscreen), the empty-canvas call to action, and any
  // demo-only tool overlays (pencil toolbar + tab bar + palette rail if
  // collapsed). The pencil ANNOTATIONS themselves live in the
  // AnnotationOverlay SVG and stay visible so exported diagrams include the
  // engineer's markup.
  const selectorsToHide = [
    '.react-flow__controls',
    '[data-nds-fullscreen]',
    '[data-nds-annotation-toolbar]',
    '[data-nds-tabbar]',
    '[data-nds-empty-state]',
    '[data-nds-placement-feedback]',
    // Defensive: both live OUTSIDE `.react-flow` (the capture root), so they
    // cannot appear in an export today. Listed anyway so that moving the
    // capture root — or docking notes differently — can never silently start
    // baking the write-up into the picture of the diagram.
    '[data-nds-notes-panel]',
    '[data-nds-notes-rail]',
  ];
  const hidden: Array<{ el: HTMLElement; prev: string }> = [];
  const revealed = [...document.querySelectorAll<SVGElement>('[data-nds-preview-hidden]')]
    .map(el => ({ el, visibility: el.style.visibility }));
  for (const { el } of revealed) el.style.visibility = 'visible';
  for (const sel of selectorsToHide) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      hidden.push({ el, prev: el.style.display });
      el.style.display = 'none';
    });
  }

  // Exports always render in the light theme. A dark-mode screenshot pasted
  // into a customer email looks broken next to the rest of the thread, and
  // html-to-image inlines computed styles, so whatever theme is live at
  // capture time is baked into the file permanently.
  const root = document.documentElement;
  const prevTheme = root.getAttribute('data-theme');
  const prevColorScheme = root.style.colorScheme;
  if (prevTheme === 'dark') {
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    // Force a style recalculation so the re-resolved custom properties are
    // committed before html-to-image reads getComputedStyle().
    void root.offsetHeight;
  }

  const rf = document.querySelector<HTMLElement>('.react-flow');
  const sourceSprite = document.querySelector<HTMLElement>('[data-nds-sprite]');

  // Node icons use <use href="#ic-...">. The <symbol> definitions live in a
  // sprite that sits OUTSIDE .react-flow. html-to-image serializes only the
  // subtree we pass it, so the exported SVG blob loses those references and
  // the icons render blank. Fix: clone the sprite as a hidden first child of
  // .react-flow just for the duration of the export, then remove it.
  let injectedSprite: HTMLElement | null = null;
  if (rf && sourceSprite) {
    injectedSprite = sourceSprite.cloneNode(true) as HTMLElement;
    // Do not leak unused personal artwork into an exported SVG.
    const used = new Set([...rf.querySelectorAll('use')].map(use => use.getAttribute('href')?.slice(1)));
    injectedSprite.querySelectorAll('[data-nds-imported-symbol]').forEach(symbol => {
      if (!used.has(symbol.id)) symbol.remove();
    });
    injectedSprite.setAttribute('data-nds-sprite-export', '1');
    injectedSprite.style.position = 'absolute';
    injectedSprite.style.width = '0';
    injectedSprite.style.height = '0';
    injectedSprite.style.overflow = 'hidden';
    injectedSprite.style.pointerEvents = 'none';
    rf.insertBefore(injectedSprite, rf.firstChild);
  }

  try {
    return await fn();
  } finally {
    if (injectedSprite && injectedSprite.parentNode) {
      injectedSprite.parentNode.removeChild(injectedSprite);
    }
    for (const { el, prev } of hidden) {
      el.style.display = prev;
    }
    for (const { el, visibility } of revealed) el.style.visibility = visibility;
    if (prevTheme !== null) {
      root.setAttribute('data-theme', prevTheme);
    } else {
      root.removeAttribute('data-theme');
    }
    root.style.colorScheme = prevColorScheme;
  }
}

// ---------- Content-bounds computation (world / flow coordinates) ----------

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function unionRect(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a) return b;
  if (!b) return a;
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rectFromPoints(points: Point[]): Bounds | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = minX;
  let maxY = minY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rotatedBounds(bounds: Bounds, degrees = 0): Bounds {
  if (!degrees) return bounds;
  const radians = degrees * Math.PI / 180;
  const c = Math.abs(Math.cos(radians)), s = Math.abs(Math.sin(radians));
  const width = bounds.width * c + bounds.height * s;
  const height = bounds.width * s + bounds.height * c;
  return { x: bounds.x + (bounds.width - width) / 2, y: bounds.y + (bounds.height - height) / 2, width, height };
}

function boundsForShape(s: Shape): Bounds {
  if (s.kind === 'arrow') {
    const minX = Math.min(s.from.x, s.to.x);
    const minY = Math.min(s.from.y, s.to.y);
    const maxX = Math.max(s.from.x, s.to.x);
    const maxY = Math.max(s.from.y, s.to.y);
    // Add a small margin for arrow heads.
    const pad = 8;
    let bounds: Bounds = { x: minX - pad, y: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
    if (s.text) {
      const label = arrowTextSize(s.text, s, Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y));
      bounds = unionRect(bounds, {
        x: (minX + maxX - label.width) / 2, y: (minY + maxY - label.height) / 2,
        width: label.width, height: label.height,
      })!;
    }
    return rotatedBounds(bounds, s.rotation);
  }
  if (s.kind === 'rect') {
    return rotatedBounds({ x: s.x, y: s.y, width: s.w, height: s.h }, s.rotation);
  }
  if (s.kind === 'ellipse') {
    return rotatedBounds({ x: s.cx - s.rx, y: s.cy - s.ry, width: 2 * s.rx, height: 2 * s.ry }, s.rotation);
  }
  // callout: union of the box and the anchor point + leader line.
  const box = rotatedBounds({ x: s.x, y: s.y, width: s.w, height: s.h }, s.rotation);
  const anchor: Bounds = { x: s.anchor.x - 4, y: s.anchor.y - 4, width: 8, height: 8 };
  return unionRect(box, anchor)!;
}

function boundsForStroke(s: Stroke): Bounds | null {
  const r = rectFromPoints(s.points);
  if (!r) return null;
  // Add half the stroke width so caps aren't clipped.
  const pad = Math.ceil((s.width ?? 3) / 2 + 2);
  return { x: r.x - pad, y: r.y - pad, width: r.width + 2 * pad, height: r.height + 2 * pad };
}

/**
 * Compute the world-space bounds of everything the export should capture:
 *  - all React Flow nodes (via rf.getNodesBounds — this handles nested
 *    subnet/VNet children correctly)
 *  - all shapes on the ACTIVE annotation tab (arrows / rects / ellipses /
 *    callouts, since only the active tab is currently rendered by
 *    ShapeOverlay)
 *  - all pencil strokes on the ACTIVE annotation tab
 *
 * Returns null when there is genuinely nothing to render (no nodes, no
 * shapes, no strokes), in which case the caller should skip viewport
 * mutation and just capture at the current viewport.
 */
function computeContentBounds(rf: ReactFlowInstance): Bounds | null {
  let bounds: Bounds | null = null;

  const nodes = rf.getNodes();
  if (nodes.length > 0) {
    const nb = rf.getNodesBounds(nodes);
    // getNodesBounds returns {x:0,y:0,width:0,height:0} for empty inputs.
    if (nb.width > 0 || nb.height > 0) {
      bounds = { x: nb.x, y: nb.y, width: nb.width, height: nb.height };
    }
  }

  // Shapes + strokes come from the tabs-store's currently active annotation
  // tab. useTabsStore.getState() is safe outside React because Zustand
  // exposes getState() on the hook.
  const tabsState = useTabsStore.getState();
  const activeTab =
    tabsState.tabs.find((t) => t.id === tabsState.activeTabId) ?? tabsState.tabs[0];
  if (activeTab) {
    for (const s of activeTab.shapes ?? []) {
      bounds = unionRect(bounds, boundsForShape(s));
    }
    for (const stroke of activeTab.strokes ?? []) {
      bounds = unionRect(bounds, boundsForStroke(stroke));
    }
  }

  return bounds;
}

// ---------- Full-content viewport wrapper ----------
//
// Fix for "diagram is larger than the visible viewport → PNG/SVG export is
// cropped". Before capturing, we:
//   1. Compute total world-space bounds of nodes + shapes + strokes.
//   2. Expand <main> to (bounds.width + 2·pad) × (bounds.height + 2·pad).
//   3. Set the RF viewport to translate(-bounds.x + pad, -bounds.y + pad)
//      scale(1) so the top-left of content sits at (pad, pad) inside main.
//   4. Cover the app with a translucent "Exporting…" overlay so users
//      don't see the transient layout shift.
//   5. Wait two animation frames for React Flow + shape/stroke overlays to
//      re-render at the new viewport (they subscribe to rf.getViewport()).
//   6. Run the capture callback with the target width/height.
//   7. Restore viewport, main styles, and remove the overlay.

const EXPORT_PADDING = 40;

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function showExportingOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-nds-export-overlay', '1');
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(248,250,252,0.94)',
    'color:#0f172a',
    'font:600 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif',
    'letter-spacing:0.02em',
    'pointer-events:auto',
  ].join(';');
  el.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">' +
    '<div style="width:28px;height:28px;border:3px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:nds-spin 0.9s linear infinite;"></div>' +
    '<div>Exporting diagram…</div>' +
    '</div>' +
    '<style>@keyframes nds-spin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(el);
  return el;
}

interface FitDims {
  width: number;
  height: number;
}

async function withFullContentViewport<T>(
  rf: ReactFlowInstance,
  fn: (dims: FitDims | null) => Promise<T>
): Promise<T> {
  const main = getCanvasHost();
  const bounds = computeContentBounds(rf);

  // Nothing to capture beyond current viewport → skip mutation.
  if (!main || !bounds || bounds.width <= 0 || bounds.height <= 0) {
    return fn(null);
  }

  const targetW = Math.ceil(bounds.width + 2 * EXPORT_PADDING);
  const targetH = Math.ceil(bounds.height + 2 * EXPORT_PADDING);

  const savedViewport = rf.getViewport();
  const savedMainStyle: Record<string, string> = {
    width: main.style.width,
    height: main.style.height,
    minWidth: main.style.minWidth,
    minHeight: main.style.minHeight,
    maxWidth: main.style.maxWidth,
    maxHeight: main.style.maxHeight,
    overflow: main.style.overflow,
    flex: main.style.flex,
  };

  // Overlay hides the transient layout shift from the user.
  const overlay = showExportingOverlay();

  // Force main to be exactly the target size regardless of flex sizing.
  main.style.width = `${targetW}px`;
  main.style.height = `${targetH}px`;
  main.style.minWidth = `${targetW}px`;
  main.style.minHeight = `${targetH}px`;
  main.style.maxWidth = 'none';
  main.style.maxHeight = 'none';
  main.style.overflow = 'visible';
  main.style.flex = '0 0 auto';

  // Reset the viewport so content top-left sits at (padding, padding) at
  // 1:1 scale — this gives us a crisp full-detail export.
  rf.setViewport(
    {
      x: -bounds.x + EXPORT_PADDING,
      y: -bounds.y + EXPORT_PADDING,
      zoom: 1,
    },
    { duration: 0 }
  );

  // React Flow measures layout on next frame; ShapeOverlay /
  // AnnotationOverlay re-render on viewport change. Two rAFs give both a
  // chance to settle before html-to-image reads the DOM.
  await nextFrame();
  await nextFrame();

  try {
    return await fn({ width: targetW, height: targetH });
  } finally {
    for (const [k, v] of Object.entries(savedMainStyle)) {
      // setProperty needs kebab-case; but assigning to style[k] with
      // camelCase (as we saved it) works and is simpler.
      (main.style as unknown as Record<string, string>)[k] = v;
    }
    rf.setViewport(savedViewport, { duration: 0 });
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
}

// ---------- Public export functions ----------

/**
 * Render the diagram to a PNG data URL instead of downloading it.
 *
 * Same pipeline as `exportPng` — overlays hidden, light theme forced, full
 * content framed — so what a caller embeds elsewhere is pixel-identical to
 * what the PNG button produces. `exportPng` is now a thin wrapper over it.
 *
 * Returns `null` when there is no canvas to capture.
 */
export async function renderDiagramPngDataUrl(rf: ReactFlowInstance): Promise<string | null> {
  const node = getCanvasHost();
  if (!node) return null;
  let out: string | null = null;
  await withHiddenOverlays(async () => {
    await withFullContentViewport(rf, async (dims) => {
      out = await toPng(node, {
        backgroundColor: '#f8fafc',
        cacheBust: true,
        pixelRatio: 2,
        ...(dims ? { width: dims.width, height: dims.height } : {}),
      });
    });
  });
  return out;
}

export async function exportPng(diagram: Diagram, rf: ReactFlowInstance) {
  const dataUrl = await renderDiagramPngDataUrl(rf);
  if (!dataUrl) return;
  downloadDataUrl(safeFilename(diagram.meta.title || 'diagram') + '.png', dataUrl);
}

export async function exportSvg(diagram: Diagram, rf: ReactFlowInstance) {
  const node = getCanvasHost();
  if (!node) return;
  await withHiddenOverlays(async () => {
    await withFullContentViewport(rf, async (dims) => {
      const dataUrl = await toSvg(node, {
        backgroundColor: '#f8fafc',
        cacheBust: true,
        ...(dims ? { width: dims.width, height: dims.height } : {}),
      });
      downloadDataUrl(safeFilename(diagram.meta.title || 'diagram') + '.svg', dataUrl);
    });
  });
}

export function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'diagram';
}
