/* =====================================================================
   LINES AND PLANES IN 3D
   LINE:  r = a + λb   (a point a, direction b, parameter λ)
   PLANE: r·n = p      (n is a normal: perpendicular to the plane)
          or r = a + λb + μc  (two directions in the plane; n = b × c)
   SCALAR PRODUCT a·b = |a||b| cos θ gives angles:
     between two lines: the angle between their directions
     between a line and a plane: 90° minus the angle between b and n
     between two planes: the angle between their normals
   Two lines in 3D can be PARALLEL, INTERSECT, or be SKEW (neither).
   SHORTEST DISTANCES (A level):
     point Q to the plane r·n = p:   |Q·n − p| / |n|
     between skew lines: along the common perpendicular, direction
     n = b₁ × b₂, distance |(a₂ − a₁)·n| / |n|
   ===================================================================== */
// ---------------- 1. Vector tools ----------------
const add = (u, v) => u.map((x, i) => x + v[i]), sub = (u, v) => u.map((x, i) => x - v[i]), mul = (k, u) => u.map(x => k * x);
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const len = u => Math.sqrt(dot(u, u)), unit = u => mul(1 / (len(u) || 1), u);
const deg = t => t * 180 / Math.PI, f2 = v => (Math.abs(v) < 5e-4 ? 0 : +v.toFixed(3));
const vs = u => `(${u.map(f2).join(", ")})`;
// closest points of two lines r = a1 + λd1 and r = a2 + μd2
function closest(a1, d1, a2, d2) {
  const w = sub(a1, a2), A = dot(d1, d1), B = dot(d1, d2), Cc = dot(d2, d2), D = dot(d1, w), E = dot(d2, w), den = A * Cc - B * B;
  if (Math.abs(den) < 1e-9) { const mu = E / Cc; const p2 = add(a2, mul(mu, d2)); return { parallel: true, p1: a1, p2, lam: 0, mu, dist: len(sub(a1, p2)) }; }
  const lam = (B * E - Cc * D) / den, mu = (A * E - B * D) / den, p1 = add(a1, mul(lam, d1)), p2 = add(a2, mul(mu, d2));
  return { parallel: false, p1, p2, lam, mu, dist: len(sub(p1, p2)) };
}
const angleLines = (d1, d2) => deg(Math.acos(Math.min(1, Math.abs(dot(d1, d2)) / (len(d1) * len(d2)))));

// ---------------- 2. State ----------------
const DEF = { mode: "lines", a1: [1, -2, 0], d1: [1, 2, 0], a2: [0, 1, -1], d2: [2, -1, 1], lift: 1.5, n: [1, 1, 2], p: 4, Q: [3, 2, 3], la: [-3, 0, -2], ld: [2, 1, 2], n2: [1, -2, 1], p2: 0, yaw: -0.7, pitch: 0.45, spin: true, showPerp: true };
const P = JSON.parse(JSON.stringify(DEF));
// line 2 is lifted by "lift" along z; with lift = 0 the two lines meet (they are built through a common point)
const line2a = () => add(P.a2, [0, 0, P.lift]);

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Lines and Planes in 3D", subject: "Further Mathematics",
  blurb: "Turn a 3D scene with your mouse: skew, parallel and intersecting lines, where a line meets a plane, the line where two planes meet, angles from the scalar product and shortest distances",
  reset: () => set({ mode: P.mode }),
  levels: { std: "AS Further Maths (8FM0)", adv: "A level Further Maths (9FM0)", specs: {
    std: "Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 4, vectors: vector and Cartesian equations of lines, the scalar product and angles between lines, intersecting, parallel and skew lines; vector and Cartesian equations of planes, the angle between a line and a plane and between two planes; the intersection of a line and a plane; perpendicular distance from a point to a plane.",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 4: the vector product a × b as a normal, the line of intersection of two planes, the shortest distance between two skew lines (along the common perpendicular) and from a point to a line, and the reflection of a point in a plane." } },
  missions: [
    { title: "Do they meet?", q: "Two lines with the 'lift' slider at 0. Do they intersect? Now lift line 2 by 1.5. Are they parallel? What are they?", hint: "At lift 0 they meet at one point. Lifted, their directions are still not parallel, but they never meet: they are SKEW. Skew lines only exist in 3D; in a plane, non-parallel lines always cross.", setup: () => set({ mode: "lines", lift: 0 }) },
    { title: "Angle between two lines", q: "Find the angle between the lines from their directions b₁ = (1, 2, 0) and b₂ = (2, −1, 1). Does lifting line 2 change the angle?", hint: "b₁·b₂ = 2 − 2 + 0 = 0, so they are perpendicular: 90°. The angle depends only on the directions, so lifting does not change it.", setup: () => set({ mode: "lines" }) },
    { lvl: "adv", title: "Shortest distance between skew lines", q: "Drag the lift slider. How does the shortest distance change? Which direction is the common perpendicular?", hint: "It is along n = b₁ × b₂ = (2, −1, −5); distance = |(a₂ − a₁)·n|/|n|, which grows in proportion to the lift. The common perpendicular is at right angles to BOTH lines.", setup: () => set({ mode: "lines", lift: 2, adv: true }) },
    { title: "Where a line meets a plane", q: "The line r = (−3, 0, −2) + λ(2, 1, 2) and the plane x + y + 2z = 4. Find λ at the meeting point, and the point itself.", hint: "Substitute: (−3 + 2λ) + λ + 2(−2 + 2λ) = 4, so 7λ − 7 = 4 and λ = 11/7. The point is (1/7, 11/7, 8/7).", setup: () => set({ mode: "plane" }) },
    { title: "Angle between a line and a plane", q: "Use the scalar product to find the angle between the line and the plane. Why do we subtract from 90°?", hint: "cos φ = (b·n)/(|b||n|) = 7/(3√6) gives φ = 17.7° between b and the NORMAL; the angle with the plane itself is 90° − 17.7° = 72.3°.", setup: () => set({ mode: "plane" }) },
    { title: "Distance from a point to a plane", q: "Point Q = (3, 2, 3). Find its perpendicular distance from x + y + 2z = 4. Drag Q's height and watch.", hint: "|Q·n − p|/|n| = |3 + 2 + 6 − 4|/√6 = 7/√6 = 2.86. The foot of the perpendicular is Q − (7/6)n.", setup: () => set({ mode: "plane" }) },
    { lvl: "adv", title: "Two planes meet in a line", q: "x + y + 2z = 4 and x − 2y + z = 0. What is the direction of their line of intersection? What is the angle between the planes?", hint: "Direction n₁ × n₂ = (5, 1, −3) (perpendicular to both normals). Angle: cos θ = n₁·n₂/(|n₁||n₂|) = 1/6, θ = 80.4°.", setup: () => set({ mode: "planes" }) },
  ],
  batch: [
    { title: "Skew distance and lift (A level)", question: "Lift line 2 by h along z. How does the shortest distance between the lines change?", how: "Exact calculation for each lift.", xLabel: "lift h", yLabel: "shortest distance", xs: [0, 0.5, 1, 1.5, 2, 3, 4], reps: 1, yMin: 0, theory: h => Math.abs(h * unit(cross(DEF.d1, DEF.d2))[2]), theoryLabel: "|h k·n̂|", run: h => closest(DEF.a1, DEF.d1, add(DEF.a2, [0, 0, h]), DEF.d2).dist, note: "Proportional to h: only the part of the lift along the common perpendicular n̂ counts. Here n̂ = (2, −1, −5)/√30, so the distance is 5h/√30 = 0.913h." },
    { title: "Angle between random directions", question: "Two directions in space chosen at random. What is the angle between them, on average?", how: "Each run: the mean angle (0° to 180°) between 50 pairs of random unit vectors.", yLabel: "mean angle (°)", reps: 300, bins: 24, theory: 90, theoryLabel: "90°", run: (x, r) => { let s = 0; const ru = () => { const z = 2 * r() - 1, t = 2 * Math.PI * r(), q = Math.sqrt(1 - z * z); return [q * Math.cos(t), q * Math.sin(t), z]; }; for (let i = 0; i < 50; i++) s += deg(Math.acos(dot(ru(), ru()))); return s / 50; }, note: "The mean is 90°, but angles near 90° are far more common than near 0° or 180° (the density is ½ sin θ): two random directions in 3D are usually close to perpendicular." },
    { title: "Random points: distance to a plane", question: "Random points in the cube −3 ≤ x, y, z ≤ 3: how far are they from the plane z = 0 on average?", how: "Each run: the mean |Q·n − p|/|n| for 100 random points, with n = (0, 0, 1), p = 0.", yLabel: "mean distance", reps: 300, bins: 24, theory: 1.5, theoryLabel: "1.5", run: (x, r) => { let s = 0; for (let i = 0; i < 100; i++) { const Q = [6 * r() - 3, 6 * r() - 3, 6 * r() - 3]; s += Math.abs(dot(Q, [0, 0, 1])) / 1; } return s / 100; }, note: "The distance is just |z|, uniform on 0 to 3, with mean 1.5. The formula |Q·n − p|/|n| works for any plane, tilted or not." },
    { title: "Formula against a search", question: "Is |Q·n − p|/|n| really the SHORTEST distance from Q to the plane? Compare with the smallest distance found by trying many points of the plane.", how: "Each run: a random point and the plane x + y + 2z = 4; a search over 20 000 points of the plane; records (search − formula).", yLabel: "search − formula", reps: 100, bins: 20, theory: 0, theoryLabel: "never negative", run: (x, r) => { const n = [1, 1, 2], Q = [6 * r() - 3, 6 * r() - 3, 6 * r() - 3], f = Math.abs(dot(Q, n) - 4) / len(n), u = unit([1, -1, 0]), v = unit(cross(n, u)), foot = sub(Q, mul((dot(Q, n) - 4) / dot(n, n), n)); let best = Infinity; for (let i = 0; i < 20000; i++) { const pt = add(foot, add(mul(4 * r() - 2, u), mul(4 * r() - 2, v))); best = Math.min(best, len(sub(pt, Q))); } return best - f; }, note: "Always zero or slightly positive: no point of the plane is closer than the foot of the perpendicular." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP4", text: "Line r = a + λb; Cartesian (x − a₁)/b₁ = (y − a₂)/b₂ = (z − a₃)/b₃. Two lines intersect if values of λ and μ satisfy all three component equations; otherwise (and not parallel) they are skew." },
      { lvl: "std", tag: "CP4", text: "a·b = a₁b₁ + a₂b₂ + a₃b₃ = |a||b| cos θ. Perpendicular ⇔ a·b = 0. Angle between lines: use their directions (take the acute angle)." },
      { lvl: "std", tag: "CP4", text: "Plane r·n = p, i.e. n₁x + n₂y + n₃z = p. Line meets plane: substitute the line into the plane to find λ. Angle between line and plane = 90° − angle between b and n." },
      { lvl: "std", tag: "CP4", text: "Perpendicular distance from (x₀, y₀, z₀) to n₁x + n₂y + n₃z = p: |n₁x₀ + n₂y₀ + n₃z₀ − p| / √(n₁² + n₂² + n₃²)." },
      { lvl: "adv", tag: "CP4", text: "a × b is perpendicular to both a and b, with |a × b| = |a||b| sin θ. Normal of the plane containing b and c: b × c. Line of intersection of two planes: direction n₁ × n₂." },
      { lvl: "adv", tag: "CP4", text: "Shortest distance between skew lines r = a₁ + λb₁, r = a₂ + μb₂: |(a₂ − a₁)·(b₁ × b₂)| / |b₁ × b₂|." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Find the acute angle between the lines with directions (1, 2, 2) and (2, −1, 2).", ans: "<ul><li>dot product 2 − 2 + 4 = 4</li><li>|b₁| = 3, |b₂| = 3</li><li>cos θ = 4/9, θ = 63.6°</li></ul>" },
      { lvl: "std", marks: 4, q: "Find where the line r = (−3, 0, −2) + λ(2, 1, 2) meets the plane x + y + 2z = 4.", ans: "<ul><li>(−3 + 2λ) + λ + 2(−2 + 2λ) = 4</li><li>7λ = 11, λ = 11/7</li><li>point (−3 + 22/7, 11/7, −2 + 22/7)</li><li>= (1/7, 11/7, 8/7)</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Find the perpendicular distance from Q${vs(P.Q)} to the plane ${P.n[0]}x + ${P.n[1]}y + ${P.n[2]}z = ${P.p}.`, ans: () => `<ul><li>|${P.n[0]}×${P.Q[0]} + ${P.n[1]}×${P.Q[1]} + ${P.n[2]}×${f2(P.Q[2])} − ${P.p}| ÷ √${dot(P.n, P.n)}</li><li>= ${f2(Math.abs(dot(P.Q, P.n) - P.p) / len(P.n))}</li></ul>` },
      { lvl: "adv", marks: 5, q: () => `Show that the lines r = ${vs(P.a1)} + λ${vs(P.d1)} and r = ${vs(line2a())} + μ${vs(P.d2)} are ${closest(P.a1, P.d1, line2a(), P.d2).dist < 1e-6 ? "intersecting" : "skew"}, and find the shortest distance between them.`, ans: () => { const n = cross(P.d1, P.d2), c = closest(P.a1, P.d1, line2a(), P.d2); return `<ul><li>directions not parallel (b₁ × b₂ = ${vs(n)} ≠ 0)</li><li>a₂ − a₁ = ${vs(sub(line2a(), P.a1))}</li><li>distance = |(a₂ − a₁)·n|/|n| = ${f2(Math.abs(dot(sub(line2a(), P.a1), n)))} ÷ ${f2(len(n))}</li><li>= ${f2(c.dist)}${c.dist < 1e-6 ? ", so they intersect" : " > 0, so they are skew"}</li></ul>`; } },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>A 3D view with x (red), y (green) and z (blue) axes. Drag to turn it; it turns slowly by itself unless you switch that off.</li><li>Lines are drawn from λ = −6 to 6; planes as a square patch around the point nearest the origin.</li><li>Shortest distances and intersections are worked out exactly from the formulae in the Revise tab, and the perpendicular segments are drawn.</li></ul>
<h3>Simplifications</h3><ul><li>Lines and planes are infinite; only a piece is drawn.</li><li>The view is an orthographic projection (no perspective), so parallel lines stay parallel on the screen; depth is shown by brightness.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Scene");
C.mode = K.seg(g, { value: "lines", options: [["lines", "two lines"], ["plane", "a line, a plane and a point"], ["planes", "two planes (A level)"]], on: v => set({ mode: v }) });
C.spin = K.toggle(g, { label: "Turn the view slowly (or drag it)", value: true, on: v => P.spin = v });
const gl = ui.group("Two lines"), gp = ui.group("Line, plane and point"), gq = ui.group("Two planes");
C.lift = K.slider(gl, { label: "Lift line 2 by h along z", min: -4, max: 4, step: 0.1, value: 1.5, fmt: v => v.toFixed(1), on: v => P.lift = v });
C.showPerp = K.toggle(gl, { label: "Show the common perpendicular (A level)", value: true, on: v => P.showPerp = v });
let rw = K.row(gl); K.btn(rw, "🎲 New directions", () => { const r = () => Math.round(Math.random() * 6 - 3); let d; do { d = [r(), r(), r()]; } while (len(d) === 0); P.d2 = d; do { d = [r(), r(), r()]; } while (len(d) === 0); P.d1 = d; }); K.btn(rw, "Make them parallel", () => { P.d2 = mul(-2, P.d1); });
C.p = K.slider(gp, { label: "Plane x + y + 2z = p", min: -8, max: 12, step: 0.5, value: 4, on: v => P.p = v });
C.Qz = K.slider(gp, { label: "Height of Q (z)", min: -4, max: 6, step: 0.1, value: 3, fmt: v => v.toFixed(1), on: v => P.Q[2] = v });
C.tilt = K.slider(gp, { label: "Line direction z-component", min: -3, max: 3, step: 0.25, value: 2, on: v => P.ld[2] = v });
C.p2 = K.slider(gq, { label: "Second plane x − 2y + z = p₂", min: -6, max: 6, step: 0.5, value: 0, on: v => P.p2 = v });
C.n2z = K.slider(gq, { label: "Tilt: z-component of n₂", min: -3, max: 3, step: 0.25, value: 1, on: v => P.n2[2] = v });
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gl.style.display = P.mode === "lines" ? "" : "none"; gp.style.display = P.mode === "plane" ? "" : "none"; gq.style.display = P.mode === "planes" ? "" : "none"; C.showPerp.el.style.display = ui.level === "adv" ? "" : "none"; C.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { const keep = { yaw: P.yaw, pitch: P.pitch }; Object.assign(P, JSON.parse(JSON.stringify(DEF)), keep, o); if ((P.mode === "planes" || o.adv) && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); C.mode.set(P.mode); C.lift.set(P.lift); C.p.set(P.p); C.Qz.set(P.Q[2]); C.tilt.set(P.ld[2]); C.p2.set(P.p2); C.n2z.set(P.n2[2]); C.spin.set(P.spin); C.showPerp.set(P.showPerp); showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
let dragStart = null;
K.pointer(cv.el, { down: p => dragStart = { x: p.x, y: p.y, yaw: P.yaw, pitch: P.pitch }, drag: p => { if (!dragStart) return; P.yaw = dragStart.yaw + (p.x - dragStart.x) * 0.01; P.pitch = K.clamp(dragStart.pitch + (p.y - dragStart.y) * 0.01, -1.4, 1.4); P.spin = false; C.spin.set(false); }, up: () => dragStart = null, hover: () => cv.el.style.cursor = "grab" });
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let proj, depth;
function camera(w, h) { const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), u = Math.min(w, h) / 15; proj = q => { const x = q[0] * cy - q[1] * sy, y = q[0] * sy + q[1] * cy, z = q[2]; return [w / 2 + x * u, h / 2 - (z * cp - y * sp) * u]; }; depth = q => { const y = q[0] * Math.sin(P.yaw) + q[1] * Math.cos(P.yaw); return y * Math.cos(P.pitch) + q[2] * Math.sin(P.pitch); }; }
function seg(c, a, b, col, w = 2, dash) { const [x1, y1] = proj(a), [x2, y2] = proj(b); c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); c.lineWidth = 1; }
function dot3(c, q, col, label, r = 5) { const [x, y] = proj(q); c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); if (label) TX(c, label, x + 8, y - 8, col, "left", "600 12px"); }
function line(c, a, d, col, label) { seg(c, add(a, mul(-6, d)), add(a, mul(6, d)), col, 2.6); const [x, y] = proj(add(a, mul(5.5, d))); if (label) TX(c, label, x + 6, y, col, "left", "600 12px"); }
function plane(c, n, p, col) { const foot = mul(p / dot(n, n), n), u = unit(Math.abs(n[2]) < 0.9 * len(n) ? cross(n, [0, 0, 1]) : cross(n, [1, 0, 0])), v = unit(cross(n, u)), S = 5; c.fillStyle = col; c.beginPath(); [[-S, -S], [S, -S], [S, S], [-S, S]].forEach(([a, b], i) => { const [x, y] = proj(add(foot, add(mul(a, u), mul(b, v)))); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fill(); c.strokeStyle = col.replace(/[\d.]+\)$/, ".5)"); for (let k = -S; k <= S; k += 1) { seg(c, add(foot, add(mul(k, u), mul(-S, v))), add(foot, add(mul(k, u), mul(S, v))), c.strokeStyle, 0.6); seg(c, add(foot, add(mul(-S, u), mul(k, v))), add(foot, add(mul(S, u), mul(k, v))), c.strokeStyle, 0.6); } }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (P.spin && ui.playing) P.yaw += dt * 0.15; camera(w, h);
  for (const [e, col, nm] of [[[1, 0, 0], "#ff6b6b", "x"], [[0, 1, 0], "#3ddc84", "y"], [[0, 0, 1], "#5ad1ff", "z"]]) { seg(c, mul(-6, e), mul(6, e), col + "55", 1); const [x, y] = proj(mul(6.3, e)); TX(c, nm, x, y, col, "center", "600 13px"); for (let k = -5; k <= 5; k++) if (k) dot3(c, mul(k, e), col + "66", "", 1.5); }
  dot3(c, [0, 0, 0], "#8fa0bf", "O", 3);
  if (P.mode === "lines") {
    const a2 = line2a(), cl = closest(P.a1, P.d1, a2, P.d2);
    line(c, P.a1, P.d1, "#ffb454", "line 1"); line(c, a2, P.d2, "#c4a1ff", "line 2");
    if (cl.dist < 1e-6) dot3(c, cl.p1, "#7ee787", "meet at " + vs(cl.p1), 7);
    else if (ui.level === "adv" && P.showPerp) { seg(c, cl.p1, cl.p2, "#7ee787", 2.5, [5, 4]); dot3(c, cl.p1, "#7ee787"); dot3(c, cl.p2, "#7ee787"); const m = mul(0.5, add(cl.p1, cl.p2)), [x, y] = proj(m); TX(c, `shortest distance ${f2(cl.dist)}`, x + 10, y, "#7ee787", "left", "600 12px"); }
    dot3(c, P.a1, "#ffb454", "a₁"); dot3(c, a2, "#c4a1ff", "a₂");
    ui.hud(`<b>${cl.parallel ? (cl.dist < 1e-6 ? "the same line" : "parallel") : cl.dist < 1e-6 ? "intersecting" : "skew"}</b><br>angle between them ${f2(angleLines(P.d1, P.d2))}°${ui.level === "adv" ? "<br>shortest distance " + f2(cl.dist) : ""}`);
  } else if (P.mode === "plane") {
    plane(c, P.n, P.p, "rgba(90,209,255,.13)");
    const t = (P.p - dot(P.la, P.n)) / (dot(P.ld, P.n) || 1e-12), X = add(P.la, mul(t, P.ld)), parallel = Math.abs(dot(P.ld, P.n)) < 1e-9;
    line(c, P.la, P.ld, "#ffb454", "line"); if (!parallel) dot3(c, X, "#7ee787", "meets at " + vs(X), 6);
    const foot = sub(P.Q, mul((dot(P.Q, P.n) - P.p) / dot(P.n, P.n), P.n)); seg(c, P.Q, foot, "#ff7b9c", 2.5, [5, 4]); dot3(c, P.Q, "#ff7b9c", "Q " + vs(P.Q), 6); dot3(c, foot, "#ff7b9c", "foot", 4);
    const fn = mul(P.p / dot(P.n, P.n), P.n); seg(c, fn, add(fn, mul(1.2, P.n)), "#5ad1ff", 2.5); TX(c, "n", ...proj(add(fn, mul(1.3, P.n))), "#5ad1ff", "left", "600 12px");
    const phi = 90 - deg(Math.acos(Math.min(1, Math.abs(dot(P.ld, P.n)) / (len(P.ld) * len(P.n)))));
    ui.hud(`plane ${P.n[0]}x + ${P.n[1]}y + ${P.n[2]}z = ${P.p}<br>line meets it ${parallel ? "never (parallel)" : "at λ = " + f2(t)}; angle ${f2(phi)}°<br>distance from Q: ${f2(Math.abs(dot(P.Q, P.n) - P.p) / len(P.n))}`);
  } else {
    plane(c, P.n, P.p, "rgba(90,209,255,.13)"); plane(c, P.n2, P.p2, "rgba(255,180,84,.13)");
    const d = cross(P.n, P.n2); if (len(d) > 1e-9) { // a point on both planes: solve using the direction d
      const pt = add(mul(P.p, cross(P.n2, d)), mul(P.p2, cross(d, P.n))).map(v => v / dot(d, d)); line(c, pt, d, "#7ee787", "line of intersection"); }
    const ang = deg(Math.acos(Math.min(1, Math.abs(dot(P.n, P.n2)) / (len(P.n) * len(P.n2)))));
    ui.hud(`Π₁: ${P.n[0]}x + ${P.n[1]}y + ${P.n[2]}z = ${P.p}<br>Π₂: ${P.n2[0]}x ${P.n2[1] < 0 ? "−" : "+"} ${Math.abs(P.n2[1])}y + ${P.n2[2]}z = ${P.p2}<br>${len(d) < 1e-9 ? "parallel planes" : "meet in a line, direction " + vs(d)}; angle ${f2(ang)}°`);
  }
}
function panels() {
  if (P.mode === "lines") {
    const a2 = line2a(), cl = closest(P.a1, P.d1, a2, P.d2), n = cross(P.d1, P.d2); relabel(["Line 1", "Line 2", "b₁ · b₂ and angle", "b₁ × b₂ (common perpendicular)"]);
    read.set("a", `r = ${vs(P.a1)} + λ${vs(P.d1)}`); read.set("b", `r = ${vs(a2)} + μ${vs(P.d2)}`); read.set("c", `${f2(dot(P.d1, P.d2))}, ${f2(angleLines(P.d1, P.d2))}°`); read.set("d", vs(n));
    const D = []; for (let hh = -4; hh <= 4.001; hh += 0.1) D.push([hh, closest(P.a1, P.d1, add(P.a2, [0, 0, hh]), P.d2).dist]);
    chA.opts.title = "Shortest distance as line 2 is lifted"; chA.opts.xLabel = "lift h"; chA.opts.yLabel = "distance"; chA.draw([{ pts: D, color: K.cssVar("--s2"), label: "distance" }], { vlines: [{ x: P.lift }], yMin: 0 });
    const S = []; for (let l = -4; l <= 4.001; l += 0.1) { const p1 = add(P.a1, mul(l, P.d1)); S.push([l, len(sub(p1, add(a2, mul(dot(sub(p1, a2), P.d2) / dot(P.d2, P.d2), P.d2))))]); }
    chB.opts.title = "Distance from a point on line 1 (at λ) to line 2"; chB.opts.xLabel = "λ"; chB.opts.yLabel = "distance"; chB.draw([{ pts: S, color: K.cssVar("--s1"), label: "distance" }], { vlines: [{ x: cl.lam, label: "closest" }], yMin: 0 });
  } else if (P.mode === "plane") {
    const t = (P.p - dot(P.la, P.n)) / (dot(P.ld, P.n) || 1e-12); relabel(["Line", "Plane r·n = p", "Meets at λ, point", "Distance from Q"]);
    read.set("a", `r = ${vs(P.la)} + λ${vs(P.ld)}`); read.set("b", `r·${vs(P.n)} = ${P.p}`); read.set("c", Math.abs(dot(P.ld, P.n)) < 1e-9 ? "parallel: no meeting" : `λ = ${f2(t)}, ${vs(add(P.la, mul(t, P.ld)))}`); read.set("d", f2(Math.abs(dot(P.Q, P.n) - P.p) / len(P.n)));
    const D = []; for (let z = -4; z <= 6.001; z += 0.1) D.push([z, (dot([P.Q[0], P.Q[1], z], P.n) - P.p) / len(P.n)]);
    chA.opts.title = "Signed distance of Q from the plane as Q rises"; chA.opts.xLabel = "z of Q"; chA.opts.yLabel = "(Q·n − p)/|n|"; chA.draw([{ pts: D, color: K.cssVar("--s3"), label: "signed distance" }], { hlines: [{ y: 0 }], vlines: [{ x: P.Q[2] }] });
    const A = []; for (let z = -3; z <= 3.001; z += 0.05) { const d = [P.ld[0], P.ld[1], z]; A.push([z, 90 - deg(Math.acos(Math.min(1, Math.abs(dot(d, P.n)) / (len(d) * len(P.n)))))]); }
    chB.opts.title = "Angle between line and plane as the line tilts"; chB.opts.xLabel = "z-component of direction"; chB.opts.yLabel = "angle (°)"; chB.draw([{ pts: A, color: K.cssVar("--s1"), label: "angle" }], { vlines: [{ x: P.ld[2] }], yMin: 0, yMax: 90 });
  } else {
    const d = cross(P.n, P.n2); relabel(["n₁", "n₂", "Direction n₁ × n₂", "Angle between the planes"]); read.set("a", vs(P.n)); read.set("b", vs(P.n2)); read.set("c", vs(d)); read.set("d", f2(deg(Math.acos(Math.min(1, Math.abs(dot(P.n, P.n2)) / (len(P.n) * len(P.n2)))))) + "°");
    const A = []; for (let z = -3; z <= 3.001; z += 0.05) { const m = [P.n2[0], P.n2[1], z]; A.push([z, deg(Math.acos(Math.min(1, Math.abs(dot(P.n, m)) / (len(P.n) * len(m)))))]); }
    chA.opts.title = "Angle between the planes as Π₂ tilts"; chA.opts.xLabel = "z-component of n₂"; chA.opts.yLabel = "angle (°)"; chA.draw([{ pts: A, color: K.cssVar("--s1") }], { vlines: [{ x: P.n2[2] }], yMin: 0, yMax: 90 }); chB.opts.title = ""; chB.draw([]);
  }
}
let frame = 0;
ui.run(() => { }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "planes") set({}); showCtl(); };
set({});
ui.tip("Drag the scene to turn it. Lift line 2 to make the lines skew.", 7000);
