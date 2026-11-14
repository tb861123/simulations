/* =====================================================================
   GAS IN A BOX
   A gas is mostly empty space with molecules flying about in it. This
   model follows every molecule as a small hard ball in a thin box
   (40 nm x 24 nm x 6 nm, drawn from the front) with a piston on the right.

   Nothing in the code knows the gas laws. The only rules are:
     1. a molecule moves in a straight line until it hits something;
     2. two molecules bounce off each other like snooker balls
        (momentum and kinetic energy are both conserved);
     3. a molecule bounces off a wall. A wall that conducts heat sends it
        back with a speed typical of the wall's temperature.
   Pressure, temperature, Boyle's law, the spread of speeds, diffusion
   and Brownian motion all come out of those three rules.

   UNITS used inside the model: nanometres, picoseconds and atomic mass
   units (u). In those units energy comes out in kJ/mol, so the gas
   constant R = 0.0083145 does the job of Boltzmann's constant k.
   ===================================================================== */
const R = 0.0083145;                 // kJ/mol per kelvin  (= k for one molecule, in the model's units)
const BH = 24, BD = 6;               // box height and depth, nm. The width L is set by the piston.
const LMIN = 8, LMAX = 40;           // how far the piston can travel, nm
const P_KPA = 1660.54;               // 1 model unit of pressure (u / nm / ps²) = 1660.54 kPa
const E_ZJ = 1.66054;                // 1 model unit of energy = 1.66054 × 10⁻²¹ J
const CS = 1, GXN = 41, GYN = 24;    // the box is divided into 1 nm squares so a molecule only tests its near neighbours
const PISTON_SPEED = 0.25;           // how fast the held piston is pushed on screen, nm/ps (batch runs push much more gently)
const GASES = { He: { m: 4.0, r: 0.13, name: "helium" }, Ne: { m: 20.2, r: 0.14, name: "neon" }, Ar: { m: 39.9, r: 0.17, name: "argon" }, Xe: { m: 131.3, r: 0.20, name: "xenon" },
  Air: { m: 29, r: 0.18, name: "air" }, NH3: { m: 17, r: 0.15, name: "ammonia" }, HCl: { m: 36.5, r: 0.17, name: "hydrogen chloride" } };
const SMOKE = 4;   // species number of a speck of solid ammonium chloride

class Gas {
  constructor(rand, cap = 3200) {
    this.rand = rand; const f = () => new Float32Array(cap);
    this.x = f(); this.y = f(); this.z = f(); this.vx = f(); this.vy = f(); this.vz = f(); this.m = f(); this.r = f(); this.sp = new Uint8Array(cap);
    this.next = new Int32Array(cap); this.head = new Int32Array(GXN * GYN);
    this.n = 0; this.L = LMAX; this.target = LMAX; this.Tw = 300; this.conduct = true; this.g = 0;
    this.free = false; this.pext = 0.25; this.vp = 0; this.Mp = 120;      // a free piston has a mass (u) and a steady push from outside
    this.partition = 0; this.big = null; this.t = 0; this.p = 0; this.imp = 0; this.tAcc = 0; this.Q = 0; this.W = 0; this.ncoll = 0; this.path = 0; this.mfp = 0; this.sparks = null; this.pathAll = 0; this.collAll = 0; this.ps = PISTON_SPEED;
  }
  // put n molecules in the box at temperature T. gasB (optional) makes every second one a different gas;
  // split puts gas A on the left, gas B on the right, with a partition between them.
  fill(n, gasA, T, gasB, split) {
    const r = this.rand; this.n = n; this.partition = split ? this.L / 2 : 0;
    for (let i = 0; i < n; i++) {
      const B = gasB && (i & 1), G = GASES[B ? gasB : gasA]; this.m[i] = G.m; this.r[i] = G.r; this.sp[i] = B ? 1 : 0;
      const x0 = split ? (B ? this.L / 2 + .3 : .3) : .3, x1 = split ? (B ? this.L - .3 : this.L / 2 - .3) : this.L - .3;
      this.x[i] = x0 + r() * (x1 - x0); this.y[i] = .3 + r() * (BH - .6); this.z[i] = .3 + r() * (BD - .6);
      const s = Math.sqrt(R * T / G.m); this.vx[i] = s * r.gauss(); this.vy[i] = s * r.gauss(); this.vz[i] = s * r.gauss();   // each velocity component: a normal spread of width √(kT/m)
    }
    this.zero(); this.p = n * R * T / this.volume();
  }
  // the classic diffusion demonstration: a tube of air with ammonia let in at the left end and hydrogen chloride at the right
  tube(nAir, nEach) {
    this.L = this.target = LMAX; this.fill(nAir, "Air", this.Tw); const r = this.rand; this.made = 0;
    for (let k = 0; k < 2 * nEach; k++) { const i = this.n++, B = k & 1, G = GASES[B ? "HCl" : "NH3"]; this.m[i] = G.m; this.r[i] = G.r; this.sp[i] = B ? 3 : 2; this.x[i] = B ? LMAX - 0.2 - r() * 1.5 : 0.2 + r() * 1.5; this.y[i] = .3 + r() * (BH - .6); this.z[i] = .3 + r() * (BD - .6); const s = Math.sqrt(R * this.Tw / G.m); this.vx[i] = s * r.gauss(); this.vy[i] = s * r.gauss(); this.vz[i] = s * r.gauss(); }
  }
  zero() { this.Q = 0; this.W = 0; this.imp = 0; this.tAcc = 0; this.ncoll = 0; this.path = 0; }
  volume() { return this.L * BH * BD; }
  ke() { let s = 0; for (let i = 0; i < this.n; i++) s += this.m[i] * (this.vx[i] ** 2 + this.vy[i] ** 2 + this.vz[i] ** 2); return s / 2; }   // total kinetic energy = the gas's internal energy U
  temp(which) { let s = 0, c = 0; for (let i = 0; i < this.n; i++) if (this.sp[i] !== SMOKE && (which == null || this.sp[i] === which)) { s += this.m[i] * (this.vx[i] ** 2 + this.vy[i] ** 2 + this.vz[i] ** 2); c++; } return c ? s / (3 * c * R) : 0; }   // temperature IS average kinetic energy: ½m<v²> = 3/2 kT
  sameSpeed() { for (let i = 0; i < this.n; i++) { if (this.sp[i] === SMOKE) continue; const v = Math.hypot(this.vx[i], this.vy[i], this.vz[i]) || 1, s = Math.sqrt(3 * R * this.Tw / this.m[i]) / v; this.vx[i] *= s; this.vy[i] *= s; this.vz[i] *= s; } }
  // A molecule meets a fixed wall. ax: 0,1,2 = x,y,z; dir = which way is back into the box.
  bounce(i, ax, dir) {
    const m = this.m[i], v = ax === 0 ? this.vx : ax === 1 ? this.vy : this.vz, vn = v[i];
    if (this.conduct) {
      // The wall's atoms are jiggling at the wall temperature. The molecule leaves with a fresh random velocity typical of that temperature,
      // so a hot wall speeds molecules up (heat flows in) and a cold wall slows them (heat flows out).
      const s = Math.sqrt(R * this.Tw / m), e0 = this.vx[i] ** 2 + this.vy[i] ** 2 + this.vz[i] ** 2, r = this.rand;
      this.vx[i] = s * r.gauss(); this.vy[i] = s * r.gauss(); this.vz[i] = s * r.gauss(); v[i] = dir * s * Math.sqrt(-2 * Math.log(1 - r()));
      this.Q += 0.5 * m * (this.vx[i] ** 2 + this.vy[i] ** 2 + this.vz[i] ** 2 - e0);
    } else v[i] = -vn;                                   // an insulating wall: a perfect bounce, no energy exchanged
    this.imp += m * (Math.abs(vn) + Math.abs(v[i]));     // the kick given to the wall = the molecule's change of momentum
    if (this.sparks && ax < 2 && this.sparks.length < 260) this.sparks.push([this.x[i], this.y[i], 1, ax]);
  }
  step(dt) {
    const { x, y, z, vx, vy, vz, m, r, n, head, next } = this; let L = this.L, u = 0;
    // ---- the piston ----
    if (this.free) { this.vp += (-this.pext * BH * BD / this.Mp - this.vp / 6) * dt; L += this.vp * dt; if (L < LMIN) { L = LMIN; this.vp = 0; } if (L > LMAX) { L = LMAX; this.vp = 0; } u = this.vp; }
    else { u = K.clamp((this.target - L) / dt, -this.ps, this.ps); L += u * dt; }
    this.L = L; const xp = this.partition, g = this.g;
    // ---- move every molecule, then deal with the walls ----
    for (let i = 0; i < n; i++) {
      const ri = 0, x0 = x[i];   /* walls act on the centre of each molecule */ if (g) vy[i] -= g * dt;
      x[i] += vx[i] * dt; y[i] += vy[i] * dt; z[i] += vz[i] * dt; this.path += Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]) * dt;
      if (xp && (x0 < xp) !== (x[i] < xp)) { x[i] = x0; vx[i] = -vx[i]; }                         // the partition between the two gases
      if (x[i] < ri) { x[i] = ri; if (vx[i] < 0) this.bounce(i, 0, 1); }
      if (x[i] > L - ri) {                                                                       // the piston
        x[i] = L - ri;
        if (vx[i] > u) {
          const v1 = vx[i]; let v2;
          if (this.free) { const M = this.Mp; v2 = ((m[i] - M) * v1 + 2 * M * this.vp) / (m[i] + M); this.vp = ((M - m[i]) * this.vp + 2 * m[i] * v1) / (m[i] + M); }   // two-body elastic collision: the piston recoils
          else v2 = 2 * u - v1;                         // a piston moving IN returns the molecule faster (work done on the gas); moving OUT, slower
          vx[i] = v2; this.W += 0.5 * m[i] * (v2 * v2 - v1 * v1); this.imp += m[i] * (v1 - v2);
          if (this.sparks && this.sparks.length < 260) this.sparks.push([L, y[i], 1, 0]);
        }
      }
      if (y[i] < ri) { y[i] = ri; if (vy[i] < 0) this.bounce(i, 1, 1); } else if (y[i] > BH - ri) { y[i] = BH - ri; if (vy[i] > 0) this.bounce(i, 1, -1); }
      if (z[i] < ri) { z[i] = ri; if (vz[i] < 0) this.bounce(i, 2, 1); } else if (z[i] > BD - ri) { z[i] = BD - ri; if (vz[i] > 0) this.bounce(i, 2, -1); }
    }
    // ---- collisions between molecules ----
    head.fill(-1); for (let i = 0; i < n; i++) { const c = Math.min(GXN - 1, x[i] / CS | 0) + GXN * Math.min(GYN - 1, y[i] / CS | 0); next[i] = head[c]; head[c] = i; }
    const hit = (i, j) => {
      const dx = x[j] - x[i], dy = y[j] - y[i], dz = z[j] - z[i], d2 = dx * dx + dy * dy + dz * dz, rr = r[i] + r[j];
      if (d2 < 0.8 && this.sp[i] + this.sp[j] === 5 && this.sp[i] > 1 && this.sp[j] > 1 && this.sp[i] !== this.sp[j]) {          // NH3 comes within about a nanometre of HCl: they join to make a speck of white solid, NH4Cl, which stays put
        for (const q of [i, j]) { this.sp[q] = SMOKE; m[q] = 1e7; vx[q] = vy[q] = vz[q] = 0; } x[j] = x[i]; y[j] = y[i]; this.made = (this.made || 0) + 1; return;
      }
      if (d2 >= rr * rr || d2 === 0) return;
      const vn = ((vx[i] - vx[j]) * dx + (vy[i] - vy[j]) * dy + (vz[i] - vz[j]) * dz); if (vn <= 0) return;      // already moving apart
      // Elastic collision: swap momentum along the line joining the two centres. J is the impulse each gives the other.
      const J = 2 * vn / d2 / (1 / m[i] + 1 / m[j]), a = J / m[i], b = J / m[j];
      vx[i] -= a * dx; vy[i] -= a * dy; vz[i] -= a * dz; vx[j] += b * dx; vy[j] += b * dy; vz[j] += b * dz; this.ncoll++;
    };
    const nx = Math.min(GXN, Math.ceil(L / CS) + 1);
    for (let cy = 0; cy < GYN; cy++) for (let cx = 0; cx < nx; cx++) {
      const c = cx + GXN * cy;
      for (let i = head[c]; i >= 0; i = next[i]) {
        for (let j = next[i]; j >= 0; j = next[j]) hit(i, j);
        if (cx + 1 < nx) for (let j = head[c + 1]; j >= 0; j = next[j]) hit(i, j);
        if (cy + 1 < GYN) { for (let j = head[c + GXN]; j >= 0; j = next[j]) hit(i, j); if (cx + 1 < nx) for (let j = head[c + GXN + 1]; j >= 0; j = next[j]) hit(i, j); if (cx > 0) for (let j = head[c + GXN - 1]; j >= 0; j = next[j]) hit(i, j); }
      }
    }
    // ---- a large "smoke" particle, hit from all sides by molecules far too small to see ----
    const b = this.big; if (b) {
      for (let i = 0; i < n; i++) { const dx = b.x - x[i], dy = b.y - y[i], dz = b.z - z[i], d2 = dx * dx + dy * dy + dz * dz, rr = r[i] + b.r; if (d2 >= rr * rr) continue; const vn = (vx[i] - b.vx) * dx + (vy[i] - b.vy) * dy + (vz[i] - b.vz) * dz; if (vn <= 0) continue; const J = 2 * vn / d2 / (1 / m[i] + 1 / b.m), a = J / m[i], c = J / b.m; vx[i] -= a * dx; vy[i] -= a * dy; vz[i] -= a * dz; b.vx += c * dx; b.vy += c * dy; b.vz += c * dz; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > L - b.r) { b.x = L - b.r; b.vx = -Math.abs(b.vx); } if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); } if (b.y > BH - b.r) { b.y = BH - b.r; b.vy = -Math.abs(b.vy); } if (b.z < b.r) { b.z = b.r; b.vz = Math.abs(b.vz); } if (b.z > BD - b.r) { b.z = BD - b.r; b.vz = -Math.abs(b.vz); }
    }
    // ---- pressure = total kick on the walls ÷ (wall area × time), averaged over a few picoseconds ----
    this.t += dt; this.tAcc += dt;
    if (this.tAcc >= 1.5) {
      const area = 2 * (L * BH + L * BD + BH * BD), pNow = this.imp / (area * this.tAcc); this.p += (pNow - this.p) * (1 - Math.exp(-this.tAcc / this.smooth)); this.imp = 0; this.tAcc = 0;
      this.pathAll += this.path; this.collAll += this.ncoll;
      if (this.ncoll > 20) { const l = this.path / (2 * this.ncoll); this.mfp = this.mfp ? this.mfp + (l - this.mfp) * .2 : l; this.path = 0; this.ncoll = 0; }   // mean free path = distance flown ÷ number of free flights
    }
  }
}
Gas.prototype.smooth = 6;
// largest safe time step: no molecule should move more than a fraction of its own size in one step
const safeDt = gas => { let v = 0.1; for (let i = 0; i < gas.n; i += 7) { const s = Math.abs(gas.vx[i]) + Math.abs(gas.vy[i]) + Math.abs(gas.vz[i]); if (s > v) v = s; } return K.clamp(0.09 / v, 0.004, 0.05); };

/* A run without drawing, for the batch experiments. o = {n, gas, gasB, T, L, conduct, free, pext, g, ps (how long, ps)}.
   each(gas, t) is called every step and may return false to stop. */
function trial(o, rnd, each) {
  const gas = new Gas(rnd, (o.n || 150) + 8); gas.smooth = 1e-9; gas.L = gas.target = o.L || LMAX; gas.Tw = o.T || 300; gas.conduct = o.conduct !== false; gas.free = !!o.free; gas.pext = o.pext || 0.25; gas.g = o.g || 0;
  gas.fill(o.n || 150, o.gas || "Ar", o.T0 || o.T || 300, o.gasB, o.split); if (o.same) gas.sameSpeed();
  const dt = Math.min(0.05, 0.09 / (4 * Math.sqrt(3 * R * Math.max(o.T || 300, o.T0 || 0) * (o.hot || 1) / GASES[o.gasB === "He" ? "He" : o.gas || "Ar"].m)));
  for (let t = 0; t < o.ps; t += dt) { gas.step(dt); if (each && each(gas, t) === false) break; }
  return gas;
}
// average pressure (kPa) between two times, straight from the kicks on the walls
function meanPressure(o, rnd) { let s = 0, c = 0, last = -1; trial(o, rnd, (g, t) => { if (t > o.settle && g.tAcc === 0 && g.t !== last) { s += g.p; c++; last = g.t; } }); return s / c * P_KPA; }

// ---------------- The page ----------------
const rnd = K.rng(Date.now() % 1e6 + 7);
let gas = new Gas(rnd), S = { n: 600, gas: "Ar", gasB: "", T: 300 }, rate = 12, colourBy = "speed", graph = "pV", track = false;
let trail = [], path1 = [], bigTrail = [], hist = [new Float32Array(36), new Float32Array(36)], hgt = new Float32Array(24), mixLog = [], U0 = 0, sampleT = 0;
gas.sparks = [];
function refill(split) { S.tube = false; if (S.gas === "Air") { S.gas = "Ar"; ctl.gas.set("Ar"); } gas.L = gas.target = split ? LMAX : gas.L; gas.fill(S.n, S.gas, gas.Tw, S.gasB || null, split); if (gas.big) addBig(true); clearLog(); }
function clearLog() { trail = []; path1 = []; bigTrail = []; mixLog = []; hist[0].fill(0); hist[1].fill(0); hgt.fill(0); gas.zero(); U0 = gas.ke(); gas.mfp = 0; }
function startTube() { S.tube = true; S.gas = "Air"; S.gasB = ""; ctl.gasB.set(""); gas.tube(1100, 160); clearLog(); }
function addBig(on) { gas.big = on ? { x: gas.L / 2, y: BH / 2, z: BD / 2, vx: 0, vy: 0, vz: 0, m: 2500, r: 1.3 } : null; bigTrail = []; }

const ui = K.app({
  title: "Gas in a Box", subject: "Physics",
  blurb: "Every molecule followed: pressure, temperature and the gas laws from collisions alone",
  reset: () => { set({ n: 600, gas: "Ar", gasB: "", Tw: 300, conduct: true, free: false, L: 40, g: 0, big: false, track: false, graph: "pV", colour: "speed" }); gas.L = 40; refill(); },
  missions: [
    { title: "What is pressure?", q: "Just 20 molecules. Each spark is a molecule hitting a wall and giving it a tiny kick. Watch the pressure reading jump about. Now raise the number of molecules to 1000. What happens to the pressure, and to how steady it is?", hint: "Pressure is the total force of all those kicks spread over the area of the walls. More molecules means more kicks each second, so more pressure. With only 20 the kicks come in ones and twos, so the reading is jumpy; with 1000 they blur into a steady push. A real gas has so many molecules that the pressure is perfectly steady.", setup() { set({ n: 20, gas: "Ar", gasB: "", Tw: 300, conduct: true, free: false, L: 40, g: 0, big: false, track: false, graph: "pV", colour: "speed" }); refill(); } },
    { title: "Squeeze it: Boyle's law", q: "The walls keep the gas at 300 K. Drag the piston in slowly (or use the Volume slider) and watch the graph. If you halve the volume, what happens to the pressure? Why, in terms of molecules?", hint: "Halving the volume doubles the pressure: p × V stays the same (Boyle's law). The molecules are no faster, but they are packed twice as densely, so twice as many hit each bit of wall every second. The dots follow the dashed curve p = NkT/V. At very small volumes they sit a little above it, because the molecules themselves take up room.", setup() { set({ n: 800, gas: "Ar", gasB: "", Tw: 300, conduct: true, free: false, L: 40, g: 0, big: false, track: false, graph: "pV", colour: "speed" }); refill(); } },
    { title: "Heat it: the pressure law and absolute zero", q: "The volume is fixed. Change the wall temperature from 100 K up to 900 K in steps and watch the pressure–temperature graph. What kind of line is it? Where would the pressure reach zero?", hint: "A straight line through the origin: pressure is proportional to the temperature in kelvin. Hotter molecules move faster, so they hit the walls harder and more often. Follow the line back and the pressure reaches zero at 0 K (−273 °C), where the molecules would have no kinetic energy left. That is absolute zero.", setup() { set({ n: 800, gas: "Ar", gasB: "", Tw: 300, conduct: true, free: false, L: 30, g: 0, big: false, track: false, graph: "pT", colour: "speed" }); refill(); } },
    { title: "Let it expand: Charles's law", q: "Now the piston is free to move and the outside pushes on it with a steady pressure. Raise the wall temperature. What happens to the volume? What stays the same?", hint: "The gas expands until its pressure matches the outside again, so the pressure stays the same and the volume is proportional to the kelvin temperature (Charles's law). The piston jiggles because it is light enough to feel individual molecules. This is how a hot-air balloon and a liquid-in-glass thermometer work.", setup() { set({ n: 800, gas: "Ar", gasB: "", Tw: 300, conduct: true, free: true, pext: 430, L: 26, g: 0, big: false, track: false, graph: "VT", colour: "speed" }); refill(); } },
    { title: "Are they all going the same speed?", q: "Press 'Give all the same speed'. Every molecule now has exactly the same speed (the bars become one spike). Watch the bars over the next few seconds. Do they stay that way?", hint: "Within a few collisions each, the speeds spread out into the same lopsided hill every time: the Maxwell–Boltzmann distribution (the dashed curve). Collisions share the energy out at random, so a few molecules are almost still, a few are very fast, and most are in between. Nobody has to arrange it. Heat the gas and the hill flattens and moves right.", setup() { set({ n: 1200, gas: "Ar", gasB: "", Tw: 300, conduct: false, free: false, L: 40, g: 0, big: false, track: false, graph: "pV", colour: "speed" }); refill(); gas.sameSpeed(); hist[0].fill(0); } },
    { title: "Light and heavy molecules", q: "Helium (light) and xenon (33 times heavier) share the box. Compare the two speed hills and the two temperature readings. Which gas is faster? Which has more kinetic energy per molecule?", hint: "Helium is far faster, about √33 ≈ 5.7 times. But the average kinetic energy ½mv² is the same for both, because collisions share energy until it is. That is what 'the same temperature' means: the same average kinetic energy per molecule, whatever the molecule.", setup() { set({ n: 800, gas: "Xe", gasB: "He", Tw: 300, conduct: true, free: false, L: 40, g: 0, big: false, track: false, graph: "pV", colour: "gas" }); refill(); } },
    { title: "The bicycle pump", q: "The walls are now insulated: no heat can get in or out. Push the piston in. What happens to the temperature? Then pull it out again. Where does the energy come from and go to?", hint: "Pushing the piston in heats the gas: a molecule bouncing off an advancing piston comes back faster, like a ball off a moving bat. The work you do becomes kinetic energy (ΔU = W, with Q = 0). Pulling it out cools the gas, because molecules bounce back slower from a retreating piston. This is why a bicycle pump gets hot, a diesel engine needs no spark, and rising air cools to make clouds. Push in and pull back out: the gas does not quite return to 300 K, because a fast push is not perfectly reversible.", setup() { set({ n: 800, gas: "Ar", gasB: "", Tw: 300, conduct: false, free: false, L: 40, g: 0, big: false, track: false, graph: "pV", colour: "speed" }); refill(); } },
    { title: "Brownian motion", q: "A smoke particle, thousands of times heavier than a molecule, sits in the gas. Watch its trail. Why does it jiggle, and why does it never settle?", hint: "At any instant slightly more molecules hit one side than the other, by chance, so the particle is nudged about at random. In 1827 Robert Brown saw pollen grains do this under a microscope; in 1905 Einstein explained it, which was the first strong evidence that atoms are real. Heat the gas and the jiggling gets more violent.", setup() { set({ n: 1400, gas: "Ar", gasB: "", Tw: 300, conduct: true, free: false, L: 30, g: 0, big: true, track: false, graph: "pV", colour: "speed" }); refill(); } },
    { title: "Diffusion: fast molecules, slow mixing", q: "Helium on the left, xenon on the right, with a partition between. Press 'Remove the partition'. The helium atoms move at over 1000 m/s, so does the gas mix in an instant? One molecule is tracked to help you see why.", hint: "Mixing takes far longer than a molecule's speed suggests. Each molecule travels only a few nanometres before a collision sends it off in a new direction, so it wanders in a zig-zag (a random walk) instead of crossing in a straight line. The light helium still spreads faster than the heavy xenon. This is why a smell takes many seconds to cross a room.", setup() { set({ n: 1600, gas: "He", gasB: "Xe", Tw: 300, conduct: true, free: false, L: 40, g: 0, big: false, track: true, graph: "mix", colour: "gas" }); gas.L = 40; refill(true); } },
    { title: "An atmosphere in a box", q: "Gravity is switched on (hugely stronger than real, so its effect fits in the box). How does the density of the gas change with height? What happens if you heat the gas, or change to a lighter gas?", hint: "The gas is densest at the bottom and thins out with height, halving every fixed distance: an exponential fall, like the Earth's atmosphere. Gravity pulls the molecules down; their thermal motion spreads them back up. Hotter or lighter gas reaches higher, which is why hydrogen and helium escape from the Earth but oxygen and nitrogen stay.", setup() { set({ n: 1500, gas: "Xe", gasB: "", Tw: 300, conduct: true, free: false, L: 30, g: 0.003, big: false, track: false, graph: "height", colour: "speed" }); refill(); } },
    { title: "The ammonia and hydrogen chloride tube", q: "A tube of air. Ammonia (NH₃, blue) is let in at the left end and hydrogen chloride (HCl, orange) at the right at the same moment. Where they meet they react to make white specks of solid ammonium chloride. Will the white ring form in the middle?", hint: "It forms nearer the hydrogen chloride end. Both gases are at the same temperature, so their molecules have the same average kinetic energy, but ammonia molecules (17) are lighter than hydrogen chloride (36.5) and so move faster and diffuse further in the same time. Neither crosses quickly, because each molecule is constantly knocked off course by air molecules. The graph marks where the ratio of the masses predicts the ring.", setup() { set({ n: 1100, gasB: "", Tw: 300, conduct: true, free: false, L: 40, g: 0, big: false, track: false, graph: "ring", colour: "gas" }); startTube(); rate = 30; ctl.rate.set(30); } },
    { lvl: "adv", title: "A heat engine made of molecules", q: "The gas is helium, as in real Stirling engines. The walls are switched between hot (600 K) and cold (300 K) while the piston moves out and in: a Stirling cycle. Watch the loop it traces on the p–V graph. Why does the gas do more work going out than is needed to push it back? What does the area of the loop mean?", hint: "The gas is expanded while hot (high pressure, so it does a lot of work on the piston) and compressed while cold (low pressure, so less work is needed). The difference is the net work out, equal to the area inside the loop. Heat flows in from the hot walls and a smaller amount flows out to the cold walls: an engine turns only part of the heat into work. The measured efficiency is below the ideal for this cycle because the piston moves at a finite speed and the gas is never quite at the wall temperature.", setup() { set({ n: 600, gas: "He", gasB: "", conduct: true, free: false, g: 0, big: false, track: false, graph: "pV", colour: "speed", engine: true, L: 14, Tw: 600 }); refill(); eng.Th = 600; ctl.Th.set(600); eng.Tc = 300; ctl.Tc.set(300); eng.kind = "stirling"; ctl.ekind.set("stirling"); ctl.eng.set(true); engineStart(true); rate = 70; ctl.rate.set(70); } },
    { lvl: "adv", title: "The petrol engine: the Otto cycle", q: "Now the gas is compressed and expanded with insulated walls (adiabatically), and heated (to 900 K) only at the smallest volume, as the spark does in a petrol engine. Compare the shape of the loop with the Stirling engine's. Which strokes are steeper than an isotherm, and why?", hint: "The compression and power strokes are adiabats, steeper than isotherms, because the gas heats as it is squeezed and cools as it expands. The ideal efficiency depends only on the compression ratio r: 1 − 1/r^(γ−1), here with r = 3 and γ = 5/3. Real petrol engines use r of about 10; higher still and the mixture ignites too early (knocking).", setup() { set({ n: 600, gas: "He", gasB: "", conduct: true, free: false, g: 0, big: false, track: false, graph: "pV", colour: "speed", engine: true, L: 12, Tw: 300 }); refill(); eng.Th = 900; ctl.Th.set(900); eng.Tc = 300; ctl.Tc.set(300); eng.kind = "otto"; ctl.ekind.set("otto"); ctl.eng.set(true); engineStart(true); rate = 70; ctl.rate.set(70); } },
    { lvl: "adv", title: "Carnot's limit", q: "The Carnot cycle takes in heat only at the hot temperature and gives it out only at the cold temperature. Compare the measured efficiency with the Carnot limit 1 − Tc/Th. Then narrow the gap between the hot and cold temperatures. What happens to the efficiency?", hint: "No engine working between two temperatures can beat 1 − Tc/Th, however cleverly it is built: this is one form of the second law of thermodynamics. The molecular engine here falls a little short, because its piston moves at a finite speed and the gas is never quite at the wall temperature. Make Th and Tc closer and the limit itself shrinks: a power station needs very hot steam and cold cooling water.", setup() { set({ n: 600, gas: "He", gasB: "", conduct: true, free: false, g: 0, big: false, track: false, graph: "pV", colour: "speed", engine: true, L: 8, Tw: 600 }); refill(); eng.Th = 600; ctl.Th.set(600); eng.Tc = 300; ctl.Tc.set(300); eng.kind = "carnot"; ctl.ekind.set("carnot"); ctl.eng.set(true); engineStart(true); rate = 70; ctl.rate.set(70); } }
  ],
  batch: [
    { title: "Boyle's law", question: "How does pressure depend on volume at a fixed temperature?", how: "Each run: 150 argon atoms at 300 K in a box of fixed volume for 200 ps; the pressure is worked out from every kick on the walls.", xLabel: "volume (nm³)", yLabel: "pressure (kPa)", xs: [1152, 1440, 1872, 2448, 3168, 4032, 5040, 5760], reps: 5, yMin: 0, theory: V => 150 * R * 300 / V * P_KPA, theoryLabel: "p = NkT / V", run: (V, r) => meanPressure({ n: 150, T: 300, L: V / (BH * BD), ps: 200, settle: 20 }, r), note: "With only 150 molecules the number of wall hits in 200 ps varies by chance from run to run. A real gas sample has about 10²⁰ molecules, so its pressure does not flicker at all." },
    { title: "The pressure law and absolute zero", question: "How does pressure depend on temperature at a fixed volume?", how: "Each run: 150 argon atoms in the full-size box for 200 ps with the walls held at the chosen temperature.", xLabel: "temperature (K)", yLabel: "pressure (kPa)", xs: [100, 200, 300, 400, 500, 600, 700, 800, 900], reps: 5, yMin: 0, fit: true, theory: T => 150 * R * T / (LMAX * BH * BD) * P_KPA, theoryLabel: "p = NkT / V", run: (T, r) => meanPressure({ n: 150, T, L: LMAX, ps: 200, settle: 30 }, r), note: "The best-fit line should pass close to zero pressure at 0 K. Its intercept is not exactly zero because each run is a small, noisy sample." },
    { title: "Charles's law", question: "With a free piston and a steady outside pressure, how does volume depend on temperature?", how: "Each run: 150 argon atoms, outside pressure 260 kPa, 800 ps; the result is the average volume over the last 450 ps.", xLabel: "temperature (K)", yLabel: "volume (nm³)", xs: [200, 300, 400, 500, 600, 650], reps: 5, yMin: 0, fit: true, theory: T => 150 * R * T / (260 / P_KPA), theoryLabel: "V = NkT / p", run(T, r) { let s = 0, c = 0; trial({ n: 150, T, L: 150 * R * T / (260 / P_KPA) / (BH * BD) * 0.9, free: true, pext: 260 / P_KPA, ps: 800 }, r, (g, t) => { if (t > 350) { s += g.volume(); c++; } }); return s / c; }, note: "The light piston is knocked about by individual molecules, so the volume flickers around its average." },
    { title: "Squeezing an insulated gas", question: "How hot does a gas get when it is compressed with no heat allowed out?", how: "Each run: 400 argon atoms start at 300 K in the full box with insulated walls. The piston is pushed in gently (30 m/s) to the chosen volume, then the temperature is read.", xLabel: "final volume ÷ starting volume", yLabel: "final temperature (K)", xs: [0.25, 0.35, 0.5, 0.65, 0.8, 1], reps: 4, theory: f => 300 * Math.pow(f, -2 / 3), theoryLabel: "T × V^(2/3) = constant", run(f, r) { let s = 0, c = 0; const g0 = new Gas(r, 410); g0.smooth = 1e-9; g0.ps = 0.03; g0.conduct = false; g0.Tw = 300; g0.fill(400, "Ar", 300); g0.target = LMAX * f; const dt = 0.04, T = (LMAX - LMAX * f) / g0.ps + 30; for (let t = 0; t < T; t += dt) { g0.step(dt); if (t > T - 20) { s += g0.temp(); c++; } } return s / c; }, note: "The starting temperature of a 400-atom sample is itself a little random, which carries through. A piston pushed quickly heats the gas more than this, because molecules rebound from it with extra speed: try it on screen. Theory for a gas of single atoms: T × V^(γ−1) = constant with γ = 5/3." },
    { title: "Same temperature, same energy?", question: "Do heavy molecules have the same average kinetic energy as light ones at the same temperature?", how: "Each run: 150 atoms of one gas (He 4, Ne 20, Ar 40, Xe 131) at 300 K for 60 ps. The result is the average kinetic energy per atom.", xLabel: "mass of one atom (u)", yLabel: "mean kinetic energy (×10⁻²¹ J)", xs: [4, 20.2, 39.9, 131.3], reps: 6, yMin: 0, yMax: 10, theory: () => 1.5 * R * 300 * E_ZJ, theoryLabel: "3/2 kT", run(mass, r) { const key = Object.keys(GASES).find(k => GASES[k].m === mass); let s = 0, c = 0; trial({ n: 150, gas: key, T: 300, ps: 60 }, r, (g, t) => { if (t > 20 && (c++ % 20 === 0)) s += g.ke() / g.n; }); return s / Math.ceil(c / 20) * E_ZJ; }, note: "Speeds differ enormously (helium is nearly six times faster than xenon) but ½mv² averages out the same. Each run is an average over only 150 atoms, hence the scatter." },
    { title: "How far between collisions?", question: "How does the mean free path depend on how many molecules are in the box?", how: "Each run: argon at 300 K in the full box for 80 ps. Mean free path = total distance flown ÷ number of free flights.", xLabel: "number of molecules", yLabel: "mean free path (nm)", xs: [150, 200, 300, 450, 600, 900, 1200], reps: 4, yMin: 0, theory: n => 1 / (Math.SQRT2 * (n / (LMAX * BH * BD)) * Math.PI * 0.34 * 0.34), theoryLabel: "1 / (√2 n π d²)", run(n, r) { const g = trial({ n, T: 300, ps: 80 }, r); return (g.pathAll + g.path) / (2 * (g.collAll + g.ncoll)); }, note: "Double the number of molecules and each one meets a neighbour after half the distance. At low numbers the path becomes as long as the box, so walls interrupt flights and the simple formula overestimates what is measured." },
    { title: "The ammonia and hydrogen chloride tube", question: "How far along the tube does the white ring form?", how: "Each run: a tube of 500 air molecules with 90 ammonia molecules released at one end and 90 hydrogen chloride at the other. When 25 specks of solid have formed, their average position is recorded as a percentage of the tube's length from the ammonia end.", xLabel: "", yLabel: "position of the ring (% of the way from the ammonia end)", reps: 60, bins: 20, lo: 30, hi: 80, theory: 100 * Math.sqrt(36.5 / 17) / (1 + Math.sqrt(36.5 / 17)), theoryLabel: "from the masses", run(x, r) { const g = new Gas(r, 700); g.smooth = 1e-9; g.Tw = 300; g.tube(500, 90); for (let t = 0; t < 1500 && (g.made || 0) < 25; t += 0.035) g.step(0.035); let sx = 0, c = 0; for (let i = 0; i < g.n; i++) if (g.sp[i] === SMOKE) { sx += g.x[i]; c++; } return c ? 100 * sx / c / LMAX : null; }, note: "Graham's law says rates of diffusion go as 1/√(mass), which puts the ring 59% of the way along. The model lands close to that but not exactly on it: how far a molecule gets also depends on its size and on the first molecules to arrive, which are the fastest few." },
    { title: "The spread of speeds", question: "Start every molecule at the same speed. After collisions have shared the energy out, what speeds do you find?", how: "Each run: 300 argon atoms in a small box all start at 432 m/s with insulated walls. After 80 ps (several collisions each) the speed of one atom is recorded.", xLabel: "", yLabel: "speed of one molecule (m/s)", reps: 300, bins: 26, lo: 0, hi: 1100, theory: Math.sqrt(8 * R * 300 / (Math.PI * 39.9)) * 1000, theoryLabel: "mean speed √(8kT/πm)", run(x, r) { const g = trial({ n: 300, T: 300, L: LMIN, conduct: false, same: true, ps: 80 }, r); return Math.hypot(g.vx[0], g.vy[0], g.vz[0]) * 1000; }, note: "This is not measurement error: it is the Maxwell–Boltzmann distribution itself. Even at one fixed temperature, molecules have a wide range of speeds, with a long tail of fast ones." }
  ],
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 5(d) Ideal gas molecules; diffusion from Chemistry (4CH1) Topic 1.", adv: "WJEC Eduqas A level Physics: kinetic theory and thermal physics. Heat engines and Carnot are beyond the spec." } },
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 5(d)", text: "Gas molecules move quickly and at random. Pressure is caused by molecules hitting the walls of the container." },
      { lvl: "std", tag: "4PH1 5(d)", text: "Heating a gas makes its molecules move faster. The kelvin temperature is proportional to their average kinetic energy." },
      { lvl: "std", tag: "4PH1 5(d)", text: "Absolute zero (0 K = −273 °C) is the temperature at which molecules would have the least possible energy. T in K = temperature in °C + 273." },
      { lvl: "std", tag: "4PH1 5(d)", text: "Fixed mass at constant temperature: p₁V₁ = p₂V₂. Fixed mass at constant volume: p₁/T₁ = p₂/T₂ (T in kelvin)." },
      { lvl: "std", tag: "4CH1 Topic 1", text: "Diffusion is the spreading of particles from where they are concentrated to where they are not, caused by their random motion. Lighter particles diffuse faster." },
      { lvl: "adv", tag: "A level Eduqas", text: "Ideal gas equation: pV = nRT = NkT." },
      { lvl: "adv", tag: "A level Eduqas", text: "Kinetic theory: p = ⅓ρ⟨c²⟩ = ⅓(N/V)m⟨c²⟩, so the mean kinetic energy of a molecule is 3/2 kT." },
      { lvl: "adv", tag: "A level Eduqas", text: "Internal energy of an ideal monatomic gas: U = 3/2 nRT. It depends only on temperature." },
      { lvl: "adv", tag: "A level Eduqas", text: "First law of thermodynamics: ΔU = Q − W, where W is the work done BY the gas (W = pΔV at constant pressure; the area under a p–V graph in general). This simulation shows work done ON the gas, which has the opposite sign." },
      { lvl: "beyond", tag: "Beyond the spec", text: "No heat engine working between a hot temperature T<sub>h</sub> and a cold one T<sub>c</sub> can have an efficiency above 1 − T<sub>c</sub>/T<sub>h</sub> (Carnot)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Use ideas about molecules to explain why a gas exerts a pressure on the walls of its container.", ans: "<ul><li>Molecules are in constant random motion</li><li>They collide with the walls and bounce off, so each collision exerts a force on the wall</li><li>Pressure is the total force of these collisions divided by the area of the wall</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Your gas is at a pressure of ${(gas.p * P_KPA).toFixed(0)} kPa in a volume of ${gas.volume().toFixed(0)} nm³. The piston is pushed in until the volume is ${(gas.volume() / 2).toFixed(0)} nm³, at constant temperature. Calculate the new pressure.`, ans: () => `<ul><li>p₁V₁ = p₂V₂</li><li>p₂ = ${(gas.p * P_KPA).toFixed(0)} × ${gas.volume().toFixed(0)} ÷ ${(gas.volume() / 2).toFixed(0)}</li><li>= ${(2 * gas.p * P_KPA).toFixed(0)} kPa (halving the volume doubles the pressure)</li></ul>` },
      { lvl: "std", marks: 4, q: () => `A sealed, rigid container of gas is at ${(gas.p * P_KPA).toFixed(0)} kPa and ${Math.round(gas.temp()) - 273} °C. It is heated to ${Math.round(gas.temp()) - 273 + 150} °C. Calculate the new pressure.`, ans: () => { const T1 = Math.round(gas.temp()), T2 = T1 + 150, p = gas.p * P_KPA; return `<ul><li>Convert to kelvin: T₁ = ${T1} K, T₂ = ${T2} K</li><li>p₁/T₁ = p₂/T₂</li><li>p₂ = ${p.toFixed(0)} × ${T2} ÷ ${T1}</li><li>= ${(p * T2 / T1).toFixed(0)} kPa</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Explain, in terms of molecules, why the pressure of a gas in a sealed rigid container rises when it is heated.", ans: "<ul><li>The molecules move faster (have more kinetic energy)</li><li>So they hit the walls more often and harder, giving a greater force on the same area</li></ul>" },
      { lvl: "std", marks: 3, q: "In the ammonia and hydrogen chloride experiment the white ring forms nearer the hydrogen chloride end of the tube. Explain why. (Relative molecular masses: NH₃ = 17, HCl = 36.5.)", ans: "<ul><li>The ring forms where the two gases meet</li><li>Ammonia molecules are lighter, so at the same temperature they move faster</li><li>Ammonia therefore diffuses further along the tube in the same time</li></ul>" },
      { lvl: "std", marks: 2, q: "Smoke particles in air, seen under a microscope, move about at random. What does this show about air?", ans: "<ul><li>Air is made of molecules that are moving quickly and at random</li><li>They hit the much larger smoke particles unevenly from different sides, knocking them about</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Your box holds ${gas.n} atoms at ${gas.temp().toFixed(0)} K in a volume of ${gas.volume().toFixed(0)} nm³ (1 nm³ = 10⁻²⁷ m³). Use pV = NkT to calculate the pressure. (k = 1.38 × 10⁻²³ J/K)`, ans: () => `<ul><li>p = NkT/V</li><li>= ${gas.n} × 1.38 × 10⁻²³ × ${gas.temp().toFixed(0)} ÷ ${(gas.volume() * 1e-27).toExponential(2)}</li><li>= ${(gas.n * R * gas.temp() / gas.volume() * P_KPA).toFixed(0)} kPa (the simulation measures ${(gas.p * P_KPA).toFixed(0)} kPa from the collisions)</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `Calculate the rms speed of ${GASES[S.gas].name} atoms (mass ${GASES[S.gas].m} u) at ${gas.temp().toFixed(0)} K. (1 u = 1.66 × 10⁻²⁷ kg)`, ans: () => `<ul><li>½m⟨c²⟩ = 3/2 kT, so c<sub>rms</sub> = √(3kT/m)</li><li>= √(3 × 1.38 × 10⁻²³ × ${gas.temp().toFixed(0)} ÷ ${(GASES[S.gas].m * 1.66e-27).toExponential(2)})</li><li>= ${(Math.sqrt(3 * R * gas.temp() / GASES[S.gas].m) * 1000).toFixed(0)} m/s</li></ul>` },
      { lvl: "adv", marks: 3, q: "A gas in an insulated cylinder is compressed quickly by a piston. State what happens to its temperature and explain this using the first law of thermodynamics.", ans: "<ul><li>The temperature rises</li><li>No heat is transferred (Q = 0), and work is done on the gas</li><li>So by the first law the internal energy increases, and for an ideal gas internal energy depends only on temperature</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain why the pressure of an ideal gas is proportional to its kelvin temperature at constant volume, starting from p = ⅓(N/V)m⟨c²⟩.", ans: "<ul><li>Mean kinetic energy ½m⟨c²⟩ = 3/2 kT</li><li>So m⟨c²⟩ = 3kT</li><li>Substituting: p = ⅓(N/V) × 3kT = NkT/V</li><li>With N and V fixed, p ∝ T</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `An engine takes in heat at ${eng.Th} K and rejects heat at ${eng.Tc} K. Calculate the greatest efficiency it could possibly have, and explain why a real engine does worse.`, ans: () => `<ul><li>Maximum (Carnot) efficiency = 1 − T<sub>c</sub>/T<sub>h</sub> = 1 − ${eng.Tc}/${eng.Th}</li><li>= ${(100 * (1 - eng.Tc / eng.Th)).toFixed(0)}%</li><li>Real engines have friction, lose heat to the surroundings and run at finite speed, so their processes are not reversible</li></ul>` }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>Up to 3000 gas atoms as hard elastic spheres in a box 40 nm wide (less when the piston is in), 24 nm high and 6 nm deep. You look at it from the front; atoms nearer the back are drawn smaller and dimmer.</p>
<ul><li><b>Molecules</b> fly in straight lines and collide elastically, conserving momentum and kinetic energy. Masses and sizes are those of helium, neon, argon and xenon (single atoms).</li>
<li><b>Pressure</b> is measured, not calculated from a formula: the momentum given to the walls is added up and divided by wall area and time. The dashed lines on the graphs are the ideal gas equation pV = NkT for comparison.</li>
<li><b>Temperature</b> is the average kinetic energy: ½m⟨v²⟩ = 3/2 kT.</li>
<li><b>Walls that conduct heat</b> return each molecule with a random velocity typical of the wall temperature. <b>Insulated walls</b> give a perfect bounce.</li>
<li><b>The piston</b> is either moved by you at 250 m/s (slower than most molecules, but not by much: a fast push heats the gas a little more than a gentle one would) or left free, with mass and a steady outside pressure. A molecule bouncing off a moving piston gains or loses energy: that is the work done.</li>
<li><b>Energy tally:</b> ΔU = Q + W, where Q is heat in through the walls and W is work done on the gas by the piston.</li>
<li><b>Heat engines (Advanced):</b> the piston and the wall temperature are switched through four stages automatically. Work and heat are taken from the same tallies; nothing about efficiency is put in.</li>
<li><b>The diffusion tube:</b> 1100 air molecules, with 160 ammonia and 160 hydrogen chloride molecules released at opposite ends. An ammonia molecule that comes within about 0.9 nm of a hydrogen chloride molecule makes a fixed white speck.</li></ul>
<h3>Simplifications</h3>
<ul><li>Atoms are hard spheres. There are no attractive forces, so this gas can never condense into a liquid, and it has no rotation or vibration (so γ = 5/3, as for a real monatomic gas).</li>
<li>The box is tiny and the gas dense (a few atmospheres to tens of atmospheres) so that collisions are frequent enough to watch. Because the atoms take up a few per cent of the space, the measured pressure sits slightly above the ideal value when the gas is squeezed hard: real gases do this too.</li>
<li>With hundreds of molecules, not 10²³, every reading flickers. That flicker is real physics at this scale and shrinks as the number grows.</li>
<li>Time is advanced in small steps; a very fast pair can occasionally pass through each other.</li>
<li>The free piston has a little friction so that it settles. Gravity, when on, is around 10¹¹ times stronger than the Earth's so that the "atmosphere" fits in 24 nm.</li>
<li>The smoke particle is far smaller and lighter than a real one (2500 u), so its jiggling is exaggerated.</li>
<li>Time on screen is slowed by a factor of about 10¹¹.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its spec notes, exam practice and worksheets, is still here: <a href="original/gas-in-a-box.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The gas");
ctl.n = K.slider(g, { label: "Number of molecules", min: 10, max: 3000, step: 10, value: S.n, on: v => { S.n = v; refill(); } });
ctl.gas = K.seg(g, { label: "Gas", value: "Ar", options: [["He", "He 4"], ["Ne", "Ne 20"], ["Ar", "Ar 40"], ["Xe", "Xe 131"]], on: v => { S.gas = v; refill(); } });
ctl.gasB = K.seg(g, { label: "Mixed half-and-half with", value: "", options: [["", "nothing"], ["He", "He"], ["Ar", "Ar"], ["Xe", "Xe"]], on: v => { S.gasB = v; ctl.colour.set(v ? "gas" : "speed", true); refill(); } });
g = ui.group("Heat");
ctl.conduct = K.toggle(g, { label: "Walls conduct heat (off = insulated)", value: true, on: v => { gas.conduct = v; } });
ctl.Tw = K.slider(g, { label: "Wall temperature", min: 20, max: 1200, step: 10, value: 300, fmt: v => v + " K (" + (v - 273) + " °C)", on: v => { gas.Tw = v; } });
g = ui.group("The piston");
ctl.free = K.seg(g, { value: false, options: [[false, "You hold it"], [true, "Free to move"]], on: v => { gas.free = v; gas.vp = 0; gas.target = gas.L; ctl.L.set(gas.L); if (v) { ctl.pext.set(Math.round(K.clamp(gas.p * P_KPA, 50, 3000) / 10) * 10); gas.pext = ctl.pext.value / P_KPA; } } });
ctl.L = K.slider(g, { label: "Volume", min: LMIN, max: LMAX, step: 0.5, value: LMAX, fmt: v => Math.round(v * BH * BD) + " nm³", on: v => { gas.target = v; if (gas.partition) gas.partition = 0; }, tip: "Or drag the piston. Only when you hold it." });
ctl.pext = K.slider(g, { label: "Outside pressure", min: 50, max: 3000, step: 10, value: 430, unit: "kPa", on: v => { gas.pext = v / P_KPA; }, tip: "Pushes on a free piston" });
g = ui.group("Try this");
let r1 = K.row(g); K.btn(r1, "Give all the same speed", () => { gas.sameSpeed(); hist[0].fill(0); hist[1].fill(0); }); K.btn(r1, "Remove the partition", () => { gas.partition = 0; });
ctl.big = K.toggle(g, { label: "Add a smoke particle", value: false, on: v => addBig(v) });
ctl.track = K.toggle(g, { label: "Track one molecule", value: false, on: v => { track = v; path1 = []; } });
ctl.g = K.slider(g, { label: "Gravity", min: 0, max: 0.008, step: 0.0005, value: 0, fmt: v => v ? (v * 102).toFixed(2) + " × 10¹² g" : "off", on: v => { gas.g = v; } });
const engGroup = g = ui.group("Heat engine (A level)");
ctl.ekind = K.seg(g, { value: "stirling", options: [["stirling", "Stirling"], ["otto", "Otto (petrol)"], ["carnot", "Carnot"]], on: v => { eng.kind = v; if (eng.on) engineStart(true); } });
ctl.Th = K.slider(g, { label: "Hot temperature", min: 350, max: 1200, step: 10, value: 600, unit: "K", on: v => { eng.Th = Math.max(v, eng.Tc + 50); } });
ctl.Tc = K.slider(g, { label: "Cold temperature", min: 100, max: 400, step: 10, value: 300, unit: "K", on: v => { eng.Tc = Math.min(v, eng.Th - 50); } });
ctl.eng = K.toggle(g, { label: "Run the engine", value: false, on: v => engineStart(v) });
const eread = K.readout(g, [["st", "stage"], ["cy", "cycles completed"], ["w", "net work out per cycle"], ["q", "heat in per cycle"], ["eff", "efficiency (measured)"], ["id", "this cycle, ideal"], ["ca", "Carnot limit 1 − Tc/Th"]]);
g = ui.group("What to show");
ctl.graph = K.seg(g, { label: "Right-hand graph", value: "pV", options: [["pV", "p–V"], ["pT", "p–T"], ["VT", "V–T"], ["height", "height"], ["mix", "mixing"], ["ring", "tube"]], on: v => { graph = v; } });
ctl.colour = K.seg(g, { label: "Colour molecules by", value: "speed", options: [["speed", "kinetic energy"], ["gas", "which gas"]], on: v => { colourBy = v; } });
ctl.rate = K.slider(g, { label: "Slow motion", min: 1, max: 80, step: 1, value: rate, fmt: v => v + " ps each second", on: v => rate = v });
r1 = K.row(g); K.btn(r1, "Clear the graphs and tallies", clearLog);
const read = K.readout(g, [["T", "gas temperature"], ["p", "pressure (measured)"], ["pi", "pressure (NkT/V)"], ["V", "volume"], ["v", "typical speed"], ["ke", "mean KE per molecule"], ["mfp", "mean free path"], ["dU", "ΔU since cleared"], ["Q", "heat in, Q"], ["W", "work done on gas, W"]]);
function set(o) {
  if (o.n != null) { S.n = o.n; ctl.n.set(o.n); } if (o.gas != null) { S.gas = o.gas; ctl.gas.set(o.gas); } if (o.gasB != null) { S.gasB = o.gasB; ctl.gasB.set(o.gasB); }
  if (o.Tw != null) { gas.Tw = o.Tw; ctl.Tw.set(o.Tw); } if (o.conduct != null) { gas.conduct = o.conduct; ctl.conduct.set(o.conduct); }
  if (o.L != null) { gas.L = gas.target = o.L; ctl.L.set(o.L); } if (o.free != null) { gas.free = o.free; gas.vp = 0; ctl.free.set(o.free); } if (o.pext != null) { gas.pext = o.pext / P_KPA; ctl.pext.set(o.pext); }
  if (o.g != null) { gas.g = o.g; ctl.g.set(o.g); } if (o.big != null) { addBig(o.big); ctl.big.set(o.big); } if (o.track != null) { track = o.track; ctl.track.set(o.track); path1 = []; }
  if (eng.on && !o.engine) { engineStart(false); ctl.eng.set(false); }
  if (o.graph) { graph = o.graph; ctl.graph.set(o.graph); } if (o.colour) { colourBy = o.colour; ctl.colour.set(o.colour); }
}

// ---------------- Drawing ----------------
const RAMP = [[70, 110, 255], [90, 200, 255], [235, 245, 255], [255, 200, 90], [255, 90, 50]];   // slow (blue) → fast (red-orange)
const ramp = t => { t = K.clamp(t, 0, 1) * (RAMP.length - 1); const i = Math.min(RAMP.length - 2, t | 0), f = t - i; return RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * f)); };
const sprites = new Map();
function sprite(rgb, rpx) {   // a small glowing ball, drawn once and stamped many times
  const key = rgb.join() + "|" + rpx.toFixed(1); let s = sprites.get(key); if (s) return s;
  const R2 = Math.ceil(rpx * 3.2) + 1; s = document.createElement("canvas"); s.width = s.height = R2 * 2; const c = s.getContext("2d"), gr = c.createRadialGradient(R2, R2, 0, R2, R2, R2);
  gr.addColorStop(0, `rgba(${rgb.map(v => Math.min(255, v + 60)).join()},1)`); gr.addColorStop(rpx / R2 * 0.9, `rgba(${rgb.join()},.95)`); gr.addColorStop(Math.min(.99, rpx / R2 * 1.25), `rgba(${rgb.join()},.22)`); gr.addColorStop(1, `rgba(${rgb.join()},0)`);
  c.fillStyle = gr; c.fillRect(0, 0, R2 * 2, R2 * 2); s.half = R2; sprites.set(key, s); if (sprites.size > 900) sprites.clear(); return s;
}
const GASCOL = [[90, 200, 255], [255, 170, 70]], TUBECOL = [[62, 72, 96], [62, 72, 96], [80, 225, 255], [255, 140, 70], [255, 255, 255]];
const wallCol = T => { const c = ramp(T / 1000); return `rgb(${c.join()})`; };
let view = { s: 20, ox: 30, oy: 30 };
const cv = ui.canvas(c => { view.s = Math.min((c.w - 225) / LMAX, (c.h - 56) / BH); view.ox = 22; view.oy = (c.h - BH * view.s) / 2; });
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, { s, ox, oy } = view, L = gas.L, X = x => ox + x * s, Y = y => oy + (BH - y) * s;
  const bgr = c.createLinearGradient(0, 0, 0, h); bgr.addColorStop(0, "#070b16"); bgr.addColorStop(1, "#0b1222"); c.fillStyle = bgr; c.fillRect(0, 0, w, h);
  c.fillStyle = "#03060d"; c.fillRect(X(0), Y(BH), L * s, BH * s);
  // molecules, stamped with "lighter" blending so overlapping glows add up
  c.globalCompositeOperation = "lighter";
  const { x, y, z, vx, vy, vz, m, r, sp, n } = gas, bySpeed = colourBy === "speed";
  for (let i = 0; i < n; i++) {
    const depth = (sp[i] === SMOKE ? 1.2 : 0.72 + 0.4 * z[i] / BD), rgb = S.tube ? TUBECOL[sp[i]] : bySpeed ? ramp((Math.round(m[i] * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]) / (3 * R) / 60) * 60) / 1400) : GASCOL[sp[i]];
    const im = sprite(rgb, Math.max(1.2, Math.round(r[i] * s * depth * 2.2) / 2)); c.globalAlpha = 0.45 + 0.55 * z[i] / BD; c.drawImage(im, X(x[i]) - im.half, Y(y[i]) - im.half);
  }
  c.globalAlpha = 1;
  // sparks where molecules have just hit a wall
  const sk = gas.sparks; c.fillStyle = "#fff"; for (let i = sk.length - 1; i >= 0; i--) { const q = sk[i]; c.globalAlpha = q[2] * .8; const px = X(q[0] < .5 ? 0 : q[0]), py = Y(q[1] < .5 ? 0 : q[1] > BH - .5 ? BH : q[1]); if (q[3] === 0) c.fillRect(px - 1.5, py - 5 * q[2], 3, 10 * q[2]); else c.fillRect(px - 5 * q[2], py - 1.5, 10 * q[2], 3); q[2] -= 0.09; if (q[2] <= 0) sk.splice(i, 1); }
  c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  if (track && n) {   // one molecule's zig-zag path
    c.strokeStyle = "rgba(120,255,160,.85)"; c.lineWidth = 1.4; c.beginPath(); path1.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.stroke();
    c.strokeStyle = "#9dffb8"; c.lineWidth = 2; c.beginPath(); c.arc(X(x[0]), Y(y[0]), 8, 0, 6.3); c.stroke();
  }
  const b = gas.big; if (b) {
    c.strokeStyle = "rgba(255,225,140,.75)"; c.lineWidth = 1.3; c.beginPath(); bigTrail.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.stroke();
    const gr = c.createRadialGradient(X(b.x) - b.r * s * .3, Y(b.y) - b.r * s * .3, 1, X(b.x), Y(b.y), b.r * s); gr.addColorStop(0, "#f4efe2"); gr.addColorStop(1, "#7d7466"); c.fillStyle = gr; c.beginPath(); c.arc(X(b.x), Y(b.y), b.r * s, 0, 6.3); c.fill();
  }
  // the walls: glowing with their temperature if they conduct, grey and hatched if insulated
  c.lineWidth = 5; c.lineJoin = "round";
  if (gas.conduct) { c.strokeStyle = wallCol(gas.Tw); c.shadowColor = c.strokeStyle; c.shadowBlur = 12; } else c.strokeStyle = "#8b93a5";
  c.beginPath(); c.moveTo(X(L) + 2, Y(BH) - 3); c.lineTo(X(0) - 3, Y(BH) - 3); c.lineTo(X(0) - 3, Y(0) + 3); c.lineTo(X(L) + 2, Y(0) + 3); c.stroke(); c.shadowBlur = 0;
  c.strokeStyle = "rgba(140,150,170,.35)"; c.lineWidth = 5; c.beginPath(); c.moveTo(X(L), Y(BH) - 3); c.lineTo(X(LMAX) + 8, Y(BH) - 3); c.moveTo(X(L), Y(0) + 3); c.lineTo(X(LMAX) + 8, Y(0) + 3); c.stroke();   // the empty cylinder beyond the piston
  if (!gas.conduct) { c.strokeStyle = "rgba(200,205,220,.5)"; c.lineWidth = 1; c.beginPath(); for (let q = X(0) - 6; q < X(L); q += 9) { c.moveTo(q, Y(BH) - 11); c.lineTo(q + 6, Y(BH) - 5); c.moveTo(q, Y(0) + 5); c.lineTo(q + 6, Y(0) + 11); } c.stroke(); }
  if (gas.partition) { c.fillStyle = "#c9cfdd"; c.fillRect(X(gas.partition) - 2, Y(BH), 4, BH * s); }
  // the piston
  const px = X(L), pg = c.createLinearGradient(px, 0, px + 16, 0); pg.addColorStop(0, "#dfe5f2"); pg.addColorStop(.5, "#8f99ad"); pg.addColorStop(1, "#5d6678"); c.fillStyle = pg; c.fillRect(px, Y(BH), 16, BH * s);
  c.fillStyle = "#737d92"; c.fillRect(px + 16, Y(BH / 2) - 7, Math.max(30, X(LMAX) + 60 - px), 14);
  c.fillStyle = "#cfd6e6"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.textBaseline = "middle";
  if (gas.free) { c.fillStyle = "#ffd28a"; for (const yy of [0.2, 0.8]) { const ay = Y(BH * yy), ax = px + 24; c.beginPath(); c.moveTo(ax + 40, ay - 3); c.lineTo(ax + 12, ay - 3); c.lineTo(ax + 12, ay - 9); c.lineTo(ax, ay); c.lineTo(ax + 12, ay + 9); c.lineTo(ax + 12, ay + 3); c.lineTo(ax + 40, ay + 3); c.fill(); } c.fillText("outside pressure", px + 24, Y(BH * 0.2) - 18); }
  else if (px < w - 150) c.fillText("⇠ drag the piston ⇢", px + 24, Y(BH) + 14);
  c.fillStyle = "rgba(200,210,230,.6)"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(gas.conduct ? "walls at " + gas.Tw + " K" : "insulated walls: no heat in or out", X(0), Y(0) + 18);
  c.textAlign = "right"; c.fillText("10 nm", X(10), Y(BH) - 14); c.strokeStyle = "rgba(200,210,230,.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(0), Y(BH) - 9); c.lineTo(X(10), Y(BH) - 9); c.stroke();
}
let dragP = false;
K.pointer(cv.el, { down(p) { if (!gas.free && Math.abs(p.x - (view.ox + gas.L * view.s) - 8) < 26) dragP = true; }, drag(p) { if (dragP) { const L = K.clamp((p.x - 8 - view.ox) / view.s, LMIN, LMAX); gas.target = L; ctl.L.set(Math.round(L * 2) / 2); if (gas.partition) gas.partition = 0; } }, up() { dragP = false; } });

const chV = K.chart(ui.dock, { title: "How fast are the molecules?", xLabel: "speed (m/s)", yLabel: "share of molecules", yMin: 0 });
const chG = K.chart(ui.dock, { title: "", yMin: 0 });
const VB = 36;
function charts() {
  // --- speeds: bars are the molecules now (averaged over the last second or so); dashed curve is the Maxwell–Boltzmann prediction ---
  const T = gas.temp() || 1, mMin = Math.min(GASES[S.gas].m, S.gasB ? GASES[S.gasB].m : 1e9), vmax = Math.ceil(3.1 * Math.sqrt(3 * R * Math.max(T, 60) / mMin) * 10) / 10, bw = vmax / VB, cnt = [0, 0];
  if (charts.vmax !== vmax) { hist[0].fill(0); hist[1].fill(0); charts.vmax = vmax; }
  for (const hh of hist) for (let k = 0; k < VB; k++) hh[k] *= 0.86;
  for (let i = 0; i < gas.n; i++) { const v = Math.hypot(gas.vx[i], gas.vy[i], gas.vz[i]), k = v / bw | 0; if (gas.sp[i] < 2) { if (k < VB) hist[gas.sp[i]][k]++; cnt[gas.sp[i]]++; } }
  const series = [], names = [GASES[S.gas].name, S.gasB ? GASES[S.gasB].name : ""], cols = S.gasB ? ["rgb(90,200,255)", "rgb(255,170,70)"] : [K.cssVar("--s0")];
  for (let q = 0; q < (S.gasB ? 2 : 1); q++) {
    let tot = 0; for (let k = 0; k < VB; k++) tot += hist[q][k]; tot = tot || 1;
    series.push({ type: "bars", w: bw * 1000, color: cols[q], alpha: S.gasB ? .6 : .8, label: names[q], pts: Array.from(hist[q], (v, k) => [(k + .5) * bw * 1000, v / tot]) });
    const mm = GASES[q ? S.gasB : S.gas].m, Tq = gas.temp(q) || T, a = mm / (2 * R * Tq), th = []; for (let k = 0; k <= 72; k++) { const v = vmax * k / 72; th.push([v * 1000, 4 * Math.PI * Math.pow(a / Math.PI, 1.5) * v * v * Math.exp(-a * v * v) * bw]); }   // Maxwell–Boltzmann: f(v) ∝ v² exp(−mv²/2kT)
    series.push({ pts: th, color: cols[q], dash: [5, 4], label: q ? "" : "Maxwell–Boltzmann" });
  }
  chV.draw(series, { xMin: 0, xMax: vmax * 1000 });
  // --- the second graph ---
  const N = gas.n, V = gas.volume(), dot = K.cssVar("--s0"), th = K.cssVar("--s1"), now = K.cssVar("--s2");
  if (graph === "pV") { const pts = []; for (let v = LMIN * BH * BD; v <= LMAX * BH * BD; v += 60) pts.push([v, N * R * T / v * P_KPA]); const ser = [{ pts, color: th, dash: [5, 4], label: "isotherm at " + T.toFixed(0) + " K" }]; if (!gas.conduct) ser.push({ pts: pts.map(q => [q[0], gas.p * P_KPA * Math.pow(V / q[0], 5 / 3)]), color: "#c58cff", dash: [2, 4], label: "adiabat: pV^(5/3) constant" });
    chG.draw([...ser, eng.on ? { pts: trail.map(q => [q[0], q[1]]), color: dot, width: 1.6, label: "the engine's cycle" } : { pts: trail.map(q => [q[0], q[1]]), type: "dots", color: dot, r: 2.2, alpha: .55, label: "measured" }, { pts: [[V, gas.p * P_KPA]], type: "dots", color: now, r: 5 }], { title: "Pressure against volume", xLabel: "volume (nm³)", yLabel: "pressure (kPa)", xMin: 1000, xMax: 6000 }); }
  else if (graph === "pT") chG.draw([{ pts: [[0, 0], [1000, N * R * 1000 / V * P_KPA]], color: th, dash: [5, 4], label: "p = NkT/V" }, { pts: trail.map(q => [q[2], q[1]]), type: "dots", color: dot, r: 2.2, alpha: .55, label: "measured" }, { pts: [[T, gas.p * P_KPA]], type: "dots", color: now, r: 5 }], { title: "Pressure against temperature", xLabel: "gas temperature (K)", yLabel: "pressure (kPa)", xMin: 0, xMax: 1000 });
  else if (graph === "VT") { const pe = gas.free ? gas.pext : gas.p; chG.draw([{ pts: [[0, 0], [1000, N * R * 1000 / pe]], color: th, dash: [5, 4], label: "V = NkT/p" }, { pts: trail.map(q => [q[2], q[0]]), type: "dots", color: dot, r: 2.2, alpha: .55, label: "measured" }, { pts: [[T, V]], type: "dots", color: now, r: 5 }], { title: "Volume against temperature", xLabel: "gas temperature (K)", yLabel: "volume (nm³)", xMin: 0, xMax: 1000, yMax: 6000 }); }
  else if (graph === "height") {
    for (let k = 0; k < 24; k++) hgt[k] *= 0.9; for (let i = 0; i < N; i++) hgt[Math.min(23, gas.y[i] | 0)]++; let tot = 0; for (let k = 0; k < 24; k++) tot += hgt[k];
    const ser = [{ type: "bars", w: 1, color: dot, alpha: .8, label: "molecules at each height", pts: Array.from(hgt, (v, k) => [k + .5, v / (tot || 1)]) }];
    if (gas.g && !S.gasB) { const hs = R * T / (GASES[S.gas].m * gas.g), norm = hs * (1 - Math.exp(-BH / hs)), pts = []; for (let k = 0; k <= 48; k++) pts.push([k / 2, Math.exp(-k / 2 / hs) / norm]); ser.push({ pts, color: th, dash: [5, 4], label: "exp(−mgh/kT)" }); }
    chG.draw(ser, { title: "How the gas is spread with height", xLabel: "height (nm)", yLabel: "share per nm", xMin: 0, xMax: 24 });
  } else if (graph === "ring") {
    const hb = new Float32Array(20); let made = 0; for (let i = 0; i < N; i++) if (gas.sp[i] === SMOKE) { hb[Math.min(19, gas.x[i] / 2 | 0)] += 0.5; made += 0.5; }
    chG.draw([{ type: "bars", w: 2, color: "#e8ecf5", alpha: .85, label: "specks of white solid (" + made + ")", pts: Array.from(hb, (v, k) => [k * 2 + 1, v]) }], { title: "Where the white ring forms", xLabel: "distance from the ammonia end (nm)", yLabel: "specks", xMin: 0, xMax: 40, vlines: [{ x: 20, label: "half-way" }, { x: 40 * Math.sqrt(36.5 / 17) / (1 + Math.sqrt(36.5 / 17)), label: "predicted from the masses", color: K.cssVar("--s1"), row: 1 }] });
  } else chG.draw([{ pts: mixLog.map(q => [q[0], q[1]]), color: "rgb(90,200,255)", label: GASES[S.gas].name + " that has crossed to the right" }, { pts: mixLog.map(q => [q[0], q[2]]), color: "rgb(255,170,70)", label: (S.gasB ? GASES[S.gasB].name : "second gas") + " that has crossed to the left" }], { title: "Mixing", xLabel: "time (ps)", yLabel: "% on the far side", yMax: 60, hlines: [{ y: 50, label: "fully mixed" }] });
}

// ---------------- A heat engine made of molecules (Advanced) ----------------
/* The engine is nothing more than a rule for when to move the piston and what temperature to make the walls.
   Each cycle has four stages. Work out = the net work the gas does on the piston; heat in = the heat that flowed in from the hot walls. */
const eng = { on: false, kind: "stirling", Th: 600, Tc: 300, stage: 0, t0: 0, warm: true, q0: 0, w0: 0, qin: 0, sumW: 0, sumQ: 0, cycles: 0 };
const STAGE = {
  stirling: ["hot expansion: heat in, work out", "cooling at constant volume", "cold compression: work in, heat out", "heating at constant volume"],
  otto: ["power stroke: insulated expansion", "exhaust: cooling at constant volume", "compression stroke: insulated", "ignition: heating at constant volume"],
  carnot: ["hot expansion at constant temperature", "insulated expansion: cools to the cold temperature", "cold compression at constant temperature", "insulated compression: heats to the hot temperature"]
};
function engineApply() {
  const k = eng.kind, st = eng.stage, rT = Math.pow(eng.Th / eng.Tc, 1.5), hot = st === 0 || st === 3;
  if (k === "stirling") { gas.conduct = true; gas.Tw = hot ? eng.Th : eng.Tc; gas.target = st === 0 ? 36 : st === 2 ? 14 : gas.L; }
  else if (k === "otto") { gas.conduct = st === 1 || st === 3; gas.Tw = st === 3 ? eng.Th : eng.Tc; gas.target = st === 0 ? 36 : st === 2 ? 12 : gas.L; }
  else { gas.conduct = st === 0 || st === 2; gas.Tw = st === 0 ? eng.Th : eng.Tc; gas.target = [Math.max(9, LMAX / rT), LMAX, Math.min(38, LMIN * rT), LMIN][st]; }
  ctl.conduct.set(gas.conduct); ctl.Tw.set(gas.Tw);
}
function engineStart(on) { eng.on = on; gas.free = false; ctl.free.set(false); gas.ps = on ? 0.05 : PISTON_SPEED;   /* the engine's piston moves gently (50 m/s) so that the gas can keep up with it */
  if (!on) return; Object.assign(eng, { stage: 3, t0: gas.t, warm: true, sumW: 0, sumQ: 0, cycles: 0, qin: 0, q0: gas.Q, w0: gas.W }); trail = []; graph = "pV"; ctl.graph.set("pV"); engineApply(); }
function engineStep() {
  const T = gas.temp(), moved = Math.abs(gas.target - gas.L) < 0.02, waited = gas.t - eng.t0, st = eng.stage, k = eng.kind;
  const still = k === "stirling" ? st === 1 || st === 3 : k === "otto" ? st === 1 || st === 3 : false;          // stages where the piston stays put and only heat flows
  const done = still ? (waited > 12 && (st === 3 ? T > eng.Th * 0.96 : T < eng.Tc * 1.04)) || waited > 150 : moved && waited > 5;
  if (!done) return;
  const dQ = gas.Q - eng.q0; if (dQ > 0) eng.qin += dQ; eng.q0 = gas.Q; eng.stage = (st + 1) % 4; eng.t0 = gas.t;
  if (eng.stage === 0) { if (!eng.warm) { eng.sumW += -(gas.W - eng.w0); eng.sumQ += eng.qin; eng.cycles++; } eng.warm = false; eng.w0 = gas.W; eng.qin = 0; trail = []; }
  engineApply();
}
const engIdeal = () => { const r = eng.kind === "otto" ? 3 : 36 / 14, a = eng.Th - eng.Tc; return eng.kind === "carnot" ? 1 - eng.Tc / eng.Th : eng.kind === "otto" ? 1 - Math.pow(r, -2 / 3) : a * Math.log(r) / (eng.Th * Math.log(r) + 1.5 * a); };

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  let left = rate * Math.max(dt, 1 / 120), guard = 0; const h = safeDt(gas);
  while (left > 1e-6 && guard++ < (eng.on ? 45 : 14)) { const d = Math.min(h, left); gas.step(d); if (eng.on) engineStep(); left -= d; }
  if (track && gas.n) { path1.push([gas.x[0], gas.y[0]]); if (path1.length > 900) path1.shift(); }
  if (gas.big) { bigTrail.push([gas.big.x, gas.big.y]); if (bigTrail.length > 1500) bigTrail.shift(); }
  if (gas.free || Math.abs(gas.target - gas.L) > 0.01) ctl.L.set(Math.round(gas.L * 2) / 2);
  sampleT += dt; if (sampleT > 0.35) { sampleT = 0; trail.push([gas.volume(), gas.p * P_KPA, gas.temp()]); if (trail.length > 500) trail.shift();
    if (S.gasB) { let a = 0, b = 0, na = 0, nb = 0; for (let i = 0; i < gas.n; i++) { if (gas.sp[i]) { nb++; if (gas.x[i] < gas.L / 2) b++; } else { na++; if (gas.x[i] > gas.L / 2) a++; } } if (!gas.partition || !mixLog.length) mixLog.push([gas.t, 100 * a / (na || 1), 100 * b / (nb || 1)]); if (mixLog.length > 600) mixLog.shift(); } }
}, () => {
  draw(); if (frame++ % 6) return;
  charts();
  const T = gas.temp(), N = gas.n, V = gas.volume(), U = gas.ke(), pk = gas.p * P_KPA, z = v => (v * E_ZJ).toFixed(0) + " × 10⁻²¹ J";
  read.set("T", T.toFixed(0) + " K"); read.set("p", pk.toFixed(0) + " kPa"); read.set("pi", (N * R * T / V * P_KPA).toFixed(0) + " kPa"); read.set("V", V.toFixed(0) + " nm³");
  read.set("v", (Math.sqrt(3 * R * T / GASES[S.gas].m) * 1000).toFixed(0) + " m/s" + (S.gasB ? " · " + (Math.sqrt(3 * R * T / GASES[S.gasB].m) * 1000).toFixed(0) : "")); read.set("ke", (U / (N || 1) * E_ZJ).toFixed(2) + " × 10⁻²¹ J");
  read.set("mfp", gas.mfp ? gas.mfp.toFixed(1) + " nm" : "–"); read.set("dU", z(U - U0)); read.set("Q", z(gas.Q)); read.set("W", z(gas.W));
  if (eng.on) { eread.set("st", (eng.stage + 1) + ": " + STAGE[eng.kind][eng.stage]); eread.set("cy", eng.cycles); eread.set("w", eng.cycles ? z(eng.sumW / eng.cycles) : "–"); eread.set("q", eng.cycles ? z(eng.sumQ / eng.cycles) : "–"); eread.set("eff", eng.cycles ? (100 * eng.sumW / eng.sumQ).toFixed(0) + "%" : "–"); eread.set("id", (100 * engIdeal()).toFixed(0) + "%"); eread.set("ca", (100 * (1 - eng.Tc / eng.Th)).toFixed(0) + "%"); }
  ui.hud(`<b style="font-size:15px">p = ${pk.toFixed(0)} kPa</b><br>V = ${V.toFixed(0)} nm³ · T = ${T.toFixed(0)} K<br>N = ${N}` + (eng.on ? `<br><span style="color:#ffd28a">stage ${eng.stage + 1}: ${STAGE[eng.kind][eng.stage].split(":")[0]}</span>` : "") + (S.tube ? `<br><span style="color:rgb(80,225,255)">ammonia</span> · <span style="color:rgb(255,140,70)">hydrogen chloride</span> · white: solid` : "") + (S.gasB ? `<br><span style="color:rgb(90,200,255)">${GASES[S.gas].name} ${gas.temp(0).toFixed(0)} K</span> · <span style="color:rgb(255,170,70)">${GASES[S.gasB].name} ${gas.temp(1).toFixed(0)} K</span>` : ""));
});
ui.onLevel = v => { engGroup.style.display = v === "adv" ? "" : "none"; if (v !== "adv" && eng.on) { engineStart(false); ctl.eng.set(false); } }; ui.onLevel(ui.level);
refill();
ui.tip("Each dot is one atom · drag the piston to squeeze the gas · colour shows kinetic energy", 8000);
