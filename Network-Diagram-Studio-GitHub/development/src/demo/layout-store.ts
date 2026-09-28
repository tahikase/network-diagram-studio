// Demo v0.6.1: layout collapse state.
// Demo v0.7.12: adds `expandedSections` for the vertical accordion palette.
//
// Owns whether the LEFT palette is collapsed. When collapsed, DemoApp.tsx
// swaps <DemoPalette /> for a thin <PaletteRail /> that just holds a
// re-open chevron and mini tab icons — freeing up the canvas.
//
// State is persisted to localStorage so it survives reloads and matches
// how ResizableAside remembers panel width. Section-order failures are surfaced
// in the palette; the older collapse/notes preferences remain best-effort.
import { create } from 'zustand';
import { DEMO_FEATURES, IMPORTED_ICONS, PALETTE_SECTION_REORDER } from '../env';

const STORAGE_KEY = 'nds.paletteCollapsed';
const SECTIONS_STORAGE_KEY = 'nds.paletteSections';
const NOTES_STORAGE_KEY = 'nds.notesOpen';
const NOTES_FONT_KEY = 'nds.notesFontSize';
const ORDER_STORAGE_KEY = 'nds.paletteOrder.v1';

const SECTION_IDS = ['favorites', 'shapes', 'resources', 'imported', 'learn', 'icons'] as const;
export type PaletteTab = typeof SECTION_IDS[number];
export const DEFAULT_PALETTE_ORDER: readonly PaletteTab[] = SECTION_IDS.filter(
  id => (id !== 'imported' || IMPORTED_ICONS) && (id !== 'learn' || DEMO_FEATURES),
);
export const PALETTE_SECTION_LABELS: Record<PaletteTab, string> = {
  favorites: 'Favorites', shapes: 'Shapes', resources: 'Resources',
  imported: 'Imported icons', learn: 'Learn diagrams', icons: 'All icons',
};
type OrderError = 'read' | 'write' | null;

function readStoredOrder(): { paletteOrder: readonly PaletteTab[]; paletteOrderError: OrderError } {
  const fallback = { paletteOrder: DEFAULT_PALETTE_ORDER, paletteOrderError: null };
  if (!PALETTE_SECTION_REORDER || typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Palette order must be a list of section IDs.');
    const valid = parsed.filter((id): id is PaletteTab => DEFAULT_PALETTE_ORDER.some(section => section === id));
    return { paletteOrder: [...new Set([...valid, ...DEFAULT_PALETTE_ORDER])], paletteOrderError: null };
  } catch (error) {
    console.warn('Could not load palette section order.', error);
    return { paletteOrder: DEFAULT_PALETTE_ORDER, paletteOrderError: 'read' };
  }
}

function writeStoredOrder(order: readonly PaletteTab[]): OrderError {
  try {
    if (typeof window === 'undefined') throw new Error('Browser storage is unavailable.');
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    return null;
  } catch (error) {
    console.warn('Could not save palette section order.', error);
    return 'write';
  }
}

/**
 * v0.9.43 — the sizes offered by the Notes text-size control, in px.
 *
 * The notes surface is styled entirely in `em` (h1 is 1.35em, code 0.92em,
 * list indent 1.4em, table padding 0.22em), so this single number scales
 * headings, code, lists and tables together. Nothing else has to change.
 *
 * The top of the range is deliberate: WCAG 2.1 SC 1.4.4 (Resize Text, AA)
 * asks for text to reach 200% without loss of content or functionality, and
 * 26px is exactly 200% of the 13px default.
 */
export const NOTES_FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 26] as const;
export const NOTES_FONT_DEFAULT = 13;

function readStoredNotesFont(): number {
  if (typeof window === 'undefined') return NOTES_FONT_DEFAULT;
  try {
    const n = Number(window.localStorage.getItem(NOTES_FONT_KEY));
    // Snap to the offered list rather than trusting the stored number: a hand-
    // edited or stale value must not be able to render the notes unreadable.
    return (NOTES_FONT_SIZES as readonly number[]).includes(n) ? n : NOTES_FONT_DEFAULT;
  } catch {
    return NOTES_FONT_DEFAULT;
  }
}

function writeStoredNotesFont(v: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTES_FONT_KEY, String(v));
  } catch {
    // ignore quota / private mode
  }
}

function readStored(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStored(v: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    // ignore quota / private mode
  }
}

const DEFAULT_EXPANDED: readonly string[] = ['resources', 'shapes'];

function readStoredNotesOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NOTES_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredNotesOpen(v: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, v ? '1' : '0');
  } catch {
    // ignore quota / private mode
  }
}

function readStoredSections(): Set<string> {
  if (typeof window === 'undefined') return new Set(DEFAULT_EXPANDED);
  try {
    const raw = window.localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_EXPANDED);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(DEFAULT_EXPANDED);
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set(DEFAULT_EXPANDED);
  }
}

function writeStoredSections(s: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify([...s]));
  } catch {
    // ignore quota / private mode
  }
}

interface LayoutState {
  paletteOrder: readonly PaletteTab[];
  paletteOrderError: OrderError;
  movePaletteSection: (source: PaletteTab, target: PaletteTab, side: 'before' | 'after') => boolean;
  resetPaletteOrder: () => void;

  paletteCollapsed: boolean;
  togglePaletteCollapsed: () => void;
  setPaletteCollapsed: (v: boolean) => void;

  /** Which accordion sections are currently expanded in the vertical palette.
   *  Values are PaletteTab strings ('favorites' | 'resources' | 'templates'
   *  | 'icons' | 'shapes'). Persisted to localStorage. */
  expandedSections: Set<string>;
  /** Flip a section between expanded and collapsed. */
  toggleSection: (t: string) => void;
  /** Idempotently expand a section (used by the PaletteRail when the user
   *  clicks a category button to jump to it). */
  expandSection: (t: string) => void;

  /**
   * v0.9.35 — whether the right-hand Notes panel is expanded.
   *
   * Closed by default. Notes are opt-in: an engineer who only wants to draw
   * should not pay ~340px of canvas for a feature they never open, so the
   * closed state is a 44px rail that costs almost nothing and keeps the
   * feature discoverable. Persisted, like the palette's collapse state, so
   * someone who works with notes open every day only opens it once.
   */
  notesOpen: boolean;
  setNotesOpen: (v: boolean) => void;
  toggleNotesOpen: () => void;

  /**
   * v0.9.43 — the notes text size, in px.
   *
   * A VIEW preference, not note content. Markdown has no font-size concept —
   * it encodes structure, not presentation — so a per-selection size could
   * only be persisted by embedding raw HTML, which would both break the
   * byte-identical Markdown round trip and force an HTML parser into
   * `markdownToDom`, which today never touches innerHTML by design. Obsidian
   * and VS Code, both Markdown-backed, make the same call: editor-level size,
   * no per-selection size. So this scales the surface and leaves notes alone.
   */
  notesFontSize: number;
  setNotesFontSize: (v: number) => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  ...readStoredOrder(),
  movePaletteSection: (source, target, side) => {
    if (!PALETTE_SECTION_REORDER || source === target) return false;
    const order = get().paletteOrder;
    if (!order.includes(source) || !order.includes(target)) {
      console.warn('Cannot reorder an unavailable palette section.', { source, target });
      return false;
    }
    const next = order.filter(id => id !== source);
    next.splice(next.indexOf(target) + (side === 'after' ? 1 : 0), 0, source);
    if (next.every((id, index) => id === order[index])) return false;
    set({ paletteOrder: next, paletteOrderError: writeStoredOrder(next) });
    return true;
  },
  resetPaletteOrder: () => {
    if (!PALETTE_SECTION_REORDER) return;
    set({ paletteOrder: DEFAULT_PALETTE_ORDER, paletteOrderError: writeStoredOrder(DEFAULT_PALETTE_ORDER) });
  },

  paletteCollapsed: readStored(),
  togglePaletteCollapsed: () => {
    const next = !get().paletteCollapsed;
    writeStored(next);
    set({ paletteCollapsed: next });
  },
  setPaletteCollapsed: (v) => {
    writeStored(v);
    set({ paletteCollapsed: v });
  },

  expandedSections: readStoredSections(),
  toggleSection: (t) => {
    const cur = get().expandedSections;
    const next = new Set(cur);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    writeStoredSections(next);
    set({ expandedSections: next });
  },
  expandSection: (t) => {
    const cur = get().expandedSections;
    if (cur.has(t)) return;
    const next = new Set(cur);
    next.add(t);
    writeStoredSections(next);
    set({ expandedSections: next });
  },

  notesOpen: readStoredNotesOpen(),
  setNotesOpen: (v) => {
    writeStoredNotesOpen(v);
    set({ notesOpen: v });
  },
  toggleNotesOpen: () => {
    const next = !get().notesOpen;
    writeStoredNotesOpen(next);
    set({ notesOpen: next });
  },

  notesFontSize: readStoredNotesFont(),
  setNotesFontSize: (v) => {
    const next = (NOTES_FONT_SIZES as readonly number[]).includes(v) ? v : NOTES_FONT_DEFAULT;
    writeStoredNotesFont(next);
    set({ notesFontSize: next });
  },
}));

// Testing hook — mirrors `window.__nds_diagramStore` so Playwright verify
// scripts can force the palette open/closed or toggle accordion sections
// without simulating chrome clicks. Guarded so it doesn't leak into SSR /
// node contexts.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_layoutStore?: typeof useLayoutStore }).__nds_layoutStore =
    useLayoutStore;
}
