import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkReleaseHistory, markReleasePublished, verifyReleaseBundle } from './check-release-history.mjs';
import { verifyRuntimeWiring, wireProductionBundle } from './patch-sidecars.mjs';

const defaultRoot = fileURLToPath(new URL('..', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const jsonBytes = value => JSON.stringify(value, null, 2) + '\n';
const templates = new Set(['README.md', 'README.txt', 'Network Diagram Studio.bat']);
const allowed = /^(?:index\.html|AGENTS\.md|README\.(?:md|txt)|Network Diagram Studio\.bat|LICENSE|THIRD-PARTY-NOTICES\.txt|(?:production_(?:arm|demo|editor|vendor)|desktop|licenses)\/.+)$/;
const suite = [
  'test-release-history.cjs', 'test-release-workflow.cjs', 'test-runtime-build.cjs',
  'test-production-launcher.cjs', 'test-public-build.cjs', 'test-updates.cjs',
  'test-all-icons-layout.cjs', 'test-settings-bounds.cjs', 'test-group-header-fields.cjs', 'test-shape-text-format.cjs',
  'test-database-shape.cjs', 'test-shape-connector-selection.cjs', 'test-object-selection.cjs', 'test-tab-order.cjs',
  'test-canvas-chrome.cjs', 'test-studiofile.cjs', 'test-screenshot-shapes.cjs',
  'test-demo-video.cjs', 'test-canvas-motion.cjs',
];
export const releaseChecks = [...suite];
const installedSuite = ['test-production-launcher.cjs', 'test-public-build.cjs', 'test-updates.cjs', 'test-group-header-fields.cjs', 'test-shape-text-format.cjs', 'test-database-shape.cjs', 'test-shape-connector-selection.cjs', 'test-object-selection.cjs'];

function localPath(base, relative) {
  if (!relative || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe package path: ${relative}`);
  }
  const result = path.resolve(base, relative);
  const within = path.relative(base, result);
  if (!within || within.startsWith('..') || path.isAbsolute(within)) throw new Error(`Path escapes its project: ${relative}`);
  for (let current = result; current !== path.resolve(base); current = path.dirname(current)) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`Linked release path: ${current}`);
  }
  return result;
}

function digestFile(file) {
  if (!existsSync(file)) return null;
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular file: ${file}`);
  return hash(readFileSync(file));
}

export function inventory(directory) {
  const result = {};
  function visit(current) {
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Linked package input: ${current}`);
    for (const item of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const file = path.join(current, item.name);
      if (item.isSymbolicLink()) throw new Error(`Linked package input: ${file}`);
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) result[path.relative(directory, file).replaceAll('\\', '/')] = digestFile(file);
      else throw new Error(`Unsupported package input: ${file}`);
    }
  }
  visit(directory);
  return result;
}

function atomicWrite(file, bytes) {
  const pending = file + '.' + randomUUID() + '.pending';
  mkdirSync(path.dirname(file), { recursive: true });
  try {
    writeFileSync(pending, bytes, { flag: 'wx' });
    renameSync(pending, file);
  } finally {
    if (existsSync(pending)) unlinkSync(pending);
  }
}

function same(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message);
}

function assertPackageFiles(files) {
  for (const file of Object.keys(files)) {
    if (!allowed.test(file)) throw new Error(`Unreviewed package output: ${file}`);
    if (file.includes('\\') || file.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error(`Unsafe package path: ${file}`);
    }
  }
  for (const file of ['index.html', 'AGENTS.md', 'README.md', 'README.txt', 'Network Diagram Studio.bat', 'LICENSE', 'THIRD-PARTY-NOTICES.txt']) {
    if (!files[file]) throw new Error(`Incomplete package: ${file}`);
  }
}

function readCandidate(root) {
  const release = localPath(root, '.release');
  const pointer = readJson(path.join(release, 'latest.json'));
  if (!/^[a-f0-9-]{36}$/.test(pointer.id)) throw new Error('Invalid candidate ID. Run npm run build.');
  const directory = localPath(root, `.release/builds/${pointer.id}`);
  return { directory, manifest: readJson(path.join(directory, 'manifest.json')) };
}

export function recordCandidate(root, directory, id) {
  const checked = checkReleaseHistory(root);
  const files = inventory(path.join(directory, 'package'));
  assertPackageFiles(files);
  const installed = path.resolve(root, '..');
  const baseline = Object.fromEntries(Object.keys(files).map(file => [file, digestFile(localPath(installed, file))]));
  const manifest = { format: 1, id, version: checked.version, releaseDigest: checked.digest, files, baseline };
  atomicWrite(path.join(directory, 'manifest.json'), jsonBytes(manifest));
  atomicWrite(localPath(root, '.release/latest.json'), jsonBytes({ id }));
  return manifest;
}

export function verifyCandidate(root = defaultRoot) {
  const { directory, manifest } = readCandidate(root);
  const checked = checkReleaseHistory(root);
  if (manifest.format !== 1 || manifest.id !== path.basename(directory) ||
      manifest.version !== checked.version || manifest.releaseDigest !== checked.digest) {
    throw new Error('Candidate inputs changed. Review, seal and build again.');
  }
  assertPackageFiles(manifest.files);
  same(Object.keys(manifest.baseline), Object.keys(manifest.files), 'Candidate baseline is incomplete.');
  same(inventory(path.join(directory, 'package')), manifest.files, 'Candidate package changed after building.');
  const packaged = path.join(directory, 'package');
  const html = readFileSync(path.join(packaged, 'index.html'), 'utf8');
  verifyReleaseBundle(html, root);
  verifyRuntimeWiring(html, packaged);
  for (const file of templates) {
    const contents = readFileSync(path.join(packaged, file), 'utf8');
    if (!contents.includes(`v${checked.version}`) || contents.includes('{{VERSION}}')) {
      throw new Error(`Package version is missing or stale: ${file}`);
    }
    if (file.endsWith('.bat') && (!contents.includes('%~dp0index.html') || contents.replaceAll('\r\n', '').includes('\n'))) {
      throw new Error('The production launcher must retain its relative entry path and CRLF.');
    }
  }
  return { directory, manifest };
}

function run(root, args, logfile, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  const output = [result.stdout, result.stderr, result.error?.stack].filter(Boolean).join('\n');
  if (logfile) {
    mkdirSync(path.dirname(logfile), { recursive: true });
    writeFileSync(logfile, output);
  }
  if (result.error || result.status !== 0) {
    throw new Error(`${path.basename(args[0])} failed (${result.status ?? result.signal}).\n${output}`);
  }
}

export async function buildCandidate(root = defaultRoot) {
  const checked = checkReleaseHistory(root);
  const require = createRequire(path.join(root, 'package.json'));
  run(root, [require.resolve('typescript/bin/tsc'), '-b']);
  const id = randomUUID();
  const directory = localPath(root, `.release/builds/${id}`);
  const output = path.join(directory, 'package');
  mkdirSync(output, { recursive: true });
  const inputs = path.join(root, 'package');
  for (const file of Object.keys(inventory(inputs))) {
    if (!allowed.test(file) || file === 'index.html') throw new Error(`Unexpected package template: ${file}`);
    const source = localPath(inputs, file);
    const destination = localPath(output, file);
    let bytes = readFileSync(source);
    if (templates.has(file)) {
      const text = bytes.toString('utf8');
      if (!text.includes('{{VERSION}}')) throw new Error(`Version template is missing: ${file}`);
      const rendered = text.replaceAll('{{VERSION}}', checked.version);
      bytes = Buffer.from(file.endsWith('.bat') ? rendered.replace(/\r?\n/g, '\r\n') : rendered);
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, bytes, { flag: 'wx' });
  }
  const { build } = await import('vite');
  await build({
    root, configFile: path.join(root, 'vite.config.ts'), mode: 'public',
    build: { outDir: output, emptyOutDir: false },
  });
  if (checkReleaseHistory(root).digest !== checked.digest) throw new Error('Source changed during build; installed app was not touched.');
  const raw = path.join(output, 'index.public.html');
  const html = wireProductionBundle(readFileSync(raw, 'utf8'), output, root);
  writeFileSync(path.join(output, 'index.html'), html, { flag: 'wx' });
  unlinkSync(raw);
  recordCandidate(root, directory, id);
  verifyCandidate(root);
  console.log(`Staged v${checked.version}: ${path.join(output, 'index.html')}\nInstalled production was not changed.`);
  return directory;
}

function runSuite(root, directory, target, tests) {
  for (const test of tests) {
    const args = [path.join(root, test)];
    if (!['test-release-history.cjs', 'test-release-workflow.cjs', 'test-runtime-build.cjs'].includes(test)) {
      args.push(path.join(target, test === 'test-production-launcher.cjs' ? 'Network Diagram Studio.bat' : 'index.html'));
    }
    run(root, args, path.join(directory, 'logs', `${path.basename(target)}-${test}.log`), {
      NDS_BUNDLE: path.join(target, 'index.html'),
    });
    console.log(`PASS ${test}`);
  }
}

export function verifyCandidateTests(root = defaultRoot) {
  const { directory, manifest } = verifyCandidate(root);
  const receipt = path.join(directory, 'accepted.json');
  if (existsSync(receipt)) unlinkSync(receipt);
  runSuite(root, directory, path.join(directory, 'package'), suite);
  verifyCandidate(root);
  atomicWrite(receipt, jsonBytes({ manifestHash: hash(jsonBytes(manifest)), checks: suite }));
  console.log(`Verified v${manifest.version}. Publishing still requires npm run release:publish.`);
}

export async function publishCandidate(root = defaultRoot, verifyInstalled = runSuite) {
  const { directory, manifest } = verifyCandidate(root);
  const receipt = readJson(path.join(directory, 'accepted.json'));
  if (receipt.manifestHash !== hash(jsonBytes(manifest))) throw new Error('Candidate acceptance is stale; run npm run release:verify.');
  same(receipt.checks, suite, 'Candidate did not pass the current release checks.');
  const installed = path.resolve(root, '..');
  for (const [file, expected] of Object.entries(manifest.baseline)) {
    if (digestFile(localPath(installed, file)) !== expected) {
      throw new Error(`Installed file changed since build: ${file}. Rebuild without overwriting that change.`);
    }
  }
  const lockFile = path.join(root, 'src', 'updates', 'release-history.lock.json');
  const lockBefore = readFileSync(lockFile);
  const expectedLock = Buffer.from(jsonBytes({ ...JSON.parse(lockBefore), publishedThrough: manifest.version }));
  const backup = path.join(directory, 'backup');
  if (existsSync(backup)) throw new Error('This candidate already has a publication attempt. Build a new candidate.');
  mkdirSync(backup);
  const changed = [];
  try {
    for (const [file, after] of Object.entries(manifest.files)) {
      const before = manifest.baseline[file];
      if (before === after) continue;
      const destination = localPath(installed, file);
      if (digestFile(destination) !== before) throw new Error(`Concurrent installed change: ${file}`);
      if (before !== null) {
        const copy = localPath(backup, file);
        mkdirSync(path.dirname(copy), { recursive: true });
        copyFileSync(destination, copy);
        if (digestFile(copy) !== before) throw new Error(`Backup changed while copying: ${file}`);
      }
      atomicWrite(destination, readFileSync(localPath(path.join(directory, 'package'), file)));
      changed.push(file);
    }
    for (const [file, expected] of Object.entries(manifest.files)) {
      if (digestFile(localPath(installed, file)) !== expected) throw new Error(`Installed package mismatch: ${file}`);
    }
    await verifyInstalled(root, directory, installed, installedSuite);
    verifyCandidate(root);
    markReleasePublished(root);
    atomicWrite(path.join(directory, 'published.json'), jsonBytes({
      version: manifest.version, releaseDigest: manifest.releaseDigest, files: manifest.files,
      changed, completedAt: new Date().toISOString(),
    }));
  } catch (error) {
    const conflicts = [];
    if (digestFile(lockFile) !== hash(lockBefore)) {
      if (digestFile(lockFile) === hash(expectedLock)) atomicWrite(lockFile, lockBefore);
      else conflicts.push('release-history.lock.json');
    }
    for (const file of changed.reverse()) {
      const destination = localPath(installed, file);
      if (digestFile(destination) !== manifest.files[file]) { conflicts.push(file); continue; }
      if (manifest.baseline[file] === null) unlinkSync(destination);
      else atomicWrite(destination, readFileSync(localPath(backup, file)));
    }
    throw new Error(`${error instanceof Error ? error.message : error}\n` +
      (conflicts.length ? `Rollback preserved concurrent edits: ${conflicts.join(', ')}. Backups: ${backup}` : 'Publication rolled back; the previous application is intact.'));
  }
  console.log(`Published v${manifest.version} to ${installed}. No other project was read or written.`);
}

async function main() {
  const operation = process.argv[2];
  if (process.argv.length !== 3 || !['build', 'verify', 'publish'].includes(operation)) {
    throw new Error('Use npm run build, npm run release:verify or npm run release:publish.');
  }
  checkReleaseHistory(defaultRoot);
  const release = localPath(defaultRoot, '.release');
  mkdirSync(release, { recursive: true });
  const lock = path.join(release, 'operation.lock');
  if (existsSync(lock)) throw new Error(`Another release operation may be running. Inspect ${lock} before removing a stale lock.`);
  const token = jsonBytes({ pid: process.pid, operation, id: randomUUID() });
  writeFileSync(lock, token, { flag: 'wx' });
  try {
    if (operation === 'build') await buildCandidate();
    else if (operation === 'verify') verifyCandidateTests();
    else await publishCandidate();
  } finally {
    if (existsSync(lock) && readFileSync(lock, 'utf8') === token) unlinkSync(lock);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
