/* =====================================================================
   WEATHERING, SLOPES AND LANDSLIDES
   WEATHERING breaks rock down where it is (no movement):
     mechanical: FREEZE–THAW (water in a joint freezes, expands 9%, and
       prises the rock apart; fastest where the temperature crosses 0 °C
       often), exfoliation in hot deserts;
     chemical: HYDROLYSIS (feldspar → clay), CARBONATION (rainwater, a weak
       acid, dissolves limestone and chalk), OXIDATION (iron rusts); most
       reactions about DOUBLE in speed for every 10 °C warmer, and need water;
     biological: roots in cracks, lichens and burrowing animals.
   MASS MOVEMENT is material moving downhill under gravity. A slope fails
   when the DRIVING force (the weight pulling down the slope) beats the
   RESISTING force (friction + cohesion + roots). The FACTOR OF SAFETY
     F = resisting ÷ driving      (F < 1 → the slope fails)
   For a long ("infinite") slope with a slip surface at depth z:
     F = [c + (γ − m γw) z cos²β tan φ] ÷ [γ z sin β cos β]
   β slope angle, φ angle of friction, c cohesion (kPa), γ soil weight
   (kN/m³), m how much of the soil is below the water table (0 dry, 1 wet).
   Water in the pores pushes the grains apart (PORE WATER PRESSURE), which
   cuts the friction: this is why most landslides happen after heavy rain.
   ===================================================================== */
const GAM = 20, GW = 9.81;   // weight of soil and of water (kN per m³)
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
// the infinite-slope factor of safety; q is extra load on top (kPa)
function FoS(beta, z, m, c, phi, q = 0) {
  const b = rad(beta), cs = Math.cos(b), sn = Math.sin(b);
  const res = c + ((GAM - m * GW) * z + q) * cs * cs * Math.tan(rad(phi)), drv = (GAM * z + q) * sn * cs;
  return { F: res / drv, res, drv };
}
// with no cohesion the critical angle does not depend on depth: tan β = (1 − m γw/γ) tan φ
const critAngle = (phi, m) => deg(Math.atan((1 - m * GW / GAM) * Math.tan(rad(phi))));
const SOIL = {
  sand: { name: "dry sand", c: 0, phi: 33.8, col: "#d8c08a" },
  till: { name: "boulder clay (till)", c: 8, phi: 26, col: "#8a6a4a" },
  regolith: { name: "weathered granite (regolith)", c: 3, phi: 36, col: "#a88a6a" },
  clay: { name: "London Clay", c: 5, phi: 21, col: "#7a6a5a" }
};
// vegetation adds root cohesion cr (kPa) but only down to the depth the roots reach
const VEG = { none: { name: "bare", cr: 0, depth: 0 }, grass: { name: "grass", cr: 2, depth: 0.3 }, trees: { name: "trees", cr: 6, depth: 1.8 } };
const rootC = (veg, z) => VEG[veg].depth >= z ? VEG[veg].cr : 0;

// ---------------- Weathering rates (mm of rock lost per 1000 years) ----------------
// freeze–thaw cycles a year: most where the mean temperature is near 0 °C; none if always frozen or never frozen
const ftCycles = T => 80 * Math.exp(-Math.pow((T - 1) / 5, 2));
const notFrozen = T => 1 / (1 + Math.exp(-(T + 2) / 2));   // chemical reactions need liquid water
const ROCK = {
  granite: { name: "granite", chem: 10, ft: 0.25, q10: 2, proc: "hydrolysis (feldspar → clay)", col: "#9a8f98" },
  limestone: { name: "Carboniferous limestone", chem: 25, ft: 0.15, q10: 1.3, proc: "carbonation (dissolved by rainwater; cold water holds more CO₂, so it speeds up less with warmth)", col: "#cfc8b0" },
  sandstone: { name: "iron-rich sandstone", chem: 14, ft: 0.4, q10: 2, proc: "oxidation (iron minerals rust red and crumble)", col: "#b8744a" },
  chalk: { name: "chalk", chem: 20, ft: 0.9, q10: 1.3, proc: "carbonation; very porous, so freeze–thaw shatters it", col: "#eeeee6" }
};
const chemRate = (k, T, R) => ROCK[k].chem * (R / 1000) * Math.pow(ROCK[k].q10, (T - 10) / 10) * notFrozen(T);
const ftRate = (k, T, R) => ROCK[k].ft * ftCycles(T) * Math.min(1, R / 500);
const bioRate = (T, R) => 3 * Math.min(1, R / 1000) * Math.max(0, T) / 10;
const PLACES = [["Svalbard", -6, 400], ["Cairngorms", 1, 1500], ["Snowdonia", 7, 2900], ["Iceland", 3, 1200], ["London", 11, 600], ["Sahara", 28, 50], ["Amazon", 27, 2300], ["Siberia", -12, 300]];

// ---------------- Soil creep: heave perpendicular to the slope, drop vertically ----------------
// each cycle moves a grain down the slope by h tan β (h = heave at that depth, falling to 0 at 1 m)
const creepRate = (N, h0, beta, d = 0) => N * h0 * Math.max(0, 1 - d) * Math.tan(rad(beta));   // mm a year

// ---------------- Undercut cliff: the overhang above a wave-cut notch is a cantilever ----------------
// bending stress at the back of the notch = 3γu²/H (overhang u, rock thickness H); F = tensile strength ÷ that
const CLIFF = { chalk: { name: "chalk", st: 120, col: "#eeeee6" }, sandstone: { name: "sandstone", st: 400, col: "#c8925a" }, limestone: { name: "limestone", st: 900, col: "#cfc8b0" } };
const GR = 22;   // rock weighs 22 kN per m³
const cliffF = (st, H, u) => u > 0 ? st * H / (3 * GR * u * u) : Infinity;
const uCrit = (st, H) => Math.sqrt(st * H / (3 * GR));

// ---------------- Landslides over the years: a hillside in 24 strips, daily rain ----------------
function lgamma(x) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
const NS = 24, POR = 0.35, DRAIN = 0.3, WETP = 0.55;   // strips, soil porosity, fraction of water draining a day, chance a day is wet
function newHill(o, r) {
  const S = { o, day: 0, strips: [], slides: 0, closed: 0, caught: 0, years: [0], caine: [], spell: { tot: 0, d: 0 }, rain: [], minF: [] };
  for (let i = 0; i < NS; i++) S.strips.push({ z: o.zmax * (0.7 + 0.3 * r()), hw: 0, phi: 36 + 1.5 * r.gauss(), beta: o.beta + 2.5 * r.gauss(), scar: 0, F: 2 });
  return S;
}
function hillDay(S, r) {
  const o = S.o, s = o.storm, meanWet = o.rain / (365 * WETP);
  // daily rain: wet or dry; wet-day amounts have a long tail (bigger storminess = rarer but heavier storms, same yearly total)
  let amt = 0; if (r() < WETP) { const E = -Math.log(1 - r() * 0.999999); amt = meanWet * Math.pow(E, s) / Math.exp(lgamma(1 + s)); if (o.cc && amt > 2 * meanWet) amt *= 1.2; }
  if (amt > 2) { S.spell.tot += amt; S.spell.d++; } else S.spell = { tot: 0, d: 0 };
  let minF = 9;
  for (const p of S.strips) {
    p.hw = Math.min(p.z, p.hw * (1 - DRAIN) + amt / 1000 / POR);          // water table height above the slip surface (m)
    p.z += (o.zmax - p.z) * 0.05 / 365;                                     // soil slowly re-forms on scars (about 20 years)
    p.scar = Math.max(0, p.scar - 1 / 3650);
    const veg = p.scar > 0.6 ? "none" : o.veg;                               // a fresh scar has no roots
    p.F = FoS(p.beta, p.z, p.hw / p.z, 2 + rootC(veg, p.z), p.phi).F;
    if (p.F < 1) {
      S.slides++; S.years[S.years.length - 1]++; p.z = 0.15; p.hw = 0; p.scar = 1;
      if (S.spell.d) S.caine.push([S.spell.d * 24, S.spell.tot / (S.spell.d * 24)]);
      if (r() < 0.6) { if (o.fences && r() < 0.75) S.caught++; else S.closed++; }   // a debris flow reaches the road unless a fence catches it
    }
    minF = Math.min(minF, p.F);
  }
  S.day++; if (S.day % 365 === 0) S.years.push(0);
  S.rain.push(amt); S.minF.push(minF); if (S.rain.length > 240) { S.rain.shift(); S.minF.shift(); }
}
const slidesPerYear = (o, r, yrs = 20) => { const S = newHill(o, r); for (let d = 0; d < 365 * 5; d++) hillDay(S, r); const n0 = S.slides; for (let d = 0; d < 365 * yrs; d++) hillDay(S, r); return (S.slides - n0) / yrs; };
const caine = D => 14.82 * Math.pow(D, -0.39);   // Caine (1980): intensity (mm/h) above which shallow landslides start, for a storm lasting D hours

// ---------------- The page ----------------
const DEF = { view: "slope", speed: 1, rock: "granite", T: 8, R: 1200, beta: 30, z: 1.5, soil: "regolith", m: 0, veg: "grass", q: 0, rainOn: false, ch: 20, cut: 0.4, crock: "chalk", cbeta: 15, N: 20, h0: 2, hbeta: 33, zmax: 1.2, rain: 2400, storm: 1.6, hveg: "grass", cc: false, fences: false };
const P = Object.assign({}, DEF);
let W = null, slope = null, cliff = null, creep = null, hill = null, hrng = K.rng(7);
const ui = K.app({
  title: "Weathering, Slopes and Landslides", subject: "Geography",
  blurb: "Weathering against climate, the factor of safety of a slope, undercut cliffs, soil creep and a century of landslides above a Highland road",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 1A Coastal and 1B River landscapes: mechanical (freeze–thaw), chemical and biological weathering; mass movement (sliding, slumping, rockfall, soil creep) shaping cliffs and valley sides.", adv: "Pearson Edexcel A level Geography (9GE0) Option 2B Coastal landscapes and change (sub-aerial processes, mass movement, managing risk) and 2A Glaciated landscapes (freeze–thaw, solifluction): weathering and climate, the factor of safety, pore water pressure, rainfall thresholds (Caine 1980)." } },
  missions: [
    { title: "The tilt box", q: "Steepen a slope of dry sand until it slides. At what angle does it fail? Does the depth of sand matter?", hint: "About 34°, the sand's angle of friction (its angle of repose). With no cohesion, F = tan φ ÷ tan β, so the depth cancels out.", setup() { set({ view: "slope", soil: "sand", veg: "none", beta: 25 }); } },
    { title: "Rain and landslides", q: "Start with a dry slope at 30° and turn on the rain. Why does the slope fail as the water table rises?", hint: "Water in the pores pushes the grains apart (pore water pressure), which reduces the friction holding them. The driving force hardly changes, so F falls below 1.", setup() { set({ view: "slope", beta: 30, m: 0, rainOn: true }); } },
    { title: "Do trees hold slopes up?", q: "Compare grass and trees on a slope with the slip surface at 1.5 m, then at 2.5 m. When do roots help?", hint: "Roots add strength (cohesion) only if they cross the slip surface. Tree roots reach about 1.8 m, so they protect shallow slides but not deep ones.", setup() { set({ view: "slope", beta: 34, z: 1.5, m: 0.5, veg: "trees" }); } },
    { title: "Where is freeze–thaw fastest?", q: "Change the mean temperature from −15 °C to 25 °C with plenty of rain. Where does freeze–thaw do most? Where does chemical weathering take over?", hint: "Freeze–thaw peaks near 0 °C, where the temperature crosses freezing most often (the Cairngorms). Chemical weathering is fastest where it is hot and wet (the Amazon): about twice as fast for every 10 °C.", setup() { set({ view: "weather", T: -15, R: 1500 }); } },
    { title: "Undercutting a cliff", q: "Watch the waves cut a notch into a chalk cliff. What makes the overhang fall? Then try sandstone.", hint: "The overhang hangs like a shelf; its bending stress grows with the overhang squared. When it beats the rock's strength it falls as a rockfall. The debris then protects the foot for a while until the waves clear it.", setup() { set({ view: "cliff", crock: "chalk" }); } },
    { title: "Soil creep", q: "Make the slope steeper and the freeze–thaw cycles more frequent. What happens to fence posts and walls on the slope?", hint: "Each cycle the soil heaves up at right angles to the slope and drops straight down, so it moves h tan β downhill. The top moves most, so posts and walls lean downhill and terracettes form.", setup() { set({ view: "creep", hbeta: 10 }); } },
    { title: "The Rest and Be Thankful", q: "Run 30 years on the hillside above the A83. When do the landslides happen? What does heavier rain from climate change do?", hint: "Slides follow intense, long-lasting rain that soaks the shallow soil. Heavier storms make them more frequent even if the yearly rainfall stays the same.", setup() { set({ view: "years" }); } },
    { lvl: "adv", title: "Caine's threshold", q: "Collect 20 landslide-triggering storms. Do they fall above Caine's intensity–duration threshold?", hint: "Caine (1980): I = 14.82 D^−0.39. Short storms need high intensity; long ones trigger slides at lower intensity because the total rain is what raises the water table.", setup() { set({ view: "years", storm: 2 }); } },
    { lvl: "adv", title: "Factor of safety", q: "With the forces chart, find F for a 35° slope of regolith 2 m deep, half saturated. Check it with the infinite-slope equation.", hint: "F = [c + (γ − mγw)z cos²β tan φ] ÷ [γz sin β cos β]. Here F is about 1.0: on the edge of failing.", setup() { set({ view: "slope", beta: 35, z: 2, m: 0.5, veg: "none", soil: "regolith" }); } }
  ],
  batch: [
    { title: "Tilt box: at what angle does dry sand slide?", question: "Tilt a box of dry sand slowly. At what angle does it slide?", how: "Each box's sand has an angle of friction 33.8° ± 1.2° (packing, grain shape); tilt 0.2° at a time until F < 1.", yLabel: "failure angle (°)", reps: 60, bins: 14, theory: 33.8, theoryLabel: "angle of friction", run: (x, r) => { const phi = 33.8 + 1.2 * r.gauss(); let b = 20; while (FoS(b, 0.1, 0, 0, phi).F >= 1) b += 0.2; return b; }, note: "The sand slides at its angle of friction (angle of repose), whatever its depth, because with no cohesion F = tan φ ÷ tan β." },
    { title: "How does water change the safe angle?", question: "For sand with no cohesion, what is the steepest safe slope as the soil gets wetter?", how: "m = fraction of the soil below the water table; φ 33.8° ± 1°; steepen until F < 1.", xLabel: "m (0 dry → 1 saturated)", yLabel: "steepest safe angle (°)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 5, theory: m => critAngle(33.8, m), theoryLabel: "tan β = (1 − mγw/γ) tan φ", run: (m, r) => { const phi = 33.8 + r.gauss(); let b = 5; while (FoS(b, 1, m, 0, phi).F >= 1) b += 0.1; return b; }, note: "A saturated slope is safe only up to about half the dry angle: pore water pressure takes away half the friction. This is why landslides follow heavy rain." },
    { title: "Do roots only help if they reach the slip surface?", question: "How does the factor of safety change with the depth tree roots reach, for a slip surface 1.5 m down?", how: "Slope 38°, regolith, half saturated; roots add 6 kPa cohesion only if they cross the slip surface; φ ± 1°.", xLabel: "root depth (m)", yLabel: "factor of safety F", xs: [0, 0.5, 1, 1.25, 1.75, 2, 2.5, 3], reps: 4, theory: d => FoS(38, 1.5, 0.5, 3 + (d >= 1.5 ? 6 : 0), 36).F, theoryLabel: "infinite slope", run: (d, r) => FoS(38, 1.5, 0.5, 3 + (d >= 1.5 ? 6 : 0), 36 + r.gauss()).F, note: "Nothing changes until the roots cross the slip surface; then F jumps above 1. Trees protect against shallow slides, not deep-seated ones." },
    { title: "Does chemical weathering double every 10 °C?", question: "How fast does granite weather chemically at different mean temperatures?", how: "Hydrolysis with 1000 mm of rain a year; each site varies ±10%.", xLabel: "mean temperature (°C)", yLabel: "mm per 1000 years", xs: [5, 10, 15, 20, 25, 30], reps: 5, yMin: 0, theory: T => chemRate("granite", T, 1000), theoryLabel: "doubles every 10 °C", run: (T, r) => chemRate("granite", T, 1000) * Math.exp(0.1 * r.gauss()), note: "Each 10 °C doubles the rate (5 → 15 → 25 °C: ×2, ×4), so hot, wet places like the Amazon weather deeply." },
    { title: "Where is freeze–thaw fastest?", question: "How fast does freeze–thaw break up granite at different mean temperatures?", how: "1000 mm of rain a year; the number of freeze–thaw cycles each year varies ±15%.", xLabel: "mean temperature (°C)", yLabel: "mm per 1000 years", xs: [-15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15], reps: 4, yMin: 0, theory: T => ftRate("granite", T, 1000), theoryLabel: "cycles across 0 °C", run: (T, r) => ftRate("granite", T, 1000) * Math.exp(0.15 * r.gauss()), note: "A peak just above 0 °C, where the temperature crosses freezing most often. Places that are always frozen or never freeze have little." },
    { title: "Soil creep and slope angle", question: "How fast does the surface soil creep down slopes of different angles?", how: "20 freeze–thaw or wet–dry cycles a year, each heaving the surface 2 mm ± 30%; one year.", xLabel: "slope angle (°)", yLabel: "creep (mm a year)", xs: [0, 5, 10, 15, 20, 25, 30, 35], reps: 4, yMin: 0, theory: b => creepRate(20, 2, b), theoryLabel: "N h tan β", run: (b, r) => { let s = 0; for (let i = 0; i < 20; i++) s += 2 * (1 + 0.3 * r.gauss()) * Math.tan(rad(b)); return s; }, note: "Creep grows with tan β: slow (millimetres a year) but it never stops, so posts and walls lean and terracettes form." },
    { title: "Undercutting a chalk cliff", question: "How does the overhang's factor of safety change as the waves cut the notch deeper?", how: "Chalk 20 m thick above the notch; tensile strength 120 kPa ± 10%.", xLabel: "notch depth (m)", yLabel: "factor of safety F", xs: [3, 4, 5, 6, 7, 8, 10], reps: 4, yMin: 0, theory: u => cliffF(120, 20, u), theoryLabel: "F = σH ÷ 3γu²", run: (u, r) => cliffF(120 * (1 + 0.1 * r.gauss()), 20, u), note: "F falls with the notch depth squared: the cliff falls when the notch is about 6 m deep, then the cycle starts again." },
    { title: "Landslides and rainfall", question: "How many landslides a year does the hillside have for different yearly rainfall?", how: "24 strips at 33°, soil 1.2 m, grass, storminess 1.6; 5 years' warm-up, then 20 years counted.", xLabel: "rainfall (mm a year)", yLabel: "landslides a year", xs: [1200, 1600, 2000, 2400, 2800, 3200], reps: 3, yMin: 0, theory: null, run: (R, r) => slidesPerYear({ beta: 33, zmax: 1.2, rain: R, storm: 1.6, veg: "grass", cc: false, fences: false }, r), note: "Few slides in drier years, many more as rainfall rises: the heavy wet days that push the water table up become more common." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1A", text: "Weathering breaks rock down in place: mechanical (freeze–thaw: water expands 9% as it freezes), chemical (carbonation, hydrolysis, oxidation) and biological (roots, burrowing animals)." },
      { lvl: "std", tag: "1A", text: "Mass movement: sliding, slumping (rotational, on clay), rockfall (from undercut cliffs), soil creep (very slow). Rain makes slopes heavier and, more importantly, raises pore water pressure that reduces friction." },
      { lvl: "std", tag: "1B", text: "Cliffs retreat by a cycle: waves undercut a notch, the overhang collapses, the debris protects the foot until the waves remove it, then undercutting starts again." },
      { lvl: "adv", tag: "2B", text: "Factor of safety F = resisting ÷ driving forces; infinite slope F = [c + (γ − mγw)z cos²β tan φ] ÷ [γz sin β cos β]. Peltier: chemical weathering needs warmth and water; freeze–thaw peaks near 0 °C." },
      { lvl: "adv", tag: "2A", text: "Rainfall thresholds: shallow landslides start above Caine's (1980) line I = 14.82 D^−0.39. Management: drainage, debris fences and catch pits, regrading, vegetation, monitoring (e.g. the A83 Rest and Be Thankful)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how freeze–thaw weathering breaks up rock.", ans: "<ul><li>water enters cracks/joints in the rock</li><li>it freezes and expands (by about 9%), widening the crack</li><li>repeated freezing and thawing breaks off fragments, forming scree</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain why landslides often happen after heavy rain.", ans: "<ul><li>rain soaks into the soil and raises the water table</li><li>water fills the pores between grains and pushes them apart</li><li>this reduces friction/strength (pore water pressure)</li><li>the soil is also heavier, so the slope fails along a slip surface</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Granite weathers at ${chemRate("granite", P.T, P.R).toFixed(1)} mm per 1000 years here. How much is lost in 10 000 years?`, ans: () => `<ul><li>${chemRate("granite", P.T, P.R).toFixed(1)} × 10</li><li>= ${(chemRate("granite", P.T, P.R) * 10).toFixed(0)} mm</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `A slope has resisting force ${slopeNow().res.toFixed(1)} kN and driving force ${slopeNow().drv.toFixed(1)} kN per m². Calculate its factor of safety and say whether it is stable.`, ans: () => `<ul><li>F = resisting ÷ driving</li><li>= ${slopeNow().F.toFixed(2)}</li><li>${slopeNow().F >= 1 ? "F ≥ 1, so it is stable (just)" : "F < 1, so it fails"}</li></ul>` }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Weathering (mm per 1000 years): chemical = k × (rain ÷ 1000 mm) × Q₁₀^((T − 10)/10), Q₁₀ = 2 (hydrolysis, oxidation) or 1.3 (carbonation, which is held back in warm water because CO₂ dissolves less), stopped below about −2 °C; freeze–thaw = k × cycles a year × moisture, with 80 e^(−((T − 1)/5)²) cycles; biological ∝ warmth and rain. Constants are illustrative.</li>
<li>Slopes: the infinite-slope factor of safety with a slip surface parallel to the ground at depth z, γ = 20 kN/m³, γw = 9.81 kN/m³. Roots add cohesion only if they cross the slip surface (grass 2 kPa to 0.3 m, trees 6 kPa to 1.8 m). Load on top adds to both forces. Real slopes are checked with slip circles (Bishop's method).</li>
<li>Cliffs: the overhang above a notch is treated as a cantilever beam; it falls when its bending stress 3γu²/H passes the rock's tensile strength (chalk 120, sandstone 400, limestone 900 kPa). Debris at the foot cuts wave erosion until the waves clear it (20% a year).</li>
<li>Soil creep: each cycle heaves the soil h at right angles to the slope; it drops back vertically, so it moves h tan β downhill. Heave falls to zero at 1 m depth.</li>
<li>Landslides over the years: 24 strips (slope ± 2.5°, φ 36° ± 1.5°, cohesion 2 kPa + roots); daily rain on 55% of days with a long-tailed amount; the water table rises by rain ÷ porosity (0.35) and drains 30% a day; a failed strip loses its soil and roots and slowly regrows. 60% of slides become debris flows that reach the road; debris fences catch 75% of those.</li></ul>
<h3>Left out</h3><ul><li>Rotational slip circles, progressive failure, earthquakes, weathering changing strength over time, real rock joints and bedding. Rates are illustrative.</li></ul>
<h3>Data</h3><ul><li>Caine (1980) intensity–duration threshold; the A83 Rest and Be Thankful (Glen Croe) has had repeated closures from debris flows, with fences and catch pits built since 2013.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/slopes-landslides.html">original/slopes-landslides.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let gg = ui.group("View");
ctl.view = K.seg(gg, { value: "slope", options: [["weather", "🪨 weathering"], ["slope", "⛰ slope stability"], ["cliff", "🌊 undercut cliff"], ["creep", "🐌 soil creep"], ["years", "🌧 landslides over the years"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(gg, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
grp.weather = gg = ui.group("Rock and climate");
ctl.rock = K.seg(gg, { value: "granite", options: Object.keys(ROCK).map(k => [k, ROCK[k].name]), on: v => { P.rock = v; newWeather(); } });
ctl.T = K.slider(gg, { label: "Mean temperature", min: -15, max: 30, step: 1, value: 8, unit: "°C", on: v => P.T = v });
ctl.R = K.slider(gg, { label: "Rainfall", min: 0, max: 3000, step: 50, value: 1200, unit: "mm a year", on: v => P.R = v });
grp.slope = gg = ui.group("The slope");
ctl.soil = K.seg(gg, { value: "regolith", options: Object.keys(SOIL).map(k => [k, SOIL[k].name]), on: v => { P.soil = v; slope.failed = false; } });
ctl.beta = K.slider(gg, { label: "Slope angle", min: 5, max: 50, step: 0.5, value: 30, unit: "°", on: v => P.beta = v });
ctl.z = K.slider(gg, { label: "Depth of the slip surface", min: 0.3, max: 4, step: 0.1, value: 1.5, unit: "m", on: v => P.z = v });
ctl.m = K.slider(gg, { label: "Water table (0 dry, 1 saturated)", min: 0, max: 1, step: 0.01, value: 0, on: v => P.m = v });
ctl.rainOn = K.toggle(gg, { label: "🌧 Rain (raises the water table while running)", value: false, on: v => P.rainOn = v });
ctl.veg = K.seg(gg, { value: "grass", options: Object.keys(VEG).map(k => [k, VEG[k].name]), on: v => P.veg = v });
ctl.q = K.slider(gg, { label: "Load on top (buildings, tipped waste)", min: 0, max: 40, step: 1, value: 0, unit: "kPa", on: v => P.q = v });
let rr = K.row(gg); K.btn(rr, "↺ Rebuild the slope", () => { slope = { failed: false, slip: 0 }; });
grp.cliff = gg = ui.group("The cliff");
ctl.crock = K.seg(gg, { value: "chalk", options: Object.keys(CLIFF).map(k => [k, CLIFF[k].name]), on: v => { P.crock = v; newCliff(); } });
ctl.ch = K.slider(gg, { label: "Rock above the notch", min: 5, max: 50, step: 1, value: 20, unit: "m", on: v => P.ch = v });
ctl.cut = K.slider(gg, { label: "Wave erosion of the notch", min: 0.05, max: 1.5, step: 0.05, value: 0.4, unit: "m a year", on: v => P.cut = v });
rr = K.row(gg); K.btn(rr, "↺ New cliff", () => newCliff());
grp.creep = gg = ui.group("Soil creep");
ctl.cbeta = K.slider(gg, { label: "Slope angle", min: 0, max: 35, step: 1, value: 15, unit: "°", on: v => P.cbeta = v });
ctl.N = K.slider(gg, { label: "Freeze–thaw / wet–dry cycles", min: 0, max: 100, step: 1, value: 20, unit: "a year", on: v => P.N = v });
ctl.h0 = K.slider(gg, { label: "Heave of the surface each cycle", min: 0.5, max: 10, step: 0.5, value: 2, unit: "mm", on: v => P.h0 = v });
rr = K.row(gg); K.btn(rr, "↺ Straighten the posts", () => newCreep());
grp.years = gg = ui.group("The hillside (Glen Croe, A83)");
ctl.hbeta = K.slider(gg, { label: "Slope angle", min: 20, max: 45, step: 0.5, value: 33, unit: "°", on: v => { P.hbeta = v; newHillWorld(); } });
ctl.zmax = K.slider(gg, { label: "Soil depth", min: 0.4, max: 3, step: 0.1, value: 1.2, unit: "m", on: v => { P.zmax = v; newHillWorld(); } });
ctl.rain = K.slider(gg, { label: "Rainfall", min: 800, max: 4000, step: 100, value: 2400, unit: "mm a year", on: v => { P.rain = v; if (hill) hill.o.rain = v; } });
ctl.storm = K.slider(gg, { label: "Storminess (same total, heavier storms)", min: 1, max: 2.5, step: 0.1, value: 1.6, on: v => { P.storm = v; if (hill) hill.o.storm = v; } });
ctl.hveg = K.seg(gg, { value: "grass", options: Object.keys(VEG).map(k => [k, VEG[k].name]), on: v => { P.hveg = v; if (hill) hill.o.veg = v; } });
ctl.cc = K.toggle(gg, { label: "Climate change: heavy days 20% wetter", value: false, on: v => { P.cc = v; if (hill) hill.o.cc = v; } });
ctl.fences = K.toggle(gg, { label: "Debris fences (A level: managing risk)", value: false, on: v => { P.fences = v; if (hill) hill.o.fences = v; } });
rr = K.row(gg); K.btn(rr, "↺ Start again", () => newHillWorld());
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
const slopeNow = () => FoS(P.beta, P.z, P.m, SOIL[P.soil].c + rootC(P.veg, P.z), SOIL[P.soil].phi, P.q);
function newWeather() { W = { t: 0, chem: 0, ft: 0, bio: 0, bits: [] }; }
function newCliff() { cliff = { t: 0, u: 0, talus: 0, retreat: 0, falls: [], fallAnim: 0 }; }
function newCreep() { creep = { t: 0, cyc: 0, ph: 0 }; }
function hillOpts() { return { beta: P.hbeta, zmax: P.zmax, rain: P.rain, storm: P.storm, veg: P.hveg, cc: P.cc, fences: P.fences }; }
function newHillWorld() { hrng = K.rng(7); hill = newHill(hillOpts(), hrng); hill.acc = 0; }
function set(o) {
  Object.assign(P, DEF, o);
  for (const k of ["speed", "T", "R", "beta", "z", "m", "q", "ch", "cut", "cbeta", "N", "h0", "hbeta", "zmax", "rain", "storm"]) ctl[k].set(P[k]);
  for (const k of ["rock", "soil", "veg", "crock", "hveg", "rainOn", "cc", "fences", "view"]) ctl[k].set(P[k]);
  newWeather(); newCliff(); newCreep(); newHillWorld(); slope = { failed: false, slip: 0 }; showGroups();
}

// ---------------- Simulation ----------------
function tick(dt) {
  const s = dt * P.speed;
  if (P.view === "weather") { const yrs = s * 2000; W.t += yrs; W.chem += chemRate(P.rock, P.T, P.R) * yrs / 1000; W.ft += ftRate(P.rock, P.T, P.R) * yrs / 1000; W.bio += bioRate(P.T, P.R) * yrs / 1000; }
  if (P.view === "slope") {
    if (!slope.failed) {
      if (P.rainOn) P.m = Math.min(1, P.m + 0.04 * s); else if (P.m > 0 && slope.wasRain) P.m = Math.max(0, P.m - 0.01 * s);
      slope.wasRain = slope.wasRain || P.rainOn; ctl.m.set(+P.m.toFixed(2));
      if (slopeNow().F < 1) { slope.failed = true; slope.slip = 0; slope.at = { beta: P.beta, m: P.m }; ui.tip("The slope failed: F fell below 1. Press ↺ Rebuild the slope to try again.", 5000); }
    } else slope.slip = Math.min(1, slope.slip + s * 0.6);
  }
  if (P.view === "cliff") {
    const yrs = s * 4, st = CLIFF[P.crock].st; cliff.t += yrs;
    cliff.u += P.cut * Math.exp(-cliff.talus / 40) * yrs;       // debris at the foot absorbs wave energy
    cliff.talus *= Math.pow(0.8, yrs);                            // waves clear 20% of the debris a year
    if (cliffF(st, P.ch, cliff.u) < 1) { cliff.retreat += cliff.u; cliff.talus += cliff.u * P.ch * 1.3; cliff.falls.push([cliff.t, cliff.u]); cliff.u = 0; cliff.fallAnim = 1; }
    cliff.fallAnim = Math.max(0, cliff.fallAnim - s * 0.8);
  }
  if (P.view === "creep") { const yrs = s * 0.5; creep.t += yrs; creep.ph += yrs * P.N; while (creep.ph >= 1) { creep.ph--; creep.cyc++; } }
  if (P.view === "years") { hill.acc += s * 30; while (hill.acc >= 1 && hill.day < 365 * 100) { hill.acc--; hillDay(hill, hrng); } }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawWeather(c, w, h) {
  const rk = ROCK[P.rock], x0 = 60, y0 = 120, bw = w * 0.42, bh = h - 200, lost = Math.min(60, (W.chem + W.ft + W.bio) / 20);
  c.fillStyle = P.T < 0 ? "#2a3550" : P.R < 250 ? "#5a4a30" : "#1e3a2a"; c.fillRect(0, y0 + bh, w * 0.55, h - y0 - bh);
  // the outcrop: joints widen with freeze–thaw, a weathered rind grows with chemical weathering
  c.fillStyle = rk.col; c.fillRect(x0, y0 + lost, bw, bh - lost);
  const rind = Math.min(24, W.chem / 30); c.fillStyle = P.rock === "sandstone" ? "rgba(160,60,20,.6)" : "rgba(120,100,70,.55)"; c.fillRect(x0, y0 + lost, bw, rind);
  const jw = Math.min(10, 1 + W.ft / 60); c.fillStyle = "#0b1020";
  for (let j = 1; j < 4; j++) c.fillRect(x0 + bw * j / 4 - jw / 2, y0 + lost, jw, bh - lost);
  for (let j = 1; j < 3; j++) c.fillRect(x0, y0 + lost + (bh - lost) * j / 3 - jw / 3, bw, jw * 0.66);
  if (P.T < 4 && P.T > -10 && P.R > 200) { c.fillStyle = "#cfe8ff"; for (let j = 1; j < 4; j++) c.fillRect(x0 + bw * j / 4 - jw / 2, y0 + lost, jw, 14); }
  // scree from freeze–thaw at the foot
  const scree = Math.min(80, W.ft / 8); c.fillStyle = rk.col; c.beginPath(); c.moveTo(x0 + bw, y0 + bh); c.lineTo(x0 + bw + scree * 1.6, y0 + bh); c.lineTo(x0 + bw, y0 + bh - scree); c.fill();
  if (W.bio > 2 && P.T > 0) { c.fillStyle = "#4a8a4a"; for (let j = 0; j < 5; j++) c.fillRect(x0 + 20 + j * bw / 5, y0 + lost - 10, 4, 10 + Math.min(30, W.bio / 6)); }
  TX(c, `${(W.t / 1000).toFixed(1)} thousand years · ${rk.name} · ${P.T} °C, ${P.R} mm a year`, 14, 26, "#eef2f8", "left", "600 14px");
  TX(c, `chemical: ${rk.proc}`, 14, 48, "#cfd8ea", "left", "12px");
  TX(c, `surface lowered ${((W.chem + W.ft + W.bio)).toFixed(0)} mm (1 px = 20 mm)`, x0, y0 - 10, "#ffd166", "left", "12px");
  // Peltier-style diagram: which weathering dominates for each climate
  const px = w * 0.58, py = 96, pw = w * 0.38, ph = h - 140, gx = T => px + pw * (T + 15) / 45, gy = R => py + ph * (1 - R / 3000);
  for (let T = -15; T < 30; T += 1.5) for (let R = 0; R < 3000; R += 100) { const a = chemRate(P.rock, T + 0.75, R + 50), b = ftRate(P.rock, T + 0.75, R + 50), tot = a + b + 1e-9; const br = 0.3 + 0.7 * Math.min(1, tot / 50); c.fillStyle = `rgb(${Math.round(br * (60 + 190 * a / tot))},${Math.round(br * 90)},${Math.round(br * (60 + 190 * b / tot))})`; c.fillRect(Math.floor(gx(T)), Math.floor(gy(R + 100)), Math.ceil(pw / 30) + 1, Math.ceil(ph / 30) + 1); }
  PLACES.forEach(([n, T, R]) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(gx(T), gy(R), 3, 0, 6.3); c.fill(); TX(c, n, gx(T) + 5, gy(R) + 4, "#eef2f8", "left", "11px"); });
  c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.arc(gx(P.T), gy(P.R), 7, 0, 6.3); c.stroke(); c.lineWidth = 1;
  TX(c, "Peltier-style: red chemical · blue freeze–thaw · brighter = faster", px, py - 10, "#cfd8ea", "left", "11.5px");
  TX(c, "−15 °C", px, py + ph + 14, "#8fa0bf", "left", "11px"); TX(c, "mean temperature → 30 °C", px + pw, py + ph + 14, "#8fa0bf", "right", "11px"); TX(c, "3000 mm", px - 4, py + 8, "#8fa0bf", "right", "11px"); TX(c, "0", px - 4, py + ph, "#8fa0bf", "right", "11px");
}
function drawSlope(c, w, h) {
  const S = SOIL[P.soil], b = rad(P.beta), F = slopeNow().F, L = Math.min(w * 0.85, (h - 120) / Math.max(0.2, Math.sin(b))), xa = 50, ya = h - 50, xb = xa + L * Math.cos(b), yb = ya - L * Math.sin(b);
  const zpx = Math.min(70, P.z * 22), nx = Math.sin(b), ny = Math.cos(b);   // soil shown 22 px per metre (thicker than true scale)
  c.fillStyle = "#3a3530"; c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.lineTo(xb, h); c.lineTo(xa, h); c.fill();   // bedrock
  const sl = slope.failed ? slope.slip * L * 0.35 : 0, ox = -sl * Math.cos(b), oy = sl * Math.sin(b);
  // the soil layer above the slip surface (it slides down the slope when F < 1)
  c.fillStyle = S.col; c.beginPath(); c.moveTo(xa + ox, ya + oy); c.lineTo(xb + ox, yb + oy); c.lineTo(xb + ox - nx * zpx, yb + oy - ny * zpx); c.lineTo(xa + ox - nx * zpx, ya + oy - ny * zpx); c.fill();
  if (slope.failed) { c.fillStyle = S.col; c.beginPath(); c.ellipse(xa + 40, ya - 6, 30 + 70 * slope.slip, 8 + 18 * slope.slip, 0, Math.PI, 0); c.fill(); }
  // water table inside the soil
  const wpx = zpx * P.m; c.fillStyle = "rgba(90,160,255,.45)"; c.beginPath(); c.moveTo(xa + ox, ya + oy); c.lineTo(xb + ox, yb + oy); c.lineTo(xb + ox - nx * wpx, yb + oy - ny * wpx); c.lineTo(xa + ox - nx * wpx, ya + oy - ny * wpx); c.fill();
  c.strokeStyle = slope.failed ? "#ff6b6b" : "#ffd166"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.stroke(); c.setLineDash([]);
  // vegetation: roots drawn to their depth (do they cross the slip surface?)
  if (P.veg !== "none") for (let i = 1; i < 9; i++) { const u = i / 9, x = xa + ox + (xb - xa) * u - nx * zpx, y = ya + oy + (yb - ya) * u - ny * zpx, rd = Math.min(zpx + 10, VEG[P.veg].depth * 22); c.strokeStyle = "#8a6a3a"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + nx * rd, y + ny * rd); c.stroke(); if (P.veg === "trees") { c.fillStyle = "#2f6a3a"; c.beginPath(); c.arc(x, y - 22, 12, 0, 6.3); c.fill(); c.fillStyle = "#6b4a2a"; c.fillRect(x - 2, y - 12, 4, 12); } else { c.fillStyle = "#4a9a4a"; c.fillRect(x - 6, y - 4, 12, 4); } }
  if (P.q > 0) { const x = xa + ox + (xb - xa) * 0.7 - nx * zpx, y = ya + oy + (yb - ya) * 0.7 - ny * zpx; c.fillStyle = "#c8c0b0"; c.fillRect(x - 16, y - 14 - P.q * 0.6, 32, 14 + P.q * 0.6); TX(c, `${P.q} kPa`, x, y - 20 - P.q * 0.6, "#eef2f8", "center", "11px"); }
  if (P.rainOn && !slope.failed) { c.strokeStyle = "rgba(160,200,255,.6)"; for (let i = 0; i < 60; i++) { const x = (i * 97 + performance.now() * 0.3) % w, y = (i * 53 + performance.now() * 0.6) % (h * 0.6); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 10); c.stroke(); } }
  TX(c, `${S.name} · slope ${P.beta}° · slip surface ${P.z} m down (gold dashes) · ${VEG[P.veg].name}${VEG[P.veg].depth ? ` (roots to ${VEG[P.veg].depth} m)` : ""}`, 14, 26, "#eef2f8", "left", "600 14px");
  TX(c, slope.failed ? `FAILED (F fell below 1 at ${slope.at.beta}°, water table ${slope.at.m.toFixed(2)})` : `factor of safety F = ${F.toFixed(2)} ${F < 1.2 ? "· close to failing" : "· stable"}`, 14, 52, slope.failed ? "#ff6b6b" : F < 1.2 ? "#ffb347" : "#7ee787", "left", "600 16px");
}
function drawCliff(c, w, h) {
  const rk = CLIFF[P.crock], sc = Math.min(6, (h - 140) / (P.ch + 8)), sea = h - 70, top = sea - (P.ch + 4) * sc, fx = w * 0.55 - Math.min(w * 0.4, cliff.retreat * sc * 0.2);
  c.fillStyle = "#123056"; c.fillRect(0, sea - 4 * sc * 0.3, w, h); c.fillStyle = "#29466e"; c.fillRect(0, sea, w, h - sea);
  // cliff body with the notch cut at the bottom (4 m high)
  const nH = 4 * sc, u = cliff.u * sc;
  c.fillStyle = rk.col; c.beginPath(); c.moveTo(fx, top); c.lineTo(w, top); c.lineTo(w, h); c.lineTo(fx + u, h); c.lineTo(fx + u, sea); c.lineTo(fx + u, sea - nH); c.lineTo(fx, sea - nH); c.closePath(); c.fill();
  c.fillStyle = "#2f6a3a"; c.fillRect(fx, top - 4, w - fx, 4);
  c.fillStyle = "#0b1020"; c.fillRect(fx, sea - nH, u, nH);
  if (cliff.fallAnim > 0) { const k = 1 - cliff.fallAnim; c.fillStyle = rk.col; for (let i = 0; i < 12; i++) c.fillRect(fx - 30 + i * 9, top + (sea - top) * k + (i % 3) * 8, 8, 8); }
  if (cliff.talus > 1) { const tw = Math.min(160, Math.sqrt(cliff.talus) * sc * 1.2); c.fillStyle = rk.col; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(fx + u, sea); c.lineTo(fx - tw, sea); c.lineTo(fx + u, sea - tw * 0.5); c.fill(); c.globalAlpha = 1; }
  for (let i = 0; i < 6; i++) { const x = fx - 220 + ((performance.now() * 0.05 + i * 40) % 220); c.strokeStyle = "#cfe3ff"; c.beginPath(); c.arc(x, sea - 6, 8, Math.PI, 0); c.stroke(); }
  const F = cliffF(rk.st, P.ch, cliff.u);
  TX(c, `${rk.name} cliff · ${cliff.t.toFixed(0)} years · notch ${cliff.u.toFixed(1)} m deep (falls at about ${uCrit(rk.st, P.ch).toFixed(1)} m)`, 14, 26, "#eef2f8", "left", "600 14px");
  TX(c, `overhang factor of safety F = ${F === Infinity ? "∞" : F.toFixed(2)} · ${cliff.falls.length} rockfalls · cliff top retreated ${cliff.retreat.toFixed(1)} m`, 14, 50, F < 1.3 ? "#ffb347" : "#7ee787", "left", "600 14px");
  if (cliff.talus > 1) TX(c, "debris at the foot protects the cliff until the waves clear it", 14, 72, "#cfd8ea", "left", "12px");
}
function drawCreep(c, w, h) {
  const b = rad(P.cbeta), cx = 60, cy = h * 0.35, L = w - 120, dpx = 120, ex = 40;   // ex: creep drawn 40× bigger than true
  const dx = Math.cos(b), dy = Math.sin(b), nx = -Math.sin(b), ny = Math.cos(b), surf = s => [cx + s * dx, cy + s * dy];
  c.fillStyle = "#3a3530"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + L * dx, cy + L * dy); c.lineTo(cx + L * dx, h); c.lineTo(cx, h); c.fill();
  c.fillStyle = "#6a5a40"; c.beginPath(); const [ax, ay] = surf(0), [bx, by] = surf(L); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx + nx * dpx, by + ny * dpx); c.lineTo(ax + nx * dpx, ay + ny * dpx); c.fill();
  const dispMM = d => creep.cyc * P.h0 * Math.max(0, 1 - d) * Math.tan(b), phase = creep.ph, heave = d => (phase < 0.5 ? phase * 2 : 2 - phase * 2) * P.h0 * Math.max(0, 1 - d);
  // fence posts: the top creeps more than the base, so they lean downhill
  for (let k = 1; k < 6; k++) {
    const s0 = L * k / 6, vd = dpx / Math.cos(b), pt = d => { const [x, y] = surf(s0 + dispMM(d) * ex / 10); return [x, y + vd * d]; };   // the point of the post at depth d (fraction of the soil)
    const [tx, ty] = pt(0), [bx2, by2] = pt(1), lean = (tx - bx2) / (by2 - ty);
    c.strokeStyle = "#c8a070"; c.lineWidth = 5; c.beginPath(); c.moveTo(tx + lean * 36, ty - 36); for (let d = 0; d <= 1.001; d += 0.1) { const [x, y] = pt(d); c.lineTo(x, y); } c.stroke(); c.lineWidth = 1;
  }
  // a marked grain at the surface: heave at right angles, drop straight down (the zig-zag)
  const s1 = L * 0.1 + dispMM(0) * ex / 10, [gx, gy] = surf(s1); c.fillStyle = "#ff6b81"; c.beginPath(); c.arc(gx - nx * heave(0) * ex / 10 * 2, gy - ny * heave(0) * ex / 10 * 2 - 4, 5, 0, 6.3); c.fill();
  TX(c, `soil creep · slope ${P.cbeta}° · ${creep.cyc} cycles (${creep.t.toFixed(1)} years) · surface moved ${dispMM(0).toFixed(0)} mm (drawn ×4)`, 14, 26, "#eef2f8", "left", "600 14px");
  TX(c, "each cycle: heave up at right angles to the slope, drop straight down → a step h tan β downhill; the top moves most, so posts lean", 14, 48, "#cfd8ea", "left", "12px");
}
function drawYears(c, w, h) {
  const S = hill, x0 = 40, x1 = w - 40, y0 = 70, y1 = h - 90, sw = (x1 - x0) / NS;
  c.fillStyle = "#1a2a1a"; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  S.strips.forEach((p, i) => {
    const t = Math.max(0, Math.min(1, (p.F - 0.9) / 0.6)), hz = (y1 - y0) * Math.min(1, p.z / 3);
    c.fillStyle = p.scar > 0.05 ? `rgba(150,100,60,${(0.4 + 0.6 * p.scar).toFixed(2)})` : `rgb(${Math.round(220 - 160 * t)},${Math.round(80 + 110 * t)},70)`;
    c.fillRect(x0 + i * sw + 1, y0, sw - 2, y1 - y0);
    c.fillStyle = "rgba(90,160,255,.55)"; c.fillRect(x0 + i * sw + 3, y1 - hz * p.hw / Math.max(0.01, p.z), sw - 6, hz * p.hw / Math.max(0.01, p.z));
    c.strokeStyle = "rgba(255,255,255,.35)"; c.strokeRect(x0 + i * sw + 3, y1 - hz, sw - 6, hz);
  });
  c.fillStyle = "#555b66"; c.fillRect(x0, y1 + 10, x1 - x0, 14); TX(c, `A83 road · closed by ${S.closed} debris flow${S.closed === 1 ? "" : "s"}${S.o.fences ? ` · fences caught ${S.caught}` : ""}`, x0 + 8, y1 + 21, "#fff", "left", "600 11px");
  const today = S.rain.length ? S.rain[S.rain.length - 1] : 0; if (today > 1) { c.strokeStyle = "rgba(160,200,255,.6)"; for (let i = 0; i < Math.min(120, today * 2); i++) { const x = x0 + (i * 97 + performance.now() * 0.3) % (x1 - x0), y = 30 + (i * 53 + performance.now() * 0.6) % (y1 - 40); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 10); c.stroke(); } }
  TX(c, `year ${Math.floor(S.day / 365) + 1}, day ${S.day % 365 + 1} · ${S.slides} landslide${S.slides === 1 ? "" : "s"} · today's rain ${today.toFixed(0)} mm`, 14, 26, "#eef2f8", "left", "600 14px");
  TX(c, "24 strips of hillside: green safe → red near failing, brown = fresh scar; blue = water table in each strip's soil (box = soil depth)", 14, 50, "#cfd8ea", "left", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ weather: drawWeather, slope: drawSlope, cliff: drawCliff, creep: drawCreep, years: drawYears })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const adv = ui.level === "adv";
  if (P.view === "weather") {
    const a = [], b = [], bi = []; for (let T = -15; T <= 30; T += 0.5) { a.push([T, chemRate(P.rock, T, P.R)]); b.push([T, ftRate(P.rock, T, P.R)]); bi.push([T, bioRate(T, P.R)]); }
    chA.opts.title = "Weathering rate against temperature"; chA.opts.xLabel = "mean temperature (°C)"; chA.opts.yLabel = "mm per 1000 yr"; chA.draw([{ pts: a, color: "#ff8a70", label: "chemical" }, { pts: b, color: "#5ad1ff", label: "freeze–thaw" }, { pts: bi, color: "#7ee787", label: "biological" }], { xMin: -15, xMax: 30, yMin: 0, vlines: [{ x: P.T, color: "#ffd166", label: "now" }] });
    const ra = [], rb = []; for (let R = 0; R <= 3000; R += 50) { ra.push([R, chemRate(P.rock, P.T, R)]); rb.push([R, ftRate(P.rock, P.T, R)]); }
    chB.opts.title = "Weathering rate against rainfall"; chB.opts.xLabel = "rain (mm a year)"; chB.opts.yLabel = "mm per 1000 yr"; chB.draw([{ pts: ra, color: "#ff8a70", label: "chemical" }, { pts: rb, color: "#5ad1ff", label: "freeze–thaw" }], { xMin: 0, xMax: 3000, yMin: 0, vlines: [{ x: P.R, color: "#ffd166", label: "now" }] });
    relabel(["chemical", "freeze–thaw cycles a year", "freeze–thaw", "biological", "total lost so far"]);
    read.set("a", chemRate(P.rock, P.T, P.R).toFixed(1) + " mm / 1000 yr"); read.set("b", (ftCycles(P.T) * Math.min(1, P.R / 500)).toFixed(0)); read.set("c", ftRate(P.rock, P.T, P.R).toFixed(1) + " mm / 1000 yr"); read.set("d", bioRate(P.T, P.R).toFixed(1) + " mm / 1000 yr"); read.set("e", (W.chem + W.ft + W.bio).toFixed(0) + " mm");
  } else if (P.view === "slope") {
    const f = slopeNow(), S = SOIL[P.soil], c0 = S.c + rootC(P.veg, P.z);
    chA.opts.title = "Forces on the slip surface (per m²)"; chA.opts.xLabel = "0 resisting · 1 driving"; chA.opts.yLabel = "kPa"; chA.draw([{ pts: [[0, f.res]], type: "bars", w: 0.6, color: "#7ee787", label: "resisting (friction + cohesion + roots)" }, { pts: [[1, f.drv]], type: "bars", w: 0.6, color: "#ff8a70", label: "driving (weight down the slope)" }], { xMin: -0.6, xMax: 1.6, yMin: 0 });
    const d = [], n = [], s = []; for (let bb = 5; bb <= 60; bb += 0.5) { d.push([bb, Math.min(4, FoS(bb, P.z, 0, c0, S.phi, P.q).F)]); n.push([bb, Math.min(4, FoS(bb, P.z, P.m, c0, S.phi, P.q).F)]); s.push([bb, Math.min(4, FoS(bb, P.z, 1, c0, S.phi, P.q).F)]); }
    chB.opts.title = "Factor of safety against slope angle"; chB.opts.xLabel = "slope angle (°)"; chB.opts.yLabel = "F"; chB.draw([{ pts: d, color: "#ffd166", label: "dry" }, { pts: n, color: "#fff", label: "now" }, { pts: s, color: "#5ad1ff", label: "saturated" }, { pts: [[P.beta, Math.min(4, f.F)]], type: "dots", r: 6, color: "#fff" }], { xMin: 5, xMax: 60, yMin: 0, yMax: 4, hlines: [{ y: 1, color: "#ff6b6b", label: "F = 1: fails" }] });
    relabel(["factor of safety F", "resisting", "driving", "cohesion (soil + roots)", adv ? "steepest safe angle (dry, saturated)" : "state"]);
    read.set("a", f.F.toFixed(2)); read.set("b", f.res.toFixed(1) + " kPa"); read.set("c", f.drv.toFixed(1) + " kPa"); read.set("d", c0.toFixed(1) + " kPa" + (VEG[P.veg].cr && !rootC(P.veg, P.z) ? " (roots too shallow)" : ""));
    read.set("e", adv ? (S.c ? "cohesive: depends on depth" : `${critAngle(S.phi, 0).toFixed(1)}°, ${critAngle(S.phi, 1).toFixed(1)}°`) : slope.failed ? "failed" : f.F < 1.2 ? "close to failing" : "stable");
  } else if (P.view === "cliff") {
    const st = CLIFF[P.crock].st, pts = []; for (let u = 0.5; u <= 12; u += 0.1) pts.push([u, Math.min(5, cliffF(st, P.ch, u))]);
    chA.opts.title = "Overhang factor of safety against notch depth"; chA.opts.xLabel = "notch depth (m)"; chA.opts.yLabel = "F"; chA.draw([{ pts, color: "#ffd166", label: "F = σH ÷ 3γu²" }, { pts: [[cliff.u, Math.min(5, cliffF(st, P.ch, cliff.u))]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 12, yMin: 0, yMax: 5, hlines: [{ y: 1, color: "#ff6b6b", label: "falls" }] });
    chB.opts.title = "Rockfalls: notch depth when each fell"; chB.opts.xLabel = "years"; chB.opts.yLabel = "m"; chB.draw([{ pts: cliff.falls.length ? cliff.falls : [[0, 0]], type: "dots", r: 5, color: "#ff8a70", label: "rockfall" }], { xMin: 0, yMin: 0 });
    const gaps = cliff.falls.slice(1).map((f, i) => f[0] - cliff.falls[i][0]);
    relabel(["notch depth", "factor of safety", "rockfalls", "average time between falls", "cliff retreat rate"]);
    read.set("a", cliff.u.toFixed(2) + " m"); read.set("b", cliffF(st, P.ch, cliff.u) === Infinity ? "∞" : cliffF(st, P.ch, cliff.u).toFixed(2)); read.set("c", String(cliff.falls.length)); read.set("d", gaps.length ? K.mean(gaps).toFixed(1) + " years" : "–"); read.set("e", cliff.t > 0 ? (cliff.retreat / cliff.t).toFixed(2) + " m a year" : "–");
  } else if (P.view === "creep") {
    const prof = []; for (let d = 0; d <= 1.2; d += 0.05) prof.push([creepRate(P.N, P.h0, P.cbeta, d), -d]);
    chA.opts.title = "Creep speed with depth"; chA.opts.xLabel = "mm a year"; chA.opts.yLabel = "depth (m, negative)"; chA.draw([{ pts: prof, color: "#ffd166", label: "creep" }], { xMin: 0, yMax: 0 });
    const kinds = [["creep", Math.log10(0.01 / 3.15e10)], ["solifluction", Math.log10(0.5 / 3.15e7)], ["slump", Math.log10(1 / 86400)], ["mudflow", Math.log10(1)], ["rockfall", Math.log10(30)]];
    chB.opts.title = "How fast? (log₁₀ speed, m/s)"; chB.opts.xLabel = "0 creep · 1 solifluction · 2 slump · 3 mudflow · 4 rockfall"; chB.opts.yLabel = "log₁₀(m/s)"; chB.draw(kinds.map((k, i) => ({ pts: [[i, k[1] + 13]], type: "bars", w: 0.6, color: ["#ffd166", "#5ad1ff", "#ff8a70", "#c58aff", "#ff6b6b"][i], label: k[0] })), { xMin: -0.6, xMax: 4.6, yMin: 0, yFmt: v => (v - 13).toFixed(0) });
    relabel(["surface creep", "creep at 0.5 m", "step each cycle", "cycles so far", "surface moved"]);
    read.set("a", creepRate(P.N, P.h0, P.cbeta).toFixed(1) + " mm a year"); read.set("b", creepRate(P.N, P.h0, P.cbeta, 0.5).toFixed(1) + " mm a year"); read.set("c", (P.h0 * Math.tan(rad(P.cbeta))).toFixed(2) + " mm"); read.set("d", String(creep.cyc)); read.set("e", (creep.cyc * P.h0 * Math.tan(rad(P.cbeta))).toFixed(0) + " mm");
  } else {
    const S = hill, n0 = S.day - S.rain.length;
    chA.opts.title = "Daily rain and the weakest strip's F"; chA.opts.xLabel = "day"; chA.opts.yLabel = "rain (mm) · F × 50"; chA.draw([{ pts: S.rain.map((v, i) => [n0 + i, v]), type: "bars", w: 1, color: "#5ad1ff", label: "rain" }, { pts: S.minF.map((v, i) => [n0 + i, Math.min(150, v * 50)]), color: "#ffd166", label: "weakest F × 50" }], { yMin: 0, hlines: [{ y: 50, color: "#ff6b6b", label: "F = 1" }] });
    if (adv) {
      const th = []; for (let lg = 0; lg <= 3; lg += 0.05) th.push([lg, Math.log10(caine(10 ** lg))]);
      chB.opts.title = "Storms that triggered slides (log–log)"; chB.opts.xLabel = "log₁₀(duration, hours)"; chB.opts.yLabel = "log₁₀(intensity, mm/h)"; chB.draw([{ pts: th, color: "#ff6b6b", label: "Caine (1980)" }, { pts: S.caine.length ? S.caine.map(([D, I]) => [Math.log10(D), Math.log10(I)]) : [[1, 0]], type: "dots", r: 4, color: "#ffd166", label: "triggering storms" }], { xMin: 0, xMax: 3 });
    } else { chB.opts.title = "Landslides each year"; chB.opts.xLabel = "year"; chB.opts.yLabel = "landslides"; chB.draw([{ pts: S.years.map((v, i) => [i + 1, v]), type: "bars", w: 0.8, color: "#ff8a70", label: "landslides" }], { xMin: 0.5, xMax: Math.max(10, S.years.length) + 0.5, yMin: 0 }); }
    const yrs = Math.max(1 / 365, S.day / 365);
    relabel(["years", "landslides", "landslides a year", "road closures", "weakest strip's F"]);
    read.set("a", (S.day / 365).toFixed(1)); read.set("b", String(S.slides)); read.set("c", (S.slides / yrs).toFixed(2)); read.set("d", String(S.closed) + (S.o.fences ? ` (${S.caught} caught)` : "")); read.set("e", S.minF.length ? S.minF[S.minF.length - 1].toFixed(2) : "–");
  }
}
ui.hud("");
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views at the top of the controls.", 6000);
