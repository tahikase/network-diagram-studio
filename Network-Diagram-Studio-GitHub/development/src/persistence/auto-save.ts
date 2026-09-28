// Auto-save & restore
// -------------------------------------------------------------------------
// Snapshots the entire studio state (all tabs, their diagrams, their pencil
// strokes, and the active-tab pointer) to `localStorage` on a debounced
// timer. On app boot we hydrate from that snapshot so a browser crash,
// accidental reload, or laptop reboot doesn't wipe work in progress.
//
// The "live" diagram edits happen in `useDiagramStore` (not in the tab
// itself), so the active-tab diagram in `useTabsStore` is intentionally
// stale. Snapshots therefore merge the CURRENT diagram-store into the
// active tab before persisting.
import type { Diagram } from '../model/types';
import type { NoteComment, NoteImage } from '../model/schema';
import { useDiagramStore } from '../store/diagram-store';
import { useTabsStore, type Shape, type Stroke, type Tab } from '../demo/tabs-store';
import { hydrateImages, imageUrl, referencedImageIds, renderImage, useImagesUi } from '../demo/notes-images';
import { relayoutForNoOverlap, isFullyLaidOut } from '../model/auto-layout';
import { runtimeExtensions } from '../runtime/extensions';
import { initializeImportedIcons, referencedIconIds, recoveryIconAssets, persistIconAssets } from '../icons/imported-library';
import type { ImportedIconAsset } from '../icons/imported-assets';

const STORAGE_KEY = 'nds.autoSave.v1';
const SCHEMA_VERSION = 1;

interface PersistedTab {
  id: string;
  name: string;
  diagram: Diagram;
  strokes: Stroke[];
  shapes?: Shape[];
  /** v0.9.35. Optional, and SCHEMA_VERSION is deliberately NOT bumped: a
   *  version bump makes `readRaw` reject the whole snapshot, so every user
   *  with work in progress would lose all of it to gain a field that reads
   *  perfectly well as `undefined`. */
  notes?: string;
  /** v0.9.65. Optional for exactly the reason `notes` is — an older snapshot
   *  reads perfectly well as `undefined`, and bumping SCHEMA_VERSION to add a
   *  field would throw away every user's work in progress to gain it. */
  comments?: NoteComment[];
  /**
   * v0.9.66 — screenshot METADATA only. The `png` bytes are deliberately
   * absent.
   *
   * localStorage has roughly 4.8 MB of headroom on this origin and a single
   * capture is 50–500 KB. Worse, a failed write here is swallowed (see
   * `save` below), so a few screenshots would not merely fail to persist —
   * they would quietly stop the DIAGRAM persisting too. The bytes live in
   * IndexedDB instead and are stitched back on by `rehydrateImages`.
   */
  images?: Array<Omit<NoteImage, 'png'>>;
}

interface PersistedState {
  /** Short-lived recovery copy for programmatic loads not yet committed to IndexedDB. */
  iconAssets?: ImportedIconAsset[];
  version: number;
  savedAtIso: string;
  activeTabId: string;
  tabs: PersistedTab[];
}

export interface RestoreSummary {
  tabCount: number;
  savedAtIso: string;
}

function readRaw(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return null;
    if (typeof parsed.activeTabId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Serialize the current live state into localStorage. */
export function snapshot(): boolean {
  const diagramState = useDiagramStore.getState();
  const tabsState = useTabsStore.getState();

  // Merge the LIVE diagram into the active tab so we don't persist a stale
  // snapshot of the currently-edited tab.
  const currentDiagram: Diagram = JSON.parse(JSON.stringify(diagramState.diagram)) as Diagram;
  const tabs: PersistedTab[] = tabsState.tabs.map((t) => ({
    id: t.id,
    name: t.name,
    diagram: t.id === tabsState.activeTabId ? currentDiagram : t.diagram,
    strokes: t.strokes,
    shapes: t.shapes,
    notes: t.notes,
    comments: t.comments,
    // `shapes` (annotations) ride along here on purpose — they are a few
    // hundred bytes of JSON, unlike the bitmap, and without them a reload
    // brings the screenshot back stripped of its arrows.
    images: t.images.map(({ id, caption, w, h, shapes }) => ({ id, caption, w, h, shapes })),
  }));

  const payload: PersistedState = {
    version: SCHEMA_VERSION,
    savedAtIso: new Date().toISOString(),
    activeTabId: tabsState.activeTabId,
    tabs,
  };
  try {
    const pending = recoveryIconAssets(tabs.flatMap(tab => tab.diagram.nodes));
    if (pending.length) payload.iconAssets = pending;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (pending.length) {
      void persistIconAssets(pending).then(() => { snapshot(); }).catch(error => {
        console.error('Network Diagram Studio icon auto-save failed.', error);
        runtimeExtensions().ndsCanvasImages?.autoSaveFailed(error);
      });
    }
    return true;
  } catch (error) {
    console.error('Network Diagram Studio auto-save failed.', error);
    runtimeExtensions().ndsCanvasImages?.autoSaveFailed(error);
    return false;
  }
}

export async function prepareIconStorage(): Promise<void> {
  const saved = readRaw();
  const nodes = saved?.tabs.flatMap(tab => Array.isArray(tab.diagram?.nodes) ? tab.diagram.nodes : []) ?? [];
  await initializeImportedIcons(referencedIconIds(nodes), saved?.iconAssets ?? []);
}

/**
 * Hydrate the tabs-store and diagram-store from a previous snapshot.
 * Returns a summary if a snapshot was restored; null if there was nothing
 * to restore.
 */
export function restore(): RestoreSummary | null {
  const persisted = readRaw();
  if (!persisted) return null;

  /* Re-fit EVERY restored tab, not just the active one.
     A snapshot written before card widths became content-driven stores
     narrow leaf sizes, so its long names ellipsize. The active tab already
     self-heals below (loadDiagram relayouts by default), but switchTab
     deliberately uses `relayout: false` — so without this, tab 1 would come
     back fixed while tabs 2..n stayed truncated. relayoutForNoOverlap only
     ever grows a leaf, never shrinks it, so a card the user deliberately
     enlarged round-trips unchanged.

     `preservePositions` keeps that text self-heal while dropping the
     overlap sweep. The sweep re-flows a container's children into rows the
     moment any two of them touch, which meant simply RELOADING THE PAGE
     could rearrange a diagram the user had hand-arranged and never asked
     to change. Snapshots are always fully laid out (every node the app
     creates is sized), so the sweep had nothing legitimate to repair here
     anyway. */
  const restoredTabs: Tab[] = persisted.tabs.map((pt) => ({
    id: pt.id,
    name: pt.name,
    diagram: relayoutForNoOverlap(pt.diagram, {
      preservePositions: isFullyLaidOut(pt.diagram),
    }),
    strokes: pt.strokes ?? [],
    shapes: pt.shapes ?? [],
    notes: pt.notes ?? '',
    comments: pt.comments ?? [],
    // `png: ''` is a placeholder the bytes get stitched into by
    // `rehydrateImages`. Entries still empty after that are dropped, so a
    // saved file can never carry a zero-byte image the loader would reject.
    images: (pt.images ?? []).map((m) => ({ ...m, png: '' })),
  }));

  const activeTab =
    restoredTabs.find((t) => t.id === persisted.activeTabId) ?? restoredTabs[0];

  // Replace tabs state — including the undo stack — with the restored set.
  useTabsStore.setState({
    tabs: restoredTabs,
    activeTabId: activeTab.id,
    undoStack: [],
  });

  // Push the active tab's diagram into the live diagram-store so the
  // Canvas re-renders it. `relayout: false` because the tab was already
  // repaired above — letting loadDiagram run its default pass would put
  // the overlap sweep straight back and undo the preservation.
  useDiagramStore.getState().loadDiagram(activeTab.diagram, { relayout: false });

  void rehydrateImages();

  return {
    tabCount: restoredTabs.length,
    savedAtIso: persisted.savedAtIso,
  };
}

/**
 * Put the screenshot bytes back, from IndexedDB, after a restore.
 *
 * Asynchronous because IndexedDB is, and the restore path above is not — so
 * the notes render once without pictures and once with. `bumpRev` is what
 * triggers that second render; it fires only when bytes actually arrived, so
 * a session with no screenshots costs exactly one extra microtask.
 *
 * Any entry whose bytes did not come back is dropped from the tab rather than
 * left as a placeholder, so the next save cannot write a zero-byte image.
 */
async function rehydrateImages(): Promise<void> {
  const tabs = useTabsStore.getState().tabs;
  if (!tabs.some((t) => t.images.length > 0)) return;
  const keep = tabs.flatMap((t) => referencedImageIds(t.notes));
  const added = await hydrateImages(keep);
  useTabsStore.setState((s) => ({
    tabs: s.tabs.map((t) => ({
      ...t,
      images: t.images
        .map((i) => (i.png ? i : { ...i, png: imageUrl(i.id) ?? '' }))
        .filter((i) => i.png !== ''),
    })),
  }));
  // `hydrateImages` puts the raw bitmap in the url map; anything carrying
  // annotations has to be re-flattened or it comes back without its arrows.
  // Shapes ride along in the localStorage metadata, so they survived.
  useTabsStore.getState().tabs.forEach((t) =>
    t.images.forEach((i) => { if (i.shapes?.length) renderImage(i); }),
  );
  if (added > 0) useImagesUi.getState().bumpRev();
}

/**
 * Wipe the persisted snapshot AND reset the live studio state to a single
 * blank tab. Called from the "Clear saved data" menu — the goal is a
 * predictable "start fresh" behavior. Auto-save then re-persists the blank
 * state so a subsequent reload also starts blank.
 */
export function clearSaved(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing we can do.
  }

  // Reset both stores to a blank single-tab state so the current view
  // matches what the next reload will show.
  useDiagramStore.getState().clear();

  // Rebuild the tabs list to a single "Overview" tab pointing at a fresh
  // empty diagram. We reuse the diagram-store's just-cleared diagram.
  useTabsStore.setState({
    tabs: [
      {
        id: `tab_${Math.random().toString(36).slice(2, 10)}`,
        name: 'Overview',
        diagram: JSON.parse(JSON.stringify(useDiagramStore.getState().diagram)),
        strokes: [],
        shapes: [],
        notes: '',
        comments: [],
        images: [],
      },
    ],
    activeTabId: '', // set below
    undoStack: [],
  });
  const only = useTabsStore.getState().tabs[0];
  useTabsStore.setState({ activeTabId: only.id });
}

/** Does a snapshot exist? Used by the restore-toast UI. */
export function hasSaved(): boolean {
  return readRaw() !== null;
}
