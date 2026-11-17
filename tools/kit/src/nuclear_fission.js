/* =====================================================================
   NUCLEAR FISSION AND CHAIN REACTIONS
   A slow neutron is absorbed by a uranium-235 nucleus, which becomes
   unstable and splits into two smaller (radioactive) nuclei, releasing
   2 or 3 neutrons and about 200 MeV of energy:
        ²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n + energy
   The new neutrons can split more nuclei: a CHAIN REACTION.
   k = the average number of new fissions caused by each fission.
     k < 1 the chain dies out (subcritical)
     k = 1 steady (critical: a power station)
     k > 1 it grows (supercritical: a bomb)
   Neutrons escape through the surface, so a small lump has k < 1: the
   smallest mass with k = 1 is the CRITICAL MASS. Control rods (boron,
   cadmium) absorb neutrons; a moderator slows them so U-235 captures them.
   The energy comes from the mass defect: E = mc².
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const FUEL = { U: { name: "Uranium-235", rho: 19.1, nu: 2.43, mc: 52, sym: "²³⁵U" }, Pu: { name: "Plutonium-239", rho: 19.8, nu: 2.9, mc: 10, sym: "²³⁹Pu" } };
// chance that a neutron born at a random point in a sphere of radius R escapes before it interacts (mean free path λ); x = R/λ
const pEsc = x => 3 / (8 * x ** 3) * (2 * x * x - 1 + (1 + 2 * x) * Math.exp(-2 * x));
const radiusOf = (m, f) => Math.cbrt(3 * m * 1000 / (4 * Math.PI * FUEL[f].rho));       // cm, from mass in kg
// the mean free path for each fuel, chosen so that k = 1 at the real (bare-sphere) critical mass
const LAMBDA = {}; for (const f in FUEL) { const R = radiusOf(FUEL[f].mc, f); let lo = 0.1, hi = 50; for (let i = 0; i < 60; i++) { const l = (lo + hi) / 2; if (FUEL[f].nu * (1 - pEsc(R / l)) > 1) lo = l; else hi = l; } LAMBDA[f] = (lo + hi) / 2; }
// k for a sphere of mass m with a fraction 'rods' of neutrons absorbed by control rods
const kOf = (m, f, rods = 0) => FUEL[f].nu * (1 - pEsc(radiusOf(m, f) / LAMBDA[f])) * (1 - rods);
function massFor(k, f, rods = 0) { let lo = 0.05, hi = 5000; for (let i = 0; i < 80; i++) { const m = Math.sqrt(lo * hi); if (kOf(m, f, rods) < k) lo = m; else hi = m; } return Math.sqrt(lo * hi); }
// a chain started by n0 neutrons; each neutron causes a fission with chance k/ν (else it escapes or is absorbed)
// each fission gives 2 or 3 neutrons (mean ν); returns neutrons per generation (stops at a cap)
function chain(k, nu, n0, r, gens = 40, cap = 1e5) { const pf = k / nu, out = [n0]; let n = n0, fis = 0; for (let g = 0; g < gens && n > 0 && n < cap; g++) { let m = 0; for (let i = 0; i < n; i++) if (r() < pf) { fis++; m += r() < nu - 2 ? 3 : 2; } n = m; out.push(n); } return { gens: out, fissions: fis }; }
// chance that a chain from ONE neutron never dies out: 1 − q, with q = (1 − pf) + pf(a q² + b q³)
function runawayP(k, nu) { const pf = Math.min(1, k / nu), b = nu - 2, a = 1 - b; let q = 0; for (let i = 0; i < 2000; i++) q = (1 - pf) + pf * (a * q * q + b * q * q * q); return 1 - q; }
// binding energy (MeV) from the semi-empirical mass formula
function BE(A, Z) { const N = A - Z, d = A % 2 ? 0 : (Z % 2 ? -1 : 1) * 12 / Math.sqrt(A); return 15.75 * A - 17.8 * A ** (2 / 3) - 0.711 * Z * (Z - 1) / A ** (1 / 3) - 23.7 * (N - Z) ** 2 / A + d; }
// a random fission of U-236: two fragments (asymmetric), 2 or 3 neutrons; energy = BE(fragments) − BE(U-236)
function fissionQ(r) { const nn = r() < 0.43 ? 3 : 2, A1 = Math.round(95 + 5 * r.gauss()), A2 = 236 - nn - A1, Z1 = Math.round(92 * A1 / 236 + 0.5), Z2 = 92 - Z1; return BE(A1, Z1) + BE(A2, Z2) - BE(236, 92); }
const MASS = { U235: 235.043930, n: 1.008665, Ba141: 140.914411, Kr92: 91.926156 }, U2MeV = 931.494;
const dM = MASS.U235 + MASS.n - (MASS.Ba141 + MASS.Kr92 + 3 * MASS.n);

// ---------------- The page ----------------
const P = { fuel: "U", how: "k", k: 1.2, mass: 60, rods: 0, n0: 1, rodsOn: false };
let rnd = K.rng(Date.now() % 9973 + 5), nuclei = [], neutrons = [], flashes = [], gen = [], fissions = 0, escaped = 0, absorbed = 0, T = 0, speed = 1, status = "";
const ui = K.app({
  title: "Nuclear Fission and Chain Reactions", subject: "Physics",
  blurb: "Neutrons split nuclei and set off more: chain reactions, critical mass, control rods, and the energy from the mass defect",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 7(c) fission and fusion: a slow neutron absorbed by U-235 makes it split into two radioactive daughter nuclei, 2–3 neutrons and energy; the chain reaction; the moderator and control rods in a reactor; balanced nuclear equations.", adv: "WJEC Eduqas A level Physics: nuclear energy: E = mc², mass defect, binding energy and binding energy per nucleon, energy released in fission. k and critical mass are beyond the spec." } },
  missions: [
    { title: "One fission", q: "Watch a single neutron hit a nucleus. What comes out? Write the nuclear equation.", hint: "²³⁵U + ¹n → ¹⁴¹Ba + ⁹²Kr + 3 ¹n: two smaller radioactive nuclei, 2 or 3 neutrons and energy (kinetic energy of the fragments, which heats the fuel). Mass numbers balance: 235 + 1 = 141 + 92 + 3.", setup() { set({ k: 0.5, n0: 1 }); } },
    { title: "A chain reaction", q: "Set k = 1.5. How does the number of neutrons change from one generation to the next?", hint: "It multiplies by about 1.5 each generation: 1, 1.5, 2.3, 3.4, … an exponential runaway, as in a bomb. Each generation takes only about 10 nanoseconds.", setup() { set({ k: 1.5, n0: 3 }); } },
    { title: "Control rods", q: "Make the reactor supercritical, then push the control rods in. What happens to k? How does a power station stay at k = 1?", hint: "Control rods (boron or cadmium) absorb neutrons, lowering k. Operators move them in or out to keep exactly one neutron from each fission causing another fission: k = 1, a steady output.", setup() { set({ how: "mass", mass: 70, rodsOn: true, rods: 0.2 }); } },
    { title: "Critical mass", q: "Choose 'from the fuel mass'. Increase the mass of U-235. At what mass does the chain keep going?", hint: "A small sphere loses too many neutrons through its surface (large surface area for its volume). At about 52 kg (a ball 17 cm across) k = 1: the critical mass. A bomb brings sub-critical pieces together quickly.", setup() { set({ how: "mass", mass: 20 }); } },
    { title: "Plutonium", q: "Switch to plutonium-239. Why is its critical mass smaller?", hint: "Pu-239 releases more neutrons per fission (about 2.9 against 2.4) and is a little denser, so about 10 kg is enough.", setup() { set({ fuel: "Pu", how: "mass", mass: 8 }); } },
    { lvl: "adv", title: "Energy from the mass defect", q: "Use the mass table: find the mass lost in ²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n and the energy released.", hint: "Δm = 0.186 u; E = 0.186 × 931.5 MeV = 173 MeV = 2.8 × 10⁻¹¹ J per fission. One kilogram of U-235 could release about 7 × 10¹³ J: millions of times more than burning a kilogram of coal.", setup() { set({ k: 1 }); } },
    { lvl: "adv", title: "Binding energy per nucleon", q: "Look at the binding energy per nucleon curve. Why does splitting a heavy nucleus release energy?", hint: "Uranium has about 7.6 MeV per nucleon; the fragments (Ba, Kr) about 8.4. The products are more tightly bound, so energy is released: about 0.85 MeV × 236 nucleons ≈ 200 MeV.", setup() { set({ k: 1 }); } }
  ],
  batch: [
    { title: "What is the critical mass of U-235?", question: "How does k change with the mass of a bare sphere of U-235?", how: "k measured by following 2000 neutrons: k = ν × (fraction that cause a fission).", xLabel: "mass of U-235 (kg)", yLabel: "k", xs: [10, 20, 30, 40, 52, 65, 80, 100], reps: 3, theory: m => kOf(m, "U"), theoryLabel: "ν(1 − P_escape)", run: (m, r) => { const R = radiusOf(m, "U"), l = LAMBDA.U; let f = 0; for (let i = 0; i < 2000; i++) { const p = randInSphere(R, r), d = randDir(r), s = -l * Math.log(1 - r()); if (Math.hypot(p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s) < R) f++; } return FUEL.U.nu * f / 2000; }, note: "k crosses 1 at about 52 kg: below it the chain dies out, above it runs away." },
    { title: "Does plutonium need less?", question: "How does k change with the mass of plutonium-239?", how: "As above, for Pu-239 (ν = 2.9, density 19.8 g/cm³).", xLabel: "mass of Pu-239 (kg)", yLabel: "k", xs: [2, 4, 6, 8, 10, 14, 20], reps: 3, theory: m => kOf(m, "Pu"), theoryLabel: "ν(1 − P_escape)", run: (m, r) => { const R = radiusOf(m, "Pu"), l = LAMBDA.Pu; let f = 0; for (let i = 0; i < 2000; i++) { const p = randInSphere(R, r), d = randDir(r), s = -l * Math.log(1 - r()); if (Math.hypot(p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s) < R) f++; } return FUEL.Pu.nu * f / 2000; }, note: "About 10 kg: more neutrons per fission, so less fuel is needed." },
    { title: "Do control rods work?", question: "How does k depend on the fraction of neutrons the control rods absorb?", how: "70 kg of U-235; 2000 neutrons per run.", xLabel: "fraction absorbed by control rods", yLabel: "k", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], reps: 3, theory: rd => kOf(70, "U", rd), theoryLabel: "k₀(1 − r)", run: (rd, r) => { const pf = kOf(70, "U") / FUEL.U.nu; let f = 0; for (let i = 0; i < 2000; i++) if (r() < pf && r() > rd) f++; return FUEL.U.nu * f / 2000; }, note: "k falls in a straight line as the rods go in: about 10% absorbed brings 70 kg back to critical." },
    { title: "How long is a chain when k < 1?", question: "How many fissions does one neutron cause, on average, in a subcritical lump?", how: "Chains from one neutron, U-235 (ν = 2.43); 200 chains each.", xLabel: "k", yLabel: "fissions per starting neutron", xs: [0.3, 0.5, 0.7, 0.8, 0.9], reps: 200, yMin: 0, theory: k => (k / 2.43) / (1 - k), theoryLabel: "(k/ν) ÷ (1 − k)", run: (k, r) => chain(k, 2.43, 1, r, 400).fissions, note: "As k approaches 1 the chains get much longer and very variable (a few huge chains carry the average, so 200 chains often fall short of the theory near k = 1): a reactor near k = 1 needs careful control." },
    { title: "Will one neutron start a runaway?", question: "With k > 1, what fraction of single neutrons set off a chain that keeps growing?", how: "Chains from one neutron in U-235; 'runaway' = reaching 1000 neutrons; 300 chains each.", xLabel: "k", yLabel: "% that run away", xs: [1.05, 1.2, 1.5, 1.8, 2.2], reps: 3, yMin: 0, yMax: 100, theory: k => 100 * runawayP(k, 2.43), theoryLabel: "1 − extinction probability", run: (k, r) => { let n = 0; for (let i = 0; i < 300; i++) { const c = chain(k, 2.43, 1, r, 200, 1000); if (c.gens[c.gens.length - 1] >= 1000) n++; } return 100 * n / 300; }, note: "Even when k > 1, many chains die out by chance in the first few generations: one reason a weapon needs a neutron source and a fast assembly." },
    { title: "How much energy does one fission release?", question: "What energies do random fissions of U-235 release (binding-energy model)?", how: "Fragments with mass numbers near 95 and 139 (spread 5), 2 or 3 neutrons; Q = binding energy of the fragments − binding energy of U-236 (semi-empirical mass formula).", yLabel: "energy released (MeV)", reps: 500, bins: 24, theory: 173.3, theoryLabel: "¹⁴¹Ba + ⁹²Kr + 3n", run: (x, r) => fissionQ(r), note: "About 160–180 MeV each (plus about 20 MeV later from the radioactive decay of the fragments): roughly 200 MeV per fission in total." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 7(c)", text: "Fission: a slow neutron is absorbed by U-235, which splits into two smaller radioactive nuclei, releasing 2 or 3 neutrons and energy (kinetic energy of the products)." },
      { lvl: "std", tag: "4PH1 7(c)", text: "Chain reaction: the released neutrons go on to split more nuclei. In a reactor, control rods absorb neutrons to keep it steady; the moderator (graphite, water) slows neutrons so they can be absorbed by U-235." },
      { lvl: "std", tag: "4PH1 7(c)", text: "Nuclear equations balance: the mass numbers (top) and atomic numbers (bottom) add up the same on each side." },
      { lvl: "adv", tag: "Eduqas", text: "E = mc²: the products have less mass than the reactants; the mass defect becomes energy. 1 u = 931.5 MeV." },
      { lvl: "adv", tag: "Eduqas", text: "Binding energy per nucleon peaks at iron-56 (about 8.8 MeV). Splitting heavy nuclei (fission) or joining light ones (fusion) moves towards the peak and releases energy." },
      { lvl: "beyond", tag: "Beyond the spec", text: "k (the multiplication factor): subcritical < 1, critical = 1, supercritical > 1. Critical mass ≈ 52 kg for a bare sphere of U-235, ≈ 10 kg for Pu-239." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Complete the equation: ²³⁵₉₂U + ¹₀n → ¹⁴¹₅₆Ba + ⁹²₃₆Kr + _ ¹₀n", ans: "<ul><li>mass numbers: 236 = 141 + 92 + x → x = 3</li><li>3 neutrons (atomic numbers 92 = 56 + 36 ✓)</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain how control rods keep a nuclear reactor at a steady power.", ans: "<ul><li>control rods absorb neutrons</li><li>lowering them in absorbs more, so fewer fissions; raising them allows more</li><li>adjusted so on average one neutron from each fission causes another fission</li></ul>" },
      { lvl: "adv", marks: 3, q: "The mass defect in a fission is 0.186 u. Calculate the energy released in MeV and in J (1 u = 931.5 MeV, 1 eV = 1.6 × 10⁻¹⁹ J).", ans: "<ul><li>E = 0.186 × 931.5 = 173 MeV</li><li>= 173 × 10⁶ × 1.6 × 10⁻¹⁹</li><li>= 2.8 × 10⁻¹¹ J</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `With k = ${(P.how === "k" ? P.k : kOf(P.mass, P.fuel, P.rodsOn ? P.rods : 0)).toFixed(2)} and ${P.n0} starting neutron(s), how many neutrons would you expect after 5 generations?`, ans: () => { const k = P.how === "k" ? P.k : kOf(P.mass, P.fuel, P.rodsOn ? P.rods : 0); return `<ul><li>N = N₀ k⁵ = ${P.n0} × ${k.toFixed(2)}⁵</li><li>= ${(P.n0 * k ** 5).toFixed(1)}</li></ul>`; } }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A bare sphere of fuel. Each neutron is born at a random point (from a fission) and flies a random distance with mean λ (the mean free path) in a random direction. If it leaves the sphere it escapes; otherwise it is absorbed by a control rod (chance r) or causes a fission, which releases 2 or 3 neutrons (mean ν = 2.43 for U-235, 2.9 for Pu-239).</li>
<li>So k = ν (1 − P_escape)(1 − r), with P_escape = 3/(8x³)(2x² − 1 + (1 + 2x)e^(−2x)), x = R/λ (the first-flight escape probability for a uniform sphere). λ is chosen so that k = 1 at the real bare-sphere critical masses (52 kg U-235, 10 kg Pu-239). Radius from the density (19.1 and 19.8 g/cm³).</li>
<li>Energy: the reaction ²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n with atomic masses (u), Δm = ${dM.toFixed(6)} u = ${(dM * U2MeV).toFixed(1)} MeV. Binding energy per nucleon from the semi-empirical mass formula.</li>
<li>The picture is a slice through the sphere, slowed down about 100 million times (one generation takes about 10 ns).</li></ul>
<h3>Left out</h3>
<ul><li>Neutron speeds (fast and slow) and the moderator, delayed neutrons (which make reactors controllable), neutron capture without fission, reflectors and tampers, the heating and expansion of the fuel.</li></ul>
<p>Fusion has its own simulation. The earlier version of this simulation, with its worksheets, is kept in <a href="original/nuclear-fission.html">original/nuclear-fission.html</a>.</p>`
});
function randInSphere(R, r) { for (;;) { const p = [2 * r() - 1, 2 * r() - 1, 2 * r() - 1]; if (p[0] ** 2 + p[1] ** 2 + p[2] ** 2 < 1) return p.map(v => v * R); } }
function randDir(r) { const z = 2 * r() - 1, a = r() * 6.283, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; }

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Fuel");
ctl.fuel = K.seg(g, { value: "U", options: [["U", "uranium-235"], ["Pu", "plutonium-239"]], on: v => { P.fuel = v; restart(); } });
ctl.how = K.seg(g, { label: "Set by", value: "k", options: [["k", "choose k"], ["mass", "the fuel mass"]], on: v => { P.how = v; restart(); } });
ctl.k = K.slider(g, { label: "k (new fissions per fission)", min: 0.3, max: 2, step: 0.01, value: 1.2, on: v => { P.k = v; restart(); } });
ctl.mass = K.slider(g, { label: "Mass of fuel (a sphere)", min: 1, max: 160, step: 1, value: 60, unit: "kg", on: v => { P.mass = v; restart(); } });
g = ui.group("Control");
ctl.rodsOn = K.toggle(g, { label: "Control rods in", value: false, on: v => { P.rodsOn = v; } });
ctl.rods = K.slider(g, { label: "Fraction of neutrons absorbed", min: 0, max: 0.6, step: 0.01, value: 0, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.rods = v; } });
ctl.n0 = K.slider(g, { label: "Starting neutrons", min: 1, max: 5, step: 1, value: 1, on: v => { P.n0 = v; restart(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
K.btn(K.row(g), "↺ Fire again", () => restart(), "primary");
const read = K.readout(ui.group("Readings"), [["k", "k now"], ["st", "state"], ["fm", "fuel: mass · radius · critical mass"], ["n", "fissions · escaped · absorbed"], ["E", "energy per fission (A level: from Δm)"]]);
const kNow = () => (P.how === "k" ? P.k * (P.rodsOn ? 1 - P.rods : 1) : kOf(P.mass, P.fuel, P.rodsOn ? P.rods : 0));
const massNow = () => P.how === "k" ? massFor(P.k, P.fuel) : P.mass;
function set(o) { Object.assign(P, { fuel: "U", how: "k", k: 1.2, mass: 60, rods: 0, n0: 1, rodsOn: false }, o); for (const k of ["k", "mass", "rods", "n0"]) ctl[k].set(P[k]); ctl.fuel.set(P.fuel); ctl.how.set(P.how); ctl.rodsOn.set(P.rodsOn); restart(); }
function restart() {
  const R = 1; nuclei = []; for (let i = 0; i < 260; i++) nuclei.push({ p: randInSphere(R, rnd), split: 0 });
  neutrons = []; for (let i = 0; i < P.n0; i++) spawn([0.2 * rnd.gauss(), 0.2 * rnd.gauss(), 0], 0); gen = [P.n0]; fissions = escaped = absorbed = 0; flashes = []; status = "";
}
// a neutron: start point, direction, how far it will fly (in units of the sphere radius), its generation
function spawn(p, gn) { const d = randDir(rnd), lamR = P.how === "mass" ? LAMBDA[P.fuel] / radiusOf(P.mass, P.fuel) : LAMBDA[P.fuel] / radiusOf(massFor(P.k, P.fuel), P.fuel); neutrons.push({ p: p.slice(), d, s: -lamR * Math.log(1 - rnd()), t: 0, gn }); }
function step(dt) {
  const v = 0.9 * speed, born = [];
  for (const n of neutrons) {
    n.t += v * dt; const q = [n.p[0] + n.d[0] * Math.min(n.t, n.s), n.p[1] + n.d[1] * Math.min(n.t, n.s), n.p[2] + n.d[2] * Math.min(n.t, n.s)];
    if (Math.hypot(...q) > 1) { n.dead = "esc"; escaped++; continue; }
    if (n.t >= n.s) {
      n.dead = true;
      if (P.rodsOn && rnd() < P.rods) { absorbed++; flashes.push({ p: q, t: 0, kind: "rod" }); continue; }
      // with "choose k", the sphere is the size that gives k (without rods)
      fissions++; flashes.push({ p: q, t: 0, kind: "fission" }); const nu = FUEL[P.fuel].nu, m = rnd() < nu - 2 ? 3 : 2; gen[n.gn + 1] = (gen[n.gn + 1] || 0) + m;
      for (let i = 0; i < m; i++) born.push([q, n.gn + 1]);
    }
  }
  neutrons = neutrons.filter(n => !n.dead); for (const [q, gn] of born) if (neutrons.length < 500) spawn(q, gn);
  if (!neutrons.length) status = "The chain has died out"; else if (neutrons.length >= 500) status = "Runaway: the number of neutrons keeps growing";
  for (const f of flashes) f.t += dt * 1.5; flashes = flashes.filter(f => f.t < 1);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b16"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  const cx = w * 0.3, cy = h * 0.52, R = Math.min(w * 0.27, h * 0.4), X = p => cx + p[0] * R, Y = p => cy + p[1] * R;
  const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, "#1c2a1c"); gr.addColorStop(1, "#122012"); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.fill(); c.strokeStyle = "#7ee787"; c.stroke();
  if (P.rodsOn && P.rods > 0) { c.fillStyle = "rgba(160,170,190,.5)"; for (let i = -2; i <= 2; i++) c.fillRect(cx + i * R * 0.35 - 4, cy - R, 8, R * 2 * Math.min(1, P.rods / 0.3)); }
  for (const nu of nuclei) { c.fillStyle = "#4caf50"; c.beginPath(); c.arc(X(nu.p), Y(nu.p), 2.6, 0, 6.3); c.fill(); }
  for (const f of flashes) { const a = 1 - f.t; if (f.kind === "fission") { c.fillStyle = `rgba(255,209,102,${a})`; c.beginPath(); c.arc(X(f.p), Y(f.p), 6 + 16 * f.t, 0, 6.3); c.fill(); c.fillStyle = `rgba(255,138,112,${a})`; for (const s of [-1, 1]) { c.beginPath(); c.arc(X(f.p) + s * 20 * f.t, Y(f.p) - s * 8 * f.t, 4, 0, 6.3); c.fill(); } } else { c.strokeStyle = `rgba(200,200,220,${a})`; c.beginPath(); c.moveTo(X(f.p) - 5, Y(f.p) - 5); c.lineTo(X(f.p) + 5, Y(f.p) + 5); c.moveTo(X(f.p) + 5, Y(f.p) - 5); c.lineTo(X(f.p) - 5, Y(f.p) + 5); c.stroke(); } }
  for (const n of neutrons) { const q = [n.p[0] + n.d[0] * Math.min(n.t, n.s), n.p[1] + n.d[1] * Math.min(n.t, n.s)]; c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(X(q), Y(q), 3, 0, 6.3); c.fill(); }
  const k = kNow(); TX(c, `${FUEL[P.fuel].name}: ${massNow().toFixed(1)} kg sphere, ${(2 * radiusOf(massNow(), P.fuel)).toFixed(1)} cm across (slice)`, 14, 22, "#eef2f8", "left", "600 13.5px");
  TX(c, status || `${neutrons.length} neutrons in flight`, cx, cy + R + 22, status.startsWith("Run") ? "#ff6b81" : "#cfd8ea", "center", "600 13px");
  // the reaction and (A level) the mass table
  const x0 = w * 0.62; let y = 118; const L = (s, col = "#cfd8ea", f = "12.5px") => { TX(c, s, x0, y, col, "left", f); y += 22; };
  L("²³⁵U + ¹n → ¹⁴¹Ba + ⁹²Kr + 3 ¹n + energy", "#ffd166", "600 15px"); L(k < 0.995 ? `k = ${k.toFixed(2)}: subcritical, the chain dies out` : k < 1.005 ? "k = 1: critical, a steady chain (reactor)" : `k = ${k.toFixed(2)}: supercritical, it grows (bomb)`, k < 0.995 ? "#5ad1ff" : k < 1.005 ? "#7ee787" : "#ff6b81", "600 13px"); y += 6;
  L("green: nuclei · blue: neutrons · flash: fission · ×: absorbed by a control rod", "#8fa0bf", "11px");
  if (adv) { y += 8; L("Mass table (atomic mass units, u)", "#eef2f8", "600 12.5px"); for (const [n, m] of [["²³⁵U", MASS.U235], ["¹n", MASS.n], ["¹⁴¹Ba", MASS.Ba141], ["⁹²Kr", MASS.Kr92]]) L(`${n}: ${m.toFixed(6)} u`, "#aab6cc", "12px"); L(`Δm = ${dM.toFixed(6)} u → E = ${(dM * U2MeV).toFixed(1)} MeV = ${(dM * U2MeV * 1.602e-13).toExponential(2)} J`, "#ffd166", "600 12.5px"); }
}

// ---------------- Charts and readings ----------------
function charts() {
  const k = kNow(), gs = gen.map((n, i) => [i, Math.log10(Math.max(n || 0, 0.5))]);
  chA.opts.title = "Neutrons in each generation (log scale)"; chA.opts.xLabel = "generation"; chA.opts.yLabel = "neutrons"; chA.opts.yFmt = whole(v => String(10 ** v));
  const th = []; for (let i = 0; i <= Math.max(10, gen.length); i++) th.push([i, Math.log10(P.n0 * k ** i)]);
  chA.draw([{ pts: gs, type: "dots", r: 4, color: "#5ad1ff", label: "this chain" }, { pts: th, color: "#ffd166", dash: [5, 4], label: "N₀kⁿ" }], { yMin: -0.5, yMax: Math.max(3, Math.log10(P.n0 * Math.max(1, k) ** Math.max(10, gen.length)) + 0.3) });
  if (ui.level === "adv") {
    const pts = []; for (let A = 4; A <= 240; A += 2) { const Z = Math.round(A / (1.98 + 0.0155 * A ** (2 / 3))); pts.push([A, (BE(A, Z) - (A % 2 ? 0 : (Z % 2 ? -1 : 1) * 12 / Math.sqrt(A))) / A]); }   // pairing term left out to draw a smooth curve
    chB.opts.title = "Binding energy per nucleon"; chB.opts.xLabel = "mass number A"; chB.opts.yLabel = "MeV per nucleon"; chB.opts.yFmt = null;
    chB.draw([{ pts, color: "#7ee787", label: "SEMF" }, { pts: [[235, BE(235, 92) / 235], [141, BE(141, 56) / 141], [92, BE(92, 36) / 92]], type: "dots", r: 5, color: "#ffd166", label: "U-235, Ba-141, Kr-92" }], { yMin: 6, yMax: 9.2, vlines: [{ x: 56, label: "Fe-56", color: "#56607a" }] });
  } else {
    const pts = []; for (let m = 1; m <= 160; m += 1) pts.push([m, kOf(m, P.fuel)]);
    chB.opts.title = "k against the mass of fuel"; chB.opts.xLabel = "mass (kg)"; chB.opts.yLabel = "k"; chB.opts.yFmt = null;
    chB.draw([{ pts, color: "#7ee787", label: FUEL[P.fuel].name }, { pts: [[massNow(), kOf(massNow(), P.fuel)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, hlines: [{ y: 1, label: "critical", color: "#ffd166" }] });
  }
  read.set("k", k.toFixed(3)); read.set("st", k < 0.995 ? "subcritical" : k < 1.005 ? "critical" : "supercritical");
  read.set("fm", `${massNow().toFixed(1)} kg · ${radiusOf(massNow(), P.fuel).toFixed(1)} cm · ${FUEL[P.fuel].mc} kg`); read.set("n", `${fissions} · ${escaped} · ${absorbed}`); read.set("E", `${(dM * U2MeV).toFixed(1)} MeV = ${(dM * U2MeV * 1.602e-13).toExponential(2)} J`);
  ui.hud(k < 0.995 ? "Too many neutrons escape or are absorbed: the chain dies out" : k < 1.005 ? "Each fission causes one more: a steady chain" : "Each fission causes more than one: the chain grows");
}
let frame = 0;
ui.run(dt => { if (dt > 0) step(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Blue dots are neutrons. Each yellow flash is a nucleus splitting and releasing 2 or 3 more neutrons.", 6000);
