// v0.9.41 — the Notes formatting toolbar (presentation only).
//
// The commands live in notes-commands.ts so this file exports nothing but a
// component: mixing exported helpers and components in one module is what
// oxlint's react(only-export-components) rule flags.
//
// Every button runs against the editor's live selection via execCommand, so
// formatting appears in place. There is no preview mode and no second surface
// — clicking B bolds the selected words where they are.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { NOTES_FONT_SIZES, useLayoutStore } from './layout-store';
import {
  bulletList,
  clearFormatting,
  clearTextColor,
  commandActive,
  currentBlock,
  currentTextColor,
  insertLink,
  insertTable,
  NOTE_TEXT_COLORS,
  numberList,
  setHeading,
  setTextColor,
  toggleBold,
  toggleItalic,
  toggleStrike,
} from './notes-commands';

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const BTN =
  'h-7 min-w-7 px-1.5 rounded flex items-center justify-center gap-0.5 shrink-0 ' +
  'text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition ' +
  'border border-transparent focus:outline-none focus-visible:border-slate-400';

const BTN_ON = ' bg-slate-200 text-slate-900 border-slate-300';

function Chevron() {
  return (
    <svg width={8} height={8} viewBox="0 0 8 8" aria-hidden="true" className="shrink-0 opacity-70">
      <path d="M1.5 3 L4 5.5 L6.5 3" fill="none" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A button that opens a small popup, closing on outside click or Escape. */
function MenuButton({
  label, title, testId, children,
}: {
  label: React.ReactNode;
  title: string;
  testId: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  // Menus are left-anchored, which spills off the panel for a control near the
  // right edge — the text-size button overflowed by 69px, and Table cleared it
  // by only 13px, so it would spill too on a narrow panel. Measured on open
  // and flipped to right-anchored rather than hard-coding an alignment per
  // button, so this stays correct as controls are added or the panel narrows.
  const [flip, setFlip] = useState(false);

  useLayoutEffect(() => {
    if (!open) { setFlip(false); return; }
    const el = menu.current, host = wrap.current;
    if (!el || !host) return;
    const bar = host.closest('[data-nds-notes-toolbar="1"]');
    const limit = bar ? bar.getBoundingClientRect().right : window.innerWidth;
    // Runs before paint, so the corrected position is the first one drawn.
    if (el.getBoundingClientRect().right > limit) setFlip(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      // Escape closes, and so does toolbar navigation: the roving tabindex is
      // about to move focus off the button that owns this menu, and a menu
      // left open under a different control is incoherent. The menu has no
      // arrow handling of its own, so nothing is being taken away here.
      if (ev.key === 'Escape' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' ||
          ev.key === 'Home' || ev.key === 'End') setOpen(false);
    };
    // `mousedown`, not `click`: the editor loses focus on mousedown, and a
    // click-based close would fire after the command had already run.
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        data-nds-notes-fmt={testId}
        // The editor must keep its selection, so the button never takes focus.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={BTN}
      >
        {label}
        <Chevron />
      </button>
      {open && (
        <div
          role="menu"
          ref={menu}
          data-nds-notes-menu={testId}
          className={
            'nds-notes-menu absolute z-30 mt-1 min-w-[168px] rounded-md border bg-white shadow-lg py-1 ' +
            (flip ? 'right-0' : 'left-0')
          }
          style={{ borderColor: 'var(--color-slate-200)' }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onSelect, children, testId, active,
}: {
  onSelect: () => void;
  children: React.ReactNode;
  testId?: string;
  /** Marks the value currently in effect, as a Word-style size list does. */
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-checked={active}
      data-nds-notes-menuitem={testId}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={
        'w-full text-left px-3 py-1.5 text-[13px] transition ' +
        'hover:bg-slate-100 hover:text-slate-900 ' +
        (active ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700')
      }
    >
      {children}
    </button>
  );
}

function Cmd({
  title, testId, onRun, children, active,
}: {
  title: string;
  testId: string;
  onRun: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      data-nds-notes-fmt={testId}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRun}
      className={BTN + (active ? BTN_ON : '')}
    >
      {children}
    </button>
  );
}

/** The colour chip in front of a swatch's name. */
function Dot({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-3 h-3 rounded-full shrink-0 border"
      style={{ background: hex, borderColor: 'var(--color-slate-300)' }}
    />
  );
}

/**
 * The name of a swatch, as a literal `t()` key.
 *
 * `PEN_COLORS` carries an English `label` and the menu could render `t(c.label)`
 * — but check-coverage.cjs only sees a `t()` call whose argument is a quoted
 * literal, so those five names would ship untranslated with a green coverage
 * run. Same reason the heading menu below spells its levels out.
 */
function colorName(t: (s: string) => string, key: string): string {
  switch (key) {
    case 'red':
      return t('Red');
    case 'blue':
      return t('Blue');
    case 'green':
      return t('Green');
    case 'orange':
      return t('Orange');
    case 'yellow':
      return t('Yellow');
    default:
      return key;
  }
}

export function NotesToolbar({
  editorRef,
  onCommand,
  selectionTick,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** Serialises the edited DOM back to Markdown after a command runs. */
  onCommand: () => void;
  /** Bumped on every selection change so the pressed states re-read. */
  selectionTick: number;
}) {
  const t = useT();
  const fontSize = useLayoutStore((s) => s.notesFontSize);
  const setFontSize = useLayoutStore((s) => s.setNotesFontSize);

  // role="toolbar" carries a keyboard contract (W3C WAI-ARIA APG, Toolbar
  // pattern): the toolbar is ONE tab stop and arrow keys move between its
  // controls. Declaring the role without that contract is worse than not
  // declaring it — a screen reader announces "toolbar", the user presses an
  // arrow key, and nothing happens. Both button variants render a single
  // <button data-nds-notes-fmt>, so the roving index is managed here from one
  // query rather than threaded through MenuButton and Cmd.
  const bar = useRef<HTMLDivElement | null>(null);
  const [rovingIdx, setRovingIdx] = useState(0);
  const fmtButtons = () =>
    Array.from(bar.current?.querySelectorAll<HTMLButtonElement>('[data-nds-notes-fmt]') ?? []);

  useEffect(() => {
    fmtButtons().forEach((b, i) => { b.tabIndex = i === rovingIdx ? 0 : -1; });
  }, [rovingIdx]);

  const onBarKeyDown = (e: React.KeyboardEvent) => {
    const list = fmtButtons();
    const cur = list.findIndex((b) => b === document.activeElement);
    // -1 means focus is inside an open menu (menu items carry a different
    // attribute), which owns its own keys. Never hijack arrows from it.
    if (cur < 0) return;
    let next: number;
    if (e.key === 'ArrowRight') next = (cur + 1) % list.length;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    else return;
    e.preventDefault();
    setRovingIdx(next);
    list[next].focus();
  };

  // Read once per selection change rather than on every render: queryCommandState
  // is a live DOM read and this component re-renders with the panel.
  const [state, setState] = useState<{
    bold: boolean; italic: boolean; strike: boolean; block: string; color: string | null;
  }>({ bold: false, italic: false, strike: false, block: '', color: null });
  const sync = () =>
    setState({
      bold: commandActive('bold'),
      italic: commandActive('italic'),
      strike: commandActive('strikeThrough'),
      block: currentBlock(),
      color: currentTextColor(),
    });
  useEffect(sync, [selectionTick]);

  // The editor must hold the selection before execCommand runs. Buttons use
  // preventDefault on mousedown to avoid stealing focus, but a command invoked
  // when focus was never in the editor would otherwise apply to nothing.
  const run = (fn: () => void) => () => {
    const host = editorRef.current;
    if (!host) return;
    if (!host.contains(document.getSelection()?.anchorNode ?? null)) host.focus();
    fn();
    onCommand();
    sync();
  };

  const headLabel = /^h[1-6]$/.test(state.block) ? state.block.toUpperCase() : 'H1';
  // Only a colour the menu can actually set is worth reporting. Anything else
  // at the caret is the surface's own ink, and the bar shows that instead —
  // which is also what keeps it readable when the theme flips.
  const inkBar = NOTE_TEXT_COLORS.find((c) => c.hex === state.color)?.hex ?? 'currentColor';

  return (
    <div
      data-nds-notes-toolbar="1"
      ref={bar}
      role="toolbar"
      aria-label={t('Formatting')}
      onKeyDown={onBarKeyDown}
      className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b shrink-0"
      style={{ borderColor: 'var(--color-slate-200)' }}
    >
      <MenuButton
        title={t('Heading 1')}
        testId="heading"
        label={<span className="text-[12px] font-semibold leading-none">{headLabel}</span>}
      >
        {(close) => (
          <>
            <MenuItem testId="h0" onSelect={() => { run(() => setHeading(0))(); close(); }}>
              {t('Normal text')}
            </MenuItem>
            {/* Literal keys, not an interpolated `Heading ${n}` — check-coverage.cjs
                only sees a t() call whose argument is a quoted literal, so an
                interpolated key ships untranslated with a green coverage run.
                (Written the long way round on purpose: spelling the call out
                here would make the scanner harvest THIS comment as a key.) */}
            <MenuItem testId="h1" onSelect={() => { run(() => setHeading(1))(); close(); }}>
              <span className="text-[14px] font-semibold">{t('Heading 1')}</span>
            </MenuItem>
            <MenuItem testId="h2" onSelect={() => { run(() => setHeading(2))(); close(); }}>
              <span className="text-[13px] font-semibold">{t('Heading 2')}</span>
            </MenuItem>
            <MenuItem testId="h3" onSelect={() => { run(() => setHeading(3))(); close(); }}>
              <span className="text-[12px] font-semibold">{t('Heading 3')}</span>
            </MenuItem>
          </>
        )}
      </MenuButton>

      <MenuButton
        title={t('Bulleted list')}
        testId="list"
        label={
          <svg width={15} height={15} viewBox="0 0 16 16" aria-hidden="true" fill="none"
               stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M6 4h7M6 8h7M6 12h7" />
            <circle cx="3" cy="4" r="1" fill="currentColor" stroke="none" />
            <circle cx="3" cy="8" r="1" fill="currentColor" stroke="none" />
            <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
          </svg>
        }
      >
        {(close) => (
          <>
            <MenuItem testId="bullet" onSelect={() => { run(bulletList)(); close(); }}>
              {t('Bulleted list')}
            </MenuItem>
            <MenuItem testId="number" onSelect={() => { run(numberList)(); close(); }}>
              {t('Numbered list')}
            </MenuItem>
          </>
        )}
      </MenuButton>

      <span className="w-px h-5 mx-0.5 shrink-0" style={{ background: 'var(--color-slate-200)' }} />

      <Cmd title={t('Bold')} testId="bold" active={state.bold} onRun={run(toggleBold)}>
        <span className="text-[13px] font-bold leading-none">B</span>
      </Cmd>
      <Cmd title={t('Italic')} testId="italic" active={state.italic} onRun={run(toggleItalic)}>
        <span className="text-[13px] italic font-serif leading-none">I</span>
      </Cmd>
      <Cmd title={t('Strikethrough')} testId="strike" active={state.strike} onRun={run(toggleStrike)}>
        <span className="text-[13px] line-through leading-none">S</span>
      </Cmd>
      <Cmd
        title={t('Link')}
        testId="link"
        onRun={run(() => {
          const url = window.prompt(t('Link'), 'https://');
          if (url) insertLink(url);
        })}
      >
        <svg width={15} height={15} viewBox="0 0 16 16" aria-hidden="true" fill="none"
             stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 9.5a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-1 1" />
          <path d="M9.5 6.5a2.6 2.6 0 0 0-3.7 0L3.6 8.7a2.6 2.6 0 0 0 3.7 3.7l1-1" />
        </svg>
      </Cmd>

      <MenuButton
        title={t('Table')}
        testId="table"
        label={
          <svg width={15} height={15} viewBox="0 0 16 16" aria-hidden="true" fill="none"
               stroke="currentColor" strokeWidth="1.3">
            <rect x="2.25" y="3.25" width="11.5" height="9.5" rx="1" />
            <path d="M2.25 6.5h11.5M6.5 6.5v6.25M10 6.5v6.25" />
          </svg>
        }
      >
        {(close) => (
          <>
            {[
              [2, 2],
              [3, 2],
              [3, 3],
              [4, 3],
            ].map(([c, r]) => (
              <MenuItem
                key={`${c}x${r}`}
                testId={`table-${c}x${r}`}
                onSelect={() => { run(() => insertTable(c, r))(); close(); }}
              >
                {c} × {r}
              </MenuItem>
            ))}
          </>
        )}
      </MenuButton>

      {/* Unlike the text SIZE at the far end of the bar, this one DOES edit the
          document — a colour is what the note means, not how this window shows
          it — so it belongs in this group, with the commands that format the
          selection, and not behind the separator with the view control. */}
      <MenuButton
        title={t('Text colour')}
        testId="color"
        label={
          <span className="flex flex-col items-center justify-center gap-[2px] leading-none">
            <span className="text-[12px] font-semibold leading-none">A</span>
            <span
              data-nds-notes-colorbar={state.color ?? 'default'}
              className="block w-3.5 h-[3px] rounded-[1px]"
              style={{ background: inkBar }}
            />
          </span>
        }
      >
        {(close) => (
          <>
            <MenuItem
              testId="color-default"
              active={!NOTE_TEXT_COLORS.some((c) => c.hex === state.color)}
              onSelect={() => { run(() => clearTextColor(editorRef.current))(); close(); }}
            >
              <span className="flex items-center gap-2">
                <Dot hex="currentColor" />
                {t('Default colour')}
              </span>
            </MenuItem>
            {NOTE_TEXT_COLORS.map((c) => (
              <MenuItem
                key={c.key}
                testId={`color-${c.key}`}
                active={c.hex === state.color}
                onSelect={() => { run(() => setTextColor(c.hex))(); close(); }}
              >
                <span className="flex items-center gap-2">
                  <Dot hex={c.hex} />
                  {colorName(t, c.key)}
                </span>
              </MenuItem>
            ))}
          </>
        )}
      </MenuButton>

      <span className="w-px h-5 mx-0.5 shrink-0" style={{ background: 'var(--color-slate-200)' }} />

      <Cmd title={t('Clear formatting')} testId="clear" onRun={run(clearFormatting)}>
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" fill="none"
             stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 12.5 5.4 4.2h1.3l2.9 8.3" />
            <path d="M3.7 9.8h4.6" />
            <path d="M10.8 6.4 14.6 12" />
            <path d="M14.6 6.4 10.8 12" />
        </svg>
      </Cmd>

      <span className="w-px h-5 mx-0.5 shrink-0" style={{ background: 'var(--color-slate-200)' }} />

      {/* A VIEW control, not a document command — it scales the whole notes
          surface and writes nothing into the Markdown. It sits behind its own
          separator, after every control that does edit the note, so the
          grouping never implies it formats the selection. */}
      <MenuButton
        title={t('Text size')}
        testId="fontsize"
        label={
          <span className="text-[12px] font-semibold leading-none tabular-nums">{fontSize}</span>
        }
      >
        {(close) => (
          <>
            {NOTES_FONT_SIZES.map((px) => (
              <MenuItem
                key={px}
                testId={`size-${px}`}
                active={px === fontSize}
                onSelect={() => { setFontSize(px); close(); }}
              >
                <span className="tabular-nums">{px}</span>
              </MenuItem>
            ))}
          </>
        )}
      </MenuButton>
    </div>
  );
}
