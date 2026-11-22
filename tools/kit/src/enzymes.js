/* =====================================================================
   ENZYMES
   Enzymes are biological catalysts: proteins that speed up reactions
   without being used up. Each has an ACTIVE SITE, a pocket whose shape
   fits only its own substrate (like a lock and key).

   In this model every enzyme and substrate molecule is followed:
     * molecules drift about at random, faster when warmer
     * a substrate that bumps into a FREE enzyme's active site, and fits,
       binds: an enzyme-substrate complex
     * after a short time it is released as products, and the enzyme is
       free again, unchanged
     * pH changes the shape of the active site, so fewer substrates fit
     * too hot, and the enzyme's shape is permanently lost: denatured

   Nothing else is put in. The optimum temperature, the bell-shaped pH
   curve and the levelling-off at high substrate concentration all come
   out of molecules moving, colliding and fitting.
   ===================================================================== */
const ENZ = {
  amylase: { name: "amylase", sub: "starch", prod: "maltose", opt: 7, pHw: 1.6, Td: 55, col: "#6fb1ff", where: "saliva and small intestine" },
  pepsin: { name: "pepsin", sub: "protein", prod: "peptides", opt: 2, pHw: 1.3, Td: 57, col: "#ff8a70", where: "stomach (acid)" },
  trypsin: { name: "trypsin", sub: "protein", prod: "peptides", opt: 8, pHw: 1.4, Td: 56, col: "#c58cff", where: "small intestine" },
  catalase: { name: "catalase", sub: "hydrogen peroxide", prod: "water + oxygen", opt: 7, pHw: 2, Td: 54, col: "#7fe3a0", where: "liver and most cells" },
  taq: { name: "Taq polymerase", sub: "DNA building blocks", prod: "DNA", opt: 8, pHw: 1.5, Td: 92, Topt: 72, col: "#ffd166", where: "bacteria in hot springs (used in PCR)" }
};
const Q10 = 2;                 // each 10 °C rise doubles how fast a bound substrate is converted
const BOX = { w: 1, h: 0.62 };
class Tube {
  /* o: { enz, nE, nS, T (°C), pH, comp (competitive inhibitors), non (non-competitive), feed (keep substrate topped up) } */
  constructor(o, rand) {
    this.o = Object.assign({ enz: "amylase", nE: 12, nS: 120, T: 37, pH: 7, comp: 0, non: 0, feed: false }, o); this.rand = rand; this.t = 0; this.made = 0;
    const r = rand; this.E = []; this.S = []; this.I = []; this.P = [];
    for (let k = 0; k < this.o.nE; k++) this.E.push({ x: r() * BOX.w, y: r() * BOX.h, a: r() * 6.283, busy: 0, held: null, dead: false, blocked: null });
    for (let k = 0; k < this.o.nS; k++) this.S.push(this.newS());
    for (let k = 0; k < this.o.comp; k++) this.I.push({ x: r() * BOX.w, y: r() * BOX.h, kind: "comp", on: null, t: 0 });
    for (let k = 0; k < this.o.non; k++) this.I.push({ x: r() * BOX.w, y: r() * BOX.h, kind: "non", on: null, t: 0 });
  }
  newS() { const r = this.rand; return { x: r() * BOX.w, y: r() * BOX.h, a: r() * 6.283 }; }
  // how well the active site fits the substrate at this pH (1 = perfect): a bell curve around the optimum pH
  fit() { const E = ENZ[this.o.enz]; return Math.exp(-Math.pow((this.o.pH - E.opt) / E.pHw, 2)); }
  step(dt) {
    const o = this.o, E = ENZ[o.enz], r = this.rand, Tk = o.T + 273, jig = 0.07 * Math.sqrt(Tk / 310) * Math.sqrt(dt);   // random drift: faster when warmer
    const tcat = 1.0 * Math.pow(Q10, ((E.Topt || 37) - o.T) / 10), fit = this.fit(), kd = Math.exp((o.T - E.Td) / 2.6);       // time to convert a bound substrate; rate of denaturing
    const site = e => [e.x + Math.cos(e.a) * 0.03, e.y + Math.sin(e.a) * 0.03];
    for (const e of this.E) {
      if (!e.dead && r() < kd * dt) { e.dead = true; if (e.held) { this.S.push(e.held); e.held = null; } e.busy = 0; }      // heat breaks the bonds holding the enzyme's shape: permanent
      e.x += jig * 0.35 * gauss(r); e.y += jig * 0.35 * gauss(r); e.a += 0.6 * gauss(r) * Math.sqrt(dt); wrap(e);
      if (e.held) { e.busy -= dt; if (e.busy <= 0) { this.made++; this.P.push({ x: e.x, y: e.y, vx: 0.2 * gauss(r), vy: 0.2 * gauss(r), life: 1.5 }); e.held = null; if (o.feed) this.S.push(this.newS()); } }
    }
    for (const q of this.I) { if (q.on) { q.t -= dt; if (q.t <= 0) { q.on.blocked = null; q.on = null; } else { q.x = q.on.x; q.y = q.on.y; continue; } } q.x += jig * gauss(r); q.y += jig * gauss(r); wrap(q);
      for (const e of this.E) { if (e.dead || e.blocked || (q.kind === "comp" && e.held)) continue; const [sx, sy] = q.kind === "comp" ? site(e) : [e.x - Math.cos(e.a) * 0.03, e.y - Math.sin(e.a) * 0.03]; if ((q.x - sx) ** 2 + (q.y - sy) ** 2 < 0.00045) { e.blocked = q.kind; q.on = e; q.t = 1.5 + r() * 1.5; break; } } }
    for (let i = this.S.length - 1; i >= 0; i--) { const s = this.S[i]; s.x += jig * gauss(r); s.y += jig * gauss(r); s.a += gauss(r) * Math.sqrt(dt); wrap(s);
      for (const e of this.E) { if (e.dead || e.held || e.blocked) continue; const [sx, sy] = site(e); if ((s.x - sx) ** 2 + (s.y - sy) ** 2 < 0.00045) {
        // THE RULE: it binds only if it fits the active site (less likely away from the optimum pH)
        if (r() < fit) { e.held = s; e.busy = tcat * (0.6 + 0.8 * r()); this.S.splice(i, 1); } break; } } }
    for (let i = this.P.length - 1; i >= 0; i--) { const p = this.P[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life <= 0) this.P.splice(i, 1); }
    this.t += dt;
  }
  active() { return this.E.filter(e => !e.dead).length; }
}
const wrap = q => { q.x = (q.x + BOX.w) % BOX.w; q.y = (q.y + BOX.h) % BOX.h; };
const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * r()); };
// an assay: how many products are made in `secs` seconds of model time (one model second stands for about ten real seconds)
function assay(o, rnd, secs = 60) { const t = new Tube(o, rnd); const dt = 0.05; for (let s = 0; s < secs; s += dt) t.step(dt); return t.made; }

// ---------------- The page ----------------
const P = { enz: "amylase", nE: 12, nS: 120, T: 37, pH: 7, comp: 0, non: 0, feed: false };
let tube, speed = 1, log = [], curve = [], rnd = K.rng(Date.now() % 99991 + 43), lastMade = 0, rateNow = 0, rateWin = [];
function restart() { tube = new Tube(Object.assign({}, P), rnd); log = [[0, 0]]; rateWin = []; lastMade = 0; }
const ui = K.app({
  title: "Enzymes", subject: "Biology",
  blurb: "Biological catalysts: molecules colliding, fitting and being denatured",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(c): enzymes as biological catalysts; the effect of temperature and pH on the shape of the active site and on enzyme activity (practicals 2.12 and 2.14B).", adv: "OCR A level Biology A (H420) 2.1.4 Enzymes: mechanism (lock and key, induced fit), temperature (Q10), pH, enzyme and substrate concentration, competitive and non-competitive inhibition." } },
  missions: [
    { title: "Lock and key", q: "Amylase molecules (blue, with a notch) and starch molecules (wedges). Watch one enzyme. What happens when a starch molecule reaches its active site? Is the enzyme used up?", hint: "The substrate fits the active site, forms an enzyme–substrate complex for a moment, and leaves as products (maltose). The enzyme is free again, unchanged, ready for the next one: a catalyst. Only the right-shaped substrate fits: enzymes are specific.", setup() { set({ speed: 0.5 }); } },
    { title: "Temperature", q: "Run the tube at 10 °C, 37 °C and 60 °C, pressing 'Start again' each time, and note the rate. Why is it slow when cold? What happens to the enzymes at 60 °C?", hint: "Cold: the molecules move slowly, collide less often and react more slowly once bound. Warmer: more frequent, more successful collisions, up to the optimum (about 37 °C for human enzymes). Hotter still: the enzymes denature (grey): the bonds holding their shape break, the active site no longer fits, and the change is permanent. The batch run 'Rate against temperature' draws the whole curve.", setup() { set({ T: 10 }); } },
    { title: "pH", q: "Pepsin works in the stomach, trypsin in the small intestine. Try each at pH 2, 5 and 8. What is each one's optimum pH? Does a wrong pH destroy the enzyme?", hint: "Pepsin works best near pH 2 (stomach acid); trypsin near pH 8. Away from the optimum the charges in the active site change, so its shape changes and fewer substrates fit. Moderate changes are reversible here: go back to the right pH and the rate recovers. Extreme pH can denature enzymes permanently.", setup() { set({ enz: "pepsin", pH: 5 }); } },
    { title: "More substrate", q: "Double the starch, then double it again, noting the rate each time. Does the rate keep doubling? Look at how many enzymes are busy.", hint: "At first more substrate means more collisions and a faster rate. Eventually almost every enzyme is busy all the time: adding more substrate cannot help, because the enzymes are the bottleneck. The rate levels off at its maximum (Vmax). Adding more enzyme would raise it.", setup() { set({ nS: 30, feed: true }); } },
    { title: "A heat-loving enzyme", q: "Taq polymerase comes from bacteria living in hot springs. Find its optimum temperature. Why is it used to copy DNA in PCR, where the mixture is heated to 95 °C?", hint: "Its optimum is around 72 °C and it survives brief heating to 95 °C, which would denature human enzymes in seconds. Its shape is held by extra bonds. PCR repeatedly heats DNA to separate the strands, so it needs an enzyme that is not destroyed by the heat.", setup() { set({ enz: "taq", T: 37 }); } },
    { lvl: "adv", title: "Competitive inhibition", q: "Add 30 competitive inhibitors (red): they fit the active site but do not react. What happens to the rate? Now raise the substrate a lot. Can the substrate win?", hint: "Inhibitors occupy active sites for a while, so fewer are free: the rate falls. But they compete: with lots of substrate, most active sites are found by substrate first, and the rate approaches the same maximum. Competitive inhibition raises Km but not Vmax.", setup() { set({ comp: 30, nS: 60, feed: true }); } },
    { lvl: "adv", title: "Non-competitive inhibition", q: "Now use non-competitive inhibitors (orange): they bind away from the active site and change its shape. Does adding lots of substrate overcome them?", hint: "No. An enzyme with a non-competitive inhibitor attached cannot work however much substrate there is, so the maximum rate itself falls. Vmax goes down; Km is unchanged. Many poisons work like this, as do some drugs; and end-product inhibition uses the same idea to control metabolic pathways.", setup() { set({ non: 30, nS: 60, feed: true }); } },
    { lvl: "adv", title: "Q10", q: "At 15 °C and 25 °C (and before any denaturing), compare the rates. What is the temperature coefficient Q10 = rate(T + 10) ÷ rate(T)?", hint: "About 2: a 10 °C rise roughly doubles the rate, because molecules collide more often and with more energy. In this model the conversion step has Q10 = 2 and collisions also speed up a little, so the measured value is near 2. Above the optimum, Q10 means nothing: denaturing takes over.", setup() { set({ T: 15 }); } }
  ],
  batch: [
    { title: "Rate against temperature", question: "How does the rate of reaction depend on temperature?", how: "Each run: 12 amylase molecules and 120 starch (kept topped up) at pH 7 in a tube held at the chosen temperature; products are counted after one minute.", xLabel: "temperature (°C)", yLabel: "products in one minute", xs: [5, 15, 25, 30, 35, 40, 45, 50, 55, 60, 70], reps: 4, yMin: 0, run: (x, r) => assay({ T: x, feed: true }, r), note: "Rises with temperature up to an optimum, then falls steeply as the enzymes denature. The optimum depends on how long you measure for: in a longer assay the enzymes have longer to denature, so the optimum appears lower." },
    { title: "Rate against pH: pepsin", question: "What is the optimum pH of pepsin, the stomach's protein-digesting enzyme?", how: "Each run: pepsin at 37 °C with 120 protein molecules (kept topped up) at the chosen pH; products in one minute.", xLabel: "pH", yLabel: "products in one minute", xs: [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7], reps: 4, yMin: 0, run: (x, r) => assay({ enz: "pepsin", pH: x, feed: true }, r), note: "A peak near pH 2, matching the acid in the stomach. Compare with amylase (next experiment), whose peak is near pH 7." },
    { title: "Rate against pH: amylase", question: "How does amylase's rate depend on pH?", how: "Each run: amylase at 37 °C with 120 starch (kept topped up); products in one minute.", xLabel: "pH", yLabel: "products in one minute", xs: [3, 4, 5, 6, 7, 8, 9, 10, 11], reps: 4, yMin: 0, run: (x, r) => assay({ pH: x, feed: true }, r) },
    { title: "Rate against substrate concentration", question: "How does the starting rate depend on the amount of substrate?", how: "Each run: 12 amylase molecules at 37 °C with the chosen number of starch molecules, kept topped up; products in one minute.", xLabel: "substrate molecules", yLabel: "products in one minute", xs: [10, 25, 50, 100, 200, 300, 450, 600], reps: 3, yMin: 0, run: (x, r) => assay({ nS: x, feed: true }, r), note: "A curve that levels off: once nearly every active site is busy, extra substrate makes no difference. The plateau is the maximum rate, Vmax." },
    { title: "Rate against enzyme concentration", question: "With plenty of substrate, how does the rate depend on how much enzyme there is?", how: "Each run: the chosen number of amylase molecules with 400 starch, topped up; products in one minute.", xLabel: "enzyme molecules", yLabel: "products in one minute", xs: [2, 4, 6, 8, 12, 16, 20], reps: 4, yMin: 0, fit: true, run: (x, r) => assay({ nE: x, nS: 400, feed: true }, r), note: "A straight line: double the enzyme, double the active sites, double the rate, as long as substrate is not running short." },
    { title: "Inhibitors", question: "How do competitive and non-competitive inhibitors change the curve of rate against substrate?", how: "Each run: 12 amylase molecules with 30 non-competitive inhibitors, at the chosen substrate level (topped up). Compare with 'Rate against substrate concentration'.", xLabel: "substrate molecules", yLabel: "products in one minute", xs: [10, 25, 50, 100, 200, 300, 450, 600], reps: 3, yMin: 0, run: (x, r) => assay({ nS: x, feed: true, non: 30 }, r), note: "The whole curve is lower, and stays lower at high substrate: non-competitive inhibition reduces Vmax. (Try competitive inhibitors in the simulation: they can be outcompeted by plenty of substrate.)" }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2.10", text: "Enzymes are proteins that act as biological catalysts: they speed up reactions without being used up." },
      { lvl: "std", tag: "4BI1 2.11", text: "Each enzyme has an active site with a specific shape that fits only its substrate (lock and key). Increasing temperature increases the rate up to an optimum; above it the enzyme is denatured: the active site changes shape permanently." },
      { lvl: "std", tag: "4BI1 2.13", text: "pH affects the shape of the active site. Each enzyme has an optimum pH: pepsin about 2, amylase about 7, trypsin about 8." },
      { lvl: "std", tag: "4BI1 2.12", text: "Practical: measure the rate (e.g. time for starch to disappear, tested with iodine) at different temperatures or pH, keeping other variables constant." },
      { lvl: "adv", tag: "H420 2.1.4", text: "Induced fit: the active site changes shape slightly as the substrate binds, putting strain on bonds and lowering the activation energy." },
      { lvl: "adv", tag: "H420 2.1.4", text: "Substrate concentration: rate rises then plateaus at Vmax when all active sites are occupied. Enzyme concentration: rate proportional while substrate is in excess." },
      { lvl: "adv", tag: "H420 2.1.4", text: "Competitive inhibitors bind the active site; their effect is reduced by high substrate concentration. Non-competitive inhibitors bind elsewhere and change the active site; Vmax falls. End-product inhibition regulates pathways." },
      { lvl: "adv", tag: "H420 2.1.4", text: "Temperature coefficient Q10 = rate at (T + 10) ÷ rate at T; about 2 for many enzyme-controlled reactions below the optimum." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why the rate of an enzyme-controlled reaction increases as temperature rises from 20 °C to 37 °C.", ans: "<ul><li>Molecules have more kinetic energy / move faster</li><li>so enzyme and substrate molecules collide more often</li><li>more enzyme–substrate complexes form per second</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why the rate falls sharply above 45 °C.", ans: "<ul><li>The enzyme is denatured</li><li>The shape of the active site changes</li><li>so the substrate no longer fits / fewer enzyme–substrate complexes form</li></ul>" },
      { lvl: "std", marks: 2, q: "Pepsin works in the stomach and trypsin in the small intestine. Suggest why they have different optimum pH values.", ans: "<ul><li>The stomach is acidic (pH about 2) and the small intestine is slightly alkaline (pH about 8)</li><li>Each enzyme's active site has the right shape at the pH where it works</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe an experiment to find the effect of pH on the activity of amylase.", ans: "<ul><li>Mix amylase and starch solution with buffers at different pH values</li><li>Keep temperature (water bath), volumes and concentrations constant</li><li>Take samples at regular intervals and test with iodine on a spotting tile</li><li>Record the time until iodine no longer turns blue-black; rate = 1 ÷ time</li></ul>" },
      { lvl: "std", marks: 2, q: () => `In the simulation ${tube.made} products were made in ${tube.t.toFixed(0)} seconds. Calculate the mean rate of reaction.`, ans: () => `<ul><li>rate = amount ÷ time = ${tube.made} ÷ ${tube.t.toFixed(0)}</li><li>= ${(tube.made / Math.max(1, tube.t)).toFixed(2)} products per second</li></ul>` },
      { lvl: "adv", marks: 3, q: "Explain why increasing substrate concentration has no effect on the rate once it is high.", ans: "<ul><li>All the active sites are occupied at any moment (saturated)</li><li>Enzyme concentration has become the limiting factor</li><li>The rate is at its maximum, Vmax</li></ul>" },
      { lvl: "adv", marks: 4, q: "Compare the effects of a competitive and a non-competitive inhibitor on an enzyme-controlled reaction.", ans: "<ul><li>Competitive: similar shape to substrate, binds the active site, blocking it</li><li>its effect can be overcome by raising substrate concentration; Vmax unchanged</li><li>Non-competitive: binds elsewhere (allosteric site), changing the shape of the active site</li><li>raising substrate concentration does not overcome it; Vmax reduced</li></ul>" },
      { lvl: "adv", marks: 2, q: "The rate at 25 °C is 0.42 per minute and at 35 °C is 0.86 per minute. Calculate Q10.", ans: "<ul><li>Q10 = rate(35) ÷ rate(25) = 0.86 ÷ 0.42</li><li>= 2.0</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Molecules</b> drift at random (Brownian motion), faster at higher temperature. The tube wraps round at its edges.</li>
<li><b>Binding:</b> a substrate that reaches a free enzyme's active site binds with a probability equal to how well the site fits at this pH: a bell curve around the enzyme's optimum pH.</li>
<li><b>Conversion:</b> a bound substrate is released as products after about 1 s at the optimum temperature; the time doubles for every 10 °C cooler (Q10 = 2).</li>
<li><b>Denaturing:</b> each enzyme has a chance per second of being denatured that rises steeply with temperature (about ten-fold every 6 °C), from almost nothing at 37 °C. Denaturing is permanent.</li>
<li><b>Inhibitors:</b> competitive inhibitors occupy the active site for 1.5 to 3 s; non-competitive ones bind on the far side for the same time and stop the enzyme working.</li>
<li><b>Rate</b> is the number of products made per minute of model time.</li></ul>
<h3>Simplifications</h3>
<ul><li>Molecules are drawn hugely magnified and far too few: a real test tube holds billions of enzyme molecules.</li>
<li>pH changes the fit reversibly; real enzymes are also denatured at extreme pH.</li>
<li>Induced fit, cofactors and the detailed chemistry are not modelled; the active site is a simple notch.</li>
<li>Products do not rebind or inhibit (no end-product inhibition), and the reaction never runs backwards.</li>
<li>Catalase's oxygen and the colour changes of real assays (iodine, Benedict's) are not drawn.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/enzymes.html">original/enzymes.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The enzyme");
ctl.enz = K.seg(g, { value: "amylase", options: Object.entries(ENZ).map(([k, e]) => [k, e.name.split(" ")[0]]), on: v => { P.enz = v; P.pH = ENZ[v].opt; ctl.pH.set(P.pH); restart(); } });
const enzNote = K.note(g, "");
g = ui.group("Conditions (change any time)");
ctl.T = K.slider(g, { label: "Temperature", min: 0, max: 100, step: 1, value: 37, unit: "°C", on: v => { P.T = v; tube.o.T = v; } });
ctl.pH = K.slider(g, { label: "pH", min: 1, max: 12, step: 0.1, value: 7, on: v => { P.pH = v; tube.o.pH = v; } });
g = ui.group("What is in the tube");
ctl.nS = K.slider(g, { label: "Substrate molecules", min: 5, max: 600, step: 5, value: 120, on: v => { P.nS = v; restart(); } });
ctl.nE = K.slider(g, { label: "Enzyme molecules", min: 1, max: 30, step: 1, value: 12, on: v => { P.nE = v; restart(); } });
ctl.feed = K.toggle(g, { label: "Keep the substrate topped up", value: false, on: v => { P.feed = v; tube.o.feed = v; } });
const inhGroup = g = ui.group("Inhibitors (A level)");
ctl.comp = K.slider(g, { label: "Competitive inhibitors", min: 0, max: 60, step: 1, value: 0, on: v => { P.comp = v; restart(); } });
ctl.non = K.slider(g, { label: "Non-competitive inhibitors", min: 0, max: 60, step: 1, value: 0, on: v => { P.non = v; restart(); } });
g = ui.group("Watch");
let r1 = K.row(g); K.btn(r1, "↺ Start again", () => restart(), "primary"); K.btn(r1, "Keep this curve", () => { if (log.length > 2) { curve.push({ pts: log.slice(), label: `${ENZ[P.enz].name}, ${P.T} °C, pH ${P.pH}` }); if (curve.length > 4) curve.shift(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.2, max: 4, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["made", "products made"], ["rate", "rate now"], ["busy", "enzymes busy"], ["dead", "enzymes denatured"], ["left", "substrate left"], ["fit", "active-site fit at this pH"]]);
function set(o) { Object.assign(P, { enz: "amylase", nE: 12, nS: 120, T: 37, comp: 0, non: 0, feed: false }, o); if (o.pH == null) P.pH = ENZ[P.enz].opt; for (const k of ["T", "pH", "nS", "nE", "comp", "non"]) ctl[k].set(P[k]); ctl.enz.set(P.enz); ctl.feed.set(P.feed); speed = o.speed || 1; ctl.speed.set(speed); curve = []; restart(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, E = ENZ[P.enz], sc = Math.min((w - 40) / BOX.w, (h - 70) / BOX.h), ox = (w - BOX.w * sc) / 2, oy = 40, X = x => ox + x * sc, Y = y => oy + y * sc;
  const warm = K.clamp((P.T - 0) / 100, 0, 1); c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h);
  c.fillStyle = `rgba(${Math.round(30 + 80 * warm)},${Math.round(50 - 10 * warm)},${Math.round(90 - 50 * warm)},0.35)`; c.beginPath(); c.roundRect(ox - 8, oy - 8, BOX.w * sc + 16, BOX.h * sc + 16, 16); c.fill();
  const re = 0.035 * sc;
  c.save(); c.beginPath(); c.rect(ox - 8, oy - 8, BOX.w * sc + 16, BOX.h * sc + 16); c.clip();      // keep molecules inside the tube
  // enzymes: a round protein with a notch for its active site; grey and misshapen when denatured
  for (const e of tube.E) {
    c.save(); c.translate(X(e.x), Y(e.y)); c.rotate(e.a);
    const fit = tube.fit(), notch = e.dead ? 0.15 : 0.55 * fit + 0.15;
    c.fillStyle = e.dead ? "#4a5163" : e.blocked === "non" ? "#5b6a8a" : E.col; c.globalAlpha = e.dead ? 0.6 : 1;
    c.beginPath(); c.moveTo(re * 0.5, 0); if (e.dead) { for (let k = 0; k <= 10; k++) { const a = k / 10 * 6.283, rr = re * (0.85 + 0.25 * Math.sin(a * 3 + e.x * 40)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } } else c.arc(0, 0, re, notch, 6.283 - notch); c.closePath(); c.fill(); c.globalAlpha = 1;
    if (e.held) { c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(re * 0.45, 0); c.lineTo(re * 1.05, -re * 0.32); c.lineTo(re * 1.05, re * 0.32); c.fill(); }
    if (e.blocked === "comp") { c.fillStyle = "#ff5d6c"; c.beginPath(); c.arc(re * 0.75, 0, re * 0.24, 0, 6.3); c.fill(); }
    if (e.blocked === "non") { c.fillStyle = "#ffb347"; c.beginPath(); c.arc(-re * 0.95, 0, re * 0.24, 0, 6.3); c.fill(); }
    c.restore();
  }
  // substrate: wedges shaped to fit the active site
  c.fillStyle = "#ffd166"; for (const s of tube.S) { c.save(); c.translate(X(s.x), Y(s.y)); c.rotate(s.a); c.beginPath(); c.moveTo(-re * 0.3, 0); c.lineTo(re * 0.3, -re * 0.32); c.lineTo(re * 0.3, re * 0.32); c.fill(); c.restore(); }
  for (const q of tube.I) if (!q.on) { c.fillStyle = q.kind === "comp" ? "#ff5d6c" : "#ffb347"; c.beginPath(); c.arc(X(q.x), Y(q.y), re * 0.24, 0, 6.3); c.fill(); }
  // products: two small pieces flying apart and fading
  for (const p of tube.P) { c.globalAlpha = K.clamp(p.life, 0, 1); c.fillStyle = "#7fe3a0"; for (const s of [-1, 1]) { c.beginPath(); c.arc(X(p.x) + s * (1.6 - p.life) * 10, Y(p.y) + s * (1.6 - p.life) * 4, re * 0.18, 0, 6.3); c.fill(); } } c.globalAlpha = 1; c.restore();
  // the reaction and conditions
  c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(`${E.name} + ${E.sub} → ${E.prod}`, ox, 26); c.textAlign = "right"; c.fillText(`${P.T} °C · pH ${P.pH.toFixed(1)}`, ox + BOX.w * sc, h - 9);
  c.textAlign = "left"; c.font = "11.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; let kx = ox; for (const [col, t] of [[E.col, "enzyme"], ["#ffd166", "substrate"], ["#7fe3a0", "products"], ["#4a5163", "denatured"]].concat(P.comp ? [["#ff5d6c", "competitive inhibitor"]] : []).concat(P.non ? [["#ffb347", "non-competitive"]] : [])) { c.fillStyle = col; c.fillRect(kx, h - 18, 10, 10); c.fillStyle = "#aab6cc"; c.fillText(t, kx + 14, h - 9); kx += c.measureText(t).width + 30; }
}
const chP = K.chart(ui.dock, { title: "Products made", xLabel: "time (s)", yLabel: "products", yMin: 0 });
const chT = K.chart(ui.dock, { title: "Rate against temperature (model)", xLabel: "temperature (°C)", yLabel: "relative rate", yMin: 0 });
// a quick theory curve: rate ∝ collisions × fit × speed of conversion × share of enzymes still active after one minute
function relRate(T, pH, enz) { const E = ENZ[enz], q = Math.pow(Q10, (T - (E.Topt || 37)) / 10), kd = Math.exp((T - E.Td) / 2.6), alive = (1 - Math.exp(-kd * 60)) / Math.max(kd * 60, 1e-9), fit = Math.exp(-Math.pow((pH - E.opt) / E.pHw, 2)); return Math.sqrt((T + 273) / 310) * q / (1 + q) * fit * alive; }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  const n = Math.max(1, Math.round(speed * 2)); if (!(dt > 0)) return; for (let k = 0; k < n; k++) tube.step(Math.min(dt, 0.05) * speed / n * 2);
  if (tube.t - log[log.length - 1][0] > 0.5) { log.push([tube.t, tube.made]); rateWin.push([tube.t, tube.made]); while (rateWin.length && rateWin[0][0] < tube.t - 10) rateWin.shift(); if (log.length > 600) log.shift(); }
}, () => {
  draw(); if (frame++ % 6) return; const E = ENZ[P.enz], busy = tube.E.filter(e => e.held).length;
  rateNow = rateWin.length > 1 ? (rateWin[rateWin.length - 1][1] - rateWin[0][1]) / (rateWin[rateWin.length - 1][0] - rateWin[0][0]) : 0;
  chP.draw(curve.map((q, i) => ({ pts: q.pts, color: ["#7d8aa5", "#9a86c9", "#c98686", "#86b7c9"][i], label: q.label, width: 1.3 })).concat([{ pts: log, color: K.cssVar("--s2"), width: 2.4, label: "now" }]), { xMin: 0, xMax: Math.max(60, tube.t) });
  const pts = []; for (let T = 0; T <= 100; T += 1) pts.push([T, relRate(T, P.pH, P.enz)]); const mx = Math.max(...pts.map(q => q[1])) || 1;
  chT.draw([{ pts: pts.map(q => [q[0], q[1] / mx]), color: E.col, width: 2, label: E.name + " at pH " + P.pH.toFixed(1) + " (one-minute assay)" }, { pts: [[P.T, relRate(P.T, P.pH, P.enz) / mx]], type: "dots", color: "#fff", r: 5 }], { xMin: 0, xMax: 100, yMax: 1.1 });
  read.set("made", tube.made); read.set("rate", (rateNow * 60).toFixed(0) + " per minute"); read.set("busy", busy + " of " + tube.active()); read.set("dead", tube.E.length - tube.active()); read.set("left", tube.S.length); read.set("fit", Math.round(100 * tube.fit()) + "%");
  enzNote.innerHTML = `<b>${E.name}</b>: found in ${E.where}. Breaks down ${E.sub} into ${E.prod}. Works best near pH ${E.opt}${E.Topt ? " and " + E.Topt + " °C" : ""}.`;
  inhGroup.style.display = ui.level === "adv" ? "" : "none";
  ui.hud(`<b style="font-size:15px">${(rateNow * 60).toFixed(0)} per minute</b><br>${busy} of ${tube.active()} enzymes busy${tube.active() < tube.E.length ? `<br><span style="color:#ff8a70">${tube.E.length - tube.active()} denatured</span>` : ""}`);
});
set({});
ui.tip("Substrate (yellow wedges) must fit the enzyme's active site to react · grey enzymes are denatured", 8000);
