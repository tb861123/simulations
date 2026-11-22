/* =====================================================================
   BREAK-EVEN AND MARGINS
   A business has two kinds of cost:
     FIXED COSTS (FC) do not change with output: rent, salaries, insurance.
     VARIABLE COSTS (VC) rise with every unit made: materials, packaging.
   Each unit sold brings in its price P but costs VC to make, so it adds
        CONTRIBUTION per unit = P − VC
   towards paying the fixed costs. Once enough units have paid off all the
   fixed costs, every further unit's contribution is profit:
        BREAK-EVEN OUTPUT = FC ÷ (P − VC)
        PROFIT = total contribution − FC = (P − VC) × Q − FC
        MARGIN OF SAFETY = actual output − break-even output
   Raising the price raises the contribution (so break-even falls) but
   customers buy less: how much less depends on the PRICE ELASTICITY OF
   DEMAND (PED). Here demand is Q = Q₀ (P/P₀)^(−PED).
   Sales in a real month are uncertain, so the sim draws each month's
   sales at random around the expected demand.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const gbp = (v, dp = 0) => (v < 0 ? "−£" : "£") + Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };

// ---------------- The businesses (illustrative figures per month) ----------------
const BIZ = {
  coffee: { name: "Coffee cart", unit: "cups", FC: 3000, VC: 0.9, P: 3.2, P0: 3.2, Q0: 1800, PED: 1.4, cap: 2600, FC2: 1500, pmax: 8, step: 0.05 },
  cases: { name: "Phone-case maker", unit: "cases", FC: 8000, VC: 4.5, P: 15, P0: 15, Q0: 1100, PED: 1.8, cap: 1500, FC2: 4000, pmax: 40, step: 0.5 },
  tees: { name: "T-shirt printer", unit: "T-shirts", FC: 2000, VC: 6, P: 18, P0: 18, Q0: 260, PED: 0.8, cap: 400, FC2: 900, pmax: 45, step: 0.5 }
};
// expected demand at price p for business b (constant-elasticity demand curve)
const demand = (b, p, ped) => b.Q0 * Math.pow(p / b.P0, -ped);
// total cost at output q: fixed + variable, plus a second site's fixed cost if output goes past capacity (a stepped fixed cost)
const cost = (q, o) => o.FC + o.VC * q + (o.second && q > o.cap ? o.FC2 : 0);
const capacity = o => o.second ? o.cap * 2 : o.cap;
const beOut = o => { // break-even output(s): where revenue meets total cost; may be none, one or two with a stepped cost
  const c = o.P - o.VC; if (c <= 0) return [];
  const q1 = o.FC / c, out = [];
  if (q1 <= o.cap || !o.second) out.push(q1);
  if (o.second) { const q2 = (o.FC + o.FC2) / c; if (q2 > o.cap && q2 <= capacity(o)) out.push(Math.max(q2, o.cap)); }
  return out;
};
const sold = o => Math.min(demand(BIZ[o.biz], o.P, o.PED), capacity(o));     // what we expect to sell (can't sell more than we can make)
const profitAt = (o, q) => o.P * q - cost(q, o);

// ---------------- The page ----------------
const DEF = { biz: "coffee", target: 0, cv: 0.15, second: false, speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), month = 0, mt = 0, thisQ = 0, hist = [];
const ui = K.app({
  title: "Break-even and Margins", subject: "Business",
  blurb: "Fixed and variable costs, contribution, break-even charts, margin of safety and what a price change really does to profit",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Business (Pearson Edexcel 1BS0) 1.3.2 Business revenues, costs and profits: fixed and variable costs, total cost, revenue, profit and loss, interest; break-even level of output, margin of safety, interpreting break-even diagrams.", adv: "Pearson Edexcel A level Business (9BS0) 2.2.2 Sales, revenue and costs; 2.2.3 Break-even: contribution per unit, break-even output, margin of safety, limitations of break-even; 1.2.4 Price elasticity of demand; 2.4.2 Capacity utilisation." } },
  missions: [
    { title: "Find the break-even point", q: "Read the break-even chart. How many cups must the coffee cart sell each month before it stops making a loss?", hint: "Where the total revenue line crosses the total cost line: FC ÷ (P − VC) = £3,000 ÷ £2.30 = 1,305 cups. Below it the gap between the lines is a loss; above it, a profit.", setup() { set({}); } },
    { title: "Every unit makes a contribution", q: "Watch the units fill up in a month. What do the first orange units pay for? What are the green ones?", hint: "Each cup adds £3.20 − £0.90 = £2.30 contribution. The first 1,305 cups' contributions pay the rent and wages (fixed costs); only after that is the contribution profit.", setup() { set({ speed: 0.5 }); } },
    { title: "Margin of safety", q: "How far could sales fall before the cart makes a loss? Give it in cups and as a percentage of sales.", hint: "Margin of safety = expected sales − break-even = 1,800 − 1,305 = 495 cups, 27.5% of sales. A bigger margin of safety means a bad month is less likely to bring a loss.", setup() { set({}); } },
    { title: "Cut the fixed costs", q: "Move to a cheaper pitch: fixed costs £2,400. What happens to the break-even point and the margin of safety?", hint: "Break-even falls to 2,400 ÷ 2.30 = 1,043 cups; the margin of safety rises to 757 cups (42%). The TC line moves down, parallel to before.", setup() { set({ FC: 2400 }); } },
    { title: "Put the price up", q: "Raise the price from £3.20 to £3.60. Break-even falls, but does profit rise?", hint: "Contribution rises to £2.70 so break-even falls to 1,111 cups. But with PED 1.4, sales fall about 15%, to 1,526, so profit actually falls slightly (£1,140 to £1,120). Check the profit-against-price graph: the best price is where its curve peaks.", setup() { set({ P: 3.6 }); } },
    { title: "A risky month", q: "Make sales very uncertain (±40%). Run a year. How many months make a loss? Why does the margin of safety matter?", hint: "With a margin of safety of 27% and sales varying by 40%, roughly a quarter of months fall below break-even: Φ(−27.5/40) ≈ 25%.", setup() { set({ cv: 0.4 }); } },
    { lvl: "adv", title: "Elastic or inelastic?", q: "Choose the T-shirt printer (PED 0.8). Does a price rise raise or lower revenue? Compare it with the phone cases (PED 1.8).", hint: "Inelastic demand (PED < 1): a price rise loses relatively few sales, so revenue AND profit rise. Elastic demand (PED > 1): revenue falls. The profit-maximising price with constant PED > 1 is P* = VC × PED ÷ (PED − 1).", setup() { set({ biz: "tees" }); } },
    { lvl: "adv", title: "Running out of capacity", q: "Coffee cart at £2.20: demand outstrips the cart's 2,600 cups. Open a second cart. Why are there now two break-even points?", hint: "The second cart is a stepped fixed cost: total cost jumps by £1,500 at 2,600 cups. Just above the step the business is back in loss until enough extra cups are sold.", setup() { set({ P: 2.2, second: true }); } },
    { lvl: "adv", title: "Target profit", q: "Set a target profit of £2,000 a month for the phone cases. How many must be sold?", hint: "Output for a target profit = (FC + target) ÷ contribution = (8,000 + 2,000) ÷ 10.50 = 953 cases.", setup() { set({ biz: "cases", target: 2000 }); } }
  ],
  batch: [
    { title: "A year of uncertain months", question: "Sales vary by ±15% each month. What is the spread of monthly profit for the coffee cart?", how: "Coffee cart at £3.20 (expected 1,800 cups, SD 15%); one month per run.", yLabel: "monthly profit (£)", reps: 400, bins: 24, theory: 2.3 * 1800 - 3000, theoryLabel: "expected profit", run: (x, r) => { const q = Math.max(0, 1800 * (1 + 0.15 * r.gauss())); return 2.3 * q - 3000; }, note: "The mean is close to (P − VC) × expected sales − FC = £1,140. Each extra cup adds £2.30, so profit swings £2.30 × 270 = £621 for a one-SD change in sales: profit is far more volatile (in %) than sales because fixed costs don't move." },
    { title: "Margin of safety and the risk of loss", question: "How does the chance of a loss-making month depend on the margin of safety?", how: "Sales vary by ±20% (SD). Each run is a year; the result is the % of its 12 months below break-even.", xLabel: "margin of safety (% of sales)", yLabel: "loss-making months (%)", xs: [0, 5, 10, 15, 20, 30, 40], reps: 30, yMin: 0, theory: m => 100 * Phi(-m / 20), theoryLabel: "100 Φ(−MoS ÷ 20%)", run: (m, r) => { let n = 0; for (let i = 0; i < 12; i++) if (1 + 0.2 * r.gauss() < 1 - m / 100) n++; return 100 * n / 12; }, note: "With no margin of safety, half of all months lose money. Each extra 20% of margin (one SD of sales) cuts the risk sharply: 50% → 16% → 2%." },
    { title: "Break-even and price", question: "How does break-even output change as the coffee cart's price rises?", how: "FC £3,000; the variable cost per cup varies ±5% between suppliers.", xLabel: "price (£)", yLabel: "break-even output (cups)", xs: [1.5, 2, 2.5, 3, 3.5, 4, 5, 6], reps: 6, yMin: 0, theory: p => 3000 / (p - 0.9), theoryLabel: "FC ÷ (P − VC)", run: (p, r) => 3000 / (p - 0.9 * (1 + 0.05 * r.gauss())), note: "A curve, not a straight line: break-even falls steeply as price climbs above the variable cost, then flattens out. Near P = VC a tiny change in costs makes a huge change in break-even." },
    { title: "Which price makes the most profit?", question: "Customers buy fewer cups at a higher price (PED 1.4). Which price gives the most profit?", how: "Coffee cart; expected demand 1,800 × (P/3.20)^−1.4, monthly sales ±15%; capacity 2,600 cups.", xLabel: "price (£)", yLabel: "monthly profit (£)", xs: [2, 2.5, 3, 3.2, 3.5, 4, 5, 6], reps: 40, theory: p => { const q = Math.min(2600, 1800 * Math.pow(p / 3.2, -1.4)); return (p - 0.9) * q - 3000; }, theoryLabel: "(P − VC)Q(P) − FC", run: (p, r) => { const q = Math.min(2600, Math.max(0, 1800 * Math.pow(p / 3.2, -1.4) * (1 + 0.15 * r.gauss()))); return (p - 0.9) * q - 3000; }, note: "Profit peaks at P* = VC × PED/(PED − 1) = 0.90 × 1.4/0.4 = £3.15, close to the current price. Too cheap and each cup contributes little; too dear and nobody buys. Break-even alone can't find this." },
    { title: "Price rise of 10%: what happens to revenue? (A level)", question: "How does the change in revenue after a 10% price rise depend on the price elasticity of demand?", how: "Revenue before and after, with ±3% noise in each month's sales.", xLabel: "PED (size)", yLabel: "change in revenue (%)", xs: [0.2, 0.5, 0.8, 1, 1.2, 1.5, 2, 3], reps: 8, theory: e => 100 * (Math.pow(1.1, 1 - e) - 1), theoryLabel: "1.1^(1−PED) − 1", run: (e, r) => { const q0 = 1000 * (1 + 0.03 * r.gauss()), q1 = 1000 * Math.pow(1.1, -e) * (1 + 0.03 * r.gauss()); return 100 * (1.1 * q1 / q0 - 1); }, note: "Inelastic (PED < 1): revenue rises. Unit elastic (PED = 1): unchanged. Elastic (PED > 1): revenue falls. Note the noise: real sales data never show the effect this cleanly." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1BS0 1.3.2", text: "Fixed costs stay the same whatever the output (rent, salaries); variable costs rise with output (materials). Total cost = FC + VC × Q. Revenue = P × Q. Profit = revenue − total cost." },
      { lvl: "std", tag: "1BS0 1.3.2", text: "Break-even output = fixed costs ÷ (price − variable cost per unit). On a break-even chart it is where the total revenue and total cost lines cross." },
      { lvl: "std", tag: "1BS0 1.3.2", text: "Margin of safety = actual (or expected) sales − break-even sales. The bigger it is, the further sales can fall before the business makes a loss." },
      { lvl: "adv", tag: "9BS0 2.2.3", text: "Contribution per unit = P − VC; total contribution = (P − VC) × Q; profit = total contribution − FC. Output for a target profit = (FC + target) ÷ contribution per unit." },
      { lvl: "adv", tag: "9BS0 2.2.3", text: "Limitations: assumes all output is sold at one price, costs are straight lines (no bulk discounts), fixed costs don't step up, and a single product. It is a forecast, only as good as its data." },
      { lvl: "adv", tag: "9BS0 1.2.4", text: "PED = %ΔQd ÷ %ΔP. If |PED| > 1 (elastic) a price rise cuts revenue; if < 1 (inelastic) it raises revenue. A price change moves sales as well as break-even, so look at profit, not just break-even." },
      { lvl: "adv", tag: "9BS0 2.4.2", text: "Capacity utilisation = actual output ÷ maximum possible output × 100. Expanding capacity adds a stepped fixed cost, which can create a second break-even point." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `The ${BIZ[P.biz].name.toLowerCase()} has fixed costs of ${gbp(P.FC)} a month, sells at ${gbp(P.P, 2)} and has variable costs of ${gbp(P.VC, 2)} per unit. Calculate the break-even output.`, ans: () => `<ul><li>Contribution = ${gbp(P.P, 2)} − ${gbp(P.VC, 2)} = ${gbp(P.P - P.VC, 2)}</li><li>Break-even = ${gbp(P.FC)} ÷ ${gbp(P.P - P.VC, 2)} = ${Math.ceil(P.FC / (P.P - P.VC)).toLocaleString()} ${BIZ[P.biz].unit} (round up)</li></ul>` },
      { lvl: "std", marks: 2, q: () => `Expected sales are ${Math.round(sold(P)).toLocaleString()} ${BIZ[P.biz].unit}. Calculate the margin of safety.`, ans: () => `<ul><li>Margin of safety = ${Math.round(sold(P)).toLocaleString()} − ${Math.ceil(P.FC / (P.P - P.VC)).toLocaleString()}</li><li>= ${(Math.round(sold(P)) - Math.ceil(P.FC / (P.P - P.VC))).toLocaleString()} ${BIZ[P.biz].unit}</li></ul>` },
      { lvl: "std", marks: 4, q: "Explain one benefit and one limitation of a break-even chart for a new café.", ans: "<ul><li>Benefit: shows how many it must sell to avoid a loss, so the owner can judge whether the plan is realistic / persuade a bank (1 + 1 development).</li><li>Limitation: assumes every unit is sold at one price and costs are constant; real sales are uncertain and may need discounts (1 + 1 development).</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Calculate the output needed for a monthly profit of £2,000 (FC ${gbp(P.FC)}, P ${gbp(P.P, 2)}, VC ${gbp(P.VC, 2)}).`, ans: () => `<ul><li>Contribution per unit ${gbp(P.P - P.VC, 2)} (1)</li><li>(${gbp(P.FC)} + £2,000) ÷ ${gbp(P.P - P.VC, 2)} (1)</li><li>= ${Math.ceil((P.FC + 2000) / (P.P - P.VC)).toLocaleString()} ${BIZ[P.biz].unit} (1)</li></ul>` },
      { lvl: "adv", marks: 8, q: "The owner plans to raise the price by 10% to lower the break-even point. Assess whether this will increase profit.", ans: "<ul><li>Knowledge: contribution per unit rises, break-even output falls; PED decides the change in sales.</li><li>Application: use the business's numbers (contribution, break-even, margin of safety).</li><li>Analysis: if demand is price elastic, sales fall by more than 10%; total contribution may fall even though break-even is lower; margin of safety could shrink.</li><li>Evaluation: depends on PED estimate, competitors' reaction, brand loyalty, capacity; a judgement on balance (e.g. only if PED < about 1.4 here).</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Total cost TC = FC + VC × Q (+ a second site's fixed cost FC₂ once output passes capacity, if you open one). Revenue TR = P × Q. Profit = TR − TC. Break-even output = FC ÷ (P − VC).</li>
<li>Expected demand Q = Q₀ (P/P₀)^(−PED): a constant price elasticity. Sales can't exceed capacity. Each month's actual sales = expected × (1 + uncertainty × a random normal number).</li>
<li>Margin of safety = expected sales − break-even output (also as % of expected sales). Capacity utilisation = sales ÷ capacity.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>One product sold at a single price; everything made is sold (no stock).</li><li>Costs are straight lines: no bulk-buying discounts, overtime or wastage; fixed costs are truly fixed within the month.</li><li>Demand responds to price only (no competitors, seasons or advertising), with the same PED at every price.</li><li>Figures are illustrative, per month, and ignore tax and interest.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The business");
ctl.biz = K.seg(g, { value: "coffee", options: Object.entries(BIZ).map(([k, b]) => [k, b.name]), on: v => set({ biz: v }) });
ctl.P = K.slider(g, { label: "Price per unit P", min: 0.5, max: 8, step: 0.05, value: 3.2, fmt: v => gbp(v, 2), on: v => { P.P = v; } });
ctl.VC = K.slider(g, { label: "Variable cost per unit VC", min: 0.1, max: 6, step: 0.05, value: 0.9, fmt: v => gbp(v, 2), on: v => { P.VC = v; } });
ctl.FC = K.slider(g, { label: "Fixed costs FC (per month)", min: 0, max: 20000, step: 100, value: 3000, fmt: v => gbp(v), on: v => { P.FC = v; } });
g = ui.group("Customers");
ctl.PED = K.slider(g, { label: "Price elasticity of demand (size)", min: 0.2, max: 3, step: 0.1, value: 1.4, fmt: v => v.toFixed(1) + (v < 1 ? " (inelastic)" : v > 1 ? " (elastic)" : " (unit)"), on: v => { P.PED = v; } });
ctl.cv = K.slider(g, { label: "Uncertainty in monthly sales (SD)", min: 0, max: 0.5, step: 0.01, value: 0.15, fmt: v => "±" + Math.round(v * 100) + "%", on: v => { P.cv = v; } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
g = ui.group("A level");
ctl.target = K.slider(g, { label: "Target profit per month", min: 0, max: 10000, step: 100, value: 0, fmt: v => v ? gbp(v) : "none", on: v => P.target = v });
ctl.second = K.toggle(g, { label: "Open a second site when full (stepped fixed cost)", value: false, on: v => P.second = v });
let rr = K.row(g); K.btn(rr, "Clear the months", () => { hist = []; month = 0; mt = 0; });
const read = K.readout(ui.group("This business"), [["cont", "contribution per unit"], ["be", "break-even output"], ["exp", "expected sales"], ["mos", "margin of safety"], ["pr", "expected profit / month"], ["cap", "capacity used"], ["tg", "output for target profit"], ["yr", "months so far: loss / total"]]);
function set(o) {
  const b = BIZ[o.biz || DEF.biz]; Object.assign(P, DEF, { FC: b.FC, VC: b.VC, P: b.P, PED: b.PED, cap: b.cap, FC2: b.FC2 }, o);
  ctl.biz.set(P.biz); ctl.P.el.querySelector("input").max = b.pmax; ctl.P.el.querySelector("input").step = b.step; ctl.P.set(P.P);
  const vi = ctl.VC.el.querySelector("input"); vi.max = b.pmax * 0.75; vi.step = b.step; ctl.VC.set(P.VC); ctl.FC.set(P.FC); ctl.PED.set(P.PED); ctl.cv.set(P.cv); ctl.speed.set(P.speed); ctl.target.set(P.target); ctl.second.set(P.second);
  hist = []; month = 0; mt = 0; thisQ = 0; newMonth();
}
// ---------------- Simulation: one month every few seconds ----------------
let monthQ = 0;
function newMonth() { monthQ = Math.max(0, Math.min(capacity(P), demand(BIZ[P.biz], P.P, P.PED) * (1 + P.cv * rnd.gauss()))); mt = 0; thisQ = 0; }
function tick(dt) {
  mt += dt * P.speed / 4; thisQ = monthQ * Math.min(1, mt);
  if (mt >= 1.25) { month++; hist.push([month, profitAt(P, monthQ), monthQ]); if (hist.length > 36) hist.shift(); newMonth(); }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let drag = false, chartBox = null;
K.pointer(cv.el, {   // drag on the chart to set the price (the TR line pivots)
  down: p => { if (chartBox && p.x > chartBox.L && p.x < chartBox.R) { drag = true; dragTo(p); } }, drag: p => drag && dragTo(p), up: () => drag = false
});
function dragTo(p) { const { T, B, qmax, ymax } = chartBox, q = qmax * 0.9, y = (B - p.y) / (B - T) * ymax; const price = K.clamp(Math.round(y / q / BIZ[P.biz].step) * BIZ[P.biz].step, 0.5, BIZ[P.biz].pmax); ctl.P.set(price, true); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, b = BIZ[P.biz]; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const exp = sold(P), bes = beOut(P), cap = capacity(P);
  // --- the break-even chart (left) ---
  const L = 78, R = w * 0.6, T = 78, B = h - 46, qmax = Math.max(cap * 1.05, exp * 1.2, (bes[bes.length - 1] || 0) * 1.3, 10);
  const ymax = Math.max(P.P * qmax, cost(qmax, P)) * 1.08; chartBox = { L, R, T, B, qmax, ymax };
  const X = q => L + q / qmax * (R - L), Y = v => B - v / ymax * (B - T);
  c.strokeStyle = "#2a3550"; c.lineWidth = 1; c.font = "11px Segoe UI,sans-serif";
  const sq = nice(qmax / 5), sv = nice(ymax / 5);
  for (let q = 0; q <= qmax; q += sq) { c.beginPath(); c.moveTo(X(q), T); c.lineTo(X(q), B); c.stroke(); TX(c, Math.round(q).toLocaleString(), X(q), B + 15, "#8fa0bf", "center", "11px"); }
  for (let v = 0; v <= ymax; v += sv) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(R, Y(v)); c.stroke(); TX(c, gbp(v), L - 6, Y(v) + 4, "#8fa0bf", "right", "11px"); }
  TX(c, `output (${b.unit} per month)`, (L + R) / 2, B + 32, "#aab6cc", "center"); TX(c, "Break-even chart · drag up or down on it to change the price", L, T - 14, "#eef2f8", "left", "600 13px");
  // loss and profit regions between TR and TC
  const N = 200; for (let i = 0; i < N; i++) { const q0 = qmax * i / N, q1 = qmax * (i + 1) / N, pr = profitAt(P, (q0 + q1) / 2); c.fillStyle = pr >= 0 ? "rgba(126,231,135,0.16)" : "rgba(255,107,107,0.14)"; const a = Math.min(Y(P.P * q0), Y(cost(q0, P))), bb = Math.max(Y(P.P * q0), Y(cost(q0, P))); c.fillRect(X(q0), a, X(q1) - X(q0) + 1, bb - a); }
  const line = (pts, col, wd = 2.4, dash = []) => { c.strokeStyle = col; c.lineWidth = wd; c.setLineDash(dash); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); };
  line([[X(0), Y(P.FC)], [X(qmax), Y(P.FC)]], "#ffd166", 2, [6, 4]); TX(c, "fixed costs", X(qmax) - 4, Y(P.FC) - 6, "#ffd166", "right", "11.5px");
  const tc = []; for (let i = 0; i <= N; i++) { const q = qmax * i / N; tc.push([X(q), Y(cost(q, P))]); if (P.second && Math.abs(q - P.cap) < qmax / N) tc.push([X(P.cap), Y(cost(P.cap + 1e-6, P))]); }
  line(tc, "#ff8a70"); TX(c, "total cost", X(qmax) - 4, Y(cost(qmax, P)) + 16, "#ff8a70", "right", "600 12px");
  line([[X(0), Y(0)], [X(qmax), Y(P.P * qmax)]], "#5ad1ff"); TX(c, "total revenue", X(qmax * 0.97), Y(P.P * qmax * 0.97) - 8, "#5ad1ff", "right", "600 12px");
  c.strokeStyle = "#cfd8ea"; c.lineWidth = 1.2; c.strokeRect(L, T, R - L, B - T);
  // capacity, break-even and expected sales markers
  line([[X(cap), T], [X(cap), B]], "#6c7894", 1.2, [3, 3]); TX(c, "capacity", X(cap) - 4, T + 14, "#8fa0bf", "right", "11px");
  bes.forEach((q, i) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(X(q), Y(P.P * q), 5, 0, 6.3); c.fill(); line([[X(q), Y(P.P * q)], [X(q), B]], "#fff", 1, [2, 3]); TX(c, `break-even ${Math.round(q).toLocaleString()}`, X(q) + 7, Y(P.P * q) + (i ? 16 : -8), "#fff", "left", "600 12px"); });
  line([[X(exp), T + 20], [X(exp), B]], "#7ee787", 2); TX(c, `expected sales ${Math.round(exp).toLocaleString()}`, X(exp) + 5, T + 32, "#7ee787", "left", "600 12px");
  if (bes.length && exp > bes[0]) { const y = B - 14; line([[X(bes[0]), y], [X(exp), y]], "#c9a0ff", 2); TX(c, "margin of safety", (X(bes[0]) + X(exp)) / 2, y - 6, "#c9a0ff", "center", "600 11.5px"); }
  if (P.target && P.P > P.VC) { const q = (P.FC + P.target) / (P.P - P.VC); if (q < qmax) { line([[X(q), Y(P.P * q)], [X(q), B]], "#ffd166", 1.5, [5, 3]); TX(c, `target ${Math.round(q).toLocaleString()}`, X(q) + 4, Y(P.P * q) - 8, "#ffd166", "left", "11.5px"); } }
  // this month's sales so far: a dot moving along the output axis
  c.fillStyle = "#fff"; c.beginPath(); c.arc(X(thisQ), B, 5, 0, 6.3); c.fill();
  // --- the units grid (right): orange units pay the fixed costs, green units are profit ---
  const gx = R + 40, gw = w - gx - 24, gy = T + 4, cols = 25, per = Math.max(1, Math.ceil(Math.max(cap, exp * 1.3) / (cols * 20))), rows = Math.ceil(Math.max(cap, exp * 1.3) / per / cols), cs = Math.min(gw / cols, (h * 0.58) / rows);
  TX(c, `Month ${month + 1}: ${Math.round(thisQ).toLocaleString()} ${b.unit} sold so far (one square = ${per} ${b.unit})`, gx, T - 14, "#eef2f8", "left", "600 13px");
  const nNow = Math.floor(thisQ / per), nBE = bes.length ? bes[0] / per : Infinity;
  for (let i = 0; i < rows * cols; i++) { const x = gx + (i % cols) * cs, y = gy + Math.floor(i / cols) * cs; c.fillStyle = i < nNow ? (i < nBE ? "#ff9a5a" : "#7ee787") : (i * per < cap ? "#1a2238" : "#0f1526"); c.fillRect(x, y, cs - 1.5, cs - 1.5); }
  const gyB = gy + rows * cs + 22, mProfit = profitAt(P, thisQ), cont = (P.P - P.VC) * thisQ;
  TX(c, "■ paying off the fixed costs", gx, gyB, "#ff9a5a", "left", "12px"); TX(c, "■ profit", gx + 180, gyB, "#7ee787", "left", "12px");
  const rowsTxt = [["Revenue", P.P * thisQ], ["− variable costs", -P.VC * thisQ], ["= contribution", cont], ["− fixed costs", -(cost(thisQ, P) - P.VC * thisQ)], ["= profit so far", mProfit]];
  rowsTxt.forEach(([k, v], i) => { const y = gyB + 24 + i * 19; TX(c, k, gx, y, i === 4 ? "#eef2f8" : "#aab6cc", "left", (i === 4 ? "600 " : "") + "12.5px"); TX(c, gbp(v), gx + 230, y, v < 0 ? "#ff8a70" : "#7ee787", "right", "600 12.5px"); });
}

// ---------------- Charts and readings ----------------
function charts() {
  const b = BIZ[P.biz], adv = ui.level === "adv";
  // A: profit against price, with demand responding to price
  const pp = [], rp = []; for (let i = 1; i <= 80; i++) { const p = b.pmax * i / 80, q = Math.min(capacity(P), demand(b, p, P.PED)); pp.push([p, p * q - cost(q, P)]); rp.push([p, p * q]); }
  chA.opts.title = adv ? "Profit and revenue against price (demand responds)" : "Profit against price (demand responds)"; chA.opts.xLabel = "price (£)"; chA.opts.yLabel = "£ per month";
  const ser = [{ pts: pp, color: "#7ee787", label: "profit" }]; if (adv) ser.push({ pts: rp, color: "#5ad1ff", label: "revenue", dash: [5, 3] });
  ser.push({ pts: [[P.P, profitAt(P, sold(P))]], type: "dots", r: 6, color: "#fff", label: "now" });
  const vl = [{ x: P.VC, label: "P = VC", color: "#ff8a70" }]; if (adv && P.PED > 1) vl.push({ x: P.VC * P.PED / (P.PED - 1), label: "best price", color: "#ffd166", row: 1 });
  chA.draw(ser, { xMin: 0, xMax: b.pmax, hlines: [{ y: 0, color: "#6c7894" }], vlines: vl });
  // B: monthly profit history
  const pts = hist.map(([m, pr]) => [m, pr]), m = K.mean(pts.map(p => p[1]));
  chB.opts.title = "Profit in each month"; chB.opts.xLabel = "month"; chB.opts.yLabel = "profit (£)";
  chB.draw([{ pts, type: "bars", w: 0.8, color: "#c9a0ff", label: "monthly profit" }], { xMin: Math.max(0, month - 36) + 0.4, xMax: Math.max(12, month) + 0.6, hlines: pts.length ? [{ y: profitAt(P, sold(P)), color: "#7ee787", label: "expected" }, { y: 0, color: "#6c7894" }] : [{ y: 0, color: "#6c7894" }] });
  const exp = sold(P), bes = beOut(P), be = bes[0];
  read.set("cont", P.P > P.VC ? gbp(P.P - P.VC, 2) : "none (P ≤ VC!)"); read.set("be", bes.length ? bes.map(q => Math.round(q).toLocaleString()).join(" and ") + " " + b.unit : "never"); read.set("exp", Math.round(exp).toLocaleString() + " " + b.unit);
  read.set("mos", be != null ? `${Math.round(exp - be).toLocaleString()} (${((exp - be) / exp * 100).toFixed(1)}%)` : "–"); read.set("pr", gbp(profitAt(P, exp))); read.set("cap", (exp / capacity(P) * 100).toFixed(0) + "%");
  read.set("tg", P.target && P.P > P.VC ? Math.ceil((P.FC + P.target) / (P.P - P.VC)).toLocaleString() + " " + b.unit : "set a target"); read.set("yr", `${hist.filter(x => x[1] < 0).length} / ${hist.length}`);
  ui.hud("contribution = P − VC · break-even = FC ÷ (P − VC) · margin of safety = sales − break-even");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Each square is a cup sold this month: orange ones pay the fixed costs, green ones are profit. Drag on the chart to change the price.", 7000);
