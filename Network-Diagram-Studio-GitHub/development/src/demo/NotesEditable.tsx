// v0.9.41 — the in-place rich notes editor.
//
// THE HAZARD THIS COMPONENT EXISTS TO CONTAIN
//
// React and contentEditable both want to own the same subtree. If React
// re-renders children while the user is typing, the caret jumps to the start
// on every keystroke. So the editable div is rendered ONCE with no React
// children, and its contents are built imperatively from the Markdown.
//
// The rebuild is suppressed by comparing VALUES, never by latching a boolean.
// An earlier draft set a `selfEdit` flag in the input handler and cleared it in
// the effect — but when the emitted Markdown equals what the store already
// holds, zustand skips the update, no re-render happens, and the flag stays
// stuck true. The next genuine outside change (a file load, a tab switch) was
// then silently swallowed and the editor kept showing a stale note. A value
// comparison is self-correcting and has no such trapped state.
import { useEffect, useRef, type ClipboardEvent } from 'react';
import { markdownToDom, domToMarkdown } from './notes-dom';
import { handleNotesShortcut } from './notes-commands';
import { useLayoutStore } from './layout-store';
import { NOTES_IMAGES } from '../env';
import { imageFileFrom, IMG_ATTR } from './notes-images';
import { insertImageFile, openImageForEdit } from './notes-image-insert';

/**
 * The exact Markdown this editor last put on the clipboard.
 *
 * Paste rebuilds formatting ONLY when the incoming `text/plain` is this string.
 * Anything else — a customer email, a Teams message, raw CLI output — is still
 * inserted literally, so a log line holding `*`, `|`, `#` or a backtick can
 * never be silently reinterpreted as Markdown.
 */
let lastCopiedMd: string | null = null;

/** Clipboards rewrite newlines (`\n` out, `\r\n` back), so fold them to compare. */
function sameText(a: string, b: string): boolean {
  return a.replace(/\r\n?/g, '\n') === b.replace(/\r\n?/g, '\n');
}

/** Tags that end an inline run — the clone must not climb past these. */
const BLOCK_TAG = /^(DIV|P|H[1-6]|UL|OL|LI|TABLE|THEAD|TBODY|TR|TD|TH|BLOCKQUOTE|PRE)$/;

/**
 * Clone the selection, restoring the inline formatting `cloneContents` drops.
 *
 * A range that sits entirely inside a <b> has that <b> as an ANCESTOR rather
 * than as a selected node, so `cloneContents` returns bare text and the bold is
 * silently lost. Selecting one bold word and copying it has to keep the bold,
 * so the inline ancestors between the range and its block are re-applied.
 */
function cloneSelection(range: Range, host: HTMLElement | null): HTMLElement {
  const holder = document.createElement('div');
  holder.appendChild(range.cloneContents());

  let anc: Node | null = range.commonAncestorContainer;
  if (anc.nodeType === Node.TEXT_NODE) anc = anc.parentNode;
  while (
    anc &&
    anc !== host &&
    anc.nodeType === Node.ELEMENT_NODE &&
    !BLOCK_TAG.test((anc as HTMLElement).tagName)
  ) {
    const wrap = anc.cloneNode(false) as HTMLElement;
    while (holder.firstChild) wrap.appendChild(holder.firstChild);
    holder.appendChild(wrap);
    anc = anc.parentNode;
  }

  // A purely inline selection needs a block around it. `blockMd` serialises an
  // element by mapping over its CHILDREN, so a bare top-level <b> would be
  // walked straight through and the `**` lost. Wrapping it in a line makes the
  // <b> a child, which is where `inlineMd` can see it.
  const hasBlock = Array.from(holder.childNodes).some(
    (n) => n.nodeType === Node.ELEMENT_NODE && BLOCK_TAG.test((n as HTMLElement).tagName),
  );
  if (!hasBlock && holder.firstChild) {
    const line = document.createElement('div');
    while (holder.firstChild) line.appendChild(holder.firstChild);
    holder.appendChild(line);
  }
  return holder;
}

/**
 * Put the live selection on the clipboard as Markdown.
 *
 * The rendered text a browser copies by default carries no formatting at all —
 * a bold run and a heading both arrive as bare characters — so pasting a note
 * back into a note could only ever produce flat text. Markdown is the format
 * the notes are already stored in, so it round-trips exactly.
 *
 * `text/html` is written alongside it, which keeps pasting a note into Word or
 * Outlook landing as rich text rather than as raw Markdown source.
 *
 * Returns the Range that was written, or null when nothing is selected.
 */
function writeSelection(e: ClipboardEvent<HTMLDivElement>, host: HTMLElement | null): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const holder = cloneSelection(range, host);
  const md = domToMarkdown(holder);
  if (!md) return null;
  e.clipboardData.setData('text/plain', md);
  // Reading innerHTML is fine; the invariant in notes-dom is that nothing ever
  // ASSIGNS it, so no untrusted markup can be parsed back into the document.
  e.clipboardData.setData('text/html', holder.innerHTML);
  e.preventDefault();
  lastCopiedMd = md;
  return range;
}

/** Put the caret immediately after `node`. */
function placeCaretAfter(sel: Selection, node: Node): void {
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}

/** The ancestor of `node` that is a direct child of the editor, if any. */
function topBlock(host: HTMLElement, node: Node): HTMLElement | null {
  let n: Node | null = node;
  while (n && n.parentNode !== host) n = n.parentNode;
  return n && n !== host ? (n as HTMLElement) : null;
}

/** Insert parsed Markdown at the caret, replacing whatever was selected. */
function insertMarkdown(md: string, host: HTMLElement | null): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();

  const frag = markdownToDom(md);

  // `markdownToDom` emits one block per visual line. A lone plain line is
  // unwrapped to its inline content, or pasting mid-sentence would split the
  // line in two.
  const only = frag.childNodes.length === 1 ? frag.firstChild : null;
  if (only && (only as HTMLElement).tagName === 'DIV') {
    const inline = document.createDocumentFragment();
    while (only.firstChild) inline.appendChild(only.firstChild);
    const tail = inline.lastChild;
    range.insertNode(inline);
    if (tail) placeCaretAfter(sel, tail);
    return;
  }

  // Everything else is block-level. The caret can sit inside a <b>/<i> run, and
  // dropping <div>s in there would nest blocks inside inline formatting — the
  // pasted text would then render bold purely because of where it landed. So
  // split the caret's block out to the top level and insert between the halves.
  const block = host ? topBlock(host, range.startContainer) : null;
  const last = frag.lastChild;
  if (!block || !block.parentNode) {
    range.insertNode(frag);
    if (last) placeCaretAfter(sel, last);
    return;
  }

  const cut = document.createRange();
  cut.setStart(range.startContainer, range.startOffset);
  cut.setEndAfter(block);
  const rest = cut.extractContents();

  const parent = block.parentNode;
  const anchor = block.nextSibling;
  parent.insertBefore(frag, anchor);
  // When the caret was at the end of the line the remnant is an empty clone of
  // the block, not anything the user typed, so it is dropped. An empty LINE is
  // kept: it still carries the <br> that contentEditable needs.
  if (rest.textContent || rest.querySelector('br, table, img')) {
    parent.insertBefore(rest, anchor);
  }
  // The caret was at the start of the line, so the original block is now an
  // empty husk — possibly still holding the <b>/<i> wrappers the caret sat in.
  if (!block.textContent && !block.querySelector('br, table, img')) block.remove();
  if (last) placeCaretAfter(sel, last);
}

export function NotesEditable({
  notes,
  docKey,
  onChange,
  editorRef,
  onSelectionChange,
  placeholder,
  ariaLabel,
  decorate,
  rev,
}: {
  notes: string;
  /** Changes when the underlying document changes (tab switch, file load). */
  docKey: string;
  onChange: (md: string) => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onSelectionChange: () => void;
  placeholder: string;
  ariaLabel: string;
  /**
   * Run over the freshly built subtree, for decoration that lives in the DOM
   * and not in the Markdown — currently the comment highlights.
   *
   * Deliberately called ONLY after a rebuild. A rebuild happens on a tab switch
   * or a file load; it does not happen while typing, because the Markdown the
   * editor emits is unchanged by decoration. Calling this on every keystroke
   * would tear down and rebuild the spans around the caret and lose it.
   */
  decorate?: (host: HTMLElement) => void;
  /**
   * Bump to force one rebuild even though the Markdown is unchanged.
   *
   * The only caller is the screenshot store, after IndexedDB hands back bytes
   * that were not available when the note first rendered. Without it the note
   * would keep showing the "missing image" placeholder until the next tab
   * switch, because `notes` genuinely has not changed — the reference in it
   * was always correct, only the picture behind it was late.
   */
  rev?: number;
}) {
  const composing = useRef(false);
  const lastDoc = useRef<string>('');
  const lastRev = useRef<number | undefined>(rev);
  /** The exact Markdown this editor last pushed to the store. */
  const lastEmit = useRef<string | null>(null);
  // Safe to subscribe here: this only re-renders the host element's style.
  // The editable subtree is built imperatively and has no React children, so
  // React has nothing to reconcile inside it and the caret is untouched.
  const fontSize = useLayoutStore((s) => s.notesFontSize);

  // Read through a ref so a new callback identity cannot re-trigger the
  // rebuild effect — its dependencies must stay exactly the two values that
  // legitimately mean "the document changed".
  const decorateRef = useRef(decorate);
  decorateRef.current = decorate;

  // Rebuild only for changes from outside this editor.
  useEffect(() => {
    const host = editorRef.current;
    if (!host) return;
    const fresh = lastDoc.current !== docKey || lastRev.current !== rev;
    lastDoc.current = docKey;
    lastRev.current = rev;
    // A value we just emitted is already on screen; rebuilding it would drop
    // the caret back to the start on every keystroke.
    if (!fresh && notes === lastEmit.current) return;
    // Re-rendering identical Markdown would reset the caret just the same, so
    // fall back to comparing what is actually rendered.
    if (!fresh && domToMarkdown(host) === notes) return;
    lastEmit.current = null;
    host.replaceChildren(markdownToDom(notes));
    host.setAttribute('data-empty', notes ? '0' : '1');
    decorateRef.current?.(host);
  }, [notes, docKey, rev, editorRef]);

  // Keep the toolbar's pressed states honest. The editor's own key/mouse
  // handlers miss a selection that changes without one — a programmatic Range,
  // the browser's find bar, or a drag released outside the panel — and a stale
  // B button is worse than none, because it reports the wrong document state.
  useEffect(() => {
    const onSel = () => {
      const host = editorRef.current;
      if (!host) return;
      if (host.contains(document.getSelection()?.anchorNode ?? null)) onSelectionChange();
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [editorRef, onSelectionChange]);

  const emit = () => {
    const host = editorRef.current;
    if (!host || composing.current) return;
    const md = domToMarkdown(host);
    lastEmit.current = md;
    // `:empty` never matches — an empty contentEditable still holds the
    // <div><br></div> the browser needs to place a caret in. So emptiness is
    // decided from the serialised Markdown, which is the honest test anyway.
    host.setAttribute('data-empty', md ? '0' : '1');
    onChange(md);
  };

  return (
    <div
      ref={editorRef}
      data-nds-notes-input="1"
      data-nds-notes-editor="1"
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={emit}
      // IME: serialising mid-composition tears the candidate string apart, so
      // Japanese, Chinese and Korean input would be unusable.
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
        emit();
      }}
      onKeyUp={onSelectionChange}
      onMouseUp={onSelectionChange}
      onFocus={onSelectionChange}
      // Double-click a screenshot to reopen it in the annotation editor. The
      // affordance is a double-click rather than a button because the note is
      // a contentEditable document — any chrome placed over the picture would
      // have to be a real element, and a real element inside the editable area
      // is one the serialiser would have to know about.
      onDoubleClick={(e) => {
        if (!NOTES_IMAGES) return;
        const img = (e.target as HTMLElement | null)?.closest?.(`img[${IMG_ATTR}]`);
        const id = img?.getAttribute(IMG_ATTR);
        if (!id) return;
        if (openImageForEdit(id)) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (handleNotesShortcut(e)) {
          e.preventDefault();
          emit();
          onSelectionChange();
        }
      }}
      // Copy and cut write Markdown (see `writeSelection`), so pasting a note
      // back into a note can rebuild the formatting that rendered text cannot
      // carry. Paste stays forced through text/plain: that keeps Word and Teams
      // markup out of the document, and means pasted content cannot introduce
      // an element or an attribute the serialiser does not understand.
      onCopy={(e) => {
        writeSelection(e, editorRef.current);
      }}
      onCut={(e) => {
        const range = writeSelection(e, editorRef.current);
        if (!range) return;
        range.deleteContents();
        emit();
      }}
      onPaste={(e) => {
        e.preventDefault();
        // A bitmap on the clipboard is checked FIRST, and deliberately before
        // the `text/plain` bail-out below. Windows puts both an image and a
        // path-ish string on the clipboard for a Snipping Tool / Greenshot
        // capture, and until v0.9.66 the image half was simply thrown away.
        const file = NOTES_IMAGES ? imageFileFrom(e.clipboardData) : null;
        if (file) {
          void insertImageFile(file, editorRef.current, emit);
          return;
        }
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        // Only text this editor itself produced is trusted as Markdown.
        if (lastCopiedMd && sameText(text, lastCopiedMd))
          insertMarkdown(lastCopiedMd, editorRef.current);
        else document.execCommand('insertText', false, text);
        emit();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const text = e.dataTransfer?.getData('text/plain');
        if (!text) return;
        document.execCommand('insertText', false, text);
        emit();
      }}
      className="nds-notes-editor flex-1 min-h-0 w-full overflow-y-auto px-3 py-3
                 leading-relaxed text-slate-800 outline-none nds-scroll"
      // The size is set here rather than as a Tailwind class because it is a
      // user preference. Everything inside the surface is sized in `em`, so
      // this one number scales headings, code, lists and tables with it.
      style={{
        fontFamily: 'inherit',
        fontSize: `${fontSize}px`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    />
  );
}
