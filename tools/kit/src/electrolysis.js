/* =====================================================================
   ELECTROLYSIS
   An ionic compound is made of charged particles (ions). When it is
   molten or dissolved, the ions are free to move. Connect a power supply
   and:

     * positive ions (cations) drift to the negative electrode, the
       CATHODE, where they GAIN electrons          (reduction)
     * negative ions (anions) drift to the positive electrode, the
       ANODE, where they LOSE electrons            (oxidation)

   The electrons travel round the wires, pushed by the power supply.
   Nothing moves through the liquid except ions.

   HOW MUCH forms is set by how much charge has passed (Faraday):

       charge (C) = current (A) x time (s)
       moles of electrons = charge / 96 500
       moles of product = moles of electrons / (electrons needed for each)

   WHICH ion is discharged, when there is a choice (in a solution, water
   supplies H+ and OH- as well), follows rules given with each cell below.
   ===================================================================== */
const FARADAY = 96500, MOLAR_GAS = 24000;      // coulombs per mole of electrons; cm³ per mole of gas at room temperature
/* Each cell: the ions present, and what happens at each electrode.
   z = electrons transferred for each formula unit of product; M = its molar mass. */
const CELLS = {
  pbbr2: { name: "Molten lead(II) bromide", formula: "PbBr₂(l)", molten: true, liquid: [228, 150, 70],
    ions: [["Pb²⁺", 1, "#c9ccd6", 16], ["Br⁻", -1, "#c9703c", 32]],
    cat: { ion: "Pb²⁺", prod: "lead", z: 2, M: 207, kind: "bead", col: "#c8ccd4", eq: "Pb²⁺ + 2e⁻ → Pb", see: "silvery beads of molten lead sink to the bottom" },
    an: { ion: "Br⁻", prod: "bromine", z: 2, M: 160, kind: "gas", col: "rgba(190,90,40,.75)", eq: "2Br⁻ → Br₂ + 2e⁻", see: "brown bromine vapour" },
    why: "Only two kinds of ion are present, so there is no choice: the metal forms at the cathode and the non-metal at the anode." },
  nacl: { name: "Molten sodium chloride", formula: "NaCl(l)", molten: true, liquid: [240, 200, 150],
    ions: [["Na⁺", 1, "#d9d2f0", 24], ["Cl⁻", -1, "#9bd67a", 24]],
    cat: { ion: "Na⁺", prod: "sodium", z: 1, M: 23, kind: "float", col: "#e6e8ee", eq: "Na⁺ + e⁻ → Na", see: "silvery molten sodium floats to the top" },
    an: { ion: "Cl⁻", prod: "chlorine", z: 2, M: 71, kind: "gas", col: "rgba(170,220,90,.7)", eq: "2Cl⁻ → Cl₂ + 2e⁻", see: "pale green chlorine gas" },
    why: "With no water present, sodium itself is formed. This is how sodium is manufactured (the Downs cell)." },
  brine: { name: "Concentrated sodium chloride solution (brine)", formula: "NaCl(aq)", liquid: [205, 225, 240],
    ions: [["Na⁺", 1, "#d9d2f0", 16], ["Cl⁻", -1, "#9bd67a", 16], ["H⁺", 1, "#ff9d8a", 8], ["OH⁻", -1, "#8ac6ff", 8]],
    cat: { ion: "H⁺", prod: "hydrogen", z: 2, M: 2, kind: "gas", col: "rgba(235,240,255,.8)", eq: "2H⁺ + 2e⁻ → H₂", see: "colourless gas that burns with a squeaky pop" },
    an: { ion: "Cl⁻", prod: "chlorine", z: 2, M: 71, kind: "gas", col: "rgba(170,220,90,.7)", eq: "2Cl⁻ → Cl₂ + 2e⁻", see: "pale green gas that bleaches damp litmus paper", dissolves: 14 },
    left: "sodium hydroxide", why: "Cathode: sodium is more reactive than hydrogen, so hydrogen ions (from the water) are discharged instead of sodium ions. Anode: a halide ion is present in high concentration, so chlorine forms, not oxygen. Na⁺ and OH⁻ are left behind: the solution becomes sodium hydroxide." },
  cuso4: { name: "Copper(II) sulfate solution", formula: "CuSO₄(aq)", liquid: [70, 150, 235], blue: true,
    ions: [["Cu²⁺", 1, "#5fb0ff", 16], ["SO₄²⁻", -1, "#f0e08a", 16], ["H⁺", 1, "#ff9d8a", 6], ["OH⁻", -1, "#8ac6ff", 6]],
    cat: { ion: "Cu²⁺", prod: "copper", z: 2, M: 63.5, kind: "plate", col: "#c46a3c", eq: "Cu²⁺ + 2e⁻ → Cu", see: "a pink-brown coating of copper" },
    an: { ion: "OH⁻", prod: "oxygen", z: 4, M: 32, kind: "gas", col: "rgba(235,240,255,.8)", eq: "4OH⁻ → O₂ + 2H₂O + 4e⁻", see: "colourless gas that relights a glowing splint" },
    anCu: { ion: "Cu", prod: "copper ions", z: 2, M: 63.5, kind: "dissolve", col: "#5fb0ff", eq: "Cu → Cu²⁺ + 2e⁻", see: "the copper anode slowly dissolves" },
    why: "Cathode: copper is less reactive than hydrogen, so copper ions are discharged. Anode (graphite): there is no halide, so hydroxide ions from the water are discharged, giving oxygen; the blue colour fades as Cu²⁺ is used up. With COPPER electrodes the anode itself dissolves instead, so the solution stays blue." },
  h2so4: { name: "Dilute sulfuric acid", formula: "H₂SO₄(aq)", liquid: [215, 228, 240],
    ions: [["H⁺", 1, "#ff9d8a", 20], ["SO₄²⁻", -1, "#f0e08a", 10], ["OH⁻", -1, "#8ac6ff", 6]],
    cat: { ion: "H⁺", prod: "hydrogen", z: 2, M: 2, kind: "gas", col: "rgba(235,240,255,.8)", eq: "2H⁺ + 2e⁻ → H₂", see: "colourless gas that burns with a squeaky pop" },
    an: { ion: "OH⁻", prod: "oxygen", z: 4, M: 32, kind: "gas", col: "rgba(235,240,255,.8)", eq: "4OH⁻ → O₂ + 2H₂O + 4e⁻", see: "colourless gas that relights a glowing splint" },
    why: "Hydrogen ions are the only positive ions. Sulfate ions are not discharged; hydroxide ions from the water are. Overall, water is split into hydrogen and oxygen: two volumes of hydrogen for each one of oxygen." },
  cucl2: { name: "Copper(II) chloride solution", formula: "CuCl₂(aq)", liquid: [70, 190, 170], blue: true,
    ions: [["Cu²⁺", 1, "#5fb0ff", 14], ["Cl⁻", -1, "#9bd67a", 28], ["H⁺", 1, "#ff9d8a", 5], ["OH⁻", -1, "#8ac6ff", 5]],
    cat: { ion: "Cu²⁺", prod: "copper", z: 2, M: 63.5, kind: "plate", col: "#c46a3c", eq: "Cu²⁺ + 2e⁻ → Cu", see: "a pink-brown coating of copper" },
    an: { ion: "Cl⁻", prod: "chlorine", z: 2, M: 71, kind: "gas", col: "rgba(170,220,90,.7)", eq: "2Cl⁻ → Cl₂ + 2e⁻", see: "pale green gas that bleaches damp litmus paper", dissolves: 14 },
    why: "Copper is less reactive than hydrogen, so copper forms at the cathode. A halide is present, so chlorine forms at the anode." }
};
// the amount formed after a charge Q has passed: returns { mol, grams, cm3 }
function amount(prod, Q) { const mol = Q / FARADAY / prod.z; return { mol, grams: mol * prod.M, cm3: mol * MOLAR_GAS }; }
// a whole experiment "on the bench", with the reading errors of a school balance and gas syringe.  Returns what would be measured.
function bench(cellKey, I, minutes, rnd, copper) {
  const cell = CELLS[cellKey], Q = I * (1 + 0.02 * rnd.gauss()) * minutes * 60, c = amount(cell.cat, Q), a = amount(copper ? cell.anCu : cell.an, Q);     // the ammeter is only good to about 2%
  const lost = c.grams * (cell.cat.kind === "plate" ? 0.03 * rnd() : 0);                                           // a little copper flakes off when the electrode is dried
  return { catMass: c.grams - lost + 0.01 * rnd.gauss(), catGas: Math.max(0, c.cm3 + 1.2 * rnd.gauss()), anGas: Math.max(0, a.cm3 - (cell.an.dissolves || 0) * (1 - Math.exp(-a.cm3 / 20)) + 1.2 * rnd.gauss()), anMass: a.grams + 0.01 * rnd.gauss() };
}

// ---------------- The page ----------------
let cellKey = "cuso4", cell = CELLS.cuso4, I = 1, on = true, melted = true, copper = false, speed = 30, Q = 0, t = 0, ions = [], bubbles = [], beads = [], elec = [], logM = [], logG = [], pendC = 0, pendA = 0, used = 0, flashes = [];
const CHUNK = 18;      // each ion drawn stands for this many coulombs of charge
const anodeProd = () => copper && cell.anCu ? cell.anCu : cell.an;
const flowing = () => on && I > 0 && (!cell.molten || melted);
function fill() { ions = []; const r = Math.random; for (const [sym, sign, col, n] of cell.ions) for (let k = 0; k < n; k++) ions.push({ sym, sign, col, x: 0.08 + r() * 0.84, y: 0.2 + r() * 0.72, vx: 0, vy: 0, gx: Math.round(r() * 12), gy: Math.round(r() * 8) }); }
function reset() { Q = 0; t = 0; bubbles = []; beads = []; logM = []; logG = []; pendC = pendA = 0; used = 0; flashes = []; fill(); }
function choose(k) { cellKey = k; cell = CELLS[k]; if (!cell.anCu) copper = false; reset(); }

const ui = K.app({
  title: "Electrolysis", subject: "Chemistry",
  blurb: "Ions on the move: what forms at each electrode, why, and how much",
  reset: () => set({ cell: "cuso4" }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 1(i) Electrolysis, with gas tests from 2(h). Calculations with the Faraday are Chemistry only.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 3 Redox I: oxidation numbers, half-equations, oxidising and reducing agents." } },
  missions: [
    { title: "It has to be melted", q: "Solid lead(II) bromide, with the power supply on. Is any current flowing? Now switch on 'Heat until molten'. What changes, and what do you see at each electrode?", hint: "In the solid the ions are held in a lattice and cannot move, so no current flows and nothing happens. When it melts the ions are free: positive lead ions drift to the negative electrode (cathode) and become beads of molten lead; negative bromide ions drift to the positive electrode (anode) and become brown bromine vapour. An ionic compound conducts only when molten or dissolved.", setup() { set({ cell: "pbbr2", melted: false }); } },
    { title: "Follow the electrons", q: "Watch the yellow dots in the wires and the ions in the liquid. Which way do electrons travel round the circuit? Do electrons ever travel through the liquid? At which electrode do ions gain electrons?", hint: "Electrons flow through the wires from the anode, round through the power supply, to the cathode. They never pass through the liquid: there the current is carried by moving ions. At the cathode positive ions gain electrons (reduction); at the anode negative ions lose electrons (oxidation). OIL RIG: Oxidation Is Loss, Reduction Is Gain.", setup() { set({ cell: "pbbr2", speed: 10 }); } },
    { title: "Salt water: where is the sodium?", q: "Concentrated sodium chloride solution contains four kinds of ion, because water supplies a few H⁺ and OH⁻. Which ion is discharged at each electrode? Does any sodium form? What is left in the solution?", hint: "Hydrogen forms at the cathode, not sodium: sodium is far more reactive than hydrogen, so its ions hold on to their charge and hydrogen ions are discharged instead. Chlorine forms at the anode. Sodium ions and hydroxide ions are left, so the solution turns into sodium hydroxide. All three products are valuable: this is the chlor-alkali industry. Notice that less chlorine is collected than hydrogen at first: chlorine is slightly soluble.", setup() { set({ cell: "brine" }); } },
    { title: "Copper plating", q: "Copper(II) sulfate solution with graphite electrodes. What appears on the cathode? What gas comes off the anode? Watch the colour of the solution for a few minutes: what happens, and why?", hint: "Copper is less reactive than hydrogen, so copper ions are discharged and a pink-brown layer of copper builds up on the cathode. At the anode, sulfate ions are not discharged; hydroxide ions from the water are, giving oxygen. The blue colour is due to copper ions, so it fades as they are removed from the solution.", setup() { set({ cell: "cuso4", I: 2, speed: 60 }); } },
    { title: "Purifying copper", q: "Same solution, but now both electrodes are made of copper. What happens to each electrode's mass? Does the solution fade this time? Compare the mass lost by one with the mass gained by the other.", hint: "The copper anode dissolves: its atoms lose electrons and go into solution as Cu²⁺. The same number of copper ions are discharged at the cathode. So the cathode gains exactly what the anode loses, and the solution stays just as blue. This is how copper is purified for electrical wiring: the impure copper is the anode, and pure copper builds up on the cathode while impurities fall to the bottom.", setup() { set({ cell: "cuso4", copper: true, I: 2, speed: 60 }); } },
    { title: "Splitting water", q: "Dilute sulfuric acid. Compare the volumes of gas collected over the two electrodes. What is the ratio, and which gas is which? What does the ratio tell you about water?", hint: "Twice as much gas collects at the cathode (hydrogen) as at the anode (oxygen). Overall the water is being split: 2H₂O → 2H₂ + O₂. The 2 : 1 ratio by volume is the reason water's formula is H₂O. Test the gases: hydrogen burns with a squeaky pop; oxygen relights a glowing splint.", setup() { set({ cell: "h2so4", I: 1.5, speed: 60 }); } },
    { title: "How much? (Chemistry only)", q: "Copper plating again. Note the mass of copper after 10 minutes at 1 A. Predict the mass after 10 minutes at 2 A, and after 20 minutes at 1 A, then test your predictions with 'Start again'.", hint: "The mass deposited is proportional to the charge passed, and charge = current × time. So doubling either the current or the time doubles the mass. 1 A for 600 s is 600 C, which is 600 ÷ 96 500 = 0.0062 mol of electrons; each copper ion needs two, so 0.0031 mol of copper, or 0.197 g.", setup() { set({ cell: "cuso4", I: 1, speed: 60 }); } },
    { lvl: "adv", title: "Redox at the electrodes", q: "For copper(II) chloride solution, write the half-equation at each electrode (they are shown on screen). What happens to the oxidation number of copper, and of chlorine? Which species is the oxidising agent?", hint: "Cathode: Cu²⁺ + 2e⁻ → Cu. Copper goes from +2 to 0: it gains electrons, so it is reduced, and Cu²⁺ is the oxidising agent. Anode: 2Cl⁻ → Cl₂ + 2e⁻. Chlorine goes from −1 to 0: it is oxidised, and Cl⁻ is the reducing agent. The number of electrons lost at the anode always equals the number gained at the cathode, which is how the half-equations are combined: Cu²⁺ + 2Cl⁻ → Cu + Cl₂.", setup() { set({ cell: "cucl2", I: 1.5, speed: 60 }); } }
  ],
  batch: [
    { title: "Mass against time", question: "How does the mass of copper deposited depend on how long the current flows?", how: "Each run: copper(II) sulfate at 1.0 A for the chosen time. The cathode is weighed on a balance reading to 0.01 g, the ammeter is good to 2%, and a little copper may flake off.", xLabel: "time (minutes)", yLabel: "mass of copper deposited (g)", xs: [5, 10, 15, 20, 30, 40, 50], reps: 5, yMin: 0, fit: true, theory: x => 1 * x * 60 / FARADAY / 2 * 63.5, theoryLabel: "m = ItM / 2F", run: (x, r) => bench("cuso4", 1, x, r).catMass, note: "A straight line through the origin: mass is proportional to time. The points sit slightly below the theory line because copper that flakes off is lost before weighing." },
    { title: "Mass against current", question: "How does the mass of copper deposited depend on the current?", how: "Each run: copper(II) sulfate for 20 minutes at the chosen current.", xLabel: "current (A)", yLabel: "mass of copper deposited (g)", xs: [0.25, 0.5, 1, 1.5, 2, 2.5, 3], reps: 5, yMin: 0, fit: true, theory: x => x * 1200 / FARADAY / 2 * 63.5, theoryLabel: "m = ItM / 2F", run: (x, r) => bench("cuso4", x, 20, r).catMass },
    { title: "Hydrogen to oxygen", question: "What is the ratio of the volumes of gas from dilute sulfuric acid?", how: "Each run: 1.5 A for 15 minutes; both gases are collected and read to about 1 cm³. The result is volume at the cathode ÷ volume at the anode.", xLabel: "", yLabel: "volume of hydrogen ÷ volume of oxygen", reps: 200, bins: 20, lo: 1.8, hi: 2.2, theory: 2, theoryLabel: "2H₂ : 1O₂", run(x, r) { const b = bench("h2so4", 1.5, 15, r); return b.catGas / b.anGas; } },
    { title: "The charge on the ion", question: "How does the amount of metal deposited depend on the charge on its ion?", how: "Each run: 0.010 mol of electrons (965 C) is passed through a solution of a metal ion with charge 1+ (silver), 2+ (copper) or 3+ (chromium). The moles of metal are found by weighing.", xLabel: "charge on the metal ion", yLabel: "moles of metal deposited", xs: [1, 2, 3], reps: 6, yMin: 0, theory: z => 0.01 / z, theoryLabel: "0.010 ÷ charge", run: (z, r) => { const M = [0, 108, 63.5, 52][z]; return (0.01 / z * M + 0.01 * r.gauss()) / M; }, note: "Each ion needs as many electrons as its charge, so the same charge deposits half as many moles of a 2+ metal and a third as many of a 3+ metal." },
    { title: "Anode loss, cathode gain", question: "With copper electrodes, does the anode lose exactly what the cathode gains?", how: "Each run: copper(II) sulfate with copper electrodes, 2 A for 20 minutes. The result is mass lost by the anode ÷ mass gained by the cathode.", xLabel: "", yLabel: "anode loss ÷ cathode gain", reps: 200, bins: 20, lo: 0.9, hi: 1.15, theory: 1, theoryLabel: "equal", run(x, r) { const b = bench("cuso4", 2, 20, r, true); return b.anMass / b.catMass; }, note: "The average is a little above 1: some copper flakes off the cathode and is not weighed, and in a real experiment impurities in the anode fall away too." },
    { title: "Chlorine goes missing", question: "From brine, is as much chlorine collected as hydrogen?", how: "Each run: 1 A for the chosen time. The result is the volume of chlorine collected ÷ the volume of hydrogen collected.", xLabel: "time (minutes)", yLabel: "chlorine collected ÷ hydrogen collected", xs: [2, 4, 6, 10, 15, 20, 30], reps: 5, yMin: 0, yMax: 1.1, theory: () => 1, theoryLabel: "equal moles made", run(x, r) { const b = bench("brine", 1, x, r); return b.anGas / b.catGas; }, note: "Equal numbers of moles of the two gases are made, but chlorine is slightly soluble in water, so some stays in solution until the liquid round the anode is saturated." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 1(i)", text: "Ionic compounds conduct electricity only when molten or in solution, because only then are the ions free to move. Covalent compounds do not conduct." },
      { lvl: "std", tag: "4CH1 1(i)", text: "Cations (+) move to the cathode (−) and gain electrons: reduction. Anions (−) move to the anode (+) and lose electrons: oxidation. OIL RIG." },
      { lvl: "std", tag: "4CH1 1(i)", text: "Molten binary compounds give the metal at the cathode and the non-metal at the anode." },
      { lvl: "std", tag: "4CH1 1(i)", text: "In aqueous solution: at the cathode, hydrogen forms unless the metal is less reactive than hydrogen (copper, silver). At the anode, a halogen forms if a halide is present in good concentration; otherwise oxygen forms from OH⁻." },
      { lvl: "std", tag: "4CH1 2(h)", text: "Gas tests: hydrogen burns with a squeaky pop; oxygen relights a glowing splint; chlorine bleaches damp litmus paper." },
      { lvl: "std", tag: "4CH1 1(i) Chemistry only", text: "One faraday (96 500 C) is the charge on one mole of electrons. Charge = current × time. Use the half-equation to find the moles of product per mole of electrons." },
      { lvl: "adv", tag: "9CH0 Topic 3", text: "Oxidation is loss of electrons or an increase in oxidation number; reduction is gain of electrons or a decrease. An oxidising agent gains electrons and is itself reduced." },
      { lvl: "adv", tag: "9CH0 Topic 3", text: "Half-equations are balanced for atoms, then for charge with electrons, and combined so that electrons lost equal electrons gained." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why solid lead(II) bromide does not conduct electricity but molten lead(II) bromide does.", ans: "<ul><li>In the solid the ions are held in fixed positions in the lattice and cannot move</li><li>When molten the ions are free to move and carry the charge</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Name the product at each electrode when ${cell.name.toLowerCase()} is electrolysed${copper ? " using copper electrodes" : cell.molten ? "" : " using graphite electrodes"}, and write the half-equation for the cathode.`, ans: () => `<ul><li>Cathode: ${cell.cat.prod}</li><li>Anode: ${anodeProd().prod}</li><li>${cell.cat.eq}</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain why hydrogen, not sodium, is produced at the cathode when sodium chloride solution is electrolysed.", ans: "<ul><li>The solution contains H⁺ ions from the water as well as Na⁺ ions</li><li>Sodium is more reactive than hydrogen</li><li>so hydrogen ions are discharged (gain electrons) in preference to sodium ions</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe what you would see when copper(II) sulfate solution is electrolysed using graphite electrodes.", ans: "<ul><li>A pink-brown solid (copper) forms on the cathode</li><li>Bubbles of colourless gas (oxygen) at the anode</li><li>The blue colour of the solution fades</li></ul>" },
      { lvl: "std", marks: 4, q: () => `A current of ${I.toFixed(1)} A is passed through copper(II) sulfate solution for 20 minutes. Calculate the mass of copper deposited. (1 faraday = 96 500 C; Aᵣ of Cu = 63.5)`, ans: () => { const q = I * 1200, n = q / FARADAY; return `<ul><li>charge = ${I.toFixed(1)} × 20 × 60 = ${q.toFixed(0)} C</li><li>moles of electrons = ${q.toFixed(0)} ÷ 96 500 = ${n.toFixed(4)}</li><li>Cu²⁺ + 2e⁻ → Cu, so moles of copper = ${(n / 2).toFixed(4)}</li><li>mass = ${(n / 2).toFixed(4)} × 63.5 = ${(n / 2 * 63.5).toFixed(2)} g</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Dilute sulfuric acid is electrolysed and 30 cm³ of hydrogen is collected at the cathode. State the volume of oxygen collected at the anode and explain your answer.", ans: "<ul><li>15 cm³</li><li>2H⁺ + 2e⁻ → H₂ needs 2 electrons per molecule; 4OH⁻ → O₂ + 2H₂O + 4e⁻ gives 4 per molecule</li><li>so for the same charge, half as many moles (and half the volume) of oxygen form</li></ul>" },
      { lvl: "adv", marks: 3, q: "In the electrolysis of copper(II) chloride solution, identify the species oxidised and the species reduced, giving the change in oxidation number of each.", ans: "<ul><li>Cu²⁺ is reduced: copper goes from +2 to 0</li><li>Cl⁻ is oxidised: chlorine goes from −1 to 0</li><li>Electrons lost by chloride ions at the anode equal electrons gained by copper ions at the cathode</li></ul>" },
      { lvl: "adv", marks: 3, q: "Combine the half-equations 2H⁺ + 2e⁻ → H₂ and 4OH⁻ → O₂ + 2H₂O + 4e⁻ to give the overall equation for the electrolysis of acidified water.", ans: "<ul><li>Multiply the first by 2 so that 4 electrons are transferred in each: 4H⁺ + 4e⁻ → 2H₂</li><li>Add: 4H⁺ + 4OH⁻ → 2H₂ + O₂ + 2H₂O</li><li>4H⁺ + 4OH⁻ is 4H₂O; cancel 2H₂O: 2H₂O → 2H₂ + O₂</li></ul>" },
      { lvl: "adv", marks: 4, q: "A current of 0.50 A is passed through molten sodium chloride for 30 minutes. Calculate the volume of chlorine formed at room temperature and pressure. (F = 96 500 C mol⁻¹; molar volume = 24.0 dm³ mol⁻¹)", ans: "<ul><li>charge = 0.50 × 1800 = 900 C</li><li>moles of electrons = 900 ÷ 96 500 = 0.00933</li><li>2Cl⁻ → Cl₂ + 2e⁻, so moles of Cl₂ = 0.00466</li><li>volume = 0.00466 × 24.0 = 0.112 dm³ (112 cm³)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>The amounts</b> are exact Faraday calculations: charge = current × time; moles of electrons = charge ÷ 96 500; then the half-equation gives the moles of each product. Gas volumes use 24 dm³ per mole (room temperature and pressure).</li>
<li><b>Which product forms</b> follows the rules taught at this level, stored for each electrolyte and explained on screen.</li>
<li><b>The picture</b>: each ion drawn stands for 18 coulombs of charge. Ions wander at random and drift towards the electrode of opposite charge when a current flows; one is discharged at each electrode for every 18 C. Electrons are drawn only in the wires.</li>
<li><b>Copper(II) sulfate with graphite electrodes</b> starts as 100 cm³ of 0.50 mol/dm³ solution, and its colour fades in step with the copper ions removed.</li>
<li><b>Chlorine</b> is slightly soluble: the first 14 cm³ or so is lost into the solution.</li>
<li><b>Batch runs</b> add the reading errors of school apparatus: a balance to 0.01 g, a gas syringe to about 1 cm³, an ammeter good to 2%, and a little copper lost on drying.</li></ul>
<h3>Simplifications</h3>
<ul><li>The current is whatever you set. In a real cell it depends on the voltage, the concentration, the gap between the electrodes and their area, and it changes as the experiment goes on.</li>
<li>Far fewer ions are drawn than are really there (about 10²² in a beaker), and real ions drift only a fraction of a millimetre a second.</li>
<li>Water is not drawn, though it is by far the most common particle in the solutions. The few H⁺ and OH⁻ ions it supplies are shown, greatly exaggerated in number.</li>
<li>The rules for which ion is discharged are simplifications: in dilute sodium chloride solution, for example, a mixture of chlorine and oxygen forms.</li>
<li>Graphite anodes slowly burn away in oxygen; that is ignored.</li>
<li>Extracting aluminium is covered in the Reactivity and extracting metals simulation.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What is in the beaker");
ctl.cell = K.seg(g, { label: "Molten", value: "", options: [["pbbr2", "lead(II) bromide"], ["nacl", "sodium chloride"]], on: v => { set({ cell: v }); } });
ctl.cell2 = K.seg(g, { label: "In solution", value: "cuso4", options: [["cuso4", "CuSO₄"], ["brine", "NaCl"], ["h2so4", "H₂SO₄"], ["cucl2", "CuCl₂"]], on: v => { set({ cell: v }); } });
ctl.copper = K.seg(g, { label: "Electrodes", value: false, options: [[false, "graphite (inert)"], [true, "copper"]], on: v => { if (cell.anCu) { copper = v; reset(); } else { ctl.copper.set(false); ui.tip("Copper electrodes are only used here with copper(II) sulfate", 3500); } } });
ctl.melted = K.toggle(g, { label: "Heat until molten", value: true, on: v => { melted = v; } });
const whyNote = K.note(g, "");
g = ui.group("The power supply");
ctl.on = K.toggle(g, { label: "Switched on", value: true, on: v => on = v });
ctl.I = K.slider(g, { label: "Current", min: 0, max: 3, step: 0.1, value: 1, unit: "A", on: v => I = v });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 120, step: 1, value: 30, fmt: v => "1 second shows " + (v < 60 ? v + " s" : (v / 60).toFixed(1) + " min"), on: v => speed = v });
let r1 = K.row(g); K.btn(r1, "↺ Start again", () => reset(), "primary");
const read = K.readout(ui.group("Measurements"), [["t", "time"], ["Q", "charge passed"], ["ne", "moles of electrons"], ["cat", "at the cathode (−)"], ["an", "at the anode (+)"], ["sol", "the solution"]]);
function set(o) {
  if (o.cell) { choose(o.cell); ctl.cell.set(CELLS[o.cell].molten ? o.cell : ""); ctl.cell2.set(CELLS[o.cell].molten ? "" : o.cell); }
  copper = !!o.copper && !!cell.anCu; ctl.copper.set(copper); melted = o.melted !== false; ctl.melted.set(melted); ctl.melted.el.style.display = cell.molten ? "" : "none"; ctl.copper.el.style.display = cell.molten ? "none" : "";
  I = o.I || 1; ctl.I.set(I); on = true; ctl.on.set(true); speed = o.speed || 30; ctl.speed.set(speed); whyNote.innerHTML = cell.why; reset();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function geo() { const w = cv.w, h = cv.h, bw = Math.min(w * 0.5, 470), bh = h * 0.56, bx = w * 0.36 - bw / 2 + 30, by = h * 0.36; return { w, h, bx, by, bw, bh, cx: bx + bw * 0.27, ax: bx + bw * 0.73, ew: 22, etop: by - 26, ebot: by + bh * 0.8 }; }
function draw(dt) {
  const c = cv.ctx, G = geo(), { w, h, bx, by, bw, bh, cx, ax, ew } = G, flow = flowing(), cp = amount(cell.cat, Q), ap = amount(anodeProd(), Q);
  c.fillStyle = "#080c15"; c.fillRect(0, 0, w, h);
  // ---- the liquid: copper solutions are blue, and fade as copper ions are removed ----
  const left = cell.blue && !copper && cellKey === "cuso4" ? Math.max(0, 1 - cp.mol / 0.05) : 1, L = cell.liquid, col = cell.blue ? L.map((v, i) => Math.round(v * left + [215, 228, 240][i] * (1 - left))) : L;
  const solid = cell.molten && !melted; c.fillStyle = solid ? "#d9d4c4" : `rgba(${col.join()},${cell.molten ? 0.55 : 0.34})`; c.beginPath(); c.roundRect(bx, by + 14, bw, bh - 14, [0, 0, 16, 16]); c.fill();
  if (cell.molten && melted) { const gl = c.createLinearGradient(0, by + bh, 0, by + bh + 40); gl.addColorStop(0, "rgba(255,120,40,.5)"); gl.addColorStop(1, "rgba(255,120,40,0)"); c.fillStyle = gl; c.fillRect(bx, by + bh + 4, bw, 40); c.fillStyle = "#ffb060"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("heat", bx + bw / 2, by + bh + 30); }
  // ---- gas-collecting tubes over each electrode ----
  const tube = (x, vol, prod) => { if (prod.kind !== "gas") return; const tw = 46, th = by - 34 + bh * 0.3, ty = 34, fillH = Math.min(1, vol / 120) * (th - 10); c.fillStyle = `rgba(${col.join()},.3)`; c.fillRect(x - tw / 2, ty, tw, th); c.fillStyle = prod.col; c.fillRect(x - tw / 2 + 2, ty + 2, tw - 4, fillH); c.strokeStyle = "rgba(210,225,245,.65)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - tw / 2, ty + th); c.lineTo(x - tw / 2, ty); c.lineTo(x + tw / 2, ty); c.lineTo(x + tw / 2, ty + th); c.stroke(); c.fillStyle = "#eef2f8"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(vol.toFixed(0) + " cm³", x, ty - 8); };
  const anVol = Math.max(0, ap.cm3 - (anodeProd().dissolves || 0) * (1 - Math.exp(-ap.cm3 / 20)));
  tube(cx, cp.cm3, cell.cat); tube(ax, anVol, anodeProd());
  // ---- electrodes: the cathode gains a coating of metal; a copper anode is eaten away ----
  const plate = cell.cat.kind === "plate" ? Math.min(14, cp.grams * 9) : 0, eaten = copper ? Math.min(ew * 0.42, ap.grams * 7) : 0;
  c.fillStyle = copper ? "#b8693c" : "#3c4250"; c.fillRect(cx - ew / 2, G.etop, ew, G.ebot - G.etop); c.fillRect(ax - ew / 2 + eaten, G.etop, ew - 2 * eaten, G.ebot - G.etop);
  if (plate) { c.fillStyle = cell.cat.col; c.fillRect(cx - ew / 2 - plate, by + 18, ew + 2 * plate, G.ebot - by - 14); }
  c.fillStyle = "#6fb1ff"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("CATHODE (−)", cx, by + bh + 22); c.fillStyle = "#ff8a8a"; c.fillText("ANODE (+)", ax, by + bh + 22);
  // ---- beaker, wires, power supply ----
  c.strokeStyle = "rgba(210,225,245,.7)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx, by - 6); c.lineTo(bx, by + bh - 16); c.quadraticCurveTo(bx, by + bh, bx + 16, by + bh); c.lineTo(bx + bw - 16, by + bh); c.quadraticCurveTo(bx + bw, by + bh, bx + bw, by + bh - 16); c.lineTo(bx + bw, by - 6); c.stroke();
  const wy = 16, px = (cx + ax) / 2, side = cell.cat.kind === "gas" || anodeProd().kind === "gas" ? 40 : 0, wire = [[cx, G.etop], [cx - side, G.etop - 4], [cx - side, wy], [px - 34, wy]], wire2 = [[px + 34, wy], [ax + side, wy], [ax + side, G.etop - 4], [ax, G.etop]];
  c.strokeStyle = "#8d98ad"; c.lineWidth = 3; for (const wr of [wire, wire2]) { c.beginPath(); wr.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
  c.fillStyle = "#1c2536"; c.strokeStyle = on ? "#7fe3a0" : "#5b6578"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(px - 34, 4, 68, 26, 6); c.fill(); c.stroke(); c.fillStyle = on ? "#7fe3a0" : "#8d98ad"; c.font = "600 12px Segoe UI,sans-serif"; c.fillText(on ? (flow ? I.toFixed(1) + " A" : "0.0 A") : "off", px, 22); c.fillStyle = "#6fb1ff"; c.fillText("−", px - 46, 12); c.fillStyle = "#ff8a8a"; c.fillText("+", px + 46, 12);
  // electrons in the wires: from the anode, through the supply, to the cathode
  if (flow) { c.fillStyle = "#ffe066"; const path = [...wire2].reverse().concat([[px - 34, wy]], [...wire].reverse()); let tot = 0; const seg = []; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(d); tot += d; } const n = 16, ph = (performance.now() / 1000 * (0.05 + 0.05 * I)) % (1 / n); for (let k = 0; k < n; k++) { let d = ((k / n + ph) % 1) * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; } const f = d / seg[i], ex2 = path[i][0] + (path[i + 1][0] - path[i][0]) * f, ey2 = path[i][1] + (path[i + 1][1] - path[i][1]) * f; if (Math.abs(ex2 - px) < 36 && ey2 < 32) continue; c.beginPath(); c.arc(ex2, ey2, 3, 0, 6.3); c.fill(); }
    c.font = "11px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillText("electrons ↓", cx - side - 8, G.etop - 30); c.textAlign = "left"; c.fillText("↑ electrons", ax + side + 8, G.etop - 30); }
  // ---- ions ----
  const X = u => bx + 8 + u * (bw - 16), Y = v => by + 14 + v * (bh - 22); c.font = "600 10px Segoe UI,sans-serif"; c.textBaseline = "middle";
  for (const q of ions) {
    if (solid) { q.x += (0.06 + q.gx / 12 * 0.88 - q.x) * 0.1; q.y += (0.2 + q.gy / 8 * 0.74 - q.y) * 0.1; }     // locked in the lattice
    else { q.vx += (Math.random() - .5) * 1.6 * dt; q.vy += (Math.random() - .5) * 1.6 * dt;
      if (flow) { const target = ((q.sign > 0 ? cx : ax) - bx - 8) / (bw - 16), d = target - q.x; if (Math.abs(d) > 0.09) q.vx += Math.sign(d) * 0.12 * Math.min(I, 2) * dt; else q.vx -= Math.sign(d) * 0.08 * dt; }   /* drift towards the electrode of opposite charge, but ions that are not discharged do not pile up on it */ q.vx *= 0.96; q.vy *= 0.96; q.x += q.vx * dt; q.y += q.vy * dt; if (q.x < 0.02) { q.x = 0.02; q.vx = Math.abs(q.vx); } if (q.x > 0.98) { q.x = 0.98; q.vx = -Math.abs(q.vx); } if (q.y < 0.12) { q.y = 0.12; q.vy = Math.abs(q.vy); } if (q.y > 0.97) { q.y = 0.97; q.vy = -Math.abs(q.vy); } }
    const px2 = X(q.x), py = Y(q.y); c.fillStyle = q.col; c.beginPath(); c.arc(px2, py, 10, 0, 6.3); c.fill(); c.fillStyle = "#10141c"; c.textAlign = "center"; c.fillText(q.sym, px2, py + 0.5);
  }
  c.textBaseline = "alphabetic";
  // ---- products: bubbles, beads, floating metal ----
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.y -= (40 + b.r * 8) * dt; b.x += Math.sin(b.y * 0.1 + i) * 0.3; c.strokeStyle = b.col; c.fillStyle = b.col.replace(/[\d.]+\)$/, "0.25)"); c.lineWidth = 1.2; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.3); c.fill(); c.stroke(); if (b.y < 60) bubbles.splice(i, 1); }
  for (const b of beads) { if (b.float) { if (b.y > by + 22) b.y -= 30 * dt; } else if (b.y < by + bh - 10) b.y += 60 * dt; const gr = c.createRadialGradient(b.x - 2, b.y - 2, 0, b.x, b.y, b.r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, b.col); c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.3); c.fill(); }
  for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; c.strokeStyle = `rgba(255,240,150,${f[2]})`; c.lineWidth = 2; c.beginPath(); c.arc(f[0], f[1], 6 + (1 - f[2]) * 14, 0, 6.3); c.stroke(); f[2] -= 2.5 * dt; if (f[2] <= 0) flashes.splice(i, 1); }
  // ---- what is happening, written beside the beaker ----
  const tx = bx + bw + 34, tw = w - tx - 14; if (tw > 180) { let ty = by - 4; const para = (title, body, colr) => { c.fillStyle = colr; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(title, tx, ty); ty += 18; c.fillStyle = "#dfe6f3"; c.font = "12.5px Segoe UI,sans-serif"; for (const line of body) { let cur = ""; for (const wd of line.split(" ")) { if (c.measureText(cur + wd).width > tw) { c.fillText(cur, tx, ty); ty += 16; cur = ""; } cur += wd + " "; } c.fillText(cur, tx, ty); ty += 17; } ty += 8; };
    c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(cell.name, tx, ty - 24);
    if (solid) para("Solid: no current", ["The ions are locked in a lattice and cannot move."], "#ffb060"); else {
      para("At the cathode (−): reduction", [cell.cat.eq, cell.cat.prod + ": " + cell.cat.see], "#6fb1ff"); para("At the anode (+): oxidation", [anodeProd().eq, anodeProd().prod + ": " + anodeProd().see], "#ff8a8a"); if (cell.left) para("Left in solution", [cell.left + " (Na⁺ and OH⁻)"], "#c9b6ff"); } }
}
// one ion's worth of charge has passed: discharge an ion at each electrode and show the product
function discharge(G, atCathode) {
  const prod = atCathode ? cell.cat : anodeProd(), ex = atCathode ? G.cx : G.ax, u = (ex - G.bx - 8) / (G.bw - 16), X = uu => G.bx + 8 + uu * (G.bw - 16), Y = v => G.by + 14 + v * (G.bh - 22);
  if (prod.kind === "dissolve") { ions.push({ sym: "Cu²⁺", sign: 1, col: "#5fb0ff", x: u - 0.04, y: 0.25 + Math.random() * 0.5, vx: -0.2, vy: 0, gx: 0, gy: 0 }); flashes.push([X(u), Y(0.5), 1]); return; }
  let best = -1, bd = 9; ions.forEach((q, i) => { if (q.sym !== prod.ion) return; const d = Math.abs(q.x - u) + Math.random() * 0.05; if (d < bd) { bd = d; best = i; } });
  if (best >= 0) { const q = ions[best], y = Y(K.clamp(q.y, 0.2, 0.75)); flashes.push([ex + (atCathode ? 1 : -1) * 14, y, 1]);
    const fading = atCathode && cellKey === "cuso4" && !copper;                                    // these copper ions are not replaced, so the solution fades
    if (fading || (copper && atCathode)) ions.splice(best, 1); else { q.x = 0.1 + Math.random() * 0.8; q.y = 0.2 + Math.random() * 0.7; q.vx = q.vy = 0; }
    if (prod.kind === "gas") for (let k = 0; k < 2; k++) bubbles.push({ x: ex + (Math.random() - .5) * 26, y: y + Math.random() * 20, r: 2.5 + Math.random() * 3, col: prod.col });
    else if (prod.kind === "bead" || prod.kind === "float") beads.push({ x: ex + (Math.random() - .5) * 60, y, r: 4 + Math.random() * 2, col: prod.col, float: prod.kind === "float" }); if (beads.length > 70) beads.shift(); }
}
const chM = K.chart(ui.dock, { title: "Mass", xLabel: "time (minutes)", yLabel: "grams", yMin: 0 });
const chG = K.chart(ui.dock, { title: "Gas collected", xLabel: "time (minutes)", yLabel: "cm³", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!flowing()) return; const G = geo(), dq = I * dt * speed; Q += dq; t += dt * speed; pendC += dq; pendA += dq;
  let n = 0; while (pendC >= CHUNK && n++ < 4) { pendC -= CHUNK; discharge(G, true); } n = 0; while (pendA >= CHUNK && n++ < 4) { pendA -= CHUNK; discharge(G, false); } if (pendC > CHUNK * 4) pendC = 0; if (pendA > CHUNK * 4) pendA = 0;
  if (!logM.length || t / 60 - logM[logM.length - 1][0] > 0.1) { const cp = amount(cell.cat, Q), ap = amount(anodeProd(), Q); logM.push([t / 60, cp.grams, ap.grams]); logG.push([t / 60, cp.cm3, Math.max(0, ap.cm3 - (anodeProd().dissolves || 0) * (1 - Math.exp(-ap.cm3 / 20)))]); if (logM.length > 900) { logM.splice(0, 1); logG.splice(0, 1); } }
}, dt => {
  draw(Math.min(dt, 0.05)); if (frame++ % 6) return;
  const cp = amount(cell.cat, Q), an = anodeProd(), ap = amount(an, Q), gasC = cell.cat.kind === "gas", gasA = an.kind === "gas", x1 = Math.max(5, t / 60);
  chM.draw([{ pts: gasC ? [] : logM.map(q => [q[0], q[1]]), color: "#6fb1ff", label: gasC ? "" : cell.cat.prod + " at the cathode", width: 2.2 }, { pts: copper ? logM.map(q => [q[0], q[2]]) : [], color: "#ff8a8a", label: copper ? "lost from the anode" : "", dash: [5, 4] }], { title: gasC ? "No solid forms at the cathode here" : "Mass of " + cell.cat.prod, xMin: 0, xMax: x1 });
  chG.draw([{ pts: gasC ? logG.map(q => [q[0], q[1]]) : [], color: "#6fb1ff", label: gasC ? cell.cat.prod + " (cathode)" : "", width: 2.2 }, { pts: gasA ? logG.map(q => [q[0], q[2]]) : [], color: "#ff8a8a", label: gasA ? an.prod + " (anode)" : "", width: 2.2 }], { title: gasC || gasA ? "Gas collected" : "No gas is collected here", xMin: 0, xMax: x1 });
  const anVol = Math.max(0, ap.cm3 - (an.dissolves || 0) * (1 - Math.exp(-ap.cm3 / 20))), show = (p, a, vol) => p.kind === "gas" ? `${vol.toFixed(0)} cm³ of ${p.prod}` : p.kind === "dissolve" ? `anode lost ${a.grams.toFixed(2)} g` : `${a.grams.toFixed(2)} g of ${p.prod}`;
  read.set("t", Math.floor(t / 60) + " min " + Math.floor(t % 60) + " s"); read.set("Q", Q.toFixed(0) + " C"); read.set("ne", (Q / FARADAY).toFixed(4) + " mol"); read.set("cat", show(cell.cat, cp, cp.cm3)); read.set("an", show(an, ap, anVol));
  read.set("sol", cell.molten ? (melted ? "molten" : "solid") : cellKey === "cuso4" && !copper ? Math.max(0, 0.5 - cp.mol * 10).toFixed(2) + " mol/dm³ Cu²⁺ (fading)" : cell.left ? "turning into " + cell.left : cellKey === "h2so4" ? "acid slowly more concentrated" : copper ? "stays blue" : "Cu²⁺ and Cl⁻ being removed");
  ui.hud(`<b style="font-size:15px">${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, "0")} s</b> · ${flowing() ? I.toFixed(1) : "0.0"} A<br>${Q.toFixed(0)} C = ${(Q / FARADAY).toFixed(4)} mol of electrons<br><span style="color:#6fb1ff">${show(cell.cat, cp, cp.cm3)}</span><br><span style="color:#ff8a8a">${show(an, ap, anVol)}</span>`);
});
set({ cell: "cuso4" });
ui.tip("Positive ions drift to the cathode, negative ions to the anode · electrons flow only in the wires", 8000);
