/* =====================================================================
   FIELDS AND ORBITS
   A FIELD is a region where something feels a force without being
   touched: a charge near other charges, a mass near other masses.

   Both kinds obey an inverse-square law, so one piece of code does both:

     field strength at distance r from a point source  =  K × s / r²
     potential there                                   =  K × s / r

   where s is the charge (electric) or MINUS the mass (gravity: always
   attractive). The fields of several sources simply add up as vectors.

   The map shows the potential as colour, lines of equal potential, and
   field lines. Anything you launch is moved by working out the field
   where it is, many times a second: the orbits are not drawn from a
   formula, they come out of the inverse-square law.

   UNITS:  electric   cm, microseconds, nC      (field in V/m, potential in V)
           Earth      thousands of km (Mm), minutes, Earth masses
           Sun        astronomical units (AU), years, solar masses
   ===================================================================== */
const UNITS = {
  E: { K: 89880, len: "cm", time: "µs", pot: v => v / 100, potU: "V", fld: f => f / 1000, fldU: "kV/m", spd: v => v * 10, spdU: "km/s", srcU: "nC", fldName: "E", qm: 9.58e-3 },   // qm: a proton's acceleration (cm/µs²) per V/m
  G: { K: 1.435, len: "thousand km", time: "min", pot: v => v * 277.8, potU: "MJ/kg", fld: f => f * 277.8, fldU: "N/kg", spd: v => v * 16.667, spdU: "km/s", srcU: "Earth masses", fldName: "g", qm: 1 },
  SUN: { K: 39.478, len: "AU", time: "years", pot: v => v * 22.47, potU: "MJ/kg", fld: f => f * 0.1502, fldU: "mm/s²", spd: v => v * 4.74, spdU: "km/s", srcU: "solar masses", fldName: "g", qm: 1 }
};
// field (fx, fy) and potential at a point: add up the contribution of every source
function fieldAt(src, K, x, y, out) {
  let fx = 0, fy = 0, p = 0;
  for (let i = 0; i < src.length; i++) { const s = src[i], dx = x - s.x, dy = y - s.y, r2 = dx * dx + dy * dy + 1e-9, r = Math.sqrt(r2), k = K * s.q / (r2 * r); fx += k * dx; fy += k * dy; p += K * s.q / r; }
  out[0] = fx; out[1] = fy; out[2] = p; return out;
}
const _f = [0, 0, 0];
/* Move one launched particle forward by time T. Each small step: half a kick from the field, move, half a kick again
   ("leapfrog"), which keeps the energy steady over many orbits. Steps shrink automatically when close to a source.
   p = {x, y, vx, vy, qm}; qm is +1 for a mass, or the charge-to-mass factor for an ion. Returns false if it hits a source. */
function advance(p, src, K, T) {
  let left = T, guard = 0;
  while (left > 1e-12 && guard++ < 4000) {
    let h = left, hitR = 0; const sp = Math.hypot(p.vx, p.vy) + 1e-12;
    for (const s of src) { const r = Math.hypot(p.x - s.x, p.y - s.y); if (r < (s.R || 0)) return false; const a = Math.abs(K * s.q * p.qm) / (r * r) + 1e-12; h = Math.min(h, 0.02 * r / sp, 0.04 * Math.sqrt(r / a)); }
    h = Math.max(h, T * 1e-5);
    fieldAt(src, K, p.x, p.y, _f); p.vx += p.qm * _f[0] * h / 2; p.vy += p.qm * _f[1] * h / 2; p.x += p.vx * h; p.y += p.vy * h;
    fieldAt(src, K, p.x, p.y, _f); p.vx += p.qm * _f[0] * h / 2; p.vy += p.qm * _f[1] * h / 2; left -= h;
  }
  return true;
}
// sources that are free to move (stars in a binary, the Earth and Moon) pull on each other
function moveSources(src, K, T) {
  const n = 24, h = T / n;
  for (let k = 0; k < n; k++) {
    for (const a of src) { if (!a.free) continue; let ax = 0, ay = 0; for (const b of src) { if (b === a) continue; const dx = a.x - b.x, dy = a.y - b.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2), q = K * b.q / (r2 * r); ax += q * dx; ay += q * dy; } a.vx += ax * h; a.vy += ay * h; }
    for (const a of src) if (a.free) { a.x += a.vx * h; a.y += a.vy * h; }
  }
}
const vCirc = (K, m, r) => Math.sqrt(K * m / r);      // speed for a circular orbit: gravity supplies exactly the centripetal force
const vEsc = (K, m, r) => Math.sqrt(2 * K * m / r);   // escape speed: kinetic energy just equals the depth of the potential well

// ---------------- Scenes ----------------
const plates = (q) => { const a = []; for (let k = 0; k < 13; k++) { a.push({ x: -9 + k * 1.5, y: 4, q: q / 13, R: 0.25 }); a.push({ x: -9 + k * 1.5, y: -4, q: -q / 13, R: 0.25 }); } return a; };
const SCENES = {
  charge: { u: "E", view: 30, rate: 0.1, src: () => [{ x: 0, y: 0, q: 2, R: 0.5 }] },
  dipole: { u: "E", view: 30, rate: 0.1, src: () => [{ x: -5, y: 0, q: 2, R: 0.5 }, { x: 5, y: 0, q: -2, R: 0.5 }] },
  like: { u: "E", view: 30, rate: 0.1, src: () => [{ x: -5, y: 0, q: 2, R: 0.5 }, { x: 5, y: 0, q: 2, R: 0.5 }] },
  plates: { u: "E", view: 34, rate: 0.1, src: () => plates(4) },
  earth: { u: "G", view: 120, rate: 25, src: () => [{ x: 0, y: 0, q: -1, R: 6.371, name: "Earth" }], parts: K0 => [orbiter(K0, 1, 12, 1), orbiter(K0, 1, 42.16, 1)] },
  moon: { u: "G", view: 1000, rate: 1500, src: K0 => { const v = vCirc(K0, 1.0123, 384.4); return [{ x: -4.67, y: 0, q: -1, R: 6.371, name: "Earth", free: true, vx: 0, vy: -v * 0.01215 }, { x: 379.7, y: 0, q: -0.0123, R: 1.737, name: "Moon", free: true, vx: 0, vy: v * 0.98785 }]; } },
  sun: { u: "SUN", view: 6.6, rate: 0.25, src: () => [{ x: 0, y: 0, q: -1, R: 0.03, name: "Sun" }], parts: K0 => [orbiter(K0, 1, 0.387, 1, "Mercury"), orbiter(K0, 1, 0.723, 1, "Venus"), orbiter(K0, 1, 1, 1, "Earth"), orbiter(K0, 1, 1.524, 1, "Mars"), orbiter(K0, 1, 0.35, 1.32, "a comet")] },
  transfer: { u: "SUN", view: 6.6, rate: 0.25, src: () => [{ x: 0, y: 0, q: -1, R: 0.03, name: "Sun" }], parts: K0 => [turn(orbiter(K0, 1, 1, 1, "Earth"), -0.12), turn(orbiter(K0, 1, 1.524, 1, "Mars"), 0.75), orbiter(K0, 1, 1, 1, "spacecraft")] },
  binary: { u: "SUN", view: 9, rate: 0.5, src: K0 => { const v = vCirc(K0, 2, 1) / 2; return [{ x: -0.5, y: 0, q: -1, R: 0.04, name: "star A", free: true, vx: 0, vy: -v }, { x: 0.5, y: 0, q: -1, R: 0.04, name: "star B", free: true, vx: 0, vy: v }]; }, parts: K0 => [orbiter(K0, 2, 3, 1, "planet")] }
};
const turn = (p, a) => { const c = Math.cos(a), s = Math.sin(a); [p.x, p.y, p.vx, p.vy] = [p.x * c - p.y * s, p.x * s + p.y * c, p.vx * c - p.vy * s, p.vx * s + p.vy * c]; return p; };   // start an orbiter part-way round
function orbiter(K0, m, r, f, name) { return { x: r, y: 0, vx: 0, vy: vCirc(K0, m, r) * f, qm: 1, trail: [], name }; }   // f = speed as a multiple of the circular-orbit speed

// ---------------- The page ----------------
let scene = "earth", U = UNITS.G, src = [], parts = [], view = 120, rate = 25, speedMul = 1, tSim = 0, dirty = true, tool = "launch", ion = 1, newQ = 1;
let show = { map: true, equi: true, lines: true, flow: true, tilt: false, sectors: false }, probe = null, elog = [], sectors = [], secT = 0, tracers;
const tracked = () => parts.length ? parts[parts.length - 1] : null;
function load(name) {
  scene = name; const sc = SCENES[name]; U = UNITS[sc.u]; src = sc.src(U.K); parts = sc.parts ? sc.parts(U.K) : []; view = sc.view; rate = sc.rate; tSim = 0; dirty = true; elog = []; sectors = []; secT = 0;
  if (typeof ctl !== "undefined") { ctl.ion.el.style.display = sc.u === "E" ? "" : "none"; ctl.q.set(sc.u === "E" ? 2 : 1, true); }
  if (typeof cv !== "undefined") resetTracers();
}

const ui = K.app({
  title: "Fields and Orbits", subject: "Physics",
  blurb: "Sculpt electric and gravitational fields, then launch things through them",
  reset: () => { set({ scene: "earth" }); },
  missions: [
    { title: "The shape of a field", q: "One positive charge. The arrows on the field lines show which way a small positive charge would be pushed. Move the pointer around: how does the field strength change as you double your distance from the charge? What shape are the lines of equal potential?", hint: "The field lines spread out evenly in all directions, so the same number of lines pass through a bigger and bigger sphere: double the distance and the field strength falls to a quarter (an inverse-square law; see the right-hand graph). The equipotentials are circles, always at right angles to the field lines, and they are closer together where the field is stronger.", setup() { set({ scene: "charge", tilt: false }); } },
    { title: "Opposites attract", q: "A positive and a negative charge. Where do the field lines start and finish? Launch a positive ion from near the positive charge (drag to aim, or just click to release it from rest). Does it follow a field line exactly?", hint: "Field lines start on positive charge and end on negative charge. An ion released from rest starts off along the field line, because that is the direction of the force on it. But once it is moving, its momentum carries it wide on the bends: a field line shows the direction of the force, not the path of a moving particle.", setup() { set({ scene: "dipole", tilt: false }); } },
    { title: "The place with no field", q: "Two equal positive charges. Find the point where the field strength reads zero. What is the potential there: also zero? Tilt the map to see the potential as a landscape.", hint: "Exactly half-way between them the two pushes are equal and opposite, so the field is zero. The potential there is far from zero: it is the sum of two positive potentials. On the tilted view the point is a saddle (a pass between two hills): flat, so no force, but high up. Field strength is the slope of the potential, not its height.", setup() { set({ scene: "like", tilt: false }); } },
    { title: "A uniform field", q: "Two rows of charges make a pair of charged plates. What is special about the field between them? Fire positive ions across the gap from the left (drag to the right from the left edge). What shape is the path?", hint: "Between the plates the field lines are parallel and evenly spaced: the field has the same strength and direction everywhere (a uniform field), and the equipotentials are evenly spaced parallel lines. An ion crossing it feels a constant sideways force, so it follows a parabola, exactly like a ball thrown sideways under gravity. This is how an oscilloscope and an inkjet printer steer charged particles.", setup() { set({ scene: "plates", tilt: false }); } },
    { title: "Falling without landing", q: "Two satellites circle the Earth: one low, one at the height of TV satellites. Launch your own: drag sideways from a point above the Earth and watch the dotted prediction. What decides whether it falls back, circles, or escapes?", hint: "Speed. Too slow and the path meets the ground. At exactly the circular speed (the dotted path closes into a circle) gravity bends the path at just the rate the Earth curves away beneath it: the satellite is always falling but never gets nearer. Faster gives an ellipse, and above √2 times the circular speed (the escape speed) it never returns. The higher the orbit, the slower the satellite needs to go.", setup() { set({ scene: "earth", tilt: false }); } },
    { title: "Kepler's laws", q: "Four planets and a comet orbit the Sun. Which goes round fastest? Switch on 'Equal-time sectors' and watch the comet: compare its speed when near the Sun and when far away, and compare the areas of the wedges.", hint: "The nearer a planet is to the Sun, the stronger the pull and the faster it goes; and its orbit is shorter too, so its year is much shorter (T² is proportional to r³: Kepler's third law). The comet speeds up as it falls towards the Sun and slows as it climbs away, but the line joining it to the Sun sweeps out equal areas in equal times (Kepler's second law). Gravitational potential energy turns into kinetic energy and back: see the left-hand graph.", setup() { set({ scene: "sun", tilt: false, sectors: true }); } },
    { title: "The gravity well", q: "Tilt the map. The potential around the Earth now looks like a well. Launch satellites at different speeds. How does the picture explain the difference between an orbit and an escape?", hint: "The depth of the well at any point is the energy per kilogram needed to climb out from there. A satellite in orbit rolls round the inside wall without enough kinetic energy to reach the rim. Give it more than the escape speed and it has enough to climb all the way out. The slope of the wall is the field strength, steepest near the Earth. (The well is a graph of energy, not a picture of space itself.)", setup() { set({ scene: "earth", tilt: true }); } },
    { title: "Earth and Moon", q: "The Earth and Moon orbit their common centre of mass. Tilt the map: find the Moon's small well on the side of the Earth's. Try to launch a spacecraft from near the Earth so that it reaches the Moon.", hint: "The Moon's well is a small dimple in the broad slope of the Earth's. To get there a spacecraft needs nearly the Earth's escape speed, aimed ahead of where the Moon is now, because the Moon moves on during the three-day journey. Between the two is a point where the pulls balance. Apollo used a path that looped round the back of the Moon and fell home again if the engine failed.", setup() { set({ scene: "moon", tilt: false }); } },
    { lvl: "adv", title: "Earth to Mars: a Hohmann transfer", q: "A spacecraft is coasting round the Sun in the Earth's orbit (1 AU). Mars orbits at 1.52 AU. Press 'Engine burn: speed up 1%' until the furthest point of the spacecraft's orbit reads 1.52 AU. By what percentage did you have to raise its speed? Does it meet Mars when it gets there?", hint: "About 10%: theory says the speed must rise by a factor √(2r₂/(r₁+r₂)) = 1.099. The spacecraft then coasts along half an ellipse, taking about 8.5 months, with no further fuel. It only meets Mars if Mars is in the right place when it arrives, which is why launches wait for a 'window' every 26 months. A second burn on arrival is needed to match Mars's speed. This two-burn route uses the least fuel.", setup() { set({ scene: "transfer", tilt: false }); } },
    { title: "Two suns", q: "A planet orbits a pair of stars. Is its orbit steady? Now launch another planet much closer in, between or near the stars. What happens to it?", hint: "Far from the pair, the planet feels them almost as a single mass and its orbit is stable. Close in, the pull changes from moment to moment as the stars swing round, and the planet is soon thrown out or swallowed: there is no stable orbit there, and tiny changes in the launch give completely different results (chaos). Real planets around double stars, such as Kepler-16b, all orbit well outside the pair.", setup() { set({ scene: "binary", tilt: false }); } }
  ],
  batch: [
    { title: "Kepler's third law", question: "How does the time for one orbit depend on the size of the orbit?", how: "Each run: a satellite is launched round the Earth at the circular-orbit speed for its radius, give or take a random 1% error, and timed for one orbit.", xLabel: "orbit radius (thousand km)", yLabel: "time for one orbit (hours)", xs: [7, 10, 15, 20, 26.6, 35, 42.2, 55, 70], reps: 5, yMin: 0, theory: r => 2 * Math.PI * Math.sqrt(r * r * r / 1.435) / 60, theoryLabel: "T = 2π√(r³/GM)", run(r, rnd) { const p = { x: r, y: 0, vx: 0, vy: vCirc(1.435, 1, r) * (1 + 0.01 * rnd.gauss()), qm: 1 }, S0 = [{ x: 0, y: 0, q: -1, R: 6.371 }]; let t = 0, prev = 0, turned = false; const dt = 0.5; while (t < 6000) { if (!advance(p, S0, 1.435, dt)) return null; t += dt; const a = Math.atan2(p.y, p.x); if (a < 0) turned = true; if (turned && prev < 0 && a >= 0) return (t - dt * a / (a - prev)) / 60; prev = a; } return null; }, note: "A small error in launch speed makes the orbit slightly oval and changes its period by about three times as much, which is why real launches need such precise engine burns. 42 200 km gives 24 hours: the geostationary orbit." },
    { title: "Escape", question: "A rocket coasts straight up from 7000 km. How far does it get for each launch speed?", how: "Each run: launched from 7000 km from the Earth's centre, within 15° of vertical, engines off. The result is the greatest distance reached.", xLabel: "launch speed (km/s)", yLabel: "greatest distance from Earth's centre (thousand km)", xs: [4, 5, 6, 7, 8, 9, 9.5, 10, 10.3], reps: 5, yMin: 0, theory: v => { const e = (v / 16.667) ** 2 / 2 - 1.435 / 7; return e >= 0 ? null : -1.435 / e; }, theoryLabel: "energy conservation", run(v, rnd) { const a = (rnd() - .5) * 0.52, sp = v / 16.667, p = { x: 7, y: 0, vx: sp * Math.cos(a), vy: sp * Math.sin(a), qm: 1 }, S0 = [{ x: 0, y: 0, q: -1, R: 6.371 }]; let best = 7, t = 0; while (t < 20000) { if (!advance(p, S0, 1.435, 2)) break; t += 2; const r = Math.hypot(p.x, p.y); if (r > best) best = r; else if (r < best * 0.98) break; } return best; }, note: "The escape speed from 7000 km is 10.7 km/s. As the launch speed approaches it the greatest distance shoots up without limit: the last few hundred metres per second buy an enormous amount of height." },
    { title: "The inverse-square law", question: "How does field strength fall with distance from a charge?", how: "Each run: the field of a 2 nC charge is read at the chosen distance by a probe with a random 4% reading error.", xLabel: "distance (cm)", yLabel: "field strength (kV/m)", xs: [2, 3, 4, 5, 6, 8, 10, 12, 15], reps: 6, yMin: 0, theory: r => 89.88 * 2 / (r * r), theoryLabel: "E = kQ/r²", run(r, rnd) { fieldAt([{ x: 0, y: 0, q: 2 }], 89880, r, 0, _f); return _f[0] / 1000 * (1 + 0.04 * rnd.gauss()); } },
    { title: "Kepler's second law", question: "Does a comet sweep out area at a steady rate all round its orbit?", how: "Each run: a comet on a long oval orbit round the Sun is followed from a random point for 0.02 years. The result is the area swept by the line from the Sun, per year.", xLabel: "", yLabel: "area swept per year (AU²)", reps: 200, bins: 20, lo: 2.3, hi: 2.6, theory: 0.5 * 0.35 * vCirc(39.478, 1, 0.35) * 1.32, theoryLabel: "½ r v at closest point", run(x, rnd) { const p = orbiter(39.478, 1, 0.35, 1.32), S0 = [{ x: 0, y: 0, q: -1, R: 0.01 }]; advance(p, S0, 39.478, rnd() * 2.5); let area = 0; for (let k = 0; k < 20; k++) { const x0 = p.x, y0 = p.y; advance(p, S0, 39.478, 0.001); area += 0.5 * Math.abs(x0 * p.y - y0 * p.x); } return area / 0.02; }, note: "The bars pile into one narrow column: the same area per year whether the comet is racing past the Sun or crawling at its furthest. Any spread is only the small error of the step-by-step calculation." },
    { title: "Steering ions with plates", question: "How does the sideways deflection of an ion depend on the charge on the plates?", how: "Each run: a proton is fired at 300 km/s (give or take 2%) along the middle of the gap between two plates carrying the chosen charge. The result is how far it has been pushed sideways after travelling 16 cm.", xLabel: "charge on each plate (nC)", yLabel: "deflection (cm)", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], reps: 5, yMin: 0, fit: true, run(q, rnd) { const p = { x: -8, y: 0, vx: 30 * (1 + 0.02 * rnd.gauss()), vy: 0, qm: 9.58e-3 }, S0 = plates(q); for (let k = 0; k < 4000 && p.x < 8; k++) if (!advance(p, S0, 89880, 0.002)) return null; return -p.y; }, note: "The field between the plates is proportional to the charge on them, so the force, and hence the deflection, is too: a straight line through the origin. A faster ion spends less time between the plates and is deflected less." }
  ],
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1): 8(b) Motion in the Universe, weight = mg, and electric charge (like charges repel, unlike attract). Field strength and potential formulas are A level.", adv: "WJEC Eduqas A level Physics: Component 2 Topic 6 Fields and Topic 8 Orbits and the wider Universe." } },
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 8(b)", text: "Gravitational force keeps moons in orbit round planets, planets and comets round the Sun, and satellites round the Earth." },
      { lvl: "std", tag: "4PH1 8(b)", text: "Planets move in nearly circular orbits; comets move in long ellipses, fastest when closest to the Sun. Orbital speed = 2πr/T." },
      { lvl: "std", tag: "4PH1 8(b)", text: "Gravitational field strength g is different on different planets and moons. Weight = mass × g." },
      { lvl: "std", tag: "4PH1 Section 2", text: "There are two kinds of charge. Like charges repel; unlike charges attract." },
      { lvl: "adv", tag: "A level Eduqas", text: "Field strength is force per unit charge (or per unit mass). Point source: E = kQ/r², g = GM/r². Fields add as vectors." },
      { lvl: "adv", tag: "A level Eduqas", text: "Potential is energy per unit charge (or mass): V = kQ/r, V<sub>g</sub> = −GM/r. Potentials add as numbers. Field strength = −(potential gradient), so equipotentials are closest where the field is strongest and field lines cross them at right angles." },
      { lvl: "adv", tag: "A level Eduqas", text: "Circular orbit: GMm/r² = mv²/r, so v = √(GM/r) and T² = 4π²r³/GM (Kepler's third law). Escape speed = √(2GM/r)." },
      { lvl: "adv", tag: "A level Eduqas", text: "Total energy in orbit = kinetic + potential = −GMm/2r for a circular orbit. It is negative for any bound orbit and zero or more for escape." },
      { lvl: "beyond", tag: "Beyond the spec", text: "A Hohmann transfer is the cheapest two-burn route between circular orbits: half an ellipse that just touches both." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "State the force that keeps a satellite in orbit round the Earth, and the direction in which it acts.", ans: "<ul><li>Gravitational force (the satellite's weight)</li><li>towards the centre of the Earth</li></ul>" },
      { lvl: "std", marks: 3, q: "A satellite orbits the Earth in a circle of radius 42 200 km once every 24 hours. Calculate its orbital speed in km/s.", ans: "<ul><li>speed = 2πr/T</li><li>= 2 × π × 42 200 ÷ (24 × 3600)</li><li>= 3.07 km/s</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe how the speed of a comet changes during its orbit of the Sun, and explain why.", ans: "<ul><li>It is fastest when closest to the Sun and slowest when furthest away</li><li>As it approaches, gravitational potential energy is transferred to kinetic energy (the Sun's pull speeds it up)</li><li>As it moves away, kinetic energy is transferred back (the pull slows it down)</li></ul>" },
      { lvl: "std", marks: 2, q: "The gravitational field strength is 10 N/kg on Earth and 1.6 N/kg on the Moon. Calculate the weight of a 70 kg astronaut in each place.", ans: "<ul><li>Earth: 70 × 10 = 700 N</li><li>Moon: 70 × 1.6 = 112 N</li></ul>" },
      { lvl: "adv", marks: 3, q: "Calculate the electric field strength and the potential 5.0 cm from a point charge of +2.0 nC. (k = 8.99 × 10⁹ N m² C⁻²)", ans: "<ul><li>E = kQ/r² = 8.99 × 10⁹ × 2.0 × 10⁻⁹ ÷ 0.050² = 7190 V/m (7.2 kV/m), away from the charge</li><li>V = kQ/r = 8.99 × 10⁹ × 2.0 × 10⁻⁹ ÷ 0.050</li><li>= 360 V</li></ul>" },
      { lvl: "adv", marks: 4, q: "Show that the period of a satellite in a circular orbit of radius r round a planet of mass M is given by T² = 4π²r³/GM.", ans: "<ul><li>Gravity provides the centripetal force: GMm/r² = mv²/r</li><li>so v² = GM/r</li><li>v = 2πr/T, so 4π²r²/T² = GM/r</li><li>rearranging: T² = 4π²r³/GM</li></ul>" },
      { lvl: "adv", marks: 3, q: "Calculate the escape speed from the surface of the Earth. (GM = 3.99 × 10¹⁴ m³ s⁻², radius 6.37 × 10⁶ m)", ans: "<ul><li>½mv² = GMm/r, so v = √(2GM/r)</li><li>= √(2 × 3.99 × 10¹⁴ ÷ 6.37 × 10⁶)</li><li>= 1.12 × 10⁴ m/s (11.2 km/s)</li></ul>" },
      { lvl: "adv", marks: 3, q: "At the point midway between two equal positive charges the field strength is zero but the potential is not. Explain.", ans: "<ul><li>Field strength is a vector: the two fields there are equal in size and opposite in direction, so they cancel</li><li>Potential is a scalar: the two (positive) potentials add</li><li>The potential there is neither rising nor falling along the line (zero gradient), which is consistent with zero field</li></ul>" },
      { lvl: "adv", marks: 3, q: "A satellite in a circular orbit fires its engine briefly to speed up. Describe its new orbit and what happens to its total energy.", ans: "<ul><li>The orbit becomes an ellipse</li><li>with the point of the burn as its closest point (it climbs to a greater distance on the far side)</li><li>Its total energy increases (becomes less negative); if it reaches zero the satellite escapes</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Sources</b> are point charges or point masses. The field of each falls as 1/r² and the potential as 1/r; the fields of several sources are added as vectors and the potentials as numbers.</li>
<li><b>Colour</b> shows potential. <b>White curves</b> are equipotentials at equal steps of potential, so they crowd together where the field is strong. <b>Arrowed lines</b> are field lines; the moving streaks drift along the field direction.</li>
<li><b>Launched particles</b> are moved step by step: find the field where the particle is, change its velocity, move it, repeat ("leapfrog" integration with steps that shrink close to a source). Orbits are not taken from Kepler's formulas.</li>
<li><b>Electric scenes:</b> centimetres, nanocoulombs and microseconds. Ions have the mass of a proton and charge +e or −e.</li>
<li><b>Earth scenes:</b> real sizes, masses and times. <b>Sun scenes:</b> astronomical units and years; the planets start on circular orbits at their real average distances.</li>
<li><b>Tilted view:</b> height stands for potential, so masses and negative charges make wells and positive charges make hills.</li></ul>
<h3>Simplifications</h3>
<ul><li>Everything is in one flat plane. The field lines drawn are a slice through a three-dimensional pattern, so their spacing on screen only roughly shows field strength.</li>
<li>Launched particles do not affect the sources or each other, and charges do not radiate when accelerated.</li>
<li>The "plates" are two rows of 13 point charges, so the field between them is only approximately uniform and bulges at the ends.</li>
<li>Planets and the Earth are points with a surface to crash into: no atmosphere, no spin, no engines after launch.</li>
<li>Planet orbits are drawn as circles in one plane; real ones are slightly oval and tilted. Mercury's is noticeably oval.</li>
<li>The tilted landscape is cut off near each source, where the true potential plunges without limit.</li>
<li>Step-by-step calculation is never exact: over very many orbits small errors build up.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its spec notes, exam practice and worksheets, is still here: <a href="original/fields-orbits.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Electric fields");
let r1 = K.row(g); for (const [k, name] of [["charge", "One charge"], ["dipole", "+ and −"], ["like", "+ and +"], ["plates", "Plates"]]) K.btn(r1, name, () => set({ scene: k }));
g = ui.group("Gravitational fields");
r1 = K.row(g); for (const [k, name] of [["earth", "Earth"], ["moon", "Earth + Moon"], ["sun", "Sun"], ["binary", "Two stars"]]) K.btn(r1, name, () => set({ scene: k }));
g = ui.group("Your pointer");
ctl.tool = K.seg(g, { value: "launch", options: [["launch", "Launch"], ["move", "Move a source"], ["add", "Add"], ["del", "Remove"]], on: v => tool = v, tip: "Launch: drag to aim, release to let go. A dotted line predicts the path." });
ctl.ion = K.seg(g, { label: "Launch a", value: 1, options: [[1, "positive ion"], [-1, "negative ion"]], on: v => ion = v });
ctl.q = K.slider(g, { label: "Source to add", min: -5, max: 5, step: 0.5, value: 1, fmt: v => U === UNITS.E ? (v > 0 ? "+" : "") + v + " nC" : Math.abs(v || 0.5) + " " + U.srcU, on: v => newQ = v });
r1 = K.row(g); const burn = f => { const p = tracked(); if (p && !p.dead) { p.vx *= f; p.vy *= f; sectors = []; } };
K.btn(r1, "Engine burn: speed up 1%", () => burn(1.01)).title = "Fires the tracked object's engine forwards"; K.btn(r1, "slow down 1%", () => burn(1 / 1.01));
r1 = K.row(g); K.btn(r1, "Clear launched objects", () => { parts = []; elog = []; sectors = []; }); K.btn(r1, "Clear trails", () => { for (const p of parts) p.trail = []; });
g = ui.group("What to show");
for (const [k, label] of [["map", "Potential as colour"], ["equi", "Equipotentials"], ["lines", "Field lines"], ["flow", "Flowing field"], ["tilt", "Tilt: potential as a landscape"], ["sectors", "Equal-time sectors (Kepler's 2nd law)"]]) ctl[k] = K.toggle(g, { label, value: show[k], on: v => { show[k] = v; dirty = true; sectors = []; } });
ctl.zoom = K.slider(g, { label: "Zoom out", min: 0.4, max: 3, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => { view = SCENES[scene].view * v; dirty = true; resetTracers(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.1, max: 5, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => speedMul = v });
const read = K.readout(g, [["pp", "potential at pointer"], ["pf", "field at pointer"], ["r", "tracked: distance"], ["v", "tracked: speed"], ["vc", "circular speed there"], ["ve", "escape speed there"], ["orb", "orbit"], ["apo", "nearest · furthest point"], ["T", "period"]]);
function set(o) {
  if (o.scene) load(o.scene); ctl.zoom.set(1);
  for (const k of ["tilt", "sectors"]) { show[k] = !!o[k]; ctl[k].set(show[k]); } dirty = true;
}

// ---------------- Drawing ----------------
const GXN = 188, GYN = 96; let phi = new Float32Array((GXN + 1) * (GYN + 1)), layer = null, lctx = null, mapC = document.createElement("canvas"), flowC = document.createElement("canvas"), fctx = null, potCap = 1, step = 1;
mapC.width = GXN + 1; mapC.height = GYN + 1;
const cv = ui.canvas(c => { layer = document.createElement("canvas"); layer.width = c.w * c.dpr; layer.height = c.h * c.dpr; lctx = layer.getContext("2d"); lctx.scale(c.dpr, c.dpr); flowC.width = c.w; flowC.height = c.h; fctx = flowC.getContext("2d"); dirty = true; });
const sc = () => cv.w / view, X = x => cv.w / 2 + x * sc(), Y = y => cv.h / 2 - y * sc(), WX = px => (px - cv.w / 2) / sc(), WY = py => (cv.h / 2 - py) / sc();
// tilted view: the ground plane is squashed and height (potential) lifts points up the screen
const hgt = p => K.clamp(p / potCap, -1, 1) * cv.h * 0.3;
const TX = (x, y, p) => cv.w / 2 + x * sc() * 0.92, TY = (x, y, p) => cv.h * 0.44 - y * sc() * 0.42 - hgt(p);
const PX = (x, y, p) => show.tilt ? TX(x, y, p) : X(x), PY = (x, y, p) => show.tilt ? TY(x, y, p) : Y(y);
function resetTracers() { tracers = new Float32Array(900 * 3); for (let k = 0; k < 900; k++) { tracers[3 * k] = (Math.random() - .5) * view; tracers[3 * k + 1] = (Math.random() - .5) * view * cv.h / cv.w; tracers[3 * k + 2] = Math.random() * 80; } if (fctx) fctx.clearRect(0, 0, cv.w, cv.h); }
const colour = u => { const a = Math.pow(Math.abs(u), 0.6); return U === UNITS.E ? (u > 0 ? [20 + 225 * a, 22 + 90 * a * a, 40 + 20 * a] : [14 + 30 * a, 24 + 110 * a, 44 + 211 * a]) : [10 + 100 * a * a, 16 + 50 * a, 36 + 190 * a]; };
function rebuild() {   // recompute the potential on a grid and redraw the map, equipotentials and field lines (only when something has changed)
  const w = cv.w, h = cv.h, c = lctx, dx = view / GXN, dy = view * h / w / GYN, x0 = -view / 2, y0 = view * h / w / 2, Kc = U.K;
  let maxQ = 0, maxR = 0; for (const s of src) if (Math.abs(s.q) > maxQ) { maxQ = Math.abs(s.q); maxR = s.R || 0; } let sumQ = 0; for (const s of src) sumQ += Math.abs(s.q); potCap = Kc * Math.max(maxQ, sumQ / 10, 1e-6) / Math.max(view * 0.035, maxR * 0.85); step = potCap / 12;
  for (let j = 0, k = 0; j <= GYN; j++) for (let i = 0; i <= GXN; i++, k++) { const x = x0 + i * dx, y = y0 - j * dy; let p = 0; for (const s of src) p += Kc * s.q / Math.sqrt((x - s.x) ** 2 + (y - s.y) ** 2 + 1e-9); phi[k] = p; }
  c.clearRect(0, 0, w, h); c.fillStyle = "#060a14"; c.fillRect(0, 0, w, h);
  if (show.tilt) {   // the landscape: lines of the grid, lifted by the potential, drawn from the back to the front
    const el = U === UNITS.E, bucket = u => Math.min(5, Math.floor((el ? (u + 1) / 2 : -u) * 5.999));
    for (let j = 0; j <= GYN; j += 2) for (let b = 0; b < 6; b++) {
      c.strokeStyle = `rgb(${colour(el ? (b + .5) / 3 - 1 : -(b + .5) / 6).map(v => Math.round(Math.min(255, v * 1.5 + 30))).join()})`; c.lineWidth = 1; c.beginPath(); let pen = false;
      for (let i = 0; i <= GXN; i++) { const p = phi[j * (GXN + 1) + i]; if (bucket(K.clamp(p / potCap, -1, 1)) !== b) { pen = false; continue; } const x = x0 + i * dx, y = y0 - j * dy; if (!pen && i > 0) { const p2 = phi[j * (GXN + 1) + i - 1]; c.moveTo(TX(x - dx, y, p2), TY(x - dx, y, p2)); c.lineTo(TX(x, y, p), TY(x, y, p)); } else pen ? c.lineTo(TX(x, y, p), TY(x, y, p)) : c.moveTo(TX(x, y, p), TY(x, y, p)); pen = true; }
      c.stroke();
    }
    c.strokeStyle = "rgba(180,200,240,.16)"; c.beginPath(); for (let i = 0; i <= GXN; i += 4) for (let j = 0; j <= GYN; j++) { const p = phi[j * (GXN + 1) + i], x = x0 + i * dx, y = y0 - j * dy; j ? c.lineTo(TX(x, y, p), TY(x, y, p)) : c.moveTo(TX(x, y, p), TY(x, y, p)); } c.stroke(); return;
  }
  if (show.map) { const m = mapC.getContext("2d"), im = m.createImageData(GXN + 1, GYN + 1); for (let k = 0; k < phi.length; k++) { const rgb = colour(K.clamp(phi[k] / potCap, -1, 1)); im.data[4 * k] = rgb[0]; im.data[4 * k + 1] = rgb[1]; im.data[4 * k + 2] = rgb[2]; im.data[4 * k + 3] = 255; } m.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(mapC, 0.5, 0.5, GXN, GYN, 0, 0, w, h); }
  if (show.equi) {   // equipotentials by "marching squares": in each grid square, join the points on its edges where the potential crosses a level
    c.strokeStyle = "rgba(255,255,255,.42)"; c.lineWidth = 1; c.beginPath(); const cw = w / GXN, ch = h / GYN, W1 = GXN + 1;
    for (let j = 0; j < GYN; j++) for (let i = 0; i < GXN; i++) {
      const a = phi[j * W1 + i], b = phi[j * W1 + i + 1], d = phi[(j + 1) * W1 + i], e = phi[(j + 1) * W1 + i + 1], lo = Math.min(a, b, d, e), hi = Math.max(a, b, d, e); if (lo > potCap || hi < -potCap) continue;
      const off = U === UNITS.E ? 0 : 0.5; for (let L = Math.ceil(Math.max(lo, -potCap) / step - off); L <= Math.min(hi, potCap) / step - off; L++) { const v = (L + off) * step, pts = []; if (v < lo || v > hi) continue;
        if ((a - v) * (b - v) < 0) pts.push(i + (v - a) / (b - a), j); if ((b - v) * (e - v) < 0) pts.push(i + 1, j + (v - b) / (e - b)); if ((d - v) * (e - v) < 0) pts.push(i + (v - d) / (e - d), j + 1); if ((a - v) * (d - v) < 0) pts.push(i, j + (v - a) / (d - a));
        for (let q = 0; q + 3 < pts.length; q += 4) { c.moveTo(pts[q] * cw, pts[q + 1] * ch); c.lineTo(pts[q + 2] * cw, pts[q + 3] * ch); } }
    }
    c.stroke();
  }
  if (show.lines) {   // field lines: start close to each source and follow the direction of the field in small steps
    c.strokeStyle = U === UNITS.E ? "rgba(255,236,170,.8)" : "rgba(170,215,255,.7)"; c.fillStyle = c.strokeStyle; c.lineWidth = 1.2; const ds = view / 400, lim = view * 0.8;
    for (const s of src) { const nL = src.length > 8 ? 2 : Math.max(4, Math.round(12 * Math.abs(s.q) / maxQ)), dir = s.q > 0 ? 1 : -1;
      for (let q = 0; q < nL; q++) { const ang = (q + 0.5) / nL * 6.2832 + (src.length > 2 && nL > 2 ? 1.5708 : 0); let x = s.x + Math.cos(ang) * (s.R || view / 100) * 1.1, y = s.y + Math.sin(ang) * (s.R || view / 100) * 1.1, ended = false; const path = [x, y];
        for (let k = 0; k < 1400; k++) { fieldAt(src, Kc, x, y, _f); const m = Math.hypot(_f[0], _f[1]) || 1; x += dir * _f[0] / m * ds; y += dir * _f[1] / m * ds; path.push(x, y); if (Math.abs(x) > lim || Math.abs(y) > lim) break; let hit = false; for (const t of src) if (t !== s && Math.hypot(x - t.x, y - t.y) < (t.R || view / 100)) hit = true; if (hit) { ended = true; break; } }
        if (dir < 0 && ended) continue;                                                // this line was already drawn from its positive end
        c.beginPath(); for (let k = 0; k < path.length; k += 2) k ? c.lineTo(X(path[k]), Y(path[k + 1])) : c.moveTo(X(path[0]), Y(path[1])); c.stroke();
        for (const fr of [0.3, 0.7]) { const k = Math.min(path.length - 4, Math.floor(path.length / 2 * fr) * 2); if (k < 4) continue; const ax = X(path[k]), ay = Y(path[k + 1]), an = Math.atan2(Y(path[k + 3]) - ay, X(path[k + 2]) - ax) + (dir < 0 ? Math.PI : 0); c.beginPath(); c.moveTo(ax + Math.cos(an) * 6, ay + Math.sin(an) * 6); c.lineTo(ax + Math.cos(an + 2.5) * 5, ay + Math.sin(an + 2.5) * 5); c.lineTo(ax + Math.cos(an - 2.5) * 5, ay + Math.sin(an - 2.5) * 5); c.fill(); } } }
  }
}
function drawFlow() {   // hundreds of specks that drift along the direction of the field, leaving short fading streaks
  const c = fctx, w = cv.w, h = cv.h, hh = view * h / w / 2; c.globalCompositeOperation = "destination-out"; c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(0, 0, w, h); c.globalCompositeOperation = "source-over";
  c.strokeStyle = U === UNITS.E ? "rgba(255,245,210,.5)" : "rgba(200,230,255,.22)"; c.lineWidth = 1; c.beginPath(); const d = view / 700;
  for (let k = 0; k < 900; k++) { let x = tracers[3 * k], y = tracers[3 * k + 1]; fieldAt(src, U.K, x, y, _f); const m = Math.hypot(_f[0], _f[1]) || 1, nx = x + _f[0] / m * d, ny = y + _f[1] / m * d; c.moveTo(X(x), Y(y)); c.lineTo(X(nx), Y(ny)); let dead = --tracers[3 * k + 2] < 0 || Math.abs(nx) > view / 2 || Math.abs(ny) > hh; for (const s of src) if (Math.hypot(nx - s.x, ny - s.y) < (s.R || view / 120)) dead = true;
    if (dead) { tracers[3 * k] = (Math.random() - .5) * view; tracers[3 * k + 1] = (Math.random() - .5) * 2 * hh; tracers[3 * k + 2] = 40 + Math.random() * 80; } else { tracers[3 * k] = nx; tracers[3 * k + 1] = ny; } }
  c.stroke();
}
let aim = null, grabS = null;
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, moving = src.some(s => s.free) && ui.playing;
  if (dirty || moving) { rebuild(); dirty = false; }
  c.drawImage(layer, 0, 0, w, h);
  if (show.flow && !show.tilt) { if (ui.playing) drawFlow(); c.drawImage(flowC, 0, 0); }
  const pot = (x, y) => fieldAt(src, U.K, x, y, _f)[2];
  // Kepler's second law: wedges swept in equal times
  if (show.sectors && sectors.length > 1 && src.length) { const s0 = src[0], cx = PX(s0.x, s0.y, -potCap), cy = PY(s0.x, s0.y, -potCap); let k0 = 0;
    for (let k = 1; k <= sectors.length; k++) if (k === sectors.length || sectors[k].k !== sectors[k0].k) { c.fillStyle = sectors[k0].k % 2 ? "rgba(255,210,120,.3)" : "rgba(120,200,255,.3)"; c.beginPath(); c.moveTo(cx, cy); for (let q = Math.max(0, k0 - 1); q < k; q++) c.lineTo(PX(sectors[q].x, sectors[q].y, sectors[q].p), PY(sectors[q].x, sectors[q].y, sectors[q].p)); c.fill(); k0 = k; } }
  // trails and launched objects
  parts.forEach((p, i) => { const col = p.qm < 0 ? "#7fd0ff" : U === UNITS.E ? "#ffb070" : ["#ffe08a", "#9be7a5", "#ff9fb5", "#b9a6ff", "#8fe3ff"][i % 5]; c.strokeStyle = col; c.lineWidth = 1.5; c.globalAlpha = .8; c.beginPath(); for (let k = 0; k < p.trail.length; k += 3) k ? c.lineTo(PX(p.trail[k], p.trail[k + 1], p.trail[k + 2]), PY(p.trail[k], p.trail[k + 1], p.trail[k + 2])) : c.moveTo(PX(p.trail[0], p.trail[1], p.trail[2]), PY(p.trail[0], p.trail[1], p.trail[2])); c.stroke(); c.globalAlpha = 1;
    if (p.dead) return; const pp = pot(p.x, p.y), sx = PX(p.x, p.y, pp), sy = PY(p.x, p.y, pp); c.fillStyle = col; c.beginPath(); c.arc(sx, sy, 4.5, 0, 6.3); c.fill(); c.strokeStyle = "#0008"; c.stroke(); if (p === tracked()) { c.strokeStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(sx, sy, 9, 0, 6.3); c.stroke(); } if (p.name) { c.fillStyle = "#dfe8f7"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(p.name, sx + 9, sy - 7); } });
  // the sources
  for (const s of src) { const cap = K.clamp(pot(s.x + (s.R || view / 100), s.y), -potCap, potCap), sx = PX(s.x, s.y, cap), sy = PY(s.x, s.y, cap), rr = Math.max(U === UNITS.E ? 7 : 4, (s.R || 0) * sc() * (show.tilt ? 0.6 : 1));
    const gr = c.createRadialGradient(sx - rr * .3, sy - rr * .3, 1, sx, sy, rr); if (U === UNITS.E) { gr.addColorStop(0, s.q > 0 ? "#ffd0b0" : "#b8dcff"); gr.addColorStop(1, s.q > 0 ? "#e2452f" : "#2f6fe2"); } else if (s.name === "Earth") { gr.addColorStop(0, "#8fd0ff"); gr.addColorStop(1, "#1f5fb8"); } else if (s.name === "Moon") { gr.addColorStop(0, "#eee"); gr.addColorStop(1, "#888"); } else { gr.addColorStop(0, "#fffbe0"); gr.addColorStop(1, "#ffb030"); }
    c.fillStyle = gr; c.beginPath(); c.arc(sx, sy, rr, 0, 6.3); c.fill(); if (U === UNITS.E && rr > 6) { c.fillStyle = "#fff"; c.font = "bold 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s.q > 0 ? "+" : "−", sx, sy + .5); c.textBaseline = "alphabetic"; } else if (s.name) { c.fillStyle = "#dfe8f7"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(s.name, sx + rr + 5, sy + 4); } }
  // aiming: an arrow, the launch speed and a dotted prediction of the path
  if (aim && !show.tilt) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(aim.x), Y(aim.y)); c.lineTo(aim.px, aim.py); c.stroke(); const p = launchState(); c.setLineDash([2, 5]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(p.x), Y(p.y)); const dtp = rate / 25; for (let k = 0; k < 500; k++) { if (!advance(p, src, U.K, dtp)) break; c.lineTo(X(p.x), Y(p.y)); if (Math.abs(p.x) > view || Math.abs(p.y) > view) break; } c.stroke(); c.setLineDash([]);
    const sp = Math.hypot(aim.vx, aim.vy); c.fillStyle = "#fff"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(U.spd(sp).toFixed(1) + " " + U.spdU, aim.px + 10, aim.py - 8); }
  // the probe at the pointer: an arrow showing the direction and size of the field
  if (probe && !aim && !show.tilt) { fieldAt(src, U.K, probe.x, probe.y, _f); const m = Math.hypot(_f[0], _f[1]), L = 14 + 26 * Math.min(1, m / (potCap / (view * 0.035) * 0.5)), ax = X(probe.x), ay = Y(probe.y), bx = ax + _f[0] / m * L, by = ay - _f[1] / m * L, an = Math.atan2(by - ay, bx - ax); c.strokeStyle = c.fillStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.beginPath(); c.moveTo(bx + Math.cos(an) * 5, by + Math.sin(an) * 5); c.lineTo(bx + Math.cos(an + 2.4) * 7, by + Math.sin(an + 2.4) * 7); c.lineTo(bx + Math.cos(an - 2.4) * 7, by + Math.sin(an - 2.4) * 7); c.fill(); }
  const bar = [1, 2, 5, 10, 20, 50, 100, 200, 500].map(v => v * (U === UNITS.SUN ? 0.1 : 1)).find(v => v * sc() > 70) || 1; c.strokeStyle = c.fillStyle = "rgba(220,228,245,.8)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(16, h - 16); c.lineTo(16 + bar * sc() * (show.tilt ? .92 : 1), h - 16); c.stroke(); c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(bar + " " + U.len, 16, h - 22);
}
function launchState() { return { x: aim.x, y: aim.y, vx: aim.vx, vy: aim.vy, qm: U === UNITS.E ? U.qm * ion : 1, trail: [] }; }
K.pointer(cv.el, {
  hover(p) { probe = { x: WX(p.x), y: WY(p.y) }; },
  leave() { probe = null; },
  down(p) {
    const x = WX(p.x), y = WY(p.y); if (show.tilt) { ui.tip("Switch off the tilt to launch or move things", 3000); return; }
    let near = null, nd = 18 / sc(); for (const s of src) { const d = Math.hypot(s.x - x, s.y - y) - (s.R || 0); if (d < nd) { nd = d; near = s; } }
    if (tool === "move" && near) grabS = near; else if (tool === "del") { if (near && src.length > 1) { src.splice(src.indexOf(near), 1); dirty = true; } }
    else if (tool === "add") { if (src.length < 40) { src.push({ x, y, q: U === UNITS.E ? (newQ || 1) : -Math.abs(newQ || 0.5), R: U === UNITS.E ? 0.5 : src[0] ? src[0].R * 0.7 : 1, name: "" }); dirty = true; } }
    else if (tool === "launch") aim = { x, y, px: p.x, py: p.y, vx: 0, vy: 0 };
  },
  drag(p) {
    if (grabS) { grabS.x = WX(p.x); grabS.y = WY(p.y); dirty = true; }
    if (aim) { aim.px = p.x; aim.py = p.y; const k = (U === UNITS.E ? 60 : vCirc(U.K, Math.abs(src[0] ? src[0].q : 1), view * 0.12) * 3) / (cv.w * 0.25); aim.vx = (p.x - X(aim.x)) * k; aim.vy = -(p.y - Y(aim.y)) * k; }
  },
  up() { grabS = null; if (aim) { if (parts.length >= 12) parts.shift(); parts.push(launchState()); elog = []; sectors = []; secT = tSim; aim = null; } }
});
const chE = K.chart(ui.dock, { title: "Energy of the tracked object", xLabel: "time", yLabel: "energy" });
const chF = K.chart(ui.dock, { title: "Field strength", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  const T = rate * speedMul * Math.max(dt, 1 / 120); if (src.some(s => s.free)) moveSources(src, U.K, T); tSim += T;
  for (const p of parts) { if (p.dead) continue; if (!advance(p, src, U.K, T)) { p.dead = true; continue; } const pp = fieldAt(src, U.K, p.x, p.y, _f)[2]; p.trail.push(p.x, p.y, pp); if (p.trail.length > 3600) p.trail.splice(0, 3); if (Math.hypot(p.x, p.y) > view * 6) p.dead = true; }
  const p = tracked(); if (p && !p.dead && frame % 3 === 0) { const pp = fieldAt(src, U.K, p.x, p.y, _f)[2], ke = (p.vx * p.vx + p.vy * p.vy) / 2, pe = p.qm * pp, f = U === UNITS.E ? 1 / (U.qm * 100) : U.pot(1); elog.push([tSim, ke * f, pe * f, (ke + pe) * f]); if (elog.length > 700) elog.shift(); }
  if (p && !p.dead && show.sectors) {   // remember the tracked object's recent path, tagged with which equal-time slice each point belongs to
    if (!sectors.length) { secT = tSim; sectors.gap = (orbitOf(p).T || rate * 24) / 12; }
    const pp = fieldAt(src, U.K, p.x, p.y, _f)[2], k = Math.floor((tSim - secT) / sectors.gap); sectors.push({ x: p.x, y: p.y, p: pp, k }); while (sectors.length && sectors[0].k < k - 11) sectors.shift();
  }
}, () => {
  draw(); if (frame++ % 6) return;
  const p = tracked(), eu = U === UNITS.E ? "eV" : "MJ/kg";
  chE.draw([{ pts: elog.map(q => [q[0], q[1]]), color: K.cssVar("--s1"), label: "kinetic" }, { pts: elog.map(q => [q[0], q[2]]), color: K.cssVar("--s0"), label: "potential" }, { pts: elog.map(q => [q[0], q[3]]), color: K.cssVar("--s2"), label: "total", width: 2.4 }], { xLabel: "time (" + U.time + ")", yLabel: "energy (" + eu + ")" });
  // field strength along the line from the first source out through the pointer
  if (src.length) { const s0 = src[0], ang = probe ? Math.atan2(probe.y - s0.y, probe.x - s0.x) : 0, pts = [], th = [], r0 = (s0.R || view / 100) * 1.05, r1 = view * 0.6; for (let k = 0; k <= 80; k++) { const r = r0 + (r1 - r0) * k / 80; fieldAt(src, U.K, s0.x + Math.cos(ang) * r, s0.y + Math.sin(ang) * r, _f); pts.push([r, U.fld(Math.hypot(_f[0], _f[1]))]); th.push([r, U.fld(U.K * Math.abs(s0.q) / (r * r))]); }
    const pr = probe ? Math.hypot(probe.x - s0.x, probe.y - s0.y) : null; chF.draw([{ pts, color: K.cssVar("--s0"), label: "along the line to your pointer", width: 2.2 }, { pts: th, color: K.cssVar("--s1"), dash: [5, 4], label: "first source alone (1/r²)" }], { xLabel: "distance from the first source (" + U.len + ")", yLabel: U.fldName + " (" + U.fldU + ")", yMax: th[6][1] * 1.1, vlines: pr ? [{ x: pr, label: "pointer" }] : [] }); }
  if (probe) { fieldAt(src, U.K, probe.x, probe.y, _f); read.set("pp", K.sig(U.pot(_f[2]), 3) + " " + U.potU); read.set("pf", K.sig(U.fld(Math.hypot(_f[0], _f[1])), 3) + " " + U.fldU); }
  if (p && !p.dead && src.length) { const o = orbitOf(p); read.set("r", K.sig(o.r, 3) + " " + U.len); read.set("v", K.sig(U.spd(Math.hypot(p.vx, p.vy)), 3) + " " + U.spdU);
    if (U !== UNITS.E) { read.set("vc", K.sig(U.spd(vCirc(U.K, o.m, o.r)), 3) + " " + U.spdU); read.set("ve", K.sig(U.spd(vEsc(U.K, o.m, o.r)), 3) + " " + U.spdU); read.set("orb", o.e < 0 ? (o.ecc < 0.03 ? "circle" : "ellipse, e = " + o.ecc.toFixed(2)) : "escaping"); read.set("T", o.T ? fmtT(o.T) : "never returns"); read.set("apo", o.a ? K.sig(o.a * (1 - o.ecc), 3) + " · " + K.sig(o.a * (1 + o.ecc), 3) + " " + U.len : K.sig(o.r, 3) + " · never returns"); } else for (const k of ["vc", "ve", "orb", "apo", "T"]) read.set(k, "–"); }
  else for (const k of ["r", "v", "vc", "ve", "orb", "apo", "T"]) read.set(k, p && p.dead ? "gone" : "–");
  let hud = `<b style="font-size:14px">${fmtT(tSim)}</b>`; if (probe && !show.tilt) { fieldAt(src, U.K, probe.x, probe.y, _f); hud += `<br>at the pointer: ${U.fldName} = ${K.sig(U.fld(Math.hypot(_f[0], _f[1])), 3)} ${U.fldU}<br>potential ${K.sig(U.pot(_f[2]), 3)} ${U.potU}`; } ui.hud(hud);
});
const fmtT = t => U === UNITS.G ? (t < 120 ? t.toFixed(0) + " min" : t < 2880 ? (t / 60).toFixed(1) + " hours" : (t / 1440).toFixed(1) + " days") : U === UNITS.SUN ? t.toFixed(2) + " years" : t.toFixed(2) + " µs";
// the orbit a launched object is on, worked out from its energy relative to the heaviest source (Kepler's laws)
function orbitOf(p) {
  let s0 = src[0]; for (const s of src) if (Math.abs(s.q) > Math.abs(s0.q)) s0 = s; const m = Math.abs(s0.q), dx = p.x - s0.x, dy = p.y - s0.y, r = Math.hypot(dx, dy), vx = p.vx - (s0.vx || 0), vy = p.vy - (s0.vy || 0), e = (vx * vx + vy * vy) / 2 - U.K * m / r, L = dx * vy - dy * vx;
  const a = e < 0 ? -U.K * m / (2 * e) : null; return { r, m, e, a, T: a ? 2 * Math.PI * Math.sqrt(a * a * a / (U.K * m)) : null, ecc: Math.sqrt(Math.max(0, 1 + 2 * e * L * L / (U.K * m) ** 2)) };
}
load("earth"); set({ scene: "earth" });
ui.tip("Drag anywhere to launch a satellite · the dotted line predicts its path", 8000);
