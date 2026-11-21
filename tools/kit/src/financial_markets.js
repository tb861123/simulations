/* =====================================================================
   BANKS, BONDS AND FINANCIAL MARKETS
   Four linked models of the financial sector:
     BONDS        a bond pays a fixed coupon each year and £100 at the end.
                  Its price is what those payments are worth today:
                  P = Σ C/(1+r)ᵗ + 100/(1+r)ⁿ, so when interest rates RISE,
                  bond prices FALL. The yield = coupon ÷ price.
     A BANK RUN   a bank keeps only a fraction of deposits as cash reserves
                  and lends the rest. If enough depositors fear the others
                  will withdraw, they all rush to withdraw first; the bank
                  must sell loans cheaply (a fire sale) and can fail even
                  though it was sound. A LENDER OF LAST RESORT (the central
                  bank) and DEPOSIT INSURANCE stop the panic.
     MORAL HAZARD if a bank's depositors know they will be bailed out, they
                  stop charging risky banks more, so banks take more risk:
                  the gains are private, the losses fall on taxpayers.
     BUBBLES      speculators who buy because prices are rising push prices
                  away from their fundamental value; the bubble later bursts.
   ===================================================================== */
// ---- Bonds ----
const bondPrice = (r, n, c = 5) => { let p = 0; for (let t = 1; t <= n; t++) p += c / Math.pow(1 + r, t); return p + 100 / Math.pow(1 + r, n); };
// ---- Bank run (200 depositors with £1 each; capital on top) ----
/* Each depositor has a nerve θ: they withdraw if the share already withdrawing exceeds θ × calm. Calm is higher when the bank holds more reserves,
   much higher with a lender of last resort; insured depositors do not run. A rumour starts some withdrawals. */
function bankRun(o, r, keep = false) {
  const N = 200, D = N, cap = D * o.capital / (1 - o.capital), R0 = D * o.reserve, L0 = D + cap - R0, calm = 0.35 + 1.5 * o.reserve + (o.lolr ? 0.5 : 0);
  const th = [], ins = []; for (let i = 0; i < N; i++) { th.push(Math.max(0.02, 0.5 + 0.15 * r.gauss())); ins.push(r() < o.insured); }   // most people's nerve is middling: a few panic early, a few never do
  let f = o.rumour, R = R0, L = L0, W = 0, failed = false; const path = [];
  for (let k = 0; k < 15; k++) {
    let n = 0; for (let i = 0; i < N; i++) if (!ins[i] && (i < N * o.rumour || f > th[i] * calm)) n++;   // insured depositors stay put, even if they hear the rumour
    const want = n - W; if (want > 0) { const fromR = Math.min(R, want); R -= fromR; const rest = want - fromR; if (rest > 0) { const disc = o.lolr ? 0.02 : 0.3, sell = rest / (1 - disc); if (sell > L) { failed = true; L = 0; } else L -= sell; } W = n; }
    const equity = R + L - (D - W); if (equity < 0) failed = true;
    path.push({ k, f: W / N, R, L, equity, failed }); if (failed) break; const nf = W / N; if (Math.abs(nf - f) < 1e-9 && k > 0) { f = nf; break; } f = nf;
  }
  return { failed, f: W / N, path, R0, L0, cap, th, ins };
}
// ---- Moral hazard: 200 banks choose the share x of risky loans ----
// safe loans +4%; risky loans +10% in good years, −45% in a crash (probability 15%): expected +1.75%, worse than safe.
// Deposits cost 2%, plus a risk premium that depositors charge ONLY if they expect to lose money (no bailout).
function bankChoice(bailout, appetite) { let best = 0, bv = -1e9; for (let x = 0; x <= 1.0001; x += 0.05) { const good = 8 + 100 * (0.04 * (1 - x) + 0.10 * x), bad = 8 + 100 * (0.04 * (1 - x) - 0.45 * x), loss = Math.max(0, -bad);
    const premium = (1 - bailout) * 0.15 * loss; const v = 0.85 * Math.max(0, good - 1.84 - premium) + 0.15 * Math.max(0, bad - 1.84 - premium) + appetite * x; if (v > bv) { bv = v; best = x; } } return best; }
function moralHazard(bailout, r, years = 10) { let fails = 0, cost = 0, risky = 0; for (let b = 0; b < 200; b++) { const x = bankChoice(bailout, 0.6 * r.gauss()); risky += x; for (let y = 0; y < years; y++) { const crash = r() < 0.15, ret = 100 * (0.04 * (1 - x) + (crash ? -0.45 : 0.10) * x); if (8 + ret - 1.84 < 0) { fails++; cost += bailout * -(8 + ret - 1.84); break; } } } return { fails, cost, risky: risky / 200 }; }
// ---- A speculative market: fundamentalists and chartists ----
function market(share, r, T = 300) { let F = 100, p = 100, p1 = 100; const out = []; for (let t = 0; t < T; t++) { F *= Math.exp(0.01 * r.gauss()); const dem = (1 - share) * 0.1 * (F - p) + share * 1.25 * (p - p1); p1 = p; p = Math.max(1, p + dem + 0.8 * r.gauss()); out.push([t, p, F]); } return out; }
const mispricing = pts => K.sd(pts.slice(50).map(q => 100 * (q[1] - q[2]) / q[2]));

// ---------------- The page ----------------
const DEF = { view: "bond", r: 0.04, n: 10, coupon: 5, reserve: 0.1, capital: 0.08, rumour: 0.05, lolr: false, insured: 0, bailout: 0, share: 0.4 };
const P = Object.assign({}, DEF); let seed = 1, run = null, step = 0, mh = null, mk = null, mt = 0;
const ui = K.app({
  title: "Banks, Bonds and Financial Markets", subject: "Economics",
  blurb: "Bond prices and interest rates, a bank run and the lender of last resort, moral hazard from bailouts, and speculative bubbles",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Economics (4EC1): the role of money and of commercial and central banks (saving, lending, interest rates), the central bank as lender of last resort; why confidence matters to banks.", adv: "Pearson Edexcel A level Economics A (9EC0) Theme 4, 4.4 The financial sector: the role of financial markets (bonds and the inverse relationship between bond prices and interest rates, equities), market failure in the financial sector (asymmetric information, externalities, moral hazard, speculation and market bubbles), the role of central banks (lender of last resort, regulation), the structure of a commercial bank's balance sheet (liquidity, capital ratio)." } },
  missions: [
    { title: "Why do banks fail?", q: "Bank run. A rumour makes 5% of depositors withdraw. Watch the queue. Is this bank in trouble? Now try 10%, then 20%.", hint: "Banks keep only a fraction of deposits as cash. A small rumour is covered by reserves. A larger one makes others fear they will be last in the queue, so they withdraw too: the run feeds itself, the bank sells loans cheaply and can fail even though its loans were good.", setup() { set({ view: "bank", rumour: 0.05 }); } },
    { title: "The lender of last resort", q: "Same 20% rumour, but switch on the lender of last resort. What changes, and why do fewer people withdraw?", hint: "The central bank lends cash against the bank's loans, so there is no fire sale. Depositors know they will be paid, so they do not panic: the run never starts. This is what the Bank of England did in 2007–08.", setup() { set({ view: "bank", rumour: 0.2, lolr: true }); } },
    { title: "Deposit insurance", q: "Rumour 20%, no lender of last resort. Insure 80% of depositors (like the UK's £85,000 guarantee). Does the run stop?", hint: "Insured depositors have no reason to rush. The run is much smaller and the bank survives. Northern Rock (2007) was partly insured, and depositors still queued.", setup() { set({ view: "bank", rumour: 0.2, insured: 0.8 }); } },
    { lvl: "adv", title: "Bond prices and interest rates", q: "Bonds. A 10-year government bond pays £5 a year. Raise the market interest rate from 2% to 6%. What happens to its price and yield?", hint: "Nobody pays £100 for £5 a year when new bonds pay £6: the price falls until the yield matches. Bond prices and interest rates move in opposite directions. Quantitative easing works by buying bonds, raising their price and lowering long-term interest rates.", setup() { set({ view: "bond", r: 0.02 }); } },
    { lvl: "adv", title: "Long bonds are riskier", q: "Compare a 2-year and a 30-year bond when interest rates rise by one percentage point. Which loses more value?", hint: "The 30-year bond's payments are far in the future, so a higher discount rate cuts their value much more. This is what hurt UK pension funds in the 2022 gilt crisis.", setup() { set({ view: "bond", n: 30 }); } },
    { lvl: "adv", title: "Moral hazard", q: "Moral hazard. Banks with no bailout, then with a certain bailout. How much risk do they take? Who pays when they fail?", hint: "With no bailout, depositors charge risky banks more, so banks stay safe. With a guaranteed bailout, risk costs the bank nothing extra: shareholders keep the profits in good years and taxpayers pay in crashes. Regulation (capital ratios) and credible no-bailout rules try to stop this.", setup() { set({ view: "hazard", bailout: 0 }); } },
    { lvl: "adv", title: "Bubbles", q: "Speculation. Raise the share of speculators (chartists) from 20% to 70%. What happens to the price compared with its fundamental value?", hint: "Chartists buy because prices have risen, which pushes prices up further: a bubble, until fundamentalists' selling wins and it bursts. More speculation means bigger, longer departures from value: a market failure.", setup() { set({ view: "bubble", share: 0.2 }); } }
  ],
  batch: [
    { title: "Bank runs and the size of the rumour", question: "What share of banks fail as the rumour grows?", how: "50 banks with different depositors at each rumour size; reserves 10%, capital 8%, no lender of last resort, no insurance.", xLabel: "depositors withdrawing because of the rumour", yLabel: "% of banks failing", xs: [0.04, 0.08, 0.12, 0.16, 0.2, 0.25, 0.3], reps: 50, yMin: 0, yMax: 100, run: (w, r) => bankRun(Object.assign({}, DEF, { rumour: w }), r).failed ? 100 : 0, note: "Below a threshold nothing happens; above it nearly every bank fails. Small differences in confidence decide which side a bank ends up on: runs are self-fulfilling." },
    { title: "Deposit insurance and runs", question: "How does insuring depositors change the failure rate?", how: "Rumour 20%; 50 banks at each share of depositors insured.", xLabel: "share of depositors insured", yLabel: "% of banks failing", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 50, yMin: 0, yMax: 100, run: (s, r) => bankRun(Object.assign({}, DEF, { rumour: 0.2, insured: s }), r).failed ? 100 : 0, note: "Insured depositors have no reason to join a run, so it fizzles out once enough are covered." },
    { lvl: "adv", title: "Bond price against interest rate", question: "How does the price of a 10-year, £5-coupon bond depend on the market interest rate?", how: "Market prices scatter by ±0.3% around the value of the payments.", xLabel: "market interest rate (%)", yLabel: "bond price (£)", xs: [1, 2, 3, 4, 5, 6, 8, 10], reps: 5, theory: x => bondPrice(x / 100, 10), theoryLabel: "Σ C/(1+r)ᵗ + 100/(1+r)ⁿ", run: (x, r) => bondPrice(x / 100, 10) * (1 + 0.003 * r.gauss()), note: "An inverse relationship: at 5% (the coupon rate) the bond is worth exactly £100." },
    { lvl: "adv", title: "Which bonds suffer when rates rise?", question: "By what percentage does a bond's price fall when interest rates rise from 3% to 4%, for different maturities?", how: "£5 coupon; ±0.3% market noise.", xLabel: "years to maturity", yLabel: "% fall in price", xs: [1, 2, 5, 10, 20, 30], reps: 5, yMin: 0, theory: n => 100 * (1 - bondPrice(0.04, n) / bondPrice(0.03, n)), theoryLabel: "exact", run: (n, r) => 100 * (1 - bondPrice(0.04, n) * (1 + 0.003 * r.gauss()) / bondPrice(0.03, n)), note: "Long bonds lose far more: their payments are further away, so discounting them more heavily matters more (their 'duration' is longer)." },
    { lvl: "adv", title: "Moral hazard: bailouts and risk", question: "How much risky lending do banks choose as bailouts become more certain?", how: "200 banks with different appetites for risk; risky loans are worse for society on average.", xLabel: "probability of a bailout", yLabel: "average share of risky loans", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 4, yMin: 0, yMax: 1, run: (b, r) => moralHazard(b, r).risky, note: "The more certain the rescue, the more risk banks take, because depositors no longer charge for it." },
    { lvl: "adv", title: "Speculators and mispricing", question: "How far do prices stray from fundamental value as the share of trend-following speculators grows?", how: "300 trading days; SD of (price − fundamental value) ÷ value, after day 50.", xLabel: "share of chartists (speculators)", yLabel: "SD of mispricing (%)", xs: [0, 0.2, 0.4, 0.5, 0.6, 0.7], reps: 6, yMin: 0, run: (s, r) => mispricing(market(s, r)), note: "With few speculators prices track value closely. Past a point, trend-chasing creates bubbles and crashes: prices swing far from value." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1", text: "Commercial banks accept deposits, make loans and earn the gap between the interest they charge and pay. They keep only a fraction of deposits as cash (liquidity)." },
      { lvl: "std", tag: "4EC1", text: "The central bank sets the main interest rate, regulates banks and acts as lender of last resort to banks that run short of cash." },
      { lvl: "adv", tag: "9EC0 4.4.1", text: "Bonds: a fixed coupon and a repayment. Price and market interest rate move inversely; yield = coupon ÷ price. Long-dated bonds are most sensitive." },
      { lvl: "adv", tag: "9EC0 4.4.2", text: "Market failure in the financial sector: asymmetric information (mis-sold products), externalities (one bank's failure harms others: systemic risk), moral hazard (bailouts encourage risk), speculation and bubbles, market rigging (LIBOR)." },
      { lvl: "adv", tag: "9EC0 4.4.3", text: "A bank balance sheet: assets (cash, liquid assets, loans) and liabilities (deposits) plus capital. Liquidity vs profitability; the capital ratio = capital ÷ risk-weighted assets is a buffer against losses." },
      { lvl: "adv", tag: "9EC0 4.4.4", text: "Central banks: lender of last resort to stop runs, prudential regulation (capital and liquidity requirements, stress tests), and monetary policy (Bank Rate, QE)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a rumour can cause a sound bank to fail.", ans: "<ul><li>banks lend out most deposits and keep a small fraction as cash</li><li>if many depositors withdraw at once, the bank runs out of cash and must sell loans cheaply</li><li>fear that others will withdraw makes everyone withdraw: a self-fulfilling run</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A 10-year bond pays a £5 coupon. The market interest rate is ${(100 * P.r).toFixed(1)}%. Calculate its approximate price and yield, and explain the relationship.`, ans: () => `<ul><li>price = value of the payments = £${bondPrice(P.r, 10).toFixed(2)}</li><li>yield = 5 ÷ ${bondPrice(P.r, 10).toFixed(2)} = ${(500 / bondPrice(P.r, 10)).toFixed(2)}%</li><li>higher market rates mean lower bond prices (inverse relationship)</li></ul>` },
      { lvl: "adv", marks: 4, q: "Explain how a government guarantee to rescue banks can create moral hazard, and one policy to reduce it.", ans: "<ul><li>depositors and lenders expect to be repaid whatever happens, so they do not charge risky banks more</li><li>banks keep the profits of risk but losses fall on taxpayers</li><li>so banks take excessive risk</li><li>policy: higher capital requirements / bail-in rules / ring-fencing</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li><b>Bonds:</b> P = Σ C/(1+r)ᵗ + 100/(1+r)ⁿ for t = 1…n; yield = C ÷ P.</li>
<li><b>Bank run:</b> 200 depositors (£1 each); capital so that capital ÷ total assets = the capital ratio; reserves = reserve ratio × deposits; the rest is loans. Each depositor has a random nerve θ ~ Normal(0.5, 0.15) and withdraws if the share already withdrawn exceeds θ × calm, calm = 0.35 + 1.5 × reserve ratio (+ 0.5 with a lender of last resort). Insured depositors never withdraw, even if they hear the rumour. Withdrawals are paid from reserves, then by selling loans at a 30% discount (2% with the lender of last resort). The bank fails if its assets fall below what it still owes depositors.</li>
<li><b>Moral hazard:</b> each bank (capital 8, deposits 92 at 2%) picks the share of risky loans that maximises its shareholders' expected value (limited liability), plus its own appetite for risk. Depositors charge a premium equal to their expected loss unless they expect a bailout. Risky loans: +10% or −45% (15% chance); safe: +4%.</li>
<li><b>Bubbles:</b> fundamentalists buy when price is below value (0.1 × gap); chartists buy when it has risen (1.25 × last change); the fundamental value follows a random walk.</li></ul>
<h3>Simplifications</h3><ul><li>One bank at a time; contagion between banks is described, not modelled.</li><li>Depositors' nerve is random and fixed; there is no news beyond the queue itself.</li><li>All numbers are illustrative.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "bond", options: [["bond", "📜 Bonds"], ["bank", "🏦 Bank run"], ["hazard", "🎲 Moral hazard"], ["bubble", "🫧 Bubbles"]], on: v => set({ view: v }) });
const gp = {}; gp.bond = g = ui.group("Bond");
ctl.r = K.slider(g, { label: "Market interest rate", min: 0.005, max: 0.12, step: 0.005, value: 0.04, fmt: v => (v * 100).toFixed(1) + "%", on: v => P.r = v });
ctl.n = K.slider(g, { label: "Years to maturity", min: 1, max: 30, step: 1, value: 10, on: v => P.n = v });
gp.bank = g = ui.group("The bank");
ctl.reserve = K.slider(g, { label: "Cash reserves", min: 0.02, max: 0.3, step: 0.01, value: 0.1, fmt: v => (v * 100).toFixed(0) + "% of deposits", on: v => { P.reserve = v; rerun(); } });
ctl.capital = K.slider(g, { label: "Capital ratio", min: 0.02, max: 0.2, step: 0.01, value: 0.08, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.capital = v; rerun(); } });
ctl.rumour = K.slider(g, { label: "Rumour: depositors withdrawing at once", min: 0, max: 0.4, step: 0.01, value: 0.08, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.rumour = v; rerun(); } });
ctl.lolr = K.toggle(g, { label: "Central bank as lender of last resort", value: false, on: v => { P.lolr = v; rerun(); } });
ctl.insured = K.slider(g, { label: "Depositors insured", min: 0, max: 1, step: 0.1, value: 0, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.insured = v; rerun(); } });
gp.hazard = g = ui.group("Bailouts");
ctl.bailout = K.slider(g, { label: "Chance the government bails out depositors", min: 0, max: 1, step: 0.1, value: 0, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.bailout = v; rerun(); } });
gp.bubble = g = ui.group("Traders");
ctl.share = K.slider(g, { label: "Share of speculators (chartists)", min: 0, max: 0.75, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.share = v; rerun(); } });
K.btn(K.row(ui.group("")), "🎲 Run again with new chance", () => { seed++; rerun(); }, "primary");
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.view.set(P.view); for (const k in gp) gp[k].style.display = k === P.view ? "" : "none"; for (const k of ["r", "n", "reserve", "capital", "rumour", "insured", "bailout", "share"]) ctl[k].set(P[k]); ctl.lolr.set(P.lolr);
  const adv = ui.level === "adv"; ctl.view.el.querySelectorAll("button").forEach((b, i) => b.style.display = adv || i === 1 ? "" : "none"); }
function set(o) { Object.assign(P, DEF, o); if (ui.level !== "adv") P.view = "bank"; sync(); rerun(); }
function rerun() { const r = K.rng(seed * 7717 + 3); run = bankRun(P, r); step = 0; mh = moralHazard(P.bailout, K.rng(seed * 31 + 1)); mk = market(P.share, K.rng(seed * 13 + 5)); mt = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
function person(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 1.1, s * 0.55, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(x, y + s * 0.2, s * 0.7, s * 0.8, 0, Math.PI, 0); c.fill(); }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "bond") { const p = bondPrice(P.r, P.n), y = 5 / p; TX(c, `A ${P.n}-year bond: £5 a year, then £100 back at the end`, 24, 34, "#eef2f8", "left", "600 15px");
    // the payments, each shrunk by discounting to its value today
    const x0 = 40, bw = Math.min(24, (w * 0.6) / (P.n + 1)), base = h - 70, sc = (h - 160) / 105; for (let t = 1; t <= P.n; t++) { const cf = 5 + (t === P.n ? 100 : 0), pv = cf / Math.pow(1 + P.r, t), x = x0 + t * (bw + 4);
      c.fillStyle = "rgba(255,209,102,.25)"; c.fillRect(x, base - cf * sc, bw, cf * sc); c.fillStyle = "#ffd166"; c.fillRect(x, base - pv * sc, bw, pv * sc); }
    TX(c, "pale: payment · solid: what it is worth today", x0, base + 20, "#8fa0bf", "left", "11.5px"); TX(c, "year →", x0 + (P.n + 1) * (bw + 4), base + 20, "#8fa0bf", "left", "11px");
    let tx = w * 0.66, ty = 90; TX(c, `Market interest rate: ${(100 * P.r).toFixed(1)}%`, tx, ty, "#cfd8ea", "left", "13px"); ty += 26; TX(c, `Price = £${p.toFixed(2)}`, tx, ty, "#7ee787", "left", "600 22px"); ty += 28; TX(c, `Yield = 5 ÷ ${p.toFixed(2)} = ${(100 * y).toFixed(2)}%`, tx, ty, "#cfd8ea", "left", "13px"); ty += 26;
    WRAP(c, P.r > 0.05 ? "New bonds pay more than £5 a year, so this one sells below £100." : P.r < 0.05 ? "New bonds pay less than £5 a year, so this one sells above £100." : "The market rate equals the coupon rate, so the bond sells at £100.", tx, ty, w - tx - 20, 16, "#aab6cc", "12px");
  } else if (P.view === "bank") { if (!run) return; step = Math.min(run.path.length - 1, step + (dt || 0.016) * 1.5); const k = Math.floor(step), st = run.path[k], nOut = Math.round(st.f * 200);
    TX(c, "The bank and its depositors", 24, 34, "#eef2f8", "left", "600 15px");
    // bank building
    const bx = w * 0.36, by = 70; c.fillStyle = st.failed ? "#5a2a33" : "#3a4a6b"; c.fillRect(bx, by + 30, 160, 140); c.beginPath(); c.moveTo(bx - 10, by + 30); c.lineTo(bx + 80, by); c.lineTo(bx + 170, by + 30); c.fill(); for (let i = 0; i < 4; i++) { c.fillStyle = "#8fa0bf"; c.fillRect(bx + 15 + i * 38, by + 45, 10, 110); }
    TX(c, st.failed ? "BANK FAILED" : "BANK", bx + 80, by + 190, st.failed ? "#ff6b81" : "#cfd8ea", "center", "600 13px");
    // depositors: those still trusting (inside, blue) and those queuing to withdraw (outside, red)
    for (let i = 0; i < 200; i++) { const out = i < nOut, col = out ? "#ff6b81" : run.ins[i] ? "#7ee787" : "#5ad1ff"; let x, y; if (out) { x = bx + 185 + (i % 14) * 11; y = by + 175 - Math.floor(i / 14) * 12; } else { const j = i - nOut; x = 30 + (j % 18) * 12; y = h - 20 - Math.floor(j / 18) * 14; } person(c, x, y, 4, col); }
    TX(c, "red: queuing to withdraw · blue: staying · green: insured", 30, h - 20 - 12 * 14 - 10, "#8fa0bf", "left", "11px");
    // balance sheet
    const sx = w - 190, sy = 70, scl = 1.4, A = st.R + st.L, Lb = 200 - st.f * 200; TX(c, "Balance sheet (£)", sx, sy - 10, "#eef2f8", "left", "600 12.5px");
    c.fillStyle = "#7ee787"; c.fillRect(sx, sy, 60, st.R * scl); c.fillStyle = "#5ad1ff"; c.fillRect(sx, sy + st.R * scl, 60, st.L * scl); TX(c, "assets", sx + 30, sy + A * scl + 14, "#aab6cc", "center", "11px");
    c.fillStyle = "#c4a1ff"; c.fillRect(sx + 90, sy, 60, Lb * scl); if (st.equity > 0) { c.fillStyle = "#ffd166"; c.fillRect(sx + 90, sy + Lb * scl, 60, st.equity * scl); } TX(c, "deposits + capital", sx + 120, sy + (Lb + Math.max(0, st.equity)) * scl + 14, "#aab6cc", "center", "11px");
    TX(c, `cash £${st.R.toFixed(0)}`, sx - 4, sy + 10, "#7ee787", "right", "10.5px"); TX(c, `loans £${st.L.toFixed(0)}`, sx - 4, sy + st.R * scl + 14, "#5ad1ff", "right", "10.5px"); TX(c, `capital £${st.equity.toFixed(0)}`, sx + 120, sy + (Lb + Math.max(0, st.equity)) * scl + 30, st.equity < 0 ? "#ff6b81" : "#ffd166", "center", "10.5px");
  } else if (P.view === "hazard") { TX(c, "200 banks choosing how much to lend riskily", 24, 34, "#eef2f8", "left", "600 15px"); const r = K.rng(seed * 31 + 1);
    for (let b = 0; b < 200; b++) { const x = bankChoice(P.bailout, 0.6 * r.gauss()), gx = 30 + (b % 20) * 26, gy = 60 + Math.floor(b / 20) * 26; c.fillStyle = `hsl(${120 - 120 * x},65%,50%)`; c.fillRect(gx, gy, 20, 20); }
    let tx = 30 + 20 * 26 + 20, ty = 70; TX(c, "green: safe lending · red: risky lending", tx, ty, "#8fa0bf", "left", "11.5px"); ty += 26;
    TX(c, `Chance of a bailout: ${(100 * P.bailout).toFixed(0)}%`, tx, ty, "#cfd8ea", "left", "13px"); ty += 22; TX(c, `Average risky share: ${(100 * mh.risky).toFixed(0)}%`, tx, ty, "#ffd166", "left", "600 14px"); ty += 22; TX(c, `Banks failing over 10 years: ${mh.fails}`, tx, ty, "#ff6b81", "left", "13px"); ty += 22; TX(c, `Cost to taxpayers: £${mh.cost.toFixed(0)} million`, tx, ty, "#cfd8ea", "left", "13px"); ty += 30;
    WRAP(c, P.bailout > 0.5 ? "Depositors expect to be rescued, so they do not charge risky banks more. Shareholders keep the profits in good years; taxpayers pay in crashes." : "Depositors expect to lose money if the bank fails, so they demand higher interest from risky banks: most banks stay safe.", tx, ty, w - tx - 20, 16, "#aab6cc", "12px");
  } else { mt = Math.min(mk.length, mt + (dt || 0.016) * 40); TX(c, "A market of fundamentalists and speculators", 24, 34, "#eef2f8", "left", "600 15px");
    const k = Math.max(2, Math.floor(mt)), S = mk.slice(0, k), mx = Math.max(...mk.map(q => Math.max(q[1], q[2]))) * 1.05, mn = Math.min(...mk.map(q => Math.min(q[1], q[2]))) * 0.95, x0 = 40, x1 = w - 130, y0 = 60, y1 = h - 50, X = t => x0 + (x1 - x0) * t / mk.length, Y = v => y1 - (y1 - y0) * (v - mn) / (mx - mn);
    c.strokeStyle = "#8fa0bf"; c.setLineDash([5, 4]); c.beginPath(); S.forEach((q, i) => i ? c.lineTo(X(q[0]), Y(q[2])) : c.moveTo(X(q[0]), Y(q[2]))); c.stroke(); c.setLineDash([]);
    c.strokeStyle = "#ffb454"; c.lineWidth = 2; c.beginPath(); S.forEach((q, i) => i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1]))); c.stroke(); c.lineWidth = 1;
    TX(c, "price", X(S[k - 1][0]) + 4, Y(S[k - 1][1]), "#ffb454", "left", "600 12px"); TX(c, "fundamental value", X(S[k - 1][0]) + 4, Y(S[k - 1][2]) + 14, "#8fa0bf", "left", "11px");
    TX(c, `${(100 * P.share).toFixed(0)}% speculators: buy because the price has risen`, x0, y1 + 26, "#cfd8ea", "left", "12px"); }
  ui.hud("");
}
// remember slow summary curves until the settings change
const memo = {}; const once = (key, f) => memo[key] || (memo[key] = f());
function charts() { chA.opts.xFmt = null; chB.opts.xFmt = null; const lab = l => l.forEach((t, i) => label(i, t));
  if (P.view === "bond") { const rs = []; for (let r = 0.005; r <= 0.12; r += 0.0025) rs.push(r);
    chA.opts.title = "Bond price against the interest rate"; chA.opts.xLabel = "market interest rate (%)"; chA.opts.yLabel = "price (£)"; chA.draw([2, 10, 30].map((n, i) => ({ pts: rs.map(r => [100 * r, bondPrice(r, n)]), color: ["#7ee787", "#ffd166", "#ff6b81"][i], label: n + " years", width: n === P.n ? 3 : 1.5 })).concat([{ pts: [[100 * P.r, bondPrice(P.r, P.n)]], type: "dots", r: 6, color: "#fff", label: "now" }]), { xMin: 0, xMax: 12, yMin: 0 });
    chB.opts.title = "Yield against price"; chB.opts.xLabel = "price (£)"; chB.opts.yLabel = "yield (%)"; const ps = []; for (let p = 50; p <= 160; p += 2) ps.push([p, 500 / p]); chB.draw([{ pts: ps, color: "#5ad1ff", label: "yield = 5 ÷ price" }, { pts: [[bondPrice(P.r, P.n), 500 / bondPrice(P.r, P.n)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0 });
    lab(["interest rate", "price", "yield", "price change if rates rise 1 point"]); const p = bondPrice(P.r, P.n); read.set("a", (100 * P.r).toFixed(1) + "%"); read.set("b", "£" + p.toFixed(2)); read.set("c", (500 / p).toFixed(2) + "%"); read.set("d", (100 * (bondPrice(P.r + 0.01, P.n) / p - 1)).toFixed(1) + "%");
  } else if (P.view === "bank") { const k = Math.floor(step), path = run.path.slice(0, k + 1);
    chA.opts.title = "Share of depositors withdrawing"; chA.opts.xLabel = "round of the run"; chA.opts.yLabel = "%"; chA.draw([{ pts: [[0, 0]].concat(path.map(q => [q.k + 1, 100 * q.f])), color: "#ff6b81", label: "withdrawn" }], { xMin: 0, xMax: Math.max(5, run.path.length), yMin: 0, yMax: 100 });
    const ws = once("bank" + [P.reserve, P.capital, P.lolr, P.insured], () => { const ws = []; for (let w = 0; w <= 0.4; w += 0.02) { let f = 0; for (let s = 0; s < 20; s++) if (bankRun(Object.assign({}, P, { rumour: w }), K.rng(1000 + s)).failed) f++; ws.push([100 * w, 5 * f]); } return ws; });
    chB.opts.title = "Chance of failure against rumour size"; chB.opts.xLabel = "rumour (%)"; chB.opts.yLabel = "% of banks failing"; chB.draw([{ pts: ws, color: "#ffb454", label: "these settings" }], { xMin: 0, xMax: 40, yMin: 0, yMax: 100, vlines: [{ x: 100 * P.rumour, label: "now" }] });
    const st = run.path[k]; lab(["withdrawn", "cash left", "capital", "outcome"]); read.set("a", (100 * st.f).toFixed(0) + "%"); read.set("b", "£" + st.R.toFixed(0)); read.set("c", "£" + st.equity.toFixed(1)); read.set("d", run.failed && k === run.path.length - 1 ? "failed" : k === run.path.length - 1 ? "survived" : "…");
  } else if (P.view === "hazard") { const bs = [0, 0.2, 0.4, 0.6, 0.8, 1], res = once("mh", () => bs.map(b => moralHazard(b, K.rng(77))));
    chA.opts.title = "Risky lending against bailout chance"; chA.opts.xLabel = "chance of a bailout"; chA.opts.yLabel = "average risky share"; chA.draw([{ pts: bs.map((b, i) => [b, res[i].risky]), color: "#ff6b81", label: "" }, { pts: [[P.bailout, mh.risky]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    chB.opts.title = "Failures and cost to taxpayers"; chB.opts.xLabel = "chance of a bailout"; chB.opts.yLabel = "banks failing / £m"; chB.draw([{ pts: bs.map((b, i) => [b, res[i].fails]), color: "#ffb454", label: "failures (of 200)" }, { pts: bs.map((b, i) => [b, res[i].cost]), color: "#c4a1ff", label: "taxpayer cost £m" }], { xMin: 0, xMax: 1, yMin: 0 });
    lab(["bailout chance", "risky share", "failures", "taxpayer cost"]); read.set("a", (100 * P.bailout).toFixed(0) + "%"); read.set("b", (100 * mh.risky).toFixed(0) + "%"); read.set("c", mh.fails + " of 200"); read.set("d", "£" + mh.cost.toFixed(0) + "m");
  } else { const k = Math.max(2, Math.floor(mt)), S = mk.slice(0, k);
    chA.opts.title = "Mispricing: (price − value) ÷ value"; chA.opts.xLabel = "day"; chA.opts.yLabel = "%"; chA.draw([{ pts: S.map(q => [q[0], 100 * (q[1] - q[2]) / q[2]]), color: "#ffb454", label: "" }], { xMin: 0, xMax: mk.length, hlines: [{ y: 0, color: "rgba(255,255,255,.3)" }] });
    const ss = once("mk", () => [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(s => [s, K.mean([1, 2, 3].map(q => mispricing(market(s, K.rng(q)))))])); chB.opts.title = "Mispricing against speculators"; chB.opts.xLabel = "share of speculators"; chB.opts.yLabel = "SD of mispricing (%)"; chB.draw([{ pts: ss, color: "#5ad1ff", label: "" }], { xMin: 0, xMax: 0.8, yMin: 0, vlines: [{ x: P.share, label: "now" }] });
    lab(["speculators", "price now", "value now", "SD of mispricing"]); read.set("a", (100 * P.share).toFixed(0) + "%"); read.set("b", S[k - 1][1].toFixed(1)); read.set("c", S[k - 1][2].toFixed(1)); read.set("d", mispricing(mk).toFixed(1) + "%"); }
}
let frame = 0;
ui.onLevel = () => { sync(); if (ui.level !== "adv" && P.view !== "bank") set({ view: "bank" }); };
ui.run(() => { }, dt => { draw(dt > 0 ? dt : 0.016); if (frame++ % 6 === 0) charts(); });
set({ view: "bank" });
ui.tip("Four pieces of the financial system. Try a rumour at the bank, then the lender of last resort.", 7000);
