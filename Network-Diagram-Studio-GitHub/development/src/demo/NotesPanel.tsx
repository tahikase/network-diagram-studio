// v0.9.35 — the Notes panel: a per-tab notebook page floating over the
// bottom-right corner of the canvas.
//
// WHY THIS IS A PAGE PER TAB AND NOT A NOTEBOOK TREE
//
// The obvious reading of "like OneNote" is Notebook → Section → Page. This app
// already has a tab strip, and every tab is already a separate diagram with
// its own shapes, strokes and undo stack. Adding a notebook tree on top would
// give the user TWO hierarchies to navigate and keep in sync, and the pairing
// that actually matters — "these notes belong to THIS diagram" — would become
// something they had to maintain by hand.
//
// So a tab IS the page. The notes travel with the diagram they describe, they
// save into the same .json, and they cannot drift apart from it. The tab strip
// is the section list that was going to be built anyway.
//
// THE RISK THIS COMPONENT HAD TO AVOID
//
// Mounting an aside shrinks <main>, which shrinks the React Flow viewport.
// v0.9.34 was spent fixing a bug where a diagram's geometry changed on load;
// a panel that triggered fitView or a relayout on open would be the same class
// of defect with a new trigger. This component therefore touches NOTHING but
// tab.notes — no fitView, no relayout, no diagram-store write at all — and
// test-notespanel.cjs asserts zero position/size delta across a toggle.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTabsStore, type TabsState } from './tabs-store';
import { useLayoutStore } from './layout-store';
import { useT } from '../i18n/useT';
import { NOTES_COMMENTS, NOTES_IMAGES } from '../env';
import { NotesToolbar } from './NotesToolbar';
import { NotesEditable } from './NotesEditable';
import { NotesComments, CommentsChip } from './NotesComments';
import { applyAnchors, useCommentsUi, type NoteComment } from './notes-comments';
import { domToMarkdown } from './notes-dom';
import { useImagesUi } from './notes-images';
import { collectOrphans } from './notes-image-insert';
import { runtimeExtensions } from '../runtime/extensions';

/** The floating "NOTES" tab shown when notes are closed. */

// Derived inline rather than through the store's own `activeTab()` method:
// a zustand selector must be a pure function of state, and calling a store
// METHOD from inside one reads the live store rather than the snapshot React
// is rendering against.
const notesOf = (s: TabsState) => s.tabs.find((t) => t.id === s.activeTabId)?.notes ?? '';
const nameOf = (s: TabsState) => s.tabs.find((t) => t.id === s.activeTabId)?.name ?? '';
const idOf = (s: TabsState) => s.activeTabId ?? '';

// One shared instance: a selector that built `[]` on the fly would return a
// new identity every time the store ticked and re-render on every keystroke.
const NO_COMMENTS: NoteComment[] = [];
const commentsOf = (s: TabsState) =>
  s.tabs.find((t) => t.id === s.activeTabId)?.comments ?? NO_COMMENTS;

/** Ruled-page glyph, shared by the closed tab and nothing else so far. */
function NotesGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 1.75 h6.25 L12.5 4.5 v9.75 h-9 Z" />
      <path d="M9.5 1.75 v3 h3" />
      <path d="M5.5 8 h5 M5.5 10.5 h5" />
    </svg>
  );
}

export function NotesRail() {
  const setNotesOpen = useLayoutStore((s) => s.setNotesOpen);
  const t = useT();

  // Read only the LENGTH, never the string: a selector returning the note
  // body would re-render this tab on every keystroke once the panel is open.
  const hasNotes = useTabsStore((s) => notesOf(s).trim().length > 0);

  return (
    <button
      type="button"
      data-nds-notes-rail="1"
      data-nds-notes-open="1"
      data-nds-notes-tab="1"
      title={t('Show notes')}
      aria-label={t('Notes')}
      onClick={() => setNotesOpen(true)}
      className="nds-canvas-chrome flex items-center border text-blue-700 transition"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 45,
        height: 44,
        paddingLeft: 16,
        paddingRight: 16,
        gap: 10,
        borderRadius: 10,
      }}
    >
      <NotesGlyph size={20} />
      <span
        data-nds-notes-tab-label="1"
        className="font-bold uppercase tracking-widest select-none"
        style={{ fontSize: 13 }}
      >
        {t('Notes')}
      </span>
      {/* A dot, not a count — the point is only "there is something here". */}
      {hasNotes && (
        <span
          data-nds-notes-dot="1"
          className="rounded-full"
          style={{ width: 8, height: 8, background: 'var(--nds-accent, #0078d4)' }}
        />
      )}
    </button>
  );
}

/**
 * The notes editing surface.
 *
 * v0.9.41 replaced the textarea with a contentEditable div. The stored value is
 * still Markdown — see notes-dom.ts — so the file format is unchanged and every
 * note saved since v0.9.35 still loads. What changed is only that the markers
 * are now rendered as formatting instead of being shown as literal characters.
 */

/** localStorage key for the panel height. Height, not width — this panel is
 *  anchored to the bottom-right corner and grows UPWARDS. */
const NOTES_HEIGHT_KEY = 'nds.notesHeight';
const NOTES_DEFAULT_H = 500;
const NOTES_MIN_H = 260;
/** Keep the top edge clear of the window edge at full stretch. */
const NOTES_TOP_GAP = 40;

function readStoredHeight(): number {
  try {
    const raw = window.localStorage.getItem(NOTES_HEIGHT_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n >= NOTES_MIN_H ? n : NOTES_DEFAULT_H;
  } catch {
    // Private mode / file:// with storage disabled — the default is fine.
    return NOTES_DEFAULT_H;
  }
}

function NotesEditor() {
  const notesLayout = runtimeExtensions().ndsNotesLayout;
  const t = useT();
  const setNotesOpen = useLayoutStore((s) => s.setNotesOpen);
  const setActiveTabNotes = useTabsStore((s) => s.setActiveTabNotes);
  const notes = useTabsStore(notesOf);
  const tabName = useTabsStore(nameOf);
  const tabId = useTabsStore(idOf);
  const comments = useTabsStore(commentsOf);
  const setActiveTabComments = useTabsStore((s) => s.setActiveTabComments);
  const imagesRev = useImagesUi((s) => s.rev);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Bytes for images the note no longer mentions are dropped once editing
  // settles, not on every keystroke — deleting a picture and hitting undo has
  // to give it back, and a paused user is the earliest safe moment.
  useEffect(() => {
    if (!NOTES_IMAGES) return;
    const id = window.setTimeout(collectOrphans, 1500);
    return () => window.clearTimeout(id);
  }, [notes]);

  // Comment highlights live in the DOM, not in the Markdown, so they are lost
  // whenever the editor rebuilds its subtree and have to be put back. This is
  // the only hook that knows where they go.
  const decorate = useCallback(
    (host: HTMLElement) => {
      if (!NOTES_COMMENTS) return;
      useCommentsUi.getState().setDetached(applyAnchors(host, comments));
    },
    [comments],
  );

  // A counter, not the selection itself: the toolbar only needs to know that
  // something moved, and storing a Range would keep a detached DOM node alive.
  // Stable identity, so the editor's selectionchange listener is not torn down
  // and re-added on every tick.
  const [selectionTick, setSelectionTick] = useState(0);
  const bumpSelection = useCallback(() => setSelectionTick((n) => n + 1), []);

  const [height, setHeight] = useState(readStoredHeight);

  /**
   * Drag the top edge UP to make the panel taller.
   *
   * Listeners go on `window`, not the handle: the pointer routinely leaves a
   * 12px grip mid-drag, and a handle-local listener would drop the gesture the
   * moment it did. `userSelect: none` on <body> stops the drag from painting a
   * text selection across the notes underneath.
   */
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = height;
    let last = h0;
    const move = (ev: PointerEvent) => {
      // Pointer moving up means a smaller clientY, hence `y0 - ev.clientY`.
      last = Math.min(
        Math.max(h0 + (y0 - ev.clientY), NOTES_MIN_H),
        window.innerHeight - NOTES_TOP_GAP,
      );
      setHeight(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      try {
        window.localStorage.setItem(NOTES_HEIGHT_KEY, String(Math.round(last)));
      } catch {
        // Storage unavailable — the size still applies for this session.
      }
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const emit = () => {
    const host = editorRef.current;
    if (host) setActiveTabNotes(domToMarkdown(host));
  };

  const stats = useMemo(() => {
    const trimmed = notes.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = notes ? notes.split('\n').length : 0;
    return { words, lines };
  }, [notes]);

  return (
    <div
      className="bg-white border flex flex-col"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 560,
        height,
        maxHeight: 'calc(100vh - 32px)',
        zIndex: 45,
        borderColor: 'var(--color-slate-300)',
        borderRadius: 10,
        boxShadow: '0 10px 30px rgba(15,23,42,.22)',
        overflow: 'hidden',
      }}
      data-nds-notes-panel="1"
      id="nds-nonprod-notes"
    >
      {notesLayout && <div {...notesLayout.widthHandleProps()}><span aria-hidden="true" /></div>}
      <div
        data-nds-notes-resize="1"
        role="separator"
        aria-orientation="horizontal"
        title={t('Drag to resize notes')}
        aria-label={t('Drag to resize notes')}
        onPointerDown={startResize}
        {...notesLayout?.heightHandleProps(setHeight, height)}
        className="shrink-0 flex items-center justify-center"
        style={{ height: 12, cursor: 'ns-resize', touchAction: 'none' }}
      >
        <div
          style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--color-slate-300)' }}
        />
      </div>

      <div
        className="flex items-center gap-2 px-3 h-11 border-b shrink-0"
        style={{ borderColor: 'var(--color-slate-200)' }}
      >
        <button
          type="button"
          title={t('Hide notes')}
          aria-label={t('Hide notes')}
          data-nds-notes-close="1"
          onClick={() => setNotesOpen(false)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500
                     hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
        >
          {/* A close X, not a chevron — this panel floats, it does not dock. */}
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M3.5 3.5 L10.5 10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <path
              d="M10.5 3.5 L3.5 10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 leading-tight">
            {t('Notes')}
          </span>
          {/* The tab name is the page title. Showing it here is what makes
              "these notes belong to THIS diagram" visible rather than implied. */}
          <span className="text-sm font-semibold text-slate-800 truncate leading-tight">
            {tabName}
          </span>
        </div>
      </div>

      <NotesToolbar
        editorRef={editorRef}
        onCommand={emit}
        selectionTick={selectionTick}
      />

      <NotesEditable
        notes={notes}
        docKey={tabId}
        onChange={setActiveTabNotes}
        editorRef={editorRef}
        onSelectionChange={bumpSelection}
        placeholder={t('Type notes about this diagram.')}
        ariaLabel={t('Notes')}
        decorate={NOTES_COMMENTS ? decorate : undefined}
        rev={NOTES_IMAGES ? imagesRev : undefined}
      />
      <div
        className="border-t px-3 py-2 shrink-0 flex items-center gap-2"
        style={{ borderColor: 'var(--color-slate-200)' }}
      >
        <span className="text-[11px] text-slate-400 tabular-nums">
          {stats.words} · {stats.lines}
        </span>
        {NOTES_COMMENTS && <CommentsChip comments={comments} />}
      </div>
      {/* Rendered last so its effects run after the editor has rebuilt, and
          outside the panel's flow — every piece of it is position: fixed. */}
      {NOTES_COMMENTS && (
        <NotesComments
          editorRef={editorRef}
          notes={notes}
          comments={comments}
          onChange={setActiveTabComments}
        />
      )}
    </div>
  );
}

/**
 * Notes surface, anchored to the BOTTOM-RIGHT corner: a compact "NOTES" tab
 * when closed, a floating card when open.
 *
 * Both states are `position: fixed`, so <main> keeps its full width and the
 * React Flow viewport never resizes when notes are toggled — which is the
 * invariant test-notespanel.cjs guards (zero position/size delta across a
 * toggle). The card is 560px wide and grows upward from the corner, leaving
 * the tab strip along the bottom-left and the annotation toolbar at the top
 * of the canvas untouched.
 */
export function NotesPanel() {
  const open = useLayoutStore((s) => s.notesOpen);
  return open ? <NotesEditor /> : <NotesRail />;
}
