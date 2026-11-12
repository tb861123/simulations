// Trajectory simulation: adaptive DOP853 integration + contact detection + outcome classification.
//
// One call integrates ONE initial condition until the first of:
//   * a physical contact between two bodies (distance = sum of radii), located INSIDE the step;
//   * an accepted escape (see "Escape criteria" below) or accepted complete disruption;
//   * the horizon (reported as "unresolved at the horizon" or a provisional pending escape);
//   * a numerical failure (step underflow, excessive work, non-finite state, singular encounter,
//     or conservation error above the unreliable threshold).
//
// The step sequence depends only on the initial condition, the tolerances and the (horizon-
// independent) step cap, never on the horizon or on whether a trajectory is being recorded.
// This makes continuation from a checkpoint bitwise-identical to a longer straight run on the
// same JavaScript engine, and makes the recorded trajectory identical to the map computation.
import { Dop853 } from './dop853.ts';
import { PAIRS, THIRD, derivative, diagnostics, conservationScales, conservationErrors, pairKepler, escaperRelative, type Diagnostics, type PairKepler, type Relative } from './physics.ts';
import type { Initial, Numerics } from './initial.ts';

/** Outcome codes (stored in a Uint8Array). */
export const OUT = {
  A_ESC: 0, B_ESC: 1, C_ESC: 2, COL_AB: 3, COL_AC: 4, COL_BC: 5,
  UNRESOLVED: 6, FAILED: 7, DISRUPTION: 8, NONE: 255,
} as const;
export const OUTCOME_COUNT = 9;
/** Failure codes (explain OUT.FAILED). */
export const FAIL = { NONE: 0, UNDERFLOW: 1, WORK: 2, NONFINITE: 3, ENERGY: 4, SINGULAR: 5, INVALID: 6 } as const;
export const FAIL_LABELS = ['none', 'step-size underflow', 'excessive work (max steps)', 'non-finite state', 'conservation error above unreliable threshold', 'singular encounter (bodies within the singularity floor)', 'invalid initial condition (bodies overlap or non-finite)'];
/** Flag bits. */
export const FLAG = { PROVISIONAL: 1, ENERGY_WARN: 2, PENDING: 4, GRAZE: 8 } as const;

export interface Checkpoint { data: Float64Array }
/** Checkpoint layout (fixed length so many can be stored in one typed-array table). */
export const CK_LEN = 32;
const CK = { t: 0, h: 1, rej: 2, steps: 3, nrej: 4, eMax: 5, minD: 6, minP: 7, nClose: 8, enc0: 9, cand: 12, onset: 13, need: 14, y: 16 } as const;

export interface RunOptions {
  horizon: number;
  /** multiply rtol and atol by this (validation runs use 0.1, 0.01) */ tolScale?: number;
  resume?: Float64Array;
  wantCheckpoint?: boolean;
  /** record a dense trajectory with output spacing <= dtOut */ record?: { dtOut: number };
  /** times at which to capture the state (finite-time sensitivity) */ ladder?: Float64Array;
}

export interface Trace { t: Float64Array; y: Float64Array /* 12 per sample */; n: number }

export interface RunResult {
  outcome: number; fail: number; flags: number;
  /** time reached: event time, acceptance time, or end of integration */ tEnd: number;
  /** estimated physical onset of the accepted escape (NaN otherwise) */ tOnset: number;
  minDist: number; minPair: number; nClose: number; eErr: number; steps: number;
  /** relative change of the surviving binary's orbital energy (NaN if undefined) */ exchange: number;
  yEnd: Float64Array;
  checkpoint?: Float64Array;
  trace?: Trace;
  ladderStates?: Float64Array;
  /** escape diagnostics at acceptance (for the viewer) */ escaper: number;
}

class Growable {
  buf: Float64Array; n = 0; stride: number;
  constructor(stride: number, cap = 1024) { this.stride = stride; this.buf = new Float64Array(cap * stride); }
  push(row: ArrayLike<number>): void {
    const need = (this.n + 1) * this.stride;
    if (need > this.buf.length) { const nb = new Float64Array(this.buf.length * 2); nb.set(this.buf); this.buf = nb; }
    for (let i = 0; i < this.stride; i++) this.buf[this.n * this.stride + i] = row[i];
    this.n++;
  }
}

/** Smallest pair distance below which a point-mass (radius 0) encounter is called singular. */
export const SINGULAR_FRACTION = 1e-8;

export function lengthScaleOf(ini: Initial, nu: Numerics): number {
  if (nu.lengthScale > 0) return nu.lengthScale;
  let d = Infinity;
  for (const [i, j] of PAIRS) d = Math.min(d, Math.hypot(ini.y[2 * j] - ini.y[2 * i], ini.y[2 * j + 1] - ini.y[2 * i + 1]));
  return d;
}

/** Reference time scale: period of a circular orbit of radius Lref about the total mass. */
export function timeScaleOf(G: number, M: number, L: number): number { return 2 * Math.PI * Math.sqrt(L * L * L / (G * M)); }

/** Pair-wise cubic Hermite minimum of |r_j - r_i|^2 over one step (gate for event location + closest approach). */
const hq = new Float64Array(2);
export function hermiteMin(y0: Float64Array, y1: Float64Array, i: number, j: number, h: number, out: Float64Array): void {
  const p0x = y0[2 * j] - y0[2 * i], p0y = y0[2 * j + 1] - y0[2 * i + 1];
  const p1x = y1[2 * j] - y1[2 * i], p1y = y1[2 * j + 1] - y1[2 * i + 1];
  const m0x = h * (y0[6 + 2 * j] - y0[6 + 2 * i]), m0y = h * (y0[6 + 2 * j + 1] - y0[6 + 2 * i + 1]);
  const m1x = h * (y1[6 + 2 * j] - y1[6 + 2 * i]), m1y = h * (y1[6 + 2 * j + 1] - y1[6 + 2 * i + 1]);
  const ev = (s: number, o: Float64Array): void => {
    const s2 = s * s, s3 = s2 * s;
    const a = 2 * s3 - 3 * s2 + 1, b = s3 - 2 * s2 + s, c = -2 * s3 + 3 * s2, d = s3 - s2;
    o[0] = a * p0x + b * m0x + c * p1x + d * m1x; o[1] = a * p0y + b * m0y + c * p1y + d * m1y;
  };
  let best = Infinity, bs = 0;
  for (let k = 0; k <= 8; k++) {
    const s = k / 8; ev(s, hq); const d2 = hq[0] * hq[0] + hq[1] * hq[1];
    if (d2 < best) { best = d2; bs = s; }
  }
  // Newton refinement of d/ds |q|^2 = 0 around the best sample
  let s = bs;
  for (let it = 0; it < 4; it++) {
    const s2 = s * s;
    const qx = hq[0], qy = hq[1]; void qx; void qy;
    ev(s, hq);
    const dA = 6 * s2 - 6 * s, dB = 3 * s2 - 4 * s + 1, dC = -6 * s2 + 6 * s, dD = 3 * s2 - 2 * s;
    const vx = dA * p0x + dB * m0x + dC * p1x + dD * m1x, vy = dA * p0y + dB * m0y + dC * p1y + dD * m1y;
    const ddA = 12 * s - 6, ddB = 6 * s - 4, ddC = -12 * s + 6, ddD = 6 * s - 2;
    const ax = ddA * p0x + ddB * m0x + ddC * p1x + ddD * m1x, ay = ddA * p0y + ddB * m0y + ddC * p1y + ddD * m1y;
    const g = hq[0] * vx + hq[1] * vy, gp = vx * vx + vy * vy + hq[0] * ax + hq[1] * ay;
    if (!(gp > 0)) break;
    s = Math.min(1, Math.max(0, s - g / gp));
  }
  ev(s, hq); const d2 = hq[0] * hq[0] + hq[1] * hq[1];
  if (d2 < best) { best = d2; bs = s; }
  out[0] = best; out[1] = bs;
}

/**
 * Reusable simulator: allocate once per worker and call run() many times.
 */
export class Simulator {
  private m = new Float64Array(3);
  private G = 1;
  private integ: Dop853;
  private scratch = new Float64Array(12);
  private ysub = new Float64Array(12);
  private hm = new Float64Array(2);
  private gate = new Float64Array(3);
  private kep: PairKepler = {} as PairKepler;
  private kep2: PairKepler = {} as PairKepler;
  private rel: Relative = {} as Relative;
  private diag: Diagnostics = {} as Diagnostics;

  constructor() {
    this.integ = new Dop853((y, dy) => derivative(3, this.m, this.G, y, dy), 12, 1e-9, 1e-11);
  }

  /** Is the escape / disruption condition satisfied right now?  Returns candidate (0-2 escaper, 3 disruption) or -1. */
  private testEscape(y: Float64Array, nu: Numerics, L: number, out: { period: number }): number {
    const m = this.m, G = this.G;
    let best = -1, bestR = 0, period = 0;
    for (let k = 0; k < 3; k++) {
      const p = 2 - k; const [i, j] = PAIRS[p];
      const kp = pairKepler(m, G, y, 3, i, j, this.kep);
      if (!(kp.eps < 0)) continue;                       // 1. the surviving pair must be bound
      const rl = escaperRelative(m, G, y, 3, k, i, j, this.rel);
      if (!(rl.eps > 0)) continue;                        // 2. the escaper must be unbound relative to the pair
      if (!(rl.radialDot > 0)) continue;                  // 3. ... and moving outward
      if (!(rl.R >= nu.hierarchy * kp.rApo)) continue;    // 4. ... and well separated from the pair's apocentre
      if (rl.R > bestR) { best = k; bestR = rl.R; period = kp.period; }
    }
    if (best >= 0) { out.period = period; return best; }
    // complete disruption: every pair unbound, separating and farther apart than hierarchy * L
    let all = true;
    for (let p = 0; p < 3 && all; p++) {
      const [i, j] = PAIRS[p]; const kp = pairKepler(m, G, y, 3, i, j, this.kep2);
      if (!(kp.eps > 0 && kp.radialDot > 0 && kp.r >= nu.hierarchy * L)) all = false;
    }
    if (all) { out.period = 0; return 3; }
    return -1;
  }

  run(ini: Initial, G: number, nu: Numerics, o: RunOptions): RunResult {
    const m = this.m; m.set(ini.m); this.G = G;
    const r = ini.r;
    const integ = this.integ;
    const ts = o.tolScale ?? 1;
    integ.rtol = nu.rtol * ts; integ.atol = nu.atol * ts;
    const y0 = ini.y;
    const scales = conservationScales(3, m, G, y0);
    const L = lengthScaleOf(ini, nu);
    const Mtot = m[0] + m[1] + m[2];
    const hCap = 4 * timeScaleOf(G, Mtot, L);          // horizon-independent step cap
    const rIn = nu.closeFactor * L, rOut = rIn * nu.closeHyst;
    const hMin = 64 * 2.220446049250313e-16;
    const singular = SINGULAR_FRACTION * L;
    // contact distance for each pair (radius sum); radius-0 pairs use the singularity floor instead
    const Rc = [r[0] + r[1], r[0] + r[2], r[1] + r[2]];
    const Rtarget = Rc.map((x) => (x > 0 ? x : singular));

    // reference binary (the most strongly bound pair at t = 0) for the energy-exchange diagnostic
    let refPair = -1, Eb0 = 0;
    for (let p = 0; p < 3; p++) {
      const kp = pairKepler(m, G, y0, 3, PAIRS[p][0], PAIRS[p][1], this.kep);
      const mu = m[PAIRS[p][0]] * m[PAIRS[p][1]] / (m[PAIRS[p][0]] + m[PAIRS[p][1]]);
      if (kp.eps < 0 && (refPair < 0 || mu * kp.eps < Eb0)) { refPair = p; Eb0 = mu * kp.eps; }
    }

    // state variables (some restored from a checkpoint)
    let steps = 0, nrej = 0, eMax = 0, minD = Infinity, minP = 0, nClose = 0;
    const inEnc = [0, 0, 0];
    let cand = -1, onset = NaN, need = NaN;
    let tNow = 0;
    if (o.resume) {
      const c = o.resume;
      integ.restore(c[CK.t], c.subarray(CK.y, CK.y + 12), c[CK.h], c[CK.rej] === 1);
      steps = c[CK.steps]; nrej = c[CK.nrej]; eMax = c[CK.eMax]; minD = c[CK.minD]; minP = c[CK.minP]; nClose = c[CK.nClose];
      inEnc[0] = c[CK.enc0]; inEnc[1] = c[CK.enc0 + 1]; inEnc[2] = c[CK.enc0 + 2];
      cand = c[CK.cand]; onset = c[CK.onset]; need = c[CK.need];
      tNow = c[CK.t];
    } else {
      integ.init(0, y0);
      for (let p = 0; p < 3; p++) {
        const d = Math.hypot(y0[2 * PAIRS[p][1]] - y0[2 * PAIRS[p][0]], y0[2 * PAIRS[p][1] + 1] - y0[2 * PAIRS[p][0] + 1]);
        inEnc[p] = d < rIn ? 1 : 0; if (d < minD) { minD = d; minP = p; }
      }
    }

    const rec = o.record ? { t: new Growable(1, 4096), y: new Growable(12, 4096), dt: o.record.dtOut } : null;
    if (rec && !o.resume) { rec.t.push([0]); rec.y.push(y0); }
    const ladder = o.ladder; let ladderStates: Float64Array | undefined;
    let lk = 0;
    if (ladder) { ladderStates = new Float64Array(ladder.length * 12).fill(NaN); }

    let outcome: number = OUT.UNRESOLVED, fail: number = FAIL.NONE, flags = 0, tOnset = NaN, escaper = -1, exchange = NaN;
    let finished = false;
    const yPrev = new Float64Array(12);
    const per = { period: 0 };
    let status = 0; // last step status

    const finishEscape = (k: number): void => {
      outcome = k === 3 ? OUT.DISRUPTION : k; escaper = k; tOnset = onset;
      if (k < 3 && refPair >= 0) {
        // surviving binary: pair index 2-k.  Compare its orbital energy with the reference binary's initial energy.
        const p = 2 - k; const [i, j] = PAIRS[p];
        const kp = pairKepler(m, G, integ.y, 3, i, j, this.kep);
        const mu = m[i] * m[j] / (m[i] + m[j]);
        if (Eb0 < 0) exchange = (mu * kp.eps - Eb0) / Math.abs(Eb0);
      }
    };

    // ---- main loop -------------------------------------------------------------------------
    while (!finished && integ.t < o.horizon) {
      if (steps >= nu.maxSteps) { outcome = OUT.FAILED; fail = FAIL.WORK; break; }
      // approach safeguard: no step may cover more than half of the time to contact for a closing pair
      let hMax = hCap;
      const y = integ.y;
      for (let p = 0; p < 3; p++) {
        const [i, j] = PAIRS[p];
        const dx = y[2 * j] - y[2 * i], dy = y[2 * j + 1] - y[2 * i + 1];
        const d = Math.hypot(dx, dy);
        const closing = -((dx * (y[6 + 2 * j] - y[6 + 2 * i]) + dy * (y[6 + 2 * j + 1] - y[6 + 2 * i + 1])) / d);
        if (closing > 0) { const tc = (d - Rtarget[p]) / closing; if (tc < 2 * hMax) hMax = Math.max(0.5 * tc, hMin * 1e3); }
      }
      yPrev.set(y); const tPrev = integ.t;
      steps++;
      status = integ.step(hMax);
      if (status === 0) { nrej++; if (integ.h < hMin * Math.max(1, Math.abs(integ.t))) { outcome = OUT.FAILED; fail = FAIL.UNDERFLOW; break; } continue; }
      if (status < 0) { outcome = OUT.FAILED; fail = status === -2 ? FAIL.NONFINITE : FAIL.UNDERFLOW; break; }
      const y1 = integ.y, t1 = integ.t, h = integ.hLast;
      if (!(Number.isFinite(y1[0]) && Number.isFinite(y1[5]) && Number.isFinite(y1[11]))) { outcome = OUT.FAILED; fail = FAIL.NONFINITE; break; }
      tNow = t1;

      // ---- pair geometry and event detection inside the step ---------------------------------
      let contactPair = -1, contactS = 2;
      let needDense = !!rec || (!!ladder && lk < ladder.length && ladder[lk] <= t1);
      const gate = this.gate;
      for (let p = 0; p < 3; p++) {
        const [i, j] = PAIRS[p];
        hermiteMin(yPrev, y1, i, j, h, this.hm);
        const dmin = Math.sqrt(this.hm[0]);
        gate[p] = dmin;
        if (dmin < minD) { minD = dmin; minP = p; }
        // close-encounter counter with hysteresis (enter below rIn, leave above rOut)
        if (!inEnc[p] && dmin < rIn) { inEnc[p] = 1; nClose++; }
        else if (inEnc[p] && Math.hypot(y1[2 * j] - y1[2 * i], y1[2 * j + 1] - y1[2 * i + 1]) > rOut) inEnc[p] = 0;
        // contact test: gate with the Hermite estimate (50 % margin), confirm and locate on the 7th-order dense output
        if (dmin <= 1.5 * Rtarget[p]) { needDense = true; }
      }
      if (needDense) integ.prepareDense();
      if (needDense) {
        for (let p = 0; p < 3; p++) {
          const [i, j] = PAIRS[p];
          if (gate[p] > 1.5 * Rtarget[p]) continue;
          const g = (s: number): number => {
            integ.dense(s, this.ysub); const ys = this.ysub;
            return (ys[2 * j] - ys[2 * i]) ** 2 + (ys[2 * j + 1] - ys[2 * i + 1]) ** 2 - Rtarget[p] * Rtarget[p];
          };
          // scan the dense output for the first sign change, then bisect
          const NS = 24; let sPrev = 0, gPrev = g(0), found = -1, gMin = Infinity, sMin = 0;
          if (gPrev <= 0) { found = 0; contactS = Math.min(contactS, 0); contactPair = p; continue; }
          for (let k = 1; k <= NS; k++) {
            const s = k / NS, gs = g(s);
            if (gs < gMin) { gMin = gs; sMin = s; }
            if (gs <= 0) { found = k; break; }
            sPrev = s; gPrev = gs;
          }
          let sHi = -1;
          if (found > 0) sHi = found / NS;
          else {
            // no sample inside contact: refine the dense minimum (golden-section) in case of a brief dip
            let a = Math.max(0, sMin - 1 / NS), b = Math.min(1, sMin + 1 / NS);
            const gr = 0.6180339887498949;
            for (let it = 0; it < 40; it++) { const c1 = b - gr * (b - a), c2 = a + gr * (b - a); if (g(c1) < g(c2)) b = c2; else a = c1; }
            const sm = 0.5 * (a + b);
            if (g(sm) <= 0) { sHi = sm; sPrev = Math.max(0, sMin - 1 / NS); gPrev = g(sPrev); if (!(gPrev > 0)) sPrev = 0; }
          }
          if (sHi < 0) continue;
          let lo = sPrev, hi = sHi;
          for (let it = 0; it < 80 && hi - lo > 1e-15; it++) { const mid = 0.5 * (lo + hi); if (g(mid) <= 0) hi = mid; else lo = mid; }
          if (hi < contactS) { contactS = hi; contactPair = p; }
        }
      }

      // ---- recording and ladder capture (up to the event, if any) ----------------------------
      const sEnd = contactPair >= 0 ? contactS : 1;
      if (rec) {
        const K = Math.max(1, Math.ceil(h * sEnd / rec.dt));
        for (let k = 1; k <= K; k++) {
          const s = sEnd * k / K;
          if (s >= 1) { rec.t.push([t1]); rec.y.push(y1); }
          else { integ.dense(s, this.scratch); rec.t.push([integ.tOld + s * h]); rec.y.push(this.scratch); }
        }
      }
      if (ladder) {
        while (lk < ladder.length && ladder[lk] <= integ.tOld + sEnd * h) {
          const s = (ladder[lk] - integ.tOld) / h;
          integ.dense(Math.min(1, Math.max(0, s)), this.scratch);
          ladderStates!.set(this.scratch, lk * 12); lk++;
        }
      }

      if (contactPair >= 0) {
        integ.dense(contactS, this.ysub);
        const tc = integ.tOld + contactS * h;
        tNow = tc;
        // the event state replaces the end-of-step state for the final report
        integ.y.set(this.ysub);
        if (Rc[contactPair] > 0) { outcome = OUT.COL_AB + contactPair; minD = Math.min(minD, Rc[contactPair]); minP = contactPair; }
        else { outcome = OUT.FAILED; fail = FAIL.SINGULAR; }
        finished = true; integ.t = tc;
        break;
      }

      // ---- conservation monitor (never corrected) -------------------------------------------
      const dg = diagnostics(3, m, G, y1, this.diag);
      const ce = conservationErrors(scales, dg);
      const e = Math.max(ce.relE, ce.relP, ce.relL);
      if (e > eMax) eMax = e;
      if (!Number.isFinite(e)) { outcome = OUT.FAILED; fail = FAIL.NONFINITE; break; }

      // ---- escape / disruption criteria with persistence ------------------------------------
      const c = this.testEscape(y1, nu, L, per);
      if (c !== cand) {
        cand = c;
        onset = c >= 0 ? t1 : NaN;
        need = c >= 0 ? (c < 3 ? Math.max(nu.minSustain, nu.sustainPeriods * per.period) : nu.minSustain) : NaN;
      } else if (c >= 0 && t1 - onset >= need) {
        finishEscape(c); finished = true; break;
      }
    }

    // ---- wrap up ---------------------------------------------------------------------------
    const integTEnd = integ.t;
    if (!finished && outcome === OUT.UNRESOLVED && integ.t >= o.horizon) {
      if (cand >= 0 && cand < 3) { outcome = cand; escaper = cand; tOnset = onset; flags |= FLAG.PROVISIONAL | FLAG.PENDING; }
      else if (cand === 3) { outcome = OUT.DISRUPTION; escaper = 3; tOnset = onset; flags |= FLAG.PROVISIONAL | FLAG.PENDING; }
    }
    if (outcome !== OUT.FAILED) {
      if (eMax > nu.failE) { outcome = OUT.FAILED; fail = FAIL.ENERGY; }
      else if (eMax > nu.warnE) flags |= FLAG.ENERGY_WARN | FLAG.PROVISIONAL;
    }
    void tNow;
    const res: RunResult = {
      outcome, fail, flags, tEnd: integTEnd, tOnset, minDist: minD, minPair: minP, nClose, eErr: eMax,
      steps, exchange, yEnd: Float64Array.from(integ.y), escaper,
    };
    if (o.wantCheckpoint && outcome === OUT.UNRESOLVED || (o.wantCheckpoint && (flags & FLAG.PENDING))) {
      const c = new Float64Array(CK_LEN);
      c[CK.t] = integ.t; c[CK.h] = integ.h; c[CK.rej] = integ.lastRejected ? 1 : 0; c[CK.steps] = steps; c[CK.nrej] = nrej;
      c[CK.eMax] = eMax; c[CK.minD] = minD; c[CK.minP] = minP; c[CK.nClose] = nClose;
      c[CK.enc0] = inEnc[0]; c[CK.enc0 + 1] = inEnc[1]; c[CK.enc0 + 2] = inEnc[2];
      c[CK.cand] = cand; c[CK.onset] = onset; c[CK.need] = need;
      c.set(integ.y, CK.y);
      res.checkpoint = c;
    }
    if (rec) {
      res.trace = { t: rec.t.buf.slice(0, rec.t.n), y: rec.y.buf.slice(0, rec.y.n * 12), n: rec.t.n };
      // make sure the final (event) state is the last sample
      if (finished && (outcome >= OUT.COL_AB && outcome <= OUT.COL_BC) || fail === FAIL.SINGULAR) {
        const tr = res.trace; tr.t[tr.n - 1] = integTEnd; tr.y.set(integ.y, (tr.n - 1) * 12);
      }
    }
    if (ladderStates) res.ladderStates = ladderStates;
    return res;
  }
}

/** Convenience wrapper (allocates a Simulator; use one Simulator in loops). */
export function runOnce(ini: Initial, G: number, nu: Numerics, o: RunOptions): RunResult {
  return new Simulator().run(ini, G, nu, o);
}

export { THIRD };
