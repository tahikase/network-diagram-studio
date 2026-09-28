const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const { runtimeTags, wireProductionBundle, verifyRuntimeWiring } =
    await import(pathToFileURL(path.join(__dirname, 'scripts', 'patch-sidecars.mjs')).href);
  const html = fs.readFileSync(process.env.NDS_BUNDLE || path.join(__dirname, '..', 'index.html'), 'utf8');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-production-wiring-'));
  const files = new Set(), directories = new Set();
  function write(relative, bytes) {
    const file = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes); files.add(file);
    for (let dir = path.dirname(file); dir !== fixture; dir = path.dirname(dir)) directories.add(dir);
    return file;
  }
  try {
    assert.equal(runtimeTags.length, 30);
    for (const tag of runtimeTags) write(tag.match(/(?:src|href)="\.\/([^"?]+)/)[1], 'fixture asset');
    let raw = html;
    for (const tag of runtimeTags) {
      assert.equal(raw.split(tag).length, 2, `one reference: ${tag}`);
      raw = raw.replace(tag, tag.includes('rel="icon"') ? '<link rel="icon" href="data:image/svg+xml,%3Csvg/%3E">' : '');
    }
    const sentinel = write('index.html', 'Existing installed application');
    const wire = source => wireProductionBundle(source, fixture, __dirname);
    assert.throws(() => wire(raw.replace(/<meta name="nds-release-history" content="[^"]+"\s*\/?>/, '')), /stamp is missing or stale/);
    assert.throws(() => wire(raw.replaceAll('ndsProductionConnectors', 'missingConnectorBridge')), /Missing production runtime bridges/);
    const missing = path.join(fixture, 'production_editor', 'connectors.js');
    fs.unlinkSync(missing);
    assert.throws(() => wire(raw), /ENOENT/);
    write('production_editor/connectors.js', 'fixture asset');
    const wired = wire(raw);
    verifyRuntimeWiring(wired, fixture);
    assert.equal(wire(wired), wired, 'wiring is idempotent');
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'Existing installed application', 'wiring never publishes');
    const historical = raw.replaceAll('__ndsProductionCapture', '__ndsNonProdCapture')
      .replaceAll('ndsProduction', 'ndsNonProduction').replaceAll('nds-production-notes', 'nds-nonprod-notes');
    assert.equal(wire(historical), wired, 'source ABI adaptation matches existing production');
    for (const corrupt of [
      wired.replace(runtimeTags[1], ''),
      wired.replace(runtimeTags[1], runtimeTags[1] + runtimeTags[1]),
      wired.replace(runtimeTags[1], '__TEST_TAG__').replace(runtimeTags[2], runtimeTags[1]).replace('__TEST_TAG__', runtimeTags[2]),
    ]) assert.throws(() => wire(corrupt), /manifest is incomplete, duplicated or out of order/);
    console.log('PASS production namespace, ordered runtime manifest, missing assets/bridges, stale history and non-publishing wiring');
  } finally {
    for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
    for (const dir of [...directories].sort((a, b) => b.length - a.length)) fs.rmdirSync(dir);
    fs.rmdirSync(fixture);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
