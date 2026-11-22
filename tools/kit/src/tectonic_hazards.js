/* =====================================================================
   TECTONIC HAZARDS
   The Earth's outer shell is broken into plates that move a few
   centimetres a year. Where they meet, stress builds up and is released
   in earthquakes; where plates sink or pull apart, rock melts and feeds
   volcanoes. Four views:
     * Plate boundaries: where earthquakes happen, and how deep
     * Earthquake waves: P and S waves travel at different speeds, so the
       gap between them tells a seismometer how far away the quake was
     * Tsunami: a wave that races across deep ocean and slows and grows
       on the shallow shelf (speed = √(g × depth))
     * Risk: the same earthquake kills far more people where buildings are
       weak and people cannot respond:  risk = hazard × vulnerability ÷ capacity
   ===================================================================== */

// ---- earthquake sizes: Gutenberg–Richter, ten times fewer for each step up in magnitude (b = 1) ----
const grMag = (r, mMin = 4) => Math.min(9.5, mMin - Math.log10(Math.max(1e-9, r())));

// ---- 1. plate boundaries (cross-sections, km) ----
const BND = {
  cons: { name: "Constructive (Iceland, mid-Atlantic)", short: "Constructive" },
  dest: { name: "Destructive: ocean under continent (the Andes)", short: "Destructive" },
  coll: { name: "Collision: continent meets continent (Himalaya)", short: "Collision" },
  consv: { name: "Conservative (San Andreas)", short: "Conservative" }
};
const X0 = 600;    // the boundary is in the middle of a 1200 km section
function quakeAt(type, angle, r) {   // where the next earthquake happens: [distance from the boundary (km), depth (km)]
  const tg = Math.tan(angle * Math.PI / 180);
  if (type === "cons") return [r.gauss() * 15, 2 + r() * 13];
  if (type === "consv") return [r() * 1100 - 550, 2 + r() * 18];        // anywhere along the fault, always shallow
  if (type === "coll") return [r.gauss() * 140, 5 + Math.pow(r(), 1.6) * 90];
  if (r() < 0.3) return [-30 + r() * 330, 5 + r() * 40];                      // shallow quakes in the overriding plate
  const d = Math.min(680, -Math.log(Math.max(1e-9, r())) * 170);              // along the sinking slab: the Benioff zone
  return [d / tg + r.gauss() * 10, d + r.gauss() * 8];
}
function benioffAngle(qs) { const s = qs.filter(q => q[1] > 60); if (s.length < 5) return null; const f = K.linfit(s.map(q => [q[0], q[1]])); return Math.atan(f.m) * 180 / Math.PI; }

// ---- 2. earthquake waves ----
const VP = 6.0, VS = 3.5, VR = 3.1;          // km/s in the crust
const SPK = VP * VS / (VP - VS);             // km per second of S − P time (8.4)
const STATIONS = [[120, 90, "A"], [480, 70, "B"], [300, 330, "C"]];   // seismometers on a 600 × 400 km map
function seismogram(dist, depth, M, t) {    // ground shaking at a station at time t (relative units, before scaling)
  const R = Math.hypot(dist, depth), tp = R / VP, ts = R / VS, tr = dist / VR + depth / VS * 0.3, amp = Math.pow(10, 0.5 * (M - 5)) / Math.max(20, R);
  const pkt = (t0, a, f, dur) => t < t0 ? 0 : a * Math.exp(-(t - t0) / dur) * Math.sin(2 * Math.PI * f * (t - t0));
  return amp * (pkt(tp, 0.25, 2.2, 6) + pkt(ts, 0.8, 1.2, 8) + pkt(tr, 1.6, 0.4, 14));
}
const mmi = (M, R) => Math.max(1, Math.min(12, 1.5 * M - 3.0 * Math.log10(Math.max(5, R)) + 1.5));   // Modified Mercalli intensity, a simple attenuation fit

// ---- 3. tsunami: the linear shallow-water equations along one line through the ocean ----
const G = 9.81;
const CASES_T = {
  own: { name: "Your own", L: 800, deep: 4000, shelf: 80, shelfD: 100, M: 9.0 },
  toh: { name: "Tōhoku 2011", L: 250, deep: 5500, shelf: 60, shelfD: 120, M: 9.1, fact: "Tōhoku, Japan, 11 March 2011: magnitude 9.1, about 70 km offshore. Waves reached the coast in about 30 minutes, with run-up of up to 40 m; about 18 000 people died. (USGS; Japan Meteorological Agency)" },
  io: { name: "Indian Ocean 2004 (Sumatra to Sri Lanka)", L: 1600, deep: 4000, shelf: 30, shelfD: 80, M: 9.1, fact: "Indian Ocean, 26 December 2004: magnitude 9.1 off Sumatra. The tsunami crossed the Bay of Bengal to Sri Lanka in about 2 hours, killing about 35 000 there and about 228 000 in all, mostly without warning. (USGS; UN)" }
};
function makeOcean(o) {
  const n = 400, dx = o.L * 1000 / n, h = [];
  for (let i = 0; i < n; i++) { const x = (i + 0.5) / n * o.L, fromCoast = o.L - x, slopeW = 40;
    let d = fromCoast < o.shelf ? Math.max(10, o.shelfD * fromCoast / Math.max(1, o.shelf) * 0.9 + 10) : fromCoast < o.shelf + slopeW ? o.shelfD + (o.deep - o.shelfD) * (fromCoast - o.shelf) / slopeW : o.deep; h.push(d); }
  const amp = 4 * Math.pow(10, 0.67 * (o.M - 9)), x0 = Math.min(o.L * 0.15, 60) * 1000, wd = 40000;
  const eta = h.map((_, i) => amp * Math.exp(-Math.pow(((i + 0.5) * dx - x0) / wd, 2))), u = new Float64Array(n + 1);
  return { n, dx, h, eta: Float64Array.from(eta), u, t: 0, amp, gauge: [], maxH: new Float64Array(n), dt: 0.5 * dx / Math.sqrt(G * Math.max(...h)) };
}
function oceanStep(s) {   // one time step: water slopes push the flow (u), the flow piles up or drains the surface (η)
  const { n, dx, h, eta, u, dt } = s;
  for (let i = 1; i < n; i++) u[i] -= G * dt * (eta[i] - eta[i - 1]) / dx;
  u[0] = -eta[0] * Math.sqrt(G / h[0]); u[n] = 0;                                   // open ocean on the left (waves leave), the coast on the right
  for (let i = 0; i < n; i++) { const hl = i ? (h[i - 1] + h[i]) / 2 : h[0], hr = i < n - 1 ? (h[i] + h[i + 1]) / 2 : h[i]; eta[i] -= dt * (hr * u[i + 1] - hl * u[i]) / dx; if (Math.abs(eta[i]) > s.maxH[i]) s.maxH[i] = Math.abs(eta[i]); }
  s.t += dt;
}
function arrivalAt(depth, distKm, r) {   // a flat ocean: time for the wave crest to travel distKm (for the batch run)
  const s = makeOcean({ L: distKm * 2.5, deep: depth, shelf: 0, shelfD: depth, M: 9 }); s.h = s.h.map(() => depth); s.dt = 0.5 * s.dx / Math.sqrt(G * depth);
  const x0 = Math.min(s.n * s.dx * 0.15, 60000), target = Math.floor((x0 + distKm * 1000) / s.dx); let best = 0, tb = 0;
  for (let k = 0; k < 20000 && s.t < 3 * distKm * 1000 / Math.sqrt(G * depth); k++) { oceanStep(s); if (s.eta[target] > best) { best = s.eta[target]; tb = s.t; } }
  return tb * (1 + 0.01 * r.gauss());
}

// ---- 4. risk: a city of 40 districts shaken by an earthquake ----
const CASES_R = {
  own: { name: "Your own", M: 7.0, depth: 15, dist: 25, pop: 1.5, V: 0.6, C: 0.4 },
  haiti: { name: "Haiti 2010", M: 7.0, depth: 13, dist: 25, pop: 2.5, V: 0.9, C: 0.12, real: "Haiti, 12 January 2010: magnitude 7.0, 13 km deep, 25 km from Port-au-Prince. Death toll estimates range from about 46 000 to 316 000 (the government figure); 1.5 million homeless. Most buildings were unreinforced concrete blocks, with no building code enforced. (USGS; Government of Haiti; USAID)" },
  chile: { name: "Chile 2010", M: 8.8, depth: 35, dist: 100, pop: 1.0, V: 0.12, C: 0.85, real: "Maule, Chile, 27 February 2010: magnitude 8.8, about 500 times more energy than Haiti, 100 km from Concepción. 525 people died, many in the tsunami. Chile has strict building codes, enforced since the 1960 earthquake. (USGS; Government of Chile)" },
  chch: { name: "Christchurch 2011", M: 6.2, depth: 5, dist: 7, pop: 0.38, V: 0.22, C: 0.85, real: "Christchurch, New Zealand, 22 February 2011: magnitude 6.2, only 5 km deep and 7 km from the centre. 185 people died, 115 in one building (CTV). Liquefaction of soft sediment damaged 60 000 homes. (GeoNet; NZ Government)" },
  nepal: { name: "Nepal 2015", M: 7.8, depth: 15, dist: 80, pop: 2.5, V: 0.45, C: 0.3, real: "Gorkha, Nepal, 25 April 2015: magnitude 7.8, about 80 km from Kathmandu. About 9000 people died; landslides and avalanches cut off mountain villages, and the monsoon slowed recovery. (USGS; Government of Nepal)" }
};
function cityQuake(o, r) {
  const ds = []; let deaths = 0, collapsed = 0, maxI = 0;
  for (let k = 0; k < 40; k++) {
    const gx = k % 8, gy = Math.floor(k / 8), soft = gx >= 5 && gy >= 2, R = Math.hypot(o.dist + (gx - 3.5) * 3, (gy - 2) * 3, o.depth);   // districts 3 km apart; the bottom-right ones are on soft sediment
    const I = mmi(o.M, R) + (soft ? 1 : 0) + 0.3 * r.gauss(), m50 = 11.3 - 4.6 * o.V, p = 1 / (1 + Math.exp(-(I - m50) / 0.45));            // share of buildings that collapse (a fragility curve)
    const pop = o.pop * 1e6 / 40 * (0.6 + 0.8 * ((k * 37) % 11) / 10), dead = pop * p * 0.085 * (1 - 0.65 * o.C);                         // capacity: rescue, hospitals, preparedness
    ds.push({ I, p, dead, soft }); deaths += dead; collapsed += p / 40; if (I > maxI) maxI = I;
  }
  return { ds, deaths, collapsed, maxI };
}

// ---------------- The page ----------------
const P = { mode: "bound", type: "dest", angle: 45, speed: 6, eqM: 6.5, eqD: 15, ex: 260, ey: 190, tcase: "own", tL: 800, deep: 4000, shelf: 80, shelfD: 100, tM: 9.0, rcase: "haiti", M: 7.0, depth: 13, dist: 25, pop: 2.5, V: 0.9, C: 0.12 };
let rnd = K.rng(Date.now() % 99991 + 37), sp = 1, quakes = [], yr = 0, strain = 0, rebound = 0, stripeT = 0, wt = 0, ocean = null, city = null, cityT = 0;
const ui = K.app({
  title: "Tectonic Hazards", subject: "Geography",
  blurb: "Plate boundaries, earthquake waves, tsunamis and why the same quake kills more in poorer places",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Introduction", adv: "Advanced (A level)", specs: { std: "A gentle introduction: as far as we know tectonic hazards are not in Pearson Edexcel GCSE Geography A (1GA0), though they are in other GCSE specifications (for example AQA and Edexcel B). Plate boundaries, earthquakes, tsunamis and why rich and poor countries are affected differently.", adv: "Pearson Edexcel A level Geography (9GE0) Topic 1 Tectonic processes and hazards: plate boundaries and the theory of plate movement (Benioff zones, sea-floor spreading, palaeomagnetism), earthquake waves and magnitude, tsunamis, disaster risk (risk = hazard × vulnerability ÷ capacity), and case studies." } },
  missions: [
    { title: "Where do earthquakes happen?", q: "Run each type of plate boundary for a while. Where are the earthquakes, and how deep? Which boundary has the deepest ones?", hint: "Constructive and conservative boundaries have only shallow earthquakes (less than about 20 km). At a destructive boundary the earthquakes follow the sinking oceanic plate down into the mantle, some as deep as 700 km: a sloping band called the Benioff zone. Collision zones have shallow to intermediate quakes spread over a wide area.", setup() { set({ mode: "bound", type: "cons" }); } },
    { title: "Why volcanoes form where they do", q: "On the destructive boundary, find where the volcanoes are. How far are they from the trench, and how deep is the slab beneath them?", hint: "Volcanoes grow where the sinking slab reaches about 100 km depth: there, water driven out of the slab lowers the melting point of the mantle above, and magma rises. A steeper slab reaches 100 km sooner, so the volcanoes are closer to the trench. At constructive boundaries magma rises where the plates pull apart.", setup() { set({ mode: "bound", type: "dest" }); } },
    { title: "Elastic rebound", q: "Watch the conservative boundary from above. What happens to the fences that cross the fault before an earthquake, and during it?", hint: "The plates are locked at the fault, so the rock on each side bends (stores elastic strain) as the plates keep moving. When the strain is too great, the fault slips suddenly and the rock springs back: an earthquake. The fences are left offset. The 1906 San Francisco earthquake moved fences by up to 6 m.", setup() { set({ mode: "bound", type: "consv" }); } },
    { title: "P waves and S waves", q: "Set off an earthquake and watch the waves spread. Which arrives first at each seismometer? Why does the gap between them grow with distance?", hint: "P (primary) waves travel at about 6 km/s, S (secondary) waves at about 3.5 km/s, so the further away a station is, the more the S wave lags. Each second of S − P gap means about 8.4 km of distance. Surface waves arrive last and shake the most.", setup() { set({ mode: "waves" }); } },
    { title: "Find the epicentre", q: "Read the S − P time at each of the three seismometers and turn it into a distance. Where do the three circles cross?", hint: "Distance = S − P time × 8.4 km/s. One station tells you how far, but not which direction: a circle. Two circles cross at two points; the third picks the right one. That is triangulation, used by seismologists since the early 1900s.", setup() { set({ mode: "waves", ex: 380, ey: 250 }); } },
    { title: "A tsunami crosses the ocean", q: "Watch the Indian Ocean tsunami cross from Sumatra to Sri Lanka. How fast does it go in the deep ocean, and how high is it there? What happens on the shelf?", hint: "In 4000 m of water the wave travels at √(9.81 × 4000) ≈ 200 m/s (720 km/h, as fast as a jet) but is less than a metre high, so ships do not notice it. On the shallow shelf it slows down, the back catches up with the front, and the wave grows several times taller.", setup() { set({ mode: "tsunami", tcase: "io" }); } },
    { title: "Close to the source", q: "Now run Tōhoku 2011. How long did people on the coast have before the wave arrived?", hint: "Only about 20–30 minutes, because the earthquake was so close to the coast. Japan's warnings, sea walls and evacuation drills saved many lives, but some walls were overtopped. Distance from the source is a huge part of the risk.", setup() { set({ mode: "tsunami", tcase: "toh" }); } },
    { title: "Haiti and Chile", q: "Shake the Haiti city with its 2010 earthquake, then the Chile city with its much bigger one. Compare the deaths. Why the difference?", hint: "Chile's earthquake released about 500 times more energy, yet killed far fewer people. Haiti's buildings were weak (high vulnerability), its government and emergency services had little capacity, and the quake was shallow and close to the capital. Disaster risk = hazard × vulnerability ÷ capacity: the hazard is only part of it.", setup() { set({ mode: "risk", rcase: "haiti" }); } },
    { lvl: "adv", title: "Measure the Benioff zone", q: "Let a few hundred earthquakes build up on the destructive boundary. Use the line of best fit on the depth graph to find the angle of the slab. Then make the slab steeper and do it again.", hint: "The quakes deeper than 60 km lie along the top of the sinking slab. The gradient of depth against distance is tan(angle): the fitted angle matches the slab angle you set, within a few degrees. Old, cold, dense ocean plates sink more steeply (like the Mariana trench); young warm ones sink at a shallow angle (like Chile).", setup() { set({ mode: "bound", type: "dest", speed: 12 }); } },
    { lvl: "adv", title: "Soft sediment", q: "In the risk view, look at the districts on soft sediment (bottom right). Why do they suffer more, even at the same distance?", hint: "Soft, wet sediment amplifies shaking (about one intensity level here) and can liquefy, as in Christchurch 2011 and Mexico City 1985 (the old lake bed). Land-use zoning that keeps important buildings off soft ground lowers vulnerability.", setup() { set({ mode: "risk", rcase: "chch" }); } }
  ],
  batch: [
    { title: "How often do big earthquakes happen?", question: "How many earthquakes of at least each magnitude are in a catalogue of 10 000 quakes of magnitude 4 or more?", how: "Each run draws a new catalogue from the Gutenberg–Richter law with b = 1. Plotted as log₁₀ of the number at or above each magnitude. Theory: log N = 4 − (M − 4).", xLabel: "magnitude M", yLabel: "log₁₀ (number of quakes ≥ M)", xs: [4, 4.5, 5, 5.5, 6, 6.5, 7], reps: 5, theory: m => 8 - m, theoryLabel: "Gutenberg–Richter", run: (x, r) => { let c = 0; for (let k = 0; k < 10000; k++) if (grMag(r) >= x) c++; return c ? Math.log10(c) : null; }, note: "A straight line: each step of one magnitude has ten times fewer earthquakes. The world has about 13 000 quakes of magnitude 4–4.9 a year, about 15 of 7 or more and about 1 of 8 or more (USGS)." },
    { title: "Distance from the S − P time", question: "How well does the S − P time give the distance to an earthquake?", how: "Stations from 50 to 600 km away; each reading of the P and S arrivals has a ±0.5 s error. Distance = (S − P) × 8.4 km/s. Theory: the true distance.", xLabel: "true distance (km)", yLabel: "distance from S − P (km)", xs: [50, 100, 200, 300, 400, 500, 600], reps: 5, theory: d => d, theoryLabel: "true distance", fit: true, run: (x, r) => { const R = Math.hypot(x, 10), sp2 = R / VS - R / VP + 0.5 * r.gauss() * Math.SQRT2; return Math.sqrt(Math.max(0, (sp2 * SPK) ** 2 - 100)); }, note: "A straight line with gradient 1: the method works at any distance, with an error of a few km from reading the arrivals." },
    { title: "Tsunami speed and ocean depth", question: "How fast does a tsunami travel in water of different depths?", how: "A wave crossing 300 km of flat ocean; speed = distance ÷ time for the crest. Theory: v = √(g d).", xLabel: "ocean depth (m)", yLabel: "speed (m/s)", xs: [100, 500, 1000, 2000, 3000, 4000, 5000, 6000], reps: 2, yMin: 0, theory: d => Math.sqrt(G * d), theoryLabel: "√(g d)", run: (x, r) => 300000 / arrivalAt(x, 300, r), note: "Speed grows as the square root of depth: about 240 m/s over the deepest ocean, only about 30 m/s on a 100 m shelf." },
    { title: "Growing on the shelf", question: "How much taller does the tsunami get on shelves of different depth?", how: "A wave from 4000 m deep water onto a shelf of the chosen depth (80 km wide, with a 40 km slope). The shelf shelves gently towards the coast. Ratio = highest wave over the middle of the shelf ÷ highest in the deep ocean. Theory: Green's law (deep ÷ shallow)^¼, using the depth at that point.", xLabel: "shelf depth (m)", yLabel: "height on shelf ÷ height in deep water", xs: [50, 100, 200, 400, 800, 1500], reps: 2, yMin: 0, theory: d => Math.pow(4000 / (0.45 * d + 10), 0.25), theoryLabel: "Green's law", run: (x, r) => { const s = makeOcean({ L: 800, deep: 4000, shelf: 80, shelfD: x, M: 9 }); const T = 2 * 800000 / Math.sqrt(G * x); while (s.t < T) oceanStep(s); const mid = Math.floor(s.n * (1 - 40 / 800)), deepI = Math.floor(s.n * 0.5); return s.maxH[mid] / s.maxH[deepI] * (1 + 0.01 * r.gauss()); }, note: "The shallower the shelf, the more the wave grows. Some energy is reflected at the shelf edge, so on shallow shelves the growth is less than Green's law alone predicts." },
    { lvl: "adv", title: "Measuring the Benioff zone", question: "From a catalogue of earthquakes at a destructive boundary, how accurately can the slab angle be found?", how: "Each run: 300 earthquakes on a slab dipping at 45°; a line of best fit through those deeper than 60 km gives the angle.", reps: 60, bins: 16, theory: 45, theoryLabel: "true angle", yLabel: "fitted slab angle (°)", run: (x, r) => { const qs = []; for (let k = 0; k < 300; k++) qs.push(quakeAt("dest", 45, r)); return benioffAngle(qs); }, note: "The fitted angles cluster around 45°, with a spread of a degree or two from the scatter of the earthquake locations." },
    { title: "Does stronger building save lives?", question: "For the same magnitude 7.0 earthquake under a city of 1.5 million, how do deaths depend on the vulnerability of its buildings?", how: "Vulnerability from 0.1 (strong, enforced building codes) to 0.9 (weak, unreinforced); capacity 0.4; 4 earthquakes each (shaking varies a little).", xLabel: "vulnerability", yLabel: "deaths (thousands)", xs: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], reps: 4, yMin: 0, run: (x, r) => cityQuake(Object.assign({}, CASES_R.own, { V: x }), r).deaths / 1000, note: "Deaths rise steeply with vulnerability: the same hazard becomes a catastrophe where buildings are weak. Building codes, and enforcing them, are the most effective way to cut earthquake deaths." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Introduction", text: "Plates move because of convection in the mantle and the pull of sinking slabs. Boundaries: constructive (apart), destructive (one sinks), collision (continents crumple into mountains), conservative (slide past)." },
      { lvl: "std", tag: "Introduction", text: "The focus is where an earthquake starts underground; the epicentre is the point on the surface above it. Magnitude measures the energy released; each step of one is about 32 times more energy." },
      { lvl: "std", tag: "Introduction", text: "Tsunamis are caused when an earthquake lifts the sea floor. They are fast and low in deep water and slow down and grow tall on reaching the shallow coast." },
      { lvl: "std", tag: "Introduction", text: "The same hazard has very different effects in different places: building quality, warnings, preparation and emergency services matter as much as magnitude." },
      { lvl: "adv", tag: "9GE0 1.2", text: "Benioff zone: earthquakes along the sinking slab at destructive margins, down to 700 km. Volcanoes form where the slab reaches about 100 km. Sea-floor spreading and palaeomagnetic stripes support plate tectonics." },
      { lvl: "adv", tag: "9GE0 1.3", text: "P waves (fastest, compressional), S waves (slower, shear, not through liquids), surface waves (slowest, most damaging). Distance from S − P time; triangulation with three stations locates the epicentre." },
      { lvl: "adv", tag: "9GE0 1.3", text: "Tsunami speed = √(g d): about 200 m/s in 4000 m of water. Wave height grows in shallow water (Green's law, height ∝ d^(−¼))." },
      { lvl: "adv", tag: "9GE0 1.4", text: "Disaster risk = hazard × vulnerability ÷ capacity. The Pressure and Release model links vulnerability to root causes; the Park model shows response and recovery over time." },
      { lvl: "adv", tag: "9GE0 1.4", text: "Gutenberg–Richter: log N = a − bM with b ≈ 1, so large earthquakes are rare but release most of the energy." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why earthquakes are shallow at constructive plate boundaries.", ans: "<ul><li>the plates are thin and hot at the ridge</li><li>rock is brittle only near the surface, so it breaks only at shallow depths</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why tsunamis are dangerous at the coast even though they are small in the open ocean.", ans: "<ul><li>in shallow water the wave slows down</li><li>the water behind catches up, so the wave grows much taller</li><li>it carries huge volumes of water far inland, with debris</li></ul>" },
      { lvl: "std", marks: 4, q: "Suggest why the 2010 earthquake in Haiti caused far more deaths than the larger 2010 earthquake in Chile.", ans: "<ul><li>Haiti's buildings were poorly built, without enforced codes; Chile has strict codes</li><li>Haiti's quake was shallow and close to the capital</li><li>Haiti had little capacity: few emergency services, poor government, poverty</li><li>Chile was better prepared (drills, warnings)</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `A seismometer records an S − P gap of ${(P.dist / SPK + 0.0).toFixed(1)} s. Using 8.4 km per second of gap, calculate the distance to the earthquake.`, ans: () => `<ul><li>distance = ${(P.dist / SPK).toFixed(1)} × 8.4</li><li>= ${P.dist.toFixed(0)} km</li></ul>` },
      { lvl: "adv", marks: 3, q: "Calculate the speed of a tsunami in 4000 m of water, and the time it takes to cross 1600 km.", ans: "<ul><li>v = √(9.81 × 4000) = 198 m/s</li><li>t = 1 600 000 ÷ 198 = 8080 s</li><li>≈ 2.2 hours</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain how the depth of earthquakes changes across a destructive plate margin, and why.", ans: "<ul><li>shallow near the trench, getting deeper towards the continent (Benioff zone)</li><li>they occur in the cold, brittle sinking slab as it descends into the mantle</li><li>down to about 700 km, below which the slab is too hot / changes phase</li></ul>" },
      { lvl: "adv", marks: 4, q: "Using the equation risk = hazard × vulnerability ÷ capacity, evaluate how a country might reduce earthquake risk.", ans: "<ul><li>the hazard itself cannot be reduced</li><li>vulnerability: building codes, retrofitting, land-use zoning off soft sediment</li><li>capacity: education, drills, warning systems, emergency services, insurance</li><li>costs; poorer countries may lack resources; governance and corruption matter</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Boundaries</b>: earthquakes are placed at random in the zone where each kind of boundary breaks: within 15 km of a ridge and 15 km deep; along a sinking slab at the chosen angle down to 680 km (plus shallow quakes in the overriding plate); spread over a wide band in a collision zone. Magnitudes follow the Gutenberg–Richter law with b = 1. On the conservative fault, strain builds up at a steady rate and is released when it reaches a threshold (elastic rebound).</li>
<li><b>Waves</b>: P waves at 6.0 km/s, S waves at 3.5 km/s and surface waves at 3.1 km/s in a uniform crust, so distance = (S − P) × 8.4 km. Intensity falls with distance: MMI ≈ 1.5 M − 3 log₁₀(distance) + 1.5 (a simple fit).</li>
<li><b>Tsunami</b>: the linear shallow-water equations along one line (400 cells), with the sea floor rising from the deep ocean up a 40 km slope onto the shelf. The starting hump is about 4 m high for magnitude 9 (×4.7 per magnitude). The open ocean lets waves leave; the coast reflects them.</li>
<li><b>Risk</b>: 40 districts 3 km apart; shaking from the intensity formula (+1 on soft sediment, ± random); the share of buildings that collapse follows a fragility curve whose midpoint falls as vulnerability rises; deaths = population × collapse × 8.5% × (1 − 0.65 × capacity).</li></ul>
<h3>Simplifications</h3>
<ul><li>The crust is uniform; real waves bend and reflect at layers in the Earth.</li>
<li>The tsunami model stops at 10 m depth: it does not show the wave breaking or running up the land, so real run-up heights are larger.</li>
<li>Vulnerability and capacity are each a single number; case-study values are the model's estimates, chosen to give deaths of the right size, not data.</li>
<li>Volcanic hazards (VEI, ash, lahars, pyroclastic flows) were in the earlier version and are not in this one.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/tectonic-hazards.html">original/tectonic-hazards.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "bound", options: [["bound", "🌍 Plate boundaries"], ["waves", "📈 Earthquake waves"], ["tsunami", "🌊 Tsunami"], ["risk", "⚠ Risk"]], on: v => set({ mode: v }) });
grp.bound = g = ui.group("Plate boundary");
ctl.type = K.seg(g, { value: "dest", options: Object.entries(BND).map(([k, b]) => [k, b.short]), on: v => { P.type = v; quakes = []; strain = 0; } });
const bNote = K.note(g, "");
ctl.angle = K.slider(g, { label: "Angle of the sinking slab", min: 15, max: 75, step: 1, value: 45, unit: "°", on: v => { P.angle = v; quakes = []; } });
ctl.speed = K.slider(g, { label: "Plate speed", min: 1, max: 15, step: 0.5, value: 6, unit: "cm/yr", on: v => P.speed = v });
K.btn(K.row(g), "Clear earthquakes", () => quakes = []);
grp.waves = g = ui.group("Earthquake");
ctl.eqM = K.slider(g, { label: "Magnitude", min: 3, max: 9, step: 0.1, value: 6.5, on: v => { P.eqM = v; } });
ctl.eqD = K.slider(g, { label: "Focus depth", min: 5, max: 300, step: 5, value: 15, unit: "km", on: v => { P.eqD = v; wt = 0; } });
K.note(g, "Drag the epicentre (the star) on the map.");
K.btn(K.row(g), "💥 Set off the earthquake", () => wt = 0, "primary");
grp.tsunami = g = ui.group("Tsunami");
ctl.tcase = K.seg(g, { value: "own", options: Object.entries(CASES_T).map(([k, c]) => [k, c.name.split(" (")[0]]), on: v => set({ mode: "tsunami", tcase: v }) });
const tNote = K.note(g, "");
ctl.tM = K.slider(g, { label: "Magnitude", min: 7, max: 9.5, step: 0.1, value: 9, on: v => { P.tM = v; newOcean(); } });
ctl.deep = K.slider(g, { label: "Ocean depth", min: 500, max: 7000, step: 100, value: 4000, unit: "m", on: v => { P.deep = v; newOcean(); } });
ctl.shelf = K.slider(g, { label: "Shelf width", min: 0, max: 300, step: 10, value: 80, unit: "km", on: v => { P.shelf = v; newOcean(); } });
ctl.shelfD = K.slider(g, { label: "Shelf depth", min: 20, max: 500, step: 10, value: 100, unit: "m", on: v => { P.shelfD = v; newOcean(); } });
K.btn(K.row(g), "↺ Start the tsunami again", () => newOcean(), "primary");
grp.risk = g = ui.group("A city and its earthquake");
ctl.rcase = K.seg(g, { value: "haiti", options: Object.entries(CASES_R).map(([k, c]) => [k, c.name]), on: v => set({ mode: "risk", rcase: v }) });
const rNote = K.note(g, "");
ctl.M = K.slider(g, { label: "Magnitude", min: 5, max: 9, step: 0.1, value: 7, on: v => { P.M = v; shake(); } });
ctl.depth = K.slider(g, { label: "Focus depth", min: 2, max: 100, step: 1, value: 13, unit: "km", on: v => { P.depth = v; shake(); } });
ctl.dist = K.slider(g, { label: "Distance from the city", min: 0, max: 200, step: 1, value: 25, unit: "km", on: v => { P.dist = v; shake(); } });
ctl.V = K.slider(g, { label: "Vulnerability (weak buildings, poverty)", min: 0.05, max: 0.95, step: 0.05, value: 0.9, on: v => { P.V = v; shake(); } });
ctl.C = K.slider(g, { label: "Capacity (warnings, rescue, hospitals)", min: 0.05, max: 0.95, step: 0.05, value: 0.12, on: v => { P.C = v; shake(); } });
K.btn(K.row(g), "💥 Shake again", () => shake(), "primary");
g = ui.group("Watch");
ctl.sp = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => "× " + v, on: v => sp = v });
ui.headerSpeed(ctl.sp);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((t, i) => read.el.children[i].firstElementChild.textContent = t);
function newOcean() { ocean = makeOcean({ L: P.tL, deep: P.deep, shelf: P.shelf, shelfD: P.shelfD, M: P.tM }); }
function shake() { city = cityQuake(P, rnd); cityT = 0; }
function set(o) {
  Object.assign(P, { type: "dest", angle: 45, speed: 6, eqM: 6.5, eqD: 15, ex: 260, ey: 190, tcase: "own", rcase: "haiti" }, o);
  const tc = CASES_T[P.tcase]; Object.assign(P, { tL: tc.L, deep: tc.deep, shelf: tc.shelf, shelfD: tc.shelfD, tM: tc.M });
  const rc = CASES_R[P.rcase]; Object.assign(P, { M: rc.M, depth: rc.depth, dist: rc.dist, pop: rc.pop, V: rc.V, C: rc.C });
  for (const k of ["angle", "speed", "eqM", "eqD", "tM", "deep", "shelf", "shelfD", "M", "depth", "dist", "V", "C"]) ctl[k].set(P[k]); for (const k of ["mode", "type", "tcase", "rcase"]) ctl[k].set(P[k]);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none";
  quakes = []; strain = 0; yr = 0; wt = 0; newOcean(); shake(); sp = o.speed || 1; ctl.sp.set(sp);
  tNote.textContent = tc.fact || "Set the ocean yourself."; rNote.textContent = rc.real || "Set the city and its earthquake yourself.";
  chA.opts.title = { bound: "Earthquake depth against distance", waves: "Seismograms", tsunami: "Tide gauge at the coast", risk: "Fragility: buildings collapsing against shaking" }[P.mode];
  chB.opts.title = { bound: "How often? (magnitude–frequency)", waves: "Travel times", tsunami: "Highest wave along the route", risk: "Real earthquakes: deaths against magnitude" }[P.mode];
  relabel({ bound: ["earthquakes", "deepest", "years of movement", "fitted slab angle"], waves: ["time since the quake", "S − P at A", "S − P at B", "S − P at C"], tsunami: ["time", "deep-water speed √(gd)", "wave at the coast now", "arrives at the coast"], risk: ["strongest shaking", "buildings collapsed", "deaths", "risk = H × V ÷ C"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const depthCol = d => d < 70 ? "#ffd166" : d < 300 ? "#ff8a3d" : "#ff5d6c";
let geoW = null, dragEpi = false;
function drawBound(c, w, h) {
  const L = 40, top = 90, sx = (w - 2 * L) / 1200, sy = (h - top - 30) / 720, X = km => L + (km + X0) * sx, Y = d => top + d * sy, type = P.type;
  if (type === "consv") return drawFault(c, w, h);
  c.fillStyle = "#3a1d12"; c.fillRect(L, top, w - 2 * L, h - top - 30);          // mantle
  // convection arrows in the mantle
  c.strokeStyle = "rgba(255,138,61,0.25)"; c.lineWidth = 3; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(X(s * 300), Y(420), 250 * sx, 220 * sy, 0, 0, 6.3); c.stroke(); }
  c.fillStyle = "#0e2a4a"; c.fillRect(L, top - 30, w - 2 * L, 30);                // sea
  const tg = Math.tan(P.angle * Math.PI / 180);
  if (type === "cons") {
    // two oceanic plates moving apart; magma rising at the ridge; stripes of alternating magnetism moving away
    stripeT += 0; for (const s of [-1, 1]) { c.fillStyle = "#2c3e58"; c.fillRect(s < 0 ? L : X(0), Y(0), s < 0 ? X(0) - L : w - L - X(0), 70 * sy); }
    for (let k = 0; k < 14; k++) { const d = ((k * 40 + yr * P.speed * 0.4) % 560); for (const s of [-1, 1]) { c.fillStyle = k % 2 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.25)"; c.fillRect(X(s * d) - (s < 0 ? 20 * sx : 0), Y(0), 20 * sx, 12 * sy); } }
    c.fillStyle = "#ff8a3d"; c.beginPath(); c.moveTo(X(-25), Y(70)); c.lineTo(X(0), Y(0)); c.lineTo(X(25), Y(70)); c.fill(); c.fillStyle = "rgba(255,138,61,0.5)"; c.fillRect(X(-40), Y(70), 80 * sx, 200 * sy);
    T(c, "← plates move apart →", X(0), top - 40, "#eef2f8", "center", "600 13px"); T(c, "ridge: magma rises, new crust forms", X(0), top - 56, "#ff8a3d", "center");
  } else if (type === "dest") {
    // oceanic plate sinks under the continent along a slab at the chosen angle
    c.fillStyle = "#2c3e58"; c.fillRect(L, Y(0), X(0) - L, 70 * sy); c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(700 / tg), Y(700)); c.lineTo(X(700 / tg) - 70 * sx / Math.sin(P.angle * Math.PI / 180), Y(700)); c.lineTo(X(0) - 70 * sx / Math.sin(P.angle * Math.PI / 180) * 0, Y(70)); c.lineTo(L, Y(70)); c.lineTo(L, Y(0)); c.fill();
    c.fillStyle = "#6b5a3e"; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(w - L, Y(0)); c.lineTo(w - L, Y(60)); c.lineTo(X(60 / tg), Y(60)); c.fill();
    const vx = 100 / tg; c.fillStyle = "#8a7550"; c.beginPath(); c.moveTo(X(vx - 80), Y(0)); c.lineTo(X(vx), Y(0) - 45); c.lineTo(X(vx + 80), Y(0)); c.fill(); c.fillStyle = "#ff5d6c"; c.beginPath(); c.arc(X(vx), Y(0) - 47, 5, 0, 6.3); c.fill();
    c.strokeStyle = "rgba(255,93,108,0.6)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(vx), Y(100)); c.lineTo(X(vx), Y(0) - 40); c.stroke(); c.setLineDash([]); T(c, "melting at ~100 km → volcanoes", X(vx) + 8, Y(100) + 4, "#ff8a70", "left", "11px");
    T(c, "trench", X(0), top - 6, "#aab6cc", "center", "11px"); T(c, "oceanic plate →", X(-350), top - 40, "#eef2f8", "center", "600 13px"); T(c, "← continental plate", X(350), top - 40, "#eef2f8", "center", "600 13px");
    if (ui.level === "adv") { T(c, "slab pull ↘", X(400 / tg), Y(400), "#7fe3a0", "left", "600 12px"); T(c, `slab angle ${P.angle}°`, X(250 / tg) + 10, Y(250), "#aab6cc", "left", "11px"); }
  } else {
    // collision: two continental plates crumple and thicken into mountains
    c.fillStyle = "#6b5a3e"; c.fillRect(L, Y(0), w - 2 * L, 40 * sy); c.beginPath(); c.moveTo(X(-250), Y(0)); for (let x = -250; x <= 250; x += 10) c.lineTo(X(x), Y(0) - (70 + 25 * Math.sin(x / 13)) * Math.exp(-x * x / 30000)); c.lineTo(X(250), Y(0)); c.fill();
    c.beginPath(); c.moveTo(X(-200), Y(40)); c.quadraticCurveTo(X(0), Y(120), X(200), Y(40)); c.fill();
    T(c, "→ plates push together ←", X(0), top - 56, "#eef2f8", "center", "600 13px"); T(c, "fold mountains (no volcanoes: neither plate sinks far)", X(0), top - 40, "#c9a96a", "center");
  }
  // earthquakes, coloured by depth, fading with age
  for (const q of quakes) { c.globalAlpha = Math.max(0.15, 1 - (yr - q.yr) / 400); c.fillStyle = depthCol(q.d); c.beginPath(); c.arc(X(q.x), Y(q.d), 1.5 + (q.M - 4) * 1.6, 0, 6.3); c.fill(); } c.globalAlpha = 1;
  c.fillStyle = "#aab6cc"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "right"; for (const d of [100, 300, 500, 700]) c.fillText(d + " km", L - 4, Y(d) + 4);
  let kx = L; for (const [col, t] of [["#ffd166", "shallow (< 70 km)"], ["#ff8a3d", "70–300 km"], ["#ff5d6c", "> 300 km deep"]]) { c.fillStyle = col; c.beginPath(); c.arc(kx + 5, h - 12, 5, 0, 6.3); c.fill(); T(c, t, kx + 14, h - 8); kx += 130; }
}
function drawFault(c, w, h) {
  // plan view: the fault runs across the middle; fences cross it; the far side moves right, the near side left
  const fy = h / 2 + 20, off = 2 * Math.min(1, strain), slip = rebound;
  c.fillStyle = "#2a3a24"; c.fillRect(30, 70, w - 60, h - 110); c.strokeStyle = "#ff8a70"; c.lineWidth = 2; c.setLineDash([8, 5]); c.beginPath(); c.moveTo(30, fy); c.lineTo(w - 30, fy); c.stroke(); c.setLineDash([]);
  T(c, "plate moving →", w - 40, 92, "#eef2f8", "right", "600 13px"); T(c, "← plate moving", 40, h - 50, "#eef2f8", "left", "600 13px"); T(c, "fault: locked", w / 2, fy - 8, "#ff8a70", "center", "600 12px");
  for (let k = 0; k < 7; k++) { const x0 = 80 + k * (w - 160) / 6, sh = 18 * off, total = (slip % 4) * 30; c.strokeStyle = "#e8dcc0"; c.lineWidth = 3;
    c.beginPath(); for (let y = 75; y <= fy; y += 5) { const f = Math.exp(-(fy - y) / 80); const x = x0 + total / 2 + sh * (1 - f) ; y === 75 ? c.moveTo(x + sh * 0, y) : c.lineTo(x, y); } c.stroke();
    c.beginPath(); for (let y = fy; y <= h - 45; y += 5) { const f = Math.exp(-(y - fy) / 80); const x = x0 - total / 2 - sh * (1 - f); y === fy ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
  for (const q of quakes.slice(-30)) { c.globalAlpha = Math.max(0.2, 1 - (yr - q.yr) / 200); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(w / 2 + q.x * (w - 80) / 1200, fy + (q.d - 10) * 0.8, 2 + (q.M - 4) * 2, 0, 6.3); c.fill(); } c.globalAlpha = 1;
  T(c, `strain stored: ${Math.round(100 * Math.min(1, strain))}%`, 40, 92, strain > 0.8 ? "#ff5d6c" : "#aab6cc", "left", "600 13px");
  if (yr - lastBig < 20) T(c, "EARTHQUAKE: the fault slips and the rock springs back", w / 2, fy + 30, "#ffd166", "center", "700 15px");
}
let lastBig = -100;
function drawWaves(c, w, h) {
  const mw = Math.min(w - 40, (h - 60) * 1.5), sc = mw / 600, ox = 20, oy = 40, X = x => ox + x * sc, Y = y => oy + y * sc; geoW = { sc, ox, oy };
  c.fillStyle = "#1c2a1f"; c.fillRect(ox, oy, 600 * sc, 400 * sc); c.strokeStyle = "rgba(255,255,255,0.05)"; for (let x = 0; x <= 600; x += 100) { c.beginPath(); c.moveTo(X(x), oy); c.lineTo(X(x), Y(400)); c.stroke(); }
  c.save(); c.beginPath(); c.rect(ox, oy, 600 * sc, 400 * sc); c.clip();   // keep the shading and waves on the map
  // intensity shading around the epicentre
  for (let rr = 300; rr >= 10; rr -= 20) { const I = mmi(P.eqM, Math.hypot(rr, P.eqD)); c.fillStyle = `rgba(255,${Math.round(220 - 18 * I)},80,${Math.max(0, (I - 3) / 25)})`; c.beginPath(); c.arc(X(P.ex), Y(P.ey), rr * sc, 0, 6.3); c.fill(); }
  // wavefronts on the surface: P (blue), S (red), surface waves (gold)
  for (const [v, col] of [[VP, "#5ab0ff"], [VS, "#ff5d6c"], [VR, "#ffd166"]]) { const R = v * wt, rs = v === VR ? R : Math.sqrt(Math.max(0, R * R - P.eqD * P.eqD)); if (rs > 0 && rs < 900) { c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); c.arc(X(P.ex), Y(P.ey), rs * sc, 0, 6.3); c.stroke(); } }
  c.restore();
  // stations, and the distance circles once both waves have arrived
  for (const [sx2, sy2, nm] of STATIONS) { const d = Math.hypot(sx2 - P.ex, sy2 - P.ey), R = Math.hypot(d, P.eqD), ts = R / VS;
    c.fillStyle = "#eef2f8"; c.beginPath(); c.moveTo(X(sx2), Y(sy2) - 9); c.lineTo(X(sx2) - 8, Y(sy2) + 6); c.lineTo(X(sx2) + 8, Y(sy2) + 6); c.fill(); T(c, nm, X(sx2) + 10, Y(sy2) + 4, "#eef2f8", "left", "600 13px");
    if (wt > ts) { const est = Math.sqrt(Math.max(0, ((R / VS - R / VP) * SPK) ** 2 - P.eqD * P.eqD)); c.strokeStyle = "rgba(238,242,248,0.45)"; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.arc(X(sx2), Y(sy2), est * sc, 0, 6.3); c.stroke(); c.setLineDash([]); } }
  c.fillStyle = "#ffd166"; c.font = "22px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("★", X(P.ex), Y(P.ey) + 8); T(c, "epicentre (drag me)", X(P.ex), Y(P.ey) + 24, "#ffd166", "center", "11px");
  T(c, "100 km", X(25), Y(395), "#aab6cc", "left", "11px"); c.strokeStyle = "#aab6cc"; c.beginPath(); c.moveTo(X(20), Y(385)); c.lineTo(X(120), Y(385)); c.stroke();
  const x2 = X(600) + 20; let y2 = 150; for (const [col, t] of [["#5ab0ff", "P wave: 6.0 km/s"], ["#ff5d6c", "S wave: 3.5 km/s"], ["#ffd166", "surface waves: 3.1 km/s"]]) { c.fillStyle = col; c.fillRect(x2, y2 - 9, 12, 4); T(c, t, x2 + 18, y2 - 4, col, "left", "12px"); y2 += 20; }
  T(c, "dashed circles: distance", x2, y2 + 10, "#aab6cc", "left", "11.5px"); T(c, "= (S − P) × 8.4 km", x2, y2 + 26, "#aab6cc", "left", "11.5px");
  T(c, `t = ${wt.toFixed(0)} s`, x2, y2 + 60, "#eef2f8", "left", "600 16px");
}
function drawTsunami(c, w, h) {
  const s = ocean, L = 40, R = w - 30, top = 110, sea = 160, base = h - 40, n = s.n, X = i => L + (i + 0.5) / n * (R - L), maxD = Math.max(...s.h), Yd = d => sea + (d / maxD) * (base - sea - 10), etaS = 30 / Math.max(0.5, s.amp);
  c.fillStyle = "#0e2a4a"; c.beginPath(); c.moveTo(L, sea); for (let i = 0; i < n; i++) c.lineTo(X(i), Yd(s.h[i])); c.lineTo(R, sea); c.fill();
  c.fillStyle = "#6b5a3e"; c.beginPath(); c.moveTo(L, base + 10); for (let i = 0; i < n; i++) c.lineTo(X(i), Yd(s.h[i])); c.lineTo(R, sea - 30); c.lineTo(w, sea - 30); c.lineTo(w, base + 10); c.fill();
  // the sea surface, exaggerated vertically
  c.strokeStyle = "#5ab0ff"; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < n; i++) { const y = sea - s.eta[i] * etaS; i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); } c.stroke();
  c.strokeStyle = "rgba(255,93,108,0.5)"; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); for (let i = 0; i < n; i++) { const y = sea - s.maxH[i] * etaS; i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); } c.stroke(); c.setLineDash([]);
  c.fillStyle = "#eef2f8"; for (let k = 0; k < 5; k++) c.fillRect(R - 6 + k * 6, sea - 42 - (k % 2) * 6, 5, 12 + (k % 2) * 6); T(c, "coast", R, sea - 54, "#eef2f8", "right", "600 12px");
  T(c, "earthquake", X(Math.floor(n * Math.min(0.15, 60 / P.tL))), sea + 30, "#ffd166", "center", "600 12px");
  T(c, "not to scale: the waves are drawn thousands of times taller than they really are, compared with the ocean depth", L, h - 10, "#7d8aa5", "left", "11px");
  for (const d of [1000, 3000, 5000]) if (d < maxD) T(c, d + " m", L + 4, Yd(d) + 4, "#7d8aa5", "left", "10px");
  T(c, `${P.tL} km of ocean`, (L + R) / 2, sea + 18, "#aab6cc", "center", "11px"); const hh = s.t / 3600; T(c, `${Math.floor(hh)} h ${String(Math.floor((hh % 1) * 60)).padStart(2, "0")} min after the earthquake`, L, top - 60, "#eef2f8", "left", "600 15px");
  T(c, "red dashes: the highest the water has reached so far", L, top - 40, "#ff8a70", "left", "11.5px");
}
function drawRisk(c, w, h) {
  const q = city, gw = Math.min(w * 0.55, 520), cw = gw / 8, ch = Math.min(cw * 0.8, (h - 140) / 5), x0 = 30, y0 = 90, show = Math.min(1, cityT / 2);
  c.fillStyle = "#3a5a8a"; c.beginPath(); c.moveTo(x0 + 5 * cw, y0 + 2 * ch); c.lineTo(x0 + 8 * cw, y0 + 2 * ch); c.lineTo(x0 + 8 * cw, y0 + 5 * ch); c.lineTo(x0 + 5 * cw, y0 + 5 * ch); c.fill();
  q.ds.forEach((d, k) => { const gx = k % 8, gy = Math.floor(k / 8), x = x0 + gx * cw, y = y0 + gy * ch, p = d.p * show, jig = show < 1 ? Math.sin(cityT * 40 + k) * 3 * (1 - show) * d.I / 6 : 0;
    for (let b = 0; b < 4; b++) { const bx = x + 6 + (b % 2) * (cw / 2 - 2) + jig, by = y + 6 + Math.floor(b / 2) * (ch / 2 - 2), down = ((k * 7 + b * 13) % 100) / 100 < p; c.fillStyle = down ? "#ff5d6c" : `hsl(${120 - 120 * p},40%,55%)`; c.fillRect(bx, down ? by + ch / 4 : by, cw / 2 - 10, down ? ch / 4 - 6 : ch / 2 - 6); } });
  T(c, "each district: 4 blocks; red = collapsed · blue = soft sediment", x0, y0 + 5 * ch + 18, "#aab6cc", "left", "11.5px");
  T(c, `${CASES_R[P.rcase].name}: magnitude ${P.M}, ${P.depth} km deep, ${P.dist} km away`, x0, 40, "#eef2f8", "left", "600 15px");
  // the risk equation as bars
  const bx = x0 + gw + 50, bw2 = 40, bh = h - 200, H = (q.maxI - 1) / 11, items = [["hazard", H, "#ffd166"], ["vulnerability", P.V, "#ff8a70"], ["capacity", P.C, "#7fe3a0"]];
  items.forEach(([nm, v, col], i) => { const x = bx + i * (bw2 + 30); c.fillStyle = "rgba(255,255,255,0.06)"; c.fillRect(x, 90, bw2, bh); c.fillStyle = col; c.fillRect(x, 90 + bh * (1 - v), bw2, bh * v); T(c, nm, x + bw2 / 2, 90 + bh + 16, col, "center", "11px"); T(c, v.toFixed(2), x + bw2 / 2, 84 + bh * (1 - v), col, "center", "600 11px"); });
  T(c, `risk = ${H.toFixed(2)} × ${P.V.toFixed(2)} ÷ ${P.C.toFixed(2)} = ${(H * P.V / P.C).toFixed(2)}`, bx, 70, "#eef2f8", "left", "600 13px");
  if (show >= 1) T(c, `about ${K.sig(q.deaths, 2).replace(/e\+?(\d+)/, "×10^$1")} deaths`, bx, h - 40, "#ff5d6c", "left", "700 18px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h); ({ bound: drawBound, waves: drawWaves, tsunami: drawTsunami, risk: drawRisk })[P.mode](c, w, h); }
K.pointer(cv.el, {
  down(p) { if (P.mode === "waves" && geoW) { const x = (p.x - geoW.ox) / geoW.sc, y = (p.y - geoW.oy) / geoW.sc; if (Math.hypot(x - P.ex, y - P.ey) < 40) dragEpi = true; } },
  drag(p) { if (dragEpi) { P.ex = K.clamp((p.x - geoW.ox) / geoW.sc, 0, 600); P.ey = K.clamp((p.y - geoW.oy) / geoW.sc, 0, 400); wt = 0; } }, up() { dragEpi = false; }
});

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * sp;
  if (P.mode === "bound") {
    yr += s * 20; const rate = P.speed * 0.6 * s;    // earthquakes per frame, more for faster plates
    if (P.type === "consv") { strain += P.speed * s * 0.04; rebound = Math.max(0, rebound - s * 0); if (strain >= 1) { rebound += 1; strain = 0; lastBig = yr; quakes.push({ x: rnd() * 1100 - 550, d: 5 + rnd() * 10, M: 6.5 + rnd(), yr }); } if (rnd() < rate * 0.3) { const [x, d] = quakeAt("consv", P.angle, rnd); quakes.push({ x, d, M: grMag(rnd), yr }); } }
    else { let n = Math.floor(rate) + (rnd() < rate % 1 ? 1 : 0); while (n--) { const [x, d] = quakeAt(P.type, P.angle, rnd); quakes.push({ x, d, M: grMag(rnd), yr }); } }
    if (quakes.length > 1500) quakes.splice(0, quakes.length - 1500);
  } else if (P.mode === "waves") wt = Math.min(300, wt + s * 10);
  else if (P.mode === "tsunami") { const target = ocean.t + s * 120 * (P.tL > 600 ? 2.5 : 1); let k = 0; while (ocean.t < target && k++ < 400) { oceanStep(ocean); if (!ocean.gauge.length || ocean.t - ocean.gauge[ocean.gauge.length - 1][0] > 20) ocean.gauge.push([ocean.t, ocean.eta[ocean.n - 1]]); } }
  else cityT += s;
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "bound") {
    const ang = P.type === "dest" ? benioffAngle(quakes.map(q => [q.x, q.d])) : null, deep = quakes.reduce((m, q) => Math.max(m, q.d), 0);
    chA.opts.xLabel = "distance from the boundary (km)"; chA.opts.yLabel = "depth (km, downwards)"; chB.opts.xLabel = "magnitude M"; chB.opts.yLabel = "log₁₀ number ≥ M";
    const s1 = [{ pts: quakes.map(q => [q.x, -q.d]), type: "dots", r: 2, color: "#ffb347", label: "earthquakes" }];
    if (ang != null) { const tg = Math.tan(ang * Math.PI / 180); s1.push({ pts: [[0, 0], [700 / tg, -700]], color: "#7fe3a0", dash: [5, 4], label: `best fit: ${ang.toFixed(0)}°` }); }
    chA.draw(s1, { xMin: -300, xMax: 900, yMin: -720, yMax: 10, yFmt: v => (-v).toFixed(0) });
    const ms = quakes.map(q => q.M), gr = []; for (let m = 4; m <= 8; m += 0.5) { const nn = ms.filter(x => x >= m).length; if (nn) gr.push([m, Math.log10(nn)]); }
    chB.draw([{ pts: gr, type: "dots", color: "#ffd166", r: 4.5, label: "these earthquakes" }].concat(gr.length ? [{ pts: [[4, gr[0][1]], [8, gr[0][1] - 4]], color: "#7d8aa5", dash: [5, 4], label: "b = 1" }] : []), { xMin: 3.8, xMax: 8.2, yMin: 0 });
    bNote.textContent = BND[P.type].name + "."; ctl.angle.el.style.display = P.type === "dest" ? "" : "none";
    read.set("a", quakes.length); read.set("b", deep.toFixed(0) + " km"); read.set("c", Math.round(yr * 1000).toLocaleString()); read.set("d", ang != null ? ang.toFixed(1) + "°" : "–");
    ui.hud(`${quakes.length} earthquakes recorded<br>deepest ${deep.toFixed(0)} km`);
  } else if (P.mode === "waves") {
    chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "station (traces)"; chB.opts.xLabel = "distance (km)"; chB.opts.yLabel = "time after the quake (s)";
    const tr = STATIONS.map(([x, y, nm], i) => { const d = Math.hypot(x - P.ex, y - P.ey), pts = []; let m = 1e-9; for (let t2 = 0; t2 <= Math.min(wt, 200); t2 += 0.25) { const v = seismogram(d, P.eqD, P.eqM, t2); pts.push([t2, v]); m = Math.max(m, Math.abs(seismogram(d, P.eqD, P.eqM, Math.hypot(d, P.eqD) / VR + 0.5))); } return { pts: pts.map(q => [q[0], 2 - i + 0.4 * q[1] / (m * 1.4)]), color: ["#5ab0ff", "#ff8a70", "#7fe3a0"][i], label: nm, width: 1.2 }; });
    chA.draw(tr, { xMin: 0, xMax: 200, yMin: -0.8, yMax: 2.8, yFmt: v => ["C", "B", "A"][Math.round(v)] || "" });
    const tp = [], ts = []; for (let d = 0; d <= 700; d += 20) { tp.push([d, Math.hypot(d, P.eqD) / VP]); ts.push([d, Math.hypot(d, P.eqD) / VS]); }
    const picks = STATIONS.map(([x, y]) => { const d = Math.hypot(x - P.ex, y - P.ey), R = Math.hypot(d, P.eqD); return [d, R / VP, R / VS]; });
    chB.draw([{ pts: tp, color: "#5ab0ff", label: "P" }, { pts: ts, color: "#ff5d6c", label: "S" }, { pts: picks.filter(q => wt >= q[1]).map(q => [q[0], q[1]]), type: "dots", color: "#5ab0ff", r: 5 }, { pts: picks.filter(q => wt >= q[2]).map(q => [q[0], q[2]]), type: "dots", color: "#ff5d6c", r: 5 }], { xMin: 0, xMax: 700, yMin: 0, vlines: [] });
    read.set("a", wt.toFixed(0) + " s"); ["b", "c", "d"].forEach((k, i) => { const q = picks[i]; read.set(k, wt >= q[2] ? `${(q[2] - q[1]).toFixed(1)} s → ${((q[2] - q[1]) * SPK).toFixed(0)} km` : "waiting…"); });
    ui.hud(`magnitude ${P.eqM}, focus ${P.eqD} km deep<br>strongest shaking: intensity ${["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][Math.round(mmi(P.eqM, P.eqD))]}`);
  } else if (P.mode === "tsunami") {
    const s = ocean, arr = s.gauge.find(q => Math.abs(q[1]) > 0.05 * s.amp), cDeep = Math.sqrt(G * P.deep);
    chA.opts.xLabel = "time (minutes)"; chA.opts.yLabel = "sea level (m)"; chB.opts.xLabel = "distance (km)"; chB.opts.yLabel = "highest wave (m)";
    chA.draw([{ pts: s.gauge.map(q => [q[0] / 60, q[1]]), color: "#5ab0ff", label: "tide gauge (10 m deep, at the coast)" }], { xMin: 0, vlines: arr ? [{ x: arr[0] / 60, color: "#ffd166", label: "arrives" }] : [] });
    const gl = [], hv = []; const iDeep = Math.floor(s.n * 0.5); for (let i = 0; i < s.n; i += 2) { const x = (i + 0.5) / s.n * P.tL; hv.push([x, s.maxH[i]]); if (i >= iDeep) gl.push([x, s.maxH[iDeep] * Math.pow(s.h[iDeep] / s.h[i], 0.25)]); }
    chB.draw([{ pts: hv, color: "#ff5d6c", label: "model" }, { pts: gl, color: "#7d8aa5", dash: [5, 4], label: "Green's law from mid-ocean" }], { xMin: 0, xMax: P.tL, yMin: 0 });
    read.set("a", (s.t / 60).toFixed(0) + " min"); read.set("b", cDeep.toFixed(0) + " m/s = " + (cDeep * 3.6).toFixed(0) + " km/h"); read.set("c", s.eta[s.n - 1].toFixed(2) + " m"); read.set("d", arr ? (arr[0] / 60).toFixed(0) + " min" : "not yet");
    ui.hud(`deep ocean: ${cDeep.toFixed(0)} m/s, wave ${s.amp.toFixed(1)} m high at the start<br>on a ${P.shelfD} m shelf: ${Math.sqrt(G * P.shelfD).toFixed(0)} m/s`);
  } else {
    const q = city; chA.opts.xLabel = "shaking (Modified Mercalli intensity)"; chA.opts.yLabel = "buildings collapsed (%)"; chB.opts.xLabel = "magnitude"; chB.opts.yLabel = "deaths (log₁₀)";
    const frag = V => { const pts = []; for (let I = 4; I <= 12; I += 0.2) pts.push([I, 100 / (1 + Math.exp(-(I - (11.3 - 4.6 * V)) / 0.45))]); return pts; };
    chA.draw([{ pts: frag(0.9), color: "#ff5d6c", label: "weak (0.9)" }, { pts: frag(0.2), color: "#7fe3a0", label: "strong (0.2)" }, { pts: frag(P.V), color: "#ffd166", width: 2.6, label: "this city" }], { xMin: 4, xMax: 12, yMin: 0, yMax: 100 });
    const real = [["Haiti 2010", 7.0, 160000, "#ff5d6c"], ["Nepal 2015", 7.8, 8964, "#ffb347"], ["Tōhoku 2011", 9.1, 19759, "#6fb1ff"], ["Chile 2010", 8.8, 525, "#7fe3a0"], ["Christchurch 2011", 6.2, 185, "#c58cff"]];
    chB.draw(real.map(([nm, M, d, col]) => ({ pts: [[M, Math.log10(d)]], type: "dots", r: 6, color: col, label: nm })).concat([{ pts: [[P.M, Math.log10(Math.max(1, q.deaths))]], type: "dots", r: 5, color: "#fff", label: "model" }]), { xMin: 5.5, xMax: 9.5, yMin: 0, yMax: 6 });
    read.set("a", "intensity " + q.maxI.toFixed(1)); read.set("b", Math.round(100 * q.collapsed) + "%"); read.set("c", Math.round(q.deaths).toLocaleString()); read.set("d", ((q.maxI - 1) / 11 * P.V / P.C).toFixed(2));
    ui.hud(`${(P.pop).toFixed(2)} million people<br>model deaths: <b>${Math.round(q.deaths).toLocaleString()}</b>`);
  }
});
set({});
ui.tip("Four views at the top of the controls · earthquakes are coloured by depth", 7000);
