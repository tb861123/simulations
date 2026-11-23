/* =====================================================================
   HOTSPOT ISLAND CHAINS
   A plate moves at speed v over a MANTLE PLUME that stays still deep in
   the mantle. Hot plume rock rises, the pressure on it falls and a few
   per cent of it melts (decompression melting); the magma rises through
   the plate and builds a volcano. The plate carries each volcano away
   from the plume, its magma supply is cut off, and a new one starts
   above the plume. So the volcanoes get OLDER with DISTANCE from the
   hotspot:   age = distance ÷ v   (Hawaiʻi: about 8–10 cm/yr).
   Once off the plume a volcano is worn down (erosion) and sinks
   (subsidence): active shield volcano → eroding island → atoll (a coral
   reef keeping pace at sea level) → guyot (a flat-topped seamount).

   THE MODEL (one volcano = one island; a = age in Myr; heights in km;
   z = summit height relative to sea level; x = distance from the plume, km)
     Plate       every volcano moves at v; a new one starts above the plume
                 every 1.6 Myr (with "irregular plume": 1.1–2.1 Myr, and a
                 supply 0.85–1.15 × as strong, from a seeded random generator)
     Growth      dH/dt = G·s·exp(−(x/σ)²)·(1 − H/Hmax)
                 G = 45 km/Myr, σ = 70 km, Hmax = 13 km, s = magma supply (0.5–1.5)
     Subsidence  S(a) = k·[F(1 − e^(−a/τ)) + C√a]
                 F = 2 km, τ = 1 Myr (the plate bends under the volcano's weight)
                 C = 0.8 km/√Myr (the plate cools and moves off the hotspot swell)
     Erosion     dH/dt = −kE·e·z while z > 0  (kE = 0.5 per Myr, e = 0–2);
                 waves plane the top flat at sea level
     Reef        once extinct and at sea level, coral grows up to 0.5 mm/yr to
                 stay at the surface; it dies if it falls 100 m behind (drowned)
                 or is carried past 680 km (an illustrative "reef limit" standing
                 in for the Darwin point, where the water is too cool)
     Method      fixed steps of 0.01 Myr; deterministic for a given seed
   Real Hawaiian ages and distances: Clague and Dalrymple (1987), via the
   Hawaii Center for Volcanology (SOEST) and NOAA Ocean Explorer.
   ===================================================================== */

// ---------------- 1. The model ----------------
const M = Object.freeze({
  D0: 5.0,          // km, sea-floor depth before loading
  SIGMA: 70,        // km, width of the plume's supply
  G: 45,            // km/Myr, growth-rate scale
  HCAP: 13,         // km, the tallest a volcano can grow above its base
  KE: 0.5,          // 1/Myr, erosion constant
  F: 2.0,           // km, total flexural subsidence
  TAUF: 1.0,        // Myr, flexure time constant
  C: 0.8,           // km per √Myr, cooling subsidence
  X_DARWIN: -680,   // km, illustrative reef limit
  REEF_MAX: 0.5,    // km/Myr, fastest reef growth (= 0.5 mm/yr)
  REEF_DROWN: 0.1,  // km, the reef dies if its top falls this far below sea level
  SPAWN: 1.6,       // Myr between new volcanoes
  DT: 0.01,         // Myr, fixed step
  WPK: 11,          // km of base half-width per km of height (gentle shield slopes)
  GROW_ACTIVE: 0.3  // km/Myr, growth rate counted as "active over the plume"
});
const VIEW_W = 1000, X_MIN = -850;   // km shown in the cross-section and map
const MYR_PER_S = 1 / 3;             // model Myr per real second at 1× speed
const P = { v: 8.5, supply: 1, erosion: 1, subs: 1, ve: 10, loop: 10, irregular: false, seed: 7 };

const fmt = (x, d) => (typeof x === "number" && isFinite(x)) ? x.toFixed(d) : "–";
const subsCurve = a => { a = Math.max(0, a); return M.F * (1 - Math.exp(-a / M.TAUF)) + M.C * Math.sqrt(a); };
const subsRate = a => { a = Math.max(0.05, a); return P.subs * (M.F / M.TAUF * Math.exp(-a / M.TAUF) + M.C / (2 * Math.sqrt(a))); };   // km/Myr = mm/yr
const supplyProfile = x => { const u = x / M.SIGMA; return Math.exp(-u * u); };
let S = null;
const volcX = v => -(S.disp - v.birthDisp);
const volcAge = v => S.t - v.birthT;
const zVolc = v => -M.D0 + v.H - v.sub;       // summit of the rock, relative to sea level
const zTop = v => zVolc(v) + v.reef;          // summit including any reef
const vWidth = v => Math.max(20, M.WPK * v.Hpeak);
function flatHalf(v) { if (v.Hpeak <= 0) return 0; return vWidth(v) * Math.pow(Math.max(0, 1 - v.H / v.Hpeak), 1 / 1.5); }
function seaHalf(v) { const need = M.D0 + v.sub; if (v.H <= need || v.Hpeak <= 0) return 0; return vWidth(v) * Math.pow(Math.max(0, 1 - need / v.Hpeak), 1 / 1.5); }
function vSurface(v, r) {   // surface height (km) of volcano v at r km from its centre
  const w = vWidth(v), u = Math.abs(r) / w; if (u >= 1) return -Infinity;
  const hp = v.Hpeak * (1 - Math.pow(u, 1.5)); let z = -M.D0 - v.sub + Math.min(hp, v.H);
  const er = v.Hpeak - v.H;
  if (z > 0 && er > 0.05) {   // river valleys on land (drawn texture only)
    const n = Math.abs(Math.sin(r * 0.23 + v.id * 1.7) * 0.6 + Math.sin(r * 0.61 + v.id * 3.1) * 0.4);
    z -= Math.min(0.5, er * 0.12) * n * Math.min(1, z / 0.3); if (z < 0) z = 0;
  }
  return z;
}
function floorZ(x, xs) { let z = -M.D0; for (let i = 0; i < S.vols.length; i++) { const v = S.vols[i], d = (x - xs[i]) / (1.4 * vWidth(v)); z -= v.sub * Math.exp(-d * d); } return z; }   // the moat round each volcano (drawn only)
const STAGE_NAME = { subshield: "Growing underwater volcano (over the plume)", shield: "Active shield volcano (island over the plume)", island: "Eroding island (extinct, off the plume)", atoll: "Atoll (coral reef at sea level)", platform: "Worn down to sea level", guyot: "Guyot (flat-topped, submerged)", seamount: "Seamount (submerged)" };
function classify(v) {
  const zv = zVolc(v), z = zv + v.reef;
  if (v.gr >= M.GROW_ACTIVE) return z > 0 ? "shield" : "subshield";
  if (zv > 0.02) return "island";
  if (v.reef > 0.02 && z > -0.02) return "atoll";
  if (z > -0.02) return "platform";
  return (v.Hpeak - v.H > 0.3 || v.reef > 0.02) ? "guyot" : "seamount";
}
function eventText(v, st, prev) {
  const n = "V" + v.id;
  switch (st) {
    case "subshield": return n + " starts growing on the sea floor above the plume.";
    case "shield": return n + " breaks the sea surface: a new volcanic island.";
    case "island": return n + " is carried off the plume. Its magma supply is cut off, so erosion and sinking now win.";
    case "atoll": return n + ": the volcano has sunk below sea level, but the coral reef keeps pace, forming an atoll.";
    case "platform": return n + " has been worn down to sea level.";
    case "guyot": return v.deadWhy === "cold" ? n + " has been carried past the reef limit. The reef dies and sinks, forming a guyot." : v.deadWhy === "drowned" ? n + ": sinking outpaced the reef, which drowned. It is now a guyot." : n + " has sunk below the waves, leaving a flat-topped guyot.";
    case "seamount": return n + (prev === "subshield" ? " left the plume before reaching the surface, so it is a seamount." : " is now a submerged seamount.");
    default: return n + " changed stage.";
  }
}
function addVolcano() {
  const id = S.vols.length + 1, sup = P.irregular ? 0.85 + 0.3 * S.rng() : 1;
  S.vols.push({ id, birthT: S.t, birthDisp: S.disp, sup, H: 0, Hpeak: 0, sub: 0, reef: 0, reefDead: false, deadWhy: "", gr: 0, stage: "", hist: [], lastHist: -1, aboveFrom: null, aboveTo: null, erodedAtSea: null });
  S.nextSpawn += P.irregular ? M.SPAWN * (0.7 + 0.6 * S.rng()) : M.SPAWN;
}
function stepModel(dt) {
  const vk = K.clamp(P.v, 2, 12) * 10;   // cm/yr → km/Myr
  S.disp += vk * dt; S.t += dt;
  while (S.t >= S.nextSpawn - 1e-9) addVolcano();
  const sup = K.clamp(P.supply, 0.5, 1.5), ero = K.clamp(P.erosion, 0, 2), sm = K.clamp(P.subs, 0, 2);
  for (const v of S.vols) {
    const a = S.t - v.birthT, aPrev = Math.max(0, a - dt), x = volcX(v);
    v.gr = M.G * sup * v.sup * supplyProfile(x) * Math.max(0, 1 - v.H / M.HCAP);   // growth: only near the plume
    v.H += v.gr * dt; if (v.H > v.Hpeak) v.Hpeak = v.H;
    v.sub += sm * (subsCurve(a) - subsCurve(aPrev));                                // subsidence: the exact increment
    let zv = zVolc(v);
    if (zv > 0) { v.H = Math.max(0, v.H - M.KE * ero * zv * dt); zv = zVolc(v); }    // erosion of the part above sea level
    if (!v.reefDead && v.gr < 0.05 && zv < 0.05) {                                  // coral reef
      if (x > M.X_DARWIN) { const top = zv + v.reef; if (top < 0) v.reef += Math.min(M.REEF_MAX * dt, -top); if (zv + v.reef < -M.REEF_DROWN) { v.reefDead = true; v.deadWhy = "drowned"; } }
      else { v.reefDead = true; v.deadWhy = "cold"; }
    }
    if (v.reef > 0 && zv + v.reef > 0) v.reef = Math.max(0, -zv);
    // record when the rock summit is above sea level (used by the batch runs)
    if (zv > 0.02 && v.aboveFrom === null) v.aboveFrom = a;
    if (v.aboveFrom !== null && v.aboveTo === null && zv <= 0.02 && v.gr < M.GROW_ACTIVE) { v.aboveTo = a; v.erodedAtSea = v.Hpeak - v.H; }
    const st = classify(v);
    if (st !== v.stage) { S.events.unshift({ t: S.t, txt: eventText(v, st, v.stage) }); if (S.events.length > 5) S.events.length = 5; v.stage = st; }
    if (a - v.lastHist >= 0.05 - 1e-9) { v.hist.push([a, zTop(v) * 1000]); v.lastHist = a; if (v.hist.length > 1200) v.hist.shift(); }
  }
}
function reset() { S = { t: 0, disp: 0, acc: 0, nextSpawn: 0, vols: [], events: [], rng: K.rng(P.seed * 7919 + 13) }; addVolcano(); hold = 0; }
function simulateTo(T) { reset(); const n = Math.round(K.clamp(T, 0, P.loop) / M.DT); for (let i = 0; i < n; i++) stepModel(M.DT); }

// ---------------- 2. Theory and real data ----------------
/* Distance from Kīlauea along the chain (km), K–Ar age (Myr), summit height (m, approx.).
   Clague and Dalrymple (1987) via the Hawaii Center for Volcanology / NOAA Ocean Explorer. */
const HAWAII = [
  { n: "Kīlauea", d: 0, a: 0 }, { n: "Mauna Kea", d: 54, a: 0.375, h: 4207 }, { n: "Kohala", d: 100, a: 0.43 },
  { n: "Haleakalā", d: 182, a: 0.75, h: 3055 }, { n: "West Maui", d: 221, a: 1.32, h: 1764 }, { n: "East Molokaʻi", d: 256, a: 1.76, h: 1512 },
  { n: "West Molokaʻi", d: 280, a: 1.9 }, { n: "Koʻolau (Oʻahu)", d: 339, a: 2.6, h: 960 }, { n: "Waiʻanae (Oʻahu)", d: 374, a: 3.7, h: 1227 },
  { n: "Kauaʻi", d: 519, a: 5.1, h: 1598 }, { n: "Niʻihau", d: 565, a: 4.89 }, { n: "Nihoa", d: 780, a: 7.2, h: 272 }, { n: "Necker", d: 1058, a: 10.3, h: 84 }
];
const MAP_LABELS = ["Kīlauea", "Haleakalā", "Koʻolau (Oʻahu)", "Kauaʻi", "Nihoa"];
// Least-squares line through the origin of distance against age: v = Σ(d·a) ÷ Σ(a²), in km/Myr
function fitThroughOrigin(pts) { let sda = 0, saa = 0, n = 0; for (const p of pts) { if (!(p.a > 0)) continue; sda += p.d * p.a; saa += p.a * p.a; n++; } return (n >= 2 && saa > 0) ? sda / saa : NaN; }
const HAWAII_FIT = fitThroughOrigin(HAWAII);
const modelPoints = () => S.vols.filter(v => volcAge(v) >= 0.3).map(v => ({ d: -volcX(v), a: volcAge(v) }));

// ---------------- 3. Headless runs for the Batch run ----------------
function headless(settings, T, seed) {
  const keepS = S, keepP = Object.assign({}, P), keepHold = hold;
  Object.assign(P, { v: 8.5, supply: 1, erosion: 1, subs: 1, loop: 30, irregular: true }, settings, { seed });
  try { reset(); const n = Math.round(T / M.DT); for (let i = 0; i < n; i++) stepModel(M.DT); return S; }
  finally { S = keepS; Object.assign(P, keepP); hold = keepHold; }
}
const seedOf = r => 1 + r.int(99999);
function datedFit(s, r) {   // the plate speed (cm/yr) a geologist would fit, with each K–Ar age measured to ±5%
  const pts = s.vols.filter(v => s.t - v.birthT >= 0.3).map(v => ({ d: s.disp - v.birthDisp, a: (s.t - v.birthT) * (1 + 0.05 * r.gauss()) }));
  return fitThroughOrigin(pts) / 10;
}

// ---------------- 4. Scenarios ----------------
const PRESETS = [
  { id: "hawaii", name: "Hawaiʻi today", story: "Pacific plate at about 8.5 cm/yr over a steady plume: the standard chain.", v: 8.5, supply: 1, erosion: 1, subs: 1 },
  { id: "slow", name: "Slow plate (2.5 cm/yr)", story: "Volcanoes stay over the plume longer, grow larger and crowd together.", v: 2.5, supply: 1, erosion: 1, subs: 1 },
  { id: "fast", name: "Fast plate (12 cm/yr)", story: "Less time over the plume, so volcanoes are smaller and further apart.", v: 12, supply: 1, erosion: 1, subs: 1 },
  { id: "weak", name: "Weak plume (0.5× supply)", story: "Smaller volcanoes that wear down and drop below sea level sooner.", v: 8.5, supply: 0.5, erosion: 1, subs: 1 },
  { id: "eros", name: "Erosion only", story: "Subsidence off: islands wear down towards sea level but never sink.", v: 8.5, supply: 1, erosion: 1, subs: 0 },
  { id: "subs", name: "Subsidence only", story: "Erosion off: islands keep their peaked shape as they sink.", v: 8.5, supply: 1, erosion: 0, subs: 1 }
];
let activePreset = "hawaii", selId = null, rate = 1, hold = 0;

// ---------------- The page ----------------
const ui = K.app({
  title: "Hotspot Island Chains", subject: "Geography",
  blurb: "A plate slides over a fixed mantle plume: volcanoes grow, drift away, wear down and sink",
  reset: () => restart(),
  levels: { std: "Introduction", adv: "Advanced (A level)", specs: {
    std: "A gentle introduction to hotspots and volcanic island chains such as Hawaiʻi: a fixed mantle plume, a moving plate, and why the islands get older, lower and more worn down along the chain.",
    adv: "Pearson Edexcel A level Geography (9GE0) Topic 1 Tectonic processes and hazards, 1.2: the theory of plate tectonics and its supporting evidence, including hotspots and mantle plumes (the Hawaiian chain as evidence of plate movement). Also AQA A level Geography (7037) 3.1.5 Hazards: plate tectonic theory and hotspots. Decompression melting, flexure and cooling subsidence, and Darwin's coral-reef sequence (island → atoll → guyot)." } },
  missions: [
    { title: "Measure the plate speed", q: "Pause at about 6 Myr. Pick one volcano and use its distance from the hotspot and its age to calculate the plate speed in km per Myr, then convert it to cm/yr. Compare your answer with the fitted value.", hint: "Speed = distance ÷ age. For example 510 km ÷ 6.0 Myr = 85 km/Myr. Since 1 cm/yr = 10 km per Myr, that is 8.5 cm/yr: the speed you set. The fitted value uses every volcano at once (a line through the origin on the age–distance graph).", setup() { usePreset("hawaii"); } },
    { title: "Slow and fast plates", q: "Run the slow plate, then the fast plate. Explain why the slow-plate volcanoes grow taller and sit closer together.", hint: "A slow plate keeps each volcano over the plume for longer (the time over the plume is about 2σ ÷ v), so more magma reaches it and it grows taller. A new volcano still starts every 1.6 Myr, but the plate has moved less in that time, so the volcanoes are closer together: spacing = v × 1.6 Myr.", setup() { usePreset("slow"); } },
    { title: "Erosion or subsidence?", q: "Run \"Erosion only\", then \"Subsidence only\". Which process makes guyots flat-topped, and which carries them below the sea?", hint: "Erosion (rain, rivers and waves) only works above sea level, and waves cut the top flat at sea level. Subsidence (the plate bending under the volcano and cooling as it moves away) carries the whole volcano down. A guyot needs both: planed flat by erosion, then sunk by subsidence.", setup() { usePreset("eros"); } },
    { title: "Follow a volcano's life", q: "Click the oldest volcano and follow its stage. When does it become an atoll, and what ends the reef's growth?", hint: "Once extinct and worn down to sea level, the volcano keeps sinking, but coral grows upwards fast enough to stay at the surface: an atoll. The reef dies when it is carried past the reef limit into water too cool for coral (the Darwin point), or if the volcano sinks faster than the reef can grow. Then it becomes a guyot.", setup() { usePreset("hawaii"); P.loop = 20; ctl.loop.set(20); restart(); } },
    { title: "From plume to lava", q: "Watch the mantle under the hotspot. Describe, in order, how rock in the plume becomes lava on the newest island.", hint: "Hot plume rock rises from deep in the mantle; as it rises the pressure falls, so a few per cent of it melts (decompression melting, at about 80–150 km). The magma is less dense, so it rises through cracks in the plate (the dashed conduits) and erupts, building a shield volcano above the plume.", setup() { usePreset("hawaii"); } },
    { lvl: "adv", title: "Compare with Hawaiʻi", q: "Look at the age–distance graph. How well do the real Hawaiian volcanoes fit a straight line? What plate speed do they give, and why are they not exactly on the line?", hint: "A line through the origin and the real volcanoes gives about 11 cm/yr (published estimates for the last few million years are about 8–10 cm/yr). They scatter because each Hawaiian island is built from several overlapping volcanoes, the dating has errors, the plume may not be perfectly still, and volcanoes do not form at perfectly regular times. Switch on the irregular plume to see the model scatter too.", setup() { usePreset("hawaii"); P.irregular = true; ctl.irregular.set(true); restart(); } },
    { lvl: "adv", title: "How fast do they sink?", q: "Select a volcano and read its subsidence rate. How does it change with age, and why?", hint: "Young volcanoes sink at about 2–3 mm/yr because the plate bends (flexes) under their huge weight; this slows over about a million years. After that, slower sinking continues as the plate cools and contracts and moves off the hotspot swell (∝ √age). Real Hawaiʻi Island is sinking at about 2–3 mm/yr today.", setup() { usePreset("hawaii"); } }
  ],
  batch: [
    { title: "Reading the plate speed from the chain", question: "If geologists date the volcanoes (each age measured to ±5%) and fit a line through the origin, how close do they get to the true plate speed?", how: "An irregular plume (new volcanoes every 1.1–2.1 Myr), run for 10 Myr; each run has new random spacing and new dating errors. Theory: the true speed.", xLabel: "true plate speed (cm/yr)", yLabel: "fitted plate speed (cm/yr)", xs: [3, 4.5, 6, 7.5, 9, 10.5, 12], reps: 5, theory: x => x, theoryLabel: "true speed", fit: true,
      run: (x, r) => datedFit(headless({ v: x }, 10, seedOf(r)), r), note: "The fitted speeds scatter round the true speed by a few per cent: each age has a dating error, but fitting many volcanoes at once averages much of it out. This is how the Pacific plate's speed over Hawaiʻi (about 9 cm/yr) was measured." },
    { title: "Spacing of the volcanoes", question: "How far apart are neighbouring volcanoes for different plate speeds?", how: "An irregular plume (new volcanoes every 1.1–2.1 Myr, 1.6 Myr on average), 20 Myr runs; the mean distance between neighbouring volcanoes. Theory: spacing = plate speed × 1.6 Myr.", xLabel: "plate speed (cm/yr)", yLabel: "mean spacing (km)", xs: [2, 4, 6, 8, 10, 12], reps: 5, yMin: 0, theory: x => x * 10 * M.SPAWN, theoryLabel: "v × 1.6 Myr",
      run: (x, r) => { const s = headless({ v: x }, 20, seedOf(r)), b = s.vols.map(v => v.birthDisp); let t = 0; for (let i = 1; i < b.length; i++) t += b[i] - b[i - 1]; return t / (b.length - 1); }, note: "Faster plates spread the volcanoes further apart. The scatter comes from the irregular timing of new volcanoes." },
    { title: "Faster plate, smaller volcanoes", question: "How tall do the volcanoes grow for different plate speeds?", how: "An irregular plume (each volcano's supply 0.85–1.15 ×), 15 Myr runs; the mean of the highest summit each volcano reached, in metres above sea level.", xLabel: "plate speed (cm/yr)", yLabel: "highest summit (m above sea level)", xs: [2, 3, 4, 6, 8, 10, 12], reps: 4,
      run: (x, r) => { const s = headless({ v: x }, 15, seedOf(r)), vs = s.vols.filter(v => s.t - v.birthT > 3); return K.mean(vs.map(v => Math.max(...v.hist.map(h => h[1])))); }, note: "A slow plate keeps each volcano over the plume for longer (about 2σ ÷ v), so it grows taller, up to the 13 km limit above the sea floor in this model. Fast plates carry volcanoes off before they grow much." },
    { title: "How long does an island last?", question: "How long does each island stay above sea level when the plate sinks at different rates?", how: "Standard Hawaiʻi settings with an irregular plume, 25 Myr runs; the mean time each volcano's summit spent above sea level, for those that sank again.", xLabel: "subsidence rate (× normal)", yLabel: "time above sea level (Myr)", xs: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2], reps: 4, yMin: 0,
      run: (x, r) => { const s = headless({ subs: x }, 25, seedOf(r)), d = s.vols.filter(v => v.aboveTo !== null).map(v => v.aboveTo - v.aboveFrom); return d.length ? K.mean(d) : null; }, note: "Faster sinking drowns the islands sooner. In the model, islands last a few million years; real Hawaiian islands last longer (Kauaʻi is still 1600 m high at 5 Myr), because the model is sped up to fit the life cycle into one run." },
    { lvl: "adv", title: "Erosion before drowning", question: "How much rock has been worn away from each island by the time it sinks below sea level, for different erosion rates?", how: "Standard Hawaiʻi settings with an irregular plume, 25 Myr runs; the mean thickness eroded (highest summit − rock summit) when each island sank.", xLabel: "erosion rate (× normal)", yLabel: "rock eroded (m)", xs: [0.25, 0.5, 1, 1.5, 2], reps: 4, yMin: 0,
      run: (x, r) => { const s = headless({ erosion: x }, 25, seedOf(r)), d = s.vols.filter(v => v.erodedAtSea !== null).map(v => v.erodedAtSea * 1000); return d.length ? K.mean(d) : null; }, note: "Above about half the normal rate, roughly 2 km is worn away whatever the rate: erosion only works above sea level, so faster erosion just gets the island down to sea level sooner. Only very slow erosion leaves more of the work to sinking. Either way the top ends up at sea level, where waves plane it flat: the flat top of a guyot." },
    { title: "Dating errors and the fitted speed", question: "With each age measured to ±5%, how much does the fitted plate speed vary from one chain to the next?", how: "Hawaiʻi settings (8.5 cm/yr) with an irregular plume, 10 Myr; 150 runs, each with new random spacing and dating errors.", reps: 150, bins: 20, yLabel: "fitted plate speed (cm/yr)", theory: 8.5, theoryLabel: "true speed",
      run: (x, r) => datedFit(headless({ v: 8.5 }, 10, seedOf(r)), r), note: "The fitted speeds form a narrow peak round 8.5 cm/yr. A real chain is only one run: its fitted speed could be a little off, which is why geologists combine several chains and methods." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Introduction", text: "A hotspot is a place where a plume of hot rock rises from deep in the mantle. The plume stays still while the plate moves over it." },
      { lvl: "std", tag: "Introduction", text: "Each volcano grows while it is over the plume, then the plate carries it away and it becomes extinct. So the islands get older the further they are from the hotspot: Hawaiʻi Island is active, Kauaʻi is about 5 million years old." },
      { lvl: "std", tag: "Introduction", text: "Once extinct, an island is worn down by erosion and sinks as the plate bends and cools: island → atoll (a coral reef at sea level) → guyot (a flat-topped seamount)." },
      { lvl: "adv", tag: "9GE0 1.2", text: "Hotspot chains are evidence for plate movement: plate speed = distance from the hotspot ÷ age. The Hawaiian chain gives about 9 cm/yr for the Pacific plate." },
      { lvl: "adv", tag: "9GE0 1.2", text: "Decompression melting: as the plume rises, the pressure falls faster than the temperature, so a few per cent of the rock melts (about 80–150 km down) and the basaltic magma rises." },
      { lvl: "adv", tag: "9GE0 1.2", text: "Subsidence has two parts: flexure (the plate bends under the volcano's weight, fast, over about a million years) and cooling (the plate contracts as it ages and moves off the hotspot swell, ∝ √age)." },
      { lvl: "adv", tag: "beyond", text: "The Hawaiian–Emperor bend (about 47 million years old) shows a change in the plate's direction, and possibly drift of the plume itself: palaeomagnetic data suggest the plume moved south while the Emperor chain formed." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how a chain of volcanic islands forms over a hotspot.", ans: "<ul><li>a mantle plume stays in one place, providing magma</li><li>the plate moves over it, carrying each volcano away</li><li>a new volcano forms above the plume, so the islands form a line, older with distance</li></ul>" },
      { lvl: "std", marks: 2, q: "Suggest why the older islands in a hotspot chain are lower than the younger ones.", ans: "<ul><li>they are no longer supplied with magma, so erosion wears them down</li><li>the plate sinks (subsides) under them as it bends and cools</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const v = S && S.vols.find(x => volcAge(x) > 3); const d = v ? Math.round(-volcX(v)) : 510, a = v ? volcAge(v).toFixed(1) : "6.0"; return `A volcano is ${d} km from the hotspot and ${a} million years old. Calculate the plate speed in cm per year.`; }, ans: () => { const v = S && S.vols.find(x => volcAge(x) > 3); const d = v ? Math.round(-volcX(v)) : 510, a = v ? +volcAge(v).toFixed(1) : 6.0; return `<ul><li>speed = ${d} km ÷ ${a} Myr = ${(d / a).toFixed(0)} km per million years</li><li>1 km per million years = 100 000 cm ÷ 1 000 000 yr = 0.1 cm/yr</li><li>= ${(d / a / 10).toFixed(1)} cm/yr</li></ul>`; } },
      { lvl: "adv", marks: 4, q: "Explain the sequence island → atoll → guyot.", ans: "<ul><li>an extinct island is eroded and subsides</li><li>a fringing coral reef grows upwards, keeping pace with sinking, so a ring of reef stays at sea level: an atoll</li><li>when the reef can no longer keep up, or the plate carries it into water too cool for coral, the reef dies</li><li>the wave-planed, flat-topped volcano sinks below the sea: a guyot</li></ul>" },
      { lvl: "adv", marks: 4, q: "Evaluate the claim that hotspot chains prove that plates move.", ans: "<ul><li>ages increase steadily with distance from the active volcano, as a moving plate over a fixed source predicts</li><li>the speeds agree with other evidence (palaeomagnetic stripes, GPS)</li><li>but plumes may drift (Emperor chain), so the plate speed relative to the mantle is uncertain</li><li>the origin and depth of plumes are still debated</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>The plume stays still in the deep mantle while the plate slides over it. Each volcano is built while it sits above the plume, then the plate carries it away, so ages increase with distance from the hotspot. One volcano = one island.</p>
<ul><li><b>Plate</b>: every volcano moves at speed v. A new volcano starts above the plume every 1.6 Myr (with the <i>irregular plume</i>: every 1.1–2.1 Myr, and each one's supply 0.85–1.15 × as strong, from a seeded random generator so the same seed gives the same chain).</li>
<li><b>Growth</b>: dH/dt = G·s·exp(−(x/σ)²)·(1 − H/Hmax), with G = 45 km/Myr, σ = 70 km and Hmax = 13 km. Growth stops once the volcano is carried off the plume.</li>
<li><b>Subsidence</b>: S(a) = k·[F(1 − e^(−a/τ)) + C√a], with F = 2 km and τ = 1 Myr (the plate bends under the volcano's weight) and C = 0.8 km/√Myr (the plate cools and moves off the hotspot swell).</li>
<li><b>Erosion</b>: dH/dt = −kE·e·z for the part above sea level (kE = 0.5 per Myr). Waves cut the top flat at sea level.</li>
<li><b>Coral reef</b>: grows up to 0.5 mm/yr to stay at sea level once the volcano is extinct. It dies if it falls more than 100 m behind or is carried past the reef limit (680 km, illustrative), where the water is too cool.</li>
<li><b>Method</b>: fixed steps of 0.01 Myr. Dragging the time slider re-runs the model from the start with the current settings.</li></ul>
<p><b>Calculated and assumed.</b> Positions, ages and the fitted speed follow directly from the plate speed. Growth, erosion, subsidence and reef rates are <b>illustrative</b> and sped up so the whole life cycle fits in one run: the model's islands wear down and sink faster than real Hawaiian ones (real islands take roughly 10–30 Myr to reach the atoll stage; Midway is about 28 Myr old). Real Hawaiian ages and distances (Clague and Dalrymple, 1987) are shown for comparison.</p>
<p><b>Advanced.</b> The plume is about 200–300 °C hotter than the mantle around it. As it rises, the pressure falls and a few per cent of the rock melts (decompression melting, at roughly 80–150 km). Slow plates give larger volcanoes because each one spends longer over the supply: about 2σ ÷ v.</p>
<h3>What it leaves out</h3>
<ul><li>Real mantle flow: the plume, particles and melting zone are drawn, not calculated.</li>
<li>Each Hawaiian island is really built from 2–5 overlapping volcanoes; real new volcanoes start slightly upstream of the plume (for example Kamaʻehuakanaloa, formerly Lōʻihi).</li>
<li>Plume fixity and depth are debated. Palaeomagnetic evidence suggests the plume drifted while the Emperor chain formed. The 47 Ma Hawaiian–Emperor bend is not modelled.</li>
<li>The hotspot swell, giant landslides, rejuvenated volcanism, single eruptions, sea-level change and climate.</li>
<li>The base of the plate is drawn flat. Heights above the scale break are exaggerated.</li></ul>
<p>This simulation was contributed by a colleague and rebuilt with the shared kit (Batch run, worksheets, Revise tab; the irregular plume and dating errors are new). The original single-file version is kept in <a href="original/hotspot-island-chain.html">original/hotspot-island-chain.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Scenarios");
K.note(g, "Each one restarts the run. Values are rounded or illustrative.");
const presetBtns = PRESETS.map(p => { const b = K.btn(g, `<b>${p.name}</b><br><small style="color:var(--muted)">${p.story}</small>`, () => usePreset(p.id)); b.style.cssText = "display:block;width:100%;text-align:left;margin-bottom:4px;white-space:normal"; return [p.id, b]; });
g = ui.group("Inputs <small style='color:var(--good);font-weight:400'>act at once</small>");
ctl.v = K.slider(g, { label: "Plate speed", min: 2, max: 12, step: 0.5, value: 8.5, fmt: v => fmt(v, 1) + " cm/yr (" + fmt(v * 10, 0) + " km/Myr)", tip: "Pacific plate at Hawaiʻi ≈ 8–10 cm/yr. 1 cm/yr = 10 km per Myr.", on: v => { P.v = v; custom(); } });
ctl.supply = K.slider(g, { label: "Magma supply (plume strength)", min: 0.5, max: 1.5, step: 0.05, value: 1, fmt: v => fmt(v, 2) + " ×", on: v => { P.supply = v; custom(); } });
ctl.erosion = K.slider(g, { label: "Erosion rate", min: 0, max: 2, step: 0.1, value: 1, fmt: v => fmt(v, 1) + " × (k = " + fmt(M.KE * v, 2) + " /Myr)", tip: "Rain, rivers and waves wearing down the land above sea level (illustrative).", on: v => { P.erosion = v; custom(); } });
ctl.subs = K.slider(g, { label: "Subsidence rate", min: 0, max: 2, step: 0.1, value: 1, fmt: v => fmt(v, 1) + " ×", tip: "Sinking from plate flexure and cooling. 1 × ≈ 2–3 mm/yr when young, slowing with age.", on: v => { P.subs = v; custom(); } });
ctl.ve = K.slider(g, { label: "Vertical exaggeration (display only)", min: 5, max: 20, step: 1, value: 10, fmt: v => "× " + v, on: v => P.ve = v });
g = ui.group("Time <small style='color:var(--warn);font-weight:400'>↻ restarts</small>");
ctl.loop = K.slider(g, { label: "Length of each run", min: 5, max: 20, step: 1, value: 10, fmt: v => v + " Myr (" + fmt(v / MYR_PER_S, 0) + " s at 1×)", on: v => { P.loop = v; restart(); } });
ctl.irregular = K.toggle(g, { label: "Irregular plume (new volcanoes at uneven times, uneven supply)", value: false, on: v => { P.irregular = v; restart(); } });
K.btn(K.row(g), "🎲 New random chain", () => { P.seed = 1 + Math.floor(Math.random() * 99999); if (!P.irregular) { P.irregular = true; ctl.irregular.set(true); } restart(); });
ctl.autoloop = K.toggle(g, { label: "Start again at the end", value: true });
ctl.time = K.slider(g, { label: "Model time (drag to scrub)", min: 0, max: 10, step: 0.01, value: 0, fmt: v => fmt(v, 2) + " Myr", on: v => { simulateTo(v); scrubbing = true; } });
const timeInput = ctl.time.el.querySelector("input"); let scrubbing = false;
timeInput.addEventListener("pointerup", () => scrubbing = false); timeInput.addEventListener("change", () => scrubbing = false);
ctl.rate = K.seg(g, { label: "Speed", value: 1, options: [[0.25, "¼×"], [0.5, "½×"], [1, "1×"], [2, "2×"], [4, "4×"]], on: v => rate = v });
ui.headerSpeed(ctl.rate, { label: "Speed" });
g = ui.group("Readings");
const read = K.readout(g, [["t", "model time"], ["d", "plate moved"], ["n", "volcanoes (above sea)"], ["age", "youngest / oldest"], ["fit", "fitted plate speed (self-check)"], ["sub", "sinking rate (selected)"]]);
g = ui.group("Selected volcano");
const selEl = K.note(g, ""); selEl.style.fontSize = "13px"; selEl.style.color = "var(--text)";
g = ui.group("What's happening");
const happenEl = K.$("ul", ""); happenEl.style.cssText = "margin:0 0 6px;padding-left:18px;font-size:13px"; g.append(happenEl);
g.append(K.$("div", "", "<b style='font-size:12px;color:var(--muted)'>Recent events</b>"));
const eventsEl = K.$("ul", ""); eventsEl.style.cssText = "margin:2px 0 0;padding-left:18px;font-size:12px;color:var(--muted)"; g.append(eventsEl);

function markPresets() { presetBtns.forEach(([id, b]) => b.classList.toggle("on", id === activePreset)); }
function custom() { if (activePreset) { activePreset = null; markPresets(); } }
function syncSliders() { for (const k of ["v", "supply", "erosion", "subs", "ve", "loop"]) ctl[k].set(P[k]); ctl.irregular.set(P.irregular); timeInput.max = P.loop; }
function usePreset(id) { const p = PRESETS.find(q => q.id === id); Object.assign(P, { v: p.v, supply: p.supply, erosion: p.erosion, subs: p.subs }); activePreset = id; syncSliders(); markPresets(); restart(); }
function restart() { timeInput.max = P.loop; reset(); ui.setPlaying(true); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => draw());
const chAD = K.chart(ui.dock, { title: "Age against distance", xLabel: "distance from hotspot (km)", yLabel: "age (Myr)" });
const chHA = K.chart(ui.dock, { title: "Summit height", xLabel: "volcano age (Myr)", yLabel: "summit height (m)" });
const VCOL = ["#88CCEE", "#44AA99", "#CC79A7", "#A58BFF", "#9BD770"], VSHAPE = ["circle", "square", "triangle", "diamond"];
const C_REAL = "#9aa0a6", C_PLUME = "rgba(240,130,40,0.85)", C_MAGMA = "#FF9F1C", C_MELT = "#FFD666", C_REEF = "#E3CF9A";
const vCol = id => VCOL[(id - 1) % VCOL.length], vShape = id => VSHAPE[(id - 1) % VSHAPE.length];
const RNG = K.rng(20261119), PARTICLES = [], DROPS = [];   // decoration only: plume particles and melt droplets
for (let i = 0; i < 90; i++) PARTICLES.push({ off: RNG() * 2 - 1, ph: RNG(), dir: RNG() < 0.75 ? -1 : 1, len: 120 + RNG() * 260, sp: 0.8 + RNG() * 0.4 });
for (let i = 0; i < 26; i++) { const ang = RNG() * Math.PI * 2, rr = Math.sqrt(RNG()); DROPS.push({ x: Math.cos(ang) * rr, y: Math.sin(ang) * rr }); }
const anim = { phase: 0 };
function drawMarker(ctx, shape, x, y, r, col, filled) {
  ctx.lineWidth = 1.5;
  if (shape === "cross") { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); return; }
  ctx.beginPath();
  if (shape === "circle") ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (shape === "square") ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else if (shape === "triangle") { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); }
  else { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r, y); ctx.closePath(); }
  if (filled) { ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "#0d1117"; ctx.stroke(); } else { ctx.strokeStyle = col; ctx.stroke(); }
}
function arrow(ctx, x1, y1, x2, y2, col, lw = 2) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1), s = 6 + lw * 1.5; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)); ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
}
function tag(ctx, txt, x, y, col, align, size) {
  ctx.font = (size || 12) + "px Segoe UI,system-ui,sans-serif"; ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
  const m = ctx.measureText(txt).width, bx = align === "right" ? x - m - 4 : align === "center" ? x - m / 2 - 4 : x - 4;
  ctx.fillStyle = "rgba(10,14,20,0.62)"; ctx.fillRect(bx, y - 9, m + 8, 18); ctx.fillStyle = col || "#e6edf3"; ctx.fillText(txt, x, y);
}
// Cross-section geometry: an exaggerated upper zone (ocean and islands) above a true-scale (or squeezed) plate and mantle
function xsGeom(w, h) {
  const sx = w / VIEW_W, top = 22, bottom = h - 4, zT = 5.5, zB = -9;
  let syU = sx * K.clamp(P.ve, 5, 20); const maxU = 0.5 * (bottom - top); if ((zT - zB) * syU > maxU) syU = maxU / (zT - zB);
  const yBreak = top + (zT - zB) * syU, avail = Math.max(40, bottom - yBreak); let syL = sx; if ((250 - 9) * syL > avail) syL = avail / (250 - 9);
  const dBot = 9 + avail / syL;
  return { sx, syU, syL, yBreak, top, bottom, dBot, zT, zB, veEff: syU / sx, lowerTrue: syL >= sx - 1e-9, X: x => (x - X_MIN) * sx, Y: z => z >= zB ? top + (zT - z) * syU : yBreak + (-z - 9) * syL };
}
function drawXS(ctx, w, h) {
  const gm = xsGeom(w, h), X = gm.X, Y = gm.Y, vols = S.vols, xs = vols.map(volcX), y0 = Y(0), yB = gm.yBreak, yL = Y(-100), yBot = gm.bottom;
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, w, y0);
  let gr = ctx.createLinearGradient(0, y0, 0, yB); gr.addColorStop(0, "#1d5a86"); gr.addColorStop(1, "#0c2742"); ctx.fillStyle = gr; ctx.fillRect(0, y0, w, yB - y0);
  ctx.fillStyle = "#45454d"; ctx.fillRect(0, yB, w, yL - yB);
  gr = ctx.createLinearGradient(0, yL, 0, h); gr.addColorStop(0, "#6a2f1d"); gr.addColorStop(1, "#3b1a12"); ctx.fillStyle = gr; ctx.fillRect(0, yL, w, h - yL);
  // the plume (fixed), clipped to the mantle, with rising particles
  ctx.save(); ctx.beginPath(); ctx.rect(0, yL, w, h - yL); ctx.clip();
  ctx.beginPath(); ctx.moveTo(X(-50), h + 5); ctx.lineTo(X(-50), Y(-185)); ctx.bezierCurveTo(X(-110), Y(-160), X(-300), Y(-140), X(-430), Y(-102)); ctx.lineTo(X(170), Y(-102)); ctx.bezierCurveTo(X(130), Y(-135), X(70), Y(-165), X(50), Y(-185)); ctx.lineTo(X(50), h + 5); ctx.closePath();
  gr = ctx.createLinearGradient(0, yL, 0, h); gr.addColorStop(0, C_PLUME); gr.addColorStop(1, "rgba(210,70,20,0.7)"); ctx.fillStyle = gr; ctx.fill();
  ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,190,120,0.8)"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,228,180,0.9)";
  for (const p of PARTICLES) { const ph = (p.ph + anim.phase * 0.08 * p.sp) % 1; let x, d; if (ph < 0.75) { x = p.off * 42; d = gm.dBot - (gm.dBot - 140) * (ph / 0.75); } else { const u = (ph - 0.75) / 0.25; x = p.off * 42 + p.dir * u * p.len * (p.dir < 0 ? 1 : 0.45); d = 140 - u * 32; } ctx.fillRect(X(x) - 1.2, Y(-d) - 1.2, 2.4, 2.4); }
  ctx.restore();
  // melting zone
  const mx = X(-20), my = Y(-125), mrx = 85 * gm.sx, mry = 22 * gm.syL;
  ctx.beginPath(); ctx.ellipse(mx, my, mrx, mry, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,214,102,0.32)"; ctx.fill(); ctx.setLineDash([2, 3]); ctx.strokeStyle = C_MELT; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = C_MELT; for (const d of DROPS) { ctx.beginPath(); ctx.arc(mx + d.x * mrx * 0.85, my + d.y * mry * 0.8, 1.6, 0, Math.PI * 2); ctx.fill(); }
  // markers moving with the plate
  ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.font = "12px Segoe UI,sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const first = Math.ceil((X_MIN + S.disp) / 100) * 100 - S.disp;
  for (let xm = first; xm <= X_MIN + VIEW_W; xm += 100) { const px = X(xm); ctx.beginPath(); ctx.moveTo(px, yB + 2); ctx.lineTo(px, yL - 2); ctx.stroke(); ctx.fillText("◂", px + 3, yB + (yL - yB) * 0.82); }
  // sea floor with moats, and the volcanoes
  const terr = [];
  for (let px = 0; px <= w + 2; px += 2) { const xk = X_MIN + px / gm.sx; let z = floorZ(xk, xs); for (let i = 0; i < vols.length; i++) { const zz = vSurface(vols[i], xk - xs[i]); if (zz > z) z = zz; } terr.push([px, Y(Math.max(z, gm.zB))]); }
  ctx.beginPath(); ctx.moveTo(0, yB); for (const p of terr) ctx.lineTo(p[0], p[1]); ctx.lineTo(w, yB); ctx.closePath(); ctx.fillStyle = "#3e3833"; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, y0); ctx.clip(); ctx.beginPath(); ctx.moveTo(0, yB); for (const p of terr) ctx.lineTo(p[0], p[1]); ctx.lineTo(w, yB); ctx.closePath(); ctx.fillStyle = "#5d6a3c"; ctx.fill(); ctx.restore();
  // reefs
  for (let i = 0; i < vols.length; i++) {
    const v = vols[i]; if (v.reef < 0.005) continue;
    const xi = X(xs[i]), half = Math.max(6, flatHalf(v)) * gm.sx, yb = Y(zVolc(v)), yt = Y(zTop(v)), yl = Y(zTop(v) - Math.min(0.05, v.reef * 0.4));
    ctx.beginPath(); ctx.moveTo(xi - half - 3, yb); ctx.lineTo(xi - half, yt); ctx.lineTo(xi - half + 4, yt); ctx.lineTo(xi - half + 6, yl); ctx.lineTo(xi + half - 6, yl); ctx.lineTo(xi + half - 4, yt); ctx.lineTo(xi + half, yt); ctx.lineTo(xi + half + 3, yb); ctx.closePath();
    ctx.fillStyle = v.reefDead ? "#8f8670" : C_REEF; ctx.fill();
  }
  // magma conduits (moving dashes) to the volcanoes being fed
  let anyActive = false;
  for (let i = 0; i < vols.length; i++) {
    const v = vols[i]; if (v.gr < 0.05) continue; if (v.gr >= M.GROW_ACTIVE) anyActive = true;
    ctx.strokeStyle = "rgba(255,159,28," + K.clamp(v.gr / 3, 0.15, 1) + ")"; ctx.lineWidth = 1 + 3 * K.clamp(v.gr / 12, 0, 1); ctx.setLineDash([7, 5]); ctx.lineDashOffset = -anim.phase * 30;
    ctx.beginPath(); ctx.moveTo(X(-20), Y(-105)); ctx.quadraticCurveTo(X(xs[i] * 0.5 - 10), Y(-55), X(xs[i]), yB); ctx.lineTo(X(xs[i]), Y(Math.max(zTop(v) - 0.2, -M.D0 - v.sub))); ctx.stroke();
    if (v.gr >= M.GROW_ACTIVE && zTop(v) > 0) { const gx = X(xs[i]), gy = Y(zTop(v)), rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 14); rg.addColorStop(0, "rgba(255,170,60,0.9)"); rg.addColorStop(1, "rgba(255,120,30,0)"); ctx.setLineDash([]); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, 14, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  // volcano outlines and labels
  for (let i = 0; i < vols.length; i++) {
    const v = vols[i]; if (v.Hpeak < 0.05) continue; const wv = vWidth(v), xi = xs[i]; if (X(xi + wv) < 0 || X(xi - wv) > w) continue;
    const sel = v.id === selId; ctx.strokeStyle = vCol(v.id); ctx.lineWidth = sel ? 3 : 1.3; ctx.globalAlpha = sel ? 1 : 0.85;
    ctx.beginPath(); let pen = false; for (let r = -wv; r <= wv; r += 2 / gm.sx) { const z = vSurface(v, r); if (!isFinite(z)) continue; const px = X(xi + r), py = Y(Math.max(z, gm.zB)); if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py); } ctx.stroke(); ctx.globalAlpha = 1;
    const zs = Math.max(zTop(v), -M.D0); let ly = Y(zs) - 12 - (v.id % 2) * 15; if (ly < 10) ly = 10; const lx = X(xi);
    if (lx > -20 && lx < w + 20) {
      const txt = "V" + v.id + " · " + fmt(volcAge(v), 1) + " Myr"; ctx.font = (sel ? "bold " : "") + "11.5px Segoe UI,sans-serif"; const tw = ctx.measureText(txt).width;
      ctx.fillStyle = "rgba(10,14,20,0.7)"; ctx.fillRect(lx - tw / 2 - 12, ly - 8, tw + 18, 16); drawMarker(ctx, vShape(v.id), lx - tw / 2 - 5, ly, 3.5, vCol(v.id), true);
      ctx.fillStyle = sel ? "#ffffff" : vCol(v.id); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, lx - tw / 2 + 2, ly);
      if (sel) { ctx.strokeStyle = "#ffffff"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, ly + 8); ctx.lineTo(lx, Y(zs) - 2); ctx.stroke(); ctx.setLineDash([]); }
    }
  }
  // sea level, reef limit, scale break, axes, labels
  ctx.strokeStyle = "rgba(160,210,255,0.75)"; ctx.setLineDash([6, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke(); ctx.setLineDash([]);
  tag(ctx, "Sea level", w - 8, y0 - 10, "#a0d2ff", "right", 11); tag(ctx, "Ocean (~5 km deep)", 52, (y0 + Y(-M.D0)) / 2, "#a0d2ff", "left", 11);
  const xd = X(M.X_DARWIN);
  if (xd > 0 && xd < w) { ctx.strokeStyle = C_REEF; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(xd, Y(0.8)); ctx.lineTo(xd, Y(-1.5)); ctx.stroke(); ctx.setLineDash([]); tag(ctx, "Reef limit (illustrative): too cool for coral beyond here ←", xd + 6, Y(1.6), C_REEF, "left", 10.5); }
  ctx.strokeStyle = "#e6edf3"; ctx.lineWidth = 1.2; ctx.beginPath(); for (let px = 0; px <= w; px += 8) { const yy = yB + ((px / 8) % 2 ? 3 : -3); if (px === 0) ctx.moveTo(px, yy); else ctx.lineTo(px, yy); } ctx.stroke();
  tag(ctx, "▲ heights ×" + fmt(gm.veEff, 0) + " vertical exaggeration   ▼ depths " + (gm.lowerTrue ? "true scale" : "squeezed to fit"), w - 8, yB + 12, "#e6edf3", "right", 10.5);
  ctx.font = "10px Segoe UI,sans-serif"; ctx.fillStyle = "#c9d1d9"; ctx.strokeStyle = "#c9d1d9"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  for (const z of [4, 2, 0, -2, -4, -6, -8]) { const yy = Y(z); if (yy < gm.top || yy > yB - 4) continue; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(5, yy); ctx.stroke(); ctx.fillText((z > 0 ? "+" : z < 0 ? "−" : "") + Math.abs(z) + " km", 7, yy); }
  for (let d = 50; d <= gm.dBot - 5; d += 50) { const yy = Y(-d); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(5, yy); ctx.stroke(); ctx.fillText(d + " km", 7, yy); }
  const xh = X(0); ctx.strokeStyle = "rgba(255,140,60,0.65)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xh, 18); ctx.lineTo(xh, yBot); ctx.stroke(); ctx.setLineDash([]);
  tag(ctx, "▼ Hotspot (fixed)", xh, 10, "#ffb070", "center", 11);
  const adv = ui.level === "adv";
  tag(ctx, "Lithosphere = the moving plate (~100 km thick)", 52, yB + 16, "#e6edf3", "left", 11.5);
  const ay = yB + (yL - yB) * 0.55; tag(ctx, "Plate moves NW at " + fmt(P.v, 1) + " cm/yr (" + fmt(P.v * 10, 0) + " km per Myr)", 52, ay - 2, "#e6edf3", "left", 11); arrow(ctx, X(-540), ay + 16, X(-760), ay + 16, "#e6edf3", 3);
  tag(ctx, "Asthenosphere: hot, weak mantle that flows slowly", 52, Y(-118), "#f2c9b0", "left", 11);
  const tailTop = Math.min(gm.dBot - 10, 290); if (tailTop > 200) arrow(ctx, X(0), Y(-tailTop), X(0), Y(-195), "#fff2d6", 3);
  const yp = Math.min(Y(-235), yBot - (adv ? 32 : 12));
  tag(ctx, "Mantle plume: hot rock rising (fixed position)", X(-60), yp, "#ffd2a8", "right", 11);
  if (adv) tag(ctx, "≈ 200–300 °C hotter than the surrounding mantle", X(-60), yp + 20, "#ffd2a8", "right", 10.5);
  arrow(ctx, X(-140), Y(-150), X(-300), Y(-128), "rgba(255,230,190,0.85)", 2); tag(ctx, "Plume head spreads under the plate", X(-310), Y(-150), "#ffd2a8", "right", 10.5);
  tag(ctx, "Partial melting → magma", X(-110), Y(-122), C_MELT, "right", 11);
  if (adv) tag(ctx, "pressure falls as rock rises → decompression melting (~80–150 km)", X(-110), Y(-140), C_MELT, "right", 10.5);
  if (anyActive) tag(ctx, "Magma rises", X(12), Y(-55), C_MAGMA, "left", 11);
  // key and scale bar
  const ky = yBot - 82; ctx.fillStyle = "rgba(10,14,20,0.7)"; ctx.fillRect(48, ky - 6, 200, 82);
  const keyItems = [["fill", C_PLUME, "Mantle plume (dashed edge)"], ["dots", C_MELT, "Partial-melt zone (dotted)"], ["dash", C_MAGMA, "Magma conduit (dashed)"], ["fill", C_REEF, "Coral reef (grey = dead)"], ["fill", "#45454d", "Lithosphere; ◂ marks move with plate"]];
  ctx.font = "10.5px Segoe UI,sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  keyItems.forEach((k, i) => { const yy = ky + 4 + i * 15; if (k[0] === "fill") { ctx.fillStyle = k[1]; ctx.fillRect(54, yy - 5, 18, 10); } else if (k[0] === "dots") { ctx.fillStyle = k[1]; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(56 + j * 5, yy, 1.6, 0, Math.PI * 2); ctx.fill(); } } else { ctx.strokeStyle = k[1]; ctx.lineWidth = 2.5; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(54, yy); ctx.lineTo(72, yy); ctx.stroke(); ctx.setLineDash([]); } ctx.fillStyle = "#e6edf3"; ctx.fillText(k[2], 78, yy); });
  const sbw = 200 * gm.sx, sbx = 270, sby = yBot - 12; ctx.strokeStyle = "#e6edf3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sbx, sby - 4); ctx.lineTo(sbx, sby); ctx.lineTo(sbx + sbw, sby); ctx.lineTo(sbx + sbw, sby - 4); ctx.stroke();
  tag(ctx, "200 km (horizontal)", sbx + sbw / 2, sby - 12, "#e6edf3", "center", 10.5);
}
function drawMap(ctx, w, h) {
  const sx = w / VIEW_W, X = x => (x - X_MIN) * sx, yc = h * 0.5;
  ctx.fillStyle = "#0f2a44"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.setLineDash([3, 6]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yc); ctx.lineTo(w, yc); ctx.stroke(); ctx.setLineDash([]);
  tag(ctx, `t = ${fmt(S.t, 2)} / ${P.loop} Myr${hold > 0 ? " (starting again)" : ""}`, 8, 12, "#ffffff", "left", 13);
  tag(ctx, "Map view (from above), same horizontal scale as the cross-section", 160, 12, "#c9d1d9", "left", 11);
  tag(ctx, "← NW (older)", 8, h - 11, "#c9d1d9", "left", 10.5); tag(ctx, "SE (younger) →", w - 8, 11, "#c9d1d9", "right", 10.5);
  let row = 0;
  for (const r of HAWAII) { if (MAP_LABELS.indexOf(r.n) < 0) continue; const px = X(-r.d); if (px < 0 || px > w) continue; drawMarker(ctx, "cross", px, yc + 16, 3.5, C_REAL, false); ctx.font = "10px Segoe UI,sans-serif"; ctx.fillStyle = C_REAL; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(r.n, px, yc + 22 + (row % 2) * 11); row++; }
  ctx.font = "10px Segoe UI,sans-serif"; ctx.fillStyle = C_REAL; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("× real Hawaiian volcano (approx. distance from Kīlauea). Necker (1058 km) is off-screen ←", 120, h - 4);
  const hx = X(0), rg = ctx.createRadialGradient(hx, yc, 0, hx, yc, M.SIGMA * sx); rg.addColorStop(0, "rgba(255,140,60,0.55)"); rg.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, yc, M.SIGMA * sx, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffb070"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, yc, 6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx - 9, yc); ctx.lineTo(hx + 9, yc); ctx.moveTo(hx, yc - 9); ctx.lineTo(hx, yc + 9); ctx.stroke();
  tag(ctx, "Hotspot (fixed)", hx + 10, yc - 26, "#ffb070", "left", 10.5);
  for (const v of S.vols) {
    if (v.Hpeak < 0.05) continue; const px = X(volcX(v)); if (px < -40 || px > w + 40) continue;
    const zv = zVolc(v), z = zTop(v), col = vCol(v.id), sel = v.id === selId; let rad;
    if (zv > 0) { rad = Math.max(2.5, seaHalf(v) * sx); ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(px, yc, rad, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    else if (v.reef > 0.02 && z > -0.02) { rad = Math.max(4, flatHalf(v) * sx); ctx.strokeStyle = C_REEF; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, yc, rad, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, yc, rad + 3, 0, Math.PI * 2); ctx.stroke(); }
    else { rad = Math.max(4, 0.3 * vWidth(v) * sx); ctx.strokeStyle = col; ctx.globalAlpha = 0.7; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, yc, rad, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    if (sel) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(px, yc, rad + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    const ly = Math.max(9, yc - rad - 10 - (v.id % 2) * 13), txt = "V" + v.id + " " + fmt(volcAge(v), 1) + " Myr";
    ctx.font = (sel ? "bold " : "") + "11px Segoe UI,sans-serif"; const tw = ctx.measureText(txt).width;
    ctx.fillStyle = "rgba(10,14,20,0.65)"; ctx.fillRect(px - tw / 2 - 12, ly - 7, tw + 18, 14); drawMarker(ctx, vShape(v.id), px - tw / 2 - 5, ly, 3.2, col, true);
    ctx.fillStyle = sel ? "#ffffff" : col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, px - tw / 2 + 2, ly);
  }
  const ax = w * 0.55, ay = h - 14; arrow(ctx, ax + 70, ay, ax - 30, ay, "#e6edf3", 2.5); tag(ctx, "Plate " + fmt(P.v, 1) + " cm/yr", ax + 78, ay, "#e6edf3", "left", 10.5);
  const sbw = 200 * sx, sbx = w - 14 - sbw, sby = h - 8; ctx.strokeStyle = "#e6edf3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sbx, sby - 4); ctx.lineTo(sbx, sby); ctx.lineTo(sbx + sbw, sby); ctx.lineTo(sbx + sbw, sby - 4); ctx.stroke();
  ctx.font = "10px Segoe UI,sans-serif"; ctx.fillStyle = "#e6edf3"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("200 km", sbx + sbw / 2, sby - 5);
}
const mapH = h => Math.max(105, Math.round(h * 0.22));
function draw() {
  if (!S) return; const ctx = cv.ctx, w = cv.w, h = cv.h, mh = mapH(h);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, mh); ctx.clip(); drawMap(ctx, w, mh); ctx.restore();
  ctx.fillStyle = "#2b3440"; ctx.fillRect(0, mh, w, 1);
  ctx.save(); ctx.translate(0, mh + 1); ctx.beginPath(); ctx.rect(0, 0, w, h - mh - 1); ctx.clip(); drawXS(ctx, w, h - mh - 1); ctx.restore();
}
K.pointer(cv.el, {
  down(p) {
    const sx = cv.w / VIEW_W, xk = X_MIN + p.x / sx; let best = null, bd = Infinity;
    for (const v of S.vols) { if (v.Hpeak < 0.05) continue; const d = Math.abs(volcX(v) - xk), tol = Math.max(25, 0.5 * vWidth(v)); if (d <= tol && d < bd) { bd = d; best = v; } }
    selId = best ? best.id : null; updateReadouts();
  }
});

// ---------------- Charts and readouts ----------------
function drawCharts() {
  const pts = S.vols.map(v => [-volcX(v), volcAge(v), v.id]);
  let dMax = 1100, aMax = 11; for (const p of pts) { dMax = Math.max(dMax, p[0]); aMax = Math.max(aMax, p[1]); }
  const sel = pts.filter(p => p[2] === selId);
  chAD.draw([
    { pts: [[0, 0], [dMax, dMax / (P.v * 10)]], color: "#ffffff", dash: [7, 5], label: "theory (" + fmt(P.v, 1) + " cm/yr)" },
    { pts: [[0, 0], [dMax, dMax / HAWAII_FIT]], color: C_REAL, dash: [2, 4], label: "Hawaiʻi fit (" + fmt(HAWAII_FIT / 10, 1) + ")" },
    { pts: HAWAII.map(r => [r.d, r.a]), type: "dots", r: 3.5, color: C_REAL, label: "Hawaiʻi" },
    { pts: pts.map(p => [p[0], p[1]]), type: "dots", r: 4.5, color: VCOL[0], label: "model" },
    { pts: sel.map(p => [p[0], p[1]]), type: "dots", r: 7, color: "#ffffff" }
  ], { xMin: 0, xMax: Math.ceil(dMax / 100) * 100, yMin: 0, yMax: Math.ceil(aMax + 0.5) });
  const ser = S.vols.map(v => ({ pts: v.hist, color: vCol(v.id), width: v.id === selId ? 3 : 1.5 }));
  ser.push({ pts: HAWAII.filter(r => r.h && r.a <= P.loop).map(r => [r.a, r.h]), type: "dots", r: 3.5, color: C_REAL, label: "Hawaiʻi" });
  ser[0].label = "model (one line each)";
  chHA.draw(ser, { xMin: 0, xMax: P.loop, yMin: -3000, yMax: 5500, hlines: [{ y: 0, color: "#a0d2ff", label: "sea level" }] });
}
const elevText = z => { if (!isFinite(z)) return "–"; const m = Math.round(z * 100) * 10; return m >= 0 ? m + " m above sea level" : (-m) + " m below sea level"; };
function updateReadouts() {
  const vols = S.vols, adv = ui.level === "adv", above = vols.filter(v => zTop(v) > 0 && v.Hpeak > 0.05).length, ages = vols.map(volcAge);
  read.set("t", fmt(S.t, 2) + " Myr"); read.set("d", fmt(S.disp, 0) + " km"); read.set("n", `${vols.length} (${above})`);
  read.set("age", ages.length ? fmt(Math.min(...ages), 1) + " / " + fmt(Math.max(...ages), 1) + " Myr" : "–");
  const vf = fitThroughOrigin(modelPoints()) / 10, diff = (vf - P.v) / P.v * 100;
  read.set("fit", isFinite(vf) ? `${fmt(vf, 2)} cm/yr <small>(${diff >= 0 ? "+" : ""}${fmt(diff, 1)}%)</small>` : "needs 2 volcanoes");
  const selV = vols.find(v => v.id === selId), refV = selV || vols[vols.length - 1];
  read.set("sub", refV ? "V" + refV.id + ": " + fmt(subsRate(volcAge(refV)), 2) + " mm/yr" : "–");
  selEl.innerHTML = !selV ? "Click a volcano in the map or the cross-section to follow it in every view." :
    `<b style="color:${vCol(selV.id)}">V${selV.id}</b>: ${STAGE_NAME[selV.stage] || "–"}<br>Age ${fmt(volcAge(selV), 2)} Myr · ${fmt(-volcX(selV), 0)} km from the hotspot<br>Summit: ${elevText(zTop(selV))}<br>Total sinking ${fmt(selV.sub * 1000, 0)} m · eroded ${fmt((selV.Hpeak - selV.H) * 1000, 0)} m${selV.reef > 0.005 ? " · reef cap " + fmt(selV.reef * 1000, 0) + " m" + (selV.reefDead ? " (dead)" : "") : ""}<br>Magma supply: ${selV.gr >= M.GROW_ACTIVE ? "on (over the plume)" : "cut off"}`;
  const L = [`The plate has moved ${fmt(S.disp, 0)} km north-west in ${fmt(S.t, 1)} Myr. The plume underneath has stayed in the same place.`];
  const act = vols.filter(v => v.gr >= M.GROW_ACTIVE);
  if (act.length) { const v = act[act.length - 1]; L.push(`V${v.id} is above the plume. Rising plume rock partly melts, and magma travels up through the plate to build the volcano. Its summit is ${elevText(zTop(v))}.`); }
  else L.push(`No volcano is directly over the plume at the moment. A new one starts every ${P.irregular ? "1.1–2.1" : M.SPAWN} Myr.`);
  const off = vols.filter(v => v.gr < M.GROW_ACTIVE && v.Hpeak > 0.3);
  if (off.length) { const c = {}; off.forEach(v => c[v.stage] = (c[v.stage] || 0) + 1); const parts = []; const pl = (n, s) => n + " " + s + (n > 1 ? "s" : "");
    if (c.island) parts.push(pl(c.island, "eroding island")); if (c.platform) parts.push(c.platform + " worn to sea level"); if (c.atoll) parts.push(pl(c.atoll, "atoll")); if (c.guyot) parts.push(pl(c.guyot, "guyot")); if (c.seamount) parts.push(pl(c.seamount, "seamount"));
    L.push("Carried off the hotspot: " + parts.join(", ") + ". The further a volcano is from the hotspot, the older, lower and more worn down it is."); }
  if (vols.some(v => v.stage === "atoll")) L.push("Atoll: the old volcano has sunk below sea level, but the coral reef grows upwards fast enough to stay at the surface.");
  const gy = vols.filter(v => v.stage === "guyot"); if (gy.length) L.push(`Guyot (V${gy[0].id}): its flat top was cut by waves at sea level, and sinking has since carried it ${fmt(-zTop(gy[0]) * 1000, 0)} m down.`);
  if (adv) {
    const ps = vols.filter(v => volcAge(v) >= 1); if (ps.length) { const v = ps[ps.length - 1], d = -volcX(v), a = volcAge(v); L.push(`Check: V${v.id} is ${fmt(d, 0)} km from the hotspot and ${fmt(a, 2)} Myr old, so ${fmt(d / a, 0)} km/Myr = ${fmt(d / a / 10, 2)} cm/yr.`); }
    if (refV) L.push(`V${refV.id} is sinking at about ${fmt(subsRate(volcAge(refV)), 2)} mm/yr: fast when young (flexure under its own weight), slower later (plate cooling).`);
    if (isFinite(diff) && Math.abs(diff) > 2) L.push("The fitted speed differs from the slider because the plate speed was changed during this run. The chain records the average speed since each volcano formed.");
  }
  happenEl.innerHTML = L.map(s => "<li>" + s + "</li>").join("");
  eventsEl.innerHTML = S.events.length ? S.events.map(e => `<li>t = ${fmt(e.t, 2)} Myr: ${e.txt}</li>`).join("") : "<li>–</li>";
}

// ---------------- The loop ----------------
let lastRead = 0;
ui.run(dt => {
  if (S.t >= P.loop - 1e-9) { if (ctl.autoloop.value) { hold += dt; if (hold >= 1.5) reset(); } else ui.setPlaying(false); return; }
  anim.phase += dt * rate; S.acc += dt * rate * MYR_PER_S; const t0 = performance.now();
  while (S.acc >= M.DT && S.t < P.loop - 1e-9) { stepModel(M.DT); S.acc -= M.DT; if (performance.now() - t0 > 25) { S.acc = 0; break; } }   // drop time rather than lag
}, () => {
  if (!scrubbing) ctl.time.set(S.t);
  draw(); const now = performance.now(); if (now - lastRead > 150) { lastRead = now; drawCharts(); updateReadouts(); }
});
ui.onLevel = () => updateReadouts();
reset(); syncSliders(); markPresets();
ui.tip("Click a volcano to follow it · drag the time slider to scrub through the run", 7000);
