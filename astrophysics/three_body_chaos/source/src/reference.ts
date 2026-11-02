// Independent reference solver: Gragg–Bulirsch–Stoer extrapolation (modified-midpoint + Richardson
// extrapolation in h²).  It shares NO integrator code with the DOP853 solver:
//   * different method family (extrapolation vs Runge–Kutta, no embedded RK pair, no dense output);
//   * different acceleration routine (`accelerationDirect`: the textbook per-body sum);
//   * different contact location (bisection by re-integrating from the start of the step).
// Both solvers do implement the same *physics* (Newtonian gravity), so agreement validates the
// numerics, not the law itself.  A separate offline cross-check against SciPy's DOP853 and
// mpmath is described in VALIDATION.md.
import { accelerationDirect } from './physics.ts';
import type { Initial } from './initial.ts';

export interface RefRequest {
  ini: Initial; G: number;
  /** ascending output times; states are captured exactly at these times */ times: Float64Array;
  /** stop here at the latest */ tStop: number;
  rtol?: number; atol?: number; maxSteps?: number;
  /** reference length for the point-mass singularity floor (1e-8 L) */ L: number;
}
export interface RefResult {
  states: Float64Array; tEnd: number; contactPair: number; tContact: number;
  ok: boolean; message: string; steps: number; yEnd: Float64Array;
}

const KMAX = 10;
const PAIRS3 = [[0, 1], [0, 2], [1, 2]];

class GBS {
  m: ArrayLike<number>; G: number;
  rtol: number; atol: number;
  private acc = new Float64Array(6);
  private T: Float64Array[][];
  private z0 = new Float64Array(12); private z1 = new Float64Array(12); private z2 = new Float64Array(12); private fz = new Float64Array(12);
  steps = 0;
  constructor(m: ArrayLike<number>, G: number, rtol: number, atol: number) {
    this.m = m; this.G = G; this.rtol = rtol; this.atol = atol;
    this.T = []; for (let j = 0; j < KMAX; j++) { this.T.push([]); for (let k = 0; k <= j; k++) this.T[j].push(new Float64Array(12)); }
  }
  private f(z: Float64Array, out: Float64Array): void {
    accelerationDirect(3, this.m, this.G, z, this.acc);
    for (let i = 0; i < 6; i++) { out[i] = z[6 + i]; out[6 + i] = this.acc[i]; }
  }
  /** modified-midpoint rule with n sub-steps over H */
  private midpoint(y: Float64Array, H: number, n: number, out: Float64Array): void {
    const { z0, z1, z2, fz } = this; const h = H / n;
    z0.set(y); this.f(y, fz);
    for (let i = 0; i < 12; i++) z1[i] = y[i] + h * fz[i];
    for (let s = 1; s < n; s++) {
      this.f(z1, fz);
      for (let i = 0; i < 12; i++) { z2[i] = z0[i] + 2 * h * fz[i]; z0[i] = z1[i]; z1[i] = z2[i]; }
    }
    this.f(z1, fz);
    for (let i = 0; i < 12; i++) out[i] = 0.5 * (z0[i] + z1[i] + h * fz[i]);
  }
  /** one extrapolated step; returns error (<1 means accepted) and writes the result */
  tryStep(y: Float64Array, H: number, out: Float64Array): { err: number; cols: number } {
    const T = this.T;
    let err = Infinity, cols = KMAX;
    for (let j = 0; j < KMAX; j++) {
      const nj = 2 * (j + 1);
      this.midpoint(y, H, nj, T[j][0]);
      for (let k = 1; k <= j; k++) {
        const ratio = nj / (2 * (j - k + 1));
        const c = 1 / (ratio * ratio - 1);
        for (let i = 0; i < 12; i++) T[j][k][i] = T[j][k - 1][i] + (T[j][k - 1][i] - T[j - 1][k - 1][i]) * c;
      }
      if (j >= 2) {
        let e = 0;
        for (let i = 0; i < 12; i++) {
          const sc = this.atol + this.rtol * Math.abs(T[j][j][i]);
          e = Math.max(e, Math.abs(T[j][j][i] - T[j][j - 1][i]) / sc);
        }
        err = e; cols = j + 1;
        if (e < 1 || !Number.isFinite(e)) { out.set(T[j][j]); return { err: e, cols }; }
      }
    }
    out.set(T[KMAX - 1][KMAX - 1]);
    return { err, cols };
  }
}

export function referenceIntegrate(req: RefRequest): RefResult {
  const { ini, G, times, tStop, L } = req;
  const rtol = req.rtol ?? 1e-12, atol = req.atol ?? 1e-13, maxSteps = req.maxSteps ?? 400000;
  const gbs = new GBS(ini.m, G, rtol, atol);
  const Rt = PAIRS3.map(([i, j]) => { const R = ini.r[i] + ini.r[j]; return R > 0 ? R : 1e-8 * L; });
  const states = new Float64Array(times.length * 12).fill(NaN);
  let y = Float64Array.from(ini.y), t = 0, H = 0.01 * L, k = 0, steps = 0;
  const ynew = new Float64Array(12);
  const gap = (s: Float64Array, p: number): number => Math.hypot(s[2 * PAIRS3[p][1]] - s[2 * PAIRS3[p][0]], s[2 * PAIRS3[p][1] + 1] - s[2 * PAIRS3[p][0] + 1]) - Rt[p];
  const out: RefResult = { states, tEnd: 0, contactPair: -1, tContact: NaN, ok: true, message: 'ok', steps: 0, yEnd: y };
  const hCap = 4 * 2 * Math.PI * Math.sqrt(L * L * L / (G * (ini.m[0] + ini.m[1] + ini.m[2])));

  /** advance (y,t) to tTarget by repeated extrapolation steps; returns false on failure */
  const advance = (yy: Float64Array, tt: number, tTarget: number, Hs: { H: number }): number => {
    let guard = 0;
    while (tt < tTarget && guard++ < 100000) {
      let h = Math.min(Hs.H, tTarget - tt, hCap);
      const res = gbs.tryStep(yy, h, ynew); steps++;
      if (!Number.isFinite(res.err)) return NaN;
      if (res.err < 1) {
        const clipped = h < Hs.H;
        yy.set(ynew); tt += h;
        const proposed = h * Math.min(4, Math.max(0.2, 0.9 * Math.pow(1 / Math.max(res.err, 1e-12), 1 / (2 * res.cols - 1))));
        Hs.H = clipped ? Math.max(Hs.H, proposed) : proposed;
      } else {
        Hs.H = h * Math.min(0.8, Math.max(0.1, 0.9 * Math.pow(1 / res.err, 1 / (2 * res.cols - 1))));
        if (Hs.H < 1e-14) return NaN;
      }
    }
    return tt;
  };
  const Hs = { H };
  while (t < tStop && steps < maxSteps) {
    // approach safeguard (stricter than the main solver): never cover more than a quarter of the time to contact
    let hStep = Math.min(tStop - t, hCap);
    for (let p = 0; p < 3; p++) {
      const [i, j] = PAIRS3[p];
      const dx = y[2 * j] - y[2 * i], dy = y[2 * j + 1] - y[2 * i + 1], d = Math.hypot(dx, dy);
      const closing = -(dx * (y[6 + 2 * j] - y[6 + 2 * i]) + dy * (y[6 + 2 * j + 1] - y[6 + 2 * i + 1])) / d;
      if (closing > 0) hStep = Math.min(hStep, Math.max(0.25 * (d - Rt[p]) / closing, 1e-9));
    }
    const nextOut = k < times.length ? times[k] : Infinity;
    const tTarget = Math.min(t + Math.min(Hs.H, hStep), nextOut, tStop);
    const y0 = Float64Array.from(y);
    const tn = advance(y, t, tTarget, Hs);
    if (!Number.isFinite(tn)) { out.ok = false; out.message = 'reference solver step-size failure'; break; }
    // contact check at the end of the step; locate by bisection on the step length
    let hit = -1;
    for (let p = 0; p < 3; p++) if (gap(y, p) <= 0) { hit = p; break; }
    if (hit >= 0) {
      let lo = 0, hi = tn - t, bestP = hit;
      const g = (tau: number): number => {
        const ys = Float64Array.from(y0); advance(ys, 0, tau, { H: tau });
        let mn = Infinity; for (let p = 0; p < 3; p++) mn = Math.min(mn, gap(ys, p)); return mn;
      };
      for (let it = 0; it < 60 && hi - lo > 1e-14 * Math.max(1, t); it++) { const mid = 0.5 * (lo + hi); if (g(mid) <= 0) hi = mid; else lo = mid; }
      const ys = Float64Array.from(y0); advance(ys, 0, hi, { H: hi });
      for (let p = 0; p < 3; p++) if (gap(ys, p) <= 1e-9 * Rt[p]) { bestP = p; break; }
      out.contactPair = bestP; out.tContact = t + hi; t = t + hi; y = ys; break;
    }
    t = tn;
    while (k < times.length && times[k] <= t + 1e-14 * Math.max(1, t)) { states.set(y, k * 12); k++; }
  }
  if (steps >= maxSteps) { out.ok = false; out.message = 'reference solver work limit reached'; }
  out.tEnd = t; out.steps = steps; out.yEnd = y;
  return out;
}
