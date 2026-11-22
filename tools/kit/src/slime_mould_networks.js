/* =====================================================================
   SLIME MOULD NETWORKS
   Physarum polycephalum is a single giant cell with millions of nuclei.
   It has no brain, yet when it spreads over a dish with oat flakes on it,
   its tubes shrink back into an efficient network joining the food: in
   2010 Tero and colleagues placed oats at the positions of the towns
   around Tokyo and the mould grew a network much like the real railway.

   This model follows Jeff Jones (2010). The mould is imagined as a crowd
   of tiny "agents" (bits of cytoplasm). Each agent, every step:

     1. SENSES the chemical trail at three points ahead of it:
        straight on, a little to the left and a little to the right
        (the "sensor angle", at the "sensor distance")
     2. TURNS towards the strongest of the three ("turn angle")
     3. MOVES forward one step
     4. DEPOSITS a little more trail where it is

   The trail spreads out (diffuses) and fades (decays) every step. Food
   sources keep releasing chemical. Agents follow trail, trail is made
   by agents: a positive feedback that gathers them into tubes, while
   decay starves the tubes nobody uses. The network is not planned by
   anything: it EMERGES.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const WW = 960, WH = 540;              // the big (graphics card) world, in trail cells
const BSCALE = 3, BW = WW / BSCALE, BH = WH / BSCALE;   // the batch-run world: a third of the size, run on the CPU

// ---------------- Maps: food in fractions of the world's width and height (y downwards) ----------------
// Towns around Tokyo, as in Tero et al. (2010), from approximate longitude / latitude. Tokyo Bay and Sagami Bay are walls
// (in the real experiment, bright light kept the mould off the sea and the mountains).
const TOKYO = { lon0: 139.06, lon1: 140.40, lat0: 35.12, lat1: 36.12 };
const TOWNS = [["Tokyo", 139.767, 35.681], ["Yokohama", 139.630, 35.455], ["Kawasaki", 139.703, 35.531], ["Chiba", 140.123, 35.612], ["Omiya", 139.624, 35.906],
  ["Hachioji", 139.316, 35.656], ["Tachikawa", 139.414, 35.698], ["Machida", 139.446, 35.542], ["Fujisawa", 139.487, 35.345], ["Kamakura", 139.552, 35.322],
  ["Yokosuka", 139.660, 35.285], ["Funabashi", 139.983, 35.700], ["Kashiwa", 139.975, 35.868], ["Matsudo", 139.903, 35.787], ["Narita", 140.318, 35.776],
  ["Tsukuba", 140.112, 36.083], ["Kawagoe", 139.486, 35.925], ["Tokorozawa", 139.469, 35.799], ["Ome", 139.276, 35.788], ["Hon-Atsugi", 139.363, 35.442],
  ["Kisarazu", 139.925, 35.385], ["Ichihara", 140.115, 35.498], ["Sakura", 140.224, 35.724], ["Koshigaya", 139.791, 35.891], ["Kasukabe", 139.752, 35.975],
  ["Kuki", 139.667, 36.062], ["Odawara", 139.155, 35.262], ["Hiratsuka", 139.349, 35.335], ["Sagamihara", 139.346, 35.595], ["Fuchu", 139.477, 35.669]];
const SEAS = [   // Tokyo Bay, the Uraga channel and Sagami Bay as polygons of [lon, lat]
  [[139.78, 35.635], [139.86, 35.668], [139.97, 35.672], [140.07, 35.595], [140.10, 35.50], [140.00, 35.43], [139.88, 35.37], [139.84, 35.28], [139.82, 34.6], [139.69, 34.6], [139.685, 35.265], [139.655, 35.40], [139.66, 35.465], [139.74, 35.52], [139.775, 35.57]],
  [[138.9, 35.235], [139.20, 35.24], [139.35, 35.312], [139.50, 35.31], [139.58, 35.295], [139.62, 35.22], [139.64, 34.6], [138.9, 34.6]]];
// England and Wales: big cities (approximate longitude / latitude)
const UK = { lon0: -4.6, lon1: 2.2, lat0: 50.45, lat1: 55.25 };
const CITIES = [["London", -0.128, 51.507], ["Birmingham", -1.890, 52.486], ["Manchester", -2.244, 53.483], ["Leeds", -1.549, 53.801], ["Liverpool", -2.983, 53.408],
  ["Newcastle", -1.618, 54.978], ["Sheffield", -1.470, 53.381], ["Bristol", -2.588, 51.455], ["Nottingham", -1.150, 52.954], ["Leicester", -1.133, 52.637],
  ["Southampton", -1.404, 50.909], ["Cardiff", -3.179, 51.481], ["Oxford", -1.258, 51.752], ["Cambridge", 0.122, 52.205], ["Norwich", 1.297, 52.630],
  ["Exeter", -3.533, 50.718], ["Hull", -0.336, 53.744], ["York", -1.082, 53.960], ["Plymouth", -4.143, 50.375], ["Brighton", -0.137, 50.823]];
// longitude / latitude → fractions of the world, keeping the map's true shape (1° of longitude is cos(latitude) of 1° of latitude)
function geo(box, lon, lat) {
  const k = Math.cos((box.lat0 + box.lat1) / 2 * DEG), mw = (box.lon1 - box.lon0) * k, mh = box.lat1 - box.lat0, s = Math.min(0.92 * WW / mw, 0.9 * WH / mh);
  return [(WW / 2 + ((lon - (box.lon0 + box.lon1) / 2) * k) * s) / WW, (WH / 2 - (lat - (box.lat0 + box.lat1) / 2) * s) / WH];
}
const PRESETS = {
  tokyo: { name: "Towns around Tokyo", food: () => TOWNS.map(([n, lo, la]) => [...geo(TOKYO, lo, la), n]), seas: () => SEAS.map(p => p.map(([lo, la]) => geo(TOKYO, lo, la))), foodR: 5 },
  uk: { name: "Cities of England and Wales", food: () => CITIES.map(([n, lo, la]) => [...geo(UK, lo, la), n]), foodR: 5 },
  triangle: { name: "Three oat flakes", food: () => { const r = 0.24; return [[0.5, 0.5 - r], [0.5 - r * 0.866 * WH / WW, 0.5 + r / 2], [0.5 + r * 0.866 * WH / WW, 0.5 + r / 2]]; }, foodR: 7 },
  square: { name: "Four corners", food: () => { const a = 0.22, b = a * WH / WW; return [[0.5 - b, 0.5 - a], [0.5 + b, 0.5 - a], [0.5 + b, 0.5 + a], [0.5 - b, 0.5 + a]]; }, foodR: 7 },
  ring: { name: "Ring of eight", food: () => Array.from({ length: 8 }, (_, i) => [0.5 + 0.38 * WH / WW * Math.cos(i * TAU / 8), 0.5 + 0.38 * Math.sin(i * TAU / 8)]), foodR: 6 },
  scatter: { name: "Scattered oats", food: () => { const r = K.rng(7); return Array.from({ length: 14 }, () => [0.08 + 0.84 * r(), 0.1 + 0.8 * r()]); }, foodR: 6 },
  free: { name: "No food at all", food: () => [], foodR: 6 }
};

// ---------------- The CPU model (Batch run, and the network measurements) ----------------
/* A world of w × h trail cells. p = { sa, ra (degrees), so (cells), dep, decay, diff, jitter, agents (per cell), food, smell, life, respawn } (see DEF below).
   foods: [[fx, fy]] in fractions; walls: Uint8Array of w*h (1 = wall). */
class Slime {
  constructor(w, h, p, foods, walls, rand, foodR) {
    Object.assign(this, { w, h, p, rand }); this.trail = new Float32Array(w * h); this.tmp = new Float32Array(w * h);
    this.wall = walls || new Uint8Array(w * h); this.food = new Uint8Array(w * h); this.foods = foods.map(([fx, fy]) => [fx * w, fy * h]);
    const R = foodR || 2.5;
    // the food "smell": nutrients diffusing out of each food source make a broad, gentle slope up towards every one of them
    this.smell = smellField(this.foods, w, h, (p.reach || 0.12) * Math.hypot(w, h), this.wall);
    for (const [x, y] of this.foods) for (let j = Math.floor(y - R); j <= y + R; j++) for (let i = Math.floor(x - R); i <= x + R; i++) if (i >= 0 && j >= 0 && i < w && j < h && (i + .5 - x) ** 2 + (j + .5 - y) ** 2 <= R * R) this.food[i + j * w] = 1;
    const n = Math.round(w * h * p.agents); this.n = n; this.x = new Float32Array(n); this.y = new Float32Array(n); this.dx = new Float32Array(n); this.dy = new Float32Array(n); this.age = new Float32Array(n); this.occ = new Uint8Array(w * h); this.alive = n;
    for (let k = 0; k < n; k++) { let x, y, tries = 0; do { x = rand() * w; y = rand() * h; } while (this.wall[(x | 0) + (y | 0) * w] && ++tries < 50); this.x[k] = x; this.y[k] = y; this.occ[(x | 0) + (y | 0) * w] = 1; this.age[k] = rand() * 200; this.face(k, rand() * TAU); }
    this.t = 0;
  }
  // each agent's heading is kept as a unit arrow (dx, dy), so turning is a rotation and no sines or cosines are needed in the loop
  face(k, a) { this.dx[k] = Math.cos(a); this.dy[k] = Math.sin(a); }
  step() {
    const { w, h, p, x, y, dx, dy, trail, wall, rand, foods } = this, cS = Math.cos(p.sa * DEG), sS = Math.sin(p.sa * DEG), cR = Math.cos(p.ra * DEG), sR = Math.sin(p.ra * DEG), SO = p.so, J = (p.jitter || 0) * DEG;
    const smell = this.smell, SM = p.smell || 0;
    const look = (X, Y) => { X = X | 0; Y = Y | 0; if (X < 0 || Y < 0 || X >= w || Y >= h) return -1; const i = X + Y * w; return wall[i] ? -1 : trail[i] + SM * smell[i]; };
    const respawn = foods.length ? p.respawn || 0 : 0, age = this.age, food = this.food, occ = this.occ, crowd = p.crowd !== false;
    // an agent's age counts the steps since it last reached food
    const life = foods.length && p.life ? p.life * Math.hypot(w, h) : 0;
    for (let k = 0; k < this.n; k++) {
      if (age[k] < 0) continue;                                                     // this agent has died
      // SHRINKAGE: an agent that has gone too long without reaching food dies, so the mould pulls back from the empty parts of the dish
      if (life && age[k] > life && this.t > 20) { age[k] = -1; occ[(x[k] | 0) + (y[k] | 0) * w] = 0; this.alive--; continue; }
      if (respawn && rand() < respawn) { const f = foods[(rand() * foods.length) | 0]; const fx = f[0] + 2 * (rand() - .5), fy = f[1] + 2 * (rand() - .5), c = (fx | 0) + (fy | 0) * w; if (!occ[c] && fx >= 0 && fy >= 0 && fx < w && fy < h) { occ[(x[k] | 0) + (y[k] | 0) * w] = 0; occ[c] = 1; x[k] = fx; y[k] = fy; age[k] = 0; this.face(k, rand() * TAU); continue; } }   // a little of the mould keeps growing out from each food source
      let ux = dx[k], uy = dy[k]; const X = x[k], Y = y[k];
      // 1. sense straight ahead, and at the sensor angle to the left and right
      const F = look(X + SO * ux, Y + SO * uy), L = look(X + SO * (ux * cS - uy * sS), Y + SO * (uy * cS + ux * sS)), R = look(X + SO * (ux * cS + uy * sS), Y + SO * (uy * cS - ux * sS));
      // 2. turn by the turn angle towards the strongest (both sides stronger than ahead: pick one at random)
      let turn = 0; if (F > L && F > R) turn = 0; else if (F < L && F < R) turn = rand() < 0.5 ? 1 : -1; else if (L > R) turn = 1; else if (R > L) turn = -1;
      if (turn) { const t = ux * cR - turn * uy * sR; uy = uy * cR + turn * ux * sR; ux = t; }
      if (J) { const j = (rand() - 0.5) * J, t = ux - j * uy; uy = uy + j * ux; ux = t; const m = Math.hypot(ux, uy); ux /= m; uy /= m; }
      // 3. move one cell; if blocked by a wall, the edge or (crowding) another agent already in that cell, stay put and face a random new way
      const nx = X + ux, ny = Y + uy, c0 = (X | 0) + (Y | 0) * w, c1 = (nx | 0) + (ny | 0) * w;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || wall[c1] || (crowd && c1 !== c0 && occ[c1])) { this.face(k, rand() * TAU); continue; }
      occ[c0] = 0; occ[c1] = 1;
      // 4. deposit
      x[k] = nx; y[k] = ny; dx[k] = ux; dy[k] = uy; age[k] = food[c1] ? 0 : age[k] + 1;
      trail[c1] += p.dep;
    }
    // the trail spreads (each cell moves part of the way towards the average of its 3×3 neighbourhood) and fades
    const t2 = this.tmp, keep = 1 - p.decay, D = p.diff == null ? 1 : p.diff, FOOD = p.food == null ? 4 : p.food;
    for (let j = 0; j < h; j++) { const j0 = j > 0 ? j - 1 : 0, j1 = j < h - 1 ? j + 1 : h - 1;
      for (let i = 0; i < w; i++) { const i0 = i > 0 ? i - 1 : 0, i1 = i < w - 1 ? i + 1 : w - 1, c = j * w + i;
        if (wall[c]) { t2[c] = 0; continue; }
        const s = trail[j0 * w + i0] + trail[j0 * w + i] + trail[j0 * w + i1] + trail[j * w + i0] + trail[c] + trail[j * w + i1] + trail[j1 * w + i0] + trail[j1 * w + i] + trail[j1 * w + i1];
        t2[c] = (trail[c] + D * (s / 9 - trail[c])) * keep + (food[c] ? FOOD : 0); } }
    this.trail = t2; this.tmp = trail; this.t++;
  }
}
// sum of exp(−distance / reach) from every food source (1 at a food source). Walls block nothing here, which is a simplification.
function smellField(foods, w, h, reach, wall) {
  const f = new Float32Array(w * h); if (!foods.length) return f;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let s = 0; for (const [x, y] of foods) s += Math.exp(-Math.hypot(i + .5 - x, j + .5 - y) / reach); f[i + j * w] = wall && wall[i + j * w] ? 0 : s; }
  return f;
}
/* ---------------- Measuring a network ----------------
   1. Cells whose trail is well above the background count as tube (threshold: a fraction of the typical strong trail).
   2. The tubes are thinned to lines one cell wide (Zhang–Suen thinning) and the lines' length added up.
   3. The shortest route through the tubes between every pair of food sources is found (Dijkstra), and compared with the straight line.
   The total length is compared with the MINIMUM SPANNING TREE: the shortest set of straight lines that joins every food source. */
function measure(T, w, h, foodsXY, foodR, wall, thrFrac) {
  // threshold: 30% of the 98th percentile of the trail (sampled), so the measure does not depend on the deposit setting
  const samp = []; for (let i = 0; i < T.length; i += 37) if (T[i] > 0) samp.push(T[i]); samp.sort((a, b) => a - b);
  const top = samp.length ? samp[Math.floor(samp.length * 0.98)] : 1, thr = (thrFrac || 0.3) * top;
  const on = new Uint8Array(w * h); let area = 0; for (let i = 0; i < w * h; i++) if (T[i] > thr && !(wall && wall[i])) { on[i] = 1; area++; }
  for (const [x, y] of foodsXY) for (let j = Math.floor(y - foodR); j <= y + foodR; j++) for (let i = Math.floor(x - foodR); i <= x + foodR; i++) if (i >= 0 && j >= 0 && i < w && j < h && (i - x) ** 2 + (j - y) ** 2 <= foodR * foodR) on[i + j * w] = 1;
  const sk = thin(on, w, h); let len = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (sk[i + j * w]) { if (i + 1 < w && sk[i + 1 + j * w]) len += 1; if (j + 1 < h && sk[i + (j + 1) * w]) len += 1;
    if (i + 1 < w && j + 1 < h && sk[i + 1 + (j + 1) * w] && !sk[i + 1 + j * w] && !sk[i + (j + 1) * w]) len += Math.SQRT2; if (i > 0 && j + 1 < h && sk[i - 1 + (j + 1) * w] && !sk[i - 1 + j * w] && !sk[i + (j + 1) * w]) len += Math.SQRT2; }
  const F = foodsXY.length, mst = mstLength(foodsXY); let pairs = 0, linked = 0, detour = 0;
  for (let a = 0; a < F; a++) {
    const d = dijkstra(on, w, h, foodsXY[a]);
    for (let b = a + 1; b < F; b++) { pairs++; const [x, y] = foodsXY[b], v = d[(x | 0) + (y | 0) * w]; if (v < 1e8) { linked++; detour += v / Math.hypot(x - foodsXY[a][0], y - foodsXY[a][1]); } }
  }
  return { len, mst, ratio: mst ? len / mst : 0, area, linked: pairs ? linked / pairs : 1, detour: linked ? detour / linked : NaN, sk, thr };
}
function mstLength(P) {   // Prim's algorithm: grow the tree by always adding the nearest food source not yet joined
  const n = P.length; if (n < 2) return 0; const inT = new Uint8Array(n), best = new Float64Array(n).fill(Infinity); best[0] = 0; let tot = 0;
  for (let k = 0; k < n; k++) { let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i; inT[u] = 1; tot += best[u];
    for (let i = 0; i < n; i++) if (!inT[i]) { const d = Math.hypot(P[i][0] - P[u][0], P[i][1] - P[u][1]); if (d < best[i]) best[i] = d; } }
  return tot;
}
function mstEdges(P) { const n = P.length, E = [], inT = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1); if (!n) return E; best[0] = 0;
  for (let k = 0; k < n; k++) { let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i; inT[u] = 1; if (from[u] >= 0) E.push([from[u], u]);
    for (let i = 0; i < n; i++) if (!inT[i]) { const d = Math.hypot(P[i][0] - P[u][0], P[i][1] - P[u][1]); if (d < best[i]) { best[i] = d; from[i] = u; } } }
  return E; }
function thin(src, w, h) {   // Zhang–Suen thinning: peel boundary cells off, a layer at a time, until only one-cell-wide lines remain
  const m = Uint8Array.from(src), del = []; let changed = true, it = 0;
  const P = (i, j) => (i >= 0 && j >= 0 && i < w && j < h) ? m[i + j * w] : 0;
  while (changed && it++ < 60) { changed = false;
    for (let pass = 0; pass < 2; pass++) { del.length = 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (!m[i + j * w]) continue;
        const p2 = P(i, j - 1), p3 = P(i + 1, j - 1), p4 = P(i + 1, j), p5 = P(i + 1, j + 1), p6 = P(i, j + 1), p7 = P(i - 1, j + 1), p8 = P(i - 1, j), p9 = P(i - 1, j - 1);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
        const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2); if (A !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue; del.push(i + j * w); }
      if (del.length) { changed = true; for (const c of del) m[c] = 0; } } }
  return m;
}
function dijkstra(on, w, h, [sx, sy]) {   // shortest route through tube cells (8 directions) from one food source to everywhere
  const d = new Float64Array(w * h).fill(1e9), heap = [], push = (c, v) => { heap.push([v, c]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } },
    pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
  const c0 = (sx | 0) + (sy | 0) * w; d[c0] = 0; push(c0, 0);
  while (heap.length) { const [v, c] = pop(); if (v > d[c]) continue; const i = c % w, j = (c / w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue; const n = ii + jj * w; if (!on[n]) continue; const nv = v + (di && dj ? Math.SQRT2 : 1); if (nv < d[n]) { d[n] = nv; push(n, nv); } } }
  return d;
}
// The model's settings. Lengths are in cells of the big view (the batch world divides them by 3).
const DEF = { sa: 22.5, ra: 45, so: 15, dep: 5, decay: 0.1, diff: 1, agents: 0.15, food: 5, smell: 2, life: 1, jitter: 0, respawn: 0 };
// one headless run in the batch world: returns the measured network
function trial(rand, o) {
  const pr = PRESETS[o.preset || "scatter"], foods = pr.food(), wall = new Uint8Array(BW * BH);
  paintWalls(wall, BW, BH, pr);
  const p = Object.assign({}, DEF, o.p || {}); p.so /= BSCALE;
  const R = Math.max(1.5, pr.foodR / BSCALE), s = new Slime(BW, BH, p, foods, wall, rand, R);
  for (let k = 0; k < (o.steps || 1200); k++) s.step();
  return measure(s.trail, BW, BH, s.foods, R, wall);
}
function paintWalls(wall, w, h, pr) {
  if (pr.walls) for (const [x, y, ww, hh] of pr.walls()) for (let j = Math.floor(y * h); j < Math.ceil((y + hh) * h); j++) for (let i = Math.floor(x * w); i < Math.ceil((x + ww) * w); i++) if (i >= 0 && j >= 0 && i < w && j < h) wall[i + j * w] = 1;
  if (pr.seas) for (const poly of pr.seas()) { const P = poly.map(([x, y]) => [x * w, y * h]);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let ins = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [xa, ya] = P[a], [xb, yb] = P[b]; if ((ya > j + .5) !== (yb > j + .5) && i + .5 < (xb - xa) * (j + .5 - ya) / (yb - ya) + xa) ins = !ins; } if (ins) wall[i + j * w] = 2; } }
}

// =====================================================================
// THE PAGE (everything below runs only in the browser)
// =====================================================================
if (typeof module !== "undefined") module.exports = { Slime, measure, trial, PRESETS, mstLength, DEF, BW, BH };
else page();
function page() {
const P = Object.assign({}, DEF);                  // the live settings
let preset = "tokyo", spawn = "all", palette = 0, showMST = false, showNames = true, speed = 6, foods = [], walls = new Uint8Array(WW * WH), steps = 0;
const log = { len: [], mst: [], alive: [], linked: [] }; let last = null;

const ui = K.app({
  title: "Slime Mould Networks", subject: "Biology",
  blurb: "A brainless single cell that designs railways",
  reset: () => load(preset),
  missions: [
    { title: "Rediscover Tokyo's railways", q: "Load the towns around Tokyo and watch. In 2010 a real slime mould, fed on oats placed like these towns, grew a network much like the real railway. Switch on the minimum spanning tree (the shortest possible set of straight links). Is the mould's network the shortest? What does it have that the tree does not?", hint: "The mould's network is longer than the tree (the readout shows about 1.3–1.6 × its length) but it has loops, so most towns have two routes in: cut one tube and the towns stay joined. Real railways make the same trade: a little more track for shorter journeys and backup routes. The bays are walls, as bright light kept the real mould off the 'sea'.", setup() { load("tokyo"); ctl.mst.set(true, true); } },
    { title: "Where do three roads meet?", q: "Three oat flakes at the corners of a triangle. The shortest network joining three points is not two sides of the triangle: it meets at a junction in the middle. Does the mould find a middle junction? What angle do the tubes meet at?", hint: "Usually the mould keeps all three sides, a loop, which is longer but survives a cut anywhere. Watch for a side thinning and the tubes pulling inwards towards a junction; harsher settings (life without food 0.5–0.75) push it that way. The truly shortest network meets at the Steiner point, where three roads meet at 120° (13% shorter than two sides). Soap films find it exactly; the mould rarely does, which says something about what it is really optimising.", setup() { load("triangle"); } },
    { title: "Cut a vein", q: "Let a network form, then choose the 🧱 Wall tool and draw a wall across a busy tube. What happens to the towns it joined? How long does it take to find a new way round?", hint: "The cut tube's ends fade. If the network had a loop, traffic simply switches to the other route at once. If not, the mould has to explore: shrinking means it has few spare agents, so press 'Grow again' to send new mould out from the food, and a new tube forms round the wall.", setup() { load("scatter"); ui.tip("Wait for a network, then draw a wall across a tube", 6000); } },
    { title: "Sensor angle: tangles or highways?", q: "Set the sensor angle to 10°, restart, and watch. Then try 45° and 90°. How does the angle the agents look ahead at change the network?", hint: "Narrow sensors (10°) make agents follow trails very straight: long, smooth tubes but they miss food off to the side. Around 22–45° they find and join most of the food. At 90° the agents cannot follow a trail at all and the network breaks into clumps. The batch run measures it.", setup() { load("scatter"); ctl.sa.set(10, true); } },
    { title: "Starve it or feed it", q: "'Life without food' is how long a bit of mould survives away from food. Try 0.5 (harsh) and 'never dies'. Which network is cheaper to build? Which joins more food, with shorter routes?", hint: "Harsh: a lean tree-like network, but some food gets cut off. Never dies: a dense mesh over the whole dish, joining everything with near-straight routes but hugely long. Real Physarum, and real transport networks, sit in between: cost against efficiency against fault tolerance.", setup() { load("scatter"); ctl.life.set(0.5, true); } },
    { title: "No food at all", q: "With no food, the mould just follows its own trail. What patterns appear? Change the sensor distance and the turn angle: can you make cells, spots, waves or a fine lace?", hint: "Without food nothing dies, and the agents form a 'reticulated' network of polygonal cells that slowly merge and coarsen. Longer sensors make bigger cells; a turn angle smaller than the sensor angle makes the network unstable and wandering. Patterns like these grow when real Physarum spreads over an empty dish.", setup() { load("free"); } },
    { title: "England's motorways?", q: "Load the cities of England and Wales. Which cities does the mould join directly? Compare it with a map of the motorways (M1, M6, M4, M5, M62…). Where does it disagree, and why might real roads differ?", hint: "London–Birmingham–Manchester–Leeds usually appear, a little like the M1/M6/M62 spine, and Bristol–Cardiff like the M4. Differences come from what the model leaves out: hills, rivers, the sea between Wales and Somerset (no walls here), and the fact that real roads were built where people and money were, not just where cities are.", setup() { load("uk"); } }
  ],
  batch: [
    { title: "Sensor angle and joining up", question: "How does the sensor angle change how many pairs of oat flakes end up joined by tubes?", how: "Each run: 14 scattered oat flakes in a third-size dish, 1200 steps, other settings as on load. The result is the percentage of pairs of oat flakes joined through the network.", xLabel: "sensor angle (°)", yLabel: "pairs of food joined (%)", xs: [10, 22.5, 45, 67.5, 90], reps: 4, yMin: 0, yMax: 105, run: (x, r) => 100 * trial(r, { preset: "scatter", p: { sa: x } }).linked, note: "Each run starts from a different random scatter of agents, so the network differs. Very narrow sensors make long straight tubes that miss food; very wide ones cannot follow a trail. Somewhere around 20–45° joins the most food." },
    { title: "How long a network?", question: "If the mould survives longer without food, how much longer is its network than the minimum spanning tree?", how: "Each run: 14 scattered oat flakes, 1200 steps. Network length (tubes thinned to lines) ÷ the minimum spanning tree of the oat flakes.", xLabel: "life without food (× dish diagonal)", yLabel: "network length ÷ spanning tree", xs: [0.5, 0.75, 1, 1.5, 2], reps: 4, yMin: 0, theory: () => 1, theoryLabel: "minimum spanning tree", run: (x, r) => trial(r, { preset: "scatter", p: { life: x } }).ratio, note: "Short lives give a lean network, sometimes shorter than the tree because some food is not joined at all. Long lives keep a mesh of loops over much of the dish, several times the tree's length. The spanning tree is not the true minimum (a Steiner tree, with extra junctions, is up to 13% shorter), but it is easy to work out." },
    { title: "How direct are the routes?", question: "Does a longer-lived (more expensive) network give more direct routes between food?", how: "Each run: 14 scattered oat flakes, 1200 steps. For each pair of joined oat flakes, the shortest route through the tubes ÷ the straight-line distance, averaged.", xLabel: "life without food (× dish diagonal)", yLabel: "route ÷ straight line", xs: [0.5, 0.75, 1, 1.5, 2], reps: 4, yMin: 1, theory: () => 1, theoryLabel: "straight line", run: (x, r) => trial(r, { preset: "scatter", p: { life: x } }).detour, note: "Only joined pairs count, so harsh settings can look direct simply because only nearby pairs are joined. Richer networks have more loops and short-cuts, so routes get closer to the straight line: the cost–efficiency trade-off Tero and colleagues measured for real Physarum and the Tokyo railway (about 1.1–1.2 for both)." },
    { title: "Trail decay", question: "How does the speed at which the trail fades change the length of the network?", how: "Each run: 14 scattered oat flakes, 1200 steps. Network length ÷ minimum spanning tree.", xLabel: "trail decay (fraction lost per step)", yLabel: "network length ÷ spanning tree", xs: [0.03, 0.05, 0.1, 0.2, 0.3], reps: 4, yMin: 0, theory: () => 1, theoryLabel: "minimum spanning tree", run: (x, r) => trial(r, { preset: "scatter", p: { decay: x } }).ratio, note: "A slow-fading trail spreads further and keeps more tubes and loops alive; a fast-fading one keeps only the busiest tubes, so the network is shorter at high decay (about 1.6 × the tree up to 10% decay, about 1.25 × at 20–30%)." },
    { title: "Tokyo, again and again", question: "If the mould grows over the Tokyo towns many times, how long is its network compared with the spanning tree, and how much does it vary?", how: "Each run: the 30 towns (Tokyo Bay and Sagami Bay are walls), 1200 steps, settings as on load.", xLabel: "", yLabel: "network length ÷ spanning tree", reps: 20, bins: 12, theory: 1, theoryLabel: "spanning tree", run: r => 0, note: "Every run differs in detail but the length lands in a narrow band, a little above the tree: like Tero's real moulds, which made networks about 1.4–1.8 times the spanning tree, close to the real railway. This model, with its settings on load, comes out at about 1.3." }
  ],
  notes: `<h3>What is being modelled</h3>
<p><i>Physarum polycephalum</i>, a slime mould: one huge cell that spreads over a surface as a network of tubes. Following Jeff Jones (2010), the mould is imagined as a crowd of small agents (bits of cytoplasm), each following four rules every step:</p>
<ol><li><b>Sense</b> the chemical trail at three points a set distance ahead: straight on and at the <b>sensor angle</b> to each side.</li>
<li><b>Turn</b> by the <b>turn angle</b> towards the strongest. If both sides are stronger than ahead, turn either way at random.</li>
<li><b>Move</b> one cell forward, unless the cell is a wall, the edge, or already holds an agent (crowding: one agent per cell). If blocked, stay and face a random new way.</li>
<li><b>Deposit</b> trail where it lands.</li></ol>
<p>Every step the trail spreads (each cell moves towards the average of its 3×3 neighbours: the "blur") and fades (the "decay"). Food sources add trail every step, and also give off a broad, faint smell (the sum of exp(−distance ÷ reach) from every food source, reach = 12% of the dish's diagonal) that agents sense on top of the trail. An agent that goes longer than its <b>life without food</b> (measured in steps, as a multiple of the dish's diagonal in cells) without reaching food dies: this <b>shrinkage</b> is what pulls the mould back from empty parts of the dish, as real Physarum does, leaving tubes that join food.</p>
<h3>Measuring the network</h3>
<ul><li>Cells with trail above 30% of the strongest (98th percentile) trail count as tube. Tubes are thinned to lines one cell wide (Zhang–Suen thinning) and their length added up (√2 for diagonal steps).</li>
<li><b>Minimum spanning tree</b>: the shortest set of straight lines joining every food source (Prim's algorithm). The truly shortest network, a Steiner tree, can add junctions and is up to 13% shorter.</li>
<li><b>Pairs joined</b> and <b>route ÷ straight line</b>: the shortest path through tube cells between every pair of food sources (Dijkstra's algorithm).</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Real Physarum moves by rhythmic squeezing of its tubes, and tubes thicken where the flow is greatest (Tero's flow model). Here, "flow" is just agents following trail. The model reproduces the patterns, not the mechanism.</li>
<li>Agents are points that move one cell per step; the dish is a grid. The big view is 960 × 540 cells, run on the graphics card; the Batch run uses a 320 × 180 dish (a third of the size, sensor distance ÷ 3) on the main processor, so its networks are coarser.</li>
<li>On the graphics card, agents all move at the same moment, so crowding is checked against where agents were one step earlier. That would jam busy tubes (an agent is blocked by the one in front even as it moves on), so on the card an occupied cell blocks an agent only 30% of the time, and agents live 1.5 times as long without food. A trickle of new mould (0.04% of agents each step) also regrows from the food. The CPU version (Batch run) moves agents one at a time with strict crowding and no regrowth.</li><li>The live readouts measure the network at a third of the resolution and count a cell as tube above 12% of the strongest trail (the batch run uses 30%), so faint outer tubes are counted.</li>
<li>Food never runs out and never moves by itself. The smell passes through walls.</li>
<li>No light, temperature or moisture, all of which steer real Physarum. In Tero's experiment, light was used to mark the sea and mountains; here they are walls.</li>
<li>Town and city positions are approximate (from longitude and latitude). The comparison with railways and motorways is a visual one; the model knows nothing about people, hills or cost.</li></ul>
<h3>Sources</h3>
<p>Jones, J. (2010) "Characteristics of pattern formation and evolution in approximations of Physarum transport networks", <i>Artificial Life</i> 16. Tero, A. et al. (2010) "Rules for biologically inspired adaptive network design", <i>Science</i> 327.</p>
<p>See also <a href="../turing_patterns/turing-patterns.html">Turing Patterns</a> (reaction and diffusion making spots and stripes) and <a href="../ant_colony/ant-colony.html">Ant Colony Foraging</a> (scent trails between a nest and food).</p>`
});
// the Tokyo batch experiment has no x setting: run() gets the random generator as its second argument
ui.config.batch[4].run = (x, r) => trial(r, { preset: "tokyo" }).ratio;

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("The mould's rules");
const num = (key, o) => ctl[key] = K.slider(g, Object.assign({ value: P[key], on: v => { P[key] = v; } }, o));
num("sa", { label: "Sensor angle", min: 5, max: 90, step: 2.5, fmt: v => v + "°", tip: "How far to the sides each agent sniffs" });
num("so", { label: "Sensor distance", min: 3, max: 45, step: 1, fmt: v => v + " cells", tip: "How far ahead it sniffs" });
num("ra", { label: "Turn angle", min: 5, max: 90, step: 2.5, fmt: v => v + "°" });
num("dep", { label: "Deposit", min: 1, max: 20, step: 1, fmt: v => v + " per step" });
num("decay", { label: "Trail decay", min: 0.02, max: 0.4, step: 0.01, fmt: v => (v * 100).toFixed(0) + "% per step" });
num("diff", { label: "Trail blur (spreading)", min: 0, max: 1, step: 0.05, fmt: v => v === 0 ? "none" : (v * 100).toFixed(0) + "%" });
num("jitter", { label: "Wobble", min: 0, max: 60, step: 5, fmt: v => v ? "± " + v / 2 + "°" : "none", tip: "Random error in each turn" });
g = ui.group("Food and shrinking");
num("food", { label: "Food strength", min: 0, max: 20, step: 1, fmt: v => v ? v + " per step" : "off" });
num("smell", { label: "Food smell", min: 0, max: 8, step: 0.5, fmt: v => v ? "× " + v : "off", tip: "A faint scent that guides agents to distant food" });
ctl.life = K.slider(g, { label: "Life without food", min: 0.25, max: 3.25, step: 0.25, value: P.life, fmt: v => v > 3 ? "never dies" : "× " + v.toFixed(2) + " diagonal", on: v => { P.life = v > 3 ? 0 : v; }, tip: "Steps an agent survives away from food, as a multiple of the dish's diagonal" });
let r1 = K.row(g); K.btn(r1, "🌱 Grow again", () => regrow(), "primary").title = "Bring dead agents back to life at the food, so the mould spreads out again";
g = ui.group("The dish");
ctl.preset = K.seg(g, { label: "Map", value: preset, options: [["tokyo", "Tokyo"], ["uk", "England"], ["triangle", "3 oats"], ["square", "4 oats"], ["ring", "Ring"], ["scatter", "Scatter"], ["free", "No food"]], on: v => load(v) });
ctl.n = K.slider(g, { label: "Agents", min: 0.05, max: 0.4, step: 0.05, value: P.agents, fmt: v => Math.round(v * WW * WH / 1000) + " thousand", on: v => { P.agents = v; restart(); } });
ctl.spawn = K.seg(g, { label: "Start", value: spawn, options: [["all", "everywhere"], ["food", "from the food"]], on: v => { spawn = v; restart(); } });
ctl.tool = K.seg(g, { label: "Mouse", value: "food", options: [["food", "🍞 Food"], ["wall", "🧱 Wall"], ["erase", "🧽 Erase"]] });
K.note(g, "Food: click to add, drag to move, right-click to remove. Wall and Erase: drag to paint.");
r1 = K.row(g); K.btn(r1, "↺ Restart", () => restart(), "primary"); K.btn(r1, "Clear walls", () => { walls.fill(0); paintPreset(false); uploadMask(); }); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("slime-mould", view, cv));
g = ui.group("Show");
ctl.speed = K.slider(g, { label: "Speed (steps per frame)", min: 1, max: 16, step: 1, value: speed, on: v => speed = v }); ui.headerSpeed(ctl.speed);
ctl.pal = K.seg(g, { label: "Colours", value: 0, options: [[0, "Physarum gold"], [1, "Neon"], [2, "Ember"]], on: v => palette = v });
ctl.mst = K.toggle(g, { label: "Minimum spanning tree", value: false, on: v => showMST = v });
ctl.names = K.toggle(g, { label: "Place names", value: true, on: v => showNames = v });
const read = K.readout(g, [["len", "network length"], ["mst", "spanning tree"], ["ratio", "length ÷ tree"], ["link", "pairs of food joined"], ["det", "route ÷ straight line"], ["alive", "agents alive"]]);
K.note(g, "Lengths in cells; measured every couple of seconds.");

// ---------------- The graphics card ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.5 });
const cv = ui.canvas(() => { });            // labels, spanning tree and pointer drawn on a 2D canvas over the top
const gl = view.gl, ok = view.ok;
let S = 0, agents, trail, count, mask, smellT, foodT, quad, pts, prU, prDep, prDiff, prShow;
const SW = 240, SH = 135;                    // the smell is worked out on a coarse grid and smoothed by the card
const HASH = `float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }`;
if (ok) {
  quad = K.gl.quad(gl);
  trail = K.gl.pingpong(gl, WW, WH, { float: true, blend: true });
  count = K.gl.target(gl, WW, WH, {});
  mask = K.gl.target(gl, WW, WH, {});
  smellT = K.gl.target(gl, SW, SH, { float: true, filter: "linear" });
  foodT = K.gl.target(gl, 64, 1, { float: true });
  // 1. each agent (one texel: x, y, heading (+10 if it was blocked), age; age < 0 = dead) senses, turns and moves
  prU = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv;
    uniform sampler2D uAgents, uTrail, uMask, uCount, uSmell, uFood; uniform vec2 uWorld; uniform float uSA, uRA, uSO, uJit, uSeed, uSmellW, uLife, uFoodN, uRespawn, uStep, uCrowd;
    ${HASH}
    float look(vec2 q) {                                        // trail + food smell at a point; walls and the edge count as −1
      if (q.x < 0.0 || q.y < 0.0 || q.x >= uWorld.x || q.y >= uWorld.y) return -1.0;
      vec2 uv = (floor(q) + 0.5) / uWorld; if (texture2D(uMask, uv).g > 0.25) return -1.0;
      return texture2D(uTrail, uv).r + uSmellW * texture2D(uSmell, q / uWorld).r;
    }
    void main() {
      vec4 A = texture2D(uAgents, vUv); if (A.w < 0.0) { gl_FragColor = A; return; }
      vec2 p = A.xy; float h = mod(A.z, 10.0), age = A.w + 1.0;
      float r1 = hash(vUv * 917.0 + uSeed), r2 = hash(vUv * 613.0 + uSeed * 1.7), r3 = hash(vUv * 271.0 + uSeed * 2.3);
      // shrinkage: too long without food and this bit of the mould dies
      if (uLife > 0.0 && uFoodN > 0.0 && age > uLife && uStep > 60.0) { gl_FragColor = vec4(p, h, -1.0); return; }
      // occasional respawn at a random food source
      if (uFoodN > 0.0 && r3 < uRespawn) { vec2 f = texture2D(uFood, vec2((floor(r1 * uFoodN) + 0.5) / 64.0, 0.5)).xy; gl_FragColor = vec4(f + (vec2(r2, r1) - 0.5) * 4.0, r2 * 6.2832, 0.0); return; }
      // 1. sense ahead, left and right
      float F = look(p + uSO * vec2(cos(h), sin(h))), L = look(p + uSO * vec2(cos(h + uSA), sin(h + uSA))), R = look(p + uSO * vec2(cos(h - uSA), sin(h - uSA)));
      // 2. turn towards the strongest
      if (F > L && F > R) { } else if (F < L && F < R) h += (r1 < 0.5 ? 1.0 : -1.0) * uRA; else if (L > R) h += uRA; else if (R > L) h -= uRA;
      h += (r2 - 0.5) * uJit;
      // 3. move one cell, unless a wall, the edge or another agent is in the way
      vec2 q = p + vec2(cos(h), sin(h)); bool blocked = q.x < 0.0 || q.y < 0.0 || q.x >= uWorld.x || q.y >= uWorld.y;
      vec2 cq = (floor(q) + 0.5) / uWorld;
      if (!blocked) blocked = texture2D(uMask, cq).g > 0.25 || (floor(q) != floor(p) && texture2D(uCount, cq).r > 0.5 && r2 < uCrowd);
      if (blocked) { gl_FragColor = vec4(p, mod(r3 * 6.2832, 6.2832) + 10.0, age); return; }
      if (texture2D(uMask, cq).r > 0.5) age = 0.0;               // reached food: fed again
      gl_FragColor = vec4(q, mod(h + 6.2832, 6.2832), age);
    }`);
  // 2. deposit (and, with uMode 1, mark which cells hold an agent): each agent is drawn as one point
  prDep = K.gl.program(gl, `precision highp float; attribute vec2 aPos; uniform sampler2D uAgents; uniform vec2 uWorld; uniform float uMode; varying float vAmt;
    void main() { vec4 A = texture2D(uAgents, aPos); bool skip = A.w < 0.0 || (uMode < 0.5 && A.z >= 10.0);
      gl_Position = skip ? vec4(2.0, 2.0, 0.0, 1.0) : vec4((floor(A.xy) + 0.5) / uWorld * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0; vAmt = 1.0; }`,
    `precision highp float; uniform float uDep, uMode; void main() { gl_FragColor = uMode > 0.5 ? vec4(1.0) : vec4(uDep, 0.0, 0.0, 0.0); }`);
  // 3. the trail spreads and fades; food keeps adding to it; walls hold none
  prDiff = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uTrail, uMask; uniform vec2 uTexel; uniform float uKeep, uDiff, uFood;
    void main() { vec4 m = texture2D(uMask, vUv); if (m.g > 0.25) { gl_FragColor = vec4(0.0); return; }
      float c = texture2D(uTrail, vUv).r, s = 0.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += texture2D(uTrail, vUv + vec2(float(i), float(j)) * uTexel).r;
      gl_FragColor = vec4(min((c + uDiff * (s / 9.0 - c)) * uKeep + (m.r > 0.5 ? uFood : 0.0), 2000.0), 0.0, 0.0, 1.0); }`);
  // 4. the picture: trail through a colour map, a soft glow, glowing oat flakes, walls and sea
  prShow = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uTrail, uMask; uniform vec2 uWorld, uCanvas, uOff; uniform float uScale, uGain, uPal, uTime;
    ${HASH}
    vec3 pal(float t) {
      if (uPal < 0.5) return mix(mix(vec3(0.02, 0.012, 0.0), vec3(0.75, 0.38, 0.02), smoothstep(0.0, 0.45, t)), vec3(1.0, 0.95, 0.62), smoothstep(0.45, 1.0, t));   // Physarum gold
      if (uPal < 1.5) return mix(mix(vec3(0.0, 0.01, 0.04), vec3(0.05, 0.45, 0.95), smoothstep(0.0, 0.5, t)), vec3(0.75, 1.0, 1.0), smoothstep(0.5, 1.0, t));      // neon
      return mix(mix(vec3(0.03, 0.0, 0.02), vec3(0.85, 0.1, 0.25), smoothstep(0.0, 0.45, t)), vec3(1.0, 0.8, 0.4), smoothstep(0.45, 1.0, t));                      // ember
    }
    void main() {
      vec2 px = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y), w = (px - uOff) / uScale;      // world cell under this pixel
      if (w.x < 0.0 || w.y < 0.0 || w.x > uWorld.x || w.y > uWorld.y) { gl_FragColor = vec4(0.012, 0.014, 0.02, 1.0); return; }
      vec2 uv = w / uWorld; vec4 m = texture2D(uMask, uv);
      float v = texture2D(uTrail, uv).r, glow = 0.0;
      for (int k = 0; k < 8; k++) { float a = float(k) * 0.785; glow += texture2D(uTrail, uv + vec2(cos(a), sin(a)) * 3.5 / uWorld).r + texture2D(uTrail, uv + vec2(cos(a + 0.39), sin(a + 0.39)) * 8.0 / uWorld).r; }
      float t = 1.0 - exp(-v * uGain), tg = 1.0 - exp(-glow / 16.0 * uGain);
      vec2 d = uv - 0.5; vec3 agar = vec3(0.035, 0.03, 0.022) * (1.0 - 1.3 * dot(d, d)) + 0.008 * hash(floor(w));
      if (uPal > 0.5) agar = agar.bgr * 0.8;
      vec3 c = agar + pal(t) * 0.92 + pal(tg) * 0.35 * (1.0 - t);
      if (m.g > 0.75) c = vec3(0.16, 0.17, 0.2) + 0.03 * hash(floor(w / 2.0));                          // a wall
      else if (m.g > 0.25) c = vec3(0.02, 0.06, 0.11) + 0.015 * sin(w.x * 0.08 + w.y * 0.05 + uTime);     // sea
      if (m.r > 0.5) c = mix(c, vec3(1.0, 0.93, 0.75), 0.75 + 0.25 * sin(uTime * 2.0 + w.x));            // an oat flake
      else c += vec3(1.0, 0.85, 0.6) * m.b * 0.35;                                                        // its soft halo
      gl_FragColor = vec4(c, 1.0);
    }`);
}

// ---------------- Food, walls and the mask texture ----------------
function presetFoods(k) { const pr = PRESETS[k]; return pr.food().map(([x, y, name]) => ({ x: x * WW, y: y * WH, name })); }
function paintPreset(clear) { if (clear) walls.fill(0); const pr = PRESETS[preset], w = new Uint8Array(WW * WH); paintWalls(w, WW, WH, pr); for (let i = 0; i < w.length; i++) if (w[i]) walls[i] = w[i]; }
const maskData = new Uint8Array(WW * WH * 4);
function uploadMask() {
  maskData.fill(0); const R = PRESETS[preset].foodR || 6;
  for (let i = 0; i < WW * WH; i++) if (walls[i]) maskData[4 * i + 1] = walls[i] === 2 ? 128 : 255;
  for (const f of foods) for (let j = Math.floor(f.y - 3 * R); j <= f.y + 3 * R; j++) for (let i = Math.floor(f.x - 3 * R); i <= f.x + 3 * R; i++) {
    if (i < 0 || j < 0 || i >= WW || j >= WH) continue; const d = Math.hypot(i + .5 - f.x, j + .5 - f.y), c = 4 * (i + j * WW);
    if (d <= R) maskData[c] = 255; else maskData[c + 2] = Math.max(maskData[c + 2], 255 * Math.exp(-(d - R) / (R * 0.8)) | 0);
  }
  if (!ok) return; mask.upload(maskData);
  // the smell (coarse grid, normalised by its biggest value), and the food list for respawning
  const fs = foods.map(f => [f.x * SW / WW, f.y * SH / WH]), sm = smellField(fs, SW, SH, 0.12 * Math.hypot(SW, SH)), d = new Float32Array(4 * SW * SH);
  for (let i = 0; i < SW * SH; i++) d[4 * i] = sm[i];
  smellT.upload(d); const fd = new Float32Array(4 * 64); foods.slice(0, 64).forEach((f, i) => { fd[4 * i] = f.x; fd[4 * i + 1] = f.y; }); foodT.upload(fd);
}
// ---------------- Starting the agents ----------------
function restart() {
  steps = 0; for (const k in log) log[k] = []; last = null;
  if (!ok) return;
  const n = Math.round(P.agents * WW * WH); S = Math.ceil(Math.sqrt(n));
  if (agents) agents.dispose(); agents = K.gl.pingpong(gl, S, S, { float: true });
  const d = new Float32Array(4 * S * S), r = Math.random;
  for (let k = 0; k < S * S; k++) {
    if (k >= n) { d[4 * k + 3] = -1; continue; }
    let x, y, tries = 0;
    do { if (spawn === "food" && foods.length) { const f = foods[k % foods.length], a = r() * TAU, rr = 30 * Math.sqrt(r()); x = f.x + rr * Math.cos(a); y = f.y + rr * Math.sin(a); } else { x = r() * WW; y = r() * WH; } }
    while ((x < 0 || y < 0 || x >= WW || y >= WH || walls[(x | 0) + (y | 0) * WW]) && ++tries < 30);
    d[4 * k] = K.clamp(x, 0, WW - 1); d[4 * k + 1] = K.clamp(y, 0, WH - 1); d[4 * k + 2] = r() * TAU; d[4 * k + 3] = r() * 600;
  }
  agents.upload(d); trail.upload(null);
  const idx = new Float32Array(2 * S * S); for (let k = 0; k < S * S; k++) { idx[2 * k] = (k % S + .5) / S; idx[2 * k + 1] = (Math.floor(k / S) + .5) / S; }
  pts = K.gl.points(gl, { aPos: 2 }).set("aPos", idx, gl.STATIC_DRAW);
}
// bring the dead back, at the food, so the mould explores again
function regrow() {
  if (!ok || !foods.length) return; const d = agents.read.read(), r = Math.random, n = Math.round(P.agents * WW * WH);
  for (let k = 0; k < n; k++) if (d[4 * k + 3] < 0) { const f = foods[k % foods.length], a = r() * TAU, rr = 8 * Math.sqrt(r()); d[4 * k] = K.clamp(f.x + rr * Math.cos(a), 0, WW - 1); d[4 * k + 1] = K.clamp(f.y + rr * Math.sin(a), 0, WH - 1); d[4 * k + 2] = r() * TAU; d[4 * k + 3] = 0; }
  agents.upload(d); steps = 61;
}
function load(k) {
  preset = k; ctl.preset.set(k);
  const lf = (PRESETS[k].set || {}).life || DEF.life; P.life = lf; ctl.life.set(lf);   // a map can ask for its own setting
  foods = presetFoods(k); paintPreset(true); uploadMask(); restart();
}

// ---------------- One step on the graphics card ----------------
function gpuStep() {
  const lifeSteps = P.life ? 1.5 * P.life * Math.hypot(WW, WH) : 0;   // ×1.5: agents moving all at once jam more than on the CPU (see The model)
  // which cells hold an agent right now (for crowding)
  K.gl.bindTarget(gl, count); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); prDep.set({ uAgents: agents.read, uWorld: [WW, WH], uMode: 1 }); pts.draw(prDep, S * S); gl.disable(gl.BLEND);
  // sense, turn, move
  prU.set({ uAgents: agents.read, uTrail: trail.read, uMask: mask, uCount: count, uSmell: smellT, uFood: foodT, uWorld: [WW, WH], uSA: P.sa * DEG, uRA: P.ra * DEG, uSO: P.so, uJit: P.jitter * DEG,
    uSeed: Math.random() * 100, uSmellW: foods.length ? P.smell : 0, uLife: lifeSteps, uFoodN: Math.min(64, foods.length), uRespawn: Math.max(P.respawn || 0, 0.0004), uStep: steps, uCrowd: P.crowdGPU == null ? 0.3 : P.crowdGPU });
  quad.draw(prU, agents.write); agents.swap();
  // deposit
  K.gl.bindTarget(gl, trail.read); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); prDep.set({ uAgents: agents.read, uWorld: [WW, WH], uMode: 0, uDep: P.dep }); pts.draw(prDep, S * S); gl.disable(gl.BLEND);
  // spread and fade
  prDiff.set({ uTrail: trail.read, uMask: mask, uTexel: [1 / WW, 1 / WH], uKeep: 1 - P.decay, uDiff: P.diff, uFood: P.food }); quad.draw(prDiff, trail.write); trail.swap();
  steps++;
}

// ---------------- Measuring the live network (every couple of seconds) ----------------
let gain = 0.25;
function measureLive() {
  if (!ok) return; let T; try { T = trail.read.read(); } catch (e) { return; }
  const t = new Float32Array(BW * BH);   // a third of the resolution (each cell the strongest of 3 × 3, so thin tubes survive)
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) { let s = 0; for (let b = 0; b < 3; b++) for (let a = 0; a < 3; a++) s = Math.max(s, T[4 * ((3 * i + a) + (3 * j + b) * WW)]); t[i + j * BW] = s; }
  const sw = new Uint8Array(BW * BH); for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) sw[i + j * BW] = walls[3 * i + 1 + (3 * j + 1) * WW] ? 1 : 0;
  const R = Math.max(1.5, (PRESETS[preset].foodR || 6) / BSCALE);
  last = foods.length >= 2 ? measure(t, BW, BH, foods.map(f => [f.x / 3, f.y / 3]), R, sw, 0.12) : null;
  // automatic brightness: aim for the strongest trail to look bright but not burnt out
  const samp = []; for (let i = 0; i < T.length; i += 4 * 53) if (T[i] > 0) samp.push(T[i]); samp.sort((a, b) => a - b);
  if (samp.length) { const top = samp[Math.floor(samp.length * 0.97)]; gain += (K.clamp(1.6 / (top || 1), 0.01, 2) - gain) * 0.6; }
  let alive = 0; try { const A = agents.read.read(); for (let k = 3; k < A.length; k += 4) if (A[k] >= 0) alive++; } catch (e) { }
  const T0 = steps; log.alive.push([T0, alive / 1000]);
  if (last) { log.len.push([T0, last.len * 3]); log.mst.push([T0, last.mst * 3]); log.linked.push([T0, last.linked * 100]); }
  read.set("alive", Math.round(alive / 1000) + " thousand");
  read.set("len", last ? Math.round(last.len * 3).toLocaleString() : "–"); read.set("mst", last ? Math.round(last.mst * 3).toLocaleString() : "–"); read.set("ratio", last ? last.ratio.toFixed(2) + " ×" : "–");
  read.set("link", last ? (last.linked * 100).toFixed(0) + "%" : "–"); read.set("det", last && isFinite(last.detour) ? last.detour.toFixed(2) + " ×" : "–");
}

// ---------------- Mouse: food, walls, erasing ----------------
const fit = () => { const s = Math.min(cv.w / WW, cv.h / WH); return { s, ox: (cv.w - WW * s) / 2, oy: (cv.h - WH * s) / 2 }; };
const toWorld = p => { const f = fit(); return { x: (p.x - f.ox) / f.s, y: (p.y - f.oy) / f.s }; };
let drag = null, hover = null;
function brush(w, erase) { const B = 6; let ch = false;
  for (let j = Math.floor(w.y - B); j <= w.y + B; j++) for (let i = Math.floor(w.x - B); i <= w.x + B; i++) if (i >= 0 && j >= 0 && i < WW && j < WH && (i - w.x) ** 2 + (j - w.y) ** 2 <= B * B) { const v = erase ? 0 : 1; if (walls[i + j * WW] !== v) { walls[i + j * WW] = v; ch = true; } }
  if (erase) { const n = foods.length; foods = foods.filter(f => Math.hypot(f.x - w.x, f.y - w.y) > B + 4); if (foods.length !== n) ch = true; }
  if (ch) uploadMask(); }
K.pointer(cv.el, {
  down(p) { const w = toWorld(p), tool = ctl.tool.value;
    if (tool === "food") { const hit = foods.find(f => Math.hypot(f.x - w.x, f.y - w.y) < 14);
      if (p.e.button === 2) { if (hit) { foods = foods.filter(f => f !== hit); uploadMask(); } return; }
      if (hit) drag = { f: hit }; else if (w.x > 0 && w.y > 0 && w.x < WW && w.y < WH) { const f = { x: w.x, y: w.y }; foods.push(f); drag = { f }; uploadMask(); } }
    else { drag = { paint: true }; brush(w, tool === "erase"); } },
  drag(p) { const w = toWorld(p); hover = w; if (!drag) return; if (drag.f) { drag.f.x = K.clamp(w.x, 2, WW - 2); drag.f.y = K.clamp(w.y, 2, WH - 2); drag.moved = true; uploadMask(); } else brush(w, ctl.tool.value === "erase"); },
  up() { if (drag && drag.f) regrow(); drag = null; },
  hover(p) { hover = toWorld(p); }, leave() { hover = null; }
});

// ---------------- Drawing ----------------
function draw() {
  const f = fit(), c = cv.ctx; c.clearRect(0, 0, cv.w, cv.h);
  if (ok) {
    K.gl.bindTarget(gl, null); const d = view.dpr;
    prShow.set({ uTrail: trail.read, uMask: mask, uWorld: [WW, WH], uCanvas: [view.el.width, view.el.height], uOff: [f.ox * d, f.oy * d], uScale: f.s * d, uGain: gain, uPal: palette, uTime: performance.now() / 1000 });
    quad.draw(prShow);
  }
  const X = x => f.ox + x * f.s, Y = y => f.oy + y * f.s;
  if (showMST && foods.length > 1) { c.strokeStyle = "rgba(120,220,255,.85)"; c.lineWidth = 1.6; c.setLineDash([6, 5]); c.beginPath(); for (const [a, b] of mstEdges(foods.map(q => [q.x, q.y]))) { c.moveTo(X(foods[a].x), Y(foods[a].y)); c.lineTo(X(foods[b].x), Y(foods[b].y)); } c.stroke(); c.setLineDash([]); }
  if (showNames) { c.font = "600 11px Segoe UI,system-ui,sans-serif"; c.textAlign = "left"; c.textBaseline = "middle";
    for (const q of foods) if (q.name) { c.fillStyle = "rgba(0,0,0,.55)"; c.fillText(q.name, X(q.x) + 9, Y(q.y) + 1); c.fillStyle = "rgba(255,240,210,.92)"; c.fillText(q.name, X(q.x) + 8, Y(q.y)); } }
  if (hover && ctl.tool.value !== "food") { c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1; c.beginPath(); c.arc(X(hover.x), Y(hover.y), 6 * f.s, 0, TAU); c.stroke(); }
}
const chL = K.chart(ui.dock, { title: "Network length", xLabel: "steps", yLabel: "cells", yMin: 0 });
const chA = K.chart(ui.dock, { title: "Agents alive, and food joined", xLabel: "steps", yLabel: "thousand · %", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0, nextMeasure = 0;
load("tokyo");
ui.run(() => { if (ok) for (let k = 0; k < speed; k++) gpuStep(); }, () => {
  draw(); frame++;
  const now = performance.now();
  if (now > nextMeasure && (ui.playing || !last)) { nextMeasure = now + 2000; measureLive();
    chL.draw([{ pts: log.len, color: K.cssVar("--s1"), label: "slime mould network" }, { pts: log.mst, color: K.cssVar("--s0"), dash: [5, 4], label: "minimum spanning tree" }], { xMin: 0 });
    chA.draw([{ pts: log.alive, color: K.cssVar("--s2"), label: "agents alive (thousand)" }, { pts: log.linked, color: K.cssVar("--s3"), label: "pairs of food joined (%)" }], { xMin: 0 }); }
  ui.hud(`<b style="font-size:15px">${PRESETS[preset].name}</b><br>step ${steps.toLocaleString()}${last ? ` · network ${last.ratio.toFixed(2)} × the spanning tree` : ""}`);
});
window.slimeTest = { set(o) { Object.assign(P, o); }, run(n) { for (let k = 0; k < n; k++) gpuStep(); measureLive(); return last && { ratio: last.ratio, linked: last.linked, steps }; }, load };   // for automated tests
ui.tip("Every glowing vein is made by thousands of agents following each other's trail · click to add oat flakes, drag to move them", 8000);
}
