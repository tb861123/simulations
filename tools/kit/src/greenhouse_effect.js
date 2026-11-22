/* =====================================================================
   THE GREENHOUSE EFFECT
   The Earth is warmed by sunlight and cools by giving off infrared (IR).
   Its temperature settles where the two balance.

     energy in  = sunlight absorbed           = (S / 4) × (1 − albedo)
     energy out = infrared escaping to space  = σT⁴ / (1 + τ/2)

   S is the sunlight arriving (the solar constant, about 1361 W/m²); it is
   divided by 4 because a sphere has four times the area of the disc that
   catches the sunlight. The albedo is the fraction reflected (about 0.3).
   σT⁴ is how much infrared a surface at temperature T gives off.

   τ (tau) says how good the air is at trapping infrared: how many
   'blankets' thick it is. Greenhouse gases (CO₂, water vapour, methane)
   absorb infrared and re-emit it in all directions, some back down. With
   no greenhouse gases τ = 0 and the Earth would average −18 °C.

   The ocean has to be warmed too, so the temperature changes slowly:
     heat capacity × (change in T per year) = energy in − energy out
   ===================================================================== */
const SIG = 5.67e-8, YEAR = 3.156e7;
const TAU = { base: 1.2326, co2: 0.0726, ch4: 0.036 / 73.7 };    // calibrated: 280 ppm, 700 ppb → 13.9 °C; each CO₂ doubling traps 3.7 W/m²
// Planets: their own sunlight, albedo and a fixed blanket thickness
const PLANET = {
  earth: { name: "Earth", S: 1361, a: 0.30 },
  none: { name: "Earth with no air", S: 1361, a: 0.30, tau: 0 },
  mars: { name: "Mars", S: 586, a: 0.25, tau: 0.03 },
  venus: { name: "Venus", S: 2601, a: 0.77, tau: 221 }
};
/* p: { planet, S, a (albedo), co2 (ppm), ch4 (ppb), f (water vapour feedback, W/m² per °C), aer (extra albedo from pollution and volcanoes) } */
function tauOf(p, T) {
  const pl = PLANET[p.planet]; if (pl.tau != null) return pl.tau;
  // CO₂ adds logarithmically: each doubling adds the same amount of trapping
  let t = TAU.base + TAU.co2 * Math.log(p.co2 / 280) + TAU.ch4 * (Math.sqrt(p.ch4) - Math.sqrt(700));
  // water vapour: warmer air holds more water (about 7% per °C), and water vapour is a greenhouse gas
  t += p.f / 73.7 * 40 * Math.tanh((T - 287.05) / 40);
  return Math.max(0, t);
}
const absorbed = p => p.S / 4 * (1 - K.clamp(p.a + (p.aer || 0), 0, 1));
const olr = (p, T) => SIG * T ** 4 / (1 + tauOf(p, T) / 2);
// the balance temperature: where energy in = energy out (found by halving the interval)
function balance(p) { let lo = 30, hi = 1000; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (absorbed(p) - olr(p, m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; }

class Climate {
  /* o adds: depth (ocean mixed layer, m), noise (W/m² of random year-to-year variability) */
  constructor(o, rand) { this.p = Object.assign({ planet: "earth", S: 1361, a: 0.30, co2: 280, ch4: 700, f: 2.2, aer: 0, depth: 70, noise: 0.5 }, o); this.rand = rand; this.T = balance(this.p); this.t = 0; this.wob = 0; this.volc = 0; }
  heatCap() { return 4.18e6 * this.p.depth; }           // J per m² per °C: water's heat capacity × depth of the mixed layer
  step(dt) {                                             // dt in years
    const p = this.p, r = this.rand;
    // natural variability (El Niño, weather): a random push that wanders from year to year
    this.wob += (-this.wob / 1 * dt) + p.noise * Math.sqrt(2 * dt) * gauss(r);
    this.volc *= Math.exp(-dt / 1.2);                    // volcanic haze settles out over a year or two
    const q = Object.assign({}, p, { aer: p.aer + this.volc });
    const net = absorbed(q) - olr(q, this.T) + this.wob;  // W/m²
    this.T += net * YEAR * dt / this.heatCap();
    this.t += dt; this.net = net;
  }
}
const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * r()); };
const C = T => T - 273.15;
// CO₂ pathways: history (fitted to the Mauna Loa and ice-core record) then three futures
const SCEN = {
  low: { name: "Low emissions (fast cuts)", col: "#7fe3a0" },
  mid: { name: "Middle (emissions level off)", col: "#ffd166" },
  high: { name: "High (emissions keep growing)", col: "#ff6b6b" }
};
function co2At(y, s) {
  const hist = y2 => 280 + 140 * Math.exp((y2 - 2024) / 48);
  if (y <= 2024) return hist(y);
  const d = y - 2024;
  if (s === "high") return hist(y);
  if (s === "mid") return 420 + 2.4 * d;
  return 420 + 30 * (1 - Math.exp(-d / 12)) - 0.6 * Math.max(0, d - 20);     // peaks about 450 ppm then slowly falls
}
// pollution aerosols reflect sunlight; they grew with industry and fall as air gets cleaner
function aerAt(y, s) { const hist = 0.0015 * (co2At(Math.min(y, 2024), s) - 280) / 140; return y <= 2024 ? hist : hist * (s === "high" ? 1 : Math.exp(-(y - 2024) / 30)); }
// approximate observed global temperature, decade averages, relative to 1850–1900 (rounded from HadCRUT5)
const OBS = [[1855, -0.02], [1865, -0.02], [1875, -0.02], [1885, -0.08], [1895, -0.06], [1905, -0.2], [1915, -0.13], [1925, -0.05], [1935, 0.05], [1945, 0.15], [1955, 0.05], [1965, 0.05], [1975, 0.15], [1985, 0.35], [1995, 0.55], [2005, 0.8], [2015, 1.0], [2021, 1.2]];

// run history 1850 → 2100 under a scenario; returns [year, anomaly] pairs
function history(s, rand, o = {}) {
  const cl = new Climate(Object.assign({ co2: co2At(1850, s) }, o), rand), base = cl.T, out = [];
  for (let y = 1850; y <= 2100; y += 0.25) { cl.p.co2 = co2At(y, s); cl.p.aer = o.noAer ? 0 : aerAt(y, s); cl.step(0.25); if (y % 1 === 0) out.push([y, cl.T - base]); }
  return out;
}
function settle(o, rand, years = 200, avg = 30) { const cl = new Climate(o, rand); cl.T = balance(Object.assign({}, cl.p, { co2: 280, f: cl.p.f })); let s = 0, n = 0; for (let y = 0; y < years; y += 0.25) { cl.step(0.25); if (y >= years - avg) { s += cl.T; n++; } } return s / n; }

// ---------------- The page ----------------
const P = { planet: "earth", S: 1361, a: 0.30, co2: 280, ch4: 700, f: 2.2, depth: 70, noise: 0.5, aerOn: true, scen: "mid", hist: false };
let cl, speed = 1, tlog = [], rnd = K.rng(Date.now() % 99991 + 47), pk = [], startT = 0, yr = 0, runs = [], mol = [];
function restart(fromBalance = true) {
  cl = new Climate({ planet: P.planet, S: P.S, a: P.a, co2: P.co2, ch4: P.ch4, f: P.f, depth: P.depth, noise: P.noise }, rnd);
  if (P.hist) { cl.p.co2 = co2At(1850, P.scen); cl.T = balance(cl.p); yr = 1850; } else yr = 0;
  startT = cl.T; tlog = []; pk = [];
}
const ui = K.app({
  title: "The Greenhouse Effect", subject: "Climate",
  blurb: "Sunlight in, infrared out: why the Earth is warm, and getting warmer",
  reset: () => preset("pre"),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "AQA GCSE Chemistry (8462) 4.9.2 and Pearson Edexcel GCSE Geography A (1GA0) Topic 2: the greenhouse effect, greenhouse gases (CO₂, methane, water vapour), human activities that increase them, and the effects of climate change.", adv: "Edexcel A level Geography (9GE0) Topic 5–6 (the carbon cycle, energy security and climate change): radiative forcing, feedbacks, climate sensitivity and future emission pathways. The energy-balance maths (σT⁴) goes beyond the spec, for interest." } },
  missions: [
    { title: "No air at all", q: "Pick 'Earth with no air'. What temperature does the Earth settle at? Now pick 'Pre-industrial Earth'. How much warmer does the greenhouse effect make it?", hint: "With no atmosphere the Earth would average about −18 °C: sunlight in = infrared out at that temperature. Pre-industrial Earth settles near 14 °C: the greenhouse effect adds about 32 °C. Without it, oceans would freeze. The greenhouse effect is natural and essential; the problem is making it stronger.", setup() { preset("none"); } },
    { title: "Watch the packets", q: "Yellow packets are sunlight, red ones infrared. Which ones do the greenhouse gas molecules stop? What do the molecules do with the energy?", hint: "Sunlight (short wavelength) passes through the air almost unaffected. The warm ground gives off infrared (long wavelength), which CO₂, water vapour and methane absorb. They re-emit it in random directions: some back down, warming the ground further. More gas, more infrared sent back down.", setup() { preset("pre"); set({ speed: 0.5 }); } },
    { title: "More CO₂", q: "Starting from 280 ppm, raise CO₂ to 560 ppm (double). Watch energy in and energy out. Why does the temperature keep rising for decades after the change?", hint: "More CO₂ traps more infrared, so energy out drops below energy in. The Earth gains energy and warms until its extra infrared restores the balance. The oceans take a lot of heating, so this takes decades. Doubled CO₂ gives about 3 °C of warming here (the IPCC's best estimate is 3 °C).", setup() { preset("pre"); } },
    { title: "History and futures", q: "Turn on 'History and futures' and run the middle path from 1850. Does the model follow the observed temperatures (white dots)? Then compare the three futures to 2100.", hint: "The model, driven only by rising CO₂ and pollution haze, follows the observed warming of about 1.2 °C to the 2020s. The futures differ hugely: fast cuts keep warming near 1.5–2 °C; high emissions give about 4 °C or more by 2100. The difference is our choices, not the physics.", setup() { preset("pre"); set({ hist: true, scen: "mid" }); } },
    { title: "A volcano", q: "Make Pinatubo erupt. What happens to the temperature over the next few years? Does it last?", hint: "Volcanic haze (sulfate droplets) reflects sunlight: the albedo rises a little, and the Earth cools by about 0.3–0.5 °C for a year or two. Pinatubo (1991) did this. The haze falls out within a couple of years, so the effect does not last, unlike CO₂, which stays in the air for centuries.", setup() { preset("today"); } },
    { title: "Venus and Mars", q: "Venus is closer to the Sun but reflects most sunlight. Mars has a very thin atmosphere. Predict, then check, which is hotter: Venus or Mercury (about 170 °C on average)?", hint: "Venus averages about 460 °C, hotter than Mercury, even though it absorbs less sunlight than the Earth. Its thick CO₂ atmosphere is a runaway greenhouse. Mars, with almost no greenhouse effect, is about −60 °C.", setup() { preset("venus"); } },
    { lvl: "adv", title: "Water vapour feedback", q: "Double CO₂ with the feedback on, then with it off. How much warming does each give? Why is water vapour called a feedback rather than a forcing?", hint: "Without the feedback about 1.1 °C; with it about 3 °C. Warmer air holds more water vapour (about 7% more per °C), which traps more infrared and warms further: a positive feedback. It is not a forcing because the amount of water vapour is set by temperature: extra water vapour rains out in days.", setup() { preset("pre"); set({ f: 0 }); } },
    { lvl: "adv", title: "Ocean depth and the lag", q: "With 10 m, 70 m and 200 m of ocean, double CO₂ and time how long it takes to reach 63% of the final warming. How does the response time depend on depth?", hint: "Response time = heat capacity ÷ feedback parameter: proportional to depth. 70 m gives about 8 years. The real deep ocean adds a slow tail of centuries, so even if CO₂ stopped rising, some warming would still be 'in the pipeline'.", setup() { preset("pre"); set({ depth: 10 }); } }
  ],
  batch: [
    { title: "How much warming per doubling of CO₂?", question: "How does the settled temperature depend on CO₂?", how: "Each run: start in balance at 280 ppm, set the CO₂, run 200 years with natural variability, average the last 30.", xLabel: "CO₂ (ppm)", yLabel: "settled temperature (°C)", xs: [140, 200, 280, 400, 560, 800, 1120], reps: 3, run: (x, r) => C(settle({ co2: x }, r)), theory: x => C(balance({ planet: "earth", S: 1361, a: 0.3, co2: x, ch4: 700, f: 2.2 })), theoryLabel: "energy balance", note: "Each doubling (140 → 280 → 560 → 1120) adds about the same warming, about 3 °C: CO₂'s effect is logarithmic." },
    { title: "Without feedback, about 1.1 °C?", question: "How much warming does doubled CO₂ give with no water vapour feedback?", how: "Each run: no water vapour feedback; start in balance, set the CO₂, run 200 years and average the last 30.", xLabel: "CO₂ (ppm)", yLabel: "settled temperature (°C)", xs: [140, 200, 280, 400, 560, 800, 1120], reps: 3, run: (x, r) => C(settle({ co2: x, f: 0 }, r)), theory: x => C(balance({ planet: "earth", S: 1361, a: 0.3, co2: x, ch4: 700, f: 0 })), theoryLabel: "energy balance, no feedback", note: "About 1.1 °C per doubling: the warming CO₂ causes by itself. The feedback roughly triples it." },
    { title: "Stronger feedback, more warming?", question: "How does the warming for doubled CO₂ (the climate sensitivity) depend on the strength of the water vapour feedback?", how: "Each run: start in balance at 280 ppm with the chosen feedback, double CO₂, run 300 years and average the last 30.", xLabel: "feedback strength (W/m² per °C)", yLabel: "warming for doubled CO₂ (°C)", xs: [0, 0.5, 1, 1.5, 2, 2.5], reps: 3, yMin: 0, run: (x, r) => settle({ co2: 560, f: x }, r, 300) - balance({ planet: "earth", S: 1361, a: 0.3, co2: 280, ch4: 700, f: x }), theory: x => 3.7 / (3.32 - x), theoryLabel: "3.7 ÷ (3.32 − f)", note: "The warming shoots up as the feedback approaches 3.3 W/m² per °C, the Planck response (how much extra infrared a warmer Earth gives off). Uncertainty in feedbacks is why the climate sensitivity is uncertain." },
    { title: "Climate sensitivity ensemble", question: "If we are unsure of the feedback (2.2 ± 0.3 W/m² per °C), what range of warming for doubled CO₂ should we expect?", how: "Each run: the feedback strength is drawn at random from a bell curve with mean 2.2 and SD 0.3; warming for doubled CO₂ found from the energy balance.", reps: 300, bins: 30, lo: 1.5, hi: 6, theory: 3.0, theoryLabel: "IPCC best estimate", run(x, r) { const f = 2.2 + 0.3 * gauss(r), base = { planet: "earth", S: 1361, a: 0.3, ch4: 700, f }; return balance(Object.assign({}, base, { co2: 560 })) - balance(Object.assign({}, base, { co2: 280 })); }, note: "A lopsided spread: a long tail of high values. A symmetric uncertainty in feedback gives an asymmetric uncertainty in warming, because the warming depends on 1 ÷ (3.32 − f). The IPCC's likely range is 2.5–4 °C." },
    { title: "Albedo", question: "How does the settled temperature depend on how much sunlight is reflected?", how: "Each run: today's CO₂ (420 ppm), the chosen albedo, 200 years with natural variability, last 30 averaged.", xLabel: "albedo", yLabel: "settled temperature (°C)", xs: [0.2, 0.25, 0.3, 0.35, 0.4, 0.45], reps: 3, run: (x, r) => C(settle({ co2: 420, a: x }, r)), theory: x => C(balance({ planet: "earth", S: 1361, a: x, co2: 420, ch4: 700, f: 2.2 })), theoryLabel: "energy balance", note: "A small change in albedo matters a lot: 0.01 is about 3.4 W/m², nearly a CO₂ doubling. That is why melting ice (dark ocean replacing white ice) is such an important feedback." },
    { title: "Does a deeper ocean slow the warming?", question: "How does the time to reach 63% of the final warming depend on the depth of the ocean mixed layer?", how: "Each run: no natural variability; start in balance at 280 ppm, double CO₂ and time how long the temperature takes to reach 63% of its final rise.", xLabel: "ocean mixed-layer depth (m)", yLabel: "time to 63% (years)", xs: [10, 25, 50, 75, 100, 150, 200], reps: 1, yMin: 0, fit: true, run(x) { const cl = new Climate({ co2: 280, depth: x, noise: 0 }, () => 0.5), T0 = cl.T, T1 = balance(Object.assign({}, cl.p, { co2: 560 })); cl.p.co2 = 560; while (cl.T < T0 + 0.632 * (T1 - T0) && cl.t < 500) cl.step(0.02); return cl.t; }, theory: x => 4.18e6 * x / (3.7 / 3.0) / YEAR, theoryLabel: "heat capacity ÷ feedback parameter", note: "A straight line through the origin: twice the depth, twice the heat to store, twice as long. About 0.11 years per metre." },
    { title: "Warming by 2100: three futures", question: "With natural variability, how much warmer than 1850–1900 will 2100 be under each path?", how: "Each run: the model runs 1850 → 2100 driven by CO₂ and pollution; the x value picks the path (1 = low, 2 = middle, 3 = high). Result: the average anomaly over 2090–2100.", xLabel: "path (1 low · 2 middle · 3 high)", yLabel: "warming by 2100 (°C)", xs: [1, 2, 3], reps: 6, yMin: 0, run(x, r) { const h = history(["low", "mid", "high"][x - 1], r); let s = 0, n = 0; for (const [y, v] of h) if (y >= 2090) { s += v; n++; } return s / n; }, note: "Each path's runs agree to within a few tenths of a degree: natural variability is small compared with the difference between the paths. What happens depends on how much CO₂ we emit." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "8462 4.9.2.1", text: "Greenhouse gases (carbon dioxide, methane, water vapour) let short-wavelength sunlight through but absorb the long-wavelength infrared given off by the Earth, then re-emit it, some back towards the surface. This keeps the Earth warm enough for life." },
      { lvl: "std", tag: "8462 4.9.2.2", text: "Human activities increase greenhouse gases: burning fossil fuels and deforestation (CO₂); cattle farming, rice paddies and landfill (methane). CO₂ has risen from about 280 ppm before industry to over 420 ppm today." },
      { lvl: "std", tag: "8462 4.9.2.3", text: "Effects of climate change: rising sea levels, more extreme weather, changes in rainfall and food production, species distributions changing. It is hard to model a complex system, so predictions have uncertainty, but the warming is clear." },
      { lvl: "std", tag: "1GA0 2", text: "Natural causes of climate change include changes in the Earth's orbit, solar output and volcanic eruptions (whose haze cools the Earth for a year or two)." },
      { lvl: "adv", tag: "9GE0", text: "Radiative forcing: the change in energy balance caused by a change such as more CO₂. Doubling CO₂ gives about 3.7 W/m², which by itself warms about 1.1 °C." },
      { lvl: "adv", tag: "9GE0", text: "Positive feedbacks (water vapour, ice albedo) amplify warming; climate sensitivity (warming for doubled CO₂) is likely 2.5–4 °C, best estimate 3 °C." },
      { lvl: "adv", tag: "Beyond", text: "Energy balance: S(1 − a)/4 = σT⁴/(1 + τ/2). With τ = 0 this gives 255 K (−18 °C); the greenhouse effect adds about 33 °C." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how greenhouse gases keep the Earth warmer than it would otherwise be.", ans: "<ul><li>Short-wavelength radiation from the Sun passes through the atmosphere and warms the Earth's surface</li><li>The Earth emits long-wavelength infrared radiation</li><li>Greenhouse gases absorb the infrared and re-emit it in all directions, including back to the surface</li></ul>" },
      { lvl: "std", marks: 2, q: "Give two human activities that increase the amount of methane in the atmosphere.", ans: "<ul><li>Cattle farming / livestock</li><li>Rice paddies, landfill sites, leaks from gas extraction (any one more)</li></ul>" },
      { lvl: "std", marks: 2, q: "Suggest why the Earth keeps warming for many years after CO₂ stops rising.", ans: "<ul><li>The oceans take a long time to heat up (large heat capacity)</li><li>so energy in is still greater than energy out until the temperature has caught up</li></ul>" },
      { lvl: "std", marks: 2, q: () => `In the simulation, CO₂ is ${Math.round(cl.p.co2)} ppm. Calculate the percentage increase compared with the pre-industrial 280 ppm.`, ans: () => `<ul><li>increase = ${Math.round(cl.p.co2)} − 280 = ${Math.round(cl.p.co2) - 280} ppm</li><li>percentage = ${Math.round(cl.p.co2) - 280} ÷ 280 × 100 = ${((Math.round(cl.p.co2) - 280) / 2.8).toFixed(0)}%</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain why a large volcanic eruption cools the Earth for only a year or two.", ans: "<ul><li>The eruption puts sulfate particles / haze high in the atmosphere</li><li>which reflect sunlight back to space, so less is absorbed</li><li>The particles fall out within a couple of years, so the cooling stops</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why water vapour is described as a feedback rather than a forcing of climate change.", ans: "<ul><li>The amount of water vapour in the air is controlled by temperature (warm air holds more)</li><li>Extra water vapour added directly rains out within days</li><li>so it amplifies warming caused by something else (e.g. CO₂) rather than starting it: a positive feedback</li></ul>" },
      { lvl: "adv", marks: 2, q: "Doubling CO₂ produces a forcing of 3.7 W/m². With a climate feedback parameter of 1.2 W/m² per °C, calculate the equilibrium warming.", ans: "<ul><li>ΔT = ΔF ÷ λ = 3.7 ÷ 1.2</li><li>= 3.1 °C</li></ul>" },
      { lvl: "adv", marks: 3, q: "Using S = 1361 W/m², albedo 0.30 and σ = 5.67 × 10⁻⁸ W m⁻² K⁻⁴, show that the Earth with no greenhouse effect would be about −18 °C.", ans: "<ul><li>absorbed = 1361 × (1 − 0.30) ÷ 4 = 238 W/m²</li><li>σT⁴ = 238, so T = (238 ÷ 5.67 × 10⁻⁸)^¼ = 255 K</li><li>255 − 273 = −18 °C</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Energy in</b> = (S/4)(1 − albedo): sunlight absorbed, averaged over the whole sphere, day and night.</li>
<li><b>Energy out</b> = σT⁴/(1 + τ/2): the infrared escaping to space. This is what you get from a stack of thin layers that each absorb part of the infrared reaching them and re-emit it half up, half down.</li>
<li><b>τ (the blanket)</b> = a fixed part (clouds, ozone, nitrous oxide) + CO₂ (logarithmic: each doubling adds the same, calibrated to trap 3.7 W/m²) + methane (square-root law) + water vapour (rises with temperature to give the feedback you choose).</li>
<li><b>Ocean:</b> heat capacity × rate of warming = energy in − energy out, with a mixed layer of the chosen depth (4.18 MJ per m³ per °C).</li>
<li><b>Natural variability:</b> a random push of about 0.5 W/m² that wanders over a year or so, like El Niño.</li>
<li><b>History:</b> CO₂ follows a curve fitted to the ice-core and Mauna Loa record (about 291 ppm in 1900, 317 in 1960, 420 in 2024). Pollution haze reflects some sunlight (about −0.5 W/m² today). The white dots are rounded decade averages of the observed record (HadCRUT5) relative to 1850–1900.</li>
<li><b>Packets</b> on the picture are only for show: their numbers are proportional to the energy flows.</li></ul>
<h3>Simplifications</h3>
<ul><li>One temperature for the whole planet; no seasons, day and night, or regions.</li>
<li>No deep ocean (real warming has a slow centuries-long tail), no ice–albedo or cloud feedbacks, no carbon cycle (CO₂ is set, not calculated from emissions).</li>
<li>The atmosphere is 'grey': it absorbs all infrared wavelengths equally; no convection or weather.</li>
<li>Venus and Mars use a fixed blanket thickness chosen to give their measured temperatures.</li>
<li>The three futures are simple CO₂ curves, roughly like the IPCC's SSP1-2.6, SSP2-4.5 and SSP5-8.5.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/greenhouse-effect.html">original/greenhouse-effect.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Start from");
ctl.preset = K.seg(g, { value: "pre", options: [["none", "No air"], ["pre", "Pre-industrial"], ["today", "Today"], ["double", "Doubled CO₂"]], on: v => preset(v) });
ctl.preset2 = K.seg(g, { value: "", options: [["venus", "Venus"], ["mars", "Mars"], ["snow", "Snowball albedo"]], on: v => preset(v) });
g = ui.group("Greenhouse gases (change any time)");
ctl.co2 = K.slider(g, { label: "CO₂", min: Math.log(100), max: Math.log(2000), step: 0.01, value: Math.log(280), fmt: v => Math.round(Math.exp(v)) + " ppm", on: v => { P.co2 = Math.exp(v); cl.p.co2 = P.co2; } });
ctl.ch4 = K.slider(g, { label: "Methane", min: 300, max: 4000, step: 10, value: 700, unit: " ppb", on: v => { P.ch4 = v; cl.p.ch4 = v; } });
ctl.f = K.slider(g, { label: "Water vapour feedback", min: 0, max: 3, step: 0.05, value: 2.2, fmt: v => v.toFixed(2) + " W/m² per °C", on: v => { P.f = v; cl.p.f = v; } });
g = ui.group("Sunlight and reflection");
ctl.a = K.slider(g, { label: "Albedo (fraction reflected)", min: 0.05, max: 0.8, step: 0.01, value: 0.30, on: v => { P.a = v; cl.p.a = v; } });
ctl.S = K.slider(g, { label: "Sunlight (solar constant)", min: 400, max: 2700, step: 1, value: 1361, unit: " W/m²", on: v => { P.S = v; cl.p.S = v; } });
let r1 = K.row(g); K.btn(r1, "🌋 Pinatubo", () => cl.volc += 0.0105); K.btn(r1, "🌋🌋 Three times bigger", () => cl.volc += 0.0315);
g = ui.group("History and futures");
ctl.hist = K.toggle(g, { label: "Run from 1850 with real CO₂", value: false, on: v => { P.hist = v; ui.mission(null); restart(); } });
ctl.scen = K.seg(g, { value: "mid", options: [["low", "Low"], ["mid", "Middle"], ["high", "High"]], on: v => { P.scen = v; if (P.hist) restart(); } });
K.btn(K.row(g), "Run all three to 2100", () => { runs = ["low", "mid", "high"].map(s => ({ s, pts: history(s, rnd) })); });
g = ui.group("Ocean and weather");
ctl.depth = K.slider(g, { label: "Ocean mixed-layer depth", min: 5, max: 300, step: 5, value: 70, unit: " m", on: v => { P.depth = v; cl.p.depth = v; } });
ctl.noise = K.slider(g, { label: "Natural variability", min: 0, max: 2, step: 0.1, value: 0.5, unit: " W/m²", on: v => { P.noise = v; cl.p.noise = v; } });
ctl.speed = K.slider(g, { label: "Speed (years per second)", min: Math.log(0.25), max: Math.log(100), step: 0.01, value: 0, fmt: v => K.sig(Math.exp(v), 2) + "×", on: v => speed = Math.exp(v) });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
K.btn(K.row(g), "↺ Start again in balance", () => restart(), "primary");
const read = K.readout(g, [["T", "surface temperature"], ["eq", "heading for"], ["gh", "greenhouse warming"], ["in", "energy in (sunlight absorbed)"], ["out", "energy out (infrared to space)"], ["imb", "imbalance"]]);
function set(o) {
  Object.assign(P, o); const map = { co2: Math.log(P.co2), ch4: P.ch4, f: P.f, a: P.a, S: P.S, depth: P.depth, noise: P.noise };
  for (const k in map) ctl[k].set(map[k]); ctl.hist.set(P.hist); ctl.scen.set(P.scen);
  if (o.speed) { speed = o.speed; ctl.speed.set(Math.log(speed)); }
  if (!cl || "hist" in o || "scen" in o) restart(); else Object.assign(cl.p, { co2: P.co2, ch4: P.ch4, f: P.f, a: P.a, S: P.S, depth: P.depth, noise: P.noise });
}
function preset(k) {
  const base = { planet: "earth", S: 1361, a: 0.30, co2: 280, ch4: 700, f: 2.2, depth: 70, noise: 0.5, hist: false };
  const o = { pre: {}, none: { planet: "none" }, today: { co2: 420, ch4: 1900 }, double: { co2: 560 }, venus: { planet: "venus", S: 2601, a: 0.77 }, mars: { planet: "mars", S: 586, a: 0.25 }, snow: { a: 0.6 } }[k];
  Object.assign(P, base, o); runs = []; speed = 1; ctl.speed.set(0);
  ctl.preset.set(["none", "pre", "today", "double"].includes(k) ? k : ""); ctl.preset2.set(["venus", "mars", "snow"].includes(k) ? k : "");
  const startCO2 = k === "today" || k === "double" ? 280 : P.co2, startCH4 = k === "today" ? 700 : P.ch4;
  set({}); restart();
  // 'today' and 'doubled' start from the pre-industrial balance, so you can watch the warming happen
  if (startCO2 !== P.co2 || startCH4 !== P.ch4) { cl.T = balance(Object.assign({}, cl.p, { co2: startCO2, ch4: startCH4 })); startT = cl.T; }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function spawn(kind, x, y, vy) { pk.push({ kind, x, y, vy, layer: -1 }); }
const NL = 4;                  // drawn atmosphere layers
function updatePackets(dt) {
  const w = cv.w, h = cv.h, top = 40, ground = h - 70, LH = (ground - top) / (NL + 1), tau = tauOf(cl.p, cl.T), eps = tau / (NL + tau / 2);
  const inn = absorbed(Object.assign({}, cl.p, { aer: cl.volc })), refl = cl.p.S / 4 - inn, up = SIG * cl.T ** 4;
  // spawn packets in proportion to the energy flows (about one packet per 22 W/m² per second, capped for Venus)
  const rate = f => Math.min(f, 600) / 22 * dt;
  for (let n = rate(cl.p.S / 4); n > 0; n--) if (Math.random() < n) spawn("sun", 30 + Math.random() * (w - 60), top - 20, 180);
  for (let n = rate(up) * 0.9; n > 0; n--) if (Math.random() < n) spawn("ir", 30 + Math.random() * (w - 60), ground - 2, -110);
  const reflectP = refl / (cl.p.S / 4);
  for (let i = pk.length - 1; i >= 0; i--) {
    const q = pk[i]; const y0 = q.y; q.y += q.vy * dt; q.x += (q.kind === "ir" ? 18 * Math.sin(q.y / 14 + i) : 0) * dt;
    if (q.kind === "sun" && q.vy > 0 && y0 < top + LH * 0.6 && q.y >= top + LH * 0.6 && Math.random() < reflectP) { q.vy = -180; q.refl = true; }
    if (q.kind === "sun" && q.y >= ground) { pk.splice(i, 1); continue; }
    if (q.kind === "ir") {
      // crossing a layer: absorbed with probability ε, then re-emitted up or down at random
      for (let L = 1; L <= NL; L++) { const yl = top + L * LH; if ((y0 - yl) * (q.y - yl) < 0 && Math.random() < eps) { q.y = yl; q.vy = Math.random() < 0.5 ? -110 : 110; q.glow = 0.4; const m = mol[Math.floor(Math.random() * mol.length)]; if (m && Math.abs(m.y - yl) < LH) m.glow = 0.5; break; } }
      if (q.y >= ground) { pk.splice(i, 1); continue; }
    }
    if (q.y < top - 30) { pk.splice(i, 1); continue; }
    if (q.glow) q.glow -= dt;
  }
  if (pk.length > 2500) pk.splice(0, pk.length - 2500);
}
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, top = 40, ground = h - 70, LH = (ground - top) / (NL + 1), tau = tauOf(cl.p, cl.T);
  const sky = c.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, "#03050b"); sky.addColorStop(1, P.planet === "venus" ? "#5a4320" : P.planet === "mars" ? "#2a1a14" : "#14284a"); c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // greenhouse gas molecules: more of them for a thicker blanket
  const want = Math.round(Math.min(160, 14 * Math.log(1 + 6 * tau) + (tau > 0 ? 4 : 0)));
  while (mol.length < want) mol.push({ x: Math.random() * w, y: top + LH * 0.5 + Math.random() * (ground - top - LH), kind: Math.random() < 0.55 ? "co2" : Math.random() < 0.7 ? "h2o" : "ch4", glow: 0, ph: Math.random() * 6 }); mol.length = want;
  for (const m of mol) { m.ph += dt * 3; const j = m.glow > 0 ? 2.5 * Math.sin(m.ph * 9) : 0; m.glow = Math.max(0, m.glow - dt); const x = m.x + j, y = m.y + Math.sin(m.ph) * 2;
    c.globalAlpha = 0.85; if (m.glow > 0) { c.fillStyle = "rgba(255,120,80,0.35)"; c.beginPath(); c.arc(x, y, 9, 0, 6.3); c.fill(); }
    if (m.kind === "co2") { c.fillStyle = "#e05a5a"; c.beginPath(); c.arc(x - 5, y, 2.6, 0, 6.3); c.arc(x + 5, y, 2.6, 0, 6.3); c.fill(); c.fillStyle = "#333b4a"; c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); }
    else if (m.kind === "h2o") { c.fillStyle = "#e0e6ee"; c.beginPath(); c.arc(x - 4, y + 3, 2, 0, 6.3); c.arc(x + 4, y + 3, 2, 0, 6.3); c.fill(); c.fillStyle = "#e05a5a"; c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); }
    else { c.fillStyle = "#e0e6ee"; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + 4.5 * Math.cos(k * 1.57 + 0.6), y + 4.5 * Math.sin(k * 1.57 + 0.6), 1.8, 0, 6.3); c.fill(); } c.fillStyle = "#333b4a"; c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); }
  } c.globalAlpha = 1;
  // a cloud/haze band that reflects some sunlight
  const hz = K.clamp((cl.p.a + cl.volc - 0.1) * 1.4, 0, 0.9); c.fillStyle = `rgba(220,226,236,${0.12 + 0.35 * hz})`; for (let x = 0; x < w; x += 70) { c.beginPath(); c.ellipse(x + 35 + 10 * Math.sin(x), top + LH * 0.6, 40, 8 + 6 * hz, 0, 0, 6.3); c.fill(); }
  if (cl.volc > 0.002) { c.fillStyle = `rgba(200,190,150,${Math.min(0.4, cl.volc * 25)})`; c.fillRect(0, top + LH * 0.35, w, LH * 0.5); }
  // packets: sunlight (short wavelength, straight) and infrared (long wavelength, wavy)
  for (const q of pk) { if (q.kind === "sun") { c.strokeStyle = q.refl ? "rgba(255,240,170,0.7)" : "#ffd84d"; c.lineWidth = 2; c.beginPath(); c.moveTo(q.x, q.y - Math.sign(q.vy) * 8); c.lineTo(q.x, q.y); c.stroke(); }
    else { c.strokeStyle = q.glow > 0 ? "#ffb08a" : "#ff5d4d"; c.lineWidth = 2; c.beginPath(); for (let k = 0; k <= 8; k++) { const yy = q.y - Math.sign(q.vy) * k * 1.4; c.lineTo(q.x + 2.5 * Math.sin(k * 1.4 + q.y * 0.3), yy); } c.stroke(); } }
  // the ground, coloured by temperature
  const Tc = C(cl.T), warm = K.clamp((Tc + 30) / 60, 0, 1);
  c.fillStyle = P.planet === "venus" ? "#8a5a2a" : P.planet === "mars" ? "#9a4a2a" : cl.p.a > 0.5 ? "#d8e6f2" : `rgb(${Math.round(18 + 40 * warm)},${Math.round(60 + 30 * warm)},${Math.round(150 - 40 * warm)})`; c.fillRect(0, ground, w, h - ground);
  if (P.planet === "earth" && cl.p.a <= 0.5) { c.fillStyle = `rgb(${Math.round(50 + 110 * warm)},${Math.round(120 - 20 * warm)},${Math.round(60 - 20 * warm)})`; c.beginPath(); c.moveTo(w * 0.35, ground); c.quadraticCurveTo(w * 0.5, ground - 14, w * 0.68, ground); c.lineTo(w * 0.72, h); c.lineTo(w * 0.3, h); c.fill(); }
  c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(PLANET[cl.p.planet].name + (P.hist ? "  ·  " + Math.floor(yr) : ""), 14, 24);
  c.font = "11.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText("space", 14, top + 4); c.textAlign = "right"; c.fillText("yellow: sunlight · red: infrared · molecules: CO₂, water vapour, methane", w - 14, ground - 8);
  c.textAlign = "left"; c.fillStyle = cl.p.a > 0.5 ? "#0b0f18" : "#fff"; c.font = "700 22px Segoe UI,sans-serif"; c.fillText(Tc.toFixed(1) + " °C", 16, ground + 40); c.font = "12px Segoe UI,sans-serif"; c.fillText("average surface temperature", 16, ground + 58);
  // energy budget bars on the right
  const inn = absorbed(Object.assign({}, cl.p, { aer: cl.volc })), out = olr(cl.p, cl.T), sc = 150 / Math.max(240, inn, out), bx = w - 130, by = ground + 52;
  c.font = "11px Segoe UI,sans-serif"; for (const [v, col, lab, k] of [[inn, "#ffd84d", "in", 0], [out, "#ff5d4d", "out", 1]]) { c.fillStyle = col; c.fillRect(bx + k * 52, by - v * sc * 0.25, 38, v * sc * 0.25); c.fillStyle = cl.p.a > 0.5 ? "#0b0f18" : "#fff"; c.fillText(lab + " " + v.toFixed(0), bx + k * 52, by + 12); }
}

const chT = K.chart(ui.dock, { title: "Temperature", xLabel: "years", yLabel: "°C" });
const chE = K.chart(ui.dock, { title: "Energy in and out against temperature", xLabel: "surface temperature (°C)", yLabel: "W/m²", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; let left = dt * speed;
  while (left > 0) { const h = Math.min(left, 0.05); left -= h;
    if (P.hist) { if (yr >= 2100) { ui.setPlaying(false); break; } cl.p.co2 = co2At(yr, P.scen); cl.p.aer = P.aerOn ? aerAt(yr, P.scen) : 0; yr += h; } else yr += h;
    cl.step(h); }
  if (!tlog.length || yr - tlog[tlog.length - 1][0] >= Math.max(0.1, speed / 30)) { tlog.push([yr, P.hist ? cl.T - startT : C(cl.T)]); if (tlog.length > 1500) tlog.shift(); }
  if (P.hist) { ctl.co2.set(Math.log(cl.p.co2)); P.co2 = cl.p.co2; }
  updatePackets(dt);
}, dt => {
  draw(dt || 0.016); if (frame++ % 6) return;
  const eq = balance(Object.assign({}, cl.p)), base = balance(Object.assign({}, cl.p, { planet: "none", co2: 280 })), inn = absorbed(Object.assign({}, cl.p, { aer: cl.volc })), out = olr(cl.p, cl.T);
  const series = [];
  if (P.hist) {
    for (const rr of runs) series.push({ pts: rr.pts, color: SCEN[rr.s].col, width: 1.4, label: SCEN[rr.s].name });
    series.push({ pts: OBS, type: "dots", color: "#fff", r: 3.5, label: "observed (decade averages)" }); series.push({ pts: tlog, color: K.cssVar("--s2"), width: 2.4, label: "this run (warming since 1850–1900)" });
    chT.draw(series, { xMin: 1850, xMax: 2100, hlines: [{ y: 1.5, color: "#ffffff55", label: "1.5 °C" }, { y: 2, color: "#ffffff33", label: "2 °C" }] }); chT.opts.yLabel = "warming (°C)";
  } else {
    chT.opts.yLabel = "°C"; chT.draw([{ pts: tlog, color: K.cssVar("--s2"), width: 2.4, label: "surface temperature" }], { xMin: Math.max(0, yr - 200), xMax: Math.max(50, yr), hlines: [{ y: C(eq), color: "#ffffff66", label: "balance " + C(eq).toFixed(1) + " °C" }] });
  }
  // energy in is flat; energy out rises with temperature: the balance is where they cross
  const lo = Math.min(C(eq), C(cl.T)) - 40, hi = Math.max(C(eq), C(cl.T)) + 40, pin = [], pout = []; for (let k = 0; k <= 60; k++) { const Tc = lo + (hi - lo) * k / 60; pin.push([Tc, inn]); pout.push([Tc, olr(cl.p, Tc + 273.15)]); }
  chE.draw([{ pts: pin, color: "#ffd84d", width: 2, label: "energy in" }, { pts: pout, color: "#ff5d4d", width: 2, label: "energy out" }, { pts: [[C(cl.T), out]], type: "dots", color: "#fff", r: 5 }], { xMin: lo, xMax: hi, vlines: [{ x: C(eq), color: "#ffffff66", label: "balance" }] });
  read.set("T", C(cl.T).toFixed(1) + " °C"); read.set("eq", C(eq).toFixed(1) + " °C"); read.set("gh", (eq - base).toFixed(0) + " °C");
  read.set("in", inn.toFixed(0) + " W/m²"); read.set("out", out.toFixed(0) + " W/m²"); read.set("imb", (inn - out >= 0 ? "+" : "") + (inn - out).toFixed(2) + " W/m²");
  ui.hud(`<b style="font-size:15px">${C(cl.T).toFixed(1)} °C</b><br>${P.hist ? Math.floor(yr) + " · CO₂ " + Math.round(cl.p.co2) + " ppm<br>" : ""}${Math.abs(inn - out) > 0.15 ? (inn > out ? "<span style='color:#ff8a70'>gaining energy: warming</span>" : "<span style='color:#6fb1ff'>losing energy: cooling</span>") : "in balance"}`);
});
preset("pre");
ui.tip("Yellow sunlight passes through the air; red infrared from the ground is caught by greenhouse gases and some is sent back down", 8000);
