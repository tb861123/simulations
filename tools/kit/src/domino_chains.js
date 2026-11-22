/* =====================================================================
   DOMINO CHAIN REACTIONS
   A small rigid-body physics engine, written for this page. Every domino,
   ball and plank is a rigid body with a position, an angle, a velocity and
   a spin. Each time step (1/600 s):
     1. gravity changes every velocity (v += g·dt),
     2. the computer finds every pair of bodies that touch (contacts),
     3. it applies impulses at the contacts, again and again, until the
        bodies stop moving into each other and friction stops them sliding
        (the "sequential impulses" method used in most game engines),
     4. every body moves on: x += v·dt, angle += ω·dt.
   A standing domino stores energy (it is a tall, thin thing balanced on
   its edge). A small push tips it past its balance point; it falls,
   releasing that energy, and pushes the next one: a chain reaction.
   ===================================================================== */

// ---------------------------------------------------------------- physics (no drawing: the Batch run uses this too)
const G = 9.81, DT = 1 / 600, ITER = 12;
const DOM = { h: 0.048, t: 0.0075, m: 0.010 };   // a standard domino: 48 mm tall, 7.5 mm thick, 10 g
const PHYS = { ddMu: 0.25 };                     // friction between two dominoes (sliding over each other); the table grips more
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

let BID = 0;
function makeBody(o) {
  const b = Object.assign({ shape: "box", x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, mu: 0.4, e: 0, fixed: false, kind: "box", hw: 0.01, hh: 0.01, r: 0.01, m: 1 }, o);
  b.id = BID++;
  if (b.fixed) { b.invM = 0; b.invI = 0; }
  else { b.invM = 1 / b.m; const I = b.shape === "circle" ? 0.4 * b.m * b.r * b.r : b.m * ((2 * b.hw) ** 2 + (2 * b.hh) ** 2) / 12; b.invI = 1 / I; }
  return b;
}
// a domino of height h and thickness t standing with its base centre at (x, y)
const domino = (x, y, h = DOM.h, t = DOM.t, o = {}) => makeBody(Object.assign({ kind: "domino", x, y: y + h / 2, hw: t / 2, hh: h / 2, m: DOM.m * (h / DOM.h) ** 3, mu: 0.6 }, o));
const ball = (x, y, r, o = {}) => makeBody(Object.assign({ kind: "ball", shape: "circle", x, y, r, m: 7800 * 4 / 3 * Math.PI * r ** 3, mu: 0.3, e: 0.3 }, o));
// a fixed plank (ramp, shelf or the table) from (x1, y1) to (x2, y2), thickness th; its top surface runs along the line
function plank(x1, y1, x2, y2, th = 0.006, o = {}) {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
  return makeBody(Object.assign({ kind: "plank", fixed: true, x: (x1 + x2) / 2 + Math.sin(a) * th / 2, y: (y1 + y2) / 2 - Math.cos(a) * th / 2, a, hw: L / 2, hh: th / 2, mu: 0.4 }, o));
}

/* ---- Collision detection: for two bodies that overlap, a contact normal n (pointing from A to B) and up to two contact
   points, each with its separation (negative = overlapping by that much). */
function corners(b) { const c = Math.cos(b.a), s = Math.sin(b.a); return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => [b.x + c * i * b.hw - s * j * b.hh, b.y + s * i * b.hw + c * j * b.hh]); }
function boxBox(A, B) {
  const ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(B.a), sb = Math.sin(B.a), dx = B.x - A.x, dy = B.y - A.y;
  const axes = [[ca, sa, A, 0], [-sa, ca, A, 1], [cb, sb, B, 0], [-sb, cb, B, 1]];
  const proj = (b, nx, ny) => { const c = Math.cos(b.a), s = Math.sin(b.a); return b.hw * Math.abs(c * nx + s * ny) + b.hh * Math.abs(-s * nx + c * ny); };
  let best = null;
  for (const [nx, ny, owner, k] of axes) {
    const sep = Math.abs(dx * nx + dy * ny) - proj(A, nx, ny) - proj(B, nx, ny);
    if (sep > 0.0005) return null;
    // prefer A's faces unless B's are clearly better (stops the choice flickering between frames)
    if (!best || sep > best.sep + (owner === A ? 0 : 1e-5)) best = { sep, nx, ny, owner, k };
  }
  const ref = best.owner, inc = ref === A ? B : A; let nx = best.nx, ny = best.ny;
  if ((inc.x - ref.x) * nx + (inc.y - ref.y) * ny < 0) { nx = -nx; ny = -ny; }   // normal points from the reference box to the other one
  const eN = proj(ref, nx, ny), tx = -ny, ty = nx, eT = proj(ref, tx, ty);
  // the incident face: the face of the other box that faces back towards the reference box most squarely
  const ci = Math.cos(inc.a), si = Math.sin(inc.a), faces = [[ci, si, inc.hw, -si, ci, inc.hh], [-ci, -si, inc.hw, -si, ci, inc.hh], [-si, ci, inc.hh, ci, si, inc.hw], [si, -ci, inc.hh, ci, si, inc.hw]];
  let f = faces[0], fd = 9; for (const q of faces) { const d = q[0] * nx + q[1] * ny; if (d < fd) { fd = d; f = q; } }
  const fx = inc.x + f[0] * f[2], fy = inc.y + f[1] * f[2], pts = [[fx + f[3] * f[5], fy + f[4] * f[5]], [fx - f[3] * f[5], fy - f[4] * f[5]]];
  // clip that face to the sides of the reference face
  const tc = ref.x * tx + ref.y * ty; let P = pts;
  for (const [sgn, lim] of [[1, tc + eT], [-1, -(tc - eT)]]) {
    const d0 = sgn * (P[0][0] * tx + P[0][1] * ty) - lim, d1 = sgn * (P[1][0] * tx + P[1][1] * ty) - lim, out = [];
    if (d0 <= 0) out.push(P[0]); if (d1 <= 0) out.push(P[1]);
    if (d0 * d1 < 0) { const u = d0 / (d0 - d1); out.push([P[0][0] + u * (P[1][0] - P[0][0]), P[0][1] + u * (P[1][1] - P[0][1])]); }
    if (out.length < 2) { if (!out.length) return null; P = [out[0], out[0]]; } else P = out.slice(0, 2);
  }
  const cs = [];
  for (const p of (P[0] === P[1] ? [P[0]] : P)) { const sep = (p[0] - ref.x) * nx + (p[1] - ref.y) * ny - eN; if (sep < 0.0005) cs.push({ x: p[0] - nx * sep / 2, y: p[1] - ny * sep / 2, sep }); }
  if (!cs.length) return null;
  return ref === A ? { nx, ny, cs } : { nx: -nx, ny: -ny, cs };
}
function circleBox(C, B, flip) {
  const c = Math.cos(B.a), s = Math.sin(B.a), dx = C.x - B.x, dy = C.y - B.y, lx = c * dx + s * dy, ly = -s * dx + c * dy;
  let qx = Math.max(-B.hw, Math.min(B.hw, lx)), qy = Math.max(-B.hh, Math.min(B.hh, ly)), nxl, nyl, d;
  if (qx === lx && qy === ly) {   // the centre is inside the box: push out through the nearest face
    const px = B.hw - Math.abs(lx), py = B.hh - Math.abs(ly);
    if (px < py) { nxl = Math.sign(lx) || 1; nyl = 0; qx = nxl * B.hw; d = -px; } else { nxl = 0; nyl = Math.sign(ly) || 1; qy = nyl * B.hh; d = -py; }
  } else { const ex = lx - qx, ey = ly - qy; d = Math.hypot(ex, ey); if (d > C.r + 0.0005) return null; nxl = ex / d; nyl = ey / d; }
  const nx = c * nxl - s * nyl, ny = s * nxl + c * nyl, px = B.x + c * qx - s * qy, py = B.y + s * qx + c * qy, sep = d - C.r;
  // normal from the box to the circle; flip so it points from A to B
  return flip ? { nx: -nx, ny: -ny, cs: [{ x: px, y: py, sep }] } : { nx, ny, cs: [{ x: px, y: py, sep }] };
}
function circleCircle(A, B) { const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d > A.r + B.r + 0.0005 || d === 0) return null; const nx = dx / d, ny = dy / d; return { nx, ny, cs: [{ x: A.x + nx * A.r, y: A.y + ny * A.r, sep: d - A.r - B.r }] }; }
function collide(A, B) {
  if (A.shape === "box" && B.shape === "box") return boxBox(A, B);
  if (A.shape === "circle" && B.shape === "circle") return circleCircle(A, B);
  return A.shape === "circle" ? circleBox(A, B, true) : circleBox(B, A, false);
}
const radius = b => b.shape === "circle" ? b.r : Math.hypot(b.hw, b.hh);

/* ---- The world: bodies, pivots (a plank pinned to a fixed point, e.g. a see-saw lever) and the step. */
class World {
  constructor() { this.bodies = []; this.pins = []; this.arb = new Map(); this.t = 0; }
  add(b) { this.bodies.push(b); return b; }
  pin(b, px, py) { const c = Math.cos(b.a), s = Math.sin(b.a), dx = px - b.x, dy = py - b.y; this.pins.push({ b, lx: c * dx + s * dy, ly: -s * dx + c * dy, px, py, Px: 0, Py: 0 }); }
  step(dt = DT) {
    const bs = this.bodies, n = bs.length, arbs = new Map();
    for (const b of bs) if (!b.fixed) b.vy -= G * dt;                       // 1. gravity
    // 2. find the touching pairs (a quick distance check first), keeping last step's impulses where a contact persists
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = bs[i], B = bs[j]; if (A.fixed && B.fixed) continue;
      const rr = radius(A) + radius(B); if (Math.abs(A.x - B.x) > rr || Math.abs(A.y - B.y) > rr) continue;
      const m = collide(A, B); if (!m) continue;
      const key = A.id * 100000 + B.id, old = this.arb.get(key);
      for (const c of m.cs) { c.Pn = 0; c.Pt = 0; if (old) for (const o of old.cs) if (Math.hypot(o.x - c.x, o.y - c.y) < 0.002) { c.Pn = o.Pn; c.Pt = o.Pt; break; } }
      m.A = A; m.B = B; m.mu = A.kind === "domino" && B.kind === "domino" ? PHYS.ddMu : Math.sqrt(A.mu * B.mu); m.e = Math.max(A.e, B.e); arbs.set(key, m);
    }
    this.arb = arbs;
    // prepare each contact: its "effective mass" along the normal and along the surface, and a small push-apart (bias) for any overlap
    for (const m of arbs.values()) {
      const { A, B, nx, ny } = m, tx = -ny, ty = nx;
      for (const c of m.cs) {
        const rax = c.x - A.x, ray = c.y - A.y, rbx = c.x - B.x, rby = c.y - B.y;
        const rnA = cross(rax, ray, nx, ny), rnB = cross(rbx, rby, nx, ny), rtA = cross(rax, ray, tx, ty), rtB = cross(rbx, rby, tx, ty);
        c.mN = 1 / (A.invM + B.invM + A.invI * rnA * rnA + B.invI * rnB * rnB); c.mT = 1 / (A.invM + B.invM + A.invI * rtA * rtA + B.invI * rtB * rtB);
        c.rax = rax; c.ray = ray; c.rbx = rbx; c.rby = rby;
        const vn = (B.vx - B.w * rby - A.vx + A.w * ray) * nx + (B.vy + B.w * rbx - A.vy - A.w * rax) * ny;
        c.bias = -0.2 / dt * Math.min(0, c.sep + 0.0002) + (vn < -0.3 ? -m.e * vn : 0);
        // warm start: re-apply last step's impulses, so stacks settle quickly
        const Px = c.Pn * nx + c.Pt * tx, Py = c.Pn * ny + c.Pt * ty; impulse(A, B, c, -Px, -Py);
      }
    }
    for (const p of this.pins) { p.Px *= 0.9; p.Py *= 0.9; }
    // 3. sequential impulses: nudge each contact in turn until nothing is moving into anything else
    for (let it = 0; it < ITER; it++) {
      for (const m of arbs.values()) {
        const { A, B, nx, ny } = m, tx = -ny, ty = nx;
        for (const c of m.cs) {
          let dvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray, dvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
          const vn = dvx * nx + dvy * ny; let dPn = c.mN * (-vn + c.bias); const P0 = c.Pn; c.Pn = Math.max(P0 + dPn, 0); dPn = c.Pn - P0;   // contacts push, never pull
          impulse(A, B, c, -dPn * nx, -dPn * ny);
          dvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray; dvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
          const vt = dvx * tx + dvy * ty, maxF = m.mu * c.Pn; let dPt = c.mT * -vt; const T0 = c.Pt; c.Pt = Math.max(-maxF, Math.min(maxF, T0 + dPt)); dPt = c.Pt - T0;   // friction: at most μ × the push
          impulse(A, B, c, -dPt * tx, -dPt * ty);
        }
      }
      for (const p of this.pins) pinSolve(p, dt);
    }
    // 4. move
    for (const b of bs) if (!b.fixed) { b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; }
    this.t += dt;
  }
}
// apply an impulse (Px, Py) to A at its contact point and the opposite impulse to B
function impulse(A, B, c, Px, Py) {
  A.vx += Px * A.invM; A.vy += Py * A.invM; A.w += A.invI * cross(c.rax, c.ray, Px, Py);
  B.vx -= Px * B.invM; B.vy -= Py * B.invM; B.w -= B.invI * cross(c.rbx, c.rby, Px, Py);
}
// a pin: keeps a point on the plank at a fixed place (the plank can still turn about it)
function pinSolve(p, dt) {
  const b = p.b, c = Math.cos(b.a), s = Math.sin(b.a), rx = c * p.lx - s * p.ly, ry = s * p.lx + c * p.ly;
  const ex = b.x + rx - p.px, ey = b.y + ry - p.py, vx = b.vx - b.w * ry, vy = b.vy + b.w * rx;
  const k11 = b.invM + b.invI * ry * ry, k12 = -b.invI * rx * ry, k22 = b.invM + b.invI * rx * rx, det = k11 * k22 - k12 * k12;
  const bx = -vx - 0.2 / dt * ex, by = -vy - 0.2 / dt * ey, Px = (k22 * bx - k12 * by) / det, Py = (k11 * by - k12 * bx) / det;
  b.vx += Px * b.invM; b.vy += Py * b.invM; b.w += b.invI * cross(rx, ry, Px, Py);
}
const tilt = b => Math.abs(Math.atan2(Math.sin(b.a), Math.cos(b.a)));

/* ---- A line of dominoes on a table. pitch = distance from one domino to the next (front face to front face).
   jitter: random placement error (m). Returns the world and the dominoes in order. The first one gets a gentle push. */
function dominoLine(n, pitch, o = {}) {
  const w = new World(), h = o.h || DOM.h, t = o.t || DOM.t, r = o.rand || Math.random, ds = [], grow = o.grow || 1;
  w.add(plank(-0.5, 0, 50, 0, 0.02, { kind: "table", mu: 0.5 }));
  let x = 0.02, hh = h, tt = t;
  for (let i = 0; i < n; i++) {
    ds.push(w.add(domino(x + (o.jitter || 0) * (2 * r() - 1), 0, hh, tt)));
    const step = pitch * (grow === 1 ? 1 : hh / h); hh *= grow; tt *= grow; x += grow === 1 ? pitch : step * (1 + grow) / 2;
  }
  return { w, ds };
}
// tip a domino forwards by giving it a little spin (as a fingertip push does)
function push(d, strength = 1) { d.w = -strength * Math.sqrt(G / (2 * d.hh)) * 0.9; d.vx = -d.w * d.hh * 0.5; }
// run a line until the toppling stops; records when each domino tipped past 30°
function runLine(L, tMax = 6) {
  const tt = L.ds.map(() => null); push(L.ds[0]); let last = 0;
  while (L.w.t < tMax) {
    for (let k = 0; k < 6; k++) L.w.step();
    L.ds.forEach((d, i) => { if (tt[i] == null && tilt(d) > 0.52) { tt[i] = L.w.t; last = L.w.t; } });
    if (tt[tt.length - 1] != null || L.w.t - last > 0.6) break;
  }
  return tt;
}
// wave speed from the topple times of dominoes i0..i1 (a straight-line fit of position against time)
function frontSpeed(L, tt, i0, i1) {
  const pts = []; for (let i = i0; i <= i1; i++) if (tt[i] != null) pts.push([tt[i], L.ds[i].x]);
  if (pts.length < 4) return null; const mt = pts.reduce((a, p) => a + p[0], 0) / pts.length, mx = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  let num = 0, den = 0; for (const [t, x] of pts) { num += (t - mt) * (x - mx); den += (t - mt) ** 2; } return num / den;
}
/* ---- A published model of the wave speed (van Leeuwen, "The domino effect", 2004; frictionless, inelastic).
   The fallen dominoes lean on each other in a "train": if the domino ahead is tilted by θa, the one behind it, whose
   front top corner rests on the back face of the one ahead, is tilted by θb = θa + asin((d cos θa − t)/h).
   So the whole train moves as one object with one angle, the front domino's. Between collisions its energy is
   conserved: ½ I_eff ω² + (potential energy of every domino) = constant. When the front domino's top corner reaches
   the next domino (h sin θ = d − t) that domino joins the train; the collision is "sticky" (inelastic), so the new
   train's speed is found from momentum-like bookkeeping (no energy is created). The wave settles to a steady speed:
   one spacing d per time T between collisions. d = spacing (pitch), h = height, t = thickness. */
function trainAngles(th0, d, h, t, kMax = 40) {   // angles of the whole train, front first, and dθ_j/dθ_front
  const th = [th0], dd = [1];
  for (let j = 1; j < kMax; j++) {
    const a = th[j - 1], q = (d * Math.cos(a) - t) / h; if (q <= -1 || q >= 1) break;
    const b = a + Math.asin(q); if (b > Math.PI / 2 - 0.02) break;     // lying almost flat: it stops counting
    th.push(b); dd.push(dd[j - 1] * (1 - d * Math.sin(a) / h / Math.sqrt(1 - q * q)));
  }
  return { th, dd };
}
function modelSpeed(d, h, t = DOM.t) {
  if (d - t >= h || d <= t) return 0;
  const thc = Math.asin((d - t) / h), Ip = (h * h + t * t) / 3;      // per unit mass: moment of inertia about the pivot edge
  const V = th => trainAngles(th, d, h, t).th.reduce((s, a) => s + G * (h / 2 * Math.cos(a) + t / 2 * Math.sin(a)), 0);
  const Ieff = th => Ip * trainAngles(th, d, h, t).dd.reduce((s, c) => s + c * c, 0);
  let w = Math.sqrt(G / h), T = 0, Tprev = 0;                         // start: one domino, pushed
  for (let n = 0; n < 40; n++) {
    // fall from θ = 0 to θc with the train's energy conserved
    const E = 0.5 * Ieff(0) * w * w + V(0), N = 120; T = 0; let wEnd = w;
    for (let i = 0; i < N; i++) { const th = (i + 0.5) / N * thc, k = E - V(th); if (k <= 0) return 0; T += (thc / N) / Math.sqrt(2 * k / Ieff(th)); }
    wEnd = Math.sqrt(Math.max(0, 2 * (E - V(thc)) / Ieff(thc)));
    // collision: the front domino (at θc) hits a new upright one, which becomes the new front
    const old = trainAngles(thc, d, h, t), neu = trainAngles(0, d, h, t), m = Math.min(old.dd.length + 1, neu.dd.length);
    let num = 0, den = 0; for (let j = 0; j < m; j++) { const c = neu.dd[j], before = j === 0 ? 0 : old.dd[j - 1] * wEnd; num += c * before; den += c * c; }
    w = num / den;
    if (n > 5 && Math.abs(T - Tprev) < 1e-6 * T) break; Tprev = T;
  }
  return d / T;
}
// ---------------------------------------------------------------- end of physics

// ---------------------------------------------------------------- scenes
// the highest fixed surface under x (at or below height yMax): where a new domino or ball should stand
function surfaceAt(w, x, yMax = 9) {
  let best = -Infinity;
  for (const b of w.bodies) {
    if (!b.fixed) continue; const c = Math.cos(b.a), s = Math.sin(b.a); if (Math.abs(c) < 0.2) continue;
    const lx = (x - b.x + s * b.hh) / c; if (Math.abs(lx) > b.hw) continue;
    const y = b.y + s * lx + c * b.hh; if (y <= yMax + 0.002 && y > best) best = y;
  }
  return best === -Infinity ? null : best;
}
const PRESETS = {
  classic: { name: "Classic line", info: "40 dominoes, spaced at half their height." },
  spacing: { name: "Wider and wider", info: "The gaps grow along the line. Where does the wave stop?" },
  amplifier: { name: "Domino amplifier", info: "Each domino is 1.35 times taller than the one before: a 12 mm domino ends up toppling one 18 cm tall." },
  stairs: { name: "Down the stairs", info: "A line that steps down three shelves." },
  ballrun: { name: "Ball run", info: "Dominoes push a steel ball down a ramp; it starts a second line." },
  split: { name: "Two-way split", info: "A ball drops between two back-to-back dominoes and wedges them apart: two waves run opposite ways." },
  empty: { name: "Empty table", info: "Build your own with the tools." },
};
function buildPreset(key, o) {
  const w = new World(), ds = [], h = o.h, t = h * DOM.t / DOM.h, p = o.pitch;
  w.add(plank(-1, 0, 3, 0, 0.03, { kind: "table", mu: 0.6 }));
  const row = (x0, y0, n, pitch, dir = 1) => { for (let i = 0; i < n; i++) ds.push(w.add(domino(x0 + dir * i * pitch, y0, h, t))); };
  if (key === "classic") row(0.03, 0, 40, p);
  if (key === "spacing") { let x = 0.03; for (let i = 0; i < 30; i++) { ds.push(w.add(domino(x, 0, h, t))); x += h * (0.35 + 0.035 * i) + t; } }
  if (key === "amplifier") { let hh = 0.012, x = 0.03; const g = o.grow || 1.35; for (let i = 0; i < 10; i++) { ds.push(w.add(domino(x, 0, hh, hh * 0.15))); x += hh * 0.075 + 0.6 * hh + hh * g * 0.075; hh *= g; } }
  if (key === "stairs") { for (let k = 0; k < 4; k++) { const y = 0.09 - k * 0.03, x0 = k * 0.32; if (y > 0) w.add(plank(x0 - 0.02, y, x0 + 0.32, y, 0.012)); row(x0 + 0.02, Math.max(0, y), Math.floor(0.29 / p) + 1, p); } }
  if (key === "ballrun") {
    w.add(plank(-0.02, 0.12, 0.42, 0.12, 0.012)); row(0.02, 0.12, Math.floor(0.3 / p), p);
    const nb = Math.floor(0.3 / p); row(0.02, 0.12, 0, p); w.add(ball(0.02 + (nb - 1) * p + (o.boff || 0.028), 0.12 + (o.br || 0.016), o.br || 0.016));
    w.add(plank(0.44, 0.105, 0.70, 0.035, 0.008));                       // the ramp: the ball flies off its end into the next line
    row(o.bx || 0.74, 0, 18, p);
  }
  if (key === "split") {
    // two lines back to back, with a small gap in the middle; a ball dropped into the gap wedges them apart
    const gap = h * 0.35, c = 0.6;
    for (let i = 0; i < 14; i++) ds.push(w.add(domino(c + gap / 2 + t / 2 + i * p, 0, h, t)));
    for (let i = 0; i < 14; i++) ds.push(w.add(domino(c - gap / 2 - t / 2 - i * p, 0, h, t)));
    w.dropBall = [c, h + 0.05, gap * 0.75];
  }
  return { w, ds };
}

// ---------------------------------------------------------------- page state
const S = {};
let preset = "classic", W = null, dom = [], speed = 0.5, tool = "push", spacingR = 0.5, heightMM = 48, frame = 0, drag = null, hover = null;
let fallT = new Map(), hist = { x: [], ke: [] }, t0 = 0, started = false, glowOn = true;
const ui = K.app({
  title: "Domino Chain Reactions", subject: "Engineering", blurb: "Set up dominoes, ramps and balls, give one a nudge, and watch the energy run down the line.",
  reset: () => load(preset),
  missions: [
    { title: "One small push", q: "Click the first domino (with the <b>Push</b> tool) to tip it. Watch the top chart: the toppling front moves along at a steady speed. How fast? Where did all that energy come from?",
      hint: "Each standing domino stores gravitational potential energy: its centre of mass is high. Your push only has to lift the first one past its tipping point (its centre over its front edge). After that, every domino falling releases its own energy, which tips the next. The wave runs at a steady speed, about 1 m/s for ordinary dominoes.",
      setup: () => { S.preset.set("classic"); load("classic"); } },
    { title: "How far apart?", q: "Change the <b>spacing</b> and load the classic line again. Try 0.2, 0.5 and 0.9 of the height. Which is fastest? What happens at more than one height apart?",
      hint: "Close together, each domino only has to tip a little before it hits the next, so the wave is quick. Far apart, each falls further first. More than about one height (plus a thickness) apart, a domino lands flat without reaching the next one and the wave stops dead. The 'Wider and wider' line shows exactly where.",
      setup: () => { S.sp.set(0.2, true); S.preset.set("classic"); load("classic"); } },
    { title: "Where does it stop?", q: "Load <b>Wider and wider</b>: the gaps grow along the line. Push the first domino. Which gap stops the wave? Measure it with the domino height.",
      hint: "It stops where the gap between one domino's front and the next one's back is a little more than the height: the falling domino's top can no longer reach. Before that, the wave slows down as the gaps grow.",
      setup: () => { S.preset.set("spacing"); load("spacing"); } },
    { title: "Friction matters", q: "Set friction between dominoes to 0, push, and read the front speed. Then set it to 0.5. Compare both with the <b>model</b> readout (van Leeuwen's frictionless model).",
      hint: "With no friction the simulation agrees with van Leeuwen's model to a few per cent. Real dominoes rub as they slide over each other, which wastes energy, so real waves are slower (about 30% here). A good model tells you what you have left out.",
      setup: () => { S.mu.set(0, true); S.preset.set("classic"); load("classic"); } },
    { title: "The domino amplifier", q: "Each domino is 1.35 times taller than the one before. Push the tiny first one (12 mm). Can it really knock over the last one, 15 times taller and 3000 times heavier?",
      hint: "Yes: the energy that tips each domino is not the push from the one before but its own stored potential energy. A small domino only has to lift a big one slightly to tip it. This is an amplifier: a tiny input releases a huge output. Lorne Whitehead (1983) showed that real dominoes can grow by about 1.5 times each step; in this model the collisions are not springy, so the limit is about 1.4 (see the Batch run).",
      setup: () => { S.preset.set("amplifier"); load("amplifier"); } },
    { title: "Two ways at once", q: "Load <b>Two-way split</b> and press <b>Drop the ball</b>. The ball wedges between two back-to-back dominoes. Do the two waves travel at the same speed?",
      hint: "They do (within the wobble of the start): the speed of the wave depends on the dominoes and their spacing, not on how hard the first one was pushed. However it starts, the wave settles to the same steady speed. That is the signature of a wave carried by the medium itself.",
      setup: () => { S.preset.set("split"); load("split"); } },
    { title: "Build a contraption", q: "Load <b>Ball run</b> and push the first domino. Then build your own: use the tools to add rows of dominoes, ramps, balls and see-saws. Can you make a chain that changes direction?",
      hint: "Energy is passed on in different forms: gravitational potential energy to kinetic energy of the dominoes, then of the rolling ball, back to the dominoes. Each step loses some energy as heat and sound, so every stage must be 'set' (store its own energy), as dominoes and balls on slopes do.",
      setup: () => { S.preset.set("ballrun"); load("ballrun"); } },
  ],
  batch: [
    { title: "Wave speed vs spacing (no friction)", question: "How does the spacing change the speed of the wave? Does a published model get it right?", how: "30 standard dominoes (48 mm × 7.5 mm), no friction between dominoes. Each is placed within ±0.3 mm of its spot. The speed is measured over dominoes 10 to 26.",
      xLabel: "spacing ÷ height (d/h)", yLabel: "wave speed (m/s)", xs: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], reps: 3, yMin: 0,
      run: (x, r) => { const mu0 = PHYS.ddMu; PHYS.ddMu = 0; const L = dominoLine(30, x * DOM.h, { jitter: 0.0003, rand: r }); const v = frontSpeed(L, runLine(L), 10, 26); PHYS.ddMu = mu0; return v; },
      theory: x => modelSpeed(x * DOM.h, DOM.h), theoryLabel: "van Leeuwen's model (2004)",
      note: "The model treats the fallen dominoes as a train leaning on each other, with sticky collisions and no friction. It agrees with the simulation to a few per cent. Closer spacing means a faster wave; at d/h ≈ 1.16 (height plus thickness) the dominoes can no longer reach each other." },
    { title: "Friction slows the wave", question: "How much does friction between the dominoes slow the wave?", how: "30 standard dominoes at d/h = 0.5; friction between dominoes from 0 to 0.5.",
      xLabel: "friction between dominoes (μ)", yLabel: "wave speed (m/s)", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5], reps: 3, yMin: 0,
      run: (x, r) => { const mu0 = PHYS.ddMu; PHYS.ddMu = x; const L = dominoLine(30, 0.5 * DOM.h, { jitter: 0.0003, rand: r }); const v = frontSpeed(L, runLine(L), 10, 26); PHYS.ddMu = mu0; return v; },
      theory: () => modelSpeed(0.5 * DOM.h, DOM.h), theoryLabel: "model without friction",
      note: "Each fallen domino slides down the back of the next one. Friction turns some of the energy into heat, so the train pushes less hard and the wave is slower. Real dominoes (μ about 0.2–0.3) run about 25–35% slower than the frictionless model." },
    { title: "Bigger dominoes, faster wave", question: "If every domino (and the spacing) is scaled up, how does the speed change?", how: "Dominoes of different heights, all the same shape, spaced at half their height; friction 0.25.",
      xLabel: "domino height (mm)", yLabel: "wave speed (m/s)", xs: [12, 24, 48, 96, 192], reps: 3, yMin: 0,
      run: (x, r) => { const h = x / 1000, L = dominoLine(30, 0.5 * h, { h, t: h * DOM.t / DOM.h, jitter: 0.0003 * h / DOM.h, rand: r }); return frontSpeed(L, runLine(L, 12), 10, 26); },
      theory: x => modelSpeed(0.5 * x / 1000, x / 1000, x / 1000 * DOM.t / DOM.h) * 0.71, theoryLabel: "∝ √h (model × 0.71, the friction factor)",
      note: "Everything about a falling domino scales with √(g h): the wave speed is proportional to the square root of the height. Four times taller, twice as fast. The theory line is the frictionless model scaled by 0.71 (the slowing found in the friction experiment); only its shape is being tested." },
    { title: "Does the wave get through?", question: "How likely is the wave to reach the end of a line of 15, as the spacing grows?", how: "15 standard dominoes; each placed within ±2 mm of its spot, so the gaps vary. Result = 1 if all 15 fall.",
      xLabel: "spacing ÷ height (d/h)", yLabel: "chance the wave gets through", xs: [0.6, 0.8, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3], reps: 8, yMin: 0, yMax: 1.05,
      run: (x, r) => { const L = dominoLine(15, x * DOM.h, { jitter: 0.002, rand: r }); const tt = runLine(L, 4); return tt.every(t => t != null) ? 1 : 0; },
      theory: x => x * DOM.h - DOM.t < DOM.h ? 1 : 0, theoryLabel: "reaches if gap < height (d − t < h)",
      note: "A domino can only reach the next one if the gap between them (spacing minus thickness) is less than its height. Near the limit, small placement errors decide it: one slightly-too-wide gap anywhere stops the whole wave, so the success rate falls off before the theoretical limit." },
    { title: "How fast can an amplifier grow?", question: "If each domino is bigger than the last by a factor k, how big can k be?", how: "10 dominoes, the first 12 mm tall, each k times taller (and thicker, and further on) than the one before. Result = how many fall. Placement within ±0.5% of size.",
      xLabel: "growth factor k", yLabel: "dominoes that fall (of 10)", xs: [1.1, 1.2, 1.3, 1.35, 1.4, 1.5, 1.6], reps: 3, yMin: 0, yMax: 10.5,
      run: (x, r) => { const w = new World(); w.add(plank(-1, 0, 5, 0, 0.03, { kind: "table", mu: 0.6 })); const ds = []; let hh = 0.012, xx = 0.03; for (let i = 0; i < 10; i++) { ds.push(w.add(domino(xx + hh * 0.005 * (2 * r() - 1), 0, hh, hh * 0.15))); xx += hh * 0.075 + 0.6 * hh + hh * x * 0.075; hh *= x; } push(ds[0], 1.3); for (let i = 0; i < 600 * 6; i++) w.step(); return ds.filter(d => tilt(d) > 0.5).length; },
      note: "The bigger domino is k³ times heavier. With bouncy real dominoes Whitehead reached k = 1.5; here, collisions are not springy and less of the falling domino's momentum is passed on, so the chain fails above about k = 1.4." },
  ],
  notes: `<h3>What is being calculated</h3><p>A small 2-D rigid-body engine, written for this page. Each body (domino, ball, see-saw) has a position, an angle, a velocity and a spin. Every 1/600 s: gravity changes the velocities; the computer finds every pair of bodies that touch and where (up to two contact points each); it applies impulses at the contacts, 12 times round, until nothing is moving into anything else and friction (at most μ × the push) stops sliding; then everything moves on. This "sequential impulses" method is the one used in game physics engines.</p>
  <h3>Why the wave travels</h3><p>A standing domino has its centre of mass high up, so it stores gravitational potential energy. Tipping it past the point where its centre is over its front edge needs only a little energy; it then falls, releasing much more, and pushes the next. The wave speed depends on the dominoes and the spacing, not on the first push.</p>
  <h3>The model readout</h3><p>van Leeuwen (2004) modelled fallen dominoes as a train leaning on each other with no friction and sticky collisions. It predicts the steady speed for a given spacing, height and thickness. The simulation with friction set to 0 agrees with it to a few per cent; real friction slows the wave.</p>
  <h3>Assumptions and simplifications</h3><ul><li>2-D: dominoes, balls and planks are seen side-on and cannot twist sideways, so a line cannot curve or branch on the table (the Two-way split shows two lines started at once instead).</li><li>Bodies are perfectly rigid; collisions between dominoes are not springy (no bounce), balls bounce a little (coefficient of restitution 0.3).</li><li>Dominoes have the sizes of real ones (48 × 7.5 mm, 10 g); bigger ones are scaled in every direction.</li><li>Friction is the same everywhere it acts (table 0.6, domino on domino 0.25 unless changed, ball 0.3); there is no rolling resistance or air resistance.</li><li>Time steps of 1/600 s, so very fast impacts are slightly smoothed.</li><li>A domino counts as "fallen" once it has tipped 30°.</li></ul>
  <h3>Mouse</h3><p>Choose a tool, then click or drag on the table. Push: click a domino to tip it (it falls away from the side you click). Row: drag along a surface. Ramp: drag from one end to the other. Right-drag to pan, wheel to zoom.</p>`,
});

// ---------------------------------------------------------------- controls
let g = ui.group("Scene");
S.preset = K.seg(g, { value: preset, options: Object.entries(PRESETS).map(([k, v]) => [k, v.name]), on: v => load(v) });
const preNote = K.note(g, "");
{ const r = K.row(g); K.btn(r, "👉 Push the first domino", () => pushFirst(), "primary"); S.drop = K.btn(r, "Drop the ball", () => dropBall()); K.btn(r, "↺ Set up again", () => load(preset)); }
g = ui.group("Dominoes");
S.sp = K.slider(g, { label: "Spacing (÷ height)", min: 0.2, max: 1.3, step: 0.05, value: 0.5, fmt: v => v.toFixed(2) + " (" + (v * heightMM).toFixed(0) + " mm)", on: v => { spacingR = v; }, tip: "Distance from one domino to the next, as a fraction of the height. Used by the presets and the Row tool." });
S.h = K.slider(g, { label: "Height of new dominoes", min: 12, max: 192, step: 6, value: 48, fmt: v => v + " mm" + (v === 48 ? " (standard)" : ""), on: v => { heightMM = v; S.sp.set(spacingR); } });
S.mu = K.slider(g, { label: "Friction between dominoes", min: 0, max: 0.6, step: 0.05, value: PHYS.ddMu, fmt: v => "μ = " + v.toFixed(2) + (v === 0 ? " (none: like the model)" : ""), on: v => { PHYS.ddMu = v; } });
K.note(g, "Spacing and height apply when you load a preset or draw a row.");
g = ui.group("Tools");
S.tool = K.seg(g, { value: tool, options: [["push", "Push"], ["domino", "Domino"], ["row", "Row"], ["ball", "Ball"], ["ramp", "Ramp"], ["seesaw", "See-saw"], ["delete", "Delete"]], on: v => tool = v });
const toolNote = K.note(g, "");
g = ui.group("View");
S.speed = K.slider(g, { label: "Speed (slow motion)", min: 0.05, max: 1.5, step: 0.05, value: 0.5, fmt: v => v.toFixed(2) + "×", on: v => speed = v });
S.glow = K.toggle(g, { label: "Light up each domino as it falls", value: true, on: v => glowOn = v });
{ const r = K.row(g); K.btn(r, "Fit view", () => fitView()); K.btn(r, "📷 Screenshot", () => glOn ? K.gl.screenshot("dominoes", gv.el, cv.el) : K.gl.screenshot("dominoes", cv.el)); }
ui.headerSpeed(S.speed, { label: "Speed" });
g = ui.group("Measurements");
const read = K.readout(g, [["n", "Fallen"], ["v", "Front speed (measured)"], ["m", "Model (no friction)"], ["r", "v ÷ √(gh)"], ["t", "Time"], ["ke", "Kinetic energy now"]]);
const chA = K.chart(ui.dock, { title: "Where the toppling front is", xLabel: "time (s)", yLabel: "position (m)" });
const chB = K.chart(ui.dock, { title: "Kinetic energy of everything", xLabel: "time (s)", yLabel: "mJ" });
const TOOL_TIPS = { push: "Click a domino to tip it over (away from the side you click).", domino: "Click on a surface to stand a domino there.", row: "Drag along a surface to stand a row of dominoes at the chosen spacing.", ball: "Click to place a steel ball.", ramp: "Drag from one end to the other to fix a ramp or shelf.", seesaw: "Click to place a see-saw (a plank on a pivot).", delete: "Click something to remove it." };

// ---------------------------------------------------------------- scenes and actions
function load(k) {
  preset = k; S.preset.set(k); preNote.textContent = PRESETS[k].info;
  const std = k === "ballrun", built = buildPreset(k, { h: std ? DOM.h : heightMM / 1000, pitch: std ? 0.5 * DOM.h : spacingR * heightMM / 1000 });
  W = built.w; dom = built.ds; fallT = new Map(); hist = { x: [], ke: [] }; started = false; t0 = 0;
  S.drop.style.display = W.dropBall ? "" : "none"; fitView();
}
function pushFirst() { const d = dom.length ? dom.reduce((a, b) => (b.flipped ? a : (a && a.x < b.x ? a : b)), null) : null; if (!d) return; push(d, 1.2); start(); ui.setPlaying(true); }
function dropBall() { if (!W.dropBall) return; const [x, y, r] = W.dropBall; W.add(ball(x, y, r)); W.dropBall = null; S.drop.style.display = "none"; start(); ui.setPlaying(true); }
function start() { if (!started) { started = true; t0 = W.t; } }
const isDomino = b => b.kind === "domino";
function step(dt) {
  if (!W) return; const n = Math.max(1, Math.round(dt * speed / DT));
  for (let i = 0; i < n; i++) W.step();
  for (const b of W.bodies) if (isDomino(b) && !fallT.has(b.id) && tilt(b) > 0.52) { fallT.set(b.id, W.t); start(); }
  if (started && frame % 2 === 0) {
    let fx = null, ke = 0; for (const b of W.bodies) { if (b.fixed) continue; ke += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy) + 0.5 * b.w * b.w / b.invI; if (fallT.has(b.id)) fx = fx == null ? b.x : Math.max(fx, b.x); }
    if (fx != null) hist.x.push([W.t - t0, fx]); hist.ke.push([W.t - t0, ke * 1000]);
    for (const k in hist) if (hist[k].length > 2500) hist[k] = hist[k].filter((p, i) => i % 2 === 0);
  }
}
// measured front speed: slope of position against time over the last 12 dominoes to fall in the main (rightward) direction
function measured() {
  const pts = dom.filter(d => fallT.has(d.id) && !d.flipped).map(d => [fallT.get(d.id), d.x]).sort((a, b) => a[0] - b[0]).slice(-14, -2);
  if (pts.length < 5) return null; const f = K.linfit(pts); return Math.abs(f.m);
}

// ---------------------------------------------------------------- camera (metres, y up; the table top is y = 0)
const cam = { x: 0.5, y: 0.05, s: 900 };
const cv = ui.canvas(() => { if (!cam.fitted) requestAnimationFrame(fitView); });
function fitView() {
  if (!W || cv.w < 10) return; cam.fitted = true; let x0 = Infinity, x1 = -Infinity, y1 = 0.06;
  for (const b of W.bodies) { if (b.kind === "table") continue; const r = radius(b); x0 = Math.min(x0, b.x - r); x1 = Math.max(x1, b.x + r); y1 = Math.max(y1, b.y + r); }
  if (!isFinite(x0)) { x0 = 0; x1 = 1; }
  if (W.dropBall) y1 = Math.max(y1, W.dropBall[1] + 0.03);
  x0 -= 0.04; x1 += 0.04; const y0 = -0.035; y1 += 0.03;
  cam.s = Math.min(cv.w / (x1 - x0), cv.h / (y1 - y0)); cam.x = (x0 + x1) / 2;
  cam.y = y0 + 0.45 * cv.h / cam.s; if ((y1 - cam.y) * cam.s > 0.5 * cv.h) cam.y = (y0 + y1) / 2;   // keep the table low on the screen, with the wall above
}
const SX = x => cv.w / 2 + (x - cam.x) * cam.s, SY = y => cv.h / 2 - (y - cam.y) * cam.s, WX = px => cam.x + (px - cv.w / 2) / cam.s, WY = py => cam.y - (py - cv.h / 2) / cam.s;
// domino colours: a rainbow along the table, so the wave can be followed
const hueCol = (x) => { /* hue in degrees, then HSL to RGB */ const hh = ((x - cam.x) * cam.s / cv.w + 0.5) * 300 + 190; const f = n => { const k = (n + hh / 30) % 12; return 0.5 - 0.42 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; };

// ---------------------------------------------------------------- WebGL drawing
const BG_FS = `precision highp float;
uniform vec2 uRes, uO; uniform float uDpr, uS, uTime;
float hash(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 px = gl_FragCoord.xy / uDpr, w = (px - uO) / uS, uv = px / uRes;
  // the wall: warm, lit by a lamp above the middle, with faint wallpaper stripes
  vec3 col = mix(vec3(0.10, 0.09, 0.12), vec3(0.32, 0.26, 0.22), smoothstep(0.0, 1.0, uv.y));
  col += vec3(0.45, 0.33, 0.20) * exp(-pow(length((uv - vec2(0.5, 0.95)) * vec2(1.0, 1.6)), 2.0) * 2.5);
  col *= 0.93 + 0.07 * smoothstep(0.3, 0.7, abs(fract(px.x / 26.0) - 0.5) * 2.0);
  col *= 1.0 - 0.35 * length(uv - 0.5);
  // a soft shadow on the wall just above the table
  if (w.y > 0.0) col *= 1.0 - 0.35 * exp(-w.y * uS / 18.0);
  // the table: its top edge, then the wooden front, then darkness underneath
  if (w.y < 0.0) {
    float grain = noise(vec2(w.x * 40.0, w.y * 900.0)) * 0.5 + noise(vec2(w.x * 8.0, w.y * 250.0)) * 0.5;
    col = mix(vec3(0.36, 0.20, 0.10), vec3(0.58, 0.36, 0.18), grain);
    col *= 0.75 + 0.25 * smoothstep(-0.03, 0.0, w.y);
    col += vec3(0.6, 0.45, 0.3) * (1.0 - smoothstep(0.0, 2.5, -w.y * uS)) * 0.6;   // the lit top edge
    if (w.y < -0.03) col = vec3(0.05, 0.04, 0.05) * (1.0 + uv.y);
  }
  gl_FragColor = vec4(col, 1.0);
}`;
// bodies: one quad each; the fragment shader draws a rounded box (domino, plank) or a ball with soft edges and lighting
const B_VS = `attribute vec2 aPos; attribute vec2 aLoc; attribute vec2 aHalf; attribute vec4 aCol; attribute float aKind; uniform vec2 uRes;
varying vec2 vLoc, vHalf; varying vec4 vCol; varying float vKind;
void main() { vLoc = aLoc; vHalf = aHalf; vCol = aCol; vKind = aKind; gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0); }`;
const B_FS = `precision mediump float; varying vec2 vLoc, vHalf; varying vec4 vCol; varying float vKind;
float hash(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
void main() {
  if (vKind > 8.5) {   // shadow: a soft dark blur
    float r = min(vHalf.x, vHalf.y) * 0.4; vec2 q = abs(vLoc) - (vHalf - 6.0) + r; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.35 * (1.0 - smoothstep(-3.0, 6.0, d))); return; }
  if (vKind > 1.5 && vKind < 2.5) {   // ball: a shiny steel sphere with a stripe that turns with it
    float r = vHalf.x, d = length(vLoc) - r; if (d > 1.0) discard;
    vec2 n2 = vLoc / r; float z = sqrt(max(0.0, 1.0 - dot(n2, n2))); vec3 n = vec3(n2.x, -n2.y, z);
    float diff = max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0), spec = pow(max(dot(reflect(-normalize(vec3(-0.4, 0.6, 0.7)), n), vec3(0, 0, 1)), 0.0), 30.0);
    float a = vHalf.y, stripe = 1.0 - smoothstep(0.08, 0.14, abs(n2.x * sin(a) + n2.y * cos(a)));
    vec3 c = vCol.rgb * (0.25 + 0.8 * diff) * (1.0 - 0.35 * stripe) + vec3(1.0) * spec * 0.9;
    gl_FragColor = vec4(c, 1.0 - smoothstep(-1.0, 1.0, d)); return; }
  float rr = min(vHalf.x, vHalf.y) * (vKind < 0.5 ? 0.35 : 0.2);
  vec2 q = abs(vLoc) - vHalf + rr; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rr;
  if (d > 1.0) discard;
  float edge = clamp(-d / max(2.0, min(vHalf.x, vHalf.y) * 0.5), 0.0, 1.0);          // 0 at the edge, 1 inside: a bevel
  vec3 c = vCol.rgb;
  if (vKind > 0.5) c *= 0.8 + 0.2 * hash(floor(vec2(vLoc.x / 3.0, vLoc.y * 2.0)));        // planks: wood grain
  c *= 0.62 + 0.45 * edge; c += 0.18 * (1.0 - smoothstep(0.0, 0.35, abs(vLoc.x / vHalf.x + 0.45))) * (vKind < 0.5 ? 1.0 : 0.3);   // glossy highlight
  if (vKind < 0.5) { c = mix(c, vec3(1.0), (1.0 - smoothstep(0.0, 1.2, abs(vLoc.y))) * 0.35); c += vCol.a * vec3(1.0, 0.85, 0.5) * 0.9; }   // dividing line; glow as it falls
  gl_FragColor = vec4(c, 1.0 - smoothstep(-1.0, 1.0, d));
}`;
const gv = K.gl.create(ui.stage, { dprMax: 2, fallback: "No WebGL here: drawing a simpler picture without the graphics card.", onLost: () => { glOn = false; } });
ui.stage.insertBefore(gv.el, ui.stage.firstChild);
let glOn = false; const P = {};
if (gv.ok) {
  try { const gl = gv.gl; P.bg = K.gl.program(gl, K.gl.QUAD_VS, BG_FS); P.b = K.gl.program(gl, B_VS, B_FS); P.quad = K.gl.quad(gl); P.geo = K.gl.points(gl, { aPos: 2, aLoc: 2, aHalf: 2, aCol: 4, aKind: 1 }); glOn = true; }
  catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly: drawing a simpler picture without it."); }
}
function bodyColour(b) {
  if (b.kind === "ball") return [0.78, 0.8, 0.85, 0];
  if (b.kind === "plank") return [0.62, 0.42, 0.24, 0];
  if (b.kind === "lever") return [0.5, 0.33, 0.2, 0];
  const c = hueCol(b.x), ft = fallT.get(b.id), glow = glowOn && ft != null ? Math.max(0, 1 - (W.t - ft) / 0.35) : 0;
  return [c[0], c[1], c[2], glow];
}
function geometry(shadow) {
  const pos = [], loc = [], half = [], col = [], kind = [], s = cam.s;
  for (const b of W.bodies) {
    if (b.kind === "table") continue;
    const k = shadow ? 9 : b.kind === "domino" ? 0 : b.kind === "ball" ? 2 : 1, cx = SX(b.x) + (shadow ? 4 : 0), cy = SY(b.y) + (shadow ? 3 : 0);
    if (shadow && b.fixed) continue;
    let hx, hy, c, sn;
    if (b.shape === "circle") { hx = hy = b.r * s + 1.5 + (shadow ? 6 : 0); c = 1; sn = 0; }
    else { hx = b.hw * s + 1.5 + (shadow ? 6 : 0); hy = b.hh * s + 1.5 + (shadow ? 6 : 0); c = Math.cos(-b.a); sn = Math.sin(-b.a); }
    const col4 = bodyColour(b), hv = b.shape === "circle" ? [b.r * s, b.a] : [b.hw * s + (shadow ? 6 : 0), b.hh * s + (shadow ? 6 : 0)];
    const corners = [[-hx, -hy], [hx, -hy], [-hx, hy], [hx, hy]];
    for (const i of [0, 1, 2, 2, 1, 3]) { const [lx, ly] = corners[i]; pos.push(cx + c * lx - sn * ly, cy + sn * lx + c * ly); loc.push(lx, ly); half.push(...hv); col.push(...col4); kind.push(k); }
  }
  return { pos, loc, half, col, kind };
}
function glDraw() {
  const gl = gv.gl, Wd = cv.w, H = cv.h; gl.viewport(0, 0, gv.el.width, gv.el.height); gl.disable(gl.BLEND);
  P.bg.set({ uRes: [Wd, H], uDpr: gv.el.width / Wd, uO: [SX(0), H - SY(0)], uS: cam.s, uTime: performance.now() / 1000 }); P.quad.draw(P.bg, null);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  for (const sh of [true, false]) {
    const g_ = geometry(sh); if (!g_.pos.length) continue;
    for (const [k, v] of [["aPos", g_.pos], ["aLoc", g_.loc], ["aHalf", g_.half], ["aCol", g_.col], ["aKind", g_.kind]]) P.geo.set(k, new Float32Array(v));
    P.b.set({ uRes: [Wd, H] }); P.geo.draw(P.b, g_.pos.length / 2, gl.TRIANGLES);
  }
  gl.disable(gl.BLEND);
}
function draw2DScene(c) {   // only without WebGL
  c.fillStyle = "#2b2420"; c.fillRect(0, 0, cv.w, cv.h); c.fillStyle = "#7a4d28"; c.fillRect(0, SY(0), cv.w, 0.03 * cam.s);
  for (const b of W.bodies) {
    if (b.kind === "table") continue; const col = bodyColour(b); c.fillStyle = `rgb(${col.slice(0, 3).map(v => Math.min(255, (v + col[3] * 0.5) * 255) | 0)})`;
    if (b.shape === "circle") { c.beginPath(); c.arc(SX(b.x), SY(b.y), b.r * cam.s, 0, 6.3); c.fill(); }
    else { c.save(); c.translate(SX(b.x), SY(b.y)); c.rotate(-b.a); c.fillRect(-b.hw * cam.s, -b.hh * cam.s, 2 * b.hw * cam.s, 2 * b.hh * cam.s); c.restore(); }
  }
}

// ---------------------------------------------------------------- the 2D layer: pivots, tool previews, the front marker
function drawOverlay() {
  const c = cv.ctx; c.clearRect(0, 0, cv.w, cv.h);
  if (glOn && gv.ok) glDraw(); else draw2DScene(c);
  // see-saw pivots
  c.fillStyle = "#c9b28a"; c.strokeStyle = "#3a2a1a"; c.lineWidth = 1.2;
  for (const p of W.pins) { const x = SX(p.px), y = SY(p.py), base = SY(surfaceAt(W, p.px, p.py - 0.001) ?? 0); c.beginPath(); c.moveTo(x, y); c.lineTo(x - (base - y) * 0.6, base); c.lineTo(x + (base - y) * 0.6, base); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#333"; c.beginPath(); c.arc(x, y, 2.5, 0, 6.3); c.fill(); c.fillStyle = "#c9b28a"; }
  // the toppling front: a small marker above the furthest fallen domino
  if (started && fallT.size && fallT.size < dom.length) {
    let f = null; for (const d of dom) if (fallT.has(d.id) && !d.flipped && (!f || d.x > f.x)) f = d;
    if (f) { const x = SX(f.x), y = SY(f.y + f.hh + 0.012); c.fillStyle = "rgba(255,220,120,.9)"; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x - 6, y); c.lineTo(x + 6, y); c.closePath(); c.fill(); }
  }
  // tool previews
  const hd = heightMM / 1000, tt = hd * DOM.t / DOM.h;
  const ghostDomino = (x, y) => { c.strokeStyle = "rgba(255,255,255,.7)"; c.setLineDash([4, 3]); c.strokeRect(SX(x - tt / 2), SY(y + hd), tt * cam.s, hd * cam.s); c.setLineDash([]); };
  if (hover && !drag && (tool === "domino" || tool === "ball")) { const x = WX(hover.px), y = surfaceAt(W, x, WY(hover.py)); if (y != null) { if (tool === "domino") ghostDomino(x, y); else { c.strokeStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(hover.px, hover.py, 0.012 * cam.s, 0, 6.3); c.stroke(); } } }
  if (drag && drag.type === "row") { const p = spacingR * hd, n = Math.floor(Math.abs(drag.x1 - drag.x0) / p) + 1, dir = Math.sign(drag.x1 - drag.x0) || 1; for (let i = 0; i < n; i++) { const x = drag.x0 + dir * i * p, y = surfaceAt(W, x, drag.y0 + 0.01); if (y != null) ghostDomino(x, y); } c.fillStyle = "#fff"; c.font = "12px Segoe UI,system-ui,sans-serif"; c.fillText(n + " dominoes", SX(drag.x1) + 8, SY(drag.y0) - 30); }
  if (drag && drag.type === "ramp") { c.strokeStyle = "rgba(255,210,150,.9)"; c.lineWidth = 4; c.beginPath(); c.moveTo(SX(drag.x0), SY(drag.y0)); c.lineTo(SX(drag.x1), SY(drag.y1)); c.stroke(); }
  hud();
}
function hud() {
  const n = dom.filter(d => fallT.has(d.id)).length, v = measured();
  ui.hud(`${PRESETS[preset].name}: <b>${n}</b> of ${dom.length} fallen${v ? ` · front speed <b>${v.toFixed(2)} m/s</b>` : ""}${!started ? "<br><span style='color:#ffd166'>" + (W.dropBall ? "Press <b>Drop the ball</b>" : "Push the first domino to start") + "</span>" : ""}`);
}

// ---------------------------------------------------------------- mouse
function bodyAt(px, py) { const x = WX(px), y = WY(py); let best = null, bd = 0.012; for (const b of W.bodies) { if (b.kind === "table") continue; const c = Math.cos(b.a), s = Math.sin(b.a), dx = x - b.x, dy = y - b.y; let d; if (b.shape === "circle") d = Math.hypot(dx, dy) - b.r; else { const lx = Math.abs(c * dx + s * dy) - b.hw, ly = Math.abs(-s * dx + c * dy) - b.hh; d = Math.max(lx, ly); } if (d < bd) { bd = d; best = b; } } return best; }
function remove(b) { W.bodies = W.bodies.filter(q => q !== b); W.pins = W.pins.filter(p => p.b !== b); dom = dom.filter(q => q !== b); }
K.pointer(cv.el, {
  down(p) {
    if (p.e.button === 2) { drag = { type: "pan", px: p.x, py: p.y, cx: cam.x, cy: cam.y }; return; }
    const x = WX(p.x), y = WY(p.y), hd = heightMM / 1000, tt = hd * DOM.t / DOM.h;
    if (tool === "push") { const b = bodyAt(p.x, p.y); if (b && !b.fixed) { if (b.kind === "domino") { push(b, 1.2); if (x > b.x) b.w = -b.w, b.vx = -b.vx; } else { b.vx += x > b.x ? -0.4 : 0.4; } start(); ui.setPlaying(true); } return; }
    if (tool === "delete") { const b = bodyAt(p.x, p.y); if (b && b.kind !== "table") remove(b); return; }
    if (tool === "domino") { const s = surfaceAt(W, x, y); if (s != null) dom.push(W.add(domino(x, s + 0.0002, hd, tt))); return; }
    if (tool === "ball") { const r = 0.012; W.add(ball(x, Math.max(y, (surfaceAt(W, x, y) ?? 0) + r + 0.0005), r)); return; }
    if (tool === "seesaw") { const s = surfaceAt(W, x, y) ?? 0, py = s + 0.025, lev = W.add(makeBody({ kind: "lever", x, y: py, hw: 0.09, hh: 0.004, m: 0.03, mu: 0.6 })); W.pin(lev, x, py); return; }
    if (tool === "row" || tool === "ramp") drag = { type: tool, x0: x, y0: y, x1: x, y1: y };
  },
  drag(p) { hover = { px: p.x, py: p.y }; if (!drag) return; if (drag.type === "pan") { cam.x = drag.cx - (p.x - drag.px) / cam.s; cam.y = drag.cy + (p.y - drag.py) / cam.s; return; } drag.x1 = WX(p.x); drag.y1 = WY(p.y); },
  up() {
    const d = drag; drag = null; if (!d || d.type === "pan") return; const hd = heightMM / 1000, tt = hd * DOM.t / DOM.h;
    if (d.type === "row") { const pch = spacingR * hd, n = Math.floor(Math.abs(d.x1 - d.x0) / pch) + 1, dir = Math.sign(d.x1 - d.x0) || 1; for (let i = 0; i < n && i < 80; i++) { const x = d.x0 + dir * i * pch, s = surfaceAt(W, x, d.y0 + 0.01); if (s != null) { const b = W.add(domino(x, s + 0.0002, hd, tt)); if (dir < 0) b.flipped = true; dom.push(b); } } }
    if (d.type === "ramp" && Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 0.02) { const [a, b] = d.x0 < d.x1 ? [[d.x0, d.y0], [d.x1, d.y1]] : [[d.x1, d.y1], [d.x0, d.y0]]; W.add(plank(a[0], a[1], b[0], b[1], 0.008)); }
  },
  hover(p) { hover = { px: p.x, py: p.y }; },
  leave() { hover = null; },
});
cv.el.addEventListener("wheel", e => { e.preventDefault(); const r = cv.el.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, wx = WX(px), wy = WY(py); cam.s = K.clamp(cam.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 100, 20000); cam.x = wx - (px - cv.w / 2) / cam.s; cam.y = wy + (py - cv.h / 2) / cam.s; }, { passive: false });

// ---------------------------------------------------------------- charts, readouts, loop
function readouts() {
  const n = dom.filter(d => fallT.has(d.id)).length, v = measured(), hd = heightMM / 1000;
  read.set("n", `${n} / ${dom.length}`); read.set("v", v ? v.toFixed(2) + " m/s" : "–");
  const ms = modelSpeed(spacingR * hd, hd, hd * DOM.t / DOM.h); read.set("m", ms ? ms.toFixed(2) + " m/s" : "cannot reach"); read.set("r", v ? (v / Math.sqrt(G * hd)).toFixed(2) : "–");
  read.set("t", started ? (W.t - t0).toFixed(2) + " s" : "–"); const ke = hist.ke.length ? hist.ke[hist.ke.length - 1][1] : 0; read.set("ke", ke.toFixed(2) + " mJ");
  toolNote.textContent = TOOL_TIPS[tool];
}
ui.run(dt => step(dt), () => {
  frame++; drawOverlay();
  if (frame % 5 === 0) { chA.draw([{ pts: hist.x, color: "#ffd166", width: 2.2 }], { xMin: 0, yMin: null }); chB.draw([{ pts: hist.ke, color: "#5ad1ff", width: 2 }], { xMin: 0, yMin: 0 }); readouts(); }
});
load("classic");
setTimeout(() => { if (!started) pushFirst(); }, 1500);
ui.tip("Forty dominoes and one small push. Try the tools and the Investigate tab.", 8000);
