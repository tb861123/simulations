/* =====================================================================
   EXOPLANET HUNTING
   Planets around other stars are far too faint to see directly. We find
   them by their effect on the star:
     * TRANSIT: if the orbit is edge-on, the planet passes in front of the
       star once per orbit and blocks a fraction of its light:
           depth = (planet radius ÷ star radius)²
     * RADIAL VELOCITY: the planet pulls the star round in a small circle,
       so the star moves towards and away from us; the Doppler shift of its
       light gives a speed that rises and falls once per orbit. A heavier
       planet makes a bigger wobble.
   With the period, Kepler's third law gives the size of the orbit
   (a³ = M P², in AU, years and solar masses), and from that how much
   starlight the planet gets: is it in the habitable zone?
   Real measurements are noisy: many transits must be stacked (folded)
   to see a small planet.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const RSUN_AU = 0.00465, REARTH_RSUN = 0.009168, MJ_ME = 317.8;
const STARS = {
  sun: { name: "Sun-like star", M: 1, R: 1, T: 5772, L: 1 }, red: { name: "Red dwarf", M: 0.3, R: 0.3, T: 3400, L: 0.012 },
  trap: { name: "Ultra-cool dwarf (TRAPPIST-1-like)", M: 0.09, R: 0.12, T: 2560, L: 0.00055 }, astar: { name: "A star", M: 2, R: 1.7, T: 8500, L: 15 }
};
const SCOPES = { ground: { name: "Ground telescope", ppm: 2500, nights: true }, tess: { name: "TESS-like (space)", ppm: 400, nights: false }, kepler: { name: "Kepler-like (space)", ppm: 60, nights: false } };
const aAU = (P, M) => Math.cbrt(M * (P / 365.25) ** 2);                                                     // Kepler's third law
const depthOf = (Rp, Rs) => Math.pow(Rp * REARTH_RSUN / Rs, 2);                                           // fraction of light blocked
const rvK = (Mp, P, Ms, inc) => 28.43 * (Mp / MJ_ME) * Math.sin(inc * Math.PI / 180) * Math.pow(Ms, -2 / 3) * Math.pow(P / 365.25, -1 / 3);   // m/s
const transits = (pl, st, inc) => aAU(pl.P, st.M) * Math.cos(inc * Math.PI / 180) < st.R * RSUN_AU * (1 + pl.R * REARTH_RSUN / st.R);
const hz = st => [0.95 * Math.sqrt(st.L), 1.67 * Math.sqrt(st.L)];                                         // habitable zone (AU), roughly
const teq = (st, a) => st.T * Math.sqrt(st.R * RSUN_AU / (2 * a)) * Math.pow(0.7, 0.25);                   // equilibrium temperature with albedo 0.3
// brightness of the star at time t (days): 1 − sum of the planets' transits (a box with sloping edges)
function flux(t, sys) {
  let f = 1; for (const pl of sys.planets) { if (!pl.on || !transits(pl, sys.star, sys.inc)) continue; const a = aAU(pl.P, sys.star.M), dur = pl.P / Math.PI * Math.asin(Math.min(1, sys.star.R * RSUN_AU / a)), ph = ((t - pl.t0) / pl.P % 1 + 1) % 1, dt = Math.min(ph, 1 - ph) * pl.P, edge = dur * 0.12;
    if (dt < dur / 2) f -= depthOf(pl.R, sys.star.R) * Math.min(1, (dur / 2 - dt) / edge); }
  return f;
}
const rv = (t, sys) => sys.planets.reduce((s, pl) => pl.on ? s - rvK(pl.M, pl.P, sys.star.M, sys.inc) * Math.sin(2 * Math.PI * (t - pl.t0) / pl.P) : s, 0);
// observe: a point every 30 minutes (only at night for the ground), with random noise; clouds lose some nights
function observe(sys, days, r) {
  const sc = SCOPES[sys.scope], out = []; let cloudy = false;
  for (let t = 0; t < days; t += 1 / 48) { const night = !sc.nights || (t % 1) < 0.35; if (Math.abs(t % 1) < 1 / 48) cloudy = sc.nights && r() < 0.3; if (!night || cloudy) continue; out.push([t, flux(t, sys) + sc.ppm * 1e-6 * sys.noise * r.gauss()]); }
  return out;
}
const rvObs = (sys, days, n, prec, r) => Array.from({ length: n }, () => { const t = r() * days; return [t, rv(t, sys) + prec * r.gauss()]; }).sort((a, b) => a[0] - b[0]);
// box search (BLS-like): for each trial period, fold the data and find the deepest dip; returns the best period and the spectrum
function boxSearch(data, Pmin, Pmax) {
  const spec = []; let best = { P: 0, s: 0 }, mean = K.mean(data.map(q => q[1]));
  for (let lp = Math.log(Pmin); lp <= Math.log(Pmax); lp += 0.002) { const P = Math.exp(lp), nb = 60, sum = new Float64Array(nb), cnt = new Float64Array(nb);
    for (const [t, f] of data) { const b = Math.floor(((t / P) % 1) * nb); sum[b] += f - mean; cnt[b]++; }
    let s = 0; for (let b = 0; b < nb; b++) if (cnt[b] > 2) { const d = -sum[b] / cnt[b] * Math.sqrt(cnt[b]); if (d > s) s = d; } spec.push([P, s]); if (s > best.s) best = { P, s }; }
  return { best, spec };
}
function foldDepth(data, P) { const nb = 80, sum = new Float64Array(nb), cnt = new Float64Array(nb); for (const [t, f] of data) { const b = Math.floor(((t / P) % 1) * nb); sum[b] += f; cnt[b]++; } const m = []; for (let b = 0; b < nb; b++) if (cnt[b]) m.push(sum[b] / cnt[b]); const med = m.slice().sort((a, b) => a - b)[Math.floor(m.length / 2)]; return { depth: med - Math.min(...m), bins: Array.from(sum, (s, b) => [(b + 0.5) / nb, cnt[b] ? s / cnt[b] : NaN]) }; }

// ---------------- The page ----------------
const PRESETS = {
  hotj: { star: "sun", scope: "ground", inc: 90, planets: [{ on: true, R: 11, M: 300, P: 3.5 }, { on: false, R: 2, M: 6, P: 12 }, { on: false, R: 1, M: 1, P: 40 }] },
  earth: { star: "sun", scope: "kepler", inc: 90, planets: [{ on: true, R: 1, M: 1, P: 365.25 }, { on: false, R: 2, M: 6, P: 12 }, { on: false, R: 1, M: 1, P: 40 }] },
  reddw: { star: "red", scope: "tess", inc: 90, planets: [{ on: true, R: 1, M: 1, P: 12 }, { on: false, R: 2, M: 6, P: 4 }, { on: false, R: 1, M: 1, P: 25 }] },
  trap: { star: "trap", scope: "tess", inc: 90, planets: [{ on: true, R: 1.1, M: 1.4, P: 1.5 }, { on: true, R: 0.9, M: 0.7, P: 4.05 }, { on: true, R: 0.9, M: 0.8, P: 6.1 }] }
};
const P = { star: "sun", scope: "ground", inc: 90, noise: 1, days: 30, nrv: 30, prec: 3, planets: PRESETS.hotj.planets.map(p => Object.assign({}, p)), trialP: 3.5, chartB: "fold" };
let rnd = K.rng(Date.now() % 99991 + 67), sys = null, data = [], rvd = [], t = 0, speed = 2, search = null;
const ui = K.app({
  title: "Exoplanet Hunting", subject: "Astrophysics",
  blurb: "Find planets round other stars from the dips in their light and the wobble in their speed",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 8: the solar system, orbits and gravity, light from stars; plus how exoplanets are detected (transits, the Doppler effect), which is beyond the spec and introduced simply.", adv: "WJEC Eduqas A level Physics Component 1 (orbits and the wider universe: Kepler's third law, the Doppler shift Δλ/λ = v/c, radial velocity curves and the masses of exoplanets); transit photometry is beyond the spec." } },
  missions: [
    { title: "A hot Jupiter", q: "A Jupiter-sized planet orbits close to a Sun-like star every 3.5 days. Watch the light curve fill up. How deep is the dip? How big does that make the planet?", hint: "The dip is about 1%: the planet blocks (Rp ÷ Rs)² of the star's light. √0.01 = 0.1, so the planet's radius is a tenth of the star's: about Jupiter's size. Hot Jupiters were the first planets found because their dips are deep and frequent.", setup() { setPreset("hotj"); } },
    { title: "Fold the light curve", q: "Move the trial period slider until the dips line up in the folded graph. What is the period? Use the 'Search' button to check.", hint: "Folding stacks every orbit on top of each other: at the right period, every transit lands in the same place and the dip stands out, even when each one is buried in noise. At the wrong period the dips smear out. The box search tries thousands of periods and picks the one where the dip is deepest and clearest.", setup() { setPreset("hotj"); P.trialP = 2.9; ctl.trialP.set(2.9); } },
    { title: "An Earth round a red dwarf", q: "An Earth-sized planet orbits a small red dwarf every 12 days, observed by a TESS-like telescope. Can you find it? Why is it easier than an Earth round the Sun?", hint: "The red dwarf is a third the Sun's size, so the same planet blocks about 9 times more light (depth ∝ 1 ÷ Rs²). A 12-day orbit gives many transits to stack. And because red dwarfs are dim, a planet that close can still be in the habitable zone.", setup() { setPreset("reddw"); } },
    { title: "Tilted orbits", q: "Tilt the orbit away from edge-on (inclination below 90°). When do the transits disappear? Does the wobble disappear too?", hint: "A transit happens only if the planet passes between us and the star: for a hot Jupiter the orbit must be within a few degrees of edge-on. Most planetary systems are tilted the wrong way, so we miss their transits. The radial velocity wobble remains (reduced by sin i), which is why both methods are used.", setup() { setPreset("hotj"); P.inc = 84; ctl.inc.set(84); rebuild(); } },
    { title: "The habitable zone", q: "Look at the top view. Which planets are in the green habitable zone, where water could be liquid? How does the zone change for a red dwarf or an A star?", hint: "The habitable zone is where a planet gets about as much starlight as the Earth. A brighter star has a zone further out (distance ∝ √L); a dim red dwarf's zone is very close in. TRAPPIST-1 has several Earth-sized planets, some in its habitable zone, all closer than Mercury is to the Sun.", setup() { setPreset("trap"); } },
    { lvl: "adv", title: "Weighing a planet", q: "Show the radial velocities for the hot Jupiter. Measure the amplitude K. How does it give the planet's mass?", hint: "K ≈ 28.4 m/s × (Mp ÷ Jupiter) × (M★ ÷ Sun)^−2/3 × (P ÷ 1 year)^−1/3 (sin i = 1). About 140 m/s here: about 1 Jupiter mass. With the radius from the transit, mass and radius give the density: rocky, icy or gas.", setup() { setPreset("hotj"); P.chartB = "rv"; ctl.chartB.set("rv"); } },
    { lvl: "adv", title: "Kepler's third law", q: "For each planet, use the period to work out the orbit size with a³ = M P² (a in AU, P in years, M in solar masses). Compare with the readout.", hint: "For a 3.5-day orbit round a Sun-like star: P = 0.00958 years, so a = (1 × 0.00958²)^(1/3) = 0.045 AU, ten times closer than Mercury. Kepler's law comes from gravity providing the centripetal force: GM/a² = 4π²a/P²." }
  ],
  batch: [
    { title: "Transit depth and planet size", question: "How does the depth of the transit depend on the planet's radius?", how: "Planets of 1 to 12 Earth radii round a Sun-like star; depth measured from the folded light curve of 60 days of TESS-like data. Theory: depth = (Rp ÷ Rs)².", xLabel: "planet radius (Earth radii)", yLabel: "depth (%)", xs: [2, 4, 6, 8, 10, 12], reps: 3, yMin: 0, theory: Rp => 100 * depthOf(Rp, 1), theoryLabel: "(Rp ÷ Rs)²", run: (x, r) => { const s = { star: STARS.sun, scope: "tess", noise: 1, inc: 90, planets: [{ on: true, R: x, M: 10, P: 5, t0: r() * 5 }] }; return 100 * foldDepth(observe(s, 60, r), 5).depth; }, note: "Depth grows as the square of the radius: twice the size, four times the dip. A Jupiter blocks 1% of a Sun-like star, an Earth only 0.008%." },
    { title: "Stacking transits", question: "How clearly does a small planet show up as more transits are stacked?", how: "A 2.5 Earth-radius planet with a 5-day period round a Sun-like star, TESS-like noise; observing for 5 to 150 days. Signal-to-noise = depth ÷ (noise ÷ √points in transit). Theory: grows as √(number of transits).", xLabel: "days observed", yLabel: "signal-to-noise ratio", xs: [5, 10, 20, 40, 80, 150], reps: 4, yMin: 0, theory: d => { const dep = depthOf(2.5, 1), dur = 5 / Math.PI * Math.asin(RSUN_AU / aAU(5, 1)), nIn = d / 5 * dur * 48 * 0.85; return dep / (400e-6 / Math.sqrt(nIn)); }, theoryLabel: "∝ √transits", run: (x, r) => { const s = { star: STARS.sun, scope: "tess", noise: 1, inc: 90, planets: [{ on: true, R: 2.5, M: 8, P: 5, t0: 1.3 }] }, d = observe(s, x, r), fd = foldDepth(d, 5), dur = 5 / Math.PI * Math.asin(RSUN_AU / aAU(5, 1)), nIn = d.length * dur / 5; return fd.depth / (400e-6 / Math.sqrt(Math.max(1, nIn))); }, note: "Four times as many transits doubles the signal-to-noise ratio. Small planets need long observations: Kepler watched one patch of sky for four years." },
    { lvl: "adv", title: "Radial velocity and planet mass", question: "How does the star's wobble (K) depend on the planet's mass?", how: "Planets of 0.1 to 3 Jupiter masses, 3.5-day orbit round a Sun-like star; K from a sine fit to 30 velocities with ±5 m/s precision. Theory: K = 28.4 m/s × Mp(Jupiter) × P(years)^−1/3.", xLabel: "planet mass (Jupiter masses)", yLabel: "K (m/s)", xs: [0.1, 0.25, 0.5, 1, 1.5, 2, 3], reps: 3, yMin: 0, fit: true, theory: m => rvK(m * MJ_ME, 3.5, 1, 90), theoryLabel: "theory", run: (x, r) => { const s = { star: STARS.sun, inc: 90, planets: [{ on: true, R: 11, M: x * MJ_ME, P: 3.5, t0: 0.7 }] }, d = rvObs(s, 30, 30, 5, r); let sa = 0, ca = 0, ss = 0, cc = 0, sc = 0; for (const [t2, v] of d) { const s1 = Math.sin(2 * Math.PI * (t2 - 0.7) / 3.5), c1 = Math.cos(2 * Math.PI * (t2 - 0.7) / 3.5); sa += v * s1; ca += v * c1; ss += s1 * s1; cc += c1 * c1; sc += s1 * c1; } const det = ss * cc - sc * sc, A = (sa * cc - ca * sc) / det, B = (ca * ss - sa * sc) / det; return Math.hypot(A, B); }, note: "A straight line: K is proportional to the planet's mass. Earth makes the Sun wobble at only 9 cm/s, which is why Earth twins are so hard to weigh." },
    { title: "How many orbits are lined up?", question: "If orbits are tilted at random, what fraction of planets transit, at different distances from the star?", how: "1000 planets with random tilts, round a Sun-like star; the fraction that transit. Theory: about Rs ÷ a.", xLabel: "orbit size (AU)", yLabel: "share that transit (%)", xs: [0.03, 0.05, 0.1, 0.2, 0.5, 1], reps: 3, yMin: 0, theory: a => 100 * RSUN_AU / a, theoryLabel: "Rs ÷ a", run: (x, r) => { let n = 0; for (let k = 0; k < 1000; k++) { const ci = r(); if (x * ci < RSUN_AU) n++; } return 100 * n / 1000; }, note: "About 10% of hot Jupiters transit, but only 0.5% of Earth-like orbits: for every Earth twin that transits, about 200 do not." },
    { title: "Kepler's third law", question: "How does the orbital period depend on the orbit size for planets round a Sun-like star?", how: "Orbits from 0.05 to 2 AU; period measured with a ±0.5% timing error. Theory: P = √(a³ ÷ M) years.", xLabel: "orbit size (AU)", yLabel: "period (days)", xs: [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2], reps: 3, yMin: 0, theory: a => 365.25 * Math.sqrt(a ** 3), theoryLabel: "a³ = P²", run: (x, r) => 365.25 * Math.sqrt(x ** 3) * (1 + 0.005 * r.gauss()), note: "P² ∝ a³: an orbit four times larger takes eight times longer." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 8.3", text: "Planets orbit stars because of gravity; the further out, the slower the orbit and the longer the period." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Transit method: a planet crossing its star blocks a fraction (Rp ÷ Rs)² of the light, once every orbit. Only planets whose orbits are almost edge-on can be found this way." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Radial velocity (Doppler wobble): the star moves towards and away from us; its spectral lines shift blue then red once per orbit. A heavier, closer planet gives a bigger shift." },
      { lvl: "beyond", tag: "Beyond the spec", text: "The habitable zone is the range of distances where a planet could have liquid water: closer to dim stars, further from bright ones." },
      { lvl: "adv", tag: "Eduqas", text: "Kepler's third law: T² ∝ r³ (T² = 4π² r³ ÷ GM). With the period and the star's mass it gives the orbit radius." },
      { lvl: "adv", tag: "Eduqas", text: "Doppler: Δλ ÷ λ = v ÷ c. The radial velocity amplitude gives the planet's mass (times sin i); with the transit radius, its density." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A planet blocks 1% of its star's light. The star's radius is 700 000 km. Estimate the planet's radius.", ans: "<ul><li>(Rp ÷ Rs)² = 0.01, so Rp ÷ Rs = 0.1</li><li>Rp = 70 000 km (about Jupiter's size)</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why most planets cannot be found by the transit method.", ans: "<ul><li>the planet must pass between us and the star</li><li>most orbits are tilted, so the planet never crosses the star as seen from Earth</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const pl = P.planets[0], st = STARS[P.star]; return `A planet orbits a star of ${st.M} solar masses every ${pl.P} days. Use Kepler's third law (a³ = M P², a in AU, P in years) to find the orbit radius.`; }, ans: () => { const pl = P.planets[0], st = STARS[P.star], Py = pl.P / 365.25; return `<ul><li>P = ${pl.P} ÷ 365.25 = ${Py.toPrecision(3)} years</li><li>a³ = ${st.M} × ${Py.toPrecision(3)}² = ${(st.M * Py * Py).toPrecision(3)}</li><li>a = ${aAU(pl.P, st.M).toPrecision(3)} AU</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "A star's spectral line at 656.28 nm shifts by ±0.0003 nm over each orbit. Calculate the star's radial velocity amplitude.", ans: "<ul><li>v = c Δλ ÷ λ</li><li>= 3.0 × 10⁸ × 0.0003 ÷ 656.28</li><li>= 137 m/s</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Orbits</b>: circular, with the size from Kepler's third law. All planets share one inclination.</li>
<li><b>Transits</b>: a planet transits if a cos i is less than the star's radius. Depth = (Rp ÷ Rs)²; duration ≈ (P ÷ π) × arcsin(Rs ÷ a); the edges slope over 12% of the transit (no limb darkening).</li>
<li><b>Light curve</b>: a point every 30 minutes, with random noise of 2500 (ground), 400 (TESS-like) or 60 (Kepler-like) parts per million; the ground telescope only sees at night and loses 30% of nights to cloud.</li>
<li><b>Radial velocity</b>: K = 28.43 m/s × (Mp ÷ Jupiter) × sin i × (M★ ÷ Sun)^−2/3 × (P ÷ year)^−1/3, measured on random nights with the chosen precision.</li>
<li><b>Searching</b>: the box search folds the data at trial periods (in small logarithmic steps) and scores the deepest bin by its depth × √(points in it).</li>
<li><b>Habitable zone</b>: 0.95 to 1.67 AU × √(L ÷ L☉); equilibrium temperature with albedo 0.3.</li></ul>
<h3>Simplifications</h3>
<ul><li>No star spots, flares, limb darkening or eccentric orbits; the earlier version had spots and flares, and a 'find the next planet' tool.</li>
<li>Planets do not tug on each other (no transit-timing variations).</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/exoplanet-hunting.html">original/exoplanet-hunting.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, pctl = [];
let g = ui.group("The star and the telescope");
ctl.preset = K.seg(g, { label: "Start from", value: "hotj", options: [["hotj", "Hot Jupiter"], ["earth", "Earth round the Sun"], ["reddw", "Earth round a red dwarf"], ["trap", "TRAPPIST-1-like"]], on: v => setPreset(v) });
ctl.star = K.seg(g, { label: "Star", value: "sun", options: Object.entries(STARS).map(([k, s]) => [k, s.name.split(" (")[0]]), on: v => { P.star = v; rebuild(); } });
ctl.scope = K.seg(g, { label: "Telescope", value: "ground", options: Object.entries(SCOPES).map(([k, s]) => [k, s.name]), on: v => { P.scope = v; rebuild(); } });
ctl.days = K.slider(g, { label: "Observing for", min: 5, max: 400, step: 5, value: 30, unit: "days", on: v => { P.days = v; rebuild(); } });
ctl.inc = K.slider(g, { label: "Orbit tilt (90° = edge-on)", min: 80, max: 90, step: 0.1, value: 90, unit: "°", on: v => { P.inc = v; rebuild(); } });
g = ui.group("Planets");
for (let i = 0; i < 3; i++) {
  const box = K.$("div"); box.style.cssText = "border-left:3px solid " + ["#ffd166", "#6fb1ff", "#c58cff"][i] + ";padding-left:8px;margin-bottom:8px"; g.append(box);
  const c = {}; c.on = K.toggle(box, { label: "Planet " + "bcd"[i], value: P.planets[i].on, on: v => { P.planets[i].on = v; rebuild(); } });
  c.R = K.slider(box, { label: "Radius", min: 0.5, max: 15, step: 0.1, value: P.planets[i].R, fmt: v => v + " × Earth", on: v => { P.planets[i].R = v; rebuild(); } });
  c.M = K.slider(box, { label: "Mass", min: 0.5, max: 1000, step: 0.5, value: P.planets[i].M, fmt: v => v + " × Earth", on: v => { P.planets[i].M = v; rebuild(); } });
  c.P = K.slider(box, { label: "Period", min: 0.5, max: 400, step: 0.05, value: P.planets[i].P, unit: "days", on: v => { P.planets[i].P = v; rebuild(); } });
  pctl.push(c);
}
g = ui.group("Analyse");
ctl.trialP = K.slider(g, { label: "Trial period for folding", min: 0.5, max: 400, step: 0.01, value: 3.5, unit: "days", on: v => { P.trialP = v; } });
let rb = K.row(g); K.btn(rb, "÷ 2", () => { P.trialP /= 2; ctl.trialP.set(P.trialP); }, "small"); K.btn(rb, "× 2", () => { P.trialP *= 2; ctl.trialP.set(P.trialP); }, "small"); K.btn(rb, "🔍 Search for transits", () => { search = boxSearch(data, 0.5, Math.max(1, Math.min(P.days / 2, 400))); P.trialP = +search.best.P.toFixed(3); ctl.trialP.set(P.trialP); P.chartB = "spec"; ctl.chartB.set("spec"); }, "primary");
ctl.chartB = K.seg(g, { label: "Right-hand graph", value: "fold", options: [["fold", "Folded light curve"], ["rv", "Radial velocity"], ["spec", "Search results"]], on: v => P.chartB = v });
ctl.noise = K.slider(g, { label: "Noise", min: 0.2, max: 3, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => { P.noise = v; rebuild(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 30, step: 0.5, value: 2, fmt: v => v + " days a second", on: v => speed = v });
const read = K.readout(g, [["depth", "dip depth (folded)"], ["rad", "planet radius from depth"], ["a", "orbit size (Kepler)"], ["T", "temperature"], ["K", "wobble K"], ["mass", "mass from K"]]);
function rebuild() {
  const st = STARS[P.star]; sys = { star: st, scope: P.scope, noise: P.noise, inc: P.inc, planets: P.planets.map((p, i) => Object.assign({}, p, { t0: 0.37 * p.P + i * 0.11 })) };
  const r = K.rng(1234); data = observe(sys, P.days, r); rvd = rvObs(sys, P.days, P.nrv, P.prec, r); t = 0; search = null;
}
function setPreset(k) { const pr = PRESETS[k]; Object.assign(P, { star: pr.star, scope: pr.scope, inc: pr.inc, noise: 1, chartB: "fold", planets: pr.planets.map(p => Object.assign({}, p)), days: k === "earth" ? 400 : k === "trap" ? 20 : 30 }); P.trialP = P.planets.find(p => p.on).P; syncCtl(); rebuild(); speed = k === "earth" ? 30 : 2; ctl.speed.set(speed); ctl.preset.set(k); }
function syncCtl() { ctl.star.set(P.star); ctl.scope.set(P.scope); ctl.inc.set(P.inc); ctl.days.set(P.days); ctl.noise.set(P.noise); ctl.trialP.set(P.trialP); ctl.chartB.set(P.chartB); P.planets.forEach((p, i) => { pctl[i].on.set(p.on); pctl[i].R.set(p.R); pctl[i].M.set(p.M); pctl[i].P.set(p.P); }); }
function set() { setPreset("hotj"); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Light curve: brightness against time", xLabel: "days", yLabel: "relative brightness" }), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const PCOL = ["#ffd166", "#6fb1ff", "#c58cff"];
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, st = sys.star; c.fillStyle = "#04060c"; c.fillRect(0, 0, w, h);
  // left: the star seen from Earth, with planets crossing its face (sizes to scale with the star)
  const cx = w * 0.25, cy = h * 0.48, Rs = Math.min(w * 0.18, h * 0.32), vr = rv(t, sys), shift = K.clamp(vr / 150, -1, 1);
  const gr = c.createRadialGradient(cx, cy, Rs * 0.1, cx, cy, Rs); gr.addColorStop(0, "#fff"); gr.addColorStop(1, st.T > 7000 ? "#bcd4ff" : st.T > 5000 ? "#ffe9b0" : st.T > 3000 ? "#ffb070" : "#ff7a50"); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, Rs, 0, 6.3); c.fill();
  c.fillStyle = shift > 0 ? `rgba(255,60,60,${0.25 * shift})` : `rgba(60,120,255,${-0.25 * shift})`; c.beginPath(); c.arc(cx, cy, Rs, 0, 6.3); c.fill();
  sys.planets.forEach((pl, i) => { if (!pl.on) return; const a = aAU(pl.P, st.M), ph = 2 * Math.PI * ((t - pl.t0) / pl.P), aR = a / (st.R * RSUN_AU), x = Math.sin(ph) * aR, z = Math.cos(ph), y = aR * Math.cos(sys.inc * Math.PI / 180) * Math.cos(ph); if (z < 0 || Math.abs(x) > 3) return; c.fillStyle = "#000"; c.beginPath(); c.arc(cx + x * Rs, cy + y * Rs, Math.max(1.5, pl.R * REARTH_RSUN / st.R * Rs), 0, 6.3); c.fill(); c.strokeStyle = PCOL[i]; c.lineWidth = 1; c.stroke(); });
  T(c, `${st.name} seen from Earth`, cx, cy + Rs + 24, "#eef2f8", "center", "600 12.5px"); T(c, vr > 1 ? "moving away: light red-shifted" : vr < -1 ? "moving towards us: blue-shifted" : "", cx, cy + Rs + 42, "#aab6cc", "center", "11.5px");
  // right: top view with the habitable zone
  const ox = w * 0.72, oy = h * 0.48, maxA = Math.max(...sys.planets.filter(p => p.on).map(p => aAU(p.P, st.M)), 0.01) * 1.3, sc = Math.min(w * 0.25, h * 0.4) / maxA, [h1, h2] = hz(st);
  const edge = Math.min(w * 0.25, h * 0.4); c.save(); c.beginPath(); c.rect(ox - edge - 4, oy - edge - 4, 2 * edge + 8, 2 * edge + 8); c.clip(); c.fillStyle = "rgba(127,227,160,0.15)"; c.beginPath(); c.arc(ox, oy, h2 * sc, 0, 6.3); c.moveTo(ox + h1 * sc, oy); c.arc(ox, oy, h1 * sc, 0, 6.3, true); c.fill(); c.restore();
  T(c, h1 * sc > edge ? `habitable zone: further out (${h1.toPrecision(2)}–${h2.toPrecision(2)} AU)` : "green: habitable zone", ox, oy + edge + 36, "#7fe3a0", "center", "11px");
  c.fillStyle = "#ffd166"; c.beginPath(); c.arc(ox, oy, 5, 0, 6.3); c.fill();
  sys.planets.forEach((pl, i) => { if (!pl.on) return; const a = aAU(pl.P, st.M) * sc, ph = 2 * Math.PI * (t - pl.t0) / pl.P; c.strokeStyle = "rgba(255,255,255,0.2)"; c.beginPath(); c.arc(ox, oy, a, 0, 6.3); c.stroke(); c.fillStyle = PCOL[i]; c.beginPath(); c.arc(ox + a * Math.sin(ph), oy + a * Math.cos(ph), 5, 0, 6.3); c.fill(); });
  T(c, "↓ to Earth", ox, oy + Math.min(w * 0.25, h * 0.4) + 18, "#aab6cc", "center", "11px"); T(c, `top view (scale: ${maxA.toPrecision(2)} AU to the edge)`, ox, 30, "#aab6cc", "center", "11.5px");
  T(c, `day ${t.toFixed(1)} of ${P.days}`, 20, 30, "#eef2f8", "left", "600 14px");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; t = Math.min(P.days, t + dt * speed); }, () => {
  draw(); if (frame++ % 6) return;
  const seen = data.filter(q => q[0] <= t), sc = SCOPES[P.scope], st = sys.star;
  chA.draw([{ pts: seen.length > 3000 ? seen.filter((q, i) => i % Math.ceil(seen.length / 3000) === 0) : seen, type: "dots", r: 1.5, color: "#aab6cc", label: sc.name }], { xMin: 0, xMax: P.days });
  const fd = foldDepth(seen, P.trialP), fit = K.linfit(rvd.filter(q => q[0] <= t).map(q => [Math.sin(2 * Math.PI * (q[0] - sys.planets[0].t0) / sys.planets[0].P), q[1]]).concat([[0, 0]]));
  if (P.chartB === "fold") { chB.opts.title = `Folded at ${P.trialP} days`; chB.opts.xLabel = "phase (fraction of an orbit)"; chB.opts.yLabel = "relative brightness"; chB.draw([{ pts: seen.map(q => [((q[0] / P.trialP) % 1), q[1]]), type: "dots", r: 1.2, color: "rgba(170,182,204,0.5)", label: "every point" }, { pts: fd.bins.filter(b => isFinite(b[1])), color: "#ffd166", width: 2.4, label: "average in each bin" }], { xMin: 0, xMax: 1 }); }
  else if (P.chartB === "rv") { const R = rvd.filter(q => q[0] <= t), pl = sys.planets[0]; chB.opts.title = "Radial velocity (folded at planet b's period)"; chB.opts.xLabel = "phase"; chB.opts.yLabel = "velocity (m/s)"; const curve = []; for (let ph = 0; ph <= 1; ph += 0.01) curve.push([ph, rv(pl.t0 + ph * pl.P, sys)]); chB.draw([{ pts: curve, color: "#7d8aa5", dash: [5, 4], label: "true" }, { pts: R.map(q => [(((q[0] - pl.t0) / pl.P) % 1 + 1) % 1, q[1]]), type: "dots", r: 4, color: "#ff8a70", label: `measured (±${P.prec} m/s)` }], { xMin: 0, xMax: 1 }); }
  else { chB.opts.title = "Box search: how strong a dip at each period"; chB.opts.xLabel = "trial period (days)"; chB.opts.yLabel = "signal"; chB.draw(search ? [{ pts: search.spec, color: "#7fe3a0", label: "signal" }] : [], search ? { vlines: [{ x: search.best.P, color: "#ffd166", label: `best ${search.best.P.toFixed(3)} d` }] } : {}); }
  const pl = sys.planets.find(p => p.on) || sys.planets[0], a = aAU(P.trialP, st.M), Rp = Math.sqrt(Math.max(0, fd.depth)) * st.R / REARTH_RSUN, Kfit = Math.abs(fit.m), Mest = Kfit / 28.43 * MJ_ME * Math.pow(st.M, 2 / 3) * Math.pow(P.trialP / 365.25, 1 / 3), tq = teq(st, a);
  read.set("depth", (100 * fd.depth).toFixed(3) + "%"); read.set("rad", Rp.toFixed(1) + " × Earth"); read.set("a", a.toPrecision(3) + " AU"); read.set("T", Math.round(tq - 273) + " °C" + (a > hz(st)[0] && a < hz(st)[1] ? " (habitable zone)" : ""));
  read.set("K", ui.level === "adv" ? Kfit.toFixed(1) + " m/s" : "A level"); read.set("mass", ui.level === "adv" ? Mest.toFixed(1) + " × Earth" : "A level");
  ui.hud(`${seen.length} measurements${sys.planets.some(p => p.on && !transits(p, st, P.inc)) ? '<br><b style="color:#ff8a70">some orbits do not transit</b>' : ""}`);
  ctl.chartB.el.querySelectorAll("button")[1].style.display = ui.level === "adv" ? "" : "none";
});
set();
ui.tip("Data arrive as the days pass · fold the light curve at the right period to stack the dips", 7000);
