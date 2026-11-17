/* =====================================================================
   BIOTECHNOLOGY AND GENETIC ENGINEERING
   Using living things to make food and medicines:
     • GLASSHOUSES control light, carbon dioxide and temperature, the
       LIMITING FACTORS of photosynthesis, to grow more crops.
     • FERTILISERS add nitrogen for more yield, but too much is wasted
       and washes into rivers.
     • FERMENTERS grow microorganisms in controlled conditions (temperature,
       pH, oxygen, nutrients), with ASEPTIC precautions to keep out other
       microbes: e.g. bacteria that make human insulin.
     • GENETIC ENGINEERING: cut the insulin gene out with a RESTRICTION
       ENZYME, cut a PLASMID with the same enzyme, join them with LIGASE,
       and put the plasmid into bacteria.
     • SELECTIVE BREEDING: breed from the best individuals, generation
       after generation. How fast it works depends on HERITABILITY.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ----- glasshouse: rate of photosynthesis (relative) from light (%), CO₂ (ppm) and temperature (°C)
const fT = T => T > 45 ? 0 : Math.exp(-(((T - 26) / 9) ** 2)) * (T > 38 ? (45 - T) / 7 : 1);
const photo = (L, C, T) => 100 * L / (L + 25) * (C - 50) / (C + 350) * fT(T) / (100 / 125 * 950 / 1350);
function season(o) { const yieldKg = 0.4 * photo(o.L, o.C, o.T), heat = Math.max(0, o.T - 12) * 70, co2 = Math.max(0, o.C - 400) * 0.9, lamps = Math.max(0, o.L - 60) * 30; return { yieldKg, income: yieldKg * 1.5 * 100, cost: heat + co2 + lamps, profit: yieldKg * 150 - heat - co2 - lamps }; }   // 100 plants, tomatoes £1.50/kg (illustrative)
// ----- fertiliser: wheat yield (t/ha) against nitrogen (kg/ha), with plot-to-plot variation
const wheat = N => 5.1 + 5.35 * (1 - Math.exp(-N / 75));
const uptake = N => 155 * (1 - Math.exp(-N / 110));
const leach = N => Math.max(0, N - uptake(N)) * 0.6;
const optimumN = (pW = 180, pN = 0.8) => { let best = 0, bN = 0; for (let N = 0; N <= 400; N++) { const v = pW * wheat(N) - pN * N; if (v > best) { best = v; bN = N; } } return bN; };
// ----- fermenter: bacteria grow (logistic) at a rate that depends on temperature, pH and oxygen; insulin made by the growing cells
const mu = (T, pH, O2) => (T > 46 ? -0.5 : 0.45 * Math.exp(-(((T - 37) / 4.5) ** 2))) * Math.exp(-(((pH - 7) / 0.9) ** 2)) * O2 / (O2 + 0.15);
function ferment(o, hours = 48) { let X = 0.01, I = 0, t = 0; const dt = 0.05, out = []; for (; t <= hours; t += dt) { const m = mu(o.T, o.pH, o.O2), g = m * X * (1 - X / 10); X = Math.max(1e-6, X + dt * g); I += dt * 0.0025 * X * (T => Math.exp(-(((T - 37) / 6) ** 2)))(o.T) * (o.T > 46 ? 0 : 1); if (Math.round(t / dt) % 10 === 0) out.push([t, X, I]); } return { X, I, out }; }
// ----- selective breeding: a herd of cows; milk yield = genetic value + environment; breed from the top 20% each generation
function breed(o, r) {
  const n = 200, sg0 = Math.sqrt(o.h2) * 600, se = Math.sqrt(1 - o.h2) * 600; let gs = Array.from({ length: n }, () => 7000 + sg0 * r.gauss()); const means = [K.mean(gs)];
  for (let gen = 0; gen < o.gens; gen++) {
    const ph = gs.map(gv => ({ gv, p: gv + se * r.gauss() })).sort((a, b) => b.p - a.p), sel = ph.slice(0, Math.round(n * o.sel)).map(q => q.gv);
    gs = Array.from({ length: n }, () => { const a = sel[Math.floor(r() * sel.length)], b = sel[Math.floor(r() * sel.length)]; return (a + b) / 2 + sg0 / Math.SQRT2 * r.gauss() * 0.8; });
    means.push(K.mean(gs));
  }
  return means;
}
const selInt = s => { const z = [[0.05, 2.06], [0.1, 1.75], [0.2, 1.4], [0.3, 1.16], [0.5, 0.8]]; let best = z[0]; for (const q of z) if (Math.abs(q[0] - s) < Math.abs(best[0] - s)) best = q; return best[1]; };
const breederEq = (h2, gens, sel = 0.2) => h2 * selInt(sel) * 600 * gens;
const GE_STEPS = ["1. Find the human insulin gene in human DNA", "2. Cut it out with a restriction enzyme: it leaves 'sticky ends'", "3. Cut open a bacterial plasmid with the SAME restriction enzyme (matching sticky ends)", "4. DNA ligase joins the gene into the plasmid: a recombinant plasmid", "5. Put the plasmid into bacteria (the vector carries the gene in)", "6. The bacteria multiply in a fermenter and make human insulin"];

// ---------------- The page ----------------
const P = { view: "glass", L: 60, C: 400, T: 20, N: 100, fT: 37, pH: 7, O2: 1, aseptic: true, step: 0, h2: 0.3, sel: 0.2, gens: 10 };
let rnd = K.rng(Date.now() % 9973 + 21), plots = [], ferm = null, fermT = 0, herd = [], geT = 0, batches = [];
const ui = K.app({
  title: "Biotechnology and Genetic Engineering", subject: "Biology",
  blurb: "Glasshouses and limiting factors, fertilisers, fermenters, genetic engineering of insulin, and selective breeding",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 5: food production (glasshouses: CO₂, temperature and light; fertilisers; pest control), industrial fermenters (aseptic precautions, nutrients, temperature, pH, oxygen, agitation), selective breeding, genetic modification (restriction enzymes, ligase, plasmids, human insulin, GM crops), cloning.", adv: "OCR A level Biology A (H420) 6.1.3 manipulating genomes (genetic engineering, ethics) and 6.2.1 cloning and biotechnology (microorganisms in biotechnology, culturing and growth curves), 6.1.2 artificial selection and its consequences. The breeder's equation and the economic optimum of fertiliser are beyond the spec." } },
  missions: [
    { title: "Limiting factors in a glasshouse", q: "Raise the CO₂ in a dim glasshouse. Does the yield go up? Now add light. Which factor is limiting?", hint: "In dim light, light is the limiting factor: extra CO₂ hardly helps. With more light, CO₂ becomes limiting and extra CO₂ raises the yield. Growers raise whichever factor is limiting.", setup() { set({ view: "glass", L: 20, C: 1000 }); } },
    { title: "Does it pay?", q: "Heat the glasshouse to 30 °C and burn gas for 1000 ppm CO₂. Does the extra crop pay for the fuel?", hint: "Not always: beyond the optimum the extra yield is small but the costs keep rising. Profit is highest at a moderate temperature and CO₂.", setup() { set({ view: "glass", T: 30, C: 1000, L: 80 }); } },
    { title: "Fertiliser", q: "Add more and more nitrogen fertiliser to the wheat field. What happens to the yield and to the nitrate washing into the river?", hint: "Yield rises steeply at first, then levels off (another factor becomes limiting). Beyond what the crop can take up, nitrate leaches into rivers: eutrophication.", setup() { set({ view: "field", N: 250 }); } },
    { title: "The fermenter", q: "Grow insulin-making bacteria at 37 °C, pH 7 with plenty of oxygen. Then try 25 °C and 50 °C. Why does temperature matter?", hint: "Enzymes in the bacteria work fastest near 37 °C; colder is slower, and above about 45 °C they denature and the bacteria die. The fermenter has a water jacket to remove the heat the bacteria make.", setup() { set({ view: "ferm", fT: 37 }); } },
    { title: "Aseptic technique", q: "Run 20 batches without aseptic precautions. How many are lost to contamination?", hint: "About 4 in 10: other microbes compete for nutrients or spoil the product. Sterilising the fermenter and nutrients with steam, and filtering the air, keeps them out.", setup() { set({ view: "ferm", aseptic: false }); } },
    { title: "Making human insulin", q: "Step through the genetic engineering of bacteria. Why must the same restriction enzyme cut the gene and the plasmid?", hint: "The same enzyme leaves matching sticky ends, which pair up so ligase can join the gene into the plasmid. The bacteria then make human insulin for people with diabetes.", setup() { set({ view: "ge", step: 0 }); } },
    { title: "Selective breeding", q: "Breed cows for milk yield for 10 generations, keeping the top 20% each time. How much does the yield go up?", hint: "Several hundred litres per generation at first. Selective breeding can also reduce variety (inbreeding, less resistance to disease).", setup() { set({ view: "breed", h2: 0.3 }); } },
    { lvl: "adv", title: "Heritability", q: "Compare heritability 0.1 and 0.9. Does the breeder's equation R = h²S predict the gain over 10 generations?", hint: "Higher heritability, faster progress. Over many generations the real gain falls below R = h²S × generations, because selection uses up the genetic variation (and some is lost by drift).", setup() { set({ view: "breed", h2: 0.9 }); } },
    { lvl: "adv", title: "Economic optimum", q: "Find the nitrogen dose that gives the most profit (wheat £180/t, nitrogen £0.80/kg). Is it the dose that gives the most yield?", hint: "No: the last few kilograms of nitrogen add too little wheat to pay for themselves, so the economic optimum (about 180 kg/ha here) is below the dose that maximises yield.", setup() { set({ view: "field", N: 180 }); } }
  ],
  batch: [
    { title: "Nitrogen and wheat yield", question: "How does wheat yield depend on nitrogen fertiliser?", how: "8 plots at each dose; plots differ (SD 0.4 t/ha).", xLabel: "nitrogen (kg/ha)", yLabel: "yield (t/ha)", xs: [0, 50, 100, 150, 200, 250, 300], reps: 8, yMin: 0, theory: wheat, theoryLabel: "yield curve", run: (N, r) => wheat(N) + 0.4 * r.gauss(), note: "Diminishing returns: each extra kilogram adds less wheat, and the extra is wasted (and pollutes) beyond what the crop can use." },
    { title: "Selective breeding: does heritability matter?", question: "How much does milk yield rise in 10 generations of breeding from the top 20%?", how: "200 cows; phenotype SD 600 L; heritability h² swept.", xLabel: "heritability h²", yLabel: "gain after 10 generations (L)", xs: [0.1, 0.3, 0.5, 0.7, 0.9], reps: 6, yMin: 0, theory: h2 => breederEq(h2, 10), theoryLabel: "breeder's equation × 10", run: (h2, r) => { const m = breed({ h2, sel: 0.2, gens: 10 }, r); return m[m.length - 1] - m[0]; }, note: "Higher heritability gives faster progress, but below the breeder's equation: selection uses up the variation it works on." },
    { title: "Fermenter temperature", question: "How much insulin is there after 48 hours at different temperatures?", how: "pH 7, plenty of oxygen; no randomness (the same culture each time).", xLabel: "temperature (°C)", yLabel: "insulin (g/dm³)", xs: [20, 25, 30, 35, 37, 40, 45, 50], reps: 1, yMin: 0, theory: T => ferment({ T, pH: 7, O2: 1 }).I, theoryLabel: "model", run: T => ferment({ T, pH: 7, O2: 1 }).I, note: "A sharp optimum near 37 °C (body temperature for the bacteria's enzymes); above about 45 °C almost nothing is made." },
    { title: "Aseptic technique: how many batches are lost?", question: "Without aseptic precautions, how many of 20 batches are contaminated?", how: "Each batch has a 38% chance of contamination without precautions.", yLabel: "batches lost (of 20)", reps: 300, bins: 16, theory: 20 * 0.38, theoryLabel: "binomial mean", run: (x, r) => { let k = 0; for (let i = 0; i < 20; i++) if (r() < 0.38) k++; return k; }, note: "A binomial spread around 7.6. With aseptic precautions (about 1% risk) almost none are lost." },
    { title: "Limiting factors: CO₂ in dim and bright light", question: "How does the rate of photosynthesis respond to CO₂ at 20% light?", how: "Temperature 22 °C; the rate model (no randomness).", xLabel: "CO₂ (ppm)", yLabel: "rate of photosynthesis (relative)", xs: [200, 400, 600, 800, 1000, 1200], reps: 1, yMin: 0, theory: C => photo(80, C, 22), theoryLabel: "at 80% light", run: C => photo(20, C, 22), note: "In dim light (points) extra CO₂ helps little: light is limiting. In bright light (line) CO₂ is the limit, so adding it pays." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 5(a)", text: "Glasshouses and polythene tunnels increase yield by controlling temperature, light and carbon dioxide concentration (the limiting factors of photosynthesis)." },
      { lvl: "std", tag: "4BI1 5(a)", text: "Fertilisers replace minerals (nitrate for proteins); too much leaches into rivers and causes eutrophication. Pest control: pesticides or biological control." },
      { lvl: "std", tag: "4BI1 5(a)", text: "Industrial fermenters: aseptic precautions (steam sterilising), nutrients, optimum temperature (water jacket) and pH, oxygen (sterile air) and agitation (paddles)." },
      { lvl: "std", tag: "4BI1 5(c)", text: "Genetic modification: restriction enzymes cut DNA leaving sticky ends; ligase joins DNA; plasmids and viruses are vectors. Bacteria can make human insulin; GM crops resist pests or herbicides." },
      { lvl: "std", tag: "4BI1 5(b)", text: "Selective breeding: choose parents with the desired features, breed them, select the best offspring, repeat for many generations." },
      { lvl: "adv", tag: "H420 6.2.1", text: "Microbial growth curve: lag, log (exponential), stationary, death phases. Batch and continuous culture; primary and secondary metabolites." },
      { lvl: "adv", tag: "H420 6.1.2", text: "Artificial selection reduces genetic diversity (inbreeding depression, susceptibility to disease); gene banks conserve resources. Breeder's equation R = h²S (beyond the spec)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why increasing the carbon dioxide concentration in a glasshouse may not increase the yield of tomatoes on a dull winter day.", ans: "<ul><li>light intensity is low on a dull day</li><li>light is the limiting factor, not carbon dioxide</li><li>so extra CO₂ does not increase the rate of photosynthesis</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe how bacteria can be genetically modified to produce human insulin.", ans: "<ul><li>the insulin gene is cut from human DNA with a restriction enzyme</li><li>a plasmid is cut with the same enzyme (matching sticky ends)</li><li>ligase joins the gene into the plasmid</li><li>the plasmid is put into bacteria, which are grown in a fermenter and make insulin</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why a fermenter is kept at 37 °C and why it has a water jacket.", ans: "<ul><li>optimum temperature for the microorganisms' enzymes</li><li>respiration releases heat, which would raise the temperature</li><li>cold water in the jacket removes heat so enzymes are not denatured</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Heritability of milk yield is ${P.h2}. Farmers select cows whose yield is 840 L above the herd mean. Predict the response in one generation, and explain why the gain may be smaller over many generations.`, ans: () => `<ul><li>R = h²S = ${P.h2} × 840 = ${(P.h2 * 840).toFixed(0)} L</li><li>selection reduces genetic variation over generations</li><li>so later responses are smaller (and inbreeding may reduce fitness)</li></ul>` }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Glasshouse:</b> rate ∝ L/(L + 25) × (CO₂ − 50)/(CO₂ + 350) × a temperature curve peaking at 26 °C and falling to zero at 45 °C (enzymes denature). Season yield ∝ rate; costs for 100 plants: heating above 12 °C, burning gas above 400 ppm, lamps above 60% light; tomatoes £1.50/kg (illustrative prices).</li>
<li><b>Fertiliser:</b> yield = 5.1 + 5.35(1 − e^(−N/75)) t/ha; plots vary (SD 0.4). Uptake 155(1 − e^(−N/110)) kg/ha; 60% of the rest leaches. Economic optimum at wheat £180/t, nitrogen £0.80/kg.</li>
<li><b>Fermenter:</b> logistic growth of bacteria at rate μ(T, pH, O₂) with an optimum at 37 °C and pH 7; insulin made by the cells at a rate that is also fastest at 37 °C. Without aseptic precautions each batch has a 38% chance of being lost.</li>
<li><b>Breeding:</b> 200 cows; milk yield = genetic value + environment (phenotype SD 600 L, heritability h²); the top 20% (by phenotype) are bred at random; offspring = parents' average + new variation.</li></ul>
<h3>Left out</h3>
<ul><li>Pests and biological control, GM crop ecology, cloning techniques (micropropagation, Dolly), PCR and DNA profiling, and real economics.</li></ul>
<p>The earlier version of this simulation (with pest control, cloning and DNA profiling), with its worksheets, is kept in <a href="original/biotechnology.html">original/biotechnology.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "glass", options: [["glass", "🍅 Glasshouse"], ["field", "🌾 Fertiliser"], ["ferm", "🧫 Fermenter"], ["ge", "🧬 Genetic engineering"], ["breed", "🐄 Selective breeding"]], on: v => P.view = v });
g = ui.group("Glasshouse");
ctl.L = K.slider(g, { label: "Light", min: 5, max: 100, step: 1, value: 60, unit: "%", on: v => P.L = v });
ctl.C = K.slider(g, { label: "Carbon dioxide", min: 200, max: 1500, step: 10, value: 400, unit: "ppm", on: v => P.C = v });
ctl.T = K.slider(g, { label: "Temperature", min: 5, max: 45, step: 1, value: 20, unit: "°C", on: v => P.T = v });
g = ui.group("Fertiliser");
ctl.N = K.slider(g, { label: "Nitrogen", min: 0, max: 400, step: 5, value: 100, unit: "kg/ha", on: v => P.N = v });
K.btn(K.row(g), "🌾 Harvest 8 plots", () => { for (let i = 0; i < 8; i++) plots.push([P.N, wheat(P.N) + 0.4 * rnd.gauss()]); });
g = ui.group("Fermenter");
ctl.fT = K.slider(g, { label: "Temperature", min: 15, max: 55, step: 1, value: 37, unit: "°C", on: v => { P.fT = v; newFerm(); } });
ctl.pH = K.slider(g, { label: "pH", min: 4, max: 10, step: 0.1, value: 7, on: v => { P.pH = v; newFerm(); } });
ctl.O2 = K.slider(g, { label: "Oxygen (sterile air)", min: 0, max: 1, step: 0.05, value: 1, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.O2 = v; newFerm(); } });
ctl.aseptic = K.toggle(g, { label: "Aseptic precautions", value: true, on: v => { P.aseptic = v; newFerm(); } });
K.btn(K.row(g), "Run 20 batches", () => { batches = []; for (let i = 0; i < 20; i++) batches.push(rnd() < (P.aseptic ? 0.01 : 0.38)); });
g = ui.group("Genetic engineering");
let rr = K.row(g); K.btn(rr, "◀ back", () => { P.step = Math.max(0, P.step - 1); geT = 0; }); K.btn(rr, "next ▶", () => { P.step = Math.min(GE_STEPS.length - 1, P.step + 1); geT = 0; }, "primary");
g = ui.group("Selective breeding");
ctl.h2 = K.slider(g, { label: "Heritability h²", min: 0.05, max: 0.95, step: 0.05, value: 0.3, on: v => { P.h2 = v; newHerd(); } });
ctl.sel = K.seg(g, { label: "Breed from the top", value: 0.2, options: [[0.05, "5%"], [0.1, "10%"], [0.2, "20%"], [0.5, "50%"]], on: v => { P.sel = +v; newHerd(); } });
K.btn(K.row(g), "↺ New herd", () => newHerd());
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) { Object.assign(P, { view: "glass", L: 60, C: 400, T: 20, N: 100, fT: 37, pH: 7, O2: 1, aseptic: true, step: 0, h2: 0.3, sel: 0.2 }, o); for (const k of ["L", "C", "T", "N", "fT", "pH", "O2", "h2"]) ctl[k].set(P[k]); ctl.view.set(P.view); ctl.aseptic.set(P.aseptic); ctl.sel.set(P.sel); plots = []; batches = []; newFerm(); newHerd(); geT = 0; }
function newFerm() { ferm = ferment({ T: P.fT, pH: P.pH, O2: P.O2 }); fermT = 0; }
function newHerd() { herd = breed({ h2: P.h2, sel: P.sel, gens: 10 }, K.rng(Date.now() % 9973)); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw(t) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "glass") {
    const r = photo(P.L, P.C, P.T), s = season(P), gy = h * 0.78; c.fillStyle = `rgba(255,230,140,${0.05 + 0.25 * P.L / 100})`; c.fillRect(40, 40, w * 0.6, gy - 40); c.strokeStyle = "rgba(200,230,255,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(40, gy); c.lineTo(40, 100); c.lineTo(40 + w * 0.3, 40); c.lineTo(40 + w * 0.6, 100); c.lineTo(40 + w * 0.6, gy); c.stroke(); c.lineWidth = 1;
    c.fillStyle = "#3a2a18"; c.fillRect(30, gy, w * 0.62, 20);
    for (let i = 0; i < 6; i++) { const x = 80 + i * w * 0.09, ph = 40 + r * 1.4; c.strokeStyle = "#3f8f3f"; c.lineWidth = 4; c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy - ph); c.stroke(); c.lineWidth = 1; for (let k = 0; k < Math.round(r / 18); k++) { c.fillStyle = "#e0402a"; c.beginPath(); c.arc(x + (k % 2 ? 8 : -8), gy - ph * 0.3 - k * 14, 6, 0, 6.3); c.fill(); } }
    TX(c, `💡 ${P.L}%   ☁ CO₂ ${P.C} ppm   🌡 ${P.T} °C`, 50, 70, "#eef2f8", "left", "600 13px");
    const lim = [["light", P.L / (P.L + 25)], ["CO₂", (P.C - 50) / (P.C + 350) / (950 / 1350)], ["temperature", fT(P.T)]].sort((a, b) => a[1] - b[1])[0][0];
    let y = 110; const tx = w * 0.68, L = (s2, col = "#cfd8ea", f = "13px") => { TX(c, s2, tx, y, col, "left", f); y += 24; };
    L(`Rate of photosynthesis: ${r.toFixed(0)}%`, "#7ee787", "600 14px"); L(`Limiting factor now: ${lim}`, "#ffd166", "600 13px"); L(`Season: ${s.yieldKg.toFixed(1)} kg per plant`); L(`Income £${s.income.toFixed(0)}, costs £${s.cost.toFixed(0)}`); L(`Profit £${s.profit.toFixed(0)} (per 100 plants)`, s.profit > 0 ? "#7ee787" : "#ff6b81", "600 13px");
  } else if (P.view === "field") {
    const gy = h * 0.55; c.fillStyle = "#3a2a18"; c.fillRect(0, gy, w, h - gy); const Y = wheat(P.N);
    for (let i = 0; i < 40; i++) { const x = 20 + i * (w * 0.6) / 40, ht = 40 + Y * 12; c.strokeStyle = "#d8b84a"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, gy); c.lineTo(x + 3, gy - ht); c.stroke(); c.lineWidth = 1; c.fillStyle = "#e8c860"; c.beginPath(); c.ellipse(x + 3, gy - ht, 3, 8, 0, 0, 6.3); c.fill(); }
    const lch = leach(P.N); c.fillStyle = `rgba(80,140,255,${0.4 + Math.min(0.5, lch / 100)})`; c.fillRect(w * 0.66, gy + 30, w * 0.3, 40); TX(c, "river", w * 0.81, gy + 90, "#7fb8ff", "center", "11.5px"); if (lch > 5) { c.fillStyle = "rgba(90,200,90,.6)"; c.fillRect(w * 0.66, gy + 30, w * 0.3 * Math.min(1, lch / 120), 10); TX(c, "algal bloom (eutrophication)", w * 0.81, gy + 26, "#7ee787", "center", "11px"); }
    TX(c, `Nitrogen ${P.N} kg/ha → wheat ${Y.toFixed(2)} t/ha · taken up by the crop ${uptake(P.N).toFixed(0)} kg/ha · leached to the river ${lch.toFixed(0)} kg/ha`, 20, 108, "#eef2f8", "left", "600 13px");
    if (ui.level === "adv") TX(c, `Economic optimum (wheat £180/t, N £0.80/kg): ${optimumN()} kg/ha (beyond the spec)`, 20, 130, "#c9a0ff", "left", "12.5px");
  } else if (P.view === "ferm") {
    const cx = w * 0.25, cy = h * 0.5, k = Math.min(1, fermT / 4), st = ferm.out[Math.min(ferm.out.length - 1, Math.floor(k * (ferm.out.length - 1)))], X = st[1];
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 3; c.strokeRect(cx - 80, cy - 140, 160, 260); c.lineWidth = 1; c.fillStyle = "rgba(90,140,255,.2)"; c.fillRect(cx - 96, cy - 120, 16, 220); c.fillRect(cx + 80, cy - 120, 16, 220); TX(c, "water jacket", cx - 110, cy + 120, "#7fb8ff", "right", "11px");
    c.fillStyle = `rgba(230,210,140,${0.2 + 0.5 * X / 10})`; c.fillRect(cx - 78, cy - 100, 156, 218); c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(cx, cy - 160); c.lineTo(cx, cy + 60); c.stroke(); const pa = t * 6; c.fillStyle = "#cfd8ea"; c.fillRect(cx - 30 * Math.cos(pa), cy + 50, 60 * Math.cos(pa), 6);
    for (let i = 0; i < Math.round(X * 15); i++) { const bx = cx - 70 + ((i * 7919) % 1409) / 1409 * 140, by = cy - 90 + ((i * 104729) % 2003) / 2003 * 200; c.fillStyle = P.aseptic ? "#7ee787" : i % 3 ? "#7ee787" : "#ff8a70"; c.beginPath(); c.ellipse(bx, by, 4, 2, i, 0, 6.3); c.fill(); }
    for (let i = 0; i < 8; i++) { c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(cx - 40 + i * 10, cy + 110 - ((t * 40 + i * 25) % 200), 2.5, 0, 6.3); c.fill(); }
    TX(c, "sterile air in ↑", cx, cy + 150, "#aab6cc", "center", "11px"); TX(c, "nutrients in, product out", cx, cy - 150, "#aab6cc", "center", "11px");
    let y = 70; const tx = w * 0.5, L = (s2, col = "#cfd8ea", f = "13px") => { TX(c, s2, tx, y, col, "left", f); y += 24; };
    L(`Fermenter: ${P.fT} °C, pH ${P.pH}, oxygen ${(P.O2 * 100).toFixed(0)}%`, "#eef2f8", "600 14px"); L(`growth rate ${mu(P.fT, P.pH, P.O2).toFixed(2)} per hour`); L(`after ${(k * 48).toFixed(0)} h: bacteria ${X.toFixed(2)} g/dm³, insulin ${st[2].toFixed(2)} g/dm³`, "#7ee787");
    if (batches.length) { L(`20 batches: ${batches.filter(b => b).length} lost to contamination`, "#ff8a70", "600 13px"); batches.forEach((b, i) => { c.fillStyle = b ? "#ff6b81" : "#7ee787"; c.fillRect(tx + i * 18, y, 14, 14); }); }
  } else if (P.view === "ge") {
    const k = Math.min(1, geT / 1.5); TX(c, GE_STEPS[P.step], 20, 30, "#eef2f8", "left", "600 15px");
    const dna = (x, y, len, col, cut) => { for (let i = 0; i < len; i++) { c.fillStyle = i >= cut[0] && i < cut[1] ? "#ffd166" : col; c.fillRect(x + i * 10, y, 8, 10); c.fillRect(x + i * 10, y + 14, 8, 10); } };
    if (P.step <= 1) { dna(40, 120, 30, "#5ad1ff", [12, 20]); if (P.step === 1) { c.strokeStyle = "#ff6b81"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(40 + 12 * 10 - 2, 100); c.lineTo(40 + 12 * 10 - 2, 150); c.moveTo(40 + 20 * 10 - 2, 100); c.lineTo(40 + 20 * 10 - 2, 150); c.stroke(); c.setLineDash([]); TX(c, "✂ restriction enzyme", 40 + 16 * 10, 96, "#ff6b81", "center", "12px"); dna(40 + 12 * 10, 180 + 40 * k, 8, "#ffd166", [0, 8]); TX(c, "insulin gene with sticky ends", 160, 240 + 40 * k, "#ffd166", "left", "12px"); } TX(c, "human DNA (yellow: the insulin gene)", 40, 110, "#5ad1ff", "left", "12px"); }
    if (P.step >= 2) { const cx = w * 0.35, cy = h * 0.45, R = 80; c.strokeStyle = "#7ee787"; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, R, P.step === 2 ? 0.3 * k : P.step >= 3 ? 0 : 0, P.step === 2 ? 6.283 - 0.3 * k : 6.283); c.stroke(); c.lineWidth = 1; if (P.step >= 3) { c.strokeStyle = "#ffd166"; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, R, -0.3, 0.3); c.stroke(); c.lineWidth = 1; TX(c, "insulin gene joined in by ligase", cx + R + 12, cy, "#ffd166", "left", "12px"); } TX(c, "plasmid (a small ring of bacterial DNA)", cx - R, cy + R + 24, "#7ee787", "left", "12px"); }
    if (P.step >= 4) { for (let i = 0; i < (P.step === 5 ? 18 : 1); i++) { const bx = w * 0.62 + (i % 6) * 50, by = 120 + Math.floor(i / 6) * 60; c.fillStyle = "#3a6a3a"; c.beginPath(); c.ellipse(bx, by, 22, 12, 0, 0, 6.3); c.fill(); c.strokeStyle = "#ffd166"; c.beginPath(); c.arc(bx, by, 5, 0, 6.3); c.stroke(); } TX(c, P.step === 5 ? "bacteria multiply and make insulin" : "a bacterium takes up the plasmid", w * 0.62, 90, "#cfd8ea", "left", "12px"); }
    TX(c, `Step ${P.step + 1} of ${GE_STEPS.length}: press next ▶`, 20, h - 16, "#8fa0bf", "left", "12px");
  } else {
    const m = herd, gens = m.length - 1, cows = 12; TX(c, `Selective breeding for milk yield: heritability ${P.h2}, breed from the top ${(P.sel * 100).toFixed(0)}% each generation`, 20, 30, "#eef2f8", "left", "600 13.5px");
    for (let i = 0; i < cows; i++) { const x = 40 + i * (w - 80) / cows, y = h * 0.5; c.strokeStyle = "#cfd8ea"; c.lineWidth = 3; for (const lx of [4, 12, 30, 38]) { c.beginPath(); c.moveTo(x + lx, y + 8); c.lineTo(x + lx, y + 30); c.stroke(); } c.lineWidth = 1; c.fillStyle = "#f4f4f0"; c.beginPath(); c.ellipse(x + 20, y, 26, 14, 0, 0, 6.3); c.fill(); c.fillStyle = "#f0b0b8"; c.beginPath(); c.ellipse(x + 22, y + 13, 7, 4, 0, 0, 6.3); c.fill(); c.fillStyle = "#333"; c.beginPath(); c.arc(x + 12, y - 3, 5, 0, 6.3); c.arc(x + 28, y + 4, 6, 0, 6.3); c.fill(); c.fillStyle = "#f4f4f0"; c.beginPath(); c.arc(x + 48, y - 6, 8, 0, 6.3); c.fill(); }
    TX(c, `herd mean: ${m[0].toFixed(0)} L → ${m[gens].toFixed(0)} L per year after ${gens} generations (gain ${(m[gens] - m[0]).toFixed(0)} L)`, 20, h * 0.75, "#7ee787", "left", "600 13px");
    if (ui.level === "adv") TX(c, `breeder's equation R = h²S each generation predicts ${breederEq(P.h2, gens, P.sel).toFixed(0)} L (beyond the spec)`, 20, h * 0.75 + 24, "#c9a0ff", "left", "12.5px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "glass") {
    const cs = []; for (let C = 200; C <= 1500; C += 25) cs.push(C);
    chA.opts.title = "Rate against CO₂ at different light levels"; chA.opts.xLabel = "CO₂ (ppm)"; chA.opts.yLabel = "rate (%)"; chA.draw([20, 50, 100].map((L, i) => ({ pts: cs.map(C => [C, photo(L, C, P.T)]), color: ["#56607a", "#ffd166", "#7ee787"][i], label: L + "% light" })).concat([{ pts: [[P.C, photo(P.L, P.C, P.T)]], type: "dots", r: 6, color: "#fff", label: "now" }]), { yMin: 0 });
    const Ts = []; for (let T = 5; T <= 45; T++) Ts.push([T, season(Object.assign({}, P, { T })).profit]); chB.opts.title = "Profit against temperature"; chB.opts.xLabel = "°C"; chB.opts.yLabel = "£"; chB.draw([{ pts: Ts, color: "#7ee787", label: "profit" }], { vlines: [{ x: P.T, label: "now" }], hlines: [{ y: 0 }] });
    const s = season(P); label(0, "rate of photosynthesis"); label(1, "yield"); label(2, "costs"); label(3, "profit"); read.set("a", photo(P.L, P.C, P.T).toFixed(0) + "%"); read.set("b", s.yieldKg.toFixed(1) + " kg per plant"); read.set("c", "£" + s.cost.toFixed(0)); read.set("d", "£" + s.profit.toFixed(0));
  } else if (P.view === "field") {
    const Ns = []; for (let N = 0; N <= 400; N += 5) Ns.push(N);
    chA.opts.title = "Wheat yield against nitrogen"; chA.opts.xLabel = "nitrogen (kg/ha)"; chA.opts.yLabel = "t/ha"; chA.draw([{ pts: Ns.map(N => [N, wheat(N)]), color: "#ffd166", label: "average" }, { pts: plots, type: "dots", r: 4, color: "#fff", label: "your plots" }], { yMin: 0, vlines: ui.level === "adv" ? [{ x: optimumN(), label: "economic optimum", color: "#c9a0ff" }] : [] });
    chB.opts.title = "Where the nitrogen goes"; chB.opts.xLabel = "nitrogen (kg/ha)"; chB.opts.yLabel = "kg/ha"; chB.draw([{ pts: Ns.map(N => [N, uptake(N)]), color: "#7ee787", label: "into the crop" }, { pts: Ns.map(N => [N, leach(N)]), color: "#5ad1ff", label: "leached" }], { yMin: 0, vlines: [{ x: P.N, label: "now" }] });
    label(0, "yield"); label(1, "taken up"); label(2, "leached"); label(3, "economic optimum (A level)"); read.set("a", wheat(P.N).toFixed(2) + " t/ha"); read.set("b", uptake(P.N).toFixed(0) + " kg/ha"); read.set("c", leach(P.N).toFixed(0) + " kg/ha"); read.set("d", optimumN() + " kg/ha");
  } else if (P.view === "ferm") {
    chA.opts.title = "Growth in the fermenter"; chA.opts.xLabel = "hours"; chA.opts.yLabel = "g/dm³"; chA.draw([{ pts: ferm.out.map(q => [q[0], q[1]]), color: "#7ee787", label: "bacteria" }, { pts: ferm.out.map(q => [q[0], q[2]]), color: "#ffd166", label: "insulin" }], { yMin: 0 });
    const Ts = []; for (let T = 15; T <= 55; T++) Ts.push([T, ferment({ T, pH: P.pH, O2: P.O2 }).I]); chB.opts.title = "Insulin after 48 h against temperature"; chB.opts.xLabel = "°C"; chB.opts.yLabel = "g/dm³"; chB.draw([{ pts: Ts, color: "#ffd166", label: "insulin" }], { yMin: 0, vlines: [{ x: P.fT, label: "now" }] });
    label(0, "growth rate"); label(1, "bacteria at 48 h"); label(2, "insulin at 48 h"); label(3, "batches lost"); read.set("a", mu(P.fT, P.pH, P.O2).toFixed(3) + " per hour"); read.set("b", ferm.X.toFixed(2) + " g/dm³"); read.set("c", ferm.I.toFixed(2) + " g/dm³"); read.set("d", batches.length ? `${batches.filter(b => b).length} of 20` : "–");
  } else if (P.view === "breed") {
    chA.opts.title = "Herd mean milk yield"; chA.opts.xLabel = "generation"; chA.opts.yLabel = "litres per year"; chA.draw([{ pts: herd.map((m, i) => [i, m]), color: "#7ee787", label: "herd" }, ...(ui.level === "adv" ? [{ pts: herd.map((m, i) => [i, herd[0] + breederEq(P.h2, i, P.sel)]), color: "#c9a0ff", dash: [5, 4], label: "R = h²S" }] : [])], {});
    const hs = [0.1, 0.3, 0.5, 0.7, 0.9]; chB.opts.title = "Gain in 10 generations against heritability"; chB.opts.xLabel = "h²"; chB.opts.yLabel = "L"; chB.draw([{ pts: hs.map(h2 => [h2, breederEq(h2, 10, P.sel)]), color: "#c9a0ff", label: "breeder's equation" }, { pts: [[P.h2, herd[herd.length - 1] - herd[0]]], type: "dots", r: 6, color: "#fff", label: "your herd" }], { yMin: 0 });
    label(0, "starting mean"); label(1, "after 10 generations"); label(2, "gain"); label(3, "selected each time"); read.set("a", herd[0].toFixed(0) + " L"); read.set("b", herd[herd.length - 1].toFixed(0) + " L"); read.set("c", (herd[herd.length - 1] - herd[0]).toFixed(0) + " L"); read.set("d", (P.sel * 100) + "%");
  } else { chA.opts.title = "–"; chB.opts.title = "–"; chA.draw([], {}); chB.draw([], {}); label(0, "step"); read.set("a", `${P.step + 1} of ${GE_STEPS.length}`); }
  ui.hud({ glass: "Raise the limiting factor to raise the rate", field: "More fertiliser: diminishing returns and pollution", ferm: "Optimum temperature, pH and oxygen; keep it sterile", ge: "Cut, paste, insert, grow", breed: "Breed from the best, generation after generation" }[P.view]);
}
let frame = 0, T = 0;
ui.run(dt => { if (dt > 0) { T += dt; fermT += dt; geT += dt; } }, () => { draw(T); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views of biotechnology: glasshouse, fertiliser, fermenter, genetic engineering and selective breeding.", 6000);
