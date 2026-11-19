/* =====================================================================
   CAPACITORS
   A capacitor is two metal plates separated by an insulator. Connected to
   a cell, electrons pile up on one plate and leave the other: the
   capacitor stores CHARGE (Q = CV, C in farads) and ENERGY (U = ½CV²).
   Charging or discharging through a resistor R is EXPONENTIAL: the
   current is biggest at the start and dies away, because the voltage
   across R gets smaller as the capacitor fills (or empties).
        discharge:  V = V₀ e^(−t/RC)        charge:  V = V₀ (1 − e^(−t/RC))
   The TIME CONSTANT τ = RC is the time to fall to 1/e (37%) of the
   start; after 5τ it is (almost) fully charged or discharged.
   Plotting ln V against t gives a straight line of gradient −1/RC.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const Vdis = (t, V0, R, C) => V0 * Math.exp(-t / (R * C));
const Vchg = (t, V0, R, C) => V0 * (1 - Math.exp(-t / (R * C)));
// combining capacitors: series 1/C = Σ1/Cᵢ, parallel C = ΣCᵢ
const series = cs => 1 / cs.reduce((s, c) => s + 1 / c, 0), parallel = cs => cs.reduce((s, c) => s + c, 0);
const fmtC = c => c >= 1e-3 ? (c * 1e3).toPrecision(3) + " mF" : c >= 1e-6 ? (c * 1e6).toPrecision(3) + " µF" : (c * 1e9).toPrecision(3) + " nF";
const fmtR = r => r >= 1e6 ? (r / 1e6).toPrecision(3) + " MΩ" : r >= 1e3 ? (r / 1e3).toPrecision(3) + " kΩ" : r.toPrecision(3) + " Ω";
const fmtT = t => t >= 1 ? t.toPrecision(3) + " s" : t >= 1e-3 ? (t * 1e3).toPrecision(3) + " ms" : (t * 1e6).toPrecision(3) + " µs";

// ---------------- The page ----------------
const DEF = { V0: 6, R: 10e3, C: 470e-6, leak: 0, mode: "charge", auto: true, C1: 100e-6, C2: 220e-6, C3: 470e-6, combo: "single", noise: 0.02, speed: 1 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 3), t = 0, Vstart = 0, sw = "charge", hist = [], meas = [], eSup = 0, eRes = 0;
const Ceff = () => P.combo === "single" ? P.C : P.combo === "series" ? series([P.C1, P.C2, P.C3]) : parallel([P.C1, P.C2, P.C3]);
const tauEff = () => P.leak && sw === "dis" ? P.R * P.leak / (P.R + P.leak) * Ceff() : P.R * Ceff();
const Vnow = () => sw === "charge" ? P.V0 + (Vstart - P.V0) * Math.exp(-t / (P.R * Ceff())) : Vstart * Math.exp(-t / tauEff());
const Inow = () => sw === "charge" ? (P.V0 - Vnow()) / P.R : Vnow() / P.R;
const ui = K.app({
  title: "Capacitors", subject: "Physics",
  blurb: "Charge and discharge through a resistor: Q = CV, exponential change, the time constant RC, ln V graphs, energy ½CV², series and parallel",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Capacitors are not in Pearson Edexcel International GCSE Physics (4PH1). Standard uses the circuit to practise 4PH1 Section 2: Q = It, V = IR, E = QV, P = IV, power = energy ÷ time, conventional current against electrons.", adv: "WJEC Eduqas A level Physics Component 2 Topic 4 Capacitance (i), (j): Q = CV, exponential charge and discharge, τ = RC, ln V against t (the specified practical), U = ½CV² = ½QV as the area under the Q–V graph, series and parallel. Leakage is beyond the spec." } },
  missions: [
    { title: "Charge it up", q: "Charge the capacitor through the resistor. When is the current biggest? Why does it slow down?", hint: "At the start: the empty capacitor has no voltage, so all 6 V is across R (I = V/R). As charge builds up, the capacitor's voltage opposes the cell, so the current falls: an exponential curve.", setup() { set({ mode: "charge" }); } },
    { title: "Q = It", q: "Use the current-time graph: the area under it is the charge that flowed. Check it against Q = CV.", hint: "Area under I–t = total charge. Here Q = CV = 470 µF × 6 V = 2.82 mC.", setup() { set({}); } },
    { title: "Bigger resistor, slower", q: "Double the resistance. What happens to the starting current and to the time it takes to charge?", hint: "The starting current halves (I = V/R) and everything takes twice as long. The time constant τ = RC doubles.", setup() { set({ R: 20e3 }); } },
    { title: "Where does the energy go?", q: "Charge the capacitor. Compare the energy from the cell with the energy stored. Where did the rest go?", hint: "The cell gives QV₀; the capacitor stores ½QV₀. Exactly half is turned into heat in the resistor, whatever its resistance.", setup() { set({ mode: "charge" }); } },
    { lvl: "adv", title: "The time constant", q: "Discharge from 6 V. Read the time when V = 2.21 V (37%). Compare with RC.", hint: "τ = RC = 10 kΩ × 470 µF = 4.70 s. After τ, V = V₀/e = 2.21 V; after 2τ, 0.81 V; after 5τ less than 1%.", setup() { set({ mode: "dis" }); } },
    { lvl: "adv", title: "ln V against t", q: "Take readings of V during a discharge and look at the ln V graph. Find RC from the gradient.", hint: "ln V = ln V₀ − t/RC: a straight line of gradient −1/RC. The specified practical uses this to find C (or R).", setup() { set({ mode: "dis" }); } },
    { lvl: "adv", title: "Series and parallel", q: "Put 100, 220 and 470 µF in series, then in parallel. Predict the total each time.", hint: "Series: 1/C = 1/100 + 1/220 + 1/470, C = 59.9 µF (less than the smallest). Parallel: C = 790 µF (the sum).", setup() { set({ combo: "series" }); } },
    { lvl: "adv", title: "A leaky capacitor", q: "Add a leakage resistance of 50 kΩ. How does the discharge change? (Beyond the spec.)", hint: "The capacitor also discharges through its own insulation: the two resistances act in parallel, so τ = (R R_L/(R + R_L)) C is shorter.", setup() { set({ mode: "dis", leak: 50e3 }); } }
  ],
  batch: [
    { title: "Discharge curve", question: "How does the voltage fall during a discharge?", how: "V₀ = 6 V, R = 10 kΩ, C = 470 µF (±10% tolerance per capacitor); voltmeter ±0.02 V; 5 capacitors.", xLabel: "time (s)", yLabel: "V (V)", xs: [0, 2, 4, 6, 8, 10, 15, 20], reps: 5, yMin: 0, theory: x => Vdis(x, 6, 1e4, 470e-6), theoryLabel: "V₀e^(−t/RC)", run: (x, r) => Vdis(x, 6, 1e4, 470e-6 * (1 + 0.1 * r.gauss())) + 0.02 * r.gauss(), note: "Exponential: equal times give equal fractions (each 4.7 s multiplies V by 0.37). The scatter comes mostly from the ±10% tolerance of real capacitors." },
    { title: "Time constant and resistance", question: "How does the time to fall to 37% depend on R?", how: "C = 470 µF; time read from a stopwatch to ±0.2 s (reaction time).", xLabel: "R (kΩ)", yLabel: "time to 37% (s)", xs: [2, 4, 6, 8, 10, 15, 20], reps: 5, yMin: 0, fit: true, theory: x => x * 1e3 * 470e-6, theoryLabel: "τ = RC", run: (x, r) => x * 1e3 * 470e-6 + 0.2 * r.gauss(), note: "A straight line through the origin with gradient C = 0.47 s per kΩ: τ ∝ R." },
    { title: "Finding C from a ln V graph", question: "If students fit ln V against t (8 readings over 3τ), what values of C do they get?", how: "True C 470 µF, R = 10 kΩ (±1%), voltmeter ±0.02 V, stopwatch ±0.1 s.", yLabel: "C found (µF)", reps: 200, bins: 20, theory: 470, theoryLabel: "true C", run: (x, r) => { const R = 1e4 * (1 + 0.01 * r.gauss()), pts = []; for (let i = 1; i <= 8; i++) { const tt = i * 1.8; const v = Vdis(tt, 6, R, 470e-6) + 0.02 * r.gauss(); if (v > 0) pts.push([tt + 0.1 * r.gauss(), Math.log(v)]); } const f = K.linfit(pts); return -1 / (f.m * 1e4) * 1e6; }, note: "Within a few per cent: the straight-line fit uses all the readings, and the small late voltages (where ±0.02 V matters most) carry the largest error." },
    { title: "Energy stored", question: "How does the energy stored depend on the voltage?", how: "C = 470 µF; energy = area under the Q–V graph (counted in small steps).", xLabel: "V (V)", yLabel: "energy (mJ)", xs: [1, 2, 3, 4, 5, 6, 8, 10, 12], reps: 1, yMin: 0, theory: v => 0.5 * 470e-6 * v * v * 1e3, theoryLabel: "½CV²", run: v => { let u = 0; const n = 1000; for (let i = 0; i < n; i++) u += 470e-6 * v * (i + 0.5) / n * v / n; return u * 1e3; }, note: "U ∝ V²: doubling the voltage stores four times the energy. The area under Q–V is a triangle, so U = ½QV." },
    { title: "Half the energy is always lost", question: "When a capacitor is charged from a cell through R, what fraction of the cell's energy ends up stored?", how: "Charge for 10τ in small steps; energy from cell = Σ V₀IΔt, heat in R = Σ I²RΔt.", xLabel: "log₁₀(R / Ω)", yLabel: "fraction stored", xs: [1, 2, 3, 4, 5, 6], reps: 1, yMin: 0, yMax: 1, theory: () => 0.5, theoryLabel: "½", run: x => { const R = 10 ** x, C = 470e-6, tau = R * C, dt = tau / 2000; let v = 0, Es = 0; for (let i = 0; i < 20000; i++) { const I = (6 - v) / R; Es += 6 * I * dt; v += I * dt / C; } return 0.5 * C * v * v / Es; }, note: "Exactly half, whatever the resistance: a big R wastes energy slowly, a small R quickly, but the total is the same." },
    { title: "Series and parallel (A level)", question: "What is the total capacitance of n identical 100 µF capacitors?", how: "In series and in parallel.", xLabel: "number of capacitors n", yLabel: "C total (µF)", xs: [1, 2, 3, 4, 5, 6], reps: 1, yMin: 0, theory: n => 100 * n, theoryLabel: "parallel: nC", run: n => series(new Array(n).fill(100)), note: "Dots (series) fall as 100/n; the line (parallel) rises as 100n. Series is like making the gap wider; parallel like making the plates bigger." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 2", text: "Charge Q = It; energy E = QV; P = IV; V = IR. Conventional current flows from + to −; electrons go the other way." },
      { lvl: "adv", tag: "Eduqas C2 T4", text: "Q = CV. Capacitance in farads: 1 F = 1 C V⁻¹. Energy U = ½QV = ½CV² = Q²/2C (the area under a Q–V graph)." },
      { lvl: "adv", tag: "Eduqas C2 T4", text: "Discharge: Q = Q₀e^(−t/RC); charge: Q = Q₀(1 − e^(−t/RC)). Time constant τ = RC; half-life t½ = RC ln 2 = 0.69RC." },
      { lvl: "adv", tag: "Eduqas C2 T4", text: "Series: 1/C = 1/C₁ + 1/C₂ + …; parallel: C = C₁ + C₂ + …. ln V against t is a straight line of gradient −1/RC." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `At the start of charging, all ${P.V0} V is across the ${fmtR(P.R)} resistor. What is the starting current?`, ans: () => `<ul><li>I = V/R = ${P.V0} ÷ ${P.R}</li><li>= ${(P.V0 / P.R * 1000).toFixed(3)} mA</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `A ${fmtC(Ceff())} capacitor charged to ${P.V0} V discharges through ${fmtR(P.R)}. Find the time constant and the voltage after 2τ.`, ans: () => `<ul><li>τ = RC = ${fmtT(P.R * Ceff())}</li><li>V = V₀e^(−2) = ${P.V0} × 0.135</li><li>= ${(P.V0 * Math.exp(-2)).toFixed(2)} V</li></ul>` },
      { lvl: "adv", marks: 2, q: () => `Calculate the energy stored in a ${fmtC(Ceff())} capacitor at ${P.V0} V.`, ans: () => `<ul><li>U = ½CV²</li><li>= ${(0.5 * Ceff() * P.V0 * P.V0 * 1000).toPrecision(3)} mJ</li></ul>` }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>τ = RC; discharge V = V₀e^(−t/RC); charge V = V₀(1 − e^(−t/RC)) (from whatever voltage the capacitor had when the switch moved); I = (V across R)/R; Q = CV; U = ½CV²; t½ = RC ln 2.</li>
<li>Series 1/C = Σ1/Cᵢ; parallel C = ΣCᵢ. Leaky capacitor (beyond the spec): R_L in parallel during discharge, τ = R R_L C/(R + R_L).</li>
<li>Ideal components and switch, no internal resistance in the cell. Animation time is scaled so 5τ takes about 3 s at 1×; the clock shows the real time. Readings have voltmeter noise you can set.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/capacitors.html">original/capacitors.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Circuit");
ctl.V0 = K.slider(g, { label: "Cell voltage V₀", min: 1, max: 12, step: 0.5, value: 6, unit: "V", on: v => P.V0 = v });
ctl.R = K.slider(g, { label: "Resistance R", min: 1, max: 100, step: 0.5, value: 10, unit: "kΩ", on: v => P.R = v * 1e3 });
const CVALS = [10, 47, 100, 220, 470, 1000, 2200, 4700];   // standard capacitor values (µF)
ctl.C = K.seg(g, { value: 470, options: CVALS.map(v => [v, v >= 1000 ? v / 1000 + " mF" : v + " µF"]), on: v => P.C = +v * 1e-6 });
let rr = K.row(g); K.btn(rr, "⇄ Flip the switch", () => flip(), "primary"); ctl.auto = K.toggle(g, { label: "Flip automatically after 5τ", value: true, on: v => P.auto = v });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
g = ui.group("A level");
ctl.combo = K.seg(g, { value: "single", options: [["single", "one capacitor"], ["series", "3 in series"], ["parallel", "3 in parallel"]], on: v => P.combo = v });
ctl.C1 = K.slider(g, { label: "C₁", min: 10, max: 1000, step: 10, value: 100, unit: "µF", on: v => P.C1 = v * 1e-6 });
ctl.C2 = K.slider(g, { label: "C₂", min: 10, max: 1000, step: 10, value: 220, unit: "µF", on: v => P.C2 = v * 1e-6 });
ctl.C3 = K.slider(g, { label: "C₃", min: 10, max: 1000, step: 10, value: 470, unit: "µF", on: v => P.C3 = v * 1e-6 });
ctl.leak = K.slider(g, { label: "Leakage resistance (0 = none; beyond the spec)", min: 0, max: 200, step: 5, value: 0, fmt: v => v ? v + " kΩ" : "none", on: v => P.leak = v * 1e3 });
rr = K.row(g); K.btn(rr, "📏 Take a reading", () => meas.push([t, Math.max(1e-4, Vnow() + P.noise * rnd.gauss())])); K.btn(rr, "Clear readings", () => meas = []);
const read = K.readout(ui.group("Readings"), [["sw", "switch"], ["t", "time"], ["V", "V across C"], ["I", "current"], ["Q", "charge Q = CV"], ["U", "energy stored ½CV²"], ["tau", "time constant RC"], ["E", "from the cell / heat in R"]]);
function flip() { Vstart = Vnow(); sw = sw === "charge" ? "dis" : "charge"; t = 0; hist = []; meas = []; eSup = 0; eRes = 0; }
function set(o) { Object.assign(P, DEF, o); ctl.V0.set(P.V0); ctl.R.set(P.R / 1e3); ctl.C.set(Math.round(P.C * 1e6)); ctl.auto.set(P.auto); ctl.speed.set(P.speed); ctl.combo.set(P.combo); ctl.C1.set(P.C1 * 1e6); ctl.C2.set(P.C2 * 1e6); ctl.C3.set(P.C3 * 1e6); ctl.leak.set(P.leak / 1e3); sw = P.mode === "dis" ? "dis" : "charge"; Vstart = sw === "dis" ? P.V0 : 0; t = 0; hist = []; meas = []; eSup = 0; eRes = 0; }

// ---------------- Simulation ----------------
let paused = false;
function tick(dt) { const tau = tauEff(), step = dt * P.speed * 5 * tau / 3; const n = 20; for (let i = 0; i < n; i++) { const I = Inow(); if (sw === "charge") eSup += P.V0 * I * step / n; eRes += I * I * P.R * step / n; t += step / n; } if (!hist.length || t - hist[hist.length - 1][0] > tau / 40) hist.push([t, Vnow()]); if (P.auto && t > 6 * tau) flip(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
K.pointer(cv.el, { down: p => { if (Math.abs(p.x - cv.w * 0.43) < 90 && p.y < 160) flip(); } });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  // layout: cell on the left (contact A), a plain wire from contact B, and on the right R then C in series back to the bottom wire
  const L = 90, Rx = w * 0.72, T = 80, B = h * 0.82, Ax = w * 0.36, Px = w * 0.5, Bc = T + 56, cy = (T + B) / 2, rT = T + 40, rB = cy - 10, capY = cy + (B - cy) / 2;
  const V = Vnow(), I = Inow(), frac = V / P.V0;
  c.strokeStyle = "#cfd8ea"; c.lineWidth = 2;
  const line = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
  line([[Ax, T], [L, T], [L, cy - 20]]); line([[L, cy + 20], [L, B], [Rx, B], [Rx, capY + 8]]); line([[Ax, Bc], [Ax, B]]); line([[Px, T], [Rx, T], [Rx, rT]]); line([[Rx, rB], [Rx, capY - 8]]);
  // switch
  c.fillStyle = "#cfd8ea"; for (const [x, y] of [[Px, T], [Ax, T], [Ax, Bc]]) { c.beginPath(); c.arc(x, y, 4.5, 0, 6.3); c.fill(); }
  c.strokeStyle = "#ffd166"; c.lineWidth = 3.5; line([[Px, T], sw === "charge" ? [Ax + 3, T] : [Ax + 3, Bc - 2]]); c.lineWidth = 2;
  TX(c, "A: charge (to the cell)", Ax - 8, T - 12, sw === "charge" ? "#ffd166" : "#6c7894", "right", "11.5px"); TX(c, "B: discharge", Ax - 10, Bc + 4, sw === "dis" ? "#ffd166" : "#6c7894", "right", "11.5px");
  // cell
  c.fillStyle = "#0b1020"; c.fillRect(L - 22, cy - 20, 44, 40); c.strokeStyle = "#cfd8ea"; line([[L - 20, cy - 8], [L + 20, cy - 8]]); c.lineWidth = 5; line([[L - 9, cy + 8], [L + 9, cy + 8]]); c.lineWidth = 2; TX(c, `${P.V0} V`, L - 28, cy + 4, "#cfd8ea", "right", "600 12px"); TX(c, "+", L + 26, cy - 6, "#ff8a70", "left", "600 13px"); TX(c, "−", L + 26, cy + 14, "#5ad1ff", "left", "600 13px");
  // resistor, glowing with the power I²R
  const glow = Math.min(1, I * I * P.R / (P.V0 * P.V0 / P.R)); c.fillStyle = `rgba(255,${Math.round(140 - 80 * glow)},60,${0.2 + 0.8 * glow})`; c.fillRect(Rx - 12, rT, 24, rB - rT); c.strokeRect(Rx - 12, rT, 24, rB - rT); TX(c, fmtR(P.R), Rx + 20, (rT + rB) / 2 + 4, "#cfd8ea", "left", "600 12px");
  // capacitor plates with + on the top plate and − on the bottom
  c.fillStyle = "#cfd8ea"; c.fillRect(Rx - 40, capY - 10, 80, 4); c.fillRect(Rx - 40, capY + 6, 80, 4);
  const nq = Math.round(frac * 10); for (let i = 0; i < nq; i++) { TX(c, "+", Rx - 37 + i * 8, capY - 14, "#ff8a70", "left", "600 12px"); TX(c, "−", Rx - 37 + i * 8, capY + 24, "#5ad1ff", "left", "600 12px"); }
  TX(c, P.combo === "single" ? fmtC(P.C) : `${P.combo}: ${fmtC(Ceff())}`, Rx + 48, capY + 4, "#cfd8ea", "left", "600 12px");
  // electrons: charging, they leave the top plate for the cell's + terminal and arrive on the bottom plate from its − terminal
  const path = sw === "charge" ? [[Rx, capY - 10], [Rx, T], [Px, T], [Ax, T], [L, T], [L, cy - 20], null, [L, cy + 20], [L, B], [Rx, B], [Rx, capY + 10]] : [[Rx, capY - 10], [Rx, T], [Px, T], [Ax, Bc], [Ax, B], [Rx, B], [Rx, capY + 10]];
  const flow = sw === "charge" ? 1 : -1, segs = []; let tot = 0; for (let i = 1; i < path.length; i++) { if (!path[i] || !path[i - 1]) { segs.push(0); continue; } const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(d); tot += d; }
  const sp = I / (P.V0 / P.R), tt = performance.now() / 1000; c.fillStyle = "#5ad1ff"; c.globalAlpha = 0.35 + 0.65 * Math.min(1, sp * 3);
  for (let k = 0; k < 28; k++) { let d = ((k / 28) * tot + flow * tt * 110 * sp) % tot; if (d < 0) d += tot; let i = 0; while (i < segs.length && d > segs[i]) { d -= segs[i]; i++; } if (i >= segs.length || !segs[i]) continue; const a = path[i], b2 = path[i + 1], u = d / segs[i]; c.beginPath(); c.arc(a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u, 3.2, 0, 6.3); c.fill(); }
  c.globalAlpha = 1; c.lineWidth = 1;
  TX(c, `${sw === "charge" ? "Charging" : "Discharging"}: V = ${V.toFixed(2)} V (${(frac * 100).toFixed(0)}%), I = ${(I * 1000).toFixed(3)} mA, t = ${fmtT(t)} = ${(t / tauEff()).toFixed(2)} τ`, 20, 30, "#eef2f8", "left", "600 14px");
  TX(c, "click the switch or press ⇄ to flip it · blue dots: electrons (they move the opposite way to conventional current)", 20, h - 14, "#8fa0bf", "left", "11.5px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const tau = tauEff(), C = Ceff(), Tm = 6 * tau, Vp = [], Ip = [];
  for (let i = 0; i <= 120; i++) { const tt = Tm * i / 120, V = sw === "charge" ? P.V0 + (Vstart - P.V0) * Math.exp(-tt / (P.R * C)) : Vstart * Math.exp(-tt / tau); Vp.push([tt, V]); Ip.push([tt, (sw === "charge" ? P.V0 - V : V) / P.R * 1000]); }
  const adv = ui.level === "adv";
  chA.opts.title = "V and I against time"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "V (V) · I (mA)";
  chA.draw([{ pts: Vp, color: "#ffd166", label: "V across C" }, { pts: Ip, color: "#5ad1ff", label: "I (mA)" }, { pts: hist, color: "#fff", label: "now" }, { pts: [[tau, 0], [tau, P.V0]], color: "#3a4a6b", dash: [4, 3], label: "τ" }], { xMin: 0, xMax: Tm, yMin: 0 });
  if (adv && sw === "dis") { chB.opts.title = "ln V against t"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "ln(V / V)"; const lp = meas.map(([a, v]) => [a, Math.log(v)]); const ser = [{ pts: Vp.filter(p => p[1] > 0.01).map(([a, v]) => [a, Math.log(v)]), color: "#3a4a6b", label: "theory" }, { pts: lp, type: "dots", r: 5, color: "#7ee787", label: "your readings" }]; if (lp.length > 2) { const f = K.linfit(lp); ser.push({ pts: [[0, f.c], [Tm, f.c + f.m * Tm]], color: "#7ee787", dash: [4, 3], label: `fit: RC = ${fmtT(-1 / f.m)}` }); } chB.draw(ser, { xMin: 0, xMax: Tm }); }
  else { chB.opts.title = "Charge against voltage: energy = area"; chB.opts.xLabel = "V (V)"; chB.opts.yLabel = "Q (mC)"; const V = Vnow(); chB.draw([{ pts: [[0, 0], [P.V0, C * P.V0 * 1e3]], color: "#3a4a6b", label: "Q = CV" }, { pts: [[0, 0], [V, C * V * 1e3], [V, 0]], type: "area", color: "#c9a0ff", label: `½QV = ${(0.5 * C * V * V * 1e3).toPrecision(3)} mJ` }], { xMin: 0, xMax: P.V0, yMin: 0 }); }
  const V = Vnow(), I = Inow();
  read.set("sw", sw === "charge" ? "charging (to the cell)" : "discharging (through R)"); read.set("t", `${fmtT(t)} (${(t / tau).toFixed(2)} τ)`); read.set("V", V.toFixed(3) + " V"); read.set("I", (I * 1000).toFixed(3) + " mA"); read.set("Q", (C * V * 1e3).toPrecision(3) + " mC"); read.set("U", (0.5 * C * V * V * 1e3).toPrecision(3) + " mJ"); read.set("tau", fmtT(tau)); read.set("E", sw === "charge" ? `${(eSup * 1e3).toPrecision(3)} mJ / ${(eRes * 1e3).toPrecision(3)} mJ` : `heat in R ${(eRes * 1e3).toPrecision(3)} mJ`);
  ui.hud("τ = RC · V = V₀e^(−t/RC) · Q = CV · U = ½CV²");
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("The capacitor is charging. Watch the current fall, then flip the switch.", 6000);
