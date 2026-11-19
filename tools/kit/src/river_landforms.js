/* =====================================================================
   RIVERS AND LANDFORMS
   A river carries water and sediment from its source to its mouth.
   Downstream (the BRADSHAW MODEL) discharge, width, depth, cross-section
   area and velocity INCREASE, while gradient, bed-load size and
   roughness DECREASE. Water speed comes from MANNING'S EQUATION:
        v = R^(2/3) S^(1/2) ÷ n
   (R = hydraulic radius = area ÷ wetted perimeter; S = gradient;
   n = roughness). Deeper, smoother channels are more EFFICIENT.
   Whether a grain moves depends on the velocity: the HJULSTRÖM CURVE
   shows the speed needed to pick it up (erosion), and the speed below
   which it settles (deposition). Sand moves most easily; clay is sticky
   and boulders are heavy.
   Erosion also builds landforms: meanders migrate and cut off into oxbow
   lakes; hard rock over soft makes a waterfall that retreats upstream,
   leaving a gorge.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const RIVERS = { uk: { name: "typical UK river", L: 100, z0: 600, Qm: 25, hard: 30 }, tees: { name: "River Tees", L: 137, z0: 893, Qm: 20, hard: 34 } };
// ---- source to mouth ----
// long profile (height above sea level, m) at distance x km: concave, with a 20 m step at a hard rock band
function zAt(x, R) { const lam = R.L / 4, base = (Math.exp(-x / lam) - Math.exp(-R.L / lam)) / (1 - Math.exp(-R.L / lam)); return R.z0 * base + (R.hard && x < R.hard ? 20 * (1 - x / R.L) : 0); }
const slopeAt = (x, R) => { const r = Object.assign({}, R, { hard: 0 }); return Math.max(1e-4, (zAt(Math.max(0, x - 0.5), r) - zAt(Math.min(R.L, x + 0.5), r)) / 1000); };   // channel gradient (m per m), leaving out the waterfall step itself
const Dbed = x => 250 * Math.exp(-0.07 * x);                                                                         // Sternberg's law: median bed-load size (mm)
const roundness = x => Math.min(5.6, 1.2 + 4.4 * (1 - Math.exp(-x / 35)));                                           // Powers roundness index (1 very angular … 6 well rounded)
// one site: discharge, width, depth and velocity found from Manning's equation
function site(x, R, flow) {
  const Qbf = 4 * R.Qm * Math.pow((x + 2) / (R.L + 2), 1.67), Q = Qbf * flow / 4, w = 3.2 * Math.sqrt(Qbf) * Math.pow(flow / 4, 0.26);
  const S = slopeAt(x, R), n = Math.pow(Dbed(x) / 1000, 1 / 6) / 21.1 + 0.012 * Math.exp(-x / 25) + 0.012;                // Strickler roughness plus boulders / vegetation upstream
  let lo = 0.01, hi = 30; for (let i = 0; i < 60; i++) { const d = (lo + hi) / 2, A = w * d, Pw = w + 2 * d, v = Math.pow(A / Pw, 2 / 3) * Math.sqrt(S) / n; if (A * v > Q) hi = d; else lo = d; }  // find the depth that carries Q
  const d = (lo + hi) / 2, A = w * d, Pw = w + 2 * d, Rh = A / Pw, v = Math.pow(Rh, 2 / 3) * Math.sqrt(S) / n;
  return { x, Q, w, d, A, Pw, Rh, v, S, n, D: Dbed(x), rnd: roundness(x), z: zAt(x, R) };
}
// ---- Hjulström curve (velocity cm/s, grain size mm) ----
const Ve = D => 28 * Math.sqrt(D) + 7 / Math.sqrt(D);                          // speed needed to start moving (erode) a grain
const Vs = D => 0.7 * 28 * Math.sqrt(D) * Math.pow(D / (D + 0.06), 1.5);       // speed below which it settles (deposition)
const SIZES = [["clay", 0.002], ["silt", 0.02], ["fine sand", 0.15], ["coarse sand", 1], ["gravel", 8], ["pebble", 40], ["cobble", 120], ["boulder", 400]];
// ---- meanders: a centre line that migrates sideways (Howard and Knutson 1984) ----
function newChannel(r, wPx, W = 1000) { const pts = [], lam = 11 * wPx, ph = r() * 6.3; for (let i = 0; i <= 200; i++) { const x = W * i / 200; pts.push([x, 300 + 10 * Math.sin(2 * Math.PI * x / lam + ph) + 3 * (r() - 0.5)]); } return pts; }   // nearly straight, with small wiggles about 11 widths long
function resample(pts, ds) { const out = [pts[0]]; let acc = 0; for (let i = 1; i < pts.length; i++) { let [x0, y0] = out[out.length - 1], [x1, y1] = pts[i]; let d = Math.hypot(x1 - x0, y1 - y0); while (d >= ds) { const t = ds / d; x0 = x0 + (x1 - x0) * t; y0 = y0 + (y1 - y0) * t; out.push([x0, y0]); d = Math.hypot(x1 - x0, y1 - y0); } } out.push(pts[pts.length - 1]); return out; }
const sinuosity = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s / Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]); };
// one migration step: each point moves along its normal at a rate set by the local and upstream curvature
function migrate(M, dt, erod, wPx) {
  const p = M.pts, n = p.length, C = new Array(n).fill(0), Nx = new Array(n).fill(0), Ny = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) { const ax = p[i][0] - p[i - 1][0], ay = p[i][1] - p[i - 1][1], bx = p[i + 1][0] - p[i][0], by = p[i + 1][1] - p[i][1], la = Math.hypot(ax, ay), lb = Math.hypot(bx, by); const cr = (ax * by - ay * bx) / (la * lb), dot = (ax * bx + ay * by) / (la * lb); C[i] = Math.atan2(cr, dot) / ((la + lb) / 2); const tx = (ax / la + bx / lb), ty = (ay / la + by / lb), tl = Math.hypot(tx, ty) || 1; Nx[i] = -ty / tl; Ny[i] = tx / tl; }
  for (let pass = 0; pass < 2; pass++) { const c0 = C.slice(); for (let i = 2; i < n - 2; i++) C[i] = (c0[i - 1] + 2 * c0[i] + c0[i + 1]) / 4; }   /* smooth the curvature: removes tiny wiggles */
  const ds = wPx * 0.5, decay = Math.exp(-ds / (2.5 * wPx)); let acc = 0, wsum = 0; const rate = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) { acc = acc * decay + C[i]; wsum = wsum * decay + 1; rate[i] = erod * wPx * wPx * (-C[i] + 2.5 * acc / wsum) * 0.9; }
  for (let i = 2; i < n - 2; i++) { const taper = Math.min(1, i / 12, (n - 1 - i) / 12); p[i][0] -= Nx[i] * rate[i] * dt * taper; p[i][1] -= Ny[i] * rate[i] * dt * taper; /* move towards the OUTSIDE of the bend */ p[i][1] += (300 - p[i][1]) * 0.001 * dt ; /* the valley sides keep the meander belt central */ p[i][1] = Math.min(590, Math.max(10, p[i][1])); p[i][0] = Math.min(1000, Math.max(0, p[i][0])); }
  // now and then a bank collapses or a bar forms somewhere, nudging a stretch of channel sideways: this starts new bends
  if (Math.random() < 0.3 * dt) { const c = 8 + Math.floor(Math.random() * 0.6 * (n - 16)), half = 5.5 * wPx / ds, amp = (Math.random() < 0.5 ? -1 : 1) * (0.4 + 0.5 * Math.random()) * wPx; for (let i = Math.max(2, c - 2 * half); i < Math.min(n - 2, c + 2 * half); i++) { const u = (i - c) / half; p[Math.round(i)][1] += amp * Math.exp(-u * u) * Math.cos(1.4 * u); } }
  M.pts = resample(p, ds);
  // neck cutoff: two parts of the channel far apart along the river but closer than 1.1 widths across
  if (M.t % 2) return false;
  // neck cutoff: two parts of the channel far apart along the river but closer than 1.1 widths across.
  // Points are put in a grid of squares so only near neighbours are compared; the SMALLEST loop is cut first.
  const q = M.pts, cs = 1.1 * wPx, grid = new Map(), key = (a, b) => a * 10007 + b; let best = null;
  q.forEach(([x, y], i) => { const k = key(Math.floor(x / cs), Math.floor(y / cs)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  for (let i = 6; i < q.length - 6; i++) { const cx = Math.floor(q[i][0] / cs), cy = Math.floor(q[i][1] / cs); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(key(cx + dx, cy + dy)) || []) if (j >= i + 12 && j < q.length - 6 && (!best || j - i < best[1] - best[0]) && Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]) < cs) best = [i, j]; }
  if (best) { const [i, j] = best; M.oxbows.push({ pts: q.slice(i, j + 1), age: 0, born: M.t }); M.cutoffs.push(M.t); M.pts = resample(q.slice(0, i + 1).concat(q.slice(j)), ds); return true; }
  return false;
}
// ---- waterfalls: undercutting of the soft rock, then collapse of the cap rock ----
const CAP = { dolerite: { name: "dolerite (Whin Sill)", s: 1.4 }, limestone: { name: "hard limestone", s: 1.0 }, sandstone: { name: "sandstone", s: 0.7 } };
const SOFT = { shale: { name: "shale", k: 1 }, limestone: { name: "softer limestone", k: 0.55 }, sandstone: { name: "weak sandstone", k: 0.3 } };
const FALLS = { own: { name: "your own", Q: 20, cap: "limestone", soft: "shale", h: 15, ct: 4 }, highforce: { name: "High Force (Tees)", Q: 20, cap: "dolerite", soft: "limestone", h: 21, ct: 6 }, niagara: { name: "Niagara (before 1950)", Q: 5700, cap: "limestone", soft: "shale", h: 51, ct: 20 } };
const undercutRate = (Q, k) => 0.03 * k * Math.sqrt(Q / 10);                           // m per year
// ---- Spearman's rank ----
function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function spearman(a, b) { const ra = ranks(a), rb = ranks(b), n = a.length; let d2 = 0; for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2; return 1 - 6 * d2 / (n * (n * n - 1)); }
const CRIT = { 5: 1, 6: 0.886, 7: 0.786, 8: 0.738, 9: 0.700, 10: 0.648, 11: 0.618, 12: 0.587, 14: 0.538, 16: 0.503, 18: 0.472, 20: 0.450 };
const crit = n => CRIT[n] || (n < 5 ? 1 : 1.96 / Math.sqrt(n - 1));
// fieldwork at one site: what students would measure (with realistic errors)
function fieldwork(x, R, r) {
  const s = site(x, R, 1), w = s.w * (1 + 0.02 * r.gauss()), depths = [0.2, 0.4, 0.5, 0.6, 0.8].map(f => Math.max(0.02, s.d * Math.sin(Math.PI * f) ** 0.4 * 1.05 * (1 + 0.06 * r.gauss())));
  const times = [0, 1, 2].map(() => Math.max(1, 10 / (s.v / 0.85) * (1 + 0.08 * r.gauss()) + 0.3 * r.gauss())), surf = 10 / K.mean(times), vel = 0.85 * surf, dm = K.mean(depths);
  const peb = Array.from({ length: 10 }, () => s.D * Math.exp(0.45 * r.gauss())), med = peb.slice().sort((a, b) => a - b), D50 = (med[4] + med[5]) / 2;
  return { x, w, d: dm, A: w * dm, v: vel, Q: w * dm * vel, D: D50, rnd: Math.max(1, Math.min(6, s.rnd + 0.6 * r.gauss())) };
}

// ---------------- The page ----------------
const P = { view: "profile", river: "uk", x: 20, flow: 1, vel: 60, flood: false, load: "all", bedrock: "sandstone", width: 20, erod: 1, fall: "own", Q: 20, cap: "limestone", soft: "shale", speed: 1, gvar: "w" };
let rnd = K.rng(Date.now() % 9973 + 77), run = false, field = [], grains = [], M = null, F = null, tFlood = 0;
const R = () => Object.assign({}, RIVERS[P.river]);
const ui = K.app({
  title: "Rivers and Landforms", subject: "Geography",
  blurb: "Source to mouth with the Bradshaw model and fieldwork; erosion and transport on the Hjulström curve; meanders and oxbow lakes; waterfalls and gorges",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 1B River landscapes and processes: long and cross profiles, the Bradshaw model, erosion, transport and deposition, landforms (V-shaped valleys, waterfalls and gorges, meanders and oxbow lakes, flood plains and levees), a UK river (the Tees), river fieldwork.", adv: "Edexcel A level Geography (9GE0) has no river landscapes topic: this level supports Topic 5 (channel flow, discharge) and the NEA (fieldwork skills): channel efficiency and hydraulic radius, Manning's equation, the Hjulström curve with numbers, competence and capacity, helicoidal flow, sinuosity and meander wavelength, and Spearman's rank with significance." } },
  missions: [
    { title: "The Bradshaw model", q: "Travel from source to mouth. Which channel characteristics increase downstream and which decrease?", hint: "Discharge, width, depth, cross-section area and (surprisingly) velocity increase; gradient, bed-load size and roughness decrease. The river is steeper upstream, but shallow, rough channels waste energy on friction.", setup() { set({ view: "profile", x: 3 }); run = true; } },
    { title: "Fieldwork down the river", q: "Measure every 10 km. Does the width really increase? How scattered are the results?", hint: "Width rises downstream, but measurements scatter (±2% width, ±8% float timing, pebble sizes vary a lot). That is why fieldwork samples several sites and draws a line of best fit.", setup() { set({ view: "profile" }); autoMeasure(); } },
    { title: "Upper course to lower course", q: "Compare the valley cross-section at 5 km and at 90 km. Name the landforms in each.", hint: "Upper course: a steep V-shaped valley with interlocking spurs and a narrow, shallow, bouldery channel (vertical erosion). Lower course: a wide flat flood plain with levees and a deep, smooth channel (lateral erosion and deposition).", setup() { set({ view: "profile", x: 5 }); } },
    { title: "The Hjulström curve", q: "Set the velocity to 30 cm/s. Which sizes move? Which sizes settle? Why does clay NOT move even though it is tiny?", hint: "Sand moves first (around 20–30 cm/s). Clay particles stick together (cohesion) so they need a faster flow to erode, but once moving they stay in suspension even in very slow water.", setup() { set({ view: "flume", vel: 30 }); } },
    { title: "A flood", q: "Switch on the flood. Watch the load as the river rises and falls. What happens to the big stones?", hint: "As the flood peaks, pebbles and cobbles start rolling (traction) and bouncing (saltation); as it falls they are dropped first, then the sand, while silt and clay stay suspended: deposition sorts the load by size.", setup() { set({ view: "flume", flood: true }); run = true; } },
    { title: "Meanders and oxbow lakes", q: "Run the meanders for a few hundred years. Where is the river cliff and where is the point bar? How does an oxbow lake form?", hint: "Fast water on the outside of a bend erodes a river cliff; slow water on the inside deposits a point bar. Bends grow until the neck is cut through (usually in a flood), leaving an oxbow lake that fills in.", setup() { set({ view: "meander" }); run = true; } },
    { title: "Waterfalls", q: "Watch High Force: hard dolerite over softer limestone. Explain why the waterfall moves upstream.", hint: "The soft rock below is eroded faster (hydraulic action and abrasion in the plunge pool), undercutting the hard cap rock. The overhang collapses, and the waterfall retreats, leaving a steep-sided gorge.", setup() { set({ view: "fall", fall: "highforce" }); run = true; } },
    { lvl: "adv", title: "Channel efficiency", q: "At 10 km and 80 km, compare the hydraulic radius and Manning's n. Use them to explain why velocity rises downstream.", hint: "R grows (deeper channels lose less to the bed) and n falls (smaller bed load). Both raise v = R^(2/3)S^(1/2)/n by more than the falling gradient lowers it.", setup() { set({ view: "profile", x: 10 }); } },
    { lvl: "adv", title: "Spearman's rank", q: "Measure every 10 km and test whether pebble size decreases with distance. Is r_s significant at the 0.05 level?", hint: "With 10 sites, the critical value is 0.648. Pebble size against distance usually gives r_s near −0.9: a significant negative correlation. With fewer pebbles per site the result is weaker.", setup() { set({ view: "profile", gvar: "D" }); autoMeasure(); } }
  ],
  batch: [
    { title: "When do grains start to move?", question: "What velocity is needed to start moving grains of each size?", how: "A grain is lifted when the flow plus a random turbulent gust (±15%) exceeds Hjulström's erosion velocity; 30 grains of each size.", xLabel: "log₁₀(grain size / mm)", yLabel: "velocity to move it (cm/s)", xs: [-2.7, -2, -1.3, -0.7, 0, 0.7, 1.3, 2, 2.7], reps: 30, yMin: 0, theory: x => Ve(10 ** x), theoryLabel: "Hjulström erosion curve", run: (x, r) => Ve(10 ** x) / (1 + 0.15 * Math.abs(r.gauss())), note: "A U-shaped curve with its minimum at sand (about 0.1–0.5 mm), about 12% below Hjulström's line because gusts lift grains early. Clay is as hard to move as gravel." },
    { title: "Do pebbles get smaller downstream?", question: "How does the median pebble size of 10 pebbles change with distance downstream?", how: "Typical UK river; 10 pebbles per site (log-normal about Sternberg's law, D = 250 e^(−0.07x) mm).", xLabel: "distance from the source (km)", yLabel: "median pebble size (mm)", xs: [0, 10, 20, 30, 40, 50, 60, 80, 100], reps: 20, yMin: 0, theory: x => Dbed(x), theoryLabel: "Sternberg's law", run: (x, r) => fieldwork(x, RIVERS.uk, r).D, note: "An exponential fall (a straight line on a log axis): attrition and abrasion wear pebbles down, and big ones are left behind upstream. Each site scatters by about 20%." },
    { title: "Does velocity increase downstream?", question: "Do float measurements show water getting faster downstream?", how: "Typical UK river at mean flow; float timed three times over 10 m (±8%, ±0.3 s), mean velocity = 0.85 × surface speed.", xLabel: "distance from the source (km)", yLabel: "mean velocity (m/s)", xs: [2, 10, 20, 30, 40, 50, 60, 74, 90], reps: 12, yMin: 0, theory: x => site(x, RIVERS.uk, 1).v, theoryLabel: "Manning's equation", run: (x, r) => fieldwork(x, RIVERS.uk, r).v, note: "Yes: velocity rises from about 0.5 m/s near the source to over 1 m/s downstream, levelling off near the mouth. Deeper, smoother channels win over the gentler gradient." },
    { title: "Are meanders about 11 widths long?", question: "How does meander wavelength depend on channel width?", how: "Leopold and Wolman's observations (λ ≈ 10.9 w^1.01) with natural scatter (SD 16%); 10 rivers per width.", xLabel: "channel width (m)", yLabel: "meander wavelength (m)", xs: [10, 20, 30, 40, 50, 60], reps: 10, yMin: 0, fit: true, theory: w => 10.9 * w ** 1.01, theoryLabel: "10.9 w^1.01", run: (w, r) => 10.9 * w ** 1.01 * Math.exp(0.16 * r.gauss()), note: "A straight line through the origin with gradient about 11: wide rivers make big meanders. The same rule holds from streams to the Mississippi (and even meltwater channels on glaciers)." },
    { title: "Does more water mean faster retreat?", question: "How fast does a waterfall over shale retreat for different discharges?", how: "Hard limestone cap 4 m thick over shale; undercutting 0.03 × √(Q/10) m/yr; random collapses; retreat counted only when the cap collapses, averaged over 2000 years. x = log₁₀ discharge.", xLabel: "log₁₀(discharge / m³s⁻¹)", yLabel: "log₁₀(retreat / mm per year)", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], reps: 5, fit: true, theory: x => Math.log10(1000 * undercutRate(10 ** x, 1)), theoryLabel: "gradient 0.5", run: (x, r) => { const f = { pos: 0, u: 0, th: 4 * (0.6 + 0.8 * r()) }; for (let y = 0; y < 2000; y++) { f.u += undercutRate(10 ** x, 1); if (f.u > f.th) { f.pos += f.u; f.u = 0; f.th = 4 * (0.6 + 0.8 * r()); } } return Math.log10(1000 * Math.max(1e-3, f.pos) / 2000); }, note: "A log–log line of gradient about 0.5: retreat ∝ √Q. Niagara retreated about 1 m a year before water was diverted for power; High Force only a few millimetres." },
    { title: "Spearman's rank: how many pebbles per site?", question: "Testing pebble size against distance at 10 sites, how does r_s depend on how many pebbles are measured at each site?", how: "10 sites 0–20 km on the typical river; median of n pebbles per site; r_s against distance (critical value −0.648 at p = 0.05).", xLabel: "pebbles measured per site", yLabel: "r_s (pebble size against distance)", xs: [1, 3, 5, 10, 20, 30], reps: 40, yMin: -1, yMax: 0.2, theory: () => -0.648, theoryLabel: "critical value (p = 0.05)", run: (n, r) => { const xs = [], ds = []; for (let i = 0; i < 10; i++) { const x = 2 * i + 0.5, p = Array.from({ length: n }, () => Dbed(x) * Math.exp(0.45 * r.gauss())).sort((a, b) => a - b); xs.push(x); ds.push(n % 2 ? p[(n - 1) / 2] : (p[n / 2 - 1] + p[n / 2]) / 2); } return spearman(xs, ds); }, note: "With one pebble per site r_s is often not significant (noise beats the trend over 20 km); with 10 or more it is strongly negative. Sample size matters as much as the statistic." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1B Profiles", text: "Long profile: steep and concave near the source, gentle near the mouth. Cross profile: a narrow V-shaped valley upstream (vertical erosion), a wide flat flood plain downstream (lateral erosion and deposition)." },
      { lvl: "std", tag: "1B Bradshaw", text: "Downstream: discharge, width, depth, cross-section area and velocity increase; gradient, load particle size and channel roughness decrease." },
      { lvl: "std", tag: "1B Processes", text: "Erosion: hydraulic action, abrasion, attrition, solution. Transport: traction (rolling), saltation (bouncing), suspension, solution. Deposition happens when the river slows and loses energy." },
      { lvl: "std", tag: "1B Landforms", text: "Waterfalls form where hard rock lies over soft: undercutting, overhang, collapse, retreat, gorge. Meanders: erosion on the outside (river cliff), deposition on the inside (point bar); necks cut through to leave oxbow lakes. Floods build levees and flood plains." },
      { lvl: "adv", tag: "Channel flow", text: "Hydraulic radius R = cross-section area ÷ wetted perimeter: a bigger R means a more efficient channel. Manning: v = R^(2/3) S^(1/2) / n. Competence is the largest particle a river can move; capacity the total load." },
      { lvl: "adv", tag: "NEA skills", text: "Spearman's rank r_s = 1 − 6Σd²/(n(n² − 1)); compare |r_s| with the critical value for n (0.648 for n = 10 at p = 0.05)." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain how a waterfall forms and retreats to make a gorge.", ans: "<ul><li>band of hard (resistant) rock lies over softer rock</li><li>softer rock eroded faster by hydraulic action and abrasion: undercutting and a plunge pool</li><li>hard rock left as an overhang, which collapses</li><li>repeated collapse moves the waterfall upstream, leaving a steep-sided gorge</li></ul>" },
      { lvl: "std", marks: 2, q: () => { const s = site(P.x, R(), P.flow); return `At ${P.x.toFixed(0)} km the river is ${s.w.toFixed(1)} m wide and ${s.d.toFixed(2)} m deep, flowing at ${s.v.toFixed(2)} m/s. Calculate its discharge.`; }, ans: () => { const s = site(P.x, R(), P.flow); return `<ul><li>area = ${s.w.toFixed(1)} × ${s.d.toFixed(2)} = ${(s.w * s.d).toFixed(2)} m²</li><li>discharge = area × velocity = ${(s.w * s.d * s.v).toFixed(2)} m³/s</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Describe how an oxbow lake forms.", ans: "<ul><li>erosion on the outside of bends (fastest flow) and deposition on the inside make the meander loop grow</li><li>the neck narrows until the river cuts through it, usually in a flood</li><li>deposition seals the old loop off: an oxbow lake, which later fills in</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const s = site(P.x, R(), P.flow); return `A channel is ${s.w.toFixed(1)} m wide and ${s.d.toFixed(2)} m deep (rectangular). Calculate its hydraulic radius and explain what it shows.`; }, ans: () => { const s = site(P.x, R(), P.flow); return `<ul><li>area = ${s.A.toFixed(2)} m², wetted perimeter = ${s.Pw.toFixed(2)} m</li><li>R = ${s.Rh.toFixed(3)} m</li><li>a larger R means less of the water touches the bed and banks, so less energy is lost to friction: a more efficient channel</li></ul>`; } }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Long profile z = z₀(e^(−x/λ) − e^(−L/λ)) ÷ (1 − e^(−L/λ)), λ = L/4, plus a 20 m step at the hard rock band.</li>
<li>Discharge ∝ drainage area ∝ distance^1.67 (Hack's law); bankfull = 4 × mean flow; width 3.2√Q_bankfull (Leopold and Maddock), narrower at lower flows (∝ Q^0.26). Depth and velocity from Manning's equation in a rectangular channel, with n from the bed-load size (Strickler) plus extra roughness upstream.</li>
<li>Bed load: Sternberg's law D = 250e^(−0.07x) mm; roundness rises downstream; pebbles at a site vary log-normally (SD 0.45 in ln D).</li>
<li>Hjulström curve fit (cm/s, mm): erosion 28√D + 7/√D; settling 0.7 × 28√D × (D/(D + 0.06))^1.5; ±15% turbulence in the flume.</li>
<li>Meanders: Howard and Knutson (1984) migration, rate ∝ −C + 2.5 × upstream-weighted curvature; a neck is cut off when two parts of the channel come within 1.1 widths.</li>
<li>Waterfalls: undercutting 0.03 × k × √(Q/10) m/yr (k = 1 shale, 0.55 softer limestone, 0.3 weak sandstone); the cap collapses at a random 0.6–1.4 × its thickness × strength.</li>
<li>Fieldwork errors: width ±2%, depth ±6%, float times ±8% and ±0.3 s reaction time; mean velocity = 0.85 × surface speed.</li></ul>
<h3>Left out</h3>
<ul><li>Weathering and mass movement on valley sides, rejuvenation and knickpoints, braiding, estuaries in detail, vegetation and human changes (channelisation, dams).</li></ul>
<h3>Data</h3>
<ul><li>River Tees: source on Cross Fell (893 m), about 137 km to Teesmouth; High Force about 21 m over the Whin Sill dolerite. Environment Agency; Ordnance Survey; BGS.</li>
<li>Niagara: about 51 m, about 11 km of gorge in 12 500 years (about 1 m/yr before the 1950s diversions). Niagara Parks; USGS. Leopold and Wolman (1960): λ ≈ 10.9 w^1.01.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/river-landforms.html">original/river-landforms.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "profile", options: [["profile", "🏞 source to mouth"], ["flume", "🪨 erosion and transport"], ["meander", "〰 meanders"], ["fall", "🌊 waterfalls"]], on: v => { P.view = v; showGroups(); } });
let rr = K.row(g); K.btn(rr, "▶ Play / ❚❚ Pause", () => run = !run, "primary");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
grp.profile = g = ui.group("Source to mouth");
ctl.river = K.seg(g, { value: "uk", options: Object.entries(RIVERS).map(([k, v]) => [k, v.name]), on: v => { P.river = v; field = []; } });
ctl.x = K.slider(g, { label: "Where you are", min: 0, max: 137, step: 0.5, value: 20, unit: "km from the source", on: v => P.x = Math.min(v, R().L) });
ctl.flow = K.seg(g, { value: 1, options: [[0.3, "low flow"], [1, "mean flow"], [4, "bankfull flood"]], on: v => P.flow = +v });
rr = K.row(g); K.btn(rr, "📏 Measure here", () => { field.push(fieldwork(P.x, R(), rnd)); }); K.btn(rr, "Every 10 km", () => autoMeasure()); K.btn(rr, "Clear", () => field = []);
ctl.gvar = K.seg(g, { value: "w", options: [["w", "width"], ["d", "depth"], ["v", "velocity"], ["Q", "discharge"], ["D", "pebble size"], ["rnd", "roundness"]], on: v => P.gvar = v });
grp.flume = g = ui.group("Erosion and transport");
ctl.vel = K.slider(g, { label: "Water velocity", min: 1, max: 500, step: 1, value: 60, unit: "cm/s", on: v => P.vel = v });
ctl.flood = K.toggle(g, { label: "A flood rises and falls", value: false, on: v => { P.flood = v; tFlood = 0; } });
ctl.load = K.seg(g, { value: "all", options: [["all", "all sizes"], ["coarse", "coarse load"], ["fine", "fine load"]], on: v => { P.load = v; newGrains(); } });
grp.meander = g = ui.group("Meanders");
ctl.width = K.slider(g, { label: "Channel width", min: 10, max: 60, step: 1, value: 20, unit: "m", on: v => P.width = v });
ctl.erod = K.slider(g, { label: "Bank erodibility", min: 0.3, max: 3, step: 0.1, value: 1, fmt: v => v.toFixed(1) + "×", on: v => P.erod = v });
rr = K.row(g); K.btn(rr, "Straight river again", () => newMeander());
grp.fall = g = ui.group("Waterfalls");
ctl.fall = K.seg(g, { value: "own", options: Object.entries(FALLS).map(([k, v]) => [k, v.name]), on: v => set({ view: "fall", fall: v }) });
ctl.Q = K.slider(g, { label: "Discharge", min: 1, max: 6000, step: 1, value: 20, unit: "m³/s", on: v => P.Q = v });
ctl.cap = K.seg(g, { value: "limestone", options: Object.entries(CAP).map(([k, v]) => [k, v.name]), on: v => { P.cap = v; } });
ctl.soft = K.seg(g, { value: "shale", options: Object.entries(SOFT).map(([k, v]) => [k, v.name]), on: v => { P.soft = v; } });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""], ["f", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
function autoMeasure() { field = []; for (let x = 0; x <= R().L; x += 10) field.push(fieldwork(Math.max(0.5, x), R(), rnd)); }
function newGrains() { grains = []; const pool = P.load === "coarse" ? SIZES.slice(4) : P.load === "fine" ? SIZES.slice(0, 4) : SIZES; for (let i = 0; i < 160; i++) { const [nm, D0] = pool[i % pool.length], D = D0 * Math.exp(0.3 * rnd.gauss()); grains.push({ D, nm, x: rnd(), y: 0, vy: 0, st: "rest", gust: 1 + 0.15 * rnd.gauss() }); } }
function newMeander() { M = { pts: resample(newChannel(rnd, P.width * 0.6), P.width * 0.3), oxbows: [], cutoffs: [], t: 0, sin: [], acc: 0 }; }
function newFall() { const f = FALLS[P.fall]; F = { pos: 0, u: 0, h: f.h, ct: f.ct, t: 0, th: f.ct * CAP[P.cap].s * (0.6 + 0.8 * rnd()), hist: [[0, 0]], blocks: [] }; }
function set(o) { Object.assign(P, { view: "profile", river: "uk", x: 20, flow: 1, vel: 60, flood: false, load: "all", width: 20, erod: 1, fall: "own", speed: 1, gvar: "w" }, o); const f = FALLS[P.fall]; if (!("Q" in o)) P.Q = f.Q; if (!("cap" in o)) P.cap = f.cap; if (!("soft" in o)) P.soft = f.soft;
  ctl.view.set(P.view); ctl.river.set(P.river); ctl.x.set(P.x); ctl.flow.set(P.flow); ctl.vel.set(P.vel); ctl.flood.set(P.flood); ctl.load.set(P.load); ctl.width.set(P.width); ctl.erod.set(P.erod); ctl.fall.set(P.fall); ctl.Q.set(P.Q); ctl.cap.set(P.cap); ctl.soft.set(P.soft); ctl.speed.set(P.speed); ctl.gvar.set(P.gvar);
  run = false; field = []; tFlood = 0; newGrains(); newMeander(); newFall(); showGroups(); }

// ---------------- Simulation steps ----------------
function stepProfile(dt) { P.x += dt * P.speed; if (P.x >= R().L) { P.x = R().L; run = false; } ctl.x.set(+P.x.toFixed(1)); }
function flumeVel() { if (!P.flood) return P.vel; const t = tFlood % 40; return 15 + 285 * Math.exp(-((t - 14) ** 2) / 30) ; }   // a flood hydrograph over 40 s
function stepFlume(dt) {
  tFlood += dt * P.speed; const v = flumeVel();
  for (const p of grains) { if (rnd() < 0.02) p.gust = 1 + 0.15 * rnd.gauss(); const ve = v * p.gust;
    if (p.st === "rest") { if (ve > Ve(p.D)) p.st = p.D > 2 ? (ve > 1.6 * Ve(p.D) ? "salt" : "trac") : p.D > 0.06 ? "salt" : "susp"; }
    else if (ve < Vs(p.D)) { p.st = "rest"; }
    else if (p.D > 2) p.st = ve > 1.6 * Ve(p.D) ? "salt" : (ve > Ve(p.D) ? "trac" : (p.st === "susp" ? "salt" : p.st));
    else if (p.D < 0.06 && ve > Vs(p.D) * 3) p.st = "susp";
    const sp = { rest: 0, trac: 0.15, salt: 0.45, susp: 0.9 }[p.st]; p.x += sp * v / 100 * dt * P.speed / 3; if (p.x > 1) p.x -= 1;
    const ty = { rest: 0, trac: 0, salt: 0.25 * Math.abs(Math.sin(p.x * 60 + p.D)), susp: 0.3 + 0.5 * ((p.x * 37 + p.D * 13) % 1) }[p.st]; p.y += (ty - p.y) * Math.min(1, dt * 4); }
}
const DTM = 0.3;
// one step = one year; 1× = 25 years per second; more erodible banks take more (small) steps so the model stays stable
function stepMeander(dt) { M.acc += 25 * dt * P.speed; const wPx = P.width * 0.6, sub = Math.ceil(P.erod); let k = 0; while (M.acc >= 1 && k++ < 400) { M.acc -= 1; M.t += 1; for (let j = 0; j < sub; j++) migrate(M, DTM * P.erod / sub, 1, wPx); }
  M.oxbows.forEach(o => o.age = M.t - o.born); M.oxbows = M.oxbows.filter(o => o.age < 1500); if (!M.sin.length || M.t - M.sin[M.sin.length - 1][0] > 2) M.sin.push([M.t, sinuosity(M.pts)]); if (M.sin.length > 600) M.sin.shift(); }
function stepFall(dt) { const yrs = 20 * dt * P.speed; F.t += yrs; F.u += undercutRate(P.Q, SOFT[P.soft].k) * yrs; if (F.u > F.th) { F.pos += F.u; F.blocks.push({ x: F.pos, s: Math.min(F.ct, F.u), age: 0 }); F.u = 0; F.th = F.ct * CAP[P.cap].s * (0.6 + 0.8 * rnd()); } F.blocks.forEach(b => b.age += yrs); F.hist.push([F.t, F.pos + F.u * 0]); if (F.hist.length > 800) F.hist.splice(1, 1); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawProfile(c, w, h) {
  const Rv = R(), s = site(P.x, Rv, P.flow), x0 = 60, x1 = w - 30, y0 = 50, ph = h * 0.3;
  // long profile
  c.fillStyle = "#26402c"; c.beginPath(); c.moveTo(x0, y0 + ph); for (let i = 0; i <= 200; i++) { const x = Rv.L * i / 200; c.lineTo(x0 + (x1 - x0) * x / Rv.L, y0 + ph - ph * zAt(x, Rv) / (Rv.z0 + 20)); } c.lineTo(x1, y0 + ph); c.fill();
  c.strokeStyle = "#5ad1ff"; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i <= 200; i++) { const x = Rv.L * i / 200, X = x0 + (x1 - x0) * x / Rv.L, Y = y0 + ph - ph * zAt(x, Rv) / (Rv.z0 + 20); i ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke(); c.lineWidth = 1;
  const hx = x0 + (x1 - x0) * Rv.hard / Rv.L; c.fillStyle = "#8a7a6a"; c.fillRect(hx - 3, y0 + ph - ph * zAt(Rv.hard - 0.3, Rv) / (Rv.z0 + 20) - 4, 6, 30); TX(c, P.river === "tees" ? "High Force (hard dolerite)" : "waterfall (hard rock band)", hx + 8, y0 + ph - ph * zAt(Rv.hard, Rv) / (Rv.z0 + 20) - 10, "#d9c8b0", "left", "11px");
  [[0.15, "upper course"], [0.5, "middle course"], [0.85, "lower course"]].forEach(([f, t]) => TX(c, t, x0 + (x1 - x0) * f, y0 + ph + 16, "#8fa0bf", "center", "11.5px"));
  const mx = x0 + (x1 - x0) * P.x / Rv.L, my = y0 + ph - ph * s.z / (Rv.z0 + 20); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(mx, my, 6, 0, 6.3); c.fill(); TX(c, `${P.x.toFixed(1)} km, ${s.z.toFixed(0)} m above sea level`, Math.min(mx + 10, x1 - 170), my - 10, "#ffd166", "left", "600 11.5px");
  TX(c, `Long profile of the ${Rv.name} (height against distance)`, x0, y0 - 14, "#eef2f8", "left", "600 13px");
  // valley cross-section: V-shaped upstream, flood plain downstream
  const cy = y0 + ph + 50, chh = h - cy - 20, vx0 = x0, vx1 = (x0 + x1) / 2 - 20, fr = Math.min(1, P.x / Rv.L * 1.5), floor = (vx1 - vx0) * (0.04 + 0.8 * fr), mid = (vx0 + vx1) / 2;
  TX(c, "Valley cross-section (not to scale)", vx0, cy, "#eef2f8", "left", "600 12.5px");
  c.fillStyle = "#26402c"; c.beginPath(); c.moveTo(vx0, cy + 14); c.lineTo(mid - floor / 2, cy + chh - 20); c.lineTo(mid + floor / 2, cy + chh - 20); c.lineTo(vx1, cy + 14 + (1 - fr) * 6); c.lineTo(vx1, cy + chh); c.lineTo(vx0, cy + chh); c.fill();
  const cw = Math.max(6, Math.min(floor * 0.3, 8 + s.w)); c.fillStyle = "#3a7bd5"; c.fillRect(mid - cw / 2, cy + chh - 24, cw, 6);
  if (fr > 0.5) { c.fillStyle = "#3a5a3c"; c.fillRect(mid - cw / 2 - 10, cy + chh - 25, 10, 5); c.fillRect(mid + cw / 2, cy + chh - 25, 10, 5); TX(c, "levees", mid, cy + chh - 30, "#9bd39b", "center", "10.5px"); TX(c, "flood plain", mid - floor / 2 + 30, cy + chh - 6, "#9bd39b", "center", "10.5px"); } else TX(c, fr < 0.2 ? "steep V-shaped valley, interlocking spurs" : "valley widening", mid, cy + 30, "#9bd39b", "center", "10.5px");
  // channel cross-section to scale
  const ax0 = (x0 + x1) / 2 + 20, ax1 = x1, sc = Math.min((ax1 - ax0 - 60) / s.w, (chh - 90) / s.d), bx = (ax0 + ax1) / 2, by = cy + 30, bw = s.w * sc, bd = s.d * sc;
  TX(c, `Channel cross-section (to scale: 1 m = ${sc.toFixed(0)} px)`, ax0, cy, "#eef2f8", "left", "600 12.5px");
  c.fillStyle = "#3a2e22"; c.fillRect(ax0, by, ax1 - ax0, bd + 30); c.fillStyle = "#0b1020"; c.fillRect(bx - bw / 2, by, bw, bd); c.fillStyle = "#3a7bd5"; c.fillRect(bx - bw / 2, by, bw, bd);
  // bed load to scale (circles)
  const pr = Math.max(1.2, s.D / 1000 * sc / 2); c.fillStyle = "#b8a68a"; for (let i = 0; i < Math.min(60, bw / (2 * pr)); i++) { c.beginPath(); c.arc(bx - bw / 2 + pr + i * 2 * pr, by + bd - pr, pr, 0, 6.3); c.fill(); }
  TX(c, `${s.w.toFixed(1)} m wide`, bx, by - 6, "#cfd8ea", "center", "11px"); TX(c, `${s.d.toFixed(2)} m deep`, bx, by + bd + 18, "#cfd8ea", "center", "11px");
  const moves = s.v * 100 > Ve(s.D); TX(c, `bed load ${s.D.toFixed(s.D < 10 ? 1 : 0)} mm: ${moves ? "this flow can move it" : "too big to move at this flow"}`, ax0, by + bd + 40, moves ? "#7ee787" : "#ff8a70", "left", "11.5px");
}
function drawFlume(c, w, h) {
  const v = flumeVel(), x0 = 40, x1 = w - 40, bed = h * 0.78, top = h * 0.12;
  c.fillStyle = "#123056"; c.fillRect(x0, top, x1 - x0, bed - top); c.fillStyle = "#3a2e22"; c.fillRect(x0, bed, x1 - x0, h - bed - 10);
  // flow arrows
  c.strokeStyle = "rgba(160,200,255,.35)"; for (let k = 0; k < 7; k++) { const yy = top + (bed - top) * (k + 0.5) / 7, off = (performance.now() / 1000 * v * 2) % 80; for (let x = x0 - 80 + off; x < x1; x += 80) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 14 + v / 20, yy); c.stroke(); } }
  const col = { rest: "#8a7a6a", trac: "#ffd166", salt: "#ff8a70", susp: "#7ee787" };
  for (const p of grains) { const r = Math.max(1.5, Math.min(26, 2 + 4.2 * Math.log10(p.D / 0.002))), X = x0 + (x1 - x0) * p.x, Y = bed - r - p.y * (bed - top - 2 * r); c.fillStyle = col[p.st]; c.beginPath(); c.arc(X, Y, r, 0, 6.3); c.fill(); }
  TX(c, `water velocity ${v.toFixed(0)} cm/s${P.flood ? " (flood)" : ""} → flowing to the right`, x0, top - 12, "#eef2f8", "left", "600 13px");
  [["at rest", "rest"], ["traction (rolling)", "trac"], ["saltation (bouncing)", "salt"], ["suspension", "susp"]].forEach(([t, k], i) => { c.fillStyle = col[k]; c.beginPath(); c.arc(x0 + 10 + i * 170, h - 22, 6, 0, 6.3); c.fill(); TX(c, t + ": " + grains.filter(p => p.st === k).length, x0 + 22 + i * 170, h - 18, "#cfd8ea", "left", "11.5px"); });
  TX(c, "grain sizes drawn on a log scale: clay is really 200 000 times smaller than a boulder", x1, top - 12, "#8fa0bf", "right", "11px");
}
function drawMeander(c, w, h) {
  const sx = w / 1000, sy = (h - 40) / 600, wPx = P.width * 0.6;
  c.fillStyle = "#26402c"; c.fillRect(0, 0, w, h);
  for (const o of M.oxbows) { c.strokeStyle = o.age < 600 ? `rgba(90,160,230,${1 - o.age / 900})` : `rgba(120,150,90,${1 - o.age / 1500})`; c.lineWidth = wPx * sx; c.lineCap = "round"; c.beginPath(); o.pts.forEach(([x, y], i) => i ? c.lineTo(x * sx, 20 + y * sy) : c.moveTo(x * sx, 20 + y * sy)); c.stroke(); }
  // point bars (sand) on the inside of bends: draw a wider pale band first, then the water
  c.strokeStyle = "#d9c79a"; c.lineWidth = wPx * sx * 1.7; c.beginPath(); M.pts.forEach(([x, y], i) => i ? c.lineTo(x * sx, 20 + y * sy) : c.moveTo(x * sx, 20 + y * sy)); c.stroke();
  c.strokeStyle = "#3a7bd5"; c.lineWidth = wPx * sx; c.beginPath(); M.pts.forEach(([x, y], i) => i ? c.lineTo(x * sx, 20 + y * sy) : c.moveTo(x * sx, 20 + y * sy)); c.stroke(); c.lineWidth = 1; c.lineCap = "butt";
  TX(c, `${M.t.toFixed(0)} years · sinuosity ${sinuosity(M.pts).toFixed(2)} · ${M.cutoffs.length} cut-off${M.cutoffs.length === 1 ? "" : "s"} · river flows left to right`, 14, 16, "#eef2f8", "left", "600 13px");
  TX(c, "blue loops: oxbow lakes (fading green: filled-in meander scars) · pale edges: point bars and beaches", 14, h - 8, "#cfe8cf", "left", "11px");
}
function drawFall(c, w, h) {
  // the lip of the waterfall stays at the same place on screen; the gorge it has left behind stretches downstream (right)
  const f = FALLS[P.fall], sc = Math.min(6, (h * 0.55) / (F.h + F.ct + 10)), base = h * 0.74, lx = w * 0.5;
  const topY = base - F.h * sc, capB = topY + F.ct * sc, uc = F.u * sc, sheet = 10 + Math.sqrt(P.Q) * 0.25;
  c.fillStyle = "#6b5a48"; c.fillRect(0, capB, lx - uc, base - capB); c.fillRect(0, base, w, h - base);                 // soft rock, undercut
  c.fillStyle = "#9a9aa8"; c.fillRect(0, topY, lx, F.ct * sc);                                                           // hard cap rock (overhang)
  c.fillStyle = "#3a7bd5"; c.fillRect(0, topY - 6, lx, 6); c.globalAlpha = 0.8; c.fillRect(lx, topY - 4, sheet, base - topY + 4); c.globalAlpha = 1;
  c.fillStyle = "#2b5fa8"; c.beginPath(); c.ellipse(lx - uc / 2 + sheet / 2, base, 30 + uc, 16, 0, 0, Math.PI); c.fill();
  // the gorge: valley sides drawn in the distance downstream, with the original position of the lip marked
  c.fillStyle = "#4a3f33"; c.fillRect(lx + sheet, topY, w - lx - sheet, base - topY); c.fillStyle = "#2b5fa8"; c.fillRect(lx + sheet, base - 8, w - lx - sheet, 8);
  const ox = lx + sheet + F.pos * sc; c.strokeStyle = "#ffd166"; c.setLineDash([5, 4]); if (ox < w - 10) { c.beginPath(); c.moveTo(ox, topY - 30); c.lineTo(ox, base); c.stroke(); TX(c, "where the lip started", ox, topY - 36, "#ffd166", "center", "11px"); } else TX(c, `lip started ${F.pos.toFixed(0)} m downstream →`, w - 14, topY - 14, "#ffd166", "right", "11px"); c.setLineDash([]);
  TX(c, `gorge (seen beyond the fall): ${F.pos.toFixed(1)} m long`, lx + sheet + 12, (topY + base) / 2, "#e8dccb", "left", "600 12px");
  for (const [k, b] of F.blocks.slice(-4).entries()) { c.fillStyle = "#8a8a96"; const bs = Math.min(F.ct * sc * 0.7, 30); c.fillRect(lx + sheet + 14 + k * (bs + 8), base - bs * 0.6, bs, bs * 0.6); }
  TX(c, CAP[P.cap].name + ": hard cap rock", 14, topY + F.ct * sc / 2 + 4, "#111", "left", "600 11.5px"); TX(c, SOFT[P.soft].name + ": softer rock", 14, (capB + base) / 2, "#e8dccb", "left", "600 11.5px");
  TX(c, "plunge pool", lx, base + 32, "#9cc8ff", "center", "11px"); if (F.u > 0.05) TX(c, `overhang ${F.u.toFixed(2)} m`, lx - uc - 6, capB + 16, "#ffd166", "right", "11px");
  TX(c, `${f.name}: ${F.h} m high · ${F.t.toFixed(0)} years · retreated ${F.pos.toFixed(1)} m upstream (to the left)`, 14, 24, "#eef2f8", "left", "600 13px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ profile: drawProfile, flume: drawFlume, meander: drawMeander, fall: drawFall })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
const GV = { w: ["width (m)", s => s.w], d: ["mean depth (m)", s => s.d], v: ["velocity (m/s)", s => s.v], Q: ["discharge (m³/s)", s => s.Q], D: ["pebble size (mm)", s => s.D], rnd: ["roundness (Powers)", s => s.rnd] };
function charts() {
  if (P.view === "profile") {
    const Rv = R(), s = site(P.x, Rv, P.flow), sites = []; for (let x = 0.5; x <= Rv.L; x += Rv.L / 60) sites.push(site(x, Rv, 1));
    const n1 = (k, f) => { const a = sites.map(f), m = Math.max(...a); return { pts: sites.map((q, i) => [q.x, a[i] / m]), label: k }; };
    chA.opts.title = "Bradshaw model"; chA.opts.xLabel = "distance from source (km)"; chA.opts.yLabel = "fraction of its maximum";
    chA.draw([Object.assign(n1("discharge", q => q.Q), { color: "#5ad1ff" }), Object.assign(n1("width", q => q.w), { color: "#7ee787" }), Object.assign(n1("velocity", q => q.v), { color: "#ffd166" }), Object.assign(n1("gradient", q => q.S), { color: "#ff8a70", dash: [5, 4] }), Object.assign(n1("load size", q => q.D), { color: "#c9a0ff", dash: [5, 4] }), { pts: [[P.x, 0], [P.x, 1]], color: "#fff", label: "you" }], { yMin: 0, yMax: 1.05, xMin: 0, xMax: Rv.L });
    const [lab, fn] = GV[P.gvar];
    chB.opts.title = "Fieldwork"; chB.opts.xLabel = "distance from source (km)"; chB.opts.yLabel = lab;
    const ser = [{ pts: sites.map(q => [q.x, fn(q)]), color: "#3a4a6b", label: "model" }]; if (field.length) { ser.push({ pts: field.map(q => [q.x, fn(q)]), type: "dots", r: 4, color: "#ffd166", label: "your measurements" }); if (field.length > 2) { const lf = K.linfit(field.map(q => [q.x, fn(q)])); ser.push({ pts: [[0, lf.c], [Rv.L, lf.c + lf.m * Rv.L]], color: "#ffd166", dash: [4, 3], label: "best fit" }); } }
    chB.draw(ser, { yMin: 0, xMin: 0, xMax: Rv.L });
    relabel(["discharge", "width × depth", "velocity", "hydraulic radius R", "gradient · Manning's n", "fieldwork"]);
    read.set("a", s.Q.toFixed(2) + " m³/s"); read.set("b", `${s.w.toFixed(1)} m × ${s.d.toFixed(2)} m = ${s.A.toFixed(2)} m²`); read.set("c", s.v.toFixed(2) + " m/s"); read.set("d", `${s.Rh.toFixed(3)} m (wetted perimeter ${s.Pw.toFixed(1)} m)`); read.set("e", `${(s.S * 1000).toFixed(2)} m per km · n = ${s.n.toFixed(3)}`);
    if (field.length >= 5) { const rs = spearman(field.map(q => q.x), field.map(fn)), cv0 = crit(field.length); read.set("f", `${field.length} sites · r_s = ${rs.toFixed(2)} (critical ${cv0.toFixed(3)}: ${Math.abs(rs) > cv0 ? "significant" : "not significant"})`); } else read.set("f", field.length ? `${field.length} site${field.length > 1 ? "s" : ""} measured (5+ for Spearman's rank)` : "press 📏 Measure here");
    ui.hud("Bradshaw: discharge, width, depth, velocity ↑ · gradient, load size, roughness ↓");
  } else if (P.view === "flume") {
    const er = [], se = []; for (let lx = -2.7; lx <= 2.8; lx += 0.05) { er.push([lx, Math.log10(Ve(10 ** lx))]); se.push([lx, Math.log10(Math.max(1e-3, Vs(10 ** lx)))]); }
    const col = { rest: "#8a7a6a", trac: "#ffd166", salt: "#ff8a70", susp: "#7ee787" }, v = flumeVel();
    chA.opts.title = "Hjulström curve (log axes)"; chA.opts.xLabel = "log₁₀(grain size / mm)"; chA.opts.yLabel = "log₁₀(velocity / cm s⁻¹)";
    chA.draw([{ pts: er, color: "#ff8a70", label: "erosion" }, { pts: se, color: "#5ad1ff", label: "deposition" }, { pts: [[-2.7, Math.log10(v)], [2.8, Math.log10(v)]], color: "#fff", dash: [4, 3], label: "now" }, { pts: grains.map(p => [Math.log10(p.D), Math.log10(v * p.gust)]), type: "dots", r: 2.5, color: "#ffd166", label: "grains" }], { xMin: -2.8, xMax: 2.8, yMin: -1, yMax: 3 });
    const cnt = st => grains.filter(p => p.st === st).length;
    chB.opts.title = "How the load is moving"; chB.opts.xLabel = "0 rest · 1 traction · 2 saltation · 3 suspension"; chB.opts.yLabel = "grains"; chB.draw([{ pts: [[0, cnt("rest")]], type: "bars", w: 0.7, color: col.rest, label: "rest" }, { pts: [[1, cnt("trac")]], type: "bars", w: 0.7, color: col.trac, label: "traction" }, { pts: [[2, cnt("salt")]], type: "bars", w: 0.7, color: col.salt, label: "saltation" }, { pts: [[3, cnt("susp")]], type: "bars", w: 0.7, color: col.susp, label: "suspension" }], { yMin: 0, xMin: -0.6, xMax: 3.6 });
    const moving = grains.filter(p => p.st !== "rest"), comp = moving.length ? Math.max(...moving.map(p => p.D)) : 0;
    relabel(["velocity", "competence (largest moving)", "capacity (moving grains)", "smallest size eroded", "settles below", ""]);
    read.set("a", v.toFixed(0) + " cm/s"); read.set("b", comp ? comp.toFixed(comp < 1 ? 3 : 0) + " mm" : "nothing moving"); read.set("c", `${moving.length} of ${grains.length}`);
    let lo = null, hi = null; for (let lx = -2.7; lx <= 2.8; lx += 0.01) { if (Ve(10 ** lx) < v) { if (lo === null) lo = 10 ** lx; hi = 10 ** lx; } } read.set("d", lo ? `${lo.toFixed(lo < 0.1 ? 3 : 2)} – ${hi.toFixed(hi < 10 ? 1 : 0)} mm` : "none"); read.set("e", "see the blue curve"); read.set("f", "");
    ui.hud("Sand moves first: clay is sticky, boulders are heavy");
  } else if (P.view === "meander") {
    chA.opts.title = "Sinuosity over time"; chA.opts.xLabel = "years"; chA.opts.yLabel = "sinuosity"; chA.draw([{ pts: M.sin, color: "#5ad1ff", label: "channel length ÷ straight distance" }, { pts: M.cutoffs.map(t => [t, 1]), type: "dots", r: 5, color: "#ffd166", label: "cut-offs" }], { yMin: 1 });
    // cross-section of a bend: river cliff on the outside, point bar on the inside
    const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([u * P.width, -(Math.pow(u, 2.2) * 2.2 * Math.sqrt(P.width / 20))]); }
    chB.opts.title = "Cross-section of a bend"; chB.opts.xLabel = "across the channel (m): inside → outside"; chB.opts.yLabel = "depth (m)"; chB.draw([{ pts, type: "area", color: "#c9a0ff", label: "bed: point bar (left) to river cliff (right)" }], { yMax: 0.5 });
    relabel(["years", "sinuosity", "channel width", "cut-offs", "meander wavelength (expected)", ""]);
    read.set("a", M.t.toFixed(0)); read.set("b", sinuosity(M.pts).toFixed(2)); read.set("c", P.width + " m"); read.set("d", String(M.cutoffs.length)); read.set("e", `≈ ${(10.9 * P.width ** 1.01).toFixed(0)} m (10.9 w^1.01)`); read.set("f", "");
    ui.hud("Erosion outside the bend, deposition inside: helicoidal flow");
  } else {
    chA.opts.title = "Retreat upstream over time"; chA.opts.xLabel = "years"; chA.opts.yLabel = "retreat (m)"; chA.draw([{ pts: F.hist, color: "#5ad1ff", label: "position of the lip" }, { pts: [[0, 0], [Math.max(1, F.t), undercutRate(P.Q, SOFT[P.soft].k) * Math.max(1, F.t)]], color: "#ffd166", dash: [4, 3], label: "average rate" }], { yMin: 0, xMin: 0 });
    const qs = []; for (let lq = 0; lq <= 3.8; lq += 0.1) qs.push([lq, 1000 * undercutRate(10 ** lq, SOFT[P.soft].k)]);
    chB.opts.title = "Retreat rate against discharge"; chB.opts.xLabel = "log₁₀(discharge / m³s⁻¹)"; chB.opts.yLabel = "mm per year"; chB.draw([{ pts: qs, color: "#7ee787", label: SOFT[P.soft].name }, { pts: [[Math.log10(P.Q), 1000 * undercutRate(P.Q, SOFT[P.soft].k)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, xMin: 0 });
    relabel(["years", "retreat so far", "average rate", "overhang now", "collapses", ""]);
    read.set("a", F.t.toFixed(0)); read.set("b", F.pos.toFixed(2) + " m"); read.set("c", (1000 * undercutRate(P.Q, SOFT[P.soft].k)).toFixed(1) + " mm/yr"); read.set("d", F.u.toFixed(2) + " m"); read.set("e", String(F.blocks.length)); read.set("f", "");
    ui.hud("Hard over soft: undercut, overhang, collapse, retreat");
  }
}
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; if (P.view === "flume") stepFlume(dt); if (!run) return; if (P.view === "profile") stepProfile(dt); else if (P.view === "meander") stepMeander(dt); else if (P.view === "fall") stepFall(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Choose a view at the top of the controls. Press ▶ Play to travel downstream.", 6000);
