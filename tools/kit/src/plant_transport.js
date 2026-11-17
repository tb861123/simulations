/* =====================================================================
   PLANT TRANSPORT AND RESPONSES
   • XYLEM carries water and mineral ions from the roots to the leaves.
     Water evaporates from the leaves and diffuses out through the
     STOMATA: TRANSPIRATION. This pulls a continuous column of water up
     the xylem (cohesion–tension at A level).
   • Transpiration is faster in bright light (stomata open), low humidity
     (steeper diffusion gradient), wind (moist air blown away) and warmth.
   • PHLOEM carries sucrose and amino acids from the leaves (sources) to
     where they are needed (sinks): growing tips, flowers, roots.
   • A POTOMETER measures water uptake by a leafy shoot: a bubble moves
     along a capillary tube.
   • TROPISMS: shoots grow towards light (phototropism) and away from
     gravity; roots grow towards gravity (geotropism). AUXIN moves to the
     shaded (or lower) side and changes the growth rate there.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const es = T => 0.6108 * Math.exp(17.27 * T / (T + 237.3));                   // saturation vapour pressure (kPa)
// how open the stomata are (0.29 in the dark to 1 in full light, as a fraction of fully open)
const stoma = L => 0.29 + 0.71 * L / (L + 6);
// transpiration of the potometer shoot (mm of bubble movement per minute in a 0.5 mm radius capillary)
// light L (%), humidity RH (0–1), wind (m/s), temperature (°C)
const windF = w => (1 + 1.2 * w / (w + 0.35));
const E = (L, RH, w, T) => 36.9 * (1 - RH) * stoma(L) / stoma(80) * windF(w) / windF(0) * es(T) / es(20);
// a measurement: shoots differ (SD 13%), the bubble is timed (reading the scale ±0.5 mm over 5 minutes)
const measure = (L, RH, w, T, r, rad = 0.5) => E(L, RH, w, T) * (0.5 / rad) ** 2 * (1 + 0.13 * r.gauss()) + 0.1 * r.gauss();
// phototropism: the bend after 4 hours of light from one side (degrees)
const bend = (L, hours = 4) => 34 * L / (L + 15) * (1 - Math.exp(-hours / 2.5));
// a day: sun, temperature and humidity follow the clock
function weather(hr) { const sun = Math.max(0, Math.sin(Math.PI * (hr - 6) / 12)); return { L: 100 * sun, T: 14 + 10 * Math.max(0, Math.sin(Math.PI * (hr - 8) / 14)), RH: 0.85 - 0.45 * Math.max(0, Math.sin(Math.PI * (hr - 8) / 14)) }; }

// ---------------- The page ----------------
const P = { view: "plant", L: 80, RH: 0.5, wind: 0, T: 20, rad: 0.5, soil: 1, lightSide: 60, gravity: true, hours: 4 };
let hr = 6, bubble = 0, rnd = K.rng(Date.now() % 9973 + 13), readings = [], tropT = 0, dayLog = [];
const ui = K.app({
  title: "Plant Transport and Responses", subject: "Biology",
  blurb: "Xylem and phloem, transpiration and the potometer, stomata, and how auxin makes shoots and roots bend",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(h) transport in flowering plants: phloem (sucrose and amino acids), xylem (water and mineral ions), root hair cells, transpiration and the effect of humidity, wind, temperature and light; the practical on transpiration from a leafy shoot; 2(g) stomata; 2(j) geotropism and phototropism, auxin.", adv: "OCR A level Biology A (H420) 3.1.3 transport in plants: xylem and phloem structure, transpiration, the potometer (PAG5), apoplast and symplast, cohesion–tension, xerophytes and hydrophytes, translocation; 5.1.5 plant responses: auxin, gibberellins, phototropism and geotropism (PAG11)." } },
  missions: [
    { title: "A day in the life of a plant", q: "Watch the sunflower from dawn to dusk. When is transpiration fastest? Why does water uptake by the roots lag behind?", hint: "Fastest in the early afternoon: bright light (stomata open), warm and dry air. The leaves lose water first; the tension it creates then pulls water up the stem and into the roots, so uptake lags.", setup() { set({ view: "plant" }); } },
    { title: "Light and the potometer", q: "Use the potometer. Measure the bubble's speed in the dark and in bright light. Why does light matter?", hint: "In the dark the stomata close, so little water vapour escapes (about 5 mm/min); in bright light they open (about 18 mm/min). Above about 40% light the stomata are fully open, so more light adds little.", setup() { set({ view: "pot", L: 0 }); } },
    { title: "Humidity", q: "Change the humidity from 20% to 95%. What happens to transpiration? Why?", hint: "Humid air already holds lots of water vapour, so the diffusion gradient from the leaf is shallow: transpiration falls in a straight line as humidity rises.", setup() { set({ view: "pot", RH: 0.2 }); } },
    { title: "Wind", q: "Turn on a fan. How does transpiration change from still air to a light breeze to a strong wind?", hint: "Wind blows away the layer of moist air around the leaf, keeping the gradient steep: a big rise at first, then it levels off.", setup() { set({ view: "pot", wind: 1 }); } },
    { title: "Phloem: sources and sinks", q: "Watch the orange sucrose in the phloem. Where does it go? Why can it move up and down?", hint: "From the leaves (sources) to the flower and growing tip above and to the roots below (sinks). Unlike xylem, phloem flow can go both ways.", setup() { set({ view: "plant" }); } },
    { title: "Phototropism", q: "Shine light from one side on a seedling for 4 hours. Which way does it bend? What does auxin do?", hint: "Towards the light. Auxin moves to the shaded side, where it makes cells elongate more, so the shoot bends towards the light: more light for photosynthesis.", setup() { set({ view: "trop", lightSide: 60 }); } },
    { title: "Geotropism", q: "Lay the seedling on its side in the dark. Which way do the root and shoot grow?", hint: "Shoot up (negative geotropism), root down (positive geotropism). Auxin collects on the lower side: in shoots it speeds up elongation, in roots it slows it.", setup() { set({ view: "trop", lightSide: 0, gravity: true }); } },
    { lvl: "adv", title: "Cohesion–tension", q: "In the leaf view, follow the water from the xylem to the air. What pulls the water up?", hint: "Water evaporates from the spongy mesophyll cell walls and diffuses out through the stomata. This lowers the water potential in the leaf; water moves in from the xylem; hydrogen bonds hold the water molecules together (cohesion) and to the xylem walls (adhesion), so the whole column is pulled up under tension.", setup() { set({ view: "leaf" }); } },
    { lvl: "adv", title: "Capillary radius (PAG5)", q: "Change the capillary radius of the potometer. How does the bubble speed depend on it?", hint: "Speed ∝ 1/r² (the same volume per minute spread over a cross-section πr²): halve the radius, four times the speed. Convert speed to volume: rate = speed × πr².", setup() { set({ view: "pot", rad: 0.25 }); } }
  ],
  batch: [
    { title: "Light and transpiration", question: "How does the bubble speed depend on light intensity?", how: "Potometer (0.5 mm radius), 50% humidity, still air, 20 °C; shoots differ by about 13%.", xLabel: "light (% of full sun)", yLabel: "bubble speed (mm/min)", xs: [0, 20, 40, 60, 80, 100], reps: 10, yMin: 0, theory: L => E(L, 0.5, 0, 20), theoryLabel: "stomatal model", run: (L, r) => measure(L, 0.5, 0, 20, r), note: "A steep rise as the stomata open, then a plateau once they are fully open." },
    { title: "Humidity and transpiration", question: "How does the bubble speed depend on humidity?", how: "Light 80%, still air, 20 °C.", xLabel: "relative humidity (%)", yLabel: "bubble speed (mm/min)", xs: [20, 35, 50, 65, 80, 95], reps: 10, yMin: 0, theory: RH => E(80, RH / 100, 0, 20), theoryLabel: "∝ (1 − humidity)", run: (RH, r) => measure(80, RH / 100, 0, 20, r), note: "A straight line down: the diffusion gradient is proportional to how far the air is from saturation." },
    { title: "Wind and transpiration", question: "How does the bubble speed depend on wind speed?", how: "Light 80%, humidity 50%, 20 °C.", xLabel: "wind speed (m/s)", yLabel: "bubble speed (mm/min)", xs: [0, 1, 2, 3, 4], reps: 10, yMin: 0, theory: w => E(80, 0.5, w, 20), theoryLabel: "boundary-layer model", run: (w, r) => measure(80, 0.5, w, 20, r), note: "A big jump from still air to a breeze, then smaller gains: the moist layer is already mostly blown away." },
    { title: "How precise is one potometer result?", question: "If 500 classes each measure one shoot under the same conditions, what bubble speeds do they get?", how: "Light 80%, humidity 50%, still air, 20 °C.", yLabel: "bubble speed (mm/min)", reps: 500, bins: 24, theory: E(80, 0.5, 0, 20), theoryLabel: "model", run: (x, r) => measure(80, 0.5, 0, 20, r), note: "Mostly within about ±15%: shoots differ in leaf area and stomata, so repeat with several shoots or measure leaf area." },
    { title: "Capillary radius and bubble speed", question: "How does the bubble speed depend on the radius of the capillary?", how: "Same shoot and conditions; plotted on log scales.", xLabel: "log₁₀(radius / mm)", yLabel: "log₁₀(speed / mm min⁻¹)", xs: [Math.log10(0.2), Math.log10(0.3), Math.log10(0.5), Math.log10(0.7), Math.log10(1)], reps: 5, fit: true, theory: x => Math.log10(E(80, 0.5, 0, 20) * (0.5 / 10 ** x) ** 2), theoryLabel: "gradient −2", run: (x, r) => Math.log10(Math.max(0.01, measure(80, 0.5, 0, 20, r, 10 ** x))), note: "A straight line of gradient −2: speed ∝ 1/r², because the same volume of water moves through a cross-section of area πr²." },
    { title: "Phototropism: brighter light, bigger bend?", question: "How far does a seedling bend in 4 hours with light of different intensities from one side?", how: "Seedlings differ by about 15%.", xLabel: "light from one side (%)", yLabel: "bend (degrees)", xs: [0, 5, 10, 20, 40, 60, 100], reps: 8, yMin: 0, theory: L => bend(L), theoryLabel: "auxin model", run: (L, r) => Math.max(0, bend(L) * (1 + 0.15 * r.gauss())), note: "Even dim one-sided light causes a bend; brighter light bends more, up to a limit." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2(h)", text: "Xylem transports water and mineral ions from the roots to the rest of the plant (one way, up). Phloem transports sucrose and amino acids from leaves to growing and storage regions (both ways)." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Root hair cells have a large surface area for absorbing water (by osmosis) and mineral ions (by active transport)." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Transpiration: evaporation of water from leaves through the stomata. Faster with more light, higher temperature, more wind and lower humidity." },
      { lvl: "std", tag: "4BI1 2(j)", text: "Phototropism: shoots grow towards light. Geotropism: roots grow towards gravity, shoots away. Auxin collects on the shaded or lower side." },
      { lvl: "adv", tag: "H420 3.1.3", text: "Cohesion–tension: evaporation lowers water potential in the leaf; water is pulled up the xylem as a continuous column held by cohesion (hydrogen bonds) and adhesion. Apoplast and symplast routes across the root; the Casparian strip (enrichment)." },
      { lvl: "adv", tag: "H420 3.1.3", text: "Translocation: sucrose actively loaded into phloem sieve tubes at the source (companion cells, H⁺ co-transport), mass flow to sinks. Xerophytes: thick cuticle, sunken stomata, rolled leaves, hairs." },
      { lvl: "adv", tag: "H420 5.1.5", text: "Auxin promotes cell elongation in shoots (inhibits it in roots); gibberellins cause stem elongation and seed germination; abscisic acid closes stomata (enrichment)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why transpiration is faster on a warm, windy day.", ans: "<ul><li>warmth: water molecules have more energy, so evaporate and diffuse faster</li><li>wind: moist air is blown away from the leaf surface</li><li>so the concentration (diffusion) gradient of water vapour stays steep</li></ul>" },
      { lvl: "std", marks: 2, q: () => `A potometer bubble moves ${E(P.L, P.RH, P.wind, P.T).toFixed(1)} mm in 1 minute in a capillary of radius 0.5 mm. Calculate the volume of water taken up per minute (volume = πr² × distance).`, ans: () => `<ul><li>V = π × 0.5² × ${E(P.L, P.RH, P.wind, P.T).toFixed(1)}</li><li>= ${(Math.PI * 0.25 * E(P.L, P.RH, P.wind, P.T)).toFixed(1)} mm³ per minute</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain how a plant shoot grows towards light.", ans: "<ul><li>auxin moves to the shaded side of the shoot tip</li><li>auxin makes cells on the shaded side elongate more</li><li>so the shoot bends towards the light</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how water moves from the roots to the leaves of a tall tree.", ans: "<ul><li>water evaporates from mesophyll cells and diffuses out of the stomata (transpiration)</li><li>water moves from the xylem into the leaf cells down a water potential gradient</li><li>cohesion between water molecules (hydrogen bonds) pulls the whole column up: tension</li><li>adhesion to the xylem walls; lignin stops the vessels collapsing</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Transpiration (as bubble speed in a 0.5 mm radius capillary) = 36.9 mm/min × (1 − humidity) × stomatal opening × wind factor × temperature factor. Stomatal opening = 0.29 + 0.71 L/(L + 6) (closed in the dark, fully open above about 40% light). Wind factor 1 + 1.2w/(w + 0.35). Temperature: in proportion to the saturation vapour pressure.</li>
<li>Potometer: speed ∝ 1/r²; each shoot differs (SD 13%) and the scale is read to ±0.1 mm/min.</li>
<li>Whole plant: sun, temperature and humidity follow the time of day; uptake by the roots follows transpiration with a lag of about an hour; dry soil closes the stomata and the plant wilts.</li>
<li>Tropisms: bend after t hours = 34° × L/(L + 15) × (1 − e^(−t/2.5)); gravity bends a horizontal root down and the shoot up.</li></ul>
<h3>Left out</h3>
<ul><li>Leaf area and the number of stomata, root pressure, guttation details, the potometer's leaks and air locks, the real chemistry of auxin transport.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/plant-transport.html">original/plant-transport.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "plant", options: [["plant", "🌻 Whole plant"], ["pot", "🧪 Potometer"], ["leaf", "🍃 Leaf (A level)"], ["trop", "🌱 Tropisms"]], on: v => P.view = v });
g = ui.group("Conditions (potometer and leaf)");
ctl.L = K.slider(g, { label: "Light", min: 0, max: 100, step: 1, value: 80, unit: "%", on: v => P.L = v });
ctl.RH = K.slider(g, { label: "Humidity", min: 0.1, max: 0.98, step: 0.01, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.RH = v });
ctl.wind = K.slider(g, { label: "Wind", min: 0, max: 5, step: 0.1, value: 0, unit: "m/s", on: v => P.wind = v });
ctl.T = K.slider(g, { label: "Temperature", min: 5, max: 35, step: 1, value: 20, unit: "°C", on: v => P.T = v });
ctl.rad = K.slider(g, { label: "Capillary radius", min: 0.2, max: 1, step: 0.05, value: 0.5, unit: "mm", on: v => P.rad = v });
let rr = K.row(g); K.btn(rr, "📏 Measure (5 min)", () => { readings.push({ L: P.L, RH: P.RH, w: P.wind, T: P.T, v: measure(P.L, P.RH, P.wind, P.T, rnd, P.rad) }); }, "primary"); K.btn(rr, "clear", () => readings = []);
g = ui.group("Whole plant");
ctl.soil = K.slider(g, { label: "Soil water", min: 0.1, max: 1, step: 0.05, value: 1, fmt: v => v < 0.35 ? "dry" : v < 0.7 ? "moist" : "wet", on: v => P.soil = v });
g = ui.group("Tropisms");
ctl.lightSide = K.slider(g, { label: "Light from the right", min: 0, max: 100, step: 1, value: 60, unit: "%", on: v => { P.lightSide = v; tropT = 0; } });
ctl.gravity = K.toggle(g, { label: "Seedling laid on its side", value: false, on: v => { P.gravity = v; tropT = 0; } });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) { Object.assign(P, { view: "plant", L: 80, RH: 0.5, wind: 0, T: 20, rad: 0.5, soil: 1, lightSide: 60, gravity: false }, o); for (const k of ["L", "RH", "wind", "T", "rad", "soil", "lightSide"]) ctl[k].set(P[k]); ctl.view.set(P.view); ctl.gravity.set(P.gravity); hr = 6; tropT = 0; dayLog = []; readings = []; bubble = 0; }
// whole-plant transpiration through the day (water stress closes the stomata in dry soil)
function plantRate(h) { const w = weather(h), dry = Math.min(1, P.soil / 0.4); return E(w.L, w.RH, 0.5, w.T) * dry; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw(t) {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv";
  if (P.view === "plant") {
    const W = weather(hr % 24), sun = W.L / 100, sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, `rgb(${20 + 80 * sun},${30 + 120 * sun},${60 + 160 * sun})`); sky.addColorStop(1, "#1a1408"); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    const gy = h * 0.66; c.fillStyle = P.soil < 0.35 ? "#8a6a3a" : "#4a3418"; c.fillRect(0, gy, w, h - gy);
    if (sun > 0) { c.fillStyle = "#ffe08a"; c.beginPath(); c.arc(w * (0.1 + 0.8 * ((hr % 24) - 6) / 12), 60 + 80 * (1 - sun), 22, 0, 6.3); c.fill(); }
    const cx = w * 0.35, wilt = P.soil < 0.35 ? 0.6 : 0, rate = plantRate(hr % 24);
    // stem with xylem (blue, up) and phloem (orange, both ways)
    c.strokeStyle = "#3f8f3f"; c.lineWidth = 12; c.beginPath(); c.moveTo(cx, gy); c.quadraticCurveTo(cx + wilt * 40, gy - 150, cx + wilt * 80, gy - 240 + wilt * 60); c.stroke(); c.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const f = ((t * rate / 15 + i / 12) % 1); c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(cx - 3 + wilt * 40 * f * f, gy - f * (240 - wilt * 60), 2.5, 0, 6.3); c.fill(); const f2 = ((t * 0.4 + i / 12) % 1); c.fillStyle = "#ffb454"; c.beginPath(); c.arc(cx + 3 + wilt * 40 * (1 - f2) ** 2, gy - (i % 2 ? f2 : 1 - f2) * (200 - wilt * 60) * 0.9 - 20, 2.5, 0, 6.3); c.fill(); }
    // leaves, flower and roots
    for (const [dx, dy, s] of [[-1, 90, 1], [1, 140, 1], [-1, 190, 0.8]]) { c.fillStyle = "#4caf50"; c.beginPath(); c.ellipse(cx + dx * 42 + wilt * 30, gy - dy + wilt * dy * 0.2, 40 * s, 14 * s, dx * (0.35 + wilt), 0, 6.3); c.fill(); }
    c.fillStyle = "#ffd23a"; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.beginPath(); c.ellipse(cx + wilt * 80 + 22 * Math.cos(a), gy - 250 + wilt * 60 + 22 * Math.sin(a), 12, 5, a, 0, 6.3); c.fill(); } c.fillStyle = "#6a4020"; c.beginPath(); c.arc(cx + wilt * 80, gy - 250 + wilt * 60, 14, 0, 6.3); c.fill();
    c.strokeStyle = "#d8c8a0"; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(cx, gy); c.quadraticCurveTo(cx + (i - 4) * 18, gy + 40, cx + (i - 4) * 30, gy + 90 + (i % 3) * 15); c.stroke(); }
    // water vapour leaving the leaves
    for (let i = 0; i < Math.round(rate); i++) { const f = ((t * 0.6 + i * 0.137) % 1); c.fillStyle = `rgba(200,230,255,${0.6 * (1 - f)})`; c.beginPath(); c.arc(cx + (i % 2 ? 60 : -60) + Math.sin(i) * 20, gy - 120 - f * 80, 2, 0, 6.3); c.fill(); }
    TX(c, `${String(Math.floor(hr % 24)).padStart(2, "0")}:${String(Math.floor((hr % 1) * 60)).padStart(2, "0")} · light ${W.L.toFixed(0)}% · ${W.T.toFixed(0)} °C · humidity ${(W.RH * 100).toFixed(0)}%`, 14, 24, "#eef2f8", "left", "600 13.5px");
    TX(c, "blue: water in the xylem (up) · orange: sucrose in the phloem (to the flower and the roots) · white: water vapour", 14, h - 12, "#cfd8ea", "left", "11px");
    if (P.soil < 0.35) TX(c, "Dry soil: the stomata close and the plant wilts", 14, 46, "#ff8a70", "left", "600 12.5px");
  } else if (P.view === "pot") {
    c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const v = E(P.L, P.RH, P.wind, P.T) * (0.5 / P.rad) ** 2;
    // the shoot in a sealed tube, the capillary with a bubble and a scale
    const sx = w * 0.18, sy = h * 0.5; c.strokeStyle = "#3f8f3f"; c.lineWidth = 6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, sy - 160); c.stroke(); c.lineWidth = 1; for (const [dx, dy] of [[-1, 60], [1, 100], [-1, 140]]) { c.fillStyle = "#4caf50"; c.beginPath(); c.ellipse(sx + dx * 34, sy - dy, 34, 11, dx * 0.4, 0, 6.3); c.fill(); }
    c.fillStyle = "rgba(160,200,255,.3)"; c.fillRect(sx - 14, sy, 28, 70); c.fillRect(sx + 14, sy + 52, w * 0.62, Math.max(3, P.rad * 6)); c.strokeStyle = "rgba(255,255,255,.5)"; c.strokeRect(sx + 14, sy + 52, w * 0.62, Math.max(3, P.rad * 6));
    for (let mm = 0; mm <= 200; mm += 10) { const x = sx + 30 + mm / 200 * (w * 0.58); c.strokeStyle = "#aab6cc"; c.beginPath(); c.moveTo(x, sy + 70); c.lineTo(x, sy + (mm % 50 ? 76 : 82)); c.stroke(); if (!(mm % 50)) TX(c, mm + " mm", x, sy + 96, "#aab6cc", "center", "10px"); }
    const bx = sx + 30 + (bubble % 200) / 200 * (w * 0.58); c.fillStyle = "#fff"; c.beginPath(); c.ellipse(bx, sy + 52 + Math.max(3, P.rad * 6) / 2, 6, Math.max(2, P.rad * 3), 0, 0, 6.3); c.fill(); TX(c, "air bubble", bx, sy + 40, "#fff", "center", "11px");
    if (P.wind > 0) for (let i = 0; i < 6; i++) { const x = ((t * 80 * P.wind + i * 60) % (w * 0.3)); c.strokeStyle = "rgba(200,230,255,.4)"; c.beginPath(); c.moveTo(sx - 120 + x, sy - 140 + i * 18); c.lineTo(sx - 100 + x, sy - 140 + i * 18); c.stroke(); }
    TX(c, `Potometer: the bubble moves ${v.toFixed(1)} mm per minute (capillary radius ${P.rad} mm) → water uptake ${(Math.PI * P.rad ** 2 * v).toFixed(1)} mm³/min`, 14, 28, "#eef2f8", "left", "600 13.5px");
    TX(c, `stomata ${(stoma(P.L) * 100).toFixed(0)}% open · humidity ${(P.RH * 100).toFixed(0)}% · wind ${P.wind} m/s · ${P.T} °C`, 14, 50, "#aab6cc", "left", "12.5px");
    TX(c, "Set up under water, cut the shoot at an angle, seal with petroleum jelly, let it settle before timing.", 14, h - 14, "#7d8aa5", "left", "11px");
  } else if (P.view === "leaf") {
    c.fillStyle = "#0b1610"; c.fillRect(0, 0, w, h); const v = E(P.L, P.RH, P.wind, P.T), op = stoma(P.L);
    c.fillStyle = "#c8e6a0"; c.fillRect(40, 40, w - 80, 14); TX(c, "waxy cuticle and upper epidermis", w / 2, 36, "#c8e6a0", "center", "11px");
    for (let i = 0; i < 10; i++) { c.fillStyle = "#4caf50"; c.fillRect(50 + i * (w - 100) / 10, 58, (w - 100) / 10 - 6, 70); } TX(c, "palisade mesophyll", 52, 146, "#9be09b", "left", "11px");
    for (let i = 0; i < 14; i++) { c.fillStyle = "#3e8e3e"; c.beginPath(); c.ellipse(70 + i * (w - 140) / 13, 200 + (i % 2) * 30, 26, 18, 0, 0, 6.3); c.fill(); } TX(c, "spongy mesophyll: water evaporates from the cell walls into the air spaces", 52, 268, "#9be09b", "left", "11px");
    c.fillStyle = "#c8e6a0"; c.fillRect(40, 290, w - 80, 12); const sx = w * 0.6; c.fillStyle = "#0b1610"; c.fillRect(sx - 10 * op, 288, 20 * op, 16); c.fillStyle = "#7aa83a"; c.beginPath(); c.ellipse(sx - 10 * op - 7, 296, 8, 10, 0, 0, 6.3); c.ellipse(sx + 10 * op + 7, 296, 8, 10, 0, 0, 6.3); c.fill(); TX(c, `stoma ${(op * 100).toFixed(0)}% open (guard cells)`, sx, 324, "#cfd8ea", "center", "11px");
    for (let i = 0; i < Math.round(v / 2); i++) { const f = ((t * 0.5 + i * 0.11) % 1); c.fillStyle = "rgba(160,210,255,.8)"; c.beginPath(); c.arc(sx + Math.sin(i * 3) * 30 * f, 240 + f * 120, 2.5, 0, 6.3); c.fill(); }
    c.fillStyle = "#3a6aaa"; c.fillRect(w * 0.2, 150, 40, 120); TX(c, "xylem", w * 0.2 + 20, 145, "#7fb8ff", "center", "11px"); for (let i = 0; i < 6; i++) { const f = ((t * 0.3 + i / 6) % 1); c.fillStyle = "#9fd0ff"; c.beginPath(); c.arc(w * 0.2 + 20, 270 - f * 110, 3, 0, 6.3); c.fill(); }
    TX(c, "Evaporation lowers the water potential in the leaf; water is pulled from the xylem (cohesion–tension)", 14, h - 30, adv ? "#c9a0ff" : "#7d8aa5", "left", "12px"); if (!adv) TX(c, "Cohesion–tension is A level: switch to Advanced", 14, h - 10, "#8fa0bf", "left", "11px");
  } else {
    c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const cx = w * 0.4, gy = h * 0.6, ang = (P.gravity ? 0 : bend(P.lightSide, tropT)) * Math.PI / 180, gAng = P.gravity ? Math.min(85, tropT * 20) * Math.PI / 180 : 0;
    if (P.lightSide > 0) { const lg = c.createLinearGradient(w, 0, cx, 0); lg.addColorStop(0, `rgba(255,230,140,${0.4 * P.lightSide / 100})`); lg.addColorStop(1, "rgba(255,230,140,0)"); c.fillStyle = lg; c.fillRect(cx, 0, w - cx, h); TX(c, "💡 light", w - 70, 40, "#ffe08a", "left", "14px"); }
    c.fillStyle = "#4a3418"; c.fillRect(0, gy, w, h - gy);
    // shoot: bends towards the light (or up, if laid sideways); auxin (purple dots) collects on the shaded / lower side
    c.strokeStyle = "#4caf50"; c.lineWidth = 8; c.beginPath(); let x = cx, y = gy, a = P.gravity ? Math.PI / 2 - gAng : 0; c.moveTo(x, y);
    for (let i = 1; i <= 20; i++) { const k = i / 20; const aa = P.gravity ? Math.PI / 2 - gAng * k : ang * k; x += 8 * Math.sin(aa); y -= 8 * Math.cos(aa); c.lineTo(x, y); }
    c.stroke(); c.lineWidth = 1; c.fillStyle = "#4caf50"; c.beginPath(); c.ellipse(x, y, 10, 5, 0, 0, 6.3); c.fill();
    for (let i = 0; i < 8; i++) { c.fillStyle = "#c9a0ff"; c.beginPath(); c.arc(x - 8 - (i % 3) * 3, y + 8 + i * 4, 2.5, 0, 6.3); c.fill(); }
    // root
    c.strokeStyle = "#e8d8b0"; c.lineWidth = 5; c.beginPath(); let rx = cx, ry = gy; c.moveTo(rx, ry); for (let i = 1; i <= 15; i++) { const k = i / 15; const aa = P.gravity ? Math.PI / 2 * (1 - k * Math.min(1, tropT / 4)) : 0; rx += 7 * Math.sin(aa); ry += 7 * Math.cos(aa); c.lineTo(rx, ry); } c.stroke(); c.lineWidth = 1;
    TX(c, P.gravity ? `Laid on its side for ${tropT.toFixed(1)} h: shoot grows up (negative geotropism), root down (positive geotropism)` : `Light from one side for ${tropT.toFixed(1)} h: bend ${bend(P.lightSide, tropT).toFixed(0)}° towards the light (phototropism)`, 14, 28, "#eef2f8", "left", "600 13px");
    TX(c, "purple: auxin, on the shaded / lower side", 14, h - 12, "#c9a0ff", "left", "11.5px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "plant") {
    const pts = [], up = []; for (let h2 = 0; h2 <= 24; h2 += 0.25) { pts.push([h2, plantRate(h2)]); up.push([h2, plantRate(h2 - 1)]); }
    chA.opts.title = "Transpiration and uptake through the day"; chA.opts.xLabel = "time of day (h)"; chA.opts.yLabel = "rate (relative)"; chA.draw([{ pts, color: "#5ad1ff", label: "transpiration" }, { pts: up, color: "#ffd166", dash: [5, 4], label: "uptake by roots" }], { xMin: 0, xMax: 24, yMin: 0, vlines: [{ x: hr % 24, label: "now" }] });
    const wp = []; for (let h2 = 0; h2 <= 24; h2 += 0.5) { const W = weather(h2); wp.push([h2, W.L, W.RH * 100, W.T]); }
    chB.opts.title = "The weather"; chB.opts.xLabel = "time of day (h)"; chB.opts.yLabel = ""; chB.draw([{ pts: wp.map(q => [q[0], q[1]]), color: "#ffe08a", label: "light %" }, { pts: wp.map(q => [q[0], q[2]]), color: "#7fb8ff", label: "humidity %" }, { pts: wp.map(q => [q[0], q[3]]), color: "#ff8a70", label: "°C" }], { xMin: 0, xMax: 24, yMin: 0 });
    label(0, "time"); label(1, "transpiration"); label(2, "uptake"); label(3, "stomata"); const W = weather(hr % 24); read.set("a", (hr % 24).toFixed(1) + " h"); read.set("b", plantRate(hr % 24).toFixed(1)); read.set("c", plantRate(hr % 24 - 1).toFixed(1)); read.set("d", (stoma(W.L) * 100).toFixed(0) + "% open");
  } else if (P.view === "trop") {
    const pts = []; for (let L = 0; L <= 100; L += 2) pts.push([L, bend(L, 4)]); chA.opts.title = "Bend after 4 hours"; chA.opts.xLabel = "light from one side (%)"; chA.opts.yLabel = "degrees"; chA.draw([{ pts, color: "#7ee787", label: "bend" }, { pts: [[P.lightSide, bend(P.lightSide, 4)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0 });
    const tp = []; for (let t = 0; t <= 8; t += 0.2) tp.push([t, bend(P.lightSide, t)]); chB.opts.title = "Bend over time"; chB.opts.xLabel = "hours"; chB.opts.yLabel = "degrees"; chB.draw([{ pts: tp, color: "#ffd166", label: "bend" }], { yMin: 0, vlines: [{ x: tropT, label: "now" }] });
    label(0, "time"); label(1, "bend"); label(2, "auxin"); label(3, "–"); read.set("a", tropT.toFixed(1) + " h"); read.set("b", bend(P.lightSide, tropT).toFixed(1) + "°"); read.set("c", "shaded side"); read.set("d", "–");
  } else {
    const Ls = []; for (let L = 0; L <= 100; L += 2) Ls.push([L, E(L, P.RH, P.wind, P.T) * (0.5 / P.rad) ** 2]);
    chA.opts.title = "Bubble speed against light (now: other conditions)"; chA.opts.xLabel = "light (%)"; chA.opts.yLabel = "mm/min"; chA.draw([{ pts: Ls, color: "#ffe08a", label: "model" }, { pts: readings.map(q => [q.L, q.v]), type: "dots", r: 5, color: "#fff", label: "your measurements" }], { yMin: 0 });
    const Rs = []; for (let RH = 10; RH <= 98; RH += 2) Rs.push([RH, E(P.L, RH / 100, P.wind, P.T) * (0.5 / P.rad) ** 2]); chB.opts.title = "… against humidity"; chB.opts.xLabel = "humidity (%)"; chB.opts.yLabel = "mm/min"; chB.draw([{ pts: Rs, color: "#7fb8ff", label: "model" }, { pts: readings.map(q => [q.RH * 100, q.v]), type: "dots", r: 5, color: "#fff", label: "yours" }], { yMin: 0 });
    const v = E(P.L, P.RH, P.wind, P.T) * (0.5 / P.rad) ** 2; label(0, "bubble speed"); label(1, "water uptake"); label(2, "stomata"); label(3, "your last reading"); read.set("a", v.toFixed(1) + " mm/min"); read.set("b", (Math.PI * P.rad ** 2 * v).toFixed(1) + " mm³/min"); read.set("c", (stoma(P.L) * 100).toFixed(0) + "% open"); read.set("d", readings.length ? readings[readings.length - 1].v.toFixed(1) + " mm/min" : "press Measure");
  }
  ui.hud({ plant: "Water up the xylem, sucrose both ways in the phloem", pot: "The potometer measures water uptake", leaf: "Evaporation pulls the water column up", trop: "Auxin on the shaded side makes the shoot bend" }[P.view]);
}
let frame = 0, T = 0;
ui.run(dt => { if (!(dt > 0)) return; T += dt; hr += dt * 0.8; if (hr > 30) hr = 6; bubble += dt * E(P.L, P.RH, P.wind, P.T) * (0.5 / P.rad) ** 2 * 2; tropT = Math.min(8, tropT + dt * 0.5); }, () => { draw(T); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Four views: the whole plant through a day, the potometer, the leaf and tropisms.", 6000);
