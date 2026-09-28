// v0.9.66 — screenshots in notes: the storage, the wire format and the capture.
//
// WHY THE PICTURE IS NOT IN THE NOTE
//
// A note is a plain Markdown STRING in the saved `.json` and in the auto-save
// blob. Two separate facts make inlining a base64 image into it wrong:
//
//   1. OLDER BUILDS. Copies of this app without this feature are in
//      circulation and cannot be patched. Measured against the shipped bundle:
//
//        `![Shot](nds-img:a1b2)`              renders as  `!Shot`
//        `<img src="data:image/png;base64,…">` renders as  the ENTIRE base64
//                                                          blob, as visible text
//
//      So the reference form degrades to a single stray `!` and a caption,
//      while the inline form destroys the note. That is the whole reason the
//      wire format is a short reference.
//
//   2. THE AUTO-SAVE BUDGET. localStorage was measured at ~4.8 MB of headroom
//      on this origin and one capture is 50–500 KB. Auto-save swallows a quota
//      failure silently (auto-save.ts), so a few screenshots would not just
//      fail to persist — they would quietly stop the DIAGRAM from persisting
//      too. Bytes therefore go to IndexedDB (10 GB quota) and never into the
//      localStorage blob.
//
// So there are three stores, each holding what it can:
//
//   the note   `![caption](nds-img:a1b2c3)`  — a ~28-byte reference, still
//                                              plain text, still diffable
//   the .json  `images: [{ id, png, … }]`    — the bytes, beside `comments`;
//                                              this is what travels on share
//   IndexedDB  `nds-images`                   — the bytes again, for reload
//
// This mirrors what the comments feature already does: a light anchor in the
// document, the payload under its own key.

import { create } from 'zustand';
import { toPng } from 'html-to-image';
import type { NoteImage } from '../model/schema';
import { flattenToPng } from './screenshot-annot';
import { runtimeExtensions } from '../runtime/extensions';
import { getCanvasHost } from '../canvas/canvas-host';

/** The attribute carrying the image id on the rendered `<img>`. */
export const IMG_ATTR = 'data-nds-img';

/** The scheme used inside the note's Markdown. */
export const IMG_SCHEME = 'nds-img:';

/** Longest caption we store. Captions are alt text, not prose. */
export const CAPTION_MAX = 120;

/**
 * Rendering scale. 2 keeps text in a captured diagram legible without turning
 * a half-screen selection into a multi-megabyte PNG.
 */
const CAPTURE_RATIO = 2;

/** Hard ceiling on either dimension of a stored image, in device pixels. */
const MAX_DIM = 2600;

export function newImageId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** `a1b2c3` → `nds-img:a1b2c3`. */
export function imageRef(id: string): string {
  return IMG_SCHEME + id;
}

/**
 * `nds-img:a1b2c3` → `a1b2c3`, or null for anything else.
 *
 * Deliberately strict. Only this scheme is ever resolved to a picture, so a
 * note that happens to contain `![logo](https://example.com/x.png)` — pasted
 * out of a customer's ticket, say — stays literal text and the app never makes
 * a network request. Keeping that promise is why the notes editor can render
 * images at all in an offline `file://` app.
 */
export function parseImageRef(url: string): string | null {
  const m = /^nds-img:([a-z0-9]{1,32})$/i.exec(url.trim());
  return m ? m[1] : null;
}

/** Every image id a note actually references, in order of appearance. */
export function referencedImageIds(md: string): string[] {
  const out: string[] = [];
  const re = /!\[[^\]\n]*\]\((nds-img:[a-z0-9]{1,32})\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md ?? ''))) {
    const id = parseImageRef(m[1]);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The resolved-URL map
// ---------------------------------------------------------------------------
//
// `markdownToDom` is synchronous and runs on every rebuild, so it cannot await
// anything. This map is what it reads. IndexedDB only ever fills it.

const urls = new Map<string, string>();

/** The data URL for an id, or null when the bytes are not (yet) here. */
export function imageUrl(id: string): string | null {
  return urls.get(id) ?? null;
}

export function rememberImage(id: string, png: string): void {
  if (id && png) urls.set(id, png);
}

export function forgetAllImages(): void {
  urls.clear();
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------
//
// Deliberately tiny, and it never throws. Private-browsing and blocked-storage
// modes must degrade to "images work for this session and still travel in a
// saved .json", never to a broken editor.

const DB_NAME = 'nds-images';
const STORE = 'png';
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function idbWrite(id: string, png: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(png, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbReadAll(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const db = await openDb();
  if (!db) return out;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const keys = store.getAllKeys();
      const vals = store.getAll();
      tx.oncomplete = () => {
        const k = (keys.result ?? []) as IDBValidKey[];
        const v = (vals.result ?? []) as string[];
        k.forEach((key, i) => {
          if (typeof key === 'string' && typeof v[i] === 'string') out.set(key, v[i]);
        });
        resolve();
      };
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  return out;
}

async function idbDelete(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Put an image's RENDERED url into the map, flattening annotations if it has
 * any.
 *
 * `png` on a NoteImage is the unannotated bitmap — blur and crop are already
 * burned into it, but arrows and text are a separate list. Storing the
 * flattened copy as well would double the size of every annotated screenshot
 * in a shared `.json`, so it is derived here instead, once, at load.
 *
 * The unannotated bitmap goes in first and is replaced a frame later. That
 * ordering is on purpose: a picture that appears and then gains its arrows is
 * better than a gap where a picture should be.
 */
export function renderImage(img: NoteImage): void {
  rememberImage(img.id, img.png);
  const shapes = img.shapes;
  if (!shapes || shapes.length === 0) return;
  void flattenToPng(img.png, shapes).then((url) => {
    if (!url || url === img.png) return;
    urls.set(img.id, url);
    scheduleBump();
  });
}

// Several images finishing at once must not cost one notes rebuild each.
let bumpTimer: number | null = null;
function scheduleBump(): void {
  if (bumpTimer !== null) return;
  bumpTimer = window.setTimeout(() => {
    bumpTimer = null;
    useImagesUi.getState().bumpRev();
  }, 0);
}

/** Persist one image's bytes for the next reload. Fire-and-forget by design. */
export function persistImage(img: NoteImage): void {
  renderImage(img);
  void idbWrite(img.id, img.png);
}

/**
 * Pull every stored image back into the in-memory map, then drop any whose id
 * no longer appears in `keep`.
 *
 * Returns the number of images that became available, so the caller can decide
 * whether a re-render is warranted.
 */
export async function hydrateImages(keep: string[]): Promise<number> {
  const stored = await idbReadAll();
  const wanted = new Set(keep);
  const orphans: string[] = [];
  let added = 0;
  stored.forEach((png, id) => {
    if (!wanted.has(id)) {
      orphans.push(id);
      return;
    }
    if (!urls.has(id)) {
      urls.set(id, png);
      added++;
    }
  });
  void idbDelete(orphans);
  return added;
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

export interface CaptureRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Chrome that must never be baked into a capture, including our own overlay. */
const EXCLUDE = [
  'react-flow__controls',
  'data-nds-fullscreen',
  'data-nds-annotation-toolbar',
  'data-nds-empty-state',
  'data-nds-capture-layer',
  'data-nds-tabbar',
  'data-nds-canvas-image-message',
];

function keepForCapture(node: HTMLElement): boolean {
  if (!node || node.nodeType !== 1 || !node.classList) return true;
  for (const sel of EXCLUDE) {
    if (node.classList.contains(sel) || node.hasAttribute?.(sel)) return false;
  }
  return true;
}

/** The element a region is cut out of — the canvas as it currently looks. */
export function captureHost(): HTMLElement | null {
  const host = getCanvasHost();
  const images = runtimeExtensions().ndsCanvasImages;
  return images ? images.captureHost(host) : host;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('capture decode failed'));
    img.src = src;
  });
}

/**
 * Render the canvas and cut `rect` (in viewport coordinates) out of it.
 *
 * WYSIWYG on purpose: whatever theme and zoom are on screen is what lands in
 * the note. The PNG/SVG exporters force the light theme because those files
 * get pasted into customer email; this one is a screenshot, and a screenshot
 * that does not match the screen is a surprise.
 */
export async function captureRegion(rect: CaptureRect): Promise<NoteImage | null> {
  const host = captureHost();
  if (!host || rect.w < 2 || rect.h < 2) return null;
  const hostRect = host.getBoundingClientRect();

  const full = await toPng(host, {
    pixelRatio: CAPTURE_RATIO,
    cacheBust: false,
    filter: keepForCapture as (n: HTMLElement) => boolean,
  });
  const img = await loadImage(full);

  const sx = Math.max(0, Math.round((rect.x - hostRect.left) * CAPTURE_RATIO));
  const sy = Math.max(0, Math.round((rect.y - hostRect.top) * CAPTURE_RATIO));
  const sw = Math.min(Math.round(rect.w * CAPTURE_RATIO), img.width - sx);
  const sh = Math.min(Math.round(rect.h * CAPTURE_RATIO), img.height - sy);
  if (sw < 1 || sh < 1) return null;

  const scale = Math.min(1, MAX_DIM / Math.max(sw, sh));
  const outW = Math.max(1, Math.round(sw * scale));
  const outH = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // The capture root is transparent where the canvas background shows through.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  return {
    id: newImageId(),
    caption: '',
    w: outW,
    h: outH,
    png: canvas.toDataURL('image/png'),
  };
}

/** Turn a pasted or dropped bitmap file into a stored image. */
export async function imageFromBlob(blob: Blob): Promise<NoteImage | null> {
  if (!blob || !blob.type.startsWith('image/')) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ''));
    fr.onerror = () => reject(new Error('read failed'));
    fr.readAsDataURL(blob);
  }).catch(() => '');
  if (!dataUrl) return null;

  const img = await loadImage(dataUrl).catch(() => null);
  if (!img) return null;

  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  // Anything already small enough and already a PNG is stored untouched, so a
  // Greenshot capture pasted straight in keeps its exact pixels.
  if (scale === 1 && blob.type === 'image/png') {
    return { id: newImageId(), caption: '', w: img.width, h: img.height, png: dataUrl };
  }
  const outW = Math.max(1, Math.round(img.width * scale));
  const outH = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, outW, outH);
  return { id: newImageId(), caption: '', w: outW, h: outH, png: canvas.toDataURL('image/png') };
}

/** The first image on a clipboard or drag payload, if there is one. */
export function imageFileFrom(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  const files = Array.from(dt.files ?? []);
  const direct = files.find((f) => f.type.startsWith('image/'));
  if (direct) return direct;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

interface ImagesUi {
  /** True while the region selector owns the screen. */
  capturing: boolean;
  /**
   * The screenshot currently open in the annotation editor, or null.
   *
   * `editingExisting` distinguishes a fresh capture (which must be inserted
   * into the note on save) from a picture already in the note being reopened
   * (which must be replaced in place, keeping its id and its position).
   */
  editing: NoteImage | null;
  editingExisting: boolean;
  /** Bumped when stored bytes arrive, to force one notes rebuild. */
  rev: number;
  /** Set while a capture is being rendered, so the button can show progress. */
  busy: boolean;
  startCapture: () => void;
  endCapture: () => void;
  openEditor: (img: NoteImage, existing: boolean) => void;
  closeEditor: () => void;
  setBusy: (busy: boolean) => void;
  bumpRev: () => void;
}

export const useImagesUi = create<ImagesUi>((set) => ({
  capturing: false,
  editing: null,
  editingExisting: false,
  rev: 0,
  busy: false,
  startCapture: () => set({ capturing: true }),
  endCapture: () => set({ capturing: false }),
  openEditor: (editing, existing) => set({ editing, editingExisting: existing, capturing: false }),
  closeEditor: () => set({ editing: null, editingExisting: false }),
  setBusy: (busy) => set({ busy }),
  bumpRev: () => set((s) => ({ rev: s.rev + 1 })),
}));

/**
 * Put a PNG data URL on the system clipboard.
 *
 * `file://` counts as a secure context in Chrome, so the async Clipboard API is
 * available — but it still needs transient user activation and can be refused
 * outright. Every failure resolves to `false` instead of throwing, because the
 * caller's job is to show "copied" or "couldn't copy", never to crash the
 * editor and lose the user's annotations.
 */
export async function copyPngToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const anyWin = window as unknown as { ClipboardItem?: typeof ClipboardItem };
    if (!navigator.clipboard?.write || !anyWin.ClipboardItem) return false;
    await navigator.clipboard.write([new anyWin.ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    __nds_imagesUi?: typeof useImagesUi;
    __nds_imageUrl?: (id: string) => string | null;
  }
}

if (typeof window !== 'undefined') {
  window.__nds_imagesUi = useImagesUi;
  window.__nds_imageUrl = imageUrl;
}
