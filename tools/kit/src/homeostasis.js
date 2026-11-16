/* =====================================================================
   HOMEOSTASIS
   Keeping conditions inside the body steady, by NEGATIVE FEEDBACK: a
   change is detected by receptors, a coordination centre responds, and
   effectors bring the value back towards normal.
     * BLOOD GLUCOSE: after a meal glucose rises; beta cells in the
       pancreas release INSULIN, which makes the liver and muscles take
       glucose in (the liver stores it as glycogen). When it falls, alpha
       cells release GLUCAGON and the liver releases glucose.
       Type 1 diabetes: no insulin made. Type 2: cells respond less to
       insulin and less is made.
     * BODY TEMPERATURE (about 37 °C): too hot → sweating, vasodilation;
       too cold → shivering, vasoconstriction (the hypothalamus controls
       it).
     * WATER: the kidneys filter the blood and reabsorb what is needed.
       If the blood is too concentrated, the pituitary releases ADH, the
       collecting ducts reabsorb more water, and a little concentrated
       urine is made.
   The models are simple, with typical values for an adult.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const clock = m => { const h = Math.floor(6 + m / 60) % 24, mm = Math.floor(m % 60); return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm; };
/* ---- blood glucose, one step of dt minutes from 06:00 ----
   G glucose (mmol/L), I insulin (relative), Gn glucagon (relative), gly liver glycogen (g), gut carbohydrate in the gut (g).
   o = { who: "none" | "t2" | "t1", treat: "none" | "insulin" | "metformin", walk, meals: [[minute, grams]], ins: [[minute, units]] } */
const MEALS = [[90, 60], [390, 80], [750, 90]];                                     // breakfast 07:30, lunch 12:30, dinner 18:30 (grams of carbohydrate)
function gluStep(s, o, dt) {
  const beta = o.who === "t1" ? 0 : o.who === "t2" ? 0.08 : 1, sens = (o.who === "t2" ? 0.12 : 1) * (o.treat === "metformin" ? 1.4 : 1) * (o.sensF || 1);
  for (const [m, g] of o.meals || MEALS) if (s.t <= m && s.t + dt > m) s.gut += g;
  for (const [m, u] of o.ins || []) if (s.t <= m && s.t + dt > m) s.depot += u;
  const absorb = 0.015 * s.gut, toBlood = absorb * 0.37;                          // 1 g of glucose in 15 L of fluid raises it by 0.37 mmol/L
  const secrete = beta * 0.9 * Math.pow(Math.max(0, s.G - 4.6), 1.3), injected = 0.04 * s.depot + (o.treat === "insulin" && o.who === "t1" ? 0.02 : 0);
  s.I += (secrete + injected * 6 - 0.12 * s.I) * dt; s.depot -= 0.04 * s.depot * dt;
  s.Gn += ((s.G < 4.8 ? (4.8 - s.G) * 2 : 0) - 0.2 * s.Gn) * dt;
  const muscle = 0.0045 * sens * s.I * s.G + (o.walk && s.t > 540 && s.t < 600 ? 0.025 : 0), brain = 0.035;
  const store = Math.min(0.006 * sens * s.I * s.G, s.gly < 100 ? 1 : 0), release = s.gly > 0 ? (0.035 + 0.05 * s.Gn) * (o.treat === "metformin" ? 0.65 : 1) * (o.who === "t2" ? 1.3 : 1) / (1 + 0.6 * s.I * sens) : 0;
  const urine = s.G > 10 ? 0.012 * (s.G - 10) : 0;
  s.G = Math.max(1.5, s.G + (toBlood + release - muscle - brain - store - urine) * dt); s.gut -= absorb * dt; s.gly = Math.max(0, Math.min(100, s.gly + (store - release) / 0.37 * 0.18 * dt)); s.t += dt;
  s.rates = { absorb: toBlood, release, muscle, store, urine, secrete };
}
const GLU0 = () => ({ t: 0, G: 5, I: 0.4, Gn: 0, gly: 70, gut: 0, depot: 0 });
function glucoseDay(o) { const s = GLU0(), pts = []; for (let k = 0; k < 1080; k++) { gluStep(s, o, 1); if (k % 5 === 0) pts.push([s.t, s.G, s.I, s.Gn, s.gly]); } return pts; }
function gtt(o) { const s = GLU0(); for (let k = 0; k < 120; k++) gluStep(s, Object.assign({}, o, { meals: [[0, 75]] }), 1); return s.G; }
/* ---- body temperature: heat made by the body (W) against heat lost; one step of dt minutes. 70 kg body, 245 kJ per °C */
function tempStep(s, o, dt) {
  const ctl = o.control !== false, err = s.T - 37, act = { rest: 0, walk: 220, run: 700 }[o.act];
  const shiver = ctl && err < -0.1 ? Math.min(400, 500 * (-err - 0.1)) : 0, sweat = ctl && err > 0.1 ? Math.min(1000, 900 * (err - 0.1)) * (1 - 0.8 * o.hum) : 0;
  const flow = ctl ? Math.max(0.35, Math.min(3, 1 + 2.2 * err)) : 1;          // skin blood flow: vasodilation (> 1) or vasoconstriction (< 1)
  const ins = { light: 1, normal: 0.6, warm: 0.3 }[o.clothes], kSkin = 9 * ins * (0.5 + 0.5 * flow);
  s.Tskin = (s.T * flow + o.air * 0.8) / (flow + 0.8);
  const made = 80 + act + shiver, lost = kSkin * (s.Tskin - o.air) + sweat;
  s.T += (made - lost) * 60 * dt / 245000; s.t += dt; s.fx = { made, lost, shiver, sweat, flow };
}
function coreAfter(o, mins = 180) { const s = { T: 37, Tskin: 33, t: 0 }; for (let k = 0; k < mins * 2; k++) tempStep(s, o, 0.5); return s; }
/* ---- water balance: body water W (L), solutes S (mOsm); osmolarity = S ÷ W. ADH rises above 285 mOsm/kg; urine flow falls as ADH rises */
function waterStep(s, o, dt) {
  const osm = s.S / s.W, adh = o.di ? 0 : 10 / (1 + Math.exp(-(osm - 284) / 1.5));          // ADH released by the pituitary as the blood gets more concentrated
  const urine = (0.4 + 15 * Math.exp(-(osm - 279) / 1.5) * (adh < 0.5 ? 1.5 : 1) + (o.di ? 8 : 0)) / 1000;   // L per minute: about 15 cm³/min when dilute, 0.4 when concentrated
  const sweat = o.heat ? 0.015 : 0, glucoseLoss = o.glu > 10 ? (o.glu - 10) * 0.6 : 0;
  s.W += (-Math.min(urine, 0.02) - sweat - 0.0005) * dt; s.S += (o.heat ? -sweat * 50 : 0) * dt; s.t += dt;     // solutes are excreted at the rate they are eaten, except salt lost in sweat
  s.osm = osm; s.adh = adh; s.urine = Math.min(urine, 0.02) * 1000; s.ug = glucoseLoss; s.vol += s.urine * dt;
}
const WAT0 = () => ({ W: 42, S: 42 * 285, t: 0, vol: 0 });
function urineAfterDrink(L, mins = 120) { const s = WAT0(); s.W += L; let v = 0; for (let k = 0; k < mins; k++) { waterStep(s, {}, 1); v += s.urine; } return v; }

// ---------------- The page ----------------
const P = { view: "glucose", who: "none", treat: "none", walk: false, air: 20, hum: 0.4, act: "rest", clothes: "normal", control: true, ecto: false, heat: false, glu: 5, di: false, pos: false };
let rnd = K.rng(Date.now() % 99991 + 31), speed = 1, GS = GLU0(), ghist = [], ins = [], TS = { T: 37, Tskin: 33, t: 0 }, thist = [], liz = { T: 30, sun: true }, WS = WAT0(), whist = [], FB = { x: 0, t: 0, hist: [] }, gtts = [], tg = 0;
const ui = K.app({
  title: "Homeostasis", subject: "Biology",
  blurb: "Blood glucose and diabetes, body temperature, the kidney and water balance, and negative feedback",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(j) co-ordination and response: homeostasis; insulin and the control of blood glucose with the liver's glycogen store; thermoregulation by the skin (sweating, vasodilation, vasoconstriction, shivering); hormones (ADH, adrenaline); 2(i) excretion: the kidney, ultrafiltration, selective reabsorption, ADH and osmoregulation (Biology only). Glucagon, negative feedback and diabetes types are beyond the 4BI1 wording.", adv: "OCR A level Biology A (H420) 5.1.1 communication and homeostasis (negative and positive feedback, endotherms and ectotherms), 5.1.2 excretion (the nephron, ADH, kidney failure), 5.1.4 hormonal communication (insulin, glucagon, diabetes types 1 and 2 and their treatment)." } },
  missions: [
    { title: "A day of meals", q: "Run a normal day. How high does blood glucose go after a meal, and how quickly does it come back? What does insulin do?", hint: "It rises to about 7–8 mmol/L after each meal and returns to about 5 within two hours. Beta cells detect the rise and release insulin; liver and muscle cells take up glucose and the liver stores it as glycogen. That is negative feedback.", setup() { set({ view: "glucose", who: "none" }); } },
    { title: "Type 1 diabetes", q: "Switch to type 1 diabetes with no treatment. What happens? Then give insulin injections with each meal.", hint: "No insulin is made, so glucose climbs above 15–20 mmol/L and spills into the urine. Injecting insulin before meals (matched to the carbohydrate) brings it back into a safer range: treatment, not a cure.", setup() { set({ view: "glucose", who: "t1", treat: "none" }); } },
    { title: "Type 2 diabetes", q: "Compare type 2 diabetes with and without metformin and a walk after lunch.", hint: "Cells respond poorly to insulin (insulin resistance), so glucose stays high for longer. Exercise uses glucose and improves sensitivity; metformin reduces glucose release by the liver. Diet and weight loss are the first treatment.", setup() { set({ view: "glucose", who: "t2" }); } },
    { title: "Glucose tolerance test", q: "Run a glucose tolerance test (75 g of glucose, measured after 2 hours) for each type of person. Which are above 11.1 mmol/L (diabetes)?", hint: "No diabetes: under 7.8 mmol/L at 2 hours. Type 2: often above 11.1. Type 1 untreated: very high. The test shows how well the body brings glucose back down.", setup() { set({ view: "glucose", who: "none" }); runGTT(); } },
    { title: "A hot day", q: "Put the person in 38 °C air and make them run. How does the body keep its core temperature near 37 °C?", hint: "Sweat glands release sweat, which cools the skin as it evaporates; arterioles to the skin dilate (vasodilation), so more blood flows near the surface and loses heat. In humid air sweat evaporates less, so it works less well.", setup() { set({ view: "temp", air: 38, act: "run", hum: 0.3 }); } },
    { title: "Out in the cold", q: "Put the person in 0 °C air in light clothes. What responses keep them warm? Then switch off the control.", hint: "Shivering (muscles contract, releasing heat), vasoconstriction (less blood to the skin, so less heat lost), hairs stand up. With no control, the core temperature keeps falling: hypothermia.", setup() { set({ view: "temp", air: 0, act: "rest", clothes: "light" }); } },
    { title: "Drinking and ADH", q: "Drink a litre of water. What happens to ADH and the amount of urine? Then try a hot day with no drink.", hint: "The blood becomes more dilute, so the pituitary releases less ADH; the collecting ducts become less permeable, less water is reabsorbed, and lots of dilute urine is made. On a hot day sweating concentrates the blood, ADH rises and a little concentrated urine is made.", setup() { set({ view: "kidney" }); drink(1); } },
    { title: "Glucose in the urine", q: "Raise blood glucose above 10 mmol/L. What appears in the urine? Why?", hint: "All glucose is normally reabsorbed in the proximal tubule, but the carriers can only take up so much. Above about 10 mmol/L (the renal threshold) some is left in the urine: a sign of untreated diabetes.", setup() { set({ view: "kidney", glu: 14 }); } },
    { lvl: "adv", title: "Endotherm and ectotherm", q: "Compare the person with a lizard as the air temperature changes. How does the lizard control its temperature?", hint: "Mammals (endotherms) make heat internally and keep their core temperature constant over a wide range of air temperatures. The lizard (an ectotherm) depends on outside heat and controls its temperature by behaviour: basking in the sun, moving to the shade.", setup() { set({ view: "temp", ecto: true, air: 20 }); } },
    { lvl: "adv", title: "Positive feedback", q: "Switch the feedback loop to positive feedback and disturb it. What happens? Where does this happen in the body?", hint: "Positive feedback increases the change instead of reversing it, so it runs away. It is useful only for things that must finish quickly: oxytocin in childbirth, blood clotting, the action potential (Na⁺ channels). Homeostasis uses negative feedback.", setup() { set({ view: "fb", pos: true }); } }
  ],
  batch: [
    { title: "Glucose tolerance test", question: "Blood glucose 2 hours after drinking 75 g of glucose, for different people.", how: "1 no diabetes, 2 type 2 diabetes, 3 type 1 (untreated). Each person's insulin sensitivity varies ±20%; meter ±0.3 mmol/L. WHO: under 7.8 normal, 11.1 or more diabetes.", xLabel: "person (1 none, 2 type 2, 3 type 1)", yLabel: "glucose at 2 hours (mmol/L)", xs: [1, 2, 3], reps: 8, yMin: 0, run: (x, r) => gtt({ who: ["none", "t2", "t1"][x - 1], treat: "none", sensF: 1 + 0.2 * r.gauss() }) + 0.3 * r.gauss(), note: "People without diabetes are back near normal; type 2 is usually above 11.1 mmol/L; type 1 untreated is very high." },
    { title: "Insulin sensitivity and the peak after a meal", question: "How does insulin sensitivity change the highest glucose reached after lunch?", how: "Lunch of 80 g carbohydrate; insulin sensitivity from 20% to 120% of normal; meter ±0.2 mmol/L.", xLabel: "insulin sensitivity (× normal)", yLabel: "peak glucose after lunch (mmol/L)", xs: [0.2, 0.4, 0.6, 0.8, 1, 1.2], reps: 3, yMin: 0, run: (x, r) => { const d = glucoseDay({ who: "none", treat: "none", sensF: x }); return Math.max(...d.filter(q => q[0] > 390 && q[0] < 600).map(q => q[1])) + 0.2 * r.gauss(); }, note: "The less sensitive the cells, the higher and longer the peak: insulin resistance is the start of type 2 diabetes." },
    { title: "Core temperature against air temperature", question: "After 3 hours at rest, how does core temperature depend on the air temperature? (Dashed: the same body with no control.)", how: "Normal clothes, 40% humidity; individual variation ±0.1 °C.", xLabel: "air temperature (°C)", yLabel: "core temperature (°C)", xs: [-5, 0, 5, 10, 15, 20, 25, 30, 35, 40], reps: 3, theory: a => coreAfter({ air: a, hum: 0.4, act: "rest", clothes: "normal", control: false }).T, theoryLabel: "no control", run: (x, r) => coreAfter({ air: x, hum: 0.4, act: "rest", clothes: "normal", control: true }).T + 0.1 * r.gauss(), note: "With the hypothalamus in control the core stays within about a degree of 37 °C over a huge range of air temperatures; without control it follows the surroundings." },
    { title: "Sweating and air temperature", question: "How much heat does sweating remove while walking, at different air temperatures?", how: "Walking, normal clothes, 40% humidity, after 1 hour.", xLabel: "air temperature (°C)", yLabel: "heat lost by sweating (W)", xs: [10, 15, 20, 25, 30, 35, 40], reps: 3, yMin: 0, run: (x, r) => coreAfter({ air: x, hum: 0.4, act: "walk", clothes: "normal", control: true }, 60).fx.sweat * (1 + 0.05 * r.gauss()), note: "Walking makes enough heat that some sweating is needed even in cool air; it doubles by 40 °C, because the hotter the air, the less heat the skin can lose by radiation and convection." },
    { title: "Drinking and urine", question: "How much urine is made in 2 hours after drinking different volumes of water?", how: "Drink at time 0; ±5% measurement.", xLabel: "water drunk (litres)", yLabel: "urine in 2 hours (cm³)", xs: [0, 0.25, 0.5, 0.75, 1, 1.5], reps: 3, yMin: 0, run: (x, r) => urineAfterDrink(x) * (1 + 0.05 * r.gauss()), note: "More water drunk → more dilute blood → less ADH → more urine. The kidneys get rid of the extra water within a couple of hours." },
    { title: "The renal threshold", question: "How much glucose appears in the urine at different blood glucose concentrations?", how: "All glucose is reabsorbed up to about 10 mmol/L; above that the carriers are saturated. ±5%.", xLabel: "blood glucose (mmol/L)", yLabel: "glucose lost in urine (mmol per hour)", xs: [4, 6, 8, 10, 12, 14, 16, 18, 20], reps: 3, yMin: 0, theory: g => g > 10 ? (g - 10) * 0.6 : 0, theoryLabel: "model", run: (x, r) => (x > 10 ? (x - 10) * 0.6 : 0) * (1 + 0.05 * r.gauss()), note: "None below the threshold, then rising in proportion: a positive urine test for glucose (Benedict's or a dipstick) suggests diabetes." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2.81", text: "Homeostasis: maintaining a constant internal environment (glucose, temperature, water) despite changes inside and outside the body." },
      { lvl: "std", tag: "4BI1 2.94", text: "High blood glucose → pancreas releases insulin → liver and muscle cells take up glucose; the liver converts it to glycogen. (Beyond 4BI1: low glucose → glucagon → glycogen to glucose.)" },
      { lvl: "std", tag: "beyond 4BI1", text: "Type 1 diabetes: no insulin made; treated with insulin injections. Type 2: cells stop responding to insulin; treated with diet, exercise, drugs (metformin) and sometimes insulin." },
      { lvl: "std", tag: "4BI1 2.93", text: "Too hot: sweating (evaporation cools the skin), vasodilation (more blood near the surface). Too cold: shivering, vasoconstriction, hairs raised. Controlled by the hypothalamus." },
      { lvl: "std", tag: "4BI1 2.77B", text: "Kidney: ultrafiltration in the glomerulus; selective reabsorption of glucose (proximal tubule); water reabsorbed in the collecting duct under the control of ADH." },
      { lvl: "std", tag: "4BI1 2.79B", text: "Blood too concentrated → pituitary releases ADH → collecting ducts more permeable → more water reabsorbed → small volume of concentrated urine." },
      { lvl: "adv", tag: "H420 5.1.1", text: "Negative feedback reverses a change and keeps a value near its set point; positive feedback amplifies a change (childbirth, clotting, action potentials)." },
      { lvl: "adv", tag: "H420 5.1.4", text: "Beta cells: glucose enters by GLUT2, ATP closes K⁺ channels, depolarisation opens Ca²⁺ channels, insulin released by exocytosis. Glucagon (alpha cells) stimulates glycogenolysis and gluconeogenesis." },
      { lvl: "adv", tag: "H420 5.1.1", text: "Endotherms make heat internally and regulate physiologically; ectotherms depend on external heat and regulate by behaviour (basking, shade)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how the body responds to a rise in blood glucose after a meal.", ans: "<ul><li>the pancreas detects the rise and releases insulin</li><li>insulin makes liver and muscle cells take up glucose</li><li>the liver converts glucose to glycogen, so the level falls back to normal</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain how sweating and vasodilation cool the body.", ans: "<ul><li>sweat evaporates from the skin, using heat energy from the skin</li><li>vasodilation: arterioles to the skin widen</li><li>more blood flows near the surface, so more heat is lost by radiation</li></ul>" },
      { lvl: "std", marks: 3, q: "On a hot day a person makes a small volume of dark urine. Explain why.", ans: "<ul><li>water lost in sweat makes the blood more concentrated</li><li>the pituitary releases more ADH</li><li>the collecting ducts reabsorb more water, so little, concentrated urine is made</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Blood glucose rose from 5.0 to ${(GS.G > 5.5 ? GS.G : 8).toFixed(1)} mmol/L after a meal. Calculate the percentage increase.`, ans: () => { const g = GS.G > 5.5 ? GS.G : 8; return `<ul><li>increase = ${(g - 5).toFixed(1)} mmol/L</li><li>% increase = ${(g - 5).toFixed(1)} ÷ 5.0 × 100 = ${((g - 5) / 5 * 100).toFixed(0)}%</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Explain why glucose is found in the urine of a person with untreated diabetes.", ans: "<ul><li>blood glucose is so high that more is filtered than the tubule carriers can reabsorb</li><li>the extra glucose stays in the filtrate and passes into the urine</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain the difference between negative and positive feedback, with an example of each.", ans: "<ul><li>negative feedback reverses a change, returning the value to the set point (e.g. blood glucose, temperature)</li><li>positive feedback increases the change further</li><li>e.g. oxytocin and contractions in childbirth, or blood clotting</li></ul>" }
    ]
  },
  notes: `<h3>The models (simple, typical adult values)</h3>
<ul><li><b>Glucose</b> (1-minute steps from 06:00): carbohydrate is absorbed from the gut; beta cells release insulin in proportion to the rise above about 4.6 mmol/L (none in type 1, less in type 2); insulin drives uptake by muscle and storage as glycogen in the liver; below about 4.8 mmol/L glucagon makes the liver release glucose; the brain uses glucose steadily; above 10 mmol/L some is lost in urine. Type 2: insulin sensitivity 12% of normal and a much smaller insulin response from the beta cells. Treatments: insulin injected with meals (1 unit per 10 g carbohydrate) plus a background dose; metformin (less release by the liver, better sensitivity); a walk after lunch.</li>
<li><b>Temperature</b>: heat made (80 W at rest, more with activity and shivering) against heat lost from the skin (depends on air temperature, clothes and skin blood flow) and by sweating (less in humid air). The hypothalamus control switches sweating, shivering and vasodilation/constriction on in proportion to the error from 37 °C.</li>
<li><b>Water</b>: body water and solutes give the blood's concentration; ADH rises above about 283 mOsm/kg; urine flow falls as ADH rises (from about 14 to 0.5 cm³ per minute).</li></ul>
<h3>Simplifications</h3>
<ul><li>One compartment for glucose and water; no fat, adrenaline, exercise hormones or individual differences beyond the settings. Not medical advice.</li>
<li>The earlier version's nephron diagram, urine tests and colorimeter, kidney failure and dialysis, and the beta-cell and cAMP signalling diagrams are not included here.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/homeostasis.html">original/homeostasis.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "glucose", options: [["glucose", "🩸 Blood glucose"], ["temp", "🌡️ Body temperature"], ["kidney", "🫘 Kidney and water"], ["fb", "📡 Feedback"]], on: v => set({ view: v }) });
grp.glucose = g = ui.group("A day");
ctl.who = K.seg(g, { label: "Person", value: "none", options: [["none", "no diabetes"], ["t2", "type 2"], ["t1", "type 1"]], on: v => set({ view: "glucose", who: v, treat: P.treat, walk: P.walk }) });
ctl.treat = K.seg(g, { label: "Treatment", value: "none", options: [["none", "none"], ["insulin", "insulin injections"], ["metformin", "metformin"]], on: v => set({ view: "glucose", who: P.who, treat: v, walk: P.walk }) });
ctl.walk = K.toggle(g, { label: "Walk after lunch (15:00–16:00)", value: false, on: v => set({ view: "glucose", who: P.who, treat: P.treat, walk: v }) });
let rg = K.row(g); K.btn(rg, "🧪 Glucose tolerance test", () => runGTT(), "primary"); K.btn(rg, "↺ Start the day again", () => restartGlu());
grp.temp = g = ui.group("Conditions");
ctl.air = K.slider(g, { label: "Air temperature", min: -10, max: 45, step: 1, value: 20, unit: "°C", on: v => P.air = v });
ctl.hum = K.slider(g, { label: "Humidity", min: 0, max: 1, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.hum = v });
ctl.act = K.seg(g, { label: "Activity", value: "rest", options: [["rest", "resting"], ["walk", "walking"], ["run", "running"]], on: v => P.act = v });
ctl.clothes = K.seg(g, { label: "Clothes", value: "normal", options: [["light", "light"], ["normal", "normal"], ["warm", "warm"]], on: v => P.clothes = v });
ctl.control = K.toggle(g, { label: "Hypothalamus control working", value: true, on: v => P.control = v });
ctl.ecto = K.toggle(g, { label: "Compare a lizard (ectotherm, A level)", value: false, on: v => P.ecto = v });
grp.kidney = g = ui.group("Water");
let rk = K.row(g); K.btn(rk, "💧 Drink 0.5 L", () => drink(0.5), "primary"); K.btn(rk, "💧 Drink 1 L", () => drink(1)); K.btn(rk, "🧂 Salty meal", () => { WS.S += 900; });
ctl.heat = K.toggle(g, { label: "Exercise in the heat (sweating)", value: false, on: v => P.heat = v });
ctl.glu = K.slider(g, { label: "Blood glucose", min: 4, max: 20, step: 0.5, value: 5, unit: "mmol/L", on: v => P.glu = v });
ctl.di = K.toggle(g, { label: "No ADH made (diabetes insipidus, A level)", value: false, on: v => P.di = v });
grp.fb = g = ui.group("Feedback loop");
let rf = K.row(g); K.btn(rf, "⚡ Disturb it", () => { FB.x += 3; }, "primary"); K.btn(rf, "Disturb the other way", () => { FB.x -= 3; });
ctl.pos = K.toggle(g, { label: "Positive feedback instead (A level)", value: false, on: v => { P.pos = v; FB = { x: 0.3, t: 0, hist: [] }; } });
ctl.speed = K.slider(ui.group("Watch"), { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function insPlan() { return P.who === "t1" && P.treat === "insulin" ? MEALS.map(([m, gr]) => [m - 15, gr / 20]) : P.who === "t2" && P.treat === "insulin" ? MEALS.map(([m, gr]) => [m - 15, gr / 20]) : []; }
function gopts() { return { who: P.who, treat: P.treat, walk: P.walk, ins: insPlan() }; }
function restartGlu() { GS = GLU0(); ghist = []; }
function runGTT() { const v = gtt({ who: P.who, treat: "none" }); gtts.push({ who: P.who, v }); if (gtts.length > 9) gtts.shift(); ui.tip(`Glucose tolerance test (${({ none: "no diabetes", t2: "type 2", t1: "type 1" })[P.who]}): ${v.toFixed(1)} mmol/L after 2 hours`, 4000); }
function drink(L) { WS.W += L; }
function set(o) {
  Object.assign(P, { who: "none", treat: "none", walk: false, air: 20, hum: 0.4, act: "rest", clothes: "normal", control: true, ecto: false, heat: false, glu: 5, di: false, pos: false }, o);
  for (const k of ["view", "who", "treat", "act", "clothes"]) ctl[k].set(P[k]); for (const k of ["air", "hum", "glu"]) ctl[k].set(P[k]); for (const k of ["walk", "control", "ecto", "heat", "di", "pos"]) ctl[k].set(P[k]);
  for (const k in grp) grp[k].style.display = k === P.view ? "" : "none";
  restartGlu(); TS = { T: 37, Tskin: 33, t: 0 }; thist = []; liz = { T: 30, sun: true }; WS = WAT0(); whist = []; FB = { x: P.pos ? 0.3 : 0, t: 0, hist: [] };
  relabel({ glucose: ["time", "blood glucose", "insulin · glucagon", "liver glycogen"], temp: ["core temperature", "skin temperature", "heat made · heat lost", "response"], kidney: ["blood concentration", "ADH", "urine flow", "glucose in urine"], fb: ["value", "difference from normal", "response", "kind of feedback"] }[P.view]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrow(c, x1, y1, x2, y2, col, w = 2, lab) { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 9 * Math.cos(a - 0.4), y2 - 9 * Math.sin(a - 0.4)); c.lineTo(x2 - 9 * Math.cos(a + 0.4), y2 - 9 * Math.sin(a + 0.4)); c.fill(); if (lab) TX(c, lab, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6, col, "left", "11px"); }
function organ(c, x, y, w, h, lab, col) { c.fillStyle = col; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, 6.3); c.fill(); c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); TX(c, lab, x, y + 4, "#eef2f8", "center", "600 12px"); }
function drawGlucose(c, w, h) {
  const s = GS, r = s.rates || {}, bx = w * 0.5, by = h * 0.5;
  organ(c, w * 0.18, h * 0.3, 60, 30, "gut", "#c9a27a"); organ(c, w * 0.18, h * 0.72, 70, 36, "liver", "#a8524a"); organ(c, w * 0.82, h * 0.3, 55, 28, "pancreas", "#ffd166"); organ(c, w * 0.82, h * 0.72, 60, 30, "muscle", "#ff8a70"); organ(c, w * 0.5, h * 0.14, 46, 26, "brain", "#c9a0ff");
  c.fillStyle = "rgba(255,93,108,0.18)"; c.beginPath(); c.ellipse(bx, by, 90, 60, 0, 0, 6.3); c.fill(); TX(c, "blood", bx, by - 18, "#ff5d6c", "center", "600 13px"); TX(c, `${s.G.toFixed(1)} mmol/L`, bx, by + 6, "#eef2f8", "center", "700 18px");
  const W = v => 1 + Math.min(9, v * 40);
  arrow(c, w * 0.18 + 60, h * 0.3, bx - 80, by - 20, "#c9a27a", W(r.absorb || 0), "absorbed");
  arrow(c, w * 0.18 + 70, h * 0.72 - 10, bx - 85, by + 20, "#a8524a", W(r.release || 0), "released (glucagon)");
  arrow(c, bx - 80, by + 35, w * 0.18 + 60, h * 0.72 + 15, "#7fe3a0", W(r.store || 0), "stored as glycogen (insulin)");
  arrow(c, bx + 85, by + 20, w * 0.82 - 60, h * 0.72, "#ff8a70", W(r.muscle || 0), "taken up (insulin)");
  arrow(c, bx, by - 60, bx, h * 0.14 + 26, "#c9a0ff", 2, "used by the brain");
  arrow(c, w * 0.82 - 55, h * 0.3 + 10, bx + 88, by - 25, "#ffd166", W((s.I || 0) / 10), "insulin");
  // gauge
  const gx = 30, gy = h - 40, gw = w * 0.4; c.fillStyle = "#222b40"; c.fillRect(gx, gy, gw, 10); const X = v => gx + (v - 2) / 18 * gw;
  c.fillStyle = "rgba(127,227,160,0.5)"; c.fillRect(X(4), gy, X(7.8) - X(4), 10); c.fillStyle = "#ffd166"; c.fillRect(X(s.G) - 2, gy - 4, 4, 18);
  TX(c, "hypo < 4", X(3), gy + 26, "#ff8a70", "center", "10.5px"); TX(c, "normal", X(5.9), gy + 26, "#7fe3a0", "center", "10.5px"); TX(c, "high > 11", X(14), gy + 26, "#ff5d6c", "center", "10.5px");
  TX(c, `${clock(s.t)} · ${({ none: "no diabetes", t2: "type 2 diabetes", t1: "type 1 diabetes" })[P.who]}${P.treat !== "none" ? " · " + P.treat : ""}`, 20, 24, "#eef2f8", "left", "600 13px");
}
function drawTemp(c, w, h) {
  const s = TS, f = s.fx || {}, px = w * 0.3, py = h * 0.55, sk = Math.max(0, Math.min(1, (f.flow || 1) - 0.35) / 2.65);
  // a person: skin colour shows blood flow (vasodilation reddens the skin)
  c.fillStyle = `rgb(${Math.round(200 + 50 * sk)},${Math.round(160 - 30 * sk)},${Math.round(140 - 40 * sk)})`; c.beginPath(); c.arc(px, py - 120, 26, 0, 6.3); c.fill(); c.fillRect(px - 32, py - 90, 64, 120); c.fillRect(px - 30, py + 30, 22, 90); c.fillRect(px + 8, py + 30, 22, 90);
  if ((f.sweat || 0) > 20) { c.fillStyle = "#6fb1ff"; for (let i = 0; i < Math.min(12, f.sweat / 40); i++) { c.beginPath(); c.arc(px - 30 + ((i * 23) % 60), py - 80 + ((i * 37 + tg * 40) % 110), 3, 0, 6.3); c.fill(); } }
  if ((f.shiver || 0) > 10) TX(c, "shivering", px, py - 160, "#ffd166", "center", "600 12px");
  arrow(c, px + 40, py - 40, px + 140, py - 40, "#ff8a70", 1 + Math.min(10, (f.lost || 0) / 60), `heat lost ${(f.lost || 0).toFixed(0)} W`);
  TX(c, `heat made ${(f.made || 0).toFixed(0)} W`, px, py + 140, "#ffd166", "center", "12px");
  TX(c, `${P.air} °C air, ${(P.hum * 100).toFixed(0)}% humidity · ${P.act}${P.control ? "" : " · CONTROL OFF"}`, 20, 24, "#eef2f8", "left", "600 13px");
  const x = w * 0.58; let y = 70; const L = (q, col = "#aab6cc") => { TX(c, q, x, y, col, "left", "12.5px"); y += 22; };
  L(`core ${s.T.toFixed(2)} °C`, Math.abs(s.T - 37) < 0.5 ? "#7fe3a0" : "#ff5d6c"); L(`skin ${s.Tskin.toFixed(1)} °C`);
  L(f.flow > 1.2 ? "vasodilation: skin arterioles wide" : f.flow < 0.8 ? "vasoconstriction: skin arterioles narrow" : "skin blood flow normal");
  if ((f.sweat || 0) > 5) L(`sweating: ${f.sweat.toFixed(0)} W removed`, "#6fb1ff"); if ((f.shiver || 0) > 5) L(`shivering: ${f.shiver.toFixed(0)} W extra`, "#ffd166");
  if (P.ecto) { const lx = w * 0.62, ly = h * 0.78; c.fillStyle = liz.sun ? "#ffd166" : "#3a4560"; c.beginPath(); c.arc(lx - 40, ly - 50, 16, 0, 6.3); c.fill(); c.fillStyle = "#6fc06a"; c.beginPath(); c.ellipse(lx + (liz.sun ? 0 : 120), ly, 34, 10, 0, 0, 6.3); c.fill(); TX(c, `lizard ${liz.T.toFixed(1)} °C · ${liz.sun ? "basking in the sun" : "in the shade"}`, lx - 40, ly + 30, "#6fc06a", "left", "12px"); }
}
function drawKidney(c, w, h) {
  const s = WS, nx = w * 0.12, ny = 70;
  // a nephron drawn simply: glomerulus, proximal tubule, loop of Henle, collecting duct
  c.strokeStyle = "#c9a27a"; c.lineWidth = 8; c.beginPath(); c.arc(nx + 30, ny + 30, 22, 0, 6.3); c.stroke();
  c.beginPath(); c.moveTo(nx + 52, ny + 30); c.lineTo(nx + 160, ny + 30); c.lineTo(nx + 160, h - 90); c.lineTo(nx + 200, h - 90); c.lineTo(nx + 200, ny + 60); c.lineTo(nx + 280, ny + 60); c.lineTo(nx + 280, h - 50); c.stroke();
  TX(c, "glomerulus: filtration", nx, ny - 4, "#c9a27a", "left", "11px"); TX(c, "glucose reabsorbed", nx + 70, ny + 18, "#7fe3a0", "left", "11px"); TX(c, "loop of Henle", nx + 165, h - 70, "#aab6cc", "left", "11px"); TX(c, "collecting duct", nx + 290, h / 2, "#aab6cc", "left", "11px");
  const adh = s.adh || 0; for (let i = 0; i < Math.round(adh * 1.5); i++) arrow(c, nx + 276, ny + 90 + i * 22, nx + 236, ny + 90 + i * 22, "#6fb1ff", 2);
  TX(c, adh > 3 ? "lots of water reabsorbed (ADH high)" : adh > 0.5 ? "some water reabsorbed" : "little water reabsorbed (ADH low)", nx + 290, h / 2 + 20, "#6fb1ff", "left", "11.5px");
  if (P.glu > 10) TX(c, "glucose left in the filtrate", nx + 70, ny + 50, "#ff5d6c", "left", "600 11px");
  // bladder
  const bx = w * 0.78, by = h * 0.6, fill = Math.min(1, s.vol / 500); c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.beginPath(); c.ellipse(bx, by, 60, 70, 0, 0, 6.3); c.stroke();
  const conc = Math.min(1, ((s.osm || 285) - 270) / 40 + (adh / 10)); c.fillStyle = `rgba(${Math.round(240 - 20 * conc)},${Math.round(230 - 90 * conc)},${Math.round(120 - 80 * conc)},0.8)`; c.fillRect(bx - 50, by + 60 - 120 * fill, 100, 120 * fill);
  TX(c, `${s.vol.toFixed(0)} cm³ of urine`, bx, by + 95, "#eef2f8", "center", "12px"); TX(c, "bladder", bx, by - 80, "#aab6cc", "center", "11px");
  TX(c, `${clock(s.t)}`, 20, 24, "#eef2f8", "left", "600 13px");
}
function drawFB(c, w, h) {
  const steps = ["change detected", "receptors", "coordination centre", "effectors", "response"], cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.32;
  steps.forEach((s, i) => { const a = -Math.PI / 2 + i / steps.length * 2 * Math.PI, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a); c.fillStyle = "#1b2438"; c.strokeStyle = "#56607a"; c.beginPath(); c.arc(x, y, 46, 0, 6.3); c.fill(); c.stroke(); TX(c, s, x, y + 4, "#eef2f8", "center", "12px"); const a2 = -Math.PI / 2 + (i + 1) / steps.length * 2 * Math.PI; arrow(c, x + 46 * Math.cos(a + 0.9), y + 46 * Math.sin(a + 0.9), cx + R * Math.cos(a2) - 46 * Math.cos(a2 - 0.9), cy + R * Math.sin(a2) - 46 * Math.sin(a2 - 0.9), "#7d8aa5", 2); });
  TX(c, P.pos ? "POSITIVE feedback: the response makes the change bigger" : "NEGATIVE feedback: the response reverses the change", cx, cy - 6, P.pos ? "#ff5d6c" : "#7fe3a0", "center", "600 13px");
  TX(c, `value ${(37 + FB.x * 0.3).toFixed(2)} (normal 37.00)`, cx, cy + 18, "#ffd166", "center", "12.5px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ glucose: drawGlucose, temp: drawTemp, kidney: drawKidney, fb: drawFB })[P.view](c, w, h); }

// ---------------- Charts ----------------
let refDay = null, refKey = "";
function charts() {
  if (P.view === "glucose") {
    const key = JSON.stringify(gopts()); if (key !== refKey) { refKey = key; refDay = glucoseDay({ who: "none", treat: "none" }); }
    chA.opts.title = "Blood glucose through the day"; chA.opts.xLabel = "time"; chA.opts.yLabel = "mmol/L"; chA.opts.xFmt = v => clock(v);
    chA.draw([{ pts: refDay.map(q => [q[0], q[1]]), color: "#56607a", dash: [5, 4], label: "no diabetes" }, { pts: ghist.map(q => [q[0], q[1]]), color: "#ff5d6c", label: "this person" }], { xMin: 0, xMax: 1080, yMin: 0, yMax: Math.max(12, ...ghist.map(q => q[1] * 1.1)), bands: [{ x0: 0, x1: 1080, color: "rgba(0,0,0,0)" }], hlines: [{ y: 4, color: "#ff8a70", label: "hypo" }, { y: 11.1, color: "#ff5d6c", label: "high" }] });
    if (gtts.length) { chB.opts.title = "Glucose tolerance tests (2 hours after 75 g)"; chB.opts.xLabel = ""; chB.opts.yLabel = "mmol/L"; chB.opts.xFmt = whole(v => gtts[Math.round(v)] ? ({ none: "none", t2: "type 2", t1: "type 1" })[gtts[Math.round(v)].who] : ""); chB.draw([{ pts: gtts.map((q, i) => [i, q.v]), type: "bars", w: 0.6, color: "#ffd166" }], { xMin: -0.6, xMax: Math.max(3, gtts.length) - 0.4, yMin: 0, hlines: [{ y: 7.8, color: "#7fe3a0", label: "normal below 7.8" }, { y: 11.1, color: "#ff5d6c", label: "diabetes 11.1+" }] }); }
    else { chB.opts.title = "Insulin, glucagon and liver glycogen"; chB.opts.xLabel = "time"; chB.opts.yLabel = "relative"; chB.opts.xFmt = v => clock(v); chB.draw([{ pts: ghist.map(q => [q[0], q[2]]), color: "#ffd166", label: "insulin" }, { pts: ghist.map(q => [q[0], q[3] * 5]), color: "#c9a0ff", label: "glucagon" }, { pts: ghist.map(q => [q[0], q[4] / 10]), color: "#a8524a", label: "glycogen ÷ 10 (g)" }], { xMin: 0, xMax: 1080, yMin: 0 }); }
    read.set("a", clock(GS.t)); read.set("b", GS.G.toFixed(1) + " mmol/L"); read.set("c", `${GS.I.toFixed(1)} · ${GS.Gn.toFixed(2)}`); read.set("d", GS.gly.toFixed(0) + " g");
    ui.hud(GS.G > 11 ? "Too high: not enough insulin effect" : GS.G < 4 ? "Too low (hypoglycaemia)" : GS.rates && GS.rates.absorb > 0.05 ? "Glucose absorbed from the meal; insulin released" : "Steady: negative feedback");
  } else if (P.view === "temp") {
    chA.opts.title = "Core and skin temperature"; chA.opts.xLabel = "minutes"; chA.opts.yLabel = "°C"; chA.opts.xFmt = null;
    chA.draw([{ pts: thist.map(q => [q[0], q[1]]), color: "#ff8a70", label: "core" }, { pts: thist.map(q => [q[0], q[2]]), color: "#ffd166", label: "skin" }].concat(P.ecto ? [{ pts: thist.map(q => [q[0], q[5]]), color: "#6fc06a", label: "lizard" }] : []), { xMin: Math.max(0, TS.t - 180), xMax: Math.max(180, TS.t), hlines: [{ y: 37, color: "#7fe3a0", label: "37 °C" }] });
    chB.opts.title = "Responses"; chB.opts.xLabel = "minutes"; chB.opts.yLabel = "W (or ×100 for blood flow)"; chB.opts.xFmt = null;
    chB.draw([{ pts: thist.map(q => [q[0], q[3]]), color: "#6fb1ff", label: "sweating (W)" }, { pts: thist.map(q => [q[0], q[4]]), color: "#ffd166", label: "shivering (W)" }, { pts: thist.map(q => [q[0], q[6] * 100]), color: "#ff5d6c", label: "skin blood flow × 100" }], { xMin: Math.max(0, TS.t - 180), xMax: Math.max(180, TS.t), yMin: 0 });
    const f = TS.fx || {};
    read.set("a", TS.T.toFixed(2) + " °C"); read.set("b", TS.Tskin.toFixed(1) + " °C"); read.set("c", `${(f.made || 0).toFixed(0)} · ${(f.lost || 0).toFixed(0)} W`); read.set("d", (f.sweat || 0) > 10 ? "sweating, vasodilation" : (f.shiver || 0) > 10 ? "shivering, vasoconstriction" : "none needed");
    ui.hud(!P.control ? "No control: the core temperature drifts with the surroundings" : "The hypothalamus keeps the core near 37 °C");
  } else if (P.view === "kidney") {
    chA.opts.title = "Urine flow and ADH"; chA.opts.xLabel = "minutes"; chA.opts.yLabel = "cm³ per minute · ADH"; chA.opts.xFmt = null;
    chA.draw([{ pts: whist.map(q => [q[0], q[2]]), color: "#ffd166", label: "urine flow" }, { pts: whist.map(q => [q[0], q[3]]), color: "#6fb1ff", label: "ADH" }], { xMin: Math.max(0, WS.t - 240), xMax: Math.max(240, WS.t), yMin: 0 });
    chB.opts.title = "Blood concentration"; chB.opts.xLabel = "minutes"; chB.opts.yLabel = "mOsm per kg"; chB.opts.xFmt = null;
    chB.draw([{ pts: whist.map(q => [q[0], q[1]]), color: "#ff8a70", label: "blood" }], { xMin: Math.max(0, WS.t - 240), xMax: Math.max(240, WS.t), yMin: 270, yMax: 305, hlines: [{ y: 285, color: "#7fe3a0", label: "normal" }] });
    read.set("a", (WS.osm || 285).toFixed(1) + " mOsm/kg"); read.set("b", (WS.adh || 0).toFixed(2)); read.set("c", (WS.urine || 0).toFixed(2) + " cm³/min"); read.set("d", P.glu > 10 ? "yes (above the renal threshold)" : "none");
    ui.hud((WS.adh || 0) > 3 ? "Blood concentrated: ADH high, little concentrated urine" : (WS.adh || 0) < 0.5 ? "Blood dilute: ADH low, lots of dilute urine" : "Water balance about right");
  } else {
    chA.opts.title = P.pos ? "Positive feedback: runaway" : "Negative feedback: back to normal"; chA.opts.xLabel = "time"; chA.opts.yLabel = "value"; chA.opts.xFmt = null;
    chA.draw([{ pts: FB.hist.map(q => [q[0], 37 + q[1] * 0.3]), color: P.pos ? "#ff5d6c" : "#7fe3a0", label: "value" }], { xMin: Math.max(0, FB.t - 30), xMax: Math.max(30, FB.t), yMin: 34, yMax: 40, hlines: [{ y: 37, color: "#56607a", label: "normal" }] });
    chB.opts.title = "Response"; chB.opts.xLabel = "time"; chB.opts.yLabel = "effector activity"; chB.opts.xFmt = null;
    chB.draw([{ pts: FB.hist.map(q => [q[0], (P.pos ? 1 : -1) * q[1]]), color: "#ffd166", label: P.pos ? "adds to the change" : "opposes the change" }], { xMin: Math.max(0, FB.t - 30), xMax: Math.max(30, FB.t) });
    read.set("a", (37 + FB.x * 0.3).toFixed(2)); read.set("b", (FB.x * 0.3).toFixed(2)); read.set("c", P.pos ? "increases the change" : "reverses the change"); read.set("d", P.pos ? "positive" : "negative");
    ui.hud(P.pos ? "Positive feedback: useful only when something must finish quickly" : "Press 'Disturb it' and watch the value return");
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; tg += dt;
  if (P.view === "glucose" && GS.t < 1080) { const mins = dt * 20 * speed, n = Math.ceil(mins); for (let k = 0; k < n; k++) gluStep(GS, gopts(), mins / n); ghist.push([GS.t, GS.G, GS.I, GS.Gn, GS.gly]); }
  if (P.view === "temp") { const mins = dt * 3 * speed, n = Math.ceil(mins * 2); for (let k = 0; k < n; k++) tempStep(TS, P, mins / n); if (P.ecto) { const target = P.air + (liz.sun ? 12 : 0); liz.T += (target - liz.T) * 0.03 * mins; if (liz.T > 37) liz.sun = false; if (liz.T < 30) liz.sun = true; } const f = TS.fx; thist.push([TS.t, TS.T, TS.Tskin, f.sweat, f.shiver, liz.T, f.flow]); if (thist.length > 3000) thist.shift(); }
  if (P.view === "kidney") { const mins = dt * 4 * speed; waterStep(WS, P, mins); whist.push([WS.t, WS.osm, WS.urine, WS.adh]); if (whist.length > 3000) whist.shift(); }
  if (P.view === "fb") { const d = dt * speed; FB.x += (P.pos ? 0.35 : -0.6) * FB.x * d; FB.x = Math.max(-10, Math.min(10, FB.x)); FB.t += d; FB.hist.push([FB.t, FB.x]); if (FB.hist.length > 2000) FB.hist.shift(); }
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({ view: "glucose" });
ui.tip("Four views at the top of the controls: blood glucose, body temperature, the kidney and water, and feedback.", 7000);
