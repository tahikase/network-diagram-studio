// v0.9.65 — the comment UI that sits over the notes editor.
//
// Every popover in here is `position: fixed`. That is not a style preference:
// test-notespanel.cjs asserts the canvas geometry does not move by a single
// pixel when notes are toggled, and anything that took part in the panel's
// normal flow could push its content around. Fixed elements are out of flow,
// so the editor underneath is untouched no matter what is open.
//
// The highlight CSS is injected from here rather than added to index.css, so
// that a production build — where NOTES_COMMENTS is false and this module is
// dropped entirely — carries no trace of the feature at all.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import {
  ANCHOR_ATTR,
  AUTHOR_MAX,
  anchorSelection,
  anchorsFor,
  colorOf,
  initialsOf,
  newCommentId,
  recapture,
  removeAnchors,
  useAuthorStore,
  useCommentsUi,
  type NoteComment,
  type NoteCommentMessage,
} from './notes-comments';

/* -------------------------------------------------------------------------- */
/* Highlight styling                                                           */
/* -------------------------------------------------------------------------- */

const STYLE_ID = 'nds-comments-css';

function useHighlightCss(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
[${ANCHOR_ATTR}]{background:rgba(250,204,21,.34);border-bottom:1.5px solid rgba(202,138,4,.7);
  border-radius:2px;cursor:pointer;}
[${ANCHOR_ATTR}]:hover{background:rgba(250,204,21,.55);}
[${ANCHOR_ATTR}][data-nds-c-res="1"]{background:rgba(148,163,184,.18);
  border-bottom-color:rgba(148,163,184,.55);}
[${ANCHOR_ATTR}][data-nds-c-on="1"]{background:rgba(250,204,21,.72);}`;
    document.head.appendChild(el);
  }, []);
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

function nowIso(): string {
  return new Date().toISOString();
}

/** "3m ago", in the user's language. */
function ago(iso: string, t: (s: string) => string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return t('just now');
  const m = Math.floor(ms / 60_000);
  if (m < 60) return t('{n}m ago').replace('{n}', String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t('{n}h ago').replace('{n}', String(h));
  return t('{n}d ago').replace('{n}', String(Math.floor(h / 24)));
}

/** Keep a fixed-position box inside the viewport. */
function clamp(x: number, size: number, max: number): number {
  return Math.max(8, Math.min(x, max - size - 8));
}

function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = initialsOf(name);
  return (
    <span
      aria-hidden="true"
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: colorOf(name),
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initials || '?'}
    </span>
  );
}

/** A name, or an honest admission that we do not have one. Never a guess. */
function AuthorName({ name }: { name: string }) {
  const t = useT();
  if (name) return <span className="font-semibold text-slate-700 truncate">{name}</span>;
  return <span className="italic text-slate-400 truncate">{t('Unknown')}</span>;
}

/* -------------------------------------------------------------------------- */
/* The name field, shown inline the first time and in Settings after that      */
/* -------------------------------------------------------------------------- */

/** How long to wait after the last keystroke before writing the name. */
const NAME_SAVE_MS = 400;

export function AuthorNameField({
  autoFocus = false,
  showSaved = false,
}: {
  autoFocus?: boolean;
  /** Confirm the write in place, the way the diagram's own save chip does. */
  showSaved?: boolean;
}) {
  const t = useT();
  const author = useAuthorStore((s) => s.author);
  const setAuthor = useAuthorStore((s) => s.setAuthor);
  const [draft, setDraft] = useState(author);
  const [saved, setSaved] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Typed but not yet written — what the unmount flush has to rescue. */
  const unsaved = useRef<string | null>(null);
  /** The last value THIS field wrote, so it can ignore its own echo. */
  const mine = useRef<string | null>(null);

  const commit = useCallback(
    (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      unsaved.current = null;
      setAuthor(value);
      // The store normalises whitespace and clips the length, so read back
      // what it actually kept rather than assuming it kept what we sent.
      mine.current = useAuthorStore.getState().author;
      setSaved(true);
    },
    [setAuthor],
  );

  // Adopt an outside change — the Settings field and the first-run field are
  // the same value in two places, and either can be open while the other edits.
  // The field's OWN write is skipped: `setAuthor` trims, so echoing it back
  // would delete the space the moment someone paused after their first name.
  useEffect(() => {
    if (author === mine.current) return;
    setDraft(author);
  }, [author]);

  // Saving on blur alone loses the name when the Settings panel is dismissed
  // by clicking the canvas, because the field unmounts without ever blurring.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (unsaved.current !== null) useAuthorStore.getState().setAuthor(unsaved.current);
    },
    [],
  );

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(id);
  }, [saved]);

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        type="text"
        data-nds-comment-name="1"
        value={draft}
        autoFocus={autoFocus}
        maxLength={AUTHOR_MAX}
        placeholder={t('Your name')}
        aria-label={t('Your name')}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          setSaved(false);
          unsaved.current = next;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(next), NAME_SAVE_MS);
        }}
        onBlur={() => {
          if (unsaved.current !== null) commit(unsaved.current);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full rounded-md border px-2 py-1 text-[12px] text-slate-700 outline-none
                   focus:border-blue-400"
        style={{
          borderColor: 'var(--color-slate-300)',
          // Reserved whether or not the confirmation is showing, so the text
          // never reflows underneath the caret when it appears.
          paddingRight: showSaved ? 54 : undefined,
        }}
      />
      {showSaved && (
        <span
          data-nds-comment-name-saved={saved ? '1' : '0'}
          aria-live="polite"
          className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600
                     pointer-events-none"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: saved ? 1 : 0,
            transition: 'opacity .18s',
          }}
        >
          <span
            aria-hidden="true"
            className="rounded-full"
            style={{ width: 6, height: 6, background: 'currentColor' }}
          />
          {saved ? t('Saved') : ''}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* The floating "Comment" pill over a selection                                */
/* -------------------------------------------------------------------------- */

type Pending = { id: string; rect: DOMRect };

function SelectionBubble({
  editorRef,
  onStart,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onStart: () => void;
}) {
  const t = useT();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const read = () => {
      const host = editorRef.current;
      const sel = window.getSelection();
      if (!host || !sel || sel.isCollapsed || sel.rangeCount === 0) return setPos(null);
      const r = sel.getRangeAt(0);
      if (!host.contains(r.commonAncestorContainer)) return setPos(null);
      if (!r.toString().trim()) return setPos(null);
      const box = r.getBoundingClientRect();
      if (!box.width && !box.height) return setPos(null);

      // Sitting above the selection is the natural place, but a selection on
      // the first line puts the pill straight over the formatting toolbar,
      // where it swallows the click on B / I / colour — the very buttons
      // someone reaches for right after selecting a word. So when it would
      // overlap the toolbar it flips below the selection instead.
      const bar = document
        .querySelector('[data-nds-notes-toolbar]')
        ?.getBoundingClientRect();
      const above = box.top - 34;
      const top = bar && above < bar.bottom + 2 ? box.bottom + 8 : above;
      setPos({
        left: clamp(box.left + box.width / 2 - BUBBLE_W / 2, BUBBLE_W, window.innerWidth),
        top: Math.max(8, top),
      });
    };
    document.addEventListener('selectionchange', read);
    window.addEventListener('scroll', read, true);
    return () => {
      document.removeEventListener('selectionchange', read);
      window.removeEventListener('scroll', read, true);
    };
  }, [editorRef]);

  if (!pos) return null;
  return (
    <button
      type="button"
      data-nds-comment-add="1"
      // Without this the button steals focus on mousedown, the selection
      // collapses, and by the time the click fires there is nothing to anchor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onStart}
      className="flex items-center gap-1.5 bg-slate-800 text-white text-[11px] font-semibold
                 px-2.5 py-1.5 transition hover:bg-slate-700"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 60,
        borderRadius: 7,
        boxShadow: '0 4px 14px rgba(15,23,42,.3)',
      }}
    >
      <BubbleGlyph />
      {t('Add comment')}
    </button>
  );
}

/** Width of the pill, needed before it is rendered so it can be centred. */
const BUBBLE_W = 116;

function BubbleGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M2.5 3.25h11v7.5H7l-3.25 2.6v-2.6H2.5Z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer                                                                    */
/* -------------------------------------------------------------------------- */

function Composer({
  rect,
  onSubmit,
  onCancel,
}: {
  rect: DOMRect;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const asked = useAuthorStore((s) => s.asked);
  const setAuthor = useAuthorStore((s) => s.setAuthor);
  const author = useAuthorStore((s) => s.author);
  const [body, setBody] = useState('');
  const W = 290;

  const send = () => {
    if (!body.trim()) return;
    // Whatever is in the name field at this point is the name from now on,
    // including blank — declining to give one is a legitimate answer.
    if (!asked) setAuthor(author);
    onSubmit(body.trim());
  };

  return (
    <div
      data-nds-comment-composer="1"
      className="bg-white border flex flex-col gap-2 p-2.5"
      style={{
        position: 'fixed',
        left: clamp(rect.left, W, window.innerWidth),
        top: Math.min(rect.bottom + 8, window.innerHeight - 190),
        width: W,
        zIndex: 62,
        borderColor: 'var(--color-slate-300)',
        borderRadius: 9,
        boxShadow: '0 10px 30px rgba(15,23,42,.24)',
      }}
    >
      {!asked && (
        <div className="flex flex-col gap-1">
          <AuthorNameField autoFocus />
          <span className="text-[10px] text-slate-400 leading-snug">
            {t('Names are self-declared, not verified.')}
          </span>
        </div>
      )}
      <textarea
        data-nds-comment-body="1"
        autoFocus={asked}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
        }}
        placeholder={t('Add a comment…')}
        aria-label={t('Add a comment…')}
        rows={3}
        className="w-full resize-none rounded-md border px-2 py-1.5 text-[12px] text-slate-700
                   outline-none focus:border-blue-400"
        style={{ borderColor: 'var(--color-slate-300)' }}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] font-semibold text-slate-500 px-2 py-1 rounded-md
                     hover:bg-slate-100 transition"
        >
          {t('Cancel')}
        </button>
        <button
          type="button"
          data-nds-comment-save="1"
          onClick={send}
          disabled={!body.trim()}
          className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-md transition
                     disabled:opacity-40"
          style={{ background: 'var(--nds-accent, #0078d4)' }}
        >
          {t('Add comment')}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread                                                                      */
/* -------------------------------------------------------------------------- */

function Message({ m }: { m: NoteCommentMessage }) {
  const t = useT();
  return (
    <div className="flex gap-2">
      <Avatar name={m.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <AuthorName name={m.author} />
          <span className="text-[10px] text-slate-400 shrink-0">{ago(m.at, t)}</span>
        </div>
        <p
          className="text-[12px] text-slate-700 leading-snug"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {m.text}
        </p>
      </div>
    </div>
  );
}

function Thread({
  comment,
  rect,
  detached,
  onReply,
  onResolve,
  onDelete,
  onClose,
}: {
  comment: NoteComment;
  rect: DOMRect | null;
  detached: boolean;
  onReply: (body: string) => void;
  onResolve: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [reply, setReply] = useState('');
  const W = 300;

  const send = () => {
    if (!reply.trim()) return;
    onReply(reply.trim());
    setReply('');
  };

  return (
    <div
      data-nds-comment-thread="1"
      className="bg-white border flex flex-col"
      style={{
        position: 'fixed',
        left: rect ? clamp(rect.left, W, window.innerWidth) : window.innerWidth - W - 600,
        top: rect ? Math.min(rect.bottom + 8, window.innerHeight - 240) : 120,
        width: W,
        maxHeight: 320,
        zIndex: 62,
        borderColor: 'var(--color-slate-300)',
        borderRadius: 9,
        boxShadow: '0 10px 30px rgba(15,23,42,.24)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 border-b shrink-0"
        style={{ borderColor: 'var(--color-slate-200)' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex-1 truncate">
          {comment.resolved ? t('Resolved') : t('Comment')}
        </span>
        <button
          type="button"
          data-nds-comment-resolve="1"
          onClick={onResolve}
          className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded
                     hover:bg-slate-100 transition"
        >
          {comment.resolved ? t('Reopen') : t('Resolve')}
        </button>
        <button
          type="button"
          data-nds-comment-delete="1"
          title={t('Delete comment')}
          aria-label={t('Delete comment')}
          onClick={onDelete}
          className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded
                     hover:bg-red-50 hover:text-red-600 transition"
        >
          {t('Delete')}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Close')}
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400
                     hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <svg width={10} height={10} viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-2.5 nds-scroll">
        <blockquote
          className="text-[11px] italic text-slate-500 border-l-2 pl-2"
          style={{ borderColor: detached ? '#f87171' : 'rgba(202,138,4,.6)' }}
        >
          {comment.quote}
        </blockquote>
        {detached && (
          <p className="text-[10px] text-red-500 leading-snug">
            {t('The highlighted text was edited or deleted, so this comment no longer points anywhere.')}
          </p>
        )}
        {comment.messages.map((m, i) => (
          <Message key={i} m={m} />
        ))}
      </div>

      <div className="border-t p-2 shrink-0" style={{ borderColor: 'var(--color-slate-200)' }}>
        <div className="flex items-end gap-1.5">
          <textarea
            data-nds-comment-reply="1"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder={t('Reply…')}
            aria-label={t('Reply…')}
            rows={1}
            className="flex-1 resize-none rounded-md border px-2 py-1 text-[12px] text-slate-700
                       outline-none focus:border-blue-400"
            style={{ borderColor: 'var(--color-slate-300)' }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!reply.trim()}
            className="text-[11px] font-semibold text-white px-2 py-1 rounded-md transition
                       disabled:opacity-40 shrink-0"
            style={{ background: 'var(--nds-accent, #0078d4)' }}
          >
            {t('Send')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Drawer                                                                      */
/* -------------------------------------------------------------------------- */

function Group({
  label,
  items,
  onPick,
}: {
  label: string;
  items: NoteComment[];
  onPick: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label} · {items.length}
      </span>
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className="text-left rounded-md border px-2 py-1.5 hover:bg-slate-50 transition"
          style={{ borderColor: 'var(--color-slate-200)' }}
        >
          <span className="block text-[11px] italic text-slate-500 truncate">“{c.quote}”</span>
          <span className="flex items-center gap-1.5 mt-1 min-w-0">
            <Avatar name={c.messages[0]?.author ?? ''} size={16} />
            <span className="text-[11px] text-slate-700 truncate flex-1">
              {c.messages[0]?.text ?? ''}
            </span>
            {c.messages.length > 1 && (
              <span className="text-[10px] text-slate-400 shrink-0">{c.messages.length}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function Drawer({
  comments,
  detached,
  onPick,
  onClose,
}: {
  comments: NoteComment[];
  detached: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const gone = new Set(detached);
  const open = comments.filter((c) => !c.resolved && !gone.has(c.id));
  const done = comments.filter((c) => c.resolved && !gone.has(c.id));
  const lost = comments.filter((c) => gone.has(c.id));

  return (
    <div
      data-nds-comment-drawer="1"
      className="bg-white border flex flex-col"
      style={{
        position: 'fixed',
        right: 586,
        bottom: 16,
        width: 268,
        maxHeight: 'calc(100vh - 32px)',
        zIndex: 45,
        borderColor: 'var(--color-slate-300)',
        borderRadius: 10,
        boxShadow: '0 10px 30px rgba(15,23,42,.18)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-2.5 h-9 border-b shrink-0"
        style={{ borderColor: 'var(--color-slate-200)' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex-1">
          {t('Comments')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Hide comments')}
          title={t('Hide comments')}
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400
                     hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <svg width={10} height={10} viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-3 nds-scroll">
        {!comments.length && (
          <p className="text-[11px] text-slate-400 leading-snug">
            {t('No comments yet. Select text in the note to comment on it.')}
          </p>
        )}
        <Group label={t('Unresolved')} items={open} onPick={onPick} />
        <Group label={t('Resolved')} items={done} onPick={onPick} />
        <Group label={t('Detached')} items={lost} onPick={onPick} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer chip                                                                 */
/* -------------------------------------------------------------------------- */

export function CommentsChip({ comments }: { comments: NoteComment[] }) {
  const t = useT();
  const drawerOpen = useCommentsUi((s) => s.drawerOpen);
  const setDrawer = useCommentsUi((s) => s.setDrawer);
  const openCount = comments.filter((c) => !c.resolved).length;

  return (
    <button
      type="button"
      data-nds-comment-chip="1"
      onClick={() => setDrawer(!drawerOpen)}
      title={drawerOpen ? t('Hide comments') : t('Show comments')}
      aria-label={drawerOpen ? t('Hide comments') : t('Show comments')}
      aria-pressed={drawerOpen}
      className={`flex items-center gap-1 rounded-md px-1.5 text-[11px] transition ${
        drawerOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100'
      }`}
      style={{ height: 18 }}
    >
      <BubbleGlyph size={11} />
      <span className="tabular-nums">{openCount}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* The overlay that ties it together                                           */
/* -------------------------------------------------------------------------- */

export function NotesComments({
  editorRef,
  notes,
  comments,
  onChange,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** Only used as a change signal: the anchors live in the DOM, not the text. */
  notes: string;
  comments: NoteComment[];
  onChange: (next: NoteComment[]) => void;
}) {
  useHighlightCss();
  const author = useAuthorStore((s) => s.author);
  const drawerOpen = useCommentsUi((s) => s.drawerOpen);
  const setDrawer = useCommentsUi((s) => s.setDrawer);
  const focusId = useCommentsUi((s) => s.focusId);
  const setFocus = useCommentsUi((s) => s.setFocus);
  const detached = useCommentsUi((s) => s.detached);
  const setDetached = useCommentsUi((s) => s.setDetached);

  const [pending, setPending] = useState<Pending | null>(null);
  const [threadRect, setThreadRect] = useState<DOMRect | null>(null);

  // Latest values for the DOM listeners, which are attached once.
  const latest = useRef({ comments, onChange });
  latest.current = { comments, onChange };

  /* --- opening a thread by clicking its highlight ------------------------ */
  useEffect(() => {
    const host = editorRef.current;
    if (!host) return;
    const onClick = (e: MouseEvent) => {
      const hit = (e.target as HTMLElement | null)?.closest?.(`[${ANCHOR_ATTR}]`);
      const id = hit?.getAttribute(ANCHOR_ATTR);
      if (!id) return;
      setThreadRect(hit!.getBoundingClientRect());
      setFocus(id);
      setPending(null);
    };
    host.addEventListener('click', onClick);
    return () => host.removeEventListener('click', onClick);
  }, [editorRef, setFocus]);

  /* --- keep the stored quote in step with edits inside it ---------------- */
  //
  // Typing inside a highlight changes the very text the anchor is found by, so
  // the stored quote has to follow it or the comment would come back detached
  // next time the file is opened. Only a real change is written back, so this
  // is silent for the ordinary case of editing elsewhere in the note.
  useEffect(() => {
    const host = editorRef.current;
    if (!host) return;
    const gone: string[] = [];
    let next = comments;
    for (const c of comments) {
      const fresh = recapture(host, c.id);
      if (!fresh) {
        gone.push(c.id);
        continue;
      }
      if (fresh.quote !== c.quote || fresh.prefix !== c.prefix || fresh.suffix !== c.suffix) {
        next = next.map((x) => (x.id === c.id ? { ...x, ...fresh } : x));
      }
    }
    setDetached(gone);
    if (next !== comments) onChange(next);
    // `comments` is deliberately absent: this reacts to the NOTE changing.
    // Including it would re-enter on the write this effect just made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, editorRef]);

  /* --- resolved highlights are dimmed in place --------------------------- */
  useEffect(() => {
    const host = editorRef.current;
    if (!host) return;
    for (const c of comments) {
      for (const span of anchorsFor(host, c.id)) {
        if (c.resolved) span.setAttribute('data-nds-c-res', '1');
        else span.removeAttribute('data-nds-c-res');
        if (c.id === focusId) span.setAttribute('data-nds-c-on', '1');
        else span.removeAttribute('data-nds-c-on');
      }
    }
  }, [comments, focusId, editorRef, notes]);

  /* --- creating one ------------------------------------------------------ */
  const start = useCallback(() => {
    const host = editorRef.current;
    const sel = window.getSelection();
    if (!host || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!host.contains(range.commonAncestorContainer)) return;
    const id = newCommentId();
    // Wrapped up front so the highlight appears the instant the button is hit;
    // if the composer is dismissed it is unwrapped again, leaving no trace.
    const q = anchorSelection(host, range, id);
    if (!q) return;
    const rect = anchorsFor(host, id)[0]?.getBoundingClientRect();
    if (!rect) return removeAnchors(host, id);
    sel.removeAllRanges();
    setFocus(null);
    setPending({ id, rect });
  }, [editorRef, setFocus]);

  const cancelPending = useCallback(() => {
    const host = editorRef.current;
    if (host && pending) removeAnchors(host, pending.id);
    setPending(null);
  }, [editorRef, pending]);

  const commit = useCallback(
    (body: string) => {
      const host = editorRef.current;
      if (!host || !pending) return;
      const q = recapture(host, pending.id);
      if (!q) return cancelPending();
      const c: NoteComment = {
        id: pending.id,
        ...q,
        resolved: false,
        messages: [{ author, text: body, at: nowIso() }],
      };
      latest.current.onChange([...latest.current.comments, c]);
      setPending(null);
      setThreadRect(pending.rect);
      setFocus(pending.id);
    },
    [author, cancelPending, editorRef, pending, setFocus],
  );

  /* --- mutating one ------------------------------------------------------ */
  const patch = useCallback(
    (id: string, fn: (c: NoteComment) => NoteComment) =>
      onChange(comments.map((c) => (c.id === id ? fn(c) : c))),
    [comments, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      const host = editorRef.current;
      if (host) removeAnchors(host, id);
      onChange(comments.filter((c) => c.id !== id));
      setFocus(null);
    },
    [comments, editorRef, onChange, setFocus],
  );

  const focused = useMemo(() => comments.find((c) => c.id === focusId) ?? null, [comments, focusId]);

  /* --- jumping to one from the drawer ------------------------------------ */
  const pick = useCallback(
    (id: string) => {
      const host = editorRef.current;
      const span = host ? anchorsFor(host, id)[0] : null;
      span?.scrollIntoView({ block: 'center' });
      setThreadRect(span?.getBoundingClientRect() ?? null);
      setFocus(id);
    },
    [editorRef, setFocus],
  );

  return (
    <>
      {!pending && !focused && <SelectionBubble editorRef={editorRef} onStart={start} />}
      {pending && <Composer rect={pending.rect} onSubmit={commit} onCancel={cancelPending} />}
      {focused && (
        <Thread
          comment={focused}
          rect={threadRect}
          detached={detached.includes(focused.id)}
          onReply={(body) =>
            patch(focused.id, (c) => ({
              ...c,
              messages: [...c.messages, { author, text: body, at: nowIso() }],
            }))
          }
          onResolve={() => patch(focused.id, (c) => ({ ...c, resolved: !c.resolved }))}
          onDelete={() => remove(focused.id)}
          onClose={() => setFocus(null)}
        />
      )}
      {drawerOpen && (
        <Drawer
          comments={comments}
          detached={detached}
          onPick={pick}
          onClose={() => setDrawer(false)}
        />
      )}
    </>
  );
}
