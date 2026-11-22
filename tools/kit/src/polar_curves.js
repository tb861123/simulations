/* =====================================================================
   POLAR CURVES
   A point is given by its distance r from the POLE O and the angle θ
   from the INITIAL LINE (the positive x-axis):  x = r cos θ, y = r sin θ.
   A polar curve r = f(θ) is traced by an arm that turns through θ and
   stretches to length f(θ). (Edexcel takes r ≥ 0: where f(θ) < 0 nothing
   is drawn.)
     r = a(1 + cos θ)   cardioid            r = a + b cos θ   limaçon
     r = a cos nθ       rose                r = aθ            spiral
   AREA: a thin sector of angle δθ has area ≈ ½r²δθ, so the area swept
   between θ = α and θ = β is   A = ½ ∫ r² dθ  (from α to β).
   TANGENTS: parallel to the initial line where dy/dθ = 0 (y = r sin θ);
   perpendicular to it where dx/dθ = 0 (x = r cos θ).
   ===================================================================== */
const CURVES = {
  cardioid: { name: "cardioid r = a(1 + cos θ)", f: (t, q) => q.a * (1 + Math.cos(t)), range: 2 * Math.PI },
  limacon: { name: "limaçon r = a + b cos θ", f: (t, q) => q.a + q.b * Math.cos(t), range: 2 * Math.PI },
  rose: { name: "rose r = a cos nθ", f: (t, q) => q.a * Math.cos(q.n * t), range: 2 * Math.PI },
  spiral: { name: "spiral r = aθ", f: (t, q) => q.a * t / 2, range: 6 * Math.PI },
  circle: { name: "circle r = 2a cos θ", f: (t, q) => 2 * q.a * Math.cos(t), range: 2 * Math.PI },
  lemn: { name: "lemniscate r² = a² cos 2θ", f: (t, q) => { const v = q.a * q.a * Math.cos(2 * t); return v >= 0 ? Math.sqrt(v) : -1; }, range: 2 * Math.PI },
};
const rOf = (Q, t) => CURVES[Q.curve].f(t, Q);
// ½∫r² dθ, counting only r ≥ 0 (Simpson's rule with many strips: effectively exact)
function area(Q, a, b) { const n = 2000, h = (b - a) / n; let s = 0; for (let i = 0; i <= n; i++) { const r = Math.max(0, rOf(Q, a + i * h)), w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; s += w * r * r; } return 0.5 * s * h / 3; }
function sectorSum(Q, a, b, N) { const h = (b - a) / N; let s = 0; for (let i = 0; i < N; i++) { const r = Math.max(0, rOf(Q, a + (i + 0.5) * h)); s += 0.5 * r * r * h; } return s; }
// points where the tangent is parallel (dy/dθ = 0) or perpendicular (dx/dθ = 0) to the initial line
function tangents(Q) {
  const R = CURVES[Q.curve].range, out = [], N = 4000, d = 1e-5;
  const xy = t => { const r = rOf(Q, t); return r < 0 ? null : [r * Math.cos(t), r * Math.sin(t)]; };
  const dd = (t, k) => { const p = xy(t + d), m = xy(t - d); return p && m ? (p[k] - m[k]) / (2 * d) : NaN; };
  for (const [k, kind] of [[1, "par"], [0, "perp"]]) { let pt = 0.0001, pv = dd(pt, k); for (let i = 1; i <= N; i++) { const t = 0.0001 + R * i / N, v = dd(t, k); if (isFinite(v) && isFinite(pv) && pv * v < 0) { let a = pt, b = t; for (let j = 0; j < 40; j++) { const m = (a + b) / 2; dd(a, k) * dd(m, k) <= 0 ? b = m : a = m; } const tm = (a + b) / 2, p = xy(tm); if (p && Math.hypot(p[0], p[1]) > 1e-3 && !out.some(o => o.kind === kind && Math.hypot(o.p[0] - p[0], o.p[1] - p[1]) < 1e-3)) out.push({ t: tm, p, kind }); } pt = t; pv = v; } }
  return out;
}

// ---------------- State ----------------
const DEF = { curve: "cardioid", a: 2, b: 1, n: 3, al: 0, be: 90, N: 12, showArea: true, showSec: true, showTan: false, speed: 1 };
const P = Object.assign({}, DEF);
let th = 0;
const rad = d => d * Math.PI / 180;

// ---------------- The page ----------------
const ui = K.app({
  title: "Polar Curves", subject: "Further Mathematics",
  blurb: "An arm turns through θ and stretches to r = f(θ): cardioids, limaçons, roses and spirals, areas from ½∫r² dθ, and tangents parallel and perpendicular to the initial line",
  reset: () => { th = 0; },
  levels: { std: "Curves and areas (9FM0)", adv: "Tangents (9FM0)", specs: {
    std: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, polar coordinates: converting between polar and Cartesian, sketching curves r = f(θ) (cardioids, limaçons, roses, spirals, circles), and the area enclosed, A = ½∫r² dθ. (Polar coordinates are not in AS 8FM0.)",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2: tangents to polar curves parallel to the initial line (dy/dθ = 0, with y = r sin θ) and perpendicular to it (dx/dθ = 0, with x = r cos θ), and areas between two curves." } },
  missions: [
    { title: "Tracing a cardioid", q: "Watch the arm turn. At which θ is r largest? Where does the curve pass through the pole?", hint: "r = a(1 + cos θ) is largest (2a) at θ = 0 and zero at θ = π, where the cardioid has its cusp at the pole.", setup: () => set({ curve: "cardioid" }) },
    { title: "Area of a cardioid", q: "Shade from θ = 0 to 2π. Compare the sector sum with ½∫r² dθ. What is the area when a = 2?", hint: "½∫a²(1 + cos θ)² dθ over 0 to 2π = 3πa²/2 = 6π ≈ 18.85 for a = 2. The sectors (thin triangles) approach it as N grows.", setup: () => set({ curve: "cardioid", al: 0, be: 360, N: 24 }) },
    { title: "Limaçons: dimple or loop?", q: "r = a + b cos θ with a = 2. Change b from 0.5 to 2. When does the curve get a dimple? When does it touch the pole?", hint: "b < a/2 (here b < 1): convex, egg-shaped; a/2 < b < a: a dimple; b = a: a cardioid (touches the pole). With r ≥ 0 only, for b > a parts of θ are missing.", setup: () => set({ curve: "limacon", a: 2, b: 0.5 }) },
    { title: "Roses", q: "r = a cos nθ. Count the petals for n = 2, 3, 4, 5. What is the rule?", hint: "With Edexcel's r ≥ 0, n petals for each n (the negative-r half is not drawn). (If negative r is allowed, even n gives 2n petals.) Each petal spans an angle π/n.", setup: () => set({ curve: "rose", n: 3 }) },
    { title: "One petal's area", q: "r = 2 cos 3θ: shade one petal, from −π/6 to π/6 (−30° to 30°). Find its area.", hint: "½∫4cos²3θ dθ from −π/6 to π/6 = π/3 ≈ 1.047. Use cos²3θ = ½(1 + cos 6θ).", setup: () => set({ curve: "rose", a: 2, n: 3, al: -30, be: 30, N: 10 }) },
    { title: "Spiral", q: "r = aθ/2. How far apart are successive turns? Does the area grow steadily?", hint: "Each turn adds aπ to r, so the turns are evenly spaced (Archimedean spiral). Area grows like θ³: ½∫(aθ/2)² dθ = a²θ³/24.", setup: () => set({ curve: "spiral", a: 1, al: 0, be: 720 }) },
    { lvl: "adv", title: "Tangents parallel to the initial line", q: "Cardioid: show the tangent points. Where is the tangent parallel to the initial line? Check dy/dθ = 0 with y = a(1 + cos θ) sin θ.", hint: "dy/dθ = a(cos θ + cos 2θ) = 0 gives cos θ = ½ (θ = ±π/3) or cos θ = −1 (the pole). So the top and bottom of the cardioid are at θ = ±π/3, r = 3a/2.", setup: () => set({ curve: "cardioid", showTan: true, showArea: false }) },
    { lvl: "adv", title: "Tangents perpendicular to the initial line", q: "Limaçon r = 2 + 1.5 cos θ: where is the tangent perpendicular to the initial line? How many such points are there?", hint: "dx/dθ = 0 where x = r cos θ has a turning point: at θ = 0 (the far right) and at the points on either side of the dimple, and the far left. The yellow squares mark them.", setup: () => set({ curve: "limacon", a: 2, b: 1.5, showTan: true, showArea: false }) },
  ],
  batch: [
    { title: "Sectors approaching the area", question: "For the cardioid (a = 2) from θ = 0 to π/2, how far is the sum of N midpoint sectors from ½∫r² dθ?", how: "Exact calculation; the exact area is a²(3π/8 + 1).", xLabel: "number of sectors N", yLabel: "|sector sum − area|", xs: [2, 4, 6, 8, 12, 16, 24], reps: 1, yMin: 0, theory: N => 0.411 / (N * N), theoryLabel: "≈ 0.411/N²", run: N => Math.abs(sectorSum(Object.assign({}, DEF), 0, Math.PI / 2, N) - 4 * (3 * Math.PI / 8 + 1)), note: "The error falls like 1/N² (midpoint sectors). Area is the limit of the sum of ½r²δθ: this is where ½∫r² dθ comes from." },
    { title: "Random points inside a cardioid", question: "Throw random points into the square −1 ≤ x ≤ 3, −2 ≤ y ≤ 2. What fraction land inside r = 1 + cos θ?", how: "Each run: 400 random points; a point is inside if its distance from O is less than 1 + cos θ at its angle.", yLabel: "fraction inside", reps: 300, bins: 24, theory: (3 * Math.PI / 2) / 16, theoryLabel: "(3π/2) ÷ 16", run: (x, r) => { let k = 0; for (let i = 0; i < 400; i++) { const px = -1 + 4 * r(), py = -2 + 4 * r(); if (Math.hypot(px, py) < 1 + Math.cos(Math.atan2(py, px))) k++; } return k / 400; }, note: "A Monte Carlo check of the area 3π/2 for a = 1: the fraction is the area ratio (3π/2)/16 ≈ 0.295." },
    { title: "Area of a rose", question: "What is the total area of the rose r = cos nθ (r ≥ 0 only)?", how: "½∫r² dθ over 0 to 2π, counting only r ≥ 0. Exact calculation.", xLabel: "n", yLabel: "total area", xs: [1, 2, 3, 4, 5, 6, 7], reps: 1, yMin: 0, theory: () => Math.PI / 4, theoryLabel: "π/4 for every n", run: n => area({ curve: "rose", a: 1, n }, 0, 2 * Math.PI), note: "The same for every n: each of the n petals has area π/(4n). (Allowing negative r would double it for even n.)" },
    { title: "Spiral area grows like θ³", question: "How much area has r = θ/2 swept out after angle θ?", how: "½∫(θ/2)² dθ, exact calculation.", xLabel: "turns", yLabel: "area swept", xs: [0.5, 1, 1.5, 2, 2.5, 3], reps: 1, yMin: 0, theory: k => (2 * Math.PI * k) ** 3 / 24, theoryLabel: "θ³/24", run: k => area({ curve: "spiral", a: 1 }, 0, 2 * Math.PI * k), note: "The swept area includes the overlapping earlier turns: it counts every region once per pass of the arm." },
    { title: "Average distance from the pole", question: "Pick a random angle θ. On average, how far is the cardioid r = 2(1 + cos θ) from the pole?", how: "Each run: the mean r over 100 random angles.", yLabel: "mean r", reps: 300, bins: 20, theory: 2, theoryLabel: "a", run: (x, r) => { let s = 0; for (let i = 0; i < 100; i++) s += 2 * (1 + Math.cos(2 * Math.PI * r())); return s / 100; }, note: "The average of cos θ over a full turn is 0, so the mean r is a. (The mean of r² is 3a²/2, which is why the area is 3πa²/2.)" },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP2", text: "x = r cos θ, y = r sin θ, r² = x² + y², tan θ = y/x. Edexcel uses r ≥ 0 and usually 0 ≤ θ < 2π or −π < θ ≤ π." },
      { lvl: "std", tag: "CP2", text: "Cardioid r = a(1 + cos θ); limaçon r = a + b cos θ (egg-shaped if a ≥ 2b, dimpled if b < a < 2b); rose r = a cos nθ; spiral r = aθ; circle r = 2a cos θ (centre (a, 0))." },
      { lvl: "std", tag: "CP2", text: "Area enclosed between θ = α and θ = β: A = ½∫ r² dθ. Use cos²θ = ½(1 + cos 2θ). For a region between two curves, subtract areas, finding where they meet." },
      { lvl: "adv", tag: "CP2", text: "Tangent parallel to the initial line: dy/dθ = 0 where y = r sin θ. Perpendicular: dx/dθ = 0 where x = r cos θ. Check that r is not zero (the pole) at the answer." },
    ],
    questions: [
      { lvl: "std", marks: 5, q: "Find the area enclosed by the cardioid r = a(1 + cos θ).", ans: "<ul><li>A = ½∫₀^{2π} a²(1 + 2cos θ + cos²θ) dθ</li><li>cos²θ = ½(1 + cos 2θ)</li><li>= ½a²[θ + 2 sin θ + ½θ + ¼ sin 2θ]₀^{2π}</li><li>= ½a² × 3π</li><li>= 3πa²/2</li></ul>" },
      { lvl: "std", marks: 2, q: "Convert the polar equation r = 4 cos θ to Cartesian form and describe the curve.", ans: "<ul><li>r² = 4r cos θ, so x² + y² = 4x</li><li>(x − 2)² + y² = 4: a circle, centre (2, 0), radius 2</li></ul>" },
      { lvl: "std", marks: 3, q: () => `For the curve ${CURVES[P.curve].name.split(" ").slice(-4).join(" ")} with a = ${P.a}${P.curve === "limacon" ? ", b = " + P.b : ""}${P.curve === "rose" ? ", n = " + P.n : ""}, find the area between θ = ${P.al}° and θ = ${P.be}°.`, ans: () => `<ul><li>A = ½∫ r² dθ from ${(rad(P.al)).toFixed(4)} to ${(rad(P.be)).toFixed(4)} radians</li><li>= ${area(P, rad(P.al), rad(P.be)).toFixed(4)}</li></ul>` },
      { lvl: "adv", marks: 5, q: "Find the points on r = a(1 + cos θ) where the tangent is parallel to the initial line.", ans: "<ul><li>y = a(1 + cos θ) sin θ = a(sin θ + ½ sin 2θ)</li><li>dy/dθ = a(cos θ + cos 2θ) = 0</li><li>2cos²θ + cos θ − 1 = 0, (2cos θ − 1)(cos θ + 1) = 0</li><li>cos θ = ½: θ = ±π/3, r = 3a/2 (cos θ = −1 is the pole)</li><li>points (3a/2, π/3) and (3a/2, −π/3)</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>The arm turns at a steady rate; the curve is drawn wherever r ≥ 0. The chart shows r against θ, which helps when sketching.</li><li>The shaded area between α and β is split into N thin sectors (triangles from the pole, using r at the middle of each); their total approaches ½∫r² dθ (computed by Simpson's rule with 2000 strips).</li><li>Tangent points are found by numerically locating where dy/dθ or dx/dθ changes sign.</li></ul>
<h3>Conventions and simplifications</h3><ul><li>r ≥ 0 only (the Edexcel convention). Some textbooks allow negative r, which draws extra loops.</li><li>Angles on the sliders are in degrees for convenience; all calculus uses radians.</li></ul>`,
});

const C = {};
let g = ui.group("Curve");
C.curve = K.seg(g, { value: "cardioid", options: Object.entries(CURVES).map(([k, v]) => [k, v.name]), on: v => { P.curve = v; th = 0; showCtl(); } });
C.a = K.slider(g, { label: "a", min: 0.5, max: 3, step: 0.25, value: 2, on: v => P.a = v });
C.b = K.slider(g, { label: "b", min: 0, max: 3, step: 0.25, value: 1, on: v => P.b = v });
C.n = K.slider(g, { label: "n", min: 1, max: 8, step: 1, value: 3, on: v => P.n = v });
C.speed = K.slider(g, { label: "Arm speed", min: 0.2, max: 4, step: 0.2, value: 1, fmt: v => v.toFixed(1) + "×", on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
g = ui.group("Area ½∫r² dθ");
C.showArea = K.toggle(g, { label: "Shade the area from α to β", value: true, on: v => P.showArea = v });
C.al = K.slider(g, { label: "α", min: -180, max: 360, step: 5, value: 0, unit: "°", on: v => P.al = Math.min(v, P.be) });
C.be = K.slider(g, { label: "β", min: -180, max: 1080, step: 5, value: 90, unit: "°", on: v => P.be = Math.max(v, P.al) });
C.showSec = K.toggle(g, { label: "Show the thin sectors", value: true, on: v => P.showSec = v });
C.N = K.slider(g, { label: "Number of sectors N", min: 1, max: 100, step: 1, value: 12, on: v => P.N = v });
C.showTan = K.toggle(ui.group("Tangents (A level)"), { label: "Mark tangents parallel (●) and perpendicular (■) to the initial line", value: false, on: v => P.showTan = v });
const read = K.readout(ui.group("Numbers"), [["pt", "Arm now"], ["xy", "Cartesian (x, y)"], ["A", "Area ½∫r² dθ"], ["S", "Sum of N sectors"]]);
function showCtl() { C.b.el.style.display = P.curve === "limacon" ? "" : "none"; C.n.el.style.display = P.curve === "rose" ? "" : "none"; C.showTan.el.parentNode.style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (o.showTan && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["a", "b", "n", "speed", "al", "be", "N"]) C[k].set(P[k]); for (const k of ["curve", "showArea", "showSec", "showTan"]) C[k].set(P[k]); th = 0; showCtl(); }

const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "r against θ (dashed: where f(θ) < 0, not drawn)", xLabel: "θ (degrees)", yLabel: "r" });
const chB = K.chart(ui.dock, { title: "Sector sum approaching the area", xLabel: "number of sectors N", yLabel: "area" });
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  const R = CURVES[P.curve].range; let rmax = 0.5; for (let i = 0; i <= 720; i++) rmax = Math.max(rmax, rOf(P, R * i / 720));
  const u = Math.min(w, h) * 0.44 / rmax, ox = w / 2 - (P.curve === "cardioid" || P.curve === "circle" || P.curve === "limacon" ? rmax * u * 0.35 : 0), oy = h / 2, S = (r, t) => [ox + r * Math.cos(t) * u, oy - r * Math.sin(t) * u];
  // polar grid: circles and rays every 30°
  c.strokeStyle = "#16203a"; const step = rmax > 4 ? 1 : 0.5; for (let r = step; r <= rmax * 1.05; r += step) { c.beginPath(); c.arc(ox, oy, r * u, 0, 6.3); c.stroke(); }
  for (let k = 0; k < 12; k++) { const [x, y] = S(rmax * 1.05, k * Math.PI / 6); c.beginPath(); c.moveTo(ox, oy); c.lineTo(x, y); c.stroke(); TX(c, (k * 30) + "°", ox + (rmax * 1.12) * u * Math.cos(k * Math.PI / 6), oy - (rmax * 1.12) * u * Math.sin(k * Math.PI / 6) + 4, "#5d6e93", "center", "10px"); }
  c.strokeStyle = "#5d6e93"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + rmax * 1.1 * u, oy); c.stroke(); c.lineWidth = 1; TX(c, "initial line", ox + rmax * 1.1 * u, oy + 16, "#8fa0bf", "right", "11px"); TX(c, "O", ox - 12, oy + 14, "#fff");
  // the area and its sectors
  if (P.showArea) {
    const a = rad(P.al), b = rad(P.be);
    c.fillStyle = "rgba(90,209,255,.2)"; c.beginPath(); c.moveTo(ox, oy); for (let i = 0; i <= 400; i++) { const t = a + (b - a) * i / 400, r = Math.max(0, rOf(P, t)), [x, y] = S(r, t); c.lineTo(x, y); } c.closePath(); c.fill();
    if (P.showSec) { const hh = (b - a) / P.N; c.strokeStyle = "rgba(255,230,109,.7)"; c.fillStyle = "rgba(255,230,109,.12)"; for (let i = 0; i < P.N; i++) { const r = Math.max(0, rOf(P, a + (i + 0.5) * hh)); c.beginPath(); c.moveTo(ox, oy); c.arc(ox, oy, r * u, -(a + i * hh), -(a + (i + 1) * hh), true); c.closePath(); c.fill(); c.stroke(); } }
  }
  // the curve itself, drawn up to the arm's current angle
  c.strokeStyle = "#ffb454"; c.lineWidth = 2.6; c.beginPath(); let pen = false; for (let i = 0; i <= 1500; i++) { const t = R * i / 1500; if (t > th) break; const r = rOf(P, t); if (r < 0) { pen = false; continue; } const [x, y] = S(r, t); pen ? c.lineTo(x, y) : c.moveTo(x, y); pen = true; } c.stroke(); c.lineWidth = 1;
  const r = rOf(P, th), [ax, ay] = S(Math.max(0, r), th); c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ax, ay); c.stroke(); c.lineWidth = 1; c.fillStyle = r >= 0 ? "#fff" : "#ff6b81"; c.beginPath(); c.arc(ax, ay, 5, 0, 6.3); c.fill();
  c.strokeStyle = "#ffe66d"; c.beginPath(); c.arc(ox, oy, 26, 0, -(th % (2 * Math.PI)), true); c.stroke();
  if (P.showTan && ui.level === "adv") for (const q of tangents(P)) { const [x, y] = [ox + q.p[0] * u, oy - q.p[1] * u]; c.fillStyle = q.kind === "par" ? "#7ee787" : "#ffe66d"; if (q.kind === "par") { c.beginPath(); c.arc(x, y, 6, 0, 6.3); c.fill(); c.strokeStyle = "#7ee787"; c.beginPath(); c.moveTo(x - 40, y); c.lineTo(x + 40, y); c.stroke(); } else { c.fillRect(x - 5, y - 5, 10, 10); c.strokeStyle = "#ffe66d"; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x, y + 40); c.stroke(); } }
  ui.hud(`θ = ${(th * 180 / Math.PI).toFixed(0)}°  (${th.toFixed(3)} rad)<br>r = ${r >= 0 ? r.toFixed(3) : "negative: not drawn"}`);
}
function panels() {
  const r = rOf(P, th); read.set("pt", `(${r >= 0 ? r.toFixed(3) : "–"}, ${(th * 180 / Math.PI).toFixed(0)}°)`); read.set("xy", r >= 0 ? `(${(r * Math.cos(th)).toFixed(3)}, ${(r * Math.sin(th)).toFixed(3)})` : "–");
  const a = rad(P.al), b = rad(P.be), A = area(P, a, b); read.set("A", A.toFixed(5)); read.set("S", sectorSum(P, a, b, P.N).toFixed(5));
  const R = CURVES[P.curve].range, pos = [], neg = []; for (let i = 0; i <= 360; i++) { const t = R * i / 360, v = rOf(P, t); (v >= 0 ? pos : neg).push([t * 180 / Math.PI, v]); }
  chA.draw([{ pts: pos.length ? (() => { const o = []; for (let i = 0; i <= 360; i++) { const t = R * i / 360, v = rOf(P, t); o.push([t * 180 / Math.PI, v >= 0 ? v : NaN]); } return o; })() : [], color: K.cssVar("--s1"), label: "r = f(θ)" }, { pts: (() => { const o = []; for (let i = 0; i <= 360; i++) { const t = R * i / 360; o.push([t * 180 / Math.PI, P.curve === "lemn" ? NaN : CURVES[P.curve].f(t, P)]); } return o; })(), color: K.cssVar("--muted"), dash: [3, 4] }], { hlines: [{ y: 0 }], vlines: [{ x: th * 180 / Math.PI }] });
  const S = []; for (let N = 1; N <= 60; N++) S.push([N, sectorSum(P, a, b, N)]); chB.draw([{ pts: S, color: K.cssVar("--s5"), label: "sector sum" }, { pts: S, type: "dots", r: 2, color: K.cssVar("--s5") }], { hlines: [{ y: A, color: K.cssVar("--s2"), label: "½∫r² dθ" }], vlines: [{ x: P.N }] });
}
let frame = 0;
ui.run(dt => { th += dt * P.speed * 0.9; if (th > CURVES[P.curve].range + 1) th = 0; }, () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = () => showCtl();
set({});
ui.tip("The white arm turns through θ and stretches to length r. Shade an area to see it split into thin sectors.", 7000);
