// Worker-pool throughput in a real browser: time to compute the default 100x100 map with 1..N workers.
// Merges the result into ../BENCHMARK.json.   NODE_PATH=$(npm root -g) node scripts/benchmark-browser.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../../three-body-chaos.html');
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(file).href); await page.waitForFunction(() => window.__lab);
const cores = await page.evaluate(() => navigator.hardwareConcurrency);
const rows = [];
for (const k of [1, 2, 3, 4].filter((x) => x <= cores)) {
  const r = await page.evaluate(async (k) => {
    const lab = window.__lab; lab.cancelAll(); lab.setWorkers(k);
    lab.pending.resolution = 100; lab.pending.physics.horizon = 200; lab.pending.physics.m[2] = 1 + 1e-9 * k;   // fresh fingerprint: no cache hit
    const t0 = performance.now(); lab.applyPending();
    while (lab.remainingUniform() > 0) await new Promise((r) => setTimeout(r, 25));
    const dt = performance.now() - t0; const s = lab.cur.store; let steps = 0; for (let i = 0; i < 10000; i++) steps += s.steps[i];
    return { workers: k, seconds: +(dt / 1000).toFixed(2), samplesPerSecond: Math.round(10000 / (dt / 1000)), meanSteps: Math.round(steps / 10000), uiLongestFrameGapMs: null };
  }, k);
  rows.push(r); console.log(JSON.stringify(r));
}
// main-thread responsiveness while 3 workers compute: measure rAF gaps
const resp = await page.evaluate(async () => {
  const lab = window.__lab; lab.cancelAll(); lab.setWorkers(Math.min(3, navigator.hardwareConcurrency)); lab.pending.physics.m[2] = 1.0000000007; lab.applyPending();
  const gaps = []; let last = performance.now(); const t0 = last;
  await new Promise((res) => { const f = (t) => { gaps.push(t - last); last = t; if (lab.remainingUniform() === 0 || t - t0 > 20000) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  gaps.sort((a, b) => a - b); return { frames: gaps.length, medianGapMs: +gaps[gaps.length >> 1].toFixed(1), p99GapMs: +gaps[Math.floor(gaps.length * 0.99)].toFixed(1), maxGapMs: +gaps[gaps.length - 1].toFixed(1) };
});
console.log('responsiveness during computation', JSON.stringify(resp));
const out = JSON.parse(readFileSync(resolve(here, '../../BENCHMARK.json'), 'utf8'));
out.browserPool = { browser: browser.version(), page: 'file:// single-file build', map: '100x100 default scattering, horizon 200, rtol 1e-9', rows, responsiveness: resp };
writeFileSync(resolve(here, '../../BENCHMARK.json'), JSON.stringify(out, null, 1));
await browser.close();
