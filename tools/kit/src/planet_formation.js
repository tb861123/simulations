/* =====================================================================
   PLANET FORMATION
   A young star is surrounded by a flat disc of gas and dust. Dust sticks
   into rocks, and rocks into PLANETESIMALS and moon-sized EMBRYOS: this
   model starts there. Gravity then does the rest:
     • embryos whose orbits overlap meet and stick (ACCRETION); gravity
       bends their paths towards each other (GRAVITATIONAL FOCUSING), so
       big, slow-moving bodies grow fastest;
     • beyond the FROST LINE (2.7 × √L AU) water freezes into ice, so there
       is about 4 times more solid material: bigger cores grow there;
     • a core that reaches about 10 Earth masses while gas is still in the
       disc pulls the gas in faster and faster: a GAS GIANT (runaway);
     • the gas disc fades in a few million years. Gas had kept orbits
       circular; without it, embryos stir each other onto crossing orbits
       and crash together in GIANT IMPACTS (like the one that made our Moon)
       until a few planets on well-spaced orbits are left;
     • giant planets fling small bodies out of the system.
   Units: astronomical units (AU), Earth masses (M⊕) and years.
   G × (1 solar mass) = 4π² AU³/yr², so an orbit at 1 AU takes 1 year.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const MSUN = 332946;                                                             // the Sun's mass in Earth masses
const G = 4 * Math.PI * Math.PI / MSUN;                                          // G in AU³ per (M⊕ yr²)
const R_EARTH = 4.26e-5;                                                         // Earth's radius in AU
const SOLAR = [["Mercury", 0.39, 0.055], ["Venus", 0.72, 0.815], ["Earth", 1, 1], ["Mars", 1.52, 0.107], ["Jupiter", 5.2, 317.8], ["Saturn", 9.58, 95.2], ["Uranus", 19.2, 14.5], ["Neptune", 30.1, 17.1]];
const T_END = 1e8;                                                               // each run lasts 100 million years
const GAS_OUT = 40;                                                              // the gas disc reaches 40 AU

// o = { star (M☉), disc (solid mass, M⊕), n (embryos), rIn, rOut, gasJ (gas, Jupiter masses), gasMyr (gas lifetime), mCrit (critical core mass), e0, frostX (ice boost) }
function makeSystem(o, r) {
  const L = o.star ** 4, frost = 2.7 * Math.sqrt(L), B = [];
  // solid surface density Σ ∝ r^-1.5, × frostX beyond the frost line: embryos placed with dN/da ∝ a^-0.5, then given masses
  const s0 = Math.sqrt(o.rIn), s1 = Math.sqrt(o.rOut);
  for (let i = 0; i < o.n; i++) {
    const a = (s0 + (s1 - s0) * (i + 0.15 + 0.7 * r()) / o.n) ** 2, ice = a > frost;
    B.push({ a, e: o.e0 * (0.5 + r()), w: ice ? o.frostX : 1, iceF: ice ? 0.5 : 0, gas: 0, hits: 0, id: i, a0: a, ph: r() * 6.283, pe: r() * 6.283 });
  }
  const W = B.reduce((s, b) => s + b.w, 0); for (const b of B) { b.m = o.disc * b.w / W; b.ice = b.m * b.iceF; }
  return { o, B, t: 0, M: o.star * MSUN, frost, L, gas0: o.gasJ * 317.8, events: [], collisions: 0, ejected: 0, giantT: null, gasMade: 0 };
}
const gasNow = s => s.o.gasJ > 0 ? Math.exp(-s.t / (s.o.gasMyr * 1e6)) : 0;     // fraction of the gas disc left
const vK = (a, s) => Math.sqrt(G * s.M / a);                                     // circular orbit speed (AU/yr)
// radius: rock (Earth's density) or ice-rich (a little bigger); a gas giant is about Jupiter's size (11 Earth radii)
const radius = b => b.gas > b.m - b.gas ? R_EARTH * 11 : R_EARTH * Math.cbrt(b.m) * (b.ice > 0.2 * b.m ? 1.2 : 1);
const vesc = b => Math.sqrt(2 * G * b.m / radius(b));                            // escape speed from the body's surface
const hillR = (m, a, s) => a * Math.cbrt(m / (3 * s.M));                        // Hill radius: where the body's gravity beats the star's pull
// gas a giant can reach: the gas disc (Σ ∝ 1/r, equal mass per AU) between 0.7a and 1.3a
const feed = (a, s) => s.gas0 * Math.max(0, Math.min(1.3 * a, GAS_OUT) - Math.max(0.7 * a, s.o.rIn)) / (GAS_OUT - s.o.rIn);
const B_ISO = 5;                                                                 // bodies more than ~5 mutual Hill radii apart (plus their eccentric swings) never meet

// one time step of length dt years
function step(s, dt, r) {
  const B = s.B, g = gasNow(s), M = s.M, n = B.length;
  for (const b of B) { b.R = radius(b); b.ve = Math.sqrt(2 * G * b.m / b.R); b.vk = vK(b.a, s); b.rh = hillR(b.m, b.a, s); }   // worked out once per step
  // 1. eccentricities: stirred by nearby bodies at least ⅓ as massive (towards ~⅓ of their escape speed), damped by the gas
  for (const b of B) {
    let es = 0.002; for (const q of B) { if (q === b || q.m < 0.3 * b.m) continue; const k = Math.exp(-Math.max(0, Math.abs(q.a - b.a) - 0.15 * b.a) / (2 * q.rh)); if (k > 0.02) es = Math.max(es, 0.35 * q.ve / q.vk * k);
      // packed orbits go unstable in the end: after about P × 10^(0.5Δ − 1) years, where Δ is the gap in mutual Hill radii (Chambers et al. 1996)
      if (g < 0.05) { const gap = Math.abs(q.a - b.a), D = gap / (((b.a + q.a) / 2) * Math.cbrt((b.m + q.m) / (3 * M))), P = 2 * Math.PI * Math.sqrt(b.a ** 3 / (G * M)); if (D < 25 && s.t > P * 10 ** (0.5 * D - 1)) es = Math.max(es, 0.7 * gap / b.a); } }
    es = Math.min(es, 0.4); const P = 2 * Math.PI * Math.sqrt(b.a ** 3 / (G * M));
    const tStir = 3e4 * P, tDamp = 2e3 * P / Math.max(1e-3, g) / Math.max(0.02, Math.min(1, b.m));    // gas damps big embryos fastest (tidal damping)
    b.e += Math.min(1, dt / tStir) * (es - b.e) - (g > 0.003 ? Math.min(1, dt / tDamp) * b.e : 0); b.e = Math.min(0.9, Math.max(0.001, b.e));
  }
  // 2. collisions: every pair whose orbits overlap has a chance to meet this step (particle-in-a-box rate)
  const hits = [];
  for (let i = 0; i < n; i++) { const p = B[i]; for (let j = i + 1; j < n; j++) {
    const q = B[j], am = (p.a + q.a) / 2, RH = am * Math.cbrt((p.m + q.m) / (3 * M)), reach = p.a * p.e + q.a * q.e + B_ISO * RH;
    if (Math.abs(p.a - q.a) > reach) continue;                                   // orbits never come close: no encounters
    const er = Math.sqrt(p.e * p.e + q.e * q.e), vv = (p.vk + q.vk) / 2, v = er * vv + RH * vv / am;  // relative speed (plus the Hill shear speed)
    const R = p.R + q.R, ve2 = 2 * G * (p.m + q.m) / R, sigma = Math.PI * R * R * (1 + ve2 / (v * v));   // gravitational focusing
    const vol = 2 * Math.PI * am * reach * 2 * (am * er / 2 + RH);               // volume of the ring both orbits share
    if (r() < 1 - Math.exp(-sigma * v / vol * dt)) hits.push([p, q]);
  } }
  for (const [p, q] of hits) encounter(s, p, q, r);
  s.B = s.B.filter(b => !b.dead);
  // 3. runaway gas accretion onto cores above the critical mass (faster as it grows), until it has taken the gas it can reach
  if (g > 0.003) for (const b of s.B) { const core = b.m - b.gas; if (core >= s.o.mCrit) {
    const tGrow = 1e8 * Math.max(b.m, 1) ** -3 + 2e4;                           // Kelvin–Helmholtz time: slow at first, then a runaway
    const dm = Math.max(0, Math.min(feed(b.a, s) * g - b.gas, b.m * dt / tGrow)); if (dm > 0) { b.m += dm; b.gas += dm; s.gasMade += dm; if (b.gas > core && s.giantT === null) s.giantT = s.t; }
  } }
  s.t += dt;
}
// two bodies meet: they merge, unless the bigger one is a giant that flings the smaller one away
function encounter(s, p, q, r) {
  if (p.dead || q.dead) return; const [big, small] = p.m >= q.m ? [p, q] : [q, p];
  const theta = (vesc(big) / vK(big.a, s)) ** 2 / 2;                             // Safronov number: > 1 means "better at throwing than catching"
  if (small.m < 0.1 * big.m && r() < theta * theta / (1 + theta * theta)) { small.dead = true; s.ejected++; s.events.push({ t: s.t, a: small.a, m: small.m, kind: "eject" }); return; }
  const Mt = big.m + small.m;
  big.a = (big.a * big.m + small.a * small.m) / Mt; big.e = Math.sqrt((big.m * big.e) ** 2 + (small.m * small.e) ** 2) / Mt;
  big.ice += small.ice; big.gas += small.gas; big.hits += 1 + small.hits; big.m = Mt; small.dead = true; s.collisions++;
  if (small.m > 0.1 * big.m && Mt > 0.3) s.events.push({ t: s.t, a: big.a, m: Mt, kind: small.m > 0.3 * big.m ? "giant" : "merge" });
}
// time step: short at first (fast early growth), longer later
const dtFor = s => Math.min(2e5, Math.max(2e3, s.t * 0.02));
function kindOf(b) { const core = b.m - b.gas; if (b.gas > core) return "gas giant"; if (b.m >= 5 && b.ice > 0.2 * core) return "ice giant"; if (b.ice > 0.2 * b.m) return "icy"; return "rocky"; }
// census: a "planet" has cleared its orbit (no heavier body within 10 mutual Hill radii); giants always count
function census(s) {
  const L = s.B.filter(b => b.m >= 0.05).map(b => ({ b, a: b.a, e: b.e, m: b.m, kind: kindOf(b) })).sort((p, q) => p.a - q.a);
  for (const p of L) p.planet = p.m >= 50 || !L.some(q => q !== p && q.m >= p.m && Math.abs(q.a - p.a) < 10 * hillR(p.m + q.m, (p.a + q.a) / 2, s));
  const pl = L.filter(p => p.planet);
  return { list: L, planets: pl.length, giants: pl.filter(p => p.kind === "gas giant").length, iceGiants: pl.filter(p => p.kind === "ice giant").length, rockyIn: pl.filter(p => p.a < s.frost && p.kind === "rocky").length, biggest: Math.max(0, ...L.map(p => p.m)), bodies: L.length };
}
function runSystem(o, r, tEnd = T_END) { const s = makeSystem(o, r); while (s.t < tEnd && s.B.length) step(s, dtFor(s), r); return census(s); }
const BASE = () => ({ star: 1, disc: 100, n: 120, rIn: 0.4, rOut: 15, gasJ: 10, gasMyr: 3, mCrit: 10, e0: 0.01, frostX: 4 });

// ---------------- The page ----------------
const P = Object.assign(BASE(), { view: "log", orbits: true });
let rnd = K.rng(Date.now() % 99991 + 7), sys = null, speed = 40, acc = 0, picked = null, flashes = [], hist = [], done = false, evSeen = 0;
const PRESETS = {
  solar: { label: "Solar-System-like" }, nogas: { label: "No gas", gasJ: 0 }, fast: { label: "Gas clears fast", gasMyr: 0.5 },
  red: { label: "Red dwarf (0.5 M☉)", star: 0.5, disc: 50, rOut: 8 }, massive: { label: "Massive disc", disc: 220 }, bright: { label: "Bright F star (1.4 M☉)", star: 1.4, disc: 140, rOut: 25 }
};
const ui = K.app({
  title: "Planet Formation", subject: "Astrophysics",
  blurb: "From a disc of rocky and icy embryos to planets: accretion, the frost line, runaway gas giants and giant impacts",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE physics and astronomy: the Solar System formed from a cloud of dust and gas pulled together by gravity; rocky inner planets and gas giants further out; orbits and gravity.", adv: "A level physics (WJEC Eduqas and others): gravitational fields and orbits, Kepler's third law T² = 4π²a³/GM, escape speed v = √(2GM/r), circular orbit speed v = √(GM/r); exoplanet systems." } },
  missions: [
    { title: "Build a solar system", q: "Run a Solar-System-like disc to 100 million years. How many planets are left? Which kinds, and where?", hint: "Usually 2–6 rocky planets inside the frost line, one or two gas giants just beyond it, and leftover icy bodies further out. The 120 embryos merged in thousands of collisions.", setup() { set({}); } },
    { title: "The frost line", q: "Where do the gas giants form? Why there?", hint: "Just beyond the frost line (2.7 AU for the Sun): water freezes into ice, so there is about four times more solid material, and cores reach the critical mass while gas is still there.", setup() { set({}); } },
    { title: "No gas, no giants", q: "Remove the gas from the disc. What kinds of planets form now?", hint: "No gas giants at all: only rocky and icy planets. The biggest cores reach 10–20 Earth masses but there is no gas to pull in.", setup() { set({ preset: "nogas" }); } },
    { title: "A race against time", q: "Make the gas clear in 0.5 million years. Can a giant still form?", hint: "Often not: the cores need a few million years to reach about 10 Earth masses. Real discs last 1–10 Myr, so giant planets must form quickly.", setup() { set({ preset: "fast" }); } },
    { title: "A red dwarf", q: "Try a 0.5 M☉ red dwarf with a smaller disc. Where is the frost line? What planets form?", hint: "The frost line is much closer (about 0.7 AU) because the star is dimmer (L ≈ M⁴). Small planets, rarely a giant: like the planets found around red dwarfs such as TRAPPIST-1.", setup() { set({ preset: "red" }); } },
    { title: "A massive disc", q: "Use a disc with twice the usual solid mass. What happens to the giants?", hint: "Cores grow faster and earlier, so they take more gas: super-Jupiters of several hundred Earth masses, often two of them.", setup() { set({ preset: "massive" }); } },
    { lvl: "adv", title: "Kepler's third law", q: "Click two planets when the run has finished. Check that T² ÷ a³ is the same for both (T in years, a in AU).", hint: "For the Sun, T²/a³ = 1 year² per AU³ for every planet: T² = 4π²a³/GM. For a 0.5 M☉ star it is 2.", setup() { set({}); } },
    { lvl: "adv", title: "Throwing or catching?", q: "Why do giant planets throw small bodies out of the system, while rocky planets collect them? Compare the escape speed from the planet with its orbital speed.", hint: "Jupiter: escape speed 60 km/s against an orbital speed of 13 km/s, so a close pass flings a body faster than the escape speed from the Sun at that distance. Earth: 11 km/s against 30 km/s, so bodies are bent but stay bound: it collides instead.", setup() { set({}); } }
  ],
  batch: [
    { title: "How many planets form?", question: "If we repeat a Solar-System-like disc with new random seeds, how many planets clear their orbits?", how: "120 embryos, 100 M⊕ of solids from 0.4 to 15 AU, 10 Jupiter masses of gas lasting 3 Myr; run to 100 Myr. A planet has no heavier body within 10 mutual Hill radii.", yLabel: "planets", reps: 60, bins: 10, theory: 8, theoryLabel: "Solar System", run: (x, r) => runSystem(BASE(), r).planets, note: "Usually 3–7, a little fewer than our 8. Our Solar System also has Uranus and Neptune at 19 and 30 AU, beyond this model's disc." },
    { title: "Bigger disc, bigger planets?", question: "How does the mass of the largest planet depend on the solid mass in the disc?", how: "As above, sweeping the solid mass.", xLabel: "solids in the disc (M⊕)", yLabel: "largest planet (M⊕)", xs: [30, 60, 100, 150, 200], reps: 8, yMin: 0, run: (x, r) => runSystem(Object.assign(BASE(), { disc: x }), r).biggest, note: "A sudden jump: with too little solid material no core reaches the critical mass in time; above that, cores run away into giants hundreds of times Earth's mass." },
    { title: "How much gas makes a gas giant?", question: "How many gas giants form with different amounts of gas in the disc?", how: "As above, sweeping the gas disc mass (in Jupiter masses).", xLabel: "gas in the disc (Jupiter masses)", yLabel: "gas giants", xs: [0, 2, 5, 10, 20], reps: 10, yMin: 0, run: (x, r) => runSystem(Object.assign(BASE(), { gasJ: x }), r).giants, note: "No gas, no gas giants. A core can only take the gas within reach of its orbit, so even a very gassy disc usually makes just one or two." },
    { title: "Does the frost line matter?", question: "Brighter stars push the frost line outwards. How many rocky planets form inside it?", how: "Star masses 0.6–1.4 M☉ (luminosity L = M⁴, frost line 2.7√L AU), otherwise as above.", xLabel: "star mass (M☉)", yLabel: "rocky planets inside the frost line", xs: [0.6, 0.8, 1, 1.2, 1.4], reps: 10, yMin: 0, run: (x, r) => runSystem(Object.assign(BASE(), { star: x }), r).rockyIn, note: "More rocky planets around brighter stars: the rocky zone is wider, while around dim red dwarfs ice forms close in." },
    { title: "The critical core mass", question: "How does the core mass needed for runaway gas accretion affect the number of giants?", how: "As above, sweeping the critical core mass.", xLabel: "critical core mass (M⊕)", yLabel: "gas giants", xs: [5, 10, 15, 20, 30], reps: 10, yMin: 0, run: (x, r) => runSystem(Object.assign(BASE(), { mCrit: x }), r).giants, note: "If a core needs more than about 15 Earth masses, none gets there before the gas disappears: a tipping point." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "The Solar System formed about 4.6 billion years ago from a cloud of dust and gas (a nebula) pulled together by gravity. Most of it formed the Sun." },
      { lvl: "std", tag: "GCSE", text: "The rest formed a spinning disc. Dust and rocks collided and stuck together (accretion), making bigger and bigger bodies: planets." },
      { lvl: "std", tag: "GCSE", text: "Inner planets are small and rocky (too hot for ice). Beyond the frost line, ice adds solid material, so big cores form and pull in gas: the gas giants." },
      { lvl: "adv", tag: "A level", text: "Circular orbit: GMm/r² = mv²/r → v = √(GM/r); T² = 4π²r³/GM (Kepler's third law)." },
      { lvl: "adv", tag: "A level", text: "Escape speed v = √(2GM/R). Gravitational focusing: a big, slow-moving body collects much more than its own cross-section, so the biggest bodies grow fastest (runaway growth)." },
      { lvl: "adv", tag: "A level", text: "Hill radius a(m/3M)^⅓: the zone where a planet's gravity beats the star's tides; planets end up many Hill radii apart." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why the inner planets of the Solar System are rocky but the outer planets are gas giants.", ans: "<ul><li>near the Sun it is hot, so only rock and metal are solid</li><li>beyond the frost line ice is also solid, so more material: bigger cores</li><li>big cores pull in hydrogen and helium gas before the gas disc disappears</li></ul>" },
      { lvl: "adv", marks: 3, q: "A planet orbits a 1.0 M☉ star at 5.2 AU. Find its orbital period and orbital speed (1 AU = 1.5 × 10¹¹ m, M☉ = 2.0 × 10³⁰ kg, G = 6.67 × 10⁻¹¹ N m² kg⁻²).", ans: "<ul><li>T² = a³ (years, AU) → T = 5.2^1.5 = 11.9 years</li><li>v = √(GM/r) = √(6.67 × 10⁻¹¹ × 2.0 × 10³⁰ ÷ 7.8 × 10¹¹)</li><li>v = 1.3 × 10⁴ m/s (13 km/s)</li></ul>" },
      { lvl: "adv", marks: 2, q: "Earth's Hill radius is about 0.01 AU. Use a(m/3M)^⅓ to find Jupiter's (318 M⊕ at 5.2 AU; M☉ = 333 000 M⊕).", ans: "<ul><li>(318 ÷ 999 000)^⅓ = 0.068</li><li>× 5.2 AU = 0.35 AU</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<p>Following every orbit for 100 million years would take a computer days, so this simulation works the way planet-population models in research do: each body follows a fixed Kepler orbit (semi-major axis a, eccentricity e), and in each time step every pair whose orbits come close has a chance of meeting, worked out from how often bodies in a shared ring should collide.</p>
<ul><li><b>Disc:</b> 120 equal-sized moon-to-Mars-mass embryos from 0.4 to 15 AU, solid surface density Σ ∝ r^−1.5, × 4 beyond the frost line 2.7√L AU (star luminosity L = M⁴). Bodies beyond the frost line are half ice.</li>
<li><b>Collisions:</b> two orbits can meet if their gap is less than a₁e₁ + a₂e₂ + 5 mutual Hill radii. Collision rate = σv/V, with σ = πR²(1 + v_esc²/v²) (gravitational focusing), v from the eccentricities (plus the Hill shear speed) and V the volume of the shared ring (thickness from the eccentricities). Bodies merge, conserving mass; a and e are mass-weighted.</li>
<li><b>Eccentricities</b> are stirred towards about ⅓ of the escape speed of nearby bodies (within a few Hill radii) and damped by gas (faster for bigger embryos). After the gas has gone, closely packed neighbours become unstable after about P × 10^(0.5Δ − 1) years (Δ = gap in mutual Hill radii; after Chambers et al. 1996), which starts the giant-impact phase.</li>
<li><b>Gas giants:</b> a core above the critical mass (10 M⊕) grows on a Kelvin–Helmholtz time 10⁸ yr × (m/M⊕)⁻³, so slowly at first and then in a runaway, until it has taken the gas between 0.7a and 1.3a (gas disc Σ ∝ 1/r out to 40 AU, fading as e^(−t/τ), τ = 3 Myr).</li>
<li><b>Ejection:</b> when a giant meets a body under a tenth its mass, the chance of throwing it out rather than colliding is Θ²/(1 + Θ²), where Θ = ½(v_esc/v_orbit)² (the Safronov number).</li>
<li>A <b>planet</b> (in the counts) has no heavier body within 10 mutual Hill radii (it has cleared its orbit); giants always count.</li></ul>
<h3>Left out</h3>
<ul><li>Real N-body orbits and resonances; migration of planets through the gas (which moved Jupiter and Saturn and may explain hot Jupiters); pebble accretion (a faster way to grow cores, which may be needed for Uranus and Neptune); fragmentation in high-speed impacts; inclinations (the disc is flat); the star's growth and the early cloud collapse.</li>
<li>The pictures move each body around its orbit at a slowed-down rate (keeping Kepler's T ∝ a^1.5), and the positions of collisions and ejections are not real.</li></ul>
<p>The earlier version of this simulation (a full N-body model with a cloud-collapse prologue, an inspector and its own batch runs), with its worksheets, is kept in <a href="original/planet-formation.html">original/planet-formation.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Start from");
ctl.preset = K.seg(g, { value: "solar", options: Object.entries(PRESETS).map(([k, v]) => [k, v.label]), on: v => set({ preset: v }) });
g = ui.group("The star and the disc");
ctl.star = K.slider(g, { label: "Star mass", min: 0.4, max: 1.6, step: 0.05, value: 1, fmt: v => `${v.toFixed(2)} M☉ (L = ${(v ** 4).toFixed(2)} L☉, frost line ${(2.7 * v * v).toFixed(1)} AU)`, on: v => { P.star = v; restart(); } });
ctl.disc = K.slider(g, { label: "Solid material in the disc", min: 20, max: 250, step: 5, value: 100, unit: "M⊕", on: v => { P.disc = v; restart(); } });
ctl.n = K.slider(g, { label: "Number of embryos", min: 40, max: 200, step: 10, value: 120, on: v => { P.n = v; restart(); } });
ctl.rOut = K.slider(g, { label: "Outer edge of the solids", min: 5, max: 30, step: 1, value: 15, unit: "AU", on: v => { P.rOut = v; restart(); } });
ctl.frostX = K.slider(g, { label: "Extra solids beyond the frost line", min: 1, max: 6, step: 0.5, value: 4, fmt: v => "× " + v, on: v => { P.frostX = v; restart(); } });
g = ui.group("Gas");
ctl.gasJ = K.slider(g, { label: "Gas in the disc", min: 0, max: 30, step: 1, value: 10, unit: "Jupiter masses", on: v => { P.gasJ = v; restart(); } });
ctl.gasMyr = K.slider(g, { label: "Gas lifetime", min: 0.3, max: 10, step: 0.1, value: 3, unit: "million years", on: v => { P.gasMyr = v; restart(); } });
ctl.mCrit = K.slider(g, { label: "Critical core mass", min: 3, max: 40, step: 1, value: 10, unit: "M⊕", on: v => { P.mCrit = v; restart(); } });
g = ui.group("Run");
let rr = K.row(g); K.btn(rr, "↺ New disc", () => restart(), "primary"); K.btn(rr, "⏩ Jump to the end", () => { while (sys.t < T_END) advance(); });
ctl.speed = K.slider(g, { label: "Speed", min: 5, max: 200, step: 5, value: 40, unit: "time steps per second", on: v => speed = v });
ctl.view = K.seg(g, { label: "View", value: "log", options: [["inner", "inner system (3 AU)"], ["whole", "whole disc"], ["log", "log distance"]], on: v => P.view = v });
ctl.orbits = K.toggle(g, { label: "Show orbits", value: true, on: v => P.orbits = v });
const read = K.readout(ui.group("Readings"), [["t", "time"], ["gas", "gas left"], ["n", "bodies left"], ["big", "largest body"], ["pl", "planets (cleared orbits)"], ["sel", "selected body"]]);
function set(o) {
  const pr = PRESETS[o.preset || "solar"]; Object.assign(P, BASE(), pr, { preset: o.preset || "solar" }); delete P.label;
  for (const k of ["star", "disc", "n", "rOut", "frostX", "gasJ", "gasMyr", "mCrit"]) ctl[k].set(P[k]); ctl.preset.set(P.preset); restart();
}
function restart() { sys = makeSystem(P, rnd); picked = null; flashes = []; hist = []; done = false; evSeen = 0; acc = 0; ui.setPlaying && ui.setPlaying(true); }
function advance() { if (sys.t >= T_END) return; step(sys, dtFor(sys), rnd); hist.push([Math.log10(sys.t), sys.B.length, gasNow(sys) * 100, Math.log10(Math.max(0.01, Math.max(...sys.B.map(b => b.m))))]); if (sys.B.indexOf(picked) < 0) picked = null; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const COL = { rocky: "#d0955f", icy: "#9fd8ff", "ice giant": "#5f9dff", "gas giant": "#ffb86b" };
let geo = { cx: 0, cy: 0, R: 1, max: 16 };
// distance from the star (AU) → pixels, for the chosen view
function rpx(a) { const { R, max } = geo; return P.view === "log" ? R * Math.max(0, Math.log(a / 0.25) / Math.log(max / 0.25)) : R * a / max; }
function posOf(b) { const E = b.ph, rr = b.a * (1 - b.e * Math.cos(E)), nu = 2 * Math.atan2(Math.sqrt(1 + b.e) * Math.sin(E / 2), Math.sqrt(1 - b.e) * Math.cos(E / 2)) + b.pe, k = rpx(rr); return [geo.cx + k * Math.cos(nu), geo.cy + k * Math.sin(nu)]; }
K.pointer(cv.el, { down: (x, y) => { let best = null, bd = 300; for (const b of sys.B) { const [px, py] = posOf(b), d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = b; } } picked = best; } });
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#04060d"; c.fillRect(0, 0, w, h);
  geo.cx = w * 0.5; geo.cy = h * 0.52; geo.R = Math.min(w * 0.47, h * 0.46); geo.max = P.view === "inner" ? 3 : P.rOut * 1.08;
  const gnow = gasNow(sys), sc = Math.sqrt(P.star ** 4);
  // the gas disc: a glow that fades as the gas disappears
  if (gnow > 0.01) { const gr = c.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, rpx(Math.min(GAS_OUT, geo.max * 1.5))); gr.addColorStop(0, `rgba(255,190,120,${0.35 * gnow})`); gr.addColorStop(0.5, `rgba(200,120,90,${0.16 * gnow})`); gr.addColorStop(1, "rgba(120,70,80,0)"); c.fillStyle = gr; c.beginPath(); c.arc(geo.cx, geo.cy, rpx(Math.min(GAS_OUT, geo.max * 1.5)), 0, 6.3); c.fill(); }
  // habitable zone and frost line
  c.strokeStyle = "rgba(127,227,160,0.16)"; c.lineWidth = Math.max(2, rpx(1.4 * sc) - rpx(0.95 * sc)); c.beginPath(); c.arc(geo.cx, geo.cy, (rpx(1.4 * sc) + rpx(0.95 * sc)) / 2, 0, 6.3); c.stroke(); c.lineWidth = 1;
  c.setLineDash([6, 5]); c.strokeStyle = "#7fc8ff"; c.beginPath(); c.arc(geo.cx, geo.cy, rpx(sys.frost), 0, 6.3); c.stroke(); c.setLineDash([]);
  TX(c, `frost line ${sys.frost.toFixed(1)} AU`, geo.cx + rpx(sys.frost) * 0.71 + 4, geo.cy - rpx(sys.frost) * 0.71 - 4, "#7fc8ff", "left", "11px");
  TX(c, "habitable zone", geo.cx, geo.cy - rpx(1.17 * sc) - Math.max(3, (rpx(1.4 * sc) - rpx(0.95 * sc)) / 2) - 3, "#7fe3a0", "center", "10.5px");
  // the star
  const sg = c.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, 14); sg.addColorStop(0, "#fff"); sg.addColorStop(0.4, P.star < 0.7 ? "#ff9a5a" : P.star > 1.2 ? "#cfe0ff" : "#ffe08a"); sg.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = sg; c.beginPath(); c.arc(geo.cx, geo.cy, 14, 0, 6.3); c.fill();
  // orbits and bodies
  for (const b of sys.B) {
    const k = kindOf(b), col = COL[k];
    if (P.orbits && (b.m > 0.6 || b === picked) && b.a * (1 - b.e) < geo.max * 1.3) { c.strokeStyle = b === picked ? "#ffd166" : col + "44"; c.beginPath(); for (let i = 0; i <= 48; i++) { const E = i / 48 * 6.283, rr = b.a * (1 - b.e * Math.cos(E)), nu = 2 * Math.atan2(Math.sqrt(1 + b.e) * Math.sin(E / 2), Math.sqrt(1 - b.e) * Math.cos(E / 2)) + b.pe, kk = rpx(rr), x = geo.cx + kk * Math.cos(nu), y = geo.cy + kk * Math.sin(nu); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    const [x, y] = posOf(b); if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
    const rad = Math.min(15, 1.6 + 2.2 * Math.cbrt(b.m)); c.fillStyle = col; c.beginPath(); c.arc(x, y, rad, 0, 6.3); c.fill();
    if (k === "gas giant") { c.strokeStyle = "rgba(120,60,20,0.6)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - rad * 0.9, y - rad * 0.3); c.lineTo(x + rad * 0.9, y - rad * 0.3); c.moveTo(x - rad * 0.9, y + rad * 0.35); c.lineTo(x + rad * 0.9, y + rad * 0.35); c.stroke(); c.lineWidth = 1; }
    if (b === picked) { c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rad + 4, 0, 6.3); c.stroke(); c.lineWidth = 1; }
    if (b.m > 3 || b === picked) TX(c, b.m >= 10 ? b.m.toFixed(0) + " M⊕" : b.m.toFixed(1) + " M⊕", x + rad + 3, y - rad - 1, "#cfd8ea", "left", "10.5px");
  }
  // collisions (flash) and ejections (streak outwards)
  for (const f of flashes) { const al = 1 - f.age; if (al <= 0) continue; if (f.kind === "eject") { c.strokeStyle = `rgba(200,160,255,${al})`; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x + (f.x - geo.cx) * f.age * 0.6, f.y + (f.y - geo.cy) * f.age * 0.6); c.stroke(); } else { c.strokeStyle = f.kind === "giant" ? `rgba(255,120,80,${al})` : `rgba(255,230,160,${al})`; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 4 + f.age * (f.kind === "giant" ? 26 : 12), 0, 6.3); c.stroke(); c.lineWidth = 1; } }
  // scale bar and key
  const bar = P.view === "log" ? null : (geo.max > 6 ? 5 : 1); if (bar) { c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(16, h - 16); c.lineTo(16 + rpx(bar), h - 16); c.stroke(); TX(c, bar + " AU", 16, h - 22, "#cfd8ea", "left", "11px"); } else TX(c, "log scale: 0.3 · 1 · 3 · 10 AU rings", 16, h - 16, "#cfd8ea", "left", "11px");
  if (P.view === "log") for (const a of [1, 3, 10]) { c.strokeStyle = "rgba(255,255,255,0.08)"; c.beginPath(); c.arc(geo.cx, geo.cy, rpx(a), 0, 6.3); c.stroke(); }
  let ky = 22; for (const [k, col] of Object.entries(COL)) { c.fillStyle = col; c.beginPath(); c.arc(20, ky - 4, 5, 0, 6.3); c.fill(); TX(c, k, 30, ky, "#cfd8ea", "left", "11.5px"); ky += 18; }
  TX(c, phase(), w - 14, h - 34, "#eef2f8", "right", "600 13px"); TX(c, fmtT(sys.t), w - 14, h - 14, "#ffd166", "right", "600 15px");
}
const fmtT = t => t < 1e6 ? (t / 1e3).toFixed(0) + " thousand years" : (t / 1e6).toFixed(t < 1e7 ? 1 : 0) + " million years";
function phase() { const gnow = gasNow(sys); if (done) return "Finished: the system has settled"; if (gnow > 0.5) return "Gas-rich disc: embryos grow by collisions"; if (gnow > 0.05) return sys.giantT !== null ? "Runaway gas accretion: giant planets" : "The gas is fading…"; return "Gas gone: giant impacts and clearing orbits"; }

// ---------------- Charts ----------------
function charts() {
  const cs = census(sys), lg = v => Math.log10(v);
  chA.opts.title = "Mass vs distance"; chA.opts.xLabel = "distance from the star (AU, log scale)"; chA.opts.yLabel = "mass (M⊕, log scale)"; chA.opts.xFmt = whole(v => String(+(10 ** v).toPrecision(1)));
  const ser = [{ pts: SOLAR.filter(p => p[1] < 40).map(p => [lg(p[1]), lg(p[2])]), type: "dots", r: 4, color: "#56607a", label: "Solar System" }];
  for (const [k, col] of Object.entries(COL)) { const pts = sys.B.filter(b => kindOf(b) === k && b.m > 0.01).map(b => [lg(b.a), lg(b.m)]); if (pts.length) ser.push({ pts, type: "dots", r: 3.5, color: col, label: k }); }
  chA.draw(ser, { xMin: -0.5, xMax: 1.5, yMin: -2, yMax: 3, yFmt: whole(v => v < 0 ? "0." + "0".repeat(-v - 1) + "1" : String(10 ** v)), vlines: [{ x: lg(sys.frost), color: "#7fc8ff", label: "frost line" }] });
  chB.opts.title = "Over time"; chB.opts.xLabel = "time (years, log scale)"; chB.opts.yLabel = "bodies left · gas left (%)"; chB.opts.xFmt = whole(v => "10" + "⁰¹²³⁴⁵⁶⁷⁸⁹"[v] );
  chB.draw([{ pts: hist.map(q => [q[0], q[1]]), color: "#ffd166", label: "bodies left" }, { pts: hist.map(q => [q[0], q[2]]), color: "#ff8a70", label: "gas left %" }], { xMin: 3, xMax: 8, yMin: 0, yMax: Math.max(100, P.n) });
  const big = sys.B.reduce((m, b) => b.m > m.m ? b : m, { m: 0 });
  read.set("t", fmtT(sys.t)); read.set("gas", (gasNow(sys) * 100).toFixed(0) + "%"); read.set("n", `${sys.B.length} (${sys.collisions} collisions, ${sys.ejected} thrown out)`);
  read.set("big", big.m ? `${big.m.toFixed(1)} M⊕ at ${big.a.toFixed(1)} AU (${kindOf(big)})` : "–");
  read.set("pl", `${cs.planets}: ${cs.giants} gas giant${cs.giants === 1 ? "" : "s"}, ${cs.iceGiants} ice giant${cs.iceGiants === 1 ? "" : "s"}, ${cs.rockyIn} rocky`);
  if (picked) { const T = Math.sqrt(picked.a ** 3 / P.star); read.set("sel", `${kindOf(picked)}, ${picked.m.toFixed(2)} M⊕, a = ${picked.a.toFixed(2)} AU, e = ${picked.e.toFixed(3)}, year ${T.toFixed(2)} y${ui.level === "adv" ? `, T²/a³ = ${(T * T / picked.a ** 3).toFixed(2)}` : ""}, ${picked.hits} collisions`); } else read.set("sel", "click a body");
  ui.hud(done ? `Finished: ${cs.planets} planets (Solar System: 8)` : "Embryos collide and merge; giants form beyond the frost line");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  for (const b of sys.B) b.ph += dt * 2 * Math.PI / (1.5 * Math.sqrt((b.a / 0.4) ** 3 / P.star));      // slowed-down orbits that keep T ∝ a^1.5
  if (!done) { acc += dt * speed; let k = 0; while (acc >= 1 && k++ < 50) { acc--; advance(); } if (sys.t >= T_END) done = true; }
  while (evSeen < sys.events.length) { const ev = sys.events[evSeen++], b = sys.B.reduce((best, q) => Math.abs(q.a - ev.a) < Math.abs(best.a - ev.a) ? q : best, sys.B[0] || { a: 0, ph: 0, e: 0, pe: 0 }); if (!b) continue; const [x, y] = posOf(b); flashes.push({ x, y, kind: ev.kind, age: 0 }); }
  for (const f of flashes) f.age += dt * 1.2; flashes = flashes.filter(f => f.age < 1);
}, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Each dot is a moon-to-Mars-sized embryo. Watch them collide and merge; click a body to follow it.", 7000);
