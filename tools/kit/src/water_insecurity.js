/* =====================================================================
   WATER INSECURITY AND DROUGHT
   A drainage basin feeds a reservoir that supplies a city and its farms.
   Month by month:
     SOIL MOISTURE BUDGET (Thornthwaite)  rain (P) first wets the soil; plants
                use water at the potential rate PET when they can. If P > PET the
                soil fills (RECHARGE) and then the extra runs off (SURPLUS) to the
                river; if P < PET the soil dries (UTILISATION) and plants go short
                (DEFICIT). The WATER BUDGET: P = Q (runoff) + E (evapotranspiration) ± ΔS.
     DROUGHT    wet and dry years come in runs (like El Niño and La Niña), so
                several dry years in a row can empty a reservoir (Cape Town's
                "Day Zero", 2018).
     DEMAND     people × litres each per day, plus irrigation to make up the
                farms' soil-moisture deficit, plus leaks.
     STRESS     the Falkenmark index: renewable water per person per year:
                below 1700 m³ water stress, below 1000 scarcity, below 500 absolute scarcity.
   Management: a bigger dam, desalination, fixing leaks, water meters and
   restrictions, drip irrigation, or an upstream neighbour taking a share.
   ===================================================================== */
// presets: rainfall by month (share of the annual total, January first), mean monthly temperature (°C), and settings
const BASINS = {
  cape: { name: "Mediterranean city (Cape Town-like)", P: 650, rain: [0.03, 0.03, 0.05, 0.08, 0.13, 0.16, 0.15, 0.13, 0.09, 0.07, 0.05, 0.03], T: [22, 22, 21, 18, 16, 14, 13, 14, 15, 17, 19, 21], area: 5000, bf: 5, cap: 900, pop: 4.3, lpd: 210, irr: 200, leak: 0.15, upstream: 0 },
  se: { name: "South East England", P: 680, rain: [0.095, 0.07, 0.07, 0.065, 0.07, 0.07, 0.07, 0.08, 0.08, 0.1, 0.1, 0.1], T: [5, 5, 7, 9, 13, 16, 18, 18, 15, 12, 8, 6], area: 3000, bf: 12, cap: 250, pop: 6, lpd: 145, irr: 60, leak: 0.2, upstream: 0 },
  sahel: { name: "Semi-arid river basin (shared)", P: 520, rain: [0, 0, 0.01, 0.03, 0.08, 0.15, 0.25, 0.28, 0.14, 0.05, 0.01, 0], T: [25, 27, 30, 32, 33, 31, 28, 27, 28, 29, 27, 25], area: 30000, bf: 0.5, cap: 1500, pop: 3, lpd: 60, irr: 300, leak: 0.3, upstream: 0.25 }
};
const PET = T => Math.max(5, 5 * T - 20);                      // potential evapotranspiration (mm per month) from temperature: a simple stand-in for Thornthwaite's formula
const SOIL = 100;                                                // soil water the plants can use (mm)
/* Run a basin for some years. o: the basin settings plus dT (warming), dP (rainfall change, fraction), popGrowth, desal (Mm³ per month), meters (demand −15%),
   drip (irrigation −40%), fix (leakage repairs: leakage halved), cap (reservoir capacity, Mm³), upstream (share of inflow taken upstream). r: random weather. */
function basin(o, r, years = 30) {
  let S = SOIL * 0.6, V = o.cap * 0.8, wet = 0, pop = o.pop; const out = { m: [], years: [] };
  for (let y = 0; y < years; y++) {
    wet = 0.45 * wet + 0.18 * r.gauss();                     // wet and dry years come in runs
    const yr = { P: 0, Q: 0, E: 0, dS: -S, def: 0, short: 0, restr: 0, dayZero: 0, demand: 0 };
    for (let m = 0; m < 12; m++) {
      const T = o.T[m] + o.dT, pet = PET(T), P = o.P * (1 + o.dP) * o.rain[m] * Math.exp(wet - 0.04) * Math.exp(0.35 * r.gauss() - 0.06);
      // the soil-moisture budget for this month
      let aet, surplus = 0, deficit = 0;
      if (P >= pet) { aet = pet; S += P - pet; if (S > SOIL) { surplus = S - SOIL; S = SOIL; } }
      else { const draw = Math.min(S, (pet - P) * S / SOIL); S -= draw; aet = P + draw; deficit = pet - aet; }
      const inflow = (surplus + o.bf * Math.exp(0.5 * wet)) * o.area / 1000 * (1 - o.upstream);      // Mm³: runoff from the catchment plus groundwater baseflow (lower in dry spells), minus what upstream takes
      // demand (Mm³ this month); restrictions bite as the reservoir falls
      const level = V / o.cap, cut = level < 0.15 ? 0.45 : level < 0.3 ? 0.2 : 0;
      const city = pop * o.lpd * 0.03 * (o.meters ? 0.85 : 1), farm = o.irr * deficit / 1000 * (o.drip ? 0.6 : 1), leak = o.fix ? o.leak / 2 : o.leak;
      const want = (city + farm) * (1 - cut) / (1 - leak), fromDesal = Math.min(want, o.desal); let need = want - fromDesal;
      V += inflow; const evapRes = 0.004 * PET(T) / 100 * o.cap * 0.3; V -= evapRes; let supplied = Math.min(need, Math.max(0, V)); V -= supplied; if (V > o.cap) V = o.cap; if (V < 0) V = 0;
      const short = need - supplied; if (short > 0.01) yr.dayZero++; if (cut > 0) yr.restr++;
      yr.P += P; yr.Q += surplus; yr.E += aet; yr.def += deficit; yr.short += short; yr.demand += want;
      out.m.push({ t: y + m / 12, y, m, P, pet, aet, S, surplus, deficit, V, level: V / o.cap, cut, short, pop });
    }
    yr.dS += S; yr.renew = (yr.Q + 12 * o.bf) * o.area / 1000 * 1e6 / (pop * 1e6); yr.pop = pop; out.years.push(yr); pop *= 1 + o.popGrowth;
  }
  return out;
}
const stressClass = f => f > 1700 ? "no stress" : f > 1000 ? "water stress" : f > 500 ? "water scarcity" : "absolute scarcity";

// ---------------- The page ----------------
const DEF = Object.assign({ pre: "cape", dT: 0, dP: 0, popGrowth: 0.015, desal: 0, meters: false, drip: false, fix: false, chart: "budget" }, BASINS.cape);
const P = Object.assign({}, DEF); let seed = 2, run = null, k = 0, speed = 12;
const ui = K.app({
  title: "Water Insecurity and Drought", subject: "Geography",
  blurb: "A river basin month by month: the soil-moisture budget, a reservoir, dry years in a row, rising demand, Day Zero, and the ways of managing water",
  reset: () => set({ pre: P.pre }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 6 Resource management, water option: the water cycle and supply, why demand is rising, water insecurity, and large-scale (dams, transfers, desalination) and small-scale sustainable management.", adv: "Pearson Edexcel A level Geography (9GE0) Topic 5 The water cycle and water insecurity: the drainage basin water budget (P = Q + E ± ΔS), soil moisture budgets (surplus, utilisation, deficit, recharge), causes of drought (meteorological, agricultural, hydrological; ENSO), physical and human causes of water insecurity, the Falkenmark index, and hard and sustainable management (dams, transfers, desalination, demand management, integrated drainage basin management, transboundary agreements)." } },
  missions: [
    { title: "A year of soil water", q: "Look at the soil-moisture budget chart. In which months is there a surplus, and in which a deficit? When does the reservoir fill?", hint: "In a Mediterranean climate the rain comes in the cool winter, when evapotranspiration is low: the soil recharges and then there is a surplus that fills the reservoir. In the hot, dry summer the soil dries (utilisation) and plants go short (deficit).", setup() { set({ pre: "cape", chart: "budget" }); } },
    { title: "Day Zero", q: "Watch thirty years of the Cape Town-like basin. What happens in a run of dry years? How do restrictions help?", hint: "One dry year is survivable; two or three in a row empty the reservoir. Restrictions (level 1 at 30% full, harsh rationing at 15%) cut demand and stretch the water. Cape Town came within weeks of turning off the taps in 2018.", setup() { set({ pre: "cape", chart: "reservoir" }); } },
    { title: "More people, more stress", q: "Raise population growth to 3% a year. How does the Falkenmark index change over 30 years? When does the basin move into water stress or scarcity?", hint: "The water available stays the same (on average), but it is shared between more people, so water per person falls. Growth in demand, not only drought, causes water insecurity.", setup() { set({ pre: "cape", popGrowth: 0.03, chart: "stress" }); } },
    { title: "Fix the leaks", q: "South East England: compare fixing leaks, water meters and a desalination plant. Which saves most water? Which costs most energy?", hint: "Leaks lose about a fifth of the water; meters cut use by about 15%. Desalination adds a reliable supply but needs a lot of energy and money. Demand management is often cheaper and more sustainable.", setup() { set({ pre: "se", chart: "reservoir" }); } },
    { lvl: "adv", title: "A warmer world", q: "Cape Town basin: warm the climate by 2 °C with no change in rain. What happens to the soil-moisture deficit, the runoff and Day Zero?", hint: "Higher temperatures raise evapotranspiration, so the soil dries more, less water runs off and irrigation demand rises: hydrological drought gets worse even with the same rain.", setup() { set({ pre: "cape", dT: 2, chart: "budget" }); } },
    { lvl: "adv", title: "Upstream, downstream", q: "Shared semi-arid basin: the upstream country takes 25% of the flow. Raise it to 50%. Who controls the water? What could an agreement do?", hint: "Downstream, inflow falls and shortages grow even with the same rain: a transboundary conflict (the Nile and the Grand Ethiopian Renaissance Dam, the Tigris–Euphrates). Agreements share water and data; integrated drainage basin management plans the whole basin.", setup() { set({ pre: "sahel", upstream: 0.5, chart: "reservoir" }); } },
    { lvl: "adv", title: "Drip irrigation", q: "Shared semi-arid basin: switch on drip irrigation. How much does it reduce shortages compared with building a bigger dam?", hint: "Farms use most of the water. Drip irrigation cuts their demand by about 40%; a bigger dam stores more in wet years but cannot create water in a drought, and it loses more to evaporation.", setup() { set({ pre: "sahel", upstream: 0.25, chart: "reservoir" }); } }
  ],
  batch: [
    { title: "Day Zero risk and population", question: "What share of 30-year futures have at least one month with taps running dry, for different starting populations?", how: "Cape Town-like basin, 1.5% population growth, no new management; 20 futures with different weather at each population.", xLabel: "population at the start (millions)", yLabel: "% of futures with a Day Zero", xs: [2, 3, 4, 5, 6], reps: 20, yMin: 0, yMax: 100, run: (n, r) => basin(Object.assign({}, DEF, { pop: n }), r).years.some(y => y.dayZero > 0) ? 100 : 0, note: "Risk rises steeply once demand approaches what the basin can supply in a run of dry years." },
    { title: "Day Zero risk and warming", question: "How does warming change the chance of running dry, with the same rainfall?", how: "Cape Town-like basin, 4.3 million people; 20 futures at each warming.", xLabel: "warming (°C)", yLabel: "% of futures with a Day Zero", xs: [0, 1, 2, 3, 4], reps: 20, yMin: 0, yMax: 100, run: (d, r) => basin(Object.assign({}, DEF, { dT: d }), r).years.some(y => y.dayZero > 0) ? 100 : 0, note: "More evaporation means less runoff and more irrigation demand: warming alone makes water insecurity worse." },
    { title: "Runoff against rainfall", question: "How does the year's runoff (surplus) depend on its rainfall?", how: "Single years of the Cape Town-like basin; the rain total is scaled.", xLabel: "annual rainfall (mm)", yLabel: "annual runoff (mm)", xs: [300, 450, 600, 750, 900, 1100], reps: 8, yMin: 0, run: (p, r) => basin(Object.assign({}, DEF, { P: p }), r, 3).years[2].Q, note: "Not proportional: the soil and plants take their share first, so dry years give very little runoff. A 30% fall in rain can halve the water reaching the reservoir." },
    { lvl: "adv", title: "Water stress over 30 years", question: "How does the Falkenmark index change as the population grows?", how: "Cape Town-like basin, 2% growth; renewable water per person each year (wet and dry years vary).", xLabel: "year", yLabel: "m³ per person per year", xs: [0, 5, 10, 15, 20, 25, 29], reps: 8, yMin: 0, run: (y, r) => basin(Object.assign({}, DEF, { popGrowth: 0.02 }), r).years[y].renew, note: "The trend falls as population grows; the scatter is the weather. The city's own catchment gives far less than 500 m³ a person (absolute scarcity), which is why such cities depend on large dams, groundwater and transfers." },
    { lvl: "adv", title: "Which measure saves most?", question: "How much of the 30-year shortage does each measure avoid, in the Cape Town-like basin with 2.5% population growth?", how: "1 fix leaks, 2 meters, 3 drip irrigation, 4 desalination 6 Mm³/month, 5 all of them. Each is compared with doing nothing in exactly the same weather.", xLabel: "measure", yLabel: "shortage avoided (Mm³)", xs: [1, 2, 3, 4, 5], reps: 10, yMin: 0, run: (i, r) => { const m = [{ fix: true }, { meters: true }, { drip: true }, { desal: 6 }, { fix: true, meters: true, drip: true, desal: 6 }][i - 1], sd = r.int(1e9), base = Object.assign({}, DEF, { popGrowth: 0.025 }), tot = o => basin(o, K.rng(sd)).years.reduce((s, y) => s + y.short, 0); return tot(base) - tot(Object.assign({}, base, m)); }, note: "Each measure helps, and combining demand management with a new supply helps most. In wet futures there is no shortage to avoid, so many runs give zero: look at the means." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1GA0 6", text: "Water insecurity: not enough clean water to meet demand. Causes: low or unreliable rainfall, rising population, irrigation, pollution, over-abstraction." },
      { lvl: "std", tag: "1GA0 6", text: "Management: large-scale (dams and reservoirs, transfers, desalination) and small-scale or sustainable (fixing leaks, meters, water-saving devices, drip irrigation, rainwater harvesting)." },
      { lvl: "adv", tag: "9GE0 5.1", text: "Water budget: P = Q + E ± ΔS. Soil moisture budget: surplus when P > PET and the soil is full; utilisation and deficit when P < PET; recharge when rain returns." },
      { lvl: "adv", tag: "9GE0 5.4", text: "Drought: meteorological (low rain), agricultural (soil moisture deficit), hydrological (low river and reservoir levels). ENSO shifts rainfall patterns; runs of dry years cause the worst droughts." },
      { lvl: "adv", tag: "9GE0 5.5", text: "Falkenmark index: below 1700 m³ per person per year is water stress, below 1000 scarcity, below 500 absolute scarcity. Human causes: population growth, agriculture, pollution, mismanagement." },
      { lvl: "adv", tag: "9GE0 5.6", text: "Hard engineering (mega-dams, inter-basin transfers, desalination) is costly and has side effects; sustainable approaches (demand management, smart irrigation, integrated drainage basin management, transboundary treaties) are cheaper and fairer." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why demand for water is rising in many cities.", ans: "<ul><li>population growth</li><li>rising incomes: more appliances, gardens, showers</li><li>more food production needing irrigation; industry</li></ul>" },
      { lvl: "adv", marks: 3, q: () => run ? `In this run, year 1 had P = ${run.years[0].P.toFixed(0)} mm, runoff Q = ${run.years[0].Q.toFixed(0)} mm and evapotranspiration E = ${run.years[0].E.toFixed(0)} mm. Use the water budget to work out the change in soil storage.` : "Use the water budget equation to work out a change in storage.", ans: () => run ? `<ul><li>P = Q + E + ΔS</li><li>ΔS = ${run.years[0].P.toFixed(0)} − ${run.years[0].Q.toFixed(0)} − ${run.years[0].E.toFixed(0)}</li><li>= ${(run.years[0].P - run.years[0].Q - run.years[0].E).toFixed(0)} mm (${run.years[0].P - run.years[0].Q - run.years[0].E >= 0 ? "the soil gained water" : "the soil lost water"})</li></ul>` : "" },
      { lvl: "adv", marks: 4, q: "Evaluate desalination as a solution to water insecurity in a coastal city.", ans: "<ul><li>a reliable supply, independent of rainfall</li><li>but very energy-intensive and expensive; carbon emissions</li><li>brine harms marine ecosystems</li><li>demand management may be cheaper; best combined with it</li></ul>" }
    ]
  },
  notes: `<h3>The model (one month at a time)</h3>
<ul><li><b>Rain:</b> annual total × the month's share × a wetness factor for the year (wet and dry years run together: each year keeps 45% of last year's anomaly, like ENSO) × month-to-month scatter.</li>
<li><b>Evapotranspiration:</b> PET = 5T − 20 mm per month (at least 5) (T in °C), a simple stand-in for Thornthwaite's formula.</li>
<li><b>Soil:</b> 100 mm of usable water. If P ≥ PET the soil fills and the excess runs off; if P < PET plants draw on the soil (more slowly as it dries) and the rest is a deficit.</li>
<li><b>Reservoir:</b> inflow = (runoff + groundwater baseflow) × catchment area, minus the upstream share; baseflow is large on chalk (South East England) and small on hard rock or in dry lands; evaporation from the water surface; capacity limits it.</li>
<li><b>Demand:</b> city = people × litres per day (−15% with meters); farms = irrigated area × soil deficit (−40% with drip); leaks add 15–30% (halved by repairs). Restrictions cut demand 20% below 30% full and 45% below 15%. Desalination supplies a fixed amount each month.</li>
<li><b>Falkenmark index</b> = the year's runoff plus baseflow from the catchment ÷ population.</li></ul>
<h3>Simplifications</h3><ul><li>One reservoir and one catchment; no groundwater store, water quality or transfers between basins.</li><li>The presets are like the places named, not calibrated to them.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Basin");
ctl.pre = K.seg(g, { value: "cape", options: Object.entries(BASINS).map(([k, x]) => [k, x.name]), on: v => set({ pre: v }) });
g = ui.group("Climate and people");
ctl.dT = K.slider(g, { label: "Warming", min: 0, max: 4, step: 0.5, value: 0, fmt: v => "+" + v + " °C", on: v => { P.dT = v; rerun(); } });
ctl.dP = K.slider(g, { label: "Change in rainfall", min: -0.4, max: 0.2, step: 0.05, value: 0, fmt: v => (v > 0 ? "+" : "") + (v * 100).toFixed(0) + "%", on: v => { P.dP = v; rerun(); } });
ctl.popGrowth = K.slider(g, { label: "Population growth", min: 0, max: 0.04, step: 0.005, value: 0.015, fmt: v => (v * 100).toFixed(1) + "% a year", on: v => { P.popGrowth = v; rerun(); } });
g = ui.group("Management");
ctl.cap = K.slider(g, { label: "Reservoir (dam) capacity", min: 100, max: 3000, step: 50, value: 900, unit: "Mm³", on: v => { P.cap = v; rerun(); } });
ctl.desal = K.slider(g, { label: "Desalination", min: 0, max: 15, step: 1, value: 0, fmt: v => v ? v + " Mm³ a month" : "none", on: v => { P.desal = v; rerun(); } });
ctl.fix = K.toggle(g, { label: "Fix leaks (halve leakage)", value: false, on: v => { P.fix = v; rerun(); } });
ctl.meters = K.toggle(g, { label: "Water meters and saving campaigns (−15%)", value: false, on: v => { P.meters = v; rerun(); } });
ctl.drip = K.toggle(g, { label: "Drip irrigation on farms (−40%)", value: false, on: v => { P.drip = v; rerun(); } });
ctl.upstream = K.slider(g, { label: "Share of flow taken upstream", min: 0, max: 0.6, step: 0.05, value: 0, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.upstream = v; rerun(); } });
ctl.chart = K.seg(g, { label: "Second chart", value: "budget", options: [["budget", "Soil moisture budget"], ["reservoir", "Reservoir"], ["stress", "Water per person"]], on: v => P.chart = v });
let rr = K.row(g); K.btn(rr, "🎲 New weather", () => { seed++; rerun(); }, "primary"); K.btn(rr, "↺ Watch from the start", () => k = 0);
const read = K.readout(ui.group("Readings"), [["y", "date"], ["lev", "reservoir"], ["fal", "Falkenmark index"], ["res", "months of restrictions"], ["dz", "months with taps dry"], ["bud", "year's budget P = Q + E ± ΔS"]]);
function sync() { ctl.pre.set(P.pre); for (const q of ["dT", "dP", "popGrowth", "cap", "desal", "upstream"]) ctl[q].set(P[q]); ctl.fix.set(P.fix); ctl.meters.set(P.meters); ctl.drip.set(P.drip); ctl.chart.set(P.chart); const adv = ui.level === "adv"; ctl.upstream.el.style.display = adv ? "" : "none"; ctl.dT.el.style.display = adv ? "" : "none"; }
function set(o) { Object.assign(P, DEF, BASINS[o.pre || "cape"], { pre: o.pre || "cape" }, o); sync(); rerun(); }
function rerun() { run = basin(P, K.rng(seed * 4241 + 17)); k = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!run) return;
  const i = Math.min(run.m.length - 1, Math.floor(k)), M = run.m[i], yr = run.years[M.y];
  // sky and rain
  const rainy = Math.min(1, M.P / 120); c.fillStyle = `rgba(140,160,190,${0.15 + 0.5 * rainy})`; for (let n = 0; n < 5; n++) { c.beginPath(); c.ellipse(80 + n * 120, 60, 60, 22, 0, 0, 6.3); c.fill(); }
  c.strokeStyle = "rgba(120,180,255,.6)"; for (let n = 0; n < Math.round(rainy * 60); n++) { const x = 30 + ((n * 97 + i * 13) % (w * 0.6)), y = 85 + ((n * 41 + i * 29) % 80); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 9); c.stroke(); }
  // catchment hills with soil moisture colour, the river, the reservoir behind the dam, the city and farms
  const gy = h * 0.55, soilCol = `hsl(${30 + 90 * M.S / SOIL},45%,${25 + 10 * M.S / SOIL}%)`; c.fillStyle = soilCol; c.beginPath(); c.moveTo(0, gy); c.quadraticCurveTo(w * 0.18, gy - 90, w * 0.36, gy - 20); c.lineTo(w * 0.36, h); c.lineTo(0, h); c.fill();
  TX(c, `soil water ${M.S.toFixed(0)} of 100 mm`, 20, gy + 30, "#eef2f8", "left", "12px");
  if (P.upstream > 0) { c.fillStyle = "#555"; c.fillRect(w * 0.2, gy - 50, 10, 40); TX(c, `upstream dam takes ${(P.upstream * 100).toFixed(0)}%`, w * 0.2 - 40, gy - 56, "#ffb454", "left", "11px"); }
  c.strokeStyle = "rgba(90,170,255,.8)"; c.lineWidth = 2 + Math.min(10, M.surplus / 8); c.beginPath(); c.moveTo(w * 0.1, gy + 10); c.quadraticCurveTo(w * 0.28, gy + 60, w * 0.4, gy + 40); c.stroke(); c.lineWidth = 1;
  const rx = w * 0.4, rw = w * 0.22, rtop = gy - 20, rbot = gy + 120; c.strokeStyle = "#8fa0bf"; c.strokeRect(rx, rtop, rw, rbot - rtop); c.fillStyle = M.level < 0.15 ? "#c0392b" : M.level < 0.3 ? "#d98b2b" : "#2f6fb0"; c.fillRect(rx, rbot - (rbot - rtop) * M.level, rw, (rbot - rtop) * M.level);
  c.fillStyle = "#6b7590"; c.fillRect(rx + rw, rtop - 5, 12, rbot - rtop + 5); TX(c, `reservoir ${(100 * M.level).toFixed(0)}% full`, rx + rw / 2, rtop - 10, "#eef2f8", "center", "600 13px");
  if (M.cut > 0) TX(c, M.cut > 0.3 ? "⚠ Level 2 restrictions: 45% cut" : "Level 1 restrictions: 20% cut", rx + rw / 2, rbot + 20, "#ffb454", "center", "600 12px"); if (M.short > 0.01) TX(c, "DAY ZERO: taps dry", rx + rw / 2, rbot + 38, "#ff6b81", "center", "600 14px");
  // city and farms
  const cx = w * 0.7; for (let n = 0; n < 7; n++) { const bh = 30 + (n * 37) % 50; c.fillStyle = "#4a5577"; c.fillRect(cx + n * 26, gy + 60 - bh, 20, bh); } TX(c, `${M.pop.toFixed(1)} million people`, cx, gy + 80, "#cfd8ea", "left", "12px");
  c.fillStyle = `hsl(${60 + 50 * (1 - Math.min(1, M.deficit / 80))},40%,35%)`; c.fillRect(cx, gy + 95, 180, 30); TX(c, M.deficit > 5 ? `farms short of ${M.deficit.toFixed(0)} mm` : "farms watered by rain", cx, gy + 140, "#cfd8ea", "left", "11.5px");
  if (P.desal > 0) { c.fillStyle = "#8fa0bf"; c.fillRect(w - 70, gy - 10, 50, 30); TX(c, "desal", w - 45, gy + 32, "#cfd8ea", "center", "11px"); }
  TX(c, `${BASINS[P.pre].name} · year ${M.y + 1}, ${MON[M.m]}`, 20, h - 14, "#eef2f8", "left", "600 13px");
  TX(c, `rain ${M.P.toFixed(0)} mm · PET ${M.pet.toFixed(0)} mm · actual ET ${M.aet.toFixed(0)} mm · surplus ${M.surplus.toFixed(0)} mm`, w - 16, h - 14, "#aab6cc", "right", "11.5px");
  ui.hud("");
}
function charts() { if (!run) return; const i = Math.min(run.m.length - 1, Math.floor(k)), M = run.m[i], S = run.m.slice(0, i + 1), yr = run.years[M.y];
  chA.opts.title = "Reservoir level"; chA.opts.xLabel = "year"; chA.opts.yLabel = "% full"; chA.draw([{ pts: S.map(q => [q.t, 100 * q.level]), color: "#5ad1ff", label: "storage" }, { pts: S.filter(q => q.short > 0.01).map(q => [q.t, 0]), type: "dots", r: 3, color: "#ff6b81", label: "taps dry" }], { xMin: 0, xMax: 30, yMin: 0, yMax: 100, hlines: [{ y: 30, color: "rgba(255,180,84,.5)", label: "restrictions" }, { y: 15, color: "rgba(255,107,129,.5)" }] });
  if (P.chart === "budget" || P.chart === "reservoir") { const Y = run.m.filter(q => q.y === M.y); chB.opts.title = `Soil moisture budget, year ${M.y + 1}`; chB.opts.xLabel = "month"; chB.opts.yLabel = "mm"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? (MON[Math.round(v)] || "").slice(0, 1) : "";
    chB.draw([{ pts: Y.map(q => [q.m, q.P]), type: "bars", w: 0.6, color: "rgba(90,170,255,.8)", label: "rain P" }, { pts: Y.map(q => [q.m, q.pet]), color: "#ffb454", label: "PET" }, { pts: Y.map(q => [q.m, q.aet]), color: "#7ee787", dash: [4, 3], label: "actual ET" }], { xMin: -0.5, xMax: 11.5, yMin: 0, bands: Y.filter(q => q.deficit > 5).map(q => ({ x0: q.m - 0.5, x1: q.m + 0.5, color: "rgba(255,107,129,.12)" })).concat(Y.filter(q => q.surplus > 1).map(q => ({ x0: q.m - 0.5, x1: q.m + 0.5, color: "rgba(90,209,255,.12)" }))) }); }
  else { chB.opts.xFmt = null; chB.opts.title = "Falkenmark index: water per person"; chB.opts.xLabel = "year"; chB.opts.yLabel = "m³ per person per year"; chB.draw([{ pts: run.years.slice(0, M.y + 1).map((q, n) => [n + 1, q.renew]), type: "bars", w: 0.7, color: "#5ad1ff", label: "renewable water" }], { xMin: 0, xMax: 31, yMin: 0, hlines: [{ y: 1700, color: "rgba(126,231,135,.6)", label: "stress" }, { y: 1000, color: "rgba(255,180,84,.6)", label: "scarcity" }, { y: 500, color: "rgba(255,107,129,.6)", label: "absolute" }] }); }
  const done = run.years.slice(0, M.y + 1); read.set("y", `year ${M.y + 1}, ${MON[M.m]}`); read.set("lev", (100 * M.level).toFixed(0) + "%"); read.set("fal", `${yr.renew.toFixed(0)} m³ (${stressClass(yr.renew)})`); read.set("res", done.reduce((s, q) => s + q.restr, 0)); read.set("dz", done.reduce((s, q) => s + q.dayZero, 0));
  const py = M.y > 0 ? run.years[M.y - 1] : yr; read.set("bud", `${py.P.toFixed(0)} = ${py.Q.toFixed(0)} + ${py.E.toFixed(0)} ${py.dS >= 0 ? "+" : "−"} ${Math.abs(py.dS).toFixed(0)} mm`);
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(dt => { if (dt > 0 && run) k = Math.min(run.m.length - 1, k + dt * speed); }, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Thirty years, a month at a time. Watch the soil fill in the wet season and dry in summer, and the reservoir through runs of dry years.", 7000);
