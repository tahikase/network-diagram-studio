const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readReleaseFixture } = require('./test-release-fixture.cjs');

async function main() {
  const { checkReleaseAudience, checkReleaseHistory, sealReleaseHistory, verifyReleaseBundle, markReleasePublished } =
    await import(pathToFileURL(path.join(__dirname, 'scripts', 'check-release-history.mjs')).href);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-release-history-'));
  const production = path.join(base, 'Shared Studio');
  const root = path.join(production, 'development');
  const files = new Set(), directories = new Set([root, production]);
  const fixture = readReleaseFixture();
  const { entries, dictionary, ledger, appVersion } = fixture;
  const manifestFile = path.join(root, 'src', 'updates', 'release-history.json');
  const lockFile = path.join(root, 'src', 'updates', 'release-history.lock.json');
  const dictionaryFile = path.join(root, 'src', 'i18n', 'strings-updates.json');
  const ledgerFile = path.join(root, 'releases', 'release-records.json');
  const images = new Map();
  function write(file, bytes) {
    for (let dir = path.dirname(file); dir !== base; dir = path.dirname(dir)) {
      assert(dir.startsWith(base + path.sep));
      directories.add(dir);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes); files.add(file);
  }
  const json = (file, value) => write(file, JSON.stringify(value, null, 2));
  let originalLock = fixture.lock;
  function restore() {
    json(manifestFile, entries); json(dictionaryFile, dictionary);
    for (const [relative, bytes] of fixture.files) write(path.join(root, relative), bytes);
    write(path.join(root, 'src', 'version.ts'), `export const APP_VERSION = '${appVersion}';\n`);
    write(path.join(root, 'src', 'component.ts'), 'export const appearance = "original";\n');
    write(path.join(root, 'package', 'production_editor', 'example.js'), 'original runtime asset');
    for (const [file, bytes] of images) write(file, bytes);
    if (originalLock) json(lockFile, originalLock);
  }
  const rejected = (change, pattern, operation = checkReleaseHistory) => {
    restore(); change(); assert.throws(() => operation(root), pattern);
  };
  function bundle() {
    const checked = checkReleaseHistory(root);
    return `<html><head><meta name="nds-release-history" content="${checked.version}:${checked.digest}"></head><body>` +
      'data-nds-updates-dialog data-nds-release-version' +
      [...images.values()].map(bytes => 'data:image/png;base64,' + bytes.toString('base64')).join('\n') + '</body></html>';
  }
  try {
    for (const entry of entries) for (const phase of ['before', 'after']) {
      const filename = entry[phase].file;
      images.set(path.join(root, 'src', 'updates', 'release-images', filename),
        fs.readFileSync(path.join(__dirname, 'src', 'updates', 'release-images', filename)));
    }
    restore();
    assert.throws(() => checkReleaseHistory(root), /not sealed/);
    assert.equal(sealReleaseHistory(root).count, entries.length);
    files.add(lockFile);
    originalLock = JSON.parse(fs.readFileSync(lockFile));
    assert.equal(checkReleaseHistory(root).version, appVersion);
    for (const kind of ['ui', 'functionality']) {
      rejected(() => {
        const changed = structuredClone(entries); changed[0].category = 'Fix';
        const classifications = structuredClone(ledger);
        const record = classifications.find(record => record.version === changed[0].version);
        record.kind = kind;
        json(manifestFile, changed); json(ledgerFile, classifications);
      }, /bug-fix categories are not allowed/, checkReleaseAudience);
    }
    restore();
    const body = bundle();
    assert.equal(verifyReleaseBundle(body, root).version, appVersion);
    assert.throws(() => verifyReleaseBundle(body.replace('name="nds-release-history"', 'name="missing"'), root), /stamp is missing or stale/);
    assert.throws(() => verifyReleaseBundle(body.replace('data-nds-updates-dialog', 'no-dialog'), root), /missing the history UI/);
    assert.throws(() => verifyReleaseBundle(body.replace([...images.values()][0].toString('base64'), 'missing'), root), /missing its offline image/);
    rejected(() => write(path.join(root, 'src', 'version.ts'), "export const APP_VERSION = '99.0.0';"), /newest release classification must match/);
    rejected(() => { const changed = structuredClone(entries); changed[0].description = ''; json(manifestFile, changed); }, /Too small|>=1/);
    rejected(() => { const changed = structuredClone(entries); changed[0].date = '2026-02-30'; json(manifestFile, changed); }, /real calendar date/);
    rejected(() => { const changed = structuredClone(entries); changed[0].style = 'color:red'; json(manifestFile, changed); }, /Unrecognized key/);
    rejected(() => { const changed = structuredClone(entries); changed[0].after.file = '..\\private.png'; json(manifestFile, changed); }, /Invalid string/);
    rejected(() => { const changed = structuredClone(entries); changed[1].version = changed[0].version; json(manifestFile, changed); }, /unique versions/);
    rejected(() => fs.unlinkSync([...images.keys()][0]), /missing before image/);
    rejected(() => write([...images.keys()][0], 'Not a PNG'), /invalid PNG/);
    rejected(() => { const changed = structuredClone(dictionary); delete changed[entries[0].title].ja; json(dictionaryFile, changed); }, /seven non-English/);
    rejected(() => { const changed = structuredClone(dictionary); changed['Release {position} of {count}'].ja = '{position}'; json(dictionaryFile, changed); }, /placeholder mismatch/);
    rejected(() => json(manifestFile, entries.slice(0, -1)), /needs a complete public history entry/);
    rejected(() => { const changed = structuredClone(entries); changed[1].note = changed[0].note; json(manifestFile, changed); }, /previously sealed.*changed/);
    rejected(() => { const file = [...images.keys()][2], bytes = Buffer.from(images.get(file)); bytes[bytes.length - 1] ^= 1; write(file, bytes); }, /previously sealed.*changed/);
    rejected(() => write(path.join(root, 'src', 'component.ts'), 'export const appearance = "candidate edit";'), /changed after sealing/);
    assert.equal(sealReleaseHistory(root).version, appVersion, 'unpublished candidates can be reviewed and re-sealed');
    rejected(() => write(path.join(root, 'package', 'production_editor', 'example.js'), 'changed runtime asset'), /changed after sealing/);
    rejected(() => fs.unlinkSync(ledgerFile), /ENOENT/);
    rejected(() => {
      const changed = structuredClone(ledger); changed[0].kind = 'packaging'; json(ledgerFile, changed);
    }, /Invalid input/);
    rejected(() => {
      const changed = structuredClone(ledger);
      delete changed.find(record => ['ui', 'functionality'].includes(record.kind)).userImpact;
      json(ledgerFile, changed);
    }, /Invalid input/);
    rejected(() => {
      const changed = structuredClone(ledger);
      changed.find(record => ['ui', 'functionality'].includes(record.kind)).userImpact = '';
      json(ledgerFile, changed);
    }, /Too small|>=1/);
    rejected(() => json(ledgerFile, ledger.filter(record => record.version !== entries.at(-1).version)), /is unclassified/);
    for (const hidden of ledger.filter(record => ['fix', 'internal'].includes(record.kind))) {
      rejected(() => {
        const wrong = { ...structuredClone(entries[0]), version: hidden.version, date: hidden.date };
        json(manifestFile, ledger.map(record => record.version === hidden.version ? wrong
          : entries.find(entry => entry.version === record.version)).filter(Boolean));
      }, new RegExp(`${hidden.kind}.*must not appear in What's new`), checkReleaseAudience);
      if (!hidden.withdrawnIn) continue;
      const archiveDirectory = path.join(root, 'releases', 'archive', hidden.version);
      const archiveFile = path.join(archiveDirectory, 'entry.json');
      const archived = JSON.parse(fs.readFileSync(archiveFile));
      const image = path.join(root, 'src', 'updates', 'release-images', archived.before.file);
      rejected(() => write(image, fs.readFileSync(path.join(archiveDirectory, archived.before.file))),
        /nonpublic or unreferenced image/);
      fs.unlinkSync(image);
      rejected(() => {
        const changed = structuredClone(dictionary);
        changed[archived.title] = JSON.parse(fs.readFileSync(path.join(archiveDirectory, 'strings.json')))[archived.title];
        json(dictionaryFile, changed);
      }, /nonpublic release copy remains in public translations/);
      rejected(() => {
        const changed = structuredClone(archived); changed.date = '2026-09-23'; json(archiveFile, changed);
      }, /archive identity mismatch/);
      rejected(() => {
        const file = path.join(archiveDirectory, archived.after.file);
        const bytes = fs.readFileSync(file); bytes[bytes.length - 1] ^= 1; write(file, bytes);
      }, /previously sealed.*changed/);
      rejected(() => {
        const changed = structuredClone(ledger); delete changed.find(record => record.version === hidden.version).withdrawnIn;
        json(ledgerFile, changed);
      }, /previously sealed.*changed/);
      restore();
      assert.throws(() => verifyReleaseBundle(bundle() + archived.title, root), /contains nonpublic release communication/);
      assert.throws(() => verifyReleaseBundle(bundle() + 'data:image/png;base64,' +
        fs.readFileSync(path.join(archiveDirectory, archived.after.file)).toString('base64'), root), /nonpublic release image/);
    }
    restore();
    for (const category of ['New feature', 'Appearance', 'Usability', 'Performance']) {
      const changed = structuredClone(entries); changed[0].category = category; json(manifestFile, changed);
      assert.equal(checkReleaseAudience(root).count, entries.length, `${category}: real product updates remain allowed`);
    }
    restore();
    const future = { version: '99.0.0', date: ledger[0].date };
    for (const kind of ['fix', 'internal']) {
      restore();
      json(ledgerFile, [{ ...future, kind, reason: 'Nonpublic fixture release without a new product update.' }, ...ledger]);
      write(path.join(root, 'src', 'version.ts'), "export const APP_VERSION = '99.0.0';\n");
      assert.equal(sealReleaseHistory(root).count, entries.length, `${kind}: no public entry or invented screenshots are required`);
      assert.equal(checkReleaseHistory(root).version, future.version);
      assert.equal(verifyReleaseBundle(bundle(), root).count, entries.length, `${kind}: offline bundle contains only product history`);
    }
    json(ledgerFile, [{ version: future.version, date: future.date, kind: 'ui', userImpact: 'A visible fixture UI improvement.' }, ...ledger]);
    assert.throws(() => sealReleaseHistory(root), /product update v99.0.0 needs a complete public history entry/);
    const publicEntry = structuredClone(entries[0]);
    publicEntry.version = future.version; publicEntry.date = future.date;
    publicEntry.before = { ...publicEntry.before, file: '99.0.0-before.png', version: appVersion };
    publicEntry.after = { ...publicEntry.after, file: '99.0.0-after.png', version: future.version };
    json(manifestFile, [publicEntry, ...entries]);
    for (const phase of ['before', 'after']) {
      write(path.join(root, 'src', 'updates', 'release-images', `99.0.0-${phase}.png`),
        fs.readFileSync(path.join(root, 'src', 'updates', 'release-images', entries[0][phase].file)));
    }
    assert.equal(sealReleaseHistory(root).count, entries.length + 1, 'complete UI releases remain publishable');
    for (const phase of ['before', 'after']) fs.unlinkSync(path.join(root, 'src', 'updates', 'release-images', `99.0.0-${phase}.png`));
    restore();
    write(path.join(production, 'index.html'), bundle());
    write(path.join(production, 'Network Diagram Studio.bat'), `@echo off\r\nrem ${appVersion}\r\nstart "" "%~dp0index.html"\r\n`);
    write(path.join(production, 'README.md'), `Production v${appVersion}`);
    write(path.join(production, 'README.txt'), `Production v${appVersion}`);
    assert.equal(markReleasePublished(root).version, appVersion);
    assert.equal(JSON.parse(fs.readFileSync(lockFile)).publishedThrough, appVersion);
    const publishedLock = JSON.parse(fs.readFileSync(lockFile));
    originalLock = publishedLock;
    for (const corrected of ledger.filter(record => record.correctedIn)) {
      const entry = entries.find(entry => entry.version === corrected.version);
      const archive = path.join(root, 'releases', 'archive', corrected.version);
      rejected(() => {
        const changed = structuredClone(entries);
        changed.find(item => item.version === corrected.version).note = entries[1].note;
        json(manifestFile, changed);
      }, /previously published correction.*changed/, sealReleaseHistory);
      rejected(() => {
        const image = path.join(root, 'src', 'updates', 'release-images', entry.after.file);
        const bytes = fs.readFileSync(image); bytes[bytes.length - 1] ^= 1; write(image, bytes);
      }, /previously published correction.*changed/, sealReleaseHistory);
      rejected(() => {
        const changed = structuredClone(dictionary); changed[entry.title].ja = 'changed translation';
        json(dictionaryFile, changed);
      }, /previously published correction.*changed/, sealReleaseHistory);
      rejected(() => {
        const archived = JSON.parse(fs.readFileSync(path.join(archive, 'entry.json')));
        const image = path.join(archive, archived.before.file);
        const bytes = fs.readFileSync(image); bytes[bytes.length - 1] ^= 1; write(image, bytes);
      }, /previously sealed.*changed/, sealReleaseHistory);
      rejected(() => {
        const changed = structuredClone(ledger);
        changed.find(item => item.version === corrected.version).correctedIn = corrected.version;
        json(ledgerFile, changed);
      }, /later fix\/internal release/, checkReleaseAudience);
      restore();
      const archived = JSON.parse(fs.readFileSync(path.join(archive, 'entry.json')));
      assert.throws(() => verifyReleaseBundle(bundle() + archived.title, root), /contains nonpublic release communication/);
      assert.throws(() => verifyReleaseBundle(bundle() + 'data:image/png;base64,' +
        fs.readFileSync(path.join(archive, archived.after.file)).toString('base64'), root), /nonpublic release image/);
      assert.equal(checkReleaseHistory(root).count, entries.length, 'Correction preserves the public product count');
      for (const key of ['entry', 'before', 'after']) {
        assert.equal(publishedLock.releases[corrected.version][key], fixture.lock.releases[corrected.version][key],
          'Original published entry and image hashes remain protected');
      }
    }
    restore();
    write(path.join(root, 'src', 'component.ts'), 'export const appearance = "unversioned change";');
    assert.throws(() => checkReleaseHistory(root), /code changed after publication/);
    assert.throws(() => sealReleaseHistory(root), /Bump APP_VERSION/);
    console.log('PASS release entries, dates, translations, placeholders, PNGs, version ordering and immutable published history');
    console.log('PASS offline bundle stamps/images, sealed runtime assets, independent publication and mandatory version bumps');
    console.log('PASS product-only categories, excluded fixes/maintenance, immutable archives, bundle-leak rejection and future fix/internal/product builds');
    console.log('PASS authorized announcement corrections, immutable originals/corrected content/translations and no new product announcement');
  } finally {
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    for (const dir of [...directories].sort((a, b) => b.length - a.length)) if (fs.existsSync(dir)) fs.rmdirSync(dir);
    fs.rmdirSync(base);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
