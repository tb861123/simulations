// DOP853: Dormand–Prince explicit Runge–Kutta of order 8 with embedded 5th/3rd-order error
// estimators and a 7th-order dense output (Hairer, Norsett & Wanner, Solving ODEs I, §II.5).
// The coefficients in dop853-coeffs.ts are machine-generated from SciPy's table (see scripts/).
// This file is an independent TypeScript implementation of the stepper: allocation-free in the
// hot loop, with the same step-size controller constants as SciPy/Hairer
// (safety 0.9, shrink >= 0.2, grow <= 10, exponent -1/8).
import { A, C, D, E3, E5, N_EXT, N_STAGES } from './dop853-coeffs.ts';

export type Rhs = (y: Float64Array, dy: Float64Array) => void;

const SAFETY = 0.9, MIN_FACTOR = 0.2, MAX_FACTOR = 10;
const ERR_EXP = -1 / 8;

export class Dop853 {
  readonly dim: number;
  readonly rhs: Rhs;
  t = 0;
  y: Float64Array;
  f: Float64Array;     // f(t, y) at the current point (FSAL: reused as stage 1 of the next step)
  h = 0;               // next step size to try
  rtol: number; atol: number;
  lastRejected = false;
  nfev = 0;
  // workspace
  private K: Float64Array[];       // 16 stage derivatives (13 used in a step, 3 more for dense output)
  private ytmp: Float64Array;
  private ynew: Float64Array;
  // information about the last accepted step (needed for dense output)
  tOld = 0;
  yOld: Float64Array;
  hLast = 0;
  private F: Float64Array[];       // dense-output polynomial coefficients (7 x dim)
  private denseReady = false;

  constructor(rhs: Rhs, dim: number, rtol: number, atol: number) {
    this.rhs = rhs; this.dim = dim; this.rtol = rtol; this.atol = atol;
    this.y = new Float64Array(dim); this.f = new Float64Array(dim);
    this.yOld = new Float64Array(dim); this.ytmp = new Float64Array(dim); this.ynew = new Float64Array(dim);
    this.K = []; for (let i = 0; i < N_EXT; i++) this.K.push(new Float64Array(dim));
    this.F = []; for (let i = 0; i < 7; i++) this.F.push(new Float64Array(dim));
  }

  /** Initialise at (t0, y0).  If `h0` is omitted a starting step is chosen automatically (Hairer's rule). */
  init(t0: number, y0: Float64Array, h0?: number): void {
    this.t = t0; this.y.set(y0); this.rhs(this.y, this.f); this.nfev = 1;
    this.lastRejected = false; this.denseReady = false;
    this.h = h0 ?? this.initialStep();
  }

  /** Restore from a checkpoint without recomputing the step size (bitwise-identical continuation). */
  restore(t: number, y: Float64Array, h: number, lastRejected: boolean): void {
    this.t = t; this.y.set(y); this.rhs(this.y, this.f); this.nfev++;
    this.h = h; this.lastRejected = lastRejected; this.denseReady = false;
  }

  private scale(i: number, a: number, b: number): number { return this.atol + Math.max(Math.abs(a), Math.abs(b)) * this.rtol; }

  private initialStep(): number {
    const { dim, y, f, rtol, atol } = this;
    let d0 = 0, d1 = 0;
    for (let i = 0; i < dim; i++) { const s = atol + Math.abs(y[i]) * rtol; d0 += (y[i] / s) ** 2; d1 += (f[i] / s) ** 2; }
    d0 = Math.sqrt(d0 / dim); d1 = Math.sqrt(d1 / dim);
    const h0 = (d0 < 1e-5 || d1 < 1e-5) ? 1e-6 : 0.01 * d0 / d1;
    const y1 = this.ytmp, f1 = this.K[1];
    for (let i = 0; i < dim; i++) y1[i] = y[i] + h0 * f[i];
    this.rhs(y1, f1); this.nfev++;
    let d2 = 0;
    for (let i = 0; i < dim; i++) { const s = atol + Math.abs(y[i]) * rtol; d2 += ((f1[i] - f[i]) / s) ** 2; }
    d2 = Math.sqrt(d2 / dim) / h0;
    const h1 = (Math.max(d1, d2) <= 1e-15) ? Math.max(1e-6, h0 * 1e-3) : Math.pow(0.01 / Math.max(d1, d2), 1 / 8);
    return Math.min(100 * h0, h1);
  }

  /**
   * Try one step of size `hTry` (default: the controller's current h).  Returns
   *   1  accepted (state advanced; this.h holds the suggested next step)
   *   0  rejected (step shrunk; call again)
   *  -1  step size underflow (cannot make progress at this precision)
   *  -2  non-finite state
   * `hMax` caps the step (used for the approach-speed safeguard).
   */
  step(hMax: number): number {
    const { dim, K, y, ytmp, ynew } = this;
    let h = Math.min(this.h, hMax);
    const t = this.t;
    if (!(h > 0) || t + h === t) return -1;
    K[0].set(this.f);
    // stages 2..12
    for (let s = 1; s < N_STAGES; s++) {
      const row = s * N_EXT;
      for (let i = 0; i < dim; i++) {
        let acc = 0;
        for (let j = 0; j < s; j++) acc += A[row + j] * K[j][i];
        ytmp[i] = y[i] + h * acc;
      }
      this.rhs(ytmp, K[s]);
    }
    // 8th-order solution (weights B = row 12 of A)
    const brow = N_STAGES * N_EXT;
    for (let i = 0; i < dim; i++) {
      let acc = 0;
      for (let j = 0; j < N_STAGES; j++) acc += A[brow + j] * K[j][i];
      ynew[i] = y[i] + h * acc;
    }
    this.rhs(ynew, K[N_STAGES]); this.nfev += N_STAGES;
    // embedded error estimates (5th and 3rd order), combined as in Hairer's DOP853
    let e5 = 0, e3 = 0;
    for (let i = 0; i < dim; i++) {
      let a5 = 0, a3 = 0;
      for (let j = 0; j <= N_STAGES; j++) { a5 += E5[j] * K[j][i]; a3 += E3[j] * K[j][i]; }
      const sc = this.scale(i, y[i], ynew[i]);
      e5 += (a5 / sc) ** 2; e3 += (a3 / sc) ** 2;
    }
    if (!Number.isFinite(e5) || !Number.isFinite(e3)) {
      // non-finite stage values: shrink hard once, otherwise report failure
      if (h < 1e-12 * Math.max(1, Math.abs(t))) return -2;
      this.h = h * MIN_FACTOR; this.lastRejected = true; return 0;
    }
    let errNorm: number;
    if (e5 === 0 && e3 === 0) errNorm = 0;
    else errNorm = Math.abs(h) * e5 / Math.sqrt((e5 + 0.01 * e3) * dim);
    if (errNorm < 1) {
      let factor = errNorm === 0 ? MAX_FACTOR : Math.min(MAX_FACTOR, SAFETY * Math.pow(errNorm, ERR_EXP));
      if (this.lastRejected) factor = Math.min(1, factor);
      this.tOld = t; this.yOld.set(y); this.hLast = h;
      this.t = t + h; this.y.set(ynew); this.f.set(K[N_STAGES]);
      this.h = h * factor; this.lastRejected = false; this.denseReady = false;
      return 1;
    }
    this.h = h * Math.max(MIN_FACTOR, SAFETY * Math.pow(errNorm, ERR_EXP));
    this.lastRejected = true;
    return 0;
  }

  /** Cubic-Hermite-ready slope data of the last step: f at its start is K[0]; f at its end is this.f. */
  startDerivative(): Float64Array { return this.K[0]; }

  /** Build the 7th-order dense-output polynomial for the last accepted step (costs 3 extra RHS calls). */
  prepareDense(): void {
    if (this.denseReady) return;
    const { dim, K, ytmp, yOld, hLast: h } = this;
    for (let s = N_STAGES + 1; s < N_EXT; s++) {
      const row = s * N_EXT;
      for (let i = 0; i < dim; i++) {
        let acc = 0;
        for (let j = 0; j < s; j++) acc += A[row + j] * K[j][i];
        ytmp[i] = yOld[i] + h * acc;
      }
      this.rhs(ytmp, K[s]); this.nfev++;
    }
    const F = this.F, fOld = K[0], fNew = K[N_STAGES];
    for (let i = 0; i < dim; i++) {
      const dy = this.y[i] - yOld[i];
      F[0][i] = dy; F[1][i] = h * fOld[i] - dy; F[2][i] = 2 * dy - h * (fNew[i] + fOld[i]);
      for (let r = 0; r < 4; r++) {
        let acc = 0;
        for (let j = 0; j < N_EXT; j++) acc += D[r * N_EXT + j] * K[j][i];
        F[3 + r][i] = h * acc;
      }
    }
    this.denseReady = true;
  }

  /** Evaluate the dense output at fraction s in [0,1] of the last step: y(tOld + s*h). */
  dense(s: number, out: Float64Array): void {
    const { dim, F, yOld } = this;
    const s1 = 1 - s;
    for (let i = 0; i < dim; i++) {
      // Horner-like nesting alternating s and (1-s), as in Hairer's contd8
      let v = F[6][i] * s;
      v = (v + F[5][i]) * s1; v = (v + F[4][i]) * s; v = (v + F[3][i]) * s1;
      v = (v + F[2][i]) * s; v = (v + F[1][i]) * s1; v = (v + F[0][i]) * s;
      out[i] = yOld[i] + v;
    }
  }
}
export { C as DOP853_C };
