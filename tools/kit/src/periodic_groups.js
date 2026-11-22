/* =====================================================================
   GROUPS 1 AND 7
   GROUP 1 (alkali metals) react with water:
       2M + 2H₂O → 2MOH + H₂     (an alkaline solution and hydrogen)
   They get MORE reactive down the group: the outer electron is further
   from the nucleus and shielded by more inner shells, so it is lost
   more easily.
   GROUP 7 (halogens) get LESS reactive down the group: the atoms are
   bigger, so the nucleus attracts an extra electron less strongly.
   A more reactive halogen DISPLACES a less reactive one from its salt:
       Cl₂ + 2KBr → 2KCl + Br₂
   Both trends have the same cause: bigger atoms, more shielding, a
   weaker pull from the nucleus on the outer shell.
   Data: CRC Handbook values (francium and astatine are estimates).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// Group 1: Ar, density (g/cm³), m.p., b.p. (°C), metallic radius (pm), first IE (kJ/mol), shrink speed at 20 °C (mm/s), ΔH per mole of metal (kJ), flame colour
const G1 = {
  Li: { name: "lithium", Z: 3, Ar: 6.94, rho: 0.534, mp: 181, bp: 1342, r: 152, ie: 520, v: 0.05, dH: -222, flame: "#e0225a", flameName: "crimson" },
  Na: { name: "sodium", Z: 11, Ar: 22.99, rho: 0.968, mp: 98, bp: 883, r: 186, ie: 496, v: 0.15, dH: -184, flame: "#ffb030", flameName: "yellow-orange" },
  K: { name: "potassium", Z: 19, Ar: 39.10, rho: 0.862, mp: 63.5, bp: 759, r: 227, ie: 419, v: 0.6, dH: -197, flame: "#c8a2ff", flameName: "lilac" },
  Rb: { name: "rubidium", Z: 37, Ar: 85.47, rho: 1.532, mp: 39.3, bp: 688, r: 248, ie: 403, v: 2, dH: -195, flame: "#d0305a", flameName: "red-violet" },
  Cs: { name: "caesium", Z: 55, Ar: 132.9, rho: 1.93, mp: 28.4, bp: 671, r: 265, ie: 376, v: 5, dH: -203, flame: "#7a6cff", flameName: "blue-violet" },
  Fr: { name: "francium (estimates)", Z: 87, Ar: 223, rho: 1.87, mp: 27, bp: 677, r: 270, ie: 393, est: true }
};
const G2 = { Be: { name: "beryllium", r: 112, ie: 900, mp: 1287, bp: 2469, rho: 1.85 }, Mg: { name: "magnesium", r: 160, ie: 738, mp: 650, bp: 1091, rho: 1.74 }, Ca: { name: "calcium", r: 197, ie: 590, mp: 842, bp: 1484, rho: 1.55 }, Sr: { name: "strontium", r: 215, ie: 549, mp: 777, bp: 1382, rho: 2.64 }, Ba: { name: "barium", r: 222, ie: 503, mp: 727, bp: 1870, rho: 3.51 } };
// Group 7: m.p., b.p. (°C), covalent radius (pm), electronegativity, E° (V), colours
const G7 = {
  F: { name: "fluorine", Z: 9, mp: -220, bp: -188, r: 71, en: 3.98, E: 2.87, ie: 1681, gas: "#f2f0a0", liq: "#f5e66a", sol: "#f5e66a" },
  Cl: { name: "chlorine", Z: 17, mp: -101, bp: -34, r: 99, en: 3.16, E: 1.36, ie: 1251, gas: "#c8e86a", liq: "#d8d040", sol: "#e0d860", aq: [210, 230, 160], hex: [235, 235, 220] },
  Br: { name: "bromine", Z: 35, mp: -7, bp: 59, r: 114, en: 2.96, E: 1.09, ie: 1140, gas: "#b8501e", liq: "#8a2a10", sol: "#7a2a14", aq: [235, 140, 40], hex: [220, 80, 30] },
  I: { name: "iodine", Z: 53, mp: 114, bp: 184, r: 133, en: 2.66, E: 0.54, ie: 1008, gas: "#9b3fcf", liq: "#4a1a40", sol: "#3a3a48", aq: [150, 90, 40], hex: [150, 60, 190] },
  At: { name: "astatine (estimates)", Z: 85, mp: 302, bp: 337, r: 150, en: 2.2, E: 0.3, ie: 899, gas: "#3a3040", liq: "#2a2a30", sol: "#20202a", est: true }
};
const shellsOf = Z => { const caps = [2, 8, 8, 18, 18, 32]; const s = []; let left = Z; const real = { 37: [2, 8, 18, 8, 1], 55: [2, 8, 18, 18, 8, 1], 87: [2, 8, 18, 32, 18, 8, 1], 35: [2, 8, 18, 7], 53: [2, 8, 18, 18, 7], 85: [2, 8, 18, 32, 18, 7] }; if (real[Z]) return real[Z]; for (const c of caps) { if (left <= 0) break; s.push(Math.min(c, left)); left -= c; } return s; };
/* ---- Group 1 + water ----
   The piece is a ball of radius r₀ = (3m ÷ 4πρ)^⅓ that shrinks at a steady speed v (faster when warmer: Arrhenius, Ea = 30 kJ/mol), so it lasts t = r₀ ÷ v.
   Hydrogen: ½ mol per mol of metal, 24 000 cm³ per mol. Temperature rise: n|ΔH| × heat kept ÷ (mass of water × 4.18). pH = 14 + log₁₀[OH⁻]. */
const r0 = (m, M) => 10 * Math.cbrt(3 * (m / 1000) / M.rho / (4 * Math.PI));               // mm, m in mg
const speedAt = (M, T) => M.v * Math.exp(-30000 / 8.314 * (1 / (T + 273) - 1 / 293));     // mm/s
const lifetime = (m, M, T) => r0(m, M) / speedAt(M, T);
const h2Max = (m, M) => 0.5 * (m / 1000) / M.Ar * 24000;                                     // cm³
const tRise = (m, M, Vw, kept = 0.7) => (m / 1000) / M.Ar * Math.abs(M.dH) * 1000 * kept / (Vw * 4.18);
const pHof = (m, M, Vw) => { const n = (m / 1000) / M.Ar; return n > 0 ? 14 + Math.log10(n / (Vw / 1000)) : 7; };
/* ---- Halogen displacement ----
   X₂ + 2Y⁻ ⇌ 2X⁻ + Y₂, equilibrium constant K = e^(2FΔE°/RT). Solved exactly (bisection) for 5 cm³ of 0.05 mol/dm³ halogen water and 5 cm³ of 0.1 mol/dm³ halide. Returns the fraction of the halogen that reacted. */
function displace(X, Y, a = 0.05 * 5, b = 0.1 * 5, V = 10) {
  if (X === Y) return 0; const dE = G7[X].E - G7[Y].E, lnK = 2 * 96485 * dE / (8.314 * 298);
  const f = x => { const cX2 = (a - x) / V, cY = (b - 2 * x) / V, cXm = 2 * x / V, cY2 = x / V; return Math.log(cXm * cXm * cY2) - Math.log(Math.max(1e-300, cX2 * cY * cY)) - lnK; };
  let lo = 0, hi = Math.min(a, b / 2) * (1 - 1e-12); for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (f(Math.max(m, 1e-300)) < 0) lo = m; else hi = m; } return lo / a;
}

// ---------------- The page ----------------
const P = { view: "g1", metal: "Na", m: 50, Vw: 100, Tw: 20, Tj: 20, hex: false, prop: "r", grp: 1 };
let rnd = K.rng(Date.now() % 99991 + 17), speed = 1, t = 0, run = null, bubbles = [], parts = [];
const ui = K.app({
  title: "Groups 1 and 7", subject: "Chemistry",
  blurb: "Alkali metals in water and the halogens side by side: why reactivity rises down Group 1 and falls down Group 7",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 2(a) Group 1 (lithium, sodium, potassium with water; trends; predicting rubidium and caesium) and 2(b) Group 7 (colours and states of the halogens; displacement reactions; reactivity trend; predicting astatine).", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 4: trends in ionisation energy, atomic radius and electronegativity down Groups 2 and 7; halogen displacement as redox, with half-equations and E°. Flame tests and Group 2 chemistry are summarised in the trend charts." } },
  missions: [
    { title: "Down Group 1", q: "Drop 50 mg of lithium, then sodium, then potassium into water. Compare how fast they react and what you see.", hint: "Lithium fizzes steadily and floats; sodium melts into a ball and whizzes about; potassium melts, fizzes violently and the hydrogen catches fire with a lilac flame. Reactivity increases down the group. All make hydrogen and an alkaline solution (the indicator turns purple).", setup() { set({ view: "g1", metal: "Li" }); drop(); } },
    { title: "Float or sink?", q: "Try rubidium and caesium. Do they float? Use the densities in the trend chart.", hint: "Lithium, sodium and potassium are less dense than water (under 1 g/cm³), so they float. Rubidium (1.53) and caesium (1.93) are denser, so they sink, and react even more violently: caesium explodes.", setup() { set({ view: "g1", metal: "Rb", prop: "rho" }); drop(); } },
    { title: "How much hydrogen?", q: "Drop 50 mg of sodium. Calculate the volume of hydrogen made at room temperature (24 dm³ per mole) and compare with the gas reading.", hint: "2Na + 2H₂O → 2NaOH + H₂. Moles of Na = 0.050 ÷ 23 = 0.00217; moles of H₂ = half = 0.00109; volume = 0.00109 × 24 000 = 26 cm³.", setup() { set({ view: "g1", metal: "Na", m: 50 }); drop(); } },
    { title: "Why more reactive?", q: "Look at the atom picture and the atomic radius trend. Explain why potassium is more reactive than sodium.", hint: "Potassium (2,8,8,1) has one more shell than sodium (2,8,1). Its outer electron is further from the nucleus and shielded by more inner electrons, so it is attracted less strongly and lost more easily.", setup() { set({ view: "g1", metal: "K", prop: "r" }); } },
    { title: "Halogens at room temperature", q: "Look at the halogens at 20 °C. What are their states and colours? What is the trend in melting and boiling points?", hint: "Fluorine: pale yellow gas. Chlorine: yellow-green gas. Bromine: red-brown liquid (with orange vapour). Iodine: grey-black solid (purple vapour when heated). Melting and boiling points rise down the group: bigger molecules, stronger forces between them.", setup() { set({ view: "g7s", Tj: 20, prop: "bp" }); } },
    { title: "Displacement", q: "Add chlorine water to potassium bromide, and bromine water to potassium iodide. What do you see? Now add iodine to potassium chloride.", hint: "Cl₂ + 2KBr → 2KCl + Br₂: the solution turns orange. Br₂ + 2KI → 2KBr + I₂: it turns brown. Iodine cannot displace chlorine (no change): a more reactive halogen displaces a less reactive one. Order: Cl > Br > I.", setup() { set({ view: "g7d" }); } },
    { title: "Predict francium and astatine", q: "Use the trends to predict: how would francium react with water? What state and colour is astatine at room temperature?", hint: "Francium: even more reactive than caesium (it would explode), dense, low melting point. Astatine: a black solid at room temperature (melting point above iodine's), the least reactive halogen. Both are so radioactive that hardly any has ever been seen.", setup() { set({ view: "g7s", Tj: 20 }); } },
    { lvl: "adv", title: "Redox in displacement", q: "For chlorine + potassium bromide, write the two half-equations. What is oxidised, what is reduced?", hint: "Cl₂ + 2e⁻ → 2Cl⁻ (reduced: oxidation number 0 → −1). 2Br⁻ → Br₂ + 2e⁻ (oxidised: −1 → 0). Chlorine is the oxidising agent. E°(Cl₂) = +1.36 V > E°(Br₂) = +1.09 V, so the reaction is feasible.", setup() { set({ view: "g7d" }); } },
    { lvl: "adv", title: "Ionisation energies down a group", q: "Compare first ionisation energies down Group 1, Group 2 and Group 7. Explain the trend.", hint: "They all fall down the group: more shells, more shielding and a larger radius outweigh the extra protons, so the outer electron is held less tightly.", setup() { set({ view: "g1", prop: "ie" }); } }
  ],
  batch: [
    { title: "More reactive down Group 1?", question: "How long does a 50 mg piece of each metal take to react completely in water at 20 °C?", how: "Hand-cut pieces vary in mass (SD 10%) and surface (rate SD 10%). 1 Li, 2 Na, 3 K, 4 Rb, 5 Cs. Theory: t = r₀ ÷ v.", xLabel: "metal (1 Li, 2 Na, 3 K, 4 Rb, 5 Cs)", yLabel: "time to react (s)", xs: [1, 2, 3, 4, 5], reps: 6, yMin: 0, run: (x, r) => { const M = G1[["Li", "Na", "K", "Rb", "Cs"][x - 1]]; return lifetime(50 * (1 + 0.1 * r.gauss()), M, 20) / (1 + 0.1 * r.gauss()); }, note: "Each metal reacts several times faster than the one above it: reactivity increases down the group." },
    { title: "Which metal makes most hydrogen per gram?", question: "Hydrogen from 50 mg of each metal.", how: "Gas syringe ±0.5 cm³; mass of each piece ±10%. Theory: ½ × (0.050 ÷ Ar) × 24 000 cm³.", xLabel: "metal (1 Li, 2 Na, 3 K, 4 Rb, 5 Cs)", yLabel: "hydrogen (cm³)", xs: [1, 2, 3, 4, 5], reps: 6, yMin: 0, run: (x, r) => h2Max(50 * (1 + 0.1 * r.gauss()), G1[["Li", "Na", "K", "Rb", "Cs"][x - 1]]) + 0.5 * r.gauss(), note: "Lithium makes the most per gram (86 cm³ per 50 mg): its atoms are lightest, so 50 mg contains the most atoms. The most reactive metal (caesium) makes the least gas per gram." },
    { title: "More sodium, bigger temperature rise?", question: "How does the temperature rise of 100 cm³ of water depend on the mass of sodium?", how: "20 to 200 mg of sodium; 70% of the heat stays in the water; thermometer ±0.1 °C. Theory: ΔT = n × 184 kJ/mol × 0.7 ÷ (100 g × 4.18).", xLabel: "mass of sodium (mg)", yLabel: "temperature rise (°C)", xs: [20, 50, 80, 110, 140, 170, 200], reps: 4, fit: true, yMin: 0, theory: m => tRise(m, G1.Na, 100), theoryLabel: "theory", run: (x, r) => tRise(x * (1 + 0.03 * r.gauss()), G1.Na, 100) + 0.1 * r.gauss(), note: "A straight line through the origin: the energy released is proportional to the amount of sodium." },
    { title: "How alkaline does the water get?", question: "The pH of 100 cm³ of water after sodium reacts in it.", how: "10 to 200 mg of sodium; pH meter ±0.02. Theory: pH = 14 + log₁₀[OH⁻].", xLabel: "mass of sodium (mg)", yLabel: "pH", xs: [10, 20, 50, 100, 150, 200], reps: 4, theory: m => pHof(m, G1.Na, 100), theoryLabel: "14 + log₁₀[OH⁻]", run: (x, r) => pHof(x, G1.Na, 100) + 0.02 * r.gauss(), note: "Strongly alkaline (pH about 12 to 13). Ten times the sodium raises the pH by 1: pH is a log scale." },
    { title: "How much bromine can chlorine make?", question: "Chlorine water (0.05 mol/dm³) is added to 10 cm³ of 0.05 mol/dm³ potassium bromide. How much bromine forms?", how: "1 to 10 cm³ of chlorine water; bromine measured with a colorimeter (±2%). Theory: the limiting reactant (0.25 mmol of bromide-limited bromine at most).", xLabel: "chlorine water added (cm³)", yLabel: "bromine formed (mmol)", xs: [1, 2, 3, 4, 5, 6, 8, 10], reps: 3, yMin: 0, theory: v => Math.min(0.05 * v, 0.25), theoryLabel: "limiting reactant", run: (x, r) => Math.min(0.05 * x, 0.25) * (1 + 0.02 * r.gauss()), note: "The amount rises in proportion to the chlorine added, then levels off at 0.25 mmol once all the bromide has reacted (2Br⁻ → Br₂)." },
    { title: "Which halides can bromine displace?", question: "What percentage of the bromine reacts with each halide?", how: "5 cm³ of 0.05 mol/dm³ bromine water with 5 cm³ of 0.1 mol/dm³ KCl, KBr, KI. Equilibrium from E° values; colorimeter ±0.5%.", xLabel: "halide (1 chloride, 2 bromide, 3 iodide)", yLabel: "bromine reacted (%)", xs: [1, 2, 3], reps: 3, yMin: 0, run: (x, r) => x === 2 ? 0 : Math.max(0, displace("Br", ["Cl", "Br", "I"][x - 1]) * 100 + 0.5 * r.gauss()), note: "Bromine displaces iodine completely (100%), cannot displace chlorine (almost 0%), and of course does nothing with bromide." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 2(a)", text: "Group 1 + water → metal hydroxide (alkaline) + hydrogen: 2Na + 2H₂O → 2NaOH + H₂. Observations: floats, fizzes, moves about; Na and K melt; K's hydrogen burns with a lilac flame." },
      { lvl: "std", tag: "4CH1 2(a)", text: "Reactivity increases down Group 1: the outer electron is further from the nucleus and more shielded, so it is lost more easily." },
      { lvl: "std", tag: "4CH1 2(b)", text: "Halogens at room temperature: fluorine pale yellow gas, chlorine yellow-green gas, bromine red-brown liquid, iodine grey-black solid (purple vapour). Melting and boiling points increase down the group." },
      { lvl: "std", tag: "4CH1 2(b)", text: "Reactivity decreases down Group 7: bigger atoms attract an extra electron less strongly. A more reactive halogen displaces a less reactive one from a solution of its salt." },
      { lvl: "std", tag: "4CH1 2(b)", text: "Displacement is redox: Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂. Chlorine gains electrons (reduced); bromide ions lose electrons (oxidised)." },
      { lvl: "adv", tag: "9CH0 4", text: "Down a group: atomic radius and shielding increase, first ionisation energy and electronegativity decrease. Group 2 reactivity with water increases down the group (Mg slow, Ba fast)." },
      { lvl: "adv", tag: "9CH0 4", text: "Halogen oxidising power: Cl₂ > Br₂ > I₂ (E° +1.36, +1.09, +0.54 V). A reaction is feasible when E°(oxidising agent) > E°(the halogen it would form)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Write the balanced equation for ${G1[P.metal].name.split(" ")[0]} reacting with water.`, ans: () => `<ul><li>2${P.metal} + 2H₂O → 2${P.metal}OH + H₂</li><li>(correct formulae; balanced)</li></ul>` },
      { lvl: "std", marks: 3, q: () => `Calculate the volume of hydrogen (at room temperature) made by ${P.m} mg of ${G1[P.metal].name.split(" ")[0]} (Ar = ${G1[P.metal].Ar}).`, ans: () => { const n = P.m / 1000 / G1[P.metal].Ar; return `<ul><li>moles of metal = ${P.m / 1000} ÷ ${G1[P.metal].Ar} = ${n.toExponential(3)}</li><li>moles of H₂ = half = ${(n / 2).toExponential(3)}</li><li>volume = × 24 000 = ${(n / 2 * 24000).toFixed(1)} cm³</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Explain why potassium is more reactive than sodium.", ans: "<ul><li>potassium's outer electron is in a shell further from the nucleus</li><li>more shielding by inner shells</li><li>so the electron is attracted less strongly and lost more easily</li></ul>" },
      { lvl: "std", marks: 3, q: "Chlorine water is added to potassium iodide solution. Describe what you would see and write the equation.", ans: "<ul><li>the colourless solution turns brown</li><li>Cl₂ + 2KI → 2KCl + I₂</li><li>chlorine is more reactive than iodine, so it displaces it</li></ul>" },
      { lvl: "std", marks: 2, q: "Predict the state and colour of astatine at room temperature, and explain your answer.", ans: "<ul><li>a black solid</li><li>melting points rise and colours darken down the group (iodine is already a grey-black solid)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Write half-equations for Br₂ + 2I⁻ → 2Br⁻ + I₂ and identify the oxidising agent.", ans: "<ul><li>Br₂ + 2e⁻ → 2Br⁻ (reduction)</li><li>2I⁻ → I₂ + 2e⁻ (oxidation)</li><li>bromine is the oxidising agent</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Data</b>: melting and boiling points, densities, radii, ionisation energies, electronegativities and E° values from data tables (francium and astatine are estimates).</li>
<li><b>Group 1 in water</b>: the piece is a ball of radius r₀ = (3m/4πρ)^⅓ that shrinks at a steady speed v (Li 0.05, Na 0.15, K 0.6, Rb 2, Cs 5 mm/s at 20 °C, chosen to match classroom times; faster in warm water, Ea = 30 kJ/mol). Hydrogen V = ½(m/Ar) × 24 000 cm³. Temperature rise = n|ΔH| × 0.7 ÷ (m_water × 4.18), with ΔH from enthalpies of formation. pH = 14 + log₁₀[OH⁻].</li>
<li><b>Halogen states</b>: from the real melting and boiling points; molecules vibrate (solid), slide (liquid) or fly (gas).</li>
<li><b>Displacement</b>: X₂ + 2Y⁻ ⇌ 2X⁻ + Y₂ with K = e^(2FΔE°/RT), solved exactly for 5 cm³ of 0.05 mol/dm³ halogen water and 5 cm³ of 0.1 mol/dm³ halide; colours are the real ones in water and in hexane.</li></ul>
<h3>Simplifications</h3>
<ul><li>The piece's shape, its movement on the surface, and heat loss to the beaker are simplified; ignition happens for potassium and below.</li>
<li>The earlier version's A level box (Group 2 chemistry, thermal stability, flame tests, halides with sulfuric acid, an unknown salt) is not included here; Group 2 trends are in the trend chart.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/periodic-groups.html">original/periodic-groups.html</a>. Metal displacement and the reactivity series are in <a href="../reactivity_metals/reactivity-metals.html">Reactivity and Extracting Metals</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "g1", options: [["g1", "💧 Group 1 + water"], ["g7s", "🫙 Halogens: states"], ["g7d", "🧪 Halogens: displacement"]], on: v => set({ view: v }) });
grp.g1 = g = ui.group("Alkali metal");
ctl.metal = K.seg(g, { value: "Na", options: ["Li", "Na", "K", "Rb", "Cs"].map(k => [k, k]), on: v => { P.metal = v; drop(); } });
ctl.m = K.slider(g, { label: "Mass of the piece", min: 10, max: 200, step: 5, value: 50, unit: "mg", on: v => P.m = v });
ctl.Vw = K.slider(g, { label: "Water", min: 50, max: 500, step: 10, value: 100, unit: "cm³", on: v => P.Vw = v });
ctl.Tw = K.slider(g, { label: "Water temperature", min: 5, max: 60, step: 1, value: 20, unit: "°C", on: v => P.Tw = v });
K.btn(K.row(g), "▶ Drop it in", () => drop(), "primary");
grp.g7s = g = ui.group("Halogens");
ctl.Tj = K.slider(g, { label: "Temperature", min: -250, max: 350, step: 1, value: 20, unit: "°C", on: v => P.Tj = v });
grp.g7d = g = ui.group("Displacement");
ctl.hex = K.toggle(g, { label: "Add a hexane layer (shows the halogen's colour clearly)", value: false, on: v => P.hex = v });
K.note(g, "Each tube: 5 cm³ of halogen water added to 5 cm³ of potassium halide solution.");
g = ui.group("Trend down the group");
ctl.grp = K.seg(g, { value: 1, options: [[1, "Group 1"], [2, "Group 2"], [7, "Group 7"]], on: v => P.grp = v });
ctl.prop = K.seg(g, { value: "r", options: [["r", "atomic radius"], ["ie", "1st ionisation energy"], ["mp", "melting point"], ["bp", "boiling point"], ["rho", "density"], ["en", "electronegativity"]], on: v => P.prop = v });
ctl.speed = K.slider(ui.group("Watch"), { label: "Speed", min: 0.1, max: 3, step: 0.1, value: 1, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function drop() { const M = G1[P.metal]; run = { t: 0, life: lifetime(P.m, M, P.Tw), m: P.m, metal: P.metal, Vw: P.Vw, Tw: P.Tw, hist: [] }; bubbles = []; }
function set(o) {
  Object.assign(P, { metal: "Na", m: 50, Vw: 100, Tw: 20, Tj: 20, hex: false, prop: "r" }, o);
  P.grp = P.view === "g1" ? 1 : 7;
  for (const k of ["m", "Vw", "Tw", "Tj"]) ctl[k].set(P[k]); ctl.view.set(P.view); ctl.metal.set(P.metal); ctl.hex.set(P.hex); ctl.prop.set(P.prop); ctl.grp.set(P.grp);
  for (const k in grp) grp[k].style.display = k === P.view ? "" : "none";
  run = null; if (P.view === "g7s") makeParts();
  relabel({ g1: ["hydrogen", "temperature", "pH", "piece left"], g7s: ["fluorine", "chlorine", "bromine", "iodine"], g7d: ["Cl₂ + KBr", "Cl₂ + KI", "Br₂ + KI", "I₂ + KCl"] }[P.view]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const rgb = a => `rgb(${a.map(Math.round).join(",")})`, mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
function indicator(pH) { const stops = [[1, [230, 50, 40]], [4, [240, 140, 40]], [7, [80, 200, 90]], [10, [60, 110, 220]], [13, [120, 60, 190]]]; for (let i = 1; i < stops.length; i++) if (pH <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (pH - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])); return stops[stops.length - 1][1]; }
function drawAtom(c, x, y, Z, label, hl) {
  const sh = shellsOf(Z), R = 70; c.fillStyle = "#ff6b6b"; c.beginPath(); c.arc(x, y, 8, 0, 6.3); c.fill();
  sh.forEach((n, k) => { const r = 14 + (R - 14) * (k + 1) / sh.length; c.strokeStyle = k < sh.length - 1 ? "rgba(255,255,255,0.18)" : "#3a4560"; c.lineWidth = k < sh.length - 1 ? 3 : 1.5; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.stroke(); if (k === sh.length - 1) for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * 0.4; c.fillStyle = hl; c.beginPath(); c.arc(x + r * Math.cos(a), y + r * Math.sin(a), 3.5, 0, 6.3); c.fill(); } });
  TX(c, label, x, y + R + 18, "#aab6cc", "center", "11.5px"); TX(c, sh.join(","), x, y + R + 33, "#7d8aa5", "center", "11px");
}
function drawG1(c, w, h) {
  const M = G1[P.metal], bx = w * 0.3, by = h - 50, bw = 240, bh = 230, ph = run ? pHof(run.m * Math.min(1, run.t / run.life), M, run.Vw) : 7;
  c.fillStyle = `rgba(${indicator(ph).join(",")},0.45)`; c.fillRect(bx - bw / 2, by - bh * 0.7, bw, bh * 0.7); c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.strokeRect(bx - bw / 2, by - bh, bw, bh);
  TX(c, "water + universal indicator", bx, by + 18, "#7d8aa5", "center", "11px");
  if (run) {
    const f = Math.max(0, 1 - run.t / run.life), r = r0(run.m, M) * f, sinks = M.rho > 1, surface = by - bh * 0.7;
    const px = bx + (P.metal === "Li" ? 0 : 60 * Math.sin(run.t * 2.3) * Math.min(1, 3 / run.life + 0.3)), py = sinks ? by - 10 - r * 4 : surface - r * 2;
    if (f > 0) { c.fillStyle = "#d8dbe2"; if (P.metal === "Li") c.fillRect(px - r * 4, py - r * 3, r * 8, r * 6); else { c.beginPath(); c.arc(px, py, Math.max(2, r * 4), 0, 6.3); c.fill(); }
      for (let k = 0; k < 3; k++) bubbles.push({ x: px + (Math.random() - 0.5) * 20, y: py, v: 30 + Math.random() * 40 });
      if (["K", "Rb", "Cs"].includes(P.metal)) { c.fillStyle = M.flame; c.globalAlpha = 0.5 + 0.3 * Math.sin(run.t * 20); c.beginPath(); c.ellipse(px, surface - 25, 14, 28, 0, 0, 6.3); c.fill(); c.globalAlpha = 1; TX(c, `hydrogen burns: ${M.flameName} flame`, px + 22, surface - 40, M.flame, "left", "600 12px"); }
      if (P.metal === "Cs" && run.t < 0.4) { c.fillStyle = "rgba(255,240,200,0.7)"; c.beginPath(); c.arc(px, py, 80 * run.t / 0.4 + 10, 0, 6.3); c.fill(); TX(c, "BANG", px, py - 60, "#fff", "center", "700 20px"); } }
    c.strokeStyle = "rgba(255,255,255,0.7)"; for (const b of bubbles) { c.beginPath(); c.arc(b.x, b.y, 2.5, 0, 6.3); c.stroke(); }
  } else TX(c, "Press ▶ Drop it in", bx, by - bh / 2, "#7d8aa5", "center", "13px");
  const x = w * 0.55; let y = 60; const L = (s, col = "#aab6cc", f = "13px") => { TX(c, s, x, y, col, "left", f); y += 22; };
  L(`${P.m} mg of ${M.name} in ${P.Vw} cm³ of water at ${P.Tw} °C`, "#eef2f8", "600 14px");
  L(`2${P.metal} + 2H₂O → 2${P.metal}OH + H₂`, "#ffd166", "600 13px");
  L(M.rho < 1 ? `floats (density ${M.rho} g/cm³ < 1)` : `sinks (density ${M.rho} g/cm³ > 1)`);
  L(P.metal === "Li" ? "fizzes steadily; does not melt" : P.metal === "Na" ? "melts into a ball, whizzes about, fizzes" : P.metal === "K" ? "melts, fizzes violently, lilac flame" : P.metal === "Rb" ? "reacts very violently" : "explodes");
  drawAtom(c, w * 0.82, h * 0.65, M.Z, `${M.name}: outer electron shown`, "#ffd166");
}
function makeParts() { parts = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 18; i++) parts.push({ j, i, x: Math.random(), y: Math.random(), vx: Math.random() - 0.5, vy: Math.random() - 0.5 }); }
const stateOf = (X, T) => T < G7[X].mp ? "solid" : T < G7[X].bp ? "liquid" : "gas";
function drawG7s(c, w, h) {
  const keys = ["F", "Cl", "Br", "I", "At"], jw = Math.min(150, (w - 80) / 5 - 20), jh = h * 0.55, y1 = h * 0.72;
  keys.forEach((X, k) => {
    const x0 = 40 + k * (jw + 20), st = stateOf(X, P.Tj), G = G7[X]; c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.strokeRect(x0, y1 - jh, jw, jh);
    if (st === "gas") { c.fillStyle = G.gas; c.globalAlpha = 0.25; c.fillRect(x0, y1 - jh, jw, jh); c.globalAlpha = 1; }
    else if (st === "liquid") { c.fillStyle = G.liq; c.fillRect(x0, y1 - jh * 0.35, jw, jh * 0.35); c.fillStyle = G.gas; c.globalAlpha = 0.18; c.fillRect(x0, y1 - jh, jw, jh * 0.65); c.globalAlpha = 1; }
    else { c.fillStyle = G.sol; for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) c.fillRect(x0 + 6 + i * (jw - 12) / 8, y1 - 12 - j * 12 + Math.sin(t * 9 + i + j) * 1, (jw - 12) / 8 - 2, 10); }
    // molecules
    c.fillStyle = st === "gas" ? G.gas : "#fff"; const ms = parts.filter(p => p.j === k % 4).slice(0, st === "gas" ? 10 : 0);
    for (const p of ms) { const mx = x0 + 6 + p.x * (jw - 12), my = y1 - jh + 6 + p.y * (jh - 12); c.beginPath(); c.arc(mx - 3, my, 3, 0, 6.3); c.arc(mx + 3, my, 3, 0, 6.3); c.fill(); }
    TX(c, G.name.split(" ")[0], x0 + jw / 2, y1 + 18, "#eef2f8", "center", "600 12px"); TX(c, `${st}${G.est ? " (est.)" : ""}`, x0 + jw / 2, y1 + 34, "#ffd166", "center", "12px"); TX(c, `m.p. ${G.mp} °C · b.p. ${G.bp} °C`, x0 + jw / 2, y1 + 50, "#7d8aa5", "center", "10.5px");
  });
  TX(c, `Temperature ${P.Tj} °C`, 40, 30, "#eef2f8", "left", "600 14px");
}
function drawG7d(c, w, h) {
  const X = ["Cl", "Br", "I"], Y = ["Cl", "Br", "I"], cw = Math.min(120, (w - 200) / 3), ch = Math.min(130, (h - 120) / 3), x0 = 170, y0 = 120;
  Y.forEach((Yk, j) => TX(c, `K${Yk}`, x0 + j * (cw + 20) + cw / 2, y0 - 10, "#eef2f8", "center", "600 13px"));
  X.forEach((Xk, i) => { TX(c, `${G7[Xk].name.split(" ")[0]} water`, x0 - 20, y0 + i * (ch + 14) + ch / 2, "#eef2f8", "right", "600 13px");
    Y.forEach((Yk, j) => {
      const f = displace(Xk, Yk), tx = x0 + j * (cw + 20), ty = y0 + i * (ch + 14), tw = 34;
      // colour of the halogen left in the tube: X₂ left (1 − f) and Y₂ made (f)
      const comp = P.hex ? "hex" : "aq", base = [230, 235, 240], cX = G7[Xk][comp] || base, cY = G7[Yk][comp] || base;
      const col = Xk === Yk ? cX : mix(cX, cY, Math.min(1, f));
      c.fillStyle = rgb(col); c.globalAlpha = 0.85; c.fillRect(tx + cw / 2 - tw / 2, ty + ch * 0.25, tw, ch * 0.65); c.globalAlpha = 1;
      if (P.hex) { c.fillStyle = "rgba(230,235,240,0.35)"; c.fillRect(tx + cw / 2 - tw / 2, ty + ch * 0.55, tw, ch * 0.35); }
      c.strokeStyle = "#c9d3e6"; c.lineWidth = 1.5; c.strokeRect(tx + cw / 2 - tw / 2, ty + 4, tw, ch * 0.86);
      TX(c, Xk === Yk ? "–" : f > 0.5 ? "reacts" : "no reaction", tx + cw / 2 + tw / 2 + 6, ty + ch * 0.6, Xk === Yk ? "#7d8aa5" : f > 0.5 ? "#7fe3a0" : "#ff8a70", "left", "11.5px");
    }); });
  TX(c, P.hex ? "With hexane: the halogen moves into the top (hexane) layer: Br₂ orange-red, I₂ purple" : "Colours in water: Cl₂ pale green, Br₂ orange, I₂ brown", 20, h - 16, "#aab6cc", "left", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ g1: drawG1, g7s: drawG7s, g7d: drawG7d })[P.view](c, w, h); }

// ---------------- Charts ----------------
const PROPS = { r: ["atomic radius", "pm"], ie: ["first ionisation energy", "kJ/mol"], mp: ["melting point", "°C"], bp: ["boiling point", "°C"], rho: ["density", "g/cm³"], en: ["electronegativity", ""] };
function charts() {
  const D = P.grp === 1 ? G1 : P.grp === 2 ? G2 : G7, keys = Object.keys(D), pr = P.prop, vals = keys.map((k, i) => [i, D[k][pr]]).filter(q => q[1] != null);
  chB.opts.title = `${PROPS[pr][0]} down Group ${P.grp}`; chB.opts.xLabel = ""; chB.opts.yLabel = PROPS[pr][1]; chB.opts.xFmt = whole(v => keys[Math.round(v)] || "");
  chB.draw(vals.length ? [{ pts: vals, type: "bars", w: 0.6, color: P.grp === 1 ? "#ffd166" : P.grp === 2 ? "#7fe3a0" : "#c9a0ff", label: vals.length < keys.length ? "(no data for some)" : "" }] : [], { xMin: -0.6, xMax: keys.length - 0.4 });
  if (P.view === "g1") {
    const M = run ? G1[run.metal] : G1[P.metal], hist = run ? run.hist : [];
    chA.opts.title = "Hydrogen and temperature"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "hydrogen (cm³) · temperature rise × 10 (°C)"; chA.opts.xFmt = null;
    chA.draw([{ pts: hist.map(q => [q[0], q[1]]), color: "#6fb1ff", label: "hydrogen (cm³)" }, { pts: hist.map(q => [q[0], q[2] * 10]), color: "#ff8a70", label: "temperature rise × 10" }], { xMin: 0, xMax: run ? Math.max(5, run.life * 1.2) : 10, yMin: 0 });
    const f = run ? Math.min(1, run.t / run.life) : 0, m = run ? run.m : P.m;
    read.set("a", (h2Max(m, M) * f).toFixed(1) + " cm³"); read.set("b", (P.Tw + tRise(m, M, P.Vw) * f).toFixed(2) + " °C"); read.set("c", run ? pHof(m * f, M, P.Vw).toFixed(2) : "7"); read.set("d", run ? (Math.max(0, 1 - f) * 100).toFixed(0) + "%" : "–");
    ui.hud(run && f >= 1 ? `Finished in ${run.life.toFixed(1)} s` : "Reactivity increases down Group 1");
  } else if (P.view === "g7s") {
    const keys7 = ["F", "Cl", "Br", "I", "At"];
    chA.opts.title = "Melting and boiling points"; chA.opts.xLabel = ""; chA.opts.yLabel = "°C"; chA.opts.xFmt = whole(v => keys7[Math.round(v)] || "");
    chA.draw([{ pts: keys7.map((k, i) => [i - 0.15, G7[k].mp]), type: "bars", w: 0.28, color: "#6fb1ff", label: "melting point" }, { pts: keys7.map((k, i) => [i + 0.15, G7[k].bp]), type: "bars", w: 0.28, color: "#ff8a70", label: "boiling point" }], { xMin: -0.6, xMax: 4.6, hlines: [{ y: P.Tj, color: "#ffd166", label: "now" }] });
    ["F", "Cl", "Br", "I"].forEach((X, i) => read.set("abcd"[i], stateOf(X, P.Tj)));
    ui.hud("Melting and boiling points rise down Group 7: bigger molecules, stronger forces between them");
  } else {
    const pairs = [["Cl", "Br"], ["Cl", "I"], ["Br", "I"], ["I", "Cl"]];
    chA.opts.title = "Halogen that reacted (%)"; chA.opts.xLabel = ""; chA.opts.yLabel = "%"; chA.opts.xFmt = whole(v => ["Cl₂+Br⁻", "Cl₂+I⁻", "Br₂+I⁻", "Br₂+Cl⁻", "I₂+Cl⁻", "I₂+Br⁻"][Math.round(v)] || "");
    const all = [["Cl", "Br"], ["Cl", "I"], ["Br", "I"], ["Br", "Cl"], ["I", "Cl"], ["I", "Br"]];
    chA.draw([{ pts: all.map((p, i) => [i, displace(p[0], p[1]) * 100]), type: "bars", w: 0.6, color: "#7fe3a0" }], { xMin: -0.6, xMax: 5.6, yMin: 0, yMax: 105 });
    pairs.forEach((p, i) => read.set("abcd"[i], displace(p[0], p[1]) > 0.5 ? "reacts" : "no reaction"));
    ui.hud("A more reactive halogen displaces a less reactive one: Cl₂ > Br₂ > I₂");
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; t += dt;
  if (run && run.t < run.life * 1.3) { run.t += dt * speed; const f = Math.min(1, run.t / run.life), M = G1[run.metal]; run.hist.push([run.t, h2Max(run.m, M) * f, tRise(run.m, M, run.Vw) * f]); }
  for (const b of bubbles) b.y -= b.v * dt; bubbles = bubbles.filter(b => b.y > cv.h - 280).slice(-150);
  for (const p of parts) { p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1; p.x = Math.max(0, Math.min(1, p.x)); p.y = Math.max(0, Math.min(1, p.y)); }
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({ view: "g1" });
ui.tip("Drop alkali metals into water, then switch to the halogens. The trend charts link both groups to the size of the atoms.", 7000);
