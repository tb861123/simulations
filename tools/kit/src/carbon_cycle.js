/* =====================================================================
   THE CARBON CYCLE AND CO₂
   Carbon moves between STORES: the air, plants, soils, the ocean (surface,
   middle and deep), fossil fuels and rocks. The flows between them:
     photosynthesis (air → plants), respiration and decomposition (back to
     the air), dissolving in the sea, mixing into the deep ocean, burning
     fossil fuels and forests (into the air).
   Before 1750 the flows in and out of the air balanced. Burning fossil
   fuels and clearing forests now add about 11 GtC a year; the ocean and
   land take up about half; the rest stays in the air, so CO₂ rises.
   CO₂ dissolving in the ocean makes it more acidic (lower pH), and the
   ocean takes up less as its carbonate is used up.
   Each step: change in a store = flows in − flows out.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---- seawater carbonate chemistry at 18 °C, salinity 35 (Lueker / Dickson constants, borate included)
const K0 = 0.0352, K1 = Math.pow(10, -5.88), K2 = Math.pow(10, -9.03), KB = Math.pow(10, -8.64), BT = 416, ALK = 2300, MSURF = 3.7e19;   // mol/kg/atm, -, -, -, µmol/kg, µmol/kg, kg (top 100 m)
const dicOf = C => C * 1e15 / 12 / MSURF * 1e6;                                     // GtC in the surface ocean → µmol per kg
function carb(dic) { let lo = 6, hi = 9.5; for (let k = 0; k < 50; k++) { const pH = (lo + hi) / 2, h = Math.pow(10, -pH), alk = dic * (K1 * h + 2 * K1 * K2) / (h * h + K1 * h + K1 * K2) + BT * KB / (h + KB); if (alk > ALK) hi = pH; else lo = pH; } const pH = (lo + hi) / 2, h = Math.pow(10, -pH); return { pH, pco2: dic * h * h / (h * h + K1 * h + K1 * K2) / K0 }; }
const PCO2_0 = carb(dicOf(870)).pco2;                                              // calibrate so the 1750 ocean is in balance with 280 ppm
const pco2Sea = C => 280 * carb(dicOf(C)).pco2 / PCO2_0;
// ---- emissions (GtC per year): fossil fuels and land-use change, 1750–2024 (approximately the Global Carbon Project)
const tabI = (t, x) => { if (x <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (x <= t[i][0]) return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * (x - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return t[t.length - 1][1]; };
const FOSSIL = [[1750, 0], [1800, 0.01], [1850, 0.05], [1900, 0.5], [1920, 0.95], [1950, 1.6], [1960, 2.5], [1970, 4.0], [1980, 5.2], [1990, 6.1], [2000, 6.8], [2010, 9.0], [2020, 9.6], [2024, 10.0]];
const LANDUSE = [[1750, 0.1], [1850, 0.5], [1900, 0.65], [1950, 1.3], [1990, 1.4], [2010, 1.4], [2024, 1.1]];
const FUT = { stop: [[2024, 11.1], [2025, 0], [2300, 0]], netzero: [[2024, 11.1], [2050, 0], [2300, 0]], low: [[2024, 11.1], [2030, 10], [2075, 0], [2100, -1], [2150, 0], [2300, 0]], mid: [[2024, 11.1], [2050, 12], [2100, 3], [2150, 1], [2200, 0], [2300, 0]], high: [[2024, 11.1], [2050, 20], [2100, 28], [2150, 15], [2250, 0], [2300, 0]], keep: [[2024, 11.1], [2300, 11.1]], none: [[2024, 0], [2300, 0]] };
function emissions(o, yr) { if (o.fut === "none") return { fos: 0, lu: 0 }; if (yr <= 2024) return { fos: tabI(FOSSIL, yr), lu: tabI(LANDUSE, yr) }; const tot = (o.fut === "draw" && o.draw ? tabI(o.draw, yr) : tabI(FUT[o.fut], yr)); return { fos: tot, lu: (yr < 2100 ? o.defor || 0 : 0) }; }
// ---- the model, steps of dt years
function c0() { return { yr: 1750, air: 595, plants: 550, soil: 1700, surf: 870, mid: 8800, deep: 29500, fossil: 5000, forest: 1, T: 0, T2: 0, emitted: 0, fl: {} }; }
function cStep(s, o, dt) {
  const ppm = s.air / 2.124, warm = o.nowarm ? 0 : s.T, e = emissions(o, s.yr), fos = Math.min(e.fos, s.fossil / dt), lu = e.lu;
  if (s.yr > 2025 && s.yr < 2075 && o.plant) s.forest += o.plant * 0.002 * dt;
  const gpp = 120 * s.forest * (1 + o.beta * Math.log(ppm / 280)), presp = 0.5 * gpp, litter = 60 * s.plants / 550, sresp = 60 * s.soil / 1700 * Math.pow(1.3, warm / 10);
  const pSea = pco2Sea(s.surf), airsea = o.noocean ? 0 : 0.286 * (ppm - pSea);
  const sm = (s.surf / 870 - s.mid / 8800) * 870 / 6 * o.mix, md = (s.mid / 8800 - s.deep / 29500) * 8800 / 300 * o.mix;
  const volc = 0.1 * o.volc, weath = 0.1 * Math.sqrt(ppm / 280), burial = 0.1;
  s.air += (fos + lu + presp + sresp + volc - gpp - airsea - weath) * dt; s.plants += (gpp - presp - litter - lu) * dt; s.soil += (litter - sresp) * dt;
  s.surf += (airsea + weath - burial - sm) * dt; s.mid += (sm - md) * dt; s.deep += md * dt; s.fossil -= fos * dt; s.emitted += (fos + lu) * dt; s.forest -= 0.1 * lu / 550 * dt;
  const F = 5.35 * Math.log(Math.max(1, s.air / 2.124) / 280), lam = 3.71 / o.sens; s.T += (F - lam * s.T - 0.7 * (s.T - s.T2)) / 8 * dt; s.T2 += 0.7 * (s.T - s.T2) / 100 * dt;
  s.yr += dt; s.fl = { fos, lu, gpp, presp, litter, sresp, airsea, sm, md, volc, weath, burial };
}
function runTo(o, year, dt = 0.1) { const s = c0(); while (s.yr < year - 1e-9) cStep(s, o, dt); return s; }
const DEF = { fut: "mid", beta: 0.22, mix: 1, sens: 3, volc: 1, defor: 0, plant: 0, noocean: false, nowarm: false };

// observations: ice cores (to 1950) and Mauna Loa annual means (ppm)
const ICE = [[1750, 278], [1800, 283], [1850, 285], [1900, 296], [1950, 311]], ML = [[1960, 317], [1970, 326], [1980, 339], [1990, 354], [2000, 370], [2010, 390], [2020, 414], [2024, 424]];
const FUTNAME = { stop: "sudden stop in 2025", netzero: "net zero by 2050", low: "low (like SSP1-2.6)", mid: "middle road (like SSP2-4.5)", high: "high (like SSP5-8.5)", keep: "keep going at today's rate", none: "no humans at all" };
const fresh = o => { const s = c0(); return s; };

// ---------------- The page ----------------
const P = Object.assign({}, DEF, { wiggle: false });
let speed = 1, S = c0(), hist = [], dots = [], rnd = K.rng(Date.now() % 99991 + 43);
const ui = K.app({
  title: "Carbon Cycle and CO₂", subject: "Climate",
  blurb: "Follow carbon between the air, plants, soils, the ocean and fossil fuels from 1750 to 2300",
  reset: () => set({ fut: P.fut }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE geography, biology and chemistry: the carbon cycle (photosynthesis, respiration, decomposition, combustion, the ocean); human effects on atmospheric CO₂ (burning fossil fuels, deforestation); the enhanced greenhouse effect; ocean acidification.", adv: "A level geography (the carbon cycle: stores, fluxes, the oceanic and terrestrial sinks, human impacts, feedbacks) and chemistry (carbonate equilibria in seawater, pH). The Revelle factor and SSP scenarios are beyond the specifications." } },
  missions: [
    { title: "Since 1750", q: "Run the historical period to 2024. How much has CO₂ risen? Compare with the ice-core and Mauna Loa points.", hint: "From about 280 ppm to about 420 ppm: a 50% rise, almost all since 1950. The model follows the measurements closely because it is driven by the recorded emissions.", setup() { set({ fut: "mid" }); } },
    { title: "Where does the carbon go?", q: "Look at the 'where the emitted carbon has gone' chart. What fraction stays in the air?", hint: "Only about 45% stays in the air (the airborne fraction). The ocean takes about 25–30% and plants and soils the rest: without these sinks CO₂ would already be well above 500 ppm.", setup() { set({ fut: "mid" }); } },
    { title: "Stop today", q: "Choose 'sudden stop in 2025'. Does CO₂ fall back to 280 ppm? How quickly?", hint: "It falls, but slowly: the ocean and land keep taking up carbon, so CO₂ drops by a few ppm a year at first, then more slowly. It is still far above 280 ppm in 2300: some of our CO₂ stays in the air for thousands of years.", setup() { set({ fut: "stop" }); } },
    { title: "High emissions", q: "Compare the low and high scenarios in 2100. What happens to ocean pH?", hint: "Low: about 410 ppm; high: about 800 ppm. More CO₂ dissolving in the sea makes carbonic acid, so the pH falls (from 8.18 in 1750 to under 7.8): ocean acidification, which harms corals and shellfish.", setup() { set({ fut: "high" }); } },
    { title: "Cutting down forests", q: "Add extra deforestation. What happens to the plant store and to CO₂?", hint: "Carbon in trees is released to the air (burning and decay), and the cleared land no longer photosynthesises as much, so the land sink weakens too.", setup() { set({ fut: "mid", defor: 2 }); } },
    { title: "Plant trees", q: "Plant a lot of trees (2025–2075). How much does it help compared with cutting emissions?", hint: "It helps: forests take carbon out of the air as they grow. But the effect is limited by land area, and it is much smaller than cutting fossil-fuel emissions; trees can also burn or be cut down again.", setup() { set({ fut: "mid", plant: 1 }); } },
    { lvl: "adv", title: "The ocean fills up", q: "Watch the Revelle factor as the ocean takes up carbon. Why does the ocean's share fall in the high scenario?", hint: "Dissolved CO₂ reacts with carbonate ions; as they are used up, the water can take less extra CO₂ for each extra ppm in the air (the Revelle factor rises from about 9.5). Mixing into the deep ocean takes centuries, so the surface ocean saturates.", setup() { set({ fut: "high" }); } },
    { lvl: "adv", title: "No ocean", q: "Switch off ocean uptake. How much higher is CO₂ in 2024?", hint: "Roughly 30–40 ppm higher: the ocean has absorbed about a quarter of all our emissions.", setup() { set({ fut: "mid", noocean: true }); } }
  ],
  batch: [
    { title: "CO₂ in 2100 under each scenario", question: "How much CO₂ will be in the air in 2100, allowing for uncertainty in how the land and ocean respond?", how: "1 stop now, 2 net zero 2050, 3 low, 4 middle, 5 high. Each run: CO₂ fertilisation β = 0.22 ± 0.08 and ocean mixing × (1 ± 0.3), chosen at random.", xLabel: "scenario (1 stop, 2 net zero, 3 low, 4 middle, 5 high)", yLabel: "CO₂ in 2100 (ppm)", xs: [1, 2, 3, 4, 5], reps: 6, yMin: 0, run: (x, r) => runTo(Object.assign({}, DEF, { fut: ["stop", "netzero", "low", "mid", "high"][x - 1], beta: Math.max(0, 0.22 + 0.08 * r.gauss()), mix: Math.max(0.3, 1 + 0.3 * r.gauss()) }), 2100, 0.25).air / 2.124, note: "The choice of emissions matters far more than the uncertainty in the natural sinks." },
    { title: "Stop today: how fast does CO₂ fall?", question: "If emissions stopped in 2025, what would CO₂ be in 2100 with slower or faster ocean mixing?", how: "Ocean mixing speed × 0.5 to × 2 (± 5% other uncertainty).", xLabel: "ocean mixing speed (× normal)", yLabel: "CO₂ in 2100 (ppm)", xs: [0.5, 0.75, 1, 1.5, 2], reps: 3, run: (x, r) => runTo(Object.assign({}, DEF, { fut: "stop", mix: x * (1 + 0.05 * r.gauss()) }), 2100, 0.25).air / 2.124, note: "Faster mixing carries carbon into the deep ocean sooner, so CO₂ falls further. Even so it stays well above 280 ppm." },
    { title: "Plants and the land sink", question: "How does the strength of CO₂ fertilisation (β) change the airborne fraction from 1960 to 2020?", how: "β from 0 (no fertilisation) to 0.5. Airborne fraction = rise in air carbon ÷ carbon emitted, over 1960–2020.", xLabel: "CO₂ fertilisation β", yLabel: "airborne fraction 1960–2020", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5], reps: 1, yMin: 0, yMax: 1, run: x => { const o = Object.assign({}, DEF, { beta: x }), a = runTo(o, 1960, 0.25), b = runTo(o, 2020, 0.25); return (b.air - a.air) / (b.emitted - a.emitted); }, note: "Stronger fertilisation → plants take up more carbon → a smaller share stays in the air. The observed airborne fraction (about 0.44) suggests β around 0.2." },
    { title: "Warming against total emissions", question: "Is warming proportional to the total carbon emitted?", how: "The middle-road path scaled from 0 to 3 times its future emissions; x = total carbon emitted by 2100 (GtC); warming in 2100 (CO₂ only, climate sensitivity 3 °C).", xLabel: "total carbon emitted by 2100 (GtC)", yLabel: "warming in 2100 (°C)", xs: [706, 1000, 1300, 1600, 1900, 2200], reps: 1, fit: true, yMin: 0, run: x => { const base = runTo(Object.assign({}, DEF, { fut: "stop" }), 2100, 0.25).emitted, mid = runTo(DEF, 2100, 0.25).emitted - base, sc = Math.max(0, (x - base) / mid); const fut = FUT.mid.map(([y, v]) => [y, y <= 2024 ? v : v * sc]); return runTo(Object.assign({}, DEF, { fut: "draw", draw: fut }), 2100, 0.25).T; }, note: "Very nearly a straight line: each 1000 GtC emitted adds roughly 1.5 °C (the TCRE). That is why a temperature target sets a carbon budget." },
    { title: "Ocean acidification", question: "What will the surface ocean pH be in 2100 under each scenario?", how: "1 stop now, 2 net zero 2050, 3 low, 4 middle, 5 high; β and mixing uncertain as before.", xLabel: "scenario (1 stop, 2 net zero, 3 low, 4 middle, 5 high)", yLabel: "ocean pH in 2100", xs: [1, 2, 3, 4, 5], reps: 4, run: (x, r) => carb(dicOf(runTo(Object.assign({}, DEF, { fut: ["stop", "netzero", "low", "mid", "high"][x - 1], beta: Math.max(0, 0.22 + 0.08 * r.gauss()), mix: Math.max(0.3, 1 + 0.3 * r.gauss()) }), 2100, 0.25).surf)).pH, note: "pH 8.18 in 1750, about 8.05 today; down to about 7.8 under high emissions. Each 0.1 fall in pH means about 26% more hydrogen ions." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Carbon is removed from the air by photosynthesis and dissolving in the ocean, and returned by respiration, decomposition, combustion and volcanoes." },
      { lvl: "std", tag: "GCSE", text: "Burning fossil fuels and cutting down forests add CO₂ to the air faster than the natural sinks remove it, so its concentration has risen from about 280 ppm (1750) to over 420 ppm." },
      { lvl: "std", tag: "GCSE", text: "CO₂ is a greenhouse gas: more of it traps more infrared and warms the Earth (the enhanced greenhouse effect)." },
      { lvl: "std", tag: "GCSE", text: "CO₂ dissolving in seawater forms carbonic acid, lowering the pH (ocean acidification): shells and coral skeletons are harder to build." },
      { lvl: "adv", tag: "A level", text: "Stores (GtC): air ~870 today, plants ~450–550, soils ~1700, ocean ~38 000 (mostly deep), fossil fuels thousands. Fluxes: photosynthesis ~120, ocean exchange ~80 each way, fossil fuels ~10 GtC per year." },
      { lvl: "adv", tag: "A level", text: "CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻ ⇌ 2H⁺ + CO₃²⁻. As carbonate ions are used up, the ocean takes less extra CO₂ per ppm (Revelle factor rises): the sink weakens." },
      { lvl: "adv", tag: "A level", text: "Warming is roughly proportional to cumulative emissions (about 1.5 °C per 1000 GtC), so temperature targets imply a finite carbon budget." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how carbon in the air becomes part of an animal and returns to the air.", ans: "<ul><li>plants take in CO₂ by photosynthesis, making carbon compounds</li><li>animals eat the plants</li><li>respiration (and decomposition after death) releases CO₂ back to the air</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why deforestation increases the CO₂ in the air.", ans: "<ul><li>trees are burned or decay, releasing their carbon as CO₂</li><li>fewer trees means less photosynthesis to remove CO₂</li></ul>" },
      { lvl: "std", marks: 2, q: () => `CO₂ rose from 280 ppm to ${(S.air / 2.124).toFixed(0)} ppm. Calculate the percentage increase.`, ans: () => `<ul><li>increase = ${(S.air / 2.124 - 280).toFixed(0)} ppm</li><li>${((S.air / 2.124 - 280) / 280 * 100).toFixed(0)}%</li></ul>` },
      { lvl: "adv", marks: 3, q: "Explain why the ocean will take up a smaller fraction of emissions in a high-emissions future.", ans: "<ul><li>dissolved CO₂ reacts with carbonate ions, which are used up</li><li>so each extra unit of CO₂ in the air raises the ocean's CO₂ more (higher Revelle factor)</li><li>mixing into the deep ocean is slow (centuries), so the surface saturates</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Stores in 1750 (GtC): air 595 (280 ppm; 1 ppm = 2.124 GtC), plants 550, soils 1700, surface ocean 870 (top 100 m), middle ocean 8800, deep ocean 29 500, fossil fuels 5000. Steps of 0.1 year: change = flows in − flows out.</li>
<li>Photosynthesis = 120 × forest area × (1 + β ln(CO₂/280)), β = 0.22; plants breathe out half at once; litter = 60 × plants/550; soil respiration = 60 × soils/1700 × 1.3^(warming/10).</li>
<li>Air–sea flow = 0.286 × (pCO₂ air − pCO₂ sea). The sea's pCO₂ and pH come from carbonate chemistry (DIC, alkalinity 2300 µmol/kg, 18 °C, with borate), which gives the Revelle buffer factor. Surface ↔ middle ocean mixing on a 6-year timescale, middle ↔ deep on 300 years.</li>
<li>Volcanoes add 0.1 GtC/yr; weathering moves 0.1 × √(CO₂/280) from the air to the sea; burial removes 0.1. Deforestation moves carbon from plants to the air (10% of cleared land never regrows); planting increases the forest area.</li>
<li>Warming: forcing 5.35 ln(CO₂/280) W/m² into a two-layer energy balance (climate sensitivity 3 °C per doubling). CO₂ only.</li>
<li>Emissions 1750–2024 approximate the Global Carbon Project (fossil fuels plus land use); future paths are simplified scenarios. The model gives about 424 ppm and pH 8.05 in 2024.</li></ul>
<h3>Left out</h3>
<ul><li>Methane, aerosols, permafrost, nitrogen limits on plants, changes in ocean circulation, dissolving of carbonate sediments, and year-to-year variability.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/carbon-cycle.html">original/carbon-cycle.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Emissions after 2024");
ctl.fut = K.seg(g, { value: "mid", options: Object.keys(FUTNAME).map(k => [k, FUTNAME[k]]), on: v => set({ fut: v, defor: P.defor, plant: P.plant, beta: P.beta, mix: P.mix, sens: P.sens }) });
ctl.defor = K.slider(g, { label: "Extra deforestation 2025–2100", min: 0, max: 3, step: 0.1, value: 0, unit: "GtC per year", on: v => P.defor = v });
ctl.plant = K.slider(g, { label: "Trees planted 2025–2075", min: 0, max: 2, step: 0.1, value: 0, fmt: v => v ? "+" + (v * 10).toFixed(0) + "% forest" : "none", on: v => P.plant = v });
ctl.volc = K.slider(g, { label: "Volcanic activity", min: 0, max: 10, step: 0.5, value: 1, fmt: v => v + "×", on: v => P.volc = v });
g = ui.group("How the Earth responds");
ctl.beta = K.slider(g, { label: "CO₂ fertilisation of plants β", min: 0, max: 0.6, step: 0.02, value: 0.22, on: v => P.beta = v });
ctl.mix = K.slider(g, { label: "Ocean mixing speed", min: 0.3, max: 2, step: 0.1, value: 1, fmt: v => v + "×", on: v => P.mix = v });
ctl.sens = K.slider(g, { label: "Climate sensitivity", min: 1.5, max: 6, step: 0.5, value: 3, unit: "°C per doubling", on: v => P.sens = v });
ctl.noocean = K.toggle(g, { label: "Switch off ocean uptake", value: false, on: v => P.noocean = v });
ctl.nowarm = K.toggle(g, { label: "Switch off warming feedback on soils", value: false, on: v => P.nowarm = v });
ctl.wiggle = K.toggle(g, { label: "Seasonal wiggle (the Keeling curve look)", value: false, on: v => P.wiggle = v });
g = ui.group("Run");
let rr = K.row(g); K.btn(rr, "↺ Back to 1750", () => restart(), "primary"); K.btn(rr, "⏩ Jump to 2024", () => { while (S.yr < 2024) { cStep(S, P, 0.1); if (Math.abs(S.yr % 1) < 0.05) record(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 20, step: 0.5, value: 1, fmt: v => K.sig(v * 3, 3) + " years per second", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["ppm", "CO₂"], ["af", "staying in the air"], ["ph", "ocean pH"], ["dT", "warming (CO₂ only)"], ["rev", "Revelle factor"]]);
function restart() { S = c0(); hist = []; record(); }
function record() { const c = carb(dicOf(S.surf)), em = S.emitted || 1e-9; hist.push({ yr: S.yr, ppm: S.air / 2.124, pH: c.pH, air: (S.air - 595) / em * 100, ocean: (S.surf + S.mid + S.deep - 39170) / em * 100, land: (S.plants + S.soil - 2250) / em * 100, T: S.T }); }
function set(o) { Object.assign(P, DEF, { wiggle: false }, o); for (const k of ["defor", "plant", "volc", "beta", "mix", "sens"]) ctl[k].set(P[k]); ctl.fut.set(P.fut); ctl.noocean.set(P.noocean); ctl.nowarm.set(P.nowarm); ctl.wiggle.set(P.wiggle); restart(); }
function revelle(C) { const d = 2, a = carb(dicOf(C)), b = carb(dicOf(C + d)); return ((b.pco2 - a.pco2) / a.pco2) / (d / C); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const START = { air: 595, plants: 550, soil: 1700, surf: 870, mid: 8800, deep: 29500, fossil: 5000 };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const sea = h * 0.48; c.fillStyle = "#0e2a44"; c.fillRect(w * 0.45, sea, w * 0.55, h - sea); c.fillStyle = "#2a2418"; c.fillRect(0, sea, w * 0.45, h - sea);
  const pos = { air: [w * 0.5, h * 0.13, "#9fb3c8", "air"], plants: [w * 0.16, sea - 70, "#3f9a54", "plants"], soil: [w * 0.16, sea + 80, "#7a5a3a", "soils"], fossil: [w * 0.33, h - 60, "#444", "fossil fuels"], surf: [w * 0.72, sea + 40, "#3a7dd0", "surface ocean"], mid: [w * 0.72, sea + 120, "#2a5a9a", "middle ocean"], deep: [w * 0.72, h - 45, "#1a3a6a", "deep ocean"] };
  const box = k => { const v = S[k], s = Math.sqrt(v) * Math.min(w, h) / 900, [x, y, col, lab] = pos[k]; c.fillStyle = col; c.globalAlpha = 0.8; c.fillRect(x - s * 0.9, y - s * 0.4, s * 1.8, s * 0.8); c.globalAlpha = 1; TX(c, `${lab}: ${Math.round(v).toLocaleString()} GtC`, x, y - s * 0.4 - 6, "#eef2f8", "center", "600 11.5px"); const d = v - START[k]; TX(c, (d >= 0 ? "+" : "") + Math.round(d) + " since 1750", x, y + 4, d > 0 ? "#ffd166" : "#ff8a70", "center", "11px"); return [x, y]; };
  const P2 = {}; for (const k of Object.keys(pos)) P2[k] = box(k);
  const f = S.fl || {}, arr = (a, b, v, col, lab, off = 0) => { if (!(v > 0.01)) return; const [x1, y1] = P2[a], [x2, y2] = P2[b], L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L * off, ny = (x2 - x1) / L * off; c.strokeStyle = col; c.lineWidth = Math.min(12, 1 + v / 8); c.globalAlpha = 0.6; c.beginPath(); c.moveTo(x1 + nx, y1 + 14 + ny); c.lineTo(x2 + nx, y2 + 14 + ny); c.stroke(); c.globalAlpha = 1; TX(c, `${lab} ${v.toFixed(1)}`, (x1 + x2) / 2 + nx * 2.2 + 6, (y1 + y2) / 2 + ny * 2.2 + 10, col, "left", "10.5px"); };
  arr("air", "plants", f.gpp, "#7fe3a0", "photosynthesis", -10); arr("plants", "air", f.presp, "#c9a27a", "respiration", -10); arr("soil", "air", f.sresp, "#c9a27a", "decomposition");
  arr("fossil", "air", f.fos, "#ff5d6c", "burning fossil fuels"); arr("air", "surf", Math.max(0, f.airsea), "#6fb1ff", "into the sea"); arr("surf", "mid", Math.max(0, f.sm), "#6fb1ff", "mixing"); arr("mid", "deep", Math.max(0, f.md), "#6fb1ff", "mixing");
  if (f.lu > 0.01) arr("plants", "air", f.lu, "#ff8a3d", "deforestation", 22);
  TX(c, `${Math.floor(S.yr)} · ${FUTNAME[P.fut]}`, 14, 22, "#eef2f8", "left", "600 14px"); TX(c, "box area ∝ √(carbon stored); flows in GtC per year", 14, 40, "#7d8aa5", "left", "11px");
}

// ---------------- Charts ----------------
function charts() {
  const wig = q => P.wiggle ? q.ppm + 3 * Math.sin(q.yr * 2 * Math.PI) : q.ppm;
  chA.opts.title = "CO₂ in the air"; chA.opts.xLabel = "year"; chA.opts.yLabel = "ppm"; chA.opts.xFmt = null;
  chA.draw([{ pts: hist.map(q => [q.yr, wig(q)]), color: "#ff8a70", label: "model" }, { pts: ICE, type: "dots", r: 4, color: "#9fb3c8", label: "ice cores" }, { pts: ML, type: "dots", r: 4, color: "#ffd166", label: "Mauna Loa" }], { xMin: 1750, xMax: Math.max(2030, Math.ceil(S.yr / 50) * 50), yMin: 250 });
  chB.opts.title = "Where the emitted carbon has gone"; chB.opts.xLabel = "year"; chB.opts.yLabel = "% of all carbon emitted"; chB.opts.xFmt = null;
  const hh = hist.filter(q => q.yr > 1850);
  chB.draw([{ pts: hh.map(q => [q.yr, q.air]), color: "#ff8a70", label: "air" }, { pts: hh.map(q => [q.yr, q.ocean]), color: "#6fb1ff", label: "ocean" }, { pts: hh.map(q => [q.yr, q.land]), color: "#7fe3a0", label: "plants and soils" }], { xMin: 1850, xMax: Math.max(2030, Math.ceil(S.yr / 50) * 50), yMin: -20, yMax: 100 });
  const q = hist[hist.length - 1] || {};
  read.set("ppm", (S.air / 2.124).toFixed(1) + " ppm"); read.set("af", isFinite(q.air) && S.emitted > 1 ? q.air.toFixed(0) + "% of emissions" : "–"); read.set("ph", carb(dicOf(S.surf)).pH.toFixed(3)); read.set("dT", S.T.toFixed(2) + " °C"); read.set("rev", revelle(S.surf).toFixed(1));
  ui.hud(S.yr < 1950 ? "Before 1950: emissions small, CO₂ rising slowly" : S.yr < 2025 ? "CO₂ rising fast: the sinks take up only about half of what we emit" : (S.fl.fos || 0) > 0.5 ? "Future: CO₂ depends on the emissions path" : "Emissions stopped: the ocean and land slowly draw CO₂ down");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0) || S.yr >= 2300) return;
  const years = dt * 3 * speed, n = Math.ceil(years / 0.1); for (let k = 0; k < n; k++) { cStep(S, P, years / n); }
  record(); if (hist.length > 6000) hist = hist.filter((_, i) => i % 2 === 0);
}, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({ fut: "mid" });
ui.tip("Carbon moves between the stores. Choose a future after 2024 and watch CO₂, the sinks and ocean pH.", 7000);
