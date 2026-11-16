/* =====================================================================
   REACTIVITY AND EXTRACTING METALS
   Metals differ in how easily their atoms lose electrons to form
   positive ions. The more easily, the more reactive the metal:
       K > Na > Li > Ca > Mg > Al > (C) > Zn > Fe > (H) > Cu > Ag > Au
   This one order (the reactivity series) explains:
     * how fast metals react with water and acids (giving hydrogen)
     * displacement: a more reactive metal pushes a less reactive one
       out of its compound (and the mixture warms up)
     * extraction: metals below carbon can be reduced with carbon;
       metals above carbon need electrolysis; the least reactive are
       found as the metal itself.
   A level: these are redox reactions; the metal is oxidised (loses
   electrons), and the ion or hydrogen is reduced (gains them).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// rate scores (relative), relative atomic mass, charge of the ion, standard electrode potential (V), how it is extracted, year first isolated (negative = BC), % of the Earth's crust
const MET = {
  K: { name: "potassium", Ar: 39.1, z: 1, rate: 100, water: true, E: -2.93, ext: "electrolysis", year: 1807, crust: 2.1, col: "#c9c9d6" },
  Na: { name: "sodium", Ar: 23.0, z: 1, rate: 60, water: true, E: -2.71, ext: "electrolysis", year: 1807, crust: 2.4, col: "#d6d6e0" },
  Li: { name: "lithium", Ar: 6.9, z: 1, rate: 30, water: true, E: -3.04, ext: "electrolysis", year: 1821, crust: 0.002, col: "#d0d0dc" },
  Ca: { name: "calcium", Ar: 40.1, z: 2, rate: 15, water: true, E: -2.87, ext: "electrolysis", year: 1808, crust: 4.1, col: "#e0e0e6" },
  Mg: { name: "magnesium", Ar: 24.3, z: 2, rate: 6, water: false, E: -2.37, ext: "electrolysis", year: 1808, crust: 2.3, col: "#dcdcdc" },
  Al: { name: "aluminium", Ar: 27.0, z: 3, rate: 3.5, water: false, E: -1.66, ext: "electrolysis", year: 1825, crust: 8.2, lag: 90, col: "#cfd6de" },
  Zn: { name: "zinc", Ar: 65.4, z: 2, rate: 1.2, water: false, E: -0.76, ext: "carbon", year: 1746, crust: 0.007, col: "#b8c2cc" },
  Fe: { name: "iron", Ar: 55.8, z: 2, rate: 0.35, water: false, E: -0.44, ext: "carbon", year: -1200, crust: 5.6, col: "#8a8f99" },
  Cu: { name: "copper", Ar: 63.5, z: 2, rate: 0, water: false, E: 0.34, ext: "carbon", year: -9000, crust: 0.006, col: "#d9895a" },
  Ag: { name: "silver", Ar: 107.9, z: 1, rate: 0, water: false, E: 0.80, ext: "native", year: -5000, crust: 0.00001, col: "#e6e8ee" },
  Au: { name: "gold", Ar: 197.0, z: 3, rate: 0, water: false, E: 1.50, ext: "native", year: -6000, crust: 0.0000004, col: "#f0c94a" }
};
const ORDER = Object.keys(MET);
/* hydrogen from a metal with acid (or water). o = { metal, reagent: "acid" | "water" | "steam", mass (g), conc (mol/dm³), form: "ribbon" | "powder" }
   volume (cm³) at time t (s): Vmax (1 − e^(−kt)), Vmax from the moles of metal (24 000 cm³ per mole of gas) */
function gasVolume(o, t) {
  const M = MET[o.metal], moles = o.mass / M.Ar, vmax = moles * M.z / 2 * 24000;
  let k = M.rate * 0.01 * (o.form === "powder" ? 3 : 1);
  if (o.reagent === "acid") k *= o.conc; else if (o.reagent === "water") k = M.water ? k * 0.5 : (o.metal === "Mg" ? 0.0004 : 0); else k = ["Mg", "Al", "Zn", "Fe"].includes(o.metal) ? 0.02 * (M.rate + 0.5) : M.water ? k : 0;
  const tt = Math.max(0, t - (M.lag && o.reagent === "acid" ? M.lag : 0));                   // aluminium's oxide layer has to be removed first
  return vmax * (1 - Math.exp(-k * tt));
}
const dangerous = o => ["K", "Na", "Li"].includes(o.metal) && o.reagent !== "water";
// displacement: excess metal powder into 25 cm³ of a 0.5 mol/dm³ salt solution; the heat released is about zFΔE per mole (a simplification)
const SALT = { Mg: "magnesium sulfate", Zn: "zinc sulfate", Fe: "iron(II) sulfate", Cu: "copper(II) sulfate", Ag: "silver nitrate" };
const DISP = ["Mg", "Zn", "Fe", "Cu", "Ag"];
function dispRise(metal, ion, conc = 0.5) { const dE = MET[ion].E - MET[metal].E; if (dE <= 0) return 0; const n = 0.025 * conc * (ion === "Ag" ? 1 : 1), z = ion === "Ag" ? 1 : 2; return 0.8 * n * z * 96485 * dE / (25 * 4.18); }   // °C, 80% of the heat stays in the solution

// ---------------- The page ----------------
const P = { mode: "acid", metal: "Mg", reagent: "acid", mass: 0.1, conc: 1, form: "ribbon", dm: "Zn", di: "Cu", ext: "Fe" };
let rnd = K.rng(Date.now() % 99991 + 71), t = 0, speed = 1, kept = [], bubbles = [], tried = [], dt0 = 0;
const ui = K.app({
  title: "Reactivity and Extracting Metals", subject: "Chemistry",
  blurb: "The reactivity series: water and acids, displacement, and how metals are extracted",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 2(d) reactivity series (reactions with water and dilute acids, displacement reactions, oxidation and reduction as loss and gain of oxygen and electrons) and 2(e) extraction and uses of metals (electrolysis, reduction with carbon, the blast furnace).", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 3 Redox I: oxidation numbers, oxidising and reducing agents, half-equations; applied to displacement and extraction. Electrode potentials are used here as a measure of reactivity (Topic 14, beyond Topic 3)." } },
  missions: [
    { title: "Metals and acid", q: "Drop 0.1 g of magnesium, zinc, iron and copper into dilute hydrochloric acid, keeping each gas curve. Put them in order of reactivity. What is the gas?", hint: "Magnesium fizzes fast, zinc steadily, iron slowly and copper not at all: Mg > Zn > Fe > Cu. The gas is hydrogen (it pops with a lighted splint): metal + acid → salt + hydrogen. Metals below hydrogen in the series do not react with dilute acids.", setup() { set({ metal: "Mg" }); run(); keepNow(); P.metal = "Zn"; run(); keepNow(); P.metal = "Fe"; run(); keepNow(); P.metal = "Cu"; ctl.metal.set("Cu"); run(); } },
    { title: "Metals and water", q: "Try potassium, sodium, calcium and magnesium in cold water. Which react, and how vigorously?", hint: "Potassium reacts violently (the hydrogen catches fire with a lilac flame), sodium fizzes and melts into a ball, calcium fizzes steadily, magnesium barely reacts with cold water but burns in steam. metal + water → metal hydroxide + hydrogen.", setup() { set({ metal: "K", reagent: "water" }); } },
    { title: "Aluminium's head start", q: "Put aluminium into acid. Why does almost nothing happen at first, though aluminium is above zinc in the series?", hint: "Aluminium is covered in a thin, tough layer of aluminium oxide that protects it. The acid takes a while to remove it; then the aluminium reacts quickly. The same layer is why aluminium is used for window frames and drinks cans: it does not corrode.", setup() { set({ metal: "Al" }); } },
    { title: "How much hydrogen?", q: "Double the mass of magnesium. How much more gas? Does making it powder change the final volume or just the rate?", hint: "Twice the magnesium makes twice the hydrogen (with excess acid): Mg + 2HCl → MgCl₂ + H₂, one mole of gas (24 dm³) per mole of Mg (24.3 g), so 0.1 g gives about 99 cm³. Powder has more surface area, so it reacts faster, but makes the same total amount.", setup() { set({ metal: "Mg", mass: 0.05 }); } },
    { title: "Displacement", q: "Add zinc powder to copper(II) sulfate solution. What do you see? Now try copper in zinc sulfate. Fill in the table.", hint: "Zinc is more reactive than copper, so it displaces it: zinc + copper sulfate → zinc sulfate + copper. The blue colour fades, brown copper appears, and the solution warms up. Copper cannot displace zinc: no reaction. The more reactive metal ends up as the ion.", setup() { set({ mode: "disp", dm: "Zn", di: "Cu" }); } },
    { title: "Further apart, hotter", q: "Try magnesium, zinc and iron each with copper(II) sulfate. Which gives the biggest temperature rise? Why?", hint: "The further apart two metals are in the series, the more energy is released when one displaces the other: magnesium + copper sulfate gets hottest. That is the basis of cells and batteries: the voltage depends on how far apart the two metals are.", setup() { set({ mode: "disp", dm: "Mg", di: "Cu" }); } },
    { title: "Extracting iron", q: "Look at how iron is extracted in the blast furnace. Why can carbon be used for iron but not for aluminium?", hint: "Carbon is more reactive than iron, so it can take the oxygen from iron oxide (reduction): Fe₂O₃ + 3CO → 2Fe + 3CO₂. Aluminium is more reactive than carbon, so carbon cannot reduce aluminium oxide: it must be extracted by electrolysis, which uses a lot of electricity.", setup() { set({ mode: "ext", ext: "Fe" }); } },
    { lvl: "adv", title: "Oxidised or reduced?", q: "In zinc + copper(II) sulfate, write the half-equations. Which species is oxidised and which reduced? What is the oxidising agent?", hint: "Zn → Zn²⁺ + 2e⁻ (zinc is oxidised: its oxidation number rises from 0 to +2). Cu²⁺ + 2e⁻ → Cu (copper ions are reduced: +2 to 0). Cu²⁺ is the oxidising agent; zinc is the reducing agent. Sulfate ions are spectators.", setup() { set({ mode: "disp", dm: "Zn", di: "Cu" }); } }
  ],
  batch: [
    { title: "Reactivity and rate", question: "How fast do different metals give hydrogen with 1 mol/dm³ hydrochloric acid?", how: "0.1 g ribbon of each metal: 1 Mg, 2 Al, 3 Zn, 4 Fe, 5 Cu. Gas collected in the first 30 seconds (±3 cm³ reading).", xLabel: "metal (1 Mg, 2 Al, 3 Zn, 4 Fe, 5 Cu)", yLabel: "hydrogen in 30 s (cm³)", xs: [1, 2, 3, 4, 5], reps: 4, yMin: 0, run: (x, r) => Math.max(0, gasVolume({ metal: ["Mg", "Al", "Zn", "Fe", "Cu"][x - 1], reagent: "acid", mass: 0.1, conc: 1, form: "ribbon" }, 30) + 3 * r.gauss()), note: "The order of rates follows the reactivity series, except aluminium, which has not started yet: its oxide layer must be removed first. Copper gives none: it is below hydrogen." },
    { title: "Mass of magnesium and volume of hydrogen", question: "How much hydrogen does each mass of magnesium give, with acid in excess?", how: "0.02 to 0.12 g of magnesium ribbon (balance ±0.002 g), reaction allowed to finish. Theory: volume = mass ÷ 24.3 × 24 000 cm³.", xLabel: "mass of magnesium (g)", yLabel: "hydrogen (cm³)", xs: [0.02, 0.04, 0.06, 0.08, 0.1, 0.12], reps: 4, yMin: 0, fit: true, theory: m => m / 24.3 * 24000, theoryLabel: "from the equation", run: (x, r) => gasVolume({ metal: "Mg", reagent: "acid", mass: x + 0.002 * r.gauss(), conc: 1, form: "ribbon" }, 3000) + 1.5 * r.gauss(), note: "A straight line through the origin: the volume of gas is proportional to the moles of metal (Mg : H₂ = 1 : 1)." },
    { title: "Acid concentration and rate", question: "How does the starting rate of magnesium with acid depend on the acid's concentration?", how: "0.1 g magnesium ribbon; acid 0.25 to 2 mol/dm³; gas in the first 20 s (±2 cm³).", xLabel: "acid concentration (mol/dm³)", yLabel: "hydrogen in 20 s (cm³)", xs: [0.25, 0.5, 0.75, 1, 1.5, 2], reps: 4, yMin: 0, run: (x, r) => Math.max(0, gasVolume({ metal: "Mg", reagent: "acid", mass: 0.1, conc: x, form: "ribbon" }, 20) + 2 * r.gauss()), note: "More concentrated acid, more frequent collisions, faster reaction. (Collision theory has its own simulation.)" },
    { title: "Displacement and distance apart in the series", question: "How does the temperature rise in a displacement reaction depend on how far apart the metals are?", how: "Excess metal powder in 25 cm³ of 0.5 mol/dm³ salt solution; every pair that reacts; thermometer ±0.5 °C. x = difference in electrode potential (A level measure of distance apart in the series). Theory: ΔT ∝ difference.", xLabel: "difference in electrode potential (V)", yLabel: "temperature rise (°C)", xs: [0.32, 0.78, 1.1, 1.24, 1.56, 1.93, 2.71], reps: 3, yMin: 0, fit: true, theory: d => 0.8 * 0.025 * 0.5 * 2 * 96485 * d / (25 * 4.18), theoryLabel: "∝ difference", run: (x, r) => { const pairs = { 0.32: ["Zn", "Fe"], 0.78: ["Fe", "Cu"], 1.1: ["Zn", "Cu"], 1.24: ["Fe", "Ag"], 1.56: ["Zn", "Ag"], 1.93: ["Mg", "Fe"], 2.71: ["Mg", "Cu"] }[x]; return dispRise(pairs[0], pairs[1]) * (pairs[1] === "Ag" ? 1 : 1) + 0.5 * r.gauss(); }, note: "The further apart in the series, the more energy released. (Silver pairs sit a little below the line here: Ag⁺ carries one charge, so each mole gives half the electrons.)" }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 2.20", text: "Reactivity series: K, Na, Li, Ca, Mg, Al, (C), Zn, Fe, (H), Cu, Ag, Au. More reactive metals lose electrons more easily." },
      { lvl: "std", tag: "4CH1 2.21", text: "metal + water → metal hydroxide + hydrogen (very reactive metals); metal + steam → metal oxide + hydrogen; metal + acid → salt + hydrogen (metals above hydrogen)." },
      { lvl: "std", tag: "4CH1 2.22", text: "Displacement: a more reactive metal displaces a less reactive metal from a solution of its salt. Observations: colour change, metal deposited, temperature rise." },
      { lvl: "std", tag: "4CH1 2.23", text: "Oxidation is gain of oxygen or loss of electrons; reduction is loss of oxygen or gain of electrons (OIL RIG). Displacement reactions are redox reactions." },
      { lvl: "std", tag: "4CH1 2.28", text: "Extraction depends on reactivity: below carbon, reduce the oxide with carbon (iron in the blast furnace); above carbon, electrolysis (aluminium from molten aluminium oxide in cryolite); unreactive metals are found native." },
      { lvl: "adv", tag: "9CH0 3", text: "Oxidation number rises on oxidation, falls on reduction. Zn + Cu²⁺ → Zn²⁺ + Cu: Zn 0 → +2 (oxidised, reducing agent), Cu +2 → 0 (reduced; Cu²⁺ is the oxidising agent)." },
      { lvl: "adv", tag: "9CH0 3", text: "Half-equations show electrons: Mg → Mg²⁺ + 2e⁻; 2H⁺ + 2e⁻ → H₂. Combine them so the electrons cancel." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Write the word equation for the reaction of magnesium with hydrochloric acid, and give a test for the gas.", ans: "<ul><li>magnesium + hydrochloric acid → magnesium chloride + hydrogen</li><li>lighted splint gives a squeaky pop</li></ul>" },
      { lvl: "std", marks: 3, q: "Zinc is added to copper(II) sulfate solution. Describe what you would see and explain the reaction.", ans: "<ul><li>blue colour fades; pink-brown copper forms; temperature rises</li><li>zinc is more reactive than copper</li><li>so it displaces copper from its compound</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why aluminium cannot be extracted by heating its oxide with carbon.", ans: "<ul><li>aluminium is more reactive than carbon</li><li>so carbon cannot remove the oxygen from (reduce) aluminium oxide; electrolysis is needed</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Calculate the volume of hydrogen (at room temperature and pressure) made when ${P.mass} g of magnesium reacts with excess acid (Ar Mg = 24.3; 1 mol of gas = 24 dm³).`, ans: () => `<ul><li>moles of Mg = ${P.mass} ÷ 24.3 = ${(P.mass / 24.3).toFixed(5)}</li><li>Mg : H₂ = 1 : 1</li><li>volume = ${(P.mass / 24.3).toFixed(5)} × 24 000 = ${(P.mass / 24.3 * 24000).toFixed(0)} cm³</li></ul>` },
      { lvl: "adv", marks: 3, q: "For Mg + 2H⁺ → Mg²⁺ + H₂, write the two half-equations and state which species is reduced.", ans: "<ul><li>Mg → Mg²⁺ + 2e⁻ (oxidation)</li><li>2H⁺ + 2e⁻ → H₂ (reduction)</li><li>H⁺ is reduced; it is the oxidising agent</li></ul>" },
      { lvl: "adv", marks: 2, q: "In the blast furnace, Fe₂O₃ + 3CO → 2Fe + 3CO₂. Give the oxidation numbers of iron and carbon before and after.", ans: "<ul><li>iron: +3 → 0 (reduced)</li><li>carbon: +2 → +4 (oxidised)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Gas from metals</b>: the volume of hydrogen approaches the amount the equation gives (moles of metal × charge ÷ 2 × 24 000 cm³) as V_max(1 − e^(−kt)). The rate constant k follows each metal's place in the reactivity series (illustrative values), is 3 times larger for powder, and proportional to the acid's concentration. Aluminium's oxide layer delays its start by 90 s. Potassium, sodium and lithium with acid are not done (dangerously violent).</li>
<li><b>Displacement</b>: a metal displaces another if it is more reactive (has a more negative electrode potential). The temperature rise is taken as 80% of z F ΔE per mole of ions, into 25 g of solution: a simplification that gives the right size and the right order.</li>
<li><b>Extraction</b>: the method follows the metal's position relative to carbon; the dates and crustal abundances are approximate published values.</li></ul>
<h3>Simplifications</h3>
<ul><li>Rates are illustrative, chosen to give the right order and realistic times; real rates depend on purity, surface and temperature.</li>
<li>The heat released in displacement is not exactly zFΔE (that is the free energy); the pattern is the same.</li>
<li>The earlier version also had a step-by-step A level extraction box (titanium, tungsten, copper disproportionation); it is not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/reactivity-metals.html">original/reactivity-metals.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "acid", options: [["acid", "💧 Water and acid"], ["disp", "🔄 Displacement"], ["ext", "⛏ Extraction"]], on: v => set({ mode: v }) });
grp.acid = g = ui.group("Metal and reagent");
ctl.metal = K.seg(g, { value: "Mg", options: ORDER.map(k => [k, k]), on: v => { P.metal = v; run(); } });
ctl.reagent = K.seg(g, { label: "With", value: "acid", options: [["water", "cold water"], ["steam", "steam"], ["acid", "dilute HCl"]], on: v => { P.reagent = v; run(); } });
ctl.form = K.seg(g, { label: "Form", value: "ribbon", options: [["ribbon", "ribbon / granules"], ["powder", "powder"]], on: v => { P.form = v; run(); } });
ctl.mass = K.slider(g, { label: "Mass of metal", min: 0.02, max: 0.2, step: 0.01, value: 0.1, unit: "g", on: v => { P.mass = v; run(); } });
ctl.conc = K.slider(g, { label: "Acid concentration", min: 0.25, max: 2, step: 0.25, value: 1, unit: "mol/dm³", on: v => { P.conc = v; run(); } });
let r1 = K.row(g); K.btn(r1, "▶ Again", () => run(), "primary"); K.btn(r1, "Keep this curve", () => keepNow()); K.btn(r1, "Clear", () => kept = []);
grp.disp = g = ui.group("Displacement");
ctl.dm = K.seg(g, { label: "Metal powder", value: "Zn", options: DISP.map(k => [k, MET[k].name]), on: v => { P.dm = v; runDisp(); } });
ctl.di = K.seg(g, { label: "Into a solution of", value: "Cu", options: DISP.map(k => [k, SALT[k]]), on: v => { P.di = v; runDisp(); } });
grp.ext = g = ui.group("Extraction");
ctl.ext = K.seg(g, { value: "Fe", options: ORDER.map(k => [k, k]), on: v => P.ext = v });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 30, step: 1, value: 5, fmt: v => v + " s a second", on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function run() { t = 0; bubbles = []; for (const k of ["form"]) ctl[k].el.style.display = ""; ctl.conc.el.style.display = P.reagent === "acid" ? "" : "none"; }
function keepNow() { kept.push(Object.assign({}, P)); if (kept.length > 5) kept.shift(); }
function runDisp() { t = 0; dt0 = dispRise(P.dm, P.di); const key = P.dm + P.di; if (P.dm !== P.di && !tried.some(q => q.key === key)) tried.push({ key, m: P.dm, i: P.di, dT: dt0, dE: MET[P.di].E - MET[P.dm].E }); }
function set(o) {
  Object.assign(P, { metal: "Mg", reagent: "acid", mass: 0.1, conc: 1, form: "ribbon", dm: "Zn", di: "Cu", ext: "Fe" }, o);
  for (const k of ["mode", "metal", "reagent", "form", "dm", "di", "ext"]) ctl[k].set(P[k]); ctl.mass.set(P.mass); ctl.conc.set(P.conc);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none"; kept = []; run(); if (P.mode === "disp") runDisp(); speed = 5; ctl.speed.set(5);
  chA.opts.title = { acid: "Hydrogen collected", disp: "Temperature of the solution", ext: "When each metal was first isolated" }[P.mode]; chB.opts.title = { acid: "Hydrogen in the first minute, by metal", disp: "Results table: temperature rise for each pair tried", ext: "How common each metal is in the Earth's crust" }[P.mode];
  relabel({ acid: ["gas so far", "most it can make", "temperature rise", "observation"], disp: ["reaction?", "temperature rise", "oxidised", "reduced"], ext: ["metal", "method", "first isolated", "% of the crust"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function seriesStrip(c, w, hi) {   // the reactivity series across the top, coloured by extraction method
  const n = ORDER.length + 2, bw = (w - 300) / n, col = { electrolysis: "#6fb1ff", carbon: "#ff8a70", native: "#ffd166" }; let x = 20;
  const items = ["K", "Na", "Li", "Ca", "Mg", "Al", "(C)", "Zn", "Fe", "(H)", "Cu", "Ag", "Au"];
  for (const k of items) { const m = MET[k]; c.fillStyle = m ? col[m.ext] : "#3a4560"; c.globalAlpha = k === hi ? 1 : 0.55; c.fillRect(x + 2, 10, bw - 4, 28); c.globalAlpha = 1; T(c, k, x + bw / 2, 29, m ? "#0b1020" : "#eef2f8", "center", "600 13px"); x += bw; }
  T(c, "most reactive ←", 20, 52, "#aab6cc", "left", "11px"); T(c, "→ least reactive", 20 + n * bw, 52, "#aab6cc", "right", "11px");
  let lx = 140; for (const [k2, lab] of [["electrolysis", "electrolysis"], ["carbon", "reduced by carbon"], ["native", "found as the metal"]]) { c.fillStyle = col[k2]; c.fillRect(lx, 44, 10, 10); T(c, lab, lx + 14, 53, "#aab6cc", "left", "11px"); lx += c.measureText(lab).width + 34; }
}
function drawAcid(c, w, h) {
  seriesStrip(c, w, P.metal); const M = MET[P.metal], V = gasVolume(P, t), vmax = P.mass / M.Ar * M.z / 2 * 24000, danger = dangerous(P);
  const bx = w * 0.25, by = h - 60, bw = 120, bh = 160;
  c.fillStyle = P.reagent === "steam" ? "rgba(220,230,255,0.15)" : "rgba(120,180,255,0.25)"; c.fillRect(bx - bw / 2, by - bh * 0.7, bw, bh * 0.7); c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.strokeRect(bx - bw / 2, by - bh, bw, bh);
  if (danger) { T(c, "Not done: far too violent with acid", bx, by - bh - 20, "#ff5d6c", "center", "600 13px"); }
  else { const left = 1 - V / Math.max(1e-9, vmax); c.fillStyle = M.col; if (left > 0.01) c.fillRect(bx - 20 * left - 5, by - 14, 40 * left + 10, 10); for (const b of bubbles) { c.strokeStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.3); c.stroke(); } }
  // gas syringe
  const sx = w * 0.5, sy = 140, sw = Math.min(360, w * 0.42), frac = Math.min(1, V / 120); c.strokeStyle = "#c9d3e6"; c.strokeRect(sx, sy - 18, sw, 36); c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(sx, sy - 18, sw * frac, 36); c.fillStyle = "#56607a"; c.fillRect(sx + sw * frac, sy - 22, 8, 44); c.fillRect(sx + sw * frac + 8, sy - 3, 60, 6);
  for (let v = 0; v <= 120; v += 20) { c.fillStyle = "#7d8aa5"; c.fillRect(sx + sw * v / 120, sy + 18, 1, 6); T(c, v, sx + sw * v / 120, sy + 36, "#7d8aa5", "center", "10px"); } T(c, "gas syringe (cm³)", sx, sy - 28, "#aab6cc"); c.strokeStyle = "#7d8aa5"; c.beginPath(); c.moveTo(bx, by - bh); c.lineTo(bx, sy); c.lineTo(sx, sy); c.stroke();
  T(c, `${M.name} + ${P.reagent === "acid" ? `${P.conc} mol/dm³ hydrochloric acid` : P.reagent === "water" ? "cold water" : "steam"}`, sx, sy + 70, "#eef2f8", "left", "600 14px");
  T(c, `${(t).toFixed(0)} s`, sx, sy + 92, "#aab6cc"); T(c, danger ? "" : V > 0.5 ? `${V.toFixed(1)} cm³ of hydrogen` : "no gas", sx, sy + 114, "#ffd166", "left", "600 13px");
  T(c, P.reagent === "acid" ? `${M.name} + hydrochloric acid → ${M.name} chloride + hydrogen` : P.reagent === "water" ? `${M.name} + water → ${M.name} hydroxide + hydrogen` : `${M.name} + steam → ${M.name} oxide + hydrogen`, sx, sy + 136, "#aab6cc", "left", "12px");
}
function drawDisp(c, w, h) {
  seriesStrip(c, w, P.dm); const go = MET[P.dm].E < MET[P.di].E && P.dm !== P.di, f = go ? 1 - Math.exp(-t / 40) : 0, bx = w * 0.25, by = h - 50;
  const ionCol = { Cu: [80, 150, 255], Fe: [150, 210, 160], Zn: [230, 230, 240], Mg: [230, 230, 240], Ag: [230, 230, 240] }[P.di], c1 = ionCol, c2 = [230, 230, 240], mix = c1.map((v, i) => Math.round(v + (c2[i] - v) * f));
  c.fillStyle = `rgba(${mix.join(",")},0.45)`; c.fillRect(bx - 60, by - 140, 120, 140); c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.strokeRect(bx - 60, by - 160, 120, 160);
  c.fillStyle = MET[P.dm].col; for (let k = 0; k < 30; k++) c.fillRect(bx - 50 + (k * 37) % 100, by - 8 - (k % 3) * 3, 3, 3); if (go) { c.fillStyle = MET[P.di].col; for (let k = 0; k < 40 * f; k++) c.fillRect(bx - 50 + (k * 53) % 100, by - 14 - (k % 4) * 3, 4, 4); }
  c.fillStyle = "#c9d3e6"; c.fillRect(bx + 30, by - 200, 6, 190); T(c, (20 + dt0 * f).toFixed(1) + " °C", bx + 42, by - 180, "#ff8a70", "left", "600 14px");
  const x = w * 0.5; let y = 120; const L = (s, col = "#eef2f8", fnt = "13px") => { T(c, s, x, y, col, "left", fnt); y += 24; };
  L(`${MET[P.dm].name} + ${SALT[P.di]}`, "#eef2f8", "600 15px");
  if (P.dm === P.di) L("Same metal: nothing to swap.", "#aab6cc");
  else if (!go) { L("No reaction.", "#ff8a70", "600 14px"); L(`${MET[P.dm].name} is less reactive than ${MET[P.di].name}, so it cannot displace it.`, "#aab6cc"); }
  else { L(`Reaction: ${MET[P.dm].name} displaces ${MET[P.di].name}.`, "#7fe3a0", "600 14px"); L(`${MET[P.dm].name} + ${SALT[P.di]} → ${SALT[P.dm] || MET[P.dm].name + " salt"} + ${MET[P.di].name}`, "#aab6cc");
    if (ui.level === "adv") { const z1 = MET[P.dm].z, z2 = P.di === "Ag" ? 1 : 2, sup = z => ({ 1: "⁺", 2: "²⁺", 3: "³⁺" })[z]; L(`oxidation: ${P.dm} → ${P.dm}${sup(z1)} + ${z1}e⁻`, "#ffd166"); L(`reduction: ${P.di}${sup(z2)} + ${z2}e⁻ → ${P.di}`, "#6fb1ff"); L(`${P.di}${sup(z2)} is the oxidising agent; ${P.dm} is the reducing agent`, "#aab6cc", "12px"); }
    // electrons moving from metal atoms to ions
    const ph = performance.now() / 600; for (let k = 0; k < 5; k++) { const u = (ph + k / 5) % 1; c.fillStyle = "#ffd166"; c.beginPath(); c.arc(bx - 30 + 60 * u, by - 40 - 30 * Math.sin(Math.PI * u), 3, 0, 6.3); c.fill(); } T(c, "e⁻", bx, by - 80, "#ffd166", "center", "600 12px"); }
}
function drawExt(c, w, h) {
  seriesStrip(c, w, P.ext); const M = MET[P.ext], x0 = 30, y0 = 90;
  if (M.ext === "carbon") {
    // the blast furnace: a cross-section with what happens at each level
    const fx = w * 0.25, top = y0 + 10, bot = h - 30; c.fillStyle = "#3a2a20"; c.beginPath(); c.moveTo(fx - 50, top); c.lineTo(fx + 50, top); c.lineTo(fx + 90, bot - 60); c.lineTo(fx + 70, bot); c.lineTo(fx - 70, bot); c.lineTo(fx - 90, bot - 60); c.fill();
    const gr = c.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, "#5a3a2a"); gr.addColorStop(1, "#ff8a3d"); c.fillStyle = gr; c.beginPath(); c.moveTo(fx - 40, top + 10); c.lineTo(fx + 40, top + 10); c.lineTo(fx + 75, bot - 60); c.lineTo(fx + 58, bot - 10); c.lineTo(fx - 58, bot - 10); c.lineTo(fx - 75, bot - 60); c.fill();
    c.fillStyle = "#ffd166"; c.fillRect(fx - 58, bot - 24, 116, 12); T(c, "molten iron", fx + 70, bot - 14, "#ffd166", "left", "11px"); c.fillStyle = "#c9a96a"; c.fillRect(fx - 58, bot - 36, 116, 10); T(c, "slag", fx + 70, bot - 28, "#c9a96a", "left", "11px");
    T(c, "iron ore, coke, limestone in ↓", fx, top - 6, "#eef2f8", "center", "11.5px"); T(c, "hot air →", fx - 95, bot - 50, "#6fb1ff", "right", "11.5px");
    const x = w * 0.5; let y = y0 + 20; const L = (s, col = "#eef2f8", f = "13px") => { T(c, s, x, y, col, "left", f); y += 24; };
    L(`${M.name}: below carbon, so reduced by carbon`, "#ff8a70", "600 14px"); if (P.ext === "Fe") { L("1. coke burns: C + O₂ → CO₂ (very hot)"); L("2. CO₂ + C → 2CO"); L("3. iron oxide is reduced: Fe₂O₃ + 3CO → 2Fe + 3CO₂", "#ffd166"); L("4. limestone removes sand as slag:"); L("   CaCO₃ → CaO + CO₂;  CaO + SiO₂ → CaSiO₃"); if (ui.level === "adv") L("iron +3 → 0 (reduced); carbon +2 → +4 (oxidised)", "#6fb1ff", "12px"); }
    else L(`${M.name} oxide + carbon → ${M.name} + carbon dioxide (heated in a furnace)`);
  } else if (M.ext === "electrolysis") {
    const cx = w * 0.27, cy = h * 0.6; c.fillStyle = "#3a4560"; c.fillRect(cx - 120, cy - 60, 240, 120); c.fillStyle = "#ff8a3d"; c.globalAlpha = 0.6; c.fillRect(cx - 110, cy - 40, 220, 90); c.globalAlpha = 1;
    c.fillStyle = "#222"; for (const dx of [-60, 0, 60]) c.fillRect(cx + dx - 10, cy - 110, 20, 90); T(c, "carbon anodes (+)", cx, cy - 118, "#eef2f8", "center", "11.5px"); T(c, "carbon lining: cathode (−)", cx, cy + 78, "#eef2f8", "center", "11.5px");
    c.fillStyle = "#cfd6de"; c.fillRect(cx - 110, cy + 32, 220, 18); T(c, `molten ${M.name}`, cx, cy + 46, "#0b1020", "center", "600 11px");
    const x = w * 0.55; let y = y0 + 20; const L = (s, col = "#eef2f8", f = "13px") => { T(c, s, x, y, col, "left", f); y += 24; };
    L(`${M.name}: above carbon, so extracted by electrolysis`, "#6fb1ff", "600 14px");
    if (P.ext === "Al") { L("aluminium oxide is dissolved in molten cryolite (lowers the melting point)"); L("cathode: Al³⁺ + 3e⁻ → Al", "#ffd166"); L("anode: 2O²⁻ → O₂ + 4e⁻ (the oxygen burns the carbon anodes away)"); L("needs a huge amount of electricity: recycling aluminium saves about 95% of the energy", "#aab6cc", "12px"); }
    else L(`electrolysis of molten ${M.name} chloride: ${P.ext}${({ 1: "⁺", 2: "²⁺", 3: "³⁺" })[M.z]} + ${M.z}e⁻ → ${P.ext} at the cathode`);
  } else {
    const x = w * 0.3; T(c, `${M.name}: very unreactive, so it is found as the metal itself`, x, y0 + 40, "#ffd166", "left", "600 14px"); T(c, "panned or mined as nuggets, then purified; used since ancient times", x, y0 + 66, "#aab6cc"); c.fillStyle = M.col; for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(x + 40 + k * 40, y0 + 140 + 10 * Math.sin(k), 8 + 4 * Math.sin(k * 3), 0, 6.3); c.fill(); }
  }
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ acid: drawAcid, disp: drawDisp, ext: drawExt })[P.mode](c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; t += dt * speed;
  if (P.mode === "acid" && !dangerous(P)) { const rate = (gasVolume(P, t + 1) - gasVolume(P, t)), w = cv.w, h = cv.h; for (let k = 0; k < Math.min(6, rate * dt * speed * 3); k++) bubbles.push({ x: w * 0.25 + (Math.random() - 0.5) * 40, y: h - 70, r: 2 + Math.random() * 3 }); for (const b of bubbles) b.y -= 60 * dt; bubbles = bubbles.filter(b => b.y > h - 200).slice(-200); }
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "acid") {
    const M = MET[P.metal], curve = o => { const pts = []; for (let s = 0; s <= 300; s += 3) pts.push([s, gasVolume(o, s)]); return pts; }, now = curve(P).filter(q => q[0] <= t);
    chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "hydrogen (cm³)"; chA.opts.xFmt = null; chA.draw(kept.map((o, i) => ({ pts: curve(o), color: K.col(i + 1), dash: [5, 4], width: 1.4, label: o.metal })).concat([{ pts: now, color: "#ffd166", width: 2.6, label: P.metal + " now" }]), { xMin: 0, xMax: 300, yMin: 0 });
    const list = ["Ca", "Mg", "Al", "Zn", "Fe", "Cu", "Ag"]; chB.opts.xLabel = ""; chB.opts.yLabel = "cm³ in 60 s"; chB.opts.xFmt = whole(v => list[Math.round(v)] || "");
    chB.draw([{ pts: list.map((k, i) => [i, gasVolume({ metal: k, reagent: "acid", mass: 0.1, conc: 1, form: "ribbon" }, 60)]), type: "bars", w: 0.6, color: "#6fb1ff", label: "0.1 g ribbon, 1 mol/dm³ acid" }], { xMin: -0.6, xMax: list.length - 0.4, yMin: 0 });
    const V = gasVolume(P, t), vmax = P.mass / M.Ar * M.z / 2 * 24000, rate = gasVolume(P, t + 1) - gasVolume(P, t);
    read.set("a", dangerous(P) ? "–" : V.toFixed(1) + " cm³"); read.set("b", vmax.toFixed(0) + " cm³"); read.set("c", (rate * 0.4).toFixed(1) + " °C");
    read.set("d", dangerous(P) ? "explosive: not done" : rate > 1 ? "vigorous fizzing" : rate > 0.2 ? "steady bubbles" : rate > 0.01 ? "a few bubbles" : V > 0.9 * vmax ? "finished" : "no reaction");
    ui.hud(`${M.name}: ${["K", "Na", "Li", "Ca", "Mg", "Al"].includes(P.metal) ? "above" : "below"} carbon, ${["Cu", "Ag", "Au"].includes(P.metal) ? "below" : "above"} hydrogen`);
  } else if (P.mode === "disp") {
    const go = MET[P.dm].E < MET[P.di].E && P.dm !== P.di, pts = []; for (let s = 0; s <= Math.min(t, 300); s += 3) pts.push([s, 20 + dt0 * (1 - Math.exp(-s / 40)) - (s > 120 ? 0.01 * (s - 120) * dt0 / 20 : 0)]);
    chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "temperature (°C)"; chA.opts.xFmt = null; chA.draw([{ pts, color: "#ff8a70", label: "thermometer" }], { xMin: 0, xMax: 300, yMin: 15 });
    chB.opts.xLabel = ""; chB.opts.yLabel = "rise (°C)"; chB.opts.xFmt = whole(v => tried[Math.round(v)] ? tried[Math.round(v)].m + "→" + tried[Math.round(v)].i : ""); chB.draw([{ pts: tried.map((q, i) => [i, q.dT]), type: "bars", w: 0.6, color: "#ffd166", label: "pairs tried (0 = no reaction)" }], { xMin: -0.6, xMax: Math.max(3, tried.length) - 0.4, yMin: 0 });
    read.set("a", go ? "yes" : "no"); read.set("b", (dt0 * (1 - Math.exp(-t / 40))).toFixed(1) + " °C"); read.set("c", go ? P.dm + " (loses electrons)" : "–"); read.set("d", go ? P.di + " ions (gain electrons)" : "–");
    ui.hud(go ? "the more reactive metal ends up as the ion" : "no displacement");
  } else {
    chA.opts.xLabel = ""; chA.opts.yLabel = "year (negative = BC)"; chA.opts.xFmt = whole(v => ORDER[Math.round(v)] || ""); chA.draw([{ pts: ORDER.map((k, i) => [i, MET[k].year]), type: "dots", r: 6, color: "#ffd166", label: "first isolated" }], { xMin: -0.6, xMax: ORDER.length - 0.4 });
    chB.opts.xLabel = ""; chB.opts.yLabel = "% of the crust"; chB.opts.xFmt = whole(v => ORDER[Math.round(v)] || ""); chB.draw([{ pts: ORDER.map((k, i) => [i, MET[k].crust]), type: "bars", w: 0.6, color: "#7fe3a0", label: "abundance (approximate)" }], { xMin: -0.6, xMax: ORDER.length - 0.4, yMin: 0 });
    const M = MET[P.ext]; read.set("a", M.name); read.set("b", { electrolysis: "electrolysis", carbon: "reduction with carbon", native: "found as the metal" }[M.ext]); read.set("c", M.year < 0 ? -M.year + " BC (about)" : M.year); read.set("d", M.crust + "%");
    ui.hud("The least reactive metals were discovered first: the most reactive needed electricity (from 1800)");
  }
});
set({});
ui.tip("Choose a metal from the reactivity series · switch to displacement or extraction at the top of the controls", 7000);
