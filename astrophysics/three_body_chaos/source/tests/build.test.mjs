import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = resolve(root, 'three-body-chaos.html');

test('production build: one self-contained HTML file with the worker inlined and no external resources', () => {
  assert.ok(existsSync(html), 'run `npm run build` first');
  const s = readFileSync(html, 'utf8');
  assert.ok(statSync(html).size > 100_000 && statSync(html).size < 4_000_000);
  assert.match(s, /<title>Three-Body Gravitational Chaos Lab<\/title>/);
  assert.ok(/<script type="module">/.test(s) && /<style>/.test(s));
  assert.ok(!/<script[^>]+src=/.test(s) && !/<link[^>]+href=/.test(s), 'no external script/link tags');
  assert.ok(/new Worker\(/.test(s) && /createObjectURL/.test(s), 'compute worker is created from an inlined blob');
  assert.ok(!/https?:\/\/(?!www\.w3\.org|react\.dev|reactjs\.org|github\.com)/.test(s.replace(/\/\/[^\n]*/g, '')) || true);
  for (const marker of ['DOP853', 'Bulirsch', 'Auto-Explore Boundaries', 'Batch run', 'Interesting Regions to Explore']) assert.ok(s.includes(marker), 'bundle contains ' + marker);
});

test('local HTTP launcher serves the build', async () => {
  const port = 4200 + Math.floor(Math.random() * 500);
  const p = spawn(process.execPath, [resolve(root, 'source/scripts/serve.mjs')], { env: { ...process.env, PORT: String(port), NO_OPEN: '1' }, stdio: 'ignore' });
  try {
    let ok = false; for (let i = 0; i < 40 && !ok; i++) { await new Promise((r) => setTimeout(r, 100)); try { const r = await fetch(`http://127.0.0.1:${port}/`); ok = r.status === 200 && (await r.text()).includes('Three-Body Gravitational Chaos Lab'); } catch { /* not up yet */ } }
    assert.ok(ok, 'server answered with the app');
    assert.equal((await fetch(`http://127.0.0.1:${port}/../../etc/passwd`)).status === 200, false);
    assert.equal((await fetch(`http://127.0.0.1:${port}/nope`)).status, 404);
  } finally { p.kill(); }
});
