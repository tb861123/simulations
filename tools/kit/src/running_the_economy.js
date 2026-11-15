/* =====================================================================
   RUNNING THE ECONOMY
   You set the policies; the economy answers a quarter (three months)
   at a time. The government wants five things at once:
     1. steady economic growth        4. a sustainable government budget
     2. low, stable inflation (2%)    5. a sensible balance of trade
     3. low unemployment
   and the tools it has can push some of them the wrong way.

   THE MODEL (all numbers are illustrative, chosen to behave like the UK)
   * Output gap y (% above or below the economy's normal capacity):
       y(next) = 1.3 y - 0.45 y(last) + 0.15 x (fiscal push - interest-rate squeeze) + random shocks
     The "momentum" in the first two terms turns shocks into business
     cycles a few years long.
   * Unemployment follows the output gap (Okun's law): it moves towards
       4.5% - 0.5 y          (4.5% is the "natural" rate)
   * Inflation (the Phillips curve): moves towards
       expected inflation + 0.25 y + cost shocks
     Expected inflation is 2% if people trust the Bank of England, and
     otherwise drifts towards whatever inflation has recently been.
   * The Bank of England sets Bank Rate by a simple rule: raise it when
     inflation is above 2% or the economy is overheating, cut it when not.
   ===================================================================== */
const START = { y: 0, u: 4.9, pi: 3.4, br: 4.0, debt: 95, ca: -2.5 };       // roughly the UK in 2025
const DEF = { dG: 0, dT: 0, ss: 0, mode: "bank", brSet: 4, qeOn: true, cred: 0.8, lagM: 4, lagF: 2, kappa: 0.25, sdD: 0.35, sdC: 0.25, aimU: 4.5 };
class Economy {
  constructor(P, rand, start) {
    this.P = Object.assign({}, DEF, P); this.rand = rand; const s = Object.assign({}, START, start);
    this.y = s.y; this.yl = s.y; this.u = s.u; this.pi = s.pi; this.adapt = s.pi; this.br = s.br; this.qe = 0; this.debt = s.debt; this.ca = s.ca; this.bud = -2.5;
    this.q = 0; this.pot = 100; this.gdp = 100; this.hist = [100, 100, 100, 100]; this.growth = 1.5; this.fQ = []; this.rQ = []; this.ssQ = []; this.dImp = 0; this.cImp = 0; this.recess = false; this.neg = 0; this.uStar = 4.5;
    this.pie = this.P.cred * 2 + (1 - this.P.cred) * this.adapt;
  }
  shockDemand(x) { this.dImp += x; }   // a sudden change in spending (e.g. confidence)
  shockCost(x) { this.cImp += x; }     // a sudden change in costs (e.g. energy prices)
  step() {
    const P = this.P, r = this.rand;
    // ---- fiscal policy: government spending and taxes push demand, after a delay ----
    this.fQ.push(0.8 * P.dG - 0.5 * P.dT + 0.3 * P.ss); const fis = this.fQ.length > P.lagF ? this.fQ[this.fQ.length - 1 - P.lagF] : 0; if (this.fQ.length > 12) this.fQ.shift();
    // ---- monetary policy: who sets Bank Rate? ----
    let target;
    if (P.mode === "you") target = P.brSet;
    else if (P.mode === "aimU") { const yT = (this.uStar - P.aimU) / 0.5; target = 1 + this.pie - yT + 0.8 * (this.y - yT); }     // the Bank is told to aim for an unemployment rate (and so an output gap yT) instead of 2% inflation     // the Bank is told to aim for an unemployment rate instead of 2% inflation
    else target = 1 + this.pi + 0.5 * (this.pi - 2) + 0.5 * this.y;                                          // the Bank's rule: lean against inflation and overheating
    this.br = P.mode === "you" ? P.brSet : Math.max(0.1, this.br + 0.4 * (target - this.br));
    // quantitative easing: when Bank Rate is stuck at its floor, the Bank buys bonds to push down longer-term interest rates
    if (P.mode !== "you" && P.qeOn && target < 0.1 && this.br <= 0.11) this.qe = Math.min(1000, this.qe + 60 * Math.min(1, (0.1 - target)));
    else this.qe *= 0.985;
    const squeeze = this.br - 0.5 * this.qe / 100 - this.pie - 1;           // the REAL interest rate compared with its neutral level (about 1%)
    this.rQ.push(squeeze); const mon = this.rQ.length > P.lagM ? this.rQ[this.rQ.length - 1 - P.lagM] : 0; if (this.rQ.length > 12) this.rQ.shift();
    // ---- supply side: spending on skills, transport and research raises capacity, but only after about two years ----
    this.ssQ.push(P.ss); const ssOld = this.ssQ.length > 8 ? this.ssQ[this.ssQ.length - 9] : 0; if (this.ssQ.length > 12) this.ssQ.shift();
    this.uStar = 4.5 - 0.4 * ssOld; const potG = 1.5 + 0.4 * ssOld;
    // ---- the economy responds ----
    const yNew = 1.3 * this.y - 0.45 * this.yl + 0.15 * (fis - mon) + P.sdD * r.gauss() + this.dImp; this.dImp *= 0.7;
    this.yl = this.y; this.y = yNew;
    this.u += 0.3 * (this.uStar - 0.5 * this.y - this.u);                                                       // Okun's law
    this.pi += 0.4 * (this.pie + P.kappa * this.y + this.cImp + P.sdC * r.gauss() - this.pi); this.cImp *= 0.75;  // the Phillips curve
    this.adapt += 0.25 * (this.pi - this.adapt); this.pie = P.cred * 2 + (1 - P.cred) * this.adapt;              // expectations
    // ---- output, growth and recessions ----
    this.pot *= 1 + potG / 400; const prev = this.gdp; this.gdp = this.pot * (1 + this.y / 100); this.hist.push(this.gdp); if (this.hist.length > 5) this.hist.shift();
    this.growth = (this.gdp / this.hist[0] - 1) * 100; this.neg = this.gdp < prev ? this.neg + 1 : 0; this.recess = this.neg >= 2 || (this.recess && this.gdp < prev);
    // ---- the government's budget and the balance of trade ----
    this.bud = -2.5 - P.dG + P.dT - P.ss + 0.5 * this.y - 0.25 * (this.br - 3.75);                            // a boom raises tax receipts and cuts benefit payments
    this.debt = this.debt * (1 - (this.growth + this.pi) / 400) - this.bud / 4;
    this.ca += 0.2 * (-2.5 - 0.4 * this.y - 0.15 * (this.br - 3.75) - this.ca);                                // booms suck in imports; high rates strengthen the pound
    this.q++;
  }
}
// a run without drawing: n quarters, with `each` called every quarter
function future(P, rnd, n, start, each) { const e = new Economy(P, rnd, start); for (let k = 0; k < n; k++) { e.step(); if (each) each(e, k); } return e; }
const CALM = { y: 0, u: 4.5, pi: 2, br: 3, debt: 95, ca: -2.5 };

// ---- money creation: £100m of new reserves goes round the banks ----
function moneyRounds(rr, c, rounds, rnd) { let dep = 100, cash = 0, total = 0; const out = []; for (let k = 0; k < rounds; k++) { total += dep; const lend = dep * (1 - rr) * (rnd ? 1 + 0.01 * rnd.gauss() : 1); cash += lend * c; out.push([dep, lend]); dep = lend * (1 - c); } return { total: total + cash, deposits: total, cash, rounds: out }; }
const moneyTheory = (rr, c) => 1 + (1 - rr) / (rr + c - rr * c);       // total money ÷ new reserves

// ---- the real UK economy (annual averages; sources in "The model") ----
const UKY = [1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const UKCPI = [1.8, 1.6, 1.3, 0.8, 1.2, 1.3, 1.4, 1.3, 2.1, 2.3, 2.3, 3.6, 2.2, 3.3, 4.5, 2.8, 2.6, 1.5, 0.0, 0.7, 2.7, 2.5, 1.8, 0.9, 2.6, 9.1, 7.3, 2.5, 3.4];
const UKU = [6.9, 6.2, 6.0, 5.4, 5.1, 5.2, 5.0, 4.8, 4.8, 5.4, 5.3, 5.7, 7.6, 7.9, 8.1, 7.9, 7.6, 6.2, 5.4, 4.9, 4.4, 4.1, 3.8, 4.6, 4.6, 3.8, 4.1, 4.3, 4.9];
const UKG = [4.9, 3.3, 2.9, 4.5, 2.4, 1.7, 3.2, 2.3, 2.7, 2.2, 3.0, 0.0, -4.5, 2.4, 1.1, 1.7, 1.9, 3.2, 2.2, 2.2, 3.3, 1.6, 1.4, -10.0, 8.5, 5.0, 0.4, 1.1, 1.2];
// every change in Bank Rate since May 1997: [decimal year, new rate %]
const UKBR = [[1997.34, 6.25], [1997.43, 6.5], [1997.52, 6.75], [1997.6, 7], [1997.85, 7.25], [1998.42, 7.5], [1998.77, 7.25], [1998.84, 6.75], [1998.94, 6.25], [1999.02, 6], [1999.09, 5.5], [1999.27, 5.25], [1999.44, 5], [1999.68, 5.25], [1999.84, 5.5], [2000.03, 5.75], [2000.11, 6], [2001.1, 5.75], [2001.26, 5.5], [2001.35, 5.25], [2001.58, 5], [2001.71, 4.75], [2001.76, 4.5], [2001.85, 4], [2003.1, 3.75], [2003.52, 3.5], [2003.85, 3.75], [2004.1, 4], [2004.34, 4.25], [2004.44, 4.5], [2004.59, 4.75], [2005.59, 4.5], [2006.59, 4.75], [2006.85, 5], [2007.03, 5.25], [2007.35, 5.5], [2007.51, 5.75], [2007.93, 5.5], [2008.1, 5.25], [2008.27, 5], [2008.77, 4.5], [2008.85, 3], [2008.92, 2], [2009.02, 1.5], [2009.1, 1], [2009.17, 0.5], [2016.59, 0.25], [2017.84, 0.5], [2018.58, 0.75], [2020.19, 0.25], [2020.21, 0.1], [2021.96, 0.25], [2022.09, 0.5], [2022.21, 0.75], [2022.34, 1], [2022.45, 1.25], [2022.59, 1.75], [2022.72, 2.25], [2022.84, 3], [2022.95, 3.5], [2023.09, 4], [2023.22, 4.25], [2023.36, 4.5], [2023.47, 5], [2023.59, 5.25], [2024.58, 5], [2024.85, 4.75], [2025.1, 4.5], [2025.35, 4.25], [2025.6, 4], [2025.96, 3.75]];
const UKNOTES = { 1997: "The Bank of England is given control of interest rates, with an inflation target.", 2001: "The dot-com crash and 9/11: the Bank cuts rates quickly; the UK avoids recession.", 2003: "The target switches to 2% CPI inflation.", 2007: "A long boom. House prices and borrowing rise fast.", 2008: "The global financial crisis: banks stop lending, confidence collapses. Bank Rate is cut from 5% to 0.5% in six months.", 2009: "The deepest recession since the war. Rates stuck at 0.5%: the Bank starts quantitative easing.", 2011: "Inflation reaches 4.5% (VAT rise, oil and import prices) while unemployment stays high: the two objectives in conflict.", 2013: "Slow recovery, with austerity: cuts in government spending.", 2015: "Inflation falls to zero as oil prices collapse.", 2016: "The vote to leave the EU. The pound falls; the Bank cuts to 0.25%.", 2019: "Unemployment falls to 3.8%, the lowest since the 1970s.", 2020: "Covid-19: GDP falls 10%, the biggest drop in 300 years. Furlough keeps unemployment down; rates cut to 0.1% and QE reaches £895bn.", 2021: "The economy reopens and bounces back.", 2022: "Energy prices soar after Russia invades Ukraine. Inflation peaks at 11.1% in October; the Bank raises rates fast.", 2023: "Bank Rate reaches 5.25%, the highest since 2008. Inflation falls but stays high.", 2024: "Inflation back near 2%; the Bank starts cutting rates.", 2025: "Inflation rises again to over 3%; unemployment creeps up." };

// ---------------- The page ----------------
const P = Object.assign({}, DEF);
let eco, log = [], view = "eco", speed = 2, acc = 0, ukYear = 2008, rr = 0.1, cashShare = 0.1, mRound = 0, mT = 0, rnd = K.rng(Date.now() % 99991 + 17), events = [];
function restart(start) { eco = new Economy(P, rnd, start); eco.P = P; log = []; events = []; acc = 0; }
const yearOf = q => 2026 + q / 4;
const ui = K.app({
  title: "Running the Economy", subject: "Economics",
  blurb: "Set interest rates, taxes and spending, and try to hit five targets at once",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1): macroeconomic objectives, the business cycle, fiscal, monetary and supply-side policy, conflicts between objectives. Money creation by banks is beyond the spec.", adv: "Edexcel A level Economics A (9EC0) Themes 2 and 4: the output gap, the Phillips curve and expectations, monetary policy including QE, fiscal policy, policy lags, crowding out." } },
  missions: [
    { title: "Five targets at once", q: "This is roughly the UK economy today. The Bank of England sets Bank Rate by its usual rule. Let it run for five years. How many of the five targets (green zones) are hit at once? Which is hardest?", hint: "The economy moves in a business cycle: booms and slowdowns come and go even when nobody changes policy, because random shocks are amplified by momentum (spending begets spending). It is rare to hit all five targets together, and the budget target is usually missed: the UK government has run a deficit in almost every year since 2002.", setup() { set({}); } },
    { title: "Cooling inflation", q: "Inflation is too high at 3.4%. Take over Bank Rate yourself ('You set Bank Rate'). Raise it to 6% and hold it there. What happens to inflation, and how long does it take? What else happens?", hint: "Higher interest rates make borrowing dearer and saving more attractive, so households and firms spend less; demand falls, firms cut prices and hire fewer people. Inflation falls, but only after a year or two (the lag), and unemployment rises meanwhile. The pound strengthens too, making imports cheaper. Hold the rate too long and you cause a recession: this is why the Bank moves in small steps.", setup() { set({ mode: "you", brSet: 6 }); } },
    { title: "A credit crunch", q: "Press 'Credit crunch' (banks stop lending, as in 2008) with the Bank of England's rule in charge. What happens to output, unemployment and Bank Rate? Then run it again and also raise government spending by 2% of GDP straight after. Does it help?", hint: "Spending collapses, the economy goes into recession and unemployment climbs. The Bank cuts Bank Rate sharply, and may hit the floor near zero, at which point it uses quantitative easing. Extra government spending (fiscal stimulus) supports demand directly and shortens the recession, but adds to the deficit and the national debt.", setup() { set({}); } },
    { title: "Energy prices jump", q: "Press 'Energy prices jump' (as in 2022). Inflation shoots up while the economy slows. What should the Bank of England do? Try keeping Bank Rate low, then try raising it.", hint: "A cost shock pushes inflation up and output down at the same time (stagflation), so the objectives conflict. Raise rates to fight inflation and you deepen the slowdown; keep them low and inflation stays high for longer and people may come to expect it. The Bank's answer in 2022–23 was to raise Bank Rate from 0.1% to 5.25%.", setup() { set({}); } },
    { title: "The budget", q: "Cut government spending by 2% of GDP to balance the budget. Watch the deficit, the debt and the output gap over the next few years. Does the deficit fall by the full 2%?", hint: "The deficit falls, but by less than 2%, because cutting spending slows the economy: tax receipts fall and benefit payments rise (automatic stabilisers). Unemployment rises. The Bank of England cuts rates to compensate, which softens the blow. This conflict between a sound budget and growth is at the heart of arguments about austerity.", setup() { set({}); } },
    { title: "Supply-side policy", q: "Spend 1% of GDP a year on the supply side (training, transport, research). Compare the economy after two years and after eight years. What happens to the trend growth rate and to unemployment?", hint: "In the short run the spending just adds to demand (and the deficit). After about two years it raises the economy's capacity: trend growth rises and the natural rate of unemployment falls, so unemployment can be lower without inflation rising. Supply-side policies are slow and uncertain but are the only lasting way to raise living standards.", setup() { set({ ss: 1 }); } },
    { title: "The real UK economy", q: "Switch to 'The real UK, 1997–2025'. Move the year slider to 2008–09, 2020 and 2022. For each, what happened to growth, unemployment, inflation and Bank Rate, and why?", hint: "2008–09: a financial crisis; growth −4.5%, unemployment up to 8%, Bank Rate slashed to 0.5%. 2020: Covid-19; output fell 10% but furlough kept unemployment low. 2022: energy prices; inflation 9.1% for the year (11.1% at its peak), and the Bank raised rates eleven times in a row.", setup() { set({ view: "uk" }); ukYear = 2008; ctl.year.set(2008); } },
    { title: "Banks create money", q: "Switch to 'How banks create money'. £100m of new deposits arrives at one bank. Follow it round. How much money exists at the end? What happens if banks keep more in reserve?", hint: "Each bank keeps a fraction as reserves and lends the rest; the loan is spent and deposited at another bank, which lends most of it again. The total grows to several times the original: banks create money when they lend. Keeping more in reserve, or people holding more cash, shrinks the multiplier. In reality (Bank of England, 2014) lending is limited mainly by how many creditworthy people want to borrow.", setup() { set({ view: "money" }); } },
    { lvl: "adv", title: "The Phillips curve", q: "Tell the Bank of England to aim for 3.5% unemployment instead of 2% inflation ('Bank aims for unemployment'). With credibility at 100%, what happens to inflation? Now set credibility to 0% (people's expectations follow recent inflation) and run it again for ten years.", hint: "With fixed expectations you get a trade-off: lower unemployment, somewhat higher inflation (the short-run Phillips curve). With adaptive expectations, people come to expect the higher inflation, which pushes it higher still, and so on: inflation keeps rising as long as unemployment is held below its natural rate. In the long run there is no trade-off: the long-run Phillips curve is vertical at the natural rate.", setup() { set({ mode: "aimU", aimU: 3.5, cred: 1 }); } },
    { lvl: "adv", title: "Time lags", q: "Set the monetary policy lag to 8 quarters (two years) and run the economy with the Bank's rule. Compare the size of the cycles with a 1-quarter lag. Why can a slow-acting policy make things worse?", hint: "With long lags the Bank is always reacting to yesterday's economy: it raises rates in a boom that, by the time they bite, has already turned. Policy can then add to the swings instead of smoothing them. This is one argument for rules, forecasting, and caution about fine-tuning.", setup() { set({ lagM: 8 }); } },
    { lvl: "adv", title: "Crowding out", q: "Raise government spending by 2% of GDP, first with Bank Rate fixed by you at 3%, then with the Bank of England's rule. Compare the boost to output. Where has part of the fiscal stimulus gone?", hint: "With the rate fixed, the output gap rises by about 1.6% (a multiplier of about 0.8). When the Bank reacts to the extra demand by raising rates, private spending falls, and output rises by only about half as much: higher interest rates crowd out private investment and consumption. Fiscal and monetary policy need to work together.", setup() { set({ mode: "you", brSet: 3, dG: 2, start: "calm" }); } }
  ],
  batch: [
    { title: "Does the Bank hit 2%?", question: "Over ten years, does the Bank of England's rule keep inflation at 2% on average?", how: "Each run: a new random ten-year future starting from a calm economy, with the Bank's rule and full credibility. The result is average inflation over the ten years.", xLabel: "", yLabel: "average inflation over ten years (%)", reps: 300, bins: 22, lo: 1, hi: 3, theory: 2, theoryLabel: "target", run(x, r) { let s = 0; future({ cred: 1 }, r, 40, CALM, e => s += e.pi); return s / 40; }, note: "Shocks push inflation above and below target, but the rule pulls it back, so the average over ten years is very close to 2%. Any single decade can miss by a few tenths." },
    { title: "The short-run Phillips curve", question: "If the Bank aims for a lower unemployment rate, how much inflation does it buy?", how: "Each run: the Bank aims for the chosen unemployment rate with full credibility (expected inflation stays at 2%). The result is average inflation in years 5 to 10.", xLabel: "unemployment the Bank aims for (%)", yLabel: "average inflation (%)", xs: [3, 3.5, 4, 4.5, 5, 5.5, 6], reps: 6, theory: u => 2 + 0.25 * (4.5 - u) / 0.5, theoryLabel: "π = 2 + κ(4.5 − u)/0.5", run(x, r) { let s = 0, c = 0; future({ mode: "aimU", aimU: x, cred: 1 }, r, 40, CALM, (e, k) => { if (k >= 20) { s += e.pi; c++; } }); return s / c; } },
    { title: "The long run: expectations catch up", question: "And if nobody believes in the 2% target?", how: "The same, but with credibility 0: expected inflation follows recent inflation. The result is inflation at the end of year 10. The dashed line is the short-run curve.", xLabel: "unemployment the Bank aims for (%)", yLabel: "inflation after ten years (%)", xs: [3, 3.5, 4, 4.5, 5, 5.5, 6], reps: 6, theory: u => 2 + 0.25 * (4.5 - u) / 0.5, theoryLabel: "short-run curve", run: (x, r) => future({ mode: "aimU", aimU: x, cred: 0 }, r, 40, CALM).pi, note: "Below the natural rate (4.5%) inflation keeps climbing: holding unemployment down by stimulating demand only works while people are surprised. Only at the natural rate does inflation stay at 2%: the long-run Phillips curve is vertical." },
    { title: "Fiscal stimulus, Bank Rate fixed", question: "How much does extra government spending raise output if interest rates do not change?", how: "Each run: government spending is raised by the chosen amount; Bank Rate is held at 3%. The result is the average output gap in years 2 to 6.", xLabel: "extra government spending (% of GDP)", yLabel: "average output gap (%)", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3], reps: 10, fit: true, theory: x => 0.8 * x, theoryLabel: "multiplier 0.8", run(x, r) { let s = 0, c = 0; future({ mode: "you", brSet: 3, dG: x, cred: 1 }, r, 24, CALM, (e, k) => { if (k >= 8) { s += e.y; c++; } }); return s / c; } },
    { title: "Fiscal stimulus when the Bank reacts", question: "And if the Bank of England responds to the extra demand?", how: "The same, but Bank Rate is set by the Bank's rule.", xLabel: "extra government spending (% of GDP)", yLabel: "average output gap (%)", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3], reps: 10, fit: true, theory: x => 0.8 * x / (1 + 1.5 * 0.25 + 0.5), theoryLabel: "with crowding out", run(x, r) { let s = 0, c = 0; future({ dG: x, cred: 1 }, r, 24, CALM, (e, k) => { if (k >= 8) { s += e.y; c++; } }); return s / c; }, note: "The gradient is about half that of the previous experiment: higher interest rates crowd out about half of the stimulus." },
    { title: "Banks create money", question: "How much money does £1 of new reserves become, for different reserve ratios?", how: "Each run: £100m of new reserves goes round 60 rounds of lending; borrowers keep 10% of each loan as cash; each bank's lending varies by about 1%.", xLabel: "reserve ratio (%)", yLabel: "total money ÷ new reserves", xs: [2, 4, 6, 8, 10, 15, 20], reps: 5, yMin: 0, theory: x => moneyTheory(x / 100, 0.1), theoryLabel: "1 + (1 − r) ÷ (r + c − rc)", run: (x, r) => moneyRounds(x / 100, 0.1, 60, r).total / 100, note: "Far less than the textbook 1 ÷ reserve ratio (50 at 2%), because cash leaks out of the banking system at every round. Beyond the spec: enrichment." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1", text: "The main macroeconomic objectives: economic growth, low and stable inflation (UK target 2% CPI), low unemployment, a balance between government spending and tax, and a sustainable balance of payments." },
      { lvl: "std", tag: "4EC1", text: "The business cycle: boom, slowdown, recession (two consecutive quarters of falling real GDP), recovery." },
      { lvl: "std", tag: "4EC1", text: "Monetary policy: the Bank of England changes the interest rate (Bank Rate). Higher rates reduce borrowing and spending, lowering inflation, but can increase unemployment." },
      { lvl: "std", tag: "4EC1", text: "Fiscal policy: the government changes its spending and taxes. Expansionary fiscal policy raises demand and output but increases the budget deficit." },
      { lvl: "std", tag: "4EC1", text: "Supply-side policies (education and training, infrastructure, incentives) raise the economy's productive capacity, but take time." },
      { lvl: "std", tag: "4EC1", text: "Objectives can conflict: for example, cutting unemployment by boosting demand may raise inflation and worsen the current account." },
      { lvl: "adv", tag: "9EC0 Theme 2", text: "Output gap: actual minus potential output. A positive gap (overheating) creates inflationary pressure; a negative gap means spare capacity and unemployment." },
      { lvl: "adv", tag: "9EC0 Theme 4", text: "Short-run Phillips curve: a trade-off between unemployment and inflation. Long-run Phillips curve: vertical at the natural rate, because expectations adjust." },
      { lvl: "adv", tag: "9EC0 Theme 2", text: "Quantitative easing: when Bank Rate is near zero, the central bank creates money to buy bonds, lowering longer-term interest rates." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Banks create money when they lend. Total money ÷ new reserves = 1 + (1 − r) ÷ (r + c − rc) for reserve ratio r and cash share c; in practice lending is limited by demand for loans." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: () => `In your economy inflation is ${eco.pi.toFixed(1)}% and unemployment is ${eco.u.toFixed(1)}%. Explain how ${eco.pi > 2 ? "raising" : "lowering"} Bank Rate would affect inflation.`, ans: () => eco.pi > 2 ? "<ul><li>Higher interest rates make borrowing more expensive and saving more rewarding</li><li>Households and firms spend and invest less</li><li>Aggregate demand falls, so there is less pressure on prices</li><li>Also: the exchange rate may rise, making imports cheaper; effect takes time (a year or more)</li></ul>" : "<ul><li>Lower interest rates make borrowing cheaper and saving less rewarding</li><li>Households and firms spend and invest more</li><li>Aggregate demand rises, putting upward pressure on prices</li><li>Effect takes time (a year or more)</li></ul>" },
      { lvl: "std", marks: 2, q: "Define a recession.", ans: "<ul><li>A fall in real GDP (negative economic growth)</li><li>for two consecutive quarters (six months)</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain one conflict between macroeconomic objectives.", ans: "<ul><li>For example: reducing unemployment v. keeping inflation low</li><li>Expansionary policy raises demand, so firms employ more workers</li><li>but higher demand also pushes up prices / wages</li><li>so inflation may rise above target (and imports rise, worsening the current account)</li></ul>" },
      { lvl: "std", marks: 4, q: "Evaluate the use of government spending to reduce unemployment in a recession.", ans: "<ul><li>Extra spending raises aggregate demand directly; firms need more workers; multiplier effects</li><li>Costs: larger budget deficit and national debt; future taxes may have to rise</li><li>Time lags; may be offset if the central bank raises interest rates (crowding out)</li><li>Does not help structural unemployment, which needs supply-side policies</li></ul>" },
      { lvl: "std", marks: 2, q: "Give two examples of supply-side policies.", ans: "<ul><li>Any two from: education and training, investment in infrastructure, reducing income or corporation tax to improve incentives, deregulation / privatisation, spending on research</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Real GDP is £${(2.4 * eco.gdp / 100).toFixed(3)} trillion this year and was £${(2.4 * eco.hist[0] / 100).toFixed(3)} trillion a year ago. Calculate the rate of economic growth.`, ans: () => `<ul><li>growth = (new − old) ÷ old × 100</li><li>= (${(2.4 * eco.gdp / 100).toFixed(3)} − ${(2.4 * eco.hist[0] / 100).toFixed(3)}) ÷ ${(2.4 * eco.hist[0] / 100).toFixed(3)} × 100</li><li>= ${eco.growth.toFixed(1)}%</li></ul>` },
      { lvl: "adv", marks: 4, q: "Using the Phillips curve, explain why attempts to keep unemployment below its natural rate may lead to accelerating inflation.", ans: "<ul><li>In the short run, higher demand lowers unemployment at the cost of higher inflation (movement along the SRPC)</li><li>Workers and firms come to expect the higher inflation and build it into wage demands and prices</li><li>The SRPC shifts upwards; to hold unemployment down, demand must rise further</li><li>So inflation keeps rising; in the long run unemployment returns to the natural rate (vertical LRPC)</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how quantitative easing is intended to increase aggregate demand.", ans: "<ul><li>The central bank creates reserves to buy government bonds (and other assets) from financial institutions</li><li>Bond prices rise and their yields (long-term interest rates) fall</li><li>Borrowing becomes cheaper and asset prices rise (wealth effect)</li><li>so consumption and investment increase</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain what is meant by crowding out.", ans: "<ul><li>An increase in government spending or borrowing</li><li>raises interest rates (through higher demand for funds or a central bank response)</li><li>which reduces private sector investment and consumption, offsetting part of the stimulus</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>A small "new Keynesian" model of the kind used in teaching and by central banks for illustration. One step is one quarter.</p>
<ul><li><b>Output gap:</b> y(next) = 1.3y − 0.45y(last) + 0.15 × (fiscal push − real-rate squeeze) + random shocks. Fiscal push = 0.8 × change in spending − 0.5 × change in taxes (% of GDP). Squeeze = Bank Rate − QE effect − expected inflation − 1%. Both act after time lags (2 and 4 quarters by default).</li>
<li><b>Unemployment</b> moves 30% of the way each quarter towards the natural rate (4.5%) − 0.5 × output gap.</li>
<li><b>Inflation</b> moves 40% of the way each quarter towards expected inflation + 0.25 × output gap + cost shocks. Expected inflation = credibility × 2% + (1 − credibility) × recent inflation.</li>
<li><b>The Bank of England's rule</b> (Taylor-style): target rate = 1% + inflation + 0.5 × (inflation − 2) + 0.5 × output gap, moved 40% of the way each quarter, floor 0.1%. Quantitative easing is added at the floor: each £100bn lowers longer-term rates by about 0.5 points.</li>
<li><b>Supply-side spending</b> adds to demand at once, and after two years raises trend growth (from 1.5% a year) and lowers the natural rate of unemployment.</li>
<li><b>Budget balance</b> = −2.5% − extra spending + extra taxes − supply-side spending + 0.5 × output gap − interest effect. Debt starts at 95% of GDP. The current account starts at −2.5% of GDP and worsens in booms and with a strong pound.</li>
<li><b>Recession</b> is shaded when real GDP has fallen for two quarters running.</li></ul>
<h3>Simplifications</h3>
<ul><li>All the numbers are illustrative: the real economy is far more complicated, and economists disagree about the sizes of all these effects.</li>
<li>There is no housing market, no financial sector that can fail, no rest of the world beyond the current account, no exchange rate as such and no productivity trend except through supply-side spending.</li>
<li>The government cannot go bankrupt here, and markets never panic about debt.</li>
<li>The picture of the town is a way of showing the numbers, not part of the model.</li>
<li>The money-creation view uses the textbook "money multiplier", which the Bank of England (McLeay, Radia and Thomas, 2014) describes as misleading: in reality banks lend first and find reserves afterwards.</li></ul>
<h3>Sources for the real UK data</h3>
<ul><li>CPI inflation, annual average: ONS series D7G7. Unemployment rate (16+), annual average: ONS MGSX. Real GDP growth: ONS IHYP. Releases of September–October 2026; later releases may revise them.</li>
<li>Bank Rate: Bank of England, Official Bank Rate history (series IUDBEDR), every change from May 1997 to December 2025.</li>
<li>Money creation: McLeay, Radia and Thomas, "Money creation in the modern economy", Bank of England Quarterly Bulletin, 2014 Q1.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/running-the-economy.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("");
ctl.view = K.seg(g, { value: "eco", options: [["eco", "Run the economy"], ["uk", "The real UK, 1997–2025"], ["money", "How banks create money"]], on: v => { ui.mission(null); setView(v); } });
const ecoGroups = [];
g = ui.group("Monetary policy: Bank Rate"); ecoGroups.push(g);
ctl.mode = K.seg(g, { value: "bank", options: [["bank", "The Bank's rule"], ["you", "You set Bank Rate"], ["aimU", "Bank aims for unemployment"]], on: v => { P.mode = v; showMode(); } });
ctl.brSet = K.slider(g, { label: "Bank Rate", min: 0.1, max: 10, step: 0.05, value: 4, unit: "%", on: v => { P.brSet = v; } });
ctl.aimU = K.slider(g, { label: "Unemployment the Bank aims for", min: 2.5, max: 6.5, step: 0.1, value: 4.5, unit: "%", on: v => { P.aimU = v; } });
ctl.qeOn = K.toggle(g, { label: "Use quantitative easing at the floor", value: true, on: v => { P.qeOn = v; } });
g = ui.group("Fiscal and supply-side policy"); ecoGroups.push(g);
ctl.dG = K.slider(g, { label: "Change in government spending", min: -4, max: 4, step: 0.25, value: 0, fmt: v => (v > 0 ? "+" : "") + v.toFixed(2) + "% of GDP", on: v => { P.dG = v; } });
ctl.dT = K.slider(g, { label: "Change in taxes", min: -4, max: 4, step: 0.25, value: 0, fmt: v => (v > 0 ? "+" : "") + v.toFixed(2) + "% of GDP", on: v => { P.dT = v; } });
ctl.ss = K.slider(g, { label: "Supply-side spending", min: 0, max: 2, step: 0.25, value: 0, fmt: v => v.toFixed(2) + "% of GDP a year", on: v => { P.ss = v; } });
g = ui.group("Shocks"); ecoGroups.push(g);
let r1 = K.row(g); K.btn(r1, "Confidence boom", () => shock("boom")); K.btn(r1, "Credit crunch", () => shock("crunch"));
r1 = K.row(g); K.btn(r1, "Energy prices jump", () => shock("energy")); K.btn(r1, "↺ New future", () => restart());
const advGroup = g = ui.group("A level settings"); ecoGroups.push(g);
ctl.cred = K.slider(g, { label: "Credibility of the 2% target", min: 0, max: 1, step: 0.05, value: 0.8, fmt: v => Math.round(v * 100) + "%", on: v => { P.cred = v; } });
ctl.lagM = K.slider(g, { label: "Monetary policy lag", min: 0, max: 8, step: 1, value: 4, unit: "quarters", on: v => { P.lagM = v; } });
ctl.lagF = K.slider(g, { label: "Fiscal policy lag", min: 0, max: 8, step: 1, value: 2, unit: "quarters", on: v => { P.lagF = v; } });
ctl.kappa = K.slider(g, { label: "Slope of the Phillips curve", min: 0.05, max: 0.6, step: 0.05, value: 0.25, fmt: v => v.toFixed(2), on: v => { P.kappa = v; } });
g = ui.group("Watch"); ecoGroups.push(g);
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 8, step: 0.5, value: speed, fmt: v => v + " quarters a second", on: v => speed = v });
const read = K.readout(g, [["d", "date"], ["gr", "growth (a year)"], ["pi", "CPI inflation"], ["u", "unemployment"], ["br", "Bank Rate"], ["bud", "budget balance"], ["debt", "national debt"], ["ca", "current account"], ["y", "output gap"], ["qe", "QE"]]);
const ukGroup = g = ui.group("The real UK");
ctl.year = K.slider(g, { label: "Year", min: 1997, max: 2025, step: 1, value: 2008, on: v => ukYear = v });
const ukNote = K.note(g, "");
const moneyGroup = g = ui.group("How banks create money (beyond the spec)");
ctl.rr = K.slider(g, { label: "Reserve ratio: share banks keep", min: 0.02, max: 0.3, step: 0.01, value: 0.1, fmt: v => Math.round(v * 100) + "%", on: v => { rr = v; mRound = 0; } });
ctl.cash = K.slider(g, { label: "Share of each loan kept as cash", min: 0, max: 0.3, step: 0.01, value: 0.1, fmt: v => Math.round(v * 100) + "%", on: v => { cashShare = v; mRound = 0; } });
r1 = K.row(g); K.btn(r1, "↺ Start again", () => { mRound = 0; }, "primary");
function showMode() { ctl.brSet.el.style.display = P.mode === "you" ? "" : "none"; ctl.aimU.el.style.display = P.mode === "aimU" ? "" : "none"; ctl.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; }
function setView(v) { view = v; ctl.view.set(v); for (const q of ecoGroups) q.style.display = v === "eco" ? "" : "none"; ukGroup.style.display = v === "uk" ? "" : "none"; moneyGroup.style.display = v === "money" ? "" : "none"; ukBox.style.display = v === "uk" ? "" : "none"; if (v === "eco") ui.onLevel(ui.level); }
function shock(k) { if (k === "boom") { eco.shockDemand(1.6); events.push([eco.q, "confidence boom"]); } else if (k === "crunch") { eco.shockDemand(-3); events.push([eco.q, "credit crunch"]); } else { eco.shockCost(3.5); eco.shockDemand(-0.6); events.push([eco.q, "energy prices"]); } }
function set(o) {
  Object.assign(P, DEF); for (const k of ["mode", "brSet", "aimU", "dG", "dT", "ss", "cred", "lagM"]) if (o[k] != null) P[k] = o[k];
  for (const k of ["brSet", "aimU", "dG", "dT", "ss", "cred", "lagM", "lagF", "kappa"]) ctl[k].set(P[k]); ctl.mode.set(P.mode); ctl.qeOn.set(true); speed = 2; ctl.speed.set(2);
  restart(o.start === "calm" ? CALM : null); setView(o.view || "eco"); showMode();
}

// ---------------- Drawing: the five targets above a town that shows the economy ----------------
const cv = ui.canvas(() => { });
const TARGETS = [["growth", "Growth", e => e.growth, "%", 1.5, 3, -3, 6], ["pi", "Inflation", e => e.pi, "%", 1, 3, -1, 8], ["u", "Unemployment", e => e.u, "%", 2.5, 5, 2, 10], ["bud", "Budget balance", e => e.bud, "% of GDP", -3, 3, -10, 3], ["ca", "Current account", e => e.ca, "% of GDP", -3, 3, -6, 3]];
const hsh = x => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
function drawEco() {
  const c = cv.ctx, w = cv.w, h = cv.h, e = eco;
  const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#0d1730"); sky.addColorStop(0.65, e.recess ? "#3a2e3a" : "#2c4566"); sky.addColorStop(1, "#151c28"); c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // ---- five gauges ----
  const gw = Math.min(170, (w - 40) / 5 - 8), gx0 = (w - (gw + 8) * 5 + 8) / 2; let hit = 0;
  TARGETS.forEach(([k, name, f, unit, lo, hi, a, b], i) => {
    const v = f(e), ok = v >= lo && v <= hi, x = gx0 + i * (gw + 8), y = 14, X = q => x + 10 + (K.clamp(q, a, b) - a) / (b - a) * (gw - 20); if (ok) hit++;
    c.fillStyle = "rgba(8,14,26,.82)"; c.strokeStyle = ok ? "#5fd38a" : "#ff8a70"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x, y, gw, 68, 9); c.fill(); c.stroke();
    c.fillStyle = "#aab6cc"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(name, x + 10, y + 16); c.fillStyle = ok ? "#7fe3a0" : "#ffb39f"; c.font = "600 19px Segoe UI,sans-serif"; c.fillText(v.toFixed(1) + "%", x + 10, y + 40);
    c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(x + 10, y + 50, gw - 20, 6); c.fillStyle = "rgba(95,211,138,.55)"; c.fillRect(X(lo), y + 50, X(hi) - X(lo), 6); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(X(v), y + 48); c.lineTo(X(v) - 4, y + 42); c.lineTo(X(v) + 4, y + 42); c.fill();
  });
  // ---- the town ----
  const ground = h - 46, wave = performance.now() / 1000;
  c.fillStyle = "#1b2433"; c.fillRect(0, ground, w, h - ground); c.fillStyle = "#2b3546"; c.fillRect(0, ground + 14, w, 16); c.strokeStyle = "rgba(255,230,140,.35)"; c.setLineDash([14, 12]); c.beginPath(); c.moveTo(0, ground + 22); c.lineTo(w, ground + 22); c.stroke(); c.setLineDash([]);
  const busy = K.clamp(0.5 + e.y / 6, 0.05, 1), emp = K.clamp(1 - (e.u - 2) / 8, 0, 1);
  // background flats: lit windows show how many people are in work
  for (let k = 0; k < 9; k++) { const bx = w * (0.04 + k * 0.11) + 10 * hsh(k), bw = 46 + 30 * hsh(k + 3), bh = 80 + 90 * hsh(k + 7); c.fillStyle = "#18223a"; c.fillRect(bx, ground - bh, bw, bh); for (let yy = ground - bh + 8; yy < ground - 10; yy += 13) for (let xx = bx + 6; xx < bx + bw - 8; xx += 11) { c.fillStyle = hsh(xx * 3.1 + yy * 7.7) < emp ? "rgba(255,214,120,.85)" : "rgba(40,52,74,1)"; c.fillRect(xx, yy, 6, 7); } }
  const lab = (t, x, y) => { c.fillStyle = "#eef2f8"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(t, x, y); };
  // factory: chimney smoke grows with output
  { const fx = w * 0.07, fw = w * 0.19, fh = 70; c.fillStyle = "#3a4256"; c.fillRect(fx, ground - fh, fw, fh); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(fx + k * fw / 4, ground - fh); c.lineTo(fx + (k + .5) * fw / 4, ground - fh - 18); c.lineTo(fx + (k + 1) * fw / 4, ground - fh); c.fill(); } c.fillRect(fx + fw * .78, ground - fh - 56, 12, 56);
    for (let k = 0; k < 14 * busy; k++) { const t = (wave * 0.25 + k / 14) % 1; c.fillStyle = `rgba(200,205,215,${0.5 * (1 - t)})`; c.beginPath(); c.arc(fx + fw * .78 + 6 + t * 50 + Math.sin(t * 6 + k) * 6, ground - fh - 60 - t * 70, 6 + t * 16, 0, 6.3); c.fill(); }
    lab("FACTORIES", fx + fw / 2, ground - 8); c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#cfd8ea"; c.fillText("output " + (100 + e.y).toFixed(0) + "% of normal" + (e.y < -0.5 ? ": spare capacity" : e.y > 1 ? ": overheating" : ""), fx + fw * 0.4, ground - fh - 26); }
  // shops: the price tag shows inflation
  { const sx = w * 0.3, sw = w * 0.15, sh = 58; c.fillStyle = "#4a3a5a"; c.fillRect(sx, ground - sh, sw, sh); c.fillStyle = "#e05a6a"; for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? "#f0e6dc" : "#e05a6a"; c.fillRect(sx + k * sw / 6, ground - sh, sw / 6, 12); } c.fillStyle = "rgba(255,220,150,.75)"; c.fillRect(sx + 8, ground - sh + 20, sw - 16, 24);
    const tag = e.pi > 3 ? "#ff8a70" : e.pi < 1 ? "#8ac6ff" : "#7fe3a0"; c.save(); c.translate(sx + sw / 2, ground - sh - 30); c.rotate(-0.12); c.fillStyle = tag; c.beginPath(); c.roundRect(-34, -14, 68, 28, 5); c.fill(); c.fillStyle = "#101520"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText((e.pi >= 0 ? "+" : "") + e.pi.toFixed(1) + "%", 0, 5); c.restore(); lab("SHOPS: prices this year", sx + sw / 2, ground - 8); }
  // Jobcentre: the queue shows unemployment
  { const jx = w * 0.5, jw = w * 0.12, jh = 52; c.fillStyle = "#33435e"; c.fillRect(jx, ground - jh, jw, jh); c.fillStyle = "#c9d6ea"; c.fillRect(jx + 6, ground - jh + 6, jw - 12, 12); c.fillStyle = "#33435e"; c.font = "600 9px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("JOBCENTRE", jx + jw / 2, ground - jh + 15);
    const n = Math.round(e.u * 2); for (let k = 0; k < n; k++) { const px = jx + jw + 8 + k * 9, py = ground - 4; c.fillStyle = hsh(k) < .5 ? "#cfd8ea" : "#9fb0d0"; c.beginPath(); c.arc(px, py - 17, 3.3, 0, 6.3); c.fill(); c.fillRect(px - 3, py - 13, 6, 12); }
    c.fillStyle = "#cfd8ea"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(e.u.toFixed(1) + "% out of work", jx + jw + 8, ground - 30); }
  // Bank of England and the Treasury
  { const bx = w * 0.79, bw = w * 0.17, bh = 74; c.fillStyle = "#c9c2b0"; c.fillRect(bx, ground - bh, bw, bh); c.beginPath(); c.moveTo(bx - 6, ground - bh); c.lineTo(bx + bw / 2, ground - bh - 22); c.lineTo(bx + bw + 6, ground - bh); c.fill(); c.fillStyle = "#a8a08c"; for (let k = 0; k < 6; k++) c.fillRect(bx + 8 + k * (bw - 16) / 5.5, ground - bh + 10, 6, bh - 14);
    c.fillStyle = "#101520"; c.beginPath(); c.roundRect(bx + bw / 2 - 40, ground - bh - 64, 80, 30, 6); c.fill(); c.strokeStyle = "#ffd166"; c.stroke(); c.fillStyle = "#ffd166"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(e.br.toFixed(2) + "%", bx + bw / 2, ground - bh - 44); lab("BANK OF ENGLAND", bx + bw / 2, ground - 8); if (e.qe > 5) { c.fillStyle = "#c58cff"; c.font = "11px Segoe UI,sans-serif"; c.fillText("QE £" + Math.round(e.qe) + "bn", bx + bw / 2, ground - bh - 72); } }
  // traffic: more cars, faster, in a boom
  const ncars = Math.round(4 + 14 * busy); for (let k = 0; k < ncars; k++) { const x = ((hsh(k) * w + wave * (30 + 50 * busy) * (k % 2 ? 1 : -1)) % (w + 40) + w + 40) % (w + 40) - 20, y = ground + (k % 2 ? 24 : 15); c.fillStyle = ["#e05a6a", "#6fb1ff", "#ffd166", "#cfd8ea"][k % 4]; c.fillRect(x - 9, y - 4, 18, 7); }
  // headline
  c.fillStyle = e.recess ? "#ff8a70" : hit >= 4 ? "#7fe3a0" : "#eef2f8"; c.font = "600 15px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText((2026 + Math.floor(e.q / 4)) + " Q" + (e.q % 4 + 1) + " · " + (e.recess ? "RECESSION: output has fallen two quarters running" : hit + " of 5 targets hit") + (e.y > 1.5 ? " · the economy is overheating" : e.y < -1.5 ? " · the economy is weak" : ""), w / 2, 110);
}
// ---- how banks create money ----
function drawMoney(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1220"; c.fillRect(0, 0, w, h);
  mT += dt; if (mT > 0.6 && mRound < 30) { mT = 0; mRound++; }
  const M = moneyRounds(rr, cashShare, mRound), n = 6, R = Math.min(w * 0.3, h * 0.33), cx = w * 0.36, cy = h * 0.52, maxD = 100;
  for (let b = 0; b < n; b++) {
    const a = -Math.PI / 2 + b * 2 * Math.PI / n, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; let dep = 0; M.rounds.forEach((q, k) => { if (k % n === b) dep += q[0]; });
    c.fillStyle = "#1d2a40"; c.strokeStyle = M.rounds.length && (M.rounds.length - 1) % n === b ? "#ffd166" : "#3a4c6c"; c.lineWidth = 2; c.beginPath(); c.roundRect(x - 50, y - 34, 100, 68, 8); c.fill(); c.stroke();
    c.fillStyle = "#eef2f8"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("Bank " + "ABCDEF"[b], x, y - 18); c.fillStyle = "#7fe3a0"; c.fillText("deposits £" + dep.toFixed(1) + "m", x, y + 2); c.fillStyle = "#9fb0d0"; c.font = "11px Segoe UI,sans-serif"; c.fillText("reserves £" + (dep * rr).toFixed(1) + "m", x, y + 20);
    if (b < Math.min(mRound, n) || mRound > n) { const a2 = -Math.PI / 2 + (b + 1) * 2 * Math.PI / n, x2 = cx + Math.cos(a2) * R, y2 = cy + Math.sin(a2) * R, mx = (x + x2) / 2 * 0.85 + cx * 0.15, my = (y + y2) / 2 * 0.85 + cy * 0.15; c.strokeStyle = "rgba(255,209,102,.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, x2, y2); c.stroke(); }
  }
  c.fillStyle = "#ffd166"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("loans spent and re-deposited", cx, cy + 4); c.fillStyle = "#cfd8ea"; c.font = "12px Segoe UI,sans-serif"; c.fillText("round " + mRound, cx, cy + 22);
  const tx = Math.min(w * 0.64, cx + R + 90); c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.fillText("£100m of new deposits arrives at Bank A", tx, 70);
  const rowsT = [["deposits in all banks", "£" + M.deposits.toFixed(1) + "m", "#7fe3a0"], ["cash held by the public", "£" + M.cash.toFixed(1) + "m", "#ffd166"], ["total money now", "£" + M.total.toFixed(1) + "m", "#fff"], ["theory, after many rounds", "£" + (100 * moneyTheory(rr, cashShare)).toFixed(0) + "m", "#9fb0d0"], ["textbook 1 ÷ reserve ratio", "£" + (100 / rr).toFixed(0) + "m", "#9fb0d0"]];
  rowsT.forEach((q, i) => { c.fillStyle = "#aab6cc"; c.font = "12.5px Segoe UI,sans-serif"; c.fillText(q[0], tx, 104 + i * 30); c.fillStyle = q[2]; c.font = "600 15px Segoe UI,sans-serif"; c.fillText(q[1], tx + 175, 104 + i * 30); });
  c.fillStyle = "#9fb0d0"; c.font = "12px Segoe UI,sans-serif"; ["Each bank keeps " + Math.round(rr * 100) + "% of new deposits as reserves", "and lends the rest. Borrowers keep " + Math.round(cashShare * 100) + "% as cash", "and spend the rest, which is deposited", "at the next bank, and so on."].forEach((t, i) => c.fillText(t, tx, 270 + i * 18));
}
// ---- the real UK: charts drawn over the stage ----
const ukBox = K.$("div", ""); ukBox.style.cssText = "position:absolute;inset:0;display:none;grid-template-rows:1fr 1fr;gap:1px;background:var(--line);z-index:2"; ui.stage.append(ukBox);
const ukA = K.chart(ukBox, { title: "CPI inflation and Bank Rate", xLabel: "", yLabel: "%", xMin: 1997, xMax: 2026 }), ukB = K.chart(ukBox, { title: "Unemployment and economic growth", xLabel: "year", yLabel: "%", xMin: 1997, xMax: 2026 });
for (const ch of [ukA, ukB]) ch.el.style.cssText += ";height:100%";
const _sv = setView; setView = v => { _sv(v); ukBox.style.display = v === "uk" ? "grid" : "none"; };
function drawUK() {
  const brStep = []; UKBR.forEach((q, i) => { if (i) brStep.push([q[0], UKBR[i - 1][1]]); brStep.push(q); }); brStep.push([2026, 3.75]);
  const i = UKY.indexOf(ukYear), rec = [{ x0: 2008.25, x1: 2009.5, color: "rgba(255,120,100,.15)" }, { x0: 2020.0, x1: 2020.5, color: "rgba(255,120,100,.15)" }], vl = [{ x: ukYear + 0.5, color: "#fff", label: ukYear + "" }];
  ukA.draw([{ pts: UKY.map((y, k) => [y + 0.5, UKCPI[k]]), color: "#ff8a70", label: "CPI inflation", width: 2.2 }, { pts: brStep, color: "#ffd166", label: "Bank Rate", width: 1.6 }, { pts: [[1997, 2], [2026, 2]], color: "rgba(127,227,160,.7)", dash: [5, 4], label: "2% target" }], { bands: rec, vlines: vl });
  ukB.draw([{ pts: UKY.map((y, k) => [y + 0.5, UKU[k]]), color: "#6fb1ff", label: "unemployment", width: 2.2 }, { pts: UKY.map((y, k) => [y + 0.5, UKG[k]]), color: "#7fe3a0", label: "real GDP growth", width: 2.2 }], { bands: rec, vlines: vl, hlines: [{ y: 0, color: "rgba(255,255,255,.3)" }] });
  let br = 0; for (const q of UKBR) if (q[0] <= ukYear + 1) br = q[1];
  ukNote.innerHTML = `<b>${ukYear}</b>: growth ${UKG[i]}%, CPI inflation ${UKCPI[i]}%, unemployment ${UKU[i]}%, Bank Rate ${br}% at the end of the year.<br>${UKNOTES[ukYear] || ""}`;
  ui.hud(`<b style="font-size:14px">UK, ${ukYear}</b><br>growth ${UKG[i]}% · inflation ${UKCPI[i]}%<br>unemployment ${UKU[i]}% · Bank Rate ${br}%`);
}
const chY = K.chart(ui.dock, { title: "Output, unemployment and growth", xLabel: "year", yLabel: "%" });
const chP = K.chart(ui.dock, { title: "Inflation and Bank Rate", xLabel: "year", yLabel: "%" });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (view !== "eco") return; acc += speed * Math.max(dt, 1 / 120);
  while (acc >= 1) { acc--; eco.step(); log.push([yearOf(eco.q), eco.y, eco.u, eco.growth, eco.pi, eco.br, eco.recess ? 1 : 0, eco.pie]); if (log.length > 160) log.shift(); }
}, dt => {
  if (view === "uk") { if (frame++ % 6) return; drawUK();
    chY.draw([{ pts: UKY.map((y, k) => [UKU[k], UKCPI[k]]), type: "dots", color: "#ff8a70", r: 3.5 }, { pts: [[UKU[UKY.indexOf(ukYear)], UKCPI[UKY.indexOf(ukYear)]]], type: "dots", color: "#fff", r: 6, label: ukYear + "" }], { title: "Is there a Phillips curve? UK 1997–2025", xLabel: "unemployment (%)", yLabel: "inflation (%)", xMin: 3, xMax: 9, yMin: -0.5 });
    chP.draw([{ pts: UKY.map((y, k) => { let br = 0; for (const q of UKBR) if (q[0] <= y + 0.5) br = q[1]; return [y + 0.5, br - UKCPI[k]]; }), color: "#ffd166", width: 2, label: "Bank Rate minus inflation" }], { title: "The real interest rate", xLabel: "year", yLabel: "%", xMin: 1997, xMax: 2026, hlines: [{ y: 0, color: "rgba(255,255,255,.35)" }] }); return; }
  if (view === "money") { drawMoney(Math.min(dt, 0.1)); ui.hud(""); if (frame++ % 6) return; const M = moneyRounds(rr, cashShare, Math.max(1, mRound)); let tot = 0;
    chY.draw([{ pts: M.rounds.map((q, k) => { tot += q[0] + q[1] * cashShare; return [k + 1, tot]; })   /* deposits plus cash so far */, color: "#7fe3a0", width: 2.2, label: "money created so far (£m)" }, { pts: [[0, 100 * moneyTheory(rr, cashShare)], [30, 100 * moneyTheory(rr, cashShare)]], color: "#9fb0d0", dash: [5, 4], label: "theory" }], { title: "Total money", xLabel: "round", yLabel: "£m", xMin: 0, xMax: 30, yMin: 0 });
    chP.draw([{ type: "bars", w: 0.7, color: "#ffd166", alpha: .85, pts: M.rounds.map((q, k) => [k + 1, q[0]]) }], { title: "New deposits in each round", xLabel: "round", yLabel: "£m", xMin: 0, xMax: 30, yMin: 0 }); return; }
  drawEco(); if (frame++ % 6) return; const e = eco, x0 = log.length ? log[0][0] : 2026, x1 = Math.max(x0 + 6, yearOf(e.q));
  const bands = []; let s = null; for (const q of log) { if (q[6] && s == null) s = q[0]; if (!q[6] && s != null) { bands.push({ x0: s - 0.25, x1: q[0], color: "rgba(255,120,100,.18)" }); s = null; } } if (s != null) bands.push({ x0: s - 0.25, x1: x1, color: "rgba(255,120,100,.18)" });
  chY.draw([{ pts: log.map(q => [q[0], q[1]]), color: "#c58cff", label: "output gap", width: 2 }, { pts: log.map(q => [q[0], q[2]]), color: "#6fb1ff", label: "unemployment", width: 2 }, { pts: log.map(q => [q[0], q[3]]), color: "#7fe3a0", label: "growth", width: 1.6 }], { xMin: x0, xMax: x1, bands, hlines: [{ y: 0, color: "rgba(255,255,255,.3)" }] });
  chP.draw([{ pts: log.map(q => [q[0], q[4]]), color: "#ff8a70", label: "inflation", width: 2.2 }, { pts: log.map(q => [q[0], q[5]]), color: "#ffd166", label: "Bank Rate", width: 1.8 }].concat(ui.level === "adv" ? [{ pts: log.map(q => [q[0], q[7]]), color: "#ff8a70", dash: [3, 4], label: "expected inflation", width: 1.2 }] : []), { xMin: x0, xMax: x1, bands, hlines: [{ y: 2, label: "2% target", color: "rgba(127,227,160,.7)" }], vlines: events.map(q => ({ x: yearOf(q[0]), label: q[1] })) });
  const qn = e.q % 4 + 1, yr = 2026 + Math.floor(e.q / 4);
  read.set("d", yr + " Q" + qn); read.set("gr", e.growth.toFixed(1) + "%"); read.set("pi", e.pi.toFixed(1) + "%"); read.set("u", e.u.toFixed(1) + "%"); read.set("br", e.br.toFixed(2) + "%"); read.set("bud", (e.bud >= 0 ? "surplus " : "deficit ") + Math.abs(e.bud).toFixed(1) + "% of GDP"); read.set("debt", e.debt.toFixed(0) + "% of GDP"); read.set("ca", e.ca.toFixed(1) + "% of GDP"); read.set("y", (e.y >= 0 ? "+" : "") + e.y.toFixed(1) + "%"); read.set("qe", "£" + Math.round(e.qe) + "bn");
  ui.hud("");   // the gauges already show the figures
});
ui.onLevel = v => { advGroup.style.display = v === "adv" && view === "eco" ? "" : "none"; if (v !== "adv" && P.mode === "aimU") { P.mode = "bank"; ctl.mode.set("bank"); } showMode(); };
set({});
ui.tip("You are in charge · the five boxes are the government's targets · the town shows how the economy feels", 8000);
