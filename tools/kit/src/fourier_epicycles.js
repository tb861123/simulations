/* =====================================================================
   FOURIER EPICYCLES
   Any closed drawing can be traced by a chain of spinning circles.
   Walk round the drawing at a steady pace and write each point as a
   complex number z = x + iy. The DISCRETE FOURIER TRANSFORM splits that
   sequence into circles: circle k turns k times per lap, with radius |c_k|
   and starting angle arg(c_k), where

        c_k = (1/N) Σ z_n · e^(−2πi k n / N)      (k = …, −2, −1, 0, 1, 2, …)

   Put the circles end to end (each one riding on the rim of the one
   before) and the tip of the last traces the drawing:

        z(t) = Σ c_k · e^(2πi k t)

   Big, slow circles give the overall shape; small, fast ones add the
   detail. Keep only the M biggest and you get the best possible
   M-circle version of the drawing (in the least-squares sense).
   Ancient astronomers (Hipparchus, Ptolemy) used epicycles to model the
   planets' paths: they were doing Fourier series without knowing it.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2;
// ---------------- Shapes (closed paths) ----------------
const heart = () => Array.from({ length: 400 }, (_, i) => { const t = i / 400 * TAU; return [16 * Math.sin(t) ** 3 / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]; });
const star = () => Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + i * TAU / 10, r = i % 2 ? 0.4 : 1; return [r * Math.cos(a), r * Math.sin(a)]; });
const square = () => [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]];
const circle = () => Array.from({ length: 64 }, (_, i) => [0.8 * Math.cos(i * TAU / 64), 0.8 * Math.sin(i * TAU / 64)]);
// a flying bird (a gull), drawn as a polygon round its outline
const bird = () => [[-1, 0.05], [-0.75, 0.25], [-0.45, 0.32], [-0.2, 0.15], [-0.05, 0.02], [0.06, 0.08], [0.12, 0.16], [0.2, 0.15], [0.26, 0.1], [0.45, 0.3], [0.75, 0.33], [1, 0.12],
  [0.7, 0.18], [0.45, 0.08], [0.28, -0.02], [0.2, -0.12], [0.24, -0.22], [0.1, -0.2], [0.02, -0.28], [-0.02, -0.18], [-0.12, -0.08], [-0.3, 0.02], [-0.55, 0.08], [-0.8, 0.06]];
const SHAPES = { heart: ["Heart", heart], bird: ["Bird", bird], star: ["Star", star], square: ["Square", square], circle: ["Circle", circle] };
// walk round a polygon (closed) and take N points equally spaced along it
function resample(poly, N, shift = 0) {
  const n = poly.length, seg = []; let L = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); L += l; }
  const out = []; let i = 0, acc = 0;
  for (let k = 0; k < N; k++) { const s = ((k + shift) / N % 1) * L; while (i < n - 1 && acc + seg[i] < s) { acc += seg[i]; i++; } if (s < acc) { i = 0; acc = 0; while (i < n - 1 && acc + seg[i] < s) { acc += seg[i]; i++; } }
    const a = poly[i], b = poly[(i + 1) % n], f = seg[i] ? (s - acc) / seg[i] : 0; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
  return out;
}
// the discrete Fourier transform: one circle for each k from −N/2 to N/2 − 1, sorted biggest first
function dft(pts) {
  const N = pts.length, out = [];
  for (let k = -Math.floor(N / 2); k < Math.ceil(N / 2); k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const a = -TAU * k * n / N, c = Math.cos(a), s = Math.sin(a); re += pts[n][0] * c - pts[n][1] * s; im += pts[n][0] * s + pts[n][1] * c; } out.push({ k, re: re / N, im: im / N, r: Math.hypot(re, im) / N, ph: Math.atan2(im, re) }); }
  return out.sort((a, b) => b.r - a.r);
}
// the tip of a chain of the first M circles at time t (0–1 = one lap)
function tip(C, M, t) { let x = 0, y = 0; for (let j = 0; j < M && j < C.length; j++) { const c = C[j], a = TAU * c.k * t + c.ph; x += c.r * Math.cos(a); y += c.r * Math.sin(a); } return [x, y]; }
// root-mean-square distance between the drawing and its M-circle version, measured on a fine set of points along the drawing
function rmsError(poly, N, M, rand) {
  const rot = rand ? rand() * TAU : 0, shift = rand ? rand() : 0, cs = Math.cos(rot), sn = Math.sin(rot), P = poly.map(([x, y]) => [x * cs - y * sn, x * sn + y * cs]);
  const C = dft(resample(P, N, shift)), fine = resample(P, 4 * N, shift * 4); let s = 0; for (let i = 0; i < fine.length; i++) { const q = tip(C, M, i / fine.length); s += (q[0] - fine[i][0]) ** 2 + (q[1] - fine[i][1]) ** 2; } return Math.sqrt(s / fine.length);
}
// Parseval: the error at the sample points is exactly the square root of the sum of the left-out circles' radii squared
function parseval(poly, N, M) { const C = dft(resample(poly, N)); let s = 0; for (let j = M; j < C.length; j++) s += C[j].r * C[j].r; return Math.sqrt(s); }

if (typeof module !== "undefined") module.exports = { SHAPES, resample, dft, tip, rmsError, parseval };
else page();
function page() {
let shape = "heart", N = 256, M = 40, C = [], pts = [], t = 0, speed = 0.08, showCircles = true, showOrig = true, trail = [], drawing = null, audio = null;
const ui = K.app({
  title: "Fourier Epicycles", subject: "Explore",
  blurb: "Any drawing, rebuilt from spinning circles",
  reset: () => load("heart"),
  missions: [
    { title: "How few circles?", q: "Load the heart. Turn the number of circles down to 1, then 2, 3, 5, 10. When does it first look like a heart? When can you no longer tell it from the original?", hint: "1 circle: a circle (the average size and position). 2–3: an egg-like oval. By about 5–8 the heart's dimple and point appear; by 20 it is almost perfect. The big, slow circles carry most of the shape; the heart's sharp point and dent need many smaller, faster ones.", setup() { load("heart"); setM(3); } },
    { title: "Corners are expensive", q: "Compare the square with the circle. How many circles does each need to look right? Watch the corners of the square as you add circles.", hint: "The circle needs exactly one. The square's corners are sharp, and sharp changes need fast circles: its radii shrink only like 1/k², so even 50 circles leave slightly rounded corners. (Its symmetry helps: only every fourth k is used.) The batch run measures how the error falls.", setup() { load("square"); setM(5); } },
    { title: "Draw your own", q: "Choose ✏️ Draw and draw a shape with the mouse (it closes itself). How many circles does your drawing need? What makes a drawing need more?", hint: "Smooth, rounded shapes need few circles; sharp corners, zigzags and tiny details need many. The very fast circles are tiny: they only matter for fine detail. Your drawing has at most 256 points here, so 256 circles reproduce those points exactly.", setup() { setMode("draw"); } },
    { title: "Which way round?", q: "Look at the biggest circles of the bird. Some turn anticlockwise (k > 0) and some clockwise (k < 0). What would happen with only positive k?", hint: "With only anticlockwise circles you can make curves that loop the same way, but most shapes need both. A circle and a clockwise circle of the same size together make a straight back-and-forth line: that is how a real-valued wave (the x-coordinate alone) is built, and why sound only needs k ≥ 0.", setup() { load("bird"); setM(12); } },
    { title: "Hear the shape", q: "Press 🔊 Play the shape. The x-coordinate of the drawing, repeated 110 times a second, is played as a sound. Compare the circle, the heart and the star. Which sounds pure, which buzzy?", hint: "The circle's x is a pure sine wave: a pure note. The heart has a few strong harmonics: a soft, round tone. The star and square have many strong high harmonics (their corners), so they sound bright and buzzy. Turning down the number of circles removes harmonics, so the sound gets duller: a low-pass filter. Inside Sound and Build a Timbre explore this further.", setup() { load("circle"); setM(40); } }
  ],
  batch: [
    { title: "Error against circles: the heart", question: "How quickly does the M-circle version of the heart approach the real thing?", how: "Each run: the heart, turned to a random angle and started from a random point, 256 points; the error is the RMS distance between drawing and reconstruction on 1024 points along it (the heart is about 2 units across).", xLabel: "number of circles M", yLabel: "RMS error", xs: [1, 2, 3, 5, 8, 12, 20, 30, 50], reps: 4, yMin: 0, theory: M => parseval(SHAPES.heart[1](), 256, M), theoryLabel: "Parseval: √(Σ left-out r²)", run: (x, r) => rmsError(SHAPES.heart[1](), 256, x, r), note: "The error falls quickly at first (about 10% of the heart’s size with 1 circle, about 1.5% with 10) and then more slowly (about 0.1% with 50), because the heart has a sharp point at the bottom and a dent at the top, and sharp features need many fast circles. Parseval's theorem says the mean-square error at the sample points is exactly the sum of the left-out circles' radii squared; measured between the samples the error comes out very slightly smaller." },
    { title: "Error against circles: the square", question: "How does the error fall for a shape with sharp corners?", how: "As above, for the square (1.6 units across).", xLabel: "number of circles M", yLabel: "RMS error", xs: [1, 2, 3, 5, 8, 12, 20, 30, 50], reps: 4, yMin: 0, theory: M => parseval(SHAPES.square[1](), 256, M), theoryLabel: "Parseval", run: (x, r) => rmsError(SHAPES.square[1](), 256, x, r), note: "The square's circles shrink like 1/k² (because of its corners), so its error falls roughly like M^(−1.5): about 0.3% of its size with 10 circles and 0.03% with 50, but its corners stay slightly rounded however many you use. Its four-fold symmetry helps: only every fourth k (1, −3, 5, −7, …) is used at all." },
    { title: "How many circles for 1%?", question: "For each shape, how many circles are needed before the RMS error is under 1% of the shape's size?", how: "Each run: the shape at a random angle and start point; circles are added one at a time until the error is below 1% of the shape's width. Shapes: 1 circle, 2 heart, 3 bird, 4 star, 5 square.", xLabel: "shape (1 circle, 2 heart, 3 bird, 4 star, 5 square)", yLabel: "circles needed for 1% error", xs: [1, 2, 3, 4, 5], reps: 3, yMin: 0, run(x, r) { const key = ["circle", "heart", "bird", "star", "square"][x - 1], P = SHAPES[key][1](), xs = P.map(p => p[0]), w = Math.max(...xs) - Math.min(...xs); for (let m = 1; m <= 128; m++) if (rmsError(P, 128, m, r) < 0.01 * w) return m; return 128; }, note: "The circle needs exactly 1. The star (4) and the square (5) need few, because their symmetry means only every fifth or fourth k is used and a few big circles do most of the work. The heart (about 13) and the bird (about 16), with no such symmetry and with sharp points and thin wings, need more. This is the idea behind JPEG pictures and MP3 sound: most of a real signal is carried by a few big Fourier components, so the rest can be thrown away." }
  ],
  notes: `<h3>What is being modelled</h3>
<ul><li>The drawing is walked round at a steady pace and 256 points taken, equally spaced along it, as complex numbers z = x + iy.</li>
<li>The <b>discrete Fourier transform</b> gives 256 circles, c_k = (1/N) Σ z_n e^(−2πikn/N) for k = −128 … 127: circle k turns k times a lap (anticlockwise for k > 0, clockwise for k < 0), with radius |c_k| and starting angle arg c_k.</li>
<li>The circles are put end to end, biggest first; the tip of the last traces z(t) = Σ c_k e^(2πikt). Using only the M biggest circles gives the best possible M-circle approximation (least squares).</li>
<li><b>Sound</b>: the x-coordinate of the shape, built from the circles in use, repeated 110 times a second (the note A2), through a Web Audio periodic wave.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>256 sample points: details finer than 1/256 of the way round are lost, and with all 256 circles the drawing is reproduced exactly at those points (and smoothly between them).</li>
<li>A drawing with a gap is closed with a straight line from its end back to its start.</li>
<li>The Emanuel crest is not included: it cannot be traced reliably here, but you can draw it with ✏️ Draw.</li></ul>
<p>See also <a href="../../music/inside_sound/inside-sound.html">Inside Sound</a> and <a href="../../music/build_timbre/build-timbre.html">Build a Timbre</a> (Fourier series of sound waves in one dimension), and <a href="../../mathematics/complex_numbers/complex-numbers.html">Complex Numbers</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("The drawing");
ctl.shape = K.seg(g, { label: "Shape", value: shape, options: Object.keys(SHAPES).map(k => [k, SHAPES[k][0]]).concat([["draw", "✏️ Draw"]]), on: v => v === "draw" ? setMode("draw") : load(v) });
const drawNote = K.note(g, "Draw a closed shape with the mouse on the picture. Let go to see it rebuilt from circles.");
g = ui.group("Circles");
ctl.M = K.slider(g, { label: "Number of circles", min: 1, max: 256, step: 1, value: M, on: v => setM(v) });
const qr = K.row(g); [1, 2, 3, 5, 10, 20, 50, 256].forEach(n => K.btn(qr, String(n), () => setM(n), "small"));
ctl.speed = K.slider(g, { label: "Speed (laps a second)", min: 0.01, max: 0.5, step: 0.01, value: speed, fmt: v => v.toFixed(2), on: v => speed = v }); ui.headerSpeed(ctl.speed, { label: "Speed" });
ctl.circ = K.toggle(g, { label: "Show the circles", value: true, on: v => showCircles = v });
ctl.orig = K.toggle(g, { label: "Show the original drawing", value: true, on: v => showOrig = v });
let r1 = K.row(g); const bPlay = K.btn(r1, "🔊 Play the shape", () => toggleSound(), "primary"); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("fourier-epicycles", view, cv));
const read = K.readout(g, [["M", "circles"], ["err", "RMS error"], ["big", "biggest circle"], ["k", "fastest circle in use"]]);
function load(k) { shape = k; ctl.shape.set(k); drawNote.style.display = "none"; setPoly(SHAPES[k][1]()); }
function setMode(m) { if (m === "draw") { shape = "draw"; ctl.shape.set("draw"); drawNote.style.display = ""; drawing = []; trail = []; } }
let poly = null;
function setPoly(p) { poly = p; pts = resample(p, N); C = dft(pts); trail = []; t = 0; setM(Math.min(M, C.length)); }
function setM(m) { M = Math.max(1, Math.min(256, m | 0)); ctl.M.set(M); trail = []; if (audio) updateSound(); }

// ---------------- Sound: the x-coordinate as a waveform (circles k and −k combine into one harmonic) ----------------
function toggleSound() { if (audio) { audio.osc.stop(); audio.ctx.close(); audio = null; bPlay.innerHTML = "🔊 Play the shape"; return; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), osc = ctx.createOscillator(), gain = ctx.createGain(); gain.gain.value = 0.15; osc.frequency.value = 110; osc.connect(gain); gain.connect(ctx.destination);
  audio = { ctx, osc, gain }; updateSound(); osc.start(); bPlay.innerHTML = "🔇 Stop the sound"; }
function updateSound() { const H = 64, re = new Float32Array(H + 1), im = new Float32Array(H + 1);
  for (const c of C.slice(0, M)) { const h = Math.abs(c.k); if (!h || h > H) continue; re[h] += c.r * Math.cos(c.ph); im[h] += c.r * Math.sin(c.ph) * (c.k > 0 ? -1 : 1); }   // x(t) = Σ r cos(2πkt + φ): cosine part re, sine part im
  try { audio.osc.setPeriodicWave(audio.ctx.createPeriodicWave(re, im)); } catch (e) { } }

// ---------------- The graphics card: glowing lines and circles ----------------
const view = K.gl.create(ui.stage, { dprMax: 2 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let prog, geo;
if (ok) {
  prog = K.gl.program(gl, `precision highp float; attribute vec2 aPos; attribute vec4 aCol; attribute vec2 aSide; uniform vec2 uCanvas; varying vec4 vCol; varying float vD;
    void main() { gl_Position = vec4(aPos.x / uCanvas.x * 2.0 - 1.0, 1.0 - aPos.y / uCanvas.y * 2.0, 0.0, 1.0); vCol = aCol; vD = aSide.x; }`,
    `precision highp float; varying vec4 vCol; varying float vD; void main() { float a = exp(-vD * vD * 3.0); gl_FragColor = vec4(vCol.rgb * vCol.a * a, vCol.a * a); }`);
  geo = K.gl.points(gl, { aPos: 2, aCol: 4, aSide: 2 });
}
// every line segment becomes a quad (two triangles), with a soft edge across its width
const V = [], Cc = [], S = [];
function seg(x0, y0, x1, y1, w, col) { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L * w, ny = dx / L * w;
  V.push(x0 + nx, y0 + ny, x0 - nx, y0 - ny, x1 + nx, y1 + ny, x1 + nx, y1 + ny, x0 - nx, y0 - ny, x1 - nx, y1 - ny); for (let i = 0; i < 6; i++) Cc.push(...col); S.push(1, 0, -1, 0, 1, 0, 1, 0, -1, 0, -1, 0); }
function polyline(P, w, col, closed) { for (let i = 1; i < P.length; i++) seg(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], w, col); if (closed && P.length > 2) seg(P[P.length - 1][0], P[P.length - 1][1], P[0][0], P[0][1], w, col); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, d = view.dpr, sc = Math.min(w, h) * 0.42, X = x => (w / 2 + x * sc) * d, Y = y => (h / 2 - y * sc) * d; c.clearRect(0, 0, w, h);
  V.length = 0; Cc.length = 0; S.length = 0;
  if (showOrig && pts.length) polyline(pts.map(p => [X(p[0]), Y(p[1])]), 1.5 * d, [0.5, 0.55, 0.7, 0.35], true);
  if (drawing && drawing.length > 1) polyline(drawing.map(p => [X(p[0]), Y(p[1])]), 2 * d, [1, 1, 1, 0.8], false);
  if (C.length && !(drawing && drawing.length)) {
    // the chain of circles
    let x = 0, y = 0; const chain = [[x, y]];
    for (let j = 0; j < M; j++) { const q = C[j], a = TAU * q.k * t + q.ph; x += q.r * Math.cos(a); y += q.r * Math.sin(a); chain.push([x, y]); }
    if (showCircles) for (let j = 0; j < Math.min(M, 120); j++) { const q = C[j], [cx, cy] = chain[j], R = q.r * sc * d; if (R < 1.2) continue; const n = Math.max(16, Math.min(90, R / 2 | 0)), ring = []; for (let i = 0; i <= n; i++) ring.push([X(cx) + R * Math.cos(i * TAU / n), Y(cy) - R * Math.sin(i * TAU / n)]); polyline(ring, 0.8 * d, [0.35, 0.6, 1, 0.45], false); }
    if (showCircles) polyline(chain.map(p => [X(p[0]), Y(p[1])]), 1.2 * d, [0.85, 0.9, 1, 0.75], false);
    // the trace, brightest where the pen is now
    const n = trail.length; for (let i = 1; i < n; i++) { const a = i / n; seg(X(trail[i - 1][0]), Y(trail[i - 1][1]), X(trail[i][0]), Y(trail[i][1]), 2.6 * d, [1, 0.55 + 0.35 * a, 0.25 + 0.3 * a, 0.35 + 0.65 * a]); }
    c.fillStyle = "#ffd58a"; c.beginPath(); c.arc(X(x) / d, Y(y) / d, 4, 0, TAU); c.fill();
  }
  if (ok && V.length) { K.gl.bindTarget(gl, null); gl.clearColor(0.015, 0.02, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    geo.set("aPos", new Float32Array(V)).set("aCol", new Float32Array(Cc)).set("aSide", new Float32Array(S)); prog.set({ uCanvas: [view.el.width, view.el.height] }); geo.draw(prog, V.length / 2, gl.TRIANGLES); gl.disable(gl.BLEND); }
  else if (ok) { K.gl.bindTarget(gl, null); gl.clearColor(0.015, 0.02, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
}
// drawing with the mouse
const toW = p => { const sc = Math.min(cv.w, cv.h) * 0.42; return [(p.x - cv.w / 2) / sc, -(p.y - cv.h / 2) / sc]; };
K.pointer(cv.el, {
  down(p) { if (shape !== "draw") return; drawing = [toW(p)]; },
  drag(p) { if (shape !== "draw" || !drawing) return; const q = toW(p), l = drawing[drawing.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.01) drawing.push(q); },
  up() { if (shape !== "draw" || !drawing) return; if (drawing.length > 5) { const P = drawing; drawing = null; const cx = P.reduce((s, q) => s + q[0], 0) / P.length, cy = P.reduce((s, q) => s + q[1], 0) / P.length; setPoly(P.map(q => [q[0] - cx, q[1] - cy])); } else drawing = []; }
});
const chA = K.chart(ui.dock, { title: "Circle sizes (biggest first)", xLabel: "circle, in order of size", yLabel: "radius", yMin: 0 });
const chE = K.chart(ui.dock, { title: "Error against number of circles", xLabel: "circles M", yLabel: "RMS error" });

// ---------------- The loop ----------------
load("heart");
let fr = 0, lastT = 0;
ui.run(dt => { t = (t + speed * dt) % 1; if (t < lastT) trail = []; lastT = t; if (C.length) { trail.push(tip(C, M, t)); if (trail.length > 1200) trail.shift(); } }, () => {
  draw(); if (fr++ % 10 || !C.length) return;
  chA.draw([{ pts: C.slice(0, 60).map((q, i) => [i + 1, q.r]), type: "bars", w: 0.8, color: K.cssVar("--s0") }], { vlines: [{ x: M + 0.5, color: K.cssVar("--s1"), label: "in use" }] });
  if (fr % 60 === 1) { const E = []; for (const m of [1, 2, 3, 5, 8, 12, 20, 30, 50, 80, 128, 256]) E.push([m, parseval(poly, N, m)]); chE.draw([{ pts: E, color: K.cssVar("--s2") }], { vlines: [{ x: M, color: K.cssVar("--s1") }] }); }
  read.set("M", M + " of " + C.length); read.set("err", parseval(poly, N, M).toExponential(2)); read.set("big", "r = " + C[0].r.toFixed(3) + ", k = " + C[0].k);
  read.set("k", Math.max(...C.slice(0, M).map(q => Math.abs(q.k))) + " turns a lap");
  ui.hud(`<b style="font-size:15px">${shape === "draw" ? "Your drawing" : SHAPES[shape][0]}</b><br>${M} circle${M > 1 ? "s" : ""}`);
});
window.fourierTest = { load, setM, setT: v => { t = v; } };
ui.tip("Each circle turns at a whole number of laps; together their tips trace the drawing · change the number of circles", 8000);
}
