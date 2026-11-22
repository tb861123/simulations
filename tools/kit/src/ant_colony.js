/* =====================================================================
   ANT COLONY FORAGING
   One ant is not clever. It wanders, it smells, it lays a little scent.
   But a colony finds food, builds busy trails to it, picks the shorter of
   two routes and re-routes round a fallen twig, with no ant in charge.

   Each ant in this model follows a few rules every step (a tenth of a
   second):
     1. Searching ants (no food) follow the FOOD scent and lay HOME scent.
        Ants carrying food follow the HOME scent and lay FOOD scent.
     2. An ant smells the scent at three points a little ahead of it
        (left, straight on, right) and tends to turn towards the strongest.
     3. Every turn has some randomness: exploration.
     4. The scent an ant lays is strongest just after leaving the nest or
        the food, and weaker the longer it has been walking. So following
        the stronger scent leads back towards where it came from.
     5. Food or the nest close by (within a few cm) is seen, and the ant
        heads straight for it.
   Scent evaporates. Busy trails are topped up and stay; unused ones fade.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const W = 240, H = 135;          // the arena, in cells of 2.5 mm (60 cm × 34 cm)
const DT = 0.1;                  // one step = 0.1 s; ants walk one cell (2.5 mm) a step, 2.5 cm/s
const SENSE_D = 5, SENSE_A = 35 * DEG, SEE_FOOD = 7, SEE_NEST = 9, TAU_LAY = 400;   // smelling distance (cells) and angle; seeing distances; how fast laid scent weakens with time away

/* ---------------- The arena ----------------
   Maps give the nest, food patches and walls in fractions of the arena (x across, y down). */
const MAPS = {
  open: { name: "Open floor", nest: [0.18, 0.5], food: [[0.78, 0.3, 300], [0.72, 0.78, 300]], walls: [] },
  bridge: { name: "Double bridge", nest: [0.1, 0.87], food: [[0.9, 0.87, 3000]], walls: [[0.3, 0.14, 0.4, 0.6]], route: true },   // after Goss et al. (1989): a short route under the island, a long one over it
  near_far: { name: "Near and far", nest: [0.5, 0.5], food: [[0.32, 0.5, 400], [0.92, 0.5, 400]], walls: [] },
  scattered: { name: "Many small patches", nest: [0.5, 0.5], food: [[0.15, 0.2, 80], [0.85, 0.2, 80], [0.15, 0.8, 80], [0.85, 0.8, 80], [0.5, 0.1, 80], [0.5, 0.9, 80]], walls: [] },
  obstacle: { name: "A wall in the way", nest: [0.15, 0.5], food: [[0.85, 0.5, 600]], walls: [[0.48, 0.12, 0.03, 0.76]] }
};

function paintWalls(wall, rects) {
  for (const [x, y, w, h] of rects) for (let j = Math.floor(y * H); j < Math.ceil((y + h) * H); j++) for (let i = Math.floor(x * W); i < Math.ceil((x + w) * W); i++) if (i >= 0 && j >= 0 && i < W && j < H) wall[i + j * W] = 1;
}

/* ---------------- The colony ----------------
   p = { ants, evap (fraction of the scent lost per second), rand (degrees: random turn each step), follow (0–1: how strongly ants turn towards scent),
         lay (scent laid per step, at the source), renew (true: when a patch is emptied a new one appears elsewhere), patchSize } */
class Colony {
  constructor(map, p, rand) {
    this.p = p; this.rand = rand; this.t = 0; this.delivered = 0; this.picked = 0; this.log = [];
    this.wall = new Uint8Array(W * H); paintWalls(this.wall, map.walls || []);
    this.nest = { x: map.nest[0] * W, y: map.nest[1] * H, r: 5 };
    this.food = map.food.map(([x, y, a]) => ({ x: x * W, y: y * H, r: 5, amount: p.patchSize || a, start: p.patchSize || a }));
    // two scents, stored "lazily": each cell keeps the amount and the time it was last topped up, and the decay since is worked out when it is read
    this.home = new Float32Array(W * H); this.homeT = new Float32Array(W * H); this.foodS = new Float32Array(W * H); this.foodT = new Float32Array(W * H);
    this.route = map.route ? { short: 0, long: 0 } : null;
    this.ants = []; this.setAnts(p.ants);
  }
  setAnts(n) {
    while (this.ants.length < n) { const a = this.rand() * TAU; this.ants.push({ x: this.nest.x + Math.cos(a) * 3, y: this.nest.y + Math.sin(a) * 3, h: a, carry: false, clock: 0, side: 0 }); }
    if (this.ants.length > n) this.ants.length = n;
  }
  // how much scent is in a cell now (k = decay rate per step)
  scent(arr, tarr, i) { return arr[i] * Math.exp(-this.k * (this.t - tarr[i])); }
  lay(arr, tarr, i, q) { arr[i] = this.scent(arr, tarr, i) + q; tarr[i] = this.t; }
  smell(arr, tarr, x, y) { const X = x | 0, Y = y | 0; if (X < 0 || Y < 0 || X >= W || Y >= H) return -1; const i = X + Y * W; return this.wall[i] ? -1 : this.scent(arr, tarr, i); }
  step() {
    const p = this.p, r = this.rand, R = p.rand * DEG, F = p.follow == null ? 0.8 : p.follow; this.k = -Math.log(1 - Math.min(0.999, p.evap)) * DT;   // evap per second → decay per step
    const nest = this.nest;
    for (const a of this.ants) {
      const [arr, tarr] = a.carry ? [this.home, this.homeT] : [this.foodS, this.foodT];
      // 5. food or nest in sight: head straight for it
      let goal = null;
      if (a.carry) { if (Math.hypot(nest.x - a.x, nest.y - a.y) < SEE_NEST) goal = nest; }
      else for (const f of this.food) if (f.amount > 0 && Math.hypot(f.x - a.x, f.y - a.y) < SEE_FOOD) { goal = f; break; }
      if (goal) a.h = Math.atan2(goal.y - a.y, goal.x - a.x) + (r() - 0.5) * 0.3;
      else {
        // 2. smell left, ahead and right; turn towards the strongest (with probability "follow")
        const L = this.smell(arr, tarr, a.x + SENSE_D * Math.cos(a.h - SENSE_A), a.y + SENSE_D * Math.sin(a.h - SENSE_A)),
          C = this.smell(arr, tarr, a.x + SENSE_D * Math.cos(a.h), a.y + SENSE_D * Math.sin(a.h)),
          Rt = this.smell(arr, tarr, a.x + SENSE_D * Math.cos(a.h + SENSE_A), a.y + SENSE_D * Math.sin(a.h + SENSE_A));
        if (Math.max(L, C, Rt) > 0.01 && r() < F) { if (L > C && L > Rt) a.h -= SENSE_A * 0.6; else if (Rt > C && Rt > L) a.h += SENSE_A * 0.6; }
        // 3. a random wobble: exploration
        a.h += (r() + r() - 1) * R;
      }
      // move, unless a wall or the edge is in the way (then turn somewhere new)
      const nx = a.x + Math.cos(a.h), ny = a.y + Math.sin(a.h), X = nx | 0, Y = ny | 0;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || this.wall[X + Y * W]) { a.h += Math.PI * (0.5 + r()); a.clock++; continue; }
      a.x = nx; a.y = ny; a.clock++;
      // 1 and 4. lay scent: HOME scent while searching, FOOD scent while carrying; weaker the longer since leaving the nest or the food
      const q = p.lay * Math.exp(-a.clock / TAU_LAY);
      if (q > 0.01) { if (a.carry) this.lay(this.foodS, this.foodT, X + Y * W, q); else this.lay(this.home, this.homeT, X + Y * W, q); }
      if (this.route) a.side = a.x > 0.32 * W && a.x < 0.68 * W ? (a.y > 0.74 * H ? 1 : a.y < 0.14 * H ? 2 : a.side) : a.side;   // which branch of the bridge it is on
      // pick up and drop off
      if (!a.carry) { for (const f of this.food) if (f.amount > 0 && Math.hypot(f.x - a.x, f.y - a.y) < f.r) { f.amount--; this.picked++; a.carry = true; a.clock = 0; a.h += Math.PI; a.side = 0; if (f.amount <= 0 && p.renew) this.renew(f); break; } }
      else if (Math.hypot(nest.x - a.x, nest.y - a.y) < nest.r) { a.carry = false; a.clock = 0; a.h += Math.PI; this.delivered++; this.log.push(this.t); if (this.route && a.side) this.route[a.side === 1 ? "short" : "long"]++; a.side = 0; }
    }
    this.t++;
  }
  // an emptied patch is replaced by a fresh one somewhere else (well away from the nest), as in real foraging where food sources come and go
  renew(f) {   // the new patch appears at one of eight sites on a ring round the nest (not where it just was)
    const old = Math.round(Math.atan2(f.y - this.nest.y, f.x - this.nest.x) / (TAU / 8));
    for (let k = 0; k < 20; k++) { const site = this.rand() * 8 | 0; if (site === ((old % 8) + 8) % 8) continue; const a = site * TAU / 8, x = this.nest.x + 80 * Math.cos(a), y = this.nest.y + 50 * Math.sin(a);
      if (x > 6 && y > 6 && x < W - 6 && y < H - 6 && !this.wall[(x | 0) + (y | 0) * W]) { f.x = x; f.y = y; f.amount = f.start; return; } }
  }
  // food brought home per minute, over the last `sec` seconds
  rate(sec = 60) { const t0 = this.t - sec / DT; let n = 0; for (let i = this.log.length - 1; i >= 0 && this.log[i] > t0; i--) n++; return n * 60 / Math.min(sec, this.t * DT || 1); }
}
// one headless run for the batch: food per minute averaged over the last `measure` seconds of `secs`
function trial(rand, o) {
  const map = MAPS[o.map || "open"], p = Object.assign({}, DEF, o.p || {});
  const c = new Colony(map, p, rand), steps = Math.round((o.secs || 300) / DT), m0 = steps - Math.round((o.measure || 180) / DT);
  let d0 = 0; for (let s = 0; s < steps; s++) { if (s === m0) d0 = c.delivered; c.step(); }
  return { perMin: (c.delivered - d0) * 60 / (o.measure || 180), colony: c };
}
const halfLife = s => 1 - Math.pow(2, -1 / s);   // scent half-life (seconds) → fraction lost per second
const DEF = { ants: 300, evap: halfLife(10), rand: 12, follow: 0.8, lay: 1, renew: false, patchSize: 0 };

// =====================================================================
// THE PAGE (everything below runs only in the browser)
// =====================================================================
if (typeof module !== "undefined") module.exports = { Colony, trial, MAPS, DEF, W, H, DT, halfLife };
else page();
function page() {
const P = Object.assign({}, DEF); let map = "open", col, speed = 4, show = "both", log = { rate: [], carry: [] }, lastLog = 0;
const ui = K.app({
  title: "Ant Colony Foraging", subject: "Biology",
  blurb: "No ant is in charge, yet the colony finds the shortest way",
  reset: () => load(map),
  missions: [
    { title: "From wandering to highways", q: "Restart the open floor and watch the first minute. The ants know nothing about where the food is. How do the first trails form, and why do they get straighter?", hint: "At first every ant wanders, laying home scent. The few that stumble on food walk back laying food scent, strongest near the food. Other ants following that scent find the food sooner and add more, so one route wins (positive feedback). Wiggly bits of a trail are slower to walk, get less traffic, fade, and are short-cut: the trail straightens.", setup() { load("open"); } },
    { title: "The double bridge", q: "Two routes to the food: under the island (short) or over it (long). In 1989 Goss and colleagues gave Argentine ants exactly this choice. Which route wins, and how long does it take? Watch the 'short route' readout.", hint: "Ants taking the short route get back sooner, so the short route is marked first and more often. That small head start grows: within a few minutes nearly all the traffic takes the short route (about 95% here). No ant compares the lengths. Real ants did the same, though not every colony picked the short branch every time.", setup() { load("bridge"); } },
    { title: "Block the trail", q: "Let a busy trail form, then choose 🧱 Wall and draw a wall across it. What do the ants do? How long until there is a new trail round it?", hint: "Ants pile up at the wall and spread along it (random turns). The ones that get round find the old scent beyond and lay new scent on the detour. The old trail behind the wall fades, the detour is reinforced, and within a minute or two traffic flows round the end of the wall.", setup() { load("open"); ui.tip("Wait for a trail, then draw a wall across it", 6000); } },
    { title: "Move the food", q: "Drag a food patch somewhere new while the ants are using it. Set the scent half-life to 120 s and try again, then 3 s. When is the colony quickest to switch?", hint: "Long-lasting scent keeps ants marching to the old spot for minutes after the food has gone: the colony is stubborn. Very short-lived scent never builds a trail at all. In between, the old trail fades soon enough to free the ants to find the new spot. Evaporation is not a flaw: it is how the colony forgets.", setup() { load("open"); } },
    { title: "How much randomness?", q: "Set exploration randomness to 0, restart, and watch. Then try 45°. Why does a colony need ants that make mistakes?", hint: "Up to about 30° the colony copes well: walls, the edge and the scent itself already scatter the ants enough to find new food. Beyond that, ants cannot hold a trail and foraging falls off. Real ants are 'noisy' on purpose: some always leave the trail, and those are the ones that find new food and short-cuts. Try it with 'New food appears' on.", setup() { load("open"); ctl.rand.set(0, true); } },
    { title: "Too few ants", q: "Turn the colony down to 30 ants and restart. Is there still a trail? How many ants does it take before trails appear?", hint: "With few ants, scent evaporates before anyone else walks the same way, so no trail builds up and each ant forages alone. Above a critical number trails form and the whole colony speeds up. Small colonies of real species often forage alone or recruit nestmates one at a time ('tandem running') instead.", setup() { load("open"); ctl.ants.set(30, true); } },
    { title: "Near or far?", q: "Food on both sides of the nest, one close and one far. Which does the colony empty first? Does it use both at once?", hint: "The near patch nearly always wins, because round trips are quicker and its trail is reinforced faster. Usually the colony concentrates on it and only switches to the far patch once the near one is empty and its trail fades.", setup() { load("near_far"); } }
  ],
  batch: [
    { title: "Evaporation: an optimum?", question: "How does the scent's half-life change how much food the colony brings home, when food patches run out and new ones appear?", how: "Each run: 300 ants on the open floor, two patches of 100 crumbs; an emptied patch is replaced at a new site. 6 minutes; food per minute measured over the last 3.", xLabel: "scent half-life (s)", yLabel: "food brought home per minute", xs: [1, 3, 5, 10, 20, 40, 80], reps: 6, yMin: 0, run: (x, r) => trial(r, { secs: 360, p: { evap: halfLife(x), renew: true, patchSize: 100 } }).perMin, note: "Where the next patch appears is random, so runs vary a lot. Very short-lived scent (1 s) cannot hold a trail. Very long-lived scent keeps ants on trails to food that has run out. The best is in between: about 3–5 s here, falling slowly for longer half-lives." },
    { title: "Bigger colonies: better ants?", question: "Does each ant bring home more food in a bigger colony?", how: "Each run: two patches of 100 crumbs, replaced when empty; 6 minutes; food per minute per ant over the last 3.", xLabel: "number of ants", yLabel: "food per ant per minute", xs: [25, 50, 100, 200, 400, 800], reps: 4, yMin: 0, run: (x, r) => trial(r, { secs: 360, p: { ants: x, renew: true, patchSize: 100 } }).perMin / x, note: "Small colonies lay too little scent to keep a trail, so each ant forages alone and brings home about 0.2–0.3 crumbs a minute. From about 200 ants trails hold and each ant brings home about twice as much; beyond that it levels off, because the patches empty and new ones must be found. In this model ants never block each other; real crowding would cut it further." },
    { title: "How much randomness?", question: "How does the randomness of each turn change the colony's foraging?", how: "Each run: 300 ants, renewing patches, 6 minutes; food per minute over the last 3.", xLabel: "exploration randomness (°)", yLabel: "food brought home per minute", xs: [0, 5, 10, 20, 30, 45], reps: 6, yMin: 0, run: (x, r) => trial(r, { secs: 360, p: { rand: x, renew: true, patchSize: 100 } }).perMin, note: "In this arena the colony does about as well anywhere from 0 to about 30° (walls, the edge and the scent itself already scatter the ants), but at 45° ants can no longer hold a trail and the food brought home roughly halves. Runs vary a lot because of where new food appears." },
    { title: "The double bridge", question: "What share of the ants coming home with food used the short route?", how: "Each run: 300 ants, the double bridge, 3 minutes. Every ant that brings food home is counted on the branch it last used.", xLabel: "", yLabel: "share of trips on the short branch", reps: 30, bins: 15, lo: 0.4, hi: 1, run: r => 0, note: "Nearly every run picks the short branch, most with over 90% of the traffic. Goss et al. (1989) found Argentine ants chose the short branch in most trials when the long one was twice as long. Early random choices matter: in a few runs the long branch keeps a share for a while." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>An ant colony foraging on a 60 cm × 34 cm floor divided into 2.5 mm cells. Each step is 0.1 s; ants walk 2.5 cm a second.</p>
<ol><li><b>Two scents.</b> Searching ants lay <i>home scent</i> and follow <i>food scent</i>; ants carrying food lay food scent and follow home scent.</li>
<li><b>Smelling.</b> Each ant smells 12.5 mm ahead, straight on and 35° to each side, and (with probability "trail following") turns towards the strongest.</li>
<li><b>Exploration.</b> Every step its heading also changes by a random amount (the randomness setting is the largest change).</li>
<li><b>Fading laying.</b> The amount laid falls by e for every 40 s since the ant left the nest or the food, so stronger scent points back towards where it came from.</li>
<li><b>Seeing.</b> Food within 17.5 mm and the nest within 22.5 mm are seen, and the ant walks straight to them.</li>
<li><b>Evaporation.</b> Scent decays exponentially, set by its half-life.</li></ol>
<h3>Assumptions and simplifications</h3>
<ul><li>Real ants use several cues: trail pheromones, the Sun and polarised light, landmarks, and path integration (counting steps and turns). Here they use only scent and sight of nearby food and the nest.</li>
<li>Ants never bump into or block each other, never tire, never get lost for good, and carry exactly one crumb.</li>
<li>Scent does not spread sideways (no diffusion); it only evaporates. Walls stop ants but not smell.</li>
<li>Food patches hold a set number of crumbs. With "new food appears", an emptied patch is replaced at one of eight sites on a ring round the nest.</li>
<li>The double bridge counts an ant's trip on the branch it was last on before reaching the nest.</li>
<li>The ants and scent are drawn with WebGL; the model itself (and the Batch run) runs on the main processor.</li></ul>
<h3>Sources</h3><p>Goss, S., Aron, S., Deneubourg, J.-L. and Pasteels, J. M. (1989) "Self-organized shortcuts in the Argentine ant", <i>Naturwissenschaften</i> 76. Deneubourg, J.-L. et al. (1990) "The self-organizing exploratory pattern of the Argentine ant", <i>Journal of Insect Behavior</i> 3. The same idea, "ant colony optimisation", is used by computers to plan routes (Dorigo, 1992).</p>
<p>See also <a href="../slime_mould_networks/slime-mould-networks.html">Slime Mould Networks</a> (a network that joins many food sources) and <a href="../murmuration/murmuration.html">Murmuration</a> (order from local rules).</p>`
});
ui.config.batch[3].run = (x, r) => { const c = trial(r, { map: "bridge", secs: 180, measure: 60 }).colony.route; return c.short / Math.max(1, c.short + c.long); };

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("The colony");
ctl.ants = K.slider(g, { label: "Colony size", min: 10, max: 2000, step: 10, value: P.ants, fmt: v => v + " ants", on: v => { P.ants = v; col.setAnts(v); } });
ctl.half = K.slider(g, { label: "Scent half-life", min: 0, max: 2.5, step: 0.05, value: Math.log10(10), fmt: v => { const s = Math.pow(10, v); return (s < 10 ? s.toFixed(1) : s.toFixed(0)) + " s"; }, on: v => { P.evap = halfLife(Math.pow(10, v)); }, tip: "How long until half the scent has evaporated" });
ctl.rand = K.slider(g, { label: "Exploration randomness", min: 0, max: 60, step: 1, value: P.rand, fmt: v => v ? "up to ± " + v + "° a step" : "none", on: v => P.rand = v });
ctl.follow = K.slider(g, { label: "Trail following", min: 0, max: 1, step: 0.05, value: P.follow, fmt: v => (v * 100).toFixed(0) + "% of steps", on: v => P.follow = v, tip: "How often an ant turns towards the strongest scent" });
g = ui.group("Food and arena");
ctl.map = K.seg(g, { label: "Arena", value: map, options: [["open", "Open"], ["bridge", "Double bridge"], ["near_far", "Near & far"], ["obstacle", "Wall"], ["scattered", "Many patches"]], on: v => load(v) });
ctl.patch = K.slider(g, { label: "Crumbs per new patch", min: 20, max: 1000, step: 10, value: 300, on: v => P.patchSize = v });
ctl.renew = K.toggle(g, { label: "New food appears when a patch runs out", value: false, on: v => { P.renew = v; } });
ctl.tool = K.seg(g, { label: "Mouse", value: "food", options: [["food", "🍪 Food"], ["wall", "🧱 Wall"], ["erase", "🧽 Erase"], ["nest", "🏠 Nest"]] });
K.note(g, "Food: click to drop a patch, drag one to move it, right-click to remove. Nest: drag it.");
let r1 = K.row(g); K.btn(r1, "↺ Restart", () => restart(), "primary"); K.btn(r1, "Clear scent", () => { col.home.fill(0); col.foodS.fill(0); }); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("ant-colony", view, cv));
g = ui.group("Show");
ctl.speed = K.slider(g, { label: "Speed (× real time)", min: 1, max: 20, step: 1, value: speed, fmt: v => "× " + v, on: v => speed = v });  ui.headerSpeed(ctl.speed, { label: "Speed" });
ctl.show = K.seg(g, { label: "Scent", value: show, options: [["both", "both"], ["food", "food scent"], ["home", "home scent"], ["none", "none"]], on: v => show = v });
const read = K.readout(g, [["t", "time"], ["home", "food brought home"], ["rate", "per minute (last minute)"], ["carry", "ants carrying food"], ["left", "food left"], ["route", "short route share"]]);

// ---------------- Setting up ----------------
function restart() { const old = col; col = new Colony(curMap(), P, Math.random); if (old && old._edited) { col.wall.set(old.wall); col._edited = true; } log = { rate: [], carry: [] }; lastLog = 0; }
let custom = null;                // the arena as edited by the user: nest, food and walls
function curMap() { return custom; }
function load(k) {
  map = k; ctl.map.set(k); const m = MAPS[k]; custom = { nest: m.nest.slice(), food: m.food.map(f => f.slice()), walls: (m.walls || []).map(w => w.slice()), route: m.route, name: m.name, extra: null };
  P.patchSize = 0; ctl.patch.set(300); col = null; restart();
}

// ---------------- WebGL view ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.5 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let field, quad, prShow, prAnt, antG, fdata = new Uint8Array(W * H * 4);
if (ok) {
  quad = K.gl.quad(gl); field = K.gl.target(gl, W, H, { filter: "linear" });
  prShow = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uField; uniform vec2 uCanvas, uOff, uWorld; uniform float uScale, uTime, uShowF, uShowH;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec2 px = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y), w = (px - uOff) / uScale;
      if (w.x < 0.0 || w.y < 0.0 || w.x > uWorld.x || w.y > uWorld.y) { gl_FragColor = vec4(0.03, 0.025, 0.02, 1.0); return; }
      vec4 f = texture2D(uField, w / uWorld);
      // sandy soil: a few octaves of noise
      float n = 0.5 * noise(w * 0.35) + 0.3 * noise(w * 1.3) + 0.2 * noise(w * 4.0);
      vec3 c = mix(vec3(0.10, 0.075, 0.05), vec3(0.20, 0.155, 0.10), n);
      // scents: home (violet-blue) and food (gold), with a soft glow
      float h = f.r * uShowH, fd = f.g * uShowF;
      c += vec3(0.22, 0.3, 0.95) * h * 0.8 + vec3(1.0, 0.72, 0.15) * fd * 1.1;
      c += vec3(1.0, 0.9, 0.6) * pow(fd, 4.0) * 0.35;
      if (f.b > 0.5) c = mix(vec3(0.28, 0.27, 0.26), vec3(0.42, 0.4, 0.37), noise(w * 0.8)) * (0.8 + 0.2 * f.b);     // stone wall
      gl_FragColor = vec4(c, 1.0);
    }`);
  // each ant is one point: a body of three segments, turned to its heading, with a crumb in its jaws if it is carrying food
  prAnt = K.gl.program(gl, `precision highp float; attribute vec2 aPos; attribute vec2 aDir; attribute float aCarry; uniform vec2 uCanvas, uOff; uniform float uScale, uSize; varying vec2 vDir; varying float vCarry;
    void main() { vec2 px = uOff + aPos * uScale; gl_Position = vec4(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0, 0.0, 1.0); gl_PointSize = uSize; vDir = aDir; vCarry = aCarry; }`,
    `precision highp float; varying vec2 vDir; varying float vCarry;
    void main() {
      vec2 q = gl_PointCoord - 0.5; q.y = -q.y; vec2 u = vec2(dot(q, vDir), dot(q, vec2(-vDir.y, vDir.x)));     // u.x along the body, u.y across it
      float body = 0.0;
      body = max(body, step(length((u - vec2(-0.2, 0.0)) / vec2(0.17, 0.10)), 1.0));    // abdomen
      body = max(body, step(length((u - vec2(0.0, 0.0)) / vec2(0.09, 0.055)), 1.0));    // thorax
      body = max(body, step(length((u - vec2(0.14, 0.0)) / vec2(0.07, 0.065)), 1.0));   // head
      float legs = step(abs(u.y), 0.2) * step(abs(fract(u.x * 9.0 + 0.5) - 0.5), 0.07) * step(abs(u.x), 0.12) * step(0.03, abs(u.y));
      float crumb = vCarry * step(length(u - vec2(0.27, 0.0)), 0.085);
      if (crumb > 0.5) { gl_FragColor = vec4(0.65, 1.0, 0.45, 1.0); return; }
      if (body + legs < 0.5) discard;
      gl_FragColor = vec4(vec3(0.05, 0.03, 0.02) + vec3(0.35, 0.12, 0.05) * step(u.x, -0.05), 1.0);
    }`);
  antG = K.gl.points(gl, { aPos: 2, aDir: 2, aCarry: 1 });
}

// ---------------- Mouse ----------------
const fit = () => { const s = Math.min(cv.w / W, cv.h / H); return { s, ox: (cv.w - W * s) / 2, oy: (cv.h - H * s) / 2 }; };
const toW = p => { const f = fit(); return { x: (p.x - f.ox) / f.s, y: (p.y - f.oy) / f.s }; };
let drag = null, hover = null;
function paint(w, erase) { const B = 3; col._edited = true; for (let j = Math.floor(w.y - B); j <= w.y + B; j++) for (let i = Math.floor(w.x - B); i <= w.x + B; i++) if (i >= 0 && j >= 0 && i < W && j < H && (i - w.x) ** 2 + (j - w.y) ** 2 <= B * B) col.wall[i + j * W] = erase ? 0 : 1;
  if (erase) col.food = col.food.filter(f => Math.hypot(f.x - w.x, f.y - w.y) > B + 4); }
K.pointer(cv.el, {
  down(p) { const w = toW(p), tool = ctl.tool.value;
    if (tool === "food") { const hit = col.food.find(f => Math.hypot(f.x - w.x, f.y - w.y) < 8);
      if (p.e.button === 2) { if (hit) col.food = col.food.filter(f => f !== hit); return; }
      if (hit) drag = { f: hit }; else if (w.x > 3 && w.y > 3 && w.x < W - 3 && w.y < H - 3) { const n = P.patchSize || 300, f = { x: w.x, y: w.y, r: 5, amount: n, start: n }; col.food.push(f); drag = { f }; } }
    else if (tool === "nest") drag = { nest: true };
    else { drag = { paint: true }; paint(w, tool === "erase"); } },
  drag(p) { const w = toW(p); hover = w; if (!drag) return; const x = K.clamp(w.x, 4, W - 4), y = K.clamp(w.y, 4, H - 4);
    if (drag.f) { drag.f.x = x; drag.f.y = y; } else if (drag.nest) { col.nest.x = x; col.nest.y = y; } else paint(w, ctl.tool.value === "erase"); },
  up() { drag = null; }, hover(p) { hover = toW(p); }, leave() { hover = null; }
});

// ---------------- Drawing ----------------
function draw() {
  const f = fit(), c = cv.ctx, d = view.dpr; c.clearRect(0, 0, cv.w, cv.h);
  if (ok) {
    // scent fields → a texture (a square-root scale, so faint trails still show)
    for (let i = 0; i < W * H; i++) {
      const h = col.scent(col.home, col.homeT, i), fs = col.scent(col.foodS, col.foodT, i);
      fdata[4 * i] = Math.min(255, 255 * Math.sqrt(h / 50)); fdata[4 * i + 1] = Math.min(255, 255 * Math.sqrt(fs / 30)); fdata[4 * i + 2] = col.wall[i] ? 255 : 0;
    }
    field.upload(fdata); K.gl.bindTarget(gl, null);
    prShow.set({ uField: field, uCanvas: [view.el.width, view.el.height], uOff: [f.ox * d, f.oy * d], uWorld: [W, H], uScale: f.s * d, uTime: performance.now() / 1000, uShowF: show === "both" || show === "food" ? 1 : 0, uShowH: show === "both" || show === "home" ? 1 : 0 });
    quad.draw(prShow);
    const n = col.ants.length, pos = new Float32Array(2 * n), dir = new Float32Array(2 * n), car = new Float32Array(n);
    col.ants.forEach((a, i) => { pos[2 * i] = a.x; pos[2 * i + 1] = a.y; dir[2 * i] = Math.cos(a.h); dir[2 * i + 1] = -Math.sin(a.h); car[i] = a.carry ? 1 : 0; });
    antG.set("aPos", pos).set("aDir", dir).set("aCarry", car);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    prAnt.set({ uCanvas: [view.el.width, view.el.height], uOff: [f.ox * d, f.oy * d], uScale: f.s * d, uSize: Math.max(9, 6 * f.s * d) }); antG.draw(prAnt, n);
    gl.disable(gl.BLEND);
  }
  const X = x => f.ox + x * f.s, Y = y => f.oy + y * f.s;
  // the nest: a mound with an entrance
  const N = col.nest, nr = N.r * f.s; let gr = c.createRadialGradient(X(N.x), Y(N.y), 0, X(N.x), Y(N.y), nr * 2.2); gr.addColorStop(0, "rgba(120,80,45,.95)"); gr.addColorStop(0.45, "rgba(95,65,40,.8)"); gr.addColorStop(1, "rgba(80,55,35,0)");
  c.fillStyle = gr; c.beginPath(); c.arc(X(N.x), Y(N.y), nr * 2.2, 0, TAU); c.fill(); c.fillStyle = "#120a05"; c.beginPath(); c.arc(X(N.x), Y(N.y), nr * 0.45, 0, TAU); c.fill();
  c.font = "600 11px Segoe UI,system-ui,sans-serif"; c.textAlign = "center"; c.fillStyle = "rgba(255,235,210,.85)"; c.fillText("nest", X(N.x), Y(N.y) + nr * 2.2 + 10);
  // food patches: a pile of crumbs, smaller as it is eaten
  for (const fd of col.food) { const k = Math.sqrt(Math.max(0, fd.amount) / Math.max(1, fd.start)), R = fd.r * f.s * (0.35 + 0.75 * k);
    if (fd.amount <= 0) { c.strokeStyle = "rgba(200,230,150,.3)"; c.setLineDash([3, 3]); c.beginPath(); c.arc(X(fd.x), Y(fd.y), fd.r * f.s, 0, TAU); c.stroke(); c.setLineDash([]); continue; }
    gr = c.createRadialGradient(X(fd.x), Y(fd.y), 0, X(fd.x), Y(fd.y), R * 1.8); gr.addColorStop(0, "rgba(190,255,120,.95)"); gr.addColorStop(0.5, "rgba(140,220,80,.75)"); gr.addColorStop(1, "rgba(120,200,60,0)");
    c.fillStyle = gr; c.beginPath(); c.arc(X(fd.x), Y(fd.y), R * 1.8, 0, TAU); c.fill();
    c.fillStyle = "rgba(20,30,10,.85)"; c.fillText(fd.amount, X(fd.x), Y(fd.y) + 4); }
  if (custom.route) { c.fillStyle = "rgba(255,240,200,.7)"; c.font = "12px Segoe UI,system-ui,sans-serif"; c.fillText("short route", X(0.5 * W), Y(0.8 * H)); c.fillText("long route", X(0.5 * W), Y(0.07 * H)); }
  if (hover && (ctl.tool.value === "wall" || ctl.tool.value === "erase")) { c.strokeStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(X(hover.x), Y(hover.y), 3 * f.s, 0, TAU); c.stroke(); }
}
const chR = K.chart(ui.dock, { title: "Food brought home per minute", xLabel: "minutes", yLabel: "crumbs per minute", yMin: 0 });
const chC = K.chart(ui.dock, { title: "Ants carrying food", xLabel: "minutes", yLabel: "% of the colony", yMin: 0, yMax: 100 });

// ---------------- The loop ----------------
load("open");
let frame = 0;
ui.run(dt => { const n = Math.max(1, Math.round(speed * Math.min(dt, 0.05) / DT)); for (let k = 0; k < n; k++) col.step(); }, () => {
  draw(); if (frame++ % 6) return;
  const t = col.t * DT, carry = col.ants.filter(a => a.carry).length / Math.max(1, col.ants.length) * 100;
  if (t - lastLog >= 5) { lastLog = t; log.rate.push([t / 60, col.rate(60)]); log.carry.push([t / 60, carry]); }
  chR.draw([{ pts: log.rate, color: K.cssVar("--s1") }], { xMin: 0 }); chC.draw([{ pts: log.carry, color: K.cssVar("--s2") }], { xMin: 0 });
  read.set("t", `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, "0")} s`); read.set("home", col.delivered); read.set("rate", col.rate(60).toFixed(0)); read.set("carry", carry.toFixed(0) + "%");
  read.set("left", col.food.reduce((s, f) => s + Math.max(0, f.amount), 0)); read.set("route", col.route && col.route.short + col.route.long ? (100 * col.route.short / (col.route.short + col.route.long)).toFixed(0) + "%" : "–");
  ui.hud(`<b style="font-size:15px">${custom.name}</b><br>${col.ants.length} ants · ${col.rate(60).toFixed(0)} crumbs a minute`);
});
window.antTest = { run(sec) { for (let k = 0; k < sec / DT; k++) col.step(); return col.delivered; }, load };   // for automated tests
ui.tip("Blue: home scent laid by searching ants · gold: food scent laid by ants carrying food · click to drop food, drag to move it", 8000);
}
