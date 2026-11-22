/* =====================================================================
   CRYSTALLISATION
   Crystals form in two steps:
     1. NUCLEATION: a tiny new crystal appears (more likely the further
        below the freezing point, or the more supersaturated the solution,
        and much more likely on dust or impurities).
     2. GROWTH: particles join existing crystals, which grow outwards
        until they meet their neighbours.
   Cooled SLOWLY, only a few crystals start and each has a long time to
   grow: few, BIG crystals (granite, a big copper sulfate crystal).
   Cooled QUICKLY, many crystals start at once: many SMALL crystals
   (basalt). Cooled very fast, the melt freezes before it can crystallise:
   a GLASS (obsidian).
   From a solution, crystals form when the solution is SATURATED: when
   cooling (or evaporating the water) leaves more dissolved than the
   solubility allows.
   The slice is 20 mm × 13 mm, divided into small square cells; each
   crystal has its own colour, as in a thin section under a polarising
   microscope. Theory (JMAK / Avrami): X = 1 − e^(−X_ext).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const W = 20, Hmm = 13;                                                       // the slice, in mm
const TM = 1100, TG = 650, T0 = 500, AV = 2763;                               // magma: freezing point, glass temperature, Vogel–Fulcher constants (°C)
const mob = T => Math.exp(-AV / Math.max(1, T - T0) + AV / (TM - T0));        // how easily atoms move: 1 at the freezing point, about 10⁻⁶ at the glass temperature
const LATENT = 350;                                                            // freezing all of it releases enough heat to warm it by 350 °C
// solubility tables (g per 100 g water at 0, 20, 40, 60, 80, 100 °C)
const SALTS = {
  cuso4: { name: "copper(II) sulfate", sol: [14.3, 20.7, 28.5, 40.0, 55.0, 75.4], hue: 205, kn: 1 },
  nacl: { name: "sodium chloride", sol: [35.7, 35.9, 36.4, 37.1, 38.0, 39.2], hue: 0, kn: 1 },
  alum: { name: "potash alum", sol: [3.0, 5.9, 11.7, 24.8, 71.0, 109], hue: 280, kn: 0.6 }
};
const solub = (k, T) => { const s = SALTS[k].sol, x = Math.max(0, Math.min(99.99, T)) / 20, i = Math.floor(x); return s[i] + (s[i + 1] - s[i]) * (x - i); };

/* ---- the grid model ----
   o = { kind: "magma" | "solution", cell (mm), rate (°C per hour for magma, °C per min for solutions), T (start), imp (impurity specks per mm²),
         nucF (nucleation factor), salt, conc (g per 100 g water), evap (% of the water per hour), seed } */
function makeSim(o, r) {
  const cell = o.cell || 0.1, nx = Math.round(W / cell), ny = Math.round(Hmm / cell), S = Object.assign({ nx, ny, cell, own: new Int32Array(nx * ny).fill(-1), xs: [], ys: [], rs: [], t: 0, X: 0, owned: 0, glass: false, T: o.T, specks: [], nf: 0, water: 100, crystM: 0, hist: [], tMax: 0 }, o);
  S.cosT = []; S.cos = [];
  const nSpeck = Math.round((o.imp || 0) * W * Hmm); for (let i = 0; i < nSpeck; i++) S.specks.push({ x: r() * W, y: r() * Hmm, used: false });
  if (o.kind === "solution") S.cmax = 60;                                      // grams of crystal that would fill the whole slice
  return S;
}
function addCrystal(S, x, y, r0 = 0) {
  const i = Math.min(S.nx - 1, Math.floor(x / S.cell)), j = Math.min(S.ny - 1, Math.floor(y / S.cell)), k = j * S.nx + i;
  if (S.own[k] >= 0) return; const id = S.xs.length; S.xs.push(x); S.ys.push(y); S.rs.push(Math.max(r0, S.cell * 0.6)); S.own[k] = id; S.owned++;
}
// grow every crystal outwards to radius r (until it meets others): fill free cells next to a crystal if they are within its radius
function grow(S, passes) {
  const { nx, ny, own, cell, xs, ys, rs } = S;
  for (let p = 0; p < passes; p++) {
    const add = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i; if (own[k] !== -1) continue;
      let best = -1;
      for (const n of [k - 1, k + 1, k - nx, k + nx]) { if (n < 0 || n >= nx * ny || (n === k - 1 && i === 0) || (n === k + 1 && i === nx - 1)) continue; const c = own[n]; if (c >= 0) { const dx = (i + 0.5) * cell - xs[c], dy = (j + 0.5) * cell - ys[c]; if (dx * dx + dy * dy <= rs[c] * rs[c]) { best = c; break; } } }
      if (best >= 0) add.push(k, best);
    }
    if (!add.length) break; for (let q = 0; q < add.length; q += 2) own[add[q]] = add[q + 1]; S.owned += add.length / 2;
  }
}
function poisson(lam, r) { if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * r.gauss())); let L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
// one step: the temperature falls by dT (magma) or time passes (solution)
function stepSim(S, r, dTstep) {
  const area = W * Hmm, free = 1 - S.owned / (S.nx * S.ny);
  let dt, G, I, Isp;
  if (S.kind === "magma") {
    dt = dTstep / S.rate * 3600; const dU = TM - S.T, M = mob(S.T);
    if (S.T < TG && !S.glass) { S.glass = S.X < 0.999; }
    if (S.glass || S.T < TG) { S.T -= dTstep; S.t += dt; return; }
    G = dU > 0 ? 2e-5 * M * dU / 100 : 0; I = dU > 0 ? 0.01 * (S.nucF ?? 1) * M * Math.pow(dU / 100, 2.5) : 0; Isp = dU > 0 ? 0.003 * M * dU / 100 : 0;
  } else {
    dt = dTstep; const s = solub(S.salt, S.T), c = S.dissolved / S.water * 100, Sx = c / s;
    S.Ssat = Sx; S.cNow = c; S.sNow = s;
    G = Sx > 1 ? 1.5e-3 * (Sx - 1) : 0; I = Sx > 1.02 ? 2e-3 * SALTS[S.salt].kn * Math.exp(-0.02 / Math.pow(Math.log(Sx), 2)) : 0; Isp = 0;
    S.T = Math.max(0, S.T - S.rate / 60 * dt); S.water = Math.max(20, S.water * (1 - S.evap / 100 / 3600 * dt));   // evaporation: a percentage of the water per hour
  }
  // nucleation in the melt or solution, and on impurity specks
  const nNew = poisson(I * area * free * dt, r); for (let q = 0; q < nNew; q++) for (let tries = 0; tries < 30; tries++) { const x = r() * W, y = r() * Hmm, k = Math.min(S.ny - 1, Math.floor(y / S.cell)) * S.nx + Math.min(S.nx - 1, Math.floor(x / S.cell)); if (S.own[k] < 0) { addCrystal(S, x, y); break; } }   // a new crystal can only start in liquid
  for (const sp of S.specks) if (!sp.used && r() < Isp * dt) { sp.used = true; addCrystal(S, sp.x, sp.y); }
  // growth
  const dr = G * dt; if (dr > 0) { for (let c = 0; c < S.rs.length; c++) S.rs[c] += dr; grow(S, Math.min(12, Math.ceil(dr / S.cell) + 1)); }
  const X = S.owned / (S.nx * S.ny), dX = X - S.X; S.X = X; S.t += dt;
  if (S.kind === "magma") S.T += -dTstep + LATENT * dX;                    // latent heat released by freezing slows the cooling (the plateau)
  else { const dm = dX * S.cmax; S.crystM += dm; S.dissolved -= dm; }
}
function runMagma(o, r) { const S = makeSim(Object.assign({ kind: "magma", T: 1150, cell: 0.1 }, o), r); let n = 0; while (S.T > TG - 20 && S.X < 0.999 && n++ < 6000) stepSim(S, r, 0.5); return S; }
const meanSize = S => S.xs.length ? 2 * Math.sqrt(S.X * W * Hmm / S.xs.length / Math.PI) : 0;   // mm: the diameter of the average-area crystal
const perCm2 = S => S.xs.length / (W * Hmm / 100);
// JMAK theory with the same rates and latent heat: cohorts of nuclei each growing as a circle
const JM = new Map();
function jmak(rate, imp = 0) {
  const key = rate.toPrecision(6) + "," + imp; if (JM.has(key)) return JM.get(key);
  let T = 1150, Xe = 0, X = 0, N = 0, spk = imp; const coh = [];             // spk: impurity specks per mm² not yet used (each starts at most one crystal)
  for (let n = 0; n < 8000 && T > TG && X < 0.999; n++) {
    const dTs = 0.5, dt = dTs / rate * 3600, dU = TM - T, M = mob(T), G = dU > 0 ? 2e-5 * M * dU / 100 : 0, I = dU > 0 ? 0.01 * M * Math.pow(dU / 100, 2.5) : 0, dSp = dU > 0 ? spk * (1 - Math.exp(-0.003 * M * dU / 100 * dt)) * (1 - X) : 0; spk -= dSp;
    const dN = I * (1 - X) * dt + dSp; if (dN > 0) { coh.push([dN, 0]); N += dN; }
    let ext = 0; for (const c of coh) { c[1] += G * dt; ext += c[0] * Math.PI * c[1] * c[1]; }
    const Xn = 1 - Math.exp(-ext); T += -dTs + LATENT * (Xn - X); X = Xn; Xe = ext;
  }
  const out = { N: N * 100, size: N > 0 ? 2 * Math.sqrt(X / N / Math.PI) : 0, X }; JM.set(key, out); return out;
}

// ---------------- The page ----------------
const P = { kind: "magma", lrate: 0, T: 1150, imp: 0.2, nucF: 1, salt: "cuso4", conc: 50, srate: 1, evap: 0, sT: 80 };
let rnd = K.rng(Date.now() % 99991 + 11), speed = 1, S = null, budget = 0, img = null, cols = [];
const ui = K.app({
  title: "Crystallisation", subject: "Chemistry",
  blurb: "Crystals forming in a cooling magma or solution: why slow cooling makes big crystals, fast cooling small ones, and very fast cooling a glass",
  reset: () => set({ kind: P.kind }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1): solubility and solubility curves (1(a)), crystallisation as a method of separation (1(b)) and making salt crystals (2(g)). Crystallisation of magma (granite, basalt, obsidian) is geology, beyond 4CH1.", adv: "Pearson Edexcel A level Chemistry (9CH0): recrystallisation to purify a solid (core practical 16), yields from solubility data, and the energetics of dissolving (Topic 13). Nucleation and the JMAK theory are beyond the spec." } },
  missions: [
    { title: "Granite or basalt?", q: "Cool the magma slowly (about 0.01 °C per hour, deep underground), then quickly (about 30 °C per hour, a lava flow). Compare the number and size of the crystals.", hint: "Slow cooling: few nuclei form, and each has a long time to grow: a few big crystals (granite, several mm). Fast cooling: the melt gets far below its freezing point quickly, so many nuclei form at once and none has time to grow big: many small crystals (basalt, under 1 mm).", setup() { set({ kind: "magma", lrate: -2 }); } },
    { title: "Obsidian: a glass", q: "Cool the magma very fast (more than 1000 °C per hour). What happens? Why is obsidian a glass, not a crystalline rock?", hint: "The melt reaches 650 °C, where the atoms can hardly move, before more than a little has crystallised. The rest is frozen in a disordered arrangement: a glass. Lava quenched in water or air forms obsidian.", setup() { set({ kind: "magma", lrate: 3.2 }); } },
    { title: "Porphyry", q: "Start cooling slowly; once a few big crystals have grown, switch to fast cooling (as when magma erupts). What does the rock look like?", hint: "A few big crystals (formed slowly underground) in a fine-grained matrix (formed quickly after eruption): a porphyry. The two crystal sizes record two stages of cooling.", setup() { set({ kind: "magma", lrate: -1 }); } },
    { title: "Impurities", q: "Add more impurity specks. How does the number of crystals change?", hint: "Crystals start much more easily on a surface (a speck of dust, a scratch) than in the pure melt: each speck can start a crystal. More specks, more crystals, so smaller crystals. That is why you scratch a glass to start crystals, or add a seed crystal.", setup() { set({ kind: "magma", lrate: 0, imp: 2 }); } },
    { title: "Copper sulfate crystals", q: "Cool a hot saturated copper sulfate solution slowly. When do crystals first appear? Look at the solubility readings.", hint: "Crystals appear once the solution is supersaturated: when the temperature falls below the point where the dissolved amount equals the solubility (the solubility curve). As crystals grow, the solution's concentration falls back towards the solubility.", setup() { set({ kind: "solution", salt: "cuso4", conc: 50, sT: 80, srate: 1 }); } },
    { title: "Salt by cooling?", q: "Try sodium chloride: cool a hot saturated solution. Why do hardly any crystals form? How do you get salt crystals instead?", hint: "Salt's solubility barely changes with temperature (36 g at 20 °C, 38 g at 80 °C), so cooling only pushes out a little. Instead, evaporate the water: switch on evaporation and the crystals appear (as in salt pans).", setup() { set({ kind: "solution", salt: "nacl", conc: 38, sT: 80, srate: 1 }); } },
    { title: "Seed crystal", q: "Click the picture to drop a seed crystal into a solution that is only slightly supersaturated. What happens?", hint: "The seed grows without needing new nuclei, so you get one large crystal rather than many small ones. This is how big single crystals are grown.", setup() { set({ kind: "solution", salt: "cuso4", conc: 42, sT: 80, srate: 0.5 }); } },
    { lvl: "adv", title: "Recrystallisation yield", q: "A solution has 50 g of copper sulfate in 100 g of water. Use the solubility curve to find the mass of crystals that forms when it cools to 20 °C. Why can a recrystallisation never give 100% yield?", hint: "At 20 °C only 20.7 g stays dissolved: 50 − 20.7 = 29.3 g crystallises (ignoring water of crystallisation). Some solid always stays dissolved in the cold solvent, so use the minimum of hot solvent and cool it well.", setup() { set({ kind: "solution", salt: "cuso4", conc: 50, sT: 80, srate: 2 }); } }
  ],
  batch: [
    { title: "Cooling rate and crystal size", question: "How does the cooling rate of a magma set the size of its crystals?", how: "Grid model (0.1 mm cells), cooling from 1150 °C at 0.01 to 30 °C per hour; mean crystal diameter. Theory: the JMAK equations with the same rates. Log–log axes.", xLabel: "log₁₀ (cooling rate in °C per hour)", yLabel: "log₁₀ (mean crystal size in mm)", xs: [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5], reps: 2, fit: true, theory: x => Math.log10(jmak(Math.pow(10, x)).size), theoryLabel: "JMAK theory", run: (x, r) => { const s = runMagma({ rate: Math.pow(10, x), imp: 0 }, r); return s.xs.length ? Math.log10(meanSize(s)) : null; }, note: "A straight line on log–log axes, gradient about −0.26 (theory −0.30): cool ten times faster and the crystals are about half the size. The grid gives crystals somewhat bigger than the JMAK formula, because each new crystal takes up a whole cell at once and releases its latent heat a little early; the trend is the same." },
    { title: "Cooling rate and number of crystals", question: "How many crystals per cm² form at each cooling rate?", how: "The same runs; crystals per cm² on log–log axes.", xLabel: "log₁₀ (cooling rate in °C per hour)", yLabel: "log₁₀ (crystals per cm²)", xs: [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5], reps: 2, fit: true, theory: x => Math.log10(jmak(Math.pow(10, x)).N), theoryLabel: "JMAK theory", run: (x, r) => { const s = runMagma({ rate: Math.pow(10, x), imp: 0 }, r); return Math.log10(Math.max(1, perCm2(s))); }, note: "Faster cooling, many more crystals (gradient about +0.5; theory +0.6): the melt gets far below its freezing point before the crystals can release enough latent heat to warm it, and nuclei form readily there. The grid counts up to about half as many as the formula, for the reason given in the previous experiment." },
    { title: "Impurities and the number of crystals", question: "How do impurity specks change the number of crystals?", how: "Cooling at 1 °C per hour; 0 to 5 specks per mm².", xLabel: "impurity specks per mm²", yLabel: "crystals per cm²", xs: [0, 1, 2, 3, 4, 5], reps: 3, yMin: 0, theory: x => jmak(1, x).N, theoryLabel: "JMAK theory", run: (x, r) => perCm2(runMagma({ rate: 1, imp: x }, r)), note: "More specks, more crystals (and so smaller ones): nucleation is easier on a surface than in the bulk." },
    { title: "Crystals from cooling copper sulfate", question: "What mass of crystals forms when 100 g of water saturated with copper sulfate at 80 °C is cooled to different temperatures?", how: "Theory: the difference in solubility (55.0 g at 80 °C minus the solubility at the final temperature). Each run: weighed on a balance (±0.2 g) after filtering, with 0.5 g lost on the filter paper on average.", xLabel: "final temperature (°C)", yLabel: "mass of crystals (g)", xs: [0, 10, 20, 30, 40, 50, 60, 70], reps: 4, yMin: 0, theory: x => 55 - solub("cuso4", x), theoryLabel: "from the solubility curve", run: (x, r) => Math.max(0, 55 - solub("cuso4", x) - Math.abs(0.5 + 0.3 * r.gauss()) + 0.2 * r.gauss()), note: "The colder you cool it, the more crystallises, following the solubility curve. Results sit a little below theory: some solid always stays on the filter paper or is lost when washing (a systematic error)." },
    { title: "Which salts crystallise on cooling?", question: "How much of each salt crystallises when a solution saturated at 80 °C (in 100 g of water) cools to 20 °C?", how: "1 copper(II) sulfate, 2 sodium chloride, 3 potash alum; from the solubility tables, weighed ±0.2 g.", xLabel: "salt (1 copper sulfate, 2 sodium chloride, 3 potash alum)", yLabel: "mass of crystals (g)", xs: [1, 2, 3], reps: 4, yMin: 0, run: (x, r) => { const k = ["cuso4", "nacl", "alum"][x - 1]; return solub(k, 80) - solub(k, 20) + 0.2 * r.gauss(); }, note: "Alum and copper sulfate crystallise well on cooling (steep solubility curves); salt hardly at all (a flat curve), so salt is crystallised by evaporating the water." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 1(a)", text: "Solubility: the mass of solute that dissolves in 100 g of water at a given temperature to make a saturated solution. A solubility curve shows how it changes with temperature." },
      { lvl: "std", tag: "4CH1 1(b)", text: "Crystallisation separates a dissolved solid: heat to evaporate some water until the solution is saturated, then leave it to cool; crystals form; filter and dry them." },
      { lvl: "std", tag: "4CH1 2(g)", text: "Making a soluble salt: react an acid with an excess of insoluble base, filter off the excess, then crystallise the salt from the filtrate." },
      { lvl: "std", tag: "geology", text: "Igneous rocks: slow cooling (intrusive, e.g. granite) gives large crystals; fast cooling (extrusive, e.g. basalt) gives small crystals; very fast cooling gives a glass (obsidian)." },
      { lvl: "std", tag: "beyond spec", text: "Crystals form by nucleation (a new crystal starts) and growth. Many nuclei → many small crystals; few nuclei → few large crystals. Impurities and seed crystals make nucleation easier." },
      { lvl: "adv", tag: "9CH0 CP16", text: "Recrystallisation: dissolve the impure solid in the minimum of hot solvent, filter hot to remove insoluble impurities, cool to crystallise, filter, wash with a little cold solvent, dry; check purity with a sharp melting point." },
      { lvl: "adv", tag: "9CH0 13", text: "Enthalpy of solution = −(lattice energy) + Σ enthalpies of hydration. If it is positive, dissolving cools the solution and solubility usually rises with temperature." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why granite has larger crystals than basalt.", ans: "<ul><li>granite cooled slowly (underground)</li><li>so fewer crystals started and they had more time to grow</li></ul>" },
      { lvl: "std", marks: 3, q: () => `A solution contains ${P.conc} g of ${SALTS[P.salt].name} in 100 g of water. Using the solubility table (${SALTS[P.salt].sol.join(", ")} g at 0–100 °C in 20 °C steps), find the mass of crystals formed on cooling to 20 °C.`, ans: () => { const s = solub(P.salt, 20), m = Math.max(0, P.conc - s); return `<ul><li>solubility at 20 °C = ${s.toFixed(1)} g per 100 g water</li><li>mass crystallising = ${P.conc} − ${s.toFixed(1)}</li><li>= ${m.toFixed(1)} g${m === 0 ? " (none: it is not saturated at 20 °C)" : ""}</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Why is sodium chloride usually crystallised by evaporation rather than by cooling?", ans: "<ul><li>its solubility hardly changes with temperature</li><li>so cooling makes very few crystals; removing the water forces it out</li></ul>" },
      { lvl: "std", marks: 2, q: "Describe how to obtain dry crystals of copper(II) sulfate from its solution.", ans: "<ul><li>heat to evaporate some water until crystals start to form (saturated), then leave to cool</li><li>filter off the crystals and dry them between filter papers or in a warm oven</li></ul>" },
      { lvl: "adv", marks: 3, q: "In a recrystallisation, why is the minimum volume of hot solvent used, and why are the crystals washed with cold solvent?", ans: "<ul><li>minimum hot solvent: so the solution is saturated and as much as possible crystallises on cooling (higher yield)</li><li>cold solvent: to wash away soluble impurities without dissolving much product</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>The grid</b>: a 20 mm × 13 mm slice of 0.1 mm cells. A new crystal is a point; it grows outwards as a circle (filling free cells) until it meets other crystals.</li>
<li><b>Magma</b>: freezing point 1100 °C, glass temperature 650 °C. Mobility M(T) = e^(−A/(T − T₀)) (Vogel–Fulcher), 1 at the freezing point, about 10⁻⁶ at 650 °C. Growth G = 2 × 10⁻⁵ mm/s × M × ΔT/100; nucleation I = 0.01 per mm² per s × M × (ΔT/100)^2.5, and each impurity speck starts a crystal at 0.003 per s × M × ΔT/100 (ΔT = 1100 °C − T). Freezing everything releases enough heat to warm the melt by 350 °C: this makes the plateau, and the temperature jump when a supercooled melt suddenly crystallises. Below 650 °C whatever has not crystallised is glass.</li>
<li><b>Solutions</b>: the supersaturation S = concentration ÷ solubility (from tables for 0–100 °C). Nucleation rises very steeply once S > 1; growth ∝ (S − 1). Each crystal that grows takes solute out of the solution; evaporation removes water. Click to add a seed crystal.</li>
<li><b>Theory</b>: JMAK (Avrami): extended area X_ext = Σ πr², crystallised fraction X = 1 − e^(−X_ext), new nuclei dN = I(1 − X)dt, with the same rates and latent heat.</li></ul>
<h3>Simplifications</h3>
<ul><li>One mineral with one freezing point (real magmas have several minerals and freeze over a range); crystals are round, not faceted; no convection; the slice is all at one temperature.</li>
<li>Solutions: no diffusion of the dissolved particles (the earlier version modelled it, with dendrites); no water of crystallisation; the heat released by crystallising salts is ignored.</li>
<li>The grid cannot show crystals smaller than about two cells or bigger than the slice. It gives up to about half as many crystals as the JMAK formula at middle cooling rates (each new crystal fills a whole cell at once), with the same trends.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/crystallisation.html">original/crystallisation.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("What is crystallising?");
ctl.kind = K.seg(g, { value: "magma", options: [["magma", "🌋 Molten rock"], ["solution", "🧪 A salt solution"]], on: v => set({ kind: v }) });
grp.magma = g = ui.group("Magma");
ctl.lrate = K.slider(g, { label: "Cooling rate", min: -3, max: 4, step: 0.1, value: 0, fmt: v => rateTxt(Math.pow(10, v)), on: v => P.lrate = v });
ctl.T = K.slider(g, { label: "Starting temperature", min: 1100, max: 1250, step: 10, value: 1150, unit: "°C", on: v => { P.T = v; newSim(); } });
ctl.imp = K.slider(g, { label: "Impurity specks", min: 0, max: 5, step: 0.1, value: 0.2, unit: "per mm²", on: v => { P.imp = v; newSim(); } });
grp.solution = g = ui.group("Solution");
ctl.salt = K.seg(g, { value: "cuso4", options: Object.keys(SALTS).map(k => [k, SALTS[k].name]), on: v => { P.salt = v; P.conc = Math.round(solub(v, P.sT) * 10) / 10; ctl.conc.set(P.conc); newSim(); } });
ctl.sT = K.slider(g, { label: "Starting temperature", min: 20, max: 95, step: 1, value: 80, unit: "°C", on: v => { P.sT = v; newSim(); } });
ctl.conc = K.slider(g, { label: "Dissolved", min: 2, max: 110, step: 0.5, value: 50, fmt: v => v + " g per 100 g water", on: v => { P.conc = v; newSim(); } });
ctl.srate = K.slider(g, { label: "Cooling rate", min: 0, max: 5, step: 0.1, value: 1, unit: "°C per min", on: v => P.srate = v });
ctl.evap = K.slider(g, { label: "Evaporation", min: 0, max: 30, step: 1, value: 0, unit: "% of the water per hour", on: v => P.evap = v });
K.note(g, "Click the picture to drop in a seed crystal.");
g = ui.group("Run");
K.btn(K.row(g), "↺ Start again", () => newSim(), "primary");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["T", "temperature"], ["st", "status"], ["n", "crystals per cm²"], ["sz", "mean crystal size"], ["x", "crystallised"]]);
function rateTxt(r) { if (r >= 60) return K.sig(r / 60, 2) + " °C per minute"; if (r >= 1) return K.sig(r, 2) + " °C per hour"; if (r >= 1 / 24) return K.sig(r * 24, 2) + " °C per day"; if (r >= 1 / 8766) return K.sig(r * 8766, 2) + " °C per year"; return K.sig(r * 8766e3, 2) + " °C per 1000 years"; }
function timeTxt(s) { if (s < 120) return s.toFixed(0) + " s"; if (s < 7200) return (s / 60).toFixed(1) + " min"; if (s < 172800) return (s / 3600).toFixed(1) + " hours"; if (s < 3.156e7 * 2) return (s / 86400).toFixed(0) + " days"; return K.sig(s / 3.156e7, 3) + " years"; }
function newSim() {
  S = P.kind === "magma" ? makeSim({ kind: "magma", rate: Math.pow(10, P.lrate), T: P.T, imp: P.imp, cell: 0.1 }, rnd)
    : makeSim({ kind: "solution", salt: P.salt, T: P.sT, rate: P.srate, evap: P.evap, imp: 0, cell: 0.1 }, rnd);
  if (P.kind === "solution") { S.dissolved = P.conc; S.water = 100; }
  cols = []; img = null; budget = 0;
}
function set(o) {
  Object.assign(P, { lrate: 0, T: 1150, imp: 0.2, salt: "cuso4", conc: 50, srate: 1, evap: 0, sT: 80 }, o);
  for (const k of ["lrate", "T", "imp", "sT", "conc", "srate", "evap"]) ctl[k].set(P[k]); ctl.kind.set(P.kind); ctl.salt.set(P.salt);
  for (const k in grp) grp[k].style.display = k === P.kind ? "" : "none";
  newSim();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { img = null; });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let view = { ox: 0, oy: 0, sc: 1 };
K.pointer(cv.el, { down: (x, y) => { if (P.kind !== "solution") return; const mx = (x - view.ox) / view.sc, my = (view.oy + Hmm * view.sc - y) / view.sc; if (mx > 0 && mx < W && my > 0 && my < Hmm) { addCrystal(S, mx, my, 0.3); ui.tip("Seed crystal added", 1500); } } });
function colour(id) { while (cols.length <= id) { const h = P.kind === "magma" ? (cols.length * 137.5) % 360 : SALTS[P.salt].hue + (rnd() - 0.5) * 30, l = P.kind === "magma" ? 45 + rnd() * 30 : 45 + rnd() * 25; const c = hsl(h, P.kind === "magma" ? 45 : 70, l); cols.push(c); } return cols[id]; }
function hsl(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [255 * f(0), 255 * f(8), 255 * f(4)].map(Math.round); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const sc = Math.min((w - 60) / W, (h - 90) / Hmm), ox = (w - W * sc) / 2, oy = 40; view = { ox, oy, sc };
  if (!img || img.width !== S.nx) { img = document.createElement("canvas"); img.width = S.nx; img.height = S.ny; }
  const ix = img.getContext("2d"), id = ix.createImageData(S.nx, S.ny), d = id.data;
  const hot = P.kind === "magma" ? Math.max(0, Math.min(1, (S.T - 600) / 600)) : 0, melt = S.glass ? [40, 40, 48] : P.kind === "magma" ? [Math.round(60 + 180 * hot), Math.round(20 + 70 * hot), 20] : [30, 60, 110];
  for (let j = 0; j < S.ny; j++) for (let i = 0; i < S.nx; i++) { const k = j * S.nx + i, o = ((S.ny - 1 - j) * S.nx + i) * 4, own = S.own[k], col = own >= 0 ? colour(own) : melt; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
  ix.putImageData(id, 0, 0); c.imageSmoothingEnabled = sc * S.cell > 3; c.drawImage(img, ox, oy, W * sc, Hmm * sc); c.imageSmoothingEnabled = true;
  c.strokeStyle = "#3a4560"; c.strokeRect(ox, oy, W * sc, Hmm * sc);
  c.fillStyle = "#eef2f8"; c.fillRect(ox + W * sc - 5 * sc - 6, oy + Hmm * sc + 12, 5 * sc, 3); TX(c, "5 mm", ox + W * sc - 2.5 * sc - 6, oy + Hmm * sc + 30, "#eef2f8", "center", "11px");
  TX(c, `${P.kind === "magma" ? "Molten rock" : SALTS[P.salt].name + " solution"} · ${timeTxt(S.t)} · ${S.T.toFixed(1)} °C`, ox, 26, "#eef2f8", "left", "600 13px");
  if (S.glass) TX(c, "Below 650 °C: the rest froze as GLASS (black)", ox, oy + Hmm * sc + 30, "#ff8a70", "left", "600 12px");
}

// ---------------- Charts ----------------
function charts() {
  const hist = S.hist;
  if (P.kind === "magma") {
    chA.opts.title = "Cooling curve"; chA.opts.xLabel = "time (hours)"; chA.opts.yLabel = "temperature (°C)"; chA.opts.xFmt = null;
    chA.draw([{ pts: hist.map(q => [q[0] / 3600, q[1]]), color: "#ff8a70", label: "temperature" }], { yMin: 600, yMax: 1260, xMin: 0, hlines: [{ y: TM, color: "#ffd166", label: "freezing point 1100 °C" }, { y: TG, color: "#7d8aa5", label: "glass 650 °C" }] });
  } else {
    const sc = [], cc = []; for (let T = 0; T <= 100; T += 2) sc.push([T, solub(P.salt, T)]);
    chA.opts.title = "Solubility curve and the solution"; chA.opts.xLabel = "temperature (°C)"; chA.opts.yLabel = "g per 100 g water"; chA.opts.xFmt = null;
    chA.draw([{ pts: sc, color: "#6fb1ff", label: "solubility (saturated)" }, { pts: hist.map(q => [q[1], q[3]]), color: "#ffd166", label: "dissolved in this solution" }], { xMin: 0, xMax: 100, yMin: 0 });
  }
  // crystal size histogram
  const sizes = []; const area = new Float64Array(S.xs.length); for (let k = 0; k < S.own.length; k++) if (S.own[k] >= 0) area[S.own[k]]++;
  for (let i = 0; i < area.length; i++) if (area[i] > 0) sizes.push(2 * Math.sqrt(area[i] * S.cell * S.cell / Math.PI));
  const mx = Math.max(0.5, ...sizes), nb = 16, bins = new Array(nb).fill(0); for (const s of sizes) bins[Math.min(nb - 1, Math.floor(s / mx * nb))]++;
  chB.opts.title = "Crystal sizes"; chB.opts.xLabel = "crystal diameter (mm)"; chB.opts.yLabel = "number of crystals"; chB.opts.xFmt = null;
  chB.draw([{ pts: bins.map((n, i) => [(i + 0.5) * mx / nb, n]), type: "bars", w: mx / nb * 0.9, color: "#7fe3a0" }], { xMin: 0, xMax: mx, yMin: 0 });
  const status = P.kind === "magma" ? (S.glass ? "glass (obsidian)" : S.X > 0.999 ? "solid rock" : S.T > TM ? "molten" : S.xs.length === 0 ? "supercooled" : "crystallising") : (S.Ssat > 1 ? (S.xs.length ? "crystallising" : "supersaturated") : "unsaturated");
  read.set("T", S.T.toFixed(1) + " °C"); read.set("st", status); read.set("n", K.sig(perCm2(S), 3)); read.set("sz", meanSize(S).toFixed(2) + " mm"); read.set("x", P.kind === "magma" ? (S.X * 100).toFixed(1) + "%" : `${S.crystM.toFixed(1)} g of crystals`);
  ui.hud(P.kind === "magma" ? (S.glass ? "Frozen before it could crystallise: a glass" : S.X > 0.999 ? `Solid: ${S.xs.length} crystals` : "Nuclei appear and grow until they meet") : S.Ssat > 1 ? `Supersaturated: ${S.cNow.toFixed(1)} g dissolved but only ${S.sNow.toFixed(1)} g can stay dissolved` : S.xs.length ? `Saturated: ${S.cNow.toFixed(1)} g dissolved, as much as it can hold at ${S.T.toFixed(0)} °C` : `Not saturated yet: ${S.cNow ? S.cNow.toFixed(1) : P.conc} g dissolved, solubility ${solub(P.salt, S.T).toFixed(1)} g`);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0) || !S) return;
  if (P.kind === "magma") {
    S.rate = Math.pow(10, P.lrate); if (S.X > 0.999 || S.T < TG - 30) return;
    budget += dt * 15 * speed; let n = 0; while (budget > 0.5 && n++ < 20) { stepSim(S, rnd, 0.5); budget -= 0.5; }
    S.hist.push([S.t, S.T]);
  } else {
    S.rate = P.srate; S.evap = P.evap; const secs = dt * 120 * speed, n = Math.ceil(secs / 10); for (let k = 0; k < n; k++) stepSim(S, rnd, secs / n);
    S.hist.push([S.t, S.T, 0, S.dissolved / S.water * 100]);
  }
  if (S.hist.length > 3000) S.hist = S.hist.filter((_, i) => i % 2 === 0);
}, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({ kind: "magma" });
ui.tip("Cooling rate sets the crystal size. Slide it from slow (granite) to fast (basalt) and very fast (obsidian, a glass).", 7000);
