// "Batch run" mode: many headless simulations, repeated with new random seeds or swept over one
// setting, summarised as mean, SD and standard error, compared with theory where one exists.
import { DEFAULT_NUMERICS, clonePhysics } from './initial.ts';
import { getPreset } from './presets.ts';
import { mulberry32 } from './sampling.ts';
import { OUT } from './simulate.ts';
import type { Request } from './messages.ts';
import type { ResultColumns } from './store.ts';

export type Exec = (req: Request) => Promise<ResultColumns>;
export interface BatchExp {
  id: string; title: string; sub: string; mode: 'repeat' | 'sweep';
  sweepName?: string; xs?: number[]; logx?: boolean; logy?: boolean;
  runs: number; samples: number; yLabel: string; theoryLabel: string; note: string;
}
export const BATCH_EXPS: BatchExp[] = [
  { id: 'fractions', mode: 'repeat', title: 'How much does a finite sample change the outcome fractions?', sub: 'Repeat: 100 random scatterings per run, new seed each run; fraction in which C escapes.', runs: 20, samples: 100, yLabel: 'fraction of runs in which C escapes (binary A–B survives)', theoryLabel: 'binomial SD √(p(1−p)/n)',
    note: 'Each run draws 100 random initial conditions (b uniform in [−3, 3], v in [0.25, 2.5], binary phase in [0°, 360°)) and simulates every one. The spread of the fraction from run to run should match the binomial prediction √(p(1−p)/n) if the draws are independent: a finite sample, not the physics, limits how well a probability is known. The standard error of the mean over runs shrinks as 1/√(runs).' },
  { id: 'energy', mode: 'sweep', sweepName: 'rtol', xs: [1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10, 1e-11], logx: true, logy: true, title: 'Does the energy error shrink with the tolerance?', sub: 'Sweep rtol (atol = rtol/100); the same 40 random scatterings each time.', runs: 1, samples: 40, yLabel: 'mean maximum scaled energy error |ΔE|/(K₀+|U₀|)', theoryLabel: 'error ∝ rtol (normalised at rtol = 1e-9)',
    note: 'The integrator controls its LOCAL error with the tolerance; the GLOBAL energy error accumulated over a whole encounter is roughly proportional to the tolerance, so halving the tolerance should roughly halve the error until round-off dominates. Energy conservation checks the numerics, not the answer: chaotic trajectories can be accurate in energy and still wrong in detail.' },
  { id: 'impulse', mode: 'sweep', sweepName: 'speed v', xs: [8, 12, 16, 24, 32, 48, 64], logx: true, logy: true, title: 'How much does a very fast fly-by disturb the binary?', sub: 'Sweep the incoming speed v at impact offset b ∈ [1, 1.5]; 60 random binary phases each.', runs: 1, samples: 60, yLabel: 'mean |ΔE_binary / E_binary| (C escapes, binary survives)', theoryLabel: '∝ v⁻¹ (impulse approximation, normalised at v = 64)',
    note: 'A fast fly-by gives the binary a short kick: the change in its relative velocity is proportional to 1/v. The change in binary energy is first order in that kick, so its sign depends on the binary phase (random here) while its mean MAGNITUDE should fall as 1/v: a log–log slope tending to −1 as v grows. At lower speeds the measured values lie below the line because the binary partly adjusts during the pass. The mean is over runs in which A–B survived and C escaped. A small floor (~10⁻³) comes from starting C at a finite distance (x = −12), where its tidal field already perturbs the circular binary.' },
  { id: 'perturb', mode: 'sweep', sweepName: 'offset δ in b', xs: [1e-10, 1e-8, 1e-6, 1e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1], logx: true, title: 'How small a change in b still changes the outcome?', sub: 'Sweep δ: 40 random nudges of b around b = 0.5, v = 1, φ = 0°, compared with the unnudged run.', runs: 1, samples: 40, yLabel: 'fraction of nudged runs with the SAME outcome as the unnudged run', theoryLabel: '→ 1 as δ → 0 (a continuous dependence)',
    note: 'Newtonian three-body motion is deterministic: as δ → 0 every nudged run must end like the unnudged one, and the fraction below 1 shows how large a change in the starting offset is needed to change the outcome at this starting point. That size depends on the starting point, the horizon and the integrator tolerance (changes far below the tolerance cannot be resolved meaningfully). This is a finite-time sensitivity measurement, not a proof of mathematical chaos.' },
];

export const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
export const sd = (a: number[]): number => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
export const se = (a: number[]): number => sd(a) / Math.sqrt(Math.max(1, a.length));

export interface BatchOpts { runs: number; samples: number; seed: number }
export interface BatchResult {
  header: string[]; rows: (number | string)[][];
  plot: { x: number[]; mean: number[]; se: number[]; theory?: number[]; xLabel: string; yLabel: string; logx?: boolean; logy?: boolean };
  summary: string[];
}

function baseReq(extra: Partial<{ rtol: number; atol: number }> = {}): Pick<Extract<Request, { kind: 'batch' }>, 'cfg' | 'horizon' | 'wantCk' | 'kind' | 'rid'> {
  const phys = clonePhysics(getPreset('scattering').physics);
  return { kind: 'batch', rid: 0, cfg: { physics: phys, numerics: { ...DEFAULT_NUMERICS, ...extra }, varX: 'b', varY: 'v' }, horizon: phys.horizon, wantCk: false };
}
function mk(extra: Partial<{ rtol: number; atol: number }>, b: number[], v: number[], phi: number[]): Request {
  const n = b.length;
  return { ...baseReq(extra), ids: Int32Array.from({ length: n }, (_, i) => i), xs: Float64Array.from(b), ys: Float64Array.from(v), varZ: 'phase', zs: Float64Array.from(phi) } as Request;
}

export async function runBatch(exp: BatchExp, o: BatchOpts, exec: Exec, onProgress: (done: number, total: number, text: string) => void, shouldStop: () => boolean): Promise<BatchResult> {
  const out: BatchResult = { header: [], rows: [], plot: { x: [], mean: [], se: [], xLabel: '', yLabel: exp.yLabel, logx: exp.logx, logy: exp.logy }, summary: [] };
  if (exp.id === 'fractions') {
    out.header = ['run', 'seed', 'C escapes', 'A or B escapes', 'collision', 'unresolved', 'disruption / failed'];
    const ps: number[] = [];
    for (let r = 0; r < o.runs && !shouldStop(); r++) {
      const rnd = mulberry32(o.seed + r * 7919), b: number[] = [], v: number[] = [], f: number[] = [];
      for (let i = 0; i < o.samples; i++) { b.push(-3 + 6 * rnd()); v.push(0.25 + 2.25 * rnd()); f.push(360 * rnd()); }
      const c = await exec(mk({}, b, v, f));
      let cEsc = 0, abEsc = 0, col = 0, un = 0, other = 0;
      for (const x of c.outcome) { if (x === OUT.C_ESC) cEsc++; else if (x <= 1) abEsc++; else if (x >= 3 && x <= 5) col++; else if (x === OUT.UNRESOLVED) un++; else other++; }
      const n = o.samples; ps.push(cEsc / n);
      out.rows.push([r + 1, o.seed + r * 7919, cEsc / n, abEsc / n, col / n, un / n, other / n]);
      out.plot.x.push(r + 1); out.plot.mean.push(cEsc / n); out.plot.se.push(0);
      onProgress(r + 1, o.runs, `run ${r + 1}/${o.runs}`);
    }
    const p = mean(ps), th = Math.sqrt(p * (1 - p) / o.samples);
    out.plot.xLabel = 'run'; out.plot.theory = ps.map(() => p);
    out.summary = [`mean fraction of runs in which C escapes = ${p.toFixed(4)}`, `SD between runs = ${sd(ps).toFixed(4)}   (binomial prediction √(p(1−p)/n) = ${th.toFixed(4)})`, `standard error of the mean over ${ps.length} runs = ${se(ps).toFixed(4)}`];
    return out;
  }
  const xs = exp.xs!;
  out.header = [exp.sweepName!, 'mean', 'SD', 'SE', 'n used', 'theory'];
  out.plot.xLabel = exp.sweepName!;
  const rnd0 = mulberry32(o.seed);
  const draws = Array.from({ length: o.samples }, () => [rnd0(), rnd0(), rnd0()]);
  let base: number | null = null; let ref: { x: number; y: number } | null = null;
  const means: number[] = [];
  for (let k = 0; k < xs.length && !shouldStop(); k++) {
    const x = xs[k]; let vals: number[] = [];
    if (exp.id === 'energy') {
      const b = draws.map((d) => -3 + 6 * d[0]), v = draws.map((d) => 0.25 + 2.25 * d[1]), f = draws.map((d) => 360 * d[2]);
      const c = await exec(mk({ rtol: x, atol: x / 100 }, b, v, f));
      vals = Array.from(c.eErr).filter((e) => Number.isFinite(e));
    } else if (exp.id === 'impulse') {
      const b = draws.map((d) => 1 + 0.5 * d[0]), v = draws.map(() => x), f = draws.map((d) => 360 * d[2]);
      const c = await exec(mk({}, b, v, f));
      for (let i = 0; i < c.outcome.length; i++) if (c.outcome[i] === OUT.C_ESC && Number.isFinite(c.exch[i])) vals.push(Math.abs(c.exch[i]));
    } else {
      if (base === null) { const c0 = await exec(mk({}, [0.5], [1], [0])); base = c0.outcome[0]; }
      const b = draws.map((d) => 0.5 + x * (2 * d[0] - 1));
      const c = await exec(mk({}, b, b.map(() => 1), b.map(() => 0)));
      vals = Array.from(c.outcome, (oc) => (oc === base ? 1 : 0));
    }
    const m = vals.length ? mean(vals) : NaN;
    means.push(m);
    out.rows.push([x, m, sd(vals), se(vals), vals.length, NaN]);
    out.plot.x.push(x); out.plot.mean.push(m); out.plot.se.push(se(vals));
    onProgress(k + 1, xs.length, `${exp.sweepName} = ${x}`);
  }
  // theory curves
  if (exp.id === 'energy') { const i9 = xs.indexOf(1e-9); ref = { x: 1e-9, y: means[i9] }; out.plot.theory = xs.map((x) => (ref!.y * x) / ref!.x); }
  if (exp.id === 'impulse') { const iL = xs.length - 1; ref = { x: xs[iL], y: means[iL] }; out.plot.theory = xs.map((x) => (ref!.y * (ref!.x / x))); }
  if (exp.id === 'perturb') out.plot.theory = xs.map(() => 1);
  if (out.plot.theory) out.rows.forEach((r, i) => { r[5] = out.plot.theory![i]; });
  if (exp.id === 'perturb') out.summary = [`unnudged outcome code: ${base}`, ...out.rows.map((r) => `δ = ${r[0]}: ${(100 * (r[1] as number)).toFixed(0)} % keep the same outcome`)];
  else if (exp.id === 'energy') { const lx = xs.map(Math.log10), ly = means.map(Math.log10); const n = xs.length, mx = mean(lx), my = mean(ly.filter(Number.isFinite)); void my; let sxy = 0, sxx = 0, c = 0, mY = 0; ly.forEach((y) => { if (Number.isFinite(y)) { mY += y; c++; } }); mY /= c; lx.forEach((x, i) => { if (Number.isFinite(ly[i])) { sxy += (x - mx) * (ly[i] - mY); sxx += (x - mx) ** 2; } }); void n; out.summary = [`log–log slope of error against tolerance = ${(sxy / sxx).toFixed(2)} (1.0 means error ∝ tolerance)`]; }
  else if (exp.id === 'impulse') { const lx = xs.map(Math.log10), ly = means.map(Math.log10); const mx = mean(lx), my2 = mean(ly); let sxy = 0, sxx = 0; lx.forEach((x, i) => { sxy += (x - mx) * (ly[i] - my2); sxx += (x - mx) ** 2; }); out.summary = [`log–log slope of |ΔE_b/E_b| against v = ${(sxy / sxx).toFixed(2)} (impulse approximation predicts −1 as v → ∞; the slope between the two fastest speeds is ${((Math.log(means[xs.length - 1] / means[xs.length - 2])) / Math.log(xs[xs.length - 1] / xs[xs.length - 2])).toFixed(2)})`]; }
  return out;
}

export function batchCSV(exp: BatchExp, r: BatchResult, o: BatchOpts): string {
  const lines = [`# ${exp.title}`, `# runs=${o.runs} samples=${o.samples} seed=${o.seed}; default scattering set-up (G=1, masses 1, binary separation 1, radii 0.02, horizon 200, DOP853 rtol 1e-9 unless swept)`, ...r.summary.map((s) => '# ' + s), r.header.join(',')];
  for (const row of r.rows) lines.push(row.map((v) => (typeof v === 'number' && !Number.isFinite(v) ? '' : String(v))).join(','));
  return lines.join('\n') + '\n';
}
