/* =====================================================================
   WILDFIRE
   The landscape is a grid of 200 x 112 cells (each about 10 m across).
   A cell is bare ground, fuel (grass or forest), burning, or burnt.
   Each time step, a burning cell tries to set light to its neighbours.
   The chance of success depends on:
      - how dry the fuel is
      - the wind (fire is blown downwind, and embers jump ahead)
      - the slope (fire runs uphill: flames lean into the fuel above)
   Simple local rules, but the fire front, its shape and whether it
   dies out or sweeps the whole map all emerge from them.
   ===================================================================== */
const GW = 200, GH = 112, NC = GW * GH;
const EMPTY = 0, TREE = 1, FIRE = 2, ASH = 3, BREAK = 4, HOUSE = 5, WATER = 6;

// Smooth random hills (a few layers of interpolated noise)
function terrain(rand, hills) {
  const h = new Float32Array(NC);
  for (let o = 0; o < 3; o++) { const cells = [18, 9, 5][o], amp = [1, .45, .2][o], gw = Math.ceil(GW / cells) + 2, gh = Math.ceil(GH / cells) + 2, n = new Float32Array(gw * gh); for (let i = 0; i < n.length; i++) n[i] = rand();
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const fx = x / cells, fy = y / cells, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); const a = n[ix + iy * gw], b = n[ix + 1 + iy * gw], c = n[ix + (iy + 1) * gw], d = n[ix + 1 + (iy + 1) * gw]; h[x + y * GW] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy); } }
  for (let i = 0; i < NC; i++) h[i] = (h[i] / 1.65) * hills; return h;
}
class Land {
  constructor(rand, o = {}) {
    this.r = rand; this.o = Object.assign({ density: 0.75, dry: 0.6, wind: 0, windDir: 0, hills: 1, pure: false, embers: true }, o);
    this.s = new Uint8Array(NC); this.age = new Uint8Array(NC); this.h = terrain(rand, this.o.hills * 60); this.shade = new Float32Array(NC); this.burning = []; this.burnt = 0; this.fuel = 0; this.t = 0; this.houses = 0; this.housesLost = 0; this.sparks = [];
    for (let i = 0; i < NC; i++) { this.shade[i] = rand(); if (rand() < this.o.density) { this.s[i] = TREE; this.fuel++; } }
  }
  ignite(x, y) { const i = x + y * GW; if (x < 0 || y < 0 || x >= GW || y >= GH) return; if (this.s[i] === TREE || this.s[i] === HOUSE) { if (this.s[i] === HOUSE) this.housesLost++; this.s[i] = FIRE; this.age[i] = 0; this.burning.push(i); } }
  // One time step (about 1 minute)
  step() {
    const { s, age, h, o, r } = this, next = [], cur = this.burning, wx = Math.cos(o.windDir) * o.wind, wy = Math.sin(o.windDir) * o.wind; this.t++;
    this.burning = [];            // cells lit during this step are collected here by ignite() and start spreading next step
    for (const i of cur) {
      const x = i % GW, y = (i / GW) | 0;
      if (o.pure) { // "pure percolation": fire always spreads to the 4 touching neighbours, nothing else matters
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && s[xx + yy * GW] === TREE) this.ignite(xx, yy); }
        s[i] = ASH; this.burnt++; continue;
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue; const j = xx + yy * GW; if (s[j] !== TREE && s[j] !== HOUSE) continue;
        const len = dx && dy ? 1.414 : 1;
        let p = 0.07 + 0.42 * o.dry * o.dry;                                 // drier fuel catches more easily
        p *= Math.exp(1.1 * (dx * wx + dy * wy) / len);                      // wind pushes flames downwind
        p *= Math.exp(K.clamp((h[j] - h[i]) * 0.5, -1.2, 1.6));              // uphill is easier, downhill harder
        if (len > 1) p *= 0.7;                                               // diagonal neighbours are further away
        if (r() < p) this.ignite(xx, yy);
      }
      // embers: strong wind throws burning fragments far ahead of the front ("spotting")
      if (o.embers && o.wind > 0.5 && r() < 0.012 * o.wind * o.dry) { const d = 4 + r() * 16 * o.wind, xx = Math.round(x + Math.cos(o.windDir + (r() - .5) * .5) * d), yy = Math.round(y + Math.sin(o.windDir + (r() - .5) * .5) * d); if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && s[xx + yy * GW] === TREE) { this.sparks.push({ x0: x, y0: y, x1: xx, y1: yy, t: 0 }); } }
      if (++age[i] >= 5) { s[i] = ASH; this.burnt++; } else next.push(i);   // a cell burns for 5 steps, then it is ash
    }
    this.burning = next.concat(this.burning);
    for (const sp of this.sparks) { sp.t += 0.2; if (sp.t >= 1 && !sp.done) { sp.done = true; this.ignite(sp.x1, sp.y1); } } this.sparks = this.sparks.filter(sp => sp.t < 1.2);
  }
  done() { return this.burning.length === 0 && this.sparks.length === 0; }
  fracBurnt() { return this.fuel ? this.burnt / this.fuel : 0; }
}
// Headless: light the fire (a point or the whole left edge) and let it burn out
function burnOut(rand, o, line) { const L = new Land(rand, o); if (line) for (let y = 0; y < GH; y++) L.ignite(0, y); else { let n = 0; while (!L.burning.length && n++ < 200) L.ignite(GW / 2 + rand.int(11) - 5, GH / 2 + rand.int(11) - 5); } let k = 0; while (!L.done() && k++ < 4000) L.step(); return L; }

// ---------------------------------------------------------------- page
let land, tool = "ignite", speed = 2, hist = [], smoke = [], budget = 0, lastPt = null; const S = {};
const ui = K.app({
  title: "Wildfire", subject: "Geography", blurb: "Light a fire and watch it run. Wind, slope, drought and fuel decide whether it fizzles or takes the whole forest.",
  reset: () => newLand(),
  missions: [
    { title: "The tipping point", q: "In this flat, windless forest fire spreads only to touching trees. Light fires at tree density 50%, 55%, 60%, 65%. Is the change in area burnt gradual or sudden?", hint: "There is a critical density close to 59%. Below it the forest is a set of separate clumps and every fire stays small. Above it the clumps join into one connected network and a single spark can cross the whole map. Scientists call this a percolation threshold: a tipping point.", setup: () => { S.pure.set(true, true); S.hills.set(0, true); S.wind.set(0, true); S.den.set(55, true); newLand(); } },
    { title: "Wind", q: "Light one fire in still air and look at its shape. Reset, set a strong wind and light another. What shape is the burn scar now, and what are the bright streaks ahead of the front?", hint: "Still air gives a roughly circular fire. Wind stretches it into a long ellipse with a fast 'head' downwind and slow 'flanks'. Embers carried by the wind start spot fires ahead of the front: this is how fires jump roads and rivers.", setup: () => { S.pure.set(false, true); S.hills.set(0, true); S.den.set(80, true); S.dry.set(55, true); S.wind.set(0, true); newLand(); } },
    { title: "Uphill", q: "No wind, steep hills (pale = high ground). Light a fire in a valley, then one on a ridge top. Which spreads faster, and why are firefighters taught never to stand uphill of a fire?", hint: "Fire runs uphill: the flames lean over the fuel above them and pre-heat it. A fire can travel several times faster up a steep slope than on the flat, and it slows right down going downhill. Ridge lines are natural places to stop a fire.", setup: () => { S.pure.set(false, true); S.hills.set(2, true); S.wind.set(0, true); S.den.set(80, true); S.dry.set(50, true); newLand(); } },
    { title: "Drought", q: "Light the same forest at dryness 10%, 20%, 30% and 40%. Is there a dryness below which fires just go out?", hint: "Yes: another threshold. Damp fuel rarely passes fire on, so each burning cell lights on average fewer than one neighbour and the fire dies. Above the threshold each lights more than one and the fire grows. A warmer climate means more days above the threshold.", setup: () => { S.pure.set(false, true); S.hills.set(0.6, true); S.wind.set(0, true); S.den.set(80, true); S.dry.set(10, true); newLand(); } },
    { title: "Save the village", q: "A fire has started upwind of a village (white houses). You have 250 cells of <b>firebreak</b> to bulldoze, and the clock is running. Where should the break go? Try again with a stronger wind.", hint: "A break right next to the fire is quickly outflanked; a break close to the village must be wide enough to stop embers. Good breaks are anchored to bare ground or water and angled so the fire is steered past. In strong wind, embers jump narrow breaks: the real reason villages burn.", setup: () => village() },
    { title: "The firefighter's paradox", q: "Compare two forests in the Batch run: one where small fires are allowed to burn, one where every fire is put out for decades. Predict which has the worst fire in the end.", hint: "Putting out every small fire lets fuel build up into one continuous, dense forest, far above the critical density. When a fire finally escapes on a hot windy day it is enormous. Many fire services now use controlled burning to keep fuel patchy.", setup: () => { ui.openBatch(); } },
  ],
  batch: [
    { title: "The percolation threshold", question: "How does area burnt depend on tree density?", how: "Pure percolation: flat, no wind, fire spreads to the four touching neighbours. The whole left edge is lit; we record the percentage of trees burnt.", xLabel: "tree density (%)", yLabel: "trees burnt (%)", xs: [40, 48, 52, 55, 57, 59, 61, 63, 66, 70, 80], reps: 8, yMin: 0, yMax: 105,
      run: (d, r) => burnOut(r, { density: d / 100, pure: true, hills: 0 }, true).fracBurnt() * 100, note: "Each forest is a different random arrangement of trees. Close to the critical density (59.3% for an infinite forest) the outcome depends on whether a few chance bridges of trees happen to exist, so the spread of results is enormous there and small elsewhere. That is the mark of a tipping point." },
    { title: "Dryness", question: "How dry must the fuel be for a fire to take hold?", how: "Realistic spread rules, gentle hills, no wind, 80% tree cover. One ignition near the centre.", xLabel: "fuel dryness (%)", yLabel: "trees burnt (%)", xs: [10, 15, 20, 25, 30, 35, 40, 50, 70], reps: 8, yMin: 0, yMax: 105,
      run: (d, r) => burnOut(r, { dry: d / 100, density: 0.8, hills: 0.5 }).fracBurnt() * 100, note: "Near the threshold some fires die in the first few steps by bad luck and others escape, so the results split into two groups: almost nothing or almost everything." },
    { title: "Wind and survival of a fire", question: "Does wind help a fire survive in damp fuel?", how: "Damp fuel (dryness 20%), 80% cover, flat. One ignition near the centre.", xLabel: "wind strength", yLabel: "trees burnt (%)", xs: [0, 0.4, 0.8, 1.2, 1.6, 2], reps: 8, yMin: 0,
      run: (w, r) => burnOut(r, { dry: 0.2, density: 0.8, hills: 0, wind: w }).fracBurnt() * 100, note: "Wind makes spread downwind much more likely and upwind much less likely, and embers start new fires ahead. A fire that would die in still air can run as a narrow tongue in wind." },
    { title: "The firefighter's paradox", question: "Does putting out small fires make the big one worse?", how: "Trees regrow by 1.5% a year and lightning strikes every year for 80 years. x = the percentage of fires that are put out while small. Then, in year 81, one fire escapes in a drought. We record how much burns.", xLabel: "fires suppressed during 80 years (%)", yLabel: "trees burnt in the escaped fire (% of map)", xs: [0, 25, 50, 75, 90, 100], reps: 8, yMin: 0,
      run: (sup, r) => { const L = new Land(r, { density: 0.35, pure: true, hills: 0 });
        for (let yr = 0; yr < 80; yr++) { for (let i = 0; i < NC; i++) { if (L.s[i] === ASH) L.s[i] = EMPTY; if (L.s[i] === EMPTY && r() < 0.015) L.s[i] = TREE; } for (let k = 0; k < 3; k++) if (r() * 100 >= sup) { L.ignite(r.int(GW), r.int(GH)); let q = 0; while (!L.done() && q++ < 3000) L.step(); } }
        let before = 0; for (let i = 0; i < NC; i++) { if (L.s[i] === ASH) L.s[i] = EMPTY; if (L.s[i] === TREE) before++; } L.burnt = 0; let n = 0; while (!L.burning.length && n++ < 500) L.ignite(r.int(GW), r.int(GH)); let q = 0; while (!L.done() && q++ < 4000) L.step(); return L.burnt / NC * 100; },
      note: "With no suppression, frequent small fires keep the forest patchy and near the critical density, so the final fire is limited. With total suppression the forest grows dense and connected, and the one fire that escapes takes nearly everything." },
  ],
  notes: `<h3>The rules</h3><ul><li>A burning cell tests each of its 8 neighbours once per step. Base chance of lighting a neighbour = <code>0.07 + 0.42 × dryness²</code>.</li><li>Wind multiplies that chance up for downwind neighbours and down for upwind ones. Slope does the same for uphill and downhill.</li><li>A cell burns for 5 steps and then becomes ash.</li><li>In wind, burning cells occasionally throw an ember up to 30 or so cells ahead.</li><li><b>Pure percolation</b> mode strips this back: fire always spreads to the 4 touching trees and nothing else matters. It is the mathematician's version, with an exact tipping point at 59.3% density.</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>Every tree is the same: no difference between grass, shrub and timber, no moisture differences between sunny and shady slopes.</li><li>Wind is the same everywhere and is not changed by the hills or by the fire (large fires make their own wind).</li><li>The fire does not dry out fuel ahead of it, apart from the slope effect.</li><li>One cell is roughly 10 m and one step roughly 1 minute: treat spread rates as comparisons, not forecasts.</li><li>Firebreaks and water drops are perfect: fire can only cross them by embers.</li></ul>
  <h3>Words to use</h3><p>fuel load · fire front · spotting · firebreak · threshold / tipping point · controlled burn · positive feedback</p>`,
});
let g = ui.group("Your tools");
S.tool = K.seg(g, { value: "ignite", options: [["ignite", "🔥 Ignite"], ["break", "⛏ Firebreak"], ["water", "💧 Water drop"], ["plant", "🌲 Plant"], ["house", "🏠 House"]], on: v => { tool = v; ui.tip({ ignite: "Click to start a fire", break: "Drag to bulldoze a firebreak", water: "Click to drop water: puts out flames and soaks the fuel", plant: "Drag to plant trees", house: "Click to build a house" }[v], 3500); } });
const r0 = K.row(g); K.btn(r0, "⚡ Lightning strike", () => { for (let k = 0; k < 300 && !land.burning.length; k++) land.ignite(land.r.int(GW), land.r.int(GH)); }); K.btn(r0, "🌱 New forest", () => newLand());
g = ui.group("Weather");
S.wind = K.slider(g, { label: "Wind strength", min: 0, max: 2, step: 0.1, value: 0.6, fmt: v => v === 0 ? "calm" : v.toFixed(1) + (v > 1.4 ? " · gale" : ""), on: v => land.o.wind = v });
S.dir = K.slider(g, { label: "Wind blowing towards", min: 0, max: 345, step: 15, value: 0, fmt: v => ["E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N", "NNE", "NE", "ENE"][Math.round(v / 22.5) % 16] + " " + v + "°", on: v => land.o.windDir = v * Math.PI / 180 });
S.dry = K.slider(g, { label: "Fuel dryness", min: 0, max: 100, step: 5, value: 55, unit: "%", fmt: v => v + "%" + (v < 30 ? " · damp" : v > 75 ? " · drought" : ""), on: v => land.o.dry = v / 100 });
g = ui.group("Landscape (applies to a new forest)");
S.den = K.slider(g, { label: "Tree density", min: 20, max: 100, step: 1, value: 78, unit: "%", on: () => newLand() });
S.hills = K.slider(g, { label: "Hills", min: 0, max: 2, step: 0.1, value: 1, fmt: v => v === 0 ? "flat" : v < 1 ? "gentle" : v < 1.6 ? "hilly" : "steep", on: () => newLand() });
S.pure = K.toggle(g, { label: "Pure percolation (ignore wind, slope and dryness)", value: false, on: () => newLand() });
g = ui.group("View");
S.speed = K.slider(g, { label: "Speed", min: 1, max: 8, step: 1, value: 2, fmt: v => v + "×", on: v => speed = v });
g = ui.group("Damage report");
const read = K.readout(g, [["burnt", "Trees burnt"], ["front", "Cells on fire"], ["time", "Time"], ["houses", "Houses lost"]]);

function opts() { return { density: S.den.value / 100, dry: S.dry.value / 100, wind: S.wind.value, windDir: S.dir.value * Math.PI / 180, hills: S.hills.value, pure: S.pure.value }; }
function newLand() { land = new Land(K.rng(Date.now()), opts()); hist = []; smoke = []; budget = 0; dirty = true; }
function setCell(i, v) { const s = land.s; if (s[i] === TREE && v !== TREE) land.fuel--; if (s[i] !== TREE && v === TREE) land.fuel++; if (s[i] === HOUSE) land.houses--; if (v === HOUSE) land.houses++; s[i] = v; }
function village() {
  S.pure.set(false); S.hills.set(0.5); S.den.set(82); S.dry.set(60); S.wind.set(0.8, false); S.dir.set(0, false); newLand(); land.o.wind = 0.8; land.o.windDir = 0;
  for (let k = 0; k < 26; k++) { const x = 150 + land.r.int(26), y = 44 + land.r.int(26); for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) setCell(x + dx + (y + dy) * GW, HOUSE); }
  for (let dy = -1; dy <= 1; dy++) land.ignite(22, 56 + dy); budget = 250; S.tool.set("break", true); S.speed.set(1, true);
}
// ---- Drawing: the map is painted into a small image (one pixel per cell) and scaled up ----
const img = document.createElement("canvas"); img.width = GW; img.height = GH; const ictx = img.getContext("2d"), idata = ictx.createImageData(GW, GH), px = idata.data;
const cv = ui.canvas(); let vr = { s: 1, ox: 0, oy: 0 }, dirty = true;
function paint() {
  const { s, h, shade, age } = land;
  for (let i = 0, j = 0; i < NC; i++, j += 4) {
    const x = i % GW, lightSlope = K.clamp((h[i] - (x > 0 ? h[i - 1] : h[i])) * 5 + (h[i] - (i >= GW ? h[i - GW] : h[i])) * 5, -26, 30), elev = h[i] * 0.45, v = shade[i]; let r, g2, b;
    switch (s[i]) {
      case TREE: r = 18 + v * 22 + elev * .6; g2 = 78 + v * 44 + elev; b = 36 + v * 16 + elev * .4; break;
      case FIRE: { const k = age[i] / 5; r = 255; g2 = 235 - k * 150 + v * 20; b = 120 - k * 110; break; }
      case ASH: r = 30 + v * 14; g2 = 26 + v * 10; b = 28 + v * 10; break;
      case BREAK: r = 150 + v * 20; g2 = 120 + v * 16; b = 84; break;
      case HOUSE: r = 240; g2 = 240; b = 235; break;
      case WATER: r = 52; g2 = 120 + v * 20; b = 190; break;
      default: r = 74 + v * 14 + elev; g2 = 88 + v * 12 + elev; b = 46 + elev * .5;        // open grassy ground
    }
    if (s[i] !== FIRE && s[i] !== HOUSE) { r += lightSlope; g2 += lightSlope; b += lightSlope; }
    px[j] = r; px[j + 1] = g2; px[j + 2] = b; px[j + 3] = 255;
  }
  ictx.putImageData(idata, 0, 0);
}
function draw() {
  paint(); const c = cv.ctx, sc = Math.min(cv.w / GW, cv.h / GH), ox = (cv.w - GW * sc) / 2, oy = (cv.h - GH * sc) / 2; vr = { s: sc, ox, oy };
  c.fillStyle = "#05070c"; c.fillRect(0, 0, cv.w, cv.h); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(img, ox, oy, GW * sc, GH * sc);
  // glow over the fire front
  c.globalCompositeOperation = "lighter"; const B = land.burning, stepB = Math.max(1, Math.floor(B.length / 500));
  for (let k = 0; k < B.length; k += stepB) { const i = B[k], x = ox + (i % GW + .5) * sc, y = oy + ((i / GW | 0) + .5) * sc, rr = sc * 4.5; const gr = c.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,150,40,.34)"); gr.addColorStop(1, "rgba(255,80,0,0)"); c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    if (ui.playing && Math.random() < 0.05 * stepB) smoke.push({ x, y, t: 1, r: sc * (2 + Math.random() * 3) }); }
  c.globalCompositeOperation = "source-over";
  for (const sp of land.sparks) { const t = Math.min(1, sp.t), x = ox + (sp.x0 + (sp.x1 - sp.x0) * t + .5) * sc, y = oy + (sp.y0 + (sp.y1 - sp.y0) * t + .5) * sc - Math.sin(t * Math.PI) * 14; c.fillStyle = "#ffe9a8"; c.beginPath(); c.arc(x, y, 2.2, 0, 6.3); c.fill(); }
  // smoke drifts with the wind
  const wx = Math.cos(land.o.windDir) * land.o.wind, wy = Math.sin(land.o.windDir) * land.o.wind; if (smoke.length > 500) smoke.splice(0, smoke.length - 500);
  smoke = smoke.filter(q => q.t > 0); for (const q of smoke) { if (ui.playing) { q.x += wx * 2.2 + .15; q.y += wy * 2.2 - .35; q.t -= 0.012; q.r *= 1.012; } c.fillStyle = `rgba(150,150,160,${q.t * .07})`; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.3); c.fill(); }
  // wind compass
  const cx = ox + 54, cy = oy + 54; c.fillStyle = "rgba(8,14,26,.72)"; c.strokeStyle = "#2b3a5c"; c.beginPath(); c.arc(cx, cy, 38, 0, 6.3); c.fill(); c.stroke();
  c.fillStyle = "#8fa0bf"; c.font = "10px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("N", cx, cy - 26); c.fillText("WIND", cx, cy + 33);
  if (land.o.wind > 0 && !land.o.pure) { const a = land.o.windDir, len = 8 + land.o.wind * 11; c.save(); c.translate(cx, cy); c.rotate(a); c.strokeStyle = "#5ad1ff"; c.fillStyle = "#5ad1ff"; c.lineWidth = 3; c.beginPath(); c.moveTo(-len, 0); c.lineTo(len - 4, 0); c.stroke(); c.beginPath(); c.moveTo(len + 3, 0); c.lineTo(len - 6, -6); c.lineTo(len - 6, 6); c.fill(); c.restore(); } else { c.fillStyle = "#5ad1ff"; c.fillText(land.o.pure ? "ignored" : "calm", cx, cy + 4); }
  ui.hud(budget > 0 || land.houses + land.housesLost > 0 ? `<b>Firebreak left: ${Math.max(0, budget)} cells</b><br>houses standing: ${land.houses}` : `${(land.fracBurnt() * 100).toFixed(0)}% of trees burnt`);
}
// ---- Pointer tools ----
const toGrid = p => ({ x: Math.floor((p.x - vr.ox) / vr.s), y: Math.floor((p.y - vr.oy) / vr.s) });
function apply(q, first) {
  const inb = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH, around = (rad, fn) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + 1 && inb(q.x + dx, q.y + dy)) fn(q.x + dx + (q.y + dy) * GW); };
  if (tool === "ignite" && first) { around(1, i => land.ignite(i % GW, i / GW | 0)); }
  if (tool === "break") around(1, i => { if (land.s[i] === TREE || land.s[i] === EMPTY) { if (budget > 0 || land.houses + land.housesLost === 0) { if (land.houses + land.housesLost > 0) budget--; setCell(i, BREAK); } } });
  if (tool === "water" && first) around(5, i => { if (land.s[i] === FIRE) { land.s[i] = WATER; land.fuel--; } else if (land.s[i] === TREE) setCell(i, WATER); land.burning = land.burning.filter(k => land.s[k] === FIRE); });
  if (tool === "plant") around(3, i => { if (land.s[i] !== FIRE && land.s[i] !== HOUSE && land.r() < .7) setCell(i, TREE); });
  if (tool === "house" && first) around(1, i => { if (land.s[i] !== FIRE) setCell(i, HOUSE); });
}
K.pointer(cv.el, {
  down(p) { const q = toGrid(p); lastPt = q; apply(q, true); },
  drag(p) { const q = toGrid(p), n = Math.max(1, Math.abs(q.x - lastPt.x), Math.abs(q.y - lastPt.y)); for (let k = 1; k <= n; k++) apply({ x: Math.round(lastPt.x + (q.x - lastPt.x) * k / n), y: Math.round(lastPt.y + (q.y - lastPt.y) * k / n) }, false); lastPt = q; },
});
cv.el.style.cursor = "crosshair";
const chA = K.chart(ui.dock, { title: "Area burnt", xLabel: "time (steps ≈ minutes)", yLabel: "% of trees", yMin: 0 });
const chF = K.chart(ui.dock, { title: "Size of the fire front", xLabel: "time (steps ≈ minutes)", yLabel: "cells on fire", yMin: 0 });
let frame = 0, tick = 0;
ui.run(() => {
  if (land.done()) return; tick += speed / 8;
  while (tick >= 1) { tick--; land.step(); hist.push([land.t, land.fracBurnt() * 100, land.burning.length]); if (hist.length > 1500) hist.shift(); }
}, () => {
  draw(); if (frame++ % 4) return;
  chA.draw([{ pts: hist.map(p => [p[0], p[1]]), type: "area", color: "#ff7b54" }]); chF.draw([{ pts: hist.map(p => [p[0], p[2]]), color: "#ffb454" }]);
  read.set("burnt", (land.fracBurnt() * 100).toFixed(1) + "%"); read.set("front", land.burning.length); read.set("time", land.t + " min"); read.set("houses", land.housesLost ? `<span style="color:var(--bad)">${Math.ceil(land.housesLost / 4)}</span>` : "0");
});
newLand(); setTimeout(() => { land.ignite(40, 56); land.ignite(41, 56); land.ignite(40, 57); }, 500);
ui.tip("Click anywhere in the forest to start another fire · change the wind while it burns");
