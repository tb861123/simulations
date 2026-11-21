/* =====================================================================
   NERVE IMPULSE: the Hodgkin–Huxley model of a squid giant axon
   The axon is cut into 150 short compartments (1 mm each). Each one is
   a patch of membrane with:
     - a capacitor (the lipid bilayer stores charge)
     - voltage-gated Na+ channels   (gates m and h)
     - voltage-gated K+ channels    (gate n)
     - a small leak
   and is joined to its neighbours by the resistance of the axoplasm.
   These are the equations Hodgkin and Huxley published in 1952
   (Nobel Prize 1963). The action potential is not drawn: it is solved.
   ===================================================================== */
const NX = 150, DX = 0.1;                 // compartments, each 0.1 cm long
const ENA = 50, EK = -77, EL = -54.4, VREST = -65;   // reversal potentials and resting potential (mV)
const GNA = 120, GK = 36, GL = 0.3;       // maximum conductances (mS/cm²)
const RI = 0.0354;                        // resistivity of axoplasm (kΩ·cm)
// Opening (alpha) and closing (beta) rates of the three gates, per ms, as functions of voltage
const vtrap = (x, y) => Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (Math.exp(x / y) - 1);
const am = V => 0.1 * vtrap(-(V + 40), 10), bm = V => 4 * Math.exp(-(V + 65) / 18);
const ah = V => 0.07 * Math.exp(-(V + 65) / 20), bh = V => 1 / (1 + Math.exp(-(V + 35) / 10));
const an = V => 0.01 * vtrap(-(V + 55), 10), bn = V => 0.125 * Math.exp(-(V + 65) / 80);

class Axon {
  constructor(o = {}) {
    this.o = Object.assign({ radius: 238, temp: 6.3, myelin: false, lesion: false, ttx: 0, noise: 0 }, o);
    this.V = new Float64Array(NX).fill(VREST); this.m = new Float64Array(NX); this.h = new Float64Array(NX); this.n = new Float64Array(NX);
    this.gna = new Float64Array(NX); this.gk = new Float64Array(NX); this.gl = new Float64Array(NX); this.cm = new Float64Array(NX); this.el = new Float64Array(NX); this.node = new Uint8Array(NX);
    this.stim = []; this.t = 0; this.cp = new Float64Array(NX); this.dp = new Float64Array(NX);
    for (let i = 0; i < NX; i++) { this.m[i] = am(VREST) / (am(VREST) + bm(VREST)); this.h[i] = ah(VREST) / (ah(VREST) + bh(VREST)); this.n[i] = an(VREST) / (an(VREST) + bn(VREST)); }
    this.build();
  }
  // Lay out the membrane: bare axon everywhere, or myelin with a node of Ranvier every 10 mm
  build() {
    const o = this.o;
    for (let i = 0; i < NX; i++) {
      const isNode = !o.myelin || i % 10 === 5 || i < 3, lesion = o.lesion && o.myelin && i >= 56 && i < 114;
      this.node[i] = isNode ? 1 : lesion ? 2 : 0;
      if (isNode) { const d = o.myelin ? 4 : 1; this.gna[i] = GNA * d * (1 - o.ttx); this.gk[i] = GK * d; this.gl[i] = GL; this.cm[i] = 1; this.el[i] = EL; }       // nodes are packed with channels
      else if (lesion) { this.gna[i] = 0; this.gk[i] = 0; this.gl[i] = 2; this.cm[i] = 1; this.el[i] = VREST; }   // myelin stripped away, but no channels underneath: leaky bare membrane
      else { this.gna[i] = 0; this.gk[i] = 0; this.gl[i] = 0.002; this.cm[i] = 0.01; this.el[i] = VREST; }          // myelin: an insulator with tiny capacitance
    }
    this.gax = (o.radius * 1e-4) / (2 * RI * DX * DX);     // coupling between neighbours: bigger axon = lower resistance
    this.phi = Math.pow(3, (o.temp - 6.3) / 10);            // channels open and close about 3x faster for each +10 °C
  }
  pulse(x, amp, dur, delay = 0) { this.stim.push({ x, amp, t0: this.t + delay, t1: this.t + delay + dur }); }
  step(dt) {
    const { V, m, h, n, gna, gk, gl, cm, el, cp, dp } = this, N = NX, g = this.gax; this.t += dt;
    // 1. gates relax towards their voltage-dependent targets
    const f = dt * this.phi;
    for (let i = 0; i < N; i++) if (gna[i] || gk[i]) {
      const v = V[i]; let a = am(v), b = bm(v); m[i] = a / (a + b) + (m[i] - a / (a + b)) * Math.exp(-f * (a + b));
      a = ah(v); b = bh(v); h[i] = a / (a + b) + (h[i] - a / (a + b)) * Math.exp(-f * (a + b));
      a = an(v); b = bn(v); n[i] = a / (a + b) + (n[i] - a / (a + b)) * Math.exp(-f * (a + b));
    }
    // 2. voltage: C dV/dt = -(Na current + K current + leak) + current from neighbours + stimulus
    //    solved implicitly (a tridiagonal system) so the calculation stays stable
    this.stim = this.stim.filter(s => s.t1 > this.t - 1);
    for (let i = 0; i < N; i++) {
      const GNa = gna[i] * m[i] * m[i] * m[i] * h[i], GKk = gk[i] * n[i] * n[i] * n[i] * n[i], c = cm[i] / dt;
      let rhs = c * V[i] + GNa * ENA + GKk * EK + gl[i] * el[i];
      for (const s of this.stim) if (this.t >= s.t0 && this.t < s.t1 && Math.abs(i - s.x) <= 1) rhs += s.amp;
      if (this.o.noise) rhs += this.o.noise * (Math.random() - .5) * 2;
      const nb = (i > 0 ? 1 : 0) + (i < N - 1 ? 1 : 0), diag = c + GNa + GKk + gl[i] + nb * g, lo = i > 0 ? -g : 0;
      const w = i > 0 ? diag - lo * cp[i - 1] : diag; cp[i] = (i < N - 1 ? -g : 0) / w; dp[i] = (rhs - (i > 0 ? lo * dp[i - 1] : 0)) / w;
    }
    V[N - 1] = dp[N - 1]; for (let i = N - 2; i >= 0; i--) V[i] = dp[i] - cp[i] * V[i + 1];
  }
}
// Headless measurement: stimulate the left end, time the spike at two points, return speed (m/s) and peak (mV).
// With a second pulse, peak2 is the height of the second spike near the stimulus (-65 = nothing happened).
function measure(o, amp = 400, dur = 0.5, second) {
  const ax = new Axon(o), xa = 45, xb = 125, xn = 12; let ta = null, tb = null, peak = -100, peak2 = -100, st = 0; ax.pulse(1, amp, dur); if (second != null) ax.pulse(1, amp, dur, second);
  const dt = 0.01, tEnd = 60 / Math.sqrt(ax.phi) + (second || 0);
  for (let t = 0; t < tEnd; t += dt) {
    const a0 = ax.V[xa], b0 = ax.V[xb]; ax.step(dt);
    if (ta == null && a0 < -20 && ax.V[xa] >= -20) ta = ax.t; if (tb == null && b0 < -20 && ax.V[xb] >= -20) tb = ax.t; if (ax.V[xb] > peak) peak = ax.V[xb];
    if (second != null) { const v = ax.V[xn]; if (st === 0 && v > -20) st = 1; else if (st === 1 && v < -55) st = 2; else if (st === 2 && ax.t > second && v > peak2) peak2 = v; if (ax.t > second + 12) break; }
    else if (tb != null && ax.t > tb + 3) break;
  }
  return { v: ta != null && tb != null ? (xb - xa) * DX / (tb - ta) * 10 : 0, peak, peak2 };
}

// ---------------------------------------------------------------- page
let ax = new Axon(), slow = 0.06, ea = 45, eb = 125, stimX = 2, rec, cross, ions = [], burst = [], lastTermV = VREST; const S = {};
const ui = K.app({
  title: "Nerve Impulse", subject: "Medicine", sound: "Sound: an audio monitor on electrode B pops each time an impulse passes it, as in a physiology lab", blurb: "The Hodgkin–Huxley equations, live: fire an axon, block it, myelinate it, damage it.",
  reset: () => { fresh(); },
  missions: [
    { title: "All or nothing", q: "Lower the <b>stimulus strength</b> and press Stimulate each time. Find the threshold. Then go well above it: does a bigger stimulus give a bigger impulse?", hint: "Below threshold nothing travels: the little bump dies away. Above it, the spike is the same height (about +40 mV) however hard you push. Strength of a sensation is coded by how <i>often</i> a nerve fires, never by spike size.", setup: () => { fresh(); S.amp.set(80, true); fire(); } },
    { title: "What makes the spike?", q: "Slow the motion right down and stimulate. Watch the close-up membrane and the gates chart. Which channels open first? What ends the spike?", hint: "Na⁺ channels (m gate) snap open first: Na⁺ floods in and the inside goes positive. A fraction of a millisecond later they inactivate (h falls) and the slower K⁺ channels (n) open: K⁺ leaves and the voltage falls back, overshooting below rest.", setup: () => { fresh(); S.slow.set(0.02, true); fire(); } },
    { title: "Refractory period", q: "Two identical pulses, 8 ms apart. Shrink the <b>gap</b> and fire again. How close can the second be and still start an impulse? Why is there a limit?", hint: "Just after a spike the Na⁺ channels are still inactivated (h is low) and K⁺ channels are still open. Until they recover, a second impulse is impossible (absolute) or weaker (relative). This caps the firing rate and makes impulses one-way.", setup: () => { fresh(); S.gap.set(8, true); fire(true); } },
    { title: "Head-on collision", q: "Both ends are stimulated at once. Predict: when the two impulses meet, do they pass through each other like water waves, bounce back, or vanish?", hint: "They annihilate. Each impulse leaves refractory membrane behind it, so when they meet there is no excitable membrane ahead of either. A nerve impulse is not an ordinary wave: it does not obey superposition.", setup: () => { fresh(); ax.pulse(2, 300, 0.5); ax.pulse(NX - 3, 300, 0.5); } },
    { title: "Why is the squid's axon giant?", q: "Measure the speed for a thin axon and a fat one. Then try warming it up. What is the pattern, and what is the cost of each strategy?", hint: "Speed ∝ √diameter: to double the speed you need four times the diameter. Squid use this for their escape reflex. Warmth speeds the channels (part of why 'cold-blooded' reflexes are slow in the cold), but above about 30 °C this axon fails altogether.", setup: () => { fresh(); S.rad.set(200, true); fire(); } },
    { title: "Myelin", q: "Switch on the myelin sheath and stimulate. How does the impulse travel now? Compare the speed with the bare axon of the same diameter.", hint: "The impulse jumps from node to node (saltatory conduction). Myelin insulates, so current flows quickly along the inside to the next node, and only the nodes have to do the slow business of opening channels. Vertebrates get speed without giant axons.", setup: () => { S.my.set(true, true); S.les.set(false, true); fresh(); fire(); } },
    { title: "Multiple sclerosis", q: "In MS the immune system strips myelin from stretches of axon. Switch on the <b>damaged stretch</b> and stimulate. What happens at the lesion, and why can't the bare membrane just carry the impulse?", hint: "The impulse dies in the lesion. The membrane under myelin has almost no Na⁺ channels, and without insulation the current leaks away before it can bring the next node to threshold. Signals fail: numbness, weakness, loss of vision.", setup: () => { S.my.set(true, true); S.les.set(true, true); fresh(); fire(); } },
    { title: "Pufferfish poison", q: "Tetrodotoxin (TTX) plugs Na⁺ channels; local anaesthetics like lidocaine do something similar. Raise the block in steps. What happens to the speed and height of the impulse, and at what dose does it fail?", hint: "With fewer working Na⁺ channels the spike rises more slowly, so the impulse travels more slowly and is smaller. Beyond roughly 80% block it cannot regenerate at all. No pain signals at the dentist; no breathing after badly prepared fugu.", setup: () => { S.my.set(false, true); S.les.set(false, true); S.ttx.set(40, true); fresh(); fire(); } },
  ],
  batch: [
    { title: "Speed and diameter", question: "How does conduction speed depend on axon diameter?", how: "Unmyelinated axon at 6.3 °C; speed is timed between two electrodes 80 mm apart.", xLabel: "axon diameter (µm)", yLabel: "conduction speed (m/s)", xs: [100, 200, 400, 600, 800, 1000], reps: 4, yMin: 0, theory: d => 12.23 * Math.sqrt(d / 476), theoryLabel: "speed ∝ √diameter",
      run: (d, r) => measure({ radius: d / 2, noise: 6 }).v, note: "A little random current is injected everywhere to imitate the noisy opening of individual channels. It shifts the moment each patch reaches threshold very slightly." },
    { title: "All or nothing", question: "Does a stronger stimulus give a bigger impulse?", how: "A 0.5 ms pulse of different strengths; the peak voltage is recorded 120 mm away.", xLabel: "stimulus strength (µA/cm²)", yLabel: "peak voltage far along the axon (mV)", xs: [10, 25, 40, 46, 52, 60, 80, 120, 160], reps: 5,
      run: (a, r) => measure({ noise: 12 }, a).peak, note: "Close to threshold, random channel noise decides whether the axon fires, so the same stimulus can give either result. That really happens in neurons." },
    { title: "Speed and temperature", question: "Do warm nerves conduct faster?", how: "Standard squid axon (476 µm). Gate rates triple for every 10 °C.", xLabel: "temperature (°C)", yLabel: "conduction speed (m/s)", xs: [0, 5, 10, 15, 20, 25, 30], reps: 4, yMin: 0,
      run: (T, r) => measure({ temp: T, noise: 6 }).v, note: "Speed rises with temperature because the Na⁺ gates open sooner. But the spike also gets shorter and smaller, and above about 30 °C this model axon stops conducting (speed 0): 'heat block'." },
    { title: "Refractory period", question: "How soon can a second impulse follow the first?", how: "Two identical strong pulses; the height of the second spike is measured near the stimulus.", xLabel: "gap between pulses (ms)", yLabel: "peak of second spike (mV)", xs: [3, 4, 5, 6, 7, 8, 10, 12, 16, 20], reps: 4,
      run: (g, r) => measure({ noise: 6 }, 400, 0.5, g).peak2, note: "Around the end of the absolute refractory period, noise decides whether the second spike starts at all." },
    { title: "Sodium channel block", question: "What fraction of Na⁺ channels can be blocked before conduction fails?", how: "Tetrodotoxin blocks a percentage of the Na⁺ channels along the whole axon.", xLabel: "Na⁺ channels blocked (%)", yLabel: "conduction speed (m/s)", xs: [0, 20, 40, 60, 70, 75, 80, 85, 90], reps: 4, yMin: 0,
      run: (p, r) => measure({ ttx: p / 100, noise: 6 }).v, note: "Near the failure point the outcome is all-or-nothing and sensitive to noise." },
  ],
  notes: `<h3>What is being calculated</h3><p>The axon is 150 mm long, in 1 mm compartments. For each one the program solves</p><p><code>C dV/dt = −g<sub>Na</sub>m³h(V−E<sub>Na</sub>) − g<sub>K</sub>n⁴(V−E<sub>K</sub>) − g<sub>L</sub>(V−E<sub>L</sub>) + current from neighbours</code></p><p>with the gates m, h and n opening and closing at voltage-dependent rates: the Hodgkin–Huxley equations with their original 1952 squid-axon numbers.</p>
  <h3>Reading the picture</h3><ul><li>Axon colour = membrane voltage (blue at rest, −65 mV; yellow-white at the peak, about +40 mV).</li><li><b>m</b> = Na⁺ activation gate (fast), <b>h</b> = Na⁺ inactivation gate (the "ball and chain"), <b>n</b> = K⁺ gate (slow).</li><li>Na⁺ channel open fraction = m³h; K⁺ channel open fraction = n⁴.</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>It is a squid giant axon (about 0.5 mm across, 6.3 °C). Human axons are far thinner and warmer, with different channel types, but work on the same principles.</li><li>Ion concentrations never change, so the Na⁺/K⁺ pump is not modelled. (One impulse moves very few ions; the pump matters over minutes.)</li><li>Myelin is an ideal thin insulator with nodes every 10 mm; real internodes are about 1 mm and nodes about 1 µm. The node spacing is exaggerated so you can see the jumps.</li><li>The lesion is treated as leaky membrane with no channels.</li><li>The close-up shows a handful of channels standing for millions. Their widths show the average open fraction; real channels are either fully open or shut.</li><li>The synapse at the end is decoration only.</li><li>1 mm compartments make the speed about a third lower than the true 19 m/s.</li></ul>`,
});
let g = ui.group("Stimulate");
const rs = K.row(g); K.btn(rs, "⚡ Stimulate", () => fire(), "primary"); K.btn(rs, "⚡⚡ Two pulses", () => fire(true));
S.amp = K.slider(g, { label: "Stimulus strength", min: 5, max: 200, step: 1, value: 80, unit: "µA/cm²" });
S.gap = K.slider(g, { label: "Gap between two pulses", min: 2, max: 20, step: 0.5, value: 8, unit: "ms" });
K.note(g, "You can also <b>click anywhere on the axon</b> to stimulate it there, and drag electrodes A and B.");
g = ui.group("The axon");
S.rad = K.slider(g, { label: "Diameter", min: 100, max: 1000, step: 20, value: 476, unit: "µm", on: v => { ax.o.radius = v / 2; ax.build(); } });
S.temp = K.slider(g, { label: "Temperature", min: 0, max: 35, step: 0.5, value: 6.5, unit: "°C", on: v => { ax.o.temp = v; ax.build(); } });
S.my = K.toggle(g, { label: "Myelin sheath (nodes of Ranvier every 10 mm)", value: false, on: v => { ax.o.myelin = v; if (!v) S.les.set(false); ax.o.lesion = S.les.value; fresh(); } });
S.les = K.toggle(g, { label: "Damaged stretch of myelin (as in MS)", value: false, on: v => { if (v) S.my.set(true); ax.o.myelin = S.my.value; ax.o.lesion = v; fresh(); } });
g = ui.group("Drugs and toxins");
S.ttx = K.slider(g, { label: "Na⁺ channels blocked (TTX, lidocaine)", min: 0, max: 100, step: 5, value: 0, unit: "%", on: v => { ax.o.ttx = v / 100; ax.build(); } });
g = ui.group("View");
S.slow = K.slider(g, { label: "Slow motion", min: 0.01, max: 0.2, step: 0.01, value: 0.06, fmt: v => v.toFixed(2) + " ms per frame", on: v => slow = v });
g = ui.group("Measurements");
const read = K.readout(g, [["v", "Speed A → B"], ["pk", "Peak at B"], ["va", "Voltage at A"], ["t", "Time"]]);

function fresh() { ax = new Axon({ radius: S.rad.value / 2, temp: S.temp.value, myelin: S.my.value, lesion: S.les.value, ttx: S.ttx.value / 100 }); rec = { a: [], b: [], m: [], h: [], n: [] }; cross = { ta: null, tb: null, v: null, pk: -100 }; ions = []; burst = []; }
function fire(two, x) { cross.ta = cross.tb = null; cross.pk = -100; const amp = S.amp.value; stimX = x == null ? 2 : x; ax.pulse(stimX, amp, 0.5); if (two) ax.pulse(stimX, amp, 0.5, S.gap.value); ui.setPlaying(true); }

// ---- Drawing ----
const STOPS = [[-85, [20, 30, 90]], [-65, [38, 60, 150]], [-50, [125, 80, 215]], [-20, [255, 90, 140]], [10, [255, 180, 84]], [45, [255, 250, 205]]];
function vcol(V) { for (let k = 1; k < STOPS.length; k++) if (V <= STOPS[k][0] || k === STOPS.length - 1) { const [v0, c0] = STOPS[k - 1], [v1, c1] = STOPS[k], t = K.clamp((V - v0) / (v1 - v0), 0, 1); return `rgb(${c0[0] + (c1[0] - c0[0]) * t | 0},${c0[1] + (c1[1] - c0[1]) * t | 0},${c0[2] + (c1[2] - c0[2]) * t | 0})`; } }
const cv = ui.canvas(), SX = 80; let L = {};
function layout() { const w = cv.w, h = cv.h; L = { x0: 124, x1: w - 78, ya: h * 0.2, th: 9 + S.rad.value / 90, py0: h * 0.36, py1: h * 0.56, my0: h * 0.63, my1: h - 12 }; L.X = i => L.x0 + (i + .5) / NX * (L.x1 - L.x0); }
function draw() {
  layout(); const c = cv.ctx, w = cv.w, h = cv.h, V = ax.V, { x0, x1, ya, th } = L, seg = (x1 - x0) / NX;
  const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#0a1024"); bg.addColorStop(1, "#060912"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  // --- the neuron: cell body and dendrites on the left
  c.strokeStyle = vcol(V[0]); c.lineCap = "round";
  const den = [[-52, -46, 5], [-58, -8, 6], [-50, 40, 5], [-14, -60, 4], [-10, 58, 4]];
  for (const [dx, dy, lw] of den) { c.lineWidth = lw; c.beginPath(); c.moveTo(SX, ya); c.quadraticCurveTo(SX + dx * .5, ya + dy * .3, SX + dx, ya + dy); c.stroke(); c.lineWidth = lw * .5; c.beginPath(); c.moveTo(SX + dx, ya + dy); c.lineTo(SX + dx * 1.25 - 6, ya + dy * 1.3 - 5); c.moveTo(SX + dx, ya + dy); c.lineTo(SX + dx * 1.25 + 3, ya + dy * 1.3 + 7); c.stroke(); }
  c.lineWidth = th; c.beginPath(); c.moveTo(SX, ya); c.lineTo(x0, ya); c.stroke();
  c.fillStyle = vcol(V[0]); c.beginPath(); c.arc(SX, ya, 27, 0, 6.3); c.fill(); c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.arc(SX - 4, ya - 3, 10, 0, 6.3); c.fill();
  // --- the axon, coloured by voltage, with a glow where it is depolarised
  for (let i = 0; i < NX; i++) { const v = V[i]; if (v > -45) { c.shadowColor = vcol(v); c.shadowBlur = 22; } c.fillStyle = vcol(v); c.fillRect(x0 + i * seg - .5, ya - th / 2, seg + 1, th); c.shadowBlur = 0; }
  // --- myelin
  if (ax.o.myelin) for (let i = 0; i < NX; i++) {
    if (ax.node[i] === 0 && (i === 0 || ax.node[i - 1] !== 0)) { let j = i; while (j < NX && ax.node[j] === 0) j++; const gr = c.createLinearGradient(0, ya - th, 0, ya + th); gr.addColorStop(0, "#fff3c9"); gr.addColorStop(.5, "#e9d28f"); gr.addColorStop(1, "#b99d58"); c.fillStyle = gr; c.globalAlpha = .93; c.beginPath(); c.roundRect(x0 + i * seg + 1, ya - th * .95, (j - i) * seg - 2, th * 1.9, th * .8); c.fill(); c.globalAlpha = 1; }
    if (ax.node[i] === 2 && i % 3 === 0) { c.fillStyle = "rgba(233,210,143,.55)"; c.beginPath(); c.ellipse(x0 + i * seg, ya + (i % 2 ? -1 : 1) * th * .75, 3, 2, i, 0, 6.3); c.fill(); }
  }
  if (ax.o.lesion) { c.fillStyle = "#ff6b81"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("damaged: myelin stripped", L.X(85), ya + th + 16); }
  // --- terminals and neurotransmitter
  c.strokeStyle = vcol(V[NX - 1]); for (const dy of [-26, 0, 26]) { c.lineWidth = 5; c.beginPath(); c.moveTo(x1, ya); c.quadraticCurveTo(x1 + 16, ya + dy * .4, x1 + 34, ya + dy); c.stroke(); c.fillStyle = vcol(V[NX - 1]); c.beginPath(); c.arc(x1 + 38, ya + dy, 7, 0, 6.3); c.fill(); }
  if (lastTermV < 0 && V[NX - 1] >= 0) for (let k = 0; k < 45; k++) burst.push({ x: x1 + 44, y: ya + [-26, 0, 26][k % 3], vx: 1 + Math.random() * 2.2, vy: (Math.random() - .5) * 1.6, t: 1 }); lastTermV = V[NX - 1];
  burst = burst.filter(b => b.t > 0); for (const b of burst) { b.x += b.vx; b.y += b.vy; b.t -= 0.02; c.fillStyle = `rgba(126,231,135,${b.t})`; c.beginPath(); c.arc(b.x, b.y, 2.2, 0, 6.3); c.fill(); }
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "center"; c.fillText("cell body", SX, ya + 78); c.fillText("synapse", x1 + 36, ya + 52);
  // --- electrodes and stimulator
  [[ea, "#7ee787", "A"], [eb, "#ffb454", "B"]].forEach(([e, col, name]) => { const x = L.X(e); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, ya - th / 2 - 2); c.lineTo(x, ya - th / 2 - 30); c.stroke(); c.beginPath(); c.arc(x, ya - th / 2 - 38, 10, 0, 6.3); c.fill(); c.fillStyle = "#06101c"; c.font = "700 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(name, x, ya - th / 2 - 34); });
  if (ax.stim.some(s => ax.t >= s.t0 && ax.t < s.t1 + .4)) { const s = ax.stim[ax.stim.length - 1]; c.fillStyle = "#ffe66d"; c.font = "22px Segoe UI,sans-serif"; c.fillText("⚡", L.X(s.x), ya + th / 2 + 26); }
  // --- voltage profile along the axon, lined up with the picture above
  const { py0, py1 } = L, PY = v => py1 - (v + 90) / 150 * (py1 - py0);
  c.strokeStyle = "#24324f"; c.lineWidth = 1; c.setLineDash([4, 4]); for (const v of [-65, 0, 40]) { c.beginPath(); c.moveTo(x0, PY(v)); c.lineTo(x1, PY(v)); c.stroke(); c.fillStyle = "#8fa0bf"; c.textAlign = "right"; c.font = "11px Segoe UI,sans-serif"; c.fillText((v > 0 ? "+" : "") + v + " mV", x0 - 6, PY(v) + 4); } c.setLineDash([]);
  c.textAlign = "left"; c.fillStyle = "#8fa0bf"; c.fillText("Voltage along the axon right now  (scale bar: 20 mm)", x0, py0 - 8); c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(x1 - 20 * seg, py0 - 12); c.lineTo(x1, py0 - 12); c.stroke();
  const grd = c.createLinearGradient(0, py0, 0, py1); grd.addColorStop(0, "rgba(255,180,84,.5)"); grd.addColorStop(1, "rgba(90,140,255,.04)");
  c.beginPath(); c.moveTo(L.X(0), PY(-90)); for (let i = 0; i < NX; i++) c.lineTo(L.X(i), PY(V[i])); c.lineTo(L.X(NX - 1), PY(-90)); c.fillStyle = grd; c.fill();
  c.beginPath(); for (let i = 0; i < NX; i++) i ? c.lineTo(L.X(i), PY(V[i])) : c.moveTo(L.X(i), PY(V[i])); c.strokeStyle = "#ffd9a0"; c.lineWidth = 2; c.stroke();
  drawMembrane(c);
}
// --- close-up of the membrane under electrode A: channels widen as their gates open, ions stream through
function drawMembrane(c) {
  const { my0, my1 } = L, x0 = 24, x1 = cv.w - 24, mid = (my0 + my1) / 2 + 6, V = ax.V[ea], pNa = ax.m[ea] ** 3 * ax.h[ea] * (1 - ax.o.ttx), pK = ax.n[ea] ** 4, hasCh = ax.gna[ea] > 0 || ax.o.ttx === 1;
  c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = "#24324f"; c.lineWidth = 1; c.beginPath(); c.roundRect(x0, my0, x1 - x0, my1 - my0, 12); c.fill(); c.stroke();
  c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = "#7ee787"; c.textAlign = "left"; c.fillText("Close-up: the membrane under electrode A", x0 + 12, my0 + 17);
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.fillText("OUTSIDE  (lots of Na⁺)", x0 + 12, my0 + 34); c.fillText("INSIDE  (lots of K⁺)", x0 + 12, my1 - 8);
  c.textAlign = "right"; c.font = "600 20px Segoe UI,sans-serif"; c.fillStyle = vcol(Math.max(V, -40)); c.fillText((V > 0 ? "+" : "") + V.toFixed(0) + " mV", x1 - 14, my0 + 26);
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.fillText(V > 0 ? "inside positive" : "inside negative", x1 - 14, my0 + 41);
  // lipid bilayer
  const n = Math.floor((x1 - x0 - 20) / 11); for (let k = 0; k < n; k++) { const x = x0 + 14 + k * 11; c.strokeStyle = "#5a4a2a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, mid - 9); c.lineTo(x, mid + 9); c.stroke(); c.fillStyle = "#d9b25f"; c.beginPath(); c.arc(x, mid - 11, 4, 0, 6.3); c.arc(x, mid + 11, 4, 0, 6.3); c.fill(); }
  if (!hasCh) { c.fillStyle = "#e9d28f"; c.textAlign = "center"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("No channels here: this stretch is under the myelin sheath. Drag electrode A onto a node.", (x0 + x1) / 2, mid - 26); return; }
  const nCh = 8, sp = (x1 - x0 - 260) / nCh;
  for (let k = 0; k < nCh; k++) {
    const isNa = k % 2 === 0, x = x0 + 150 + (k + .5) * sp, open = K.clamp((isNa ? pNa : pK) / 0.28, 0, 1), gap = 2 + open * 9, col = isNa ? "#ff7b9c" : "#5ad1ff";
    c.fillStyle = "#0a1024"; c.fillRect(x - 17, mid - 17, 34, 34);
    c.fillStyle = col; c.globalAlpha = .9; c.beginPath(); c.roundRect(x - gap / 2 - 12, mid - 19, 12, 38, 5); c.roundRect(x + gap / 2, mid - 19, 12, 38, 5); c.fill(); c.globalAlpha = 1;
    if (isNa) { const hb = 1 - ax.h[ea]; c.strokeStyle = "#ffe66d"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 12, mid + 19); c.lineTo(x + 6 - hb * 6, mid + 28 - hb * 6); c.stroke(); c.fillStyle = "#ffe66d"; c.beginPath(); c.arc(x + 6 - hb * 6, mid + 30 - hb * 9, 4.5, 0, 6.3); c.fill(); }   // the inactivation "ball and chain"
    if (ax.o.ttx > 0 && isNa && k / 2 < ax.o.ttx * 4) { c.fillStyle = "#c4a1ff"; c.beginPath(); c.arc(x, mid - 22, 6, 0, 6.3); c.fill(); c.fillStyle = "#06101c"; c.font = "700 8px Segoe UI"; c.textAlign = "center"; c.fillText("T", x, mid - 19); continue; }
    c.fillStyle = col; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(isNa ? "Na⁺ channel" : "K⁺ channel", x, isNa ? mid + 46 : mid - 27);
    // ions pass through at a rate set by how open the channel is and how hard the voltage pushes them
    const drive = isNa ? (ENA - V) / 115 : (V - EK) / 115; if (ui.playing && Math.random() < open * drive * 1.3) ions.push({ x: x + (Math.random() - .5) * gap * .5, y: isNa ? mid - 30 : mid + 30, vy: isNa ? 2.6 : -2.6, na: isNa, t: 1 });
  }
  ions = ions.filter(i => i.t > 0); for (const i of ions) { i.y += i.vy; i.t -= 0.03; c.fillStyle = i.na ? `rgba(255,214,225,${i.t})` : `rgba(190,240,255,${i.t})`; c.beginPath(); c.arc(i.x, i.y, 3, 0, 6.3); c.fill(); }
  c.textAlign = "left"; c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#ff7b9c"; c.fillText(`Na⁺ channels open: ${(pNa * 100).toFixed(0)}%`, x0 + 12, mid - 22); c.fillStyle = "#5ad1ff"; c.fillText(`K⁺ channels open: ${(pK * 100).toFixed(0)}%`, x0 + 12, mid + 30);
}
// ---- Pointer: click the axon to stimulate; drag an electrode
let dragE = null;
K.pointer(cv.el, {
  down(p) { const i = Math.round((p.x - L.x0) / (L.x1 - L.x0) * NX - .5); if (p.y < L.ya - L.th / 2 - 4 && p.y > L.ya - 70) { dragE = Math.abs(i - ea) < Math.abs(i - eb) ? "a" : "b"; return; } if (Math.abs(p.y - L.ya) < 26 && i >= 0 && i < NX) fire(false, K.clamp(i, 2, NX - 3)); },
  drag(p) { if (!dragE) return; const i = K.clamp(Math.round((p.x - L.x0) / (L.x1 - L.x0) * NX - .5), 4, NX - 4); if (dragE === "a") ea = i; else eb = i; rec.a = []; rec.b = []; rec.m = []; rec.h = []; rec.n = []; },
  up() { dragE = null; }, hover(p) { cv.el.style.cursor = Math.abs(p.y - L.ya) < 26 && p.x > L.x0 ? "pointer" : p.y < L.ya - 10 && p.y > L.ya - 70 ? "ew-resize" : "default"; },
});
const chV = K.chart(ui.dock, { title: "Oscilloscope: voltage at the electrodes", xLabel: "time (ms)", yLabel: "membrane voltage (mV)", yMin: -90, yMax: 60 });
const chG = K.chart(ui.dock, { title: "Gates at A", xLabel: "time (ms)", yLabel: "fraction open", yMin: 0, yMax: 1 });
let frame = 0, acc = 0;
ui.run(() => {
  acc += slow; while (acc >= 0.01) {
    acc -= 0.01; const a0 = ax.V[ea], b0 = ax.V[eb]; ax.step(0.01);
    if (a0 < -20 && ax.V[ea] >= -20) { cross.ta = ax.t; if (cross.tb != null && cross.ta > cross.tb) cross.v = Math.abs(eb - ea) * DX / (cross.ta - cross.tb) * 10; }
    if (b0 < -20 && ax.V[eb] >= -20) { K.sound.noise({ dur: 0.035, vol: 0.45, filter: "bandpass", freq: 700 }); cross.tb = ax.t; if (cross.ta != null && cross.tb > cross.ta) cross.v = Math.abs(eb - ea) * DX / (cross.tb - cross.ta) * 10; }
    if (ax.V[eb] > cross.pk) cross.pk = ax.V[eb];
    if (Math.round(ax.t * 100) % 5 === 0) { const t = ax.t; rec.a.push([t, ax.V[ea]]); rec.b.push([t, ax.V[eb]]); rec.m.push([t, ax.m[ea]]); rec.h.push([t, ax.h[ea]]); rec.n.push([t, ax.n[ea]]); for (const k in rec) if (rec[k].length > 640) rec[k].shift(); }
  }
}, () => {
  draw(); if (frame++ % 3) return;
  chV.draw([{ pts: rec.a, color: "#7ee787", label: "A" }, { pts: rec.b, color: "#ffb454", label: "B" }], { hlines: [{ y: -65, label: "resting potential" }] });
  chG.draw([{ pts: rec.m, color: "#ff7b9c", label: "m: Na⁺ gate opens" }, { pts: rec.h, color: "#ffe66d", label: "h: Na⁺ not inactivated" }, { pts: rec.n, color: "#5ad1ff", label: "n: K⁺ gate opens" }]);
  read.set("v", cross.v ? cross.v.toFixed(1) + " m/s" : "–"); read.set("pk", cross.pk > -60 ? (cross.pk > 0 ? "+" : "") + cross.pk.toFixed(0) + " mV" : "no spike"); read.set("va", ax.V[ea].toFixed(0) + " mV"); read.set("t", ax.t.toFixed(1) + " ms");
});
fresh(); setTimeout(() => fire(), 600);
ui.tip("Press <b>⚡ Stimulate</b>, or click anywhere on the axon");
