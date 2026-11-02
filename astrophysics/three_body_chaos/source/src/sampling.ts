// Adaptive sampling: candidate selection around boundaries, and reproducible supplementary
// (stratified random) exploration that can discover islands the boundary search misses.
import { Layer, SUPPLEMENTARY, NOT_COMPUTED } from './store.ts';
import type { Edges } from './boundaries.ts';
import { OUT } from './simulate.ts';

/** mulberry32: small, fast, seedable PRNG (reproducible across engines: integer arithmetic only). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ExploreSettings {
  maxDepth: number; maxExtra: number;
  /** minimum cell width of any refined child, in axis units */ minDx: number; minDy: number;
  /** bit mask of edge kinds that attract refinement (see EDGE) */ criteria: number;
  seed: number;
  /** supplementary samples per refined sample (0–1) */ supFraction: number;
}

export interface Candidate { ref: number; score: number }

/** Leaves adjacent to at least one edge of an accepted kind, ranked by (summed edge score)/(1+depth). */
export function refineCandidates(layer: Layer, edges: Edges, s: ExploreSettings, islands: Set<number>, rect?: { x0: number; x1: number; y0: number; y1: number }): Candidate[] {
  const acc = new Map<number, number>();
  const st = layer.store;
  const add = (sid: number, sc: number): void => {
    if (st.depth[sid] === SUPPLEMENTARY) return;
    const ref = layer.leafAt(st.X[sid], st.Y[sid]);
    acc.set(ref, (acc.get(ref) ?? 0) + sc);
  };
  for (let q = 0; q < edges.n; q++) {
    if (!(edges.kind[q] & s.criteria)) continue;
    if (rect && !(edges.mx[q] >= rect.x0 && edges.mx[q] <= rect.x1 && edges.my[q] >= rect.y0 && edges.my[q] <= rect.y1)) continue;
    add(edges.a[q], edges.score[q]); add(edges.b[q], edges.score[q]);
  }
  for (const host of islands) add(host, 6);
  const out: Candidate[] = [];
  for (const [ref, sc] of acc) {
    if (!layer.isLeaf(ref)) continue;
    const L = layer.leaf(ref);
    if (L.depth >= s.maxDepth) continue;
    if (L.hw < s.minDx || L.hh < s.minDy) continue;                 // child cell width = hw
    if (L.hw < 1e-12 * Math.max(1, Math.abs(L.cx)) || L.hh < 1e-12 * Math.max(1, Math.abs(L.cy))) continue; // Float64 guard
    out.push({ ref, score: sc / (1 + L.depth) });
  }
  out.sort((a, b) => b.score - a.score || a.ref - b.ref);
  return out;
}

const permCache = new Map<number, Uint16Array>();
function strataPermutation(seed: number, size: number): Uint16Array {
  const key = seed * 65537 + size;
  let p = permCache.get(key);
  if (!p) {
    p = new Uint16Array(size * size); for (let i = 0; i < p.length; i++) p[i] = i;
    const rnd = mulberry32(seed ^ 0x9e3779b9);
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    permCache.set(key, p);
  }
  return p;
}

/**
 * k-th supplementary point: the rectangle is divided into 64x64 strata; strata are visited in a
 * seeded random order and each point is jittered uniformly inside its stratum.  The same
 * (seed, k) always gives the same point, so exploration is reproducible.
 */
export function supplementaryPoint(rect: { x0: number; x1: number; y0: number; y1: number }, seed: number, k: number, size = 64): [number, number] {
  const perm = strataPermutation(seed, size);
  const cell = perm[k % perm.length], round = Math.floor(k / perm.length);
  const rnd = mulberry32((seed * 2654435761) ^ (round * 40503) ^ cell);
  const ci = cell % size, cj = (cell - ci) / size;
  return [rect.x0 + ((ci + rnd()) / size) * (rect.x1 - rect.x0), rect.y0 + ((cj + rnd()) / size) * (rect.y1 - rect.y0)];
}

/** Supplementary samples whose classification differs from the cell they landed in ("islands"). */
export function findIslands(layer: Layer): Set<number> {
  const st = layer.store, hosts = new Set<number>();
  for (let id = 0; id < st.count; id++) {
    if (st.depth[id] !== SUPPLEMENTARY || st.outcome[id] === NOT_COMPUTED || st.outcome[id] === OUT.FAILED) continue;
    const ref = layer.leafAt(st.X[id], st.Y[id]), L = layer.leaf(ref);
    const o = st.outcome[L.sample];
    if (o !== NOT_COMPUTED && o !== OUT.FAILED && o !== st.outcome[id]) hosts.add(L.sample);
  }
  return hosts;
}
