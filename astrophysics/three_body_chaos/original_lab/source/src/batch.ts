// "Batch run" mode: many headless simulations, repeated with new random seeds or swept over one
// setting, summarised as mean, SD and standard error, compared with theory where one exists.
// Every starting setting of the scattering experiment is listed in BVARS, so the batch panel can
// show them all in its settings table and let the student vary any one of them.
import { DEFAULT_NUMERICS, clonePhysics, type Numerics, type Physics } from './initial.ts';
import { getPreset } from './presets.ts';
import { mulberry32 } from './sampling.ts';
import { OUT } from './simulate.ts';
import type { Request } from './messages.ts';
import type { ResultColumns } from './store.ts';

export type Exec = (req: Request) => Promise<ResultColumns>;

/** What each run records ("Record" in the panel). */
export type OutKey = 'fractions' | 'energy' | 'impulse' | 'perturb';
export interface BOut { label: string; y: string; logy?: boolean; theory: string; theoryLabel: string }
export const BOUTS: Record<OutKey, BOut> = {
  fractions: { label: 'fraction of random scatterings in which C escapes', y: 'fraction in which C escapes (binary A–B survives)', theoryLabel: 'mean fraction (the binomial SD is in the summary)',
    theory: 'Each simulation is a random draw of b, v and the binary phase from the ranges in the table. If the draws are independent, the fraction from a run of n simulations scatters with the binomial SD √(p(1−p)/n): a finite sample, not the physics, limits how well a probability is known.' },
  energy: { label: 'maximum scaled energy error |ΔE|/(K₀+|U₀|)', y: 'mean maximum scaled energy error |ΔE|/(K₀+|U₀|)', logy: true, theoryLabel: 'error ∝ rtol (normalised at rtol = 1e-9)',
    theory: 'The integrator controls its LOCAL error with the tolerance rtol; the energy error built up over a whole encounter is roughly proportional to rtol (the theory line is drawn when rtol is swept). Energy conservation checks the numerics, not the answer.' },
  impulse: { label: 'binary energy change |ΔE_b/E_b| (runs where C escapes)', y: 'mean |ΔE_binary / E_binary| (C escapes, binary survives)', logy: true, theoryLabel: '∝ v⁻¹ (impulse approximation, normalised at the fastest v)',
    theory: 'A fast fly-by gives the binary a short kick whose size is proportional to 1/v, so the mean size of the change in binary energy should fall as 1/v at high speed (the theory line is drawn when v is swept, normalised at the fastest speed).' },
  perturb: { label: 'fraction of nudged runs with the SAME outcome as the un-nudged run', y: 'fraction of nudged runs with the same outcome', theoryLabel: '→ 1 as δ → 0 (a continuous dependence)',
    theory: 'Newtonian motion is deterministic, so as the nudge δ → 0 every nudged run must end like the un-nudged one (theory: a fraction of 1). How big a nudge it takes to change the outcome is a finite-time measure of sensitivity, not a proof of chaos.' },
};
const ALL: OutKey[] = ['fractions', 'energy', 'impulse', 'perturb'];

/** Every starting setting, with genuine limits and the outcomes it is used for. */
export interface BVar { label: string; unit: string; min: number; max: number; int?: boolean; def: number; outs: OutKey[] }
export const BVARS: Record<string, BVar> = {
  G:       { label: 'gravitational constant G', unit: '', min: 1e-6, max: 1e6, def: 1, outs: ALL },
  m0:      { label: 'mass A', unit: 'M', min: 1e-6, max: 1e6, def: 1, outs: ALL },
  m1:      { label: 'mass B', unit: 'M', min: 1e-6, max: 1e6, def: 1, outs: ALL },
  m2:      { label: 'mass C', unit: 'M', min: 1e-6, max: 1e6, def: 1, outs: ALL },
  r0:      { label: 'radius A', unit: 'L', min: 0, max: 100, def: 0.02, outs: ALL },
  r1:      { label: 'radius B', unit: 'L', min: 0, max: 100, def: 0.02, outs: ALL },
  r2:      { label: 'radius C', unit: 'L', min: 0, max: 100, def: 0.02, outs: ALL },
  sep:     { label: 'initial A–B separation', unit: 'L', min: 1e-3, max: 1e3, def: 1, outs: ALL },
  ecc:     { label: 'binary eccentricity e', unit: '', min: 0, max: 0.99, def: 0, outs: ALL },
  cx:      { label: 'C starting x', unit: 'L', min: -1e5, max: 1e5, def: -12, outs: ALL },
  horizon: { label: 'horizon (time limit)', unit: 'T', min: 1, max: 5000, def: 200, outs: ALL },
  rtol:    { label: 'tolerance rtol', unit: '', min: 1e-14, max: 1e-3, def: 1e-9, outs: ALL },
  rtolAtol:{ label: 'rtol ÷ atol', unit: '', min: 1, max: 1e6, def: 100, outs: ALL },
  bLo:     { label: 'impact offset b, lowest', unit: 'L', min: -1e4, max: 1e4, def: -3, outs: ['fractions', 'energy', 'impulse'] },
  bHi:     { label: 'impact offset b, highest', unit: 'L', min: -1e4, max: 1e4, def: 3, outs: ['fractions', 'energy', 'impulse'] },
  vLo:     { label: 'incoming speed v, lowest', unit: 'L/T', min: 1e-3, max: 1e3, def: 0.25, outs: ['fractions', 'energy'] },
  vHi:     { label: 'incoming speed v, highest', unit: 'L/T', min: 1e-3, max: 1e3, def: 2.5, outs: ['fractions', 'energy'] },
  phLo:    { label: 'binary phase φ, lowest', unit: '°', min: 0, max: 360, def: 0, outs: ['fractions', 'energy', 'impulse'] },
  phHi:    { label: 'binary phase φ, highest', unit: '°', min: 0, max: 360, def: 360, outs: ['fractions', 'energy', 'impulse'] },
  v:       { label: 'incoming speed v', unit: 'L/T', min: 1e-3, max: 1e3, def: 1, outs: ['impulse', 'perturb'] },
  b:       { label: 'impact offset b', unit: 'L', min: -1e4, max: 1e4, def: 0.5, outs: ['perturb'] },
  phase:   { label: 'binary phase φ', unit: '°', min: 0, max: 360, def: 0, outs: ['perturb'] },
  delta:   { label: 'nudge size δ in b', unit: 'L', min: 0, max: 100, def: 1e-3, outs: ['perturb'] },
};
export interface BOpt { k: string; label: string; outs: OutKey[]; def: string; choices: [string, string][] }
export const BOPTS: BOpt[] = [{ k: 'frame', label: 'Initial frame', outs: ALL, def: 'com', choices: [['com', 'total centre of mass'], ['binary', 'binary rest frame']] }];
export type Settings = Record<string, number | string>;
export const BDEF: Settings = Object.fromEntries([...Object.entries(BVARS).map(([k, V]) => [k, V.def]), ...BOPTS.map((O) => [O.k, O.def])]);
export const varName = (k: string): string => BVARS[k].label + (BVARS[k].unit ? ` (${BVARS[k].unit})` : '');
export const clampVar = (k: string, x: number): number => { const V = BVARS[k]; const y = Math.min(V.max, Math.max(V.min, x)); return V.int ? Math.round(y) : y; };

export interface BatchExp {
  id: string; title: string; sub: string; mode: 'repeat' | 'sweep'; out: OutKey;
  v?: string; xs?: number[]; logx?: boolean; runs?: number; samples: number; set: Settings; note: string;
}
export const BATCH_EXPS: BatchExp[] = [
  { id: 'fractions', mode: 'repeat', out: 'fractions', title: 'How much does a finite sample change the outcome fractions?', sub: 'Repeat: 100 random scatterings per run, new seed each run; fraction in which C escapes.', runs: 20, samples: 100, set: {},
    note: 'Each run draws 100 random initial conditions (b uniform in [−3, 3], v in [0.25, 2.5], binary phase in [0°, 360°)) and simulates every one. The spread of the fraction from run to run should match the binomial prediction √(p(1−p)/n) if the draws are independent: a finite sample, not the physics, limits how well a probability is known. The standard error of the mean over runs shrinks as 1/√(runs).' },
  { id: 'energy', mode: 'sweep', out: 'energy', v: 'rtol', xs: [1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10, 1e-11], logx: true, title: 'Does the energy error shrink with the tolerance?', sub: 'Sweep rtol (atol = rtol/100); the same 40 random scatterings each time.', samples: 40, set: {},
    note: 'The integrator controls its LOCAL error with the tolerance; the GLOBAL energy error accumulated over a whole encounter is roughly proportional to the tolerance, so halving the tolerance should roughly halve the error until round-off dominates. Energy conservation checks the numerics, not the answer: chaotic trajectories can be accurate in energy and still wrong in detail.' },
  { id: 'impulse', mode: 'sweep', out: 'impulse', v: 'v', xs: [8, 12, 16, 24, 32, 48, 64], logx: true, title: 'How much does a very fast fly-by disturb the binary?', sub: 'Sweep the incoming speed v at impact offset b ∈ [1, 1.5]; 60 random binary phases each.', samples: 60, set: { bLo: 1, bHi: 1.5 },
    note: 'A fast fly-by gives the binary a short kick: the change in its relative velocity is proportional to 1/v. The change in binary energy is first order in that kick, so its sign depends on the binary phase (random here) while its mean MAGNITUDE should fall as 1/v: a log–log slope tending to −1 as v grows. At lower speeds the measured values lie below the line because the binary partly adjusts during the pass. The mean is over runs in which A–B survived and C escaped. A small floor (~10⁻³) comes from starting C at a finite distance (x = −12), where its tidal field already perturbs the circular binary.' },
  { id: 'perturb', mode: 'sweep', out: 'perturb', v: 'delta', xs: [1e-10, 1e-8, 1e-6, 1e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1], logx: true, title: 'How small a change in b still changes the outcome?', sub: 'Sweep δ: 40 random nudges of b around b = 0.5, v = 1, φ = 0°, compared with the unnudged run.', samples: 40, set: {},
    note: 'Newtonian three-body motion is deterministic: as δ → 0 every nudged run must end like the unnudged one, and the fraction below 1 shows how large a change in the starting offset is needed to change the outcome at this starting point. That size depends on the starting point, the horizon and the integrator tolerance (changes far below the tolerance cannot be resolved meaningfully). This is a finite-time sensitivity measurement, not a proof of mathematical chaos.' },
];

export const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
export const sd = (a: number[]): number => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
export const se = (a: number[]): number => sd(a) / Math.sqrt(Math.max(1, a.length));

export interface BatchSpec { out: OutKey; mode: 'repeat' | 'sweep'; p: Settings; vary: string | null; xs: number[]; runs: number; samples: number; seed: number; logx: boolean }
export interface BatchResult {
  header: string[]; rows: (number | string)[][];
  plot: { x: number[]; mean: number[]; se: number[]; theory?: number[]; xLabel: string; yLabel: string; logx?: boolean; logy?: boolean };
  summary: string[];
}

/** The run specification of a one-click experiment (its own settings on top of the defaults). */
export function expSpec(e: BatchExp, o: { runs?: number; samples?: number; seed: number }): BatchSpec {
  return { out: e.out, mode: e.mode, p: { ...BDEF, ...e.set }, vary: e.v ?? null, xs: e.xs ?? [], runs: o.runs ?? e.runs ?? 20, samples: o.samples ?? e.samples, seed: o.seed, logx: !!e.logx };
}

// ---- turning a row of settings into a worker request ------------------------------------------
const num = (p: Settings, k: string): number => Number(p[k]);
function physicsOf(p: Settings): Physics {
  const ph = clonePhysics(getPreset('scattering').physics);
  ph.mode = 'scattering'; ph.G = num(p, 'G'); ph.frame = p.frame === 'binary' ? 'binary' : 'com';
  ph.m = [num(p, 'm0'), num(p, 'm1'), num(p, 'm2')]; ph.r = [num(p, 'r0'), num(p, 'r1'), num(p, 'r2')];
  ph.scatter.sep = num(p, 'sep'); ph.scatter.ecc = num(p, 'ecc'); ph.scatter.cx = num(p, 'cx'); ph.horizon = num(p, 'horizon');
  return ph;
}
const numericsOf = (p: Settings): Numerics => ({ ...DEFAULT_NUMERICS, rtol: num(p, 'rtol'), atol: num(p, 'rtol') / num(p, 'rtolAtol') });
function mk(p: Settings, b: number[], v: number[], phi: number[]): Request {
  const physics = physicsOf(p), n = b.length;
  return { kind: 'batch', rid: 0, cfg: { physics, numerics: numericsOf(p), varX: 'b', varY: 'v' }, horizon: physics.horizon, wantCk: false,
    ids: Int32Array.from({ length: n }, (_, i) => i), xs: Float64Array.from(b), ys: Float64Array.from(v), varZ: 'phase', zs: Float64Array.from(phi) };
}
const lerp = (lo: number, hi: number, u: number): number => lo + (hi - lo) * u;

/** Simulate one set of random draws (each draw = three uniform numbers) and return one value per simulation. */
async function simValues(out: OutKey, p: Settings, draws: number[][], exec: Exec): Promise<{ vals: number[]; outcomes?: Uint8Array; base?: number }> {
  if (out === 'perturb') {
    const c0 = await exec(mk(p, [num(p, 'b')], [num(p, 'v')], [num(p, 'phase')])), base = c0.outcome[0];   // the un-nudged run
    const b = draws.map((d) => num(p, 'b') + num(p, 'delta') * (2 * d[0] - 1));
    const c = await exec(mk(p, b, b.map(() => num(p, 'v')), b.map(() => num(p, 'phase'))));
    return { vals: Array.from(c.outcome, (oc) => (oc === base ? 1 : 0)), base };
  }
  const b = draws.map((d) => lerp(num(p, 'bLo'), num(p, 'bHi'), d[0]));
  const v = out === 'impulse' ? draws.map(() => num(p, 'v')) : draws.map((d) => lerp(num(p, 'vLo'), num(p, 'vHi'), d[1]));
  const f = draws.map((d) => lerp(num(p, 'phLo'), num(p, 'phHi'), d[2]));
  const c = await exec(mk(p, b, v, f));
  if (out === 'fractions') return { vals: Array.from(c.outcome, (x) => (x === OUT.C_ESC ? 1 : 0)), outcomes: c.outcome };
  if (out === 'energy') return { vals: Array.from(c.eErr).filter((e) => Number.isFinite(e)) };
  const vals: number[] = []; for (let i = 0; i < c.outcome.length; i++) if (c.outcome[i] === OUT.C_ESC && Number.isFinite(c.exch[i])) vals.push(Math.abs(c.exch[i]));
  return { vals };
}
const drawSet = (rnd: () => number, n: number): number[][] => Array.from({ length: n }, () => [rnd(), rnd(), rnd()]);
const f4 = (x: number): string => (Number.isFinite(x) ? (Math.abs(x) < 1e-3 && x !== 0 ? x.toExponential(3) : x.toPrecision(4)) : '–');
function slope(xs: number[], ys: number[]): number {     // least-squares gradient of log10(y) against log10(x), skipping unusable points
  const pts = xs.map((x, i) => [Math.log10(x), Math.log10(ys[i])]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  const mx = mean(pts.map((q) => q[0])), my = mean(pts.map((q) => q[1])); let sxy = 0, sxx = 0;
  for (const [a, b] of pts) { sxy += (a - mx) * (b - my); sxx += (a - mx) ** 2; }
  return sxy / sxx;
}

export async function runBatch(s: BatchSpec, exec: Exec, onProgress: (done: number, total: number, text: string) => void, shouldStop: () => boolean): Promise<BatchResult> {
  const O = BOUTS[s.out];
  const out: BatchResult = { header: [], rows: [], plot: { x: [], mean: [], se: [], xLabel: '', yLabel: O.y, logx: s.logx, logy: O.logy }, summary: [] };
  if (s.mode === 'repeat') {
    // REPEAT: every run draws a fresh set of random starting conditions (seed + run × 7919)
    out.header = s.out === 'fractions' ? ['run', 'seed', 'C escapes', 'A or B escapes', 'collision', 'unresolved', 'disruption / failed'] : ['run', 'seed', 'mean of the run', 'simulations used'];
    const ps: number[] = [];
    for (let r = 0; r < s.runs && !shouldStop(); r++) {
      const seed = s.seed + r * 7919, res = await simValues(s.out, s.p, drawSet(mulberry32(seed), s.samples), exec);
      const m = res.vals.length ? mean(res.vals) : NaN; ps.push(m);
      if (s.out === 'fractions') {
        let cEsc = 0, abEsc = 0, col = 0, un = 0, other = 0;
        for (const x of res.outcomes!) { if (x === OUT.C_ESC) cEsc++; else if (x <= 1) abEsc++; else if (x >= 3 && x <= 5) col++; else if (x === OUT.UNRESOLVED) un++; else other++; }
        const n = s.samples; out.rows.push([r + 1, seed, cEsc / n, abEsc / n, col / n, un / n, other / n]);
      } else out.rows.push([r + 1, seed, m, res.vals.length]);
      out.plot.x.push(r + 1); out.plot.mean.push(m); out.plot.se.push(0);
      onProgress(r + 1, s.runs, `run ${r + 1}/${s.runs}`);
    }
    const ok = ps.filter(Number.isFinite), p = mean(ok); out.plot.xLabel = 'run';
    if (s.out === 'fractions') {
      const th = Math.sqrt(p * (1 - p) / s.samples); out.plot.theory = ps.map(() => p);
      out.summary = [`mean fraction of runs in which C escapes = ${p.toFixed(4)}`, `SD between runs = ${sd(ok).toFixed(4)}   (binomial prediction √(p(1−p)/n) = ${th.toFixed(4)})`, `standard error of the mean over ${ok.length} runs = ${se(ok).toFixed(4)}`];
    } else {
      out.summary = [`mean = ${f4(p)}, SD between runs = ${f4(sd(ok))}, standard error = ${f4(se(ok))} (${ok.length} runs of ${s.samples} simulations)`];
      if (s.out === 'perturb') { out.plot.theory = ps.map(() => 1); out.summary.push(`theory → 1 as δ → 0 (difference ${f4(p - 1)})`); }
      else out.summary.push('no theory value for a repeat: sweep ' + (s.out === 'energy' ? 'rtol' : 'v') + ' to compare with the theory line.');
    }
    return out;
  }
  // SWEEP: the same random draws at every step, so only the swept setting changes
  const vary = s.vary!, xs = s.xs, lab = varName(vary);
  out.header = [lab, 'mean', 'SD', 'SE', 'n used', 'theory']; out.plot.xLabel = lab;
  const draws = drawSet(mulberry32(s.seed), s.samples), means: number[] = [], bases: number[] = [];
  for (let k = 0; k < xs.length && !shouldStop(); k++) {
    const x = xs[k], res = await simValues(s.out, { ...s.p, [vary]: x }, draws, exec), vals = res.vals;
    if (res.base !== undefined) bases.push(res.base);
    const m = vals.length ? mean(vals) : NaN; means.push(m);
    out.rows.push([x, m, sd(vals), se(vals), vals.length, NaN]);
    out.plot.x.push(x); out.plot.mean.push(m); out.plot.se.push(se(vals));
    onProgress(k + 1, xs.length, `${lab} = ${x}`);
  }
  const n = means.length, px = xs.slice(0, n);
  // theory curves, where the theory applies to the swept setting
  if (s.out === 'energy' && vary === 'rtol' && n) {
    let i = px.indexOf(1e-9); if (i < 0 || !Number.isFinite(means[i])) i = Math.floor(n / 2);
    out.plot.theory = px.map((x) => (means[i] * x) / px[i]);
  }
  if (s.out === 'impulse' && vary === 'v' && n) {
    const i = px.indexOf(Math.max(...px)); out.plot.theory = px.map((x) => means[i] * (px[i] / x));
  }
  if (s.out === 'perturb') out.plot.theory = px.map(() => 1);
  if (out.plot.theory) out.rows.forEach((r, i) => { r[5] = out.plot.theory![i]; });
  // summaries
  if (s.out === 'perturb') {
    const same = bases.every((b) => b === bases[0]);
    out.summary = [same ? `unnudged outcome code: ${bases[0]}` : `the unnudged outcome changes along the sweep (codes ${bases.join(', ')})`, ...out.rows.map((r) => `${vary === 'delta' ? 'δ' : lab} = ${r[0]}: ${(100 * (r[1] as number)).toFixed(0)} % keep the same outcome`)];
  } else if (s.out === 'energy' && vary === 'rtol') out.summary = [`log–log slope of error against tolerance = ${slope(px, means).toFixed(2)} (1.0 means error ∝ tolerance)`];
  else if (s.out === 'impulse' && vary === 'v' && n >= 2) {
    out.summary = [`log–log slope of |ΔE_b/E_b| against v = ${slope(px, means).toFixed(2)} (impulse approximation predicts −1 as v → ∞; the slope between the two fastest speeds is ${(Math.log(means[n - 1] / means[n - 2]) / Math.log(px[n - 1] / px[n - 2])).toFixed(2)})`];
  } else if (n) {
    out.summary = [`${lab} = ${px[0]}: mean ${f4(means[0])} ± ${f4(out.plot.se[0])} (SE);  ${lab} = ${px[n - 1]}: mean ${f4(means[n - 1])} ± ${f4(out.plot.se[n - 1])} (SE)`];
    if (n > 2 && px.every((x) => x > 0) && means.every((m) => m > 0)) out.summary.push(`log–log slope = ${slope(px, means).toFixed(2)}`);
    out.summary.push('no theory line for this setting (see the note below).');
  }
  return out;
}

export function batchCSV(title: string, s: BatchSpec, r: BatchResult): string {
  const set = [...Object.keys(BVARS).filter((k) => BVARS[k].outs.includes(s.out) && k !== s.vary).map((k) => `${varName(k)} = ${s.p[k]}`), ...BOPTS.filter((O) => O.outs.includes(s.out)).map((O) => `${O.label} = ${s.p[O.k]}`)];
  const lines = [`# ${title}`, `# record: ${BOUTS[s.out].label}; ${s.mode === 'sweep' ? `sweep ${varName(s.vary!)} over ${s.xs.join(' ')}` : `repeat, ${s.runs} runs`}; ${s.samples} simulations per ${s.mode === 'sweep' ? 'step' : 'run'}; seed = ${s.seed}; DOP853 integrator, atol = rtol ÷ (rtol ÷ atol)`,
    `# settings: ${set.join('; ')}`, ...r.summary.map((x) => '# ' + x), r.header.join(',')];
  for (const row of r.rows) lines.push(row.map((v) => (typeof v === 'number' && !Number.isFinite(v) ? '' : String(v))).join(','));
  return lines.join('\n') + '\n';
}
