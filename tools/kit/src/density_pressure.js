/* =====================================================================
   DENSITY AND PRESSURE
   DENSITY ρ = m ÷ V (kg/m³ or g/cm³; 1 g/cm³ = 1000 kg/m³). Measure the
   mass on a balance and the volume with a ruler (regular shapes) or by
   displacement of water (irregular shapes). Every instrument has a
   resolution, so repeated results scatter: small objects give the biggest
   percentage error, and a eureka can that keeps some water gives a
   SYSTEMATIC error that repeating cannot remove.
   PRESSURE p = F ÷ A (pascals, Pa = N/m²): the same force on a small area
   gives a big pressure (drawing pin), on a big area a small one (snowshoe).
   In a liquid, pressure grows with depth: Δp = h ρ g, and at a point it
   pushes equally in all directions. The UPTHRUST on an object equals the
   weight of liquid it pushes aside (Archimedes); it floats if its density
   is less than the liquid's, with the fraction ρobject ÷ ρliquid under.
   A ball falling through a thick liquid speeds up until the drag and
   upthrust balance its weight: TERMINAL VELOCITY.
   ===================================================================== */
const g = 9.81;
const MAT = { aluminium: 2700, copper: 8960, brass: 8500, steel: 7850, oak: 700, pine: 500, HDPE: 950, acrylic: 1180 };
const MATCOL = { aluminium: "#c8ccd4", copper: "#d08050", brass: "#d8b040", steel: "#9aa3b2", oak: "#b08850", pine: "#e0c890", HDPE: "#eef0f2", acrylic: "#bfe8ff" };
const IRR = { stone: { name: "granite pebble", rho: 2700, V: 30, col: "#8a8a90" }, clay: { name: "lump of modelling clay", rho: 1700, V: 40, col: "#c86a8a" }, keys: { name: "brass keys", rho: 8500, V: 6, col: "#d8b040" } };
// liquids: density (kg/m³) and viscosity (Pa s) at about 20 °C
const LIQ = { water: { name: "water", rho: 998, eta: 0.0010, col: "#3a7ad0" }, sea: { name: "sea water", rho: 1025, eta: 0.00108, col: "#2a6aa0" }, ethanol: { name: "ethanol", rho: 789, eta: 0.0012, col: "#7aaad8" }, oil: { name: "olive oil", rho: 912, eta: 0.084, col: "#b8b040" }, glycerol: { name: "glycerol", rho: 1261, eta: 1.41, col: "#b8c8d8" }, syrup: { name: "golden syrup", rho: 1430, eta: 50, col: "#d89a30" }, mercury: { name: "mercury", rho: 13534, eta: 0.00155, col: "#b0b4bc" } };
const TOOL = { ruler: { name: "ruler", sd: 0.5, res: 1 }, vernier: { name: "vernier callipers", sd: 0.05, res: 0.1 } };   // mm
const roundTo = (v, res) => Math.round(v / res) * res;
const balance = (m, r) => roundTo(m + 0.004 * r.gauss(), 0.01);                    // grams, read to 0.01 g
const cylinder = (v, r) => roundTo(v + 0.25 * r.gauss(), 0.5);                      // cm³, read to 0.5 cm³

// ---------------- The density practicals: one measurement each ----------------
function measureBlock(mat, a, tool, r) {
  const t = TOOL[tool], sides = [0, 1, 2].map(() => roundTo(a * 10 + t.sd * r.gauss(), t.res) / 10);   // three sides (cm)
  const V = sides[0] * sides[1] * sides[2], m = balance(MAT[mat] / 1000 * a * a * a, r);
  return { m, V, rho: m / V * 1000, sides };
}
function measureIrregular(obj, method, r) {
  const o = IRR[obj], m = balance(o.rho / 1000 * o.V, r);
  let V;
  if (method === "cylinder") { const before = cylinder(50, r); V = cylinder(50 + o.V, r) - before; }
  else V = cylinder(o.V - (1.0 + 0.4 * r.gauss()), r);                                // the eureka can keeps about 1 cm³ in its spout
  return { m, V, rho: m / V * 1000 };
}
function measureLiquid(liq, vol, r) {
  const empty = balance(80, r), V = cylinder(vol, r), full = balance(80 + LIQ[liq].rho / 1000 * vol, r);
  return { m: full - empty, V, rho: (full - empty) / V * 1000 };
}
// predicted spread of a ruler/vernier block result: three sides each with SD σ (plus rounding)
const blockSD = (rho, a, tool) => { const t = TOOL[tool], s = Math.sqrt(t.sd * t.sd + t.res * t.res / 12) / (a * 10); return rho * Math.sqrt(3) * s; };

// ---------------- p = F/A ----------------
const OBJ = { trainers: { name: "person in trainers", m: 60, A: 0.03 }, snowshoes: { name: "person on snowshoes", m: 60, A: 0.2 }, stiletto: { name: "stiletto heel (on one heel)", m: 60, A: 1e-4 }, elephant: { name: "elephant (four feet)", m: 5000, A: 0.4 }, brick: { name: "brick on its end", m: 2.5, A: 0.0066 }, pin: { name: "drawing pin (thumb pushes 20 N)", m: 20 / g, A: 1e-7 } };
const SNOW = 3000;   // soft snow gives way above about 3 kPa

// ---------------- Floating: a 10 cm cube ----------------
const CUBE = 0.1;
const fracUnder = (rhoO, rhoL) => Math.min(1, rhoO / rhoL);

// ---------------- The falling sphere: weight, upthrust and drag ----------------
const TUBE_R = 0.025;   // tube radius (m)
const BALL = { steel: { name: "steel", rho: 7850 }, glass: { name: "glass", rho: 2500 }, nylon: { name: "nylon", rho: 1150 } };
// drag = 6πηrv × (1 + 0.15 Re^0.687) × (1 + 2.1 r/R): Stokes' law, corrected for inertia and for the tube walls
function dragF(v, r, L) { const Re = Math.max(1e-9, L.rho * Math.abs(v) * 2 * r / L.eta); return 6 * Math.PI * L.eta * r * v * (1 + 0.15 * Math.pow(Re, 0.687)) * (1 + 2.1 * r / TUBE_R); }
function vTerminal(r, ball, L) { const net = (BALL[ball].rho - L.rho) * 4 / 3 * Math.PI * r ** 3 * g; if (net <= 0) return 0; let lo = 0, hi = 50; for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (dragF(mid, r, L) > net) hi = mid; else lo = mid; } return lo; }
const vStokes = (r, ball, L) => 2 * r * r * g * (BALL[ball].rho - L.rho) / (9 * L.eta);
// one drop through 1 m of liquid; light gates at 40 cm and 80 cm (or a stopwatch with your reaction time)
function drop(r, ball, L, timer, rr) {
  const m = BALL[ball].rho * 4 / 3 * Math.PI * r ** 3, mL = L.rho * 4 / 3 * Math.PI * r ** 3;
  const tau = m / (6 * Math.PI * L.eta * r), dt = Math.min(1e-3, tau / 5);   // tau: how quickly it reaches terminal velocity
  let y = 0, v = 0, t = 0, t40 = null, t80 = null;
  while (y < 0.85) {
    const a = ((m - mL) * g - dragF(v, r, L)) / (m + mL / 2); v += a * dt; y += v * dt; t += dt;
    if (t40 === null && y >= 0.4) t40 = t; if (t80 === null && y >= 0.8) t80 = t;
    if (t > 40 * tau) { const vt = vTerminal(r, ball, L); if (t40 === null) t40 = t + (0.4 - y) / vt; if (t80 === null) t80 = t + (0.8 - y) / vt; break; }   /* steady now: the rest is at terminal velocity */
  }
  const err = timer === "gates" ? 0.0005 * rr.gauss() : 0.12 * rr.gauss();               // stopwatch: about 0.12 s of human reaction scatter
  return 0.4 / Math.max(1e-3, t80 - t40 + err);
}

// ---------------- The page ----------------
const DEF = { view: "density", speed: 1, kind: "block", mat: "aluminium", side: 2, tool: "ruler", obj: "stone", method: "cylinder", liq: "water", lvol: 50, pobj: "trainers", pm: 60, pA: 0.03, tliq: "water", depth: 0.5, sea: false, frho: 700, fliq: "water", hang: false, ball: "steel", br: 2, bliq: "glycerol", timer: "gates" };
const P = Object.assign({}, DEF);
let rows = [], prs = [], fl = null, fall = null, sph = [], rnd = K.rng(Date.now() % 9973 + 3);
const ui = K.app({
  title: "Density and Pressure", subject: "Physics",
  blurb: "The density practicals with real measuring errors, pressure = force ÷ area, pressure in liquids, floating and upthrust, and terminal velocity in a thick liquid",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 5(b) Density and pressure: ρ = m/V and the density practical; p = F/A; pressure in a fluid acts in all directions; pressure difference = height × density × g. Terminal velocity (Section 1). Floating and upthrust are beyond the spec.", adv: "WJEC Eduqas A level Physics practical skills: percentage uncertainties in a density measurement, systematic and random errors; Newton's laws for a falling sphere. Stokes' law, viscosity and upthrust are beyond the spec (gas pressure from molecules: see Gas in a Box)." } },
  missions: [
    { title: "Density of a block", q: "Measure a 2 cm aluminium block five times with a ruler. Why are your results not all 2700 kg/m³?", hint: "Each side is read to the nearest mm, and a 1 mm error in 20 mm is 5%. The volume multiplies three sides, so their errors add up. Take a mean of repeats.", setup() { set({ view: "density", kind: "block", side: 2 }); } },
    { title: "Small blocks, big errors", q: "Compare a 1 cm block with a 6 cm block of the same material. Which gives more consistent results?", hint: "The 6 cm block: the same ±1 mm reading error is a much smaller percentage of a bigger length. Measure big things where you can.", setup() { set({ view: "density", kind: "block", side: 1 }); } },
    { title: "Irregular objects", q: "Find the density of the pebble by displacement in a measuring cylinder, then with a eureka can. Which method is more accurate?", hint: "The eureka can keeps about 1 cm³ of water in its spout, so the volume is always too small and the density too big: a systematic error that repeating does not remove.", setup() { set({ view: "density", kind: "irregular", obj: "stone" }); } },
    { title: "Snowshoes", q: "Why don't you sink into soft snow on snowshoes, when you do in trainers?", hint: "Same weight (force) over about 7 times the area, so about 1/7 of the pressure: below the 3 kPa that soft snow can hold.", setup() { set({ view: "pressure", pobj: "trainers" }); } },
    { title: "Pressure and depth", q: "Take pressure readings every 10 cm down the tank. What is the gradient of the graph? Does turning the sensor change the reading?", hint: "Gradient = ρg = 9.79 kPa per metre for water. The reading is the same whichever way the sensor faces: pressure acts in all directions.", setup() { set({ view: "liquid", depth: 0.1 }); } },
    { title: "Why are dams thicker at the bottom?", q: "Look at the sea to 200 m. Why are dams and submarines built so strongly?", hint: "Δp = hρg: every 10 m of water adds about 100 kPa (about 1 atmosphere). At the bottom of a dam the pressure is greatest, so the wall must be thickest there.", setup() { set({ view: "liquid", sea: true, depth: 50 }); } },
    { title: "Floating and sinking", q: "Change the cube's density from 200 to 1200 kg/m³ in water. What fraction floats under the surface? When does it sink?", hint: "Fraction under = ρcube ÷ ρwater. It sinks when its density is more than the liquid's. In mercury even steel floats!", setup() { set({ view: "float", frho: 200 }); } },
    { title: "Terminal velocity", q: "Drop a steel ball into glycerol. Watch the forces. Why does it stop speeding up?", hint: "Drag grows with speed. When weight = upthrust + drag, the resultant force is zero, so (Newton's first law) the speed stays constant: terminal velocity.", setup() { set({ view: "sphere", ball: "steel", br: 2 }); } },
    { lvl: "adv", title: "Percentage uncertainty", q: "Measure a 1.5 cm brass block with a ruler, then with vernier callipers. Work out the percentage uncertainty in the density each time.", hint: "% uncertainty in V = 3 × % uncertainty in the side; add the mass's. Ruler: 3 × 0.5/15 = 10%; vernier: 3 × 0.05/15 = 1%.", setup() { set({ view: "density", kind: "block", mat: "brass", side: 1.5, tool: "ruler" }); } },
    { lvl: "adv", title: "Viscosity from falling spheres", q: "Time balls of five radii through glycerol. Plot v against r². Use the gradient to find η.", hint: "Stokes: v = 2r²g(ρs − ρl)/(9η), so the gradient is 2g(ρs − ρl)/(9η). Big balls fall a little slower than Stokes predicts (walls and inertia), so use the small ones.", setup() { set({ view: "sphere", ball: "steel", br: 0.5 }); } }
  ],
  batch: [
    { title: "One aluminium block, measured by many students", question: "How much do density results scatter for a 2 cm aluminium block measured with a ruler?", how: "Each side read to the nearest mm (reading scatter ±0.5 mm); balance to 0.01 g; 300 students.", yLabel: "density (kg/m³)", reps: 300, bins: 20, theory: 2700, theoryLabel: "data book", run: (x, r) => measureBlock("aluminium", 2, "ruler", r).rho, note: "Centred on 2700 with an SD of about 135 kg/m³ (predicted from the reading errors): random error, which averaging reduces." },
    { title: "Small blocks are less precise", question: "How does the spread of results depend on the size of the block?", how: "Aluminium cubes 1–6 cm, ruler; 30 students each. Compare the SD column.", xLabel: "side of the block (cm)", yLabel: "density (kg/m³)", xs: [1, 2, 3, 4, 5, 6], reps: 30, theory: () => 2700, theoryLabel: "2700", run: (a, r) => measureBlock("aluminium", a, "ruler", r).rho, note: "The means stay near 2700 but the SD falls roughly as 1 ÷ side: the same 1 mm reading is a smaller fraction of a bigger block." },
    { title: "Ruler or vernier callipers? (A level)", question: "How precise is a vernier calliper result for a 1.5 cm brass block?", how: "Vernier read to 0.1 mm (scatter ±0.05 mm); 300 students.", yLabel: "density (kg/m³)", reps: 300, bins: 20, theory: 8500, theoryLabel: "data book", run: (x, r) => measureBlock("brass", 1.5, "vernier", r).rho, note: "SD about 57 kg/m³ (predicted), about ten times smaller than with a ruler (about 570)." },
    { title: "Eureka can: a systematic error", question: "Does repeating the eureka can method give the right density for a granite pebble?", how: "30 cm³ pebble; the can keeps 1.0 ± 0.4 cm³ in its spout; 300 students.", yLabel: "density (kg/m³)", reps: 300, bins: 20, theory: 2700, theoryLabel: "true", run: (x, r) => measureIrregular("stone", "eureka", r).rho, note: "The mean is about 3% too high however many times you repeat: a systematic error. Fix the method (wet the spout first), not the number of repeats." },
    { title: "Liquid: how much should you measure?", question: "How precise is the density of water from different volumes in a measuring cylinder?", how: "Cylinder read to 0.5 cm³, balance to 0.01 g; 20 students for each volume.", xLabel: "volume measured (cm³)", yLabel: "density (kg/m³)", xs: [10, 20, 40, 60, 80, 100], reps: 20, theory: () => 998, theoryLabel: "998", run: (v, r) => measureLiquid("water", v, r).rho, note: "The spread falls as the volume grows: measure as much liquid as the cylinder holds." },
    { title: "Pressure and depth", question: "How does the pressure in water change with depth?", how: "Pressure sensor (±0.1 kPa) in fresh water, 0–1 m.", xLabel: "depth (m)", yLabel: "pressure from the water (kPa)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 3, fit: true, theory: h => h * 998 * g / 1000, theoryLabel: "hρg", run: (h, r) => h * 998 * g / 1000 + 0.1 * r.gauss(), note: "A straight line through the origin with gradient ρg = 9.79 kPa per metre." },
    { title: "Floating: how much is under?", question: "What percentage of a floating cube is under water, for cubes of different densities?", how: "10 cm cubes dropped in water, left to settle (damped bobbing), then the depth measured to ±1 mm.", xLabel: "density of the cube (kg/m³)", yLabel: "% under the surface", xs: [200, 400, 600, 800, 1000, 1200], reps: 3, yMin: 0, theory: rho => 100 * fracUnder(rho, 998), theoryLabel: "ρ ÷ ρwater", run: (rho, r) => { const c = { y: 0, v: 0 }; for (let k = 0; k < 4000; k++) floatStep(c, rho, LIQ.water, 0.005); return Math.min(100, (c.y * 1000 + r.gauss()) / 1000 / CUBE * 100); }, note: "Floats with ρcube ÷ ρwater under the surface; 100% (sinks) once it is denser than water." },
    { title: "Archimedes: upthrust and volume", question: "Weigh objects in air and in water. How does the upthrust depend on their volume?", how: "Spring balance read to ±0.01 N; brass objects 20–400 cm³ fully under water.", xLabel: "volume (cm³)", yLabel: "upthrust (N)", xs: [20, 50, 100, 200, 300, 400], reps: 3, fit: true, theory: V => 998 * g * V * 1e-6, theoryLabel: "ρgV", run: (V, r) => { const W = 8500 * g * V * 1e-6; return (W + 0.01 * r.gauss()) - (W - 998 * g * V * 1e-6 + 0.01 * r.gauss()); }, note: "Gradient ρg = 0.00979 N per cm³: the upthrust is the weight of the water pushed aside." },
    { title: "Terminal velocity and radius", question: "How does the terminal velocity of a steel ball in glycerol depend on its radius?", how: "Light gates at 40 cm and 80 cm; tube 5 cm across; log–log axes.", xLabel: "log₁₀(radius / mm)", yLabel: "log₁₀(speed / m s⁻¹)", xs: [-0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.7], reps: 2, fit: true, theory: x => Math.log10(vStokes(10 ** x / 1000, "steel", LIQ.glycerol)), theoryLabel: "Stokes (gradient 2)", run: (x, r) => Math.log10(drop(10 ** x / 1000, "steel", LIQ.glycerol, "gates", r)), note: "Close to Stokes' v ∝ r² (gradient 2) for small balls; the big ones fall slower (the tube walls and the liquid's inertia), so the fitted gradient is a bit under 2." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "5(b)", text: "ρ = m ÷ V. Regular solid: measure the sides; irregular solid: displacement (measuring cylinder or eureka can); liquid: mass of a measured volume. 1 g/cm³ = 1000 kg/m³." },
      { lvl: "std", tag: "5(b)", text: "p = F ÷ A (Pa = N/m²). Pressure in a liquid acts in all directions and increases with depth: Δp = h × ρ × g." },
      { lvl: "std", tag: "1", text: "Terminal velocity: as speed rises, drag rises until weight = drag + upthrust; the resultant force is zero and the speed stays constant." },
      { lvl: "std", tag: "beyond", text: "Upthrust = weight of fluid displaced (Archimedes). An object floats if its density is less than the fluid's, with ρobject ÷ ρfluid of its volume under." },
      { lvl: "adv", tag: "PS", text: "Random errors scatter results (reduce by repeating and averaging); systematic errors shift them all one way (fix the method). % uncertainty in a³ = 3 × % uncertainty in a." },
      { lvl: "adv", tag: "beyond", text: "Stokes' law F = 6πηrv for slow spheres; terminal velocity v = 2r²g(ρs − ρl)/(9η)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const b = rows.find(x => x.kind === "block"); return b ? `A block has sides ${b.sides.map(s => s.toFixed(1)).join(" cm, ")} cm and mass ${b.m.toFixed(2)} g. Calculate its density in kg/m³.` : "A block measures 2.0 cm × 2.0 cm × 2.0 cm and has a mass of 21.60 g. Calculate its density in kg/m³."; }, ans: () => { const b = rows.find(x => x.kind === "block") || { m: 21.6, V: 8 }; return `<ul><li>V = ${b.V.toFixed(3)} cm³</li><li>ρ = m ÷ V = ${(b.m / b.V).toFixed(3)} g/cm³</li><li>= ${(b.m / b.V * 1000).toFixed(0)} kg/m³</li></ul>`; } },
      { lvl: "std", marks: 2, q: () => `Calculate the extra pressure from the ${LIQ[P.tliq].name} at a depth of ${P.depth} m (ρ = ${LIQ[P.tliq].rho} kg/m³, g = 9.81 N/kg).`, ans: () => `<ul><li>Δp = hρg = ${P.depth} × ${LIQ[P.tliq].rho} × 9.81</li><li>= ${(P.depth * LIQ[P.tliq].rho * g / 1000).toFixed(1)} kPa</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain why a eureka can gives a density that is too high, and why repeating does not help.", ans: "<ul><li>some water stays in the spout/on the can, so the measured volume is too small</li><li>ρ = m/V with V too small gives ρ too big</li><li>it is a systematic error: every repeat is wrong the same way, so the mean is still wrong</li></ul>" },
      { lvl: "adv", marks: 3, q: "A cube's side is 15 ± 1 mm. Calculate the percentage uncertainty in its volume, and explain how to reduce it.", ans: "<ul><li>% in side = 1/15 = 6.7%</li><li>% in V = 3 × 6.7 = 20%</li><li>use vernier callipers (±0.1 mm → 2%) or a bigger block</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe how to measure the density of an irregularly shaped stone.", ans: "<ul><li>Measure its mass on a balance</li><li>Part-fill a measuring cylinder with water and read the volume; lower the stone in and read again (or use a eureka can and collect the water pushed out)</li><li>The volume of the stone is the increase (or the water collected)</li><li>density = mass ÷ volume; repeat and take a mean</li></ul>" },
      { lvl: "std", marks: 3, q: "A person weighing 600 N stands on snowshoes with a total area of 0.30 m². Calculate the pressure on the snow, and explain why snowshoes stop them sinking.", ans: "<ul><li>p = F ÷ A = 600 ÷ 0.30</li><li>= 2000 Pa</li><li>the large area spreads the weight, so the pressure is lower than with ordinary shoes</li></ul>" },
      { lvl: "std", marks: 2, q: "A diver is 12 m below the surface of the sea (ρ = 1030 kg/m³, g = 9.81 N/kg). Calculate the pressure due to the water.", ans: "<ul><li>p = hρg = 12 × 1030 × 9.81</li><li>= 1.2 × 10⁵ Pa (121 kPa)</li></ul>" },
      { lvl: "adv", marks: 4, q: "A cube has a mass of 54.0 ± 0.1 g and sides of 3.0 ± 0.1 cm. Calculate its density with its absolute uncertainty.", ans: "<ul><li>V = 3.0³ = 27 cm³, so ρ = 54.0 ÷ 27 = 2.0 g/cm³</li><li>% uncertainty in mass = 0.1 ÷ 54.0 = 0.2%; in the side = 0.1 ÷ 3.0 = 3.3%, so in V = 3 × 3.3 = 10%</li><li>% uncertainty in ρ ≈ 0.2 + 10 ≈ 10%</li><li>ρ = 2.0 ± 0.2 g/cm³</li></ul>" },
      { lvl: "adv", marks: 2, q: "A steel ball falls through glycerol at a steady (terminal) speed. Name the three forces acting on it and state how they are related.", ans: "<ul><li>weight (down), drag (up) and upthrust (up)</li><li>at terminal velocity: weight = drag + upthrust (the resultant force is zero)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Use Stokes' law to explain why a ball of twice the radius (same materials) has four times the terminal velocity.", ans: "<ul><li>weight − upthrust = (4/3)πr³(ρs − ρl)g, which is ∝ r³</li><li>drag = 6πηrv, which is ∝ rv</li><li>at terminal velocity they are equal, so v ∝ r³ ÷ r = r²: doubling r multiplies v by 4</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Density practicals: each side read with a ruler (scatter ±0.5 mm, rounded to 1 mm) or vernier callipers (±0.05 mm, rounded to 0.1 mm); balance ±0.004 g rounded to 0.01 g; measuring cylinder ±0.25 cm³ rounded to 0.5 cm³; the eureka can keeps 1.0 ± 0.4 cm³ in its spout.</li>
<li>p = F ÷ A with F = mg; soft snow gives way above about 3 kPa (illustrative). Masses and contact areas are typical round numbers.</li>
<li>Liquids: incompressible, Δp = hρg; the total pressure adds 101.3 kPa of atmosphere. Jets leave the tank at Torricelli's speed √(2gh).</li>
<li>Floating: a 10 cm cube; upthrust = ρ_liquid × g × (volume under); bobbing is damped so it settles. A spring balance reads weight − upthrust.</li>
<li>Falling sphere: weight − upthrust − drag, drag = 6πηrv (Stokes) × (1 + 0.15 Re^0.687) for the liquid's inertia × (1 + 2.1r/R) for the tube walls (R = 2.5 cm); added mass of half the displaced liquid. A stopwatch adds ±0.12 s of reaction time; light gates ±0.5 ms.</li></ul>
<h3>Left out</h3><ul><li>Temperature changes of density, surface tension (water creeping up the cylinder: read the bottom of the meniscus), compressible gases (see Gas in a Box for gas pressure from molecules).</li></ul>
<h3>Data</h3><ul><li>Densities (kg/m³): aluminium 2700, copper 8960, brass 8500, steel 7850, oak about 700, pine about 500, HDPE 950, acrylic 1180, water 998, sea water 1025, ethanol 789, olive oil 912, glycerol 1261, golden syrup about 1430, mercury 13 534. Viscosities at 20 °C: glycerol 1.41, olive oil 0.084, water 0.0010, golden syrup about 50 Pa s.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/density-pressure.html">original/density-pressure.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let gg = ui.group("View");
ctl.view = K.seg(gg, { value: "density", options: [["density", "⚖️ density practicals"], ["pressure", "📌 p = F ÷ A"], ["liquid", "🌊 liquid pressure"], ["float", "🚢 floating"], ["sphere", "⚪ falling sphere"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(gg, { label: "Speed", min: 0.1, max: 20, step: 0.1, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
grp.density = gg = ui.group("Density practical");
ctl.kind = K.seg(gg, { value: "block", options: [["block", "regular block"], ["irregular", "irregular object"], ["liquid", "liquid"]], on: v => { P.kind = v; showGroups(); } });
const sub = {};
sub.block = K.row(gg); ctl.mat = K.seg(sub.block, { value: "aluminium", options: Object.keys(MAT).map(k => [k, k]), on: v => P.mat = v });
sub.block2 = K.row(gg); ctl.side = K.slider(sub.block2, { label: "Side of the cube", min: 1, max: 6, step: 0.5, value: 2, unit: "cm", on: v => P.side = v });
ctl.tool = K.seg(sub.block2, { value: "ruler", options: [["ruler", "ruler (1 mm)"], ["vernier", "vernier callipers (0.1 mm)"]], on: v => P.tool = v });
sub.irregular = K.row(gg); ctl.obj = K.seg(sub.irregular, { value: "stone", options: Object.keys(IRR).map(k => [k, IRR[k].name]), on: v => P.obj = v });
ctl.method = K.seg(sub.irregular, { value: "cylinder", options: [["cylinder", "measuring cylinder"], ["eureka", "eureka can"]], on: v => P.method = v });
sub.liquid = K.row(gg); ctl.liq = K.seg(sub.liquid, { value: "water", options: ["water", "sea", "ethanol", "oil", "glycerol", "syrup"].map(k => [k, LIQ[k].name]), on: v => P.liq = v });
ctl.lvol = K.slider(sub.liquid, { label: "Volume poured in", min: 10, max: 100, step: 5, value: 50, unit: "cm³", on: v => P.lvol = v });
let rr = K.row(gg); K.btn(rr, "📏 Measure", () => measureNow(), "primary"); K.btn(rr, "×5", () => { for (let i = 0; i < 5; i++) measureNow(); }); K.btn(rr, "Clear", () => { rows = []; });
grp.pressure = gg = ui.group("Force on an area");
ctl.pobj = K.seg(gg, { value: "trainers", options: Object.keys(OBJ).map(k => [k, OBJ[k].name]), on: v => { P.pobj = v; P.pm = OBJ[v].m; P.pA = OBJ[v].A; ctl.pm.set(Math.log10(P.pm)); ctl.pA.set(Math.log10(P.pA)); } });
ctl.pm = K.slider(gg, { label: "Mass", min: -1, max: 4, step: 0.01, value: Math.log10(60), fmt: v => { const m = 10 ** v; return (m < 10 ? m.toFixed(2) : m.toFixed(0)) + " kg"; }, on: v => P.pm = 10 ** v });
ctl.pA = K.slider(gg, { label: "Area in contact", min: -7, max: 0, step: 0.01, value: Math.log10(0.03), fmt: v => { const a = 10 ** v; return a >= 1e-4 ? (a * 1e4).toPrecision(3) + " cm²" : (a * 1e6).toPrecision(2) + " mm²"; }, on: v => P.pA = 10 ** v });
grp.liquid = gg = ui.group("Pressure in a liquid");
ctl.tliq = K.seg(gg, { value: "water", options: ["water", "sea", "oil", "mercury"].map(k => [k, LIQ[k].name]), on: v => P.tliq = v });
ctl.sea = K.toggle(gg, { label: "The sea, down to 200 m (instead of a 1 m tank)", value: false, on: v => { P.sea = v; ctl.depth.set(v ? 20 : 0.5); P.depth = v ? 20 : 0.5; prs = []; } });
ctl.depth = K.slider(gg, { label: "Depth of the sensor", min: 0, max: 1, step: 0.01, value: 0.5, unit: "m", on: v => P.depth = P.sea ? v * 200 : v, fmt: v => (P.sea ? (v * 200).toFixed(0) : v.toFixed(2)) + " m" });
ctl.face = K.slider(gg, { label: "Direction the sensor faces", min: 0, max: 360, step: 5, value: 0, unit: "°", on: v => P.face = v });
rr = K.row(gg); K.btn(rr, "📏 Take a reading", () => { const p = P.depth * LIQ[P.tliq].rho * g / 1000 + 0.1 * rnd.gauss(); prs.push([P.depth, p]); }, "primary"); K.btn(rr, "Clear", () => { prs = []; });
grp.float = gg = ui.group("Floating cube (10 cm)");
ctl.frho = K.slider(gg, { label: "Density of the cube", min: 100, max: 12000, step: 50, value: 700, unit: "kg/m³", on: v => P.frho = v });
ctl.fliq = K.seg(gg, { value: "water", options: ["water", "sea", "ethanol", "oil", "glycerol", "mercury"].map(k => [k, LIQ[k].name]), on: v => P.fliq = v });
ctl.hang = K.toggle(gg, { label: "Hang it from a spring balance (pushed fully under)", value: false, on: v => P.hang = v });
rr = K.row(gg); K.btn(rr, "↓ Drop it in again", () => { fl = { y: -0.05, v: 0 }; });
grp.sphere = gg = ui.group("Falling sphere");
ctl.ball = K.seg(gg, { value: "steel", options: Object.keys(BALL).map(k => [k, BALL[k].name]), on: v => { P.ball = v; newDrop(); } });
ctl.br = K.slider(gg, { label: "Radius", min: 0.5, max: 5, step: 0.25, value: 1, unit: "mm", on: v => { P.br = v; newDrop(); } });
ctl.bliq = K.seg(gg, { value: "glycerol", options: ["glycerol", "syrup", "oil", "water"].map(k => [k, LIQ[k].name]), on: v => { P.bliq = v; newDrop(); sph = []; } });
ctl.timer = K.seg(gg, { value: "gates", options: [["gates", "light gates"], ["watch", "stopwatch"]], on: v => P.timer = v });
rr = K.row(gg); K.btn(rr, "↓ Drop", () => newDrop(), "primary"); K.btn(rr, "Clear results", () => { sph = []; });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; sub.block.style.display = sub.block2.style.display = P.kind === "block" ? "" : "none"; sub.irregular.style.display = P.kind === "irregular" ? "" : "none"; sub.liquid.style.display = P.kind === "liquid" ? "" : "none"; }
function measureNow() {
  let res;
  if (P.kind === "block") res = Object.assign(measureBlock(P.mat, P.side, P.tool, rnd), { kind: "block", what: `${P.side} cm ${P.mat} (${TOOL[P.tool].name})`, truth: MAT[P.mat] });
  else if (P.kind === "irregular") res = Object.assign(measureIrregular(P.obj, P.method, rnd), { kind: "irregular", what: `${IRR[P.obj].name} (${P.method === "eureka" ? "eureka can" : "cylinder"})`, truth: IRR[P.obj].rho });
  else res = Object.assign(measureLiquid(P.liq, P.lvol, rnd), { kind: "liquid", what: `${P.lvol} cm³ of ${LIQ[P.liq].name}`, truth: LIQ[P.liq].rho });
  rows.unshift(res); if (rows.length > 40) rows.pop();
}
// floating cube dynamics: upthrust − weight − damping (y = depth of the bottom face under the surface, m)
function floatStep(c, rhoO, L, dt) {
  const m = rhoO * CUBE ** 3, under = Math.max(0, Math.min(CUBE, c.y)), U = L.rho * g * CUBE * CUBE * under, a = (m * g - U - 6 * c.v * Math.sqrt(m) * (under > 0 ? 1 : 0.02)) / (m + L.rho * CUBE ** 3 * 0.3);
  c.v += a * dt; c.y += c.v * dt; if (c.y > 0.6) { c.y = 0.6; c.v = 0; }
}
function newDrop() { const L = LIQ[P.bliq], r = P.br / 1000; fall = { y: 0, v: 0, t: 0, t40: null, t80: null, vt: vTerminal(r, P.ball, L), trace: [], done: false }; }
function set(o) {
  Object.assign(P, DEF, { face: 0 }, o); if (o.pobj) { P.pm = OBJ[o.pobj].m; P.pA = OBJ[o.pobj].A; }
  for (const k of ["speed", "side", "lvol", "frho", "br"]) ctl[k].set(P[k]);
  ctl.depth.set(P.sea ? P.depth / 200 : P.depth); ctl.face.set(0); ctl.pm.set(Math.log10(P.pm)); ctl.pA.set(Math.log10(P.pA));
  for (const k of ["kind", "mat", "tool", "obj", "method", "liq", "pobj", "tliq", "sea", "fliq", "hang", "ball", "bliq", "timer", "view"]) ctl[k].set(P[k]);
  rows = []; prs = []; sph = []; fl = { y: -0.05, v: 0 }; newDrop(); showGroups();
}

// ---------------- Simulation ----------------
function tick(dt) {
  const s = Math.min(0.05, dt * P.speed);
  if (P.view === "float" && !P.hang) for (let k = 0; k < 20; k++) floatStep(fl, P.frho, LIQ[P.fliq], s / 20);
  if (P.view === "sphere" && !fall.done) {
    const L = LIQ[P.bliq], r = P.br / 1000, m = BALL[P.ball].rho * 4 / 3 * Math.PI * r ** 3, mL = L.rho * 4 / 3 * Math.PI * r ** 3, tau = m / (6 * Math.PI * L.eta * r);
    // when the ball reaches terminal velocity almost at once (thick liquid), step at that speed; otherwise integrate Newton's second law
    const n = Math.max(1, Math.min(400, Math.ceil(s / Math.max(tau / 3, 1e-4)))), h = s / n;
    for (let k = 0; k < n && !fall.done; k++) {
      if (tau < 2e-4) fall.v = fall.vt; else { const a = ((m - mL) * g - dragF(fall.v, r, L)) / (m + mL / 2); fall.v += a * h; }
      fall.y += fall.v * h; fall.t += h;
      if (fall.t40 === null && fall.y >= 0.4) fall.t40 = fall.t;
      if (fall.t80 === null && fall.y >= 0.8) { fall.t80 = fall.t; const err = P.timer === "gates" ? 0.0005 * rnd.gauss() : 0.12 * rnd.gauss(); const vm = 0.4 / Math.max(1e-3, fall.t80 - fall.t40 + err); sph.push({ r: P.br, v: vm, ball: P.ball, liq: P.bliq }); fall.vm = vm; }
      if (fall.y >= 0.95) { fall.y = 0.95; fall.done = true; }
    }
    fall.trace.push([fall.t, fall.v]); if (fall.trace.length > 600) fall.trace.splice(0, 300);
  }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawDensity(c, w, h) {
  const x0 = 40, y0 = 90, bh = h - 160;
  // the apparatus
  c.fillStyle = "#2a3448"; c.fillRect(x0, y0 + bh, 220, 16); TX(c, rows[0] ? rows[0].m.toFixed(2) + " g" : "0.00 g", x0 + 110, y0 + bh + 34, "#7ee787", "center", "600 16px"); TX(c, "balance", x0 + 110, y0 + bh + 52, "#8fa0bf", "center", "11px");
  if (P.kind === "block") { const sp = 18 * P.side; c.fillStyle = MATCOL[P.mat]; c.fillRect(x0 + 110 - sp / 2, y0 + bh - sp, sp, sp); c.strokeStyle = "#0b1020"; c.strokeRect(x0 + 110 - sp / 2, y0 + bh - sp, sp, sp); TX(c, `${P.side} cm ${P.mat}`, x0 + 110, y0 + bh - sp - 10, "#eef2f8", "center", "12px"); }
  else { const cx = x0 + 110, top = y0 + 40, H = bh - 40, lev = P.kind === "liquid" ? P.lvol : P.method === "cylinder" ? 50 + IRR[P.obj].V : 50; c.strokeStyle = "#cfd8ea"; c.strokeRect(cx - 26, top, 52, H); c.fillStyle = P.kind === "liquid" ? LIQ[P.liq].col : "#3a7ad0"; const lh = H * lev / 110; c.globalAlpha = 0.7; c.fillRect(cx - 25, top + H - lh, 50, lh); c.globalAlpha = 1; for (let k = 0; k <= 100; k += 10) { const y = top + H - H * k / 110; c.fillStyle = "#cfd8ea"; c.fillRect(cx + 16, y, 10, 1); if (k % 20 === 0) TX(c, String(k), cx + 30, y + 4, "#8fa0bf", "left", "10px"); } if (P.kind === "irregular") { const o = IRR[P.obj]; c.fillStyle = o.col; c.beginPath(); c.ellipse(cx, top + H - 12, 14, 10, 0, 0, 6.3); c.fill(); if (P.method === "eureka") { c.strokeStyle = "#cfd8ea"; c.strokeRect(cx + 70, top + 40, 70, 90); c.beginPath(); c.moveTo(cx + 70, top + 60); c.lineTo(cx + 40, top + 50); c.stroke(); TX(c, "eureka can", cx + 105, top + 30, "#8fa0bf", "center", "11px"); TX(c, "some water stays in the spout", cx + 105, top + 148, "#ffb347", "center", "11px"); } } TX(c, "cm³", cx, top - 8, "#8fa0bf", "center", "11px"); }
  // results table
  const tx = w * 0.42, adv = ui.level === "adv";
  TX(c, "Results (newest first)", tx, y0 - 30, "#eef2f8", "left", "600 14px");
  TX(c, "what", tx, y0 - 8, "#8fa0bf", "left", "11.5px"); TX(c, "mass (g)", tx + 230, y0 - 8, "#8fa0bf", "right", "11.5px"); TX(c, "volume (cm³)", tx + 330, y0 - 8, "#8fa0bf", "right", "11.5px"); TX(c, "density (kg/m³)", tx + 450, y0 - 8, "#8fa0bf", "right", "11.5px");
  rows.slice(0, 16).forEach((q, i) => { const y = y0 + 14 + i * 20; TX(c, q.what, tx, y, "#cfd8ea", "left", "11.5px"); TX(c, q.m.toFixed(2), tx + 230, y, "#cfd8ea", "right", "12px"); TX(c, q.V.toFixed(q.kind === "block" ? 3 : 1), tx + 330, y, "#cfd8ea", "right", "12px"); TX(c, q.rho.toFixed(0), tx + 450, y, Math.abs(q.rho / q.truth - 1) < 0.03 ? "#7ee787" : "#ffb347", "right", "600 12px"); });
  if (!rows.length) TX(c, "Press 📏 Measure (or ×5) to take readings", tx, y0 + 20, "#ffd166", "left", "13px");
  TX(c, "Density = mass ÷ volume", 14, 26, "#eef2f8", "left", "600 15px");
  if (adv && P.kind === "block") { const t = TOOL[P.tool], pc = 3 * (t.res / 2) / (P.side * 10) * 100; TX(c, `% uncertainty: side ±${(t.res / 2).toFixed(2)} mm in ${P.side * 10} mm → volume ±${pc.toFixed(1)}%`, 14, 48, "#ffd166", "left", "12.5px"); }
}
function drawPressure(c, w, h) {
  const F = P.pm * g, p = F / P.pA, sink = p > SNOW ? Math.min(90, 25 * Math.log10(p / SNOW) + 10) : 2 * p / SNOW, gy = h * 0.62;
  c.fillStyle = "#e8eef8"; c.fillRect(0, gy, w, h - gy); c.fillStyle = "#c8d4e6"; c.fillRect(0, gy, w, 6);
  const fw = Math.max(6, Math.min(w * 0.6, Math.sqrt(P.pA) * 900)), cx = w / 2;
  c.fillStyle = "#b0bccc"; c.fillRect(cx - fw / 2 - 6, gy - 2, fw + 12, sink + 4);
  c.fillStyle = "#6b4a2a"; c.fillRect(cx - fw / 2, gy - 18 + sink, fw, 18);
  // force arrow
  const al = Math.min(220, 30 + 40 * Math.log10(1 + F)); c.strokeStyle = "#ff8a70"; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, gy - 30 - al); c.lineTo(cx, gy - 30); c.stroke(); c.fillStyle = "#ff8a70"; c.beginPath(); c.moveTo(cx - 9, gy - 40); c.lineTo(cx + 9, gy - 40); c.lineTo(cx, gy - 26); c.fill(); c.lineWidth = 1;
  TX(c, `force ${F < 100 ? F.toFixed(1) : F.toFixed(0)} N`, cx + 14, gy - 40 - al / 2, "#ff8a70", "left", "600 14px");
  TX(c, `${OBJ[P.pobj].name} on soft snow`, 14, 26, "#eef2f8", "left", "600 15px");
  TX(c, `p = F ÷ A = ${F.toFixed(F < 100 ? 1 : 0)} N ÷ ${P.pA.toExponential(2)} m² = ${p >= 1e6 ? (p / 1e6).toFixed(1) + " MPa" : (p / 1000).toFixed(p < 1e4 ? 2 : 0) + " kPa"}`, 14, 52, "#ffd166", "left", "600 15px");
  TX(c, p > SNOW ? `sinks in: above the ${SNOW / 1000} kPa that soft snow can hold` : "stays on top: below the 3 kPa that soft snow can hold", 14, 76, p > SNOW ? "#ff8a70" : "#7ee787", "left", "13px");
}
function drawLiquid(c, w, h) {
  const L = LIQ[P.tliq], maxD = P.sea ? 200 : 1, x0 = 80, y0 = 80, H = h - 140, W = P.sea ? w - 160 : 260, Y = d => y0 + H * d / maxD;
  c.fillStyle = L.col; c.globalAlpha = 0.75; c.fillRect(x0, y0, W, H); c.globalAlpha = 1; c.strokeStyle = "#cfd8ea"; c.lineWidth = 3; c.strokeRect(x0, y0 - 10, W, H + 10); c.lineWidth = 1;
  for (let k = 0; k <= 5; k++) { const d = maxD * k / 5; TX(c, (P.sea ? d.toFixed(0) : d.toFixed(1)) + " m", x0 - 8, Y(d) + 4, "#8fa0bf", "right", "11px"); }
  if (!P.sea) { // three jets: faster from deeper holes (Torricelli v = √(2gh))
    [0.25, 0.5, 0.75].forEach(d => { const v = Math.sqrt(2 * g * d), y = Y(d); c.strokeStyle = L.col; c.lineWidth = 3; c.beginPath(); for (let t = 0; t < 0.5; t += 0.01) { const xx = x0 + W + v * t * 160, yy = y + 0.5 * g * t * t * 160; if (yy > h - 20) break; t ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); c.lineWidth = 1; });
    TX(c, "deeper hole → faster jet", x0 + W + 30, y0 + 10, "#cfd8ea", "left", "12px");
  } else { [["diver (40 m)", 40], ["submarine (150 m)", 150]].forEach(([n, d]) => { c.fillStyle = "#ffd166"; c.fillRect(x0 + W - 160, Y(d) - 4, 40, 8); TX(c, n, x0 + W - 112, Y(d) + 4, "#eef2f8", "left", "11.5px"); }); }
  // the pressure sensor: same reading whichever way it faces
  const sy = Y(P.depth), sx = x0 + W * 0.35, fa = (P.face || 0) * Math.PI / 180; c.fillStyle = "#222"; c.beginPath(); c.arc(sx, sy, 10, 0, 6.3); c.fill(); c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(fa) * 18, sy + Math.sin(fa) * 18); c.stroke(); c.lineWidth = 1; c.strokeStyle = "#555"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, y0 - 20); c.stroke();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, l = 8 + 30 * P.depth / maxD; c.strokeStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.moveTo(sx + Math.cos(a) * (14 + l), sy + Math.sin(a) * (14 + l)); c.lineTo(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14); c.stroke(); }
  const p = P.depth * L.rho * g / 1000;
  TX(c, `${L.name} · sensor ${P.sea ? P.depth.toFixed(0) : P.depth.toFixed(2)} m down`, 14, 26, "#eef2f8", "left", "600 15px");
  TX(c, `Δp = hρg = ${P.sea ? P.depth.toFixed(0) : P.depth.toFixed(2)} × ${L.rho} × 9.81 = ${p >= 100 ? p.toFixed(0) : p.toFixed(2)} kPa${ui.level === "adv" ? ` · total with the atmosphere ${(p + 101.3).toFixed(1)} kPa` : ""}`, 14, 50, "#ffd166", "left", "600 14px");
}
function drawFloat(c, w, h) {
  const L = LIQ[P.fliq], sc = 1400, sy = h * 0.45, cx = w * 0.4, s = CUBE * sc;
  const y = P.hang ? CUBE + 0.03 : fl.y;
  c.fillStyle = L.col; c.globalAlpha = 0.7; c.fillRect(60, sy, w - 120, h - sy - 20); c.globalAlpha = 1;
  const top = sy + (y - CUBE) * sc, under = Math.max(0, Math.min(CUBE, y)), U = L.rho * g * CUBE * CUBE * under, Wt = P.frho * g * CUBE ** 3;
  if (P.hang) { c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(cx, 20); c.lineTo(cx, top); c.stroke(); c.fillStyle = "#2a3448"; c.fillRect(cx - 30, 20, 60, 34); TX(c, (Wt - U).toFixed(2) + " N", cx, 43, "#7ee787", "center", "600 13px"); }
  c.fillStyle = "#c8a070"; c.fillRect(cx - s / 2, top, s, s); c.strokeStyle = "#0b1020"; c.strokeRect(cx - s / 2, top, s, s);
  const ar = (x, y1, len, col, lab) => { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y1 + len); c.stroke(); c.beginPath(); const d = Math.sign(len); c.moveTo(x - 8, y1 + len - d * 10); c.lineTo(x + 8, y1 + len - d * 10); c.lineTo(x, y1 + len); c.fill(); c.lineWidth = 1; TX(c, lab, x + 12, y1 + len / 2, col, "left", "600 12px"); };
  const k = 9;   // pixels per newton
  ar(cx + s / 2 + 30, top + s / 2, Wt * k > 200 ? 200 : Wt * k, "#ff8a70", `weight ${Wt.toFixed(2)} N`);
  if (U > 0.01) { ar(cx - s / 2 - 40, top + s / 2, -Math.min(200, U * k), "#5ad1ff", ""); TX(c, `upthrust ${U.toFixed(2)} N`, cx - s / 2 - 52, top + s / 2 - Math.min(200, U * k) / 2, "#5ad1ff", "right", "600 12px"); }
  TX(c, `${P.frho} kg/m³ cube in ${L.name} (${L.rho} kg/m³)`, 14, 26, "#eef2f8", "left", "600 15px");
  TX(c, P.frho < L.rho ? `floats with ${(fracUnder(P.frho, L.rho) * 100).toFixed(0)}% under the surface (ρcube ÷ ρliquid)` : "denser than the liquid: it sinks", 14, 50, P.frho < L.rho ? "#7ee787" : "#ff8a70", "left", "600 14px");
}
function drawSphere(c, w, h) {
  const L = LIQ[P.bliq], x0 = w * 0.18, tw = 80, y0 = 50, H = h - 80, Y = d => y0 + H * d;
  c.fillStyle = L.col; c.globalAlpha = 0.6; c.fillRect(x0, y0, tw, H); c.globalAlpha = 1; c.strokeStyle = "#cfd8ea"; c.strokeRect(x0, y0 - 10, tw, H + 10);
  [0.4, 0.8].forEach(d => { c.strokeStyle = "#ff6b81"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(x0 - 20, Y(d)); c.lineTo(x0 + tw + 20, Y(d)); c.stroke(); c.setLineDash([]); TX(c, `${d * 100} cm ${P.timer === "gates" ? "light gate" : "mark"}`, x0 + tw + 26, Y(d) + 4, "#ff6b81", "left", "11.5px"); });
  const by = Y(fall.y), br = Math.max(3, P.br * 2.5); c.fillStyle = BALL[P.ball].rho > 5000 ? "#cfd4dc" : BALL[P.ball].rho > 2000 ? "#bfe8ff" : "#f0e8d0"; c.beginPath(); c.arc(x0 + tw / 2, by, br, 0, 6.3); c.fill();
  // forces to scale (relative to the weight)
  const r = P.br / 1000, Wt = BALL[P.ball].rho * 4 / 3 * Math.PI * r ** 3 * g, U = L.rho / BALL[P.ball].rho * Wt, D = dragF(fall.v, r, L), sc = 90 / Wt, ax = x0 + tw + 140;
  [["weight", Wt, "#ff8a70", 1], ["upthrust", U, "#5ad1ff", -1], ["drag", D, "#ffd166", -1]].forEach(([n, f, col, d], i) => { const x = ax + i * 90; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(x, h / 2); c.lineTo(x, h / 2 + d * f * sc); c.stroke(); c.lineWidth = 1; TX(c, n, x, h / 2 + (d > 0 ? -10 : 18), col, "center", "600 12px"); });
  TX(c, "forces on the ball (to scale)", ax + 90, h / 2 - 120, "#cfd8ea", "center", "12px");
  TX(c, `${P.br} mm ${BALL[P.ball].name} ball in ${L.name} (η = ${L.eta} Pa s)`, 14, 26, "#eef2f8", "left", "600 15px");
  TX(c, `speed ${(fall.v * 100).toFixed(2)} cm/s · terminal ${(fall.vt * 100).toFixed(2)} cm/s${fall.vm ? ` · timed ${(fall.vm * 100).toFixed(2)} cm/s` : ""}`, 14, 48, "#ffd166", "left", "600 13px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ density: drawDensity, pressure: drawPressure, liquid: drawLiquid, float: drawFloat, sphere: drawSphere })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const adv = ui.level === "adv";
  if (P.view === "density") {
    const own = rows.filter(q => P.kind === q.kind), truth = P.kind === "block" ? MAT[P.mat] : P.kind === "irregular" ? IRR[P.obj].rho : LIQ[P.liq].rho;
    chA.opts.title = "Your density results"; chA.opts.xLabel = "measurement (oldest → newest)"; chA.opts.yLabel = "kg/m³";
    chA.draw([{ pts: own.slice().reverse().map((q, i) => [i + 1, q.rho]), type: "dots", r: 4, color: "#ffd166", label: "your results" }, ...(adv && P.kind === "block" ? [{ pts: own.slice().reverse().map((q, i) => [i + 1, q.rho * (1 + 3 * (TOOL[P.tool].res / 2) / (P.side * 10))]), type: "dots", r: 1.5, color: "#ffb347", label: "± % uncertainty" }, { pts: own.slice().reverse().map((q, i) => [i + 1, q.rho * (1 - 3 * (TOOL[P.tool].res / 2) / (P.side * 10))]), type: "dots", r: 1.5, color: "#ffb347" }] : [])], { xMin: 0, hlines: [{ y: truth, color: "#7ee787", label: "data book " + truth }] });
    const mv = own.map(q => [q.V, q.m]); chB.opts.title = "Mass against volume"; chB.opts.xLabel = "volume (cm³)"; chB.opts.yLabel = "mass (g)";
    const vmax = Math.max(1, ...own.map(q => q.V)); chB.draw([{ pts: mv.length ? mv : [[0, 0]], type: "dots", r: 4, color: "#5ad1ff", label: "results" }, { pts: [[0, 0], [vmax * 1.1, truth / 1000 * vmax * 1.1]], color: "#7ee787", label: "gradient = density" }], { xMin: 0, yMin: 0 });
    const vals = own.map(q => q.rho), mean = vals.length ? K.mean(vals) : 0, sd = vals.length > 1 ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1)) : 0;
    relabel(["measurements", "mean density", "spread (SD)", "data book", adv ? "% difference from data book" : "error"]);
    read.set("a", String(vals.length)); read.set("b", vals.length ? mean.toFixed(0) + " kg/m³" : "–"); read.set("c", vals.length > 1 ? sd.toFixed(0) + " kg/m³" : "–"); read.set("d", truth + " kg/m³"); read.set("e", vals.length ? ((mean / truth - 1) * 100).toFixed(1) + "%" : "–");
  } else if (P.view === "pressure") {
    const F = P.pm * g, line = []; for (let la = -7; la <= 0; la += 0.1) line.push([la, Math.log10(F / 10 ** la)]);
    chA.opts.title = "Pressure against area (same force)"; chA.opts.xLabel = "log₁₀(area / m²)"; chA.opts.yLabel = "log₁₀(p / Pa)";
    chA.draw([{ pts: line, color: "#ffd166", label: `F = ${F.toFixed(0)} N` }, { pts: [[Math.log10(P.pA), Math.log10(F / P.pA)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: -7, xMax: 0, hlines: [{ y: Math.log10(SNOW), color: "#5ad1ff", label: "soft snow 3 kPa" }] });
    const ks = Object.keys(OBJ); chB.opts.title = "Pressure of each (log₁₀ Pa)"; chB.opts.xLabel = ks.map((k, i) => i + " " + k).join(" · "); chB.opts.yLabel = "log₁₀(p / Pa)";
    chB.draw(ks.map((k, i) => ({ pts: [[i, Math.log10(OBJ[k].m * g / OBJ[k].A)]], type: "bars", w: 0.6, color: ["#7ee787", "#5ad1ff", "#ff8a70", "#c58aff", "#ffd166", "#ff6b6b"][i], label: k })), { xMin: -0.6, xMax: ks.length - 0.4, yMin: 0 });
    relabel(["force (weight)", "area", "pressure", "compared with snow (3 kPa)", ""]);
    read.set("a", (F < 100 ? F.toFixed(1) : F.toFixed(0)) + " N"); read.set("b", P.pA.toExponential(2) + " m²"); read.set("c", (F / P.pA / 1000).toPrecision(3) + " kPa"); read.set("d", "× " + (F / P.pA / SNOW).toPrecision(2)); read.set("e", "");
  } else if (P.view === "liquid") {
    const L = LIQ[P.tliq], maxD = P.sea ? 200 : 1, th = [[0, 0], [maxD, maxD * L.rho * g / 1000]];
    let fitTxt = "–"; if (prs.length >= 2) { const f = K.linfit(prs); fitTxt = f.m.toFixed(2) + " kPa per m"; }
    chA.opts.title = "Pressure against depth"; chA.opts.xLabel = "depth (m)"; chA.opts.yLabel = "kPa";
    chA.draw([{ pts: th, color: "#7ee787", label: "hρg" }, ...(adv ? [{ pts: th.map(([d, p]) => [d, p + 101.3]), color: "#ffb347", dash: [4, 3], label: "total (+ atmosphere)" }] : []), { pts: prs.length ? prs : [[0, 0]], type: "dots", r: 4, color: "#ffd166", label: "your readings" }], { xMin: 0, xMax: maxD, yMin: 0 });
    const ls = ["water", "sea", "oil", "mercury"]; chB.opts.title = `Pressure at ${P.sea ? P.depth.toFixed(0) : P.depth.toFixed(2)} m in each liquid`; chB.opts.xLabel = ls.map((k, i) => i + " " + LIQ[k].name).join(" · "); chB.opts.yLabel = "kPa";
    chB.draw(ls.map((k, i) => ({ pts: [[i, P.depth * LIQ[k].rho * g / 1000]], type: "bars", w: 0.6, color: ["#3a7ad0", "#2a6aa0", "#b8b040", "#b0b4bc"][i], label: LIQ[k].name })), { xMin: -0.6, xMax: 3.6, yMin: 0 });
    relabel(["depth", "pressure from the liquid", "readings taken", "gradient of your readings", adv ? "total pressure" : "ρg (theory gradient)"]);
    const p = P.depth * L.rho * g / 1000; read.set("a", (P.sea ? P.depth.toFixed(0) : P.depth.toFixed(2)) + " m"); read.set("b", p.toFixed(2) + " kPa"); read.set("c", String(prs.length)); read.set("d", fitTxt); read.set("e", adv ? (p + 101.3).toFixed(1) + " kPa" : (L.rho * g / 1000).toFixed(2) + " kPa per m");
  } else if (P.view === "float") {
    const L = LIQ[P.fliq], Wt = P.frho * g * CUBE ** 3, uL = [], wL = []; for (let d = 0; d <= 10; d += 0.5) { uL.push([d, L.rho * g * CUBE * CUBE * d / 100]); wL.push([d, Wt]); }
    const under = P.hang ? CUBE : Math.max(0, Math.min(CUBE, fl.y));
    chA.opts.title = "Weight and upthrust against depth under"; chA.opts.xLabel = "depth under the surface (cm)"; chA.opts.yLabel = "N";
    chA.draw([{ pts: uL, color: "#5ad1ff", label: "upthrust" }, { pts: wL, color: "#ff8a70", label: "weight" }, { pts: [[under * 100, L.rho * g * CUBE * CUBE * under]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 10, yMin: 0 });
    const fr = []; for (let rho = 100; rho <= 2000; rho += 25) fr.push([rho, 100 * fracUnder(rho, L.rho)]);
    chB.opts.title = "Percentage under the surface"; chB.opts.xLabel = "density of the cube (kg/m³)"; chB.opts.yLabel = "%"; chB.draw([{ pts: fr, color: "#7ee787", label: `in ${L.name}` }, { pts: [[P.frho, 100 * under / CUBE]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 100, xMax: 2000, yMin: 0, yMax: 105 });
    relabel(["weight", "upthrust", "% under the surface", "spring balance reading", "floats?"]);
    const U = L.rho * g * CUBE * CUBE * under; read.set("a", Wt.toFixed(2) + " N"); read.set("b", U.toFixed(2) + " N"); read.set("c", (100 * under / CUBE).toFixed(0) + "%"); read.set("d", P.hang ? (Wt - U).toFixed(2) + " N (weight − upthrust)" : "–"); read.set("e", P.frho < L.rho ? "yes" : "no: sinks");
  } else {
    const L = LIQ[P.bliq];
    chA.opts.title = "Speed against time"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "cm/s"; chA.draw([{ pts: fall.trace.map(([t, v]) => [t, v * 100]), color: "#ffd166", label: "speed" }], { xMin: 0, yMin: 0, yMax: fall.vt * 130 + 1e-3, hlines: [{ y: fall.vt * 100, color: "#7ee787", label: "terminal" }] });
    const mine = sph.filter(q => q.ball === P.ball && q.liq === P.bliq), stokes = []; for (let rr2 = 0; rr2 <= 25; rr2 += 0.1) stokes.push([rr2, vStokes(Math.sqrt(rr2) / 1000, P.ball, L) * 100]);
    chB.opts.title = "Your results: speed against r²"; chB.opts.xLabel = "r² (mm²)"; chB.opts.yLabel = "cm/s";
    chB.draw([{ pts: stokes, color: "#5ad1ff", dash: [4, 3], label: "Stokes v ∝ r²" }, { pts: mine.length ? mine.map(q => [q.r * q.r, q.v * 100]) : [[0, 0]], type: "dots", r: 5, color: "#ffd166", label: "timed" }], { xMin: 0, xMax: Math.max(...mine.map(q => q.r * q.r), P.br * P.br) * 1.25, yMin: 0, yMax: Math.max(...mine.map(q => q.v * 130), vStokes(Math.max(...mine.map(q => q.r), P.br) / 1000, P.ball, L) * 130) });
    let eta = "–"; if (mine.length >= 2) { const f = K.linfit(mine.map(q => [(q.r / 1000) ** 2, q.v]).concat([[0, 0]])); eta = (2 * g * (BALL[P.ball].rho - L.rho) / (9 * f.m)).toPrecision(3) + " Pa s"; }
    relabel(["speed now", "terminal velocity", "timed speed (40–80 cm)", "Stokes' law prediction", adv ? "η from your gradient" : "results"]);
    read.set("a", (fall.v * 100).toFixed(2) + " cm/s"); read.set("b", (fall.vt * 100).toFixed(2) + " cm/s"); read.set("c", fall.vm ? (fall.vm * 100).toFixed(2) + " cm/s" : "–"); read.set("d", (vStokes(P.br / 1000, P.ball, L) * 100).toFixed(2) + " cm/s"); read.set("e", adv ? eta + ` (true ${L.eta})` : String(mine.length));
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views at the top of the controls. Press 📏 Measure to start.", 6000);
