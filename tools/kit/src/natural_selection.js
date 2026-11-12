/* =====================================================================
   NATURAL SELECTION: moths on bark
   Every moth has one inherited trait: wing colour, from 0 (black) to 1
   (pale). Each generation:
     1. PREDATION  birds eat moths; the worse the camouflage, the higher
                   the chance of being eaten
     2. BREEDING   survivors have offspring, which inherit the parent's
                   colour plus a small random mutation
   That is all. Adaptation, or extinction, follows from those two steps.
   ===================================================================== */
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

class Pop {
  constructor(rand, o = {}) {
    this.r = rand; this.o = Object.assign({ K: 80, sel: 1.6, mut: 0.04, env: 0.8, startMean: 0.8, startSD: 0.08, fec: 2.5 }, o);
    this.gen = 0; this.env = this.o.env; this.m = []; this.lastEaten = 0;
    for (let i = 0; i < this.o.K; i++) this.m.push(this.newMoth(clamp01(this.o.startMean + rand.gauss() * this.o.startSD)));
  }
  newMoth(g) { return { g, x: this.r(), y: this.r(), a: (this.r() - .5) * 1.2, eaten: false, te: this.r() }; }
  // Chance that a moth of colour g is eaten this generation: 8% bad luck + more the worse it matches the bark
  pEaten(g) { return Math.min(0.97, 0.08 + this.o.sel * Math.abs(g - this.env)); }
  predate() { let n = 0; for (const q of this.m) if (!q.eaten && this.r() < this.pEaten(q.g)) { q.eaten = true; n++; } this.lastEaten = n; }
  breed() {
    const surv = this.m.filter(q => !q.eaten), n = Math.min(this.o.K, Math.round(surv.length * this.o.fec)), next = [];
    for (let i = 0; i < n; i++) { const parent = surv[this.r.int(surv.length)]; next.push(this.newMoth(clamp01(parent.g + this.r.gauss() * this.o.mut))); } // inheritance + mutation
    this.m = next; this.gen++;
  }
  mean() { return this.m.length ? K.mean(this.m.map(q => q.g)) : NaN; }
}
// Headless: run for some generations; envAt(gen) gives the bark colour (so the environment can change)
function evolve(rand, o, gens, envAt) { const p = new Pop(rand, o); for (let i = 0; i < gens && p.m.length; i++) { if (envAt) p.env = envAt(i); p.predate(); p.breed(); } return p; }

// ---------------------------------------------------------------- page
let pop, hist, phase = "hunt", pt = 0, speed = 1, fast = false, youBird = false, scenario = "steady", quota = 0, clicked = 0, timeLeft = 0; const S = {};
const scen = { // bark colour through time for each story
  steady: g => S.env.value,
  industry: g => g < 8 ? 0.82 : g < 28 ? 0.82 - (g - 8) / 20 * 0.64 : g < 55 ? 0.18 : g < 80 ? 0.18 + (g - 55) / 25 * 0.64 : 0.82,
  sudden: g => g < 10 ? 0.8 : 0.3,
  drift: g => clamp01(0.85 - S.rate.value * g),
};
const ui = K.app({
  title: "Natural Selection", subject: "Biology", blurb: "Moths, bark and hungry birds: watch a population adapt, or be the predator yourself.",
  reset: () => restart(),
  missions: [
    { title: "Be the bird", q: "You are the predator. Each generation you have 10 seconds to catch the moths: click them. Play 6–8 generations on this dark, sooty bark. What happens to the colour histogram?", hint: "You did not try to 'improve' the moths. You just ate the ones you could see. The survivors were darker than average, their offspring inherited that, and the whole population shifted. That is natural selection.", setup: () => { S.you.set(true, true); S.scen.set("steady", true); S.env.set(0.25, true); restart(); } },
    { title: "The Industrial Revolution", q: "Soot darkens the trees from generation 8, then clean-air laws let the lichen return after generation 55. Sketch what you expect the mean-colour line to do, then run it.", hint: "The moths track the bark with a delay of a few generations: the population can only shift as fast as selection and mutation allow. This is the real story of the peppered moth, <i>Biston betularia</i>.", setup: () => { S.you.set(false, true); S.scen.set("industry", true); restart(); } },
    { title: "No variation, no evolution", q: "Mutation is off and every moth starts the same colour. The bark suddenly darkens at generation 10. What happens, and why?", hint: "Selection can only choose between differences that already exist. With no variation there is nothing to select, the population cannot adapt, and heavy predation drives it extinct.", setup: () => { S.you.set(false, true); S.mut.set(0, true); S.sd.set(0, true); S.scen.set("sudden", true); restart(); } },
    { title: "Variation without mutation", q: "Mutation is still off, but now the starting population is varied. Does it adapt to the darker bark? How far can it get?", hint: "It adapts quickly at first using the existing variation, then stalls: it cannot go beyond the darkest moth that was present at the start. Mutation is the only source of new variants.", setup: () => { S.you.set(false, true); S.mut.set(0, true); S.sd.set(0.15, true); S.scen.set("sudden", true); restart(); } },
    { title: "Can evolution keep up?", q: "The bark darkens steadily, selection is strong and mutations are small. Find the fastest <b>rate of change</b> the moths can survive. What could a population have that would let it survive faster change?", hint: "If the environment moves faster than the population can follow, mismatch grows each generation, predation rises and numbers crash. More variation (bigger mutations), a larger population or faster breeding all help. This matters for species facing rapid climate change.", setup: () => { S.you.set(false, true); S.sel.set(3, true); S.mut.set(0.02, true); S.sd.set(0.08, true); S.scen.set("drift", true); S.rate.set(0.014, true); restart(); } },
    { title: "Weak selection", q: "Set selection strength to 0.2. Does the population still adapt to a sudden change? Now set it to 0: what moves the mean colour then?", hint: "Weak selection still works, only slowly. With no selection at all the mean still wanders at random: genetic drift, which is strongest in small populations.", setup: () => { S.you.set(false, true); S.sel.set(0.2, true); S.scen.set("sudden", true); restart(); } },
  ],
  batch: [
    { title: "Do moths match their bark?", question: "After 40 generations, where does mean colour end up?", how: "Populations of 80 start at colour 0.5 and evolve on bark of different colours.", xLabel: "bark colour", yLabel: "mean moth colour after 40 generations", xs: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85], reps: 8, theory: x => x, theoryLabel: "perfect match",
      run: (x, r) => evolve(r, { env: x, startMean: 0.5 }, 40).mean(), note: "Which moths get eaten and which mutations arise are chance events, so each population takes a slightly different path. Selection pulls them all the same way." },
    { title: "Selection strength and speed", question: "Does stronger selection mean faster adaptation?", how: "Pale moths (0.8) are put on dark bark (0.3). We count the generations until the mean is within 0.1 of the bark.", xLabel: "selection strength", yLabel: "generations to adapt", xs: [0.3, 0.6, 0.9, 1.2, 1.5, 1.8], reps: 10, yMin: 0,
      run: (x, r) => { const p = new Pop(r, { env: 0.3, sel: x, K: 150 }); while (p.gen < 200 && p.m.length && Math.abs(p.mean() - 0.3) > 0.1) { p.predate(); p.breed(); } return p.m.length ? p.gen : null; }, note: "Runs where the population died out are left out. Adapting depends on when lucky mutations turn up, so the times vary a lot, most of all when selection is weak." },
    { title: "Extinction and the pace of change", question: "How fast can the environment change before the moths die out?", how: "Bark darkens steadily from 0.85; selection is strong (3.0) and mutations small (0.02). Result = 1 if the population survives 40 generations, 0 if extinct, so the mean is the chance of survival.", xLabel: "bark colour change per generation", yLabel: "chance of survival", xs: [0.01, 0.014, 0.018, 0.022, 0.026, 0.03], reps: 30, yMin: 0, yMax: 1.05,
      run: (x, r) => evolve(r, { sel: 3, mut: 0.02 }, 40, g => clamp01(0.85 - x * g)).m.length ? 1 : 0, note: "Each run is all-or-nothing, so plenty of repeats are needed to estimate a probability. Near the tipping point survival is down to luck." },
    { title: "Is mutation needed?", question: "With mutation switched off, how well can a population adapt?", how: "Moths (mean 0.8) on bark that has turned dark (0.3), no mutation. We vary how much variation the starting population has.", xLabel: "starting variation (SD of colour)", yLabel: "mismatch after 30 generations", xs: [0.02, 0.06, 0.1, 0.14, 0.18, 0.22], reps: 10, yMin: 0,
      run: (x, r) => { const p = evolve(r, { env: 0.3, mut: 0, startSD: x, K: 150, sel: 1 }, 30); return p.m.length ? Math.abs(p.mean() - 0.3) : null; }, note: "The final colour is that of the darkest few moths that happened to be in the starting population, which is a matter of chance. Extinct populations are left out." },
  ],
  notes: `<h3>The rules</h3><ul><li>One trait: wing colour from 0 (black) to 1 (pale). Bark colour uses the same scale.</li><li><b>Predation:</b> chance of being eaten = 8% + selection strength × |moth colour − bark colour| (capped at 97%).</li><li><b>Breeding:</b> each survivor leaves on average 2.5 offspring, up to the carrying capacity of the tree.</li><li><b>Inheritance:</b> offspring colour = parent colour + a random mutation (normal distribution, SD = mutation size).</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>One parent per moth (asexual). Real moths have two parents and colour is controlled mainly by one gene with a dominant dark allele: see the Inheritance simulation.</li><li>Colour is treated as a smooth scale. Real peppered moths come in distinct forms (<i>typica</i>, <i>carbonaria</i>, and an intermediate <i>insularia</i>).</li><li>Generations do not overlap, and nothing else varies: no food shortage, disease or migration.</li><li>Birds hunt only by sight, and mismatch is the only thing that matters to them.</li><li>Mutations are equally likely to make a moth darker or paler. They are random, never "what the moth needs".</li></ul>
  <h3>Words to use</h3><p>variation · selection pressure · survival · inheritance · mutation · adaptation · genetic drift · extinction</p>`,
});
let g = ui.group("Play");
S.you = K.toggle(g, { label: "<b>You are the bird</b> (click moths to eat them)", value: false, on: v => { youBird = v; restart(); } });
S.speed = K.slider(g, { label: "Speed", min: 1, max: 5, step: 1, value: 1, fmt: v => v < 5 ? v + "×" : "fast-forward", on: v => { speed = v; fast = v === 5; } });
g = ui.group("Environment");
S.scen = K.seg(g, { label: "Story", value: "steady", options: [["steady", "Steady"], ["sudden", "Sudden change"], ["industry", "Industrial Revolution"], ["drift", "Steady darkening"]], on: v => { scenario = v; restart(); } });
S.env = K.slider(g, { label: "Bark colour", min: 0.05, max: 0.95, step: 0.01, value: 0.8, fmt: v => v.toFixed(2) + (v < .35 ? " sooty" : v > .65 ? " lichen" : ""), tip: "Used by the 'Steady' story. Drag it mid-run to change the environment yourself." });
S.rate = K.slider(g, { label: "Rate of change (steady darkening)", min: 0.002, max: 0.04, step: 0.002, value: 0.01, fmt: v => v.toFixed(3) + " per gen" });
g = ui.group("Population");
S.sel = K.slider(g, { label: "Selection strength", min: 0, max: 3, step: 0.1, value: 1.6, fmt: v => v.toFixed(1), on: v => pop.o.sel = v, tip: "How much camouflage matters to survival." });
S.mut = K.slider(g, { label: "Mutation size", min: 0, max: 0.12, step: 0.005, value: 0.04, fmt: v => v ? v.toFixed(3) : "off", on: v => pop.o.mut = v });
S.sd = K.slider(g, { label: "Starting variation", min: 0, max: 0.25, step: 0.01, value: 0.08, fmt: v => v.toFixed(2), tip: "Applies when you press Reset." });
S.K = K.slider(g, { label: "Carrying capacity", min: 20, max: 200, step: 10, value: 80, unit: "moths", on: v => pop.o.K = v });
g = ui.group("This generation");
const read = K.readout(g, [["gen", "Generation"], ["n", "Moths alive"], ["mean", "Mean colour"], ["mis", "Mismatch"]]);

function restart() {
  scenario = S.scen.value; const e0 = scen[scenario](0);
  pop = new Pop(K.rng(Date.now()), { K: youBird ? Math.min(40, S.K.value) : S.K.value, sel: S.sel.value, mut: S.mut.value, env: e0, startMean: scenario === "steady" ? 0.8 : e0, startSD: S.sd.value });
  hist = { mean: [], env: [], n: [] }; record(); startHunt();
}
function record() { hist.mean.push([pop.gen, pop.mean()]); hist.env.push([pop.gen, pop.env]); hist.n.push([pop.gen, pop.m.length]); }
function startHunt() {
  phase = "hunt"; pt = 0; pop.env = scen[scenario](pop.gen);
  if (youBird) { quota = Math.max(1, Math.round(pop.m.length * 0.45)); clicked = 0; timeLeft = 10; } else pop.predate();
}
function nextGen() { pop.breed(); record(); if (pop.m.length) startHunt(); else { phase = "extinct"; ui.tip("💀 Extinct. Press Reset to start again.", 9000); } }

// ---- Drawing ----
const tone = v => `rgb(${40 + v * 185 | 0},${36 + v * 180 | 0},${30 + v * 160 | 0})`;
let bark = null;
function makeBark(w, h) { // a grey texture of streaks and knots, blended over the bark colour
  bark = document.createElement("canvas"); bark.width = w; bark.height = h; const c = bark.getContext("2d"), r = K.rng(11);
  c.fillStyle = "#808080"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, len = 40 + r() * 220, v = r() < .5 ? 0 : 255; c.strokeStyle = `rgba(${v},${v},${v},${0.03 + r() * .09})`; c.lineWidth = 1 + r() * 5; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + (r() - .5) * 30, y + len * .3, x + (r() - .5) * 30, y + len * .6, x + (r() - .5) * 20, y + len); c.stroke(); }
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, v = r() < .5 ? 20 : 235; c.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * .1})`; c.beginPath(); c.ellipse(x, y, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, 6.3); c.fill(); }
}
const cv = ui.canvas(c => makeBark(c.w, c.h));
const PAD = 40, mothSize = () => youBird ? 20 : pop.m.length > 120 ? 11 : 14;
const mx = q => PAD + q.x * (cv.w - 2 * PAD), my = q => PAD + q.y * (cv.h - 2 * PAD);
function moth(c, x, y, a, s, g, alpha) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = alpha;
  c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(2, 3, s * 1.05, s * .6, 0, 0, 6.3); c.fill();          // soft shadow
  c.fillStyle = tone(g); c.beginPath();                                                                       // wings
  c.moveTo(0, -s * .25); c.quadraticCurveTo(s * .9, -s * 1.0, s * 1.25, -s * .15); c.quadraticCurveTo(s * 1.0, s * .75, 0, s * .45);
  c.quadraticCurveTo(-s * 1.0, s * .75, -s * 1.25, -s * .15); c.quadraticCurveTo(-s * .9, -s * 1.0, 0, -s * .25); c.fill();
  c.strokeStyle = tone(clamp01(g - .12)); c.lineWidth = 1; c.beginPath(); c.moveTo(-s * .9, -s * .25); c.quadraticCurveTo(0, s * .1, s * .9, -s * .25); c.stroke(); // wing band
  c.fillStyle = tone(clamp01(g - .16)); c.beginPath(); c.ellipse(0, 0, s * .16, s * .6, 0, 0, 6.3); c.fill();   // body
  c.restore();
}
function draw(dt) {
  const c = cv.ctx; c.fillStyle = tone(pop.env); c.fillRect(0, 0, cv.w, cv.h);
  c.globalCompositeOperation = "overlay"; c.drawImage(bark, 0, 0, cv.w, cv.h); c.globalCompositeOperation = "source-over";
  const s = mothSize();
  for (const q of pop.m) {
    let alpha = 1;
    if (phase === "hunt") { if (q.eaten) { const k = youBird ? 1 : pt * 1.25; if (k > q.te + .18) continue; if (k > q.te) { alpha = 1 - (k - q.te) / .18; c.strokeStyle = `rgba(255,255,255,${alpha})`; c.lineWidth = 2; c.beginPath(); c.arc(mx(q), my(q), s * (1 + (1 - alpha) * 1.6), 0, 6.3); c.stroke(); } } if (pt < .12 && pop.gen > 0 && !youBird) alpha *= pt / .12; }
    moth(c, mx(q), my(q), q.a, s, q.g, alpha);
  }
  if (youBird && phase === "hunt") ui.hud(`<b style="font-size:15px">🐦 ${clicked} / ${quota} eaten</b><br>${timeLeft.toFixed(1)} s left`);
  else ui.hud(phase === "extinct" ? "<b style='color:#ff6b81'>EXTINCT</b>" : `Generation ${pop.gen}<br>${pop.lastEaten} eaten last hunt`);
}
K.pointer(cv.el, { down(p) {
  if (!youBird || phase !== "hunt" || !ui.playing) return; let best = null, bd = mothSize() * 1.3;
  for (const q of pop.m) if (!q.eaten) { const d = Math.hypot(mx(q) - p.x, my(q) - p.y); if (d < bd) { bd = d; best = q; } }
  if (best) { best.eaten = true; best.te = -1; clicked++; pop.lastEaten = clicked; }
} });

const chH = K.chart(ui.dock, { title: "Wing colours in the population now", xLabel: "wing colour (0 = black, 1 = pale)", yLabel: "moths", xMin: 0, xMax: 1, yMin: 0 });
const chT = K.chart(ui.dock, { title: "History", xLabel: "generation", yLabel: "colour", yMin: 0, yMax: 1 });
let frame = 0;
ui.run(dt => {
  if (phase === "extinct") return;
  if (youBird) { timeLeft -= dt; if (timeLeft <= 0 || clicked >= quota) nextGen(); return; }
  if (fast) { for (let k = 0; k < 2 && phase !== "extinct"; k++) nextGen(); return; }
  pt += dt * speed / 1.6; if (pt >= 1) nextGen();
}, dt => {
  draw(dt); if (frame++ % 4) return;
  const alive = pop.m.filter(q => !q.eaten).map(q => q.g), h = K.histogram(alive, 25, 0, 1);
  chH.draw([{ pts: h.pts, w: h.w, type: "bars", color: K.cssVar("--s0") }], { vlines: [{ x: pop.env, color: K.cssVar("--s1"), label: "bark" }] });
  chT.draw([{ pts: hist.env, color: K.cssVar("--s1"), label: "bark", dash: [6, 4] }, { pts: hist.mean, color: K.cssVar("--s0"), label: "mean moth", width: 2.4 }, { pts: hist.n.map(p => [p[0], p[1] / pop.o.K]), color: K.cssVar("--s3"), label: "population", width: 1.2 }]);
  const m = pop.mean(); read.set("gen", pop.gen); read.set("n", alive.length); read.set("mean", isFinite(m) ? m.toFixed(2) : "–"); read.set("mis", isFinite(m) ? Math.abs(m - pop.env).toFixed(2) : "–");
});
restart();
ui.tip("Which moths are the birds finding? · Try <b>Investigate → Be the bird</b>");
