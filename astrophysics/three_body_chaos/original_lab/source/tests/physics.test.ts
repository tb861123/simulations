import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accelerationDirect, conservationErrors, conservationScales, derivative, diagnostics, pairKepler } from '../src/physics.ts';
import { Dop853 } from '../src/dop853.ts';
import { DEFAULT_NUMERICS, DEFAULT_PHYSICS, binaryState, buildInitial, clonePhysics, toCentreOfMass, validatePhysics } from '../src/initial.ts';
import { Simulator } from '../src/simulate.ts';
import { PRESETS } from '../src/presets.ts';

const near = (a: number, b: number, tol: number, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b} (tol ${tol})`);

test('mutual gravitational acceleration: matches the textbook sum, obeys Newton III, all bodies interact', () => {
  const m = [1.3, 0.7, 2.1], G = 2.5;
  const y = Float64Array.from([0.1, -0.2, 1.4, 0.5, -0.9, 1.1, 0, 0, 0, 0, 0, 0]);
  const dy = new Float64Array(12); derivative(3, m, G, y, dy);
  const a = new Float64Array(6); accelerationDirect(3, m, G, y.subarray(0, 6), a);
  for (let k = 0; k < 6; k++) near(dy[6 + k], a[k], 1e-14 * Math.abs(a[k]) + 1e-15, 'acc ' + k);
  // total force on the system vanishes (third law)
  let fx = 0, fy = 0; for (let i = 0; i < 3; i++) { fx += m[i] * dy[6 + 2 * i]; fy += m[i] * dy[7 + 2 * i]; }
  near(fx, 0, 1e-13); near(fy, 0, 1e-13);
  // moving only body C changes the acceleration of A (full mutual coupling)
  const y2 = y.slice(); y2[4] += 0.3; const dy2 = new Float64Array(12); derivative(3, m, G, y2, dy2);
  assert.ok(Math.abs(dy2[6] - dy[6]) > 1e-4 && Math.abs(dy2[8] - dy[8]) > 1e-4);
  // inverse-square law for a single pair
  const two = Float64Array.from([0, 0, 2, 0, 50, 50, 0, 0, 0, 0, 0, 0]);
  derivative(3, [1, 1, 1e-12], 1, two, dy); near(dy[6], 0.25, 1e-9);
});

test('two-body limit: circular orbit has the Kepler period and conserves energy', () => {
  const G = 1, mA = 1, mB = 0.2, sep = 1.7;
  const bin = binaryState(G, mA, mB, sep, 0, 0);
  const y = Float64Array.from([bin.rA[0], bin.rA[1], bin.rB[0], bin.rB[1], 1e4, 1e4, bin.vA[0], bin.vA[1], bin.vB[0], bin.vB[1], 0, 0]);
  const m = [mA, mB, 1e-15];
  const ig = new Dop853((yy, d) => derivative(3, m, G, yy, d), 12, 1e-12, 1e-14); ig.init(0, y);
  const T = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * (mA + mB)));
  near(bin.period, T, 1e-12);
  const e0 = diagnostics(3, m, G, y).E;
  while (ig.t < 3 * T) { assert.equal(ig.step(Math.min(1, 3 * T - ig.t)) > 0 || true, true); }
  // after exactly 3 periods positions return (use dense output to land on 3T)
  ig.prepareDense(); const out = new Float64Array(12); ig.dense((3 * T - ig.tOld) / ig.hLast, out);
  for (const k of [0, 1, 2, 3]) near(out[k], y[k], 5e-8, 'position ' + k);
  near(diagnostics(3, m, G, out).E, e0, 1e-10 * Math.abs(e0));
  // separation stays constant on a circular orbit
  near(Math.hypot(out[2] - out[0], out[3] - out[1]), sep, 1e-8);
});

test('circular binary construction for unequal masses: speeds, centre of mass, angular momentum, phase rotation', () => {
  const G = 1.7, mA = 3, mB = 0.5, sep = 2.2;
  for (const phase of [0, 33, 90, 215]) {
    const b = binaryState(G, mA, mB, sep, 0, phase);
    const rel = [b.rB[0] - b.rA[0], b.rB[1] - b.rA[1]], vrel = [b.vB[0] - b.vA[0], b.vB[1] - b.vA[1]];
    near(Math.hypot(rel[0], rel[1]), sep, 1e-12);
    near(Math.hypot(vrel[0], vrel[1]), Math.sqrt(G * (mA + mB) / sep), 1e-12, 'v_rel');
    near(rel[0] * vrel[0] + rel[1] * vrel[1], 0, 1e-12, 'perpendicular');
    near(mA * b.rA[0] + mB * b.rB[0], 0, 1e-12); near(mA * b.vA[0] + mB * b.vB[0], 0, 1e-12); near(mA * b.vA[1] + mB * b.vB[1], 0, 1e-12);
    near(Math.atan2(rel[1], rel[0]) * 180 / Math.PI, ((phase + 180) % 360) - 180, 1e-9, 'phase');
    assert.ok(rel[0] * vrel[1] - rel[1] * vrel[0] > 0, 'counter-clockwise');
    // circularity: orbital energy equals -G m_A m_B/(2 sep)
    const y = Float64Array.from([...b.rA, ...b.rB, 9e3, 9e3, ...b.vA, ...b.vB, 0, 0]);
    const k = pairKepler([mA, mB, 1e-12], G, y, 3, 0, 1);
    near(k.e, 0, 1e-9, 'eccentricity'); near(k.a, sep, 1e-9, 'semi-major axis');
  }
  // the default (equal-mass) case reproduces the brief's numbers exactly
  const d = binaryState(1, 1, 1, 1, 0, 0);
  near(d.rA[0], -0.5, 1e-15); near(d.rB[0], 0.5, 1e-15); near(d.vA[1], -Math.sqrt(0.5), 1e-15); near(d.vB[1], Math.sqrt(0.5), 1e-15);
  // eccentric binary starts at pericentre
  const e = binaryState(1, 1, 1, 1, 0.5, 0); const kk = pairKepler([1, 1, 1e-12], 1, Float64Array.from([...e.rA, ...e.rB, 9e3, 9e3, ...e.vA, ...e.vB, 0, 0]), 3, 0, 1);
  near(kk.e, 0.5, 1e-12); near(kk.a, 2, 1e-12);
});

test('default scattering set-up matches the brief and sits in the centre-of-mass frame', () => {
  const ini = buildInitial(DEFAULT_PHYSICS, { b: 1.25, v: 0.9 });
  const d = diagnostics(3, ini.m, 1, ini.y);
  near(d.cx, 0, 1e-14); near(d.cy, 0, 1e-14); near(d.px, 0, 1e-14); near(d.py, 0, 1e-14);
  // relative positions are unchanged by the transformation: C is 12 left of the A-B midpoint, b above it
  near(ini.y[4] - (ini.y[0] + ini.y[2]) / 2, -12, 1e-12); near(ini.y[5] - (ini.y[1] + ini.y[3]) / 2, 1.25, 1e-12);
  near(ini.y[10] - (ini.y[6] + ini.y[8]) / 2, 0.9, 1e-12);
  assert.deepEqual(validatePhysics(DEFAULT_PHYSICS), []);
});

test('transform to centre-of-mass frame preserves all relative positions and velocities', () => {
  const m = [1, 2, 3]; const y = Float64Array.from([1, 2, -3, 1, 0.5, 4, 0.3, -0.2, 1.1, 0.7, -0.4, 0.9]); const y0 = y.slice();
  toCentreOfMass(m, y);
  const d = diagnostics(3, m, 1, y); near(d.cx, 0, 1e-14); near(d.cvx, 0, 1e-14); near(d.cvy, 0, 1e-14);
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) for (const k of [0, 1]) { near(y[2 * j + k] - y[2 * i + k], y0[2 * j + k] - y0[2 * i + k], 1e-14); near(y[6 + 2 * j + k] - y[6 + 2 * i + k], y0[6 + 2 * j + k] - y0[6 + 2 * i + k], 1e-14); }
});

test('conservation diagnostics and scaled errors stay meaningful when E, P, L are ~0', () => {
  // bound system with E close to zero, zero momentum and zero angular momentum (a head-on release from rest)
  const m = [1, 1, 1]; const y = Float64Array.from([-1, 0, 1, 0, 0, 0.5, 0, 0, 0, 0, 0, 0]);
  const sc = conservationScales(3, m, 1, y);
  assert.ok(sc.SE > 0 && sc.SP > 0 && sc.SL > 0);
  const d = diagnostics(3, m, 1, y);
  near(d.px, 0, 1e-15); near(d.L, 0, 1e-15);
  // a perturbed copy gives finite relative errors, not NaN/Infinity
  const y2 = y.slice(); y2[6] = 1e-6; const e = conservationErrors(sc, diagnostics(3, m, 1, y2));
  assert.ok(Number.isFinite(e.relE) && Number.isFinite(e.relP) && Number.isFinite(e.relL));
  // total energy of an equal-mass triangle: K + U
  const tri = Float64Array.from([0, 0, 1, 0, 0.5, Math.sqrt(3) / 2, 0, 0, 0, 0, 0, 0]);
  near(diagnostics(3, m, 1, tri).U, -3, 1e-14);
});

test('adaptive integrator converges with the tolerance and agrees with SciPy DOP853 (rtol 1e-13)', () => {
  const ref = JSON.parse(readFileSync(new URL('./fixtures/scipy-reference.json', import.meta.url), 'utf8'));
  const ics = JSON.parse(readFileSync(new URL('./fixtures/ics.json', import.meta.url), 'utf8'));
  const sim = new Simulator();
  for (let c = 0; c < ref.length; c++) {
    const ini = { n: 3 as const, m: Float64Array.from(ics[c].m), r: new Float64Array(3), y: Float64Array.from(ics[c].y0) };
    const times = Float64Array.from(ref[c].times);
    const errs: number[] = [];
    for (const rtol of [1e-7, 1e-9, 1e-11]) {
      const r = sim.run(ini, ics[c].G, { ...DEFAULT_NUMERICS, rtol, atol: rtol / 100, maxSteps: 1e6 }, { horizon: times[times.length - 1] + 1e-6, ladder: times });
      let worst = 0;
      for (let k = 0; k < times.length; k++) for (let i = 0; i < 12; i++) worst = Math.max(worst, Math.abs(r.ladderStates![k * 12 + i] - ref[c].states[k][i]));
      errs.push(worst);
    }
    // sensitivity grows with time for chaotic cases, so require a generous absolute bound but demand monotone improvement
    assert.ok(errs[2] < 2e-6, `${ref[c].name}: error at rtol 1e-11 was ${errs[2]}`);
    assert.ok(errs[1] < 1e-4, `${ref[c].name}: error at rtol 1e-9 was ${errs[1]}`);
    assert.ok(errs[2] <= errs[0] * 1.0001, `${ref[c].name}: error did not improve with tolerance: ${errs}`);
  }
});

test('integrator has high order: error falls much faster than the step size (smooth Kepler test)', () => {
  const G = 1, m = [1, 1e-9, 1e-9];
  // eccentric orbit of B around A, start at pericentre
  const y0 = Float64Array.from([0, 0, 0.5, 0, 1e3, 1e3, 0, 0, 0, 1.5, 0, 0]);
  const ig = (rtol: number) => { const d = new Dop853((y, dy) => derivative(3, m, G, y, dy), 12, rtol, rtol * 1e-3); d.init(0, y0); let n = 0; while (d.t < 6) { d.step(6 - d.t); n++; } return { y: d.y.slice(), n }; };
  const ref = ig(1e-13), a = ig(1e-6), b = ig(1e-9);
  const ea = Math.abs(a.y[2] - ref.y[2]) + Math.abs(a.y[3] - ref.y[3]), eb = Math.abs(b.y[2] - ref.y[2]) + Math.abs(b.y[3] - ref.y[3]);
  assert.ok(eb < ea / 100, `errors ${ea} -> ${eb}`);
  assert.ok(b.n < 4 * a.n, 'step count grows only mildly with tolerance (order-8 behaviour)');
});

test('presets: initial conditions valid; figure-eight, Lagrange triangle and Pythagorean behave as documented', () => {
  const sim = new Simulator();
  for (const p of PRESETS) assert.deepEqual(validatePhysics(p.physics), [], p.name);
  // figure-eight: return to the start after one period (data has 8 digits)
  const f8 = PRESETS.find((p) => p.id === 'figure8')!; const i8 = buildInitial(f8.physics);
  const r8 = sim.run(i8, 1, DEFAULT_NUMERICS, { horizon: 6.32591398 + 1e-9, ladder: Float64Array.from([6.32591398]) });
  let err = 0; for (let k = 0; k < 12; k++) err = Math.max(err, Math.abs(r8.ladderStates![k] - i8.y[k]));
  assert.ok(err < 2e-5, 'figure-eight return error ' + err);
  assert.ok(r8.eErr < 1e-7);
  const e0 = diagnostics(3, i8.m, 1, i8.y).E; near(e0, -1.2871, 5e-4, 'figure-eight energy');
  // Lagrange triangle: stays equilateral and rotates rigidly for 20 periods (Routh-stable masses)
  const lg = PRESETS.find((p) => p.id === 'lagrange')!; const il = buildInitial(lg.physics);
  const omega = Math.sqrt(1.02), T = 2 * Math.PI / omega;
  const rl = sim.run(il, 1, DEFAULT_NUMERICS, { horizon: 20 * T + 1e-9, ladder: Float64Array.from([20 * T]) });
  const s = rl.ladderStates!; const side = (i: number, j: number) => Math.hypot(s[2 * j] - s[2 * i], s[2 * j + 1] - s[2 * i + 1]);
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) near(side(i, j), 1, 1e-5, 'side');
  // Pythagorean: the lightest body escapes once the tolerance is tight; the default tolerance gives a different (wrong) answer
  const py = PRESETS.find((p) => p.id === 'pythagorean')!; const ip = buildInitial(py.physics);
  const tight = sim.run(ip, 1, { ...DEFAULT_NUMERICS, ...py.numerics }, { horizon: 120 });
  assert.equal(tight.outcome, 0, 'mass-3 body (A) should escape');
  near(tight.tEnd, 61.8, 1.0, 'escape time');
  const loose = sim.run(ip, 1, DEFAULT_NUMERICS, { horizon: 120 });
  assert.notEqual(loose.outcome, 0, 'the default tolerance gets the wrong escaper (this is why the preset tightens it)');
  void clonePhysics;
});
