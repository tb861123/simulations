/* =====================================================================
   LIGHTNING
   How does a lightning bolt choose its path, and why does it branch?

   The model is the "dielectric breakdown model" (Niemeyer, Pietronero
   and Wiesmann, 1984). The air between cloud and ground is a grid of
   cells, and three things repeat:

     1. VOLTAGE   Work out the voltage V in every cell of air. The cloud
                  base and the lightning channel (a good conductor joined
                  to the cloud) are at V = 0; the ground and everything
                  standing on it are at V = 1. In between, each cell's
                  voltage is the average of its four neighbours
                  (this is Laplace's equation).
     2. FIELD     The electric field is how fast the voltage changes
                  from cell to cell. It is strongest where the voltage
                  lines are squeezed together: at the tip of the channel
                  and at the tops of tall, pointed things.
     3. GROW      The channel grows by one cell. Every cell of air
                  touching the channel is a candidate; one is chosen at
                  random, with probability ∝ (field there)^η.

   Nothing in the rules says "branch" or "aim for the tallest thing".
   Both come out of the three steps above.
   ===================================================================== */
const CELL = 3;   // metres per grid cell (a scale model: the cloud base is about 280 m up)

class Storm {
  constructor(nx, ny) {
    this.nx = nx; this.ny = ny; this.gy = ny - 4;                       // gy: the row of the ground surface
    const n = nx * ny; this.V = new Float32Array(n); this.type = new Uint8Array(n);   // type: 0 air, 1 lightning channel, 2 ground or object
    this.tag = new Int16Array(n); this.parent = new Int32Array(n).fill(-1); this.top = new Int16Array(nx);
    this.cells = []; this.cand = []; this.inCand = new Uint8Array(n); this.eta = 2; this.objects = []; this.build([]);
  }
  // Put the ground and the objects on it into the grid, then find the voltage with no lightning present
  build(objects) {
    const { nx, ny, gy, type, tag, V } = this; this.objects = objects; type.fill(0); tag.fill(0); this.top.fill(gy);
    for (let y = gy; y < ny; y++) for (let x = 0; x < nx; x++) type[x + y * nx] = 2;
    objects.forEach((o, k) => {
      const put = (x, h) => { x = Math.round(x); if (x < 1 || x > nx - 2) return; for (let y = gy - 1; y >= gy - h && y > 2; y--) { type[x + y * nx] = 2; tag[x + y * nx] = k + 1; } this.top[x] = Math.min(this.top[x], Math.max(3, gy - h)); };
      const w = o.w || 1, h = Math.round(o.h);
      if (o.kind === "tree") for (let d = -3; d <= 3; d++) put(o.x + d, Math.round(h - d * d * h / 22)); // rounded crown
      else if (o.kind === "house") for (let d = -4; d <= 4; d++) put(o.x + d, 3 + Math.max(0, 3 - Math.abs(d)));   // walls and a pitched roof
      else for (let d = -(w >> 1); d <= (w >> 1); d++) put(o.x + d, h);
    });
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) V[x + y * nx] = type[x + y * nx] === 2 ? 1 : Math.min(1, y / gy);   // first guess: a steady climb from cloud to ground
    this.clear(); this.relax(objects.length ? 220 : 4);
  }
  clear() { const { type, V, nx, gy } = this; for (const c of this.cells) { type[c] = 0; V[c] = ((c / nx) | 0) / gy; } this.cells = []; this.cand = []; this.inCand.fill(0); this.parent.fill(-1); this.struck = null; }
  /* Step 1. Each sweep replaces every air cell's voltage by the average of its four neighbours
     (with a little over-shoot, which makes it settle faster). Left and right edges wrap round. */
  relax(sweeps) {
    const { nx, gy, V, type } = this, w = 1.72;
    for (let s = 0; s < sweeps; s++) for (let y = 1; y < gy; y++) {
      const r = y * nx;
      for (let x = 0; x < nx; x++) { const c = r + x; if (type[c]) continue; const l = x ? V[c - 1] : V[c + nx - 1], rt = x < nx - 1 ? V[c + 1] : V[c - nx + 1]; V[c] += w * ((l + rt + V[c - nx] + V[c + nx]) * 0.25 - V[c]); }
    }
  }
  // A leader sets off from the cloud base above column x
  start(x) { this.clear(); this.add(K.clamp(Math.round(x), 2, this.nx - 3) + this.nx, -1); this.relax(12); }
  add(c, par) {
    const { nx, type, inCand } = this; type[c] = 1; this.V[c] = 0; this.parent[c] = par; this.cells.push(c); const x = c % nx;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {     // its eight neighbours become candidates
      if (!dx && !dy) continue; const xx = x + dx; if (xx < 1 || xx > nx - 2) continue; const n = c + dx + dy * nx;
      if (n < nx * 2) continue; if (type[n] === 2) { if (!this.struck || this.tag[n]) this.struck = { cell: c, x: xx, tag: this.tag[n] }; continue; }
      if (type[n] === 0 && !inCand[n]) { inCand[n] = 1; this.cand.push(n, c); }
    }
  }
  /* Steps 2 and 3. The channel is at V = 0, so the voltage in a neighbouring cell IS the voltage
     difference across one cell: the field there. Returns the strike once something at ground voltage is touched. */
  grow(rand, sweeps) {
    if (this.struck) return this.struck; this.relax(sweeps);
    const { cand, V, eta } = this; let total = 0; const wts = this.wts && this.wts.length >= cand.length ? this.wts : (this.wts = new Float64Array(cand.length + 4096));
    for (let i = 0; i < cand.length; i += 2) { const w = Math.pow(Math.max(V[cand[i]], 0), eta); wts[i >> 1] = w; total += w; }
    let r = rand() * total, pick = cand.length - 2; for (let i = 0; i < cand.length; i += 2) { r -= wts[i >> 1]; if (r <= 0) { pick = i; break; } }
    const c = cand[pick], par = cand[pick + 1]; cand[pick] = cand[cand.length - 2]; cand[pick + 1] = cand[cand.length - 1]; cand.length -= 2;
    this.add(c, par); return this.struck;
  }
  // field just above the surface in column x, compared with the open-field value (1 / height)
  surfaceField(x) { const y = this.top[x] - 1; return (1 - this.V[x + y * this.nx]) * this.gy; }
  tipField() { let m = 0; for (let i = 0; i < this.cand.length; i += 2) if (this.V[this.cand[i]] > m) m = this.V[this.cand[i]]; return m * this.gy; }
  run(x, rand, sweeps) { this.start(x); let s = null, guard = 0; while (!s && guard++ < 40000) s = this.grow(rand, sweeps); return s; }   // one whole strike, no drawing
}

// ---------------- The page ----------------
const NX = 188, NY = 96;
let rand = K.rng(11), storm = new Storm(NX, NY);
let speed = 6, show = "field", tool = "rod", auto = true, startMode = "random", startX = NX / 2, rain = true;
let listenKm = 2, phase = "leader", phaseT = 0, flash = 0, strokePath = [], log = [], objects = [];
const KIND = { rod: "lightning rod", tower: "tower", tree: "tree", house: "house", person: "person" };
const PRESETS = {
  field: [],
  rod: [{ kind: "house", x: 80 }, { kind: "rod", x: 94, h: 26 }, { kind: "house", x: 130 }],
  tree: [{ kind: "tree", x: 78, h: 14 }, { kind: "person", x: 84, h: 1 }, { kind: "person", x: 120, h: 1 }],
  city: [{ kind: "tower", x: 40, h: 16, w: 9 }, { kind: "tower", x: 62, h: 30, w: 7 }, { kind: "tower", x: 86, h: 22, w: 11 }, { kind: "tower", x: 104, h: 46, w: 7 }, { kind: "rod", x: 104, h: 54 }, { kind: "tower", x: 126, h: 18, w: 9 }, { kind: "tower", x: 150, h: 26, w: 9 }],
  spire: [{ kind: "tower", x: 70, h: 20, w: 15 }, { kind: "tower", x: 118, h: 20, w: 3 }]
};
function load(name) { objects = JSON.parse(JSON.stringify(PRESETS[name])); rebuild(); }
function rebuild() { storm.build(objects); log = []; begin(); tally(); }
function begin() { phase = "leader"; phaseT = 0; strokePath = []; storm.start(startMode === "random" ? 12 + rand() * (NX - 24) : startX); }

const ui = K.app({
  title: "Lightning", subject: "Physics",
  sound: "Sound: thunder from each strike, arriving about 3 seconds per kilometre after the flash (sound travels at 343 m/s; light is almost instant)",
  blurb: "A branching bolt grown from three rules: voltage, field, and chance",
  reset: () => { load("field"); ctl.eta.set(2, true); },
  missions: [
    { title: "Where will it strike?", q: "An open, flat field. The leader always sets off from the same point in the cloud. Does it always hit the ground directly below? Watch ten strikes and look at the chart.", hint: "No. Each step is a weighted gamble, so every bolt is different and the strike points scatter around the point below the start. The path is not planned: the leader only 'feels' the field at its own tip.", setup() { load("field"); set({ eta: 2, startMode: "fixed", show: "field" }); startX = NX / 2; begin(); } },
    { title: "Why does it branch?", q: "The slider η sets how strongly the bolt prefers the strongest field. Try η = 1, 2 and 5. Which looks most like real lightning?", hint: "At η = 1 the bolt is a bushy fractal, at η = 5 nearly a straight spark. Real lightning sits in between. Branching happens because many cells near the tip have almost the same field, so chance decides, and sometimes two win.", setup() { load("field"); set({ eta: 1, startMode: "random", show: "volt" }); } },
    { title: "The field at a point", q: "Switch to 'Field strength' and look at the top of the rod before the leader gets near. Then watch it as the leader comes down. Why are lightning rods pointed and tall?", hint: "Voltage lines have to squeeze round the tip of anything tall and thin, so the field there is many times stronger than over flat ground (see the right-hand chart). The leader grows fastest towards strong field, so it is drawn to the rod.", setup() { load("rod"); set({ eta: 2, startMode: "random", show: "field" }); } },
    { title: "Does the rod protect the houses?", q: "Two houses and a rod. Let the storm run for 30 strikes. How many hit the rod, the near house and the far house?", hint: "The rod takes most strikes near it, and the house beside it is rarely hit. The house further away gets little protection. A rule of thumb used by engineers is that a rod protects a cone about as wide as the rod is tall.", setup() { load("rod"); set({ eta: 2, startMode: "random", show: "none" }); } },
    { title: "Sheltering under a tree", q: "One person stands by a tree, another in the open. Which spot is struck more often? Is it safe by the tree?", hint: "The tree is struck far more often than open ground. This model stops when the bolt arrives; in reality the current then jumps sideways from the trunk to anyone nearby (a 'side flash'), which is how most people sheltering under trees are hurt. In the open you are a small target, but the safest place is indoors or in a car.", setup() { load("tree"); set({ eta: 2, startMode: "random", show: "none" }); } },
    { title: "The tallest building", q: "A city skyline. Does the tallest tower take every strike? Raise or add a building with the Tower tool and see how its share changes.", hint: "The tallest takes the most, but not all: a leader that starts far to one side reaches a shorter, nearer building first. Height matters most, then how close the leader happens to start, then how pointed the top is.", setup() { load("city"); set({ eta: 2, startMode: "random", show: "none" }); } },
    { title: "Blunt or pointed?", q: "Two towers of the same height: one wide with a flat roof, one thin. Which is struck more often? Look at the field chart for the reason.", hint: "The field at the thin tower's top is stronger than anywhere on the flat roof, though the wide roof is a bigger target. Sharper means stronger field: the same reason charge leaks from points, and why a rod has a pointed tip.", setup() { load("spire"); set({ eta: 2, startMode: "random", show: "field" }); } }
  ],
  batch: [
    { title: "How far off target?", question: "On open ground, how far from the point below its start does lightning land?", how: "Each run is one strike on flat ground (a coarser grid than the live view).", xLabel: "", yLabel: "strike point: metres from directly below the start", reps: 150, bins: 25, lo: -200, hi: 200, theory: 0, theoryLabel: "directly below", run(x, r) { const s = bstorm([], 2).run(44, r, 3); return (s.x - 44) * CELL * 2; }, note: "The spread is the lesson: the same cloud, the same start, and strikes land tens of metres apart. The mean is close to zero because left and right are equally likely." },
    { title: "How tall must a rod be?", question: "A leader starts somewhere within 100 m of a rod. How often does the rod catch it?", how: "Each run is one strike, scored 1 if the rod was hit and 0 if the ground was. The cloud base is 276 m up.", xLabel: "rod height (m)", yLabel: "fraction of strikes caught by the rod", xs: [0, 18, 36, 54, 72, 96, 120, 150], reps: 30, yMin: 0, yMax: 1, run(h, r) { const s = bstorm(h ? [{ kind: "rod", x: 44, h: h / 6 }] : [], 2).run(44 + (r() - .5) * 33, r, 3); return s.tag ? 1 : 0; }, note: "Each run is a hit or a miss, so single runs sit at 0 or 1; the mean is the fraction caught. Taller rods catch more, with no sharp cut-off: protection is a matter of odds, not a guarantee." },
    { title: "How wide is the protected zone?", question: "A 72 m rod. How does its chance of catching the strike fall as the leader starts further away?", how: "Each run is one strike with the leader starting the given distance to one side of the rod.", xLabel: "leader starts this far to the side (m)", yLabel: "fraction of strikes caught by the rod", xs: [0, 24, 48, 72, 96, 120, 156, 192], reps: 30, yMin: 0, yMax: 1, run(d, r) { const s = bstorm([{ kind: "rod", x: 30, h: 12 }], 2).run(30 + d / 6, r, 3); return s.tag ? 1 : 0; }, note: "Leaders starting within about one rod-height are usually caught; beyond two rod-heights the rod barely helps. This is the idea behind the 'cone of protection' used to place lightning conductors." },
    { title: "Branching and η", question: "How much longer than a straight line is the bolt, for different η?", how: "Each run is one strike on open ground; the result is channel cells grown ÷ height fallen.", xLabel: "η (how strongly the bolt prefers the strongest field)", yLabel: "cells grown per cell of height", xs: [1, 1.5, 2, 3, 4, 6], reps: 8, yMin: 0, theory: () => 1, theoryLabel: "a perfectly straight bolt", run(eta, r) { const st = bstorm([], eta); st.run(44, r, 3); return st.cells.length / (st.gy - 1); }, note: "At η = 1 the bolt fills space with side branches (a fractal of dimension about 1.7), so it grows many times more cells than it needs. As η rises it wastes less and approaches a straight line. Real lightning corresponds to a moderate η." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>The dielectric breakdown model of Niemeyer, Pietronero and Wiesmann (1984), the standard simple model for sparks and lightning leaders.</p>
<ul><li>The air is a grid of ${NX} × ${NY} cells, 3 m each. The cloud base is the top edge; the ground is near the bottom.</li>
<li><b>Voltage:</b> cloud and channel are held at 0, ground and objects at 1. Everywhere else the voltage obeys Laplace's equation (each cell is the average of its neighbours), solved by repeated averaging after every growth step.</li>
<li><b>Field:</b> the voltage difference between neighbouring cells.</li>
<li><b>Growth:</b> one neighbouring cell joins the channel per step, chosen with probability ∝ field<sup>η</sup>.</li>
<li><b>Strike:</b> when the channel touches anything at ground voltage, the route back up to the cloud lights as the return stroke.</li></ul>
<h3>Simplifications</h3>
<ul><li>Two dimensions, not three. A real rod stands in open space, where the field at its tip is enhanced even more than here.</li>
<li>The channel is a perfect conductor at the cloud's voltage. Real leaders have resistance and carry charge along their length.</li>
<li>Everything standing on the ground (rod, building, tree, person) is treated as an equally good conductor joined to earth.</li>
<li>No upward streamers: in reality sparks rise from tall objects to meet the leader, which makes rods somewhat <i>more</i> effective than shown.</li>
<li>No side flash or ground current after the strike, and no thunder, rain physics or charge build-up in the cloud. The cloud base is one flat sheet.</li>
<li>η is a fitting number that stands in for the complicated physics of how air breaks down. It is not derived from first principles.</li>
<li>The scene is a scale model: real cloud bases are 1–2 km up.</li>
<li>Batch runs use a coarser grid (6 m cells) so that hundreds of strikes finish quickly.</li><li>The air is a 188 × 96 grid of cells and the breakdown model runs on the ordinary processor (CPU), exactly as before, so the strikes, charts and Batch run are unchanged. The graphics card (WebGL) only draws: the voltage and field maps are coloured at every screen pixel from a smooth blend of the cells, and the glow round the bolt is a blurred copy of it added back on top (decoration, not part of the model). Without WebGL the storm is drawn in 2D as before.</li></ul>`
});
function bstorm(objs, eta) { const s = new Storm(88, 50); s.eta = eta; if (objs.length) s.build(objs); return s; }

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The storm");
ctl.eta = K.slider(g, { label: "η: preference for the strongest field", min: 1, max: 6, step: 0.25, value: 2, on: v => storm.eta = v, tip: "1 = bushy, 6 = almost straight" });
ctl.speed = K.slider(g, { label: "Leader speed", min: 1, max: 30, step: 1, value: speed, unit: "cells per frame", on: v => speed = v });
ui.headerSpeed(ctl.speed, { label: "Speed" });   // playback speed lives in the header, beside Pause and Reset
ctl.startMode = K.seg(g, { label: "Leader sets off from", value: "random", options: [["random", "Anywhere"], ["fixed", "One point"]], on: v => { startMode = v; if (v === "fixed") ui.tip("Click in the cloud to choose where the leader starts", 5000); begin(); }, tip: "With 'One point', click the cloud to move it." });
ctl.auto = K.toggle(g, { label: "Keep striking", value: true, on: v => auto = v });
let r1 = K.row(g); K.btn(r1, "⚡ Strike now", () => { begin(); ui.setPlaying(true); }, "primary"); K.btn(r1, "Clear tally", () => { log = []; tally(); });
g = ui.group("Thunder (🔊 Sound on)");
ctl.dist = K.slider(g, { label: "You are watching from", min: 0.3, max: 10, step: 0.1, value: 2, unit: "km", on: v => listenKm = v });
// The flash reaches you almost at once; the sound of the thunder travels at 343 m/s, so it arrives d ÷ 343 seconds later.
// Far-off thunder is quieter and deeper: the air absorbs high frequencies more than low ones.
function thunder() {
  const delay = listenKm * 1000 / 343, near = 1 / (1 + listenKm);
  if (K.sound.on) ui.tip(`Flash! Thunder in ${delay.toFixed(1)} s (${listenKm} km × about 3 s per km)`, Math.min(9000, delay * 1000 + 1500));
  if (listenKm < 1.5) K.sound.noise({ at: delay, dur: 0.25, vol: 0.5 * near, filter: "highpass", freq: 900 });
  K.sound.noise({ at: delay, dur: 2.5 + listenKm * 0.4, vol: 0.9 * near + 0.08, filter: "lowpass", freq: 900 / (1 + listenKm * 0.5), sweep: 70, attack: 0.05 });
  K.sound.noise({ at: delay + 0.4 + Math.random() * 0.6, dur: 2, vol: 0.5 * near + 0.05, filter: "lowpass", freq: 300, sweep: 60, attack: 0.2 });
}
g = ui.group("What to show");
ctl.show = K.seg(g, { value: "field", options: [["none", "Storm only"], ["volt", "Voltage lines"], ["field", "Field strength"]], on: v => show = v });
K.toggle(g, { label: "Rain", value: true, on: v => rain = v });
g = ui.group("Build on the ground");
K.seg(g, { value: "rod", options: [["rod", "Rod"], ["tower", "Tower"], ["tree", "Tree"], ["house", "House"], ["person", "Person"], ["erase", "Erase"]], on: v => tool = v, tip: "Click above the ground: the height of your click sets the height of a rod, tower or tree." });
r1 = K.row(g); for (const [k, label] of [["field", "Open field"], ["rod", "Rod + houses"], ["tree", "Tree"], ["city", "City"]]) K.btn(r1, label, () => load(k), "small");
g = ui.group("Tally");
const read = K.readout(g, [["n", "strikes so far"], ["len", "leader length"], ["tip", "field at the tip"], ["last", "last strike hit"]]);
const tallyEl = K.note(g, "");
function set(o) { if (o.eta != null) ctl.eta.set(o.eta, true); if (o.startMode) { startMode = o.startMode; ctl.startMode.set(o.startMode); } if (o.show) { show = o.show; ctl.show.set(o.show); } }
const nameOf = t => t ? KIND[objects[t - 1].kind] + (objects.filter(o => o.kind === objects[t - 1].kind).length > 1 ? " " + (objects.slice(0, t).filter(o => o.kind === objects[t - 1].kind).length) : "") : "open ground";
function tally() {
  const m = new Map(); for (const s of log) m.set(s.tag, (m.get(s.tag) || 0) + 1);
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `<tr><td style="text-align:left">${nameOf(t)}</td><td>${n}</td><td>${(100 * n / log.length).toFixed(0)}%</td></tr>`).join("");
  tallyEl.innerHTML = log.length ? `<table style="width:100%;font-size:12.5px;color:var(--text)"><tr><th style="text-align:left">struck</th><th>times</th><th>share</th></tr>${rows}</table>` : "Nothing has been struck yet.";
  read.set("n", log.length);
}

// ---------------- Drawing ----------------
let clouds = null;
/* ---- The graphics card (WebGL) draws the sky, the voltage map and the glow of the bolt ----
   The breakdown model is still worked out on the CPU (Storm, above), exactly as before. The graphics card:
     * colours the voltage (or field) map at every SCREEN pixel from a smooth (bicubic) blend of the cells,
       using the same formulas as the 2D drawing, so the equal-voltage lines are smooth curves;
     * makes the bolt glow: the channel is drawn into a half-size picture, blurred (a Gaussian blur, twice,
       at two widths) and added back on top, like the bloom round a real bright light.
   The thin bright core of the bolt, the ground, buildings, clouds and labels are still drawn on the 2D canvas
   on top. Without WebGL: the old 2D drawing. */
const wgl = { on: false, size: null };
const gv = K.gl.create(ui.stage, { dprMax: 2, antialias: false, fallback: "No WebGL here: drawing the storm without the graphics card.", onLost: () => { wgl.on = false; }, onResize: () => { wgl.size = null; } });
const SKY_FS = `precision highp float;
uniform sampler2D uT; uniform vec2 uN; uniform float uShow, uGy, uAlpha; varying vec2 vUv;
${K.gl.BICUBIC}
void main() {
  float yy = 1.0 - vUv.y;                                                        // 0 at the top, 1 at the bottom, as on the 2D canvas
  vec3 bg = yy < 0.6 ? mix(vec3(11.0, 14.0, 28.0), vec3(21.0, 26.0, 48.0), yy / 0.6) : mix(vec3(21.0, 26.0, 48.0), vec3(29.0, 33.0, 56.0), (yy - 0.6) / 0.4);
  vec3 c = bg; vec2 p = vec2(vUv.x, yy) * uN - 0.5;
  if (uShow > 0.5 && p.y > 0.5 && p.y < uGy - 0.5) {
    vec4 q = bicubic(uT, uN, p); float V = q.r, ex = q.b, ey = q.a, solid = q.g;    // voltage, 1 inside the ground or an object, the field (worked out per cell as in the 2D drawing)
    vec3 f; float a;
    if (uShow < 1.5) { float v = V * 16.0, d = abs(v - floor(v + 0.5)); a = (12.0 + 225.0 * clamp(1.25 - d / (length(vec2(ex, ey)) * 16.0 + 1e-4), 0.0, 1.0)) / 255.0; f = vec3(60.0 + 195.0 * V, 150.0 + 30.0 * V, 255.0 - 170.0 * V); }   // equal steps of voltage
    else { float e = length(vec2(ex, ey)) * uGy, s1 = clamp((e - 1.0) / 5.0, 0.0, 1.0), s2 = clamp((e - 6.0) / 14.0, 0.0, 1.0); f = vec3(120.0 + 135.0 * s1, 40.0 + 200.0 * s2, 255.0 - 120.0 * s2); a = 235.0 * sqrt(s1) / 255.0; }   // field strength
    c = mix(bg, f, a * uAlpha * (1.0 - smoothstep(0.3, 0.7, solid)));
  }
  gl_FragColor = vec4(c / 255.0, 1.0);
}`;
const LINE_VS = `attribute vec2 aPos; uniform vec2 uView; void main() { gl_Position = vec4(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0, 0.0, 1.0); }`;
const LINE_FS = `precision mediump float; uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }`;
const BLUR_FS = `precision mediump float; uniform sampler2D uT; uniform vec2 uStep; varying vec2 vUv;
void main() { vec3 s = texture2D(uT, vUv).rgb * 0.2;   // a 9-tap Gaussian blur along one direction
  s += (texture2D(uT, vUv + uStep).rgb + texture2D(uT, vUv - uStep).rgb) * 0.17 + (texture2D(uT, vUv + 2.0 * uStep).rgb + texture2D(uT, vUv - 2.0 * uStep).rgb) * 0.11;
  s += (texture2D(uT, vUv + 3.0 * uStep).rgb + texture2D(uT, vUv - 3.0 * uStep).rgb) * 0.06 + (texture2D(uT, vUv + 4.0 * uStep).rgb + texture2D(uT, vUv - 4.0 * uStep).rgb) * 0.025;
  gl_FragColor = vec4(s, 1.0); }`;
const ADD_FS = `precision mediump float; uniform sampler2D uA, uB; uniform float uGain; varying vec2 vUv; void main() { gl_FragColor = vec4((texture2D(uA, vUv).rgb * 1.6 + texture2D(uB, vUv).rgb * 2.2) * uGain, 1.0); }`;
if (gv.ok && K.gl.floatType(gv.gl).kind !== "byte") {
  try { const gl = gv.gl; wgl.sky = K.gl.program(gl, K.gl.QUAD_VS, SKY_FS); wgl.line = K.gl.program(gl, LINE_VS, LINE_FS); wgl.blur = K.gl.program(gl, K.gl.QUAD_VS, BLUR_FS); wgl.add = K.gl.program(gl, K.gl.QUAD_VS, ADD_FS); wgl.quad = K.gl.quad(gl); wgl.segs = K.gl.points(gl, { aPos: 2 }); wgl.tex = K.gl.target(gl, NX, NY, { float: true }); wgl.buf = new Float32Array(4 * NX * NY); wgl.on = true; }
  catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly: drawing the storm without it."); }
} else if (gv.ok) K.gl.notice(ui.stage, "This graphics card cannot store decimal numbers in textures: drawing the storm without it.");
window.__glInfo = () => ({ gpu: wgl.on, grid: NX + " × " + NY, model: "CPU", webgl: gv.ok ? (gv.gl2 ? 2 : 1) : 0 });
// the sky and the voltage map; then the glow of the channel (a list of [x1, y1, x2, y2] in CSS pixels, with a colour)
function skyGL(w, h) {
  const gl = gv.gl, V = storm.V, type = storm.type, B = wgl.buf;
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { const i = x + y * NX; B[4 * i] = V[i]; B[4 * i + 1] = type[i] === 2 ? 1 : 0;
    B[4 * i + 2] = (V[x < NX - 1 ? i + 1 : i] - V[x ? i - 1 : i]) / 2; B[4 * i + 3] = y > 0 && y < NY - 1 ? (V[i + NX] - V[i - NX]) / 2 : 0; }
  wgl.tex.upload(B); K.gl.bindTarget(gl, null);
  wgl.sky.set({ uT: wgl.tex, uN: [NX, NY], uShow: show === "volt" ? 1 : show === "field" ? 2 : 0, uGy: storm.gy, uAlpha: show === "volt" ? 0.8 : 0.6 }); wgl.quad.draw(wgl.sky);
}
function glowGL(w, h, groups, gain) {
  const gl = gv.gl, W = Math.max(2, Math.round(w / 2)), H = Math.max(2, Math.round(h / 2));
  if (!wgl.size || wgl.size[0] !== W || wgl.size[1] !== H) { for (const k of ["A", "B", "C"]) if (wgl[k]) wgl[k].dispose(); wgl.A = K.gl.target(gl, W, H, { filter: "linear" }); wgl.B = K.gl.target(gl, W, H, { filter: "linear" }); wgl.C = K.gl.target(gl, W, H, { filter: "linear" }); wgl.size = [W, H]; }
  K.gl.bindTarget(gl, wgl.A); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (const [segs, col] of groups) if (segs.length) { wgl.segs.set("aPos", new Float32Array(segs)); wgl.line.set({ uView: [w, h], uCol: col }); wgl.segs.draw(wgl.line, segs.length / 2, gl.LINES); }
  gl.disable(gl.BLEND);
  const blur = (from, to, dx, dy) => { wgl.blur.set({ uT: from, uStep: [dx / W, dy / H] }); wgl.quad.draw(wgl.blur, to); };
  blur(wgl.A, wgl.B, 1, 0); blur(wgl.B, wgl.C, 0, 1);              // a narrow glow (in C)
  blur(wgl.C, wgl.B, 3, 0); blur(wgl.B, wgl.A, 0, 3);              // and a wide one (in A)
  K.gl.bindTarget(gl, null); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  wgl.add.set({ uA: wgl.A, uB: wgl.C, uGain: gain }); wgl.quad.draw(wgl.add); gl.disable(gl.BLEND);
}
const cv = ui.canvas(c => makeClouds(c));
const fimg = document.createElement("canvas"); fimg.width = NX; fimg.height = NY; const fctx = fimg.getContext("2d"), fdata = fctx.createImageData(NX, NY);
const drops = []; for (let i = 0; i < 140; i++) drops.push([Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
// each grid cell is drawn slightly off-centre so the bolt does not look like graph paper
const JX = new Float32Array(NX * NY), JY = new Float32Array(NX * NY); { const r = K.rng(5); for (let i = 0; i < NX * NY; i++) { JX[i] = (r() - .5) * 0.7; JY[i] = (r() - .5) * 0.7; } }
function makeClouds(cv) {   // a bank of storm cloud along the top, painted once
  clouds = document.createElement("canvas"); clouds.width = Math.max(2, cv.w); clouds.height = 170; const c = clouds.getContext("2d"), r = K.rng(3);
  for (let i = 0; i < 260; i++) { const x = r() * cv.w, y = 20 + r() * r() * 70, rad = 26 + r() * 54, gr = c.createRadialGradient(x, y, 0, x, y, rad), v = 46 + r() * 50 | 0; gr.addColorStop(0, `rgba(${v},${v + 3},${v + 22},.55)`); gr.addColorStop(1, `rgba(${v},${v + 3},${v + 22},0)`); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
}
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, sx = w / NX, sy = h / NY, gy = storm.gy, V = storm.V, type = storm.type;
  const X = i => ((i % NX) + .5 + JX[i]) * sx, Y = i => (((i / NX) | 0) + .5 + JY[i]) * sy;
  if (wgl.on) { skyGL(w, h); c.clearRect(0, 0, w, h); }
  else { const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#0b0e1c"); bg.addColorStop(.6, "#151a30"); bg.addColorStop(1, "#1d2138"); c.fillStyle = bg; c.fillRect(0, 0, w, h); }
  if (show !== "none" && !wgl.on) {   // paint the voltage or the field strength, one grid cell per pixel, then stretch it over the scene
    const px = fdata.data;
    for (let y = 1; y < gy; y++) for (let x = 0; x < NX; x++) {
      const i = x + y * NX, j = i * 4; if (type[i] === 2) { px[j + 3] = 0; continue; }
      const ex = (V[x < NX - 1 ? i + 1 : i] - V[x ? i - 1 : i]) / 2, ey = (V[i + NX] - V[i - NX]) / 2;
      if (show === "volt") { // equal steps of voltage, drawn as lines: where they crowd together the field is strong
        const v = V[i] * 16, f = Math.abs(v - Math.round(v)), line = K.clamp(1.25 - f / (Math.hypot(ex, ey) * 16 + 1e-4), 0, 1); px[j] = 60 + 195 * V[i]; px[j + 1] = 150 + 30 * V[i]; px[j + 2] = 255 - 170 * V[i]; px[j + 3] = 12 + 225 * line; }
      else { const e = Math.hypot(ex, ey) * gy, a = K.clamp((e - 1) / 5, 0, 1), b = K.clamp((e - 6) / 14, 0, 1); px[j] = 120 + 135 * a; px[j + 1] = 40 + 200 * b; px[j + 2] = 255 - 120 * b; px[j + 3] = 235 * Math.sqrt(a); }
    }
    fctx.putImageData(fdata, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.globalAlpha = show === "volt" ? 0.8 : 0.6; c.drawImage(fimg, 0, 0, w, h); c.globalAlpha = 1;
  }
  if (rain) { c.strokeStyle = "rgba(170,190,230,.16)"; c.lineWidth = 1; c.beginPath(); for (const d of drops) { d[1] += dt * d[2] * 1.5; if (d[1] > 1) { d[1] = 0; d[0] = Math.random(); } const x = d[0] * w, y = d[1] * gy * sy; c.moveTo(x, y); c.lineTo(x - 3, y + 14 * d[2]); } c.stroke(); }
  // the ground and what stands on it
  c.fillStyle = "#06080f"; c.fillRect(0, gy * sy, w, h - gy * sy);
  objects.forEach(o => {
    const x = (o.x + .5) * sx, base = gy * sy, top = base - o.h * sy;
    if (o.kind === "rod") { c.strokeStyle = "#8f9bb8"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, base); c.lineTo(x, top); c.stroke(); c.fillStyle = "#cfd8ee"; c.beginPath(); c.arc(x, top, 2.5, 0, 6.3); c.fill(); }
    else if (o.kind === "tower") { const ww = (o.w || 9) * sx; c.fillStyle = "#0a0d18"; c.fillRect(x - ww / 2, top, ww, o.h * sy); c.fillStyle = "rgba(255,214,130,.55)"; for (let yy = top + 6; yy < base - 6; yy += 9) for (let xx = x - ww / 2 + 4; xx < x + ww / 2 - 5; xx += 8) if (((xx * 7 + yy * 13) | 0) % 5 < 2) c.fillRect(xx, yy, 3.5, 4.5); }
    else if (o.kind === "house") { c.fillStyle = "#0a0d18"; c.beginPath(); c.moveTo(x - 4.5 * sx, base); c.lineTo(x - 4.5 * sx, base - 3 * sy); c.lineTo(x, base - 6.4 * sy); c.lineTo(x + 4.5 * sx, base - 3 * sy); c.lineTo(x + 4.5 * sx, base); c.fill(); c.fillStyle = "rgba(255,214,130,.8)"; c.fillRect(x - 2.6 * sx, base - 2.3 * sy, 1.6 * sx, 1.4 * sy); c.fillRect(x + 1 * sx, base - 2.3 * sy, 1.6 * sx, 1.4 * sy); }
    else if (o.kind === "tree") { c.fillStyle = "#070a12"; c.fillRect(x - sx * .5, base - o.h * sy * .5, sx, o.h * sy * .5); c.beginPath(); c.ellipse(x, base - o.h * sy * .62, 3.6 * sx, o.h * sy * .42, 0, 0, 6.3); c.fill(); }
    else { c.strokeStyle = "#aab4d0"; c.lineWidth = 1.6; c.beginPath(); c.arc(x, base - 9.5, 2.2, 0, 6.3); c.moveTo(x, base - 7); c.lineTo(x, base - 3); c.lineTo(x - 2, base); c.moveTo(x, base - 3); c.lineTo(x + 2, base); c.moveTo(x - 2.5, base - 5.5); c.lineTo(x + 2.5, base - 5.5); c.stroke(); }
  });
  // the channel: every cell joined to the cell it grew from
  const cells = storm.cells, par = storm.parent; c.lineCap = "round"; c.globalCompositeOperation = "lighter";
  const fade = phase === "glow" ? Math.max(0, 1 - phaseT / 1.1) : 1, pass = (lw, col) => { c.lineWidth = lw; c.strokeStyle = col; c.beginPath(); for (const i of cells) { const p = par[i]; if (p < 0) continue; c.moveTo(X(p), Y(p)); c.lineTo(X(i), Y(i)); } c.stroke(); };
  if (wgl.on) {   // the glow comes from the graphics card; the thin bright core is still drawn below
    const lead = []; for (const i of cells) { const p = par[i]; if (p >= 0) lead.push(X(p), Y(p), X(i), Y(i)); }
    const str = [], n = strokePath.length, upto = phase === "leader" ? 0 : Math.min(n, Math.ceil(phaseT / 0.12 * n)), a = phase === "stroke" ? 1 : fade;
    for (let k = 0; k < upto; k++) { const i = strokePath[k], from = k ? [X(strokePath[k - 1]), Y(strokePath[k - 1])] : [storm.struck.x * sx + sx / 2, storm.top[storm.struck.x] * sy]; str.push(from[0], from[1], X(i), Y(i)); }
    glowGL(w, h, [[lead, [0.47 * 0.5, 0.39 * 0.5, 1 * 0.5].map(v => v * (phase === "leader" ? 1 : 0.6 * fade))], [str, [0.55 * a, 0.68 * a, 1 * a]]], 3.2);
    c.globalCompositeOperation = "lighter";
  }
  if (phase === "leader") { if (!wgl.on) pass(5, "rgba(120,100,255,.16)"); pass(1.3, "rgba(196,180,255,.9)"); c.fillStyle = "#fff"; for (let k = Math.max(0, cells.length - 10); k < cells.length; k++) { c.beginPath(); c.arc(X(cells[k]), Y(cells[k]), 1.8, 0, 6.3); c.fill(); } }
  else { if (!wgl.on) pass(4, `rgba(120,100,255,${0.12 * fade})`); pass(1.1, `rgba(196,180,255,${0.55 * fade})`);
    // the return stroke: a wave of current running up the one path that reached the ground
    const n = strokePath.length, upto = Math.min(n, Math.ceil(phaseT / 0.12 * n)), a = phase === "stroke" ? 1 : fade;
    for (const [lw, col] of (wgl.on ? [] : [[16, `rgba(110,140,255,${.22 * a})`]]).concat([[7, `rgba(170,200,255,${.5 * a})`], [2.6, `rgba(255,255,255,${a})`]])) { c.lineWidth = lw; c.strokeStyle = col; c.beginPath(); for (let k = 0; k < upto; k++) { const i = strokePath[k]; k ? c.lineTo(X(i), Y(i)) : c.moveTo(storm.struck.x * sx + sx / 2, (storm.top[storm.struck.x]) * sy); if (!k) c.lineTo(X(i), Y(i)); } c.stroke(); } }
  c.globalCompositeOperation = "source-over";
  if (clouds) { c.drawImage(clouds, 0, -40); if (flash > 0.02) { c.globalCompositeOperation = "lighter"; c.globalAlpha = flash; for (let k = 0; k < 3; k++) c.drawImage(clouds, 0, -40); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; } }
  if (flash > 0.02) { c.fillStyle = `rgba(200,215,255,${flash * 0.3})`; c.fillRect(0, 0, w, h); }
  if (startMode === "fixed") { const x = (startX + .5) * sx; c.fillStyle = "#ffd866"; c.beginPath(); c.moveTo(x, 20); c.lineTo(x - 6, 8); c.lineTo(x + 6, 8); c.fill(); c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("leader starts here", x, 34); }
  c.fillStyle = "#aab4d0"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("cloud base and bolt: voltage 0", 10, 16); c.fillStyle = "#8b98b8"; c.fillText("ground and everything on it: voltage 1 (model units)", 10, gy * sy + 12);
  // scale bar
  c.strokeStyle = c.fillStyle = "#aab4d0"; c.lineWidth = 2; c.beginPath(); c.moveTo(w - 20 - 50 / CELL * sx, gy * sy + 8); c.lineTo(w - 20, gy * sy + 8); c.stroke(); c.textAlign = "right"; c.fillText("50 m", w - 22 - 50 / CELL * sx, gy * sy + 12);
}
const chHit = K.chart(ui.dock, { title: "Where the strikes have landed", xLabel: "position along the ground (m)", yLabel: "strikes" });
const chField = K.chart(ui.dock, { title: "Electric field at the surface, right now", xLabel: "position along the ground (m)", yLabel: "field (× open-field value)", yMin: 0 });

// ---------------- Mouse: build things, aim the leader ----------------
K.pointer(cv.el, { down(p) {
  const x = Math.round(p.x / cv.w * NX - .5), yc = p.y / cv.h * NY, hgt = K.clamp(Math.round(storm.gy - yc), 2, 70);
  if (yc < 14 && startMode === "fixed") { startX = K.clamp(x, 4, NX - 5); begin(); return; }
  if (tool === "erase") { const k = objects.findIndex(o => Math.abs(o.x - x) <= Math.max(3, (o.w || 1) / 2 + 1)); if (k >= 0) { objects.splice(k, 1); rebuild(); } return; }
  if (x < 6 || x > NX - 7) return;
  objects.push(tool === "rod" ? { kind: "rod", x, h: hgt } : tool === "tower" ? { kind: "tower", x, h: hgt, w: 9 } : tool === "tree" ? { kind: "tree", x, h: K.clamp(hgt, 6, 30) } : { kind: tool, x, h: tool === "house" ? 6 : 1 });
  rebuild();
} });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  phaseT += dt; flash *= Math.pow(0.02, dt);
  if (phase === "leader") {
    for (let k = 0; k < speed && phase === "leader"; k++) {
      const s = storm.grow(rand, 5);
      if (s) { // contact: trace the winning route back up to the cloud
        strokePath = []; for (let c = s.cell; c >= 0; c = storm.parent[c]) strokePath.push(c);
        phase = "stroke"; phaseT = 0; flash = 1; thunder(); log.push({ x: s.x, tag: s.tag }); tally(); read.set("last", nameOf(s.tag));
      }
    }
  } else if (phase === "stroke") { if (phaseT > 0.12) { flash = Math.max(flash, 0.8); } if (phaseT > 0.3) { phase = "glow"; phaseT = 0; } }
  else if (phase === "glow" && phaseT > 1.3 && auto) begin();
}, dt => {
  draw(dt); if (frame++ % 4) return;
  const h = K.histogram(log.map(s => (s.x + .5) * CELL), 47, 0, NX * CELL), marks = objects.map(o => ({ x: (o.x + .5) * CELL, color: "#8b98b8", label: KIND[o.kind].replace("lightning ", ""), row: 0 })).map((m, i) => (m.row = i % 3, m));
  chHit.draw([{ pts: h.pts, w: h.w, type: "bars", color: K.cssVar("--s0") }], { xMin: 0, xMax: NX * CELL, yMax: Math.max(4, ...h.pts.map(p => p[1])) + 1, vlines: marks.slice(0, 8) });
  const fp = []; let fmax = 3; for (let x = 1; x < NX - 1; x++) { const f = storm.surfaceField(x); fp.push([(x + .5) * CELL, f]); if (f > fmax) fmax = f; }
  chField.draw([{ pts: fp, type: "area", color: K.cssVar("--s3") }], { xMin: 0, xMax: NX * CELL, yMax: Math.min(25, fmax * 1.15), hlines: [{ y: 1, label: "open flat ground = 1" }] });
  read.set("len", storm.cells.length * CELL + " m"); read.set("tip", phase === "leader" ? "× " + storm.tipField().toFixed(0) : "–");
});
load("field");
ui.tip("Pick a tool and click above the ground to build · the leader finds its own way down", 7000);
