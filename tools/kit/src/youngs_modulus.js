/* =====================================================================
   MATERIALS SCIENCE (Young's modulus and solids under stress)
   Pull on a solid and it stretches. How it stretches, and how it breaks,
   depends on how its particles are arranged:
     * CRYSTALLINE (metals, ceramics): atoms in a regular lattice.
       Metals are DUCTILE because rows of atoms can SLIP past each other.
       Slip happens one row of bonds at a time, carried by a defect
       called an EDGE DISLOCATION (an extra half-plane of atoms).
       Anything that gets in a dislocation's way (foreign atoms, grain
       boundaries, other dislocations) makes the metal stronger.
     * AMORPHOUS (glass): atoms in a disordered network. No slip planes,
       so it is BRITTLE: a crack concentrates the stress at its tip and
       runs straight through.
     * POLYMERIC (rubber, polythene): long tangled chain molecules.
       They straighten out when stretched; cross-links pull them back.
   Six views, each model explained where it is written:
     0. Practical      Searle's method: measure the Young modulus of a wire
     1. Tensile test   stress–strain curves for real materials
     2. Atoms          a few hundred atoms, moved by the forces between them
     3. Grains         dislocations piling up at grain boundaries
     4. Brittle        a network of bonds that snap, one at a time
     5. Polymers       chain molecules and rubber's hysteresis loop
   Key equations:  stress σ = F ÷ A   strain ε = ΔL ÷ L   E = σ ÷ ε
                   work done = area under the force–extension graph
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// read a value off a table of [x, y] points by joining the dots with straight lines
function tab(t, x) { if (x <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return t[t.length - 1][1]; }

/* ---------------------------------------------------------------------
   1. TENSILE TEST: typical published behaviour of each material.
   Metals and polythene: the stress rises along a straight line of
   gradient E (elastic: the bonds stretch) until it reaches the stress
   needed for plastic flow. That stress depends on how much plastic
   strain there has already been (the "flow" table): work hardening makes
   it rise; after the ultimate tensile strength the sample necks, so the
   force it can take falls. Letting go, it springs back along a line of
   gradient E and stays permanently longer.
   E in MPa (1 GPa = 1000 MPa); flow: [plastic strain, stress in MPa].
   --------------------------------------------------------------------- */
const MATS = {
  steel: { name: "mild steel", kind: "metal", cls: "crystalline: a polycrystalline metal", E: 200e3, eref: 0.0013, col: "#9fb3c8",
    flow: [[0, 285], [0.0002, 285], [0.0004, 250], [0.02, 252], [0.04, 300], [0.08, 355], [0.13, 395], [0.2, 415], [0.25, 400], [0.29, 360], [0.31, 330]], epU: 0.2, epF: 0.31 },
  copper: { name: "annealed copper", kind: "metal", cls: "crystalline: a polycrystalline metal", E: 117e3, eref: 0.0006, col: "#d9895a",
    flow: [[0, 60], [0.002, 75], [0.05, 130], [0.15, 185], [0.3, 215], [0.36, 218], [0.42, 195], [0.47, 160]], epU: 0.36, epF: 0.47 },
  alu: { name: "aluminium alloy", kind: "metal", cls: "crystalline: a polycrystalline alloy", E: 69e3, eref: 0.0035, col: "#cfd6de",
    flow: [[0, 240], [0.002, 270], [0.02, 288], [0.07, 308], [0.09, 310], [0.11, 295], [0.13, 270]], epU: 0.09, epF: 0.13 },
  castiron: { name: "cast iron", kind: "brittle", cls: "crystalline, but full of graphite flakes that act as cracks", E: 110e3, eref: 0.002, sf: 200, scatter: 0.08, col: "#7d8794", curve: e => 110e3 * e * (1 - e / 0.008) },
  glass: { name: "glass", kind: "brittle", cls: "amorphous: a disordered network of atoms", E: 70e3, eref: 0.0007, sf: 50, scatter: 0.3, col: "#9fe0e6", curve: e => 70e3 * e },
  ceramic: { name: "alumina ceramic", kind: "brittle", cls: "crystalline: ionic and covalent bonds", E: 370e3, eref: 0.0008, sf: 300, scatter: 0.15, col: "#efe6d2", curve: e => 370e3 * e },
  bone: { name: "bone", kind: "metal", cls: "composite: collagen fibres stiffened by mineral crystals", E: 18e3, eref: 0.006, col: "#efe3c2",
    flow: [[0, 110], [0.004, 122], [0.01, 130], [0.014, 132], [0.018, 126], [0.02, 120]], epU: 0.014, epF: 0.02 },
  rubber: { name: "rubber", kind: "rubber", cls: "polymer: tangled chains, lightly cross-linked", E: 0.9, eref: 0.4, col: "#e05a6a" },
  poly: { name: "polythene", kind: "metal", cls: "polymer: long chains, no cross-links", E: 800, eref: 0.01, col: "#e8e2b0",
    flow: [[0, 8], [0.02, 20], [0.05, 25], [0.08, 24], [0.15, 18], [0.5, 17.5], [3, 18.5], [4, 24], [5, 32]], epU: 0.05, epF: 5, draws: true }
};
const MKEYS = Object.keys(MATS);
const flow = (M, ep) => tab(M.flow, ep);
// plastic strain needed so that the elastic stress E(ε − εp) equals the flow stress (march forward, then halve the gap)
function epSolve(M, e, ep) {
  if (M.E * (e - ep) <= flow(M, ep)) return ep;
  let lo = ep, step = 1e-6;
  while (M.E * (e - lo) > flow(M, lo) && lo < e) { lo += step; step *= 1.4; }
  let a = Math.max(ep, lo - step / 1.4), b = Math.min(lo, e);
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (M.E * (e - m) > flow(M, m)) a = m; else b = m; }
  return b;
}
/* Rubber. Stress (MPa) at strain e on the way up: σ = G(λ − 1/λ²) (the tangled chains resist
   being straightened), divided by a "locking" term that shoots up as the chains between
   cross-links run out of slack. n = cross-link density (relative): more cross-links, stiffer,
   and the chains lock sooner. On the way down the stress is lower (hysteresis): some of the
   work done stretching it is turned into heat by the chains rubbing past each other. */
function rubberUp(e, n = 1) { const lam = 1 + e, G = 0.3 * n, lm = 1 + 6 / Math.sqrt(n), x = Math.min(0.97, (lam - 1) / (lm - 1)); return G * (lam - 1 / (lam * lam)) / Math.pow(1 - x * x, 1.5); }
const rubberBreak = (n = 1) => 0.92 * 6 / Math.sqrt(n);
function rubberDown(e, emax, n = 1, H = 0.5) { const f = emax > 0 ? e / emax : 0; return rubberUp(e, n) * (1 - H * (1 - f * f)); }
// energy per unit volume (MJ per m³ = area under the stress–strain curve in MPa) lost in one stretch and release to emax
function rubberLoss(emax, n = 1) { let s = 0; const N = 400; for (let i = 0; i < N; i++) { const e = (i + 0.5) * emax / N; s += (rubberUp(e, n) - rubberDown(e, emax, n)) * emax / N; } return s; }
// toughness: area under the stress–strain curve all the way to fracture (MJ per m³)
function toughness(key, r) {
  const M = MATS[key]; let s = 0, e = 0, ep = 0;
  if (M.kind === "brittle") { const sf = M.sf * (1 + M.scatter * r.gauss() * 0.5); const de = M.eref / 400; while (M.curve(e) < sf && e < 0.05) { s += M.curve(e + de / 2) * de; e += de; } return s; }
  if (M.kind === "rubber") { const ef = rubberBreak() * (1 + 0.05 * r.gauss()), de = ef / 600; while (e < ef) { s += rubberUp(e + de / 2) * de; e += de; } return s; }
  const epF = M.epF * (1 + 0.08 * r.gauss()), de = M.eref / 50; let sig = 0;
  while (ep < epF && e < 10) { const step = de * (e > 5 * M.eref ? 20 : 1); e += step; ep = epSolve(M, e, ep); const ns = M.E * (e - ep); s += (sig + ns) / 2 * step; sig = ns; }
  return s;
}
/* Searle's method (the specified practical): hang slotted masses on a long thin wire, read the
   extension on a vernier scale each time, measure the diameter with a micrometer. Gradient of
   extension against load = L ÷ (AE), so E = L ÷ (A × gradient).
   Under a fixed load the wire stretches until the stress it can carry equals the load's stress. */
function strainAtStress(M, sig, ep) {
  if (M.kind !== "metal") return { e: sig / M.E, ep, broken: false };
  let p = ep; while (flow(M, p) < sig && p < M.epF) p += Math.max(1e-6, p * 0.02);           // flows plastically until work hardening can carry the load
  return { e: p + sig / M.E, ep: p, broken: p >= M.epF };
}
// one student's Searle's experiment: 8 loads up to half the elastic limit; returns E measured (GPa)
function searleE(o, r) {
  const M = MATS[o.mat], A = Math.PI * (o.D / 2) ** 2, Fmax = 0.5 * flow(M, 0) * A, pts = [];
  for (let i = 0; i <= 8; i++) { const F = Fmax * i / 8; pts.push([F, F / A / M.E * o.L * 1000 + o.errE * r.gauss()]); }   // extension in mm, read on the vernier
  const g = K.linfit(pts).m, d = o.D + o.errD * r.gauss(), Am = Math.PI * d * d / 4;          // gradient (mm per N); diameter from one micrometer reading
  return o.L * 1000 / (Am * g) / 1000;
}
// strain at which a brittle sample breaks (its curve reaches the breaking stress)
function brittleEf(M, sf) { let e = 0; const de = M.eref / 200; while (M.curve(e) < sf && e < 0.05) e += de; return e;
}

/* ---------------------------------------------------------------------
   2. ATOMS (molecular dynamics). Each atom feels a force from each
   neighbour: repulsive if they are too close, attractive if a little
   too far apart (the Lennard-Jones force, in "model units"). Newton's
   second law moves every atom a tiny step at a time. A little random
   jiggling stands for temperature; a little friction keeps it cool.
   The bottom two rows are held still; the top two rows are slid
   sideways a little each step (a shear). The shear stress is the
   sideways force needed to hold the top rows, per unit width.
   For an EDGE DISLOCATION the top half of the block is built with one
   more atom in each row than the bottom half: one extra half-plane.
   --------------------------------------------------------------------- */
const RC = 1.6;                                                             // forces are ignored beyond 1.6 atom diameters
function ljF(r2) { const i2 = 1 / r2, i6 = i2 * i2 * i2; return 24 * i6 * (2 * i6 - 1) * i2; }
const LJ_FC = ljF(RC * RC) * RC;
const pairF = r2 => ljF(r2) - LJ_FC / Math.sqrt(r2);                        // force ÷ distance, shifted to fall smoothly to zero at the cut-off
const A0 = (() => { let a = 1.12; for (let k = 0; k < 100; k++) a += pairF(a * a) * a * 0.01; return a; })();   // natural spacing of the atoms
const ROWH = A0 * Math.sqrt(3) / 2;                                         // spacing of the rows (close-packed: each atom has 6 neighbours)
function mdMake(o, r) {
  const nx = o.nx, ny = o.ny, W = nx * A0, list = [];
  for (let j = 0; j < ny; j++) { const n = o.disloc && j >= ny / 2 ? nx + 1 : nx, sp = W / n; for (let i = 0; i < n; i++) list.push([(i + 0.5 + (j % 2 ? 0.25 : -0.25)) * sp, j * ROWH, j, i]); }
  const N = list.length, F = () => new Float64Array(N);
  const S = { N, nx, ny, W, disloc: o.disloc, nsol: 0, x: F(), y: F(), vx: F(), vy: F(), fx: F(), fy: F(), s: F().fill(1), g: new Uint8Array(N), row: new Int16Array(N), col: new Int16Array(N), coord: new Uint8Array(N), pairs: new Int32Array(N * 20), np: 0, n: 0, shift: 0, tau: 0, tauAvg: 0 };
  list.forEach((p, k) => { S.x[k] = p[0]; S.y[k] = p[1]; S.row[k] = p[2]; S.col[k] = p[3]; S.g[k] = p[2] < 2 ? 1 : p[2] >= ny - 2 ? 2 : 0; });
  // foreign atoms: larger atoms just above and below the slip plane, in the dislocation's path
  for (let tries = 0; S.nsol < (o.sol || 0) && tries < 2000; tries++) {
    const k = Math.floor(r() * N), j = S.row[k];
    if ((j === ny / 2 || j === ny / 2 - 1) && S.x[k] > W * 0.58 && S.x[k] < W * 0.9 && S.s[k] === 1) {
      let near = false; for (let q = 0; q < N; q++) if (S.s[q] !== 1 && Math.abs(S.x[q] - S.x[k]) < 2.5 * A0) near = true;
      if (!near) { S.s[k] = 1.25; S.nsol++; }
    }
  }
  mdPairs(S); for (let k = 0; k < (o.relax || 2500); k++) mdStep(S, 0, k < 500 ? 8 : 2, 0.0005, r);
  return S;
}
// list every pair of atoms close enough to matter, using a grid of cells so each atom only checks its neighbours
function mdPairs(S) {
  const cs = 2.3, gx = Math.ceil((S.W + 12) / cs), gy = Math.ceil((S.ny * ROWH + 12) / cs), head = new Int32Array(gx * gy).fill(-1), next = new Int32Array(S.N);
  const cell = k => Math.min(gy - 1, Math.max(0, Math.floor((S.y[k] + 6) / cs))) * gx + Math.min(gx - 1, Math.max(0, Math.floor((S.x[k] + 6) / cs)));
  for (let k = 0; k < S.N; k++) { const c = cell(k); next[k] = head[c]; head[c] = k; }
  let np = 0;
  for (let k = 0; k < S.N; k++) {
    const cx = Math.min(gx - 1, Math.max(0, Math.floor((S.x[k] + 6) / cs))), cy = Math.min(gy - 1, Math.max(0, Math.floor((S.y[k] + 6) / cs)));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= gx || Y >= gy) continue;
      for (let j = head[Y * gx + X]; j >= 0; j = next[j]) if (j > k) { const ex = S.x[j] - S.x[k], ey = S.y[j] - S.y[k]; if (ex * ex + ey * ey < cs * cs) { if (np + 2 > S.pairs.length) { const b = new Int32Array(S.pairs.length * 2); b.set(S.pairs); S.pairs = b; } S.pairs[np++] = k; S.pairs[np++] = j; } }
    }
  }
  S.np = np;
}
// one time step (velocity Verlet). rate = how far the top rows slide this step. gam = friction, T = temperature
function mdStep(S, rate, gam, T, r) {
  const dt = 0.01, h = dt / 2, { x, y, vx, vy, fx, fy, g, s } = S;
  for (let k = 0; k < S.N; k++) { if (g[k]) { if (g[k] === 2) x[k] += rate; continue; } vx[k] += fx[k] * h; vy[k] += fy[k] * h; x[k] += vx[k] * dt; y[k] += vy[k] * dt; }
  S.shift += rate; if (S.n++ % 8 === 0) mdPairs(S);
  fx.fill(0); fy.fill(0); const P = S.pairs;
  for (let p = 0; p < S.np; p += 2) {
    const a = P[p], b = P[p + 1], dx = x[b] - x[a], dy = y[b] - y[a], r2 = dx * dx + dy * dy, sz = (s[a] + s[b]) / 2;
    if (r2 >= RC * RC * sz * sz) continue;
    const f = sz === 1 ? pairF(r2) : pairF(r2 / (sz * sz)) / (sz * sz);
    fx[a] -= f * dx; fy[a] -= f * dy; fx[b] += f * dx; fy[b] += f * dy;
  }
  let Fg = 0; const c = Math.exp(-gam * dt), sd = Math.sqrt(T * (1 - c * c));
  for (let k = 0; k < S.N; k++) { if (g[k]) { if (g[k] === 2) Fg += fx[k]; continue; } vx[k] = (vx[k] + fx[k] * h) * c + sd * r.gauss(); vy[k] = (vy[k] + fy[k] * h) * c + sd * r.gauss(); }
  S.tau = -Fg / S.W; S.tauAvg += (S.tau - S.tauAvg) * 0.02;
}
// count each atom's close neighbours: 6 in a perfect lattice, 5 or 7 at the core of a dislocation
function mdCoord(S) {
  S.coord.fill(0); const P = S.pairs;
  for (let p = 0; p < S.np; p += 2) { const a = P[p], b = P[p + 1], dx = S.x[b] - S.x[a], dy = S.y[b] - S.y[a], lim = 1.3 * A0 * (S.s[a] + S.s[b]) / 2; if (dx * dx + dy * dy < lim * lim) { S.coord[a]++; S.coord[b]++; } }
}
// where is the dislocation core? the average position of 5- and 7-neighbour atoms near the slip plane (null if none)
function mdCore(S) {
  const j0 = S.ny / 2; let sx = 0, n = 0;
  const rowMin = {}, rowMax = {};
  for (let k = 0; k < S.N; k++) { const j = S.row[k]; rowMin[j] = Math.min(rowMin[j] ?? 1e9, S.x[k]); rowMax[j] = Math.max(rowMax[j] ?? -1e9, S.x[k]); }
  for (let k = 0; k < S.N; k++) {
    const j = S.row[k], c = S.coord[k]; if (j < j0 - 2 || j > j0 + 1 || S.s[k] !== 1 || (c !== 5 && c !== 7)) continue;
    if (S.x[k] < rowMin[j] + 0.8 * A0 || S.x[k] > rowMax[j] - 0.8 * A0) continue;
    let nearSol = false; for (let q = 0; q < S.N && S.nsol; q++) if (S.s[q] !== 1 && Math.hypot(S.x[q] - S.x[k], S.y[q] - S.y[k]) < 1.6 * A0) { nearSol = true; break; }
    if (!nearSol) { sx += S.x[k]; n++; }
  }
  return n ? sx / n : null;
}
// the shear stress needed to make a block slip (batch run). kind 1: perfect, 2: one dislocation, 3: dislocation + foreign atoms
function mdSlipStress(kind, r) {
  const S = mdMake({ nx: 26, ny: 14, disloc: kind > 1, sol: kind === 3 ? 4 : 0, relax: 1200 }, r);
  let tmax = 0, seen = false;
  for (let k = 0; k < 14000; k++) {
    mdStep(S, 0.0004, 1, 0.002, r); if (S.tauAvg > tmax) tmax = S.tauAvg;
    if (k % 50) continue;
    if (kind > 1) { mdCoord(S); const c = mdCore(S); if (c != null) seen = true; if (seen && (c == null || c > S.W - 2.5)) return tmax; }
    else if (tmax > 0.4 && S.tauAvg < 0.6 * tmax) return tmax;
  }
  return tmax;
}

/* ---------------------------------------------------------------------
   3. GRAINS: a cross-section of a metal, about 240 μm × 150 μm.
   Each grain is a crystal with its own direction of slip planes. A
   dislocation SOURCE in the middle of each grain sends out pairs of
   dislocations along the slip plane when the shear stress on it is big
   enough. They glide until they hit a GRAIN BOUNDARY, where the next
   grain's planes point a different way, so they stop and PILE UP.
   Dislocations repel each other, so a pile-up pushes back on the source.
   A pile-up of n dislocations multiplies the stress at its head about
   n times; when that reaches a critical value, slip breaks through the
   boundary and the metal YIELDS. Bigger grains hold longer pile-ups,
   so they break through at a lower applied stress: smaller grains,
   stronger metal (the Hall–Petch effect).
   Foreign atoms add friction that every moving dislocation must beat.
   Each ⊥ symbol stands for a group of w real dislocations.
   --------------------------------------------------------------------- */
const DD = { WX: 240, WY: 150, E: 200e3, D0: 4.5, TC: 5000, CP: 0.0008 };
function ddMake(d, sol, r) {
  const nx = Math.max(1, Math.round(DD.WX / d)), ny = Math.max(1, Math.round(DD.WY / (d * 0.87))), seeds = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) seeds.push([(i + 0.5 + (j % 2 ? 0.25 : -0.25) + 0.5 * (r() - 0.5)) * DD.WX / nx, (j + 0.5 + 0.5 * (r() - 0.5)) * DD.WY / ny]);
  const G = seeds.map((s, i) => {
    const phi = (r() - 0.5) * Math.PI, u = [Math.sin(phi), Math.cos(phi)];          // slip direction, at angle φ to the pulling direction (vertical)
    let lo = -1e9, hi = 1e9;
    // the slip line through the grain's centre ends where it meets the boundary with each neighbour (or the edge of the picture)
    seeds.forEach((q, j) => { if (j === i) return; const D = [s[0] - q[0], s[1] - q[1]], dd = D[0] * D[0] + D[1] * D[1], ud = u[0] * D[0] + u[1] * D[1]; if (ud > 0) lo = Math.max(lo, -dd / (2 * ud)); else if (ud < 0) hi = Math.min(hi, dd / (-2 * ud)); });
    for (const [k, W] of [[0, DD.WX], [1, DD.WY]]) { if (u[k] > 1e-9) { hi = Math.min(hi, (W - s[k]) / u[k]); lo = Math.max(lo, -s[k] / u[k]); } else if (u[k] < -1e-9) { hi = Math.min(hi, -s[k] / u[k]); lo = Math.max(lo, (W - s[k]) / u[k]); } }
    return { s, phi, u, m: Math.abs(Math.sin(2 * phi)) / 2, lo, hi, dis: [], through: 0 };   // m = Schmid factor: the fraction of the pull that shears the slip plane
  });
  return { G, d, sol, w: 2.8 * Math.sqrt(d), eps: 0, ep: 0, sig: 0, tf0: 20 + 30 * Math.sqrt(sol), tsrc: 15, through: 0, flashes: [], sy: null, path: [[0, 0]] };
}
function ddStep(S, dt, rate) {
  S.eps += rate * dt; S.sig = DD.E * (S.eps - S.ep);
  const Dw = DD.D0 * S.w, A = DD.WX * DD.WY;
  const tf = S.tf0 + 1.2 * Math.sqrt(S.through * S.w / A * 1000);           // friction: lattice + foreign atoms + tangles of stored dislocations (work hardening)
  for (const g of S.G) {
    const tau = g.m * S.sig, ds = g.dis;
    // the source fires if the shear stress on it, minus the back-stress from the pile-ups, beats its threshold
    let Fsrc = tau; for (const q of ds) Fsrc += q.s * Dw / (0 - q.t);
    if (Fsrc > S.tsrc + tf && ds.length < 40) { const del = 0.08 * S.d; ds.push({ t: del, s: 1 }, { t: -del, s: -1 }); }
    // force on each dislocation: applied shear plus the push or pull of every other one on the same plane (∝ 1 ÷ distance)
    const F = ds.map((q, k) => { let f = q.s * tau; for (let j = 0; j < ds.length; j++) if (j !== k) { const dx = q.t - ds[j].t; f += q.s * ds[j].s * Dw / (Math.abs(dx) < 0.01 * S.d ? Math.sign(dx || 1) * 0.01 * S.d : dx); } return f; });
    const M = 2 * S.d, maxStep = 0.02 * S.d;
    for (let k = 0; k < ds.length; k++) {
      const q = ds[k], f = F[k]; q.hot = 0; if (Math.abs(f) <= tf) continue;
      let v = Math.max(-maxStep, Math.min(maxStep, M * (Math.abs(f) - tf) * Math.sign(f) * dt)), nt = q.t + v;
      // at a boundary it stops, unless the pile-up behind it pushes hard enough to break through
      for (const [end, dir] of [[g.hi, 1], [g.lo, -1]]) if ((dir > 0 && nt >= end) || (dir < 0 && nt <= end)) {
        q.hot = dir * f * S.w / DD.TC;
        if (dir * f * S.w >= DD.TC) { q.gone = true; g.through++; S.through++; S.flashes.push({ x: g.s[0] + end * g.u[0], y: g.s[1] + end * g.u[1], t: 1 }); }
        nt = end - dir * 1e-6;
      }
      S.ep += g.m * DD.CP * S.w * q.s * (nt - q.t) / A; q.t = nt;
    }
    g.dis = ds.filter(q => !q.gone);
  }
  if (S.sy == null && S.ep > 0.002) S.sy = S.sig;                              // 0.2% proof stress: the usual definition of the yield stress
}
function ddYield(d, sol, r) { const S = ddMake(d, sol, r); while (S.sy == null && S.eps < 0.01) for (let k = 0; k < 5; k++) ddStep(S, 0.01, 0.0005); return S.sy ?? S.sig; }

/* ---------------------------------------------------------------------
   4. BRITTLE FRACTURE: atoms joined by bonds that act like springs and
   SNAP when stretched more than about 10%. Nothing can slip, so there is
   no plastic flow. A notch (a crack) at the top surface means the bonds
   just ahead of its tip carry far more than their share of the load
   (stress concentration). When the tip bond snaps, the next one takes
   even more load and snaps too: the crack runs across the sample.
   AMORPHOUS: the atoms are placed at random (glass), joined to their
   nearest neighbours. TOUGHENED: the top and bottom surface layers are
   built squashed (in compression) and the middle stretched, like
   toughened glass; a surface crack cannot open until the pull has first
   cancelled that compression.
   Spring stiffness is scaled so the Young modulus is about 70 GPa (glass).
   --------------------------------------------------------------------- */
const FR_SC = 70 / (2 / Math.sqrt(3));                                      // GPa per model unit of stress
function delaunay(P) {
  // Bowyer–Watson: add points one by one, re-joining the triangles whose circumcircle contains the new point
  const n = P.length, pts = P.concat([[-1e4, -1e4], [1e4, -1e4], [0, 1e4]]);
  const circ = (a, b, c) => { const [ax, ay] = pts[a], [bx, by] = pts[b], [cx, cy] = pts[c], d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)), ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d; return [a, b, c, ux, uy, (ax - ux) ** 2 + (ay - uy) ** 2]; };
  let tris = [circ(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i], bad = [], keep = [];
    for (const t of tris) ((px - t[3]) ** 2 + (py - t[4]) ** 2 < t[5] ? bad : keep).push(t);
    const edges = new Map();
    for (const t of bad) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const k = a < b ? a + "," + b : b + "," + a; edges.set(k, edges.has(k) ? null : [a, b]); }
    tris = keep; for (const e of edges.values()) if (e) tris.push(circ(e[0], e[1], i));
  }
  const E = new Set(); for (const t of tris) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) if (a < n && b < n) E.add(a < b ? a + "," + b : b + "," + a);
  return [...E].map(k => k.split(",").map(Number));
}
function frMake(o, r) {
  const nx = o.nx, ny = o.ny, h = Math.sqrt(3) / 2, H = (ny - 1) * h, Wx = nx - 0.5, pts = [];
  if (!o.amorph) { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push([i + (j % 2 ? 0.5 : 0), j * h]); }
  else {
    // random points no closer than 0.9 apart (glass has no pattern), with a column at each end for the grips
    for (let y = 0; y <= H + 1e-6; y += h) { pts.push([0, y]); pts.push([Wx, y]); }
    const gw = Math.ceil(Wx) + 2, cellOf = p => Math.floor(p[1] + 1) * gw + Math.floor(p[0] + 1), cells = new Map();
    const ok = p => { const c = cellOf(p); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const q of cells.get(c + dy * gw + dx) || []) if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < 0.81) return false; return true; };
    const add = p => { pts.push(p); const c = cellOf(p); (cells.get(c) || cells.set(c, []).get(c)).push(p); };
    const edge = pts.splice(0); edge.forEach(add);
    for (let tries = 0; tries < nx * ny * 40; tries++) { const p = [0.8 + r() * (Wx - 1.6), r() * H]; if (ok(p)) add(p); }
  }
  const N = pts.length, F = () => new Float64Array(N);
  const S = { N, nx, ny, H, Wx, x: F(), y: F(), x0: F(), vx: F(), vy: F(), fx: F(), fy: F(), g: new Uint8Array(N), ext: 0, F0: 0, sig: 0, broke: 0, path: [[0, 0]], max: 0, amorph: !!o.amorph, pre: o.pre || 0, notch: o.notch };
  pts.forEach((p, k) => { S.x[k] = S.x0[k] = p[0]; S.y[k] = p[1]; S.g[k] = p[0] < 0.3 ? 1 : p[0] > Wx - 0.3 ? 2 : 0; });
  let pairs = [];
  if (!o.amorph) { const id = (i, j) => j * nx + i; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const nb = [[i + 1, j]].concat(j % 2 ? [[i, j + 1], [i + 1, j + 1]] : [[i - 1, j + 1], [i, j + 1]]); for (const [a, b] of nb) if (a >= 0 && a < nx && b < ny) pairs.push([id(i, j), id(a, b)]); } }
  else pairs = delaunay(pts).filter(([a, b]) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) < 1.75);
  const xm = Wx / 2 - 0.25, ytop = H - (o.notch || 0) * h - 0.01, band = 2.6 * h;
  const nSurf = pairs.filter(([a, b]) => Math.max(pts[a][1], pts[b][1]) < band || Math.min(pts[a][1], pts[b][1]) > H - band).length, nIn = pairs.length - nSurf;
  const A = [], B = [], L = [], EB = [];
  for (const [a, b] of pairs) {
    const p = pts[a], q = pts[b];
    if (o.notch > 0 && (p[0] - xm) * (q[0] - xm) < 0 && Math.min(p[1], q[1]) >= ytop) continue;   // the notch: bonds cut at the top surface
    const l0 = Math.hypot(q[0] - p[0], q[1] - p[1]), c2 = ((q[0] - p[0]) / l0) ** 2, surf = Math.max(p[1], q[1]) < band || Math.min(p[1], q[1]) > H - band;
    A.push(a); B.push(b); L.push(l0 * (1 + (o.pre ? (surf ? o.pre : -o.pre * nSurf / nIn) * c2 : 0))); EB.push(0.1 * (1 + 0.06 * (2 * r() - 1)));   // each bond's breaking strain, with a little scatter
  }
  S.nb = A.length; S.a = Int32Array.from(A); S.b = Int32Array.from(B); S.L = Float64Array.from(L); S.eb = Float64Array.from(EB); S.broken = new Uint8Array(S.nb); S.e = new Float64Array(S.nb);
  frRelax(S, 400); S.F0 = frForce(S);
  return S;
}
// let the atoms settle: each moves a little in the direction of the net force on it, with damping
function frRelax(S, iters) {
  const { x, y, vx, vy, fx, fy, g, a, b, L, broken, e } = S;
  for (let k = 0; k < S.N; k++) if (g[k] === 2) x[k] = S.x0[k] + S.ext;
  for (let it = 0; it < iters; it++) {
    fx.fill(0); fy.fill(0);
    for (let i = 0; i < S.nb; i++) { if (broken[i]) continue; const p = a[i], q = b[i], dx = x[q] - x[p], dy = y[q] - y[p], l = Math.sqrt(dx * dx + dy * dy), st = (l - L[i]) / L[i], f = st * L[i] / l; e[i] = st; fx[p] += f * dx; fy[p] += f * dy; fx[q] -= f * dx; fy[q] -= f * dy; }
    for (let k = 0; k < S.N; k++) { if (g[k]) continue; vx[k] = (vx[k] + fx[k] * 0.25) * 0.88; vy[k] = (vy[k] + fy[k] * 0.25) * 0.88; x[k] += vx[k] * 0.5; y[k] += vy[k] * 0.5; }
  }
}
function frForce(S) { let F = 0; for (let i = 0; i < S.nb; i++) { if (S.broken[i]) continue; const p = S.a[i], q = S.b[i]; if (S.g[p] !== 2 && S.g[q] !== 2) continue; const dx = S.x[q] - S.x[p], dy = S.y[q] - S.y[p], l = Math.hypot(dx, dy), f = (l - S.L[i]) / l; F += (S.g[q] === 2 ? 1 : -1) * f * dx; } return F; }
// snap the most over-stretched bond (if any is past its limit), let the rest settle, repeat
function frBreak(S, maxBreaks, settle) {
  let n = 0;
  for (; n < maxBreaks; n++) { let worst = -1, ws = 1; for (let i = 0; i < S.nb; i++) if (!S.broken[i] && S.e[i] / S.eb[i] > ws) { ws = S.e[i] / S.eb[i]; worst = i; } if (worst < 0) break; S.broken[worst] = 1; S.broke++; frRelax(S, settle); }
  return n;
}
const frStress = S => (frForce(S) - S.F0) / S.H * FR_SC;                    // GPa
function frBreakStress(notch, r, o = {}) {
  const S = frMake({ nx: 34, ny: 20, notch, amorph: o.amorph, pre: o.pre }, r); let mx = 0;
  for (let k = 0; k < 200; k++) { S.ext += 0.03; frRelax(S, 45); frBreak(S, 300, 15); const s = frStress(S); if (s > mx) mx = s; if (s < 0.3 * mx) break; }
  return mx;
}
// scatter in the strength of glass: each rod has many surface scratches; it breaks at its deepest one (Griffith: σ = K ÷ √(πa))
function glassStrength(r, toughened) { let amax = 0; const n = 20 + Math.floor(r() * 20); for (let i = 0; i < n; i++) amax = Math.max(amax, -12e-6 * Math.log(1 - r())); return 0.75 / (1.12 * Math.sqrt(Math.PI * amax)) + (toughened ? 100 : 0); }

// ---------------- The page ----------------
const P = { mode: "tensile", mat: "steel", smat: "steel", sD: 0.35, sL: 2, D: 0.5, Lw: 1.5, zoom: false, disloc: true, sol: 0, bonds: true, planes: true, mds: 1, d: 40, dsol: 0, amorph: false, notch: 4, tough: false, pmat: "rubber", xl: 1, cycle: false };
let rnd = K.rng(Date.now() % 99991 + 17), speed = 1;
const ui = K.app({
  title: "Materials Science", subject: "Physics",
  blurb: "Young's modulus and Searle's method, then ductile, brittle and polymer solids: from stress–strain curves down to dislocations, grain boundaries and cracks",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (A level)", adv: "Advanced (stretch)", specs: { std: "WJEC Eduqas A level Physics Component 1, Topic 1.5 Solids under stress: Hooke's law, stress, strain and the Young modulus; work done = area under a force–extension graph (½Fx, ½kx²); crystalline, amorphous and polymeric solids; stress–strain curves for ductile metals, brittle materials and rubber; dislocations, foreign atoms and grain boundaries; necking and ductile fracture; crack propagation and brittle fracture; rubber and hysteresis; the specified practical to find the Young modulus of a wire. The Practical and Tensile test views also cover Pearson Edexcel International GCSE Physics (4PH1) 1(c): force–extension of springs, wires and rubber bands, Hooke's law and elastic behaviour.", adv: "Beyond the spec, for stretch: the Hall–Petch equation σy = σ0 + k ÷ √d, Griffith's crack equation σf ∝ 1 ÷ √a, stress concentration at a crack tip, the Schmid factor, and the theoretical strength of a perfect crystal." } },
  missions: [
    { title: "Searle's method", q: "Measure the diameter of the steel wire in five places with the micrometer. Then add the masses one at a time, up to 2.5 kg. Use the gradient of extension against load to work out E. How close is it to 200 GPa?", hint: "Gradient = ΔL ÷ F = L ÷ (AE), so E = L ÷ (A × gradient), with L in mm and A in mm² to give E in N/mm² (MPa). Average several diameter readings: A = πd²/4, so a 1% error in d becomes a 2% error in E. The reference wire beside the test wire cancels out sagging of the support and changes in temperature.", setup() { set({ mode: "practical" }); } },
    { title: "Stay below the elastic limit", q: "Repeat the practical with a copper wire. Add masses up to 2.5 kg, then take them off. What happens to the graph, and does the wire return to its original length?", hint: "Copper's elastic limit is only about 60 MPa, about 0.6 kg on this wire. Beyond it the points curve upwards (plastic stretching), and on unloading the wire stays longer. Only the straight part gives E, so in the practical you keep the load well below the elastic limit.", setup() { set({ mode: "practical", smat: "copper" }); } },
    { title: "Hooke's law and the Young modulus", q: "Pull the mild steel wire a little way (stop before it yields). Read the stress and strain, and work out E = σ ÷ ε. Is it the same for a thinner or longer wire?", hint: "On the straight part, stress ÷ strain = 200 GPa for steel whatever the wire's size: E is a property of the material. The spring constant k = F ÷ x does depend on the size: k = EA ÷ L, so a thicker or shorter wire is stiffer.", setup() { set({ mode: "tensile", mat: "steel", zoom: true }); T.stopAt = 0.001; pull(1); } },
    { title: "Reading a ductile metal's curve", q: "Pull mild steel to breaking point. Find the elastic limit (yield point), the plastic region, the ultimate tensile strength and the fracture point. What happens to the wire after the UTS?", hint: "Straight line to about 285 MPa (elastic: it would return to its original length). Then it yields: plastic flow at almost constant stress, then work hardening up to the UTS (about 415 MPa). After the UTS one part gets thinner (a neck), so the force it can carry falls; it breaks at the neck in a ductile 'cup and cone' fracture.", setup() { set({ mode: "tensile", mat: "steel" }); pull(1); } },
    { title: "Permanent stretch and work hardening", q: "Pull annealed copper to about 10% strain, then Release. Is the wire longer than at the start? Now pull again: where does it start to yield this time?", hint: "Unloading follows a straight line of gradient E, not the loading curve, so it keeps a permanent (plastic) strain of nearly 10%. Reloaded, it stays elastic up to the stress it had reached before: work hardening has raised its elastic limit. The dislocations have tangled and block each other.", setup() { set({ mode: "tensile", mat: "copper" }); T.stopAt = 0.1; pull(1); } },
    { title: "Tough or brittle?", q: "Break glass, then copper. Compare the strain at fracture and the area under each graph (work done per m³). Which is stronger? Which is tougher?", hint: "Glass obeys Hooke's law almost to fracture and breaks at a tiny strain (under 0.1%): very little area, so very little energy absorbed. It is brittle. Copper's stress is not much higher, but it stretches by about 45%, so the area (energy absorbed) is thousands of times bigger: it is tough. Strong (high breaking stress) is not the same as tough (lots of energy absorbed).", setup() { set({ mode: "tensile", mat: "glass" }); pull(1); } },
    { title: "Rubber and hysteresis", q: "Stretch rubber to about 300% and release. Why is the unloading curve below the loading curve? What does the area between them represent?", hint: "Stretching straightens the tangled chain molecules; on the way back the chains rub past each other, so less work comes back out than was put in. The area of the loop is the energy per unit volume turned into internal (thermal) energy: the rubber warms up. It obeys Hooke's law only roughly, and its Young modulus is very low.", setup() { set({ mode: "poly", pmat: "rubber", xl: 1 }); P.cycle = true; ctl.cycle.set(true); stretch(1); } },
    { title: "An edge dislocation", q: "Look at the crystal with one edge dislocation (the extra half-plane is outlined). Shear it. How does the half-plane move? Then try the perfect crystal. Which needs the larger shear stress to slip?", hint: "The extra half-plane moves one row of atoms at a time: only the bonds along one line break and re-form at each step, like moving a ruck along a carpet. When it reaches the side it leaves a step one atom high: the top has slipped. The perfect crystal has to break a whole plane of bonds at once, so it needs many times more stress. This is why real metals are much weaker than the 'theoretical' strength, and why they are ductile.", setup() { set({ mode: "md", disloc: true, sol: 0 }); shearGo(1); } },
    { title: "Foreign atoms", q: "Add larger foreign atoms on the slip plane, in the dislocation's path. Shear again. What happens when the dislocation reaches them? Compare the stress needed with the pure crystal.", hint: "The large atoms distort the lattice around them, so the dislocation gets stuck: it needs a larger shear stress to push past. That is why alloys (like steel: iron with carbon) are stronger and harder than pure metals, and less ductile.", setup() { set({ mode: "md", disloc: true, sol: 6 }); shearGo(1); } },
    { title: "Grain boundaries", q: "Pull the metal with large grains (80 μm), then with small grains (15 μm). Watch the dislocations (⊥) pile up at the boundaries. Which sample yields at the higher stress? Why?", hint: "At a boundary the slip planes change direction, so dislocations stop and pile up. A pile-up pushes hard on the boundary; when it pushes hard enough, slip breaks through and the metal yields. Small grains hold only short pile-ups, so a larger applied stress is needed: more grain boundaries, stronger metal. Each test adds a point to the graph on the right.", setup() { set({ mode: "grains", d: 80 }); DDS.dir = 1; } },
    { title: "Cracks concentrate stress", q: "Pull the crystalline ceramic with no notch, then with a notch 8 atoms deep. Watch the colours at the notch tip. How much does the notch reduce the breaking stress?", hint: "The bonds at the tip of the notch are stretched several times more than the bonds far away (the 'stress concentration' readout). They reach their breaking strain first; then the next bond takes even more load, so the crack runs across: brittle fracture. A deeper or sharper crack concentrates the stress more, so the material breaks at a lower stress. Brittle materials are weak in tension because of surface scratches.", setup() { set({ mode: "brittle", notch: 0 }); FRS.dir = 1; } },
    { title: "Toughened glass", q: "Notch the sample 2 atoms deep and pull. Then switch on 'Toughened' (surface layers in compression) and pull again. Which is stronger, and why?", hint: "In toughened glass the surface is squeezed (compressed) and the inside stretched. A surface crack cannot open until the applied pull has first cancelled the compression, so a much larger stress is needed to break it. Prestressed concrete uses the same idea: steel tendons keep the concrete in compression.", setup() { set({ mode: "brittle", notch: 2, tough: false }); FRS.dir = 1; } },
    { title: "Crystalline or amorphous?", q: "Switch to the amorphous (glass) structure. Is it still brittle? Does a notch still weaken it?", hint: "Yes: glass has no regular planes, so there is nothing for dislocations to glide on: no plastic flow at all. It is brittle like the ceramic, and a crack still concentrates the stress at its tip.", setup() { set({ mode: "brittle", amorph: true, notch: 4 }); FRS.dir = 1; } },
    { title: "Cross-links", q: "Stretch rubber with few cross-links, then with many. What do cross-links do to the stiffness and to how far it stretches? Then try polythene (no cross-links): what is different when you release it?", hint: "Cross-links tie the chains together. More cross-links: stiffer (higher Young modulus) and the chains run out of slack sooner, so it cannot stretch as far. Polythene has no cross-links, so its chains slide past each other: it stretches plastically, a neck travels along it ('cold drawing'), and it stays long when released.", setup() { set({ mode: "poly", pmat: "rubber", xl: 1 }); stretch(1); } },
    { lvl: "adv", title: "Theoretical strength", q: "Measure the shear stress needed to slip the perfect crystal and the crystal with a dislocation. A perfect crystal should slip at about G ÷ 2π to G ÷ 10 (G = shear modulus). How do real metals compare?", hint: "Here the perfect crystal slips at roughly 1.5 model units: around one tenth of its shear modulus (its gradient on the graph). The dislocated crystal slips at a small fraction of that. Real metals yield at around G ÷ 1000 or less because they contain millions of dislocations per mm²; whiskers grown without dislocations come close to the theoretical strength.", setup() { set({ mode: "md", disloc: false }); shearGo(1); } },
    { lvl: "adv", title: "Hall–Petch", q: "Test four or five grain sizes from 15 to 80 μm. Plot the yield stress against 1 ÷ √d (graph on the right). Is it a straight line? Find k.", hint: "σy = σ0 + k ÷ √d, so a graph of σy against d^(−½) is a straight line; the gradient is k (here about 1000 MPa √μm, i.e. about 1 MPa √m) and the intercept σ0 is the friction stress of a single crystal. The Batch run does this with repeats.", setup() { set({ mode: "grains", d: 15 }); DDS.dir = 1; } }
  ],
  batch: [
    { title: "Searle's method: measuring E for steel", question: "If 200 students each measure E for the same steel wire, how much do their answers vary?", how: "2 m wire, 0.35 mm diameter; 8 loads up to half the elastic limit; extension read on a vernier (random error SD 0.01 mm); diameter measured once with a micrometer (SD 0.005 mm). True value 200 GPa.", yLabel: "E measured (GPa)", reps: 200, bins: 24, theory: 200, theoryLabel: "true E", run: (x, r) => searleE({ mat: "steel", D: 0.35, L: 2, errE: 0.01, errD: 0.005 }, r), note: "A bell-shaped spread around 200 GPa. Most of it comes from the diameter: A = πd²/4, so a 1% error in d is a 2% error in E. That is why you measure d in several places and average." },
    { title: "Why use a long, thin wire?", question: "How does the length of the wire change how precisely E is measured?", how: "Steel, 0.35 mm diameter, perfect micrometer; only the vernier reading error (SD 0.01 mm). 20 students for each length.", xLabel: "wire length (m)", yLabel: "E measured (GPa)", xs: [0.25, 0.5, 1, 1.5, 2, 3], reps: 20, theory: () => 200, theoryLabel: "true E", run: (x, r) => searleE({ mat: "steel", D: 0.35, L: x, errE: 0.01, errD: 0 }, r), note: "Short wires give widely scattered answers: they stretch so little that the ±0.01 mm reading error is a big fraction of the extension. A longer (or thinner) wire stretches more, so the same reading error matters less. The mean is right either way; the precision is not." },
    { title: "Grain size and yield stress", question: "Does a metal with smaller grains yield at a higher stress (Hall–Petch)?", how: "Grain-scale dislocation model; grain size d from about 70 μm down to 15 μm; yield = 0.2% proof stress. x = 1 ÷ √d, so Hall–Petch predicts a straight line.", xLabel: "1 ÷ √(grain size) (μm^−½)", yLabel: "yield stress (MPa)", xs: [0.12, 0.15, 0.18, 0.22, 0.26], reps: 4, yMin: 0, fit: true, run: (x, r) => ddYield(1 / (x * x), 0, r), note: "A straight line: σy = σ0 + k ÷ √d. The gradient is k; the intercept is the stress to move dislocations inside a grain. Each sample has randomly placed, randomly oriented grains, so the points scatter." },
    { title: "Foreign atoms and yield stress", question: "How does adding foreign (alloying) atoms change the yield stress?", how: "Grain size 30 μm; foreign atoms 0 to 2% by number. They add friction that every moving dislocation must overcome.", xLabel: "foreign atoms (%)", yLabel: "yield stress (MPa)", xs: [0, 0.25, 0.5, 1, 1.5, 2], reps: 4, yMin: 0, run: (x, r) => ddYield(30, x, r), note: "The yield stress rises with more foreign atoms, quickly at first then more slowly (the model's friction rises as √concentration, roughly as in real solid solutions)." },
    { title: "Perfect crystal or dislocation?", question: "How much shear stress makes a block of atoms slip?", how: "Molecular dynamics of about 360 atoms, sheared slowly. 1 = perfect crystal, 2 = one edge dislocation, 3 = edge dislocation with 4 foreign atoms in its path. Takes a few seconds.", xLabel: "crystal (1 perfect, 2 dislocation, 3 dislocation + foreign atoms)", yLabel: "shear stress to slip (model units)", xs: [1, 2, 3], reps: 3, yMin: 0, run: (x, r) => mdSlipStress(x, r), note: "The perfect crystal must break a whole plane of bonds at once. A dislocation lets the slip happen one row at a time, at a small fraction of the stress. Foreign atoms pin the dislocation, so more stress is needed." },
    { title: "Crack length and breaking stress", question: "How does the depth of a surface crack change the stress at which a brittle solid breaks?", how: "Bond-network model (crystalline ceramic), notch 1 to 12 atoms deep. Theory (Griffith): σ ∝ 1 ÷ √a, using a + 1.5 atoms to allow for the size of the tip.", xLabel: "crack depth a (atoms)", yLabel: "breaking stress (GPa)", xs: [1, 2, 3, 4, 6, 8, 10, 12], reps: 3, yMin: 0, theory: a => 7.4 / Math.sqrt(a + 1.5), theoryLabel: "∝ 1 ÷ √(a + 1.5)", run: (x, r) => frBreakStress(x, r), note: "Deeper cracks concentrate the stress more, so the solid breaks at a lower applied stress. Real glass has scratches thousands of atoms deep, which is why it breaks at about 50 MPa instead of several GPa." },
    { title: "Scatter in the strength of glass", question: "Glass rods that look identical: do they all break at the same stress?", how: "300 rods, each with 20 to 40 random surface scratches; each breaks at its deepest scratch (Griffith equation, toughness 0.75 MPa √m).", yLabel: "breaking stress (MPa)", reps: 300, bins: 24, run: (x, r) => glassStrength(r), note: "Brittle strength scatters a lot, because it depends on the worst scratch, which is a matter of chance. Engineers using glass or ceramics need big safety factors; metals are far more predictable." },
    { title: "Rubber: energy lost per cycle", question: "How much energy is turned into heat when rubber is stretched and released?", how: "Stretch to a maximum strain of 100% to 500% and release; area of the hysteresis loop (MJ per m³), with ±3% measurement error.", xLabel: "maximum strain (%)", yLabel: "energy lost (MJ per m³)", xs: [100, 200, 300, 400, 500], reps: 4, yMin: 0, run: (x, r) => rubberLoss(x / 100) * (1 + 0.03 * r.gauss()), note: "The loop gets bigger, faster than in proportion, as the chains straighten and the stress climbs. This heat is why car tyres warm up as they roll." },
    { title: "Toughness of materials", question: "How much energy per m³ does each material absorb before it breaks?", how: "Area under the full stress–strain curve. 1 glass, 2 alumina, 3 cast iron, 4 aluminium alloy, 5 mild steel, 6 copper. Fracture strain varies ±8% from sample to sample.", xLabel: "material (1 glass, 2 alumina, 3 cast iron, 4 Al alloy, 5 steel, 6 copper)", yLabel: "energy absorbed (MJ per m³)", xs: [1, 2, 3, 4, 5, 6], reps: 4, yMin: 0, run: (x, r) => toughness(["glass", "ceramic", "castiron", "alu", "steel", "copper"][x - 1], r), note: "The brittle materials absorb almost nothing (well under 1 MJ per m³) because they break at a tiny strain. Ductile metals absorb thousands of times more because they stretch plastically, by tens of percent, before breaking." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1.5 Hooke", text: "Hooke's law: F = kx up to the limit of proportionality. k (N/m) is the spring constant; a larger k means a stiffer sample." },
      { lvl: "std", tag: "1.5 stress", text: "Stress σ = F ÷ A (Pa); strain ε = ΔL ÷ L (no unit); Young modulus E = σ ÷ ε on the straight part (Pa). E is a property of the material; k depends on the sample's size (k = EA ÷ L)." },
      { lvl: "std", tag: "1.5 energy", text: "Work done in stretching = area under the force–extension graph. In the elastic region W = ½Fx = ½kx², stored as elastic potential energy. Beyond it, work is still the area, but some goes into permanent deformation." },
      { lvl: "std", tag: "1.5 solids", text: "Crystalline: atoms in a regular lattice (metals, ceramics). Amorphous: no long-range order (glass). Polymeric: long chain molecules (rubber, polythene); cross-links between chains make them stiffer." },
      { lvl: "std", tag: "1.5 ductile", text: "Ductile metal: elastic (straight line) → elastic limit / yield point → plastic flow → work hardening → ultimate tensile strength → necking (the area falls, so the force falls) → ductile fracture. Unloading follows a line of gradient E, leaving a permanent strain." },
      { lvl: "std", tag: "1.5 dislocations", text: "An edge dislocation is an extra half-plane of atoms. It lets planes slip one row of bonds at a time, at a far lower stress than slipping a whole plane at once: this is why metals are ductile and weaker than expected." },
      { lvl: "std", tag: "1.5 strengthening", text: "Anything that blocks dislocations makes a metal stronger (and less ductile): foreign atoms (alloying), more grain boundaries (smaller grains), and tangles of other dislocations (work hardening)." },
      { lvl: "std", tag: "1.5 brittle", text: "Brittle materials (glass, ceramics, cast iron) obey Hooke's law almost until they break, with no plastic flow, so they absorb little energy. A surface crack concentrates stress at its tip; the tip bonds break, the crack lengthens and runs: brittle fracture. Putting the surface in compression (toughened glass, prestressed concrete) stops cracks opening." },
      { lvl: "std", tag: "1.5 rubber", text: "Rubber: tangled chains straighten when stretched, so it stretches hugely at low stress (low E), then stiffens as the chains become straight. Hysteresis: the unloading curve is below the loading curve; the loop's area is the energy per unit volume turned into heat." },
      { lvl: "adv", tag: "stretch", text: "Hall–Petch: yield stress σy = σ0 + k ÷ √d (d = grain size). Griffith: brittle strength σf ∝ 1 ÷ √a (a = crack length). Stress at a crack tip ≈ σ(1 + 2√(a ÷ r)) for tip radius r." },
      { lvl: "adv", tag: "stretch", text: "Shear stress on a slip plane = σ cos φ cos λ (Schmid factor, at most 0.5). A perfect crystal would slip at roughly G ÷ 2π to G ÷ 10; real metals yield at about G ÷ 1000 because dislocations move at low stress." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: () => { const s = qSig(); return `A steel wire of diameter ${P.D} mm and length ${P.Lw} m carries a load of ${(s * area()).toFixed(1)} N, which stretches it by ${(s / 200e3 * P.Lw * 1000).toFixed(3)} mm. Calculate the stress, the strain and the Young modulus.`; }, ans: () => { const s = qSig(); return `<ul><li>A = π(d/2)² = ${(area()).toFixed(4)} mm² = ${(area() * 1e-6).toExponential(3)} m²</li><li>stress = F ÷ A = ${s.toFixed(1)} MPa = ${(s * 1e6).toExponential(3)} Pa</li><li>strain = ΔL ÷ L = ${(s / 200e3).toExponential(3)}</li><li>E = stress ÷ strain = 2.0 × 10¹¹ Pa (200 GPa)</li></ul>`; } },
      { lvl: "std", marks: 2, q: () => { const s = qSig(); return `For the same wire, calculate the elastic energy stored, using W = ½Fx.`; }, ans: () => { const s = qSig(), F = s * area(), x = s / 200e3 * P.Lw; return `<ul><li>W = ½ × ${F.toFixed(1)} N × ${(x).toExponential(3)} m</li><li>= ${K.sig(0.5 * F * x, 3)} J</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Explain, in terms of dislocations, why adding foreign atoms to a metal makes it stronger but less ductile.", ans: "<ul><li>foreign atoms distort the lattice and pin dislocations, so a larger stress is needed to move them (stronger)</li><li>dislocations cannot move as freely, so the metal deforms less plastically before breaking (less ductile)</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why a metal with smaller grains has a higher yield stress.", ans: "<ul><li>dislocations cannot easily cross grain boundaries, so they pile up there</li><li>smaller grains: more boundaries, shorter distances to move, so a larger stress is needed for slip to continue</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe how a crack propagates through a brittle material, and explain why toughened glass is harder to break.", ans: "<ul><li>stress is concentrated at the tip of a surface crack</li><li>the bonds at the tip break, the crack gets longer, the stress concentration increases, so it runs through</li><li>toughened glass has its surface in compression, so the applied stress must first overcome this before the crack can open</li></ul>" },
      { lvl: "std", marks: 2, q: "A rubber band is stretched and released. Its loading and unloading curves form a loop. What does the area of the loop represent, and what happens to the band?", ans: "<ul><li>the energy per unit volume transferred to internal (thermal) energy</li><li>the band warms up</li></ul>" },
      { lvl: "std", marks: 2, q: "Sketch and label the stress–strain graph for a ductile metal and for a brittle material on the same axes.", ans: "<ul><li>ductile: straight line, then curve flattening (plastic region), maximum (UTS), falls (necking), ends at large strain</li><li>brittle: straight line to fracture at a small strain, no plastic region</li></ul>" },
      { lvl: "adv", marks: 3, q: "Steel with grains 25 μm across yields at 330 MPa; with 64 μm grains, at 255 MPa. Use σy = σ0 + k ÷ √d to find k and σ0.", ans: "<ul><li>1/√25 = 0.200, 1/√64 = 0.125 (μm^−½)</li><li>k = (330 − 255) ÷ (0.200 − 0.125) = 1000 MPa μm^½</li><li>σ0 = 330 − 1000 × 0.2 = 130 MPa</li></ul>" }
    ]
  },
  notes: `<h3>Five models</h3>
<ul><li><b>Tensile test</b>: typical published stress–strain curves for each material (tables of values, smoothed by straight lines between points). Metals and polythene stretch elastically (gradient E) until the stress reaches the flow stress; plastic strain then grows, and the flow stress rises (work hardening) and later falls (necking). Unloading is elastic. Brittle materials follow their curve until a breaking stress that varies from sample to sample (a lot for glass). Rubber follows a loading and a lower unloading curve.</li>
<li><b>Atoms</b>: about 700 atoms in two dimensions, with the Lennard-Jones force between neighbours, moved by Newton's second law in tiny time steps (molecular dynamics). Stresses are in model units (the depth of the energy well ÷ the atom size squared). Atoms are coloured by how many close neighbours they have: 6 in a perfect lattice, 5 or 7 at a dislocation core.</li>
<li><b>Grains</b>: a two-dimensional dislocation model. Each grain has one slip direction and one dislocation source at its centre. Dislocations move along the slip line at a speed proportional to the force on them above a friction stress; they repel or attract each other (force ∝ 1 ÷ distance); they stop at boundaries unless the stress at the head of the pile-up exceeds a critical value (5000 MPa for real dislocations), and then they pass through. Each ⊥ stands for a group of w dislocations, so that a pile-up shows only a few symbols. Work hardening: the friction stress rises with the number that have crossed boundaries.</li>
<li><b>Brittle fracture</b>: atoms joined by straight springs (to their 6 nearest neighbours, or to random neighbours for glass) that snap at about 10% stretch (±6% from bond to bond). After each step the atoms are allowed to settle; then the most over-stretched bond snaps, and so on.</li>
<li><b>Polymers</b>: a picture of chain molecules (random walks of fixed bond length). Cross-linked points and chain ends move with the material; the rest of each chain is free to straighten. The stress–strain curve comes from the rubber equation σ = G(λ − 1/λ²), with a correction that stiffens it as the chains run out of slack.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Everything is two-dimensional: real dislocations are lines, real grains are 3D and have several slip systems.</li>
<li>The atom model is far smaller (a few nanometres) and is sheared far faster than any real test, so its stresses are only a guide to the pattern, not to real values.</li>
<li>The grain model represents a dense crowd of dislocations by a few symbols; its numbers are tuned to give realistic yield stresses for mild steel (about 250 MPa for 40 μm grains). The yield drop at the start of mild steel's plastic region (caused by carbon atoms pinning dislocations) appears only in the tensile test.</li>
<li>The brittle model has every bond the same apart from a small scatter; real cracks are thousands of atoms long and can branch.</li>
<li>Temperature, rate of loading, and creep are not modelled (polymers in particular depend strongly on both).</li></ul>
<ul><li><b>Practical</b>: Searle's apparatus. Each mass adds 0.25 kg × 9.81 N/kg. The wire's extension under that load comes from the same model as the tensile test (elastic up to the elastic limit, then plastic). The vernier reading has a random error (SD 0.01 mm) and is rounded to 0.01 mm; each micrometer reading has a random error (SD 0.005 mm), and the wire is very slightly out of round.</li></ul>
<p>The earlier Young's Modulus simulation (wire and hanger, material comparison chart, exam questions), with its worksheets, is kept in <a href="original/youngs-modulus.html">original/youngs-modulus.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "tensile", options: [["practical", "🔬 Practical"], ["tensile", "📈 Tensile test"], ["md", "⊥ Atoms"], ["grains", "▦ Grains"], ["brittle", "💥 Brittle"], ["poly", "〰 Polymers"]], on: v => set({ mode: v }) });
grp.practical = g = ui.group("Searle's apparatus");
ctl.smat = K.seg(g, { value: "steel", options: [["steel", "Steel wire"], ["copper", "Copper wire"]], on: v => set({ mode: "practical", smat: v, sD: P.sD, sL: P.sL }) });
ctl.sD = K.slider(g, { label: "Wire diameter (true)", min: 0.2, max: 0.6, step: 0.05, value: 0.35, unit: "mm", on: v => set({ mode: "practical", smat: P.smat, sD: v, sL: P.sL }) });
ctl.sL = K.slider(g, { label: "Wire length", min: 0.5, max: 3, step: 0.25, value: 2, unit: "m", on: v => set({ mode: "practical", smat: P.smat, sD: P.sD, sL: v }) });
let r0 = K.row(g); K.btn(r0, "＋ 0.25 kg", () => addMass(1), "primary"); K.btn(r0, "− 0.25 kg", () => addMass(-1)); K.btn(r0, "📏 Micrometer", () => micrometer());
let r0b = K.row(g); K.btn(r0b, "↺ New wire", () => set({ mode: "practical", smat: P.smat, sD: P.sD, sL: P.sL }));
K.note(g, "Each change of load records a vernier reading. Measure the diameter several times; the mean is used for A.");
grp.tensile = g = ui.group("Sample");
ctl.mat = K.seg(g, { value: "steel", options: MKEYS.map(k => [k, { steel: "Mild steel", copper: "Copper", alu: "Al alloy", castiron: "Cast iron", glass: "Glass", ceramic: "Ceramic", bone: "Bone", rubber: "Rubber", poly: "Polythene" }[k]]), on: v => set({ mode: "tensile", mat: v, D: P.D, Lw: P.Lw }) });
ctl.D = K.slider(g, { label: "Diameter", min: 0.2, max: 2, step: 0.05, value: 0.5, unit: "mm", on: v => P.D = v });
ctl.Lw = K.slider(g, { label: "Original length", min: 0.5, max: 3, step: 0.1, value: 1.5, unit: "m", on: v => P.Lw = v });
let r1 = K.row(g); ctl.pull = K.btn(r1, "▶ Pull", () => pull(T.dir > 0 ? 0 : 1), "primary"); K.btn(r1, "◀ Release", () => pull(-1)); K.btn(r1, "↺ New sample", () => set({ mode: "tensile", mat: P.mat, D: P.D, Lw: P.Lw }));
ctl.zoom = K.toggle(g, { label: "Zoom on the elastic region", value: false, on: v => P.zoom = v });
grp.md = g = ui.group("Crystal");
ctl.disloc = K.seg(g, { value: true, options: [[false, "Perfect crystal"], [true, "One edge dislocation"]], on: v => set({ mode: "md", disloc: v, sol: P.sol }) });
ctl.sol = K.seg(g, { label: "Foreign atoms on the slip plane", value: 0, options: [[0, "none"], [3, "a few"], [6, "more"]], on: v => set({ mode: "md", disloc: P.disloc, sol: v }) });
let r2 = K.row(g); ctl.shear = K.btn(r2, "▶ Shear", () => shearGo(MDS.dir ? 0 : 1), "primary"); K.btn(r2, "↺ New crystal", () => set({ mode: "md", disloc: P.disloc, sol: P.sol }));
ctl.bonds = K.toggle(g, { label: "Show bonds", value: true, on: v => P.bonds = v });
ctl.planes = K.toggle(g, { label: "Outline the extra half-plane", value: true, on: v => P.planes = v });
grp.grains = g = ui.group("Metal");
ctl.d = K.slider(g, { label: "Grain size", min: 15, max: 80, step: 1, value: 40, unit: "μm", on: v => { P.d = v; newGrains(); } });
ctl.dsol = K.slider(g, { label: "Foreign atoms", min: 0, max: 2, step: 0.25, value: 0, unit: "%", on: v => { P.dsol = v; newGrains(); } });
let r3 = K.row(g); ctl.gpull = K.btn(r3, "▶ Pull", () => DDS.dir = DDS.dir ? 0 : 1, "primary"); K.btn(r3, "↺ New sample", () => newGrains()); K.btn(r3, "Clear graph", () => { ddTests = []; });
grp.brittle = g = ui.group("Brittle solid");
ctl.amorph = K.seg(g, { value: false, options: [[false, "Crystalline ceramic"], [true, "Amorphous glass"]], on: v => { P.amorph = v; newFrac(); } });
ctl.notch = K.slider(g, { label: "Notch (crack) depth", min: 0, max: 12, step: 1, value: 4, fmt: v => v ? v + " atoms" : "none", on: v => { P.notch = v; newFrac(); } });
ctl.tough = K.toggle(g, { label: "Toughened: surface in compression", value: false, on: v => { P.tough = v; newFrac(); } });
let r4 = K.row(g); ctl.fpull = K.btn(r4, "▶ Pull", () => FRS.dir = FRS.dir ? 0 : 1, "primary"); K.btn(r4, "↺ New sample", () => newFrac()); K.btn(r4, "Clear graph", () => { frTests = []; });
grp.poly = g = ui.group("Polymer");
ctl.pmat = K.seg(g, { value: "rubber", options: [["rubber", "Rubber"], ["poly", "Polythene"]], on: v => set({ mode: "poly", pmat: v, xl: P.xl }) });
ctl.xl = K.slider(g, { label: "Cross-links", min: 0.5, max: 4, step: 0.5, value: 1, fmt: v => v + "×", on: v => { P.xl = v; newPoly(); } });
let r5 = K.row(g); K.btn(r5, "▶ Stretch", () => stretch(1), "primary"); K.btn(r5, "◀ Release", () => stretch(-1)); K.btn(r5, "↺ New sample", () => newPoly());
ctl.cycle = K.toggle(g, { label: "Keep stretching and releasing (to 300%)", value: false, on: v => { P.cycle = v; if (v) stretch(1); } });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 3, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);

// ---------------- State of each view ----------------
let T = {}, MDS = {}, DDS = {}, FRS = {}, PO = {}, PR = {}, ddTests = [], frTests = [], mdTests = [];
// ---- the practical: state of the wire, the readings taken ----
function newPractical() { PR = { n: 0, ep: 0, e: 0, broken: false, reads: [], dReads: [], round: 0.004 * (rnd() - 0.5) }; addMass(0); }
function addMass(k) {
  if (PR.broken) return; PR.n = Math.max(0, Math.min(12, PR.n + k));
  const M = MATS[P.smat], A = Math.PI * (P.sD / 2) ** 2, F = PR.n * 0.25 * 9.81, s = strainAtStress(M, F / A, PR.ep);
  PR.ep = s.ep; PR.e = s.e; if (s.broken) { PR.broken = true; ui.tip("The wire has snapped!", 3000); return; }
  const read = Math.round((PR.e * P.sL * 1000 + 0.01 * rnd.gauss()) * 100) / 100;            // vernier reading (mm), to 0.01 mm
  PR.reads.push({ F, x: read, up: k >= 0 });
}
function micrometer() { PR.dReads.push(Math.round((P.sD + PR.round * Math.sin(PR.dReads.length * 1.7) + 0.005 * rnd.gauss()) * 100) / 100); }
function practicalE() {
  const up = PR.reads.filter(q => q.up), d = PR.dReads.length ? K.mean(PR.dReads) : null;
  if (up.length < 3 || !d) return null; const g = K.linfit(up.map(q => [q.F, q.x])).m; return { g, d, A: Math.PI * d * d / 4, E: P.sL * 1000 / (Math.PI * d * d / 4 * g) / 1000 };
}
const area = () => Math.PI * (P.D / 2) ** 2;                                // cross-sectional area in mm² (so F in N = σ in MPa × A in mm²)
const qSig = () => P.mode === "tensile" && P.mat === "steel" && T.sig > 20 && T.ep < 1e-5 ? Math.round(T.sig) : 180;   // a stress (MPa) for the exam questions: the one on screen if the steel wire is still elastic
function newTensile() {
  const M = MATS[P.mat];
  T = { e: 0, ep: 0, sig: 0, dir: 0, broken: false, W: 0, up: [[0, 0]], down: [], path: [[0, 0]], released: false, yieldPt: null, uts: [0, 0], frac: null, emax: 0, sf: M.sf ? M.sf * Math.max(0.4, 1 + M.scatter * rnd.gauss() * (P.mat === "glass" ? 1 : 0.5)) : 0 };
}
function pull(d) { T.dir = T.broken ? 0 : d; if (d < 0 && !T.broken) T.released = true; ctl.pull.textContent = T.dir > 0 ? "⏸ Stop" : "▶ Pull"; }
function newMD() { MDS = { S: mdMake({ nx: 36, ny: 20, disloc: P.disloc, sol: P.sol }, rnd), dir: 0, path: [[0, 0]], tmax: 0, seen: false, slipped: false, core: null, frame: 0 }; mdCoord(MDS.S); MDS.core = mdCore(MDS.S); MDS.core0 = MDS.core; }
function shearGo(d) { MDS.dir = d; ctl.shear.textContent = d ? "⏸ Stop" : "▶ Shear"; }
let grainImg = null;
function newGrains() { DDS = { S: ddMake(P.d, P.dsol, rnd), dir: 0, done: false }; grainImg = null; }
function newFrac() { FRS = { S: frMake({ nx: 48, ny: 28, notch: P.notch, amorph: P.amorph, pre: P.tough ? 0.045 : 0 }, rnd), dir: 0, done: false }; }
function newPoly() {
  // chain molecules: random walks of 34 beads, each step turning a random amount; spread over a region taller than the window (the stretched material narrows)
  const chains = [], VW = 36, VH = 22;
  for (let c = 0; c < 26; c++) {
    let x = (rnd() - 0.5) * VW * 0.9, y = (rnd() - 0.5) * VH * 2.4, a = rnd() * 6.28; const pts = [];
    for (let i = 0; i < 34; i++) { pts.push({ rx: x, ry: y, x, y }); a += (rnd() - 0.5) * 2.2; x += Math.cos(a); y += Math.sin(a); if (Math.abs(x) > VW * 0.55) a = Math.PI - a; }
    pts[0].pin = pts[33].pin = true; chains.push({ pts, col: K.col(c % 8) });
  }
  // cross-links: tie together beads on different chains that happen to be close
  const links = [], want = P.pmat === "poly" ? 0 : Math.round(14 * P.xl);
  for (let tries = 0; links.length < want && tries < 20000; tries++) {
    const c1 = chains[Math.floor(rnd() * chains.length)], c2 = chains[Math.floor(rnd() * chains.length)]; if (c1 === c2) continue;
    const p = c1.pts[Math.floor(rnd() * 34)], q = c2.pts[Math.floor(rnd() * 34)];
    if (!p.pin && !q.pin && Math.hypot(p.rx - q.rx, p.ry - q.ry) < 1.2) { p.pin = q.pin = true; links.push([p, q]); }
  }
  PO = { chains, links, e: 0, ep: 0, emax: 0, sig: 0, dir: 0, broken: false, up: [[0, 0]], down: [], Win: 0, Wout: 0 };
}
function stretch(d) { PO.dir = PO.broken ? 0 : d; }
function set(o) {
  Object.assign(P, { smat: "steel", sD: 0.35, sL: 2, mat: "steel", zoom: false, disloc: true, sol: 0, d: 40, dsol: 0, amorph: false, notch: 4, tough: false, pmat: "rubber", xl: 1 }, o);
  for (const k of ["mode", "smat", "mat", "disloc", "sol", "amorph", "pmat"]) ctl[k].set(P[k]);
  for (const k of ["sD", "sL", "D", "Lw", "d", "dsol", "notch", "xl"]) ctl[k].set(P[k]);
  ctl.zoom.set(P.zoom); ctl.tough.set(P.tough); ctl.xl.el.style.display = P.pmat === "rubber" ? "" : "none";
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none";
  if (P.mode === "practical") newPractical();
  if (P.mode === "tensile") { newTensile(); pull(0); }
  if (P.mode === "md") { newMD(); shearGo(0); }
  if (P.mode === "grains") newGrains();
  if (P.mode === "brittle") newFrac();
  if (P.mode === "poly") { newPoly(); P.cycle = false; ctl.cycle.set(false); }
  relabel({ practical: ["load F", "vernier reading", "mean diameter", "gradient ΔL ÷ F", "Young modulus E = L ÷ (A × gradient)"], tensile: ["stress σ = F ÷ A", "strain ε = ΔL ÷ L", "Young modulus E", "work done per m³", "region"], md: ["shear stress (model units)", "shear strain", "most stress so far", "dislocation", "slip so far"], grains: ["stress", "strain", "grains in view", "dislocations (⊥ = w each)", "yield (0.2% proof) stress"], brittle: ["stress", "strain", "stress concentration at tip", "bonds broken", "breaking stress"], poly: ["stress", "strain", "Young modulus (start)", "energy in / back (MJ per m³)", "chains"] }[P.mode]);
}

// ---------------- Stepping each model ----------------
function stepTensile(dt) {
  const M = MATS[P.mat]; if (T.broken || !T.dir) return;
  const rate = speed * 0.15 * (T.e + 3 * M.eref) * (M.kind === "brittle" ? 0.35 : M.kind === "rubber" ? 0.6 : 1), e0 = T.e, s0 = T.sig;
  T.e = Math.max(0, T.e + T.dir * rate * dt);
  if (T.stopAt && T.dir > 0 && T.e >= T.stopAt) { T.e = T.stopAt; T.stopAt = 0; pull(0); ui.tip("Stopped here: read off the stress and strain, then Pull on or Release.", 5000); }
  if (M.kind === "metal") {
    if (T.dir > 0) T.ep = epSolve(M, T.e, T.ep);
    T.sig = M.E * (T.e - T.ep);
    if (T.dir < 0 && T.sig <= 0) { T.sig = 0; T.e = T.ep; pull(0); }
    if (T.ep > 1e-5 && !T.yieldPt) T.yieldPt = [e0, s0];
    if (T.ep >= M.epF) T.broken = true;
  } else if (M.kind === "brittle") {
    T.sig = M.curve(T.e); if (T.sig >= T.sf) { T.sig = T.sf; T.broken = true; }
    if (T.dir < 0 && T.e <= 0) pull(0);
  } else {
    if (T.dir > 0 && T.e >= T.emax) { T.emax = T.e; T.sig = rubberUp(T.e); } else T.sig = rubberDown(T.e, T.emax);
    if (T.e >= rubberBreak()) T.broken = true;
    if (T.dir < 0 && T.e <= 0) pull(0);
  }
  T.W += (s0 + T.sig) / 2 * (T.e - e0);
  if (T.sig > T.uts[1]) T.uts = [T.e, T.sig];
  if (T.broken) { T.frac = [T.e, T.sig]; T.path.push([T.e, T.sig]); T.path.push([T.e, 0]); T.sig = 0; pull(0); return; }
  T.path.push([T.e, T.sig]); (T.dir > 0 ? T.up : T.down).push([T.e, T.sig]);
}
function stepMD(dt) {
  const S = MDS.S; if (!MDS.dir) return;
  const n = Math.round(14 * speed);
  for (let k = 0; k < n; k++) mdStep(S, 0.00012, 1, 0.002, rnd);
  const gam = S.shift / ((S.ny - 3) * ROWH);
  MDS.path.push([gam, S.tauAvg]); if (MDS.path.length > 3000) MDS.path = MDS.path.filter((_, i) => i % 2 === 0);
  if (!MDS.slipped && S.tauAvg > MDS.tmax) MDS.tmax = S.tauAvg;
  if (MDS.frame++ % 4 === 0) { mdCoord(S); MDS.core = mdCore(S); if (MDS.core != null) MDS.seen = true; }
  if (!MDS.slipped) {
    const slip = S.disloc ? MDS.seen && (MDS.core == null || MDS.core > S.W - 2.5) : MDS.tmax > 0.4 && S.tauAvg < 0.6 * MDS.tmax;
    if (slip) { MDS.slipped = true; mdTests.push({ label: !S.disloc ? "perfect" : S.nsol ? `dislocation + ${S.nsol} foreign` : "dislocation", tau: MDS.tmax }); if (mdTests.length > 6) mdTests.shift(); ui.tip(`Slip! It took a shear stress of ${MDS.tmax.toFixed(2)} model units.`, 4000); }
  }
  if (S.shift > 3.2) shearGo(0);
}
function stepGrains(dt) {
  const S = DDS.S; if (!DDS.dir || DDS.done) return;
  const n = Math.max(1, Math.round(4 * speed)); for (let k = 0; k < n; k++) ddStep(S, 0.01, 0.0005);
  S.path.push([S.eps * 100, S.sig]); S.flashes.forEach(f => f.t -= dt * 1.5); S.flashes = S.flashes.filter(f => f.t > 0).slice(-60);
  if (S.eps >= 0.03) { DDS.done = true; DDS.dir = 0; }
  if (S.sy != null && !S.logged) { S.logged = true; ddTests.push({ d: S.d, sy: S.sy, sol: S.sol }); }
}
function stepFrac(dt) {
  const S = FRS.S; if (!FRS.dir || FRS.done) return;
  S.ext += 0.006 * speed; frRelax(S, 30); frBreak(S, 4, 10);
  S.sig = frStress(S); S.path.push([S.ext / S.Wx * 100, S.sig]); if (S.sig > S.max) S.max = S.sig;
  if (S.broke > 0 && S.sig < 0.08 * S.max) { FRS.done = true; FRS.dir = 0; frTests.push({ a: S.notch, s: S.max, am: S.amorph, pre: S.pre > 0 }); ui.tip(`Snapped at ${S.max.toFixed(2)} GPa.`, 3500); }
}
function polySig(e, up) {
  if (P.pmat === "rubber") return up ? rubberUp(e, P.xl) : rubberDown(e, PO.emax, P.xl);
  return MATS.poly.E * (e - PO.ep);
}
function stepPoly(dt) {
  if (P.cycle && !PO.dir && !PO.broken) stretch(PO.e > 0.01 ? -1 : 1);
  if (!PO.dir || PO.broken) return;
  const e0 = PO.e, s0 = PO.sig, rate = speed * 0.5 * (P.pmat === "rubber" ? 1 : 0.6);
  PO.e = Math.max(0, PO.e + PO.dir * rate * dt);
  if (P.cycle && PO.dir > 0 && PO.e >= 3) PO.dir = -1;
  if (P.pmat === "rubber") {
    if (PO.dir > 0 && PO.e >= PO.emax) { PO.emax = PO.e; PO.sig = rubberUp(PO.e, P.xl); } else PO.sig = rubberDown(PO.e, PO.emax, P.xl);
    if (PO.e >= rubberBreak(P.xl)) PO.broken = true;
    if (PO.dir < 0 && PO.e <= 0) { PO.dir = 0; }
  } else {
    if (PO.dir > 0) PO.ep = epSolve(MATS.poly, PO.e, PO.ep);
    PO.sig = MATS.poly.E * (PO.e - PO.ep); if (PO.dir < 0 && PO.sig <= 0) { PO.sig = 0; PO.e = PO.ep; PO.dir = 0; }
    if (PO.ep >= MATS.poly.epF) PO.broken = true;
  }
  const dW = (s0 + PO.sig) / 2 * (PO.e - e0); if (dW > 0) PO.Win += dW; else PO.Wout -= dW;
  if (PO.broken) { PO.sig = 0; PO.dir = 0; ui.tip("Snap!", 2500); }
  (PO.dir >= 0 && PO.e >= e0 ? PO.up : PO.down).push([PO.e * 100, PO.sig]);
  if (PO.up.length + PO.down.length > 4000) { PO.up = PO.up.filter((_, i) => i % 2 === 0); PO.down = PO.down.filter((_, i) => i % 2 === 0); }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { grainImg = null; });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function niceMag(v) { const opts = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]; let best = 1; for (const o of opts) if (o <= v) best = o; return best; }
function drawTensile(c, w, h) {
  const M = MATS[P.mat], efin = M.kind === "metal" ? M.epF : M.kind === "brittle" ? brittleEf(M, T.sf) * 1.1 : rubberBreak();
  const mag = niceMag(0.9 / efin), G0 = w * 0.36, cy = h * 0.4, x0 = w * 0.5 - G0 * 0.5 - 40;
  const ext = T.e * G0 * mag, bw = Math.max(8, Math.min(46, 30 * P.D)), lenNow = G0 + ext;
  // grips
  c.fillStyle = "#3a4560"; c.fillRect(x0 - 70, cy - 50, 70, 100); c.fillRect(x0 + lenNow + (T.broken ? 30 : 0), cy - 50, 70, 100);
  TX(c, "fixed grip", x0 - 35, cy + 68, "#7d8aa5", "center", "11px"); TX(c, "pulled →", x0 + lenNow + 35 + (T.broken ? 30 : 0), cy + 68, "#7d8aa5", "center", "11px");
  // the sample: its width shrinks a little as it stretches, and much more at a neck
  const necking = M.kind === "metal" && T.ep > M.epU, nf = necking ? Math.min(1, (T.ep - M.epU) / (M.epF - M.epU)) : 0;
  const thin = M.kind === "rubber" ? 1 / Math.sqrt(1 + T.e) : 1 / Math.sqrt(1 + T.e * 0.6);
  const drawLen = M.draws && T.ep > 0.08 ? Math.min(1, (T.ep - 0.08) / 3.5) : 0;
  const widthAt = u => { let k = thin; if (necking && !M.draws) k *= 1 - 0.55 * nf * Math.exp(-((u - 0.5) / 0.08) ** 2); if (M.draws && T.ep > 0.05) { const half = 0.03 + 0.47 * drawLen; k *= Math.abs(u - 0.5) < half ? 0.5 : 1 - 0.5 * Math.exp(-((Math.abs(u - 0.5) - half) / 0.02) ** 2); } return bw * k; };
  const shape = (u0, u1, shift) => { c.beginPath(); for (let i = 0; i <= 60; i++) { const u = u0 + (u1 - u0) * i / 60; c.lineTo(x0 + shift + u * lenNow, cy - widthAt(u) / 2); } for (let i = 60; i >= 0; i--) { const u = u0 + (u1 - u0) * i / 60; c.lineTo(x0 + shift + u * lenNow, cy + widthAt(u) / 2); } c.closePath(); };
  c.fillStyle = M.col;
  if (!T.broken) { shape(0, 1, 0); c.fill(); }
  else if (M.kind === "metal" && !M.draws) {
    // ductile fracture: a cup-and-cone break at the neck
    shape(0, 0.5, 0); c.fill(); shape(0.5, 1, 30); c.fill(); const xm = x0 + 0.5 * lenNow, hw = widthAt(0.5) / 2;
    c.fillStyle = "#0b1020"; c.beginPath(); c.moveTo(xm, cy - hw - 1); c.lineTo(xm - 8, cy); c.lineTo(xm, cy + hw + 1); c.closePath(); c.fill(); c.fillStyle = M.col; c.beginPath(); c.moveTo(xm + 30, cy - hw); c.lineTo(xm + 22, cy); c.lineTo(xm + 30, cy + hw); c.closePath(); c.fill();
    TX(c, "ductile fracture: cup and cone", xm + 15, cy - bw - 20, "#ffd166", "center", "600 12px");
  } else { const um = M.kind === "rubber" ? 0.5 : 0.47 + 0.06 * Math.sin(T.sf); shape(0, um, 0); c.fill(); shape(um, 1, 30); c.fill(); TX(c, M.kind === "brittle" ? "brittle fracture: a clean, flat break" : "snapped", x0 + um * lenNow + 15, cy - bw - 20, "#ffd166", "center", "600 12px"); }
  // gauge marks: original length and extension
  c.strokeStyle = "#7d8aa5"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x0 + G0, cy - 60); c.lineTo(x0 + G0, cy + 60); c.stroke(); c.setLineDash([]);
  TX(c, `L = ${P.Lw} m`, x0 + G0 / 2, cy - 64, "#aab6cc", "center", "11px"); if (ext > 4) TX(c, `ΔL`, x0 + G0 + ext / 2, cy - 64, "#ffd166", "center", "600 11px");
  TX(c, mag === 1 ? "extension shown full size" : `extension shown × ${mag}`, x0, cy + 90, "#7d8aa5", "left", "11px");
  // material card and what the atoms are doing
  const bx = 24, by = h * 0.66; TX(c, M.name, bx, by, "#eef2f8", "left", "600 15px"); TX(c, M.cls, bx, by + 20, "#aab6cc", "left", "12px");
  TX(c, stateText(), bx, by + 44, "#ffd166", "left", "13px");
  drawStructure(c, w - 190, by - 30, 160, 110, M);
}
function stateText() {
  const M = MATS[P.mat];
  if (T.broken) return M.kind === "brittle" ? "Broken: a crack ran straight through. Almost no plastic stretch, little energy absorbed." : M.kind === "rubber" ? "Snapped: the chains were fully straight and the bonds in them broke." : "Broken at the neck after a lot of plastic flow: ductile fracture.";
  if (T.e === 0) return "Press Pull to start loading.";
  if (M.kind === "brittle") return "Elastic: bonds stretch; nothing can slip. Any surface crack concentrates the stress.";
  if (M.kind === "rubber") return T.e < 1.5 ? "Tangled chains are straightening out: easy to stretch (low E)." : T.e < 4 ? "Chains uncoiling and lining up." : "Chains almost straight: now the bonds themselves must stretch, so it gets much stiffer.";
  if (T.ep < 1e-5) return "Elastic: bonds stretch like springs. Let go and it returns to its original length.";
  if (M.draws) return T.ep < 0.1 ? "Yielding: chains begin to slide past each other." : "A neck forms and travels along: chains are pulled out straight and lined up (cold drawing).";
  if (T.ep < M.epU) return T.dir < 0 ? "Unloading: elastic recovery only; the plastic stretch stays." : "Plastic: dislocations glide; they tangle and pile up, so it gets harder to deform (work hardening).";
  return "Necking: one part thins, so the force needed falls. Voids open inside the neck.";
}
// a little picture of how the particles are arranged
function drawStructure(c, x, y, w, h, M) {
  c.save(); c.fillStyle = "#111a30"; c.fillRect(x, y, w, h); c.strokeStyle = "#3a4560"; c.strokeRect(x, y, w, h); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const r = K.rng(7), col = M.col;
  if (M.kind === "rubber" || M.draws) { for (let k = 0; k < 7; k++) { c.strokeStyle = K.col(k); c.lineWidth = 1.6; c.beginPath(); let px = x + r() * w, py = y + r() * h, a = r() * 6; for (let i = 0; i < 24; i++) { c.lineTo(px, py); a += (r() - 0.5) * 2; px += Math.cos(a) * 7; py += Math.sin(a) * 7; } c.stroke(); } if (M.kind === "rubber") { c.fillStyle = "#ffd166"; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + 20 + r() * (w - 40), y + 15 + r() * (h - 30), 3, 0, 6.3); c.fill(); } } }
  else if (P.mat === "glass") { c.fillStyle = col; for (let k = 0; k < 70; k++) { c.beginPath(); c.arc(x + r() * w, y + r() * h, 4, 0, 6.3); c.fill(); } }
  else { c.fillStyle = col; const s = 13; for (let j = 0; j * s * 0.87 < h + s; j++) for (let i = -1; i * s < w + s; i++) { c.beginPath(); c.arc(x + i * s + (j % 2 ? s / 2 : 0), y + j * s * 0.87, 4.5, 0, 6.3); c.fill(); } if (P.mat === "castiron") { c.strokeStyle = "#222"; c.lineWidth = 3; for (let k = 0; k < 4; k++) { const px = x + r() * w, py = y + r() * h; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 15, py - 8, px + 32, py + 4); c.stroke(); } } }
  c.restore(); TX(c, "how the particles are arranged", x, y - 6, "#7d8aa5", "left", "10.5px");
}
function drawMD(c, w, h) {
  const S = MDS.S, Hb = S.ny * ROWH, sc = Math.min((w - 80) / (S.W + 4), (h - 120) / (Hb + 2)), ox = (w - S.W * sc) / 2, oy = h - 60;
  const X = x => ox + x * sc, Y = y => oy - y * sc;
  // the slip plane, between the middle rows
  const yg = (S.ny / 2 - 0.5) * ROWH; c.strokeStyle = "rgba(255,209,102,0.35)"; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(X(-1), Y(yg)); c.lineTo(X(S.W + 1.5), Y(yg)); c.stroke(); c.setLineDash([]); TX(c, "slip plane", X(S.W + 1.6), Y(yg) + 4, "#ffd166", "left", "11px");
  if (P.bonds) { c.strokeStyle = "rgba(160,180,210,0.28)"; c.lineWidth = 1; c.beginPath(); for (let p = 0; p < S.np; p += 2) { const a = S.pairs[p], b = S.pairs[p + 1], dx = S.x[b] - S.x[a], dy = S.y[b] - S.y[a], lim = 1.3 * A0 * (S.s[a] + S.s[b]) / 2; if (dx * dx + dy * dy < lim * lim) { c.moveTo(X(S.x[a]), Y(S.y[a])); c.lineTo(X(S.x[b]), Y(S.y[b])); } } c.stroke(); }
  // the extra half-plane: the column of atoms in the top half that sits above the dislocation core
  if (P.planes && S.disloc && MDS.core != null) {
    let best = -1, bd = 1e9; for (let k = 0; k < S.N; k++) if (S.row[k] === S.ny / 2 && Math.abs(S.x[k] - MDS.core) < bd) { bd = Math.abs(S.x[k] - MDS.core); best = S.col[k]; }
    const pts = []; for (let k = 0; k < S.N; k++) if (S.row[k] >= S.ny / 2 && S.col[k] === best) pts.push([S.x[k], S.y[k]]); pts.sort((a, b) => a[1] - b[1]);
    c.strokeStyle = "#ffd166"; c.lineWidth = sc * 0.55; c.globalAlpha = 0.35; c.lineCap = "round"; c.beginPath(); pts.forEach(p => c.lineTo(X(p[0]), Y(p[1]))); c.stroke(); c.globalAlpha = 1; c.lineCap = "butt";
    if (pts.length) TX(c, "extra half-plane", X(pts[pts.length - 1][0]), Y(Hb) - 14, "#ffd166", "center", "600 12px");
  }
  const rad = sc * 0.42;
  for (let k = 0; k < S.N; k++) {
    const cd = S.coord[k], foreign = S.s[k] !== 1;
    c.fillStyle = S.g[k] ? "#56607a" : foreign ? "#7fe3a0" : (cd === 5 || cd === 7) && S.y[k] > 2.5 * ROWH && S.y[k] < Hb - 3.5 * ROWH ? "#ff8a3d" : "#6fa8dc";
    c.beginPath(); c.arc(X(S.x[k]), Y(S.y[k]), rad * S.s[k], 0, 6.3); c.fill();
  }
  // the ⊥ symbol at the core
  if (S.disloc && MDS.core != null) { const cx = X(MDS.core), cy = Y(yg); c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 12, cy); c.lineTo(cx + 12, cy); c.moveTo(cx, cy); c.lineTo(cx, cy - 20); c.stroke(); }
  // shear arrows
  const sh = S.shift; c.fillStyle = "#ff8a70"; TX(c, MDS.dir ? "top rows pushed this way →" : "top rows held here", X(S.W / 2), Y(Hb) - 32, "#ff8a70", "center", "600 12px");
  TX(c, "bottom rows held still", X(S.W / 2), oy + 26, "#7d8aa5", "center", "12px");
  TX(c, `${S.N} atoms · ${S.disloc ? "one edge dislocation" : "perfect crystal"}${S.nsol ? ` · ${S.nsol} foreign atoms (green)` : ""}`, 20, 26, "#eef2f8", "left", "600 13px");
  TX(c, "orange: atoms with 5 or 7 neighbours instead of 6 (a defect)", 20, 46, "#ff8a3d", "left", "11.5px");
  if (S.disloc && MDS.core == null && MDS.seen) TX(c, "The dislocation has reached the surface: the top half has slipped one atom spacing (look at the step at the right-hand side).", 20, 66, "#7fe3a0", "left", "12px");
}
function makeGrainImg(c, rw, rh) {
  // colour every few pixels by its nearest grain centre (that is what a Voronoi grain map is); stripes show each grain's slip planes
  const S = DDS.S, img = document.createElement("canvas"); img.width = Math.ceil(rw / 2); img.height = Math.ceil(rh / 2);
  const ix = img.getContext("2d"), id = ix.createImageData(img.width, img.height), own = new Int16Array(img.width * img.height), sp = Math.max(3, S.d / 5);
  for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) {
    const X = (i + 0.5) / img.width * DD.WX, Y = (1 - (j + 0.5) / img.height) * DD.WY; let best = 0, bd = 1e18;
    S.G.forEach((g, k) => { const d2 = (g.s[0] - X) ** 2 + (g.s[1] - Y) ** 2; if (d2 < bd) { bd = d2; best = k; } }); own[j * img.width + i] = best;
    const g = S.G[best], n = [-g.u[1], g.u[0]], stripe = ((X * n[0] + Y * n[1]) / sp % 1 + 1) % 1 < 0.14, L = 70 + 40 * Math.abs(Math.sin(g.phi * 2.3 + best)), o = (j * img.width + i) * 4;
    id.data[o] = L * 0.75 + (stripe ? 22 : 0); id.data[o + 1] = L * 0.85 + (stripe ? 22 : 0); id.data[o + 2] = L + 25 + (stripe ? 22 : 0); id.data[o + 3] = 255;
  }
  for (let j = 1; j < img.height; j++) for (let i = 1; i < img.width; i++) { const k = j * img.width + i; if (own[k] !== own[k - 1] || own[k] !== own[k - img.width]) { const o = k * 4; id.data[o] = 14; id.data[o + 1] = 18; id.data[o + 2] = 30; } }
  ix.putImageData(id, 0, 0); return img;
}
function drawGrains(c, w, h) {
  const S = DDS.S, sc = Math.min((w - 60) / DD.WX, (h - 90) / DD.WY), rw = DD.WX * sc, rh = DD.WY * sc, ox = (w - rw) / 2, oy = 40;
  if (!grainImg || grainImg.key !== S) { grainImg = makeGrainImg(c, rw, rh); grainImg.key = S; }
  c.imageSmoothingEnabled = false; c.drawImage(grainImg, ox, oy, rw, rh); c.imageSmoothingEnabled = true;
  const X = x => ox + x * sc, Y = y => oy + rh - y * sc;
  for (const g of S.G) {
    // the active slip line and its source
    c.strokeStyle = "rgba(255,255,255,0.18)"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(g.s[0] + g.lo * g.u[0]), Y(g.s[1] + g.lo * g.u[1])); c.lineTo(X(g.s[0] + g.hi * g.u[0]), Y(g.s[1] + g.hi * g.u[1])); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.arc(X(g.s[0]), Y(g.s[1]), 2, 0, 6.3); c.fill();
    for (const q of g.dis) {
      const px = X(g.s[0] + q.t * g.u[0]), py = Y(g.s[1] + q.t * g.u[1]), ang = Math.atan2(-g.u[1], g.u[0]), hot = Math.min(1, Math.abs(q.hot || 0));
      c.save(); c.translate(px, py); c.rotate(ang); c.strokeStyle = hot > 0.05 ? `rgb(255,${Math.round(209 - 140 * hot)},${Math.round(102 - 60 * hot)})` : "#ffd166"; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.moveTo(0, 0); c.lineTo(0, -9 * q.s); c.stroke(); c.restore();
    }
  }
  for (const f of S.flashes) { c.strokeStyle = `rgba(127,227,160,${f.t})`; c.lineWidth = 2; c.beginPath(); c.arc(X(f.x), Y(f.y), 4 + 10 * (1 - f.t), 0, 6.3); c.stroke(); }
  // scale bar and pull arrows
  const bar = 50 * sc; c.fillStyle = "#eef2f8"; c.fillRect(ox + rw - bar - 10, oy + rh + 14, bar, 4); TX(c, "50 μm", ox + rw - bar / 2 - 10, oy + rh + 32, "#eef2f8", "center", "11px");
  TX(c, "↑ pulled ↑", w / 2, oy - 10, "#ff8a70", "center", "600 12px"); TX(c, "↓ pulled ↓", w / 2, oy + rh + 22, "#ff8a70", "center", "600 12px");
  TX(c, `grain size ${S.d} μm${S.sol ? ` · ${S.sol}% foreign atoms` : ""} · stripes show each grain's slip planes · ⊥ = a group of ${Math.round(S.w)} dislocations`, ox, oy + rh + 50, "#aab6cc", "left", "11.5px");
  TX(c, "dislocations turn red as a pile-up pushes hard on a boundary; green rings: slip breaking through", ox, oy + rh + 68, "#aab6cc", "left", "11.5px");
}
function drawFrac(c, w, h) {
  const S = FRS.S, sc = Math.min((w - 160) / (S.Wx + 6), (h - 120) / (S.H + 2)), ox = (w - S.Wx * sc) / 2, oy = h / 2 + S.H * sc / 2 + 10;
  const X = x => ox + x * sc, Y = y => oy - y * sc;
  c.lineWidth = Math.max(1, sc * 0.18);
  // bonds coloured by how much they are stretched (blue: squashed, grey: unstrained, yellow → red: near breaking)
  for (let i = 0; i < S.nb; i++) {
    if (S.broken[i]) continue; const p = S.a[i], q = S.b[i], f = S.e[i] / S.eb[i];
    c.strokeStyle = f < -0.05 ? `rgba(111,177,255,${Math.min(1, 0.4 - f * 3)})` : f < 0.3 ? "rgba(170,182,204,0.45)" : `rgb(255,${Math.round(230 - 200 * Math.min(1, (f - 0.3) / 0.7))},${Math.round(120 - 100 * Math.min(1, (f - 0.3) / 0.7))})`;
    c.beginPath(); c.moveTo(X(S.x[p]), Y(S.y[p])); c.lineTo(X(S.x[q]), Y(S.y[q])); c.stroke();
  }
  c.fillStyle = "#c9d3e6"; for (let k = 0; k < S.N; k++) { c.fillStyle = S.g[k] ? "#56607a" : "#c9d3e6"; c.beginPath(); c.arc(X(S.x[k]), Y(S.y[k]), Math.max(1.2, sc * 0.16), 0, 6.3); c.fill(); }
  TX(c, "← held", X(0) - 10, Y(S.H / 2), "#7d8aa5", "right", "12px"); TX(c, "pulled →", X(S.Wx + S.ext) + 10, Y(S.H / 2), "#ff8a70", "left", "600 12px");
  if (S.notch) TX(c, "notch ↓", X(S.Wx / 2), Y(S.H) - 10, "#ffd166", "center", "600 12px");
  if (S.pre) { TX(c, "compressed surface layer", X(0), Y(S.H) - 10, "#6fb1ff", "left", "11px"); TX(c, "compressed surface layer", X(0), Y(0) + 18, "#6fb1ff", "left", "11px"); }
  TX(c, `${S.amorph ? "Amorphous glass: atoms at random, no planes to slip on" : "Crystalline ceramic: a regular lattice, but bonds too rigid and directional to slip"}`, 20, 26, "#eef2f8", "left", "600 13px");
  TX(c, "bond colour: blue squashed · grey unstretched · yellow → red close to breaking", 20, 46, "#aab6cc", "left", "11.5px");
}
function drawPoly(c, w, h) {
  const lam = 1 + PO.e, sx = lam, sy = 1 / Math.sqrt(lam), sc = Math.min(w / 46, h / 32), cx = w / 2, cy = h / 2 + 10;
  // affine stretch: where the material around each point has been carried to
  const aff = p => [p.rx * sx, p.ry * sy];
  for (const ch of PO.chains) for (const p of ch.pts) { const [ax, ay] = aff(p); if (p.pin) { p.x = ax; p.y = ay; } else { p.x += (ax - p.x) * 0.06; p.y += (ay - p.y) * 0.06; } }
  // keep every bond in each chain the same length (a few passes of nudging pairs of beads)
  let taut = 0;
  for (let it = 0; it < 12; it++) for (const ch of PO.chains) for (let i = 0; i < ch.pts.length - 1; i++) {
    const p = ch.pts[i], q = ch.pts[i + 1], dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1e-6, k = (l - 1) / l * 0.5;
    if (it === 11 && l > 1.08) taut++;
    if (!p.pin && !q.pin) { p.x += dx * k; p.y += dy * k; q.x -= dx * k; q.y -= dy * k; } else if (!p.pin) { p.x += dx * k * 2 * 0.9; p.y += dy * k * 2 * 0.9; } else if (!q.pin) { q.x -= dx * k * 2 * 0.9; q.y -= dy * k * 2 * 0.9; }
  }
  PO.taut = taut;
  c.save(); const vw = 36 * sc, vh = 22 * sc; c.beginPath(); c.rect(cx - vw / 2, cy - vh / 2, vw, vh); c.fillStyle = "#111a30"; c.fill(); c.clip();
  for (const ch of PO.chains) { c.strokeStyle = ch.col; c.lineWidth = 2; c.beginPath(); for (const p of ch.pts) c.lineTo(cx + p.x * sc, cy + p.y * sc); c.stroke(); }
  c.fillStyle = "#ffd166"; for (const [p] of PO.links) { c.beginPath(); c.arc(cx + p.x * sc, cy + p.y * sc, 3.5, 0, 6.3); c.fill(); }
  if (PO.broken) { c.fillStyle = "rgba(11,16,32,0.7)"; c.fillRect(cx - 4, cy - vh / 2, 8, vh); }
  c.restore(); c.strokeStyle = "#3a4560"; c.strokeRect(cx - vw / 2, cy - vh / 2, vw, vh);
  TX(c, "← pulled", cx - vw / 2 - 8, cy, "#ff8a70", "right", "600 12px"); TX(c, "pulled →", cx + vw / 2 + 8, cy, "#ff8a70", "left", "600 12px");
  TX(c, P.pmat === "rubber" ? `Rubber: tangled chains${PO.links.length ? `, ${PO.links.length} cross-links (yellow dots) in view` : ""}` : "Polythene: long chains, no cross-links", 20, 26, "#eef2f8", "left", "600 13px");
  TX(c, `a magnified window into the middle of the sample · strain ${(PO.e * 100).toFixed(0)}%`, 20, 46, "#aab6cc", "left", "11.5px");
}
function drawPractical(c, w, h) {
  // Searle's apparatus: a reference wire and a test wire hang from one beam; a vernier between them reads the extension
  const M = MATS[P.smat], top = 40, len = h * 0.62, xr = w * 0.3, xt = w * 0.3 + 70, ext = PR.e * P.sL * 1000, shown = Math.min(60, ext * 12);
  c.fillStyle = "#56607a"; c.fillRect(xr - 60, top - 16, 200, 16); TX(c, "rigid support", xr + 40, top - 22, "#7d8aa5", "center", "11px");
  c.strokeStyle = "#c9d3e6"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(xr, top); c.lineTo(xr, top + len); c.stroke();
  c.strokeStyle = M.col; c.lineWidth = Math.max(1.5, P.sD * 5); c.beginPath(); c.moveTo(xt, top); c.lineTo(xt, top + len + shown); c.stroke();
  TX(c, "reference wire", xr - 8, top + 30, "#7d8aa5", "right", "11px"); TX(c, `test wire (${M.name})`, xt + 10, top + 30, M.col, "left", "11px");
  // vernier: main scale on the reference wire, sliding vernier on the test wire
  const vy = top + len - 40; c.fillStyle = "#3a4560"; c.fillRect(xr - 4, vy - 30, 34, 60); c.fillStyle = "#56607a"; c.fillRect(xt - 30, vy - 20 + shown, 34, 60);
  c.strokeStyle = "#eef2f8"; c.lineWidth = 1; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(xr + 22, vy - 28 + i * 5); c.lineTo(xr + 30, vy - 28 + i * 5); c.stroke(); }
  TX(c, "vernier scale", xt + 10, vy + 40 + shown, "#aab6cc", "left", "11px");
  // hanger and slotted masses
  const hy = top + len + shown + 40; c.strokeStyle = "#aab6cc"; c.beginPath(); c.moveTo(xt, top + len + shown); c.lineTo(xt, hy); c.stroke();
  for (let i = 0; i < PR.n; i++) { c.fillStyle = i % 2 ? "#8a8f99" : "#9fa6b2"; c.fillRect(xt - 26, hy + 2 + i * 9 - (PR.n * 9 - 30) * 0, 52, 8); }
  TX(c, `${(PR.n * 0.25).toFixed(2)} kg`, xt + 34, hy + 14, "#eef2f8", "left", "600 13px");
  if (PR.broken) TX(c, "SNAPPED", xt, top + len / 2, "#ff5d6c", "center", "700 16px");
  TX(c, `(extension drawn × ${shown > 0 && ext > 0 ? Math.round(shown / ext) : 12})`, xr - 60, h - 14, "#7d8aa5", "left", "11px");
  // the readings table
  const tx = w * 0.56; let y = 40; TX(c, "load F (N)        vernier reading (mm)", tx, y, "#eef2f8", "left", "600 12.5px"); y += 20;
  for (const q of PR.reads.slice(-16)) { TX(c, `${q.F.toFixed(2).padStart(6)}            ${q.x.toFixed(2)} ${q.up ? "" : "(unloading)"}`, tx, y, q.up ? "#aab6cc" : "#ff8a70", "left", "12px"); y += 17; }
  y += 10; TX(c, "micrometer readings (mm): " + (PR.dReads.length ? PR.dReads.map(d => d.toFixed(2)).join(", ") : "none yet: press 📏 Micrometer"), tx, y, "#ffd166", "left", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ practical: drawPractical, tensile: drawTensile, md: drawMD, grains: drawGrains, brittle: drawFrac, poly: drawPoly })[P.mode](c, w, h); }

// ---------------- Charts and readouts ----------------
function chartsPractical() {
  const r = practicalE(), up = PR.reads.filter(q => q.up), dn = PR.reads.filter(q => !q.up);
  chA.opts.title = "Extension against load"; chA.opts.xLabel = "load F (N)"; chA.opts.yLabel = "extension ΔL (mm)"; chA.opts.xFmt = null;
  const ser = [{ pts: up.map(q => [q.F, q.x]), type: "dots", r: 5, color: "#6fb1ff", label: "loading" }, { pts: dn.map(q => [q.F, q.x]), type: "dots", r: 4, color: "#ff8a70", label: "unloading" }];
  if (r) ser.push({ pts: [[0, K.linfit(up.map(q => [q.F, q.x])).c], [30, K.linfit(up.map(q => [q.F, q.x])).c + 30 * r.g]], color: "#ffd166", dash: [5, 4], label: "best-fit line (loading)" });
  chA.draw(ser, { xMin: 0, xMax: 30, yMin: 0 });
  chB.opts.title = "Micrometer readings of the diameter"; chB.opts.xLabel = "reading number"; chB.opts.yLabel = "diameter (mm)"; chB.opts.xFmt = null;
  chB.draw([{ pts: PR.dReads.map((d, i) => [i + 1, d]), type: "dots", r: 5, color: "#ffd166", label: "readings" }], { xMin: 0, xMax: Math.max(6, PR.dReads.length + 1), yMin: P.sD - 0.03, yMax: P.sD + 0.03, hlines: PR.dReads.length ? [{ y: K.mean(PR.dReads), color: "#7fe3a0", label: "mean " + K.mean(PR.dReads).toFixed(3) + " mm" }] : [] });
  const last = PR.reads[PR.reads.length - 1];
  read.set("a", (PR.n * 0.25 * 9.81).toFixed(2) + " N"); read.set("b", last ? last.x.toFixed(2) + " mm" : "–"); read.set("c", r ? r.d.toFixed(3) + " mm" : PR.dReads.length ? K.mean(PR.dReads).toFixed(3) + " mm" : "measure it");
  read.set("d", r ? K.sig(r.g, 3) + " mm per N" : "need 3 loads"); read.set("e", r ? K.sig(r.E, 3) + " GPa" : "–");
  ui.hud(PR.broken ? "Snapped: far too much load" : PR.ep > 1e-4 ? "Beyond the elastic limit: the wire is stretching plastically" : "Add masses one at a time; keep well below the elastic limit");
}
const pct = v =>(v * 100 < 1 ? (v * 100).toFixed(3) : (v * 100).toFixed(1)) + "%";
function chartsTensile() {
  const M = MATS[P.mat], A = area();
  const xMaxFull = M.kind === "metal" ? M.epF * 1.08 : M.kind === "brittle" ? brittleEf(M, T.sf) * 1.2 : rubberBreak() * 1.05;
  const xMax = P.zoom ? Math.min(xMaxFull, 6 * M.eref) : xMaxFull;
  chA.opts.title = "Stress–strain graph"; chA.opts.xLabel = "strain (%)"; chA.opts.yLabel = "stress (MPa)"; chA.opts.xFmt = null;
  const pts = T.path.filter(p => p[0] <= xMax * 1.02).map(p => [p[0] * 100, p[1]]), series = [];
  if (!T.released) series.push({ pts, type: "area", color: "#6fb1ff", label: "area = work done per m³" });
  else { series.push({ pts: T.up.map(p => [p[0] * 100, p[1]]), color: "#6fb1ff", label: "loading" }); series.push({ pts: T.down.map(p => [p[0] * 100, p[1]]), color: "#ff8a70", label: "unloading" }); }
  if (T.e > 0) series.push({ pts: [[T.e * 100, T.sig]], type: "dots", r: 5, color: "#ffd166" });
  const vl = [];
  if (T.yieldPt && T.yieldPt[0] <= xMax) vl.push({ x: T.yieldPt[0] * 100, color: "#7fe3a0", label: "elastic limit / yield" });
  if (M.kind === "metal" && T.ep > M.epU && T.uts[0] <= xMax) vl.push({ x: T.uts[0] * 100, color: "#ffd166", label: "UTS", row: 1 });
  if (T.frac && T.frac[0] <= xMax * 1.02) vl.push({ x: T.frac[0] * 100, color: "#ff5d6c", label: "fracture", row: 2 });
  chA.draw(series, { xMin: 0, xMax: xMax * 100, yMin: 0, yMax: (M.kind === "metal" ? Math.max(...M.flow.map(p => p[1])) : M.kind === "brittle" ? T.sf : rubberUp(rubberBreak())) * 1.12, vlines: vl });
  // force–extension for this wire
  const Fp = T.path.map(p => [p[0] * P.Lw * 1000, p[1] * A]), Wj = T.W * A * P.Lw;
  chB.opts.title = `Force–extension for this sample: work done = area = ${K.sig(Wj, 3)} J`; chB.opts.xLabel = "extension (mm)"; chB.opts.yLabel = "force (N)"; chB.opts.xFmt = null;
  chB.draw([{ pts: Fp.filter(p => p[0] <= xMax * P.Lw * 1000 * 1.02), type: T.released ? undefined : "area", color: "#7fe3a0", label: `A = ${K.sig(A, 3)} mm²` }], { xMin: 0, xMax: xMax * P.Lw * 1000, yMin: 0 });
  read.set("a", K.sig(T.sig, 3) + " MPa"); read.set("b", pct(T.e)); read.set("c", M.kind === "rubber" ? "≈ " + K.sig(3 * 0.3, 2) + " MPa (not constant)" : K.sig(M.E / 1000, 3) + " GPa");
  read.set("d", K.sig(T.W, 3) + " MJ per m³"); read.set("e", T.broken ? "broken" : T.e === 0 ? "–" : M.kind === "metal" ? (T.ep < 1e-5 ? "elastic" : T.ep < M.epU ? "plastic" : "necking") : "elastic");
  ui.hud(stateText());
}
function chartsMD() {
  const S = MDS.S;
  chA.opts.title = "Shear stress against shear strain"; chA.opts.xLabel = "shear strain"; chA.opts.yLabel = "shear stress (model units)"; chA.opts.xFmt = null;
  chA.draw([{ pts: MDS.path, color: "#6fb1ff", label: S.disloc ? "with a dislocation" : "perfect crystal" }], { xMin: 0, xMax: Math.max(0.05, ...MDS.path.map(p => p[0])) * 1.05, yMin: -0.2, yMax: 2 });
  chB.opts.title = "Shear stress needed to make it slip (each test)"; chB.opts.xLabel = ""; chB.opts.yLabel = "model units"; chB.opts.xFmt = whole(v => mdTests[Math.round(v)] ? mdTests[Math.round(v)].label : "");
  chB.draw([{ pts: mdTests.map((q, i) => [i, q.tau]), type: "bars", w: 0.6, color: "#ffd166", label: "slip stress" }], { xMin: -0.6, xMax: Math.max(3, mdTests.length) - 0.4, yMin: 0, yMax: 2 });
  read.set("a", S.tauAvg.toFixed(2)); read.set("b", (S.shift / ((S.ny - 3) * ROWH)).toFixed(3)); read.set("c", MDS.tmax.toFixed(2));
  read.set("d", !S.disloc ? (MDS.slipped ? "many, made by the slip" : "none") : MDS.core != null ? `core at ${(MDS.core / A0).toFixed(1)} atoms from the left` : MDS.seen ? "gone: reached the surface" : "–");
  read.set("e", MDS.slipped ? "yes: top half slipped" : "not yet");
  ui.hud(!S.disloc ? "A perfect crystal: to slip, a whole plane of bonds must break at once" : MDS.core != null ? "The extra half-plane moves one row of bonds at a time" : "The dislocation has gone; the top has slipped by one atom spacing");
}
function chartsGrains() {
  const S = DDS.S;
  chA.opts.title = "Stress–strain (the start of plastic flow)"; chA.opts.xLabel = "strain (%)"; chA.opts.yLabel = "stress (MPa)"; chA.opts.xFmt = null;
  chA.draw([{ pts: S.path, color: "#6fb1ff", label: `grains ${S.d} μm` }], { xMin: 0, xMax: 3, yMin: 0, yMax: 700, hlines: S.sy ? [{ y: S.sy, color: "#7fe3a0", label: "yield (0.2% proof) " + S.sy.toFixed(0) + " MPa" }] : [] });
  chB.opts.title = "Yield stress against 1 ÷ √(grain size)"; chB.opts.xLabel = "1 ÷ √d (μm^−½)"; chB.opts.yLabel = "yield stress (MPa)"; chB.opts.xFmt = null;
  const pure = ddTests.filter(q => !q.sol), ser = [{ pts: pure.map(q => [1 / Math.sqrt(q.d), q.sy]), type: "dots", r: 5, color: "#ffd166", label: "pure metal" }, { pts: ddTests.filter(q => q.sol).map(q => [1 / Math.sqrt(q.d), q.sy]), type: "dots", r: 5, color: "#7fe3a0", label: "with foreign atoms" }];
  if (pure.length > 2) { const f = K.linfit(pure.map(q => [1 / Math.sqrt(q.d), q.sy])); ser.push({ pts: [[0.1, f.m * 0.1 + f.c], [0.27, f.m * 0.27 + f.c]], color: "#6fb1ff", dash: [5, 4], label: `σ0 = ${f.c.toFixed(0)} MPa, k = ${f.m.toFixed(0)} MPa√μm` }); }
  chB.draw(ser, { xMin: 0.1, xMax: 0.27, yMin: 0, yMax: 700 });
  let moving = 0, piled = 0; for (const g of S.G) for (const q of g.dis) (Math.min(g.hi - q.t, q.t - g.lo) < 0.03 * S.d ? piled++ : moving++);
  read.set("a", S.sig.toFixed(0) + " MPa"); read.set("b", pct(S.eps)); read.set("c", `${S.G.length} (${S.d} μm across)`); read.set("d", `${moving} moving, ${piled} piled up (w = ${Math.round(S.w)})`); read.set("e", S.sy ? S.sy.toFixed(0) + " MPa" : "not yet");
  ui.hud(!DDS.dir && S.eps === 0 ? "Press Pull" : S.sy ? "Yielded: slip is breaking through the grain boundaries" : "Dislocations glide and pile up at grain boundaries");
}
function chartsFrac() {
  const S = FRS.S;
  chA.opts.title = "Stress–strain: a straight line, then a sudden break"; chA.opts.xLabel = "strain (%)"; chA.opts.yLabel = "stress (GPa)"; chA.opts.xFmt = null;
  chA.draw([{ pts: S.path, color: "#6fb1ff", label: "this sample" }], { xMin: 0, xMax: 10, yMin: 0, yMax: 7 });
  chB.opts.title = "Breaking stress against notch depth"; chB.opts.xLabel = "notch depth (atoms)"; chB.opts.yLabel = "breaking stress (GPa)"; chB.opts.xFmt = null;
  const th = []; for (let a = 0.5; a <= 12; a += 0.25) th.push([a, 7.4 / Math.sqrt(a + 1.5)]);
  const grp2 = (f, col, lab) => ({ pts: frTests.filter(f).map(q => [q.a, q.s]), type: "dots", r: 5, color: col, label: lab });
  chB.draw([{ pts: th, color: "#56607a", dash: [5, 4], label: ui.level === "adv" ? "Griffith: ∝ 1 ÷ √a" : "pattern" }, grp2(q => !q.am && !q.pre, "#ffd166", "ceramic"), grp2(q => q.am && !q.pre, "#6fb1ff", "glass"), grp2(q => q.pre, "#7fe3a0", "toughened")], { xMin: -0.5, xMax: 12.5, yMin: 0, yMax: 7 });
  let mx = 0; for (let i = 0; i < S.nb; i++) if (!S.broken[i] && S.e[i] > mx) mx = S.e[i]; const far = S.ext / S.Wx;
  read.set("a", S.sig.toFixed(2) + " GPa"); read.set("b", pct(S.ext / S.Wx)); read.set("c", far > 0.002 && !FRS.done ? "× " + (mx / far).toFixed(1) : "–"); read.set("d", S.broke); read.set("e", FRS.done ? S.max.toFixed(2) + " GPa" : "–");
  ui.hud(FRS.done ? "Broken: the crack ran right across" : S.broke ? "The crack is running" : "Bonds at the notch tip stretch most");
}
function chartsPoly() {
  const rub = P.pmat === "rubber", xm = rub ? Math.max(rubberBreak(P.xl) * 100 * 1.05, 50) : 520;
  chA.opts.title = rub ? "Stress–strain: loading and unloading (the loop is hysteresis)" : "Stress–strain for polythene"; chA.opts.xLabel = "strain (%)"; chA.opts.yLabel = "stress (MPa)"; chA.opts.xFmt = null;
  chA.draw([{ pts: PO.up, type: "area", color: "#6fb1ff", label: "loading (area = work in)" }, { pts: PO.down, type: "area", color: "#ff8a70", label: "unloading (area = work back)" }], { xMin: 0, xMax: xm, yMin: 0, yMax: rub ? Math.min(40, rubberUp(rubberBreak(P.xl), P.xl) * 1.1) : 36 });
  chB.opts.title = "Energy per m³: put in, given back, turned into heat"; chB.opts.xLabel = ""; chB.opts.yLabel = "MJ per m³"; chB.opts.xFmt = whole(v => ["work in", "work back", "lost as heat"][Math.round(v)] || "");
  chB.draw([{ pts: [[0, PO.Win], [1, PO.Wout], [2, Math.max(0, PO.Win - PO.Wout)]], type: "bars", w: 0.6, color: "#ffd166" }], { xMin: -0.6, xMax: 2.6, yMin: 0 });
  read.set("a", PO.sig.toFixed(2) + " MPa"); read.set("b", (PO.e * 100).toFixed(0) + "%"); read.set("c", rub ? (3 * 0.3 * P.xl).toFixed(1) + " MPa" : "0.8 GPa");
  read.set("d", PO.Win.toFixed(2) + " / " + PO.Wout.toFixed(2)); read.set("e", PO.broken ? "snapped" : PO.taut > 40 ? "many pulled straight" : PO.e > 0.5 ? "uncoiling, lining up" : "tangled");
  ui.hud(rub ? (PO.broken ? "Snapped" : PO.e > 0 && PO.dir < 0 ? "Released: cross-links pull the chains back into tangles" : "Stretching straightens the tangled chains") : PO.ep > 0.08 ? "Chains slide past each other and line up: it will not spring back" : "Polythene: no cross-links");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  ({ practical: () => { }, tensile: stepTensile, md: stepMD, grains: stepGrains, brittle: stepFrac, poly: stepPoly })[P.mode](dt);
}, () => {
  draw(); if (frame++ % 5) return;
  ({ practical: chartsPractical, tensile: chartsTensile, md: chartsMD, grains: chartsGrains, brittle: chartsFrac, poly: chartsPoly })[P.mode]();
  if (P.mode === "grains") ctl.gpull.textContent = DDS.dir ? "⏸ Stop" : "▶ Pull";
  if (P.mode === "brittle") ctl.fpull.textContent = FRS.dir ? "⏸ Stop" : "▶ Pull";
});
set({});
ui.tip("🔬 Measure E with Searle's method, pull samples to breaking in the 📈 Tensile test, then look inside: ⊥ Atoms, ▦ Grains, 💥 Brittle and 〰 Polymers", 8000);
