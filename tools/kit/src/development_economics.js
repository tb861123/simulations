/* =====================================================================
   DEVELOPMENT ECONOMICS: fifty years of a developing country
   Three classic ideas are built into one small economy:
     HARROD–DOMAR   growth needs investment, and investment needs saving:
                    growth rate ≈ s ÷ v − depreciation (s: saving ratio,
                    v: capital–output ratio). A SAVINGS GAP can be filled
                    by aid, foreign direct investment (FDI) or microfinance.
     LEWIS          a poor country has SURPLUS LABOUR on the land: extra
                    farm workers add almost nothing. Factories can hire them
                    at a fixed wage just above subsistence, so profits are
                    high and are reinvested, until the surplus runs out:
                    the LEWIS TURNING POINT, after which wages rise.
     PRIMARY PRODUCT DEPENDENCY  a country living on one commodity (copper,
                    coffee) faces volatile prices and, over decades, falling
                    terms of trade (Prebisch–Singer). Imported machines must
                    be paid for in foreign currency: a FOREIGN CURRENCY GAP.
   The Human Development Index (HDI) combines income, health and education.
   ===================================================================== */
const PRE = {
  copper: { name: "Copper exporter", s: 0.12, cshare: 0.35, edu: 0.025, d: 0.4, open: 0.3, aid: 0.04, eff: 0.5, H0: 0.2, note: "a mining economy like Zambia in the 1970s–2000s: copper is most of its exports" },
  garment: { name: "Garment maker", s: 0.2, cshare: 0.05, edu: 0.03, d: 0.85, open: 0.7, aid: 0.02, eff: 0.6, H0: 0.25, note: "a labour-intensive manufacturer like Bangladesh since the 1990s" },
  tiger: { name: "Tiger economy", s: 0.34, cshare: 0.03, edu: 0.05, d: 0.9, open: 0.8, aid: 0.01, eff: 0.8, H0: 0.3, note: "high saving, schooling and exports, like South Korea from the 1960s" },
  diamond: { name: "Diamonds, well run", s: 0.28, cshare: 0.3, edu: 0.05, d: 0.6, open: 0.5, aid: 0.0, eff: 0.8, H0: 0.25, note: "a resource exporter that saves its revenue and builds schools, like Botswana" }
};
/* One country. o: s (saving ratio), cshare (commodity share of output at the start), edu (education spending, share of GDP),
   d (share of investment going to industry rather than mining), open (openness to FDI and trade), aid (% of GDP), eff (share of aid that becomes investment),
   micro (microfinance on), ps (Prebisch–Singer falling trend on), sigma (commodity price volatility). r: random numbers for the price shocks. */
function country(o, r, years = 50) {
  const L0 = 10, Lmin0 = 0.35; let L = L0, H = o.H0 || 0.25, agA = 1, Kind = 2.5, x = 0, t = 0;
  const Lind0 = 1, Yag0 = agA * Lmin0 * L, wbar = 1.5 * Yag0 / (L - Lind0);   // industrial wage: 1.5 × average farm income, fixed while surplus labour lasts
  const A0 = wbar / (0.65 * Kind ** 0.35), Yind0 = A0 * Kind ** 0.35 * Lind0 ** 0.65, Vc = { v: o.cshare / (1 - o.cshare) * (Yag0 + Yind0) };   // A0 chosen so 10% of workers are in industry at the start
  const scale = 800 / ((Yag0 + Yind0 + Vc.v) / L0);                           // convert model units to US$ per head (start ≈ $800)
  const out = []; let turning = null;
  for (t = 0; t <= years; t++) {
    const Lmin = Lmin0 * L, A = A0 * Math.pow(1.01, t) * (0.7 + 0.6 * H) / (0.7 + 0.6 * (o.H0 || 0.25));
    // industry hires surplus labour at the fixed wage until the marginal product of labour falls to it (Lewis)
    let Lind = Math.pow(0.65 * A * Kind ** 0.35 / wbar, 1 / 0.35), wage = wbar, surplus = true;
    if (Lind > L - Lmin) { Lind = L - Lmin; surplus = false; } const Yind = A * Kind ** 0.35 * Lind ** 0.65; if (!surplus) wage = 0.65 * Yind / Lind;
    if (!surplus && turning === null) turning = t;
    const Lag = L - Lind, Yag = agA * Math.min(Lag, Lmin);                    // farm output: workers beyond Lmin add nothing (surplus labour)
    const Pc = Math.exp((o.ps ? -0.012 * t : 0) + x), Yc = Vc.v * Pc, Y = Yag + Yind + Yc;
    // (farm households near subsistence save only 3%; the modern sector saves s)
    // investment: domestic saving + effective aid + FDI, limited by the foreign currency needed for imported machines (40% of investment)
    const s = o.s + (o.micro ? 0.03 : 0), aid = o.aid * Y, fdi = 0.04 * o.open * Y, exports = Yc + (0.1 + 0.5 * o.open) * Yind;
    let I = s * (Yind + Yc) + 0.03 * Yag + o.eff * aid + fdi; const fx = exports + aid + fdi - 0.12 * Y, gap = 0.4 * I > fx; if (gap) I = Math.max(0, fx) / 0.4;   // 12% of GDP must buy essential imports (fuel, medicines) first
    const pc = scale * Y / L, LE = Math.min(85, 46 + 6.5 * Math.log(1 + pc / 400) + 10 * H), school = 1.5 + 11 * H;
    const hdi = Math.cbrt(Math.max(0.01, (LE - 20) / 65) * Math.min(1, school / 15) * Math.max(0.01, Math.min(1, (Math.log(pc * 1.1) - Math.log(100)) / (Math.log(75000) - Math.log(100)))));
    out.push({ t, Y: scale * Y, pc, L, Lind, Lag, share: Lind / L, wage: wage / wbar, Pc, Yc: scale * Yc, cs: Yc / Y, I: I / Y, gap, H, LE, school, hdi, surplus });
    // next year
    Kind += o.d * I - 0.05 * Kind; Vc.v += (1 - o.d) * I * 0.12 - 0.03 * Vc.v;
    H = Math.min(1, H + 0.8 * o.edu * (1 - H) - 0.008 * H); agA *= 1.01 + (o.micro ? 0.008 : 0);
    const n = Math.max(0.004, 0.026 - 0.03 * (H - (o.H0 || 0.25)) - 0.004 * Math.log(Math.max(1, pc / 800))); L *= 1 + n;
    x = 0.7 * x + (o.sigma == null ? 0.2 : o.sigma) * r.gauss();
  }
  out.turning = turning; return out;
}
const growth = (run, a, b) => 100 * (Math.pow(run[b].pc / run[a].pc, 1 / (b - a)) - 1);
// the plain Harrod–Domar model: output = capital ÷ v; each year K grows by sY − δK, plus a random shock
function harrodDomar(s, v, r, years = 20) { let K = 3, Y = K / v; const Y0 = Y; for (let t = 0; t < years; t++) { K += s * Y - 0.05 * K; Y = K / v * (1 + 0.02 * r.gauss()); } return 100 * (Math.pow(Y / Y0, 1 / years) - 1); }

// ---------------- The page ----------------
const DEF = Object.assign({ pre: "copper", micro: false, ps: true, sigma: 0.2, chart: "lewis" }, PRE.copper);
const P = Object.assign({}, DEF); let seed = 3, run = null, yr = 0, speed = 3;
const ui = K.app({
  title: "Development Economics", subject: "Economics",
  blurb: "Fifty years of a developing country: saving and investment, surplus labour moving to the cities, commodity prices, aid and the HDI",
  reset: () => set({ pre: P.pre }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Economics (4EC1) 2.4 and the global economy: economic growth and development, GDP per head and the HDI, causes of poverty, and policies to promote development (education, infrastructure, aid, FDI).", adv: "Pearson Edexcel A level Economics A (9EC0) Theme 4, 4.3 Emerging and developing economies: measures of development (HDI), factors influencing growth and development (primary product dependency, volatile commodity prices, the savings gap and the Harrod–Domar model, the foreign currency gap, capital flight, population growth, education, access to credit), strategies (market-orientated: FDI, trade liberalisation, microfinance; interventionist: human capital, infrastructure; industrialisation and the Lewis model; aid and debt relief)." } },
  missions: [
    { title: "Fifty years of a copper exporter", q: "Watch the copper exporter for 50 years. What happens to income per head when the copper price falls? Why is growth so bumpy?", hint: "Copper earns most of the foreign currency. When its price falls, income and saving fall, so investment and growth fall too; if export earnings fall far enough the country cannot even afford imported machines (the foreign currency gap, shaded on the commodity chart). Dependence on one primary product makes growth volatile.", setup() { set({ pre: "copper" }); } },
    { title: "Saving for growth", q: "Garment maker: raise the saving ratio from 10% to 30%. How does the growth rate change?", hint: "More saving → more investment → more capital → more output. The Harrod–Domar model says growth ≈ s ÷ v − depreciation. But saving is hard when people are poor: a savings gap.", setup() { set({ pre: "garment", s: 0.1 }); } },
    { title: "From village to city", q: "Tiger economy. Watch the workers move from the village to the factories. When does the factory wage start to rise?", hint: "While there is surplus labour on the farms, factories can hire at the same low wage, so profits (and reinvestment) are high. When the surplus runs out (the Lewis turning point) firms must pay more to attract workers: wages rise.", setup() { set({ pre: "tiger", chart: "lewis" }); } },
    { title: "Schools", q: "Copper exporter: raise education spending from 2.5% to 6% of GDP. What happens to life expectancy, years of schooling, population growth and the HDI after 30 years?", hint: "Education builds human capital: workers are more productive, families have fewer children (slower population growth), and the HDI rises on two counts. The payoff is slow: decades, not years.", setup() { set({ pre: "copper", edu: 0.06 }); } },
    { lvl: "adv", title: "Aid that works, aid that leaks", q: "Copper exporter with aid of 10% of GDP. Compare an aid efficiency of 10% with 90%. When does aid raise growth?", hint: "Aid fills the savings gap and the foreign currency gap, but only if it becomes investment. With poor governance (corruption, capital flight, aid spent on consumption) much of it leaks away.", setup() { set({ pre: "copper", aid: 0.1, eff: 0.1 }); } },
    { lvl: "adv", title: "Diversify!", q: "Copper exporter: move the share of investment going into industry from 40% to 90%. What happens to the volatility of growth and to income after 50 years?", hint: "More industry means less dependence on copper: smaller swings, and no Prebisch–Singer drag. Diversification takes time, because the factories start small.", setup() { set({ pre: "copper", d: 0.9 }); } },
    { lvl: "adv", title: "The resource curse avoided", q: "Diamonds, well run: compare with the copper exporter. What does this country do differently with its commodity income?", hint: "It saves a high share (like Botswana's revenue saving), invests in schools and keeps governance good, so commodity income becomes lasting capital and human capital rather than a boom and bust.", setup() { set({ pre: "diamond" }); } },
    { lvl: "adv", title: "Microfinance", q: "Garment maker: switch on microfinance. Which sector benefits, and by how much does growth change?", hint: "Small loans let poor households save and invest (raising s a little) and farmers buy better seed, raising farm productivity. A modest but real effect: microfinance is not a cure for poverty on its own." , setup() { set({ pre: "garment", micro: true }); } }
  ],
  batch: [
    { title: "Harrod–Domar: saving and growth", question: "How does the growth rate depend on the saving ratio?", how: "The plain Harrod–Domar model: capital–output ratio v = 3, depreciation 5%; 20 years with ±2% shocks to output each year.", xLabel: "saving ratio s", yLabel: "growth of output (% a year)", xs: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35], reps: 6, fit: true, theory: s => 100 * (Math.pow(1 + s / 3 - 0.05, 1) - 1), theoryLabel: "s ÷ v − δ", run: (s, r) => harrodDomar(s, 3, r), note: "A straight line: each extra 3% of GDP saved adds about 1% to growth. Below s = 15% the capital stock barely keeps up with depreciation: a savings gap." },
    { title: "Commodity dependence and volatile growth", question: "How bumpy is growth in a country that depends on one commodity?", how: "50 years; the share of output from the commodity at the start is varied; result = SD of the yearly growth of income per head.", xLabel: "commodity share of output at the start", yLabel: "SD of yearly growth (%)", xs: [0.05, 0.15, 0.25, 0.35, 0.45, 0.55], reps: 8, yMin: 0, run: (c, r) => { const R = country(Object.assign({}, PRE.copper, { cshare: c, ps: true, sigma: 0.2 }), r); const g = []; for (let t = 1; t < R.length; t++) g.push(100 * (R[t].pc / R[t - 1].pc - 1)); return K.sd(g); }, note: "The more a country depends on one primary product, the more its growth swings with world prices." },
    { title: "Aid and growth", question: "How much does aid add to growth of income per head, depending on how much of it is invested?", how: "Copper exporter, 30 years, aid 8% of GDP; aid efficiency = share of aid that becomes investment.", xLabel: "aid efficiency", yLabel: "growth of income per head (% a year)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 8, theory: e => growth(country(Object.assign({}, PRE.copper, { aid: 0.08, eff: e, sigma: 0 }), K.rng(1), 30), 0, 30), theoryLabel: "no price shocks", run: (e, r) => growth(country(Object.assign({}, PRE.copper, { aid: 0.08, eff: e }), r, 30), 0, 30), note: "Aid only raises growth if it becomes investment. Copper-price luck adds a lot of scatter between runs." },
    { lvl: "adv", title: "When is the Lewis turning point?", question: "How many years until surplus labour runs out, depending on the saving (reinvestment) ratio?", how: "Garment maker with little commodity income; year in which factories have hired all the surplus farm workers.", xLabel: "saving ratio", yLabel: "year of the turning point", xs: [0.15, 0.2, 0.25, 0.3, 0.35], reps: 6, yMin: 0, theory: s => { const R = country(Object.assign({}, PRE.garment, { s, sigma: 0 }), K.rng(1), 80); return R.turning == null ? 80 : R.turning; }, theoryLabel: "no price shocks", run: (s, r) => { const R = country(Object.assign({}, PRE.garment, { s }), r, 80); return R.turning == null ? 80 : R.turning; }, note: "Faster capital accumulation absorbs the surplus labour sooner. After the turning point, wages rise with productivity." },
    { lvl: "adv", title: "Copper luck: 200 exporters", question: "Two hundred identical copper exporters with different luck in copper prices: how varied is income per head after 30 years?", how: "Copper exporter settings; only the random copper price path differs.", yLabel: "income per head after 30 years (US$)", reps: 200, bins: 24, run: (x, r) => country(PRE.copper, r, 30)[30].pc, note: "Identical policies, very different outcomes: luck in commodity prices matters a great deal for primary-product exporters." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1", text: "Economic growth is a rise in real GDP; development is a rise in living standards and welfare (health, education, freedom). The HDI combines life expectancy, years of schooling and GNI per head." },
      { lvl: "std", tag: "4EC1", text: "Barriers to development: low saving and investment, rapid population growth, poor education and health, dependence on primary products, debt, corruption and poor infrastructure." },
      { lvl: "adv", tag: "9EC0 4.3.2", text: "Primary product dependency: commodity prices are volatile (inelastic supply and demand), so export earnings and growth swing; Prebisch–Singer: the terms of trade of primary products tend to fall over time." },
      { lvl: "adv", tag: "9EC0 4.3.2", text: "Harrod–Domar: growth = s ÷ v (minus depreciation). Low incomes mean low saving: a savings gap, which aid, FDI and microfinance can fill. Limitation: assumes capital is the only constraint." },
      { lvl: "adv", tag: "9EC0 4.3.2", text: "Foreign currency gap: imported capital goods must be paid for in foreign currency, limited by export earnings; capital flight and debt servicing make it worse." },
      { lvl: "adv", tag: "9EC0 4.3.3", text: "Lewis model: surplus labour (MPL ≈ 0) moves from agriculture to industry at a constant wage; profits are reinvested; at the turning point wages rise. Criticisms: profits may not be reinvested, labour-saving technology, urban unemployment." },
      { lvl: "adv", tag: "9EC0 4.3.3", text: "Strategies: market-orientated (trade liberalisation, FDI, microfinance, privatisation) and interventionist (human capital, infrastructure, protection of infant industries); aid and debt relief; the roles of the World Bank, IMF and NGOs." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why GDP per head alone is not a complete measure of development.", ans: "<ul><li>it is an average: hides inequality</li><li>ignores health, education and freedom</li><li>ignores the informal economy and the environment; the HDI adds life expectancy and schooling</li></ul>" },
      { lvl: "adv", marks: 4, q: "Using the Harrod–Domar model, explain how aid might increase economic growth, and one limitation.", ans: "<ul><li>aid adds to saving, filling the savings gap</li><li>allowing more investment and a larger capital stock</li><li>growth = s ÷ v rises</li><li>limitation: aid may not be invested (corruption, consumption); growth also needs skills and institutions</li></ul>" },
      { lvl: "adv", marks: 4, q: () => run ? `In this run the Lewis turning point came in year ${run.turning == null ? "(not yet)" : run.turning}. Explain what happens to industrial wages before and after it.` : "Explain what happens to industrial wages before and after the Lewis turning point.", ans: "<ul><li>before: surplus labour on farms, so firms hire at a constant low wage</li><li>profits are high and reinvested, expanding industry</li><li>after: surplus labour is exhausted</li><li>firms must compete for workers, so wages rise</li></ul>" }
    ]
  },
  notes: `<h3>The model (one year at a time)</h3>
<ul><li><b>Farming:</b> output = productivity × (workers needed: 35% of the population); farm workers beyond that add nothing (surplus labour). Farm productivity grows 1% a year (1.8% with microfinance).</li>
<li><b>Industry:</b> output = A K^0.35 L^0.65. While there is surplus labour, firms hire until the marginal product of labour equals a fixed wage (1.5 × farm income at the start). When the surplus is used up (the Lewis turning point) the wage rises to the marginal product. A grows 1.2% a year and with human capital H.</li>
<li><b>Commodity (mining):</b> value = volume × world price; ln(price) = trend + x, x = 0.7 x(last year) + shock (SD 0.2). The Prebisch–Singer trend lowers the price by 1.2% a year.</li>
<li><b>Investment</b> = s × GDP + (aid × efficiency) + FDI (4% of GDP × openness). 40% of investment is imported machinery and must be paid for in foreign currency (exports + aid + FDI, after 12% of GDP is spent on essential imports); if there is not enough, investment is cut (the foreign currency gap). A share d goes to industry, the rest to mining. Depreciation 5% (3% for mines).</li>
<li><b>Education</b> spending raises human capital H; H raises productivity, life expectancy and schooling and lowers population growth (2.6% a year at the start).</li>
<li><b>HDI</b> = geometric mean of (life expectancy − 20) ÷ 65, schooling ÷ 15 and (ln GNI per head − ln 100) ÷ (ln 75 000 − ln 100). Income per head starts near $800.</li></ul>
<h3>Simplifications</h3><ul><li>One country, no debt, no inflation, no exchange rate; services and tourism are left out.</li><li>The numbers are illustrative: chosen so the presets behave like the countries they are named after, not fitted to data.</li><li>Governance is represented only by aid efficiency.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Country");
ctl.pre = K.seg(g, { value: "copper", options: Object.entries(PRE).map(([k, x]) => [k, x.name]), on: v => set({ pre: v }) });
const preNote = K.note(g, "");
g = ui.group("Policies");
ctl.s = K.slider(g, { label: "Saving ratio (domestic)", min: 0.05, max: 0.4, step: 0.01, value: 0.12, fmt: v => (v * 100).toFixed(0) + "% of GDP", on: v => { P.s = v; rerun(); } });
ctl.edu = K.slider(g, { label: "Education spending", min: 0, max: 0.08, step: 0.005, value: 0.025, fmt: v => (v * 100).toFixed(1) + "% of GDP", on: v => { P.edu = v; rerun(); } });
ctl.d = K.slider(g, { label: "Investment into industry (rest into mining)", min: 0.1, max: 1, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.d = v; rerun(); } });
ctl.open = K.slider(g, { label: "Openness to trade and FDI", min: 0, max: 1, step: 0.05, value: 0.3, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.open = v; rerun(); } });
ctl.aid = K.slider(g, { label: "Foreign aid", min: 0, max: 0.15, step: 0.005, value: 0.04, fmt: v => (v * 100).toFixed(1) + "% of GDP", on: v => { P.aid = v; rerun(); } });
ctl.eff = K.slider(g, { label: "Aid efficiency (governance)", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "% invested", on: v => { P.eff = v; rerun(); } });
ctl.micro = K.toggle(g, { label: "Microfinance", value: false, on: v => { P.micro = v; rerun(); } });
g = ui.group("World prices");
ctl.ps = K.toggle(g, { label: "Prebisch–Singer: commodity prices drift down", value: true, on: v => { P.ps = v; rerun(); } });
ctl.sigma = K.slider(g, { label: "Commodity price volatility", min: 0, max: 0.4, step: 0.05, value: 0.2, on: v => { P.sigma = v; rerun(); } });
let rr = K.row(g); K.btn(rr, "🎲 New price luck", () => { seed++; rerun(); }, "primary"); K.btn(rr, "↺ Start again", () => yr = 0);
ctl.chart = K.seg(g, { label: "Second chart", value: "lewis", options: [["lewis", "Lewis: workers and wages"], ["comm", "Commodity price and investment"]], on: v => P.chart = v });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 10, step: 1, value: 3, fmt: v => v + " years a second", on: v => speed = v });
const read = K.readout(ui.group("Year by year"), [["y", "year"], ["pc", "income per head"], ["g", "growth (10-year average)"], ["hdi", "HDI"], ["ind", "workers in industry"], ["cs", "commodity share of GDP"]]);
function sync() { ctl.pre.set(P.pre); for (const k of ["s", "edu", "d", "open", "aid", "eff", "sigma"]) ctl[k].set(P[k]); ctl.micro.set(P.micro); ctl.ps.set(P.ps); ctl.chart.set(P.chart); preNote.textContent = "Like " + PRE[P.pre].note + "."; }
function set(o) { Object.assign(P, DEF, PRE[o.pre || "copper"], { pre: o.pre || "copper" }, o); sync(); rerun(); yr = 0; }
function rerun() { run = country(P, K.rng(seed * 104729 + 7)); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function person(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 1.1, s * 0.55, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(x, y + s * 0.2, s * 0.7, s * 0.8, 0, Math.PI, 0); c.fill(); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!run) return;
  const k = Math.min(50, Math.floor(yr)), R = run[k];
  // sky turns from dusty to clearer as income grows; the ground
  const top = 60, gy = h * 0.62; c.fillStyle = "#121a30"; c.fillRect(0, top, w, gy - top); c.fillStyle = "#1d2a1a"; c.fillRect(0, gy, w, h - gy);
  TX(c, `${PRE[P.pre].name}: year ${k}`, 20, 30, "#eef2f8", "left", "600 16px"); TX(c, `income per head $${R.pc.toFixed(0)} · HDI ${R.hdi.toFixed(3)} · population ${R.L.toFixed(1)} million`, 20, 50, "#aab6cc", "left", "12.5px");
  // the village (farms) on the left, the city (factories) in the middle, the mine on the right; each person = 1% of the population
  const vx = 20, vw = w * 0.32, cx = vx + vw + 20, cw = w * 0.36, mx = cx + cw + 20, mw = w - mx - 20, nAg = Math.round(100 * R.Lag / R.L), nInd = 100 - nAg;
  c.fillStyle = "#3d5a2a"; for (let i = 0; i < 4; i++) c.fillRect(vx + i * vw / 4 + 4, gy + 10, vw / 4 - 8, 30); TX(c, "Village: farming", vx, gy - 8 - 5 * 14, "#7ee787", "left", "600 12px");
  for (let i = 0; i < nAg; i++) { person(c, vx + 10 + (i % 14) * (vw - 20) / 14, gy - 4 - Math.floor(i / 14) * 14, 4.2, i < 35 ? "#ffd166" : "#9a8a55"); }
  // factories grow with industrial output
  const nf = Math.max(1, Math.min(12, Math.round(2 + 10 * R.Lind / R.L))); for (let i = 0; i < nf; i++) { const fx = cx + (i % 6) * cw / 6, fyb = gy - (i >= 6 ? 70 : 0), fh = 34 + 6 * (i % 3); c.fillStyle = "#4a5577"; c.fillRect(fx + 4, fyb - fh, cw / 6 - 10, fh); c.fillRect(fx + cw / 6 - 16, fyb - fh - 16, 7, 16); c.fillStyle = R.surplus ? "#8fa0bf" : "#ffd166"; c.fillRect(fx + 9, fyb - fh + 8, 6, 6); }
  TX(c, "City: factories", cx, gy - 8 - 160, "#5ad1ff", "left", "600 12px");
  for (let i = 0; i < nInd; i++) person(c, cx + 8 + (i % 18) * (cw - 16) / 18, gy + 18 + Math.floor(i / 18) * 13, 4, "#5ad1ff");
  // the mine and the commodity price
  c.fillStyle = "#6b4a2a"; c.beginPath(); c.moveTo(mx, gy); c.lineTo(mx + mw / 2, gy - 60); c.lineTo(mx + mw, gy); c.fill(); TX(c, "Mine", mx + mw / 2, gy - 66, "#ffb454", "center", "600 12px");
  TX(c, `price ×${R.Pc.toFixed(2)}`, mx + mw / 2, gy + 22, R.Pc < 0.8 ? "#ff6b81" : R.Pc > 1.2 ? "#7ee787" : "#cfd8ea", "center", "600 12.5px"); TX(c, `${(100 * R.cs).toFixed(0)}% of GDP`, mx + mw / 2, gy + 40, "#aab6cc", "center", "11.5px");
  // notes along the bottom
  let msgs = []; if (adv) { msgs.push(R.surplus ? "Surplus labour on the farms: factory wage fixed" : `Past the Lewis turning point (year ${run.turning}): wages rising`); if (R.gap) msgs.push("Foreign currency gap: investment cut"); }
  else msgs.push(R.surplus ? "Workers are moving from the village to the city" : "Few spare farm workers left: factory wages rising");
  TX(c, msgs.join("   ·   "), 20, h - 14, R.gap ? "#ff6b81" : "#cfd8ea", "left", "12px");
  TX(c, "yellow: farm workers needed · grey: surplus labour · blue: factory workers (each figure = 1% of people)", w - 16, h - 14, "#8fa0bf", "right", "10.5px");
  ui.hud("");
}
function charts() { if (!run) return; const k = Math.min(50, Math.floor(yr)), S = run.slice(0, k + 1);
  chA.opts.title = "Income per head and HDI"; chA.opts.xLabel = "year"; chA.opts.yLabel = "US$"; chA.opts.yFmt = v => K.sig(Math.pow(10, v), 2);
  chA.draw([{ pts: S.map(q => [q.t, Math.log10(q.pc)]), color: "#7ee787", label: "income per head" }, { pts: S.map(q => [q.t, Math.log10(q.hdi * 10000)]), color: "#c4a1ff", dash: [5, 4], label: "HDI × 10 000" }], { xMin: 0, xMax: 50, yMin: 2.4, yMax: 4.6 });
  if (P.chart === "lewis") { chB.opts.title = "Workers in industry, wage"; chB.opts.xLabel = "year"; chB.opts.yLabel = "% or wage index"; chB.draw([{ pts: S.map(q => [q.t, 100 * q.share]), color: "#5ad1ff", label: "% in industry" }, { pts: S.map(q => [q.t, 50 * q.wage]), color: "#ffd166", label: "wage (50 = starting wage)" }], { xMin: 0, xMax: 50, yMin: 0, vlines: run.turning != null && run.turning <= k ? [{ x: run.turning, label: "turning point" }] : [] }); }
  else { chB.opts.title = "Commodity price and investment"; chB.opts.xLabel = "year"; chB.opts.yLabel = "index / %"; chB.draw([{ pts: S.map(q => [q.t, 100 * q.Pc]), color: "#ffb454", label: "commodity price (100 = start)" }, { pts: S.map(q => [q.t, 100 * q.I]), color: "#7ee787", label: "investment, % of GDP" }], { xMin: 0, xMax: 50, yMin: 0, bands: S.filter(q => q.gap).map(q => ({ x0: q.t - 0.5, x1: q.t + 0.5, color: "rgba(255,107,129,.15)" })) }); }
  const R = run[k]; read.set("y", k); read.set("pc", "$" + R.pc.toFixed(0)); read.set("g", k >= 10 ? growth(run, k - 10, k).toFixed(1) + "% a year" : "–"); read.set("hdi", R.hdi.toFixed(3)); read.set("ind", (100 * R.share).toFixed(0) + "%"); read.set("cs", (100 * R.cs).toFixed(0) + "%");
}
let frame = 0;
ui.run(dt => { if (dt > 0) yr = Math.min(50, yr + dt * speed); }, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Fifty years in under twenty seconds. Change a policy and the history is rerun; press Start again to watch it unfold.", 7000);
