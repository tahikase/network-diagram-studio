const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const launcher = path.resolve(process.argv[2] ||
  path.join(__dirname, '..', 'Network Diagram Studio.bat'));
const root = path.dirname(launcher);
const script = fs.readFileSync(launcher, 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(script, /setlocal EnableExtensions DisableDelayedExpansion/i);
assert.match(script, /set "APPFILE=%~dp0index\.html"/);
assert.match(script, /start "" "%BROWSER%" --app="%APPURL%" --start-maximized/);
assert.match(script, /start "" "%APPURL%"/);
assert.doesNotMatch(script, /non_prod_index\.html|non_production_/);

const required = new Set(['index.html']);
for (const match of script.matchAll(/for %%F in \(([^)]+)\) do if not exist "%~dp0([^"]+)\\%%F"/g)) {
  for (const name of match[1].split(/\s+/)) required.add(path.join(match[2], name));
}
assert.ok(required.size >= 45, 'the launcher checks actual runtime files, not only empty folders');
for (const file of required) assert.ok(fs.statSync(path.join(root, file)).isFile(), file);
for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="\.\/(production_[^"?]+)(?:\?[^"]*)?"/g)) {
  assert.ok(required.has(path.normalize(match[1])), 'launcher checks referenced asset: ' + match[1]);
}
console.log('PASS production entry, portable Edge/Chrome/default-browser launch commands and complete runtime file checks');

assert.equal(process.platform, 'win32', 'native launcher checks require Windows');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nds-production-launcher-'));
const file = path.join(fixture, 'launcher.bat');
const index = path.join(fixture, 'index.html');
const folders = ['production_arm', 'production_demo', 'production_editor', 'production_vendor'];
try {
  fs.writeFileSync(file, script);
  const run = () => spawnSync(process.env.ComSpec, ['/d', '/c', '.\\launcher.bat'], {
    cwd: fixture, input: '\r\n', encoding: 'utf8', windowsHide: true, timeout: 10000,
  });
  let result = run();
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /ERROR: index\.html is missing/, result.stdout + result.stderr);
  fs.writeFileSync(index, 'fixture');
  for (const folder of folders) fs.mkdirSync(path.join(fixture, folder));
  result = run();
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /ERROR: required production files are missing/, result.stdout + result.stderr);
  console.log('PASS native batch execution refuses a missing entry and empty runtime folders before starting a browser');
} finally {
  for (const candidate of [file, index]) if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
  for (const folder of folders) {
    const candidate = path.join(fixture, folder);
    if (fs.existsSync(candidate)) fs.rmdirSync(candidate);
  }
  fs.rmdirSync(fixture);
}
