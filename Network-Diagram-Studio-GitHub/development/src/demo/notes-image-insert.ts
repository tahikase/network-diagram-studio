// v0.9.66 — putting a captured picture into the note.
//
// This is the one module that knows about BOTH the image store and the tabs
// store, which is why it is separate from `notes-images.ts`: `tabs-store`
// already imports that module, so the dependency has to run one way only.
//
// Two insertion routes, because the Screenshot button lives in the header and
// the notes panel may well be shut:
//
//   caret   the editor is open and the caret is in it — the `<img>` goes
//           exactly where the user was, like any other insert command
//   append  everything else — the reference is appended to the Markdown and
//           the notes panel is opened so the result is actually visible
//
// Both end with the same Markdown, `![caption](nds-img:id)`. The caret route
// simply avoids the full rebuild (and the lost caret) that editing the store's
// string would cause.

import { useTabsStore } from './tabs-store';
import { useLayoutStore } from './layout-store';
import {
  IMG_ATTR,
  captureRegion,
  imageFromBlob,
  imageRef,
  imageUrl,
  persistImage,
  referencedImageIds,
  useImagesUi,
  type CaptureRect,
} from './notes-images';
import type { NoteImage } from '../model/schema';

/**
 * Record an image against the active tab and make its bytes durable.
 *
 * Orphans are swept here rather than on delete: the note is the only authority
 * on what is still referenced, and a user who deletes a picture and then hits
 * undo must get it back.
 */
export function registerImage(img: NoteImage): void {
  persistImage(img);
  const st = useTabsStore.getState();
  const tab = st.tabs.find((t) => t.id === st.activeTabId);
  const kept = (tab?.images ?? []).filter((i) => i.id !== img.id);
  st.setActiveTabImages([...kept, img]);
}

/** Drop stored bytes for images the note no longer mentions. */
export function collectOrphans(): void {
  const st = useTabsStore.getState();
  const tab = st.tabs.find((t) => t.id === st.activeTabId);
  if (!tab) return;
  const live = referencedImageIds(tab.notes);
  const next = tab.images.filter((i) => live.includes(i.id));
  if (next.length !== tab.images.length) st.setActiveTabImages(next);
}

function imgElement(img: NoteImage): HTMLImageElement {
  const el = document.createElement('img');
  el.className = 'nds-note-img';
  el.setAttribute(IMG_ATTR, img.id);
  el.setAttribute('alt', img.caption);
  // The rendered url when there is one — `img.png` is the bitmap WITHOUT
  // annotations, and inserting that would show an un-annotated picture until
  // the next rebuild swapped it.
  el.setAttribute('src', imageUrl(img.id) ?? img.png);
  el.setAttribute('draggable', 'false');
  return el;
}

/**
 * Insert at the caret, the way `insertTable` does — through a Range, never
 * innerHTML. Returns false when there is no caret inside `host` to insert at.
 */
export function insertImageAtCaret(img: NoteImage, host: HTMLElement | null): boolean {
  if (!host) return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  if (!host.contains(sel.anchorNode)) return false;

  const range = sel.getRangeAt(0);
  range.deleteContents();
  const el = imgElement(img);
  range.insertNode(el);

  // An image as the last node leaves nowhere to type afterwards.
  const after = document.createTextNode('');
  el.parentNode?.insertBefore(after, el.nextSibling);
  const r = document.createRange();
  r.setStart(after, 0);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  return true;
}

/** Append the reference to the end of the active tab's note. */
function appendToNotes(img: NoteImage): void {
  const st = useTabsStore.getState();
  const tab = st.tabs.find((t) => t.id === st.activeTabId);
  const md = tab?.notes ?? '';
  const ref = `![${img.caption}](${imageRef(img.id)})`;
  st.setActiveTabNotes(md ? `${md}\n\n${ref}` : ref);
  useLayoutStore.getState().setNotesOpen(true);
}

/**
 * Store the image and put it in the note, by whichever route applies.
 *
 * `emit` is the editor's serialise-and-push callback. It is only needed on the
 * caret route: the append route writes the store directly, and calling emit
 * there would push a stale serialisation of the DOM back over it.
 */
export function placeImage(
  img: NoteImage,
  host: HTMLElement | null,
  emit?: () => void,
): void {
  registerImage(img);
  if (insertImageAtCaret(img, host)) emit?.();
  else appendToNotes(img);
}

/** Paste / drop path: a bitmap File straight into the note. */
export async function insertImageFile(
  file: File,
  host: HTMLElement | null,
  emit?: () => void,
): Promise<void> {
  const img = await imageFromBlob(file);
  if (!img) return;
  placeImage(img, host, emit);
}

/**
 * Header-button path: render the selected region and hand it to the editor.
 *
 * The overlay is torn down BEFORE rendering — it is excluded by the capture
 * filter anyway, but the dim backdrop repainting mid-render is the kind of
 * thing that shows up as a grey band in one browser and not another.
 */
export async function captureAndEdit(rect: CaptureRect): Promise<boolean> {
  const ui = useImagesUi.getState();
  ui.endCapture();
  ui.setBusy(true);
  try {
    const img = await captureRegion(rect);
    if (!img) return false;
    useImagesUi.getState().openEditor(img, false);
    return true;
  } catch {
    return false;
  } finally {
    useImagesUi.getState().setBusy(false);
  }
}

/**
 * Commit whatever the editor is holding.
 *
 * A fresh capture is appended to the note. Deliberately NOT the caret route:
 * the user has been dragging on the canvas and then working in a modal, so any
 * caret left in the editor is stale — and without an `emit` to push the
 * serialisation back, a DOM-only insert would vanish on the next rebuild.
 *
 * A reopened picture keeps its id, so the `![](nds-img:id)` reference already
 * in the Markdown stays valid and the picture does not move. Only the stored
 * bytes and shapes change, which is why this ends with an explicit rebuild:
 * the note's text is identical, so nothing else would tell it to repaint.
 */
export function saveEdited(img: NoteImage, existing: boolean): void {
  if (existing) {
    registerImage(img);
    useImagesUi.getState().bumpRev();
  } else {
    placeImage(img, null);
  }
  useImagesUi.getState().closeEditor();
}

/** Reopen a picture that is already in the note. Returns false if it is gone. */
export function openImageForEdit(id: string): boolean {
  const st = useTabsStore.getState();
  const tab = st.tabs.find((t) => t.id === st.activeTabId);
  const img = tab?.images.find((i) => i.id === id);
  if (!img || !img.png) return false;
  useImagesUi.getState().openEditor(img, true);
  return true;
}
