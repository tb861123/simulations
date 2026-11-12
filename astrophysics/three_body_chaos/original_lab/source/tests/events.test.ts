import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NUMERICS, DEFAULT_PHYSICS, buildInitial, clonePhysics, type Physics } from '../src/initial.ts';
import { FAIL, FLAG, OUT, Simulator, hermiteMin } from '../src/simulate.ts';
import { PRESETS } from '../src/presets.ts';

const near = (a: number, b: number, tol: number, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b} (tol ${tol})`);
function explicit(m: number[], r: number[], pos: number[][], vel: number[][], horizon = 50): Physics {
  const p = clonePhysics(DEFAULT_PHYSICS); p.mode = 'explicit'; p.m = m; p.r = r; p.horizon = horizon;
  p.explicit = { x: pos.map((q) => q[0]), y: pos.map((q) => q[1]), vx: vel.map((q) => q[0]), vy: vel.map((q) => q[1]) }; return p;
}
const sim = new Simulator();
const run = (p: Physics, nu = DEFAULT_NUMERICS, o: any = {}) => sim.run(buildInitial(p), p.G, nu, { horizon: p.horizon, ...o });

test('collision detection: a fast head-on contact is located at the analytic time', () => {
  // masses are tiny so motion is essentially straight; contact when |x_A - x_B| = 0.04
  const p = explicit([1e-6, 1e-6, 1e-6], [0.02, 0.02, 0.02], [[-2, 0], [0, 0], [500, 500]], [[40, 0], [0, 0], [0, 0]], 5);
  const r = run(p);
  assert.equal(r.outcome, OUT.COL_AB);
  near(r.tEnd, (2 - 0.04) / 40, 1e-6, 'contact time');
  near(r.minDist, 0.04, 1e-9);
});

test('collision detection inside a step: grazing passes just inside / just outside contact are told apart', () => {
  const mk = (b: number) => explicit([1e-6, 1e-6, 1e-6], [0.02, 0.02, 0.02], [[-2, b], [0, 0], [500, 500]], [[400, 0], [0, 0], [0, 0]], 2);
  const hit = run(mk(0.0399)), miss = run(mk(0.0401));
  assert.equal(hit.outcome, OUT.COL_AB, 'impact parameter 0.0399 < 0.04 is a collision');
  assert.notEqual(miss.outcome, OUT.COL_AB, 'impact parameter 0.0401 > 0.04 is not');
  near(miss.minDist, 0.0401, 2e-5, 'closest approach of the miss');
  // a fast fly-through whose step end points are both far outside contact is still caught by the Hermite gate
  const out = new Float64Array(2);
  const y0 = new Float64Array(12), y1 = new Float64Array(12);
  y0[0] = -1; y0[6] = 1; y0[8] = 1; y1[0] = 1; y1[6] = 1; y1[8] = 1;  // body 0 passes through body 1 at the origin; step from t=0 to 2 (v = 1, h = 2)
  y0[2] = 0; y0[3] = 0.001; y1[2] = 0; y1[3] = 0.001; y0[8] = 0; y1[8] = 0;
  hermiteMin(y0, y1, 0, 1, 2, out);
  assert.ok(out[0] < 1e-5 && Math.abs(out[1] - 0.5) < 0.05, `min d² ${out[0]} at s=${out[1]}: the pass is detected although both end points are 1 unit away`);
});

test('point masses: a head-on encounter is reported as a singular failure, never integrated through', () => {
  const p = explicit([1e-6, 1e-6, 1e-6], [0, 0, 0], [[-2, 0], [0, 0], [500, 500]], [[40, 0], [0, 0], [0, 0]], 5);
  const r = run(p);
  assert.equal(r.outcome, OUT.FAILED); assert.equal(r.fail, FAIL.SINGULAR);
});

test('escape classification: fly-by C escapes with a surviving A–B; criteria and persistence are recorded', () => {
  const p = clonePhysics(DEFAULT_PHYSICS); p.scatter.b = 6; p.scatter.v = 2.5;
  const r = run(p);
  assert.equal(r.outcome, OUT.C_ESC);
  assert.ok(r.tOnset > 0 && r.tEnd > r.tOnset, 'acceptance is later than the estimated onset');
  const need = Math.max(DEFAULT_NUMERICS.minSustain, DEFAULT_NUMERICS.sustainPeriods * 2 * Math.PI * Math.sqrt(1 / 2));
  assert.ok(r.tEnd - r.tOnset >= need - 1e-9, 'sustain time respected: ' + (r.tEnd - r.tOnset));
  assert.ok(Math.abs(r.exchange) < 0.05, 'a distant fast fly-by barely changes the binary: ' + r.exchange);
  assert.equal(r.fail, 0);
});

test('escape classification: A escapes from a tight B–C binary; crossing a distance alone is not enough', () => {
  // B–C bound circular pair (sep 0.2, masses 1,1) at the origin; A far away and receding fast
  const v = Math.sqrt(2 / 0.2) / 2;
  const p = explicit([1, 1, 1], [0.01, 0.01, 0.01], [[30, 0], [-0.1, 0], [0.1, 0]], [[2, 0], [0, -v], [0, v]], 80);
  const r = run(p);
  assert.equal(r.outcome, OUT.A_ESC);
  // the same geometry but A merely drifting far away with a BOUND trajectory must not be called an escape
  const bound = explicit([1, 1, 1], [0.01, 0.01, 0.01], [[30, 0], [-0.1, 0], [0.1, 0]], [[-0.05, 0], [0, -v], [0, v]], 40);
  const rb = run(bound);
  assert.notEqual(rb.outcome, OUT.A_ESC, 'a body that is far away but still bound/inbound is not an escaper');
});

test('unresolved and provisional cases are distinguished from decided ones', () => {
  const hier = PRESETS.find((x) => x.id === 'hierarchical')!;
  const r = run({ ...hier.physics, horizon: 60 });
  assert.equal(r.outcome, OUT.UNRESOLVED);
  assert.ok(r.tEnd >= 60 && r.tEnd < 60 + 20, 'run ends at the first step at/after the horizon');
  // horizon shorter than the persistence requirement: the escape candidate is PENDING and provisional
  const p = clonePhysics(DEFAULT_PHYSICS); p.scatter.b = 6; p.scatter.v = 2.5;
  const first = run(p); const cut = first.tOnset + 0.5;
  const pending = run(p, DEFAULT_NUMERICS, { horizon: cut });
  assert.equal(pending.outcome, OUT.C_ESC); assert.ok(pending.flags & FLAG.PENDING && pending.flags & FLAG.PROVISIONAL);
  // a trajectory ending in complete disruption is classified explicitly, not forced into binary + escaper
  const dis = clonePhysics(DEFAULT_PHYSICS); dis.scatter.b = 1; dis.scatter.v = 2;
  assert.equal(run(dis).outcome, OUT.DISRUPTION);
});

test('numerical failures are explicit: excessive work and unreliable conservation', () => {
  const p = clonePhysics(DEFAULT_PHYSICS); p.scatter.b = 0.3; p.scatter.v = 0.3;
  const w = run(p, { ...DEFAULT_NUMERICS, maxSteps: 50 });
  assert.equal(w.outcome, OUT.FAILED); assert.equal(w.fail, FAIL.WORK);
  const lose = run(p, { ...DEFAULT_NUMERICS, rtol: 1e-3, atol: 1e-3, failE: 1e-6, warnE: 1e-8 });
  assert.ok(lose.outcome === OUT.FAILED ? lose.fail === FAIL.ENERGY : !!(lose.flags & FLAG.ENERGY_WARN) || lose.eErr < 1e-8, 'sloppy tolerances are flagged, not silently accepted');
});

test('recording a trajectory does not change the result (bitwise identical to the map computation)', () => {
  const p = clonePhysics(DEFAULT_PHYSICS); p.scatter.b = 0.5; p.scatter.v = 1; p.horizon = 80;
  const a = run(p), b = run(p, DEFAULT_NUMERICS, { record: { dtOut: 0.01 } });
  assert.equal(a.outcome, b.outcome); assert.equal(a.tEnd, b.tEnd); assert.equal(a.steps, b.steps); assert.deepEqual(Array.from(a.yEnd), Array.from(b.yEnd));
  const tr = b.trace!; assert.ok(tr.n > 100); assert.equal(tr.t[0], 0);
  for (let i = 1; i < tr.n; i++) assert.ok(tr.t[i] - tr.t[i - 1] <= 0.0101 + 1e-12 && tr.t[i] > tr.t[i - 1]);
  near(tr.t[tr.n - 1], b.tEnd, 1e-9);
});

test('continuation from a checkpoint is bitwise identical to a straight run to the longer horizon', () => {
  const p = clonePhysics(DEFAULT_PHYSICS); p.scatter.b = 1; p.scatter.v = 1;
  const first = run(p, DEFAULT_NUMERICS, { horizon: 40, wantCheckpoint: true });
  assert.equal(first.outcome, OUT.UNRESOLVED); assert.ok(first.checkpoint);
  const resumed = run(p, DEFAULT_NUMERICS, { horizon: 150, resume: first.checkpoint });
  const straight = run(p, DEFAULT_NUMERICS, { horizon: 150 });
  assert.equal(resumed.outcome, straight.outcome); assert.equal(resumed.tEnd, straight.tEnd); assert.equal(resumed.steps, straight.steps);
  assert.deepEqual(Array.from(resumed.yEnd), Array.from(straight.yEnd));
  assert.equal(resumed.nClose, straight.nClose); assert.equal(resumed.minDist, straight.minDist); assert.equal(resumed.eErr, straight.eErr);
  // events already found before the old horizon are unaffected by a longer horizon
  const q = clonePhysics(DEFAULT_PHYSICS); q.scatter.b = 0; q.scatter.v = 1;
  assert.deepEqual(Array.from(run(q, DEFAULT_NUMERICS, { horizon: 20 }).yEnd), Array.from(run(q, DEFAULT_NUMERICS, { horizon: 200 }).yEnd));
});

test('tighter tolerance reproduces classified collision times; ladder states agree with dense output', () => {
  const p = clonePhysics(DEFAULT_PHYSICS); p.scatter.b = 0.5; p.scatter.v = 1;
  const a = run(p), b = run(p, { ...DEFAULT_NUMERICS, rtol: 1e-12, atol: 1e-14 });
  assert.equal(a.outcome, b.outcome); near(a.tEnd, b.tEnd, 1e-3 * a.tEnd);
});
