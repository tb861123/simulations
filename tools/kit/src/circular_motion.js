/* =====================================================================
   CIRCULAR MOTION
   Something moving in a circle at a steady speed is ACCELERATING,
   because its direction (and so its velocity) keeps changing. The
   acceleration points to the centre:
       v = ωr     a = v²/r = ω²r     F = ma = mv²/r = mω²r     T = 2π/ω
   That force must come from somewhere: the tension in a string, friction
   and the normal reaction on a banked track, or weight plus tension at
   the top of a loop. Take the force away and the object carries straight
   on along the tangent (Newton's first law).
   Four situations:
     1. a ball whirled on a string (seen from above)
     2. a car on a banked bend
     3. a ball on a string in a vertical circle (loop the loop)
     4. a conical pendulum
   g = 9.81 m/s². Motion in the loop is worked out step by step (RK4).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const G = 9.81, D2R = Math.PI / 180;
// banked bend: fastest and slowest speeds without skidding (tan θ ± μ), and the ideal speed needing no friction
function bankLimits(r, th, mu) {
  const t = Math.tan(th * D2R), vmax = mu * t >= 1 ? Infinity : Math.sqrt(r * G * (t + mu) / (1 - mu * t)), v2 = r * G * (t - mu) / (1 + mu * t);
  return { vmax, vmin: v2 > 0 ? Math.sqrt(v2) : 0, ideal: Math.sqrt(r * G * t) };
}
// the forces on the car (per kg): N = g cos θ + (v²/r) sin θ; friction up the slope F = g sin θ − (v²/r) cos θ (negative = down the slope)
function bankForces(r, th, v) { const c = Math.cos(th * D2R), s = Math.sin(th * D2R), a = v * v / r; return { N: G * c + a * s, F: G * s - a * c, a }; }
// loop the loop: one RK4 step for a ball on a taut string (θ measured from the bottom)
function loopStep(st, r, dt) {
  const f = (th, w) => [w, -G / r * Math.sin(th)];
  const [a1, b1] = f(st.th, st.w), [a2, b2] = f(st.th + a1 * dt / 2, st.w + b1 * dt / 2), [a3, b3] = f(st.th + a2 * dt / 2, st.w + b2 * dt / 2), [a4, b4] = f(st.th + a3 * dt, st.w + b3 * dt);
  st.th += dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4); st.w += dt / 6 * (b1 + 2 * b2 + 2 * b3 + b4);
}
const loopTension = (m, r, vb, th) => { const v2 = vb * vb - 2 * G * r * (1 - Math.cos(th)); return { v2, T: m * v2 / r + m * G * Math.cos(th) }; };
// the furthest angle (degrees from the bottom) the ball reaches with the string taut: 360 = round the loop
function loopAngle(r, vb) {
  if (vb * vb >= 5 * G * r) return 360;
  if (vb * vb <= 2 * G * r) return Math.acos(1 - vb * vb / (2 * G * r)) / D2R;
  return Math.acos((2 * G * r - vb * vb) / (3 * G * r)) / D2R;
}
// simulated version of the same (step by step until the string goes slack or the ball swings back)
function loopSim(r, vb) {
  const st = { th: 0, w: vb / r }; let mx = 0;
  for (let k = 0; k < 40000; k++) { loopStep(st, r, 0.0005); mx = Math.max(mx, st.th); if (st.th >= 2 * Math.PI) return 360; const v = st.w * r, T = v * v / r + G * Math.cos(st.th); if (T < 0) return st.th / D2R; if (st.w <= 0) return mx / D2R; }
  return mx / D2R;
}
const conePeriod = (L, th) => 2 * Math.PI * Math.sqrt(L * Math.cos(th * D2R) / G);

// ---------------- The page ----------------
const P = { mode: "string", r: 1, w: 4, m: 0.5, snap: false, Fmax: 20, frame: "lab", br: 50, bth: 20, bv: 20, mu: 0.7, lr: 2, lvb: 10, lm: 0.5, cL: 1, cth: 30, cm: 0.5 };
let rnd = K.rng(Date.now() % 99991 + 7), speed = 1, t = 0, ang = 0, trail = [], snapped = null, car = null, loop = null, cone = 0, xyHist = [];
const ui = K.app({
  title: "Circular Motion", subject: "Physics",
  blurb: "Whirling, banking, looping and swinging: why moving in a circle needs a force towards the centre",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) does not name circular motion, so Standard uses the ideas behind it: velocity as a vector (changing direction is an acceleration), resultant force and F = ma, Newton's first law (Section 1), and orbital speed = 2πr/T (Section 8(b)).", adv: "WJEC Eduqas A level Physics, Component 1, circular motion: radians and angular velocity ω, v = ωr, T = 2π/ω, centripetal acceleration v²/r = ω²r and force mv²/r; banked tracks, vertical circles, the conical pendulum. Rotating frames and centrifugal force are beyond the spec." } },
  missions: [
    { title: "Speed in a circle", q: "The ball goes round a 1 m circle. Time one turn (the period T). Work out its speed with v = 2πr/T. Check against the readout.", hint: "Distance in one turn = circumference = 2πr = 6.28 m. Speed = distance ÷ time = 2πr/T. The speed stays the same, but the direction keeps changing.", setup() { set({ mode: "string", r: 1, w: 2 }); } },
    { title: "Let go!", q: "Press 'Snap the string'. Which way does the ball go? Why?", hint: "Straight on along the tangent, the direction it was moving at that instant. With no force on it, it carries on in a straight line at constant speed (Newton's first law). The string was the only thing pulling it towards the centre.", setup() { set({ mode: "string", r: 1.2, w: 3 }); } },
    { title: "Faster needs more force", q: "Double the speed of the ball (double ω). How much bigger is the force the string must supply?", hint: "F = mv²/r: double v and the force goes up 2² = 4 times. That is why a car going twice as fast round a bend needs four times as much grip.", setup() { set({ mode: "string", r: 1, w: 3 }); } },
    { title: "Strong enough string?", q: "Give the string a breaking strength of 20 N. Speed it up slowly. At what ω does it snap? Check with F = mω²r.", hint: "It snaps when mω²r reaches 20 N: ω = √(20 ÷ (0.5 × 1)) = 6.3 rad/s. Then the ball flies off along the tangent.", setup() { set({ mode: "string", r: 1, w: 3, snap: true, Fmax: 20 }); } },
    { title: "Round the bend", q: "A car takes a 50 m bend banked at 20°. Find the fastest safe speed with μ = 0.7. What happens above it?", hint: "Above v_max the friction needed to keep the car on its circle is more than the tyres can give, so it skids outwards (it moves in a bigger circle, as if trying to go straight on). Banking helps: part of the normal reaction points towards the centre.", setup() { set({ mode: "bank", br: 50, bth: 20, bv: 25 }); } },
    { title: "Loop the loop", q: "With a 2 m loop, find the smallest speed at the bottom that takes the ball all the way round. What happens if it is too slow?", hint: "Just making it: the string goes slack at the top when the speed there is √(gr), which needs √(5gr) = 9.9 m/s at the bottom. Slower than that, the string goes slack part way up and the ball falls inwards as a projectile.", setup() { set({ mode: "loop", lr: 2, lvb: 8 }); } },
    { title: "Conical pendulum", q: "Swing the 1 m pendulum at 30°, then 60°. How does the period change? Does the mass matter?", hint: "T = 2π√(L cos θ/g): a bigger angle means a shorter period (0.55 s faster at 60°). The mass cancels out, just as for a simple pendulum: tension and weight both scale with m.", setup() { set({ mode: "cone", cL: 1, cth: 30 }); } },
    { lvl: "adv", title: "Radians and ω", q: "Set ω = 2π rad/s. What is the period? Use v = ωr and a = ω²r to find v and a for r = 1.5 m.", hint: "T = 2π/ω = 1 s. v = ωr = 9.42 m/s; a = ω²r = 59.2 m/s² (6 g), towards the centre.", setup() { set({ mode: "string", r: 1.5, w: 6.28 }); } },
    { lvl: "adv", title: "Tension in a vertical circle", q: "For the 2 m loop at 12 m/s, find the tension at the bottom and at the top (m = 0.5 kg). Why the difference?", hint: "Bottom: T − mg = mv²/r, T = 0.5 × 144/2 + 4.9 = 40.9 N. Top: v² = 144 − 4gr = 65.5, T + mg = mv²/r, T = 16.4 − 4.9 = 11.5 N. At the top weight helps provide the centripetal force; at the bottom the string has to overcome it.", setup() { set({ mode: "loop", lr: 2, lvb: 12, lm: 0.5 }); } },
    { lvl: "adv", title: "The rotating frame", q: "Switch to the rotating frame. Why does it look as if a 'centrifugal force' pulls the ball outwards?", hint: "In a frame that turns with the ball, the ball is still, so it looks as if an outward force balances the tension. That 'force' is not real: it is the effect of the frame accelerating. In the real (inertial) frame there is only the inward tension. (Beyond the spec.)", setup() { set({ mode: "string", r: 1, w: 3, frame: "rot" }); } }
  ],
  batch: [
    { title: "Whirling bung: is F = mω²r?", question: "A 25 g bung is whirled at r = 0.8 m, held by a 100 g hanging mass (tension Mg = 0.981 N). Does mω²r equal Mg?", how: "Each run: one student times 10 turns with a stopwatch (each press off by up to about ±0.15 s), then works out ω and F = mω²r.", yLabel: "F = mω²r (N)", reps: 100, bins: 20, theory: 0.1 * G, theoryLabel: "Mg", run: (x, r) => { const m = 0.025, rr = 0.8, w = Math.sqrt(0.1 * G / (m * rr)), tm = 10 * 2 * Math.PI / w + 0.15 * r.gauss() - 0.15 * r.gauss(), wm = 10 * 2 * Math.PI / tm; return m * wm * wm * rr; }, note: "The results scatter evenly around Mg: the centripetal force is supplied by the tension, which is the weight of the hanging mass. Timing 10 turns instead of 1 makes the reaction-time error 10 times less important." },
    { title: "Bung period against radius", question: "With the same hanging mass, how does the period depend on the radius?", how: "25 g bung, 100 g hanging mass, r = 0.2 to 1.2 m; 10 turns timed. Theory: T = 2π√(mr ÷ Mg) ∝ √r.", xLabel: "radius (m)", yLabel: "period T (s)", xs: [0.2, 0.4, 0.6, 0.8, 1, 1.2], reps: 5, theory: x => 2 * Math.PI * Math.sqrt(0.025 * x / (0.1 * G)), theoryLabel: "2π√(mr/Mg)", run: (x, r) => { const T = 2 * Math.PI * Math.sqrt(0.025 * x / (0.1 * G)); return (10 * T + 0.15 * r.gauss() - 0.15 * r.gauss()) / 10; }, note: "Doubling r multiplies T by √2: the same force must give the bung a bigger circle, so it goes round more slowly." },
    { title: "Conical pendulum: does mass matter?", question: "A 1 m conical pendulum swinging at 30°: does the mass change the period?", how: "Masses 50 g to 2 kg; 10 swings timed (±0.15 s per press). Theory: T = 2π√(L cos θ/g).", xLabel: "mass (kg)", yLabel: "period (s)", xs: [0.05, 0.1, 0.25, 0.5, 1, 2], reps: 5, fit: true, theory: () => conePeriod(1, 30), theoryLabel: "2π√(L cos θ/g)", run: (x, r) => (10 * conePeriod(1, 30) + 0.15 * r.gauss() - 0.15 * r.gauss()) / 10, note: "A flat line: the mass cancels. Both the tension and the weight are proportional to m, so the acceleration does not depend on it." },
    { title: "Conical pendulum: period against angle", question: "How does the period of a 1 m conical pendulum change with its angle?", how: "Angles 5° to 80°; 10 swings timed.", xLabel: "angle from vertical (°)", yLabel: "period (s)", xs: [5, 15, 25, 35, 45, 55, 65, 75, 80], reps: 4, theory: x => conePeriod(1, x), theoryLabel: "2π√(L cos θ/g)", run: (x, r) => (10 * conePeriod(1, x) + 0.15 * r.gauss() - 0.15 * r.gauss()) / 10, note: "At small angles it matches a simple pendulum (2.0 s); at large angles it speeds up, as cos θ falls." },
    { title: "Loop the loop: is √(5gr) the minimum?", question: "How far round a 2 m loop does the ball get with the string taut, for different speeds at the bottom?", how: "Step-by-step simulation; speed at the bottom ±0.05 m/s. 360° = all the way round. Theory from energy and T = mv²/r + mg cos θ.", xLabel: "speed at the bottom (m/s)", yLabel: "angle reached with the string taut (°)", xs: [3, 4, 5, 6, 7, 8, 9, 9.5, 10, 11, 12], reps: 3, yMin: 0, theory: x => loopAngle(2, x), theoryLabel: "theory", run: (x, r) => loopSim(2, x + 0.05 * r.gauss()), note: "Below √(2gr) = 6.3 m/s it swings back like a pendulum. Between that and √(5gr) = 9.9 m/s the string goes slack part way up. From 9.9 m/s it goes all the way round." },
    { title: "Banked bend: fastest safe speed", question: "How does banking a 50 m bend change the fastest safe speed, when tyre grip varies from car to car?", how: "Bank angle 0° to 40°; μ = 0.7 on average, ±0.08 from car to car. Theory with μ = 0.7.", xLabel: "bank angle (°)", yLabel: "fastest safe speed (m/s)", xs: [0, 5, 10, 15, 20, 25, 30, 35, 40], reps: 6, theory: x => bankLimits(50, x, 0.7).vmax, theoryLabel: "μ = 0.7", run: (x, r) => { const v = bankLimits(50, x, Math.max(0.1, 0.7 + 0.08 * r.gauss())).vmax; return isFinite(v) ? v : null; }, note: "Banking raises the safe speed a lot: part of the normal reaction pushes the car towards the centre. The spread grows with angle because the formula becomes very sensitive to μ when μ tan θ approaches 1." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 1", text: "Velocity is speed in a given direction (a vector). Moving in a circle at constant speed, the direction keeps changing, so the velocity changes: the object is accelerating." },
      { lvl: "std", tag: "4PH1 1", text: "A resultant force is needed for any acceleration (F = ma). For circular motion it points towards the centre (centripetal force): from tension, friction, gravity or a normal reaction." },
      { lvl: "std", tag: "4PH1 1", text: "Remove the force and the object continues in a straight line along the tangent (Newton's first law)." },
      { lvl: "std", tag: "4PH1 8(b)", text: "Orbital speed = 2πr ÷ T (distance round the circle ÷ time for one orbit)." },
      { lvl: "adv", tag: "Eduqas circular", text: "Angular velocity ω = Δθ/Δt (rad/s); v = ωr; T = 2π/ω; f = 1/T. One revolution = 2π radians." },
      { lvl: "adv", tag: "Eduqas circular", text: "Centripetal acceleration a = v²/r = ω²r; force F = mv²/r = mω²r, always towards the centre; it does no work (it is perpendicular to the motion)." },
      { lvl: "adv", tag: "Eduqas circular", text: "Vertical circle on a string: T = mv²/r + mg cos θ (θ from the bottom). At the top, the string stays taut if v ≥ √(gr), which needs v ≥ √(5gr) at the bottom." },
      { lvl: "adv", tag: "Eduqas circular", text: "Banked track with no friction: tan θ = v²/(rg). Conical pendulum: ω² = g/(L cos θ), tension = mg/cos θ." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `A ball goes round a circle of radius ${P.r} m in ${(2 * Math.PI / P.w).toFixed(2)} s. Calculate its speed.`, ans: () => `<ul><li>v = 2πr ÷ T = 2π × ${P.r} ÷ ${(2 * Math.PI / P.w).toFixed(2)}</li><li>= ${(P.w * P.r).toFixed(2)} m/s</li></ul>` },
      { lvl: "std", marks: 2, q: "A ball moves in a circle at a constant speed. Explain why it is accelerating.", ans: "<ul><li>its direction is changing, so its velocity is changing</li><li>acceleration is the rate of change of velocity</li></ul>" },
      { lvl: "std", marks: 2, q: "The string breaks. Describe the path of the ball, and explain it.", ans: "<ul><li>a straight line along the tangent (at the speed it had)</li><li>there is no longer a (resultant) force on it, so it does not accelerate</li></ul>" },
      { lvl: "std", marks: 3, q: "The Moon orbits at 3.84 × 10⁸ m from the Earth every 27.3 days. Calculate its orbital speed.", ans: "<ul><li>T = 27.3 × 24 × 3600 = 2.36 × 10⁶ s</li><li>v = 2πr/T = 2π × 3.84 × 10⁸ ÷ 2.36 × 10⁶</li><li>= 1020 m/s (about 1 km/s)</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A ${P.m} kg mass moves in a circle of radius ${P.r} m at ${P.w} rad/s. Find its speed, the centripetal force and the period.`, ans: () => `<ul><li>v = ωr = ${(P.w * P.r).toFixed(2)} m/s</li><li>F = mω²r = ${(P.m * P.w * P.w * P.r).toFixed(2)} N</li><li>T = 2π/ω = ${(2 * Math.PI / P.w).toFixed(3)} s</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `Find the ideal banking angle for a bend of radius ${P.br} m at ${P.bv} m/s (no friction needed).`, ans: () => `<ul><li>tan θ = v²/(rg) = ${P.bv}² ÷ (${P.br} × 9.81)</li><li>= ${(P.bv * P.bv / (P.br * G)).toFixed(3)}</li><li>θ = ${(Math.atan(P.bv * P.bv / (P.br * G)) / D2R).toFixed(1)}°</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `Show that the minimum speed at the bottom of a vertical circle of radius ${P.lr} m is √(5gr), and calculate it.`, ans: () => `<ul><li>at the top, T = 0: mg = mv²/r, so v_top² = gr</li><li>energy: v_bottom² = v_top² + 2g(2r) = 5gr</li><li>v = √(5 × 9.81 × ${P.lr}) = ${Math.sqrt(5 * G * P.lr).toFixed(2)} m/s</li></ul>` }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Ball on a string: v = ωr, a = ω²r, F = mω²r, T = 2π/ω. When the string snaps (or the force needed exceeds its strength) the ball moves in a straight line along the tangent at constant speed. Very fast motion is slowed on screen (shown in the corner).</li>
<li>Banked bend (per kg): N = g cos θ + (v²/r) sin θ; friction needed along the slope F = (v²/r) cos θ − g sin θ (positive: down the slope, towards the inside edge). It skids when |F| > μN. v_max² = rg(tan θ + μ)/(1 − μ tan θ), v_min² = rg(tan θ − μ)/(1 + μ tan θ); ideal speed v² = rg tan θ.</li>
<li>Vertical circle: θ̈ = −(g/r) sin θ while the string is taut (RK4, 0.5 ms steps); T = mv²/r + mg cos θ. When T would be negative the string goes slack and the ball moves as a projectile until the string is taut again (then its outward velocity is lost).</li>
<li>Conical pendulum: ω² = g/(L cos θ), tension = mg/cos θ, r = L sin θ.</li></ul>
<h3>Left out</h3>
<ul><li>Air resistance, friction at the pivot, the mass and stretch of the string, tyre deformation and the jerk when a slack string goes tight.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/circular-motion.html">original/circular-motion.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("Situation");
ctl.mode = K.seg(g, { value: "string", options: [["string", "⭕ Ball on a string"], ["bank", "🏎 Banked bend"], ["loop", "🎢 Vertical circle"], ["cone", "🔻 Conical pendulum"]], on: v => set({ mode: v }) });
grp.string = g = ui.group("Ball on a string");
ctl.r = K.slider(g, { label: "Radius r", min: 0.1, max: 3, step: 0.05, value: 1, unit: "m", on: v => { P.r = v; reset1(); } });
ctl.w = K.slider(g, { label: "Angular velocity ω", min: 0.5, max: 20, step: 0.1, value: 4, unit: "rad/s", on: v => { P.w = v; } });
ctl.m = K.slider(g, { label: "Mass m", min: 0.01, max: 5, step: 0.01, value: 0.5, unit: "kg", on: v => P.m = v });
ctl.snap = K.toggle(g, { label: "Give the string a breaking strength", value: false, on: v => { P.snap = v; ctl.Fmax.el.style.display = v ? "" : "none"; } });
ctl.Fmax = K.slider(g, { label: "Breaking strength", min: 1, max: 200, step: 1, value: 20, unit: "N", on: v => P.Fmax = v });
ctl.frame = K.seg(g, { label: "Seen from", value: "lab", options: [["lab", "Still (inertial) frame"], ["rot", "Rotating frame"]], on: v => P.frame = v });
let rs = K.row(g); K.btn(rs, "✂ Snap the string", () => doSnap(), "primary"); K.btn(rs, "↺ New string", () => reset1());
grp.bank = g = ui.group("Banked bend");
ctl.br = K.slider(g, { label: "Radius of the bend", min: 20, max: 500, step: 5, value: 50, unit: "m", on: v => { P.br = v; car = null; } });
ctl.bth = K.slider(g, { label: "Bank angle θ", min: 0, max: 45, step: 1, value: 20, unit: "°", on: v => { P.bth = v; car = null; } });
ctl.bv = K.slider(g, { label: "Speed", min: 1, max: 90, step: 0.5, value: 20, unit: "m/s", on: v => { P.bv = v; car = null; } });
ctl.mu = K.slider(g, { label: "Tyre grip μ", min: 0, max: 1.2, step: 0.05, value: 0.7, on: v => { P.mu = v; car = null; } });
grp.loop = g = ui.group("Vertical circle");
ctl.lr = K.slider(g, { label: "Radius", min: 0.5, max: 5, step: 0.1, value: 2, unit: "m", on: v => { P.lr = v; loop = null; } });
ctl.lvb = K.slider(g, { label: "Speed at the bottom", min: 1, max: 16, step: 0.1, value: 10, unit: "m/s", on: v => { P.lvb = v; loop = null; } });
ctl.lm = K.slider(g, { label: "Mass", min: 0.1, max: 2, step: 0.1, value: 0.5, unit: "kg", on: v => P.lm = v });
K.btn(K.row(g), "▶ Launch again", () => { loop = null; }, "primary");
grp.cone = g = ui.group("Conical pendulum");
ctl.cL = K.slider(g, { label: "String length L", min: 0.2, max: 3, step: 0.05, value: 1, unit: "m", on: v => P.cL = v });
ctl.cth = K.slider(g, { label: "Angle from vertical θ", min: 5, max: 80, step: 1, value: 30, unit: "°", on: v => P.cth = v });
ctl.cm = K.slider(g, { label: "Mass", min: 0.05, max: 2, step: 0.05, value: 0.5, unit: "kg", on: v => P.cm = v });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.1, max: 2, step: 0.05, value: 1, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function reset1() { snapped = null; trail = []; }
function doSnap() { if (snapped) return; const v = P.w * P.r; snapped = { x: P.r * Math.cos(ang), y: P.r * Math.sin(ang), vx: -v * Math.sin(ang), vy: v * Math.cos(ang), t: 0 }; }
function set(o) {
  Object.assign(P, { r: 1, w: 4, m: 0.5, snap: false, Fmax: 20, frame: "lab", br: 50, bth: 20, bv: 20, mu: 0.7, lr: 2, lvb: 10, lm: 0.5, cL: 1, cth: 30, cm: 0.5 }, o);
  for (const k of ["r", "w", "m", "Fmax", "br", "bth", "bv", "mu", "lr", "lvb", "lm", "cL", "cth", "cm"]) ctl[k].set(P[k]);
  ctl.mode.set(P.mode); ctl.snap.set(P.snap); ctl.frame.set(P.frame); ctl.Fmax.el.style.display = P.snap ? "" : "none";
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none";
  reset1(); car = null; loop = null; t = 0; xyHist = [];
  relabel({ string: ["speed v = ωr", "acceleration v²/r", "force needed mω²r", "period T = 2π/ω", "string"], bank: ["force needed towards the centre", "ideal speed (no friction)", "safe speeds", "grip needed (friction ÷ N)", "what happens"], loop: ["speed now", "tension now", "minimum at the bottom √(5gr)", "angle round", "string"], cone: ["radius of circle r = L sin θ", "angular velocity ω", "period", "tension mg/cos θ", "speed"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrow(c, x, y, dx, dy, col, lab) { const L = Math.hypot(dx, dy); if (L < 2) return; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); const a = Math.atan2(dy, dx); c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx - 10 * Math.cos(a - 0.4), y + dy - 10 * Math.sin(a - 0.4)); c.lineTo(x + dx - 10 * Math.cos(a + 0.4), y + dy - 10 * Math.sin(a + 0.4)); c.fill(); if (lab) TX(c, lab, x + dx + 6 * Math.cos(a), y + dy + 6 * Math.sin(a) + 4, col, "left", "600 12px"); }
const slow = () => Math.min(1, 2.5 / Math.max(P.w, 0.1));                    // slow very fast motion on screen
function drawString(c, w, h) {
  const cx = w / 2, cy = h / 2, sc = Math.min(w, h) * 0.38 / Math.max(P.r, 1), R = P.r * sc, rot = P.frame === "rot" && !snapped, a = rot ? -Math.PI / 2 : ang;
  c.strokeStyle = "#3a4560"; c.setLineDash([5, 5]); c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#56607a"; c.beginPath(); c.arc(cx, cy, 6, 0, 6.3); c.fill();
  if (!rot) { c.strokeStyle = "rgba(111,177,255,0.4)"; c.beginPath(); trail.forEach((p, i) => i ? c.lineTo(cx + p[0] * sc, cy - p[1] * sc) : c.moveTo(cx + p[0] * sc, cy - p[1] * sc)); c.stroke(); }
  let bx, by;
  if (snapped) { bx = cx + snapped.x * sc; by = cy - snapped.y * sc; c.strokeStyle = "#ff5d6c"; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + (snapped.x0 ?? snapped.x) * sc * 0.4, cy - (snapped.y0 ?? snapped.y) * sc * 0.4); c.stroke(); c.setLineDash([]); TX(c, "string snapped: the ball carries on along the tangent", 20, 50, "#ff5d6c", "left", "600 13px"); arrow(c, bx, by, snapped.vx / (P.w * P.r) * 60, -snapped.vy / (P.w * P.r) * 60, "#6fb1ff", "v"); }
  else { bx = cx + R * Math.cos(a); by = cy - R * Math.sin(a); c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(bx, by); c.stroke();
    if (!rot) arrow(c, bx, by, -Math.sin(a) * 60, -Math.cos(a) * 60, "#6fb1ff", "v");
    arrow(c, bx, by, (cx - bx) / R * 55, (cy - by) / R * 55, "#ff8a70", "F, a");
    if (rot) arrow(c, bx, by, -(cx - bx) / R * 55, -(cy - by) / R * 55, "#c9a0ff", "centrifugal (not a real force)"); }
  c.fillStyle = "#ffd166"; c.beginPath(); c.arc(bx, by, 8 + 4 * Math.cbrt(P.m), 0, 6.3); c.fill();
  c.fillStyle = "#eef2f8"; c.fillRect(20, h - 30, sc * 0.5, 3); TX(c, "0.5 m", 20, h - 36, "#eef2f8", "left", "11px");
  TX(c, "seen from above", 20, 26, "#eef2f8", "left", "600 13px"); if (slow() < 1) TX(c, `slowed × ${slow().toFixed(2)} on screen`, w - 20, 26, "#7d8aa5", "right", "11px");
  if (rot) TX(c, "rotating frame: the ball looks still, so an outward 'centrifugal force' seems to balance the tension", 20, 70, "#c9a0ff", "left", "12px");
}
function drawBank(c, w, h) {
  const L = bankLimits(P.br, P.bth, P.mu), f = bankForces(P.br, P.bth, P.bv), th = P.bth * D2R;
  // cross-section on the left
  const ox = w * 0.27, oy = h * 0.62, len = Math.min(w * 0.4, 300);
  c.strokeStyle = "#7d8aa5"; c.lineWidth = 6; c.beginPath(); c.moveTo(ox - len / 2 * Math.cos(th), oy + len / 2 * Math.sin(th)); c.lineTo(ox + len / 2 * Math.cos(th), oy - len / 2 * Math.sin(th)); c.stroke();
  c.save(); c.translate(ox, oy); c.rotate(-th); c.fillStyle = "#ff8a70"; c.fillRect(-30, -28, 60, 24); c.fillStyle = "#222"; c.beginPath(); c.arc(-18, -4, 6, 0, 6.3); c.arc(18, -4, 6, 0, 6.3); c.fill(); c.restore();
  const sc = 7, cxp = ox - 16 * Math.sin(th), cyp = oy - 16 * Math.cos(th);
  arrow(c, cxp, cyp, 0, G * sc, "#aab6cc", "W");
  arrow(c, cxp, cyp, -Math.sin(th) * f.N * sc, -Math.cos(th) * f.N * sc, "#6fb1ff", "N");
  const ff = Math.abs(f.F) > Math.min(Math.abs(f.F), P.mu * f.N) + 1e-9 ? Math.sign(f.F) * P.mu * f.N : f.F;
  arrow(c, cxp, cyp, Math.cos(th) * ff * sc, -Math.sin(th) * ff * sc, "#7fe3a0", "friction");
  arrow(c, cxp, cyp - 50, -Math.min(f.a, 30) * sc, 0, "#ff5d6c", "resultant → centre");
  TX(c, "← centre of the bend", ox - len / 2, oy + 60, "#7d8aa5", "left", "11px"); TX(c, `${P.bth}° bank`, ox + len / 2 - 40, oy + 30, "#aab6cc", "left", "12px");
  // top view on the right: the car goes round; it drifts out (too fast) or slides in (too slow)
  const tx = w * 0.72, ty = h * 0.45, R0 = Math.min(w * 0.18, h * 0.32);
  c.strokeStyle = "#3a4560"; c.lineWidth = 18; c.beginPath(); c.arc(tx, ty, R0, 0, 6.3); c.stroke(); c.lineWidth = 1;
  if (!car) car = { a: 0, R: R0, out: 0 };
  const status = P.bv > L.vmax ? "skidding outwards: not enough grip" : P.bv < L.vmin ? "sliding down the bank: too slow" : "safe: friction can supply the difference";
  const cx = tx + car.R * Math.cos(car.a), cy = ty - car.R * Math.sin(car.a); c.fillStyle = "#ff8a70"; c.beginPath(); c.arc(cx, cy, 8, 0, 6.3); c.fill();
  TX(c, "top view", tx - R0 - 30, ty - R0 + 10, "#eef2f8", "center", "600 12px"); TX(c, status, tx, ty + R0 + 40, P.bv > L.vmax || P.bv < L.vmin ? "#ff5d6c" : "#7fe3a0", "center", "600 13px");
  TX(c, "cross-section (forces per kg, to scale)", 20, 26, "#eef2f8", "left", "600 13px");
}
function drawLoop(c, w, h) {
  const r = P.lr, sc = Math.min(w, h) * 0.36 / r, cx = w * 0.42, cy = h * 0.5, vb = P.lvb;
  // colour the circle: green where the string would be taut, red where slack (from energy)
  for (let i = 0; i < 120; i++) { const a0 = i / 120 * 2 * Math.PI, a1 = (i + 1) / 120 * 2 * Math.PI, q = loopTension(P.lm, r, vb, a0); c.strokeStyle = q.v2 < 0 ? "#3a4560" : q.T >= 0 ? "#2f7d55" : "#7d2f3a"; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, r * sc, Math.PI / 2 + a0, Math.PI / 2 + a1); c.stroke(); }
  c.lineWidth = 1; c.fillStyle = "#56607a"; c.beginPath(); c.arc(cx, cy, 5, 0, 6.3); c.fill();
  if (!loop) loop = { th: 0, w: vb / r, slack: false, x: 0, y: -r, vx: vb, vy: 0, done: false, max: 0 };
  const bx = cx + loop.x * sc, by = cy - loop.y * sc;
  c.strokeStyle = loop.slack ? "#ff5d6c" : "#c9d3e6"; c.setLineDash(loop.slack ? [4, 4] : []); c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#ffd166"; c.beginPath(); c.arc(bx, by, 10, 0, 6.3); c.fill();
  if (!loop.slack) { const v = loop.w * r, T = P.lm * v * v / r + P.lm * G * Math.cos(loop.th); arrow(c, bx, by, (cx - bx) / (r * sc) * Math.max(0, T) * 40 / (P.lm * G), (cy - by) / (r * sc) * Math.max(0, T) * 40 / (P.lm * G), "#ff8a70", "T"); }
  arrow(c, bx, by, 0, 40, "#aab6cc", "mg");
  TX(c, "green: string taut · red: string would be slack · grey: never reached", 20, 26, "#aab6cc", "left", "12px");
  if (loop.slack) TX(c, "string slack: the ball is a projectile, falling inwards", 20, 48, "#ff5d6c", "left", "600 13px");
}
function drawCone(c, w, h) {
  const L = P.cL, th = P.cth * D2R, sc = Math.min(w * 0.35, h * 0.6) / L, px = w * 0.4, py = 60, r = L * Math.sin(th), hh = L * Math.cos(th);
  const ex = r * sc, ey = r * sc * 0.28, bx = px + ex * Math.cos(cone), by = py + hh * sc + ey * Math.sin(cone);
  c.strokeStyle = "#3a4560"; c.setLineDash([5, 5]); c.beginPath(); c.ellipse(px, py + hh * sc, ex, ey, 0, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + hh * sc); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#56607a"; c.fillRect(px - 40, py - 10, 80, 10);
  c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
  c.fillStyle = "#ffd166"; c.beginPath(); c.arc(bx, by, 8 + 6 * Math.cbrt(P.cm), 0, 6.3); c.fill();
  const Tn = P.cm * G / Math.cos(th), s = 55 / (P.cm * G);
  arrow(c, bx, by, (px - bx) / (L * sc) * Tn * s, (py - by) / (L * sc) * Tn * s, "#6fb1ff", "tension");
  arrow(c, bx, by, 0, P.cm * G * s, "#aab6cc", "mg");
  arrow(c, bx, by + 30, (px - bx) / Math.max(1, Math.abs(px - bx)) * P.cm * G * Math.tan(th) * s, 0, "#ff8a70", "resultant mω²r");
  TX(c, `h = L cos θ = ${hh.toFixed(2)} m`, px + 8, py + hh * sc / 2, "#7d8aa5", "left", "11px"); TX(c, `r = ${r.toFixed(2)} m`, px + ex / 2, py + hh * sc + 16, "#7d8aa5", "center", "11px");
  TX(c, "side view (in perspective)", 20, 26, "#eef2f8", "left", "600 13px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ string: drawString, bank: drawBank, loop: drawLoop, cone: drawCone })[P.mode](c, w, h); }

// ---------------- Charts and readouts ----------------
function charts() {
  if (P.mode === "string") {
    chA.opts.title = "Seen side-on: x and y against time"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "position (m)"; chA.opts.xFmt = null;
    const t0 = Math.max(0, t - 4); chA.draw([{ pts: xyHist.map(p => [p[0], p[1]]), color: "#6fb1ff", label: "x" }, { pts: xyHist.map(p => [p[0], p[2]]), color: "#ff8a70", label: "y" }], { xMin: t0, xMax: t0 + 4, yMin: -P.r * 1.2, yMax: P.r * 1.2 });
    const pts = []; for (let w = 0.5; w <= 20; w += 0.25) pts.push([w, P.m * w * w * P.r]);
    chB.opts.title = "Force needed against ω (F = mω²r)"; chB.opts.xLabel = "ω (rad/s)"; chB.opts.yLabel = "force (N)"; chB.opts.xFmt = null;
    chB.draw([{ pts, color: "#ff8a70", label: `m = ${P.m} kg, r = ${P.r} m` }, { pts: [[P.w, P.m * P.w * P.w * P.r]], type: "dots", r: 6, color: "#ffd166" }], { xMin: 0, xMax: 20, yMin: 0, yMax: Math.max(P.m * P.w * P.w * P.r * 2, P.snap ? P.Fmax * 1.3 : 1), hlines: P.snap ? [{ y: P.Fmax, color: "#ff5d6c", label: "breaking strength" }] : [] });
    const F = P.m * P.w * P.w * P.r;
    read.set("a", (P.w * P.r).toFixed(2) + " m/s"); read.set("b", K.sig(P.w * P.w * P.r, 3) + " m/s² (" + K.sig(P.w * P.w * P.r / G, 2) + " g)"); read.set("c", K.sig(F, 3) + " N"); read.set("d", (2 * Math.PI / P.w).toFixed(3) + " s (" + K.sig(P.w * 60 / (2 * Math.PI), 3) + " rpm)"); read.set("e", snapped ? "snapped" : P.snap ? `${K.sig(F, 3)} of ${P.Fmax} N` : "taut");
    ui.hud(snapped ? "No force: straight on along the tangent" : "The string pulls the ball towards the centre");
  } else if (P.mode === "bank") {
    const mx = [], mn = [], id = []; for (let a = 0; a <= 45; a += 1) { const L = bankLimits(P.br, a, P.mu); mx.push([a, Math.min(isFinite(L.vmax) ? L.vmax : 200, 120)]); mn.push([a, L.vmin]); id.push([a, L.ideal]); }
    chA.opts.title = "Safe speeds"; chA.opts.xLabel = "bank angle (°)"; chA.opts.yLabel = "speed (m/s)"; chA.opts.xFmt = null;
    chA.draw([{ pts: mx, color: "#ff5d6c", label: "fastest" }, { pts: mn, color: "#6fb1ff", label: "slowest" }, { pts: id, color: "#7fe3a0", dash: [5, 4], label: "no friction needed" }, { pts: [[P.bth, P.bv]], type: "dots", r: 6, color: "#ffd166", label: "you" }], { xMin: 0, xMax: 45, yMin: 0, yMax: 120 });
    const fp = [], np = []; for (let v = 0; v <= 90; v += 1) { const f = bankForces(P.br, P.bth, v); fp.push([v, -f.F]); np.push([v, f.N]); }
    chB.opts.title = "Forces per kg against speed"; chB.opts.xLabel = "speed (m/s)"; chB.opts.yLabel = "N per kg"; chB.opts.xFmt = null;
    chB.draw([{ pts: np, color: "#6fb1ff", label: "normal reaction" }, { pts: fp, color: "#7fe3a0", label: "friction needed (+ down the slope)" }, { pts: np.map(p => [p[0], P.mu * p[1]]), color: "#ff5d6c", dash: [5, 4], label: "μN (grip available)" }], { xMin: 0, xMax: 90, vlines: [{ x: P.bv, color: "#ffd166", label: "now" }] });
    const L = bankLimits(P.br, P.bth, P.mu), f = bankForces(P.br, P.bth, P.bv);
    read.set("a", K.sig(f.a, 3) + " N per kg"); read.set("b", L.ideal.toFixed(1) + " m/s"); read.set("c", `${L.vmin.toFixed(1)} to ${isFinite(L.vmax) ? L.vmax.toFixed(1) : "any"} m/s`); read.set("d", (Math.abs(f.F) / f.N).toFixed(2) + ` (μ = ${P.mu})`);
    read.set("e", P.bv > L.vmax ? "skids outwards" : P.bv < L.vmin ? "slides down" : "holds the road");
    ui.hud(Math.abs(P.bv - L.ideal) < 1 ? "At the ideal speed the bank alone provides the centripetal force" : "Friction makes up the difference between the bank and what is needed");
  } else if (P.mode === "loop") {
    const tp = [], vp = []; for (let a = 0; a <= 360; a += 2) { const q = loopTension(P.lm, P.lr, P.lvb, a * D2R); if (q.v2 < 0) break; tp.push([a, q.T]); vp.push([a, Math.sqrt(q.v2)]); }
    const now = loop ? (loop.slack ? null : ((loop.th / D2R) % 360 + 360) % 360) : null;
    chA.opts.title = "Tension against angle"; chA.opts.xLabel = "angle from the bottom (°)"; chA.opts.yLabel = "tension (N)"; chA.opts.xFmt = null;
    chA.draw([{ pts: tp, color: "#ff8a70", label: "T = mv²/r + mg cos θ" }].concat(now != null ? [{ pts: [[now, loopTension(P.lm, P.lr, P.lvb, now * D2R).T]], type: "dots", r: 6, color: "#ffd166" }] : []), { xMin: 0, xMax: 360, hlines: [{ y: 0, color: "#ff5d6c", label: "slack below this" }] });
    chB.opts.title = "Speed against angle"; chB.opts.xLabel = "angle from the bottom (°)"; chB.opts.yLabel = "speed (m/s)"; chB.opts.xFmt = null;
    chB.draw([{ pts: vp, color: "#6fb1ff", label: "v² = v_b² − 2gr(1 − cos θ)" }], { xMin: 0, xMax: 360, yMin: 0 });
    const v = loop ? (loop.slack ? Math.hypot(loop.vx, loop.vy) : Math.abs(loop.w * P.lr)) : P.lvb, T = loop && !loop.slack ? P.lm * v * v / P.lr + P.lm * G * Math.cos(loop.th) : 0;
    read.set("a", v.toFixed(2) + " m/s"); read.set("b", loop && loop.slack ? "0 (slack)" : T.toFixed(1) + " N"); read.set("c", Math.sqrt(5 * G * P.lr).toFixed(2) + " m/s"); read.set("d", loop ? (loop.max / D2R).toFixed(0) + "°" : "–"); read.set("e", loop && loop.slack ? "slack" : "taut");
    ui.hud(P.lvb >= Math.sqrt(5 * G * P.lr) ? "Fast enough to go all the way round" : P.lvb * P.lvb <= 2 * G * P.lr ? "Too slow: it swings back like a pendulum" : "The string will go slack part way up");
  } else {
    const pp = [], sp = [], wp = []; for (let a = 1; a <= 85; a += 1) { pp.push([a, conePeriod(P.cL, a)]); sp.push([a, 2 * Math.PI * Math.sqrt(P.cL / G)]); wp.push([a, Math.sqrt(G / (P.cL * Math.cos(a * D2R)))]); }
    chA.opts.title = "Period against angle"; chA.opts.xLabel = "angle θ (°)"; chA.opts.yLabel = "period (s)"; chA.opts.xFmt = null;
    chA.draw([{ pts: pp, color: "#ff8a70", label: "2π√(L cos θ/g)" }, { pts: sp, color: "#56607a", dash: [5, 4], label: "simple pendulum" }, { pts: [[P.cth, conePeriod(P.cL, P.cth)]], type: "dots", r: 6, color: "#ffd166" }], { xMin: 0, xMax: 85, yMin: 0 });
    chB.opts.title = "ω against angle"; chB.opts.xLabel = "angle θ (°)"; chB.opts.yLabel = "ω (rad/s)"; chB.opts.xFmt = null;
    chB.draw([{ pts: wp, color: "#6fb1ff", label: "√(g/(L cos θ))" }, { pts: [[P.cth, Math.sqrt(G / (P.cL * Math.cos(P.cth * D2R)))]], type: "dots", r: 6, color: "#ffd166" }], { xMin: 0, xMax: 85, yMin: 0, yMax: 15 });
    const th = P.cth * D2R, w = Math.sqrt(G / (P.cL * Math.cos(th)));
    read.set("a", (P.cL * Math.sin(th)).toFixed(3) + " m"); read.set("b", w.toFixed(2) + " rad/s"); read.set("c", conePeriod(P.cL, P.cth).toFixed(3) + " s"); read.set("d", (P.cm * G / Math.cos(th)).toFixed(2) + " N"); read.set("e", (w * P.cL * Math.sin(th)).toFixed(2) + " m/s");
    ui.hud("The horizontal part of the tension provides the centripetal force");
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const d = dt * speed;
  if (P.mode === "string") {
    const ds = d * slow(); t += ds;
    if (snapped) { snapped.x += snapped.vx * ds; snapped.y += snapped.vy * ds; if (Math.hypot(snapped.x, snapped.y) > P.r * 4) { snapped = null; trail = []; } }
    else { ang += P.w * ds; trail.push([P.r * Math.cos(ang), P.r * Math.sin(ang)]); if (trail.length > 80) trail.shift(); if (P.snap && P.m * P.w * P.w * P.r > P.Fmax) { doSnap(); ui.tip(`Snap! It needed ${K.sig(P.m * P.w * P.w * P.r, 3)} N, more than the string's ${P.Fmax} N.`, 4000); } }
    xyHist.push([t, snapped ? snapped.x : P.r * Math.cos(ang), snapped ? snapped.y : P.r * Math.sin(ang)]); xyHist = xyHist.filter(p => p[0] > t - 4);
  } else if (P.mode === "bank" && car) {
    const L = bankLimits(P.br, P.bth, P.mu), R0 = Math.min(cv.w * 0.18, cv.h * 0.32); car.a += d * 1.2;
    if (P.bv > L.vmax) car.R = Math.min(R0 * 1.35, car.R + d * 12); else if (P.bv < L.vmin) car.R = Math.max(R0 * 0.7, car.R - d * 12); else car.R += (R0 - car.R) * 0.1;
  } else if (P.mode === "loop" && loop) {
    const r = P.lr, n = Math.ceil(d / 0.0005);
    for (let k = 0; k < n; k++) {
      const h = d / n;
      if (!loop.slack) { loopStep(loop, r, h); loop.max = Math.max(loop.max, loop.th); loop.x = r * Math.sin(loop.th); loop.y = -r * Math.cos(loop.th); const v = loop.w * r; if (v * v / r + G * Math.cos(loop.th) < 0) { loop.slack = true; loop.vx = v * Math.cos(loop.th); loop.vy = v * Math.sin(loop.th); } }
      else { loop.vy -= G * h; loop.x += loop.vx * h; loop.y += loop.vy * h; const dd = Math.hypot(loop.x, loop.y); if (dd >= r) { loop.x *= r / dd; loop.y *= r / dd; const th = Math.atan2(loop.x, -loop.y); const vt = loop.vx * Math.cos(th) + loop.vy * Math.sin(th); loop.th = th; loop.w = vt / r; loop.slack = false; } }
    }
  } else if (P.mode === "cone") cone += Math.sqrt(G / (P.cL * Math.cos(P.cth * D2R))) * d * 0.5;
}, () => { draw(); if (frame++ % 4 === 0) charts(); });
set({ mode: "string" });
ui.tip("Four situations at the top of the controls: a ball on a string, a banked bend, a vertical circle and a conical pendulum.", 7000);
