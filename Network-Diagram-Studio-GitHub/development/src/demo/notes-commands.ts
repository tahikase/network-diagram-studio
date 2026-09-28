// v0.9.41 — editing commands for the in-place notes editor.
//
// EVERYTHING GOES THROUGH document.execCommand ON PURPOSE
//
// `execCommand` is formally deprecated and there is still no replacement for
// what it does here: it is the only API that mutates a contentEditable subtree
// as a *user edit*, which is what keeps the browser's native undo stack and IME
// composition intact. Rebuilding the DOM by hand would give us Ctrl+Z that
// silently does nothing — and the app's own undo handler deliberately ignores
// events from an editable surface, so there would be no undo at all.
//
// `styleWithCSS` is forced OFF so the browser emits <b>/<i>/<strike> elements
// rather than <span style="font-weight:bold">. The serialiser matches on tag
// names, and inline styles would serialise to nothing — the formatting would
// look right on screen and then vanish on save.
import type { KeyboardEvent } from 'react';
import { PEN_COLORS } from '../theme/palette';
import { normalizeColor, RESET_COLOR } from './notes-dom';

function exec(cmd: string, value?: string): boolean {
  try {
    document.execCommand('styleWithCSS', false, 'false');
  } catch {
    /* not supported everywhere; the command below still works */
  }
  try {
    return document.execCommand(cmd, false, value);
  } catch {
    return false;
  }
}

export const toggleBold = () => exec('bold');
export const toggleItalic = () => exec('italic');
export const toggleStrike = () => exec('strikeThrough');
export const bulletList = () => exec('insertUnorderedList');
export const numberList = () => exec('insertOrderedList');

// ---------------------------------------------------------------------------
// Text colour
// ---------------------------------------------------------------------------

/**
 * The swatches the notes colour menu offers.
 *
 * `PEN_COLORS` is the app's one list of a user-pickable colour, so red here is
 * the red the pen, the shapes and an edge stroke already use — a note that
 * says "the red hop" points at something the reader can find on the canvas.
 *
 * Two of the seven are deliberately left out:
 *   * **Black** — that is the ink the surface already paints with, and the
 *     surface's ink is theme-aware. Writing `#0f172a` into the note instead
 *     would look identical in the light theme and be unreadable in the dark
 *     one. "Default colour" is the honest way to ask for black.
 *   * **White** — invisible on the notes paper. Nothing else it could mean.
 *
 * That leaves the five `palette.ts` describes as chosen for MEANING and legible
 * on both backgrounds, which is exactly the set a note wants.
 */
const NOT_OFFERED_IN_NOTES = new Set<string>(['black', 'white']);
export const NOTE_TEXT_COLORS = PEN_COLORS.filter((c) => !NOT_OFFERED_IN_NOTES.has(c.key));

/** Paint the selection. `styleWithCSS` is off, so this emits `<font color>`. */
export const setTextColor = (hex: string) => exec('foreColor', hex);

/**
 * Take the colour back off the selection, leaving every other bit of formatting
 * where it was.
 *
 * There is no execCommand for this. `removeFormat` would take the bold and the
 * links with it, and `foreColor` refuses `inherit` and `currentColor` — it
 * stores `rgba(0, 0, 0, 0)` and the text turns invisible (measured, not
 * assumed). So the colour is removed in two steps:
 *
 *   1. paint the selection with a sentinel. This is a real user edit, so the
 *      browser splits and merges the runs correctly at the selection edges and
 *      pushes ONE entry onto its native undo stack;
 *   2. drop the colour attribute off the wrappers step 1 just made. They then
 *      inherit the surface's own ink, which is the theme-aware colour the text
 *      had before anyone coloured it.
 *
 * Step 2 touches an attribute and never the text, which is what keeps the undo
 * stack honest: Ctrl+Z after this restores the previous colour in one press,
 * and typing afterwards still undoes normally. Both are asserted in
 * test-notes-color.cjs.
 */
export function clearTextColor(host: HTMLElement | null): boolean {
  if (!exec('foreColor', RESET_COLOR)) return false;
  const scope = host ?? document;
  scope.querySelectorAll<HTMLElement>('font[color], [style*="color"]').forEach((el) => {
    if (normalizeColor(el.getAttribute('color')) === RESET_COLOR) el.removeAttribute('color');
    if (normalizeColor(el.style.color) === RESET_COLOR) el.style.removeProperty('color');
  });
  return true;
}

/**
 * The colour at the caret as `#rrggbb`, or null when the text is the surface's
 * own ink. Drives the swatch under the toolbar's A.
 */
export function currentTextColor(): string | null {
  try {
    return normalizeColor(document.queryCommandValue('foreColor'));
  } catch {
    return null;
  }
}

/**
 * Level 0 is "Normal text". `<div>` rather than `<p>` because the editor's line
 * model is one div per visual line, and mixing the two makes Enter behave
 * differently depending on which block the caret happens to be in.
 */
export const setHeading = (level: number) =>
  exec('formatBlock', level === 0 ? '<div>' : `<h${level}>`);

/**
 * Strip inline formatting and return the block to a plain line.
 * `removeFormat` does not touch block-level tags, so the heading has to be
 * cleared separately or "clear formatting" leaves an H1 behind. It DOES take
 * the text colour with it, which is what a "clear everything" button should do
 * — `clearTextColor` is the surgical version, for the colour menu.
 */
export function clearFormatting(): void {
  exec('removeFormat');
  exec('unlink');
  exec('formatBlock', '<div>');
}

/** True when the caret sits inside that formatting, for the toolbar's pressed state. */
export function commandActive(cmd: string): boolean {
  try {
    return document.queryCommandState(cmd);
  } catch {
    return false;
  }
}

/** The block tag at the caret, e.g. `h2` or `div`. Empty when unknown. */
export function currentBlock(): string {
  try {
    return (document.queryCommandValue('formatBlock') || '').toLowerCase();
  } catch {
    return '';
  }
}

const SAFE_HREF = /^(https?:|mailto:)/i;

/**
 * Turn the selection into a link. An empty selection inserts the URL as its own
 * label, which is what pasting a bare address into notes should do.
 */
export function insertLink(url: string): boolean {
  const href = url.trim();
  if (!SAFE_HREF.test(href)) return false;
  const sel = window.getSelection();
  if (sel && sel.rangeCount && sel.getRangeAt(0).collapsed) {
    if (!exec('insertText', href)) return false;
    // Re-select the text just inserted so createLink has something to wrap.
    const s2 = window.getSelection();
    if (s2 && s2.rangeCount) {
      const r = s2.getRangeAt(0);
      const node = r.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const end = r.startOffset;
        const start = Math.max(0, end - href.length);
        const rr = document.createRange();
        rr.setStart(node, start);
        rr.setEnd(node, end);
        s2.removeAllRanges();
        s2.addRange(rr);
      }
    }
  }
  return exec('createLink', href);
}

/**
 * Insert a table at the caret.
 *
 * execCommand has no table command, so this is the one place the DOM is built
 * by hand. It still goes in through a Range rather than innerHTML, and it is
 * wrapped so the caret lands in the first cell ready to type.
 */
export function insertTable(cols: number, rows: number): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;

  const table = document.createElement('table');
  table.className = 'nds-note-table';
  const thead = document.createElement('thead');
  const htr = document.createElement('tr');
  for (let c = 0; c < cols; c++) {
    const th = document.createElement('th');
    th.appendChild(document.createElement('br'));
    htr.appendChild(th);
  }
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.appendChild(document.createElement('br'));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(table);

  // A table as the last node leaves nowhere to type afterwards.
  const after = document.createElement('div');
  after.appendChild(document.createElement('br'));
  table.parentNode?.insertBefore(after, table.nextSibling);

  const first = table.querySelector('th, td');
  if (first) {
    const r = document.createRange();
    r.setStart(first, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  return true;
}

/** Ctrl/Cmd+B, +I, +U inside the notes. Returns true when handled. */
export function handleNotesShortcut(ev: KeyboardEvent<HTMLElement>): boolean {
  if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return false;
  switch (ev.key.toLowerCase()) {
    case 'b':
      toggleBold();
      return true;
    case 'i':
      toggleItalic();
      return true;
    case 'u':
      // Markdown has no underline, so the closest honest mapping is
      // strikethrough — matching what the toolbar offers.
      toggleStrike();
      return true;
    default:
      return false;
  }
}
