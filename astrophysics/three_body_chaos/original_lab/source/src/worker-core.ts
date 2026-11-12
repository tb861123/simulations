// Request handler shared by the browser worker (worker.ts) and the Node test harness.
import { buildInitial, type Initial } from './initial.ts';
import { Simulator, lengthScaleOf, CK_LEN, FAIL, OUT, type RunResult } from './simulate.ts';
import { referenceIntegrate } from './reference.ts';
import type { JobConfig, Request, Response, RunSummary } from './messages.ts';
import type { ResultColumns } from './store.ts';
import { PAIRS } from './physics.ts';

const sim = new Simulator();

function summary(r: RunResult): RunSummary {
  return { outcome: r.outcome, fail: r.fail, flags: r.flags, tEnd: r.tEnd, tOnset: r.tOnset, minDist: r.minDist, minPair: r.minPair, nClose: r.nClose, eErr: r.eErr, steps: r.steps, exchange: r.exchange, escaper: r.escaper, yEnd: r.yEnd };
}

/** Initial condition of the sample at (x, y), or null when the setup is physically invalid there. */
export function initialAt(cfg: JobConfig, x: number, y: number, extra?: Record<string, number>, z?: Record<string, number>): Initial | null {
  const ini = buildInitial(cfg.physics, extra && Object.keys(extra).length ? { ...extra } : { [cfg.varX]: x, [cfg.varY]: y, ...z });
  for (let k = 0; k < 12; k++) if (!Number.isFinite(ini.y[k])) return null;
  for (const [i, j] of PAIRS) {
    const d = Math.hypot(ini.y[2 * j] - ini.y[2 * i], ini.y[2 * j + 1] - ini.y[2 * i + 1]);
    if (!(d > ini.r[i] + ini.r[j]) || d === 0) return null;
  }
  return ini;
}

function failedRow(): RunResult {
  return { outcome: OUT.FAILED, fail: FAIL.INVALID, flags: 0, tEnd: 0, tOnset: NaN, minDist: NaN, minPair: 0, nClose: 0, eErr: NaN, steps: 0, exchange: NaN, yEnd: new Float64Array(12), escaper: -1 };
}

/** Scaled phase-space distance between two states (documented: positions / L0, velocities / V0). */
export function scaledSeparation(a: ArrayLike<number>, b: ArrayLike<number>, L0: number, V0: number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += ((a[i] - b[i]) / L0) ** 2 + ((a[6 + i] - b[6 + i]) / V0) ** 2;
  return Math.sqrt(s);
}

export function handle(req: Request): { res: Response; transfer: Transferable[] } {
  const t0 = Date.now();
  try {
    switch (req.kind) {
      case 'batch': {
        const n = req.ids.length;
        const c: ResultColumns = {
          ids: req.ids, outcome: new Uint8Array(n), fail: new Uint8Array(n), flags: new Uint8Array(n), minPair: new Uint8Array(n),
          nClose: new Uint16Array(n), steps: new Uint32Array(n), tEnd: new Float64Array(n), tOn: new Float32Array(n), minD: new Float32Array(n), eErr: new Float32Array(n), exch: new Float32Array(n),
          ckIndex: new Int32Array(n).fill(-1), ck: new Float64Array(0),
        };
        const cks: Float64Array[] = [];
        for (let k = 0; k < n; k++) {
          const ini = initialAt(req.cfg, req.xs[k], req.ys[k], undefined, req.varZ && req.zs ? { [req.varZ]: req.zs[k] } : undefined);
          let r: RunResult;
          if (!ini) r = failedRow();
          else {
            const resume = req.ck && req.hasCk && req.hasCk[k] ? req.ck.subarray(k * CK_LEN, (k + 1) * CK_LEN) : undefined;
            r = sim.run(ini, req.cfg.physics.G, req.cfg.numerics, { horizon: req.horizon, wantCheckpoint: req.wantCk, resume, tolScale: req.tolScale });
          }
          c.outcome[k] = r.outcome; c.fail[k] = r.fail; c.flags[k] = r.flags; c.minPair[k] = r.minPair; c.nClose[k] = Math.min(65535, r.nClose);
          c.steps[k] = r.steps; c.tEnd[k] = r.tEnd; c.tOn[k] = r.tOnset; c.minD[k] = r.minDist; c.eErr[k] = r.eErr; c.exch[k] = r.exchange;
          if (r.checkpoint) { c.ckIndex[k] = cks.length; cks.push(r.checkpoint); }
        }
        c.ck = new Float64Array(cks.length * CK_LEN); cks.forEach((a, i) => c.ck.set(a, i * CK_LEN));
        const tr: Transferable[] = [c.outcome.buffer, c.fail.buffer, c.flags.buffer, c.minPair.buffer, c.nClose.buffer, c.steps.buffer, c.tEnd.buffer, c.tOn.buffer, c.minD.buffer, c.eErr.buffer, c.exch.buffer, c.ckIndex.buffer, c.ck.buffer, c.ids.buffer];
        return { res: { kind: 'batch', rid: req.rid, cols: c, ms: Date.now() - t0 }, transfer: tr };
      }
      case 'trajectory': {
        const ini = initialAt(req.cfg, 0, 0, req.overrides);
        if (!ini) return { res: { kind: 'error', rid: req.rid, message: 'The selected initial condition is not physically valid (bodies overlap or non-finite state).' }, transfer: [] };
        const r = sim.run(ini, req.cfg.physics.G, req.cfg.numerics, { horizon: req.horizon, record: { dtOut: req.dtOut }, tolScale: req.tolScale });
        const tr = r.trace!;
        return { res: { kind: 'trajectory', rid: req.rid, y0: ini.y, m: ini.m, r: ini.r, G: req.cfg.physics.G, trace: tr, summary: summary(r), ms: Date.now() - t0 }, transfer: [tr.t.buffer, tr.y.buffer] };
      }
      case 'reference': {
        const ini = initialAt(req.cfg, 0, 0, req.overrides);
        if (!ini) return { res: { kind: 'error', rid: req.rid, message: 'Invalid initial condition.' }, transfer: [] };
        const G = req.cfg.physics.G, nu = req.cfg.numerics;
        const pass1 = sim.run(ini, G, nu, { horizon: req.horizon });
        const tEnd = pass1.tEnd;
        const times = Float64Array.from({ length: req.nTimes }, (_, k) => ((k + 1) * tEnd) / req.nTimes);
        const pass2 = sim.run(ini, G, nu, { horizon: req.horizon, ladder: times });
        const L = lengthScaleOf(ini, nu);
        const ref = referenceIntegrate({ ini, G, times, tStop: tEnd, L, rtol: req.rtol, atol: req.atol });
        const main = pass2.ladderStates!;
        return { res: { kind: 'reference', rid: req.rid, times, main, ref: ref.states, mainSummary: summary(pass2), refTEnd: ref.tEnd, refContactPair: ref.contactPair, refTContact: ref.tContact, refOk: ref.ok, refMessage: ref.message, refSteps: ref.steps, refCascade: false, ms: Date.now() - t0 }, transfer: [times.buffer, main.buffer, ref.states.buffer] };
      }
      case 'validate': {
        const n = req.ids.length, S = req.scales.length;
        const outcome = new Uint8Array(n * S), fail = new Uint8Array(n * S), flags = new Uint8Array(n * S), tEnd = new Float64Array(n * S), tOn = new Float32Array(n * S);
        for (let k = 0; k < n; k++) {
          const ini = initialAt(req.cfg, req.xs[k], req.ys[k]);
          for (let s = 0; s < S; s++) {
            const r = ini ? sim.run(ini, req.cfg.physics.G, req.cfg.numerics, { horizon: req.horizon, tolScale: req.scales[s] }) : failedRow();
            outcome[k * S + s] = r.outcome; fail[k * S + s] = r.fail; flags[k * S + s] = r.flags; tEnd[k * S + s] = r.tEnd; tOn[k * S + s] = r.tOnset;
          }
        }
        return { res: { kind: 'validate', rid: req.rid, ids: req.ids, scales: req.scales, outcome, fail, flags, tEnd, tOnset: tOn, ms: Date.now() - t0 }, transfer: [req.ids.buffer, outcome.buffer, fail.buffer, flags.buffer, tEnd.buffer, tOn.buffer] };
      }
      case 'sensitivity': {
        const n = req.ids.length; const sens = new Float32Array(n).fill(NaN);
        const ladder = Float64Array.from({ length: req.nLadder }, (_, k) => ((k + 1) * req.horizon) / req.nLadder);
        for (let k = 0; k < n; k++) {
          const a = initialAt(req.cfg, req.xs[k], req.ys[k]), b = initialAt(req.cfg, req.xs[k] + req.dx, req.ys[k]);
          if (!a || !b) continue;
          const L0 = lengthScaleOf(a, req.cfg.numerics), G = req.cfg.physics.G, M = a.m[0] + a.m[1] + a.m[2], V0 = Math.sqrt(G * M / L0);
          const d0 = scaledSeparation(a.y, b.y, L0, V0);
          if (!(d0 > 0)) continue;
          const ra = sim.run(a, G, req.cfg.numerics, { horizon: req.horizon, ladder }), la = ra.ladderStates!.slice();
          const rb = sim.run(b, G, req.cfg.numerics, { horizon: req.horizon, ladder }), lb = rb.ladderStates!;
          for (let q = ladder.length - 1; q >= 0; q--) {
            if (Number.isFinite(la[q * 12]) && Number.isFinite(lb[q * 12])) {
              const d = scaledSeparation(la.subarray(q * 12, q * 12 + 12), lb.subarray(q * 12, q * 12 + 12), L0, V0);
              if (d > 0) sens[k] = Math.log(d / d0) / ladder[q];
              break;
            }
          }
        }
        return { res: { kind: 'sensitivity', rid: req.rid, ids: req.ids, sens, ms: Date.now() - t0 }, transfer: [req.ids.buffer, sens.buffer] };
      }
    }
  } catch (e) {
    return { res: { kind: 'error', rid: (req as any).rid, message: String((e as Error)?.message ?? e) }, transfer: [] };
  }
}
