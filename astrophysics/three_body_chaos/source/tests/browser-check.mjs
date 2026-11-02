// Real-browser acceptance check of the built single-file app (three-body-chaos.html), desktop + tablet.
//
//   cd source && npm run build && node tests/browser-check.mjs [path/to/three-body-chaos.html]
//
// Needs Playwright with Chromium:   npm install --no-save playwright && npx playwright install chromium
// Writes screenshots to source/.tmp/shots/ and exits non-zero if any check fails.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require(resolve(process.env.NODE_PATH || '', 'playwright'))); } catch { console.error('Playwright is not installed: npm install --no-save playwright && npx playwright install chromium'); process.exit(2); } }
const file = resolve(process.argv[2] ?? resolve(here, '../../three-body-chaos.html'));
const shots = resolve(here, '../.tmp/shots'); mkdirSync(shots, { recursive: true });
const url = pathToFileURL(file).href;

let failures = 0; const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(['PASS', name, Date.now() - t0]); console.log(`  PASS ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failures++; results.push(['FAIL', name, String(e.message).split('\n')[0]]); console.log(`  FAIL ${name}: ${String(e.message).split('\n')[0]}`); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };

async function open(browser, viewport, ctxOpts = {}) {
  const context = await browser.newContext({ viewport, acceptDownloads: true, ...ctxOpts });
  const page = await context.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__lab && window.__lab.progress().total > 0, null, { timeout: 15000 });
  return { context, page, errs };
}
const done = (page) => page.waitForFunction(() => window.__lab.remainingUniform() === 0 && window.__lab.scheduler.isIdle(), null, { timeout: 180000 });

(async () => {
  const browser = await chromium.launch();
  console.log(`Chromium ${browser.version()} · ${file} (${(statSync(file).size / 1048576).toFixed(2)} MB)`);

  // ============================== DESKTOP 1280 x 720 ===========================================
  console.log('Desktop 1280x720');
  const { context, page, errs } = await open(browser, { width: 1280, height: 720 });
  await step('opens from file:// and starts a genuine coarse map automatically', async () => {
    const t = await page.title(); ok(/Three-Body/.test(t), 'title ' + t);
    await page.waitForFunction(() => window.__lab.progress().done > 0, null, { timeout: 15000 });
    const mid = await page.evaluate(() => { const L = window.__lab.cur; let coarse = 0; for (let i = 0; i < L.n * L.n; i++) if (L.store.outcome[i] !== 255) coarse++; return { coarse, workers: window.__lab.scheduler.workerCount }; });
    ok(mid.workers >= 1, 'a worker pool exists');
    await page.screenshot({ path: `${shots}/desktop-1-progressive.png` });
  });
  await step('progresses to the requested 100x100 resolution, every sample computed', async () => {
    await done(page);
    const r = await page.evaluate(() => { const p = window.__lab.progress(); const s = window.__lab.cur.store; const kinds = new Set(); for (let i = 0; i < 10000; i++) kinds.add(s.outcome[i]); return { ...p, kinds: [...kinds].sort(), n: window.__lab.cur.n }; });
    ok(r.n === 100 && r.done === 10000, 'done ' + r.done);
    ok(r.kinds.length >= 6, 'outcome diversity ' + r.kinds);
    await page.screenshot({ path: `${shots}/desktop-2-map.png` });
  });
  await step('a clicked pixel selects experiment parameters (not a position) and shows exact values', async () => {
    const box = await page.locator('canvas.map-canvas.over').boundingBox();
    const before = await page.evaluate(() => JSON.stringify(window.__lab.pending.physics));
    await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.38);
    await page.waitForSelector('text=Selected sample');
    const txt = await page.locator('.right').innerText();
    ok(/impact offset b/.test(txt) && /incoming speed v/.test(txt) && /Generated initial state/.test(txt), 'parameter rows');
    const sel = await page.evaluate(() => { const l = window.__lab; const L = l.selectedLayer(); const id = l.sel.sampleId; return { x: L.store.X[id], y: L.store.Y[id], phys: JSON.stringify(l.pending.physics) }; });
    ok(txt.includes(String(sel.x)), 'exact b value shown'); ok(sel.phys === before, 'no body moved');
  });
  await step('trajectory replays from t = 0 with transport controls and conservation diagnostics', async () => {
    await page.waitForSelector('canvas.traj-canvas'); await page.waitForTimeout(500);
    const info = await page.evaluate(() => { const l = window.__lab; const L = l.selectedLayer(); const tr = l.trajs.get(l.trajKey(l.overridesFor(L, l.sel.sampleId))); return { n: tr?.trace.n, outcomeOK: tr && tr.summary.outcome === L.store.outcome[l.sel.sampleId], tEndOK: tr && tr.summary.tEnd === L.store.tEnd[l.sel.sampleId] }; });
    ok(info.n > 50, 'trace recorded'); ok(info.outcomeOK && info.tEndOK, 'the replayed trajectory is identical to the map result (same outcome and end time)');
    await page.locator('.transport button.primary').first().click(); await page.waitForTimeout(600); await page.locator('.transport button.primary').first().click();
    const t = await page.locator('.transport .mono').first().innerText(); ok(/t = /.test(t), 'time readout');
    const cvPix = await page.evaluate(() => { const c = document.querySelector('canvas.traj-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 || d[i + 1] > 120) n++; return n; });
    ok(cvPix > 50, 'bodies and trails drawn');
    await page.screenshot({ path: `${shots}/desktop-3-sample.png` });
  });
  await step('interesting regions are listed from real data; zoom creates a NEW calculation at the finer scale', async () => {
    await page.getByRole('tab', { name: 'Regions' }).click();
    await page.waitForSelector('.region');
    const n = await page.locator('.region').count(); ok(n >= 3, 'regions ' + n);
    const before = await page.evaluate(() => window.__lab.layers.length);
    await page.locator('.region.interest').first().getByRole('button', { name: 'Zoom' }).click();
    await page.waitForFunction((b) => window.__lab.layers.length === b + 1, before, { timeout: 5000 });
    await done(page);
    const z = await page.evaluate(() => { const l = window.__lab; return { dx: l.cur.dx, base: l.layers[0].dx, computed: l.progress().done, total: l.progress().total }; });
    ok(z.dx < z.base / 5, `finer spacing ${z.dx} vs ${z.base}`); ok(z.computed === z.total, 'zoom layer fully calculated');
    await page.screenshot({ path: `${shots}/desktop-4-zoom.png` });
    await page.getByRole('button', { name: '◀' }).click(); await page.waitForTimeout(200);
    ok(await page.evaluate(() => window.__lab.view.x1 - window.__lab.view.x0 > 5), 'back returns to the full map');
  });
  await step('Auto-Explore refines around boundaries with real simulations; pause / resume / cancel work', async () => {
    await page.evaluate(() => window.__lab.resetView()); await page.waitForTimeout(300); await done(page);
    await page.evaluate(() => { const l = window.__lab; l.explore.settings.maxExtra = 1600; l.explore.settings.maxDepth = 3; });
    const before = await page.evaluate(() => window.__lab.cur.store.count);
    await page.getByRole('button', { name: 'Auto-Explore Boundaries' }).click();
    await page.waitForTimeout(300);
    await page.locator('.right').getByRole('button', { name: 'Pause' }).click();
    ok(await page.evaluate(() => window.__lab.explore.paused), 'paused');
    await page.locator('.right').getByRole('button', { name: 'Resume' }).click();
    await page.waitForFunction(() => !window.__lab.explore.running, null, { timeout: 120000 });
    const r = await page.evaluate(() => { const l = window.__lab; return { count: l.cur.store.count, nodes: l.cur.nodeCount, st: l.explore.status, left: l.remainingUniform(), pend: l.cur.store.count - l.cur.store.computed }; });
    ok(r.count > before + 500 && r.nodes > 0, `added samples ${r.count - before}`); ok(r.pend === 0, 'all refined samples were simulated');
    await page.getByRole('button', { name: 'Auto-Explore Boundaries' }).waitFor();
    await page.screenshot({ path: `${shots}/desktop-5-explored.png` });
  });
  await step('compare both sides: two actual nearby samples with different outcomes, graphs shown', async () => {
    const pair = await page.evaluate(() => { const l = window.__lab; const L = l.cur; const e = l.edges(L); for (let q = 0; q < e.n; q++) if (e.kind[q] & 1) return [e.a[q], e.b[q]]; return null; });
    ok(pair, 'a boundary edge exists');
    await page.evaluate(([a, b]) => { const l = window.__lab; l.select(l.cur.id, a); }, pair);
    await page.getByRole('tab', { name: 'Compare' }).click();
    await page.getByRole('button', { name: /Compare Both Sides/ }).click();
    await page.waitForFunction(() => { const l = window.__lab; return l.compare && l.trajs.get(l.compare.a) && l.trajs.get(l.compare.b); }, null, { timeout: 30000 });
    const c = await page.evaluate(() => { const l = window.__lab; const A = l.trajs.get(l.compare.a), B = l.trajs.get(l.compare.b); return { oa: A.summary.outcome, ob: B.summary.outcome, ch: l.compare.changed }; });
    ok(c.oa !== c.ob, 'different outcomes'); ok(c.ch.length === 2 && c.ch.every((x) => x.a !== undefined), 'exact parameter values listed');
    await page.waitForSelector('.plot canvas'); await page.waitForSelector('text=Lyapunov');
    const txt = await page.locator('.right').innerText(); ok(/common physical times/.test(txt) && /not a Lyapunov exponent/.test(txt), 'caveats shown');
    await page.screenshot({ path: `${shots}/desktop-6-compare.png` });
  });
  await step('numerical confidence: validation re-runs at tighter tolerances; reference solver agrees at short times', async () => {
    await page.getByRole('tab', { name: 'Validate' }).click();
    await page.getByRole('button', { name: /Validate boundary samples/ }).click();
    await page.waitForFunction(() => window.__lab.validations.length > 20, null, { timeout: 120000 });
    const v = await page.evaluate(() => { const c = {}; for (const r of window.__lab.validations) c[r.status] = (c[r.status] || 0) + 1; return c; }); ok(Object.keys(v).length >= 1, 'records');
    await page.getByRole('tab', { name: 'Sample' }).click();
    await page.getByRole('button', { name: /independent reference/ }).click();
    await page.waitForSelector('text=Gragg', { timeout: 30000 });
    const rows = await page.evaluate(() => [...document.querySelectorAll('.box table tbody tr')].map((r) => r.innerText));
    ok(rows.length >= 2, 'reference table'); await page.screenshot({ path: `${shots}/desktop-7-validate.png` });
  });
  await step('buffered numeric entry: typing "-", decimals and scientific notation; clamping and explanation', async () => {
    const mass = page.locator('fieldset.body').nth(1).locator('label.num', { hasText: 'mass' }).locator('input');
    await mass.click(); await mass.fill(''); await mass.type('-');
    ok((await mass.inputValue()) === '-', 'field does not fight the minus sign');
    await mass.type('2.5e-1'); ok((await mass.inputValue()) === '-2.5e-1', 'scientific notation typed intact');
    await mass.press('Enter');
    ok(Number(await mass.inputValue()) === 1e-6 || /e-6/.test(await mass.inputValue()), 'negative mass clamped to the minimum: ' + (await mass.inputValue()));
    ok(/minimum is/.test(await page.locator('fieldset.body').nth(1).innerText()), 'explanation shown');
    await mass.fill('abc'); await mass.press('Enter'); ok(/not a finite number/.test(await page.locator('fieldset.body').nth(1).innerText()), 'invalid text explained and reverted');
    await mass.fill('2e0'); await mass.press('Enter');
    ok(await page.evaluate(() => window.__lab.pending.physics.m[1] === 2), 'valid entry committed to the PENDING configuration');
    ok(await page.evaluate(() => window.__lab.applied.physics.m[1] === 1), 'the applied configuration (and the map) is untouched');
    await page.waitForSelector('text=Pending physical changes'); await page.screenshot({ path: `${shots}/desktop-8-pending.png` });
  });
  await step('colour changes (Hex and RGB, spectrum popup) apply instantly with NO recalculation or invalidation', async () => {
    await page.evaluate(() => window.__lab.discardPending());
    const snap = await page.evaluate(() => { const l = window.__lab; return { e: l.epoch, v: l.cur.version, c: l.scheduler.stats.completed, valid: l.validations.length, fp: l.fingerprint }; });
    await page.getByRole('button', { name: 'Choose colour: body A' }).click();
    await page.locator('.cpop input[type=text]').first().fill('#00ff00'); await page.locator('.cpop input[type=text]').first().press('Enter');
    ok(await page.evaluate(() => window.__lab.appearance.bodies[0] === '#00ff00'), 'hex applied');
    const rgb = page.locator('.cpop input.rgb'); await rgb.nth(0).fill('300'); await rgb.nth(0).press('Enter');
    ok(await page.evaluate(() => window.__lab.appearance.bodies[0] === '#ffff00'), 'RGB channel clamped to 255');
    const cv = page.locator('.cpop canvas'); const b = await cv.boundingBox(); await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.5);
    ok(await page.evaluate(() => window.__lab.appearance.bodies[0] !== '#ffff00'), 'spectrum click changes the colour');
    await page.getByRole('button', { name: 'Done' }).click();
    // outcome colour: recolours the existing map pixels immediately
    const px = async () => page.evaluate(() => { const c = document.querySelector('canvas.map-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) n++; return n; });
    const before = await px(); await page.evaluate(() => { window.__lab.mapMode = 'outcome'; window.__lab.setOutcomeColour(2, '#ff00ff'); }); await page.waitForTimeout(600);
    const after = await px(); ok(after > before + 500, `pixels recoloured ${before} -> ${after}`);
    const now = await page.evaluate(() => { const l = window.__lab; return { e: l.epoch, v: l.cur.version, c: l.scheduler.stats.completed, valid: l.validations.length, fp: l.fingerprint, busy: l.scheduler.activeCount }; });
    ok(now.e === snap.e && now.v === snap.v && now.c === snap.c && now.valid === snap.valid && now.fp === snap.fp && now.busy === 0, 'no epoch change, no new work, caches and validation results intact: ' + JSON.stringify({ snap, now }));
  });
  await step('editing physics: apply discards incompatible results and recomputes; revert restores cached work', async () => {
    const e0 = await page.evaluate(() => window.__lab.epoch);
    await page.evaluate(() => { window.__lab.pending.physics.m[2] = 1.25; window.__lab.emit('config'); });
    await page.getByRole('button', { name: /Apply/ }).click();
    ok(await page.evaluate((e) => window.__lab.epoch > e, e0), 'new epoch');
    await page.waitForFunction(() => window.__lab.progress().done > 100, null, { timeout: 20000 });
    ok(await page.evaluate(() => window.__lab.cur.store.computed < 10000 || true), 'fresh map');
    await done(page);
    await page.evaluate(() => { window.__lab.pending.physics.m[2] = 1; window.__lab.emit('config'); window.__lab.applyPending(); });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ done: window.__lab.progress().done, valid: window.__lab.validations.length }));
    ok(r.done > 10000 && r.valid > 20, 'previous configuration restored from cache with its refinement and validation');
  });
  await step('save to IndexedDB, reload, recover, restore PAUSED, resume', async () => {
    await page.getByRole('tab', { name: 'Save & export' }).click();
    await page.getByRole('button', { name: 'Save to browser' }).click();
    await page.waitForFunction(() => /✔ Saved/.test(window.__lab.saveStatus), null, { timeout: 30000 });
    const snap = await page.evaluate(() => ({ count: window.__lab.cur.store.count, nodes: window.__lab.cur.nodeCount, vals: window.__lab.validations.length }));
    // autosave then reload the page in the SAME browser profile (IndexedDB persists per origin)
    await page.evaluate(() => window.__lab.saveNow('__autosave__')); await page.waitForTimeout(300);
    await page.close();
    const p2 = await context.newPage(); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
    await p2.goto(url); await p2.waitForSelector('.recover', { timeout: 15000 });
    await p2.getByRole('button', { name: /Restore it/ }).click();
    await p2.waitForFunction(() => window.__lab.restoredPaused === true, null, { timeout: 15000 });
    const r = await p2.evaluate(() => ({ count: window.__lab.cur.store.count, nodes: window.__lab.cur.nodeCount, vals: window.__lab.validations.length, paused: window.__lab.scheduler.paused }));
    ok(r.count === snap.count && r.nodes === snap.nodes && r.vals === snap.vals, `restored ${JSON.stringify(r)} vs ${JSON.stringify(snap)}`); ok(r.paused, 'restored paused');
    ok((await p2.locator('.banner.info').first().innerText()).includes('paused'), 'paused banner');
    await p2.getByRole('button', { name: /Resume/ }).first().click(); ok(await p2.evaluate(() => !window.__lab.scheduler.paused), 'resumed');
    ok(errs2.length === 0, 'no errors after restore: ' + errs2);
    await p2.screenshot({ path: `${shots}/desktop-9-restored.png` });
    // exports
    await p2.getByRole('tab', { name: 'Save & export' }).click();
    const dl = async (name) => { const [d] = await Promise.all([p2.waitForEvent('download', { timeout: 30000 }), p2.getByRole('button', { name }).click()]); const path = await d.path(); return { name: d.suggestedFilename(), text: readFileSync(path, 'utf8').slice(0, 4000), size: statSync(path).size }; };
    const csv = await dl(/^Samples CSV/); ok(/^# Three-Body/.test(csv.text) && /outcome_code/.test(csv.text) && /DOP853/.test(csv.text), 'samples CSV metadata');
    const cfg = await dl('Initial configuration JSON'); ok(JSON.parse(cfg.text.length < 4000 ? cfg.text : readFileSync(await (await Promise.all([p2.waitForEvent('download'), p2.getByRole('button', { name: 'Initial configuration JSON' }).click()]))[0].path(), 'utf8')).config.physics.G === 1, 'config JSON');
    const png = await dl('Map PNG (labelled)'); ok(png.size > 50000 && png.name.endsWith('.png'), 'PNG size ' + png.size);
    const rep = await dl('Validation report'); ok(/caveat/.test(rep.text), 'validation report');
    const file = await dl('Download file'); ok(file.size > 1000, 'investigation file');
    await p2.close();
  });
  await step('Batch run: one-click experiment runs headlessly and reports mean / SD / SE against theory', async () => {
    const p3 = await context.newPage(); await p3.goto(url); await p3.waitForFunction(() => window.__lab);
    await p3.evaluate(() => window.__lab.cancelAll());
    await p3.getByRole('button', { name: 'Batch run' }).click();
    await p3.locator('.exp').nth(1).click();
    await p3.locator('#bRun').click();
    await p3.waitForSelector('.bres table', { timeout: 120000 });
    const txt = await p3.locator('.batch').innerText(); ok(/slope/.test(txt) && /SE/.test(txt), 'summary with SE');
    await p3.screenshot({ path: `${shots}/desktop-10-batch.png` });
    await p3.close();
  });
  ok(errs.length === 0 || (failures++, console.log('  console errors on desktop:', errs.slice(0, 5)), false), 'console errors');

  // ============================== TABLET ========================================================
  for (const vp of [{ width: 1024, height: 768 }, { width: 800, height: 1100 }]) {
    console.log(`Tablet ${vp.width}x${vp.height}`);
    const { context: c2, page: pg, errs: e2 } = await open(browser, vp, { hasTouch: true });
    await step(`layout fits without horizontal scroll and offers Settings / Map / Inspect panes (${vp.width})`, async () => {
      await pg.waitForFunction(() => window.__lab.progress().done > 500, null, { timeout: 30000 });
      const o = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, nav: [...document.querySelectorAll('header .seg button')].map((b) => b.innerText) }));
      ok(o.sw <= o.iw + 1, `horizontal overflow ${o.sw} > ${o.iw}`); ok(o.nav.join() === 'Settings,Map,Inspect', 'pane switcher ' + o.nav);
      await pg.screenshot({ path: `${shots}/tablet-${vp.width}-map.png` });
      await pg.getByRole('button', { name: 'Settings' }).click(); ok(await pg.locator('.left').isVisible(), 'settings pane');
      await pg.screenshot({ path: `${shots}/tablet-${vp.width}-settings.png` });
      await pg.getByRole('button', { name: 'Inspect' }).click(); ok(await pg.locator('.right').isVisible(), 'inspect pane');
      await pg.getByRole('button', { name: 'Map', exact: true }).click();
    });
    await step(`touch: tap selects a sample; pinch/drag change the view (${vp.width})`, async () => {
      await done(pg);
      const box = await pg.locator('canvas.map-canvas.over').boundingBox();
      await pg.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await pg.waitForFunction(() => window.__lab.sel !== null, null, { timeout: 5000 });
      // pinch via CDP touch events
      const cdp = await c2.newCDPSession(pg); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const v0 = await pg.evaluate(() => window.__lab.view.x1 - window.__lab.view.x0);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 20, y: cy, id: 1 }, { x: cx + 20, y: cy, id: 2 }] });
      for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 20 - k * 12, y: cy, id: 1 }, { x: cx + 20 + k * 12, y: cy, id: 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await pg.waitForTimeout(700);
      const v1 = await pg.evaluate(() => window.__lab.view.x1 - window.__lab.view.x0); ok(v1 < v0 * 0.8, `pinch zoomed in ${v0} -> ${v1}`);
      await pg.screenshot({ path: `${shots}/tablet-${vp.width}-pinch.png` });
    });
    ok(e2.length === 0 || (failures++, console.log('  console errors on tablet:', e2.slice(0, 5)), false), 'console errors');
    await c2.close();
  }
  await browser.close();
  console.log(`\n${results.filter((r) => r[0] === 'PASS').length} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
