/* =====================================================================
   STELLAR LIFE CYCLE
   A star's MASS decides almost everything about its life:
     * a cloud of gas and dust collapses into a protostar
     * main sequence: hydrogen fuses to helium in the core; heavier stars
       are hotter, much brighter, and burn out much faster
       (lifetime ≈ 10 billion years × M^−2.5, luminosity ≈ M^3.5)
     * the core runs out of hydrogen: the star swells into a red giant
       (or a red supergiant if it is more than about 8 Suns)
     * small stars puff off a planetary nebula and leave a white dwarf;
       big stars explode as supernovae and leave a neutron star or,
       above about 25 Suns, a black hole.
   The light it gives out is black-body radiation: Wien's law gives the
   peak wavelength (λmax = b ÷ T) and Stefan's law the power
   (L = 4πR²σT⁴).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";   // label category axes only at whole numbers
const SIGMA = 5.67e-8, WIEN = 2.898e-3, LSUN = 3.828e26, RSUN = 6.957e8, TSUN = 5772, H = 6.626e-34, C = 2.998e8, KB = 1.381e-23;
const tempFrom = (L, R) => TSUN * Math.pow(L / (R * R), 0.25), radiusFrom = (L, T) => Math.sqrt(L) * (TSUN / T) ** 2;     // from L = 4πR²σT⁴ in solar units
const msL = M => M < 0.43 ? 0.23 * Math.pow(M, 2.3) : Math.pow(M, 3.5) / (M > 20 ? Math.pow(M / 20, 1.5) : 1), msR = M => Math.pow(M, 0.8), lifetime = M => 1e10 * Math.pow(M, -2.5);
/* the keyframes of a star's life: [stage, duration (years), L (L☉), T (K), what is happening in the core] */
function lifeOf(M) {
  const L = msL(M), R = msR(M), T = tempFrom(L, R), tau = lifetime(M), k = [];
  k.push(["Protostar", 5e7 * Math.pow(M, -2.5) + 1e5, Math.max(L, 1) * 4, 3600, "collapsing and heating up: no fusion yet"]);
  if (M < 0.08) { k.push(["Brown dwarf", 1e9, 1e-3, 2200, "too small to fuse hydrogen: slowly cools"]); k.push(["Brown dwarf (old)", 1e10, 2e-5, 900, "cooling for ever"]); return k; }
  k.push(["Main sequence", tau * 0.9, L, T, "hydrogen → helium (fusion) in the core"]);
  if (tau > 1.38e10) { k.push(["Main sequence (still)", 1e12, L * 1.5, T * 1.02, "hydrogen → helium: will last far longer than the universe's age so far"]); return k; }
  k.push(["End of main sequence", tau * 0.06, L * 1.8, T * 0.96, "core hydrogen running out"]);
  if (M < 8) {
    k.push(["Subgiant", tau * 0.03, L * 2.6, Math.min(T, 5000), "hydrogen burns in a shell round a helium core"]);
    k.push(["Red giant", tau * 0.01, 1500 * Math.pow(M, 0.6), 3300, "core contracts and heats; outer layers swell"]);
    k.push([M < 2 ? "Helium flash → red clump" : "Blue loop", tau * 0.01, 60 * M, M < 2 ? 4800 : 7500, "helium → carbon and oxygen in the core"]);
    k.push(["Asymptotic giant", tau * 0.002, 4500 * Math.pow(M, 0.5), 3000, "helium and hydrogen burn in shells; strong winds"]);
    k.push(["Planetary nebula", 3e4, 5000 * Math.pow(M, 0.3), 100000, "outer layers drift away, lit by the hot core"]);
    k.push(["White dwarf", 1e8, 1, 50000, "no fusion: a hot carbon–oxygen core the size of the Earth"]);
    k.push(["White dwarf (cooling)", 1e10, 1e-4, 5000, "cooling slowly towards a black dwarf"]);
  } else {
    k.push(["Blue supergiant", tau * 0.02, L * 1.5, Math.min(25000, T * 0.8), "helium burning begins"]);
    k.push(["Red supergiant", tau * 0.08, L * 2, 3500, "shells of burning: H, He, C, Ne, O, Si → iron core"]);
    k.push(["Supernova!", 0.2, 1e9 * 0.25, 20000, "the iron core collapses in under a second; the star explodes"]);
    k.push(M < 25 ? ["Neutron star", 1e10, 0.05, 6e5, "a ball of neutrons about 20 km across"] : ["Black hole", 1e10, 1e-9, 1e3, "nothing escapes, not even light"]);
  }
  return k;
}
const remnant = M => M < 0.08 ? "brown dwarf" : M < 0.5 ? "white dwarf (eventually)" : M < 8 ? "white dwarf" : M < 25 ? "neutron star" : "black hole";
const remMass = M => M < 8 ? Math.min(1.35, 0.5 + 0.09 * M) : M < 25 ? 1.4 + 0.02 * (M - 8) : 0.3 * M;
// colour of a black body (approximately), for drawing the star
function bbColour(T) { const t = T / 100; let r, g, b; r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332); g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755); b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305; return `rgb(${[r, g, b].map(v => Math.round(K.clamp(v, 0, 255))).join(",")})`; }
const planck = (lam, T) => 2 * H * C * C / Math.pow(lam, 5) / (Math.exp(H * C / (lam * KB * T)) - 1);   // spectral radiance (W per m² per m per steradian)
function peakNumeric(T) { let best = 0, bl = 0; for (let l = 50e-9; l < 5e-6; l *= 1.002) { const v = planck(l, T); if (v > best) { best = v; bl = l; } } return bl; }

// stars to put on the H–R diagram: [name, L (L☉), T (K), class]
const CAT = [["Sun", 1, 5772, "G"], ["Sirius A", 25, 9940, "A"], ["Vega", 40, 9600, "A"], ["Betelgeuse", 1.2e5, 3600, "M"], ["Rigel", 1.2e5, 12100, "B"], ["Antares", 7.5e4, 3600, "M"], ["Aldebaran", 440, 3900, "K"], ["Arcturus", 170, 4290, "K"], ["Proxima Centauri", 0.0017, 3040, "M"], ["Barnard's Star", 0.0035, 3200, "M"], ["Sirius B", 0.056, 25000, "D"], ["40 Eridani B", 0.013, 16500, "D"], ["Spica", 2e4, 25300, "B"], ["Deneb", 2e5, 8500, "A"], ["Polaris", 1260, 6000, "F"]];

// ---------------- The page ----------------
const P = { mode: "life", M: 1, s: 0, auto: true };
let K2 = lifeOf(1), speed = 1, kept = [];
const ui = K.app({
  title: "Stellar Life Cycle", subject: "Astrophysics",
  blurb: "From cloud to white dwarf, neutron star or black hole: mass decides, light tells us",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 8(b) stellar evolution: nebula, protostar, main sequence, red giant or supergiant, white dwarf, supernova, neutron star or black hole; the colour of a star depends on its surface temperature; the Hertzsprung–Russell diagram.", adv: "WJEC Eduqas A level Physics Component 3 / Option: black-body radiation (Wien's displacement law λmax = b/T, Stefan's law L = 4πr²σT⁴), the H–R diagram and stellar evolution; main-sequence mass–luminosity relation and lifetimes (beyond the spec)." } },
  missions: [
    { title: "The life of the Sun", q: "Press play and follow the Sun through its life. Which stage lasts longest? What will the Sun become in the end?", hint: "The main sequence lasts about 10 billion years (the Sun is about halfway through). Then it swells into a red giant hundreds of times bigger, puffs off its outer layers as a planetary nebula, and leaves a white dwarf about the size of the Earth, which slowly cools.", setup() { set({ M: 1 }); } },
    { title: "A massive star", q: "Now a star of 15 solar masses. How long is its main sequence? What happens at the end?", hint: "Only about 11 million years: it is 15 times more massive but over 10 000 times brighter, so it burns its fuel much faster (lifetime ∝ M^−2.5). It becomes a red supergiant, builds an iron core, which collapses: a supernova. What is left is a neutron star (above about 25 solar masses, a black hole).", setup() { set({ M: 15 }); } },
    { title: "A red dwarf", q: "Try a star of 0.2 solar masses. Has any such star ever left the main sequence?", hint: "Red dwarfs are cool and dim and burn their hydrogen very slowly: a 0.2 solar mass star lives for about a trillion years, far longer than the 13.8 billion years since the Big Bang. None has died yet. They are the most common stars in the galaxy (Proxima Centauri is one).", setup() { set({ M: 0.2 }); } },
    { title: "Colour and temperature", q: "Open the spectrum view. Compare a cool red giant (about 3300 K) with the Sun and a hot blue star. Where is the peak of each curve?", hint: "Hotter objects give out more light at every wavelength, and their peak moves to shorter wavelengths (Wien's law: λmax = b ÷ T). A 3300 K star peaks in the infrared and looks red; the Sun peaks in green-blue but looks white; a 25 000 K star peaks in the ultraviolet and looks blue-white.", setup() { set({ mode: "spec", M: 1, s: 4.5 }); } },
    { title: "The H–R diagram", q: "In the H–R view, find the Sun, the red giants and supergiants, and the white dwarfs. Then follow the Sun's track across the diagram.", hint: "Most stars lie on the main sequence, a band from hot, bright stars (top left) to cool, dim ones (bottom right). Giants and supergiants are cool but bright, so they must be huge (top right). White dwarfs are hot but dim, so they must be tiny (bottom left). Temperature runs backwards: hot on the left.", setup() { set({ mode: "hr", M: 1 }); } },
    { lvl: "adv", title: "How big is Betelgeuse?", q: "Betelgeuse has a luminosity of about 120 000 Suns and a surface temperature of 3600 K. Use L = 4πR²σT⁴ to estimate its radius, and compare with the readout for a red supergiant.", hint: "R = √(L ÷ (4πσT⁴)). With L = 1.2 × 10⁵ × 3.83 × 10²⁶ W and T = 3600 K, R ≈ 9 × 10¹¹ m, about 900 times the Sun's radius. If it replaced the Sun it would reach beyond the orbit of Mars.", setup() { set({ mode: "hr", M: 15, s: 4.5 }); } },
    { lvl: "adv", title: "Lifetime and mass", q: "Use the batch run 'Lifetime and mass'. How does the main-sequence lifetime depend on mass? Why?", hint: "Fuel available ∝ M, but the rate of burning (luminosity) ∝ M^3.5, so lifetime ∝ M ÷ M^3.5 = M^−2.5. A star twice the Sun's mass lives only about 1.8 billion years." }
  ],
  batch: [
    { title: "Lifetime and mass", question: "How long do stars of different masses stay on the main sequence?", how: "Masses 0.5 to 20 solar masses; each star's lifetime varies by about ±10% (composition). Plotted as log₁₀ of the lifetime. Theory: τ = 10¹⁰ years × M^−2.5.", xLabel: "mass (solar masses)", yLabel: "log₁₀ (main-sequence lifetime in years)", xs: [0.5, 0.8, 1, 1.5, 2, 3, 5, 8, 12, 20], reps: 3, theory: m => Math.log10(lifetime(m)), theoryLabel: "τ = 10¹⁰ M^−2.5", run: (x, r) => Math.log10(lifetime(x) * (1 + 0.1 * r.gauss())), note: "Massive stars live fast and die young: a 20 solar-mass star lasts under 6 million years, a 0.5 solar-mass star over 50 billion." },
    { title: "Mass and luminosity", question: "How does a main-sequence star's luminosity depend on its mass?", how: "Masses 0.5 to 15 solar masses, ±10% scatter; log–log axes. Theory: L ∝ M^3.5, a straight line of gradient 3.5.", xLabel: "log₁₀ (mass)", yLabel: "log₁₀ (luminosity)", xs: [-0.3, -0.1, 0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.18], reps: 3, fit: true, theory: x => 3.5 * x, theoryLabel: "gradient 3.5", run: (x, r) => Math.log10(msL(Math.pow(10, x)) * (1 + 0.1 * r.gauss())), note: "A straight line of gradient about 3.5 on log–log axes: double the mass, about 11 times the luminosity." },
    { lvl: "adv", title: "Wien's displacement law", question: "How does the peak wavelength of a black body depend on its temperature?", how: "Temperatures 3000 to 30 000 K; the peak is found by scanning Planck's curve, with a ±1% measurement error. Theory: λmax = 2.898 × 10⁻³ ÷ T.", xLabel: "temperature (K)", yLabel: "peak wavelength (nm)", xs: [3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000, 30000], reps: 2, yMin: 0, theory: T => WIEN / T * 1e9, theoryLabel: "λmax = b ÷ T", run: (x, r) => peakNumeric(x) * 1e9 * (1 + 0.01 * r.gauss()), note: "The peak moves to shorter wavelengths as the temperature rises: inverse proportion." },
    { lvl: "adv", title: "Stefan's law", question: "How does the power given out per square metre depend on temperature?", how: "Temperatures 2000 to 12 000 K; log–log axes; ±2% measurement error. Theory: P ÷ A = σT⁴, a straight line of gradient 4.", xLabel: "log₁₀ (temperature)", yLabel: "log₁₀ (power per m²)", xs: [3.3, 3.45, 3.6, 3.75, 3.9, 4.08], reps: 2, fit: true, theory: x => Math.log10(SIGMA) + 4 * x, theoryLabel: "σT⁴", run: (x, r) => Math.log10(SIGMA * Math.pow(10, 4 * x) * (1 + 0.02 * r.gauss())), note: "Gradient 4: double the temperature and each square metre radiates 16 times the power." },
    { title: "What is left at the end?", question: "What is the mass of the remnant left by stars of different masses?", how: "Starting masses 1 to 40 solar masses (±10% scatter in the remnant). Below 8: white dwarfs; 8–25: neutron stars; above 25: black holes.", xLabel: "starting mass (solar masses)", yLabel: "remnant mass (solar masses)", xs: [1, 2, 4, 6, 8, 12, 18, 25, 30, 40], reps: 3, yMin: 0, run: (x, r) => remMass(x) * (1 + 0.1 * r.gauss()), note: "White dwarfs are never more than about 1.4 solar masses (the Chandrasekhar limit); most of a big star's mass is blown away before and during the supernova." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 8.10", text: "Stars form from clouds of dust and gas (nebulae) that collapse under gravity into protostars; when the core is hot enough, hydrogen fuses into helium: a main-sequence star." },
      { lvl: "std", tag: "4PH1 8.11", text: "Stars about the mass of the Sun: main sequence → red giant → white dwarf (with a planetary nebula). Much more massive stars: red supergiant → supernova → neutron star or black hole." },
      { lvl: "std", tag: "4PH1 8.12", text: "On the main sequence the outward pressure of fusion balances the inward pull of gravity." },
      { lvl: "std", tag: "4PH1 8.13", text: "The colour of a star depends on its surface temperature: red stars are coolest, blue-white hottest." },
      { lvl: "std", tag: "4PH1 8.15", text: "The H–R diagram plots luminosity against temperature (hot on the left): main sequence, giants and supergiants (top right), white dwarfs (bottom left)." },
      { lvl: "adv", tag: "Eduqas", text: "Wien's law: λmax = b ÷ T, b = 2.90 × 10⁻³ m K. Stefan's law: L = 4πR²σT⁴, σ = 5.67 × 10⁻⁸ W m⁻² K⁻⁴." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Main-sequence luminosity ∝ M^3.5 and lifetime ∝ M^−2.5. White dwarfs cannot exceed about 1.4 solar masses (the Chandrasekhar limit)." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Describe the life cycle of a star with the same mass as the Sun, from the main sequence onwards.", ans: "<ul><li>main sequence: hydrogen fuses to helium; forces balanced</li><li>hydrogen in the core runs out: expands into a red giant</li><li>outer layers drift away (planetary nebula)</li><li>core left as a white dwarf, which cools</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why a main-sequence star stays a stable size for billions of years.", ans: "<ul><li>gravity pulls inwards</li><li>pressure from fusion energy pushes outwards; the two are balanced</li></ul>" },
      { lvl: "std", marks: 2, q: "Betelgeuse is red and Rigel is blue-white. Which has the higher surface temperature? Explain.", ans: "<ul><li>Rigel</li><li>hotter objects give out more of their light at shorter (bluer) wavelengths</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `The star now has a surface temperature of ${Math.round(stateNow().T)} K. Use Wien's law to calculate the peak wavelength.`, ans: () => `<ul><li>λmax = 2.898 × 10⁻³ ÷ ${Math.round(stateNow().T)}</li><li>= ${(WIEN / stateNow().T * 1e9).toFixed(0)} nm</li></ul>` },
      { lvl: "adv", marks: 3, q: "Sirius B has a luminosity of 0.056 L☉ and a surface temperature of 25 000 K. Show that its radius is about the size of the Earth (L☉ = 3.83 × 10²⁶ W, σ = 5.67 × 10⁻⁸).", ans: "<ul><li>L = 0.056 × 3.83 × 10²⁶ = 2.1 × 10²⁵ W</li><li>R = √(L ÷ 4πσT⁴) = √(2.1 × 10²⁵ ÷ (4π × 5.67 × 10⁻⁸ × 3.9 × 10¹⁷))</li><li>≈ 8.7 × 10⁶ m, about the Earth's radius (6.4 × 10⁶ m)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li>The star's life is a series of stages (keyframes), each with a duration, a luminosity and a surface temperature; between them the values change smoothly. The radius follows from L = 4πR²σT⁴.</li>
<li><b>Main sequence</b>: L = M^3.5 (L = 0.23 M^2.3 below 0.43 M☉, flattening above 20 M☉), R = M^0.8, lifetime 10¹⁰ years × M^−2.5.</li>
<li><b>Later stages</b>: luminosities and temperatures are typical values scaled with mass: red giants about 1500 M^0.6 L☉ at 3300 K, planetary-nebula nuclei about 100 000 K, white dwarfs cooling from 50 000 K.</li>
<li><b>Endings</b>: below 0.08 M☉ a brown dwarf (no hydrogen fusion); below 8 M☉ a white dwarf (mass 0.5 + 0.09 M, at most 1.35 M☉); 8–25 M☉ a neutron star; above 25 M☉ a black hole. Stars below about 0.9 M☉ have not yet left the main sequence in the age of the universe.</li>
<li><b>Light</b>: Planck's law for the spectrum; Wien's law for the peak; the star's drawn colour is an approximation to the colour of a black body.</li></ul>
<h3>Simplifications</h3>
<ul><li>Real evolutionary tracks wiggle and depend on composition, rotation, winds and companions; these are smooth, typical tracks.</li>
<li>The mass boundaries (8 and 25 M☉) are approximate.</li>
<li>Binary stars (Type Ia supernovae), metallicity and stellar winds were options in the earlier version and are not in this one.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/stellar-life-cycle.html">original/stellar-life-cycle.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "life", options: [["life", "⭐ Life cycle"], ["spec", "🌈 Spectrum"], ["hr", "📈 H–R diagram"]], on: v => { P.mode = v; setTitles(); } });
g = ui.group("The star");
const massS = s => +(0.05 * Math.pow(1200, s / 100)).toPrecision(2), sFromMass = m => 100 * Math.log(m / 0.05) / Math.log(1200);
ctl.M = K.slider(g, { label: "Mass", min: 0, max: 100, step: 0.5, value: sFromMass(1), fmt: s => massS(s) + " × the Sun", on: s => { P.M = massS(s); K2 = lifeOf(P.M); P.s = 0; } });
let rr = K.row(g); for (const [m, l] of [[0.05, "0.05"], [0.2, "0.2"], [1, "Sun"], [3, "3"], [15, "15"], [40, "40"]]) K.btn(rr, l, () => set({ M: m, mode: P.mode }), "small");
const endNote = K.note(g, "");
g = ui.group("Its life");
ctl.auto = K.toggle(g, { label: "Play through its life", value: true, on: v => P.auto = v });
ctl.s = K.slider(g, { label: "Stage", min: 0, max: 1, step: 0.001, value: 0, fmt: v => K2[Math.min(K2.length - 1, Math.round(v * (K2.length - 1)))][0], on: v => { P.s = v * (K2.length - 1); P.auto = false; ctl.auto.set(false); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.2, max: 4, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => speed = v });
K.btn(K.row(g), "Keep this track (H–R)", () => { kept.push({ M: P.M, k: K2 }); if (kept.length > 4) kept.shift(); });
const read = K.readout(g, [["age", "age"], ["L", "luminosity"], ["T", "surface temperature"], ["R", "radius"], ["lam", "peak wavelength"], ["core", "in the core"]]);
function stateNow() {   // interpolate between keyframes (in log L and log T)
  const s = Math.min(P.s, K2.length - 1.0001), i = Math.floor(s), f = s - i, a = K2[i], b = K2[Math.min(i + 1, K2.length - 1)];
  const L = Math.pow(10, Math.log10(a[2]) + (Math.log10(b[2]) - Math.log10(a[2])) * f), T = Math.pow(10, Math.log10(a[3]) + (Math.log10(b[3]) - Math.log10(a[3])) * f);
  let age = 0; for (let j = 0; j < i; j++) age += K2[j][1]; age += K2[i][1] * f;
  const name = a[0], comp = /Neutron|Black/.test(b[0]) && f > 0.5 ? b : a; let R = radiusFrom(L, T); if (/Neutron/.test(comp[0])) R = 1.4e-5; if (/Black/.test(comp[0])) R = 2.95e3 * remMass(P.M) / RSUN;
  return { L, T, R, age, name: f > 0.5 ? b[0] : name, core: f > 0.5 ? b[4] : a[4] };
}
function setTitles() { chA.opts.title = { life: "Luminosity and temperature through its life", spec: "Black-body spectrum", hr: "Main-sequence lifetime against mass" }[P.mode]; chB.opts.title = { life: "Radius through its life", spec: "Peak wavelength against temperature (Wien)", hr: "Mass and luminosity" }[P.mode]; }
function set(o) { Object.assign(P, { M: 1, s: 0, auto: true }, o); K2 = lifeOf(P.M); ctl.M.set(sFromMass(P.M)); ctl.mode.set(P.mode); ctl.auto.set(P.auto); kept = []; setTitles(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T2 = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const fmtYears = y => y < 1e3 ? y.toFixed(0) + " years" : y < 1e6 ? (y / 1e3).toFixed(0) + " thousand years" : y < 1e9 ? (y / 1e6).toFixed(y < 1e7 ? 1 : 0) + " million years" : (y / 1e9).toFixed(2) + " billion years";
function drawLife(c, w, h) {
  const S = stateNow(), cx = w * 0.36, cy = h * 0.45, maxR = Math.min(w * 0.3, h * 0.38), rpx = K.clamp(12 + 38 * Math.log10(Math.max(S.R, 1e-5) * 1e5) / 1.5 - 60, 2, maxR);
  // stars in the background
  c.fillStyle = "rgba(255,255,255,0.5)"; for (let i = 0; i < 80; i++) c.fillRect((i * 97) % w, (i * 53) % h, 1.5, 1.5);
  if (/nebula/i.test(S.name)) { const gr = c.createRadialGradient(cx, cy, 10, cx, cy, maxR); gr.addColorStop(0, "rgba(120,220,255,0)"); gr.addColorStop(0.6, "rgba(120,220,255,0.35)"); gr.addColorStop(0.8, "rgba(255,120,160,0.4)"); gr.addColorStop(1, "rgba(255,120,160,0)"); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, maxR, 0, 6.3); c.fill(); }
  if (/Supernova/.test(S.name)) { for (let k = 0; k < 40; k++) { const a = k * 0.157, rr2 = maxR * (0.6 + 0.4 * Math.sin(k * 7)); c.strokeStyle = "rgba(255,220,150,0.5)"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + rr2 * Math.cos(a), cy + rr2 * Math.sin(a)); c.stroke(); } }
  if (/Protostar/.test(S.name)) { c.fillStyle = "rgba(160,120,90,0.25)"; c.beginPath(); c.ellipse(cx, cy, maxR, maxR * 0.35, 0.3, 0, 6.3); c.fill(); }
  if (/Black/.test(S.name)) { c.strokeStyle = "rgba(255,180,90,0.7)"; c.lineWidth = 6; c.beginPath(); c.ellipse(cx, cy, 60, 16, 0.2, 0, 6.3); c.stroke(); c.fillStyle = "#000"; c.beginPath(); c.arc(cx, cy, 14, 0, 6.3); c.fill(); }
  else { const col = bbColour(S.T), gr = c.createRadialGradient(cx, cy, rpx * 0.1, cx, cy, rpx * 1.4); gr.addColorStop(0, "#fff"); gr.addColorStop(0.5, col); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, rpx * 1.4, 0, 6.3); c.fill(); }
  // the core (a cutaway label)
  T2(c, S.name, cx, 40, "#eef2f8", "center", "700 18px"); T2(c, S.core, cx, 62, "#ffd166", "center", "13px");
  T2(c, `drawn size: ${S.R < 0.1 ? "magnified (much smaller than the Sun)" : S.R > 50 ? "shrunk (much bigger than the Sun)" : "sizes on a log scale"}`, cx, h - 70, "#7d8aa5", "center", "11px");
  // timeline of stages
  const tx = 30, tw = w - 60, ty = h - 40; K2.forEach((k, i) => { const x = tx + tw * i / (K2.length - 1); c.fillStyle = i <= P.s ? "#ffd166" : "#3a4560"; c.beginPath(); c.arc(x, ty, 5, 0, 6.3); c.fill(); }); c.strokeStyle = "#3a4560"; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + tw, ty); c.stroke(); c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + tw * P.s / (K2.length - 1), ty); c.stroke();
  // side panel: numbers
  const x = w * 0.7; let y = 120; const L2 = (s, col = "#eef2f8", f = "13px") => { T2(c, s, x, y, col, "left", f); y += 22; };
  L2(`${P.M} × the Sun's mass`, "#eef2f8", "600 14px"); L2(`age ${fmtYears(S.age)}`); L2(`L = ${K.sig(S.L, 3)} × the Sun`); L2(`T = ${Math.round(S.T).toLocaleString()} K`); L2(`R = ${K.sig(S.R, 3)} × the Sun`); y += 6; L2(`ends as: ${remnant(P.M)}`, "#c58cff", "600 13px");
}
function drawSpec(c, w, h) {
  const S = stateNow(), x0 = 60, x1 = w - 30, y0 = 60, y1 = h - 50, lamMax = 3e-6, X = l => x0 + l / lamMax * (x1 - x0);
  const peakB = planck(WIEN / S.T, S.T), ref = Math.max(peakB, planck(WIEN / 6000, 6000) * 0.02), Y = v => y1 - v / (peakB * 1.1) * (y1 - y0);
  for (let l = 380e-9; l <= 750e-9; l += 5e-9) { const hue = 270 - (l * 1e9 - 380) / 370 * 270; c.fillStyle = `hsla(${hue},90%,55%,0.35)`; c.fillRect(X(l), y0, X(l + 5e-9) - X(l) + 1, y1 - y0); }
  T2(c, "visible", X(560e-9), y0 - 8, "#eef2f8", "center", "11px"); T2(c, "ultraviolet ←", X(380e-9) - 4, y0 - 8, "#c58cff", "right", "11px"); T2(c, "→ infrared", X(750e-9) + 4, y0 - 8, "#ff8a70", "left", "11px");
  c.strokeStyle = "#7d8aa5"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke(); for (let l = 0; l <= 3e-6; l += 5e-7) T2(c, (l * 1e9).toFixed(0), X(l), y1 + 16, "#7d8aa5", "center", "10.5px"); T2(c, "wavelength (nm)", (x0 + x1) / 2, y1 + 34, "#aab6cc", "center", "11.5px");
  c.strokeStyle = bbColour(S.T); c.lineWidth = 3; c.beginPath(); for (let l = 50e-9; l <= lamMax; l += 1e-8) { const y = Y(planck(l, S.T)); l === 50e-9 ? c.moveTo(X(l), y) : c.lineTo(X(l), y); } c.stroke();
  const lp = WIEN / S.T; if (lp < lamMax) { c.strokeStyle = "#ffd166"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(X(lp), y1); c.lineTo(X(lp), Y(peakB)); c.stroke(); c.setLineDash([]); T2(c, `λmax = b ÷ T = ${(lp * 1e9).toFixed(0)} nm`, X(lp) + 6, Y(peakB) - 6, "#ffd166", "left", "600 12px"); }
  else T2(c, `peak at ${(lp * 1e9).toFixed(0)} nm: off the right of the graph (infrared)`, x1, y0 + 20, "#ffd166", "right", "600 12px");
  T2(c, `${S.name}: T = ${Math.round(S.T).toLocaleString()} K`, x0 + 10, y0 + 20, "#eef2f8", "left", "600 14px");
  T2(c, `each m² gives out σT⁴ = ${K.sig(SIGMA * S.T ** 4, 3)} W`, x0 + 10, y0 + 42, "#aab6cc"); T2(c, `whole star: L = 4πR²σT⁴ = ${K.sig(S.L * LSUN, 3)} W`, x0 + 10, y0 + 62, "#aab6cc");
}
function drawHR(c, w, h) {
  const x0 = 70, x1 = w - 30, y0 = 30, y1 = h - 50, lT0 = Math.log10(40000), lT1 = Math.log10(2500), X = T => x0 + (lT0 - Math.log10(T)) / (lT0 - lT1) * (x1 - x0), Y = L => y1 - (Math.log10(L) + 5) / 11 * (y1 - y0);
  // regions
  const band = (pts, col, lab, lx, ly) => { c.fillStyle = col; c.beginPath(); pts.forEach(([T, L], i) => i ? c.lineTo(X(T), Y(L)) : c.moveTo(X(T), Y(L))); c.closePath(); c.fill(); T2(c, lab, X(lx), Y(ly), "#aab6cc", "center", "600 12px"); };
  const ms = []; for (let m = 0.1; m <= 40; m *= 1.15) ms.push([tempFrom(msL(m), msR(m)), msL(m)]);
  c.strokeStyle = "rgba(127,227,160,0.25)"; c.lineWidth = 26; c.lineCap = "round"; c.beginPath(); ms.forEach(([T, L], i) => i ? c.lineTo(X(T), Y(L)) : c.moveTo(X(T), Y(L))); c.stroke(); T2(c, "main sequence", X(12000), Y(30), "#7fe3a0", "center", "600 12px");
  band([[5500, 30], [3000, 500], [3000, 5000], [5000, 300]], "rgba(255,138,112,0.15)", "giants", 4000, 400); band([[20000, 5e4], [3200, 5e4], [3200, 4e5], [20000, 4e5]], "rgba(255,93,108,0.12)", "supergiants", 7000, 2e5); band([[30000, 0.05], [6000, 1e-4], [5000, 3e-4], [30000, 0.3]], "rgba(111,177,255,0.15)", "white dwarfs", 15000, 3e-3);
  c.strokeStyle = "#7d8aa5"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke();
  for (const T of [30000, 10000, 6000, 4000, 3000]) T2(c, T.toLocaleString(), X(T), y1 + 16, "#7d8aa5", "center", "10.5px"); for (let e = -4; e <= 6; e += 2) T2(c, { "-4": "10⁻⁴", "-2": "10⁻²", "0": "1", "2": "10²", "4": "10⁴", "6": "10⁶" }[e], x0 - 6, Y(Math.pow(10, e)) + 4, "#7d8aa5", "right", "10.5px");
  T2(c, "surface temperature (K): hot on the left", (x0 + x1) / 2, y1 + 34, "#aab6cc", "center", "11.5px"); c.save(); c.translate(16, (y0 + y1) / 2); c.rotate(-Math.PI / 2); T2(c, "luminosity (× the Sun)", 0, 0, "#aab6cc", "center", "11.5px"); c.restore();
  for (const [nm, L, T, cl] of CAT) { c.fillStyle = bbColour(T); c.beginPath(); c.arc(X(T), Y(L), 4.5, 0, 6.3); c.fill(); T2(c, nm, X(T) + 7, Y(L) + 4, "#aab6cc", "left", "10.5px"); }
  // tracks: kept ones faint, this star bright, up to the present stage
  const track = (k, upto, col, wd) => { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); let first = true; for (let s = 0; s <= upto; s += 0.05) { const i = Math.min(Math.floor(s), k.length - 2), f = s - i; if (i < 0 || !k[i + 1]) break; const a = k[i], b = k[i + 1]; if (/Neutron|Black|Supernova/.test(b[0])) break; const L = Math.pow(10, Math.log10(a[2]) + (Math.log10(b[2]) - Math.log10(a[2])) * f), T = Math.pow(10, Math.log10(a[3]) + (Math.log10(b[3]) - Math.log10(a[3])) * f); if (T > 40000 || T < 2500) { first = true; continue; } first ? c.moveTo(X(T), Y(L)) : c.lineTo(X(T), Y(L)); first = false; } c.stroke(); };
  kept.forEach((q, i) => track(q.k, q.k.length - 1, ["#7d8aa5", "#9a86c9", "#c98686", "#86b7c9"][i], 1.5)); track(K2, P.s, "#ffd166", 2.5);
  const S = stateNow(); if (S.T <= 40000 && S.T >= 2500 && S.L > 1e-5) { c.fillStyle = "#fff"; c.beginPath(); c.arc(X(S.T), Y(S.L), 7, 0, 6.3); c.fill(); T2(c, S.name, X(S.T) + 10, Y(S.L) - 8, "#ffd166", "left", "600 12px"); }
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#04060c"; c.fillRect(0, 0, w, h); ({ life: drawLife, spec: drawSpec, hr: drawHR })[P.mode](c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (!(dt > 0) || !P.auto) return; const i = Math.floor(P.s), slow = /Main|White dwarf \(|Brown dwarf \(/.test(K2[Math.min(i, K2.length - 1)][0]) ? 0.12 : 0.35; P.s = Math.min(K2.length - 1, P.s + dt * speed * slow); if (P.s >= K2.length - 1) P.auto = false, ctl.auto.set(false); }, () => {
  draw(); if (frame++ % 5) return; const S = stateNow();
  ctl.s.set(P.s / (K2.length - 1)); endNote.textContent = `Main-sequence lifetime: ${P.M < 0.08 ? "none (never fuses hydrogen)" : fmtYears(lifetime(P.M))}. Ends as a ${remnant(P.M)}.`;
  if (P.mode === "life") {
    const pts = []; let age = 0; for (let s = 0; s <= K2.length - 1; s += 0.1) { const save = P.s; P.s = s; const q = stateNow(); P.s = save; pts.push([s, q.L, q.T, q.R]); }
    chA.opts.xLabel = "stage"; chA.opts.yLabel = "log₁₀ L (Suns) · T ÷ 10 000 K"; chB.opts.xLabel = "stage"; chB.opts.yLabel = "log₁₀ radius (Suns)"; chA.opts.xFmt = chB.opts.xFmt = whole(v => (K2[Math.round(v)] || [""])[0].split(" ")[0]);
    chA.draw([{ pts: pts.map(q => [q[0], Math.log10(q[1])]), color: "#ffd166", label: "log₁₀ luminosity" }, { pts: pts.map(q => [q[0], q[2] / 10000]), color: "#6fb1ff", label: "temperature ÷ 10 000 K" }], { xMin: 0, xMax: K2.length - 1, vlines: [{ x: P.s, color: "#fff" }] });
    chB.draw([{ pts: pts.map(q => [q[0], Math.log10(Math.max(1e-6, q[3]))]), color: "#ff8a70", label: "log₁₀ radius" }], { xMin: 0, xMax: K2.length - 1, vlines: [{ x: P.s, color: "#fff" }] });
  } else if (P.mode === "spec") {
    chA.opts.xFmt = chB.opts.xFmt = null; chA.opts.xLabel = "wavelength (nm)"; chA.opts.yLabel = "intensity (relative to the hottest)"; chB.opts.xLabel = "temperature (K)"; chB.opts.yLabel = "peak wavelength (nm)";
    const top = Math.max(...[3300, 5772, S.T].map(T => planck(Math.max(100e-9, WIEN / T), T))), sp = T => { const pts = []; for (let l = 100; l <= 3000; l += 25) pts.push([l, planck(l * 1e-9, T) / top]); return pts; };   // all three on the same scale: hotter is brighter at every wavelength
    chA.draw([{ pts: sp(3300), color: bbColour(3300), label: "3300 K", width: 1.3 }, { pts: sp(5772), color: bbColour(5772), label: "Sun", width: 1.3 }, { pts: sp(S.T), color: "#ffd166", width: 2.6, label: "this star now" }], { xMin: 100, xMax: 3000, yMin: 0, yMax: 1.05 });
    const wp = []; for (let T = 2500; T <= 30000; T += 500) wp.push([T, WIEN / T * 1e9]); chB.draw([{ pts: wp, color: "#7d8aa5", label: "λmax = b ÷ T" }, { pts: [[S.T, WIEN / S.T * 1e9]], type: "dots", color: "#ffd166", r: 6, label: "now" }], { xMin: 2500, xMax: 30000, yMin: 0, yMax: 1200 });
  } else {
    chA.opts.xFmt = chB.opts.xFmt = null; chA.opts.xLabel = "mass (Suns)"; chA.opts.yLabel = "log₁₀ lifetime (years)"; chB.opts.xLabel = "mass (Suns)"; chB.opts.yLabel = "log₁₀ luminosity";
    const lt = [], ml = []; for (let m = 0.1; m <= 40; m *= 1.1) { lt.push([m, Math.log10(lifetime(m))]); ml.push([m, Math.log10(msL(m))]); }
    chA.draw([{ pts: lt, color: "#ffd166", label: "10¹⁰ M^−2.5" }, { pts: [[P.M, Math.log10(lifetime(Math.max(0.1, P.M)))]], type: "dots", color: "#fff", r: 5 }], { xMin: 0, xMax: 40, hlines: [{ y: Math.log10(1.38e10), color: "#7d8aa5", label: "age of the universe" }] });
    chB.draw([{ pts: ml, color: "#7fe3a0", label: "main sequence L" }, { pts: [[P.M, Math.log10(msL(Math.max(0.1, P.M)))]], type: "dots", color: "#fff", r: 5 }], { xMin: 0, xMax: 40 });
  }
  read.set("age", fmtYears(S.age)); read.set("L", K.sig(S.L, 3) + " L☉"); read.set("T", Math.round(S.T).toLocaleString() + " K"); read.set("R", S.R < 1e-3 ? (S.R * RSUN / 1000).toFixed(0) + " km" : K.sig(S.R, 3) + " R☉"); read.set("lam", (WIEN / S.T * 1e9).toFixed(0) + " nm"); read.set("core", S.core.split(":")[0]);
  ui.hud(`<b>${S.name}</b><br>${fmtYears(S.age)} old`);
});
set({});
ui.tip("Press play to follow the star's life · switch to the spectrum or the H–R diagram at any time", 7000);
