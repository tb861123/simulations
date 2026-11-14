/* =====================================================================
   GALAXY COLLISIONS
   Galaxies are mostly empty space, so when two of them meet the stars
   do not hit one another. What changes everything is GRAVITY: each
   galaxy raises tides in the other, flinging stars out into long tails
   and bridges, and the invisible dark matter around them acts as a
   brake that makes them fall back together and merge.

   The model (after Toomre & Toomre, 1972, the paper that first showed
   that tails are tidal):
     * Each galaxy is a fixed-shape lump of mass: a compact visible part
       plus (optionally) a much bigger, heavier halo of dark matter.
     * The two lumps move under each other's gravity, with "dynamical
       friction" when their halos overlap.
     * Up to 300 000 stars start on circular orbits in a thin disc (plus
       a central bulge). Each star feels the gravity of BOTH galaxies
       but is too light to pull on anything itself.

   UNITS: kiloparsecs (1 kpc = 3260 light years), millions of years
   (Myr) and 10^10 solar masses. In these units G = 0.044985.
   ===================================================================== */
const G = 0.044985, DT = 2;            // time step: 2 million years
const KMS = 977.8;                     // 1 kpc/Myr = 977.8 km/s
const LNL = 1.0;                       // strength of dynamical friction (the "Coulomb logarithm"), chosen so that Milky-Way-like pairs merge after two or three passes
function erf(x) { const t = 1 / (1 + 0.47047 * x); return 1 - t * (0.3480242 + t * (-0.0958798 + t * 0.7478556)) * Math.exp(-x * x); }

class Galaxy {
  constructor(M, halo) {            // M = visible mass; halo = dark mass as a multiple of M
    const s = Math.cbrt(M / 6);      // sizes scale with the cube root of mass (6 = a Milky Way)
    this.M = M; this.a = 2.5 * s; this.Mh = M * halo; this.ah = 30 * s; this.Rd = 3 * s; this.Mt = M + this.Mh;
    this.x = this.y = this.z = this.vx = this.vy = this.vz = 0;
  }
  enc(r) { return this.M * r * r * r / Math.pow(r * r + this.a * this.a, 1.5) + this.Mh * r * r / ((r + this.ah) * (r + this.ah)); }   // mass inside radius r
  g(r) { return G * this.enc(r) / (r * r + 1e-9); }                                                                                      // inward pull at radius r
  rho(r) { return 3 * this.M / (4 * Math.PI * this.a ** 3) * Math.pow(1 + r * r / (this.a * this.a), -2.5) + this.Mh * this.ah / (2 * Math.PI * (r + 0.3) * Math.pow(r + this.ah, 3)); }   // density at radius r
}

/* One encounter. o = { ratio (mass of B / mass of A), rp (closest approach, kpc), vf (speed at closest approach / escape speed),
   tiltA, tiltB (degrees: 0 = disc spins the same way as the orbit, 180 = against it), halo (dark mass / visible mass), n (stars) } */
class Encounter {
  constructor(o, rand) {
    this.o = o; this.rand = rand; const A = this.A = new Galaxy(6, o.halo), B = this.B = new Galaxy(6 * o.ratio, o.halo);
    this.t = 0; this.merged = false; this.passes = 0; this.minSep = 1e9; this.tMerge = null; this.tPeri = null; this._d = [1e9, 1e9]; this.sepLog = []; this.trA = []; this.trB = [];
    this.launch(); this.t0 = this.t; this.apo = this.sep(); this.makeStars(o.n);
  }
  // the pull between the two galaxies when their centres are r apart (each feels the other's mass inside r)
  force(r) { return G * 0.5 * (this.B.Mt * this.A.enc(r) + this.A.Mt * this.B.enc(r)) / (r * r + 1e-9); }
  /* Starting positions: put the galaxies at their closest approach with the chosen speed, then run time BACKWARDS
     (without friction) until they are far apart. The simulation then plays forwards from there. */
  launch() {
    const { A, B, o } = this, M = A.Mt + B.Mt, mu = A.Mt * B.Mt / M;
    if (o.custom) { const c = o.custom; A.x = -c.r * B.Mt / M; B.x = c.r * A.Mt / M; A.vx = -c.vr * B.Mt / M; B.vx = c.vr * A.Mt / M; A.vy = -c.vt * B.Mt / M; B.vy = c.vt * A.Mt / M; return; }
    let pot = 0; for (let r = o.rp, k = 0; k < 400; k++) { const dr = r * 0.03; pot += this.force(r + dr / 2) * dr; r += dr; }     // energy needed to escape from closest approach
    const vesc = Math.sqrt(2 * pot / mu), vp = o.vf * vesc; this.vesc = vesc;
    let x = o.rp, y = 0, vx = 0, vy = vp, rPrev = o.rp; const rStart = Math.max(3 * o.rp, 4.5 * (A.Rd + B.Rd) * 3), h = -1;
    for (let k = 0; k < 6000; k++) { const r = Math.hypot(x, y), f = this.force(r) / mu / r; vx -= f * x * h; vy -= f * y * h; x += vx * h; y += vy * h; const rn = Math.hypot(x, y); if (rn >= rStart || rn < rPrev) break; rPrev = rn; this.t += h; }
    A.x = -x * B.Mt / M; A.y = -y * B.Mt / M; B.x = x * A.Mt / M; B.y = y * A.Mt / M; A.vx = -vx * B.Mt / M; A.vy = -vy * B.Mt / M; B.vx = vx * A.Mt / M; B.vy = vy * A.Mt / M;
  }
  makeStars(n) {
    const r = this.rand, p = this.p = new Float32Array(3 * n), v = this.v = new Float32Array(3 * n); this.n = n;
    this.gal = new Uint8Array(n); this.type = new Uint8Array(n); this.R0 = new Float32Array(n); this.burst = new Float32Array(n); this.c0 = null;
    const nB = Math.round(n * Math.max(0.12, Math.min(0.5, this.B.M / (this.A.M + this.B.M))));
    for (let i = 0; i < n; i++) {
      const gi = i < n - nB ? 0 : 1, g = gi ? this.B : this.A, tilt = (gi ? this.o.tiltB : this.o.tiltA) * Math.PI / 180, node = gi ? 0.9 : 0, o3 = 3 * i;
      let x, y, z, vx, vy, vz; const u = r();
      if (u < 0.15) {          // BULGE: old stars on circular orbits tipped at random angles, making a round swarm
        const rad = Math.min(5 * g.a / 2.5, 0.7 * (g.a / 2.5) / Math.sqrt(Math.pow(r() * 0.98 + 0.01, -2 / 3) - 1)), ct = 2 * r() - 1, st = Math.sqrt(1 - ct * ct), ph = r() * 6.2832, ex = st * Math.cos(ph), ey = st * Math.sin(ph), ez = ct;
        let tx = r() - .5, ty = r() - .5, tz = r() - .5; const dt = tx * ex + ty * ey + tz * ez; tx -= dt * ex; ty -= dt * ey; tz -= dt * ez; const tl = Math.hypot(tx, ty, tz) || 1, vc = Math.sqrt(rad * g.g(rad));
        x = ex * rad; y = ey * rad; z = ez * rad; vx = tx / tl * vc; vy = ty / tl * vc; vz = tz / tl * vc; this.type[i] = 1; this.R0[i] = rad;
      } else {                 // DISC: thin, with more stars near the middle, all circling the same way at the speed that balances gravity
        let rad; do { rad = -g.Rd * Math.log((r() + 1e-9) * (r() + 1e-9)); } while (rad > 4.5 * g.Rd || rad < 0.3);
        const ph = r() * 6.2832, vc = Math.sqrt(rad * g.g(rad)), c = Math.cos(ph), s = Math.sin(ph), jit = 0.04 * vc;
        const lx = rad * c, ly = rad * s, lz = r.gauss() * 0.12 * g.Rd / 3, lvx = -vc * s + r.gauss() * jit, lvy = vc * c + r.gauss() * jit, lvz = r.gauss() * jit * .5;
        const ci = Math.cos(tilt), si = Math.sin(tilt), cn = Math.cos(node), sn = Math.sin(node);          // tip the disc, then turn it
        const y1 = ly * ci - lz * si, z1 = ly * si + lz * ci, vy1 = lvy * ci - lvz * si, vz1 = lvy * si + lvz * ci;
        x = lx * cn - y1 * sn; y = lx * sn + y1 * cn; z = z1; vx = lvx * cn - vy1 * sn; vy = lvx * sn + vy1 * cn; vz = vz1;
        this.type[i] = u < 0.36 ? 2 : 0; this.R0[i] = rad;                                                  // about a quarter of the disc "stars" stand for gas clouds
      }
      this.gal[i] = gi; p[o3] = g.x + x; p[o3 + 1] = g.y + y; p[o3 + 2] = g.z + z; v[o3] = g.vx + vx; v[o3 + 1] = g.vy + vy; v[o3 + 2] = g.vz + vz;
    }
  }
  step() {
    const { A, B, p, v, n } = this, h = DT;
    // ---- every star: add up the pull of both galaxies, then move ----
    const ax0 = A.x, ay0 = A.y, az0 = A.z, bx0 = B.x, by0 = B.y, bz0 = B.z, GA = G * A.M, GAh = G * A.Mh, GB = G * B.M, GBh = G * B.Mh, a2 = A.a * A.a, b2 = B.a * B.a, ah = A.ah, bh = B.ah;
    for (let i = 0, o = 0; i < n; i++, o += 3) {
      const x = p[o], y = p[o + 1], z = p[o + 2];
      let dx = x - ax0, dy = y - ay0, dz = z - az0, r2 = dx * dx + dy * dy + dz * dz, s = r2 + a2, r = Math.sqrt(r2), k = GA / (s * Math.sqrt(s)) + GAh / ((r + 0.05) * (r + ah) * (r + ah));
      let ax = -k * dx, ay = -k * dy, az = -k * dz;
      dx = x - bx0; dy = y - by0; dz = z - bz0; r2 = dx * dx + dy * dy + dz * dz; s = r2 + b2; r = Math.sqrt(r2); k = GB / (s * Math.sqrt(s)) + GBh / ((r + 0.05) * (r + bh) * (r + bh));
      ax -= k * dx; ay -= k * dy; az -= k * dz;
      v[o] += ax * h; v[o + 1] += ay * h; v[o + 2] += az * h; p[o] = x + v[o] * h; p[o + 1] = y + v[o + 1] * h; p[o + 2] = z + v[o + 2] * h;
    }
    // ---- the two galaxies themselves ----
    let dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, r = Math.hypot(dx, dy, dz) + 1e-6; const F = this.force(r), M = A.Mt + B.Mt;
    A.vx += F / A.Mt * dx / r * h; A.vy += F / A.Mt * dy / r * h; A.vz += F / A.Mt * dz / r * h; B.vx -= F / B.Mt * dx / r * h; B.vy -= F / B.Mt * dy / r * h; B.vz -= F / B.Mt * dz / r * h;
    /* Dynamical friction (Chandrasekhar's formula). A galaxy ploughing through the other's halo pulls halo matter into a wake
       behind it, and the wake's gravity holds it back. The orbit loses energy, so the pair cannot escape and spirals together. */
    let ux = B.vx - A.vx, uy = B.vy - A.vy, uz = B.vz - A.vz; const u = Math.hypot(ux, uy, uz) + 1e-9;
    // Only the part of each galaxy that lies inside the gap between them (sat.enc) is counted: the rest is too loosely held to act as one body.
    const drag = (host, sat) => { const X = u / Math.sqrt(r * host.g(r) + 1e-12); return 4 * Math.PI * G * G * sat.enc(r) * host.rho(r) * LNL * (erf(X) - 2 * X / Math.sqrt(Math.PI) * Math.exp(-X * X)) / (u * u); };
    const dec = Math.min(0.08, (drag(A, B) + drag(B, A)) * h / u); ux *= dec; uy *= dec; uz *= dec;
    B.vx -= ux * A.Mt / M; B.vy -= uy * A.Mt / M; B.vz -= uz * A.Mt / M; A.vx += ux * B.Mt / M; A.vy += uy * B.Mt / M; A.vz += uz * B.Mt / M;
    if (this.merged) { const q = 0.04; for (const k of ["x", "y", "z", "vx", "vy", "vz"]) { const c = (A[k] * A.Mt + B[k] * B.Mt) / M; A[k] += (c - A[k]) * q; B[k] += (c - B[k]) * q; } }   // the two cores sink together
    A.x += A.vx * h; A.y += A.vy * h; A.z += A.vz * h; B.x += B.vx * h; B.y += B.vy * h; B.z += B.vz * h; this.t += h;
    // ---- keep track of passes and of merging ----
    const d = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z), [d1, d2] = this._d;
    if (d2 > d1 && d1 < d && d1 < 0.5 * this.apo) { this.passes++; if (this.tPeri == null) this.tPeri = this.t; this.apo = d1; }         // d1 was a closest approach
    if (d2 < d1 && d1 > d) { this.apo = d1; if (d1 < 7 && !this.merged) { this.merged = true; this.tMerge = this.t - this.t0; } }          // d1 was a furthest point: if it is tiny, they have merged
    if (d > this.apo) this.apo = d; if (d < this.minSep) this.minSep = d; this._d = [d, d1];
  }
  speed() { return Math.hypot(this.B.vx - this.A.vx, this.B.vy - this.A.vy, this.B.vz - this.A.vz); }
  sep() { return Math.hypot(this.B.x - this.A.x, this.B.y - this.A.y, this.B.z - this.A.z); }
  // share of disc stars (of one galaxy, or both) now further from their own galaxy's centre than f × the original edge of its disc
  tails(which, f = 1.5) {
    const { A, B, p, n } = this; let c = 0, tot = 0;
    for (let i = 0; i < n; i++) { if (this.type[i] === 1 || (which != null && this.gal[i] !== which)) continue; tot++; const o = 3 * i, g = this.gal[i] ? B : A; if (Math.hypot(p[o] - g.x, p[o + 1] - g.y, p[o + 2] - g.z) > f * 4.5 * g.Rd) c++; }
    return 100 * c / (tot || 1);
  }
  /* Starbursts: count the gas clouds in each 1.2 kpc box of space. A cloud whose surroundings have become much more crowded than
     they were at the start is being squeezed, and squeezed gas collapses into new stars. */
  squeeze() {
    const { p, n, type } = this, H = this.hash || (this.hash = new Uint16Array(65536)); H.fill(0); const key = new Int32Array(n);
    for (let i = 0; i < n; i++) { if (type[i] !== 2) continue; const o = 3 * i, k = ((Math.floor(p[o] / 1.2) * 92837111) ^ (Math.floor(p[o + 1] / 1.2) * 689287499) ^ (Math.floor(p[o + 2] / 1.2) * 283923481)) & 65535; key[i] = k; H[k]++; }
    const first = !this.c0; if (first) this.c0 = new Uint16Array(n); let hot = 0, gas = 0;
    for (let i = 0; i < n; i++) { if (type[i] !== 2) continue; gas++; const c = H[key[i]]; if (first) this.c0[i] = c; const on = c > 3.5 * this.c0[i] + 12 ? 1 : 0; this.burst[i] += (on - this.burst[i]) * 0.4; if (this.burst[i] > 0.5) hot++; }
    return this.hot = 100 * hot / (gas || 1);
  }
}
// A run without drawing, for the batch experiments: 1500 stars, played until `myr` after the start (or until `stop` says so)
function trial(o, rnd, myr, stop) { const e = new Encounter(Object.assign({ ratio: 1, rp: 15, vf: 1, tiltA: 0, tiltB: 0, halo: 12, n: 1500 }, o), rnd); const steps = (myr - e.t0) / DT; for (let k = 0; k < steps; k++) { e.step(); if (stop && stop(e)) break; } return e; }
// time in Myr after first closest approach at which to measure the damage
const afterPass = (o, rnd, wait, which) => { const e = trial(o, rnd, 4000, e => { if (e.tPeri != null && e.t - e.tPeri >= wait) return true; }); return e.tPeri == null ? null : e.tails(which, 1.2); };

// ---------------- The page ----------------
const P = { ratio: 1, rp: 14, vf: 1, tiltA: 15, tiltB: 40, halo: 12, n: 120000, custom: null };
let sim, rate = 120, colourMode = 0, cam = { yaw: 1.57, pitch: 0.5, zoom: 1, dist: 300, cen: [0, 0, 0] }, acc = 0, log = { sep: [], tail: [], hot: [] }, seed = 1;
function restart() { sim = new Encounter(Object.assign({}, P), K.rng(seed = (seed * 7 + 13) % 99991)); log = { sep: [], tail: [], hot: [] }; acc = 0; if (typeof upload === "function") upload(); sim.squeeze(); }
const PRESETS = {
  antennae: { ratio: 1, rp: 14, vf: 1, tiltA: 15, tiltB: 40, halo: 12, yaw: 1.57, pitch: 0.5 },
  whirlpool: { ratio: 0.3, rp: 20, vf: 1.05, tiltA: 0, tiltB: 60, halo: 12, yaw: 1.57, pitch: 0.25 },
  cartwheel: { ratio: 0.5, rp: 1.5, vf: 1.25, tiltA: 90, tiltB: 90, halo: 12, yaw: 0, pitch: 1.35 },
  cannibal: { ratio: 0.1, rp: 12, vf: 0.72, tiltA: 0, tiltB: 30, halo: 12, yaw: 1.57, pitch: 0.7 },
  andromeda: { ratio: 1.3, rp: 20, vf: 1, tiltA: 60, tiltB: 77, halo: 22, custom: { r: 785, vr: -110 / KMS, vt: 17 / KMS }, yaw: 1.57, pitch: 0.8 },
};

const ui = K.app({
  title: "Galaxy Collisions", subject: "Astrophysics",
  blurb: "Tides, tails, rings and mergers with hundreds of thousands of stars",
  reset: () => { set(PRESETS.antennae); },
  missions: [
    { title: "Tails from tides", q: "Two spiral galaxies fall together and swing past each other. Watch what happens to the discs just after the closest approach. Where do the long tails come from, and which stars end up in them?", hint: "Each galaxy pulls harder on the near side of the other's disc than on the far side: a tide. Stars on the near side are dragged into a bridge towards the passing galaxy; stars on the far side are left behind and swing out into a long tail. The tails are made of the outer disc stars, which are the most loosely held. Real examples: the Antennae and the Mice.", setup() { set(PRESETS.antennae); } },
    { title: "Spin matters", q: "This is the same fly-past twice over. First the main disc spins the same way as the visitor's orbit. Watch the tails, then set 'Spin of main galaxy' to 180° (spinning against the orbit) and watch again. Why such a difference?", hint: "When the disc spins the same way as the visitor passes, the stars on the near side keep pace with the visitor for a long time, so its pull has time to build up: a resonance, like pushing a swing in time with its motion. Spinning the other way, each star rushes past the visitor and feels only a brief tug, so the disc is hardly disturbed.", setup() { set({ ratio: 1, rp: 18, vf: 1.3, tiltA: 0, tiltB: 180, halo: 12, yaw: 1.57, pitch: 0.2 }); } },
    { title: "A ring galaxy", q: "A smaller galaxy drops straight through the middle of a disc, like a stone into a pond. What shape does the disc take afterwards, and why does the ring move outwards?", hint: "As the intruder passes through, its extra gravity pulls every star in the disc inwards for a moment. When it has gone, the stars rebound outwards and then fall back, each at the pace of its own orbit. Their crowding together forms a ring that travels outwards like a ripple. The Cartwheel galaxy is a real one; its ring is lit by newborn stars.", setup() { set(PRESETS.cartwheel); } },
    { title: "The Whirlpool", q: "A small companion sweeps round the edge of a big disc. What happens to the big galaxy's shape? Look for a bridge of stars.", hint: "The companion's tide stretches the disc into two grand spiral arms: one reaches out to the companion as a bridge, the other swings out on the far side. Many of the most beautiful two-armed spirals, such as the Whirlpool (M51), have a companion like this.", setup() { set(PRESETS.whirlpool); } },
    { title: "Why do galaxies merge?", q: "Run this collision with dark matter halos: count the passes before the two cores merge. Then set the dark matter slider to zero and run it again. What happens now?", hint: "With halos, each galaxy ploughs through the other's dark matter, which drags on it (dynamical friction). The orbit loses energy every pass, so they fall back sooner each time and merge. Without dark matter there is almost nothing to push against: the galaxies swing past each other and fly apart. The fact that we see so many merged galaxies is one line of evidence for dark matter.", setup() { set(PRESETS.antennae); } },
    { title: "Galactic cannibalism", q: "A dwarf galaxy (orange) orbits a big one (blue). Follow the orange stars. What becomes of the dwarf?", hint: "Tides strip the dwarf's stars away a little on every orbit and spread them along its path as long streams that wrap round the big galaxy. Eventually the dwarf is gone and its stars are part of the big galaxy's halo. The Milky Way is doing this now to the Sagittarius dwarf, and streams of stars from earlier victims cross our sky.", setup() { set(Object.assign({ colour: 1 }, PRESETS.cannibal)); } },
    { title: "Our own future", q: "The Milky Way (blue) and the Andromeda galaxy (orange) are 2.5 million light years apart and closing at 110 km/s. Run the clock forward. When do they first meet? What is left at the end?", hint: "In this model they first pass in about 4 billion years, swing out, fall back and merge within a couple of billion years more, into one large, rounded, featureless galaxy sometimes nicknamed 'Milkomeda'. How direct the first pass is depends on Andromeda's sideways speed, which is still poorly measured. The Sun will most likely still be orbiting inside the merged galaxy, further out than now.", setup() { set(Object.assign({ colour: 1 }, PRESETS.andromeda)); } },
    { title: "Do the stars crash?", q: "Colour by galaxy and watch two discs pass right through each other. With hundreds of billions of stars in each, how many stars would you expect to collide?", hint: "Almost none. Stars are tiny compared with the gaps between them: if the Sun were a grain of sand, the next star would be about 30 km away. A star crossing a whole galaxy has roughly a 1 in 100 billion chance of hitting another, so among 10¹¹ stars you expect about one collision. The stars pass like two swarms of bees; it is gravity, not impact, that reshapes the galaxies. Gas clouds are different: they are huge, so they do collide.", setup() { set({ ratio: 1, rp: 3, vf: 1, tiltA: 30, tiltB: 120, halo: 12, yaw: 1.57, pitch: 0.6, colour: 1 }); } },
    { title: "Starbursts", q: "Pink knots mark gas clouds being squeezed, which makes them collapse into new stars. Watch the right-hand graph. When does star formation peak during the collision?", hint: "Star formation jumps at each close pass and again at the final merger, when gas is driven into the centre. Colliding galaxies can form stars a hundred times faster than the Milky Way does now: 'starburst' galaxies. After the merger the gas is used up or blown out, and the result is a 'red and dead' elliptical galaxy.", setup() { set({ ratio: 1, rp: 8, vf: 1, tiltA: 20, tiltB: 60, halo: 12, yaw: 1.57, pitch: 0.5 }); } }
  ],
  batch: [
    { title: "Spin and tails", question: "How does the direction of a disc's spin change how badly a passing galaxy damages it?", how: "Each run: an equal-mass galaxy passes 16 kpc from a disc of 1500 test stars. The result is the share of the disc's stars now further out than 1.2 times the disc's original edge, 500 million years after the pass.", xLabel: "tilt of the disc's spin to the orbit (degrees)", yLabel: "stars thrown out (%)", xs: [0, 20, 40, 60, 90, 120, 150, 180], reps: 4, yMin: 0, run: (x, r) => afterPass({ tiltA: x, rp: 16, vf: 1.1 }, r, 500, 0), note: "The 1500 stars start at random places in the disc, so the count of stars in the tails differs a little each run. 0° is spinning with the orbit, 180° against it." },
    { title: "How close is too close?", question: "How does the damage depend on the distance of closest approach?", how: "Each run: an equal-mass galaxy passes a disc that spins with the orbit. Measured 500 million years after the pass.", xLabel: "closest approach (kpc)", yLabel: "stars thrown out (%)", xs: [6, 10, 15, 20, 25, 30, 40, 50, 60], reps: 4, yMin: 0, run: (x, r) => afterPass({ rp: x, vf: 1.2 }, r, 500, 0), note: "Tidal forces fall off roughly as the cube of the distance, so the damage drops away quickly once the pass is wider than a few disc radii (the disc's edge is at 13.5 kpc)." },
    { title: "Mass of the visitor", question: "How does the damage depend on the mass of the passing galaxy?", how: "Each run: a visitor of the chosen mass passes 18 kpc from a Milky-Way-sized disc that spins with the orbit. Measured 500 million years after the pass.", xLabel: "visitor's mass ÷ main galaxy's mass", yLabel: "stars thrown out (%)", xs: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2], reps: 4, yMin: 0, run: (x, r) => afterPass({ ratio: x, rp: 18, vf: 1.2 }, r, 500, 0) },
    { title: "Speed of the encounter", question: "Does a faster fly-past do more damage, or less?", how: "Each run: an equal-mass galaxy passes 15 kpc from the disc at the chosen multiple of the escape speed. Measured 500 million years after the pass.", xLabel: "speed at closest approach ÷ escape speed", yLabel: "stars thrown out (%)", xs: [1, 1.25, 1.5, 2, 2.5, 3, 4], reps: 4, yMin: 0, run: (x, r) => afterPass({ rp: 15, vf: x }, r, 500, 0), note: "A fast visitor is gone before the stars have time to respond, so its pull adds up to little. This is why galaxies in rich clusters, which pass each other at over 1000 km/s, rarely merge." },
    { title: "Dark matter and merging", question: "How does the time taken to merge depend on how much dark matter the galaxies have?", how: "Each run: two equal galaxies fall together (closest approach 14 kpc). The result is the time from the start until their cores merge. Runs that have not merged after 8 billion years give no point.", xLabel: "dark matter ÷ visible matter", yLabel: "time to merge (billion years)", xs: [0, 1, 2, 4, 6, 8, 10, 12, 15, 20], reps: 2, yMin: 0, run(x, r) { const e = trial({ halo: x, rp: 14, n: 20 }, r, 8000, e => e.merged); return e.merged ? e.tMerge / 1000 : null; }, note: "The orbits of the two galaxies are not random, so repeat runs agree. With little dark matter there is little friction, and the pair take many billions of years to merge or never do." },
    { title: "Glancing blow or direct hit?", question: "Do galaxies merge sooner after a close pass or a wide one?", how: "Each run: two equal galaxies with halos fall together with the chosen closest approach. The result is the time from the start until their cores merge. Runs that have not merged after 8 billion years give no point.", xLabel: "closest approach on the first pass (kpc)", yLabel: "time to merge (billion years)", xs: [2, 5, 10, 15, 20, 30, 40, 50], reps: 2, yMin: 0, run(x, r) { const e = trial({ rp: x, n: 20 }, r, 8000, e => e.merged); return e.merged ? e.tMerge / 1000 : null; }, note: "A close first pass takes the galaxies through the densest part of each other's halo, where friction is strongest, so they lose more energy and fall back sooner. The orbits are not random, so repeat runs agree." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>A "restricted" model in the style of Toomre &amp; Toomre (1972), in three dimensions.</p>
<ul><li><b>Each galaxy</b> is a fixed-shape lump of mass: visible matter (a "Plummer sphere", core radius 2.5 kpc for a Milky Way of 6 × 10¹⁰ solar masses) plus an optional dark matter halo (a "Hernquist sphere", scale 30 kpc) that is 12 times heavier by default.</li>
<li><b>The two galaxies</b> move under each other's gravity. When their halos overlap, <b>dynamical friction</b> (Chandrasekhar's formula) slows them, which is what lets them merge.</li>
<li><b>Stars</b> (20 000 to 300 000) are massless tracers. 85% start on circular orbits in a thin disc, 15% in a round central bulge. Each feels both galaxies' gravity. Positions are advanced in steps of 2 million years.</li>
<li><b>Gas and starbursts:</b> a quarter of the disc particles stand for gas clouds. A cloud whose neighbourhood has become over twice as crowded as at the start is marked pink as a site of new star formation.</li>
<li><b>Closest approach and speed</b> describe the orbit the two galaxies would follow without friction. A speed of 1 means they have just fallen together from far away.</li></ul>
<h3>Simplifications</h3>
<ul><li>The stars do not pull on each other or on the galaxies, and the galaxies keep their shape and mass however battered they look. So the model shows where tails and rings come from, but a merged remnant is two overlapping lumps, not a properly settled elliptical galaxy.</li>
<li>The strength of the friction is a single number tuned to give sensible merger times. Real halos are stripped and stirred as they merge.</li>
<li>There is no gas pressure, no shock waves, no real star formation and no supernovae: "starburst" marks crowding only.</li>
<li>Discs start perfectly smooth, with no spiral arms or bar of their own. Any arms you see were made by the encounter.</li>
<li>The Milky Way and Andromeda run uses today's measured distance (785 kpc) and closing speed (110 km/s) with a small sideways speed (17 km/s), and heavier halos. The real sideways speed and halo masses are uncertain, so the date of the collision is too.</li>
<li>Batch runs use 1500 stars.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its spec notes, exam practice and worksheets, is still here: <a href="original/galaxy-collisions.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Famous collisions");
let r1 = K.row(g); for (const [k, name] of [["antennae", "Antennae"], ["whirlpool", "Whirlpool"], ["cartwheel", "Cartwheel"]]) K.btn(r1, name, () => set(PRESETS[k]));
r1 = K.row(g); K.btn(r1, "Cannibal", () => set(Object.assign({ colour: 1 }, PRESETS.cannibal))); K.btn(r1, "Milky Way + Andromeda", () => set(Object.assign({ colour: 1 }, PRESETS.andromeda)));
g = ui.group("Set up your own");
const chg = k => v => { P[k] = v; P.custom = null; restart(); };
ctl.ratio = K.slider(g, { label: "Visitor's mass ÷ main galaxy's", min: 0.05, max: 2, step: 0.05, value: P.ratio, on: chg("ratio") });
ctl.rp = K.slider(g, { label: "Closest approach", min: 1, max: 60, step: 0.5, value: P.rp, unit: "kpc", on: chg("rp"), tip: "The main disc's edge is at 13.5 kpc" });
ctl.vf = K.slider(g, { label: "Speed at closest approach", min: 0.6, max: 3, step: 0.05, value: P.vf, fmt: v => v.toFixed(2) + " × escape speed", on: chg("vf") });
ctl.tiltA = K.slider(g, { label: "Spin of main galaxy", min: 0, max: 180, step: 5, value: P.tiltA, fmt: v => v + "°" + (v === 0 ? " (with the orbit)" : v === 180 ? " (against)" : v === 90 ? " (edge-on to it)" : ""), on: chg("tiltA") });
ctl.tiltB = K.slider(g, { label: "Spin of visitor", min: 0, max: 180, step: 5, value: P.tiltB, fmt: v => v + "°", on: chg("tiltB") });
ctl.halo = K.slider(g, { label: "Dark matter halos", min: 0, max: 25, step: 1, value: P.halo, fmt: v => v ? v + " × the visible mass" : "none", on: chg("halo") });
r1 = K.row(g); K.btn(r1, "↺ Run it again", () => restart(), "primary");
g = ui.group("View");
ctl.n = K.slider(g, { label: "Stars", min: 20000, max: 300000, step: 10000, value: P.n, fmt: v => (v / 1000) + " thousand", on: v => { P.n = v; restart(); }, tip: "Fewer if the picture is jerky" });
ctl.colour = K.seg(g, { label: "Colour", value: 0, options: [[0, "natural"], [1, "by galaxy"]], on: v => colourMode = v });
ctl.rate = K.slider(g, { label: "Speed", min: 30, max: 360, step: 30, value: rate, fmt: v => v + " million years a second", on: v => rate = v });
ctl.zoom = K.slider(g, { label: "Zoom", min: 0.3, max: 3, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => cam.zoom = v });
K.note(g, "Drag to turn the view. Scroll to zoom.");
const read = K.readout(g, [["t", "time since start"], ["sep", "distance apart"], ["v", "closing speed"], ["min", "closest so far"], ["pass", "close passes"], ["state", "state"], ["tail", "stars in tails"], ["hot", "gas forming stars"]]);
function set(o) {
  for (const k of ["ratio", "rp", "vf", "tiltA", "tiltB", "halo"]) if (o[k] != null) { P[k] = o[k]; ctl[k].set(o[k]); }
  P.custom = o.custom || null; if (o.yaw != null) { cam.yaw = o.yaw; cam.pitch = o.pitch; } cam.zoom = 1; cam.cen = [0, 0, 0]; ctl.zoom.set(1); colourMode = o.colour || 0; ctl.colour.set(colourMode); restart();
}

// ---------------- Drawing: the stars are drawn by the graphics card (WebGL), labels on a canvas laid over the top ----------------
const glc = document.createElement("canvas"); ui.stage.append(glc);
const gl = glc.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
const NBG = 2500; let prog, bufP, bufC, bufB, cols, U = {}, upload;
if (gl) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `
    attribute vec3 aPos; attribute vec4 aCol; attribute float aBurst;
    uniform mat3 uRot; uniform vec3 uCen; uniform float uDist, uF, uAspect, uPix, uBright, uMode; varying vec3 vCol;
    void main() {
      float code = floor(aCol.a * 16.0 + 0.5), gal = floor(code / 4.0), type = code - 4.0 * gal;
      vec3 p = uRot * (type > 2.5 ? aPos : aPos - uCen); float d = type > 2.5 ? -p.z : uDist - p.z;             // background stars are infinitely far away
      gl_Position = d > 1.0 ? vec4(p.x * uF / uAspect, p.y * uF, 0.0, d) : vec4(2.0, 2.0, 2.0, 1.0);
      float size = type > 2.5 ? 1.6 + aBurst * 1.6 : (0.34 + 0.9 * aBurst + (type == 2.0 ? 0.12 : 0.0)) * uPix / d;   // apparent size in pixels
      float px = clamp(size, 1.6, 22.0), flux = min(1.0, size * size / 2.56);
      vec3 c = mix(aCol.rgb, gal < 0.5 ? vec3(0.35, 0.62, 1.0) : vec3(1.0, 0.55, 0.22), type > 2.5 ? 0.0 : uMode);
      c = mix(c, vec3(1.0, 0.45, 0.72), type > 2.5 ? 0.0 : aBurst * 0.85);            // squeezed gas glows pink, like real star-forming regions
      vCol = c * (type > 2.5 ? 0.2 + aBurst : uBright * flux * (1.0 + 5.0 * aBurst));
      gl_PointSize = px;
    }`));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec3 vCol;
    void main() { vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0; gl_FragColor = vec4(vCol * exp(-r2 * 3.2) * step(r2, 1.0), 1.0); }`));
  gl.linkProgram(prog); gl.useProgram(prog);
  for (const k of ["uRot", "uCen", "uDist", "uF", "uAspect", "uPix", "uBright", "uMode"]) U[k] = gl.getUniformLocation(prog, k);
  bufP = gl.createBuffer(); bufC = gl.createBuffer(); bufB = gl.createBuffer();
  // (re)build the colour of every star, plus a fixed background of far-off stars
  upload = () => {
    const n = sim.n, N = n + NBG, r = K.rng(77); cols = new Uint8Array(4 * N); sim.gp = new Float32Array(3 * N); sim.gb = new Float32Array(N);
    for (let i = 0; i < n; i++) {
      const g = sim.gal[i] ? sim.B : sim.A, f = Math.min(1, sim.R0[i] / (4.5 * g.Rd)), t = sim.type[i], o = 4 * i, j = r() * 30 - 15;
      if (t === 1) { cols[o] = 255; cols[o + 1] = 205 + j; cols[o + 2] = 150 + j; } else if (t === 2) { cols[o] = 150 + j; cols[o + 1] = 190 + j; cols[o + 2] = 255; } else { cols[o] = 255 - 70 * f; cols[o + 1] = 225 - 20 * f + j * .5; cols[o + 2] = 175 + 80 * f; }   // warm old stars in the middle, blue young stars further out
      const dim = t === 1 ? 0.3 : 0.3 + 0.7 * f; cols[o] *= dim; cols[o + 1] *= dim; cols[o + 2] *= dim;   // the crowded middle would glare, so stars there are drawn fainter
      cols[o + 3] = Math.round((sim.gal[i] * 4 + t) / 16 * 255);
    }
    for (let i = n; i < N; i++) { const ct = 2 * r() - 1, st = Math.sqrt(1 - ct * ct), ph = r() * 6.2832, o = 4 * i, w = r(); sim.gp[3 * i] = st * Math.cos(ph) * 1000; sim.gp[3 * i + 1] = st * Math.sin(ph) * 1000; sim.gp[3 * i + 2] = ct * 1000; cols[o] = 200 + 55 * r(); cols[o + 1] = 205 + 40 * r(); cols[o + 2] = 215 + 40 * r(); cols[o + 3] = Math.round(3 / 16 * 255); sim.gb[i] = w * w * w; }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufC); gl.bufferData(gl.ARRAY_BUFFER, cols, gl.STATIC_DRAW);
  };
}
const cv = ui.canvas(c => { const d = Math.min(window.devicePixelRatio || 1, 1.5); glc.width = Math.round(c.w * d); glc.height = Math.round(c.h * d); });
const F = 1.7;
function camera() {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  // turn about the vertical (z) axis, then tip the view. Rows of the matrix: screen-right, screen-up, towards the camera.
  return [cy, -sy, 0, sy * cp, cy * cp, sp, -sy * sp, -cy * sp, cp];
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, m = camera(), A = sim.A, B = sim.B;
  // the view follows both galaxies while they are close; once a visitor has flown off, it stays with the main galaxy
  const far = !P.custom && sim.passes > 0 && sim.sep() > 130 && !sim.merged, cen = cam.cen, tg = far ? [A.x, A.y, A.z] : [0, 0, 0]; for (let k = 0; k < 3; k++) cen[k] += (tg[k] - cen[k]) * 0.04;
  const want = (far ? 78 : K.clamp(1.0 * Math.max(Math.hypot(A.x, A.y, A.z), Math.hypot(B.x, B.y, B.z)) + 42, 62, P.custom ? 1500 : 230)) / cam.zoom; cam.dist += (want - cam.dist) * 0.06;
  if (gl) {
    gl.viewport(0, 0, glc.width, glc.height); gl.clearColor(0.008, 0.01, 0.022, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    sim.gp.set(sim.p); sim.gb.set(sim.burst);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufP); gl.bufferData(gl.ARRAY_BUFFER, sim.gp, gl.DYNAMIC_DRAW); let loc = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufC); loc = gl.getAttribLocation(prog, "aCol"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufB); gl.bufferData(gl.ARRAY_BUFFER, sim.gb, gl.DYNAMIC_DRAW); loc = gl.getAttribLocation(prog, "aBurst"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix3fv(U.uRot, false, new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]])); gl.uniform3f(U.uCen, cen[0], cen[1], cen[2]); gl.uniform1f(U.uDist, cam.dist); gl.uniform1f(U.uF, F); gl.uniform1f(U.uAspect, w / h); gl.uniform1f(U.uPix, F * glc.height / 2);
    gl.uniform1f(U.uBright, 0.16 * Math.sqrt(120000 / sim.n) * K.clamp(cam.dist / 160, 0.6, 2.2)); gl.uniform1f(U.uMode, colourMode);
    gl.drawArrays(gl.POINTS, 0, sim.n + NBG);
  }
  c.clearRect(0, 0, w, h);
  const proj = (x, y, z) => { x -= cen[0]; y -= cen[1]; z -= cen[2]; const px = m[0] * x + m[1] * y + m[2] * z, py = m[3] * x + m[4] * y + m[5] * z, pz = m[6] * x + m[7] * y + m[8] * z, d = cam.dist - pz; return d < 1 ? null : [w / 2 + px * F * (h / 2) / d, h / 2 - py * F * (h / 2) / d, d]; };
  if (!gl) {   // no graphics card support: plot a sample of the stars as dots
    c.fillStyle = "#04060c"; c.fillRect(0, 0, w, h); const stepN = Math.max(1, Math.round(sim.n / 30000));
    for (let i = 0; i < sim.n; i += stepN) { const q = proj(sim.p[3 * i], sim.p[3 * i + 1], sim.p[3 * i + 2]); if (!q) continue; c.fillStyle = colourMode ? (sim.gal[i] ? "rgba(255,150,70,.7)" : "rgba(110,170,255,.7)") : sim.burst[i] > .5 ? "#ff8ac0" : "rgba(235,235,255,.65)"; c.fillRect(q[0], q[1], 1.5, 1.5); }
  }
  // the paths of the two cores, and their labels
  for (const [tr, col, G0, name] of [[sim.trA, "rgba(120,180,255,.55)", A, P.custom ? "Milky Way" : "main galaxy"], [sim.trB, "rgba(255,170,90,.55)", B, P.custom ? "Andromeda" : "visitor"]]) {
    c.strokeStyle = col; c.lineWidth = 1.2; c.setLineDash([2, 5]); c.beginPath(); let pen = false; for (const q of tr) { const s = proj(q[0], q[1], q[2]); if (!s) { pen = false; continue; } pen ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); pen = true; } c.stroke(); c.setLineDash([]);
    const s = proj(G0.x, G0.y, G0.z); if (s && !sim.merged) { c.fillStyle = col.replace(".55", ".95"); c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(name, s[0] + 14, s[1] - 14); c.strokeStyle = col; c.beginPath(); c.moveTo(s[0] + 5, s[1] - 5); c.lineTo(s[0] + 12, s[1] - 12); c.stroke(); }
  }
  // scale bar
  const kpc = [10, 20, 50, 100, 200, 500].find(k => k * F * (h / 2) / cam.dist > 70) || 500, len = kpc * F * (h / 2) / cam.dist; c.strokeStyle = c.fillStyle = "rgba(220,228,245,.75)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(18, h - 22); c.lineTo(18 + len, h - 22); c.moveTo(18, h - 27); c.lineTo(18, h - 17); c.moveTo(18 + len, h - 27); c.lineTo(18 + len, h - 17); c.stroke();
  c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(kpc + " kpc = " + (kpc * 3260).toLocaleString() + " light years", 18, h - 33);
}
let grab = null;
K.pointer(cv.el, { down(p) { grab = { x: p.x, y: p.y, yaw: cam.yaw, pitch: cam.pitch }; }, drag(p) { if (grab) { cam.yaw = grab.yaw + (p.x - grab.x) * 0.007; cam.pitch = K.clamp(grab.pitch + (p.y - grab.y) * 0.007, 0, 1.57); } }, up() { grab = null; } });
cv.el.addEventListener("wheel", e => { e.preventDefault(); cam.zoom = K.clamp(cam.zoom * Math.exp(-e.deltaY * 0.0012), 0.3, 3); ctl.zoom.set(cam.zoom); }, { passive: false });

const chS = K.chart(ui.dock, { title: "Distance between the two galaxies", xLabel: "time (million years)", yLabel: "kpc", yMin: 0 });
const chT = K.chart(ui.dock, { title: "Damage and starbursts", xLabel: "time (million years)", yLabel: "%", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0, slow = 0;
ui.run(dt => {
  acc += rate * Math.max(dt, 1 / 120) / DT; let k = 0; const t0 = performance.now();
  while (acc >= 1 && k < 4) { sim.step(); acc--; k++; if (performance.now() - t0 > 26) break; }
  if (acc > 3) { acc = 0; slow++; } else if (k) slow = Math.max(0, slow - 0.2);
  if (k) { const T = sim.t - sim.t0; if (frame % 3 === 0) { sim.trA.push([sim.A.x, sim.A.y, sim.A.z]); sim.trB.push([sim.B.x, sim.B.y, sim.B.z]); if (sim.trA.length > 900) { sim.trA.shift(); sim.trB.shift(); } }
    if (frame % 5 === 0) { const hot = sim.squeeze(); log.sep.push([T, sim.sep()]); log.hot.push([T, hot]); if (frame % 15 === 0) log.tail.push([T, sim.tails()]); for (const q in log) if (log[q].length > 900) log[q] = log[q].filter((v, i) => i % 2 === 0); } }
}, () => {
  draw(); if (frame++ % 6) return;
  const T = sim.t - sim.t0, x1 = Math.max(600, T);
  chS.draw([{ pts: log.sep, color: K.cssVar("--s0") }], { xMin: 0, xMax: x1 });
  chT.draw([{ pts: log.tail, color: K.cssVar("--s1"), label: "stars thrown into tails" }, { pts: log.hot, color: "#ff8ac0", label: "gas clouds forming stars" }], { xMin: 0, xMax: x1 });
  const d = sim.sep(), tl = log.tail.length ? log.tail[log.tail.length - 1][1] : 0;
  read.set("t", T < 1000 ? T.toFixed(0) + " million yr" : (T / 1000).toFixed(2) + " billion yr"); read.set("sep", d.toFixed(0) + " kpc"); read.set("v", (sim.speed() * KMS).toFixed(0) + " km/s"); read.set("min", sim.minSep.toFixed(1) + " kpc"); read.set("pass", sim.passes);
  read.set("state", sim.merged ? "merged" : sim.passes ? (sim.speed() > 0 && d > sim._d[1] ? "moving apart" : "falling back") : "approaching"); read.set("tail", tl.toFixed(1) + "%"); read.set("hot", (sim.hot || 0).toFixed(1) + "%");
  ui.hud(`<b style="font-size:15px">${T < 1000 ? T.toFixed(0) + " million years" : (T / 1000).toFixed(2) + " billion years"}</b><br>${d.toFixed(0)} kpc apart · ${(sim.speed() * KMS).toFixed(0)} km/s<br>${sim.merged ? "the cores have merged" : sim.passes + " close pass" + (sim.passes === 1 ? "" : "es")}` + (slow > 6 ? `<br><span style="color:#ffb060">running slowly: try fewer stars</span>` : "") + (gl ? "" : `<br><span style="color:#ffb060">no WebGL: showing a sample of stars</span>`));
});
restart();
ui.tip("Each dot is a star feeling the gravity of both galaxies · drag to turn · scroll to zoom", 8000);
