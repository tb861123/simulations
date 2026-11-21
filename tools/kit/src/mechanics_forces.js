/* =====================================================================
   FORCES AND NEWTON'S LAWS
   Newton's second law: resultant force = mass × acceleration, F = ma.
   Weight W = mg (g = 9.8 m s⁻²). Draw a FORCE DIAGRAM for each particle,
   then apply F = ma in the direction of motion for each one.
   CONNECTED PARTICLES (light inextensible string, smooth pulley): both
   move with the same acceleration a and the tension T is the same on
   each side. For a block on a table pulled by a hanging mass:
       B:  m₂g − T = m₂a        A:  T − F = m₁a
   FRICTION (A level): F ≤ μR. It only reaches μR when the object is
   moving or about to move (LIMITING). On a slope at angle θ, resolve:
       R = mg cos θ (perpendicular),  down the slope mg sin θ.
   The block stays still if mg sin θ ≤ μ mg cos θ, i.e. tan θ ≤ μ.
   MOMENTS (A level): moment = force × perpendicular distance. A rigid
   body is in equilibrium if the forces balance AND the moments about
   any point balance. A beam is about to tilt when a reaction is zero.
   ===================================================================== */
const g = 9.8;
// ---------------- 1. The physics of each set-up ----------------
function table(Q) {           // block A (m1) on a table, string over a pulley to B (m2) hanging
  const R = Q.m1 * g, drive = Q.m2 * g, Fmax = Q.mu * R;
  if (drive <= Fmax) return { a: 0, T: drive, F: drive, R, limiting: Math.abs(drive - Fmax) < 1e-9, moving: false };
  const a = (drive - Fmax) / (Q.m1 + Q.m2); return { a, T: Q.m2 * (g - a), F: Fmax, R, limiting: true, moving: true };
}
function atwood(Q) { const a = (Q.m2 - Q.m1) * g / (Q.m1 + Q.m2); return { a, T: 2 * Q.m1 * Q.m2 * g / (Q.m1 + Q.m2) }; }   // a > 0 means m2 goes down
function slope(Q) {           // block on a rough slope at θ, with an optional push P up the slope
  const th = Q.theta * Math.PI / 180, R = Q.m1 * g * Math.cos(th), down = Q.m1 * g * Math.sin(th) - Q.push, Fmax = Q.mu * R;
  if (Math.abs(down) <= Fmax) return { a: 0, R, F: down, Fmax, moving: false, limiting: Math.abs(Math.abs(down) - Fmax) < 1e-6, down };
  return { a: (Math.abs(down) - Fmax) / Q.m1 * Math.sign(down), R, F: Fmax * Math.sign(down), Fmax, moving: true, limiting: true, down };   // a > 0 means down the slope
}
function beam(Q) {            // uniform beam, length L, mass M, on supports at C and D, with a load W at x (all from the left end)
  const L = Q.L, C = Q.c, D = Q.d, Wb = Q.M * g, Wl = Q.load * g;
  // moments about C: R_D (D − C) = Wb (L/2 − C) + Wl (x − C);  forces: R_C + R_D = Wb + Wl
  let RD = (Wb * (L / 2 - C) + Wl * (Q.x - C)) / (D - C), RC = Wb + Wl - RD, tilt = null;
  if (RC < 0) { tilt = "D"; } if (RD < 0) { tilt = "C"; }
  return { RC, RD, Wb, Wl, tilt };
}

// ---------------- 2. State ----------------
const DEF = { setup: "table", m1: 2, m2: 1, mu: 0, theta: 25, push: 0, L: 4, M: 10, c: 0.5, d: 3, load: 20, x: 3.5, showF: true };
const P = Object.assign({}, DEF);
let pos = 0, vel = 0, tt = 0;
const restart = () => { pos = 0; vel = 0; tt = 0; };

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Forces and Newton's Laws", subject: "Mathematics",
  blurb: "Force diagrams that move: connected particles over a pulley, an Atwood machine, friction on a rough slope and moments on a beam about to tip",
  reset: () => restart(),
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Mechanics 8.1–8.4: Newton's three laws, F = ma, weight and g, force diagrams, connected particles (strings and smooth pulleys, the same tension and acceleration), forces in one dimension.",
    adv: "Pearson Edexcel A level Mathematics (9MA0) Mechanics 8.5–8.6 and 9: resolving forces, inclined planes, friction F ≤ μR and limiting equilibrium, statics; moments, equilibrium of a rigid body, beams on supports and the condition for tilting." } },
  missions: [
    { title: "A block pulled over a pulley", q: "A (2 kg) on a smooth table is pulled by B (1 kg) hanging over a pulley. Work out the acceleration and the tension before you watch. Check with the readings.", hint: "B: 9.8 − T = 1a. A: T = 2a. Adding: 9.8 = 3a, so a = 3.27 m s⁻², T = 6.53 N. The tension is LESS than B's weight (9.8 N): if it were equal, B would not accelerate.", setup: () => set({ setup: "table", m1: 2, m2: 1, mu: 0 }) },
    { title: "Heavier hanging mass", q: "Make B heavier and heavier. Does the acceleration keep growing? What is its limit?", hint: "a = m₂g/(m₁ + m₂) tends to g as m₂ grows: B almost falls freely, and the tension approaches m₁g.", setup: () => set({ setup: "table", m1: 2, m2: 6, mu: 0 }) },
    { title: "Atwood machine", q: "Two masses, 3 kg and 2 kg, hang over a pulley. Which way does it move? Find a and T.", hint: "The 3 kg side goes down: a = (3 − 2)g/5 = 1.96 m s⁻², T = 2 × 3 × 2 × 9.8/5 = 23.5 N, between the two weights (19.6 N and 29.4 N).", setup: () => set({ setup: "atwood", m1: 2, m2: 3 }) },
    { lvl: "adv", title: "A rough table", q: "Now μ = 0.4 between A (2 kg) and the table, B = 1 kg. Will it move? Increase B until it just moves.", hint: "Maximum friction μR = 0.4 × 2g = 7.84 N < 9.8 N, so it moves with a = (9.8 − 7.84)/3 = 0.65 m s⁻². It stays still if m₂ ≤ μm₁ = 0.8 kg: then friction is less than its maximum and equals m₂g.", setup: () => set({ setup: "table", m1: 2, m2: 1, mu: 0.4 }) },
    { lvl: "adv", title: "Will it slide down the slope?", q: "A 5 kg block on a slope with μ = 0.5. Increase θ from 20°. At what angle does it start to slide?", hint: "It slides when tan θ > μ: θ > tan⁻¹ 0.5 = 26.6°, whatever the mass (m cancels). Below that, friction balances mg sin θ exactly and is not at its maximum.", setup: () => set({ setup: "slope", m1: 5, mu: 0.5, theta: 20 }) },
    { lvl: "adv", title: "Pushing up a slope", q: "θ = 30°, μ = 0.3, m = 5 kg. What push up the slope makes it just move up? Between which pushes does it stay still?", hint: "Down the slope mg sin 30° = 24.5 N, μR = 0.3 × 5g cos 30° = 12.7 N. It stays still for 11.8 N ≤ P ≤ 37.2 N: friction can act either way. Above 37.2 N it moves up.", setup: () => set({ setup: "slope", m1: 5, mu: 0.3, theta: 30, push: 20 }) },
    { lvl: "adv", title: "Moments: a plank about to tip", q: "A 4 m plank (10 kg) rests on supports 0.5 m and 3 m from the left. A 20 kg child walks right. Where does the plank start to tip?", hint: "It tips about D when the reaction at C becomes zero. Moments about D: 10g × 1 = 20g × (x − 3) → x = 3.5 m. Beyond 3.5 m it tips.", setup: () => set({ setup: "beam", L: 4, M: 10, c: 0.5, d: 3, load: 20, x: 3.2 }) },
    { lvl: "adv", title: "Reactions on a bridge", q: "Move the load from end to end. How do the two reactions change? Is their total always the same?", hint: "Their total is always the total weight (vertical forces balance). Each reaction changes linearly with the load's position (taking moments about the other support).", setup: () => set({ setup: "beam", L: 4, M: 10, c: 0, d: 4, load: 20, x: 1 }) },
  ],
  batch: [
    { title: "Measuring the acceleration with a stopwatch", question: "Time B falling 1 m (A = 2 kg on a smooth table). With a hand-timed stopwatch, how does the measured acceleration compare with m₂g/(m₁ + m₂)?", how: "a = 2s/t² with s = 1 m; reaction-time errors with SD 0.08 s. Each point: one timing.", xLabel: "hanging mass m₂ (kg)", yLabel: "measured a (m s⁻²)", xs: [0.5, 1, 1.5, 2, 3, 4, 6], reps: 6, yMin: 0, theory: m => m * g / (2 + m), theoryLabel: "m₂g/(m₁ + m₂)", run: (m, r) => { const a = m * g / (2 + m), t = Math.sqrt(2 / a) + 0.08 * r.gauss(); return 2 / (t * t); }, note: "Large masses give short times, so reaction-time errors matter more: the scatter grows with m₂. A light gate would do much better." },
    { title: "Tension in an Atwood machine", question: "With m₁ = 2 kg, how does the tension depend on the other mass?", how: "Exact calculation.", xLabel: "m₂ (kg)", yLabel: "tension T (N)", xs: [0.5, 1, 2, 3, 4, 6, 8, 12], reps: 1, yMin: 0, theory: m => 2 * 2 * m * g / (2 + m), theoryLabel: "2m₁m₂g/(m₁ + m₂)", run: m => atwood({ m1: 2, m2: m }).T, note: "Equal masses: T = mg and nothing accelerates. As m₂ → ∞, T → 2m₁g = 39.2 N: the light side is pulled up at nearly g." },
    { title: "Acceleration down a rough slope (A level)", question: "μ = 0.5. How does the acceleration depend on the angle of the slope?", how: "Exact calculation; 0 means the block stays still.", xLabel: "θ (°)", yLabel: "a down the slope (m s⁻²)", xs: [10, 20, 25, 30, 40, 50, 60, 75, 90], reps: 1, yMin: 0, theory: th => Math.max(0, g * (Math.sin(th * Math.PI / 180) - 0.5 * Math.cos(th * Math.PI / 180))), theoryLabel: "g(sin θ − μ cos θ)", run: th => slope({ m1: 5, mu: 0.5, theta: th, push: 0 }).a, note: "Nothing happens until tan θ = μ (26.6°); at 90° the slope is a wall and the block falls freely (R = 0, so no friction)." },
    { title: "Measuring μ by tilting (A level)", question: "Find μ by tilting a slope until the block slips: μ = tan θ. If each angle reading has an error of SD 1.5°, how good is the estimate?", how: "True μ = 0.5. Each run: one tilt, μ = tan(measured angle).", yLabel: "estimated μ", reps: 400, bins: 24, theory: 0.5, theoryLabel: "true μ", run: (x, r) => Math.tan(Math.atan(0.5) + 1.5 * Math.PI / 180 * r.gauss()), note: "SD about 0.033: a 1.5° error in the angle gives a 6–7% error in μ. Repeating and averaging reduces it like 1/√n." },
    { title: "Reaction at a support (A level)", question: "A 4 m beam (10 kg) on supports at 0 m and 4 m. How does the reaction at the right-hand support depend on where a 20 kg load is?", how: "Exact calculation (moments about the left support).", xLabel: "load position x (m)", yLabel: "R at the right support (N)", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], reps: 1, yMin: 0, theory: x => (10 * g * 2 + 20 * g * x) / 4, theoryLabel: "(10g × 2 + 20g x)/4", run: x => beam({ L: 4, M: 10, c: 0, d: 4, load: 20, x }).RD, note: "A straight line: moments are proportional to distance. The other reaction is the total weight minus this one." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "M8.1", text: "Newton's first law: an object stays at rest or moves at constant velocity unless a resultant force acts. Third law: if A pushes B, B pushes A equally hard in the opposite direction." },
      { lvl: "std", tag: "M8.3", text: "F = ma, with F the RESULTANT force in the direction of the acceleration. Weight W = mg. For a lift: R − mg = ma." },
      { lvl: "std", tag: "M8.4", text: "Connected particles (light inextensible string, smooth light pulley): same acceleration, same tension throughout. Write F = ma for each particle, or for the whole system (tension cancels)." },
      { lvl: "adv", tag: "M8.5", text: "Resolve forces parallel and perpendicular to the slope: R = mg cos θ (no other perpendicular forces), component of weight down the slope mg sin θ." },
      { lvl: "adv", tag: "M8.6", text: "Friction F ≤ μR, opposing motion (or the tendency to move). F = μR when moving or in limiting equilibrium. On a slope with no other forces, it slides if tan θ > μ." },
      { lvl: "adv", tag: "M9", text: "Moment = force × perpendicular distance from the pivot. Equilibrium: resultant force zero AND resultant moment zero about any point. A beam on two supports is about to tilt about one support when the reaction at the other is zero." },
    ],
    questions: [
      { lvl: "std", marks: 5, q: () => P.setup === "table" ? `A block A of mass ${P.m1} kg on a smooth table is connected by a light string over a smooth pulley to B of mass ${P.m2} kg hanging freely. Find the acceleration and the tension.` : "A block A of mass 2 kg on a smooth table is connected by a light string over a smooth pulley to B of mass 1 kg hanging freely. Find the acceleration and the tension.", ans: () => { const Q = P.setup === "table" ? Object.assign({}, P, { mu: 0 }) : Object.assign({}, DEF), s = table(Q); return `<ul><li>B: ${Q.m2}g − T = ${Q.m2}a</li><li>A: T = ${Q.m1}a</li><li>add: ${Q.m2}g = ${Q.m1 + Q.m2}a</li><li>a = ${s.a.toFixed(2)} m s⁻²</li><li>T = ${s.T.toFixed(2)} N</li></ul>`; } },
      { lvl: "std", marks: 3, q: "A person of mass 60 kg stands in a lift accelerating upwards at 1.5 m s⁻². Find the reaction from the floor.", ans: "<ul><li>R − 60g = 60 × 1.5</li><li>R = 588 + 90</li><li>= 678 N</li></ul>" },
      { lvl: "adv", marks: 5, q: "A 5 kg block rests on a rough slope at 30°, μ = 0.3. Show that it slides, and find its acceleration.", ans: "<ul><li>R = 5g cos 30° = 42.4 N</li><li>max friction = 0.3 × 42.4 = 12.7 N</li><li>down the slope: 5g sin 30° = 24.5 N > 12.7 N, so it slides</li><li>5a = 24.5 − 12.7</li><li>a = 2.36 m s⁻²</li></ul>" },
      { lvl: "adv", marks: 4, q: "A uniform plank, 4 m long and mass 10 kg, rests on supports at 0.5 m and 3 m from its left end. A child of mass 20 kg stands on it. How far from the left end can the child go before the plank tips?", ans: "<ul><li>about to tip about the right support D: reaction at C = 0</li><li>moments about D: 10g × (3 − 2) = 20g × (x − 3)</li><li>10 = 20(x − 3)</li><li>x = 3.5 m</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Each set-up uses the exact equations from F = ma (and friction F ≤ μR); the motion is drawn from them. Force arrows are drawn to scale (longer = bigger).</li><li>Static friction takes whatever value is needed to stop motion, up to μR; once moving it is μR.</li><li>The beam is in equilibrium unless a support reaction would have to be negative: then it tips.</li></ul>
<h3>Modelling assumptions</h3><ul><li>Particles (no size); strings light and inextensible; pulleys smooth and light; the table edge is smooth.</li><li>g = 9.8 m s⁻²; no air resistance.</li><li>The beam is uniform (its weight acts at its centre) and rigid; supports are points.</li><li>The same μ is used for starting and for sliding (real surfaces often have a lower sliding μ).</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let gp = ui.group("Set-up");
C.setup = K.seg(gp, { value: "table", options: [["table", "block and hanging mass"], ["atwood", "Atwood machine"], ["slope", "rough slope (A level)"], ["beam", "moments: beam (A level)"]], on: v => set({ setup: v }) });
const gm = ui.group("Masses and friction"), gb = ui.group("Beam");
C.m1 = K.slider(gm, { label: "Mass m₁ (A, or the block)", min: 0.5, max: 10, step: 0.5, value: 2, unit: "kg", on: v => { P.m1 = v; restart(); } });
C.m2 = K.slider(gm, { label: "Mass m₂ (B)", min: 0.5, max: 10, step: 0.5, value: 1, unit: "kg", on: v => { P.m2 = v; restart(); } });
C.mu = K.slider(gm, { label: "Coefficient of friction μ", min: 0, max: 1, step: 0.05, value: 0, fmt: v => v ? v.toFixed(2) : "0 (smooth)", on: v => { P.mu = v; restart(); } });
C.theta = K.slider(gm, { label: "Angle of slope θ", min: 0, max: 60, step: 1, value: 25, unit: "°", on: v => { P.theta = v; restart(); } });
C.push = K.slider(gm, { label: "Push up the slope P", min: 0, max: 80, step: 1, value: 0, unit: "N", on: v => { P.push = v; restart(); } });
C.M = K.slider(gb, { label: "Mass of beam", min: 0, max: 40, step: 1, value: 10, unit: "kg", on: v => P.M = v });
C.c = K.slider(gb, { label: "Support C at", min: 0, max: 4, step: 0.1, value: 0.5, unit: "m", on: v => P.c = Math.min(v, P.d - 0.2) });
C.d = K.slider(gb, { label: "Support D at", min: 0, max: 4, step: 0.1, value: 3, unit: "m", on: v => P.d = Math.max(v, P.c + 0.2) });
C.load = K.slider(gb, { label: "Load", min: 0, max: 60, step: 1, value: 20, unit: "kg", on: v => P.load = v });
C.x = K.slider(gb, { label: "Load position x", min: 0, max: 4, step: 0.05, value: 3.5, unit: "m", on: v => P.x = v });
K.note(gb, "Or drag the load along the beam.");
C.showF = K.toggle(gp, { label: "Show the force diagram", value: true, on: v => P.showF = v });
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() {
  const s = P.setup, adv = ui.level === "adv"; gm.style.display = s === "beam" ? "none" : ""; gb.style.display = s === "beam" ? "" : "none";
  C.m2.el.style.display = s === "slope" ? "none" : ""; C.mu.el.style.display = (s === "table" || s === "slope") && adv ? "" : "none"; C.theta.el.style.display = C.push.el.style.display = s === "slope" ? "" : "none";
  C.setup.el.querySelectorAll("button").forEach((b, i) => b.style.display = i < 2 || adv ? "" : "none");
}
function set(o) { Object.assign(P, DEF, o); if ((P.setup === "slope" || P.setup === "beam" || P.mu > 0) && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["m1", "m2", "mu", "theta", "push", "M", "c", "d", "load", "x"]) C[k].set(P[k]); C.setup.set(P.setup); C.showF.set(P.showF); restart(); showCtl(); }

// ---------------- 5. Animation and drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrow(c, x0, y0, dx, dy, col, label, side = 1) { const x1 = x0 + dx, y1 = y0 + dy, ang = Math.atan2(dy, dx), L = Math.hypot(dx, dy); if (L < 2) return; c.strokeStyle = c.fillStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 11 * Math.cos(ang - 0.4), y1 - 11 * Math.sin(ang - 0.4)); c.lineTo(x1 - 11 * Math.cos(ang + 0.4), y1 - 11 * Math.sin(ang + 0.4)); c.closePath(); c.fill(); c.lineWidth = 1; if (label) { const cs = Math.cos(ang), sn = Math.sin(ang); TX(c, label, x1 + 12 * cs + (Math.abs(cs) < 0.3 ? 6 * side : 0), y1 + 12 * sn + 4 + (sn > 0.3 ? 6 : 0), col, cs > 0.3 ? "left" : cs < -0.3 ? "right" : side > 0 ? "left" : "right", "600 12px"); } }
const FS = () => Math.min(2.2, 90 / Math.max(20, P.setup === "slope" ? P.m1 * g : Math.max(P.m1, P.m2) * g));   // pixels per newton
let dragLoad = false, BG = null;
K.pointer(cv.el, { down: p => { if (P.setup === "beam" && BG) { dragLoad = true; moveLoad(p); } }, drag: p => moveLoad(p), up: () => dragLoad = false, hover: () => cv.el.style.cursor = P.setup === "beam" ? "ew-resize" : "default" });
function moveLoad(p) { if (!dragLoad) return; P.x = K.clamp(Math.round((p.x - BG.x0) / BG.s / 0.05) * 0.05, 0, P.L); C.x.set(P.x); }
function tick(dt) {
  let a = 0; if (P.setup === "table") a = table(P).a; else if (P.setup === "atwood") a = atwood(P).a; else if (P.setup === "slope") a = slope(P).a;
  tt += dt; vel += a * dt; pos += vel * dt; if (Math.abs(pos) > 1.6) restart();
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, fs = FS(); c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); const pxm = Math.min(w, h) * 0.22;   // pixels per metre of motion
  if (P.setup === "table") {
    const s = table(P), ty = h * 0.45, ex = w * 0.66, bs = 30 + 8 * Math.sqrt(P.m1), bx = ex - 60 - bs - 200 + pos * pxm, hs = 24 + 8 * Math.sqrt(P.m2), hy = ty + 70 + pos * pxm;
    c.fillStyle = "#3a3122"; c.fillRect(40, ty, ex - 40, h - ty - 20); c.fillStyle = P.mu > 0 ? "#6b5a3a" : "#8fa0bf"; c.fillRect(40, ty, ex - 40, 4);
    c.strokeStyle = "#ddd"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + bs, ty - bs / 2); c.lineTo(ex, ty - bs / 2); c.arc(ex + 14, ty - bs / 2 + 14, 14, -Math.PI / 2, 0); c.lineTo(ex + 28, hy); c.stroke(); c.lineWidth = 1;
    c.fillStyle = "#5d6e93"; c.beginPath(); c.arc(ex + 14, ty - bs / 2 + 14, 14, 0, 6.3); c.fill();
    c.fillStyle = "#5ad1ff"; c.fillRect(bx, ty - bs, bs, bs); TX(c, "A " + P.m1 + " kg", bx + bs / 2, ty - bs / 2 + 4, "#04121c", "center", "600 12px");
    c.fillStyle = "#ffb454"; c.fillRect(ex + 28 - hs / 2, hy, hs, hs); TX(c, "B " + P.m2 + " kg", ex + 28, hy + hs / 2 + 4, "#1a1000", "center", "600 11px");
    if (P.showF) {
      const ax = bx + bs / 2, ay = ty - bs / 2;
      arrow(c, ax, ay, 0, P.m1 * g * fs, "#ff7b9c", `W = ${(P.m1 * g).toFixed(1)} N`); arrow(c, ax, ay, 0, -s.R * fs, "#7ee787", `R = ${s.R.toFixed(1)} N`); arrow(c, bx + bs, ay, s.T * fs, 0, "#ffe66d", `T = ${s.T.toFixed(1)} N`);
      if (s.F > 0 && P.mu > 0) arrow(c, bx, ty - 4, -s.F * fs, 0, "#c4a1ff", `F = ${s.F.toFixed(1)} N${s.limiting ? " (= μR)" : ""}`, -1);
      const bxx = ex + 28 + hs / 2 + 10; arrow(c, bxx, hy + hs / 2, 0, P.m2 * g * fs, "#ff7b9c", `${(P.m2 * g).toFixed(1)} N`); arrow(c, bxx, hy + hs / 2, 0, -s.T * fs, "#ffe66d", `T`);
    }
    ui.hud(s.moving ? `a = <b>${s.a.toFixed(3)}</b> m s⁻²<br>T = <b>${s.T.toFixed(2)}</b> N` : `<b>stays at rest</b>: friction ${s.F.toFixed(2)} N ≤ μR = ${(P.mu * s.R).toFixed(2)} N`);
  } else if (P.setup === "atwood") {
    const s = atwood(P), cx = w * 0.45, py = 70, r = 40, s1 = 26 + 8 * Math.sqrt(P.m1), s2 = 26 + 8 * Math.sqrt(P.m2), y1 = h * 0.5 - pos * pxm, y2 = h * 0.5 + pos * pxm;
    c.fillStyle = "#3a4a6e"; c.fillRect(cx - 80, 20, 160, 10); c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(cx, 30); c.lineTo(cx, py); c.stroke(); c.fillStyle = "#5d6e93"; c.beginPath(); c.arc(cx, py, r, 0, 6.3); c.fill();
    c.strokeStyle = "#ddd"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - r, py); c.lineTo(cx - r, y1); c.moveTo(cx + r, py); c.lineTo(cx + r, y2); c.arc(cx, py, r, 0, Math.PI, true); c.stroke(); c.lineWidth = 1;
    c.fillStyle = "#5ad1ff"; c.fillRect(cx - r - s1 / 2, y1, s1, s1); TX(c, P.m1 + " kg", cx - r, y1 + s1 / 2 + 4, "#04121c", "center", "600 11px");
    c.fillStyle = "#ffb454"; c.fillRect(cx + r - s2 / 2, y2, s2, s2); TX(c, P.m2 + " kg", cx + r, y2 + s2 / 2 + 4, "#1a1000", "center", "600 11px");
    if (P.showF) { arrow(c, cx - r - s1 / 2 - 14, y1 + s1 / 2, 0, P.m1 * g * fs, "#ff7b9c", `${(P.m1 * g).toFixed(1)} N`, -1); arrow(c, cx - r - s1 / 2 - 14, y1 + s1 / 2, 0, -s.T * fs, "#ffe66d", `T = ${s.T.toFixed(1)} N`, -1); arrow(c, cx + r + s2 / 2 + 14, y2 + s2 / 2, 0, P.m2 * g * fs, "#ff7b9c", `${(P.m2 * g).toFixed(1)} N`); arrow(c, cx + r + s2 / 2 + 14, y2 + s2 / 2, 0, -s.T * fs, "#ffe66d", "T"); }
    ui.hud(`a = <b>${Math.abs(s.a).toFixed(3)}</b> m s⁻² (${s.a > 0 ? m2n() : s.a < 0 ? "left side down" : "balanced"})<br>T = <b>${s.T.toFixed(2)}</b> N`);
  } else if (P.setup === "slope") {
    const s = slope(P), th = P.theta * Math.PI / 180, L = Math.min(w * 0.7, (h - 80) / Math.max(0.3, Math.sin(th)) * 0.9), x0 = w * 0.12, y0 = h - 40, x1 = x0 + L * Math.cos(th), y1 = y0 - L * Math.sin(th);
    c.fillStyle = "#3a3122"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1, y1); c.closePath(); c.fill(); c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = "#ffe66d"; c.beginPath(); c.arc(x0, y0, 50, -th, 0); c.stroke(); TX(c, P.theta + "°", x0 + 56, y0 - 8, "#ffe66d");
    const along = 0.6 - pos * pxm / L, bx = x0 + along * L * Math.cos(th), by = y0 - along * L * Math.sin(th), bs = 34 + 6 * Math.sqrt(P.m1);
    c.save(); c.translate(bx, by); c.rotate(-th); c.fillStyle = "#5ad1ff"; c.fillRect(-bs / 2, -bs, bs, bs); TX(c, P.m1 + " kg", 0, -bs / 2 + 4, "#04121c", "center", "600 12px"); c.restore();
    if (P.showF) {
      const cx = bx - Math.sin(th) * bs / 2, cy = by - Math.cos(th) * bs / 2, ux = Math.cos(th), uy = -Math.sin(th);   // (ux, uy) points up the slope on screen
      arrow(c, cx, cy, 0, P.m1 * g * fs, "#ff7b9c", `mg = ${(P.m1 * g).toFixed(1)} N`); arrow(c, cx, cy, -Math.sin(th) * s.R * fs, -Math.cos(th) * s.R * fs, "#7ee787", `R = ${s.R.toFixed(1)} N`);
      if (Math.abs(s.F) > 0.01) arrow(c, bx + Math.sin(th) * 4, by + Math.cos(th) * 4, ux * s.F * fs, uy * s.F * fs, "#c4a1ff", `F = ${Math.abs(s.F).toFixed(1)} N${s.limiting ? " = μR" : ""}`, -1);
      if (P.push > 0) { const pl = P.push * fs, sx = cx - ux * (bs / 2 + pl + 4), sy = cy - uy * (bs / 2 + pl + 4); arrow(c, sx, sy, ux * pl, uy * pl, "#ffe66d", ""); TX(c, `P = ${P.push} N`, sx, sy - 8, "#ffe66d", "right", "600 12px"); }
      c.setLineDash([4, 4]); arrow(c, cx, cy, -ux * P.m1 * g * Math.sin(th) * fs, -uy * P.m1 * g * Math.sin(th) * fs, "rgba(255,123,156,.6)", "mg sin θ"); arrow(c, cx, cy, Math.sin(th) * P.m1 * g * Math.cos(th) * fs, Math.cos(th) * P.m1 * g * Math.cos(th) * fs, "rgba(255,123,156,.6)", "mg cos θ"); c.setLineDash([]);
    }
    ui.hud(s.moving ? `slides ${s.a > 0 ? "down" : "up"} the slope, a = <b>${Math.abs(s.a).toFixed(3)}</b> m s⁻²` : `<b>stays at rest</b>${s.limiting ? " (limiting equilibrium)" : ""}<br>friction ${Math.abs(s.F).toFixed(2)} N ≤ μR = ${s.Fmax.toFixed(2)} N`);
  } else {
    const b = beam(P), x0 = 80, x1 = w - 80, s = (x1 - x0) / P.L, by = h * 0.5; BG = { x0, s };
    let ang = 0; if (b.tilt === "D") ang = Math.min(0.25, tt * 0.4) * 1; if (b.tilt === "C") ang = -Math.min(0.25, tt * 0.4);
    const piv = b.tilt === "D" ? x0 + P.d * s : b.tilt === "C" ? x0 + P.c * s : 0;
    c.fillStyle = "#13301f"; c.fillRect(0, by + 70, w, h); for (const [q, nm] of [[P.c, "C"], [P.d, "D"]]) { const X = x0 + q * s; c.fillStyle = "#5d6e93"; c.beginPath(); c.moveTo(X, by + 8); c.lineTo(X - 18, by + 70); c.lineTo(X + 18, by + 70); c.closePath(); c.fill(); TX(c, nm, X, by + 90, "#c9d4ea", "center", "600 13px"); }
    c.save(); if (ang) { c.translate(piv, by); c.rotate(ang); c.translate(-piv, -by); }
    c.fillStyle = "#b08850"; c.fillRect(x0, by - 8, x1 - x0, 16); const lx = x0 + P.x * s, ls = 22 + 6 * Math.sqrt(P.load); c.fillStyle = "#ffb454"; c.fillRect(lx - ls / 2, by - 8 - ls, ls, ls); TX(c, P.load + " kg", lx, by - 8 - ls / 2 + 4, "#1a1000", "center", "600 11px");
    if (P.showF && !b.tilt) { const fs2 = Math.min(1.2, 140 / Math.max(b.Wb + b.Wl, 1)); arrow(c, x0 + P.L / 2 * s, by, 0, b.Wb * fs2, "#ff7b9c", `${b.Wb.toFixed(0)} N`); arrow(c, lx + ls / 2 + 6, by - 8 - ls / 2, 0, b.Wl * fs2 * 0.8, "#ff7b9c", `${b.Wl.toFixed(0)} N`); arrow(c, x0 + P.c * s, by + 8, 0, -b.RC * fs2, "#7ee787", `R_C = ${b.RC.toFixed(1)} N`, -1); arrow(c, x0 + P.d * s, by + 8, 0, -b.RD * fs2, "#7ee787", `R_D = ${b.RD.toFixed(1)} N`); }
    c.restore(); if (!b.tilt) tt = 0;
    for (let q = 0; q <= P.L + 1e-9; q += 0.5) TX(c, q + " m", x0 + q * s, by + 116, "#8fa0bf", "center", "11px");
    ui.hud(b.tilt ? `<b style="color:#ff8a9a">tips about ${b.tilt}!</b> (the reaction at ${b.tilt === "D" ? "C" : "D"} would have to be negative)` : `R_C = <b>${b.RC.toFixed(1)}</b> N, R_D = <b>${b.RD.toFixed(1)}</b> N<br>R_C + R_D = ${(b.RC + b.RD).toFixed(1)} N = total weight`);
  }
}
const m2n = () => "right side down";
function panels() {
  if (P.setup === "beam") {
    const b = beam(P); relabel(["Weight of beam", "Weight of load", "Reaction at C", "Reaction at D", "Moments about C"]);
    read.set("a", b.Wb.toFixed(1) + " N at " + (P.L / 2) + " m"); read.set("b", b.Wl.toFixed(1) + " N at " + P.x.toFixed(2) + " m"); read.set("c", b.tilt ? "–" : b.RC.toFixed(2) + " N"); read.set("d", b.tilt ? "–" : b.RD.toFixed(2) + " N");
    read.set("e", `clockwise ${(b.Wb * (P.L / 2 - P.c) + b.Wl * (P.x - P.c)).toFixed(1)} N m`);
    const RC = [], RD = []; for (let i = 0; i <= 80; i++) { const x = P.L * i / 80, q = beam(Object.assign({}, P, { x })); RC.push([x, q.RC]); RD.push([x, q.RD]); }
    chA.opts.title = "Reactions as the load moves (negative = it would tip)"; chA.opts.xLabel = "load position (m)"; chA.opts.yLabel = "reaction (N)"; chA.draw([{ pts: RC, color: K.cssVar("--s0"), label: "R_C" }, { pts: RD, color: K.cssVar("--s1"), label: "R_D" }], { hlines: [{ y: 0 }], vlines: [{ x: P.x }] });
    const M = []; for (let i = 0; i <= 60; i++) { const L2 = 60 * i / 60; M.push([L2, beam(Object.assign({}, P, { load: L2 })).RC]); }
    chB.opts.title = "Reaction at C against the load's mass"; chB.opts.xLabel = "load (kg)"; chB.opts.yLabel = "R_C (N)"; chB.draw([{ pts: M, color: K.cssVar("--s0"), label: "R_C" }], { hlines: [{ y: 0 }], vlines: [{ x: P.load }] });
    return;
  }
  const s = P.setup === "table" ? table(P) : P.setup === "atwood" ? atwood(P) : slope(P);
  relabel(["Acceleration", "Tension / friction", "Normal reaction", "Velocity now", "Distance moved"]);
  read.set("a", Math.abs(s.a).toFixed(3) + " m s⁻²"); read.set("b", P.setup === "slope" ? `F = ${Math.abs(s.F).toFixed(2)} N (max μR = ${s.Fmax.toFixed(2)})` : `T = ${s.T.toFixed(2)} N`);
  read.set("c", s.R != null ? s.R.toFixed(2) + " N" : "–"); read.set("d", Math.abs(vel).toFixed(2) + " m s⁻¹"); read.set("e", Math.abs(pos).toFixed(2) + " m");
  if (P.setup === "slope") {
    const A = [], Fr = []; for (let th = 0; th <= 90; th++) { const q = slope(Object.assign({}, P, { theta: th })); A.push([th, q.a]); Fr.push([th, Math.abs(q.F)]); }
    chA.opts.title = "Acceleration down the slope for every angle"; chA.opts.xLabel = "θ (°)"; chA.opts.yLabel = "a (m s⁻²)"; chA.draw([{ pts: A, color: K.cssVar("--s0"), label: "a" }], { vlines: [{ x: P.theta, label: "now" }, { x: Math.atan(P.mu) * 180 / Math.PI, label: "tan θ = μ", color: K.cssVar("--s2"), row: 1 }], hlines: [{ y: 0 }] });
    chB.opts.title = "Friction force for every angle"; chB.opts.xLabel = "θ (°)"; chB.opts.yLabel = "F (N)"; chB.draw([{ pts: Fr, color: K.cssVar("--s4"), label: "friction" }], { vlines: [{ x: P.theta }] });
  } else {
    const A = [], T = []; for (let m = 0.5; m <= 10; m += 0.25) { const q = P.setup === "table" ? table(Object.assign({}, P, { m2: m })) : atwood(Object.assign({}, P, { m2: m })); A.push([m, q.a]); T.push([m, q.T]); }
    chA.opts.title = "Acceleration for every hanging mass m₂"; chA.opts.xLabel = "m₂ (kg)"; chA.opts.yLabel = "a (m s⁻²)"; chA.draw([{ pts: A, color: K.cssVar("--s0"), label: "a" }], { hlines: [{ y: g, label: "g", color: K.cssVar("--muted") }, { y: 0 }], vlines: [{ x: P.m2 }] });
    chB.opts.title = "Tension for every hanging mass m₂"; chB.opts.xLabel = "m₂ (kg)"; chB.opts.yLabel = "T (N)"; chB.draw([{ pts: T, color: K.cssVar("--s1"), label: "T" }, { pts: T.map(p => [p[0], p[0] * g]), color: K.cssVar("--s3"), dash: [5, 4], label: "weight of B" }], { vlines: [{ x: P.m2 }] });
  }
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && (P.setup === "slope" || P.setup === "beam")) set({}); else { if (v === "std") { P.mu = 0; C.mu.set(0); } showCtl(); } };
set({});
ui.tip("Arrows show every force on each body, to scale. Change the masses and watch a and T.", 7000);
