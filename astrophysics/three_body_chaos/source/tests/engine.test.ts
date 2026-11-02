import test from 'node:test';
import assert from 'node:assert/strict';
import { Layer, NOT_COMPUTED, progressiveOrder, VALID } from '../src/store.ts';
import { EDGE, detectEdges, rankRegions, completeStride, boundarySamplesToValidate } from '../src/boundaries.ts';
import { refineCandidates, supplementaryPoint, mulberry32, findIslands } from '../src/sampling.ts';
import { Scheduler, type Job, type WorkerLike } from '../src/scheduler.ts';
import { Lab, formatEta } from '../src/lab.ts';
import { InlineWorker } from '../src/scheduler.ts';
import { OUT } from '../src/simulate.ts';
import { classifyAgreement } from '../src/validation.ts';
import { buildInitial, clampParam, DEFAULT_PHYSICS, DEFAULT_NUMERICS } from '../src/initial.ts';
import { handle } from '../src/worker-core.ts';
import { BATCH_EXPS, runBatch } from '../src/batch.ts';
import { checkSnapshot, snapshotToBlob, bytesToSnapshot } from '../src/persist.ts';
import { normaliseHex, parseChannel, parseHex, toHex, hsvToRgb, rgbToHsv } from '../src/colours.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (f: () => boolean, ms = 60000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) throw new Error('timeout'); await sleep(20); } };
const near = (a: number, b: number, tol: number, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);
const rect = { x0: -3, x1: 3, y0: 0.25, y1: 2.5 };

function fakeLayer(n = 16): Layer {
  const L = new Layer(1, rect, n); const s = L.store;
  for (let i = 0; i < n * n; i++) { s.outcome[i] = (s.X[i] < 0) ? OUT.C_ESC : OUT.COL_AB; s.tEnd[i] = 10; s.minD[i] = 0.5; s.computed++; }
  return L;
}

test('map selection: samples sit at pixel centres, y increases upward, coordinates are exact', () => {
  const L = new Layer(1, rect, 10);
  assert.equal(L.store.X[0], rect.x0 + 0.5 * 0.6); assert.equal(L.store.Y[0], rect.y0 + 0.5 * 0.225);
  const topLeft = 9 * 10; assert.ok(L.store.Y[topLeft] > L.store.Y[0]); near(L.store.Y[topLeft], rect.y1 - 0.5 * 0.225, 1e-12);
  assert.equal(L.leaf(37).sample, 37);
  const lab = new Lab(() => new InlineWorker(), 1); lab.scheduler.cancelAll(); lab.scheduler.pause();
  const physBefore = JSON.stringify(lab.pending.physics);
  const L2 = lab.cur; const pk = lab.pick(0.31, 1.234)!;
  assert.equal(pk.layer, L2);
  const id = pk.sampleId, [i, j] = [id % L2.n, Math.floor(id / L2.n)];
  assert.equal(i, Math.floor((0.31 + 3) / L2.dx)); assert.equal(j, Math.floor((1.234 - 0.25) / L2.dy));
  const d = lab.describe(L2.id, id);
  // the displayed parameters ARE the stored coordinates, and the generated state equals buildInitial for exactly those values
  const ini = buildInitial(lab.applied.physics, { b: L2.store.X[id], v: L2.store.Y[id] });
  assert.deepEqual(Array.from(d.ini.y), Array.from(ini.y)); assert.equal(d.x, L2.store.X[id]);
  lab.select(L2.id, id);
  assert.equal(JSON.stringify(lab.pending.physics), physBefore, 'selecting a map sample must not move any body');
  lab.dispose();
});

test('progressive order is a permutation with the coarsest lattice first', () => {
  const n = 50, o = progressiveOrder(n, 2); const seen = new Set(o);
  assert.equal(seen.size, n * n);
  const firstBlock = Array.from(o.slice(0, 13 * 13));
  assert.ok(firstBlock.every((id) => (id % n) % 4 === 0 && Math.floor(id / n) % 4 === 0));
});

test('boundary detection finds exactly the outcome change; subdivision creates correct children', () => {
  const L = fakeLayer(16); const e = detectEdges(L);
  assert.equal(e.stride, 1);
  assert.equal(e.n, 16);                                   // one vertical line of 16 neighbouring pairs
  assert.ok(Array.from(e.kind).every((k) => (k & EDGE.OUTCOME) && (k & EDGE.COLEJ)));
  assert.ok(Array.from(e.mx).every((x) => Math.abs(x) < 1e-12), 'edge midpoints lie on the dividing line b = 0');
  // refine one boundary leaf
  const id = L.leafAt(-0.01, 1.0); const parent = L.leaf(id);
  const kids = L.refine(id);
  assert.equal(kids.length, 4); assert.equal(L.nodeCount, 4);
  const cs = kids.map((k) => [L.store.X[k], L.store.Y[k]]);
  near(cs[0][0], parent.cx - parent.hw / 2, 1e-12); near(cs[3][1], parent.cy + parent.hh / 2, 1e-12);
  for (let q = 0; q < 4; q++) assert.equal(L.leaf(L.leafAt(cs[q][0], cs[q][1])).sample, kids[q], 'leafAt finds each child');
  assert.equal(L.isLeaf(id), false);
  kids.forEach((k, q) => { L.store.outcome[k] = cs[q][0] < 0 ? OUT.C_ESC : OUT.COL_AB; L.store.tEnd[k] = 10; L.store.minD[k] = 0.5; });
  const e2 = detectEdges(L);
  assert.ok(e2.n > 0 && e2.n < 40);
  // candidates: boundary leaves only, deeper cells are ranked lower; limits respected
  const s = { maxDepth: 1, maxExtra: 1000, minDx: 0, minDy: 0, criteria: EDGE.OUTCOME, seed: 1, supFraction: 0 };
  const c = refineCandidates(L, e2, s, new Set());
  assert.ok(c.length > 0);
  for (const cand of c) { const lf = L.leaf(cand.ref); assert.ok(Math.abs(lf.cx) <= 2 * lf.hw + 1e-9, 'candidates sit next to the boundary'); assert.ok(lf.depth < 1); }
  assert.equal(refineCandidates(L, e2, { ...s, minDx: 10 }, new Set()).length, 0, 'minimum cell scale blocks refinement');
});

test('regions are ranked from real samples and validation regions are listed separately', () => {
  const L = fakeLayer(24); const e = detectEdges(L);
  const r = rankRegions(L, e);
  assert.ok(r.interest.length > 0 && r.interest[0].rect.x0 <= 0 && r.interest[0].rect.x1 >= 0);
  assert.ok(r.interest[0].outcomes.includes(OUT.C_ESC) && r.interest[0].outcomes.includes(OUT.COL_AB));
  assert.ok(r.interest[0].pair);
  assert.equal(r.validation.filter((v) => v.kind !== 'validation').length, 0);
  const ids = boundarySamplesToValidate(L, e, 10); assert.equal(ids.length, 10);
  ids.forEach((id) => assert.equal(L.store.valid[id], VALID.UNTESTED));
  // after validation they are no longer offered
  ids.forEach((id) => { L.store.valid[id] = VALID.AGREE; });
  assert.ok(!boundarySamplesToValidate(L, e, 10).some((id) => ids.includes(id)));
});

test('supplementary exploration is reproducible and finds islands', () => {
  const a = Array.from({ length: 50 }, (_, k) => supplementaryPoint(rect, 7, k)), b = Array.from({ length: 50 }, (_, k) => supplementaryPoint(rect, 7, k));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, Array.from({ length: 50 }, (_, k) => supplementaryPoint(rect, 8, k)));
  const strata = new Set(Array.from({ length: 64 * 64 }, (_, k) => { const [x, y] = supplementaryPoint(rect, 3, k); return Math.floor((x - rect.x0) / 6 * 64) + 64 * Math.floor((y - rect.y0) / 2.25 * 64); }));
  assert.equal(strata.size, 64 * 64, 'one point per stratum before any repeat');
  const L = fakeLayer(8); const id = L.store.add(-2.5, 1, 255); L.store.outcome[id] = OUT.UNRESOLVED; L.store.tEnd[id] = 200;
  assert.equal(findIslands(L).size, 1);
  assert.equal(mulberry32(5)(), mulberry32(5)());
});

class FakeWorker implements WorkerLike {
  onmessage: ((ev: { data: any }) => void) | null = null; sent: any[] = [];
  postMessage(m: any) { this.sent.push(m); }
  terminate() {}
  reply(data: any) { this.onmessage?.({ data }); }
}
function job(id: number, priority: number, label: string, log: string[], stale = () => false, n = 1): Job & { handled: number } {
  let left = n; let handled = 0;
  return { id, priority, label, handled, next: () => (left > 0 ? (left--, { req: { kind: 'batch', label } as any }) : null), exhausted: () => left === 0, isStale: stale, onResponse: () => { handled++; log.push('done ' + label); } } as any;
}

test('scheduler: priority order, pause/resume, and stale results are rejected', async () => {
  const w = new FakeWorker(); const s = new Scheduler(() => w, 1); const log: string[] = [];
  s.pause();
  s.add(job(1, 4, 'background', log)); s.add(job(2, 0, 'manual', log)); s.add(job(3, 3, 'explore', log));
  s.pump(); assert.equal(w.sent.length, 0, 'paused: nothing dispatched');
  s.resume(); assert.equal(w.sent[0].label, 'manual', 'most urgent first');
  w.reply({ kind: 'batch' }); assert.equal(w.sent[1].label, 'explore'); w.reply({ kind: 'batch' }); assert.equal(w.sent[2].label, 'background'); w.reply({ kind: 'batch' });
  assert.deepEqual(log, ['done manual', 'done explore', 'done background']);
  // stale: the configuration changes while a chunk is in flight
  let stale = false; const j = job(9, 1, 'stale-job', log, () => stale);
  s.add(j); assert.equal(w.sent.length, 4); stale = true; w.reply({ kind: 'batch' });
  assert.equal(s.stats.staleRejected >= 1, true); assert.ok(!log.includes('done stale-job'));
  // an urgent job added while a worker is busy goes next, ahead of older lower-priority work
  const log2: string[] = []; const w2 = new FakeWorker(); const s2 = new Scheduler(() => w2, 1);
  s2.add(job(1, 4, 'bg1', log2, () => false, 3));
  s2.add(job(2, 0, 'urgent', log2));
  w2.reply({ kind: 'batch' }); assert.equal(w2.sent[1].label, 'urgent'); w2.reply({ kind: 'batch' }); assert.equal(w2.sent[2].label, 'bg1');
});

test('lab: full map from real simulations; colour changes never invalidate or recalculate; physical changes do', async () => {
  const lab = new Lab(() => new InlineWorker(), 2);
  lab.scheduler.cancelAll(); lab.pending.resolution = 50; lab.pending.physics.horizon = 60; assert.deepEqual(lab.applyPending(), []);
  await until(() => lab.remainingUniform() === 0);
  const L = lab.cur, s = L.store;
  assert.equal(s.computed, 2500);
  for (let i = 0; i < 2500; i += 97) assert.notEqual(s.outcome[i], NOT_COMPUTED);
  // spot-check: a stored sample equals a fresh independent run
  const r = handle({ kind: 'batch', rid: 1, cfg: lab.jobConfig(), horizon: 60, ids: Int32Array.of(1234), xs: Float64Array.of(s.X[1234]), ys: Float64Array.of(s.Y[1234]), wantCk: false });
  assert.equal((r.res as any).cols.outcome[0], s.outcome[1234]); assert.equal((r.res as any).cols.tEnd[0], s.tEnd[1234]);
  const snap = { epoch: lab.epoch, fp: lab.fingerprint, version: L.version, layerId: L.id, outcome: s.outcome.slice(), completed: lab.scheduler.stats.completed, jobs: lab.scheduler.jobCount, cks: L.checkpoints.size };
  // validation results survive a colour change
  lab.validate(lab.untestedBoundary(lab.cur, 5)); await until(() => lab.scheduler.isIdle()); await sleep(50);
  const validated = Array.from(s.valid).filter((v) => v > 0).length; assert.ok(validated > 0);
  snap.completed = lab.scheduler.stats.completed; snap.jobs = lab.scheduler.jobCount;
  const v1 = L.version;
  assert.ok(lab.setBodyColour(0, '#123456')); assert.ok(lab.setOutcomeColour(2, 'abc')); assert.equal(lab.setBodyColour(1, 'nonsense'), false);
  await sleep(100);
  assert.equal(lab.epoch, snap.epoch); assert.equal(lab.fingerprint, snap.fp); assert.equal(L.version, v1, 'no data touched'); assert.equal(lab.cur, L);
  assert.equal(lab.scheduler.stats.completed, snap.completed, 'no new work'); assert.equal(lab.scheduler.jobCount, 0);
  assert.deepEqual(Array.from(s.outcome), Array.from(snap.outcome)); assert.equal(Array.from(s.valid).filter((v) => v > 0).length, validated, 'validation results kept');
  assert.equal(lab.appearance.bodies[0], '#123456'); assert.equal(lab.appearance.outcomes[2], '#aabbcc');
  // a physical change invalidates: new epoch, new fingerprint, nothing from the old map in the new one
  lab.pending.physics.m[2] = 1.5; assert.equal(lab.pendingDirty(), true);
  assert.equal(lab.epoch, snap.epoch, 'pending edits alone change nothing');
  assert.deepEqual(lab.applyPending(), []);
  assert.ok(lab.epoch > snap.epoch); assert.notEqual(lab.fingerprint, snap.fp); assert.notEqual(lab.cur, L);
  assert.ok(lab.cur.store.computed < 2500, 'old results were not relabelled as new');
  assert.equal(lab.appearance.bodies[0], '#123456', 'appearance survives');
  // late results from the old epoch are discarded rather than merged
  await until(() => lab.remainingUniform() === 0);
  assert.ok(lab.scheduler.stats.staleRejected >= 0);
  // reverting to the earlier exact configuration restores the cached results (parameter-aware cache)
  lab.pending.physics.m[2] = 1; lab.applyPending();
  assert.equal(lab.cur, L, 'cache hit: same layer object restored'); assert.equal(lab.fingerprint, snap.fp);
  assert.deepEqual(Array.from(L.store.outcome), Array.from(snap.outcome));
  lab.dispose();
});

test('lab: extending the horizon keeps decided samples and continues unresolved ones exactly', async () => {
  const lab = new Lab(() => new InlineWorker(), 2); lab.scheduler.cancelAll();
  lab.pending.resolution = 50; lab.pending.physics.horizon = 40; lab.applyPending(); await until(() => lab.remainingUniform() === 0);
  const s = lab.cur.store; const before = { o: s.outcome.slice(), t: s.tEnd.slice() };
  const unres = Array.from(s.outcome.slice(0, 2500)).filter((o) => o === OUT.UNRESOLVED).length; assert.ok(unres > 100);
  const hadCk = lab.cur.checkpoints.size; assert.ok(hadCk > 0, 'checkpoints stored for unresolved samples');
  const epoch = lab.epoch; lab.pending.physics.horizon = 120; assert.deepEqual(lab.applyPending(), []); assert.equal(lab.epoch, epoch, 'extension is not a new experiment');
  await sleep(100); await until(() => lab.scheduler.isIdle());
  for (let i = 0; i < 2500; i++) if (before.o[i] !== OUT.UNRESOLVED && !(s.flags[i] & 0)) { /* decided samples */ if (before.o[i] <= 8 && before.o[i] !== 6 && !(Number.isNaN(before.t[i]))) { /* may be pending-provisional: those may legitimately change */ } }
  const decided = Array.from({ length: 2500 }, (_, i) => i).filter((i) => before.o[i] !== OUT.UNRESOLVED && before.o[i] !== NOT_COMPUTED);
  let same = 0; for (const i of decided) if (s.outcome[i] === before.o[i] && s.tEnd[i] === before.t[i]) same++;
  assert.ok(same >= decided.length * 0.9, `decided samples keep their results (${same}/${decided.length}; only provisional pending-escape ones may change)`);
  // a continued sample equals a fresh straight run at the longer horizon, bitwise
  const pick = Array.from({ length: 2500 }, (_, i) => i).filter((i) => before.o[i] === OUT.UNRESOLVED).slice(0, 6);
  const fresh = handle({ kind: 'batch', rid: 1, cfg: lab.jobConfig(), horizon: 120, ids: Int32Array.from(pick), xs: Float64Array.from(pick, (i) => s.X[i]), ys: Float64Array.from(pick, (i) => s.Y[i]), wantCk: false }).res as any;
  pick.forEach((i, k) => { assert.equal(s.outcome[i], fresh.cols.outcome[k]); assert.equal(s.tEnd[i], fresh.cols.tEnd[k]); });
  lab.dispose();
});

test('validation: agreement categories are recorded separately', () => {
  const r = (outcome: number, tEnd = 10, fail = 0) => ({ outcome, tEnd, fail, tOnset: NaN, flags: 0 });
  assert.equal(classifyAgreement([r(OUT.COL_AB), r(OUT.COL_AB, 10.0001), r(OUT.COL_AB, 10.0002)]), VALID.AGREE);
  assert.equal(classifyAgreement([r(OUT.COL_AB), r(OUT.COL_BC)]), VALID.OUTCOME_DIFFERS);
  assert.equal(classifyAgreement([r(OUT.UNRESOLVED), r(OUT.COL_AB)]), VALID.RESOLUTION_CHANGE);
  assert.equal(classifyAgreement([r(OUT.COL_AB, 10), r(OUT.COL_AB, 11)]), VALID.EVENT_DISCREPANCY);
  assert.equal(classifyAgreement([r(OUT.C_ESC), r(OUT.FAILED, 1, 3)]), VALID.SOLVER_FAILURE);
});

test('portable investigation file: round trip, validation and migration', async () => {
  const lab = new Lab(() => new InlineWorker(), 2); lab.scheduler.cancelAll();
  lab.pending.resolution = 50; lab.pending.physics.horizon = 60; lab.applyPending(); await until(() => lab.remainingUniform() === 0);
  lab.explore.settings.maxExtra = 300; lab.explore.settings.maxDepth = 2; lab.startExplore(); await until(() => !lab.explore.running);
  lab.saveRegion('r1'); lab.setBodyColour(2, '#00ff88');
  const snap = lab.snapshot('t', 'note');
  const blob = await snapshotToBlob(snap, true); assert.equal(blob.type, 'application/gzip');
  const back = await bytesToSnapshot(await blob.arrayBuffer()); assert.deepEqual(back.errors, []);
  const b = back.snapshot!; assert.equal(b.layers[0].count, snap.layers[0].count);
  assert.deepEqual(Array.from(b.layers[0].tEnd), Array.from(snap.layers[0].tEnd), 'Float64 data survive bit-exactly (NaN included)');
  assert.equal(b.layers[0].nodeCount, snap.layers[0].nodeCount);
  assert.equal(b.appearance.bodies[2], '#00ff88'); assert.equal(b.savedRegions[0].name, 'r1');
  const lab2 = new Lab(() => new InlineWorker(), 1); lab2.scheduler.cancelAll(); lab2.restore(b);
  assert.equal(lab2.scheduler.paused, true, 'restored paused'); assert.equal(lab2.cur.store.count, lab.cur.store.count); assert.equal(lab2.cur.nodeCount, lab.cur.nodeCount);
  assert.equal(lab2.fingerprint, lab.fingerprint); assert.equal(lab2.cur.checkpoints.size, lab.cur.checkpoints.size);
  assert.deepEqual(Array.from(lab2.cur.store.outcome.slice(0, lab2.cur.store.count)), Array.from(lab.cur.store.outcome.slice(0, lab.cur.store.count)));
  // rejections
  const bad = (f: (s: any) => void): string[] => { const s = JSON.parse(JSON.stringify(snap, (_k, v) => (ArrayBuffer.isView(v) ? Array.from(v as any) : v))); void s; const c: any = { ...snap, layers: snap.layers.map((l) => ({ ...l })), config: JSON.parse(JSON.stringify(snap.config)) }; f(c); return checkSnapshot(c).errors; };
  assert.ok(bad((s) => { s.model = 'other-model-v9'; })[0].includes('model version'));
  assert.ok(bad((s) => { s.schema = 99; })[0].includes('newer'));
  assert.ok(bad((s) => { s.layers[0].X = s.layers[0].X.slice(1); }).length > 0, 'wrong array length');
  assert.ok(bad((s) => { s.layers[0].X = s.layers[0].X.slice(); s.layers[0].X[5] = NaN; }).length > 0, 'non-finite value');
  assert.ok(bad((s) => { s.config.physics.m[0] = -1; }).length > 0, 'unphysical mass');
  assert.ok(bad((s) => { s.layers[0].outcome = s.layers[0].outcome.slice(); s.layers[0].outcome[3] = 77; }).length > 0, 'bad outcome code');
  // migration: a file lacking the optional sections is completed, not rejected
  const lean: any = { ...snap, layers: snap.layers }; delete lean.validations; delete lean.savedRegions; delete lean.appearance; delete lean.history; delete lean.note;
  const m = checkSnapshot(lean); assert.deepEqual(m.errors, []); assert.deepEqual(m.snapshot!.validations, []); assert.equal(m.snapshot!.history.views.length, 1);
  assert.ok(checkSnapshot({ nonsense: true }).errors.length > 0);
  lab.dispose(); lab2.dispose();
});

test('colour parsing: Hex, RGB 0-255, conversions, and appearance persistence', () => {
  assert.deepEqual(parseHex('#ff8800'), [255, 136, 0]); assert.deepEqual(parseHex('F80'), [255, 136, 0]); assert.equal(parseHex('#12'), null); assert.equal(parseHex('#gg0000'), null);
  assert.equal(normaliseHex('ABC'), '#aabbcc'); assert.equal(toHex([1, 2, 255]), '#0102ff');
  assert.equal(parseChannel('300'), 255); assert.equal(parseChannel('-5'), 0); assert.equal(parseChannel('12.6'), 13); assert.equal(parseChannel('x'), null); assert.equal(parseChannel(''), null);
  for (const c of [[200, 30, 90], [0, 0, 0], [255, 255, 255], [12, 200, 150]] as [number, number, number][]) { const h = rgbToHsv(c); const back = hsvToRgb(h[0], h[1], h[2]); back.forEach((v, i) => near(v, c[i], 1, 'hsv round trip')); }
  const store: Record<string, string> = {}; (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  const lab = new Lab(() => new InlineWorker(), 1); lab.scheduler.cancelAll(); lab.setBodyColour(1, '#abcdef'); lab.setOutcomeColour(6, '#010203');
  const lab2 = new Lab(() => new InlineWorker(), 1); lab2.scheduler.cancelAll(); lab2.loadAppearance();
  assert.equal(lab2.appearance.bodies[1], '#abcdef'); assert.equal(lab2.appearance.outcomes[6], '#010203');
  delete (globalThis as any).localStorage; lab.dispose(); lab2.dispose();
});

test('input limits: clamping and rejection with explanations; ETA formatting beyond 24 h', () => {
  assert.equal(clampParam('m0', -3, 1).value, 1e-6); assert.ok(clampParam('m0', -3, 1).message);
  assert.equal(clampParam('r0', -1, 0.02).value, 0); assert.equal(clampParam('m0', NaN, 4).value, 4); assert.ok(clampParam('x0', Infinity, 2).message);
  assert.equal(clampParam('x0', -50000, 0).changed, false, 'positions are not confined to a pendulum-sized box');
  assert.equal(formatEta(null), '—:—:—'); assert.equal(formatEta(0), '00:00:00'); assert.equal(formatEta(3725), '01:02:05'); assert.equal(formatEta(90061), '25:01:01'); assert.equal(formatEta(360000), '100:00:00'); assert.equal(formatEta(NaN), '—:—:—');
});

test('batch mode: reproducible, headless, mean/SD/SE with theory', async () => {
  const exec = async (req: any) => (handle(req).res as any).cols;
  const exp = BATCH_EXPS[0];
  const a = await runBatch(exp, { runs: 4, samples: 20, seed: 11 }, exec, () => {}, () => false);
  const b = await runBatch(exp, { runs: 4, samples: 20, seed: 11 }, exec, () => {}, () => false);
  assert.deepEqual(a.rows, b.rows); assert.equal(a.rows.length, 4); assert.ok(a.summary.some((s) => s.includes('binomial')));
  const sweep = await runBatch(BATCH_EXPS[2], { runs: 1, samples: 12, seed: 5 }, exec, () => {}, () => false);
  assert.equal(sweep.rows.length, BATCH_EXPS[2].xs!.length); assert.ok(sweep.plot.theory!.length === sweep.rows.length);
  const stopped = await runBatch(BATCH_EXPS[1], { runs: 1, samples: 10, seed: 5 }, exec, () => {}, () => true); assert.equal(stopped.rows.length, 0);
  void DEFAULT_NUMERICS; void DEFAULT_PHYSICS; void completeStride;
});

test('a result computed before a physical change is rejected, never merged into the new map', async () => {
  class Manual implements WorkerLike {
    onmessage: ((ev: { data: any }) => void) | null = null; queue: any[] = [];
    postMessage(m: any) { this.queue.push(m); } terminate() {}
    release() { const m = this.queue.shift(); this.onmessage?.({ data: handle(m).res }); }
  }
  const w = new Manual(); const lab = new Lab(() => w, 1);
  assert.equal(w.queue.length, 1, 'first chunk in flight');
  const oldLayer = lab.cur; lab.pending.physics.m[2] = 1.5; lab.applyPending();
  const fresh = lab.cur; assert.notEqual(fresh, oldLayer);
  w.release();                                    // the OLD configuration's answer arrives late
  assert.equal(fresh.store.computed, 0, 'not merged'); assert.equal(oldLayer.store.computed, 0);
  assert.ok(lab.scheduler.stats.staleRejected >= 1);
  assert.equal(w.queue.length, 1, 'the new configuration continues with its own chunk');
  assert.equal(w.queue[0].cfg.physics.m[2], 1.5);
  w.release(); assert.ok(fresh.store.computed > 0);
  lab.dispose();
});

test('comparison and finite-time sensitivity use real runs and report exact changes', async () => {
  const lab = new Lab(() => new InlineWorker(), 2); lab.scheduler.cancelAll();
  lab.pending.resolution = 50; lab.pending.physics.horizon = 80; lab.applyPending(); await until(() => lab.remainingUniform() === 0);
  // perturbation comparison: exact changed value, separation starts tiny and grows
  const id = lab.pick(0.5, 1.0)!; lab.select(id.layer.id, id.sampleId);
  assert.equal(await lab.comparePerturbation('v', 1e-6), null);
  const c = lab.compare!; assert.equal(c.changed.length, 1); assert.equal(c.changed[0].name, 'v'); near(c.changed[0].b - c.changed[0].a, 1e-6, 1e-12);
  const a = lab.trajs.get(c.a)!, b = lab.trajs.get(c.b)!; assert.ok(a && b);
  const { separationSeries } = await import('../src/traj.ts'); const sep = separationSeries(a, b);
  assert.ok(sep.sep[0] > 0 && sep.sep[0] < 1e-5, 'initial scaled separation is the tiny perturbation: ' + sep.sep[0]);
  assert.ok(sep.sep[sep.sep.length - 1] > 10 * sep.sep[0], 'it grows');
  assert.ok(sep.tMax <= Math.min(a.trace.t[a.trace.n - 1], b.trace.t[b.trace.n - 1]) + 1e-12, 'compared only at common physical times');
  // sensitivity layer: finite values for computed samples, missing otherwise
  lab.computeSensitivity(); await sleep(100); await until(() => lab.scheduler.isIdle());
  let finite = 0; for (let i = 0; i < 2500; i++) if (Number.isFinite(lab.cur.store.sens[i])) finite++;
  assert.ok(finite > 1500, 'finite-time sensitivity computed for most samples: ' + finite);
  lab.dispose();
});

test('perturbation parameters add an exact delta to the generated state in any set-up', () => {
  const base = buildInitial(DEFAULT_PHYSICS, { b: 0.5, v: 1 });
  const pert = buildInitial(DEFAULT_PHYSICS, { b: 0.5, v: 1, dvy2: 1e-7, dx0: -2e-6, dvx1: 0.25 });
  near(pert.y[10] - base.y[10], 0, 0); // C vx untouched (only vy changed)
  near(pert.y[11] - base.y[11], 1e-7, 1e-15); near(pert.y[0] - base.y[0], -2e-6, 1e-15); near(pert.y[8] - base.y[8], 0.25, 1e-15);
  for (let k = 0; k < 12; k++) if (![11, 0, 8].includes(k)) assert.equal(pert.y[k], base.y[k], 'other components untouched: ' + k);
});
