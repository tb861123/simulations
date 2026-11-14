/* =====================================================================
   TURING PATTERNS
   How does a leopard get its spots, a zebra its stripes, or a growing
   finger its regular ridges, when every cell starts out the same?

   In 1952 Alan Turing proposed an answer: two chemicals that react with
   each other and spread through the tissue at different speeds can turn
   a nearly uniform mixture into spots or stripes, all by themselves.

   This is the Gray-Scott model, one of the simplest that does it.
   Each little square of "skin" holds two chemicals:

     U  the fuel, fed in everywhere at a steady rate
     V  the activator, which makes more of itself by using up fuel
        (U + 2V -> 3V) and slowly breaks down

   Every step, in every square:
     * the reaction turns some U into V wherever V already is,
     * fresh U is fed in and some V is removed,
     * both chemicals spread to neighbouring squares (diffusion),
       U faster than V.

   That is all. V boosts itself locally but starves its surroundings of
   fuel, so patches of V cannot grow too big or sit too close together:
   "local activation, long-range inhibition". The spacing of the pattern
   is set by how far the chemicals diffuse, not by any plan.
   ===================================================================== */
class Skin {
  constructor(W, H) { this.W = W; this.H = H; const n = W * H; this.u = new Float32Array(n).fill(1); this.v = new Float32Array(n); this.u2 = new Float32Array(n); this.v2 = new Float32Array(n); this.F = 0.035; this.k = 0.065; this.scale = 1; this.ratio = 2; this.mask = null; this.grad = false; this.t = 0; }
  clear() { this.u.fill(1); this.v.fill(0); this.t = 0; }
  // drop a patch of activator
  blob(cx, cy, r, amount = 0.5) { for (let y = Math.max(0, cy - r | 0); y <= Math.min(this.H - 1, cy + r); y++) for (let x = Math.max(0, cx - r | 0); x <= Math.min(this.W - 1, cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) { const i = y * this.W + x; if (this.mask && !this.mask[i]) continue; this.v[i] = amount; this.u[i] = 1 - amount; } }
  wipe(cx, cy, r) { for (let y = Math.max(0, cy - r | 0); y <= Math.min(this.H - 1, cy + r); y++) for (let x = Math.max(0, cx - r | 0); x <= Math.min(this.W - 1, cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) { const i = y * this.W + x; this.v[i] = 0; this.u[i] = 1; } }
  // a slightly uneven start: small random patches of activator
  noise(rand, density = 0.012) { this.clear(); const n = Math.round(this.W * this.H * density / 12); for (let k = 0; k < n; k++) this.blob(Math.floor(rand() * this.W), Math.floor(rand() * this.H), 2 + rand() * 2, 0.4 + rand() * 0.2); }
  step(times) {
    const { W, H, mask } = this; const Du = this.scale, Dv = Du / this.ratio;   // V spreads `ratio` times more slowly than U
    for (let it = 0; it < times; it++) {
      const u = this.u, v = this.v, u2 = this.u2, v2 = this.v2;
      for (let y = 0; y < H; y++) {
        const yu = (y === 0 ? H - 1 : y - 1) * W, yd = (y === H - 1 ? 0 : y + 1) * W, yc = y * W, F = this.grad ? 0.012 + 0.07 * (1 - y / H) : this.F;
        for (let x = 0; x < W; x++) {
          const i = yc + x; if (mask && !mask[i]) { u2[i] = 1; v2[i] = 0; continue; }
          const xl = x === 0 ? W - 1 : x - 1, xr = x === W - 1 ? 0 : x + 1, a = u[i], b = v[i]; let n0 = yu + x, n1 = yd + x, n2 = yc + xl, n3 = yc + xr, d0 = yu + xl, d1 = yu + xr, d2 = yd + xl, d3 = yd + xr;
          if (mask) { if (!mask[n0]) n0 = i; if (!mask[n1]) n1 = i; if (!mask[n2]) n2 = i; if (!mask[n3]) n3 = i; if (!mask[d0]) d0 = i; if (!mask[d1]) d1 = i; if (!mask[d2]) d2 = i; if (!mask[d3]) d3 = i; }   // nothing can cross the edge of the skin
          // DIFFUSION: how different this square is from the average of its eight neighbours
          const lapU = 0.2 * (u[n0] + u[n1] + u[n2] + u[n3]) + 0.05 * (u[d0] + u[d1] + u[d2] + u[d3]) - a, lapV = 0.2 * (v[n0] + v[n1] + v[n2] + v[n3]) + 0.05 * (v[d0] + v[d1] + v[d2] + v[d3]) - b;
          const k = this.grad ? 0.045 + 0.026 * x / W : this.k, r = a * b * b;                    // REACTION: U + 2V -> 3V, fastest where there is plenty of both
          u2[i] = a + Du * lapU - r + F * (1 - a);                                           // fuel: spreads, is used up, is fed in
          v2[i] = b + Dv * lapV + r - (F + k) * b;                                           // activator: spreads (slowly), is made, breaks down
        }
      }
      this.u = u2; this.v = v2; this.u2 = u; this.v2 = v; this.t++;
    }
  }
  // count the separate patches of activator, and how much of the skin they cover
  measure() {
    const { W, H, v } = this, lab = new Int32Array(W * H), stack = []; let n = 0, on = 0, cells = 0, big = 0;
    for (let i = 0; i < W * H; i++) { if (this.mask && !this.mask[i]) continue; cells++; if (v[i] > 0.15) on++; }
    for (let i = 0; i < W * H; i++) { if (v[i] <= 0.15 || lab[i]) continue; n++; let size = 0; stack.push(i); lab[i] = n; while (stack.length) { const j = stack.pop(); size++; const x = j % W, y = (j / W) | 0; for (const q of [y * W + (x + 1) % W, y * W + (x + W - 1) % W, ((y + 1) % H) * W + x, ((y + H - 1) % H) * W + x]) if (v[q] > 0.15 && !lab[q]) { lab[q] = n; stack.push(q); } } if (size > big) big = size; }
    return { patches: n, cover: 100 * on / (cells || 1), biggest: 100 * big / (on || 1), spacing: n ? Math.sqrt(cells / n) : 0 };
  }
}
// famous patterns: [feed rate F, kill rate k, name, colours, how to start]
const PRESETS = {
  spots: { F: 0.035, k: 0.065, name: "Leopard spots", pal: "leopard" },
  stripes: { F: 0.04, k: 0.06, name: "Zebra stripes", pal: "zebra" },
  maze: { F: 0.029, k: 0.057, name: "Brain coral", pal: "coral" },
  mitosis: { F: 0.022, k: 0.059, name: "Dividing cells", pal: "cells", start: "one" },
  holes: { F: 0.039, k: 0.058, name: "Giraffe", pal: "giraffe" },
  worms: { F: 0.058, k: 0.065, name: "Fingerprint", pal: "ink" },
  waves: { F: 0.014, k: 0.045, name: "Spiral waves", pal: "heat" },
  fish: { F: 0.026, k: 0.061, name: "Pufferfish", pal: "fish" }
};
// a run without drawing, for the batch experiments
function grow(o, rnd, steps = 5000) { const s = new Skin(o.W || 96, o.H || 96); Object.assign(s, { F: 0.035, k: 0.065 }, o.set); if (o.one) { s.clear(); s.blob(48, 48, 4); } else s.noise(rnd, o.density || 0.012); s.step(steps); return s; }

// ---------------- The page ----------------
const GW = 320, GH = 160;
let skin = new Skin(GW, GH), rnd = K.rng(Date.now() % 99991 + 3), speed = 12, pal = "leopard", brush = "add", shape = "sheet", log = [], lastM = { patches: 0, cover: 0, spacing: 0, biggest: 0 }, probeY = GH / 2;
function setShape(name) {
  shape = name; if (name === "sheet") { skin.mask = null; return; } const m = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const t = x / GW, cy = GH / 2; let half;
    if (name === "tail") half = GH * 0.43 * Math.pow(1 - t, 1.5) + 2.5;                                   // a body that tapers to a thin tail
    else half = GH * (0.16 + 0.3 * Math.exp(-(((t - 0.36) / 0.2) ** 2)) + 0.12 * Math.exp(-(((t - 0.8) / 0.07) ** 2))) * (t > 0.03 && t < 0.97 ? 1 : 0);   // a fish
    if (Math.abs(y - cy) < half) m[y * GW + x] = 1; }
  skin.mask = m;
}
function restart(how) { skin.clear(); if (how === "one") skin.blob(GW / 2, GH / 2, 5); else if (how === "empty") { } else skin.noise(rnd, 0.012); log = []; }

const ui = K.app({
  title: "Turing Patterns", subject: "Biology",
  blurb: "Spots, stripes and mazes that grow by themselves from two spreading chemicals",
  reset: () => set({ preset: "spots" }),
  missions: [
    { title: "Spots from nothing", q: "The skin starts almost blank, with a few random specks of the activator chemical. Nobody tells any cell where a spot should go. Watch. What appears? Are the spots evenly spaced? Press 'Start again' and compare: is the pattern the same?", hint: "Each speck of activator grows by making more of itself, but uses up the fuel around it, so nothing can grow close by. Spots end up about the same size and the same distance apart everywhere, yet their exact positions depend on the random start, so no two runs are identical. That is exactly what we see in animals: every leopard has the same kind of pattern, and no two have the same spots.", setup() { set({ preset: "spots" }); } },
    { title: "Wound healing", q: "Let the pattern settle, then choose 'Rub out' and wipe a bare patch in the middle. What happens over the next few seconds? Then choose 'Add activator' and scribble a line across the spots.", hint: "The gap fills itself in: neighbouring spots divide and move until the spacing is even again. Scribbled lines break up into spots. The pattern is not stored anywhere; it is continually remade by the reaction, so it repairs itself. Zebrafish stripes do the same when pigment cells are removed with a laser.", setup() { set({ preset: "spots" }); skin.step(2500); } },
    { title: "Spots or stripes?", q: "Slowly lower the 'Kill rate' from 0.065 towards 0.058. What happens to the spots? Then try raising the 'Feed rate'. Is there a sharp line between a spotted animal and a striped one?", hint: "A small change in one number turns spots into stripes, then into a maze, then into dark skin with pale holes. The same two chemicals, with slightly different rates, could give a leopard, a zebra or a giraffe. Evolution only has to tweak a rate, not invent a new mechanism. The map in the bottom left shows where you are.", setup() { set({ preset: "spots" }); skin.step(2000); } },
    { title: "Turing's condition", q: "The fuel spreads twice as fast as the activator. Move 'Fuel spreads faster by' down to × 1, so both spread at the same speed, and start again. Does a pattern form? What about × 1.3?", hint: "With equal diffusion the pattern never forms: a patch of activator either dies or takes over everywhere. Patterns need the activator to stay put while its effect on the surroundings (here, the hole it eats in the fuel) spreads further. This was Turing's key insight, and it is surprising, because diffusion normally smooths differences out. Here it creates them.", setup() { set({ preset: "spots" }); } },
    { title: "Big animals, small animals", q: "Change 'How far the chemicals spread' and start again each time. What happens to the size of the spots and the gaps? If a mouse and an elephant used the same chemicals, which would have more spots?", hint: "The spacing is set by how far the chemicals diffuse before they react, not by the size of the animal. Slower spreading gives a finer pattern. With the same chemistry a bigger animal would simply have more spots, and a very small embryo might have room for none: one reason some small animals are plain.", setup() { set({ preset: "spots", scale: 0.45 }); } },
    { title: "Spots that divide", q: "A single patch of activator. Watch it for a while. What does it do? What does it remind you of?", hint: "The spot grows until its middle runs short of fuel, pinches in two, and each half does the same, until the skin is full. It looks like dividing cells, though nothing here is alive: it is the same reaction and diffusion. Patterns that copy themselves like this were discovered in real chemical experiments in 1994.", setup() { set({ preset: "mitosis" }); } },
    { title: "Running out of room", q: "The skin is now the shape of an animal's body tapering to a thin tail. Let the pattern form. What happens to the rows of spots as the body narrows? What happens where the tail is thinner than one spot's territory? Try 'Zebra stripes' on the same shape.", hint: "The spots keep their size and spacing, so fewer and fewer fit across: several rows on the body, two, then a single file along the tail, and where the tail is too thin, nothing. A pattern needs room. In some other reaction–diffusion models a narrowing tail turns spots into bands across it, which the mathematician James Murray suggested is why spotted cats such as cheetahs have banded tails; this simple model does not show that step.", setup() { set({ preset: "spots", shape: "tail" }); } },
    { title: "The whole zoo at once", q: "Now the two rates change smoothly across the picture: the kill rate rises from left to right and the feed rate from bottom to top. Wait for it to settle. How many different kinds of pattern can you find? Where does nothing survive?", hint: "Spots, stripes, mazes, holes, travelling waves and regions that stay blank all appear, each in its own zone, with sharp borders between some of them. To the right the activator is destroyed faster than it can make itself and dies out; to the lower left it burns everything. Interesting patterns live in the narrow band between.", setup() { set({ preset: "spots", grad: true, pal: "heat" }); } },
    { title: "Waves that never settle", q: "With a low feed rate the pattern does not settle into spots at all. What does it do instead? Scribble across it and see how it responds.", hint: "The activator burns through the fuel faster than it is replaced, leaving a used-up zone behind it that only slowly recovers, so the pattern travels as waves and spirals that chase their own tails. Waves like this are seen in real chemical reactions (the Belousov–Zhabotinsky reaction) and in heart muscle, where spiral waves cause a dangerous abnormal rhythm.", setup() { set({ preset: "waves" }); } }
  ],
  batch: [
    { title: "How far apart are the spots?", question: "How does the spacing of the pattern depend on how far the chemicals spread?", how: "Each run: spots are grown on a 96 × 96 patch from a random start for 6000 steps. Spacing = √(area ÷ number of spots).", xLabel: "how far the chemicals spread (diffusion, × normal)", yLabel: "spacing of the spots (squares)", xs: [0.3, 0.4, 0.5, 0.65, 0.8, 1], reps: 4, yMin: 0, theory: x => 19.3 * Math.sqrt(x), theoryLabel: "∝ √diffusion", run: (x, r) => grow({ set: { scale: x } }, r, 6000).measure().spacing, note: "The random start decides exactly where the spots sit, so the count on a small patch varies by a few. Theory: a molecule diffuses a distance proportional to √(diffusion × time) before it reacts." },
    { title: "Turing's condition", question: "How much faster must the fuel spread than the activator for a pattern to form?", how: "Each run: a random start with the chosen ratio of diffusion speeds, 5000 steps. The result is the number of separate spots.", xLabel: "fuel spreads faster than activator by (×)", yLabel: "number of spots", xs: [1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3], reps: 4, yMin: 0, run: (x, r) => grow({ set: { ratio: x } }, r).measure().patches, note: "Below a critical ratio no stable spots form at all. Above it, a larger ratio packs more, smaller spots into the same area." },
    { title: "Same rules, different animals", question: "If the same pattern is grown again and again, is the number of spots always the same?", how: "Each run: the same rates and the same 96 × 96 patch, from a different random start, 6000 steps.", xLabel: "", yLabel: "number of spots", reps: 80, bins: 14, lo: 17.5, hi: 31.5, run: (x, r) => grow({}, r, 6000).measure().patches, note: "The kind of pattern and the typical spacing are fixed by the chemistry; the exact number and positions are not. Identical twins, and cloned animals, have different fingerprints and coat markings for this reason." },
    { title: "From spots to stripes", question: "How does the pattern change as the kill rate falls?", how: "Each run: feed rate 0.037, the chosen kill rate, 6000 steps from a random start. The result is the percentage of the skin covered by activator.", xLabel: "kill rate", yLabel: "skin covered by activator (%)", xs: [0.056, 0.058, 0.06, 0.062, 0.064, 0.066, 0.068], reps: 4, yMin: 0, run: (x, r) => grow({ set: { F: 0.037, k: x } }, r, 6000).measure().cover, note: "Low kill rate: the activator covers most of the skin, leaving holes. Higher: stripes, then separate spots, then nothing." },
    { title: "Spots joining up", question: "As the kill rate falls, when do separate spots join into stripes?", how: "The same runs as 'From spots to stripes'. The result is the share of all the activator that lies in the single biggest connected patch.", xLabel: "kill rate", yLabel: "activator in the biggest patch (%)", xs: [0.056, 0.058, 0.06, 0.062, 0.064], reps: 4, yMin: 0, yMax: 105, run: (x, r) => grow({ set: { F: 0.037, k: x } }, r, 6000).measure().biggest, note: "Near 100% means one connected network (a maze or stripes that join); a few per cent means separate spots. The change between the two is abrupt." },
    { title: "Filling the skin", question: "Starting from one spot that divides, how does the number of spots grow with time?", how: "Each run: a single patch in the middle of a 96 × 96 skin with the 'dividing cells' rates, with tiny random differences in the rates. The spots are counted at the chosen time.", xLabel: "time (steps)", yLabel: "number of spots", xs: [500, 1000, 1500, 2000, 3000, 4000, 6000], reps: 3, yMin: 0, run: (x, r) => grow({ one: true, set: { F: 0.022 + 0.0003 * r.gauss(), k: 0.059 } }, r, x).measure().patches, note: "Growth is fast at first, as every spot divides, then stops when the skin is full: the same S-shaped curve as a population growing until it runs out of room." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>The Gray–Scott reaction–diffusion model on a grid of 320 × 160 squares of "skin".</p>
<ul><li>Each square holds an amount of fuel U and of activator V (both between 0 and 1).</li>
<li><b>Reaction:</b> U + 2V → 3V at a rate U × V². V is made fastest where there is already V and still plenty of U.</li>
<li><b>Feed and kill:</b> U is topped up towards 1 at the feed rate F; V is removed at the rate F + k.</li>
<li><b>Diffusion:</b> each step, every square moves towards the average of its eight neighbours, U twice as fast as V unless you change the ratio.</li>
<li>The left and right edges join up, as do the top and bottom, so a plain sheet has no boundary. With a body shape, nothing crosses the outline.</li>
<li><b>The map</b> (bottom left) shows the feed and kill rates. Right of the curve the activator cannot survive at all.</li>
<li><b>Spots</b> are counted as connected regions where V is above 0.15.</li></ul>
<h3>Simplifications</h3>
<ul><li>This is the simplest model that makes Turing-type patterns, not the chemistry of any real animal. Real coat patterns involve several interacting cell types and signals; in zebrafish, the "chemicals" are pigment cells that chase and avoid one another.</li>
<li>Turing's own idea was an activator and an inhibitor; here the "inhibition" is the using-up of fuel. The principle (short-range activation, long-range inhibition) is the same.</li>
<li>Real examples for which there is good evidence of a Turing mechanism include the ridges on the roof of a mouse's mouth, the spacing of hair follicles and feather buds, and the laying out of fingers in a limb bud.</li>
<li>The skin does not grow while the pattern forms. In real embryos it does, which changes the patterns (and explains why a giraffe's patches are so large: the pattern was laid down when the embryo was small).</li>
<li>The names of the presets say what the patterns look like, not how those animals make them.</li>
<li>Time and distance have no units: only ratios matter.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("A pattern to grow");
let r1 = K.row(g); Object.entries(PRESETS).forEach(([k, q], i) => { if (i === 4) r1 = K.row(g); K.btn(r1, q.name, () => set({ preset: k }), "small"); });
g = ui.group("The two rates");
ctl.F = K.slider(g, { label: "Feed rate (fuel fed in)", min: 0.008, max: 0.085, step: 0.0005, value: 0.035, fmt: v => v.toFixed(4), on: v => { skin.F = v; } });
ctl.k = K.slider(g, { label: "Kill rate (activator removed)", min: 0.04, max: 0.072, step: 0.0005, value: 0.065, fmt: v => v.toFixed(4), on: v => { skin.k = v; } });
ctl.grad = K.toggle(g, { label: "Vary both rates across the picture", value: false, on: v => { skin.grad = v; } });
g = ui.group("Spreading");
ctl.ratio = K.slider(g, { label: "Fuel spreads faster by", min: 1, max: 4, step: 0.1, value: 2, fmt: v => "× " + v.toFixed(1), on: v => { skin.ratio = v; } });
ctl.scale = K.slider(g, { label: "How far the chemicals spread", min: 0.25, max: 1, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { skin.scale = v; } });
g = ui.group("The skin");
ctl.shape = K.seg(g, { label: "Shape", value: "sheet", options: [["sheet", "sheet"], ["tail", "body and tail"], ["fish", "fish"]], on: v => { setShape(v); restart(); } });
r1 = K.row(g); K.btn(r1, "↺ Start again", () => restart(PRESETS.mitosis.F === skin.F && PRESETS.mitosis.k === skin.k ? "one" : ""), "primary"); K.btn(r1, "One spot", () => restart("one")); K.btn(r1, "Blank", () => restart("empty"));
ctl.brush = K.seg(g, { label: "Drag on the skin to", value: "add", options: [["add", "add activator"], ["wipe", "rub out"]], on: v => brush = v });
g = ui.group("Watch");
ctl.pal = K.seg(g, { label: "Colours", value: "leopard", options: [["leopard", "leopard"], ["zebra", "zebra"], ["giraffe", "giraffe"], ["coral", "coral"]], on: v => { pal = v; ctl.pal2.set(""); } });
ctl.pal2 = K.seg(g, { value: "", options: [["fish", "fish"], ["cells", "cells"], ["ink", "ink"], ["heat", "heat"]], on: v => { pal = v; ctl.pal.set(""); } });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 30, step: 1, value: speed, fmt: v => v + " steps a frame", on: v => speed = v });
const read = K.readout(g, [["n", "separate patches"], ["cover", "skin covered"], ["sp", "typical spacing"], ["big", "in the biggest patch"], ["t", "time"]]);
function set(o) {
  const q = PRESETS[o.preset]; skin.F = q.F; skin.k = q.k; ctl.F.set(q.F); ctl.k.set(q.k); pal = o.pal || q.pal; ctl.pal.set(""); ctl.pal2.set(""); (["leopard", "zebra", "giraffe", "coral"].includes(pal) ? ctl.pal : ctl.pal2).set(pal);
  skin.ratio = 2; ctl.ratio.set(2); skin.scale = o.scale || 1; ctl.scale.set(skin.scale); skin.grad = !!o.grad; ctl.grad.set(skin.grad); setShape(o.shape || "sheet"); ctl.shape.set(shape); brush = "add"; ctl.brush.set("add"); restart(q.start);
}

// ---------------- Drawing ----------------
// each colour scheme: background (no activator) to foreground (lots), through a middle colour
const PALS = { leopard: [[224, 172, 88], [150, 92, 30], [26, 16, 8]], zebra: [[244, 242, 236], [120, 118, 112], [14, 14, 16]], giraffe: [[240, 224, 184], [200, 140, 70], [120, 62, 22]], coral: [[10, 40, 70], [230, 110, 120], [255, 220, 200]], fish: [[250, 214, 60], [60, 120, 160], [16, 30, 70]], cells: [[8, 16, 30], [40, 160, 150], [190, 255, 220]], ink: [[246, 244, 238], [150, 150, 170], [30, 30, 60]], heat: [[6, 8, 20], [200, 50, 60], [255, 230, 120]] };
const cv = ui.canvas(() => { });
const img = document.createElement("canvas"); img.width = GW; img.height = GH; const ictx = img.getContext("2d"), idata = ictx.createImageData(GW, GH);
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, P = PALS[pal], d = idata.data, v = skin.v, m = skin.mask;
  for (let i = 0, j = 0; i < GW * GH; i++, j += 4) {
    if (m && !m[i]) { d[j] = 8; d[j + 1] = 12; d[j + 2] = 22; d[j + 3] = 255; continue; }
    let t = v[i] * 3.2; if (t > 1) t = 1; const a = t < 0.5 ? P[0] : P[1], b = t < 0.5 ? P[1] : P[2], f = t < 0.5 ? t * 2 : t * 2 - 1;
    d[j] = a[0] + (b[0] - a[0]) * f; d[j + 1] = a[1] + (b[1] - a[1]) * f; d[j + 2] = a[2] + (b[2] - a[2]) * f; d[j + 3] = 255;
  }
  ictx.putImageData(idata, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(img, 0, 0, w, h);
  if (skin.grad) { c.fillStyle = "rgba(255,255,255,.85)"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("kill rate rises →", w / 2, h - 10); c.save(); c.translate(14, h / 2); c.rotate(-Math.PI / 2); c.fillText("feed rate rises →", 0, 0); c.restore(); }
  c.strokeStyle = "rgba(255,255,255,.35)"; c.setLineDash([4, 6]); c.lineWidth = 1; c.beginPath(); c.moveTo(0, probeY / GH * h); c.lineTo(w, probeY / GH * h); c.stroke(); c.setLineDash([]);
}
const paint = p => { const x = p.x / cv.w * GW, y = p.y / cv.h * GH; probeY = K.clamp(Math.round(y), 0, GH - 1); if (brush === "add") skin.blob(x, y, 3.5); else skin.wipe(x, y, 12); };
K.pointer(cv.el, { down: paint, drag: paint, hover(p) { probeY = K.clamp(Math.round(p.y / cv.h * GH), 0, GH - 1); } });

// the map of the two rates, in the dock: click it to jump to a new pair of rates
const mapBox = K.$("div", "k-chart"); ui.dock.append(mapBox); const mp = K.canvas(mapBox, () => { });
const K0 = 0.04, K1 = 0.072, F0 = 0, F1 = 0.09;
function drawMap() {
  const c = mp.ctx, w = mp.w, h = mp.h, L = 48, T = 24, B = 30, R = 12, pw = w - L - R, ph = h - T - B, X = k => L + (k - K0) / (K1 - K0) * pw, Y = F => T + ph - (F - F0) / (F1 - F0) * ph;
  c.fillStyle = K.cssVar("--panel"); c.fillRect(0, 0, w, h); c.fillStyle = K.cssVar("--text"); c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("Where you are on the map of patterns (click to move)", L, 14);
  c.fillStyle = "rgba(120,140,180,.10)"; c.fillRect(L, T, pw, ph); c.strokeStyle = K.cssVar("--muted"); c.strokeRect(L + .5, T + .5, pw, ph);
  // to the right of this curve the activator always dies out: k = √F / 2 − F
  c.fillStyle = "rgba(255,255,255,.07)"; c.beginPath(); c.moveTo(X(K1), Y(F0)); for (let F = 0; F <= F1; F += 0.002) c.lineTo(Math.min(X(K1), X(Math.sqrt(F) / 2 - F)), Y(F)); c.lineTo(X(K1), Y(F1)); c.fill();
  c.strokeStyle = "#ff9d8a"; c.lineWidth = 1.5; c.beginPath(); let pen = false; for (let F = 0.001; F <= F1; F += 0.002) { const k = Math.sqrt(F) / 2 - F; if (k < K0 || k > K1) { pen = false; continue; } pen ? c.lineTo(X(k), Y(F)) : c.moveTo(X(k), Y(F)); pen = true; } c.stroke();
  c.font = "10.5px Segoe UI,sans-serif"; c.fillStyle = "#ff9d8a"; c.textAlign = "right"; c.fillText("activator dies out", X(K1) - 4, Y(0.012));
  for (const q of Object.values(PRESETS)) { c.fillStyle = "rgba(200,212,235,.75)"; c.beginPath(); c.arc(X(q.k), Y(q.F), 3, 0, 6.3); c.fill(); c.textAlign = q.k > 0.062 ? "right" : "left"; c.fillText(q.name.toLowerCase(), X(q.k) + (q.k > 0.062 ? -6 : 6), Y(q.F) + 3.5); }
  if (skin.grad) { c.strokeStyle = "#7fe3ff"; c.setLineDash([4, 4]); c.strokeRect(X(0.045), Y(0.082), X(0.071) - X(0.045), Y(0.012) - Y(0.082)); c.setLineDash([]); } else { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(X(skin.k), Y(skin.F), 6, 0, 6.3); c.stroke(); }
  c.fillStyle = K.cssVar("--muted"); c.textAlign = "center"; c.font = "11px Segoe UI,sans-serif"; c.fillText("kill rate →", L + pw / 2, h - 8); for (const k of [0.045, 0.055, 0.065]) c.fillText(k.toFixed(3), X(k), h - 19); c.save(); c.translate(12, T + ph / 2); c.rotate(-Math.PI / 2); c.fillText("feed rate →", 0, 0); c.restore(); c.textAlign = "right"; for (const F of [0.02, 0.04, 0.06, 0.08]) c.fillText(F.toFixed(2), L - 4, Y(F) + 4);
  mp.map = { L, T, pw, ph };
}
K.pointer(mp.el, { down(p) { const q = mp.map; if (!q) return; const k = K0 + (p.x - q.L) / q.pw * (K1 - K0), F = F0 + (1 - (p.y - q.T) / q.ph) * (F1 - F0); if (k < K0 || k > K1 || F < 0.008 || F > 0.085) return; skin.k = Math.round(k * 2000) / 2000; skin.F = Math.round(F * 2000) / 2000; ctl.k.set(skin.k); ctl.F.set(skin.F); skin.grad = false; ctl.grad.set(false); } });
const chP = K.chart(ui.dock, { title: "The two chemicals along the dotted line", xLabel: "position across the skin", yLabel: "amount", yMin: 0, yMax: 1.05 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(() => { skin.step(speed); }, () => {
  draw(); if (frame++ % 6) return; drawMap();
  const row = probeY * GW, U = [], V = []; for (let x = 0; x < GW; x++) { U.push([x, skin.u[row + x]]); V.push([x, skin.v[row + x]]); }
  chP.draw([{ pts: U, color: K.cssVar("--s0"), label: "fuel, U" }, { pts: V, color: K.cssVar("--s1"), label: "activator, V", width: 2.2 }], { xMin: 0, xMax: GW });
  if (frame % 30 === 1) lastM = skin.measure();
  read.set("n", lastM.patches); read.set("cover", lastM.cover.toFixed(0) + "%"); read.set("sp", lastM.patches > 3 ? lastM.spacing.toFixed(1) + " squares" : "–"); read.set("big", lastM.biggest.toFixed(0) + "% of the activator"); read.set("t", skin.t + " steps");
  ui.hud(skin.grad ? "kill rate rises left to right, feed rate bottom to top" : `<b style="font-size:14px">${lastM.patches} patch${lastM.patches === 1 ? "" : "es"}</b> · ${lastM.cover.toFixed(0)}% covered<br>feed ${skin.F.toFixed(4)} · kill ${skin.k.toFixed(4)}`);
});
set({ preset: "spots" });
ui.tip("Every square follows the same two rules · drag on the skin to add activator", 8000);
