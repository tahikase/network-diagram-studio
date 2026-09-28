import { create } from 'zustand';
import { ICONS, ICONS_BY_ID, type IconEntry } from './manifest';
import {
  importedIconAssetSchema, importedIconAssetsSchema, isImportedIconId, readIconFile, iconErrorMessage, decodeIconAsset,
  ICON_LIBRARY_BYTES, ICON_LIBRARY_COUNT, type ImportedIconAsset,
} from './imported-assets';
import type { DiagramNode } from '../model/types';
import { checkLibraryLimits, sourceFolderSchema, type IconFolderPlan, type IconLibraryBackup } from './library-transfer';

const DB_NAME = 'nds-imported-icons';
interface LibraryEntry { id: string; label: string; order?: number; sourceFolder?: string }
export interface IconLibraryDeletion {
  readonly ids: readonly string[];
  readonly confirmation: string;
  readonly sourceFolder?: string;
}
export interface IconImportResult { filename: string; status: 'imported' | 'duplicate' | 'error'; message?: string }
interface LibraryState {
  items: ImportedIconAsset[];
  revision: number;
  busy: boolean;
  error: string | null;
  results: IconImportResult[];
}
export const useImportedIcons = create<LibraryState>(() => ({
  items: [], revision: 0, busy: false, error: null, results: [],
}));

// Immutable artwork outlives personal-library membership. Diagrams, the
// clipboard and undo history may still refer to a removed library entry.
const assets = new Map<string, ImportedIconAsset>();
const persisted = new Set<string>();
const expectedIds = new Set<string>();
let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    let failed = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore('assets', { keyPath: 'id' });
      request.result.createObjectStore('library', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      if (failed) { request.result.close(); return; }
      request.result.onversionchange = () => { request.result.close(); dbPromise = undefined; };
      resolve(request.result);
    };
    request.onerror = () => { failed = true; reject(request.error ?? new Error('Icon storage is unavailable.')); };
    request.onblocked = () => { failed = true; reject(new Error('Close other Studio windows and retry icon storage.')); };
  }).catch(error => { dbPromise = undefined; throw error; });
  return dbPromise;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Icon storage is unavailable.'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Icon storage could not be updated.'));
    tx.onerror = () => reject(tx.error ?? new Error('Icon storage could not be updated.'));
  });
}

async function write<T>(stores: string[], action: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(stores, 'readwrite');
  try {
    // Both request failures and transaction-level quota/commit failures are
    // observed, including a request failing before its caller reaches commit.
    const [result] = await Promise.all([action(tx), transactionDone(tx)]);
    return result;
  } catch (error) {
    try { tx.abort(); }
    catch (abortError) {
      if (!(abortError instanceof DOMException && abortError.name === 'InvalidStateError')) {
        console.error('Network Diagram Studio icon transaction abort failed.', abortError);
      }
    }
    throw error;
  }
}

export function reportIconStorageError(error: unknown): string {
  const message = iconErrorMessage(error, 'Icon storage is unavailable.');
  console.error('Network Diagram Studio imported icons:', error);
  useImportedIcons.setState({ error: message });
  return message;
}

export function iconAsset(id: string): ImportedIconAsset | undefined { return assets.get(id); }

export function paletteIcons(items: readonly ImportedIconAsset[] = useImportedIcons.getState().items): IconEntry[] {
  return [...ICONS, ...items.map(({ id, label }) => ({ id, label, category: 'Imported icons' }))];
}

export function iconEntry(id: string): IconEntry | undefined {
  const item = useImportedIcons.getState().items.find(entry => entry.id === id) ?? assets.get(id);
  return item ? { id: item.id, label: item.label, category: 'Imported icons' } : ICONS_BY_ID[id];
}

export function isLibraryIcon(id: string): boolean {
  return useImportedIcons.getState().items.some(item => item.id === id);
}

export function referencedIconIds(nodes: readonly DiagramNode[]): string[] {
  return [...new Set(nodes.map(node => node?.data?.iconId).filter(isImportedIconId))];
}

export function usedIconAssets(nodes: readonly DiagramNode[]): ImportedIconAsset[] {
  return referencedIconIds(nodes).map(id => {
    const item = assets.get(id);
    if (!item) throw new Error('An imported icon is missing. Reopen the original diagram or replace its icon before saving.');
    return item;
  });
}

export function withIconAssets<T extends { nodes: DiagramNode[] }>(diagram: T): T & { iconAssets?: ImportedIconAsset[] } {
  const items = usedIconAssets(diagram.nodes);
  return items.length ? { ...diagram, iconAssets: items } : diagram;
}

export function installImportedSymbols(): void {
  const svg = document.querySelector('[data-nds-sprite] svg');
  if (!svg) return;
  for (const asset of assets.values()) {
    const existing = document.getElementById('ic-' + asset.id);
    if (existing && !existing.hasAttribute('data-nds-imported-missing')) continue;
    existing?.remove();
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbol.id = 'ic-' + asset.id;
    symbol.setAttribute('data-nds-imported-symbol', asset.id);
    symbol.setAttribute('viewBox', `0 0 ${asset.width} ${asset.height}`);
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', asset.dataUrl);
    image.setAttribute('width', String(asset.width));
    image.setAttribute('height', String(asset.height));
    symbol.append(image);
    svg.append(symbol);
  }
  for (const id of expectedIds) {
    if (assets.has(id) || document.getElementById('ic-' + id)) continue;
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbol.id = 'ic-' + id;
    symbol.setAttribute('viewBox', '0 0 24 24');
    symbol.setAttribute('data-nds-imported-symbol', id);
    symbol.setAttribute('data-nds-imported-missing', '1');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '12'); text.setAttribute('y', '20');
    text.setAttribute('text-anchor', 'middle'); text.setAttribute('font-size', '23');
    text.setAttribute('fill', '#b45309'); text.textContent = '?';
    symbol.append(text); svg.append(symbol);
  }
}

/** Validate the entire batch before changing any live symbol or document. */
export function registerIconAssets(input: ImportedIconAsset[]): void {
  assertCompatibleIcons(input);
  let changed = false;
  for (const item of input) {
    if (!assets.has(item.id)) { assets.set(item.id, item); changed = true; }
  }
  if (changed) {
    installImportedSymbols();
    useImportedIcons.setState(state => ({ revision: state.revision + 1 }));
  }
}

function assertCompatibleIcons(input: ImportedIconAsset[]): void {
  for (const item of input) {
    const prior = assets.get(item.id);
    if (prior && (prior.dataUrl !== item.dataUrl || prior.mime !== item.mime)) {
      throw new Error('An imported icon identifier refers to different artwork.');
    }
  }
}

export function checkDocumentIconAssets(nodes: readonly DiagramNode[], input: ImportedIconAsset[]): void {
  const embedded = new Set(input.map(item => item.id));
  if (referencedIconIds(nodes).some(id => !embedded.has(id))) {
    throw new Error('The diagram is missing embedded icon artwork.');
  }
  assertCompatibleIcons(input);
}

export async function persistIconAssets(items: ImportedIconAsset[]): Promise<void> {
  const pending = items.filter(item => !persisted.has(item.id));
  if (!pending.length) return;
  await write(['assets'], async tx => {
    const previous = await Promise.all(pending.map(item => requestValue<unknown>(tx.objectStore('assets').get(item.id))));
    for (let i = 0; i < pending.length; i++) {
      if (previous[i] !== undefined) {
        const prior = importedIconAssetSchema.parse(previous[i]);
        if (prior.dataUrl !== pending[i].dataUrl || prior.mime !== pending[i].mime) {
          throw new Error('An imported icon identifier refers to different artwork.');
        }
      }
    }
    for (const item of pending) tx.objectStore('assets').put(item);
  });
  for (const item of pending) persisted.add(item.id);
}

export function recoveryIconAssets(nodes: readonly DiagramNode[]): ImportedIconAsset[] {
  return usedIconAssets(nodes).filter(item => !persisted.has(item.id));
}

/** Called before React restores a workspace, so its first frame has artwork. */
export async function initializeImportedIcons(savedIds: string[], recovery: unknown = []): Promise<void> {
  savedIds.filter(isImportedIconId).forEach(id => expectedIds.add(id));
  try {
    const recoverable = importedIconAssetsSchema.parse(recovery);
    registerIconAssets(recoverable);
    const db = await openDb();
    const entries = await requestValue<LibraryEntry[]>(db.transaction('library').objectStore('library').getAll());
    if (entries.length > ICON_LIBRARY_COUNT) throw new Error('The saved icon library exceeds 200 icons.');
    entries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const ids = [...new Set([...entries.map(entry => entry.id), ...savedIds])];
    const tx = db.transaction('assets');
    const records = await Promise.all(ids.map(id => requestValue<unknown>(tx.objectStore('assets').get(id))));
    const valid: ImportedIconAsset[] = [];
    let unreadable = 0;
    for (const record of records) {
      const result = importedIconAssetSchema.safeParse(record);
      if (result.success) { valid.push(result.data); persisted.add(result.data.id); }
      else unreadable++;
    }
    registerIconAssets(valid);
    const items = entries.flatMap(entry => {
      const asset = assets.get(entry.id);
      return asset && typeof entry.label === 'string' && entry.label.trim() && entry.label.length <= 80
        ? [{ ...asset, label: entry.label }] : [];
    });
    if (items.reduce((sum, item) => sum + item.bytes, 0) > ICON_LIBRARY_BYTES) throw new Error('The saved icon library exceeds 50 MB.');
    useImportedIcons.setState(state => ({
      items, revision: state.revision + 1,
      error: unreadable ? 'Some saved icons could not be restored. Reimport the originals or reopen the saved diagram.' : null,
    }));
    await persistIconAssets(recoverable);
  } catch (error) { reportIconStorageError(error); }
}

async function commitIconAsset(asset: ImportedIconAsset, sourceFolder?: string): Promise<'imported' | 'duplicate'> {
  if (useImportedIcons.getState().items.some(item => item.dataUrl === asset.dataUrl)) return 'duplicate';
  // Reuse retained document artwork without automatically adding shared icons
  // to the personal library.
  const same = [...assets.values()].find(item => item.dataUrl === asset.dataUrl);
  const added = same ? { ...same, label: asset.label } : asset;
  assertCompatibleIcons([added]);
  const result = await write(['assets', 'library'], async tx => {
    const library = tx.objectStore('library');
    const stored = await requestValue<LibraryEntry[]>(library.getAll());
    const records = await Promise.all(stored.map(entry => requestValue<unknown>(tx.objectStore('assets').get(entry.id))));
    const storedAssets = records.map(record => importedIconAssetSchema.parse(record));
    if (storedAssets.some(item => item.dataUrl === added.dataUrl)) return 'duplicate';
    checkLibraryLimits([...storedAssets, added]);
    const prior = await requestValue<unknown>(tx.objectStore('assets').get(added.id));
    if (prior !== undefined && importedIconAssetSchema.parse(prior).dataUrl !== added.dataUrl) {
      throw new Error('An imported icon identifier refers to different artwork.');
    }
    tx.objectStore('assets').put(added);
    const order = Math.max(-1, ...stored.map((entry, index) => entry.order ?? index)) + 1;
    library.put({ id: added.id, label: added.label, order, sourceFolder } satisfies LibraryEntry);
    return 'imported';
  });
  if (result === 'imported') {
    persisted.add(added.id);
    registerIconAssets([added]);
    useImportedIcons.setState(state => ({
      items: [...state.items.filter(item => item.id !== added.id), added],
      revision: state.revision + 1,
    }));
  }
  return result;
}

export async function importIconFiles(files: File[]): Promise<void> {
  if (useImportedIcons.getState().busy) return;
  useImportedIcons.setState({ busy: true, error: null, results: [] });
  const results: IconImportResult[] = [];
  try {
    if (files.length > ICON_LIBRARY_COUNT) throw new Error('Select no more than 200 files at once.');
    for (const file of files) {
      try {
        const status = await commitIconAsset(await readIconFile(file));
        results.push({ filename: file.name, status });
      } catch (error) {
        results.push({ filename: file.name, status: 'error', message: iconErrorMessage(error) });
      }
    }
  } catch (error) { reportIconStorageError(error); }
  finally { useImportedIcons.setState({ busy: false, results }); }
}

export async function importIconFolder(plan: IconFolderPlan): Promise<void> {
  if (useImportedIcons.getState().busy) throw new Error('Another icon operation is in progress.');
  useImportedIcons.setState({ busy: true, error: null, results: [] });
  const results: IconImportResult[] = [];
  try {
    for (const item of plan.entries) {
      if (item.status === 'error') {
        results.push(item);
        continue;
      }
      try {
        results.push({ filename: item.filename, status: await commitIconAsset(item.asset, plan.sourceFolder) });
      } catch (error) {
        results.push({ filename: item.filename, status: 'error', message: iconErrorMessage(error) });
      }
    }
  } finally { useImportedIcons.setState({ busy: false, results }); }
}

async function readLibraryMembers(tx: IDBTransaction) {
  const entries = await requestValue<LibraryEntry[]>(tx.objectStore('library').getAll());
  if (entries.length > ICON_LIBRARY_COUNT) throw new Error('The personal library is limited to 200 icons.');
  entries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const records = await Promise.all(entries.map(entry => requestValue<unknown>(tx.objectStore('assets').get(entry.id))));
  const members = entries.map((entry, index) => {
    if (typeof entry.label !== 'string' || !entry.label.trim() || entry.label.length > 80) {
      throw new Error('Use a name between 1 and 80 characters.');
    }
    if (entry.sourceFolder !== undefined) sourceFolderSchema.parse(entry.sourceFolder);
    return { entry, asset: importedIconAssetSchema.parse(records[index]) };
  });
  checkLibraryLimits(members.map(member => member.asset));
  return members;
}

export async function createIconLibraryBackup(favorites: ReadonlySet<string>): Promise<IconLibraryBackup> {
  const db = await openDb();
  const tx = db.transaction(['assets', 'library']);
  const [members] = await Promise.all([readLibraryMembers(tx), transactionDone(tx)]);
  if (!members.length) throw new Error('The icon library is empty.');
  for (const member of members) await decodeIconAsset(member.asset);
  return {
    format: 'nds-icon-library', version: 2, createdUtc: new Date().toISOString(),
    icons: members.map(({ entry, asset }) => ({
      asset, label: entry.label, favorite: favorites.has(entry.id), sourceFolder: entry.sourceFolder,
    })),
  };
}

/** Preserve original IDs, including retained aliases for duplicate artwork. */
export async function restoreIconLibrary(backup: IconLibraryBackup): Promise<string[]> {
  if (useImportedIcons.getState().busy) throw new Error('Another icon operation is in progress.');
  useImportedIcons.setState({ busy: true, error: null, results: [] });
  try {
    const input = backup.icons.map(item => item.asset);
    checkLibraryLimits(input);
    assertCompatibleIcons(input);
    const restored = await write(['assets', 'library'], async tx => {
      const members = await readLibraryMembers(tx);
      const previous = await Promise.all(input.map(asset => requestValue<unknown>(tx.objectStore('assets').get(asset.id))));
      input.forEach((asset, index) => {
        if (previous[index] !== undefined) {
          const prior = importedIconAssetSchema.parse(previous[index]);
          if (prior.dataUrl !== asset.dataUrl || prior.mime !== asset.mime) {
            throw new Error('An imported icon identifier refers to different artwork.');
          }
        }
      });
      assertCompatibleIcons(input);
      const favoriteIds = new Set<string>();
      const results: IconImportResult[] = [];
      const added: LibraryEntry[] = [];
      let order = Math.max(-1, ...members.map((member, index) => member.entry.order ?? index)) + 1;
      for (const item of backup.icons) {
        const same = members.find(member => member.asset.dataUrl === item.asset.dataUrl);
        const entry = same?.entry ?? { id: item.asset.id, label: item.label, order: order++, sourceFolder: item.sourceFolder };
        if (!same) {
          members.push({ entry, asset: item.asset });
          added.push(entry);
        }
        if (item.favorite) favoriteIds.add(entry.id);
        results.push({ filename: item.label, status: same ? 'duplicate' : 'imported' });
      }
      checkLibraryLimits(members.map(member => member.asset));
      for (const asset of input) tx.objectStore('assets').put(asset);
      for (const entry of added) tx.objectStore('library').put(entry);
      return { members, favoriteIds: [...favoriteIds], results };
    });
    for (const asset of input) persisted.add(asset.id);
    registerIconAssets(input);
    useImportedIcons.setState(state => ({
      items: restored.members.map(({ entry, asset }) => ({ ...asset, label: entry.label })),
      revision: state.revision + 1, results: restored.results,
    }));
    return restored.favoriteIds;
  } finally { useImportedIcons.setState({ busy: false }); }
}

export async function renameLibraryIcon(id: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed || trimmed.length > 80) throw new Error('Use a name between 1 and 80 characters.');
  await write(['library'], async tx => {
    const entry = await requestValue<LibraryEntry | undefined>(tx.objectStore('library').get(id));
    if (!entry) throw new Error('This icon is no longer in your library.');
    tx.objectStore('library').put({ ...entry, label: trimmed } satisfies LibraryEntry);
  });
  useImportedIcons.setState(state => ({
    items: state.items.map(item => item.id === id ? { ...item, label: trimmed } : item),
    revision: state.revision + 1,
  }));
}

export async function removeLibraryIcon(id: string): Promise<void> {
  await write(['library'], async tx => { tx.objectStore('library').delete(id); });
  useImportedIcons.setState(state => ({
    items: state.items.filter(item => item.id !== id), revision: state.revision + 1,
  }));
}

function deletionPlan(entries: readonly LibraryEntry[]): IconLibraryDeletion {
  if (!entries.length) throw new Error('The icon library is empty.');
  const first = sourceFolderSchema.safeParse(entries[0].sourceFolder);
  const sourceFolder = first.success && entries.every(entry => entry.sourceFolder === first.data) ? first.data : undefined;
  return { ids: entries.map(entry => entry.id), sourceFolder, confirmation: sourceFolder ?? 'DELETE ALL' };
}

export async function prepareIconLibraryDeletion(): Promise<IconLibraryDeletion> {
  const db = await openDb();
  const entries = await requestValue<LibraryEntry[]>(db.transaction('library').objectStore('library').getAll());
  return deletionPlan(entries);
}

export async function deleteIconLibrary(plan: IconLibraryDeletion, confirmation: string): Promise<readonly string[]> {
  if (confirmation !== plan.confirmation) throw new Error('Type the confirmation text exactly.');
  if (useImportedIcons.getState().busy) throw new Error('Another icon operation is in progress.');
  useImportedIcons.setState({ busy: true, error: null });
  try {
    await write(['library'], async tx => {
      const library = tx.objectStore('library');
      const entries = await requestValue<LibraryEntry[]>(library.getAll());
      if (entries.length !== plan.ids.length ||
          entries.some((entry, index) => entry.id !== plan.ids[index]) ||
          deletionPlan(entries).confirmation !== plan.confirmation) {
        throw new Error('The library changed. Cancel and open Delete again.');
      }
      library.clear();
    });
    useImportedIcons.setState(state => ({ items: [], results: [], revision: state.revision + 1 }));
    return plan.ids;
  } finally { useImportedIcons.setState({ busy: false }); }
}
