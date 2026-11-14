/* =====================================================================
   MURMURATION
   Thousands of starlings wheel across the evening sky like one animal.
   There is no leader and no plan. In this model every bird follows the
   same three rules, using only the few birds nearest to it:

     1. SEPARATION  do not crowd: steer away from any bird that is too close
     2. ALIGNMENT   steer towards the average heading of your neighbours
     3. COHESION    steer towards the middle of the birds around you

   (Craig Reynolds's "boids", 1987.) Following field studies of real
   flocks over Rome (Ballerini and others, 2008), "neighbours" means the
   nearest SEVEN birds however far away they are, not every bird within
   some fixed distance.

   The flock's shape, its sudden turns and the dark waves that cross it
   when a falcon attacks are not written anywhere in the rules. They
   EMERGE from many birds each doing something simple.
   ===================================================================== */
const V0 = 12;           // cruising speed, m/s (starlings fly at roughly 10–20 m/s)
const CS = 4, GX = 80, GY = 40, GZ = 80;     // the air is divided into 4 m boxes so each bird only checks birds in nearby boxes
const KMAX = 16;
const SEP = 3;         // birds steer apart when closer than this (m)

class Flock {
  constructor(n, rand) {
    this.rand = rand; this.cap = n; this.n = n;
    const f = () => new Float32Array(n); this.px = f(); this.py = f(); this.pz = f(); this.vx = f(); this.vy = f(); this.vz = f();
    this.nb = new Int32Array(n * KMAX); this.nd = new Float32Array(n * KMAX); this.nc = new Uint8Array(n); this.cm = new Float32Array(4 * 20 * 10 * 20); this.next = new Int32Array(n); this.head = new Int32Array(GX * GY * GZ);
    this.wS = 1; this.wA = 1; this.wC = 1; this.k = 7; this.noise = 1; this.tick = 0; this.t = 0; this.order = 0; this.caught = 0; this.attacks = 0; this.fresh = true;
    this.falcon = null; this.scatter();
  }
  // every bird at a random place with a random heading
  scatter() { const r = this.rand; for (let i = 0; i < this.n; i++) { const R = 4 * Math.cbrt(this.n), a = r() * 6.283, d = R * Math.sqrt(r()); this.px[i] = Math.cos(a) * d; this.pz[i] = Math.sin(a) * d; this.py[i] = 60 + (r() - .5) * R; /* spread so that the crowding is the same for any flock size */ const b = r() * 6.283, e = (r() - .5) * 0.8; this.vx[i] = V0 * Math.cos(b) * Math.cos(e); this.vz[i] = V0 * Math.sin(b) * Math.cos(e); this.vy[i] = V0 * Math.sin(e); } this.fresh = true; this.t = 0; }
  cell(i) { const x = Math.min(GX - 1, Math.max(0, (this.px[i] + 160) / CS | 0)), y = Math.min(GY - 1, Math.max(0, this.py[i] / CS | 0)), z = Math.min(GZ - 1, Math.max(0, (this.pz[i] + 160) / CS | 0)); return x + GX * (y + GY * z); }
  // find bird i's nearest k birds, looking only in its own box and the 26 around it (so no further than about 4–8 m)
  neighbours(i) {
    const { px, py, pz, head, next, nb, nd } = this, k = this.k, o = i * KMAX, x = px[i], y = py[i], z = pz[i]; let cnt = 0;
    const cx = Math.min(GX - 1, Math.max(0, (x + 160) / CS | 0)), cy = Math.min(GY - 1, Math.max(0, y / CS | 0)), cz = Math.min(GZ - 1, Math.max(0, (z + 160) / CS | 0));
    for (let dz = -1; dz <= 1; dz++) { const zz = cz + dz; if (zz < 0 || zz >= GZ) continue; for (let dy = -1; dy <= 1; dy++) { const yy = cy + dy; if (yy < 0 || yy >= GY) continue; for (let dx = -1; dx <= 1; dx++) { const xx = cx + dx; if (xx < 0 || xx >= GX) continue;
      for (let j = head[xx + GX * (yy + GY * zz)]; j >= 0; j = next[j]) {
        if (j === i) continue; const ax = px[j] - x, ay = py[j] - y, az = pz[j] - z, d2 = ax * ax + ay * ay + az * az;
        if (cnt === k && d2 >= nd[o + k - 1]) continue;
        let p = cnt < k ? cnt++ : k - 1; while (p > 0 && nd[o + p - 1] > d2) { nd[o + p] = nd[o + p - 1]; nb[o + p] = nb[o + p - 1]; p--; } nd[o + p] = d2; nb[o + p] = j;   // keep the list sorted, nearest first
      } } } }
    this.nc[i] = cnt;
  }
  step(dt) {
    const { px, py, pz, vx, vy, vz, head, next, nb, nd, nc, n, rand } = this, F = this.falcon;
    head.fill(-1); for (let i = 0; i < n; i++) { const c = this.cell(i); next[i] = head[c]; head[c] = i; }
    // a coarse map (16 m boxes) of where the birds are, so each bird can find the middle of the part of the flock around it
    const cm = this.cm; cm.fill(0); const cidx = (x, y, z) => 4 * (Math.min(19, Math.max(0, (x + 160) >> 4)) + 20 * (Math.min(9, Math.max(0, y >> 4)) + 10 * Math.min(19, Math.max(0, (z + 160) >> 4))));
    let gx = 0, gy = 0, gz = 0; for (let i = 0; i < n; i++) { const c = cidx(px[i], py[i], pz[i]); cm[c] += px[i]; cm[c + 1] += py[i]; cm[c + 2] += pz[i]; cm[c + 3]++; gx += px[i]; gy += py[i]; gz += pz[i]; }
    gx /= n || 1; gy /= n || 1; gz /= n || 1;   // the middle of the whole flock
    const all = this.fresh; this.fresh = false; this.tick++;
    const kn = this.noise * 8 / Math.sqrt(dt); let sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < n; i++) {
      if (all || ((i + this.tick) & 1) === 0) this.neighbours(i);        // each bird re-checks who its neighbours are every other step
      const o = i * KMAX, c = nc[i], x = px[i], y = py[i], z = pz[i]; let ax = 0, ay = 0, az = 0;
      if (c) {
        let ux = 0, uy = 0, uz = 0;
        for (let q = 0; q < c; q++) {
          const j = nb[o + q], dx = px[j] - x, dy = py[j] - y, dz = pz[j] - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4;
          ux += vx[j]; uy += vy[j]; uz += vz[j];
          if (d < SEP) { const s = this.wS * 30 * (SEP - d) / SEP / d; ax -= dx * s; ay -= dy * s; az -= dz * s; }                 // RULE 1: separation
        }
        const a = this.wA * 5.5 / c; ax += (ux - c * vx[i]) * a; ay += (uy - c * vy[i]) * a; az += (uz - c * vz[i]) * a;       // RULE 2: alignment
      }
      { // RULE 3: cohesion. Steer towards the middle of the birds in the surrounding 16 m boxes (those within about 25 m).
        const bx = Math.min(19, Math.max(0, (x + 160) >> 4)), by = Math.min(9, Math.max(0, y >> 4)), bz = Math.min(19, Math.max(0, (z + 160) >> 4)); let mx = 0, my = 0, mz = 0, mc = 0;
        for (let dz = -1; dz <= 1; dz++) { const zz = bz + dz; if (zz < 0 || zz > 19) continue; for (let dy = -1; dy <= 1; dy++) { const yy = by + dy; if (yy < 0 || yy > 9) continue; for (let dx = -1; dx <= 1; dx++) { const xx = bx + dx; if (xx < 0 || xx > 19) continue; const q = 4 * (xx + 20 * (yy + 10 * zz)); mx += cm[q]; my += cm[q + 1]; mz += cm[q + 2]; mc += cm[q + 3]; } } }
        { const dx = gx - x, dy = gy - y, dz = gz - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4, s = this.wC * Math.min(0.1 * d, 5) / d; ax += dx * s; ay += dy * s; az += dz * s; }   // a distant flock is visible too: drift towards it
        if (mc > 1) { let dx = (mx - x) / (mc - 1) - x, dy = (my - y) / (mc - 1) - y, dz = (mz - z) / (mc - 1) - z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4, s = this.wC * Math.min(0.6 * d, 6) / d; ax += dx * s; ay += dy * s; az += dz * s; }
      }
      // home range: a gentle pull back towards the roost site, and a preferred band of heights
      const r = Math.sqrt(x * x + z * z); if (r > 90) { const s = (r - 90) * 0.06 / r; ax -= x * s; az -= z * s; }
      if (y < 25) ay += (25 - y) * 0.5; else if (y > 100) ay -= (y - 100) * 0.5;
      // wobble: gusts and each bird's own errors
      ax += (rand() - .5) * kn; ay += (rand() - .5) * kn * 0.5; az += (rand() - .5) * kn;
      if (F) { const dx = x - F.x, dy = y - F.y, dz = z - F.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < 30) { const s = 70 * (1 - d / 30) / (d + 0.1); ax += dx * s; ay += dy * s; az += dz * s; } }   // flee a falcon within 30 m
      let sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]) + 1e-6; const acc = (V0 - sp) * 2 / sp; ax += vx[i] * acc; ay += vy[i] * acc; az += vz[i] * acc;   // settle back to cruising speed
      vx[i] += ax * dt; vy[i] += ay * dt; vz[i] += az * dt; sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]) + 1e-6;
      const lim = sp > V0 * 1.6 ? V0 * 1.6 / sp : sp < V0 * 0.5 ? V0 * 0.5 / sp : 1; vx[i] *= lim; vy[i] *= lim; vz[i] *= lim; sp *= lim;
      sx += vx[i] / sp; sy += vy[i] / sp; sz += vz[i] / sp;
    }
    for (let i = 0; i < n; i++) { px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt; }
    this.order = Math.sqrt(sx * sx + sy * sy + sz * sz) / (n || 1);      // 1 = every bird flying the same way, 0 = headings cancel out
    if (F) this.hunt(dt); this.t += dt;
  }
  /* The falcon is faster than a starling but cannot turn as sharply. It picks one bird, chases it for up to 8 s,
     catches it if it gets within 1.5 m, then climbs away before the next attack. */
  hunt(dt) {
    const F = this.falcon, { px, py, pz, vx, vy, vz } = this; F.clock += dt; if (!this.n) return;
    if (F.mode === "away") { F.tx = F.hx; F.ty = 115; F.tz = F.hz; if (F.clock > 4) { F.mode = "stoop"; F.clock = 0; this.attacks++; let best = -1, bd = 1e9; for (let s = 0; s < 40; s++) { const j = this.rand() * this.n | 0, d = (px[j] - F.x) ** 2 + (py[j] - F.y) ** 2 + (pz[j] - F.z) ** 2; if (d < bd) { bd = d; best = j; } } F.target = best; } }
    else {
      const j = F.target < this.n ? F.target : (F.target = this.rand() * this.n | 0), d = Math.hypot(px[j] - F.x, py[j] - F.y, pz[j] - F.z), lead = Math.min(1, d / 24);
      F.tx = px[j] + vx[j] * lead; F.ty = py[j] + vy[j] * lead; F.tz = pz[j] + vz[j] * lead;
      if (d < 1.5) { this.remove(j); this.caught++; F.flash = 1; F.mode = "away"; F.clock = 0; this.newPerch(); }
      else if (F.clock > 8) { F.mode = "away"; F.clock = 0; this.newPerch(); }
    }
    const dx = F.tx - F.x, dy = F.ty - F.y, dz = F.tz - F.z, d = Math.hypot(dx, dy, dz) + 1e-6, sp = F.mode === "stoop" ? 28 : 16;
    let ax = (dx / d * sp - F.vx) * 3, ay = (dy / d * sp - F.vy) * 3, az = (dz / d * sp - F.vz) * 3; const am = Math.hypot(ax, ay, az), cap = am > 26 ? 26 / am : 1;   // limited turning
    F.vx += ax * cap * dt; F.vy += ay * cap * dt; F.vz += az * cap * dt; F.x += F.vx * dt; F.y += F.vy * dt; F.z += F.vz * dt;
  }
  newPerch() { const a = this.rand() * 6.283; this.falcon.hx = Math.cos(a) * 90; this.falcon.hz = Math.sin(a) * 90; }
  setFalcon(on) { if (on && !this.falcon) { this.falcon = { x: 110, y: 115, z: 0, vx: 0, vy: 0, vz: 0, mode: "away", clock: 2, target: 0, flash: 0, hx: 90, hz: 0, tx: 0, ty: 0, tz: 0 }; } else if (!on) this.falcon = null; }
  remove(j) { const l = --this.n; for (const a of [this.px, this.py, this.pz, this.vx, this.vy, this.vz]) a[j] = a[l]; this.fresh = true; }
  // how many separate flocks? Birds count as joined if they are neighbours within 6 m (found by linking them up: "union-find")
  groups() {
    const n = this.n, par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i; const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (let i = 0; i < n; i++) for (let q = 0; q < this.nc[i]; q++) { const j = this.nb[i * KMAX + q]; if (j < n && this.nd[i * KMAX + q] < 36) par[find(i)] = find(j); }
    const size = new Map(); for (let i = 0; i < n; i++) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
    let g = 0, big = 0, lone = 0; for (const s of size.values()) { if (s >= 5) g++; else lone += s; if (s > big) big = s; } return { groups: g, biggest: big / (n || 1), lone };
  }
  spacing() { let s = 0, c = 0; for (let i = 0; i < this.n; i += 3) if (this.nc[i]) { s += Math.sqrt(this.nd[i * KMAX]); c++; } return c ? s / c : 0; }   // mean distance to the nearest neighbour
}
// A flock run without drawing, for the batch experiments
function trial(n, rnd, set, seconds, each) { const f = new Flock(n, rnd); Object.assign(f, set); if (set.falconOn) f.setFalcon(true); const steps = Math.round(seconds * 30); for (let s = 0; s < steps; s++) { f.step(1 / 30); if (each && each(f, s / 30) === false) break; } return f; }

// ---------------- The page ----------------
let flock = new Flock(2500, Math.random), nBirds = 2500, yaw = 0.4, camD = 130, focus = false, links = false, log = { ord: [], big: [], sp: [], caught: [] }, grp = { groups: 1, biggest: 1, lone: 0 };
const P = { wS: 1, wA: 1, wC: 1, k: 7, noise: 1 };
function remake() { const old = flock; flock = new Flock(nBirds, Math.random); Object.assign(flock, P); if (old.falcon) flock.setFalcon(true); log = { ord: [], big: [], sp: [], caught: [] }; }

const ui = K.app({
  title: "Murmuration", subject: "Biology",
  blurb: "Thousands of starlings, three simple rules, no leader",
  reset: () => { set({ wS: 1, wA: 1, wC: 1, k: 7, noise: 1, falcon: false, n: 2500 }); remake(); },
  missions: [
    { title: "Order from nothing", q: "The birds start with random headings. Nobody is in charge. Watch the 'flying the same way' line on the chart. How long before they are a flock, and who decided which way to go?", hint: "Within a few seconds small groups agree locally, then merge. Nobody decided the direction: it grew from small chance agreements that spread, and a different one wins each time you scatter. A big flock often ends up wheeling like a whirlpool, so 'flying the same way' stays well below 100% even though it is clearly one flock; try 200 birds to see near-perfect alignment.", setup() { set({ wS: 1, wA: 1, wC: 1, k: 7, noise: 1, falcon: false }); flock.scatter(); log = { ord: [], big: [], sp: [], caught: [] }; } },
    { title: "Which rule does what?", q: "Turn each of the three rules down to zero in turn (and back). What does the flock lose each time?", hint: "No alignment: a milling swarm, like midges, that stays together but goes nowhere. No cohesion: aligned streams that drift apart. No separation: birds pile into impossible dense clumps. A murmuration needs all three.", setup() { set({ wS: 1, wA: 0, wC: 1, k: 7, noise: 1, falcon: false }); } },
    { title: "How many neighbours?", q: "Real starlings track about seven neighbours. Set it to 1, then 2, 3… up to 15. How few can a bird watch before the flock falls apart into small groups?", hint: "With one neighbour, birds pair off and the flock shatters into many small groups. With two or three it mostly holds; from about four it reliably stays as one. Tracking more adds little here, so a handful is enough. Real starlings use six or seven, which may give a safety margin in turbulent air and under attack.", setup() { set({ wS: 1, wA: 1, wC: 1, k: 1, noise: 1, falcon: false }); flock.scatter(); } },
    { title: "The falcon", q: "A peregrine attacks. Watch how the flock reacts: does every bird see the falcon? How does the alarm reach birds on the far side?", hint: "Only birds within 30 m react to the falcon itself. The rest react to their neighbours turning, so a wave of turning sweeps across the flock faster than any bird flies. Where the wave passes, birds bank together and bunch up, which shows as a dark band. The flock splits around the falcon and re-forms behind it.", setup() { set({ wS: 1, wA: 1, wC: 1, k: 7, noise: 1, falcon: true }); } },
    { title: "Safety in numbers?", q: "Run the falcon against 200 birds for a minute and note how many are caught. Then against 2000. Is a bird in the big flock safer?", hint: "The falcon catches about the same number per minute either way, because it can only chase one bird at a time. In the big flock that loss is shared among ten times as many birds, so each bird's risk is roughly ten times lower: the 'dilution effect'. The batch run measures it properly.", setup() { set({ wS: 1, wA: 1, wC: 1, k: 7, noise: 1, falcon: true, n: 200 }); remake(); } },
    { title: "Too much wobble", q: "Raise the wobble (random error in each bird's steering) a step at a time. Does the flock get gradually messier, or is there a point where order collapses?", hint: "In a small flock (try 200 birds) order hangs on for a long while and then collapses quite suddenly: a transition a little like melting. Below the critical wobble, alignment with neighbours corrects errors faster than they build up; above it, it cannot.", setup() { set({ wS: 1, wA: 1, wC: 1, k: 7, noise: 3, falcon: false, n: 200 }); remake(); } },
    { title: "One bird's view", q: "Switch on 'Follow one bird'. The orange bird only ever responds to the birds joined to it by lines. Does it know the shape of the flock? Does it need to?", hint: "It knows nothing beyond its seven neighbours, a few metres away. The flock's shape exists only at the level of the whole. That is what 'emergent' means: a pattern of the group that no individual holds or controls.", setup() { set({ wS: 1, wA: 1, wC: 1, k: 7, noise: 1, falcon: false, focus: true }); } }
  ],
  batch: [
    { title: "Order against wobble", question: "How does the flock's alignment fall as the birds' steering gets noisier?", how: "Each run: 150 birds from random headings, 14 s; the result is the average alignment over the last 4 s.", xLabel: "wobble", yLabel: "alignment (1 = all flying the same way)", xs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], reps: 6, yMin: 0, yMax: 1, run(x, r) { let s = 0, c = 0; trial(150, r, { noise: x }, 14, (f, t) => { if (t > 10) { s += f.order; c++; } }); return s / c; }, note: "At low wobble every run ends up well aligned. At high wobble none does. In between, runs disagree with one another most strongly: large scatter near a transition is typical of this kind of collapse." },
    { title: "How many neighbours are enough?", question: "How many separate groups form when each bird tracks only its nearest k?", how: "Each run: 200 birds from a scattered start, 16 s; then the separate groups (5 birds or more) are counted.", xLabel: "neighbours tracked, k", yLabel: "number of separate groups", xs: [1, 2, 3, 4, 5, 6, 7, 9, 12, 15], reps: 6, yMin: 0, run: (k, r) => trial(200, r, { k }, 16).groups().groups, note: "Chance decides how the scattered birds first pair up, so runs differ. With k = 1 the flock stays in fragments; a few neighbours are enough to join it into one. Field measurements on real starlings found 6 to 7: more than the bare minimum this model needs." },
    { title: "Safety in numbers", question: "Is each bird safer in a bigger flock?", how: "Each run: a falcon hunts a flock for 45 s. The result is the percentage of the flock caught per minute.", xLabel: "flock size", yLabel: "each bird's risk (% caught per minute)", xs: [25, 50, 100, 200, 400], reps: 6, yMin: 0, run(n, r) { const f = trial(n, r, { falconOn: true }, 45); return f.caught / n * 100 * 60 / 45; }, note: "Catches are rare events, so single runs vary a lot (0, 1 or 2 birds). The falcon takes roughly the same number of birds whatever the flock size, so the risk per bird falls steeply as the flock grows: about halving each time the flock doubles." },
    { title: "Time to agree", question: "From random headings, how long does a flock take to line up?", how: "Each run: 150 birds scattered at random; the clock stops when alignment first passes 0.9.", xLabel: "", yLabel: "time to reach alignment 0.9 (s)", reps: 80, bins: 20, lo: 0, hi: 20, run(x, r) { let T = 20; trial(150, r, {}, 20, (f, t) => { if (f.order > 0.9) { T = t; return false; } }); return T; }, note: "Sometimes the first local groups happen to agree and the flock lines up in a few seconds; sometimes two large groups form heading opposite ways and must meet and merge first. Hence the long tail." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>A "boids" flocking model (Reynolds 1987) in three dimensions with topological neighbours (Ballerini et al. 2008).</p>
<ul><li>Each bird has a position and a velocity. Thirty or more times a second it finds its nearest <i>k</i> birds (7 by default) and adds up three steering pushes: away from any closer than 3 m, and towards their average velocity. Cohesion uses a wider view: each bird steers towards the middle of the birds within about 25 m, and drifts weakly towards the middle of the whole flock.</li>
<li>It also feels a pull back towards the roost site once more than 90 m out, a preferred band of heights (25–100 m), a random wobble, and a push that returns it to its cruising speed of 12 m/s (limits 6–19 m/s).</li>
<li><b>Alignment</b> shown on the chart is the length of the average heading: 1 if all fly the same way, near 0 if headings cancel.</li>
<li><b>The falcon</b> picks the nearest of 40 randomly noticed birds, chases it for up to 8 seconds with limited turning, catches it within 1.5 m, then climbs away for 4 seconds. Birds within 30 m of it steer away. The falcon flies at 28 m/s; starlings can sprint at up to 19 m/s.</li></ul>
<h3>Simplifications</h3>
<ul><li>Birds are points. They do not bank, flap, tire, see, or block each other's view.</li>
<li>To keep the sums fast, a bird only looks for neighbours in the 4 m boxes around it, so a bird more than about 6 m from all others has no neighbours and simply heads for the roost.</li>
<li>The rule strengths are chosen to look right. They are not measured from starlings.</li>
<li>The dark bands in real murmurations come partly from birds banking and showing more wing; here they come only from birds bunching and overlapping.</li>
<li>The falcon is a simple pursuer. Real peregrines stoop from height at over 50 m/s, often target stragglers, and fail most attacks. There is no built-in "confusion effect": any safety in numbers here comes from the flock's movement and from sharing the risk.</li>
<li>No wind, no ground, no trees to roost in, and the birds never land.</li>
<li>Batch runs use smaller flocks (25–400 birds) and a fixed time step of 1/30 s.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The three rules");
for (const [key, label, tip] of [["wS", "1. Separation", "Keep clear of birds closer than 3 m"], ["wA", "2. Alignment", "Match your neighbours' heading"], ["wC", "3. Cohesion", "Stay close to your neighbours"]])
  ctl[key] = K.slider(g, { label, min: 0, max: 3, step: 0.1, value: 1, fmt: v => v === 0 ? "off" : "× " + v.toFixed(1), tip, on: v => { P[key] = v; flock[key] = v; } });
ctl.k = K.slider(g, { label: "Neighbours each bird tracks", min: 1, max: 15, step: 1, value: 7, on: v => { P.k = v; flock.k = v; flock.fresh = true; }, tip: "Real starlings: about 7" });
ctl.noise = K.slider(g, { label: "Wobble (steering errors)", min: 0, max: 10, step: 0.25, value: 1, on: v => { P.noise = v; flock.noise = v; } });
g = ui.group("The flock");
ctl.n = K.slider(g, { label: "Starlings", min: 100, max: 4000, step: 100, value: nBirds, on: v => { nBirds = v; remake(); } });
let r1 = K.row(g); K.btn(r1, "Scatter the birds", () => { flock.scatter(); log = { ord: [], big: [], sp: [], caught: [] }; }, "primary");
ctl.falcon = K.toggle(g, { label: "A falcon hunts the flock", value: false, on: v => flock.setFalcon(v) });
g = ui.group("What to show");
ctl.focus = K.toggle(g, { label: "Follow one bird and its neighbours", value: false, on: v => focus = v });
ctl.zoom = K.slider(g, { label: "Watch from", min: 80, max: 400, step: 10, value: camD, unit: "m away", on: v => { camD = v; bgKey = ""; } });
K.note(g, "Drag the sky to walk round the flock.");
const read = K.readout(g, [["n", "starlings"], ["ord", "flying the same way"], ["grp", "separate flocks"], ["sp", "gap to nearest bird"], ["caught", "caught by the falcon"], ["att", "falcon attacks"]]);
function set(o) { for (const k of ["wS", "wA", "wC", "k", "noise"]) if (o[k] != null) { P[k] = o[k]; flock[k] = o[k]; ctl[k].set(o[k]); } flock.fresh = true; if (o.falcon != null) { flock.setFalcon(o.falcon); ctl.falcon.set(o.falcon); } if (o.n != null) { nBirds = o.n; ctl.n.set(o.n); } focus = !!o.focus; ctl.focus.set(focus); }

// ---------------- Drawing ----------------
let bg = null, bgKey = "";
const cv = ui.canvas(() => { bgKey = ""; });
const hsh = x => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); }, vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hsh(i) * (1 - u) + hsh(i + 1) * u; };
function paintSky(w, h, hy, f) {   // dusk over a lake, painted once and reused until the view changes
  bg = document.createElement("canvas"); const dpr = cv.dpr; bg.width = w * dpr; bg.height = h * dpr; const c = bg.getContext("2d"); c.scale(dpr, dpr);
  const sky = c.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, "#16223f"); sky.addColorStop(.38, "#3d3f6e"); sky.addColorStop(.66, "#a05f7a"); sky.addColorStop(.86, "#f0915c"); sky.addColorStop(1, "#ffd08a"); c.fillStyle = sky; c.fillRect(0, 0, w, hy);
  const sx = ((w * 0.3 - yaw * f * 0.6) % (w * 2) + w * 2) % (w * 2) - w * 0.5, sun = c.createRadialGradient(sx, hy, 0, sx, hy, h * 0.75); sun.addColorStop(0, "rgba(255,244,214,.95)"); sun.addColorStop(.06, "rgba(255,214,150,.6)"); sun.addColorStop(.3, "rgba(255,160,100,.2)"); sun.addColorStop(1, "rgba(255,150,100,0)"); c.fillStyle = sun; c.fillRect(0, 0, w, hy);
  for (let i = 0; i < 16; i++) { const y = hy * (0.35 + 0.6 * hsh(i + 3)), x = w * hsh(i * 7 + 1), len = w * (0.15 + 0.3 * hsh(i * 3 + 2)), cl = c.createLinearGradient(x, 0, x + len, 0); cl.addColorStop(0, "rgba(60,40,70,0)"); cl.addColorStop(.5, `rgba(${y > hy * .7 ? "120,60,70" : "50,45,85"},.35)`); cl.addColorStop(1, "rgba(60,40,70,0)"); c.fillStyle = cl; c.beginPath(); c.ellipse(x + len / 2, y, len / 2, 2 + 5 * hsh(i + 9), 0, 0, 6.3); c.fill(); }   // thin evening clouds
  const lake = c.createLinearGradient(0, hy, 0, h); lake.addColorStop(0, "#e9a06c"); lake.addColorStop(.25, "#8a5b72"); lake.addColorStop(1, "#141a30"); c.fillStyle = lake; c.fillRect(0, hy, w, h - hy);
  const gl = c.createLinearGradient(0, hy, 0, h); gl.addColorStop(0, "rgba(255,230,180,.55)"); gl.addColorStop(1, "rgba(255,230,180,0)"); c.fillStyle = gl; c.fillRect(sx - 26, hy, 52, h - hy);   // the sun's path on the water
  c.fillStyle = "#0b0d16"; c.beginPath(); c.moveTo(0, hy + 3); for (let x = 0; x <= w; x += 3) { const u = (x + yaw * f * 0.6) * 0.012; c.lineTo(x, hy - 3 - 16 * vnoise(u) - 7 * vnoise(u * 4.3) - 3 * vnoise(u * 13)); } c.lineTo(w, hy + 3); c.fill();   // far tree line
  c.strokeStyle = "#07080e"; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 260; i++) { const x = w * hsh(i * 1.7 + 5), ht = 14 + 40 * hsh(i + 11) * hsh(i * 3), lean = (hsh(i * 5) - .5) * 14; c.moveTo(x, h); c.quadraticCurveTo(x, h - ht * 0.6, x + lean, h - ht); } c.stroke();   // reeds in front
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, f = h * 1.25, { px, py, pz, vx, vy, vz, n } = flock;
  // camera: standing on the shore, looking up at a point 55 m above the roost
  const cx = Math.sin(yaw) * camD, cz = -Math.cos(yaw) * camD, cy = 2, pitch = Math.atan2(53, camD), fx = -Math.sin(yaw) * Math.cos(pitch), fz = Math.cos(yaw) * Math.cos(pitch), fy = Math.sin(pitch), rx = Math.cos(yaw), rz = Math.sin(yaw), ux = -fy * -Math.sin(yaw), uz = -fy * Math.cos(yaw), uy = Math.cos(pitch);
  const hy = Math.round(h / 2 + Math.tan(pitch) * f), key = [w, h, hy, yaw.toFixed(3)].join(); if (key !== bgKey) { paintSky(w, h, Math.min(h - 30, hy), f); bgKey = key; }
  c.drawImage(bg, 0, 0, w, h);
  const proj = (x, y, z) => { const ax = x - cx, ay = y - cy, az = z - cz, d = ax * fx + ay * fy + az * fz; if (d < 4) return null; return [w / 2 + (ax * rx + az * rz) / d * f, h / 2 - (ax * ux + ay * uy + az * uz) / d * f, d]; };
  // birds: three passes by distance so that near birds are drawn larger. Each is a short dash along its heading, with wings.
  c.lineCap = "round"; const flap = performance.now() * 0.02;
  for (let pass = 0; pass < 3; pass++) {
    c.beginPath(); c.strokeStyle = pass === 0 ? "rgba(14,14,26,.62)" : pass === 1 ? "rgba(10,10,20,.78)" : "rgba(6,6,14,.9)";
    let lw = 1;
    for (let i = 0; i < n; i++) {
      const ax = px[i] - cx, ay = py[i] - cy, az = pz[i] - cz, d = ax * fx + ay * fy + az * fz; if (d < 4) continue; const s = f * 0.42 / d, band = s < 0.75 ? 0 : s < 1.25 ? 1 : 2; if (band !== pass) continue;
      const X = w / 2 + (ax * rx + az * rz) / d * f, Y = h / 2 - (ax * ux + ay * uy + az * uz) / d * f, hx = (vx[i] * rx + vz[i] * rz) / V0, hyv = -(vx[i] * ux + vy[i] * uy + vz[i] * uz) / V0, L = Math.max(1.1, s * 1.5);
      c.moveTo(X - hx * L, Y - hyv * L); c.lineTo(X + hx * L, Y + hyv * L);
      if (band) { const wg = s * 1.7 * (0.35 + 0.65 * Math.abs(Math.sin(flap + i))); c.moveTo(X - hyv * wg - hx * wg * .7, Y + hx * wg - hyv * wg * .7); c.lineTo(X, Y); c.lineTo(X + hyv * wg - hx * wg * .7, Y - hx * wg - hyv * wg * .7); }
    }
    c.lineWidth = pass === 0 ? 1.2 : pass === 1 ? 1.5 : 2; c.stroke();
  }
  if (focus && n) {   // one bird and the only birds it pays attention to
    const i = 0, a = proj(px[i], py[i], pz[i]); if (a) { c.strokeStyle = "rgba(255,170,60,.9)"; c.lineWidth = 1.2; c.beginPath(); for (let q = 0; q < flock.nc[i]; q++) { const j = flock.nb[i * KMAX + q]; if (j >= n) continue; const b = proj(px[j], py[j], pz[j]); if (b) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.moveTo(b[0] + 3, b[1]); c.arc(b[0], b[1], 3, 0, 6.3); } } c.stroke();
      c.fillStyle = "#ff9a2e"; c.beginPath(); c.arc(a[0], a[1], 4, 0, 6.3); c.fill(); c.strokeStyle = "rgba(255,170,60,.5)"; c.beginPath(); c.arc(a[0], a[1], 22, 0, 6.3); c.stroke(); c.font = "600 11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("this bird watches only these " + flock.nc[i], a[0] + 28, a[1] + 4); }
  }
  const F = flock.falcon; if (F) { const a = proj(F.x, F.y, F.z); if (a) { const s = Math.max(4, f * 1.6 / a[2]), hx = (F.vx * rx + F.vz * rz) / 20, hyv = -(F.vx * ux + F.vy * uy + F.vz * uz) / 20;
    c.strokeStyle = "#2a0d08"; c.lineWidth = Math.max(2, s * 0.45); c.beginPath(); c.moveTo(a[0] - hx * s, a[1] - hyv * s); c.lineTo(a[0] + hx * s, a[1] + hyv * s); c.moveTo(a[0] - hyv * s * 1.3 - hx * s * .5, a[1] + hx * s * 1.3 - hyv * s * .5); c.lineTo(a[0], a[1]); c.lineTo(a[0] + hyv * s * 1.3 - hx * s * .5, a[1] - hx * s * 1.3 - hyv * s * .5); c.stroke();
    c.strokeStyle = F.mode === "stoop" ? "rgba(255,70,50,.85)" : "rgba(255,255,255,.5)"; c.lineWidth = 1.3; c.beginPath(); c.arc(a[0], a[1], 15 + F.flash * 30, 0, 6.3); c.stroke(); c.fillStyle = F.mode === "stoop" ? "#ffd9d0" : "#e8ecf8"; c.font = "600 11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(F.flash > 0.3 ? "caught one" : F.mode === "stoop" ? "falcon attacking" : "falcon climbing", a[0] + 20, a[1] - 12); } F.flash *= 0.95; }
}
const chOrd = K.chart(ui.dock, { title: "Is it one flock?", xLabel: "time (s)", yLabel: "fraction", yMin: 0, yMax: 1.05 });
const chSp = K.chart(ui.dock, { title: "Spacing, and the falcon's catch", xLabel: "time (s)", yLabel: "metres · birds", yMin: 0 });
let grab = null; K.pointer(cv.el, { down(p) { grab = { x: p.x, yaw }; }, drag(p) { if (grab) yaw = grab.yaw - (p.x - grab.x) * 0.006; }, up() { grab = null; } });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  flock.step(K.clamp(dt, 1 / 120, 1 / 30));
  if (frame % 6 === 0) { const t = flock.t; if (frame % 30 === 0) grp = flock.groups(); log.ord.push([t, flock.order]); log.big.push([t, grp.biggest]); log.sp.push([t, flock.spacing()]); log.caught.push([t, flock.caught]); for (const k in log) if (log[k].length > 500) log[k].shift(); }
}, () => {
  draw(); if (frame++ % 4) return;
  const x0 = log.ord.length ? log.ord[0][0] : 0, x1 = Math.max(x0 + 20, flock.t);
  chOrd.draw([{ pts: log.ord, color: K.cssVar("--s0"), label: "flying the same way" }, { pts: log.big, color: K.cssVar("--s2"), label: "share in the biggest flock" }], { xMin: x0, xMax: x1 });
  chSp.draw([{ pts: log.sp, color: K.cssVar("--s1"), label: "gap to nearest bird (m)" }, { pts: log.caught, color: K.cssVar("--s3"), label: "birds caught", alpha: flock.falcon || flock.caught ? 1 : 0 }], { xMin: x0, xMax: x1 });
  read.set("n", flock.n); read.set("ord", (flock.order * 100).toFixed(0) + "%"); read.set("grp", grp.groups + (grp.lone ? " + " + grp.lone + " strays" : "")); read.set("sp", flock.spacing().toFixed(1) + " m"); read.set("caught", flock.caught); read.set("att", flock.attacks);
});
ui.tip("Every bird follows the same three rules using only its 7 nearest neighbours · drag to walk round", 8000);
