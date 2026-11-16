/* =====================================================================
   PROJECTILE MOTION
   A thrown ball moves sideways and up-and-down at the same time, and the
   two motions do not affect each other:
     * sideways (x): no force acts (without air), so the horizontal
       velocity vx never changes: x = vx × t
     * up and down (y): the weight pulls down, so vy changes by g every
       second: vy = u sin θ − g t,  y = h + u sin θ t − ½ g t²
   Put together, the path is a parabola.

   With air resistance (A level) the drag force ½ρC_D A v² acts against
   the velocity relative to the air, and spin adds a Magnus force at right
   angles to it. Those cannot be solved with a formula, so the model takes
   small time steps (Runge–Kutta, 5 ms each).
   ===================================================================== */
const RHO = 1.225;   // density of air at sea level, kg/m³
const OBJ = {        // mass (kg), diameter (m), drag coefficient
  football: { name: "football", m: 0.43, d: 0.22, cd: 0.25, col: "#f2f2f2" },
  golf: { name: "golf ball", m: 0.0459, d: 0.0427, cd: 0.25, col: "#ffffff" },
  tennis: { name: "tennis ball", m: 0.057, d: 0.067, cd: 0.55, col: "#d7f25a" },
  basket: { name: "basketball", m: 0.62, d: 0.24, cd: 0.47, col: "#ff8a3d" },
  shot: { name: "shot (4 kg)", m: 4, d: 0.11, cd: 0.47, col: "#9aa3b5" },
  shuttle: { name: "shuttlecock", m: 0.005, d: 0.066, cd: 0.6, col: "#fff6e0" }
};
const GRAV = { earth: ["Earth", 9.81], moon: ["Moon", 1.62], mars: ["Mars", 3.71], jupiter: ["Jupiter", 24.8] };
const rad = d => d * Math.PI / 180;

/* One flight. o = { v (m/s), ang (°), h (launch height, m), g, drag, obj, wind (m/s, + = tail wind), spin (rad/s, + = backspin) }
   Returns the path as [t, x, y, vx, vy] points, and the range, greatest height, time of flight and landing speed and angle. */
function fly(o) {
  const vx0 = o.v * Math.cos(rad(o.ang)), vy0 = o.v * Math.sin(rad(o.ang)), g = o.g, path = [[0, 0, o.h, vx0, vy0]];
  let res;
  if (!o.drag) {
    // no air: exact formulas.  T is when y = 0:  h + vy0 T − ½ g T² = 0
    const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * o.h)) / g, n = Math.max(40, Math.min(4000, Math.ceil(T / 0.005)));
    for (let i = 1; i <= n; i++) { const t = T * i / n; path.push([t, vx0 * t, i === n ? 0 : o.h + vy0 * t - 0.5 * g * t * t, vx0, vy0 - g * t]); }
    res = { T, R: vx0 * T, H: o.h + (vy0 > 0 ? vy0 * vy0 / (2 * g) : 0) };
  } else {
    const B = OBJ[o.obj], A = Math.PI * B.d * B.d / 4, kD = 0.5 * RHO * B.cd * A / B.m, kM = 0.5 * RHO * A * 0.5 * (B.d / 2) * (o.spin || 0) / B.m, w = o.wind || 0;
    // acceleration: gravity down, drag against the velocity through the air, Magnus force at right angles to it
    const acc = (vx, vy) => { const ux = vx - w, uy = vy, u = Math.hypot(ux, uy); return [-kD * u * ux - kM * uy, -g - kD * u * uy + kM * ux]; };
    let t = 0, x = 0, y = o.h, vx = vx0, vy = vy0, H = o.h; const dt = 0.005;
    while (t < 400) {
      const a1 = acc(vx, vy), a2 = acc(vx + a1[0] * dt / 2, vy + a1[1] * dt / 2), a3 = acc(vx + a2[0] * dt / 2, vy + a2[1] * dt / 2), a4 = acc(vx + a3[0] * dt, vy + a3[1] * dt);
      const nx = x + dt * (vx + dt / 6 * (a1[0] + a2[0] + a3[0])), ny = y + dt * (vy + dt / 6 * (a1[1] + a2[1] + a3[1]));
      const nvx = vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]), nvy = vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
      if (ny <= 0) { const f = y / (y - ny); t += f * dt; x += f * (nx - x); vx += f * (nvx - vx); vy += f * (nvy - vy); path.push([t, x, 0, vx, vy]); break; }
      t += dt; x = nx; y = ny; vx = nvx; vy = nvy; if (y > H) H = y; path.push([t, x, y, vx, vy]);
    }
    res = { T: t, R: x, H };
  }
  const L = path[path.length - 1]; res.vLand = Math.hypot(L[3], L[4]); res.angLand = Math.atan2(-L[4], L[3]) * 180 / Math.PI; res.path = path; return res;
}
// position on a path at time t (linear interpolation between stored points)
function at(path, t) {
  if (t <= 0) return path[0]; const L = path[path.length - 1]; if (t >= L[0]) return L;
  let lo = 0, hi = path.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m][0] < t) lo = m; else hi = m; }
  const a = path[lo], b = path[hi], f = (t - a[0]) / (b[0] - a[0]); return a.map((v, i) => v + (b[i] - v) * f);
}
// a launch from an imperfect launcher: random errors in speed (SD as a fraction) and angle (SD in degrees)
const shot = (o, r, sv = 0.01, sa = 0.5) => fly(Object.assign({}, o, { v: o.v * (1 + sv * r.gauss()), ang: o.ang + sa * r.gauss() }));
const B0 = { v: 15, ang: 45, h: 0, g: 9.81, drag: false, obj: "football", wind: 0, spin: 0 };

// ---------------- The page ----------------
const P = Object.assign({ planet: "earth", guide: false, arrows: true, marks: true, shadows: false, dropToo: false, target: 18 }, B0);
let F = null, t = 0, flying = false, kept = [], hits = 0, shots = 0, speed = 1, lastHit = null, view = null;
const ui = K.app({
  title: "Projectile Motion", subject: "Physics",
  blurb: "Two motions at once: steady sideways, accelerating downwards",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 1(b) movement and position (speed, acceleration, v² = u² + 2as, velocity–time graphs) and 1(c) forces (weight = mg, terminal velocity); kinetic and gravitational potential energy (section 4). Angled launches are treated as two straight-line motions.", adv: "WJEC Eduqas A level Physics, Component 1 Topic 2 Kinematics (f, g): independence of horizontal and vertical motion, projectiles with the suvat equations; terminal velocity (Dynamics). Drag and the Magnus effect are beyond the spec." } },
  missions: [
    { title: "Two motions at once", q: "Launch the ball with the shadows and time markers on. The shadow on the ground and the shadow on the wall each show one motion. Which one moves at a steady speed? Which one speeds up and slows down?", hint: "The ground shadow moves equal distances in equal times: the horizontal velocity never changes, because no force acts sideways. The wall shadow slows as it rises, stops at the top and speeds up as it falls: the weight gives a steady downward acceleration g. Look at the vₓ and vᵧ graph: vₓ is flat, vᵧ is a straight line sloping down at −9.81 m/s every second.", setup() { set({ shadows: true, v: 14, ang: 60 }); launch(); } },
    { title: "Dropped or thrown?", q: "From a 20 m cliff, throw a ball sideways and drop another at the same moment. Which lands first? Now throw it twice as fast.", hint: "They land together, whatever the throwing speed. Throwing sideways adds horizontal velocity but no vertical velocity, so the time to fall is set only by the height: t = √(2h/g) = 2.02 s for 20 m. Faster throws just go further in the same time.", setup() { set({ h: 20, ang: 0, v: 10, dropToo: true, shadows: true }); launch(); } },
    { title: "Which angle goes furthest?", q: "Keep the speed at 15 m/s and try 30°, 45° and 60°, keeping each path. Which goes furthest? What do you notice about 30° and 60°?", hint: "45° goes furthest on level ground with no air (22.9 m). 30° and 60° land in the same place: complementary angles give the same range, because the range is v² sin 2θ ÷ g and sin 60° = sin 120°. The high shot stays up longer but moves sideways more slowly.", setup() { set({ v: 15, ang: 30 }); launch(); } },
    { title: "Hit the target", q: "The flag is somewhere new each time you press 'Move the target'. Choose the angle, then find the speed that hits it first time by working it out: R = v² sin 2θ ÷ g.", hint: "Rearrange: v = √(R g ÷ sin 2θ). At 45°, sin 2θ = 1, so v = √(R g). For a target 25 m away, v = √(25 × 9.81) = 15.7 m/s. The aiming guide shows the path before you launch, if you want to check.", setup() { set({ v: 10, ang: 45 }); moveTarget(); } },
    { title: "On the Moon", q: "Kick the ball at the same speed and angle on Earth and on the Moon (g = 1.62 N/kg). How much further does it go, and for how long is it in the air?", hint: "Range and time of flight both depend on 1/g, so on the Moon the ball goes 9.81 ÷ 1.62 ≈ 6 times further and stays up 6 times longer; the greatest height is also 6 times greater. There is no air on the Moon either, so the formulas are exact there.", setup() { set({ v: 10, ang: 45 }); launch(); kept.push({ path: F.path, label: "Earth" }); setPlanet("moon"); launch(); } },
    { title: "Energy on the way", q: "Watch the energy graph during a flight. What happens to the kinetic energy at the top? Is it zero? What stays constant?", hint: "At the top the ball still moves sideways, so KE is not zero: it is ½ m vₓ². KE turns into GPE on the way up and back on the way down; with no air the total stays exactly constant. The speed at landing equals the launch speed (from the same height).", setup() { set({ v: 16, ang: 55 }); launch(); } },
    { lvl: "adv", title: "Air resistance changes the best angle", q: "Turn on air resistance and kick a football at 25 m/s. Find the angle that goes furthest. Is the path still symmetrical?", hint: "The best angle falls to about 40° and the range is about two-thirds of what it would be in a vacuum. The path is lopsided: it comes down more steeply than it went up, because drag has slowed the horizontal motion. Light objects with big areas (shuttlecocks) are worst affected: they fall almost vertically.", setup() { set({ drag: true, v: 25, ang: 45 }); launch(); kept.push({ path: fly(Object.assign({}, P, { drag: false })).path, label: "no air" }); } },
    { lvl: "adv", title: "Terminal velocity", q: "Drop a tennis ball from 100 m with air resistance. Watch vᵧ on the graph. What happens to it, and why?", hint: "It levels off at about 22 m/s: the terminal velocity, where drag ½ρC_D A v² equals the weight, so the resultant force and the acceleration are zero. v_T = √(2mg ÷ ρC_D A). Without air it would land at √(2gh) = 44 m/s.", setup() { set({ drag: true, obj: "tennis", h: 100, v: 0, ang: 0 }); launch(); } },
    { lvl: "adv", title: "Spin: the Magnus effect", q: "Hit a golf ball at 60 m/s and 12° with no spin, then with 300 rad/s of backspin. What does backspin do? Try topspin (negative).", hint: "Backspin drags air down behind the ball, so the air pushes the ball up: a lift force at right angles to the velocity. The ball climbs and carries much further. Topspin pushes it down, making it dip: tennis players use it to hit hard and still land in the court.", setup() { set({ drag: true, obj: "golf", v: 60, ang: 12, spin: 0 }); launch(); kept.push({ path: F.path, label: "no spin" }); P.spin = 300; ctl.spin.set(300); launch(); } }
  ],
  batch: [
    { title: "How much do shots scatter?", question: "A launcher fires at 10 m/s and 45°, but each shot has small random errors (2% in speed, 1° in angle). How much do the ranges scatter?", how: "200 shots, no air. Theory: the range with no error.", reps: 200, bins: 24, theory: 10 * 10 / 9.81, yLabel: "range (m)", run: (x, r) => shot(Object.assign({}, B0, { v: 10 }), r, 0.02, 1).R, note: "The ranges form a bell-shaped spread around the formula's value. Speed errors matter much more than angle errors at 45°, because the range is at its maximum there and barely changes with angle; but it goes as v², so a 2% speed error gives about a 4% range error." },
    { title: "Does the range grow as v²?", question: "At 45° with no air, how does the range depend on the launch speed?", how: "Speeds 2 to 30 m/s, 4 shots each, small random launch errors. Theory: R = v² sin 2θ ÷ g.", xLabel: "launch speed (m/s)", yLabel: "range (m)", xs: [2, 5, 8, 11, 14, 17, 20, 23, 26, 30], reps: 4, yMin: 0, theory: v => v * v / 9.81, run: (x, r) => shot(Object.assign({}, B0, { v: x }), r).R, note: "Doubling the speed makes the range four times as far: a curve, not a straight line. Plot range against v² and it would be straight, with gradient sin 2θ ÷ g." },
    { title: "Which angle goes furthest?", question: "At 15 m/s with no air, how does the range depend on the launch angle?", how: "Angles 5° to 85°, 4 shots each. Theory: R = v² sin 2θ ÷ g.", xLabel: "launch angle (°)", yLabel: "range (m)", xs: [5, 15, 25, 30, 35, 40, 45, 50, 55, 60, 65, 75, 85], reps: 4, yMin: 0, theory: a => 225 * Math.sin(rad(2 * a)) / 9.81, run: (x, r) => shot(Object.assign({}, B0, { ang: x }), r).R, note: "Symmetrical about 45°: angles that add up to 90° (30° and 60°, say) give the same range." },
    { title: "Launching from a height", question: "From the top of a 30 m cliff at 15 m/s, is 45° still the best angle?", how: "Angles 0° to 75°, 4 shots each, no air. Theory: R = v cos θ × (v sin θ + √(v² sin²θ + 2gh)) ÷ g.", xLabel: "launch angle (°)", yLabel: "range (m)", xs: [0, 10, 20, 25, 30, 35, 40, 45, 50, 60, 75], reps: 4, yMin: 0, theory: a => { const v = 15, s = Math.sin(rad(a)), c = Math.cos(rad(a)); return v * c * (v * s + Math.sqrt(v * v * s * s + 2 * 9.81 * 30)) / 9.81; }, run: (x, r) => shot(Object.assign({}, B0, { ang: x, h: 30 }), r).R, note: "The best angle is lower than 45° (about 28° here: tan θ = v ÷ √(v² + 2gh)), because the ball has extra time to fall and gains more by moving sideways faster. That is why shot putters, launching from about 2 m, release at about 37–40°." },
    { title: "Faster sideways, longer in the air?", question: "Thrown horizontally from a 20 m cliff, does a faster ball stay in the air longer?", how: "Horizontal launches at 0 to 30 m/s, 4 each, no air. Theory: t = √(2h ÷ g).", xLabel: "horizontal launch speed (m/s)", yLabel: "time of flight (s)", xs: [0, 5, 10, 15, 20, 25, 30], reps: 4, yMin: 0, theory: () => Math.sqrt(40 / 9.81), run: (x, r) => fly(Object.assign({}, B0, { v: x, ang: 0, h: 20 + 0.05 * r.gauss() })).T, note: "The same time at every speed: the vertical motion does not care about the horizontal motion. (The tiny scatter comes from a ±5 cm error in the height.)" },
    { lvl: "adv", title: "Air resistance and the best angle", question: "With air resistance, which angle sends a football (25 m/s) furthest?", how: "Angles 10° to 70°, 3 kicks each, with drag. The dashed line is the no-air range.", xLabel: "launch angle (°)", yLabel: "range (m)", xs: [10, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70], reps: 3, yMin: 0, theory: a => 625 * Math.sin(rad(2 * a)) / 9.81, theoryLabel: "no air", run: (x, r) => shot(Object.assign({}, B0, { v: 25, ang: x, drag: true }), r).R, note: "Drag cuts the range by about a third and moves the best angle down to about 40°, and the curve is no longer symmetrical." },
    { lvl: "adv", title: "Falling with air resistance", question: "How fast does a tennis ball hit the ground when dropped from different heights?", how: "Drops from 1 to 200 m with drag. Theory (dashed): the exact drag result v = v_T √(1 − e^(−2gh/v_T²)), with v_T = √(2mg ÷ ρC_D A).", xLabel: "drop height (m)", yLabel: "landing speed (m/s)", xs: [1, 5, 10, 20, 40, 60, 100, 150, 200], reps: 2, yMin: 0, theory: hh => { const B = OBJ.tennis, vt = Math.sqrt(2 * B.m * 9.81 / (RHO * B.cd * Math.PI * B.d * B.d / 4)); return vt * Math.sqrt(1 - Math.exp(-2 * 9.81 * hh / (vt * vt))); }, run: x => fly(Object.assign({}, B0, { v: 0, ang: 0, h: x, drag: true, obj: "tennis" })).vLand, note: "Rises quickly at first, then levels off at the terminal velocity (about 22 m/s). Without air it would keep rising as √(2gh): 63 m/s from 200 m." },
    { lvl: "adv", title: "Backspin and the golf drive", question: "How does backspin change the carry of a golf ball hit at 60 m/s and 12°?", how: "Spin from −200 (topspin) to 400 rad/s (backspin), 3 shots each, with drag.", xLabel: "backspin (rad/s)", yLabel: "range (m)", xs: [-200, -100, 0, 100, 200, 300, 400], reps: 3, yMin: 0, run: (x, r) => shot(Object.assign({}, B0, { v: 60, ang: 12, drag: true, obj: "golf", spin: x }), r).R, note: "Backspin gives lift and the ball carries much further; topspin makes it dive. Real drives use about 250–300 rad/s (2500–3000 rpm). Too much spin makes the ball balloon upwards and lose distance (not modelled here: the lift coefficient is kept constant)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 1.5", text: "Average speed = distance moved ÷ time taken. Velocity is speed in a given direction." },
      { lvl: "std", tag: "4PH1 1.6", text: "Acceleration = change in velocity ÷ time taken: a = (v − u) ÷ t. A falling object near the Earth accelerates at g = 9.81 m/s² (no air)." },
      { lvl: "std", tag: "4PH1 1.7", text: "v² = u² + 2as. A ball dropped from 20 m lands at √(2 × 9.81 × 20) = 19.8 m/s." },
      { lvl: "std", tag: "4PH1 1.10", text: "Velocity–time graph: the gradient is the acceleration, the area under it is the distance travelled." },
      { lvl: "std", tag: "4PH1 1.11", text: "Weight = mass × gravitational field strength: W = m g (g = 9.81 N/kg on Earth, 1.62 N/kg on the Moon)." },
      { lvl: "std", tag: "4PH1 1.23", text: "Falling objects reach terminal velocity when air resistance grows to equal the weight: the resultant force is zero." },
      { lvl: "std", tag: "4PH1 4.4", text: "KE = ½ m v², GPE = m g h. With no air the total stays constant: KE lost on the way up becomes GPE." },
      { lvl: "adv", tag: "Eduqas 1.2(f)", text: "Horizontal and vertical motions are independent. Horizontally: constant velocity u cos θ. Vertically: acceleration −g, initial velocity u sin θ." },
      { lvl: "adv", tag: "Eduqas 1.2(g)", text: "Time of flight on level ground T = 2u sin θ ÷ g; maximum height H = u² sin²θ ÷ 2g; range R = u² sin 2θ ÷ g, greatest at 45°." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Drag ½ρC_D A v² lowers the range and the best angle, and makes the path asymmetric. Spin adds a Magnus force at right angles to the velocity: backspin lifts, topspin dips." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `A ball moves sideways at a steady ${F ? F.path[0][3].toFixed(1) : "10.0"} m/s for ${F ? F.T.toFixed(2) : "2.00"} s. How far does it travel sideways?`, ans: () => `<ul><li>distance = speed × time = ${F ? F.path[0][3].toFixed(1) : "10.0"} × ${F ? F.T.toFixed(2) : "2.00"}</li><li>= ${F ? F.R.toFixed(1) : "20.0"} m</li></ul>` },
      { lvl: "std", marks: 3, q: "A ball is thrown straight up at 12 m/s. Calculate the greatest height it reaches (g = 9.81 m/s²).", ans: "<ul><li>v² = u² + 2as with v = 0 at the top, a = −9.81</li><li>0 = 144 − 2 × 9.81 × s</li><li>s = 144 ÷ 19.62 = 7.3 m</li></ul>" },
      { lvl: "std", marks: 2, q: "A ball rolls off a table at the same moment as a second ball is dropped from the same height. Explain which reaches the floor first.", ans: "<ul><li>They land at the same time</li><li>both start with zero vertical velocity and have the same vertical acceleration g; the horizontal motion does not affect the vertical motion</li></ul>" },
      { lvl: "std", marks: 3, q: "A football of mass 0.43 kg is kicked at 20 m/s. Calculate its kinetic energy, and the greatest height it could reach if all of it became GPE.", ans: "<ul><li>KE = ½ × 0.43 × 20² = 86 J</li><li>m g h = 86, so h = 86 ÷ (0.43 × 9.81)</li><li>= 20.4 m (it would have to be kicked straight up)</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe the motion of a skydiver from leaving the plane to reaching terminal velocity.", ans: "<ul><li>At first only weight acts, so they accelerate at about 9.8 m/s²</li><li>As speed increases, air resistance increases, so the resultant force and acceleration fall</li><li>When air resistance equals weight, the resultant force is zero and they fall at constant (terminal) velocity</li></ul>" },
      { lvl: "std", marks: 2, q: "An astronaut has a mass of 80 kg. Calculate her weight on the Moon (g = 1.62 N/kg).", ans: "<ul><li>W = m g = 80 × 1.62</li><li>= 130 N</li></ul>" },
      { lvl: "adv", marks: 4, q: () => `A ball is launched at ${P.v} m/s at ${P.ang}° above the horizontal from level ground (no air). Calculate the time of flight and the range.`, ans: () => { const s = Math.sin(rad(P.ang)), c = Math.cos(rad(P.ang)), T = 2 * P.v * s / P.g; return `<ul><li>vertical: u sin θ = ${(P.v * s).toFixed(2)} m/s; horizontal: u cos θ = ${(P.v * c).toFixed(2)} m/s</li><li>T = 2u sin θ ÷ g = ${T.toFixed(2)} s</li><li>R = u cos θ × T</li><li>= ${(P.v * c * T).toFixed(1)} m</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "A stone is thrown horizontally at 8.0 m/s from a cliff 45 m high. Calculate how far from the foot of the cliff it lands.", ans: "<ul><li>Vertically: 45 = ½ × 9.81 × t², so t = 3.03 s</li><li>Horizontally: x = 8.0 × 3.03</li><li>= 24 m</li></ul>" },
      { lvl: "adv", marks: 3, q: "A ball launched at 25° lands 30 m away on level ground. Without calculation, state another angle with the same range, and explain why the times of flight differ.", ans: "<ul><li>65° (complementary angles: sin 50° = sin 130°)</li><li>at 65° the vertical component is larger, so it is in the air longer</li><li>but its horizontal component is smaller, so it covers the same distance</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why, with air resistance, the best launch angle for range is less than 45°.", ans: "<ul><li>Drag acts throughout the flight, reducing the horizontal velocity</li><li>a high launch keeps the ball in the air longer, so drag has longer to act and the horizontal distance lost is greater</li><li>a lower, faster-moving launch loses less, so the optimum angle falls</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>No air</b> (the default): the exact formulas x = u cos θ · t and y = h + u sin θ · t − ½ g t². The horizontal velocity never changes; the vertical velocity falls by g every second.</li>
<li><b>Air resistance</b> (A level): drag F = ½ ρ C_D A v² against the velocity relative to the air (ρ = 1.225 kg/m³), with the mass, diameter and drag coefficient of each object. Wind moves the air. The equations are solved in 5 ms steps (fourth-order Runge–Kutta).</li>
<li><b>Spin</b>: a Magnus force ½ ρ A C_L r ω v at right angles to the velocity (lift coefficient factor 0.5). Backspin lifts; topspin dips.</li>
<li><b>Energy</b>: KE = ½ m v² and GPE = m g h, using the object's mass.</li>
<li><b>Batch runs</b> add small random errors to each launch (about 1% in speed and 0.5° in angle unless stated), like a real launcher.</li></ul>
<h3>Simplifications</h3>
<ul><li>The ball is a point: no bouncing, rolling or size.</li>
<li>Drag and lift coefficients are kept constant; real values change with speed (the "drag crisis" of a football) and with spin.</li>
<li>Air density does not change with height, and the Earth is flat and not rotating.</li>
<li>Only spin about a horizontal axis is modelled: no swerve (side-spin).</li>
<li>Gravity is the same at every height.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/projectile-motion.html">original/projectile-motion.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Launch");
ctl.v = K.slider(g, { label: "Launch speed", min: 0, max: 80, step: 0.5, value: P.v, unit: "m/s", on: v => { P.v = v; } });
ctl.ang = K.slider(g, { label: "Angle above horizontal", min: -30, max: 90, step: 1, value: P.ang, unit: "°", on: v => { P.ang = v; } });
ctl.h = K.slider(g, { label: "Launch height", min: 0, max: 100, step: 1, value: 0, unit: "m", on: v => { P.h = v; } });
K.note(g, "Or drag back from the launcher, like a catapult.");
let r1 = K.row(g); K.btn(r1, "🚀 Launch", () => launch(), "primary"); K.btn(r1, "Keep this path", () => { if (F) { kept.push({ path: F.path, label: `${P.v} m/s, ${P.ang}°` }); if (kept.length > 4) kept.shift(); } }); K.btn(r1, "Clear", () => { kept = []; });
g = ui.group("The world");
ctl.planet = K.seg(g, { value: "earth", options: Object.entries(GRAV).map(([k, v]) => [k, v[0]]), on: v => setPlanet(v) });
ctl.obj = K.seg(g, { label: "Object", value: "football", options: Object.entries(OBJ).map(([k, v]) => [k, v.name.split(" ")[0]]), on: v => { P.obj = v; } });
const airG = g = ui.group("Air (A level)");
ctl.drag = K.toggle(g, { label: "Air resistance", value: false, on: v => { P.drag = v; } });
ctl.wind = K.slider(g, { label: "Wind (+ behind the ball)", min: -20, max: 20, step: 1, value: 0, unit: "m/s", on: v => { P.wind = v; } });
ctl.spin = K.slider(g, { label: "Spin (+ backspin, − topspin)", min: -400, max: 400, step: 10, value: 0, unit: "rad/s", on: v => { P.spin = v; } });
g = ui.group("Target");
let r2 = K.row(g); K.btn(r2, "🎯 Move the target", () => moveTarget()); K.btn(r2, "Reset score", () => { hits = shots = 0; });
ctl.guide = K.toggle(g, { label: "Aiming guide (path before launch)", value: false, on: v => { P.guide = v; } });
g = ui.group("Show");
ctl.arrows = K.toggle(g, { label: "Velocity arrows (vₓ, vᵧ, v)", value: true, on: v => P.arrows = v });
ctl.marks = K.toggle(g, { label: "Time markers", value: true, on: v => P.marks = v });
ctl.shadows = K.toggle(g, { label: "Shadows on the ground and wall", value: false, on: v => P.shadows = v });
ctl.dropToo = K.toggle(g, { label: "Drop a second ball at launch", value: false, on: v => P.dropToo = v });
ctl.speed = K.slider(g, { label: "Playback speed", min: 0.1, max: 4, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => speed = v });
const read = K.readout(ui.group("Results"), [["R", "range"], ["H", "greatest height"], ["T", "time of flight"], ["vl", "landing speed"], ["al", "landing angle"], ["th", "formula (no air)"]]);

function setPlanet(k) { P.planet = k; P.g = GRAV[k][1]; ctl.planet.set(k); }
function set(o) {
  Object.assign(P, B0, { guide: false, shadows: false, dropToo: false, arrows: true, marks: true }, o); setPlanet(o.planet || "earth");
  for (const k of ["v", "ang", "h", "wind", "spin"]) ctl[k].set(P[k]); for (const k of ["drag", "guide", "arrows", "marks", "shadows", "dropToo"]) ctl[k].set(P[k]); ctl.obj.set(P.obj);
  kept = []; F = null; flying = false; t = 0; lastHit = null; view = null;
}
function launch() { F = fly(P); F.o = Object.assign({}, P); t = 0; flying = true; lastHit = null; view = null; }
function moveTarget() { P.target = Math.round((6 + Math.random() * 30) * Math.min(6, 9.81 / P.g) * 2) / 2; view = null; }   // somewhere 6–36 m away on Earth, further where gravity is weaker

// ---------------- Drawing ----------------
const cv = ui.canvas(() => view = null);
let aim = null, dragT = false;
// world (metres) → screen: equal scales on both axes, fitted to the flight, the target and the kept paths
function fitView() {
  const pre = fly(P); let xm = Math.max(10, P.target + 4, pre.R), ym = Math.max(4, pre.H, P.h + 2);
  if (F) { xm = Math.max(xm, F.R); ym = Math.max(ym, F.H); } for (const k of kept) { const L = k.path[k.path.length - 1]; xm = Math.max(xm, L[1]); for (const p of k.path) ym = Math.max(ym, p[2]); }
  const L = 70, R = 30, T = 30, B = 46, sc = Math.min((cv.w - L - R) / (xm * 1.08), (cv.h - T - B) / (ym * 1.12));
  view = { sc, X: x => L + x * sc, Y: y => cv.h - B - y * sc, x0: L, yg: cv.h - B, xm: (cv.w - L - R) / sc, ym: (cv.h - T - B) / sc };
}
function niceStep(span) { const r = span / 8, p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
function arrow(c, x, y, dx, dy, col, label) {
  const L = Math.hypot(dx, dy); if (L < 3) return; c.strokeStyle = c.fillStyle = col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke();
  const a = Math.atan2(dy, dx); c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx - 9 * Math.cos(a - 0.4), y + dy - 9 * Math.sin(a - 0.4)); c.lineTo(x + dx - 9 * Math.cos(a + 0.4), y + dy - 9 * Math.sin(a + 0.4)); c.fill();
  if (label) { c.font = "600 12px Segoe UI,sans-serif"; c.fillText(label, x + dx + (dx >= 0 ? 6 : -30), y + dy + (dy > 0 ? 14 : -4)); }
}
function draw() {
  if (!view) fitView(); const c = cv.ctx, w = cv.w, h = cv.h, { X, Y, sc } = view;
  const sky = c.createLinearGradient(0, 0, 0, h); const moon = P.g < 2; sky.addColorStop(0, moon ? "#05060c" : "#0d1b33"); sky.addColorStop(1, moon ? "#141622" : "#1d3354"); c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // ground and cliff
  c.fillStyle = moon ? "#3a3c44" : "#25472c"; c.fillRect(0, Y(0), w, h - Y(0)); if (P.h > 0) { c.fillStyle = moon ? "#4a4c55" : "#5a4a38"; c.fillRect(X(0) - 60, Y(P.h), 60, Y(0) - Y(P.h)); }
  // grid in metres
  const st = niceStep(Math.max(view.xm, view.ym)); c.strokeStyle = "rgba(255,255,255,0.06)"; c.lineWidth = 1; c.fillStyle = "#7d8aa5"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center";
  for (let x = 0; x <= view.xm; x += st) { c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x), 20); c.stroke(); c.fillText(K.sig(x, 3) + (x === 0 ? "" : ""), X(x), Y(0) + 15); }
  c.textAlign = "right"; for (let y = st; y <= view.ym; y += st) { c.beginPath(); c.moveTo(X(0), Y(y)); c.lineTo(w, Y(y)); c.stroke(); c.fillText(K.sig(y, 3), X(0) - 6, Y(y) + 4); }
  c.textAlign = "center"; c.fillText("distance (m)", X(view.xm / 2), h - 8);
  // target flag
  const tw = Math.max(0.6, view.xm * 0.025); c.fillStyle = "rgba(255,93,108,0.35)"; c.fillRect(X(P.target - tw / 2), Y(0) - 3, tw * sc, 6); c.strokeStyle = "#ff5d6c"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(P.target), Y(0)); c.lineTo(X(P.target), Y(0) - 34); c.stroke(); c.fillStyle = "#ff5d6c"; c.beginPath(); c.moveTo(X(P.target), Y(0) - 34); c.lineTo(X(P.target) + 18, Y(0) - 28); c.lineTo(X(P.target), Y(0) - 22); c.fill();
  c.font = "11px Segoe UI,sans-serif"; c.fillText(P.target.toFixed(1) + " m", X(P.target), Y(0) + 28);
  // kept paths and the aiming guide
  const line = (path, col, dash, upto) => { c.strokeStyle = col; c.setLineDash(dash || []); c.lineWidth = 2; c.beginPath(); let first = true; for (const p of path) { if (upto != null && p[0] > upto) break; first ? c.moveTo(X(p[1]), Y(p[2])) : c.lineTo(X(p[1]), Y(p[2])); first = false; } if (upto != null) { const q = at(path, upto); c.lineTo(X(q[1]), Y(q[2])); } c.stroke(); c.setLineDash([]); };
  kept.forEach((k, i) => { const col = ["#7d8aa5", "#9a86c9", "#c98686", "#86b7c9"][i]; line(k.path, col, [6, 4]); const L = k.path[k.path.length - 1]; c.fillStyle = col; c.textAlign = "center"; c.fillText(k.label, X(L[1]), Y(0) - 8); });
  if (P.guide && !flying) line(fly(P).path, "rgba(255,209,102,0.55)", [3, 5]);
  // launcher: a short barrel pointing along the launch angle
  const lx = X(0), ly = Y(P.h); c.save(); c.translate(lx, ly); c.rotate(-rad(P.ang)); c.fillStyle = "#c9d3e6"; c.fillRect(-6, -7, 34, 14); c.restore(); c.fillStyle = "#56607a"; c.beginPath(); c.arc(lx, ly + 4, 11, 0, 6.3); c.fill();
  if (aim) { c.strokeStyle = "rgba(255,209,102,0.8)"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(lx, ly); c.lineTo(aim.x, aim.y); c.stroke(); c.setLineDash([]); }
  if (F) {
    const now = at(F.path, t), mass = OBJ[F.o.obj].m;
    line(F.path, K.cssVar("--s0"), null, t);
    // time markers: the ball's position at equal time intervals
    if (P.marks) { const dtm = F.T > 12 ? 2 : F.T > 5 ? 1 : F.T > 1.2 ? 0.5 : 0.1; c.fillStyle = "#ffd166"; for (let s = dtm; s < Math.min(t, F.T); s += dtm) { const q = at(F.path, s); c.beginPath(); c.arc(X(q[1]), Y(q[2]), 3.2, 0, 6.3); c.fill(); if (P.shadows) { c.globalAlpha = 0.35; c.fillRect(X(q[1]) - 1, Y(0) - 4, 2, 8); c.fillRect(X(0) - 14, Y(q[2]) - 1, 8, 2); c.globalAlpha = 1; } } c.textAlign = "left"; c.fillStyle = "#aab6cc"; c.font = "12px Segoe UI,sans-serif"; c.fillText(`yellow dots every ${dtm} s`, 12, h - 8); }
    // shadows: the horizontal motion on the ground and the vertical motion on the left wall
    if (P.shadows) { c.fillStyle = "rgba(111,177,255,0.85)"; c.beginPath(); c.ellipse(X(now[1]), Y(0), 7, 3, 0, 0, 6.3); c.fill(); c.fillStyle = "rgba(255,138,112,0.9)"; c.beginPath(); c.ellipse(X(0) - 10, Y(now[2]), 3, 7, 0, 0, 6.3); c.fill(); }
    // the second ball, dropped from the launch point at the same moment
    if (F.o.dropToo) { const drop = Math.max(0, F.o.h - 0.5 * F.o.g * t * t); c.fillStyle = "#c58cff"; c.beginPath(); c.arc(X(0) + 10, Y(drop), 6, 0, 6.3); c.fill(); }
    // the ball
    const br = Math.max(5, OBJ[F.o.obj].d / 2 * sc); c.fillStyle = OBJ[F.o.obj].col; c.beginPath(); c.arc(X(now[1]), Y(now[2]), br, 0, 6.3); c.fill();
    if (P.arrows) { const k = 40 / Math.max(10, F.o.v, 1); const bx = X(now[1]), by = Y(now[2]); c.font = "600 12px Segoe UI,sans-serif"; arrow(c, bx, by, now[3] * k * 1.5, 0, "#6fb1ff", "vₓ"); arrow(c, bx, by, 0, -now[4] * k * 1.5, "#ff8a70", "vᵧ"); arrow(c, bx, by, now[3] * k * 1.5, -now[4] * k * 1.5, "#ffffff", ""); }
    const sp = Math.hypot(now[3], now[4]); c.textAlign = "right"; c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif";
    ui.hud(`t = <b>${now[0].toFixed(2)} s</b><br>x = ${now[1].toFixed(2)} m, y = ${now[2].toFixed(2)} m<br><span style="color:#6fb1ff">vₓ = ${now[3].toFixed(2)} m/s</span><br><span style="color:#ff8a70">vᵧ = ${now[4].toFixed(2)} m/s</span><br>speed ${sp.toFixed(2)} m/s<br><span style="color:var(--muted)">KE ${(0.5 * mass * sp * sp).toFixed(1)} J · GPE ${(mass * F.o.g * now[2]).toFixed(1)} J</span>${shots ? `<br>🎯 ${hits} hit${hits === 1 ? "" : "s"} of ${shots}` : ""}${lastHit != null ? `<br><b style="color:${lastHit ? "#7fe3a0" : "#ff8a70"}">${lastHit ? "Hit!" : "Missed by " + Math.abs(F.R - P.target).toFixed(1) + " m"}</b>` : ""}`);
  } else ui.hud(`Press <b>Launch</b> or drag back from the launcher${shots ? `<br>🎯 ${hits} of ${shots}` : ""}`);
  c.textAlign = "right"; c.fillStyle = "#aab6cc"; c.font = "12px Segoe UI,sans-serif"; c.fillText(`${GRAV[P.planet][0]}: g = ${P.g} N/kg${P.drag ? " · air resistance on" : " · no air"}`, w - 12, h - 8);
}
// drag back from the launcher to aim, like a catapult; drag the flag to move the target
K.pointer(cv.el, {
  down(p) { if (!view) return; const lx = view.X(0), ly = view.Y(P.h); if (Math.hypot(p.x - lx, p.y - ly) < 60) aim = p; else if (Math.abs(p.x - view.X(P.target)) < 20 && p.y > view.Y(0) - 45) dragT = true; },
  drag(p) {
    if (aim) { aim = p; const dx = view.X(0) - p.x, dy = p.y - view.Y(P.h), L = Math.hypot(dx, dy); P.ang = Math.round(K.clamp(Math.atan2(dy, dx) * 180 / Math.PI, -30, 90)); P.v = Math.round(K.clamp(L / 4, 0, 80) * 2) / 2; ctl.ang.set(P.ang); ctl.v.set(P.v); }
    if (dragT) { P.target = Math.round(K.clamp((p.x - view.x0) / view.sc, 1, view.xm) * 2) / 2; }
  },
  up() { if (aim) { aim = null; launch(); } if (dragT) { dragT = false; view = null; } }
});
const chV = K.chart(ui.dock, { title: "Velocity components", xLabel: "time (s)", yLabel: "velocity (m/s)" });
const chE = K.chart(ui.dock, { title: "Energy", xLabel: "time (s)", yLabel: "energy (J)", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0) || !F || !flying) return; t += dt * speed;
  if (t >= F.T) { t = F.T; flying = false; shots++; const tw = Math.max(0.6, view ? view.xm * 0.025 : 1); lastHit = Math.abs(F.R - P.target) <= tw / 2 + 0.25; if (lastHit) hits++; }
}, () => {
  draw(); if (frame++ % 4) return;
  if (F) {
    const m = OBJ[F.o.obj].m, pts = F.path.filter((p, i) => i % Math.max(1, Math.floor(F.path.length / 300)) === 0 && p[0] <= t).concat([at(F.path, t)]);
    chV.draw([{ pts: pts.map(p => [p[0], p[3]]), color: "#6fb1ff", label: "vₓ (sideways)" }, { pts: pts.map(p => [p[0], p[4]]), color: "#ff8a70", label: "vᵧ (up +)" }], { xMin: 0, xMax: Math.max(1, F.T), hlines: [{ y: 0, color: "#7d8aa5", dash: [2, 3] }] });
    const ke = p => 0.5 * m * (p[3] * p[3] + p[4] * p[4]), pe = p => m * F.o.g * p[2];
    chE.draw([{ pts: pts.map(p => [p[0], ke(p)]), color: "#ffd166", label: "KE" }, { pts: pts.map(p => [p[0], pe(p)]), color: "#7fe3a0", label: "GPE" }, { pts: pts.map(p => [p[0], ke(p) + pe(p)]), color: "#eef2f8", label: "total" }], { xMin: 0, xMax: Math.max(1, F.T), yMin: 0, yMax: (ke(F.path[0]) + pe(F.path[0])) * 1.1 + 0.01 });
    const ideal = fly(Object.assign({}, F.o, { drag: false }));
    read.set("R", F.R.toFixed(2) + " m"); read.set("H", F.H.toFixed(2) + " m"); read.set("T", F.T.toFixed(2) + " s"); read.set("vl", F.vLand.toFixed(1) + " m/s"); read.set("al", F.angLand.toFixed(0) + "° below horizontal");
    read.set("th", F.o.drag ? `${ideal.R.toFixed(1)} m in a vacuum` : (F.o.h === 0 ? `R = v² sin 2θ ÷ g = ${(F.o.v * F.o.v * Math.sin(rad(2 * F.o.ang)) / F.o.g).toFixed(2)} m` : `t = ${ideal.T.toFixed(2)} s`));
  }
  airG.style.display = ui.level === "adv" ? "" : "none"; if (ui.level !== "adv" && P.drag) { P.drag = false; ctl.drag.set(false); }
});
set({}); launch();
ui.tip("Drag back from the launcher to aim and fire · drag the red flag to move the target", 8000);
