/* =====================================================================
   FRACTAL EXPLORER
   The Mandelbrot set comes from one tiny rule. Take a complex number c.
   Start with z = 0 and repeat
                         z  →  z² + c
   If z stays small for ever, c is IN the set (drawn black). If z flies
   off to infinity, c is outside, and the colour shows how many steps it
   took to escape (|z| > 2 means it never comes back).

   A Julia set uses the same rule the other way round: c is fixed and the
   starting z changes from pixel to pixel. Every point c of the Mandelbrot
   set has its own Julia set.

   Newton's method finds the roots of an equation by repeatedly sliding
   down the tangent: z → z − p(z) / p′(z). Colour each starting point by
   the root it ends up at, and the borders between them are fractal too.

   The pictures are computed by the graphics card, one pixel per thread,
   in "double-single" arithmetic (two floats glued together) when you zoom
   deep. The Batch run uses the main processor's ordinary doubles.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2;
// escape time of c under z → z² + c from z0 (Mandelbrot: z0 = 0; Julia: c fixed, z0 varies)
function escape(zx, zy, cr, ci, max) { let n = 0; for (; n < max; n++) { const x2 = zx * zx, y2 = zy * zy; if (x2 + y2 > 4) return n; zy = 2 * zx * zy + ci; zx = x2 - y2 + cr; } return max; }
// box-counting dimension of a Julia set's boundary: cover it with boxes of size s, count those it passes through, fit log N against log(1/s)
function boxDimension(cr, ci, rand, res = 512) {
  const L = 1.8, ox = (rand() - 0.5) * 0.05, oy = (rand() - 0.5) * 0.05, max = 300, R1 = res + 1, inside = new Uint8Array(R1 * R1);
  for (let j = 0; j <= res; j++) for (let i = 0; i <= res; i++) inside[i + j * R1] = escape(-L + ox + 2 * L * i / res, -L + oy + 2 * L * j / res, cr, ci, max) >= max ? 1 : 0;
  const pts = [];
  for (const s of [16, 32, 64, 128]) { let N = 0; const b = res / s;
    for (let J = 0; J < s; J++) for (let I = 0; I < s; I++) { let a = 0, o = 0; for (let j = J * b; j <= (J + 1) * b && !(a && o); j++) for (let i = I * b; i <= (I + 1) * b; i++) { if (inside[i + j * R1]) a = 1; else o = 1; if (a && o) break; } if (a && o) N++; }
    pts.push([Math.log(s), Math.log(Math.max(1, N))]); }
  return K.linfit(pts).m;
}
// famous places to visit (centre and the width of the view)
const PLACES = [
  ["The whole set", -0.6, 0, 3.2], ["Seahorse valley", -0.743643887037151, 0.131825904205330, 0.004], ["Elephant valley", 0.2925, 0.0145, 0.012],
  ["A baby Mandelbrot", -1.7685736562, 0.0017064, 0.00004], ["Triple spiral", -0.0881, 0.6546, 0.015], ["Deep seahorse (10⁻¹⁰)", -0.743643887037151, 0.131825904205330, 4e-10],
  ["The cusp", 0.25, 0, 0.05], ["The needle", -1.99, 0, 0.03]
];
const JULIAS = [["Basilica", -1, 0], ["Douady's rabbit", -0.122561, 0.744862], ["Dendrite", 0, 1], ["San Marco dragon", -0.75, 0.05], ["Siegel disk", -0.390541, -0.586788], ["Cauliflower", 0.25, 0], ["Dust (outside)", -0.8, 0.2]];
const NEWTON = [["z³ − 1", 0], ["z⁴ − 1", 1], ["z³ − 2z + 2", 2], ["z⁵ − 1", 3]];

if (typeof module !== "undefined") module.exports = { escape, boxDimension };
else page();
function page() {
let mode = "mandel", jc = [-0.122561, 0.744862], newton = 0, maxIter = 400, autoIter = true, pal = 0, cycle = 0.05, density = 1, showOrbit = true, preview = true, offset = 0;
const view0 = { x: -0.6, y: 0, w: 3.2 }; let V = { ...view0 }, tour = null, hover = null;

const ui = K.app({
  title: "Fractal Explorer", subject: "Explore",
  blurb: "Infinite detail from z → z² + c",
  reset: () => { setMode("mandel"); goTo(PLACES[0]); },
  missions: [
    { title: "Seahorse valley", q: "Zoom into Seahorse valley (between the main body and the bulb on its left). Keep going. What keeps appearing? Can you find a tiny copy of the whole set?", hint: "Spirals of 'seahorse tails' made of smaller spirals, and eventually miniature Mandelbrot sets, each surrounded by its own decorations. The set is not exactly self-similar (the copies are slightly distorted and their surroundings differ), but it is full of near-copies at every scale.", setup() { setMode("mandel"); goTo(PLACES[1]); } },
    { title: "Inside or outside?", q: "Turn on the Julia preview and move the mouse slowly across the edge of the Mandelbrot set. How does the Julia set change as c crosses from inside to outside?", hint: "For c inside the Mandelbrot set the Julia set is one connected piece. As soon as c leaves it, the Julia set shatters into 'dust' (infinitely many separate points). That is in fact the definition: the Mandelbrot set is the map of which Julia sets are connected.", setup() { setMode("mandel"); goTo(PLACES[0]); ctl.preview.set(true, true); } },
    { title: "Follow the orbit", q: "Hover over different parts of the set with 'Show the orbit' on. Where does z settle to a single point? Where does it jump between 2, 3 or more points? Count the spokes on a bulb's antenna.", hint: "In the big cardioid the orbit spirals into one point. In the big circle to its left it ends up hopping between 2 points; in the bulbs on top, 3; and so on. The number of spokes on a bulb's antenna equals its period. Outside the set the orbit flies away.", setup() { setMode("mandel"); goTo(PLACES[0]); ctl.orbit.set(true, true); } },
    { title: "π in the cusp", q: "Go to 'The cusp' (c = 0.25, where the set has a dent on the real axis). Hover just to the right of it, at c = 0.25 + ε. How many steps does z take to escape? Try ε = 0.01, 0.0001… Multiply the steps by √ε.", hint: "The orbit squeezes through a narrow gap near z = 0.5 and takes about π/√ε steps to escape, so steps × √ε → π. Dave Boll found this in 1991. Through the 'neck' at c = −0.75 + iε it is π/ε. Nobody expected π here. The batch run checks both.", setup() { setMode("mandel"); goTo(PLACES[6]); ctl.orbit.set(true, true); } },
    { title: "Newton's three colours", q: "Switch to Newton's method for z³ − 1. Each colour is the root that starting point slides to. Zoom into a border between two colours. Is it ever just two colours?", hint: "Never: wherever two colours meet, the third is there too, in ever smaller blobs. Every boundary point touches all three regions. Try z³ − 2z + 2: the black regions are starting points that never settle, stuck in a cycle.", setup() { setMode("newton"); newton = 0; ctl.newton.set(0); goTo(["", 0, 0, 3]); } },
    { title: "The edge of precision", q: "Go to 'Deep seahorse' (a view 10⁻¹⁰ wide) and keep zooming. At some point the picture breaks into blocks. Why?", hint: "Computers store numbers to a fixed number of digits. A graphics card's float has about 7 significant figures; this page glues two together ('double-single') for about 14. Below about 10⁻¹² the neighbouring pixels' c values round to the same number, so they get the same colour. Deeper zooms need cleverer maths ('perturbation') or many more digits.", setup() { setMode("mandel"); goTo(PLACES[5]); } },
    { title: "How long is the coastline?", q: "Pick the Basilica Julia set and zoom into its edge. Then the circle (c = 0). Which edge is 'rougher'? The batch run measures each edge's box-counting dimension.", hint: "c = 0 gives a perfect circle: dimension 1, an ordinary curve. The basilica's edge has dimension about 1.27: more than a line, less than an area. Wigglier Julia sets (near the edge of the Mandelbrot set) have dimensions closer to 2.", setup() { setMode("julia"); jc = [JULIAS[0][1], JULIAS[0][2]]; goTo(["", 0, 0, 3.6]); } }
  ],
  batch: [
    { title: "π in the cusp", question: "How many steps does c = 0.25 + ε take to escape, as ε gets smaller?", how: "Each run picks ε (with a random ±1% change) so that 1/√ε is close to the value shown, and counts the steps until |z| > 2.", xLabel: "1 / √ε", yLabel: "steps to escape", xs: [10, 20, 40, 80, 160, 320], reps: 4, yMin: 0, theory: x => Math.PI * x, theoryLabel: "π / √ε", fit: true, run(x, r) { const e = Math.pow(1 / x, 2) * (1 + 0.02 * (r() - 0.5)); return escape(0, 0, 0.25 + e, 0, 1e7); }, note: "The steps are almost exactly proportional to 1/√ε, with gradient π: the best-fit line's gradient comes out at 3.14. Each run's ε is nudged by up to 1%, so the points scatter a little. Boll (1991); proved by Eckmann and others." },
    { title: "π through the neck", question: "How many steps does c = −0.75 + iε take to escape?", how: "Each run picks ε (±1%) near 1 / (value shown) and counts the steps until |z| > 2.", xLabel: "1 / ε", yLabel: "steps to escape", xs: [10, 30, 100, 300, 1000], reps: 4, yMin: 0, theory: x => Math.PI * x, theoryLabel: "π / ε", fit: true, run(x, r) { const e = (1 / x) * (1 + 0.02 * (r() - 0.5)); return escape(0, 0, -0.75, e, 1e7); }, note: "Here the steps grow like 1/ε (not 1/√ε), again with π as the constant. Why π? Close to these points the orbit behaves like a slowly turning rotation, and π comes from the angle it must turn through." },
    { title: "The area of the Mandelbrot set", question: "Throw random points at a rectangle round the set. What fraction land in it, and what area does that give?", how: "Each run: 2000 random c in the rectangle −2 to 0.5 by −1.25 to 1.25 (area 6.25). A point counts as in the set if z has not escaped after 500 steps.", xLabel: "", yLabel: "estimated area", reps: 120, bins: 20, theory: 1.5066, theoryLabel: "best known value", run(x, r) { let n = 0; for (let k = 0; k < 2000; k++) if (escape(0, 0, -2 + 2.5 * r(), -1.25 + 2.5 * r(), 500) >= 500) n++; return n / 2000 * 6.25; }, note: "A Monte Carlo estimate: each run's answer scatters because the points are random (SD about 0.06 for 2000 points; four times the points halves it). The mean comes out a little high because some points just outside the set have not escaped by step 500. The true area is about 1.5066, worked out with enormous computer runs; nobody knows a formula for it." },
    { title: "Rough edges: box-counting dimension", question: "How 'rough' is the edge of a Julia set for c on the real axis?", how: "Each run: a 512 × 512 grid with a random small shift; boxes of 1/16 to 1/128 of the picture that the edge passes through are counted, and log N is fitted against log(1/size).", xLabel: "c (real)", yLabel: "box-counting dimension", xs: [0, -0.25, -0.5, -0.75, -1, -1.3], reps: 3, yMin: 0.8, yMax: 2, run: (x, r) => boxDimension(x, 0, r), note: "c = 0 gives a circle, dimension 1, and the estimate agrees (1.00). The edges get rougher further along the axis, reaching about 1.3 at c = −1.3. For the basilica (c = −1) this coarse grid gives about 1.2, a little below the true 1.2683: box-counting on a 512 × 512 grid misses the finest wiggles. Each run shifts the grid slightly, so runs differ a little." }
  ],
  notes: `<h3>What is being drawn</h3>
<ul><li><b>Mandelbrot set.</b> Each pixel is a complex number c. Starting from z = 0, z → z² + c is repeated up to the iteration limit. If |z| passes 2 it will escape to infinity, and the pixel is coloured by how long that took ("smooth" escape time n + 1 − log₂ log₂|z|, so the bands blend). If it never escapes, the pixel is black.</li>
<li><b>Julia set.</b> The same rule with c fixed and the pixel as the starting z.</li>
<li><b>Newton's method.</b> z → z − p(z)/p′(z) from each pixel, for up to 60 steps; the colour is the root it reaches, darker the more steps it took. Black: no root reached.</li>
<li><b>Orbit.</b> The first 200 values of z for the point under the mouse, joined up.</li></ul>
<h3>Assumptions and limits</h3>
<ul><li>"Never escapes" really means "has not escaped within the iteration limit". Points just outside the set look black if the limit is too low; with "Auto" the limit rises as you zoom in.</li>
<li>Graphics cards work in single precision (about 7 significant figures). This page uses double-single arithmetic (two floats as one number, about 14 figures) once a view is narrower than 10⁻⁴, so zooms reach about 10⁻¹². Some graphics drivers "optimise" the trick away; then deep views turn blocky sooner.</li>
<li>Each pixel is one sample, so very fine detail can shimmer (aliasing).</li>
<li>Box-counting on a 512 × 512 grid gives rough dimensions; published values use much finer grids and other methods.</li></ul>
<h3>Some facts</h3>
<ul><li>The Mandelbrot set is connected (Douady and Hubbard, 1982), and its boundary has Hausdorff dimension 2 (Shishikura, 1998), even though its area is only about 1.5066.</li>
<li>The Mandelbrot set is named after Benoit Mandelbrot, who drew it with a computer at IBM in 1980.</li></ul>
<p>See also <a href="../strange_attractors/strange-attractors.html">Strange Attractors</a> and the <a href="../../mathematics/complex_numbers/complex-numbers.html">Complex Numbers</a> simulation.</p>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("What to draw");
ctl.mode = K.seg(g, { label: "Fractal", value: mode, options: [["mandel", "Mandelbrot"], ["julia", "Julia"], ["newton", "Newton"]], on: v => { setMode(v); goTo(["", v === "mandel" ? -0.6 : 0, 0, v === "mandel" ? 3.2 : 3.4]); } });
const pr = K.row(g); PLACES.forEach(p => K.btn(pr, p[0], () => { setMode("mandel"); goTo(p); }, "small"));
const jr = K.row(g); JULIAS.forEach(j => K.btn(jr, j[0], () => { jc = [j[1], j[2]]; setMode("julia"); goTo(["", 0, 0, 3.4]); }, "small"));
ctl.newton = K.seg(g, { label: "Newton's method for", value: 0, options: NEWTON.map(([n, k]) => [k, n]), on: v => { newton = v; setMode("newton"); } });
g = ui.group("Explore");
ctl.iter = K.slider(g, { label: "Iteration limit", min: 50, max: 5000, step: 50, value: maxIter, on: v => { maxIter = v; autoIter = false; ctl.auto.set(false); } });
ctl.auto = K.toggle(g, { label: "Auto: raise the limit as you zoom", value: true, on: v => autoIter = v });
ctl.preview = K.toggle(g, { label: "Julia preview for the point under the mouse", value: true, on: v => preview = v });
ctl.orbit = K.toggle(g, { label: "Show the orbit of the point under the mouse", value: true, on: v => showOrbit = v });
let r1 = K.row(g); K.btn(r1, "🎬 Zoom tour", () => startTour(), "primary").title = "Fly deeper and deeper into Seahorse valley"; K.btn(r1, "↺ Whole set", () => goTo(mode === "mandel" ? PLACES[0] : ["", 0, 0, 3.4])); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("fractal", view, cv));
K.note(g, "Drag to move. Scroll to zoom where the mouse is. Click (Mandelbrot) to open that point's Julia set.");
g = ui.group("Colour");
ctl.pal = K.seg(g, { label: "Palette", value: 0, options: [[0, "Fire"], [1, "Ocean"], [2, "Electric"], [3, "Grey"]], on: v => pal = v });
ctl.cycle = K.slider(g, { label: "Colour cycling", min: 0, max: 0.5, step: 0.01, value: cycle, fmt: v => v ? v.toFixed(2) : "off", on: v => cycle = v });
ctl.density = K.slider(g, { label: "Colour bands", min: 0.2, max: 4, step: 0.1, value: density, fmt: v => "× " + v.toFixed(1), on: v => density = v });
const read = K.readout(g, [["c", "centre"], ["w", "view width"], ["zoom", "magnification"], ["it", "iteration limit"], ["hc", "under the mouse"], ["hn", "steps to escape"]]);

function setMode(m) { mode = m; ctl.mode.set(m); tour = null; }
function goTo(p) { V = { x: p[1], y: p[2], w: p[3] }; tour = null; }
function startTour() { setMode("mandel"); V = { ...view0 }; tour = { t: 0, x: -0.743643887037151, y: 0.131825904205330, w0: 3.2, w1: 3e-11 }; }

// ---------------- The graphics card ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.25 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, prog;
// two floats as one number: hi + lo. Error-free sums and products (Dekker / Knuth); uOne stops the compiler simplifying them away.
const DS = `uniform float uOne;
vec2 dsAdd(vec2 a, vec2 b) { float t1 = a.x + b.x, e = (t1 - a.x) * uOne, t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y; vec2 c; c.x = t1 + t2; c.y = t2 - (c.x - t1) * uOne; return c; }
vec2 dsMul(vec2 a, vec2 b) { float sp = 8193.0, ca = a.x * sp, cb = b.x * sp, a1 = ca - (ca - a.x) * uOne, b1 = cb - (cb - b.x) * uOne, a2 = a.x - a1, b2 = b.x - b1;
  float c11 = a.x * b.x, c21 = a2 * b2 + (a2 * b1 + (a1 * b2 + (a1 * b1 - c11))), c2 = a.x * b.y + a.y * b.x, t1 = c11 + c2, e = (t1 - c11) * uOne, t2 = a.y * b.y + ((c2 - e) + (c11 - (t1 - e))) + c21;
  vec2 c; c.x = t1 + t2; c.y = t2 - (c.x - t1) * uOne; return c; }`;
if (ok) {
  quad = K.gl.quad(gl);
  prog = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv;
    uniform vec2 uRes, uOrigin, uCx, uCy, uJ; uniform float uScale, uMax, uMode, uDeep, uPal, uShift, uDens, uNewton, uFrame;
    ${DS}
    vec3 palette(float t) {
      t = fract(t);
      if (uPal < 0.5) {   // the classic: deep blue, white, gold, black
        vec3 a = vec3(0.0, 0.027, 0.39), b = vec3(0.125, 0.42, 0.8), c = vec3(0.93, 1.0, 1.0), d = vec3(1.0, 0.67, 0.0), e = vec3(0.0, 0.008, 0.0);
        if (t < 0.16) return mix(a, b, t / 0.16); if (t < 0.42) return mix(b, c, (t - 0.16) / 0.26); if (t < 0.6425) return mix(c, d, (t - 0.42) / 0.2225); if (t < 0.8575) return mix(d, e, (t - 0.6425) / 0.215); return mix(e, a, (t - 0.8575) / 0.1425); }
      if (uPal < 1.5) return mix(vec3(0.0, 0.03, 0.15), vec3(0.2, 0.75, 1.0), smoothstep(0.0, 0.5, t)) * (1.0 - smoothstep(0.7, 1.0, t)) + vec3(0.95, 0.98, 1.0) * smoothstep(0.45, 0.6, t) * (1.0 - smoothstep(0.6, 0.95, t));
      if (uPal < 2.5) return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67)));
      return vec3(0.5 + 0.5 * cos(6.2832 * t));
    }
    vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
    vec2 cdiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b); }
    void main() {
      vec2 off = (gl_FragCoord.xy - uOrigin - 0.5 * uRes) * uScale;          // offset of this pixel from the centre (a small number)
      if (uMode > 1.5) {   // ---- Newton's method ----
        vec2 z = vec2(uCx.x + off.x, uCy.x + off.y); float n = 0.0; vec2 r0, r1, r2, r3, r4; int nr = 3;
        if (uNewton < 0.5) { r0 = vec2(1, 0); r1 = vec2(-0.5, 0.866025); r2 = vec2(-0.5, -0.866025); }
        else if (uNewton < 1.5) { r0 = vec2(1, 0); r1 = vec2(0, 1); r2 = vec2(-1, 0); r3 = vec2(0, -1); nr = 4; }
        else if (uNewton < 2.5) { r0 = vec2(-1.769292, 0.0); r1 = vec2(0.884646, 0.589742); r2 = vec2(0.884646, -0.589742); }
        else { for (int k = 0; k < 5; k++) { float a = 6.2832 * float(k) / 5.0; if (k == 0) r0 = vec2(cos(a), sin(a)); if (k == 1) r1 = vec2(cos(a), sin(a)); if (k == 2) r2 = vec2(cos(a), sin(a)); if (k == 3) r3 = vec2(cos(a), sin(a)); if (k == 4) r4 = vec2(cos(a), sin(a)); } nr = 5; }
        int hit = -1;
        for (int i = 0; i < 60; i++) {
          vec2 z2 = cmul(z, z), z3 = cmul(z2, z), p, dp;
          if (uNewton < 0.5) { p = z3 - vec2(1, 0); dp = 3.0 * z2; }
          else if (uNewton < 1.5) { p = cmul(z3, z) - vec2(1, 0); dp = 4.0 * z3; }
          else if (uNewton < 2.5) { p = z3 - 2.0 * z + vec2(2, 0); dp = 3.0 * z2 - vec2(2, 0); }
          else { p = cmul(cmul(z3, z), z) - vec2(1, 0); dp = 5.0 * cmul(z3, z); }
          z -= cdiv(p, dp); n += 1.0;
          if (distance(z, r0) < 1e-3) { hit = 0; break; } if (distance(z, r1) < 1e-3) { hit = 1; break; } if (distance(z, r2) < 1e-3) { hit = 2; break; }
          if (nr > 3 && distance(z, r3) < 1e-3) { hit = 3; break; } if (nr > 4 && distance(z, r4) < 1e-3) { hit = 4; break; }
        }
        vec3 c = hit < 0 ? vec3(0.0) : palette(float(hit) / float(nr) + uShift) * (1.0 - min(0.85, n / 30.0 * uDens));
        gl_FragColor = vec4(c, 1.0); return;
      }
      // ---- Mandelbrot (uMode 0) or Julia (uMode 1): z → z² + c ----
      float n = 0.0, r2 = 0.0; bool gone = false;
      if (uDeep < 0.5) {   // ordinary single precision
        vec2 p = vec2(uCx.x + off.x, uCy.x + off.y), z = uMode < 0.5 ? vec2(0.0) : p, c = uMode < 0.5 ? p : uJ;
        for (int i = 0; i < 5000; i++) { if (float(i) >= uMax) break; z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c; r2 = dot(z, z); n += 1.0; if (r2 > 256.0) { gone = true; break; } }
      } else {             // double-single: each coordinate kept as hi + lo
        vec2 px = dsAdd(uCx, vec2(off.x, 0.0)), py = dsAdd(uCy, vec2(off.y, 0.0));
        vec2 zx = uMode < 0.5 ? vec2(0.0) : px, zy = uMode < 0.5 ? vec2(0.0) : py, cx = uMode < 0.5 ? px : vec2(uJ.x, 0.0), cy = uMode < 0.5 ? py : vec2(uJ.y, 0.0);
        for (int i = 0; i < 5000; i++) { if (float(i) >= uMax) break;
          vec2 x2 = dsMul(zx, zx), y2 = dsMul(zy, zy), xy = dsMul(zx, zy);
          zy = dsAdd(dsAdd(xy, xy), cy); zx = dsAdd(dsAdd(x2, -y2), cx);
          r2 = zx.x * zx.x + zy.x * zy.x; n += 1.0; if (r2 > 256.0) { gone = true; break; } }
      }
      if (!gone) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      float sm = n + 1.0 - log2(log2(r2) * 0.5);                              // smooth escape time
      vec3 col = palette(sqrt(sm) * 0.16 * uDens + uShift);
      gl_FragColor = vec4(col * (1.0 - exp(-sm * 0.12)), 1.0);
    }`);
}
// split a double into a float pair (hi, lo) for the shader
const f32 = Math.fround, split = v => { const hi = f32(v); return [hi, f32(v - hi)]; };
function render(x, y, w, ox, oy, rw, rh, m, iters, c) {
  const deep = w / rw < 3e-7 * Math.max(1, Math.abs(x), Math.abs(y)) ? 1 : 0;   // a pixel narrower than float precision near |c| ~ 1: switch to double-single
  gl.viewport(ox, oy, rw, rh); gl.enable(gl.SCISSOR_TEST); gl.scissor(ox, oy, rw, rh);
  prog.set({ uRes: [rw, rh], uOrigin: [ox, oy], uCx: split(x), uCy: split(y), uJ: c, uScale: w / rw, uMax: iters, uMode: m, uDeep: deep, uPal: pal, uShift: offset, uDens: density, uNewton: newton, uOne: 1 });
  quad.draw(prog); gl.disable(gl.SCISSOR_TEST); return deep;
}

// ---------------- Mouse: drag to pan, wheel to zoom at the cursor, click for a Julia set ----------------
const unit = () => V.w / Math.min(cv.w, cv.h * 1.6);   // complex units per screen pixel: the view width w always fits
const toC = p => ({ x: V.x + (p.x - cv.w / 2) * unit(), y: V.y - (p.y - cv.h / 2) * unit() });
let drag = null;
K.pointer(cv.el, {
  down(p) { drag = { x: p.x, y: p.y, V: { ...V }, moved: false }; tour = null; },
  drag(p) { hover = p; if (!drag) return; const dx = p.x - drag.x, dy = p.y - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; const u = drag.V.w / Math.min(cv.w, cv.h * 1.6); V.x = drag.V.x - dx * u; V.y = drag.V.y + dy * u; },
  up(p) { if (drag && !drag.moved && mode === "mandel") { const c = toC(p); jc = [c.x, c.y]; setMode("julia"); goTo(["", 0, 0, 3.4]); } drag = null; },
  hover(p) { hover = p; }, leave() { hover = null; }
});
cv.el.addEventListener("wheel", e => { e.preventDefault(); tour = null; const r = cv.el.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top }, before = toC(p), k = Math.exp(e.deltaY * 0.0015); V.w = K.clamp(V.w * k, 1e-13, 8); const after = toC(p); V.x += before.x - after.x; V.y += before.y - after.y; }, { passive: false });

// ---------------- Drawing ----------------
// more iterations the deeper you zoom; a view wider than the starting one (log negative) just uses the minimum
function iterFor(w) { return autoIter ? Math.round(K.clamp(150 + 120 * Math.max(0, Math.log10(3.2 / w)) ** 1.6, 150, 5000)) : maxIter; }
function draw(dt) {
  if (tour) { tour.t += dt; const k = Math.min(1, tour.t / 40); V.w = tour.w0 * Math.pow(tour.w1 / tour.w0, k); const pull = Math.min(1, tour.t / 3); V.x += (tour.x - V.x) * 0.05 * pull + 0; V.y += (tour.y - V.y) * 0.05 * pull; if (k >= 1) tour = null; }
  offset = (offset + cycle * dt) % 1; const it = iterFor(V.w), c = cv.ctx, w = cv.w, h = cv.h, d = view.dpr; c.clearRect(0, 0, w, h);
  let deep = 0;
  if (ok) {
    const W2 = view.el.width, H2 = view.el.height; K.gl.bindTarget(gl, null);
    deep = render(V.x, V.y, unit() * W2 / d, 0, 0, W2, H2, mode === "mandel" ? 0 : mode === "julia" ? 1 : 2, it, jc);
    // the inset: the Julia set of the point under the mouse (Mandelbrot mode), or the Mandelbrot set with c marked (Julia mode)
    if ((preview && mode === "mandel" && hover) || mode === "julia") {
      const iw = Math.round(W2 * 0.26), ih = Math.round(iw * 0.75), ox = W2 - iw - Math.round(12 * d), oy = Math.round(12 * d);
      gl.viewport(ox - 2, oy - 2, iw + 4, ih + 4); gl.enable(gl.SCISSOR_TEST); gl.scissor(ox - 2, oy - 2, iw + 4, ih + 4); gl.clearColor(0.85, 0.88, 0.95, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.SCISSOR_TEST);
      if (mode === "mandel") { const q = toC(hover); render(0, 0, 3.4, ox, oy, iw, ih, 1, 300, [q.x, q.y]); }
      else render(-0.6, 0, 3.4, ox, oy, iw, ih, 0, 200, jc);
    }
  }
  // labels on the 2D canvas: the inset's caption, the orbit, and where c is
  const iwC = w * 0.26, ihC = iwC * 0.75, ix = w - iwC - 12, iy = h - ihC - 12;
  c.font = "600 11.5px Segoe UI,system-ui,sans-serif"; c.textAlign = "left"; c.fillStyle = "rgba(255,255,255,.92)";
  if (ok && preview && mode === "mandel" && hover) { const q = toC(hover); c.fillText(`Julia set for c = ${q.x.toFixed(4)} ${q.y < 0 ? "−" : "+"} ${Math.abs(q.y).toFixed(4)}i`, ix, iy - 6); }
  if (ok && mode === "julia") { c.textAlign = "right"; c.fillText(`c = ${jc[0].toFixed(5)} ${jc[1] < 0 ? "−" : "+"} ${Math.abs(jc[1]).toFixed(5)}i, marked on the Mandelbrot set`, ix + iwC, iy - 6); c.textAlign = "left";
    const mx = ix + iwC / 2 + (jc[0] + 0.6) / 3.4 * iwC, my = iy + ihC / 2 - jc[1] / 3.4 * iwC; c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, my, 5, 0, TAU); c.stroke(); }
  if (showOrbit && hover && mode !== "newton") {
    const q = toC(hover); let zx = mode === "mandel" ? 0 : q.x, zy = mode === "mandel" ? 0 : q.y; const cr = mode === "mandel" ? q.x : jc[0], ci = mode === "mandel" ? q.y : jc[1];
    const P = (x, y) => [w / 2 + (x - V.x) / unit(), h / 2 - (y - V.y) / unit()];
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 1.2; c.beginPath(); let a = P(zx, zy); c.moveTo(a[0], a[1]);
    for (let k = 0; k < 200; k++) { const nx = zx * zx - zy * zy + cr; zy = 2 * zx * zy + ci; zx = nx; if (zx * zx + zy * zy > 16) break; a = P(zx, zy); c.lineTo(a[0], a[1]); }
    c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(hover.x, hover.y, 3, 0, TAU); c.fill();
  }
  if (deep) { c.fillStyle = "rgba(255,210,120,.9)"; c.font = "11px Segoe UI,system-ui,sans-serif"; c.fillText("double-single precision", 12, h - 12); }
  return it;
}

// ---------------- The loop ----------------
let frame = 0, lastIt = 0;
ui.run(() => { }, dt => {
  lastIt = draw(dt); if (frame++ % 6) return;
  read.set("c", `${V.x.toPrecision(10)} ${V.y < 0 ? "−" : "+"} ${Math.abs(V.y).toPrecision(10)}i`); read.set("w", V.w.toExponential(2)); read.set("zoom", "× " + K.sig(3.2 / V.w)); read.set("it", lastIt);
  if (hover && mode !== "newton") { const q = toC(hover), n = mode === "mandel" ? escape(0, 0, q.x, q.y, lastIt) : escape(q.x, q.y, jc[0], jc[1], lastIt); read.set("hc", `${q.x.toFixed(6)} ${q.y < 0 ? "−" : "+"} ${Math.abs(q.y).toFixed(6)}i`); read.set("hn", n >= lastIt ? "never (in the set?)" : n); }
  ui.hud(`<b style="font-size:15px">${mode === "mandel" ? "Mandelbrot set" : mode === "julia" ? "Julia set" : "Newton's method: " + NEWTON[newton][0]}</b><br>× ${K.sig(3.2 / V.w)} magnification${tour ? " · zoom tour" : ""}`);
});
window.fracTest = { goTo, setMode, startTour, V: () => V };
ui.tip("Scroll to zoom · drag to move · click a point to open its Julia set · the picture is recomputed for every frame by the graphics card", 8000);
}
