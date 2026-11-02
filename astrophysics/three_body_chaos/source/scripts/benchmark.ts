// Single-thread throughput of the numerical core under Node, plus tolerance scaling.  Writes ../BENCHMARK.json.
//   npm run benchmark
import os from 'node:os';
import { writeFileSync } from 'node:fs';
import { Simulator } from '../src/simulate.ts';
import { buildInitial, DEFAULT_NUMERICS, DEFAULT_PHYSICS, clonePhysics } from '../src/initial.ts';
import { PRESETS } from '../src/presets.ts';

const sim = new Simulator();
const ctx = { node: process.version, platform: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemGB: +(os.totalmem() / 2 ** 30).toFixed(1), date: new Date().toISOString() };

function sweep(label: string, phys: any, nu: any, axes: { varX: string; minX: number; maxX: number; varY: string; minY: number; maxY: number }, n: number) {
  // warm-up so JIT compilation is not timed
  for (let k = 0; k < 20; k++) sim.run(buildInitial(phys, { [axes.varX]: axes.minX + k * 0.01, [axes.varY]: axes.minY + k * 0.01 }), phys.G, nu, { horizon: phys.horizon });
  const times: number[] = []; let steps = 0; let nfevLike = 0; let slow = { ms: 0, steps: 0 };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const ov = { [axes.varX]: axes.minX + (i + 0.5) * (axes.maxX - axes.minX) / n, [axes.varY]: axes.minY + (j + 0.5) * (axes.maxY - axes.minY) / n };
    const ini = buildInitial(phys, ov); const t0 = performance.now();
    const r = sim.run(ini, phys.G, nu, { horizon: phys.horizon }); const dt = performance.now() - t0; times.push(dt); if (dt > slow.ms) slow = { ms: dt, steps: r.steps }; steps += r.steps; nfevLike += r.steps * 13;
  }
  times.sort((a, b) => a - b); const tot = times.reduce((s, v) => s + v, 0), N = times.length;
  const q = (p: number) => times[Math.min(N - 1, Math.floor(p * N))];
  return { label, samples: N, msPerSample: +(tot / N).toFixed(3), median: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), max: +times[N - 1].toFixed(2), meanSteps: +(steps / N).toFixed(0), rhsEvalsPerSec: Math.round(nfevLike / (tot / 1000)), samplesPerSecPerCore: +(1000 * N / tot).toFixed(0), slowest: { ms: +slow.ms.toFixed(1), steps: slow.steps, usPerStep: +(1000 * slow.ms / slow.steps).toFixed(2) }, meanUsPerStep: +(1000 * tot / steps).toFixed(2) };
}

const out: any = { context: ctx, runs: [] };
const def = { varX: 'b', minX: -3, maxX: 3, varY: 'v', minY: 0.25, maxY: 2.5 };
out.runs.push(sweep('default scattering 60x60, rtol 1e-9', DEFAULT_PHYSICS, DEFAULT_NUMERICS, def, 60));
for (const rt of [1e-7, 1e-11, 1e-13]) out.runs.push(sweep(`default scattering 40x40, rtol ${rt}`, DEFAULT_PHYSICS, { ...DEFAULT_NUMERICS, rtol: rt, atol: rt / 100 }, def, 40));
for (const p of PRESETS.slice(1)) out.runs.push(sweep(`${p.name} 24x24`, p.physics, { ...DEFAULT_NUMERICS, ...p.numerics }, p.axes, 24));
const long = clonePhysics(DEFAULT_PHYSICS); long.horizon = 1000; out.runs.push(sweep('default scattering 40x40, horizon 1000', long, DEFAULT_NUMERICS, def, 40));
for (const r of out.runs) console.log(`${r.label.padEnd(52)} ${String(r.msPerSample).padStart(8)} ms/sample  median ${String(r.median).padStart(7)}  p95 ${String(r.p95).padStart(8)}  max ${String(r.max).padStart(8)} (${r.slowest.steps} steps, ${r.slowest.usPerStep} µs/step vs mean ${r.meanUsPerStep})  steps ${String(r.meanSteps).padStart(6)}  ${r.samplesPerSecPerCore}/s/core`);
writeFileSync(new URL('../../BENCHMARK.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('wrote BENCHMARK.json');
