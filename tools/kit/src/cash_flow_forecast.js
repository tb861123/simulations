/* =====================================================================
   CASH-FLOW FORECAST
   PROFIT and CASH are different things. A sale on credit counts towards
   profit the day it is made, but the cash only arrives when the customer
   pays (30, 60 or 90 days later). Materials bought on credit are paid for
   later too. A business can be profitable and still run out of cash.
   A cash-flow forecast predicts, month by month:
        net cash flow     = cash inflows − cash outflows
        opening balance   = last month's closing balance
        closing balance   = opening balance + net cash flow
   If the closing balance goes below zero the business is using its
   OVERDRAFT; if it goes past the overdraft limit it cannot pay its bills.
   Ways to improve cash flow: give customers less credit, get more credit
   from suppliers, cut or delay spending, factor the debts (A level), or
   raise finance (a loan or new capital).
   The "actual" months differ from the forecast because real sales are
   uncertain and some customers pay late.
   ===================================================================== */
const gbp = v => (v < 0 ? "−£" : "£") + Math.abs(Math.round(v)).toLocaleString("en-GB");
const gbpk = v => (v < 0 ? "−" : "") + (Math.abs(v) >= 9950 ? Math.round(Math.abs(v) / 1000) + "k" : (Math.abs(v) / 1000).toFixed(1) + "k");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------- The businesses (illustrative monthly figures) ----------------
// shape: each month's sales as a multiple of the average month (seasonality)
const BIZ = {
  garden: { name: "Garden furniture", base: 20000, shape: [0.4, 0.5, 0.9, 1.4, 1.7, 1.6, 1.3, 1.0, 0.7, 0.5, 0.4, 0.6], mat: 0.45, lead: 1, wages: 6500, rent: 2000, credit: 0.6, custDays: 60, supDays: 30, open: 8000, od: 20000, capex: 12000 },
  gym: { name: "Gym", base: 15000, shape: [1.3, 1.15, 1.05, 1, 0.95, 0.9, 0.85, 0.85, 1.05, 1, 0.95, 0.8], mat: 0.05, lead: 0, wages: 7000, rent: 4500, credit: 0, custDays: 30, supDays: 30, open: 5000, od: 5000, capex: 6000 },
  toys: { name: "Toy shop", base: 18000, shape: [0.6, 0.6, 0.7, 0.7, 0.7, 0.7, 0.7, 0.8, 0.9, 1.1, 1.8, 2.8], mat: 0.55, lead: 2, wages: 5000, rent: 3000, credit: 0.1, custDays: 30, supDays: 60, open: 10000, od: 20000, capex: 0 }
};

/* One year of cash flow. o = settings; r = random numbers for an "actual" year (null gives the forecast).
   Returns month-by-month rows plus the year's profit. */
function year(o, r) {
  const b = BIZ[o.biz], M = 12, z = new Array(M + 4).fill(0).map(() => r ? r.gauss() : 0);
  const salesF = m => b.base * (1 + o.season * (b.shape[(m + 12) % 12] - 1)) * (1 + o.growth * m / 12);     // forecast sales in month m (m may be past December)
  const sales = m => Math.max(0, salesF(m) * (1 + o.cv * z[m]));                                       // actual sales (equal to the forecast when r is null)
  const lag = d => Math.round(d / 30);                                                                       // 30 days = one month later
  const row = () => new Array(M).fill(0);
  const R = { cashSales: row(), debtors: row(), loan: row(), inT: row(), mats: row(), wages: row(), rent: row(), other: row(), outT: row(), net: row(), open: row(), close: row(), sales: row() };
  let late = row();
  for (let m = 0; m < M; m++) {
    const s = sales(m); R.sales[m] = s;
    R.cashSales[m] += (1 - o.credit) * s;
    if (o.factor) R.debtors[m] += o.credit * s * (1 - o.fee);                       // factoring: the factor pays now, minus its fee
    else {
      const bad = r ? o.bad : 0, lateFrac = r ? o.late : 0, due = m + lag(o.custDays);
      const paid = o.credit * s * (1 - bad);
      if (due < M) R.debtors[due] += paid * (1 - lateFrac);
      if (due + 1 < M) late[due + 1] += paid * lateFrac;
    }
  }
  // debtors from last year's sales still being paid in January/February (credit sales made before the year began)
  if (!o.factor) for (let m = -lag(o.custDays); m < 0; m++) { const due = m + lag(o.custDays); if (due >= 0 && due < M) R.debtors[due] += o.credit * salesF(m); }
  for (let m = 0; m < M; m++) R.debtors[m] += late[m];
  // materials for the sales of month m are bought `lead` months before and paid `supDays` after that
  for (let m = -6; m < M + 6; m++) { const buy = m - b.lead, pay = buy + lag(o.supDays); if (pay >= 0 && pay < M) R.mats[pay] += b.mat * salesF(m); }   // bought to match the FORECAST
  let bal = o.open, interest = 0;
  for (let m = 0; m < M; m++) {
    R.wages[m] = o.wages; R.rent[m] = b.rent;
    R.other[m] = (m === 0 ? o.capex : 0) + (o.loan ? o.loan / 24 * (m >= 1 ? 1 : 0) * 1.05 : 0);  // equipment in January; loan repaid over two years with 5% interest
    R.loan[m] = m === 0 ? o.loan : 0;
    const int = bal < 0 ? -bal * o.odRate / 12 : 0; interest += int; R.other[m] += int;      // overdraft interest on last month's negative balance
    R.inT[m] = R.cashSales[m] + R.debtors[m] + R.loan[m]; R.outT[m] = R.mats[m] + R.wages[m] + R.rent[m] + R.other[m];
    R.net[m] = R.inT[m] - R.outT[m]; R.open[m] = bal; bal += R.net[m]; R.close[m] = bal;
  }
  // profit counts sales when made and the materials they used, whenever the cash moves
  const salesY = R.sales.reduce((a, v) => a + v, 0), matsY = R.sales.reduce((a, v, m) => a + b.mat * (r ? v : salesF(m)), 0);
  R.profit = salesY - matsY - 12 * (o.wages + b.rent) - o.capex / 5 - interest - (o.factor ? o.credit * salesY * o.fee : 0) - (o.loan ? o.loan * 0.05 / 2 : 0) - (r ? o.bad * o.credit * salesY : 0);
  R.low = Math.min(...R.close); R.lowM = R.close.indexOf(R.low); R.breach = R.close.filter(v => v < -o.od).length;
  // cumulative profit month by month (for the profit-against-cash chart)
  let cp = 0; R.cumProfit = R.sales.map(v => (cp += v * (1 - b.mat) - o.wages - b.rent - o.capex / 60, cp));
  return R;
}

// ---------------- The page ----------------
const DEF = { biz: "garden", season: 1, growth: 0, cv: 0.15, late: 0.1, bad: 0, factor: false, fee: 0.04, odRate: 0.12, loan: 0, speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), F = null, A = null, mNow = 0, mt = 0, yearNo = 1, history = [];
const ui = K.app({
  title: "Cash-Flow Forecast", subject: "Business",
  blurb: "Month-by-month inflows and outflows, opening and closing balances, overdrafts, credit terms and seasonal sales: profit is not cash",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Business (Pearson Edexcel 1BS0) 1.3.3 Cash and cash flow: the importance of cash, the difference between cash and profit, cash-flow forecasts (inflows, outflows, net cash flow, opening and closing balances), interpreting a forecast. 1.3.4 Sources of finance (overdraft, loan).", adv: "Pearson Edexcel A level Business (9BS0) 2.1.4 Planning (cash-flow forecasts); 2.1.2 External finance (overdraft, loans, debt factoring); 2.3.2 Liquidity: ways to improve cash flow, working capital; 2.3.3 Business failure (cash-flow problems)." } },
  missions: [
    { title: "Read the forecast", q: "Look down a column of the table. Check that net cash flow = inflows − outflows and closing = opening + net cash flow.", hint: "Each month's closing balance becomes the next month's opening balance. Negative numbers are shown with a minus sign: the business is overdrawn.", setup() { set({}); ui.setPlaying(false); } },
    { title: "When is cash tightest?", q: "The garden-furniture maker sells most in May. Why is its cash lowest in April, not in winter?", hint: "It buys materials a month before it sells, and its customers pay 60 days after buying. Cash goes out for the spring rush long before it comes back in: the classic seasonal squeeze.", setup() { set({}); } },
    { title: "Give less credit", q: "Cut the credit customers get from 60 days to 30. What happens to the lowest balance?", hint: "Cash from credit sales arrives a month sooner, so the overdraft needed falls sharply. But customers may go to a rival who offers longer credit.", setup() { set({ custDays: 30 }); } },
    { title: "Profitable but broke", q: "Toy shop with a big Christmas: is it profitable for the year? Does it stay inside its overdraft?", hint: "Profit for the year can be healthy while cash runs out in autumn: stock is bought 2 months ahead and paid for before the Christmas sales arrive. Many firms fail like this.", setup() { set({ biz: "toys", od: 5000 }); } },
    { title: "Forecast against actual", q: "Let the year run with uncertain sales and some late payers. How far does the actual closing balance drift from the forecast?", hint: "Small monthly differences add up: closing balances carry every earlier error forward. That is why forecasts are updated (variance analysis).", setup() { set({ cv: 0.25, late: 0.2 }); } },
    { title: "Take out a loan", q: "Instead of a bigger overdraft, take a £15,000 loan in January. Does it help? What does it cost?", hint: "A lump of cash at the start keeps the balance positive, but repayments (with interest) are a new outflow every month for two years.", setup() { set({ loan: 15000 }); } },
    { lvl: "adv", title: "Debt factoring", q: "Switch on factoring at a 4% fee. Compare the lowest balance and the year's profit with and without it.", hint: "The factor pays for credit sales straight away, so the cash squeeze disappears, but 4% of credit sales is lost as a fee: better liquidity, lower profit.", setup() { set({ factor: true }); } },
    { lvl: "adv", title: "Bad debts", q: "Set bad debts to 5%. Which suffers more, profit or cash?", hint: "Both: a customer who never pays is a lost sale (written off, lowering profit) and lost cash. For a firm already near its overdraft limit, it can be the last straw.", setup() { set({ bad: 0.05 }); } }
  ],
  batch: [
    { title: "Lowest balance in an uncertain year", question: "Sales vary ±15% a month and 10% of customers pay a month late. How low does the garden firm's balance go?", how: "Garden furniture with the default settings; one year per run.", yLabel: "lowest closing balance (£)", reps: 300, bins: 24, theory: year(Object.assign({}, DEF, BIZ.garden, { biz: "garden" }), null).low, theoryLabel: "forecast", run: (x, r) => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden" }), r).low, note: "Most actual years land near the forecast, but late payers pull the low point down (a systematic shift), and a bad spring takes it much lower. A sensible overdraft limit allows for the worst likely year, not the forecast." },
    { title: "Credit terms for customers", question: "How does the lowest balance depend on how long customers are given to pay?", how: "Garden furniture; forecast (no uncertainty) and actual years (±15% sales, 10% late).", xLabel: "customer credit (days)", yLabel: "lowest closing balance (£)", xs: [0, 30, 60, 90], reps: 20, theory: d => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden", custDays: d }), null).low, theoryLabel: "forecast", run: (d, r) => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden", custDays: d }), r).low, note: "Each extra month of credit holds back a whole month of credit sales. The cash isn't lost, just late, but the business needs a bigger overdraft to wait for it." },
    { title: "Credit from suppliers", question: "How does the lowest balance depend on how long suppliers let the business take to pay?", how: "Toy shop (materials are 55% of sales, bought 2 months ahead); forecast and actual years.", xLabel: "supplier credit (days)", yLabel: "lowest closing balance (£)", xs: [0, 30, 60, 90], reps: 20, theory: d => year(Object.assign({}, DEF, BIZ.toys, { biz: "toys", supDays: d }), null).low, theoryLabel: "forecast", run: (d, r) => year(Object.assign({}, DEF, BIZ.toys, { biz: "toys", supDays: d }), r).low, note: "Trade credit is a free source of short-term finance: paying suppliers later keeps cash in the business for longer. But look at 90 days: last Christmas's stock is still being paid for in January, when sales are low. Timing matters, not just length." },
    { title: "Seasonality and the overdraft", question: "How does the lowest balance depend on how seasonal sales are?", how: "Garden furniture; seasonal swing from 0 (flat sales) to 1.5× the usual pattern. Same total sales in a year.", xLabel: "seasonal swing", yLabel: "lowest closing balance (£)", xs: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5], reps: 20, theory: k => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden", season: k }), null).low, theoryLabel: "forecast", run: (k, r) => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden", season: k }), r).low, note: "Same annual sales, very different cash needs: the more seasonal the business, the deeper the trough before the busy season pays out." },
    { title: "Factoring: cash against profit (A level)", question: "How does a factoring fee change the year's profit?", how: "Garden furniture with factoring on; uncertain sales.", xLabel: "factoring fee (%)", yLabel: "profit for the year (£)", xs: [0, 2, 4, 6, 8, 10], reps: 20, theory: f => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden", factor: true, fee: f / 100 }), null).profit, theoryLabel: "forecast", run: (f, r) => year(Object.assign({}, DEF, BIZ.garden, { biz: "garden", factor: true, fee: f / 100 }), r).profit, note: "Profit falls by the fee × credit sales (60% of £240k a year): about £1,440 per percentage point. Factoring buys liquidity with profit." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1BS0 1.3.3", text: "Cash is the money a business can spend now; profit is revenue minus costs over a period. A sale on credit adds to profit now but to cash only when the customer pays." },
      { lvl: "std", tag: "1BS0 1.3.3", text: "Net cash flow = total inflows − total outflows. Closing balance = opening balance + net cash flow; it becomes next month's opening balance." },
      { lvl: "std", tag: "1BS0 1.3.3", text: "A forecast warns of cash shortages early so the business can arrange an overdraft, delay spending or chase debtors. It is only an estimate: sales and payment dates are uncertain." },
      { lvl: "std", tag: "1BS0 1.3.4", text: "An overdraft is flexible short-term finance for temporary shortages; interest is charged only on what is used. A loan suits a one-off need and is repaid with interest over years." },
      { lvl: "adv", tag: "9BS0 2.3.2", text: "Improve cash flow by: shorter credit for customers, longer credit from suppliers, cutting stock, delaying spending, sale and leaseback, factoring. Each has a cost (lost customers, supplier goodwill, fees)." },
      { lvl: "adv", tag: "9BS0 2.1.2", text: "Debt factoring: a factor pays most of the value of invoices immediately and collects the debts, for a fee. It improves liquidity but reduces profit." },
      { lvl: "adv", tag: "9BS0 2.3.3", text: "Insolvency comes from running out of cash, not from losses alone. Overtrading (growing faster than working capital allows) is a common cause." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `In ${MON[F.lowM]} the forecast opening balance is ${gbp(F.open[F.lowM])} and net cash flow is ${gbp(F.net[F.lowM])}. Calculate the closing balance.`, ans: () => `<ul><li>${gbp(F.open[F.lowM])} + (${gbp(F.net[F.lowM])})</li><li>= ${gbp(F.close[F.lowM])}</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain why a business can make a profit but still have cash-flow problems.", ans: "<ul><li>Sales on credit count towards profit before the cash is received (1).</li><li>Stock/materials and equipment are paid for before the goods are sold (1).</li><li>So outflows can come before inflows and the bank balance can fall below zero even though revenue exceeds costs over the year (1).</li></ul>" },
      { lvl: "std", marks: 4, q: "The garden-furniture firm will be overdrawn in spring. Explain two ways it could improve its cash flow.", ans: "<ul><li>Ask customers to pay within 30 days (1): cash arrives sooner, reducing the overdraft needed (1).</li><li>Negotiate longer credit from suppliers (1): materials paid for after the spring sales come in (1). Also: delay buying equipment, lease instead of buy, arrange an overdraft.</li></ul>" },
      { lvl: "adv", marks: 8, q: "Assess whether debt factoring is the best way for the garden-furniture firm to solve its seasonal cash-flow problem.", ans: "<ul><li>Knowledge: factoring advances the value of invoices for a fee; alternatives overdraft, loan, credit terms.</li><li>Application: 60% of sales on 60-day credit; trough in spring; fee of a few % of credit sales.</li><li>Analysis: removes the timing gap entirely, so no overdraft interest; but fee cuts profit every month, not just in spring; customers may dislike dealing with a factor.</li><li>Evaluation: a seasonal, temporary shortage might be cheaper to cover with an overdraft; factoring better if growth makes the gap permanent. Justified judgement.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Forecast sales each month = average month × (1 + seasonal swing × (pattern − 1)) × growth. Actual sales = forecast × (1 + uncertainty × a random normal number).</li>
<li>Cash sales arrive in the month of sale. Credit sales arrive after the customer credit period (30 days = one month later); a fraction arrive a month late, and bad debts never arrive. With factoring, credit sales arrive at once, minus the fee.</li>
<li>Materials are bought a set number of months before the sales they are for (lead time) and paid for after the supplier credit period. Wages and rent are paid each month; equipment is bought in January. A loan arrives in January and is repaid with 5% interest over 24 months. Overdraft interest is charged on a negative balance.</li>
<li>Profit for the year = sales − materials used − wages − rent − depreciation (equipment over 5 years) − interest and fees − bad debts.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Credit periods are rounded to whole months; every customer on credit takes the same time to pay (except the late fraction).</li><li>Credit sales from last year are paid in January and February as forecast; debts still owed at the end of the year are not shown.</li><li>No VAT, corporation tax, drawings or dividends; wages and rent never change.</li><li>Figures are illustrative.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The business");
ctl.biz = K.seg(g, { value: "garden", options: Object.entries(BIZ).map(([k, b]) => [k, b.name]), on: v => set({ biz: v }) });
ctl.open = K.slider(g, { label: "Opening bank balance (1 January)", min: -10000, max: 40000, step: 500, value: 8000, fmt: gbp, on: v => upd({ open: v }) });
ctl.od = K.slider(g, { label: "Overdraft limit", min: 0, max: 50000, step: 1000, value: 15000, fmt: gbp, on: v => upd({ od: v }) });
ctl.wages = K.slider(g, { label: "Wages per month", min: 0, max: 15000, step: 250, value: 6500, fmt: gbp, on: v => upd({ wages: v }) });
ctl.capex = K.slider(g, { label: "Equipment bought in January", min: 0, max: 40000, step: 1000, value: 12000, fmt: gbp, on: v => upd({ capex: v }) });
ctl.loan = K.slider(g, { label: "Bank loan in January (repaid over 2 years)", min: 0, max: 40000, step: 1000, value: 0, fmt: v => v ? gbp(v) : "none", on: v => upd({ loan: v }) });
g = ui.group("Sales and credit");
ctl.season = K.slider(g, { label: "Seasonal swing", min: 0, max: 1.5, step: 0.05, value: 1, fmt: v => v ? v.toFixed(2) + "× the usual pattern" : "flat all year", on: v => upd({ season: v }) });
ctl.growth = K.slider(g, { label: "Sales growth over the year", min: -0.3, max: 0.6, step: 0.05, value: 0, fmt: v => (v > 0 ? "+" : "") + Math.round(v * 100) + "%", on: v => upd({ growth: v }) });
ctl.credit = K.slider(g, { label: "Sales made on credit", min: 0, max: 1, step: 0.05, value: 0.6, fmt: v => Math.round(v * 100) + "%", on: v => upd({ credit: v }) });
ctl.custDays = K.seg(g, { label: "Credit given to customers", value: 60, options: [[0, "0 days"], [30, "30"], [60, "60"], [90, "90"]], on: v => upd({ custDays: +v }) });
ctl.supDays = K.seg(g, { label: "Credit from suppliers", value: 30, options: [[0, "0 days"], [30, "30"], [60, "60"], [90, "90"]], on: v => upd({ supDays: +v }) });
g = ui.group("Reality: the actual year");
ctl.cv = K.slider(g, { label: "Uncertainty in monthly sales (SD)", min: 0, max: 0.5, step: 0.01, value: 0.15, fmt: v => "±" + Math.round(v * 100) + "%", on: v => upd({ cv: v }, true) });
ctl.late = K.slider(g, { label: "Credit customers who pay a month late", min: 0, max: 0.6, step: 0.05, value: 0.1, fmt: v => Math.round(v * 100) + "%", on: v => upd({ late: v }, true) });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
let rr = K.row(g); K.btn(rr, "⏭ Run a new year", () => newYear(), "primary");
g = ui.group("A level");
ctl.factor = K.toggle(g, { label: "Debt factoring (paid at once, minus a fee)", value: false, on: v => upd({ factor: v }) });
ctl.fee = K.slider(g, { label: "Factoring fee", min: 0, max: 0.1, step: 0.005, value: 0.04, fmt: v => (v * 100).toFixed(1) + "% of credit sales", on: v => upd({ fee: v }) });
ctl.bad = K.slider(g, { label: "Bad debts (never paid)", min: 0, max: 0.15, step: 0.01, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => upd({ bad: v }, true) });
ctl.odRate = K.slider(g, { label: "Overdraft interest rate (a year)", min: 0, max: 0.25, step: 0.01, value: 0.12, fmt: v => Math.round(v * 100) + "%", on: v => upd({ odRate: v }) });
const read = K.readout(ui.group("The year"), [["low", "lowest forecast balance"], ["od", "months past the overdraft limit"], ["profit", "forecast profit for the year"], ["endc", "forecast cash on 31 December"], ["alow", "actual lowest so far"], ["years", "years run / past the limit"]]);
function set(o) {
  const b = BIZ[o.biz || DEF.biz]; Object.assign(P, DEF, { credit: b.credit, custDays: b.custDays, supDays: b.supDays, open: b.open, od: b.od, wages: b.wages, capex: b.capex }, o);
  for (const k of ["biz", "open", "od", "wages", "capex", "loan", "season", "growth", "credit", "custDays", "supDays", "cv", "late", "speed", "factor", "fee", "bad", "odRate"]) ctl[k].set(P[k]);
  history = []; yearNo = 0; recalc(); newYear();
}
function upd(o, actualOnly) { Object.assign(P, o); recalc(); if (!actualOnly) { history = []; } newYear(); }
function recalc() { F = year(P, null); }
function newYear() { A = year(P, rnd); mNow = 0; mt = 0; yearNo++; }
// ---------------- Simulation: the months of the actual year are revealed one at a time ----------------
let wait = 0;
function tick(dt) {
  if (mNow >= 12) { wait += dt * P.speed; if (wait > 2) newYear(); return; }   // pause on the finished year, then start another
  mt += dt * P.speed / 1.6; if (mt >= 1) { mt = 0; mNow++; if (mNow >= 12) { wait = 0; history.push([yearNo, A.low, A.breach > 0]); if (history.length > 40) history.shift(); } }
}

// ---------------- Drawing: the forecast table and the balance bars ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (!F) return;
  const lw = 168, x0 = 16, cw = (w - lw - x0 - 16) / 12, rows = [["Cash sales", "cashSales", 1], ["Credit sales paid", "debtors", 1], ["Loans / capital", "loan", 1], ["Total inflows", "inT", 2], ["Materials", "mats", -1], ["Wages", "wages", -1], ["Rent", "rent", -1], ["Equipment, loan, interest", "other", -1], ["Total outflows", "outT", -2], ["Net cash flow", "net", 3], ["Opening balance", "open", 3], ["Closing balance", "close", 4]];
  const T = 70, rh = Math.min(19, (h * 0.55 - T) / 13);
  TX(c, `${BIZ[P.biz].name}: cash-flow forecast for the year (£)`, x0, 24, "#eef2f8", "left", "600 14px");
  TX(c, "red = overdrawn · the actual year runs below, month by month", x0, 42, "#8fa0bf", "left", "11.5px");
  MON.forEach((mn, i) => { const x = x0 + lw + i * cw; if (i === Math.min(mNow, 11) && mNow < 12) { c.fillStyle = "rgba(90,209,255,0.10)"; c.fillRect(x, T - 15, cw, rh * 13 + 4); } TX(c, mn, x + cw - 6, T, "#cfd8ea", "right", "600 12px"); });
  rows.forEach(([lab, k, kind], j) => {
    const y = T + (j + 1) * rh; if (kind === 2 || kind === -2 || kind === 4) { c.fillStyle = "#151d33"; c.fillRect(x0, y - rh + 4, w - 2 * x0, rh); }
    TX(c, lab, x0 + 4, y, kind === 4 ? "#eef2f8" : "#aab6cc", "left", (Math.abs(kind) >= 2 ? "600 " : "") + "11.5px");
    for (let m = 0; m < 12; m++) { const v = F[k][m], col = (k === "close" || k === "open" || k === "net") && v < 0 ? (k !== "net" && v < -P.od ? "#ff5c5c" : "#ff8a70") : kind < 0 ? "#cfa58f" : "#cfd8ea"; TX(c, Math.abs(v) < 0.5 ? "–" : gbpk(kind < 0 ? -v : v), x0 + lw + (m + 1) * cw - 6, y, col, "right", (kind === 4 ? "600 " : "") + "11.5px"); }
  });
  // balance bars: forecast (outline) and actual (filled) against the overdraft limit
  const bT = T + 14 * rh + 16, bB = h - 30, vals = F.close.concat(A ? A.close.slice(0, mNow) : [], [0, -P.od]), vmax = Math.max(...vals, 1000) * 1.1, vmin = Math.min(...vals) * 1.1 - 500;
  const Y = v => bT + (vmax - v) / (vmax - vmin) * (bB - bT);
  TX(c, "Closing balance: forecast (outline) and actual (solid)", x0, bT - 4, "#eef2f8", "left", "600 12.5px");
  c.strokeStyle = "#6c7894"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + lw, Y(0)); c.lineTo(w - 16, Y(0)); c.stroke(); TX(c, "£0", x0 + lw - 6, Y(0) + 4, "#8fa0bf", "right", "11px");
  c.strokeStyle = "#ff5c5c"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(x0 + lw, Y(-P.od)); c.lineTo(w - 16, Y(-P.od)); c.stroke(); c.setLineDash([]); TX(c, `overdraft limit ${gbp(-P.od)}`, x0 + lw - 6, Y(-P.od) + 4, "#ff5c5c", "right", "11px");
  for (let m = 0; m < 12; m++) {
    const x = x0 + lw + m * cw + cw * 0.18, bw = cw * 0.64, f = F.close[m];
    if (A && m < mNow) { const a = A.close[m]; c.fillStyle = a < -P.od ? "#ff5c5c" : a < 0 ? "#ff9a5a" : "#7ee787"; c.fillRect(x + 3, Math.min(Y(a), Y(0)), bw - 6, Math.abs(Y(a) - Y(0))); TX(c, gbpk(a), x + bw / 2, a >= 0 ? Y(a) - 4 : Y(a) + 13, "#eef2f8", "center", "10.5px"); }
    c.strokeStyle = "#cfd8ea"; c.lineWidth = 1.2; c.strokeRect(x, Math.min(Y(f), Y(0)), bw, Math.abs(Y(f) - Y(0)));
  }
  if (A && mNow >= 12) TX(c, A.breach ? `This year went past the overdraft limit in ${A.breach} month${A.breach > 1 ? "s" : ""}!` : "This year stayed inside the overdraft limit.", w - 16, bT - 4, A.breach ? "#ff5c5c" : "#7ee787", "right", "600 12.5px");
}

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.title = "Profit is not cash (forecast)"; chA.opts.xLabel = "month"; chA.opts.yLabel = "£";
  chA.draw([{ pts: F.cumProfit.map((v, m) => [m + 1, v]), color: "#c9a0ff", label: "profit so far" }, { pts: F.close.map((v, m) => [m + 1, v]), color: "#5ad1ff", label: "bank balance" }].concat(A && mNow ? [{ pts: A.close.slice(0, mNow).map((v, m) => [m + 1, v]), type: "dots", r: 4, color: "#7ee787", label: "actual" }] : []), { xMin: 0.5, xMax: 12.5, hlines: [{ y: 0, color: "#6c7894" }, { y: -P.od, color: "#ff5c5c", label: "overdraft limit" }], xFmt: v => MON[Math.round(v) - 1] || "" });
  chB.opts.title = "Lowest balance in each year run"; chB.opts.xLabel = "year"; chB.opts.yLabel = "lowest balance (£)";
  chB.draw([{ pts: history.filter(x => !x[2]).map(x => [x[0], x[1]]), type: "bars", w: 0.8, color: "#7ee787", label: "inside limit" }, { pts: history.filter(x => x[2]).map(x => [x[0], x[1]]), type: "bars", w: 0.8, color: "#ff5c5c", label: "past the limit" }], { xMin: Math.max(0, yearNo - 40) + 0.4, xMax: Math.max(10, yearNo) + 0.6, hlines: [{ y: F.low, color: "#cfd8ea", label: "forecast lowest" }, { y: -P.od, color: "#ff5c5c" }] });
  read.set("low", `${gbp(F.low)} (${MON[F.lowM]})`); read.set("od", F.breach ? `<span style="color:#ff5c5c">${F.breach}</span>` : "0"); read.set("profit", gbp(F.profit)); read.set("endc", gbp(F.close[11]));
  read.set("alow", A && mNow ? gbp(Math.min(...A.close.slice(0, mNow))) : "–"); read.set("years", `${history.length} / ${history.filter(x => x[2]).length}`);
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("The table is the forecast. Below it, the actual year happens one month at a time.", 7000);
