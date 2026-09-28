import { z } from 'zod';
import {
  ICON_LIBRARY_BYTES, ICON_LIBRARY_COUNT, decodeIconAsset, iconErrorMessage,
  importedIconAssetSchema, readIconFile, type ImportedIconAsset,
} from './imported-assets';

export const ICON_BACKUP_BYTES = Math.ceil(ICON_LIBRARY_BYTES * 4 / 3) + 1024 * 1024;
export const sourceFolderSchema = z.string().min(1).max(255).refine(name =>
  !!name.trim() && !name.includes('/') && !name.includes('\\') &&
  [...name].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
  'Invalid imported folder name.');

export type IconImportCandidate =
  | { filename: string; status: 'ready' | 'duplicate'; asset: ImportedIconAsset }
  | { filename: string; status: 'error'; message: string };

export interface IconFolderPlan {
  readonly name: string;
  readonly sourceFolder?: string;
  readonly ignored: number;
  readonly entries: readonly IconImportCandidate[];
}

export interface IconLibraryBackup {
  readonly format: 'nds-icon-library';
  readonly version: 2;
  readonly createdUtc: string;
  readonly icons: readonly {
    readonly asset: ImportedIconAsset;
    readonly label: string;
    readonly favorite: boolean;
    readonly sourceFolder?: string;
  }[];
}

export function checkLibraryLimits(items: readonly ImportedIconAsset[]): void {
  if (items.length > ICON_LIBRARY_COUNT) throw new Error('The personal library is limited to 200 icons.');
  if (items.reduce((sum, item) => sum + item.bytes, 0) > ICON_LIBRARY_BYTES) {
    throw new Error('The personal library is limited to 50 MB.');
  }
}

export async function prepareIconFolder(
  files: readonly File[], existing: readonly ImportedIconAsset[], signal: AbortSignal,
): Promise<IconFolderPlan> {
  const supported = files.filter(file => /\.(svg|png)$/i.test(file.name))
    .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));
  if (!supported.length) throw new Error('No SVG or PNG files were found in this folder.');
  if (supported.length > ICON_LIBRARY_COUNT) throw new Error('Select no more than 200 files at once.');
  const roots = supported.map(file => file.webkitRelativePath.includes('/') ? file.webkitRelativePath.split('/')[0] : undefined);
  const sourceFolder = roots[0] && roots.every(root => root === roots[0]) ? sourceFolderSchema.parse(roots[0]) : undefined;
  const known = new Map(existing.map(item => [item.dataUrl, item]));
  let count = existing.length;
  let bytes = existing.reduce((sum, item) => sum + item.bytes, 0);
  const entries: IconImportCandidate[] = [];
  for (const file of supported) {
    signal.throwIfAborted();
    const filename = file.webkitRelativePath || file.name;
    try {
      const asset = await readIconFile(file);
      signal.throwIfAborted();
      const duplicate = known.get(asset.dataUrl);
      if (duplicate) {
        entries.push({ filename, status: 'duplicate', asset: { ...duplicate, label: asset.label } });
        continue;
      }
      if (count >= ICON_LIBRARY_COUNT) throw new Error('The personal library is limited to 200 icons.');
      if (bytes + asset.bytes > ICON_LIBRARY_BYTES) throw new Error('The personal library is limited to 50 MB.');
      entries.push({ filename, status: 'ready', asset });
      known.set(asset.dataUrl, asset);
      bytes += asset.bytes;
      count++;
    } catch (error) {
      signal.throwIfAborted();
      entries.push({ filename, status: 'error', message: iconErrorMessage(error) });
    }
  }
  return {
    name: sourceFolder ?? 'Import folder',
    sourceFolder,
    ignored: files.length - supported.length,
    entries,
  };
}

const backupHeader = z.object({
  format: z.literal('nds-icon-library'),
  version: z.union([z.literal(1), z.literal(2)]),
  createdUtc: z.iso.datetime(),
  icons: z.array(z.object({
    asset: z.unknown(),
    label: z.string().trim().min(1).max(80),
    favorite: z.boolean(),
    sourceFolder: sourceFolderSchema.optional(),
  }).strict()).min(1).max(ICON_LIBRARY_COUNT),
}).strict().refine(backup => backup.version === 2 || backup.icons.every(icon => icon.sourceFolder === undefined));

export async function readIconLibraryBackup(file: File, signal: AbortSignal): Promise<IconLibraryBackup> {
  if (!file.size || file.size > ICON_BACKUP_BYTES) throw new Error('The library backup is empty or too large.');
  signal.throwIfAborted();
  let input: unknown;
  try { input = JSON.parse(await file.text()); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error('Invalid icon library backup.');
  }
  signal.throwIfAborted();
  if (typeof input !== 'object' || input === null || !('format' in input) || input.format !== 'nds-icon-library') {
    throw new Error('Choose an .nds-icons.json library backup, not a diagram.');
  }
  if (!('version' in input) || (input.version !== 1 && input.version !== 2)) throw new Error('This library backup version is not supported.');
  if ('icons' in input && Array.isArray(input.icons) && input.icons.length > ICON_LIBRARY_COUNT) {
    throw new Error('The personal library is limited to 200 icons.');
  }
  const header = backupHeader.safeParse(input);
  if (!header.success) throw new Error('Invalid icon library backup.');
  const icons: IconLibraryBackup['icons'][number][] = [];
  const ids = new Set<string>();
  let bytes = 0;
  for (const item of header.data.icons) {
    signal.throwIfAborted();
    const result = importedIconAssetSchema.safeParse(item.asset);
    if (!result.success) throw new Error(iconErrorMessage(result.error, 'Invalid icon library backup.'));
    const asset = result.data;
    if (ids.has(asset.id)) throw new Error('Duplicate imported icon identifiers.');
    ids.add(asset.id);
    bytes += asset.bytes;
    if (bytes > ICON_LIBRARY_BYTES) throw new Error('The personal library is limited to 50 MB.');
    await decodeIconAsset(asset);
    icons.push({ asset, label: item.label, favorite: item.favorite, sourceFolder: item.sourceFolder });
  }
  signal.throwIfAborted();
  return { format: 'nds-icon-library', version: 2, createdUtc: header.data.createdUtc, icons };
}
