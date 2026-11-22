/* =====================================================================
   GLOBALISATION AND MIGRATION
   Globalisation is the growing interconnection of places through FLOWS:
   goods (trade), capital and money (remittances, FDI), people (migration)
   and information. Sixteen countries are linked by three kinds of flow:
     TRADE (gravity model)  T = G × GDPᵢ × GDPⱼ ÷ distance^β: big economies
                    trade more, and nearby ones more still. As transport and
                    communication get cheaper (TIME–SPACE COMPRESSION), the
                    distance penalty β falls and the world "shrinks".
     MIGRATION      people move from low-wage to high-wage places (push and
                    pull), less over long distances (Ravenstein's distance
                    decay), much more where earlier migrants already live
                    (diaspora networks), and only where borders allow
                    (intervening obstacles: visas, Brexit, walls).
     REMITTANCES    migrants send money home: for some countries more than
                    10% of GDP, a flow that shapes development.
   The year slider runs from 1960 to 2020: incomes, populations, tariffs and
   transport costs follow rough historical trends.
   ===================================================================== */
// name, latitude, longitude, GDP per head 2020 (US$ thousand, PPP), population 2020 (millions), growth of GDP per head, population growth
const C = [
  ["UK", 54, -2, 46, 67, 0.02, 0.004], ["Germany", 51, 10, 54, 83, 0.02, 0.002], ["Poland", 52, 19, 34, 38, 0.035, 0.001], ["Romania", 46, 25, 32, 19, 0.035, -0.002],
  ["USA", 39, -98, 63, 330, 0.02, 0.009], ["Mexico", 23, -102, 19, 128, 0.015, 0.02], ["Brazil", -10, -52, 15, 212, 0.02, 0.018], ["Nigeria", 9, 8, 5, 206, 0.012, 0.026],
  ["Ghana", 8, -1, 5.5, 31, 0.02, 0.025], ["India", 21, 78, 6.5, 1380, 0.035, 0.017], ["Pakistan", 30, 70, 5, 220, 0.018, 0.024], ["Bangladesh", 24, 90, 5.3, 165, 0.03, 0.02],
  ["China", 35, 104, 17, 1410, 0.06, 0.012], ["Philippines", 13, 122, 8.5, 110, 0.025, 0.022], ["UAE", 24, 54, 70, 10, 0.01, 0.06], ["Australia", -25, 134, 50, 26, 0.02, 0.014]
];
const NC = C.length, IX = n => C.findIndex(c => c[0] === n);
const KT = 1.2, KM = 0.5, YRS = 25, SEND = 0.18;   // scaling constants (chosen so flows have realistic sizes)
// diaspora links: past migration (often colonial ties or labour schemes) multiplies today's flows
const LINKS = { "India>UK": 4, "Pakistan>UK": 4, "Bangladesh>UK": 3, "Nigeria>UK": 3, "Ghana>UK": 3, "Mexico>USA": 6, "Philippines>USA": 5, "China>USA": 2, "India>USA": 2, "Philippines>UAE": 10, "India>UAE": 5, "Pakistan>UAE": 4, "Bangladesh>UAE": 3, "China>Australia": 2, "India>Australia": 2, "Romania>Germany": 2, "Poland>Germany": 2, "Poland>UK": 1, "Romania>UK": 1 };
const EU = ["UK", "Germany", "Poland", "Romania"];
// great-circle distance (km)
function dist(a, b) { const R = 6371, p1 = a[1] * Math.PI / 180, p2 = b[1] * Math.PI / 180, dl = (b[2] - a[2]) * Math.PI / 180; return R * Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl))); }
const D = C.map(a => C.map(b => a === b ? 0 : Math.max(300, dist(a, b))));
/* The state of the world in a given year. o: year, tariff (world average, or null for the historical path), barrier (0–1, extra difficulty of migrating everywhere),
   euMove (EU free movement for the UK), wall (USA restrictions 0–1), gulf (Gulf work-visa schemes on). */
function world(o) {
  const y = o.year, gap = 2020 - y, pc = C.map(c => c[3] * Math.exp(-c[5] * gap * (c[0] === "China" && y < 1980 ? 1.8 : 1)) * (c[0] === "China" && y < 1980 ? 0.6 : 1)), pop = C.map(c => c[4] * Math.exp(-c[6] * gap)), gdp = pc.map((v, i) => v * pop[i]);
  const tc = Math.exp(-(y - 1960) / 28), tariff = o.tariff == null ? Math.max(0.04, 0.22 - 0.0035 * (y - 1960)) : o.tariff, beta = 0.9 + 0.4 * tc, wgdp = gdp.reduce((a, b) => a + b, 0);      // transport-cost index falls; the distance penalty β falls with it
  const T = [], M = [], Rm = [];
  for (let i = 0; i < NC; i++) { T.push([]); M.push([]); Rm.push([]); for (let j = 0; j < NC; j++) {
    if (i === j) { T[i].push(0); M[i].push(0); Rm[i].push(0); continue; }
    T[i].push(KT * gdp[i] * gdp[j] / wgdp / Math.pow(D[i][j] / 1000, beta) * Math.pow(1 - tariff, 2));                               // $ billion a year
    const pull = Math.log(pc[j] / pc[i]) - 0.3; let m = 0;
    if (pull > 0) { let open = 1 - o.barrier; const ki = C[i][0] + ">" + C[j][0], link = LINKS[ki] || 0.5;
      if (EU.includes(C[i][0]) && EU.includes(C[j][0])) open *= (C[j][0] === "UK" ? (o.euMove && y >= 2004 ? 6 : 0.4) : (y >= 2007 ? 6 : 0.4));
      if (C[j][0] === "USA") open *= 1 - 0.8 * o.wall; if (C[j][0] === "UAE") open *= o.gulf ? 3 : 0.3;
      m = KM * Math.sqrt(pop[i] * pop[j]) * pull * link * open / (D[i][j] / 1000) * (0.6 + 0.4 * (1 - tc)); }                           // thousand people a year
    M[i].push(m); Rm[i].push(m * YRS * pc[j] * SEND); } }                                                                       // remittances ($ million a year): migrants of the last YRS years each send SEND of the host income per head
  const trade = T.map((r, i) => r.reduce((a, b) => a + b, 0) + T.reduce((a, rr) => a + rr[i], 0)), out = M.map(r => r.reduce((a, b) => a + b, 0)), inn = M[0].map((_, j) => M.reduce((a, r) => a + r[j], 0));
  const remIn = Rm.map(r => r.reduce((a, b) => a + b, 0)), worldTrade = T.flat().reduce((a, b) => a + b, 0), worldGDP = gdp.reduce((a, b) => a + b, 0);
  return { y, pc, pop, gdp, T, M, Rm, trade, out, inn, remIn, tc, tariff, beta, tradeShare: 100 * worldTrade / worldGDP, mig: out.reduce((a, b) => a + b, 0),
    kof: C.map((c, i) => Math.min(100, 30 + 40 * Math.min(1, trade[i] / gdp[i] / 0.6) + 15 * Math.min(1, (out[i] + inn[i]) / pop[i] / 2) + 15 * (1 - tc))) };
}
const HIST = { year: 2020, tariff: null, barrier: 0.3, euMove: true, wall: 0.3, gulf: true };
// a survey of migrants between random pairs of places at a set distance (gravity with ±30% noise)
const gravitySample = (d, r) => 5e5 / d * Math.exp(0.3 * r.gauss());
// a student fits the distance-decay exponent from 20 random pairs
function fitDecay(r) { const pts = []; for (let k = 0; k < 20; k++) { const d = Math.exp(Math.log(300) + r() * Math.log(30)); pts.push([Math.log10(d), Math.log10(gravitySample(d, r))]); } return -K.linfit(pts).m; }

// ---------------- The page ----------------
const DEF = Object.assign({ show: { goods: true, people: true, money: false }, sel: "UK", tariffOn: false, tariffV: 0.1 }, HIST);
const P = Object.assign({}, DEF, { show: Object.assign({}, DEF.show) }); let W = null, parts = [], playing = false;
const ui = K.app({
  title: "Globalisation and Migration", subject: "Geography",
  blurb: "Sixteen countries linked by trade, migration and remittances, 1960–2020: the gravity model, time–space compression, push and pull, diasporas and borders",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 5 Global development: measuring development, uneven development, international migration (push and pull factors), and how countries are linked by trade and TNCs.", adv: "Pearson Edexcel A level Geography (9GE0) Topic 3 Globalisation (flows of capital, labour, products and information; time–space compression; switched-on and switched-off places; the KOF index; migration and its consequences) and Topic 8B Migration, identity and sovereignty (causes of migration, distance decay and the gravity model, intervening obstacles, remittances, the role of borders and policies such as EU free movement)." } },
  missions: [
    { title: "Who trades with whom?", q: "2020, goods flows only. Which pairs of countries have the thickest trade flows? Why those?", hint: "Big economies trade most with each other (USA–China, Germany–China, USA–Mexico), especially if they are close. That is the gravity model: trade ∝ size × size ÷ distance.", setup() { set({ show: { goods: true, people: false, money: false } }); } },
    { title: "A shrinking world", q: "Move the year from 1960 to 2020. How do world trade and migration change? Why?", hint: "Container ships, jet travel, the internet and falling tariffs make distance matter less (time–space compression). In the model, trade between these sixteen countries roughly doubles as a share of their GDP, and migration grows too.", setup() { set({ year: 1960 }); } },
    { title: "Push and pull", q: "Click Mexico, then the Philippines. Where do their emigrants go, and why there?", hint: "Pull: higher wages in the USA and UAE. Push: lower wages at home. Distance and past links (diasporas) steer flows: Mexico to the USA, the Philippines to the UAE and the USA.", setup() { set({ sel: "Mexico", show: { goods: false, people: true, money: false } }); } },
    { title: "Money flows home", q: "Show money. Which countries receive the most remittances relative to their GDP?", hint: "Countries with many emigrants in rich places: the Philippines, Pakistan, Bangladesh, Mexico, Ghana. Remittances can be a large share of GDP: an important flow for development (and a risk if host economies slump).", setup() { set({ sel: "Philippines", show: { goods: false, people: false, money: true } }); } },
    { lvl: "adv", title: "Brexit: an intervening obstacle", q: "Click the UK. Turn off EU free movement. Which flows change? Where do the migrants go instead?", hint: "Flows from Poland and Romania to the UK fall sharply and partly divert to Germany. Borders and policies are intervening obstacles (Lee's model): they reshape flows without changing the push and pull.", setup() { set({ sel: "UK", show: { goods: false, people: true, money: false } }); } },
    { lvl: "adv", title: "Switched off", q: "Click Nigeria and read its KOF-style globalisation score. Then raise the world tariff to 30%. Which countries are most affected?", hint: "Places with small, distant economies are least connected (switched off). Tariffs cut trade most for the smaller, more trade-dependent economies. Globalisation is uneven.", setup() { set({ sel: "Nigeria", tariffOn: true, tariffV: 0.3 }); } },
    { lvl: "adv", title: "Distance decay", q: "Batch run: Ravenstein's distance decay. Then fit the exponent as 100 students would. How close are they to 1?", hint: "Migrants ∝ 1 ÷ distance: double the distance, half the migrants. A log–log plot is a straight line of gradient −1. Twenty pairs with real-world scatter give exponents mostly between about 0.85 and 1.15.", setup() { set({}); } }
  ],
  batch: [
    { title: "Ravenstein: migrants against distance", question: "How does the number of migrants between two equal places fall with distance?", how: "Surveys of migrants between pairs of places at each distance; the gravity model with ±30% scatter.", xLabel: "distance (km)", yLabel: "migrants a year", xs: [500, 1000, 2000, 4000, 8000], reps: 8, yMin: 0, theory: d => 5e5 / d * Math.exp(0.045), theoryLabel: "∝ 1 ÷ distance", run: (d, r) => gravitySample(d, r), note: "Distance decay: twice as far, half as many. The scatter is why geographers use log scales and many pairs." },
    { title: "Fitting the distance-decay exponent", question: "If 100 students each fit a gravity model to 20 pairs of places, how close do they get to the true exponent of 1?", how: "Pairs 300–9000 km apart; least-squares line through log(migrants) against log(distance).", yLabel: "fitted exponent", reps: 100, bins: 20, theory: 1, theoryLabel: "true exponent", run: (x, r) => fitDecay(r), note: "Most are within ±0.15. More pairs, or less scatter, narrows the spread." },
    { title: "Tariffs and world trade", question: "How does world trade (as a share of world GDP) depend on the average tariff?", how: "The 2020 world with each average tariff; year-to-year business cycles add ±5%.", xLabel: "world average tariff (%)", yLabel: "world trade (% of GDP)", xs: [0, 5, 10, 15, 20, 30], reps: 6, yMin: 0, theory: t => world(Object.assign({}, HIST, { tariff: t / 100 })).tradeShare, theoryLabel: "model", run: (t, r) => world(Object.assign({}, HIST, { tariff: t / 100 })).tradeShare * (1 + 0.05 * r.gauss()), note: "Each extra point of tariff cuts trade by about 2%: trade liberalisation (GATT and the WTO) was a big driver of globalisation." },
    { lvl: "adv", title: "The shrinking world, 1960–2020", question: "How did world trade as a share of GDP grow?", how: "The historical path of incomes, tariffs and transport costs; ±5% cycles.", xLabel: "year", yLabel: "world trade (% of GDP)", xs: [1960, 1970, 1980, 1990, 2000, 2010, 2020], reps: 5, yMin: 0, theory: y => world(Object.assign({}, HIST, { year: y })).tradeShare, theoryLabel: "model", run: (y, r) => world(Object.assign({}, HIST, { year: y })).tradeShare * (1 + 0.05 * r.gauss()), note: "Trade grows much faster than output: cheaper transport and lower tariffs mean distance matters less." },
    { lvl: "adv", title: "Remittances and the wage gap", question: "How do remittances (as % of the home country's GDP) depend on how much richer the destination is?", how: "One origin of 100 million people with a diaspora link; destinations 2–20 times richer, 3000 km away; ±20% scatter.", xLabel: "destination wage ÷ home wage", yLabel: "remittances (% of home GDP)", xs: [2, 4, 6, 10, 15, 20], reps: 6, yMin: 0, theory: x => remitShare(x), theoryLabel: "model", run: (x, r) => remitShare(x) * Math.exp(0.2 * r.gauss()), note: "Bigger wage gaps pull more migrants and each sends home more: remittances rise steeply with inequality between countries." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1GA0 5", text: "Push factors drive people away (low wages, conflict, few jobs); pull factors attract them (higher wages, safety, family already there). Most migration is from poorer to richer places." },
      { lvl: "std", tag: "1GA0 5", text: "Countries are linked by trade, investment by TNCs, migration and remittances. Development is uneven: some places are much better connected than others." },
      { lvl: "adv", tag: "9GE0 3.1", text: "Globalisation: flows of capital, labour, products and information. Drivers: transport (containerisation), ICT, trade liberalisation (WTO), TNCs. Time–space compression makes distance matter less." },
      { lvl: "adv", tag: "9GE0 3.2", text: "Globalisation is uneven: the KOF index measures economic, social and political connectedness. Switched-on places gain; switched-off places (remote, landlocked, unstable) are left behind." },
      { lvl: "adv", tag: "9GE0 8B", text: "Ravenstein: most migrants move short distances; flows decline with distance (gravity model: M ∝ P₁P₂ ÷ d). Lee: push, pull and intervening obstacles (borders, cost, policy)." },
      { lvl: "adv", tag: "9GE0 8B", text: "Consequences: remittances, brain drain, filling labour shortages, cultural mixing and tensions; policies (EU free movement, points systems, Gulf work visas) shape flows and raise questions of sovereignty." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain two reasons why people migrate from Mexico to the USA.", ans: "<ul><li>pull: much higher wages in the USA</li><li>more jobs (agriculture, construction)</li><li>push: lower wages and fewer jobs in Mexico</li><li>family and community already in the USA (diaspora); short distance</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Use the gravity model to explain why ${W ? C[maxPair()[0]][0] + " and " + C[maxPair()[1]][0] : "the USA and China"} have the largest trade flow in the model.`, ans: "<ul><li>trade ∝ (size of economy × size of economy) ÷ distance^β</li><li>both are among the largest economies</li><li>the size effect outweighs the distance between them; falling transport costs reduce the distance penalty</li></ul>" },
      { lvl: "adv", marks: 4, q: "Assess the importance of remittances for the development of countries such as the Philippines.", ans: "<ul><li>large flows (around 10% of GDP): pay for food, education, housing</li><li>foreign currency, more stable than FDI</li><li>but dependence on host economies; brain drain; families separated</li><li>may not fund productive investment</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Countries:</b> 16, with 2020 GDP per head (PPP) and population, projected back with rough growth rates (China grows faster after 1980).</li>
<li><b>Trade:</b> T = 1.2 × GDPᵢ × GDPⱼ ÷ world GDP ÷ (distance in 1000 km)^β × (1 − tariff)². β = 0.9 + 0.4 × transport-cost index, which falls from 1 in 1960 (time–space compression). The world tariff follows the historical fall (22% in 1960, about 4% by 2010) unless you set it.</li>
<li><b>Migration</b> (thousands a year) = 0.5 × √(Pᵢ Pⱼ) × [ln(wage ratio) − 0.3] × diaspora link × openness ÷ distance, only where the destination is richer. Diaspora links multiply flows (Mexico–USA × 6, India–UAE × 5 …). EU free movement opens flows between EU members (from 2004 for the UK, 2007 elsewhere); the USA wall and Gulf visa schemes scale flows to those countries.</li>
<li><b>Remittances:</b> each migrant of the last 25 years sends home 18% of the host country's income per head.</li>
<li><b>Globalisation score:</b> a KOF-style index from trade ÷ GDP, migration ÷ population and the transport-cost index (illustrative, not the published KOF values).</li></ul>
<h3>Simplifications</h3><ul><li>Only 16 countries; all other countries are left out, so shares are of this world, not the real one.</li><li>Constants are chosen so the sizes of flows look reasonable; the patterns, not the exact numbers, are the point.</li><li>No refugees, return migration, capital (FDI) flows or information flows are modelled separately.</li></ul>`
});
function remitShare(ratio) { const pop = 100, pcHome = 5, pull = Math.log(ratio) - 0.3, m = KM * Math.sqrt(pop * 100) * pull * 3 * 0.7 / 3 * 0.96; return 100 * (m * YRS * pcHome * ratio * SEND) / (pcHome * pop * 1000); }   // one origin, one destination 3000 km away
function maxPair() { let b = [0, 1], v = 0; for (let i = 0; i < NC; i++) for (let j = 0; j < NC; j++) if (W.T[i][j] + W.T[j][i] > v) { v = W.T[i][j] + W.T[j][i]; b = [i, j]; } return b; }

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Time");
ctl.year = K.slider(g, { label: "Year", min: 1960, max: 2020, step: 1, value: 2020, on: v => { P.year = v; recalc(); } });
K.btn(K.row(g), "▶ Play 1960 → 2020", () => { P.year = 1960; ctl.year.set(1960); playing = true; recalc(); }, "primary");
g = ui.group("Show flows");
ctl.goods = K.toggle(g, { label: "🟧 Goods (trade)", value: true, on: v => P.show.goods = v });
ctl.people = K.toggle(g, { label: "🟦 People (migration)", value: true, on: v => P.show.people = v });
ctl.money = K.toggle(g, { label: "🟩 Money (remittances)", value: false, on: v => P.show.money = v });
g = ui.group("Policies and barriers");
ctl.tariffOn = K.toggle(g, { label: "Set the world tariff myself", value: false, on: v => { P.tariffOn = v; recalc(); } });
ctl.tariffV = K.slider(g, { label: "World average tariff", min: 0, max: 0.4, step: 0.01, value: 0.1, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.tariffV = v; recalc(); } });
ctl.barrier = K.slider(g, { label: "Barriers to migration everywhere", min: 0, max: 0.9, step: 0.05, value: 0.3, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.barrier = v; recalc(); } });
ctl.euMove = K.toggle(g, { label: "UK in EU free movement (off = after Brexit)", value: true, on: v => { P.euMove = v; recalc(); } });
ctl.wall = K.slider(g, { label: "USA border restrictions", min: 0, max: 1, step: 0.05, value: 0.3, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.wall = v; recalc(); } });
ctl.gulf = K.toggle(g, { label: "Gulf work-visa schemes", value: true, on: v => { P.gulf = v; recalc(); } });
const read = K.readout(ui.group("Selected country (click the map)"), [["n", "country"], ["pc", "GDP per head"], ["tr", "trade ÷ GDP"], ["mig", "migrants in / out a year"], ["rem", "remittances received"], ["kof", "globalisation score"]]);
function sync() { ctl.year.set(P.year); ctl.goods.set(P.show.goods); ctl.people.set(P.show.people); ctl.money.set(P.show.money); ctl.tariffOn.set(P.tariffOn); ctl.tariffV.set(P.tariffV); ctl.barrier.set(P.barrier); ctl.euMove.set(P.euMove); ctl.wall.set(P.wall); ctl.gulf.set(P.gulf);
  const adv = ui.level === "adv"; for (const k of ["tariffOn", "tariffV", "euMove", "wall", "gulf"]) ctl[k].el.style.display = adv ? "" : "none"; }
function set(o) { Object.assign(P, DEF, { show: Object.assign({}, DEF.show) }, o); playing = false; sync(); recalc(); }
function recalc() { W = world(Object.assign({}, P, { tariff: P.tariffOn ? P.tariffV : null })); }

// ---------------- Drawing: a simple world map (equirectangular) with flows as moving dots along arcs ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let geo = null;
// rough continent outlines (longitude, latitude) for orientation only
const LAND = [[[-168, 66], [-140, 70], [-95, 72], [-60, 60], [-52, 47], [-80, 25], [-97, 18], [-83, 9], [-105, 22], [-125, 40], [-130, 55], [-168, 66]], [[-80, 9], [-50, 0], [-35, -8], [-40, -22], [-58, -38], [-70, -54], [-75, -20], [-81, -4], [-80, 9]],
  [[-10, 36], [-9, 44], [-4, 48], [5, 54], [10, 58], [25, 70], [40, 67], [60, 70], [100, 77], [140, 72], [180, 68], [160, 60], [140, 50], [122, 40], [120, 23], [105, 10], [100, 14], [90, 22], [78, 8], [72, 20], [57, 25], [50, 30], [35, 30], [26, 40], [10, 44], [-10, 36]],
  [[-17, 21], [-5, 36], [10, 37], [32, 31], [43, 12], [51, 11], [40, -15], [32, -28], [20, -35], [12, -6], [9, 4], [-8, 5], [-17, 15], [-17, 21]], [[114, -22], [130, -12], [143, -11], [153, -27], [146, -39], [131, -32], [115, -34], [114, -22]], [[-8, 50], [2, 51], [-3, 59], [-8, 55], [-8, 50]]];
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#081226"; c.fillRect(0, 0, w, h); if (!W) return;
  const X = lon => 20 + (lon + 170) / 340 * (w - 40), Y = lat => 30 + (75 - lat) / 135 * (h - 60); geo = { X, Y };
  c.fillStyle = "#16233f"; for (const poly of LAND) { c.beginPath(); poly.forEach(([lo, la], k) => k ? c.lineTo(X(lo), Y(la)) : c.moveTo(X(lo), Y(la))); c.closePath(); c.fill(); }
  const sel = IX(P.sel), pos = i => [X(C[i][2]), Y(C[i][1])];
  // arcs and moving dots for each flow above a threshold; brighter when it touches the selected country
  const kinds = [["goods", W.T, "255,180,84", 60], ["people", W.M, "90,209,255", 2], ["money", W.Rm, "126,231,135", 300]];
  for (const [k, Mx, col, thr] of kinds) { if (!P.show[k]) continue; for (let i = 0; i < NC; i++) for (let j = 0; j < NC; j++) { const v = Mx[i][j]; if (!(v > thr)) continue; const on = i === sel || j === sel, [x1, y1] = pos(k === "money" ? j : i), [x2, y2] = pos(k === "money" ? i : j), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.18, wdt = Math.min(5, 0.6 + Math.log10(v / thr) * 1.6);
    c.strokeStyle = `rgba(${col},${on ? 0.65 : 0.16})`; c.lineWidth = wdt; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke(); c.lineWidth = 1;
    const nDots = Math.min(5, 1 + Math.floor(Math.log10(v / thr) * 2)), t0 = performance.now() / 4000; for (let d = 0; d < nDots; d++) { const t = (t0 + d / nDots + (i * 7 + j * 3) / 50) % 1, px = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2, py = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2; c.fillStyle = `rgba(${col},${on ? 1 : 0.5})`; c.beginPath(); c.arc(px, py, on ? 3 : 2, 0, 6.3); c.fill(); } } }
  // countries: circle area ∝ GDP, colour by income
  for (let i = 0; i < NC; i++) { const [x, y] = pos(i), r = 4 + Math.sqrt(W.gdp[i]) / 18, inc = Math.min(1, Math.log(W.pc[i] / 1) / Math.log(80)); c.fillStyle = `hsl(${30 + 170 * inc},55%,${45 + 10 * inc}%)`; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); if (i === sel) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.stroke(); c.lineWidth = 1; } TX(c, C[i][0], x, y - r - 4, i === sel ? "#fff" : "#cfd8ea", "center", i === sel ? "600 12px" : "11px"); }
  TX(c, `${P.year}`, 24, 34, "#eef2f8", "left", "600 22px"); TX(c, `world trade ${W.tradeShare.toFixed(0)}% of GDP · migrants ${(W.mig / 1000).toFixed(2)} million a year · tariff ${(W.tariff * 100).toFixed(0)}% · distance penalty β ${W.beta.toFixed(2)}`, 24, 54, "#aab6cc", "left", "12px");
  TX(c, "circle size: GDP · colour: income per head (orange poor → teal rich)", w - 16, h - 10, "#8fa0bf", "right", "10.5px");
  ui.hud("");
}
K.pointer(cv.el, { down: ({ x, y }) => { if (!geo) return; let b = null, bd = 900; for (let i = 0; i < NC; i++) { const d = (geo.X(C[i][2]) - x) ** 2 + (geo.Y(C[i][1]) - y) ** 2; if (d < bd) { bd = d; b = i; } } if (b != null) P.sel = C[b][0]; } });
const series = (() => { const cache = {}; return key => cache[key] || (cache[key] = [1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020].map(y => world(Object.assign({}, P, { year: y, tariff: P.tariffOn ? P.tariffV : null })))); })();
function charts() { if (!W) return; const i = IX(P.sel), key = [P.tariffOn, P.tariffV, P.barrier, P.euMove, P.wall, P.gulf].join(), S = series(key);
  chA.opts.title = "The shrinking world"; chA.opts.xLabel = "year"; chA.opts.yLabel = "% of GDP / 100 000 people"; chA.draw([{ pts: S.map(q => [q.y, q.tradeShare]), color: "#ffb454", label: "world trade, % of GDP" }, { pts: S.map(q => [q.y, q.mig / 100]), color: "#5ad1ff", label: "migrants a year (× 100 000)" }], { xMin: 1960, xMax: 2020, yMin: 0, vlines: [{ x: P.year, label: "now" }] });
  const order = C.map((c, k) => k).sort((a, b) => W.kof[b] - W.kof[a]); chB.opts.title = ui.level === "adv" ? "Globalisation score (KOF-style)" : "How connected is each country?"; chB.opts.xLabel = ""; chB.opts.yLabel = "score"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? (C[order[Math.round(v)]] || [""])[0].slice(0, 5) : "";
  chB.draw([{ pts: order.map((k, n) => [n, W.kof[k]]), type: "bars", w: 0.7, color: "#c4a1ff", label: "" }, { pts: [[order.indexOf(i), W.kof[i]]], type: "bars", w: 0.7, color: "#ffd166", label: P.sel }], { xMin: -0.6, xMax: NC - 0.4, yMin: 0, yMax: 100 });
  read.set("n", P.sel); read.set("pc", "$" + (1000 * W.pc[i]).toFixed(0)); read.set("tr", (100 * W.trade[i] / W.gdp[i]).toFixed(0) + "%"); read.set("mig", `${W.inn[i].toFixed(0)}k / ${W.out[i].toFixed(0)}k`); read.set("rem", `${(W.remIn[i] / 1000).toFixed(1)} $bn (${(100 * W.remIn[i] / (W.gdp[i] * 1000)).toFixed(1)}% of GDP)`); read.set("kof", W.kof[i].toFixed(0));
}
let frame = 0, acc = 0;
ui.onLevel = () => sync();
ui.run(dt => { if (playing && dt > 0) { acc += dt * 6; while (acc >= 1) { acc -= 1; P.year++; if (P.year >= 2020) { P.year = 2020; playing = false; } } ctl.year.set(P.year); recalc(); } }, dt => { draw(dt); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Orange: goods. Blue: people. Green: money sent home. Click a country to follow its flows, and drag the year back to 1960.", 7000);
