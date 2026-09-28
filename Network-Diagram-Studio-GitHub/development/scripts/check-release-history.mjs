import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';

const defaultRoot = fileURLToPath(new URL('..', import.meta.url));
const languages = ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko'];
const version = z.string().regex(/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/);
const text = z.string().trim().min(1).max(700);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a real calendar date.');
const imageSchema = z.strictObject({ file: z.string().regex(/^\d+\.\d+\.\d+-(before|after)\.png$/), version, caption: text });
const productCategories = ['New feature', 'Appearance', 'Usability', 'Performance'];
const entrySchema = z.strictObject({
  version, date,
  category: z.enum(productCategories, { error: "What's new accepts only new product updates; bug-fix categories are not allowed." }),
  title: text.max(120), description: text, before: imageSchema, after: imageSchema, note: text,
});
const archivedEntrySchema = entrySchema.extend({ category: z.enum([...productCategories, 'Fix']) });
const classificationSchema = z.union([
  z.strictObject({ version, date, kind: z.enum(['ui', 'functionality']), userImpact: text }),
  z.strictObject({ version, date, kind: z.enum(['fix', 'internal']), reason: text, withdrawnIn: version.optional() }),
]);
const isProductUpdate = record => record.kind === 'ui' || record.kind === 'functionality';
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const lockSchema = z.strictObject({
  format: z.literal(1),
  publishedThrough: version.nullable(),
  releases: z.record(version, z.union([
    z.strictObject({ entry: hashSchema, before: hashSchema, after: hashSchema, source: hashSchema.optional() }),
    z.strictObject({ entry: hashSchema, internal: z.literal(true), source: hashSchema.optional() }),
  ])),
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const copies = entry => [entry.category, entry.title, entry.description, entry.note, entry.before.caption, entry.after.caption];
function compare(a, b) {
  const right = b.split('.').map(Number);
  for (const [index, part] of a.split('.').map(Number).entries()) if (part !== right[index]) return part - right[index];
  return 0;
}
function fail(message) { throw new Error(`Release history: ${message}`); }
function checkOrder(entries, label) {
  for (let index = 1; index < entries.length; index++) {
    if (compare(entries[index - 1].version, entries[index].version) <= 0 || entries[index - 1].date < entries[index].date) {
      fail(`${label} must have unique versions in newest-first version/date order.`);
    }
  }
}

function readAudience(root) {
  const matches = [...readFileSync(path.join(root, 'src', 'version.ts'), 'utf8').matchAll(/export const APP_VERSION = '([^']+)';/g)];
  if (matches.length !== 1) fail('APP_VERSION must have exactly one declaration.');
  const appVersion = version.parse(matches[0][1]);
  const ledger = z.array(classificationSchema).min(1).parse(readJson(path.join(root, 'releases', 'release-records.json')));
  const entries = z.array(entrySchema).min(1).parse(readJson(path.join(root, 'src', 'updates', 'release-history.json')));
  checkOrder(ledger, 'release classifications');
  checkOrder(entries, 'public entries');
  if (ledger[0].version !== appVersion) fail(`the newest release classification must match APP_VERSION ${appVersion}.`);
  const classified = new Map(ledger.map(record => [record.version, record]));
  const visible = new Map(entries.map(entry => [entry.version, entry]));
  for (const entry of entries) {
    const record = classified.get(entry.version);
    if (!record) fail(`public v${entry.version} is unclassified. Declare its new product impact.`);
    if (!isProductUpdate(record)) fail(`${record.kind} v${entry.version} must not appear in What's new.`);
    if (record.date !== entry.date) fail(`public v${entry.version} must use its classified release date.`);
  }
  for (const record of ledger) {
    if (isProductUpdate(record) && !visible.has(record.version)) {
      fail(`product update v${record.version} needs a complete public history entry.`);
    }
    if (record.withdrawnIn && (compare(record.withdrawnIn, record.version) <= 0 || !classified.has(record.withdrawnIn))) {
      fail(`v${record.version} must identify the later release that authorized its withdrawal.`);
    }
  }
  return { appVersion, ledger, entries, visible };
}

export function checkReleaseAudience(root = defaultRoot) {
  const result = readAudience(root);
  return { version: result.appVersion, count: result.entries.length };
}

function sourceDigest(root) {
  const inputs = [];
  function visit(file) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (relative === 'src/updates/release-history.lock.json' || relative.endsWith('.pending')) return;
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) fail(`application input must not be a symlink: ${relative}`);
    if (stat.isDirectory()) for (const name of readdirSync(file).sort()) visit(path.join(file, name));
    else inputs.push([relative, hash(readFileSync(file))]);
  }
  for (const folder of ['src', 'scripts', 'package', 'releases']) if (existsSync(path.join(root, folder))) visit(path.join(root, folder));
  for (const name of readdirSync(root).sort()) {
    if (/^(package(-lock)?\.json|vite\.config\.ts|tsconfig.*\.json|index.*\.html|test-.*\.cjs|AGENTS\.md|README\.md|LICENSE-ICONS\.md|\.oxlintrc\.json)$/.test(name)) visit(path.join(root, name));
  }
  return hash(JSON.stringify(inputs));
}

function validateDictionary(dictionary) {
  for (const [source, row] of Object.entries(dictionary)) {
    if (!row || typeof row !== 'object' || Object.keys(row).sort().join() !== [...languages].sort().join()) {
      fail(`"${source}" must have all seven non-English translations.`);
    }
    const placeholders = [...source.matchAll(/\{[a-z]+\}/g)].map(match => match[0]).sort().join();
    for (const language of languages) {
      if (typeof row[language] !== 'string' || !row[language].trim()) fail(`missing ${language} translation: ${source}`);
      if ([...row[language].matchAll(/\{[a-z]+\}/g)].map(match => match[0]).sort().join() !== placeholders) {
        fail(`placeholder mismatch in ${language}: ${source}`);
      }
    }
  }
}

function entryRecord(entry, dictionary, directory, assets) {
  for (const copy of copies(entry)) {
    if (!Object.hasOwn(dictionary, copy)) fail(`v${entry.version} is missing translations: ${copy}`);
  }
  if (compare(entry.before.version, entry.version) >= 0 || entry.after.version !== entry.version) {
    fail(`v${entry.version} must identify an earlier before version and its own after version.`);
  }
  const record = { entry: hash(JSON.stringify(entry)), before: '', after: '' };
  for (const phase of ['before', 'after']) {
    const file = path.join(directory, entry[phase].file);
    if (entry[phase].file !== `${entry.version}-${phase}.png`) fail(`v${entry.version} has the wrong ${phase} image filename.`);
    if (!existsSync(file)) fail(`missing ${phase} image for v${entry.version}: ${file}`);
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024) fail(`image must be a local PNG under 8 MB: ${file}`);
    const bytes = readFileSync(file);
    if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR') {
      fail(`invalid PNG image: ${file}`);
    }
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (width < 100 || height < 60 || width > 4096 || height > 4096) fail(`unreadable or oversized PNG dimensions: ${file}`);
    record[phase] = hash(bytes);
    assets.push({ file, dataUrl: 'data:image/png;base64,' + bytes.toString('base64') });
  }
  if (record.before === record.after) fail(`v${entry.version} uses the same image for before and after.`);
  return record;
}

function collect(root) {
  const { appVersion, ledger, entries, visible } = readAudience(root);
  const updates = path.join(root, 'src', 'updates');
  const dictionary = readJson(path.join(root, 'src', 'i18n', 'strings-updates.json'));
  validateDictionary(dictionary);
  const lockFile = path.join(updates, 'release-history.lock.json');
  const lock = existsSync(lockFile) ? lockSchema.parse(readJson(lockFile))
    : { format: 1, publishedThrough: ledger[1]?.version ?? null, releases: {} };
  const records = {}, assets = [], privateAssets = [], privateStrings = new Set();
  const publicCopies = new Set(entries.flatMap(copies));
  const publicImages = new Set(entries.flatMap(entry => [entry.before.file, entry.after.file]));
  for (const file of readdirSync(path.join(updates, 'release-images'))) {
    if (file.toLowerCase().endsWith('.png') && !publicImages.has(file)) {
      fail(`nonpublic or unreferenced image in public release-images: ${file}`);
    }
  }
  for (const classification of ledger) {
    const entryVersion = classification.version;
    if (isProductUpdate(classification)) {
      records[entryVersion] = entryRecord(visible.get(entryVersion), dictionary, path.join(updates, 'release-images'), assets);
      continue;
    }
    privateStrings.add(classification.reason);
    if (!classification.withdrawnIn) {
      // The existing lock's internal marker denotes a nonpublic history record.
      records[entryVersion] = { entry: hash(JSON.stringify(classification)), internal: true };
      continue;
    }
    const sealed = lock.releases[entryVersion];
    if (!sealed?.before || !sealed.after || !lock.publishedThrough || compare(entryVersion, lock.publishedThrough) > 0) {
      fail(`only a previously published public entry can be archived: v${entryVersion}`);
    }
    const directory = path.join(root, 'releases', 'archive', entryVersion);
    const archived = archivedEntrySchema.parse(readJson(path.join(directory, 'entry.json')));
    if (archived.version !== entryVersion || archived.date !== classification.date) fail(`archive identity mismatch: v${entryVersion}`);
    const translations = readJson(path.join(directory, 'strings.json'));
    validateDictionary(translations);
    records[entryVersion] = entryRecord(archived, translations, directory, privateAssets);
    for (const copy of copies(archived)) {
      if (publicCopies.has(copy)) continue;
      if (Object.hasOwn(dictionary, copy)) fail(`nonpublic release copy remains in public translations: ${copy}`);
      // Generic category words may occur elsewhere in the editor. The public
      // schema rejects Fix; only unique announcement copy is checked in bundles.
      if (copy === archived.category) continue;
      privateStrings.add(copy);
      for (const translation of Object.values(translations[copy])) privateStrings.add(translation);
    }
  }
  for (const [copy, row] of Object.entries(dictionary)) {
    privateStrings.delete(copy);
    for (const translation of Object.values(row)) privateStrings.delete(translation);
  }
  for (const [lockedVersion, record] of Object.entries(lock.releases)) {
    if (!lock.publishedThrough || compare(lockedVersion, lock.publishedThrough) > 0) continue;
    if (!records[lockedVersion]) fail(`previously sealed v${lockedVersion} was removed.`);
    if (['entry', 'before', 'after', 'internal'].some(key => records[lockedVersion][key] !== record[key])) {
      fail(`previously sealed v${lockedVersion} or its images changed. Do not rewrite released history.`);
    }
  }
  if (Object.keys(lock.releases).length && lock.publishedThrough &&
      ledger.some(record => !lock.releases[record.version] && compare(record.version, lock.publishedThrough) <= 0)) {
    fail('only newer releases may be appended to the sealed history.');
  }
  const source = sourceDigest(root);
  if (lock.publishedThrough && compare(appVersion, lock.publishedThrough) <= 0 && lock.releases[appVersion]?.source !== source) {
    fail('application code changed after publication. Bump APP_VERSION and add a release classification.');
  }
  for (const entryVersion of Object.keys(records)) {
    if (lock.releases[entryVersion]?.source) records[entryVersion].source = lock.releases[entryVersion].source;
  }
  records[appVersion].source = source;
  return {
    version: appVersion, count: entries.length, records, lock, lockFile, assets, privateAssets, privateStrings,
    digest: hash(JSON.stringify({ version: appVersion, records, dictionary, ledger })),
  };
}

export function checkReleaseHistory(root = defaultRoot) {
  const result = collect(root);
  for (const entryVersion of Object.keys(result.records)) {
    if (!result.lock.releases[entryVersion]) fail(`v${entryVersion} is not sealed. Review its classification and any public entry, then run npm run release:seal.`);
    if (JSON.stringify(result.lock.releases[entryVersion]) !== JSON.stringify(result.records[entryVersion])) {
      fail(`candidate v${entryVersion} changed after sealing. Review it and run npm run release:seal again.`);
    }
  }
  return { version: result.version, digest: result.digest, count: result.count };
}

export function sealReleaseHistory(root = defaultRoot) {
  const result = collect(root);
  writeLock(result.lockFile, { format: 1, publishedThrough: result.lock.publishedThrough, releases: result.records });
  return checkReleaseHistory(root);
}

function writeLock(file, lock) {
  const pending = file + '.' + randomUUID() + '.pending';
  try {
    writeFileSync(pending, JSON.stringify(lock, null, 2) + '\n', { flag: 'wx' });
    renameSync(pending, file);
  } finally {
    if (existsSync(pending)) unlinkSync(pending);
  }
}

export function verifyReleaseBundle(html, root = defaultRoot) {
  const checked = checkReleaseHistory(root);
  const markers = [...html.matchAll(/<meta\s+name="nds-release-history"\s+content="([^"]+)"\s*\/?>/g)];
  if (markers.length !== 1 || markers[0][1] !== `${checked.version}:${checked.digest}`) {
    fail('bundle version/history stamp is missing or stale. Rebuild before publishing.');
  }
  for (const marker of ['data-nds-updates-dialog', 'data-nds-release-version']) {
    if (!html.includes(marker)) fail(`bundle is missing the history UI: ${marker}`);
  }
  const result = collect(root);
  const publicImages = new Set(result.assets.map(asset => asset.dataUrl));
  for (const asset of result.assets) {
    if (!html.includes(asset.dataUrl)) fail(`bundle is missing its offline image: ${path.basename(asset.file)}`);
  }
  for (const asset of result.privateAssets) {
    if (!publicImages.has(asset.dataUrl) && html.includes(asset.dataUrl)) fail(`bundle contains a nonpublic release image: ${path.basename(asset.file)}`);
  }
  for (const copy of result.privateStrings) {
    if (html.includes(copy) || html.includes(JSON.stringify(copy).slice(1, -1))) fail('bundle contains nonpublic release communication.');
  }
  return checked;
}

export function markReleasePublished(root = defaultRoot) {
  const checked = checkReleaseHistory(root);
  const production = path.resolve(root, '..');
  verifyReleaseBundle(readFileSync(path.join(production, 'index.html'), 'utf8'), root);
  const launcher = readFileSync(path.join(production, 'Network Diagram Studio.bat'), 'utf8');
  if (!launcher.includes(checked.version) || !launcher.includes('%~dp0index.html') || launcher.replaceAll('\r\n', '').includes('\n')) {
    fail('update the adjacent production launcher to the same version, preserving CRLF.');
  }
  for (const name of ['README.md', 'README.txt']) {
    if (!readFileSync(path.join(production, name), 'utf8').includes(`v${checked.version}`)) fail(`update the production ${name} to the same version.`);
  }
  const result = collect(root);
  writeLock(result.lockFile, { format: 1, publishedThrough: checked.version, releases: result.records });
  return checkReleaseHistory(root);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length > 3 || process.argv.slice(2).some(arg => arg !== '--seal')) {
      fail('supported usage: check-release-history.mjs [--seal]. Publish through npm run release:publish.');
    }
    const result = process.argv.includes('--seal') ? sealReleaseHistory() : checkReleaseHistory();
    console.log(`PASS v${result.version}: ${result.count} sealed, localized product updates; fixes and internal releases stay out of What's new.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
