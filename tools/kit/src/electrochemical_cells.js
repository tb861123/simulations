/* =====================================================================
   ELECTROCHEMICAL CELLS
   A more reactive metal gives its electrons to the ions of a less
   reactive metal: DISPLACEMENT (Zn + Cu²⁺ → Zn²⁺ + Cu). The metal is
   OXIDISED (loses electrons), the ions are REDUCED (gain electrons):
   OIL RIG. Done in one beaker the energy comes out as heat.
   Separate the two halves and join them with a wire and a salt bridge,
   and the electrons must go round the circuit: a CELL. The bigger the
   difference in reactivity, the bigger the voltage.
   At A level each half-cell has a STANDARD ELECTRODE POTENTIAL E°
   (measured against the standard hydrogen electrode, 298 K, 1 mol dm⁻³,
   100 kPa):    E°cell = E°(positive electrode) − E°(negative electrode)
   A positive E°cell means the reaction is feasible (though it may be
   too slow to see). Concentration changes E (the Nernst equation).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const F = 96485, Rg = 8.314;
// standard electrode potentials (V, 298 K): [symbol, label, E°, electrons, oxidised form, reduced form, type]
const COUPLES = {
  Li: ["Li⁺/Li", -3.04, 1, "Li⁺", "Li", "metal"], K: ["K⁺/K", -2.93, 1, "K⁺", "K", "metal"], Mg: ["Mg²⁺/Mg", -2.37, 2, "Mg²⁺", "Mg", "metal"], Al: ["Al³⁺/Al", -1.66, 3, "Al³⁺", "Al", "metal"],
  Zn: ["Zn²⁺/Zn", -0.76, 2, "Zn²⁺", "Zn", "metal"], Fe: ["Fe²⁺/Fe", -0.44, 2, "Fe²⁺", "Fe", "metal"], Ni: ["Ni²⁺/Ni", -0.25, 2, "Ni²⁺", "Ni", "metal"], Pb: ["Pb²⁺/Pb", -0.13, 2, "Pb²⁺", "Pb", "metal"],
  H: ["H⁺/H₂ (SHE)", 0.00, 2, "2H⁺", "H₂", "gas"], Cu: ["Cu²⁺/Cu", 0.34, 2, "Cu²⁺", "Cu", "metal"], I: ["I₂/I⁻", 0.54, 2, "I₂", "2I⁻", "pt"], Fe3: ["Fe³⁺/Fe²⁺", 0.77, 1, "Fe³⁺", "Fe²⁺", "pt"],
  Ag: ["Ag⁺/Ag", 0.80, 1, "Ag⁺", "Ag", "metal"], Br: ["Br₂/Br⁻", 1.09, 2, "Br₂", "2Br⁻", "pt"], O2: ["O₂/H₂O", 1.23, 4, "O₂ + 4H⁺", "2H₂O", "gas"], Cr: ["Cr₂O₇²⁻/Cr³⁺", 1.33, 6, "Cr₂O₇²⁻", "2Cr³⁺", "pt"],
  Cl: ["Cl₂/Cl⁻", 1.36, 2, "Cl₂", "2Cl⁻", "gas"], Mn: ["MnO₄⁻/Mn²⁺", 1.51, 5, "MnO₄⁻", "Mn²⁺", "pt"]
};
// electrode potential at concentration c (mol dm⁻³) of the oxidised form, temperature T (K): the Nernst equation (beyond 9CH0)
const Eof = (k, c = 1, T = 298) => COUPLES[k][1] + (Rg * T / (COUPLES[k][2] * F)) * Math.log(Math.max(1e-9, c));
// ---- displacement ----
const DHF = { Mg: -466.9, Zn: -153.9, Fe: -89.1, Cu: 64.8, Ag: 105.6 };   // enthalpy of formation of the aqueous ion, kJ mol⁻¹
const SALT = { Mg: "MgSO₄", Zn: "ZnSO₄", Fe: "FeSO₄", Cu: "CuSO₄", Ag: "AgNO₃" }, METALS = ["Mg", "Zn", "Fe", "Cu", "Ag"];
// ΔH for metal X with the ions of Y (per mole of Y ions for 2+, per 2 mol for Ag⁺): positive means no reaction
function dispDH(X, Y) { const nY = Y === "Ag" ? 2 : 1; return DHF[X] - nY * DHF[Y]; }   // X + Y²⁺ → X²⁺ + Y (or X + 2Ag⁺ → X²⁺ + 2Ag)
const reacts = (X, Y) => COUPLES[X][1] < COUPLES[Y][1] - 0.05;
// the "no heat lost" rise: 25 cm³ of 0.50 mol dm⁻³ (0.0125 mol of ions; metal in excess); heat capacity 110 J K⁻¹
function riseNoLoss(X, Y) { if (!reacts(X, Y)) return 0; const n = Y === "Ag" ? 0.0125 / 2 : 0.0125; return -dispDH(X, Y) * 1000 * n / 110; }
// ---- simple cells in salt water (galvanic series, V against a calomel reference) ----
const GAL = { Mg: -1.60, Zn: -1.03, Al: -0.79, Fe: -0.61, Pb: -0.50, Cu: -0.34, Ag: -0.13, C: 0.25 }, GNAME = { Mg: "magnesium", Zn: "zinc", Al: "aluminium", Fe: "iron", Pb: "lead", Cu: "copper", Ag: "silver", C: "graphite" };
// ---- fuel cell (10 cm²): voltage against current density j (A cm⁻²) ----
const fuelV = j => Math.max(0, 1.229 - 0.05 * Math.log((j + 0.003) / 0.0001) - 0.15 * j + 0.05 * Math.log(Math.max(1e-6, 1 - j / 1.4)));
const liV = soc => 3.7 + 0.5 * (soc - 0.5) - 0.6 * Math.exp(-soc / 0.05) + 0.25 * Math.exp(-(1 - soc) / 0.08);
// ---- CP10: a student's reading of a cell (realistic errors) ----
function reading(kNeg, kPos, o, r) {
  let emf = Eof(kPos, o.cPos * (1 + 0.05 * r.gauss()), o.T) - Eof(kNeg, o.cNeg * (1 + 0.05 * r.gauss()), o.T) + 0.006 * r.gauss();
  if (!o.clean) for (const k of [kNeg, kPos]) if (COUPLES[k][5] === "metal") emf += (k === kNeg ? -1 : 1) * 0.04 * r();   // oxide films make metals look less reactive
  if (kNeg === "Mg") emf -= 0.7; if (kNeg === "Al") emf -= 1.0;   // magnesium and aluminium never reach E° (oxide layer)
  if (!o.bridge) emf = 0; if (o.meter === "coil") emf *= 1000 / (1000 + 2000);
  return Math.round((emf + 0.005 * r.gauss()) * 100) / 100;
}
// ---- redox titrations ----
const TIT = { mn: { name: "iron(II) with manganate(VII)", titrant: "0.0200 mol dm⁻³ KMnO₄", ratio: 5, cT: 0.02, analyte: "Fe²⁺" }, thio: { name: "iodine with thiosulfate", titrant: "0.100 mol dm⁻³ Na₂S₂O₃", ratio: 0.5, cT: 0.1, analyte: "I₂" } };
// concentration of the flask's analyte from a titre: moles titrant × ratio ÷ 25.0 cm³
const concFrom = (kind, titre) => TIT[kind].cT * titre / 1000 * TIT[kind].ratio / 0.025;
function studentTitre(kind, c, r, careful = true) { const pip = 25.0 + 0.06 * r.gauss(), true_ = c * pip / 1000 / TIT[kind].ratio / TIT[kind].cT * 1000; const drop = 0.05, over = careful ? r() * drop : r() * 0.4; return Math.round((true_ + over) / 0.05) * 0.05; }

// ---------------- The page ----------------
const DEF = { view: "disp", X: "Zn", Y: "Cu", form: "powder", e1: "Zn", e2: "Cu", ncell: 1, load: "meter", neg: "Zn", pos: "Cu", cNeg: 1, cPos: 1, T: 298, meter: "hi", clean: true, bridge: true, fuel: "acid", j: 0.3, li: "dis", kind: "mn", speed: 1 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 15), run = true, D = null, grid = {}, recorded = [], reads = [], soc = 1, tit = null, titres = [], tAnim = 0;
const ui = K.app({
  title: "Electrochemical Cells", subject: "Chemistry",
  blurb: "Displacement and the reactivity series, simple cells, half-cells and E°, fuel and storage cells, and redox titrations",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 2(d) Reactivity series: displacement reactions, deducing the order of reactivity, oxidation and reduction (and 3(a): displacement is exothermic). Simple cells and the hydrogen fuel cell may go beyond 4CH1: check.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 14 Redox II: half-cells, salt bridge, standard hydrogen electrode and standard conditions, E°cell = E°(+) − E°(−), feasibility and its limits, fuel and storage cells, redox titrations (manganate(VII), iodine–thiosulfate), Core Practical 10. Nernst and ΔG = −nFE are extensions." } },
  missions: [
    { title: "Displacement", q: "Put zinc powder in copper(II) sulfate. What do you see? Write the ionic equation and say what is oxidised.", hint: "The blue fades, a brown coating forms and the temperature rises. Zn + Cu²⁺ → Zn²⁺ + Cu. Zinc loses electrons (oxidised); copper ions gain them (reduced).", setup() { set({ view: "disp", X: "Zn", Y: "Cu" }); } },
    { title: "Order of reactivity", q: "Do every metal with every solution (▦ Do them all). Use the results grid to put the five metals in order.", hint: "A metal displaces any metal below it: Mg > Zn > Fe > Cu > Ag. The more reactions a metal gives, the more reactive it is; the bigger the temperature rise, the bigger the difference.", setup() { set({ view: "disp" }); doAll(); } },
    { title: "A simple cell", q: "Put zinc and copper in salt water joined through a voltmeter. Which way do electrons flow? Which metal is the negative terminal?", hint: "Electrons flow from the more reactive metal (zinc, the negative terminal, which dissolves) through the wire to copper. About 0.7 V in salt water.", setup() { set({ view: "simple", e1: "Zn", e2: "Cu" }); } },
    { title: "Bigger difference, bigger voltage", q: "Keep copper and try each other metal. Plot the voltage against reactivity. Which metal is odd?", hint: "Voltage rises the further apart the metals are, but aluminium gives less than expected: its oxide layer protects it.", setup() { set({ view: "simple", e1: "Mg", e2: "Cu" }); } },
    { title: "Light an LED", q: "An LED needs about 1.8 V. How many zinc–copper cells in series do you need?", hint: "About three (3 × 0.7 V). Cells in series add their voltages: that is what a battery is.", setup() { set({ view: "simple", e1: "Zn", e2: "Cu", ncell: 1, load: "led" }); } },
    { title: "Hydrogen fuel cell", q: "Increase the current drawn from the fuel cell. What happens to the voltage, and to the efficiency?", hint: "The voltage falls from about 1 V (energy lost driving the reactions and pushing current through the cell), so the efficiency falls too. The only product is water.", setup() { set({ view: "fuel", j: 0.1 }); } },
    { lvl: "adv", title: "CP10: E°cell", q: "Set up Zn|Zn²⁺||Cu²⁺|Cu with a high-resistance voltmeter. Take readings. How close are you to 1.10 V?", hint: "E°cell = E°(+) − E°(−) = 0.34 − (−0.76) = 1.10 V. Readings scatter by about 0.01 V (concentrations, junction potential, cleaning).", setup() { set({ view: "half", neg: "Zn", pos: "Cu" }); } },
    { lvl: "adv", title: "Feasibility and its limits", q: "Pair Cr₂O₇²⁻/Cr³⁺ with Cl₂/Cl⁻. Is the reaction feasible? Now dilute the copper in a Zn/Cu cell to 0.001 mol dm⁻³. What happens to E?", hint: "E°cell is only 0.03 V: feasible but marginal, and a change of conditions can reverse it. Diluting Cu²⁺ lowers its E by 0.089 V (0.0296 V per tenfold dilution).", setup() { set({ view: "half", neg: "Cr", pos: "Cl" }); } },
    { lvl: "adv", title: "Why a high-resistance voltmeter?", q: "Switch to the moving-coil meter (1 kΩ). Why does the reading drop so much?", hint: "The cell has about 2 kΩ of internal resistance; drawing current wastes most of the voltage inside it. A high-resistance voltmeter draws almost no current, so it reads the EMF.", setup() { set({ view: "half", meter: "coil" }); } },
    { lvl: "adv", title: "Redox titration", q: "Titrate the iron(II) solution with 0.0200 mol dm⁻³ KMnO₄. Get two concordant titres and find [Fe²⁺].", hint: "MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O. The end point is the first permanent pink. [Fe²⁺] = 5 × moles of MnO₄⁻ ÷ 0.0250 dm³.", setup() { set({ view: "tit", kind: "mn" }); } }
  ],
  batch: [
    { title: "Simple cells: reactivity and voltage", question: "How does the voltage of a simple cell against copper depend on how far apart the metals are in E°?", how: "Each metal against copper in salt water; high-resistance voltmeter; galvanic series in sea water with ±0.02 V.", xLabel: "E°(Cu) − E°(metal) (V)", yLabel: "voltage measured (V)", xs: [0.47, 0.78, 1.10, 2.00, 2.71], reps: 5, yMin: 0, theory: x => x, theoryLabel: "E° difference", run: (x, r) => { const m = { 0.47: "Pb", 0.78: "Fe", 1.1: "Zn", 2: "Al", 2.71: "Mg" }[Math.round(x * 100) / 100]; return GAL.Cu - GAL[m] + 0.02 * r.gauss(); }, note: "Voltage rises with the difference, but always below E° in salt water (non-standard conditions, oxide films), and aluminium (x = 2.00) falls well below the trend: its oxide layer." },
    { title: "CP10: EMF of the zinc–copper cell", question: "What do 200 students measure for Zn|Zn²⁺||Cu²⁺|Cu?", how: "1.00 mol dm⁻³ solutions (±5%), cleaned electrodes, high-resistance voltmeter read to 0.01 V, junction potential ±0.006 V.", yLabel: "EMF measured (V)", reps: 200, bins: 12, theory: 1.10, theoryLabel: "E°cell", run: (x, r) => reading("Zn", "Cu", { cNeg: 1, cPos: 1, T: 298, clean: true, bridge: true, meter: "hi" }, r), note: "Mean about 1.10 V, SD about 0.01 V: good agreement under standard conditions." },
    { title: "Concentration and EMF", question: "How does the EMF of a Zn/Cu cell change when the copper(II) solution is diluted?", how: "[Zn²⁺] = 1.00; [Cu²⁺] from 1 to 10⁻⁴ mol dm⁻³; 5 readings each.", xLabel: "log₁₀[Cu²⁺]", yLabel: "EMF (V)", xs: [0, -1, -2, -3, -4], reps: 5, fit: true, theory: x => Eof("Cu", 10 ** x) - Eof("Zn", 1), theoryLabel: "Nernst", run: (x, r) => reading("Zn", "Cu", { cNeg: 1, cPos: 10 ** x, T: 298, clean: true, bridge: true, meter: "hi" }, r), note: "A straight line of gradient 0.030 V per tenfold dilution (RT ln10 / 2F): small, which is why E° tables assume 1 mol dm⁻³." },
    { title: "Electrode potentials via a copper reference", question: "Measuring each metal against copper, what electrode potentials do students find?", how: "E(metal) = E°(Cu) − EMF; uncleaned electrodes not allowed; magnesium's oxide layer included.", xLabel: "data-book E° (V)", yLabel: "E found (V)", xs: [-2.37, -0.76, -0.44, -0.25, -0.13, 0.80], reps: 5, theory: x => x, theoryLabel: "data book", run: (x, r) => { const k = { "-2.37": "Mg", "-0.76": "Zn", "-0.44": "Fe", "-0.25": "Ni", "-0.13": "Pb", "0.8": "Ag" }[String(Math.round(x * 100) / 100)]; return k === "Ag" ? 0.34 + reading("Cu", "Ag", { cNeg: 1, cPos: 1, T: 298, clean: true, bridge: true, meter: "hi" }, r) : 0.34 - reading(k, "Cu", { cNeg: 1, cPos: 1, T: 298, clean: true, bridge: true, meter: "hi" }, r); }, note: "On the line except magnesium, which reads about 0.7 V less negative than −2.37 V: its oxide layer and reaction with water stop it reaching its standard potential." },
    { title: "Why a high-resistance voltmeter?", question: "What does a meter of resistance R read on a Zn/Cu cell with 2 kΩ internal resistance?", how: "Reading = EMF × R ÷ (R + 2000 Ω).", xLabel: "log₁₀(meter resistance / Ω)", yLabel: "reading (V)", xs: [2, 2.5, 3, 3.5, 4, 5, 6, 7], reps: 1, yMin: 0, theory: x => 1.10 * 10 ** x / (10 ** x + 2000), theoryLabel: "EMF × R/(R + r)", run: x => 1.10 * 10 ** x / (10 ** x + 2000), note: "A 1 kΩ meter reads only a third of the EMF; above about 1 MΩ the reading is the EMF. Digital voltmeters are 10 MΩ." },
    { title: "Fuel cell: voltage falls as current rises", question: "How does a hydrogen fuel cell's voltage depend on the current density?", how: "10 cm² cell; voltage from activation, resistance and mass-transport losses; ±0.01 V.", xLabel: "current density (A cm⁻²)", yLabel: "cell voltage (V)", xs: [0.01, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2], reps: 3, yMin: 0, theory: fuelV, theoryLabel: "model", run: (j, r) => fuelV(j) + 0.01 * r.gauss(), note: "Never the 1.23 V of E°: a quick drop at low current (activation), a steady fall (resistance), then a collapse as gases cannot reach the catalyst fast enough." },
    { title: "Redox titration: 200 students", question: "What concentration of iron(II) do 200 careful students find?", how: "True [Fe²⁺] = 0.1000 mol dm⁻³; pipette ±0.06 cm³; burette read to 0.05 cm³; end point to within one drop.", yLabel: "[Fe²⁺] found (mol dm⁻³)", reps: 200, bins: 16, theory: 0.1, theoryLabel: "true", run: (x, r) => { const a = studentTitre("mn", 0.1, r), b = studentTitre("mn", 0.1, r); return concFrom("mn", (a + b) / 2); }, note: "Within about ±0.3%: careful volumetric work is very precise. A rough (fast) titre would be about 0.2 cm³ high." },
    { title: "Displacement: how hot does it get?", question: "How big is the temperature rise for each metal in copper(II) sulfate?", how: "Powdered metal in excess, 25 cm³ of 0.50 mol dm⁻³ CuSO₄ in a polystyrene cup; heat loss 0.5% of the excess temperature each second; the highest temperature recorded.", xLabel: "metal (0 Mg · 1 Zn · 2 Fe)", yLabel: "temperature rise (°C)", xs: [0, 1, 2], reps: 5, yMin: 0, theory: x => riseNoLoss(["Mg", "Zn", "Fe"][Math.round(x)], "Cu"), theoryLabel: "no heat lost", run: (x, r) => { const d = newDisp(["Mg", "Zn", "Fe"][x], "Cu", "powder", r); for (let t = 0; t < 900; t++) dispStep(d, 1); return d.max - 20; }, note: "Mg > Zn > Fe, all below the 'no heat lost' rise (heat escapes while the reaction runs; iron reacts so slowly that much of its heat is lost)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 2(d)", text: "A more reactive metal displaces a less reactive metal from a solution of its salt. Reactivity: K > Na > Li > Ca > Mg > Al > Zn > Fe > Cu > Ag > Au." },
      { lvl: "std", tag: "4CH1 2(d)", text: "Oxidation is loss of electrons, reduction is gain (OIL RIG). In Zn + Cu²⁺ → Zn²⁺ + Cu, zinc is oxidised and copper ions are reduced; it is a redox reaction." },
      { lvl: "std", tag: "Beyond 4CH1 (check)", text: "In a simple cell the more reactive metal is the negative electrode; electrons flow through the wire to the less reactive metal. Further apart in reactivity = bigger voltage." },
      { lvl: "adv", tag: "9CH0 14", text: "E° is measured against the standard hydrogen electrode at 298 K, 1 mol dm⁻³ ions and 100 kPa gases. E°cell = E°(+) − E°(−). If E°cell > 0 the reaction is feasible, but it may be too slow (kinetics) or conditions may not be standard." },
      { lvl: "adv", tag: "9CH0 14", text: "Redox titrations: MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O (self-indicating); I₂ + 2S₂O₃²⁻ → 2I⁻ + S₄O₆²⁻ (starch near the end point)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Zinc is added to copper(II) sulfate solution. Describe two observations and write the ionic equation.", ans: "<ul><li>brown/pink solid forms (copper); blue colour fades; temperature rises</li><li>Zn + Cu²⁺ → Zn²⁺ + Cu</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `Calculate E°cell for a cell made from ${COUPLES[P.neg][0]} and ${COUPLES[P.pos][0]}.`, ans: () => { const a = COUPLES[P.neg][1], b = COUPLES[P.pos][1], hi = Math.max(a, b), lo = Math.min(a, b); return `<ul><li>E°cell = E°(+) − E°(−) = ${hi.toFixed(2)} − (${lo.toFixed(2)})</li><li>= ${(hi - lo).toFixed(2)} V</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "25.0 cm³ of iron(II) solution needs 24.60 cm³ of 0.0200 mol dm⁻³ KMnO₄. Calculate [Fe²⁺].", ans: "<ul><li>moles MnO₄⁻ = 0.0200 × 0.02460 = 4.92 × 10⁻⁴</li><li>moles Fe²⁺ = 5 × 4.92 × 10⁻⁴ = 2.46 × 10⁻³</li><li>[Fe²⁺] = 2.46 × 10⁻³ ÷ 0.0250 = 0.0984 mol dm⁻³</li></ul>" }
    ]
  },
  notes: `<h3>The models and data</h3>
<ul><li>E° (V, 298 K): Li −3.04, K −2.93, Mg −2.37, Al −1.66, Zn −0.76, Fe −0.44, Ni −0.25, Pb −0.13, H⁺/H₂ 0.00, Cu +0.34, I₂/I⁻ +0.54, Fe³⁺/Fe²⁺ +0.77, Ag +0.80, Br₂/Br⁻ +1.09, O₂/H₂O +1.23, Cr₂O₇²⁻/Cr³⁺ +1.33, Cl₂/Cl⁻ +1.36, MnO₄⁻/Mn²⁺ +1.51 (standard tables; data booklets). Concentration effects by the Nernst equation (only the oxidised form's concentration is varied).</li>
<li>Displacement: ΔH from enthalpies of formation of the aqueous ions (Mg²⁺ −466.9, Zn²⁺ −153.9, Fe²⁺ −89.1, Cu²⁺ +64.8, Ag⁺ +105.6 kJ mol⁻¹); 25 cm³ of 0.50 mol dm⁻³; heat capacity 110 J K⁻¹; heat loss 0.5% of the excess a second; powders react faster than strips; iron is slow.</li>
<li>Simple cells: approximate galvanic series in sea water (V vs SCE: Mg −1.60, Zn −1.03, Al −0.79, Fe −0.61, Pb −0.50, Cu −0.34, Ag −0.13, graphite +0.25); internal resistance 400 Ω per cell; LED needs 1.8 V.</li>
<li>CP10 errors: voltmeter read to 0.01 V (±0.005), junction ±0.006 V, concentrations ±5%, oxide films on uncleaned metals, magnesium (+0.7 V) and aluminium (+1.0 V) never reach E°; a 1 kΩ meter on a 2 kΩ cell.</li>
<li>Fuel cell: V = 1.229 − 0.05 ln((j + 0.003)/0.0001) − 0.15j + 0.05 ln(1 − j/1.4); efficiency V ÷ 1.48 V. Lithium-ion: an illustrative 3.0–4.2 V discharge curve.</li>
<li>Titrations: 0.0200 mol dm⁻³ KMnO₄ or 0.100 mol dm⁻³ Na₂S₂O₃; pipette ±0.06 cm³; burette read to 0.05 cm³; drops of 0.05 cm³.</li></ul>
<h3>Left out</h3><ul><li>Activities (we use concentrations), liquid-junction potentials in detail, overpotentials in electrolysis, battery ageing.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/electrochemical-cells.html">original/electrochemical-cells.html</a>.</p>`
});

// ---------------- Displacement model ----------------
function newDisp(X, Y, form, r) { return { X, Y, form, T: 20, max: 20, x: 0, t: 0, k: reacts(X, Y) ? (form === "powder" ? 0.02 : 0.004) * (X === "Fe" ? 0.25 : 1) * (1 + 0.1 * r.gauss()) : 0, hist: [[0, 20]] }; }
function dispStep(d, dt) { const dx = d.k * (1 - d.x) * dt; d.x += dx; d.T += riseNoLoss(d.X, d.Y) * dx - 0.005 * (d.T - 20) * dt; d.max = Math.max(d.max, d.T); d.t += dt; if (d.t - d.hist[d.hist.length - 1][0] >= 5) d.hist.push([d.t, d.T]); }
function doAll() { grid = {}; for (const X of METALS) for (const Y of METALS) if (X !== Y) { const d = newDisp(X, Y, "powder", rnd); for (let t = 0; t < 600; t++) dispStep(d, 1); grid[X + Y] = d.max - 20; } }

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "disp", options: [["disp", "🔩 displacement"], ["simple", "🍋 simple cells"], ["half", "⚡ half-cells and E° (A level)"], ["fuel", "🔋 fuel and storage"], ["tit", "🧪 redox titrations (A level)"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 10, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
grp.disp = g = ui.group("Displacement");
ctl.X = K.seg(g, { value: "Zn", options: METALS.map(m => [m, m]), on: v => { P.X = v; startDisp(); } });
ctl.Y = K.seg(g, { value: "Cu", options: METALS.map(m => [m, SALT[m]]), on: v => { P.Y = v; startDisp(); } });
ctl.form = K.seg(g, { value: "powder", options: [["powder", "powder"], ["strip", "strip"]], on: v => { P.form = v; startDisp(); } });
let rr = K.row(g); K.btn(rr, "↺ Fresh cup", () => startDisp()); K.btn(rr, "▦ Do them all", () => doAll());
grp.simple = g = ui.group("Simple cell");
ctl.e1 = K.seg(g, { value: "Zn", options: Object.keys(GAL).map(k => [k, GNAME[k]]), on: v => P.e1 = v });
ctl.e2 = K.seg(g, { value: "Cu", options: Object.keys(GAL).map(k => [k, GNAME[k]]), on: v => P.e2 = v });
ctl.ncell = K.slider(g, { label: "Cells in series", min: 1, max: 4, step: 1, value: 1, on: v => P.ncell = v });
ctl.load = K.seg(g, { value: "meter", options: [["meter", "voltmeter"], ["led", "red LED"], ["bulb", "torch bulb"]], on: v => P.load = v });
rr = K.row(g); K.btn(rr, "📏 Record this pair", () => { const v = simpleV(); recorded.push({ a: P.e1, b: P.e2, v }); });
grp.half = g = ui.group("Half-cells (A level)");
const CK = Object.keys(COUPLES);
ctl.neg = K.seg(g, { value: "Zn", options: CK.map(k => [k, COUPLES[k][0]]), on: v => P.neg = v });
ctl.pos = K.seg(g, { value: "Cu", options: CK.map(k => [k, COUPLES[k][0]]), on: v => P.pos = v });
ctl.cNeg = K.slider(g, { label: "Concentration, first half-cell (log₁₀)", min: -4, max: 0, step: 0.5, value: 0, fmt: v => (10 ** v).toPrecision(2) + " mol dm⁻³", on: v => P.cNeg = 10 ** v });
ctl.cPos = K.slider(g, { label: "Concentration, second half-cell (log₁₀)", min: -4, max: 0, step: 0.5, value: 0, fmt: v => (10 ** v).toPrecision(2) + " mol dm⁻³", on: v => P.cPos = 10 ** v });
ctl.T = K.slider(g, { label: "Temperature", min: 273, max: 353, step: 1, value: 298, unit: "K", on: v => P.T = v });
ctl.meter = K.seg(g, { value: "hi", options: [["hi", "high-resistance voltmeter"], ["coil", "moving-coil (1 kΩ)"]], on: v => P.meter = v });
ctl.clean = K.toggle(g, { label: "Electrodes cleaned with emery paper", value: true, on: v => P.clean = v });
ctl.bridge = K.toggle(g, { label: "Salt bridge in place", value: true, on: v => P.bridge = v });
rr = K.row(g); K.btn(rr, "📏 Take a reading", () => reads.push({ neg: P.neg, pos: P.pos, v: reading(P.neg, P.pos, P, rnd), th: emfNow() })); K.btn(rr, "Clear", () => reads = []);
grp.fuel = g = ui.group("Fuel and storage");
ctl.fuel = K.seg(g, { value: "acid", options: [["acid", "H₂–O₂ fuel cell (acid)"], ["alk", "alkaline (A level)"], ["li", "lithium-ion (A level)"]], on: v => P.fuel = v });
ctl.j = K.slider(g, { label: "Current density drawn", min: 0.01, max: 1.35, step: 0.01, value: 0.3, unit: "A cm⁻²", on: v => P.j = v });
ctl.li = K.seg(g, { value: "dis", options: [["dis", "discharging"], ["chg", "charging"]], on: v => P.li = v });
grp.tit = g = ui.group("Redox titration (A level)");
ctl.kind = K.seg(g, { value: "mn", options: Object.entries(TIT).map(([k, v]) => [k, v.name]), on: v => { P.kind = v; newFlask(); titres = []; } });
rr = K.row(g); K.btn(rr, "+1 cm³", () => addT(1)); K.btn(rr, "+0.1 cm³", () => addT(0.1)); K.btn(rr, "+1 drop", () => addT(0.05));
rr = K.row(g); K.btn(rr, "✔ Record titre", () => recordT(), "primary"); K.btn(rr, "New flask", () => newFlask()); K.btn(rr, "New unknown", () => { tit = null; newFlask(); titres = []; });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
function startDisp() { D = newDisp(P.X, P.Y, P.form, rnd); }
function simpleV() { const e = Math.abs(GAL[P.e1] - GAL[P.e2]) * P.ncell, R = 400 * P.ncell, Rl = P.load === "meter" ? 1e6 : P.load === "led" ? 300 : 10; let I = e / (R + Rl); if (P.load === "led" && e < 1.8) I = 0; return P.load === "meter" ? e * Rl / (R + Rl) : P.load === "led" ? (I ? 1.8 + I * 300 * 0.01 : e) : I * Rl; }
const emfNow = () => Eof(P.pos, P.cPos, P.T) - Eof(P.neg, P.cNeg, P.T);
function newFlask() { if (!tit) tit = { c: (0.090 + 0.02 * rnd()) * (P.kind === "mn" ? 1 : 0.5) }; tit.v = 0; tit.pip = 25.0 + 0.06 * rnd.gauss(); tit.end = tit.c * tit.pip / 1000 / TIT[P.kind].ratio / TIT[P.kind].cT * 1000; tit.start = Math.round(rnd() * 4 * 20) / 20; }
function addT(v) { if (!tit) newFlask(); tit.v += v; }
function recordT() { if (!tit) return; titres.push(Math.round(tit.v / 0.05) * 0.05); newFlask(); }
function set(o) { Object.assign(P, DEF, o); for (const k of ["X", "Y", "form", "e1", "e2", "ncell", "load", "neg", "pos", "T", "meter", "clean", "bridge", "fuel", "j", "li", "kind", "speed"]) ctl[k].set(P[k]); ctl.cNeg.set(Math.log10(P.cNeg)); ctl.cPos.set(Math.log10(P.cPos)); ctl.view.set(P.view); startDisp(); grid = {}; recorded = []; reads = []; soc = 1; tit = null; newFlask(); titres = []; showGroups(); }

// ---------------- Simulation ----------------
function tick(dt) { const s = dt * P.speed; tAnim += s; if (P.view === "disp" && D) for (let i = 0; i < 4; i++) dispStep(D, s * 2.5); if (P.view === "fuel" && P.fuel === "li") soc = K.clamp(soc + (P.li === "dis" ? -1 : 1) * s * 0.01, 0, 1); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const MCOL = { Mg: "#d8d8e0", Zn: "#a9b4c2", Fe: "#6e6e78", Cu: "#c8743a", Ag: "#e8e8f0", Al: "#c0c8d0", Pb: "#7a8090", C: "#333", Ni: "#9aa", Li: "#ccc", K: "#ddd" };
function beaker(c, x, y, w, h, fill, label) { c.fillStyle = fill; c.fillRect(x, y + h * 0.25, w, h * 0.75); c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y); c.stroke(); c.lineWidth = 1; if (label) TX(c, label, x + w / 2, y + h + 18, "#cfd8ea", "center", "12px"); }
function drawDisp(c, w, h) {
  const d = D, cuLeft = d.Y === "Cu" ? 1 - d.x : 1, blue = d.Y === "Cu" ? `rgba(60,130,230,${0.15 + 0.55 * cuLeft})` : d.Y === "Fe" ? "rgba(140,200,150,.35)" : "rgba(180,200,230,.18)";
  const bx = 80, by = 80, bw = 220, bh = 260; beaker(c, bx, by, bw, bh, blue, `polystyrene cup: 25 cm³ of 0.50 mol dm⁻³ ${SALT[d.Y]}`);
  // metal at the bottom, coated as it reacts
  for (let i = 0; i < (d.form === "powder" ? 60 : 1); i++) { const px = d.form === "powder" ? bx + 15 + (i * 37 % (bw - 30)) : bx + bw / 2 - 40, py = d.form === "powder" ? by + bh - 10 - (i * 13 % 18) : by + bh - 120, s = d.form === "powder" ? 5 : 0; c.fillStyle = MCOL[d.X]; if (d.form === "powder") { c.beginPath(); c.arc(px, py, s, 0, 6.3); c.fill(); if (d.x > 0.05) { c.fillStyle = MCOL[d.Y]; c.globalAlpha = Math.min(1, d.x * 1.5); c.beginPath(); c.arc(px, py, s, 0, 6.3); c.fill(); c.globalAlpha = 1; } } else { c.fillRect(px, py, 80, 110); if (d.x > 0.02) { c.fillStyle = MCOL[d.Y]; c.globalAlpha = Math.min(1, d.x * 2); c.fillRect(px - 3, py + 30, 86, 80); c.globalAlpha = 1; } } }
  // thermometer
  const tx = bx + bw - 30; c.fillStyle = "#eee"; c.fillRect(tx, by - 40, 8, bh); c.fillStyle = "#ff4d4d"; const th = Math.min(bh - 10, (d.T - 10) * 3); c.fillRect(tx + 1, by - 40 + bh - th, 6, th); TX(c, d.T.toFixed(1) + " °C", tx + 14, by - 40 + bh - th + 4, "#ff8a70", "left", "600 13px");
  // zoomed-in particles
  const zx = w * 0.45, zy = 70, zw = w - zx - 30, zh = 260; c.strokeStyle = "#2a3550"; c.strokeRect(zx, zy, zw, zh); TX(c, "Zoomed in: the metal surface", zx, zy - 10, "#eef2f8", "left", "600 13px");
  c.fillStyle = MCOL[d.X]; for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(zx + 20 + i * (zw - 40) / 9, zy + zh - 20 - j * 22, 9, 0, 6.3); c.fill(); }
  const t = tAnim, react = reacts(d.X, d.Y) && d.x < 0.98;
  for (let i = 0; i < 8; i++) { const ph = (t * 0.6 + i / 8) % 1, ix = zx + 30 + i * (zw - 60) / 7, iy = zy + 30 + (react ? ph : 0.3 + 0.2 * Math.sin(t + i)) * (zh - 110); c.fillStyle = "#5ab0ff"; c.beginPath(); c.arc(ix, iy, 8, 0, 6.3); c.fill(); TX(c, d.Y === "Ag" ? "Ag⁺" : d.Y + "²⁺", ix, iy + 4, "#001", "center", "600 9px"); if (react && ph > 0.85) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(ix, iy + 14, 3, 0, 6.3); c.fill(); } }
  const eq = reacts(d.X, d.Y) ? `${d.X} + ${d.Y === "Ag" ? "2Ag⁺" : d.Y + "²⁺"} → ${d.X}²⁺ + ${d.Y === "Ag" ? "2Ag" : d.Y}` : `no reaction: ${d.X} is less reactive than ${d.Y}`;
  TX(c, eq, zx, zy + zh + 26, reacts(d.X, d.Y) ? "#7ee787" : "#ff8a70", "left", "600 14px");
  if (reacts(d.X, d.Y)) TX(c, `${d.X} atoms lose electrons (oxidised); ${d.Y} ions gain them (reduced)`, zx, zy + zh + 48, "#cfd8ea", "left", "12px");
}
function drawSimple(c, w, h) {
  const V = simpleV(), e = Math.abs(GAL[P.e1] - GAL[P.e2]), neg = GAL[P.e1] < GAL[P.e2] ? P.e1 : P.e2, pos = neg === P.e1 ? P.e2 : P.e1, n = P.ncell;
  const cw = Math.min(160, (w - 120) / n - 20), y0 = 160;
  for (let k = 0; k < n; k++) { const x = 60 + k * (cw + 30); beaker(c, x, y0, cw, 170, "rgba(150,190,230,.2)", "salt water"); c.fillStyle = MCOL[neg]; c.fillRect(x + 20, y0 - 30, 18, 170); c.fillStyle = MCOL[pos]; c.fillRect(x + cw - 38, y0 - 30, 18, 170); TX(c, "−", x + 29, y0 - 36, "#ff8a70", "center", "600 16px"); TX(c, "+", x + cw - 29, y0 - 36, "#5ad1ff", "center", "600 16px"); if (k < n - 1) { c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(x + cw - 29, y0 - 30); c.lineTo(x + cw + 59, y0 - 30); c.stroke(); } }
  const xl = 89, xr = 60 + (n - 1) * (cw + 30) + cw - 29, wy = 70; c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.moveTo(xl, y0 - 30); c.lineTo(xl, wy); c.lineTo(xr, wy); c.lineTo(xr, y0 - 30); c.stroke(); c.lineWidth = 1;
  const mx = (xl + xr) / 2; c.fillStyle = "#151c2e"; c.beginPath(); c.arc(mx, wy, 26, 0, 6.3); c.fill(); c.strokeStyle = "#cfd8ea"; c.stroke();
  if (P.load === "meter") TX(c, V.toFixed(2) + " V", mx, wy + 5, "#7ee787", "center", "600 13px"); else if (P.load === "led") { c.fillStyle = V > 1.8 && e * n >= 1.8 ? "#ff3030" : "#401010"; c.beginPath(); c.arc(mx, wy, 14, 0, 6.3); c.fill(); TX(c, e * n >= 1.8 ? "LED on" : "LED off (needs 1.8 V)", mx, wy - 34, "#ff8a70", "center", "12px"); } else { const I = V / 10; c.fillStyle = `rgba(255,230,120,${Math.min(1, I * 300)})`; c.beginPath(); c.arc(mx, wy, 14, 0, 6.3); c.fill(); TX(c, I * 1000 < 20 ? "bulb too dim to see" : "bulb glows", mx, wy - 34, "#ffd166", "center", "12px"); }
  // electrons moving from − to + through the wire
  const t = tAnim; for (let i = 0; i < 10; i++) { const u = (t * 0.25 + i / 10) % 1, L = (wy - (y0 - 30)) * -1, tot = 2 * Math.abs(L) + (xr - xl); let d = u * tot, ex, ey; if (d < Math.abs(L)) { ex = xl; ey = y0 - 30 - d; } else if (d < Math.abs(L) + xr - xl) { ex = xl + d - Math.abs(L); ey = wy; } else { ex = xr; ey = wy + d - Math.abs(L) - (xr - xl); } c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(ex, ey, 3.5, 0, 6.3); c.fill(); }
  TX(c, `${GNAME[neg]} (negative, dissolves: oxidised) → electrons → ${GNAME[pos]} (positive)`, 60, h - 40, "#eef2f8", "left", "600 13px");
  TX(c, `each cell ${e.toFixed(2)} V; ${n} in series: ${(e * n).toFixed(2)} V`, 60, h - 18, "#cfd8ea", "left", "12px");
}
function drawHalf(c, w, h) {
  const [nl, nE] = COUPLES[P.neg], [pl, pE] = COUPLES[P.pos], emf = emfNow(), lw = (w - 200) / 2, y0 = 140, bh = 200, xL = 60, xR = w - 60 - lw;
  const posIsRight = emf >= 0;
  for (const [x, k, lab, cc] of [[xL, P.neg, nl, P.cNeg], [xR, P.pos, pl, P.cPos]]) { const type = COUPLES[k][5]; beaker(c, x, y0, lw, bh, k === "Cu" ? "rgba(60,130,230,.45)" : k === "Mn" ? "rgba(160,60,200,.45)" : k === "Cr" ? "rgba(230,140,40,.4)" : k === "I" || k === "Br" ? "rgba(200,120,40,.35)" : k === "Fe3" ? "rgba(220,170,60,.3)" : "rgba(170,190,220,.18)", `${lab}, ${cc.toPrecision(2)} mol dm⁻³`);
    c.fillStyle = type === "metal" ? MCOL[k] || "#aaa" : "#d8d8e0"; c.fillRect(x + lw / 2 - 9, y0 - 40, 18, bh - 20); if (type !== "metal") TX(c, "Pt", x + lw / 2, y0 - 46, "#cfd8ea", "center", "11px"); if (type === "gas") { c.strokeStyle = "#cfd8ea"; c.strokeRect(x + lw / 2 - 22, y0 - 10, 44, bh - 40); TX(c, "gas in at 100 kPa", x + lw / 2, y0 + bh - 40, "#cfd8ea", "center", "10.5px"); } }
  // salt bridge
  if (P.bridge) { c.strokeStyle = "#e8dccb"; c.lineWidth = 16; c.beginPath(); c.moveTo(xL + lw - 30, y0 + 70); c.lineTo(xL + lw - 30, y0 - 10); c.lineTo(xR + 30, y0 - 10); c.lineTo(xR + 30, y0 + 70); c.stroke(); c.lineWidth = 1; TX(c, "salt bridge (KNO₃): K⁺ and NO₃⁻ carry the charge", w / 2, y0 - 24, "#e8dccb", "center", "11px"); }
  // wire and meter
  const wy = 60, xl = xL + lw / 2, xr = xR + lw / 2; c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.moveTo(xl, y0 - 40); c.lineTo(xl, wy); c.lineTo(xr, wy); c.lineTo(xr, y0 - 40); c.stroke(); c.lineWidth = 1;
  const shown = P.bridge ? emf * (P.meter === "coil" ? 1 / 3 : 1) : 0; c.fillStyle = "#151c2e"; c.beginPath(); c.arc(w / 2, wy, 30, 0, 6.3); c.fill(); c.strokeStyle = "#cfd8ea"; c.stroke(); TX(c, (shown >= 0 ? "+" : "") + shown.toFixed(2) + " V", w / 2, wy + 5, "#7ee787", "center", "600 13px");
  if (P.bridge && P.meter === "hi") { const t = tAnim; for (let i = 0; i < 8; i++) { const u = (t * 0.2 + i / 8) % 1, ex = posIsRight ? xl + (xr - xl) * u : xr - (xr - xl) * u; c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(ex, wy, 3.5, 0, 6.3); c.fill(); } }
  const negK = posIsRight ? P.neg : P.pos, posK = posIsRight ? P.pos : P.neg;
  TX(c, `cell diagram: ${cellDiagram(negK)} ‖ ${cellDiagram(posK, true)}`, 60, h - 58, "#eef2f8", "left", "600 13px");
  TX(c, `E°cell = E°(+) − E°(−) = ${COUPLES[posK][1].toFixed(2)} − (${COUPLES[negK][1].toFixed(2)}) = ${Math.abs(COUPLES[P.pos][1] - COUPLES[P.neg][1]).toFixed(2)} V · now ${Math.abs(emf).toFixed(3)} V`, 60, h - 36, "#cfd8ea", "left", "12.5px");
  TX(c, `${COUPLES[negK][4]} is oxidised (negative electrode); ${COUPLES[posK][3]} is reduced (positive electrode)`, 60, h - 14, "#ffd166", "left", "12.5px");
}
function cellDiagram(k, right) { const [, , , ox, red, type] = COUPLES[k]; const pt = type === "metal" ? "" : "Pt"; if (type === "metal") return right ? `${ox}(aq) | ${red}(s)` : `${red}(s) | ${ox}(aq)`; return right ? `${ox}, ${red} | Pt` : `Pt | ${red}, ${ox}`; }
function drawFuel(c, w, h) {
  if (P.fuel === "li") {
    const V = liV(soc); TX(c, `Lithium-ion cell: ${(soc * 100).toFixed(0)}% charged, ${V.toFixed(2)} V, ${P.li === "dis" ? "discharging" : "charging"}`, 40, 40, "#eef2f8", "left", "600 14px");
    const x0 = 80, x1 = w - 80, y0 = 90, y1 = h - 90; c.fillStyle = "#2a2a2a"; c.fillRect(x0, y0, 160, y1 - y0); c.fillStyle = "#3a5070"; c.fillRect(x1 - 160, y0, 160, y1 - y0); TX(c, "graphite (−)", x0 + 80, y1 + 20, "#cfd8ea", "center", "12px"); TX(c, "LiCoO₂ (+)", x1 - 80, y1 + 20, "#cfd8ea", "center", "12px");
    const n = 40; for (let i = 0; i < n; i++) { const inG = i / n < soc, t = tAnim, mv = ((t * 0.3 + i * 0.07) % 1); const x = inG ? x0 + 20 + (i * 37 % 120) : x1 - 140 + (i * 37 % 120), y = y0 + 20 + (i * 53 % (y1 - y0 - 40)); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, y, 5, 0, 6.3); c.fill(); }
    TX(c, P.li === "dis" ? "Li⁺ ions move to the positive electrode; electrons go round the circuit" : "charging pushes Li⁺ back into the graphite", w / 2, y0 - 12, "#ffd166", "center", "12px");
    return;
  }
  const j = P.j, V = fuelV(j), x0 = 80, x1 = w - 80, y0 = 90, y1 = h - 110, mid = (x0 + x1) / 2;
  TX(c, `Hydrogen–oxygen fuel cell (${P.fuel === "acid" ? "acid membrane: H⁺ crosses" : "alkaline: OH⁻ crosses"}): ${V.toFixed(3)} V at ${j.toFixed(2)} A cm⁻²`, 40, 40, "#eef2f8", "left", "600 14px");
  c.fillStyle = "#24304a"; c.fillRect(x0, y0, mid - x0 - 30, y1 - y0); c.fillStyle = "#2a3a4a"; c.fillRect(mid + 30, y0, x1 - mid - 30, y1 - y0); c.fillStyle = "#e8dccb"; c.fillRect(mid - 30, y0, 60, y1 - y0);
  TX(c, "H₂ in (anode, −)", (x0 + mid) / 2, y0 - 10, "#5ad1ff", "center", "12px"); TX(c, "O₂ in (cathode, +)", (mid + x1) / 2, y0 - 10, "#ff8a70", "center", "12px"); TX(c, P.fuel === "acid" ? "membrane: H⁺ →" : "electrolyte: ← OH⁻", mid, y1 + 18, "#e8dccb", "center", "12px");
  const t = tAnim * (0.3 + j); for (let i = 0; i < 10; i++) { const u = (t + i / 10) % 1; c.fillStyle = "#ffd166"; c.beginPath(); c.arc(P.fuel === "acid" ? mid - 30 + 60 * u : mid + 30 - 60 * u, y0 + 20 + i * (y1 - y0 - 40) / 9, 4, 0, 6.3); c.fill(); }
  TX(c, P.fuel === "acid" ? "anode: H₂ → 2H⁺ + 2e⁻" : "anode: H₂ + 2OH⁻ → 2H₂O + 2e⁻", (x0 + mid) / 2, y1 + 40, "#cfd8ea", "center", "12px"); TX(c, P.fuel === "acid" ? "cathode: O₂ + 4H⁺ + 4e⁻ → 2H₂O" : "cathode: O₂ + 2H₂O + 4e⁻ → 4OH⁻", (mid + x1) / 2, y1 + 40, "#cfd8ea", "center", "12px");
  TX(c, "overall: 2H₂ + O₂ → 2H₂O (the only product is water)", mid, y1 + 64, "#7ee787", "center", "600 12.5px");
}
function drawTit(c, w, h) {
  if (!tit) newFlask(); const k = P.kind, past = tit.v - tit.end, x = w * 0.35;
  // burette
  const bx = x - 12, by = 40, bh = h * 0.45; c.fillStyle = "#eef"; c.fillRect(bx, by, 24, bh); const lvl = (tit.start + tit.v) / 50; c.fillStyle = k === "mn" ? "#8a2be2" : "#ddeeff"; c.fillRect(bx + 2, by + bh * lvl, 20, bh * (1 - lvl)); for (let m = 0; m <= 50; m += 5) { c.fillStyle = "#333"; c.fillRect(bx, by + bh * m / 50, 8, 1); TX(c, String(m), bx - 4, by + bh * m / 50 + 4, "#8fa0bf", "right", "10px"); }
  TX(c, `burette: ${TIT[k].titrant}`, bx + 34, by + 14, "#cfd8ea", "left", "12px"); TX(c, `reading ${(tit.start + tit.v).toFixed(2)} cm³ (started at ${tit.start.toFixed(2)})`, bx + 34, by + 34, "#ffd166", "left", "600 12.5px");
  // flask colour
  let col; if (k === "mn") col = past > 0 ? `rgba(200,60,180,${Math.min(0.8, 0.25 + past * 2)})` : "rgba(200,220,170,.35)"; else { const left = Math.max(0, -past) / tit.end; col = past > 0 ? "rgba(230,240,255,.15)" : left < 0.08 ? (tit.starch !== false ? `rgba(30,30,120,${0.3 + left * 6})` : "rgba(240,220,120,.4)") : `rgba(170,90,30,${0.2 + 0.6 * left})`; }
  const fy = by + bh + 30; c.fillStyle = col; c.beginPath(); c.moveTo(x - 20, fy); c.lineTo(x - 80, fy + 120); c.lineTo(x + 80, fy + 120); c.lineTo(x + 20, fy); c.closePath(); c.fill(); c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
  TX(c, `conical flask: 25.0 cm³ of ${TIT[k].analyte} solution (unknown)`, x + 100, fy + 60, "#cfd8ea", "left", "12px");
  TX(c, k === "mn" ? (past > 0 ? "permanent pink: end point passed" : "pink colour disappears as it reacts") : (past > 0 ? "colourless: end point passed" : "add starch near the end: blue-black until all the I₂ has gone"), x + 100, fy + 84, past > 0 ? "#ff8a70" : "#7ee787", "left", "600 12.5px");
  TX(c, k === "mn" ? "MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O" : "I₂ + 2S₂O₃²⁻ → 2I⁻ + S₄O₆²⁻", x + 100, fy + 112, "#eef2f8", "left", "600 13px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ disp: drawDisp, simple: drawSimple, half: drawHalf, fuel: drawFuel, tit: drawTit })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "disp") {
    chA.opts.title = "Temperature against time"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "°C"; chA.draw([{ pts: D.hist, color: "#ff8a70", label: `${D.X} + ${SALT[D.Y]}` }, { pts: [[0, 20 + riseNoLoss(D.X, D.Y)], [Math.max(60, D.t), 20 + riseNoLoss(D.X, D.Y)]], color: "#ffd166", dash: [5, 4], label: "no heat lost" }], { xMin: 0, yMin: 15 });
    const pts = []; METALS.forEach((X, i) => METALS.forEach((Y, j) => { if (grid[X + Y] != null) pts.push([j + (i - 2) * 0.13, grid[X + Y]]); }));
    chB.opts.title = "Results grid: temperature rise"; chB.opts.xLabel = "solution: 0 Mg · 1 Zn · 2 Fe · 3 Cu · 4 Ag"; chB.opts.yLabel = "rise (°C)"; chB.draw([{ pts, type: "bars", w: 0.12, color: "#7ee787", label: "each metal (Mg left … Ag right)" }], { xMin: -0.6, xMax: 4.6, yMin: 0 });
    const n = Object.keys(grid).length, order = METALS.slice().sort((a, b) => METALS.filter(Y => (grid[b + Y] || 0) > 0.5).length - METALS.filter(Y => (grid[a + Y] || 0) > 0.5).length);
    relabel(["temperature", "temperature rise", "no heat lost rise", "ΔH (per mole)", "order from the grid"]);
    read.set("a", D.T.toFixed(1) + " °C"); read.set("b", (D.max - 20).toFixed(1) + " °C"); read.set("c", riseNoLoss(D.X, D.Y).toFixed(1) + " °C"); read.set("d", reacts(D.X, D.Y) ? dispDH(D.X, D.Y).toFixed(1) + " kJ mol⁻¹" : "no reaction"); read.set("e", n ? order.join(" > ") : "press ▦ Do them all");
    ui.hud("A more reactive metal displaces a less reactive one");
  } else if (P.view === "simple") {
    chA.opts.title = "Your recorded voltages"; chA.opts.xLabel = "reading"; chA.opts.yLabel = "V"; chA.draw([{ pts: recorded.map((q, i) => [i + 1, q.v]), type: "bars", w: 0.6, color: "#7ee787", label: "measured" }, { pts: recorded.map((q, i) => [i + 1, Math.abs((COUPLES[q.a] || COUPLES.Cu)[1] - (COUPLES[q.b] || COUPLES.Cu)[1])]), type: "dots", r: 5, color: "#ffd166", label: "E° difference" }], { xMin: 0, yMin: 0 });
    const ks = Object.keys(GAL); chB.opts.title = "Galvanic series in salt water"; chB.opts.xLabel = "Mg · Zn · Al · Fe · Pb · Cu · Ag · C"; chB.opts.yLabel = "V vs reference"; chB.draw([{ pts: ks.map((k, i) => [i, GAL[k]]), type: "bars", w: 0.6, color: "#5ad1ff", label: "potential" }], { xMin: -0.6, xMax: 7.6 });
    relabel(["voltage of the cell(s)", "negative electrode", "positive electrode", "current", "LED"]);
    const e = Math.abs(GAL[P.e1] - GAL[P.e2]) * P.ncell; read.set("a", simpleV().toFixed(2) + " V"); read.set("b", GNAME[GAL[P.e1] < GAL[P.e2] ? P.e1 : P.e2]); read.set("c", GNAME[GAL[P.e1] < GAL[P.e2] ? P.e2 : P.e1]); read.set("d", (1000 * e / (400 * P.ncell + (P.load === "meter" ? 1e6 : P.load === "led" ? 300 : 10))).toFixed(2) + " mA"); read.set("e", e >= 1.8 ? "would light" : "would not light (needs 1.8 V)");
    ui.hud("Further apart in reactivity, bigger voltage");
  } else if (P.view === "half") {
    const ks = Object.keys(COUPLES); chA.opts.title = "E° ladder"; chA.opts.xLabel = "couple"; chA.opts.yLabel = "E° (V)"; chA.draw([{ pts: ks.map((k, i) => [i, COUPLES[k][1]]), type: "bars", w: 0.6, color: "#3a4a6b", label: "E°" }, { pts: [[ks.indexOf(P.neg), COUPLES[P.neg][1]], [ks.indexOf(P.pos), COUPLES[P.pos][1]]], type: "dots", r: 6, color: "#ffd166", label: "chosen" }], { xMin: -0.6, xMax: ks.length - 0.4 });
    chB.opts.title = "Your readings against E°cell"; chB.opts.xLabel = "E°cell predicted (V)"; chB.opts.yLabel = "measured (V)"; chB.draw([{ pts: [[-3.5, -3.5], [4.6, 4.6]], color: "#3a4a6b", label: "equal" }, { pts: reads.map(q => [q.th, q.v]), type: "dots", r: 5, color: "#7ee787", label: "readings" }], {});
    const emf = emfNow(), dG = -COUPLES[P.pos][2] * F * Math.abs(emf) / 1000;
    relabel(["EMF now", "E°cell", "feasible?", "last reading", "ΔG = −nFE (extension)"]);
    read.set("a", emf.toFixed(3) + " V"); read.set("b", (COUPLES[P.pos][1] - COUPLES[P.neg][1]).toFixed(2) + " V"); read.set("c", Math.abs(emf) > 0 ? "yes, in the direction shown (if fast enough)" : "no"); read.set("d", reads.length ? reads[reads.length - 1].v.toFixed(2) + " V" : "📏 take a reading"); read.set("e", dG.toFixed(0) + " kJ mol⁻¹ (n = " + COUPLES[P.pos][2] + ")");
    ui.hud("E°cell = E°(+) − E°(−)");
  } else if (P.view === "fuel") {
    if (P.fuel === "li") { const pts = []; for (let s = 1; s >= 0; s -= 0.02) pts.push([3 * (1 - s), liV(s)]); chA.opts.title = "Discharge curve (3.0 A h)"; chA.opts.xLabel = "charge delivered (A h)"; chA.opts.yLabel = "V"; chA.draw([{ pts, color: "#ffd166", label: "voltage" }, { pts: [[3 * (1 - soc), liV(soc)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 2.5, yMax: 4.4, xMin: 0 }); chB.draw([], {}); chB.opts.title = ""; }
    else { const pts = [], pw = []; for (let j = 0.005; j <= 1.38; j += 0.01) { pts.push([j, fuelV(j)]); pw.push([j, fuelV(j) * j]); } chA.opts.title = "Voltage against current density"; chA.opts.xLabel = "A cm⁻²"; chA.opts.yLabel = "V"; chA.draw([{ pts, color: "#5ad1ff", label: "V" }, { pts: [[P.j, fuelV(P.j)]], type: "dots", r: 6, color: "#fff", label: "now" }, { pts: [[0, 1.229], [1.4, 1.229]], color: "#ffd166", dash: [5, 4], label: "E° 1.23 V" }], { yMin: 0, yMax: 1.3, xMin: 0 }); chB.opts.title = "Power per cm²"; chB.opts.xLabel = "A cm⁻²"; chB.opts.yLabel = "W cm⁻²"; chB.draw([{ pts: pw, color: "#7ee787", label: "power" }, { pts: [[P.j, fuelV(P.j) * P.j]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, xMin: 0 }); }
    relabel(["voltage", "current (10 cm²)", "power", "efficiency", ""]);
    const V = P.fuel === "li" ? liV(soc) : fuelV(P.j); read.set("a", V.toFixed(3) + " V"); read.set("b", P.fuel === "li" ? "1.5 A" : (P.j * 10).toFixed(1) + " A"); read.set("c", P.fuel === "li" ? (V * 1.5).toFixed(2) + " W" : (V * P.j * 10).toFixed(2) + " W"); read.set("d", P.fuel === "li" ? "about 95% round trip" : (100 * V / 1.48).toFixed(0) + "% (V ÷ 1.48 V)"); read.set("e", "");
    ui.hud(P.fuel === "li" ? "Storage cell: rechargeable, Li⁺ shuttles between electrodes" : "Fuel cell: fuel and oxygen in, electricity and water out");
  } else {
    const k = P.kind, pts = []; const end = tit.end; for (let v = 0.2; v <= end * 1.4; v += end / 100) { let E; if (k === "mn") { E = v < end ? 0.77 + 0.0257 * Math.log(v / (end - v)) : 1.51 + 0.0257 / 5 * Math.log(Math.max(1e-6, (v - end) / end)); } else { E = v < end ? 0.54 + 0.0128 * Math.log((end - v) / end + 1e-6) : 0.08 + 0.0128 * Math.log(Math.max(1e-6, v - end)); } pts.push([v, E]); }
    chA.opts.title = "Your titres"; chA.opts.xLabel = "titration"; chA.opts.yLabel = "titre (cm³)"; chA.draw([{ pts: titres.map((t, i) => [i + 1, t]), type: "bars", w: 0.6, color: "#c9a0ff", label: "titre" }], { xMin: 0, yMin: 0 });
    chB.opts.title = "Potential of the flask (beyond the spec)"; chB.opts.xLabel = "volume added (cm³)"; chB.opts.yLabel = "E (V)"; chB.draw([{ pts, color: "#ffd166", label: "E" }, { pts: [[tit.v, 0], [tit.v, 1.6]], color: "#fff", label: "now" }], { xMin: 0 });
    const conc = titres.length >= 2 ? (() => { const s = titres.slice().sort((a, b) => a - b); for (let i = 0; i < s.length - 1; i++) if (s[i + 1] - s[i] <= 0.10) return concFrom(k, (s[i] + s[i + 1]) / 2); return null; })() : null;
    relabel(["added so far", "titres", "concordant mean", `[${TIT[k].analyte}] found`, ""]);
    read.set("a", tit.v.toFixed(2) + " cm³"); read.set("b", titres.map(t => t.toFixed(2)).join(", ") || "none yet"); read.set("c", conc ? (conc / TIT[k].cT / TIT[k].ratio * 0.025 * 1000).toFixed(2) + " cm³" : "need two within 0.10 cm³"); read.set("d", conc ? conc.toFixed(4) + " mol dm⁻³" : "–"); read.set("e", "");
    ui.hud("Rough titre first, then add dropwise near the end point");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views at the top of the controls. Start with displacement.", 6000);
