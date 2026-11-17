/* =====================================================================
   MOLES, REACTING MASSES AND YIELD
   Chemists count particles by weighing them. One MOLE is 6.02 × 10²³
   particles (the Avogadro constant), and has a mass in grams equal to
   the relative formula mass Mr:      moles = mass ÷ Mr
   A balanced equation gives the ratio in which particles react, so we
   can work out the masses that react and the mass of product. The
   reactant that runs out first is the LIMITING reactant.
   Experiments find formulae (e.g. burning magnesium) and water of
   crystallisation; real results have random AND systematic errors.
   Gases: one mole of any gas fills 24 dm³ at room temperature and
   pressure (pV = nRT at A level).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const NA = 6.02e23, AR = { H: 1, C: 12, N: 14, O: 16, Na: 23, Mg: 24, S: 32, Cl: 35.5, Ca: 40, Fe: 56, Cu: 63.5, Zn: 65, Al: 27, Ba: 137, Co: 59 };
const SUBST = [["water", "H₂O", 18], ["carbon dioxide", "CO₂", 44], ["sodium chloride", "NaCl", 58.5], ["glucose", "C₆H₁₂O₆", 180], ["iron", "Fe", 56], ["copper", "Cu", 63.5], ["calcium carbonate", "CaCO₃", 100], ["sulfuric acid", "H₂SO₄", 98], ["copper sulfate crystals", "CuSO₄·5H₂O", 249.5], ["magnesium oxide", "MgO", 40], ["ammonia", "NH₃", 17]];
// reactions: a A + b B → c C (+ …), with Mr of A, B and the product we weigh
const REACT = [
  { eq: "2Mg + O₂ → 2MgO", A: ["Mg", 24, 2], B: ["O₂", 32, 1], C: ["MgO", 40, 2] },
  { eq: "2H₂ + O₂ → 2H₂O", A: ["H₂", 2, 2], B: ["O₂", 32, 1], C: ["H₂O", 18, 2] },
  { eq: "N₂ + 3H₂ → 2NH₃", A: ["N₂", 28, 1], B: ["H₂", 2, 3], C: ["NH₃", 17, 2] },
  { eq: "CH₄ + 2O₂ → CO₂ + 2H₂O", A: ["CH₄", 16, 1], B: ["O₂", 32, 2], C: ["CO₂", 44, 1] },
  { eq: "Fe + S → FeS", A: ["Fe", 56, 1], B: ["S", 32, 1], C: ["FeS", 88, 1] },
  { eq: "2Na + Cl₂ → 2NaCl", A: ["Na", 23, 2], B: ["Cl₂", 71, 1], C: ["NaCl", 58.5, 2] },
  { eq: "CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂", A: ["CaCO₃", 100, 1], B: ["HCl", 36.5, 2], C: ["CO₂", 44, 1] },
  { eq: "Fe₂O₃ + 2Al → 2Fe + Al₂O₃", A: ["Fe₂O₃", 160, 1], B: ["Al", 27, 2], C: ["Fe", 56, 2] },
  { eq: "Zn + CuSO₄ → ZnSO₄ + Cu", A: ["Zn", 65, 1], B: ["CuSO₄", 159.5, 1], C: ["Cu", 63.5, 1] }
];
function reacting(R, mA, mB) { const nA = mA / R.A[1], nB = mB / R.B[1], ext = Math.min(nA / R.A[2], nB / R.B[2]); return { nA, nB, ext, lim: nA / R.A[2] <= nB / R.B[2] ? "A" : "B", mC: ext * R.C[2] * R.C[1], leftA: (nA - ext * R.A[2]) * R.A[1], leftB: (nB - ext * R.B[2]) * R.B[1] }; }
// ----- empirical formula: burning magnesium in a crucible
// lid: how often it is lifted (0 rarely, 1 once a minute, 2 very often); heat to constant mass (up to 6 heatings)
// fraction burnt per heating rises with air; some white smoke (MgO) escapes when the lid is off; a little magnesium nitride forms (beyond the spec)
function burnMg(o, r) {
  const k = [0.3, 1.1, 1.5][o.lid], smoke = [0.002, 0.008, 0.035][o.lid] * (1 + 0.3 * r.gauss()), nitr = 0.02 * (1 + 0.5 * r.gauss()), res = o.balance;
  const crucible = 25 + 3 * r(), m = o.mass * (1 + 0.03 * r.gauss()), wt = v => Math.round((v + 0.3 * res * r.gauss()) / res) * res;
  let f = 0, lost = 0, heats = [], prev = 1e9;
  for (let i = 1; i <= 6; i++) { f = 1 - Math.exp(-k * i * (0.8 + 0.4 * r())); lost = Math.min(0.3, smoke * Math.min(i, 3)); const oxide = m * f * ((1 - nitr) * 40.3 / 24.3 + nitr * 100.9 / 72.9) * (1 - lost), mass = wt(crucible + m * (1 - f) + oxide); heats.push(mass); if (Math.abs(mass - prev) <= res) break; prev = mass; }
  const mMg = wt(crucible + m) - wt(crucible), mO = heats[heats.length - 1] - (crucible + m), ratio = (mO / 16) / (m / 24.3);
  return { m, mMg, mO, ratio, heats, crucible };
}
// ----- water of crystallisation: x in CuSO₄·xH₂O (true x = 5); gentle flame drives off water slowly; a strong flame spits and decomposes
function hydrate(o, r) {
  const m = o.mass * (1 + 0.02 * r.gauss()), anh = m * 159.6 / 249.7, water = m - anh, res = o.balance, wt = v => Math.round((v + 0.3 * res * r.gauss()) / res) * res; let left = water, extra = 0; const heats = [];
  for (let i = 1; i <= o.heats; i++) { left *= o.flame === "strong" ? 0.05 : Math.exp(-0.55 * (0.8 + 0.4 * r())); if (o.flame === "strong") extra += anh * (0.012 + 0.006 * r()) + (r() < 0.3 ? 0.01 * m : 0); heats.push(wt(anh + left - extra)); }
  const final = heats[heats.length - 1], mw = wt(m) - final; return { x: (mw / 18) / (final / 159.6), heats, m };
}
// ----- gas from magnesium and hydrochloric acid: Mg + 2HCl → MgCl₂ + H₂; Vm = RT/p
const Vm = (T = 20, p = 101.3) => 8.314 * (T + 273.15) / p;                      // dm³ per mol
function gasRun(o, r) {
  const mMg = o.mass * (1 - o.oxide) * (1 + 0.01 * r.gauss()), nHCl = o.acidV / 1000 * o.acidC, nH2 = Math.min(mMg / 24.3, nHCl / 2);
  let V = nH2 * Vm(o.T, o.p) * 1000; if (o.method === "water") V *= 1 + 2.34 / o.p * (o.T > 0 ? 1 : 0) * (1 - 0.3);       // water vapour adds a little volume
  if (o.late) V -= 3 + 3 * r(); V += o.readErr * r.gauss(); return Math.max(0, Math.min(o.cap || 100, V));
}
// ----- standard solution: weigh by difference, transfer, make up to the mark
function standard(o, r) { const m = o.target * (1 + 0.002 * r.gauss()), mw = Math.round((m + 0.005 * r.gauss()) / 0.001) * 0.001, transfer = o.rinse ? 1 : 0.97 + 0.02 * r(), V = 0.25 + (o.meniscus === "above" ? 0.0015 : o.meniscus === "below" ? -0.0015 : 0) + 0.0002 * r.gauss(); return { stated: mw / 106 / 0.25, actual: m * transfer / 106 / V }; }
const ROUTES = [["CuO + H₂SO₄ → CuSO₄ + H₂O", 159.5, 79.5 + 98], ["CuCO₃ + H₂SO₄ → CuSO₄ + H₂O + CO₂", 159.5, 123.5 + 98], ["C₂H₄ + H₂O → C₂H₅OH (hydration)", 46, 28 + 18], ["C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ (fermentation)", 92, 180], ["Fe₂O₃ + 3CO → 2Fe + 3CO₂", 112, 160 + 84], ["CH₄ + H₂O → CO + 3H₂", 6, 34], ["Zn + 2HCl → ZnCl₂ + H₂", 2, 65 + 73], ["N₂ + 3H₂ → 2NH₃", 34, 34]];

// ---------------- The page ----------------
const P = { view: "mole", sub: 0, moles: 1, react: 0, mA: 4.8, mB: 4.8, lid: 1, mass: 0.24, balance: 0.01, flame: "gentle", heats: 4, hmass: 2.5, method: "syringe", gmass: 0.06, acidV: 50, acidC: 1, T: 20, p: 101.3, oxide: 0, late: false, route: 0 };
let rnd = K.rng(Date.now() % 9973 + 9), last = null, classRes = [], T0 = 0;
const ui = K.app({
  title: "Moles, Reacting Masses and Yield", subject: "Chemistry",
  blurb: "Counting particles by weighing, reacting masses and limiting reactants, formulae from experiments, gas volumes and yield",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 1(e) chemical formulae, equations and calculations: Mr, the mole, reacting masses, the limiting reactant, empirical formulae from experiment, water of crystallisation, percentage yield; molar gas volume 24 dm³ and concentration (Chemistry only).", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 5: the Avogadro constant, concentration and dilution, pV = nRT, percentage yield, atom economy, Core Practical 1 (molar volume of a gas), percentage uncertainties." } },
  missions: [
    { title: "Weigh out a mole", q: "Weigh out one mole of water, then of sodium chloride, then of glucose. Why are the masses different if they all contain the same number of particles?", hint: "One mole always has 6.02 × 10²³ particles, but each particle has a different mass: the mass of a mole in grams = Mr (18 g, 58.5 g, 180 g).", setup() { set({ view: "mole", sub: 0 }); } },
    { title: "Reacting masses", q: "How much magnesium oxide forms from 4.8 g of magnesium burning in plenty of oxygen?", hint: "moles Mg = 4.8 ÷ 24 = 0.20; 2Mg → 2MgO, so 0.20 mol MgO × 40 = 8.0 g.", setup() { set({ view: "react", react: 0, mA: 4.8, mB: 10 }); } },
    { title: "The limiting reactant", q: "Mix 5.6 g of iron with 4.0 g of sulfur. Which runs out first? How much iron sulfide forms, and what is left over?", hint: "Fe: 0.10 mol, S: 0.125 mol; 1 : 1, so iron is limiting: 0.10 mol FeS = 8.8 g, with 0.8 g of sulfur left over.", setup() { set({ view: "react", react: 4, mA: 5.6, mB: 4.0 }); } },
    { title: "Formula of magnesium oxide", q: "Burn magnesium in a crucible, lifting the lid about once a minute, heat to constant mass, then work out the formula. Is the ratio exactly 1 : 1?", hint: "Usually a little below 1 (about 0.9): some magnesium doesn't burn, some white MgO smoke escapes when the lid is lifted, and a little magnesium nitride forms. These are systematic errors: repeating doesn't remove them.", setup() { set({ view: "emp", lid: 1 }); } },
    { title: "Water of crystallisation", q: "Heat hydrated copper sulfate gently to constant mass. Find x in CuSO₄·xH₂O.", hint: "Blue crystals turn white as the water leaves. With heating to constant mass x ≈ 5. Too few heatings give x < 5 (water still there).", setup() { set({ view: "hydrate", heats: 6 }); } },
    { title: "Molar gas volume", q: "React 0.060 g of magnesium with excess acid and collect the hydrogen. How much gas? What volume does one mole of gas take up?", hint: "0.060 ÷ 24 = 0.0025 mol H₂ × 24 000 cm³ = 60 cm³. One mole of any gas takes up 24 dm³ at room temperature and pressure.", setup() { set({ view: "gas" }); } },
    { title: "Percentage yield", q: "In theory 5.0 g of product could form but you get 3.8 g. What is the percentage yield? Why is it less than 100%?", hint: "3.8 ÷ 5.0 × 100 = 76%. Product is lost in filtering and transferring, the reaction may be reversible or incomplete, and side reactions happen.", setup() { set({ view: "react", react: 0 }); } },
    { lvl: "adv", title: "CP1: molar volume", q: "Measure the molar volume of hydrogen at 20 °C and 101.3 kPa. Compare with RT/p.", hint: "RT/p = 8.314 × 293 ÷ 101 300 = 0.0240 m³ = 24.0 dm³ mol⁻¹. An oxide coat on the ribbon makes your value low; collecting over water makes it a little high.", setup() { set({ view: "gas", oxide: 0.03 }); } },
    { lvl: "adv", title: "Atom economy", q: "Compare the atom economy of making ethanol by hydration of ethene and by fermentation.", hint: "Hydration: 46 ÷ 46 = 100% (one product). Fermentation: 92 ÷ 180 = 51% (CO₂ is a waste product). Atom economy = Mr of the desired product ÷ total Mr of the reactants × 100.", setup() { set({ view: "react", route: 2 }); } }
  ],
  batch: [
    { title: "Formula of magnesium oxide: 200 students", question: "If 200 students each burn magnesium (lid lifted once a minute), what O : Mg ratios do they get?", how: "0.24 g magnesium, 0.01 g balance, heated to constant mass (up to 6 heatings).", yLabel: "moles O ÷ moles Mg", reps: 200, bins: 24, theory: 1, theoryLabel: "MgO", run: (x, r) => burnMg({ lid: 1, mass: 0.24, balance: 0.01 }, r).ratio, note: "The class centres around 0.9, not 1.0: smoke loss, unburnt magnesium and magnesium nitride are systematic errors that all push the same way." },
    { title: "How often to lift the lid?", question: "How does lifting the lid change the result?", how: "1 rarely, 2 once a minute, 3 very often; 40 students each.", xLabel: "lifting the lid (1 rarely, 2 once a minute, 3 often)", yLabel: "O : Mg ratio", xs: [1, 2, 3], reps: 40, theory: () => 1, theoryLabel: "MgO", run: (x, r) => burnMg({ lid: x - 1, mass: 0.24, balance: 0.01 }, r).ratio, note: "An inverted U: too rarely and the magnesium can't get enough oxygen; too often and smoke escapes. Best: briefly, about once a minute." },
    { title: "Bigger sample, better result?", question: "How does the mass of magnesium affect the spread of results?", how: "Lid once a minute; 0.01 g balance; 40 students at each mass.", xLabel: "mass of magnesium (g)", yLabel: "O : Mg ratio", xs: [0.05, 0.1, 0.2, 0.3, 0.5], reps: 40, theory: () => 1, theoryLabel: "MgO", run: (m, r) => burnMg({ lid: 1, mass: m, balance: 0.01 }, r).ratio, note: "A bigger sample shrinks the random error (the balance's 0.01 g matters less), but the mean stays below 1: a systematic error doesn't go away with a bigger sample." },
    { title: "Water of crystallisation: heat for longer", question: "How does x depend on the number of gentle heatings?", how: "2.5 g CuSO₄·5H₂O, 0.01 g balance, gentle flame.", xLabel: "number of heatings", yLabel: "x in CuSO₄·xH₂O", xs: [1, 2, 3, 4, 6, 8], reps: 20, yMin: 0, theory: () => 5, theoryLabel: "true x", run: (n, r) => hydrate({ mass: 2.5, balance: 0.01, flame: "gentle", heats: n }, r).x, note: "x creeps up towards 5 as more water is driven off: heat to constant mass." },
    { title: "Too strong a flame?", question: "What happens with a strong flame?", how: "As above with a strong flame: the crystals spit and the anhydrous salt starts to decompose.", xLabel: "number of heatings", yLabel: "x in CuSO₄·xH₂O", xs: [1, 2, 3, 4, 6], reps: 20, yMin: 0, theory: () => 5, theoryLabel: "true x", run: (n, r) => hydrate({ mass: 2.5, balance: 0.01, flame: "strong", heats: n }, r).x, note: "x overshoots 5: the extra mass lost (spitting, decomposition) is wrongly counted as water." },
    { title: "Limiting reactant: magnesium and acid", question: "How does the volume of hydrogen depend on the mass of magnesium (25 cm³ of 0.20 mol/dm³ HCl)?", how: "Gas syringe (100 cm³), reading error ±1 cm³.", xLabel: "mass of magnesium (g)", yLabel: "hydrogen (cm³)", xs: [0.01, 0.02, 0.04, 0.06, 0.08, 0.1], reps: 5, yMin: 0, theory: m => Math.min(m / 24.3, 0.0025) * Vm() * 1000, theoryLabel: "limiting reactant", run: (m, r) => gasRun({ mass: m, acidV: 25, acidC: 0.2, T: 20, p: 101.3, oxide: 0, readErr: 1, method: "syringe" }, r), note: "The volume rises with the mass of magnesium until the acid runs out (0.0025 mol H₂ = 60 cm³); after that extra magnesium is left over." },
    { title: "CP1: molar volume of hydrogen", question: "What molar volumes do students get, collecting hydrogen over water?", how: "0.06 g magnesium with a 3% oxide coat, excess acid, 20 °C, 101.3 kPa, over water; Vm = V ÷ (mass ÷ 24.3).", yLabel: "molar volume (dm³ mol⁻¹)", reps: 200, bins: 20, theory: Vm(), theoryLabel: "RT/p", run: (x, r) => gasRun({ mass: 0.06, acidV: 50, acidC: 1, T: 20, p: 101.3, oxide: 0.03, readErr: 0.5, method: "water" }, r) / 1000 / (0.06 / 24.3), note: "Close to 24 dm³: the oxide coat (less magnesium than you weighed) and water vapour (extra gas volume) push in opposite directions." },
    { title: "pV = nRT: molar volume and temperature", question: "How does the molar volume depend on temperature?", how: "0.06 g magnesium, syringe, 101.3 kPa; Vm = V ÷ moles of Mg.", xLabel: "temperature (°C)", yLabel: "molar volume (dm³ mol⁻¹)", xs: [0, 10, 20, 30, 40], reps: 10, theory: T => Vm(T), theoryLabel: "RT/p", run: (T, r) => gasRun({ mass: 0.06, acidV: 50, acidC: 1, T, p: 101.3, oxide: 0, readErr: 0.5, method: "syringe" }, r) / 1000 / (0.06 / 24.3), note: "A straight line: Vm ∝ T (in kelvin), from 22.4 dm³ at 0 °C to 25.7 dm³ at 40 °C." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 1(e)", text: "Mr = sum of the relative atomic masses in the formula. Moles = mass ÷ Mr. One mole contains 6.02 × 10²³ particles (the Avogadro constant)." },
      { lvl: "std", tag: "4CH1 1(e)", text: "Reacting masses: moles of the known substance → use the ratio in the balanced equation → moles of the other → mass = moles × Mr." },
      { lvl: "std", tag: "4CH1 1(e)", text: "The limiting reactant is used up first and decides how much product forms; the other reactant is in excess." },
      { lvl: "std", tag: "4CH1 1(e)", text: "Empirical formula: the simplest whole-number ratio of atoms. Find the masses, divide by Ar, divide by the smallest, round." },
      { lvl: "std", tag: "4CH1 1(e)", text: "Percentage yield = actual yield ÷ theoretical yield × 100. Molar gas volume 24 dm³ at rtp (Chemistry only); concentration (mol/dm³) = moles ÷ volume (dm³)." },
      { lvl: "adv", tag: "9CH0 5", text: "pV = nRT (p in Pa, V in m³, T in K, R = 8.31 J mol⁻¹ K⁻¹). Atom economy = Mr of desired product ÷ sum of Mr of reactants × 100." },
      { lvl: "adv", tag: "9CH0 5", text: "Percentage uncertainty = uncertainty ÷ measured value × 100; for a difference of two readings, add the uncertainties of both." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const R = REACT[P.react], x = reacting(R, P.mA, P.mB); return `For ${R.eq}, ${P.mA} g of ${R.A[0]} reacts with ${P.mB} g of ${R.B[0]}. Which is the limiting reactant, and what mass of ${R.C[0]} forms?`; }, ans: () => { const R = REACT[P.react], x = reacting(R, P.mA, P.mB); return `<ul><li>moles ${R.A[0]} = ${P.mA} ÷ ${R.A[1]} = ${x.nA.toFixed(3)}; moles ${R.B[0]} = ${P.mB} ÷ ${R.B[1]} = ${x.nB.toFixed(3)}</li><li>ratio ${R.A[2]} : ${R.B[2]}, so ${x.lim === "A" ? R.A[0] : R.B[0]} is limiting</li><li>mass of ${R.C[0]} = ${(x.ext * R.C[2]).toFixed(3)} × ${R.C[1]} = ${x.mC.toFixed(2)} g</li></ul>`; } },
      { lvl: "std", marks: 3, q: "0.24 g of magnesium forms 0.40 g of magnesium oxide. Work out the empirical formula.", ans: "<ul><li>mass of O = 0.40 − 0.24 = 0.16 g</li><li>moles: Mg 0.24 ÷ 24 = 0.010, O 0.16 ÷ 16 = 0.010</li><li>ratio 1 : 1, so MgO</li></ul>" },
      { lvl: "std", marks: 3, q: "2.50 g of hydrated copper sulfate gives 1.60 g of anhydrous CuSO₄ (Mr 159.5). Find x in CuSO₄·xH₂O.", ans: "<ul><li>water = 0.90 g = 0.050 mol</li><li>CuSO₄ = 1.60 ÷ 159.5 = 0.0100 mol</li><li>x = 0.050 ÷ 0.0100 = 5</li></ul>" },
      { lvl: "adv", marks: 3, q: "Calculate the volume of 0.0025 mol of hydrogen at 25 °C and 100 kPa (R = 8.31).", ans: "<ul><li>V = nRT/p = 0.0025 × 8.31 × 298 ÷ 100 000</li><li>= 6.19 × 10⁻⁵ m³</li><li>= 61.9 cm³</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Relative atomic masses as on the iGCSE periodic table (Cl 35.5, Cu 63.5).</li>
<li><b>Burning magnesium:</b> each heating burns a fraction 1 − e^(−k·n) of the magnesium (k larger when the lid is lifted more often); white MgO smoke escapes when the lid is open (0.2%, 0.8% or 3.5% per heating); 2% of the burnt magnesium forms Mg₃N₂ (beyond the spec). Masses on a 0.01 g or 0.001 g balance; heat to constant mass (two readings the same).</li>
<li><b>Hydrates:</b> gentle heating removes about 40% of the remaining water each time; a strong flame removes it all but spits (sometimes) and decomposes 1–2% of the CuSO₄ per heating.</li>
<li><b>Gases:</b> Mg + 2HCl → MgCl₂ + H₂; moles of H₂ from the limiting reactant; V = nRT/p; an oxide coat reduces the magnesium; collecting over water adds water vapour; a late bung loses a few cm³; reading errors.</li>
<li><b>Atom economy:</b> Mr of the desired product ÷ total Mr of the reactants.</li></ul>
<h3>Left out</h3>
<ul><li>Errors in the relative atomic masses, the crucible's own change in mass, impurities in the reactants, gas solubility, and the full Core Practical write-up.</li></ul>
<p>Titrations are in <i>Acids, Salts and Chemical Tests</i>. The earlier version of this simulation, with its worksheets, is kept in <a href="original/moles-reacting-masses.html">original/moles-reacting-masses.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "mole", options: [["mole", "⚖ The mole"], ["react", "🔥 Reacting masses"], ["emp", "🧪 Empirical formula"], ["hydrate", "💧 Hydrates"], ["gas", "🫧 Gas volumes"]], on: v => P.view = v });
g = ui.group("The mole");
ctl.sub = K.seg(g, { value: 0, options: SUBST.map((s, i) => [i, `${s[0]} ${s[1]}`]), on: v => P.sub = +v });
ctl.moles = K.slider(g, { label: "Amount", min: 0.05, max: 3, step: 0.05, value: 1, unit: "mol", on: v => P.moles = v });
g = ui.group("Reacting masses");
ctl.react = K.seg(g, { value: 0, options: REACT.map((R, i) => [i, R.eq]), on: v => P.react = +v });
ctl.mA = K.slider(g, { label: "Mass of reactant A", min: 0.1, max: 20, step: 0.1, value: 4.8, unit: "g", on: v => P.mA = v });
ctl.mB = K.slider(g, { label: "Mass of reactant B", min: 0.1, max: 20, step: 0.1, value: 4.8, unit: "g", on: v => P.mB = v });
K.btn(K.row(g), "⚖ Just enough B", () => { const R = REACT[P.react]; P.mB = +(P.mA / R.A[1] / R.A[2] * R.B[2] * R.B[1]).toFixed(2); ctl.mB.set(P.mB); });
ctl.route = K.seg(g, { label: "Atom economy (A level)", value: 0, options: ROUTES.map((q, i) => [i, q[0]]), on: v => P.route = +v });
g = ui.group("Practicals");
ctl.lid = K.seg(g, { label: "Burning Mg: lift the lid", value: 1, options: [[0, "rarely"], [1, "once a minute"], [2, "very often"]], on: v => P.lid = +v });
ctl.mass = K.slider(g, { label: "Mass of magnesium ribbon", min: 0.05, max: 0.5, step: 0.01, value: 0.24, unit: "g", on: v => P.mass = v });
ctl.balance = K.seg(g, { label: "Balance", value: 0.01, options: [[0.01, "0.01 g"], [0.001, "0.001 g"]], on: v => P.balance = +v });
ctl.flame = K.seg(g, { label: "Hydrate: flame", value: "gentle", options: [["gentle", "gentle"], ["strong", "strong"]], on: v => P.flame = v });
ctl.heats = K.slider(g, { label: "Hydrate: heatings", min: 1, max: 8, step: 1, value: 4, on: v => P.heats = v });
ctl.gmass = K.slider(g, { label: "Gas: mass of magnesium", min: 0.01, max: 0.12, step: 0.005, value: 0.06, unit: "g", on: v => P.gmass = v });
ctl.acidC = K.slider(g, { label: "Gas: acid concentration (50 cm³)", min: 0.05, max: 2, step: 0.05, value: 1, unit: "mol/dm³", on: v => P.acidC = v });
ctl.T = K.slider(g, { label: "Room temperature", min: 0, max: 40, step: 1, value: 20, unit: "°C", on: v => P.T = v });
ctl.oxide = K.slider(g, { label: "Oxide coat on the ribbon", min: 0, max: 0.1, step: 0.005, value: 0, fmt: v => (v * 100).toFixed(1) + "%", on: v => P.oxide = v });
ctl.method = K.seg(g, { label: "Collect gas", value: "syringe", options: [["syringe", "gas syringe"], ["water", "over water"]], on: v => P.method = v });
let rr = K.row(g); K.btn(rr, "▶ Do the experiment", () => doExp(), "primary"); K.btn(rr, "👥 Class of 30", () => { for (let i = 0; i < 30; i++) doExp(true); }); K.btn(rr, "clear", () => classRes = []);
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) { Object.assign(P, { view: "mole", sub: 0, moles: 1, react: 0, mA: 4.8, mB: 4.8, lid: 1, mass: 0.24, balance: 0.01, flame: "gentle", heats: 4, gmass: 0.06, acidC: 1, T: 20, oxide: 0, method: "syringe", route: 0 }, o); for (const k of ["moles", "mA", "mB", "mass", "heats", "gmass", "acidC", "T", "oxide"]) ctl[k].set(P[k]); for (const k of ["view", "sub", "react", "route", "lid", "balance", "flame", "method"]) ctl[k].set(P[k]); classRes = []; last = null; if (["emp", "hydrate", "gas"].includes(P.view)) doExp(); }
function doExp(quiet) {
  if (P.view === "emp" || P.view === "mole" || P.view === "react") { const res = burnMg(P, rnd); if (P.view === "emp") { last = res; classRes.push([res.m, res.mO]); } }
  if (P.view === "hydrate") { const res = hydrate({ mass: 2.5, balance: P.balance, flame: P.flame, heats: P.heats }, rnd); last = res; classRes.push([classRes.length + 1, res.x]); }
  if (P.view === "gas") { const V = gasRun({ mass: P.gmass, acidV: 50, acidC: P.acidC, T: P.T, p: 101.3, oxide: P.oxide, readErr: 0.5, method: P.method }, rnd); last = { V }; classRes.push([P.gmass, V]); }
  T0 = 0;
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function balance(c, x, y, mass, txt) { c.fillStyle = "#2a3550"; c.fillRect(x - 90, y, 180, 40); c.fillStyle = "#0d1a10"; c.fillRect(x - 60, y + 8, 120, 24); TX(c, mass, x, y + 27, "#7ee787", "center", "600 16px"); c.fillStyle = "#8fa0bf"; c.fillRect(x - 70, y - 6, 140, 6); if (txt) TX(c, txt, x, y + 58, "#aab6cc", "center", "12px"); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  if (P.view === "mole") {
    const [nm, f, Mr] = SUBST[P.sub], m = P.moles * Mr, cx = w * 0.3;
    balance(c, cx, h * 0.62, m.toFixed(2) + " g", `${P.moles} mol of ${nm} (${f})`);
    const n = Math.min(300, Math.round(P.moles * 60)), rng = K.rng(P.sub * 7 + 3); for (let i = 0; i < n; i++) { const x = cx - 60 + 120 * rng(), y = h * 0.62 - 10 - Math.abs(rng() - rng()) * 140 * Math.sqrt(P.moles); c.fillStyle = ["#5ad1ff", "#ffd166", "#7ee787", "#ff8a70", "#c9a0ff"][P.sub % 5]; c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); }
    let y = 110; const L = (s, col = "#cfd8ea", f2 = "13.5px") => { TX(c, s, w * 0.55, y, col, "left", f2); y += 28; };
    L(`${nm}: ${f}`, "#eef2f8", "600 16px"); L(`Mr = ${Mr}, so 1 mole has a mass of ${Mr} g`); L(`moles = mass ÷ Mr = ${m.toFixed(2)} ÷ ${Mr} = ${P.moles} mol`, "#ffd166"); L(`particles = ${P.moles} × 6.02 × 10²³ = ${(P.moles * NA).toExponential(2)}`, adv ? "#c9a0ff" : "#8fa0bf"); L("(each dot stands for 10²² particles)", "#7d8aa5", "11.5px");
  } else if (P.view === "react") {
    const R = REACT[P.react], x = reacting(R, P.mA, P.mB); TX(c, R.eq, 20, 32, "#eef2f8", "left", "600 17px");
    const steps = [`1. Moles: ${R.A[0]} ${P.mA} ÷ ${R.A[1]} = ${x.nA.toFixed(3)} mol;  ${R.B[0]} ${P.mB} ÷ ${R.B[1]} = ${x.nB.toFixed(3)} mol`, `2. Ratio ${R.A[2]} : ${R.B[2]}. ${x.lim === "A" ? R.A[0] : R.B[0]} runs out first: it is the limiting reactant.`, `3. ${R.C[0]}: ${(x.ext * R.C[2]).toFixed(3)} mol × ${R.C[1]} = ${x.mC.toFixed(2)} g`, `Left over: ${x.leftA > 1e-6 ? x.leftA.toFixed(2) + " g of " + R.A[0] : x.leftB.toFixed(2) + " g of " + R.B[0]}`];
    steps.forEach((s, i) => TX(c, s, 20, 70 + i * 26, i === 3 ? "#ff8a70" : "#cfd8ea", "left", "13.5px"));
    // particles: A and B join in the equation's ratio; the excess is ringed
    const nA = Math.min(40, Math.round(x.nA / Math.max(x.nA, x.nB) * 40)), nB = Math.min(40, Math.round(x.nB / Math.max(x.nA, x.nB) * 40)), k = Math.min(1, T0 / 2);
    for (let i = 0; i < nA; i++) { const used = i < Math.round(x.ext * R.A[2] / Math.max(x.nA, x.nB) * 40); c.fillStyle = "#5ad1ff"; c.globalAlpha = used ? 1 - k * 0.7 : 1; c.beginPath(); c.arc(40 + (i % 10) * 18, 230 + Math.floor(i / 10) * 18, 6, 0, 6.3); c.fill(); c.globalAlpha = 1; if (!used) { c.strokeStyle = "#ff8a70"; c.beginPath(); c.arc(40 + (i % 10) * 18, 230 + Math.floor(i / 10) * 18, 9, 0, 6.3); c.stroke(); } }
    for (let i = 0; i < nB; i++) { const used = i < Math.round(x.ext * R.B[2] / Math.max(x.nA, x.nB) * 40); c.fillStyle = "#ffd166"; c.globalAlpha = used ? 1 - k * 0.7 : 1; c.beginPath(); c.arc(260 + (i % 10) * 18, 230 + Math.floor(i / 10) * 18, 6, 0, 6.3); c.fill(); c.globalAlpha = 1; if (!used) { c.strokeStyle = "#ff8a70"; c.beginPath(); c.arc(260 + (i % 10) * 18, 230 + Math.floor(i / 10) * 18, 9, 0, 6.3); c.stroke(); } }
    TX(c, R.A[0] + " (blue)", 40, 222, "#5ad1ff", "left", "12px"); TX(c, R.B[0] + " (yellow) · ringed = left over", 260, 222, "#ffd166", "left", "12px");
    if (adv) { const [eq, Mp, Mt] = ROUTES[P.route]; TX(c, `Atom economy: ${eq}: ${Mp} ÷ ${Mt} × 100 = ${(100 * Mp / Mt).toFixed(1)}%`, 20, h - 20, "#c9a0ff", "left", "600 12.5px"); }
  } else if (P.view === "emp") {
    if (!last) return; const res = last; TX(c, `Burning ${res.m.toFixed(2)} g of magnesium in a crucible (lid lifted ${["rarely", "once a minute", "very often"][P.lid]})`, 20, 30, "#eef2f8", "left", "600 14px");
    const cx = w * 0.22, cy = h * 0.42; c.fillStyle = "#c8c0b0"; c.beginPath(); c.moveTo(cx - 50, cy - 30); c.lineTo(cx + 50, cy - 30); c.lineTo(cx + 35, cy + 30); c.lineTo(cx - 35, cy + 30); c.fill(); c.fillStyle = "#3a4a6b"; c.fillRect(cx - 55, cy - 40 - (Math.sin(T0 * 2) > 0.6 && P.lid ? 14 : 0), 110, 8);
    if (T0 < 3) { c.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(T0 * 20)})`; c.beginPath(); c.arc(cx, cy - 10, 14, 0, 6.3); c.fill(); }
    c.fillStyle = "#3a4a6b"; c.fillRect(cx - 4, cy + 30, 8, 60); if (P.lid === 2) for (let i = 0; i < 8; i++) { c.fillStyle = "rgba(240,240,240,.4)"; c.beginPath(); c.arc(cx + 20 * Math.sin(T0 + i), cy - 50 - ((T0 * 30 + i * 15) % 80), 6, 0, 6.3); c.fill(); }
    let y = 80; const L = (s, col = "#cfd8ea") => { TX(c, s, w * 0.45, y, col, "left", "13px"); y += 23; };
    L(`crucible + lid: ${res.crucible.toFixed(P.balance < 0.01 ? 3 : 2)} g`); L(`magnesium: ${res.mMg.toFixed(P.balance < 0.01 ? 3 : 2)} g`); res.heats.forEach((m, i) => L(`after heating ${i + 1}: ${m.toFixed(P.balance < 0.01 ? 3 : 2)} g${i && Math.abs(m - res.heats[i - 1]) <= P.balance ? " (constant mass)" : ""}`, "#aab6cc"));
    L(`oxygen gained: ${res.mO.toFixed(3)} g → ${(res.mO / 16).toExponential(2)} mol O; Mg ${(res.m / 24.3).toExponential(2)} mol`, "#ffd166"); L(`ratio O : Mg = ${res.ratio.toFixed(2)} : 1 → formula ${res.ratio > 0.85 && res.ratio < 1.15 ? "MgO" : "?"}`, "#7ee787");
  } else if (P.view === "hydrate") {
    if (!last) return; const res = last, k = Math.min(1, res.heats.length / 4); TX(c, `Heating ${res.m.toFixed(2)} g of hydrated copper(II) sulfate (${P.flame} flame)`, 20, 30, "#eef2f8", "left", "600 14px");
    const cx = w * 0.22, cy = h * 0.42; c.fillStyle = `rgb(${Math.round(40 + 200 * k)},${Math.round(110 + 130 * k)},${Math.round(220 + 20 * k)})`; c.fillRect(cx - 50, cy - 10, 100, 30); c.strokeStyle = "#c8c0b0"; c.lineWidth = 3; c.strokeRect(cx - 54, cy - 30, 108, 54); c.lineWidth = 1; TX(c, k < 1 ? "blue → white" : "white (anhydrous)", cx, cy + 50, "#aab6cc", "center", "12px");
    let y = 80; const L = (s, col = "#cfd8ea") => { TX(c, s, w * 0.45, y, col, "left", "13px"); y += 23; };
    res.heats.forEach((m, i) => L(`after heating ${i + 1}: ${m.toFixed(2)} g`, "#aab6cc")); const fin = res.heats[res.heats.length - 1];
    L(`water lost ${(res.m - fin).toFixed(2)} g = ${((res.m - fin) / 18).toFixed(4)} mol; CuSO₄ ${fin.toFixed(2)} g = ${(fin / 159.6).toFixed(4)} mol`, "#ffd166"); L(`x = ${res.x.toFixed(2)} (true value 5)`, "#7ee787");
  } else {
    const V = last ? last.V : 0, k = Math.min(1, T0 / 3); TX(c, `${P.gmass} g of magnesium + 50 cm³ of ${P.acidC} mol/dm³ HCl → hydrogen (${P.method === "syringe" ? "gas syringe" : "collected over water"}), ${P.T} °C`, 20, 30, "#eef2f8", "left", "600 13.5px");
    const fx = w * 0.15, fy = h * 0.55; c.fillStyle = "rgba(160,200,255,.3)"; c.fillRect(fx - 40, fy - 20, 80, 60); for (let i = 0; i < 12 * (1 - k); i++) { c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(fx - 30 + (i * 13) % 60, fy + 30 - ((T0 * 60 + i * 9) % 50), 2.5, 0, 6.3); c.fill(); }
    const sx = w * 0.32, sy = fy - 30, sw = w * 0.4; c.strokeStyle = "rgba(255,255,255,.6)"; c.strokeRect(sx, sy, sw, 30); c.fillStyle = "#3a4a6b"; c.fillRect(sx + sw * Math.min(1, V * k / 100), sy + 2, 8, 26); for (let v = 0; v <= 100; v += 10) TX(c, String(v), sx + sw * v / 100, sy - 6, "#aab6cc", "center", "10px");
    let y = fy + 70; const L = (s, col = "#cfd8ea") => { TX(c, s, 20, y, col, "left", "13px"); y += 24; };
    const nMg = P.gmass / 24.3, nH = Math.min(nMg, 0.05 * P.acidC / 2); L(`moles Mg = ${P.gmass} ÷ 24.3 = ${nMg.toExponential(2)}; moles HCl = ${(0.05 * P.acidC).toExponential(2)} → ${nMg < 0.05 * P.acidC / 2 ? "acid in excess" : "acid is limiting"}`); L(`expected H₂ = ${nH.toExponential(2)} mol × ${(Vm(P.T) * 1000).toFixed(0)} cm³ = ${(nH * Vm(P.T) * 1000).toFixed(1)} cm³`, "#ffd166"); L(`measured: ${(V * k).toFixed(1)} cm³${adv ? ` → molar volume ${(V / 1000 / nMg).toFixed(2)} dm³ mol⁻¹ (RT/p = ${Vm(P.T).toFixed(2)})` : ""}`, "#7ee787");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "mole") {
    chA.opts.title = "Mass against moles (gradient = Mr)"; chA.opts.xLabel = "moles"; chA.opts.yLabel = "mass (g)"; chA.draw(SUBST.slice(0, 6).map((s, i) => ({ pts: [[0, 0], [3, 3 * s[2]]], color: ["#5ad1ff", "#ffd166", "#7ee787", "#ff8a70", "#c9a0ff", "#cfd8ea"][i], label: s[1] })), { yMin: 0, xMin: 0, xMax: 3, vlines: [{ x: P.moles, label: "now" }] });
    chB.opts.title = "Mass of one mole"; chB.opts.xLabel = ""; chB.opts.yLabel = "g"; chB.opts.xFmt = whole(i => (SUBST[i - 1] || ["", ""])[1]); chB.draw([{ pts: SUBST.map((s, i) => [i + 1, s[2]]), type: "bars", w: 0.6, color: "#5ad1ff", label: "Mr in grams" }], { yMin: 0, xMin: 0.4, xMax: SUBST.length + 0.6 });
    const [, , Mr] = SUBST[P.sub]; label(0, "mass"); label(1, "moles"); label(2, "particles"); label(3, "Mr"); read.set("a", (P.moles * Mr).toFixed(2) + " g"); read.set("b", P.moles + " mol"); read.set("c", (P.moles * NA).toExponential(3)); read.set("d", String(Mr));
  } else if (P.view === "react") {
    const R = REACT[P.react], pts = []; for (let m = 0.1; m <= 20; m += 0.1) pts.push([m, reacting(R, m, P.mB).mC]); const x = reacting(R, P.mA, P.mB);
    chA.opts.title = `Mass of ${R.C[0]} against mass of ${R.A[0]} (${P.mB} g of ${R.B[0]})`; chA.opts.xLabel = `mass of ${R.A[0]} (g)`; chA.opts.yLabel = "g"; chA.draw([{ pts, color: "#7ee787", label: R.C[0] }, { pts: [[P.mA, x.mC]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0 });
    chB.opts.title = "Moles before and after"; chB.opts.xLabel = ""; chB.opts.yLabel = "mol"; chB.opts.xFmt = whole(i => ["", R.A[0], R.B[0], R.C[0]][i] || "");
    chB.draw([{ pts: [[0.85, x.nA], [1.85, x.nB], [2.85, 0]], type: "bars", w: 0.3, color: "#5ad1ff", label: "before" }, { pts: [[1.15, x.leftA / R.A[1]], [2.15, x.leftB / R.B[1]], [3.15, x.ext * R.C[2]]], type: "bars", w: 0.3, color: "#ffd166", label: "after" }], { yMin: 0, xMin: 0.4, xMax: 3.6 });
    label(0, "limiting reactant"); label(1, "product"); label(2, "left over"); label(3, "atom economy (A level)"); read.set("a", x.lim === "A" ? R.A[0] : R.B[0]); read.set("b", x.mC.toFixed(2) + " g of " + R.C[0]); read.set("c", x.leftA > 1e-6 ? x.leftA.toFixed(2) + " g " + R.A[0] : x.leftB.toFixed(2) + " g " + R.B[0]); read.set("d", (100 * ROUTES[P.route][1] / ROUTES[P.route][2]).toFixed(1) + "%");
  } else if (P.view === "emp") {
    chA.opts.title = "Class results"; chA.opts.xLabel = "mass of magnesium (g)"; chA.opts.yLabel = "mass of oxygen (g)"; chA.draw([{ pts: classRes, type: "dots", r: 4, color: "#ffd166", label: "students" }, { pts: [[0, 0], [0.55, 0.55 * 16 / 24.3]], color: "#7ee787", label: "MgO" }, { pts: [[0, 0], [0.55, 0.55 * 32 / 24.3]], color: "#56607a", dash: [4, 4], label: "MgO₂" }, { pts: [[0, 0], [0.55, 0.55 * 8 / 24.3]], color: "#56607a", dash: [2, 3], label: "Mg₂O" }], { xMin: 0, yMin: 0 });
    chB.opts.title = "Mass after each heating"; chB.opts.xLabel = "heating"; chB.opts.yLabel = "g"; chB.draw(last ? [{ pts: last.heats.map((m, i) => [i + 1, m]), color: "#5ad1ff", label: "mass" }] : [], {});
    const rs = classRes.map(q => (q[1] / 16) / (q[0] / 24.3)); label(0, "your ratio O : Mg"); label(1, "class mean"); label(2, "students"); label(3, "–"); read.set("a", last ? last.ratio.toFixed(3) : "–"); read.set("b", rs.length ? K.mean(rs).toFixed(3) : "–"); read.set("c", String(rs.length)); read.set("d", "–");
  } else if (P.view === "hydrate") {
    chA.opts.title = "Mass after each heating"; chA.opts.xLabel = "heating"; chA.opts.yLabel = "g"; chA.draw(last ? [{ pts: last.heats.map((m, i) => [i + 1, m]), color: "#5ad1ff", label: "mass" }] : [], { hlines: last ? [{ y: last.m * 159.6 / 249.7, label: "pure anhydrous CuSO₄", color: "#7ee787" }] : [] });
    chB.opts.title = "Your values of x"; chB.opts.xLabel = "attempt"; chB.opts.yLabel = "x"; chB.draw([{ pts: classRes, type: "dots", r: 4, color: "#ffd166", label: "x" }], { yMin: 0, hlines: [{ y: 5, label: "5", color: "#7ee787" }] });
    label(0, "x"); label(1, "class mean"); label(2, "attempts"); label(3, "–"); read.set("a", last ? last.x.toFixed(2) : "–"); read.set("b", classRes.length ? K.mean(classRes.map(q => q[1])).toFixed(2) : "–"); read.set("c", String(classRes.length)); read.set("d", "–");
  } else {
    const pts = []; for (let m = 0.005; m <= 0.12; m += 0.005) pts.push([m, Math.min(m / 24.3, 0.05 * P.acidC / 2) * Vm(P.T) * 1000]);
    chA.opts.title = "Volume against mass of magnesium"; chA.opts.xLabel = "mass of Mg (g)"; chA.opts.yLabel = "H₂ (cm³)"; chA.draw([{ pts, color: "#7ee787", label: "theory" }, { pts: classRes, type: "dots", r: 4, color: "#ffd166", label: "measured" }], { yMin: 0 });
    const tp = []; for (let T = 0; T <= 40; T += 2) tp.push([T, Vm(T)]); chB.opts.title = "Molar volume against temperature (pV = nRT)"; chB.opts.xLabel = "°C"; chB.opts.yLabel = "dm³ mol⁻¹"; chB.draw([{ pts: tp, color: "#c9a0ff", label: "RT/p" }, { pts: [[P.T, Vm(P.T)]], type: "dots", r: 6, color: "#fff", label: "now" }], {});
    label(0, "volume measured"); label(1, "expected"); label(2, "molar volume (A level)"); label(3, "–"); const nMg = P.gmass / 24.3; read.set("a", last ? last.V.toFixed(1) + " cm³" : "–"); read.set("b", (Math.min(nMg, 0.05 * P.acidC / 2) * Vm(P.T) * 1000).toFixed(1) + " cm³"); read.set("c", last ? (last.V / 1000 / nMg).toFixed(2) + " dm³ mol⁻¹" : "–"); read.set("d", "–");
  }
  ui.hud({ mole: "moles = mass ÷ Mr", react: "The limiting reactant decides how much product forms", emp: "Find the ratio of moles of atoms", hydrate: "Heat to constant mass", gas: "One mole of gas: 24 dm³ at rtp" }[P.view]);
}
let frame = 0;
ui.run(dt => { if (dt > 0) T0 += dt; }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views: the mole, reacting masses, and three practicals with realistic errors.", 6000);
