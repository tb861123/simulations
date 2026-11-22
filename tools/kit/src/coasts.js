/* =====================================================================
   COASTS
   WAVES are made by wind blowing over the sea: the stronger the wind and
   the longer the FETCH (distance of open water), the bigger the waves.
   Big, steep, frequent waves are DESTRUCTIVE (strong backwash, erode);
   long, low waves are CONSTRUCTIVE (strong swash, build beaches).
   EROSION (hydraulic action, abrasion, attrition, solution) attacks soft
   rock faster than hard: on a DISCORDANT coast bays form in the soft rock
   and headlands stand out, then crack → cave → arch → stack → stump.
   LONGSHORE DRIFT: waves arriving at an angle push material up the beach
   (swash) at that angle, and it rolls straight back down (backwash), so
   it zig-zags along the coast, building SPITS where the coast turns.
   Holderness (East Yorkshire) is Europe's fastest-eroding coast (about
   1.8 m a year): soft boulder clay and a beach too thin to protect it.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const g = 9.81;
// JONSWAP fetch-limited waves: significant height (m) and peak period (s) for wind U (m/s) and fetch F (km)
const Hs = (U, F) => Math.min(0.0016 * U * U / g * Math.sqrt(g * F * 1000 / (U * U)), 0.243 * U * U / g);
const Tp = (U, F) => Math.min(0.286 * U / g * Math.pow(g * F * 1000 / (U * U), 1 / 3), 8.13 * U / g);
const wavelength = T => g * T * T / (2 * Math.PI);
const power = (H, T) => 1025 * g * g * H * H * T / (64 * Math.PI);   // W per metre of wave crest
// longshore drift: one pebble's sideways step per wave, and the CERC transport rate
const driftStep = (S, th) => 0.5 * S * Math.sin(2 * th * Math.PI / 180);
const cerc = (Hb, th) => 0.0909 * Math.pow(Hb, 2.5) * Math.sin(2 * th * Math.PI / 180);   // m³ per second
const spitRate = (Hb, th, depth) => cerc(Hb, th) * 3.156e7 * 0.021 / ((depth + 4) * 150);   // m per year (2.1% of the drift reaches the tip)
// Bruun rule: retreat R = S L/(B + h), closure depth from the biggest wave of the year, Dean profile h = 0.1 x^(2/3)
function bruun(S, Hmax = 5, B = 5) { const h = 1.57 * Hmax, L = Math.pow(h / 0.1, 1.5); return S * L / (B + h); }
// rocks: erodibility (m a year under moderate waves)
const ROCK = { granite: { name: "granite", e: 0.002, col: "#8a7f88" }, limestone: { name: "Portland limestone", e: 0.03, col: "#d8d0b8" }, chalk: { name: "chalk", e: 0.25, col: "#f0f0ea" }, clay: { name: "Wealden clays", e: 1.0, col: "#8a6a4a" }, till: { name: "boulder clay (till)", e: 1.8, col: "#7a5a40" } };

// ---------------- Holderness: a one-line sediment model, 120 stretches of 500 m ----------------
const NC = 120;
function newHold(o) { return { x: new Array(NC).fill(0), V: new Array(NC).fill(60), year: 0, o, hist: [] }; }
function holdYear(S, r) {
  const o = S.o, storm = Math.exp(0.25 * r.gauss() - 0.03), out = new Array(NC).fill(0);
  for (let i = 0; i < NC; i++) {
    const km = i * 0.5, groyne = o.groynes > 0 && km >= o.gStart && km < o.gStart + o.groynes, wall = o.wall && km >= o.gStart && km < o.gStart + Math.max(1, o.groynes);
    out[i] = 28 * Math.min(1, S.V[i] / 90) * (groyne ? 0.3 : 1);          // drift south out of this stretch (m³ per m of coast)
    let ret = 4 * storm * Math.exp(-S.V[i] / 40 / 1.0) * (wall ? 0 : 1) * (o.armour && groyne ? 0.15 : 1);   // cliff retreat (m)
    S.x[i] += ret; S.V[i] += 0.08 * ret * 20;   /* only the sand and gravel (8% of the till from a 20 m cliff) stays on the beach */
    if (wall) S.V[i] -= 0.1 * S.V[i];                                          // waves reflecting off a wall scour the beach
  }
  for (let i = 0; i < NC; i++) { S.V[i] -= out[i]; if (i + 1 < NC) S.V[i + 1] += out[i]; S.V[i] *= 1 - 0.084; if (o.nourish && S.year % 5 === 0) S.V[i] += 60; S.V[i] = Math.max(0, S.V[i]); }
  S.V[0] += 28 * 0.6;   // some sand arrives from Flamborough Head
  S.year++; S.hist.push([S.year, K.mean(S.x)]);
}
const holdRate = (o, r, yrs = 50, warm = 60) => { const S = newHold(o); for (let y = 0; y < warm; y++) holdYear(S, r); const x0 = K.mean(S.x); for (let y = 0; y < yrs; y++) holdYear(S, r); return (K.mean(S.x) - x0) / yrs; };

// ---------------- The page ----------------
const DEF = { view: "waves", U: 15, F: 200, th: 30, S: 6, Hb: 1, depth: 6, hard: "granite", soft: "clay", groynes: 0, gStart: 18, wall: false, armour: false, nourish: false, slr: 0.5, speed: 1 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 5), tW = 0, pebs = [], spit = 0, spitT = 0, coast = null, ctime = 0, hold = null, base = null;
const ui = K.app({
  title: "Coasts", subject: "Geography",
  blurb: "Waves from wind and fetch, erosion of headlands and bays, longshore drift and spits, and managing the Holderness coast",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 1A Coastal landscapes and processes: geology (concordant and discordant coasts), erosion, constructive and destructive waves (wind, fetch), longshore drift, erosional and depositional landforms, hard and soft engineering, managed retreat; Holderness.", adv: "Pearson Edexcel A level Geography (9GE0) Option 2B Coastal landscapes and change: sediment cells and budgets, wave energy and power, breaker types, lithology and structure, sea-level change, the Bruun rule, Shoreline Management Plans, cost–benefit (Happisburgh)." } },
  missions: [
    { title: "Fetch and wind", q: "Keep the wind at 15 m/s and increase the fetch from 10 km to 400 km. How do the waves change?", hint: "Higher and longer: wave height grows with the square root of fetch until the sea is 'fully developed'. Coasts facing a long fetch (like Cornwall facing the Atlantic) get the biggest waves.", setup() { set({ view: "waves", F: 10 }); } },
    { title: "Constructive or destructive?", q: "Find a wind and fetch that make destructive waves, then constructive ones. What is different about their shape?", hint: "Destructive waves are high and steep (steepness above about 0.025), break frequently and have a strong backwash that drags material away. Constructive waves are long and low with a strong swash that builds beaches.", setup() { set({ view: "waves", U: 25, F: 50 }); } },
    { title: "Headlands and bays", q: "Run the discordant coast for 2000 years. Where do bays form? Why do the headlands then erode faster?", hint: "Bays are cut into the soft rock, leaving hard-rock headlands. Waves refract (bend) and concentrate their energy on headlands, while bays become sheltered and grow beaches.", setup() { set({ view: "erosion" }); } },
    { title: "Cave, arch, stack, stump", q: "Watch a headland. Put the stages in order and explain each one.", hint: "Hydraulic action and abrasion widen a crack into a cave; caves on both sides meet to make an arch; the arch roof collapses leaving a stack; the stack is eroded at its base to a stump (like Old Harry and his Wife, Dorset).", setup() { set({ view: "erosion" }); } },
    { title: "Longshore drift", q: "Follow one pebble. Why does it move along the beach? Change the wave angle: which angle moves it fastest?", hint: "Swash carries it up the beach at the angle of the waves; backwash pulls it straight down the slope. It zig-zags along. 45° gives the biggest sideways step (½ × swash length × sin 2θ).", setup() { set({ view: "drift", th: 20 }); } },
    { title: "Holderness and groynes", q: "Build 3 km of groynes at Mappleton. What happens to the retreat just south of them?", hint: "The groynes trap drift and protect Mappleton, but starve the beaches downdrift, so the cliffs south of the groynes retreat faster: terminal groyne syndrome.", setup() { set({ view: "hold", groynes: 3 }); } },
    { lvl: "adv", title: "The Bruun rule", q: "Raise sea level by 0.5 m. How far does the shoreline retreat according to the Bruun rule?", hint: "R = S L/(B + h): about 54 m per metre of rise here, so 27 m. The whole beach profile moves up and back. Real coasts vary a lot (sediment supply, defences).", setup() { set({ view: "hold", slr: 0.5 }); } },
    { lvl: "adv", title: "Wave power", q: "A storm wave 4 m high with a 10 s period: calculate its power per metre of coast.", hint: "P = ρg²H²T/(64π) ≈ 155 kW per metre. Doubling the height quadruples the power, which is why storms do most of the erosion.", setup() { set({ view: "waves", U: 22, F: 400 }); } }
  ],
  batch: [
    { title: "Do waves grow with fetch?", question: "How does the significant wave height depend on fetch, at a wind of 15 m/s?", how: "JONSWAP fetch-limited growth; each measured height scatters ±12% (gusts, swell).", xLabel: "log₁₀(fetch / km)", yLabel: "log₁₀(wave height / m)", xs: [0, 0.5, 1, 1.5, 2, 2.3, 2.6], reps: 8, fit: true, theory: x => Math.log10(Hs(15, 10 ** x)), theoryLabel: "H ∝ √F", run: (x, r) => Math.log10(Hs(15, 10 ** x) * Math.exp(0.12 * r.gauss())), note: "A straight line of gradient 0.5 on log–log axes: H ∝ √fetch (until the sea becomes fully developed)." },
    { title: "Which wave angle drives longshore drift fastest?", question: "How far does a pebble move along the beach per wave, for different wave angles?", how: "Swash 6 m; 100 waves with ±10% swash; distance ÷ 100.", xLabel: "wave angle to the shore normal (°)", yLabel: "drift per wave (m)", xs: [0, 10, 20, 30, 40, 45, 50, 60, 70, 80], reps: 3, yMin: 0, theory: th => driftStep(6, th), theoryLabel: "½S sin 2θ", run: (th, r) => { let s = 0; for (let i = 0; i < 100; i++) s += driftStep(6 * (1 + 0.1 * r.gauss()), th); return s / 100; }, note: "Biggest at 45°, zero for waves straight on (0°) or along the coast (90°)." },
    { title: "Does a spit grow at a steady rate?", question: "How long is a spit after a number of years?", how: "Breakers 1 m at 30°, water 6 m deep at the tip; each year's waves vary ±25%.", xLabel: "years", yLabel: "spit length (m)", xs: [10, 20, 40, 60, 80, 100, 120], reps: 5, yMin: 0, fit: true, theory: y => spitRate(1, 30, 6) * y, theoryLabel: "steady growth", run: (y, r) => { let L = 0; for (let k = 0; k < y; k++) L += spitRate(1, 30, 6) * Math.exp(0.25 * r.gauss() - 0.03); return L; }, note: "A straight line (about 35 m a year here) as long as the supply of drift and the water depth stay the same; a deeper estuary slows it down." },
    { title: "How fast does Holderness retreat?", question: "Over 50 years, what is the average cliff retreat rate of the Holderness model?", how: "120 stretches of 500 m; storms vary each year; 60 years' warm-up; no defences.", yLabel: "retreat (m a year)", reps: 60, bins: 15, theory: 1.8, theoryLabel: "measured (about 1.8)", run: (x, r) => holdRate(Object.assign({}, DEF), r), note: "About 1.8 m a year, like the measured average: soft till, a thin beach and strong drift that carries the sand away south." },
    { title: "Terminal groyne syndrome", question: "How much extra does the coast just south of the groynes retreat in 30 years?", how: "Groynes starting at 18 km (Mappleton); extra retreat in the 3 km downdrift compared with no groynes (same storms).", xLabel: "length of groynes (km)", yLabel: "extra retreat downdrift (m)", xs: [0, 0.5, 1, 2, 3, 4], reps: 5, yMin: 0, theory: null, run: (gL, r) => { const seed = Math.floor(r() * 1e9), run1 = o => { const rr = K.rng(seed), S = newHold(o); for (let y = 0; y < 60; y++) holdYear(S, rr); const x0 = S.x.slice(); for (let y = 0; y < 30; y++) holdYear(S, rr); let s = 0, n = 0; for (let i = 0; i < NC; i++) { const km = i * 0.5; if (km >= 18 + gL && km < 21 + gL) { s += S.x[i] - x0[i]; n++; } } return s / n; }; return run1(Object.assign({}, DEF, { groynes: gL })) - run1(Object.assign({}, DEF, { groynes: 0 })); }, note: "The longer the groyne field, the more drift is trapped and the more the starved cliffs south of it retreat." },
    { title: "The Bruun rule (A level)", question: "How far does the shoreline retreat for a rise in sea level?", how: "Closure depth 1.57 × biggest wave (5 m ± 15% each run); berm/cliff 5 m; Dean profile.", xLabel: "sea-level rise (m)", yLabel: "retreat (m)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2], reps: 5, yMin: 0, fit: true, theory: s => bruun(s), theoryLabel: "R = SL/(B + h)", run: (s, r) => bruun(s, 5 * (1 + 0.15 * r.gauss())), note: "About 54 m of retreat per metre of rise: a small rise in sea level moves the shoreline a long way inland." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1A", text: "Wave size depends on wind speed, wind duration and fetch. Destructive waves: high, steep, frequent, strong backwash. Constructive waves: low, long, strong swash." },
      { lvl: "std", tag: "1A", text: "Erosion: hydraulic action, abrasion, attrition, solution. Discordant coasts (rock bands at right angles to the coast) form headlands and bays; concordant coasts (parallel) form coves." },
      { lvl: "std", tag: "1A", text: "Longshore drift moves material along the coast in the direction of the prevailing wind; it builds spits, bars and tombolos where the coast changes direction." },
      { lvl: "std", tag: "1A", text: "Hard engineering (sea walls, groynes, rock armour) protects but is expensive and can shift erosion downdrift; soft engineering (nourishment, dune regeneration) and managed retreat work with nature." },
      { lvl: "adv", tag: "2B", text: "Wave energy E = ρgH²/8 per m²; power P = ρg²H²T/(64π) per metre of crest. Sediment cells; the Bruun rule R = SL/(B + h); Shoreline Management Plans: hold the line, advance the line, managed realignment, no active intervention." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain how a stack forms from a headland.", ans: "<ul><li>waves erode cracks in the headland by hydraulic action and abrasion</li><li>cracks widen into a cave</li><li>caves on either side meet, forming an arch</li><li>the arch roof is weakened and collapses, leaving a stack</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain how longshore drift moves sand along a beach.", ans: "<ul><li>prevailing wind makes waves approach at an angle</li><li>swash carries sand up the beach at that angle</li><li>backwash pulls it straight back down (gravity), so it zig-zags along the coast</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `Calculate the power per metre of a wave ${Hs(P.U, P.F).toFixed(2)} m high with a period of ${Tp(P.U, P.F).toFixed(1)} s.`, ans: () => `<ul><li>P = ρg²H²T/(64π)</li><li>= ${(power(Hs(P.U, P.F), Tp(P.U, P.F)) / 1000).toFixed(1)} kW per metre</li></ul>` }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Waves (JONSWAP): H = 0.0016 (U²/g)√(gF/U²), T = 0.286 (U/g)(gF/U²)^⅓, capped when fully developed (H = 0.243U²/g). Steepness H/L above about 0.025 = destructive. Power ρg²H²T/(64π).</li>
<li>Headlands and bays: each point of the coast moves inland at the rock's erodibility × wave energy × exposure (bays sheltered by e^(−depth/320 m); headlands get refracted wave energy). Erodibility: granite 0.002, Portland limestone 0.03, chalk 0.25, Wealden clays 1.0, boulder clay 1.8 m a year.</li>
<li>Longshore drift: ½S sin 2θ per wave; CERC Q = 0.0909 Hb^2.5 sin 2θ; 2.1% of the drift reaches the spit's tip, which grows by Q ÷ ((depth + 4 m) × 150 m).</li>
<li>Holderness: 120 stretches of 500 m; drift south ∝ beach volume up to saturation; cliff retreat 4 m × storminess × e^(−beach/40); only the sand and gravel (8% of the eroded till) stays on the beach; 8.4% a year lost offshore. Groynes trap 70% of the drift; walls stop retreat but scour the beach; armour cuts retreat by 85%; nourishment adds 60 m³/m every 5 years.</li>
<li>Bruun rule R = SL/(B + h), closure depth 1.57 × the year's biggest wave, Dean profile h = 0.1x^⅔.</li></ul>
<h3>Left out</h3><ul><li>Tides and storm surges in detail, weathering and mass movement on cliffs (see Slopes and Landslides), vegetation, real bathymetry. Constants are illustrative.</li></ul>
<h3>Data</h3><ul><li>Holderness retreat about 1.8 m a year (East Riding of Yorkshire Council monitoring); Mappleton defences 1991 (two rock groynes and revetment).</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/coasts.html">original/coasts.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let gg = ui.group("View");
ctl.view = K.seg(gg, { value: "waves", options: [["waves", "🌊 waves"], ["erosion", "🪨 headlands and bays"], ["drift", "↗ longshore drift"], ["hold", "🏘 Holderness"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(gg, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
grp.waves = gg = ui.group("Wind and fetch");
ctl.U = K.slider(gg, { label: "Wind speed", min: 3, max: 30, step: 0.5, value: 15, unit: "m/s", on: v => P.U = v });
ctl.F = K.slider(gg, { label: "Fetch", min: 1, max: 1000, step: 1, value: 200, unit: "km", on: v => P.F = v });
grp.erosion = gg = ui.group("Rocks");
ctl.hard = K.seg(gg, { value: "granite", options: ["granite", "limestone", "chalk"].map(k => [k, ROCK[k].name]), on: v => { P.hard = v; newCoast(); } });
ctl.soft = K.seg(gg, { value: "clay", options: ["clay", "till", "chalk"].map(k => [k, ROCK[k].name]), on: v => { P.soft = v; newCoast(); } });
let rr = K.row(gg); K.btn(rr, "↺ New coast", () => newCoast());
grp.drift = gg = ui.group("Drift and spit");
ctl.th = K.slider(gg, { label: "Wave angle to the shore", min: 0, max: 85, step: 1, value: 30, unit: "°", on: v => P.th = v });
ctl.S = K.slider(gg, { label: "Swash length", min: 2, max: 15, step: 0.5, value: 6, unit: "m", on: v => P.S = v });
ctl.Hb = K.slider(gg, { label: "Breaker height (spit)", min: 0.3, max: 2.5, step: 0.1, value: 1, unit: "m", on: v => P.Hb = v });
ctl.depth = K.slider(gg, { label: "Water depth at the spit's tip", min: 1, max: 20, step: 0.5, value: 6, unit: "m", on: v => P.depth = v });
grp.hold = gg = ui.group("Managing Holderness");
ctl.groynes = K.slider(gg, { label: "Groynes (+ armour/wall) at Mappleton", min: 0, max: 4, step: 0.5, value: 0, unit: "km", on: v => { P.groynes = v; if (hold) hold.o.groynes = v; } });
ctl.wall = K.toggle(gg, { label: "Sea wall along the same stretch", value: false, on: v => { P.wall = v; if (hold) hold.o.wall = v; } });
ctl.armour = K.toggle(gg, { label: "Rock armour", value: false, on: v => { P.armour = v; if (hold) hold.o.armour = v; } });
ctl.nourish = K.toggle(gg, { label: "Beach nourishment every 5 years", value: false, on: v => { P.nourish = v; if (hold) hold.o.nourish = v; } });
ctl.slr = K.slider(gg, { label: "Sea-level rise (A level: Bruun rule)", min: 0, max: 1.2, step: 0.05, value: 0.5, unit: "m", on: v => P.slr = v });
rr = K.row(gg); K.btn(rr, "↺ Start again", () => newHoldWorld());
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
// a discordant coast: alternating bands of hard and soft rock, 60 points along 6 km
function newCoast() { coast = []; for (let i = 0; i <= 120; i++) { const x = i / 120 * 6000, band = Math.floor(x / 1000) % 2 === 0 ? P.hard : P.soft; coast.push({ x, y: 0, rock: band, stage: 0, cut: 0 }); } ctime = 0; }
function newHoldWorld() { hold = newHold(Object.assign({}, P)); base = newHold(Object.assign({}, P, { groynes: 0, wall: false, armour: false, nourish: false })); const r1 = K.rng(11), r2 = K.rng(11); for (let y = 0; y < 60; y++) { holdYear(hold, r1); holdYear(base, r2); } hold.x0 = hold.x.slice(); base.x0 = base.x.slice(); hold.rA = K.rng(99); hold.rB = K.rng(99); hold.year = base.year = 0; hold.hist = []; base.hist = []; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["U", "F", "th", "S", "Hb", "depth", "groynes", "slr", "speed"]) ctl[k].set(P[k]); ctl.hard.set(P.hard); ctl.soft.set(P.soft); ctl.wall.set(P.wall); ctl.armour.set(P.armour); ctl.nourish.set(P.nourish); ctl.view.set(P.view); pebs = Array.from({ length: 6 }, (_, i) => ({ x: 40 + i * 30, ph: 0 })); spit = 0; spitT = 0; newCoast(); newHoldWorld(); showGroups(); }

// ---------------- Simulation ----------------
let accH = 0;
function tick(dt) {
  const s = dt * P.speed; tW += s;
  if (P.view === "drift") { for (const p of pebs) { p.ph += s * 0.8; if (p.ph >= 1) { p.ph -= 1; p.x += driftStep(P.S, P.th) * 4; if (p.x > 900) p.x -= 860; } } spitT += s * 2; spit = spitRate(P.Hb, P.th, P.depth) * spitT; }
  if (P.view === "erosion") { const yrs = s * 40; ctime += yrs; const E = 1; let front = -Infinity; for (const p of coast) front = Math.max(front, -p.y);
    for (let i = 0; i < coast.length; i++) { const p = coast[i], depth = (-coast.reduce((m, q) => Math.min(m, q.y), 0)) - (-p.y), l = coast[Math.max(0, i - 3)].y, rgt = coast[Math.min(coast.length - 1, i + 3)].y, protrude = Math.max(0, (l + rgt) / 2 - p.y); const expo = Math.exp(-(p.y - Math.min(...coast.map(q => q.y))) / 320) * (1 + protrude / 60); const d = ROCK[p.rock].e * E * expo * yrs; p.y += d; p.cut += d; }
    // headland corners are attacked from two sides and sand fills the bay ends, so the coastline rounds off (a little smoothing)
    const a = Math.min(0.2, 0.02 * yrs), y = coast.map(p => p.y); for (let i = 1; i < coast.length - 1; i++) coast[i].y += a * (y[i - 1] + y[i + 1] - 2 * y[i]); }
  if (P.view === "hold") { accH += s * 3; while (accH > 1) { accH--; if (hold.year < 200) { hold.o = Object.assign({}, P); holdYear(hold, hold.rA); holdYear(base, hold.rB); } } }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawWaves(c, w, h) {
  const H = Hs(P.U, P.F), T = Tp(P.U, P.F), L = wavelength(T), st = H / L, destr = st > 0.025, sc = Math.min(18, (h * 0.25) / Math.max(1, H)), y0 = h * 0.45;
  c.fillStyle = "#123056"; c.fillRect(0, y0, w, h - y0); c.fillStyle = "#c9b48a"; c.beginPath(); c.moveTo(w * 0.7, h); c.lineTo(w, y0 - 40); c.lineTo(w, h); c.fill();
  c.strokeStyle = "#cfe3ff"; c.lineWidth = 2.5; c.beginPath(); for (let x = 0; x <= w * 0.86; x += 3) { const ph = 2 * Math.PI * (x / (L * 3) - tW / T * 2), y = y0 - H / 2 * sc * Math.cos(ph) - (destr ? H * sc * 0.2 * Math.pow(Math.max(0, Math.cos(ph)), 6) : 0); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.lineWidth = 1;
  // wind arrows
  for (let i = 0; i < 5; i++) { const x = ((tW * P.U * 6 + i * 200) % (w * 0.8)); c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(x, 60 + i * 12); c.lineTo(x + 20 + P.U * 1.5, 60 + i * 12); c.stroke(); }
  TX(c, `wind ${P.U} m/s over ${P.F} km of open sea`, 20, 40, "#8fa0bf", "left", "12px");
  TX(c, `${destr ? "DESTRUCTIVE" : "CONSTRUCTIVE"} waves: height ${H.toFixed(2)} m, period ${T.toFixed(1)} s, wavelength ${L.toFixed(0)} m, steepness ${st.toFixed(3)}`, 20, h - 46, destr ? "#ff8a70" : "#7ee787", "left", "600 14px");
  TX(c, destr ? "high, steep and frequent: strong backwash drags material out to sea" : "long and low: strong swash builds up the beach", 20, h - 22, "#cfd8ea", "left", "12.5px");
}
function drawErosion(c, w, h) {
  const sx = w / 6000, maxY = Math.max(400, ...coast.map(p => p.y)), sy = (h * 0.62) / (maxY + 200), y0 = 120;
  c.fillStyle = "#123056"; c.fillRect(0, 0, w, h);
  // land (rock bands) behind the coastline
  for (let i = 0; i < coast.length - 1; i++) { const p = coast[i], q = coast[i + 1]; c.fillStyle = ROCK[p.rock].col; c.beginPath(); c.moveTo(p.x * sx, y0 + p.y * sy); c.lineTo(q.x * sx, y0 + q.y * sy); c.lineTo(q.x * sx, h); c.lineTo(p.x * sx, h); c.fill(); }
  // beaches in bays (where the coast is set back), and headland features
  const front = Math.min(...coast.map(p => p.y));
  for (let i = 0; i < coast.length; i++) { const p = coast[i]; if (p.y - front > 80) { c.fillStyle = "#e6d29a"; c.fillRect(p.x * sx - 3, y0 + p.y * sy - 6, 7, 6); } }
  for (let b = 0; b < 6; b += 2) { const mid = coast[Math.round((b + 0.5) * 20)], st = Math.min(4, Math.floor((ctime / 400))), lab = ["crack", "cave", "arch", "stack", "stump"][st]; const x = mid.x * sx, y = y0 + mid.y * sy; if (st >= 3) { c.fillStyle = ROCK[P.hard].col; c.beginPath(); c.arc(x, y - 30, st === 3 ? 10 : 5, 0, 6.3); c.fill(); } TX(c, lab, x, y - (st >= 3 ? 46 : 10), "#ffd166", "center", "600 11.5px"); }
  TX(c, `${ctime.toFixed(0)} years · hard: ${ROCK[P.hard].name} · soft: ${ROCK[P.soft].name} (bands every 1 km) · plan view, sea at the top`, 14, 22, "#eef2f8", "left", "600 13px");
}
function drawDrift(c, w, h) {
  const y0 = h * 0.25, y1 = h * 0.7; c.fillStyle = "#123056"; c.fillRect(0, 0, w, y0); c.fillStyle = "#e6d29a"; c.fillRect(0, y0, w, y1 - y0); c.fillStyle = "#3a5a3c"; c.fillRect(0, y1, w, h - y1);
  // waves arriving at angle θ
  const a = P.th * Math.PI / 180; c.strokeStyle = "rgba(220,235,255,.6)"; for (let i = -6; i < 14; i++) { const x = i * 80 + (tW * 40) % 80; c.beginPath(); c.moveTo(x, y0); c.lineTo(x - Math.tan(a) * y0 * 0.9, 10); c.stroke(); }
  // groynes every 200 px
  for (let x = 200; x < w; x += 300) { c.fillStyle = "#6b4a2a"; c.fillRect(x, y0 - 20, 8, (y1 - y0) * 0.7); }
  // pebbles: swash up at angle θ, backwash straight down
  pebs.forEach((p, i) => { const sw = P.S * 6, up = p.ph < 0.5, u = up ? p.ph * 2 : (p.ph - 0.5) * 2, dx = driftStep(P.S, P.th) * 4, x = p.x + (up ? dx * u : dx), y = y0 + 10 + 20 * i + (y1 - y0 - 150) * 0 + (up ? -1 : 1) * 0 + (up ? (1 - u) : u) * 0; const yy = y0 + 30 + i * 12 + (up ? sw * u * Math.cos(a) * 0.6 : sw * (1 - u) * Math.cos(a) * 0.6); c.fillStyle = i === 0 ? "#ff6b81" : "#8a7a6a"; c.beginPath(); c.arc(x % w, yy, i === 0 ? 7 : 5, 0, 6.3); c.fill(); });
  TX(c, "swash at the angle of the waves ↗ · backwash straight back ↓ · the red pebble zig-zags along", 20, y1 + 24, "#e8f4e8", "left", "12.5px");
  // spit growing across an estuary mouth (inset)
  const ix = w * 0.62, iy = y1 + 40, iw = w * 0.34; c.fillStyle = "#123056"; c.fillRect(ix, iy, iw, h - iy - 10); c.fillStyle = "#e6d29a"; c.fillRect(ix, iy, 30, h - iy - 10); const sl = Math.min(iw - 40, spit / 10); c.fillRect(ix + 30, iy + 20, sl, 14); c.beginPath(); c.arc(ix + 30 + sl, iy + 34, 10, Math.PI, 0); c.fill(); TX(c, `spit: ${spit.toFixed(0)} m after ${spitT.toFixed(0)} years`, ix + 40, h - 20, "#ffd166", "left", "600 12px");
  TX(c, `wave angle ${P.th}° · each wave moves pebbles ${driftStep(P.S, P.th).toFixed(2)} m along the coast`, 20, 30, "#eef2f8", "left", "600 14px");
}
function drawHold(c, w, h) {
  const x0 = 60, x1 = w - 30, y0 = 50, y1 = h - 60, X = i => x0 + (x1 - x0) * i / (NC - 1), maxR = Math.max(10, ...base.x.map((v, i) => v - base.x0[i]), ...hold.x.map((v, i) => v - hold.x0[i])), Y = v => y0 + (y1 - y0) * v / (maxR * 1.1);
  c.fillStyle = "#123056"; c.fillRect(x0, y0 - 30, x1 - x0, 30); c.fillStyle = "#3a5a3c"; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.fillStyle = "#7a5a40"; c.beginPath(); c.moveTo(x0, y0); for (let i = 0; i < NC; i++) c.lineTo(X(i), Y(hold.x[i] - hold.x0[i])); c.lineTo(x1, y0); c.fill();
  c.strokeStyle = "#ffd166"; c.setLineDash([4, 3]); c.beginPath(); for (let i = 0; i < NC; i++) { const y = Y(base.x[i] - base.x0[i]); i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); } c.stroke(); c.setLineDash([]);
  if (P.groynes > 0 || P.wall) { const a = X(P.gStart / 0.5), b = X((P.gStart + Math.max(1, P.groynes)) / 0.5); c.fillStyle = "#9aa3b2"; c.fillRect(a, y0 - 12, b - a, 10); TX(c, "defences (Mappleton)", (a + b) / 2, y0 - 16, "#cfd8ea", "center", "11px"); }
  [["Bridlington", 0], ["Hornsea", 13], ["Mappleton", 19], ["Withernsea", 40], ["Spurn Head", 58]].forEach(([n, km]) => { const x = X(km / 0.5); TX(c, n, x, y1 + 16, "#cfd8ea", "center", "11px"); });
  TX(c, `${hold.year} years · brown: land lost (with your defences) · gold dashes: without defences · drift runs north → south (left → right)`, x0, 22, "#eef2f8", "left", "600 13px");
  TX(c, `deepest retreat ${maxR.toFixed(0)} m`, x1, y1 - 8, "#cfd8ea", "right", "11px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ waves: drawWaves, erosion: drawErosion, drift: drawDrift, hold: drawHold })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "waves") {
    const pts = []; for (let lf = 0; lf <= 3; lf += 0.05) pts.push([10 ** lf, Hs(P.U, 10 ** lf)]);
    chA.opts.title = "Wave height against fetch"; chA.opts.xLabel = "fetch (km)"; chA.opts.yLabel = "H (m)"; chA.draw([{ pts, color: "#5ad1ff", label: `wind ${P.U} m/s` }, { pts: [[P.F, Hs(P.U, P.F)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    const up = []; for (let U = 3; U <= 30; U += 0.5) up.push([U, power(Hs(U, P.F), Tp(U, P.F)) / 1000]);
    chB.opts.title = "Wave power against wind speed"; chB.opts.xLabel = "wind (m/s)"; chB.opts.yLabel = "kW per metre"; chB.draw([{ pts: up, color: "#ff8a70", label: `fetch ${P.F} km` }, { pts: [[P.U, power(Hs(P.U, P.F), Tp(P.U, P.F)) / 1000]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    const H = Hs(P.U, P.F), T = Tp(P.U, P.F); relabel(["wave height", "period", "wavelength", "steepness", "power per metre"]);
    read.set("a", H.toFixed(2) + " m"); read.set("b", T.toFixed(1) + " s"); read.set("c", wavelength(T).toFixed(0) + " m"); read.set("d", (H / wavelength(T)).toFixed(3) + (H / wavelength(T) > 0.025 ? " (destructive)" : " (constructive)")); read.set("e", (power(H, T) / 1000).toFixed(1) + " kW/m");
    ui.hud("Bigger waves: stronger wind, longer fetch");
  } else if (P.view === "erosion") {
    chA.opts.title = "Coastline position"; chA.opts.xLabel = "along the coast (km)"; chA.opts.yLabel = "retreat (m)"; chA.draw([{ pts: coast.map(p => [p.x / 1000, p.y]), color: "#ffd166", label: "retreat" }], { xMin: 0, xMax: 6, yMin: 0 });
    const hardR = K.mean(coast.filter(p => p.rock === P.hard).map(p => p.y)), softR = K.mean(coast.filter(p => p.rock === P.soft).map(p => p.y));
    chB.opts.title = "Average retreat by rock"; chB.opts.xLabel = "0 hard · 1 soft"; chB.opts.yLabel = "m"; chB.draw([{ pts: [[0, hardR]], type: "bars", w: 0.6, color: ROCK[P.hard].col, label: ROCK[P.hard].name }, { pts: [[1, softR]], type: "bars", w: 0.6, color: ROCK[P.soft].col, label: ROCK[P.soft].name }], { xMin: -0.6, xMax: 1.6, yMin: 0 });
    relabel(["years", "bay depth", "hard rock retreat", "soft rock retreat", "headland stage"]);
    read.set("a", ctime.toFixed(0)); read.set("b", (softR - hardR).toFixed(0) + " m"); read.set("c", hardR.toFixed(1) + " m"); read.set("d", softR.toFixed(1) + " m"); read.set("e", ["crack", "cave", "arch", "stack", "stump"][Math.min(4, Math.floor(ctime / 400))]);
    ui.hud("Soft rock → bays; hard rock → headlands");
  } else if (P.view === "drift") {
    const pts = []; for (let th = 0; th <= 90; th += 1) pts.push([th, driftStep(P.S, th)]);
    chA.opts.title = "Drift per wave against wave angle"; chA.opts.xLabel = "angle (°)"; chA.opts.yLabel = "m per wave"; chA.draw([{ pts, color: "#ffd166", label: "½S sin 2θ" }, { pts: [[P.th, driftStep(P.S, P.th)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 90, yMin: 0 });
    const sp = []; for (let y = 0; y <= 120; y += 5) sp.push([y, spitRate(P.Hb, P.th, P.depth) * y]);
    chB.opts.title = "Spit length against time"; chB.opts.xLabel = "years"; chB.opts.yLabel = "m"; chB.draw([{ pts: sp, color: "#7ee787", label: "spit" }, { pts: [[spitT, spit]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    relabel(["drift per wave", "drift rate (CERC)", "spit growth", "spit length", ""]);
    read.set("a", driftStep(P.S, P.th).toFixed(2) + " m"); read.set("b", (cerc(P.Hb, P.th) * 3600).toFixed(0) + " m³ an hour"); read.set("c", spitRate(P.Hb, P.th, P.depth).toFixed(1) + " m a year"); read.set("d", spit.toFixed(0) + " m"); read.set("e", "");
    ui.hud("Swash at an angle, backwash straight down: longshore drift");
  } else {
    const rWith = hold.year ? (K.mean(hold.x) - K.mean(hold.x0)) / hold.year : 0, rBase = base.year ? (K.mean(base.x) - K.mean(base.x0)) / base.year : 0;
    chA.opts.title = "Retreat along the coast"; chA.opts.xLabel = "km south of Bridlington"; chA.opts.yLabel = "m since start"; chA.draw([{ pts: hold.x.map((v, i) => [i * 0.5, v - hold.x0[i]]), color: "#ff8a70", label: "your plan" }, { pts: base.x.map((v, i) => [i * 0.5, v - base.x0[i]]), color: "#ffd166", dash: [4, 3], label: "no defences" }], { xMin: 0, xMax: 60, yMin: 0 });
    chB.opts.title = "Beach volume (protects the cliff)"; chB.opts.xLabel = "km south"; chB.opts.yLabel = "m³ per m"; chB.draw([{ pts: hold.V.map((v, i) => [i * 0.5, v]), type: "area", color: "#e6d29a", label: "beach" }], { xMin: 0, xMax: 60, yMin: 0 });
    relabel(["years", "average retreat (your plan)", "average retreat (no defences)", "Bruun retreat for the sea-level rise", ""]);
    read.set("a", String(hold.year)); read.set("b", rWith.toFixed(2) + " m a year"); read.set("c", rBase.toFixed(2) + " m a year"); read.set("d", bruun(P.slr).toFixed(0) + " m (A level)"); read.set("e", "");
    ui.hud("Holderness: about 1.8 m a year, Europe's fastest-eroding coast");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Four views at the top of the controls.", 6000);
