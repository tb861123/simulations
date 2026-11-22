/* =====================================================================
   GRAVITY-ASSIST SANDBOX
   A probe flies past a moving planet. In the PLANET'S frame the flyby is
   a fair exchange: the probe leaves at exactly the speed it arrived with,
   only its direction has turned. But the planet is moving round the Sun,
   so in the SUN'S frame that turned velocity can be much bigger (or
   smaller) than before. The probe steals a tiny bit of the planet's
   orbital energy: this is how Voyager reached Neptune and beyond.

   Units (so the numbers are real):  distance in AU (Sun–Earth distance),
   time in years, so G·M(Sun) = 4π² AU³/yr².   1 AU/yr = 4.74 km/s.
   ===================================================================== */

// ---------------------------------------------------------------- physics (no drawing: the Batch run uses this too)
const KMS = 4.7406;                 // 1 AU per year in km/s
const GM_SUN = 4 * Math.PI * Math.PI; // G × mass of the Sun, in AU³/yr²
const R_SUN = 0.00465;              // radius of the Sun in AU
const DAY = 1 / 365.25;             // one day in years
// Real planets: orbit radius a (AU), mass (as a fraction of the Sun's), radius (AU), colour, look
const PLANETS = {
  mercury: { name: "Mercury", a: 0.387, m: 1.66e-7, R: 1.63e-5, col: [0.72, 0.68, 0.64], look: 1 },
  venus: { name: "Venus", a: 0.723, m: 2.45e-6, R: 4.05e-5, col: [0.93, 0.80, 0.55], look: 1 },
  earth: { name: "Earth", a: 1.0, m: 3.00e-6, R: 4.26e-5, col: [0.32, 0.62, 1.0], look: 1 },
  mars: { name: "Mars", a: 1.524, m: 3.23e-7, R: 2.27e-5, col: [0.92, 0.45, 0.28], look: 1 },
  jupiter: { name: "Jupiter", a: 5.203, m: 9.55e-4, R: 4.78e-4, col: [0.86, 0.64, 0.42], look: 2 },
  saturn: { name: "Saturn", a: 9.537, m: 2.86e-4, R: 4.03e-4, col: [0.92, 0.82, 0.56], look: 3 },
  uranus: { name: "Uranus", a: 19.19, m: 4.37e-5, R: 1.71e-4, col: [0.56, 0.88, 0.91], look: 4 },
  neptune: { name: "Neptune", a: 30.07, m: 5.15e-5, R: 1.65e-4, col: [0.33, 0.50, 1.0], look: 4 },
};
const R_JUP = PLANETS.jupiter.R, MU_JUP = GM_SUN * PLANETS.jupiter.m;

/* A body is the Sun, a planet on a circular orbit, or (for the single-flyby lab) a planet moving in a
   straight line at constant velocity U. Its position at any time is known exactly, so only the probe's
   motion has to be worked out step by step. */
function makePlanet(key, phase, massX = 1) {
  const p = PLANETS[key], mu = GM_SUN * p.m * massX;
  return { key, name: p.name, kind: "orbit", a: p.a, ph: phase, w: Math.sqrt(GM_SUN / (p.a ** 3)), mu, R: p.R, col: p.col, look: p.look, mE: p.m / 3.0e-6,
    soi: p.a * Math.pow(p.m * massX, 0.4) };   // sphere of influence: inside it the planet's pull matters more than the Sun's
}
function makeSun() { return { key: "sun", name: "Sun", kind: "sun", mu: GM_SUN, R: R_SUN, col: [1, 0.85, 0.5], look: 0, soi: 0 }; }
function bodyPos(b, t) {
  if (b.kind === "sun") return [0, 0];
  if (b.kind === "line") return [b.U * t, 0];
  const th = b.ph + b.w * t; return [b.a * Math.cos(th), b.a * Math.sin(th)];
}
function bodyVel(b, t) {
  if (b.kind === "sun") return [0, 0];
  if (b.kind === "line") return [b.U, 0];
  const th = b.ph + b.w * t, v = b.a * b.w; return [-v * Math.sin(th), v * Math.cos(th)];
}
// The probe's acceleration: Newton's law of gravity, a = GM/r², towards every body (the probe's own mass does not matter)
function accel(bodies, x, y, t, skip) {
  let ax = 0, ay = 0;
  for (let i = 0; i < bodies.length; i++) {
    if (i === skip) continue;
    const [bx, by] = bodyPos(bodies[i], t), dx = bx - x, dy = by - y, r2 = dx * dx + dy * dy, inv = bodies[i].mu / (r2 * Math.sqrt(r2));
    ax += dx * inv; ay += dy * inv;
  }
  return [ax, ay];
}
/* A safe time step: a small fraction of the "falling time" r·√(r/GM) to the nearest body. Close to a planet
   the steps shrink to minutes, so the sharp bend of a flyby is followed accurately; far out they grow to weeks. */
function safeDt(bodies, s, dtMax) {
  let m = dtMax / 0.02;
  for (let i = 0; i < bodies.length; i++) {
    if (i === s.skip) continue;
    const [bx, by] = bodyPos(bodies[i], s.t), r = Math.hypot(bx - s.x, by - s.y), tf = r * Math.sqrt(r / bodies[i].mu);
    if (tf < m) m = tf;
  }
  return Math.max(0.02 * m, 1e-9);
}
// One Runge–Kutta (RK4) step: sample the acceleration four times across the step and average. Very accurate for orbits.
function rk4(bodies, s, dt) {
  const { x, y, vx, vy, t } = s, k = s.skip;
  const a1 = accel(bodies, x, y, t, k);
  const a2 = accel(bodies, x + vx * dt / 2, y + vy * dt / 2, t + dt / 2, k);
  const v2x = vx + a1[0] * dt / 2, v2y = vy + a1[1] * dt / 2;
  const a3 = accel(bodies, x + v2x * dt / 2, y + v2y * dt / 2, t + dt / 2, k);
  const v3x = vx + a2[0] * dt / 2, v3y = vy + a2[1] * dt / 2;
  const a4 = accel(bodies, x + v3x * dt, y + v3y * dt, t + dt, k);
  const v4x = vx + a3[0] * dt, v4y = vy + a3[1] * dt;
  s.x += dt / 6 * (vx + 2 * v2x + 2 * v3x + v4x); s.y += dt / 6 * (vy + 2 * v2y + 2 * v3y + v4y);
  s.vx += dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]); s.vy += dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
  s.t += dt;
}
/* Move the probe on by time T. Watches for:
   - crashing into a body,
   - leaving the planet it launched from (its pull is ignored until the probe is well clear: the launch
     speed is the speed left over after climbing out of that planet's own gravity),
   - flybys: entering and leaving each planet's sphere of influence, recording the speed (in the Sun's
     frame) before and after, and the closest approach. */
function advance(bodies, s, T, o = {}) {
  const end = s.t + T, dtMax = o.dtMax || 0.02; let n = 0;
  while (s.t < end && !s.crashed && n++ < (o.maxSteps || 200000)) {
    rk4(bodies, s, Math.min(safeDt(bodies, s, dtMax), end - s.t + 1e-12));
    watch(bodies, s, o.onEvent);
    if (o.each) o.each(s);
  }
  return s;
}
function watch(bodies, s, onEvent) {
  if (!s.fly) s.fly = bodies.map(() => null);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i], [bx, by] = bodyPos(b, s.t), d = Math.hypot(bx - s.x, by - s.y);
    if (d < b.R) { s.crashed = b.name; s.crashAt = i; return; }
    if (i === s.skip) { if (d > Math.max(0.05, 3 * b.soi)) s.skip = -1; continue; }
    if (!b.soi) continue;
    const f = s.fly[i];
    if (d < b.soi && !f) { const [ux, uy] = bodyVel(b, s.t); s.fly[i] = { i, name: b.name, sun: b.kind === "sun", t0: s.t, vIn: Math.hypot(s.vx, s.vy), rel: Math.hypot(s.vx - ux, s.vy - uy), rvx: s.vx - ux, rvy: s.vy - uy, rmin: d, tmin: s.t }; }
    else if (f && d < f.rmin) { f.rmin = d; f.tmin = s.t; }
    if (f && d >= b.soi) { f.vOut = Math.hypot(s.vx, s.vy); f.t1 = s.t; f.gain = f.vOut - f.vIn; s.fly[i] = null; (s.log || (s.log = [])).push(f); onEvent && onEvent(f); }
  }
}
// Speed needed to escape the Sun from distance r, and the probe's orbital energy per kg (negative = still bound to the Sun)
const escSpeed = r => Math.sqrt(2 * GM_SUN / r);
const energy = s => 0.5 * (s.vx * s.vx + s.vy * s.vy) - GM_SUN / Math.hypot(s.x, s.y);
// A probe launched from planet `from` at time t with speed v∞ (AU/yr, after escaping the planet) at angle `ang` (radians) to the planet's own motion
function launchState(bodies, from, t, vinf, ang) {
  const b = bodies[from], [px, py] = bodyPos(b, t), [ux, uy] = bodyVel(b, t), u = Math.hypot(ux, uy), ex = ux / u, ey = uy / u;
  const c = Math.cos(ang), sn = Math.sin(ang);
  return { x: px, y: py, vx: ux + vinf * (c * ex - sn * ey), vy: uy + vinf * (sn * ex + c * ey), t, skip: from, crashed: null, log: [], fly: null };
}

/* ---- The single-flyby lab: a planet moving at speed U along the x-axis, the probe coming in at speed v∞ (relative
   to the planet) at angle θ to the planet's motion, aimed to pass a distance rp from the planet's centre.
   side = +1 passes BEHIND the planet (its velocity is swung round towards the planet's motion: speed gained);
   side = −1 passes IN FRONT (swung away: speed lost). */
function flybyBodies(U, mu, R) { return [{ key: "planet", name: "Planet (like Jupiter)", kind: "line", U, mu, R, col: PLANETS.jupiter.col, look: 2, soi: 1e9 }]; }
// Theory. Turning angle of a hyperbolic flyby: sin(δ/2) = 1 / (1 + rp·v∞²/GM)
const turnAngle = (rp, vinf, mu) => 2 * Math.asin(1 / (1 + rp * vinf * vinf / mu));
// Theory: speed in the Sun's frame before and after = |U + v∞ (before / after)|, where only the direction of v∞ has changed
function flybyTheory(U, vinf, th, rp, side, mu) {
  const d = turnAngle(rp, vinf, mu), th2 = th - side * d;
  const vin = Math.hypot(U + vinf * Math.cos(th), vinf * Math.sin(th)), vout = Math.hypot(U + vinf * Math.cos(th2), vinf * Math.sin(th2));
  return { delta: d, vin, vout, gain: vout - vin };
}
const K_clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/* Start the probe far away (distance D from the planet) on its way in, exactly on the hyperbola that passes the planet at
   distance rp. Shape of the path relative to the planet: eccentricity e = 1 + rp·v∞²/GM (e > 1: a hyperbola, the probe is
   not captured), r = p / (1 + e cos ν) with p = rp(1 + e), where ν is the angle round from closest approach.
   (Gravity pulls the path in, so the probe must be aimed wider than rp: the "aiming distance" is b = rp·√(1 + 2GM/(rp·v∞²)).)
   Time t = 0 is exactly the moment of closest approach. */
function flybyStart(U, vinf, th, rp, side, mu, D) {
  const e = 1 + rp * vinf * vinf / mu, p = rp * (1 + e), k = Math.sqrt(mu / p);
  const nu = -Math.acos(K_clamp((p / D - 1) / e, -1 / e + 1e-12, 1));           // on the incoming half of the hyperbola
  const r = p / (1 + e * Math.cos(nu));
  let x = r * Math.cos(nu), y = r * Math.sin(nu), vx = -k * Math.sin(nu), vy = k * (e + Math.cos(nu));
  const sInf = Math.sqrt(1 - 1 / (e * e)), aIn = Math.atan2(e - 1 / e, sInf);   // direction of the incoming straight-line asymptote
  let rho; if (side > 0) { y = -y; vy = -vy; rho = th + aIn; } else rho = th - aIn;   // side +1: mirror image, turning clockwise (towards the planet's motion)
  const c = Math.cos(rho), sn = Math.sin(rho), rot = (X, Y) => [X * c - Y * sn, X * sn + Y * c];
  const [rx, ry] = rot(x, y), [wx, wy] = rot(vx, vy);
  // time from here to closest approach (Kepler's equation for a hyperbola)
  const F = Math.acosh((e + Math.cos(nu)) / (1 + e * Math.cos(nu))), n = Math.sqrt(mu / Math.pow(mu / (vinf * vinf), 3)), t0 = -(e * Math.sinh(F) - F) / n;
  return { x: U * t0 + rx, y: ry, vx: U + wx, vy: wy, t: t0, skip: -1, crashed: null, log: [], fly: null };
}
/* From the probe's position and velocity relative to the planet, work out the whole hyperbola it is on, and so its
   velocity "far away" both before and after the flyby (the straight-line asymptotes). Gravity can only turn this
   velocity: both have the same size v∞ = √(v² − 2GM/r), which is energy conservation in the planet's frame. */
function asymptotes(rx, ry, vx, vy, mu) {
  const r = Math.hypot(rx, ry), v2 = vx * vx + vy * vy, vinf = Math.sqrt(Math.max(1e-12, v2 - 2 * mu / r)), rv = rx * vx + ry * vy;
  let ex = ((v2 - mu / r) * rx - rv * vx) / mu, ey = ((v2 - mu / r) * ry - rv * vy) / mu; const e = Math.hypot(ex, ey); ex /= e; ey /= e;   // eccentricity vector: points to closest approach
  const h = Math.sign(rx * vy - ry * vx) || 1, qx = -ey * h, qy = ex * h, cn = -1 / e, sn = Math.sqrt(1 - cn * cn);
  return { vinf, inX: vinf * (-cn * ex + sn * qx), inY: vinf * (-cn * ey + sn * qy), outX: vinf * (cn * ex + sn * qx), outY: vinf * (cn * ey + sn * qy) };
}
/* Headless flyby, used by the Batch run: returns speeds before and after, in both frames. Starts and ends at the same
   (large) distance D from the planet, where its pull is negligible, so it measures the "at infinity" speeds of the theory. */
function flybyRun(U, vinf, th, rp, side, mu, R, D = 20) {
  const bodies = flybyBodies(U, mu, R), s = flybyStart(U, vinf, th, rp, side, mu, D);
  const vin = Math.hypot(s.vx, s.vy), relIn = Math.hypot(s.vx - U, s.vy);
  let n = 0, rmin = 1e9;
  while (n++ < 400000 && !s.crashed) {
    rk4(bodies, s, safeDt(bodies, s, 0.5)); watch(bodies, s);
    const r = Math.hypot(s.x - U * s.t, s.y); if (r < rmin) rmin = r;
    if (s.t > 0 && r > D) break;
  }
  const a1 = asymptotes(s.x - U * s.t, s.y, s.vx - U, s.vy, mu);
  return { vin, vout: Math.hypot(s.vx, s.vy), relIn, relOut: Math.hypot(s.vx - U, s.vy), vinfOut: a1.vinf, rmin, crashed: s.crashed };
}

/* ---- Scenes: which planets, where they start (angles at t = 0, in degrees), the Δv budget and the goal ---- */
// Angles of the planets at t = 0 for the Grand Tour. They are chosen (by a computer search) so that a launch on day TOUR.date at
// TOUR.v km/s, straight ahead along Earth's orbit, swings past all four giant planets: a rare line-up like Voyager 2's in 1977.
const TOUR = { date: 150, v: 10.3, ang: 0, at: [["earth", 0], ["jupiter", 100.25], ["saturn", 140], ["uranus", 179.07273], ["neptune", 196.72957]] };
const tourPlanets = () => TOUR.at.map(([k, deg]) => [k, deg - Math.sqrt(GM_SUN / PLANETS[k].a ** 3) * TOUR.date * DAY * 180 / Math.PI]);
const SCENES = {
  flyby: { name: "One flyby, up close", lab: true, rate: 3 * DAY },
  jupiter: { name: "Escape with Jupiter", planets: [["earth", 0], ["jupiter", 0]], from: "earth", budget: 10, horizon: 8, rate: 0.6, view: 6.4,
    goal: "Escape from the Sun's gravity using at most 10 km/s", aim: { v: 9, ang: 0, date: 0 }, sol: { v: 9.4, ang: 8, date: 280 } },
  venus: { name: "Dive towards the Sun", planets: [["mercury", 40], ["venus", 0], ["earth", 0], ["mars", 200]], from: "earth", budget: 4, horizon: 3, rate: 0.25, view: 1.75,
    goal: "Get within 0.55 AU of the Sun using at most 4 km/s", aim: { v: 3, ang: 180, date: 0 }, sol: { v: 3, ang: 178, date: 60 } },
  tour: { name: "Grand tour (Voyager)", planets: tourPlanets(), from: "earth", budget: 12, horizon: 16, rate: 1.2, view: 33,
    goal: "Visit Jupiter, Saturn, Uranus and Neptune (enter each glowing ring)", aim: { v: 10, ang: 0, date: 0 }, sol: { v: TOUR.v, ang: TOUR.ang, date: TOUR.date } },
  sandbox: { name: "Sandbox", planets: [["earth", 0], ["jupiter", 60]], from: "earth", budget: 30, horizon: 10, rate: 0.6, view: 7, goal: "", aim: { v: 9, ang: 0, date: 0 } },
};
function sceneBodies(key, massX = 1, extra = []) {
  const sc = SCENES[key], bs = [makeSun()];
  for (const [k, deg] of sc.planets.concat(extra)) bs.push(makePlanet(k, deg * Math.PI / 180, k === "earth" ? 1 : massX));
  return bs;
}
// ---------------------------------------------------------------- end of physics

// ---------------------------------------------------------------- page state
const S = {};                       // the controls
let scene = "jupiter", sc = SCENES.jupiter, bodies = [], from = 1, massX = 1;
let craft = null, mode = "aim";     // "aim" (on the launch pad), "flight", "done"
let aim = { v: 9, ang: 0, date: 0 }, dvUsed = 0, burnSize = 0.2, speed = 1, follow = false, tool = "aim";
let trail = [], pred = null, predDirty = true, frame = 0, hist = null, banner = "", visited = new Set(), goalMet = false, extraPlanets = [], rminSun = 1e9;
const lab = { U: 13, vinf: 10, th: 120, rp: 3, mass: 1, frame: "sun", D: 110, done: false };
const cam = { x: 0, y: 0, s: 60 };
const kms = v => v * KMS;                                      // AU/yr → km/s
const fmtT = t => Math.abs(t) < 1.5 ? (t / DAY).toFixed(0) + " days" : t.toFixed(2) + " years";
const sunFrameSpeed = s => Math.hypot(s.vx, s.vy);

// ---------------------------------------------------------------- the app
const ui = K.app({
  title: "Gravity-Assist Sandbox", subject: "Astrophysics", blurb: "Steal speed from a moving planet: the trick that sent Voyager to Neptune.",
  reset: () => restart(),
  missions: [
    { title: "Steal some speed", q: "A probe flies past a planet that is moving to the right at 13 km/s. Watch the top chart: how much faster is the probe (relative to the Sun) after the flyby? Now drag the <b>flyby distance</b> slider to a negative number, so the probe passes <i>in front</i> of the planet. What changes?",
      hint: "Passing behind the planet, the probe is dragged along with it and leaves faster (about 11 km/s faster here). Passing in front (not too close), the planet's pull acts against the probe's motion along the planet's path and it leaves slower. Spacecraft use the second trick to fall in towards the Sun (MESSENGER, Parker Solar Probe).",
      setup: () => { setScene("flyby"); S.rp.set(3, true); S.frame.set("sun", true); } },
    { title: "It all depends on your point of view", q: "Switch the view to <b>the planet's frame</b>. Compare the probe's speed relative to the planet before and after (the green line on the top chart). Has the planet given it any speed at all?",
      hint: "No. In the planet's frame the path is a symmetrical hyperbola and the probe leaves at exactly the speed it arrived with: energy is conserved. Only the <i>direction</i> has turned. Back in the Sun's frame the planet's own velocity is added on, and a turned velocity plus the planet's velocity can be longer. The vector diagram (bottom right) shows this: the probe's velocity is the grey arrow plus a cyan arrow that only swings round the circle.",
      setup: () => { setScene("flyby"); S.rp.set(4, true); S.frame.set("planet", true); } },
    { title: "Is closer always better?", q: "Passing closer bends the path more. Try flyby distances of 1.5, 2, 4, 8 and 16 planet radii (behind the planet). Which gives the biggest speed gain? Predict first.",
      hint: "Not the closest. The best flyby turns the relative velocity until it points along the planet's own motion. Bend it further and you start turning past that direction and gain less. With these speeds the best is about 2–4 planet radii; skim the cloud tops and you over-turn (or crash!). The Batch run \"Speed gain vs flyby distance\" maps the whole curve.",
      setup: () => { setScene("flyby"); S.rp.set(1.5, true); S.frame.set("sun", true); } },
    { title: "Find the launch window", q: "Launch at 9 km/s straight ahead (0°). The dashed line predicts the path, and the faint ghost shows where Jupiter will be when you cross its orbit. Change only the <b>launch date</b>. When does the probe meet Jupiter?",
      hint: "The probe takes about 2.7 years to coast out to Jupiter's orbit, and Jupiter moves about a quarter of the way round the Sun in that time. You must launch when Jupiter is roughly 97° ahead of Earth. That happens once every 13 months (Jupiter's synodic period): these are launch windows.",
      setup: () => { setScene("jupiter"); setAim(9, 0, 0); } },
    { title: "Escape with only 10 km/s", q: "To escape the Sun straight from Earth's orbit you need about 12.3 km/s on top of Earth's own 29.8 km/s. You have only 10 km/s. Use a Jupiter flyby to escape. The probe is free when its energy (bottom chart) goes above zero.",
      hint: "Get to Jupiter first (launch window!), then pass <i>behind</i> Jupiter, closer than about 0.05 AU. Use the fine-tune buttons (v±, θ±) and watch the predicted closest approach. Jupiter can add 5–10 km/s, more than enough to escape. Pioneer 10, Voyager 1 and 2 and New Horizons all left the Solar System like this.",
      setup: () => { setScene("jupiter"); setAim(9, 0, 0); } },
    { title: "Dive towards the Sun", q: "Getting <i>close</i> to the Sun is surprisingly hard: you must cancel most of Earth's 30 km/s. With 4 km/s you cannot do it directly. Use Venus to slow down and get within 0.55 AU of the Sun.",
      hint: "Launch backwards (about 180°) so you fall in towards Venus, then pass <i>in front</i> of Venus (on the side it is moving towards). That flyby takes speed away, and your orbit dips closer to the Sun. MESSENGER (to Mercury) and the Parker Solar Probe used repeated Venus flybys exactly like this.",
      setup: () => { setScene("venus"); setAim(3, 180, 0); } },
    { title: "The Grand Tour", q: "In 1977 the outer planets lined up so that one probe could visit all four giants: Voyager 2 did it in 12 years. Can you? Visit Jupiter, Saturn, Uranus and Neptune with at most 12 km/s.",
      hint: "Each flyby must aim the probe at the next planet, so tiny errors grow: this is why real missions make small course corrections. Get Jupiter right first (watch where the dashed line goes after it), then use the in-flight burns (0.05 km/s) to steer towards the next planet. Stuck? Press <b>Show me a solution</b>.",
      setup: () => { setScene("tour"); setAim(10, 0, 0); } },
    { title: "Build your own slingshot", q: "In the Sandbox, choose <b>Add a planet</b> and click to drop new planets on circular orbits. Can you design a planet that turns a probe launched at 6 km/s into one that escapes the Sun?",
      hint: "A heavier planet bends the path more for the same distance, and an outer planet moves more slowly round the Sun, so it has less speed to lend. The ideal helper is massive and moving fast: that is why Jupiter is the favourite of mission planners.",
      setup: () => { setScene("sandbox"); setAim(6, 0, 0); S.tool.set("add", true); } },
  ],
  batch: [
    { title: "Speed gain vs flyby distance", question: "How does the speed gained depend on how close the probe passes?", how: "A Jupiter-like planet (moving at 13 km/s); the probe approaches at 10 km/s relative to it, at 120° to its motion, passing behind. Each run has a small random aiming error (±2%), as real navigation does.",
      xLabel: "closest approach (planet radii)", yLabel: "speed gained (km/s)", xs: [1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64], reps: 4, yMin: 0,
      run: (x, r) => { const rp = x * (1 + 0.02 * r.gauss()), f = flybyRun(13 / KMS, 10 / KMS, 120 * Math.PI / 180, rp * R_JUP, 1, MU_JUP, R_JUP); return f.crashed ? null : kms(f.vout - f.vin); },
      theory: x => kms(flybyTheory(13 / KMS, 10 / KMS, 120 * Math.PI / 180, x * R_JUP, 1, MU_JUP).gain), theoryLabel: "slingshot formula",
      note: "The theory line is the slingshot formula: the turning angle sin(δ/2) = 1/(1 + r·v∞²/GM), then speed = |planet velocity + turned relative velocity|. Far flybys barely bend the path; the gain peaks at a few planet radii, then falls a little as the turn overshoots. The scatter comes from the random aiming errors." },
    { title: "Speed gain vs approach angle", question: "Does it matter which direction the probe comes from?", how: "Same planet and speeds; closest approach 6 planet radii behind the planet. The approach angle is between the probe's velocity (relative to the planet) and the planet's own motion: 0° = chasing the planet, 180° = head-on.",
      xLabel: "approach angle (degrees)", yLabel: "speed gained (km/s)", xs: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180], reps: 3,
      run: (x, r) => { const f = flybyRun(13 / KMS, 10 / KMS, x * Math.PI / 180, 6 * (1 + 0.02 * r.gauss()) * R_JUP, 1, MU_JUP, R_JUP); return f.crashed ? null : kms(f.vout - f.vin); },
      theory: x => kms(flybyTheory(13 / KMS, 10 / KMS, x * Math.PI / 180, 6 * R_JUP, 1, MU_JUP).gain), theoryLabel: "slingshot formula",
      note: "The gain is biggest when the flyby swings the relative velocity from pointing against the planet's motion round to pointing with it. Chasing the planet from behind (0°) the probe is turned away from the planet's direction and actually loses speed, even passing behind." },
    { title: "Behind or in front?", question: "Which side of the planet should the probe pass?", how: "Closest approach from 32 radii in front of the planet (negative) to 32 radii behind it (positive), approach angle 120°.",
      xLabel: "flyby distance (planet radii; − in front, + behind)", yLabel: "speed gained (km/s)", xs: [-32, -16, -8, -4, -2, 2, 4, 8, 16, 32], reps: 3,
      run: (x, r) => { const f = flybyRun(13 / KMS, 10 / KMS, 120 * Math.PI / 180, Math.abs(x) * (1 + 0.02 * r.gauss()) * R_JUP, Math.sign(x), MU_JUP, R_JUP); return f.crashed ? null : kms(f.vout - f.vin); },
      theory: x => Math.abs(x) < 1 ? null : kms(flybyTheory(13 / KMS, 10 / KMS, 120 * Math.PI / 180, Math.abs(x) * R_JUP, Math.sign(x), MU_JUP).gain), theoryLabel: "slingshot formula",
      note: "Behind the planet: speed gained (the planet slows down by an unmeasurably tiny amount). In front: speed lost, and the planet speeds up. But skim very close in front and the path is swung so far round that the probe can gain again. The theory line has a gap in the middle, where the probe would hit the planet." },
    { title: "In the planet's frame, nothing is gained", question: "Does the probe's speed relative to the planet change during a flyby?", how: "Speed relative to the planet far away after the flyby (worked out from the hyperbola the probe ends up on) ÷ the approach speed of 10 km/s, for flybys at different distances (behind the planet, approach angle 120°).",
      xLabel: "closest approach (planet radii)", yLabel: "relative speed after ÷ before", xs: [1.5, 3, 6, 12, 24, 48], reps: 3, yMin: 0.99, yMax: 1.01,
      run: (x, r) => { const rp = x * (1 + 0.02 * r.gauss()) * R_JUP, f = flybyRun(13 / KMS, 10 / KMS, 120 * Math.PI / 180, rp, 1, MU_JUP, R_JUP); return f.crashed ? null : f.vinfOut / (10 / KMS); },
      theory: () => 1, theoryLabel: "energy conserved (ratio = 1)",
      note: "In the planet's frame gravity only turns the probe: it speeds up on the way in and slows by exactly the same amount on the way out. The tiny departures from 1 (millionths) are rounding in the step-by-step calculation. All the gain seen in the Sun's frame comes from adding the planet's own velocity." },
    { title: "Heavier planet, bigger kick", question: "How does the planet's mass change the gain from a flyby at a fixed distance?", how: "Closest approach 8 radii of Jupiter, behind the planet, approach angle 120°; planet mass from a tenth of Jupiter's to ten times it.",
      xLabel: "planet mass (Jupiter masses)", yLabel: "speed gained (km/s)", xs: [0.1, 0.25, 0.5, 1, 2, 4, 7, 10], reps: 3, yMin: 0,
      run: (x, r) => { const f = flybyRun(13 / KMS, 10 / KMS, 120 * Math.PI / 180, 8 * (1 + 0.02 * r.gauss()) * R_JUP, 1, x * MU_JUP, R_JUP); return f.crashed ? null : kms(f.vout - f.vin); },
      theory: x => kms(flybyTheory(13 / KMS, 10 / KMS, 120 * Math.PI / 180, 8 * R_JUP, 1, x * MU_JUP).gain), theoryLabel: "slingshot formula",
      note: "A heavier planet turns the path more. But the gain cannot grow for ever: the most a flyby can ever add is twice the relative speed (2v∞), when the path turns right round. Beyond a few Jupiter masses the path is over-turned, past the planet's direction of motion, and the gain falls again." },
  ],
  notes: `<h3>What is being calculated</h3><p>The Sun and the planets move on fixed paths (circles round the Sun at their real distances and speeds). The probe feels Newton's gravity, <code>a = GM/r²</code>, towards every one of them at once, and its motion is worked out step by step with the <b>Runge–Kutta (RK4)</b> method. Steps shrink automatically near a planet, to minutes, so the sharp bend of a flyby is followed accurately.</p>
  <h3>Why a flyby gives speed</h3><p>In the planet's own frame the probe arrives and leaves at the same speed (energy is conserved): gravity only turns its direction through an angle δ, where <code>sin(δ/2) = 1/(1 + r·v∞²/GM)</code> (r = closest approach, v∞ = speed relative to the planet far away). In the Sun's frame, probe velocity = planet velocity + relative velocity. Turning the relative velocity towards the planet's motion makes the total longer. The most a single flyby can add is <code>2v∞</code>. The probe's gain in energy is the planet's loss, but the planet is so heavy that its slowing down is far too small to measure (Voyager 2's flyby slowed Jupiter by about 10⁻²⁰ m/s: in a hundred million years that would move Jupiter by less than a hundredth of a millimetre).</p>
  <h3>Units</h3><p>Distances in AU (1 AU = 150 million km, the Earth–Sun distance), times in years. 1 AU per year = 4.74 km/s. Real masses, orbit radii and planet radii.</p>
  <h3>Launch speed and the Δv budget</h3><p>The launch speed is the probe's speed relative to Earth <i>after</i> escaping Earth's own gravity (what engineers call v∞). Earth's pull is ignored until the probe is well clear (0.05 AU away), so later Earth flybys still work. Every launch and burn uses up some of the Δv budget.</p>
  <h3>Spheres of influence</h3><p>The faint ring round each planet is its sphere of influence, <code>r = a·(m/M)<sup>0.4</sup></code>: inside it the planet's pull matters more than the Sun's. A flyby is counted (and its speed change listed) between entering and leaving this ring.</p>
  <h3>Assumptions and simplifications</h3><ul><li>Everything is in one flat plane (real orbits are tilted by a few degrees).</li><li>Planet orbits are perfect circles; real ones are slightly elliptical.</li><li>The planets move on fixed paths: they pull the probe but not each other, and the probe does not pull them (its mass is far too small).</li><li>The Sun does not move (really it wobbles slightly as the planets orbit).</li><li>Engine burns are instant changes of velocity.</li><li>Planets are drawn bigger than life (except in the close-up lab, at true size) so you can see them; the physics uses their real sizes.</li><li>"Planet masses ×" makes flybys easier by exaggerating the planets' masses; ×1 is real.</li><li>The Grand Tour planets are placed (by computer search) so a tour exists; the line-up is like, but not identical to, the real one of 1977.</li><li>No relativity, solar wind or light pressure.</li></ul>
  <h3>Mouse</h3><p>On the launch pad, drag from Earth to aim. Drag elsewhere to pan, and use the wheel to zoom. In the close-up lab, drag to choose where the probe passes the planet. In the Sandbox with <b>Add a planet</b> chosen, click to drop a planet; right-click one you added to remove it.</p>`,
});

// ---------------------------------------------------------------- controls
// words for a launch direction: 0° = along Earth's motion, +90° = straight in towards the Sun, −90° = straight out, ±180° = backwards
const dirWords = v => { const a = Math.abs(v), side = v > 0 ? "inwards" : "outwards"; return a < 0.01 ? "(straight ahead)" : a > 179.99 ? "(straight back)" : a < 45 ? `(ahead, tilted ${side})` : a > 135 ? `(backwards, tilted ${side})` : `(${side})`; };
let g = ui.group("Scene");
S.scene = K.seg(g, { value: scene, options: Object.entries(SCENES).map(([k, v]) => [k, v.name]), on: v => setScene(v) });
const goalNote = K.note(g, "");

const gLaunch = ui.group("Launch from Earth");
S.v = K.slider(gLaunch, { label: "Launch speed (relative to Earth)", min: 0, max: 20, step: 0.01, value: 9, fmt: v => v.toFixed(2) + " km/s", on: v => { aim.v = v; aimChanged(); }, tip: "Speed left over after escaping Earth's own gravity." });
S.ang = K.slider(gLaunch, { label: "Launch direction", min: -180, max: 180, step: 0.05, value: 0, fmt: v => v.toFixed(2) + "° " + dirWords(v), on: v => { aim.ang = v; aimChanged(); }, tip: "Angle to Earth's own direction of motion. 0° = along Earth's orbit (the cheapest way to go outwards)." });
S.date = K.slider(gLaunch, { label: "Launch date", min: 0, max: 800, step: 1, value: 0, fmt: v => "day " + v, on: v => { aim.date = v; aimChanged(); }, tip: "Waiting moves the planets round their orbits: this is how launch windows work." });
{ const r = K.row(gLaunch), nb = (lab_, tip, f) => { const b = K.btn(r, lab_, f, "small"); b.title = tip; };
    nb("v−", "Launch speed −0.01 km/s", () => S.v.set(Math.max(0, +(aim.v - 0.01).toFixed(2)), true)); nb("v+", "Launch speed +0.01 km/s", () => S.v.set(+(aim.v + 0.01).toFixed(2), true));
  nb("θ−", "Direction −0.05°", () => S.ang.set(+(aim.ang - 0.05).toFixed(2), true)); nb("θ+", "Direction +0.05°", () => S.ang.set(+(aim.ang + 0.05).toFixed(2), true));
  nb("day−", "Launch a day earlier", () => S.date.set(Math.max(0, aim.date - 1), true)); nb("day+", "Launch a day later", () => S.date.set(aim.date + 1, true)); }
{ const r = K.row(gLaunch); S.launch = K.btn(r, "🚀 Launch", () => launch(), "primary"); S.solve = K.btn(r, "Show me a solution", () => { const so = sc.sol; if (so) { setAim(so.v, so.ang, so.date); launch(); } }); }
K.note(gLaunch, "Fine-tune buttons: speed ±0.01 km/s, direction ±0.05°, date ±1 day. Or drag outwards from Earth to aim. The dashed line predicts the path.");

const gFlight = ui.group("In flight: rocket burns");
S.burn = K.seg(gFlight, { label: "Burn size", value: 0.2, options: [[0.05, "0.05 km/s"], [0.2, "0.2 km/s"], [1, "1 km/s"]], on: v => burnSize = v });
{ const r = K.row(gFlight); K.btn(r, "▲ Speed up", () => burn(0)); K.btn(r, "▼ Slow down", () => burn(180)); K.btn(r, "◂ Left", () => burn(90)); K.btn(r, "Right ▸", () => burn(-90)); }
{ const r = K.row(gFlight); K.btn(r, "↺ Back to the launch pad", () => restart()); }
K.note(gFlight, "Burns are measured against the probe's own direction of travel and come out of the Δv budget.");

const gLab = ui.group("The flyby");
S.U = K.slider(gLab, { label: "Planet's speed (round the Sun)", min: 0, max: 40, step: 0.5, value: 13, fmt: v => v + " km/s", on: v => { lab.U = v; labReset(); }, tip: "Jupiter moves at 13 km/s, Earth at 30 km/s." });
S.vinf = K.slider(gLab, { label: "Probe's approach speed (relative to the planet)", min: 2, max: 30, step: 0.5, value: 10, fmt: v => v + " km/s", on: v => { lab.vinf = v; labReset(); } });
S.th = K.slider(gLab, { label: "Approach angle", min: 0, max: 180, step: 1, value: 120, fmt: v => v + "°" + (v === 0 ? " (chasing it)" : v === 180 ? " (head-on)" : ""), on: v => { lab.th = v; labReset(); }, tip: "Between the probe's velocity (relative to the planet) and the planet's own motion." });
S.rp = K.slider(gLab, { label: "Flyby distance", min: -40, max: 40, step: 0.1, value: 3, fmt: v => Math.abs(v) < 1.05 ? "hits the planet!" : Math.abs(v).toFixed(1) + " radii " + (v > 0 ? "behind" : "in front"), on: v => { lab.rp = v; labReset(); }, tip: "Closest approach, measured from the planet's centre in planet radii. + passes behind the planet, − in front of it." });
S.lmass = K.slider(gLab, { label: "Planet's mass", min: 0.05, max: 5, step: 0.05, value: 1, fmt: v => v.toFixed(2) + " × Jupiter", on: v => { lab.mass = v; labReset(); } });
S.frame = K.seg(gLab, { label: "View from", value: "sun", options: [["sun", "the Sun's frame"], ["planet", "the planet's frame"]], on: v => { lab.frame = v; fitView(); } });
K.note(gLab, "Drag on the picture to choose where the probe passes the planet.");

const gPlan = ui.group("Planets");
S.massX = K.seg(gPlan, { label: "Planet masses", value: 1, options: [[1, "real"], [3, "× 3"], [10, "× 10"]], on: v => { massX = v; rebuild(true); }, tip: "Exaggerate the giant planets' masses to make flybys easier to aim." });
S.soi = K.toggle(gPlan, { label: "Show spheres of influence", value: true });
S.land = K.toggle(gPlan, { label: "Show the gravity landscape (contours of potential)", value: true });
S.pred = K.toggle(gPlan, { label: "Show the predicted path", value: true, on: () => { predDirty = true; } });

const gSand = ui.group("Sandbox");
S.tool = K.seg(gSand, { label: "Click on the picture to", value: "aim", options: [["aim", "aim / pan"], ["add", "add a planet"]], on: v => tool = v });
S.newMass = K.slider(gSand, { label: "Mass of new planets", min: 0, max: 4, step: 0.1, value: 2.5, fmt: v => { const m = Math.pow(10, v); return (m < 10 ? m.toFixed(1) : m.toFixed(0)) + " Earth masses" + (Math.abs(m - 318) < 40 ? " (Jupiter)" : ""); } });
{ const r = K.row(gSand); K.btn(r, "Remove added planets", () => { extraPlanets = []; rebuild(true); }); }

const gView = ui.group("View");
S.cam = K.seg(gView, { label: "Camera", value: "fixed", options: [["fixed", "Fixed"], ["follow", "Follow the probe"]], on: v => { follow = v === "follow"; if (!follow) fitView(); } });
{ const r = K.row(gView); K.btn(r, "Fit view", () => fitView()); K.btn(r, "📷 Screenshot", () => shot()); }
S.speed = K.slider(gView, { label: "Speed", min: 0.1, max: 5, step: 0.1, value: 1, fmt: v => v.toFixed(1) + "×", on: v => speed = v });
ui.headerSpeed(S.speed);   // playback speed lives in the header, beside Pause and Reset

g = ui.group("Measurements");
const read = K.readout(g, [["t", "Time"], ["v", "Speed (Sun's frame)"], ["r", "Distance from Sun"], ["esc", "Escape speed here"], ["e", "Energy per kg"], ["dv", "Δv used"], ["gain", "Gained from flybys"]]);
const readLab = K.readout(g, [["vin", "Speed far away before"], ["vout", "Speed far away after"], ["gain", "Speed gained"], ["th", "Slingshot formula says"], ["rel", "Relative speed far away (in = out)"], ["turn", "Turned through"], ["rmin", "Closest approach"]]);
K.note(g, "\"Far away\" speeds come from the hyperbola the probe is on (its straight-line asymptotes), so they can be compared with the slingshot formula even while the probe is still near the planet. The chart shows the actual speed, which spikes as the probe falls into the planet's gravity well and climbs out again.");
const chA = K.chart(ui.dock, { title: "Probe's speed", xLabel: "time", yLabel: "km/s" });
const chB = K.chart(ui.dock, { title: "Energy", xLabel: "time", yLabel: "MJ per kg" });

// ---------------------------------------------------------------- setting up scenes
const isLab = () => !!sc.lab;
// a planet you add in the Sandbox: a circular orbit through the point clicked, with the mass chosen
const LETTERS = "XYZWVUTS";
function customPlanet(c) {
  const m = c.mE * 3.0e-6, w = Math.sqrt(GM_SUN / c.a ** 3), giant = c.mE > 12;
  return { key: c.key, name: c.name, kind: "orbit", a: c.a, ph: c.ph, w, mu: GM_SUN * m, R: 4.26e-5 * Math.min(Math.pow(c.mE, 0.55), 11.2), col: c.col, look: giant ? 2 : 1, mE: c.mE, soi: c.a * Math.pow(m, 0.4), custom: true };
}
function rebuild(keep) {
  if (isLab()) bodies = flybyBodies(lab.U / KMS, lab.mass * MU_JUP, R_JUP);
  else { bodies = sceneBodies(scene, massX); for (const c of extraPlanets) bodies.push(customPlanet(c)); from = bodies.findIndex(b => b.key === sc.from); }
  if (craft) craft.fly = null;
  pred = null; predDirty = true; if (!keep) restart();
}
function setScene(k) {
  scene = k; sc = SCENES[k]; S.scene.set(k); extraPlanets = [];
  const lb = isLab();
  gLaunch.style.display = gFlight.style.display = lb ? "none" : ""; gLab.style.display = lb ? "" : "none"; gSand.style.display = k === "sandbox" ? "" : "none";
  S.massX.el.style.display = lb ? "none" : ""; S.cam.el.style.display = lb ? "none" : "";
  read.el.style.display = lb ? "none" : ""; readLab.el.style.display = lb ? "" : "none";
  S.solve.style.display = sc.sol ? "" : "none";
  goalNote.innerHTML = lb ? "A planet moving to the right; the probe swings past it. Change the flyby and watch the speed." : sc.goal ? "<b>Goal:</b> " + sc.goal + "." : "Add planets, launch, experiment.";
  if (!lb) setAim(sc.aim.v, sc.aim.ang, sc.aim.date, true);
  if (k !== "sandbox") { tool = "aim"; S.tool.set("aim"); }
  rebuild(true); restart(); fitView();
}
function setAim(v, ang, date, quiet) { aim = { v, ang, date }; S.v.set(v); S.ang.set(ang); S.date.set(date); if (!quiet) aimChanged(); }
function aimChanged() { if (isLab()) return; if (mode !== "aim") restart(); else { craft = launchState(bodies, from, aim.date * DAY, aim.v / KMS, aim.ang * Math.PI / 180); predDirty = true; } }
function labReset() { if (!isLab()) return; rebuild(true); restart(); }
function restart() {
  trail = []; hist = { v: [], esc: [], e: [], rel: [], d: [] }; dvUsed = 0; visited = new Set(); goalMet = false; banner = ""; rminSun = 1e9; predDirty = true;
  if (isLab()) {
    const L = lab, rp = Math.max(Math.abs(L.rp), 0.2) * R_JUP;
    craft = flybyStart(L.U / KMS, L.vinf / KMS, L.th * Math.PI / 180, rp, Math.sign(L.rp) || 1, L.mass * MU_JUP, L.D * R_JUP);
    L.start = { vx: craft.vx, vy: craft.vy, v: Math.hypot(craft.vx, craft.vy) }; L.tEnd = -craft.t; L.done = false; mode = "flight";
    L.theory = flybyTheory(L.U / KMS, L.vinf / KMS, L.th * Math.PI / 180, rp, Math.sign(L.rp) || 1, L.mass * MU_JUP);
  } else { mode = "aim"; craft = launchState(bodies, from, aim.date * DAY, aim.v / KMS, aim.ang * Math.PI / 180); }
  trail.push([craft.x, craft.y, Math.hypot(craft.vx, craft.vy), craft.t]);
}
function launch() {
  if (isLab()) return;
  if (mode !== "aim") restart();
  craft = launchState(bodies, from, aim.date * DAY, aim.v / KMS, aim.ang * Math.PI / 180);
  dvUsed = aim.v; mode = "flight"; trail = [[craft.x, craft.y, Math.hypot(craft.vx, craft.vy), craft.t]]; predDirty = true; ui.setPlaying(true);
  if (aim.v > sc.budget + 1e-9) ui.tip(`Over budget: this launch needs ${aim.v.toFixed(2)} km/s but the mission has only ${sc.budget} km/s. It still flies, but does not count.`, 6000);
}
let burnFlash = 0, burnDir = 0;
function burn(deg) {
  if (isLab() || mode !== "flight" || craft.crashed) { ui.tip("Burns work only while the probe is flying. Launch first."); return; }
  if (dvUsed + burnSize > sc.budget + 1e-9) { ui.tip(`Not enough Δv left: ${(sc.budget - dvUsed).toFixed(2)} km/s remaining.`); return; }
  // turn the probe's own direction of travel through deg, and add burnSize in that direction
  const v = Math.hypot(craft.vx, craft.vy), a = Math.atan2(craft.vy, craft.vx) + deg * Math.PI / 180;
  craft.vx += burnSize / KMS * Math.cos(a); craft.vy += burnSize / KMS * Math.sin(a); dvUsed += burnSize; predDirty = true; burnFlash = 1; burnDir = a;
}

// ---------------------------------------------------------------- predicting the future path (same steps as the real flight)
function predict() {
  if (!S.pred.value || !craft || craft.crashed || mode === "done") { pred = null; return; }
  const s = Object.assign({}, craft, { fly: null, log: [] }), H = isLab() ? Math.max(0, lab.tEnd - craft.t) : sc.horizon;
  const pts = [], enc = bodies.map(() => ({ d: 1e9, t: 0 })), end = s.t + H, minStep = (isLab() ? 0.5 : 1.5) / cam.s; let lx = s.x, ly = s.y, n = 0;
  pts.push([s.x, s.y, Math.hypot(s.vx, s.vy), s.t]);
  while (s.t < end && !s.crashed && n++ < 60000) {
    rk4(bodies, s, safeDt(bodies, s, isLab() ? 0.002 : 0.05)); watch(bodies, s);
    for (let i = 0; i < bodies.length; i++) { if (bodies[i].kind === "sun") continue; const [bx, by] = bodyPos(bodies[i], s.t), d = Math.hypot(bx - s.x, by - s.y); if (d < enc[i].d) { enc[i].d = d; enc[i].t = s.t; enc[i].x = s.x; enc[i].y = s.y; } }
    if (Math.hypot(s.x - lx, s.y - ly) > minStep) { pts.push([s.x, s.y, Math.hypot(s.vx, s.vy), s.t]); lx = s.x; ly = s.y; }
  }
  pts.push([s.x, s.y, Math.hypot(s.vx, s.vy), s.t]);
  pred = { pts, enc, crashed: s.crashed, log: s.log }; predDirty = false;
}

// ---------------------------------------------------------------- the animation step
function step(dtf) {
  if (mode !== "flight" || !craft) return;
  const T = dtf * sc.rate * speed, end = craft.t + T, dtMax = isLab() ? 0.002 : 0.05, minStep = 1.2 / cam.s; let n = 0;
  // whole steps only (never cut short to fit the frame), so the flight follows exactly the same steps as the prediction
  while (craft.t < end && !craft.crashed && n++ < 50000) {
    rk4(bodies, craft, safeDt(bodies, craft, dtMax)); watch(bodies, craft, onFlyby);
    const l = trail[trail.length - 1], r = Math.hypot(craft.x, craft.y);
    if (Math.hypot(craft.x - l[0], craft.y - l[1]) > minStep) { trail.push([craft.x, craft.y, Math.hypot(craft.vx, craft.vy), craft.t]); if (trail.length > 8000) trail = trail.filter((p, i) => i % 2 === 0 || i > 6000); }
    if (!isLab()) { if (r < rminSun) rminSun = r; for (let i = 0; i < bodies.length; i++) if (craft.fly && craft.fly[i]) visited.add(i); }
  }
  trail.push([craft.x, craft.y, Math.hypot(craft.vx, craft.vy), craft.t]);
  if (isLab()) {
    const L = lab, rel = Math.hypot(craft.vx - L.U / KMS, craft.vy);
    hist.v.push([(craft.t) / DAY, kms(Math.hypot(craft.vx, craft.vy))]); hist.rel.push([craft.t / DAY, kms(rel)]); hist.d.push([craft.t / DAY, Math.hypot(craft.x - bodyPos(bodies[0], craft.t)[0], craft.y) / R_JUP]);
    if (craft.t >= L.tEnd) { L.done = true; mode = "done"; }
  } else {
    const r = Math.hypot(craft.x, craft.y), v = Math.hypot(craft.vx, craft.vy);
    hist.v.push([craft.t, kms(v)]); hist.esc.push([craft.t, kms(escSpeed(r))]); hist.e.push([craft.t, energy(craft) * KMS * KMS]);
    for (const k of ["v", "esc", "e"]) if (hist[k].length > 3000) hist[k] = hist[k].filter((p, i) => i % 2 === 0);
    checkGoal();
  }
  if (craft.crashed) { mode = "done"; ui.tip(`💥 The probe hit ${craft.crashed}!`, 5000); }
  if (frame % 12 === 0) predDirty = true;
}
function onFlyby(f) { const b = bodies[f.i]; if (b.kind === "sun") return; ui.tip(`${b.name} flyby: ${f.gain >= 0 ? "+" : "−"}${Math.abs(kms(f.gain)).toFixed(2)} km/s (closest ${fmtDist(f.rmin, b)})`, 4000); }
const fmtDist = (d, b) => d < 0.01 ? (d * 1.496e8).toExponential(2).replace(/e\+?(\d+)/, "×10^$1").replace(/\^(\d+)/, (m, e) => "<sup>" + e + "</sup>") + " km" + (b ? " = " + (d / b.R).toFixed(0) + " radii" : "") : d.toFixed(3) + " AU" + (b ? " = " + (d / b.R).toFixed(0) + " radii" : "");
function checkGoal() {
  if (goalMet) return; const within = dvUsed <= sc.budget + 1e-9;
  let ok = false;
  if (scene === "jupiter") ok = energy(craft) > 0;
  if (scene === "venus") ok = rminSun < 0.55;
  if (scene === "tour") ok = ["jupiter", "saturn", "uranus", "neptune"].every(k => visited.has(bodies.findIndex(b => b.key === k)));
  if (ok && within) { goalMet = true; ui.tip("🎉 <b>Goal reached!</b> " + sc.goal + ".", 8000); }
}

// ---------------------------------------------------------------- camera
const cv = ui.canvas(() => { if (!cam.fitted) requestAnimationFrame(fitView); });
function fitView() {
  const W = cv.w, H = cv.h; if (W < 10) return; cam.fitted = true;
  if (isLab()) { cam.x = 0; cam.y = 0; cam.s = W / 2 / ((lab.frame === "sun" ? 240 : 75) * R_JUP); }
  else { cam.x = 0; cam.y = 0; cam.s = Math.min(W, H) / 2 / sc.view; }
  predDirty = true;
}
// in the planet's frame, everything is drawn relative to where the planet is at that moment
const origin = t => isLab() && lab.frame === "planet" ? bodyPos(bodies[0], t) : [0, 0];
const SX = x => cv.w / 2 + (x - cam.x) * cam.s, SY = y => cv.h / 2 - (y - cam.y) * cam.s, WX = px => cam.x + (px - cv.w / 2) / cam.s, WY = py => cam.y - (py - cv.h / 2) / cam.s;
function tNow() { return craft ? craft.t : 0; }
// how big to draw a body (pixels): true size if that is big enough, otherwise a minimum that grows with mass
function drawRadius(b) {
  if (b.kind === "sun") return Math.max(12, b.R * cam.s);
  if (isLab()) return Math.max(b.R * cam.s, 6);
  return Math.max(b.R * cam.s, 3 + 2.3 * Math.log10(1 + (b.mE || 300)));
}
// colour of the path from its speed: blue = slow (bound tightly), white = escape speed, orange = faster than escape
function pathCol(v, x, y) {
  let k;
  if (isLab()) k = 0.5 + (v / lab.start.v - 1) * 1.4; else k = (v / escSpeed(Math.max(Math.hypot(x, y), 0.01)) - 0.55) / 0.9;
  k = K.clamp(k, 0, 1);
  return k < 0.5 ? [0.25 + 1.5 * k * 0.75, 0.55 + 0.9 * k, 1] : [1, 1 - (k - 0.5) * 0.9, 1 - (k - 0.5) * 1.6];
}

// ---------------------------------------------------------------- WebGL drawing
/* One fragment shader paints the background at every pixel: stars, the "gravity landscape" (contour lines of the
   gravitational potential Σ GM/r, like the height contours of a map: they crowd together near each body, where the
   well is steep), the Sun, the planets as lit spheres and their spheres of influence. Paths are glowing ribbons. */
const MAXB = 12;
const BG_FS = `precision highp float;
uniform vec2 uRes; uniform float uDpr, uS, uTime, uLand, uSoiOn, uPhiRef, uHasSun; uniform vec2 uCam, uSunPx;
uniform int uN; uniform vec4 uB[${MAXB}]; uniform vec4 uC[${MAXB}]; uniform vec4 uX[${MAXB}];
// uB: centre (pixels), drawn radius (pixels), unused · uC: colour, look (0 Sun, 1 rocky, 2 banded giant, 3 ringed, 4 ice giant)
// uX: GM, sphere of influence (pixels), highlight (0 none, 1 target, 2 visited), true radius (AU)
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 starLayer(vec2 px, float cell, float dens) {
  vec2 q = px / cell, id = floor(q), f = fract(q) - 0.5; float h = hash(id);
  if (h < dens) return vec3(0.0);
  vec2 o = vec2(hash(id + 1.7), hash(id + 9.2)) - 0.5; float d = length((f - o * 0.8) * cell);
  float b = pow(hash(id + 4.1), 3.0), tw = 0.75 + 0.25 * sin(uTime * (1.0 + 3.0 * hash(id + 2.3)) + 6.28 * h);
  return mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), hash(id + 5.5)) * b * tw * exp(-d * d / (0.35 + 1.2 * b));
}
// gravitational potential (per kg, sign flipped so it is positive): Σ GM / r
float phi(vec2 px) { float p = 0.0; for (int i = 0; i < ${MAXB}; i++) { if (i >= uN) break; p += uX[i].x / max(length(px - uB[i].xy) / uS, uX[i].w); } return p; }
void main() {
  vec2 px = gl_FragCoord.xy / uDpr;
  vec3 col = vec3(0.006, 0.01, 0.028) + vec3(0.02, 0.016, 0.05) * (1.0 - length(px / uRes - 0.5));
  vec2 par = uCam * uS * 0.04;
  col += starLayer(px + par * 0.3, 9.0, 0.93) * 0.55 + starLayer(px + par * 0.6, 17.0, 0.9) * 0.9 + starLayer(px + par, 31.0, 0.88) * 1.2;
  if (uLand > 0.0) {
    float L = log2(phi(px) / uPhiRef), Lx = log2(phi(px + vec2(1.0, 0.0)) / uPhiRef), Ly = log2(phi(px + vec2(0.0, 1.0)) / uPhiRef);
    float gr = length(vec2(Lx - L, Ly - L)) * 3.0 + 1e-6;          // contours every 1/3 of a doubling of the potential
    float f = fract(L * 3.0), dl = min(f, 1.0 - f) / gr;            // distance to the nearest contour, in pixels
    float line = (1.0 - smoothstep(0.35, 1.3, dl)) * (1.0 - smoothstep(0.2, 0.8, gr));   // fade out where contours crowd
    col += uLand * (vec3(0.04, 0.06, 0.18) * clamp(L * 0.07, 0.0, 0.6) + vec3(0.25, 0.42, 0.95) * line * 0.2 * clamp(0.45 + L * 0.08, 0.25, 1.0));
  }
  for (int i = 0; i < ${MAXB}; i++) {
    if (i >= uN) break;
    vec2 c = uB[i].xy, d = px - c; float r = uB[i].z, dist = length(d); vec3 bc = uC[i].rgb; float look = uC[i].w;
    if (look < 0.5) {   // the Sun: limb-darkened disc, flickering corona and a wide glow
      float a = atan(d.y, d.x), rays = 0.65 + 0.35 * sin(a * 9.0 + uTime * 0.6) * sin(a * 5.0 - uTime * 0.45);
      col += vec3(1.0, 0.72, 0.38) * exp(-max(dist - r, 0.0) / (r * 0.8)) * 0.9 * rays + vec3(1.0, 0.55, 0.25) * exp(-dist / (r * 7.0)) * 0.22;
      float limb = sqrt(max(0.0, 1.0 - dist * dist / (r * r)));
      col = mix(col, vec3(1.0, 0.94, 0.78) * (0.72 + 0.35 * limb), 1.0 - smoothstep(r - 1.0, r + 0.5, dist));
      continue;
    }
    col += bc * 0.28 * exp(-max(dist - r, 0.0) / (r * 0.7 + 2.0));   // soft glow
    float soi = uX[i].y, hi = uX[i].z;
    if (uSoiOn > 0.5 && soi > r * 2.5) {   // sphere of influence: dashed ring; a pulsing ring for a target, green once visited
      float an = atan(d.y, d.x), dash = step(0.45, fract(an * soi / 9.0)), w = 1.0 + hi * 0.7, ring = exp(-pow((dist - soi) / w, 2.0));
      vec3 rc = hi > 1.5 ? vec3(0.4, 1.0, 0.5) : bc;
      float k = hi > 1.5 ? 0.5 : hi > 0.5 ? 0.4 + 0.3 * sin(uTime * 4.0) : 0.16;
      col += rc * ring * k * (hi > 0.5 ? 1.0 : dash);
      if (hi > 0.5) col += rc * 0.035 * (1.0 - smoothstep(soi - 2.0, soi, dist));
    }
    vec2 q = vec2(d.x, d.y / 0.36); float rr = length(q) / r;
    float ringA = (look > 2.5 && look < 3.5) ? smoothstep(1.3, 1.36, rr) * (1.0 - smoothstep(2.2, 2.3, rr)) * (0.55 + 0.25 * sin(rr * 40.0)) : 0.0;
    vec3 ringC = vec3(0.92, 0.85, 0.66);
    if (d.y > 0.0) col = mix(col, ringC, ringA * 0.8);               // back half of Saturn's rings, behind the planet
    if (dist < r + 1.0) {                                             // the planet: a sphere lit from the Sun's direction
      vec2 nd = d / r; float z = sqrt(max(0.0, 1.0 - dot(nd, nd))); vec3 n = vec3(nd, z);
      vec2 ld = uHasSun > 0.5 ? normalize(uSunPx - c + 1e-4) : normalize(vec2(-0.6, 0.4));
      float diff = max(dot(n, normalize(vec3(ld * 0.9, 0.45))), 0.0);
      vec3 base = bc;
      if (look > 1.5 && look < 3.5) base *= 0.8 + 0.24 * sin(nd.y * 15.0 + sin(nd.x * 4.0 + nd.y * 7.0) * 0.8);   // cloud bands
      else if (look > 3.5) base *= 0.9 + 0.1 * nd.y;
      else base *= 0.88 + 0.16 * sin(nd.x * 9.0 + cos(nd.y * 7.0) * 2.0);
      vec3 pc = base * (0.05 + 1.15 * diff) + bc * pow(1.0 - z, 2.5) * 0.5 * (0.3 + diff);   // + a thin bright atmosphere at the edge
      col = mix(col, pc, 1.0 - smoothstep(r - 0.8, r + 0.6, dist));
    }
    if (d.y <= 0.0) col = mix(col, ringC * 0.95, ringA * 0.8);       // front half of the rings
  }
  gl_FragColor = vec4(col, 1.0);
}`;
const RIB_VS = `attribute vec2 aPos; attribute vec4 aCol; attribute vec3 aUv; uniform vec2 uRes; varying vec4 vCol; varying vec3 vUv;
void main() { vCol = aCol; vUv = aUv; gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0); }`;
// a ribbon: bright along its centre line, fading to the edges; vUv.z > 0 makes it dashed (dash length in pixels)
const RIB_FS = `precision mediump float; varying vec4 vCol; varying vec3 vUv;
void main() { float a = exp(-3.0 * vUv.x * vUv.x);
  if (vUv.z > 0.0) { float d = fract(vUv.y / vUv.z); a *= smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.5, 0.58, d)); }
  gl_FragColor = vec4(vCol.rgb * vCol.a * a, 1.0); }`;
const gv = K.gl.create(ui.stage, { dprMax: 2, antialias: false, fallback: "No WebGL here: drawing a simpler picture without the graphics card.", onLost: () => { glOn = false; } });
let glOn = false, P = {};
ui.stage.insertBefore(gv.el, ui.stage.firstChild);   // the WebGL picture underneath; the 2D canvas (labels, probe, arrows, mouse) on top
if (gv.ok) {
  try { const gl = gv.gl; P.bg = K.gl.program(gl, K.gl.QUAD_VS, BG_FS); P.rib = K.gl.program(gl, RIB_VS, RIB_FS); P.quad = K.gl.quad(gl); P.geo = K.gl.points(gl, { aPos: 2, aCol: 4, aUv: 3 }); glOn = true; }
  catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly: drawing a simpler picture without it."); }
}

// Ribbons are built on the CPU each frame as one long triangle strip, in screen pixels.
const RB = { pos: [], col: [], uv: [] };
function ribbon(pts, width, colAt, dash) {
  // pts: [[sx, sy], ...]; colAt(i) → [r, g, b, a]
  const n = pts.length; if (n < 2) return; let along = 0;
  const P_ = RB.pos, C = RB.col, U = RB.uv;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    if (i > 0) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const nx = -ty * width, ny = tx * width, c = colAt(i);
    if (i === 0 && P_.length) { P_.push(P_[P_.length - 2], P_[P_.length - 1]); C.push(...C.slice(-4)); U.push(...U.slice(-3)); P_.push(pts[0][0] + nx, pts[0][1] + ny); C.push(...c); U.push(1, along, dash || 0); }   // join strips with an invisible (degenerate) triangle
    P_.push(pts[i][0] + nx, pts[i][1] + ny, pts[i][0] - nx, pts[i][1] - ny); C.push(...c, ...c); U.push(1, along, dash || 0, -1, along, dash || 0);
  }
}
function glDraw(scr) {
  const gl = gv.gl, W = cv.w, H = cv.h, t = tNow();
  gl.viewport(0, 0, gv.el.width, gv.el.height); gl.disable(gl.BLEND);
  const B = new Float32Array(4 * MAXB), Cc = new Float32Array(4 * MAXB), X = new Float32Array(4 * MAXB); let sunPx = [0, 0], hasSun = 0;
  scr.forEach((o, i) => { if (i >= MAXB) return; const b = o.b; B.set([o.x, H - o.y, o.r, 0], 4 * i); Cc.set([...b.col, b.look], 4 * i); X.set([b.mu, b.soi * cam.s, o.hi, b.R], 4 * i); if (b.kind === "sun") { sunPx = [o.x, H - o.y]; hasSun = 1; } });
  const viewR = Math.min(W, H) / 2 / cam.s, mainMu = isLab() ? bodies[0].mu : GM_SUN;
  P.bg.set({ uRes: [W, H], uDpr: gv.el.width / W, uS: cam.s, uTime: performance.now() / 1000, uLand: S.land.value ? 1 : 0, uSoiOn: S.soi.value ? 1 : 0, uPhiRef: mainMu / viewR, uHasSun: hasSun, uCam: [cam.x, cam.y], uSunPx: sunPx, uN: Math.min(scr.length, MAXB), uB: B, uC: Cc, uX: X });
  P.quad.draw(P.bg, null);
  // ribbons: orbits, the predicted path (dashed), the probe's trail (a wide faint glow plus a bright core)
  RB.pos.length = RB.col.length = RB.uv.length = 0;
  buildPaths((pts, w, colAt, dash) => ribbon(pts, w, colAt, dash));
  if (RB.pos.length) {
    P.geo.set("aPos", new Float32Array(RB.pos)); P.geo.set("aCol", new Float32Array(RB.col)); P.geo.set("aUv", new Float32Array(RB.uv));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); P.rib.set({ uRes: [W, H] }); P.geo.draw(P.rib, RB.pos.length / 2, gl.TRIANGLE_STRIP); gl.disable(gl.BLEND);
  }
}
// The same paths, described once; drawn as GPU ribbons or (without WebGL) as canvas lines
function buildPaths(out) {
  const t = tNow();
  if (!isLab()) for (const b of bodies) if (b.kind === "orbit") {   // orbits
    const R = b.a * cam.s; if (R < 2) continue; const pts = [], n = Math.min(400, Math.max(60, R / 3 | 0));
    for (let k = 0; k <= n; k++) { const a = k / n * 6.2832; pts.push([SX(b.a * Math.cos(a)), SY(b.a * Math.sin(a))]); }
    out(pts, 1.6, () => [...b.col, 0.22]);
  }
  if (isLab()) {   // the planet's own path across the screen, in the Sun's frame
    if (lab.frame === "sun") out([[0, SY(0)], [cv.w, SY(0)]], 1.4, () => [...bodies[0].col, 0.18], 10);
  }
  const map = (p) => { const o = origin(p[3]); return [SX(p[0] - o[0]), SY(p[1] - o[1])]; };
  if (pred && pred.pts.length > 1 && S.pred.value) { const pp = pred.pts.map(map); out(pp, 2.2, i => [...pathCol(pred.pts[i][2], pred.pts[i][0], pred.pts[i][1]), 0.75], 11); }
  if (trail.length > 1) {
    const tp = trail.map(map), cols = trail.map(p => pathCol(p[2], p[0], p[1]));
    out(tp, 7, i => [...cols[i], 0.22]); out(tp, 1.9, i => [...cols[i], 1]);
  }
}

// ---------------------------------------------------------------- the 2D layer: labels, probe, arrows, vector diagram (and the whole picture without WebGL)
const TARGETS = ["jupiter", "saturn", "uranus", "neptune"], AIM_PX = 13;   // aiming: 13 pixels of drag per km/s
function screenBodies() {
  const t = tNow(), o = origin(t);
  return bodies.map((b, i) => { const [x, y] = bodyPos(b, t); let hi = 0; if (scene === "tour" && TARGETS.includes(b.key)) hi = visited.has(i) ? 2 : 1; return { b, i, x: SX(x - o[0]), y: SY(y - o[1]), r: drawRadius(b), hi }; });
}
const css = (c, a = 1) => `rgba(${c.map(v => Math.round(v * 255)).join(",")},${a})`;
function arrow(c, x0, y0, x1, y1, col, w = 2, head = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0), l = Math.hypot(x1 - x0, y1 - y0); if (l < 1) return; const h = Math.min(head, l * 0.5);
  c.strokeStyle = c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - h * 0.7 * Math.cos(a), y1 - h * 0.7 * Math.sin(a)); c.stroke();
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4)); c.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4)); c.closePath(); c.fill();
}
function draw2DScene(c, scr) {   // only used when WebGL is not available
  const W = cv.w, H = cv.h; c.fillStyle = "#04060f"; c.fillRect(0, 0, W, H);
  buildPaths((pts, w, colAt, dash) => { c.setLineDash(dash ? [dash * 0.55, dash * 0.45] : []); c.lineWidth = Math.max(1, w * 0.6); for (let i = 1; i < pts.length; i++) { const k = colAt(i); if (k[3] < 0.3 && w > 4) return; c.strokeStyle = css(k.slice(0, 3), Math.min(1, k[3] * 1.4)); c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke(); } c.setLineDash([]); });
  for (const o of scr) {
    if (S.soi.value && o.b.soi * cam.s > o.r * 2.5) { c.strokeStyle = o.hi === 2 ? "rgba(100,255,130,.6)" : css(o.b.col, o.hi ? 0.6 : 0.25); c.setLineDash([4, 5]); c.beginPath(); c.arc(o.x, o.y, o.b.soi * cam.s, 0, 6.3); c.stroke(); c.setLineDash([]); }
    c.fillStyle = o.b.kind === "sun" ? "#ffe9b0" : css(o.b.col); c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.3); c.fill();
  }
}
function drawOverlay() {
  const c = cv.ctx, W = cv.w, H = cv.h, scr = screenBodies(), t = tNow(), o = origin(t);
  c.clearRect(0, 0, W, H);
  if (glOn && gv.ok) glDraw(scr); else draw2DScene(c, scr);
  c.font = "11.5px Segoe UI,system-ui,sans-serif"; c.textAlign = "center";
  // labels
  for (const s of scr) if (s.b.kind !== "sun" && s.x > -50 && s.x < W + 50) { c.fillStyle = s.hi === 2 ? "#7ee787" : "rgba(210,220,240,.8)"; c.fillText(s.b.name + (s.hi === 2 ? " ✓" : ""), s.x, s.y + s.r + 14); }
  // predicted encounters: a ghost of each planet at the moment of closest approach
  if (pred && S.pred.value) pred.enc.forEach((e, i) => {
    const b = bodies[i]; if (b.kind === "sun" || !e.t || e.d > Math.max(3 * b.soi, isLab() ? 1 : 0.15)) return;
    if (!isLab() && e.t - t < 0.02 && craft.fly && craft.fly[i]) return;
    const [bx, by] = bodyPos(b, e.t), oo = origin(e.t), gx = SX(bx - oo[0]), gy = SY(by - oo[1]), r = drawRadius(b), px = SX(e.x - oo[0]), py = SY(e.y - oo[1]);
    c.strokeStyle = css(b.col, 0.8); c.setLineDash([3, 3]); c.lineWidth = 1.3; c.beginPath(); c.arc(gx, gy, r + 2, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(gx, gy); c.lineTo(px, py); c.stroke(); c.setLineDash([]);
    c.fillStyle = "#fff"; c.beginPath(); c.arc(px, py, 2.5, 0, 6.3); c.fill();
    if (!isLab()) { c.fillStyle = css(b.col, 0.95); c.textAlign = "left"; const lbl = `${b.name} in ${fmtT(e.t - t)}: closest ${e.d < 0.01 ? (e.d / b.R).toFixed(0) + " radii" : e.d.toFixed(e.d < 0.1 ? 3 : 2) + " AU"}${e.d < b.soi ? "" : " (misses the ring)"}`; c.fillText(lbl, gx + r + 8, gy - r - 4); c.textAlign = "center"; }
  });
  if (pred && pred.crashed && S.pred.value) { const p = pred.pts[pred.pts.length - 1], oo = origin(p[3]); c.fillStyle = "#ff6b81"; c.fillText("💥 predicted crash into " + pred.crashed, SX(p[0] - oo[0]), SY(p[1] - oo[1]) - 10); }
  // the probe
  if (craft) {
    const x = SX(craft.x - o[0]), y = SY(craft.y - o[1]);
    if (burnFlash > 0) { c.globalCompositeOperation = "lighter"; const fx = x - Math.cos(burnDir) * 16 * burnFlash, fy = y + Math.sin(burnDir) * 16 * burnFlash; const gr = c.createRadialGradient(fx, fy, 0, fx, fy, 14); gr.addColorStop(0, "rgba(255,220,140,.9)"); gr.addColorStop(1, "rgba(255,120,40,0)"); c.fillStyle = gr; c.beginPath(); c.arc(fx, fy, 14, 0, 6.3); c.fill(); c.globalCompositeOperation = "source-over"; burnFlash = Math.max(0, burnFlash - 0.03); }
    const gr = c.createRadialGradient(x, y, 0, x, y, 10); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(160,230,255,.6)"); gr.addColorStop(1, "rgba(120,200,255,0)");
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, 10, 0, 6.3); c.fill();
    if (craft.crashed) { c.fillStyle = "#ff6b81"; c.fillText("💥", x, y - 12); }
    if (mode === "aim") {   // launch arrow: Earth's velocity (grey) plus the launch velocity (green)
      const [ux, uy] = bodyVel(bodies[from], t), u = Math.hypot(ux, uy), a = Math.atan2(uy, ux) + aim.ang * Math.PI / 180;
      arrow(c, x, y, x + ux / u * 30, y - uy / u * 30, "rgba(200,210,230,.5)", 1.5, 6);
      arrow(c, x, y, x + Math.cos(a) * aim.v * AIM_PX, y - Math.sin(a) * aim.v * AIM_PX, aim.v > sc.budget ? "#ff6b81" : "#7ee787", 2.5, 10);
      c.fillStyle = aim.v > sc.budget ? "#ff6b81" : "#7ee787"; c.textAlign = "left"; c.fillText(`${aim.v.toFixed(2)} km/s at ${aim.ang.toFixed(2)}°`, x + Math.cos(a) * aim.v * AIM_PX + 8, y - Math.sin(a) * aim.v * AIM_PX); c.textAlign = "center";
    } else if (!ui.playing && !craft.crashed) { const v = Math.hypot(craft.vx, craft.vy); arrow(c, x, y, x + craft.vx / v * 40, y - craft.vy / v * 40, "#ffd166", 2, 8); }
  }
  // vector diagram: probe velocity = planet velocity + velocity relative to the planet
  let vi = null;
  if (isLab()) vi = { U: [lab.U / KMS, 0], rel: [craft.vx - lab.U / KMS, craft.vy], relIn: [lab.start.vx - lab.U / KMS, lab.start.vy], name: "planet" };
  else if (craft && craft.fly) { const f = craft.fly.find(q => q && !q.sun); if (f) { const U = bodyVel(bodies[f.i], t); vi = { U, rel: [craft.vx - U[0], craft.vy - U[1]], relIn: [f.rvx, f.rvy], name: bodies[f.i].name }; } }
  if (vi) vectorInset(c, vi);
  // scale bar
  const unit = isLab() ? R_JUP : 1, nice = [1, 2, 5, 10, 20, 50, 100, 200, 500], want = 110 / (cam.s * unit); let L = nice[0]; for (const n of nice) if (n <= want) L = n;
  if (!isLab() && want < 1) { L = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5].filter(n => n <= want).pop() || 0.01; }
  c.strokeStyle = c.fillStyle = "rgba(200,210,230,.7)"; c.lineWidth = 1.5; const bx = 16, by = 26, bw = L * unit * cam.s;
  c.beginPath(); c.moveTo(bx, by - 4); c.lineTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by - 4); c.stroke(); c.textAlign = "left"; c.fillText(isLab() ? `${L} planet radii` : `${L} AU`, bx + bw + 6, by + 1);
  hud();
}
function vectorInset(c, vi) {
  const W = cv.w, H = cv.h, bw = 250, bh = 200, x0 = W - bw - 12, y0 = H - bh - 12;
  c.fillStyle = "rgba(6,10,24,.82)"; c.strokeStyle = "rgba(140,160,210,.35)"; c.lineWidth = 1; c.beginPath(); c.roundRect(x0, y0, bw, bh, 8); c.fill(); c.stroke();
  c.fillStyle = "#cfd8ea"; c.textAlign = "left"; c.font = "11.5px Segoe UI,system-ui,sans-serif"; c.fillText("Velocities (Sun's frame)", x0 + 10, y0 + 16);
  const U = vi.U, r = Math.hypot(vi.rel[0], vi.rel[1]), pts = [[0, 0], U, [U[0] + r, U[1] + r], [U[0] - r, U[1] - r], [U[0] + vi.relIn[0], U[1] + vi.relIn[1]]];
  let xa = Math.min(...pts.map(p => p[0])), xb = Math.max(...pts.map(p => p[0])), ya = Math.min(...pts.map(p => p[1])), yb = Math.max(...pts.map(p => p[1]));
  const k = Math.min((bw - 30) / (xb - xa || 1), (bh - 76) / (yb - ya || 1)), ox = x0 + 15 + (bw - 30 - (xb - xa) * k) / 2 - xa * k, oy = y0 + 26 + (bh - 76 - (yb - ya) * k) / 2 + yb * k;
  const X = v => ox + v[0] * k, Y = v => oy - v[1] * k;
  c.strokeStyle = "rgba(90,209,255,.45)"; c.setLineDash([3, 4]); c.beginPath(); c.arc(X(U), Y(U), r * k, 0, 6.3); c.stroke(); c.setLineDash([]);
  const P0 = [U[0] + vi.relIn[0], U[1] + vi.relIn[1]], P1 = [U[0] + vi.rel[0], U[1] + vi.rel[1]];
  arrow(c, ox, oy, X(P0), Y(P0), "rgba(255,180,84,.35)", 2, 7);
  arrow(c, ox, oy, X(U), Y(U), "#aab4c8", 2, 7);
  arrow(c, X(U), Y(U), X(P1), Y(P1), "#5ad1ff", 2, 7);
  arrow(c, ox, oy, X(P1), Y(P1), "#ffb454", 2.6, 9);
  c.font = "10.5px Segoe UI,system-ui,sans-serif";
  c.fillStyle = "#aab4c8"; c.fillText(`${vi.name}: ${kms(Math.hypot(U[0], U[1])).toFixed(1)} km/s`, x0 + 10, y0 + bh - 38);
  c.fillStyle = "#5ad1ff"; c.fillText(`relative to ${vi.name}: ${kms(r).toFixed(1)} km/s`, x0 + 10, y0 + bh - 24);
  c.fillStyle = "#ffb454"; c.fillText(`probe: ${kms(Math.hypot(P1[0], P1[1])).toFixed(1)} km/s (faint: before, ${kms(Math.hypot(P0[0], P0[1])).toFixed(1)})`, x0 + 10, y0 + bh - 10);
}
function hud() {
  if (isLab()) {
    const L = lab, v = kms(Math.hypot(craft.vx, craft.vy));
    ui.hud(`${L.done ? "<b>Flyby complete</b> (↺ Reset to replay)" : craft.t < 0 ? "Closest approach in " + (-craft.t / DAY).toFixed(1) + " days" : (craft.t / DAY).toFixed(1) + " days after closest approach"}<br>Speed (Sun's frame): <b>${v.toFixed(2)} km/s</b> <span style="color:${v >= kms(L.start.v) ? "#ffb454" : "#5ad1ff"}">(${v >= kms(L.start.v) ? "+" : "−"}${Math.abs(v - kms(L.start.v)).toFixed(2)})</span>`);
    return;
  }
  const lines = [];
  if (sc.goal) lines.push(`<b>Goal:</b> ${sc.goal}${goalMet ? " <b style='color:#7ee787'>✓ done!</b>" : ""}`);
  if (scene === "tour") lines.push(TARGETS.map(k => { const i = bodies.findIndex(b => b.key === k); return visited.has(i) ? `<span style="color:#7ee787">${bodies[i].name} ✓</span>` : `<span style="color:#9aa6bf">${bodies[i].name} ○</span>`; }).join(" · "));
  if (scene === "venus") lines.push(`Closest to the Sun so far: ${rminSun < 100 ? rminSun.toFixed(3) + " AU" : "–"}`);
  const left = sc.budget - (mode === "aim" ? aim.v : dvUsed);
  lines.push(`Δv budget: ${sc.budget} km/s · <span style="color:${left < 0 ? "#ff6b81" : "#7ee787"}">${left.toFixed(2)} left</span>`);
  if (mode === "aim") lines.push("<span style='color:#ffd166'>On the launch pad: aim, then press 🚀 Launch</span>");
  else if (craft.crashed) lines.push(`<span style='color:#ff6b81'>Crashed into ${craft.crashed}</span>`);
  else lines.push(`Day ${((craft.t - aim.date * DAY) / DAY).toFixed(0)} of the flight (${((craft.t - aim.date * DAY)).toFixed(2)} years)`);
  const log = (craft && craft.log || []).filter(f => !f.sun).slice(-4);
  for (const f of log) lines.push(`${f.name} flyby: <b style="color:${f.gain >= 0 ? "#ffb454" : "#5ad1ff"}">${f.gain >= 0 ? "+" : "−"}${Math.abs(kms(f.gain)).toFixed(2)} km/s</b>`);
  ui.hud(lines.join("<br>"));
}

// ---------------------------------------------------------------- mouse
let drag = null;
const COLS = [[0.9, 0.5, 0.9], [0.5, 0.95, 0.6], [1, 0.6, 0.4], [0.6, 0.7, 1], [0.95, 0.9, 0.4]];
K.pointer(cv.el, {
  down(p) {
    const b = p.e.button;
    if (isLab()) { drag = { type: "lab" }; this.drag(p); return; }
    if (b === 2) {   // right-click: remove a planet you added
      const scr = screenBodies(); const hit = scr.find(o => o.b.custom && Math.hypot(o.x - p.x, o.y - p.y) < o.r + 8);
      if (hit) { extraPlanets = extraPlanets.filter(e => e.key !== hit.b.key); rebuild(true); }
      return;
    }
    if (scene === "sandbox" && tool === "add") {
      if (extraPlanets.length >= MAXB - 3) { ui.tip("That is enough planets!"); return; }
      const x = WX(p.x), y = WY(p.y), a = Math.hypot(x, y); if (a < 0.2) { ui.tip("Too close to the Sun."); return; }
      const n = extraPlanets.length, w = Math.sqrt(GM_SUN / a ** 3);
      extraPlanets.push({ key: "x" + Date.now(), name: "Planet " + LETTERS[n % LETTERS.length], a, ph: Math.atan2(y, x) - w * tNow(), mE: Math.pow(10, S.newMass.value), col: COLS[n % COLS.length] });
      rebuild(true); return;
    }
    if (mode === "aim") { const e = screenBodies()[from]; if (Math.hypot(e.x - p.x, e.y - p.y) < 60) { drag = { type: "aim" }; this.drag(p); return; } }
    drag = { type: "pan", px: p.x, py: p.y, cx: cam.x, cy: cam.y }; if (follow) S.cam.set("fixed", false), follow = false;
  },
  drag(p) {
    if (!drag) return;
    if (drag.type === "pan") { cam.x = drag.cx - (p.x - drag.px) / cam.s; cam.y = drag.cy + (p.y - drag.py) / cam.s; predDirty = true; }
    else if (drag.type === "aim") {   // the arrow from Earth to the pointer sets the launch velocity
      const e = screenBodies()[from], dx = p.x - e.x, dy = e.y - p.y, [ux, uy] = bodyVel(bodies[from], tNow());
      let ang = (Math.atan2(dy, dx) - Math.atan2(uy, ux)) * 180 / Math.PI; ang = ((ang + 540) % 360) - 180;
      setAim(+Math.min(20, Math.hypot(dx, dy) / AIM_PX).toFixed(2), +ang.toFixed(2), aim.date);
    } else if (drag.type === "lab") {   // choose the closest-approach point, relative to the planet (which is at the centre at closest approach)
      const o = origin(0), x = WX(p.x) + o[0] - (lab.frame === "planet" ? 0 : 0), y = WY(p.y), th = lab.th * Math.PI / 180;
      const side = Math.sign(-Math.sin(th) * x + Math.cos(th) * y) || 1, r = Math.hypot(x, y) / R_JUP;
      S.rp.set(K.clamp(+(side * Math.max(1.1, r)).toFixed(1), -40, 40), true);
    }
  },
  up() { drag = null; },
});
cv.el.addEventListener("wheel", e => {
  e.preventDefault(); const r = cv.el.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, wx = WX(px), wy = WY(py), f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
  cam.s = K.clamp(cam.s * f, 0.5, 1e8); cam.x = wx - (px - cv.w / 2) / cam.s; cam.y = wy + (py - cv.h / 2) / cam.s; predDirty = true;
}, { passive: false });
function shot() { if (glOn) K.gl.screenshot("gravity-slingshot", gv.el, cv.el); else K.gl.screenshot("gravity-slingshot", cv.el); }

// ---------------------------------------------------------------- charts and readouts
function charts() {
  if (isLab()) {
    chA.draw([{ pts: hist.v, color: "#ffb454", width: 2.2, label: "Sun's frame" }, { pts: hist.rel, color: "#7ee787", width: 2, label: "relative to the planet" }],
      { title: "Probe's speed", xLabel: "days from closest approach", yLabel: "km/s", xMin: -lab.tEnd / DAY, xMax: lab.tEnd / DAY, yMin: 0, yMax: null, hlines: [] });
    chB.draw([{ pts: hist.d, color: "#5ad1ff", width: 2 }], { title: "Distance from the planet", xLabel: "days from closest approach", yLabel: "planet radii", xMin: -lab.tEnd / DAY, xMax: lab.tEnd / DAY, yMin: 0, yMax: null, hlines: [{ y: 1, color: "#ff6b81", label: "surface" }] });
  } else {
    const fl = (craft && craft.log || []).filter(f => !f.sun).map(f => ({ x: f.tmin, color: "rgba(200,210,230,.45)", label: f.name, dash: [3, 3] }));
    chA.draw([{ pts: hist.esc, color: "#aab4c8", dash: [5, 4], label: "escape speed here" }, { pts: hist.v, color: "#ffb454", width: 2.2, label: "probe" }], { title: "Probe's speed (relative to the Sun)", xLabel: "time (years)", yLabel: "km/s", yMin: 0, yMax: null, xMin: null, xMax: null, vlines: fl, hlines: [] });
    chB.draw([{ pts: hist.e, color: "#7ee787", width: 2.2 }], { title: "Energy per kg (kinetic + gravitational, relative to the Sun)", xLabel: "time (years)", yLabel: "MJ per kg", yMin: null, yMax: null, xMin: null, xMax: null, vlines: fl, hlines: [{ y: 0, color: K.cssVar("--warn"), label: "above zero: escapes the Sun" }] });
  }
}
function readouts() {
  if (isLab()) {
    const L = lab, U = L.U / KMS, rel = Math.hypot(craft.vx - U, craft.vy), [px] = bodyPos(bodies[0], craft.t);
    const as = asymptotes(craft.x - px, craft.y, craft.vx - U, craft.vy, bodies[0].mu), vin = Math.hypot(U + as.inX, as.inY), vout = Math.hypot(U + as.outX, as.outY);
    const turn = Math.abs(Math.atan2(as.inX * as.outY - as.inY * as.outX, as.inX * as.outX + as.inY * as.outY)) * 180 / Math.PI;
    const dmin = hist.d.length ? Math.min(...hist.d.map(p => p[1])) : 0, sg = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
    readLab.set("vin", kms(vin).toFixed(2) + " km/s"); readLab.set("vout", kms(vout).toFixed(2) + " km/s");
    readLab.set("gain", sg(kms(vout - vin)) + " km/s"); readLab.set("th", sg(kms(L.theory.gain)) + " km/s");
    readLab.set("rel", kms(as.vinf).toFixed(2) + " km/s"); readLab.set("turn", turn.toFixed(1) + "° (theory " + (L.theory.delta * 180 / Math.PI).toFixed(1) + "°)");
    readLab.set("rmin", craft.crashed ? "crashed!" : dmin ? dmin.toFixed(2) + " radii" : "–");
  } else {
    const r = Math.hypot(craft.x, craft.y), v = Math.hypot(craft.vx, craft.vy), e = energy(craft) * KMS * KMS;
    read.set("t", mode === "aim" ? "day " + aim.date : fmtT(craft.t - aim.date * DAY)); read.set("v", kms(v).toFixed(2) + " km/s"); read.set("r", r.toFixed(2) + " AU");
    read.set("esc", kms(escSpeed(r)).toFixed(2) + " km/s"); read.set("e", `<span style="color:${e > 0 ? "#ffb454" : "inherit"}">${e.toFixed(0)} MJ/kg ${e > 0 ? "(escaping)" : "(bound)"}</span>`);
    read.set("dv", `${(mode === "aim" ? aim.v : dvUsed).toFixed(2)} of ${sc.budget} km/s`);
    const g = (craft.log || []).filter(f => !f.sun).reduce((a, f) => a + f.gain, 0); read.set("gain", (g >= 0 ? "+" : "−") + Math.abs(kms(g)).toFixed(2) + " km/s");
  }
}

// ---------------------------------------------------------------- run
ui.run(dt => step(dt), () => {
  frame++;
  if (follow && craft && !isLab()) { cam.x += (craft.x - cam.x) * 0.08; cam.y += (craft.y - cam.y) * 0.08; }
  if (predDirty && frame % 2 === 0) predict();
  drawOverlay();
  if (frame % 4 === 0) { charts(); readouts(); }
});
setScene("jupiter");
setAim(9.4, 8, 280); launch();
ui.tip("A probe launched from Earth swings past Jupiter and is flung out of the Solar System. Try the Investigate tab for challenges.", 9000);
