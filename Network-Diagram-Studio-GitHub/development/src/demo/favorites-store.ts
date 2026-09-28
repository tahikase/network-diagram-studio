// Favorites store — session-scoped pinned items.
//
// Users can pin resources, icons, and shapes via a star (☆/★)
// affordance on each row or tile. Favorited items appear in the "★ Favorites"
// tab (leftmost) of the palette for one-click access.
//
// Persistence semantics (exactly as spec'd by the user):
//   - Backed by `sessionStorage`, NOT `localStorage`.
//   - Survives page refresh / F5 / in-tab reload (same tab session).
//   - Empty on a brand-new tab or a private window.
//   - No cross-tab sync, no long-term memory. That's on purpose.
//
// A `try/catch` guard around every storage access keeps the store safe if
// sessionStorage is disabled (private-mode Safari, restrictive corporate
// policies, etc.) — the feature just becomes ephemeral in-memory only.

import { create } from 'zustand';
import { SHAPE_PRESETS, isPaletteShapeVariant } from './shape-presets';
import { LEARN_DIAGRAMS } from './learn-diagrams.generated';
import { isImportedIconId } from '../icons/imported-assets';
import { isLibraryIcon } from '../icons/imported-library';

const STORAGE_KEY = 'nds.favorites.v1';

export type FavKind = 'resource' | 'icon' | 'shape' | 'diagram';

interface PersistShape {
  resources: string[];
  icons: string[];
  /** Shape favorites are keyed by `ShapePreset.variant`. */
  shapes: string[];
  /** Microsoft Learn diagram references, keyed by `LearnDiagram.id`. */
  diagrams: string[];
}

interface FavoritesState {
  resources: Set<string>;
  icons: Set<string>;
  shapes: Set<string>;
  diagrams: Set<string>;

  isFavorite: (kind: FavKind, id: string) => boolean;
  toggleFavorite: (kind: FavKind, id: string) => void;
  restoreIconFavorites: (ids: readonly string[]) => void;
  removeIconFavorites: (ids: readonly string[]) => void;
  clearAll: () => void;

  totalCount: () => number;
}

const EMPTY: PersistShape = { resources: [], icons: [], shapes: [], diagrams: [] };

/** Every known persisted variant, including shapes hidden from creation. */
const KNOWN_SHAPE_VARIANTS = new Set(SHAPE_PRESETS.map((p) => p.variant));

/** Every Learn diagram in the current harvest. */
const KNOWN_DIAGRAM_IDS = new Set(LEARN_DIAGRAMS.map((d) => d.id));

function readInitial(): PersistShape {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    // Every bucket is read defensively and independently, so a payload written
    // before `shapes` existed still loads — it just arrives with no shapes.
    // That is why adding a bucket needs no storage-version bump.
    const list = (v: unknown) =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];
    return {
      resources: list(parsed.resources),
      icons: list(parsed.icons),
      // Discard unknown IDs, but retain known legacy pins in storage. The
      // networking picker and its counts hide retired creation choices.
      shapes: list(parsed.shapes).filter((v) => KNOWN_SHAPE_VARIANTS.has(v)),
      // Pruned for the same reason as shapes: the Learn catalog is
      // regenerated from Microsoft's docs, so a diagram Microsoft retired
      // between two harvests leaves an id nothing can render.
      diagrams: list(parsed.diagrams).filter((v) => KNOWN_DIAGRAM_IDS.has(v)),
    };
  } catch {
    return EMPTY;
  }
}

function writeToSession(state: {
  resources: Set<string>;
  icons: Set<string>;
  shapes: Set<string>;
  diagrams: Set<string>;
}, required = false) {
  if (typeof window === 'undefined') return;
  try {
    const shape: PersistShape = {
      resources: [...state.resources],
      icons: [...state.icons],
      shapes: [...state.shapes],
      diagrams: [...state.diagrams],
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch (error) {
    if (required) throw error;
    // Session storage not available — feature stays in-memory only.
  }
}

const initial = readInitial();

/** Bucket name in the store for each favoritable kind. */
const BUCKET = {
  resource: 'resources',
  icon: 'icons',
  shape: 'shapes',
  diagram: 'diagrams',
} as const satisfies Record<FavKind, 'resources' | 'icons' | 'shapes' | 'diagrams'>;

/**
 * Total pinned items, as a stable selector.
 *
 * Exported because this sum was hand-rolled in three places and adding the
 * `shapes` bucket silently missed one, leaving the Favorites header badge
 * reporting a count that disagreed with the list beneath it. One selector
 * means the next bucket can only be forgotten once — in the store.
 */
export const favTotalSelector = (s: FavoritesState) =>
  s.resources.size + [...s.icons].filter(id => !isImportedIconId(id) || isLibraryIcon(id)).length +
  [...s.shapes].filter(isPaletteShapeVariant).length + s.diagrams.size;

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  resources: new Set(initial.resources),
  icons: new Set(initial.icons),
  shapes: new Set(initial.shapes),
  diagrams: new Set(initial.diagrams),

  isFavorite: (kind, id) => get()[BUCKET[kind]].has(id),

  toggleFavorite: (kind, id) => {
    const state = get();
    const key = BUCKET[kind];
    const next = new Set(state[key]);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    const nextState = {
      resources: state.resources,
      icons: state.icons,
      shapes: state.shapes,
      diagrams: state.diagrams,
      [key]: next,
    } as Pick<FavoritesState, 'resources' | 'icons' | 'shapes' | 'diagrams'>;
    writeToSession(nextState);
    set(nextState);
  },

  restoreIconFavorites: (ids) => {
    const state = get();
    if (ids.some(id => !isImportedIconId(id) || !isLibraryIcon(id))) {
      throw new Error('This icon is no longer in your library.');
    }
    const icons = new Set([...state.icons, ...ids]);
    writeToSession({ ...state, icons }, true);
    set({ icons });
  },

  removeIconFavorites: (ids) => {
    if (ids.some(id => !isImportedIconId(id))) throw new Error('Invalid imported icon identifier.');
    const state = get();
    const removed = new Set(ids);
    const icons = new Set([...state.icons].filter(id => !removed.has(id)));
    if (icons.size === state.icons.size) return;
    writeToSession({ ...state, icons }, true);
    set({ icons });
  },

  clearAll: () => {
    const empty = {
      resources: new Set<string>(),
      icons: new Set<string>(),
      shapes: new Set<string>(),
      diagrams: new Set<string>(),
    };
    writeToSession(empty);
    set(empty);
  },

  totalCount: () => favTotalSelector(get()),
}));

// Testing hook — mirrors `window.__nds_tabsStore`. Lets Playwright scripts
// read and toggle pins directly instead of hunting for a star in the DOM.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_favoritesStore?: typeof useFavoritesStore }).__nds_favoritesStore =
    useFavoritesStore;
}
