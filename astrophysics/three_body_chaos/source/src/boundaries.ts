// Boundary discovery between neighbouring samples, and ranking of "interesting regions".
//
// Everything here is DERIVED from simulations that have already been run: an edge is a pair of
// neighbouring samples whose results differ in a documented way.  An edge says "something changes
// between these two initial conditions", never "the boundary is exactly here".
import { Layer, NOT_COMPUTED, VALID, type Rect } from './store.ts';
import { OUT, FLAG } from './simulate.ts';

export const EDGE = { OUTCOME: 1, COLEJ: 2, TIME: 4, CLOSE: 8, NUMERIC: 32, ISLAND: 64 } as const;
export const EDGE_LABELS: Record<number, string> = {
  1: 'different classified outcome', 2: 'collision ↔ ejection transition', 4: 'sharp change in event time',
  8: 'sharp change in closest approach', 32: 'numerical disagreement / unreliable', 64: 'isolated supplementary sample differs',
};

export interface BoundaryParams {
  /** event times differing by more than this factor count as a sharp change */ timeFactor: number;
  /** closest approaches differing by more than this factor count as a sharp change */ closeFactor: number;
}
export const DEFAULT_BOUNDARY: BoundaryParams = { timeFactor: 2, closeFactor: 4 };

/** Weight of each edge kind in the per-edge score (and the default ranking). */
export const EDGE_WEIGHT: Record<number, number> = { 1: 3, 2: 2, 4: 1, 8: 1, 32: 2, 64: 3 };

export interface Edges {
  n: number; a: Int32Array; b: Int32Array; kind: Uint8Array; score: Float32Array; mx: Float64Array; my: Float64Array;
  /** lattice stride used (1 = every cell; 2^l during the progressive coarse stage) */ stride: number;
  layerVersion: number;
}

const isEvent = (o: number): boolean => o !== OUT.UNRESOLVED && o !== OUT.FAILED && o !== NOT_COMPUTED;

export function edgeKind(layer: Layer, a: number, b: number, p: BoundaryParams): number {
  const s = layer.store;
  const oa = s.outcome[a], ob = s.outcome[b];
  if (oa === NOT_COMPUTED || ob === NOT_COMPUTED) return 0;
  let k = 0;
  if (oa === OUT.FAILED || ob === OUT.FAILED || s.valid[a] >= VALID.OUTCOME_DIFFERS || s.valid[b] >= VALID.OUTCOME_DIFFERS) k |= EDGE.NUMERIC;
  if (oa !== OUT.FAILED && ob !== OUT.FAILED) {
    if (oa !== ob) {
      k |= EDGE.OUTCOME;
      const colA = oa >= OUT.COL_AB && oa <= OUT.COL_BC, colB = ob >= OUT.COL_AB && ob <= OUT.COL_BC;
      if (colA !== colB && isEvent(oa) && isEvent(ob)) k |= EDGE.COLEJ;
    } else if (isEvent(oa)) {
      const ta = s.tEnd[a], tb = s.tEnd[b];
      if (ta > 0 && tb > 0 && Math.max(ta / tb, tb / ta) > p.timeFactor) k |= EDGE.TIME;
    }
    const da = s.minD[a], db = s.minD[b];
    if (da > 0 && db > 0 && Math.max(da / db, db / da) > p.closeFactor) k |= EDGE.CLOSE;
  }
  return k;
}

export function edgeScore(kind: number): number { let sc = 0; for (const bit of [1, 2, 4, 8, 32, 64]) if (kind & bit) sc += EDGE_WEIGHT[bit]; return sc; }

/** Stride of the finest lattice that is completely computed (progressive stage), else 1. */
export function completeStride(layer: Layer): number {
  const n = layer.n, s = layer.store;
  for (let l = layer.maxLevel; l >= 1; l--) {
    const st = 1 << l; let ok = true;
    for (let j = 0; j < n && ok; j += st) for (let i = 0; i < n; i += st) if (s.outcome[j * n + i] === NOT_COMPUTED) { ok = false; break; }
    if (ok) {
      // use this lattice only if the next finer one is not yet complete
      const st2 = st >> 1; let finer = true;
      for (let j = 0; j < n && finer; j += st2) for (let i = 0; i < n; i += st2) if (s.outcome[j * n + i] === NOT_COMPUTED) { finer = false; break; }
      if (!finer) return st;
    }
  }
  return 1;
}

/** Detect boundary edges over the layer. */
export function detectEdges(layer: Layer, params: BoundaryParams = DEFAULT_BOUNDARY): Edges {
  const s = layer.store, n = layer.n;
  const A: number[] = [], B: number[] = [], K: number[] = [];
  const stride = completeStride(layer);
  const push = (a: number, b: number): void => {
    const k = edgeKind(layer, a, b, params);
    if (k) { A.push(a); B.push(b); K.push(k); }
  };
  if (stride > 1 || layer.nodeCount === 0) {
    // pure lattice: neighbours at +stride in i and j (root cells only)
    for (let j = 0; j < n; j += stride) for (let i = 0; i < n; i += stride) {
      const a = j * n + i;
      if (i + stride < n) push(a, j * n + i + stride);
      if (j + stride < n) push(a, (j + stride) * n + i);
    }
  } else {
    // quadtree-aware: probe beyond the right and upper sides of every leaf
    const nn = n * n; const seen = new Set<number>();
    const tiny = Math.min(layer.dx, layer.dy) * 1e-9;
    layer.forEachLeaf((ref) => {
      const L = layer.leaf(ref);
      for (const side of [0, 1]) {
        seen.clear();
        for (const f of [-0.5, 0.5]) {
          const px = side === 0 ? L.cx + L.hw + tiny : L.cx + f * L.hw, py = side === 0 ? L.cy + f * L.hh : L.cy + L.hh + tiny;
          if (px > layer.rect.x1 || py > layer.rect.y1) continue;
          const nb = layer.leafAt(px, py);
          if (nb === ref || seen.has(nb)) continue; seen.add(nb);
          const nl = nb < nn ? nb : layer.nSample[nb - nn];
          push(L.sample, nl);
        }
      }
    });
  }
  const m = A.length;
  const e: Edges = { n: m, a: Int32Array.from(A), b: Int32Array.from(B), kind: Uint8Array.from(K), score: new Float32Array(m), mx: new Float64Array(m), my: new Float64Array(m), stride, layerVersion: layer.version };
  for (let q = 0; q < m; q++) {
    e.score[q] = edgeScore(e.kind[q]);
    e.mx[q] = 0.5 * (s.X[e.a[q]] + s.X[e.b[q]]); e.my[q] = 0.5 * (s.Y[e.a[q]] + s.Y[e.b[q]]);
  }
  return e;
}

// ---------------------------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------------------------
export interface RankWeights { outcome: number; colej: number; time: number; close: number; unresolved: number; numeric: number; untested: number; provisional: number; coarse: number }
export const DEFAULT_WEIGHTS: RankWeights = { outcome: 3, colej: 2, time: 1, close: 1, unresolved: 1, numeric: 2, untested: 1, provisional: 1, coarse: 0.5 };

export interface Region {
  kind: 'interest' | 'validation';
  rect: Rect; score: number; reasons: string[];
  outcomes: number[]; outcomeCounts: number[]; samples: number; edges: number;
  edgeCounts: Record<number, number>;
  untested: number; agree: number; disagree: number; provisional: number; failed: number; unresolvedCluster: number;
  /** a pair of actual neighbouring samples with different classified outcomes, if any */
  pair?: [number, number];
  reliability: string;
}

/**
 * Rank blocks of the layer.  For an interest region the score is
 *   S = w_o (D-1) ln(1+E_o) + w_c ln(1+E_ce) + w_t ln(1+E_t) + w_d ln(1+E_d) + w_u ln(1+U)   times (1 + w_k * c)
 * where D = distinct classified outcomes present, E_* = edge counts by kind, U = unresolved-cluster
 * samples (unresolved with >=2 unresolved lattice neighbours), c = fraction of the block's boundary
 * samples still at coarse (depth 0) sampling.  Validation regions are scored separately:
 *   V = w_n ln(1+E_numeric) + w_x ln(1+untested boundary samples) + w_p ln(1+provisional+failed).
 */
export function rankRegions(layer: Layer, edges: Edges, w: RankWeights = DEFAULT_WEIGHTS, blocks = 12, limit = 8): { interest: Region[]; validation: Region[] } {
  const s = layer.store, R = layer.rect;
  const bw = (R.x1 - R.x0) / blocks, bh = (R.y1 - R.y0) / blocks;
  const idx = (x: number, y: number): number => Math.min(blocks - 1, Math.max(0, Math.floor((x - R.x0) / bw))) + blocks * Math.min(blocks - 1, Math.max(0, Math.floor((y - R.y0) / bh)));
  const nb = blocks * blocks;
  const cnt = Array.from({ length: nb }, () => ({
    oc: new Array(9).fill(0), samples: 0, ec: { 1: 0, 2: 0, 4: 0, 8: 0, 32: 0, 64: 0 } as Record<number, number>, edges: 0,
    untested: 0, agree: 0, disagree: 0, prov: 0, failed: 0, ucl: 0, coarse: 0, bsamples: 0, pair: undefined as [number, number] | undefined, pairScore: 0, bo: new Set<number>(),
  }));
  for (let id = 0; id < s.count; id++) {
    const o = s.outcome[id]; if (o === NOT_COMPUTED) continue;
    const c = cnt[idx(s.X[id], s.Y[id])];
    c.samples++; if (o < 9) c.oc[o]++;
    if (o === OUT.FAILED) c.failed++;
    if (s.flags[id] & FLAG.PROVISIONAL) c.prov++;
  }
  // unresolved clusters on the root lattice (stride-1 uniform samples only)
  const n = layer.n, st = edges.stride;
  for (let j = st; j < n - st; j += st) for (let i = st; i < n - st; i += st) {
    const id = j * n + i; if (s.outcome[id] !== OUT.UNRESOLVED) continue;
    let u = 0; for (const o of [id - st, id + st, id - st * n, id + st * n]) if (s.outcome[o] === OUT.UNRESOLVED) u++;
    if (u >= 2) cnt[idx(s.X[id], s.Y[id])].ucl++;
  }
  const seenB = new Set<number>();
  for (let q = 0; q < edges.n; q++) {
    const c = cnt[idx(edges.mx[q], edges.my[q])];
    c.edges++;
    // the outcomes on BOTH sides of a boundary belong to the region the boundary runs through
    c.bo.add(s.outcome[edges.a[q]]); c.bo.add(s.outcome[edges.b[q]]);
    for (const bit of [1, 2, 4, 8, 32, 64]) if (edges.kind[q] & bit) c.ec[bit]++;
    for (const sid of [edges.a[q], edges.b[q]]) {
      if (seenB.has(sid)) continue; seenB.add(sid);
      const cc = cnt[idx(s.X[sid], s.Y[sid])];
      cc.bsamples++;
      if (s.valid[sid] === VALID.UNTESTED) cc.untested++; else if (s.valid[sid] === VALID.AGREE) cc.agree++; else cc.disagree++;
      if (s.depth[sid] === 0) cc.coarse++;
    }
    if ((edges.kind[q] & EDGE.OUTCOME) && edges.score[q] > c.pairScore) { c.pairScore = edges.score[q]; c.pair = [edges.a[q], edges.b[q]]; }
  }
  const interest: Region[] = [], validation: Region[] = [];
  for (let k = 0; k < nb; k++) {
    const c = cnt[k]; if (c.samples === 0) continue;
    const bi = k % blocks, bj = (k - bi) / blocks;
    const rect: Rect = { x0: R.x0 + bi * bw, x1: R.x0 + (bi + 1) * bw, y0: R.y0 + bj * bh, y1: R.y0 + (bj + 1) * bh };
    const present = new Set<number>(c.oc.map((v, o) => (v > 0 && o !== OUT.FAILED ? o : -1)).filter((o) => o >= 0));
    c.bo.forEach((o) => { if (o < 9 && o !== OUT.FAILED) present.add(o); });
    const D = present.size;
    const outcomes = [...present].sort((a, b) => a - b).map((o) => [o, c.oc[o]]);
    const opp = c.bsamples ? c.coarse / c.bsamples : 0;
    const iScore = (w.outcome * Math.max(0, D - 1) * Math.log1p(c.ec[1]) + w.colej * Math.log1p(c.ec[2]) + w.time * Math.log1p(c.ec[4]) + w.close * Math.log1p(c.ec[8]) + w.unresolved * Math.log1p(c.ucl)) * (1 + w.coarse * opp);
    const rel = c.bsamples === 0 ? 'no boundary samples' : c.untested === c.bsamples ? 'untested' : c.disagree > 0 ? `${c.disagree} disagree` : c.untested > 0 ? 'partly tested' : 'all tested agree';
    const base = { rect, outcomes: outcomes.map(([o]) => o), outcomeCounts: outcomes.map(([, v]) => v), samples: c.samples, edges: c.edges, edgeCounts: { ...c.ec }, untested: c.untested, agree: c.agree, disagree: c.disagree, provisional: c.prov, failed: c.failed, unresolvedCluster: c.ucl, pair: c.pair, reliability: rel };
    if (iScore > 0.25 && D >= 1) {
      const reasons: string[] = [];
      if (D > 1) reasons.push(`${D} different outcomes in one block`);
      if (c.ec[1]) reasons.push(`${c.ec[1]} neighbour pairs with different outcomes`);
      if (c.ec[2]) reasons.push(`${c.ec[2]} collision↔ejection transitions`);
      if (c.ec[4]) reasons.push(`${c.ec[4]} sharp event-time changes`);
      if (c.ec[8]) reasons.push(`${c.ec[8]} sharp closest-approach changes`);
      if (c.ucl) reasons.push(`${c.ucl} samples in unresolved clusters`);
      if (opp > 0.5) reasons.push('still coarsely sampled: refinement likely to reveal more');
      interest.push({ ...base, kind: 'interest', score: iScore, reasons });
    }
    const vScore = w.numeric * Math.log1p(c.ec[32]) + w.untested * Math.log1p(c.untested) * (c.bsamples ? 1 : 0) + w.provisional * Math.log1p(c.prov + c.failed);
    if (vScore > 0.25 && (c.ec[32] > 0 || c.untested > 0 && c.edges > 0 || c.failed > 0 || c.prov > 0)) {
      const reasons: string[] = [];
      if (c.ec[32]) reasons.push(`${c.ec[32]} pairs with numerical disagreement or unreliable members`);
      if (c.untested && c.edges) reasons.push(`${c.untested} boundary samples not yet validated`);
      if (c.failed) reasons.push(`${c.failed} failed/unreliable trajectories`);
      if (c.prov) reasons.push(`${c.prov} provisional classifications`);
      validation.push({ ...base, kind: 'validation', score: vScore, reasons });
    }
  }
  const pick = (list: Region[]): Region[] => {
    list.sort((a, b) => b.score - a.score);
    const out: Region[] = [];
    for (const r of list) {
      // non-maximum suppression: skip a block touching an already chosen, higher-ranked block
      if (out.some((o) => Math.abs((o.rect.x0 - r.rect.x0) / bw) < 1.5 && Math.abs((o.rect.y0 - r.rect.y0) / bh) < 1.5)) continue;
      out.push(r); if (out.length >= limit) break;
    }
    return out;
  };
  return { interest: pick(interest), validation: pick(validation) };
}

/** Boundary samples (endpoints of edges with outcome or numeric kinds) ranked by edge score, for validation. */
export function boundarySamplesToValidate(layer: Layer, edges: Edges, max: number, rect?: Rect): number[] {
  const s = layer.store; const score = new Map<number, number>();
  for (let q = 0; q < edges.n; q++) {
    if (!(edges.kind[q] & (EDGE.OUTCOME | EDGE.COLEJ | EDGE.TIME | EDGE.NUMERIC))) continue;
    if (rect && !(edges.mx[q] >= rect.x0 && edges.mx[q] <= rect.x1 && edges.my[q] >= rect.y0 && edges.my[q] <= rect.y1)) continue;
    for (const id of [edges.a[q], edges.b[q]]) if (s.valid[id] === VALID.UNTESTED && s.outcome[id] !== OUT.FAILED) score.set(id, (score.get(id) ?? 0) + edges.score[q]);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, max).map(([id]) => id);
}
