/* =====================================================================
   FLOODING AND STORM HYDROGRAPHS
   Rain that falls on a drainage basin reaches the river by different
   routes, some fast and some slow:
     * intercepted by leaves, some evaporating before it lands
     * running over the surface (overland flow): fast
     * soaking in (infiltration) and seeping downslope through the soil
       (throughflow): slower
     * percolating into the rock and leaving as groundwater (base flow):
       slowest of all, days or months
   The river's discharge plotted against time is the storm hydrograph.
   Anything that makes more water take the fast route (concrete,
   saturated ground, steep slopes, bare soil) makes the peak higher and
   the lag time shorter: a "flashy" river.

   The model is a "bucket" model: stores (canopy, soil, groundwater)
   that fill and empty, worked out every 15 minutes, then routed down
   the channel network to the town at the mouth.
   ===================================================================== */
const DT = 0.25;   // hours per step
/* One storm. o = { A (km²), slope (%), shape, rock, dd (drainage density, km/km²), urban, wood (0–1), rain (mm), dur (h), wet (0–1, before the storm),
   gust (array of hourly multipliers or null), dam, nfm, dredge, suds }
   Returns discharge Q (m³/s) every 15 minutes, the hillslope flows (mm/h), the peak, its time and the lag time. */
function storm(o) {
  const rock = o.rock === "perm", Smax = (rock ? 150 : 100) + 50 * o.wood, Sfc = 0.45 * Smax;          // soil store (mm) and field capacity
  const L = 1.5 * Math.pow(o.A, 0.6);                                                                    // main river length, km (Hack's law)
  const v = (0.35 + 0.65 * Math.sqrt(o.slope / 10)) * (o.dredge ? 1.4 : 1) * (1 + 0.8 * o.urban);       // channel speed, m/s: faster on steep slopes, in straightened channels and drains
  const tc = Math.max(0.25, L * 1000 / v / 3600);                                                        // time for water to reach the mouth from the far end (h)
  const kT = 30 * (2 / o.dd) / Math.sqrt(o.slope / 4), kG = rock ? 1200 : 300;                           // how slowly the soil and the rock drain (h)
  // the time–area curve: how much of the basin is each travel time from the mouth. Round basins deliver it all at once.
  const nW = Math.max(1, Math.round(tc / DT)), pw = { round: 2.5, avg: 1.6, long: 1.0 }[o.shape], wts = [];
  for (let i = 0; i < nW; i++) wts.push(Math.pow(Math.sin(Math.PI * (i + 0.5) / nW), pw)); const sw = wts.reduce((a, b) => a + b); for (let i = 0; i < nW; i++) wts[i] /= sw;
  const Icap = 0.5 + 2.2 * o.wood + (o.nfm ? 0.5 : 0), ur = o.urban * (o.suds ? 0.5 : 1);
  let S = Smax * (0.2 + 0.55 * o.wet), I = 0, G = (rock ? 0.12 : 0.03) * kG * (0.5 + o.wet), D = 0;
  const t0 = 2, T = t0 + o.dur + Math.min(400, Math.max(36, 3 * tc + 24)), n = Math.round(T / DT), hill = [], out = [];
  for (let k = -Math.round(48 / DT); k < n; k++) {      // the first 48 hours are dry, so the stores settle before the record starts
    const t = k * DT, raining = t >= t0 && t < t0 + o.dur, rain = raining ? o.rain / o.dur * 2 * Math.pow(Math.sin(Math.PI * (t - t0 + DT / 2) / o.dur), 2) * (o.gust ? o.gust[Math.floor(t - t0) % o.gust.length] : 1) : 0;
    // towns: roofs and roads hold about 1 mm, then everything runs off into drains
    const urbRun = Math.max(0, rain - (D < 1 ? (1 - D) / DT : 0)); D = Math.min(1, D + rain * DT);
    // countryside: leaves catch some rain (interception), some of which evaporates
    const intc = Math.min(rain, (Icap - I) / DT); I = Math.max(0, I + intc * DT - (0.05 + 0.3 * o.wood) * DT); const thru = rain - intc;
    // infiltration capacity falls as the soil fills up; rain beyond it, or on saturated soil, runs over the surface
    const th = S / Smax, f = (rock ? 8 : 4) + (40 * (1 + 2 * o.wood) - (rock ? 8 : 4)) * Math.pow(1 - th, 1.5);
    let inf = Math.min(thru, f), over = thru - inf; if (S + inf * DT > Smax) { const ex = (S + inf * DT - Smax) / DT; inf -= ex; over += ex; }
    S += inf * DT; const wv = Math.max(0, (S - Sfc) / (Smax - Sfc)), tf = (Smax - Sfc) / kT * Math.pow(wv, 2.5), perc = (rock ? 3 : 0.12) * th;
    S -= (tf + perc) * DT; G += perc * DT; const bf = G / kG; G -= bf * DT;
    const ovr = over * (1 - ur) + urbRun * ur, runoff = ovr + tf * (1 - ur) + bf;
    if (k < 0) continue;
    hill.push({ t, rain, intc: intc * (1 - ur), inf: inf * (1 - ur), over: ovr, tf: tf * (1 - ur), perc: perc * (1 - ur), bf, soil: th, gw: G / kG });
    out.push(runoff);
  }
  // route down the channels to the gauging station: Q (m³/s) = flow (mm/h) × area (km²) ÷ 3.6
  const Q = []; for (let k = 0; k < n; k++) { let q = 0; for (let i = 0; i < nW; i++) q += out[Math.max(0, k - i)] * wts[i]; Q.push(q * o.A / 3.6); }
  const base = Q.map((q, k) => hill[Math.max(0, k - Math.round(nW / 2))].bf * o.A / 3.6);
  // storage: a dam holds back half the basin's water (reservoir), natural flood management a third of it (ponds, leaky dams)
  const store = (frac, kr) => { let st = Q[0] * frac * kr; for (let k = 0; k < n; k++) { st += Q[k] * frac * DT; const qo = st / kr; st -= qo * DT; Q[k] = Q[k] * (1 - frac) + qo; } };
  if (o.dam) store(0.5, 12); if (o.nfm) store(0.3, 6);
  let pk = 0, tp = 0; Q.forEach((q, k) => { if (q > pk) { pk = q; tp = k * DT; } });
  let tr = t0 + o.dur / 2; if (o.gust) { let m = -1; for (let h = 0; h < o.dur; h++) { const g = o.gust[h % o.gust.length]; if (g > m) { m = g; tr = t0 + h + 0.5; } } }
  return { Q, base, hill, peak: pk, tp, tr, lag: tp - tr, tc, T, t0 };
}
const gusts = (r, hours) => Array.from({ length: Math.max(1, Math.ceil(hours)) }, () => Math.max(0.1, 1 + 0.5 * r.gauss()));
// bankfull: the river is just full for the "2-year flood", the storm that comes on average every other year (40 mm in 12 hours here)
// a record of years for this basin with its usual land use: each year's biggest storm (12 hours long), with the soil a little wetter or drier each year
function yearRecord(o, years, seed, vary = true) { const r = K.rng(seed), ys = []; for (let y = 1; y <= years; y++) { const rain = stormOfYear(r), wet = vary ? K.clamp(0.5 + 0.2 * r.gauss(), 0.05, 0.95) : 0.5; ys.push({ y, rain, wet, Q: storm(Object.assign({}, o, { rain, dur: 12, wet, gust: null })).peak }); } return ys; }
/* bankfull: the river is just full in the "2-year flood", the median of the yearly biggest floods, with the basin's usual land use and no flood schemes.
   Embankments make the channel hold 60% more, dredging 20% more. Also returns the 10-year flood (exceeded in one year in ten). */
function bankfull(o) {
  const usual = Object.assign({}, o, { urban: o.usualUrban, wood: o.usualWood, dam: false, nfm: false, dredge: false, suds: false }), Qs = yearRecord(usual, 160, 4242).map(q => q.Q).sort((x, y) => x - y);
  const now = yearRecord(Object.assign({}, o), 160, 4242).map(q => q.Q).sort((x, y) => x - y);
  return { bf: Qs[80] * (o.embank ? 1.6 : 1) * (o.dredge ? 1.2 : 1), q10: now[144] };
}
// each year's biggest storm (mm in 12 hours) from a Gumbel distribution: the 2-year storm is 40 mm, the 100-year storm about 2.2 times that
const GUM = { mu: 35.85, beta: 11.34 }, stormOfYear = r => GUM.mu - GUM.beta * Math.log(-Math.log(Math.max(1e-12, r()))), rainForT = T => GUM.mu - GUM.beta * Math.log(-Math.log(1 - 1 / T));

const CASES = {
  own: { name: "Your basin", A: 50, slope: 6, shape: "avg", rock: "imp", dd: 2, urban: 0.1, wood: 0.1, rain: 40, dur: 12, wet: 0.5 },
  bos: { name: "Valency at Boscastle, 16 Aug 2004", A: 20, slope: 15, shape: "long", rock: "imp", dd: 2.5, urban: 0.03, wood: 0.1, rain: 95, dur: 5, wet: 0.6, fact: "Boscastle, Cornwall, 16 August 2004: about 185 mm of rain fell on high ground in 5 hours. Peak flow about 140 m³/s; about 100 people rescued by helicopter, 58 properties flooded, 115 cars washed away. Nobody died. The model spreads 95 mm evenly over the whole basin in 5 hours. (Met Office; Environment Agency)" },
  eden: { name: "Eden at Carlisle, Storm Desmond, Dec 2015", A: 2287, slope: 8, shape: "avg", rock: "imp", dd: 2, urban: 0.03, wood: 0.1, rain: 110, dur: 36, wet: 0.8, fact: "Storm Desmond, 5–6 December 2015: a UK record 341 mm of rain in 24 hours at Honister Pass. The Eden at Carlisle peaked at about 1700 m³/s; about 2100 properties flooded in Carlisle despite flood defences. The model uses 110 mm averaged over the whole basin in 36 hours. (Met Office; CEH; NRFA)" },
  som: { name: "Parrett and Tone, Somerset Levels, 2014", A: 1100, slope: 1, shape: "round", rock: "imp", dd: 1.5, urban: 0.04, wood: 0.05, rain: 220, dur: 240, wet: 0.95, fact: "Winter 2013–14 was the wettest in the England and Wales record (since 1766). On the flat Somerset Levels about 65 km² flooded for weeks; about 150 homes flooded and villages were cut off. 8 km of river were dredged afterwards. (Met Office; Environment Agency)" },
  itchen: { name: "Itchen (chalk), Hampshire", A: 400, slope: 2, shape: "long", rock: "perm", dd: 0.6, urban: 0.08, wood: 0.15, rain: 40, dur: 12, wet: 0.5, fact: "The Itchen flows over chalk: most rain soaks into the rock and reaches the river months later as groundwater. Its base flow index is above 0.9 (NRFA 42010): a very steady river with small storm peaks." }
};

// ---------------- The page ----------------
const P = Object.assign({ mode: "storm", case: "own", gusty: false, dam: false, nfm: false, dredge: false, suds: false, embank: false, usualUrban: 0.1, usualWood: 0.1, years: 100, vary: true }, CASES.own);
let rnd = K.rng(Date.now() % 99991 + 17), speed = 1, R = null, BF = 1, Q10 = 1, t = 0, kept = [], drops = [], gustArr = null;
let FF = { years: [], t: 0, seed: 1 };
const ui = K.app({
  title: "Flooding and Storm Hydrographs", subject: "Geography",
  blurb: "Rain, soil, rock and concrete: how a storm becomes a flood",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE (9–1) Geography A (1GA0) Topic 1B River landscapes: the drainage basin, storm hydrographs (peak discharge, lag time, rising and falling limbs), physical and human factors affecting flood risk, hard and soft engineering; magnitude and frequency of floods (e.g. 1 : 100 events).", adv: "Pearson Edexcel A level Geography (9GE0) Topic 5 The water cycle and water insecurity: the drainage basin as an open system (inputs, stores, flows, outputs), infiltration-excess and saturation-excess overland flow, human impacts, storm hydrographs and their controls, recurrence intervals." } },
  missions: [
    { title: "Read a storm hydrograph", q: "Watch 40 mm of rain fall in 12 hours. On the hydrograph, find the peak discharge and the lag time (from the peak rainfall to the peak discharge). Why does the river keep rising after the rain has stopped?", hint: "Water takes time to reach the gauging station: overland flow arrives first, then throughflow, while rain from the far end of the basin is still travelling down the channels. The lag time here is about 7 hours. After the peak, the falling limb is gentler than the rising limb because throughflow and groundwater keep draining for days. The shaded part at the bottom is base flow from groundwater.", setup() { set({}); } },
    { title: "Urbanisation", q: "Keep this hydrograph, then build on 60% of the basin. What happens to the peak and the lag time? Look at the hillslope: where does the rain go now?", hint: "Roofs and roads are impermeable: rain cannot infiltrate, so almost all of it runs off at once, and drains carry it to the river quickly. The peak is much higher and arrives sooner: a flashy hydrograph. That is why towns flood after storms that a rural basin would absorb, and why new estates must include SuDS (sustainable drainage).", setup() { set({}); finish(); keepNow("rural"); P.urban = 0.6; ctl.urban.set(0.6); recompute(); } },
    { title: "Deforestation", q: "Set woodland to 80% and keep the hydrograph. Then cut the trees down (woodland 0%). How do trees change the flood?", hint: "Trees intercept rain (some evaporates from the leaves), their roots open up the soil so more infiltrates, and the deeper soil stores more. Remove them and more rain reaches the ground and runs off quickly. The peak rises and the lag shortens. Replanting upland woods is part of natural flood management.", setup() { set({ wood: 0.8 }); finish(); keepNow("80% woodland"); P.wood = 0; ctl.wood.set(0); recompute(); } },
    { title: "Saturated ground", q: "The same 40 mm storm falls after a dry month (soil wetness 10%) and after a week of rain (90%). Compare the peaks.", hint: "Dry soil soaks up most of the rain. Saturated soil cannot: once it is full, rain runs over the surface (saturation-excess overland flow). The same storm gives a much bigger flood. Antecedent conditions (what the weather was like before the storm) matter as much as the storm itself.", setup() { set({ wet: 0.1 }); finish(); keepNow("dry soil"); P.wet = 0.9; ctl.wet.set(0.9); recompute(); } },
    { title: "Boscastle, 2004", q: "A small, steep, narrow basin with impermeable rock, and a cloudburst: 95 mm over the whole basin in 5 hours (much more on the high ground). How high is the peak, and how much warning did the village get?", hint: "The peak is about 130–140 m³/s within 2–3 hours of the heaviest rain: a flash flood. Steep slopes, thin soils on slate, a small basin and an extreme rainfall rate meant almost no lag. In reality, debris jammed against the bridge made it worse.", setup() { set({ case: "bos" }); } },
    { title: "Hard engineering", q: "Run Storm Desmond on the Eden. Then build a dam and reservoir upstream, or raise embankments through the town. What does each do?", hint: "A reservoir stores water and lets it out slowly: the peak falls and is delayed. Embankments do not change the river's flow at all; they make the channel deeper so more water fits before it floods (here, 60% more). Both are expensive, and if defences are overtopped (as at Carlisle in 2015) the flooding can be worse because people feel safe.", setup() { set({ case: "eden", speed: 6 }); } },
    { title: "Soft engineering", q: "Back to your basin with 40% urban. Add SuDS (green roofs, permeable paving, ponds) and natural flood management (leaky dams, ponds, trees in the hills). How much do they lower the peak?", hint: "Each slows water down or stores it, so the peak is lower and later. They are cheaper and better for wildlife than concrete, but each does a little: they work best together, and across a whole basin. Pickering's 'Slowing the Flow' project is a UK example.", setup() { set({ urban: 0.4 }); finish(); keepNow("no measures"); P.suds = true; P.nfm = true; ctl.suds.set(true); ctl.nfm.set(true); recompute(); } },
    { title: "Permeable chalk", q: "Compare the River Itchen (chalk) with your basin on impermeable rock. Why is its hydrograph so flat? What is most of its flow made of?", hint: "Chalk is permeable: water percolates into the rock and reaches the river slowly as groundwater (base flow). Storm peaks are small and the river flows steadily even in dry spells. But after a very wet winter the groundwater itself can rise and cause long-lasting groundwater floods.", setup() { set({ case: "itchen", speed: 4 }); } },
    { title: "How often do floods come?", q: "Switch to Flood frequency and simulate 100 years. How many years did the town flood? Is a '1-in-10-year flood' guaranteed to come once a decade?", hint: "A 1-in-10-year flood has a 10% chance every year. Some decades have none, others two or three. Over a century you get about 10 on average, but anywhere from about 4 to 16 is normal. The recurrence interval is a probability, not a timetable.", setup() { set({ mode: "freq" }); } },
    { lvl: "adv", title: "Infiltration excess or saturation excess?", q: "Pour 60 mm on your basin in 2 hours with dry soil. Then 60 mm in 48 hours with wet soil. In each, which kind of overland flow happens? Watch the hillslope arrows.", hint: "Intense rain on dry ground can fall faster than the soil can absorb it: infiltration-excess (Hortonian) overland flow, typical of thunderstorms and compacted or baked soils. Long rain on wet ground fills the soil to the surface: saturation-excess overland flow, typical of British winters. Both make the hydrograph flashier.", setup() { set({ rain: 60, dur: 2, wet: 0.2 }); } },
    { lvl: "adv", title: "The Somerset Levels", q: "Run the 2014 winter on the Parrett and Tone: 220 mm over 10 days on saturated, flat land. How is this flood different from Boscastle?", hint: "Very gentle slopes and a large, round basin give a slow, long flood: the river stays above bankfull for weeks rather than hours. The water has nowhere to go quickly (in reality high tides also locked the rivers out of the sea). Dredging helps a little by speeding the channel, but cannot remove a month's rain.", setup() { set({ case: "som", speed: 12 }); } }
  ],
  batch: [
    { title: "Does building on the basin raise the peak?", question: "How does the peak discharge depend on the urban share of the basin?", how: "Your basin (50 km²), 40 mm (±10%) in 12 hours on half-wet soil; urban 0 to 80%, 6 storms each.", xLabel: "urban area (%)", yLabel: "peak discharge (m³/s)", xs: [0, 10, 20, 30, 40, 50, 60, 70, 80], reps: 6, yMin: 0, run: (x, r) => storm(Object.assign({}, CASES.own, { urban: x / 100, rain: 40 * (1 + 0.1 * r.gauss()), wet: 0.5 + 0.05 * r.gauss() })).peak, note: "The peak rises steeply as fields become roofs and roads: impermeable surfaces turn almost all rain into fast runoff, and drains speed it to the river." },
    { title: "Does a bigger basin mean a longer lag?", question: "How does the lag time depend on the area of the basin?", how: "40 mm in 12 hours, basins from 5 to 3000 km² (same slope, rock and land use), 3 storms each.", xLabel: "basin area (km²)", yLabel: "lag time (hours)", xs: [5, 25, 100, 250, 500, 1000, 2000, 3000], reps: 3, yMin: 0, run: (x, r) => storm(Object.assign({}, CASES.own, { A: x, gust: null, wet: 0.5 + 0.05 * r.gauss() })).lag, note: "Bigger basins have longer rivers, so water from the far end takes longer to arrive: the lag grows from a few hours to more than a day." },
    { title: "Do trees reduce the flood?", question: "How does woodland cover change the peak discharge?", how: "Your basin, 40 mm (±10%) in 12 hours on half-wet soil; woodland 0 to 100%, 6 storms each.", xLabel: "woodland (%)", yLabel: "peak discharge (m³/s)", xs: [0, 20, 40, 60, 80, 100], reps: 6, yMin: 0, run: (x, r) => storm(Object.assign({}, CASES.own, { wood: x / 100, rain: 40 * (1 + 0.1 * r.gauss()), wet: 0.5 + 0.05 * r.gauss() })).peak, note: "More trees, lower peaks: interception, better infiltration and deeper soils hold more of the storm back." },
    { title: "Does wet ground make floods worse?", question: "How does the peak depend on how wet the soil was before the storm?", how: "Your basin, 40 mm (±10%) in 12 hours; soil wetness from 0 (dry) to 1 (saturated), 4 storms each.", xLabel: "soil wetness before the storm", yLabel: "peak discharge (m³/s)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 4, yMin: 0, run: (x, r) => storm(Object.assign({}, CASES.own, { wet: x, rain: 40 * (1 + 0.1 * r.gauss()) })).peak, note: "The same storm gives a far bigger flood on wet ground: antecedent conditions." },
    { title: "How long do you wait for a 1-in-20-year flood?", question: "If a flood has a 1 in 20 chance each year, how many years do you wait for the next one?", how: "Each run counts the years until a storm at least as big as the 20-year storm. Theory: a mean of 20 years (a geometric distribution).", reps: 500, bins: 24, theory: 20, yLabel: "years waited", run: (x, r) => { const R20 = rainForT(20); for (let y = 1; y < 1000; y++) if (stormOfYear(r) >= R20) return y; return 1000; }, note: "Most waits are shorter than 20 years, but a few are very long: the average is 20. A flood last year does not make one less likely this year." },
    { title: "How many 10-year floods in a century?", question: "How many floods at least as big as the 10-year flood happen in 100 years?", how: "Each run is a century of yearly storms. Theory: mean 10, standard deviation 3.0 (binomial, 100 years × 0.1).", reps: 300, bins: 16, theory: 10, yLabel: "10-year floods in a century", run: (x, r) => { const R10 = rainForT(10); let c = 0; for (let y = 0; y < 100; y++) if (stormOfYear(r) >= R10) c++; return c; }, note: "About 10 on average, but 5 or 15 in a century is not unusual. Recurrence intervals are averages over a very long time." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1GA0 1B", text: "A drainage basin is the area drained by a river and its tributaries. Its edge is the watershed. Parts: source, tributaries, confluence, mouth." },
      { lvl: "std", tag: "1GA0 1B", text: "Water reaches rivers by overland flow (fast), throughflow in the soil (slower) and groundwater flow (slowest). Interception, infiltration and percolation decide which route it takes." },
      { lvl: "std", tag: "1GA0 1B", text: "Storm hydrograph: discharge against time. Peak discharge; lag time = time from peak rainfall to peak discharge; rising and falling limbs; base flow." },
      { lvl: "std", tag: "1GA0 1B", text: "Flashy hydrographs (high peak, short lag): steep slopes, impermeable rock, saturated soil, urban areas, small round basins, little vegetation, intense rain." },
      { lvl: "std", tag: "1GA0 1B", text: "Hard engineering: dams and reservoirs, embankments, flood relief channels, straightening and dredging. Soft engineering: afforestation, flood plain zoning, flood warnings, natural flood management, SuDS." },
      { lvl: "std", tag: "1GA0 skills", text: "Recurrence interval (return period) = (n + 1) ÷ rank. A 1-in-100-year flood has a 1% chance of happening in any year." },
      { lvl: "adv", tag: "9GE0 5.1", text: "The drainage basin is an open system: inputs (precipitation), stores (interception, soil, groundwater, channel), flows (infiltration, percolation, throughflow, overland flow, base flow) and outputs (evapotranspiration, discharge)." },
      { lvl: "adv", tag: "9GE0 5.2", text: "Infiltration-excess (Hortonian) overland flow: rain intensity exceeds infiltration capacity. Saturation-excess overland flow: the soil is full, so even gentle rain runs off." },
      { lvl: "adv", tag: "9GE0 5.3", text: "Human impacts: urbanisation (impermeable surfaces, drains), deforestation, land drainage and abstraction all change flows and stores in the basin." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `On the hydrograph the peak rainfall was at ${R ? R.tr.toFixed(1) : "–"} h and the peak discharge at ${R ? R.tp.toFixed(1) : "–"} h. Calculate the lag time.`, ans: () => `<ul><li>lag time = time of peak discharge − time of peak rainfall</li><li>= ${R ? R.tp.toFixed(1) : "–"} − ${R ? R.tr.toFixed(1) : "–"} = ${R ? R.lag.toFixed(1) : "–"} hours</li></ul>` },
      { lvl: "std", marks: 4, q: "Explain how urbanisation affects a storm hydrograph.", ans: "<ul><li>roofs, roads and pavements are impermeable, so infiltration falls</li><li>more surface runoff, which reaches the river quickly</li><li>drains and sewers carry water straight to the river</li><li>so the peak discharge is higher and the lag time shorter</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why the same rainfall can cause a flood one week but not another.", ans: "<ul><li>antecedent conditions: if the soil is already saturated from earlier rain</li><li>infiltration cannot happen, so rain becomes surface runoff</li><li>more water reaches the river more quickly, so discharge rises above bankfull</li></ul>" },
      { lvl: "std", marks: 4, q: "Assess the advantages and disadvantages of building a dam and reservoir to reduce flood risk.", ans: "<ul><li>stores water and releases it slowly, lowering and delaying the peak</li><li>can also supply water and hydroelectric power</li><li>very expensive; floods land and displaces people; traps sediment, so erosion increases downstream</li><li>may give a false sense of security</li></ul>" },
      { lvl: "std", marks: 2, q: "Using the formula (n + 1) ÷ rank, calculate the recurrence interval of the 3rd largest flood in a 59-year record.", ans: "<ul><li>(59 + 1) ÷ 3</li><li>= 20 years</li></ul>" },
      { lvl: "adv", marks: 4, q: "Distinguish between infiltration-excess and saturation-excess overland flow, and suggest where each is most likely.", ans: "<ul><li>infiltration excess: rainfall intensity is greater than the infiltration capacity of the soil</li><li>common with intense convectional storms, compacted, baked or urban surfaces</li><li>saturation excess: the soil store is full, so further rain cannot infiltrate</li><li>common in prolonged frontal rain, in valley bottoms and on thin upland soils</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why rivers on chalk have high base flow and small storm peaks.", ans: "<ul><li>chalk is permeable / porous, so most rain infiltrates and percolates into the aquifer</li><li>groundwater moves slowly and feeds the river steadily as base flow</li><li>little surface runoff, so peaks are low and lag times long</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li>A "bucket" model of the hillslope, worked out every 15 minutes. Stores: interception (0.5 mm on grass to 2.7 mm under full woodland, some evaporating), soil (100 mm, 150 mm over permeable rock, plus up to 50 mm more under woodland; field capacity 45%), groundwater, and 1 mm of puddles on roofs and roads.</li>
<li><b>Infiltration</b> capacity falls as the soil fills: f = f_c + (f_0 − f_c)(1 − wetness)^1.5, higher under trees. Rain beyond it, or on full soil, runs over the surface.</li>
<li><b>Throughflow</b> drains the soil above field capacity, faster on steep slopes and where there are more streams; <b>percolation</b> feeds the groundwater (fast into chalk, very slow into impermeable rock), which leaves as <b>base flow</b>.</li>
<li><b>Towns</b>: impermeable; nearly all rain runs off, and drains make the channels faster. SuDS halve the impermeable effect.</li>
<li><b>Routing</b>: main river length = 1.5 × area^0.6 km; channel speed 0.35 + 0.65 √(slope ÷ 10) m/s. The basin's shape sets how much water arrives at each time. Discharge Q (m³/s) = flow (mm/h) × area (km²) ÷ 3.6.</li>
<li><b>Engineering</b>: a dam stores half the flow and releases it slowly; natural flood management stores a third and adds interception; dredging and straightening speed the channel and enlarge it by 20%; embankments let it hold 60% more before flooding.</li>
<li><b>Bankfull</b> is the 2-year flood: the median of the yearly biggest floods over 160 simulated years with the basin's usual land use. Each year's biggest storm (12 hours long) follows a Gumbel distribution: 40 mm for the 2-year storm, about 88 mm for the 100-year storm; the soil's wetness varies from year to year.</li><li>Storms are heaviest in the middle (a bell-shaped hyetograph); 'gusty' adds random hour-to-hour changes.</li></ul>
<h3>Simplifications</h3>
<ul><li>Rain falls evenly over the whole basin; real storms move and vary.</li>
<li>No snow, no tides, no blockages by debris, and no water spreading onto the flood plain upstream.</li>
<li>The case-study settings are the model's estimates of each basin's character; peaks are of the right size but the model is not calibrated on gauge records.</li>
<li>The earlier version also had a year-long water budget and drought view (A level); it is not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/flooding-hydrographs.html">original/flooding-hydrographs.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "storm", options: [["storm", "🌧 Storm hydrograph"], ["freq", "📅 Flood frequency"]], on: v => { P.mode = v; showMode(); } });
ctl.case = K.seg(g, { label: "Case study", value: "own", options: Object.entries(CASES).map(([k, c]) => [k, k === "own" ? "Your basin" : c.name.split(",")[0].split(" at ")[k === "bos" || k === "eden" ? 1 : 0].replace("Parrett and Tone", "Somerset")]), on: v => set({ case: v }) });
const caseNote = K.note(g, "");
const areaFromS = s => Math.round(5 * Math.pow(600, s / 100)), sFromArea = A => 100 * Math.log(A / 5) / Math.log(600);
g = ui.group("The drainage basin");
ctl.A = K.slider(g, { label: "Area", min: 0, max: 100, step: 1, value: sFromArea(P.A), fmt: s => areaFromS(s) + " km²", on: s => { P.A = areaFromS(s); recompute(true); } });
ctl.slope = K.slider(g, { label: "Relief (mean slope)", min: 1, max: 20, step: 0.5, value: P.slope, unit: "%", on: v => { P.slope = v; recompute(true); } });
ctl.shape = K.seg(g, { label: "Shape", value: P.shape, options: [["round", "Round"], ["avg", "Average"], ["long", "Elongated"]], on: v => { P.shape = v; recompute(true); } });
ctl.rock = K.seg(g, { label: "Rock", value: P.rock, options: [["imp", "Impermeable (granite, clay)"], ["perm", "Permeable (chalk)"]], on: v => { P.rock = v; recompute(true); } });
ctl.dd = K.slider(g, { label: "Drainage density", min: 0.5, max: 4, step: 0.1, value: P.dd, unit: "km/km²", on: v => { P.dd = v; recompute(true); } });
g = ui.group("Land use");
ctl.urban = K.slider(g, { label: "Urban (roofs, roads)", min: 0, max: 0.9, step: 0.05, value: P.urban, fmt: v => Math.round(v * 100) + "%", on: v => { P.urban = v; recompute(); } });
ctl.wood = K.slider(g, { label: "Woodland", min: 0, max: 1, step: 0.05, value: P.wood, fmt: v => Math.round(v * 100) + "%", on: v => { P.wood = v; recompute(); } });
grp.storm = g = ui.group("The storm");
ctl.rain = K.slider(g, { label: "Rainfall", min: 5, max: 300, step: 5, value: P.rain, unit: "mm", on: v => { P.rain = v; recompute(); } });
ctl.dur = K.slider(g, { label: "Duration", min: 1, max: 240, step: 1, value: P.dur, unit: "h", on: v => { P.dur = v; newGusts(); recompute(); } });
ctl.wet = K.slider(g, { label: "Soil wetness before the storm", min: 0, max: 1, step: 0.05, value: P.wet, fmt: v => Math.round(v * 100) + "%", on: v => { P.wet = v; recompute(); } });
ctl.gusty = K.toggle(g, { label: "Gusty (uneven) rain", value: false, on: v => { P.gusty = v; newGusts(); recompute(); } });
const rateNote = K.note(g, "");
g = ui.group("Flood management");
ctl.dam = K.toggle(g, { label: "Dam and reservoir (hard)", value: false, on: v => { P.dam = v; recompute(); } });
ctl.embank = K.toggle(g, { label: "Embankments through the town (hard)", value: false, on: v => { P.embank = v; recompute(); } });
ctl.dredge = K.toggle(g, { label: "Dredging and straightening (hard)", value: false, on: v => { P.dredge = v; recompute(); } });
ctl.nfm = K.toggle(g, { label: "Natural flood management (soft)", value: false, on: v => { P.nfm = v; recompute(); } });
ctl.suds = K.toggle(g, { label: "SuDS: green roofs, permeable paving (soft)", value: false, on: v => { P.suds = v; recompute(); } });
grp.freq = g = ui.group("Flood frequency");
ctl.years = K.slider(g, { label: "Years to simulate", min: 30, max: 200, step: 10, value: 100, on: v => { P.years = v; newRecord(); } });
ctl.vary = K.toggle(g, { label: "Soil wetness varies from year to year", value: true, on: v => { P.vary = v; newRecord(); } });
K.btn(K.row(g), "↺ New record", () => newRecord(), "primary");
g = ui.group("Watch");
let r1 = K.row(g); K.btn(r1, "▶ Run the storm again", () => { t = 0; drops = []; ui.setPlaying(true); }, "primary"); K.btn(r1, "📌 Keep this hydrograph", () => keepNow());
K.btn(K.row(g), "Clear kept hydrographs", () => kept = []);
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 24, step: 0.5, value: 1, fmt: v => "× " + v + " (" + v + " h a second)", on: v => speed = v });
const read = K.readout(g, [["pk", "peak discharge"], ["lag", "lag time"], ["bf", "bankfull"], ["now", "discharge now"]]);

function newGusts() { gustArr = gusts(rnd, P.dur); }
function opts() { return Object.assign({}, P, { gust: P.gusty ? gustArr : null }); }
function recompute(basinChanged) { R = storm(opts()); const bq = bankfull(P); BF = bq.bf; Q10 = bq.q10; if (basinChanged) mapCache = null; if (P.mode === "freq") newRecord(); }
function finish() { t = R.T; }
function keepNow(label) { if (!R) return; kept.push({ Q: R.Q.slice(), label: label || `${Math.round(P.urban * 100)}% urban, ${Math.round(P.wood * 100)}% wood, ${P.rain} mm` }); if (kept.length > 3) kept.shift(); }
function newRecord() { FF.years = yearRecord(P, P.years, ++FF.seed * 7919, P.vary); FF.t = 0; }   // one storm a year: each year's biggest storm, 12 hours long

function showMode() { grp.storm.style.display = P.mode === "storm" ? "" : "none"; grp.freq.style.display = P.mode === "freq" ? "" : "none"; if (P.mode === "freq") newRecord(); chA.opts.title = P.mode === "storm" ? "Storm hydrograph" : "Each year's biggest flood"; chB.opts.title = P.mode === "storm" ? "Rainfall" : "Flood frequency (recurrence interval)"; }
function set(o) {
  const c = CASES[o.case || "own"]; Object.assign(P, { case: "own", gusty: false, dam: false, nfm: false, dredge: false, suds: false, embank: false, mode: "storm" }, c, o); P.usualUrban = c.urban; P.usualWood = c.wood;
  ctl.A.set(sFromArea(P.A)); for (const k of ["slope", "dd", "urban", "wood", "rain", "dur", "wet"]) ctl[k].set(P[k]); for (const k of ["shape", "rock", "case", "mode"]) ctl[k].set(P[k]); for (const k of ["gusty", "dam", "nfm", "dredge", "suds", "embank"]) ctl[k].set(P[k]);
  speed = o.speed || (P.A > 500 ? 4 : 1); ctl.speed.set(speed); caseNote.innerHTML = c.fact || "Change anything below. The case studies set the basin and the storm for you.";
  kept = []; t = 0; drops = []; newGusts(); mapCache = null; recompute(); showMode();
}

// ---------------- Drawing ----------------
let mapCache = null;
const cv = ui.canvas(() => mapCache = null);
const chA = K.chart(ui.dock, { title: "Storm hydrograph", xLabel: "hours", yLabel: "discharge (m³/s)", yMin: 0 }), chB = K.chart(ui.dock, { title: "Rainfall", xLabel: "hours", yLabel: "rain (mm/h)", yMin: 0 });
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// the basin map: a watershed outline, a branching river network and land use, built once from a seeded random generator
function buildMap(w, h) {
  const r = K.rng(Math.round(P.A * 13 + P.dd * 100 + { round: 1, avg: 2, long: 3 }[P.shape] * 7)), cx = w / 2, top = 40, bot = h - 60, el = { round: 0.95, avg: 0.7, long: 0.42 }[P.shape], rx = Math.min(w * 0.45, (bot - top) / 2 * el * 1.2), ry = (bot - top) / 2, cy = (top + bot) / 2;
  const edge = []; for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, wob = 1 + 0.08 * Math.sin(a * 3 + r() * 2) + 0.05 * (r() - 0.5); edge.push([cx + rx * wob * Math.cos(a), cy + ry * wob * Math.sin(a)]); }
  const mouth = [cx, cy + ry * 0.97], source = [cx + rx * 0.1, cy - ry * 0.85], rivers = [];
  // main river: a gently wandering line from source to mouth; tributaries branch off it, more of them with higher drainage density
  const main = []; for (let i = 0; i <= 30; i++) { const f = i / 30; main.push([source[0] + (mouth[0] - source[0]) * f + Math.sin(f * 9 + r()) * rx * 0.08, source[1] + (mouth[1] - source[1]) * f]); } rivers.push({ pts: main, order: 3 });
  const nt = Math.round(3 + P.dd * 3);
  for (let k = 0; k < nt; k++) { const j = 3 + Math.floor(r() * 24), [x0, y0] = main[j], side = r() < 0.5 ? -1 : 1, len = (0.3 + 0.5 * r()) * rx, ang = -Math.PI / 2 + side * (0.6 + 0.6 * r()), pts = [[x0, y0]]; let x = x0, y = y0;
    for (let i = 0; i < 10; i++) { x += Math.cos(ang) * len / 10 * (1 + 0.3 * (r() - 0.5)) + side * len * 0.03; y += Math.sin(ang) * len / 10; pts.push([x, y]); }
    rivers.push({ pts, order: 1 + (r() < 0.4 ? 1 : 0) }); }
  const trees = [], blocks = []; for (let i = 0; i < 260; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 0.85; trees.push([cx + rx * d * Math.cos(a), cy + ry * d * Math.sin(a), r()]); }
  for (let i = 0; i < 120; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * 0.9; blocks.push([mouth[0] + rx * 0.9 * d * Math.cos(a), mouth[1] - ry * 1.1 * d * Math.abs(Math.sin(a)) * 0.9, r(), d]); }
  blocks.sort((a, b) => a[3] - b[3]);
  return { edge, rivers, mouth, source, cx, cy, rx, ry, trees, blocks, w, h };
}
function drawMap(c, x0, w, h, Qnow, rainNow) {
  if (!mapCache || mapCache.w !== w || mapCache.h !== h) mapCache = buildMap(w, h); const M = mapCache;
  c.save(); c.translate(x0, 0);
  // land, contours and the watershed
  c.fillStyle = "#1c2a1f"; c.beginPath(); M.edge.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill();
  c.strokeStyle = "rgba(201,169,106,0.25)"; c.lineWidth = 1; for (let k = 1; k <= 4; k++) { c.beginPath(); M.edge.forEach((p, i) => { const q = [M.mouth[0] + (p[0] - M.mouth[0]) * (1 - k * 0.18), M.mouth[1] + (p[1] - M.mouth[1]) * (1 - k * 0.18)]; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.stroke(); }
  c.strokeStyle = "#ff8a70"; c.setLineDash([6, 4]); c.lineWidth = 1.6; c.beginPath(); M.edge.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); c.setLineDash([]);
  // land use: woodland as dots of trees, built-up areas spreading out from the town
  const nTree = Math.round(M.trees.length * P.wood); for (let i = 0; i < nTree; i++) { const [x, y] = M.trees[i]; c.fillStyle = "#2f7d3c"; c.beginPath(); c.arc(x, y, 4, 0, 6.3); c.fill(); }
  const nB = Math.round(M.blocks.length * P.urban); for (let i = 0; i < nB; i++) { const [x, y, s] = M.blocks[i]; c.fillStyle = "#8b8f9a"; c.fillRect(x - 4, y - 4, 7 + s * 4, 7); }
  // rivers: wider as discharge rises; blue dots show the water moving
  const fill = K.clamp(Qnow / Math.max(1e-6, BF), 0, 3), ph = performance.now() / 1000;
  for (const rv of M.rivers) { c.strokeStyle = fill > 1 ? "#5aa0ff" : "#3a7fd8"; c.lineWidth = rv.order * (1 + 1.4 * Math.min(1.5, fill)); c.lineCap = "round"; c.beginPath(); rv.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    c.fillStyle = "rgba(200,230,255,0.8)"; const n = rv.pts.length - 1; for (let k = 0; k < 3; k++) { const f = (ph * (0.15 + 0.25 * fill) + k / 3) % 1, i = Math.floor(f * n), u = f * n - i, a = rv.pts[i], b = rv.pts[Math.min(n, i + 1)]; c.beginPath(); c.arc(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 1.8, 0, 6.3); c.fill(); } }
  // the town at the mouth, and flood water spreading over it when the river is above bankfull
  const [mx, my] = M.mouth; if (fill > 1) { const rad = 20 + 70 * Math.min(1, Math.log(fill) / Math.log(3)); const gr = c.createRadialGradient(mx, my, 4, mx, my, rad); gr.addColorStop(0, "rgba(90,160,255,0.75)"); gr.addColorStop(1, "rgba(90,160,255,0)"); c.fillStyle = gr; c.beginPath(); c.arc(mx, my, rad, 0, 6.3); c.fill(); }
  c.fillStyle = "#eef2f8"; for (let i = 0; i < 7; i++) { c.fillRect(mx - 30 + (i % 4) * 16 + (i > 3 ? 8 : 0), my + 8 + (i > 3 ? 12 : 0), 10, 8); }
  T(c, fill > 1 ? "TOWN FLOODING" : "town", mx + 42, my + 20, fill > 1 ? "#5ab0ff" : "#aab6cc", "left", fill > 1 ? "700 12px" : "12px");
  c.fillStyle = "#ffd166"; c.beginPath(); c.arc(mx, my - 6, 4, 0, 6.3); c.fill(); T(c, "gauging station", mx - 8, my - 12, "#ffd166", "right", "11px");
  T(c, "source", M.source[0] + 8, M.source[1], "#aab6cc"); T(c, "watershed", M.edge[40][0] + 6, M.edge[40][1] - 6, "#ff8a70", "left", "11px");
  const j = M.rivers[1] ? M.rivers[1].pts[0] : null; if (j) T(c, "confluence", j[0] + 8, j[1] + 4, "#aab6cc", "left", "11px");
  // raindrops over the basin while it rains
  for (const d of drops) { c.strokeStyle = "rgba(170,200,255,0.55)"; c.lineWidth = 1; c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - 1, d.y + 7); c.stroke(); }
  T(c, `${P.A} km² · ${CASES[P.case].name}`, 10, h - 12, "#aab6cc", "left", "12px");
  c.restore();
}
// the hillslope cross-section: each arrow's width shows how fast water is moving that way (mm per hour)
function drawSlope(c, x0, w, h, H) {
  c.save(); c.translate(x0, 0); const top = 70, bot = h - 40, sx = (x) => 20 + x * (w - 50), gy = x => top + 60 + x * (bot - top - 150);   // ground surface falls from left to the river at the right
  const rock = P.rock === "perm";
  c.fillStyle = rock ? "#cfcab8" : "#5c5f6a"; c.beginPath(); c.moveTo(sx(0), gy(0) + 45); for (let x = 0; x <= 1; x += 0.05) c.lineTo(sx(x), gy(x) + 45); c.lineTo(sx(1), bot); c.lineTo(sx(0), bot); c.fill();
  if (rock) { c.fillStyle = "rgba(0,0,0,0.15)"; for (let i = 0; i < 60; i++) { const x = (i * 37 % 100) / 100, y = gy(x) + 50 + (i * 53 % 100) / 100 * (bot - gy(x) - 55); c.fillRect(sx(x), y, 2, 2); } }
  // groundwater (the water table rises with the store)
  const gwH = K.clamp(H ? H.gw * (rock ? 15 : 60) : 0.3, 0.05, 0.9); c.fillStyle = "rgba(60,130,255,0.35)"; c.fillRect(sx(0), bot - (bot - gy(1) - 50) * gwH, w - 30, (bot - gy(1) - 50) * gwH);
  // soil, coloured darker as it gets wetter
  const wet = H ? H.soil : P.wet; c.fillStyle = `rgb(${Math.round(150 - 70 * wet)},${Math.round(110 - 50 * wet)},${Math.round(70 - 20 * wet)})`; c.beginPath(); c.moveTo(sx(0), gy(0)); for (let x = 0; x <= 1; x += 0.05) c.lineTo(sx(x), gy(x)); for (let x = 1; x >= 0; x -= 0.05) c.lineTo(sx(x), gy(x) + 45); c.fill();
  // land cover on top
  if (P.wood > 0.05) for (let i = 0; i < Math.round(8 * P.wood); i++) { const x = 0.05 + i * 0.09; c.fillStyle = "#6b4a2a"; c.fillRect(sx(x) - 2, gy(x) - 22, 4, 22); c.fillStyle = "#2f8f3f"; c.beginPath(); c.arc(sx(x), gy(x) - 28, 11, 0, 6.3); c.fill(); }
  if (P.urban > 0.05) for (let i = 0; i < Math.round(6 * P.urban) + 1; i++) { const x = 0.62 + i * 0.05; if (x > 0.9) break; c.fillStyle = "#8b8f9a"; c.fillRect(sx(x) - 8, gy(x) - 18, 16, 18); c.fillStyle = "#555"; c.fillRect(sx(x) - 8, gy(x) - 2, 16, 3); }
  c.fillStyle = "#3a7fd8"; c.fillRect(sx(1) - 8, gy(1) - 4, 26, 10);    // river channel
  T(c, "river", sx(1) + 5, gy(1) + 22, "#5ab0ff", "center", "11px");
  if (!H) { c.restore(); return; }
  const arrow = (x1, y1, x2, y2, v, col, lab, below) => { const wd = Math.min(16, 1 + 3 * Math.sqrt(Math.max(0, v))); if (v < 0.005) { c.globalAlpha = 0.25; } c.strokeStyle = c.fillStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); const a = Math.atan2(y2 - y1, x2 - x1), hs = 6 + wd; c.beginPath(); c.moveTo(x2 + Math.cos(a) * hs * 0.6, y2 + Math.sin(a) * hs * 0.6); c.lineTo(x2 - Math.cos(a - 0.6) * hs, y2 - Math.sin(a - 0.6) * hs); c.lineTo(x2 - Math.cos(a + 0.6) * hs, y2 - Math.sin(a + 0.6) * hs); c.fill(); c.globalAlpha = 1; if (lab) { if (below) T(c, `${lab} ${v.toFixed(v < 1 ? 2 : 1)}`, x1, y1 + (below > 0 ? 18 : -10), col, "left", "600 11px"); else T(c, `${lab} ${v.toFixed(v < 1 ? 2 : 1)}`, x2 + 8, y2 + 4, col, "left", "600 11px"); } };
  arrow(sx(0.12), top - 40, sx(0.12), top + 10, H.rain, "#aac8ff", "rain");
  arrow(sx(0.3), top - 10, sx(0.3), gy(0.3) - 30, H.intc, "#7fe3a0", "interception");
  arrow(sx(0.55), gy(0.55) - 6, sx(0.55), gy(0.55) + 26, H.inf, "#d9b38c", "infiltration");
  arrow(sx(0.45), gy(0.45) - 10, sx(0.85), gy(0.85) - 10, H.over, "#5ab0ff", "overland flow", -1);
  arrow(sx(0.3), gy(0.3) + 24, sx(0.75), gy(0.75) + 24, H.tf, "#ffb347", "throughflow", 1);
  arrow(sx(0.15), gy(0.15) + 40, sx(0.15), gy(0.15) + 80, H.perc, "#c58cff", "percolation");
  arrow(sx(0.35), bot - 25, sx(0.85), bot - 25, H.bf, "#4c8dff", "groundwater flow (base flow)", -1);
  T(c, "numbers: flows in mm per hour (arrow width shows the same)", 20, h - 12, "#7d8aa5", "left", "11px");
  c.restore();
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h);
  const mw = Math.round(w * 0.5);
  if (P.mode === "storm") { const k = Math.min(R.Q.length - 1, Math.floor(t / DT)), H = R.hill[k]; drawMap(c, 0, mw, h, R.Q[k], H.rain); drawSlope(c, mw, w - mw, h, H); }
  else { const n = Math.min(FF.years.length, Math.floor(FF.t)), y = n ? FF.years[n - 1] : null; drawMap(c, 0, mw, h, y ? y.Q * (FF.t % 1 < 0.6 ? 1 : 0.3) : 0, 0); drawSlope(c, mw, w - mw, h, null);
    const floods = FF.years.slice(0, n).filter(q => q.Q > BF).length; T(c, `Year ${n} of ${FF.years.length}`, mw + 20, 130, "#eef2f8", "left", "600 16px"); T(c, `The town has flooded in ${floods} year${floods === 1 ? "" : "s"}`, mw + 20, 154, "#5ab0ff", "left", "600 14px");
    if (y) T(c, `This year's biggest storm: ${y.rain.toFixed(0)} mm in 12 h → peak ${y.Q.toFixed(1)} m³/s`, mw + 20, 178, "#aab6cc"); }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.mode === "storm") {
    t = Math.min(R.T, t + dt * speed); const k = Math.min(R.Q.length - 1, Math.floor(t / DT)), rain = R.hill[k].rain, M = mapCache;
    if (M && rain > 0) { const n = Math.min(12, rain * dt * 30); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.9; drops.push({ x: M.cx + M.rx * d * Math.cos(a), y: M.cy + M.ry * d * Math.sin(a) - 20, life: 0.25 }); } }
    for (const d of drops) { d.y += 120 * dt; d.life -= dt; } drops = drops.filter(d => d.life > 0).slice(-400);
  } else FF.t = Math.min(FF.years.length, FF.t + dt * speed * 2);
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "storm") {
    const k = Math.min(R.Q.length - 1, Math.floor(t / DT)), xs = R.Q.map((q, i) => i * DT), shown = Math.max(1, k + 1);
    chA.opts.xLabel = "hours"; chA.opts.yLabel = "discharge (m³/s)"; chB.opts.xLabel = "hours"; chB.opts.yLabel = "rain (mm/h)"; chA.opts.xFmt = null; chB.opts.xFmt = null;
    const series = kept.map((q, i) => ({ pts: q.Q.map((v, j) => [j * DT, v]), color: ["#7d8aa5", "#9a86c9", "#c98686"][i], dash: [5, 4], width: 1.4, label: q.label }));
    series.push({ pts: R.base.slice(0, shown).map((v, i) => [i * DT, v]), type: "area", color: "#4c8dff", label: "base flow" }, { pts: R.Q.slice(0, shown).map((v, i) => [i * DT, v]), color: "#5ab0ff", width: 2.6, label: "discharge" });
    const vl = [{ x: R.tr, color: "#aac8ff" }]; if (t >= R.tp) vl.push({ x: R.tp, color: "#ffd166", label: `peak: lag ${R.lag.toFixed(1)} h` });
    const ymax = Math.max(BF * 1.15, R.peak * 1.1, ...kept.map(q => Math.max(...q.Q) * 1.05));
    chA.draw(series, { xMin: 0, xMax: R.T, yMin: 0, yMax: ymax, vlines: vl, hlines: [{ y: BF, color: "#ff5d6c", label: "bankfull" }] });
    const rainH = []; for (let hh = 0; hh < R.T; hh++) { const i = Math.round(hh / DT); if (i < R.hill.length) rainH.push([hh + 0.5, R.hill[i].rain]); }
    chB.draw([{ pts: rainH.filter(q => q[0] <= t + 0.5), type: "bars", w: 1, color: "#aac8ff", label: "rain (mm/h)" }], { xMin: 0, xMax: R.T, yMin: 0, yMax: Math.max(1, ...rainH.map(q => q[1])) * 1.15, vlines: [{ x: t, color: "#7d8aa5" }] });
    read.set("pk", R.peak.toFixed(R.peak < 10 ? 2 : 0) + " m³/s"); read.set("lag", R.lag.toFixed(1) + " h"); read.set("bf", BF.toFixed(BF < 10 ? 2 : 0) + " m³/s"); read.set("now", R.Q[k].toFixed(R.Q[k] < 10 ? 2 : 0) + " m³/s");
    rateNote.textContent = `Average intensity ${(P.rain / P.dur).toFixed(1)} mm per hour.`;
    ui.hud(`t = <b>${t.toFixed(1)} h</b><br>discharge <b>${R.Q[k].toFixed(R.Q[k] < 10 ? 2 : 0)}</b> m³/s${R.Q[k] > BF ? ' <b style="color:#5ab0ff">above bankfull</b>' : ""}<br><span style="color:var(--muted)">peak ${R.peak.toFixed(R.peak < 10 ? 1 : 0)} m³/s · bankfull ${BF.toFixed(BF < 10 ? 1 : 0)}</span>`);
  } else {
    const n = Math.min(FF.years.length, Math.floor(FF.t)), Y = FF.years.slice(0, n), T10 = Q10;
    chA.opts.xLabel = "year"; chA.opts.yLabel = "peak discharge (m³/s)"; chB.opts.xLabel = "recurrence interval (years, log scale)"; chB.opts.yLabel = "peak discharge (m³/s)"; chB.opts.xFmt = v => { const y = Math.exp(v); return y < 10 ? y.toFixed(y < 2 ? 1 : 0) : Math.round(y); };
    chA.draw([{ pts: Y.map(q => [q.y, q.Q]), type: "bars", w: 0.8, color: "#5ab0ff", label: "biggest flood each year" }], { xMin: 0, xMax: P.years + 1, yMin: 0, hlines: [{ y: BF, color: "#ff5d6c", label: "bankfull" }, { y: T10, color: "#ffd166", label: "10-year flood (model)" }] });
    // ranked: recurrence interval = (n + 1) ÷ rank, plotted on a log scale, with a best-fit line through ln(T)
    const ranked = Y.slice().sort((a, b) => b.Q - a.Q).map((q, i) => [Math.log((n + 1) / (i + 1)), q.Q]), fit = ranked.length > 3 ? K.linfit(ranked) : null, x100 = Math.log(100);
    chB.draw([{ pts: ranked, type: "dots", color: "#5ab0ff", r: 3.5, label: "each year (ranked)" }].concat(fit ? [{ pts: [[0, fit.c], [x100, fit.c + fit.m * x100]], color: "#ffd166", dash: [5, 4], label: `fitted: 100-year flood ≈ ${(fit.c + fit.m * x100).toFixed(0)} m³/s` }] : []), { xMin: 0, xMax: x100, yMin: 0, hlines: [{ y: BF, color: "#ff5d6c", label: "bankfull" }] });
    read.set("pk", n ? Math.max(...Y.map(q => q.Q)).toFixed(0) + " m³/s (largest)" : "–"); read.set("lag", Y.filter(q => q.Q > BF).length + " floods"); read.set("bf", BF.toFixed(1) + " m³/s"); read.set("now", "year " + n);
    ui.hud(`${n} years simulated<br>floods (above bankfull): <b>${Y.filter(q => q.Q > BF).length}</b><br>10-year floods: <b>${Y.filter(q => q.Q >= T10).length}</b> (expected ${(n / 10).toFixed(1)})`);
  }
  K.$ && (read.el.children[1].firstElementChild.textContent = P.mode === "storm" ? "lag time" : "years flooded");
});
set({});
ui.tip("Left: the drainage basin seen from above · right: a hillslope, arrows sized by how fast the water moves · the hydrograph builds underneath", 9000);
