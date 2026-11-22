/* =====================================================================
   ICE–ALBEDO TIPPING POINTS
   A planet settles at the temperature where the infrared it radiates to
   space balances the sunlight it absorbs. Ice is white: it reflects much
   more sunlight (high ALBEDO) than ocean or land. So:
     cooler → more ice → more sunlight reflected → cooler still,
   a POSITIVE FEEDBACK. Strong enough, it gives several stable climates
   for the same sunlight (ice caps, a frozen "snowball", ice-free), with
   TIPPING POINTS between them, and HYSTERESIS: once frozen, the planet
   needs far more sunlight to thaw than it took to freeze.
   The model: the Budyko–Sellers energy balance model, 90 bands of
   latitude, each with
       C dT/dt = absorbed sunlight − infrared emitted + heat carried in
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const NB = 90, DPHI = 2 * Math.PI / 180, PHI = Array.from({ length: NB }, (_, i) => (-89 + 2 * i) * Math.PI / 180), COSP = PHI.map(Math.cos);
const COSH = Array.from({ length: NB + 1 }, (_, i) => Math.cos((-90 + 2 * i) * Math.PI / 180));                       // cos φ at the band edges
const SFN = PHI.map(p => { const x = Math.sin(p); return 1 - 0.482 * (3 * x * x - 1) / 2; });                         // share of sunlight reaching each latitude
const B = 2.09, TICE = -10;
const Aof = co2 => 207.5 - 5.35 * Math.log(co2 / 420);
const albedo = (T, ai) => 0.3 + (ai - 0.3) * 0.5 * (1 - Math.tanh((T - TICE) / 1));
const Qof = sun => 1361 * sun / 100 / 4;
// solve a tridiagonal system (Thomas algorithm): a below, b diagonal, c above
function tri(a, b, c, d) { const n = d.length, cp = new Float64Array(n), dp = new Float64Array(n); cp[0] = c[0] / b[0]; dp[0] = d[0] / b[0]; for (let i = 1; i < n; i++) { const m = b[i] - a[i] * cp[i - 1]; cp[i] = c[i] / m; dp[i] = (d[i] - a[i] * dp[i - 1]) / m; } const x = new Float64Array(n); x[n - 1] = dp[n - 1]; for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1]; return x; }
function diffCoef(D, extraDiag) { const a = new Float64Array(NB), b = new Float64Array(NB), c = new Float64Array(NB); for (let i = 0; i < NB; i++) { const wm = COSH[i] / (COSP[i] * DPHI * DPHI), wp = COSH[i + 1] / (COSP[i] * DPHI * DPHI); a[i] = -D * wm; c[i] = -D * wp; b[i] = extraDiag + D * (wm + wp); } return { a, b, c }; }
// one implicit time step of dt years. o = { sun, co2, D, ai, C, noise }
function ebmStep(T, o, dt, r) {
  const Q = Qof(o.sun), A = Aof(o.co2), { a, b, c } = diffCoef(o.D, o.C / dt + B), d = new Float64Array(NB);
  const kick = o.noise && r ? o.noise * r.gauss() : 0;                               // one random weather anomaly for the whole planet this step
  for (let i = 0; i < NB; i++) d[i] = o.C / dt * T[i] + Q * SFN[i] * (1 - albedo(T[i], o.ai)) - A + kick;
  return tri(a, b, c, d);
}
const globalMean = T => { let s = 0, w = 0; for (let i = 0; i < NB; i++) { s += T[i] * COSP[i]; w += COSP[i]; } return s / w; };
// ice edge in the northern hemisphere (degrees): 0 = ice reaches the equator (snowball), 90 = no ice
function iceEdge(T) { const half = NB / 2; if (T[half] < TICE) return 0; for (let i = half; i < NB; i++) if (T[i] < TICE) { const f = (T[i - 1] - TICE) / (T[i - 1] - T[i]); return (PHI[i - 1] + f * DPHI) * 180 / Math.PI; } return 90; }
// equilibrium curve: fix the ice edge at η, solve the steady state, find the Sun % that puts −10 °C exactly at η
function eqCurve(o) {
  const out = [], { a, b, c } = diffCoef(o.D, B), A = Aof(o.co2);
  for (let eta = 0; eta <= 90; eta += 1) {
    const al = PHI.map(p => Math.abs(p) * 180 / Math.PI > eta ? o.ai : 0.3), u = tri(a, b, c, SFN.map((s, i) => s * (1 - al[i]))), v = tri(a, b, c, new Float64Array(NB).fill(-A));
    const k = Math.min(NB - 1, Math.max(1, NB / 2 + Math.floor(eta / 2))); const f = (eta - (k - NB / 2) * 2 + 1) / 2; const lo = Math.max(NB / 2, k - 1);
    const uu = eta >= 89 ? u[NB - 1] : eta <= 0 ? (u[NB / 2] + u[NB / 2 - 1]) / 2 : u[lo] + (u[Math.min(NB - 1, lo + 1)] - u[lo]) * ((eta - (PHI[lo] * 180 / Math.PI)) / 2);
    const vv = eta >= 89 ? v[NB - 1] : eta <= 0 ? (v[NB / 2] + v[NB / 2 - 1]) / 2 : v[lo] + (v[Math.min(NB - 1, lo + 1)] - v[lo]) * ((eta - (PHI[lo] * 180 / Math.PI)) / 2);
    const Q = (TICE - vv) / uu; out.push([Q * 4 / 1361 * 100, eta]);
  }
  return out;
}
function settle(T, o, years, dt = 0.5, r) { for (let k = 0; k < years / dt; k++) T = ebmStep(T, o, dt, r); return T; }
const warmStart = () => Float64Array.from(PHI, p => 30 - 40 * Math.sin(p) ** 2), snowStart = () => new Float64Array(NB).fill(-40);

// ---------------- The page ----------------
const SURF = { ocean: ["ocean world (50 m of water)", 6.62], earth: ["Earth-like (mixed)", 4.0], land: ["land world", 0.5] };
const P = { sun: 100, co2: 420, D: 0.45, ai: 0.62, surf: "ocean", noise: 0, slow: "none" };
let rnd = K.rng(Date.now() % 99991 + 41), speed = 1, T = settle(warmStart(), { sun: 100, co2: 420, D: 0.45, ai: 0.62, C: 6.62 }, 200), yr = 0, trail = [], hist = [], curve = null, curveKey = "", spinA = 0, loopDir = -1;
const opts = () => ({ sun: P.sun, co2: P.co2, D: P.D, ai: P.ai, C: SURF[P.surf][1], noise: P.noise });
const ui = K.app({
  title: "Ice–Albedo Tipping Points", subject: "Climate",
  blurb: "How ice reflecting sunlight makes the climate jump between states: snowball Earth, ice caps and hysteresis",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE geography and physics: the Earth's energy balance, albedo (how much sunlight a surface reflects), positive feedback (ice melts → darker surface absorbs more → more warming), climate tipping points.", adv: "A level geography (the global energy budget, feedbacks and tipping points in the climate system) and physics (energy balance: absorbed sunlight = emitted infrared). The Budyko–Sellers model, multiple equilibria and hysteresis are beyond the specifications." } },
  missions: [
    { title: "Today's ice caps", q: "Run today's climate. Where is the ice edge? What is the global mean temperature?", hint: "The ice edge settles near 64° (ice where the yearly mean is below −10 °C); the model's global mean is about 11.5 °C, a few degrees cooler than the real Earth. Ice reflects about 62% of sunlight, open ocean and land about 30%.", setup() { set({}); } },
    { title: "The ice–albedo feedback", q: "Dim the Sun slowly to 95%. Why does the ice spread so much for a small change?", hint: "Cooling → more ice → more sunlight reflected → more cooling: a positive feedback. A few % less sunlight moves the ice edge from 64° to about 43°.", setup() { set({ sun: 98 }); } },
    { title: "Snowball Earth", q: "Dim the Sun to 92%. What happens to the ice caps? Is there a stable state with ice caps at this Sun?", hint: "Below about 93% the ice caps run away to the equator: the whole planet freezes (a snowball) at about −42 °C. There is no stable ice-cap climate here: the system has tipped.", setup() { set({ sun: 92 }); } },
    { title: "Can you get back?", q: "From the snowball, raise the Sun back to 100%, then 110%. Does the ice melt? How bright must the Sun get?", hint: "No: the white planet reflects so much that it stays frozen until the Sun is about 131% of today's. The climate does not retrace its path: hysteresis. Geologists think real snowball Earths ended when volcanic CO₂ built up for millions of years.", setup() { set({ sun: 100 }); T = snowStart(); } },
    { title: "Hysteresis loop", q: "Use the slow change 'down then up' loop. Sketch the path on the equilibrium curve.", hint: "Going down, the planet follows the ice-cap branch until it falls off the fold at 93%. Going up, it stays frozen until 131% and then jumps to ice-free. Two different states at the same Sun: which you are in depends on history.", setup() { set({ slow: "loop" }); } },
    { title: "CO₂ to escape", q: "Start in a snowball at today's Sun and let CO₂ build up (volcanoes). How high must it go?", hint: "CO₂ traps infrared and so warms the planet in the same way as a brighter Sun. It has to rise to tens of thousands of ppm before the equator thaws, then the ice melts back rapidly.", setup() { set({ slow: "co2up" }); T = snowStart(); } },
    { lvl: "adv", title: "Small ice cap instability", q: "Brighten the Sun slowly from 100%. Does the ice cap shrink smoothly to nothing?", hint: "No: once the cap is small (edge beyond about 80°) it becomes unstable and disappears suddenly (the curve's slope reverses near the pole). Small ice caps cannot be stable in this model: the ice-free state takes over.", setup() { set({ sun: 100, slow: "sunup" }); } },
    { lvl: "adv", title: "Heat transport", q: "Weaken the heat transport (D = 0.2). What happens to the difference between equator and poles, and to the tipping point?", hint: "Less heat carried polewards: hotter equator, colder poles, so a bigger temperature difference; the ice caps are larger and the climate tips into a snowball at a different Sun %.", setup() { set({ D: 0.2 }); } }
  ],
  batch: [
    { title: "Hysteresis: starting warm", question: "Starting from today's warm climate, where does the ice edge settle at each Sun %?", how: "Each run: start warm, run 400 years at that Sun. 0° = snowball, 90° = no ice.", xLabel: "Sun (% of today's)", yLabel: "ice edge latitude (°)", xs: [90, 92, 93, 94, 96, 98, 100, 104, 110, 120, 130, 135], reps: 1, yMin: 0, yMax: 90, run: x => iceEdge(settle(warmStart(), { sun: x, co2: 420, D: 0.45, ai: 0.62, C: 6.62 }, 400)), note: "The ice-cap branch until about 93%, then a jump to snowball (0°). Compare the next experiment, which starts from a snowball." },
    { title: "Hysteresis: starting from a snowball", question: "Starting from a snowball, where does the ice edge settle at each Sun %?", how: "Each run: start frozen (−40 °C everywhere), run 400 years at that Sun.", xLabel: "Sun (% of today's)", yLabel: "ice edge latitude (°)", xs: [90, 92, 93, 94, 96, 98, 100, 104, 110, 120, 130, 135], reps: 1, yMin: 0, yMax: 90, run: x => iceEdge(settle(snowStart(), { sun: x, co2: 420, D: 0.45, ai: 0.62, C: 6.62 }, 400)), note: "It stays frozen all the way up to about 131%, then jumps straight to ice-free. Between 93% and 131% two climates are possible: hysteresis." },
    { title: "CO₂ and global temperature", question: "How does the settled global mean temperature depend on CO₂?", how: "Today's Sun, start warm, 400 years. CO₂ from 180 to 1680 ppm.", xLabel: "CO₂ (ppm)", yLabel: "global mean temperature (°C)", xs: [180, 280, 420, 560, 840, 1120, 1680], reps: 1, run: x => globalMean(settle(warmStart(), { sun: 100, co2: x, D: 0.45, ai: 0.62, C: 6.62 }, 400)), note: "Each doubling of CO₂ warms the planet by a similar amount (the forcing ∝ log CO₂), boosted by ice melting. At low CO₂ (ice-age levels) the ice spreads far." },
    { title: "Heat transport and the equator–pole difference", question: "How does the strength of heat transport by winds and ocean currents change the temperature difference between the equator and the poles?", how: "Today's Sun and CO₂, 400 years; D from 0.2 to 1.0 W/m² per °C.", xLabel: "heat transport D", yLabel: "equator minus pole (°C)", xs: [0.2, 0.3, 0.45, 0.6, 0.8, 1.0], reps: 1, run: x => { const t = settle(warmStart(), { sun: 100, co2: 420, D: x, ai: 0.62, C: 6.62 }, 400); return (t[44] + t[45]) / 2 - t[89]; }, note: "Stronger transport evens out the temperatures. Weak transport gives a very cold pole (and bigger ice caps)." },
    { title: "Near the edge: weather noise", question: "At 93.6% Sun (just above the tipping point), how likely is the climate to tip into a snowball within 300 years with random weather?", how: "Each run: start in the ice-cap state at 93.6%, add random yearly weather (SD in W/m²); 1 = tipped, 0 = did not. The mean is the chance of tipping.", xLabel: "weather noise (W/m²)", yLabel: "fraction of runs that tipped", xs: [0, 5, 10, 15, 20, 30], reps: 10, yMin: 0, yMax: 1, run: (x, r) => { let t = settle(warmStart(), { sun: 93.6, co2: 420, D: 0.45, ai: 0.62, C: 6.62 }, 200); t = settle(t, { sun: 93.6, co2: 420, D: 0.45, ai: 0.62, C: 6.62, noise: x }, 300, 0.5, r); return iceEdge(t) < 5 ? 1 : 0; }, note: "Close to a tipping point, random fluctuations can push the climate over the edge: the closer to the edge and the noisier the weather, the more likely." },
    { title: "Ice albedo and the tipping point", question: "How does the reflectivity of ice change the Sun % at which the ice caps collapse into a snowball?", how: "From the equilibrium curve: the lowest Sun % on the ice-cap branch (the fold).", xLabel: "ice albedo", yLabel: "snowball tipping point (% Sun)", xs: [0.45, 0.5, 0.55, 0.6, 0.62, 0.65, 0.7, 0.75], reps: 1, run: x => Math.min(...eqCurve({ co2: 420, D: 0.45, ai: x }).filter(p => p[1] > 5 && p[1] < 80).map(p => p[0])), note: "Brighter ice makes the feedback stronger, so the planet tips into a snowball with less dimming." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE energy", text: "Albedo: the fraction of sunlight a surface reflects. Fresh snow and ice about 0.6–0.9; ocean about 0.06; the Earth on average about 0.3." },
      { lvl: "std", tag: "GCSE climate", text: "Energy balance: a planet warms until the infrared it emits equals the sunlight it absorbs. More CO₂ traps more infrared, so it settles warmer." },
      { lvl: "std", tag: "GCSE climate", text: "Ice–albedo feedback: warming melts ice → darker surface absorbs more sunlight → more warming (and the reverse on cooling). A positive feedback that amplifies change." },
      { lvl: "std", tag: "GCSE climate", text: "Tipping point: a threshold beyond which a small change causes a large, self-sustaining shift to a different state, which may be hard to reverse (hysteresis)." },
      { lvl: "adv", tag: "A level", text: "Budyko–Sellers model: C dT/dt = S(1 − α) − (A + BT) + heat transport. With ice albedo it has several equilibria: stable ice caps, snowball, ice-free, separated by unstable states." },
      { lvl: "adv", tag: "A level", text: "Hysteresis: the climate state depends on its history; returning the forcing to its old value does not return the old climate (snowball Earth needed CO₂ to build up for millions of years)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how melting sea ice can speed up warming in the Arctic.", ans: "<ul><li>ice has a high albedo; open ocean is dark (low albedo)</li><li>as ice melts, the ocean absorbs more sunlight</li><li>so it warms more and more ice melts: a positive feedback</li></ul>" },
      { lvl: "std", marks: 2, q: "What is meant by a climate tipping point?", ans: "<ul><li>a threshold where a small change triggers a large change in the climate</li><li>which continues by itself / is hard to reverse</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `The planet is at ${P.sun}% Sun and ${Math.round(P.co2)} ppm CO₂ with its ice edge at ${iceEdge(T).toFixed(0)}°. Explain why two different climates can exist at the same Sun.`, ans: () => `<ul><li>an ice-covered planet reflects much more sunlight than an ice-free one</li><li>so each state keeps itself cold or warm (self-reinforcing)</li><li>between about 93% and 131% Sun both are stable; which you are in depends on history (hysteresis)</li></ul>` }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A Budyko–Sellers energy balance model: 90 bands of latitude (2° each) from pole to pole. C dT/dt = Q s(φ)(1 − α(T)) − (A + BT) + D∇²T (+ a random weather anomaly, the same everywhere, each step).</li>
<li>Q = 1361 W/m² × Sun % ÷ 4; s(φ) = 1 − 0.482 P₂(sin φ) spreads it with latitude. Albedo 0.30 for open water and land, the ice albedo (0.62) where the yearly mean is below −10 °C (smoothed over about ±1 °C).</li>
<li>Infrared to space A + BT: A = 207.5 W/m² at 420 ppm, changing by −5.35 ln(CO₂ ÷ 420); B = 2.09 W/m² per °C. Heat transport: diffusion on the sphere, D = 0.45 W/m² per °C.</li>
<li>C: 50 m of ocean (6.6 W yr m⁻² °C⁻¹), Earth-like 4.0, or land 0.5. Implicit time steps of 0.25 years (0.5 in the Batch run).</li>
<li>The equilibrium curve: fix the ice edge at latitude η, solve the steady state (it is linear in Q), and find the Sun % that puts −10 °C exactly at η. Solid where stable, dashed where unstable.</li>
<li>Results: today's ice edge 64°, global mean 11.5 °C; the ice caps collapse into a snowball below 93.3% Sun; a snowball melts only above about 131%.</li></ul>
<h3>Simplifications</h3>
<ul><li>No seasons, no separate land and ocean, no clouds or water vapour feedback, heat transport as simple diffusion; the ice edge is a temperature threshold. Real snowball episodes involved continents and the carbon cycle too.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/ice-albedo.html">original/ice-albedo.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Climate");
ctl.sun = K.slider(g, { label: "Sunlight", min: 80, max: 140, step: 0.5, value: 100, unit: "% of today's", on: v => P.sun = v });
ctl.lco2 = K.slider(g, { label: "CO₂", min: Math.log10(100), max: Math.log10(50000), step: 0.01, value: Math.log10(420), fmt: v => Math.round(Math.pow(10, v)).toLocaleString() + " ppm", on: v => P.co2 = Math.pow(10, v) });
ctl.D = K.slider(g, { label: "Heat transport D", min: 0.1, max: 1, step: 0.05, value: 0.45, on: v => P.D = v });
ctl.ai = K.slider(g, { label: "Ice albedo", min: 0.4, max: 0.8, step: 0.01, value: 0.62, on: v => P.ai = v });
ctl.surf = K.seg(g, { label: "Surface", value: "ocean", options: Object.keys(SURF).map(k => [k, SURF[k][0]]), on: v => P.surf = v });
ctl.noise = K.slider(g, { label: "Weather noise", min: 0, max: 30, step: 0.5, value: 0, unit: "W/m²", on: v => P.noise = v });
g = ui.group("Slow change");
ctl.slow = K.seg(g, { value: "none", options: [["none", "none"], ["sundown", "Sun dims"], ["sunup", "Sun brightens"], ["loop", "down, then up"], ["co2up", "CO₂ builds up"], ["co2down", "CO₂ falls"]], on: v => { P.slow = v; loopDir = -1; } });
let rr = K.row(g); K.btn(rr, "↺ Warm start", () => { T = warmStart(); trail = []; hist = []; yr = 0; }, "primary"); K.btn(rr, "❄ Snowball start", () => { T = snowStart(); trail = []; hist = []; yr = 0; });
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 100, step: 0.5, value: 1, fmt: v => K.sig(v * 5, 3) + " years per second", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Readings"), [["T", "global mean temperature"], ["edge", "ice edge"], ["st", "state"], ["al", "planet's albedo"], ["tip", "tipping points (Sun %)"]]);
function set(o) {
  Object.assign(P, { sun: 100, co2: 420, D: 0.45, ai: 0.62, surf: "ocean", noise: 0, slow: "none" }, o);
  ctl.sun.set(P.sun); ctl.lco2.set(Math.log10(P.co2)); ctl.D.set(P.D); ctl.ai.set(P.ai); ctl.surf.set(P.surf); ctl.noise.set(P.noise); ctl.slow.set(P.slow);
  T = settle(warmStart(), Object.assign(opts(), { sun: 100, co2: 420 }), 200); trail = []; hist = []; yr = 0; loopDir = -1;
}
function stateName(e) { return e < 1 ? "snowball" : e > 89 ? "ice-free" : e > 80 ? "small ice caps" : "ice caps"; }
function planetAlbedo() { let s = 0, w = 0; for (let i = 0; i < NB; i++) { const wt = Math.cos(PHI[i]) * (1 - 0.482 * (3 * Math.sin(PHI[i]) ** 2 - 1) / 2); s += albedo(T[i], P.ai) * wt; w += wt; } return s / w; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function tcol(t) { const u = Math.max(0, Math.min(1, (t + 40) / 75)); return `rgb(${Math.round(40 + 200 * u)},${Math.round(80 + 100 * (1 - Math.abs(u - 0.5) * 2))},${Math.round(220 - 180 * u)})`; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  // the globe: latitude bands coloured by temperature, white where there is ice; tilted 20° towards us; meridians turn
  const R = Math.min(w * 0.22, h * 0.38), cx = w * 0.27, cy = h * 0.5, tilt = 20 * Math.PI / 180;
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.clip();
  for (let i = 0; i < NB; i++) { const p0 = PHI[i] - Math.PI / 90, p1 = PHI[i] + Math.PI / 90, y0 = cy - R * Math.sin(p1 + tilt * 0), y1 = cy - R * Math.sin(p0); c.fillStyle = T[i] < -10 ? "#eef4ff" : tcol(T[i]); c.fillRect(cx - R, y0, 2 * R, y1 - y0 + 1); }
  c.strokeStyle = "rgba(0,0,0,0.18)"; for (let k = 0; k < 8; k++) { const a = spinA + k * Math.PI / 4, xk = Math.sin(a); if (Math.cos(a) < 0) continue; c.beginPath(); c.ellipse(cx, cy, Math.abs(xk) * R, R, 0, 0, 6.3); c.stroke(); }
  const sh = c.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.2, cx, cy, R); sh.addColorStop(0, "rgba(255,255,255,0.12)"); sh.addColorStop(1, "rgba(0,0,0,0.45)"); c.fillStyle = sh; c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  c.restore(); c.strokeStyle = "#3a4560"; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke();
  TX(c, `Year ${yr.toFixed(0)} · ${stateName(iceEdge(T))}`, cx, cy + R + 26, "#eef2f8", "center", "600 13px");
  // ball in a valley: V(η) = ∫ (Q_eq(η) − Q) dη, valleys are stable climates
  if (curve) {
    const x0 = w * 0.55, x1 = w - 30, y0 = h * 0.18, y1 = h * 0.8, V = [0]; for (let i = 1; i < curve.length; i++) V.push(V[i - 1] + (curve[i][0] - P.sun));
    const vmin = Math.min(...V), vmax = Math.max(...V), X = e => x0 + e / 90 * (x1 - x0), Y = v => y1 - (v - vmin) / ((vmax - vmin) || 1) * (y1 - y0);
    c.strokeStyle = "#7fe3a0"; c.lineWidth = 3; c.beginPath(); curve.forEach((p, i) => i ? c.lineTo(X(p[1]), Y(V[i])) : c.moveTo(X(p[1]), Y(V[i]))); c.stroke(); c.lineWidth = 1;
    const e = iceEdge(T), k = Math.round(e); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(X(e), Y(V[Math.min(90, k)]) - 10, 10, 0, 6.3); c.fill();
    TX(c, "snowball", x0, y1 + 20, "#aab6cc", "left", "11px"); TX(c, "ice-free", x1, y1 + 20, "#aab6cc", "right", "11px"); TX(c, "ice edge latitude →", (x0 + x1) / 2, y1 + 20, "#aab6cc", "center", "11px");
    TX(c, "Ball in a valley: valleys are stable climates, hilltops are tipping points", x0, y0 - 18, "#eef2f8", "left", "600 12px");
  }
  TX(c, `Sun ${P.sun.toFixed(1)}% · CO₂ ${Math.round(P.co2).toLocaleString()} ppm`, 20, 24, "#eef2f8", "left", "600 13px");
}

// ---------------- Charts ----------------
function charts() {
  const key = [P.co2.toFixed(0), P.D, P.ai].join(); if (key !== curveKey) { curveKey = key; curve = eqCurve(opts()); }
  // split the curve into stretches that are stable (Sun rises with the ice edge) or unstable
  const segs = []; for (let i = 1; i < curve.length; i++) { const stable = curve[i][0] > curve[i - 1][0], last = segs[segs.length - 1]; if (!last || last.stable !== stable) segs.push({ stable, pts: [curve[i - 1]] }); segs[segs.length - 1].pts.push(curve[i]); }
  chA.opts.title = "Equilibrium climates: ice edge against Sun"; chA.opts.xLabel = "Sun (% of today's)"; chA.opts.yLabel = "ice edge latitude (°)"; chA.opts.xFmt = null;
  const qsb = curve[0][0], qif = curve[curve.length - 1][0];
  chA.draw(segs.map((q, i) => ({ pts: q.pts, color: q.stable ? "#7fe3a0" : "#ff8a70", dash: q.stable ? [] : [5, 4], width: 2.4, label: i < 2 ? (q.stable ? "stable" : "unstable") : "" })).concat([ { pts: [[80, 0], [qsb, 0]], color: "#6fb1ff", width: 3, label: "snowball" }, { pts: [[qif, 90], [140, 90]], color: "#ffd166", width: 3, label: "ice-free" }, { pts: trail, color: "#eef2f8", width: 1.4, label: "path" }, { pts: [[P.sun, iceEdge(T)]], type: "dots", r: 6, color: "#ff5d6c" }]), { xMin: 80, xMax: 140, yMin: -2, yMax: 92 });
  chB.opts.title = "Temperature against latitude"; chB.opts.xLabel = "latitude (°)"; chB.opts.yLabel = "°C"; chB.opts.xFmt = null;
  chB.draw([{ pts: Array.from(T, (t, i) => [PHI[i] * 180 / Math.PI, t]), color: "#ff8a70", label: "yearly mean" }], { xMin: -90, xMax: 90, hlines: [{ y: -10, color: "#6fb1ff", label: "ice below −10 °C" }] });
  const e = iceEdge(T), fold = Math.min(...curve.filter(p => p[1] > 5 && p[1] < 80).map(p => p[0]));
  read.set("T", globalMean(T).toFixed(1) + " °C"); read.set("edge", e < 1 ? "equator (snowball)" : e > 89 ? "none" : e.toFixed(0) + "°"); read.set("st", stateName(e)); read.set("al", planetAlbedo().toFixed(3)); read.set("tip", `snowball below ${fold.toFixed(1)} · melts above ${qsb.toFixed(1)}`);
  ui.hud(e < 1 ? "Snowball: so much sunlight is reflected that it stays frozen" : e > 89 ? "Ice-free" : P.sun < fold + 1 && P.sun > fold ? "Close to the tipping point" : "Ice caps: the ice–albedo feedback amplifies any change");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; spinA += dt * 0.6;
  const years = dt * 5 * speed, n = Math.max(1, Math.ceil(years / 0.25));
  for (let k = 0; k < n; k++) {
    if (P.slow === "sundown") P.sun = Math.max(80, P.sun - 0.02 * years / n * 5);
    if (P.slow === "sunup") P.sun = Math.min(140, P.sun + 0.02 * years / n * 5);
    if (P.slow === "loop") { P.sun += loopDir * 0.03 * years / n * 5; if (P.sun < 88) loopDir = 1; if (P.sun > 136) { loopDir = -1; } }
    if (P.slow === "co2up") P.co2 = Math.min(50000, P.co2 * Math.exp(0.004 * years / n * 5)); if (P.slow === "co2down") P.co2 = Math.max(100, P.co2 * Math.exp(-0.004 * years / n * 5));
    T = ebmStep(T, opts(), years / n, rnd); yr += years / n;
  }
  if (P.slow !== "none") { ctl.sun.set(P.sun); ctl.lco2.set(Math.log10(P.co2)); }
  trail.push([P.sun, iceEdge(T)]); if (trail.length > 1500) trail.shift();
}, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Dim the Sun slowly and watch the ice caps. Then try to get back from a snowball.", 7000);
