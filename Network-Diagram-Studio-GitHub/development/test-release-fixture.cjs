const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readReleaseFixture() {
  const entries = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'updates', 'release-history.json')));
  const dictionary = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'i18n', 'strings-updates.json')));
  const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, 'releases', 'release-records.json')));
  const appVersion = /export const APP_VERSION = '([^']+)';/.exec(fs.readFileSync(path.join(__dirname, 'src', 'version.ts'), 'utf8'))[1];
  const lock = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'updates', 'release-history.lock.json')));
  assert.equal(ledger[0].version, appVersion);
  lock.publishedThrough = ledger[1]?.version ?? null;
  delete lock.releases[appVersion];
  const files = new Map();
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), 'release fixtures must be local files');
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else files.set(path.relative(__dirname, file), fs.readFileSync(file));
    }
  }
  visit(path.join(__dirname, 'releases'));
  return { entries, dictionary, ledger, appVersion, lock, files };
}

module.exports = { readReleaseFixture };
