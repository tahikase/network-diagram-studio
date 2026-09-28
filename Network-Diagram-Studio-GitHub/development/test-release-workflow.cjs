const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readReleaseFixture } = require('./test-release-fixture.cjs');

async function main() {
  const api = await import(pathToFileURL(path.join(__dirname, 'scripts', 'release.mjs')).href);
  const gate = await import(pathToFileURL(path.join(__dirname, 'scripts', 'check-release-history.mjs')).href);
  const { wireRuntimeHtml, runtimeTags } =
    await import(pathToFileURL(path.join(__dirname, 'scripts', 'patch-sidecars.mjs')).href);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-release-workflow-'));
  const project = path.join(base, 'A renamed shared project');
  const root = path.join(project, 'development');
  const inputs = path.join(root, 'package');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const json = value => JSON.stringify(value, null, 2) + '\n';
  function write(file, bytes) {
    assert(file.startsWith(base + path.sep));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
  function cleanup(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) cleanup(file);
      else fs.unlinkSync(file);
    }
    fs.rmdirSync(directory);
  }
  try {
    const fixture = readReleaseFixture();
    const { entries, appVersion: version } = fixture;
    const images = [];
    for (const name of ['updates/release-history.json', 'i18n/strings-updates.json']) {
      write(path.join(root, 'src', name), fs.readFileSync(path.join(__dirname, 'src', name)));
    }
    for (const [relative, bytes] of fixture.files) write(path.join(root, relative), bytes);
    write(path.join(root, 'src', 'updates', 'release-history.lock.json'), json(fixture.lock));
    for (const entry of entries) for (const phase of ['before', 'after']) {
      const bytes = fs.readFileSync(path.join(__dirname, 'src', 'updates', 'release-images', entry[phase].file));
      write(path.join(root, 'src', 'updates', 'release-images', entry[phase].file), bytes);
      images.push('data:image/png;base64,' + bytes.toString('base64'));
    }
    write(path.join(root, 'src', 'version.ts'), `export const APP_VERSION = '${version}';\n`);
    write(path.join(root, 'src', 'fixture.ts'), 'export const fixture = true;\n');
    for (const tag of runtimeTags) write(path.join(inputs, tag.match(/(?:src|href)="\.\/([^"?]+)/)[1]), 'fixture asset');
    for (const name of ['README.md', 'README.txt']) write(path.join(inputs, name), 'Production v{{VERSION}}\n');
    write(path.join(inputs, 'Network Diagram Studio.bat'), '@echo off\r\nrem v{{VERSION}}\r\nstart "" "%~dp0index.html"\r\n');
    for (const name of ['AGENTS.md', 'LICENSE', 'THIRD-PARTY-NOTICES.txt']) write(path.join(inputs, name), 'fixture ' + name);
    gate.sealReleaseHistory(root);
    for (const name of ['index.html', ...Object.keys(api.inventory(inputs))]) write(path.join(project, name), 'previous ' + name);
    const before = Object.fromEntries(['index.html', ...Object.keys(api.inventory(inputs))]
      .map(name => [name, fs.readFileSync(path.join(project, name))]));
    const assertIntact = () => {
      for (const [name, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(project, name)), bytes, name);
    };
    const lock = path.join(root, 'src', 'updates', 'release-history.lock.json');
    const lockBefore = fs.readFileSync(lock);
    const dictionary = path.join(root, 'src', 'i18n', 'strings-updates.json');
    const originalDictionary = fs.readFileSync(dictionary);
    const incomplete = JSON.parse(originalDictionary);
    delete incomplete[entries[0].title].ja;
    write(dictionary, json(incomplete));
    await assert.rejects(api.buildCandidate(root), /seven non-English/);
    assertIntact();
    assert.equal(fs.existsSync(path.join(root, '.release')), false, 'invalid history fails before build output');
    write(dictionary, originalDictionary);
    const historyFile = path.join(root, 'src', 'updates', 'release-history.json');
    const originalHistory = fs.readFileSync(historyFile);
    const bugEntry = structuredClone(entries); bugEntry[0].category = 'Fix';
    write(historyFile, json(bugEntry));
    await assert.rejects(api.buildCandidate(root), /bug-fix categories are not allowed/);
    assertIntact();
    assert.equal(fs.existsSync(path.join(root, '.release')), false, 'bug announcements fail before build output');
    write(historyFile, originalHistory);
    const ledgerFile = path.join(root, 'releases', 'release-records.json');
    const originalLedger = fs.readFileSync(ledgerFile);
    const wrongLedger = fixture.ledger.map(record => record.version === entries[0].version
      ? { version: record.version, date: record.date, kind: 'fix', reason: 'Fixture repair of expected behavior.' } : record);
    write(ledgerFile, json(wrongLedger));
    await assert.rejects(api.buildCandidate(root), /fix.*must not appear in What's new/);
    assertIntact();
    assert.equal(fs.existsSync(path.join(root, '.release')), false);
    write(ledgerFile, originalLedger);

    function candidate(accepted = true) {
      const id = randomUUID();
      const directory = path.join(root, '.release', 'builds', id);
      const output = path.join(directory, 'package');
      for (const name of Object.keys(api.inventory(inputs))) {
        const bytes = fs.readFileSync(path.join(inputs, name));
        write(path.join(output, name), /README\.(md|txt)$|\.bat$/.test(name)
          ? bytes.toString('utf8').replaceAll('{{VERSION}}', version) : bytes);
      }
      const checked = gate.checkReleaseHistory(root);
      const html = `<html><head><link rel="icon" href="data:image/svg+xml,%3Csvg/%3E"><title>Fixture</title>` +
        `<meta name="nds-release-history" content="${checked.version}:${checked.digest}"></head>` +
        '<body><script type="module">/* fixture */</script>data-nds-updates-dialog data-nds-release-version' +
        images.join('\n') + '</body></html>';
      write(path.join(output, 'index.html'), wireRuntimeHtml(html, output));
      const manifest = api.recordCandidate(root, directory, id);
      if (accepted) write(path.join(directory, 'accepted.json'), json({ manifestHash: sha(json(manifest)), checks: api.releaseChecks }));
      return { directory, manifest };
    }

    let current = candidate(false);
    api.verifyCandidate(root);
    await assert.rejects(api.publishCandidate(root, () => {}), /ENOENT/);
    assertIntact();
    current = candidate();
    write(historyFile, json(bugEntry));
    await assert.rejects(api.publishCandidate(root, () => {}), /bug-fix categories are not allowed/);
    assertIntact();
    write(historyFile, originalHistory);
    current = candidate();
    write(path.join(current.directory, 'package', 'index.html'), 'tampered candidate');
    assert.throws(() => api.verifyCandidate(root), /changed after building/);
    assertIntact();
    current = candidate();
    const runtime = path.join(inputs, 'production_editor', 'connectors.js');
    const runtimeBefore = fs.readFileSync(runtime);
    write(runtime, 'unsealed runtime change');
    assert.throws(() => api.verifyCandidate(root), /changed after sealing/);
    write(runtime, runtimeBefore);
    write(path.join(project, 'index.html'), 'concurrent installed edit');
    await assert.rejects(api.publishCandidate(root, () => {}), /Installed file changed since build/);
    assert.equal(fs.readFileSync(path.join(project, 'index.html'), 'utf8'), 'concurrent installed edit');
    write(path.join(project, 'index.html'), before['index.html']);

    candidate();
    await assert.rejects(api.publishCandidate(root, () => { throw new Error('Injected installed check failure'); }),
      /Injected installed check failure[\s\S]*Publication rolled back/);
    assertIntact();
    assert.deepEqual(fs.readFileSync(lock), lockBefore);

    candidate();
    await assert.rejects(api.publishCandidate(root, () => {
      write(path.join(project, 'README.md'), 'concurrent documentation edit');
      throw new Error('Injected conflict');
    }), /Rollback preserved concurrent edits: README.md/);
    assert.equal(fs.readFileSync(path.join(project, 'README.md'), 'utf8'), 'concurrent documentation edit');
    write(path.join(project, 'README.md'), before['README.md']);
    assertIntact();

    current = candidate();
    await api.publishCandidate(root, () => {});
    for (const [name, expected] of Object.entries(current.manifest.files)) {
      assert.equal(sha(fs.readFileSync(path.join(project, name))), expected);
    }
    assert.equal(JSON.parse(fs.readFileSync(lock)).publishedThrough, version);
    assert(fs.existsSync(path.join(current.directory, 'published.json')));
    assert.deepEqual(fs.readdirSync(base), ['A renamed shared project'], 'no second project or named sibling was needed or created');
    write(path.join(root, 'src', 'fixture.ts'), 'export const fixture = false;');
    assert.throws(() => gate.sealReleaseHistory(root), /Bump APP_VERSION/);
    console.log('PASS independent relative paths, failed-build preservation, sealed runtime assets, stale/unaccepted candidates');
    console.log('PASS concurrency refusal, owned-write rollback, retained external edits and finalized production-only history');
    console.log('PASS product-only history blocks bug-fix announcements before building or publishing');
  } finally { cleanup(base); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
