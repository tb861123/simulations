/* =====================================================================
   THE PHOTOELECTRIC EFFECT
   Shine light on a clean metal and electrons can be knocked out of it.
   The surprise (around 1900) was WHICH light does it:

     * dim ultraviolet light frees electrons at once;
     * the brightest red light frees none at all, however long you wait;
     * brighter light frees MORE electrons, but not FASTER ones.

   Waves cannot explain this. Einstein (1905): light arrives in packets,
   PHOTONS, each with energy
                         E = h f   (h = 6.63 x 10^-34 J s)
   One photon gives all its energy to one electron. It takes at least
   the "work function" phi to get an electron out of the metal, so
       kinetic energy of the fastest electron = h f - phi
   and if h f < phi, nothing escapes.

   UNITS: energies in electronvolts (1 eV = 1.60 x 10^-19 J);
   a photon of wavelength lambda nm has energy 1240 / lambda eV.
   ===================================================================== */
const HC = 1240;                                   // h c in eV nm: photon energy (eV) = 1240 / wavelength (nm)
const H_EV = 4.136e-15;                            // Planck's constant in eV s
const METALS = { Cs: { name: "caesium", phi: 2.14, col: "#e8d9a8" }, K: { name: "potassium", phi: 2.30, col: "#d9d9e6" }, Na: { name: "sodium", phi: 2.36, col: "#e2e2ea" }, Ca: { name: "calcium", phi: 2.87, col: "#cfd3dc" }, Zn: { name: "zinc", phi: 4.30, col: "#b9c2cf" }, Cu: { name: "copper", phi: 4.65, col: "#d68a5c" }, Pt: { name: "platinum", phi: 5.65, col: "#e6e8ee" } };
const EFF = 0.25;                                  // share of photons above threshold that free an electron (most just warm the metal)
// the energy a freed electron leaves with: from 0 up to the maximum (most start a little way inside the metal and lose some on the way out)
const keOf = (kmax, u) => kmax * Math.sqrt(u);
// colour of light of a given wavelength (nm); ultraviolet is drawn violet-white, infrared dark red
function wlColour(nm) { let r, g, b; if (nm < 380) return [190, 150, 255]; if (nm < 440) { r = (440 - nm) / 60; g = 0; b = 1; } else if (nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; } else if (nm < 510) { r = 0; g = 1; b = (510 - nm) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; } else if (nm < 645) { r = 1; g = (645 - nm) / 65; b = 0; } else { r = 1; g = 0; b = 0; } const f = nm > 700 ? 0.5 : nm < 420 ? 0.4 + 0.6 * (nm - 380) / 40 : 1; return [r, g, b].map(v => Math.round(255 * Math.pow(v * f, 0.8))); }
const region = nm => nm < 400 ? "ultraviolet" : nm > 700 ? "infrared" : nm < 450 ? "violet" : nm < 495 ? "blue" : nm < 570 ? "green" : nm < 590 ? "yellow" : nm < 620 ? "orange" : "red";
/* The photocell current (in units of "electrons per photon arriving"): every electron freed with enough energy to get over the
   retarding voltage reaches the anode. With an accelerating voltage nearly all are collected; at 0 V some miss the anode. */
function current(nm, metal, V, I) { const kmax = HC / nm - METALS[metal].phi; if (kmax <= 0) return 0; const reach = V >= 0 ? 1 : Math.max(0, 1 - Math.pow(-V / kmax, 2)); const collect = V >= 0 ? 0.75 + 0.25 * Math.min(1, V / 1.5) : 0.75; return I * EFF * reach * collect; }    // with KE = kmax √u, the share with KE > e|V| is 1 − (|V|/kmax)²
const stopping = (nm, metal) => Math.max(0, HC / nm - METALS[metal].phi);

// ---------------- The page ----------------
let view = "cell", nm = 300, metal = "Zn", inten = 1, V = 0, rate = 1, photons = [], elec = [], flashes = [], counted = [], charge = -1, chargeSign = -1, ivlog = [], sweep = null, rnd = K.rng(Date.now() % 99991 + 29), tAll = 0;
const ui = K.app({
  title: "The Photoelectric Effect", subject: "Physics",
  blurb: "Light knocks electrons out of metal, but only the right colour of light",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "The photoelectric effect is not in Pearson Edexcel International GCSE Physics (4PH1). This level uses it for 4PH1 ideas: the electromagnetic spectrum and v = fλ, the dangers of ultraviolet, charge and current (Q = It).", adv: "WJEC Eduqas A level Physics: photons. E = hf, work function, threshold frequency, KE_max = hf − φ, stopping potential, the V_s–f graph, wave–particle duality." } },
  missions: [
    { title: "Red light does nothing", q: "A zinc plate in a vacuum tube, lit by bright red light. Any electrons? Turn the brightness right up. Wait. Now slide the wavelength down towards ultraviolet. At what wavelength do electrons first appear?", hint: "Red light frees no electrons however bright it is, and waiting does not help. Below about 290 nm (ultraviolet) electrons appear at once, even in dim light. For zinc the threshold is 1240 ÷ 4.30 = 288 nm. A wave would deliver energy steadily and should eventually free electrons with any colour; the experiment says otherwise.", setup() { set({ metal: "Zn", nm: 650, inten: 3 }); } },
    { title: "Brighter or bluer?", q: "Ultraviolet light on zinc. Double the brightness, then double it again. What happens to the NUMBER of electrons, and to their SPEED? Now keep the brightness fixed and shorten the wavelength.", hint: "Brighter light means more photons each second, so more electrons (more current), but each photon carries the same energy, so the fastest electrons are no faster. Shorter wavelength means higher frequency and more energetic photons, so faster electrons, but not more of them. Intensity sets the number; frequency sets the energy.", setup() { set({ metal: "Zn", nm: 240, inten: 1 }); } },
    { title: "Different metals", q: "Use green light (530 nm). Try each metal in turn. Which ones give electrons? Why are some metals photo-sensitive to visible light and others only to ultraviolet?", hint: "Green photons carry 1240 ÷ 530 = 2.34 eV. That is enough for caesium (2.14 eV) and potassium (2.30 eV) but not sodium, calcium, zinc, copper or platinum. Each metal holds its electrons with a different 'work function'. Light meters and old TV cameras used caesium because visible light works on it.", setup() { set({ metal: "Cs", nm: 530, inten: 1.5 }); } },
    { title: "The gold-leaf electroscope", q: "Switch to 'Electroscope'. A zinc plate on a negatively charged electroscope: the leaf stands out. Shine red light, then ultraviolet. What happens to the leaf? Now charge it positively and shine ultraviolet again.", hint: "With ultraviolet the negative electroscope slowly discharges and the leaf falls: electrons are knocked out of the zinc. Red light does nothing. A positively charged electroscope does not discharge: any electrons that do escape are pulled straight back by the positive charge. This was how Hertz and Hallwachs first saw the effect in 1887–88.", setup() { set({ view: "scope", metal: "Zn", nm: 650, inten: 2 }); } },
    { title: "Ultraviolet and you", q: "The lamp's wavelength slider runs from 200 nm to 700 nm. Which part is ultraviolet? Why is ultraviolet harmful to skin and eyes when visible light is not?", hint: "Below 400 nm is ultraviolet. Each ultraviolet photon carries more than 3 eV, enough to break chemical bonds and damage DNA in skin cells, causing sunburn and skin cancer, and to damage the eyes. Visible photons carry less, so they cannot do this damage one at a time. This is why sunscreen and sunglasses block UV.", setup() { set({ metal: "Zn", nm: 250, inten: 1 }); } },
    { lvl: "adv", title: "Stopping the electrons", q: "Ultraviolet (250 nm) on zinc. Make the anode voltage negative, so it pushes electrons back. Find the voltage at which the current just stops. How does it relate to the energy of the fastest electrons?", hint: "The current falls to zero at the stopping potential V_s, about −0.66 V here: the fastest electrons (KE_max = hf − φ = 4.96 − 4.30 = 0.66 eV) only just fail to reach the anode, so e V_s = KE_max. Measuring V_s is how KE_max is found in practice. Press 'Sweep the voltage' to trace the whole I–V curve.", setup() { set({ metal: "Zn", nm: 250, inten: 2, V: 0 }); } },
    { lvl: "adv", title: "Millikan's measurement of h", q: "For one metal, find the stopping potential at several wavelengths and plot them against frequency (the batch run 'Millikan' does this for you). What is the gradient, and where does the line cross the axis?", hint: "A straight line: V_s = (h/e) f − φ/e. Its gradient is h/e = 4.14 × 10⁻¹⁵ V s, the same for every metal, and it crosses the frequency axis at the threshold frequency f₀ = φ/h. Millikan set out in 1914–16 to prove Einstein wrong, and instead measured h to within 0.5%.", setup() { set({ metal: "Na", nm: 400, inten: 2 }); } },
    { lvl: "adv", title: "No waiting", q: "Make the light very dim. Electrons still appear the moment light arrives, just fewer of them. Why does this rule out the wave model?", hint: "Spread evenly as a wave, very dim light would deliver energy to each electron so slowly that it would take minutes or hours to collect the few eV needed. Yet photoelectrons appear within 10⁻⁹ s. With photons, the first electron appears as soon as the first suitable photon is absorbed: dim light just means photons are rare. The batch run 'Waiting for the first electron' compares the two.", setup() { set({ metal: "K", nm: 400, inten: 0.15 }); } }
  ],
  batch: [
    { title: "Millikan: stopping potential against frequency", question: "How does the stopping potential depend on the frequency of the light?", how: "Each run: sodium lit at the chosen frequency; the anode voltage is lowered in 0.01 V steps until the measured current (with a little meter noise) falls to zero.", xLabel: "frequency (×10¹⁴ Hz)", yLabel: "stopping potential (V)", xs: [6, 7, 8, 9, 10, 11, 12, 13], reps: 5, fit: true, theory: f => Math.max(0, H_EV * f * 1e14 - METALS.Na.phi), theoryLabel: "V_s = hf/e − φ/e", run(f, r) { const lam = 3e17 / (f * 1e14); for (let v = 0; v > -6; v -= 0.01) if (current(lam, "Na", v, 1) + 0.0015 * r.gauss() < 0.002) return -v; return 6; }, note: "The gradient is h/e: multiply by e (1.60 × 10⁻¹⁹ C) to get h. Below the threshold (5.7 × 10¹⁴ Hz for sodium) the stopping potential is zero, so those points are left off the fit line in a real analysis." },
    { title: "More light, more current", question: "How does the photocurrent depend on the brightness of the light?", how: "Each run: zinc in 250 nm ultraviolet, anode at +2 V; electrons are counted for one second (they arrive at random).", xLabel: "brightness (photons, × standard)", yLabel: "electrons collected per second (thousands)", xs: [0.25, 0.5, 1, 1.5, 2, 3, 4], reps: 5, yMin: 0, fit: true, theory: x => current(250, "Zn", 2, x) * 40, theoryLabel: "proportional", run: (x, r) => { const mu = current(250, "Zn", 2, x) * 40000; return Math.max(0, mu + Math.sqrt(mu) * r.gauss()) / 1000; } },
    { title: "Brightness and electron energy", question: "Does brighter light give faster electrons?", how: "Each run: zinc in 250 nm ultraviolet at the chosen brightness; the stopping potential is found as in Millikan's experiment.", xLabel: "brightness (× standard)", yLabel: "stopping potential (V)", xs: [0.25, 0.5, 1, 1.5, 2, 3, 4], reps: 5, yMin: 0, yMax: 1.2, theory: () => stopping(250, "Zn"), theoryLabel: "hf/e − φ/e", run(x, r) { for (let v = 0; v > -3; v -= 0.01) if (current(250, "Zn", v, x) + 0.0015 * r.gauss() < 0.002) return -v; return 3; }, note: "Flat: brightness changes how many photons arrive, not how much energy each carries. The wave model predicted the opposite." },
    { title: "Threshold wavelength", question: "What is the longest wavelength that frees electrons from each metal?", how: "Each run: the wavelength is raised in 1 nm steps until no electrons are freed. The metals' work functions are on the horizontal axis.", xLabel: "work function (eV)", yLabel: "threshold wavelength (nm)", xs: [2.14, 2.30, 2.36, 2.87, 4.30, 4.65, 5.65], reps: 3, yMin: 0, theory: phi => HC / phi, theoryLabel: "λ₀ = hc/φ", run(phi, r) { const m = Object.keys(METALS).find(k => METALS[k].phi === phi); for (let w = 150; w < 1000; w++) if (current(w, m, 2, 1) <= 0) return w - 1 + r(); return null; } },
    { title: "Waiting for the first electron", question: "In very dim light, how long until the first electron is freed?", how: "Each run: potassium in dim violet light (400 nm) delivering 10⁻⁹ W to the plate. Photons arrive at random; each has a 25% chance of freeing an electron. The result is the time to the first electron.", xLabel: "", yLabel: "time to the first electron (nanoseconds)", reps: 400, bins: 24, lo: 0, hi: 12, theory: 1 / (1e-9 / (HC / 400 * 1.6e-19) * EFF) * 1e9, theoryLabel: "average", run: (x, r) => -Math.log(1 - r()) / (1e-9 / (HC / 400 * 1.6e-19) * EFF) * 1e9, note: "Almost at once: a few billionths of a second. If the same energy were spread evenly as a wave over the 10¹⁵ or so atoms on the lit surface, each electron would take years to gather 2.3 eV." },
    { title: "Energies of the electrons", question: "Do all the freed electrons come out with the same energy?", how: "Each run: one electron freed from sodium by 300 nm light; its kinetic energy is recorded.", xLabel: "", yLabel: "kinetic energy (eV)", reps: 600, bins: 20, lo: 0, hi: 2, theory: HC / 300 - METALS.Na.phi, theoryLabel: "KE_max = hf − φ", run: (x, r) => keOf(HC / 300 - METALS.Na.phi, r()), note: "There is a spread, up to a sharp maximum. Electrons from below the surface lose energy on the way out; only those from the very surface leave with hf − φ. That is why the equation is for the MAXIMUM kinetic energy." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 3(b)", text: "The electromagnetic spectrum, in order of increasing frequency: radio, microwaves, infrared, visible, ultraviolet, X-rays, gamma rays. All travel at 3 × 10⁸ m/s in a vacuum; v = fλ." },
      { lvl: "std", tag: "4PH1 3(b)", text: "Ultraviolet can damage surface cells and eyes and cause skin cancer; it is used in fluorescent lamps and to detect forged banknotes." },
      { lvl: "std", tag: "4PH1 2", text: "Current is the rate of flow of charge: Q = It. Electrons are negatively charged." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Light can behave as particles (photons). Shining light of high enough frequency on a metal frees electrons: the photoelectric effect." },
      { lvl: "adv", tag: "A level Eduqas", text: "Photon energy E = hf = hc/λ. One photon gives all its energy to one electron." },
      { lvl: "adv", tag: "A level Eduqas", text: "Work function φ: the minimum energy needed to free an electron from the surface. Threshold frequency f₀ = φ/h; below it no electrons are emitted whatever the intensity." },
      { lvl: "adv", tag: "A level Eduqas", text: "KE_max = hf − φ = eV_s, where V_s is the stopping potential. A graph of V_s against f has gradient h/e and intercept −φ/e." },
      { lvl: "adv", tag: "A level Eduqas", text: "Intensity sets the number of photons per second (and so the photocurrent), not the energy of each photon. Emission is immediate. These facts support the particle model of light." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `The lamp gives light of wavelength ${nm} nm (${nm} × 10⁻⁹ m). Calculate its frequency, and name the part of the electromagnetic spectrum it is in. (speed of light = 3.0 × 10⁸ m/s)`, ans: () => `<ul><li>f = v ÷ λ = 3.0 × 10⁸ ÷ ${nm} × 10⁻⁹</li><li>= ${(3e8 / (nm * 1e-9)).toExponential(2)} Hz</li><li>${region(nm)}${nm >= 400 && nm <= 700 ? " (visible light)" : ""}</li></ul>` },
      { lvl: "std", marks: 2, q: "Give two harmful effects of ultraviolet radiation on the human body.", ans: "<ul><li>Damage to surface cells / sunburn / skin cancer</li><li>Damage to the eyes (e.g. cataracts)</li></ul>" },
      { lvl: "std", marks: 3, q: "A photocell gives a current of 2.0 × 10⁻⁶ A. Calculate the charge that flows in 5 minutes.", ans: "<ul><li>Q = It</li><li>= 2.0 × 10⁻⁶ × 300</li><li>= 6.0 × 10⁻⁴ C</li></ul>" },
      { lvl: "std", marks: 2, q: "A zinc plate on a negatively charged electroscope loses its charge when ultraviolet light shines on it, but not with red light. Suggest what the ultraviolet light does to the zinc.", ans: "<ul><li>It knocks electrons out of the zinc (the negative charge leaves)</li><li>Red light does not have enough energy (per photon) to do this</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Light of wavelength ${nm} nm falls on ${METALS[metal].name} (work function ${METALS[metal].phi} eV). Calculate the maximum kinetic energy of the emitted electrons in eV, or explain why none are emitted.`, ans: () => { const E = HC / nm, k = E - METALS[metal].phi; return `<ul><li>E = hc/λ = (6.63 × 10⁻³⁴ × 3.0 × 10⁸) ÷ ${nm} × 10⁻⁹ = ${(E * 1.6e-19).toExponential(2)} J = ${E.toFixed(2)} eV</li>` + (k > 0 ? `<li>KE_max = hf − φ = ${E.toFixed(2)} − ${METALS[metal].phi}</li><li>= ${k.toFixed(2)} eV</li></ul>` : `<li>${E.toFixed(2)} eV is less than the work function (${METALS[metal].phi} eV)</li><li>so no electrons are emitted, however intense the light</li></ul>`); } },
      { lvl: "adv", marks: 3, q: "Calculate the threshold frequency for zinc (work function 4.30 eV).", ans: "<ul><li>φ = 4.30 × 1.60 × 10⁻¹⁹ = 6.88 × 10⁻¹⁹ J</li><li>f₀ = φ/h = 6.88 × 10⁻¹⁹ ÷ 6.63 × 10⁻³⁴</li><li>= 1.04 × 10¹⁵ Hz</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how the photoelectric effect provides evidence for the particle nature of light.", ans: "<ul><li>There is a threshold frequency below which no electrons are emitted, however intense the light; a wave model predicts emission at any frequency given enough intensity / time</li><li>KE_max depends on frequency, not intensity</li><li>Emission is instantaneous even at low intensity; a wave model predicts a delay</li><li>Explained if light comes in photons of energy hf, each interacting with one electron</li></ul>" },
      { lvl: "adv", marks: 3, q: "In a stopping-potential experiment the gradient of a graph of V_s against f is 4.1 × 10⁻¹⁵ V s. Calculate a value for Planck's constant.", ans: "<ul><li>gradient = h/e</li><li>h = 4.1 × 10⁻¹⁵ × 1.60 × 10⁻¹⁹</li><li>= 6.6 × 10⁻³⁴ J s</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Photons:</b> each has energy E = 1240 ÷ λ(nm) electronvolts. Brightness sets how many arrive each second.</li>
<li><b>Freeing an electron:</b> a photon with E above the metal's work function frees one electron with a 25% chance (otherwise it just warms the metal). The electron leaves with kinetic energy between 0 and E − φ: the maximum for electrons from the very surface, less for those from deeper.</li>
<li><b>The photocell:</b> with a negative anode voltage V an electron only reaches the anode if its kinetic energy exceeds e|V|. With a positive voltage nearly all are collected; at 0 V about a quarter miss the anode.</li>
<li><b>The electroscope:</b> the leaf's angle shows the plate's charge. Each electron that escapes a negative plate removes a little charge; a positive plate pulls escaping electrons back.</li>
<li><b>Work functions</b> are typical values for clean surfaces: Cs 2.14, K 2.30, Na 2.36, Ca 2.87, Zn 4.30, Cu 4.65, Pt 5.65 eV.</li></ul>
<h3>Simplifications</h3>
<ul><li>Only a tiny sample of the photons and electrons is drawn; the meter readings are calculated from the formulas above.</li>
<li>Real metals' work functions depend on the surface, which oxidises in air: real experiments use a vacuum and freshly cleaned metal.</li>
<li>The share of photons that free electrons (the quantum efficiency) is set to 25% for all metals and wavelengths; real values are far smaller and vary.</li>
<li>Contact potentials between the two electrodes, which shift measured stopping potentials in real photocells, are ignored.</li>
<li>Hydrogen energy levels and spectra are in the Atomic Spectra simulation.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/photoelectric-effect.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("");
ctl.view = K.seg(g, { value: "cell", options: [["cell", "Photocell"], ["scope", "Electroscope"]], on: v => { ui.mission(null); view = v; showView(); } });
g = ui.group("The light");
ctl.nm = K.slider(g, { label: "Wavelength", min: 200, max: 700, step: 1, value: nm, fmt: v => v + " nm (" + region(v) + ")", on: v => { nm = v; } });
ctl.inten = K.slider(g, { label: "Brightness", min: 0, max: 4, step: 0.05, value: 1, fmt: v => v === 0 ? "off" : "× " + v.toFixed(2), on: v => { inten = v; } });
const photonNote = K.note(g, "");
g = ui.group("The metal");
ctl.metal = K.seg(g, { value: "Zn", options: [["Cs", "Cs"], ["K", "K"], ["Na", "Na"], ["Ca", "Ca"], ["Zn", "Zn"], ["Cu", "Cu"], ["Pt", "Pt"]], on: v => { metal = v; } });
const cellGroup = g = ui.group("The circuit");
ctl.V = K.slider(g, { label: "Anode voltage", min: -5, max: 3, step: 0.01, value: 0, fmt: v => (v > 0 ? "+" : "") + v.toFixed(2) + " V" + (v < 0 ? " (pushes electrons back)" : ""), on: v => { V = v; } });
let r1 = K.row(g); K.btn(r1, "Sweep the voltage", () => { sweep = 3; ivlog = []; }, "primary"); K.btn(r1, "Clear graph", () => { ivlog = []; });
const scopeGroup = g = ui.group("The electroscope");
r1 = K.row(g); K.btn(r1, "Charge it negative", () => { charge = -1; chargeSign = -1; }); K.btn(r1, "Charge it positive", () => { charge = 1; chargeSign = 1; });
g = ui.group("Watch");
ctl.rate = K.slider(g, { label: "Slow motion", min: 0.2, max: 2, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => rate = v });
ui.headerSpeed(ctl.rate);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["E", "photon energy"], ["phi", "work function"], ["k", "fastest electron"], ["I", "current"], ["Vs", "stopping potential"], ["f", "frequency"]]);
function showView() { cellGroup.style.display = view === "cell" ? "" : "none"; scopeGroup.style.display = view === "scope" ? "" : "none"; ctl.view.set(view); photons = []; elec = []; }
function set(o) { view = o.view || "cell"; nm = o.nm || 300; metal = o.metal || "Zn"; inten = o.inten == null ? 1 : o.inten; V = o.V || 0; ctl.nm.set(nm); ctl.metal.set(metal); ctl.inten.set(inten); ctl.V.set(V); charge = -1; chargeSign = -1; ivlog = []; sweep = null; showView(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function geo() { const w = cv.w, h = cv.h; return view === "cell" ? { w, h, lx: w * 0.12, ly: h * 0.16, px: w * 0.3, py: h * 0.5, ph: h * 0.42, ax: w * 0.72 } : { w, h, lx: w * 0.14, ly: h * 0.14, px: w * 0.4, py: h * 0.36, ph: h * 0.2, ax: w * 0.9 }; }
function draw(dt) {
  const c = cv.ctx, G = geo(), { w, h, lx, ly, px, py, ph, ax } = G, col = wlColour(nm), E = HC / nm, phi = METALS[metal].phi, kmax = E - phi;
  c.fillStyle = "#060910"; c.fillRect(0, 0, w, h);
  // the beam
  if (inten > 0) { const gr = c.createLinearGradient(lx, ly, px, py); gr.addColorStop(0, `rgba(${col.join()},${0.32 * Math.min(1, inten)})`); gr.addColorStop(1, `rgba(${col.join()},${0.1 * Math.min(1, inten)})`); c.fillStyle = gr; c.beginPath(); c.moveTo(lx + 16, ly - 10); c.lineTo(px, py - ph / 2); c.lineTo(px, py + ph / 2); c.lineTo(lx - 6, ly + 18); c.fill(); }
  // the lamp
  c.fillStyle = "#2a3246"; c.beginPath(); c.roundRect(lx - 40, ly - 26, 60, 46, 8); c.fill(); c.fillStyle = inten > 0 ? `rgb(${col.join()})` : "#333"; c.shadowColor = c.fillStyle; c.shadowBlur = inten > 0 ? 24 : 0; c.beginPath(); c.arc(lx + 12, ly, 11, 0, 6.3); c.fill(); c.shadowBlur = 0;
  c.fillStyle = "#cfd8ea"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(nm + " nm · " + E.toFixed(2) + " eV per photon", lx + 6, ly - 34);
  if (view === "cell") {
    // the evacuated glass tube with cathode (metal) and anode
    c.strokeStyle = "rgba(190,215,255,.45)"; c.lineWidth = 2; c.beginPath(); c.ellipse((px + ax) / 2, py, (ax - px) / 2 + 50, ph / 2 + 46, 0, 0, 6.3); c.stroke(); c.fillStyle = "rgba(150,180,230,.04)"; c.fill();
    c.fillStyle = METALS[metal].col; c.beginPath(); c.moveTo(px - 10, py - ph / 2); c.quadraticCurveTo(px + 22, py, px - 10, py + ph / 2); c.lineTo(px - 18, py + ph / 2); c.quadraticCurveTo(px + 14, py, px - 18, py - ph / 2); c.fill();
    c.fillStyle = "#9aa4b8"; c.fillRect(ax - 3, py - ph * 0.32, 6, ph * 0.64);
    c.fillStyle = "#cfd8ea"; c.font = "11.5px Segoe UI,sans-serif"; c.fillText(METALS[metal].name + " (φ = " + phi + " eV)", px - 10, py + ph / 2 + 18); c.fillText("anode", ax, py + ph * 0.32 + 16); c.fillText("vacuum", (px + ax) / 2, py - ph / 2 - 26);
    // circuit: wires, battery, ammeter
    const by = py + ph / 2 + 70, I = current(nm, metal, V, inten); c.strokeStyle = "#7d889e"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(px - 14, py + ph / 2); c.lineTo(px - 14, by); c.lineTo(ax, by); c.lineTo(ax, py + ph * 0.32); c.stroke();
    const mx = (px + ax) / 2 - 70, bx2 = (px + ax) / 2 + 70; c.fillStyle = "#1b2433"; c.strokeStyle = "#9aa4b8"; c.beginPath(); c.arc(mx, by, 24, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("A", mx, by - 6); c.font = "600 12px Consolas,monospace"; c.fillStyle = "#7fe3a0"; c.fillText((I * 40).toFixed(2) + " nA", mx, by + 12);
    c.fillStyle = "#1b2433"; c.fillRect(bx2 - 30, by - 16, 60, 32); c.strokeRect(bx2 - 30, by - 16, 60, 32); c.fillStyle = V >= 0 ? "#7fe3a0" : "#ff8a70"; c.fillText((V > 0 ? "+" : "") + V.toFixed(2) + " V", bx2, by + 5); c.fillStyle = "#aab6cc"; c.font = "10.5px Segoe UI,sans-serif"; c.fillText("anode voltage", bx2, by + 30);
  } else {
    // electroscope: zinc plate on a rod, gold leaf whose angle shows the charge
    const leaf = Math.abs(charge) * 0.9, cx = px, rodTop = py + ph / 2 + 6, boxY = rodTop + 70;
    c.fillStyle = METALS[metal].col; c.fillRect(cx - 80, py - 4, 160, 10); c.fillStyle = "#b8a060"; c.fillRect(cx - 3, py + 6, 6, 140);
    c.strokeStyle = "rgba(200,215,240,.5)"; c.lineWidth = 2; c.beginPath(); c.roundRect(cx - 90, boxY, 180, 140, 10); c.stroke(); c.fillStyle = "rgba(150,180,230,.05)"; c.fill();
    c.fillStyle = "#ffd36a"; c.save(); c.translate(cx + 3, py + 120); c.rotate(-leaf); c.fillRect(0, 0, 4, 64); c.restore();
    c.fillStyle = "#cfd8ea"; c.font = "600 12px Segoe UI,sans-serif"; c.fillText(METALS[metal].name + " plate", cx, py - 14); c.fillText("gold leaf", cx + 64, py + 200);
    const sign = chargeSign < 0 ? "−" : "+"; c.fillStyle = chargeSign < 0 ? "#8ac6ff" : "#ff8a8a"; c.font = "600 14px Segoe UI,sans-serif"; for (let k = 0; k < Math.round(Math.abs(charge) * 8); k++) c.fillText(sign, cx - 70 + k * 20, py + 22);
    c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(Math.abs(charge) < 0.05 ? "discharged: the leaf has fallen" : chargeSign < 0 ? "charged negative" : "charged positive", cx + 110, boxY + 70); c.textAlign = "center";
  }
  // photons: little wave packets travelling from the lamp to the metal
  c.lineWidth = 1.6; c.strokeStyle = `rgb(${col.join()})`;
  for (const q of photons) { const x = lx + (q.tx - lx) * q.f, y = ly + (q.ty - ly) * q.f, dx = q.tx - lx, dy = q.ty - ly, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; c.beginPath(); for (let s = -14; s <= 14; s += 1.5) { const a = Math.sin(s * 2 * Math.PI / (6 + nm / 60)) * 4 * Math.exp(-(s * s) / 70); const X = x + ux * s - uy * a, Y = y + uy * s + ux * a; s === -14 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.stroke(); }
  // electrons
  c.fillStyle = "#8ac6ff"; for (const e of elec) { c.beginPath(); c.arc(e.x, e.y, 3, 0, 6.3); c.fill(); }
  c.globalCompositeOperation = "lighter"; for (let k = flashes.length - 1; k >= 0; k--) { const f = flashes[k]; c.fillStyle = `rgba(${f.c},${f.l})`; c.beginPath(); c.arc(f.x, f.y, 4 + (1 - f.l) * 10, 0, 6.3); c.fill(); f.l -= dt * 3; if (f.l <= 0) flashes.splice(k, 1); } c.globalCompositeOperation = "source-over";
  // energy bar: photon energy against the work function
  const bx = w - 190, by0 = 30, bh = 150, sc = bh / 7; c.fillStyle = "rgba(8,14,26,.82)"; c.beginPath(); c.roundRect(bx - 14, by0 - 18, 190, bh + 62, 9); c.fill();
  c.fillStyle = "#aab6cc"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("one photon's energy", bx, by0 - 2);
  const base = by0 + 8 + bh; c.fillStyle = `rgb(${col.join()})`; c.fillRect(bx, base - Math.min(7, E) * sc, 46, Math.min(7, E) * sc); c.fillStyle = "#5b6578"; c.fillRect(bx + 70, base - phi * sc, 46, phi * sc); if (kmax > 0) { c.fillStyle = "#8ac6ff"; c.fillRect(bx + 70, base - E * sc, 46, kmax * sc); }
  c.fillStyle = "#eef2f8"; c.font = "11px Segoe UI,sans-serif"; c.fillText(E.toFixed(2) + " eV", bx, base + 14); c.fillText("φ " + phi + " eV", bx + 70, base + 14); c.fillStyle = kmax > 0 ? "#8ac6ff" : "#ff8a70"; c.font = "600 12px Segoe UI,sans-serif"; c.fillText(kmax > 0 ? "KE max " + kmax.toFixed(2) + " eV" : "too little: no electrons", bx, base + 34);
}
function step(dt) {
  const G = geo(), E = HC / nm, kmax = E - METALS[metal].phi;
  if (view === "scope" && chargeSign < 0 && charge < 0 && kmax > 0) charge = Math.min(0, charge + 0.05 * inten * dt * rate);   /* the plate loses charge steadily while electrons escape */
  tAll += dt;
  if (sweep != null) { V = sweep; ctl.V.set(V); sweep -= dt * 1.6; ivlog.push([V, current(nm, metal, V, inten) * 40 * (1 + 0.02 * rnd.gauss())]); if (sweep < -5) sweep = null; }
  // new photons: the number drawn grows with brightness
  const n = inten * 26 * dt * rate; for (let k = 0; k < Math.floor(n) + (rnd() < n % 1 ? 1 : 0); k++) photons.push({ f: 0, ty: G.py + (rnd() - .5) * G.ph * 0.9, tx: view === "scope" ? G.px + (rnd() - .5) * 150 : G.px });
  for (let i = photons.length - 1; i >= 0; i--) { const q = photons[i]; q.f += dt * rate * 1.1; if (q.f < 1) continue; photons.splice(i, 1);
    const x = view === "scope" ? q.tx : G.px + 4, y = view === "scope" ? G.py - 6 : q.ty;
    if (kmax > 0 && rnd() < EFF * 2.4) {      // more electrons are drawn than the true 25%, so that dim light still shows something
      const ke = keOf(kmax, rnd()), sp = 160 * Math.sqrt(ke) + 8;
      if (view === "scope" && chargeSign > 0) { elec.push({ x, y, vx: (rnd() - .5) * sp, vy: -sp * 0.7, back: true, t: 0 }); }
      else { if (view === "scope") elec.push({ x, y, vx: (rnd() - .5) * sp, vy: -sp, ke, t: 0 }); else elec.push({ x, y, vx: sp, vy: (rnd() - .5) * 40, ke, t: 0 }); }
    } else flashes.push({ x, y, l: 0.6, c: wlColour(nm).join() });
  }
  // electrons cross the gap; a negative anode voltage slows them, and turns back any without enough energy
  const gap = G.ax - G.px; for (let i = elec.length - 1; i >= 0; i--) { const e = elec[i]; e.t += dt;
    if (view === "cell") { e.vx += V * (160 * 160 / 2) / gap * dt * rate;   /* constant field: an electron with KE (eV) just reaches the anode if KE > −V, as in the formula */ e.x += e.vx * dt * rate; e.y += e.vy * dt * rate * 0.3; if (e.x >= G.ax) { elec.splice(i, 1); flashes.push({ x: G.ax, y: e.y, l: 0.8, c: "138,198,255" }); } else if (e.x < G.px) elec.splice(i, 1); }
    else { if (e.back) e.vy += 400 * dt * rate; e.x += e.vx * dt * rate; e.y += e.vy * dt * rate; if (e.back && e.y > G.py - 4 && e.vy > 0) elec.splice(i, 1); else if (e.t > 3 || e.y < -10 || e.x > G.w) elec.splice(i, 1); }
  }
  if (elec.length > 400) elec.splice(0, elec.length - 400);
}
const chI = K.chart(ui.dock, { title: "Current against anode voltage", xLabel: "anode voltage (V)", yLabel: "current (nA)", yMin: 0 });
const chK = K.chart(ui.dock, { title: "Fastest electron against frequency", xLabel: "frequency (×10¹⁴ Hz)", yLabel: "KE max (eV)" });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => step(Math.min(dt, 0.05)), dt => {
  draw(Math.min(dt, 0.05)); if (frame++ % 6) return;
  const E = HC / nm, phi = METALS[metal].phi, kmax = E - phi, f14 = 3e17 / nm / 1e14, adv = ui.level === "adv";
  const th = []; for (let v = -5; v <= 3; v += 0.02) th.push([v, current(nm, metal, v, inten) * 40]);
  chI.draw([{ pts: th, color: K.cssVar("--s1"), dash: [5, 4], label: "theory now" }, { pts: ivlog, type: "dots", color: K.cssVar("--s0"), r: 2, alpha: .6, label: "sweep" }, { pts: [[V, current(nm, metal, V, inten) * 40]], type: "dots", color: "#fff", r: 5 }], { xMin: -5, xMax: 3, yMax: Math.max(10, inten * EFF * 40 * 1.1), vlines: kmax > 0 ? [{ x: -kmax, label: "−V_s", color: "#ff8a70" }] : [] });
  const lines = Object.entries(METALS).map(([k, m], i) => ({ pts: [[adv ? 0 : m.phi / H_EV / 1e14, adv ? -m.phi : 0], [15, H_EV * 15e14 - m.phi]], dash: adv ? [] : [], color: k === metal ? "#fff" : `hsla(${i * 50},60%,65%,.6)`, width: k === metal ? 2.2 : 1.2, label: k === metal ? m.name : "" }));
  chK.draw((adv ? Object.values(METALS).map((m, i) => ({ pts: [[0, -m.phi], [m.phi / H_EV / 1e14, 0]], color: "rgba(255,255,255,.18)", dash: [3, 4] })) : []).concat(lines).concat([{ pts: [[f14, Math.max(0, kmax)]], type: "dots", color: `rgb(${wlColour(nm).join()})`, r: 6 }]), { xMin: adv ? 0 : 4, xMax: 15, yMin: adv ? -6 : 0, yMax: 4, hlines: adv ? [{ y: 0, color: "rgba(255,255,255,.35)" }] : [] });
  read.set("E", E.toFixed(2) + " eV = " + (E * 1.602e-19).toExponential(2) + " J"); read.set("phi", phi + " eV"); read.set("k", kmax > 0 ? kmax.toFixed(2) + " eV" : "none freed"); read.set("I", (current(nm, metal, V, inten) * 40).toFixed(2) + " nA"); read.set("Vs", kmax > 0 ? kmax.toFixed(2) + " V" : "–"); read.set("f", f14.toFixed(2) + " × 10¹⁴ Hz");
  photonNote.innerHTML = `Each photon carries <b>${E.toFixed(2)} eV</b>; ${METALS[metal].name} needs <b>${phi} eV</b>. ${kmax > 0 ? "Enough: electrons are freed." : "Not enough: no electrons, however bright."}`;
  if (view === "scope" && chargeSign < 0 && Math.abs(charge) < 0.01) charge = 0;
  ui.hud("");
});
set({});
ui.tip("Each wiggle is one photon · each blue dot is one electron knocked out of the metal", 8000);
