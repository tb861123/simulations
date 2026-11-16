/* =====================================================================
   PHOTOSYNTHESIS AND RESPIRATION
     photosynthesis:  carbon dioxide + water → glucose + oxygen   (needs light, in chloroplasts)
                      6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂
     respiration:     glucose + oxygen → carbon dioxide + water   (all the time, in mitochondria)

   Four set-ups, each a small model:
     * Pondweed: oxygen bubbles from a water plant. The rate is the SMALLER
       of what the light allows and what the CO₂ and the enzymes (temperature)
       allow: whichever is in shortest supply is the LIMITING FACTOR.
     * Leaf: gas exchange through the stomata, and hydrogencarbonate
       indicator tubes that change colour as CO₂ goes up or down.
       Net exchange = photosynthesis − respiration.
     * Respirometer: living things use oxygen; soda lime absorbs the CO₂
       they give out, so the gas shrinks and a coloured drop moves.
     * Calvin cycle (A level): the pools of RuBP, GP and TP inside a
       chloroplast, and what happens to them when the light goes off.
   ===================================================================== */

// ---- shared pieces ----
const q10 = (T, ref = 25) => Math.pow(2, (T - ref) / 10);                 // rate doubles every 10 °C
const enzymeOK = (T, Td = 40) => 1 / (1 + Math.exp((T - Td) / 2.5));     // enzymes denature above about 40 °C
// a smooth "smaller of the two": the rate follows whichever limit is lower, with a rounded corner
const smin = (a, b, th = 0.95) => ((a + b) - Math.sqrt((a + b) * (a + b) - 4 * th * a * b)) / (2 * th);
function poisson(lam, r) { if (lam <= 0) return 0; if (lam > 60) return Math.max(0, Math.round(lam + Math.sqrt(lam) * r.gauss())); let L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }

// ---- Pondweed model (bubbles per minute) ----
const lightAt = (d, room) => 100 * (10 / d) * (10 / d) + (room ? 2 : 0);    // relative light intensity: inverse square law (100 at 10 cm)
const waterT = (o) => o.T + (o.lamp === "bulb" ? Math.min(8, 8 * (10 / o.d) * (10 / o.d)) : 0);   // a filament bulb close to the tube warms the water
function pondRate(o) {
  const I = lightAt(o.d, o.room), T = waterT(o), f = q10(T) * enzymeOK(T);
  const lightLim = 0.6 * I, co2Lim = 55 * f * (o.co2 + 0.02) / (o.co2 + 0.32);
  const gross = smin(lightLim, co2Lim), resp = 3 * q10(T);
  return { gross, resp, net: gross - resp, I, T, lightLim, co2Lim, lim: lightLim < co2Lim * 0.85 ? "light" : (f < 0.8 && T < 25) || T > 37 ? "temperature" : "carbon dioxide" };
}
const bubblesPerMin = o => Math.max(0, pondRate(o).net);    // the oxygen used in the plant's own respiration never leaves as bubbles

// ---- Leaf model (µmol of CO₂ per m² of leaf per second) ----
function leafRate(lux, T, Ca = 420) {
  const J = 0.00093 * lux, rub = 25 * q10(T, 20) * enzymeOK(T, 42) * Math.max(0, Ca - 45) / (Ca + 355), gross = smin(J, rub), resp = 1.0 * q10(T, 20) * enzymeOK(T, 48);
  return { gross, resp, net: gross - resp };
}
const dayLux = (hr, peak) => Math.max(0, peak * Math.sin(Math.PI * (hr - 6) / 12));   // sunlight through the day: sunrise 6:00, sunset 18:00

// ---- Respirometer model (mm³ of oxygen per minute) ----
const ORG = {
  peas: { name: "germinating peas", o2: 0.8, rq: 1.0, col: "#b6d96a", r: 7 },
  sunflower: { name: "germinating sunflower seeds", o2: 0.75, rq: 0.7, col: "#3b3530", r: 5 },
  maggots: { name: "maggots", o2: 1.6, rq: 0.82, col: "#f0e6c8", r: 4 },
  boiled: { name: "boiled peas", o2: 0, rq: 1, col: "#d9d2a0", r: 7 },
};
const o2Rate = (o) => ORG[o.org].o2 * o.mass * q10(o.T, 20) * enzymeOK(o.T, 42);
const BORE = 1;                                   // capillary bore 1 mm, so 1 mm³ moves the drop 1 ÷ (π × 0.5²) = 1.27 mm
const mmPer = 1 / (Math.PI * (BORE / 2) ** 2);
/* One 10-minute experiment: returns readings of the drop every minute for both tubes. absorb = "soda" (CO₂ absorbed) or "water" */
function respRun(o, r, absorb = "soda") {
  const k = 1 + 0.08 * r.gauss(), O2 = o2Rate(o) * k, rq = ORG[o.org].rq * (1 + 0.02 * r.gauss()), shrink = absorb === "soda" ? O2 : O2 * (1 - rq);
  let drift = 0; const rd = [];
  for (let m = 0; m <= 10; m++) { if (m) drift += 0.03 * r.gauss() * 68;              // water bath wanders by ±0.03 °C a minute: the air expands or shrinks (Charles' law, 20 cm³)
    rd.push([m, (shrink * m + drift) * mmPer + 0.5 * r.gauss(), drift * 0.8 * mmPer + 0.5 * r.gauss()]); }   // the control tube feels about four-fifths of the same drift
  return rd;
}
const slope = pts => K.linfit(pts).m;

// ---- Calvin cycle model (A level): pools of RuBP (R), GP (G) and TP (P) ----
function calvinStep(s, dt, J, cf) {
  const v1 = 0.5 * cf * s.R, v2 = 0.8 * J * s.G, v3 = 0.4 * J * s.P, v4 = 0.4 * s.P * s.P;   // v1 rubisco fixes CO₂; v2 GP → TP using ATP and reduced NADP; v3 TP → RuBP using ATP; v4 TP leaves to make glucose
  s.R += (v3 - v1) * dt; s.G += (2 * v1 - v2) * dt; s.P += (v2 - v3 - v4) * dt; s.out += v4 * dt; s.t += dt;
}

// ---------------- The page ----------------
const P = { mode: "pond", d: 15, co2: 1, T: 25, lamp: "led", room: false, lux: 8000, leafT: 20, day: false, org: "peas", mass: 10, rT: 20, absorb: "soda", J: 1, cf: 1 };
let rnd = K.rng(Date.now() % 99991 + 7), speed = 1;
// pondweed state
let pond = { t: 0, bub: [], counting: null, results: [], piece: 1 };
// leaf state
let leaf = { hr: 12, tubes: [420, 420, 420, 420], parts: [], hist: [] };
// respirometer state
let resp = { t: 0, x: 0, xc: 0, drift: 0, log: [], runs: [] };
// Calvin state
let cal = { R: 0.8, G: 1, P: 1, out: 0, t: 0, log: [] };

const ui = K.app({
  title: "Photosynthesis and Respiration", subject: "Biology",
  blurb: "Bubbling pondweed, breathing leaves, a respirometer and the Calvin cycle",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(e) nutrition in flowering plants (photosynthesis, limiting factors: light, CO₂, temperature; the pondweed practical), 2(f) respiration (aerobic and anaerobic; respiring seeds) and 2(g) gas exchange in plants (stomata, day and night, hydrogencarbonate indicator).", adv: "OCR A level Biology A (H420) 5.2.1 photosynthesis (light-dependent stage, the Calvin cycle: rubisco, RuBP, GP, TP; limiting factors and their effect on GP, RuBP and TP; compensation point) and 5.2.2 respiration (respirometers, respiratory substrates and RQ)." } },
  missions: [
    { title: "Light and bubbles", q: "Count the bubbles for one minute with the lamp at 10 cm, then at 20 cm and 30 cm (drag the lamp along the ruler). What happens to the count each time the distance doubles?", hint: "Light intensity follows the inverse square law: double the distance and the light falls to a quarter. At 20 cm the count is about a third of the 10 cm count (not a quarter), because close to the lamp CO₂ is already limiting. At 30 cm it is small: light is the limiting factor there. The graph of rate against 1/d² is straight at low light and levels off at high light.", setup() { set({ mode: "pond", d: 10 }); } },
    { title: "What is limiting?", q: "With the lamp at 8 cm the rate stops rising however close you bring it. Change one thing at a time: more sodium hydrogencarbonate (CO₂), a warmer water bath. Which raises the rate? Watch the 'limiting factor' readout.", hint: "Close to the lamp, light is no longer limiting: CO₂ is. Adding sodium hydrogencarbonate raises the plateau; then temperature (the enzymes) may limit. The limiting factor is whichever is in shortest supply; improving anything else makes no difference. Growers add CO₂ and heat to greenhouses for the same reason.", setup() { set({ mode: "pond", d: 8, co2: 0.2 }); } },
    { title: "A fair test?", q: "Swap the LED lamp for a filament bulb and bring it to 5 cm. Why does the rate change even though the light is the same? How would you keep it a fair test?", hint: "A filament bulb gives out a lot of heat, which warms the water and the plant's enzymes. The temperature is no longer controlled, so you cannot tell which variable caused the change. Use an LED, or put a beaker of water (heat shield) between lamp and tube, and keep the tube in a water bath.", setup() { set({ mode: "pond", d: 15, lamp: "bulb" }); } },
    { title: "Day and night in a leaf", q: "Run a whole day. Watch the stomata and which way the carbon dioxide and oxygen go. When does the leaf take in CO₂, and when does it give it out?", hint: "In bright light photosynthesis is faster than respiration, so the leaf takes in CO₂ and gives out O₂. At night only respiration happens: it takes in O₂ and gives out CO₂. Respiration goes on all the time, day and night. Around dawn and dusk the two balance: the compensation point.", setup() { set({ mode: "leaf", day: true, speed: 2 }); } },
    { title: "Indicator tubes", q: "Four tubes of hydrogencarbonate indicator: no leaf, a leaf in the dark (foil), a leaf under gauze, and a leaf in full light. Predict each colour after a few hours, then run it.", hint: "Indicator is red at normal CO₂, yellow when CO₂ rises and purple when it falls. Dark: respiration only, CO₂ rises: yellow. Full light: photosynthesis is faster than respiration, CO₂ falls: purple. Gauze: about balanced, stays red (near the compensation point). No leaf: the control, stays red.", setup() { set({ mode: "leaf", lux: 10000, speed: 5 }); } },
    { title: "Respiring seeds", q: "Germinating peas in a respirometer with soda lime. Why does the drop move towards the peas? Calculate the volume of oxygen used per minute from the distance moved.", hint: "The peas take in oxygen; the CO₂ they give out is absorbed by the soda lime. So the volume of gas falls and the drop is pulled in. Volume = πr² × distance: with a 1 mm bore, r = 0.5 mm and every mm the drop moves is 0.785 mm³. The control tube of glass beads shows changes caused by temperature or pressure, not by living things.", setup() { set({ mode: "resp", speed: 3 }); } },
    { title: "Temperature and respiration", q: "Run the peas at 10 °C, 20 °C and 30 °C. How does the rate change? Try boiled peas: why do they give no reading?", hint: "Respiration is controlled by enzymes, so the rate roughly doubles every 10 °C (Q10 ≈ 2) up to about 40 °C, then falls as the enzymes denature. Boiled peas are dead: their enzymes have been denatured, so they do not respire. They make a better control than nothing at all.", setup() { set({ mode: "resp", rT: 10 }); } },
    { lvl: "adv", title: "The compensation point", q: "In the leaf view, turn the light down until net gas exchange is zero. How bright is it? What happens to the compensation point if the leaf is warmer?", hint: "About 1100 lux at 20 °C: photosynthesis then exactly uses the CO₂ that respiration makes. Warmer leaves respire faster, so they need more light to break even: the compensation point rises. A plant must spend enough time above it each day to grow.", setup() { set({ mode: "leaf", lux: 3000 }); } },
    { lvl: "adv", title: "Light off: the Calvin cycle", q: "Watch the RuBP, GP and TP pools, then switch the light off. Which pool rises and which falls? Why?", hint: "In the dark the light-dependent stage stops, so there is no ATP or reduced NADP. GP cannot be reduced to TP, so GP piles up; RuBP cannot be regenerated from TP, but rubisco keeps using it up, so RuBP falls. TP falls too. Classic experiments (Calvin and Benson) found exactly this.", setup() { set({ mode: "calvin" }); } },
    { lvl: "adv", title: "Less CO₂: RuBP piles up", q: "Now keep the light on and cut the CO₂. Predict the change in RuBP and GP, then try it.", hint: "Without CO₂, rubisco cannot fix it onto RuBP. RuBP is still made from TP, so it builds up; GP is still turned into TP but no new GP is made, so GP falls. The opposite of switching the light off.", setup() { set({ mode: "calvin" }); } },
    { lvl: "adv", title: "Respiratory quotient", q: "Run germinating sunflower seeds once with soda lime and once with water in the tube. Use the two distances to work out the RQ = CO₂ given out ÷ O₂ taken in. What are the seeds respiring?", hint: "With soda lime the drop measures O₂ used. With water it measures O₂ used − CO₂ made. So CO₂ = soda − water, and RQ = (soda − water) ÷ soda. Sunflower seeds give about 0.7: they store oil, a lipid. Carbohydrate gives 1.0, protein about 0.9.", setup() { set({ mode: "resp", org: "sunflower" }); } }
  ],
  batch: [
    { title: "The inverse square law", question: "How does the number of bubbles in a minute depend on the distance of the lamp?", how: "Lamp from 5 to 60 cm, 1% sodium hydrogencarbonate, 25 °C, LED. Three one-minute counts at each distance, each with a fresh piece of pondweed (±10%).", xLabel: "lamp distance (cm)", yLabel: "bubbles per minute", xs: [5, 10, 15, 20, 25, 30, 40, 50, 60], reps: 3, yMin: 0, theory: d => bubblesPerMin({ d, co2: 1, T: 25, lamp: "led" }), theoryLabel: "model", run: (x, r) => poisson(bubblesPerMin({ d: x, co2: 1, T: 25, lamp: "led" }) * (1 + 0.1 * r.gauss()), r), note: "Far from the lamp the counts fall roughly as 1/d² (light limiting). Close to the lamp they level off: CO₂ has become the limiting factor. Beyond about 40 cm the plant's own respiration uses all the oxygen it makes, so no bubbles leave." },
    { title: "Carbon dioxide as a limiting factor", question: "How does the rate depend on the amount of sodium hydrogencarbonate (the CO₂ supply)?", how: "Lamp at 10 cm, 25 °C, sodium hydrogencarbonate from 0 to 2%. Three counts each.", xLabel: "sodium hydrogencarbonate (%)", yLabel: "bubbles per minute", xs: [0, 0.05, 0.1, 0.2, 0.4, 0.7, 1, 1.5, 2], reps: 3, yMin: 0, theory: c => bubblesPerMin({ d: 10, co2: c, T: 25, lamp: "led" }), theoryLabel: "model", run: (x, r) => poisson(bubblesPerMin({ d: 10, co2: x, T: 25, lamp: "led" }) * (1 + 0.1 * r.gauss()), r), note: "Rises steeply at first, then levels off when light (or temperature) becomes the limiting factor." },
    { title: "Temperature and rate", question: "How does the water-bath temperature affect the rate?", how: "Lamp at 10 cm, 1% sodium hydrogencarbonate, temperature 5 to 45 °C. Three counts each.", xLabel: "temperature (°C)", yLabel: "bubbles per minute", xs: [5, 10, 15, 20, 25, 30, 35, 40, 45], reps: 3, yMin: 0, theory: T => bubblesPerMin({ d: 10, co2: 1, T, lamp: "led" }), theoryLabel: "model", run: (x, r) => poisson(bubblesPerMin({ d: 10, co2: 1, T: x, lamp: "led" }) * (1 + 0.1 * r.gauss()), r), note: "An optimum near 30–35 °C: the enzymes of photosynthesis (like rubisco) speed up with temperature and then denature. Respiration also speeds up, so fewer bubbles leave at high temperature." },
    { title: "How much do counts scatter?", question: "If you count bubbles at 20 cm again and again, how much do the counts vary?", how: "200 one-minute counts at 20 cm (1%, 25 °C), each with a new piece of pondweed.", reps: 200, bins: 20, theory: bubblesPerMin({ d: 20, co2: 1, T: 25, lamp: "led" }), theoryLabel: "model mean", yLabel: "bubbles in one minute", run: (x, r) => poisson(bubblesPerMin({ d: 20, co2: 1, T: 25, lamp: "led" }) * (1 + 0.1 * r.gauss()), r), note: "Bubbles leave at random moments and pieces of pondweed differ, so a single count can be well off. That is why you repeat each count (usually three times) and take the mean." },
    { lvl: "adv", title: "The compensation point", question: "At what light intensity does a leaf's net gas exchange become zero?", how: "Leaf at 20 °C, light from 0 to 4000 lux. Each run is a measurement with a small error (±0.1 µmol m⁻² s⁻¹).", xLabel: "light (lux)", yLabel: "net CO₂ uptake (µmol m⁻² s⁻¹)", xs: [0, 250, 500, 750, 1000, 1250, 1500, 2000, 3000, 4000], reps: 3, theory: l => leafRate(l, 20).net, theoryLabel: "model", run: (x, r) => leafRate(x, 20).net + 0.1 * r.gauss(), note: "Negative in dim light (respiration only gives out CO₂), crossing zero just above 1000 lux: the light compensation point." },
    { title: "Respirometer: temperature and Q10", question: "How does the rate at which germinating peas use oxygen depend on temperature?", how: "10 g of peas with soda lime; the drop is read every minute for 10 minutes, the control is subtracted and a best-fit line gives the rate. Temperature 5 to 45 °C, three runs each.", xLabel: "temperature (°C)", yLabel: "oxygen used (mm³ per g per min)", xs: [5, 10, 15, 20, 25, 30, 35, 40, 45], reps: 3, yMin: 0, theory: T => o2Rate({ org: "peas", mass: 1, T }), theoryLabel: "model", run: (x, r) => { const rd = respRun({ org: "peas", mass: 10, T: x }, r); return slope(rd.map(q => [q[0], q[1] - q[2]])) / mmPer / 10; }, note: "Roughly doubles every 10 °C (Q10 ≈ 2), then falls above 40 °C as the enzymes denature." },
    { lvl: "adv", title: "RQ of sunflower seeds", question: "What respiratory quotient do germinating sunflower seeds give, and what does it say about their respiratory substrate?", how: "Each run is a pair of 10-minute experiments, one with soda lime and one with water. RQ = (soda − water) ÷ soda.", reps: 100, bins: 20, theory: 0.7, theoryLabel: "lipid", yLabel: "respiratory quotient", run: (x, r) => { const s = respRun({ org: "sunflower", mass: 10, T: 20 }, r, "soda"), w = respRun({ org: "sunflower", mass: 10, T: 20 }, r, "water"); const a = slope(s.map(q => [q[0], q[1] - q[2]])), b = slope(w.map(q => [q[0], q[1] - q[2]])); return (a - b) / a; }, note: "Close to 0.7: lipids (oils) need more oxygen per CO₂ than carbohydrates (RQ 1.0). The scatter comes from the two runs using different seeds." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2.17", text: "Photosynthesis: carbon dioxide + water → glucose + oxygen, using light energy absorbed by chlorophyll. 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂." },
      { lvl: "std", tag: "4BI1 2.18", text: "Limiting factors: light intensity, CO₂ concentration and temperature. The rate is set by whichever is in shortest supply." },
      { lvl: "std", tag: "4BI1 2.23", text: "Practical: count the oxygen bubbles from pondweed with the lamp at different distances; keep CO₂ (sodium hydrogencarbonate) and temperature (water bath) constant. Light intensity ∝ 1/d²." },
      { lvl: "std", tag: "4BI1 2.34", text: "Aerobic respiration: glucose + oxygen → carbon dioxide + water, releasing energy (as ATP). It happens all the time in every living cell." },
      { lvl: "std", tag: "4BI1 2.36", text: "Anaerobic respiration: glucose → lactic acid (animals) or ethanol + carbon dioxide (plants and yeast). Much less energy is released." },
      { lvl: "std", tag: "4BI1 2.47", text: "Leaves exchange gases by diffusion through stomata. In bright light: CO₂ in, O₂ out. In the dark: O₂ in, CO₂ out. Hydrogencarbonate indicator: yellow = more CO₂, red = normal, purple = less." },
      { lvl: "adv", tag: "H420 5.2.1", text: "Calvin cycle: rubisco fixes CO₂ onto RuBP (5C) giving 2 GP (3C); GP is reduced to TP using ATP and reduced NADP; most TP regenerates RuBP (using ATP), some makes glucose." },
      { lvl: "adv", tag: "H420 5.2.1", text: "Light off: GP rises, RuBP and TP fall. CO₂ removed: RuBP rises, GP falls." },
      { lvl: "adv", tag: "H420 5.2.1", text: "Compensation point: the light intensity at which photosynthesis and respiration are equal, so net gas exchange is zero." },
      { lvl: "adv", tag: "H420 5.2.2", text: "Respirometer: volume = πr² × distance. With soda lime it measures O₂ uptake. RQ = CO₂ given out ÷ O₂ taken in: carbohydrate 1.0, protein about 0.9, lipid about 0.7." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Write the balanced symbol equation for photosynthesis.", ans: "<ul><li>6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</li><li>correct formulae; balanced</li></ul>" },
      { lvl: "std", marks: 2, q: () => `The lamp is moved from ${P.d} cm to ${2 * P.d} cm. By what factor does the light intensity change?`, ans: "<ul><li>intensity ∝ 1/d²</li><li>doubling the distance divides the intensity by 4 (it becomes a quarter)</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why moving the lamp from 10 cm to 5 cm did not increase the number of bubbles.", ans: "<ul><li>light is no longer the limiting factor</li><li>another factor is limiting: carbon dioxide concentration or temperature</li><li>increasing light intensity further has no effect</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe how you would investigate the effect of light intensity on the rate of photosynthesis of pondweed.", ans: "<ul><li>pondweed in sodium hydrogencarbonate solution in a boiling tube, in a water bath</li><li>lamp at measured distances (e.g. 10, 20, 30, 40 cm); allow time to adjust at each</li><li>count bubbles (or collect gas) for a fixed time; repeat and take a mean</li><li>control temperature, CO₂ concentration, the same piece of pondweed; use an LED or heat shield</li></ul>" },
      { lvl: "std", marks: 3, q: "A leaf in hydrogencarbonate indicator is kept in bright light. Explain the colour change.", ans: "<ul><li>the indicator turns purple</li><li>rate of photosynthesis is greater than respiration</li><li>so CO₂ is taken out of the solution faster than it is added</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why the drop in a respirometer containing germinating seeds and soda lime moves towards the seeds.", ans: "<ul><li>the seeds take in oxygen for respiration</li><li>the carbon dioxide released is absorbed by the soda lime, so the gas volume (pressure) falls</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `In a respirometer with a 1.0 mm bore capillary, the drop moved ${(o2Rate(P) * 10 * mmPer).toFixed(0)} mm in 10 minutes for ${P.mass} g of seeds. Calculate the rate of oxygen uptake in mm³ g⁻¹ min⁻¹.`, ans: () => { const d = +(o2Rate(P) * 10 * mmPer).toFixed(0); return `<ul><li>volume = πr² × d = π × 0.5² × ${d} = ${(Math.PI * 0.25 * d).toFixed(1)} mm³</li><li>÷ 10 min ÷ ${P.mass} g</li><li>= ${(Math.PI * 0.25 * d / 10 / P.mass).toFixed(2)} mm³ g⁻¹ min⁻¹</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Seeds moved the drop 42 mm in 10 min with soda lime and 13 mm with water. Calculate the RQ and suggest the respiratory substrate.", ans: "<ul><li>CO₂ given out ∝ 42 − 13 = 29</li><li>RQ = 29 ÷ 42 = 0.69</li><li>lipid</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain what happens to the concentrations of GP and RuBP in a chloroplast when the light is switched off.", ans: "<ul><li>the light-dependent stage stops, so no ATP or reduced NADP is made</li><li>GP cannot be reduced to TP, but CO₂ is still fixed by rubisco, so GP rises</li><li>RuBP is still used but cannot be regenerated (needs TP and ATP), so RuBP falls</li></ul>" },
      { lvl: "adv", marks: 2, q: "Explain why the compensation point of a plant is higher at 30 °C than at 20 °C.", ans: "<ul><li>respiration rate is higher at 30 °C</li><li>so more photosynthesis (more light) is needed to balance it</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Pondweed</b>: light intensity = 100 × (10 ÷ d)² (relative; the inverse square law). Gross oxygen = the smooth minimum of a light-limited rate (0.6 × intensity) and a CO₂-and-enzyme-limited rate 55 × f(T) × (C + 0.02) ÷ (C + 0.32), where f(T) doubles every 10 °C and falls as the enzymes denature above about 38 °C. Bubbles per minute = gross − respiration (3 per minute at 25 °C), counted at random moments (a Poisson process). Each piece of pondweed differs by about ±10%. A filament bulb warms the water by up to 8 °C.</li>
<li><b>Leaf</b>: photosynthesis = smooth minimum of 0.00093 × lux and 25 f(T)(Ca − 45) ÷ (Ca + 355) µmol m⁻² s⁻¹ (Ca = CO₂ in ppm); respiration 1.0 µmol m⁻² s⁻¹ at 20 °C, doubling every 10 °C. Indicator CO₂ changes by 0.03 ppm per second for each µmol m⁻² s⁻¹ of net exchange. Foil = no light, gauze = 15% of the light.</li>
<li><b>Respirometer</b>: oxygen uptake per gram per minute at 20 °C: peas 0.8, sunflower seeds 0.75, maggots 1.6 mm³ (doubling every 10 °C, falling above about 42 °C). RQ: peas 1.0, sunflower 0.7, maggots 0.82. The water bath wanders by about ±0.03 °C a minute, which expands or shrinks the air (the control tube feels most of the same change). Readings ±0.5 mm.</li>
<li><b>Calvin cycle</b>: rubisco fixes CO₂ at 0.5 × CO₂ × RuBP; GP → TP at 0.8 × light × GP; TP → RuBP at 0.4 × light × TP; TP leaves (to glucose) at 0.4 × TP².</li></ul>
<h3>Simplifications</h3>
<ul><li>All numbers are illustrative, chosen to give realistic proportions; the light units are relative.</li>
<li>All bubbles are taken to be pure oxygen and the same size; real bubbles also contain nitrogen and vary.</li>
<li>Stomata open with light only; real stomata also respond to CO₂, water stress and time of day.</li>
<li>The indicator colour is worked out from CO₂ alone (real indicators respond to pH, which CO₂ changes).</li>
<li>Glycolysis, the Krebs cycle and the light-dependent reactions are not modelled step by step; the earlier version had views of them and of leaf-pigment chromatography.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/photosynthesis-respiration.html">original/photosynthesis-respiration.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("Set-up");
ctl.mode = K.seg(g, { value: "pond", options: [["pond", "🌿 Pondweed"], ["leaf", "🍃 Leaf"], ["resp", "🫁 Respirometer"], ["calvin", "⚙️ Calvin cycle"]], on: v => set({ mode: v }) });
grp.pond = g = ui.group("Pondweed in a water bath");
ctl.d = K.slider(g, { label: "Lamp distance", min: 4, max: 60, step: 1, value: P.d, unit: "cm", on: v => P.d = v });
ctl.co2 = K.slider(g, { label: "Sodium hydrogencarbonate (CO₂)", min: 0, max: 2, step: 0.05, value: P.co2, unit: "%", on: v => P.co2 = v });
ctl.T = K.slider(g, { label: "Water bath", min: 5, max: 45, step: 1, value: P.T, unit: "°C", on: v => P.T = v });
ctl.lamp = K.seg(g, { label: "Lamp", value: "led", options: [["led", "LED"], ["bulb", "Filament bulb (hot)"]], on: v => P.lamp = v });
ctl.room = K.toggle(g, { label: "Room lights on", value: false, on: v => P.room = v });
let r1 = K.row(g); K.btn(r1, "⏱ Count for one minute", () => { pond.counting = { t0: pond.t, n: 0, d: P.d }; }, "primary"); K.btn(r1, "New pondweed", () => { pond.piece = 1 + 0.1 * rnd.gauss(); }); K.btn(r1, "Clear results", () => { pond.results = []; });
grp.leaf = g = ui.group("A leaf");
ctl.lux = K.slider(g, { label: "Light", min: 0, max: 20000, step: 100, value: P.lux, unit: "lux", on: v => { P.lux = v; P.day = false; ctl.day.set(false); } });
ctl.leafT = K.slider(g, { label: "Temperature", min: 5, max: 40, step: 1, value: P.leafT, unit: "°C", on: v => P.leafT = v });
ctl.day = K.toggle(g, { label: "Run a whole day (sunlight changes)", value: false, on: v => { P.day = v; if (v) leaf.hr = 0; } });
K.btn(K.row(g), "Fresh indicator tubes", () => { leaf.tubes = [420, 420, 420, 420]; leaf.hist = []; });
grp.resp = g = ui.group("Respirometer");
ctl.org = K.seg(g, { label: "In the tube", value: "peas", options: Object.entries(ORG).map(([k, v]) => [k, v.name.replace("germinating ", "").replace(" seeds", "")]), on: v => { P.org = v; restartResp(); } });
ctl.mass = K.slider(g, { label: "Mass", min: 2, max: 30, step: 1, value: P.mass, unit: "g", on: v => { P.mass = v; restartResp(); } });
ctl.rT = K.slider(g, { label: "Water bath", min: 5, max: 45, step: 1, value: P.rT, unit: "°C", on: v => { P.rT = v; restartResp(); } });
ctl.absorb = K.seg(g, { label: "In the bottom of the tube", value: "soda", options: [["soda", "Soda lime (absorbs CO₂)"], ["water", "Water (A level)"]], on: v => { P.absorb = v; restartResp(); } });
K.btn(K.row(g), "↺ Reset the drop", () => restartResp(), "primary");
grp.calvin = g = ui.group("Inside a chloroplast");
ctl.J = K.toggle(g, { label: "Light on", value: true, on: v => P.J = v ? 1 : 0 });
ctl.cf = K.toggle(g, { label: "Carbon dioxide supplied", value: true, on: v => P.cf = v ? 1 : 0 });
K.btn(K.row(g), "↺ Back to steady state", () => { cal = { R: 0.8, G: 1, P: 1, out: 0, t: 0, log: [] }; P.J = 1; P.cf = 1; ctl.J.set(true); ctl.cf.set(true); });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.2, max: 10, step: 0.2, value: 1, fmt: v => "× " + v.toFixed(1), on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = (labels) => labels.forEach((l, i) => read.el.children[i].firstElementChild.textContent = l);

function restartResp() { resp = { t: 0, x: 0, xc: 0, drift: 0, log: [[0, 0, 0]], k: 1 + 0.08 * rnd.gauss(), rq: ORG[P.org].rq * (1 + 0.02 * rnd.gauss()), runs: resp.runs || [] }; }
function set(o) {
  Object.assign(P, { d: 15, co2: 1, T: 25, lamp: "led", room: false, lux: 8000, leafT: 20, day: false, org: "peas", mass: 10, rT: 20, absorb: "soda", J: 1, cf: 1 }, o);
  for (const k of ["d", "co2", "T", "lux", "leafT", "mass", "rT"]) ctl[k].set(P[k]); for (const k of ["mode", "lamp", "org", "absorb"]) ctl[k].set(P[k]); ctl.room.set(P.room); ctl.day.set(P.day); ctl.J.set(!!P.J); ctl.cf.set(!!P.cf);
  speed = o.speed || 1; ctl.speed.set(speed);
  pond = { t: 0, bub: [], counting: null, results: [], piece: 1 }; leaf = { hr: P.day ? 0 : 12, tubes: [420, 420, 420, 420], parts: [], hist: [] }; resp.runs = []; restartResp(); cal = { R: 0.8, G: 1, P: 1, out: 0, t: 0, log: [] };
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none";
  chA.opts.title = { pond: "Your counts against lamp distance", leaf: "Net gas exchange against light", resp: "Distance moved by the drop", calvin: "Pools in the Calvin cycle" }[P.mode];
  chB.opts.title = { pond: "Rate against light intensity (limiting factors)", leaf: "Carbon dioxide in the indicator tubes", resp: "Your rates against temperature", calvin: "Glucose made (TP leaving the cycle)" }[P.mode];
  relabel({ pond: ["bubbles a minute (now)", "light intensity", "water temperature", "limiting factor"], leaf: ["photosynthesis", "respiration", "net CO₂ uptake", "time of day"], resp: ["oxygen used", "drop has moved", "corrected for control", "time"], calvin: ["RuBP (5C)", "GP (3C)", "TP (3C)", "CO₂ fixed"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
let dragLamp = false, geo = {};
const label = (c, t, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(t, x, y); };

function drawPond(c, w, h) {
  // a metre rule along the bottom; the boiling tube on the left; the lamp at distance d
  const x0 = 190, pxcm = (w - x0 - 80) / 60, tubeX = x0, top = Math.min(140, h * 0.28), bot = h - 80; geo = { x0, pxcm };
  c.fillStyle = "rgba(90,160,255,0.10)"; c.fillRect(tubeX - 70, top + 30, 140, bot - top - 20);     // water bath
  label(c, "water bath", tubeX - 78, top + 50, "#aab6cc", "right"); label(c, `${pondRate(P).T.toFixed(0)} °C`, tubeX - 78, top + 66, "#eef2f8", "right");
  c.fillStyle = "rgba(160,220,255,0.18)"; c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.beginPath(); c.roundRect(tubeX - 24, top + 10, 48, bot - top, [0, 0, 24, 24]); c.fill(); c.stroke();
  // pondweed: a stem with leaves, cut end at the top
  c.strokeStyle = "#3fae5a"; c.lineWidth = 4; c.beginPath(); c.moveTo(tubeX, bot - 6); c.bezierCurveTo(tubeX - 10, bot - 60, tubeX + 10, top + 160, tubeX, top + 120); c.stroke();
  c.fillStyle = "#4cc46a"; for (let k = 0; k < 9; k++) { const y = bot - 20 - k * (bot - top - 150) / 9; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(tubeX + s * 9, y, 10, 3.5, s * 0.5, 0, 6.3); c.fill(); } }
  // bubbles rising from the cut stem
  c.strokeStyle = "rgba(220,240,255,0.9)"; c.lineWidth = 1.2; for (const b of pond.bub) { c.beginPath(); c.arc(tubeX + b.dx, top + 120 - b.y, b.r, 0, 6.3); c.stroke(); }
  // ruler and lamp
  const ry = bot + 30; c.fillStyle = "#c9a96a"; c.fillRect(x0, ry, 60 * pxcm, 16); c.fillStyle = "#3a2e1a"; c.font = "10px Segoe UI,sans-serif"; c.textAlign = "center";
  for (let cm = 0; cm <= 60; cm++) { const x = x0 + cm * pxcm; c.fillRect(x, ry, 1, cm % 10 ? (cm % 5 ? 4 : 7) : 10); if (cm % 10 === 0) c.fillText(cm + " cm", x, ry + 26 > h - 4 ? h - 4 : ry + 27); }
  const lx = x0 + P.d * pxcm, I = lightAt(P.d, P.room); geo.lx = lx; geo.ly = (top + bot) / 2;
  const grad = c.createRadialGradient(lx, geo.ly, 5, lx, geo.ly, Math.max(40, lx - x0 + 60)); grad.addColorStop(0, `rgba(255,236,150,${Math.min(0.5, 0.1 + I / 300)})`); grad.addColorStop(1, "rgba(255,236,150,0)"); c.fillStyle = grad; c.fillRect(x0 - 70, top, lx - x0 + 140, bot - top);
  c.fillStyle = "#56607a"; c.fillRect(lx - 3, geo.ly, 6, ry - geo.ly); c.fillStyle = P.lamp === "bulb" ? "#ffcf6e" : "#f4f8ff"; c.beginPath(); c.arc(lx - 8, geo.ly, 16, Math.PI / 2, Math.PI * 1.5); c.fill(); c.fillStyle = "#8b94a8"; c.fillRect(lx - 8, geo.ly - 20, 22, 40);
  label(c, P.lamp === "bulb" ? "filament bulb" : "LED lamp", lx + 18, geo.ly - 26, "#eef2f8", "left"); label(c, "drag me", lx + 18, geo.ly - 10, "#7d8aa5");
  // counting clock
  if (pond.counting) { const f = (pond.t - pond.counting.t0) / 60; c.strokeStyle = "#ffd166"; c.lineWidth = 6; c.beginPath(); c.arc(w - 70, 170, 30, -Math.PI / 2, -Math.PI / 2 + f * 6.283); c.stroke(); label(c, pond.counting.n, w - 70, 176, "#ffd166", "center", "600 18px"); label(c, "counting…", w - 70, 218, "#aab6cc", "center"); }
  label(c, "carbon dioxide + water → glucose + oxygen", w - 20, h - 12, "#aab6cc", "right");
}

function tubeColour(ppm) {    // hydrogencarbonate indicator: yellow (lots of CO₂) → red (normal air) → purple (little CO₂)
  const s = [[1500, [232, 212, 77]], [800, [240, 140, 50]], [420, [214, 54, 62]], [220, [194, 24, 91]], [80, [123, 31, 162]]];
  if (ppm >= s[0][0]) return `rgb(${s[0][1]})`; if (ppm <= s[4][0]) return `rgb(${s[4][1]})`;
  for (let i = 0; i < 4; i++) if (ppm <= s[i][0] && ppm >= s[i + 1][0]) { const f = Math.log(s[i][0] / ppm) / Math.log(s[i][0] / s[i + 1][0]); return `rgb(${s[i][1].map((v, k) => Math.round(v + (s[i + 1][1][k] - v) * f)).join(",")})`; }
}
function drawLeaf(c, w, h) {
  const lux = P.day ? dayLux(leaf.hr, 20000) : P.lux, L = leafRate(lux, P.leafT), lw = Math.min(w * 0.48, 520), x0 = 30, y0 = Math.min(150, h * 0.3), lh = h - y0 - 70;
  // sky: day or night
  c.fillStyle = lux > 0 ? `rgba(255,220,120,${Math.min(0.25, lux / 60000)})` : "rgba(40,50,90,0.2)"; c.fillRect(0, 0, w, h);
  label(c, lux > 0 ? `☀ ${Math.round(lux)} lux` : "☾ dark", w * 0.6, 30, "#ffd166", "left", "600 14px"); if (P.day) label(c, `${String(Math.floor(leaf.hr)).padStart(2, "0")}:${String(Math.floor((leaf.hr % 1) * 60)).padStart(2, "0")}`, w * 0.6 + 150, 30, "#eef2f8", "left", "600 14px");
  // leaf cross-section: cuticle, upper epidermis, palisade, spongy mesophyll with air spaces, lower epidermis with stomata
  const ep = lh * 0.08, pal = lh * 0.36, spg = lh * 0.4; c.fillStyle = "#cfe9b0"; c.fillRect(x0, y0, lw, 4);
  for (let x = x0; x < x0 + lw; x += 34) { c.fillStyle = "#b9dca0"; c.fillRect(x + 1, y0 + 4, 32, ep - 2); }
  for (let x = x0 + 2; x < x0 + lw - 16; x += 22) { c.fillStyle = "#5dbb63"; c.beginPath(); c.roundRect(x, y0 + ep + 4, 19, pal - 6, 8); c.fill(); c.fillStyle = "#1f7a33"; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(x + 5 + (k % 2) * 9, y0 + ep + 14 + k * (pal - 24) / 6, 3.5, 2.2, 0, 0, 6.3); c.fill(); } }
  const sy = y0 + ep + pal + 2; for (let i = 0; i < 26; i++) { const cx = x0 + 18 + ((i * 53) % (lw - 36)), cy = sy + 12 + ((i * 37) % (spg - 24)); c.fillStyle = "#8fd18a"; c.beginPath(); c.ellipse(cx, cy, 16, 11, (i % 3) * 0.6, 0, 6.3); c.fill(); c.fillStyle = "#2f8f3f"; c.beginPath(); c.arc(cx - 4, cy, 2.2, 0, 6.3); c.arc(cx + 5, cy + 2, 2.2, 0, 6.3); c.fill(); }
  const ly = sy + spg; const open = Math.min(1, 0.15 + lux / 4000), stomata = [x0 + lw * 0.3, x0 + lw * 0.72]; geo.stomata = stomata; geo.leafBox = [x0, y0 + ep + 4, lw, pal + spg - 10]; geo.ly = ly;
  for (let x = x0; x < x0 + lw; x += 34) { if (stomata.some(s => Math.abs(s - x - 17) < 30)) continue; c.fillStyle = "#b9dca0"; c.fillRect(x + 1, ly, 32, ep - 2); }
  for (const s of stomata) { c.fillStyle = "#6fcf6f"; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(s + sg * (6 + 6 * open), ly + ep / 2, 7, ep / 2, 0, 0, 6.3); c.fill(); } }
  c.fillStyle = "#cfe9b0"; c.fillRect(x0, ly + ep - 2, lw, 3);
  label(c, "upper epidermis", x0 + lw + 8, y0 + ep / 2 + 4); label(c, "palisade (most chloroplasts)", x0 + lw + 8, y0 + ep + pal / 2); label(c, "spongy layer + air spaces", x0 + lw + 8, sy + spg / 2); label(c, "stoma (guard cells " + (open > 0.6 ? "open)" : "nearly closed)"), x0 + lw + 8, ly + ep / 2 + 4);
  // gas molecules: CO₂ (grey) and O₂ (blue) moving through the stomata
  for (const p of leaf.parts) { c.fillStyle = p.k === "co2" ? "#cdd3dc" : "#5ab0ff"; c.beginPath(); c.arc(p.x, p.y, 3.2, 0, 6.3); c.fill(); }
  label(c, "● CO₂", x0, h - 40, "#cdd3dc"); label(c, "● O₂", x0 + 60, h - 40, "#5ab0ff");
  label(c, L.net > 0.05 ? "Net: CO₂ in, O₂ out (photosynthesis faster than respiration)" : L.net < -0.05 ? "Net: O₂ in, CO₂ out (respiration only, or faster)" : "About balanced: the compensation point", x0 + 120, h - 40, "#eef2f8", "left", "600 12.5px");
  // four indicator tubes
  const tx = x0 + lw + 185, tw = (w - tx - 20) / 4, names = ["no leaf", "foil (dark)", "gauze", "full light"];
  for (let i = 0; i < 4; i++) { const x = tx + tw * i + tw / 2, top = h - 230, tb = h - 70; c.fillStyle = tubeColour(leaf.tubes[i]); c.globalAlpha = 0.85; c.beginPath(); c.roundRect(x - 13, top + 40, 26, tb - top - 40, [0, 0, 13, 13]); c.fill(); c.globalAlpha = 1; c.strokeStyle = "#c9d3e6"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x - 14, top, 28, tb - top, [0, 0, 14, 14]); c.stroke();
    if (i) { c.fillStyle = "#4cc46a"; c.beginPath(); c.ellipse(x, top + 25, 9, 18, 0.3, 0, 6.3); c.fill(); } if (i === 1) { c.fillStyle = "rgba(200,205,215,0.92)"; c.fillRect(x - 16, top - 2, 32, tb - top + 4); } if (i === 2) { c.strokeStyle = "rgba(255,255,255,0.35)"; for (let y = top; y < tb; y += 5) { c.beginPath(); c.moveTo(x - 15, y); c.lineTo(x + 15, y); c.stroke(); } }
    label(c, names[i], x, tb + 18, "#aab6cc", "center", "11px"); label(c, Math.round(leaf.tubes[i]) + " ppm", x, tb + 32, "#7d8aa5", "center", "10.5px"); }
  label(c, "hydrogencarbonate indicator", tx + tw * 2, h - 245, "#aab6cc", "center");
}

function drawResp(c, w, h) {
  // two tubes on their sides, each with a capillary and a coloured drop; organisms above soda lime on a gauze
  const O = ORG[P.org], x0 = 40, tl = 210, capL = w - x0 - tl - 60, mmPx = capL / 150;
  c.fillStyle = `rgba(${P.rT > 30 ? 255 : 90},${120},${P.rT > 30 ? 90 : 255},0.08)`; c.fillRect(20, 40, x0 + tl + 20, h - 80); label(c, `water bath ${P.rT} °C`, 30, 58);
  for (const [k, y] of [["test", h * 0.45], ["control", h * 0.8]]) {
    c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.fillStyle = "rgba(160,220,255,0.12)"; c.beginPath(); c.roundRect(x0, y - 34, tl, 68, [34, 0, 0, 34]); c.fill(); c.stroke();
    c.fillStyle = P.absorb === "soda" ? "#eef2f8" : "rgba(90,170,255,0.55)"; c.beginPath(); c.roundRect(x0 + 6, y + 12, tl - 40, 18, 8); c.fill();     // soda lime granules (or water) at the bottom
    c.strokeStyle = "#9aa3b5"; c.lineWidth = 1; for (let x = x0 + 10; x < x0 + tl - 30; x += 6) { c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 3, y + 8); c.stroke(); }
    if (k === "test") { c.fillStyle = O.col; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(x0 + 26 + (i % 7) * 22, y - 8 - Math.floor(i / 7) * 13, O.r, 0, 6.3); c.fill(); } }
    else { c.fillStyle = "rgba(220,230,255,0.6)"; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(x0 + 26 + (i % 7) * 22, y - 8 - Math.floor(i / 7) * 13, 6, 0, 6.3); c.fill(); } }
    c.fillStyle = "#6b5040"; c.fillRect(x0 + tl - 8, y - 30, 22, 60);     // bung
    // capillary with a mm scale; the drop starts at the far end and moves towards the tube
    const cx0 = x0 + tl + 14, cx1 = cx0 + capL; c.fillStyle = "rgba(200,220,255,0.15)"; c.fillRect(cx0, y - 4, capL, 8); c.strokeStyle = "#c9d3e6"; c.strokeRect(cx0, y - 4, capL, 8);
    c.fillStyle = "#7d8aa5"; c.font = "10px Segoe UI,sans-serif"; c.textAlign = "center"; for (let mm = 0; mm <= 150; mm += 10) { const x = cx1 - mm * mmPx; c.fillRect(x, y + 6, 1, mm % 50 ? 4 : 8); if (mm % 50 === 0) c.fillText(mm + " mm", x, y + 24); }
    const xd = k === "test" ? resp.x : resp.xc, px = cx1 - K.clamp(xd, -10, 150) * mmPx; c.fillStyle = "#ff5d6c"; c.fillRect(px - 5, y - 4, 10, 8);
    label(c, k === "test" ? O.name : "control: glass beads", x0 + 10, y - 44, "#eef2f8", "left", "600 12.5px");
  }
  label(c, P.absorb === "soda" ? "soda lime absorbs CO₂: the drop measures O₂ taken in" : "water: the drop measures O₂ taken in − CO₂ given out", w - 20, h - 12, "#aab6cc", "right");
  label(c, `1 mm of movement = π × 0.5² = ${(1 / mmPer).toFixed(3)} mm³`, w - 20, h - 30, "#aab6cc", "right");
}

function drawCalvin(c, w, h) {
  // the cycle: RuBP → (rubisco + CO₂) → GP → (ATP, reduced NADP) → TP → (ATP) → RuBP, with TP leaving to make glucose
  const cx = w * 0.6, cy = h * 0.56, R = Math.min(w * 0.2, h * 0.3), pos = { R: [cx, cy - R], G: [cx + R * 0.87, cy + R * 0.5], P: [cx - R * 0.87, cy + R * 0.5] };
  const names = { R: "RuBP (5C)", G: "GP (3C)", P: "TP (3C)" }, cols = { R: "#6fb1ff", G: "#ffb347", P: "#7fe3a0" };
  c.strokeStyle = "rgba(255,255,255,0.18)"; c.lineWidth = 16; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke();
  // moving dots show how fast each step runs
  const v1 = 0.5 * P.cf * cal.R, v2 = 0.8 * P.J * cal.G, v3 = 0.4 * P.J * cal.P, ph = performance.now() / 1000;
  const flow = (a0, a1, v, col) => { c.fillStyle = col; const n = 6; for (let k = 0; k < n; k++) { const f = ((ph * v * 0.8 + k / n) % 1), a = a0 + (a1 - a0) * f; c.beginPath(); c.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), 4, 0, 6.3); c.fill(); } };
  flow(-Math.PI / 2, Math.PI / 6, v1, "#ffb347"); flow(Math.PI / 6, Math.PI * 5 / 6, v2, "#7fe3a0"); flow(Math.PI * 5 / 6, Math.PI * 3 / 2, v3, "#6fb1ff");
  for (const k of ["R", "G", "P"]) { const [x, y] = pos[k], r = 16 + 26 * Math.sqrt(Math.max(0, cal[k])); c.fillStyle = cols[k]; c.globalAlpha = 0.9; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.globalAlpha = 1; label(c, names[k], x, y + 4, "#0b1020", "center", "600 12px"); label(c, cal[k].toFixed(2), x, y + r + 16, "#eef2f8", "center"); }
  label(c, `rubisco fixes CO₂ ${P.cf ? "" : "(no CO₂!)"}`, cx + R * 0.75, cy - R * 0.62, P.cf ? "#ffb347" : "#ff5d6c", "left", "600 12px");
  label(c, `ATP + reduced NADP ${P.J ? "(from the light)" : "(none: dark!)"}`, cx, cy + R + 50, P.J ? "#7fe3a0" : "#ff5d6c", "center", "600 12px");
  label(c, "ATP regenerates RuBP", cx - R * 0.8, cy - R * 0.62, "#6fb1ff", "right", "600 12px");
  c.strokeStyle = "#7fe3a0"; c.lineWidth = 3; c.beginPath(); c.moveTo(pos.P[0] - 40, pos.P[1] + 10); c.lineTo(pos.P[0] - 110, pos.P[1] + 60); c.stroke(); label(c, "→ glucose, starch, sucrose", pos.P[0] - 110, pos.P[1] + 78, "#7fe3a0", "center");
  label(c, P.J ? "☀ light on" : "☾ light off", 24, 30, P.J ? "#ffd166" : "#7d8aa5", "left", "600 14px"); label(c, P.cf ? "CO₂ supplied" : "CO₂ cut off", 24, 52, P.cf ? "#eef2f8" : "#ff5d6c", "left", "600 13px");
}

function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h);
  ({ pond: drawPond, leaf: drawLeaf, resp: drawResp, calvin: drawCalvin })[P.mode](c, w, h);
}
K.pointer(cv.el, {
  down(p) { if (P.mode === "pond" && geo.lx && Math.abs(p.x - geo.lx) < 40) dragLamp = true; },
  drag(p) { if (dragLamp) { P.d = Math.round(K.clamp((p.x - geo.x0) / geo.pxcm, 4, 60)); ctl.d.set(P.d); } },
  up() { dragLamp = false; }
});

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed;
  if (P.mode === "pond") {
    const ms = s * 4, rate = bubblesPerMin(P) * pond.piece;    // model seconds: one minute takes 15 s at × 1
    pond.t += ms; let n = poisson(rate / 60 * ms, rnd);
    for (let k = 0; k < n; k++) { pond.bub.push({ y: 0, dx: (rnd() - 0.5) * 8, r: 3 + rnd() * 2.5, v: 25 + rnd() * 15 }); if (pond.counting) pond.counting.n++; }
    for (const b of pond.bub) { b.y += b.v * s * 2; b.dx += (rnd() - 0.5) * 0.5; } pond.bub = pond.bub.filter(b => b.y < 95).slice(-200);   // bubbles burst at the surface
    if (pond.counting && pond.t - pond.counting.t0 >= 60) { pond.results.push([pond.counting.d, pond.counting.n]); pond.counting = null; }
  } else if (P.mode === "leaf") {
    const ms = s * (P.day ? 600 : 120); if (P.day) { leaf.hr = (leaf.hr + ms / 3600) % 24; }    // two model minutes per second at × 1
    const lux = P.day ? dayLux(leaf.hr, 20000) : P.lux, L = leafRate(lux, P.leafT), lights = [null, 0, 0.15 * lux, lux];
    for (let i = 1; i < 4; i++) leaf.tubes[i] = K.clamp(leaf.tubes[i] - 0.03 * leafRate(lights[i], P.leafT).net * ms, 40, 3000);
    leaf.hist.push([(leaf.hist.length ? leaf.hist[leaf.hist.length - 1][0] : 0) + ms / 3600, ...leaf.tubes]); if (leaf.hist.length > 900) leaf.hist = leaf.hist.filter((q, i) => i % 2 === 0);
    // molecules: spawn at a rate set by the net exchange, travelling through a stoma
    const b = geo.leafBox; if (b) { const n = poisson(Math.abs(L.net) * 3 * s * 3, rnd);
      for (let k = 0; k < n; k++) { const st = geo.stomata[rnd.int(2)], inside = [b[0] + rnd() * b[2], b[1] + rnd() * b[3]], outside = [st + (rnd() - 0.5) * 60, geo.ly + 70];
        const pair = L.net > 0 ? [["co2", outside, inside], ["o2", inside, outside]] : [["o2", outside, inside], ["co2", inside, outside]];
        for (const [kk, a, z] of pair) leaf.parts.push({ k: kk, x: a[0], y: a[1], path: [a, [st, geo.ly + 8], z], seg: 0, f: 0 }); }
      for (const p of leaf.parts) { p.f += s * 1.2; if (p.f >= 1) { p.f = 0; p.seg++; } if (p.seg < 2) { const A = p.path[p.seg], Z = p.path[p.seg + 1]; p.x = A[0] + (Z[0] - A[0]) * p.f; p.y = A[1] + (Z[1] - A[1]) * p.f; } }
      leaf.parts = leaf.parts.filter(p => p.seg < 2).slice(-300); }
  } else if (P.mode === "resp") {
    const ms = s * 4 / 60; if (resp.t < 10) {    // minutes: ten minutes take 2.5 minutes at × 1
      const O2 = o2Rate(P) * resp.k, shrink = P.absorb === "soda" ? O2 : O2 * (1 - resp.rq); resp.drift += 0.03 * rnd.gauss() * Math.sqrt(ms) * 68;
      resp.t = Math.min(10, resp.t + ms); resp.x = (shrink * resp.t + resp.drift) * mmPer; resp.xc = resp.drift * 0.8 * mmPer;
      if (resp.t - resp.log[resp.log.length - 1][0] >= 0.999 || resp.t >= 10 && resp.log[resp.log.length - 1][0] < 10) { resp.log.push([Math.round(resp.t), resp.x + 0.5 * rnd.gauss(), resp.xc + 0.5 * rnd.gauss()]); if (resp.t >= 10) { const rate = slope(resp.log.map(q => [q[0], q[1] - q[2]])) / mmPer / P.mass; resp.runs.push([P.rT, rate, P.org, P.absorb]); } }
    }
  } else { for (let k = 0; k < 10; k++) calvinStep(cal, s * 0.4 / 10, P.J, P.cf); if (!cal.log.length || cal.t - cal.log[cal.log.length - 1][0] > 0.1) { cal.log.push([cal.t, cal.R, cal.G, cal.P, cal.out]); if (cal.log.length > 500) cal.log.shift(); } }
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "pond") {
    const pr = pondRate(P), res = pond.results, model = []; for (let d = 4; d <= 60; d += 1) model.push([d, bubblesPerMin(Object.assign({}, P, { d }))]);
    chA.draw([{ pts: model, color: "#7d8aa5", dash: [5, 4], label: "model" }, { pts: res, type: "dots", color: "#ffd166", r: 4.5, label: "your counts" }], { xMin: 0, xMax: 60, yMin: 0 });
    const curves = [[2, "#6fb1ff", "2% CO₂"], [P.co2, "#ffd166", "now: " + P.co2 + "%"], [0.1, "#ff8a70", "0.1% CO₂"]].map(([co2, col, lab]) => { const pts = []; for (let I = 0; I <= 200; I += 4) { const d = 10 / Math.sqrt(Math.max(I, 0.5) / 100); pts.push([I, bubblesPerMin({ d, co2, T: P.T, lamp: "led" })]); } return { pts, color: col, label: lab }; });
    chB.draw(curves.concat([{ pts: [[lightAt(P.d, P.room), bubblesPerMin(P)]], type: "dots", color: "#fff", r: 5 }]), { xMin: 0, xMax: 200, yMin: 0, xLabel: "relative light intensity (1/d²)", yLabel: "bubbles per minute" });
    chA.opts.xLabel = "lamp distance (cm)"; chA.opts.yLabel = "bubbles per minute"; chB.opts.xLabel = "relative light intensity (∝ 1/d²)"; chB.opts.yLabel = "bubbles per minute";
    read.set("a", (bubblesPerMin(P) * pond.piece).toFixed(1)); read.set("b", pr.I.toFixed(0) + " (100 at 10 cm)"); read.set("c", pr.T.toFixed(1) + " °C"); read.set("d", pr.lim);
    ui.hud(`<b style="font-size:15px">${(bubblesPerMin(P) * pond.piece).toFixed(0)} bubbles a minute</b><br>limiting factor: <b>${pr.lim}</b>${res.length ? `<br>${res.length} count${res.length > 1 ? "s" : ""} recorded` : ""}`);
  } else if (P.mode === "leaf") {
    const lux = P.day ? dayLux(leaf.hr, 20000) : P.lux, L = leafRate(lux, P.leafT), curves = [10, 20, 30].map((T, i) => { const pts = []; for (let l = 0; l <= 20000; l += 250) pts.push([l, leafRate(l, T).net]); return { pts, color: ["#6fb1ff", "#7fe3a0", "#ff8a70"][i], label: T + " °C" }; });
    chA.opts.xLabel = "light (lux)"; chA.opts.yLabel = "net CO₂ uptake (µmol m⁻² s⁻¹)"; chB.opts.xLabel = "hours"; chB.opts.yLabel = "CO₂ in the tube (ppm)";
    chA.draw(curves.concat([{ pts: [[lux, L.net]], type: "dots", color: "#fff", r: 5 }]), { xMin: 0, xMax: 20000, hlines: [{ y: 0, color: "#ffd166", label: "compensation point where the curves cross this line" }] });
    const H = leaf.hist; chB.draw(["no leaf", "foil", "gauze", "full light"].map((n, i) => ({ pts: H.map(q => [q[0], q[i + 1]]), color: ["#7d8aa5", "#e8d44d", "#d6363e", "#9b4dca"][i], label: n })), { yMin: 0, hlines: [{ y: 420, color: "#7d8aa5", label: "air (red)" }] });
    read.set("a", L.gross.toFixed(2)); read.set("b", L.resp.toFixed(2)); read.set("c", (L.net >= 0 ? "+" : "") + L.net.toFixed(2)); read.set("d", P.day ? `${Math.floor(leaf.hr)}:${String(Math.floor((leaf.hr % 1) * 60)).padStart(2, "0")}` : "(steady light)");
    ui.hud(`net CO₂ uptake <b>${L.net >= 0 ? "+" : ""}${L.net.toFixed(2)}</b> µmol m⁻² s⁻¹<br><span style="color:var(--muted)">photosynthesis ${L.gross.toFixed(2)} − respiration ${L.resp.toFixed(2)}</span>`);
  } else if (P.mode === "resp") {
    const L = resp.log; chA.opts.xLabel = "time (min)"; chA.opts.yLabel = "distance moved (mm)"; chB.opts.xLabel = "temperature (°C)"; chB.opts.yLabel = "O₂ used (mm³ g⁻¹ min⁻¹)";
    const corr = L.map(q => [q[0], q[1] - q[2]]), f = L.length > 2 ? K.linfit(corr) : null;
    chA.draw([{ pts: L.map(q => [q[0], q[1]]), type: "dots", color: "#ff5d6c", r: 4, label: "organisms" }, { pts: L.map(q => [q[0], q[2]]), type: "dots", color: "#7d8aa5", r: 3.5, label: "control" }, { pts: corr, color: "#ffd166", label: "corrected" }].concat(f ? [{ pts: [[0, f.c], [10, f.c + 10 * f.m]], color: "#7fe3a0", dash: [5, 4], label: "best fit" }] : []), { xMin: 0, xMax: 10 });
    const theory = []; for (let T = 5; T <= 45; T++) theory.push([T, o2Rate({ org: P.org, mass: 1, T })]);
    chB.draw([{ pts: theory, color: "#7d8aa5", dash: [5, 4], label: "model (" + ORG[P.org].name.split(" ").pop() + ")" }, { pts: resp.runs.filter(q => q[3] === "soda").map(q => [q[0], q[1]]), type: "dots", color: "#ffd166", r: 4.5, label: "your runs (soda lime)" }], { xMin: 5, xMax: 45, yMin: 0 });
    const v = f ? f.m / mmPer : 0; read.set("a", (o2Rate(P) * resp.k).toFixed(1) + " mm³/min"); read.set("b", resp.x.toFixed(1) + " mm"); read.set("c", f ? `${f.m.toFixed(2)} mm/min = ${v.toFixed(2)} mm³/min` : "–"); read.set("d", resp.t.toFixed(1) + " of 10 min");
    const soda = resp.runs.filter(q => q[2] === P.org && q[3] === "soda" && q[0] === P.rT).pop(), wat = resp.runs.filter(q => q[2] === P.org && q[3] === "water" && q[0] === P.rT).pop();
    ui.hud(`<b>${ORG[P.org].name}</b>, ${P.mass} g at ${P.rT} °C<br>${resp.t >= 10 ? `rate <b>${(v / P.mass).toFixed(2)}</b> mm³ O₂ g⁻¹ min⁻¹` : "reading every minute…"}${soda && wat ? `<br>RQ = (soda − water) ÷ soda = <b>${((soda[1] - wat[1]) / soda[1]).toFixed(2)}</b>` : ""}`);
  } else {
    const L = cal.log; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "amount (relative)"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "TP used to make glucose";
    chA.draw([["RuBP", 1, "#6fb1ff"], ["GP", 2, "#ffb347"], ["TP", 3, "#7fe3a0"]].map(([n, i, col]) => ({ pts: L.map(q => [q[0], q[i]]), color: col, label: n })), { yMin: 0 });
    chB.draw([{ pts: L.map(q => [q[0], q[4]]), color: "#7fe3a0", label: "glucose made (cumulative)" }], { yMin: 0 });
    read.set("a", cal.R.toFixed(2)); read.set("b", cal.G.toFixed(2)); read.set("c", cal.P.toFixed(2)); read.set("d", (0.5 * P.cf * cal.R).toFixed(2) + " per s");
    ui.hud(`${P.J ? "☀ light on" : "☾ <b>light off</b>"} · ${P.cf ? "CO₂ on" : "<b>CO₂ cut</b>"}<br>RuBP ${cal.R.toFixed(2)} · GP ${cal.G.toFixed(2)} · TP ${cal.P.toFixed(2)}`);
  }
  // A level only: water in the respirometer and the Calvin cycle
  ctl.mode.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none"; ctl.absorb.el.querySelectorAll("button")[1].style.display = ui.level === "adv" ? "" : "none";
  if (ui.level !== "adv" && P.mode === "calvin") set({ mode: "pond" }); if (ui.level !== "adv" && P.absorb === "water") { P.absorb = "soda"; ctl.absorb.set("soda"); restartResp(); }
});
set({});
ui.tip("Drag the lamp along the ruler, then press 'Count for one minute' · switch set-ups at the top of the controls", 8000);
