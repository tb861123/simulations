/* =====================================================================
   ACIDS, SALTS AND CHEMICAL TESTS
   • ACIDS release H⁺ ions in water; ALKALIS release OH⁻ ions.
     pH = −log₁₀[H⁺]: below 7 acidic, 7 neutral, above 7 alkaline.
     Strong acids (HCl) ionise completely; weak acids (ethanoic acid)
     only partly, so the same concentration has a higher pH.
   • NEUTRALISATION: H⁺ + OH⁻ → H₂O. A TITRATION finds exactly how
     much alkali neutralises a known volume of acid.
   • SALTS: acid + base → salt + water. Soluble salts are made from an
     acid and an excess of an insoluble base (or by titration); insoluble
     salts by PRECIPITATION (mixing two solutions).
   • TESTS identify ions and gases: flame colours, precipitates with
     sodium hydroxide, silver nitrate and barium chloride, gas tests.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const KW = 1e-14;
// acids and bases: strong (full ionisation) or weak (Ka, Kb), and how many H⁺ each acid can give
const ACIDS = { HCl: { name: "hydrochloric acid", strong: true, n: 1 }, HNO3: { name: "nitric acid", strong: true, n: 1 }, H2SO4: { name: "sulfuric acid", strong: true, n: 2 }, CH3COOH: { name: "ethanoic acid", Ka: 1.74e-5, n: 1 }, HA: { name: "weak acid HA", Ka: 1e-4, n: 1 } };
const BASES = { NaOH: { name: "sodium hydroxide", strong: true }, KOH: { name: "potassium hydroxide", strong: true }, NH3: { name: "ammonia", Kb: 1.8e-5 } };
// pH of a mixture: acid (total concentration ca) and base (cb), solved exactly from the charge balance
//   [H⁺] + [cations from the base] = [OH⁻] + [anions from the acid]
function pHmix(acid, ca, base, cb) {
  const A = ACIDS[acid] || { strong: true, n: 1 }, B = BASES[base] || { strong: true };
  const f = lh => { const h = 10 ** lh, oh = KW / h; const anion = A.strong ? A.n * ca : ca * A.Ka / (A.Ka + h); const cation = B.strong ? cb : cb * (h / (h + KW / B.Kb)); return h + cation - oh - anion; };
  let lo = -15, hi = 1; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; } return -(lo + hi) / 2;
}
const pHacid = (acid, c) => pHmix(acid, c, "NaOH", 0), pHbase = (base, c) => pHmix("HCl", 0, base, c);
// a titration: Va cm³ of acid (ca) in the flask, base (cb) added from the burette; pH after V cm³
const titrPH = (acid, ca, base, cb, V, Va = 25) => pHmix(acid, ca * Va / (Va + V), base, cb * V / (Va + V));
const eqVol = (acid, ca, cb, Va = 25) => Va * ca * ACIDS[acid].n / cb;
// indicators: colour at a pH
const IND = {
  universal: { name: "universal indicator", col: p => ["#d81e1e", "#e8461e", "#f07a1e", "#f5a623", "#f5c723", "#e8e33a", "#b5d93a", "#4caf50", "#2a9d8f", "#2a7fbf", "#2a5fbf", "#3a3fbf", "#5a2fbf", "#6a1fa0", "#5a1080"][Math.max(0, Math.min(14, Math.round(p)))] },
  litmus: { name: "litmus", col: p => p < 5 ? "#d8283c" : p > 8 ? "#3a5fd8" : "#8a46b8", range: [5, 8] },
  methyl: { name: "methyl orange", col: p => p < 3.1 ? "#e02a2a" : p > 4.4 ? "#f5d02a" : "#f08a2a", range: [3.1, 4.4] },
  btb: { name: "bromothymol blue", col: p => p < 6 ? "#e8d43a" : p > 7.6 ? "#2a5fd8" : "#4aa84a", range: [6, 7.6] },
  phenol: { name: "phenolphthalein", col: p => p < 8.2 ? "rgba(255,255,255,0.12)" : p > 10 ? "#e0309a" : "#f08ac8", range: [8.2, 10] }
};
// salts: cations and anions with solubility rules, precipitate colours and test results
const CATIONS = { Na: { s: "Na⁺", flame: "#ffd23a", flameName: "yellow", naoh: null }, K: { s: "K⁺", flame: "#c9a0ff", flameName: "lilac", naoh: null }, Li: { s: "Li⁺", flame: "#ff3b4a", flameName: "red", naoh: null }, Ca: { s: "Ca²⁺", flame: "#ff7a3a", flameName: "orange-red", naoh: ["white", "#eef"] }, Cu: { s: "Cu²⁺", flame: "#3adba0", flameName: "blue-green", naoh: ["blue", "#3a7fe0"] }, Fe2: { s: "Fe²⁺", flame: null, naoh: ["green", "#4a8a3a"] }, Fe3: { s: "Fe³⁺", flame: null, naoh: ["brown", "#a0522d"] }, NH4: { s: "NH₄⁺", flame: null, naoh: "gas" }, Ba: { s: "Ba²⁺", flame: "#9be05a", flameName: "green", naoh: null }, Ag: { s: "Ag⁺", flame: null, naoh: ["brown", "#5a4030"] }, Pb: { s: "Pb²⁺", flame: null, naoh: ["white", "#eef"] } };
const ANIONS = { Cl: { s: "Cl⁻", ag: ["white", "#f0f0f0"] }, Br: { s: "Br⁻", ag: ["cream", "#f0e6c0"] }, I: { s: "I⁻", ag: ["yellow", "#f5e04a"] }, SO4: { s: "SO₄²⁻", ba: true }, CO3: { s: "CO₃²⁻", co2: true }, NO3: { s: "NO₃⁻" }, OH: { s: "OH⁻" } };
// solubility rules (iGCSE): is the salt of cation c and anion a soluble in water?
function soluble(c, a) {
  if (["Na", "K", "NH4", "Li"].includes(c) || a === "NO3") return true;
  if (["Cl", "Br", "I"].includes(a)) return !["Ag", "Pb"].includes(c);
  if (a === "SO4") return !["Ba", "Pb", "Ca"].includes(c);
  return false;                                                                   // carbonates and hydroxides: insoluble except Group 1 and ammonium
}
const PPT_COL = (c, a) => a === "OH" && CATIONS[c].naoh && CATIONS[c].naoh !== "gas" ? CATIONS[c].naoh[1] : ANIONS[a].ag && c === "Ag" ? ANIONS[a].ag[1] : c === "Cu" && a === "CO3" ? "#5ab0a0" : c === "Fe2" ? "#4a8a3a" : c === "Fe3" ? "#a0522d" : c === "Pb" && a === "I" ? "#f5e04a" : "#f0f0f0";
// the result of each test on a salt (cation c, anion a)
function testResult(t, c, a) {
  const C = CATIONS[c], A = ANIONS[a];
  if (t === "flame") return C.flame ? [`${C.flameName} flame`, C.flame] : ["no clear colour", "#6a7a9a"];
  if (t === "naoh") return C.naoh === "gas" ? ["no precipitate; on warming, a gas turns damp red litmus blue (ammonia)", "#9ad"] : C.naoh ? [`${C.naoh[0]} precipitate`, C.naoh[1]] : ["no precipitate", null];
  if (t === "ag") return A.ag ? [`${A.ag[0]} precipitate (silver ${a === "Cl" ? "chloride" : a === "Br" ? "bromide" : "iodide"})`, A.ag[1]] : a === "CO3" ? ["fizzes with the nitric acid", null] : ["no precipitate", null];
  if (t === "ba") return A.ba ? ["white precipitate (barium sulfate)", "#f4f4f4"] : ["no precipitate", null];
  if (t === "acid") return A.co2 ? ["fizzes: the gas turns limewater milky (carbon dioxide)", null] : ["no fizzing", null];
  return ["–", null];
}
const UNKNOWNS = [["Na", "Cl"], ["K", "I"], ["Cu", "SO4"], ["Fe2", "SO4"], ["Fe3", "Cl"], ["NH4", "Cl"], ["Ca", "Cl"], ["Li", "Br"], ["Na", "CO3"], ["K", "SO4"], ["Cu", "Cl"], ["Fe3", "NO3"], ["NH4", "SO4"], ["Ba", "Cl"]];
const GASES = { H2: ["hydrogen", "a lighted splint gives a squeaky pop"], O2: ["oxygen", "a glowing splint relights"], CO2: ["carbon dioxide", "turns limewater milky (cloudy)"], Cl2: ["chlorine", "bleaches damp litmus paper"], NH3: ["ammonia", "turns damp red litmus paper blue"] };
// a titration by a student: reading error on each burette reading and an overshoot past the end point
function studentTitre(o, r) {
  const Ve = eqVol(o.acid, o.ca, o.cb), drop = 0.05, over = o.tech === "careful" ? drop * Math.floor(r() * 1.6) : o.tech === "fast" ? Math.abs(0.4 * r.gauss()) + drop : drop * Math.floor(r() * 3);
  const pip = 0.06 * r.gauss() * (o.tech === "fast" ? 2 : 1) / 25 * Ve;                    // pipette error, scaled to the titre
  return Math.round((Ve + over + pip + 0.05 * r.gauss() - 0.05 * r.gauss()) / 0.05) * 0.05;  // two readings, each read to ±0.05 cm³
}
// buffer: weak acid HA (ca) + its salt (cs) in 50 cm³; add n mmol of strong acid
function bufferPH(Ka, ca, cs, addH, vol = 50) {
  const nHA = ca * vol + addH, nA = cs * vol - addH;                          // mmol: added H⁺ turns A⁻ into HA
  if (nA <= 0) return -Math.log10(Math.max(1e-12, -nA / vol));               // the A⁻ has run out: excess strong acid
  if (nHA <= 0) return 14 + Math.log10(-nHA / vol);                          // the HA has run out: excess strong base
  return -Math.log10(Ka) + Math.log10(nA / nHA);
}
const waterPH = (addH, vol = 50) => addH > 0 ? -Math.log10(addH / vol) : addH < 0 ? 14 + Math.log10(-addH / vol) : 7;

// ---------------- The page ----------------
const P = { view: "ph", sol: "HCl", conc: 0.1, acid: "HCl", ca: 0.1, base: "NaOH", cb: 0.1, ind: "phenol", tech: "careful", c1: "Ba", a1: "Cl", c2: "Na", a2: "SO4", unknown: 0, gas: "CO2", Ka: 1.74e-5, addH: 0 };
let V = 0, tap = 0, readings = [], runStart = 0, curve = [], testsDone = [], rnd = K.rng(Date.now() % 9973 + 2), mixT = 0, T = 0, guessed = "";
const ui = K.app({
  title: "Acids, Salts and Chemical Tests", subject: "Chemistry",
  blurb: "pH and indicators, titrations, making salts, and a tests lab for ions and gases with unknowns to identify",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 2(f) acids, alkalis and titrations (pH, indicators, neutralisation), 2(g) acids, bases and salt preparations (solubility rules, making soluble and insoluble salts), 2(h) chemical tests (flame tests, cations with NaOH, anions, gases, water).", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 12 acid–base equilibria: Kw, pH of strong acids and bases, Ka and pKa, the pH of weak acids, titration curves and indicators, half-equivalence (pH = pKa, CP9), buffers." } },
  missions: [
    { title: "The pH scale", q: "Test hydrochloric acid, ethanoic acid, sodium hydroxide and ammonia (all 0.1 mol/dm³). Put them in order of pH. Why are the two acids different?", hint: "HCl pH 1, ethanoic acid about 2.9, ammonia about 11.1, NaOH 13. Ethanoic acid is weak: only about 1% of its molecules release H⁺, so [H⁺] is far lower than in HCl at the same concentration.", setup() { set({ view: "ph", sol: "HCl" }); } },
    { title: "Dilution", q: "Dilute 0.1 mol/dm³ HCl ten times, then again. What happens to the pH each time?", hint: "Each ×10 dilution raises the pH by 1 (pH = −log[H⁺]): 1, 2, 3. It never goes above 7 by diluting an acid.", setup() { set({ view: "ph", sol: "HCl", conc: 0.1 }); } },
    { title: "A titration", q: "Titrate 25.0 cm³ of HCl with 0.100 mol/dm³ NaOH using phenolphthalein. Get two concordant titres (within 0.10 cm³) and work out the concentration of the acid.", hint: "Add quickly for a rough titre, then dropwise near the end point. Concordant titres around 25.0 cm³ give c(HCl) = 0.100 × titre ÷ 25.0 ≈ 0.100 mol/dm³.", setup() { set({ view: "titr" }); } },
    { title: "Choosing an indicator", q: "Titrate ethanoic acid with NaOH using methyl orange, then phenolphthalein. Which gives the right end point?", hint: "Weak acid + strong base: the equivalence point is about pH 8.7, and the steep part of the curve is above pH 7. Phenolphthalein (8.2–10) changes there; methyl orange (3.1–4.4) changes far too early.", setup() { set({ view: "titr", acid: "CH3COOH", ind: "methyl" }); } },
    { title: "Insoluble salts by precipitation", q: "Mix barium chloride and sodium sulfate solutions. What forms? Which ions are spectators?", hint: "A white precipitate of barium sulfate: Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s). Na⁺ and Cl⁻ stay in solution (spectator ions). Filter, wash with distilled water and dry.", setup() { set({ view: "salts", c1: "Ba", a1: "Cl", c2: "Na", a2: "SO4" }); } },
    { title: "Flame tests", q: "Do flame tests on lithium, sodium, potassium, calcium and copper salts. Which colour is which?", hint: "Li⁺ red, Na⁺ yellow, K⁺ lilac, Ca²⁺ orange-red, Cu²⁺ blue-green. Clean the wire in acid between tests.", setup() { set({ view: "tests", unknown: 0 }); } },
    { title: "Identify the unknown", q: "Run tests on unknown salt X until you can name it. Which tests did you need?", hint: "A flame test or NaOH for the cation, then acid (carbonate), acidified silver nitrate (halides) or acidified barium chloride (sulfate) for the anion. Two well-chosen tests are usually enough.", setup() { set({ view: "tests", unknown: 1 + Math.floor(Math.random() * (UNKNOWNS.length - 1)) }); } },
    { title: "Gas tests", q: "Test each gas. Which test identifies carbon dioxide? Hydrogen? Oxygen?", hint: "CO₂: limewater milky. H₂: squeaky pop with a lighted splint. O₂: relights a glowing splint. Cl₂: bleaches damp litmus. NH₃: turns damp red litmus blue.", setup() { set({ view: "tests", gas: "CO2" }); } },
    { lvl: "adv", title: "pH of a weak acid", q: "Find the pH of 0.10 mol/dm³ ethanoic acid. Compare √(Ka c) with the exact value.", hint: "[H⁺] ≈ √(Ka c) = √(1.74 × 10⁻⁵ × 0.10) = 1.32 × 10⁻³, pH = 2.88. The approximation assumes [HA] ≈ c, fine when the acid is only slightly ionised.", setup() { set({ view: "ph", sol: "CH3COOH", conc: 0.1 }); } },
    { lvl: "adv", title: "Half-equivalence (CP9)", q: "Titrate ethanoic acid with NaOH. Read the pH when exactly half the acid has been neutralised. What is the pKa?", hint: "At half-equivalence [HA] = [A⁻], so pH = pKa = 4.76 and Ka = 10^−4.76 = 1.74 × 10⁻⁵.", setup() { set({ view: "titr", acid: "CH3COOH" }); } },
    { lvl: "adv", title: "Buffer against water", q: "Add 1 cm³ portions of 0.10 mol/dm³ HCl to an ethanoate buffer and to pure water. Compare the pH changes.", hint: "The buffer's A⁻ ions mop up the added H⁺ (H⁺ + A⁻ → HA), so its pH barely moves; water's pH falls from 7 to about 2.7 with the first portion.", setup() { set({ view: "buffer" }); } }
  ],
  batch: [
    { title: "How close are your titres?", question: "If a student repeats a careful titration many times, how much do the titres vary?", how: "25.0 cm³ of 0.100 mol/dm³ HCl, 0.100 mol/dm³ NaOH, dropwise near the end point (overshoot 0–1 drop), two burette readings each ±0.05 cm³, pipette error.", yLabel: "titre (cm³)", reps: 300, bins: 16, theory: 25, theoryLabel: "true end point", run: (x, r) => studentTitre({ acid: "HCl", ca: 0.1, cb: 0.1, tech: "careful" }, r), note: "Titres cluster within about 0.1 cm³ of 25.0, slightly above it (you can only overshoot, never stop early). That is why we look for concordant titres." },
    { title: "Careless or careful?", question: "How does technique affect the titre?", how: "1 careful (dropwise), 2 normal, 3 fast (overshoot up to about 0.4 cm³, bigger pipette error); 40 titrations each.", xLabel: "technique (1 careful, 2 normal, 3 fast)", yLabel: "titre − true (cm³)", xs: [1, 2, 3], reps: 40, yMin: -0.2, theory: () => 0, theoryLabel: "true", run: (x, r) => studentTitre({ acid: "HCl", ca: 0.1, cb: 0.1, tech: ["careful", "normal", "fast"][x - 1] }, r) - 25, note: "Fast titrations overshoot and vary more: a rough titre first, then careful dropwise runs." },
    { title: "Dilution and pH", question: "How does the pH of hydrochloric acid change as it is diluted?", how: "Exact pH from the charge balance (including water's own ions).", xLabel: "log₁₀(concentration / mol dm⁻³)", yLabel: "pH", xs: [-1, -2, -3, -4, -5, -6, -7, -8], reps: 1, theory: x => -x, theoryLabel: "pH = −log c", run: x => pHacid("HCl", 10 ** x), note: "pH = −log c until the acid is so dilute that water's own H⁺ matters: it approaches 7, never goes past it." },
    { title: "Weak acid: exact and approximate pH", question: "How good is pH = ½(pKa − log c) for ethanoic acid?", how: "Exact pH from the charge balance against the √(Ka c) approximation.", xLabel: "log₁₀(concentration / mol dm⁻³)", yLabel: "pH", xs: [0, -1, -2, -3, -4, -5], reps: 1, theory: x => 0.5 * (4.76 - x), theoryLabel: "½(pKa − log c)", run: x => pHacid("CH3COOH", 10 ** x), note: "Excellent for concentrated solutions; at very low concentrations the acid ionises a lot and the approximation fails." },
    { title: "Equivalence point and acid strength", question: "How does the pH at the equivalence point depend on how weak the acid is?", how: "25.0 cm³ of 0.100 mol/dm³ acid with 0.100 mol/dm³ NaOH; pH at the equivalence volume.", xLabel: "pKa of the acid", yLabel: "pH at equivalence", xs: [2, 3, 4, 5, 6, 7], reps: 1, theory: pKa => 7 + 0.5 * (pKa + Math.log10(0.05)), theoryLabel: "7 + ½(pKa + log c_salt)", run: pKa => { ACIDS.HA.Ka = 10 ** -pKa; const p = titrPH("HA", 0.1, "NaOH", 0.1, 25); ACIDS.HA.Ka = 1e-4; return p; }, note: "The weaker the acid, the more alkaline the salt solution at equivalence: the indicator must change at that pH." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 2(f)", text: "Acids are proton (H⁺) donors and form H⁺(aq) in water; alkalis form OH⁻(aq). Neutralisation: H⁺ + OH⁻ → H₂O. pH 0–14; universal indicator shows the pH; litmus, methyl orange and phenolphthalein change at particular pH values." },
      { lvl: "std", tag: "4CH1 2(f)", text: "Titration: pipette 25.0 cm³ of one solution, add the other from a burette until the indicator changes; repeat to concordant titres (within 0.10 cm³)." },
      { lvl: "std", tag: "4CH1 2(g)", text: "Soluble: all sodium, potassium and ammonium salts; all nitrates; chlorides except silver and lead; sulfates except barium, calcium and lead. Insoluble: carbonates and hydroxides except sodium, potassium and ammonium." },
      { lvl: "std", tag: "4CH1 2(g)", text: "Soluble salt: acid + excess insoluble base (or metal or carbonate), filter, crystallise; or titrate acid with an alkali. Insoluble salt: mix two solutions, filter, wash, dry." },
      { lvl: "std", tag: "4CH1 2(h)", text: "Flame tests: Li⁺ red, Na⁺ yellow, K⁺ lilac, Ca²⁺ orange-red, Cu²⁺ blue-green. NaOH(aq): Cu²⁺ blue, Fe²⁺ green, Fe³⁺ brown precipitates; NH₄⁺ gives ammonia on warming." },
      { lvl: "std", tag: "4CH1 2(h)", text: "Anions: carbonate fizzes with acid (CO₂ turns limewater milky); with dilute HNO₃ + AgNO₃: Cl⁻ white, Br⁻ cream, I⁻ yellow; with dilute HCl + BaCl₂: SO₄²⁻ white. Water turns anhydrous copper(II) sulfate blue." },
      { lvl: "adv", tag: "9CH0 12", text: "Kw = [H⁺][OH⁻] = 1.0 × 10⁻¹⁴ at 298 K. Weak acid: Ka = [H⁺][A⁻]/[HA]; [H⁺] ≈ √(Ka c). At half-equivalence pH = pKa." },
      { lvl: "adv", tag: "9CH0 12", text: "Buffer: a weak acid and its salt (or a weak base and its salt) resists pH change when small amounts of acid or alkali are added: pH = pKa + log([A⁻]/[HA])." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how to make pure dry crystals of copper(II) sulfate from copper(II) oxide and dilute sulfuric acid.", ans: "<ul><li>warm the acid and add copper(II) oxide until no more dissolves (excess)</li><li>filter off the excess solid</li><li>heat the solution to the point of crystallisation, leave to cool and crystallise, filter and dry the crystals</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const t = readings.filter(x => x.ok); return `In a titration, 25.0 cm³ of HCl needed ${t.length ? K.mean(t.map(x => x.titre)).toFixed(2) : "24.80"} cm³ of 0.100 mol/dm³ NaOH. Calculate the concentration of the acid.`; }, ans: () => { const t = readings.filter(x => x.ok), v = t.length ? K.mean(t.map(x => x.titre)) : 24.8; return `<ul><li>moles NaOH = 0.100 × ${v.toFixed(2)} ÷ 1000 = ${(0.1 * v / 1000).toExponential(3)}</li><li>HCl + NaOH 1 : 1, so moles HCl the same</li><li>c = moles ÷ (25.0 ÷ 1000) = ${(0.1 * v / 25).toFixed(4)} mol/dm³</li></ul>`; } },
      { lvl: "std", marks: 2, q: "A solution gives a lilac flame and a yellow precipitate with acidified silver nitrate. Name the salt.", ans: "<ul><li>K⁺ (lilac) and I⁻ (yellow precipitate)</li><li>potassium iodide</li></ul>" },
      { lvl: "adv", marks: 3, q: "Calculate the pH of 0.050 mol dm⁻³ ethanoic acid (Ka = 1.74 × 10⁻⁵ mol dm⁻³).", ans: "<ul><li>[H⁺] = √(Ka c) = √(1.74 × 10⁻⁵ × 0.050)</li><li>= 9.33 × 10⁻⁴ mol dm⁻³</li><li>pH = 3.03</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain how an ethanoic acid / sodium ethanoate buffer keeps its pH almost constant when a small amount of acid is added.", ans: "<ul><li>large reserves of CH₃COO⁻ and CH₃COOH</li><li>added H⁺ reacts with CH₃COO⁻ to form CH₃COOH</li><li>the ratio [A⁻]/[HA] hardly changes, so the pH hardly changes</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>pH:</b> found exactly from the charge balance [H⁺] + [cations] = [OH⁻] + [anions], with Kw = 1.0 × 10⁻¹⁴ (298 K). Strong acids and bases ionise completely (sulfuric acid gives two H⁺); ethanoic acid Ka = 1.74 × 10⁻⁵, ammonia Kb = 1.8 × 10⁻⁵.</li>
<li><b>Titration:</b> 25.0 cm³ in the flask; the pH after each addition from the same charge balance. Indicators change over their real ranges. A student's titre: the true end point + an overshoot (0–1 drop of 0.05 cm³ when careful, more when fast) + two burette reading errors (±0.05 cm³) + a pipette error.</li>
<li><b>Salts:</b> the iGCSE solubility rules decide whether a precipitate forms; colours are the usual textbook colours.</li>
<li><b>Tests:</b> the standard iGCSE results for each ion and gas.</li>
<li><b>Buffer (A level):</b> pH = pKa + log(n(A⁻)/n(HA)) for 50 cm³ of buffer, until one of the reserves runs out.</li></ul>
<h3>Left out</h3>
<ul><li>Activity (real solutions are not ideal), the temperature dependence of Kw, the heat of neutralisation, interference between tests (e.g. carbonate with silver nitrate), and safety precautions (always in a real lab).</li></ul>
<p>Metals with acids are in <i>Reactivity and Extracting Metals</i>; halogen displacement in <i>Groups 1 and 7</i>. The earlier version of this simulation, with its worksheets, is kept in <a href="original/acids-salts-tests.html">original/acids-salts-tests.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "ph", options: [["ph", "🧪 pH scale"], ["titr", "⚗ Titration"], ["salts", "🧂 Making salts"], ["tests", "🔥 Tests lab"], ["buffer", "🛡 Buffers (A level)"]], on: v => P.view = v });
g = ui.group("pH scale");
ctl.sol = K.seg(g, { value: "HCl", options: [["HCl", "hydrochloric acid"], ["CH3COOH", "ethanoic acid"], ["NaOH", "sodium hydroxide"], ["NH3", "ammonia"]], on: v => P.sol = v });
ctl.conc = K.slider(g, { label: "Concentration", min: 1e-6, max: 1, step: 1e-6, value: 0.1, fmt: v => v.toPrecision(2) + " mol/dm³", on: v => P.conc = v });
K.btn(K.row(g), "Dilute × 10", () => { P.conc = Math.max(1e-6, P.conc / 10); ctl.conc.set(P.conc); });
g = ui.group("Titration");
ctl.acid = K.seg(g, { label: "Acid in the flask (25.0 cm³)", value: "HCl", options: Object.entries(ACIDS).map(([k, v]) => [k, v.name]), on: v => { P.acid = v; newRun(); } });
ctl.ca = K.slider(g, { label: "Acid concentration", min: 0.02, max: 0.2, step: 0.005, value: 0.1, unit: "mol/dm³", on: v => { P.ca = v; newRun(); } });
ctl.base = K.seg(g, { label: "Alkali in the burette", value: "NaOH", options: Object.entries(BASES).map(([k, v]) => [k, v.name]), on: v => { P.base = v; newRun(); } });
ctl.cb = K.slider(g, { label: "Alkali concentration", min: 0.05, max: 0.2, step: 0.005, value: 0.1, unit: "mol/dm³", on: v => { P.cb = v; newRun(); } });
ctl.ind = K.seg(g, { label: "Indicator", value: "phenol", options: Object.entries(IND).filter(([k]) => k !== "universal").map(([k, v]) => [k, v.name]), on: v => P.ind = v });
let rr = K.row(g); K.btn(rr, "Tap: fast", () => tap = 2); K.btn(rr, "dropwise", () => tap = 0.15); K.btn(rr, "one drop", () => { addV(0.05); }); K.btn(rr, "close", () => tap = 0);
rr = K.row(g); K.btn(rr, "📋 Record reading", () => record(), "primary"); K.btn(rr, "↺ Refill, new run", () => newRun()); K.btn(rr, "⚡ Auto (careful)", () => { const t = studentTitre(P, rnd); addV(t - V); });
g = ui.group("Making salts: mix two solutions");
ctl.c1 = K.seg(g, { label: "Solution 1: cation", value: "Ba", options: Object.keys(CATIONS).map(k => [k, CATIONS[k].s]), on: v => { P.c1 = v; mixT = 0; } });
ctl.a1 = K.seg(g, { label: "Solution 1: anion", value: "Cl", options: Object.keys(ANIONS).map(k => [k, ANIONS[k].s]), on: v => { P.a1 = v; mixT = 0; } });
ctl.c2 = K.seg(g, { label: "Solution 2: cation", value: "Na", options: Object.keys(CATIONS).map(k => [k, CATIONS[k].s]), on: v => { P.c2 = v; mixT = 0; } });
ctl.a2 = K.seg(g, { label: "Solution 2: anion", value: "SO4", options: Object.keys(ANIONS).map(k => [k, ANIONS[k].s]), on: v => { P.a2 = v; mixT = 0; } });
g = ui.group("Tests lab");
ctl.unknown = K.seg(g, { label: "Sample", value: 0, options: [[0, "known: choose below"], [1, "unknown X"]], on: v => { P.unknown = +v ? 1 + Math.floor(rnd() * (UNKNOWNS.length - 1)) : 0; testsDone = []; guessed = ""; } });
rr = K.row(g); for (const [t, l] of [["flame", "🔥 flame"], ["naoh", "NaOH(aq)"], ["acid", "dilute acid"], ["ag", "HNO₃ + AgNO₃"], ["ba", "HCl + BaCl₂"]]) K.btn(rr, l, () => { if (!testsDone.includes(t)) testsDone.push(t); });
ctl.gas = K.seg(g, { label: "Gas to test", value: "CO2", options: Object.entries(GASES).map(([k, v]) => [k, v[0]]), on: v => P.gas = v });
K.btn(K.row(g), "Reveal unknown X", () => guessed = "reveal");
g = ui.group("Buffers (A level)");
ctl.addH = K.slider(g, { label: "0.10 mol/dm³ HCl (−) or NaOH (+) added", min: -20, max: 20, step: 1, value: 0, fmt: v => v === 0 ? "none" : `${Math.abs(v)} cm³ of ${v < 0 ? "HCl" : "NaOH"}`, on: v => P.addH = v });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) { Object.assign(P, { view: "ph", sol: "HCl", conc: 0.1, acid: "HCl", ca: 0.1, base: "NaOH", cb: 0.1, ind: "phenol", tech: "careful", c1: "Ba", a1: "Cl", c2: "Na", a2: "SO4", unknown: 0, gas: "CO2", addH: 0 }, o); for (const k of ["conc", "ca", "cb", "addH"]) ctl[k].set(P[k]); for (const k of ["view", "sol", "acid", "base", "ind", "c1", "a1", "c2", "a2", "gas"]) ctl[k].set(P[k]); ctl.unknown.set(P.unknown ? 1 : 0); readings = []; testsDone = []; guessed = ""; mixT = 0; newRun(); }
function newRun() { V = 0; tap = 0; curve = [[0, titrPH(P.acid, P.ca, P.base, P.cb, 0)]]; runStart = 0.5 + Math.round(rnd() * 10) * 0.05; }
function addV(d) { V = Math.min(50, V + d); curve.push([V, titrPH(P.acid, P.ca, P.base, P.cb, V)]); }
function record() { const titre = Math.round((V + 0.05 * rnd.gauss()) / 0.05) * 0.05, n = readings.length; readings.push({ run: n === 0 ? "rough" : String(n), start: runStart.toFixed(2), end: (runStart + titre).toFixed(2), titre, ok: false }); const acc = readings.slice(1); for (const r of acc) r.ok = acc.some(q => q !== r && Math.abs(q.titre - r.titre) <= 0.1001); newRun(); }
const sampleSalt = () => P.unknown ? UNKNOWNS[P.unknown] : [P.c1 === "Ag" || P.c1 === "Pb" ? "Na" : P.c1, P.a1];

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function tube(c, x, y, w, h, fill, label) { c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h - w / 2); c.arc(x + w / 2, y + h - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w, y); c.stroke(); c.lineWidth = 1; c.fillStyle = fill; c.beginPath(); c.moveTo(x + 2, y + h * 0.35); c.lineTo(x + 2, y + h - w / 2); c.arc(x + w / 2, y + h - w / 2, w / 2 - 2, Math.PI, 0, true); c.lineTo(x + w - 2, y + h * 0.35); c.fill(); if (label) TX(c, label, x + w / 2, y + h + 18, "#aab6cc", "center", "11px"); }
const curPH = () => ["NaOH", "NH3"].includes(P.sol) ? pHbase(P.sol, P.conc) : pHacid(P.sol, P.conc);
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  if (P.view === "ph") {
    const p = curPH(); TX(c, `${({ HCl: "Hydrochloric acid", CH3COOH: "Ethanoic acid", NaOH: "Sodium hydroxide", NH3: "Ammonia" })[P.sol]}, ${P.conc.toPrecision(2)} mol/dm³`, 20, 28, "#eef2f8", "left", "600 15px");
    Object.entries(IND).forEach(([k, I], i) => tube(c, 40 + i * (w - 80) / 5, 60, 44, 170, I.col(p), I.name));
    // pH meter and the universal-indicator scale
    c.fillStyle = "#1c2440"; c.fillRect(w - 190, 50, 160, 70); TX(c, "pH " + p.toFixed(2), w - 110, 98, "#7ee787", "center", "600 26px");
    for (let i = 0; i <= 14; i++) { c.fillStyle = IND.universal.col(i); c.fillRect(40 + i * (w - 80) / 15, h - 90, (w - 80) / 15, 26); TX(c, String(i), 40 + (i + 0.5) * (w - 80) / 15, h - 52, "#aab6cc", "center", "11px"); }
    c.fillStyle = "#fff"; const px = 40 + (p + 0.5) / 15 * (w - 80); c.beginPath(); c.moveTo(px, h - 94); c.lineTo(px - 7, h - 106); c.lineTo(px + 7, h - 106); c.fill();
    TX(c, "acidic ← 7 neutral → alkaline", w / 2, h - 18, "#8fa0bf", "center", "12px");
    const H = 10 ** -p; TX(c, `[H⁺] = ${H.toExponential(2)} mol/dm³   [OH⁻] = ${(KW / H).toExponential(2)} mol/dm³`, 20, 285, "#cfd8ea", "left", "13px");
    if (adv && P.sol === "CH3COOH") TX(c, `√(Ka c) approximation: pH ${(-Math.log10(Math.sqrt(1.74e-5 * P.conc))).toFixed(2)} (exact ${p.toFixed(2)})`, 20, 310, "#c9a0ff", "left", "12.5px");
  } else if (P.view === "titr") {
    const p = titrPH(P.acid, P.ca, P.base, P.cb, V), bx = w * 0.22, top = 30, bh = h * 0.55;
    // burette with scale
    c.strokeStyle = "rgba(255,255,255,.7)"; c.strokeRect(bx - 10, top, 20, bh); c.fillStyle = "rgba(160,200,255,.25)"; c.fillRect(bx - 9, top + bh * (V / 50), 18, bh * (1 - V / 50));
    for (let v = 0; v <= 50; v += 5) { c.strokeStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.moveTo(bx + 10, top + bh * v / 50); c.lineTo(bx + 18, top + bh * v / 50); c.stroke(); TX(c, String(v), bx + 22, top + bh * v / 50 + 4, "#aab6cc", "left", "10px"); }
    c.fillStyle = "#3a4a6b"; c.fillRect(bx - 3, top + bh, 6, 22); if (tap > 0) { c.fillStyle = "rgba(160,200,255,.6)"; c.fillRect(bx - 1, top + bh + 22, 2, 30); }
    // conical flask
    const fx = bx, fy = top + bh + 60, fw = 90, fh = 90; c.fillStyle = IND[P.ind].col(p); c.beginPath(); c.moveTo(fx - 12, fy); c.lineTo(fx - 12, fy + 20); c.lineTo(fx - fw / 2, fy + fh); c.lineTo(fx + fw / 2, fy + fh); c.lineTo(fx + 12, fy + 20); c.lineTo(fx + 12, fy); c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1; c.strokeStyle = "rgba(255,255,255,.7)"; c.stroke();
    // zoomed burette reading
    const zx = w * 0.4, zy = 40; c.fillStyle = "#e8eef8"; c.fillRect(zx, zy, 90, 120); const r0 = runStart + V; for (let k = -6; k <= 6; k++) { const v = Math.round(r0 * 10) / 10 + k * 0.1, yy = zy + 60 + (v - r0) * 90; if (yy < zy || yy > zy + 120) continue; c.strokeStyle = "#333"; c.beginPath(); c.moveTo(zx, yy); c.lineTo(zx + (Math.round(v * 10) % 10 === 0 ? 40 : 22), yy); c.stroke(); if (Math.round(v * 10) % 10 === 0) TX(c, v.toFixed(0), zx + 44, yy + 4, "#333", "left", "11px"); }
    c.strokeStyle = "#2a5fd8"; c.lineWidth = 2; c.beginPath(); c.moveTo(zx + 5, zy + 60); c.quadraticCurveTo(zx + 45, zy + 70, zx + 85, zy + 60); c.stroke(); c.lineWidth = 1; TX(c, "meniscus (read the bottom, at eye level)", zx, zy + 136, "#8fa0bf", "left", "10.5px");
    TX(c, `burette reading ${(runStart + V).toFixed(2)} cm³ (started at ${runStart.toFixed(2)})`, zx, zy + 156, "#eef2f8", "left", "600 12.5px");
    // results table
    let y = 110; const tx = w * 0.64; TX(c, "Results (cm³)", tx, y, "#eef2f8", "left", "600 13px"); y += 20; TX(c, "run    start    end     titre", tx, y, "#8fa0bf", "left", "12px"); y += 18;
    for (const r of readings.slice(-8)) { TX(c, `${r.run.padEnd(6)} ${r.start.padStart(6)}  ${r.end.padStart(6)}  ${r.titre.toFixed(2)} ${r.ok ? "✓" : ""}`, tx, y, r.ok ? "#7ee787" : "#cfd8ea", "left", "12px"); y += 18; }
    const ok = readings.filter(r => r.ok); if (ok.length) TX(c, `mean of concordant titres: ${K.mean(ok.map(r => r.titre)).toFixed(2)} cm³`, tx, y + 6, "#ffd166", "left", "600 12.5px");
    TX(c, `${ACIDS[P.acid].name} (${P.ca} mol/dm³) in the flask, ${BASES[P.base].name} (${P.cb} mol/dm³) in the burette, ${IND[P.ind].name}`, 14, h - 12, "#8fa0bf", "left", "11.5px");
  } else if (P.view === "salts") {
    const ppts = []; for (const [cc, aa] of [[P.c1, P.a2], [P.c2, P.a1]]) if (!soluble(cc, aa)) ppts.push([cc, aa]);
    const both = [[P.c1, P.a1], [P.c2, P.a2]].map(([cc, aa]) => soluble(cc, aa));
    const k = Math.min(1, mixT / 2); tube(c, 60, 50, 60, 160, both[0] ? "rgba(160,200,255,.35)" : "#888", `${CATIONS[P.c1].s} + ${ANIONS[P.a1].s}`); tube(c, 200, 50, 60, 160, both[1] ? "rgba(160,200,255,.35)" : "#888", `${CATIONS[P.c2].s} + ${ANIONS[P.a2].s}`);
    const bx = w * 0.55, by = 70; c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.strokeRect(bx, by, 160, 180); c.lineWidth = 1; c.fillStyle = "rgba(160,200,255,.3)"; c.fillRect(bx + 2, by + 60, 156, 118);
    for (const [cc, aa] of ppts) { const col = PPT_COL(cc, aa), rng = K.rng(cc.length * 31 + aa.length); for (let i = 0; i < 120 * k; i++) { const x = bx + 8 + rng() * 144, y = by + 70 + rng() * 100 * (1 - k * 0.3) + k * 30 * rng(); c.fillStyle = col; c.beginPath(); c.arc(x, Math.min(by + 174, y + k * 40 * rng()), 2.2, 0, 6.3); c.fill(); } }
    let y = 290; const L = (s, col = "#cfd8ea", f = "13px") => { TX(c, s, 40, y, col, "left", f); y += 24; };
    if (!both[0] || !both[1]) L("One of the starting salts is insoluble: it can't be made into a solution. Choose soluble salts to mix.", "#ff8a70");
    else if (ppts.length) { for (const [cc, aa] of ppts) L(`Precipitate: ${CATIONS[cc].s} + ${ANIONS[aa].s} → insoluble salt (${PPT_COL(cc, aa) === "#f0f0f0" || PPT_COL(cc, aa) === "#f4f4f4" ? "white" : "coloured"} solid)`, "#ffd166", "600 13.5px"); const spect = [P.c1, P.a1, P.c2, P.a2].filter(x => !ppts.some(p => p.includes(x))); L(`Spectator ions (stay dissolved): ${spect.map(x => (CATIONS[x] || ANIONS[x]).s).join(", ")}`); L("Method: mix, filter, wash the solid with distilled water, dry it in a warm oven.", "#aab6cc", "12px"); }
    else L("No precipitate: all the possible salts are soluble. (To make a soluble salt use acid + excess insoluble base, then filter and crystallise, or a titration.)", "#7ee787");
    TX(c, "Mix two solutions", w * 0.55, 56, "#eef2f8", "left", "600 13px");
  } else if (P.view === "tests") {
    const [cc, aa] = sampleSalt(); TX(c, P.unknown ? "Unknown salt X" + (guessed === "reveal" ? `: ${CATIONS[cc].s} ${ANIONS[aa].s}` : "") : `Known salt: ${CATIONS[cc].s} ${ANIONS[aa].s}`, 20, 28, "#eef2f8", "left", "600 15px");
    const tests = [["flame", "Flame test"], ["naoh", "Add NaOH(aq)"], ["acid", "Add dilute acid"], ["ag", "Dilute HNO₃ then AgNO₃(aq)"], ["ba", "Dilute HCl then BaCl₂(aq)"]];
    tests.forEach(([t, nm], i) => { const x = 30 + i * (w - 60) / 5, done = testsDone.includes(t), [txt, col] = done ? testResult(t, cc, aa) : ["not done yet", null];
      if (t === "flame") { c.fillStyle = "#3a4a6b"; c.fillRect(x + 30, 170, 8, 50); if (done) { const fc = col || "#6a7a9a"; c.fillStyle = fc; c.beginPath(); c.moveTo(x + 34, 70 + 10 * Math.sin(T * 9)); c.quadraticCurveTo(x + 64, 150, x + 34, 170); c.quadraticCurveTo(x + 4, 150, x + 34, 70 + 10 * Math.sin(T * 9)); c.fill(); } }
      else tube(c, x + 14, 70, 40, 140, done && col ? col : "rgba(160,200,255,.3)");
      TX(c, nm, x + 34, 240, "#eef2f8", "center", "600 11.5px"); c.font = "11px Segoe UI"; const words = txt.split(" "); let line = "", yy = 258; for (const wd of words) { if (c.measureText(line + wd).width > (w - 60) / 5 - 8) { TX(c, line, x + 34, yy, done ? "#ffd166" : "#56607a", "center", "11px"); line = ""; yy += 15; } line += wd + " "; } TX(c, line, x + 34, yy, done ? "#ffd166" : "#56607a", "center", "11px"); });
    const G = GASES[P.gas]; TX(c, `Gas test: ${G[0]}: ${G[1]}`, 20, h - 40, "#7ee787", "left", "600 13px"); TX(c, "Water: turns anhydrous copper(II) sulfate from white to blue; pure water boils at 100 °C.", 20, h - 16, "#aab6cc", "left", "12px");
  } else {
    const Ka = 1.74e-5, pb = bufferPH(Ka, 0.1, 0.1, -P.addH * 0.1), pw = waterPH(-P.addH * 0.1);
    TX(c, "Ethanoate buffer (0.10 mol/dm³ CH₃COOH + 0.10 mol/dm³ CH₃COONa, 50 cm³) against pure water (50 cm³)", 20, 28, "#eef2f8", "left", "600 13px");
    for (const [i, nm, p] of [[0, "buffer", pb], [1, "water", pw]]) { const x = 80 + i * 260; tube(c, x, 60, 70, 200, IND.universal.col(p), nm); c.fillStyle = "#1c2440"; c.fillRect(x - 20, 290, 110, 44); TX(c, "pH " + p.toFixed(2), x + 35, 320, "#7ee787", "center", "600 18px"); }
    TX(c, `pH = pKa + log([A⁻]/[HA]) = 4.76 + log(${(5 + P.addH * 0.1).toFixed(1)} ÷ ${(5 - P.addH * 0.1).toFixed(1)}) (mmol of A⁻ ÷ HA)`, 20, h - 20, "#c9a0ff", "left", "12.5px");
    if (!adv) TX(c, "Buffers are A level: switch to Advanced", w - 14, h - 12, "#8fa0bf", "right", "11.5px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.xFmt = null; chB.opts.xFmt = null; const adv = ui.level === "adv";
  if (P.view === "titr") {
    const Ve = eqVol(P.acid, P.ca, P.cb), full = []; for (let v = 0; v <= Math.min(50, Ve * 2); v += 0.25) full.push([v, titrPH(P.acid, P.ca, P.base, P.cb, v)]);
    const I = IND[P.ind]; chA.opts.title = "pH curve"; chA.opts.xLabel = "volume of alkali added (cm³)"; chA.opts.yLabel = "pH";
    chA.draw([{ pts: full, color: "#56607a", dash: [5, 4], label: "full curve" }, { pts: curve, color: "#7ee787", label: "so far" }], { yMin: 0, yMax: 14, vlines: [{ x: Ve, label: "equivalence", color: "#ffd166" }, ...(adv && !ACIDS[P.acid].strong ? [{ x: Ve / 2, label: "half: pH = pKa", color: "#c9a0ff", row: 1 }] : [])], bands: I.range ? [{ y0: I.range[0], y1: I.range[1], color: "rgba(255,255,255,.1)" }] : [] });
    chB.opts.title = "Your titres"; chB.opts.xLabel = "run"; chB.opts.yLabel = "cm³"; chB.draw([{ pts: readings.map((r, i) => [i, r.titre]), type: "bars", w: 0.6, color: "#5ad1ff", label: "titre" }], { hlines: [{ y: Ve, label: "true", color: "#ffd166" }] });
    label(0, "volume added"); label(1, "pH now"); label(2, "equivalence point"); label(3, "concordant mean"); const ok = readings.filter(r => r.ok); read.set("a", V.toFixed(2) + " cm³"); read.set("b", titrPH(P.acid, P.ca, P.base, P.cb, V).toFixed(2)); read.set("c", `${Ve.toFixed(2)} cm³, pH ${titrPH(P.acid, P.ca, P.base, P.cb, Ve).toFixed(2)}`); read.set("d", ok.length ? K.mean(ok.map(r => r.titre)).toFixed(2) + " cm³" : "–");
  } else if (P.view === "buffer") {
    const xs = []; for (let a = -20; a <= 20; a += 0.5) xs.push(a);
    chA.opts.title = "pH against amount added"; chA.opts.xLabel = "cm³ of 0.10 mol/dm³ HCl (−) or NaOH (+)"; chA.opts.yLabel = "pH";
    chA.draw([{ pts: xs.map(a => [a, bufferPH(1.74e-5, 0.1, 0.1, -a * 0.1)]), color: "#7ee787", label: "buffer" }, { pts: xs.map(a => [a, waterPH(-a * 0.1)]), color: "#5ad1ff", label: "water" }], { yMin: 0, yMax: 14, vlines: [{ x: P.addH, label: "now" }] });
    chB.opts.title = "Reserves in the buffer"; chB.opts.xLabel = ""; chB.opts.yLabel = "mmol"; chB.opts.xFmt = whole(i => ["", "CH₃COOH", "CH₃COO⁻"][i] || ""); chB.draw([{ pts: [[1, Math.max(0, 5 - P.addH * 0.1)]], type: "bars", w: 0.6, color: "#ff8a70", label: "HA" }, { pts: [[2, Math.max(0, 5 + P.addH * 0.1)]], type: "bars", w: 0.6, color: "#7ee787", label: "A⁻" }], { yMin: 0, xMin: 0.4, xMax: 2.6 });
    label(0, "buffer pH"); label(1, "water pH"); label(2, "pKa"); label(3, "–"); read.set("a", bufferPH(1.74e-5, 0.1, 0.1, -P.addH * 0.1).toFixed(2)); read.set("b", waterPH(-P.addH * 0.1).toFixed(2)); read.set("c", "4.76"); read.set("d", "–");
  } else {
    const cs = []; for (let x = -6; x <= 0; x += 0.1) cs.push(x);
    chA.opts.title = "pH against concentration"; chA.opts.xLabel = "log₁₀(concentration)"; chA.opts.yLabel = "pH";
    chA.draw([{ pts: cs.map(x => [x, pHacid("HCl", 10 ** x)]), color: "#ff6b81", label: "HCl" }, { pts: cs.map(x => [x, pHacid("CH3COOH", 10 ** x)]), color: "#ffd166", label: "ethanoic" }, { pts: cs.map(x => [x, pHbase("NaOH", 10 ** x)]), color: "#5ad1ff", label: "NaOH" }, { pts: cs.map(x => [x, pHbase("NH3", 10 ** x)]), color: "#7ee787", label: "ammonia" }, { pts: [[Math.log10(P.conc), curPH()]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, yMax: 14, hlines: [{ y: 7, label: "neutral" }] });
    const sol = Object.keys(CATIONS).map(cc => [cc, ["Cl", "SO4", "CO3", "OH", "NO3"].filter(aa => soluble(cc, aa)).length]);
    chB.opts.title = "Soluble salts (of Cl⁻, SO₄²⁻, CO₃²⁻, OH⁻, NO₃⁻)"; chB.opts.xLabel = ""; chB.opts.yLabel = "number soluble"; chB.opts.xFmt = whole(i => (sol[i - 1] ? CATIONS[sol[i - 1][0]].s : ""));
    chB.draw([{ pts: sol.map((q, i) => [i + 1, q[1]]), type: "bars", w: 0.6, color: "#c9a0ff", label: "soluble" }], { yMin: 0, yMax: 5, xMin: 0.4, xMax: sol.length + 0.6 });
    label(0, "pH"); label(1, "[H⁺]"); label(2, "tests done"); label(3, "identified?"); const p = curPH(); read.set("a", p.toFixed(2)); read.set("b", (10 ** -p).toExponential(2) + " mol/dm³"); read.set("c", testsDone.join(", ") || "–"); read.set("d", P.unknown ? (guessed === "reveal" ? `X = ${CATIONS[UNKNOWNS[P.unknown][0]].s} ${ANIONS[UNKNOWNS[P.unknown][1]].s}` : "work it out, then reveal") : "–");
  }
  ui.hud({ ph: "pH = −log[H⁺]", titr: "Add alkali until the indicator just changes", salts: "Insoluble salts form as precipitates", tests: "Each ion gives its own result", buffer: "A buffer resists changes in pH" }[P.view]);
}
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; T += dt; mixT += dt; if (P.view === "titr" && tap > 0) addV(tap * dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views: pH, titration, making salts, a tests lab and (A level) buffers.", 6000);
