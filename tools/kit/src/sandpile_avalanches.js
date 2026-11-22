/* =====================================================================
   SANDPILE AVALANCHES
   Drop grains of sand one at a time onto a table. The pile grows steeper
   until a grain sets off a slide; most slides are tiny, a few are huge.
   In 1987 Bak, Tang and Wiesenfeld made the simplest model of this:

     every square of a grid holds 0, 1, 2 or 3 grains.
     Add a grain to a random square. If a square reaches 4 grains it
     TOPPLES: it loses 4, and each of its four neighbours gains 1.
     That can make neighbours reach 4, and they topple too: an avalanche.
     Grains that topple off the edge of the table are lost.

   Nobody tunes anything, yet the pile organises itself into a CRITICAL
   state where avalanches of every size happen, from 1 toppling to the
   whole table, with a POWER LAW: P(s) ∝ s^(−τ). On a log–log graph that
   is a straight line. This is "self-organised criticality", suggested as
   the reason for power laws in earthquakes, forest fires and extinctions.

   The second view is a falling-sand hourglass: each grain falls, or slides
   diagonally if blocked, so heaps form at a fixed angle of repose. Coarse
   grains roll further than fine ones, so a poured mixture separates.
   ===================================================================== */
"use strict";
// ---------------- The Bak–Tang–Wiesenfeld sandpile ----------------
class Pile {
  constructor(L) { this.L = L; this.z = new Uint8Array(L * L); this.stack = new Int32Array(L * L * 4); this.hot = new Float32Array(L * L); this.grains = 0; this.lost = 0; }
  // add one grain at square i and let it relax; returns the avalanche size (number of topplings)
  add(i, mark) {
    const { z, L, stack, hot } = this; z[i]++; this.grains++; if (z[i] < 4) return 0;
    let s = 0, top = 0; stack[top++] = i;
    while (top) {
      const c = stack[--top]; if (z[c] < 4) continue; const k = z[c] >> 2; z[c] -= 4 * k; s += k; if (mark) hot[c] = 1;   // topple (k times at once if it has 8, 12… grains)
      const x = c % L, y = (c / L) | 0;
      if (x > 0) { z[c - 1] += k; if (z[c - 1] >= 4) stack[top++] = c - 1; } else this.lost += k;
      if (x < L - 1) { z[c + 1] += k; if (z[c + 1] >= 4) stack[top++] = c + 1; } else this.lost += k;
      if (y > 0) { z[c - L] += k; if (z[c - L] >= 4) stack[top++] = c - L; } else this.lost += k;
      if (y < L - 1) { z[c + L] += k; if (z[c + L] >= 4) stack[top++] = c + L; } else this.lost += k;
    }
    return s;
  }
  // a heap of n grains all on the middle square at once, then relaxed (the famous sandpile fractal)
  addMany(i, n) { this.z[i] = Math.min(250, this.z[i]); let left = n; while (left > 0) { const k = Math.min(left, 200); this.z[i] += k - 1; left -= k; this.add(i); } }
  mean() { let h = 0; for (const v of this.z) h += v; return h / this.z.length; }
}
// exact mean avalanche size for random drops on an L × L table (Dhar 1990): the average over squares of the expected number of topplings,
// (1/N) Σ G(i, j) with G the inverse of the toppling matrix, worked out from its sine eigenvectors
function exactMeanSize(L) { const c = []; for (let m = 1; m <= L; m++) { let s = 0; for (let i = 1; i <= L; i++) s += Math.sin(m * Math.PI * i / (L + 1)); c.push(s * Math.sqrt(2 / (L + 1))); }
  let tot = 0; for (let m = 1; m <= L; m++) for (let n = 1; n <= L; n++) tot += (c[m - 1] * c[n - 1]) ** 2 / (4 - 2 * Math.cos(m * Math.PI / (L + 1)) - 2 * Math.cos(n * Math.PI / (L + 1))); return tot / (L * L); }
// fill to the critical state, then record avalanches
function critical(L, rand) { const p = new Pile(L); for (let k = 0; k < 3 * L * L; k++) p.add(rand() * L * L | 0); return p; }
// power-law exponent from a log-binned histogram (bins doubling in size), fitted between s = 2 and s = L²/20
function tauFit(sizes, L) { const bins = new Map(); let N = 0; for (const s of sizes) if (s > 0) { N++; const b = Math.floor(Math.log2(s)); bins.set(b, (bins.get(b) || 0) + 1); }
  const pts = []; for (const [b, n] of bins) { const s = 1.5 * 2 ** b; if (s >= 2 && s <= L * L / 20) pts.push([Math.log(s), Math.log(n / 2 ** b / N)]); } return pts.length > 2 ? -K.linfit(pts).m : NaN; }

// ---------------- Falling sand (the hourglass) ----------------
// cells: 0 empty, 1 wall, 2 fine sand, 3 coarse grains. Each step, from the bottom row up, a grain falls straight down if it can,
// otherwise slides diagonally down; a coarse grain on a slope may also roll sideways (it is rounder and bigger, so it keeps going).
class Sand {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Uint8Array(w * h); this.flow = 0; this.t = 0; this.neck = null; this.roll = 0.5; }
  step(rand) {
    const { w, h, c } = this; let dir = this.t & 1 ? 1 : -1; this.t++;
    for (let y = h - 2; y >= 0; y--) {
      for (let k = 0; k < w; k++) { const x = dir > 0 ? k : w - 1 - k, i = x + y * w, g = c[i]; if (g < 2) continue;
        const below = i + w;
        if (c[below] === 0) { c[below] = g; c[i] = 0; if (this.neck && y === this.neck) this.flow++; continue; }
        const d = rand() < 0.5 ? -1 : 1;
        for (const s of [d, -d]) { const nx = x + s; if (nx < 0 || nx >= w) continue; if (c[below + s] === 0 && c[i + s] === 0) { c[below + s] = g; c[i] = 0; if (this.neck && y === this.neck) this.flow++; break; } }
        if (c[i] === g && g === 3 && rand() < this.roll) { const nx = x + d; if (nx > 0 && nx < w - 1 && c[i + d] === 0 && c[below + d] !== 0 && c[below + 2 * d] === 0 && c[i + 2 * d] === 0) { c[i + d] = g; c[i] = 0; } }   // a coarse grain rolls on
      }
    }
  }
}

if (typeof module !== "undefined") module.exports = { Pile, exactMeanSize, critical, tauFit, Sand };
else page();
function page() {
let view2 = "pile", L = 128, pile = new Pile(L), drop = "random", rate = 200, acc = 0, sizes = [], last = 0, biggest = 0, hgSand = null, hgW = 320, hgH = 180, pourMix = 0.5, flowLog = [], pourAt = null;
const ui = K.app({
  title: "Sandpile Avalanches", subject: "Physics",
  blurb: "One grain at a time: avalanches of every size, with nobody tuning anything",
  reset: () => { setView("pile"); newPile(L); },
  missions: [
    { title: "Build up to the edge", q: "Start with an empty table and drop grains at random. Watch the mean height and the avalanche sizes. When do the big avalanches start? What happens to the mean height after that?", hint: "At first nothing topples. As the table fills, small avalanches start, then bigger ones, until avalanches as wide as the table appear. From then on the mean height stays near 2.1 grains a square (the exact value for an infinite table is 17/8 = 2.125): the pile has organised itself to the critical state, with no-one adjusting anything.", setup() { setView("pile"); newPile(128); drop = "random"; ctl.drop.set("random"); } },
    { title: "A straight line on a log–log graph", q: "Let thousands of avalanches build up the histogram (below). Why is it plotted with log scales? What does a straight line mean?", hint: "A straight line on log–log axes is a power law: P(s) ∝ s^(−τ). Doubling the size always makes an avalanche the same factor rarer, whatever the size: there is no 'typical' avalanche. The fitted τ is about 1.1 here. The line bends down at the end because no avalanche can be bigger than the table allows.", setup() { setView("pile"); newPile(128, true); } },
    { title: "All in one place", q: "Choose 'Drop at the centre' and let thousands of grains pile up on one square. What shape grows?", hint: "An intricate, symmetric fractal pattern (the 'identity' patterns of the abelian sandpile are cousins of it). Remarkably, the final picture does not depend on the order in which squares topple (the sandpile is 'abelian'), so the same pattern always grows.", setup() { setView("pile"); newPile(256); drop = "centre"; ctl.drop.set("centre"); ctl.rate.set(2000, true); } },
    { title: "Where do avalanches start?", q: "Switch on 'Show toppled squares'. Watch the shapes of big avalanches. Are they solid blobs or full of holes?", hint: "Big avalanches are solid in the middle with ragged, fractal edges, and some squares inside topple several times. Their shape depends on the exact pattern of 2s and 3s already in the pile: a tiny change can turn a small avalanche into a huge one.", setup() { setView("pile"); newPile(128, true); ctl.hot.set(true, true); ctl.rate.set(20, true); } },
    { title: "The hourglass", q: "Switch to the hourglass. Does the sand flow steadily? Pour a 50:50 mix of fine and coarse grains with the mouse: where do the coarse grains end up?", hint: "The flow through the neck is close to steady whatever the height of sand above it (unlike water, which slows as the level falls), because the grains arch over and take the weight. Coarse grains roll further down the heap's slopes, so they collect at the edges and bottom: the mixture separates (segregation), as in cereal packets and gravel heaps.", setup() { setView("hourglass"); } },
    { title: "Angle of repose", q: "In the hourglass view, pour sand onto the floor in one spot. What angle does the heap make? Does it get steeper as you keep pouring?", hint: "It grows at a fixed angle: grains slide down until the slope is just shallow enough to stop them. In this cell model the angle is 45°, because a grain can only slide diagonally; real dry sand rests at about 30–35°. The slope stays the same as the heap grows: like the sandpile above, the heap keeps itself on the edge of sliding.", setup() { setView("hourglass"); emptyBox(); } }
  ],
  batch: [
    { title: "The power law: τ against table size", question: "What is the exponent τ of the avalanche-size distribution P(s) ∝ s^(−τ), and does it depend on the size of the table?", how: "Each run: fill an L × L table to the critical state (3L² grains), record 20 000 avalanches, and fit a straight line to the log-binned histogram for s from 2 to L²/20.", xLabel: "table size L", yLabel: "fitted exponent τ", xs: [16, 32, 64, 128], reps: 4, yMin: 0.8, yMax: 1.5, run(x, r) { const p = critical(x, r), s = []; for (let k = 0; k < 20000; k++) s.push(p.add(r() * x * x | 0)); return tauFit(s, x); }, note: "The fitted τ comes out at about 1.07–1.08 for every size: the same power law, whatever the table, which is what 'critical' means. A simple straight-line fit is biased by the bend at the largest sizes; studies that allow for the edges of the table and use far bigger tables find values of about 1.1 to 1.3." },
    { title: "Mean height of the critical pile", question: "Once it has organised itself, how many grains does an average square hold?", how: "Each run: fill an L × L table to the critical state (3L² grains), then drop 20 000 more and take the mean height.", xLabel: "table size L", yLabel: "mean grains per square", xs: [8, 16, 32, 64, 128], reps: 4, theory: () => 2.125, theoryLabel: "infinite table: 17/8", run(x, r) { const p = critical(x, r); for (let k = 0; k < 20000; k++) p.add(r() * x * x | 0); return p.mean(); }, note: "Small tables sit a little below 2.125 because grains near the edge are easily lost; the mean climbs towards 17/8 = 2.125 (worked out exactly by Priezzhev in 1994) as the table grows. Nothing sets this number from outside: the pile finds it." },
    { title: "Mean avalanche size", question: "How does the average avalanche size depend on the size of the table?", how: "Each run: fill an L × L table to the critical state, then average the size (number of topplings) of 20 000 avalanches.", xLabel: "table size L", yLabel: "mean avalanche size", xs: [8, 16, 32, 48, 64, 96, 128], reps: 3, yMin: 0, theory: L => exactMeanSize(L), theoryLabel: "exact (Dhar 1990)", run(x, r) { const p = critical(x, r); let S = 0; for (let k = 0; k < 20000; k++) S += p.add(r() * x * x | 0); return S / 20000; }, note: "The mean is known exactly (Dhar 1990): it is the average number of times a grain added at random must topple on its way off the table, which grows roughly as L². The simulation matches it to within the scatter. This is unusual: for most critical systems nothing is known exactly." },
    { title: "Hourglass: flow and the neck", question: "How fast does sand flow through the neck of the hourglass, for different neck widths?", how: "Each run: a 120 × 160 hourglass full of fine sand, a neck of the width shown; the grains crossing the neck in steps 200–1200 are counted.", xLabel: "neck width (cells)", yLabel: "grains through the neck per step", xs: [2, 4, 6, 8, 10, 14], reps: 3, yMin: 0, run(x, r) { const s = hourglass(120, 160, x, r, 0); for (let k = 0; k < 200; k++) s.step(r); s.flow = 0; for (let k = 0; k < 1000; k++) s.step(r); return s.flow / 1000; }, note: "Wider necks pass more grains a step. In this cell model the flow grows about in proportion to the width (each column of the neck feeds grains at a steady rate). Real hourglasses follow Beverloo's law, flow ∝ (D − kd)^(3/2) in 3D, because grains arch over the opening; the cell model has no forces, so it cannot arch." }
  ],
  notes: `<h3>What is being modelled</h3>
<ul><li><b>The sandpile</b> (Bak, Tang and Wiesenfeld, 1987). An L × L table of squares holding 0–3 grains. A grain is added (at random, at the centre, or where you click). A square with 4 or more grains topples: it loses 4 and each neighbour gains 1; grains toppled over the edge are lost. Topplings continue until every square has fewer than 4. The avalanche size is the number of topplings. Grains are added only when the last avalanche has finished.</li>
<li><b>Colours:</b> dark (0 grains) to bright (3 grains), with a glow on squares that toppled recently.</li>
<li><b>The histogram</b> uses bins that double in width (1, 2–3, 4–7, …), divided by their widths, on log–log axes; a straight-line fit gives τ.</li>
<li><b>The hourglass</b> is a "falling sand" cellular automaton: each grain falls straight down if it can, otherwise slides one cell diagonally down; coarse grains may also roll one cell sideways on a slope. Grains are counted as they cross the neck.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Real sand has friction, inertia and grains of many shapes; real sandpiles show smaller, more regular avalanches than this model (rice piles come closer). The model is an idealisation that captures the "critical" behaviour.</li>
<li>The table is small (up to 512 × 512) and its edges limit the largest avalanches, so the power law bends at the top end.</li>
<li>The hourglass has no forces at all: no arching over the neck, no air, no bouncing. Its angle of repose is fixed at 45° by the grid.</li></ul>
<p>See also <a href="../../climate/tectonic_hazards/tectonic-hazards.html">Tectonic Hazards</a> (earthquakes follow a similar power law, the Gutenberg–Richter law) and <a href="../../climate/forest_fire/forest-fire.html">Wildfire</a>.</p>`
});
function hourglass(w, h, neck, rand, coarse) {
  const s = new Sand(w, h), cx = w / 2, mid = Math.round(h / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = x + y * w, dy = Math.abs(y - mid), half = neck / 2 + dy * (w / 2 - neck / 2 - 2) / (h / 2);   // two triangles meeting at the neck
    if (Math.abs(x - cx + 0.5) > half || x === 0 || x === w - 1 || y === h - 1 || y === 0) s.c[i] = 1;
    else if (y < mid - 4 && y > h * 0.08) s.c[i] = rand() < coarse ? 3 : 2; }
  s.neck = mid; return s;
}

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: view2, options: [["pile", "Sandpile (avalanches)"], ["hourglass", "Hourglass (falling sand)"]], on: v => setView(v) });
const gp = ui.group("The sandpile");
ctl.L = K.seg(gp, { label: "Table", value: L, options: [[32, "32 × 32"], [64, "64 × 64"], [128, "128 × 128"], [256, "256 × 256"], [512, "512 × 512"]], on: v => newPile(v) });
ctl.drop = K.seg(gp, { label: "Drop grains", value: drop, options: [["random", "at random"], ["centre", "at the centre"], ["mouse", "where I click"]], on: v => drop = v });
ctl.rate = K.slider(gp, { label: "Speed (grains a second)", min: 1, max: 5000, step: 1, value: rate, fmt: v => v, on: v => rate = v }); ui.headerSpeed(ctl.rate, { label: "Grains/s" });
ctl.hot = K.toggle(gp, { label: "Show toppled squares", value: true });
let r1 = K.row(gp); K.btn(r1, "Empty table", () => newPile(L), "primary"); K.btn(r1, "⚡ Jump to critical", () => newPile(L, true)).title = "Fill the table to the critical state straight away"; K.btn(r1, "100 000 at the centre", () => { pile.addMany((L / 2 | 0) * (L + 1), 100000); });
const gh = ui.group("The hourglass");
ctl.mix = K.slider(gh, { label: "Coarse grains in the mix", min: 0, max: 1, step: 0.05, value: pourMix, fmt: v => (v * 100).toFixed(0) + "%", on: v => pourMix = v });
ctl.roll = K.slider(gh, { label: "How far coarse grains roll", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%", on: v => { if (hgSand) hgSand.roll = v; } });
ctl.neck = K.slider(gh, { label: "Neck width", min: 2, max: 30, step: 1, value: 8, fmt: v => v + " cells", on: () => newHourglass() });
r1 = K.row(gh); K.btn(r1, "⏳ Turn it over", () => flip(), "primary"); K.btn(r1, "Refill", () => newHourglass()); K.btn(r1, "Empty box", () => emptyBox());
K.note(gh, "Drag on the picture to pour sand (with the coarse share above).");
g = ui.group("Readings");
r1 = K.row(g); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("sandpile", view, cv));
const read = K.readout(g, [["grains", "grains dropped"], ["mean", "mean grains per square"], ["last", "last avalanche"], ["big", "biggest so far"], ["tau", "fitted τ"], ["flow", "hourglass flow"]]);
function setView(v) { view2 = v; ctl.view.set(v); gp.style.display = v === "pile" ? "" : "none"; gh.style.display = v === "hourglass" ? "" : "none"; if (v === "hourglass" && !hgSand) newHourglass(); }
function newPile(n, crit) { L = n; ctl.L.set(n); pile = crit ? critical(n, Math.random) : new Pile(n); sizes = []; biggest = 0; last = 0; makeTex(); }
function newHourglass() { hgSand = hourglass(hgW, hgH, ctl.neck.value, Math.random, pourMix); hgSand.roll = ctl.roll.value; flowLog = []; }
function emptyBox() { hgSand = new Sand(hgW, hgH); hgSand.roll = ctl.roll.value; for (let x = 0; x < hgW; x++) { hgSand.c[x + (hgH - 1) * hgW] = 1; } for (let y = 0; y < hgH; y++) { hgSand.c[y * hgW] = 1; hgSand.c[hgW - 1 + y * hgW] = 1; } flowLog = []; }
function flip() { const s = hgSand, c = s.c, n = c.length; for (let i = 0; i < n / 2; i++) { const j = n - 1 - i, t = c[i]; c[i] = c[j]; c[j] = t; } flowLog = []; }

// ---------------- The graphics card ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.5 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, tex, texData, prPile, prSand, sandTex, sandData;
if (ok) {
  quad = K.gl.quad(gl);
  // the pile: R = grains (0–3) / 3, G = recent toppling glow
  prPile = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uT; uniform vec2 uCanvas, uOff; uniform float uScale, uL, uHot;
    void main() {
      vec2 px = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y), q = (px - uOff) / uScale;
      if (q.x < 0.0 || q.y < 0.0 || q.x >= uL || q.y >= uL) { gl_FragColor = vec4(0.02, 0.022, 0.035, 1.0); return; }
      vec4 t = texture2D(uT, q / uL); float h = t.r * 3.0;
      vec3 c = h < 0.5 ? vec3(0.03, 0.04, 0.09) : h < 1.5 ? vec3(0.22, 0.13, 0.35) : h < 2.5 ? vec3(0.78, 0.38, 0.18) : vec3(1.0, 0.82, 0.42);
      // a little light from the top left, from the slope between neighbouring squares
      float e = 1.0 / uL, dx = texture2D(uT, (q + vec2(1.0, 0.0)) / uL).r - texture2D(uT, (q - vec2(1.0, 0.0)) / uL).r, dy = texture2D(uT, (q + vec2(0.0, 1.0)) / uL).r - texture2D(uT, (q - vec2(0.0, 1.0)) / uL).r;
      c *= 0.92 + 0.25 * (-dx - dy);
      c += uHot * t.g * vec3(0.4, 0.9, 1.0) * 0.9;
      if (uScale > 6.0) { vec2 f = fract(q); if (min(f.x, f.y) < 1.2 / uScale) c *= 0.75; }
      gl_FragColor = vec4(c, 1.0);
    }`);
  // the hourglass: R = what is in the cell (0 empty, 1 wall, 2 fine, 3 coarse) / 3
  prSand = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uT; uniform vec2 uCanvas, uOff, uGrid; uniform float uScale;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main() {
      vec2 px = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y), q = (px - uOff) / uScale;
      if (q.x < 0.0 || q.y < 0.0 || q.x >= uGrid.x || q.y >= uGrid.y) { gl_FragColor = vec4(0.02, 0.022, 0.035, 1.0); return; }
      float k = floor(texture2D(uT, (floor(q) + 0.5) / uGrid).r * 3.0 + 0.5), n = hash(floor(q));
      vec3 c = mix(vec3(0.05, 0.06, 0.11), vec3(0.09, 0.1, 0.17), q.y / uGrid.y);
      if (k == 1.0) c = vec3(0.55, 0.75, 0.85) * (0.35 + 0.1 * n);                      // glass
      if (k == 2.0) c = mix(vec3(0.93, 0.78, 0.45), vec3(0.98, 0.88, 0.6), n);          // fine sand
      if (k == 3.0) c = mix(vec3(0.42, 0.26, 0.16), vec3(0.6, 0.38, 0.22), n);          // coarse grains
      gl_FragColor = vec4(c, 1.0);
    }`);
}
function makeTex() { if (!ok) return; if (tex) tex.dispose(); tex = K.gl.target(gl, L, L, {}); texData = new Uint8Array(4 * L * L); }

// ---------------- Mouse ----------------
const fitPile = () => { const s = Math.min(cv.w, cv.h) / L; return { s, ox: (cv.w - L * s) / 2, oy: (cv.h - L * s) / 2 }; };
const fitSand = () => { const s = Math.min(cv.w / hgW, cv.h / hgH); return { s, ox: (cv.w - hgW * s) / 2, oy: (cv.h - hgH * s) / 2 }; };
K.pointer(cv.el, {
  down(p) { if (view2 === "pile" && drop === "mouse") { const f = fitPile(), x = Math.floor((p.x - f.ox) / f.s), y = Math.floor((p.y - f.oy) / f.s); if (x >= 0 && y >= 0 && x < L && y < L) record(pile.add(x + y * L, true)); } else if (view2 === "hourglass") pourAt = p; },
  drag(p) { if (view2 === "hourglass") pourAt = p; }, up() { pourAt = null; }
});
function record(s) { if (s > 0) { sizes.push(s); if (sizes.length > 200000) sizes.splice(0, 50000); } last = s; if (s > biggest) biggest = s; }

// ---------------- Drawing ----------------
function draw() {
  const c = cv.ctx; c.clearRect(0, 0, cv.w, cv.h); if (!ok) return; const d = view.dpr; K.gl.bindTarget(gl, null);
  if (view2 === "pile") {
    const z = pile.z, hot = pile.hot; for (let i = 0; i < L * L; i++) { texData[4 * i] = z[i] * 85; texData[4 * i + 1] = hot[i] * 255; hot[i] *= 0.9; }
    tex.upload(texData); const f = fitPile(); prPile.set({ uT: tex, uCanvas: [view.el.width, view.el.height], uOff: [f.ox * d, f.oy * d], uScale: f.s * d, uL: L, uHot: ctl.hot.value ? 1 : 0 }); quad.draw(prPile);
  } else {
    const s = hgSand; if (!sandTex || sandTex.w !== hgW) { sandTex = K.gl.target(gl, hgW, hgH, {}); sandData = new Uint8Array(4 * hgW * hgH); }
    for (let i = 0; i < s.c.length; i++) sandData[4 * i] = s.c[i] * 85; sandTex.upload(sandData); const f = fitSand();
    prSand.set({ uT: sandTex, uCanvas: [view.el.width, view.el.height], uOff: [f.ox * d, f.oy * d], uGrid: [hgW, hgH], uScale: f.s * d }); quad.draw(prSand);
  }
}
const chH = K.chart(ui.dock, { title: "Avalanche sizes (log–log)", xLabel: "log₁₀ size s", yLabel: "log₁₀ P(s)" });
const chT = K.chart(ui.dock, { title: "Recent avalanches", xLabel: "grain", yLabel: "size (topplings)", yMin: 0 });
function histogram() {
  const bins = new Map(); let N = 0; for (const s of sizes) { N++; const b = Math.floor(Math.log2(s)); bins.set(b, (bins.get(b) || 0) + 1); }
  const pts = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([b, n]) => [Math.log10(1.5 * 2 ** b), Math.log10(n / 2 ** b / N)]);
  const tau = sizes.length > 500 ? tauFit(sizes, L) : NaN, series = [{ pts, type: "dots", color: K.cssVar("--s1"), r: 4, label: "simulation" }];
  if (isFinite(tau) && pts.length > 2) { const fitPts = pts.filter(p => p[0] >= Math.log10(2) && p[0] <= Math.log10(L * L / 20)); if (fitPts.length > 1) { const f = K.linfit(fitPts), a = pts[0][0], b = pts[pts.length - 1][0]; series.push({ pts: [[a, f.m * a + f.c], [b, f.m * b + f.c]], color: K.cssVar("--s0"), dash: [6, 4], label: "power law, τ = " + tau.toFixed(2) }); } }
  chH.draw(series, {}); return tau;
}

// ---------------- The loop ----------------
newPile(L, false); setView("pile");
let fr = 0, recent = [];
ui.run(dt => {
  if (view2 === "pile") { if (drop === "mouse") return; acc += rate * dt; let n = 0; const t0 = performance.now();
    while (acc >= 1 && performance.now() - t0 < 14) { const i = drop === "centre" ? (L / 2 | 0) * (L + 1) : Math.random() * L * L | 0; const s = pile.add(i, true); record(s); recent.push([pile.grains, s]); acc--; n++; }
    if (acc > 50) acc = 0; if (recent.length > 400) recent.splice(0, recent.length - 400); }
  else { const s = hgSand; if (pourAt) { const f = fitSand(), x = Math.floor((pourAt.x - f.ox) / f.s), y = Math.floor((pourAt.y - f.oy) / f.s);
      for (let k = 0; k < 6; k++) { const xx = x + Math.round((Math.random() - 0.5) * 6), yy = y + Math.round((Math.random() - 0.5) * 4); if (xx > 0 && yy > 0 && xx < hgW - 1 && yy < hgH - 1 && !s.c[xx + yy * hgW]) s.c[xx + yy * hgW] = Math.random() < pourMix ? 3 : 2; } }
    for (let k = 0; k < 2; k++) s.step(Math.random); }
}, () => {
  draw(); if (fr++ % 8) return;
  if (view2 === "pile") { const tau = histogram(); chT.draw([{ pts: recent, type: "bars", w: 1, color: K.cssVar("--s2") }], {});
    read.set("grains", pile.grains.toLocaleString()); read.set("mean", pile.mean().toFixed(3)); read.set("last", last + " topplings"); read.set("big", biggest.toLocaleString()); read.set("tau", isFinite(tau) ? tau.toFixed(2) : "–"); read.set("flow", "–");
    ui.hud(`<b style="font-size:15px">${L} × ${L} sandpile</b><br>${pile.grains.toLocaleString()} grains · mean height ${pile.mean().toFixed(2)}`); }
  else { const s = hgSand; flowLog.push([s.t, s.flow]); if (flowLog.length > 300) flowLog.shift(); const k = flowLog.length > 10 ? (flowLog[flowLog.length - 1][1] - flowLog[flowLog.length - 11][1]) / (flowLog[flowLog.length - 1][0] - flowLog[flowLog.length - 11][0] || 1) : 0;
    read.set("flow", k.toFixed(2) + " grains a step"); chT.draw([{ pts: flowLog, color: K.cssVar("--s2") }], { title: "Grains through the neck", xLabel: "step", yLabel: "grains" });
    ui.hud(`<b style="font-size:15px">Hourglass</b><br>${k.toFixed(2)} grains a step through the neck`); }
});
window.sandTest = { newPile, setView, run(n) { for (let k = 0; k < n; k++) record(pile.add(Math.random() * L * L | 0, true)); histogram(); return pile.mean(); }, emptyBox, steps(n) { for (let k = 0; k < n; k++) hgSand.step(Math.random); } };
ui.tip("Each square holds 0–3 grains; at 4 it topples, giving one to each neighbour · watch the log–log chart build a straight line", 8000);
}
