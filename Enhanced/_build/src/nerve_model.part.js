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
