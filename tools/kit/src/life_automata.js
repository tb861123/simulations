/* =====================================================================
   LIFE AND CELLULAR AUTOMATA
   A grid of cells, each alive or dead. Every generation, every cell looks
   at its eight neighbours and follows the same rule. In John Conway's
   Game of Life (1970):
       a dead cell with exactly 3 live neighbours is BORN
       a live cell with 2 or 3 live neighbours SURVIVES; otherwise it dies
   written "B3/S23". From that, gliders crawl, guns fire, and random soup
   burns down to a scattering of still lifes and blinkers. Other "life-like"
   rules (HighLife, Seeds, Day and Night…) change only the B and S lists.

   Wolfram's one-dimensional ("elementary") automata are simpler still:
   a row of cells, each looking at itself and its two neighbours. The 8
   possible patterns of three cells each give a new cell, so a rule is 8
   bits: a number from 0 to 255. Each new row is drawn below the last, so
   time runs down the screen.

   The big grids are stepped by the graphics card, a whole generation at
   once. The Batch run uses the main processor on smaller grids.
   ===================================================================== */
"use strict";
// ---------------- Rules ----------------
// "B3/S23" → { b: [false,false,false,true,…], s: [...] }  (index = number of live neighbours, 0–8)
function parseRule(str) {
  const m = /^\s*B([0-8]*)\s*\/\s*S([0-8]*)\s*$/i.exec(str); if (!m) return null;
  const b = Array(9).fill(false), s = Array(9).fill(false); for (const c of m[1]) b[+c] = true; for (const c of m[2]) s[+c] = true; return { b, s, text: `B${m[1]}/S${m[2]}` };
}
const RULES = [["Life", "B3/S23"], ["HighLife", "B36/S23"], ["Seeds", "B2/S"], ["Day & Night", "B3678/S34678"], ["Maze", "B3/S12345"], ["Replicator", "B1357/S1357"], ["Anneal", "B4678/S35678"], ["Life without death", "B3/S012345678"]];
// ---------------- Patterns (run-length encoded, as in the LifeWiki: b = dead, o = alive, $ = new row, numbers repeat) ----------------
const PATTERNS = {
  glider: ["Glider", "bob$2bo$3o!"], lwss: ["Lightweight spaceship", "bo2bo$o4b$o3bo$4o!"], pulsar: ["Pulsar (period 3)", "2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!"],
  penta: ["Pentadecathlon (period 15)", "2bo4bo2b$2ob4ob2o$2bo4bo!"], gun: ["Gosper glider gun", "24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!"],
  rpent: ["R-pentomino", "b2o$2o$bo!"], acorn: ["Acorn", "bo5b$3bo3b$2o2b3o!"], diehard: ["Diehard", "6bob$2o6b$bo3b3o!"],
  replicator: ["HighLife replicator", "2b3o$bo2bo$o3bo$o2bo$3o!"], blinker: ["Blinker", "3o!"]
};
function parseRLE(rle) {
  const cells = []; let x = 0, y = 0, n = "";
  for (const ch of rle) { if (/\d/.test(ch)) { n += ch; continue; } const k = n ? +n : 1; n = "";
    if (ch === "b") x += k; else if (ch === "o") { for (let i = 0; i < k; i++) cells.push([x + i, y]); x += k; } else if (ch === "$") { y += k; x = 0; } else if (ch === "!") break; }
  return cells;
}
// ---------------- One generation on the CPU (for the Batch run): a w × h torus (edges wrap round) ----------------
function lifeStep(a, w, h, rule, out) {
  for (let y = 0; y < h; y++) { const ym = (y + h - 1) % h * w, y0 = y * w, yp = (y + 1) % h * w;
    for (let x = 0; x < w; x++) { const xm = (x + w - 1) % w, xp = (x + 1) % w;
      const n = a[ym + xm] + a[ym + x] + a[ym + xp] + a[y0 + xm] + a[y0 + xp] + a[yp + xm] + a[yp + x] + a[yp + xp];
      out[y0 + x] = a[y0 + x] ? (rule.s[n] ? 1 : 0) : (rule.b[n] ? 1 : 0); } }
}
function soup(w, h, density, rand, box) { const a = new Uint8Array(w * h); const [x0, y0, bw, bh] = box || [0, 0, w, h]; for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) a[x + y * w] = rand() < density ? 1 : 0; return a; }
function runLife(a, w, h, rule, gens, each) { let b = new Uint8Array(w * h); for (let g = 0; g < gens; g++) { lifeStep(a, w, h, rule, b); [a, b] = [b, a]; if (each && each(a, b, g) === false) break; } return a; }
const count = a => { let n = 0; for (let i = 0; i < a.length; i++) n += a[i]; return n; };
// an elementary automaton: one new row from the last (rule = 0–255; the edges wrap round)
function row1D(prev, rule, out) { const n = prev.length; for (let i = 0; i < n; i++) { const k = (prev[(i + n - 1) % n] << 2) | (prev[i] << 1) | prev[(i + 1) % n]; out[i] = (rule >> k) & 1; } }
// a random life-like rule with exactly k of the 18 possible B and S entries switched on (Langton's λ = k / 18), never B0
function randomRule(k, rand) { const slots = []; for (let i = 1; i < 9; i++) slots.push(["b", i]); for (let i = 0; i < 9; i++) slots.push(["s", i]); for (let i = slots.length - 1; i > 0; i--) { const j = rand() * (i + 1) | 0; [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const r = { b: Array(9).fill(false), s: Array(9).fill(false) }; for (const [t, i] of slots.slice(0, Math.min(k, 17))) r[t][i] = true; return r; }

if (typeof module !== "undefined") module.exports = { parseRule, parseRLE, lifeStep, soup, runLife, count, row1D, randomRule, PATTERNS, RULES };
else page();
function page() {
let mode = "2d", rule = parseRule("B3/S23"), ruleName = "Life", rule1 = 110, GW = 1024, GH = 576, gens = 0, rate = 15, acc = 0, zoom = 1, pan = { x: 0, y: 0 }, tool = "draw", stamp = "glider", trails = true, palette = 0, pop = 0, popLog = [], hover = null;
const ui = K.app({
  title: "Life and Cellular Automata", subject: "Explore",
  blurb: "Simple rules, a grid of cells, and endless surprises",
  reset: () => { setMode("2d"); setRule("Life"); fillSoup(0.3); },
  missions: [
    { title: "A gun that fires gliders", q: "Load the Gosper glider gun. It fires a glider every so often. Count: how many generations between gliders? Where do the gliders go?", hint: "One glider every 30 generations, flying off diagonally for ever. Bill Gosper found it in 1970, winning a $50 prize from Conway, who had guessed no pattern could grow without limit. A gun is a pattern whose population grows for ever: the chart climbs in steps.", setup() { setMode("2d"); setRule("Life"); clearGrid(); placePattern("gun", GW / 2 - 40, GH / 2 - 30); zoomTo(7, GW / 2 - 15, GH / 2 - 15); } },
    { title: "Five cells, a thousand generations", q: "Place one R-pentomino (five cells) in an empty grid. How long does it keep changing before it settles? What is left?", hint: "It churns for 1103 generations before settling into still lifes, blinkers and six gliders that fly away. Tiny starts can have very long, unpredictable futures: there is no shortcut, you have to run it to find out.", setup() { setMode("2d"); setRule("Life"); clearGrid(); placePattern("rpent", GW / 2, GH / 2); zoomTo(3, GW / 2, GH / 2); } },
    { title: "Primordial soup", q: "Fill the grid with random cells (30% alive) and run it. What survives when it settles? Look at the shapes that are left.", hint: "Most cells die within a few hundred generations, leaving 'ash': a few percent of the grid alive. The commonest objects are the block (2×2), the beehive and the blinker (period 2); gliders escape from time to time. Old cells are drawn darker, so still lifes stand out.", setup() { setMode("2d"); setRule("Life"); fillSoup(0.3); } },
    { title: "A replicator", q: "Switch to HighLife (B36/S23) and place the replicator. What happens to it? Does the same pattern do this in ordinary Life?", hint: "In HighLife it copies itself again and again, making a growing triangle of replicators. In Life (no birth on 6) the same shape just burns out. One extra number in the rule changes everything.", setup() { setMode("2d"); setRule("HighLife"); clearGrid(); placePattern("replicator", GW / 2, GH / 2); zoomTo(3, GW / 2, GH / 2); } },
    { title: "Day and Night", q: "Day & Night (B3678/S34678) is its own opposite: swap every live cell for dead and every dead for alive, and the rule is unchanged. Start a 50% soup. What do you see?", hint: "Islands of 'day' and lakes of 'night' grow and battle, and either can contain the same objects (there are spaceships in both). Because the rule is symmetric, a live blob in a dead sea behaves exactly like a dead blob in a live sea.", setup() { setMode("2d"); setRule("Day & Night"); fillSoup(0.5); } },
    { title: "Rule 30, 90 and 110", q: "Switch to the 1D rules and start from a single live cell. Try rule 90, rule 30 and rule 110. Which makes a pattern you could predict, which looks random, and which is somewhere in between?", hint: "Rule 90 draws the Sierpinski triangle: perfectly regular and fractal. Rule 30 looks random (Mathematica used its centre column as a random number generator). Rule 110 has structures that move and collide; it was proved (Cook, 2004) able to compute anything a computer can: from 8 bits of rule!", setup() { setMode("1d"); setRule1(90); start1D(true); } },
    { title: "Make your own rule", q: "Type a rule into the box (for example B36/S125, or B2/S, or B345/S5) and start a soup. Can you find a rule that grows, one that dies out, and one that does something interesting in between?", hint: "Most rules either die quickly or explode into noise. Interesting behaviour (moving objects, long-lived patterns) tends to sit near the boundary between the two: the 'edge of chaos' idea. The batch run 'Order, chaos and the edge' measures it with random rules.", setup() { setMode("2d"); fillSoup(0.25); } }
  ],
  batch: [
    { title: "Soup density and the ash", question: "Does the density of the starting soup change how much of the grid is still alive after it settles?", how: "Each run: a 64 × 64 grid (edges wrap round) filled at random, then 600 generations of Life. The result is the fraction of cells alive at the end.", xLabel: "starting density", yLabel: "fraction alive after 600 generations", xs: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], reps: 5, yMin: 0, run(x, r) { const a = runLife(soup(64, 64, x, r), 64, 64, parseRule("B3/S23"), 600); return count(a) / 4096; }, note: "Very thin soups die out (too few cells to make births) and very thick ones die of overcrowding at once. Anything from about 10% to 70% burns down to roughly the same ash, a few percent of the grid (about 4–6% on these small grids after 600 generations): the soup forgets how it started. Small grids vary a lot because a single glider or blinker is a big share of the ash." },
    { title: "Will a small soup die out?", question: "A 12 × 12 square of random cells in an empty grid: how likely is it that nothing at all is left after 500 generations?", how: "Each run: a 12 × 12 random patch at the given density in the middle of a 96 × 96 grid, 500 generations of Life. The result is 1 if every cell is dead, 0 if anything survives; the mean is the probability.", xLabel: "density of the patch", yLabel: "chance it dies out completely", xs: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], reps: 20, yMin: 0, yMax: 1, run(x, r) { const a = runLife(soup(96, 96, x, r, [42, 42, 12, 12]), 96, 96, parseRule("B3/S23"), 500); return count(a) === 0 ? 1 : 0; }, note: "Each run is 0 or 1, so 20 runs give a rough probability (its standard error is up to 0.1). Sparse patches (10%) usually die out completely; at 20% a few do; from 30% upwards none of the test runs died out, because some still life or oscillator almost always forms." },
    { title: "Order, chaos and the edge", question: "Life-like rules chosen at random: how does the activity depend on how many births and survivals the rule allows (Langton's λ)?", how: "Each run: a random rule with k of the 18 B and S entries switched on (λ = k/18; never B0), a 48 × 48 soup at 30%, 200 generations. The result is the fraction of cells that changed in the last generation.", xLabel: "λ (fraction of the 18 B and S entries on)", yLabel: "fraction of cells changing per generation", xs: [0.06, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.94], reps: 8, yMin: 0, run(x, r) { const rl = randomRule(Math.round(x * 18), r); let changed = 0; runLife(soup(48, 48, 0.3, r), 48, 48, rl, 200, (a, b, g) => { if (g === 199) { let c = 0; for (let i = 0; i < a.length; i++) c += a[i] !== b[i]; changed = c / a.length; } }); return changed; }, note: "Rules with few births and survivals freeze (nothing changes). Rules with very many fill the grid and freeze full. In between, activity is highest and runs vary hugely: some rules at the same λ freeze while others seethe. Langton (1990) suggested that complex behaviour like Life's (λ = 5/18 ≈ 0.28) lives near the transition between frozen and seething, 'the edge of chaos'." },
    { title: "Rule 30 as a coin", question: "Run rule 30 from a random row. Is its centre cell like a fair coin?", how: "Each run: a random row of 401 cells, 1000 steps of rule 30. The result is the fraction of steps on which the centre cell was 1.", xLabel: "", yLabel: "fraction of 1s in the centre column", reps: 100, bins: 20, theory: 0.5, theoryLabel: "a fair coin", run(x, r) { let a = new Uint8Array(401).map(() => r() < 0.5 ? 1 : 0), b = new Uint8Array(401), ones = 0; for (let t = 0; t < 1000; t++) { row1D(a, 30, b); [a, b] = [b, a]; ones += a[200]; } return ones / 1000; }, note: "The fractions scatter round 0.5 with a spread close to a real coin's (SD √(0.25/1000) ≈ 0.016), even though rule 30 is completely deterministic. Its centre column passes many statistical tests of randomness." }
  ],
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Life-like automata.</b> A grid of cells (1024 × 576 to 2048 × 1152 on the graphics card), each alive or dead. In each generation, every cell counts its eight live neighbours, n. A dead cell is born if n is in the B list; a live cell survives if n is in the S list. All cells change at once. The edges wrap round (a torus).</li>
<li><b>Elementary (1D) automata.</b> A row of cells, each new cell decided by itself and its two neighbours in the row above. The eight patterns 111, 110, …, 000 are given the eight binary digits of the rule number (Wolfram's numbering).</li>
<li><b>Colours.</b> Live cells are coloured by age (bright when just born, darker when old, so still lifes look dark); dead cells leave a fading trail.</li></ul>
<h3>Assumptions and limits</h3>
<ul><li>The grid is finite and wraps round, so a glider that leaves on the right comes back on the left, and a growing pattern eventually runs into itself. Conway's Life is defined on an infinite plane.</li>
<li>Population and age are measured from occasional copies of the grid back to the main processor.</li>
<li>Batch runs use small grids (48 × 48 to 96 × 96), where single objects are a big share of the total, so results are noisy.</li></ul>
<h3>Some history</h3><p>Conway's Life appeared in Martin Gardner's column in <i>Scientific American</i> in October 1970. It is "Turing complete": with enough space, Life patterns can compute anything a computer can. Stephen Wolfram classified the elementary automata in the 1980s; Matthew Cook proved rule 110 Turing complete (published 2004).</p>
<p>See also <a href="../../computing/turing_and_fsm/turing-and-fsm.html">Turing Machines and State Machines</a> and <a href="../../biology/turing_patterns/turing-patterns.html">Turing Patterns</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Kind of automaton");
ctl.mode = K.seg(g, { value: mode, options: [["2d", "Life-like (2D)"], ["1d", "Elementary (1D)"]], on: v => { setMode(v); if (v === "1d") start1D(true); } });
const g2 = ui.group("Life-like rule");
ctl.rule = K.seg(g2, { label: "Rule", value: ruleName, options: RULES.map(([n]) => [n, n]), on: v => setRule(v) });
const ruleBox = K.$("input"); ruleBox.type = "text"; ruleBox.setAttribute("aria-label", "Rule (birth/survival)"); ruleBox.value = rule.text; ruleBox.style.cssText = "width:120px;font:14px Consolas,monospace;padding:4px 6px;background:var(--panel2,#1b2236);color:var(--text);border:1px solid var(--grid);border-radius:6px";
const rr = K.row(g2); rr.append("Your own: ", ruleBox); K.btn(rr, "Use it", () => { const q = parseRule(ruleBox.value); if (q) { rule = q; ruleName = "custom"; ctl.rule.set(""); } else ui.tip("Write it like B36/S23 (birth on 3 or 6 neighbours, survive on 2 or 3)", 4000); }, "small");
ruleBox.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") rr.querySelector("button").click(); });
ctl.stamp = K.seg(g2, { label: "Pattern to place (choose 'Place' below, then click)", value: stamp, options: Object.keys(PATTERNS).map(k => [k, PATTERNS[k][0]]), on: v => { stamp = v; tool = "stamp"; ctl.tool.set("stamp"); } });
ctl.tool = K.seg(g2, { label: "Mouse", value: tool, options: [["draw", "✏️ Draw"], ["erase", "🧽 Erase"], ["stamp", "📌 Place pattern"], ["pan", "✋ Move"]], on: v => tool = v });
let r1 = K.row(g2); K.btn(r1, "🎲 Soup", () => fillSoup(ctl.dens.value), "primary"); K.btn(r1, "Clear", () => clearGrid());
ctl.dens = K.slider(g2, { label: "Soup density", min: 0.05, max: 0.95, step: 0.05, value: 0.3, fmt: v => (v * 100).toFixed(0) + "% alive" });
ctl.size = K.seg(g2, { label: "Grid", value: GW, options: [[512, "512 × 288"], [1024, "1024 × 576"], [2048, "2048 × 1152"]], on: v => { GW = v; GH = v * 9 / 16; makeGrid(); fillSoup(ctl.dens.value); } });
const g1 = ui.group("Elementary rule (1D)");
ctl.r1 = K.slider(g1, { label: "Rule number", min: 0, max: 255, step: 1, value: rule1, on: v => { setRule1(v); start1D(ctl.single.value); } });
const binEl = K.note(g1, "");
const r1b = K.row(g1); [30, 90, 110, 184, 45, 73].forEach(n => K.btn(r1b, "Rule " + n, () => { setRule1(n); start1D(ctl.single.value); }, "small"));
ctl.single = K.toggle(g1, { label: "Start from a single live cell (otherwise random)", value: true, on: v => start1D(v) });
g = ui.group("Show");
ctl.rate = K.slider(g, { label: "Speed (generations a second)", min: 1, max: 600, step: 1, value: rate, fmt: v => v, on: v => rate = v }); ui.headerSpeed(ctl.rate, { label: "Speed" });
ctl.trails = K.toggle(g, { label: "Trails and age colours", value: true, on: v => trails = v });
ctl.pal = K.seg(g, { label: "Colours", value: 0, options: [[0, "Neon"], [1, "Ember"], [2, "Classic"]], on: v => palette = v });
r1 = K.row(g); K.btn(r1, "Fit the grid", () => zoomTo(1, GW / 2, GH / 2)); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("cellular-automaton", view, cv));
K.note(g, "Scroll to zoom where the mouse is. Hold the right button (or choose Move) to drag the view.");
const read = K.readout(g, [["gen", "generation"], ["pop", "alive"], ["dens", "fraction alive"], ["rule", "rule"]]);

function setMode(m) { mode = m; ctl.mode.set(m); g2.style.display = m === "2d" ? "" : "none"; g1.style.display = m === "1d" ? "" : "none"; gens = 0; popLog = []; }
function setRule(n) { const q = RULES.find(r => r[0] === n); rule = parseRule(q[1]); ruleName = n; ctl.rule.set(n); ruleBox.value = rule.text; }
function setRule1(n) { rule1 = n; ctl.r1.set(n); binEl.innerHTML = "111 110 101 100 011 010 001 000<br><b>" + [7, 6, 5, 4, 3, 2, 1, 0].map(k => " " + ((n >> k) & 1) + " ").join(" ") + "</b>"; binEl.style.fontFamily = "Consolas,monospace"; }

// ---------------- The graphics card ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.5 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, grid, prLife, prShow, prRow, prPaint, row1 = 0;
/* the state texture: R = alive (1) or dead (0); G = age of a live cell (0–1, rising); B = the fading trail of a dead cell */
if (ok) {
  quad = K.gl.quad(gl);
  prLife = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uS; uniform vec2 uTex; uniform float uB[9], uSv[9];
    float alive(vec2 d) { return texture2D(uS, fract(vUv + d * uTex)).r > 0.5 ? 1.0 : 0.0; }
    void main() {
      vec4 c = texture2D(uS, vUv); float n = alive(vec2(-1,-1)) + alive(vec2(0,-1)) + alive(vec2(1,-1)) + alive(vec2(-1,0)) + alive(vec2(1,0)) + alive(vec2(-1,1)) + alive(vec2(0,1)) + alive(vec2(1,1));
      float b = 0.0, s = 0.0; for (int i = 0; i < 9; i++) { if (float(i) == n) { b = uB[i]; s = uSv[i]; } }
      bool live = c.r > 0.5, next = live ? s > 0.5 : b > 0.5;
      gl_FragColor = next ? vec4(1.0, live ? min(1.0, c.g + 0.004) : 0.0, 0.0, 1.0) : vec4(0.0, 0.0, live ? 1.0 : c.b * 0.93, 1.0);
    }`);
  // a 1D rule writes one new row (row number uRow) from the row above it; rows wrap round the texture like a ring
  prRow = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uS; uniform vec2 uTex; uniform float uRow, uRule;
    float at(float dx) { return texture2D(uS, vec2(fract(vUv.x + dx * uTex.x), (mod(uRow - 1.0, 1.0 / uTex.y) + 0.5) * uTex.y)).r > 0.5 ? 1.0 : 0.0; }
    void main() { float k = at(-1.0) * 4.0 + at(0.0) * 2.0 + at(1.0); float bit = mod(floor(uRule / pow(2.0, k)), 2.0); gl_FragColor = vec4(bit, 0.0, 0.0, 1.0); }`);
  prPaint = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uS; uniform vec2 uC, uGrid; uniform float uR, uVal;
    void main() { vec4 c = texture2D(uS, vUv); vec2 d = vUv * uGrid - uC; d -= uGrid * floor(d / uGrid + 0.5); gl_FragColor = length(d) <= uR ? (uVal > 0.5 ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0)) : c; }`);
  prShow = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uS; uniform vec2 uGrid, uCanvas, uPan; uniform float uZoom, uTrails, uPal, uMode, uRow;
    vec3 pal(float a) {   // colour of a live cell of age a (0 = newborn)
      if (uPal < 0.5) return mix(vec3(0.75, 1.0, 1.0), mix(vec3(0.1, 0.75, 1.0), vec3(0.35, 0.15, 0.9), smoothstep(0.05, 0.5, a)), smoothstep(0.0, 0.05, a));
      if (uPal < 1.5) return mix(vec3(1.0, 0.95, 0.7), mix(vec3(1.0, 0.5, 0.1), vec3(0.6, 0.08, 0.15), smoothstep(0.05, 0.5, a)), smoothstep(0.0, 0.05, a));
      return vec3(0.92); }
    void main() {
      vec2 cell = uPan + (vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) - uCanvas * 0.5) / uZoom;   // which cell this pixel shows
      vec2 uv = cell / uGrid;
      if (uMode > 0.5) { uv.y = fract((cell.y - uGrid.y + uRow + 1.0) / uGrid.y); uv.x = fract(uv.x); }   // 1D: newest row at the bottom, older rows scrolling up
      else uv = fract(uv);
      vec4 c = texture2D(uS, uv); vec3 bg = uPal > 1.5 ? vec3(0.06) : vec3(0.015, 0.02, 0.045);
      vec3 col = c.r > 0.5 ? (uTrails > 0.5 && uMode < 0.5 ? pal(c.g) : (uPal < 0.5 ? vec3(0.4, 0.9, 1.0) : uPal < 1.5 ? vec3(1.0, 0.7, 0.3) : vec3(0.92))) : bg + (uTrails > 0.5 ? c.b * (uPal < 0.5 ? vec3(0.25, 0.1, 0.45) : uPal < 1.5 ? vec3(0.45, 0.12, 0.05) : vec3(0.18)) : vec3(0.0));
      if (uZoom > 5.0) { vec2 f = fract(cell); if (min(f.x, f.y) < 0.6 / uZoom * 2.0) col = mix(col, vec3(0.2, 0.25, 0.35), 0.35); }   // grid lines when zoomed in
      gl_FragColor = vec4(col, 1.0);
    }`);
}
function makeGrid() { if (!ok) return; if (grid) grid.dispose(); grid = K.gl.pingpong(gl, GW, GH, {}); grid.upload(null); zoomTo(1, GW / 2, GH / 2); gens = 0; popLog = []; }
function upload(cells) { const d = new Uint8Array(4 * GW * GH); for (let i = 0; i < GW * GH; i++) if (cells[i]) { d[4 * i] = 255; } grid.read.upload(d); grid.write.upload(d); }
function fillSoup(p) { if (!ok) return; if (mode === "1d") { setMode("2d"); zoomTo(2.5, GW / 2, GH / 2); } const r = Math.random, a = new Uint8Array(GW * GH); for (let i = 0; i < a.length; i++) a[i] = r() < p ? 1 : 0; upload(a); gens = 0; popLog = []; }
function clearGrid() { if (!ok) return; grid.upload(null); gens = 0; popLog = []; }
function placePattern(k, cx, cy) { if (!ok) return; const cells = parseRLE(PATTERNS[k][1]), d = grid.read.read(0, 0, GW, GH), out = new Uint8Array(4 * GW * GH);
  for (let i = 0; i < GW * GH; i++) { out[4 * i] = d[4 * i] * 255; out[4 * i + 1] = d[4 * i + 1] * 255; out[4 * i + 2] = d[4 * i + 2] * 255; }
  const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
  for (const [x, y] of cells) { const X = ((Math.round(cx - w / 2) + x) % GW + GW) % GW, Y = ((Math.round(cy - h / 2) + y) % GH + GH) % GH, i = X + Y * GW; out[4 * i] = 255; out[4 * i + 1] = 0; out[4 * i + 2] = 0; }
  grid.read.upload(out); }
function start1D(single) { if (!ok) return; ctl.single.set(single); const a = new Uint8Array(GW * GH); if (single) a[GW / 2] = 1; else for (let x = 0; x < GW; x++) a[x] = Math.random() < 0.5 ? 1 : 0; upload(a); row1 = 0; gens = 0; popLog = []; zoomTo(Math.max(1, cv.h / GH), GW / 2, GH / 2); }
function zoomTo(z, x, y) { zoom = z * Math.min(cv.w / GW, cv.h / GH) || 1; pan = { x, y }; }
// ---------------- One generation ----------------
function step() {
  if (mode === "2d") { prLife.set({ uS: grid.read, uTex: [1 / GW, 1 / GH], uB: rule.b.map(Number), uSv: rule.s.map(Number) }); quad.draw(prLife, grid.write); grid.swap(); }
  else { row1 = (row1 + 1) % GH; K.gl.bindTarget(gl, grid.read); gl.viewport(0, row1, GW, 1); prRow.set({ uS: grid.write, uTex: [1 / GW, 1 / GH], uRow: row1, uRule: rule1 }); quad.draw(prRow); copyRow(); }
  gens++;
}
// (1D) the new row was drawn into the read texture from the write texture; copy it across so both hold every row
function copyRow() { K.gl.bindTarget(gl, grid.write); gl.viewport(0, row1, GW, 1); prRow.set({ uS: grid.read, uTex: [1 / GW, 1 / GH], uRow: row1, uRule: rule1 }); quad.draw(prRow); }

// ---------------- Mouse ----------------
const toCell = p => ({ x: pan.x + (p.x - cv.w / 2) / zoom, y: pan.y + (p.y - cv.h / 2) / zoom });
let drag = null;
function paint(p, val) { if (!ok || mode !== "2d") return; const c = toCell(p); prPaint.set({ uS: grid.read, uC: [c.x, c.y], uGrid: [GW, GH], uR: Math.max(0.5, 1.5 / Math.sqrt(zoom)), uVal: val }); quad.draw(prPaint, grid.write); grid.swap(); }
K.pointer(cv.el, {
  down(p) { const right = p.e.button === 2; drag = { x: p.x, y: p.y, pan: { ...pan }, pan_: right || tool === "pan" };
    if (drag.pan_) return; if (tool === "stamp" && mode === "2d") { const c = toCell(p); placePattern(stamp, c.x, c.y); drag = null; } else paint(p, tool === "draw" ? 1 : 0); },
  drag(p) { hover = p; if (!drag) return; if (drag.pan_) { pan.x = drag.pan.x - (p.x - drag.x) / zoom; pan.y = drag.pan.y - (p.y - drag.y) / zoom; } else paint(p, tool === "draw" ? 1 : 0); },
  up() { drag = null; }, hover(p) { hover = p; }, leave() { hover = null; }
});
cv.el.addEventListener("wheel", e => { e.preventDefault(); const r = cv.el.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top }, before = toCell(p); zoom = K.clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.2, 64); const after = toCell(p); pan.x += before.x - after.x; pan.y += before.y - after.y; }, { passive: false });

// ---------------- Drawing and counting ----------------
function draw() {
  const c = cv.ctx; c.clearRect(0, 0, cv.w, cv.h); if (!ok) return; const d = view.dpr;
  K.gl.bindTarget(gl, null); prShow.set({ uS: grid.read, uGrid: [GW, GH], uCanvas: [view.el.width, view.el.height], uPan: [pan.x, pan.y], uZoom: zoom * d, uTrails: trails ? 1 : 0, uPal: palette, uMode: mode === "1d" ? 1 : 0, uRow: row1 });
  quad.draw(prShow);
  if (hover && tool === "stamp" && mode === "2d") {   // a ghost of the pattern under the mouse
    const cells = parseRLE(PATTERNS[stamp][1]), w = Math.max(...cells.map(q => q[0])) + 1, h = Math.max(...cells.map(q => q[1])) + 1, q = toCell(hover);
    c.fillStyle = "rgba(255,255,255,.45)"; for (const [x, y] of cells) { const X = (Math.round(q.x - w / 2) + x - pan.x) * zoom + cv.w / 2, Y = (Math.round(q.y - h / 2) + y - pan.y) * zoom + cv.h / 2; c.fillRect(X, Y, Math.max(1, zoom - (zoom > 4 ? 1 : 0)), Math.max(1, zoom - (zoom > 4 ? 1 : 0))); }
  }
}
function countPop() { if (!ok) return; try { const d = grid.read.read(); let n = 0; for (let i = 0; i < d.length; i += 4) n += d[i] > 0.5; pop = mode === "1d" ? null : n; if (mode === "2d") { popLog.push([gens, n]); if (popLog.length > 600) popLog = popLog.filter((v, i) => i % 2 === 0); } } catch (e) { } }
const chP = K.chart(ui.dock, { title: "Population", xLabel: "generation", yLabel: "cells alive", yMin: 0 });

// ---------------- The loop ----------------
makeGrid(); setMode("2d"); setRule("Life"); setRule1(110); fillSoup(0.3); zoomTo(2.5, GW / 2, GH / 2);
let fr = 0, lastCount = 0;
ui.run(dt => { if (!ok) return; acc += rate * dt; let n = 0; while (acc >= 1 && n < 60) { step(); acc--; n++; } if (acc > 5) acc = 0; }, () => {
  draw(); const now = performance.now();
  if (now - lastCount > 400) { lastCount = now; countPop(); chP.draw([{ pts: popLog, color: K.cssVar("--s0") }], {});
    read.set("gen", gens.toLocaleString()); read.set("pop", pop == null ? "–" : pop.toLocaleString()); read.set("dens", pop == null ? "–" : (pop / (GW * GH) * 100).toFixed(2) + "%"); read.set("rule", mode === "2d" ? rule.text + (ruleName !== "custom" ? " (" + ruleName + ")" : "") : "rule " + rule1); }
  ui.hud(`<b style="font-size:15px">${mode === "2d" ? (ruleName !== "custom" ? ruleName : rule.text) : "Rule " + rule1}</b><br>generation ${gens.toLocaleString()}`);
});
window.lifeTest = { setMode, setRule, setRule1, start1D, fillSoup, clearGrid, placePattern, zoomTo, step: n => { for (let k = 0; k < n; k++) step(); countPop(); return pop; } };
ui.tip("Every cell follows the same rule, looking only at its 8 neighbours · draw with the mouse, or place a pattern · scroll to zoom", 8000);
}
