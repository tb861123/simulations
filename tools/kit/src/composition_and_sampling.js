/* =====================================================================
   PIXELS, COMPRESSION AND COMPOSITION
   A digital photograph is a grid of numbers.
     RESOLUTION  how many pixels. Print size = pixels ÷ dots per inch
                 (300 dpi for a sharp print held in the hand).
     SAMPLING    each pixel takes one sample of the scene. Detail finer
                 than two pixels cannot be recorded (the Nyquist limit);
                 instead it shows up as false coarse patterns (ALIASING,
                 MOIRÉ). Cameras put a slightly blurring filter in front
                 of the sensor (an anti-aliasing filter) to prevent this.
     BIT DEPTH   how many brightness levels each pixel can have: 2ᵇ for
                 b bits (8 bits = 256). Too few levels shows as BANDING
                 (posterisation) in smooth areas like skies.
     JPEG        splits the picture into 8 × 8 blocks, describes each as a
                 mix of 64 wave patterns (the discrete cosine transform,
                 DCT), then rounds off the fine-detail waves we notice least.
                 Lower quality rounds harder: smaller files, but BLOCKS and
                 RINGING appear. The loss is measured by the PSNR.
     COMPOSITION a crop decides where things sit in the frame: the rule of
                 thirds, the golden section, centred symmetry, aspect ratio.
   ===================================================================== */
const clamp = K.clamp;
const SW = 512, SH = 384;                                   // the full-resolution scene, in pixels
// ---------------- the scene ----------------
let SRC = null;   // { r, g, b } Float32Arrays 0–1 (gamma-encoded, like a JPEG)
function buildScene() {
  const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH; const c = cv.getContext("2d");
  let g = c.createLinearGradient(0, 0, 0, SH * 0.55); g.addColorStop(0, "#2f6db5"); g.addColorStop(1, "#f2c79a"); c.fillStyle = g; c.fillRect(0, 0, SW, SH);   // a smooth evening sky: watch for banding
  c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(SW * 0.78, SH * 0.38, 16, 0, 6.3); c.fill();
  c.fillStyle = "#4b5d74"; c.beginPath(); c.moveTo(0, SH * 0.55); for (let x = 0; x <= SW; x += 16) c.lineTo(x, SH * 0.5 - 18 * Math.sin(x / 60) - 10 * Math.sin(x / 23)); c.lineTo(SW, SH * 0.55); c.fill();
  c.fillStyle = "#6b8f4a"; c.fillRect(0, SH * 0.55, SW, SH);
  // a picket fence: fine regular detail that aliases when sampled too coarsely
  for (let x = 0; x < SW; x += 5) { c.fillStyle = "#f4efe6"; c.fillRect(x, SH * 0.66, 2.6, SH * 0.12); } c.fillStyle = "#e6dccb"; c.fillRect(0, SH * 0.69, SW, 3); c.fillRect(0, SH * 0.75, SW, 3);
  // a lone tree: the subject
  const tx = SW * 0.63, ty = SH * 0.55; c.fillStyle = "#4a3523"; c.fillRect(tx - 5, ty - 70, 10, 76); c.fillStyle = "#2f5f2c"; for (const [dx, dy, r] of [[0, -92, 38], [-28, -72, 26], [28, -72, 26]]) { c.beginPath(); c.arc(tx + dx, ty + dy, r, 0, 6.3); c.fill(); }
  // a person in a striped shirt (stripes 2 px wide)
  const px = SW * 0.3, py = SH * 0.8; for (let y = py - 60; y < py; y += 4) { c.fillStyle = "#1d2b4a"; c.fillRect(px - 12, y, 24, 2); c.fillStyle = "#f0f0f0"; c.fillRect(px - 12, y + 2, 24, 2); }
  c.fillStyle = "#e3b08c"; c.beginPath(); c.arc(px, py - 72, 11, 0, 6.3); c.fill(); c.fillStyle = "#2b2b2b"; c.fillRect(px - 10, py, 8, 28); c.fillRect(px + 2, py, 8, 28);
  c.fillStyle = "#ffffff"; c.font = "bold 13px Segoe UI, sans-serif"; c.fillText("PIXELS 2026", 14, SH - 14);
  const d = c.getImageData(0, 0, SW, SH).data, n = SW * SH; SRC = { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), w: SW, h: SH };
  for (let i = 0; i < n; i++) { SRC.r[i] = d[i * 4] / 255; SRC.g[i] = d[i * 4 + 1] / 255; SRC.b[i] = d[i * 4 + 2] / 255; }
}
// ---------------- sampling: make a w × h image from the scene ----------------
// 'aa' true: each pixel averages the light falling on its whole area (like an anti-aliasing filter); false: one point sample per pixel
function resample(img, w, h, aa) {
  const out = { r: new Float32Array(w * h), g: new Float32Array(w * h), b: new Float32Array(w * h), w, h }, sx = img.w / w, sy = img.h / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * w + x;
    if (!aa) { const i = Math.min(img.h - 1, Math.floor((y + 0.5) * sy)) * img.w + Math.min(img.w - 1, Math.floor((x + 0.5) * sx)); out.r[o] = img.r[i]; out.g[o] = img.g[i]; out.b[o] = img.b[i]; continue; }
    let r = 0, g = 0, b = 0, k = 0; const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = yy * img.w + xx; r += img.r[i]; g += img.g[i]; b += img.b[i]; k++; }
    out.r[o] = r / k; out.g[o] = g / k; out.b[o] = b / k;
  }
  return out;
}
// ---------------- bit depth: round each value to one of 2ᵇ levels (optionally with dither: a little noise added first) ----------------
function quantise(img, bits, dither, r) { const L = Math.pow(2, bits) - 1, out = { r: new Float32Array(img.r.length), g: new Float32Array(img.r.length), b: new Float32Array(img.r.length), w: img.w, h: img.h };
  for (const k of ["r", "g", "b"]) for (let i = 0; i < img.r.length; i++) out[k][i] = Math.round(clamp(img[k][i] * L + (dither ? r() - 0.5 : 0), 0, L)) / L; return out; }
// ---------------- JPEG: 8 × 8 discrete cosine transform, quantisation with the standard table, and back ----------------
const QL = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];   // the JPEG standard's luminance table
const QC = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99].concat(new Array(32).fill(99));                                    // and its colour (chroma) table
const qScale = q => q < 50 ? 5000 / q : 200 - 2 * q;                      // the usual 'quality 1–100' scaling (Independent JPEG Group)
const COS = (() => { const a = new Float32Array(64); for (let x = 0; x < 8; x++) for (let u = 0; u < 8; u++) a[x * 8 + u] = Math.cos((2 * x + 1) * u * Math.PI / 16) * (u ? 0.5 : 0.5 * Math.SQRT1_2); return a; })();
function dct8(blk, out) { const t = new Float32Array(64); for (let y = 0; y < 8; y++) for (let u = 0; u < 8; u++) { let s = 0; for (let x = 0; x < 8; x++) s += blk[y * 8 + x] * COS[x * 8 + u]; t[y * 8 + u] = s; } for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) { let s = 0; for (let y = 0; y < 8; y++) s += t[y * 8 + u] * COS[y * 8 + v]; out[v * 8 + u] = s; } }
function idct8(co, out) { const t = new Float32Array(64); for (let v = 0; v < 8; v++) for (let x = 0; x < 8; x++) { let s = 0; for (let u = 0; u < 8; u++) s += co[v * 8 + u] * COS[x * 8 + u]; t[v * 8 + x] = s; } for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let s = 0; for (let v = 0; v < 8; v++) s += t[v * 8 + x] * COS[y * 8 + v]; out[y * 8 + x] = s; } }
// compress and decompress; returns the new image and an estimate of the file size (bytes)
function jpeg(img, quality) {
  const w = img.w - img.w % 8, h = img.h - img.h % 8, sc = qScale(quality) / 100, n = img.w * img.h;
  // colour → brightness (Y) and two colour-difference channels (Cb, Cr), as JPEG does
  const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
  for (let i = 0; i < n; i++) { const r = img.r[i] * 255, g = img.g[i] * 255, b = img.b[i] * 255; Y[i] = 0.299 * r + 0.587 * g + 0.114 * b - 128; Cb[i] = -0.1687 * r - 0.3313 * g + 0.5 * b; Cr[i] = 0.5 * r - 0.4187 * g - 0.0813 * b; }
  let bits = 0; const blk = new Float32Array(64), co = new Float32Array(64), back = new Float32Array(64);
  for (const [ch, Q] of [[Y, QL], [Cb, QC], [Cr, QC]]) for (let by = 0; by < h; by += 8) for (let bx = 0; bx < w; bx += 8) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = ch[(by + y) * img.w + bx + x];
    dct8(blk, co);
    for (let k = 0; k < 64; k++) { const q = Math.max(1, Math.floor(Q[k] * sc + 0.5)), v = Math.round(co[k] / q); co[k] = v * q; if (v) bits += 4 + Math.ceil(Math.log2(Math.abs(v) + 1)); }   // each kept number costs about 4 bits of code plus its size
    bits += 4;   // end-of-block code
    idct8(co, back); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) ch[(by + y) * img.w + bx + x] = back[y * 8 + x];
  }
  const out = { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), w: img.w, h: img.h };
  for (let i = 0; i < n; i++) { const y = Y[i] + 128; out.r[i] = clamp((y + 1.402 * Cr[i]) / 255, 0, 1); out.g[i] = clamp((y - 0.34414 * Cb[i] - 0.71414 * Cr[i]) / 255, 0, 1); out.b[i] = clamp((y + 1.772 * Cb[i]) / 255, 0, 1); }
  return { img: out, bytes: bits / 8 + 600 };   // + about 600 bytes of header and tables
}
// PSNR (peak signal-to-noise ratio, dB): 10 log₁₀(255² ÷ mean squared error). Above about 40 dB the loss is invisible.
function psnr(a, b) { let s = 0, n = 0; for (const k of ["r", "g", "b"]) for (let i = 0; i < a.r.length; i++) { const d = (a[k][i] - b[k][i]) * 255; s += d * d; n++; } return 10 * Math.log10(255 * 255 / Math.max(s / n, 1e-9)); }
// a random patch of the scene (for batch runs)
function patch(r, w = 128, h = 96) { const x0 = r.int(SW - w), y0 = r.int(SH - h), o = { r: new Float32Array(w * h), g: new Float32Array(w * h), b: new Float32Array(w * h), w, h }; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y0 + y) * SW + x0 + x, j = y * w + x; o.r[j] = SRC.r[i]; o.g[j] = SRC.g[i]; o.b[j] = SRC.b[i]; } return o; }
const printInches = (px, dpi) => px / dpi;

// ---------------- The page ----------------
const P = { view: "pixels", mp: 0.2, aa: true, bits: 8, dither: false, q: 75, diff: false, zoom: true, crop: { x: 0.08, y: 0.08, w: 0.6, aspect: 1.5 }, grid: "thirds", dpi: 300 };
let rnd = K.rng(Date.now() % 99991 + 29), shown = null, info = {}, dirty = true;
const ui = K.app({
  title: "Pixels, Compression and Composition", subject: "Photography",
  blurb: "Resolution and print size, aliasing, bit depth and banding, how JPEG works, and cropping with the rule of thirds",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "AQA GCSE Photography (8206): digital processes (resolution, file formats, editing, cropping); formal elements and composition (rule of thirds, framing, viewpoint). GCSE Computer Science context: pixels, resolution, colour depth, file size, lossy compression.",
      adv: "AQA A level Photography (7206) 3.8: composition and digital processes (capture, editing, output and presentation, printing). Context from A level Computer Science and Physics: sampling and the Nyquist limit, bit depth, transform coding (DCT) and lossy compression."
    }
  },
  missions: [
    { title: "How many pixels for a print?", q: "Set the resolution to 0.2 megapixels, then 1, 6 and 24. For each, how big a print can you make at 300 dots per inch? When does the picture stop looking blocky on screen?", hint: "Print width (inches) = pixels across ÷ dpi. 6 megapixels (3000 × 2000) gives a 10 × 6.7 inch print at 300 dpi; 24 megapixels about 20 × 13 inches. On a screen you only need as many pixels as the screen has: beyond that, extra megapixels matter for big prints and cropping.", setup() { set({ view: "pixels", mp: 0.2 }); } },
    { title: "Moiré on the fence", q: "Low resolution with the anti-aliasing filter OFF. Look at the fence and the striped shirt. What appears that is not in the real scene? Turn the filter ON.", hint: "The fence posts repeat every 5 original pixels. If the camera samples less than twice per repeat (the Nyquist limit), each sample lands on a different part of the pattern and the result is a false, coarse pattern: aliasing, or moiré. Averaging over each pixel's area (the anti-aliasing filter) blurs the detail it cannot record, so it turns grey instead of making false stripes.", setup() { set({ view: "pixels", mp: 0.06, aa: false }); } },
    { title: "Banding in the sky", q: "Reduce the bit depth from 8 to 5, 4 and 3 bits. Where does the picture go wrong first? Then switch on dither.", hint: "Smooth gradients, like the evening sky, show steps (banding or posterisation) first, because neighbouring pixels differ by less than one level. With b bits there are 2ᵇ levels: 256 at 8 bits, 8 at 3 bits. Dither adds a little noise before rounding, which hides the bands at the cost of grain; raw files use 12–14 bits so heavy editing does not cause banding.", setup() { set({ view: "bits", bits: 5 }); } },
    { title: "How JPEG saves space", q: "Lower the JPEG quality from 90 to 10 and watch the file size and the zoomed view. Where do problems appear first: the sky, the tree, or the fence? Switch on 'show the difference'.", hint: "JPEG keeps the coarse patterns in each 8 × 8 block and rounds off the fine ones. Smooth areas compress well; fine detail (the fence, the stripes, the text) costs most. At low quality you see the blocks, blotchy colour and ringing round sharp edges. The difference image shows exactly what was thrown away.", setup() { set({ view: "jpeg", q: 90, zoom: true }); } },
    { title: "Rule of thirds", q: "Drag the crop box (or use the sliders) to place the tree on a thirds intersection and the horizon on a thirds line. Try the golden section and a centred square crop. Which do you prefer, and why?", hint: "Placing the subject off-centre, on a thirds point, leaves space for the eye to move and usually feels more dynamic; a centred square crop feels calm and formal. The 'rules' are starting points: breaking them on purpose is also a compositional choice. The readout shows how close the tree is to a strong point.", setup() { set({ view: "comp", grid: "thirds" }); } },
    { title: "Re-saving JPEGs", lvl: "adv", q: "Use the batch run 'Saving again and again'. What happens to the quality each time a JPEG is opened, edited and saved again?", hint: "Each save rounds the DCT numbers again. If nothing changes between saves the loss soon stops, but a small edit (here a slight brightening each time) means the blocks are quantised afresh each time, so errors build up (generation loss). Professionals edit raw or lossless (TIFF, PNG) files and save a JPEG only at the end.", setup() { set({ view: "jpeg", q: 60 }); ui.openBatch(); } }
  ],
  batch: [
    { title: "JPEG quality and file size", question: "How big is the file, compared with the uncompressed image, at each quality?", how: "Random 128 × 96 patches of the scene (some with fence and stripes, some mostly sky). Compression ratio = uncompressed size (3 bytes a pixel) ÷ estimated JPEG size.", xLabel: "JPEG quality", yLabel: "compression ratio (× smaller)", xs: [10, 25, 50, 75, 90, 95], reps: 10, yMin: 0, run: (q, r) => { const p = patch(r); return p.w * p.h * 3 / jpeg(p, q).bytes; }, note: "Typical photos compress 10 to 30 times at quality 75 with no visible loss. Patches with lots of fine detail compress far less than smooth sky, which is why the points scatter: file size depends on the picture as much as the setting." },
    { title: "JPEG quality and image quality", question: "How much is lost (PSNR) at each quality setting?", how: "Random 128 × 96 patches. PSNR = 10 log₁₀(255² ÷ mean squared error); above about 40 dB differences are invisible, below about 30 dB they are obvious.", xLabel: "JPEG quality", yLabel: "PSNR (dB)", xs: [10, 25, 50, 75, 90, 95], reps: 10, run: (q, r) => { const p = patch(r); return psnr(p, jpeg(p, q).img); }, note: "PSNR rises steadily with quality. High settings (90+) give bigger files for little visible gain; very low settings save little more space but look much worse. Detailed patches lose more than smooth ones." },
    { title: "Bit depth and rounding error", question: "How big is the error caused by rounding to 2ᵇ levels?", how: "Random brightness values (uniform 0–1) rounded to b bits. RMS error measured on 2,000 values (as a % of full scale). Theory: step ÷ √12, step = 1 ÷ (2ᵇ − 1).", xLabel: "bit depth (bits)", yLabel: "RMS rounding error (%)", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 5, yMin: 0, theory: b => 100 / (Math.pow(2, b) - 1) / Math.sqrt(12), theoryLabel: "step ÷ √12", run: (b, r) => { const L = Math.pow(2, b) - 1; let s = 0; for (let i = 0; i < 2000; i++) { const v = r(), q = Math.round(v * L) / L; s += (q - v) ** 2; } return 100 * Math.sqrt(s / 2000); }, note: "Each extra bit halves the rounding error. At 8 bits it is about 0.1% of full scale, too small to see in a single pixel, but a smooth gradient stretched by editing can still show bands." },
    { title: "Aliasing: what pattern do you see?", lvl: "adv", question: "Stripes of a fixed fineness are sampled at different pixel spacings. What frequency appears in the image?", how: "A stripe pattern of 0.4 cycles per original pixel, point-sampled every s pixels with a random phase and a little noise; the strongest frequency in the samples is found (a Fourier transform). Theory: the true frequency, folded back below the Nyquist limit 0.5 ÷ s.", xLabel: "sample spacing s (original pixels)", yLabel: "apparent frequency (cycles per original pixel)", xs: [1, 1.5, 2, 2.5, 3, 4, 5, 6], reps: 4, yMin: 0, theory: s => { const fs = 1 / s, f = 0.4; let a = f - Math.round(f / fs) * fs; return Math.abs(a); }, theoryLabel: "folded (alias) frequency", run: (s, r) => { const N = 96, ph = r() * 6.283, x = []; for (let i = 0; i < N; i++) x.push(Math.sin(2 * Math.PI * 0.4 * i * s + ph) + 0.1 * r.gauss()); let best = 0, bf = 0; for (let k = 1; k < N / 2; k++) { let re = 0, im = 0; for (let i = 0; i < N; i++) { re += x[i] * Math.cos(2 * Math.PI * k * i / N); im -= x[i] * Math.sin(2 * Math.PI * k * i / N); } const p = re * re + im * im; if (p > best) { best = p; bf = k; } } return bf / N / s; }, note: "With spacing 1 (Nyquist limit 0.5) the true 0.4 is recorded. With coarser sampling the stripes reappear at a false, lower frequency: that is moiré. Exactly at the right spacings (2.5 here) the pattern vanishes into a flat tone." },
    { title: "Saving again and again", lvl: "adv", question: "How does the quality fall when a JPEG is edited slightly and saved again and again?", how: "A random patch is saved at quality 60, brightened by 1% and saved again, up to 20 times. PSNR against the original (with the same total brightening).", xLabel: "number of saves", yLabel: "PSNR (dB)", xs: [1, 2, 4, 8, 12, 20], reps: 4, run: (n, r) => { const p = patch(r); let cur = p; const ref = { r: p.r.map(v => clamp(v * Math.pow(1.01, n - 1), 0, 1)), g: p.g.map(v => clamp(v * Math.pow(1.01, n - 1), 0, 1)), b: p.b.map(v => clamp(v * Math.pow(1.01, n - 1), 0, 1)), w: p.w, h: p.h }; for (let i = 0; i < n; i++) { if (i) cur = { r: cur.r.map(v => clamp(v * 1.01, 0, 1)), g: cur.g.map(v => clamp(v * 1.01, 0, 1)), b: cur.b.map(v => clamp(v * 1.01, 0, 1)), w: cur.w, h: cur.h }; cur = jpeg(cur, 60).img; } return psnr(ref, cur); }, note: "The first save loses the most; each later save, after an edit, loses a little more (generation loss). Keep the original raw or lossless file and export a JPEG once, at the end." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Resolution", text: "A digital image is a grid of pixels. Resolution = pixels across × down (e.g. 6000 × 4000 = 24 megapixels). Print size = pixels ÷ dpi; 300 dpi for a sharp print viewed close up." },
      { lvl: "std", tag: "File formats", text: "RAW: all the sensor data, for editing. TIFF and PNG: lossless (no detail thrown away), large files. JPEG: lossy compression, small files, quality setting trades size against artefacts. Avoid repeatedly editing and re-saving JPEGs." },
      { lvl: "std", tag: "Colour depth", text: "Bit depth = bits per colour channel: 8 bits gives 256 levels, 2⁸ × 2⁸ × 2⁸ ≈ 16.7 million colours. Too few levels show as banding (posterisation)." },
      { lvl: "std", tag: "Composition", text: "Rule of thirds (place the subject on lines or intersections), leading lines, framing, symmetry, negative space, viewpoint, cropping and aspect ratio (3:2, 4:5, 1:1, 16:9)." },
      { lvl: "adv", tag: "7206 3.8", text: "Digital workflow: capture (raw), edit non-destructively, export for the purpose (screen sRGB JPEG; print TIFF at 300 dpi). Cropping reduces the pixels left, so the final print size limits how hard you can crop." },
      { lvl: "adv", tag: "Sampling", text: "Detail finer than two pixels per cycle (the Nyquist limit) cannot be recorded: it aliases into false patterns (moiré). Anti-aliasing filters blur slightly before sampling to prevent this." },
      { lvl: "beyond", tag: "Beyond the spec", text: "JPEG: colour converted to brightness and colour difference; 8 × 8 discrete cosine transform; coefficients divided by a quality-scaled table and rounded (the lossy step); zero runs and Huffman coding. PSNR = 10 log₁₀(255² ÷ MSE)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A camera produces images 6000 × 4000 pixels. What is the largest print at 300 dpi, in inches?", ans: "<ul><li>6000 ÷ 300 = 20 inches across</li><li>4000 ÷ 300 ≈ 13.3 inches down</li></ul>" },
      { lvl: "std", marks: 3, q: "Calculate the uncompressed file size of a 4000 × 3000 pixel image with 8 bits per colour channel (three channels). Give your answer in megabytes.", ans: "<ul><li>4000 × 3000 = 12 million pixels</li><li>× 3 bytes per pixel = 36 million bytes</li><li>= 36 MB</li></ul>" },
      { lvl: "std", marks: 2, q: () => `In the simulation the JPEG quality is ${P.q}. Explain one advantage and one disadvantage of lowering it.`, ans: "<ul><li>advantage: smaller file, quicker to upload or send, more photos fit</li><li>disadvantage: visible artefacts (blocks, smeared detail, ringing); detail lost for ever</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why a photograph of a striped shirt can show strange wavy patterns.", ans: "<ul><li>the stripes are finer than two pixels per cycle (above the Nyquist limit)</li><li>each pixel samples a different part of the pattern, so a false lower-frequency pattern appears (aliasing, moiré)</li><li>reduced by an anti-aliasing filter, more pixels, or moving closer/further</li></ul>" },
      { lvl: "adv", marks: 4, q: "Evaluate the use of the rule of thirds in a landscape photograph.", ans: "<ul><li>placing the horizon on a third gives more space to sky or land, emphasising one</li><li>a subject on an intersection creates balance and movement through the frame</li><li>centred compositions suit symmetry, reflections and formal subjects</li><li>rules are guides: the intention and the effect on the viewer decide (credit a justified judgement)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>The 'real' scene is a 512 × 384 image (an evening sky, hills, a field with a picket fence, a tree and a person in a striped shirt). <b>Resolution</b>: it is resampled to the chosen number of pixels, either by one point sample per pixel (no anti-aliasing filter) or by averaging each pixel's area (an ideal anti-aliasing filter), then shown enlarged with square pixels. Megapixels and print sizes are scaled up to a real camera with the same proportions. <b>Bit depth</b>: each channel is rounded to 2ᵇ levels, optionally with dither. <b>JPEG</b>: the real method in miniature: conversion to Y, Cb, Cr; 8 × 8 DCT; quantisation with the standard tables scaled by quality; inverse DCT. The file size is estimated from the number and size of the numbers kept.</p>
<h3>Assumptions and simplifications</h3>
<ul><li>Real JPEGs also halve the colour resolution (chroma subsampling) and use Huffman tables; the size estimate is rough (within about 30%).</li>
<li>The sensor here records full colour at every pixel; real sensors use a Bayer filter (one colour per pixel), which causes colour moiré.</li>
<li>Composition guides are aids for discussion, not rules that make a picture good.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}, groups = {};
let g = ui.group("What to show");
ctl.view = K.seg(g, { value: "pixels", options: [["pixels", "▦ Resolution"], ["bits", "🌈 Bit depth"], ["jpeg", "🗜️ JPEG"], ["comp", "✂️ Composition"]], on: v => { P.view = v; showGroups(); dirty = true; } });
g = groups.pixels = ui.group("Resolution and sampling");
const MPS = [0.01, 0.02, 0.04, 0.06, 0.1, 0.2, 0.5, 1, 2, 6, 12, 24, 45];
ctl.mp = K.slider(g, { label: "Resolution (scaled to a real camera)", min: 0, max: MPS.length - 1, step: 1, value: 5, fmt: i => MPS[i] + " megapixels", on: v => { P.mp = MPS[v]; dirty = true; } });
ctl.aa = K.toggle(g, { label: "Anti-aliasing filter", value: true, on: v => { P.aa = v; dirty = true; } });
ctl.dpi = K.seg(g, { label: "Print at", value: 300, options: [[72, "72 dpi"], [150, "150 dpi"], [300, "300 dpi"]], on: v => { P.dpi = v; } });
g = groups.bits = ui.group("Bit depth");
ctl.bits = K.slider(g, { label: "Bits per colour channel", min: 1, max: 8, step: 1, value: 8, fmt: b => b + " bits (" + Math.pow(2, b) + " levels)", on: v => { P.bits = v; dirty = true; } });
ctl.dither = K.toggle(g, { label: "Dither (add a little noise before rounding)", value: false, on: v => { P.dither = v; dirty = true; } });
g = groups.jpeg = ui.group("JPEG compression");
ctl.q = K.slider(g, { label: "JPEG quality", min: 1, max: 100, step: 1, value: 75, on: v => { P.q = v; dirty = true; } });
ctl.diff = K.toggle(g, { label: "Show the difference (what was thrown away, × 8)", value: false, on: v => { P.diff = v; dirty = true; } });
ctl.zoom = K.toggle(g, { label: "Zoomed view of the fence and the tree", value: true, on: v => P.zoom = v });
g = groups.comp = ui.group("Cropping and composition");
ctl.grid = K.seg(g, { label: "Guides", value: "thirds", options: [["thirds", "Thirds"], ["golden", "Golden section"], ["centre", "Centre"], ["none", "None"]], on: v => P.grid = v });
ctl.aspect = K.seg(g, { label: "Aspect ratio", value: 1.5, options: [[1.5, "3:2"], [1.25, "5:4"], [1, "1:1"], [16 / 9, "16:9"], [0.8, "4:5"]], on: v => { P.crop.aspect = v; fitCrop(); } });
ctl.cw = K.slider(g, { label: "Crop size", min: 0.25, max: 1, step: 0.01, value: P.crop.w, fmt: v => Math.round(v * 100) + "% of the width", on: v => { P.crop.w = v; fitCrop(); } });
K.note(g, "Drag the crop box on the picture to move it.");
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const LABS = { pixels: ["pixels (this camera)", "print size", "fence: pixels per post", "file size (uncompressed)"], bits: ["levels per channel", "colours", "RMS rounding error", "file size (uncompressed)"], jpeg: ["file size", "compressed", "PSNR (quality)", "verdict"], comp: ["tree position", "nearest strong point", "horizon", "crop pixels (24 MP camera)"] };
function showGroups() { for (const k of ["pixels", "bits", "jpeg", "comp"]) groups[k].style.display = P.view === k ? "" : "none"; [...read.el.children].forEach((d, i) => d.firstChild.textContent = LABS[P.view][i]); }
function fitCrop() { const c = P.crop, h = c.w * SW / c.aspect / SH; c.h = Math.min(1, h); if (h > 1) c.w = c.aspect * SH / SW; c.x = clamp(c.x, 0, 1 - c.w); c.y = clamp(c.y, 0, 1 - c.h); }
function set(o) { Object.assign(P, { view: "pixels", mp: 0.2, aa: true, bits: 8, dither: false, q: 75, diff: false, zoom: true, grid: "thirds", dpi: 300 }, o); P.crop = { x: 0.08, y: 0.08, w: 0.6, aspect: 1.5 };
  ctl.view.set(P.view); ctl.mp.set(MPS.indexOf(P.mp) >= 0 ? MPS.indexOf(P.mp) : 5); ctl.aa.set(P.aa); ctl.dpi.set(P.dpi); ctl.bits.set(P.bits); ctl.dither.set(P.dither); ctl.q.set(P.q); ctl.diff.set(P.diff); ctl.zoom.set(P.zoom); ctl.grid.set(P.grid); ctl.aspect.set(1.5); ctl.cw.set(0.6); fitCrop(); showGroups(); dirty = true; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { dirty = true; });
const chA = K.chart(ui.dock, { title: "", yMin: 0 });
const chB = K.chart(ui.dock, { title: "", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif";
function toCanvas(img) { const c = document.createElement("canvas"); c.width = img.w; c.height = img.h; const x = c.getContext("2d"), d = x.createImageData(img.w, img.h); for (let i = 0; i < img.r.length; i++) { d.data[i * 4] = img.r[i] * 255; d.data[i * 4 + 1] = img.g[i] * 255; d.data[i * 4 + 2] = img.b[i] * 255; d.data[i * 4 + 3] = 255; } x.putImageData(d, 0, 0); return c; }
let view = null;   // where the picture is drawn: { x, y, w, h }
// the scene stands for a frame 1500 real pixels wide: a camera with fewer pixels samples it more coarsely (more than about 1 MP and every scene pixel is kept)
const simWidth = mp => Math.max(4, Math.min(SW, Math.round(SW * Math.sqrt(mp * 1e6 * 1.5) / 1500)));
function compute() {
  if (P.view === "pixels") { const ww = Math.round(Math.sqrt(P.mp * 1e6 * 1.5)), hh = Math.round(ww / 1.5), sw = simWidth(P.mp); const img = resample(SRC, sw, Math.max(3, Math.round(sw * SH / SW)), P.aa); shown = toCanvas(img); info = { ww, hh, simW: img.w }; }
  else if (P.view === "bits") { const img = quantise(SRC, P.bits, P.dither, rnd); shown = toCanvas(img); }
  else if (P.view === "jpeg") { const j = jpeg(SRC, P.q); info = { bytes: j.bytes, psnr: psnr(SRC, j.img) }; if (P.diff) { const d = { r: new Float32Array(SRC.r.length), g: new Float32Array(SRC.r.length), b: new Float32Array(SRC.r.length), w: SW, h: SH }; for (const k of ["r", "g", "b"]) for (let i = 0; i < SRC.r.length; i++) d[k][i] = clamp(0.5 + 8 * (j.img[k][i] - SRC[k][i]), 0, 1); shown = toCanvas(d); } else shown = toCanvas(j.img); }
  else shown = toCanvas(SRC);
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (!SRC) { buildScene(); }
  if (dirty) { compute(); dirty = false; }
  const zoomW = P.view === "jpeg" && P.zoom ? Math.min(260, w * 0.3) : 0, aw = w - 30 - zoomW, sc = Math.min(aw / SW, (h - 30) / SH), dw = SW * sc, dh = SH * sc, x0 = 15, y0 = 15;
  view = { x: x0, y: y0, w: dw, h: dh };
  c.imageSmoothingEnabled = false; c.drawImage(shown, x0, y0, dw, dh);
  if (P.view === "jpeg" && P.zoom) { // enlarged corner: fence and tree, 4 × magnified, so the 8 × 8 blocks show
    const zx = SW * 0.56, zy = SH * 0.42, zs = 64; c.drawImage(shown, zx, zy, zs, zs * 1.5, w - zoomW - 5, 15, zoomW, zoomW * 1.5);
    c.strokeStyle = "#ffd166"; c.strokeRect(x0 + zx * sc, y0 + zy * sc, zs * sc, zs * 1.5 * sc); c.strokeRect(w - zoomW - 5, 15, zoomW, zoomW * 1.5);
    c.strokeStyle = "rgba(255,209,102,0.25)"; for (let k = 8; k < zs; k += 8) { const xx = w - zoomW - 5 + k / zs * zoomW; c.beginPath(); c.moveTo(xx, 15); c.lineTo(xx, 15 + zoomW * 1.5); c.stroke(); } for (let k = 8; k < zs * 1.5; k += 8) { const yy = 15 + k / (zs * 1.5) * zoomW * 1.5; c.beginPath(); c.moveTo(w - zoomW - 5, yy); c.lineTo(w - 5, yy); c.stroke(); }
    c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.fillText("zoomed × 4: the faint lines are the 8 × 8 JPEG blocks", w - zoomW - 5, 15 + zoomW * 1.5 + 16);
  }
  if (P.view === "comp") {
    const cr = P.crop, cx = x0 + cr.x * dw, cy = y0 + cr.y * dh, cw = cr.w * dw, ch = cr.h * dh;
    c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(x0, y0, dw, cy - y0); c.fillRect(x0, cy + ch, dw, y0 + dh - cy - ch); c.fillRect(x0, cy, cx - x0, ch); c.fillRect(cx + cw, cy, x0 + dw - cx - cw, ch);
    c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect(cx, cy, cw, ch); c.lineWidth = 1;
    const fr = P.grid === "thirds" ? [1 / 3, 2 / 3] : P.grid === "golden" ? [0.382, 0.618] : P.grid === "centre" ? [0.5] : [];
    c.strokeStyle = "rgba(255,255,255,0.7)"; c.setLineDash([5, 4]); for (const f of fr) { c.beginPath(); c.moveTo(cx + f * cw, cy); c.lineTo(cx + f * cw, cy + ch); c.moveTo(cx, cy + f * ch); c.lineTo(cx + cw, cy + f * ch); c.stroke(); } c.setLineDash([]);
    for (const fx of fr) for (const fy of fr) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(cx + fx * cw, cy + fy * ch, 4, 0, 6.3); c.fill(); }
  }
}
// drag the crop box
let drag = null;
K.pointer(cv.el, {
  down: p => { if (P.view !== "comp" || !view) return; const cr = P.crop, cx = view.x + cr.x * view.w, cy = view.y + cr.y * view.h; if (p.x >= cx && p.x <= cx + cr.w * view.w && p.y >= cy && p.y <= cy + cr.h * view.h) drag = { dx: p.x - cx, dy: p.y - cy }; },
  drag: p => { if (!drag) return; P.crop.x = clamp((p.x - drag.dx - view.x) / view.w, 0, 1 - P.crop.w); P.crop.y = clamp((p.y - drag.dy - view.y) / view.h, 0, 1 - P.crop.h); },
  up: () => drag = null
});

// ---------------- The loop ----------------
let frame = 0;
ui.run(() => { }, () => {
  draw(); if (frame++ % 6) return;
  if (P.view === "pixels") {
    const ppp = info.simW / SW * 5;   // fence posts every 5 scene pixels
    chA.opts.title = "Print size at 300 dpi against megapixels (3:2)"; chA.opts.xLabel = "megapixels"; chA.opts.yLabel = "print width (inches)";
    chA.draw([{ pts: MPS.map(m => [m, printInches(Math.sqrt(m * 1e6 * 1.5), P.dpi)]), color: "#5ab0ff", label: P.dpi + " dpi" }, { pts: [[P.mp, printInches(info.ww, P.dpi)]], type: "dots", color: "#ffd166", r: 6 }], { xMin: 0, xMax: 46, yMin: 0 });
    chB.opts.title = "Samples per fence post (2 needed: the Nyquist limit)"; chB.opts.xLabel = "megapixels (log scale would show the low end better)";
    chB.draw([{ pts: MPS.map(m => [m, simWidth(m) / SW * 5]), color: "#c58cff", label: "pixels per post" }, { pts: [[P.mp, Math.min(6, ppp)]], type: "dots", color: "#ffd166", r: 6 }], { xMin: 0, xMax: 46, yMin: 0, yMax: 6, hlines: [{ y: 2, color: "#ff5d6c", label: "Nyquist: 2 per cycle" }] });
    read.set("a", `${info.ww} × ${info.hh}`); read.set("b", `${printInches(info.ww, P.dpi).toFixed(1)} × ${printInches(info.hh, P.dpi).toFixed(1)} in`); read.set("c", ppp.toFixed(2) + (ppp < 2 ? " (aliasing!)" : "")); read.set("d", (info.ww * info.hh * 3 / 1e6).toFixed(1) + " MB");
  } else if (P.view === "bits") {
    chA.opts.title = "A smooth ramp rounded to " + P.bits + " bits"; chA.opts.xLabel = "input brightness"; chA.opts.yLabel = "stored value";
    const L = Math.pow(2, P.bits) - 1, pts = []; for (let i = 0; i <= 400; i++) { const v = i / 400; pts.push([v, Math.round(v * L) / L]); }
    chA.draw([{ pts, color: "#ffd166", label: "stored" }, { pts: [[0, 0], [1, 1]], color: "#7d8aa5", dash: [4, 4], label: "ideal" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    chB.opts.title = "Number of levels: 2 to the power of bits"; chB.opts.xLabel = "bits"; chB.opts.yLabel = "levels";
    chB.draw([{ pts: [1, 2, 3, 4, 5, 6, 7, 8].map(b => [b, Math.pow(2, b)]), type: "bars", w: 0.6, color: "#5ab0ff" }, { pts: [[P.bits, Math.pow(2, P.bits)]], type: "dots", color: "#ffd166", r: 6 }], { xMin: 0.5, xMax: 8.5, yMin: 0 });
    read.set("a", Math.pow(2, P.bits)); read.set("b", Math.pow(2, 3 * P.bits).toLocaleString("en-GB")); read.set("c", (100 / L / Math.sqrt(12)).toFixed(2) + "%"); read.set("d", (6000 * 4000 * 3 * P.bits / 8 / 1e6).toFixed(0) + " MB at 24 MP");
  } else if (P.view === "jpeg") {
    chA.opts.title = "File size against quality (this picture)"; chA.opts.xLabel = "quality"; chA.opts.yLabel = "kB";
    if (!info.curve) { info.curve = [5, 10, 20, 30, 50, 70, 80, 90, 95, 100].map(q => { const j = jpeg(SRC, q); return [q, j.bytes / 1000, psnr(SRC, j.img)]; }); }
    chA.draw([{ pts: info.curve.map(p => [p[0], p[1]]), color: "#5ab0ff", label: "file size" }, { pts: [[P.q, info.bytes / 1000]], type: "dots", color: "#ffd166", r: 6 }], { xMin: 0, xMax: 100, yMin: 0 });
    chB.opts.title = "PSNR against quality (above 40 dB: invisible)"; chB.opts.xLabel = "quality"; chB.opts.yLabel = "dB";
    chB.draw([{ pts: info.curve.map(p => [p[0], p[2]]), color: "#c58cff", label: "PSNR" }, { pts: [[P.q, info.psnr]], type: "dots", color: "#ffd166", r: 6 }], { xMin: 0, xMax: 100, hlines: [{ y: 40, color: "#7fe3a0", label: "40 dB" }, { y: 30, color: "#ff5d6c", label: "30 dB" }] });
    read.set("a", (info.bytes / 1000).toFixed(1) + " kB"); read.set("b", (SW * SH * 3 / info.bytes).toFixed(1) + " × smaller"); read.set("c", info.psnr.toFixed(1) + " dB"); read.set("d", info.psnr > 40 ? "looks identical" : info.psnr > 32 ? "close look shows artefacts" : "obvious artefacts");
  } else {
    const cr = P.crop, tx = (SW * 0.63 / SW - cr.x) / cr.w, ty = ((SH * 0.55 - 92) / SH - cr.y) / cr.h, hz = ((SH * 0.55) / SH - cr.y) / cr.h, pts = [1 / 3, 2 / 3];
    let best = 9; for (const a of pts) for (const b of pts) best = Math.min(best, Math.hypot(tx - a, ty - b));
    chA.opts.title = "Where is the tree across the crop?"; chA.opts.xLabel = "fraction of the width"; chA.opts.yLabel = "";
    chA.draw([{ pts: [[tx, 1]], type: "bars", w: 0.01, color: "#7fe3a0", label: "tree" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1, vlines: [{ x: 1 / 3, label: "⅓" }, { x: 2 / 3, label: "⅔" }, { x: 0.5, color: "#7d8aa5", label: "centre" }] });
    chB.opts.title = "Where is the horizon down the crop?"; chB.opts.xLabel = "fraction of the height";
    chB.draw([{ pts: [[hz, 1]], type: "bars", w: 0.01, color: "#ffd166", label: "horizon" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1, vlines: [{ x: 1 / 3, label: "⅓" }, { x: 2 / 3, label: "⅔" }] });
    read.set("a", (tx >= 0 && tx <= 1 ? Math.round(tx * 100) + "% across" : "outside the crop")); read.set("b", best < 0.06 ? "on a thirds point ✓" : Math.round(best * 100) + "% of the frame away");
    read.set("c", hz < 0 || hz > 1 ? "not in the crop" : Math.round(hz * 100) + "% down" + (Math.abs(hz - 1 / 3) < 0.04 || Math.abs(hz - 2 / 3) < 0.04 ? " ✓" : "")); read.set("d", (24 * cr.w * cr.h).toFixed(1) + " MP left");
  }
});
set({});
ui.tip("Change the resolution, then try Bit depth, JPEG and Composition at the top of the controls.", 7000);
