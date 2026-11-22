/* =====================================================================
   MAGNETISM AND INDUCTION
   THE MOTOR EFFECT: a wire carrying a current in a magnetic field feels
   a force          F = B I L sin θ
   (B: flux density in tesla, I: current, L: length in the field, θ: angle
   between the wire and the field). Fleming's LEFT-hand rule gives the
   direction: First finger Field, seCond finger Current, thuMb Motion.
   A moving charge feels F = Bqv, so it circles: r = mv/(qB).
   INDUCTION: changing the magnetic flux through a coil induces an EMF
        ε = −N dΦ/dt     (Faraday's law; the minus sign is Lenz's law:
   the induced current opposes the change that made it).
   A TRANSFORMER uses an alternating current in one coil to make a
   changing flux in an iron core, inducing a voltage in the other:
        Vs/Vp = Ns/Np, and (if 100% efficient) VpIp = VsIs.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const Fwire = (B, I, L, th) => B * I * L * Math.sin(th * Math.PI / 180);
const PART = { e: { name: "electron", m: 9.11e-31, q: -1.6e-19 }, p: { name: "proton", m: 1.67e-27, q: 1.6e-19 } };
const radius = (m, v, q, B) => m * v / (Math.abs(q) * B);
// induction: a magnet moves along the axis of a coil; B in the coil = Bmax e^(−(x/1 m)²), x = v(t − 2 s)
const flux = (x, Bmax, A) => Bmax * A * Math.exp(-x * x);
const emf = (t, v, N, Bmax, A) => { const x = v * (t - 2); return -N * Bmax * A * Math.exp(-x * x) * (-2 * x) * v; };   // −N dΦ/dt
// d.c. motor: torque on a coil τ = BINA cos θ (θ: angle between the coil's plane and the field)
const torque = (B, I, N, A, th) => B * I * N * A * Math.cos(th);

// ---------------- The page ----------------
const DEF = { view: "force", B: 0.2, I: 3, L: 0.05, th: 90, part: "e", v: 1e7, Bp: 1e-3, N: 200, vm: 2, Bmax: 0.1, A: 0.002, R: 10, Np: 200, Ns: 400, Vp: 12, RL: 100, eff: 1, comm: true, Im: 2, Nm: 50, Am: 0.004, Bm: 0.3, load: 0.002, speed: 1 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 9), tI = 0, xDrag = null, emfHist = [], fluxHist = [], lastFlux = 0, mag = { x: -4, v: 0 }, tT = 0, ang = 0.3, omega = 0, orbitT = 0, energy = 0;
const ui = K.app({
  title: "Magnetism and Induction", subject: "Physics",
  blurb: "The motor effect and charged particles in fields; electromagnetic induction with a moving magnet; transformers; the d.c. motor",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) Section 6: the motor effect and Fleming's left-hand rule, the d.c. motor and commutator, electromagnetic induction and what increases the induced voltage, generators, transformers (Vp/Vs = np/ns, VpIp = VsIs, step-up for transmission).", adv: "WJEC Eduqas A level Physics Component 2 Topic 7: F = BIL sin θ, F = Bqv and circular orbits, magnetic flux and flux linkage, Faraday's and Lenz's laws. Torque on a coil, back-EMF and transformer losses are beyond the spec." } },
  missions: [
    { title: "The motor effect", q: "Increase the current, then the field. What happens to the force on the wire? Use Fleming's left-hand rule to check its direction.", hint: "The force is proportional to both (F = BIL). Field left to right, current into the page: the force is upwards. Reverse either one and the force reverses.", setup() { set({ view: "force" }); } },
    { title: "A wire along the field", q: "Turn the wire until it lies along the field (θ = 0). What is the force now?", hint: "Zero: only the part of the current across the field feels a force (F = BIL sin θ). The force is biggest at 90°.", setup() { set({ view: "force", th: 30 }); } },
    { title: "Push a magnet into a coil", q: "Drag the magnet into the coil, then hold it still inside. When is there a reading on the meter?", hint: "Only while it moves: an EMF is induced when the flux through the coil is changing. Pull it out and the reading goes the other way.", setup() { set({ view: "ind" }); } },
    { title: "Faster, bigger", q: "Pass the magnet through faster. What happens to the size of the induced EMF? And to how long it lasts?", hint: "The peak EMF is bigger (proportional to speed) but lasts less time: the area under the EMF–time graph (NΔΦ) stays the same.", setup() { set({ view: "ind", vm: 4 }); } },
    { title: "Step up the voltage", q: "Make a transformer with 200 primary turns and 4000 secondary turns at 12 V. What is the secondary voltage? What happens to the current?", hint: "Vs = Vp × Ns/Np = 240 V. The secondary current is 20 times smaller than the primary (VpIp = VsIs). The National Grid steps up to reduce current and so I²R losses in the cables.", setup() { set({ view: "trans", Ns: 4000 }); } },
    { title: "The d.c. motor", q: "Watch the coil turn. Why does it need the split-ring commutator? Switch it off and see.", hint: "Every half turn the commutator reverses the current in the coil, so the forces keep turning it the same way. Without it, the coil rocks to the vertical and stops.", setup() { set({ view: "motor" }); } },
    { lvl: "adv", title: "Charged particles in a field", q: "Fire an electron at 10⁷ m/s across a 1 mT field. Calculate the radius of its circle, then double the speed. Does the time for one orbit change?", hint: "r = mv/(qB) = 5.7 cm; doubling v doubles r. The period T = 2πm/(qB) does not depend on speed (the idea behind the cyclotron).", setup() { set({ view: "force", Bp: 1e-3 }); } },
    { lvl: "adv", title: "Lenz's law and energy", q: "Add a coil resistance and close the circuit. Where does the energy dissipated in the coil come from?", hint: "The induced current makes the coil a magnet that repels the incoming magnet (and attracts the leaving one): whoever moves the magnet does work against this, and that work becomes heat in the coil.", setup() { set({ view: "ind", R: 5 }); } }
  ],
  batch: [
    { title: "Force on a wire against current", question: "On a top-pan balance, how does the force on a wire depend on the current?", how: "B = 0.20 T, L = 5.0 cm; balance reads to 0.01 g (±0.0001 N).", xLabel: "current (A)", yLabel: "force (mN)", xs: [0, 1, 2, 3, 4, 5, 6], reps: 3, yMin: 0, fit: true, theory: I => 1000 * Fwire(0.2, I, 0.05, 90), theoryLabel: "BIL", run: (I, r) => 1000 * (Fwire(0.2, I, 0.05, 90) + 1e-4 * r.gauss()), note: "A straight line through the origin with gradient BL = 10 mN per amp: F ∝ I." },
    { title: "How does the force depend on the angle?", question: "How does the force change as the wire turns from along the field to across it?", how: "B = 0.20 T, I = 3 A, L = 5 cm; angle set to ±2°.", xLabel: "angle θ (°)", yLabel: "force (mN)", xs: [0, 15, 30, 45, 60, 75, 90, 120, 150, 180], reps: 3, yMin: 0, theory: th => 1000 * Fwire(0.2, 3, 0.05, th), theoryLabel: "BIL sin θ", run: (th, r) => 1000 * Fwire(0.2, 3, 0.05, th + 2 * r.gauss()), note: "Zero along the field, largest across it: F = BIL sin θ." },
    { title: "Orbit radius: is r = mv/qB?", question: "How does the radius of an electron's orbit depend on its speed?", how: "B = 1 mT; radius measured from the path to ±2%.", xLabel: "log₁₀(speed / m s⁻¹)", yLabel: "log₁₀(radius / m)", xs: [5.5, 6, 6.5, 7, 7.5], reps: 3, fit: true, theory: x => Math.log10(radius(9.11e-31, 10 ** x, 1.6e-19, 1e-3)), theoryLabel: "gradient 1", run: (x, r) => Math.log10(radius(9.11e-31, 10 ** x, 1.6e-19, 1e-3) * (1 + 0.02 * r.gauss())), note: "Gradient 1 on log–log axes: r ∝ v. Heavier particles circle more widely (a proton's circle is 1836 times bigger at the same speed)." },
    { title: "Faraday: faster magnet, bigger EMF?", question: "How does the peak EMF depend on the magnet's speed?", how: "N = 200, Bmax = 0.1 T, A = 20 cm²; magnet pushed by hand (speed varies ±10%).", xLabel: "speed (m/s)", yLabel: "peak EMF (V)", xs: [0.5, 1, 2, 3, 4, 5], reps: 5, yMin: 0, fit: true, theory: v => 200 * 0.1 * 0.002 * v * Math.SQRT2 * Math.exp(-0.5), theoryLabel: "∝ v", run: (v, r) => { const vv = v * (1 + 0.1 * r.gauss()); let m = 0; for (let t = 0; t < 4; t += 0.0005) m = Math.max(m, Math.abs(emf(t, vv, 200, 0.1, 0.002))); return m; }, note: "Peak EMF ∝ speed: ε = N dΦ/dt, and the flux changes faster when the magnet moves faster." },
    { title: "Area under the EMF–time graph", question: "Does the total area under one half of the EMF pulse depend on the speed?", how: "As above; area from the magnet far away to the centre of the coil (NΔΦ).", xLabel: "speed (m/s)", yLabel: "∫ε dt (V s)", xs: [0.5, 1, 2, 3, 4, 5], reps: 1, yMin: 0, theory: () => 200 * 0.1 * 0.002, theoryLabel: "NΔΦ = NBA", run: v => { let s = 0; const dt = 0.0002; for (let t = 2 - 5 / v; t < 2; t += dt) s += emf(t, v, 200, 0.1, 0.002) * dt; return Math.abs(s); }, note: "The same at every speed: the total change in flux linkage NΔΦ = 0.04 Wb-turns. Faster means a taller, narrower pulse." },
    { title: "More turns, bigger EMF?", question: "How does the peak EMF depend on the number of turns?", how: "Magnet at 2 m/s.", xLabel: "turns N", yLabel: "peak EMF (V)", xs: [50, 100, 200, 300, 400, 500], reps: 1, yMin: 0, fit: true, theory: N => N * 0.1 * 0.002 * 2 * Math.SQRT2 * Math.exp(-0.5), theoryLabel: "∝ N", run: N => { let m = 0; for (let t = 0; t < 4; t += 0.0005) m = Math.max(m, Math.abs(emf(t, 2, N, 0.1, 0.002))); return m; }, note: "Each turn adds its own EMF: ε ∝ N." },
    { title: "Is Vs/Vp = Ns/Np?", question: "How does the secondary voltage depend on the number of secondary turns?", how: "Vp = 12 V a.c., Np = 200; voltmeter ±1%.", xLabel: "secondary turns Ns", yLabel: "Vs (V)", xs: [50, 100, 200, 400, 800, 1600, 4000], reps: 3, yMin: 0, fit: true, theory: n => 12 * n / 200, theoryLabel: "Vp Ns/Np", run: (n, r) => 12 * n / 200 * (1 + 0.01 * r.gauss()), note: "A straight line with gradient Vp/Np = 0.06 V per turn: the volts per turn are the same in both coils." },
    { title: "Does the load set the primary current?", question: "With a fixed transformer, how does the primary current depend on the load resistance?", how: "Vp = 12 V, Np = 200, Ns = 400 (Vs = 24 V); ideal transformer.", xLabel: "load resistance (Ω)", yLabel: "primary current (A)", xs: [20, 40, 60, 100, 200, 400], reps: 1, yMin: 0, theory: R => 24 / R * 2, theoryLabel: "Ip = (Ns/Np) Vs/R", run: R => (24 / R) * 24 / 12, note: "The primary current is set by what the secondary supplies: VpIp = VsIs. No load, (almost) no current." },
    { title: "Average torque of a d.c. motor", question: "Sampling the torque at random angles, what is the average for a coil with a commutator?", how: "B = 0.3 T, I = 2 A, N = 50, A = 40 cm²; 200 random angles.", yLabel: "average torque (mN m)", reps: 100, bins: 18, theory: 1000 * 2 / Math.PI * 0.3 * 2 * 50 * 0.004, theoryLabel: "(2/π)BINA", run: (x, r) => { let s = 0; for (let i = 0; i < 200; i++) s += Math.abs(torque(0.3, 2, 50, 0.004, r() * 2 * Math.PI)); return 1000 * s / 200; }, note: "About 76 mN m: (2/π) of the peak, because the commutator keeps the torque in one direction but its size varies as cos θ." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 6", text: "A current-carrying wire in a magnetic field feels a force (the motor effect), biggest when the wire is at right angles to the field. Increase it with more current or a stronger field. Fleming's left-hand rule gives its direction." },
      { lvl: "std", tag: "4PH1 6", text: "A voltage is induced when a wire cuts magnetic field lines or the field through a coil changes. Bigger with: faster movement, a stronger magnet, more turns, (an iron core)." },
      { lvl: "std", tag: "4PH1 6", text: "Transformers: Vp/Vs = np/ns; if 100% efficient, VpIp = VsIs. They only work with a.c. (a changing field). Power is transmitted at high voltage to reduce the current and so the heating (I²R) in cables." },
      { lvl: "adv", tag: "Eduqas C2 T7", text: "F = BIL sin θ; F = Bqv; r = mv/(qB); T = 2πm/(qB). Flux Φ = BA cos θ (Wb); flux linkage NΦ; ε = −d(NΦ)/dt." },
      { lvl: "adv", tag: "Eduqas C2 T7", text: "Lenz's law: the induced current flows so as to oppose the change producing it. This is energy conservation: work must be done to keep the change going." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `A transformer has ${P.Np} primary turns and ${P.Ns} secondary turns. The primary voltage is ${P.Vp} V. Calculate the secondary voltage.`, ans: () => `<ul><li>Vs = Vp × Ns/Np = ${P.Vp} × ${P.Ns}/${P.Np}</li><li>= ${(P.Vp * P.Ns / P.Np).toFixed(1)} V</li></ul>` },
      { lvl: "std", marks: 3, q: "Give three ways to increase the voltage induced when a magnet is pushed into a coil.", ans: "<ul><li>push the magnet in faster</li><li>use a stronger magnet</li><li>use more turns on the coil (or an iron core)</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `A ${(P.L * 100).toFixed(0)} cm wire carries ${P.I} A at ${P.th}° to a ${P.B} T field. Calculate the force.`, ans: () => `<ul><li>F = BIL sin θ</li><li>= ${(Fwire(P.B, P.I, P.L, P.th) * 1000).toFixed(1)} mN</li></ul>` },
      { lvl: "adv", marks: 2, q: () => `Calculate the radius of the circle of an electron moving at ${P.v.toExponential(1)} m/s in a field of ${(P.Bp * 1000).toFixed(1)} mT.`, ans: () => `<ul><li>r = mv/(qB) = 9.11 × 10⁻³¹ × ${P.v.toExponential(1)} ÷ (1.6 × 10⁻¹⁹ × ${P.Bp})</li><li>= ${(radius(9.11e-31, P.v, 1.6e-19, P.Bp) * 100).toFixed(2)} cm</li></ul>` }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>F = BIL sin θ; F = Bqv, r = mv/(qB), T = 2πm/(qB) (non-relativistic).</li>
<li>Induction: Φ = BA with B in the coil = Bmax e^(−(x/1 m)²) as the magnet moves along the axis; ε = −N dΦ/dt; current = ε/R; energy dissipated ∫ε²/R dt. You can drag the magnet yourself.</li>
<li>Transformer: Vs = Vp Ns/Np; Is = Vs/R_load; Ip = Is Vs/(Vp η) with an efficiency you can set (beyond the spec at A level).</li>
<li>D.c. motor: torque BINA cos θ (θ between the coil's plane and the field); with a commutator the current reverses every half turn; friction and a load torque; back-EMF BNAω cos θ (beyond the spec).</li></ul>
<h3>Left out</h3><ul><li>Fields outside the poles (fringing), eddy currents and hysteresis in detail, self-inductance, relativistic speeds.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/magnetism-induction.html">original/magnetism-induction.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "force", options: [["force", "⚡ magnetic force"], ["ind", "🔄 induction"], ["trans", "🔌 transformer"], ["motor", "⚙ d.c. motor"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.1, max: 3, step: 0.1, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
grp.force = g = ui.group("Wire in a field");
ctl.B = K.slider(g, { label: "Field B", min: 0, max: 1, step: 0.01, value: 0.2, unit: "T", on: v => P.B = v });
ctl.I = K.slider(g, { label: "Current I (negative = reversed)", min: -6, max: 6, step: 0.1, value: 3, unit: "A", on: v => P.I = v });
ctl.L = K.slider(g, { label: "Length in the field L", min: 0.01, max: 0.2, step: 0.005, value: 0.05, fmt: v => (v * 100).toFixed(1) + " cm", on: v => P.L = v });
ctl.th = K.slider(g, { label: "Angle between wire and field θ", min: 0, max: 180, step: 1, value: 90, unit: "°", on: v => P.th = v });
ctl.part = K.seg(g, { value: "e", options: [["e", "electron (A level)"], ["p", "proton (A level)"]], on: v => P.part = v });
ctl.v = K.slider(g, { label: "Particle speed (log₁₀)", min: 5, max: 7.5, step: 0.05, value: 7, fmt: v => (10 ** v).toExponential(1) + " m/s", on: v => P.v = 10 ** v });
ctl.Bp = K.slider(g, { label: "Field for the particle", min: 0.1, max: 5, step: 0.1, value: 1, unit: "mT", on: v => P.Bp = v / 1000 });
grp.ind = g = ui.group("Magnet and coil");
ctl.vm = K.slider(g, { label: "Magnet speed (or drag it)", min: 0.2, max: 6, step: 0.1, value: 2, unit: "m/s", on: v => P.vm = v });
ctl.N = K.slider(g, { label: "Turns on the coil N", min: 10, max: 500, step: 10, value: 200, on: v => P.N = v });
ctl.Bmax = K.slider(g, { label: "Magnet strength (B in the coil)", min: 0.02, max: 0.4, step: 0.01, value: 0.1, unit: "T", on: v => P.Bmax = v });
ctl.R = K.slider(g, { label: "Circuit resistance (A level)", min: 1, max: 100, step: 1, value: 10, unit: "Ω", on: v => P.R = v });
let rr = K.row(g); K.btn(rr, "▶ Push the magnet through", () => { mag = { x: -4, v: P.vm }; tI = 0; emfHist = []; fluxHist = []; energy = 0; }, "primary");
grp.trans = g = ui.group("Transformer");
ctl.Vp = K.slider(g, { label: "Primary voltage (a.c., rms)", min: 1, max: 240, step: 1, value: 12, unit: "V", on: v => P.Vp = v });
ctl.Np = K.slider(g, { label: "Primary turns Np", min: 10, max: 2000, step: 10, value: 200, on: v => P.Np = v });
ctl.Ns = K.slider(g, { label: "Secondary turns Ns", min: 10, max: 4000, step: 10, value: 400, on: v => P.Ns = v });
ctl.RL = K.slider(g, { label: "Load resistance", min: 5, max: 1000, step: 5, value: 100, unit: "Ω", on: v => P.RL = v });
ctl.eff = K.slider(g, { label: "Efficiency (A level, beyond the spec)", min: 0.5, max: 1, step: 0.01, value: 1, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.eff = v });
grp.motor = g = ui.group("D.c. motor");
ctl.Im = K.slider(g, { label: "Current", min: 0, max: 5, step: 0.1, value: 2, unit: "A", on: v => P.Im = v });
ctl.Bm = K.slider(g, { label: "Field", min: 0.05, max: 1, step: 0.05, value: 0.3, unit: "T", on: v => P.Bm = v });
ctl.Nm = K.slider(g, { label: "Turns", min: 1, max: 200, step: 1, value: 50, on: v => P.Nm = v });
ctl.comm = K.toggle(g, { label: "Split-ring commutator", value: true, on: v => P.comm = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["B", "I", "L", "th", "N", "vm", "Bmax", "R", "Vp", "Np", "Ns", "RL", "eff", "Im", "Bm", "Nm", "speed"]) ctl[k].set(P[k]); ctl.v.set(Math.log10(P.v)); ctl.Bp.set(P.Bp * 1000); ctl.part.set(P.part); ctl.comm.set(P.comm); ctl.view.set(P.view); mag = { x: -4, v: P.vm }; tI = 0; emfHist = []; fluxHist = []; energy = 0; ang = 0.3; omega = 0; showGroups(); }

// ---------------- Simulation ----------------
function tick(dt) {
  const s = dt * P.speed; orbitT += s; tT += s;
  if (P.view === "ind") { tI += s; const prev = mag.x; if (xDrag !== null) { mag.x = xDrag; } else { mag.x += mag.v * s; if (mag.x > 3.5) mag.x = 3.5, mag.v = 0; } const ph = flux(mag.x, P.Bmax, P.A), e = s > 0 ? -P.N * (ph - lastFlux) / s : 0; lastFlux = ph; energy += e * e / P.R * s; emfHist.push([tI, e]); fluxHist.push([tI, ph * 1000]); if (emfHist.length > 600) { emfHist.shift(); fluxHist.shift(); } }
  if (P.view === "motor") { const dir = P.comm ? Math.sign(Math.cos(ang)) || 1 : 1, tq = torque(P.Bm, P.Im, P.Nm, P.Am, ang) * dir - 0.0005 * omega - (P.comm ? P.load * Math.sign(omega) : 0); omega += tq / 2e-5 * s * 0.01 - omega * 0.6 * s; ang += omega * s; }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
K.pointer(cv.el, { down: p => { if (P.view === "ind") xDrag = (p.x - cv.w / 2) / (cv.w * 0.11); }, drag: p => { if (P.view === "ind" && xDrag !== null) xDrag = K.clamp((p.x - cv.w / 2) / (cv.w * 0.11), -4, 4); }, up: () => { if (xDrag !== null) { mag.v = 0; xDrag = null; } } });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const arrow = (c, x1, y1, x2, y2, col, w = 3) => { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 12 * Math.cos(a - 0.4), y2 - 12 * Math.sin(a - 0.4)); c.lineTo(x2 - 12 * Math.cos(a + 0.4), y2 - 12 * Math.sin(a + 0.4)); c.fill(); c.lineWidth = 1; };
function drawForce(c, w, h) {
  const cx = w * 0.3, cy = h * 0.45, F = Fwire(P.B, P.I, P.L, P.th);
  // N and S poles with field lines left to right
  c.fillStyle = "#d9534f"; c.fillRect(30, cy - 120, 50, 240); c.fillStyle = "#3b82f6"; c.fillRect(w * 0.6 - 80, cy - 120, 50, 240); TX(c, "N", 55, cy + 6, "#fff", "center", "700 20px"); TX(c, "S", w * 0.6 - 55, cy + 6, "#fff", "center", "700 20px");
  c.globalAlpha = 0.25 + 0.75 * P.B; for (let i = 0; i < 7; i++) arrow(c, 90, cy - 105 + i * 35, w * 0.6 - 95, cy - 105 + i * 35, "#7aa2d6", 1.5); c.globalAlpha = 1;
  // the wire, drawn at angle θ to the field (in the plane of the screen); current shown by moving dots
  const a = P.th * Math.PI / 180, Lp = 90 + 600 * P.L, dx = Math.cos(a) * Lp, dy = -Math.sin(a) * Lp * 0.5;
  c.strokeStyle = "#e8b04a"; c.lineWidth = 6; c.beginPath(); c.moveTo(cx - dx, cy - dy); c.lineTo(cx + dx, cy + dy); c.stroke(); c.lineWidth = 1;
  const tt = performance.now() / 1000; for (let i = 0; i < 8; i++) { const u = ((tt * 0.3 * Math.sign(P.I || 1) + i / 8) % 1 + 1) % 1; c.fillStyle = "#fff"; c.beginPath(); c.arc(cx - dx + 2 * dx * u, cy - dy + 2 * dy * u, 3, 0, 6.3); c.fill(); }
  arrow(c, cx + dx * 0.6, cy + dy * 0.6 - 20, cx + dx * 0.9, cy + dy * 0.9 - 20, "#fff", 2); TX(c, `I = ${P.I} A`, cx + dx * 0.9 + 6, cy + dy * 0.9 - 26, "#fff", "left", "12px");
  // force into or out of the screen (the wire lies in the screen with the field)
  const sym = F * Math.sign(P.I) >= 0 ? "⊙" : "⊗", mag = Math.abs(F); TX(c, sym, cx, cy + 10, "#7ee787", "center", `${18 + Math.min(40, mag * 400)}px`);
  TX(c, `F = BIL sin θ = ${P.B.toFixed(2)} × ${Math.abs(P.I).toFixed(1)} × ${P.L.toFixed(3)} × sin ${P.th}° = ${(mag * 1000).toFixed(1)} mN, ${sym === "⊙" ? "out of the screen" : "into the screen"}`, 30, h - 22, "#eef2f8", "left", "600 13px");
  TX(c, "Fleming's left hand: First finger Field, seCond finger Current, thuMb Motion", 30, h - 44, "#8fa0bf", "left", "12px");
  // A level: a charged particle circling in a field into the screen
  if (ui.level === "adv") { const pt = PART[P.part], r = radius(pt.m, P.v, pt.q, P.Bp), ox = w * 0.82, oy = h * 0.42, scale = Math.min(140, Math.max(10, 140 * Math.min(1, r / 0.1))), T = 2 * Math.PI * pt.m / (Math.abs(pt.q) * P.Bp); c.strokeStyle = "#2a3550"; c.strokeRect(w * 0.64, 40, w * 0.34, h * 0.7); for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) TX(c, "⊗", w * 0.66 + i * w * 0.055, 70 + j * h * 0.085, "#3a4a6b", "center", "12px"); c.strokeStyle = "#ffd166"; c.beginPath(); c.arc(ox, oy, scale, 0, 6.3); c.stroke(); const ph = orbitT * 2 * (pt.q < 0 ? 1 : -1); c.fillStyle = pt.q < 0 ? "#5ad1ff" : "#ff8a70"; c.beginPath(); c.arc(ox + scale * Math.cos(ph), oy + scale * Math.sin(ph), 6, 0, 6.3); c.fill(); TX(c, `${pt.name}: r = mv/qB = ${(r * 100).toPrecision(3)} cm`, w * 0.66, h * 0.7 + 30, "#ffd166", "left", "600 12px"); TX(c, `period 2πm/qB = ${(T * 1e9).toPrecision(3)} ns (any speed)`, w * 0.66, h * 0.7 + 50, "#cfd8ea", "left", "12px"); }
}
function drawInd(c, w, h) {
  const cx = w / 2, cy = h * 0.4, sc = w * 0.11, mx = cx + mag.x * sc, e = emfHist.length ? emfHist[emfHist.length - 1][1] : 0;
  // coil
  c.strokeStyle = "#e8b04a"; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const x = cx - 70 + i * 12; c.beginPath(); c.ellipse(x, cy, 6, 46, 0, 0, 6.3); c.stroke(); } c.lineWidth = 1; TX(c, `${P.N} turns`, cx, cy - 60, "#e8b04a", "center", "12px");
  // magnet (drag it)
  c.fillStyle = "#d9534f"; c.fillRect(mx, cy - 18, 70, 36); c.fillStyle = "#3b82f6"; c.fillRect(mx - 70, cy - 18, 70, 36); TX(c, "N", mx + 35, cy + 6, "#fff", "center", "700 16px"); TX(c, "S", mx - 35, cy + 6, "#fff", "center", "700 16px");
  // galvanometer
  const gx = cx, gy = h * 0.78; c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(cx - 70, cy + 46); c.lineTo(cx - 70, gy); c.lineTo(gx - 40, gy); c.moveTo(cx + 62, cy + 46); c.lineTo(cx + 62, gy); c.lineTo(gx + 40, gy); c.stroke();
  c.fillStyle = "#151c2e"; c.beginPath(); c.arc(gx, gy, 40, Math.PI, 0); c.fill(); c.strokeStyle = "#cfd8ea"; c.stroke(); const needle = K.clamp(e / (P.N * P.Bmax * P.A * 3), -1, 1) * 1.2; c.strokeStyle = "#ff6b81"; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 36 * Math.sin(needle), gy - 36 * Math.cos(needle)); c.stroke(); c.lineWidth = 1; TX(c, "0", gx, gy - 44, "#8fa0bf", "center", "10px");
  TX(c, `EMF ${e.toFixed(3)} V · current ${(e / P.R * 1000).toFixed(1)} mA`, gx, gy + 24, "#eef2f8", "center", "600 13px");
  if (Math.abs(e) > 0.005) TX(c, e * (mag.x < 0 ? 1 : -1) < 0 || true ? (mag.x < 0 ? "the coil's near end becomes an N pole: it repels the approaching magnet (Lenz)" : "the coil's end becomes an S pole: it attracts the leaving magnet (Lenz)") : "", cx, 40, "#ffd166", "center", "12.5px");
  TX(c, "drag the magnet, or press ▶ Push the magnet through", 20, h - 12, "#8fa0bf", "left", "11.5px");
}
function drawTrans(c, w, h) {
  const Vs = P.Vp * P.Ns / P.Np, Is = Vs / P.RL, Ip = Vs * Is / (P.Vp * P.eff), cx = w / 2, cy = h * 0.45, t = tT;
  // iron core
  c.strokeStyle = "#7a8090"; c.lineWidth = 28; c.strokeRect(cx - 160, cy - 110, 320, 220); c.lineWidth = 1;
  // flux arrows going round the core, reversing with the a.c.
  const ph = Math.sin(2 * Math.PI * 0.8 * t); c.globalAlpha = Math.abs(ph); for (let i = 0; i < 4; i++) { const yy = cy - 60 + i * 40; arrow(c, cx - 160, yy, cx - 160, yy + 18 * Math.sign(ph), "#ffd166", 2); arrow(c, cx + 160, yy + 18, cx + 160, yy + 18 - 18 * Math.sign(ph), "#ffd166", 2); } c.globalAlpha = 1;
  const coil = (x, n, col, lab) => { const k = Math.min(18, Math.max(3, Math.round(Math.log2(n) * 2))); c.strokeStyle = col; c.lineWidth = 2.5; for (let i = 0; i < k; i++) { const y = cy - 80 + i * 160 / k; c.beginPath(); c.ellipse(x, y, 26, 6, 0, 0, 6.3); c.stroke(); } c.lineWidth = 1; TX(c, lab, x, cy + 104, col, "center", "600 12px"); };
  coil(cx - 160, P.Np, "#5ad1ff", `primary: ${P.Np} turns`); coil(cx + 160, P.Ns, "#ff8a70", `secondary: ${P.Ns} turns`);
  TX(c, `${P.Vp} V a.c.`, cx - 230, cy, "#5ad1ff", "right", "600 14px"); TX(c, `${Vs.toFixed(1)} V`, cx + 230, cy, "#ff8a70", "left", "600 14px");
  TX(c, `Ip = ${Ip.toFixed(3)} A`, cx - 230, cy + 24, "#5ad1ff", "right", "12px"); TX(c, `Is = ${Is.toFixed(3)} A`, cx + 230, cy + 24, "#ff8a70", "left", "12px");
  TX(c, `${P.Ns > P.Np ? "Step-up" : P.Ns < P.Np ? "Step-down" : "1:1"} transformer: Vs/Vp = Ns/Np = ${(P.Ns / P.Np).toFixed(2)}; power in ${(P.Vp * Ip).toFixed(2)} W, out ${(Vs * Is).toFixed(2)} W`, 30, h - 22, "#eef2f8", "left", "600 13px");
}
function drawMotor(c, w, h) {
  const cx = w * 0.4, cy = h * 0.45, R = 110, a = ang, dir = P.comm ? (Math.sign(Math.cos(a)) || 1) : 1;
  c.fillStyle = "#d9534f"; c.fillRect(cx - 230, cy - 120, 60, 240); c.fillStyle = "#3b82f6"; c.fillRect(cx + 170, cy - 120, 60, 240); TX(c, "N", cx - 200, cy + 6, "#fff", "center", "700 20px"); TX(c, "S", cx + 200, cy + 6, "#fff", "center", "700 20px");
  for (let i = 0; i < 5; i++) arrow(c, cx - 165, cy - 90 + i * 45, cx + 165, cy - 90 + i * 45, "rgba(122,162,214,.3)", 1.2);
  // end view: the two sides of the coil, current into (⊗) and out of (⊙) the screen
  const x1 = cx + R * Math.sin(a), y1 = cy - R * Math.cos(a), x2 = cx - R * Math.sin(a), y2 = cy + R * Math.cos(a);
  c.strokeStyle = "#e8b04a"; c.lineWidth = 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.lineWidth = 1;
  for (const [x, y, s] of [[x1, y1, dir], [x2, y2, -dir]]) { c.fillStyle = "#151c2e"; c.beginPath(); c.arc(x, y, 16, 0, 6.3); c.fill(); c.strokeStyle = "#e8b04a"; c.stroke(); TX(c, s > 0 ? "⊗" : "⊙", x, y + 7, "#fff", "center", "20px"); if (P.Im > 0) arrow(c, x, y, x, y + (s > 0 ? -1 : 1) * (30 + 40 * P.Im * P.Bm), "#7ee787", 3); }
  // commutator
  if (P.comm) { c.strokeStyle = "#c8a050"; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, 22, a + 0.2, a + Math.PI - 0.2); c.stroke(); c.beginPath(); c.arc(cx, cy, 22, a + Math.PI + 0.2, a - 0.2); c.stroke(); c.lineWidth = 1; c.fillStyle = "#555"; c.fillRect(cx - 40, cy - 6, 14, 12); c.fillRect(cx + 26, cy - 6, 14, 12); TX(c, "split ring + brushes", cx, cy + 46, "#c8a050", "center", "11px"); }
  TX(c, `${P.comm ? "With a commutator the current reverses every half turn: the coil keeps turning" : "No commutator: the forces turn the coil back, so it rocks and stops"} · ${(omega * 60 / (2 * Math.PI)).toFixed(0)} rpm`, 30, h - 22, "#eef2f8", "left", "600 13px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ force: drawForce, ind: drawInd, trans: drawTrans, motor: drawMotor })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "force") {
    const pts = []; for (let th = 0; th <= 180; th += 2) pts.push([th, 1000 * Fwire(P.B, Math.abs(P.I), P.L, th)]);
    chA.opts.title = "Force against angle"; chA.opts.xLabel = "θ (°)"; chA.opts.yLabel = "F (mN)"; chA.draw([{ pts, color: "#7ee787", label: "BIL sin θ" }, { pts: [[P.th, 1000 * Fwire(P.B, Math.abs(P.I), P.L, P.th)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 180, yMin: 0 });
    const ip = []; for (let I = 0; I <= 6; I += 0.5) ip.push([I, 1000 * Fwire(P.B, I, P.L, P.th)]);
    chB.opts.title = "Force against current"; chB.opts.xLabel = "I (A)"; chB.opts.yLabel = "F (mN)"; chB.draw([{ pts: ip, color: "#5ad1ff", label: "F ∝ I" }, { pts: [[Math.abs(P.I), 1000 * Fwire(P.B, Math.abs(P.I), P.L, P.th)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    const pt = PART[P.part]; relabel(["force on the wire", "direction", "B × I × L", "particle radius (A level)", "particle period (A level)"]);
    read.set("a", (1000 * Math.abs(Fwire(P.B, P.I, P.L, P.th))).toFixed(2) + " mN"); read.set("b", Fwire(P.B, P.I, P.L, P.th) * Math.sign(P.I || 1) >= 0 ? "out of the screen" : "into the screen"); read.set("c", (P.B * Math.abs(P.I) * P.L * 1000).toFixed(2) + " mN (at 90°)"); read.set("d", (radius(pt.m, P.v, pt.q, P.Bp) * 100).toPrecision(3) + " cm"); read.set("e", (2 * Math.PI * pt.m / (Math.abs(pt.q) * P.Bp) * 1e9).toPrecision(3) + " ns");
    ui.hud("F = BIL sin θ · Fleming's left-hand rule");
  } else if (P.view === "ind") {
    chA.opts.title = "Flux through the coil"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "Φ (mWb)"; chA.draw([{ pts: fluxHist, color: "#ffd166", label: "Φ = BA" }], { yMin: 0 });
    chB.opts.title = "Induced EMF = −N dΦ/dt"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "EMF (V)"; chB.draw([{ pts: emfHist, color: "#ff6b81", label: "EMF" }], {});
    const e = emfHist.length ? emfHist[emfHist.length - 1][1] : 0, pk = emfHist.reduce((m, p) => Math.max(m, Math.abs(p[1])), 0);
    relabel(["EMF now", "peak EMF", "flux linkage NΦ now", "current (A level)", "energy dissipated (A level)"]);
    read.set("a", e.toFixed(3) + " V"); read.set("b", pk.toFixed(3) + " V"); read.set("c", (P.N * flux(mag.x, P.Bmax, P.A) * 1000).toFixed(2) + " mWb-turns"); read.set("d", (e / P.R * 1000).toFixed(1) + " mA"); read.set("e", (energy * 1000).toFixed(2) + " mJ");
    ui.hud("An EMF is induced only while the flux is changing: ε = −N dΦ/dt");
  } else if (P.view === "trans") {
    const Vs = P.Vp * P.Ns / P.Np, Is = Vs / P.RL, Ip = Vs * Is / (P.Vp * P.eff), vp = [], vs = []; for (let i = 0; i <= 100; i++) { const t = i / 100 * 2 / 50; vp.push([t * 1000, P.Vp * Math.SQRT2 * Math.sin(2 * Math.PI * 50 * t)]); vs.push([t * 1000, Vs * Math.SQRT2 * Math.sin(2 * Math.PI * 50 * t)]); }
    chA.opts.title = "Voltages (50 Hz)"; chA.opts.xLabel = "time (ms)"; chA.opts.yLabel = "V"; chA.draw([{ pts: vp, color: "#5ad1ff", label: "primary" }, { pts: vs, color: "#ff8a70", label: "secondary" }], {});
    const ns = []; for (let n = 10; n <= 4000; n += 40) ns.push([n, P.Vp * n / P.Np]);
    chB.opts.title = "Vs against Ns"; chB.opts.xLabel = "secondary turns"; chB.opts.yLabel = "Vs (V)"; chB.draw([{ pts: ns, color: "#ff8a70", label: "Vp Ns/Np" }, { pts: [[P.Ns, Vs]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    relabel(["secondary voltage", "secondary current", "primary current", "power in / out", "turns ratio"]);
    read.set("a", Vs.toFixed(2) + " V"); read.set("b", Is.toFixed(3) + " A"); read.set("c", Ip.toFixed(3) + " A"); read.set("d", `${(P.Vp * Ip).toFixed(2)} W / ${(Vs * Is).toFixed(2)} W`); read.set("e", `1 : ${(P.Ns / P.Np).toFixed(2)}`);
    ui.hud("Vs/Vp = Ns/Np · VpIp = VsIs (100% efficient)");
  } else {
    const pts = []; for (let d = 0; d <= 360; d += 3) { const th = d * Math.PI / 180, dir = P.comm ? (Math.sign(Math.cos(th)) || 1) : 1; pts.push([d, 1000 * torque(P.Bm, P.Im, P.Nm, P.Am, th) * dir]); }
    chA.opts.title = "Torque against angle"; chA.opts.xLabel = "coil angle (°)"; chA.opts.yLabel = "torque (mN m)"; chA.draw([{ pts, color: "#7ee787", label: P.comm ? "with commutator" : "without" }, { pts: [[((ang * 180 / Math.PI) % 360 + 360) % 360, 1000 * torque(P.Bm, P.Im, P.Nm, P.Am, ang) * (P.comm ? (Math.sign(Math.cos(ang)) || 1) : 1)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 360 });
    const bp = []; for (let I = 0; I <= 5; I += 0.25) bp.push([I, 1000 * 2 / Math.PI * P.Bm * I * P.Nm * P.Am]);
    chB.opts.title = "Average torque against current"; chB.opts.xLabel = "current (A)"; chB.opts.yLabel = "mN m"; chB.draw([{ pts: bp, color: "#5ad1ff", label: "(2/π)BINA" }, { pts: [[P.Im, 1000 * 2 / Math.PI * P.Bm * P.Im * P.Nm * P.Am]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    relabel(["speed", "peak torque BINA", "average torque", "back-EMF (A level, beyond the spec)", "coil angle"]);
    read.set("a", (omega * 60 / (2 * Math.PI)).toFixed(0) + " rpm"); read.set("b", (1000 * P.Bm * P.Im * P.Nm * P.Am).toFixed(1) + " mN m"); read.set("c", (1000 * 2 / Math.PI * P.Bm * P.Im * P.Nm * P.Am).toFixed(1) + " mN m"); read.set("d", (P.Bm * P.Nm * P.Am * Math.abs(omega)).toFixed(3) + " V"); read.set("e", (((ang * 180 / Math.PI) % 360 + 360) % 360).toFixed(0) + "°");
    ui.hud("The commutator reverses the current every half turn");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Four views at the top of the controls.", 6000);
