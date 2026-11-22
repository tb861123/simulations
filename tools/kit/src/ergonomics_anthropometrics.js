/* =====================================================================
   ERGONOMICS AND ANTHROPOMETRICS
   ANTHROPOMETRICS is the measurement of people's bodies; ERGONOMICS
   uses it so products fit the people who use them. Body sizes are close
   to a NORMAL distribution, described by a mean and a standard deviation.
   A PERCENTILE says what fraction of people are smaller: the 5th
   percentile stature is the height 5% of people are below.
        nth percentile = mean + z × SD   (z = −1.645 for the 5th, +1.645 for the 95th)
   Designers usually aim to fit the middle 90% (5th to 95th percentile):
     CLEARANCE (doorways, seat widths, leg room): design for the LARGEST
       users (95th or 99th percentile), since small people fit too.
     REACH (controls, shelves, pedals): design for the SMALLEST users
       (5th percentile), since tall people can reach too.
     ADJUSTABILITY (chairs, desks, car seats): cover a range, say the
       5th percentile woman to the 95th percentile man.
   Men and women together form a MIXED population whose percentiles are
   not simply the average of the two.
   ===================================================================== */
// ---------------- Body dimensions (mm) for UK adults: mean and SD (based on published tables such as Pheasant's; rounded) ----------------
const DIM = {
  stature: { name: "stature (height)", m: [1755, 70], f: [1625, 62], c: [1440, 70] },
  pop: { name: "popliteal height (floor to back of knee, sitting)", m: [440, 25], f: [400, 22], c: [370, 24] },
  elbow: { name: "elbow height (standing)", m: [1090, 50], f: [1010, 45], c: [900, 48] },
  reach: { name: "forward grip reach", m: [780, 40], f: [705, 35], c: [630, 35] },
  hip: { name: "hip breadth (sitting)", m: [360, 30], f: [380, 35], c: [300, 25] }
};
const POPS = { mixed: "adults (men and women)", m: "men", f: "women", c: "children aged 11" };
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
function zOf(p) { let lo = -6, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }   // inverse normal
const pct = (d, sex, p) => DIM[d][sex][0] + zOf(p / 100) * DIM[d][sex][1];          // nth percentile for one sex
const cdf = (d, pop, x) => pop === "mixed" ? 0.5 * Phi((x - DIM[d].m[0]) / DIM[d].m[1]) + 0.5 * Phi((x - DIM[d].f[0]) / DIM[d].f[1]) : Phi((x - DIM[d][pop][0]) / DIM[d][pop][1]);   // fraction of the population below x
function pctPop(d, pop, p) { if (pop !== "mixed") return pct(d, pop, p); let lo = 0, hi = 3000; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cdf(d, pop, m) < p / 100) lo = m; else hi = m; } return (lo + hi) / 2; }
// A person drawn at random: their dimensions are correlated with their size (a tall person tends to have long legs too)
function person(pop, r) { const sex = pop === "mixed" ? (r() < 0.5 ? "m" : "f") : pop, z = r.gauss(), o = { sex }; for (const k in DIM) o[k] = DIM[k][sex][0] + DIM[k][sex][1] * (0.75 * z + 0.66 * r.gauss()); return o; }

/* ---------------- The design briefs ----------------
   fits(person, design) says whether a person is accommodated. Allowances: shoes 25 mm, headroom 50 mm, worktop 100 mm below the elbow (±60 mm is comfortable). */
const BRIEFS = {
  door: { name: "Doorway height", kind: "clearance", dim: "stature", unit: "door height", lo: 1700, hi: 2300, def: 1980, fits: (p, d) => p.stature + 25 + 50 <= d.a, need: (p) => p.stature + 75, tip: "clearance: design for the tallest (95th–99th percentile man)" },
  shelf: { name: "Reach to a control panel", kind: "reach", dim: "reach", unit: "distance from seat back", lo: 500, hi: 900, def: 760, fits: (p, d) => p.reach >= d.a, need: p => p.reach, tip: "reach: design for the smallest (5th percentile woman)" },
  chair: { name: "Adjustable chair seat height", kind: "range", dim: "pop", unit: "seat height range", lo: 330, hi: 560, def: 420, fits: (p, d) => { const ideal = p.pop + 25; return ideal >= d.a - 15 && ideal <= d.b + 15; }, need: p => p.pop + 25, tip: "adjustability: cover the 5th percentile woman to the 95th percentile man" },
  bench: { name: "Kitchen worktop height", kind: "range", dim: "elbow", unit: "worktop height", lo: 750, hi: 1100, def: 910, fits: (p, d) => { const ideal = p.elbow + 25 - 100; return Math.abs(ideal - d.a) <= 60 || (d.b > d.a && ideal >= d.a - 60 && ideal <= d.b + 60); }, need: p => p.elbow - 75, tip: "a compromise: one fixed height can't suit everyone; adjustable or two-level worktops can" }
};

// ---------------- The page ----------------
const DEF = { brief: "door", pop: "mixed", a: 1980, adj: 0, p: 50, sex: "f", n: 400, speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), crowd = [], survey = [], tt = 0, walker = 0;
const ui = K.app({
  title: "Ergonomics and Anthropometrics", subject: "Design and Technology",
  blurb: "Percentiles, normal distributions and design ranges: doorways, reach, adjustable chairs and worktops tried by a crowd of simulated users",
  reset: () => set({ brief: P.brief }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "AQA GCSE Design and Technology (8552) 3.3 Designing and making principles: ergonomics and anthropometrics, using percentile data (5th to 95th percentile) to design products that fit users; reading data tables and charts.", adv: "AQA A level Product Design (7552) 3.1.8 Requirements for product design and development (ergonomics and anthropometrics); 3.2.1 Design methods (user-centred design); maths: percentiles, mean and standard deviation, the normal distribution, sampling. Mixed-population percentiles and correlation between dimensions are beyond the spec." } },
  missions: [
    { title: "How tall should a door be?", q: "Set the door height so that 95% of adults walk through without ducking. Which percentile and which sex decides it?", hint: "Clearance: design for the tallest. The 95th percentile of all adults is about 1,845 mm (almost all of the tallest 5% are men), + 75 mm for shoes and headroom ≈ 1,920 mm. Standard UK doors are 1,981 mm (6'6\"), which fits about 98.5% of men and nearly every woman.", setup() { set({ brief: "door", a: 1800 }); } },
    { title: "Can everyone reach?", q: "Place the control panel so 95% of adults can reach it. Do you design for the tallest or the shortest?", hint: "Reach: design for the smallest. The 5th percentile of adults' grip reach is about 660 mm (5th percentile woman: 647 mm), so the control must be no further than that; then almost everyone can reach.", setup() { set({ brief: "shelf", a: 760 }); } },
    { title: "One chair for everyone?", q: "A fixed seat height of 420 mm. What fraction of adults is comfortable? Make the seat adjustable: what range fits 90%?", hint: "A fixed seat fits only those whose popliteal height (+25 mm shoe) is close to it: about 30%. Adjusting from about 390 to 505 mm covers the 5th percentile woman to the 95th percentile man.", setup() { set({ brief: "chair", a: 420, adj: 0 }); } },
    { title: "Percentiles on the curve", q: "Move the percentile slider. Find the 5th, 50th and 95th percentile heights of women. How far is each from the mean, in SDs?", hint: "5th = mean − 1.645 SD = 1,625 − 102 = 1,523 mm; 50th = mean = 1,625 mm; 95th = 1,727 mm. The same z-values work for any normally distributed dimension.", setup() { set({ brief: "door", pop: "f", p: 5 }); } },
    { lvl: "adv", title: "Mixed populations", q: "Compare the 95th percentile stature of men alone with that of all adults. Is it the average of the men's and women's 95th percentiles?", hint: "No: the mixed 95th percentile (about 1,845 mm) is much closer to the men's (1,870 mm) than to the women's (1,727 mm), because nearly all of the tallest 5% of adults are men. Designing for 'the 95th percentile' needs saying of whom.", setup() { set({ brief: "door", pop: "mixed", p: 95 }); } },
    { lvl: "adv", title: "Children are users too", q: "Change the population to children aged 11. Where must the worktop and control panel be for a school design-technology room?", hint: "Everything shifts: children's elbows are ~110 mm lower than women's, and their reach is shorter. Choose data for the actual users; a design for adults can exclude children (and vice versa).", setup() { set({ brief: "bench", pop: "c", a: 910 }); } },
    { lvl: "adv", title: "A small survey", q: "Run a class survey of 30 people and estimate the 5th percentile reach. How close is it to the true value? Run it again.", hint: "Estimates of extreme percentiles from small samples are unreliable (scattered by about ±13 mm, and biased): only one or two people are below the 5th percentile in a sample of 30. Large published datasets are better for design.", setup() { set({ brief: "shelf" }); doSurvey(); } }
  ],
  batch: [
    { title: "Door height and the percentile designed for", question: "What fraction of adults fits through a door designed for a given percentile of men's stature?", how: "Door = men's percentile stature + 75 mm; 500 random adults per run.", xLabel: "men's stature percentile designed for", yLabel: "adults accommodated (%)", xs: [50, 75, 90, 95, 99, 99.9], reps: 5, yMin: 0, yMax: 100, theory: q => 100 * cdf("stature", "mixed", pct("stature", "m", q)), theoryLabel: "mixed-population normal CDF", run: (q, r) => { const d = { a: pct("stature", "m", q) + 75 }; let n = 0; for (let i = 0; i < 500; i++) if (BRIEFS.door.fits(person("mixed", r), d)) n++; return n / 5; }, note: "Designing for the 95th percentile man accommodates about 97.5% of all adults (all but 5% of men and a few women). Beyond the 99th percentile each step costs height for very few extra people." },
    { title: "Adjustable chair: range against fit", question: "How does the fraction of adults who fit depend on how far the seat adjusts?", how: "Seat range centred on 450 mm; a person fits if popliteal height + 25 mm is within the range ± 15 mm.", xLabel: "adjustment range (mm)", yLabel: "adults accommodated (%)", xs: [0, 20, 40, 60, 80, 100, 120, 160], reps: 5, yMin: 0, yMax: 100, theory: w => 100 * (cdf("pop", "mixed", 450 + w / 2 + 15 - 25) - cdf("pop", "mixed", 450 - w / 2 - 15 - 25)), theoryLabel: "normal CDF of the range", run: (w, r) => { const d = { a: 450 - w / 2, b: 450 + w / 2 }; let n = 0; for (let i = 0; i < 500; i++) if (BRIEFS.chair.fits(person("mixed", r), d)) n++; return n / 5; }, note: "Each extra centimetre of adjustment helps less than the last: the tails of the distribution are thin. About 75 mm of adjustment fits around 90%; 100 mm fits about 97%." },
    { title: "Surveying 30 people", question: "If a class measures 30 adults' reach, how good is their 5th percentile estimate?", how: "5th percentile estimated as the 2nd smallest of 30 (with interpolation); mixed adults.", yLabel: "estimated 5th percentile reach (mm)", reps: 300, bins: 20, theory: pctPop("reach", "mixed", 5), theoryLabel: "true 5th percentile", run: (x, r) => { const v = []; for (let i = 0; i < 30; i++) v.push(person("mixed", r).reach); v.sort((a, b) => a - b); const pos = 0.05 * 29; return v[Math.floor(pos)] + (pos % 1) * (v[Math.floor(pos) + 1] - v[Math.floor(pos)]); }, note: "The estimates scatter by about ±13 mm and sit a little high on average: a design based on a small survey could exclude more people than intended. Use large published datasets, or calculate the percentile from the mean and SD." },
    { title: "From the mean and SD instead (A level)", question: "If the same 30 measurements are used to estimate the 5th percentile as mean − 1.645 SD, is it better?", how: "Same samples of 30 adults; for women only (one normal distribution).", yLabel: "estimated 5th percentile reach (mm)", reps: 300, bins: 20, theory: pct("reach", "f", 5), theoryLabel: "true 5th percentile", run: (x, r) => { const v = []; for (let i = 0; i < 30; i++) v.push(person("f", r).reach); return K.mean(v) - 1.645 * K.sd(v); }, note: "Using all 30 numbers (through the mean and SD) gives a tighter estimate than counting from the bottom, as long as the data really are normal. For a mixed population (two humps) the shortcut is biased." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "8552 3.3", text: "Anthropometrics: data about body sizes. Ergonomics: designing products for efficient, safe and comfortable use by people." },
      { lvl: "std", tag: "8552 3.3", text: "Designers usually use the 5th to 95th percentile range, fitting 90% of users. Percentile tables give each dimension for men, women and children." },
      { lvl: "std", tag: "8552 3.3", text: "Clearance (headroom, doorways, seat width): use the largest (95th) percentile. Reach (controls, shelves): use the smallest (5th). Adjustable products cover the range." },
      { lvl: "adv", tag: "7552 3.1.8", text: "Body dimensions are approximately normal: nth percentile = mean + z × SD; z(5th) = −1.645, z(95th) = +1.645, z(99th) = +2.33. 'Designing for the average' fits few people well." },
      { lvl: "adv", tag: "7552 3.2.1", text: "User-centred design: identify the actual user group (age, sex, nationality, disability) and use the right dataset; test prototypes with real users." },
      { lvl: "beyond", tag: "Beyond", text: "Mixed-population percentiles aren't averages of the sexes' percentiles. Different dimensions are only partly correlated: nobody is 'a 95th percentile person' in every dimension." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why a designer would use 95th percentile data for the width of a cinema seat.", ans: "<ul><li>Seat width is a clearance dimension (1)</li><li>if it fits the largest users it fits everyone smaller; 5th percentile would exclude most people (1).</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Women's ${DIM.stature.name} has mean ${DIM.stature.f[0]} mm and SD ${DIM.stature.f[1]} mm. Calculate the 95th percentile.`, ans: () => `<ul><li>95th = mean + 1.645 × SD (1)</li><li>= ${DIM.stature.f[0]} + 1.645 × ${DIM.stature.f[1]} (1)</li><li>= ${Math.round(DIM.stature.f[0] + 1.645 * DIM.stature.f[1])} mm (1)</li></ul>` },
      { lvl: "adv", marks: 6, q: "A designer is creating an office chair for an international company. Discuss how anthropometric data should be used.", ans: "<ul><li>Identify users: adults of both sexes and different nationalities (different datasets); disabled users.</li><li>Seat height adjustable from 5th percentile female to 95th percentile male popliteal height (+ shoes); seat width 95th percentile hip breadth (female).</li><li>Seat depth for 5th percentile buttock–popliteal length; test with users; consider comfort over time and posture (ergonomics).</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Each dimension for men, women and 11-year-olds is a normal distribution with the mean and SD shown in the readings (rounded UK values in the style of published tables). Percentiles: mean + z × SD. For the mixed adult population the fraction below x is the average of the men's and women's normal CDFs.</li>
<li>Simulated people: each has an overall 'size' shared by all their dimensions (correlation about 0.56 between any two), plus individual variation.</li>
<li>Fit rules: a door fits if stature + 25 mm shoes + 50 mm headroom ≤ door height; a control is reachable if grip reach ≥ its distance; a chair fits if popliteal height + 25 mm is within the seat range ± 15 mm; a worktop suits a person if it is within ±60 mm of 100 mm below their elbow (with shoes).</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Real body sizes are not exactly normal and vary with age, ethnicity and generation; data are rounded and illustrative.</li><li>Clothing, posture and personal preference are reduced to fixed allowances.</li><li>Only one dimension is tested per brief (real products have many).</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The design");
ctl.brief = K.seg(g, { value: "door", options: Object.entries(BRIEFS).map(([k, b]) => [k, b.name]), on: v => set({ brief: v, pop: P.pop }) });
ctl.a = K.slider(g, { label: "Size of the design", min: 300, max: 2300, step: 5, value: 1980, unit: "mm", on: v => P.a = v });
ctl.adj = K.slider(g, { label: "Adjustment range (chair, worktop)", min: 0, max: 200, step: 5, value: 0, fmt: v => v ? "+" + v + " mm" : "fixed", on: v => P.adj = v });
ctl.pop = K.seg(g, { label: "Users", value: "mixed", options: Object.entries(POPS), on: v => { P.pop = v; newCrowd(); } });
g = ui.group("Percentiles");
ctl.p = K.slider(g, { label: "Show the person at percentile", min: 1, max: 99, step: 1, value: 50, fmt: v => v + (v % 10 === 1 && v !== 11 ? "st" : v % 10 === 2 && v !== 12 ? "nd" : v % 10 === 3 && v !== 13 ? "rd" : "th"), on: v => P.p = v });
ctl.sex = K.seg(g, { value: "f", options: [["f", "woman"], ["m", "man"], ["c", "child"]], on: v => P.sex = v });
ctl.speed = K.slider(g, { label: "Speed of the crowd", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed, { label: "Crowd speed" });   // playback speed lives in the header, beside Pause and Reset
let rr = K.row(g); K.btn(rr, "📏 Survey 30 people", () => doSurvey(), "primary"); K.btn(rr, "New crowd", () => newCrowd());
const read = K.readout(ui.group("Readings"), [["fit", "users accommodated (crowd)"], ["th", "accommodated (theory)"], ["p5", "5th percentile (users)"], ["p50", "50th percentile (mean)"], ["p95", "95th percentile (users)"], ["you", "the person shown"], ["sv", "survey of 30: 5th / 95th"]]);
const design = () => { const b = BRIEFS[P.brief]; return { a: P.a, b: b.kind === "range" ? P.a + P.adj : P.a }; };
function newCrowd() { crowd = []; for (let i = 0; i < P.n; i++) crowd.push(person(P.pop, rnd)); survey = []; }
function doSurvey() { survey = []; for (let i = 0; i < 30; i++) survey.push(BRIEFS[P.brief].need(person(P.pop, rnd))); survey.sort((a, b) => a - b); }
function set(o) { const b = BRIEFS[o.brief || DEF.brief]; Object.assign(P, DEF, { a: b.def }, o); const ai = ctl.a.el.querySelector("input"); ai.min = b.lo; ai.max = b.hi; ctl.a.set(P.a); for (const k of ["brief", "adj", "pop", "p", "sex", "speed"]) ctl[k].set(P[k]); ctl.adj.el.style.display = b.kind === "range" ? "" : "none"; newCrowd(); }
function theoryFit() { // fraction accommodated, from the normal CDFs
  const b = BRIEFS[P.brief], d = design(), pop = P.pop;
  if (P.brief === "door") return cdf("stature", pop, d.a - 75);
  if (P.brief === "shelf") return 1 - cdf("reach", pop, d.a);
  if (P.brief === "chair") return cdf("pop", pop, d.b + 15 - 25) - cdf("pop", pop, d.a - 15 - 25);
  return cdf("elbow", pop, d.b + 60 + 75) - cdf("elbow", pop, d.a - 60 + 75);
}
// ---------------- Simulation: people from the crowd try the design one by one ----------------
let tried = [];
function tick(dt) { tt += dt * P.speed * 3; while (tt >= 1) { tt--; const p = crowd[walker++ % crowd.length]; tried.push(BRIEFS[P.brief].fits(p, design())); if (tried.length > 200) tried.shift(); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// a simple figure: stature H (mm), standing or sitting; scale s px per mm; feet at (x, y)
function figure(c, x, y, s, who, pose, col, alpha = 1) {
  const H = who.stature, head = H * 0.13, sh = H * 0.82, hipY = H * 0.53, kneeY = who.pop - 25 + 25; c.globalAlpha = alpha; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(2, 9 * s * 10); c.lineCap = "round";
  const L = (a, b, d, e) => { c.beginPath(); c.moveTo(x + a * s, y - b * s); c.lineTo(x + d * s, y - e * s); c.stroke(); };
  if (pose === "stand") { L(0, 0, 0, hipY); L(0, hipY, 0, sh); c.beginPath(); c.arc(x, y - (sh + head * 0.6) * s, head * 0.45 * s, 0, 6.3); c.fill(); L(0, sh, 0, who.elbow + 25); L(0, who.elbow + 25, 260, who.elbow + 25); }
  else { const seat = who.seat; L(who.thigh || 450, 0, who.thigh || 450, kneeY); L(who.thigh || 450, kneeY, 0, seat); const back = seat + H * 0.31; L(0, seat, 0, back); c.beginPath(); c.arc(x, y - (back + head * 0.65) * s, head * 0.45 * s, 0, 6.3); c.fill(); L(0, back - 40, who.reach * 0.98, back - 120); }
  c.lineCap = "butt"; c.lineWidth = 1; c.globalAlpha = 1;
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, b = BRIEFS[P.brief], d = design(); c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  TX(c, `${b.name} · ${POPS[P.pop]} · ${b.tip}`, 20, 30, "#eef2f8", "left", "600 14px");
  // the scene (left)
  const floor = h - 50, s = (h - 110) / 2300, x0 = 90; c.strokeStyle = "#55627f"; c.beginPath(); c.moveTo(20, floor); c.lineTo(w * 0.55, floor); c.stroke();
  const sexP = P.sex, mk = q => { const o = { sex: sexP }; for (const k in DIM) o[k] = pct(k, sexP, q); return o; };
  const you = mk(P.p), small = (() => { const o = {}; for (const k in DIM) o[k] = pct(k, "f", 5); return o; })(), big = (() => { const o = {}; for (const k in DIM) o[k] = pct(k, "m", 95); return o; })();
  const ok = b.fits(you, d), col = ok ? "#7ee787" : "#ff8a70";
  if (P.brief === "door") {
    const dx = x0 + 140; c.fillStyle = "#3a2c1e"; c.fillRect(dx - 12, floor - d.a * s, 14, d.a * s); c.fillRect(dx + 240, floor - d.a * s, 14, d.a * s); c.fillRect(dx - 12, floor - d.a * s - 14, 266, 14); TX(c, `${d.a} mm`, dx + 120, floor - d.a * s - 22, "#ffd166", "center", "600 13px");
    figure(c, dx + 40, floor, s, small, "stand", "#8fa0bf", 0.35); figure(c, dx + 190, floor, s, big, "stand", "#8fa0bf", 0.35); figure(c, dx + 115, floor, s, you, "stand", col);
    if (!ok) TX(c, "ducks!", dx + 115, floor - (you.stature + 120) * s, "#ff8a70", "center", "600 13px");
  } else if (P.brief === "shelf") {
    const seatH = 450, sx = x0; c.fillStyle = "#3a4a6b"; c.fillRect(sx - 20, floor - seatH * s, 70, 10); c.fillRect(sx - 20, floor - seatH * s, 10, 300 * s * -1 + 0); c.fillRect(sx - 24, floor - (seatH + 500) * s, 8, 500 * s);
    const px = sx + d.a * s; c.fillStyle = "#ffd166"; c.fillRect(px, floor - (seatH + 420) * s, 18, 60); TX(c, `control ${d.a} mm away`, px + 24, floor - (seatH + 390) * s, "#ffd166", "left", "600 12px");
    [[small, "#8fa0bf", 0.35], [big, "#8fa0bf", 0.35], [you, col, 1]].forEach(([q, cl, al]) => figure(c, sx, floor, s, Object.assign({}, q, { seat: seatH, thigh: 480 }), "sit", cl, al));
  } else if (P.brief === "chair") {
    const sx = x0 + 60; [[small, -0.2], [big, 0.2]].forEach(([q]) => {}); const seat = Math.max(d.a, Math.min(d.b, you.pop + 25));
    c.fillStyle = "#3a4a6b"; c.fillRect(sx - 30, floor - seat * s - 6, 190, 10); c.fillRect(sx + 60, floor - seat * s, 10, seat * s); if (d.b > d.a) { c.fillStyle = "rgba(255,209,102,0.25)"; c.fillRect(sx + 50, floor - d.b * s, 30, (d.b - d.a) * s); TX(c, `adjusts ${d.a}–${d.b} mm`, sx + 170, floor - d.b * s, "#ffd166", "left", "600 12px"); } else TX(c, `seat ${d.a} mm`, sx + 170, floor - d.a * s, "#ffd166", "left", "600 12px");
    figure(c, sx, floor, s, Object.assign({}, you, { seat, thigh: 470 }), "sit", col);
    const gap = seat - (you.pop + 25); TX(c, gap > 20 ? "feet dangle: pressure under the thighs" : gap < -20 ? "knees too high" : "feet flat, thighs level", sx + 170, floor - seat * s + 24, col, "left", "12px");
  } else {
    const wx = x0 + 120; c.fillStyle = "#3a4a6b"; c.fillRect(wx, floor - d.a * s, 280, 12); c.fillRect(wx + 10, floor - d.a * s, 10, d.a * s); c.fillRect(wx + 260, floor - d.a * s, 10, d.a * s); if (d.b > d.a) { c.fillStyle = "rgba(255,209,102,0.25)"; c.fillRect(wx, floor - d.b * s, 280, (d.b - d.a) * s); }
    TX(c, d.b > d.a ? `${d.a}–${d.b} mm` : `${d.a} mm`, wx + 140, floor - d.b * s - 10, "#ffd166", "center", "600 13px");
    figure(c, wx - 30, floor, s, small, "stand", "#8fa0bf", 0.35); figure(c, wx - 70, floor, s, big, "stand", "#8fa0bf", 0.35); figure(c, wx - 50, floor, s, you, "stand", col);
  }
  TX(c, `shown: ${P.p}th percentile ${{ f: "woman", m: "man", c: "child aged 11" }[P.sex]} (green = accommodated) · faint: 5th percentile woman and 95th percentile man`, 20, h - 18, "#8fa0bf", "left", "11.5px");
  // the crowd (right): each dot a person, by the dimension that matters
  const gx = w * 0.58, gw = w - gx - 20, gy = 104, gh = h - 180, dm = b.dim, vals = crowd.map(q => b.need(q)), lo = Math.min(...vals), hi = Math.max(...vals);
  TX(c, `${P.n} simulated users: ${DIM[dm].name}`, gx, gy - 14, "#eef2f8", "left", "600 12.5px");
  const X = v => gx + (v - lo) / (hi - lo || 1) * gw;
  crowd.forEach((q, i) => { const f = b.fits(q, d); c.fillStyle = f ? "#7ee787" : "#ff5c5c"; c.globalAlpha = 0.75; c.beginPath(); c.arc(X(b.need(q)), gy + ((i * 37) % 97) / 97 * gh * 0.8 + 10, q.sex === "m" ? 3.2 : 2.6, 0, 6.3); c.fill(); }); c.globalAlpha = 1;
  const lim = v => { c.strokeStyle = "#ffd166"; c.setLineDash([5, 3]); c.beginPath(); c.moveTo(X(v), gy); c.lineTo(X(v), gy + gh * 0.85); c.stroke(); c.setLineDash([]); };
  if (P.brief === "door") lim(d.a); else if (P.brief === "shelf") lim(d.a); else if (P.brief === "chair") { lim(d.a - 15); lim(d.b + 15); } else { lim(d.a - 60 + 0); lim(d.b + 60); }
  TX(c, Math.round(lo) + " mm", gx, gy + gh * 0.85 + 16, "#8fa0bf", "left", "11px"); TX(c, Math.round(hi) + " mm", gx + gw, gy + gh * 0.85 + 16, "#8fa0bf", "right", "11px");
  TX(c, `dot position = ${P.brief === "door" ? "stature + 75 mm" : P.brief === "shelf" ? "reach" : P.brief === "chair" ? "ideal seat height (popliteal + 25 mm)" : "ideal worktop (elbow − 75 mm)"}; larger dots are men`, gx, gy + gh * 0.85 + 32, "#8fa0bf", "left", "11px");
  const ok2 = tried.filter(Boolean).length; TX(c, `Last ${tried.length} users to try it: ${ok2} accommodated`, gx, h - 18, "#cfd8ea", "left", "600 12px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const b = BRIEFS[P.brief], d = design(), dm = b.dim, adv = ui.level === "adv";
  chA.opts.title = `Distribution of ${DIM[dm].name}`; chA.opts.xLabel = "mm"; chA.opts.yLabel = "relative frequency";
  const off = P.brief === "door" ? 75 : P.brief === "chair" ? 25 : P.brief === "bench" ? -75 : 0, sers = [];
  const pops = P.pop === "mixed" ? ["m", "f"] : [P.pop], all = pops.flatMap(sx => [DIM[dm][sx][0] - 3.2 * DIM[dm][sx][1], DIM[dm][sx][0] + 3.2 * DIM[dm][sx][1]]), x0 = Math.min(...all) + off, x1 = Math.max(...all) + off;
  pops.forEach(sx => { const [m, sd] = DIM[dm][sx], pts = []; for (let i = 0; i <= 100; i++) { const x = x0 + (x1 - x0) * i / 100; pts.push([x, Math.exp(-((((x - off) - m) / sd) ** 2) / 2) / sd]); } sers.push({ pts, type: "area", color: sx === "m" ? "#5ad1ff" : sx === "f" ? "#f78fd6" : "#ffd166", label: POPS[sx] }); });
  const vl = [{ x: pctPop(dm, P.pop, 5) + off, label: "5th", color: "#cfd8ea" }, { x: pctPop(dm, P.pop, 95) + off, label: "95th", color: "#cfd8ea" }, { x: d.a, label: "design", color: "#ffd166", row: 1 }]; if (d.b > d.a) vl.push({ x: d.b, color: "#ffd166", row: 1 });
  chA.draw(sers, { xMin: x0, xMax: x1, yMin: 0, vlines: vl });
  chB.opts.title = adv ? "Cumulative %: read percentiles off the curve" : "Survey of 30: sorted measurements"; chB.opts.xLabel = adv ? "mm" : "person (smallest to largest)"; chB.opts.yLabel = adv ? "% of users below" : "mm";
  if (adv) { const pts = []; for (let i = 0; i <= 100; i++) { const x = x0 + (x1 - x0) * i / 100; pts.push([x, 100 * cdf(dm, P.pop, x - off)]); } chB.draw([{ pts, color: "#c9a0ff", label: POPS[P.pop] }].concat(survey.length ? [{ pts: survey.map((v, i) => [v, 100 * (i + 0.5) / survey.length]), type: "dots", r: 3.5, color: "#ffd166", label: "survey" }] : []), { yMin: 0, yMax: 100, xMin: x0, xMax: x1, hlines: [{ y: 5, color: "#55627f" }, { y: 95, color: "#55627f" }] }); }
  else chB.draw(survey.length ? [{ pts: survey.map((v, i) => [i + 1, v]), type: "bars", w: 0.7, color: "#ffd166", label: "30 people" }] : [], { title: survey.length ? undefined : "Press 📏 Survey 30 people" });
  const fitN = crowd.filter(q => b.fits(q, d)).length;
  read.set("fit", (100 * fitN / crowd.length).toFixed(1) + "%"); read.set("th", (100 * theoryFit()).toFixed(1) + "%");
  read.set("p5", Math.round(pctPop(dm, P.pop, 5)) + " mm"); read.set("p50", Math.round(pctPop(dm, P.pop, 50)) + " mm"); read.set("p95", Math.round(pctPop(dm, P.pop, 95)) + " mm");
  read.set("you", `${Math.round(pct(dm, P.sex, P.p))} mm (z = ${zOf(P.p / 100).toFixed(2)})`);
  read.set("sv", survey.length > 2 ? `${Math.round(survey[1] + 0.45 * (survey[2] - survey[1]) - off)} / ${Math.round(survey[27] + 0.55 * (survey[28] - survey[27]) - off)} mm` : "–");
  ui.hud("nth percentile = mean + z × SD · z(5th) = −1.645, z(95th) = +1.645");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Each dot is a simulated person. Change the design until 95% of them are green.", 7000);
