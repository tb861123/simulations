// Trajectory maths for the viewer: interpolation, conservation series, candidate binary.
import { PAIRS, diagnostics, conservationScales, conservationErrors, pairKepler, derivative, type Diagnostics } from './physics.ts';
import type { TrajData } from './lab.ts';

/** Cubic-Hermite interpolation of the recorded dense-output samples (spacing <= 0.01 time units). */
export function stateAt(tr: TrajData, t: number, out: Float64Array): void {
  const T = tr.trace.t, Y = tr.trace.y, n = tr.trace.n;
  if (t <= T[0]) { for (let k = 0; k < 12; k++) out[k] = Y[k]; return; }
  if (t >= T[n - 1]) { for (let k = 0; k < 12; k++) out[k] = Y[(n - 1) * 12 + k]; return; }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
  const h = T[hi] - T[lo], s = (t - T[lo]) / h, s2 = s * s, s3 = s2 * s;
  const a = 2 * s3 - 3 * s2 + 1, b = s3 - 2 * s2 + s, c = -2 * s3 + 3 * s2, d = s3 - s2;
  const o0 = lo * 12, o1 = hi * 12;
  for (let k = 0; k < 6; k++) {
    out[k] = a * Y[o0 + k] + b * h * Y[o0 + 6 + k] + c * Y[o1 + k] + d * h * Y[o1 + 6 + k];
    // velocity = derivative of the same Hermite polynomial (consistent with the positions)
    out[6 + k] = ((6 * s2 - 6 * s) * Y[o0 + k] + (3 * s2 - 4 * s + 1) * h * Y[o0 + 6 + k] + (-6 * s2 + 6 * s) * Y[o1 + k] + (3 * s2 - 2 * s) * h * Y[o1 + 6 + k]) / h;
  }
}

export interface Series {
  n: number; t: Float64Array;
  d: Float64Array[]; speed: Float64Array[];
  K: Float64Array; U: Float64Array; E: Float64Array;
  relE: Float64Array; relP: Float64Array; relL: Float64Array;
  px: Float64Array; py: Float64Array; L: Float64Array;
  cx: Float64Array; cy: Float64Array; cvx: Float64Array; cvy: Float64Array;
  binPair: number; binEnergy: Float64Array; binA: Float64Array; binE: Float64Array; binLabel: string;
  scale: ReturnType<typeof conservationScales>;
}

const cache = new WeakMap<TrajData, Series>();
const MAXPTS = 2500;

export function buildSeries(tr: TrajData): Series {
  const hit = cache.get(tr); if (hit) return hit;
  const N = tr.trace.n, stride = Math.max(1, Math.ceil(N / MAXPTS));
  const n = Math.ceil(N / stride) + (((N - 1) % stride) ? 1 : 0);
  const mk = (): Float64Array => new Float64Array(n);
  const s: Series = {
    n, t: mk(), d: [mk(), mk(), mk()], speed: [mk(), mk(), mk()], K: mk(), U: mk(), E: mk(), relE: mk(), relP: mk(), relL: mk(), px: mk(), py: mk(), L: mk(),
    cx: mk(), cy: mk(), cvx: mk(), cvy: mk(), binPair: 0, binEnergy: mk(), binA: mk(), binE: mk(), binLabel: '',
    scale: conservationScales(3, tr.m, tr.G, tr.y0),
  };
  // candidate binary = most strongly bound pair at the END of the run (the surviving binary for escapes)
  const yEnd = tr.trace.y.subarray((N - 1) * 12, N * 12);
  let bp = 0, best = Infinity;
  for (let p = 0; p < 3; p++) { const k = pairKepler(tr.m, tr.G, yEnd, 3, PAIRS[p][0], PAIRS[p][1]); const mu = tr.m[PAIRS[p][0]] * tr.m[PAIRS[p][1]] / (tr.m[PAIRS[p][0]] + tr.m[PAIRS[p][1]]); if (mu * k.eps < best) { best = mu * k.eps; bp = p; } }
  s.binPair = bp; s.binLabel = 'ABC'[PAIRS[bp][0]] + '–' + 'ABC'[PAIRS[bp][1]];
  const dg = {} as Diagnostics;
  const mu = tr.m[PAIRS[bp][0]] * tr.m[PAIRS[bp][1]] / (tr.m[PAIRS[bp][0]] + tr.m[PAIRS[bp][1]]);
  let q = 0;
  for (let i = 0; i < N; i += stride) { fill(i); q++; }
  if ((N - 1) % stride) { fill(N - 1); q++; }
  function fill(i: number): void {
    const y = tr.trace.y.subarray(i * 12, i * 12 + 12);
    s.t[q] = tr.trace.t[i];
    diagnostics(3, tr.m, tr.G, y, dg);
    const ce = conservationErrors(s.scale, dg);
    s.K[q] = dg.K; s.U[q] = dg.U; s.E[q] = dg.E; s.relE[q] = ce.relE; s.relP[q] = ce.relP; s.relL[q] = ce.relL;
    s.px[q] = dg.px; s.py[q] = dg.py; s.L[q] = dg.L; s.cx[q] = dg.cx; s.cy[q] = dg.cy; s.cvx[q] = dg.cvx; s.cvy[q] = dg.cvy;
    for (let p = 0; p < 3; p++) s.d[p][q] = Math.hypot(y[2 * PAIRS[p][1]] - y[2 * PAIRS[p][0]], y[2 * PAIRS[p][1] + 1] - y[2 * PAIRS[p][0] + 1]);
    for (let b = 0; b < 3; b++) s.speed[b][q] = Math.hypot(y[6 + 2 * b], y[7 + 2 * b]);
    const k = pairKepler(tr.m, tr.G, y, 3, PAIRS[bp][0], PAIRS[bp][1]);
    s.binEnergy[q] = mu * k.eps; s.binA[q] = k.a; s.binE[q] = k.e;
  }
  cache.set(tr, s);
  return s;
}

/** Accelerations for the vector overlay. */
export function accelAt(tr: TrajData, y: Float64Array, out: Float64Array): void {
  const dy = new Float64Array(12); derivative(3, tr.m, tr.G, y, dy);
  for (let k = 0; k < 6; k++) out[k] = dy[6 + k];
}

/** Documented phase-space separation: sqrt(sum_i (|dr_i|/L0)^2 + (|dv_i|/V0)^2), L0 = smallest initial pair separation, V0 = sqrt(G M / L0). */
export function separationSeries(a: TrajData, b: TrajData, nPts = 400): { t: Float64Array; sep: Float64Array; L0: number; V0: number; tMax: number } {
  const tMax = Math.min(a.trace.t[a.trace.n - 1], b.trace.t[b.trace.n - 1]);
  let L0 = Infinity; for (const [i, j] of PAIRS) L0 = Math.min(L0, Math.hypot(a.y0[2 * j] - a.y0[2 * i], a.y0[2 * j + 1] - a.y0[2 * i + 1]));
  const V0 = Math.sqrt(a.G * (a.m[0] + a.m[1] + a.m[2]) / L0);
  const t = new Float64Array(nPts), sep = new Float64Array(nPts), ya = new Float64Array(12), yb = new Float64Array(12);
  for (let k = 0; k < nPts; k++) {
    t[k] = (tMax * k) / (nPts - 1);
    stateAt(a, t[k], ya); stateAt(b, t[k], yb);
    let sum = 0; for (let i = 0; i < 6; i++) sum += ((ya[i] - yb[i]) / L0) ** 2 + ((ya[6 + i] - yb[6 + i]) / V0) ** 2;
    sep[k] = Math.sqrt(sum);
  }
  return { t, sep, L0, V0, tMax };
}
