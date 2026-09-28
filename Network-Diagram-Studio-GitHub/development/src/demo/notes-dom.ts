// v0.9.41 — the Markdown ⇄ DOM boundary for the in-place notes editor.
//
// WHY THIS EXISTS
//
// v0.9.39 gave the notes a formatting toolbar that inserted Markdown markers,
// and v0.9.40 added a Preview toggle to render them. Both were wrong: the
// requirement is that a bolded word simply LOOKS bold while you are typing, in
// the one window, with no mode to switch. That means a contentEditable surface.
//
// WHAT DID NOT CHANGE, AND WHY IT MATTERS
//
// `notes` is still a plain Markdown STRING in the saved .json. It is NOT HTML.
//   * `studioFileSchema` still declares `notes: z.string().optional()`, and the
//     absent-vs-empty distinction that v0.9.38 made load-bearing still holds.
//   * Every file saved since v0.9.35 keeps loading, unchanged.
//   * A note stays readable in a text editor, which is the whole reason the
//     format was chosen for a support engineer's case notes.
// So this module is a serialisation boundary, nothing more: Markdown in when
// the editor mounts, Markdown out on every keystroke.
//
// THERE IS STILL NO HTML PARSING ANYWHERE
//
// `markdownToDom` builds nodes with `createElement`/`createTextNode`. It never
// assigns `innerHTML` and never goes near `dangerouslySetInnerHTML`, so a note
// pasted out of a customer ticket cannot introduce an element or an attribute —
// text is only ever set as text. Paste is separately forced through
// `text/plain` in the editor, which also stops Word/Teams markup from getting
// in. That combination is what lets a rich editor exist in a `file://` app with
// no sanitiser dependency.
//
// v0.9.46 — copy and cut in the editor now write `domToMarkdown` of the
// selection to the clipboard, and paste feeds that back through
// `markdownToDom`, so formatting survives a copy/paste between notes. This does
// NOT weaken the rule above: the round trip runs through these two functions,
// so pasted content is still only ever built with `createElement`. Text the
// editor did not produce is inserted literally and is never parsed.
//
// TEXT COLOUR — THE ONE PIECE OF PRESENTATION THE NOTE CARRIES
//
// Markdown encodes structure, not presentation, which is why the text-SIZE
// control (v0.9.43) deliberately writes nothing into the document. Colour is
// the exception, and it has to be, because a colour is not a view preference:
// red means "this is the broken hop" and it belongs to the note, not to the
// window it is being read in. The only place it can live is inline HTML, so
// the wire format is the one every Markdown tool already understands:
//
//     <span style="color:#dc2626">text</span>
//
// THE INVARIANT ABOVE STILL HOLDS. This is not an HTML parser. One regex
// matches that exact shape with a `#rrggbb` literal and nothing else — no
// attribute list, no tag list, no nesting — and the node it produces is built
// with `createElement`, exactly like every other node here. A `<span>` with any
// other attribute, or a colour that is not six hex digits, is not matched at
// all and stays literal text. `innerHTML` is still never assigned.
//
// IN THE DOM THE CARRIER IS `<font color>`, NOT THE SPAN. That is what
// `execCommand('foreColor')` emits with `styleWithCSS` off (see
// notes-commands.ts), so building the same element on load means a loaded note
// and a freshly-coloured one are the same shape — one case to serialise, and
// the browser's own commands split and merge our runs as if it had made them.
// The serialiser reads both forms anyway, so a styled span cannot lose its
// colour if a browser ever produces one.

import { IMG_ATTR, imageRef, imageUrl, parseImageRef } from './notes-images';

// ---------------------------------------------------------------------------
// Markdown → DOM
// ---------------------------------------------------------------------------

// 1 code · 2 label 3 url · 4 bold+italic · 5 bold · 6 italic · 7 strike · 8 bare
// url · 9 colour 10 coloured text · 11 image caption 12 image ref
//
// THE IMAGE ALTERNATIVE IS LAST ON PURPOSE. Every branch in `inlineToDom`
// reads its group BY NUMBER, so inserting anywhere else would silently
// renumber the lot. Appending keeps 1–10 exactly where they were.
//
// It still wins over the link alternative for `![x](nds-img:a1)`, because a
// regex match is leftmost-first: the engine reaches the `!` position before
// the `[` one, and only this alternative can match there.
//
// It matches `nds-img:` and NOTHING else. An image reference pasted out of a
// customer's ticket — `![logo](https://example.com/x.png)` — therefore stays
// literal text, and this offline app never issues a network request.
// `g` is required so `lastIndex` can be driven by the escape-skipping scan in
// `inlineToDom`. Every `exec` there assigns `lastIndex` first, so the shared
// index is never carried between calls — including across recursion.
const INLINE_RE =
  /`([^`\n]+)`|\[([^\]\n]*)\]\(([^)\s]*)\)|\*\*\*([^\n]+?)\*\*\*|\*\*([^\n]+?)\*\*|\*([^*\n]+?)\*|~~([^\n]+?)~~|(https?:\/\/[^\s<>()[\]]+)|<span style="color:(#[0-9a-fA-F]{6})">([^\n]*?)<\/span>|!\[([^\]\n]*)\]\((nds-img:[a-z0-9]{1,32})\)/g;

const SAFE_HREF = /^(https?:|mailto:)/i;

/**
 * The colour "Default colour" paints with before the wrapper it creates is
 * stripped — see `clearTextColor` in notes-commands.ts.
 *
 * It is listed here, in the module that owns the wire format, because the
 * contract is a serialisation one: this value is NEVER written into a note. The
 * strip runs synchronously before the note is serialised, so the guard in
 * `noteColorHex` is only a second line of defence — but a sentinel that leaked
 * into a saved file would be a colour the user never picked and cannot see.
 */
export const RESET_COLOR = '#010203';

const HEX6 = /^#[0-9a-f]{6}$/;

/**
 * A CSS colour reduced to `#rrggbb`, or null when it is not one.
 *
 * Two producers have to agree here: `<font color="#dc2626">` keeps the literal
 * the command was given, while a computed `style.color` — and everything
 * `queryCommandValue('foreColor')` returns — arrives as `rgb(220, 38, 38)`.
 * Anything else (a named colour, a gradient, `rgba(0, 0, 0, 0)` from the
 * browser's own no-op reset) is not a colour this format can carry, so it is
 * dropped rather than guessed at.
 */
export function normalizeColor(css: string | null | undefined): string | null {
  if (!css) return null;
  const v = css.trim().toLowerCase();
  if (HEX6.test(v)) return v;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(v);
  if (!rgb) return null;
  // Fully transparent is what `foreColor` falls back to when it is handed a
  // value it cannot use, e.g. `inherit`. It is an absence, not a colour.
  if (rgb[4] !== undefined && Number(rgb[4]) === 0) return null;
  const pair = (n: string) => Math.min(255, Number(n)).toString(16).padStart(2, '0');
  return `#${pair(rgb[1])}${pair(rgb[2])}${pair(rgb[3])}`;
}

/** The colour an element paints its text with, in the form the note stores. */
function noteColorHex(e: HTMLElement): string | null {
  const attr = e.tagName === 'FONT' ? e.getAttribute('color') : null;
  const hex = normalizeColor(attr) ?? normalizeColor(e.style.color);
  return hex === RESET_COLOR ? null : hex;
}

/**
 * The element a coloured run lives in.
 *
 * `<font color>` rather than a styled span on purpose — see the note at the top
 * of this file. The hex has already been matched against `#[0-9a-f]{6}`, so
 * there is nothing here an attribute value could smuggle in.
 */
function colorEl(hex: string): HTMLElement {
  const f = document.createElement('font');
  f.setAttribute('color', hex.toLowerCase());
  return f;
}

/** `\*` → `*`. The serialiser escapes these so typed text survives a round trip. */
function unescapeMd(s: string): string {
  return s.replace(/\\([\\`*~[\]#\-+|.()])/g, '$1');
}

/**
 * True when the character at `i` is preceded by an odd run of backslashes, i.e.
 * the user escaped it and it is literal text rather than a Markdown delimiter.
 *
 * This is the guard that keeps typed arithmetic intact. `escapeMd` writes
 * `2 * 3 * 4` out as `2 \* 3 \* 4`; without this check the italic rule matches
 * the two escaped asterisks as a delimiter pair, and the note comes back as
 * `2 \ 3 \ 4` wrapped in an <i>. That is silent data loss on every reload.
 */
function isEscapedAt(s: string, i: number): boolean {
  let n = 0;
  while (i - n - 1 >= 0 && s[i - n - 1] === '\\') n++;
  return n % 2 === 1;
}

/** The first match whose opening delimiter the user did not escape. */
function nextInline(rest: string): RegExpExecArray | null {
  let from = 0;
  for (;;) {
    INLINE_RE.lastIndex = from;
    const m = INLINE_RE.exec(rest);
    if (!m) return null;
    if (!isEscapedAt(rest, m.index)) return m;
    // Resume one character in, so a real delimiter later in the line is still
    // found rather than being swallowed by the rejected candidate.
    from = m.index + 1;
  }
}

function el(tag: string, cls?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function anchor(label: string, url: string): Node {
  const href = url.trim();
  const text = label || href;
  // Allow-listed rather than block-listed: this covers `javascript:` and
  // `data:` without having to enumerate every dangerous scheme.
  if (!SAFE_HREF.test(href)) return document.createTextNode(text);
  const a = el('a', 'nds-note-link');
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  a.textContent = text;
  return a;
}

/**
 * An `<img>` for a picture whose bytes are not here.
 *
 * The element is built even then, because it is what carries the
 * `data-nds-img` id — and that id is what `domToMarkdown` writes back. Falling
 * back to a text node would silently delete the reference from the note the
 * first time it was edited on a machine where the picture had not loaded yet.
 *
 * IT IS BUILT WITHOUT A `src`, AND THAT IS THE WHOLE TRICK. An `<img>` whose
 * src LOADS is a replaced element: the browser paints the bitmap and never the
 * alt text, so a placeholder pointed at a 1x1 pixel renders as an unlabelled
 * box and the reader is told nothing. With no src the alt text becomes the
 * element's rendered content, which is the only way the caption reaches them.
 * `domToMarkdown` reads only the id and the alt, never the src, so the
 * reference round-trips untouched either way.
 */
function imageEl(caption: string, ref: string): HTMLElement {
  const id = parseImageRef(ref) ?? '';
  const src = imageUrl(id);
  const img = el('img', src ? 'nds-note-img' : 'nds-note-img nds-note-img-missing');
  // createElement + setAttribute throughout — never innerHTML. See the module
  // header: the note is untrusted text and this is the only boundary it
  // becomes DOM at.
  img.setAttribute(IMG_ATTR, id);
  img.setAttribute('alt', caption);
  if (src) img.setAttribute('src', src);
  // contentEditable would otherwise offer resize handles that write inline
  // width/height the serialiser cannot carry.
  img.setAttribute('draggable', 'false');
  return img;
}

/** Parse inline Markdown into nodes appended to `parent`. */
function inlineToDom(text: string, parent: Node): void {
  let rest = text;
  let guard = 0;
  while (rest && guard++ < 5000) {
    const m = nextInline(rest);
    if (!m) break;
    if (m.index > 0) parent.appendChild(document.createTextNode(unescapeMd(rest.slice(0, m.index))));

    if (m[1] !== undefined) {
      const c = el('code');
      c.textContent = unescapeMd(m[1]);
      parent.appendChild(c);
    } else if (m[3] !== undefined) {
      parent.appendChild(anchor(unescapeMd(m[2] ?? ''), m[3]));
    } else if (m[4] !== undefined) {
      const b = el('b');
      const i = el('i');
      inlineToDom(m[4], i);
      b.appendChild(i);
      parent.appendChild(b);
    } else if (m[5] !== undefined) {
      const b = el('b');
      inlineToDom(m[5], b);
      parent.appendChild(b);
    } else if (m[6] !== undefined) {
      const i = el('i');
      inlineToDom(m[6], i);
      parent.appendChild(i);
    } else if (m[7] !== undefined) {
      const s = el('s');
      inlineToDom(m[7], s);
      parent.appendChild(s);
    } else if (m[8] !== undefined) {
      // A sentence-final period is punctuation, not part of the address.
      const raw = m[8].replace(/[.,;:!?]+$/, '');
      parent.appendChild(anchor(raw, raw));
      const tail = m[8].slice(raw.length);
      if (tail) parent.appendChild(document.createTextNode(tail));
    } else if (m[9] !== undefined) {
      const f = colorEl(m[9]);
      inlineToDom(m[10] ?? '', f);
      parent.appendChild(f);
    } else if (m[12] !== undefined) {
      parent.appendChild(imageEl(unescapeMd(m[11] ?? ''), m[12]));
    }
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) parent.appendChild(document.createTextNode(unescapeMd(rest)));
}

/** A line of content, or an explicit empty line the browser can put a caret in. */
function lineDiv(content?: string): HTMLElement {
  const d = el('div');
  if (content) inlineToDom(content, d);
  else d.appendChild(el('br'));
  return d;
}

const BULLET = /^\s*[-+]\s+|^\s*\*[ \t]+/;
const NUMBER = /^\s*\d+[.)]\s+/;
const ROW = /^\s*\|.*\|\s*$/;
const SEP = /^\s*\|[\s:|-]+\|\s*$/;

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/**
 * Build the editor's DOM for a Markdown string.
 *
 * The shape is deliberately ONE BLOCK PER VISUAL LINE, because that is the
 * model contentEditable itself uses when the user presses Enter. Matching it
 * means the browser's own editing behaviour lands where the serialiser expects.
 */
export function markdownToDom(md: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const lines = (md ?? '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      frag.appendChild(lineDiv());
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const node = el(`h${h[1].length}`);
      inlineToDom(h[2], node);
      frag.appendChild(node);
      i++;
      continue;
    }

    if (ROW.test(line) && i + 1 < lines.length && SEP.test(lines[i + 1])) {
      const head = tableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && ROW.test(lines[i])) {
        rows.push(tableCells(lines[i]));
        i++;
      }
      const table = el('table', 'nds-note-table');
      const thead = el('thead');
      const htr = el('tr');
      head.forEach((c) => {
        const th = el('th');
        inlineToDom(c, th);
        if (!c) th.appendChild(el('br'));
        htr.appendChild(th);
      });
      thead.appendChild(htr);
      table.appendChild(thead);
      const tbody = el('tbody');
      rows.forEach((r) => {
        const tr = el('tr');
        head.forEach((_, n) => {
          const td = el('td');
          const v = r[n] ?? '';
          inlineToDom(v, td);
          if (!v) td.appendChild(el('br'));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      frag.appendChild(table);
      continue;
    }

    if (BULLET.test(line)) {
      const ul = el('ul');
      while (i < lines.length && BULLET.test(lines[i])) {
        const li = el('li');
        inlineToDom(lines[i].replace(BULLET, ''), li);
        ul.appendChild(li);
        i++;
      }
      frag.appendChild(ul);
      continue;
    }

    if (NUMBER.test(line)) {
      const ol = el('ol');
      const start = Number(/^\s*(\d+)/.exec(line)?.[1] ?? 1);
      if (start !== 1) ol.setAttribute('start', String(start));
      while (i < lines.length && NUMBER.test(lines[i])) {
        const li = el('li');
        inlineToDom(lines[i].replace(NUMBER, ''), li);
        ol.appendChild(li);
        i++;
      }
      frag.appendChild(ol);
      continue;
    }

    frag.appendChild(lineDiv(line));
    i++;
  }

  if (!frag.childNodes.length) frag.appendChild(lineDiv());
  return frag;
}

// ---------------------------------------------------------------------------
// DOM → Markdown
// ---------------------------------------------------------------------------

/**
 * Escape characters that would otherwise be re-read as formatting.
 *
 * Without this, typing `2 * 3 * 4` in the editor would come back as italics
 * after a reload, and `C:\path` would lose its backslash. The parser's
 * `unescapeMd` is the exact inverse.
 */
function escapeMd(s: string): string {
  return s.replace(/([\\`*~[\]])/g, '\\$1');
}

/** Markdown cannot wrap padding whitespace, so push it outside the markers. */
function wrapInline(inner: string, marker: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
  if (!m || !m[2]) return inner;
  return `${m[1]}${marker}${m[2]}${marker}${m[3]}`;
}

function inlineMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeMd(node.nodeValue ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const e = node as HTMLElement;
  const body = tagMd(e);
  const hex = noteColorHex(e);
  // An empty run — a <br>, or a wrapper whose text the user has just deleted —
  // would otherwise serialise as a marker around nothing: noise in the saved
  // file that parses back to an element holding no text.
  if (!hex || !body.trim()) return body;
  return `<span style="color:${hex}">${body}</span>`;
}

/** The Markdown for an element's own tag, before any colour is wrapped round it. */
function tagMd(e: HTMLElement): string {
  const kids = () => Array.from(e.childNodes).map(inlineMd).join('');

  switch (e.tagName) {
    case 'BR':
      return '';
    case 'B':
    case 'STRONG':
      return wrapInline(kids(), '**');
    case 'I':
    case 'EM':
      return wrapInline(kids(), '*');
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return wrapInline(kids(), '~~');
    case 'CODE':
      return '`' + (e.textContent ?? '') + '`';
    case 'A': {
      const href = e.getAttribute('href') ?? '';
      const text = kids();
      if (!href) return text;
      // A bare URL stays bare, so it does not gain brackets on every save.
      if (text.trim() === href.trim()) return href;
      return `[${text}](${href})`;
    }
    case 'IMG': {
      // Only OUR images survive serialisation. Anything else the browser put
      // here — a drag from another tab, a paste of remote HTML — has no id and
      // is dropped, which is what keeps a note from carrying a URL this
      // offline app would have to fetch.
      const id = e.getAttribute(IMG_ATTR) ?? '';
      if (!/^[a-z0-9]{1,32}$/i.test(id)) return '';
      return `![${escapeMd(e.getAttribute('alt') ?? '')}](${imageRef(id)})`;
    }
    default:
      return kids();
  }
}

/** Prefix characters that would turn a plain line into a block on re-parse. */
function escapeLineStart(s: string): string {
  return s
    .replace(/^(\s*)(#{1,6})(\s)/, '$1\\$2$3')
    .replace(/^(\s*)([-+])(\s)/, '$1\\$2$3')
    .replace(/^(\s*)(\d+)([.)])(\s)/, '$1$2\\$3$4')
    .replace(/^(\s*)\|/, '$1\\|');
}

function cellMd(cell: Element): string {
  return Array.from(cell.childNodes).map(inlineMd).join('').replace(/\|/g, '\\|').trim();
}

function blockMd(node: Node, out: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = escapeMd(node.nodeValue ?? '');
    if (t.trim()) out.push(escapeLineStart(t));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const e = node as HTMLElement;

  switch (e.tagName) {
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      const n = Number(e.tagName[1]);
      out.push('#'.repeat(n) + ' ' + Array.from(e.childNodes).map(inlineMd).join('').trim());
      return;
    }
    case 'UL':
      Array.from(e.children).forEach((li) => {
        out.push('- ' + Array.from(li.childNodes).map(inlineMd).join('').trim());
      });
      return;
    case 'OL': {
      const start = Number(e.getAttribute('start') ?? '1') || 1;
      Array.from(e.children).forEach((li, n) => {
        out.push(`${start + n}. ` + Array.from(li.childNodes).map(inlineMd).join('').trim());
      });
      return;
    }
    case 'TABLE': {
      const rows = Array.from(e.querySelectorAll('tr'));
      if (!rows.length) return;
      const head = Array.from(rows[0].children).map(cellMd);
      out.push('| ' + head.join(' | ') + ' |');
      out.push('| ' + head.map(() => '---').join(' | ') + ' |');
      rows.slice(1).forEach((tr) => {
        const cs = Array.from(tr.children).map(cellMd);
        while (cs.length < head.length) cs.push('');
        out.push('| ' + cs.join(' | ') + ' |');
      });
      return;
    }
    case 'BR':
      out.push('');
      return;
    default: {
      // A div/p is one visual line. A div that only holds <br> is a blank line,
      // which is how contentEditable represents an empty paragraph.
      const only = e.childNodes.length === 1 && (e.firstChild as HTMLElement)?.tagName === 'BR';
      if (only) {
        out.push('');
        return;
      }
      // Nested block children (the browser does this on paste and on Enter
      // inside a list) have to recurse, or their content is flattened away.
      const hasBlockKid = Array.from(e.childNodes).some(
        (c) =>
          c.nodeType === Node.ELEMENT_NODE &&
          /^(DIV|P|UL|OL|H[1-6]|TABLE|BLOCKQUOTE|PRE)$/.test((c as HTMLElement).tagName),
      );
      if (hasBlockKid) {
        Array.from(e.childNodes).forEach((c) => blockMd(c, out));
        return;
      }
      out.push(escapeLineStart(Array.from(e.childNodes).map(inlineMd).join('')));
    }
  }
}

/** Serialise the editor's DOM back to the Markdown string that gets saved. */
export function domToMarkdown(root: HTMLElement): string {
  const out: string[] = [];
  Array.from(root.childNodes).forEach((n) => blockMd(n, out));
  // A single trailing blank line is an artefact of the last <div><br></div>,
  // not something the user typed.
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

// Testing hook — mirrors `window.__nds_tabsStore`. The round trip through
// these two functions IS the wire format's contract; asserting it through the
// editor's caret instead would make the test about contentEditable rather
// than about serialisation.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_notesDom?: unknown }).__nds_notesDom = {
    markdownToDom,
    domToMarkdown,
  };
}
