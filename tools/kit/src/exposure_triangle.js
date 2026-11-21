/* =====================================================================
   THE EXPOSURE TRIANGLE
   A camera collects light. How much reaches each part of the sensor
   (or film) depends on three settings:
     APERTURE  f-number N = focal length ÷ diameter of the opening.
               Light ∝ 1 ÷ N²: each full stop (f/2 → f/2.8 → f/4 …) halves it.
               A wide aperture (small N) gives a SHALLOW DEPTH OF FIELD.
     SHUTTER   time t the sensor is exposed. Light ∝ t. A long time blurs
               anything that moves (MOTION BLUR) and shows CAMERA SHAKE.
     ISO       how much the signal is amplified. It does not add light:
               fewer photons, amplified more, means more visible NOISE,
               because light arrives as random photons (shot noise ∝ √n).
   EXPOSURE VALUE  EV = log₂(N² ÷ t) at ISO 100; one stop = a factor of 2.
   SUNNY 16 RULE   in bright sun, f/16 at 1/ISO seconds gives a good exposure.
   DEPTH OF FIELD  a point at distance d, when the lens is focused at s,
   makes a blur circle on the sensor of diameter
               c = f² ÷ (N (s − f)) × |d − s| ÷ d
   It looks sharp if c is smaller than about 0.03 mm (full frame).
   The film view: a film's characteristic curve (density against log
   exposure) and how development time and temperature set its contrast.
   ===================================================================== */
const clamp = K.clamp;
// ---------------- camera constants ----------------
const W = 384, H = 216, SENSOR = 36, FOCAL = 85, COC = 0.03, FULLWELL = 40000, READ = 3;   // image size (px), sensor width (mm), lens (mm), acceptable blur (mm), electrons
const PX_PER_MM = W / SENSOR;
const STOPS_N = [1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
const SHUT = [1 / 4000, 1 / 3200, 1 / 2500, 1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800, 1 / 640, 1 / 500, 1 / 400, 1 / 320, 1 / 250, 1 / 200, 1 / 160, 1 / 125, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40, 1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13, 1 / 10, 1 / 8, 1 / 6, 1 / 5, 1 / 4, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4];
const ISOS = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600];
const fmtT = t => t >= 0.3 ? (Math.round(t * 10) / 10) + " s" : "1/" + Math.round(1 / t) + " s";
// light levels (how bright the scene is compared with bright sun), in stops below sun
const LIGHT = { sun: [0, "bright sun"], cloud: [-3, "overcast"], shade: [-4, "open shade"], indoor: [-7, "indoors"], dusk: [-9, "dusk"], night: [-11, "street at night"] };
// blur circle on the sensor (mm) for a point at distance d (m), focused at s (m), f-number N
const cocMM = (d, s, N, f = FOCAL) => f * f / (N * (s * 1000 - f)) * Math.abs(d - s) / d;
// near and far limits of acceptable sharpness (m), from the hyperfocal distance Hf = f² ÷ (N c)
function dofLimits(s, N, f = FOCAL, c = COC) { const Hf = f * f / (N * c) / 1000, near = Hf * s / (Hf + s), far = s < Hf ? Hf * s / (Hf - s) : Infinity; return { near, far, Hf }; }
// the electrons collected for a patch of brightness L (fraction of a white card in sun) — calibrated so the Sunny 16 rule gives mid-grey (18%) half-way up the scale
const exposureFactor = (N, t, light) => Math.pow(2, light) * (t * 100) * Math.pow(16 / N, 2);
const sigOf = (L, N, t, iso, light) => L * exposureFactor(N, t, light) * (iso / 100);    // displayed level before noise and clipping (1 = clipped)

// ---------------- the scene: layers at different distances, drawn once into linear-light arrays ----------------
function mkCanvas() { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
const toLin = v => Math.pow(v / 255, 2.2);
function layerFrom(draw, gain = 1) {   // draw with the 2D canvas, then convert to linear RGB × gain with alpha (premultiplied)
  const cv = mkCanvas(), c = cv.getContext("2d"); draw(c); const d = c.getImageData(0, 0, W, H).data, n = W * H, L = { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), a: new Float32Array(n) };
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; L.a[i] = a; L.r[i] = toLin(d[i * 4]) * gain * a; L.g[i] = toLin(d[i * 4 + 1]) * gain * a; L.b[i] = toLin(d[i * 4 + 2]) * gain * a; }
  return L;
}
let SCENE = null;
function buildScene() {
  const bg = layerFrom(c => {
    const g = c.createLinearGradient(0, 0, 0, H * 0.55); g.addColorStop(0, "#9cc4ff"); g.addColorStop(1, "#e8f1ff"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "#fff8e0"; c.beginPath(); c.arc(W * 0.86, H * 0.12, 9, 0, 6.3); c.fill();                       // the sun (clips at almost any exposure)
    const bld = [[0, 60, 70, "#c9b7a0"], [62, 40, 55, "#b08f72"], [110, 78, 60, "#d8cfc2"], [178, 50, 48, "#9e8a7a"], [232, 90, 70, "#c4b29b"], [308, 58, 80, "#a8a39b"]];
    for (const [x, hh, ww, col] of bld) { c.fillStyle = col; c.fillRect(x, H * 0.62 - hh, ww, hh); c.fillStyle = "#3a3f4a"; for (let wy = H * 0.62 - hh + 6; wy < H * 0.62 - 8; wy += 12) for (let wx = x + 5; wx < x + ww - 6; wx += 11) c.fillRect(wx, wy, 6, 7); }
    c.fillStyle = "#7a8a5a"; c.fillRect(0, H * 0.62, W, H); c.fillStyle = "#8a8f96"; c.fillRect(0, H * 0.7, W, H * 0.12);   // grass and road
  }, 1.6);
  const cyc = layerFrom(c => {   // a cyclist, drawn at the left edge; shifted across later
    c.strokeStyle = "#20242c"; c.lineWidth = 2.5; c.beginPath(); c.arc(14, H * 0.78, 9, 0, 6.3); c.arc(44, H * 0.78, 9, 0, 6.3); c.stroke();
    c.beginPath(); c.moveTo(14, H * 0.78); c.lineTo(28, H * 0.66); c.lineTo(44, H * 0.78); c.stroke();
    c.fillStyle = "#e04848"; c.fillRect(24, H * 0.55, 10, 16); c.fillStyle = "#f1c9a5"; c.beginPath(); c.arc(30, H * 0.52, 5, 0, 6.3); c.fill();
  }, 1.2);
  const subj = layerFrom(c => {  // the person you are photographing, in front of a lamp post
    const x = W * 0.42; c.fillStyle = "#2d3e63"; c.fillRect(x - 22, H * 0.48, 44, H * 0.52);                       // coat
    c.fillStyle = "#e7b894"; c.beginPath(); c.ellipse(x, H * 0.37, 17, 21, 0, 0, 6.3); c.fill();                      // face
    c.fillStyle = "#3b2618"; c.beginPath(); c.ellipse(x, H * 0.3, 18, 13, 0, Math.PI, 2 * Math.PI); c.fill();          // hair
    c.fillStyle = "#1b1b1b"; c.fillRect(x - 8, H * 0.35, 4, 3); c.fillRect(x + 4, H * 0.35, 4, 3);                    // eyes: the place to focus
    c.fillStyle = "#c2412f"; c.fillRect(x - 6, H * 0.44, 12, 2);
    c.fillStyle = "#ffffff"; c.fillRect(x - 3, H * 0.55, 6, 20);                                                       // a white shirt: watch it clip
  }, 0.9);
  const fg = layerFrom(c => {    // flowers close to the camera
    for (const [x, y, col] of [[18, 190, "#ffd23f"], [40, 200, "#ff6b9a"], [300, 196, "#ffd23f"], [330, 186, "#c87bff"], [360, 202, "#ff6b9a"]]) {
      c.strokeStyle = "#3f7d3a"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, H); c.stroke();
      c.fillStyle = col; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + 8 * Math.cos(k), y + 8 * Math.sin(k), 6, 0, 6.3); c.fill(); } c.fillStyle = "#6b4a1e"; c.beginPath(); c.arc(x, y, 4, 0, 6.3); c.fill(); }
  }, 1);
  SCENE = { layers: [{ L: bg, d: 40 }, { L: cyc, d: 10, moving: true }, { L: subj, d: 3 }, { L: fg, d: 1.2 }] };
}
// blur helpers: a box blur of radius r, applied twice (close to a Gaussian), and a sideways box for motion
function boxH(src, dst, r, len) { if (r < 1 && !len) { dst.set(src); return; } const L = len || 2 * r + 1, h = len ? 0 : r; for (let y = 0; y < H; y++) { let s = 0; const o = y * W; for (let x = -h; x < L - h; x++) s += src[o + clamp(x, 0, W - 1)]; for (let x = 0; x < W; x++) { dst[o + x] = s / L; s += src[o + clamp(x + L - h, 0, W - 1)] - src[o + clamp(x - h, 0, W - 1)]; } } }
function boxV(src, dst, r) { if (r < 1) { dst.set(src); return; } const L = 2 * r + 1; for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += src[clamp(y, 0, H - 1) * W + x]; for (let y = 0; y < H; y++) { dst[y * W + x] = s / L; s += src[clamp(y + r + 1, 0, H - 1) * W + x] - src[clamp(y - r, 0, H - 1) * W + x]; } } }
const tmpA = new Float32Array(W * H), tmpB = new Float32Array(W * H);
function blurLayer(L, r, motion, shakeX, shakeY) {
  const out = {}; for (const k of ["r", "g", "b", "a"]) {
    let a = L[k], o = new Float32Array(W * H);
    const rr = Math.round(r / 2);               // two passes of radius r/2 ≈ a blur of radius r
    boxH(a, tmpA, rr); boxV(tmpA, tmpB, rr); boxH(tmpB, tmpA, rr); boxV(tmpA, o, rr);
    if (motion >= 2) { boxH(o, tmpA, 0, Math.round(motion)); o.set(tmpA); }
    if (shakeX >= 2) { boxH(o, tmpA, 0, Math.round(shakeX)); o.set(tmpA); }
    if (shakeY >= 2) { boxV(o, tmpA, Math.round(shakeY / 2)); o.set(tmpA); }
    out[k] = o;
  } return out;
}
// combine the layers far to near ('over' compositing) into one linear image
function composite(set) {
  const n = W * H, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (const { L, shift } of set) { const s = shift | 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = x - s; if (sx < 0 || sx >= W) continue; const j = y * W + sx, i = y * W + x, a = L.a[j]; R[i] = R[i] * (1 - a) + L.r[j]; G[i] = G[i] * (1 - a) + L.g[j]; B[i] = B[i] * (1 - a) + L.b[j]; } }
  return { R, G, B };
}

// ---------------- the camera: photons → electrons → amplified → clipped → displayed ----------------
// noise table: many Gaussian random numbers, reused (fast)
const GN = (() => { const r = K.rng(99), a = new Float32Array(1 << 16); for (let i = 0; i < a.length; i++) a[i] = r.gauss(); return a; })();
function expose(img, o, r, out) {
  const fac = exposureFactor(o.N, o.t, LIGHT[o.light][0]), gain = o.iso / 100, n = W * H; let gi = r.int(GN.length), clipped = 0, lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let Y = 0; const ch = [img.R[i], img.G[i], img.B[i]];
    for (let k = 0; k < 3; k++) {
      const e = ch[k] * fac * FULLWELL;                                        // electrons collected (before amplification)
      let v = e + Math.sqrt(Math.max(e, 0)) * GN[gi++ & 65535] + READ * GN[gi++ & 65535];   // shot noise ∝ √n, plus read noise
      v = Math.min(v, FULLWELL) / FULLWELL * gain;                            // full sensor well, then ISO amplification
      v = clamp(v, 0, 1); ch[k] = v; Y += [0.2126, 0.7152, 0.0722][k] * v;
    }
    if (Y >= 0.995) clipped++; lum[i] = Y;
    if (out) { const j = i * 4; out[j] = 255 * Math.pow(ch[0], 1 / 2.2); out[j + 1] = 255 * Math.pow(ch[1], 1 / 2.2); out[j + 2] = 255 * Math.pow(ch[2], 1 / 2.2); out[j + 3] = 255; }
  }
  return { lum, clipped: clipped / n };
}
// meter: the average brightness, weighted to the centre, should come out as mid-grey (18%)
function meterLevel(img) { let s = 0, w = 0; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = y * W + x, wt = 1 + 2 * Math.exp(-(((x - W / 2) / (W * 0.25)) ** 2 + ((y - H / 2) / (H * 0.3)) ** 2)); s += wt * (0.2126 * img.R[i] + 0.7152 * img.G[i] + 0.0722 * img.B[i]); w += wt; } return s / w; }

// ---------------- film: the characteristic (H&D) curve ----------------
// density D = fog + γ × (log₁₀ H − toe), smoothed at the toe and the shoulder. Contrast γ grows with development time:
//   γ = γmax × (1 − e^(−k t)), with k faster at higher temperature (about ×1.1 per °C above 20 °C)
const devRate = T => 0.12 * Math.pow(1.1, T - 20);
const gammaOf = (tmin, T) => 0.95 * (1 - Math.exp(-devRate(T) * tmin));
const softplus = (v, k) => Math.log(1 + Math.exp(k * v)) / k;
function density(logH, gam, speedShift = 0) { const x = logH + speedShift, fog = 0.15, dmax = 2.6; const D = fog + gam * softplus(x + 2.2, 5); return dmax - softplus(dmax - D, 6); }   // toe (smooth start), straight line of slope γ, shoulder (smooth stop at dmax)

// ---------------- The page ----------------
const P = { view: "camera", mode: "M", Ni: 15, ti: 10, ii: 0, comp: 0, light: "sun", focus: 3, speed: 6, tripod: false, film: { dev: 8, T: 20, push: 0, grade: 2 } };
let rnd = K.rng(Date.now() % 99991 + 17), blurred = null, cache = "", tAnim = 0, shake = [0, 0], lastShot = null, img = null, imgData = null, needShot = true;
const Np = () => STOPS_N[P.Ni], Tp = () => SHUT[P.ti], ISOp = () => ISOS[P.ii];
const ui = K.app({
  title: "The Exposure Triangle", subject: "Photography",
  blurb: "Aperture, shutter speed and ISO: exposure, depth of field, motion blur, camera shake and noise, with a live histogram",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "AQA GCSE Art and Design: Photography (8206): aperture, shutter speed, ISO and exposure; depth of field; movement (freezing and blurring); using the camera's modes and meter; the histogram.",
      adv: "AQA A level Art and Design: Photography (7206) 3.8: 'appreciation of viewpoint, composition, aperture, depth of field, shutter speed and movement'; film and digital processes; the darkroom. The science (photon noise, circle of confusion, the characteristic curve) is context from A level Physics."
    }
  },
  missions: [
    { title: "Sunny 16", q: "Bright sun, ISO 100, shutter 1/100 s. Which aperture gives a good exposure (the meter at 0 and a histogram in the middle)? Now halve the shutter time: how many stops must you open the aperture?", hint: "f/16 at 1/ISO seconds in bright sun: the Sunny 16 rule. Halving the time loses one stop of light, so open up one stop (f/16 → f/11). Each full stop of aperture multiplies N by √2 (1.4): light ∝ 1/N².", setup() { set({ Ni: 21, ti: 16, ii: 0 }); } },
    { title: "Same exposure, different picture", q: "Use aperture priority (A) and change the aperture from f/1.4 to f/16. The camera keeps the exposure the same. What changes in the photograph?", hint: "Each stop narrower doubles the shutter time, so the brightness stays the same (reciprocity). But the background and the flowers get sharper (more depth of field), and the cyclist gets more blurred (longer time). There is no free lunch: every setting has a side effect.", setup() { set({ mode: "A", Ni: 0, light: "cloud" }); } },
    { title: "A blurred background", q: "Focus on the person (3 m). Find the settings that blur the buildings and the flowers the most while keeping the face sharp. Read the depth of field limits.", hint: "Widest aperture (f/1.4): the zone of sharpness is only a few centimetres deep at 3 m, so everything else melts away. Portrait photographers use this to separate the subject from a busy background (bokeh).", setup() { set({ mode: "A", Ni: 0, focus: 3, light: "cloud" }); } },
    { title: "Freeze or blur the cyclist", q: "Shutter priority (S). Find the slowest shutter speed that freezes the cyclist (about 6 m/s). Then choose a slow speed to show movement.", hint: "The blur length on the image = speed × time × magnification. At 1/1000 s the cyclist moves 6 mm: frozen. At 1/30 s, 20 cm: a streak. Freezing needs short times (and so wide apertures or high ISO); slow shutter speeds can express movement creatively.", setup() { set({ mode: "S", ti: 6 }); } },
    { title: "Handheld at dusk", q: "Dusk light, aperture priority at f/8, ISO 100. Is the photo sharp? Raise the ISO, or switch on the tripod. Which solves the problem, and what does each cost?", hint: "The camera chooses a long shutter time, and hand shake blurs everything (rule of thumb: at least 1/focal length seconds, here 1/85 s). A tripod fixes shake but not a moving subject. Raising the ISO allows a short time, but fewer photons means more noise: the image looks grainy, especially in the shadows.", setup() { set({ mode: "A", Ni: 15, light: "dusk", ii: 0 }); } },
    { title: "Where does noise come from?", q: "Indoors, manual. Compare ISO 100 at 1/4 s with ISO 6400 at 1/250 s (same brightness on screen). Which is noisier, and why does amplifying the signal not help?", hint: "Light arrives as random photons. With n photons the random variation is about √n, so the signal-to-noise ratio is √n. The short exposure collects 64 times fewer photons, so it is 8 times noisier; ISO only turns up the volume, noise and all.", setup() { set({ light: "indoor", Ni: 12, ti: 30, ii: 0, tripod: true }); } },
    { title: "Read the histogram", q: "Make the white shirt clip (spikes at the right edge of the histogram), then underexpose until the shadows block up. Use exposure compensation to get the best compromise.", hint: "A histogram shows how many pixels have each brightness. A spike at the right means highlights are clipped: no detail can be recovered. 'Expose to the right' (as bright as possible without clipping) gives the least noise in a digital image.", setup() { set({ mode: "A", Ni: 9, comp: 2 }); } },
    { title: "Developing film", lvl: "adv", q: "Switch to film and the darkroom. Increase the development time from 4 to 16 minutes. What happens to the film's contrast (the slope of the curve)? What does 'pushing' a film do?", hint: "Longer development (or a warmer developer) builds more density in the exposed parts than in the shadows, so the slope γ (contrast) rises, approaching a limit. Pushing (underexposing, then developing longer) recovers mid-tones and highlights but not shadow detail, and raises contrast and grain.", setup() { set({ view: "film" }); } }
  ],
  batch: [
    { title: "Reciprocity: equal exposures", question: "If the shutter time is doubled for each stop the aperture is closed, does the image brightness stay the same?", how: "Bright sun, ISO 100, apertures f/2 to f/22; shutter time set so N² ÷ t is constant (EV 15). The mid-grey card's displayed level (with photon noise) is measured, 30 pixels per run. Theory: 18% (mid-grey).", xLabel: "f-number N", yLabel: "mid-grey level (%)", xs: [2, 2.8, 4, 5.6, 8, 11, 16, 22], reps: 5, yMin: 0, yMax: 30, theory: () => 18, theoryLabel: "mid-grey (18%)", run: (x, r) => { const t = (x * x) / Math.pow(2, 14.64); let s = 0; for (let i = 0; i < 30; i++) { const e = 0.18 * exposureFactor(x, t, 0) * FULLWELL; s += (e + Math.sqrt(e) * r.gauss() + READ * r.gauss()) / FULLWELL; } return 100 * s / 30; }, note: "Each stop closed (N × √2) halves the light, and each doubled time doubles it back, so the level stays at 18%. This is reciprocity. (Film fails it at very long times; sensors do not.)" },
    { title: "Noise and ISO", question: "At the same brightness on screen, how does the signal-to-noise ratio of a mid-grey patch depend on the ISO?", how: "Each ISO gets one stop less light per doubling (shorter shutter), so the picture looks equally bright. SNR = mean ÷ SD of 400 mid-grey pixels. Theory: SNR = n ÷ √(n + read²), n = electrons collected.", xLabel: "ISO", yLabel: "signal-to-noise ratio", xs: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600], reps: 4, yMin: 0, theory: x => { const n = 0.18 * FULLWELL * 100 / x; return n / Math.sqrt(n + READ * READ); }, theoryLabel: "√n theory", run: (x, r) => { const n = 0.18 * FULLWELL * 100 / x, v = []; for (let i = 0; i < 400; i++) v.push(n + Math.sqrt(n) * r.gauss() + READ * r.gauss()); return K.mean(v) / K.sd(v); }, note: "Doubling the ISO halves the light collected, so the SNR falls by √2 each time: from about 85 at ISO 100 to about 5 at ISO 25600. At very high ISO the read noise adds to the shot noise." },
    { title: "Depth of field and autofocus misses", question: "If autofocus misses by a random amount (SD 5 cm at 3 m), what share of portraits are sharp, at each aperture?", how: "85 mm lens focused on eyes 3 m away; focus error Gaussian with SD 5 cm; 'sharp' if the eyes' blur circle is under 0.03 mm. 200 shots per run. Theory: P(|error| < half the depth of field) for a Gaussian.", xLabel: "f-number N", yLabel: "sharp portraits (%)", xs: [1.4, 2, 2.8, 4, 5.6, 8], reps: 5, yMin: 0, yMax: 102, theory: x => { const L = dofLimits(3, x), h = Math.min(3 - L.near, L.far - 3); return 100 * (2 * normCdf(h / 0.05) - 1); }, theoryLabel: "Gaussian theory", run: (x, r) => { let k = 0; for (let i = 0; i < 200; i++) { const s = 3 + 0.05 * r.gauss(); if (cocMM(3, s, x) < COC) k++; } return 100 * k / 200; }, note: "At f/1.4 the depth of field at 3 m is only about ±5 cm, so a small focusing error loses the eyes. Stopping down to f/4 makes almost every shot sharp. (The tiny difference from theory: the zone of sharpness is a little deeper behind the subject than in front.)" },
    { title: "Shutter speed and motion blur", question: "How long is the blur of a cyclist (speed varies, mean 6 m/s, SD 1.5 m/s) at each shutter speed?", how: "The cyclist's movement during the exposure, in centimetres. Theory: mean speed × time.", xLabel: "shutter time (ms)", yLabel: "movement during exposure (cm)", xs: [1, 2, 4, 8, 16, 33, 67], reps: 20, yMin: 0, theory: x => 6 * x / 1000 * 100, theoryLabel: "speed × time", fit: true, run: (x, r) => Math.max(0, 6 + 1.5 * r.gauss()) * x / 1000 * 100, note: "Blur grows in proportion to the time: a straight line through the origin, gradient = mean speed. Halving the time halves the blur, at the cost of one stop of light." },
    { title: "Handheld: the 1/focal length rule", question: "With a hand-held 85 mm lens, what share of shots are free of visible shake at each shutter speed?", how: "Hand shake: random angular speed (each direction Gaussian, SD 0.02 radians a second). Blur on the sensor = angular speed × time × focal length; sharp if under 0.03 mm. 300 shots per run. Theory: 1 − e^(−c²/2σ²) (a Rayleigh distribution).", xLabel: "shutter time (ms)", yLabel: "sharp shots (%)", xs: [2, 4, 8, 12, 17, 25, 33, 50, 100], reps: 4, yMin: 0, yMax: 102, theory: x => { const sg = 0.02 * x / 1000 * FOCAL; return 100 * (1 - Math.exp(-COC * COC / (2 * sg * sg))); }, theoryLabel: "Rayleigh theory", run: (x, r) => { let k = 0; for (let i = 0; i < 300; i++) { const wx = 0.02 * r.gauss(), wy = 0.02 * r.gauss(), b = Math.hypot(wx, wy) * x / 1000 * FOCAL; if (b < COC) k++; } return 100 * k / 300; }, note: "At 1/85 s (12 ms, the 'one over focal length' rule) about two thirds of shots are sharp; at 1/250 s almost all are. Image stabilisation reduces the shake, which shifts this curve to the right." },
    { title: "Film: development time and contrast", lvl: "adv", question: "How does the film's contrast (γ) depend on development time, if the developer temperature varies a little (SD 0.7 °C around 20 °C)?", how: "γ measured from the straight part of the characteristic curve. Theory: γ = 0.95 (1 − e^(−0.12 t)) at exactly 20 °C.", xLabel: "development time (min)", yLabel: "contrast γ", xs: [2, 4, 6, 8, 10, 12, 16, 20], reps: 6, yMin: 0, yMax: 1, theory: x => gammaOf(x, 20), theoryLabel: "20 °C", run: (x, r) => { const T = 20 + 0.7 * r.gauss(), g = gammaOf(x, T); return (density(-0.5, g) - density(-1.5, g)) / 1; }, note: "Contrast rises quickly at first, then levels off: the developer runs out of silver halide to reduce in the most exposed areas. A one-degree error changes the rate by about 10%, which is why darkrooms control temperature so carefully." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Exposure", text: "The exposure triangle: aperture (f-number), shutter speed and ISO. One stop = double or half the light. Full stops of aperture: f/1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22 (each × √2, so the area halves)." },
      { lvl: "std", tag: "Aperture", text: "A wide aperture (small f-number) lets in more light and gives a shallow depth of field (blurred background, as in portraits); a narrow aperture (f/16) gives a deep depth of field (landscapes)." },
      { lvl: "std", tag: "Shutter", text: "A fast shutter (1/1000 s) freezes movement; a slow shutter (1/15 s or longer) shows motion blur and needs a tripod to avoid camera shake. Hand-held rule: at least 1/focal length seconds." },
      { lvl: "std", tag: "ISO", text: "A higher ISO amplifies the signal, allowing faster shutter speeds or smaller apertures in low light, but the image is noisier (grain)." },
      { lvl: "std", tag: "Histogram", text: "The histogram shows how many pixels have each brightness: shadows at the left, highlights at the right. A spike at an edge means detail is lost (clipped). Exposure compensation (+/−) tells the camera to make the picture brighter or darker than the meter suggests." },
      { lvl: "adv", tag: "7206 3.8", text: "Depth of field depends on aperture, focal length and subject distance: c = f²/(N(s − f)) × |d − s|/d. The hyperfocal distance Hf = f²/(N c): focus there and everything from Hf/2 to infinity is sharp." },
      { lvl: "adv", tag: "7206: film", text: "Film's characteristic curve: density against log exposure, with a toe (shadows), straight line (slope γ = contrast) and shoulder (highlights). Longer or warmer development raises γ. Pushing a film (rating it at a higher ISO and developing longer) increases contrast and grain." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Photon (shot) noise: with n photons the standard deviation is √n, so SNR = √n. A sensor's signal is set by the light collected (aperture and time), not by the ISO." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A correct exposure is 1/250 s at f/8. Give the shutter speed for the same exposure at f/5.6, and say one way the photograph would look different.", ans: "<ul><li>f/5.6 is one stop wider, so the time is halved: 1/500 s</li><li>shallower depth of field (more background blur), or moving things more frozen</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why a photographer at a football match at night would raise the ISO.", ans: "<ul><li>little light, and fast-moving players need a short shutter time to freeze them</li><li>the widest aperture may still not let in enough light</li><li>a higher ISO amplifies the signal so the picture is bright enough (at the cost of more noise)</li></ul>" },
      { lvl: "std", marks: 3, q: () => `The camera is set to ${"f/" + Np()}, ${fmtT(Tp())} and ISO ${ISOp()}. How many stops brighter would the image be at f/${Np() >= 2.8 ? STOPS_N[Math.max(0, P.Ni - 6)] : Np()}, ${fmtT(Tp())}, ISO ${ISOp() * 2}? Explain.`, ans: "<ul><li>each step of three on the f-number scale here is one stop; two stops wider = 4 × the light (if the f-number has halved)</li><li>doubling the ISO adds one more stop</li><li>so about 3 stops (8 × brighter), unless the aperture was already at its widest</li></ul>" },
      { lvl: "adv", marks: 4, q: "An 85 mm lens is focused at 3 m at f/2. Using c = f²/(N(s − f)) × |d − s|/d, find the blur circle for a building 40 m away, and say whether it will look sharp (limit 0.03 mm).", ans: "<ul><li>f² = 7225 mm²; N(s − f) = 2 × 2915 = 5830 mm</li><li>|d − s|/d = 37/40 = 0.925</li><li>c = 7225/5830 × 0.925 ≈ 1.15 mm</li><li>far bigger than 0.03 mm, so very blurred (about 38 times the limit)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why two photographs that look equally bright, taken at ISO 100 and ISO 6400, differ in noise.", ans: "<ul><li>the ISO 6400 shot collected 64 times fewer photons (shorter time or smaller aperture)</li><li>photon arrival is random: noise ∝ √n, so SNR ∝ √n</li><li>√64 = 8, so the ISO 6400 image has about 8 times lower SNR; amplification raises signal and noise together</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p><b>The scene</b> is drawn in layers at set distances: buildings and sky (40 m), a cyclist (10 m, 6 m/s), a person (3 m) and flowers (1.2 m). Brightness is in linear light, scaled by the light level (bright sun, then fewer stops for overcast, shade, indoors, dusk and night).</p>
<p><b>The lens</b> is an 85 mm lens on a full-frame (36 mm) sensor. Each layer is blurred by its circle of confusion c = f²/(N(s − f)) × |d − s|/d for the focus distance s. The cyclist is smeared sideways by speed × time; without a tripod, hand shake smears everything by a random angular speed × time × focal length (redrawn for each shot).</p>
<p><b>The sensor</b> collects electrons in proportion to brightness × time ÷ N², calibrated so the Sunny 16 rule (f/16, 1/ISO s in sun) puts an 18% grey card at 18%. Each pixel gets photon noise (SD √n) and read noise (3 electrons), saturates at 40,000 electrons, then is amplified by ISO ÷ 100 and clipped at white. The display applies a gamma of 1/2.2.</p>
<p><b>Modes</b>: M (you set everything), A (you set the aperture, the camera sets the time), S (you set the time, the camera sets the aperture), P (the camera sets both). The meter weights the centre and aims for mid-grey, adjusted by exposure compensation.</p>
<p><b>Film</b>: density = fog + a smoothed straight line of slope γ against log₁₀ exposure, up to a maximum density. γ = 0.95(1 − e^(−kt)), with the rate k rising about 10% per °C.</p>
<h3>Assumptions and simplifications</h3>
<ul><li>Each object is at one distance (no gradual blur along the ground); lens blur is a smooth blob, not the real shape of the aperture (no polygonal bokeh), and there is no diffraction (which softens images beyond about f/16).</li>
<li>Noise is the same in every colour channel and there is no noise reduction or JPEG processing; real cameras smooth noise away.</li>
<li>The meter, modes and stops are simplified versions of a real camera's. ISO is applied after the sensor (as in most digital cameras).</li>
<li>The film model is a smooth curve, not a measured film; grain, reciprocity failure and paper grades are described but not simulated in detail.</li></ul>
<p>Lenses, focal length and perspective are in <b>Lens Optics</b>; colour and lighting in <b>Light and Colour</b>; pixels and compression in <b>Composition and Pixels</b>.</p>`
});
function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }

// ---------------- Controls ----------------
const ctl = {}, groups = {};
let g = ui.group("What to show");
ctl.view = K.seg(g, { value: "camera", options: [["camera", "📷 Camera"], ["film", "🎞️ Film and darkroom"]], on: v => { P.view = v; showGroups(); } });
g = groups.camera = ui.group("Camera");
ctl.mode = K.seg(g, { label: "Mode", value: "M", options: [["M", "M"], ["A", "A (aperture priority)"], ["S", "S (shutter priority)"], ["P", "P (auto)"]], on: v => { P.mode = v; changed(); } });
ctl.N = K.slider(g, { label: "Aperture", min: 0, max: STOPS_N.length - 1, step: 1, value: P.Ni, fmt: i => "f/" + STOPS_N[i], on: v => { P.Ni = v; changed(); } });
ctl.t = K.slider(g, { label: "Shutter speed", min: 0, max: SHUT.length - 1, step: 1, value: P.ti, fmt: i => fmtT(SHUT[i]), on: v => { P.ti = v; changed(); } });
ctl.iso = K.slider(g, { label: "ISO", min: 0, max: ISOS.length - 1, step: 1, value: P.ii, fmt: i => "ISO " + ISOS[i], on: v => { P.ii = v; changed(); } });
ctl.comp = K.slider(g, { label: "Exposure compensation", min: -3, max: 3, step: 1 / 3, value: 0, fmt: v => Math.abs(v) < 0.01 ? "±0 EV" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(1) + " EV", on: v => { P.comp = v; changed(); } });
ctl.focus = K.slider(g, { label: "Focus distance", min: 1, max: 40, step: 0.1, value: P.focus, fmt: v => v.toFixed(1) + " m", tip: "Flowers 1.2 m · person 3 m · cyclist 10 m · buildings 40 m", on: v => { P.focus = v; changed(); } });
const fq = K.row(g); for (const [d, lab] of [[1.2, "Flowers"], [3, "Person"], [10, "Cyclist"], [40, "Buildings"]]) K.btn(fq, lab, () => { ctl.focus.set(d, true); });
g = groups.scene = ui.group("Scene");
ctl.light = K.seg(g, { label: "Light", value: "sun", options: Object.keys(LIGHT).map(k => [k, LIGHT[k][1]]), on: v => { P.light = v; changed(); } });
ctl.tripod = K.toggle(g, { label: "Camera on a tripod (no shake)", value: false, on: v => { P.tripod = v; changed(); } });
K.btn(K.row(g), "📸 Take another shot", () => { newShake(); changed(); }, "primary");
g = groups.film = ui.group("Film and darkroom");
ctl.dev = K.slider(g, { label: "Development time", min: 1, max: 24, step: 0.5, value: P.film.dev, fmt: v => v + " min", on: v => P.film.dev = v });
ctl.T = K.slider(g, { label: "Developer temperature", min: 16, max: 26, step: 0.5, value: P.film.T, fmt: v => v + " °C", on: v => P.film.T = v });
ctl.push = K.slider(g, { label: "Push / pull", min: -1, max: 3, step: 1, value: 0, fmt: v => v === 0 ? "box speed (ISO 400)" : (v > 0 ? "push +" : "pull ") + v + " (rated ISO " + 400 * Math.pow(2, v) + ")", on: v => P.film.push = v });
const read = K.readout(ui.group("Readings"), [["ev", "exposure value (EV₁₀₀)"], ["meter", "meter"], ["dof", "depth of field"], ["clip", "clipped highlights"], ["blur", "cyclist moves"], ["shake", "camera shake"]]);
function showGroups() { const cam = P.view === "camera"; groups.camera.style.display = cam ? "" : "none"; groups.scene.style.display = cam ? "" : "none"; groups.film.style.display = cam ? "none" : ""; read.el.parentElement.style.display = cam ? "" : "none"; }
function newShake() { const a = rnd() * 6.283, m = Math.abs(0.02 * rnd.gauss()) + 0.01; shake = [m * Math.cos(a), m * Math.sin(a)]; }
function nearest(arr, v) { let b = 0; arr.forEach((x, i) => { if (Math.abs(Math.log(x / v)) < Math.abs(Math.log(arr[b] / v))) b = i; }); return b; }
// automatic modes: make the metered average come out at 18% × 2^comp
function autoExpose() {
  if (!SCENE) return; const m = meterLevel(img0()), target = 0.18 * Math.pow(2, P.comp), need = target / (m * Math.pow(2, LIGHT[P.light][0]) * (ISOp() / 100));   // need = t × 100 × (16/N)²
  if (P.mode === "A") { P.ti = nearest(SHUT, need / 100 * Math.pow(Np() / 16, 2)); ctl.t.set(P.ti); }
  else if (P.mode === "S") { const N = 16 * Math.sqrt(Tp() * 100 / need); P.Ni = nearest(STOPS_N, clamp(N, 1.4, 22)); ctl.N.set(P.Ni); }
  else if (P.mode === "P") { const ev = Math.log2(100 / need * 256); /* program line: N grows with EV */ const N = clamp(Math.pow(2, (ev - 8) / 4), 1.4, 16); P.Ni = nearest(STOPS_N, N); P.ti = nearest(SHUT, need / 100 * Math.pow(STOPS_N[P.Ni] / 16, 2)); ctl.N.set(P.Ni); ctl.t.set(P.ti); }
}
let IMG0 = null; const img0 = () => IMG0 || (IMG0 = composite(SCENE.layers.map(l => ({ L: l.L, shift: l.moving ? W * 0.55 : 0 }))));
function changed() { autoExpose(); needShot = true; }
function set(o) {
  const f = Object.assign({ dev: 8, T: 20, push: 0 }, o.film || {});
  Object.assign(P, { view: "camera", mode: "M", Ni: 15, ti: 10, ii: 0, comp: 0, light: "sun", focus: 3, tripod: false }, o); P.film = f;
  ctl.view.set(P.view); ctl.mode.set(P.mode); ctl.N.set(P.Ni); ctl.t.set(P.ti); ctl.iso.set(P.ii); ctl.comp.set(P.comp); ctl.focus.set(P.focus); ctl.light.set(P.light); ctl.tripod.set(P.tripod);
  ctl.dev.set(f.dev); ctl.T.set(f.T); ctl.push.set(f.push); newShake(); showGroups(); changed();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { needShot = true; });
const chA = K.chart(ui.dock, { title: "Histogram (brightness of every pixel)", xLabel: "brightness: shadows → highlights", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Blur circle against distance (sharp below the line)", xLabel: "distance (m, log scale)", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif", off = mkCanvas(), offc = off.getContext("2d"), idata = offc.createImageData(W, H);
let shot = null;
function takeShot() {
  const N = Np(), t = Tp(), s = P.focus;
  const pxPerM = d => FOCAL / (d * 1000) * 1000 * PX_PER_MM;               // image pixels per metre at distance d
  const shk = P.tripod ? [0, 0] : [Math.abs(shake[0]) * t * FOCAL * PX_PER_MM, Math.abs(shake[1]) * t * FOCAL * PX_PER_MM];
  const key = [N, t, s, P.tripod, shk.map(v => Math.round(v)).join()].join("|");
  if (key !== cache) { cache = key; blurred = SCENE.layers.map(l => ({ l, B: blurLayer(l.L, cocMM(l.d, s, N) * PX_PER_MM / 2, l.moving ? P.speed * t * pxPerM(l.d) : 0, shk[0], shk[1]) })); }
  const shift = (tAnim * 0.6 * P.speed * pxPerM(10) * 0.1) % (W + 60) - 50;
  const im = composite(blurred.map(({ l, B }) => ({ L: B, shift: l.moving ? shift : 0 })));
  const r = expose(im, { N, t, iso: ISOp(), light: P.light }, rnd, idata.data); offc.putImageData(idata, 0, 0);
  shot = r;
}
function drawCamera(c, w, h) {
  const sc = Math.min((w - 20) / W, (h - 60) / H), dw = W * sc, dh = H * sc, x0 = (w - dw) / 2, y0 = 14;
  c.imageSmoothingEnabled = true; c.drawImage(off, x0, y0, dw, dh); c.strokeStyle = "#3a4560"; c.strokeRect(x0, y0, dw, dh);
  // viewfinder information line
  const ev = Math.log2(Np() * Np() / Tp()), m = meterLevel(img0()) * exposureFactor(Np(), Tp(), LIGHT[P.light][0]) * ISOp() / 100, stops = Math.log2(m / 0.18);
  c.fillStyle = "#000"; c.fillRect(x0, y0 + dh, dw, 34); c.font = "600 15px " + FONT; c.fillStyle = "#7fe3a0"; c.textAlign = "left";
  c.fillText(`${P.mode}   f/${Np()}   ${fmtT(Tp())}   ISO ${ISOp()}`, x0 + 12, y0 + dh + 23);
  // the exposure meter scale −3 … +3
  const mx = x0 + dw - 230; c.font = "11px " + FONT; c.fillStyle = "#7fe3a0"; c.textAlign = "center";
  for (let k = -3; k <= 3; k++) { c.fillRect(mx + (k + 3) * 32 - 0.5, y0 + dh + 8, 1, k % 3 === 0 ? 10 : 6); c.fillText(k > 0 ? "+" + k : k, mx + (k + 3) * 32, y0 + dh + 30); }
  const mpos = clamp(stops, -3.4, 3.4); c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(mx + (mpos + 3) * 32, y0 + dh + 18); c.lineTo(mx + (mpos + 3) * 32 - 5, y0 + dh + 8); c.lineTo(mx + (mpos + 3) * 32 + 5, y0 + dh + 8); c.fill();
  // focus point marker on the eyes
  if (Math.abs(P.focus - 3) < 0.4) { c.strokeStyle = "rgba(127,227,160,0.8)"; c.strokeRect(x0 + W * 0.42 * sc - 14, y0 + H * 0.36 * sc - 10, 28, 20); }
  return { ev, stops };
}
function drawFilm(c, w, h) {
  const gam = gammaOf(P.film.dev, P.film.T), push = P.film.push, L = 70, T = 40, PW = Math.min(w * 0.55, w - 360), PH = h - 110;
  const X = lh => L + (lh + 3) / 3.5 * PW, Y = d => T + PH - d / 2.6 * PH;
  c.font = "600 15px " + FONT; c.fillStyle = "#eef2f8"; c.textAlign = "left"; c.fillText("Characteristic curve of a black-and-white negative film (ISO 400)", L, 26);
  c.strokeStyle = "#3a4560"; c.strokeRect(L, T, PW, PH); c.font = "11px " + FONT; c.fillStyle = "#aab6cc"; c.textAlign = "center";
  for (let lh = -3; lh <= 0.5; lh += 0.5) c.fillText(lh.toFixed(1), X(lh), T + PH + 14); c.fillText("log₁₀ exposure (each 0.3 = one stop)", L + PW / 2, T + PH + 30);
  c.textAlign = "right"; for (let d = 0; d <= 2.5; d += 0.5) c.fillText(d.toFixed(1), L - 6, Y(d) + 4);
  c.save(); c.translate(L - 36, T + PH / 2); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.fillText("density of the negative", 0, 0); c.restore();
  // reference curve (8 min, 20 °C) and this one
  const curve = (gm, col, wd, dash) => { c.strokeStyle = col; c.lineWidth = wd; c.setLineDash(dash || []); c.beginPath(); for (let i = 0; i <= 100; i++) { const lh = -3 + 3.5 * i / 100, y = Y(density(lh, gm)); i ? c.lineTo(X(lh), y) : c.moveTo(X(lh), y); } c.stroke(); c.setLineDash([]); };
  curve(gammaOf(8, 20), "#7d8aa5", 1.5, [5, 4]); curve(gam, "#ffd166", 3);
  // where a scene's tones land: shadows, mid-grey, highlights (a 7-stop scene), shifted by pushing (underexposure)
  const tones = [["darkest", -2.4], ["shadow", -1.8], ["mid-grey", -1.2], ["light", -0.6], ["white", -0.3]];
  tones.forEach(([n, lh], i) => { const x = lh - 0.3 * push; c.fillStyle = "#5ab0ff"; c.beginPath(); c.arc(X(x), Y(density(x, gam)), 5, 0, 6.3); c.fill(); c.fillStyle = "#aab6cc"; c.textAlign = "left"; c.fillText(n, X(x) + 7, Y(density(x, gam)) - 6 - (i % 2) * 10); });
  c.textAlign = "left"; c.font = "12px " + FONT; c.fillStyle = "#aab6cc"; c.fillText("toe", X(-2.6), Y(0.25) - 8); c.fillText("straight line: slope γ = contrast", X(-1.4), Y(density(-1.4, gam)) + 26); c.fillText("shoulder", X(0.0), Y(density(0, gam)) + 18);
  // the negative and the print, as strips
  const sx = L + PW + 40, sw = w - sx - 30; c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("Negative", sx, T + 10);
  tones.forEach(([n, lh], i) => { const d = density(lh - 0.3 * push, gam), v = Math.round(255 * Math.pow(10, -d)); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(sx + i * sw / 5, T + 20, sw / 5 - 2, 50); });
  c.fillStyle = "#eef2f8"; c.fillText("Print (the negative reversed)", sx, T + 100);
  const dmin = density(-2.4 - 0.3 * push, gam), dmax = density(-0.3 - 0.3 * push, gam);
  tones.forEach(([n, lh], i) => { const d = density(lh - 0.3 * push, gam), v = Math.round(255 * clamp((d - dmin) / Math.max(0.3, dmax - dmin), 0, 1) ** 0.9); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(sx + i * sw / 5, T + 110, sw / 5 - 2, 50); c.fillStyle = "#aab6cc"; c.font = "11px " + FONT; c.fillText(n, sx + i * sw / 5, T + 176); });
  c.font = "13px " + FONT; c.fillStyle = "#eef2f8"; const yy = T + 210;
  c.fillText(`contrast γ = ${gam.toFixed(2)} (normal ≈ ${gammaOf(8, 20).toFixed(2)})`, sx, yy);
  c.fillText(`development ${P.film.dev} min at ${P.film.T} °C`, sx, yy + 20);
  c.fillStyle = "#aab6cc"; c.fillText(push > 0 ? `pushed ${push} stop${push > 1 ? "s" : ""}: shadows fall into the toe (lost)` : push < 0 ? "pulled: more shadow detail, softer contrast" : "rated at box speed", sx, yy + 40);
  c.fillText(gam > 0.75 ? "contrasty: dense highlights, hard to print" : gam < 0.45 ? "flat: grey, muddy prints" : "a normal, printable negative", sx, yy + 60);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (dt > 0) tAnim += dt; }, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (!SCENE) { buildScene(); changed(); }
  if (P.view === "film") { drawFilm(c, w, h); if (frame++ % 6 === 0) { const gm = gammaOf(P.film.dev, P.film.T), pts = []; for (let t = 1; t <= 24; t += 0.5) pts.push([t, gammaOf(t, P.film.T)]); chA.opts.title = "Contrast against development time"; chA.opts.xLabel = "development time (min)"; chA.draw([{ pts, color: "#ffd166", label: P.film.T + " °C" }, { pts: [[P.film.dev, gm]], type: "dots", color: "#ff5d6c", r: 6, label: "now" }], { xMin: 0, xMax: 24, yMin: 0, yMax: 1 }); chB.opts.title = "Rate of development against temperature"; chB.opts.xLabel = "temperature (°C)"; const rp = []; for (let T = 16; T <= 26; T += 0.5) rp.push([T, devRate(T) / devRate(20)]); chB.draw([{ pts: rp, color: "#5ab0ff", label: "rate ÷ rate at 20 °C" }, { pts: [[P.film.T, devRate(P.film.T) / devRate(20)]], type: "dots", color: "#ff5d6c", r: 6 }], { xMin: 16, xMax: 26, yMin: 0 }); } return; }
  // re-take the photograph about 12 times a second (the cyclist moves; photon noise changes every shot)
  if (needShot || frame % 5 === 0) { takeShot(); needShot = false; }
  const info = drawCamera(c, w, h);
  if (frame++ % 5) return;
  chA.opts.title = "Histogram (brightness of every pixel)"; chA.opts.xLabel = "brightness: shadows → highlights";
  const hb = new Array(32).fill(0); for (let i = 0; i < shot.lum.length; i += 2) hb[Math.min(31, Math.floor(Math.pow(shot.lum[i], 1 / 2.2) * 32))]++;
  chA.draw([{ pts: hb.map((v, i) => [(i + 0.5) / 32 * 255, v]), type: "bars", w: 255 / 32, color: "#dfe6f3", alpha: 0.85 }], { xMin: 0, xMax: 255, yMin: 0, bands: [{ x0: 247, x1: 256, color: shot.clipped > 0.01 ? "rgba(255,93,108,0.35)" : "rgba(0,0,0,0)" }] });
  chB.opts.title = "Blur circle against distance (sharp below the line)"; chB.opts.xLabel = "distance (m, log scale)";
  const pts = []; for (let i = 0; i <= 120; i++) { const d = Math.pow(10, -0.1 + 1.8 * i / 120); pts.push([Math.log10(d), cocMM(d, P.focus, Np())]); }
  chB.draw([{ pts, color: "#5ab0ff", label: "blur circle (mm)" }, { pts: SCENE.layers.map(l => [Math.log10(l.d), Math.min(cocMM(l.d, P.focus, Np()), 0.6)]), type: "dots", color: "#ffd166", r: 5, label: "objects" }], { xMin: -0.1, xMax: 1.7, yMin: 0, yMax: 0.6, hlines: [{ y: COC, color: "#7fe3a0", label: "0.03 mm" }], xFmt: v => +(Math.pow(10, v)).toPrecision(2) + "" });
  const L = dofLimits(P.focus, Np()), t = Tp();
  read.set("ev", info.ev.toFixed(1)); read.set("meter", (info.stops >= 0 ? "+" : "−") + Math.abs(info.stops).toFixed(1) + " stops");
  read.set("dof", `${L.near.toFixed(2)} m to ${isFinite(L.far) ? L.far.toFixed(2) + " m" : "∞"}`); read.set("clip", (shot.clipped * 100).toFixed(1) + "% of pixels");
  read.set("blur", (P.speed * t * 100).toFixed(1) + " cm"); read.set("shake", P.tripod ? "none (tripod)" : (Math.hypot(shake[0], shake[1]) * t * FOCAL).toFixed(3) + " mm" + (Math.hypot(shake[0], shake[1]) * t * FOCAL > COC ? " (visible)" : ""));
});
set({});
ui.tip("Change the aperture, shutter and ISO. The histogram and the meter (bottom right of the photo) show the exposure.", 7000);
