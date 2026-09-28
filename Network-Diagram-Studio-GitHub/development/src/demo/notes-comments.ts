// v0.9.65 — comments attached to a highlighted run of a note.
//
// THE CONSTRAINT THAT SHAPES EVERYTHING HERE
//
// A note is stored as a Markdown STRING (see notes-dom.ts). It is re-serialised
// from the DOM on every keystroke, and the app ships as a single HTML file that
// people mail to each other — so copies of OLDER builds are in circulation and
// cannot be fixed retroactively.
//
// That rules out writing the anchor into the Markdown. Measured on the shipped
// prod bundle, a note containing
//
//     <span data-c="k3f9">Hey Hackathon!</span>
//
// renders in a build without this feature as the LITERAL TEXT
// `<span data-c="k3f9">Hey Hackathon!</span>`, because `INLINE_RE` only ever
// matched the colour span. A colleague on last month's copy of the file would
// see their note filled with tag soup.
//
// SO THE ANCHOR NEVER REACHES THE MARKDOWN.
//
// It lives in the DOM only, as `<span data-nds-c="id">`. `tagMd` in notes-dom
// has a `default:` branch that returns `kids()`, so an element it does not
// recognise is unwrapped on serialisation — this span is therefore invisible to
// `domToMarkdown` for free, with no change to that module at all. The saved
// `notes` string stays byte-identical to what the same note produced before
// this feature existed, which is what keeps older builds safe.
//
// WHAT IS PERSISTED INSTEAD
//
// The quoted text plus a little of the text either side of it, in the tab's
// `comments` array. On load the quote is searched for again and the highlight
// re-applied. This is the W3C Web Annotation "text quote selector" model, and
// it is chosen over character offsets because offsets would live in Markdown
// space — a different coordinate system from the rendered text, thanks to
// `escapeMd` — and every edit earlier in the note would shift them, which is
// the classic "the comment drifted onto the wrong sentence" defect.
//
// If the quoted text is gone when the note is reopened, the thread is NOT
// deleted. It becomes DETACHED and is listed in the drawer with the text it
// used to point at, because a comment is a person's words about a customer
// case and silently dropping it is worse than showing it out of place.
import { create } from 'zustand';
import type { NoteComment, NoteCommentMessage } from '../model/schema';

export type { NoteComment, NoteCommentMessage };

/** The attribute that marks a highlighted run. DOM-only; never serialised. */
export const ANCHOR_ATTR = 'data-nds-c';

/** How much text either side of the quote is kept to disambiguate it. */
const CONTEXT = 32;

/* -------------------------------------------------------------------------- */
/* The self-declared author name                                              */
/* -------------------------------------------------------------------------- */

const AUTHOR_KEY = 'nds.authorName';
/** Long enough for a real name, short enough that it cannot become a note. */
export const AUTHOR_MAX = 40;

function readAuthor(): string {
  try {
    return (window.localStorage.getItem(AUTHOR_KEY) ?? '').slice(0, AUTHOR_MAX);
  } catch {
    // file:// with storage disabled — an unnamed session still works.
    return '';
  }
}

type AuthorState = {
  author: string;
  /** True once the user has been asked, even if they left it blank. */
  asked: boolean;
  setAuthor: (name: string) => void;
  markAsked: () => void;
};

export const useAuthorStore = create<AuthorState>((set) => ({
  author: readAuthor(),
  asked: readAuthor().length > 0,
  setAuthor: (name) => {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, AUTHOR_MAX);
    try {
      window.localStorage.setItem(AUTHOR_KEY, clean);
    } catch {
      // Not fatal: the name still applies for this session.
    }
    set({ author: clean, asked: true });
  },
  markAsked: () => set({ asked: true }),
}));

/* -------------------------------------------------------------------------- */
/* Shared UI state                                                             */
/* -------------------------------------------------------------------------- */

// A store rather than props, because the footer chip and the overlay live in
// different parts of the panel and would otherwise need the state lifted into
// NotesEditor, where it would re-render the editor host on every hover.
type CommentsUi = {
  drawerOpen: boolean;
  /** The thread currently shown, or null. */
  focusId: string | null;
  /** Ids whose quoted text is no longer in the note. */
  detached: string[];
  setDrawer: (v: boolean) => void;
  setFocus: (id: string | null) => void;
  setDetached: (ids: string[]) => void;
};

export const useCommentsUi = create<CommentsUi>((set) => ({
  drawerOpen: false,
  focusId: null,
  detached: [],
  setDrawer: (v) => set({ drawerOpen: v }),
  setFocus: (id) => set({ focusId: id }),
  setDetached: (ids) =>
    // Same ids in the same order is the overwhelmingly common case (it is
    // recomputed on every keystroke), and replacing the array would re-render
    // the drawer each time for no change.
    set((s) => (s.detached.join() === ids.join() ? s : { detached: ids })),
}));

// Testing hook — mirrors `window.__nds_tabsStore`. The detached set is derived
// from the live DOM rather than from the file, so there is no other way for a
// Playwright script to assert on it.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_commentsUi?: typeof useCommentsUi }).__nds_commentsUi =
    useCommentsUi;
}

/* -------------------------------------------------------------------------- */
/* Flat text addressing                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The note's text as one string.
 *
 * `Range.toString()` concatenates the text nodes a range covers and nothing
 * else, so this is the same coordinate system `flatOffset` measures in. Both
 * capture and re-find go through these two functions, so they cannot disagree
 * about where a character is.
 */
export function flatText(root: HTMLElement): string {
  const r = document.createRange();
  r.selectNodeContents(root);
  return r.toString();
}

/** Where a DOM point sits in `flatText`. */
function flatOffset(root: HTMLElement, container: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(root, 0);
  try {
    r.setEnd(container, offset);
  } catch {
    return 0;
  }
  return r.toString().length;
}

type Slice = { node: Text; start: number; end: number };

/** Every text node under `root`, with its span in `flatText` coordinates. */
function textSlices(root: HTMLElement): Slice[] {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Slice[] = [];
  let at = 0;
  let n: Node | null;
  while ((n = walk.nextNode())) {
    const t = n as Text;
    const len = t.nodeValue?.length ?? 0;
    out.push({ node: t, start: at, end: at + len });
    at += len;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Applying and removing highlights                                            */
/* -------------------------------------------------------------------------- */

function anchorSpan(id: string): HTMLElement {
  const s = document.createElement('span');
  s.setAttribute(ANCHOR_ATTR, id);
  return s;
}

/**
 * Wrap `[start, end)` of the note's text in anchor spans.
 *
 * A run can cross element boundaries — half of a bold word, or two list items —
 * so this wraps each text node the run touches in its OWN span. One comment can
 * therefore own several spans, which is also how an anchor survives the user
 * pressing Enter in the middle of it.
 *
 * Nothing is inserted, removed or reordered: only wrappers are added, so the
 * text itself, and therefore `domToMarkdown`, is unchanged.
 */
function wrapFlatRange(root: HTMLElement, start: number, end: number, id: string): boolean {
  if (end <= start) return false;
  const targets = textSlices(root)
    .map((s) => ({
      node: s.node,
      from: Math.max(start, s.start) - s.start,
      to: Math.min(end, s.end) - s.start,
    }))
    .filter((s) => s.to > s.from);
  if (!targets.length) return false;

  for (const { node, from, to } of targets) {
    // Already inside this comment's highlight (re-entrant apply).
    if (node.parentElement?.getAttribute(ANCHOR_ATTR) === id) continue;
    let mid = node;
    if (to < (mid.nodeValue?.length ?? 0)) mid.splitText(to);
    if (from > 0) mid = mid.splitText(from);
    const span = anchorSpan(id);
    mid.parentNode?.insertBefore(span, mid);
    span.appendChild(mid);
  }
  return true;
}

/** Every span carrying comment `id`. */
export function anchorsFor(root: HTMLElement, id: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${ANCHOR_ATTR}="${CSS.escape(id)}"]`));
}

/** Unwrap a comment's highlight, leaving the text exactly as it was. */
export function removeAnchors(root: HTMLElement, id: string): void {
  for (const span of anchorsFor(root, id)) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  }
}

/* -------------------------------------------------------------------------- */
/* Capture and re-find                                                         */
/* -------------------------------------------------------------------------- */

/** The quote plus its surrounding context, for a live selection. */
export function captureQuote(
  root: HTMLElement,
  range: Range,
): { quote: string; prefix: string; suffix: string } | null {
  const start = flatOffset(root, range.startContainer, range.startOffset);
  const end = flatOffset(root, range.endContainer, range.endOffset);
  if (end <= start) return null;
  const text = flatText(root);
  const quote = text.slice(start, end);
  if (!quote.trim()) return null;
  return {
    quote,
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  };
}

/** How many characters two strings share at the end of `a` / start of `b`. */
function sharedEnd(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
function sharedStart(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Find where a stored quote sits in the note now, or -1.
 *
 * The same words often appear more than once — "NSG rules" may be on three
 * lines — so every occurrence is scored on how much of the remembered context
 * still matches either side of it, and the best one wins. With no context to go
 * on this degrades to "the first occurrence", which is the right answer for the
 * overwhelmingly common case of a quote that appears once.
 */
export function findQuote(text: string, c: NoteComment): number {
  if (!c.quote) return -1;
  let best = -1;
  let bestScore = -1;
  let from = 0;
  for (;;) {
    const i = text.indexOf(c.quote, from);
    if (i < 0) break;
    const score =
      sharedEnd(text.slice(Math.max(0, i - CONTEXT), i), c.prefix) +
      sharedStart(text.slice(i + c.quote.length, i + c.quote.length + CONTEXT), c.suffix);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
    from = i + 1;
  }
  return best;
}

/**
 * Re-apply every comment's highlight after the editor's DOM was rebuilt.
 *
 * Called on a tab switch and on a file load — the two moments `NotesEditable`
 * throws the subtree away and rebuilds it from the Markdown. Returns the ids
 * that could not be placed, which the drawer shows as detached.
 */
export function applyAnchors(root: HTMLElement, comments: NoteComment[]): string[] {
  const detached: string[] = [];
  // Longest first: a quote nested inside another keeps its own wrapper instead
  // of being swallowed when the outer one splits the text nodes underneath it.
  const ordered = [...comments].sort((a, b) => b.quote.length - a.quote.length);
  for (const c of ordered) {
    // Re-measure every time: the previous wrap split text nodes, but flat
    // offsets are measured from the text itself, which wrapping never changes.
    const at = findQuote(flatText(root), c);
    if (at < 0 || !wrapFlatRange(root, at, at + c.quote.length, c.id)) detached.push(c.id);
  }
  return detached;
}

/**
 * Re-read a comment's quote from the spans that currently carry it.
 *
 * Typing inside a highlight edits the very text the anchor is found by, so the
 * stored quote has to be refreshed from the live DOM or the comment would come
 * back detached the next time the file is opened. Returns null once the spans
 * are gone or hold nothing but whitespace — that comment is now detached.
 */
export function recapture(
  root: HTMLElement,
  id: string,
): { quote: string; prefix: string; suffix: string } | null {
  const spans = anchorsFor(root, id);
  if (!spans.length) return null;
  const r = document.createRange();
  try {
    r.setStartBefore(spans[0]);
    r.setEndAfter(spans[spans.length - 1]);
  } catch {
    return null;
  }
  return captureQuote(root, r);
}

/** Wrap the live selection and return the quote to store against it. */
export function anchorSelection(
  root: HTMLElement,
  range: Range,
  id: string,
): { quote: string; prefix: string; suffix: string } | null {
  const q = captureQuote(root, range);
  if (!q) return null;
  const start = flatOffset(root, range.startContainer, range.startOffset);
  if (!wrapFlatRange(root, start, start + q.quote.length, id)) return null;
  return q;
}

/* -------------------------------------------------------------------------- */
/* Small helpers used by the UI                                                */
/* -------------------------------------------------------------------------- */

/** Short, URL-safe, and unique enough for one note's worth of comments. */
export function newCommentId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Initials for the avatar, or '' when the name is blank. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A stable colour per name, so two people in one file are told apart at a
 * glance. Hue only — saturation and lightness are fixed so every avatar has the
 * same weight and none of them fight the app's own accent blue for attention.
 */
export function colorOf(name: string): string {
  if (!name) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}

/** Comments whose anchor is still present in the note. */
export function isDetached(root: HTMLElement | null, id: string): boolean {
  return !root || anchorsFor(root, id).length === 0;
}
