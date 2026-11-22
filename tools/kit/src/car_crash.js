/* =====================================================================
   CAR CRASH SAFETY
   In a crash the car and the people in it must lose all their momentum.
   The force needed depends on how quickly that happens:
       force = change in momentum ÷ time        (F = Δp ÷ Δt)
       force × distance = kinetic energy lost   (F d = ½ m v²)
   So anything that makes the stop LONGER (in time or distance) makes the
   force SMALLER: a crumple zone, a seatbelt that stretches, an airbag.

   Every part obeys F = m a, stepped forward every 0.02 ms:
     * the car body, whose front crushes at a set force until the crumple
       zone is used up, then the stiff passenger cell
     * the occupant's torso, held back by the seatbelt
     * the head, on a springy neck, caught by the airbag (or the wheel!)
   Second view: a collisions lab for momentum and kinetic energy.
   ===================================================================== */
const G0 = 9.81, DT = 0.00002;
const CARS = { small: { name: "small car", m: 1000, L: 0.55 }, family: { name: "family car", m: 1400, L: 0.65 }, suv: { name: "SUV", m: 2200, L: 0.7 }, lorry: { name: "lorry", m: 18000, L: 0.3 } };
const mph = v => v * 0.44704;
/* One crash. o = { v (mph), target: "wall" | "parked" | "oncoming", car, other, crumple (m), F (crush force, kN; 0 = designed for the speed),
   belt: "none" | "belt" | "pre" (pretensioner + load limiter), slack (m), bag (airbag on), bagT (ms after impact it fires), occ (kg), gap (m to the wheel) } */
function crash(o) {
  const v0 = mph(o.v), m1 = CARS[o.car].m, L1 = o.crumple, m2 = o.target === "wall" ? Infinity : CARS[o.other].m, L2 = o.target === "wall" ? 0 : CARS[o.other].L;
  const F1 = (o.F ? o.F * 1000 : 0.5 * m1 * mph(35) ** 2 / Math.max(0.05, 0.85 * L1)) || 1e9, F2 = 0.5 * (m2 === Infinity ? 1 : m2) * mph(35) ** 2 / Math.max(0.05, 0.85 * L2);   // a crumple zone is designed to stop its own car from about 35 mph
  const KCELL = 30e6, mo = o.occ, mh = 4.5, mt = mo - mh;
  let x1 = 0, v1 = v0, x2 = 0, v2 = o.target === "oncoming" ? -v0 : 0, c1 = 0, c2 = 0, xt = 0, vt = v0, xh = 0, vh = v0, t = 0, contact = true;
  const out = [], hg = []; let peakT = 0, peakH = 0, peakC = 0, crush = 0, tStop = null, slack = o.belt === "pre" ? 0.005 : o.slack, bagFire = o.bagT / 1000;
  for (let k = 0; k < 15000; k++) {
    // --- the cars: the softer front crushes first, at its crush force; once the crumple zone is used up, the passenger cell is very stiff
    let F = 0; const dd = (v1 - v2) * DT;
    if (contact && dd > 0) {
      if (c1 < L1 && (F1 <= F2 || c2 >= L2)) { c1 += dd; F = F1; } else if (c2 < L2) { c2 += dd; F = F2; }
      else { c1 += dd; F = Math.max(F1, F2) + KCELL * (c1 - L1); }
      F *= Math.min(1, (c1 + c2) / 0.02);      // the force builds up over the first 2 cm
    } else if (k > 10) contact = false;          // the cars have stopped closing: no spring-back
    const a1 = -F / m1; v1 += a1 * DT; x1 += v1 * DT; if (m2 !== Infinity) { v2 += F / m2 * DT; x2 += v2 * DT; }
    // --- the occupant's torso, relative to the car: the seatbelt pulls back once the slack is taken up
    if (o.belt === "pre" && t > 0.012) slack = 0;
    const rt = xt - x1, rh = xh - x1, rvt = vt - v1, rvh = vh - v1;
    let Fb = 0; if (o.belt !== "none" && rt > slack) { Fb = 120000 * (rt - slack) + 1500 * Math.max(0, rvt); if (o.belt === "pre") Fb = Math.min(Fb, 6000); }      // belt stretches; a load limiter caps the force
    let Fw = rt > o.gap ? 4e5 * (rt - o.gap) + 3000 * Math.max(0, rvt) : 0;                                                                                          // chest hits the steering wheel: hard
    // airbag: fills in 30 ms after it fires; a soft vented cushion for the head and chest
    const fill = o.bag ? K.clamp((t - bagFire) / 0.03, 0, 1) : 0, bagFace = o.gap - 0.35 * fill;
    let Fbc = 0, Fbh = 0; if (fill > 0) { if (rt > bagFace + 0.15) Fbc = Math.min(5000, 60000 * (rt - bagFace - 0.15)); if (rh > bagFace) Fbh = Math.min(1300 * (fill < 1 ? 1.8 : 1), 20000 * (rh - bagFace) + 300 * Math.max(0, rvh)); }
    let Fhw = !o.bag || fill < 0.3 ? (rh > o.gap + 0.08 ? 3e5 * (rh - o.gap - 0.08) + 1500 * Math.max(0, rvh) : 0) : 0;                                            // head hits the wheel or windscreen
    const Fn = 9000 * (rh - rt) + 150 * (rvh - rvt);                                                                                                                 // the neck pulls the head back towards the torso
    const at = (-Fb - Fw - Fbc + Fn) / mt, ah = (-Fbh - Fhw - Fn) / mh;
    vt += at * DT; xt += vt * DT; vh += ah * DT; xh += vh * DT; t += DT;
    if (k % 25 === 0) { out.push({ t, x1, v1, x2, v2, c1, c2, rt, rh, a1: -a1 / G0, at: -at / G0, ah: -ah / G0, fill, Fb, F }); hg.push(-ah / G0); }
    peakT = Math.max(peakT, -at / G0); peakH = Math.max(peakH, -ah / G0); peakC = Math.max(peakC, -a1 / G0); crush = Math.max(crush, c1);
    if (tStop == null && !contact) tStop = t;
  }
  // head injury criterion (HIC15): the worst (t2 − t1) × (mean head g)^2.5 over windows up to 15 ms
  let hic = 0; const dtS = 25 * DT, cum = [0]; for (const g of hg) cum.push(cum[cum.length - 1] + Math.max(0, g) * dtS);
  for (let i = 0; i < hg.length; i += 2) for (let j = i + 2; j <= Math.min(hg.length, i + 30); j += 2) { const T = (j - i) * dtS, a = (cum[j] - cum[i]) / T; hic = Math.max(hic, T * Math.pow(a, 2.5)); }
  const risk = 0.5 * (1 + erf((Math.log(Math.max(1, hic)) - 7.45) / 0.74 / Math.SQRT2));
  return { out, peakT, peakH, peakC, crush, hic, risk, tStop: tStop || t, v0, m1, m2, vEnd: out[out.length - 1].v1, F1 };
}
function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); }

// ---- collisions lab: two trolleys on a track ----
function collide(m1, m2, u1, u2, e) { const p = m1 * u1 + m2 * u2; return [(p + m2 * e * (u2 - u1)) / (m1 + m2), (p + m1 * e * (u1 - u2)) / (m1 + m2)]; }   // momentum conserved; Newton's law of restitution

// ---------------- The page ----------------
const P = { mode: "crash", v: 30, target: "wall", car: "family", other: "family", crumple: 0.65, F: 0, belt: "belt", slack: 0.05, bag: true, bagT: 10, occ: 75, gap: 0.45, m1: 2, m2: 1, u1: 3, u2: 0, e: 1, boom: false, E: 5 };
let R = null, t = 0, speed = 0.05, kept = [], lab = null;
const ui = K.app({
  title: "Car Crash Safety and Collisions", subject: "Engineering",
  blurb: "Crumple zones, seatbelts and airbags: momentum, impulse and force in slow motion",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 1(c) forces and motion: momentum = mass × velocity, conservation of momentum, force = rate of change of momentum, and how crumple zones, seatbelts and airbags reduce forces; stopping distances; kinetic energy.", adv: "WJEC Eduqas A level Physics Component 1 (Dynamics): impulse as area under a force–time graph, conservation of momentum, elastic and inelastic collisions, kinetic energy changes; restitution (beyond the spec)." } },
  missions: [
    { title: "Why crumple?", q: "Crash a family car into a wall at 30 mph with a rigid front (crumple zone 5 cm), then with the full crumple zone. Compare the car's deceleration and the force on the dummy.", hint: "The car has the same momentum and kinetic energy to lose either way. Crushing over 65 cm instead of 5 cm makes the stop take about ten times longer and go ten times further, so the force (Δp ÷ Δt, or KE ÷ distance) is about ten times smaller. The front is designed to be destroyed so the people are not.", setup() { set({ crumple: 0.05 }); runNow(); kept.push({ R, label: "rigid front" }); P.crumple = 0.65; ctl.crumple.set(0.65); runNow(); } },
    { title: "No seatbelt", q: "Take the seatbelt off (and the airbag). What happens to the dummy? Look at the peak g on the chest and head.", hint: "The car stops in about 0.1 s but the dummy carries on at 30 mph until it hits the steering wheel and windscreen, which stop it in a few centimetres: hundreds of g. The seatbelt starts slowing the occupant early and spreads the stop over the whole crumple time.", setup() { set({ belt: "none", bag: false }); } },
    { title: "Seatbelt and airbag", q: "Compare a seatbelt only with a seatbelt and airbag. What does the airbag do for the head?", hint: "A belt holds the torso but the head flings forward on the neck and can hit the wheel. The airbag catches the head over a longer distance, so the head injury criterion (HIC) falls. In this model the belt alone just stops the head reaching the wheel at 30 mph; at higher speeds or with slack it does not, and the airbag matters far more.", setup() { set({ bag: false }); runNow(); kept.push({ R, label: "belt only" }); P.bag = true; ctl.bag.set(true); runNow(); } },
    { title: "A loose belt", q: "Give the belt 20 cm of slack (a thick coat, or a belt worn loose). Why is it worse than a tight belt?", hint: "Until the slack is taken up the occupant keeps moving while the car slows, so they hit the belt late and fast, with less distance left to stop in: a higher peak force. Pretensioners pull the belt tight in the first few milliseconds for exactly this reason.", setup() { set({ slack: 0.2 }); } },
    { title: "Speed kills", q: "Crash at 20, 30 and 40 mph (keep each). How do the crush distance and the forces change? Why does 40 mph do so much more damage than 30?", hint: "Kinetic energy goes as v², so 40 mph has 1.8 times the energy of 30 mph, and 20 mph less than half. The crumple zone crushes about v² further; once it is used up, the stiff passenger cell takes the rest and the forces jump. This is why 20 mph zones save lives.", setup() { set({ v: 20 }); runNow(); kept.push({ R, label: "20 mph" }); P.v = 30; runNow(); kept.push({ R, label: "30 mph" }); P.v = 40; ctl.v.set(40); runNow(); } },
    { title: "Small car meets SUV", q: "A small car and an SUV crash head-on, each at 30 mph. Which car's occupant has the harder time, and why?", hint: "Momentum is shared: the pair ends up moving in the SUV's direction, so the small car's speed changes by much more (Δv = closing speed × m_SUV ÷ (m_small + m_SUV)). Same force on both (Newton's third law), but the small car has less mass, so more deceleration.", setup() { set({ target: "oncoming", car: "small", other: "suv" }); } },
    { title: "Collisions lab: momentum is conserved", q: "In the lab, send a 2 kg trolley at 3 m/s into a 1 kg trolley at rest. Try elastic (e = 1), then sticky (e = 0). Is momentum conserved? Is kinetic energy?", hint: "Momentum is conserved in every collision: 6 kg m/s before and after. Kinetic energy is conserved only in an elastic collision; when they stick, a third of the KE (here) becomes heat, sound and deformation.", setup() { set({ mode: "lab" }); } },
    { lvl: "adv", title: "Explosions", q: "Set the trolleys together at rest and release a spring with 5 J. What are the momenta afterwards? Which trolley gets more of the energy?", hint: "Total momentum was zero and stays zero: equal and opposite momenta. Kinetic energy = p² ÷ 2m, so the lighter trolley gets more of the energy. That is why a gun recoils slowly but the bullet flies fast.", setup() { set({ mode: "lab", boom: true }); } }
  ],
  batch: [
    { title: "Crumple length and deceleration", question: "How does the length of the crumple zone change the car's average deceleration in a 30 mph wall crash?", how: "Family car, crush force designed for the zone; crumple zone 10 to 90 cm; crash speed ±2%. Theory: average deceleration = v² ÷ 2d (d = crush distance).", xLabel: "crumple zone (cm)", yLabel: "average deceleration (g)", xs: [10, 20, 30, 45, 60, 75, 90], reps: 3, yMin: 0, theory: x => mph(30) ** 2 / (2 * 0.85 * x / 100 * (30 / 35) ** 2) / G0 / 1, theoryLabel: "v² ÷ 2d", run: (x, r) => { const q = crash(Object.assign({}, P, { mode: "crash", target: "wall", car: "family", crumple: x / 100, F: 0, v: 30 * (1 + 0.02 * r.gauss()) })); return q.v0 / q.tStop / G0; }, note: "Double the crumple length and the deceleration halves: the same speed is lost over twice the distance and time." },
    { title: "Speed and crush distance", question: "How far does the front crush in a wall crash at different speeds (fixed crush force)?", how: "Family car with a 140 kN crush force and a 90 cm crumple zone; 10 to 40 mph. Theory: F d = ½ m v², so d = m v² ÷ 2F.", xLabel: "impact speed (mph)", yLabel: "crush distance (cm)", xs: [10, 15, 20, 25, 30, 35, 40], reps: 3, yMin: 0, theory: x => 100 * 1400 * mph(x) ** 2 / (2 * 140000), theoryLabel: "½mv² ÷ F", run: (x, r) => 100 * crash(Object.assign({}, P, { target: "wall", car: "family", crumple: 0.9, F: 140 * (1 + 0.03 * r.gauss()), v: x })).crush, note: "Crush distance grows as v²: twice the speed, four times the crush. At high speed the zone runs out and the passenger cell takes the rest." },
    { title: "Belt slack and chest deceleration", question: "How does slack in the seatbelt change the peak deceleration of the occupant's chest?", how: "30 mph wall crash, family car, airbag on; belt slack 0 to 25 cm; occupant 60–90 kg.", xLabel: "belt slack (cm)", yLabel: "peak chest deceleration (g)", xs: [0, 5, 10, 15, 20, 25], reps: 3, yMin: 0, run: (x, r) => crash(Object.assign({}, P, { target: "wall", belt: "belt", slack: x / 100, occ: 75 + 8 * r.gauss() })).peakT, note: "The looser the belt, the later and harder the occupant meets it." },
    { title: "Airbag timing", question: "How does the moment the airbag fires change the head injury criterion?", how: "30 mph wall crash, seatbelt on; airbag fires 5 to 60 ms after impact; occupant 60–90 kg.", xLabel: "airbag fires after (ms)", yLabel: "HIC₁₅", xs: [5, 10, 15, 20, 30, 40, 50, 60], reps: 3, yMin: 0, run: (x, r) => crash(Object.assign({}, P, { target: "wall", bagT: x, occ: 75 + 8 * r.gauss() })).hic, note: "Fired early, the bag is full when the head arrives. Too late and the head meets a bag still bursting out, or the wheel." },
    { title: "Mass and Δv in a head-on crash", question: "In a head-on crash at 30 mph each, how much does a family car's speed change against vehicles of different mass?", how: "Family car (1400 kg) against small car, family car, SUV, lorry. Theory (momentum): Δv = closing speed × m₂ ÷ (m₁ + m₂).", xLabel: "other vehicle's mass (tonnes)", yLabel: "family car's Δv (mph)", xs: [1, 1.4, 2.2, 18], reps: 2, yMin: 0, theory: m => 60 * m * 1000 / (1400 + m * 1000), theoryLabel: "momentum", run: (x, r) => { const other = { 1: "small", 1.4: "family", 2.2: "suv", 18: "lorry" }[x], q = crash(Object.assign({}, P, { target: "oncoming", car: "family", other, v: 30 * (1 + 0.01 * r.gauss()) })); return (q.v0 - q.vEnd) / 0.44704; }, note: "Against a lorry, the car's speed changes by nearly 60 mph: the full closing speed. Against a lighter car it changes by less than 30." },
    { lvl: "adv", title: "Kinetic energy kept in a collision", question: "What fraction of the kinetic energy is kept when a 2 kg trolley at 3 m/s hits a 1 kg trolley at rest?", how: "Coefficient of restitution e from 0 (stick together) to 1 (elastic); small random errors in the measured speeds. Theory: KE after ÷ KE before.", xLabel: "coefficient of restitution e", yLabel: "KE kept (%)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 4, yMin: 0, yMax: 105, theory: e => { const [a, b] = collide(2, 1, 3, 0, e); return 100 * (2 * a * a + b * b) / 18; }, run: (x, r) => { const [a, b] = collide(2, 1, 3, 0, x).map(v => v * (1 + 0.01 * r.gauss())); return 100 * (2 * a * a + b * b) / 18; }, note: "Momentum is always kept; kinetic energy only when e = 1. The loss is ½ μ u² (1 − e²), with μ the reduced mass." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 1.29", text: "Momentum = mass × velocity (kg m/s). In a collision or explosion the total momentum is conserved (if no external force acts)." },
      { lvl: "std", tag: "4PH1 1.31", text: "Force = change in momentum ÷ time taken. Increasing the time of a collision reduces the force." },
      { lvl: "std", tag: "4PH1 1.32", text: "Crumple zones, seatbelts and airbags increase the time (and distance) over which people slow down, so the forces on them are smaller." },
      { lvl: "std", tag: "4PH1 4.4", text: "Kinetic energy = ½ m v². Doubling the speed quadruples the energy the crumple zone must absorb: work done = force × distance." },
      { lvl: "adv", tag: "Eduqas 1.3", text: "Impulse = F Δt = Δp = area under the force–time graph." },
      { lvl: "adv", tag: "Eduqas 1.3", text: "Elastic collisions conserve kinetic energy; inelastic ones do not (energy becomes heat, sound, deformation). Momentum is conserved in both." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Head injury criterion HIC₁₅ combines how hard and how long the head decelerates; above about 700 the risk of serious injury is substantial." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Calculate the momentum of a ${CARS[P.car].m} kg car travelling at ${mph(P.v).toFixed(1)} m/s (${P.v} mph).`, ans: () => `<ul><li>p = m v = ${CARS[P.car].m} × ${mph(P.v).toFixed(1)}</li><li>= ${Math.round(CARS[P.car].m * mph(P.v))} kg m/s</li></ul>` },
      { lvl: "std", marks: 3, q: () => `In the crash the car stopped from ${mph(P.v).toFixed(1)} m/s in ${R ? (R.tStop * 1000).toFixed(0) : "–"} ms. Calculate the average force on the ${CARS[P.car].m} kg car.`, ans: () => `<ul><li>Δp = ${Math.round(CARS[P.car].m * mph(P.v))} kg m/s</li><li>F = Δp ÷ Δt = ${Math.round(CARS[P.car].m * mph(P.v))} ÷ ${R ? R.tStop.toFixed(3) : "–"}</li><li>= ${R ? Math.round(CARS[P.car].m * mph(P.v) / R.tStop / 1000) : "–"} kN</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain how a seatbelt reduces the risk of injury in a crash.", ans: "<ul><li>the belt stretches, so the person slows down over a longer time</li><li>the rate of change of momentum is smaller</li><li>so the force on the person is smaller (and spread over a wide area)</li></ul>" },
      { lvl: "std", marks: 3, q: "A 2 kg trolley at 3 m/s hits a 1 kg trolley at rest and they stick together. Calculate their speed afterwards.", ans: "<ul><li>momentum before = 2 × 3 = 6 kg m/s</li><li>after: 3 kg × v = 6</li><li>v = 2 m/s</li></ul>" },
      { lvl: "adv", marks: 3, q: "Show that kinetic energy is lost when the trolleys above stick together, and suggest where it goes.", ans: "<ul><li>KE before = ½ × 2 × 3² = 9 J</li><li>KE after = ½ × 3 × 2² = 6 J: 3 J lost</li><li>to heat, sound and deforming the trolleys</li></ul>" },
      { lvl: "adv", marks: 2, q: "Explain why the area under a force–time graph for a collision equals the change in momentum.", ans: "<ul><li>F = Δp ÷ Δt, so F Δt = Δp for each small time interval</li><li>adding the strips (the area) gives the total change of momentum: the impulse</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Cars</b>: one mass each. The front crushes at a steady crush force until the crumple zone is used up (the force builds up over the first 2 cm), then the passenger cell (30 MN/m) takes over. Unless set, the crush force is designed so the zone stops its own car from about 35 mph. In a two-car crash the softer front crushes first; the cars do not spring back.</li>
<li><b>Occupant</b>: a torso plus a 4.5 kg head on a springy neck. The seatbelt (120 kN/m) acts once its slack is taken up; a pretensioner removes the slack in 12 ms and a load limiter caps the belt at 6 kN. The airbag fills in 30 ms after it fires and pushes on the head (up to 1.3 kN, more while still bursting out) and chest (up to 5 kN). Without them the chest and head hit the steering wheel, which is very stiff.</li>
<li>Everything obeys F = m a, worked out every 0.02 ms. HIC₁₅ is the worst (t₂ − t₁)(mean head g)^2.5 over windows up to 15 ms; risk of serious head injury P = Φ((ln HIC − 7.45) ÷ 0.74).</li>
<li><b>Lab</b>: momentum is conserved and Newton's law of restitution sets the speeds: v₂ − v₁ = e(u₁ − u₂). An explosion turns spring energy E into kinetic energy with zero total momentum.</li></ul>
<h3>Simplifications</h3>
<ul><li>Full-width frontal crashes only: no rotation, pitching or side impacts.</li>
<li>The crush force does not depend on speed; real cars have stiffer and softer sections.</li>
<li>The dummy has two parts only (no arms, legs or neck injury).</li>
<li>The earlier version also had 2D collisions and Newton's cradle; they are not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/car-crash.html">original/car-crash.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "crash", options: [["crash", "🚗 Car crash"], ["lab", "🛒 Collisions lab"]], on: v => set({ mode: v }) });
grp.crash = g = ui.group("The crash");
ctl.v = K.slider(g, { label: "Impact speed", min: 10, max: 70, step: 1, value: 30, unit: "mph", on: v => { P.v = v; runNow(); } });
ctl.target = K.seg(g, { label: "Hits", value: "wall", options: [["wall", "a wall"], ["parked", "a parked vehicle"], ["oncoming", "an oncoming vehicle"]], on: v => { P.target = v; runNow(); } });
ctl.car = K.seg(g, { label: "Your car", value: "family", options: [["small", "small"], ["family", "family"], ["suv", "SUV"]], on: v => { P.car = v; P.crumple = CARS[v].L; ctl.crumple.set(P.crumple); runNow(); } });
ctl.other = K.seg(g, { label: "The other vehicle", value: "family", options: [["small", "small"], ["family", "family"], ["suv", "SUV"], ["lorry", "lorry"]], on: v => { P.other = v; runNow(); } });
ctl.crumple = K.slider(g, { label: "Crumple zone", min: 0.05, max: 0.9, step: 0.05, value: 0.65, fmt: v => Math.round(v * 100) + " cm", on: v => { P.crumple = v; runNow(); } });
ctl.F = K.slider(g, { label: "Crush force", min: 0, max: 600, step: 10, value: 0, fmt: v => v ? v + " kN" : "designed for the zone", on: v => { P.F = v; runNow(); } });
grp.occ = g = ui.group("The occupant");
ctl.belt = K.seg(g, { label: "Seatbelt", value: "belt", options: [["none", "none"], ["belt", "seatbelt"], ["pre", "+ pretensioner, load limiter"]], on: v => { P.belt = v; runNow(); } });
ctl.slack = K.slider(g, { label: "Belt slack", min: 0, max: 0.25, step: 0.01, value: 0.05, fmt: v => Math.round(v * 100) + " cm", on: v => { P.slack = v; runNow(); } });
ctl.bag = K.toggle(g, { label: "Airbag", value: true, on: v => { P.bag = v; runNow(); } });
ctl.bagT = K.slider(g, { label: "Airbag fires after", min: 5, max: 60, step: 1, value: 10, unit: "ms", on: v => { P.bagT = v; runNow(); } });
ctl.occ = K.slider(g, { label: "Occupant mass", min: 40, max: 120, step: 1, value: 75, unit: "kg", on: v => { P.occ = v; runNow(); } });
let r1 = K.row(g); K.btn(r1, "▶ Crash again", () => t = 0, "primary"); K.btn(r1, "Keep this crash", () => { if (R) { kept.push({ R, label: `${P.v} mph` }); if (kept.length > 3) kept.shift(); } }); K.btn(r1, "Clear", () => kept = []);
grp.lab = g = ui.group("Two trolleys");
ctl.m1 = K.slider(g, { label: "Mass of trolley 1", min: 0.5, max: 5, step: 0.5, value: 2, unit: "kg", on: v => { P.m1 = v; newLab(); } });
ctl.m2 = K.slider(g, { label: "Mass of trolley 2", min: 0.5, max: 5, step: 0.5, value: 1, unit: "kg", on: v => { P.m2 = v; newLab(); } });
ctl.u1 = K.slider(g, { label: "Velocity of 1", min: -4, max: 4, step: 0.5, value: 3, unit: "m/s", on: v => { P.u1 = v; newLab(); } });
ctl.u2 = K.slider(g, { label: "Velocity of 2", min: -4, max: 4, step: 0.5, value: 0, unit: "m/s", on: v => { P.u2 = v; newLab(); } });
ctl.e = K.slider(g, { label: "Bounciness (restitution e)", min: 0, max: 1, step: 0.05, value: 1, fmt: v => v.toFixed(2) + (v === 1 ? " (elastic)" : v === 0 ? " (they stick)" : ""), on: v => { P.e = v; newLab(); } });
ctl.boom = K.toggle(g, { label: "Explosion: start together at rest, spring pushes apart", value: false, on: v => { P.boom = v; newLab(); } });
ctl.E = K.slider(g, { label: "Spring energy", min: 1, max: 20, step: 1, value: 5, unit: "J", on: v => { P.E = v; newLab(); } });
K.btn(K.row(g), "▶ Go again", () => newLab(), "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Slow motion", min: 0.01, max: 0.5, step: 0.01, value: 0.05, fmt: v => v < 0.2 ? `${Math.round(1 / v)}× slower than real` : "× " + v, on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""], ["f", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function runNow() { R = crash(P); t = 0; for (const k of ["other"]) ctl[k].el.style.display = P.target === "wall" ? "none" : ""; ctl.slack.el.style.display = P.belt === "belt" ? "" : "none"; ctl.bagT.el.style.display = P.bag ? "" : "none"; }
function newLab() {
  ctl.E.el.style.display = P.boom ? "" : "none"; for (const k of ["u1", "u2", "e"]) ctl[k].el.style.display = P.boom ? "none" : "";
  let u1 = P.u1, u2 = P.u2, v1, v2; if (P.boom) { u1 = u2 = 0; const p = Math.sqrt(2 * P.E * P.m1 * P.m2 / (P.m1 + P.m2)); v1 = -p / P.m1; v2 = p / P.m2; } else [v1, v2] = collide(P.m1, P.m2, u1, u2, P.e);
  const gap = P.boom ? 0 : 1.2, closing = u1 - u2, tc = P.boom ? 0.5 : closing > 0 ? gap / closing : Infinity;
  lab = { u1, u2, v1, v2, tc, t: 0, x1: P.boom ? -0.15 : -0.8, x2: P.boom ? 0.15 : 0.4, log: [] };
}
function set(o) {
  Object.assign(P, { v: 30, target: "wall", car: "family", other: "family", crumple: 0.65, F: 0, belt: "belt", slack: 0.05, bag: true, bagT: 10, occ: 75, m1: 2, m2: 1, u1: 3, u2: 0, e: 1, boom: false, E: 5 }, o);
  if (o.car && o.crumple == null) P.crumple = CARS[o.car].L;
  for (const k of ["v", "crumple", "F", "slack", "bagT", "occ", "m1", "m2", "u1", "u2", "e", "E"]) ctl[k].set(P[k]); for (const k of ["mode", "target", "car", "other", "belt"]) ctl[k].set(P[k]); ctl.bag.set(P.bag); ctl.boom.set(P.boom);
  grp.crash.style.display = grp.occ.style.display = P.mode === "crash" ? "" : "none"; grp.lab.style.display = P.mode === "lab" ? "" : "none";
  kept = []; runNow(); newLab(); speed = P.mode === "lab" ? 0.5 : 0.05; ctl.speed.set(speed);
  chA.opts.title = P.mode === "crash" ? "Deceleration against time" : "Momentum against time"; chB.opts.title = P.mode === "crash" ? "Velocity against time" : "Kinetic energy against time";
  relabel(P.mode === "crash" ? ["impact speed", "crush distance", "crash time", "car average / peak", "chest peak · head peak", "HIC₁₅ · serious head injury risk"] : ["momentum before", "momentum after", "KE before", "KE after", "v₁ after", "v₂ after"]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function at(tt) { const o = R.out, i = Math.min(o.length - 1, Math.max(0, Math.round(tt / (25 * DT)))); return o[i]; }
function drawCar(c, x, y, sc, crushM, col, flip, len, occ) {
  // a side view: bonnet (the crumple zone, squashed by crushM), cabin and wheels; flip draws it facing left
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
  const bon = Math.max(0.05, len - crushM) * sc, cab = 2.2 * sc, rear = 1.0 * sc;
  c.fillStyle = col; c.beginPath(); c.moveTo(-cab - rear, 0); c.lineTo(-cab - rear, -0.75 * sc); c.lineTo(-cab, -0.8 * sc); c.lineTo(-cab * 0.75, -1.45 * sc); c.lineTo(-0.25 * sc, -1.45 * sc); c.lineTo(0, -0.85 * sc); c.lineTo(bon, -0.7 * sc); c.lineTo(bon, 0); c.fill();
  if (crushM > 0.02) { c.strokeStyle = "rgba(0,0,0,0.5)"; c.lineWidth = 2; c.beginPath(); for (let k = 0; k < 6; k++) { const xx = bon * k / 6; c.moveTo(xx, -0.65 * sc); c.lineTo(xx + bon / 12, -0.05 * sc); } c.stroke(); }
  c.fillStyle = "#222"; for (const wx of [-cab - rear * 0.5, -0.1 * sc]) { c.beginPath(); c.arc(wx, 0, 0.33 * sc, 0, 6.3); c.fill(); }
  c.fillStyle = "rgba(160,210,255,0.35)"; c.beginPath(); c.moveTo(-cab * 0.72, -1.4 * sc); c.lineTo(-0.3 * sc, -1.4 * sc); c.lineTo(-0.05 * sc, -0.9 * sc); c.lineTo(-cab * 0.72, -0.9 * sc); c.fill();
  if (occ) occ(c, sc);
  c.restore();
}
function drawCrash(c, w, h) {
  const s = at(t), sc = Math.min(70, w / 14), gy = h * 0.62, wallX = w * 0.68;
  c.fillStyle = "#1c2230"; c.fillRect(0, gy, w, h - gy); c.strokeStyle = "#3a4560"; c.setLineDash([20, 15]); c.beginPath(); c.moveTo(0, gy + 30); c.lineTo(w, gy + 30); c.stroke(); c.setLineDash([]);
  // the scene moves so the impact point stays in view; 1 m = sc pixels
  if (P.target === "wall") { c.fillStyle = "#7d8aa5"; c.fillRect(wallX, gy - 3.2 * sc, 0.5 * sc, 3.2 * sc); c.strokeStyle = "#56607a"; for (let y = gy - 3.2 * sc; y < gy; y += 0.3 * sc) { c.beginPath(); c.moveTo(wallX, y); c.lineTo(wallX + 0.5 * sc, y); c.stroke(); } }
  else { const L2 = CARS[P.other].L, col2 = P.other === "lorry" ? "#8a6d3b" : "#6fb1ff", sc2 = sc * (P.other === "lorry" ? 1.3 : P.other === "suv" ? 1.12 : P.other === "small" ? 0.88 : 1); drawCar(c, wallX + Math.max(0.05, L2 - s.c2) * sc2, gy - 0.33 * sc2, sc2, s.c2, col2, true, L2); }   // the camera follows the point where the cars meet
  const L1 = P.crumple, carX = wallX - (L1 - s.c1) * sc;
  drawCar(c, carX, gy - 0.33 * sc, sc * (P.car === "suv" ? 1.12 : P.car === "small" ? 0.88 : 1), s.c1, "#ff8a70", false, L1, (cc, ss) => {
    // dummy: torso and head move forward relative to the car; belt and airbag
    const seat = -1.6 * ss, tx = seat + s.rt * ss, hx = seat + s.rh * ss + 0.1 * ss;
    cc.fillStyle = "#ffd166"; cc.fillRect(tx - 0.12 * ss, -1.05 * ss, 0.24 * ss, 0.45 * ss); cc.beginPath(); cc.arc(hx, -1.2 * ss, 0.12 * ss, 0, 6.3); cc.fill();
    if (P.belt !== "none") { cc.strokeStyle = "#333"; cc.lineWidth = 4; cc.beginPath(); cc.moveTo(seat - 0.15 * ss, -1.1 * ss); cc.lineTo(tx + 0.1 * ss, -0.65 * ss); cc.stroke(); }
    const wheelX = seat + P.gap * ss + 0.2 * ss; cc.strokeStyle = "#111"; cc.lineWidth = 5; cc.beginPath(); cc.moveTo(wheelX, -1.15 * ss); cc.lineTo(wheelX + 0.12 * ss, -0.8 * ss); cc.stroke();
    if (s.fill > 0) { cc.fillStyle = "rgba(240,240,240,0.85)"; cc.beginPath(); cc.ellipse(wheelX - 0.15 * ss * s.fill, -1.1 * ss, 0.2 * ss * s.fill, 0.28 * ss * s.fill, 0, 0, 6.3); cc.fill(); }
  });
  T(c, `t = ${(t * 1000).toFixed(1)} ms`, 20, 34, "#eef2f8", "left", "600 16px"); T(c, `car ${(s.v1 / 0.44704).toFixed(1)} mph`, 20, 56, "#ff8a70", "left", "13px");
  if (s.F > 0) { const fk = s.F / 1000; T(c, `force between: ${fk.toFixed(0)} kN`, wallX, gy - 3.6 * sc, "#ffd166", "center", "600 13px"); }
  T(c, `car decel ${Math.max(0, s.a1).toFixed(0)} g · chest ${Math.max(0, s.at).toFixed(0)} g · head ${Math.max(0, s.ah).toFixed(0)} g`, 20, h - 16, "#aab6cc", "left", "12.5px");
}
function drawLab(c, w, h) {
  const L = lab, X = x => w / 2 + x * (w / 4), y = h * 0.55, s1 = 40 + 12 * P.m1, s2 = 40 + 12 * P.m2;
  c.fillStyle = "#3a4560"; c.fillRect(40, y + 22, w - 80, 8);
  for (const [x, s, col, m, v] of [[L.x1, s1, "#ff8a70", P.m1, L.t < L.tc ? L.u1 : L.v1], [L.x2, s2, "#6fb1ff", P.m2, L.t < L.tc ? L.u2 : L.v2]]) {
    c.fillStyle = col; c.fillRect(X(x) - s / 2, y - s * 0.6, s, s * 0.6 + 14); c.fillStyle = "#222"; for (const d of [-0.3, 0.3]) { c.beginPath(); c.arc(X(x) + d * s, y + 16, 7, 0, 6.3); c.fill(); }
    T(c, m + " kg", X(x), y - s * 0.6 - 8, "#eef2f8", "center", "600 12px");
    if (Math.abs(v) > 0.01) { c.strokeStyle = c.fillStyle = col; c.lineWidth = 3; const ax = X(x), len = v * 30; c.beginPath(); c.moveTo(ax, y - s * 0.6 - 30); c.lineTo(ax + len, y - s * 0.6 - 30); c.stroke(); T(c, v.toFixed(2) + " m/s", ax + len / 2, y - s * 0.6 - 38, col, "center", "11.5px"); }
  }
  const pb = P.m1 * L.u1 + P.m2 * L.u2, pa = P.m1 * L.v1 + P.m2 * L.v2, kb = 0.5 * P.m1 * L.u1 ** 2 + 0.5 * P.m2 * L.u2 ** 2 + (P.boom ? 0 : 0), ka = 0.5 * P.m1 * L.v1 ** 2 + 0.5 * P.m2 * L.v2 ** 2;
  T(c, `total momentum before ${pb.toFixed(2)} kg m/s → after ${pa.toFixed(2)} kg m/s`, w / 2, 50, "#7fe3a0", "center", "600 14px");
  T(c, `kinetic energy before ${kb.toFixed(2)} J → after ${ka.toFixed(2)} J${P.boom ? " (from the spring)" : ka < kb - 0.01 ? ` (${(kb - ka).toFixed(2)} J to heat, sound, deformation)` : " (elastic: none lost)"}`, w / 2, 74, "#ffd166", "center", "13px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); (P.mode === "crash" ? drawCrash : drawLab)(c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.mode === "crash") { t += dt * speed; if (t > 0.3) t = 0.3; }
  else { if (lab.t > 3.5) newLab(); const L = lab, s = dt * speed * 2; L.t += s;   // replay every few seconds
    const v1 = L.t < L.tc ? L.u1 : L.v1, v2 = L.t < L.tc ? L.u2 : L.v2; L.x1 += v1 * s; L.x2 += v2 * s; if (L.t < 6) L.log.push([L.t, P.m1 * v1, P.m2 * v2, 0.5 * P.m1 * v1 * v1, 0.5 * P.m2 * v2 * v2]); }
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "crash") {
    const o = R.out.filter(q => q.t <= t + 1e-9), sh = o.filter((q, i) => i % 2 === 0);
    chA.opts.xLabel = "time (ms)"; chA.opts.yLabel = "deceleration (g)"; chB.opts.xLabel = "time (ms)"; chB.opts.yLabel = "speed (mph)";
    chA.draw([{ pts: sh.map(q => [q.t * 1000, q.a1]), color: "#ff8a70", label: "car" }, { pts: sh.map(q => [q.t * 1000, q.at]), color: "#ffd166", label: "chest" }, { pts: sh.map(q => [q.t * 1000, q.ah]), color: "#c58cff", label: "head" }], { xMin: 0, xMax: 200, yMin: -10 });
    const vs = (RR, k) => RR.out.filter((q, i) => i % 4 === 0).map(q => [q.t * 1000, q[k] / 0.44704]);
    chB.draw(kept.map((q, i) => ({ pts: vs(q.R, "v1"), color: ["#7d8aa5", "#9a86c9", "#c98686"][i], dash: [5, 4], width: 1.3, label: q.label })).concat([{ pts: sh.map(q => [q.t * 1000, q.v1 / 0.44704]), color: "#ff8a70", width: 2.4, label: "car" }]), { xMin: 0, xMax: 200 });
    const avgG = R.v0 / R.tStop / G0;
    read.set("a", `${P.v} mph = ${R.v0.toFixed(1)} m/s`); read.set("b", `${(R.crush * 100).toFixed(0)} cm`); read.set("c", `${(R.tStop * 1000).toFixed(0)} ms`); read.set("d", `${avgG.toFixed(0)} g / ${R.peakC.toFixed(0)} g`); read.set("e", `${R.peakT.toFixed(0)} g · ${R.peakH.toFixed(0)} g`); read.set("f", `${R.hic.toFixed(0)} · ${Math.round(100 * R.risk)}%`);
    ui.hud(`KE to absorb: <b>${(0.5 * R.m1 * R.v0 ** 2 / 1000).toFixed(0)} kJ</b><br>head injury risk <b style="color:${R.risk > 0.3 ? "#ff5d6c" : R.risk > 0.1 ? "#ffd166" : "#7fe3a0"}">${Math.round(100 * R.risk)}%</b>`);
  } else {
    const L = lab.log; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "momentum (kg m/s)"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "kinetic energy (J)";
    chA.draw([{ pts: L.map(q => [q[0], q[1]]), color: "#ff8a70", label: "trolley 1" }, { pts: L.map(q => [q[0], q[2]]), color: "#6fb1ff", label: "trolley 2" }, { pts: L.map(q => [q[0], q[1] + q[2]]), color: "#7fe3a0", width: 2.6, label: "total" }], { xMin: 0, xMax: 3 });
    chB.draw([{ pts: L.map(q => [q[0], q[3]]), color: "#ff8a70", label: "trolley 1" }, { pts: L.map(q => [q[0], q[4]]), color: "#6fb1ff", label: "trolley 2" }, { pts: L.map(q => [q[0], q[3] + q[4]]), color: "#ffd166", width: 2.6, label: "total" }], { xMin: 0, xMax: 3, yMin: 0 });
    const l = lab; read.set("a", (P.m1 * l.u1 + P.m2 * l.u2).toFixed(2) + " kg m/s"); read.set("b", (P.m1 * l.v1 + P.m2 * l.v2).toFixed(2) + " kg m/s"); read.set("c", (0.5 * P.m1 * l.u1 ** 2 + 0.5 * P.m2 * l.u2 ** 2).toFixed(2) + " J"); read.set("d", (0.5 * P.m1 * l.v1 ** 2 + 0.5 * P.m2 * l.v2 ** 2).toFixed(2) + " J"); read.set("e", l.v1.toFixed(2) + " m/s"); read.set("f", l.v2.toFixed(2) + " m/s");
    ui.hud(P.boom ? "Explosion: total momentum stays zero" : `e = ${P.e}: ${P.e === 1 ? "elastic" : P.e === 0 ? "perfectly inelastic" : "inelastic"}`);
  }
});
set({});
ui.tip("The crash plays in slow motion (20× slower than real) · change anything and it crashes again", 7000);
