/* =====================================================================
   DARK MATTER AND GALAXY ROTATION CURVES
   A star orbiting a galaxy moves at the speed that gravity from the mass
   INSIDE its orbit requires:     v² = G M(<r) ÷ r
   Most of the visible mass (stars and gas) is near the centre. So, if
   that were all, stars far out should move more slowly the further out
   they are (like planets: v ∝ 1/√r, "Keplerian"). But measured rotation
   curves stay FLAT out to large distances. So there must be extra mass we
   cannot see, spread out far beyond the stars: a DARK MATTER HALO.
   (An alternative idea, MOND, changes the law of gravity instead.)
   The model adds up the pull of each part of the galaxy:
     v² = v²(bulge) + v²(star disc) + v²(gas) + v²(black hole) + v²(halo)
   Units: kpc, km/s and solar masses; G = 4.30 × 10⁻⁶ kpc (km/s)² per M☉.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const G = 4.30e-6, RHOC = 136, A0 = 3700;                                         // G; critical density (M☉ per kpc³, h = 0.7); MOND a₀ = 1.2 × 10⁻¹⁰ m/s² in (km/s)² per kpc
// modified Bessel functions (Abramowitz & Stegun polynomial approximations)
function I0(x) { const t = x / 3.75; if (x < 3.75) { const y = t * t; return 1 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492 + y * (0.2659732 + y * (0.0360768 + y * 0.0045813))))); } const y = 1 / t; return Math.exp(x) / Math.sqrt(x) * (0.39894228 + y * (0.01328592 + y * (0.00225319 + y * (-0.00157565 + y * (0.00916281 + y * (-0.02057706 + y * (0.02635537 + y * (-0.01647633 + y * 0.00392377)))))))); }
function I1(x) { const t = x / 3.75; if (x < 3.75) { const y = t * t; return x * (0.5 + y * (0.87890594 + y * (0.51498869 + y * (0.15084934 + y * (0.02658733 + y * (0.00301532 + y * 0.00032411)))))); } const y = 1 / t; return Math.exp(x) / Math.sqrt(x) * (0.39894228 + y * (-0.03988024 + y * (-0.00362018 + y * (0.00163801 + y * (-0.01031555 + y * (0.02282967 + y * (-0.02895312 + y * (0.01787654 - y * 0.00420059)))))))); }
function K0(x) { if (x <= 2) { const y = x * x / 4; return -Math.log(x / 2) * I0(x) + (-0.57721566 + y * (0.42278420 + y * (0.23069756 + y * (0.03488590 + y * (0.00262698 + y * (0.00010750 + y * 0.0000074)))))); } const y = 2 / x; return Math.exp(-x) / Math.sqrt(x) * (1.25331414 + y * (-0.07832358 + y * (0.02189568 + y * (-0.01062446 + y * (0.00587872 + y * (-0.00251540 + y * 0.00053208)))))); }
function K1(x) { if (x <= 2) { const y = x * x / 4; return Math.log(x / 2) * I1(x) + (1 / x) * (1 + y * (0.15443144 + y * (-0.67278579 + y * (-0.18156897 + y * (-0.01919402 + y * (-0.00110404 - y * 0.00004686)))))); } const y = 2 / x; return Math.exp(-x) / Math.sqrt(x) * (1.25331414 + y * (0.23498619 + y * (-0.03655620 + y * (0.01504268 + y * (-0.00780353 + y * (0.00325614 - y * 0.00068245)))))); }
// speed² (km/s)² at radius r (kpc) from each part
const vBulge = (r, M, a) => G * M * r / ((r + a) * (r + a));                       // Hernquist: M(<r) = M r² ÷ (r + a)²
function vDisc(r, M, Rd) { if (M <= 0 || r <= 0) return 0; const y = Math.min(r / (2 * Rd), 30), S0 = M / (2 * Math.PI * Rd * Rd); return Math.max(0, 4 * Math.PI * G * S0 * Rd * y * y * (I0(y) * K0(y) - I1(y) * K1(y))); }   // Freeman (1970) exponential disc
const vBH = (r, M) => G * M / r;
const r200Of = M => Math.cbrt(3 * M / (4 * Math.PI * 200 * RHOC));
function haloMass(r, h) { if (!h.on || h.M <= 0) return 0; const r2 = r200Of(h.M), x = r / h.rs, c = r2 / h.rs; if (h.shape === "nfw") { const f = z => Math.log(1 + z) - z / (1 + z); return h.M * f(x) / f(c); } const f = z => z - Math.atan(z); return h.M * f(x) / f(c); }
function parts(r, g) { return { bulge: vBulge(r, g.bM, g.ba), disc: vDisc(r, g.dM, g.dR), gas: vDisc(r, g.gM, g.gR), bh: vBH(r, g.bh), halo: G * haloMass(r, g.halo) / r }; }
function vVisible2(r, g) { const p = parts(r, g); return p.bulge + p.disc + p.gas + p.bh; }
function vModel(r, g) { const p = parts(r, g), vis = p.bulge + p.disc + p.gas + p.bh; if (g.mond) { const gN = vis / r, gg = gN * (0.5 + Math.sqrt(0.25 + A0 / Math.max(gN, 1e-9))); return Math.sqrt(gg * r); } return Math.sqrt(vis + p.halo); }
const massInside = (r, g) => vModel(r, g) ** 2 * r / G, visMassInside = (r, g) => vVisible2(r, g) * r / G;
// galaxies: approximate re-creations of published curves, for teaching. b: bulge, d: star disc, g: gas disc, h: halo
const GAL = {
  mw: { name: "Milky Way", bM: 1e10, ba: 0.6, dM: 5e10, dR: 2.6, gM: 1e10, gR: 5, bh: 4e6, halo: { on: true, shape: "nfw", M: 1.2e12, rs: 20 }, rmax: 30, n: 22, err: 8 },
  m31: { name: "Andromeda (M31)", bM: 3e10, ba: 1.0, dM: 7e10, dR: 5.3, gM: 6e9, gR: 9, bh: 1.4e8, halo: { on: true, shape: "nfw", M: 1.3e12, rs: 22 }, rmax: 35, n: 22, err: 10 },
  n3198: { name: "NGC 3198", bM: 0, ba: 0.5, dM: 2.5e10, dR: 3.2, gM: 1.2e10, gR: 8, bh: 0, halo: { on: true, shape: "iso", M: 9e11, rs: 7 }, rmax: 40, n: 25, err: 5 },
  ddo: { name: "Dwarf galaxy DDO 154", bM: 0, ba: 0.3, dM: 3e7, dR: 0.8, gM: 3.5e8, gR: 2.2, bh: 0, halo: { on: true, shape: "iso", M: 4e10, rs: 3 }, rmax: 8, n: 16, err: 3 },
  mystery: { name: "Mystery galaxy", bM: 5e9, ba: 0.5, dM: 4e10, dR: 3, gM: 8e9, gR: 6, bh: 0, halo: { on: true, shape: "nfw", M: 8e11, rs: 18 }, rmax: 30, n: 20, err: 8 }
};
function observe(g, r, n, err, rmax) { const out = []; for (let i = 1; i <= n; i++) { const x = rmax * i / n, v = vModel(x, g); out.push([x, v + err * r.gauss(), err]); } return out; }
function chi2(data, g) { let s = 0; for (const [x, v, e] of data) s += ((v - vModel(x, g)) / e) ** 2; return s; }
// best halo mass by golden-section search on χ² (log mass)
function fitHalo(data, g, fitRs) {
  const clone = (M, rs) => Object.assign({}, g, { halo: Object.assign({}, g.halo, { on: true, M, rs: rs ?? g.halo.rs }) });
  const best = (rs) => { let a = 9, b = 13.5; const f = lm => chi2(data, clone(Math.pow(10, lm), rs)); for (let k = 0; k < 60; k++) { const m1 = b - (b - a) * 0.618, m2 = a + (b - a) * 0.618; if (f(m1) < f(m2)) b = m2; else a = m1; } const lm = (a + b) / 2; return { M: Math.pow(10, lm), c2: f(lm), rs }; };
  if (!fitRs) return best(g.halo.rs);
  let top = null; for (let rs = 1; rs <= 40; rs *= 1.15) { const b = best(rs); if (!top || b.c2 < top.c2) top = b; } return top;
}

// ---------------- The page ----------------
const P = { gal: "mw", motion: "model", mond: false, fitRs: false };
let rnd = K.rng(Date.now() % 99991 + 47), speed = 1, Gx = JSON.parse(JSON.stringify(GAL.mw)), data = [], stars = [], t = 0, hidden = null, revealed = false;
const ui = K.app({
  title: "Dark Matter and Rotation Curves", subject: "Astrophysics",
  blurb: "Why flat rotation curves mean galaxies are wrapped in invisible dark matter",
  reset: () => set({ gal: P.gal }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE physics: gravity and orbits (the further out, the slower the orbit in the Solar System), the Doppler effect and red-shift, galaxies; the evidence for dark matter (beyond most GCSE specifications).", adv: "A level physics: circular orbits v² = GM/r, Doppler shift Δλ/λ = v/c, the evidence for dark matter from galaxy rotation curves. Halo profiles (NFW), mass models and MOND are beyond the specifications." } },
  missions: [
    { title: "What should happen?", q: "Choose 'no dark matter'. How should the orbital speed change with distance from the centre? Compare with the measured points.", hint: "Without the halo, beyond the stars the speed falls (v ∝ 1/√r, like the planets). The measured speeds stay flat at about 220 km/s: the outer stars move far too fast for the visible mass alone.", setup() { set({ gal: "mw" }); Gx.halo.on = false; } },
    { title: "Stars would fly off", q: "Switch the star motion to 'observed speeds, visible gravity only'. What happens to the outer stars?", hint: "They fly away: at the measured speeds, the visible mass cannot hold them in orbit. Something unseen must provide the extra gravity: a dark matter halo.", setup() { set({ gal: "mw", motion: "flyoff" }); } },
    { title: "Add the halo", q: "Switch the dark halo back on. How much dark mass is inside the last data point, compared with the visible mass?", hint: "Several times more dark than visible inside 30 kpc, and the whole halo is about 5–10 times the visible mass (cosmologically, dark matter is about 5.3 times ordinary matter).", setup() { set({ gal: "mw" }); } },
    { title: "Vera Rubin's method", q: "Look at the edge-on view and the slit spectrum. How do astronomers measure the speeds?", hint: "One side of the galaxy comes towards us (blueshift), the other goes away (redshift). The shift of the hydrogen line, Δλ = λv/c, gives the speed at each point along the slit. Vera Rubin and Kent Ford did this for Andromeda in 1970.", setup() { set({ gal: "m31" }); } },
    { title: "A dwarf galaxy", q: "Look at the dwarf galaxy DDO 154. How much of its mass is dark?", hint: "Almost all of it: the stars and gas are a tiny part, and the curve keeps rising to the last point. Dwarf galaxies are among the most dark-matter dominated objects known.", setup() { set({ gal: "ddo" }); } },
    { title: "Weigh the mystery halo", q: "Use the halo mass slider (or 'fit the halo') to match the mystery galaxy's points. Then press Reveal.", hint: "The best fit is where χ² is smallest (about the number of points). Your answer should be within a few percent of the true halo mass.", setup() { set({ gal: "mystery" }); } },
    { lvl: "adv", title: "Mass from the speed", q: "Use M = v²r/G at the last data point to find the mass inside. Compare with the visible mass.", hint: "For the Milky Way at 30 kpc with v ≈ 220 km/s: M = 220² × 30 ÷ 4.3 × 10⁻⁶ ≈ 3.4 × 10¹¹ M☉, about 5 times the visible mass.", setup() { set({ gal: "mw" }); } },
    { lvl: "adv", title: "MOND instead", q: "Switch off the halo and switch on MOND. Can modified gravity explain the flat curve?", hint: "For a single galaxy, yes, quite well: MOND boosts gravity where accelerations are tiny. But it struggles with galaxy clusters, gravitational lensing and the cosmic microwave background, which is why most astronomers favour dark matter.", setup() { set({ gal: "n3198", mond: true }); Gx.halo.on = false; } }
  ],
  batch: [
    { title: "Which halo mass fits best?", question: "How does χ² change as the trial halo mass is varied around the true value?", how: "Milky Way model; 25 points with ±8 km/s errors (new noise each run); χ² for a trial halo of (ratio × true mass). Theory: about N + the misfit.", xLabel: "trial halo mass ÷ true", yLabel: "χ²", xs: [0.7, 0.8, 0.9, 0.95, 1, 1.05, 1.1, 1.2, 1.3], reps: 4, yMin: 0, run: (x, r) => { const g = GAL.mw, d = observe(g, r, 25, 8, 30); return chi2(d, Object.assign({}, g, { halo: Object.assign({}, g.halo, { M: g.halo.M * x }) })); }, note: "A valley with its lowest point at the true mass, where χ² ≈ 25 (the number of points). Its width shows how precisely the data pin the halo down." },
    { title: "How well can we weigh the halo?", question: "If many astronomers each measured 25 points and fitted the halo mass, how much would their answers vary?", how: "Milky Way; 25 points, ±8 km/s; best halo mass by least squares. True value 1.2 × 10¹² M☉.", yLabel: "fitted halo mass (× 10¹² M☉)", reps: 200, bins: 20, theory: 1.2, theoryLabel: "true", run: (x, r) => fitHalo(observe(GAL.mw, r, 25, 8, 30), GAL.mw, false).M / 1e12, note: "The fits cluster around the true value with a spread of a few percent: rotation curves weigh the halo well (inside the region they cover)." },
    { title: "More data points", question: "How does the precision of the fitted halo mass improve with more measured points?", how: "Milky Way; ±8 km/s; 5 to 80 points along 30 kpc; 15 fits each; error = |fitted − true| ÷ true.", xLabel: "number of points", yLabel: "error in the halo mass (%)", xs: [5, 10, 20, 40, 80], reps: 15, yMin: 0, theory: n => 4.6 * Math.sqrt(25 / n) * Math.sqrt(2 / Math.PI), theoryLabel: "∝ 1 ÷ √N", run: (x, r) => Math.abs(fitHalo(observe(GAL.mw, r, x, 8, 30), GAL.mw, false).M / GAL.mw.halo.M - 1) * 100, note: "Four times as many points roughly halve the error." },
    { title: "Visible mass against total mass", question: "For each galaxy, what fraction of the mass inside the last data point is visible?", how: "1 Milky Way, 2 Andromeda, 3 NGC 3198, 4 DDO 154. Visible = stars + gas + black hole; total from v²r/G with ±3% measurement error.", xLabel: "galaxy (1 Milky Way, 2 M31, 3 NGC 3198, 4 DDO 154)", yLabel: "visible ÷ total (%)", xs: [1, 2, 3, 4], reps: 5, yMin: 0, yMax: 100, run: (x, r) => { const g = GAL[["mw", "m31", "n3198", "ddo"][x - 1]]; return visMassInside(g.rmax, g) / (massInside(g.rmax, g) * (1 + 0.06 * r.gauss())) * 100; }, note: "Big spirals are about a quarter to a third visible inside their discs; the dwarf galaxy is almost all dark." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "In the Solar System, planets further from the Sun orbit more slowly, because the Sun's gravity is weaker there." },
      { lvl: "std", tag: "GCSE", text: "Stars in spiral galaxies far from the centre orbit about as fast as those nearer in (flat rotation curves). The visible matter cannot provide enough gravity: there must be extra, unseen 'dark matter'." },
      { lvl: "std", tag: "GCSE", text: "Speeds are measured with the Doppler effect: light from stars moving away is red-shifted, from those moving towards us blue-shifted." },
      { lvl: "adv", tag: "A level", text: "Circular orbit: GMm/r² = mv²/r, so v = √(GM/r) and M(<r) = v²r/G. Flat v means M(<r) ∝ r: mass keeps increasing with radius." },
      { lvl: "adv", tag: "A level", text: "Doppler: Δλ/λ = v/c. For Hα (656.3 nm) a speed of 200 km/s shifts it by 0.44 nm." },
      { lvl: "adv", tag: "beyond spec", text: "Dark matter makes up about 85% of the matter in the universe (5.3 times ordinary matter); other evidence: gravitational lensing, galaxy clusters, the CMB." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how the rotation curves of galaxies provide evidence for dark matter.", ans: "<ul><li>stars far from the centre orbit as fast as those closer in</li><li>the visible mass is not enough to provide the gravity needed at those speeds (they should be slower)</li><li>so there must be extra unseen mass: dark matter</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const r0 = Gx.rmax, v = vModel(r0, Gx); return `A star ${r0} kpc from the centre of ${Gx.name} orbits at ${v.toFixed(0)} km/s. Calculate the mass inside its orbit (G = 4.30 × 10⁻⁶ kpc (km/s)² M☉⁻¹).`; }, ans: () => { const r0 = Gx.rmax, v = vModel(r0, Gx); return `<ul><li>M = v²r ÷ G</li><li>= ${v.toFixed(0)}² × ${r0} ÷ 4.30 × 10⁻⁶</li><li>= ${(v * v * r0 / G).toExponential(2)} M☉</li></ul>`; } },
      { lvl: "adv", marks: 2, q: "The Hα line (656.3 nm) is observed at 656.74 nm on one side of a galaxy. Find the speed.", ans: "<ul><li>Δλ = 0.44 nm; v = c Δλ/λ</li><li>= 3 × 10⁸ × 0.44 ÷ 656.3 = 2.0 × 10⁵ m/s = 200 km/s (moving away)</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Speeds add as squares: v² = Σ v_i². Bulge: Hernquist, M(<r) = M r²/(r + a)². Star and gas discs: exponential, v² = 4πGΣ₀R_d y²[I₀K₀ − I₁K₁], y = R/2R_d (Freeman 1970). Black hole: GM/r.</li>
<li>Dark halo: NFW, M(<r) ∝ ln(1 + x) − x/(1 + x), or pseudo-isothermal, M(<r) ∝ x − arctan x, with x = r/r_s; the halo mass is the mass inside r₂₀₀ (200 × the critical density).</li>
<li>MOND ("simple" interpolation): g = g_N[½ + √(¼ + a₀/g_N)], a₀ = 1.2 × 10⁻¹⁰ m/s².</li>
<li>Data: synthetic points from a model of each galaxy with random errors (approximate re-creations of published curves, for teaching). χ² = Σ((v_obs − v_model)/σ)²; "fit the halo" minimises χ².</li>
<li>Animation: stars on circular orbits at the model speed (or the visible-only speed); in "fly off" mode they start at the observed speed and move under visible gravity only (leapfrog steps). 1× = 10 million years per second.</li></ul>
<h3>Left out</h3>
<ul><li>Warps, non-circular motions, the thickness of the disc, pressure support of the gas, and the real scatter of observed data.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/dark-matter.html">original/dark-matter.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Galaxy");
ctl.gal = K.seg(g, { value: "mw", options: Object.keys(GAL).map(k => [k, GAL[k].name]), on: v => set({ gal: v }) });
ctl.motion = K.seg(g, { label: "Star motion", value: "model", options: [["model", "model gravity"], ["visible", "visible gravity only"], ["flyoff", "observed speeds, visible gravity only"]], on: v => { P.motion = v; makeStars(); } });
g = ui.group("Mass model");
ctl.dM = K.slider(g, { label: "Star disc mass", min: 6, max: 11.5, step: 0.05, value: 10.7, fmt: v => sci(v), on: v => { Gx.dM = Math.pow(10, v); } });
ctl.bM = K.slider(g, { label: "Bulge mass", min: 6, max: 11, step: 0.05, value: 10, fmt: v => sci(v), on: v => { Gx.bM = Math.pow(10, v); } });
ctl.gM = K.slider(g, { label: "Gas mass", min: 6, max: 11, step: 0.05, value: 10, fmt: v => sci(v), on: v => { Gx.gM = Math.pow(10, v); } });
ctl.hon = K.toggle(g, { label: "Dark matter halo", value: true, on: v => { Gx.halo.on = v; } });
ctl.hM = K.slider(g, { label: "Halo mass (inside r₂₀₀)", min: 9, max: 13.5, step: 0.02, value: 12, fmt: v => sci(v), on: v => { Gx.halo.M = Math.pow(10, v); } });
ctl.rs = K.slider(g, { label: "Halo scale radius", min: 0.5, max: 50, step: 0.5, value: 20, unit: "kpc", on: v => { Gx.halo.rs = v; } });
ctl.shape = K.seg(g, { label: "Halo shape", value: "nfw", options: [["nfw", "NFW (cuspy)"], ["iso", "isothermal (cored)"]], on: v => { Gx.halo.shape = v; } });
ctl.mond = K.toggle(g, { label: "MOND instead of dark matter (A level)", value: false, on: v => { P.mond = v; Gx.mond = v; } });
let rf = K.row(g); K.btn(rf, "🎯 Fit the halo for me", () => { const f = fitHalo(data, Gx, P.fitRs); Gx.halo.on = true; Gx.halo.M = f.M; if (P.fitRs) Gx.halo.rs = f.rs; syncCtl(); }, "primary"); ctl.reveal = K.btn(rf, "Reveal", () => { revealed = true; });
ctl.fitRs = K.toggle(g, { label: "Fit the scale radius too", value: false, on: v => P.fitRs = v });
ctl.speed = K.slider(ui.group("Watch"), { label: "Speed", min: 0.1, max: 4, step: 0.1, value: 1, fmt: v => K.sig(v * 10, 2) + " million years per second", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["vis", "visible mass inside last point"], ["dark", "dark mass inside last point"], ["ratio", "dark ÷ visible"], ["chi", "χ² (points)"], ["mv", "mass from v²r/G"]]);
function sci(lg) { let e = Math.floor(lg), m = Math.pow(10, lg - e); if (m >= 9.95) { m = 1; e++; } return m.toFixed(1) + " × 10" + sup(e) + " M☉"; }
function sup(n) { return String(n).split("").map(c => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join(""); }
function syncCtl() { ctl.dM.set(Math.log10(Math.max(1e6, Gx.dM))); ctl.bM.set(Math.log10(Math.max(1e6, Gx.bM))); ctl.gM.set(Math.log10(Math.max(1e6, Gx.gM))); ctl.hM.set(Math.log10(Gx.halo.M)); ctl.rs.set(Gx.halo.rs); ctl.shape.set(Gx.halo.shape); ctl.hon.set(Gx.halo.on); ctl.mond.set(!!Gx.mond); }
function set(o) {
  Object.assign(P, { motion: "model", mond: false }, o); const src = GAL[P.gal]; Gx = JSON.parse(JSON.stringify(src)); Gx.mond = P.mond; revealed = false;
  data = observe(src, rnd, src.n, src.err, src.rmax);
  if (P.gal === "mystery") { hidden = src.halo.M; Gx.halo.M = 3e11; }
  ctl.gal.set(P.gal); ctl.motion.set(P.motion); ctl.reveal.style.display = P.gal === "mystery" ? "" : "none"; syncCtl(); makeStars();
}
// stars: radii drawn from the light (bulge + disc), random angles
function makeStars() { stars = []; for (let i = 0; i < 1400; i++) { const bulge = rnd() < Gx.bM / (Gx.bM + Gx.dM + 1); const R = bulge ? Gx.ba * Math.sqrt(rnd()) * 1.5 : -Gx.dR * Math.log(1 - rnd() * 0.98); const a = rnd() * 6.283; const v = P.motion === "visible" ? Math.sqrt(vVisible2(R, Gx)) : vModel(R, Gx); stars.push({ R, a, x: R * Math.cos(a), y: R * Math.sin(a), vx: -v * Math.sin(a), vy: v * Math.cos(a), arm: (Math.floor(rnd() * 2)) }); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#05070f"; c.fillRect(0, 0, w, h);
  const cx = w * 0.3, cy = h * 0.45, sc = Math.min(w * 0.27, h * 0.4) / Math.max(10, Gx.rmax * 0.6);
  if (Gx.halo.on && !P.mond) { const gr = c.createRadialGradient(cx, cy, 0, cx, cy, Gx.rmax * sc * 1.2); gr.addColorStop(0, "rgba(120,90,200,0.25)"); gr.addColorStop(1, "rgba(120,90,200,0)"); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, Gx.rmax * sc * 1.2, 0, 6.3); c.fill(); TX(c, "dark halo (invisible: shown faintly)", cx, cy + Gx.rmax * sc * 1.2 - 6, "#9b7fe0", "center", "11px"); }
  for (const s of stars) { const x = cx + s.x * sc, y = cy + s.y * sc; if (x < -5 || x > w * 0.62 || y < -5 || y > h) continue; const R = Math.hypot(s.x, s.y); c.fillStyle = R < Gx.ba * 1.5 ? "rgba(255,220,170,0.8)" : "rgba(180,200,255,0.7)"; c.fillRect(x, y, 1.6, 1.6); }
  c.fillStyle = "#fff6d0"; c.beginPath(); c.arc(cx, cy, 4, 0, 6.3); c.fill();
  TX(c, `${Gx.name} · face-on · ${P.motion === "model" ? "stars move with the model's gravity" : P.motion === "visible" ? "visible gravity only: the outer stars lag" : "observed speeds, visible gravity only: the stars fly off"}`, 14, 22, "#eef2f8", "left", "600 13px");
  c.fillStyle = "#eef2f8"; c.fillRect(20, h - 30, 10 * sc, 3); TX(c, "10 kpc", 20, h - 36, "#eef2f8", "left", "11px");
  // edge-on view with Doppler colours and the slit spectrum
  const ex = w * 0.66, ew = w * 0.31, ey = h * 0.2, es = ew / (2 * Gx.rmax);
  for (let i = -40; i <= 40; i++) { const R = Gx.rmax * i / 40, v = Math.sign(R) * vModel(Math.abs(R) + 0.01, Gx), u = Math.max(-1, Math.min(1, v / 260)); c.fillStyle = u > 0 ? `rgba(255,${Math.round(160 - 120 * u)},${Math.round(150 - 130 * u)},0.9)` : `rgba(${Math.round(150 + 100 * u)},${Math.round(170 + 50 * u)},255,0.9)`; const th = 10 * Math.exp(-Math.abs(R) / (Gx.dR * 2)) + 2; c.fillRect(ex + ew / 2 + R * es - 2, ey - th, 4.5, th * 2); }
  TX(c, "edge-on: blue coming towards us, red going away", ex, ey - 26, "#aab6cc", "left", "11px");
  const sy = ey + 50, sh = h * 0.42; c.fillStyle = "#111a30"; c.fillRect(ex, sy, ew, sh);
  for (let i = -40; i <= 40; i++) { const R = Gx.rmax * i / 40, v = Math.sign(R) * vModel(Math.abs(R) + 0.01, Gx), dl = 656.3 * v / 3e5, y = sy + sh / 2 - dl / 1.0 * sh / 2; c.fillStyle = "#ff5d6c"; c.fillRect(ex + ew / 2 + R * es - 2, y - 1.5, 4.5, 3); }
  c.strokeStyle = "rgba(255,255,255,0.25)"; c.beginPath(); c.moveTo(ex, sy + sh / 2); c.lineTo(ex + ew, sy + sh / 2); c.stroke();
  TX(c, "slit spectrum: Hα (656.3 nm) shifted by Δλ = λv/c (±1 nm shown)", ex, sy + sh + 16, "#aab6cc", "left", "11px");
}

// ---------------- Charts ----------------
function charts() {
  const rm = Gx.rmax * 1.1, comp = { bulge: [], disc: [], gas: [], halo: [], vis: [], tot: [], kep: [] }, Mvis = visMassInside(Gx.rmax * 0.3, Gx);
  for (let i = 1; i <= 120; i++) { const r = rm * i / 120, p = parts(r, Gx); comp.bulge.push([r, Math.sqrt(p.bulge)]); comp.disc.push([r, Math.sqrt(p.disc)]); comp.gas.push([r, Math.sqrt(p.gas)]); comp.halo.push([r, Gx.halo.on && !P.mond ? Math.sqrt(p.halo) : 0]); comp.vis.push([r, Math.sqrt(vVisible2(r, Gx))]); comp.tot.push([r, vModel(r, Gx)]); if (r > Gx.rmax * 0.3) comp.kep.push([r, Math.sqrt(G * Mvis / r)]); }
  chA.opts.title = "Rotation curve"; chA.opts.xLabel = "distance from the centre (kpc)"; chA.opts.yLabel = "orbital speed (km/s)"; chA.opts.xFmt = null;
  const ser = [{ pts: data, type: "err", r: 3.5, color: "#eef2f8", label: "observed" }, { pts: comp.tot, color: "#ffd166", width: 2.6, label: P.mond ? "MOND" : "total" }, { pts: comp.vis, color: "#6fb1ff", label: "visible only" }, { pts: comp.kep, color: "#7d8aa5", dash: [5, 4], label: "Kepler" }];
  if (ui.level === "adv") ser.push({ pts: comp.halo, color: "#9b7fe0", dash: [3, 3], label: "halo" }, { pts: comp.disc, color: "#7fe3a0", dash: [3, 3], label: "stars" }, { pts: comp.gas, color: "#4fd1c5", dash: [3, 3], label: "gas" }, { pts: comp.bulge, color: "#ff8a70", dash: [3, 3], label: "bulge" });
  chA.draw(ser, { xMin: 0, xMax: rm, yMin: 0 });
  const mt = [], mv = []; for (let i = 1; i <= 80; i++) { const r = rm * i / 80; mt.push([r, massInside(r, Gx) / 1e10]); mv.push([r, visMassInside(r, Gx) / 1e10]); }
  chB.opts.title = "Mass inside radius r"; chB.opts.xLabel = "r (kpc)"; chB.opts.yLabel = "× 10¹⁰ M☉"; chB.opts.xFmt = null;
  chB.draw([{ pts: mt, color: "#ffd166", label: "total" }, { pts: mv, color: "#6fb1ff", label: "visible" }], { xMin: 0, xMax: rm, yMin: 0 });
  const r0 = Gx.rmax, vis = visMassInside(r0, Gx), tot = massInside(r0, Gx), c2 = chi2(data, Gx);
  read.set("vis", sci(Math.log10(vis))); read.set("dark", P.mond ? "none (MOND)" : sci(Math.log10(Math.max(1, tot - vis)))); read.set("ratio", P.mond ? "–" : ((tot - vis) / vis).toFixed(1)); read.set("chi", `${c2.toFixed(0)} (${data.length})${P.gal === "mystery" && revealed ? ` · true halo ${sci(Math.log10(hidden))}` : ""}`); read.set("mv", sci(Math.log10(data.length ? data[data.length - 1][1] ** 2 * data[data.length - 1][0] / G : tot)));
  ui.hud(!Gx.halo.on && !P.mond ? "No dark matter: the model falls far below the observed speeds" : c2 < data.length * 1.6 ? "A good fit: the halo provides the missing mass" : "Adjust the halo to match the points");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const tt = dt * speed * 10;                       // Myr; 1 km/s ≈ 1.02 pc per Myr
  if (P.motion === "flyoff") { for (const s of stars) { const R = Math.hypot(s.x, s.y) || 1e-3, gacc = vVisible2(R, Gx) / R; for (let k = 0; k < 4; k++) { const h = tt / 4 * 1.023e-3, ax = -gacc * s.x / R, ay = -gacc * s.y / R; s.vx += ax * h; s.vy += ay * h; s.x += s.vx * h; s.y += s.vy * h; } } }
  else for (const s of stars) { const R = Math.hypot(s.x, s.y), v = P.motion === "visible" ? Math.sqrt(vVisible2(R, Gx)) : vModel(R, Gx), om = v / Math.max(R, 0.05) * 1.023e-3; const a = Math.atan2(s.y, s.x) + om * tt; s.x = R * Math.cos(a); s.y = R * Math.sin(a); }
}, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({ gal: "mw" });
ui.tip("The points are measured speeds. Switch the dark halo off and see how far the visible matter alone falls short.", 7000);
