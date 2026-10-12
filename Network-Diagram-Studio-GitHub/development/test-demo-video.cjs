const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const appMode = process.argv.includes('--edge-app');
const supplied = process.argv.slice(2).filter(value => value !== '--edge-app');
const entries = supplied.length ? supplied : [path.join(__dirname, '..', 'index.html')];
const output = process.env.NDS_DEMO_TEST_OUTPUT;
if (output) fs.mkdirSync(output, { recursive: true });

function playerData(source, name) {
  const match = source.match(new RegExp(`const ${name} = (\\[[^\\r\\n]+\\]);`));
  assert(match, `Missing ${name} data`);
  return JSON.parse(match[1]);
}

async function verify(entry, index) {
  entry = path.resolve(entry);
  assert(['index.html', 'non_prod_index.html'].includes(path.basename(entry)));
  const production = path.basename(entry) === 'index.html';
  const folder = production ? 'production_demo' : 'non_production_demo';
  const scriptPath = path.join(path.dirname(entry), folder, 'demo.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  const assets = Object.fromEntries([
    ['entry', entry], ['player', scriptPath],
    ['movie', path.join(path.dirname(scriptPath), 'walkthrough.mp4')],
    ['poster', path.join(path.dirname(scriptPath), 'poster.jpg')],
  ].map(([name, file]) => [name, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  const expected = {
    cues: playerData(source, 'script'),
    chapters: playerData(source, 'chapters'),
    transcript: playerData(source, 'transcriptLines'),
  };
  assert.match(source, /const duration = 180;/);
  assert.equal(expected.chapters.length, 12);
  for (let i = 0; i < expected.cues.length; i++) {
    const [start, end, text] = expected.cues[i];
    assert(start >= 0 && start < end && end <= 180 && text.length > 0);
    if (i) assert(start >= expected.cues[i - 1][1]);
  }
  const errors = [], network = [], mediaRequests = [];
  const browser = appMode ? null : await chromium.launch();
  let context;
  try {
    const options = {
      locale: 'en-US', colorScheme: 'light', reducedMotion: 'reduce',
      viewport: { width: 1440, height: 1000 },
    };
    context = appMode ? await chromium.launchPersistentContext('', {
      ...options, headless: false,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      args: [`--app=${pathToFileURL(entry).href}`],
    }) : await browser.newContext(options);
    await context.addInitScript(() => localStorage.setItem('nds.lang', 'en'));
    await context.addInitScript(version => localStorage.setItem('nds.updates.seen.v1', version), require('./src/updates/release-history.json')[0].version);
    await context.route(/^https?:/, route => {
      network.push(route.request().url());
      return route.abort();
    });
    const page = appMode ? context.pages()[0] : await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/walkthrough\.mp4|poster\.jpg/.test(request.url())) mediaRequests.push(request.url());
    });
    await page.goto(pathToFileURL(entry).href);
    await page.locator('#nds-arm-open').waitFor();
    assert.equal(await page.locator('[title*="Demo build"]').count(), production ? 0 : 1);
    assert.equal(mediaRequests.length, 0, 'Media is not fetched at application startup');
    await page.getByRole('textbox', { name: 'Search the whole palette' }).fill('group virtual network');
    await page.locator('[data-nds-search-hit-kind="resource"]').first().click();
    await page.waitForFunction(() => window.__nds_diagramStore.getState().diagram.nodes.length === 1);
    const before = await page.evaluate(() => JSON.stringify(window.__nds_diagramStore.getState().diagram));
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#nds-demo-settings-open').click();
    const video = page.locator('#nds-demo-video');
    await page.waitForFunction(() => document.querySelector('#nds-demo-video').currentTime > .3);
    const media = await video.evaluate(v => {
      const captionMode = v.textTracks[0].mode;
      v.textTracks[0].mode = 'hidden';
      const cues = [...v.textTracks[0].cues].map(c => [c.startTime, c.endTime, c.text]);
      v.textTracks[0].mode = captionMode;
      return {
        duration: v.duration, size: [v.videoWidth, v.videoHeight], audioBytes: v.webkitAudioDecodedByteCount,
        captionMode, cues, mediaRevision: new URL(v.currentSrc).search,
        posterRevision: new URL(v.poster).search,
        scriptRevision: new URL(document.querySelector('script[src*="/demo.js"]').src).search,
      };
    });
    assert(Math.abs(media.duration - 180) < .02, 'Movie is exactly three minutes');
    assert.deepEqual(media.size, [1440, 900]);
    assert(media.audioBytes > 0, 'The browser decodes actual narration');
    assert.equal(media.captionMode, 'disabled');
    assert.deepEqual(media.cues, expected.cues);
    assert.equal(media.mediaRevision, '?v=studio-tour-current-ui-106');
    assert.equal(media.posterRevision, media.mediaRevision);
    assert.equal(media.scriptRevision, media.mediaRevision);
    assert.match(await page.locator('#nds-demo-title').textContent(), /3:00/);
    assert.deepEqual(await page.locator('#nds-demo-transcript p').evaluateAll(es =>
      es.map(e => e.lastChild.textContent)), expected.transcript.map(row => row[2]));
    assert.deepEqual(await page.locator('[data-nds-demo-chapter]').evaluateAll(es =>
      es.map(e => [Number(e.dataset.ndsDemoChapter), e.lastChild.textContent])), expected.chapters);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Delete');
    assert.equal(await page.evaluate(() => JSON.stringify(window.__nds_diagramStore.getState().diagram)), before,
      'Player keys do not edit the diagram behind it');
    await page.locator('#nds-demo-chapters summary').click();
    for (let i = 0; i < expected.chapters.length; i++) {
      await page.locator('[data-nds-demo-chapter]').nth(i).click();
      await page.waitForFunction(start => {
        const v = document.querySelector('#nds-demo-video');
        return !v.seeking && v.currentTime >= start && v.currentTime < start + 2;
      }, expected.chapters[i][0]);
      await video.evaluate(v => v.pause());
      await page.waitForFunction(i =>
        document.querySelectorAll('[data-nds-demo-chapter]')[i].getAttribute('aria-current') === 'step', i);
    }
    await video.evaluate(v => { v.textTracks[0].mode = 'showing'; });
    const cue = expected.cues.find(row => row[0] >= 93);
    await video.evaluate((v, time) => new Promise(resolve => {
      v.addEventListener('seeked', resolve, { once: true });
      v.currentTime = time;
    }), (cue[0] + cue[1]) / 2);
    await page.waitForFunction(text =>
      document.querySelector('#nds-demo-video').textTracks[0].activeCues[0]?.text === text, cue[2]);
    if (output) await page.screenshot({ path: path.join(output, `${index}-${folder}-captions.png`) });
    await page.locator('#nds-demo-speed').selectOption('1.5');
    assert.equal(await video.evaluate(v => v.playbackRate), 1.5);
    await page.locator('#nds-demo-speed').selectOption('1');
    await video.evaluate(async v => { v.currentTime = v.duration - .15; await v.play(); });
    await page.waitForFunction(() => document.querySelector('#nds-demo-video').ended);
    await page.locator('#nds-demo-replay').click();
    await page.waitForFunction(() => {
      const v = document.querySelector('#nds-demo-video');
      return !v.paused && v.currentTime > 0 && v.currentTime < 2;
    });
    assert.equal(await video.evaluate(v => v.textTracks[0].mode), 'showing', 'Replay keeps caption opt-in');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#nds-demo-dialog').open &&
      document.querySelector('#nds-demo-video').paused);
    await page.waitForFunction(() => document.activeElement?.id === 'nds-demo-settings-open');
    await page.locator('[data-nds-theme-option="dark"]').click();
    await page.locator('#nds-demo-settings-open').click();
    await video.evaluate(v => v.pause());
    assert.equal(await video.evaluate(v => v.textTracks[0].mode), 'showing', 'Reopen keeps caption opt-in');
    const localeChecks = [];
    for (const language of ['en', 'ja', 'es', 'fr', 'de', 'pt', 'zh', 'ko']) {
      await page.evaluate(language => { document.documentElement.lang = language; }, language);
      await page.waitForTimeout(60);
      const title = await page.locator('#nds-demo-title').innerText();
      assert.match(title, /3:00/);
      assert((await page.locator('#nds-demo-close').getAttribute('aria-label')).length > 0);
      localeChecks.push({ language, title });
    }
    await page.evaluate(() => { document.documentElement.lang = 'en'; });
    if (output) await page.screenshot({ path: path.join(output, `${index}-${folder}-dark.png`) });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => JSON.stringify(window.__nds_diagramStore.getState().diagram)), before);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, [], 'The complete player works through file:// with no internet');
    const result = { entry, appMode, assets, media: { ...media, cues: media.cues.length }, localeChecks, errors, network };
    if (output) fs.writeFileSync(path.join(output, `${index}-${folder}-result.json`), JSON.stringify(result, null, 2));
    console.log(`PASS ${production ? 'production' : 'non-production'} ${appMode ? 'Edge app' : 'file://'}: 3:00, audio, ${expected.cues.length} cues, 12 chapters, transcript, replay, speed, focus, offline and keyboard isolation`);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

(async () => {
  for (let index = 0; index < entries.length; index++) await verify(entries[index], index);
})().catch(error => { console.error(error); process.exitCode = 1; });
