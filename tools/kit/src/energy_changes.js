/* =====================================================================
   ENERGY CHANGES
   In a reaction, bonds in the reactants BREAK (this takes in energy)
   and new bonds in the products FORM (this gives out energy).
     ΔH = energy to break bonds − energy released making bonds
   If more is released than taken in, the reaction is EXOTHERMIC
   (ΔH negative): the surroundings warm up. Otherwise it is
   ENDOTHERMIC (ΔH positive): the surroundings cool down.
   Even exothermic reactions need a push to start: the ACTIVATION
   ENERGY, the energy needed to start breaking bonds.

   Four set-ups: reaction profiles with molecules breaking and
   re-forming; a polystyrene cup (Q = m c ΔT); burning alcohols under a
   can of water; and (A level) ΔG = ΔH − TΔS.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";   // label category axes only at whole numbers

// ---- bond energies (kJ/mol), from the usual data book ----
const BE = { "H-H": 436, "C-H": 413, "C-C": 347, "C=C": 612, "C=O": 805, "O-H": 464, "O=O": 498, "Cl-Cl": 243, "H-Cl": 432, "I-I": 151, "H-I": 299, "N#N": 945, "N-H": 391, "N=O": 631 };
// ---- molecule shapes: atoms [element, x, y] (units of about one bond length) and bonds [atom, atom, order] ----
const MOL = {
  H2: { a: [["H", -0.5, 0], ["H", 0.5, 0]], b: [[0, 1, 1]] }, O2: { a: [["O", -0.55, 0], ["O", 0.55, 0]], b: [[0, 1, 2]] }, N2: { a: [["N", -0.5, 0], ["N", 0.5, 0]], b: [[0, 1, 3]] },
  Cl2: { a: [["Cl", -0.6, 0], ["Cl", 0.6, 0]], b: [[0, 1, 1]] }, I2: { a: [["I", -0.7, 0], ["I", 0.7, 0]], b: [[0, 1, 1]] },
  HCl: { a: [["H", -0.55, 0], ["Cl", 0.55, 0]], b: [[0, 1, 1]] }, HI: { a: [["H", -0.6, 0], ["I", 0.6, 0]], b: [[0, 1, 1]] }, NO: { a: [["N", -0.5, 0], ["O", 0.5, 0]], b: [[0, 1, 2]] },
  H2O: { a: [["O", 0, 0], ["H", -0.8, 0.6], ["H", 0.8, 0.6]], b: [[0, 1, 1], [0, 2, 1]] }, CO2: { a: [["O", -1.1, 0], ["C", 0, 0], ["O", 1.1, 0]], b: [[0, 1, 2], [1, 2, 2]] },
  CH4: { a: [["C", 0, 0], ["H", -0.9, -0.6], ["H", 0.9, -0.6], ["H", -0.9, 0.6], ["H", 0.9, 0.6]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  NH3: { a: [["N", 0, 0], ["H", -0.9, 0.5], ["H", 0.9, 0.5], ["H", 0, -1]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
  C2H4: { a: [["C", -0.6, 0], ["C", 0.6, 0], ["H", -1.3, -0.7], ["H", -1.3, 0.7], ["H", 1.3, -0.7], ["H", 1.3, 0.7]], b: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]] },
  C2H6: { a: [["C", -0.7, 0], ["C", 0.7, 0], ["H", -1.3, -0.8], ["H", -1.5, 0.3], ["H", -0.9, 1], ["H", 1.3, -0.8], ["H", 1.5, 0.3], ["H", 0.9, 1]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1], [1, 6, 1], [1, 7, 1]] }
};
const bondKey = (A, B, o) => { const s = o === 1 ? "-" : o === 2 ? "=" : "#"; const k1 = A + s + B, k2 = B + s + A; return BE[k1] != null ? k1 : k2; };
const bondsIn = list => { const t = {}; for (const m of list) for (const [i, j, o] of MOL[m].b) { const k = bondKey(MOL[m].a[i][0], MOL[m].a[j][0], o); t[k] = (t[k] || 0) + 1; } return t; };
const sumBonds = t => Object.entries(t).reduce((s, [k, n]) => s + n * BE[k], 0);
const RX = {
  ch4: { name: "Methane burns", eq: "CH₄ + 2O₂ → CO₂ + 2H₂O", r: ["CH4", "O2", "O2"], p: ["CO2", "H2O", "H2O"], data: -802, Ea: 260 },
  h2: { name: "Hydrogen burns", eq: "2H₂ + O₂ → 2H₂O", r: ["H2", "H2", "O2"], p: ["H2O", "H2O"], data: -484, Ea: 200 },
  hcl: { name: "Hydrogen + chlorine", eq: "H₂ + Cl₂ → 2HCl", r: ["H2", "Cl2"], p: ["HCl", "HCl"], data: -185, Ea: 150 },
  nh3: { name: "Making ammonia", eq: "N₂ + 3H₂ → 2NH₃", r: ["N2", "H2", "H2", "H2"], p: ["NH3", "NH3"], data: -92, Ea: 230 },
  eth: { name: "Ethene + hydrogen", eq: "C₂H₄ + H₂ → C₂H₆", r: ["C2H4", "H2"], p: ["C2H6"], data: -137, Ea: 180 },
  hi: { name: "Hydrogen + iodine", eq: "H₂ + I₂ → 2HI", r: ["H2", "I2"], p: ["HI", "HI"], data: -10, Ea: 170 },
  no: { name: "Nitrogen + oxygen (lightning)", eq: "N₂ + O₂ → 2NO", r: ["N2", "O2"], p: ["NO", "NO"], data: 181, Ea: 380 }
};
const bondDH = k => sumBonds(bondsIn(RX[k].r)) - sumBonds(bondsIn(RX[k].p));

// ---- the cup: reactions in a polystyrene cup (or a glass beaker) ----
const CUP = {
  neut: { name: "Neutralisation: HCl + NaOH", eq: "HCl + NaOH → NaCl + H₂O", n: c => 0.025 * c, m: 50, dH: -57.1, tau: 0.05, what: "25 cm³ of hydrochloric acid + 25 cm³ of sodium hydroxide, each at the chosen concentration" },
  zinc: { name: "Zinc + copper(II) sulfate", eq: "Zn + CuSO₄ → ZnSO₄ + Cu", n: c => 0.025 * c, m: 50, dH: -217, tau: 1.6, what: "excess zinc powder added to 50 cm³ of copper(II) sulfate (0.5 mol/dm³ × the concentration setting)" },
  mg: { name: "Magnesium + hydrochloric acid", eq: "Mg + 2HCl → MgCl₂ + H₂", n: c => 0.0082 * c, m: 50, dH: -467, tau: 0.5, what: "0.20 g of magnesium ribbon (× the concentration setting) in 50 cm³ of excess acid" },
  nh4: { name: "Dissolving ammonium nitrate (cold pack)", eq: "NH₄NO₃(s) → NH₄⁺(aq) + NO₃⁻(aq)", n: c => 0.0625 * c, m: 50, dH: 25.7, tau: 0.35, what: "5.0 g of ammonium nitrate (× the concentration setting) stirred into 50 cm³ of water" },
  cacl: { name: "Dissolving calcium chloride (hot pack)", eq: "CaCl₂(s) → Ca²⁺(aq) + 2Cl⁻(aq)", n: c => 0.045 * c, m: 50, dH: -82.8, tau: 0.3, what: "5.0 g of anhydrous calcium chloride (× the concentration setting) in 50 cm³ of water" }
};
const CONT = { lid: { name: "polystyrene cup with lid", k: 0.012, C: 5 }, open: { name: "polystyrene cup, no lid", k: 0.03, C: 5 }, glass: { name: "glass beaker", k: 0.06, C: 45 } };
/* A 15-minute run: the reagent goes in at 3 minutes; a reading every 30 s.
   o = { rx, conc, cont, stir }. Returns the readings and what a student would work out. */
function cupRun(o, r) {
  const R = CUP[o.rx], K2 = CONT[o.cont], n = R.n(o.conc) * (1 + 0.01 * r.gauss()), m = R.m * (1 + 0.01 * r.gauss()), C = m * 4.18 + K2.C;  // J per °C
  const T0 = 20 + 0.6 * r.gauss(), dt = 0.01, rd = [], trace = []; let T = T0, Tth = T0, x = 0;
  for (let k = 0; k <= 1500; k++) {
    const t = k * dt;
    if (t >= 3) { const dx = (n - x) / R.tau * dt; x += dx; T += -R.dH * 1000 * dx / C; }   // heat released (or taken in) goes into the liquid
    T -= K2.k * (T - 20) * dt;                                                                // heat lost to (or gained from) the room
    Tth += (T - Tth) * dt / (o.stir ? 0.08 : 0.5);                                            // the thermometer lags behind, more so unstirred
    if (k % 50 === 0) rd.push([t, Math.round((Tth + 0.05 * r.gauss()) * 10) / 10]);          // reading to 0.1 °C
    if (k % 5 === 0) trace.push([t, T]);
  }
  const before = K.mean(rd.filter(q => q[0] < 3).map(q => q[1])), after = rd.filter(q => q[0] > 3), ext = R.dH < 0 ? after.reduce((a, b) => b[1] > a[1] ? b : a) : after.reduce((a, b) => b[1] < a[1] ? b : a);
  // extrapolate the cooling (or warming) line back to the moment of mixing
  const tail = rd.filter(q => q[0] >= Math.max(ext[0] + 1, 3 + 4 * R.tau)), f = tail.length > 2 ? K.linfit(tail) : { m: 0, c: ext[1] }, Text = f.m * 3 + f.c;
  const dTmax = ext[1] - before, dText = Text - before, nominal = R.n(o.conc);
  return { rd, trace, before, dTmax, dText, fit: f, peak: ext, n: nominal, dHmax: -R.m * 4.18 * dTmax / nominal / 1000, dHext: -R.m * 4.18 * dText / nominal / 1000, ideal: -R.dH * 1000 * nominal / (R.m * 4.18) };
}

// ---- fuels: alcohols in a spirit burner heating 100 g of water in a copper can by 20 °C ----
const ALC = [null, { name: "methanol", f: "CH₃OH", M: 32, dHc: -726 }, { name: "ethanol", f: "C₂H₅OH", M: 46, dHc: -1367 }, { name: "propan-1-ol", f: "C₃H₇OH", M: 60, dHc: -2021 }, { name: "butan-1-ol", f: "C₄H₉OH", M: 74, dHc: -2676 }, { name: "pentan-1-ol", f: "C₅H₁₁OH", M: 88, dHc: -3329 }];
const fuelEff = o => (o.screen ? 0.45 : 0.28) * Math.max(0.3, 1 - 0.04 * (o.height - 2));     // share of the flame's heat that reaches the water
function fuelRun(o, r) {
  const A = ALC[o.n], Q = 100 * 4.18 * 20, eff = fuelEff(o) * (1 + 0.06 * r.gauss()), incomplete = 0.04 * r();   // incomplete combustion releases less
  const burned = Q / (eff * (1 - incomplete) * (-A.dHc) * 1000 / A.M) + 0.02 * r(), mass = Math.round(burned * 100) / 100;   // balance reads to 0.01 g; a little evaporates from the wick
  return { Q, mass, perG: Q / 1000 / mass, dHc: -Q / 1000 / (mass / A.M), eff };
}

// ---- ΔG = ΔH − TΔS (A level) ----
const DG = {
  caco3: { name: "Decomposing calcium carbonate", eq: "CaCO₃(s) → CaO(s) + CO₂(g)", dH: 178, dS: 161 },
  boil: { name: "Boiling water", eq: "H₂O(l) → H₂O(g)", dH: 44, dS: 118.9 },
  nh4: { name: "Dissolving ammonium nitrate", eq: "NH₄NO₃(s) → NH₄⁺(aq) + NO₃⁻(aq)", dH: 25.7, dS: 108.7 },
  haber: { name: "Making ammonia", eq: "N₂(g) + 3H₂(g) → 2NH₃(g)", dH: -92, dS: -198 },
  mg: { name: "Burning magnesium", eq: "2Mg(s) + O₂(g) → 2MgO(s)", dH: -1202, dS: -217 }
};
const dG = (k, T) => DG[k].dH - T * DG[k].dS / 1000;

// ---- Born–Haber cycles (A level): data-book values in kJ/mol. The lattice energy is found by Hess's law:
//      ΔfH = atomise metal + ionise + atomise non-metal + electron affinities + lattice energy ----
const BH = {
  NaCl: { m: "Na", x: "Cl", f: -411, atM: 107, ie: [496], atX: 122, ea: [-349], nx: 1, theory: -766, st: ["Na(s) + ½Cl₂(g)", "NaCl(s)"] },
  KCl: { m: "K", x: "Cl", f: -437, atM: 89, ie: [419], atX: 122, ea: [-349], nx: 1, theory: -701, st: ["K(s) + ½Cl₂(g)", "KCl(s)"] },
  LiF: { m: "Li", x: "F", f: -616, atM: 159, ie: [520], atX: 79, ea: [-328], nx: 1, theory: -1033, st: ["Li(s) + ½F₂(g)", "LiF(s)"] },
  MgO: { m: "Mg", x: "O", f: -602, atM: 148, ie: [738, 1451], atX: 249, ea: [-141, 798], nx: 1, theory: -3795, st: ["Mg(s) + ½O₂(g)", "MgO(s)"] },
  CaO: { m: "Ca", x: "O", f: -635, atM: 178, ie: [590, 1145], atX: 249, ea: [-141, 798], nx: 1, theory: -3414, st: ["Ca(s) + ½O₂(g)", "CaO(s)"] },
  MgCl2: { m: "Mg", x: "Cl", f: -641, atM: 148, ie: [738, 1451], atX: 122, ea: [-349], nx: 2, theory: -2326, st: ["Mg(s) + Cl₂(g)", "MgCl₂(s)"] },
  AgCl: { m: "Ag", x: "Cl", f: -127, atM: 285, ie: [731], atX: 122, ea: [-349], nx: 1, theory: -833, st: ["Ag(s) + ½Cl₂(g)", "AgCl(s)"] }
};
// the steps of the cycle, each [label, ΔH]; the last is the lattice energy that closes the cycle
function bhSteps(k) { const B = BH[k], n = B.nx, s = [[`atomise ${B.m}: ${B.m}(s) → ${B.m}(g)`, B.atM]];
  B.ie.forEach((v, i) => s.push([`${["1st", "2nd"][i]} ionisation energy of ${B.m}`, v]));
  s.push([`atomise ${B.x}: ${n > 1 ? n + " × " : ""}½${B.x}₂(g) → ${B.x}(g)`, n * B.atX]);
  B.ea.forEach((v, i) => s.push([`${["1st", "2nd"][i]} electron affinity of ${B.x}${n > 1 ? " (× " + n + ")" : ""}`, n * v]));
  const sum = s.reduce((a, q) => a + q[1], 0); s.push(["lattice energy (forming the solid from gaseous ions)", B.f - sum]); return s; }
const latticeE = k => bhSteps(k).slice(-1)[0][1];
// Kapustinskii's estimate for 1:1 crystals (r = sum of ionic radii in pm), and real Born–Haber lattice energies of the alkali halides
const kapustinskii = r => -1.2025e5 * 2 / r * (1 - 34.5 / r);
const HALIDES = { 209: ["LiF", -1037], 235: ["NaF", -918], 257: ["LiCl", -853], 271: ["KF", -821], 283: ["NaCl", -787], 298: ["NaBr", -747], 319: ["KCl", -715], 334: ["KBr", -682], 358: ["KI", -649] };
// ---- Hess's law from enthalpies of combustion: ΔfH(compound) = Σ ΔcH(elements) − ΔcH(compound) ----
const HESS = { ch4: { n: "methane", f: "CH₄", C: 1, H: 4, O: 0, dc: -890, book: -75 }, c2h6: { n: "ethane", f: "C₂H₆", C: 2, H: 6, O: 0, dc: -1560, book: -84 }, c3h8: { n: "propane", f: "C₃H₈", C: 3, H: 8, O: 0, dc: -2219, book: -104 }, eth: { n: "ethanol", f: "C₂H₅OH", C: 2, H: 6, O: 1, dc: -1367, book: -277 }, glu: { n: "glucose", f: "C₆H₁₂O₆", C: 6, H: 12, O: 6, dc: -2803, book: -1273 } };
const hessF = k => { const H = HESS[k]; return H.C * -394 + H.H / 2 * -286 - H.dc; };

// ---------------- The page ----------------
const P = { mode: "profile", rx: "ch4", cat: false, cup: "neut", conc: 1, cont: "lid", stir: true, alc: 2, screen: true, height: 2, dg: "caco3", T: 298, bh: "NaCl", cyc: "bh", hess: "eth" };
let bhT = 0;
let rnd = K.rng(Date.now() % 99991 + 29), speed = 1, prog = 0, auto = true, cup = null, cupT = 0, fuel = null, fuelT = 0, fuelLog = [], fuelRuns = [], cupRuns = [];
const ui = K.app({
  title: "Energy Changes", subject: "Chemistry",
  blurb: "Bonds breaking and forming, exothermic and endothermic, measured in a cup and a flame",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 3(a) Energetics: exothermic and endothermic reactions, reaction profiles and activation energy, calorimetry (Q = mcΔT, ΔH in kJ/mol), bond energies; practical: temperature changes in a polystyrene cup.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 8 Energetics I (standard enthalpy changes, calorimetry and its errors, mean bond enthalpies) and Topic 13 Energetics II (lattice energy and Born–Haber cycles, polarisation and covalent character, entropy, ΔG = ΔH − TΔS, feasibility); Hess cycles (Topic 8)." } },
  missions: [
    { title: "Breaking and making", q: "Watch methane burn. Which part of the journey takes energy in, and which gives it out? Use the bond tally to work out ΔH.", hint: "Breaking bonds always takes energy in (uphill); making bonds always gives energy out (downhill). Burning methane breaks 4 C–H and 2 O=O (2648 kJ) and makes 2 C=O and 4 O–H (3466 kJ). More is given out than taken in: ΔH = 2648 − 3466 = −818 kJ/mol, exothermic. The data-book value is −802: bond energies are averages from many molecules.", setup() { set({ mode: "profile", rx: "ch4" }); } },
    { title: "Endothermic: lightning", q: "Try N₂ + O₂ → 2NO, which happens in lightning and hot car engines. Is it exothermic or endothermic? Why does it need such a high temperature?", hint: "The N≡N triple bond is very strong (945 kJ/mol), so breaking the reactants' bonds takes more energy than making NO gives back: ΔH = +181 kJ/mol, endothermic. The activation energy is also huge, so it only happens at thousands of degrees.", setup() { set({ mode: "profile", rx: "no" }); } },
    { title: "A catalyst", q: "Add a catalyst to the ammonia reaction. What changes on the profile, and what stays the same?", hint: "The catalyst provides a different route with a lower activation energy, so more collisions have enough energy to react and the reaction is faster. The energies of the reactants and products are unchanged, so ΔH is the same. (The Haber process uses an iron catalyst.)", setup() { set({ mode: "profile", rx: "nh3", cat: true }); } },
    { title: "Neutralisation in a cup", q: "Mix hydrochloric acid and sodium hydroxide in a polystyrene cup with a lid. Find the temperature rise, then calculate Q = m c ΔT and ΔH (kJ per mol of water made).", hint: "With 1.0 mol/dm³ the temperature rises by about 6.6 °C. Q = 50 g × 4.18 J/g/°C × 6.6 °C = 1380 J. Moles of water = 0.025. ΔH = −1.38 kJ ÷ 0.025 = −55 kJ/mol, a little less negative than the data book (−57.1) because some heat escapes and warms the cup.", setup() { set({ mode: "cup", cup: "neut" }); } },
    { title: "A cold pack", q: "Dissolve ammonium nitrate in water. Which way does the temperature go? Where does the energy come from?", hint: "The temperature falls: dissolving ammonium nitrate is endothermic (ΔH positive). The energy needed to break up the solid comes from the water, which cools down. Instant cold packs for sports injuries use this.", setup() { set({ mode: "cup", cup: "nh4" }); } },
    { title: "Glass beaker, no stirring", q: "Repeat the neutralisation in a glass beaker without stirring. How far off is your ΔH now? Why?", hint: "Glass conducts heat away much faster than polystyrene and has a bigger heat capacity itself, and without stirring the thermometer reads late, by which time heat has been lost. ΔT is too small, so ΔH comes out much too small. Polystyrene is a good insulator with a tiny heat capacity: that is why the practical uses it.", setup() { set({ mode: "cup", cup: "neut", cont: "glass", stir: false }); } },
    { title: "Extrapolate!", q: "Zinc powder reacts with copper(II) sulfate quite slowly. Compare ΔH from the highest reading with ΔH from extrapolating the cooling line back to the moment of mixing.", hint: "While the reaction is still going, heat is already leaking away, so the highest reading is lower than the true rise. Extending the straight cooling line back to the time of mixing estimates the rise there would have been with no heat loss. The extrapolated ΔH is closer to the data-book value (−217 kJ/mol).", setup() { set({ mode: "cup", cup: "zinc" }); } },
    { title: "Burning alcohols", q: "Heat 100 g of water by 20 °C with each alcohol in turn. Which releases most energy per mole? Why is the measured value so much smaller than the data book?", hint: "Each extra CH₂ adds about 650 kJ/mol to ΔHc in the data book, a steady pattern. The measured values are less than half: heat warms the air, the can and the clamp, combustion is incomplete (soot), and some alcohol evaporates. A draught screen and a short gap between flame and can help.", setup() { set({ mode: "fuel", alc: 1 }); } },
    { lvl: "adv", title: "Build a Born–Haber cycle", q: "Cycles: sodium chloride. Watch the cycle build step by step. Which steps take energy in? Use Hess's law to find the lattice energy.", hint: "Atomising Na (+107), ionising Na (+496) and atomising ½Cl₂ (+122) take energy in; the electron affinity of Cl (−349) gives some out. Lattice energy = ΔfH − (sum of the others) = −411 − 376 = −787 kJ/mol.", setup() { set({ mode: "bh", bh: "NaCl", cyc: "bh" }); } },
    { lvl: "adv", title: "Why is MgO so strong?", q: "Compare the lattice energies of NaCl and MgO. Why is MgO's nearly five times as exothermic? Why does it pay to make Mg²⁺ and O²⁻ despite the huge 2nd ionisation energy and 2nd electron affinity?", hint: "Ions with double charges attract four times as strongly, and Mg²⁺ and O²⁻ are smaller, so the lattice energy (−3845) more than pays for IE₂ (+1451) and EA₂ (+798). That is why MgO melts at 2852 °C.", setup() { set({ mode: "bh", bh: "MgO", cyc: "bh" }); } },
    { lvl: "adv", title: "Covalent character", q: "Compare the Born–Haber lattice energy with the theoretical (purely ionic) value for NaCl, MgCl₂ and AgCl. Which differ most, and why?", hint: "NaCl agrees within 3%: almost purely ionic. AgCl (10%) and MgCl₂ (8%) are more exothermic than the ionic model predicts: the small or highly charged cation polarises the anion's electron cloud, adding covalent character.", setup() { set({ mode: "bh", bh: "AgCl", cyc: "bh" }); } },
    { lvl: "adv", title: "Hess's law from combustion", q: "Cycles: Hess. Find the enthalpy of formation of ethanol from enthalpies of combustion. Why can it not be measured directly?", hint: "ΔfH = 2(−394) + 3(−286) − (−1367) = −279 kJ/mol (data book −277). Carbon, hydrogen and oxygen do not react cleanly to give only ethanol, so we go round the cycle via CO₂ and H₂O.", setup() { set({ mode: "bh", cyc: "hess", hess: "eth" }); } },
    { lvl: "adv", title: "When is it feasible?", q: "Calcium carbonate decomposes only when strongly heated. Find the temperature at which ΔG becomes zero. Why does temperature matter for this reaction but hardly at all for burning magnesium?", hint: "ΔG = ΔH − TΔS. For CaCO₃, ΔH = +178 kJ/mol and ΔS = +161 J/K/mol: ΔG < 0 when T > 178 000 ÷ 161 = 1106 K (833 °C). For burning magnesium ΔH is so large and negative that ΔG stays negative until very high temperatures, even though ΔS is negative. Feasible does not mean fast: kinetics still needs the activation energy.", setup() { set({ mode: "dg", dg: "caco3", T: 298 }); } }
  ],
  batch: [
    { title: "How close does a class get to −57 kJ/mol?", question: "Measuring the enthalpy of neutralisation in a polystyrene cup with a lid, how close do repeated results come to the data book?", how: "100 runs: 25 cm³ of 1.0 mol/dm³ HCl and NaOH, stirred, ΔT from the highest reading. Random parts: volumes ±1%, starting temperature, thermometer reading.", reps: 100, bins: 20, theory: -57.1, theoryLabel: "data book", yLabel: "ΔH measured (kJ/mol)", run: (x, r) => cupRun({ rx: "neut", conc: 1, cont: "lid", stir: true }, r).dHmax, note: "The results cluster a little below the data-book value (less negative): some heat is always lost and the cup itself is warmed. That is a systematic error: repeating does not remove it." },
    { title: "Insulation matters", question: "How does the container change the measured ΔH?", how: "1 = polystyrene cup with lid, 2 = no lid, 3 = glass beaker. Neutralisation, stirred, 6 runs each.", xLabel: "container (1 lid, 2 no lid, 3 glass)", yLabel: "ΔH measured (kJ/mol)", xs: [1, 2, 3], reps: 6, theory: () => -57.1, theoryLabel: "data book", run: (x, r) => cupRun({ rx: "neut", conc: 1, cont: ["lid", "open", "glass"][x - 1], stir: true }, r).dHmax, note: "The better the insulation, the closer to the data book. Glass loses heat fastest and soaks up heat itself." },
    { title: "Does the temperature rise double with concentration?", question: "If both solutions are twice as concentrated, does ΔT double?", how: "Neutralisation in a cup with a lid; concentration of both solutions 0.25 to 2 mol/dm³. Theory: ΔT = n × 57 100 ÷ (50 × 4.18) with no heat lost.", xLabel: "concentration (mol/dm³)", yLabel: "temperature rise (°C)", xs: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2], reps: 4, yMin: 0, fit: true, theory: c => 0.025 * c * 57100 / (50 * 4.18), theoryLabel: "no heat lost", run: (x, r) => cupRun({ rx: "neut", conc: x, cont: "lid", stir: true }, r).dTmax, note: "A straight line through the origin: twice the moles in the same volume of water gives twice the heat and twice the rise. It sits slightly below the no-loss line." },
    { title: "Highest reading or extrapolation?", question: "For the slow zinc + copper(II) sulfate reaction, which gives a better ΔH?", how: "1 = from the highest reading, 2 = from extrapolating the cooling line back to the time of mixing. Polystyrene cup with lid, stirred, 6 runs each.", xLabel: "method (1 highest, 2 extrapolated)", yLabel: "ΔH measured (kJ/mol)", xs: [1, 2], reps: 6, theory: () => -217, theoryLabel: "data book", run: (x, r) => { const q = cupRun({ rx: "zinc", conc: 1, cont: "lid", stir: true }, r); return x === 1 ? q.dHmax : q.dHext; }, note: "Extrapolating corrects for the heat lost while the reaction was still going, so it lands much nearer the data book." },
    { title: "Energy from the alcohols", question: "How does the measured enthalpy of combustion change along the alcohol series?", how: "Methanol (1 carbon) to pentan-1-ol (5); heat 100 g of water by 20 °C in a copper can 2 cm above the flame, with a draught screen. Theory: data-book ΔHc.", xLabel: "carbon atoms in the alcohol", yLabel: "ΔHc (kJ/mol)", xs: [1, 2, 3, 4, 5], reps: 4, fit: true, theory: n => -726 - 651 * (n - 1), theoryLabel: "data book", run: (x, r) => fuelRun({ n: x, screen: true, height: 2 }, r).dHc, note: "Both lines are straight, because each alcohol has one more CH₂ than the last, but the measured values are less than half of the data book: most of the heat never reaches the water." },
    { lvl: "adv", title: "Lattice energy and the size of the ions", question: "How does the Born–Haber lattice energy of the alkali halides depend on the distance between the ions?", how: "Nine alkali halides (LiF to KI); x = sum of the ionic radii; each Born–Haber value carries the uncertainty of its data (±1%).", xLabel: "r(+) + r(−) (pm)", yLabel: "lattice energy (kJ/mol)", xs: Object.keys(HALIDES).map(Number), reps: 4, theory: r => kapustinskii(r), theoryLabel: "Kapustinskii (ionic model)", run: (r, rr) => HALIDES[r][1] * (1 + 0.01 * rr.gauss()), note: "Smaller ions sit closer together and attract more strongly: the lattice energy is more exothermic. The simple ionic model follows the trend but is a little less exothermic than the real values." },
    { title: "Distance between flame and can", question: "How much of the heat reaches the water as the can is raised?", how: "Ethanol, draught screen; the can 1 to 10 cm above the wick. Efficiency = energy into the water ÷ energy the alcohol burned should release.", xLabel: "height of the can above the flame (cm)", yLabel: "efficiency (%)", xs: [1, 2, 4, 6, 8, 10], reps: 4, yMin: 0, run: (x, r) => { const q = fuelRun({ n: 2, screen: true, height: x }, r); return 100 * q.dHc / ALC[2].dHc; }, note: "The further the flame from the can, the more heat escapes into the air around it." }
  ],
  revise: {
    ideas: [
      { lvl: "adv", tag: "9CH0 8", text: "Hess's law: the enthalpy change of a reaction is independent of the route. ΔfH from combustion data: ΔfH = Σ ΔcH(elements) − ΔcH(compound)." },
      { lvl: "adv", tag: "9CH0 13", text: "Lattice energy: the enthalpy change when 1 mol of an ionic solid forms from its gaseous ions (always exothermic). It is more exothermic for smaller ions and higher charges." },
      { lvl: "adv", tag: "9CH0 13", text: "Born–Haber cycle: ΔfH = ΔatH(metal) + IE(s) + ΔatH(non-metal) + EA(s) + lattice energy. A Born–Haber value more exothermic than the ionic-model value shows covalent character (polarisation of the anion)." },
      { lvl: "std", tag: "4CH1 3.1", text: "Exothermic reactions give out heat to the surroundings (ΔH negative); endothermic reactions take heat in (ΔH positive)." },
      { lvl: "std", tag: "4CH1 3.2", text: "Calorimetry: heat energy change Q = m c ΔT, with m the mass of the solution (1 cm³ ≈ 1 g) and c = 4.18 J/g/°C. Molar enthalpy change ΔH = −Q ÷ moles." },
      { lvl: "std", tag: "4CH1 3.4", text: "Practical: measure temperature changes in a polystyrene cup (dissolving, displacement, neutralisation); combustion of alcohols with a spirit burner and a can of water." },
      { lvl: "std", tag: "4CH1 3.5", text: "Breaking bonds is endothermic; making bonds is exothermic. ΔH = bonds broken − bonds made, using bond energies." },
      { lvl: "std", tag: "4CH1 3.6", text: "Reaction profile diagrams show the energy of reactants and products, ΔH and the activation energy (the minimum energy needed for a reaction). A catalyst lowers the activation energy." },
      { lvl: "adv", tag: "9CH0 8", text: "Mean bond enthalpies are averages over many compounds, so ΔH from them differs from measured values; they apply to gases." },
      { lvl: "adv", tag: "9CH0 8", text: "Calorimetry errors: heat loss (corrected by extrapolating a cooling curve), heat capacity of the container, incomplete combustion, evaporation." },
      { lvl: "adv", tag: "9CH0 13", text: "ΔG = ΔH − TΔS (ΔS in kJ K⁻¹ mol⁻¹). A reaction is feasible when ΔG ≤ 0; the temperature at which it becomes feasible is T = ΔH ÷ ΔS. ΔG = −RT ln K." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain, in terms of bonds, why the combustion of methane is exothermic.", ans: "<ul><li>energy is needed to break the bonds in methane and oxygen</li><li>energy is released when bonds form in carbon dioxide and water</li><li>more energy is released making bonds than is needed to break bonds</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const q = cup || cupRun({ rx: "neut", conc: 1, cont: "lid", stir: true }, K.rng(3)); return `In the cup, 50 g of solution rose by ${q.dTmax.toFixed(1)} °C. Calculate the heat energy given out (c = 4.18 J/g/°C).`; }, ans: () => { const q = cup || cupRun({ rx: "neut", conc: 1, cont: "lid", stir: true }, K.rng(3)); return `<ul><li>Q = m c ΔT = 50 × 4.18 × ${q.dTmax.toFixed(1)}</li><li>= ${(50 * 4.18 * Math.abs(q.dTmax)).toFixed(0)} J</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Use bond energies to calculate ΔH for H₂ + Cl₂ → 2HCl (H–H 436, Cl–Cl 243, H–Cl 432 kJ/mol).", ans: "<ul><li>bonds broken: 436 + 243 = 679 kJ</li><li>bonds made: 2 × 432 = 864 kJ</li><li>ΔH = 679 − 864 = −185 kJ/mol</li></ul>" },
      { lvl: "std", marks: 2, q: "Draw and label a reaction profile for an endothermic reaction.", ans: "<ul><li>products higher than reactants, ΔH shown as an upward arrow</li><li>a hump above both, with the activation energy from the reactants to the top</li></ul>" },
      { lvl: "std", marks: 3, q: "Suggest why the enthalpy of combustion of ethanol measured with a spirit burner is much less exothermic than the data-book value.", ans: "<ul><li>heat lost to the surroundings / air, not all reaches the water</li><li>heat warms the can</li><li>incomplete combustion; some alcohol evaporates</li></ul>" },
      { lvl: "adv", marks: 3, q: "For CaCO₃ → CaO + CO₂, ΔH = +178 kJ mol⁻¹ and ΔS = +161 J K⁻¹ mol⁻¹. Calculate the minimum temperature for the reaction to be feasible.", ans: "<ul><li>ΔG = 0 when T = ΔH ÷ ΔS</li><li>= 178 ÷ 0.161</li><li>= 1106 K</li></ul>" },
      { lvl: "adv", marks: 2, q: "Explain why a reaction with negative ΔG may not happen at room temperature.", ans: "<ul><li>ΔG shows the reaction is thermodynamically feasible</li><li>but the activation energy may be too high, so the rate is negligible (kinetically stable)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Profiles</b>: the reactants' and products' energies differ by ΔH worked out from bond energies (H–H 436, C–H 413, C–C 347, C=C 612, C=O 805, O–H 464, O=O 498, Cl–Cl 243, H–Cl 432, I–I 151, H–I 299, N≡N 945, N–H 391, N=O 631 kJ/mol); the hump is the activation energy (illustrative values). A catalyst lowers it by 40%.</li>
<li><b>Cup</b>: the reaction goes at a rate (n − x) ÷ τ after the reagent is added at 3 minutes; the heat goes into the solution and the container (polystyrene 5 J/°C, glass 45 J/°C); heat leaks to or from the room at 1.2% (lid), 3% (no lid) or 6% (glass) of the temperature difference per minute. The thermometer lags behind the liquid, much more when unstirred. Readings every 30 s to 0.1 °C. The calculation uses the mass of the solution only, as students do.</li>
<li><b>Fuels</b>: 100 g of water heated by 20 °C. With a draught screen 45% of the heat reaches the water (28% without), falling by 4% of that for every cm the can is above 2 cm; up to 4% incomplete combustion; up to 0.02 g evaporates from the wick; balance to 0.01 g.</li>
<li><b>ΔG</b>: standard ΔH and ΔS, both taken as constant with temperature.</li>
<li>Batch runs add small random errors in volumes (±1%), the starting temperature, the thermometer and the flame's efficiency.</li></ul>
<h3>Simplifications</h3>
<ul><li>Molecules are drawn flat; bond energies are averages (the data-book ΔH is shown beside the bond-energy result).</li>
<li>The density and specific heat capacity of every solution are taken as those of water.</li>
</ul><h3>Cycles (A level)</h3><ul><li>Born–Haber steps use data-book values (kJ/mol); the lattice energy is whatever closes the cycle. The theoretical (ionic model) lattice energies are data-book values too.</li><li>Kapustinskii's estimate U = 1.2025 × 10⁵ × 2 ÷ r × (1 − 34.5/r) kJ/mol (r = sum of ionic radii in pm) is shown against Born–Haber values for the alkali halides.</li><li>Hess cycles use ΔcH(C) = −394 and ΔcH(H₂) = −286 kJ/mol.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/energy-changes.html">original/energy-changes.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("Set-up");
ctl.mode = K.seg(g, { value: "profile", options: [["profile", "⛰ Profiles and bonds"], ["cup", "🥤 Cup"], ["fuel", "🔥 Fuels"], ["dg", "ΔG (A level)"], ["bh", "🔄 Cycles (A level)"]], on: v => set({ mode: v }) });
grp.profile = g = ui.group("Reaction");
ctl.rx = K.seg(g, { value: "ch4", options: Object.entries(RX).map(([k, x]) => [k, x.name]), on: v => { P.rx = v; prog = 0; } });
ctl.cat = K.toggle(g, { label: "Add a catalyst", value: false, on: v => P.cat = v });
ctl.auto = K.toggle(g, { label: "Run the reaction (or drag the ball along the profile)", value: true, on: v => auto = v });
grp.cup = g = ui.group("The cup");
ctl.cup = K.seg(g, { value: "neut", options: Object.entries(CUP).map(([k, x]) => [k, x.name.split(":")[0].replace(" (cold pack)", " (cold)").replace(" (hot pack)", " (hot)")]), on: v => { P.cup = v; newCup(); } });
const cupNote = K.note(g, "");
ctl.conc = K.slider(g, { label: "Concentration (amount) setting", min: 0.25, max: 2, step: 0.25, value: 1, fmt: v => "× " + v, on: v => { P.conc = v; newCup(); } });
ctl.cont = K.seg(g, { label: "Container", value: "lid", options: Object.entries(CONT).map(([k, x]) => [k, x.name.replace("polystyrene cup", "polystyrene")]), on: v => { P.cont = v; newCup(); } });
ctl.stir = K.toggle(g, { label: "Stir", value: true, on: v => { P.stir = v; newCup(); } });
K.btn(K.row(g), "↺ Do it again", () => newCup(), "primary");
grp.fuel = g = ui.group("The spirit burner");
ctl.alc = K.seg(g, { value: 2, options: ALC.slice(1).map((a, i) => [i + 1, a.name]), on: v => { P.alc = v; newFuel(); } });
ctl.screen = K.toggle(g, { label: "Draught screen", value: true, on: v => { P.screen = v; newFuel(); } });
ctl.height = K.slider(g, { label: "Can above the wick", min: 1, max: 10, step: 1, value: 2, unit: "cm", on: v => { P.height = v; newFuel(); } });
let rf = K.row(g); K.btn(rf, "↺ Light it again", () => newFuel(), "primary"); K.btn(rf, "Clear results", () => fuelRuns = []);
grp.dg = g = ui.group("Feasibility (A level)");
ctl.dg = K.seg(g, { value: "caco3", options: Object.entries(DG).map(([k, x]) => [k, x.name]), on: v => P.dg = v });
ctl.T = K.slider(g, { label: "Temperature", min: 100, max: 2500, step: 10, value: 298, fmt: v => `${v} K (${v - 273} °C)`, on: v => P.T = v });
grp.bh = g = ui.group("Cycles (A level)");
ctl.cyc = K.seg(g, { value: "bh", options: [["bh", "Born–Haber"], ["hess", "Hess from combustion"]], on: v => { P.cyc = v; bhT = 0; } });
ctl.bh = K.seg(g, { label: "Ionic compound", value: "NaCl", options: Object.keys(BH).map(k => [k, k.replace("2", "₂")]), on: v => { P.bh = v; bhT = 0; } });
ctl.hess = K.seg(g, { label: "Compound to form", value: "eth", options: Object.entries(HESS).map(([k, x]) => [k, x.n]), on: v => { P.hess = v; bhT = 0; } });
K.btn(K.row(g), "↺ Build it again", () => bhT = 0, "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 6, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((t, i) => read.el.children[i].firstElementChild.textContent = t);
function newCup() { cup = cupRun({ rx: P.cup, conc: P.conc, cont: P.cont, stir: P.stir }, rnd); cupT = 0; }
function newFuel() { fuel = fuelRun({ n: P.alc, screen: P.screen, height: P.height }, rnd); fuelT = 0; fuelLog = []; }
function set(o) {
  Object.assign(P, { rx: "ch4", cat: false, cup: "neut", conc: 1, cont: "lid", stir: true, alc: 2, screen: true, height: 2, dg: "caco3", T: 298, bh: "NaCl", cyc: "bh", hess: "eth" }, o); bhT = 0;
  for (const k of ["mode", "rx", "cup", "cont", "alc", "dg", "cyc", "bh", "hess"]) ctl[k].set(P[k]); for (const k of ["conc", "height", "T"]) ctl[k].set(P[k]); ctl.cat.set(P.cat); ctl.stir.set(P.stir); ctl.screen.set(P.screen);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none"; prog = 0; auto = true; ctl.auto.set(true); newCup(); newFuel(); speed = o.speed || 1; ctl.speed.set(speed);
  chA.opts.title = { profile: "Bond tally", cup: "Temperature against time", fuel: "Water temperature and mass of alcohol", dg: "ΔG against temperature", bh: "The steps of the cycle" }[P.mode];
  chB.opts.title = { profile: "Bond energies: bonds broken and made", cup: "Your ΔH against the data book", fuel: "Your ΔHc against the data book", dg: "ΔH and −TΔS at this temperature", bh: "Born–Haber against the ionic model" }[P.mode];
  relabel({ profile: ["bonds broken (in)", "bonds made (out)", "ΔH from bond energies", "data book"], cup: ["temperature change", "Q = m c ΔT", "ΔH (highest reading)", "ΔH (extrapolated)"], fuel: ["water temperature", "alcohol burned", "energy per gram", "ΔHc measured"], dg: ["ΔH", "TΔS", "ΔG", "feasible above"], bh: ["ΔfH", "sum of the other steps", "lattice energy (Hess)", "ionic model"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const ACOL = { H: "#f2f2f2", C: "#555c6b", O: "#ff5d6c", N: "#6fb1ff", Cl: "#7fe3a0", I: "#c58cff" };
let geoP = null;
function drawProfile(c, w, h) {
  const R = RX[P.rx], dH = bondDH(P.rx), Ea = R.Ea * (P.cat ? 0.6 : 1), Ea0 = R.Ea, x0 = 60, x1 = w * 0.62, top = 95, bot = h * 0.62, lo = Math.min(0, dH), hi = Math.max(Ea0, Ea0 + Math.min(0, dH), dH + 60);
  const Y = e => bot - (e - lo) / (hi - lo) * (bot - top), X = s => x0 + s * (x1 - x0);
  const E = (ea, s) => { if (s < 0.2) return 0; if (s > 0.8) return dH; const u = (s - 0.2) / 0.6, base = dH * (3 * u * u - 2 * u * u * u), peak = ea; return base + (peak - dH * 0.5) * Math.pow(Math.sin(Math.PI * u), 2); };   // a smooth step from 0 to ΔH, plus a hump that peaks at Eₐ
  geoP = { X, x0, x1 };
  c.strokeStyle = "#7d8aa5"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, top - 20); c.lineTo(x0, bot + 10); c.lineTo(x1 + 20, bot + 10); c.stroke(); T(c, "energy ↑", x0 + 6, top - 12, "#aab6cc", "left"); T(c, "progress of reaction →", x1, bot + 26, "#aab6cc", "right");
  const path = (ea, col, dash) => { c.strokeStyle = col; c.lineWidth = 3; c.setLineDash(dash || []); c.beginPath(); for (let s = 0; s <= 1.0001; s += 0.01) { const y = Y(E(ea, s)); s ? c.lineTo(X(s), y) : c.moveTo(X(s), y); } c.stroke(); c.setLineDash([]); };
  if (P.cat) path(Ea0, "#7d8aa5", [6, 5]); path(Ea, "#ffd166");
  const peakE = Math.max(...Array.from({ length: 101 }, (_, i) => E(Ea, i / 100)));
  // labels: reactants, products, Ea and ΔH arrows
  T(c, "reactants", X(0.02), Y(0) - 8, "#eef2f8"); T(c, "products", X(0.82), Y(dH) - 8, "#eef2f8");
  const arr = (x, y1, y2, col, lab) => { c.strokeStyle = c.fillStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y2); c.stroke(); const d = y2 > y1 ? 1 : -1; c.beginPath(); c.moveTo(x, y2); c.lineTo(x - 5, y2 - 8 * d); c.lineTo(x + 5, y2 - 8 * d); c.fill(); T(c, lab, x + 8, (y1 + y2) / 2 + 4, col, "left", "600 12px"); };
  c.strokeStyle = "rgba(255,255,255,0.25)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(0.15), Y(0)); c.lineTo(X(0.95), Y(0)); c.stroke(); c.setLineDash([]);
  arr(X(0.36), Y(0), Y(peakE), "#ff8a70", `Eₐ ${Math.round(peakE)} kJ/mol`); arr(X(0.9), Y(0), Y(dH), dH < 0 ? "#7fe3a0" : "#6fb1ff", `ΔH ${dH > 0 ? "+" : ""}${dH} kJ/mol`);
  // the ball rolling along the profile
  const by = Y(E(Ea, prog)); c.fillStyle = "#fff"; c.beginPath(); c.arc(X(prog), by - 8, 8, 0, 6.3); c.fill();
  T(c, R.eq, x0, 32, "#eef2f8", "left", "600 15px"); T(c, dH < 0 ? "EXOTHERMIC: heat given out, surroundings warm up" : "ENDOTHERMIC: heat taken in, surroundings cool down", x0, 52, dH < 0 ? "#7fe3a0" : "#6fb1ff", "left", "600 12.5px");
  // atoms below: whole molecules → separate atoms (bonds broken) → new molecules (bonds made)
  drawAtoms(c, x0, bot + 40, x1 - x0, h - bot - 50);
  // energy-level staircase on the right: up by bonds broken, down by bonds made
  const br = sumBonds(bondsIn(R.r)), mk = sumBonds(bondsIn(R.p)), sx = x1 + 70, sw = w - sx - 30, st = 130, sb = h - 40, sY = e => sb - (e - Math.min(0, br - mk)) / (br - Math.min(0, br - mk)) * (sb - st);
  const lvl = (y, lab, col) => { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, y); c.lineTo(sx + sw, y); c.stroke(); T(c, lab, sx + sw, y - 6, col, "right", "11.5px"); };
  lvl(sY(0), "reactants", "#eef2f8"); lvl(sY(br), "separate atoms", "#ffd166"); lvl(sY(br - mk), "products", "#eef2f8");
  arr(sx + sw * 0.25, sY(0), sY(br), "#ff8a70", `+${br}`); arr(sx + sw * 0.6, sY(br), sY(br - mk), "#7fe3a0", `−${mk}`);
  T(c, "bonds broken ↑   bonds made ↓", sx, st - 20, "#aab6cc");
}
function placeMols(list, x0, w, y, sc) {   // lay molecules out in a row; returns atoms with positions and bonds
  const atoms = [], bonds = [], gap = w / list.length; list.forEach((m, k) => { const cx = x0 + gap * (k + 0.5), base = atoms.length; MOL[m].a.forEach(([el, ax, ay]) => atoms.push({ el, x: cx + ax * sc, y: y + ay * sc })); MOL[m].b.forEach(([i, j, o]) => bonds.push([base + i, base + j, o])); }); return { atoms, bonds };
}
function drawAtoms(c, x0, y0, w, h) {
  const R = RX[P.rx], sc = Math.min(22, h / 3), y = y0 + h / 2, A = placeMols(R.r, x0, w, y, sc), B = placeMols(R.p, x0, w, y, sc);
  // match each reactant atom to a product atom of the same element
  const used = new Set(), map = A.atoms.map(a => { const j = B.atoms.findIndex((b, k) => b.el === a.el && !used.has(k)); used.add(j); return j; });
  const s = prog, phase = s < 0.35 ? 0 : s < 0.65 ? (s - 0.35) / 0.3 : 1, spread = Math.sin(Math.PI * K.clamp((s - 0.2) / 0.6, 0, 1));
  const pos = A.atoms.map((a, i) => { const b = B.atoms[map[i]], cx = x0 + w / 2; let x = a.x + (b.x - a.x) * phase, yy = a.y + (b.y - a.y) * phase; x += (x - cx) * 0.25 * spread + Math.sin(i * 7.3) * 18 * spread; yy += Math.cos(i * 5.1) * 22 * spread; return [x, yy]; });
  const drawB = (list, sel) => { c.strokeStyle = "#aab6cc"; c.lineWidth = 2; for (const [i, j, o] of list) { const a = sel(i), b = sel(j); if (!a || !b) continue; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * 3, ny = dx / L * 3; for (let k = 0; k < o; k++) { const off = (k - (o - 1) / 2); c.beginPath(); c.moveTo(a[0] + nx * off, a[1] + ny * off); c.lineTo(b[0] + nx * off, b[1] + ny * off); c.stroke(); } } };
  if (s < 0.3) drawB(A.bonds, i => pos[i]); if (s > 0.7) { const inv = []; map.forEach((j, i) => inv[j] = i); drawB(B.bonds, j => pos[inv[j]]); }
  A.atoms.forEach((a, i) => { c.fillStyle = ACOL[a.el]; c.beginPath(); c.arc(pos[i][0], pos[i][1], a.el === "H" ? 7 : 10, 0, 6.3); c.fill(); T(c, a.el, pos[i][0], pos[i][1] + 4, a.el === "H" ? "#222" : "#fff", "center", "600 10px"); });
  T(c, s < 0.3 ? "reactant molecules" : s < 0.7 ? "bonds broken: separate atoms (energy taken in)" : "new bonds made (energy given out)", x0, y0 + 2, "#aab6cc");
}
function drawCup(c, w, h) {
  const R = CUP[P.cup], q = cup, k = Math.min(q.trace.length - 1, Math.floor(cupT / 0.05)), Tl = q.trace[k][1], t = q.trace[k][0];
  const cx = w * 0.3, top = 90, bot = h - 60, cw = 150, glass = P.cont === "glass";
  // the cup or beaker, with the liquid coloured by temperature
  const heat = K.clamp((Tl - 20) / 25, -1, 1); c.fillStyle = heat >= 0 ? `rgba(${120 + 135 * heat},${130 - 40 * heat},${200 - 150 * heat},0.55)` : `rgba(${120 + 60 * heat},${170 - 20 * heat},255,0.55)`;
  c.beginPath(); c.moveTo(cx - cw / 2 + 8, top + 60); c.lineTo(cx + cw / 2 - 8, top + 60); c.lineTo(cx + cw / 2 - 18, bot); c.lineTo(cx - cw / 2 + 18, bot); c.fill();
  c.strokeStyle = glass ? "#9fd3ff" : "#eef2f8"; c.lineWidth = glass ? 2 : 7; c.beginPath(); c.moveTo(cx - cw / 2, top + 20); c.lineTo(cx - cw / 2 + 18, bot); c.lineTo(cx + cw / 2 - 18, bot); c.lineTo(cx + cw / 2, top + 20); c.stroke();
  if (P.cont === "lid") { c.fillStyle = "#eef2f8"; c.fillRect(cx - cw / 2 - 8, top + 12, cw + 16, 9); }
  // thermometer
  c.fillStyle = "#c9d3e6"; c.fillRect(cx + 26, top - 30, 8, bot - top + 10); c.fillStyle = "#ff5d6c"; const thY = bot - 20 - (q.rd[Math.min(q.rd.length - 1, Math.floor(t / 0.5))][1] - 5) * 6; c.fillRect(cx + 28, Math.max(top - 28, thY), 4, bot - 20 - Math.max(top - 28, thY) + 20); c.beginPath(); c.arc(cx + 30, bot - 4, 8, 0, 6.3); c.fill();
  // particles in the liquid: faster when hotter
  const ph = performance.now() / 1000, sp = Math.sqrt((Tl + 273) / 293); c.fillStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < 40; i++) { const px = cx - 50 + ((i * 37 + ph * 60 * sp * (1 + i % 3)) % 100), py = top + 80 + ((i * 53 + ph * 40 * sp * (1 + i % 2)) % (bot - top - 100)); c.beginPath(); c.arc(px, py, 2, 0, 6.3); c.fill(); }
  if (P.stir && t >= 3) { c.strokeStyle = "#aab6cc"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 30 + 10 * Math.sin(ph * 6), top - 20); c.lineTo(cx - 20 + 10 * Math.sin(ph * 6), bot - 30); c.stroke(); }
  if (t < 3) T(c, `adding ${R.name.split(":")[0].toLowerCase().includes("dissolv") ? "the solid" : "the reagent"} at 3:00…`, cx, top - 40, "#ffd166", "center", "600 13px"); else T(c, R.eq, cx, top - 40, "#eef2f8", "center", "600 13px");
  const mm = Math.floor(t), ss = Math.round((t - mm) * 60) % 60; T(c, `${mm}:${String(ss).padStart(2, "0")}`, cx - cw / 2 - 30, top + 40, "#eef2f8", "right", "600 18px"); T(c, Tl.toFixed(1) + " °C", cx + 50, top - 6, "#ff8a70", "left", "600 16px");
  // working on the right
  const x = w * 0.58; let y = 110; const line = (s, col = "#eef2f8", f = "13px") => { T(c, s, x, y, col, "left", f); y += 22; };
  line("Working out", "#aab6cc", "600 13px");
  if (k < q.trace.length - 1) { line("Readings every 30 seconds…", "#aab6cc"); return; }
  line(`Start: ${q.before.toFixed(1)} °C;  ${R.dH < 0 ? "highest" : "lowest"}: ${q.peak[1].toFixed(1)} °C`);
  line(`ΔT = ${q.dTmax.toFixed(1)} °C   (extrapolated: ${q.dText.toFixed(1)} °C)`);
  line(`Q = m c ΔT = ${R.m} × 4.18 × ${Math.abs(q.dTmax).toFixed(1)} = ${(R.m * 4.18 * Math.abs(q.dTmax)).toFixed(0)} J`);
  line(`moles = ${q.n.toFixed(4)} mol`);
  line(`ΔH = ${q.dTmax > 0 ? "−" : "+"}${(R.m * 4.18 * Math.abs(q.dTmax) / 1000).toFixed(2)} kJ ÷ ${q.n.toFixed(4)} = ${q.dHmax > 0 ? "+" : ""}${q.dHmax.toFixed(1)} kJ/mol`, "#ffd166", "600 14px");
  line(`data book: ${R.dH > 0 ? "+" : ""}${R.dH} kJ/mol (${(100 * (q.dHmax - R.dH) / Math.abs(R.dH)).toFixed(0)}% off)`, "#aab6cc");
}
function drawFuel(c, w, h) {
  const A = ALC[P.alc], f = fuel, frac = Math.min(1, fuelT / 1), Tw = 20 + 20 * frac, burned = f.mass * frac;
  const cx = w * 0.28, base = h - 70, canY = base - 130 - P.height * 8;
  // balance, spirit burner, flame, can of water, draught screen
  c.fillStyle = "#3a4560"; c.fillRect(cx - 80, base, 160, 26); T(c, (60 - burned).toFixed(2) + " g", cx, base + 18, "#7fe3a0", "center", "600 14px");
  c.fillStyle = "rgba(200,230,255,0.25)"; c.beginPath(); c.ellipse(cx, base - 25, 32, 26, 0, 0, 6.3); c.fill(); c.fillStyle = "#aab6cc"; c.fillRect(cx - 3, base - 60, 6, 14);
  const ph = performance.now() / 1000; if (frac < 1) { const fh = 50 + 6 * Math.sin(ph * 13) + (P.screen ? 0 : 10 * Math.sin(ph * 3)), lean = P.screen ? 0 : 14 * Math.sin(ph * 1.7); const gr = c.createLinearGradient(cx, base - 60, cx, base - 60 - fh); gr.addColorStop(0, "#6fb1ff"); gr.addColorStop(0.3, "#ffd166"); gr.addColorStop(1, "rgba(255,138,112,0)"); c.fillStyle = gr; c.beginPath(); c.moveTo(cx - 10, base - 58); c.quadraticCurveTo(cx - 14 + lean, base - 60 - fh * 0.6, cx + lean, base - 60 - fh); c.quadraticCurveTo(cx + 14 + lean, base - 60 - fh * 0.6, cx + 10, base - 58); c.fill(); }
  c.fillStyle = "#c98a4a"; c.fillRect(cx - 45, canY - 80, 90, 80); c.fillStyle = `rgba(${Math.round(90 + 5 * (Tw - 20))},150,${Math.round(255 - 4 * (Tw - 20))},0.6)`; c.fillRect(cx - 40, canY - 70, 80, 66);
  c.fillStyle = "#c9d3e6"; c.fillRect(cx + 20, canY - 140, 6, 120); T(c, Tw.toFixed(1) + " °C", cx + 32, canY - 120, "#ff8a70", "left", "600 15px");
  if (P.screen) { c.fillStyle = "rgba(170,182,204,0.25)"; c.fillRect(cx - 95, canY - 20, 10, base - canY + 20); c.fillRect(cx + 85, canY - 20, 10, base - canY + 20); }
  T(c, `${A.name} (${A.f}) burner`, cx, base + 50, "#eef2f8", "center", "600 13px"); T(c, `can ${P.height} cm above the wick`, cx - 100, canY + 20, "#aab6cc", "right");
  // working, and where the energy went
  const x = w * 0.55; let y = 100; const line = (s, col = "#eef2f8", fnt = "13px") => { T(c, s, x, y, col, "left", fnt); y += 22; };
  line("Heating 100 g of water by 20 °C", "#aab6cc", "600 13px");
  if (frac < 1) { line("Burning…", "#aab6cc"); return; }
  line(`Q = 100 × 4.18 × 20 = ${f.Q} J = ${(f.Q / 1000).toFixed(2)} kJ`); line(`mass burned = ${f.mass.toFixed(2)} g`); line(`energy per gram = ${f.perG.toFixed(1)} kJ/g`);
  line(`moles = ${f.mass.toFixed(2)} ÷ ${A.M} = ${(f.mass / A.M).toFixed(4)} mol`); line(`ΔHc = −${(f.Q / 1000).toFixed(2)} ÷ ${(f.mass / A.M).toFixed(4)} = ${f.dHc.toFixed(0)} kJ/mol`, "#ffd166", "600 14px"); line(`data book: ${A.dHc} kJ/mol`, "#aab6cc");
  y += 8; const bw = w - x - 30, pw = f.dHc / A.dHc; c.fillStyle = "#5ab0ff"; c.fillRect(x, y, bw * pw, 18); c.fillStyle = "#ff8a70"; c.fillRect(x + bw * pw, y, bw * (1 - pw), 18); y += 34; T(c, `${Math.round(100 * pw)}% into the water`, x, y, "#5ab0ff"); T(c, "the rest: air, can, clamp, soot, evaporation", x + bw, y, "#ff8a70", "right");
}
function drawDG(c, w, h) {
  const D = DG[P.dg], g0 = dG(P.dg, P.T), x0 = 80, bw = 90, mid = h * 0.5, sc = (h * 0.35) / Math.max(Math.abs(D.dH), Math.abs(P.T * D.dS / 1000), Math.abs(g0), 1);
  T(c, D.eq, x0, 40, "#eef2f8", "left", "600 15px"); T(c, `ΔH = ${D.dH > 0 ? "+" : ""}${D.dH} kJ/mol,  ΔS = ${D.dS > 0 ? "+" : ""}${D.dS} J/K/mol,  T = ${P.T} K`, x0, 64, "#aab6cc");
  c.strokeStyle = "#7d8aa5"; c.beginPath(); c.moveTo(x0 - 20, mid); c.lineTo(x0 + 4 * bw + 60, mid); c.stroke();
  const bar = (i, v, col, lab) => { const x = x0 + i * (bw + 30); c.fillStyle = col; c.fillRect(x, v >= 0 ? mid - v * sc : mid, bw, Math.abs(v) * sc); T(c, lab, x + bw / 2, v >= 0 ? mid + 18 : mid - 8, "#eef2f8", "center", "600 12px"); T(c, (v > 0 ? "+" : "") + v.toFixed(0), x + bw / 2, v >= 0 ? mid - v * sc - 6 : mid + Math.abs(v) * sc + 16, col, "center", "600 13px"); };
  bar(0, D.dH, "#ff8a70", "ΔH"); bar(1, -P.T * D.dS / 1000, "#6fb1ff", "−TΔS"); bar(2, g0, g0 <= 0 ? "#7fe3a0" : "#ff5d6c", "ΔG = ΔH − TΔS");
  T(c, g0 <= 0 ? "ΔG ≤ 0: FEASIBLE at this temperature" : "ΔG > 0: NOT feasible at this temperature", x0 + 3 * (bw + 30) + 10, mid - 10, g0 <= 0 ? "#7fe3a0" : "#ff5d6c", "left", "600 14px");
  const Tf = D.dH / (D.dS / 1000); T(c, Tf > 0 ? (D.dH > 0 ? `feasible above ${Tf.toFixed(0)} K` : `feasible below ${Tf.toFixed(0)} K`) : (D.dH < 0 ? "feasible at all temperatures" : "never feasible"), x0 + 3 * (bw + 30) + 10, mid + 14, "#aab6cc", "left", "13px");
  T(c, `K = e^(−ΔG/RT) = ${K.sig(Math.exp(-g0 * 1000 / (8.314 * P.T)), 3)}`, x0 + 3 * (bw + 30) + 10, mid + 38, "#aab6cc", "left", "13px");
}
// an energy-level diagram: each step is an arrow up (endothermic, red) or down (exothermic, blue) from the last level
function drawBH(c, w, h) {
  if (P.cyc === "hess") { const H = HESS[P.hess], f = hessF(P.hess), nO2 = H.C + H.H / 4 - H.O / 2, el = `${H.C}C(s) + ${H.H / 2}H₂(g)${H.O ? ` + ${H.O === 1 ? "½" : H.O / 2}O₂(g)` : ""}`, show = Math.min(3, Math.floor(bhT)) ;
    T(c, `Hess's law: the enthalpy of formation of ${H.n}`, 40, 40, "#eef2f8", "left", "600 15px");
    const A = [w * 0.2, 140], B = [w * 0.68, 140], C2 = [w * 0.44, h - 90];
    T(c, el, A[0], A[1], "#eef2f8", "center", "600 14px"); T(c, H.f + (H.O ? "(l)" : "(g)"), B[0], B[1], "#eef2f8", "center", "600 14px"); T(c, `${H.C}CO₂(g) + ${H.H / 2}H₂O(l)`, C2[0], C2[1], "#eef2f8", "center", "600 14px"); T(c, `+ ${K.sig(nO2, 3)} O₂`, C2[0], C2[1] + 18, "#8fa0bf", "center", "11.5px");
    const arr = (p, q, col, lab, on) => { if (!on) return; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.5; const x1 = p[0], y1 = p[1] + 12, x2 = q[0], y2 = q[1] - 22; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 11 * Math.cos(a - .4), y2 - 11 * Math.sin(a - .4)); c.lineTo(x2 - 11 * Math.cos(a + .4), y2 - 11 * Math.sin(a + .4)); c.fill(); c.lineWidth = 1; T(c, lab, (x1 + x2) / 2 + (x2 < x1 ? 14 : -14), (y1 + y2) / 2, col, x2 < x1 ? "left" : "right", "600 12.5px"); };
    arr(A, C2, "#6fb1ff", `ΔcH(elements) = ${H.C}(−394) + ${H.H / 2}(−286) = ${H.C * -394 + H.H / 2 * -286}`, show >= 1); arr(B, C2, "#6fb1ff", `ΔcH(${H.n}) = ${H.dc}`, show >= 2);
    if (show >= 3) { c.strokeStyle = "#ffd166"; c.fillStyle = "#ffd166"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(A[0] + 110, A[1] - 5); c.lineTo(B[0] - 50, B[1] - 5); c.stroke(); c.beginPath(); c.moveTo(B[0] - 50, B[1] - 5); c.lineTo(B[0] - 61, B[1] - 10); c.lineTo(B[0] - 61, B[1]); c.fill(); c.lineWidth = 1; T(c, `ΔfH = ?`, (A[0] + B[0]) / 2 + 30, A[1] - 16, "#ffd166", "center", "600 13px"); }
    if (show >= 3) { T(c, `ΔfH = ΔcH(elements) − ΔcH(${H.n})`, 40, h - 40, "#ffd166", "left", "600 13px"); T(c, `= ${H.C * -394 + H.H / 2 * -286} − (${H.dc}) = ${f} kJ/mol   (data book ${H.book})`, 40, h - 20, "#ffd166", "left", "13px"); }
    return; }
  const st = bhSteps(P.bh), B = BH[P.bh], n = Math.min(st.length + 1, Math.floor(bhT)); let lv = [0]; st.forEach(q => lv.push(lv[lv.length - 1] + q[1]));
  const hi = Math.max(...lv), lo = Math.min(...lv, B.f), top = 50, bot = h - 40, Y = e => top + (hi - e) / (hi - lo) * (bot - top), x0 = 60, dx = Math.min(70, (w * 0.6) / (st.length + 1));
  T(c, `Born–Haber cycle for ${B.st[1]}`, 20, 26, "#eef2f8", "left", "600 15px");
  const lvl = (e, x, lab, col = "#cfd8ea") => { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 30, Y(e)); c.lineTo(x + 30, Y(e)); c.stroke(); c.lineWidth = 1; T(c, lab, x + 36, Y(e) + 4, "#aab6cc", "left", "11.5px"); };
  lvl(0, x0, B.st[0]); for (let i = 0; i < Math.min(n, st.length); i++) { const x = x0 + (i + 1) * dx, e0 = lv[i], e1 = lv[i + 1], up = e1 > e0, col = up ? "#ff8a70" : "#6fb1ff", last = i === st.length - 1;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = last ? 3 : 2; c.beginPath(); c.moveTo(x, Y(e0)); c.lineTo(x, Y(e1)); c.stroke(); c.beginPath(); c.moveTo(x, Y(e1)); c.lineTo(x - 6, Y(e1) + (up ? 10 : -10)); c.lineTo(x + 6, Y(e1) + (up ? 10 : -10)); c.fill(); c.lineWidth = 1;
    c.strokeStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.moveTo(x - dx, Y(e0)); c.lineTo(x, Y(e0)); c.stroke(); T(c, (st[i][1] > 0 ? "+" : "") + st[i][1].toFixed(0), x + 5, (Y(e0) + Y(e1)) / 2, col, "left", last ? "600 13px" : "600 11.5px"); }
  if (n >= st.length) { const xf = x0 + (st.length + 1) * dx; c.strokeStyle = "#ffd166"; c.fillStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 20, Y(0)); c.lineTo(xf, Y(0)); c.lineTo(xf, Y(B.f)); c.stroke(); c.beginPath(); c.moveTo(xf, Y(B.f)); c.lineTo(xf - 6, Y(B.f) - 10); c.lineTo(xf + 6, Y(B.f) - 10); c.fill(); c.lineWidth = 1; T(c, `ΔfH = ${B.f}`, xf + 8, (Y(0) + Y(B.f)) / 2, "#ffd166", "left", "600 12px"); T(c, B.st[1], xf - 40, Y(B.f) + 18, "#eef2f8", "left", "600 12px"); }
  let y = 70; const tx = w * 0.66; st.forEach((q, i) => { if (i < n) { y = (() => { T(c, `${q[0]}`, tx, y, i === st.length - 1 ? "#ffd166" : "#cfd8ea", "left", "11.5px"); T(c, `${q[1] > 0 ? "+" : ""}${q[1].toFixed(0)} kJ/mol`, tx, y + 14, q[1] > 0 ? "#ff8a70" : "#6fb1ff", "left", "600 11.5px"); return y + 34; })(); } });
  if (n >= st.length) { T(c, `Lattice energy = ΔfH − (sum of the other steps)`, tx, y + 6, "#eef2f8", "left", "600 12px"); T(c, `= ${B.f} − (${(B.f - latticeE(P.bh)).toFixed(0)}) = ${latticeE(P.bh).toFixed(0)} kJ/mol`, tx, y + 22, "#ffd166", "left", "600 12px"); T(c, `ionic model: ${B.theory} kJ/mol (${(100 * (latticeE(P.bh) / B.theory - 1)).toFixed(0)}% different)`, tx, y + 40, "#aab6cc", "left", "11.5px"); }
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h); ({ profile: drawProfile, cup: drawCup, fuel: drawFuel, dg: drawDG, bh: drawBH })[P.mode](c, w, h); }
let dragging = false;
K.pointer(cv.el, { down(p) { if (P.mode === "profile" && geoP && p.x > geoP.x0 && p.x < geoP.x1 + 20) { dragging = true; auto = false; ctl.auto.set(false); prog = K.clamp((p.x - geoP.x0) / (geoP.x1 - geoP.x0), 0, 1); } }, drag(p) { if (dragging) prog = K.clamp((p.x - geoP.x0) / (geoP.x1 - geoP.x0), 0, 1); }, up() { dragging = false; } });

// ---------------- The loop ----------------
let frame = 0, lastCupDone = null, lastFuelDone = null;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.mode === "profile" && auto) { prog += dt * speed * 0.18; if (prog > 1.25) prog = 0; }
  if (P.mode === "cup") cupT = Math.min(cup.trace.length * 0.05, cupT + dt * speed * 1.2);
  if (P.mode === "fuel") fuelT = Math.min(1, fuelT + dt * speed / 12);
  if (P.mode === "bh") bhT = Math.min(20, bhT + dt * speed * 0.8);
}, () => {
  draw(); if (frame++ % 5) return; const pr = Math.min(1, prog);
  if (P.mode === "profile") {
    const R = RX[P.rx], br = bondsIn(R.r), mk = bondsIn(R.p), bb = sumBonds(br), mm = sumBonds(mk);
    chA.opts.xLabel = ""; chA.opts.yLabel = "kJ"; chB.opts.xLabel = "bond"; chB.opts.yLabel = "kJ/mol";
    const keys = [...new Set(Object.keys(br).concat(Object.keys(mk)))];
    chA.opts.xFmt = whole(v => keys[Math.round(v)] || ""); chA.draw([{ pts: keys.map((k, i) => [i - 0.17, (br[k] || 0) * BE[k]]), type: "bars", w: 0.3, color: "#ff8a70", label: "broken (energy in)" }, { pts: keys.map((k, i) => [i + 0.17, (mk[k] || 0) * BE[k]]), type: "bars", w: 0.3, color: "#7fe3a0", label: "made (energy out)" }], { xMin: -0.6, xMax: keys.length - 0.4, yMin: 0 });
    const all = Object.keys(BE); chB.opts.xFmt = whole(v => all[Math.round(v)] || ""); chB.draw([{ pts: all.map((k, i) => [i, BE[k]]), type: "bars", w: 0.7, color: "#6fb1ff", label: "bond energy" }], { xMin: -0.6, xMax: all.length - 0.4, yMin: 0 });
    read.set("a", bb + " kJ"); read.set("b", mm + " kJ"); read.set("c", (bb - mm > 0 ? "+" : "") + (bb - mm) + " kJ/mol"); read.set("d", (R.data > 0 ? "+" : "") + R.data + " kJ/mol");
    ui.hud(pr < 0.35 ? "Reactants: collisions supply the activation energy…" : pr < 0.65 ? "<b>Bonds breaking</b>: energy taken in" : "<b>New bonds forming</b>: energy given out");
  } else if (P.mode === "cup") {
    const q = cup, R = CUP[P.cup], k = Math.min(q.trace.length - 1, Math.floor(cupT / 0.05)), tnow = q.trace[k][0], done = k >= q.trace.length - 1;
    chA.opts.xFmt = null; chB.opts.xFmt = null; chA.opts.xLabel = "time (min)"; chA.opts.yLabel = "temperature (°C)"; chB.opts.xLabel = "run"; chB.opts.yLabel = "ΔH (kJ/mol)";
    if (done && lastCupDone !== q) { lastCupDone = q; cupRuns.push([cupRuns.length + 1, q.dHmax, P.cup]); if (cupRuns.length > 30) cupRuns.shift(); }
    const s = [{ pts: q.rd.filter(r => r[0] <= tnow), type: "dots", color: "#ff8a70", r: 3.5, label: "readings" }];
    if (done) s.push({ pts: [[3, q.fit.m * 3 + q.fit.c], [15, q.fit.m * 15 + q.fit.c]], color: "#ffd166", dash: [5, 4], label: "extrapolated cooling line" });
    chA.draw(s, { xMin: 0, xMax: 15, vlines: [{ x: 3, color: "#7d8aa5", label: "mixed" }] });
    const mine = cupRuns.filter(r => r[2] === P.cup); chB.draw([{ pts: mine.map((r, i) => [i + 1, r[1]]), type: "dots", color: "#ffd166", r: 5, label: "your results" }], { xMin: 0, xMax: Math.max(5, mine.length + 1), hlines: [{ y: R.dH, color: "#7fe3a0", label: "data book " + R.dH }] });
    cupNote.textContent = R.what + ".";
    read.set("a", done ? (q.dTmax > 0 ? "+" : "") + q.dTmax.toFixed(1) + " °C" : "…"); read.set("b", done ? (R.m * 4.18 * Math.abs(q.dTmax)).toFixed(0) + " J" : "…"); read.set("c", done ? q.dHmax.toFixed(1) + " kJ/mol" : "…"); read.set("d", done ? q.dHext.toFixed(1) + " kJ/mol" : "…");
    ui.hud(`${CONT[P.cont].name}${P.stir ? ", stirred" : ", not stirred"}<br>${R.dH < 0 ? "exothermic: the liquid warms up" : "endothermic: the liquid cools down"}`);
  } else if (P.mode === "fuel") {
    const f = fuel, frac = fuelT, A = ALC[P.alc];
    chA.opts.xFmt = null; chB.opts.xFmt = null; chA.opts.xLabel = "share of the heating done"; chA.opts.yLabel = "°C or g"; chB.opts.xLabel = "carbon atoms"; chB.opts.yLabel = "ΔHc (kJ/mol)";
    if (frac >= 1 && lastFuelDone !== f) { lastFuelDone = f; fuelRuns.push([P.alc, f.dHc]); }
    const pts = []; for (let u = 0; u <= frac; u += 0.02) pts.push(u); chA.draw([{ pts: pts.map(u => [u, 20 + 20 * u]), color: "#ff8a70", label: "water (°C)" }, { pts: pts.map(u => [u, f.mass * u]), color: "#7fe3a0", label: "alcohol burned (g, ×10)" }].map((s, i) => i ? Object.assign(s, { pts: s.pts.map(q => [q[0], q[1] * 10]) }) : s), { xMin: 0, xMax: 1, yMin: 0 });
    chB.draw([{ pts: ALC.slice(1).map((a, i) => [i + 1, a.dHc]), color: "#7d8aa5", dash: [5, 4], label: "data book" }, { pts: fuelRuns, type: "dots", color: "#ffd166", r: 5, label: "your results" }], { xMin: 0.5, xMax: 5.5 });
    read.set("a", (20 + 20 * frac).toFixed(1) + " °C"); read.set("b", (f.mass * frac).toFixed(2) + " g"); read.set("c", frac >= 1 ? f.perG.toFixed(1) + " kJ/g" : "…"); read.set("d", frac >= 1 ? f.dHc.toFixed(0) + " kJ/mol" : "…");
    ui.hud(`${A.name}: data book ${A.dHc} kJ/mol<br>${P.screen ? "draught screen up" : "<b>no draught screen</b>"}`);
  } else if (P.mode === "bh") {
    chA.opts.xFmt = null; chB.opts.xFmt = null;
    if (P.cyc === "bh") { const st = bhSteps(P.bh); chA.opts.title = "The steps of the cycle"; chB.opts.title = "Born–Haber against the ionic model"; chA.opts.xLabel = "step"; chA.opts.yLabel = "ΔH (kJ/mol)"; chA.opts.xFmt = whole(v => String(v)); chA.draw([{ pts: st.map((q, i) => [i + 1, q[1]]).filter(p => p[1] > 0), type: "bars", w: 0.6, color: "#ff8a70", label: "endothermic" }, { pts: st.map((q, i) => [i + 1, q[1]]).filter(p => p[1] <= 0), type: "bars", w: 0.6, color: "#6fb1ff", label: "exothermic" }], { xMin: 0.4, xMax: st.length + 0.6 });
      const ks = Object.keys(BH); chB.opts.xLabel = "compound"; chB.opts.yLabel = "lattice energy (kJ/mol)"; chB.opts.xFmt = whole(v => (ks[v - 1] || "").replace("2", "₂")); chB.draw([{ pts: ks.map((k, i) => [i + 1, BH[k].theory]), type: "dots", r: 5, color: "#8fa0bf", label: "ionic model" }, { pts: ks.map((k, i) => [i + 1, latticeE(k)]), type: "dots", r: 5, color: "#ffd166", label: "Born–Haber" }], { xMin: 0.5, xMax: ks.length + 0.5 });
      relabel(["ΔfH", "sum of the other steps", "lattice energy (Hess)", "ionic model"]); const B = BH[P.bh]; read.set("a", B.f + " kJ/mol"); read.set("b", (B.f - latticeE(P.bh)).toFixed(0) + " kJ/mol"); read.set("c", latticeE(P.bh).toFixed(0) + " kJ/mol"); read.set("d", B.theory + " kJ/mol");
      ui.hud("ΔfH = atomisation + ionisation + atomisation + electron affinity + <b>lattice energy</b>"); }
    else { const ks = Object.keys(HESS); chA.opts.title = "ΔfH from Hess cycles"; chA.opts.xLabel = "compound"; chA.opts.yLabel = "ΔfH (kJ/mol)"; chA.opts.xFmt = whole(v => (HESS[ks[v - 1]] || { n: "" }).n); chA.draw([{ pts: ks.map((k, i) => [i + 1, hessF(k)]), type: "bars", w: 0.5, color: "#ffd166", label: "from the Hess cycle" }, { pts: ks.map((k, i) => [i + 1, HESS[k].book]), type: "dots", r: 5, color: "#7fe3a0", label: "data book" }], { xMin: 0.4, xMax: ks.length + 0.6 });
      chB.opts.title = "Combustion enthalpies used"; chB.opts.xLabel = ""; chB.opts.yLabel = "ΔcH (kJ/mol)"; chB.opts.xFmt = whole(v => ["", "C", "H₂", HESS[P.hess].f][v] || ""); chB.draw([{ pts: [[1, -394], [2, -286], [3, HESS[P.hess].dc]], type: "bars", w: 0.5, color: "#6fb1ff", label: "" }], { xMin: 0.4, xMax: 3.6 });
      relabel(["Σ ΔcH(elements)", "ΔcH(compound)", "ΔfH (Hess)", "data book"]); const H = HESS[P.hess]; read.set("a", (H.C * -394 + H.H / 2 * -286) + " kJ/mol"); read.set("b", H.dc + " kJ/mol"); read.set("c", hessF(P.hess) + " kJ/mol"); read.set("d", H.book + " kJ/mol"); ui.hud("The enthalpy change is the same by either route"); }
  } else {
    const D = DG[P.dg], pts = []; for (let T2 = 100; T2 <= 2500; T2 += 20) pts.push([T2, dG(P.dg, T2)]);
    chA.opts.xFmt = null; chB.opts.xFmt = null; chA.opts.xLabel = "temperature (K)"; chA.opts.yLabel = "ΔG (kJ/mol)"; chB.opts.xLabel = "temperature (K)"; chB.opts.yLabel = "kJ/mol";
    chA.draw([{ pts, color: "#7fe3a0", label: "ΔG" }, { pts: [[P.T, dG(P.dg, P.T)]], type: "dots", color: "#fff", r: 5 }], { xMin: 100, xMax: 2500, hlines: [{ y: 0, color: "#ffd166", label: "ΔG = 0" }] });
    chB.draw([{ pts: pts.map(q => [q[0], D.dH]), color: "#ff8a70", label: "ΔH" }, { pts: pts.map(q => [q[0], -q[0] * D.dS / 1000]), color: "#6fb1ff", label: "−TΔS" }], { xMin: 100, xMax: 2500, vlines: [{ x: P.T, color: "#7d8aa5" }] });
    const Tf = D.dH / (D.dS / 1000); read.set("a", (D.dH > 0 ? "+" : "") + D.dH + " kJ/mol"); read.set("b", (P.T * D.dS / 1000).toFixed(1) + " kJ/mol"); read.set("c", dG(P.dg, P.T).toFixed(1) + " kJ/mol"); read.set("d", Tf > 0 ? Tf.toFixed(0) + " K" : "—");
    ui.hud(`ΔG = ΔH − TΔS = <b>${dG(P.dg, P.T).toFixed(1)}</b> kJ/mol`);
  }
  ctl.mode.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none"; ctl.mode.el.querySelectorAll("button")[4].style.display = ui.level === "adv" ? "" : "none"; if (ui.level !== "adv" && (P.mode === "dg" || P.mode === "bh")) set({ mode: "profile" });
  ctl.bh.el.style.display = P.cyc === "bh" ? "" : "none"; ctl.hess.el.style.display = P.cyc === "hess" ? "" : "none";
});
set({});
ui.tip("Watch the bonds break and form as the ball rolls over the hump · drag the ball yourself, or switch set-ups at the top of the controls", 8000);
