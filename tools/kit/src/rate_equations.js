/* =====================================================================
   RATE EQUATIONS AND KINETICS
   The RATE of a reaction is how fast a concentration changes:
        rate = −d[reactant]/dt = gradient of the concentration–time graph
   Experiments show that the rate depends on concentrations raised to
   powers called ORDERS (found by experiment, not from the equation):
        rate = k [A]^m [B]^n         (k: the rate constant)
     zero order    [A] falls in a straight line; rate does not depend on [A]
     first order   [A] = [A]₀ e^(−kt); constant HALF-LIFE t½ = ln 2 ÷ k
     second order  1/[A] = 1/[A]₀ + kt; each half-life is double the last
   The rate equation tells us which particles are in the slowest step of
   the mechanism: the RATE-DETERMINING STEP.
   k rises with temperature (ARRHENIUS):  k = A e^(−Ea/RT), so
        ln k = ln A − (Ea/R)(1/T)       a straight line of gradient −Ea/R.
   This model uses the exact solutions of each rate equation, then adds
   the errors of real measurements (colorimeter noise, a water bath that
   wanders, a stopwatch pressed by a human) so that results scatter.
   ===================================================================== */
const R = 8.314;                                                           // gas constant, J K⁻¹ mol⁻¹
// k at temperature T (K) from the value at 298 K and the activation energy (kJ/mol)
const kAt = (rx, T) => rx.k298 * Math.exp(-rx.Ea * 1000 / R * (1 / T - 1 / 298));
/* The reactions. Each has: the species we monitor, its rate equation and mechanism, and k at 298 K (illustrative but realistic values). */
const RX = {
  iod: { name: "Propanone + iodine (acid catalyst)", eq: "CH₃COCH₃ + I₂ → CH₃COCH₂I + HI   (H⁺ catalyst)", rateEq: "rate = k[CH₃COCH₃][H⁺]", order: 0, ordTxt: "zero order in I₂, first order in propanone and in H⁺; second order overall", k298: 2.8e-5, kU: "dm³ mol⁻¹ s⁻¹", Ea: 86, mon: "[I₂]", how: "colorimeter (iodine is brown)", col: [150, 80, 20],
    mech: [["CH₃COCH₃ + H⁺ ⇌ CH₃C(OH⁺)CH₃", "fast"], ["CH₃C(OH⁺)CH₃ → CH₂=C(OH)CH₃ + H⁺", "slow: rate-determining"], ["CH₂=C(OH)CH₃ + I₂ → CH₃COCH₂I + HI", "fast"]], mechNote: "I₂ only joins after the slow step, so it is not in the rate equation: zero order in I₂." },
  sn1: { name: "Hydrolysis of 2-bromo-2-methylpropane (SN1)", eq: "(CH₃)₃CBr + OH⁻ → (CH₃)₃COH + Br⁻", rateEq: "rate = k[(CH₃)₃CBr]", order: 1, ordTxt: "first order in the bromoalkane, zero order in OH⁻", k298: 8e-3, kU: "s⁻¹", Ea: 90, mon: "[(CH₃)₃CBr]", how: "conductivity (Br⁻ ions are made)", col: [120, 200, 255],
    mech: [["(CH₃)₃C–Br → (CH₃)₃C⁺ + Br⁻", "slow: rate-determining"], ["(CH₃)₃C⁺ + OH⁻ → (CH₃)₃COH", "fast"]], mechNote: "Only the bromoalkane is in the slow step (one particle: unimolecular), so OH⁻ does not appear in the rate equation." },
  sn2: { name: "Hydrolysis of 1-bromobutane (SN2)", eq: "CH₃CH₂CH₂CH₂Br + OH⁻ → C₄H₉OH + Br⁻", rateEq: "rate = k[C₄H₉Br][OH⁻]", order: 2, ordTxt: "first order in each; second order overall", k298: 0.04, kU: "dm³ mol⁻¹ s⁻¹", Ea: 90, mon: "[C₄H₉Br]", how: "titration of samples with acid (OH⁻ is used up)", col: [120, 200, 255],
    mech: [["HO⁻ + C₄H₉Br → [HO···C···Br]⁻ → C₄H₉OH + Br⁻", "one step (bimolecular)"]], mechNote: "Both particles collide in the single step, so both appear in the rate equation." },
  own: { name: "Your own: rate = k[A]ⁿ", eq: "A → products", rateEq: "rate = k[A]ⁿ", order: 1, ordTxt: "", k298: 0.01, kU: "", Ea: 60, mon: "[A]", how: "colorimeter (A is purple)", col: [160, 60, 200], mech: [], mechNote: "" },
  clock: { name: "Iodine clock: H₂O₂ + iodide", eq: "H₂O₂ + 2I⁻ + 2H⁺ → I₂ + 2H₂O", rateEq: "rate = k[H₂O₂][I⁻]", order: 2, ordTxt: "first order in H₂O₂ and in I⁻, zero order in H⁺", k298: 0.0115, kU: "dm³ mol⁻¹ s⁻¹", Ea: 56, mon: "[H₂O₂]", how: "a stopwatch: thiosulfate removes the iodine until it runs out, then starch turns blue-black", col: [20, 20, 60],
    mech: [["H₂O₂ + I⁻ → IO⁻ + H₂O", "slow: rate-determining"], ["IO⁻ + I⁻ + 2H⁺ → I₂ + H₂O", "fast"], ["I₂ + 2S₂O₃²⁻ → 2I⁻ + S₄O₆²⁻", "fast, until the thiosulfate runs out"]], mechNote: "H⁺ joins after the slow step: zero order in H⁺." }
};
/* Exact concentrations at time t. Returns { c: monitored concentration, rate: −dc/dt, B: second reactant } */
function solve(key, P, T, t) {
  const rx = RX[key], k = kAt(rx, T);
  if (key === "iod") { const r0 = k * P.a * P.h; const c = Math.max(0, P.c0 - r0 * t); return { c, rate: c > 0 ? r0 : 0 }; }      // propanone and H⁺ in large excess: zero order in I₂
  if (key === "sn1") { const c = P.c0 * Math.exp(-k * t); return { c, rate: k * c, B: Math.max(0, P.b0 - (P.c0 - c)) }; }
  if (key === "sn2") {                                                    // A + B: exact second-order solution with unequal starting amounts
    const a = P.c0, b = P.b0; let x;
    if (Math.abs(a - b) < 1e-9) x = a - 1 / (1 / a + k * t); else { const E = Math.exp((a - b) * k * t); x = a * b * (E - 1) / (a * E - b); }
    return { c: a - x, rate: k * (a - x) * (b - x), B: b - x };
  }
  if (key === "own") { const n = P.n, a = P.c0; let c;
    if (n === 0) c = Math.max(0, a - k * t); else if (n === 1) c = a * Math.exp(-k * t); else c = 1 / (1 / a + k * t);
    return { c, rate: c > 0 ? k * Math.pow(c, n) : 0 }; }
  // clock: [I⁻] stays constant while thiosulfate turns the I₂ straight back into I⁻, so H₂O₂ decays first order with k[I⁻]
  const kk = k * P.i0, c = P.c0 * Math.exp(-kk * t);
  return { c, rate: kk * c };
}
// time for the clock to go blue-black: thiosulfate (s0) removes 2 S₂O₃²⁻ per I₂, so the clock goes when s0/2 of H₂O₂ has reacted
function clockTime(P, T) { const k = kAt(RX.clock, T) * P.i0, f = P.s0 / (2 * P.c0); return f >= 1 ? Infinity : -Math.log(1 - f) / k; }
// successive half-lives read off the exact curve
function halfLives(key, P, T, n = 3) { const out = []; let t0 = 0, c = solve(key, P, T, 0).c; for (let i = 0; i < n; i++) { const target = c / 2; let lo = t0, hi = t0 + 1; while (solve(key, P, T, hi).c > target && hi < 1e7) hi *= 2; for (let j = 0; j < 50; j++) { const m = (lo + hi) / 2; solve(key, P, T, m).c > target ? lo = m : hi = m; } out.push(hi - t0); t0 = hi; c = target; } return out; }
/* A simulated experiment: readings every dt seconds with noise (fraction of c0), in a bath whose temperature wanders by bathErr (K). */
function readings(key, P, T, tEnd, dt, noise, bathErr, r) { const Tr = T + bathErr * r.gauss(), out = []; for (let t = 0; t <= tEnd + 1e-9; t += dt) out.push([t, Math.max(0, solve(key, P, Tr, t).c + noise * P.c0 * r.gauss())]); return out; }
// half-life from noisy readings: the first time the data cross c0/2 (straight line between readings)
function measuredHalf(pts, c0) { for (let i = 1; i < pts.length; i++) if (pts[i][1] <= c0 / 2) { const [t1, y1] = pts[i - 1], [t2, y2] = pts[i]; return t1 + (y1 - c0 / 2) * (t2 - t1) / ((y1 - y2) || 1); } return null; }
// a clock time read by a person: their reaction time scatters (SD in s) and the bath wanders
const timedClock = (P, T, tErr, bathErr, r) => Math.max(0.5, clockTime(P, T + bathErr * r.gauss()) + tErr * r.gauss());
// Ea from a set of clock runs: fit ln(1/t) against 1/T, gradient = −Ea/R
function eaFromClock(Ts, P, tErr, bathErr, r) { const pts = Ts.map(T => [1 / T, Math.log(1 / timedClock(P, T, tErr, bathErr, r))]); return -K.linfit(pts).m * R / 1000; }

// ---------------- The page ----------------
const DEF = { rx: "iod", view: "mon", c0: 0.002, b0: 0.05, a: 1.0, h: 0.5, n: 1, i0: 0.05, s0: 0.001, T: 298, tan: 30, noise: 0.01, tErr: 0.4 };
const P = Object.assign({}, DEF);
let t = 0, speed = 4, runs = [], arr = [], dots = [], flashes = [], rnd = K.rng(Date.now() % 9973 + 11);
const ui = K.app({
  title: "Rate Equations and Kinetics", subject: "Chemistry",
  blurb: "Follow a reaction as it goes, measure rates from gradients and half-lives, find orders by initial rates, and find Ea from an Arrhenius plot",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 3(b) Rates of reaction: following a reaction (mass, gas volume or colour against time), rate from the gradient, the effect of concentration and temperature, the disappearing-cross and clock experiments.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 9 Kinetics I (rate from concentration–time graphs, the effect of temperature) and Topic 16 Kinetics II: rate equations, orders, the rate constant and its units, half-lives of first-order reactions, initial-rates and continuous-monitoring methods, the rate-determining step and mechanisms (SN1 and SN2), the Arrhenius equation (CP13 iodination of propanone, CP14 activation energy from a clock reaction)." } },
  missions: [
    { title: "Rate is a gradient", q: "Watch the iodine colour fade. Move the tangent to 20 s, 60 s and 120 s. Is the reaction slowing down?", hint: "The graph of [I₂] against time is a straight line, so every tangent has the same gradient: the rate stays the same until the iodine runs out. That is unusual: most reactions slow down as the reactant is used up. Iodine is not involved in the slow step, so its concentration does not matter.", setup() { set({ rx: "iod" }); } },
    { title: "A reaction that slows down", q: "Switch to 2-bromo-2-methylpropane. Measure the gradient at 0 s, 60 s and 120 s. Why does it fall?", hint: "As the bromoalkane is used up there are fewer particles to react each second, so the rate (the gradient) falls. The curve gets flatter and flatter.", setup() { set({ rx: "sn1", c0: 0.05 }); } },
    { title: "Double the concentration", q: "Bromoalkane at 0.025, then 0.050 mol dm⁻³. Compare the starting gradients.", hint: "Doubling the concentration doubles the starting rate: more particles in the same volume, so more successful collisions each second.", setup() { set({ rx: "sn1", c0: 0.025 }); } },
    { title: "Warm it up", q: "Run the bromoalkane at 25 °C and then at 35 °C. How much faster is it?", hint: "About 3 times faster for 10 °C here. A small rise in temperature gives many more particles with at least the activation energy.", setup() { set({ rx: "sn1", c0: 0.05, T: 298 }); } },
    { title: "The iodine clock", q: "Go to Initial rates. Record the clock time with [I⁻] = 0.02, 0.04 and 0.08 mol dm⁻³. How does 1/time change?", hint: "1/t is proportional to the initial rate. Doubling [I⁻] doubles 1/t (halves the time): first order in iodide.", setup() { set({ rx: "clock", view: "init", i0: 0.02 }); } },
    { lvl: "adv", title: "Constant half-life", q: "First-order bromoalkane. Read the first three half-lives. Then double the starting concentration: do they change?", hint: "Each half-life is the same (about 87 s at 25 °C) and does not depend on the starting concentration: the sign of a first-order reaction. t½ = ln 2 ÷ k, so k ≈ 0.008 s⁻¹.", setup() { set({ rx: "sn1", c0: 0.05 }); } },
    { lvl: "adv", title: "Half-lives that grow", q: "1-bromobutane with equal [RBr] and [OH⁻]. Read three half-lives. What is the pattern?", hint: "Each half-life is double the last: the sign of second order (here first order in each of two reactants at the same concentration). t½ = 1 ÷ (k[A]₀).", setup() { set({ rx: "sn2", c0: 0.05, b0: 0.05 }); } },
    { lvl: "adv", title: "Pseudo-first order", q: "Make OH⁻ 20 times more concentrated than the 1-bromobutane. Now what are the half-lives like?", hint: "OH⁻ hardly changes, so rate = k[RBr][OH⁻] ≈ k′[RBr] with k′ = k[OH⁻]: the half-lives become constant. Swamping one reactant is how chemists find the order of the other.", setup() { set({ rx: "sn2", c0: 0.005, b0: 0.1 }); } },
    { lvl: "adv", title: "What the rate equation tells you", q: "Propanone and iodine: change [I₂], then [H⁺]. Which change alters the gradient? Look at the mechanism.", hint: "[H⁺] and [propanone] change the rate, [I₂] does not. So the rate-determining step involves propanone and H⁺; iodine reacts in a later, fast step (CP13).", setup() { set({ rx: "iod" }); } },
    { lvl: "adv", title: "Orders from initial rates", q: "Initial rates with the clock: vary [H₂O₂] with [I⁻] fixed, then [I⁻] with [H₂O₂] fixed. Deduce the rate equation and calculate k.", hint: "Both are first order: rate = k[H₂O₂][I⁻]. Each 1/t is proportional to the rate; the true k at 25 °C is 0.0115 dm³ mol⁻¹ s⁻¹ (units: rate ÷ two concentrations).", setup() { set({ rx: "clock", view: "init" }); } },
    { lvl: "adv", title: "CP14: the Arrhenius plot", q: "Go to Arrhenius and record clock times at five temperatures from 20 °C to 50 °C. Plot ln(1/t) against 1/T and find Ea from the gradient.", hint: "Gradient = −Ea/R. The clock reaction has Ea ≈ 56 kJ/mol. A stopwatch error of a few tenths of a second matters most at the hottest, fastest runs.", setup() { set({ rx: "clock", view: "arr" }); } }
  ],
  batch: [
    { title: "First order: does t½ depend on [A]₀?", question: "Measure the half-life of 2-bromo-2-methylpropane at different starting concentrations.", how: "25 °C; readings every 5 s with 1% noise; the bath wanders by 0.3 K.", xLabel: "[RBr]₀ (mol dm⁻³)", yLabel: "half-life (s)", xs: [0.01, 0.02, 0.04, 0.06, 0.08, 0.1], reps: 8, yMin: 0, theory: () => Math.LN2 / kAt(RX.sn1, 298), theoryLabel: "ln 2 ÷ k", run: (c0, r) => measuredHalf(readings("sn1", { c0, b0: 1 }, 298, 400, 5, 0.01, 0.3, r), c0), note: "The half-life is the same at every starting concentration: first order. The scatter comes from the noise and the bath." },
    { title: "Second order: t½ against [A]₀", question: "Measure the first half-life of 1-bromobutane + OH⁻ (equal concentrations) at different starting concentrations.", how: "25 °C; readings every 10 s with 1% noise.", xLabel: "[RBr]₀ = [OH⁻]₀ (mol dm⁻³)", yLabel: "half-life (s)", xs: [0.02, 0.04, 0.06, 0.08, 0.1], reps: 8, yMin: 0, theory: c0 => 1 / (kAt(RX.sn2, 298) * c0), theoryLabel: "1 ÷ (k[A]₀)", run: (c0, r) => measuredHalf(readings("sn2", { c0, b0: c0 }, 298, 3000, 10, 0.01, 0.3, r), c0), note: "Double the starting concentration and the half-life halves: second order." },
    { title: "Zero order in iodine", question: "Does the rate of iodination depend on how much iodine you start with?", how: "Propanone 1.0, H⁺ 0.5 mol dm⁻³, 25 °C; the rate is the gradient of a best-fit line through colorimeter readings every 5 s for 60 s (1% noise).", xLabel: "[I₂]₀ (mol dm⁻³ × 1000)", yLabel: "rate (mol dm⁻³ s⁻¹ × 10⁶)", xs: [1, 1.5, 2, 2.5, 3], reps: 8, yMin: 0, theory: () => 1e6 * kAt(RX.iod, 298) * 0.5, theoryLabel: "k[propanone][H⁺]", run: (x, r) => { const P = { c0: x / 1000, a: 1, h: 0.5 }; return -1e6 * K.linfit(readings("iod", P, 298, 60, 5, 0.01, 0.3, r)).m; }, note: "A flat line: changing [I₂] does not change the rate. Iodine is zero order (CP13)." },
    { title: "Iodine clock: 1/t against [I⁻]", question: "How does the clock time depend on the iodide concentration?", how: "[H₂O₂] 0.02, thiosulfate 0.001 mol dm⁻³, 25 °C; a person with a 0.4 s reaction-time scatter presses the stopwatch.", xLabel: "[I⁻] (mol dm⁻³)", yLabel: "1/t (s⁻¹)", xs: [0.02, 0.04, 0.06, 0.08, 0.1], reps: 6, yMin: 0, fit: true, theory: i0 => 1 / clockTime({ c0: 0.02, i0, s0: 0.001 }, 298), theoryLabel: "exact 1/t", run: (i0, r) => 1 / timedClock({ c0: 0.02, i0, s0: 0.001 }, 298, 0.4, 0.3, r), note: "A straight line through the origin: 1/t ∝ [I⁻], first order in iodide." },
    { title: "CP14: Arrhenius plot", question: "Plot ln(1/t) against 1/T for the iodine clock. What is the gradient?", how: "[H₂O₂] 0.02, [I⁻] 0.05, thiosulfate 0.001 mol dm⁻³; stopwatch scatter 0.4 s; bath ±0.3 K.", xLabel: "1000 ÷ T (K⁻¹)", yLabel: "ln(1/t)", xs: [3.1, 3.2, 3.3, 3.4, 3.5], reps: 6, fit: true, theory: x => Math.log(1 / clockTime({ c0: 0.02, i0: 0.05, s0: 0.001 }, 1000 / x)), theoryLabel: "Ea = 56 kJ/mol", run: (x, r) => Math.log(1 / timedClock({ c0: 0.02, i0: 0.05, s0: 0.001 }, 1000 / x, 0.4, 0.3, r)), note: "A straight line. Gradient × 1000 = −Ea/R, so Ea = −gradient × 8.314 J/mol ≈ 56 kJ/mol." },
    { title: "How good is one class's Ea?", question: "If 300 students each do a five-temperature clock experiment, how much do their activation energies vary?", how: "20, 30, 40, 50 and 60 °C; stopwatch scatter 0.4 s; bath ±0.5 K.", yLabel: "Ea measured (kJ/mol)", reps: 300, bins: 24, theory: 56, theoryLabel: "true Ea", run: (x, r) => eaFromClock([293, 303, 313, 323, 333], { c0: 0.02, i0: 0.05, s0: 0.001 }, 0.4, 0.5, r), note: "Most are within a few kJ/mol. The hottest runs are short, so the same stopwatch error is a bigger fraction of the time there." },
    { lvl: "adv", title: "Reaction time and the error in Ea", question: "How does the stopwatch error affect the spread of the measured Ea?", how: "Five temperatures, 20–60 °C; |Ea measured − 56| for 60 students at each stopwatch error.", xLabel: "stopwatch reaction-time SD (s)", yLabel: "|error in Ea| (kJ/mol)", xs: [0, 0.2, 0.4, 0.8, 1.2, 1.6], reps: 60, yMin: 0, run: (e, r) => Math.abs(eaFromClock([293, 303, 313, 323, 333], { c0: 0.02, i0: 0.05, s0: 0.001 }, e, 0.3, r) - 56), note: "With no stopwatch error only the bath wobble remains. A bigger error spoils the result: use more thiosulfate (longer times) to make it a smaller percentage." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 3(b)", text: "The rate of a reaction can be followed by measuring a concentration (or mass, gas volume or colour) at intervals. Rate = change ÷ time = the gradient of the graph." },
      { lvl: "std", tag: "4CH1 3(b)", text: "Most reactions slow down as they go because the reactants are used up: fewer particles per volume, fewer successful collisions per second." },
      { lvl: "std", tag: "4CH1 3(b)", text: "A higher concentration or temperature gives a faster rate. In a clock or disappearing-cross experiment, 1/time is a measure of the rate." },
      { lvl: "adv", tag: "9CH0 16", text: "Rate equation: rate = k[A]ᵐ[B]ⁿ. Orders are found by experiment. Overall order = m + n. Units of k: (mol dm⁻³)^(1 − overall order) s⁻¹." },
      { lvl: "adv", tag: "9CH0 16", text: "Concentration–time graphs: zero order is a straight line; first order has a constant half-life, t½ = ln 2 ÷ k; second order has each half-life double the last." },
      { lvl: "adv", tag: "9CH0 16", text: "Rate–concentration graphs: zero order flat, first order a straight line through the origin, second order a curve (rate ∝ [A]²)." },
      { lvl: "adv", tag: "9CH0 16", text: "The rate-determining step is the slowest step; species in the rate equation take part in it or before it. SN1: rate = k[RX] (tertiary); SN2: rate = k[RX][OH⁻] (primary)." },
      { lvl: "adv", tag: "9CH0 16", text: "Arrhenius: k = A e^(−Ea/RT). A graph of ln k (or ln 1/t) against 1/T is a straight line of gradient −Ea/R (CP14)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "In a clock experiment the time halves when the concentration of one reactant is doubled. What does this tell you about the rate?", ans: "<ul><li>1/time doubles, so the rate doubles</li><li>the rate is proportional to that concentration</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why the rate of most reactions decreases as the reaction goes on.", ans: "<ul><li>reactants are used up, so their concentration falls</li><li>fewer particles in a given volume</li><li>fewer (successful) collisions per second</li></ul>" },
      { lvl: "adv", marks: 2, q: () => { const h = halfLives("sn1", P, P.T, 1)[0]; return `A first-order reaction has a half-life of ${h.toFixed(0)} s. Calculate the rate constant, with units.`; }, ans: () => { const h = halfLives("sn1", P, P.T, 1)[0]; return `<ul><li>k = ln 2 ÷ t½ = 0.693 ÷ ${h.toFixed(0)}</li><li>= ${K.sig(Math.LN2 / h)} s⁻¹</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "The rate equation for the hydrolysis of 2-bromo-2-methylpropane is rate = k[(CH₃)₃CBr]. Explain what this shows about the mechanism.", ans: "<ul><li>OH⁻ is not in the rate-determining step</li><li>the slow step involves only the bromoalkane: it ionises to a carbocation and Br⁻ (SN1)</li><li>the carbocation then reacts quickly with OH⁻</li></ul>" },
      { lvl: "adv", marks: 3, q: "A plot of ln k against 1/T has a gradient of −6700 K. Calculate the activation energy in kJ mol⁻¹.", ans: "<ul><li>gradient = −Ea/R</li><li>Ea = 6700 × 8.314 = 55 700 J mol⁻¹</li><li>= 55.7 kJ mol⁻¹</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Each reaction follows its rate equation exactly: zero order [A] = [A]₀ − kt; first order [A] = [A]₀e^(−kt); second order in one reactant 1/[A] = 1/[A]₀ + kt; first order in each of two reactants uses the exact A + B solution.</li>
<li>Iodination of propanone: propanone (1.0 mol dm⁻³) and H⁺ are in such excess that they hardly change, so [I₂] falls in a straight line at rate k[propanone][H⁺]. The HI made adds slightly to [H⁺]; this is ignored.</li>
<li>Iodine clock: while thiosulfate is present it turns I₂ back into I⁻, so [I⁻] stays constant and H₂O₂ is used up first order with k[I⁻]. The clock goes when (thiosulfate ÷ 2) of H₂O₂ has reacted: t = −ln(1 − [S₂O₃²⁻]/2[H₂O₂]) ÷ (k[I⁻]).</li>
<li>k changes with temperature by the Arrhenius equation from the value at 298 K: Ea = 86 (propanone), 90 (bromoalkanes), 56 (clock) kJ mol⁻¹. The values of k are realistic but illustrative; real ones depend on the solvent.</li>
<li>Measurement errors: colorimeter or titration readings scatter by a percentage of [A]₀ (the noise slider); the water bath wanders (±0.3 K); a person presses the stopwatch with a reaction-time scatter (slider).</li>
<li>The molecule picture shows 200 molecules standing for the starting concentration; they disappear in step with the exact solution.</li></ul>
<h3>Simplifications</h3>
<ul><li>No heat is given out or taken in, so the temperature stays where it is set.</li><li>Reactions do not go backwards (no equilibrium).</li><li>Mixing is instant, and time starts when the solutions are mixed.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Reaction");
ctl.rx = K.seg(g, { value: "iod", options: [["iod", "Propanone + I₂"], ["sn1", "SN1 bromoalkane"], ["sn2", "SN2 bromoalkane"], ["clock", "Iodine clock"], ["own", "Your own"]], on: v => { P.rx = v; defaults(); restart(); } });
ctl.view = K.seg(g, { label: "Method", value: "mon", options: [["mon", "Continuous monitoring"], ["init", "Initial rates"], ["arr", "Arrhenius"]], on: v => { P.view = v; restart(); } });
g = ui.group("Concentrations (mol dm⁻³)");
const lg = v => Math.pow(10, v);
ctl.c0 = K.slider(g, { label: "Reactant monitored", min: -3.3, max: -0.7, step: 0.01, value: Math.log10(P.c0), fmt: v => K.sig(lg(v), 2), on: v => { P.c0 = +K.sig(lg(v), 2); restart(); } });
ctl.b0 = K.slider(g, { label: "Second reactant: OH⁻ (SN2)", min: -2, max: 0, step: 0.01, value: Math.log10(P.b0), fmt: v => K.sig(lg(v), 2), on: v => { P.b0 = +K.sig(lg(v), 2); restart(); } });
ctl.a = K.slider(g, { label: "Propanone", min: 0.25, max: 2, step: 0.25, value: 1, fmt: v => v.toFixed(2), on: v => { P.a = v; restart(); } });
ctl.h = K.slider(g, { label: "H⁺ (acid catalyst)", min: 0.25, max: 1.5, step: 0.25, value: 0.5, fmt: v => v.toFixed(2), on: v => { P.h = v; restart(); } });
ctl.i0 = K.slider(g, { label: "I⁻ (clock)", min: 0.01, max: 0.1, step: 0.01, value: 0.05, fmt: v => v.toFixed(2), on: v => { P.i0 = v; restart(); } });
ctl.s0 = K.slider(g, { label: "Thiosulfate (clock)", min: 0.0005, max: 0.004, step: 0.0005, value: 0.001, fmt: v => v.toFixed(4), on: v => { P.s0 = v; restart(); } });
ctl.n = K.seg(g, { label: "Order n (your own)", value: 1, options: [[0, "0"], [1, "1"], [2, "2"]], on: v => { P.n = v; restart(); } });
g = ui.group("Conditions and measuring");
ctl.T = K.slider(g, { label: "Temperature", min: 283, max: 333, step: 1, value: 298, fmt: v => `${(v - 273).toFixed(0)} °C (${v} K)`, on: v => { P.T = v; restart(); } });
ctl.tan = K.slider(g, { label: "Tangent drawn at", min: 0, max: 600, step: 1, value: 30, unit: "s", on: v => P.tan = v });
ctl.noise = K.slider(g, { label: "Measuring noise", min: 0, max: 0.05, step: 0.005, value: 0.01, fmt: v => (v * 100).toFixed(1) + "% of [A]₀", on: v => P.noise = v });
ctl.tErr = K.slider(g, { label: "Your stopwatch reaction time (SD)", min: 0, max: 1.5, step: 0.1, value: 0.4, unit: "s", on: v => P.tErr = v });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 60, step: 1, value: 4, fmt: v => v + "× real time", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
let rr = K.row(g); K.btn(rr, "↺ Start again", () => restart(), "primary"); K.btn(rr, "📝 Record this run", () => record()); K.btn(rr, "🗑 Clear table", () => { runs = []; arr = []; });
const read = K.readout(ui.group("Readings"), [["t", "time"], ["c", "concentration"], ["r", "rate now"], ["tan", "gradient of tangent"], ["h", "half-lives"], ["k", "k at this T"]]);
function defaults() { const d = { iod: { c0: 0.002 }, sn1: { c0: 0.05, b0: 0.1 }, sn2: { c0: 0.05, b0: 0.05 }, clock: { c0: 0.02 }, own: { c0: 0.1 } }[P.rx]; Object.assign(P, d); sync(); }
function sync() { ctl.rx.set(P.rx); ctl.view.set(P.view); ctl.c0.set(Math.log10(P.c0)); ctl.b0.set(Math.log10(P.b0)); ctl.a.set(P.a); ctl.h.set(P.h); ctl.i0.set(P.i0); ctl.s0.set(P.s0); ctl.n.set(P.n); ctl.T.set(P.T); ctl.tan.set(P.tan); ctl.noise.set(P.noise); ctl.tErr.set(P.tErr);
  const show = (c, on) => c.el.style.display = on ? "" : "none"; show(ctl.b0, P.rx === "sn2" || P.rx === "sn1"); show(ctl.a, P.rx === "iod"); show(ctl.h, P.rx === "iod"); show(ctl.i0, P.rx === "clock"); show(ctl.s0, P.rx === "clock"); show(ctl.n, P.rx === "own"); show(ctl.tErr, P.rx === "clock"); }
function set(o) { Object.assign(P, DEF, o); if (!("c0" in o)) { const keep = Object.assign({}, o); defaults(); Object.assign(P, keep); } sync(); runs = []; arr = []; restart(); }
function restart() { t = 0; dots = []; for (let i = 0; i < 200; i++) dots.push({ x: rnd(), y: rnd(), alive: true, vx: 0, vy: 0 }); flashes = []; sync(); }
// the run is over when 99% has gone (or the clock has gone)
const tEndFor = () => { if (P.rx === "clock") return Math.min(900, clockTime(P, P.T) * 1.3 + 5); const h = halfLives(P.rx, P, P.T, 1)[0]; return Math.min(5000, P.rx === "iod" || (P.rx === "own" && P.n === 0) ? h * 2.2 : h * 6); };
function record() {
  if (P.rx === "clock") { const tc = timedClock(P, P.T, P.tErr, 0.3, rnd); const row = { c0: P.c0, i0: P.i0, s0: P.s0, T: P.T, t: tc };
    if (P.view === "arr") arr.push(row); else runs.push(row); ui.tip(`Clock time recorded: ${tc.toFixed(1)} s`, 3000); return; }
  const pts = readings(P.rx, P, P.T, Math.min(tEndFor() * 0.15, 60), Math.max(1, tEndFor() / 200), P.noise, 0.3, rnd).slice(0, 8), f = K.linfit(pts), row = { c0: P.c0, b0: P.b0, a: P.a, h: P.h, T: P.T, rate: -f.m, k: kAt(RX[P.rx], P.T * (1 + 0.001 * rnd.gauss())) };
  if (P.view === "arr") arr.push(row); else runs.push(row); ui.tip(`Initial rate recorded: ${K.sig(-f.m)} mol dm⁻³ s⁻¹`, 3000);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// write text wrapped to a width; returns the y of the next line
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, rx = RX[P.rx], adv = ui.level === "adv", S = solve(P.rx, P, P.T, t), frac = P.c0 > 0 ? S.c / P.c0 : 0;
  c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  // ---- the beaker ----
  const bx = 30, by = 40, bw = Math.min(170, w * 0.18), bh = h - 150;
  let fill; if (P.rx === "clock") fill = t >= clockTime(P, P.T) ? "rgba(20,20,70,.95)" : "rgba(200,220,255,.18)"; else if (P.rx === "sn1" || P.rx === "sn2") fill = "rgba(200,220,255,.18)"; else { const [r_, g_, b_] = rx.col; fill = `rgba(${r_},${g_},${b_},${0.12 + 0.75 * frac})`; }
  c.fillStyle = fill; c.fillRect(bx, by + bh * 0.25, bw, bh * 0.75); c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by + bh); c.lineTo(bx + bw, by + bh); c.lineTo(bx + bw, by); c.stroke(); c.lineWidth = 1;
  TX(c, `${(P.T - 273).toFixed(0)} °C water bath`, bx + bw / 2, by + bh + 22, "#8fa0bf", "center", "11.5px");
  TX(c, "Measured by:", bx, by + bh + 42, "#8fa0bf", "left", "11px"); WRAP(c, rx.how, bx, by + bh + 57, bw + 10, 14, "#cfd8ea", "11px");
  if (P.rx === "clock") { const tc = clockTime(P, P.T); TX(c, t >= tc ? `BLUE-BLACK at ${tc.toFixed(1)} s` : "colourless…", bx + bw / 2, by + bh * 0.6, t >= tc ? "#ffd166" : "#cfd8ea", "center", "600 13px"); }
  // ---- molecules: 200 dots stand for [A]₀; they vanish in step with the exact solution ----
  const mx = bx + bw + 30, my = 40, mw = Math.min(300, w * 0.3), mh = Math.min(300, h - 120);
  c.strokeStyle = "rgba(255,255,255,.25)"; c.strokeRect(mx, my, mw, mh); TX(c, `Molecules of ${rx.mon.replace(/[\[\]]/g, "")} (each dot = ½% of the start)`, mx, my - 8, "#8fa0bf", "left", "11px");
  const target = Math.round(200 * frac); let alive = dots.filter(d => d.alive).length;
  while (alive > target) { const live = dots.filter(d => d.alive), d = live[Math.floor(rnd() * live.length)]; d.alive = false; flashes.push({ x: d.x, y: d.y, a: 1 }); alive--; }
  for (const d of dots) { d.vx = 0.9 * d.vx + 0.002 * rnd.gauss(); d.vy = 0.9 * d.vy + 0.002 * rnd.gauss(); d.x = Math.min(0.98, Math.max(0.02, d.x + d.vx)); d.y = Math.min(0.98, Math.max(0.02, d.y + d.vy));
    c.fillStyle = d.alive ? (P.rx === "clock" ? "#9fb4ff" : `rgb(${rx.col.map(v => Math.min(255, v + 60)).join(",")})`) : "rgba(126,231,135,.35)"; c.beginPath(); c.arc(mx + d.x * mw, my + d.y * mh, d.alive ? 3.2 : 2, 0, 6.3); c.fill(); }
  for (const f of flashes) { c.strokeStyle = `rgba(255,209,102,${f.a})`; c.beginPath(); c.arc(mx + f.x * mw, my + f.y * mh, 8 * (1.6 - f.a), 0, 6.3); c.stroke(); f.a -= (dt || 0.016) * 2; } flashes = flashes.filter(f => f.a > 0);
  TX(c, "● reactant   ● product (reacted)", mx, my + mh + 16, "#8fa0bf", "left", "11px");
  // ---- equation, rate equation, mechanism ----
  let x = mx + mw + 24, y = 76; const tw = w - x - 16;
  TX(c, rx.name, x, y, "#eef2f8", "left", "600 13.5px"); y += 20; TX(c, rx.eq, x, y, "#cfd8ea", "left", "12.5px"); y += 26;
  if (adv) { TX(c, P.rx === "own" ? `rate = k[A]${["⁰", "", "²"][P.n]}  (order ${P.n})` : rx.rateEq, x, y, "#ffd166", "left", "600 13px"); y += 18; if (rx.ordTxt) { TX(c, rx.ordTxt, x, y, "#aab6cc", "left", "11.5px"); y += 22; }
    if (rx.mech.length) { TX(c, "Mechanism", x, y, "#eef2f8", "left", "600 12.5px"); y += 18; for (const [s, how] of rx.mech) { const slow = how.startsWith("slow"); c.fillStyle = slow ? "rgba(255,180,84,.16)" : "rgba(255,255,255,.04)"; c.fillRect(x - 4, y - 13, Math.max(60, tw), 34); TX(c, s, x, y, slow ? "#ffb454" : "#cfd8ea", "left", "12px"); TX(c, how, x, y + 15, slow ? "#ffb454" : "#8fa0bf", "left", "11px"); y += 40; }
      y = WRAP(c, rx.mechNote, x, y, tw - 4) + 9; } }
  else { TX(c, "Rate = how fast the concentration falls", x, y, "#ffd166", "left", "600 12.5px"); y += 18; TX(c, "= the gradient of the graph below", x, y, "#aab6cc", "left", "12px"); y += 30; }
  // the results table for initial rates / Arrhenius
  const list = P.view === "arr" ? arr : P.view === "init" ? runs : null;
  if (list) { TX(c, P.view === "arr" ? "Arrhenius runs (record at several temperatures)" : "Initial-rate runs (change one concentration at a time)", x, y, "#eef2f8", "left", "600 12.5px"); y += 18;
    const head = P.rx === "clock" ? (P.view === "arr" ? ["T / K", "t / s", "1/T × 1000", "ln(1/t)"] : ["[H₂O₂]", "[I⁻]", "t / s", "1/t / s⁻¹"]) : (P.view === "arr" ? ["T / K", "k", "1/T × 1000", "ln k"] : ["[A]₀", "other", "initial rate", ""]);
    head.forEach((s, i) => TX(c, s, x + i * 76, y, "#8fa0bf", "left", "11px")); y += 15;
    for (const r_ of list.slice(-9)) { const cells = P.rx === "clock" ? (P.view === "arr" ? [r_.T, r_.t.toFixed(1), (1000 / r_.T).toFixed(3), Math.log(1 / r_.t).toFixed(3)] : [r_.c0, r_.i0, r_.t.toFixed(1), (1 / r_.t).toFixed(4)]) : (P.view === "arr" ? [r_.T, K.sig(r_.k), (1000 / r_.T).toFixed(3), Math.log(r_.k).toFixed(2)] : [r_.c0, P.rx === "iod" ? `H⁺ ${r_.h}, prop ${r_.a}` : r_.b0, K.sig(r_.rate), ""]); cells.forEach((s, i) => TX(c, String(s), x + i * 76, y, "#cfd8ea", "left", "11.5px")); y += 15; }
    if (!list.length) TX(c, "Press 📝 Record this run.", x, y, "#8fa0bf", "left", "11.5px");
    if (P.view === "arr" && list.length > 1) { const pts = list.map(r_ => [1 / r_.T, Math.log(P.rx === "clock" ? 1 / r_.t : r_.k)]), f = K.linfit(pts); TX(c, `gradient = ${K.sig(f.m, 3)} K  →  Ea = −gradient × R = ${(-f.m * R / 1000).toFixed(1)} kJ/mol`, x, y + 10, "#7ee787", "left", "600 12px"); }
  }
  ui.hud(`<b>${t.toFixed(0)} s</b> · ${rx.mon} = ${K.sig(S.c, 3)} mol dm⁻³`);
}

// ---------------- Charts and readings ----------------
function charts() {
  const rx = RX[P.rx], tEnd = tEndFor(), S = solve(P.rx, P, P.T, t), adv = ui.level === "adv";
  // concentration–time: the exact curve so far, the noisy readings, the tangent and half-lives
  const pts = [], meas = [], N = 160; const r2 = K.rng(7); for (let i = 0; i <= N; i++) { const tt = tEnd * i / N; if (tt > t) break; pts.push([tt, solve(P.rx, P, P.T, tt).c]); if (i % 4 === 0) meas.push([tt, Math.max(0, pts[pts.length - 1][1] + P.noise * P.c0 * r2.gauss())]); }
  const tn = Math.min(P.tan, tEnd), Sn = solve(P.rx, P, P.T, tn), tl = []; for (const dx of [-0.25, 0.25]) tl.push([tn + dx * tEnd, Sn.c - Sn.rate * dx * tEnd]);
  const hl = halfLives(P.rx, P, P.T, 3); let acc = 0; const vl = adv && P.rx !== "iod" && !(P.rx === "own" && P.n === 0) && P.rx !== "clock" ? hl.map((d, i) => { acc += d; return { x: acc, color: "rgba(255,209,102,.5)", label: `t½ ${i + 1}`, dash: [4, 4] }; }) : [];
  chA.opts.title = `${rx.mon} against time`; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "mol dm⁻³";
  chA.draw([{ pts, color: "#5ad1ff", label: "concentration" }, { pts: meas, type: "dots", r: 2.5, color: "#c9a0ff", label: "readings" }, { pts: tl, color: "#ffb454", dash: [6, 4], label: "tangent" }], { xMin: 0, xMax: tEnd, yMin: 0, yMax: P.c0 * 1.05, vlines: vl });
  // second chart: rate against concentration, initial rates, or the Arrhenius plot
  if (P.view === "mon") {
    const rp = []; for (let i = 0; i <= 60; i++) { const tt = tEnd * i / 60, s = solve(P.rx, P, P.T, tt); if (s.c > 0) rp.push([s.c, s.rate]); }
    chB.opts.title = "Rate against concentration"; chB.opts.xLabel = rx.mon + " (mol dm⁻³)"; chB.opts.yLabel = "rate"; chB.draw([{ pts: rp, color: "#7ee787", label: adv ? "shape shows the order" : "rate" }, { pts: [[S.c, S.rate]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
  } else if (P.view === "init") {
    if (P.rx === "clock") { chB.opts.title = "1/t against concentration (1/t ∝ initial rate)"; chB.opts.xLabel = "[I⁻] (●) or [H₂O₂] (●) (mol dm⁻³)"; chB.opts.yLabel = "1/t (s⁻¹)"; chB.draw([{ pts: runs.map(r_ => [r_.i0, 1 / r_.t]), type: "dots", r: 5, color: "#5ad1ff", label: "against [I⁻]" }, { pts: runs.map(r_ => [r_.c0, 1 / r_.t]), type: "dots", r: 4, color: "#ffb454", label: "against [H₂O₂]" }], { xMin: 0, yMin: 0 }); }
    else { chB.opts.title = "Initial rate against starting concentration"; chB.opts.xLabel = rx.mon + "₀ (mol dm⁻³)"; chB.opts.yLabel = "initial rate"; chB.draw([{ pts: runs.map(r_ => [r_.c0, r_.rate]), type: "dots", r: 5, color: "#5ad1ff", label: "your runs" }], { xMin: 0, yMin: 0 }); }
  } else {
    const ap = arr.map(r_ => [1000 / r_.T, Math.log(P.rx === "clock" ? 1 / r_.t : r_.k)]), ser = [{ pts: ap, type: "dots", r: 5, color: "#ffb454", label: P.rx === "clock" ? "ln(1/t)" : "ln k" }];
    if (ap.length > 1) { const f = K.linfit(ap), xs = ap.map(p => p[0]), a = Math.min(...xs), b = Math.max(...xs); ser.push({ pts: [[a, f.m * a + f.c], [b, f.m * b + f.c]], color: "#7ee787", label: "best fit" }); }
    chB.opts.title = "Arrhenius plot"; chB.opts.xLabel = "1000 ÷ T (K⁻¹)"; chB.opts.yLabel = P.rx === "clock" ? "ln(1/t)" : "ln k"; chB.draw(ser, {});
  }
  read.set("t", t.toFixed(0) + " s"); read.set("c", K.sig(S.c, 3) + " mol dm⁻³"); read.set("r", K.sig(S.rate, 3) + " mol dm⁻³ s⁻¹"); read.set("tan", `${K.sig(-Sn.rate, 3)} at ${tn.toFixed(0)} s`);
  read.set("h", P.rx === "clock" ? "–" : P.rx === "iod" || (P.rx === "own" && P.n === 0) ? "not constant (zero order)" : hl.map(v => v.toFixed(0)).join(", ") + " s"); read.set("k", adv ? K.sig(kAt(rx, P.T), 3) + " " + (P.rx === "own" ? ["mol dm⁻³ s⁻¹", "s⁻¹", "dm³ mol⁻¹ s⁻¹"][P.n] : rx.kU) : "A level");
}
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; const tEnd = tEndFor(); if (t < tEnd) t = Math.min(tEnd, t + dt * speed); }, dt => { draw(dt); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("The reaction starts the moment the solutions are mixed. Move the tangent to read the rate; switch method to find orders or Ea.", 7000);
