// Typed-array storage for one map layer: a uniform pixel-centre grid plus adaptively refined
// quadtree cells and free "supplementary" samples.  EVERY entry in `SampleStore` is a real
// simulation at the stored (x, y) axis coordinates, or is marked NOT_COMPUTED.
//
// Sampling convention (documented in the UI and exports):
//   * the layer covers rect [x0,x1] x [y0,y1] with n x n cells;
//   * cell (i,j) has its sample at the cell CENTRE: x = x0 + (i+0.5) dx, y = y0 + (j+0.5) dy;
//   * i increases to the right, j increases UPWARDS (so row j = n-1 is the top of the picture);
//   * sample id = j*n + i for the uniform samples; refined / supplementary samples follow.
import { CK_LEN } from './simulate.ts';

export const NOT_COMPUTED = 255;
/** depth value marking a supplementary (stratified, off-grid) sample */
export const SUPPLEMENTARY = 255;
/** validation status codes per sample */
export const VALID = { UNTESTED: 0, AGREE: 1, OUTCOME_DIFFERS: 2, RESOLUTION_CHANGE: 3, EVENT_DISCREPANCY: 4, SOLVER_FAILURE: 5 } as const;
export const VALID_LABELS = ['untested', 'agrees at all tested tolerances', 'different classified outcome', 'resolved / unresolved change', 'collision or event discrepancy', 'solver failure'];

export interface Rect { x0: number; x1: number; y0: number; y1: number }

export class SampleStore {
  count = 0; cap = 0;
  X!: Float64Array; Y!: Float64Array; tEnd!: Float64Array;
  tOn!: Float32Array; minD!: Float32Array; eErr!: Float32Array; exch!: Float32Array; sens!: Float32Array;
  outcome!: Uint8Array; fail!: Uint8Array; flags!: Uint8Array; minPair!: Uint8Array; valid!: Uint8Array; depth!: Uint8Array;
  nClose!: Uint16Array; steps!: Uint32Array;
  /** number of samples that are computed */ computed = 0;

  constructor(cap = 1024) { this.alloc(cap); }

  private alloc(cap: number): void {
    const grow = <T extends { length: number; set(a: ArrayLike<number>): void }>(old: T | undefined, ctor: new (n: number) => T, fill?: number): T => {
      const a = new ctor(cap); if (fill !== undefined) (a as any).fill(fill); if (old) (a as any).set(old); return a;
    };
    this.X = grow(this.X, Float64Array); this.Y = grow(this.Y, Float64Array); this.tEnd = grow(this.tEnd, Float64Array, NaN);
    this.tOn = grow(this.tOn, Float32Array, NaN); this.minD = grow(this.minD, Float32Array, NaN); this.eErr = grow(this.eErr, Float32Array, NaN);
    this.exch = grow(this.exch, Float32Array, NaN); this.sens = grow(this.sens, Float32Array, NaN);
    this.outcome = grow(this.outcome, Uint8Array, NOT_COMPUTED); this.fail = grow(this.fail, Uint8Array); this.flags = grow(this.flags, Uint8Array);
    this.minPair = grow(this.minPair, Uint8Array); this.valid = grow(this.valid, Uint8Array); this.depth = grow(this.depth, Uint8Array);
    this.nClose = grow(this.nClose, Uint16Array); this.steps = grow(this.steps, Uint32Array);
    this.cap = cap;
  }

  ensure(n: number): void { if (n > this.cap) this.alloc(Math.max(n, Math.ceil(this.cap * 1.6))); }

  add(x: number, y: number, depth: number): number {
    this.ensure(this.count + 1);
    const id = this.count++;
    this.X[id] = x; this.Y[id] = y; this.depth[id] = depth; this.outcome[id] = NOT_COMPUTED;
    return id;
  }

  isComputed(id: number): boolean { return this.outcome[id] !== NOT_COMPUTED; }

  /** memory used by the typed arrays, in bytes */
  bytes(): number { return this.cap * (8 * 3 + 4 * 5 + 6 + 2 + 4); }
}

/** One batch result row, as produced by the workers. */
export interface ResultColumns {
  ids: Int32Array; outcome: Uint8Array; fail: Uint8Array; flags: Uint8Array; minPair: Uint8Array;
  nClose: Uint16Array; steps: Uint32Array; tEnd: Float64Array; tOn: Float32Array; minD: Float32Array; eErr: Float32Array; exch: Float32Array;
  /** index into ck for each row, -1 when none */ ckIndex: Int32Array; ck: Float64Array;
}

// ---------------------------------------------------------------------------------------------
// Layer = rectangle + resolution + store + quadtree + checkpoints
// ---------------------------------------------------------------------------------------------
export interface LeafInfo { ref: number; cx: number; cy: number; hw: number; hh: number; sample: number; depth: number }

export class Layer {
  id: number;
  rect: Rect;
  n: number;
  store: SampleStore;
  dx: number; dy: number;
  /** progressive order of the uniform samples (ids) and how many have been dispatched */
  order: Uint32Array; nextOrder = 0; maxLevel: number;
  // quadtree of refined cells (explicit nodes; uniform root cells are implicit)
  rootChild: Int32Array;
  nCx: Float64Array; nCy: Float64Array; nHw: Float64Array; nHh: Float64Array;
  nDepth: Uint8Array; nParent: Int32Array; nChild: Int32Array; nSample: Int32Array;
  nodeCount = 0;
  checkpoints = new Map<number, Float64Array>();
  /** uniform-grid samples already computed (kept incrementally so progress queries are O(1)) */ uniformDone = 0;
  /** bumps whenever results or topology change (cache key for derived data) */ version = 0;
  /** horizon the computed results are valid for */ horizon = 0;
  /** user-visible name, e.g. "full map", "zoom 3" */ label = '';

  constructor(id: number, rect: Rect, n: number) {
    this.id = id; this.rect = { ...rect }; this.n = n;
    this.dx = (rect.x1 - rect.x0) / n; this.dy = (rect.y1 - rect.y0) / n;
    this.store = new SampleStore(n * n + 64);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) this.store.add(rect.x0 + (i + 0.5) * this.dx, rect.y0 + (j + 0.5) * this.dy, 0);
    this.maxLevel = Math.max(0, Math.min(5, Math.floor(Math.log2(n / 8))));
    this.order = progressiveOrder(n, this.maxLevel);
    this.rootChild = new Int32Array(n * n).fill(-1);
    const c = 64;
    this.nCx = new Float64Array(c); this.nCy = new Float64Array(c); this.nHw = new Float64Array(c); this.nHh = new Float64Array(c);
    this.nDepth = new Uint8Array(c); this.nParent = new Int32Array(c); this.nChild = new Int32Array(c).fill(-1); this.nSample = new Int32Array(c).fill(-1);
  }

  /** x,y of the sample in uniform cell (i,j) */
  cellIndex(x: number, y: number): [number, number] {
    const i = Math.min(this.n - 1, Math.max(0, Math.floor((x - this.rect.x0) / this.dx)));
    const j = Math.min(this.n - 1, Math.max(0, Math.floor((y - this.rect.y0) / this.dy)));
    return [i, j];
  }
  contains(x: number, y: number): boolean { return x >= this.rect.x0 && x <= this.rect.x1 && y >= this.rect.y0 && y <= this.rect.y1; }

  private growNodes(n: number): void {
    if (n <= this.nCx.length) return;
    const c = Math.max(n, this.nCx.length * 2);
    const g = <T extends { set(a: ArrayLike<number>): void }>(a: T, C: new (n: number) => T, fill?: number): T => { const b = new C(c); if (fill !== undefined) (b as any).fill(fill); b.set(a as any); return b; };
    this.nCx = g(this.nCx, Float64Array); this.nCy = g(this.nCy, Float64Array); this.nHw = g(this.nHw, Float64Array); this.nHh = g(this.nHh, Float64Array);
    this.nDepth = g(this.nDepth, Uint8Array); this.nParent = g(this.nParent, Int32Array); this.nChild = g(this.nChild, Int32Array, -1); this.nSample = g(this.nSample, Int32Array, -1);
  }

  /** Describe a leaf given its reference (0..n*n-1 = root cell, n*n+k = node k). */
  leaf(ref: number): LeafInfo {
    const nn = this.n * this.n;
    if (ref < nn) {
      const i = ref % this.n, j = (ref - i) / this.n;
      return { ref, cx: this.rect.x0 + (i + 0.5) * this.dx, cy: this.rect.y0 + (j + 0.5) * this.dy, hw: this.dx / 2, hh: this.dy / 2, sample: ref, depth: 0 };
    }
    const k = ref - nn;
    return { ref, cx: this.nCx[k], cy: this.nCy[k], hw: this.nHw[k], hh: this.nHh[k], sample: this.nSample[k], depth: this.nDepth[k] };
  }

  isLeaf(ref: number): boolean {
    const nn = this.n * this.n;
    return ref < nn ? this.rootChild[ref] < 0 : this.nChild[ref - nn] < 0;
  }

  /** The leaf containing (x,y) (clamped to the layer). */
  leafAt(x: number, y: number): number {
    const [i, j] = this.cellIndex(x, y);
    const root = j * this.n + i;
    let c = this.rootChild[root];
    if (c < 0) return root;
    const nn = this.n * this.n;
    for (;;) {
      // children order: 0:(-,-) 1:(+,-) 2:(-,+) 3:(+,+) relative to the PARENT centre
      const parent = c - 1; void parent;
      const pk = this.nParent[c];
      const pcx = pk < 0 ? this.rect.x0 + (i + 0.5) * this.dx : this.nCx[pk], pcy = pk < 0 ? this.rect.y0 + (j + 0.5) * this.dy : this.nCy[pk];
      const q = (x >= pcx ? 1 : 0) + (y >= pcy ? 2 : 0);
      const node = c + q;
      if (this.nChild[node] < 0) return nn + node;
      c = this.nChild[node];
    }
  }

  /** Split a leaf into four children, creating four NEW samples (not yet computed).  Returns the new sample ids. */
  refine(ref: number): number[] {
    const nn = this.n * this.n;
    const L = this.leaf(ref);
    this.growNodes(this.nodeCount + 4);
    const base = this.nodeCount; this.nodeCount += 4;
    const ids: number[] = [];
    for (let q = 0; q < 4; q++) {
      const k = base + q;
      const hw = L.hw / 2, hh = L.hh / 2;
      const cx = L.cx + (q & 1 ? hw : -hw), cy = L.cy + (q & 2 ? hh : -hh);
      this.nCx[k] = cx; this.nCy[k] = cy; this.nHw[k] = hw; this.nHh[k] = hh; this.nDepth[k] = L.depth + 1;
      this.nParent[k] = ref < nn ? -1 : ref - nn; this.nChild[k] = -1;
      const sid = this.store.add(cx, cy, L.depth + 1);
      this.nSample[k] = sid; ids.push(sid);
    }
    if (ref < nn) this.rootChild[ref] = base; else this.nChild[ref - nn] = base;
    this.version++;
    return ids;
  }

  /** All current leaves (cell footprints), calling fn for each. */
  forEachLeaf(fn: (ref: number) => void): void {
    const nn = this.n * this.n;
    for (let r = 0; r < nn; r++) {
      const c = this.rootChild[r];
      if (c < 0) fn(r);
      else this.walk(c, nn, fn);
    }
  }
  private walk(c: number, nn: number, fn: (ref: number) => void): void {
    for (let q = 0; q < 4; q++) {
      const k = c + q;
      if (this.nChild[k] < 0) fn(nn + k); else this.walk(this.nChild[k], nn, fn);
    }
  }

  leafCount(): number { return this.n * this.n + this.nodeCount * 3 / 4; }

  /** Merge a batch of worker results into the store.  Returns number of rows applied. */
  apply(res: ResultColumns): number {
    const s = this.store; let applied = 0;
    for (let r = 0; r < res.ids.length; r++) {
      const id = res.ids[r];
      if (id < 0 || id >= s.count) continue;
      if (s.outcome[id] === NOT_COMPUTED) { s.computed++; if (id < this.n * this.n) this.uniformDone++; }
      s.outcome[id] = res.outcome[r]; s.fail[id] = res.fail[r]; s.flags[id] = res.flags[r]; s.minPair[id] = res.minPair[r];
      s.nClose[id] = res.nClose[r]; s.steps[id] = res.steps[r]; s.tEnd[id] = res.tEnd[r]; s.tOn[id] = res.tOn[r];
      s.minD[id] = res.minD[r]; s.eErr[id] = res.eErr[r]; s.exch[id] = res.exch[r];
      s.valid[id] = 0; s.sens[id] = NaN;
      const ci = res.ckIndex[r];
      if (ci >= 0) this.checkpoints.set(id, res.ck.slice(ci * CK_LEN, (ci + 1) * CK_LEN)); else this.checkpoints.delete(id);
      applied++;
    }
    this.version++;
    return applied;
  }

  /** Plain-object snapshot of everything needed to rebuild this layer (typed arrays are copied, trimmed to size). */
  exportState(): LayerState {
    const s = this.store, c = s.count, k = this.nodeCount;
    const ckIds = Int32Array.from(this.checkpoints.keys());
    const ck = new Float64Array(ckIds.length * CK_LEN); ckIds.forEach((id, q) => ck.set(this.checkpoints.get(id)!, q * CK_LEN));
    return {
      id: this.id, rect: { ...this.rect }, n: this.n, label: this.label, horizon: this.horizon, nextOrder: this.nextOrder, count: c, nodeCount: k,
      X: s.X.slice(0, c), Y: s.Y.slice(0, c), tEnd: s.tEnd.slice(0, c), tOn: s.tOn.slice(0, c), minD: s.minD.slice(0, c), eErr: s.eErr.slice(0, c), exch: s.exch.slice(0, c), sens: s.sens.slice(0, c),
      outcome: s.outcome.slice(0, c), fail: s.fail.slice(0, c), flags: s.flags.slice(0, c), minPair: s.minPair.slice(0, c), valid: s.valid.slice(0, c), depth: s.depth.slice(0, c),
      nClose: s.nClose.slice(0, c), steps: s.steps.slice(0, c),
      rootChild: this.rootChild.slice(), nCx: this.nCx.slice(0, k), nCy: this.nCy.slice(0, k), nHw: this.nHw.slice(0, k), nHh: this.nHh.slice(0, k),
      nDepth: this.nDepth.slice(0, k), nParent: this.nParent.slice(0, k), nChild: this.nChild.slice(0, k), nSample: this.nSample.slice(0, k),
      ckIds, ck,
    };
  }

  static fromState(st: LayerState): Layer {
    const L = new Layer(st.id, st.rect, st.n);
    const s = L.store; s.ensure(st.count);
    s.X.set(st.X); s.Y.set(st.Y); s.tEnd.set(st.tEnd); s.tOn.set(st.tOn); s.minD.set(st.minD); s.eErr.set(st.eErr); s.exch.set(st.exch); s.sens.set(st.sens);
    s.outcome.set(st.outcome); s.fail.set(st.fail); s.flags.set(st.flags); s.minPair.set(st.minPair); s.valid.set(st.valid); s.depth.set(st.depth);
    s.nClose.set(st.nClose); s.steps.set(st.steps); s.count = st.count;
    let comp = 0; for (let i = 0; i < st.count; i++) if (s.outcome[i] !== NOT_COMPUTED) comp++;
    s.computed = comp;
    let ud = 0; for (let i = 0; i < st.n * st.n; i++) if (s.outcome[i] !== NOT_COMPUTED) ud++;
    L.uniformDone = ud;
    L.growNodes(st.nodeCount); L.nodeCount = st.nodeCount; L.rootChild.set(st.rootChild);
    L.nCx.set(st.nCx); L.nCy.set(st.nCy); L.nHw.set(st.nHw); L.nHh.set(st.nHh); L.nDepth.set(st.nDepth); L.nParent.set(st.nParent); L.nChild.set(st.nChild); L.nSample.set(st.nSample);
    for (let q = 0; q < st.ckIds.length; q++) L.checkpoints.set(st.ckIds[q], st.ck.slice(q * CK_LEN, (q + 1) * CK_LEN));
    L.label = st.label; L.horizon = st.horizon; L.nextOrder = Math.min(st.nextOrder, L.order.length);
    return L;
  }

  bytes(): number {
    return this.store.bytes() + this.nCx.length * (8 * 4 + 1 + 12) + this.rootChild.length * 4 + this.order.length * 4 + this.checkpoints.size * (CK_LEN * 8 + 48);
  }
}

/**
 * Progressive (coarse-to-fine) order of the uniform samples.  Level l samples are those whose i and j
 * are both multiples of 2^l; the coarsest level is computed first so a genuine (sparse) map exists
 * within moments, then each finer level fills in the gaps, finishing with every cell computed.
 */
export function progressiveOrder(n: number, maxLevel: number): Uint32Array {
  const out = new Uint32Array(n * n); let k = 0;
  const levelOf = (i: number, j: number): number => {
    let l = 0;
    while (l < maxLevel && (i & ((2 << l) - 1)) === 0 && (j & ((2 << l) - 1)) === 0) l++;
    return l;
  };
  for (let L = maxLevel; L >= 0; L--) {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (levelOf(i, j) === L) out[k++] = j * n + i;
  }
  return out;
}

/** Level (0 = finest) of uniform sample id for the preview footprint logic. */
export function levelOfCell(i: number, j: number, maxLevel: number): number {
  let l = 0;
  while (l < maxLevel && (i & ((2 << l) - 1)) === 0 && (j & ((2 << l) - 1)) === 0) l++;
  return l;
}

export interface LayerState {
  id: number; rect: Rect; n: number; label: string; horizon: number; nextOrder: number; count: number; nodeCount: number;
  X: Float64Array; Y: Float64Array; tEnd: Float64Array; tOn: Float32Array; minD: Float32Array; eErr: Float32Array; exch: Float32Array; sens: Float32Array;
  outcome: Uint8Array; fail: Uint8Array; flags: Uint8Array; minPair: Uint8Array; valid: Uint8Array; depth: Uint8Array; nClose: Uint16Array; steps: Uint32Array;
  rootChild: Int32Array; nCx: Float64Array; nCy: Float64Array; nHw: Float64Array; nHh: Float64Array;
  nDepth: Uint8Array; nParent: Int32Array; nChild: Int32Array; nSample: Int32Array;
  ckIds: Int32Array; ck: Float64Array;
}
