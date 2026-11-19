/* =====================================================================
   TRADE AND EXCHANGE RATES
   COMPARATIVE ADVANTAGE: a country should make what it gives up least to
   make (lowest opportunity cost), even if another country is better at
   everything. If both specialise and trade at a price (the TERMS OF
   TRADE) between their two opportunity costs, both can consume more.
   PROTECTION: a tariff raises the UK price of imports to world price +
   tariff; UK firms make more, buyers buy less, imports fall, the
   government collects revenue and two triangles of welfare are lost
   (deadweight loss). A quota limits imports directly.
   EXCHANGE RATES are set by the demand for and supply of pounds. Higher UK
   interest rates attract savers (more demand for £: appreciation);
   higher UK inflation makes UK goods less competitive (depreciation).
   A stronger pound: Strong Pound, Imports Cheap, Exports Dear (SPICED).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---------------- 1. Comparative advantage ----------------
// output per worker: the UK makes 1 machine or 2 lots of clothing; country B 1 machine or 6 lots of clothing
const CA = { ukM: 1, ukC: 2, bM: 1, bC: 6, nUK: 200 };
// terms of trade (clothing per machine) when both fully specialise and spend half their income on each good, kept between the two opportunity costs
const totTheory = (nB, o = CA) => K.clamp(o.bC * nB / (o.ukM * o.nUK), o.ukC / o.ukM, o.bC / o.bM);
// gains: the rise in √(machines × clothing) each country can consume, compared with no trade
const gainUK = t => Math.max(0, Math.sqrt(t / 2) - 1), gainB = t => Math.max(0, Math.sqrt(6 / t) - 1);
// the dynamic model: workers move to the better-paid job; the price of clothing adjusts until world demand = supply
function caWorld(nB, trade, skill) {
  return { nB, trade, skill, p: 3, pA: [2, 6], mUK: 0.5, mB: 0.5, t: 0, hist: [] };   // m = share of each country's workers making machines; p = clothing per machine
}
// with 'skill' differences, a country's next worker is a little worse at its new job (bowed PPF): output per worker falls by up to 30%
const prodM = (share, skill) => share * (1 - skill * 0.3 * share), prodC = (share, skill) => share * (1 - skill * 0.3 * share);
function caOutput(W) { const s = W.skill; return { ukM: CA.nUK * CA.ukM * prodM(W.mUK, s), ukC: CA.nUK * CA.ukC * prodC(1 - W.mUK, s), bM: W.nB * CA.bM * prodM(W.mB, s), bC: W.nB * CA.bC * prodC(1 - W.mB, s) }; }
function caStep(W, dt) {
  const o = caOutput(W), s = W.skill, mw = (n, a, m) => a * (1 - 2 * s * 0.3 * m), cw = (n, a, m) => a * (1 - 2 * s * 0.3 * (1 - m));   // marginal output of the next worker
  if (W.trade) {
    // world: half of all income is spent on clothing; price rises when clothing is short
    const M = o.ukM + o.bM, C = o.ukC + o.bC; W.p *= Math.exp(K.clamp(-0.8 * dt * Math.log((M * W.p) / Math.max(1e-6, C)), -0.2, 0.2));   // clothing short (M·p > C): clothing dearer, so fewer clothing per machine
    const pu = W.p, pb = W.p;
    W.mUK = K.clamp(W.mUK + dt * 0.6 * Math.sign(mw(0, CA.ukM, W.mUK) * 1 - cw(0, CA.ukC, W.mUK) / pu) * Math.min(1, Math.abs(Math.log(mw(0, CA.ukM, W.mUK) * pu / cw(0, CA.ukC, W.mUK))) * 3), 0, 1);
    W.mB = K.clamp(W.mB + dt * 0.6 * Math.sign(mw(0, CA.bM, W.mB) - cw(0, CA.bC, W.mB) / pb) * Math.min(1, Math.abs(Math.log(mw(0, CA.bM, W.mB) * pb / cw(0, CA.bC, W.mB))) * 3), 0, 1);
  } else {
    // no trade: each country's own price; with half of income on each good, workers split to make equal values
    W.pA = [o.ukC / Math.max(1e-6, o.ukM), o.bC / Math.max(1e-6, o.bM)];
    W.mUK += dt * 0.6 * (0.5 - W.mUK); W.mB += dt * 0.6 * (0.5 - W.mB);
  }
  W.t += dt; if (W.hist.length === 0 || W.t - W.hist[W.hist.length - 1][0] > 0.1) W.hist.push([W.t, W.trade ? W.p : NaN]); if (W.hist.length > 400) W.hist.shift();
}
// what each country consumes: with trade, half its income on each good at the world price
function caConsume(W) { const o = caOutput(W); if (!W.trade) return { uk: [o.ukM, o.ukC], b: [o.bM, o.bC] }; const yU = o.ukM + o.ukC / W.p, yB = o.bM + o.bC / W.p; return { uk: [yU / 2, yU / 2 * W.p], b: [yB / 2, yB / 2 * W.p] }; }
function caSettle(nB, skill = 0) { const W = caWorld(nB, true, skill); for (let i = 0; i < 3000; i++) caStep(W, 0.05); return W; }
const welfare = c => Math.sqrt(c[0] * c[1]);

// ---------------- 2. Steel: tariffs and quotas ----------------
// UK demand and supply of steel (thousand tonnes a day) as straight lines: no-trade price £700
const ST = { a: 1300, c: 100 };                      // P = 1300 − 25·Qd (demand);  P = 100 + 25·Qs (supply): they cross at £700, 24 kt
const Qd = P => Math.max(0, (ST.a - P) / 25), Qs = P => Math.max(0, (P - ST.c) / 25);
function steelTheory(o) {
  let P;
  if (o.policy === "none") P = 700;
  else if (o.policy === "quota") { let lo = o.Pw, hi = 700; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Qd(m) - Qs(m) > o.quota) lo = m; else hi = m; } P = Math.min(700, Math.max(o.Pw, (lo + hi) / 2)); }
  else if (o.policy === "union") P = Math.min(700, Math.min(o.Pw + o.tariff, o.Pp));   // inside a customs union the partner sells tariff-free
  else P = Math.min(700, o.Pw + (o.policy === "tariff" ? o.tariff : 0));
  const qd = Qd(P), qs = Qs(P), imp = Math.max(0, qd - qs), Pfree = o.Pw, qd0 = Qd(Pfree), qs0 = Qs(Pfree);
  const rev = o.policy === "tariff" ? o.tariff * imp : 0, rent = o.policy === "quota" ? (P - o.Pw) * imp : 0;
  const dwlP = 0.5 * (P - Pfree) * Math.max(0, qs - qs0), dwlC = 0.5 * (P - Pfree) * Math.max(0, qd0 - qd);
  const cs = 0.5 * (ST.a - P) * qd, ps = 0.5 * (P - ST.c) * qs, divert = o.policy === "union" && o.Pp > o.Pw ? (o.Pp - o.Pw) * imp : 0;
  return { P, qd, qs, imp, rev, rent, dwlP, dwlC, cs, ps, divert };
}
// one day's market with 40 UK buyers, 40 UK firms and foreign sellers: each trader's value or cost varies a little day to day
function steelDay(o, r) {
  const T = steelTheory(o), n = 40, sc = 52 / n;   // each trader stands for 1.3 thousand tonnes
  let buy = 0, make = 0; for (let i = 0; i < n; i++) { const v = (ST.a - 25 * (i + 0.5) * sc) * (1 + 0.04 * r.gauss()), c = (ST.c + 25 * (i + 0.5) * sc) * (1 + 0.04 * r.gauss()); if (v >= T.P) buy += sc; if (c <= T.P) make += sc; }
  const imp = o.policy === "none" ? 0 : Math.max(0, o.policy === "quota" ? Math.min(o.quota, buy - make) : buy - make);
  return { P: T.P * (1 + 0.01 * r.gauss()), buy, make, imp };
}

// ---------------- 3. The market for pounds ----------------
// demand for £ (from foreigners buying UK exports and assets) and supply of £ (UK buyers of imports and foreign assets), $ per £
function fxTheory(o) { return 1.30 + 0.03 * o.dI - 0.02 * o.dInf + 0.015 * o.dG + o.spec; }
// a day's trading: 40 buyers and 40 sellers of pounds, each with a limit price around the curves; the rate is where they cross
function fxDay(o, r) {
  const e0 = fxTheory(o), n = 40, bids = [], asks = []; for (let i = 0; i < n; i++) { bids.push(e0 + 0.35 * (0.5 - (i + 0.5) / n) + 0.02 * r.gauss()); asks.push(e0 - 0.35 * (0.5 - (i + 0.5) / n) + 0.02 * r.gauss()); }
  bids.sort((a, b) => b - a); asks.sort((a, b) => a - b); let k = 0; while (k < n && bids[k] >= asks[k]) k++; const e = k ? (bids[k - 1] + asks[k - 1]) / 2 : e0;
  return { e, q: k };
}
// current account after the pound falls by d (fraction): elasticities grow towards their long-run values over about a year (the J-curve)
function caAfter(q, d, pedX, pedM) { const g = 1 - Math.exp(-q / 1.5), ex = 0.1 + (pedX - 0.1) * g, em = 0.1 + (pedM - 0.1) * g, rise = 1 / (1 - d) - 1; const X = 200 * (1 + ex * d), M = 200 * (1 + rise) * (1 - em * rise); return X - M; }

// ---------------- 4. The real pound (Bank of England annual averages) ----------------
const UKY = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const USD = [1.52, 1.44, 1.50, 1.63, 1.83, 1.82, 1.84, 2.00, 1.85, 1.57, 1.55, 1.60, 1.59, 1.56, 1.65, 1.53, 1.36, 1.29, 1.33, 1.28, 1.28, 1.38, 1.24, 1.24, 1.28, 1.32];
const EUR = [1.64, 1.61, 1.59, 1.45, 1.47, 1.46, 1.47, 1.46, 1.26, 1.12, 1.17, 1.15, 1.23, 1.18, 1.24, 1.38, 1.22, 1.14, 1.13, 1.14, 1.13, 1.16, 1.17, 1.15, 1.18, 1.17];
const FXEV = [[2007.85, 2.11, "Nov 2007: $2.11, the highest since 1981"], [2009.05, 1.37, "Jan 2009: about $1.37 after the financial crisis"], [2016.48, 1.32, "24 Jun 2016: EU referendum, about $1.49 to $1.32 overnight"], [2020.22, 1.15, "Mar 2020: about $1.15 as Covid-19 hit"], [2022.74, 1.04, "26 Sep 2022: a record low near $1.04 after the mini-budget"]];
const PARTNERS = [["United States", 16.9], ["Germany", 8.3], ["Netherlands", 7.7], ["France", 5], ["China", 5], ["Ireland", 5]];

// ---------------- The page ----------------
const P = { view: "ca", nB: 130, trade: true, skill: 0, policy: "tariff", Pw: 400, tariff: 90, quota: 6, Pp: 450, dI: 0, dInf: 0, dG: 0, spec: 0, regime: "float", peg: 1.40, pedX: 0.6, pedM: 0.3, year: 2016, speed: 1 };
let rnd = K.rng(Date.now() % 9973 + 61), run = true, W = null, steel = [], fx = [], res = 60, broke = false, jq = null, tAcc = 0;
const ui = K.app({
  title: "Trade and Exchange Rates", subject: "Economics",
  blurb: "Comparative advantage and gains from trade, tariffs and quotas, the market for pounds, and the real pound since 2000",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1), the global economy: specialisation, absolute and comparative advantage, opportunity cost, gains from trade and the terms of trade; free trade and protectionism (tariffs, quotas); exchange rates from demand and supply, appreciation and depreciation (SPICED / WPIDEC); the current account.", adv: "Edexcel A level Economics A (9EC0) Theme 4: welfare effects of tariffs and quotas (revenue, quota rent, deadweight loss); the terms of trade; customs unions, trade creation and diversion; increasing opportunity cost; fixed and floating exchange rates, reserves; the Marshall–Lerner condition and the J-curve." } },
  missions: [
    { title: "Better at everything?", q: "Country B's workers are as good at machines as the UK's and three times better at clothing. Open trade. What does each country specialise in, and does the UK still gain?", hint: "The UK gives up only 2 clothing per machine; B gives up 6. So the UK has the comparative advantage in machines, B in clothing. Both consume beyond their PPFs: the gold dots move outside the lines.", setup() { set({ view: "ca", trade: true }); } },
    { title: "Terms of trade", q: "Change the size of country B. Where do the terms of trade settle? Can they go outside 2 to 6 clothing per machine?", hint: "Always between the two opportunity costs. A small country trades at the big country's price and takes nearly all the gains; when B is big the UK gains more.", setup() { set({ view: "ca", nB: 40 }); } },
    { title: "A tariff on steel", q: "Put a £90 tariff on imported steel. Who gains and who loses? Find the deadweight loss.", hint: "UK firms (more producer surplus) and the government (revenue) gain; buyers lose more than both together. The two red triangles are the deadweight loss: too much made at home at high cost, and too little bought.", setup() { set({ view: "steel", policy: "tariff", tariff: 90 }); } },
    { title: "Quota", q: "Replace the tariff with a quota of 6 thousand tonnes a day. Compare the price with the tariff. Who gets the money the tariff used to raise?", hint: "A quota can give the same price as a tariff, but the extra on each imported tonne goes to whoever holds the import licences (quota rent), often foreign firms, not the government.", setup() { set({ view: "steel", policy: "quota", quota: 6 }); } },
    { title: "Interest rates and the pound", q: "Raise UK interest rates 2 points above other countries'. What happens to the pound, and to the price of a UK car in the US?", hint: "Savers want UK assets, so demand for pounds rises: the pound appreciates (about $1.36). A £20,000 car costs Americans more: Strong Pound, Imports Cheap, Exports Dear.", setup() { set({ view: "fx", dI: 2 }); } },
    { title: "Higher inflation", q: "Make UK inflation 3 points higher than abroad. Which way does the pound move, and why?", hint: "UK goods become less competitive, so foreigners demand fewer pounds and UK buyers supply more to buy imports: the pound depreciates.", setup() { set({ view: "fx", dInf: 3 }); } },
    { title: "The real pound", q: "Look at 2007–2009 and 2016. What happened to the pound, and what did it do to import prices?", hint: "The pound fell from about $2 to $1.55 in the financial crisis, and again after the 2016 referendum: imports became dearer, adding to UK inflation in 2017.", setup() { set({ view: "real", year: 2016 }); } },
    { lvl: "adv", title: "Marshall–Lerner and the J-curve", q: "The pound falls 6%. With export and import PEDs of 0.6 and 0.3, does the current account improve? What happens in the first quarter?", hint: "PEDx + PEDm = 0.9 < 1, so in the long run it gets slightly worse; with PEDx = 1 it improves. Whatever the PEDs, it gets worse at first (contracts are fixed, volumes adjust slowly): the J-curve.", setup() { set({ view: "fx", spec: -0.08 }); } },
    { lvl: "adv", title: "Defending a fixed rate", q: "Peg the pound at $1.40 when the market wants less. Watch the Bank's reserves. What happens when they run out?", hint: "The Bank must buy the unwanted pounds with its reserves. When they run out the peg cannot hold: the pound falls to the market rate, as in September 1992 when the UK left the ERM.", setup() { set({ view: "fx", regime: "fixed", peg: 1.40, dInf: 2 }); } },
    { lvl: "adv", title: "Customs union", q: "Join a customs union with a partner that makes steel at £450 while the world price is £400 and the tariff on outsiders is £90. Is it trade creation or diversion?", hint: "Imports now come from the partner at £450 instead of the world at £490: buyers gain (trade creation), but the UK pays £50 a tonne more than the cheapest world producer (trade diversion) and loses the tariff revenue.", setup() { set({ view: "steel", policy: "union", Pp: 450 }); } }
  ],
  batch: [
    { title: "Where do the terms of trade settle?", question: "How do the terms of trade depend on the size of country B?", how: "UK 200 workers (1 machine or 2 clothing each); B (1 machine or 6 clothing each); trade open; the model runs until workers and prices stop moving.", xLabel: "workers in country B", yLabel: "terms of trade (clothing per machine)", xs: [20, 50, 89, 130, 160, 189, 250, 400], reps: 1, yMin: 0, yMax: 7, theory: n => totTheory(n), theoryLabel: "6nB ÷ 200, between 2 and 6", run: n => caSettle(n).p, note: "Between the two opportunity costs (2 and 6). A small partner trades at the big country's own price, so the big country gains nothing; the terms of trade move towards the partner's cost as it grows." },
    { title: "Who gains most from trade?", question: "How much more can the UK consume with trade, depending on B's size?", how: "As above; gain = rise in √(machines × clothing) consumed compared with no trade.", xLabel: "workers in country B", yLabel: "UK gain (%)", xs: [20, 50, 89, 130, 160, 189, 250, 400], reps: 1, yMin: 0, theory: n => 100 * gainUK(totTheory(n)), theoryLabel: "√(ToT ÷ 2) − 1", run: n => { const W = caSettle(n), c = caConsume(W); return 100 * (welfare(c.uk) / welfare([100, 200]) - 1); }, note: "Gains depend on the terms of trade: the UK gains nothing when B is small (B takes 73%), and 73% when B is large. Both always gain at least a little, never lose." },
    { title: "Higher tariff, fewer imports?", question: "How do steel imports fall as the tariff rises?", how: "World price £400; 40 UK buyers and 40 UK firms whose values and costs vary ±4% each day; 10 days per tariff.", xLabel: "tariff (£ per tonne)", yLabel: "imports (thousand tonnes a day)", xs: [0, 30, 60, 90, 120, 150, 180, 210, 240, 300], reps: 10, yMin: 0, theory: t => steelTheory({ policy: "tariff", Pw: 400, tariff: t }).imp, theoryLabel: "Qd − Qs at Pw + t", run: (t, r) => steelDay({ policy: "tariff", Pw: 400, tariff: t }, r).imp, note: "Imports fall in a straight line and stop at a prohibitive tariff of £300 (the UK price reaches the no-trade price, £700). Real traders scatter around the line." },
    { title: "Does the market find the exchange rate?", question: "With UK interest rates 2 points above abroad, what rate does a day of trading in pounds settle at?", how: "40 buyers and 40 sellers of pounds whose limits scatter ±2 cents around the curves; 200 separate days.", yLabel: "$ per £", reps: 200, bins: 20, theory: fxTheory({ dI: 2, dInf: 0, dG: 0, spec: 0 }), theoryLabel: "where D£ = S£", run: (x, r) => fxDay({ dI: 2, dInf: 0, dG: 0, spec: 0 }, r).e, note: "Close to $1.36 on average, with a day-to-day spread of about 1 cent: real exchange rates jiggle around the price that clears the market." },
    { title: "Interest rates and the pound", question: "How does the pound depend on UK interest rates compared with abroad?", how: "Interest difference −3 to +4 points; 10 days each.", xLabel: "UK interest rate minus abroad (points)", yLabel: "$ per £", xs: [-3, -2, -1, 0, 1, 2, 3, 4], reps: 10, fit: true, theory: d => fxTheory({ dI: d, dInf: 0, dG: 0, spec: 0 }), theoryLabel: "1.30 + 0.03 × difference", run: (d, r) => fxDay({ dI: d, dInf: 0, dG: 0, spec: 0 }, r).e, note: "A straight line, about 3 cents per point: hot money flows to the higher interest rate, raising demand for the currency." },
    { title: "Marshall–Lerner (A level)", question: "After a 6% fall in the pound, does the current account improve? It depends on the price elasticities.", how: "Exports and imports £200bn a quarter; import PED 0.3; export PED swept; current account after two years (long run).", xLabel: "export PED", yLabel: "change in current account (£bn a quarter)", xs: [0.1, 0.3, 0.5, 0.7, 0.9, 1.2, 1.5, 2], reps: 1, theory: p => caAfter(1e6, 0.06, p, 0.3), theoryLabel: "long-run formula", run: p => caAfter(8, 0.06, p, 0.3), note: "It improves only when PEDx + PEDm is greater than about 1 (here PEDx above about 0.7): the Marshall–Lerner condition. In the first quarter it gets worse whatever the PEDs: the J-curve." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1 Trade", text: "Comparative advantage: a country should specialise in the good it makes at the lowest opportunity cost. Trade at terms between the two opportunity costs lets both consume outside their PPFs." },
      { lvl: "std", tag: "4EC1 Protection", text: "A tariff is a tax on imports; a quota is a limit on the quantity. Both raise the domestic price, help domestic producers and hurt consumers; arguments for: infant industries, jobs, dumping, strategic goods; against: higher prices, less choice, retaliation, inefficiency." },
      { lvl: "std", tag: "4EC1 Exchange rates", text: "A floating exchange rate is set by demand for and supply of the currency. Appreciation: SPICED (Strong Pound, Imports Cheap, Exports Dear). Depreciation: WPIDEC (Weak Pound, Imports Dear, Exports Cheap)." },
      { lvl: "adv", tag: "9EC0 4.1", text: "Welfare effects of a tariff: consumer surplus falls; producer surplus and government revenue rise; deadweight loss = the production and consumption triangles. Customs unions cause trade creation and trade diversion." },
      { lvl: "adv", tag: "9EC0 4.4", text: "Marshall–Lerner: a depreciation improves the current account only if PEDx + PEDm > 1. The J-curve: it worsens first because volumes respond slowly. Fixed rates are held by central bank intervention (reserves, interest rates)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "The UK can make 1 machine or 2 lots of clothing per worker; country B can make 1 machine or 6. Which country has the comparative advantage in clothing? Explain.", ans: "<ul><li>country B</li><li>its opportunity cost of clothing is 1/6 of a machine, lower than the UK's 1/2</li></ul>" },
      { lvl: "std", marks: 2, q: () => `The exchange rate is $${fxTheory(P).toFixed(2)} per £. What is the US price of a £20,000 UK car? What is the UK price of a $100 import?`, ans: () => `<ul><li>$${(20000 * fxTheory(P)).toFixed(0)}</li><li>£${(100 / fxTheory(P)).toFixed(2)}</li></ul>` },
      { lvl: "adv", marks: 4, q: () => { const T = steelTheory({ policy: "tariff", Pw: P.Pw, tariff: P.tariff }); return `World price £${P.Pw}, tariff £${P.tariff}. UK demand falls to ${T.qd.toFixed(1)} and UK supply rises to ${T.qs.toFixed(1)} thousand tonnes. Calculate imports and tariff revenue (per day).`; }, ans: () => { const T = steelTheory({ policy: "tariff", Pw: P.Pw, tariff: P.tariff }); return `<ul><li>imports = ${T.qd.toFixed(1)} − ${T.qs.toFixed(1)} = ${T.imp.toFixed(1)} thousand tonnes</li><li>revenue = £${P.tariff} × ${(T.imp * 1000).toFixed(0)} = £${(T.rev * 1000).toLocaleString("en-GB", { maximumFractionDigits: 0 })} a day</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain the J-curve.", ans: "<ul><li>after a depreciation, import prices rise at once but volumes respond slowly (contracts, habits)</li><li>so the current account worsens at first</li><li>as demand becomes more elastic over time, export volumes rise and import volumes fall, and it improves (if Marshall–Lerner holds)</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Comparative advantage: constant output per worker (UK 1 machine or 2 clothing; B 1 machine or 6 clothing; straight-line PPFs unless skills differ at A level, which bows them out). Everyone spends half their income on each good; the price of clothing adjusts until world demand equals supply, and workers move to the better-paid job. Theory: full specialisation gives terms of trade = clothing made by B ÷ machines made by the UK, kept between 2 and 6.</li>
<li>Steel: UK demand P = 1300 − 25Q and supply P = 100 + 25Q (thousand tonnes a day; no-trade price £700); horizontal world supply at the world price (+ tariff). 40 buyers and 40 firms with values and costs that vary ±4% a day.</li>
<li>Pounds: the rate where demand for £ = supply of £: $1.30 + 3 cents per point of interest difference − 2 cents per point of extra inflation + 1.5 cents per point of faster growth + speculation. 40 buyers and 40 sellers with limits scattered ±2 cents.</li>
<li>J-curve: exports and imports £200bn a quarter; elasticities rise from 0.1 to their long-run values over about a year. Fixed rate: the Bank buys unwanted pounds from $60bn of reserves.</li>
<li>All model numbers are illustrative. Left out: transport costs, many goods and countries, capital flows beyond interest rates, expectations, retaliation.</li></ul>
<h3>Data</h3>
<ul><li>Bank of England annual average spot rates ($ and € per £), 2025 provisional. ONS UK trade country by country 2024; HMRC 2024.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/trade-exchange-rates.html">original/trade-exchange-rates.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "ca", options: [["ca", "⚓ comparative advantage"], ["steel", "🏭 tariffs and quotas"], ["fx", "💷 exchange rates"], ["real", "📈 the real pound"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
grp.ca = g = ui.group("Two countries");
ctl.nB = K.slider(g, { label: "Workers in country B (UK has 200)", min: 20, max: 400, step: 1, value: 130, on: v => { P.nB = v; if (W) W.nB = v; } });
ctl.trade = K.toggle(g, { label: "Trade is open", value: true, on: v => { P.trade = v; if (W) { W.trade = v; } } });
ctl.skill = K.slider(g, { label: "Skill differences (A level: bowed PPF)", min: 0, max: 1, step: 0.1, value: 0, fmt: v => v ? (v * 30).toFixed(0) + "% loss" : "none (straight PPF)", on: v => { P.skill = v; if (W) W.skill = v; } });
grp.steel = g = ui.group("Steel");
ctl.policy = K.seg(g, { value: "tariff", options: [["none", "no trade"], ["free", "free trade"], ["tariff", "tariff"], ["quota", "quota"], ["union", "customs union (A level)"]], on: v => P.policy = v });
ctl.Pw = K.slider(g, { label: "World price", min: 250, max: 650, step: 10, value: 400, fmt: v => "£" + v + " a tonne", on: v => P.Pw = v });
ctl.tariff = K.slider(g, { label: "Tariff", min: 0, max: 300, step: 10, value: 90, fmt: v => "£" + v + " a tonne", on: v => P.tariff = v });
ctl.quota = K.slider(g, { label: "Quota", min: 0, max: 30, step: 0.5, value: 6, unit: "kt a day", on: v => P.quota = v });
ctl.Pp = K.slider(g, { label: "Partner's price (customs union)", min: 300, max: 650, step: 10, value: 450, fmt: v => "£" + v, on: v => P.Pp = v });
grp.fx = g = ui.group("The pound");
ctl.dI = K.slider(g, { label: "UK interest rate minus abroad", min: -3, max: 4, step: 0.25, value: 0, unit: "points", on: v => P.dI = v });
ctl.dInf = K.slider(g, { label: "UK inflation minus abroad", min: -3, max: 5, step: 0.25, value: 0, unit: "points", on: v => P.dInf = v });
ctl.dG = K.slider(g, { label: "UK growth minus abroad", min: -3, max: 3, step: 0.25, value: 0, unit: "points", on: v => P.dG = v });
let rr = K.row(g); K.btn(rr, "📉 Speculators sell £", () => P.spec -= 0.05); K.btn(rr, "📈 buy £", () => P.spec += 0.05); K.btn(rr, "calm", () => P.spec = 0);
ctl.regime = K.seg(g, { value: "float", options: [["float", "floating"], ["fixed", "fixed (A level)"]], on: v => { P.regime = v; res = 60; broke = false; } });
ctl.peg = K.slider(g, { label: "Peg", min: 1.1, max: 1.6, step: 0.01, value: 1.40, fmt: v => "$" + v.toFixed(2), on: v => P.peg = v });
ctl.pedX = K.slider(g, { label: "PED for exports (A level)", min: 0.1, max: 2, step: 0.05, value: 0.6, on: v => P.pedX = v });
ctl.pedM = K.slider(g, { label: "PED for imports (A level)", min: 0.1, max: 2, step: 0.05, value: 0.3, on: v => P.pedM = v });
rr = K.row(g); K.btn(rr, "Pound falls 6%: J-curve", () => jq = 0);
grp.real = g = ui.group("The real pound");
ctl.year = K.slider(g, { label: "Year", min: 2000, max: 2025, step: 1, value: 2016, on: v => P.year = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
function set(o) {
  Object.assign(P, { view: "ca", nB: 130, trade: true, skill: 0, policy: "tariff", Pw: 400, tariff: 90, quota: 6, Pp: 450, dI: 0, dInf: 0, dG: 0, spec: 0, regime: "float", peg: 1.40, pedX: 0.6, pedM: 0.3, year: 2016 }, o);
  for (const k of ["nB", "skill", "Pw", "tariff", "quota", "Pp", "dI", "dInf", "dG", "peg", "pedX", "pedM", "year"]) ctl[k].set(P[k]); ctl.view.set(P.view); ctl.trade.set(P.trade); ctl.policy.set(P.policy); ctl.regime.set(P.regime);
  W = caWorld(P.nB, false, P.skill); for (let i = 0; i < 40; i++) caStep(W, 0.1); W.trade = P.trade; W.hist = []; W.t = 0; steel = []; fx = []; res = 60; broke = false; jq = null; showGroups();
}

// ---------------- Simulation ----------------
function tick(dt) {
  tAcc += dt * P.speed; if (P.view === "ca") caStep(W, Math.min(0.1, dt * P.speed));
  while (tAcc > 0.5) { tAcc -= 0.5;
    if (P.view === "steel") { steel.push(steelDay(P, rnd)); if (steel.length > 60) steel.shift(); }
    if (P.view === "fx") { const d = fxDay(P, rnd); let e = d.e; if (P.regime === "fixed" && !broke) { const gap = P.peg - e; if (gap > 0) { res -= gap * 40; if (res <= 0) { res = 0; broke = true; ui.tip("The reserves have run out: the peg is abandoned and the pound falls to the market rate.", 6000); } else e = P.peg; } else { res += -gap * 10; e = P.peg; } } fx.push(e); if (fx.length > 120) fx.shift(); if (jq !== null) jq = Math.min(12, jq + 0.25); }
  }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawCA(c, w, h) {
  const o = caOutput(W), cons = caConsume(W), boxes = [["United Kingdom", CA.nUK, W.mUK, o.ukM, o.ukC, "#5ab0ff", cons.uk], ["Country B", W.nB, W.mB, o.bM, o.bC, "#ff9a5a", cons.b]];
  boxes.forEach(([name, n, m, M, C, col, cn], k) => {
    const x0 = 30 + k * w / 2, bw = w / 2 - 60, y0 = 120;
    TX(c, `${name}: ${n} workers`, x0, y0 - 18, col, "left", "600 14px");
    // workers: blue make machines, pink make clothing
    const per = Math.max(1, Math.ceil(n / 200)), shown = Math.ceil(n / per), cols = 25, cs = Math.min(bw / cols, 14);
    for (let i = 0; i < shown; i++) { const mk = i < shown * m; c.fillStyle = mk ? "#8fa8c8" : "#e58fb5"; c.beginPath(); c.arc(x0 + (i % cols) * cs + cs / 2, y0 + Math.floor(i / cols) * cs + cs / 2, cs * 0.36, 0, 6.3); c.fill(); }
    const yb = y0 + Math.ceil(shown / cols) * cs + 22;
    TX(c, `${(m * 100).toFixed(0)}% make machines (grey) · ${((1 - m) * 100).toFixed(0)}% make clothing (pink)`, x0, yb, "#cfd8ea", "left", "12px");
    TX(c, `makes ${M.toFixed(0)} machines and ${C.toFixed(0)} clothing`, x0, yb + 20, "#cfd8ea", "left", "12px");
    TX(c, `consumes ${cn[0].toFixed(0)} machines and ${cn[1].toFixed(0)} clothing`, x0, yb + 40, "#ffd166", "left", "600 12px");
    const oc = k ? CA.bC / CA.bM : CA.ukC / CA.ukM; TX(c, `opportunity cost of 1 machine: ${oc} clothing`, x0, yb + 60, "#8fa0bf", "left", "12px");
  });
  // ships carrying exports when trading
  if (W.trade) { const t = performance.now() / 1000, y = h * 0.78; c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(60, y); c.lineTo(w - 60, y); c.stroke(); for (let i = 0; i < 3; i++) { const u = ((t * 0.08 + i / 3) % 1); TX(c, "🚢", 60 + (w - 120) * u, y - 8, "#fff", "center", "22px"); TX(c, "🚢", w - 60 - (w - 120) * u, y + 26, "#fff", "center", "22px"); } TX(c, "machines → country B", w / 2, y - 30, "#8fa8c8", "center", "11.5px"); TX(c, "← clothing to the UK", w / 2, y + 46, "#e58fb5", "center", "11.5px"); }
  TX(c, W.trade ? `Terms of trade: ${W.p.toFixed(2)} clothing per machine (theory ${totTheory(W.nB).toFixed(2)} when both specialise)` : "No trade: each country makes what it consumes", w / 2, h - 18, "#eef2f8", "center", "600 13px");
}
function drawSteel(c, w, h) {
  const T = steelTheory(P), x0 = 70, x1 = w - 40, y0 = 40, y1 = h - 50, Qm = 52, Pm = 1300, X = q => x0 + (x1 - x0) * q / Qm, Y = p => y1 - (y1 - y0) * p / Pm;
  c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke();
  TX(c, "price (£ per tonne)", x0, y0 - 10, "#8fa0bf", "left", "11.5px"); TX(c, "quantity of steel (thousand tonnes a day)", x1, y1 + 30, "#8fa0bf", "right", "11.5px");
  for (let p = 0; p <= 1200; p += 200) { TX(c, "£" + p, x0 - 6, Y(p) + 4, "#6c7894", "right", "10.5px"); } for (let q = 0; q <= 50; q += 10) TX(c, q, X(q), y1 + 14, "#6c7894", "center", "10.5px");
  if (P.policy !== "none") {
    const Pf = P.Pw, qs0 = Qs(Pf), qd0 = Qd(Pf);
    if (T.P > Pf) { c.fillStyle = "rgba(255,107,129,.45)"; c.beginPath(); c.moveTo(X(qs0), Y(Pf)); c.lineTo(X(T.qs), Y(T.P)); c.lineTo(X(T.qs), Y(Pf)); c.fill(); c.beginPath(); c.moveTo(X(T.qd), Y(T.P)); c.lineTo(X(qd0), Y(Pf)); c.lineTo(X(T.qd), Y(Pf)); c.fill(); c.fillStyle = P.policy === "tariff" ? "rgba(126,231,135,.35)" : P.policy === "quota" ? "rgba(255,209,102,.35)" : "rgba(201,160,255,.35)"; c.fillRect(X(T.qs), Y(T.P), X(T.qd) - X(T.qs), Y(Pf) - Y(T.P)); TX(c, P.policy === "tariff" ? "tariff revenue" : P.policy === "quota" ? "quota rent" : "trade diversion cost", (X(T.qs) + X(T.qd)) / 2, (Y(T.P) + Y(Pf)) / 2 + 4, "#eef2f8", "center", "600 11.5px"); TX(c, "deadweight loss", X(T.qs) - 8, Y(Pf) + 16, "#ff6b81", "right", "11px"); }
    c.strokeStyle = "#ffd166"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(x0, Y(Pf)); c.lineTo(x1, Y(Pf)); c.stroke(); c.setLineDash([]); TX(c, `world price £${Pf}`, x1, Y(Pf) - 6, "#ffd166", "right", "11.5px");
    if (T.P > Pf) { c.strokeStyle = "#fff"; c.beginPath(); c.moveTo(x0, Y(T.P)); c.lineTo(x1, Y(T.P)); c.stroke(); TX(c, `UK price £${T.P.toFixed(0)}`, x1, Y(T.P) - 6, "#fff", "right", "600 11.5px"); }
  }
  c.lineWidth = 2.5; c.strokeStyle = "#5ad1ff"; c.beginPath(); c.moveTo(X(0), Y(1300)); c.lineTo(X(52), Y(0)); c.stroke(); c.strokeStyle = "#ff8a70"; c.beginPath(); c.moveTo(X(0), Y(100)); c.lineTo(X(48), Y(1300)); c.stroke(); c.lineWidth = 1;
  TX(c, "UK demand", X(46), Y(150) - 6, "#5ad1ff", "left", "600 12px"); TX(c, "UK supply", X(44), Y(1220), "#ff8a70", "left", "600 12px");
  if (T.imp > 0) { const yy = Y(T.P) + 26; c.strokeStyle = "#eef2f8"; c.beginPath(); c.moveTo(X(T.qs), yy); c.lineTo(X(T.qd), yy); c.stroke(); TX(c, `imports ${T.imp.toFixed(1)}`, (X(T.qs) + X(T.qd)) / 2, yy + 14, "#eef2f8", "center", "11.5px"); }
  // today's traders as dots on the curves
  const last = steel[steel.length - 1]; if (last) TX(c, `today's market: buyers bought ${last.buy.toFixed(1)}, UK firms made ${last.make.toFixed(1)}, imports ${last.imp.toFixed(1)} thousand tonnes`, x0 + 10, y1 - 12, "#cfd8ea", "left", "12px");
}
function drawFx(c, w, h) {
  const e = fx.length ? fx[fx.length - 1] : fxTheory(P), x0 = 70, x1 = w * 0.55, y0 = 40, y1 = h - 60, eMin = 0.9, eMax = 1.8, X = q => x0 + (x1 - x0) * q / 40, Y = v => y1 - (y1 - y0) * (v - eMin) / (eMax - eMin), et = fxTheory(P);
  c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke(); TX(c, "$ per £", x0, y0 - 10, "#8fa0bf", "left", "11.5px"); TX(c, "pounds traded (£bn a day)", x1, y1 + 28, "#8fa0bf", "right", "11.5px");
  for (let v = 1; v <= 1.8; v += 0.2) TX(c, "$" + v.toFixed(1), x0 - 6, Y(v) + 4, "#6c7894", "right", "10.5px");
  c.lineWidth = 2.5; c.strokeStyle = "#5ad1ff"; c.beginPath(); c.moveTo(X(0), Y(et + 0.35)); c.lineTo(X(40), Y(et - 0.35)); c.stroke(); c.strokeStyle = "#ff8a70"; c.beginPath(); c.moveTo(X(0), Y(et - 0.35)); c.lineTo(X(40), Y(et + 0.35)); c.stroke(); c.lineWidth = 1;
  TX(c, "D£ (exports, inward investment)", X(2), Y(et + 0.38), "#5ad1ff", "left", "11.5px"); TX(c, "S£ (imports, outward investment)", X(23), Y(et + 0.38), "#ff8a70", "left", "11.5px");
  c.strokeStyle = "#fff"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(x0, Y(e)); c.lineTo(x1, Y(e)); c.stroke(); c.setLineDash([]); TX(c, `today $${e.toFixed(3)}`, x1, Y(e) - 6, "#fff", "right", "600 12px");
  if (P.regime === "fixed") { c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(x0, Y(P.peg)); c.lineTo(x1, Y(P.peg)); c.stroke(); TX(c, broke ? "peg abandoned" : `peg $${P.peg.toFixed(2)}`, x0 + 6, Y(P.peg) - 6, "#ffd166", "left", "600 11.5px"); }
  // SPICED panel
  const px = w * 0.6, py = 60; TX(c, e > 1.30 ? "Strong pound: imports cheap, exports dear" : e < 1.30 ? "Weak pound: imports dear, exports cheap" : "Pound at its starting value", px, py, "#eef2f8", "left", "600 14px");
  const rows = [["🚗 a £20,000 UK car in the US", "$" + (20000 * e).toFixed(0)], ["📱 a $100 import in the UK", "£" + (100 / e).toFixed(2)], ["UK exports (volume)", ((1 + 0.6 * (1.30 / e - 1)) * 100).toFixed(1) + "% of normal"], ["UK imports (volume)", ((1 + 0.3 * (e / 1.30 - 1)) * 100).toFixed(1) + "% of normal"], ["extra UK inflation", (0.2 * 100 * (1.30 / e - 1)).toFixed(2) + " points"]];
  rows.forEach(([a, b], i) => { TX(c, a, px, py + 34 + i * 26, "#cfd8ea", "left", "13px"); TX(c, b, w - 30, py + 34 + i * 26, "#ffd166", "right", "600 13px"); });
  if (P.regime === "fixed") { TX(c, `Bank of England reserves: $${res.toFixed(1)}bn`, px, py + 190, res < 15 ? "#ff6b81" : "#7ee787", "left", "600 13px"); c.fillStyle = "#24304a"; c.fillRect(px, py + 200, w - 30 - px, 12); c.fillStyle = res < 15 ? "#ff6b81" : "#7ee787"; c.fillRect(px, py + 200, (w - 30 - px) * res / 60, 12); }
}
function drawReal(c, w, h) {
  const x0 = 70, x1 = w - 40, y0 = 40, y1 = h - 60, X = yr => x0 + (x1 - x0) * (yr - 2000) / 25.9, Y = v => y1 - (y1 - y0) * (v - 0.9) / (2.2 - 0.9);
  c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke();
  for (let v = 1; v <= 2.2; v += 0.2) TX(c, v.toFixed(1), x0 - 6, Y(v) + 4, "#6c7894", "right", "10.5px"); for (let yr = 2000; yr <= 2025; yr += 5) TX(c, yr, X(yr), y1 + 16, "#6c7894", "center", "10.5px");
  for (const [arr, col, lab] of [[USD, "#5ad1ff", "$ per £"], [EUR, "#c9a0ff", "€ per £"]]) { c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); arr.forEach((v, i) => i ? c.lineTo(X(UKY[i] + 0.5), Y(v)) : c.moveTo(X(UKY[i] + 0.5), Y(v))); c.stroke(); c.lineWidth = 1; TX(c, lab, X(2025.6), Y(arr[25]) + 4, col, "left", "600 11.5px"); }
  FXEV.forEach(([t, v, s], i) => { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(X(t), Y(v), 5, 0, 6.3); c.fill(); TX(c, String(i + 1), X(t), Y(v) - 9, "#ffd166", "center", "600 11px"); });
  const i = P.year - 2000; c.strokeStyle = "#fff"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(P.year + 0.5), y0); c.lineTo(X(P.year + 0.5), y1); c.stroke(); c.setLineDash([]);
  TX(c, `${P.year}: $${USD[i].toFixed(2)} and €${EUR[i].toFixed(2)} per £ (annual average)`, x0 + 10, y1 - 50, "#eef2f8", "left", "600 13px");
  const ev = FXEV.filter(e => Math.abs(e[0] - P.year - 0.5) < 1.2); ev.forEach((e, k) => TX(c, e[2], x0 + 10, y1 - 30 + 18 * k, "#ffd166", "left", "12px"));
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ ca: drawCA, steel: drawSteel, fx: drawFx, real: drawReal })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "ca") {
    const o = caOutput(W), cn = caConsume(W), ppf = (n, a, b) => { const pts = []; for (let i = 0; i <= 40; i++) { const m = i / 40; pts.push([n * a * prodM(m, W.skill), n * b * prodC(1 - m, W.skill)]); } return pts; };
    chA.opts.title = "UK: PPF and consumption"; chA.opts.xLabel = "machines"; chA.opts.yLabel = "clothing"; chA.draw([{ pts: ppf(CA.nUK, CA.ukM, CA.ukC), color: "#5ab0ff", label: "PPF" }, { pts: [[o.ukM, o.ukC]], type: "dots", r: 6, color: "#fff", label: "makes" }, { pts: [[cn.uk[0], cn.uk[1]]], type: "dots", r: 6, color: "#ffd166", label: "consumes" }], { xMin: 0, yMin: 0 });
    chB.opts.title = "Terms of trade over time"; chB.opts.xLabel = "time"; chB.opts.yLabel = "clothing per machine"; chB.draw([{ pts: W.hist.filter(p => isFinite(p[1])), color: "#ffd166", label: "price" }, { pts: [[0, totTheory(W.nB)], [Math.max(1, W.t), totTheory(W.nB)]], color: "#7ee787", dash: [5, 4], label: "theory" }, { pts: [[0, 2], [Math.max(1, W.t), 2]], color: "#5ab0ff", dash: [2, 3], label: "UK cost" }, { pts: [[0, 6], [Math.max(1, W.t), 6]], color: "#ff9a5a", dash: [2, 3], label: "B cost" }], { yMin: 0, yMax: 7, xMin: 0 });
    const gU = 100 * (welfare(cn.uk) / welfare([100, 200]) - 1), gB = 100 * (welfare(cn.b) / welfare([W.nB / 2, 3 * W.nB]) - 1);
    relabel(["terms of trade", "UK gain from trade", "B gain from trade", "UK specialises in", "B specialises in"]);
    read.set("a", W.trade ? W.p.toFixed(2) + " clothing per machine" : "no trade"); read.set("b", gU.toFixed(1) + "%"); read.set("c", gB.toFixed(1) + "%"); read.set("d", W.mUK > 0.98 ? "machines (fully)" : W.mUK > 0.5 ? "mostly machines" : "both"); read.set("e", W.mB < 0.02 ? "clothing (fully)" : W.mB < 0.5 ? "mostly clothing" : "both");
    ui.hud("Specialise where your opportunity cost is lowest");
  } else if (P.view === "steel") {
    const T = steelTheory(P), d = steel.map((s, i) => [i, s.imp]);
    chA.opts.title = "Imports each day"; chA.opts.xLabel = "day"; chA.opts.yLabel = "thousand tonnes"; chA.draw([{ pts: d, type: "dots", r: 3, color: "#ffd166", label: "market" }, { pts: [[0, T.imp], [60, T.imp]], color: "#7ee787", dash: [5, 4], label: "theory" }], { yMin: 0, xMin: 0, xMax: 60 });
    const F = steelTheory(Object.assign({}, P, { policy: "free" })), dc = (T.cs - F.cs) * 1000, dp = (T.ps - F.ps) * 1000, gov = (T.rev) * 1000, quota = T.rent * 1000, dw = -(T.dwlP + T.dwlC + T.divert) * 1000;
    chB.opts.title = "Gains and losses vs free trade"; chB.opts.xLabel = "buyers · UK firms · government · licence holders · lost"; chB.opts.yLabel = "£ thousand a day"; chB.draw([{ pts: [[0, dc / 1000]], type: "bars", w: 0.7, color: "#5ad1ff", label: "buyers" }, { pts: [[1, dp / 1000]], type: "bars", w: 0.7, color: "#ff8a70", label: "UK firms" }, { pts: [[2, gov / 1000]], type: "bars", w: 0.7, color: "#7ee787", label: "gov" }, { pts: [[3, quota / 1000]], type: "bars", w: 0.7, color: "#ffd166", label: "rent" }, { pts: [[4, dw / 1000]], type: "bars", w: 0.7, color: "#ff6b81", label: "DWL" }], { xMin: -0.6, xMax: 4.6 });
    relabel(["UK price", "UK demand", "UK supply", "imports", "deadweight loss"]);
    read.set("a", "£" + T.P.toFixed(0) + " a tonne"); read.set("b", T.qd.toFixed(1) + " kt a day"); read.set("c", T.qs.toFixed(1) + " kt a day"); read.set("d", T.imp.toFixed(1) + " kt a day"); read.set("e", "£" + ((T.dwlP + T.dwlC + T.divert) * 1000).toLocaleString("en-GB", { maximumFractionDigits: 0 }) + " a day");
    ui.hud("A tariff: dearer steel, more UK output, fewer imports, revenue, and deadweight loss");
  } else if (P.view === "fx") {
    chA.opts.title = "The pound each day"; chA.opts.xLabel = "day"; chA.opts.yLabel = "$ per £"; chA.draw([{ pts: fx.map((v, i) => [i, v]), color: "#5ad1ff", label: "market rate" }, { pts: [[0, fxTheory(P)], [120, fxTheory(P)]], color: "#7ee787", dash: [5, 4], label: "D£ = S£" }], { xMin: 0, xMax: 120, yMin: 1.0, yMax: 1.7 });
    const jc = []; for (let q = 0; q <= 12; q += 0.25) jc.push([q, caAfter(q, 0.06, P.pedX, P.pedM)]);
    chB.opts.title = "J-curve after a 6% fall (A level)"; chB.opts.xLabel = "quarters after the fall"; chB.opts.yLabel = "current account change (£bn)"; chB.draw([{ pts: jc, color: "#ffd166", label: `PEDx ${P.pedX} + PEDm ${P.pedM}` }, { pts: jq === null ? [] : [[jq, caAfter(jq, 0.06, P.pedX, P.pedM)]], type: "dots", r: 6, color: "#fff", label: "now" }, { pts: [[0, 0], [12, 0]], color: "#3a4a6b", label: "" }], { xMin: 0, xMax: 12 });
    const e = fx.length ? fx[fx.length - 1] : fxTheory(P);
    relabel(["today's rate", "rate that clears the market", "change from $1.30", "reserves (fixed rate)", "Marshall–Lerner"]);
    read.set("a", "$" + e.toFixed(3) + " per £"); read.set("b", "$" + fxTheory(P).toFixed(3)); read.set("c", ((e / 1.30 - 1) * 100).toFixed(1) + "%"); read.set("d", P.regime === "fixed" ? `$${res.toFixed(1)}bn${broke ? " (peg broken)" : ""}` : "floating: none needed"); read.set("e", `PEDx + PEDm = ${(P.pedX + P.pedM).toFixed(2)}: ${P.pedX + P.pedM > 1 ? "a fall improves the current account" : "a fall makes it worse"}`);
    ui.hud("SPICED: Strong Pound, Imports Cheap, Exports Dear");
  } else {
    const ch = UKY.slice(1).map((y, i) => [y, 100 * (USD[i + 1] / USD[i] - 1)]);
    chA.opts.title = "Year-on-year change in $ per £"; chA.opts.xLabel = "year"; chA.opts.yLabel = "%"; chA.draw([{ pts: ch, type: "bars", w: 0.7, color: "#5ad1ff", label: "change" }], { xMin: 2000, xMax: 2026 });
    chB.opts.title = "Where UK goods exports go (2024)"; chB.opts.xLabel = "0 US · 1 Germany · 2 Netherlands · 3 France · 4 China · 5 Ireland"; chB.opts.yLabel = "% of exports"; chB.draw([{ pts: PARTNERS.map((p, i) => [i, p[1]]), type: "bars", w: 0.7, color: "#ffd166", label: "share" }], { xMin: -0.6, xMax: 5.6, yMin: 0 });
    const i = P.year - 2000;
    relabel(["year", "$ per £", "€ per £", "change on the year before", "EU share of UK goods exports"]);
    read.set("a", String(P.year)); read.set("b", "$" + USD[i].toFixed(2)); read.set("c", "€" + EUR[i].toFixed(2)); read.set("d", i ? (100 * (USD[i] / USD[i - 1] - 1)).toFixed(1) + "% against the $" : "–"); read.set("e", "about 41% (HMRC, 2024)");
    ui.hud("Bank of England annual averages, 2000–2025");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Four views at the top of the controls. Start with comparative advantage.", 6000);
