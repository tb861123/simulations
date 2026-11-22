/* =====================================================================
   CREATURE EVOLUTION ARENA
   Each creature is a few balls (nodes) joined by springs. Some springs are
   MUSCLES: their natural length swings in and out like a clock, each with
   its own timing. Nobody designs a gait. Instead:

     1. A population of random creatures is tried out for a few seconds.
     2. FITNESS is measured: how far each walked (or swam, or how high it
        jumped).
     3. SELECTION: the fitter half survive.
     4. REPRODUCTION with variation: survivors have offspring that copy
        their genes with small random changes (MUTATION) and sometimes mix
        two parents' genes (CROSSOVER).
     5. Repeat.

   Over generations, body plans and rhythms that move well become common.
   This is evolution by natural selection, sped up, with the "environment"
   (flat ground, hills, water) deciding what counts as fit.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2;
const DT = 1 / 120;              // physics time step (s)
const G = 9.8;                   // gravity (m/s²)
const TX0 = -6, TDX = 0.25, TN = 1200;   // the ground: a height every 25 cm from x = −6 m to +294 m

/* ---------------- Genes ----------------
   genome = { f (muscle beats per second), nodes: [{ x, y, fr (friction 0–1) }], edges: [{ a, b, k (stiffness), m (0 = bone/tendon, 1 = muscle), amp, ph }] } */
function randomGenome(r) {
  const n = 3 + r.int(4), nodes = [];
  for (let i = 0; i < n; i++) nodes.push({ x: r() * 1.2, y: 0.1 + r() * 0.9, fr: r() });
  const g = { f: 0.6 + r() * 1.4, hue: r(), nodes, edges: [] }; connect(g, r); return g;
}
// join every node to its two or three nearest others, so the body holds its shape
function connect(g, r) {
  const n = g.nodes.length, has = new Set(g.edges.map(e => Math.min(e.a, e.b) + "," + Math.max(e.a, e.b)));
  for (let i = 0; i < n; i++) {
    const near = g.nodes.map((q, j) => [j, Math.hypot(q.x - g.nodes[i].x, q.y - g.nodes[i].y)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, Math.min(n - 1, 2 + (r() < 0.5 ? 1 : 0)));
    for (const [j] of near) { const key = Math.min(i, j) + "," + Math.max(i, j); if (has.has(key)) continue; has.add(key); g.edges.push({ a: i, b: j, k: 60 + r() * 240, m: r() < 0.6 ? 1 : 0, amp: 0.05 + r() * 0.25, ph: r() * TAU }); }
  }
}
const clone = g => JSON.parse(JSON.stringify(g));
// MUTATION: each gene has a chance `rate` of being nudged; rarely a node is added or removed
function mutate(g, r, rate) {
  const c = clone(g), j = (v, s, lo, hi) => Math.min(hi, Math.max(lo, v + (r() * 2 - 1) * s));
  if (r() < rate) c.f = j(c.f, 0.3, 0.3, 3);
  c.hue = ((c.hue || 0) + (r() - 0.5) * 0.04 + 1) % 1;   // colour drifts a little: no effect on fitness, it just shows family lines
  for (const n of c.nodes) { if (r() < rate) n.x = j(n.x, 0.15, -0.3, 1.6); if (r() < rate) n.y = j(n.y, 0.15, 0.05, 1.4); if (r() < rate) n.fr = j(n.fr, 0.25, 0, 1); }
  for (const e of c.edges) { if (r() < rate) e.k = j(e.k, 60, 30, 400); if (r() < rate) e.amp = j(e.amp, 0.08, 0, 0.35); if (r() < rate) e.ph = (e.ph + (r() * 2 - 1) * 1.2 + TAU) % TAU; if (r() < rate * 0.3) e.m = 1 - e.m; }
  if (r() < rate * 0.3 && c.nodes.length < 8) { const p = c.nodes[r.int(c.nodes.length)]; c.nodes.push({ x: p.x + (r() - .5) * 0.6, y: Math.max(0.05, p.y + (r() - .5) * 0.6), fr: r() }); connect(c, r); }
  else if (r() < rate * 0.3 && c.nodes.length > 3) { const k = r.int(c.nodes.length); c.nodes.splice(k, 1); c.edges = c.edges.filter(e => e.a !== k && e.b !== k).map(e => ({ ...e, a: e.a > k ? e.a - 1 : e.a, b: e.b > k ? e.b - 1 : e.b })); connect(c, r); }
  return c;
}
// CROSSOVER: if the parents have the same number of nodes, each gene comes from one parent or the other
function cross(a, b, r) {
  if (a.nodes.length !== b.nodes.length) return clone(a);
  const c = clone(a); if (r() < 0.5) c.f = b.f;
  c.nodes.forEach((n, i) => { if (r() < 0.5) Object.assign(n, b.nodes[i]); });
  const bm = new Map(b.edges.map(e => [Math.min(e.a, e.b) + "," + Math.max(e.a, e.b), e]));
  for (const e of c.edges) { const o = bm.get(Math.min(e.a, e.b) + "," + Math.max(e.a, e.b)); if (o && r() < 0.5) Object.assign(e, { k: o.k, m: o.m, amp: o.amp, ph: o.ph }); }
  return c;
}

/* ---------------- The body in the world ----------------
   mode: "walk" (gravity, ground, friction), "jump" (the same, fitness = highest the lowest ball gets), "swim" (no gravity or ground; water drag on every spring) */
class Body {
  constructor(g, ground, mode) {
    this.g = g; this.mode = mode; this.ground = ground;
    const minY = Math.min(...g.nodes.map(n => n.y)), cx = g.nodes.reduce((s, n) => s + n.x, 0) / g.nodes.length;
    const h0 = mode === "swim" ? 0 : groundAt(ground, 0);
    this.p = g.nodes.map(n => ({ x: n.x - cx, y: n.y - minY + h0 + (mode === "swim" ? 0 : 0.02), vx: 0, vy: 0, fr: n.fr }));
    this.e = g.edges.map(e => ({ ...e, L: Math.max(0.1, Math.hypot(g.nodes[e.a].x - g.nodes[e.b].x, g.nodes[e.a].y - g.nodes[e.b].y)) }));
    this.t = 0; this.x0 = this.cx(); this.best = 0; this.y0 = h0;
  }
  cx() { return this.p.reduce((s, q) => s + q.x, 0) / this.p.length; }
  cy() { return this.p.reduce((s, q) => s + q.y, 0) / this.p.length; }
  step() {
    const P = this.p, w = TAU * this.g.f * this.t, swim = this.mode === "swim";
    const fx = new Float64Array(P.length), fy = new Float64Array(P.length);
    for (const e of this.e) {
      const a = P[e.a], b = P[e.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, ux = dx / d, uy = dy / d;
      const L = e.m ? e.L * (1 + e.amp * Math.sin(w + e.ph)) : e.L;                 // a muscle's natural length swings in and out
      const vrel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
      const F = e.k * (d - L) + 2.5 * vrel;                                          // Hooke's law plus damping
      fx[e.a] += F * ux; fy[e.a] += F * uy; fx[e.b] -= F * ux; fy[e.b] -= F * uy;
      if (swim) {   // water pushes back on each spring as it sweeps sideways (much less if it slides along its length)
        const mx = (a.vx + b.vx) / 2, my = (a.vy + b.vy) / 2, vn = -mx * uy + my * ux, vt = mx * ux + my * uy, Dn = 6 * d, Dt = 0.6 * d;
        const Fx = -Dn * vn * -uy - Dt * vt * ux, Fy = -Dn * vn * ux - Dt * vt * uy; fx[e.a] += Fx / 2; fy[e.a] += Fy / 2; fx[e.b] += Fx / 2; fy[e.b] += Fy / 2;
      }
    }
    for (let i = 0; i < P.length; i++) {
      const q = P[i]; q.vx += fx[i] * DT; q.vy += (fy[i] - (swim ? 0 : G)) * DT;
      q.vx *= 0.999; q.vy *= 0.999; q.x += q.vx * DT; q.y += q.vy * DT;
      if (!swim) {   // the ground: no sinking in; friction slows sliding along it
        const h = groundAt(this.ground, q.x);
        if (q.y < h) { const sl = slopeAt(this.ground, q.x), nx = -sl / Math.hypot(1, sl), ny = 1 / Math.hypot(1, sl), vn = q.vx * nx + q.vy * ny;
          q.y = h; if (vn < 0) { q.vx -= vn * nx; q.vy -= vn * ny; }
          const tx = ny, ty = -nx, vt = q.vx * tx + q.vy * ty, keep = 1 - 0.9 * q.fr; q.vx -= vt * (1 - keep) * tx; q.vy -= vt * (1 - keep) * ty; }
      }
    }
    this.t += DT;
    if (this.mode === "jump") { const low = Math.min(...P.map(q => q.y - groundAt(this.ground, q.x))); if (low > this.best) this.best = low; }
  }
  fitness() { return this.mode === "jump" ? this.best : this.cx() - this.x0; }
  broken() { return this.p.some(q => !isFinite(q.x) || !isFinite(q.y) || Math.abs(q.vx) > 200); }
}
function groundAt(gr, x) { const u = (x - TX0) / TDX, i = Math.max(0, Math.min(TN - 2, Math.floor(u))), f = Math.min(1, Math.max(0, u - i)); return gr[i] * (1 - f) + gr[i + 1] * f; }
function slopeAt(gr, x) { const u = (x - TX0) / TDX, i = Math.max(0, Math.min(TN - 2, Math.floor(u))); return (gr[i + 1] - gr[i]) / TDX; }
const TERRAIN = {
  flat: { name: "Flat ground", h: x => 0 },
  hills: { name: "Rolling hills", h: x => x < 1 ? 0 : 0.35 * Math.sin(x * 0.7) + 0.2 * Math.sin(x * 1.9 + 1) - 0.35 * Math.sin(0.7) * 0 },
  uphill: { name: "Uphill", h: x => x < 1 ? 0 : (x - 1) * 0.12 },
  steps: { name: "Steps", h: x => x < 2 ? 0 : Math.floor((x - 2) / 2) * 0.12 },
  rough: { name: "Rocky", h: x => x < 1 ? 0 : 0.12 * (Math.sin(x * 5.3) + Math.sin(x * 11.7 + 2) * 0.6 + Math.sin(x * 2.1) * 0.8) }
};
function makeGround(k) { const f = TERRAIN[k].h, g = new Float32Array(TN); for (let i = 0; i < TN; i++) g[i] = f(TX0 + i * TDX); return g; }
// try one genome headless for `secs` seconds
function evaluate(g, ground, mode, secs) { const b = new Body(g, ground, mode); const n = Math.round(secs / DT); for (let s = 0; s < n; s++) { b.step(); if (s % 60 === 0 && b.broken()) return -1; } return b.broken() ? -1 : b.fitness(); }

/* ---------------- A population evolving ----------------
   o = { pop, rate (mutation chance per gene), cross (chance a child has two parents), select (true: the fitter half survive; false: a random half), mode, secs } */
class Evolution {
  constructor(o, ground, r) { Object.assign(this, { o, ground, r }); this.gen = 0; this.genomes = Array.from({ length: o.pop }, () => randomGenome(r)); this.history = []; this.fit = null; }
  score() { this.fit = this.genomes.map(g => evaluate(g, this.ground, this.o.mode, this.o.secs)); return this.fit; }
  // given this generation's fitness, record it and breed the next generation
  breed(fit) {
    const o = this.o, r = this.r, idx = fit.map((f, i) => i).sort((a, b) => fit[b] - fit[a]), sorted = idx.map(i => fit[i]);
    this.history.push({ gen: this.gen, best: sorted[0], median: sorted[sorted.length >> 1], champ: clone(this.genomes[idx[0]]) });
    const keep = Math.max(2, Math.round(o.pop / 2)), surv = o.select ? idx.slice(0, keep).map(i => this.genomes[i]) : Array.from({ length: keep }, () => this.genomes[r.int(this.genomes.length)]);
    const next = surv.map(clone);                          // survivors carry on unchanged (so the best is never lost)
    const pick = () => { const a = surv[r.int(surv.length)], b = surv[r.int(surv.length)]; return o.select ? (surv.indexOf(a) < surv.indexOf(b) ? a : b) : a; };   // a small tournament
    while (next.length < o.pop) { const a = pick(), child = r() < o.cross ? cross(a, pick(), r) : clone(a); next.push(mutate(child, r, o.rate)); }
    this.genomes = next; this.gen++;
  }
  generation() { this.breed(this.score()); }
}
const DEF = { pop: 40, rate: 0.15, cross: 0.4, select: true, mode: "walk", secs: 10, terrain: "flat" };
// batch: best fitness after `gens` generations
function trial(r, o) {
  const p = Object.assign({}, DEF, { pop: 30, secs: 8 }, o), ev = new Evolution(p, makeGround(p.terrain), r);
  for (let k = 0; k < p.gens; k++) ev.generation();
  return Math.max(...ev.score());
}

// =====================================================================
// THE PAGE (everything below runs only in the browser)
// =====================================================================
if (typeof module !== "undefined") module.exports = { Evolution, Body, randomGenome, mutate, cross, evaluate, makeGround, trial, DEF, TERRAIN, DT };
else page();
function page() {
const O = Object.assign({}, DEF); let terrain = "flat", ground = makeGround("flat"), ev, race, raceT = 0, speed = 2, ghosts = true, replay = null, bestEver = 0, cam = { x: 0, y: 0.6, zoom: 1 };
const MODE_NAME = { walk: "Walkers", jump: "Jumpers", swim: "Swimmers" }, UNIT = { walk: "m walked", jump: "m high", swim: "m swum" };
const ui = K.app({
  title: "Creature Evolution Arena", subject: "Biology",
  blurb: "Random blobs of springs and muscles learn to walk, jump and swim",
  reset: () => newPopulation(),
  missions: [
    { title: "From flailing to walking", q: "Start a new population of walkers. Generation 0 is pure chance. Watch the best and median distances on the chart for 15 generations. Is there steady progress, or sudden jumps?", hint: "Usually long flat spells, then a jump when a mutation or crossover hits on a better rhythm, which then spreads through the population (watch one colour take over). The median catches up with the best a few generations later as the new design's descendants fill the population. Evolution here is blind trial and error plus keeping what works.", setup() { setMode("walk"); setTerrain("flat"); newPopulation(); } },
    { title: "Turn selection off", q: "Switch 'Fittest half survive' off: now a random half survive each generation. Run 15 generations. What happens to the best and median distance?", hint: "Nothing improves: mutations still happen, but good ones are as likely to be thrown away as bad ones. Fitness wanders and even falls, because most mutations make a working creature worse. Variation alone is not evolution; it needs selection. (The batch run measures this.)", setup() { setMode("walk"); setTerrain("flat"); newPopulation(); ctl.select.set(false, true); } },
    { title: "How much mutation?", q: "Set the mutation rate to 0 and run 10 generations from a new population. Then 0.8. What difference does the rate make?", hint: "With no mutation, only crossover reshuffles the starting genes: progress stops almost at once. At 0.8 the best still creeps up, because the survivors are kept unchanged, but most children are much worse than their parents: look how far the median lags behind the best. Real mutation rates are tiny (most genes are copied perfectly), so children resemble their parents (heredity), which selection needs.", setup() { setMode("walk"); setTerrain("flat"); newPopulation(); ctl.rate.set(0, true); } },
    { title: "The environment changes", q: "Let walkers evolve on flat ground for 15 generations, then switch the ground to Steps (or draw your own hill). What happens to fitness, and then?", hint: "Fitness drops at once: the champions were adapted to flat ground. Over the next generations, designs that can climb (taller, longer strides, grippier feet) are selected and fitness recovers. What counts as 'fit' depends entirely on the environment.", setup() { setMode("walk"); setTerrain("flat"); newPopulation(); ui.tip("After about 15 generations, change the ground to Steps", 6000); } },
    { title: "Learning to swim", q: "Switch to Swimmers. In water there is no ground to push on. Watch the champions: how do they move? Why does a creature with only one muscle get nowhere?", hint: "A single muscle squeezing and relaxing pushes water one way, then exactly back the other way (the 'scallop theorem' of slow swimming): no net movement. Successful swimmers use several muscles out of step, so a wave runs along the body or a part sweeps back stiff and returns edge-on, like an oar. Evolution finds this without being told.", setup() { setMode("swim"); newPopulation(); } },
    { title: "Jumpers", q: "Switch to Jumpers (fitness = the highest the lowest part of the body gets off the ground). What kinds of body plans win? Compare with walkers.", hint: "Jumpers tend to become compact, stiff bodies with a strong muscle timed to fling the body upwards, sometimes building up a bounce over several cycles (resonance with the springs). Different jobs select different shapes.", setup() { setMode("jump"); setTerrain("flat"); newPopulation(); } },
    { title: "Run it again", q: "Start a new random population twice, and run each for 20 generations. Do you get the same 'species' both times? Look at the gallery of ancestors.", hint: "Almost never: one run evolves a two-legged shuffler, another a tumbling wheel or an inchworm. Which design wins depends on chance (which random creatures happened to start, which mutations happened). Real evolution is also 'contingent': rerun the tape of life and you would not get the same animals.", setup() { setMode("walk"); setTerrain("flat"); newPopulation(); } }
  ],
  batch: [
    { title: "Walkers: fitness over generations", question: "How far does the best walker get after more and more generations?", how: "Each run: 30 random creatures on flat ground, 8 s trials, mutation 0.15, crossover 0.4. The result is the best distance after that many generations (0 = the random starters).", xLabel: "generations", yLabel: "best distance in 8 s (m)", xs: [0, 5, 10, 15, 20, 30], reps: 4, yMin: 0, run: (x, r) => trial(r, { gens: x }), note: "Each run starts from different random creatures and gets different mutations, so some runs take off early and others stall for a while. On average the best distance climbs steeply at first, then more slowly." },
    { title: "Is selection needed?", question: "After 20 generations, how far does the best walker get with selection (the fitter half survive) compared with no selection (a random half survive)?", how: "Each run: 30 creatures, flat ground, 20 generations of 8 s trials. 0 = random survivors, 1 = the fitter half survive.", xLabel: "selection (0 = none, 1 = fittest half survive)", yLabel: "best distance in 8 s (m)", xs: [0, 1], reps: 6, yMin: 0, run: (x, r) => trial(r, { gens: 20, select: !!x }), note: "Without selection, the best distance after 20 generations is no better than the random starters (often worse); with it, several times further. Mutation supplies variation; selection is what turns variation into adaptation." },
    { title: "Mutation rate", question: "How does the chance of each gene mutating change how well walkers evolve in 20 generations?", how: "Each run: 30 creatures, flat ground, 20 generations of 8 s trials.", xLabel: "mutation rate (chance per gene)", yLabel: "best distance in 8 s (m)", xs: [0, 0.05, 0.15, 0.3, 0.6], reps: 4, yMin: 0, run: (x, r) => trial(r, { gens: 20, rate: x }), note: "With no mutation, crossover only reshuffles the starting genes and walkers barely improve (about 0.4 m). Any mutation from 0.05 to 0.6 per gene works about equally well here (5–7 m), because the survivors are kept unchanged, so the best design is never lost however wild the children are. Without that, very high rates would wreck good designs." },
    { title: "Swimmers: fitness over generations", question: "How far does the best swimmer get after more and more generations?", how: "Each run: 30 random creatures in water (no gravity, drag on every spring), 8 s trials.", xLabel: "generations", yLabel: "best distance swum in 8 s (m)", xs: [0, 10, 20, 30], reps: 4, yMin: 0, run: (x, r) => trial(r, { gens: x, mode: "swim" }), note: "Random swimmers barely move: back-and-forth strokes cancel out in slow, syrupy swimming. Evolution finds out-of-step muscle timings that make a wave, so distance climbs over the generations." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>A <b>genetic algorithm</b>: evolution by natural selection run on a computer.</p>
<ul><li><b>Genes.</b> Each creature's genome lists 3–8 balls (start position and how grippy each is) and the springs joining them (stiffness, and whether it is a muscle). A muscle's natural length swings in and out by up to 35% at the creature's own beat (0.3–3 beats a second), each muscle with its own timing (phase).</li>
<li><b>Physics.</b> Balls of 1 kg, springs obeying Hooke's law with damping, gravity 9.8 m/s², time step 1/120 s. A ball on the ground cannot sink in, and friction slows its sliding (a grippy ball barely slides, a slippery one slides freely). In water there is no gravity or ground; each spring is pushed back by the water as it sweeps sideways, ten times more than when it slides along its length.</li>
<li><b>Fitness.</b> Walkers: how far the middle of the body moves forward (right) in the trial time. Swimmers: the same in water. Jumpers: the highest the lowest ball gets above the ground.</li>
<li><b>Selection.</b> The fitter half of each generation survive unchanged (or, with selection off, a random half).</li>
<li><b>Reproduction.</b> The rest of the next generation are children of survivors picked in pairs (the fitter of two). With the crossover chance, a child mixes the genes of two parents of the same body size; then each gene may mutate (be nudged at random) with the mutation chance. Occasionally a ball is added or removed, or a spring becomes or stops being a muscle.</li>
<li><b>Colour</b> is a gene too, but it has no effect on fitness: it drifts slowly, so you can see one family line take over the population.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Creatures are flat (2D), with no brain and no senses: each muscle just repeats its rhythm. Real animals adjust their movements to what they feel.</li>
<li>Bodies cannot collide with themselves or with each other (the whole generation races through each other like ghosts).</li>
<li>There is no energy cost: a creature with huge muscles pays nothing for them. Real evolution trades speed against energy.</li>
<li>Reproduction is asexual or between two parents chosen from the survivors; there is no sex, no mate choice and no genetic drift beyond what chance in mutation and pairing gives.</li>
<li>A population of 10–80 and a few dozen generations, versus millions of animals and generations in nature. The computer is very fast at trying things out, which is the whole point.</li>
<li>A creature whose numbers blow up (a spring too stiff for the time step) scores −1 and is removed by selection.</li></ul>
<p>Inspired by Karl Sims's "Evolved Virtual Creatures" (1994). See also <a href="../natural_selection/natural-selection.html">Natural Selection</a> (moths and camouflage).</p>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("The task");
ctl.mode = K.seg(g, { label: "Evolve", value: O.mode, options: [["walk", "🚶 Walkers"], ["jump", "🦘 Jumpers"], ["swim", "🐟 Swimmers"]], on: v => { setMode(v); newPopulation(); } });
ctl.terrain = K.seg(g, { label: "Ground (changing it keeps the population)", value: terrain, options: [["flat", "Flat"], ["hills", "Hills"], ["uphill", "Uphill"], ["steps", "Steps"], ["rough", "Rocky"]], on: v => setTerrain(v) });
ctl.draw = K.toggle(g, { label: "✏️ Draw the ground with the mouse", value: false });
g = ui.group("Evolution");
ctl.pop = K.slider(g, { label: "Population", min: 10, max: 80, step: 2, value: O.pop, fmt: v => v + " creatures", on: v => O.pop = v, tip: "Takes effect at the next generation" });
ctl.rate = K.slider(g, { label: "Mutation rate", min: 0, max: 0.8, step: 0.01, value: O.rate, fmt: v => v.toFixed(2) + " per gene", on: v => O.rate = v });
ctl.cross = K.slider(g, { label: "Crossover", min: 0, max: 1, step: 0.05, value: O.cross, fmt: v => (v * 100).toFixed(0) + "% of children", on: v => O.cross = v });
ctl.select = K.toggle(g, { label: "Fittest half survive (selection)", value: true, on: v => O.select = v });
ctl.secs = K.slider(g, { label: "Trial length", min: 5, max: 20, step: 1, value: O.secs, fmt: v => v + " s", on: v => O.secs = v, tip: "Takes effect at the next generation" });
let r1 = K.row(g); K.btn(r1, "🎲 New population", () => newPopulation(), "primary"); K.btn(r1, "⏩ 10 generations", () => skip(10)).title = "Run ten generations straight away, without drawing them";
g = ui.group("Show");
ctl.speed = K.slider(g, { label: "Speed (× real time)", min: 1, max: 16, step: 1, value: speed, fmt: v => "× " + v, on: v => speed = v }); ui.headerSpeed(ctl.speed, { label: "Speed" });
ctl.zoom = K.slider(g, { label: "Zoom", min: 0.4, max: 2.5, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => cam.zoom = v });
ctl.ghosts = K.toggle(g, { label: "Show the whole generation", value: true, on: v => ghosts = v });
r1 = K.row(g); const bBack = K.btn(r1, "◀ Back to evolution", () => endReplay(), "primary"); bBack.style.display = "none"; K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("creature-evolution", view, cv));
const read = K.readout(g, [["gen", "generation"], ["left", "time left"], ["lead", "leader so far"], ["best", "best ever"], ["med", "last median"], ["body", "leader's body"]]);
K.note(g, "Click a creature in the gallery of ancestors (below) to watch it again.");

function setMode(m) { O.mode = m; ctl.mode.set(m); }
function setTerrain(k) { terrain = k; ctl.terrain.set(k); ground = makeGround(k); if (ev) ev.ground = ground; if (race) for (const b of race) b.ground = ground; uploadGround(); }
function newPopulation() { endReplay(true); ev = new Evolution(O, ground, K.rng((Math.random() * 1e9) | 0)); bestEver = 0; startRace(); }
function startRace() { race = (replay ? [replay.g] : ev.genomes).map(gn => new Body(gn, ground, O.mode)); raceT = 0; }
function finishRace() {
  if (replay) { startRace(); return; }
  const fit = race.map(b => b.broken() ? -1 : b.fitness()); bestEver = Math.max(bestEver, ...fit); ev.breed(fit); resize(); startRace(); drawGallery(); drawChart();
}
function resize() { while (ev.genomes.length > O.pop) ev.genomes.pop(); while (ev.genomes.length < O.pop) ev.genomes.push(randomGenome(ev.r)); ev.o = O; }
function skip(n) { endReplay(true); for (let k = 0; k < n; k++) { const f = ev.score(); bestEver = Math.max(bestEver, ...f); ev.breed(f); resize(); } startRace(); drawGallery(); drawChart(); }
function startReplay(h) { replay = { g: h.champ, gen: h.gen, fit: h.best }; bBack.style.display = ""; startRace(); }
function endReplay(quiet) { if (!replay) return; replay = null; bBack.style.display = "none"; if (!quiet) startRace(); }

// ---------------- WebGL: sky, ground or water, and the creatures ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.5 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, groundT, prBg, prTri, prDot, tri, dots;
const CAM_VS = `uniform vec2 uCanvas, uCam; uniform float uPPM; vec4 toClip(vec2 w) { vec2 px = (w - uCam) * uPPM; return vec4(px.x / uCanvas.x * 2.0, px.y / uCanvas.y * 2.0, 0.0, 1.0); }`;
if (ok) {
  quad = K.gl.quad(gl); groundT = K.gl.target(gl, TN, 1, { float: true, filter: "linear" });
  prBg = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uGround; uniform vec2 uCanvas, uCam; uniform float uPPM, uSwim, uTime, uTX0, uSpan;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec2 w = uCam + (gl_FragCoord.xy - uCanvas * 0.5) / uPPM;           // world position (metres) of this pixel
      if (uSwim > 0.5) {   // under water: deep blue, light shafts, drifting specks
        float depth = clamp(0.5 - w.y * 0.08, 0.0, 1.0);
        vec3 c = mix(vec3(0.08, 0.45, 0.62), vec3(0.01, 0.07, 0.16), depth);
        c += vec3(0.25, 0.4, 0.45) * pow(max(0.0, sin(w.x * 0.6 + w.y * 0.3 + uTime * 0.3) * sin(w.x * 1.7 - uTime * 0.2)), 6.0) * 0.4;
        vec2 sp = w * 6.0 + vec2(uTime * 0.5, sin(uTime * 0.3 + w.x) * 0.3); c += vec3(0.7) * step(0.985, hash(floor(sp))) * smoothstep(0.12, 0.0, length(fract(sp) - 0.5)) * 0.6;
        float grid = step(0.98, fract(w.x)) * 0.05; c += grid;
        gl_FragColor = vec4(c, 1.0); return;
      }
      float h = texture2D(uGround, vec2((w.x - uTX0) / uSpan, 0.5)).r;
      if (w.y > h) {   // sky, with far hills drifting slowly behind (parallax)
        vec3 c = mix(vec3(0.55, 0.72, 0.92), vec3(0.16, 0.3, 0.55), clamp((w.y - h) * 0.12, 0.0, 1.0));
        float fx = w.x * 0.5 - uCam.x * 0.35, far = 0.8 + 1.1 * noise(vec2(fx * 0.25, 3.0)) + 0.35 * noise(vec2(fx * 1.1, 7.0));
        if (w.y < h + far) c = mix(c, vec3(0.32, 0.45, 0.5), 0.5);
        gl_FragColor = vec4(c, 1.0); return;
      }
      float d = h - w.y;
      vec3 soil = mix(vec3(0.36, 0.25, 0.15), vec3(0.24, 0.16, 0.1), noise(w * 3.0)) * (1.0 - 0.25 * clamp(d * 0.6, 0.0, 1.0));
      vec3 c = d < 0.06 ? mix(vec3(0.3, 0.62, 0.22), vec3(0.2, 0.48, 0.15), noise(w * 20.0)) : soil;
      if (abs(fract(w.x + 0.5) - 0.5) < 0.012 && d < 0.35) c = mix(c, vec3(1.0), 0.5);       // a mark every metre
      gl_FragColor = vec4(c, 1.0);
    }`);
  prTri = K.gl.program(gl, `precision highp float; attribute vec2 aPos; attribute vec4 aCol; varying vec4 vCol; ${CAM_VS} void main() { gl_Position = toClip(aPos); vCol = aCol; }`,
    `precision highp float; varying vec4 vCol; void main() { gl_FragColor = vCol; }`);
  prDot = K.gl.program(gl, `precision highp float; attribute vec2 aPos; attribute vec4 aCol; attribute float aSize; varying vec4 vCol; ${CAM_VS} void main() { gl_Position = toClip(aPos); vCol = aCol; gl_PointSize = aSize; }`,
    `precision highp float; varying vec4 vCol; void main() { vec2 q = gl_PointCoord - 0.5; float r = length(q); if (r > 0.5) discard; float rim = smoothstep(0.32, 0.5, r); gl_FragColor = vec4(mix(vCol.rgb, vCol.rgb * 0.35, rim) + (1.0 - rim) * 0.15 * (0.5 - q.y), vCol.a); }`);
  tri = K.gl.points(gl, { aPos: 2, aCol: 4 }); dots = K.gl.points(gl, { aPos: 2, aCol: 4, aSize: 1 });
}
function uploadGround() { if (!ok) return; const d = new Float32Array(4 * TN); for (let i = 0; i < TN; i++) d[4 * i] = ground[i]; groundT.upload(d); }
const hsl = (h, s, l) => { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; };

// ---------------- Drawing ----------------
function leader() { let best = null, bf = -Infinity; for (const b of race) { if (b.broken()) continue; const f = O.mode === "jump" ? b.cy() : b.fitness(); if (f > bf) { bf = f; best = b; } } return best || race[0]; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, d = view.dpr, L = leader(), ppm = 150 * cam.zoom * (O.mode === "swim" ? 1.4 : 1);
  if (L && !L.broken()) { const tx = L.cx() + (O.mode === "walk" ? 1.2 : 0), ty = O.mode === "swim" ? L.cy() : Math.max(L.cy(), groundAt(ground, L.cx()) + 0.5) + 0.3; cam.x += (tx - cam.x) * 0.08; cam.y += (ty - cam.y) * 0.08; }
  c.clearRect(0, 0, w, h);
  if (ok) {
    K.gl.bindTarget(gl, null); const U = { uCanvas: [view.el.width, view.el.height], uCam: [cam.x, cam.y], uPPM: ppm * d };
    prBg.set(Object.assign({ uGround: groundT, uSwim: O.mode === "swim" ? 1 : 0, uTime: performance.now() / 1000, uTX0: TX0 + TDX / 2 - TDX / 2, uSpan: TN * TDX }, U)); quad.draw(prBg);
    // every spring a thick line (two triangles), every ball a round dot; the leader on top, the others faint
    const T = [], C = [], DP = [], DC = [], DS = [], order = race.filter(b => b !== L).concat([L]);
    for (const b of order) {
      if (b.broken() || (!ghosts && b !== L)) continue; const lead = b === L, a = lead ? 1 : 0.22, [hr, hg, hb] = hsl(b.g.hue || 0, 0.65, 0.55), ph = TAU * b.g.f * b.t;
      for (const e of b.e) { const p = b.p[e.a], q = b.p[e.b], dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, wdt = (e.m ? 0.045 : 0.025) * (lead ? 1 : 0.8), nx = -dy / len * wdt, ny = dx / len * wdt;
        const s = e.m ? 0.5 + 0.5 * Math.sin(ph + e.ph) : 0, col = e.m ? [0.85 + 0.15 * s, 0.25 + 0.2 * (1 - s), 0.2, a] : [0.92, 0.88, 0.78, a * 0.9];   // muscles flush redder as they contract
        T.push(p.x + nx, p.y + ny, p.x - nx, p.y - ny, q.x + nx, q.y + ny, q.x + nx, q.y + ny, p.x - nx, p.y - ny, q.x - nx, q.y - ny); for (let k = 0; k < 6; k++) C.push(...col); }
      for (const q of b.p) { DP.push(q.x, q.y); const g0 = 1 - q.fr; DC.push(hr * (0.5 + 0.5 * g0), hg * (0.5 + 0.5 * g0), hb * (0.5 + 0.5 * g0), a); DS.push((lead ? 0.14 : 0.11) * ppm * d); }
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    tri.set("aPos", new Float32Array(T)).set("aCol", new Float32Array(C)); prTri.set(U); tri.draw(prTri, T.length / 2, gl.TRIANGLES);
    dots.set("aPos", new Float32Array(DP)).set("aCol", new Float32Array(DC)).set("aSize", new Float32Array(DS)); prDot.set(U); dots.draw(prDot, DP.length / 2);
    gl.disable(gl.BLEND);
  }
  // distance labels every 5 m, and the start line
  const X = x => w / 2 + (x - cam.x) * ppm, Y = y => h / 2 - (y - cam.y) * ppm;
  c.font = "600 12px Segoe UI,system-ui,sans-serif"; c.textAlign = "center";
  if (O.mode !== "swim") for (let m = Math.ceil((cam.x - w / 2 / ppm) / 5) * 5; m < cam.x + w / 2 / ppm; m += 5) { c.fillStyle = "rgba(255,255,255,.85)"; c.fillText(m + " m", X(m), Y(groundAt(ground, m)) + 22); }
  else for (let m = Math.ceil((cam.x - w / 2 / ppm) / 2) * 2; m < cam.x + w / 2 / ppm; m += 2) { c.fillStyle = "rgba(220,240,255,.55)"; c.fillText(m + " m", X(m), h - 12); }
  if (O.mode === "jump" && L) { c.strokeStyle = "rgba(255,220,120,.8)"; c.setLineDash([6, 5]); const yb = Y(groundAt(ground, L.cx()) + L.best); c.beginPath(); c.moveTo(0, yb); c.lineTo(w, yb); c.stroke(); c.setLineDash([]); c.fillStyle = "rgba(255,220,120,.95)"; c.textAlign = "left"; c.fillText("leader's best jump " + L.best.toFixed(2) + " m", 12, yb - 6); }
  if (!ok) { c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); }
}
const chF = K.chart(ui.dock, { title: "Fitness over the generations", xLabel: "generation", yLabel: "m", yMin: 0 });
// the gallery of ancestors: the champion of earlier generations, drawn small. Click one to watch it again.
const gal = K.$("div", "k-chart"), galC = K.$("canvas"); gal.append(galC); ui.dock.append(gal); let galCells = [];
function drawChart() {
  const hs = ev.history; chF.draw([{ pts: hs.map(q => [q.gen, Math.max(0, q.best)]), color: K.cssVar("--s1"), label: "best" }, { pts: hs.map(q => [q.gen, Math.max(0, q.median)]), color: K.cssVar("--s0"), label: "median" }], { xMin: 0, title: MODE_NAME[O.mode] + ": " + UNIT[O.mode] });
}
function drawGallery() {
  const W2 = gal.clientWidth, H2 = gal.clientHeight; if (W2 < 40) return; const dpr = Math.min(2, devicePixelRatio || 1); galC.width = W2 * dpr; galC.height = H2 * dpr; const c = galC.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W2, H2); c.fillStyle = K.cssVar("--text"); c.font = "600 12px Segoe UI,system-ui,sans-serif"; c.textAlign = "left"; c.fillText("Gallery of ancestors (click to watch one again)", 8, 14);
  const hs = ev.history, n = Math.min(8, hs.length), pick = []; for (let k = 0; k < n; k++) pick.push(hs[Math.round(k * (hs.length - 1) / Math.max(1, n - 1))]);
  const cw = (W2 - 8) / 4, ch = (H2 - 24) / 2; galCells = [];
  pick.forEach((q, k) => {
    const x0 = 4 + (k % 4) * cw, y0 = 22 + Math.floor(k / 4) * ch, gnm = q.champ; galCells.push([x0, y0, cw, ch, q]);
    c.strokeStyle = K.cssVar("--grid"); c.strokeRect(x0 + 2, y0 + 2, cw - 4, ch - 4);
    const xs = gnm.nodes.map(p => p.x), ys = gnm.nodes.map(p => p.y), mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys), s = Math.min((cw - 20) / (mxx - mnx + 0.2), (ch - 30) / (mxy - mny + 0.2), 60);
    const P = p => [x0 + cw / 2 + (p.x - (mnx + mxx) / 2) * s, y0 + (ch - 14) / 2 + 2 - (p.y - (mny + mxy) / 2) * s], [hr, hg, hb] = hsl(gnm.hue || 0, 0.65, 0.55);
    c.lineWidth = 2; for (const e of gnm.edges) { const a = P(gnm.nodes[e.a]), b = P(gnm.nodes[e.b]); c.strokeStyle = e.m ? "#e0503a" : "#d8d0bc"; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    for (const p of gnm.nodes) { const a = P(p); c.fillStyle = `rgb(${hr * 255 | 0},${hg * 255 | 0},${hb * 255 | 0})`; c.beginPath(); c.arc(a[0], a[1], 3.5, 0, TAU); c.fill(); }
    c.fillStyle = K.cssVar("--muted"); c.font = "11px Segoe UI,system-ui,sans-serif"; c.textAlign = "center"; c.fillText(`gen ${q.gen} · ${q.best.toFixed(2)} m`, x0 + cw / 2, y0 + ch - 5);
  });
}
new ResizeObserver(() => drawGallery()).observe(gal);
galC.addEventListener("click", e => { const r = galC.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; const hit = galCells.find(([x0, y0, w0, h0]) => x >= x0 && y >= y0 && x < x0 + w0 && y < y0 + h0); if (hit) startReplay(hit[4]); });

// ---------------- Drawing the ground with the mouse ----------------
let lastDraw = null;
function paintGround(p) {
  const ppm = 150 * cam.zoom, wx = cam.x + (p.x - cv.w / 2) / ppm, wy = K.clamp(cam.y - (p.y - cv.h / 2) / ppm, -3, 6);
  const from = lastDraw || { wx, wy }; const n = Math.max(1, Math.ceil(Math.abs(wx - from.wx) / TDX));
  for (let k = 0; k <= n; k++) { const x = from.wx + (wx - from.wx) * k / n, y = from.wy + (wy - from.wy) * k / n, i = Math.round((x - TX0) / TDX); if (i > 0 && i < TN) ground[i] = y; }
  lastDraw = { wx, wy }; uploadGround();
}
K.pointer(cv.el, { down(p) { if (ctl.draw.value && O.mode !== "swim") { lastDraw = null; paintGround(p); } }, drag(p) { if (ctl.draw.value && O.mode !== "swim") paintGround(p); }, up() { lastDraw = null; } });
cv.el.addEventListener("wheel", e => { e.preventDefault(); cam.zoom = K.clamp(cam.zoom * Math.exp(-e.deltaY * 0.0012), 0.4, 2.5); ctl.zoom.set(cam.zoom); }, { passive: false });

// ---------------- The loop ----------------
uploadGround(); newPopulation(); drawChart();
let frame = 0;
ui.run(dt => { const n = Math.max(1, Math.round(speed * Math.min(dt, 0.05) / DT)); for (let k = 0; k < n; k++) { for (const b of race) if (!b.broken()) b.step(); raceT += DT; if (raceT >= O.secs) { finishRace(); break; } } }, () => {
  draw(); if (frame++ % 6) return; const L = leader(), last = ev.history[ev.history.length - 1];
  read.set("gen", ev.gen); read.set("left", Math.max(0, O.secs - raceT).toFixed(1) + " s"); read.set("lead", L ? (O.mode === "jump" ? L.best : L.fitness()).toFixed(2) + " " + UNIT[O.mode].split(" ")[0] : "–");
  read.set("best", bestEver.toFixed(2) + " m"); read.set("med", last ? last.median.toFixed(2) + " m" : "–"); read.set("body", L ? `${L.p.length} balls, ${L.e.filter(e => e.m).length} muscles` : "–");
  ui.hud(replay ? `<b style="font-size:15px">Replay: champion of generation ${replay.gen}</b><br>it scored ${replay.fit.toFixed(2)} m` : `<b style="font-size:15px">${MODE_NAME[O.mode]} · generation ${ev.gen}</b><br>${race.length} creatures · ${Math.max(0, O.secs - raceT).toFixed(1)} s left`);
});
window.evoTest = { skip, run(sec) { for (let k = 0; k < sec / DT; k++) { for (const b of race) if (!b.broken()) b.step(); raceT += DT; if (raceT >= O.secs) finishRace(); } }, setMode, newPopulation, setTerrain };
ui.tip("Every creature is random springs and muscles · the fitter half breed each generation · drag the speed up to watch evolution happen", 8000);
}
