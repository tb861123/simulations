/* =====================================================================
   INVESTMENT APPRAISAL AND DECISION TREES
   Should a business spend money now to earn more later? Three methods:
     PAYBACK: how long until the net cash inflows repay the cost.
        payback = years before + (cost still to recover ÷ next year's cash flow)
     AVERAGE RATE OF RETURN (ARR):
        ARR = average annual return ÷ initial cost × 100
        average annual return = (total net cash flows − cost) ÷ years
     NET PRESENT VALUE (NPV): £1 next year is worth less than £1 today
        (it could have earned interest, and the future is riskier), so
        each year's cash flow is DISCOUNTED:
        present value = cash flow × 1 ÷ (1 + r)ᵗ        NPV = Σ PV − cost
        NPV > 0 means the project earns more than the discount rate r.
   DECISION TREES compare options whose results are uncertain:
        EXPECTED MONETARY VALUE (EMV) = Σ (probability × outcome) − cost
   EMV is the AVERAGE result if the decision could be made many times;
   any single decision still has only one outcome. A risk-averse owner
   may prefer a lower EMV with less chance of disaster.
   ===================================================================== */
const gbp = v => (v < 0 ? "−£" : "£") + Math.abs(Math.round(v)).toLocaleString("en-GB");
const gbpk = v => Math.abs(v) < 1 ? "£0" : (v < 0 ? "−£" : "£") + (Math.abs(v) >= 9950 ? Math.round(Math.abs(v) / 1000) + "k" : (Math.abs(v) / 1000).toFixed(1) + "k");

// ---------------- Projects (illustrative) ----------------
const PROJ = {
  machine: { name: "New machine", cost: 80000, cf: [25000, 30000, 30000, 25000, 20000], resid: 5000 },
  shop: { name: "Second shop", cost: 150000, cf: [10000, 30000, 50000, 60000, 60000, 60000], resid: 0 },
  solar: { name: "Solar panels", cost: 40000, cf: new Array(15).fill(8000), resid: 0 },
  van: { name: "Delivery van", cost: 30000, cf: [14000, 12000, 9000, 6000], resid: 3000 }
};
// The three appraisal methods. cf = net cash inflows for years 1..n (the residual value is added to the last year).
function flows(p, scale = 1) { const cf = p.cf.map(v => v * scale); cf[cf.length - 1] += p.resid; return cf; }
function payback(cost, cf) { let cum = -cost; for (let i = 0; i < cf.length; i++) { if (cum + cf[i] >= 0) return i + (-cum) / cf[i]; cum += cf[i]; } return Infinity; }
const arr = (cost, cf) => ((cf.reduce((a, v) => a + v, 0) - cost) / cf.length) / cost * 100;
const df = (r, t) => 1 / Math.pow(1 + r, t);                                          // discount factor
const npv = (cost, cf, r) => cf.reduce((a, v, i) => a + v * df(r, i + 1), 0) - cost;
function irr(cost, cf) { let lo = -0.9, hi = 2; if (npv(cost, cf, lo) * npv(cost, cf, hi) > 0) return NaN; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (npv(cost, cf, m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; }
const pbTxt = y => isFinite(y) ? `${Math.floor(y)} yr ${Math.round((y - Math.floor(y)) * 12)} mo` : "never";

// ---------------- Decision tree: two options with chance outcomes, plus doing nothing ----------------
const DEF = { view: "invest", proj: "machine", cmp: "none", cost: 80000, scale: 1, r: 0.08, cv: 0.2, speed: 1,
  aCost: 50000, aP: 0.6, aHi: 200000, aLo: 30000, bCost: 20000, bP: 0.7, bHi: 90000, bLo: 30000, riskR: 0 };
const P = {};
const emvA = o => o.aP * o.aHi + (1 - o.aP) * o.aLo - o.aCost, emvB = o => o.bP * o.bHi + (1 - o.bP) * o.bLo - o.bCost;
// risk attitude (A level, beyond the spec's EMV): a risk-averse owner values a gamble at its certainty equivalent, using utility U(x) = 1 − e^(−x/R)
const ce = (p, hi, lo, cost, R) => { if (!R) return p * hi + (1 - p) * lo - cost; const U = x => 1 - Math.exp(-x / R), Ui = u => -R * Math.log(1 - u); return Ui(p * U(hi - cost) + (1 - p) * U(lo - cost)); };
let rnd = K.rng(Date.now() % 9973 + 3), futures = [], tA = [], tB = [], plays = 0, tt = 0, lastA = null, lastB = null;

const ui = K.app({
  title: "Investment Appraisal and Decision Trees", subject: "Business",
  blurb: "Payback, average rate of return and net present value for real-looking projects, with risk; decision trees and expected monetary value",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE / AS)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel A level Business (9BS0) 3.3.2 Investment appraisal (first year): payback and average rate of return; GCSE Business (1BS0) uses the same ideas of cost, return and risk.", adv: "Pearson Edexcel A level Business (9BS0) 3.3.2 Investment appraisal: payback, ARR, NPV with discount factors, limitations, risk and uncertainty; 3.3.3 Decision trees: EMV, decision and chance nodes, value and limitations. Internal rate of return and risk utility are beyond the spec." } },
  missions: [
    { title: "How long to pay back?", q: "The new machine costs £80,000. Read the cumulative cash-flow chart: when does the line cross zero?", hint: "After 2 years £55,000 is back; the remaining £25,000 comes from year 3's £30,000: 25/30 of a year = 10 months. Payback = 2 years 10 months.", setup() { set({}); } },
    { title: "Average rate of return", q: "Work out the ARR for the machine. Is it better than leaving £80,000 in a bank at 4%?", hint: "Total inflows £135,000 (with £5,000 resale) − £80,000 cost = £55,000 over 5 years = £11,000 a year. ARR = 11,000 ÷ 80,000 = 13.75%.", setup() { set({}); } },
    { title: "Quick payback or more profit?", q: "Compare the delivery van with the solar panels. Which pays back faster? Which earns more overall?", hint: "The van pays back in 2 years 5 months, the panels in 5 years. But the panels go on earning for 15 years: ARR 13.3% against 11.7%, and (A level) NPV £28,500 against £7,000. Payback favours safety and cash; ARR and NPV favour total return.", setup() { set({ proj: "van", cmp: "solar" }); } },
    { title: "Every year counts the same?", q: "Payback ignores everything after the payback date. Find a project where that matters.", hint: "The second shop takes exactly 4 years to pay back (the van under 2½) but then earns £60,000 a year: ARR 13.3% against 11.7%, NPV £47,000 against £7,000. Payback alone would prefer the van; ARR and NPV reward the later years.", setup() { set({ proj: "shop", cmp: "van" }); } },
    { title: "Decision tree: launch or upgrade?", q: "Switch to the decision tree. Which option has the highest EMV? Press play: does every launch earn its EMV?", hint: "EMV(launch) = 0.6 × 200k + 0.4 × 30k − 50k = £82,000; EMV(upgrade) = 0.7 × 90k + 0.3 × 30k − 20k = £52,000. Each single launch either earns £150k or loses £20k; only the average approaches £82k.", setup() { set({ view: "tree" }); } },
    { lvl: "adv", title: "Net present value", q: "Find the NPV of the machine at 8%. Then raise the discount rate. At what rate does the NPV reach zero?", hint: "NPV ≈ +£28,000 at 8%. Higher rates shrink distant cash flows more, so NPV falls; it reaches 0 at about 20.6% (the internal rate of return, beyond the spec).", setup() { set({ r: 0.08 }); } },
    { lvl: "adv", title: "Risk: the future isn't certain", q: "Each possible future has cash flows ±20%. What fraction of futures have a negative NPV for the second shop?", hint: "The forecast NPV is positive, but a noticeable share of futures lose money. A spread of outcomes (sensitivity analysis) is more useful than one number.", setup() { set({ proj: "shop", cv: 0.25 }); } },
    { lvl: "adv", title: "How sensitive is it?", q: "Scale the machine's cash flows down. By what percentage can they fall before NPV becomes negative?", hint: "This is sensitivity analysis: NPV = 0 when cash flows are about 73% of the forecast, so a 27% shortfall wipes out the gain.", setup() { set({ scale: 1 }); } },
    { lvl: "adv", title: "A cautious owner", q: "In the tree, make the owner risk averse. Does the best choice change?", hint: "With strong risk aversion, the chance of losing £20,000 on a launch weighs heavily: the certainty equivalent of launching can fall below upgrading, even though its EMV is higher. EMV assumes the owner is risk neutral.", setup() { set({ view: "tree", riskR: 30000 }); } }
  ],
  batch: [
    { title: "Possible futures for the machine", question: "Each year's cash flow could be 20% higher or lower than forecast. What is the spread of NPV?", how: "New machine, 8% discount rate, independent ±20% (SD) each year.", yLabel: "NPV (£)", reps: 400, bins: 24, theory: npv(80000, flows(PROJ.machine), 0.08), theoryLabel: "forecast NPV", run: (x, r) => npv(80000, flows(PROJ.machine).map(v => v * (1 + 0.2 * r.gauss())), 0.08), note: "The mean matches the forecast NPV, but individual futures range widely. The fraction below zero is the chance the investment loses value." },
    { title: "NPV and the discount rate", question: "How does NPV depend on the discount rate?", how: "New machine; cash flows ±10% each year.", xLabel: "discount rate (%)", yLabel: "NPV (£)", xs: [0, 2, 4, 6, 8, 10, 15, 20, 25], reps: 10, theory: x => npv(80000, flows(PROJ.machine), x / 100), theoryLabel: "NPV = Σ CF/(1+r)ᵗ − cost", run: (x, r) => npv(80000, flows(PROJ.machine).map(v => v * (1 + 0.1 * r.gauss())), x / 100), note: "NPV falls as r rises, curving because discounting compounds. Where it crosses zero is the internal rate of return: the project is worthwhile if the business's cost of capital is below that." },
    { title: "Payback when sales disappoint", question: "How does the payback period change if cash flows are only a fraction of forecast?", how: "New machine; cash flows scaled, each year also ±10%.", xLabel: "cash flows (% of forecast)", yLabel: "payback (years)", xs: [60, 70, 80, 90, 100, 110, 120], reps: 10, yMin: 0, theory: x => payback(80000, flows(PROJ.machine, x / 100)), theoryLabel: "payback at that level", run: (x, r) => { const p = payback(80000, flows(PROJ.machine, x / 100).map(v => v * (1 + 0.1 * r.gauss()))); return isFinite(p) ? p : null; }, note: "Payback stretches quickly as cash flows fall: at 60% the machine only just pays back within its life. Runs that never pay back are left out." },
    { title: "Decision tree: one launch at a time", question: "If the launch were made many times, what would each one earn?", how: "Launch: cost £50k; 60% chance of £200k, 40% chance of £30k.", yLabel: "result of one launch (£)", reps: 500, bins: 20, theory: emvA(DEF), theoryLabel: "EMV", run: (x, r) => (r() < 0.6 ? 200000 : 30000) - 50000, note: "Only two results ever happen (+£150k or −£20k): no single launch earns the EMV of £82k. The mean of many launches does." },
    { title: "How many decisions before the average is near the EMV? (A level)", question: "How far is the average result from the EMV after n launches?", how: "Average of n launches; size of the error.", xLabel: "number of launches n", yLabel: "|average − EMV| (£)", xs: [5, 10, 20, 50, 100, 200, 500], reps: 30, yMin: 0, theory: n => Math.sqrt(0.6 * 0.4) * 170000 / Math.sqrt(n) * Math.sqrt(2 / Math.PI), theoryLabel: "σ√(2/πn) (large n)", run: (n, r) => { let s = 0; for (let i = 0; i < n; i++) s += (r() < 0.6 ? 200000 : 30000) - 50000; return Math.abs(s / n - emvA(DEF)); }, note: "The error shrinks like 1/√n. A big firm making many similar decisions can rely on EMV; a small firm making one huge decision cannot." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "9BS0 3.3.2", text: "Payback = time for net cash inflows to repay the cost. Part-year = amount still to recover ÷ that year's cash flow (× 12 for months). Simple and favours quick, less risky returns, but ignores cash after payback." },
      { lvl: "std", tag: "9BS0 3.3.2", text: "ARR = (total net cash flows − cost) ÷ years ÷ cost × 100. Uses all the cash flows and can be compared with interest rates, but ignores timing." },
      { lvl: "adv", tag: "9BS0 3.3.2", text: "NPV = Σ (cash flow × discount factor) − cost, discount factor = 1/(1 + r)ᵗ. Positive NPV: the project returns more than r. Takes account of the time value of money, but depends on choosing r." },
      { lvl: "adv", tag: "9BS0 3.3.2", text: "All three rely on forecasts that get less reliable further ahead. Qualitative factors matter too: staff, brand, environment, strategy, risk, alternative uses of the money." },
      { lvl: "adv", tag: "9BS0 3.3.3", text: "Decision trees: squares are decisions, circles are chance nodes. EMV = Σ(probability × outcome) − cost. Choose the highest EMV; probabilities and outcomes are estimates, and EMV ignores risk attitude." },
      { lvl: "beyond", tag: "Beyond", text: "The internal rate of return is the discount rate that makes NPV = 0. A risk-averse decision maker uses a certainty equivalent below the EMV." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `${PROJ[P.proj].name}: cost ${gbp(P.cost)}, cash flows ${flows(PROJ[P.proj], P.scale).map(gbp).join(", ")}. Calculate the payback period.`, ans: () => `<ul><li>Cumulative cash flow reaches zero part-way through year ${Math.ceil(payback(P.cost, flows(PROJ[P.proj], P.scale)))}</li><li>Payback = ${isFinite(payback(P.cost, flows(PROJ[P.proj], P.scale))) ? payback(P.cost, flows(PROJ[P.proj], P.scale)).toFixed(2) + " years (" + pbTxt(payback(P.cost, flows(PROJ[P.proj], P.scale))) + ")" : "never"}</li></ul>` },
      { lvl: "std", marks: 3, q: () => `Calculate the ARR for the same project.`, ans: () => { const cf = flows(PROJ[P.proj], P.scale), tot = cf.reduce((a, v) => a + v, 0); return `<ul><li>Total return = ${gbp(tot)} − ${gbp(P.cost)} = ${gbp(tot - P.cost)} (1)</li><li>Per year = ${gbp((tot - P.cost) / cf.length)} (1)</li><li>ARR = ${arr(P.cost, cf).toFixed(1)}% (1)</li></ul>`; } },
      { lvl: "adv", marks: 4, q: () => `Calculate the NPV at ${(P.r * 100).toFixed(0)}% (discount factors to 3 d.p.).`, ans: () => { const cf = flows(PROJ[P.proj], P.scale); return `<ul>${cf.map((v, i) => `<li>Year ${i + 1}: ${gbp(v)} × ${df(P.r, i + 1).toFixed(3)} = ${gbp(v * +df(P.r, i + 1).toFixed(3))}</li>`).join("")}<li>NPV = ${gbp(cf.reduce((a, v, i) => a + v * +df(P.r, i + 1).toFixed(3), 0) - P.cost)}</li></ul>`; } },
      { lvl: "adv", marks: 4, q: () => `Launch: cost ${gbpk(P.aCost)}, ${Math.round(P.aP * 100)}% chance of ${gbpk(P.aHi)}, otherwise ${gbpk(P.aLo)}. Upgrade: cost ${gbpk(P.bCost)}, ${Math.round(P.bP * 100)}% chance of ${gbpk(P.bHi)}, otherwise ${gbpk(P.bLo)}. Which has the higher EMV?`, ans: () => `<ul><li>Launch: ${P.aP} × ${gbpk(P.aHi)} + ${(1 - P.aP).toFixed(2)} × ${gbpk(P.aLo)} − ${gbpk(P.aCost)} = ${gbp(emvA(P))}</li><li>Upgrade: ${P.bP} × ${gbpk(P.bHi)} + ${(1 - P.bP).toFixed(2)} × ${gbpk(P.bLo)} − ${gbpk(P.bCost)} = ${gbp(emvB(P))}</li><li>Choose ${emvA(P) >= emvB(P) ? "launch" : "upgrade"} on EMV (if above £0, doing nothing).</li></ul>` },
      { lvl: "adv", marks: 10, q: "Evaluate the usefulness of investment appraisal to a business deciding whether to open a second shop.", ans: "<ul><li>Knowledge: payback, ARR, NPV; what each measures.</li><li>Application: long payback but strong later cash flows; NPV depends on the discount rate chosen.</li><li>Analysis: forecasts 5–6 years ahead are uncertain; sensitivity analysis shows how much cash flows can fall; methods may disagree.</li><li>Evaluation: useful for comparing options objectively and supporting finance applications, but must be combined with qualitative factors (location, competition, staffing, strategy) and risk attitude. Judgement.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Payback = whole years until the cumulative cash flow is ≥ 0, plus the part year (amount still owed ÷ that year's cash flow). ARR = (Σ cash flows − cost) ÷ years ÷ cost × 100. NPV = Σ CFₜ/(1 + r)ᵗ − cost. Any resale (residual) value is added to the final year's cash flow.</li>
<li>Possible futures: each year's cash flow is multiplied by (1 + uncertainty × a random normal number), independently.</li>
<li>Decision tree: EMV = p × high + (1 − p) × low − cost. Risk attitude (beyond the spec): utility U(x) = 1 − e^(−x/R) of the net result; the certainty equivalent is the sure amount with the same expected utility. Smaller R = more cautious.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Cash flows arrive at the end of each year; the cost is paid at the start (year 0).</li><li>Net cash flows are given (no tax, inflation, financing costs or depreciation shown separately).</li><li>The discount rate is the same every year. Chance outcomes have just two branches.</li><li>Figures are illustrative.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "invest", options: [["invest", "Investment appraisal"], ["tree", "Decision tree"]], on: v => { P.view = v; showGroups(); } });
const gI = ui.group("The project");
ctl.proj = K.seg(gI, { value: "machine", options: Object.entries(PROJ).map(([k, p]) => [k, p.name]), on: v => set({ proj: v }) });
ctl.cost = K.slider(gI, { label: "Initial cost (year 0)", min: 5000, max: 250000, step: 1000, value: 80000, fmt: gbp, on: v => { P.cost = v; futures = []; } });
ctl.scale = K.slider(gI, { label: "Cash flows (% of forecast)", min: 0.4, max: 1.6, step: 0.01, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => { P.scale = v; futures = []; } });
ctl.cmp = K.seg(gI, { label: "Compare with", value: "none", options: [["none", "nothing"]].concat(Object.entries(PROJ).map(([k, p]) => [k, p.name])), on: v => P.cmp = v });
const gA = ui.group("A level: discounting and risk");
ctl.r = K.slider(gA, { label: "Discount rate r", min: 0, max: 0.3, step: 0.005, value: 0.08, fmt: v => (v * 100).toFixed(1) + "%", on: v => { P.r = v; futures = []; } });
ctl.cv = K.slider(gA, { label: "Uncertainty in each year's cash flow", min: 0, max: 0.5, step: 0.01, value: 0.2, fmt: v => "±" + Math.round(v * 100) + "%", on: v => { P.cv = v; futures = []; } });
const gT = ui.group("Decision tree");
ctl.aCost = K.slider(gT, { label: "Launch: cost", min: 0, max: 150000, step: 5000, value: 50000, fmt: gbpk, on: v => treeSet({ aCost: v }) });
ctl.aP = K.slider(gT, { label: "Launch: chance of success", min: 0, max: 1, step: 0.05, value: 0.6, fmt: v => Math.round(v * 100) + "%", on: v => treeSet({ aP: v }) });
ctl.aHi = K.slider(gT, { label: "Launch: success pays", min: 0, max: 400000, step: 5000, value: 200000, fmt: gbpk, on: v => treeSet({ aHi: v }) });
ctl.aLo = K.slider(gT, { label: "Launch: failure pays", min: 0, max: 200000, step: 5000, value: 30000, fmt: gbpk, on: v => treeSet({ aLo: v }) });
ctl.bCost = K.slider(gT, { label: "Upgrade: cost", min: 0, max: 150000, step: 5000, value: 20000, fmt: gbpk, on: v => treeSet({ bCost: v }) });
ctl.bP = K.slider(gT, { label: "Upgrade: chance of high demand", min: 0, max: 1, step: 0.05, value: 0.7, fmt: v => Math.round(v * 100) + "%", on: v => treeSet({ bP: v }) });
ctl.bHi = K.slider(gT, { label: "Upgrade: high demand pays", min: 0, max: 400000, step: 5000, value: 90000, fmt: gbpk, on: v => treeSet({ bHi: v }) });
ctl.bLo = K.slider(gT, { label: "Upgrade: low demand pays", min: 0, max: 200000, step: 5000, value: 30000, fmt: gbpk, on: v => treeSet({ bLo: v }) });
ctl.riskR = K.slider(gT, { label: "Owner's attitude to risk (A level)", min: 0, max: 200000, step: 5000, value: 0, fmt: v => v ? `risk averse (R = ${gbpk(v)})` : "risk neutral (uses EMV)", on: v => P.riskR = v });
g = ui.group("Play"); ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Results"), [["pb", "payback"], ["arr", "ARR"], ["npv", "NPV"], ["irr", "IRR (beyond spec)"], ["neg", "futures with NPV < 0"], ["emv", "EMV launch / upgrade"], ["best", "best choice"], ["plays", "trees played / averages"]]);
function showGroups() { const t = P.view === "tree"; gI.style.display = gA.style.display = t ? "none" : ""; gT.style.display = t ? "" : "none"; }
function treeSet(o) { Object.assign(P, o); tA = []; tB = []; plays = 0; }
function set(o) {
  const p = PROJ[o.proj || DEF.proj]; Object.assign(P, DEF, { cost: p.cost }, o);
  for (const k of ["view", "proj", "cost", "scale", "cmp", "r", "cv", "aCost", "aP", "aHi", "aLo", "bCost", "bP", "bHi", "bLo", "riskR", "speed"]) ctl[k].set(P[k]);
  futures = []; tA = []; tB = []; plays = 0; lastA = lastB = null; showGroups();
}
// ---------------- Simulation: draw a new possible future (or play the tree once) every so often ----------------
function tick(dt) {
  tt += dt * P.speed; if (tt < 0.35) return; tt = 0;
  if (P.view === "invest") { const cf = flows(PROJ[P.proj], P.scale).map(v => v * (1 + P.cv * rnd.gauss())); futures.push({ cf, npv: npv(P.cost, cf, P.r) }); if (futures.length > 400) futures.shift(); }
  else { lastA = rnd() < P.aP; lastB = rnd() < P.bP; plays++; tA.push((lastA ? P.aHi : P.aLo) - P.aCost); tB.push((lastB ? P.bHi : P.bLo) - P.bCost); if (tA.length > 2000) { tA.shift(); tB.shift(); } }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
function drawInvest(c, w, h) {
  const p = PROJ[P.proj], cf = flows(p, P.scale), n = cf.length, adv = ui.level === "adv";
  TX(c, `${p.name}: cost ${gbp(P.cost)}${p.resid ? `, resale ${gbp(p.resid)} at the end` : ""}`, 20, 26, "#eef2f8", "left", "600 14px");
  // table
  const x0 = 20, lw = 150, cw = Math.min(80, (w * 0.98 - lw - x0) / (n + 1)), T = 58, rh = 19;
  const rows = [["Year", t => t], ["Net cash flow", t => t ? gbpk(cf[t - 1]) : gbpk(-P.cost)], ["Cumulative", t => gbpk(-P.cost + cf.slice(0, t).reduce((a, v) => a + v, 0))]].concat(adv ? [["Discount factor", t => df(P.r, t).toFixed(3)], ["Present value", t => t ? gbpk(cf[t - 1] * df(P.r, t)) : gbpk(-P.cost)]] : []);
  rows.forEach(([lab, f], j) => { const y = T + j * rh; if (!j) { c.fillStyle = "#151d33"; c.fillRect(x0, y - 14, lw + cw * (n + 1), rh); } TX(c, lab, x0 + 4, y, j ? "#aab6cc" : "#eef2f8", "left", (j ? "" : "600 ") + "12px"); for (let t = 0; t <= n; t++) { const s = String(f(t)); TX(c, s, x0 + lw + (t + 1) * cw - 8, y, s.startsWith("−") ? "#ff8a70" : "#cfd8ea", "right", (j ? "" : "600 ") + "12px"); } });
  // cumulative cash-flow chart
  const L = 80, R = w * 0.66, cT = T + rows.length * rh + 30, B = h - 40;
  const cum = [-P.cost], dcum = [-P.cost]; cf.forEach((v, i) => { cum.push(cum[i] + v); dcum.push(dcum[i] + v * df(P.r, i + 1)); });
  const other = P.cmp !== "none" && P.cmp !== P.proj ? PROJ[P.cmp] : null, ocf = other ? flows(other) : null, ocum = other ? [-other.cost] : null; if (other) ocf.forEach((v, i) => ocum.push(ocum[i] + v));
  const nx = Math.max(n, other ? ocf.length : 0), all = cum.concat(adv ? dcum : [], ocum || []), ymax = Math.max(...all, 1) * 1.1, ymin = Math.min(...all) * 1.1;
  const X = t => L + (t + 0.5) / (nx + 1) * (R - L), Y = v => cT + (ymax - v) / (ymax - ymin) * (B - cT);
  TX(c, "Cumulative cash flow" + (adv ? " (bars) and cumulative present value (line)" : ""), L, cT - 10, "#eef2f8", "left", "600 12.5px");
  const st = nice((ymax - ymin) / 5); c.strokeStyle = "#2a3550"; c.lineWidth = 1;
  for (let v = Math.ceil(ymin / st) * st; v <= ymax; v += st) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(R, Y(v)); c.stroke(); TX(c, gbpk(v), L - 6, Y(v) + 4, "#8fa0bf", "right", "11px"); }
  const bw = (R - L) / (nx + 1) * (other ? 0.35 : 0.6);
  cum.forEach((v, t) => { c.fillStyle = v < 0 ? "#ff8a70" : "#7ee787"; c.fillRect(X(t) - bw / 2 - (other ? bw / 2 : 0), Math.min(Y(v), Y(0)), bw, Math.abs(Y(v) - Y(0))); TX(c, t, X(t), B + 15, "#8fa0bf", "center", "11px"); });
  if (other) ocum.forEach((v, t) => { c.fillStyle = v < 0 ? "rgba(255,138,112,0.45)" : "rgba(126,231,135,0.45)"; c.fillRect(X(t), Math.min(Y(v), Y(0)), bw, Math.abs(Y(v) - Y(0))); });
  c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(R, Y(0)); c.stroke(); TX(c, "year", (L + R) / 2, B + 30, "#8fa0bf", "center", "11px");
  if (adv) { c.strokeStyle = "#ffd166"; c.lineWidth = 2.2; c.beginPath(); dcum.forEach((v, t) => t ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v))); c.stroke(); c.lineWidth = 1; TX(c, `NPV ${gbpk(dcum[n])}`, X(n) + 6, Y(dcum[n]) + 4, "#ffd166", "left", "600 12px"); }
  const pb = payback(P.cost, cf); if (isFinite(pb)) { c.strokeStyle = "#fff"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(pb), cT); c.lineTo(X(pb), B); c.stroke(); c.setLineDash([]); TX(c, `payback ${pbTxt(pb)}`, X(pb) + 5, cT + 14, "#fff", "left", "600 12px"); }
  if (other) TX(c, `faded bars: ${other.name}`, R, cT - 10, "#8fa0bf", "right", "11.5px");
  // result cards
  const cx = R + 30, cwid = w - cx - 20; const cards = [["Payback", pbTxt(pb), isFinite(pb) && pb <= n / 2 ? "#7ee787" : "#ffd166", other ? `${other.name}: ${pbTxt(payback(other.cost, ocf))}` : "sooner = less risk"], ["Average rate of return", arr(P.cost, cf).toFixed(1) + "%", arr(P.cost, cf) > P.r * 100 ? "#7ee787" : "#ff8a70", other ? `${other.name}: ${arr(other.cost, ocf).toFixed(1)}%` : "compare with interest rates"]];
  if (adv) cards.push(["Net present value at " + (P.r * 100).toFixed(1) + "%", gbp(npv(P.cost, cf, P.r)), npv(P.cost, cf, P.r) >= 0 ? "#7ee787" : "#ff8a70", other ? `${other.name}: ${gbp(npv(other.cost, ocf, P.r))}` : "positive = worth doing"]);
  cards.forEach(([t, v, col, sub], i) => { const y = cT - 4 + i * 86; c.fillStyle = "#121a2e"; c.fillRect(cx, y, cwid, 76); c.strokeStyle = col; c.strokeRect(cx + .5, y + .5, cwid - 1, 75); TX(c, t, cx + 12, y + 20, "#aab6cc", "left", "12px"); TX(c, v, cx + 12, y + 50, col, "left", "600 24px"); TX(c, sub, cx + 12, y + 68, "#8fa0bf", "left", "11px"); });
}
function drawTree(c, w, h) {
  const adv = ui.level === "adv", EA = emvA(P), EB = emvB(P), R = P.riskR, CA = ce(P.aP, P.aHi, P.aLo, P.aCost, R), CB = ce(P.bP, P.bHi, P.bLo, P.bCost, R);
  const vals = { launch: R ? CA : EA, upgrade: R ? CB : EB, nothing: 0 }, best = Object.entries(vals).sort((a, b) => b[1] - a[1])[0][0];
  TX(c, "Decision tree: squares are decisions, circles are chance", 20, 26, "#eef2f8", "left", "600 14px");
  const dx = 70, dy = h * 0.47, cx = w * 0.36, ox = w * 0.66;
  const node = (x, y, sq, col) => { c.fillStyle = col; c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; if (sq) { c.fillRect(x - 14, y - 14, 28, 28); c.strokeRect(x - 14, y - 14, 28, 28); } else { c.beginPath(); c.arc(x, y, 14, 0, 6.3); c.fill(); c.stroke(); } };
  const branch = (x1, y1, x2, y2, on, lab, lab2) => { c.strokeStyle = on ? "#ffd166" : "#55627f"; c.lineWidth = on ? 3.5 : 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + 30, y2); c.lineTo(x2, y2); c.stroke(); if (lab) TX(c, lab, x1 + 40, y2 - 8, "#cfd8ea", "left", "12px"); if (lab2) TX(c, lab2, x1 + 40, y2 + 16, "#8fa0bf", "left", "11.5px"); };
  const yA = dy - h * 0.25, yB = dy + h * 0.05, yN = dy + h * 0.33;
  branch(dx, dy, cx, yA, best === "launch", "Launch new product", `cost ${gbpk(P.aCost)}`); branch(dx, dy, cx, yB, best === "upgrade", "Upgrade existing", `cost ${gbpk(P.bCost)}`); branch(dx, dy, ox, yN, best === "nothing", "Do nothing", "£0");
  const flash = (x, y) => { c.fillStyle = "rgba(255,255,255,0.18)"; c.beginPath(); c.arc(x, y, 22, 0, 6.3); c.fill(); };
  [[yA, P.aP, P.aHi, P.aLo, "success", "failure", lastA, EA, CA], [yB, P.bP, P.bHi, P.bLo, "high demand", "low demand", lastB, EB, CB]].forEach(([y, p, hi, lo, n1, n2, last, E, C]) => {
    const s = h * 0.09; branch(cx, y, ox, y - s, false, `${n1} ${Math.round(p * 100)}%`); branch(cx, y, ox, y + s, false, `${n2} ${Math.round((1 - p) * 100)}%`);
    if (last != null) flash(ox + 6, last ? y - s : y + s);
    node(cx, y, false, "#2b3a5c"); TX(c, `EMV ${gbpk(E)}`, cx, y - 24, "#ffd166", "center", "600 12.5px"); if (adv && R) TX(c, `CE ${gbpk(C)}`, cx, y + 32, "#c9a0ff", "center", "600 12px");
    TX(c, gbpk(hi), ox + 10, y - s + 4, "#7ee787", "left", "600 13px"); TX(c, gbpk(lo), ox + 10, y + s + 4, "#7ee787", "left", "600 13px");
  });
  node(dx, dy, true, "#2b3a5c"); TX(c, "▲", ox + 10, yN + 4, "#8fa0bf", "left", "12px");
  // working
  const wx = w * 0.78; TX(c, "Working", wx, 70, "#eef2f8", "left", "600 13px");
  [`Launch: ${P.aP} × ${gbpk(P.aHi)} + ${(1 - P.aP).toFixed(2)} × ${gbpk(P.aLo)}`, `   − ${gbpk(P.aCost)} = ${gbp(EA)}`, `Upgrade: ${P.bP} × ${gbpk(P.bHi)} + ${(1 - P.bP).toFixed(2)} × ${gbpk(P.bLo)}`, `   − ${gbpk(P.bCost)} = ${gbp(EB)}`, `Do nothing: £0`, "", R ? `Risk averse: choose ${best}` : `Highest EMV: ${best}`, plays ? `After ${plays} plays the averages are:` : "Press play to make the decision many times", plays ? `launch ${gbp(K.mean(tA))}, upgrade ${gbp(K.mean(tB))}` : ""].forEach((s, i) => TX(c, s, wx, 94 + i * 19, i === 6 ? "#ffd166" : "#cfd8ea", "left", (i === 6 ? "600 " : "") + "12px"));
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "tree") drawTree(c, w, h); else drawInvest(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const cf = flows(PROJ[P.proj], P.scale), adv = ui.level === "adv";
  if (P.view === "invest") {
    chA.opts.title = "NPV against discount rate"; chA.opts.xLabel = "discount rate (%)"; chA.opts.yLabel = "NPV (£)";
    const pts = []; for (let i = 0; i <= 60; i++) pts.push([i / 2, npv(P.cost, cf, i / 200)]);
    chA.draw([{ pts, color: "#ffd166", label: "NPV" }, { pts: [[P.r * 100, npv(P.cost, cf, P.r)]], type: "dots", r: 6, color: "#fff", label: "now" }], { hlines: [{ y: 0, color: "#6c7894" }], xMin: 0, xMax: 30 });
    chB.opts.title = "Possible futures: NPV of each (±" + Math.round(P.cv * 100) + "% a year)"; chB.opts.xLabel = "NPV (£)"; chB.opts.yLabel = "number of futures";
    if (futures.length) { const v = futures.map(f => f.npv), hg = K.histogram(v, 20); chB.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: "#5ad1ff", alpha: .8, label: futures.length + " futures" }], { vlines: [{ x: 0, color: "#ff8a70", label: "NPV = 0" }, { x: npv(P.cost, cf, P.r), color: "#ffd166", label: "forecast", row: 1 }] }); } else chB.draw([], {});
  } else {
    chA.opts.title = "Running average result of each option"; chA.opts.xLabel = "decisions played"; chA.opts.yLabel = "average (£)";
    const ra = (arr2) => { const out = []; let s = 0; arr2.forEach((v, i) => { s += v; if (i % Math.max(1, Math.floor(arr2.length / 200)) === 0 || i === arr2.length - 1) out.push([i + 1, s / (i + 1)]); }); return out; };
    chA.draw([{ pts: ra(tA), color: "#5ad1ff", label: "launch" }, { pts: ra(tB), color: "#c9a0ff", label: "upgrade" }], { hlines: [{ y: emvA(P), color: "#5ad1ff", label: "EMV launch" }, { y: emvB(P), color: "#c9a0ff", label: "EMV upgrade" }], xMin: 0, xMax: Math.max(20, tA.length) });
    chB.opts.title = "What actually happened (each play)"; chB.opts.xLabel = "result (£)"; chB.opts.yLabel = "times";
    const cnt = (a, v) => a.filter(x => x === v).length;
    chB.draw([{ pts: [[P.aHi - P.aCost, cnt(tA, P.aHi - P.aCost)], [P.aLo - P.aCost, cnt(tA, P.aLo - P.aCost)]], type: "bars", w: 6000, color: "#5ad1ff", label: "launch" }, { pts: [[P.bHi - P.bCost + 7000, cnt(tB, P.bHi - P.bCost)], [P.bLo - P.bCost + 7000, cnt(tB, P.bLo - P.bCost)]], type: "bars", w: 6000, color: "#c9a0ff", label: "upgrade" }], { xMin: Math.min(P.aLo - P.aCost, P.bLo - P.bCost, 0) - 20000, xMax: Math.max(P.aHi - P.aCost, P.bHi - P.bCost) + 27000 });
  }
  const pb = payback(P.cost, cf), ir = irr(P.cost, cf);
  read.set("pb", pbTxt(pb)); read.set("arr", arr(P.cost, cf).toFixed(1) + "%"); read.set("npv", adv ? gbp(npv(P.cost, cf, P.r)) : "A level"); read.set("irr", adv && isFinite(ir) ? (ir * 100).toFixed(1) + "%" : "–");
  read.set("neg", futures.length ? `${(100 * futures.filter(f => f.npv < 0).length / futures.length).toFixed(0)}% of ${futures.length}` : "–");
  read.set("emv", `${gbpk(emvA(P))} / ${gbpk(emvB(P))}`); const R = P.riskR, v = { launch: R ? ce(P.aP, P.aHi, P.aLo, P.aCost, R) : emvA(P), upgrade: R ? ce(P.bP, P.bHi, P.bLo, P.bCost, R) : emvB(P), "do nothing": 0 };
  read.set("best", Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]); read.set("plays", plays ? `${plays}: ${gbpk(K.mean(tA))} / ${gbpk(K.mean(tB))}` : "–");
  ui.hud(P.view === "tree" ? "EMV = Σ (probability × outcome) − cost" : adv ? "payback · ARR = average return ÷ cost × 100 · NPV = Σ CF/(1+r)ᵗ − cost" : "payback · ARR = average annual return ÷ cost × 100");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Bars show the cumulative cash flow: payback is where they cross zero. Try the decision tree too.", 7000);
