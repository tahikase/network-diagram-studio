import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useThemeStore, type ThemePref } from '../theme/theme-store';
import { useI18nStore, LANGUAGES } from '../i18n/i18n-store';
import { useT } from '../i18n/useT';
import { NOTES_COMMENTS, NOTES_IMAGES } from '../env';
import { AuthorNameField } from '../demo/NotesComments';
import { APP_VERSION } from '../version';
import { runtimeExtensions } from '../runtime/extensions';
import { useUpdatesStore } from '../updates/updates-store';

function GearIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--nds-accent-text)] shrink-0" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ContrastIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * v0.9.61 — one header for every section.
 *
 * Appearance and Feedback used to render a bare uppercase <div> while the
 * other three rendered an icon beside the label, so the panel read as two
 * different designs stacked on top of each other. Routing all five through
 * one component is the only way that stays true as sections are added.
 */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1.5 mb-2 text-slate-500">
      <span className="shrink-0">{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wide">{t(label)}</span>
    </div>
  );
}

/** Shared card chrome: every clickable row in the panel is the same box. */
const CARD_BASE =
  'rounded-lg border transition text-left';
const CARD_IDLE = 'border-slate-200 bg-white hover:bg-slate-50';
const CARD_ACTIVE = 'border-[color:var(--nds-accent-text)] bg-blue-50';

/**
 * The in-app manual.
 *
 * v0.9.59 — every one of these questions had been asked in person at least
 * once ("how do two of us work on the same diagram?", "what's the difference
 * between PNG and SVG?"). The app is a single offline HTML file, so there is
 * nowhere else to put the answer: no docs site, no wiki, no README the user
 * will ever see. It lives in Settings because that is the one menu people
 * already open when they are looking for something they cannot find.
 *
 * Grouped, and collapsed one-at-a-time, so the panel stays scannable instead
 * of becoming a wall of prose. Every entry describes behaviour that is
 * actually implemented — check the code before adding a line here.
 */
const GUIDE_GROUPS: Array<{
  label: string;
  items: Array<{ term: string; translateTerm: boolean; desc: string }>;
}> = [
  {
    label: 'Saving and sharing',
    items: [
      {
        term: 'Save JSON',
        translateTerm: true,
        desc: 'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.',
      },
      {
        term: 'Load JSON',
        translateTerm: true,
        desc: 'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.',
      },
      {
        term: 'Work with a colleague',
        translateTerm: true,
        desc: 'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.',
      },
    ],
  },
  {
    label: 'Exporting a picture',
    items: [
      {
        term: 'PNG',
        translateTerm: false,
        desc: 'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.',
      },
      {
        term: 'SVG',
        translateTerm: false,
        desc: 'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.',
      },
    ],
  },
  {
    label: 'Working faster',
    items: [
      {
        term: 'Palette',
        translateTerm: true,
        desc: 'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.',
      },
      {
        term: 'Favorites',
        translateTerm: true,
        desc: 'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.',
      },
      {
        term: 'Connections',
        translateTerm: true,
        desc: 'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.',
      },
      {
        term: 'Tabs',
        translateTerm: true,
        desc: 'Each tab holds its own diagram, shapes and notes. Drag tabs to reorder, or focus a tab and use Alt+Left/Right. The browser remembers the order. Save JSON writes only the current tab.',
      },
    ],
  },
  {
    label: 'Working in the Notes',
    items: [
      {
        term: 'Comments',
        translateTerm: true,
        desc: 'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.',
      },
      // Screenshots are demo-only. Documenting them unconditionally would
      // promise production a button it does not have.
      ...(NOTES_IMAGES
        ? [
            {
              term: 'Screenshot',
              translateTerm: true,
              desc: 'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.',
            },
            {
              term: 'Annotating a screenshot',
              translateTerm: true,
              desc: 'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.',
            },
            {
              term: 'Hiding something sensitive',
              translateTerm: true,
              desc: 'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.',
            },
          ]
        : []),
    ],
  },
];

/**
 * A collapsible sub-section inside the Settings panel.
 *
 * v0.9.60 — used by both the Guide and the keyboard-shortcut reference.
 * Between them they are ~40 rows; expanded at once they buried Feedback so
 * far down the scroll that people stopped finding it. Collapsed, Settings
 * fits on one screen and each list is one click away.
 */
function Disclosure({
  label,
  count,
  open,
  onToggle,
  groupAttr,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  groupAttr: Record<string, string>;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className={`${CARD_BASE} overflow-hidden ${open ? 'border-slate-300' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        {...groupAttr}
        className={`w-full flex items-center gap-2 px-2.5 py-2 text-left transition
          ${open ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
      >
        <span className="flex-1 text-[12px] font-semibold text-slate-800">{t(label)}</span>
        <span className="text-[10px] text-slate-400 tabular-nums">{count}</span>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-0.5 border-t border-slate-200 bg-slate-50">
          {children}
        </div>
      )}
    </div>
  );
}

function GuideGroup({
  label,
  items,
  open,
  onToggle,
}: {
  label: string;
  items: Array<{ term: string; translateTerm: boolean; desc: string }>;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <Disclosure
      label={label}
      count={items.length}
      open={open}
      onToggle={onToggle}
      groupAttr={{ 'data-nds-guide-group': label }}
    >
      <div className="flex flex-col gap-2.5">
        {items.map((it) => (
          <div key={it.term} data-nds-guide-item={it.term} className="pt-1.5">
            <div className="text-[12px] font-semibold text-slate-800">
              {it.translateTerm ? t(it.term) : it.term}
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{t(it.desc)}</p>
          </div>
        ))}
      </div>
    </Disclosure>
  );
}

// Keep the original Microsoft Forms destination in every build. Open it
// separately so feedback never replaces an in-progress diagram.
const FEEDBACK_URL = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR2VJmW1D0XZAg4tjAfjgezRUNE45SUdSRFFJS0VRWjQyWjk5RzAxMFBDRy4u';

/**
 * v0.9.50 — the keyboard-shortcut reference.
 *
 * Every one of these already worked; none of them was written down anywhere
 * a user could see. The tool letters in particular were reachable only by
 * hovering a toolbar button and reading the "(V)" in its tooltip, which
 * nobody does, so the fastest way to work in the app was also the most
 * hidden. Settings is where a reference belongs: it is the one panel you
 * open when you are looking for something rather than doing something.
 *
 * The `keys` column is deliberately NOT translated. Ctrl / Shift / Alt /
 * Esc / Del are printed on the physical keyboard in every locale this app
 * ships in, so translating them would make the chip disagree with the key
 * the user is looking at. Only the descriptions go through t().
 *
 * Field naming matters: check-coverage.cjs harvests every `label` property
 * out of this file, so both the group headings and the row descriptions
 * must use that property name or they ship untranslated behind a green
 * coverage run.
 */
const SHORTCUT_GROUPS: Array<{
  label: string;
  rows: Array<{ keys: string; label: string }>;
}> = [
  {
    label: 'Tools',
    rows: [
      { keys: 'C', label: 'Move / select' },
      { keys: 'V', label: 'Pan canvas' },
      { keys: 'P', label: 'Pencil' },
      { keys: 'E', label: 'Eraser' },
      { keys: 'A R O', label: 'Arrow, rectangle, ellipse' },
    ],
  },
  {
    label: 'Editing',
    rows: [
      { keys: 'Ctrl+Z', label: 'Undo' },
      { keys: 'Ctrl+Y', label: 'Redo' },
      { keys: 'Ctrl+C', label: 'Copy the selection' },
      { keys: 'Ctrl+V', label: 'Paste' },
      { keys: 'Ctrl+D', label: 'Duplicate the selected resource' },
      { keys: 'Del', label: 'Delete the selection' },
    ],
  },
  {
    label: 'Tabs',
    rows: [
      { keys: 'Alt+Left/Right', label: 'Reorder the focused tab' },
      { keys: 'Left/Right Home End', label: 'Navigate tabs' },
      { keys: 'Enter/Space', label: 'Activate the focused tab' },
      { keys: 'Esc', label: 'Cancel tab reordering' },
    ],
  },
  {
    label: 'Selection',
    rows: [
      { keys: 'Ctrl+A', label: 'Select every shape' },
      { keys: 'Shift+click', label: 'Add to the selection' },
      { keys: 'Drag', label: 'Rubber-band select on empty canvas' },
      { keys: 'Ctrl+drag', label: 'Move a container without its contents' },
      { keys: 'Double-click', label: 'Edit a shape’s text' },
      { keys: 'Esc', label: 'Clear the shape selection' },
    ],
  },
  // Demo-only, and deliberately its own group: these letters apply inside the
  // screenshot editor and nowhere else. H is Hand on the canvas but Highlight
  // in the editor, so listing them together would be wrong rather than terse.
  ...(NOTES_IMAGES
    ? [
        {
          label: 'Screenshot editor',
          rows: [
            { keys: 'V A R O C', label: 'Select, arrow, box, ellipse, callout' },
            { keys: 'T N H', label: 'Text, step number, highlighter' },
            { keys: 'B X', label: 'Pixelate, crop' },
            { keys: 'Shift+drag', label: '45° arrows, circles and squares' },
            { keys: 'Del', label: 'Delete the selected annotation' },
            { keys: 'Esc', label: 'Close the editor without inserting' },
          ],
        },
      ]
    : []),
];

function Kbd({ children }: { children: string }) {
  return (
    <span className="flex flex-wrap gap-0.5 shrink-0">
      {children.split(' ').map((k) => (
        <kbd
          key={k}
          className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-700
                     text-[10px] font-semibold leading-none font-mono whitespace-nowrap"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

const THEME_OPTIONS: Array<{
  value: ThemePref;
  label: string;
  hint: string;
  icon: React.ReactNode;
}> = [
  { value: 'light', label: 'Light', hint: 'The classic look', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', hint: 'Easier on the eyes at night', icon: <MoonIcon /> },
];

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const pref = useThemeStore((s) => s.pref);
  const setPref = useThemeStore((s) => s.setPref);
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const t = useT();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // One guide group open at a time — the menu is already a long scroll and
  // three expanded groups would bury the Feedback link below the fold.
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [openShortcuts, setOpenShortcuts] = useState<string | null>(null);
  const updatesUnread = useUpdatesStore(state => state.unread);
  const showUpdates = useUpdatesStore(state => state.show);

  useLayoutEffect(() => {
    if (!open) return;
    const canvas = document.querySelector<HTMLElement>('[data-nds-fullscreen-target]');
    const tabs = canvas?.querySelector<HTMLElement>('[data-nds-tabbar]');
    const panel = panelRef.current;
    const anchor = wrapRef.current;
    if (!canvas || !panel || !anchor) throw new Error('The Settings drawing area is unavailable.');
    let frame = 0;
    const viewport = window.visualViewport;
    const place = () => {
      frame = 0;
      const surface = canvas.getBoundingClientRect();
      const strip = tabs?.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;
      const viewLeft = viewport?.offsetLeft ?? 0;
      const viewTop = viewport?.offsetTop ?? 0;
      const gap = 8;
      const left = Math.max(surface.left, viewLeft) + gap;
      const right = Math.min(surface.right - gap, width - gap,
        viewLeft + (viewport?.width ?? width) - gap, anchor.getBoundingClientRect().right);
      const top = Math.max(surface.top, viewTop) + gap;
      // The tab strip overlays the drawing surface; its actual top is the lower limit.
      const bottom = Math.min(surface.bottom, strip?.height ? strip.top : surface.bottom,
        height, viewTop + (viewport?.height ?? height)) - gap;
      const placement = {
        top, right: width - right,
        'max-width': Math.max(0, right - left),
        'max-height': Math.max(0, bottom - top),
      };
      for (const [property, value] of Object.entries(placement)) {
        const pixels = `${value}px`;
        if (panel.style.getPropertyValue(property) !== pixels) panel.style.setProperty(property, pixels);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    if (tabs) observer.observe(tabs);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    document.addEventListener('fullscreenchange', schedule);
    place();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      document.removeEventListener('fullscreenchange', schedule);
    };
  }, [open]);

  // Close on outside click or Escape — standard popover behaviour.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('Settings')}
        aria-label={t('Settings')}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-nds-settings-button="1"
        className={`h-8 w-8 grid place-items-center rounded-md border transition
          ${open
            ? 'text-white border-transparent bg-[color:var(--nds-accent)]'
            : 'text-slate-600 border-slate-300 bg-white hover:bg-slate-100 hover:text-slate-900'}`}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('Settings')}
          data-nds-settings-panel="1"
          className="fixed right-0 z-50 w-[320px] rounded-xl border border-slate-200
                     bg-white shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="text-[13px] font-bold text-slate-900">{t('Settings')}</div>
          </div>

          {/* The shortcut reference makes this panel taller than a short
              browser window, so the body scrolls rather than being clipped
              by the rounded container. */}
          <div className="p-3.5 min-h-0 flex-1 overflow-y-auto nds-scroll">
            <button type="button" className="nds-updates-settings-button mb-4"
              data-nds-updates-open="settings" aria-haspopup="dialog" aria-controls="nds-update-history"
              onClick={() => {
                const trigger = wrapRef.current?.querySelector<HTMLButtonElement>('[data-nds-settings-button]');
                if (!trigger) throw new Error('Settings return-focus button is unavailable.');
                setOpen(false);
                showUpdates(trigger);
              }}>
              <TagIcon />
              <span className="flex-1 min-w-0">
                <strong>{t("What's new")}</strong>
                <small>{t('Release history and before/after images')}</small>
              </span>
              {updatesUnread && <span className="nds-updates-new" data-nds-updates-unread>{t('New updates')}</span>}
            </button>
            <SectionHeader icon={<ContrastIcon />} label="Appearance" />
            <div className="flex flex-col gap-1" role="radiogroup" aria-label={t('Colour theme')}>
              {THEME_OPTIONS.map((opt) => {
                const active = pref === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPref(opt.value)}
                    data-nds-theme-option={opt.value}
                    className={`flex items-center gap-2.5 px-2.5 py-2 ${CARD_BASE}
                      ${active ? CARD_ACTIVE : CARD_IDLE}`}
                  >
                    <span className={active ? 'text-[color:var(--nds-accent-text)]' : 'text-slate-500'}>
                      {opt.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-semibold text-slate-800">
                        {t(opt.label)}
                      </span>
                      <span className="block mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        {t(opt.hint)}
                      </span>
                    </span>
                    {active && <CheckIcon />}
                  </button>
                );
              })}
            </div>

            {NOTES_COMMENTS && (
              <div className="mt-4 pt-3.5 border-t border-slate-200">
                <SectionHeader icon={<PersonIcon />} label="Your name" />
                <AuthorNameField showSaved />
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {t('Shown on comments you add to notes. Self-declared, not verified.')}
                </p>
              </div>
            )}

            {/* Language. Eight options is too many for the full-width rows the
                theme switch uses, so they go in a 2-column grid of chips
                showing each language's OWN name — that's what someone scans
                for. The English name rides in the tooltip. */}
            <div className="mt-4 pt-3.5 border-t border-slate-200">
              <SectionHeader icon={<GlobeIcon />} label="Language" />
              <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={t('Language')}>
                {LANGUAGES.map((l) => {
                  const active = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={l.english}
                      title={l.english}
                      lang={l.code}
                      onClick={() => setLang(l.code)}
                      data-nds-lang-option={l.code}
                      className={`flex items-center gap-1.5 px-2 py-1.5 ${CARD_BASE}
                        ${active ? CARD_ACTIVE : CARD_IDLE}`}
                    >
                      <span className="flex-1 min-w-0 truncate text-[12px] font-semibold text-slate-800">
                        {l.label}
                      </span>
                      {active && <CheckIcon />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {t('Menus and buttons only — diagram content stays as you wrote it.')}
              </p>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-200">
              <SectionHeader icon={<KeyboardIcon />} label="Keyboard shortcuts" />
              <div data-nds-shortcuts="1" className="flex flex-col gap-1.5">
                {(runtimeExtensions().ndsSettingsHelp?.shortcuts(SHORTCUT_GROUPS) ?? SHORTCUT_GROUPS).map((group) => (
                  <Disclosure
                    key={group.label}
                    label={group.label}
                    count={group.rows.length}
                    open={openShortcuts === group.label}
                    onToggle={() =>
                      setOpenShortcuts((cur) => (cur === group.label ? null : group.label))
                    }
                    groupAttr={{ 'data-nds-shortcut-group': group.label }}
                  >
                    <div className="flex flex-col gap-0.5 pt-1.5">
                      {group.rows.map((row) => (
                        <div
                          key={row.keys}
                          data-nds-shortcut={row.keys}
                          className="flex items-start justify-between gap-2 py-0.5"
                        >
                          <span className="text-[12px] text-slate-700 leading-snug">
                            {t(row.label)}
                          </span>
                          <Kbd>{row.keys}</Kbd>
                        </div>
                      ))}
                    </div>
                  </Disclosure>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {t(runtimeExtensions().ndsSettingsHelp?.platformNote() ?? 'Windows keys. On a Mac, use Command in place of Ctrl.')}
              </p>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-200" data-nds-guide="1">
              <SectionHeader icon={<BookIcon />} label="Guide" />
              <div className="flex flex-col gap-1.5">
                {(runtimeExtensions().ndsSettingsHelp?.guides() ?? GUIDE_GROUPS).map((g) => (
                  <GuideGroup
                    key={g.label}
                    label={g.label}
                    items={g.items}
                    open={openGuide === g.label}
                    onToggle={() => setOpenGuide((cur) => (cur === g.label ? null : g.label))}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-200">
              <SectionHeader icon={<ChatIcon />} label="Feedback" />
              <a
                href={FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                data-nds-feedback-link="1"
                className={`flex items-center gap-2.5 px-2.5 py-2 no-underline ${CARD_BASE} ${CARD_IDLE}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold text-slate-800">
                    {t('Share your feedback')}
                  </span>
                  <span className="block mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    {t("What's working, what isn't, what's missing")}
                  </span>
                </span>
                <span className="text-slate-400 shrink-0">
                  <ExternalLinkIcon />
                </span>
              </a>
            </div>
          </div>

          {/* Build number, repeated from the palette footer. Someone
              reporting a problem is usually already in this menu, and the
              palette can be collapsed. Pinned below the scroll area so it
              mirrors the title bar and is readable without scrolling. */}
          <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-50 shrink-0
                          flex items-center gap-2 text-slate-500">
            <TagIcon />
            <span className="flex-1 text-[11px] font-bold uppercase tracking-wide">
              {t('Version')}
            </span>
            <span
              data-nds-settings-version={APP_VERSION}
              className="text-[12px] font-semibold text-slate-700 tabular-nums select-text"
            >
              v{APP_VERSION}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
