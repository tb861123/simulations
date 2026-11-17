/* =====================================================================
   SPORT BIOMECHANICS
   The physics of the moving body:
     • LEVERS: effort × effort arm = load × load arm (moments);
       mechanical advantage MA = effort arm ÷ load arm.
     • PLANES AND AXES: every movement happens in a plane, turning about
       an axis at right angles to it.
     • STABILITY: a body topples when its line of gravity passes outside
       its base of support. Low centre of mass + wide base = stable.
     • IMPULSE = force × time = area under a force–time graph = change in
       momentum (m Δv).
     • PROJECTILES: release speed, angle and height (and air resistance,
       spin) decide how far.
     • ROTATION: angular momentum L = Iω stays the same in the air, so
       tucking (smaller moment of inertia I) spins faster.
   The body is built from 14 segments with standard lengths and masses
   (fractions of height and mass, after Dempster and Winter).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const g0 = 9.81;
// segments: [name, length (× height), mass (× body mass), centre of mass (fraction from the proximal end)]
const SEG = { head: [0.13, 0.081, 0.5], trunk: [0.30, 0.497, 0.5], upper: [0.186, 0.028, 0.436], fore: [0.146, 0.016, 0.43], hand: [0.108, 0.006, 0.5], thigh: [0.245, 0.1, 0.433], shank: [0.246, 0.0465, 0.433], foot: [0.152, 0.0145, 0.5] };
// a pose: absolute angles of each segment (radians; limbs 0 = pointing down, trunk/head 0 = pointing up; + = forwards)
const POSES = {
  stand: { trunk: 0, head: 0, ua: 0.05, fa: 0.1, th: 0, sh: 0, ua2: -0.05, fa2: -0.05, th2: 0, sh2: 0 },
  layout: { trunk: 0, head: 0, ua: Math.PI, fa: Math.PI, th: 0, sh: 0, ua2: Math.PI, fa2: Math.PI, th2: 0, sh2: 0 },
  pike: { trunk: 0.15, head: 0.3, ua: 2.6, fa: 2.7, th: 2.55, sh: 2.55, ua2: 2.6, fa2: 2.7, th2: 2.55, sh2: 2.55 },
  tuck: { trunk: 0.35, head: 0.5, ua: 2.0, fa: 2.9, th: 2.4, sh: 0.15, ua2: 2.0, fa2: 2.9, th2: 2.4, sh2: 0.15 },
  armsOut: { trunk: 0, head: 0, ua: 1.57, fa: 1.57, th: 0, sh: 0, ua2: -1.57, fa2: -1.57, th2: 0.05, sh2: 0.05 }
};
const mixPose = (a, b, k) => { const o = {}; for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k; return o; };
// joint positions (metres, y up) for a pose, with the hip at the origin; returns segments with their masses
function body(pose, H, M) {
  const dir = a => [Math.sin(a), -Math.cos(a)], up = a => [Math.sin(a), Math.cos(a)], add = (p, d, L) => [p[0] + d[0] * L * H, p[1] + d[1] * L * H];
  const hip = [0, 0], sh = add(hip, up(pose.trunk), SEG.trunk[0]), head = add(sh, up(pose.head), SEG.head[0]);
  const segs = [["trunk", hip, sh], ["head", sh, head]];
  for (const side of ["", "2"]) {
    const el = add(sh, dir(pose["ua" + side]), SEG.upper[0]), wr = add(el, dir(pose["fa" + side]), SEG.fore[0]), hd = add(wr, dir(pose["fa" + side]), SEG.hand[0]);
    const kn = add(hip, dir(pose["th" + side]), SEG.thigh[0]), an = add(kn, dir(pose["sh" + side]), SEG.shank[0]), ft = add(an, Math.abs(pose["sh" + side]) > 1.2 ? dir(pose["sh" + side] + Math.PI / 2) : [1, 0], SEG.foot[0] * 0.8);   // feet stay flat unless the leg is lifted
    segs.push(["upper", sh, el, side], ["fore", el, wr, side], ["hand", wr, hd, side], ["thigh", hip, kn, side], ["shank", kn, an, side], ["foot", an, ft, side]);
  }
  const out = segs.map(([n, a, b, side]) => { const [L, mf, cf] = SEG[n]; return { n, a, b, side, m: mf * M, L: L * H, c: [a[0] + (b[0] - a[0]) * cf, a[1] + (b[1] - a[1]) * cf] }; });
  const mt = out.reduce((s, q) => s + q.m, 0), com = [out.reduce((s, q) => s + q.m * q.c[0], 0) / mt, out.reduce((s, q) => s + q.m * q.c[1], 0) / mt];
  // moment of inertia about the centre of mass (side-to-side axis): each segment's own I (thin rod mL²/12) + m r²
  const I = out.reduce((s, q) => s + q.m * (q.L * q.L / 12 + (q.c[0] - com[0]) ** 2 + (q.c[1] - com[1]) ** 2), 0);
  return { segs: out, com, I, M: mt };
}
// ----- levers
const LEVERS = {
  head: { name: "Heading a ball (neck)", cls: 1, eArm: 0.05, lArm: 0.06, load: 50, note: "fulcrum (top of the spine) between effort (neck muscles) and load (weight of the head)" },
  elbowExt: { name: "Throwing (elbow extension)", cls: 1, eArm: 0.025, lArm: 0.3, load: 30, note: "fulcrum (elbow) between effort (triceps) and load (forearm and ball)" },
  calf: { name: "Calf raise / take-off (ankle)", cls: 2, eArm: 0.17, lArm: 0.12, load: 700, note: "load (body weight) between fulcrum (ball of the foot) and effort (calf muscles)" },
  curl: { name: "Biceps curl (elbow)", cls: 3, eArm: 0.04, lArm: 0.33, load: 50, note: "effort (biceps) between fulcrum (elbow) and load (dumbbell)" },
  kick: { name: "Kicking (knee)", cls: 3, eArm: 0.05, lArm: 0.4, load: 40, note: "effort (quadriceps via patella tendon) between fulcrum (knee) and load (lower leg and foot)" }
};
const effortFor = (lv, load, lArm, eArm) => load * lArm / eArm;               // moments: E × effort arm = L × load arm
// ----- projectiles
const SPORTS = {
  shot: { name: "Shot put", m: 7.26, r: 0.06, Cd: 0.5, v: 13.5, h: 2.1, ang: 37, spinMax: 0 },
  long: { name: "Long jump", m: 75, r: 0.25, Cd: 0.6, v: 9.5, h: 1.1, ang: 20, spinMax: 0, area: 0.5 },
  javelin: { name: "Javelin (as a point mass)", m: 0.8, r: 0.015, Cd: 0.4, v: 28, h: 1.8, ang: 34, spinMax: 0 },
  football: { name: "Football free kick", m: 0.43, r: 0.11, Cd: 0.25, v: 25, h: 0.11, ang: 18, spinMax: 60 },
  tennis: { name: "Tennis forehand", m: 0.057, r: 0.033, Cd: 0.55, v: 30, h: 1.0, ang: 8, spinMax: 300 },
  shuttle: { name: "Badminton clear", m: 0.0052, r: 0.033, Cd: 0.6, v: 45, h: 2.2, ang: 50, spinMax: 0, area: 0.0056 }
};
// flight with weight, drag ½ρC_dAv² and spin lift (Magnus), stepped every 2 ms; spin > 0 = topspin (dips), < 0 = backspin (floats)
function fly(sp, o) {
  const A = sp.area || Math.PI * sp.r * sp.r, rho = 1.2, k = o.air ? 0.5 * rho * sp.Cd * A / sp.m : 0, dt = 0.002;
  let v = o.v; if (o.real && o.ang > 37) v -= 0.04 * (o.ang - 37) * (sp.v / 13.5);        // real athletes release more slowly at steep angles
  let x = 0, y = o.h, vx = v * Math.cos(o.ang * Math.PI / 180), vy = v * Math.sin(o.ang * Math.PI / 180), t = 0; const pts = [[0, y]];
  while (y >= 0 && t < 20) {
    const sp2 = Math.hypot(vx, vy), S = Math.abs(o.spin) * sp.r / Math.max(1, sp2), Cl = o.air ? 1.5 * S / (1 + 2 * S) : 0, kl = 0.5 * rho * Cl * A / sp.m * Math.sign(o.spin);
    const ax = -k * sp2 * vx + kl * sp2 * vy, ay = -g0 - k * sp2 * vy - kl * sp2 * vx;     // lift at right angles to the velocity
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt; if (pts.length < 4000 && Math.round(t / dt) % 5 === 0) pts.push([x, y]);
  }
  return { range: x, t, pts, v };
}
const noAirRange = (v, ang, h) => { const a = ang * Math.PI / 180; return v * Math.cos(a) / g0 * (v * Math.sin(a) + Math.sqrt((v * Math.sin(a)) ** 2 + 2 * g0 * h)); };
const bestAngle = (v, h) => Math.atan(v / Math.sqrt(v * v + 2 * g0 * h)) * 180 / Math.PI;
// ----- rotation: a diver from the 10 m platform keeps L = Iω while changing shape
function dive(o) {
  const H = o.H, M = o.M, Ilay = body(POSES.layout, H, M).I, Ishape = body(POSES[o.shape], H, M).I * (1 + (1 - o.tight) * 1.2), L = Ilay * o.w0;
  const out = []; let ang = 0, t = 0, y = 10, vy = 3; const dt = 0.005;
  while (y > 0 && t < 3) {
    const k = t < 0.15 ? 0 : t < 0.35 ? (t - 0.15) / 0.2 : t < o.open ? 1 : t < o.open + 0.2 ? 1 - (t - o.open) / 0.2 : 0;
    const I = Ilay + (Ishape - Ilay) * k, w = L / I; ang += w * dt; vy -= g0 * dt; y += vy * dt; t += dt; out.push({ t, I, w, ang, y, k, L });
  }
  return { out, turns: ang / (2 * Math.PI), Ilay, Ishape, L };
}
// ----- impulse: a countermovement jump on a force plate (unweighting, braking, propulsion)
function cmj(M, peak) {
  const W = M * g0, dt = 0.002, F = []; let v = 0, t = 0, imp = 0;
  for (; t < 0.25; t += dt) F.push([t, W - 0.6 * W * Math.sin(Math.PI * t / 0.25)]);                               // unweighting: drop down
  for (; t < 0.63; t += dt) F.push([t, W + (peak - W) * Math.sin(Math.PI * (t - 0.25) / 0.38)]);                     // braking then propulsion
  for (const [, f] of F) { v += (f - W) / M * dt; imp += (f - W) * dt; }
  return { F, v, imp, h: v > 0 ? v * v / (2 * g0) : 0 };
}

// ---------------- The page ----------------
const P = { view: "levers", lever: "curl", load: 50, lArm: 0.33, eArm: 0.04, plane: "sagittal", move: "run", stab: "stand", push: 60, impulse: "jump", peak: 2.5, sport: "shot", v: 13.5, ang: 37, h: 2.1, spin: 0, air: true, real: false, shape: "tuck", tight: 1, open: 1.3, w0: 3.2, ball: "tennis", drop: 1.5, H: 1.75, M: 70 };
let t0 = 0, yaw = 0.6, flight = null, flightT = 0, diveRun = null, bounce = null;
const ui = K.app({
  title: "Sport Biomechanics", subject: "Physical education",
  blurb: "Levers, planes and axes, stability, impulse, projectiles and rotation, with a body built from real segment masses",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 1.1.d: lever systems (first, second and third class; mechanical advantage) and planes and axes of movement (sagittal, frontal, transverse; frontal, transverse, longitudinal axes).", adv: "OCR A level Physical Education (H555) 1.3 biomechanics: Newton's laws, impulse and force–time graphs, stability and centre of mass, projectile motion and air resistance, the Bernoulli/Magnus effect, angular motion (moment of inertia, angular momentum). Also WJEC Eduqas A level Physics option C (sports physics): I = Σmr², ½Iω², the coefficient of restitution." } },
  missions: [
    { title: "A third-class lever", q: "In a biceps curl, where are the fulcrum, effort and load? Why does the biceps need a force much bigger than the dumbbell's weight?", hint: "Fulcrum (elbow), effort (biceps, 4 cm from the elbow), load (dumbbell, 33 cm away). The effort arm is much shorter, so MA < 1: the biceps pulls about 8 times the load, but the hand moves 8 times further and faster. Most levers in the body are third class.", setup() { set({ view: "levers", lever: "curl" }); } },
    { title: "A second-class lever", q: "Rising onto your toes: which class of lever? Is the mechanical advantage more or less than 1?", hint: "Second class: load (body weight) between the fulcrum (ball of the foot) and effort (calf muscles at the heel). The effort arm is longer than the load arm, so MA > 1: a big load can be moved with a smaller effort.", setup() { set({ view: "levers", lever: "calf" }); } },
    { title: "Planes and axes", q: "Watch the runner, then the star jump, then the full twist. Name the plane and axis for each. Drag the figure to turn it.", hint: "Running: sagittal plane, transverse axis. Star jump: frontal plane, frontal axis. Full twist: transverse plane, longitudinal axis.", setup() { set({ view: "planes", plane: "sagittal", move: "run" }); } },
    { lvl: "adv", title: "Stability", q: "Compare standing, a wide stance, a low crouch and an arabesque. Which needs the biggest push to topple, and why?", hint: "The push needed = weight × (distance from the line of gravity to the edge of the base) ÷ height of the centre of mass. A wide base and a low centre of mass are most stable (the crouch); the arabesque balances on one small foot, so a small push topples it. A sprinter in the set position deliberately leans so the line of gravity is near the front edge, ready to move.", setup() { set({ view: "stability", stab: "split" }); } },
    { lvl: "adv", title: "Impulse in a jump", q: "Look at the force–time graph of a jump. Why does the force first drop below body weight? How is the jump height linked to the shaded area?", hint: "Dipping down needs a net downward force (force < weight). The net impulse (area above body weight minus area below) = m × take-off velocity, and height = v² ÷ 2g. More force for longer = more impulse = higher jump.", setup() { set({ view: "impulse", impulse: "jump" }); } },
    { lvl: "adv", title: "Bend your knees", q: "Land from a 0.6 m box with stiff legs and then with bent knees. What happens to the peak force?", hint: "The impulse needed to stop is the same (m × landing speed), so a longer contact time means a smaller average force: the peak falls from many times body weight to about two to three times.", setup() { set({ view: "impulse", impulse: "land" }); } },
    { lvl: "adv", title: "Shot put: the best angle", q: "Find the release angle that throws the shot furthest. Is it 45°? Now switch on 'real athletes'.", hint: "Because the shot is released 2 m above the ground, the best angle is about 42°. Real athletes can push harder at flatter angles, so their best angle is lower still: about 37°.", setup() { set({ view: "proj", sport: "shot" }); } },
    { lvl: "adv", title: "Spin and swerve", q: "Give the tennis ball topspin, then backspin. How does the flight change?", hint: "Topspin makes the air flow faster under the ball (lower pressure below), so a Magnus force pulls it down: it dips and lands sooner. Backspin lifts it and it floats.", setup() { set({ view: "proj", sport: "tennis", spin: 200 }); } },
    { lvl: "adv", title: "Tuck to spin", q: "A diver leaves the 10 m board with the same angular momentum. Compare the number of somersaults in layout, pike and tuck.", hint: "L = Iω is constant in the air. Tucking cuts I to about a third, so ω triples: about 2 somersaults in tuck against about 1 in layout.", setup() { set({ view: "rotation", shape: "tuck" }); } },
    { lvl: "adv", title: "Coefficient of restitution", q: "Drop a tennis ball from 1.5 m. Find e = √(bounce height ÷ drop height). How does a warm squash ball compare with a cold one?", hint: "Tennis ball on concrete: e ≈ 0.75 (bounces to about 55% of the drop height). A warm squash ball is bouncier than a cold one. Kinetic energy falls by a factor of e² at each bounce.", setup() { set({ view: "bounce", ball: "tennis" }); } }
  ],
  batch: [
    { title: "Shot put: best angle and release height", question: "How does the best release angle depend on the release height (no air resistance)?", how: "Shot at 13.5 m/s, release angles searched in 0.1° steps for the longest range.", xLabel: "release height (m)", yLabel: "best angle (°)", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3], reps: 1, theory: h => bestAngle(13.5, h), theoryLabel: "arctan(v ÷ √(v² + 2gh))", run: x => { let best = 0, ba = 0; for (let a = 30; a <= 46; a += 0.1) { const r = noAirRange(13.5, a, x); if (r > best) { best = r; ba = a; } } return ba; }, note: "45° only from ground level. The higher the release, the lower the best angle: about 42° for a shot putter." },
    { title: "Real athletes: speed and angle", question: "If release speed falls at steeper angles, which angle is best?", how: "Shot put, release height 2.1 m, speed 13.5 m/s at 37° or below, falling 0.04 m/s per degree above; air resistance on.", xLabel: "release angle (°)", yLabel: "distance (m)", xs: [25, 29, 33, 35, 37, 39, 41, 43, 45, 49], reps: 1, theory: a => noAirRange(13.5 - (a > 37 ? 0.04 * (a - 37) : 0), a, 2.1), theoryLabel: "no air, same speeds", run: x => fly(SPORTS.shot, { v: 13.5, ang: x, h: 2.1, spin: 0, air: true, real: true }).range, note: "The peak moves to about 37–38°: the athlete's strength at different angles matters as much as the physics of the flight." },
    { title: "Tuck, pike or layout?", question: "How many somersaults does a diver turn with different moments of inertia?", how: "10 m platform, take-off 3 m/s upwards, the same angular momentum (layout ω 3.2 rad/s); the diver holds the shape from 0.35 s to 1.3 s. Body: 1.75 m, 70 kg, built from 14 segments.", xLabel: "shape (1 layout, 2 pike, 3 tuck)", yLabel: "somersaults", xs: [1, 2, 3], reps: 1, yMin: 0, run: x => dive({ H: 1.75, M: 70, shape: ["layout", "pike", "tuck"][x - 1], tight: 1, open: 1.3, w0: 3.2 }).turns, note: "The tuck turns about twice as many somersaults as the layout: same L, smaller I, bigger ω." },
    { title: "Impulse and jump height", question: "How does jump height depend on the net impulse?", how: "Countermovement jumps for random athletes (60–90 kg) with peak forces of 1.6–3 × body weight; net impulse from the force–time graph.", xLabel: "peak force (× body weight)", yLabel: "jump height (m)", xs: [1.8, 2.1, 2.4, 2.7, 3.0], reps: 6, yMin: 0, theory: x => { const r = cmj(75, x * 75 * g0); return (r.imp / 75) ** 2 / (2 * g0); }, theoryLabel: "h = (J/m)² ÷ 2g", run: (x, r) => { const M = 60 + 30 * r(), res = cmj(M, x * M * g0); return res.h; }, note: "More force for the same time means more net impulse, a faster take-off (v = J ÷ m) and a higher jump: height grows with v², so it rises faster than the force." },
    { title: "Push to topple", question: "How does the sideways push needed to topple someone depend on the height of their centre of mass?", how: "70 kg, line of gravity 0.15 m from the edge of the base; push applied at the centre of mass.", xLabel: "height of the centre of mass (m)", yLabel: "push needed (N)", xs: [0.4, 0.6, 0.8, 1.0, 1.2], reps: 1, yMin: 0, theory: hc => 70 * g0 * 0.15 / hc, theoryLabel: "W × d ÷ h", run: hc => { let lo = 0, hi = 2000; for (let k = 0; k < 40; k++) { const F = (lo + hi) / 2; if (F * hc > 70 * g0 * 0.15) hi = F; else lo = F; } return (lo + hi) / 2; }, note: "Halve the height of the centre of mass and the push needed doubles: crouch to be stable (a rugby scrum, a wrestler)." },
    { title: "Measuring e by eye", question: "If you read the bounce height by eye (SD 2 cm), how much do repeated measurements of e vary?", how: "Tennis ball (true e 0.75) dropped from 1.5 m; e = √(h₂ ÷ h₁) from one drop each time.", yLabel: "e measured", reps: 300, bins: 24, theory: 0.75, theoryLabel: "true e", run: (x, r) => Math.sqrt((1.5 * 0.75 * 0.75 + 0.02 * r.gauss()) / 1.5), note: "Each reading gives e within about ±0.01; averaging five drops shrinks the error by √5." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 1.1.d", text: "Levers: first class (fulcrum in the middle: FLE / EFL, e.g. neck), second class (load in the middle, e.g. ankle in a calf raise), third class (effort in the middle, e.g. elbow in a biceps curl). Remember 'FLE 1, 2, 3'." },
      { lvl: "std", tag: "J587 1.1.d", text: "Mechanical advantage = effort arm ÷ load arm. Second-class levers have MA > 1 (move big loads); third-class levers have MA < 1 but a big range and speed of movement." },
      { lvl: "std", tag: "J587 1.1.d", text: "Planes and axes: sagittal plane + transverse axis (running, somersault); frontal plane + frontal axis (star jump, cartwheel); transverse plane + longitudinal axis (full twist, discus turn)." },
      { lvl: "adv", tag: "H555 1.3", text: "Stability: lower centre of mass, wider base of support and line of gravity in the middle of the base. Push to topple = W × d ÷ h." },
      { lvl: "adv", tag: "H555 1.3", text: "Impulse = F × t = area under the force–time graph = change in momentum. Positive impulse speeds up; negative (braking) impulse slows down. Landing with bent knees increases t and reduces F." },
      { lvl: "adv", tag: "H555 1.3", text: "Projectile distance depends on release speed (most important), angle and height. Best angle < 45° when released above landing height. Spin: Magnus force (topspin dips, backspin floats, sidespin swerves)." },
      { lvl: "adv", tag: "H555 1.3", text: "Angular momentum L = Iω is conserved in flight. Tuck → small I → fast spin; open out → large I → slow spin for entry." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const lv = LEVERS[P.lever]; return `Identify the class of lever in ${lv.name.toLowerCase()} and calculate the effort needed to hold a ${P.load} N load at ${(P.lArm * 100).toFixed(0)} cm from the fulcrum, with the effort ${(P.eArm * 100).toFixed(0)} cm from it.`; }, ans: () => { const lv = LEVERS[P.lever]; return `<ul><li>${["first", "second", "third"][lv.cls - 1]}-class lever: ${lv.note}</li><li>effort × ${P.eArm} = ${P.load} × ${P.lArm}</li><li>effort = ${effortFor(lv, P.load, P.lArm, P.eArm).toFixed(0)} N (MA = ${(P.eArm / P.lArm).toFixed(2)})</li></ul>`; } },
      { lvl: "std", marks: 2, q: "A gymnast does a cartwheel. Name the plane and the axis of the movement.", ans: "<ul><li>frontal plane</li><li>frontal axis</li></ul>" },
      { lvl: "adv", marks: 4, q: "Sketch and explain a force–time graph for a sprinter's foot contact in the middle of a race (constant speed).", ans: "<ul><li>a negative (braking) impulse as the foot lands in front of the centre of mass</li><li>then a positive (propulsive) impulse as the foot pushes back</li><li>at constant speed the two areas are equal: net impulse zero</li><li>accelerating: positive area bigger; decelerating: negative bigger</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain, using angular momentum, how a diver increases the speed of rotation during a dive and why they open out before entering the water.", ans: "<ul><li>L = Iω is constant in flight (no external torque)</li><li>tucking reduces I (mass closer to the axis), so ω increases</li><li>opening out increases I, so ω decreases: a controlled, vertical entry</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why the optimum release angle for a shot put is less than 45°.", ans: "<ul><li>the shot is released about 2 m above the landing height, so a lower angle gives a longer flight horizontally</li><li>athletes can produce more release speed at lower angles (stronger body position)</li><li>speed matters most, so the best angle is about 37–42°</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Body:</b> 14 segments with lengths and masses as fractions of height and body mass (after Dempster and Winter: trunk 49.7%, head 8.1%, thigh 10%, shank 4.65%, foot 1.45%, upper arm 2.8%, forearm 1.6%, hand 0.6%). The centre of mass and the moment of inertia (each segment a thin rod, plus m r²) come from the pose.</li>
<li><b>Levers:</b> effort × effort arm = load × load arm, MA = effort arm ÷ load arm; typical arm lengths.</li>
<li><b>Stability:</b> push to topple (at the centre of mass) = weight × (distance from the line of gravity to the edge of the base) ÷ height of the centre of mass.</li>
<li><b>Impulse:</b> countermovement jump as half-sine force pulses (unweighting, then braking and propulsion); v = ∫(F − W)/m dt, h = v²/2g. Landing: peak force ≈ W + π m v ÷ (2 t_contact).</li>
<li><b>Projectiles:</b> weight, drag ½ρC_dAv² and spin lift with C_L = 1.5S/(1 + 2S), S = rω/v (an illustrative fit), stepped every 2 ms. 'Real athletes': release speed falls by 0.04 m/s per degree above 37° (after Linthorne 2001).</li>
<li><b>Rotation:</b> diver from 10 m, take-off 3 m/s up; L = I_layout × ω₀ fixed; the shape changes over 0.2 s at the start and when opening out. Skater: arms out to in.</li>
<li><b>Bounce:</b> each bounce returns the ball with speed × e, so it rises to e² × the previous height (air resistance ignored).</li></ul>
<h3>Left out</h3>
<ul><li>Muscle forces at real joint angles, joint reaction forces, three-dimensional twisting, flow pictures of drag, the javelin's own lift, and the real force–time curves of individual athletes.</li></ul>
<p>The earlier version of this simulation (with drag and lift flow pictures and more detail), with its worksheets, is kept in <a href="original/sport-biomechanics.html">original/sport-biomechanics.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "levers", options: [["levers", "🦴 Levers"], ["planes", "🧭 Planes and axes"], ["stability", "⚖️ Stability"], ["impulse", "🚀 Impulse"], ["proj", "🎯 Projectiles"], ["rotation", "🌀 Rotation"], ["bounce", "🏀 Bounce"]], on: v => { P.view = v; t0 = 0; } });
g = ui.group("Levers");
ctl.lever = K.seg(g, { value: "curl", options: Object.entries(LEVERS).map(([k, v]) => [k, v.name]), on: v => { const lv = LEVERS[v]; P.lever = v; P.load = lv.load; P.lArm = lv.lArm; P.eArm = lv.eArm; ctl.load.set(P.load); ctl.lArm.set(P.lArm); ctl.eArm.set(P.eArm); } });
ctl.load = K.slider(g, { label: "Load", min: 5, max: 1000, step: 5, value: 50, unit: "N", on: v => P.load = v });
ctl.lArm = K.slider(g, { label: "Load arm", min: 0.01, max: 0.6, step: 0.005, value: 0.33, unit: "m", on: v => P.lArm = v });
ctl.eArm = K.slider(g, { label: "Effort arm", min: 0.01, max: 0.4, step: 0.005, value: 0.04, unit: "m", on: v => P.eArm = v });
g = ui.group("Planes and axes");
ctl.move = K.seg(g, { value: "run", options: [["run", "running"], ["curl", "biceps curl"], ["somersault", "front somersault"], ["star", "star jump"], ["cartwheel", "cartwheel"], ["twist", "full twist"], ["golf", "golf swing"]], on: v => { P.move = v; t0 = 0; } });
g = ui.group("Stability (A level)");
ctl.stab = K.seg(g, { value: "stand", options: [["stand", "standing"], ["split", "wide stance"], ["set", "low crouch"], ["arab", "arabesque"], ["hand", "handstand"]], on: v => P.stab = v });
ctl.push = K.slider(g, { label: "Sideways push", min: 0, max: 600, step: 5, value: 60, unit: "N", on: v => P.push = v });
g = ui.group("Impulse (A level)");
ctl.impulse = K.seg(g, { value: "jump", options: [["jump", "jump on a force plate"], ["land", "landing from a box"], ["sprint", "sprint start"]], on: v => { P.impulse = v; t0 = 0; } });
ctl.peak = K.slider(g, { label: "Jump: peak force", min: 1.8, max: 3.2, step: 0.05, value: 2.5, fmt: v => v.toFixed(2) + " × body weight", on: v => P.peak = v });
ctl.knees = K.seg(g, { label: "Landing", value: "bent", options: [["stiff", "stiff legs (0.05 s)"], ["bent", "bent knees (0.3 s)"]], on: v => P.knees = v }); P.knees = "bent";
g = ui.group("Projectiles (A level)");
ctl.sport = K.seg(g, { value: "shot", options: Object.entries(SPORTS).map(([k, v]) => [k, v.name]), on: v => { const s = SPORTS[v]; P.sport = v; P.v = s.v; P.ang = s.ang; P.h = s.h; P.spin = 0; for (const k of ["v", "ang", "h", "spin"]) ctl[k].set(P[k]); launch(); } });
ctl.v = K.slider(g, { label: "Release speed", min: 2, max: 60, step: 0.1, value: 13.5, unit: "m/s", on: v => { P.v = v; launch(); } });
ctl.ang = K.slider(g, { label: "Release angle", min: 0, max: 80, step: 0.5, value: 37, unit: "°", on: v => { P.ang = v; launch(); } });
ctl.h = K.slider(g, { label: "Release height", min: 0, max: 3, step: 0.05, value: 2.1, unit: "m", on: v => { P.h = v; launch(); } });
ctl.spin = K.slider(g, { label: "Spin (+ topspin, − backspin)", min: -300, max: 300, step: 5, value: 0, unit: "rad/s", on: v => { P.spin = v; launch(); } });
ctl.air = K.toggle(g, { label: "Air resistance", value: true, on: v => { P.air = v; launch(); } });
ctl.real = K.toggle(g, { label: "Real athletes (slower at steep angles)", value: false, on: v => { P.real = v; launch(); } });
g = ui.group("Rotation (A level)");
ctl.shape = K.seg(g, { value: "tuck", options: [["layout", "layout"], ["pike", "pike"], ["tuck", "tuck"], ["skater", "skater's spin"]], on: v => { P.shape = v; runDive(); } });
ctl.tight = K.slider(g, { label: "How tight", min: 0.3, max: 1, step: 0.05, value: 1, on: v => { P.tight = v; runDive(); } });
ctl.open = K.slider(g, { label: "Open out at", min: 0.5, max: 1.7, step: 0.05, value: 1.3, unit: "s", on: v => { P.open = v; runDive(); } });
g = ui.group("Bounce (A level Physics)");
ctl.ball = K.seg(g, { value: "tennis", options: [["tennis", "tennis ball"], ["basket", "basketball"], ["golf", "golf ball"], ["squashC", "squash ball (cold)"], ["squashW", "squash ball (warm)"]], on: v => { P.ball = v; dropBall(); } });
ctl.drop = K.slider(g, { label: "Drop height", min: 0.2, max: 2.5, step: 0.05, value: 1.5, unit: "m", on: v => { P.drop = v; dropBall(); } });
g = ui.group("Athlete");
ctl.H = K.slider(g, { label: "Height", min: 1.4, max: 2.1, step: 0.01, value: 1.75, unit: "m", on: v => { P.H = v; runDive(); } });
ctl.M = K.slider(g, { label: "Body mass", min: 40, max: 120, step: 1, value: 70, unit: "kg", on: v => { P.M = v; runDive(); } });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
const E_BALL = { tennis: 0.75, basket: 0.83, golf: 0.83, squashC: 0.32, squashW: 0.48 };
function set(o) {
  Object.assign(P, { view: "levers", lever: "curl", stab: "stand", impulse: "jump", sport: "shot", shape: "tuck", tight: 1, open: 1.3, ball: "tennis", drop: 1.5, move: "run", push: 60, peak: 2.5, air: true, real: false }, o);
  const lv = LEVERS[P.lever]; P.load = lv.load; P.lArm = lv.lArm; P.eArm = lv.eArm; const s = SPORTS[P.sport]; P.v = s.v; P.ang = s.ang; P.h = s.h; P.spin = o.spin || 0;
  for (const k of ["load", "lArm", "eArm", "push", "peak", "v", "ang", "h", "spin", "tight", "open", "drop"]) ctl[k].set(P[k]);
  for (const k of ["view", "lever", "move", "stab", "impulse", "sport", "shape", "ball"]) ctl[k].set(P[k]); ctl.air.set(P.air); ctl.real.set(P.real);
  t0 = 0; launch(); runDive(); dropBall();
}
function launch() { flight = fly(SPORTS[P.sport], P); flightT = 0; }
function runDive() { diveRun = P.shape === "skater" ? null : dive({ H: P.H, M: P.M, shape: P.shape, tight: P.tight, open: P.open, w0: P.w0 }); }
function dropBall() { const e = E_BALL[P.ball], pts = []; let h = P.drop, t = 0, k = 0; const tops = [h]; while (h > 0.005 && k < 12) { const tf = Math.sqrt(2 * h / g0); for (let i = 0; i <= 20; i++) { const s = tf * i / 20; pts.push([t + s, h - 0.5 * g0 * s * s]); } t += tf; h *= e * e; tops.push(h); const tu = Math.sqrt(2 * h / g0); for (let i = 1; i <= 20; i++) { const s = tu * i / 20; pts.push([t + s, h - 0.5 * g0 * (tu - s) ** 2]); } t += tu; k++; } bounce = { pts, tops, e, T: t }; }

// ---------------- Drawing helpers ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const arrow = (c, x1, y1, x2, y2, col, w = 3) => { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4)); c.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4)); c.fill(); c.lineWidth = 1; };
// draw a body (from body()) at screen position (x, y) of its hip, scale px per metre, rotated by rot about its centre of mass
function drawBody(c, b, x, y, s, rot = 0, col = "#cfd8ea") {
  const cx = b.com[0], cy = b.com[1], tr = p => { const dx = p[0] - cx, dy = p[1] - cy, X = dx * Math.cos(rot) - dy * Math.sin(rot), Y = dx * Math.sin(rot) + dy * Math.cos(rot); return [x + (X + cx) * s, y - (Y + cy) * s]; };
  for (const q of [...b.segs].sort((a, d) => (a.side === "2" ? -1 : 0) - (d.side === "2" ? -1 : 0))) {
    const [ax, ay] = tr(q.a), [bx, by] = tr(q.b); c.strokeStyle = q.side === "2" ? "#7d8aa5" : col; c.lineWidth = q.n === "trunk" ? 9 : q.n === "thigh" ? 7 : 5; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    if (q.n === "head") { c.fillStyle = col; c.beginPath(); c.arc((ax + bx) / 2, (ay + by) / 2, 0.06 * s * b.segs[0].L / 0.525, 0, 6.3); c.fill(); }
  }
  c.lineWidth = 1; const [mx, my] = tr(b.com); return [mx, my];
}
function comMark(c, x, y) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, y, 6, 0, 6.3); c.fill(); c.fillStyle = "#0a1020"; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 6, 0, Math.PI / 2); c.lineTo(x, y); c.arc(x, y, 6, Math.PI, Math.PI * 1.5); c.fill(); }

// ---------------- Views ----------------
function drawLevers(c, w, h) {
  const lv = LEVERS[P.lever], E = effortFor(lv, P.load, P.lArm, P.eArm), MA = P.eArm / P.lArm, k = (w * 0.5) / Math.max(P.lArm, P.eArm) / 1.15, by = h * 0.55, fx = w * 0.42;
  // positions along the bar (m) relative to the fulcrum, for each class
  const pos = lv.cls === 1 ? { F: 0, E: -P.eArm, L: P.lArm } : lv.cls === 2 ? { F: 0, L: P.lArm, E: Math.max(P.eArm, P.lArm + 0.02) } : { F: 0, E: P.eArm, L: P.lArm };
  if (lv.cls === 2) pos.E = P.eArm; const X = m => fx + m * k, wob = Math.sin(t0 * 2) * 0.12;
  c.save(); c.translate(fx, by); c.rotate(-wob); c.translate(-fx, -by);
  c.fillStyle = "#3a4a6b"; c.fillRect(Math.min(X(pos.E), X(pos.L), X(0)) - 20, by - 7, Math.abs(Math.max(X(pos.E), X(pos.L)) - Math.min(X(pos.E), X(pos.L), X(0))) + 40, 14);
  const effUp = lv.cls !== 1 || true, eLen = Math.min(170, 30 + E / Math.max(E, P.load) * 140), lLen = Math.min(170, 30 + P.load / Math.max(E, P.load) * 140);
  arrow(c, X(pos.E), by - (lv.cls === 1 ? -eLen - 10 : 10), X(pos.E), by - (lv.cls === 1 ? -10 : eLen + 10), "#7ee787"); TX(c, `E = ${E.toFixed(0)} N`, X(pos.E) + 8, by + (lv.cls === 1 ? eLen * 0.6 : -eLen * 0.6), "#7ee787", "left", "600 13px");
  arrow(c, X(pos.L), by + 10, X(pos.L), by + 10 + lLen, "#ff8a70"); TX(c, `L = ${P.load} N`, X(pos.L) + 8, by + lLen * 0.6, "#ff8a70", "left", "600 13px");
  c.restore();
  c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(fx, by + 8); c.lineTo(fx - 16, by + 36); c.lineTo(fx + 16, by + 36); c.fill(); TX(c, "F", fx, by + 54, "#ffd166", "center", "600 14px");
  // arms
  const dim = (a, b, y, col, txt) => { c.strokeStyle = col; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(a), y); c.lineTo(X(b), y); c.stroke(); c.setLineDash([]); TX(c, txt, (X(a) + X(b)) / 2, y - 5, col, "center", "11.5px"); };
  dim(0, pos.E, by - 70, "#7ee787", `effort arm ${(P.eArm * 100).toFixed(1)} cm`); dim(0, pos.L, by + 90, "#ff8a70", `load arm ${(P.lArm * 100).toFixed(1)} cm`);
  TX(c, lv.name, 20, 28, "#eef2f8", "left", "600 15px"); TX(c, `${["First", "Second", "Third"][lv.cls - 1]}-class lever: ${lv.note}`, 20, 50, "#aab6cc", "left", "12.5px");
  TX(c, `MA = effort arm ÷ load arm = ${MA.toFixed(2)} ${MA > 1 ? "(> 1: less effort than load)" : "(< 1: more effort than load, but more speed and range)"}`, 20, h - 20, "#ffd166", "left", "600 13px");
}
// 3D figure for planes and axes: joints as [x (side), y (up), z (forward)]
function fig3d(move, t) {
  const H = 1.75, s = Math.sin(t * 2 * Math.PI), u = (t % 1);
  let J = { hip: [0, 0.95, 0], sh: [0, 1.45, 0], head: [0, 1.65, 0], lsh: [-0.2, 1.42, 0], rsh: [0.2, 1.42, 0], lh: [-0.1, 0.95, 0], rh: [0.1, 0.95, 0] };
  const limb = (base, ang, len, plane) => plane === "sag" ? [base[0], base[1] - len * Math.cos(ang), base[2] + len * Math.sin(ang)] : [base[0] + len * Math.sin(ang), base[1] - len * Math.cos(ang), base[2]];
  let la = 0, ra = 0, ll = 0, rl = 0, plane = "sag", le = 0, re = 0, lk = 0, rk = 0, spin = 0, roll = 0, pitch = 0, lift = 0;
  if (move === "run") { la = -0.7 * s; ra = 0.7 * s; ll = 0.6 * s; rl = -0.6 * s; le = 1.4; re = 1.4; lk = -0.6 * Math.max(0, -s); rk = -0.6 * Math.max(0, s); }
  if (move === "curl") { le = 0.1 + 1.4 * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI)); re = le; }
  if (move === "somersault") { pitch = u * 2 * Math.PI; la = 2.5; ra = 2.5; ll = -1.9; rl = -1.9; lk = 2.2; rk = 2.2; lift = 0.6 * Math.sin(u * Math.PI); }
  if (move === "star") { plane = "fro"; const k = 0.5 - 0.5 * Math.cos(t * 2 * Math.PI); la = -2.6 * k; ra = 2.6 * k; ll = -0.35 * k; rl = 0.35 * k; lift = 0.15 * Math.sin(t * Math.PI * 2) ** 2; }
  if (move === "cartwheel") { plane = "fro"; roll = u * 2 * Math.PI; la = -2.8; ra = 2.8; ll = -0.5; rl = 0.5; }
  if (move === "twist") { spin = u * 2 * Math.PI; la = Math.PI; ra = Math.PI; plane = "sag"; lift = 0.3 * Math.sin(u * Math.PI); }
  if (move === "golf") { spin = -1.4 * Math.sin(t * 2 * Math.PI); la = 0.6; ra = 0.6; plane = "sag"; }
  const pl = plane === "sag" ? "sag" : "fro";
  J.lel = limb(J.lsh, la, 0.3, pl); J.rel = limb(J.rsh, ra, 0.3, pl);
  J.lwr = plane === "sag" ? limb(J.lel, la + le, 0.27, "sag") : limb(J.lel, la, 0.27, "fro"); J.rwr = plane === "sag" ? limb(J.rel, ra + re, 0.27, "sag") : limb(J.rel, ra, 0.27, "fro");
  J.lkn = limb(J.lh, ll, 0.43, pl); J.rkn = limb(J.rh, rl, 0.43, pl); J.lan = limb(J.lkn, ll + lk, 0.43, pl); J.ran = limb(J.rkn, rl + rk, 0.43, pl);
  const com = [0, 0.97, 0];
  // whole-body rotations about the centre of mass: pitch (somersault, transverse axis), roll (cartwheel, frontal axis), spin (twist, longitudinal axis)
  for (const k in J) { let [x, y, z] = J[k]; y -= com[1];
    if (pitch) { const c1 = Math.cos(pitch), s1 = Math.sin(pitch); [y, z] = [y * c1 - z * s1, y * s1 + z * c1]; }
    if (roll) { const c1 = Math.cos(roll), s1 = Math.sin(roll); [x, y] = [x * c1 - y * s1, x * s1 + y * c1]; }
    if (spin) { const c1 = Math.cos(spin), s1 = Math.sin(spin); [x, z] = [x * c1 + z * s1, -x * s1 + z * c1]; }
    J[k] = [x, y + com[1] + lift, z]; }
  return { J, com: [0, com[1] + lift, 0] };
}
const PLANE_OF = { run: "sagittal", curl: "sagittal", somersault: "sagittal", star: "frontal", cartwheel: "frontal", twist: "transverse", golf: "transverse" };
function drawPlanes(c, w, h) {
  const { J, com } = fig3d(P.move, t0 * 0.6), pl = PLANE_OF[P.move], S = Math.min(w, h) * 0.32, cx = w * 0.45, cy = h * 0.72, pitchV = 0.25;
  const proj = ([x, y, z]) => { const X = x * Math.cos(yaw) + z * Math.sin(yaw), Z = -x * Math.sin(yaw) + z * Math.cos(yaw), Y = y * Math.cos(pitchV) - Z * Math.sin(pitchV) * 0.6; return [cx + X * S, cy - Y * S]; };
  // the plane through the centre of mass
  const R = 1.0, quad = pl === "sagittal" ? [[0, -R, -R], [0, R, -R], [0, R, R], [0, -R, R]] : pl === "frontal" ? [[-R, -R, 0], [R, -R, 0], [R, R, 0], [-R, R, 0]] : [[-R, 0, -R], [R, 0, -R], [R, 0, R], [-R, 0, R]];
  c.fillStyle = pl === "sagittal" ? "rgba(90,209,255,.16)" : pl === "frontal" ? "rgba(126,231,135,.16)" : "rgba(201,160,255,.18)"; c.beginPath(); quad.forEach((p, i) => { const q = proj([p[0] + com[0], p[1] + com[1], p[2] + com[2]]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.fill();
  // the axis at right angles to it
  const ax = pl === "sagittal" ? [1, 0, 0] : pl === "frontal" ? [0, 0, 1] : [0, 1, 0], a1 = proj([com[0] - ax[0] * 1.2, com[1] - ax[1] * 1.2, com[2] - ax[2] * 1.2]), a2 = proj([com[0] + ax[0] * 1.2, com[1] + ax[1] * 1.2, com[2] + ax[2] * 1.2]);
  c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.setLineDash([8, 5]); c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
  // ground and the figure
  c.strokeStyle = "rgba(255,255,255,.15)"; for (let i = -2; i <= 2; i++) { const p1 = proj([i * 0.5, 0, -1]), p2 = proj([i * 0.5, 0, 1]), p3 = proj([-1, 0, i * 0.5]), p4 = proj([1, 0, i * 0.5]); c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.moveTo(p3[0], p3[1]); c.lineTo(p4[0], p4[1]); c.stroke(); }
  const bone = (a, b, wd, col = "#cfd8ea") => { const p = proj(J[a]), q = proj(J[b]); c.strokeStyle = col; c.lineWidth = wd; c.lineCap = "round"; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); };
  bone("lsh", "rsh", 6); bone("lh", "rh", 6); bone("hip", "sh", 9); bone("lsh", "lel", 5, "#9aa8c2"); bone("lel", "lwr", 5, "#9aa8c2"); bone("rsh", "rel", 5); bone("rel", "rwr", 5); bone("lh", "lkn", 7, "#9aa8c2"); bone("lkn", "lan", 6, "#9aa8c2"); bone("rh", "rkn", 7); bone("rkn", "ran", 6);
  const hd = proj(J.head); c.fillStyle = "#cfd8ea"; c.beginPath(); c.arc(hd[0], hd[1], 0.1 * S, 0, 6.3); c.fill(); c.lineWidth = 1; const cm = proj(com); comMark(c, cm[0], cm[1]);
  const axisName = { sagittal: "transverse axis", frontal: "frontal axis", transverse: "longitudinal axis" }[pl];
  TX(c, `${{ run: "Running", curl: "Biceps curl", somersault: "Front somersault", star: "Star jump", cartwheel: "Cartwheel", twist: "Full twist", golf: "Golf swing" }[P.move]}`, 20, 28, "#eef2f8", "left", "600 15px");
  TX(c, `${pl} plane`, 20, 52, pl === "sagittal" ? "#5ad1ff" : pl === "frontal" ? "#7ee787" : "#c9a0ff", "left", "600 14px"); TX(c, axisName + " (dashed yellow, at right angles to the plane)", 20, 74, "#ffd166", "left", "600 13px");
  TX(c, "Drag to turn the view. OCR lists the planes and axes; check the pairing against an OCR mark scheme.", 20, h - 16, "#7d8aa5", "left", "11px");
}
POSES.split = { trunk: 0, head: 0, ua: 0.3, fa: 0.3, th: 0.5, sh: 0.5, ua2: -0.3, fa2: -0.3, th2: -0.5, sh2: -0.5 };
POSES.crouch = { trunk: 1.0, head: 1.2, ua: 0.3, fa: 0.6, th: 1.5, sh: -0.6, ua2: 0.3, fa2: 0.6, th2: 1.5, sh2: -0.6 };
POSES.arab = { trunk: 0.9, head: 1.0, ua: 2.2, fa: 2.2, th: 0, sh: 0, ua2: 1.6, fa2: 1.6, th2: -1.45, sh2: -1.5 };
const STAB = { stand: { name: "Standing", hc: 1.0, half: 0.15, off: 0, pose: "stand" }, split: { name: "Wide stance", hc: 0.85, half: 0.45, off: 0, pose: "split" }, set: { name: "Low crouch (rugby, wrestling)", pose: "crouch" }, arab: { name: "Arabesque", hc: 1.0, half: 0.06, off: 0, pose: "arab" }, hand: { name: "Handstand", hc: 0.95, half: 0.08, off: 0, pose: "layout" } };
// stability geometry from the body itself: the lowest points touch the ground and make the base of support
function stabGeom(key) {
  const st = STAB[key], b = body(POSES[st.pose], P.H, P.M), flip = key === "hand" ? -1 : 1;
  const pts = []; for (const q of b.segs) pts.push(q.a, q.b); const P2 = pts.map(p => [p[0], p[1] * flip]), low = Math.min(...P2.map(p => p[1]));
  const touch = P2.filter(p => p[1] < low + 0.04).map(p => p[0]), x0 = Math.min(...touch) - 0.04, x1 = Math.max(...touch) + 0.04, cx = b.com[0], hc = b.com[1] * flip - low;
  return { st, b, flip, low, x0, x1, cx, hc, d: Math.max(0, x1 - cx), inside: cx > x0 && cx < x1 };
}
function drawStability(c, w, h) {
  const G = stabGeom(P.stab), W = P.M * g0, need = W * G.d / G.hc, tip = P.push > need || !G.inside, gy = h * 0.82, S = h * 0.36, ox = w * 0.4;
  const X = x => ox + x * S, tilt = tip ? Math.min(1.3, (t0 % 3) * 0.6) : 0, pivot = [X(G.x1), gy];
  c.fillStyle = "#24324f"; c.fillRect(0, gy, w, h - gy);
  c.fillStyle = "rgba(126,231,135,.45)"; c.fillRect(X(G.x0), gy - 4, (G.x1 - G.x0) * S, 8); TX(c, "base of support", (X(G.x0) + X(G.x1)) / 2, gy + 22, "#7ee787", "center", "12px");
  c.save(); c.translate(pivot[0], pivot[1]); c.rotate(tilt); c.translate(-pivot[0], -pivot[1]);
  if (G.flip < 0) { c.save(); c.translate(0, 2 * gy); c.scale(1, -1); drawBody(c, G.b, X(0), gy - G.low * S, S); c.restore(); } else drawBody(c, G.b, X(0), gy + G.low * S, S);
  c.restore();
  const rx = X(G.cx) - pivot[0], ry = -G.hc * S, ca = Math.cos(tilt), sa = Math.sin(tilt), px = pivot[0] + rx * ca - ry * sa, py = pivot[1] + rx * sa + ry * ca;
  comMark(c, px, py); c.strokeStyle = "#ffd166"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(px, py); c.lineTo(px, gy); c.stroke(); c.setLineDash([]); TX(c, "line of gravity", px + 8, gy - 10, "#ffd166", "left", "11.5px");
  if (P.push > 0) { arrow(c, px - 30 - P.push / 4, py, px - 10, py, "#ff8a70"); TX(c, `push ${P.push} N`, px - 34 - P.push / 4, py - 10, "#ff8a70", "left", "600 12px"); }
  TX(c, G.st.name, 20, 28, "#eef2f8", "left", "600 15px"); TX(c, `push needed to topple = W × d ÷ h = ${W.toFixed(0)} × ${G.d.toFixed(2)} ÷ ${G.hc.toFixed(2)} = ${need.toFixed(0)} N`, 20, 52, "#aab6cc", "left", "12.5px");
  TX(c, tip ? "The line of gravity moves outside the base: the athlete topples" : "Stable: the push is too small to tip the line of gravity past the edge of the base", 20, h - 30, tip ? "#ff6b81" : "#7ee787", "left", "600 13px");
  return need;
}
function impulseData() {
  const M = P.M, W = M * g0;
  if (P.impulse === "jump") { const r = cmj(M, P.peak * W); return { F: r.F, W, info: r, kind: "jump" }; }
  if (P.impulse === "land") { const v = Math.sqrt(2 * g0 * 0.6), tc = P.knees === "stiff" ? 0.05 : 0.3, peak = W + Math.PI * M * v / (2 * tc), F = []; for (let t = 0; t <= tc + 0.2; t += 0.002) F.push([t, t < tc ? W + (peak - W) * Math.sin(Math.PI * t / tc) : W]); return { F, W, info: { v, tc, peak }, kind: "land" }; }
  // sprint start: alternate braking and propulsive impulses, accelerating towards top speed
  const vmax = 10.5, tau = 1.3, F = []; let t = 0, v = 0, stepT = 0.0; const ct = 0.12, fl = 0.12;
  while (t < 3) { const v1 = vmax * (1 - Math.exp(-(t + ct + fl) / tau)), dv = v1 - v, Jn = M * dv, brake = 0.15 * M * v / 10, prop = Jn + brake; for (let s = 0; s < ct; s += 0.002) { const f = s < ct * 0.3 ? -brake * Math.PI / (2 * ct * 0.3) * Math.sin(Math.PI * s / (ct * 0.3)) : prop * Math.PI / (2 * ct * 0.7) * Math.sin(Math.PI * (s - ct * 0.3) / (ct * 0.7)); F.push([t + s, f]); } for (let s = 0; s < fl; s += 0.01) F.push([t + ct + s, 0]); t += ct + fl; v = v1; }
  return { F, W: 0, info: { vmax }, kind: "sprint" };
}
function drawImpulse(c, w, h) {
  const d = impulseData(), M = P.M; TX(c, { jump: "Countermovement jump on a force plate", land: "Landing from a 0.6 m box", sprint: "Sprint start: horizontal force on the track" }[d.kind], 20, 28, "#eef2f8", "left", "600 15px");
  const gy = h * 0.82, S = h * 0.36, cx = w * 0.5, b0 = body(POSES.stand, P.H, M);
  c.fillStyle = "#24324f"; c.fillRect(0, gy, w, h - gy); c.fillStyle = "#3a4a6b"; c.fillRect(cx - 60, gy - 6, 120, 6); TX(c, d.kind === "sprint" ? "track" : "force plate", cx, gy + 18, "#8fa0bf", "center", "11px");
  let y = 0, k = 0; const T = d.F[d.F.length - 1][0], tt = (t0 * 0.5) % (T + 1.2);
  if (d.kind === "jump") { const r = d.info, vt = r.v; if (tt < T) { let v = 0, s = 0; for (const [t, f] of d.F) { if (t > tt) break; v += (f - d.W) / M * 0.002; s += v * 0.002; } y = s; k = Math.min(1, Math.max(0, -s * 4)); } else { const tf = tt - T; y = Math.max(0, vt * tf - 0.5 * g0 * tf * tf); } }
  if (d.kind === "land") { const tf = Math.sqrt(2 * 0.6 / g0); y = tt < tf ? 0.6 - 0.5 * g0 * tt * tt : 0; k = tt > tf ? Math.min(1, (tt - tf) / d.info.tc) * (P.knees === "stiff" ? 0.1 : 0.6) : 0; c.fillStyle = "#3a4a6b"; c.fillRect(cx - 150, gy - 0.6 * S, 80, 0.6 * S); }
  const pose = mixPose(POSES.stand, { trunk: 0.5, head: 0.3, ua: -0.6, fa: -0.3, th: 1.2, sh: -0.4, ua2: -0.6, fa2: -0.3, th2: 1.2, sh2: -0.4 }, k), bd = body(pose, P.H, M), low = Math.min(...bd.segs.map(q => Math.min(q.a[1], q.b[1])));
  drawBody(c, bd, cx - (d.kind === "land" && tt < Math.sqrt(2 * 0.6 / g0) ? 110 : 0), gy - (y - low) * S, S);
  const last = d.F.filter(p => p[0] <= Math.min(tt, T)).pop(); if (last && d.kind !== "sprint") { const len = Math.min(140, last[1] / d.W * 45); arrow(c, cx + 80, gy, cx + 80, gy - len, "#7ee787"); TX(c, `R = ${(last[1] / d.W).toFixed(2)} × W`, cx + 88, gy - len / 2, "#7ee787", "left", "600 12px"); arrow(c, cx + 120, gy - 100, cx + 120, gy - 55, "#ff8a70"); TX(c, "W", cx + 128, gy - 70, "#ff8a70", "left", "600 12px"); }
  return d;
}
function drawProj(c, w, h) {
  const sp = SPORTS[P.sport], f = flight, xm = Math.max(f.range, noAirRange(P.v, P.ang, P.h)) * 1.1 + 1, ym = Math.max(...f.pts.map(p => p[1])) * 1.25 + 0.5, s = Math.min((w - 80) / xm, (h - 90) / ym), X = x => 50 + x * s, Y = y => h - 40 - y * s;
  c.fillStyle = "#1a3a24"; c.fillRect(0, h - 40, w, 40); c.strokeStyle = "rgba(255,255,255,.12)"; for (let x = 0; x <= xm; x += xm > 40 ? 10 : xm > 10 ? 5 : 1) { c.beginPath(); c.moveTo(X(x), h - 40); c.lineTo(X(x), h - 34); c.stroke(); TX(c, x + " m", X(x), h - 22, "#8fa0bf", "center", "10.5px"); }
  // no-air parabola (dashed) and the real flight
  c.strokeStyle = "rgba(255,255,255,.35)"; c.setLineDash([5, 4]); c.beginPath(); const a = P.ang * Math.PI / 180; for (let t = 0; ; t += 0.01) { const x = P.v * Math.cos(a) * t, y = P.h + P.v * Math.sin(a) * t - 0.5 * g0 * t * t; if (y < 0) break; t ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); } c.stroke(); c.setLineDash([]);
  const n = Math.min(f.pts.length, Math.floor(flightT / (f.t / f.pts.length))); c.strokeStyle = "#ffd166"; c.lineWidth = 2.5; c.beginPath(); f.pts.slice(0, Math.max(1, n)).forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); c.lineWidth = 1;
  const pt = f.pts[Math.min(f.pts.length - 1, Math.max(0, n - 1))]; c.fillStyle = "#fff"; c.beginPath(); c.arc(X(pt[0]), Y(pt[1]), 6, 0, 6.3); c.fill();
  arrow(c, X(0), Y(P.h), X(0) + Math.cos(a) * 60, Y(P.h) - Math.sin(a) * 60, "#7ee787", 2); TX(c, `${P.ang}°`, X(0) + 66, Y(P.h) - 10, "#7ee787", "left", "600 12px");
  TX(c, sp.name, 20, 28, "#eef2f8", "left", "600 15px"); TX(c, `distance ${f.range.toFixed(2)} m (no air ${noAirRange(f.v, P.ang, P.h).toFixed(2)} m) · flight ${f.t.toFixed(2)} s${P.real && P.ang > 37 ? ` · release speed reduced to ${f.v.toFixed(2)} m/s` : ""}`, 20, 50, "#aab6cc", "left", "12.5px");
  if (P.spin) TX(c, P.spin > 0 ? "topspin: Magnus force downwards, the ball dips" : "backspin: Magnus force upwards, the ball floats", 20, 70, "#c9a0ff", "left", "12px");
}
function drawRotation(c, w, h) {
  const M = P.M, H = P.H; TX(c, P.shape === "skater" ? "Figure skater: arms out → arms in" : `Diver from the 10 m platform (${P.shape})`, 20, 28, "#eef2f8", "left", "600 15px");
  if (P.shape === "skater") {
    const k = 0.5 - 0.5 * Math.cos(Math.min(1, (t0 % 6) / 3) * Math.PI), I = 3.5 + (1.2 - 3.5) * k, L = 3.5 * 2 * Math.PI * 0.8, wv = L / I; skAng += wv * 0.016;
    const cx = w * 0.45, cy = h * 0.5, R = 80 + 80 * (1 - k); c.strokeStyle = "#cfd8ea"; c.lineWidth = 6; for (const s of [1, -1]) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + s * R * Math.cos(skAng), cy + s * R * Math.sin(skAng) * 0.35); c.stroke(); } c.lineWidth = 1; c.fillStyle = "#ffd166"; c.beginPath(); c.arc(cx, cy, 14, 0, 6.3); c.fill();
    TX(c, `I = ${I.toFixed(2)} kg m² · ω = ${(wv / (2 * Math.PI)).toFixed(2)} turns per second · L = Iω = ${L.toFixed(1)} kg m²/s (constant)`, 20, h - 16, "#ffd166", "left", "600 13px"); return { I, w: wv, L };
  }
  const d = diveRun, T = d.out[d.out.length - 1].t, tt = (t0 * 0.6) % (T + 1), i = Math.min(d.out.length - 1, Math.floor(tt / 0.005)), st = d.out[i];
  const S = h / 13, X0 = w * 0.42, Y = y => h - 30 - y * S;
  c.fillStyle = "#3a4a6b"; c.fillRect(X0 - 160, Y(10), 120, 8); c.fillStyle = "#1c4a7a"; c.fillRect(0, Y(0), w, h - Y(0));
  for (let k = 0; k < d.out.length; k += 40) { const q = d.out[k]; c.fillStyle = "rgba(255,209,102,.25)"; c.beginPath(); c.arc(X0 + q.t * 25, Y(q.y), 3, 0, 6.3); c.fill(); }
  const shapePose = P.shape === "pike" ? POSES.pike : POSES.tuck, pose = mixPose(POSES.layout, mixPose(POSES.layout, shapePose, P.tight), st.k), b = body(pose, H, M);
  drawBody(c, b, X0 + st.t * 25 - b.com[0] * S * 2.2, Y(st.y) + b.com[1] * S * 2.2, S * 2.2, -st.ang); comMark(c, X0 + st.t * 25, Y(st.y));
  TX(c, `${d.turns.toFixed(2)} somersaults · I layout ${d.Ilay.toFixed(1)}, ${P.shape} ${d.Ishape.toFixed(1)} kg m²`, 20, 50, "#aab6cc", "left", "12.5px");
  return st;
}
let skAng = 0;
function drawBounce(c, w, h) {
  const b = bounce, tt = (t0 * 0.8) % (b.T + 0.5), S = (h - 80) / 2.6, X0 = w * 0.3, Y = y => h - 40 - y * S;
  c.fillStyle = "#24324f"; c.fillRect(0, Y(0), w, h - Y(0));
  c.strokeStyle = "#ffd166"; c.fillStyle = "#ffd166"; for (let y = 0; y <= 2.5; y += 0.1) { c.beginPath(); c.moveTo(X0 - 40, Y(y)); c.lineTo(X0 - 40 + (Math.round(y * 10) % 5 === 0 ? 14 : 7), Y(y)); c.stroke(); if (Math.round(y * 10) % 5 === 0) TX(c, y.toFixed(1) + " m", X0 - 46, Y(y) + 4, "#ffd166", "right", "10.5px"); }
  let pos = 0; for (const p of b.pts) { if (p[0] > tt) break; pos = p[1]; } c.fillStyle = { tennis: "#d6f05a", basket: "#ff8a3a", golf: "#fff", squashC: "#333", squashW: "#555" }[P.ball]; c.beginPath(); c.arc(X0, Y(pos) - 10, 10, 0, 6.3); c.fill();
  b.tops.slice(0, 5).forEach((hh, i) => { c.strokeStyle = "rgba(255,255,255,.25)"; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(X0 + 20, Y(hh)); c.lineTo(X0 + 260, Y(hh)); c.stroke(); c.setLineDash([]); TX(c, `h${i} = ${hh.toFixed(3)} m`, X0 + 266, Y(hh) + 4, "#cfd8ea", "left", "11.5px"); });
  TX(c, "Coefficient of restitution", 20, 28, "#eef2f8", "left", "600 15px"); TX(c, `e = √(h₁ ÷ h₀) = √(${b.tops[1].toFixed(3)} ÷ ${b.tops[0].toFixed(3)}) = ${b.e.toFixed(2)}; each bounce keeps e² = ${(b.e * b.e * 100).toFixed(0)}% of the kinetic energy`, 20, 50, "#aab6cc", "left", "12.5px");
}

// ---------------- Charts, readings, loop ----------------
function charts(extra) {
  const c2 = (ser, o, ta, xl, yl, tb) => { chA.opts.title = ta; chA.opts.xLabel = xl; chA.opts.yLabel = yl; chA.opts.xFmt = null; chA.draw(ser, o); };
  if (P.view === "levers") {
    const lv = LEVERS[P.lever], pts = []; for (let a = 0.02; a <= 0.6; a += 0.01) pts.push([a * 100, effortFor(lv, P.load, a, P.eArm)]);
    c2([{ pts, color: "#7ee787", label: "effort needed" }, { pts: [[P.lArm * 100, effortFor(lv, P.load, P.lArm, P.eArm)]], type: "dots", r: 6, color: "#ffd166", label: "now" }], { yMin: 0, hlines: [{ y: P.load, label: "MA = 1", color: "#56607a" }] }, "Effort against load arm", "load arm (cm)", "effort (N)");
    chB.opts.title = "Mechanical advantage of the examples"; chB.opts.xLabel = ""; chB.opts.yLabel = "MA"; chB.opts.xFmt = whole(v => ["", "neck", "throw", "calf", "curl", "kick"][v] || "");
    chB.draw(Object.values(LEVERS).map((l, i) => ({ pts: [[i + 1, l.eArm / l.lArm]], type: "bars", w: 0.6, color: ["#5ad1ff", "#5ad1ff", "#7ee787", "#ff8a70", "#ff8a70"][i], label: i === 0 ? "1st" : i === 2 ? "2nd" : i === 3 ? "3rd" : "" })), { xMin: 0.4, xMax: 5.6, yMin: 0, hlines: [{ y: 1, label: "MA = 1" }] });
    const lvN = LEVERS[P.lever]; label(0, "effort needed"); label(1, "mechanical advantage"); label(2, "class"); label(3, "moments"); read.set("a", effortFor(lvN, P.load, P.lArm, P.eArm).toFixed(0) + " N"); read.set("b", (P.eArm / P.lArm).toFixed(2)); read.set("c", ["first", "second", "third"][lvN.cls - 1]); read.set("d", `${effortFor(lvN, P.load, P.lArm, P.eArm).toFixed(0)} × ${P.eArm} = ${P.load} × ${P.lArm}`);
  } else if (P.view === "planes") {
    const pts = []; for (let i = 0; i <= 60; i++) { const { J } = fig3d(P.move, i / 60); const v1 = J.rel.map((x, k) => x - J.rsh[k]), v2 = J.rwr.map((x, k) => x - J.rel[k]); const ang = Math.acos(K.clamp((v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (Math.hypot(...v1) * Math.hypot(...v2)), -1, 1)); pts.push([i / 60, 180 - ang * 180 / Math.PI]); }
    c2([{ pts, color: "#5ad1ff", label: "elbow angle" }], { yMin: 0, yMax: 190 }, "Elbow angle through one repetition", "fraction of the movement", "angle (°)");
    const hp = []; for (let i = 0; i <= 60; i++) hp.push([i / 60, fig3d(P.move, i / 60).com[1]]); chB.opts.title = "Height of the centre of mass"; chB.opts.xLabel = "fraction of the movement"; chB.opts.yLabel = "m"; chB.opts.xFmt = null; chB.draw([{ pts: hp, color: "#ffd166", label: "centre of mass" }], { yMin: 0, yMax: 2 });
    const pl = PLANE_OF[P.move]; label(0, "plane"); label(1, "axis"); label(2, "example movements"); label(3, "–"); read.set("a", pl); read.set("b", { sagittal: "transverse", frontal: "frontal", transverse: "longitudinal" }[pl]); read.set("c", { sagittal: "running, curl, squat, somersault", frontal: "star jump, cartwheel, side bend", transverse: "full twist, golf swing, discus" }[pl]); read.set("d", "–");
  } else if (P.view === "stability") {
    const G = stabGeom(P.stab), W = P.M * g0, pts = [], pts2 = []; for (let hc = 0.3; hc <= 1.3; hc += 0.05) pts.push([hc, W * G.d / hc]); for (let d = 0.02; d <= 0.5; d += 0.02) pts2.push([d, W * d / G.hc]);
    c2([{ pts, color: "#ff8a70", label: "push needed" }, { pts: [[G.hc, W * G.d / G.hc]], type: "dots", r: 6, color: "#ffd166", label: "now" }], { yMin: 0 }, "Push against centre-of-mass height", "height of the centre of mass (m)", "N");
    chB.opts.title = "… against distance to the edge of the base"; chB.opts.xLabel = "distance d (m)"; chB.opts.yLabel = "N"; chB.opts.xFmt = null; chB.draw([{ pts: pts2, color: "#7ee787", label: "push needed" }, { pts: [[G.d, W * G.d / G.hc]], type: "dots", r: 6, color: "#ffd166", label: "now" }], { yMin: 0 });
    label(0, "push needed"); label(1, "height of the centre of mass"); label(2, "distance to the edge"); label(3, "outcome"); read.set("a", (W * G.d / G.hc).toFixed(0) + " N"); read.set("b", G.hc.toFixed(2) + " m"); read.set("c", G.d.toFixed(2) + " m"); read.set("d", P.push > W * G.d / G.hc ? "topples" : "stable");
  } else if (P.view === "impulse") {
    const d = extra, W = d.W || 1, pts = d.F.map(([t, f]) => [t, d.kind === "sprint" ? f : f / W]);
    const v = []; let vv = 0; for (const [t, f] of d.F) { vv += (f - d.W) / P.M * 0.002 * (d.kind === "sprint" ? 1 : 1); v.push([t, vv]); }
    c2([{ pts, color: "#7ee787", label: d.kind === "sprint" ? "horizontal force (N)" : "force ÷ body weight" }], d.kind === "sprint" ? { hlines: [{ y: 0 }] } : { yMin: 0, hlines: [{ y: 1, label: "body weight", color: "#ff8a70" }] }, d.kind === "sprint" ? "Force–time: braking (−) and propulsive (+) impulses" : "Force–time graph", "time (s)", d.kind === "sprint" ? "N" : "× body weight");
    chB.opts.title = "Velocity"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "m/s"; chB.opts.xFmt = null; chB.draw([{ pts: d.kind === "sprint" ? (() => { let s = 0; return d.F.map(([t, f]) => { s += f / P.M * 0.002; return [t, s]; }); })() : v, color: "#5ad1ff", label: "velocity" }], { hlines: [{ y: 0 }] });
    label(0, "net impulse"); label(1, "take-off / landing speed"); label(2, "jump height / peak force"); label(3, "contact time");
    if (d.kind === "jump") { read.set("a", d.info.imp.toFixed(0) + " N s"); read.set("b", d.info.v.toFixed(2) + " m/s = impulse ÷ mass"); read.set("c", (d.info.h * 100).toFixed(1) + " cm = v² ÷ 2g"); read.set("d", "0.63 s on the plate"); }
    else if (d.kind === "land") { read.set("a", (P.M * d.info.v).toFixed(0) + " N s (m × v)"); read.set("b", d.info.v.toFixed(2) + " m/s"); read.set("c", `${d.info.peak.toFixed(0)} N (${(d.info.peak / (P.M * g0)).toFixed(1)} × body weight)`); read.set("d", d.info.tc + " s"); }
    else { read.set("a", "positive: speeding up"); read.set("b", "top speed 10.5 m/s"); read.set("c", "–"); read.set("d", "0.12 s per step"); }
  } else if (P.view === "proj") {
    const sp = SPORTS[P.sport], pts = [], pts0 = []; let best = [0, 0]; for (let a = 2; a <= 70; a += 1) { const r = fly(sp, Object.assign({}, P, { ang: a })).range; pts.push([a, r]); if (r > best[1]) best = [a, r]; pts0.push([a, noAirRange(P.v, a, P.h)]); }
    c2([{ pts, color: "#ffd166", label: "with this air and spin" }, { pts: pts0, color: "#56607a", dash: [5, 4], label: "no air" }, { pts: [[P.ang, flight.range]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, vlines: [{ x: best[0], label: "best " + best[0] + "°", color: "#7ee787" }] }, "Distance against release angle", "release angle (°)", "distance (m)");
    chB.opts.title = "Height during the flight"; chB.opts.xLabel = "distance (m)"; chB.opts.yLabel = "height (m)"; chB.opts.xFmt = null; chB.draw([{ pts: flight.pts, color: "#ffd166", label: "flight" }], { yMin: 0 });
    label(0, "distance"); label(1, "best angle (no air)"); label(2, "flight time"); label(3, "release"); read.set("a", flight.range.toFixed(2) + " m"); read.set("b", bestAngle(P.v, P.h).toFixed(1) + "°"); read.set("c", flight.t.toFixed(2) + " s"); read.set("d", `${flight.v.toFixed(1)} m/s at ${P.ang}° from ${P.h} m`);
  } else if (P.view === "rotation") {
    if (P.shape === "skater") { chA.draw([], {}); chB.draw([], {}); label(0, "L = Iω"); read.set("a", "constant (no external torque)"); return; }
    const d = diveRun; c2([{ pts: d.out.map(q => [q.t, q.w / (2 * Math.PI)]), color: "#ffd166", label: "ω (turns per second)" }, { pts: d.out.map(q => [q.t, q.I]), color: "#5ad1ff", label: "I (kg m²)" }], { yMin: 0 }, "Angular velocity and moment of inertia", "time (s)", "");
    chB.opts.title = "Angular momentum L = Iω"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "kg m²/s"; chB.opts.xFmt = null; chB.draw([{ pts: d.out.map(q => [q.t, q.I * q.w]), color: "#7ee787", label: "L" }], { yMin: 0, yMax: d.L * 1.5 });
    label(0, "somersaults"); label(1, "moment of inertia"); label(2, "angular momentum"); label(3, "rotational KE ½Iω²"); const st = extra || d.out[0]; read.set("a", d.turns.toFixed(2)); read.set("b", `layout ${d.Ilay.toFixed(1)}, ${P.shape} ${d.Ishape.toFixed(1)} kg m²`); read.set("c", d.L.toFixed(1) + " kg m²/s (constant)"); read.set("d", `${(0.5 * st.I * st.w * st.w).toFixed(0)} J now`);
  } else {
    const b = bounce; c2([{ pts: b.pts, color: "#ffd166", label: "height" }], { yMin: 0 }, "Height of the ball", "time (s)", "m");
    chB.opts.title = "Kinetic energy at each bounce"; chB.opts.xLabel = "bounce"; chB.opts.yLabel = "% of the start"; chB.opts.xFmt = whole(v => String(v)); chB.draw([{ pts: b.tops.slice(0, 8).map((hh, i) => [i, hh / b.tops[0] * 100]), type: "bars", w: 0.6, color: "#5ad1ff", label: "KE (× e² each time)" }], { yMin: 0 });
    label(0, "e"); label(1, "bounce height"); label(2, "kinetic energy kept"); label(3, "–"); read.set("a", b.e.toFixed(2)); read.set("b", b.tops[1].toFixed(3) + " m"); read.set("c", (b.e * b.e * 100).toFixed(0) + "%"); read.set("d", "–");
  }
}
K.pointer(cv.el, { drag: (x, y, dx) => { if (P.view === "planes") yaw += (dx || 0) * 0.01; } });
let frame = 0, lastExtra = null;
ui.run(dt => { if (!(dt > 0)) return; t0 += dt; flightT += dt; if (flightT > flight.t + 1.5) flightT = 0; }, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0a1020"; c.fillRect(0, 0, w, h);
  const adv = ui.level === "adv", advOnly = ["stability", "impulse", "proj", "rotation", "bounce"].includes(P.view);
  if (P.view === "levers") drawLevers(c, w, h); else if (P.view === "planes") drawPlanes(c, w, h); else if (P.view === "stability") lastExtra = drawStability(c, w, h); else if (P.view === "impulse") lastExtra = drawImpulse(c, w, h); else if (P.view === "proj") drawProj(c, w, h); else if (P.view === "rotation") lastExtra = drawRotation(c, w, h); else drawBounce(c, w, h);
  if (advOnly && !adv) TX(c, "This view is A level (H555): switch to Advanced for the full story", w - 14, h - 12, "#8fa0bf", "right", "11.5px");
  if (frame++ % 6 === 0) { charts(lastExtra); ui.hud({ levers: "Effort × effort arm = load × load arm", planes: "Every movement: a plane and an axis at right angles to it", stability: "Low centre of mass, wide base: stable", impulse: "Impulse = force × time = change in momentum", proj: "Speed, angle and height decide the distance", rotation: "L = Iω stays the same in the air", bounce: "e = √(bounce height ÷ drop height)" }[P.view]); }
});
set({});
ui.tip("Seven views of the moving body: choose one at the top of the left panel.", 6000);
