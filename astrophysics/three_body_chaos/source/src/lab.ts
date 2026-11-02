// The Lab: all non-visual application state and behaviour.  React components only read from it and
// call its methods.  Keeping it free of React lets the whole engine be tested in Node.
import {
  APP_VERSION, DEFAULT_AXES, DEFAULT_NUMERICS, DEFAULT_PHYSICS, MODEL_VERSION, PARAM_DEFS, buildInitial, clonePhysics, getParam, hashString, physicsFingerprint, setParam,
  stableStringify, validateNumerics, validatePhysics, type AxisSpec, type Numerics, type Physics,
} from './initial.ts';
import { Layer, NOT_COMPUTED, SUPPLEMENTARY, VALID, type Rect } from './store.ts';
import { InlineWorker, Scheduler, type Chunk, type Job, type WorkerLike } from './scheduler.ts';
import type { JobConfig, Request, Response, RunSummary } from './messages.ts';
import { EDGE, DEFAULT_BOUNDARY, DEFAULT_WEIGHTS, boundarySamplesToValidate, detectEdges, rankRegions, type BoundaryParams, type Edges, type RankWeights, type Region } from './boundaries.ts';
import { refineCandidates, findIslands, supplementaryPoint, type ExploreSettings } from './sampling.ts';
import { DEFAULT_TOL_SCALES, classifyAgreement, type ValidationRecord } from './validation.ts';
import { FLAG, OUT, CK_LEN } from './simulate.ts';
import { DEFAULT_APPEARANCE, type Appearance } from './outcomes.ts';
import { normaliseHex } from './colours.ts';
import { PRESETS, getPreset, presetNumerics, type Preset } from './presets.ts';
import { AUTOSAVE_NAME, SCHEMA_VERSION, idbSave, type SavedRegion, type SaveReport, type Snapshot } from './persist.ts';

export type MapMode = 'outcome' | 'tEscape' | 'tCollision' | 'minDist' | 'nClose' | 'survival' | 'sens' | 'exchange' | 'complexity' | 'reliability' | 'density';
export interface LabConfig { physics: Physics; numerics: Numerics; axes: AxisSpec; resolution: number; presetId: string }
export const RESOLUTIONS = [50, 100, 250, 500, 1000];
export const P_MANUAL = 0, P_VIEW = 1, P_VALIDATE = 2, P_EXPLORE = 3, P_BACKGROUND = 4;
export const MAX_TOTAL_BYTES = 900 * 1024 * 1024;

export interface TrajData {
  key: string; overrides: Record<string, number>; y0: Float64Array; m: Float64Array; r: Float64Array; G: number;
  trace: { t: Float64Array; y: Float64Array; n: number }; summary: RunSummary; horizon: number; label: string;
}
export interface RefData {
  key: string; times: Float64Array; main: Float64Array; ref: Float64Array; mainSummary: RunSummary; refTEnd: number; refContactPair: number; refTContact: number;
  refOk: boolean; refMessage: string; refSteps: number; rtol: number; atol: number; m: Float64Array; G: number;
}
export interface CompareState { kind: 'sides' | 'perturb'; a: string; b: string; description: string; changed: { name: string; a: number; b: number }[] }

export function defaultConfig(): LabConfig {
  const p = getPreset('scattering');
  return { physics: clonePhysics(p.physics), numerics: { ...DEFAULT_NUMERICS }, axes: { ...DEFAULT_AXES }, resolution: 100, presetId: 'scattering' };
}
const cloneCfg = (c: LabConfig): LabConfig => JSON.parse(JSON.stringify(c));

export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—:—:—';
  const s = Math.round(seconds), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return [h, m, r].map((v) => String(v).padStart(2, '0')).join(':');
}

type Topic = 'config' | 'layers' | 'progress' | 'selection' | 'appearance' | 'traj' | 'explore' | 'validation' | 'status' | 'view' | 'compare';

export class Lab {
  applied: LabConfig = defaultConfig();
  pending: LabConfig = defaultConfig();
  epoch = 1;
  fingerprint = '';
  layers: Layer[] = [];
  cur!: Layer;
  nextLayerId = 1;
  view!: Rect;
  history: Rect[] = []; histIndex = 0;
  savedRegions: SavedRegion[] = [];
  sel: { layerId: number; sampleId: number } | null = null;
  appearance: Appearance = JSON.parse(JSON.stringify(DEFAULT_APPEARANCE));
  mapMode: MapMode = 'outcome';
  showBoundaries = true;
  showSamples = false;
  frame: 'com' | 'integration' = 'com';
  validations: ValidationRecord[] = [];
  weights: RankWeights = { ...DEFAULT_WEIGHTS };
  boundary: BoundaryParams = { ...DEFAULT_BOUNDARY };
  explore = { running: false, paused: false, rounds: 0, extraUsed: 0, supCounter: 0, status: 'idle', settings: { maxDepth: 4, maxExtra: 20000, minDx: 0, minDy: 0, criteria: EDGE.OUTCOME | EDGE.COLEJ | EDGE.TIME | EDGE.CLOSE, seed: 12345, supFraction: 0.1 } as ExploreSettings, minDxAuto: true };
  islands = new Set<number>();
  trajs = new Map<string, TrajData>();
  refs = new Map<string, RefData>();
  compare: CompareState | null = null;
  status = ''; saveStatus = ''; lastSave: SaveReport | null = null;
  warnings: string[] = [];
  autoZoom = true;
  highlight: Rect | null = null;
  /** set by the app shell so panels can switch tabs */ navigate?: (tab: string) => void;
  setHighlight(r: Rect | null): void { this.highlight = r; this.emit('view'); }
  dirty = false;
  restoredPaused = false;

  scheduler: Scheduler;
  private listeners = new Set<(t: Set<string>) => void>();
  private pendingTopics = new Set<string>();
  private emitTimer: any = null;
  private stash = new Map<string, { layers: Layer[]; cur: number; view: Rect; hist: Rect[]; idx: number; validations: ValidationRecord[] }>();
  fillJobs = new Map<number, FillJob>();
  private extraJob: ExtraJob | null = null;
  private rate: { t: number; n: number }[] = [];
  msPerSample = 8;
  private progCache = new Map<number, { v: number; count: number; unresolved: number; failed: number; prov: number; done: number }>();
  private edgeCache = new Map<number, { v: number; key: string; edges: Edges }>();
  private regionCache: { key: string; r: { interest: Region[]; validation: Region[] } } | null = null;
  private zoomTimer: any = null;
  private autosaveTimer: any = null;
  workerFactory: () => WorkerLike;

  constructor(workerFactory?: () => WorkerLike, workers = 2) {
    this.workerFactory = workerFactory ?? (() => new InlineWorker());
    this.scheduler = new Scheduler(this.workerFactory, workers);
    this.scheduler.onChange = () => this.emit('progress');
    this.resetToConfig(this.applied, false);
  }

  // ---- events ----------------------------------------------------------------------------------
  subscribe(fn: (t: Set<string>) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(...topics: Topic[]): void {
    for (const t of topics) this.pendingTopics.add(t);
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => { this.emitTimer = null; const t = this.pendingTopics; this.pendingTopics = new Set(); for (const l of this.listeners) l(t); }, 40);
  }
  flush(): void { if (this.emitTimer) { clearTimeout(this.emitTimer); this.emitTimer = null; } const t = this.pendingTopics; this.pendingTopics = new Set(); for (const l of this.listeners) l(t); }

  // ---- configuration ---------------------------------------------------------------------------
  jobConfig(): JobConfig { return { physics: this.applied.physics, numerics: this.applied.numerics, varX: this.applied.axes.varX, varY: this.applied.axes.varY }; }
  pendingDirty(): boolean { return stableStringify(this.pending) !== stableStringify(this.applied); }
  discardPending(): void { this.pending = cloneCfg(this.applied); this.emit('config'); }

  problemsWith(cfg: LabConfig): string[] {
    const e: string[] = [];
    const ax = cfg.axes;
    for (const v of [ax.varX, ax.varY]) if (!PARAM_DEFS[v] || !PARAM_DEFS[v].modes.includes(cfg.physics.mode)) e.push(`Axis variable “${v}” does not exist in the ${cfg.physics.mode} set-up.`);
    if (ax.varX === ax.varY) e.push('The two axes must use different variables.');
    if (!(ax.maxX > ax.minX && ax.maxY > ax.minY)) e.push('Each axis maximum must exceed its minimum.');
    if (![ax.minX, ax.maxX, ax.minY, ax.maxY].every(Number.isFinite)) e.push('Axis ranges must be finite.');
    e.push(...validateNumerics(cfg.numerics));
    if (!e.length) {
      // check physical validity at the centre and the four corners of the map
      const pts = [[0.5, 0.5], [0, 0], [1, 0], [0, 1], [1, 1]];
      const msgs = new Set<string>();
      for (const [fx, fy] of pts) for (const m of validatePhysics(cfg.physics, { [ax.varX]: ax.minX + fx * (ax.maxX - ax.minX), [ax.varY]: ax.minY + fy * (ax.maxY - ax.minY) })) msgs.add(m);
      e.push(...msgs);
    }
    return e;
  }

  /** Apply the pending configuration.  Returns problems (nothing is applied if any). */
  applyPending(): string[] {
    const cfg = cloneCfg(this.pending);
    const probs = this.problemsWith(cfg);
    if (probs.length) return probs;
    const oldH = this.applied.physics.horizon, newH = cfg.physics.horizon;
    const sameExceptHorizon = stableStringify({ ...cfg, physics: { ...cfg.physics, horizon: 0 } }) === stableStringify({ ...this.applied, physics: { ...this.applied.physics, horizon: 0 } });
    if (sameExceptHorizon && newH > oldH) { this.extendHorizon(newH); return []; }
    if (sameExceptHorizon && newH === oldH) return [];
    this.resetToConfig(cfg, true);
    return [];
  }

  /** Start a new experiment with config `cfg` (stale results are discarded; compatible stashed work is restored). */
  resetToConfig(cfg: LabConfig, stashOld: boolean): void {
    this.scheduler.cancelAll(); this.fillJobs.clear(); this.extraJob = null;
    this.epoch++;
    if (stashOld && this.layers.length) this.stash.set(this.stashKey(this.applied), { layers: this.layers, cur: this.cur.id, view: this.view, hist: this.history, idx: this.histIndex, validations: this.validations });
    while (this.stash.size > 3) this.stash.delete(this.stash.keys().next().value as string);
    this.applied = cloneCfg(cfg); this.pending = cloneCfg(cfg);
    this.fingerprint = physicsFingerprint(this.applied.physics, this.applied.numerics, this.applied.axes);
    this.explore.running = false; this.explore.status = 'idle'; this.explore.extraUsed = 0; this.explore.rounds = 0; this.explore.supCounter = 0; this.islands.clear();
    this.edgeCache.clear(); this.regionCache = null; this.compare = null; this.sel = null; this.rate = [];
    const key = this.stashKey(this.applied);
    const hit = this.stash.get(key);
    const rect = this.rootRect();
    if (hit) {
      this.layers = hit.layers; this.cur = hit.layers.find((l) => l.id === hit.cur) ?? hit.layers[0]; this.view = hit.view; this.history = hit.hist; this.histIndex = hit.idx; this.validations = hit.validations;
      this.stash.delete(key); this.status = 'Restored previously computed results for this exact configuration from the in-memory cache.';
    } else {
      this.layers = []; this.validations = [];
      const L = this.newLayer(rect, this.applied.resolution, 'full map');
      this.cur = L; this.view = { ...rect }; this.history = [{ ...rect }]; this.histIndex = 0;
      this.status = 'New configuration: map recalculated from scratch (earlier results were not reused).';
    }
    for (const L of this.layers) this.ensureFill(L, L === this.cur ? P_VIEW : P_BACKGROUND);
    this.emit('config', 'layers', 'progress', 'selection', 'view', 'explore', 'validation', 'compare', 'status');
  }

  private stashKey(c: LabConfig): string { return physicsFingerprint(c.physics, c.numerics, c.axes) + '|' + c.physics.horizon + '|' + c.resolution + '|' + c.axes.minX + ',' + c.axes.maxX + ',' + c.axes.minY + ',' + c.axes.maxY; }
  rootRect(): Rect { const a = this.applied.axes; return { x0: a.minX, x1: a.maxX, y0: a.minY, y1: a.maxY }; }

  loadPreset(id: string): string[] {
    const p: Preset = getPreset(id);
    const cfg: LabConfig = { physics: clonePhysics(p.physics), numerics: presetNumerics(p), axes: { ...p.axes }, resolution: p.resolution, presetId: p.id };
    const probs = this.problemsWith(cfg);
    if (probs.length) return probs;
    this.resetToConfig(cfg, true);
    return [];
  }
  get presets(): Preset[] { return PRESETS; }

  // ---- layers, fill jobs -----------------------------------------------------------------------
  private newLayer(rect: Rect, n: number, label: string): Layer {
    const L = new Layer(this.nextLayerId++, rect, n);
    L.label = label; L.horizon = this.applied.physics.horizon;
    this.layers.push(L);
    this.evictIfNeeded();
    return L;
  }
  memoryBytes(): number { return this.layers.reduce((s, l) => s + l.bytes(), 0); }
  private evictIfNeeded(): void {
    while (this.memoryBytes() > MAX_TOTAL_BYTES && this.layers.length > 1) {
      const victim = this.layers.find((l) => l !== this.cur && l.id !== this.sel?.layerId && l !== this.layers[0]) ?? null;
      if (!victim) break;
      this.layers = this.layers.filter((l) => l !== victim); this.fillJobs.delete(victim.id);
      this.warnings.push(`Memory limit reached: dropped the oldest zoom layer “${victim.label}”.`);
    }
  }

  ensureFill(layer: Layer, priority: number): void {
    const existing = this.fillJobs.get(layer.id);
    if (existing && !existing.exhausted()) { existing.priority = priority; return; }
    // restart scan from the first uncomputed uniform sample
    let k = 0; const n2 = layer.n * layer.n;
    while (k < n2 && layer.store.outcome[layer.order[k]] !== NOT_COMPUTED) k++;
    layer.nextOrder = k;
    if (k >= n2) return;
    const job = new FillJob(this, layer, priority); this.fillJobs.set(layer.id, job); this.scheduler.add(job);
  }

  /** the workers' view of the current configuration */
  makeRequest(layer: Layer, ids: number[], opts: { ck?: boolean; wantCk?: boolean } = {}): Request {
    const n = ids.length, s = layer.store;
    const xs = new Float64Array(n), ys = new Float64Array(n), idv = Int32Array.from(ids);
    for (let k = 0; k < n; k++) { xs[k] = s.X[ids[k]]; ys[k] = s.Y[ids[k]]; }
    const req: Request = { kind: 'batch', rid: 0, cfg: this.jobConfig(), horizon: this.applied.physics.horizon, ids: idv, xs, ys, wantCk: opts.wantCk ?? (layer.checkpoints.size < 150000) };
    if (opts.ck) {
      const ck = new Float64Array(n * CK_LEN), has = new Uint8Array(n);
      for (let k = 0; k < n; k++) { const c = layer.checkpoints.get(ids[k]); if (c) { ck.set(c, k * CK_LEN); has[k] = 1; } }
      req.ck = ck; req.hasCk = has;
    }
    return req;
  }
  chunkSize(): number { return Math.max(1, Math.min(256, Math.round(120 / Math.max(0.05, this.msPerSample)))); }
  noteBatch(n: number, ms: number): void {
    const now = performance.now(); this.rate.push({ t: now, n }); while (this.rate.length && now - this.rate[0].t > 12000) this.rate.shift();
    if (n > 0 && ms > 0) this.msPerSample = 0.7 * this.msPerSample + 0.3 * (ms / n);
    this.dirty = true;
  }
  /** samples per second (all workers) over the recent window, or null if unknown */
  samplesPerSecond(): number | null {
    if (this.rate.length < 2) return null;
    const span = (this.rate[this.rate.length - 1].t - this.rate[0].t) / 1000;
    if (span < 1.2) return null;
    return this.rate.slice(1).reduce((s, r) => s + r.n, 0) / span;
  }
  remainingUniform(layer = this.cur): number { return layer.n * layer.n - layer.uniformDone; }
  uniformComputed(layer: Layer): number { return layer.uniformDone; }

  progress(layer = this.cur): { total: number; done: number; remaining: number; unresolved: number; failed: number; provisional: number; queued: number; etaSeconds: number | null; rate: number | null; workersBusy: number; workers: number; paused: boolean } {
    const s = layer.store; let unresolved = 0, failed = 0, prov = 0, done = 0;
    const hit = this.progCache.get(layer.id);
    if (hit && hit.v === layer.version && hit.count === s.count) ({ unresolved, failed, prov, done } = hit);
    else {
      for (let i = 0; i < s.count; i++) {
        const o = s.outcome[i]; if (o === NOT_COMPUTED) continue; done++;
        if (o === OUT.UNRESOLVED) unresolved++; else if (o === OUT.FAILED) failed++;
        if (s.flags[i] & FLAG.PROVISIONAL) prov++;
      }
      this.progCache.set(layer.id, { v: layer.version, count: s.count, unresolved, failed, prov, done });
    }
    const queued = this.extraJob ? this.extraJob.queue.length + this.extraJob.inflight : 0;
    const remaining = s.count - done;
    const rate = this.samplesPerSecond();
    const busy = this.scheduler.activeCount;
    const eta = busy === 0 || rate === null || rate <= 0 || remaining === 0 ? null : remaining / rate;
    return { total: s.count, done, remaining, unresolved, failed, provisional: prov, queued, etaSeconds: eta, rate, workersBusy: busy, workers: this.scheduler.budget, paused: this.scheduler.paused };
  }

  setWorkers(k: number): void { this.scheduler.setBudget(k); this.emit('progress'); }
  pause(): void { this.scheduler.pause(); this.emit('progress'); }
  resume(): void { this.restoredPaused = false; this.scheduler.resume(); this.emit('progress'); }
  cancelAll(): void { this.scheduler.cancelAll(); this.fillJobs.clear(); this.extraJob = null; this.explore.running = false; this.explore.status = 'cancelled'; this.status = 'All queued calculations cancelled. Completed samples are kept; calculate again to continue.'; this.emit('progress', 'explore', 'status'); }
  /** continue a cancelled / restored calculation */
  continueCalc(): void { for (const L of this.layers) this.ensureFill(L, L === this.cur ? P_VIEW : P_BACKGROUND); this.scheduler.resume(); this.emit('progress'); }

  onLayerResults(layer: Layer): void {
    this.edgeCache.delete(layer.id); this.regionCache = null;
    this.emit('layers', 'progress');
  }

  // ---- view, zoom, history ---------------------------------------------------------------------
  setView(r: Rect, commit: 'now' | 'later' | 'none' = 'later'): void {
    const root = this.rootRect(), w = root.x1 - root.x0, h = root.y1 - root.y0;
    const nr: Rect = { ...r };
    // keep the window within a generous margin around the original map, and non-degenerate
    const minW = Math.max(Math.abs(nr.x0), Math.abs(nr.x1), 1) * 4e-15, minH = Math.max(Math.abs(nr.y0), Math.abs(nr.y1), 1) * 4e-15;
    if (nr.x1 - nr.x0 < minW) { const c = (nr.x0 + nr.x1) / 2; nr.x0 = c - minW / 2; nr.x1 = c + minW / 2; }
    if (nr.y1 - nr.y0 < minH) { const c = (nr.y0 + nr.y1) / 2; nr.y0 = c - minH / 2; nr.y1 = c + minH / 2; }
    if (nr.x1 - nr.x0 > 2 * w) { const c = (nr.x0 + nr.x1) / 2; nr.x0 = c - w; nr.x1 = c + w; }
    if (nr.y1 - nr.y0 > 2 * h) { const c = (nr.y0 + nr.y1) / 2; nr.y0 = c - h; nr.y1 = c + h; }
    this.view = nr;
    if (commit === 'now') this.commitView(); else if (commit === 'later') { clearTimeout(this.zoomTimer); this.zoomTimer = setTimeout(() => this.commitView(), 450); }
    this.emit('view', 'progress', 'layers');
  }

  /** push the current view to history and make sure a layer computed at this scale exists */
  commitView(): void {
    clearTimeout(this.zoomTimer);
    const last = this.history[this.histIndex];
    const same = last && ['x0', 'x1', 'y0', 'y1'].every((k) => Math.abs((last as any)[k] - (this.view as any)[k]) <= 1e-12 * Math.max(1, Math.abs((last as any)[k])));
    if (!same) { this.history = this.history.slice(0, this.histIndex + 1); this.history.push({ ...this.view }); this.histIndex = this.history.length - 1; if (this.history.length > 200) { this.history.shift(); this.histIndex--; } }
    if (this.autoZoom) this.ensureLayerForView();
    this.emit('view', 'layers', 'progress');
  }

  /** Which existing layer covers the view at adequate sample spacing? */
  coveringLayer(v: Rect = this.view): Layer | null {
    const N = this.applied.resolution; let best: Layer | null = null;
    const eps = 1e-12 * Math.max(1, Math.abs(v.x1 - v.x0));
    for (const L of this.layers) {
      if (L.rect.x0 > v.x0 + eps || L.rect.x1 < v.x1 - eps || L.rect.y0 > v.y0 + eps || L.rect.y1 < v.y1 - eps) continue;
      if (L.dx > 1.5 * (v.x1 - v.x0) / N || L.dy > 1.5 * (v.y1 - v.y0) / N) continue;
      if (!best || L.dx * L.dy < best.dx * best.dy) best = L;
    }
    return best;
  }

  ensureLayerForView(): Layer {
    let L = this.coveringLayer();
    if (!L) {
      const rect = { ...this.view };
      L = this.newLayer(rect, this.applied.resolution, `zoom ${this.layers.length}`);
      this.status = `New layer calculated at the zoomed scale: spacing Δ${this.applied.axes.varX} = ${L.dx.toPrecision(3)}, Δ${this.applied.axes.varY} = ${L.dy.toPrecision(3)}.`;
    }
    if (this.cur !== L) { this.cur = L; this.edgeCache.delete(L.id); this.regionCache = null; this.explore.running = false; this.explore.status = 'idle'; this.extraJob = null; this.explore.extraUsed = 0; this.islands.clear(); }
    this.ensureFill(L, P_VIEW);
    return L;
  }

  zoomToRect(r: Rect): void { this.setView(r, 'now'); }
  zoomBy(factor: number, cx: number, cy: number): void {
    const v = this.view; this.setView({ x0: cx - (cx - v.x0) * factor, x1: cx + (v.x1 - cx) * factor, y0: cy - (cy - v.y0) * factor, y1: cy + (v.y1 - cy) * factor }, 'later');
  }
  pan(dx: number, dy: number): void { const v = this.view; this.setView({ x0: v.x0 + dx, x1: v.x1 + dx, y0: v.y0 + dy, y1: v.y1 + dy }, 'later'); }
  back(): void { if (this.histIndex > 0) { this.histIndex--; this.view = { ...this.history[this.histIndex] }; if (this.autoZoom) this.ensureLayerForView(); this.emit('view', 'layers', 'progress'); } }
  forward(): void { if (this.histIndex < this.history.length - 1) { this.histIndex++; this.view = { ...this.history[this.histIndex] }; if (this.autoZoom) this.ensureLayerForView(); this.emit('view', 'layers', 'progress'); } }
  resetView(): void { this.setView(this.rootRect(), 'now'); }
  saveRegion(name: string): void { const nm = name.trim() || `region ${this.savedRegions.length + 1}`; this.savedRegions = this.savedRegions.filter((r) => r.name !== nm).concat([{ name: nm, rect: { ...this.view } }]); this.dirty = true; this.emit('view'); }
  gotoRegion(name: string): void { const r = this.savedRegions.find((x) => x.name === name); if (r) this.setView(r.rect, 'now'); }
  deleteRegion(name: string): void { this.savedRegions = this.savedRegions.filter((r) => r.name !== name); this.emit('view'); }

  /** Float64 and error-floor warnings for the current view. */
  viewWarnings(): string[] {
    const w: string[] = [], v = this.view, N = this.applied.resolution, a = this.applied.axes;
    const dx = (v.x1 - v.x0) / N, dy = (v.y1 - v.y0) / N;
    const ulp = (x: number): number => Math.max(Math.abs(x), 1e-300) * 2.220446049250313e-16;
    if (dx < 8 * ulp(Math.max(Math.abs(v.x0), Math.abs(v.x1))) || dy < 8 * ulp(Math.max(Math.abs(v.y0), Math.abs(v.y1)))) w.push('Adjacent sample coordinates are nearly indistinguishable in Float64 (spacing within a few ulps): neighbouring cells may represent the same initial condition.');
    const floor = 1e4 * this.applied.numerics.rtol;
    const sx = Math.max(1, Math.abs(v.x0), Math.abs(v.x1)), sy = Math.max(1, Math.abs(v.y0), Math.abs(v.y1));
    if (dx < floor * sx || dy < floor * sy) w.push(`Sample spacing is below ~10⁴ × the relative tolerance (${floor.toExponential(0)}) of the coordinates: differences between neighbouring cells may be smaller than numerical error can resolve. Validate before trusting fine structure.`);
    const bad = this.validations.filter((r) => r.status >= VALID.OUTCOME_DIFFERS);
    if (bad.length) {
      const minBad = Math.min(...bad.map((r) => Math.min(this.layers.find((l) => l.id === r.layerId)?.dx ?? Infinity, this.layers.find((l) => l.id === r.layerId)?.dy ?? Infinity)));
      if (Math.min(dx, dy) < minBad) w.push(`The requested detail (${Math.min(dx, dy).toExponential(1)}) is finer than the spacing (${minBad.toExponential(1)}) at which validation already showed disagreement.`);
    }
    void a;
    return w;
  }

  // ---- selection, trajectories -----------------------------------------------------------------
  /** The finest layer containing a point, and the leaf sample there. */
  pick(x: number, y: number): { layer: Layer; sampleId: number } | null {
    let best: Layer | null = null;
    for (const L of this.layers) if (L.contains(x, y) && (!best || L.dx * L.dy < best.dx * best.dy)) best = L;
    if (!best) return null;
    const ref = best.leafAt(x, y);
    return { layer: best, sampleId: best.leaf(ref).sample };
  }
  select(layerId: number, sampleId: number): void {
    this.sel = { layerId, sampleId }; this.emit('selection');
    const L = this.layers.find((l) => l.id === layerId); if (!L) return;
    if (L.store.outcome[sampleId] !== NOT_COMPUTED) this.loadTrajectory(this.overridesFor(L, sampleId), 'sample ' + sampleId);
  }
  overridesFor(L: Layer, id: number): Record<string, number> { return { [this.applied.axes.varX]: L.store.X[id], [this.applied.axes.varY]: L.store.Y[id] }; }
  selectedLayer(): Layer | undefined { return this.sel ? this.layers.find((l) => l.id === this.sel!.layerId) : undefined; }
  trajKey(overrides: Record<string, number>, tolScale = 1): string { return this.fingerprint + '|' + this.applied.physics.horizon + '|' + tolScale + '|' + stableStringify(overrides); }

  loadTrajectory(overrides: Record<string, number>, label: string, tolScale = 1): Promise<TrajData> {
    const key = this.trajKey(overrides, tolScale);
    const hit = this.trajs.get(key); if (hit) { this.emit('traj'); return Promise.resolve(hit); }
    const epoch = this.epoch;
    return new Promise((resolve, reject) => {
      const job = new OneShot(P_MANUAL, 'trajectory', () => epoch !== this.epoch, { kind: 'trajectory', rid: 0, cfg: this.jobConfig(), overrides, horizon: this.applied.physics.horizon, dtOut: 0.01, tolScale }, (res) => {
        if (res.kind === 'trajectory') {
          const d: TrajData = { key, overrides, y0: res.y0, m: res.m, r: res.r, G: res.G, trace: res.trace, summary: res.summary, horizon: this.applied.physics.horizon, label };
          this.trajs.set(key, d); while (this.trajs.size > 14) this.trajs.delete(this.trajs.keys().next().value as string);
          this.emit('traj'); resolve(d);
        } else { this.status = res.kind === 'error' ? res.message : 'unexpected response'; this.emit('status'); reject(new Error(this.status)); }
      });
      this.scheduler.add(job);
    });
  }

  loadReference(overrides: Record<string, number>, rtol = 1e-12, atol = 1e-13): Promise<RefData> {
    const key = this.trajKey(overrides) + '|ref' + rtol;
    const hit = this.refs.get(key); if (hit) return Promise.resolve(hit);
    const epoch = this.epoch;
    return new Promise((resolve, reject) => {
      const job = new OneShot(P_MANUAL, 'reference', () => epoch !== this.epoch, { kind: 'reference', rid: 0, cfg: this.jobConfig(), overrides, horizon: this.applied.physics.horizon, nTimes: 40, rtol, atol }, (res) => {
        if (res.kind === 'reference') {
          const ini = buildInitial(this.applied.physics, overrides);
          const d: RefData = { key, times: res.times, main: res.main, ref: res.ref, mainSummary: res.mainSummary, refTEnd: res.refTEnd, refContactPair: res.refContactPair, refTContact: res.refTContact, refOk: res.refOk, refMessage: res.refMessage, refSteps: res.refSteps, rtol, atol, m: ini.m, G: this.applied.physics.G };
          this.refs.set(key, d); this.emit('traj'); resolve(d);
        } else reject(new Error(res.kind === 'error' ? res.message : 'unexpected'));
      });
      this.scheduler.add(job);
    });
  }

  /** Compute a single uncomputed sample with top priority (e.g. one the user just clicked). */
  computeSampleNow(layerId: number, id: number): void {
    const L = this.layers.find((l) => l.id === layerId); if (!L) return;
    const epoch = this.epoch;
    this.scheduler.add(new OneShot(P_MANUAL, 'sample', () => epoch !== this.epoch || !this.layers.includes(L), this.makeRequest(L, [id]), (res) => {
      if (res.kind === 'batch') { L.apply(res.cols); this.noteBatch(1, res.ms); this.onLayerResults(L); this.select(layerId, id); }
    }));
  }

  describe(layerId: number, id: number): any {
    const L = this.layers.find((l) => l.id === layerId); if (!L) return null;
    const s = L.store, ov = this.overridesFor(L, id);
    const ini = buildInitial(this.applied.physics, ov);
    return {
      id, layer: L.label, x: s.X[id], y: s.Y[id], varX: this.applied.axes.varX, varY: this.applied.axes.varY, depth: s.depth[id], ini,
      computed: s.outcome[id] !== NOT_COMPUTED, outcome: s.outcome[id], fail: s.fail[id], flags: s.flags[id], tEnd: s.tEnd[id], tOn: s.tOn[id], minD: s.minD[id], minPair: s.minPair[id], nClose: s.nClose[id], eErr: s.eErr[id], steps: s.steps[id], exch: s.exch[id], valid: s.valid[id], sens: s.sens[id],
      checkpoint: L.checkpoints.has(id),
    };
  }

  // ---- derived analysis ------------------------------------------------------------------------
  edges(layer = this.cur): Edges {
    const key = stableStringify(this.boundary);
    const c = this.edgeCache.get(layer.id);
    if (c && c.v === layer.version && c.key === key) return c.edges;
    const e = detectEdges(layer, this.boundary); this.edgeCache.set(layer.id, { v: layer.version, key, edges: e }); return e;
  }
  regions(layer = this.cur): { interest: Region[]; validation: Region[] } {
    const key = layer.id + ':' + layer.version + ':' + stableStringify(this.weights) + stableStringify(this.boundary);
    if (this.regionCache && this.regionCache.key === key) return this.regionCache.r;
    const r = rankRegions(layer, this.edges(layer), this.weights); this.regionCache = { key, r }; return r;
  }

  // ---- adaptive exploration --------------------------------------------------------------------
  exploreDefaults(): void {
    const L = this.cur, st = this.explore.settings;
    if (this.explore.minDxAuto) { st.minDx = L.dx / 2 ** st.maxDepth / 2; st.minDy = L.dy / 2 ** st.maxDepth / 2; }
  }
  startExplore(rect?: Rect): string | null {
    const L = this.cur;
    if (this.remainingUniform(L) > 0) return 'Finish the uniform map first (or wait for it to complete): adaptive sampling refines around boundaries found in a complete grid.';
    this.exploreDefaults();
    this.explore.running = true; this.explore.paused = false; this.explore.status = 'exploring';
    this.exploreRect = rect ?? null;
    if (!this.extraJob) { this.extraJob = new ExtraJob(this, P_EXPLORE); this.scheduler.add(this.extraJob); }
    this.extraJob.paused = false;
    this.exploreTick();
    this.emit('explore'); return null;
  }
  exploreRect: Rect | null = null;
  pauseExplore(): void { this.explore.paused = true; if (this.extraJob) this.extraJob.paused = true; this.explore.status = 'paused'; this.emit('explore'); }
  resumeExplore(): void { this.explore.paused = false; if (this.extraJob) this.extraJob.paused = false; this.explore.status = 'exploring'; this.scheduler.pump(); this.exploreTick(); this.emit('explore'); }
  cancelExplore(): void { this.explore.running = false; this.explore.paused = false; this.explore.status = 'cancelled'; if (this.extraJob) { this.extraJob.queue.length = 0; this.extraJob.closed = true; } this.extraJob = null; this.emit('explore'); }

  /** One refinement round: called when queued work has drained. */
  exploreTick(): void {
    const ex = this.explore, L = this.cur;
    if (!ex.running || ex.paused || !this.extraJob) return;
    if (this.extraJob.queue.length + this.extraJob.inflight > 0) return;       // wait for the previous round
    this.islands = findIslands(L);
    const edges = this.edges(L);
    const cand = refineCandidates(L, edges, ex.settings, this.islands, this.exploreRect ?? undefined);
    const budget = ex.settings.maxExtra - ex.extraUsed;
    if (budget < 4) { this.finishExplore('stopped: maximum additional simulations reached'); return; }
    if (!cand.length) { this.finishExplore('finished: no boundary cells left that satisfy the depth / minimum-scale limits (this does not prove all boundaries were found)'); return; }
    const K = Math.min(cand.length, Math.floor(budget / 4), 256, Math.max(16, Math.ceil(cand.length * 0.25)));
    const newIds: number[] = [];
    for (let q = 0; q < K; q++) newIds.push(...L.refine(cand[q].ref));
    // supplementary stratified samples (reproducible from the seed) to look for islands missed by the boundary search
    const S = Math.min(Math.floor(budget - newIds.length), Math.round(ex.settings.supFraction * newIds.length));
    for (let q = 0; q < S; q++) {
      const [x, y] = supplementaryPoint(this.exploreRect ?? L.rect, ex.settings.seed, ex.supCounter++);
      newIds.push(L.store.add(x, y, SUPPLEMENTARY));
    }
    ex.extraUsed += newIds.length; ex.rounds++;
    this.extraJob.queue.push(...newIds);
    this.edgeCache.delete(L.id); this.regionCache = null;
    this.scheduler.pump(); this.emit('explore', 'layers', 'progress');
  }
  private finishExplore(msg: string): void { this.explore.running = false; this.explore.status = msg; if (this.extraJob) { this.extraJob.closed = true; this.extraJob = null; } this.dirty = true; this.emit('explore'); this.autosave(); }
  onFillDone(layer: Layer): void {
    this.status = `Uniform map “${layer.label}” complete: ${layer.n}×${layer.n} samples.`; this.dirty = true; this.emit('status', 'progress'); this.autosave();
  }
  /** called by ExtraJob after each response */
  onExtraResults(layer: Layer): void { this.onLayerResults(layer); if (this.explore.running) this.exploreTick(); }

  /** Queue arbitrary samples (e.g. neighbours the user wants) at exploration priority. */
  queueSamples(layer: Layer, ids: number[]): void {
    if (!this.extraJob) { this.extraJob = new ExtraJob(this, P_EXPLORE); this.scheduler.add(this.extraJob); }
    this.extraJob.queue.push(...ids); this.scheduler.pump();
  }

  // ---- extension of the horizon ------------------------------------------------------------------
  extendHorizon(newH: number): void {
    const old = this.applied.physics.horizon;
    if (!(newH > old)) return;
    this.applied.physics.horizon = newH; this.pending.physics.horizon = newH;
    let total = 0;
    for (const L of this.layers) {
      const s = L.store, ids: number[] = [];
      for (let i = 0; i < s.count; i++) if (s.outcome[i] === OUT.UNRESOLVED || (s.flags[i] & FLAG.PENDING)) ids.push(i);
      L.horizon = newH; total += ids.length;
      if (ids.length) this.scheduler.add(new ListJob(this, L, ids, L === this.cur ? P_VIEW : P_BACKGROUND, true));
      this.edgeCache.delete(L.id);
    }
    this.regionCache = null; this.trajs.clear(); this.refs.clear();
    this.status = `Horizon extended from ${old} to ${newH}. ${total.toLocaleString()} unresolved / pending samples are continuing from their saved checkpoints (or restarting from t = 0 if no checkpoint is stored); every sample that already reached an event is kept unchanged.`;
    this.emit('config', 'layers', 'progress', 'status');
  }

  /** Run a stand-alone batch request on the worker pool (used by Batch mode; independent of the map). */
  runBatchRequest(req: Request): Promise<import('./store.ts').ResultColumns> {
    return new Promise((resolve, reject) => {
      this.scheduler.add(new OneShot(P_VIEW, 'batch', () => false, req, (res) => { if (res.kind === 'batch') resolve(res.cols); else reject(new Error(res.kind === 'error' ? res.message : 'unexpected response')); }));
    });
  }

  // ---- validation ------------------------------------------------------------------------------
  untestedBoundary(layer = this.cur, max = 200, rect?: Rect): number[] { return boundarySamplesToValidate(layer, this.edges(layer), max, rect); }
  validate(ids: number[], layer = this.cur, scales = DEFAULT_TOL_SCALES): void {
    if (!ids.length) return;
    this.scheduler.add(new ValidateJob(this, layer, ids, scales));
    this.status = `Validating ${ids.length} boundary samples at tolerance × ${scales.join(', ×')}.`; this.emit('validation', 'status');
  }

  computeSensitivity(layer = this.cur): void {
    const ids: number[] = []; const n2 = layer.n * layer.n;
    for (let i = 0; i < n2; i++) if (layer.store.outcome[i] !== NOT_COMPUTED && layer.store.outcome[i] !== OUT.FAILED) ids.push(i);
    this.scheduler.add(new SensJob(this, layer, ids));
    this.status = `Finite-time sensitivity: ${ids.length.toLocaleString()} samples × 2 extra runs each. Result is shown in the “Finite-time sensitivity” map mode.`; this.emit('status');
  }

  // ---- appearance (never touches physics, caches, workers or progress) -----------------------
  setBodyColour(i: number, hex: string): boolean { const h = normaliseHex(hex); if (!h) return false; this.appearance.bodies[i] = h; this.persistAppearance(); this.emit('appearance'); return true; }
  setOutcomeColour(i: number, hex: string): boolean { const h = normaliseHex(hex); if (!h) return false; this.appearance.outcomes[i] = h; this.persistAppearance(); this.emit('appearance'); return true; }
  setAppearance(a: Partial<Appearance>): void { Object.assign(this.appearance, a); this.persistAppearance(); this.emit('appearance'); }
  resetAppearance(): void { this.appearance = JSON.parse(JSON.stringify(DEFAULT_APPEARANCE)); this.persistAppearance(); this.emit('appearance'); }
  private persistAppearance(): void { try { localStorage.setItem('tbcl-appearance', JSON.stringify(this.appearance)); } catch { /* storage unavailable: appearance still works for this session */ } this.dirty = true; }
  loadAppearance(): void {
    try {
      const raw = localStorage.getItem('tbcl-appearance'); if (!raw) return;
      const a = JSON.parse(raw);
      if (Array.isArray(a.bodies) && a.bodies.length === 3 && a.bodies.every((c: string) => normaliseHex(c))) this.appearance.bodies = a.bodies.map(normaliseHex);
      if (Array.isArray(a.outcomes) && a.outcomes.length === 9 && a.outcomes.every((c: string) => normaliseHex(c))) this.appearance.outcomes = a.outcomes.map(normaliseHex);
      if (typeof a.showHatch === 'boolean') this.appearance.showHatch = a.showHatch; if (typeof a.showPreview === 'boolean') this.appearance.showPreview = a.showPreview;
    } catch { /* ignore */ }
  }

  // ---- comparison ------------------------------------------------------------------------------
  async compareSides(layer: Layer, a: number, b: number): Promise<void> {
    const oa = this.overridesFor(layer, a), ob = this.overridesFor(layer, b);
    const ax = this.applied.axes;
    this.compare = { kind: 'sides', a: this.trajKey(oa), b: this.trajKey(ob), description: 'Two actual neighbouring samples with different classified outcomes', changed: [{ name: ax.varX, a: oa[ax.varX], b: ob[ax.varX] }, { name: ax.varY, a: oa[ax.varY], b: ob[ax.varY] }] };
    this.emit('compare');
    await Promise.all([this.loadTrajectory(oa, 'A-side'), this.loadTrajectory(ob, 'B-side')]);
    this.emit('compare');
  }
  /** Compare the selected sample with a copy that differs in exactly one parameter. */
  async comparePerturbation(param: string, delta: number): Promise<string | null> {
    if (!this.sel) return 'Select a sample first.';
    const L = this.selectedLayer(); if (!L) return 'Select a sample first.';
    const base = this.overridesFor(L, this.sel.sampleId);
    const baseVal = base[param] ?? (/^d(x|y|vx|vy)\d$/.test(param) ? 0 : getParam(this.applied.physics, param));
    const pert = { ...base, [param]: baseVal + delta };
    const probs = validatePhysics(this.applied.physics, pert);
    if (probs.length) return probs[0];
    this.compare = { kind: 'perturb', a: this.trajKey(base), b: this.trajKey(pert), description: `Selected sample versus the same sample with ${param} changed by ${delta}`, changed: [{ name: param, a: baseVal, b: baseVal + delta }] };
    this.emit('compare');
    await Promise.all([this.loadTrajectory(base, 'selected'), this.loadTrajectory(pert, 'perturbed')]);
    this.emit('compare'); return null;
  }

  // ---- save / restore --------------------------------------------------------------------------
  snapshot(name: string, note = ''): Snapshot {
    return {
      schema: SCHEMA_VERSION, app: APP_VERSION, model: MODEL_VERSION, savedAt: new Date().toISOString(), name, note,
      config: cloneCfg(this.applied), layers: this.layers.map((l) => l.exportState()), currentLayerId: this.cur.id, nextLayerId: this.nextLayerId,
      view: { ...this.view }, history: { views: this.history.map((h) => ({ ...h })), index: this.histIndex }, savedRegions: this.savedRegions.map((r) => ({ name: r.name, rect: { ...r.rect } })),
      selection: this.sel ? { ...this.sel } : null, validations: JSON.parse(JSON.stringify(this.validations)),
      explore: { settings: { ...this.explore.settings }, extraUsed: this.explore.extraUsed, supCounter: this.explore.supCounter, rounds: this.explore.rounds },
      weights: { ...this.weights }, boundary: { ...this.boundary }, appearance: JSON.parse(JSON.stringify(this.appearance)), mapMode: this.mapMode, frame: this.frame,
    };
  }

  /** Replace the whole investigation with a snapshot (validated by the caller).  Restored PAUSED. */
  restore(s: Snapshot): void {
    this.scheduler.cancelAll(); this.fillJobs.clear(); this.extraJob = null; this.epoch++;
    this.applied = cloneCfg(s.config as LabConfig); this.pending = cloneCfg(this.applied);
    this.fingerprint = physicsFingerprint(this.applied.physics, this.applied.numerics, this.applied.axes);
    this.layers = s.layers.map((l) => Layer.fromState(l)); this.cur = this.layers.find((l) => l.id === s.currentLayerId) ?? this.layers[0]; this.nextLayerId = s.nextLayerId;
    this.view = { ...s.view }; this.history = s.history.views.map((v) => ({ ...v })); this.histIndex = Math.min(s.history.index, this.history.length - 1);
    this.savedRegions = s.savedRegions; this.sel = s.selection; this.validations = s.validations;
    if (s.explore?.settings) { Object.assign(this.explore.settings, s.explore.settings); this.explore.extraUsed = s.explore.extraUsed; this.explore.supCounter = s.explore.supCounter; this.explore.rounds = s.explore.rounds; }
    this.explore.running = false; this.explore.status = 'idle';
    if (s.weights) this.weights = { ...DEFAULT_WEIGHTS, ...s.weights }; if (s.boundary) this.boundary = { ...DEFAULT_BOUNDARY, ...s.boundary };
    if (s.appearance) this.appearance = { ...DEFAULT_APPEARANCE, ...s.appearance };
    this.mapMode = (s.mapMode as MapMode) ?? 'outcome'; this.frame = (s.frame as any) ?? 'com';
    this.trajs.clear(); this.refs.clear(); this.compare = null; this.edgeCache.clear(); this.regionCache = null; this.rate = []; this.islands.clear();
    this.scheduler.pause(); this.restoredPaused = true;
    this.status = `Restored “${s.name}” PAUSED. Review it, then press Resume to continue unfinished calculations.`;
    this.emit('config', 'layers', 'progress', 'selection', 'view', 'explore', 'validation', 'compare', 'status', 'appearance');
    if (this.sel && this.selectedLayer() && this.selectedLayer()!.store.outcome[this.sel.sampleId] !== NOT_COMPUTED) this.select(this.sel.layerId, this.sel.sampleId);
  }

  async saveNow(name = AUTOSAVE_NAME, note = ''): Promise<SaveReport> {
    const rep = await idbSave(this.snapshot(name, note));
    this.lastSave = rep; this.saveStatus = (rep.ok ? '✔ ' : '✖ ') + rep.message + ` (${new Date().toLocaleTimeString()})`;
    if (rep.ok && name === AUTOSAVE_NAME) this.dirty = false;
    this.emit('status'); return rep;
  }
  autosave(): void { if (this.dirty) void this.saveNow(AUTOSAVE_NAME); }
  startAutosave(everyMs = 20000): void { clearInterval(this.autosaveTimer); this.autosaveTimer = setInterval(() => { if (!this.scheduler.paused) this.autosave(); }, everyMs); }
  dispose(): void { clearInterval(this.autosaveTimer); this.scheduler.terminate(); }
}

// ---------------------------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------------------------
let jobSeq = 1;
abstract class LabJob implements Job {
  id = jobSeq++;
  lab: Lab; priority: number; label: string;
  constructor(lab: Lab, priority: number, label: string) { this.lab = lab; this.priority = priority; this.label = label; }
  abstract next(): Chunk | null;
  abstract onResponse(res: Response, ctx: any): void;
  abstract exhausted(): boolean;
  isStale(): boolean { return false; }
}

/** Progressive uniform fill of one layer. */
class FillJob extends LabJob {
  private epoch: number; private layer: Layer;
  constructor(lab: Lab, layer: Layer, priority: number) { super(lab, priority, 'fill'); this.layer = layer; this.epoch = lab.epoch; }
  isStale(): boolean { return this.epoch !== this.lab.epoch || !this.lab.layers.includes(this.layer); }
  exhausted(): boolean { return this.layer.nextOrder >= this.layer.order.length; }
  next(): Chunk | null {
    const L = this.layer, s = L.store, n2 = L.order.length, want = this.lab.chunkSize(); const ids: number[] = [];
    while (L.nextOrder < n2 && ids.length < want) { const id = L.order[L.nextOrder++]; if (s.outcome[id] === NOT_COMPUTED) ids.push(id); }
    if (!ids.length) return null;
    return { req: this.lab.makeRequest(L, ids), ctx: ids };
  }
  onResponse(res: Response): void {
    if (res.kind !== 'batch') return;
    const n = this.layer.apply(res.cols); this.lab.noteBatch(n, res.ms); this.lab.onLayerResults(this.layer);
  }
  onFinished(): void { this.lab.onFillDone(this.layer); }
}
/** Dynamic queue: refinement children, supplementary samples, user-requested samples. */
class ExtraJob extends LabJob {
  queue: number[] = []; inflight = 0; closed = false; paused = false; private epoch: number;
  constructor(lab: Lab, priority: number) { super(lab, priority, 'explore'); this.epoch = lab.epoch; }
  isStale(): boolean { return this.epoch !== this.lab.epoch; }
  exhausted(): boolean { return this.closed && this.queue.length === 0 && this.inflight === 0; }
  next(): Chunk | null {
    if (this.paused || !this.queue.length) return null;
    const ids = this.queue.splice(0, this.lab.chunkSize()); this.inflight++;
    return { req: this.lab.makeRequest(this.lab.cur, ids), ctx: ids };
  }
  onResponse(res: Response): void {
    this.inflight--;
    if (res.kind !== 'batch') return;
    const n = this.lab.cur.apply(res.cols); this.lab.noteBatch(n, res.ms); this.lab.onExtraResults(this.lab.cur);
  }
}

/** A list of samples in one layer, optionally resuming from checkpoints (horizon extension). */
class ListJob extends LabJob {
  private pos = 0; private epoch: number; private layer: Layer; private ids: number[]; private resume: boolean; private outstanding = 0;
  constructor(lab: Lab, layer: Layer, ids: number[], priority: number, resume: boolean) { super(lab, priority, 'list'); this.layer = layer; this.ids = ids; this.resume = resume; this.epoch = lab.epoch; }
  isStale(): boolean { return this.epoch !== this.lab.epoch || !this.lab.layers.includes(this.layer); }
  exhausted(): boolean { return this.pos >= this.ids.length; }
  next(): Chunk | null {
    if (this.pos >= this.ids.length) return null;
    const take = this.ids.slice(this.pos, this.pos + this.lab.chunkSize()); this.pos += take.length; this.outstanding++;
    return { req: this.lab.makeRequest(this.layer, take, { ck: this.resume }), ctx: take };
  }
  onResponse(res: Response): void {
    this.outstanding--;
    if (res.kind !== 'batch') return;
    const n = this.layer.apply(res.cols); this.lab.noteBatch(n, res.ms); this.lab.onLayerResults(this.layer);
  }
}

class OneShot extends LabJob {
  private sent = false; private stale: () => boolean; private req: Request; private cb: (r: Response) => void;
  constructor(priority: number, label: string, stale: () => boolean, req: Request, cb: (r: Response) => void) { super(undefined as any, priority, label); this.stale = stale; this.req = req; this.cb = cb; }
  isStale(): boolean { return this.stale(); }
  exhausted(): boolean { return this.sent; }
  next(): Chunk | null { if (this.sent) return null; this.sent = true; return { req: this.req }; }
  onResponse(res: Response): void { this.cb(res); }
}

class ValidateJob extends LabJob {
  private pos = 0; private epoch: number; private layer: Layer; private ids: number[]; private scales: number[];
  constructor(lab: Lab, layer: Layer, ids: number[], scales: number[]) { super(lab, P_VALIDATE, 'validate'); this.layer = layer; this.ids = ids; this.scales = scales; this.epoch = lab.epoch; }
  isStale(): boolean { return this.epoch !== this.lab.epoch || !this.lab.layers.includes(this.layer); }
  exhausted(): boolean { return this.pos >= this.ids.length; }
  next(): Chunk | null {
    if (this.exhausted()) return null;
    const take = this.ids.slice(this.pos, this.pos + 8); this.pos += take.length;
    const s = this.layer.store;
    return { req: { kind: 'validate', rid: 0, cfg: this.lab.jobConfig(), horizon: this.lab.applied.physics.horizon, ids: Int32Array.from(take), xs: Float64Array.from(take, (i) => s.X[i]), ys: Float64Array.from(take, (i) => s.Y[i]), scales: this.scales } };
  }
  onResponse(res: Response): void {
    if (res.kind !== 'validate') return;
    const S = res.scales.length, s = this.layer.store;
    for (let k = 0; k < res.ids.length; k++) {
      const runs = []; for (let q = 0; q < S; q++) runs.push({ outcome: res.outcome[k * S + q], fail: res.fail[k * S + q], tEnd: res.tEnd[k * S + q], tOnset: res.tOnset[k * S + q], flags: res.flags[k * S + q] });
      const status = classifyAgreement(runs); const id = res.ids[k];
      s.valid[id] = status;
      this.lab.validations.push({ layerId: this.layer.id, sampleId: id, x: s.X[id], y: s.Y[id], scales: res.scales, runs, status, when: new Date().toISOString() });
    }
    this.layer.version++; this.lab.dirty = true; this.lab.onLayerResults(this.layer); this.lab.emit('validation');
  }
}

class SensJob extends LabJob {
  private pos = 0; private epoch: number; private layer: Layer; private ids: number[];
  constructor(lab: Lab, layer: Layer, ids: number[]) { super(lab, P_BACKGROUND, 'sensitivity'); this.layer = layer; this.ids = ids; this.epoch = lab.epoch; }
  isStale(): boolean { return this.epoch !== this.lab.epoch || !this.lab.layers.includes(this.layer); }
  exhausted(): boolean { return this.pos >= this.ids.length; }
  next(): Chunk | null {
    if (this.exhausted()) return null;
    const take = this.ids.slice(this.pos, this.pos + Math.max(1, Math.round(this.lab.chunkSize() / 3))); this.pos += take.length;
    const s = this.layer.store, ax = this.lab.applied.axes;
    return { req: { kind: 'sensitivity', rid: 0, cfg: this.lab.jobConfig(), horizon: this.lab.applied.physics.horizon, ids: Int32Array.from(take), xs: Float64Array.from(take, (i) => s.X[i]), ys: Float64Array.from(take, (i) => s.Y[i]), dx: 1e-7 * (ax.maxX - ax.minX), nLadder: 48 } };
  }
  onResponse(res: Response): void {
    if (res.kind !== 'sensitivity') return;
    for (let k = 0; k < res.ids.length; k++) this.layer.store.sens[res.ids[k]] = res.sens[k];
    this.layer.version++; this.lab.dirty = true; this.lab.emit('layers');
  }
}

export { hashString, setParam };
