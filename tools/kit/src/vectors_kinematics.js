/* =====================================================================
   KINEMATICS AND VECTORS
   1. MOTION IN A STRAIGHT LINE. Displacement s, velocity v = ds/dt,
      acceleration a = dv/dt. On a velocity–time graph the GRADIENT is
      the acceleration and the AREA is the displacement (area below the
      axis is negative: the particle moving backwards).
      With constant acceleration the SUVAT equations hold:
        v = u + at,  s = ut + ½at²,  s = ½(u + v)t,  v² = u² + 2as,  s = vt − ½at²
      With variable acceleration use calculus: v = ds/dt, a = dv/dt,
      s = ∫ v dt, v = ∫ a dt.
   2. VECTORS: a = xi + yj. Add tip to tail; |a| = √(x² + y²); the
      direction is the angle tan⁻¹(y/x); a unit vector is a ÷ |a|.
   3. PROJECTILES (A level): r = (u cos θ) t i + ((u sin θ) t − ½gt²) j,
      v = dr/dt. Horizontal velocity stays constant; vertical velocity
      falls by g every second.
   ===================================================================== */
const G = 9.8;
const sg = v => (v < 0 ? "− " : "+ ") + Math.abs(+v.toFixed(2));   // "+ 3" or "− 2" for writing formulae
// ---------------- 1. Straight-line motion ----------------
// Two kinds: constant acceleration (u, a) or a cubic displacement s = pt³ + qt² + rt (variable acceleration)
function motion(Q, t) {
  if (Q.kind === "const") return { s: Q.u * t + 0.5 * Q.a * t * t, v: Q.u + Q.a * t, a: Q.a };
  return { s: Q.p * t ** 3 + Q.q * t * t + Q.r * t, v: 3 * Q.p * t * t + 2 * Q.q * t + Q.r, a: 6 * Q.p * t + 2 * Q.q };
}
// total distance travelled (adds up |ds|, so going backwards still counts)
function distance(Q, T) { let d = 0, prev = 0; const n = 2000; for (let i = 1; i <= n; i++) { const s = motion(Q, T * i / n).s; d += Math.abs(s - prev); prev = s; } return d; }
// times when v = 0 (the particle is instantaneously at rest)
function restTimes(Q, T) { const out = []; let pv = motion(Q, 0).v; for (let i = 1; i <= 2000; i++) { const t = T * i / 2000, v = motion(Q, t).v; if (pv * v < 0 || v === 0) out.push(t - T / 4000); pv = v; } return out; }

// ---------------- 2. State ----------------
const DEF = { mode: "line", kind: "const", u: 2, a: 1.5, p: 1, q: -6, r: 9, T: 6, ax: 3, ay: 1, bx: 1, by: 3, lam: 1, op: "add", speed: 20, angle: 45, h0: 0, showV: true, trail: true };
const P = Object.assign({}, DEF);
let t = 0, proj = null, dragV = null;
const projT = () => { const u = P.speed, th = P.angle * Math.PI / 180, vy = u * Math.sin(th); return (vy + Math.sqrt(vy * vy + 2 * G * P.h0)) / G; };
const projR = tt => { const u = P.speed, th = P.angle * Math.PI / 180; return { x: u * Math.cos(th) * tt, y: P.h0 + u * Math.sin(th) * tt - 0.5 * G * tt * tt, vx: u * Math.cos(th), vy: u * Math.sin(th) - G * tt }; };

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Kinematics and Vectors", subject: "Mathematics",
  blurb: "A particle on a line with live s–t and v–t graphs (gradients, areas, SUVAT, calculus), vectors you can drag, and projectiles described by vectors",
  reset: () => { t = 0; },
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Mechanics 7.1–7.4: displacement, velocity, acceleration, distance and speed; displacement–time and velocity–time graphs (gradient and area); the constant acceleration (SUVAT) formulae; variable acceleration using calculus. Pure 10: vectors in 2D, magnitude and direction, position vectors, adding and scaling.",
    adv: "Pearson Edexcel A level Mathematics (9MA0) Mechanics 7.4–7.5: kinematics in 2D with vectors (r, v = dr/dt, a = dv/dt), projectile motion, range, greatest height and time of flight; Pure 10: vectors in 3D (in context), unit vectors and the angle of a vector." } },
  missions: [
    { title: "Reading a velocity–time graph", q: "u = 2 m s⁻¹, a = 1.5 m s⁻². What is the gradient of the v–t graph? Shade the area up to t = 4 s. Check it equals the displacement.", hint: "The gradient is the acceleration, 1.5. Area = trapezium ½(2 + 8) × 4 = 20 m = s = ut + ½at² = 8 + 12.", setup: () => set({ mode: "line", kind: "const", u: 2, a: 1.5, T: 6 }) },
    { title: "Slowing down and turning back", q: "u = 8 m s⁻¹, a = −2 m s⁻². When does the particle stop? Where is it after 6 s? How far has it travelled?", hint: "v = 0 at t = 4 s (s = 16 m). After 6 s, s = 48 − 36 = 12 m, but it has travelled 16 + 4 = 20 m. Displacement and distance differ once it turns back.", setup: () => set({ mode: "line", kind: "const", u: 8, a: -2, T: 6 }) },
    { title: "Variable acceleration", q: "s = t³ − 6t² + 9t. Find when the particle is at rest. Where is the acceleration zero?", hint: "v = 3t² − 12t + 9 = 3(t − 1)(t − 3) = 0 at t = 1 s and t = 3 s. a = 6t − 12 = 0 at t = 2 s, where the v–t graph has its minimum. SUVAT does NOT apply: the acceleration changes.", setup: () => set({ mode: "line", kind: "cubic", p: 1, q: -6, r: 9, T: 4.5 }) },
    { title: "Adding vectors", q: "Drag the tips of a and b. Is a + b the same as b + a? Find |a + b| when a = 3i + j and b = i + 3j.", hint: "Yes: both routes reach the same point (the parallelogram). a + b = 4i + 4j, |a + b| = √32 = 5.66, at 45° to i.", setup: () => set({ mode: "vec", ax: 3, ay: 1, bx: 1, by: 3, op: "add" }) },
    { title: "Subtracting and the vector between two points", q: "Choose a − b. Show that it is the vector from the tip of b to the tip of a. What is AB if OA = a and OB = b?", hint: "a − b = a + (−b). From B to A: BA = a − b, so AB = b − a. The distance between the points is |b − a|.", setup: () => set({ mode: "vec", op: "sub" }) },
    { title: "Unit vectors and direction", q: "Make a = 3i + 4j. What is |a|? The unit vector? The angle with i?", hint: "|a| = 5. Unit vector â = (3i + 4j)/5 = 0.6i + 0.8j. Angle tan⁻¹(4/3) = 53.1° above i.", setup: () => set({ mode: "vec", ax: 3, ay: 4, op: "unit" }) },
    { lvl: "adv", title: "A projectile as a vector", q: "u = 20 m s⁻¹ at 45°. Watch r and v. Which component of v changes? Find the time of flight and the range.", hint: "Only the vertical component changes (by −9.8 each second); horizontal stays 14.1 m s⁻¹. Time 2u sin θ/g = 2.89 s, range u² sin 2θ/g = 40.8 m.", setup: () => set({ mode: "proj", speed: 20, angle: 45, h0: 0 }) },
    { lvl: "adv", title: "Which angle goes furthest?", q: "From ground level, compare 30°, 45° and 60° with the same speed. Then launch from a 20 m cliff: is 45° still best?", hint: "From the ground, 45° gives the greatest range, and 30° and 60° tie (sin 60° = sin 120°). From a cliff, a lower angle (about 40°) wins, because the projectile has longer to fall.", setup: () => set({ mode: "proj", speed: 20, angle: 30, h0: 0 }) },
  ],
  batch: [
    { title: "Step-by-step v. SUVAT", question: "Work out the position by adding v × Δt each step (as a computer does). How far is it from s = ut + ½at² after 6 s?", how: "u = 2, a = 1.5; the velocity at the start of each step is used. Exact calculation for each step size.", xLabel: "time step Δt (s)", yLabel: "SUVAT s − step-by-step s (m)", xs: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1], reps: 1, yMin: 0, theory: dt => 0.5 * 1.5 * 6 * dt, theoryLabel: "½ a t Δt", run: dt => { let s = 0, v = 2; const n = Math.round(6 / dt); for (let i = 0; i < n; i++) { s += v * dt; v += 1.5 * dt; } return 2 * 6 + 0.75 * 36 - s; }, note: "Using the velocity at the start of each step always lags behind: the error is ½atΔt, proportional to the step. That is why the exact formula (an integral) is better." },
    { title: "Range against angle (A level)", question: "With u = 20 m s⁻¹ from the ground, how does the range depend on the angle?", how: "A simulation with tiny time steps (0.001 s) until the projectile lands.", xLabel: "angle θ (°)", yLabel: "range (m)", xs: [10, 20, 30, 40, 45, 50, 60, 70, 80], reps: 1, yMin: 0, theory: th => 400 * Math.sin(2 * th * Math.PI / 180) / G, theoryLabel: "u² sin 2θ / g", run: th => { const r = th * Math.PI / 180; let x = 0, y = 0, vx = 20 * Math.cos(r), vy = 20 * Math.sin(r); const dt = 0.001; do { x += vx * dt; vy -= G * dt / 2; y += vy * dt; vy -= G * dt / 2; } while (y > 0); return x; }, note: "Symmetric about 45°: θ and 90° − θ give the same range. The simulation stops at the first step below the ground, so it overshoots by a few millimetres." },
    { title: "Throws are never identical (A level)", question: "If the launch speed varies by 5% (SD) around 20 m s⁻¹ at 45°, what is the average range?", how: "Each run: one throw with a random speed.", yLabel: "range (m)", reps: 400, bins: 24, theory: 400 * 1.0025 / G, theoryLabel: "u²(1 + 0.05²)/g", run: (x, r) => { const u = 20 * (1 + 0.05 * r.gauss()); return u * u / G; }, note: "The range depends on u², so a 5% spread in speed gives about a 10% spread in range, and the average is very slightly more than for the average speed." },
    { title: "Adding two random unit vectors", question: "Two unit vectors point in random directions. What is |a + b| on average?", how: "Each run: the mean of |a + b| over 100 random pairs.", yLabel: "mean |a + b|", reps: 300, bins: 24, theory: 4 / Math.PI, theoryLabel: "4/π", run: (x, r) => { let s = 0; for (let i = 0; i < 100; i++) { const p = 2 * Math.PI * r(), q = 2 * Math.PI * r(); s += Math.hypot(Math.cos(p) + Math.cos(q), Math.sin(p) + Math.sin(q)); } return s / 100; }, note: "|a + b| = 2|cos(φ/2)| where φ is the angle between them; its average is 4/π ≈ 1.27, not 2 (only if they point the same way) and not 0." },
    { title: "Distance against displacement", question: "For s = t³ − 6t² + 9t, how do the distance travelled and the displacement compare as time goes on?", how: "Exact calculation; the plotted value is distance − |displacement|.", xLabel: "time T (s)", yLabel: "distance − |displacement| (m)", xs: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], reps: 1, yMin: 0, theory: T => { const s = x => x ** 3 - 6 * x * x + 9 * x; const d = T <= 1 ? s(T) : T <= 3 ? s(1) + (s(1) - s(T)) : s(1) + (s(1) - s(3)) + (s(T) - s(3)); return d - Math.abs(s(T)); }, theoryLabel: "split at the turning points t = 1, 3", run: T => distance(Object.assign({}, DEF, { kind: "cubic" }), T) - Math.abs(motion(Object.assign({}, DEF, { kind: "cubic" }), T).s), note: "Zero until the particle first turns back at t = 1 s. To find a distance, split the time at each instant the velocity is zero." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "M7.2", text: "Gradient of a displacement–time graph = velocity. Gradient of a velocity–time graph = acceleration; area between it and the t-axis = displacement (negative below the axis)." },
      { lvl: "std", tag: "M7.3", text: "Constant acceleration: v = u + at, s = ut + ½at², s = ½(u + v)t, v² = u² + 2as, s = vt − ½at². Choose the one without the quantity you don't know and don't want." },
      { lvl: "std", tag: "M7.4", text: "Variable acceleration: v = ds/dt, a = dv/dt; s = ∫ v dt, v = ∫ a dt (+ c, found from a starting condition). The particle is at rest when v = 0. Distance: split the time where v = 0." },
      { lvl: "std", tag: "P10", text: "a = xi + yj: |a| = √(x² + y²), direction θ = tan⁻¹(y/x) from i. Add or subtract component by component. Unit vector â = a/|a|. AB = b − a." },
      { lvl: "adv", tag: "M7.5", text: "Projectile from the ground at speed u and angle θ: time of flight 2u sin θ/g, greatest height u² sin²θ/(2g), range u² sin 2θ/g (greatest at 45°). Horizontal velocity is constant; vertical acceleration is −g." },
      { lvl: "adv", tag: "M7.4", text: "In 2D: r = xi + yj, v = dr/dt, a = dv/dt (differentiate each component). Speed = |v|; direction of motion from the components of v." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "A car accelerates uniformly from 4 m s⁻¹ to 16 m s⁻¹ in 8 s. Find the acceleration and the distance travelled.", ans: "<ul><li>a = (16 − 4)/8 = 1.5 m s⁻²</li><li>s = ½(4 + 16) × 8</li><li>= 80 m</li></ul>" },
      { lvl: "std", marks: 4, q: "A particle moves with s = t³ − 6t² + 9t. Find the times when it is at rest and its acceleration at those times.", ans: "<ul><li>v = 3t² − 12t + 9</li><li>= 3(t − 1)(t − 3) = 0: t = 1 s and t = 3 s</li><li>a = 6t − 12</li><li>a = −6 m s⁻² at t = 1 and +6 m s⁻² at t = 3</li></ul>" },
      { lvl: "std", marks: 3, q: () => `a = ${P.ax}i + ${P.ay}j and b = ${P.bx}i + ${P.by}j. Find a + b and its magnitude, and the angle a + b makes with i.`, ans: () => { const x = P.ax + P.bx, y = P.ay + P.by; return `<ul><li>a + b = ${x}i + ${y}j</li><li>|a + b| = √(${x}² + ${y}²) = ${Math.hypot(x, y).toFixed(3)}</li><li>angle = tan⁻¹(${y}/${x}) = ${(Math.atan2(y, x) * 180 / Math.PI).toFixed(1)}°</li></ul>`; } },
      { lvl: "adv", marks: 4, q: () => `A ball is kicked from the ground at ${P.speed} m s⁻¹ at ${P.angle}° above the horizontal. Find the time of flight and the range (g = 9.8).`, ans: () => { const th = P.angle * Math.PI / 180, T = 2 * P.speed * Math.sin(th) / G; return `<ul><li>vertical: 0 = (${P.speed} sin ${P.angle}°)t − 4.9t²</li><li>t = ${T.toFixed(2)} s</li><li>horizontal: x = (${P.speed} cos ${P.angle}°) × ${T.toFixed(2)}</li><li>= ${(P.speed * Math.cos(th) * T).toFixed(1)} m</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "r = (3t)i + (8t − 2t²)j. Find v and the speed when t = 1.", ans: "<ul><li>v = dr/dt = 3i + (8 − 4t)j</li><li>at t = 1: v = 3i + 4j</li><li>speed = 5 m s⁻¹</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Motion on a line:</b> the particle follows the exact formulae; the graphs below are drawn from them. The shaded area under the v–t graph up to the current time is the displacement (blue above, red below the axis).</li><li><b>Vectors:</b> drag the tips of a and b on the grid (1 square = 1 unit).</li><li><b>Projectiles (A level):</b> r(t) is drawn with its velocity vector and components; the trail shows the path.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The object is a particle (no size, so no spinning).</li><li>No air resistance; g = 9.8 m s⁻² is constant and the ground is flat.</li><li>Positive direction to the right (or upwards); a negative velocity means moving the other way.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "line", options: [["line", "motion on a line"], ["vec", "vectors"], ["proj", "projectile (A level)"]], on: v => set({ mode: v }) });
const gl = ui.group("Motion on a line"), gv = ui.group("Vectors"), gp = ui.group("Projectile");
C.kind = K.seg(gl, { value: "const", options: [["const", "constant acceleration"], ["cubic", "s = pt³ + qt² + rt"]], on: v => { P.kind = v; showCtl(); t = 0; } });
C.u = K.slider(gl, { label: "Initial velocity u", min: -10, max: 15, step: 0.5, value: 2, unit: "m s⁻¹", on: v => { P.u = v; t = 0; } });
C.a = K.slider(gl, { label: "Acceleration a", min: -5, max: 5, step: 0.25, value: 1.5, unit: "m s⁻²", on: v => { P.a = v; t = 0; } });
C.p = K.slider(gl, { label: "p", min: -2, max: 2, step: 0.1, value: 1, fmt: v => v.toFixed(1), on: v => { P.p = v; t = 0; } });
C.q = K.slider(gl, { label: "q", min: -10, max: 10, step: 0.5, value: -6, fmt: v => v.toFixed(1), on: v => { P.q = v; t = 0; } });
C.r = K.slider(gl, { label: "r", min: -15, max: 15, step: 0.5, value: 9, fmt: v => v.toFixed(1), on: v => { P.r = v; t = 0; } });
C.T = K.slider(gl, { label: "Run for", min: 1, max: 12, step: 0.5, value: 6, unit: "s", on: v => { P.T = v; t = Math.min(t, v); } });
C.op = K.seg(gv, { value: "add", options: [["add", "a + b"], ["sub", "a − b"], ["scale", "λa"], ["unit", "unit vector â"]], on: v => P.op = v });
C.lam = K.slider(gv, { label: "λ", min: -3, max: 3, step: 0.25, value: 1, fmt: v => v.toFixed(2), on: v => P.lam = v });
K.note(gv, "Drag the tips of a (blue) and b (orange) on the grid.");
C.speed = K.slider(gp, { label: "Launch speed u", min: 2, max: 40, step: 0.5, value: 20, unit: "m s⁻¹", on: v => { P.speed = v; t = 0; } });
C.angle = K.slider(gp, { label: "Angle θ", min: 0, max: 90, step: 1, value: 45, unit: "°", on: v => { P.angle = v; t = 0; } });
C.h0 = K.slider(gp, { label: "Launch height", min: 0, max: 40, step: 1, value: 0, unit: "m", on: v => { P.h0 = v; t = 0; } });
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() {
  gl.style.display = P.mode === "line" ? "" : "none"; gv.style.display = P.mode === "vec" ? "" : "none"; gp.style.display = P.mode === "proj" ? "" : "none";
  C.u.el.style.display = C.a.el.style.display = P.kind === "const" ? "" : "none"; for (const k of ["p", "q", "r"]) C[k].el.style.display = P.kind === "cubic" ? "" : "none";
  C.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none";
}
function set(o) { Object.assign(P, DEF, o); if (P.mode === "proj" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["u", "a", "p", "q", "r", "T", "lam", "speed", "angle", "h0"]) C[k].set(P[k]); for (const k of ["mode", "kind", "op"]) C[k].set(P[k]); t = 0; showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrow(c, x0, y0, x1, y1, col, w = 2.5, label) { const ang = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); c.strokeStyle = c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (L > 6) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 11 * Math.cos(ang - 0.4), y1 - 11 * Math.sin(ang - 0.4)); c.lineTo(x1 - 11 * Math.cos(ang + 0.4), y1 - 11 * Math.sin(ang + 0.4)); c.closePath(); c.fill(); } c.lineWidth = 1; if (label) TX(c, label, (x0 + x1) / 2 + 8, (y0 + y1) / 2 - 8, col, "left", "600 13px"); }
// vector grid: 1 unit = U pixels, origin O
let VG = null;
function vgrid() { const w = cv.w, h = cv.h, U = Math.min(w / 16, h / 11); return { U, ox: w / 2 - 2 * U, oy: h / 2 + 2 * U }; }
const vx = (x, y) => [VG.ox + x * VG.U, VG.oy - y * VG.U];
K.pointer(cv.el, {
  down: p => { if (P.mode !== "vec" || !VG) return; const [ax, ay] = vx(P.ax, P.ay), [bx, by] = vx(P.bx, P.by); dragV = Math.hypot(p.x - ax, p.y - ay) < Math.hypot(p.x - bx, p.y - by) ? "a" : "b"; dragVec(p); },
  drag: p => dragVec(p), up: () => dragV = null, hover: p => cv.el.style.cursor = P.mode === "vec" ? "pointer" : "default"
});
function dragVec(p) { if (!dragV) return; const x = Math.round((p.x - VG.ox) / VG.U * 2) / 2, y = Math.round((VG.oy - p.y) / VG.U * 2) / 2; P[dragV + "x"] = K.clamp(x, -6, 9); P[dragV + "y"] = K.clamp(y, -4, 6); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "line") {
    // a track with distance markers; the particle, its velocity arrow and its trail of positions every 0.5 s
    let lo = 0, hi = 0; for (let i = 0; i <= 200; i++) { const s = motion(P, P.T * i / 200).s; lo = Math.min(lo, s); hi = Math.max(hi, s); } const pad = Math.max(2, (hi - lo) * 0.1); lo -= pad; hi += pad;
    const X = s => 60 + (s - lo) / (hi - lo) * (w - 120), y = h * 0.42;
    c.strokeStyle = "#3a4a6e"; c.lineWidth = 6; c.beginPath(); c.moveTo(40, y + 22); c.lineTo(w - 40, y + 22); c.stroke(); c.lineWidth = 1;
    const st = Math.pow(10, Math.floor(Math.log10((hi - lo) / 8))) * ((hi - lo) / Math.pow(10, Math.floor(Math.log10((hi - lo) / 8))) > 40 ? 5 : (hi - lo) / Math.pow(10, Math.floor(Math.log10((hi - lo) / 8))) > 16 ? 2 : 1);
    for (let k = Math.ceil(lo / st); k * st <= hi; k++) { const s = k * st; c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(X(s), y + 16); c.lineTo(X(s), y + 30); c.stroke(); TX(c, +s.toFixed(2) + (s === 0 ? " m (O)" : ""), X(s), y + 46, s === 0 ? "#fff" : "#8fa0bf", "center", "11px"); }
    for (let tt = 0; tt <= t + 1e-9; tt += 0.5) { const m = motion(P, tt); c.fillStyle = "rgba(255,180,84,.35)"; c.beginPath(); c.arc(X(m.s), y + 22, 3, 0, 6.3); c.fill(); }
    const m = motion(P, t); c.fillStyle = "#ffb454"; c.beginPath(); c.arc(X(m.s), y, 14, 0, 6.3); c.fill();
    if (Math.abs(m.v) > 0.01) arrow(c, X(m.s), y - 26, X(m.s) + m.v * 12, y - 26, "#7ee787", 3, "v"); if (Math.abs(m.a) > 0.01) arrow(c, X(m.s), y - 46, X(m.s) + m.a * 12, y - 46, "#ff7b9c", 2, "a");
    TX(c, `t = ${t.toFixed(2)} s   s = ${m.s.toFixed(2)} m   v = ${m.v.toFixed(2)} m s⁻¹   a = ${m.a.toFixed(2)} m s⁻²`, 30, 30, "#fff", "left", "600 14px");
    TX(c, P.kind === "const" ? `constant acceleration: v = ${P.u} ${sg(P.a)}t,  s = ${P.u}t ${sg(P.a / 2)}t²` : `s = ${P.p}t³ ${sg(P.q)}t² ${sg(P.r)}t,  v = ${+(3 * P.p).toFixed(2)}t² ${sg(2 * P.q)}t ${sg(P.r)},  a = ${+(6 * P.p).toFixed(2)}t ${sg(2 * P.q)}`, 30, 54, "#8fa0bf", "left", "12px");
    const rt = restTimes(P, P.T); TX(c, rt.length ? "at rest (v = 0) at t = " + rt.map(x => x.toFixed(2)).join(", ") + " s" : "never at rest in this time", 30, h - 24, "#c9d4ea", "left", "12px");
    ui.hud(`distance travelled ${distance(P, t).toFixed(2)} m<br>displacement ${m.s.toFixed(2)} m`);
  } else if (P.mode === "vec") {
    VG = vgrid(); const { U, ox, oy } = VG;
    c.strokeStyle = "#16203a"; for (let x = ox % U; x < w; x += U) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = oy % U; y < h; y += U) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = "#3a4a6e"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, oy); c.lineTo(w, oy); c.moveTo(ox, 0); c.lineTo(ox, h); c.stroke(); c.lineWidth = 1; TX(c, "O", ox - 14, oy + 16, "#8fa0bf");
    arrow(c, ox, oy, ox + U, oy, "#8fa0bf", 1.5); TX(c, "i", ox + U / 2, oy + 16, "#8fa0bf"); arrow(c, ox, oy, ox, oy - U, "#8fa0bf", 1.5); TX(c, "j", ox - 14, oy - U / 2, "#8fa0bf");
    const [ax, ay] = vx(P.ax, P.ay), [bx, by] = vx(P.bx, P.by);
    if (P.op === "add") { const [sx, sy] = vx(P.ax + P.bx, P.ay + P.by); c.setLineDash([5, 4]); arrow(c, ax, ay, sx, sy, "rgba(255,180,84,.6)", 2); arrow(c, bx, by, sx, sy, "rgba(90,209,255,.6)", 2); c.setLineDash([]); arrow(c, ox, oy, sx, sy, "#7ee787", 3.5, "a + b"); }
    if (P.op === "sub") { const [sx, sy] = vx(P.ax - P.bx, P.ay - P.by); c.setLineDash([5, 4]); arrow(c, bx, by, ax, ay, "rgba(126,231,135,.8)", 2); c.setLineDash([]); arrow(c, ox, oy, sx, sy, "#7ee787", 3.5, "a − b"); }
    if (P.op === "scale") { const [sx, sy] = vx(P.lam * P.ax, P.lam * P.ay); arrow(c, ox, oy, sx, sy, "#7ee787", 5, "λa"); }
    if (P.op === "unit") { const m = Math.hypot(P.ax, P.ay) || 1, [sx, sy] = vx(P.ax / m, P.ay / m); arrow(c, ox, oy, sx, sy, "#7ee787", 5, "â"); c.strokeStyle = "rgba(126,231,135,.3)"; c.beginPath(); c.arc(ox, oy, U, 0, 6.3); c.stroke(); const ang = Math.atan2(P.ay, P.ax); c.strokeStyle = "#ffe66d"; c.beginPath(); c.arc(ox, oy, U * 0.6, -ang, 0, ang < 0 ? false : true); c.stroke(); TX(c, `θ = ${(ang * 180 / Math.PI).toFixed(1)}°`, ox + U * 0.7, oy - 8, "#ffe66d"); }
    arrow(c, ox, oy, ax, ay, "#5ad1ff", 3, "a"); if (P.op === "add" || P.op === "sub") arrow(c, ox, oy, bx, by, "#ffb454", 3, "b");
    for (const [x, y, col] of [[ax, ay, "#5ad1ff"], [bx, by, "#ffb454"]]) { if (col === "#ffb454" && !(P.op === "add" || P.op === "sub")) continue; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9, 0, 6.3); c.stroke(); c.lineWidth = 1; }
    ui.hud("");
  } else {
    // projectile: scale so the whole path fits
    const T = projT(), R = projR(T).x, Hm = P.h0 + (P.speed * Math.sin(P.angle * Math.PI / 180)) ** 2 / (2 * G), sc = Math.min((w - 120) / Math.max(R, 5), (h - 110) / Math.max(Hm, 3)), ox = 60, oy = h - 50, X = x => ox + x * sc, Y = y => oy - y * sc;
    c.fillStyle = "#13301f"; c.fillRect(0, oy, w, h - oy); if (P.h0 > 0) { c.fillStyle = "#3a3122"; c.fillRect(0, Y(P.h0), ox, oy - Y(P.h0)); }
    c.strokeStyle = "#1a2440"; const st = Math.pow(10, Math.floor(Math.log10(Math.max(R, Hm) / 4))); for (let x = 0; x <= R + st; x += st) { c.beginPath(); c.moveTo(X(x), oy); c.lineTo(X(x), 20); c.stroke(); TX(c, +x.toFixed(1), X(x), oy + 16, "#8fa0bf", "center", "11px"); }
    c.strokeStyle = "rgba(255,255,255,.25)"; c.setLineDash([4, 4]); c.beginPath(); for (let i = 0; i <= 100; i++) { const q = projR(T * i / 100); i ? c.lineTo(X(q.x), Y(q.y)) : c.moveTo(X(q.x), Y(q.y)); } c.stroke(); c.setLineDash([]);
    for (let tt = 0; tt <= Math.min(t, T); tt += 0.25) { const q = projR(tt); c.fillStyle = "rgba(255,180,84,.5)"; c.beginPath(); c.arc(X(q.x), Y(q.y), 2.5, 0, 6.3); c.fill(); }
    const q = projR(Math.min(t, T)), k = Math.max(3, sc * 0.3); arrow(c, X(0), Y(P.h0), X(q.x), Y(q.y), "rgba(196,161,255,.7)", 1.5, "r"); c.fillStyle = "#ffb454"; c.beginPath(); c.arc(X(q.x), Y(q.y), 8, 0, 6.3); c.fill();
    arrow(c, X(q.x), Y(q.y), X(q.x) + q.vx * k, Y(q.y), "#5ad1ff", 2); arrow(c, X(q.x), Y(q.y), X(q.x), Y(q.y) - q.vy * k, "#ff7b9c", 2); arrow(c, X(q.x), Y(q.y), X(q.x) + q.vx * k, Y(q.y) - q.vy * k, "#7ee787", 3, "v");
    TX(c, `r = ${q.x.toFixed(2)}i + ${q.y.toFixed(2)}j m     v = ${q.vx.toFixed(2)}i ${q.vy < 0 ? "−" : "+"} ${Math.abs(q.vy).toFixed(2)}j m s⁻¹`, 30, 30, "#fff", "left", "600 14px");
    TX(c, `horizontal (blue) never changes; vertical (red) falls by 9.8 m s⁻¹ every second`, 30, 52, "#8fa0bf");
    ui.hud(`t = ${Math.min(t, T).toFixed(2)} s of ${T.toFixed(2)} s<br>range ${R.toFixed(2)} m · greatest height ${Hm.toFixed(2)} m`);
  }
}
function panels() {
  if (P.mode !== "vec") chA.opts.xFmt = chB.opts.xFmt = null;
  if (P.mode === "line") {
    relabel(["Time t", "Displacement s", "Velocity v", "Acceleration a", "Area under v–t so far"]); const m = motion(P, t);
    read.set("a", t.toFixed(2) + " s"); read.set("b", m.s.toFixed(3) + " m"); read.set("c", m.v.toFixed(3) + " m s⁻¹"); read.set("d", m.a.toFixed(3) + " m s⁻²"); read.set("e", m.s.toFixed(3) + " m (= s)");
    const S = [], V = [], Vp = [], Vn = []; for (let i = 0; i <= 200; i++) { const tt = P.T * i / 200, q = motion(P, tt); S.push([tt, q.s]); V.push([tt, q.v]); if (tt <= t) { Vp.push([tt, Math.max(0, q.v)]); Vn.push([tt, Math.min(0, q.v)]); } }
    chA.opts.title = "Displacement–time: gradient = velocity"; chA.opts.xLabel = "t (s)"; chA.opts.yLabel = "s (m)"; const L = 1; const tg = [[t - L, m.s - m.v * L], [t + L, m.s + m.v * L]];
    chA.draw([{ pts: S, color: K.cssVar("--s1"), label: "s" }, { pts: tg, color: K.cssVar("--s2"), dash: [5, 4], label: "tangent (gradient v)" }, { pts: [[t, m.s]], type: "dots", r: 5, color: K.cssVar("--s1") }], { xMin: 0, xMax: P.T, hlines: [{ y: 0 }] });
    chB.opts.title = "Velocity–time: gradient = acceleration, area = displacement"; chB.opts.xLabel = "t (s)"; chB.opts.yLabel = "v (m s⁻¹)";
    chB.draw([{ pts: Vp, type: "area", color: K.cssVar("--s0"), width: 0.1 }, { pts: Vn, type: "area", color: K.cssVar("--s3"), width: 0.1 }, { pts: V, color: K.cssVar("--s2"), label: "v" }, { pts: [[t, m.v]], type: "dots", r: 5, color: K.cssVar("--s2") }], { xMin: 0, xMax: P.T, hlines: [{ y: 0 }] });
  } else if (P.mode === "vec") {
    const res = P.op === "add" ? [P.ax + P.bx, P.ay + P.by] : P.op === "sub" ? [P.ax - P.bx, P.ay - P.by] : P.op === "scale" ? [P.lam * P.ax, P.lam * P.ay] : [P.ax / (Math.hypot(P.ax, P.ay) || 1), P.ay / (Math.hypot(P.ax, P.ay) || 1)];
    relabel(["a", "b", { add: "a + b", sub: "a − b", scale: "λa", unit: "â = a ÷ |a|" }[P.op], "Magnitude", "Direction (from i)"]);
    const v = (x, y) => `${+x.toFixed(3)}i ${y < 0 ? "−" : "+"} ${Math.abs(+y.toFixed(3))}j`;
    read.set("a", v(P.ax, P.ay) + `, |a| = ${Math.hypot(P.ax, P.ay).toFixed(3)}`); read.set("b", v(P.bx, P.by) + `, |b| = ${Math.hypot(P.bx, P.by).toFixed(3)}`); read.set("c", v(res[0], res[1])); read.set("d", Math.hypot(res[0], res[1]).toFixed(3)); read.set("e", (Math.atan2(res[1], res[0]) * 180 / Math.PI).toFixed(1) + "°");
    chA.opts.xFmt = chB.opts.xFmt = v => ["", "a", "b", "result"][Math.round(v)] || ""; chA.opts.title = "Components"; chA.opts.xLabel = ""; chA.opts.yLabel = "size"; chA.draw([{ pts: [[0.85, P.ax], [1.85, P.bx], [2.85, res[0]]], type: "bars", w: 0.3, color: K.cssVar("--s0"), label: "i component" }, { pts: [[1.15, P.ay], [2.15, P.by], [3.15, res[1]]], type: "bars", w: 0.3, color: K.cssVar("--s1"), label: "j component" }], { xMin: 0.4, xMax: 3.6 });
    chB.opts.xFmt = v => ["", "|a| + |b|", "|a + b|"][Math.round(v)] || ""; chB.opts.title = "|a + b| ≤ |a| + |b| (triangle inequality)"; chB.opts.xLabel = ""; chB.opts.yLabel = "length"; chB.draw([{ pts: [[1, Math.hypot(P.ax, P.ay) + Math.hypot(P.bx, P.by)], [2, Math.hypot(P.ax + P.bx, P.ay + P.by)]], type: "bars", w: 0.5, color: K.cssVar("--s4"), label: "|a| + |b| then |a + b|" }], { xMin: 0.4, xMax: 2.6 });
  } else {
    const T = projT(), q = projR(Math.min(t, T)); relabel(["Position r", "Velocity v", "Speed |v|", "Time of flight", "Range, greatest height"]);
    read.set("a", `${q.x.toFixed(2)}i + ${q.y.toFixed(2)}j`); read.set("b", `${q.vx.toFixed(2)}i ${q.vy < 0 ? "−" : "+"} ${Math.abs(q.vy).toFixed(2)}j`); read.set("c", Math.hypot(q.vx, q.vy).toFixed(2) + " m s⁻¹"); read.set("d", T.toFixed(3) + " s"); read.set("e", `${projR(T).x.toFixed(2)} m, ${(P.h0 + (P.speed * Math.sin(P.angle * Math.PI / 180)) ** 2 / (2 * G)).toFixed(2)} m`);
    const VX = [], VY = [], RA = []; for (let i = 0; i <= 100; i++) { const tt = T * i / 100, z = projR(tt); VX.push([tt, z.vx]); VY.push([tt, z.vy]); } for (let a = 0; a <= 90; a += 2) { const s = P.speed, th = a * Math.PI / 180, vy = s * Math.sin(th), TT = (vy + Math.sqrt(vy * vy + 2 * G * P.h0)) / G; RA.push([a, s * Math.cos(th) * TT]); }
    chA.opts.title = "Velocity components"; chA.opts.xLabel = "t (s)"; chA.opts.yLabel = "m s⁻¹"; chA.draw([{ pts: VX, color: K.cssVar("--s0"), label: "horizontal" }, { pts: VY, color: K.cssVar("--s3"), label: "vertical" }], { vlines: [{ x: Math.min(t, T) }], hlines: [{ y: 0 }] });
    chB.opts.title = "Range for every angle (this speed and height)"; chB.opts.xLabel = "θ (°)"; chB.opts.yLabel = "range (m)"; chB.draw([{ pts: RA, color: K.cssVar("--s2"), label: "range" }], { xMin: 0, xMax: 90, yMin: 0, vlines: [{ x: P.angle, label: P.angle + "°" }] });
  }
}
let frame = 0;
ui.run(dt => { const end = P.mode === "proj" ? projT() + 0.6 : P.T; t += dt; if (t > end + 0.8) t = 0; if (P.mode === "line" && t > P.T) t = P.T + (t - P.T); }, () => { const keep = t; if (P.mode === "line") t = Math.min(t, P.T); draw(); if (frame++ % 4 === 0) panels(); t = keep; });
ui.onLevel = v => { if (v === "std" && P.mode === "proj") set({ mode: "line" }); showCtl(); };
set({});
ui.tip("Watch the particle and the graphs together. The shaded area under the v–t graph is the displacement.", 7000);
