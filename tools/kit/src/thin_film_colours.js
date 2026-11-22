/* =====================================================================
   THIN-FILM INTERFERENCE COLOURS
   A soap film is a few hundred nanometres thick: about one wavelength of
   light. Light reflects from its front surface AND from its back surface.
   The two reflected waves overlap. The one from the back has travelled
   further, 2·n·d·cos θ more (d = thickness, n = refractive index, θ = the
   angle inside the film), so for some wavelengths the two waves arrive in
   step and add up (bright), and for others they arrive out of step and
   cancel (dark). White light contains every wavelength, so the film
   reflects some colours strongly and others hardly at all: the swirling
   colours of bubbles and oil on a wet road.

   (A reflection off a denser material flips the wave over, a half-wave
   shift. For a soap film in air only the front reflection flips, which is
   why a very thin film, much thinner than a wavelength, looks black.)

   This page works out the colour properly: for each of 36 wavelengths
   from 380 to 730 nm it uses the exact reflection formula for a film
   (Airy, with Fresnel's coefficients, both polarisations averaged), adds
   up the reflected light weighted by daylight and by how the eye responds
   to each wavelength (the CIE 1931 colour-matching functions), and turns
   the result into screen colour (sRGB). The graphics card does this for
   every pixel, every frame.
   ===================================================================== */
"use strict";
// ---------------- Optics (the same formulas are written again in the shader) ----------------
// reflectance of a film of index nf and thickness d (nm) between n1 (where the light comes from) and n3, at incidence angle th1 (radians), wavelength lam (nm)
function reflectance(lam, d, nf, n1, n3, th1) {
  const s1 = Math.sin(th1), c1 = Math.cos(th1), sf = n1 * s1 / nf, cf = Math.sqrt(Math.max(0, 1 - sf * sf)), s3 = n1 * s1 / n3, c3 = Math.sqrt(Math.max(0, 1 - s3 * s3));
  const phi = 4 * Math.PI * nf * d * cf / lam;   // extra phase of the wave reflected from the back surface
  const R = (a, b) => { const num = a * a + b * b + 2 * a * b * Math.cos(phi), den = 1 + a * a * b * b + 2 * a * b * Math.cos(phi); return num / den; };
  const rs12 = (n1 * c1 - nf * cf) / (n1 * c1 + nf * cf), rs23 = (nf * cf - n3 * c3) / (nf * cf + n3 * c3);   // Fresnel: s (perpendicular) polarisation
  const rp12 = (nf * c1 - n1 * cf) / (nf * c1 + n1 * cf), rp23 = (n3 * cf - nf * c3) / (n3 * cf + nf * c3);   // p (parallel) polarisation
  return (R(rs12, rs23) + R(rp12, rp23)) / 2;
}
// CIE 1931 colour-matching functions, as fitted by sums of lopsided Gaussians (Wyman, Sloan and Shirley, 2013)
const lobe = (l, mu, s1, s2) => { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
const cieX = l => 1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2);
const cieY = l => 0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1);
const cieZ = l => 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8);
// daylight as a 6500 K black body (Planck's law, arbitrary units)
const planck = l => { const x = l * 1e-9; return 1 / (x ** 5 * (Math.exp(1.4388e-2 / (x * 6500)) - 1)); };
const LAMS = Array.from({ length: 36 }, (_, i) => 380 + 10 * i);
const Y_WHITE = LAMS.reduce((s, l) => s + planck(l) * cieY(l), 0);
// the colour of light with reflectance R(λ): CIE XYZ → linear sRGB (no gamma), normalised so a perfect mirror has Y = 1
function colourOf(Rf) { let X = 0, Y = 0, Z = 0; for (const l of LAMS) { const e = planck(l) * Rf(l); X += e * cieX(l); Y += e * cieY(l); Z += e * cieZ(l); } X /= Y_WHITE; Y /= Y_WHITE; Z /= Y_WHITE;
  return { X, Y, Z, rgb: [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z] }; }
// wavelength of the strongest reflection between 380 and 730 nm (fine search)
function peakLambda(d, nf, n1, n3, th) { let best = 380, bv = -1; for (let l = 380; l <= 730; l += 0.5) { const v = reflectance(l, d, nf, n1, n3, th); if (v > bv) { bv = v; best = l; } } return best; }
const SUBSTRATES = { air: ["air (a soap film)", 1.0], water: ["water (oil on a puddle)", 1.333], glass: ["glass (a coated lens)", 1.52] };

if (typeof module !== "undefined") module.exports = { reflectance, colourOf, peakLambda, cieY, LAMS };
else page();
function page() {
let scene = "bubble", d0 = 600, nf = 1.33, sub = "air", angle = 0, light = 0, drain = 1, swirl = 1, gain = 3, t = 0, hover = null, wedgeTop = 0, wedgeBottom = 1500;
const LIGHTS = [["white", "daylight (white)", 0], ["sodium", "sodium lamp 589 nm", 589], ["red", "red laser 633 nm", 633], ["green", "green laser 532 nm", 532], ["blue", "blue LED 450 nm", 450]];
const ui = K.app({
  title: "Thin-Film Interference Colours", subject: "Physics",
  blurb: "Soap bubbles, oil slicks and the colours of nothing",
  reset: () => { setScene("bubble"); t = 0; },
  missions: [
    { title: "Why does the top go black?", q: "Watch the bubble for a minute. The film drains downwards, so it is thinnest at the top. What colour does the very top turn just before a real bubble would pop?", hint: "Black. When the film is much thinner than a wavelength (under about 30 nm), the light reflected from the back is almost exactly half a wave out of step with the light from the front (the front reflection flips the wave, the back one does not), so they cancel for every colour. Bubbles often show a black cap just before they burst.", setup() { setScene("bubble"); t = 0; ctl.drain.set(3, true); } },
    { title: "Newton's sequence of colours", q: "Open Newton's colour chart. Starting from zero thickness, read the colours in order. Why do the colours get paler after about 1000 nm?", hint: "Black, grey-white, yellow, red-purple ('the sensitive tint'), blue, green, yellow, red, then repeating pinks and greens. Thicker films have reflection peaks closer together in wavelength, so several colours are reflected at once and they mix towards white. Newton described this sequence in Opticks (1704).", setup() { setScene("chart"); } },
    { title: "One colour of light", q: "Choose the wedge, then switch the light to the sodium lamp. What do you see now? Measure the spacing between dark bands. Then try the blue LED.", hint: "Bright and dark stripes (fringes), each a step of λ/(2n) in thickness: about 221 nm of soap film for sodium light. With blue light the fringes are closer together, because λ is smaller. With white light, the fringes of every colour overlap, which is where the colours come from. The batch run measures fringe spacing against wavelength.", setup() { setScene("wedge"); setLight(1); } },
    { title: "Tilt it", q: "Choose a film about 400 nm thick and slowly raise the viewing angle. Which way does the colour change? Why?", hint: "The colours shift towards blue (shorter wavelengths) as you tilt. Inside the film the light travels at an angle, and the extra path is 2nd·cos θ, which gets smaller as θ grows, so the film acts as if it were thinner. That is why a bubble's colours change across its curved surface, and why a peacock's feathers shimmer.", setup() { setScene("uniform"); d0 = 400; ctl.d.set(400); ctl.angle.set(0, true); } },
    { title: "Oil on a wet road", q: "Look at the oil slick. Oil (n ≈ 1.47) sits on water (n = 1.33), not air. Change the film's refractive index to 1.2 (less than water). What happens to the thinnest parts?", hint: "With oil on water, both reflections flip (each is off a denser material), so a very thin oil film looks bright (white-grey), not black. With n = 1.2 only the back reflection flips and thin parts go dark again. Which reflections flip decides whether a vanishing film is bright or dark.", setup() { setScene("oil"); } },
    { title: "A non-reflective coating", q: "Choose a glass substrate, set the film index to 1.38 (magnesium fluoride) and thickness to about 100 nm. Look at the reflectance chart. Why do camera lenses look faintly purple?", hint: "A film a quarter of a wavelength thick (in the film), with an index between air and glass, makes the two reflections cancel near the middle of the spectrum (green). Reflection drops from about 4% to about 1%. Red and blue are cancelled less well, so the little light that is reflected looks purple.", setup() { setScene("uniform"); setSub("glass"); nf = 1.38; ctl.nf.set(1.38); d0 = 100; ctl.d.set(100); } }
  ],
  batch: [
    { title: "Reflection against thickness (green light)", question: "How much 550 nm light does a soap film reflect, as its thickness changes?", how: "Each run: a 'measurement' with a light meter: 2000 photons of 550 nm light hit the film (n = 1.33, in air, straight on); each is reflected with the film's reflectance. The thickness is set to within ±3 nm. The result is the fraction reflected.", xLabel: "film thickness (nm)", yLabel: "fraction of light reflected", xs: [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400], reps: 4, yMin: 0, theory: d => reflectance(550, d, 1.33, 1, 1, 0), theoryLabel: "Airy formula", run: (x, r) => photons(550, Math.max(0, x + (r() - 0.5) * 6), r), note: "The scatter comes from counting a finite number of photons (an SE of about 0.004 when 2000 photons give 7%) and the ±3 nm uncertainty in thickness. Bright peaks at d = λ/(4n), 3λ/(4n), … = 103, 310 nm; dark at 0, 207, 414 nm: every λ/(2n) = 207 nm the pattern repeats. A soap film in air never reflects more than about 7.7% (when the two reflections add up exactly)." },
    { title: "The spectrum of a 300 nm film", question: "Which wavelengths does a 300 nm soap film reflect most strongly?", how: "As above, but the x-axis setting is the wavelength used, at a fixed thickness of 300 nm.", xLabel: "wavelength (nm)", yLabel: "fraction of light reflected", xs: [400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700], reps: 4, yMin: 0, theory: l => reflectance(l, 300, 1.33, 1, 1, 0), theoryLabel: "Airy formula (d = 300 nm)", run: (x, r) => photons(x, 300 + (r() - 0.5) * 6, r), note: "This is the film's reflection spectrum. For a soap film in air the front reflection flips the wave and the back one does not, so the bright peaks sit where 2nd = (m + ½)λ. For d = 300 nm, 2nd = 798 nm, so the peak in the visible is at 798/1.5 = 532 nm (green), with dips where 2nd = mλ: 399 nm (violet) and 798 nm (deep red). The film looks green." },
    { title: "Fringe spacing and wavelength", question: "In a wedge-shaped film lit by one colour, how far apart are the dark fringes?", how: "Each run: a soap wedge (n = 1.33) whose thickness grows by 0.5 nm per micrometre across it; the brightness along it is 'photographed' with noise, the dark fringes are found, and their average spacing is measured.", xLabel: "wavelength (nm)", yLabel: "fringe spacing (μm)", xs: [420, 470, 520, 570, 620, 670], reps: 4, yMin: 0, theory: l => l / (2 * 1.33 * 0.5), theoryLabel: "λ / (2n × slope)", fit: true, run: (x, r) => fringeSpacing(x, r), note: "Each dark fringe is where the film is a whole number of half-wavelengths (in the film) thicker than at the last one: Δd = λ/(2n). With a slope of 0.5 nm per μm that is λ/(1.33) μm: about 391 μm for 520 nm light. Longer wavelengths give wider fringes, in proportion. Noise in the photograph makes the measured spacings scatter a little." },
    { title: "Tilting shifts the colour", question: "For a 400 nm soap film, which wavelength is reflected most strongly at different viewing angles?", how: "Each run: the reflection spectrum is measured with noise (5000 photons per wavelength, every 2 nm from 470 to 730 nm) and the brightest wavelength there is found.", xLabel: "viewing angle (°)", yLabel: "wavelength of the strongest reflection (nm)", xs: [0, 15, 30, 45, 60, 75], reps: 4, theory: a => 4 * 1.33 * 400 * Math.sqrt(1 - (Math.sin(a * Math.PI / 180) / 1.33) ** 2) / 3, theoryLabel: "λ = 4nd·cos θ / 3", run: (x, r) => measuredPeak(x, r), note: "Straight on, a 400 nm film reflects most strongly at 2nd/1.5 = 709 nm (deep red) and again at 2nd/2.5 = 426 nm (violet). Tilting moves the red peak to shorter wavelengths, to about 488 nm at 75°, because the extra path 2nd·cos θ (θ inside the film) shrinks: the colour changes as you tilt. Counting noise moves single measurements by a few nanometres, more where the peak is broad and flat." }
  ],
  notes: `<h3>What is being modelled</h3>
<ul><li>A film of thickness d and refractive index n (soap water 1.33, oil 1.47, magnesium fluoride 1.38) on air, water or glass, lit from air.</li>
<li><b>Reflectance</b> at each wavelength from the exact formula for one film (Airy summation of all the multiple reflections, with Fresnel's reflection coefficients for both polarisations, averaged: unpolarised light).</li>
<li><b>Colour</b>: the reflectance at 36 wavelengths (380–730 nm) × daylight (a 6500 K black body) × the CIE 1931 colour-matching functions (a close analytic fit), summed to CIE X, Y, Z and converted to sRGB for the screen. "Brightness" multiplies the result, because a real film reflects only a few percent of the light; the colours are what your eye would see against a dark background.</li>
<li><b>The bubble</b>: the film drains under gravity, so it is thinnest at the top and thins with time; swirls (computed noise, slowly flowing) wrinkle the thickness, as convection does in a real film. The viewing angle changes across the sphere.</li>
<li><b>The wedge</b>: a vertical soap film in a frame, thickness rising evenly from top to bottom.</li>
<li><b>The oil slick</b>: oil films of uneven thickness on water.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Only light reflected from the film is shown; the bubble's back surface and the scene behind it are not.</li>
<li>The refractive index is taken to be the same at every wavelength (no dispersion), and the film absorbs nothing.</li>
<li>Daylight is approximated by a black body; real daylight has dips. Screens cannot show every colour the eye can see, so the most saturated colours are clipped.</li>
<li>The draining and swirling are made up to look right (no fluid dynamics).</li>
<li>Batch runs pretend to measure with a photon counter (random counting noise) and a thickness known to ±3 nm, then compare with the formula.</li></ul>
<p>See also <a href="../optics_refraction/optics-refraction.html">Light: Refraction, Lenses and Fibres</a>, <a href="../waves/waves.html">Ripple Tank</a> (interference of water waves) and <a href="../../photography/light_and_colour/light-and-colour.html">Light and Colour</a>.</p>`
});
// "measurements" for the batch run: photons reflected with probability R, a noisy line scan of a wedge, a noisy spectrum
function photons(l, d, r, n = 2000) { const R = reflectance(l, d, 1.33, 1, 1, 0); let k = 0; for (let i = 0; i < n; i++) if (r() < R) k++; return k / n; }
function fringeSpacing(l, r) {
  const slope = 0.5, xs = [], ys = []; for (let x = 0; x <= 4000; x += 2) { const d = 20 + slope * x, R = reflectance(l, d, 1.33, 1, 1, 0); xs.push(x); ys.push(R + (r() - 0.5) * 0.02); }
  const sm = ys.map((v, i) => { let s = 0, c = 0; for (let k = -6; k <= 6; k++) if (ys[i + k] != null) { s += ys[i + k]; c++; } return s / c; });   // smooth out the noise
  const mins = []; for (let i = 10; i < sm.length - 10; i++) { let low = true; for (let k = -10; k <= 10; k++) if (sm[i + k] < sm[i]) { low = false; break; } if (low && sm[i] < 0.05) { if (!mins.length || xs[i] - mins[mins.length - 1] > 50) mins.push(xs[i]); } }
  return mins.length > 1 ? (mins[mins.length - 1] - mins[0]) / (mins.length - 1) : NaN;
}
function measuredPeak(a, r) { let best = 0, bv = -1; for (let l = 470; l <= 730; l += 2) { const R = reflectance(l, 400, 1.33, 1, 1, a * Math.PI / 180); let k = 0; for (let i = 0; i < 5000; i++) if (r() < R) k++; const sm = k; if (sm > bv) { bv = sm; best = l; } } return best; }

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("What to look at");
ctl.scene = K.seg(g, { value: scene, options: [["bubble", "🫧 Soap bubble"], ["wedge", "Wedge film"], ["oil", "Oil slick"], ["uniform", "Even film"], ["chart", "Newton's colour chart"]], on: v => setScene(v) });
g = ui.group("The film");
ctl.d = K.slider(g, { label: "Thickness", min: 0, max: 2000, step: 5, value: d0, fmt: v => v + " nm", on: v => d0 = v, tip: "The typical thickness (the bubble's starting thickness; an even film's thickness)" });
ctl.nf = K.slider(g, { label: "Film's refractive index", min: 1.1, max: 2.4, step: 0.01, value: nf, fmt: v => v.toFixed(2), on: v => nf = v, tip: "Soap water 1.33, oil 1.47, MgF₂ 1.38, TiO₂ 2.4" });
ctl.sub = K.seg(g, { label: "Behind the film", value: sub, options: Object.keys(SUBSTRATES).map(k => [k, SUBSTRATES[k][0]]), on: v => setSub(v) });
ctl.angle = K.slider(g, { label: "Viewing angle (even film and chart)", min: 0, max: 80, step: 1, value: 0, fmt: v => v + "°", on: v => angle = v });
g = ui.group("Light and motion");
ctl.light = K.seg(g, { label: "Light", value: 0, options: LIGHTS.map(([k, n], i) => [i, n]), on: v => setLight(v) });
ctl.drain = K.slider(g, { label: "Draining (bubble)", min: 0, max: 5, step: 0.25, value: drain, fmt: v => v ? "× " + v : "none", on: v => drain = v });
ctl.swirl = K.slider(g, { label: "Swirling", min: 0, max: 3, step: 0.1, value: swirl, fmt: v => v ? "× " + v.toFixed(1) : "still", on: v => swirl = v });
ctl.gain = K.slider(g, { label: "Brightness", min: 1, max: 8, step: 0.5, value: gain, fmt: v => "× " + v, on: v => gain = v, tip: "Real films reflect only a few percent; this brightens the picture" });
let r1 = K.row(g); K.btn(r1, "🫧 New bubble", () => { t = 0; setScene("bubble"); }, "primary"); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("thin-film", view, cv));
const read = K.readout(g, [["d", "thickness (at the mouse)"], ["R", "reflected at 550 nm"], ["col", "colour"], ["age", "bubble age"]]);
K.note(g, "Hover over the picture to read the thickness and spectrum there (wedge, even film, chart).");
function setScene(s) { scene = s; ctl.scene.set(s); if (s === "oil") { nf = 1.47; ctl.nf.set(1.47); setSub("water"); } else if (s === "bubble" || s === "wedge") { nf = 1.33; ctl.nf.set(1.33); setSub("air"); } }
function setSub(s) { sub = s; ctl.sub.set(s); }
function setLight(i) { light = i; ctl.light.set(i); }

// ---------------- The graphics card ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.25 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, prog;
if (ok) {
  quad = K.gl.quad(gl);
  prog = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv;
    uniform vec2 uCanvas; uniform float uScene, uD0, uNf, uN3, uAngle, uLight, uLam, uT, uDrain, uSwirl, uGain, uYw, uDmax;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
    // flowing swirls: the pattern is pushed around by another noise field (domain warping)
    float swirls(vec2 p, float t) { vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0))); return fbm(p + 2.5 * q + vec2(t * 0.03, -t * 0.02)); }
    // the CIE colour-matching functions (Wyman et al. 2013 fit)
    float lobe(float l, float mu, float s1, float s2) { float t = (l - mu) / (l < mu ? s1 : s2); return exp(-0.5 * t * t); }
    vec3 cmf(float l) { return vec3(1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2),
      0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1), 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8)); }
    float planck(float l) { float x = l * 1e-9; return 1.0 / (pow(x * 1e6, 5.0) * (exp(1.4388e-2 / (x * 6500.0)) - 1.0)); }
    float airy(float a, float b, float c) { return (a * a + b * b + 2.0 * a * b * c) / (1.0 + a * a * b * b + 2.0 * a * b * c); }
    // reflectance of the film (thickness d nm) at wavelength l nm and incidence angle with cosine c1, from air
    float refl(float l, float d, float c1) {
      float s1 = sqrt(max(0.0, 1.0 - c1 * c1)), sf = s1 / uNf, cf = sqrt(1.0 - sf * sf), s3 = s1 / uN3, c3 = sqrt(max(0.0, 1.0 - s3 * s3));
      float c = cos(12.566371 * uNf * d * cf / l);
      float rs12 = (c1 - uNf * cf) / (c1 + uNf * cf), rs23 = (uNf * cf - uN3 * c3) / (uNf * cf + uN3 * c3);
      float rp12 = (uNf * c1 - cf) / (uNf * c1 + cf), rp23 = (uN3 * cf - uNf * c3) / (uN3 * cf + uNf * c3);
      return 0.5 * (airy(rs12, rs23, c) + airy(rp12, rp23, c));
    }
    vec3 film(float d, float c1) {   // the colour reflected by a film, in linear sRGB
      if (uLight > 0.5) { vec3 xyz = cmf(uLam); vec3 rgb = mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * xyz; return max(rgb, 0.0) / max(max(rgb.r, rgb.g), rgb.b) * refl(uLam, d, c1) * 4.0; }
      vec3 xyz = vec3(0.0); for (int i = 0; i < 36; i++) { float l = 380.0 + 10.0 * float(i); xyz += planck(l) * refl(l, d, c1) * cmf(l); }
      xyz /= uYw; return mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * xyz;
    }
    vec3 toScreen(vec3 lin) { lin = max(lin, 0.0) * uGain; lin = lin / (1.0 + 0.15 * lin); return pow(lin, vec3(1.0 / 2.2)); }
    void main() {
      vec2 px = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y), uv = px / uCanvas; float asp = uCanvas.x / uCanvas.y;
      vec3 bg = mix(vec3(0.03, 0.035, 0.06), vec3(0.01, 0.012, 0.02), uv.y);
      if (uScene < 0.5) {   // ---- soap bubble ----
        vec2 p = (px - uCanvas * 0.5) / (uCanvas.y * 0.42);
        float r2 = dot(p, p); if (r2 > 1.0) { gl_FragColor = vec4(bg + 0.03 * exp(-(r2 - 1.0) * 20.0), 1.0); return; }
        vec3 n = vec3(p.x, -p.y, sqrt(1.0 - r2));
        float h = n.y;                                                    // height on the bubble: +1 top, −1 bottom
        // thickness: thicker at the bottom, thinning from the top as it drains, wrinkled by swirls
        float age = uT * uDrain, top = uD0 * exp(-age / 25.0), thick = mix(uD0 * 1.6, top, (h + 1.0) * 0.5);
        vec2 sp = vec2(atan(n.x, n.z) * 1.6, h * 2.2);
        float sw = swirls(sp * 1.3, uT * uSwirl) - 0.5;
        float d = max(0.0, thick * (1.0 + 0.55 * uSwirl * sw));
        vec3 col = toScreen(film(d, n.z));
        // a soft window reflection and a rim, so it reads as a sphere
        float spec = smoothstep(0.92, 1.0, dot(n, normalize(vec3(-0.45, 0.5, 0.75)))); col += vec3(0.5) * spec * 0.6;
        col += bg * 0.6 + vec3(0.12, 0.14, 0.2) * pow(1.0 - n.z, 3.0) * 0.6;
        gl_FragColor = vec4(col, 1.0); return;
      }
      if (uScene < 1.5) {   // ---- wedge: a vertical film in a frame, thin at the top ----
        vec2 a = vec2(0.2, 0.08), b = vec2(0.8, 0.92); if (uv.x < a.x || uv.x > b.x || uv.y < a.y || uv.y > b.y) { float frame = step(abs(uv.x - 0.5), 0.31) * step(abs(uv.y - 0.5), 0.43); gl_FragColor = vec4(mix(bg, vec3(0.45, 0.42, 0.38), frame), 1.0); return; }
        float f = (uv.y - a.y) / (b.y - a.y), d = uDmax * f * f * 0.6 + uDmax * 0.4 * f;   // drains: thinner at the top
        d *= 1.0 + 0.04 * uSwirl * (swirls(uv * vec2(3.0, 1.0), uT) - 0.5);
        gl_FragColor = vec4(toScreen(film(d, 1.0)), 1.0); return;
      }
      if (uScene < 2.5) {   // ---- oil on a wet road ----
        vec2 q = vec2(uv.x * asp, uv.y) * 2.2; float blob = swirls(q, uT * uSwirl * 0.5), road = 0.4 + 0.6 * noise(px * 0.35);
        float d = uD0 * smoothstep(0.35, 0.75, blob) * (0.4 + 1.1 * blob);
        vec3 col = vec3(0.015, 0.017, 0.022) * road + toScreen(film(d, 1.0)) * (d > 1.0 ? 1.0 : 0.45);
        gl_FragColor = vec4(col, 1.0); return;
      }
      float cA = cos(uAngle * 0.0174533);
      if (uScene < 3.5) { gl_FragColor = vec4(toScreen(film(uD0, cA)) + bg * 0.3, 1.0); return; }   // ---- an even film: one thickness everywhere ----
      // ---- Newton's colour chart: thickness 0 to uDmax across the screen ----
      gl_FragColor = vec4(toScreen(film(uDmax * uv.x, cA)), 1.0);
    }`);
}
// the shader's black body uses wavelengths in micrometres, so its white point is worked out the same way
const YW = LAMS.reduce((s, l) => s + cieY(l) / ((l / 1000) ** 5 * (Math.exp(1.4388e-2 / (l * 1e-9 * 6500)) - 1)), 0);

// ---------------- Drawing ----------------
const n3 = () => SUBSTRATES[sub][1];
function thicknessAt(p) { if (!p) return null; const u = p.x / cv.w, v = p.y / cv.h;
  if (scene === "chart") return 1600 * u; if (scene === "uniform") return d0;
  if (scene === "wedge") { if (u < 0.2 || u > 0.8 || v < 0.08 || v > 0.92) return null; const f = (v - 0.08) / 0.84; return 1600 * (f * f * 0.6 + 0.4 * f); } return null; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.clearRect(0, 0, w, h);
  if (ok) { K.gl.bindTarget(gl, null); const L = LIGHTS[light];
    prog.set({ uCanvas: [view.el.width, view.el.height], uScene: ["bubble", "wedge", "oil", "uniform", "chart"].indexOf(scene), uD0: d0, uNf: nf, uN3: n3(), uAngle: angle, uLight: light ? 1 : 0, uLam: L[2] || 550, uT: t, uDrain: drain, uSwirl: swirl, uGain: gain, uYw: YW, uDmax: 1600 });
    quad.draw(prog); }
  c.font = "600 12px Segoe UI,system-ui,sans-serif"; c.fillStyle = "rgba(255,255,255,.85)"; c.textAlign = "center";
  if (scene === "chart") { for (let dd = 0; dd <= 1600; dd += 200) { const x = dd / 1600 * w; c.fillRect(x, h * 0.92, 1, h * 0.08); c.fillText(dd + " nm", Math.min(w - 30, Math.max(24, x)), h * 0.9); }
    c.textAlign = "left"; c.fillText("film thickness →  (" + (angle ? "viewed at " + angle + "°" : "viewed straight on") + ")", 12, 20); }
  if (scene === "wedge") { c.textAlign = "left"; c.fillText("thin (top)", w * 0.81, h * 0.1); c.fillText("thick (bottom)", w * 0.81, h * 0.9); }
  const dh = thicknessAt(hover); if (dh != null && hover) { c.strokeStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(hover.x, hover.y, 6, 0, 6.3); c.stroke(); c.textAlign = "left"; c.fillText(Math.round(dh) + " nm", hover.x + 10, hover.y - 8); }
}
K.pointer(cv.el, { hover(p) { hover = p; }, drag(p) { hover = p; }, leave() { hover = null; } });
const chS = K.chart(ui.dock, { title: "Reflection spectrum", xLabel: "wavelength (nm)", yLabel: "fraction reflected", yMin: 0 });
const chD = K.chart(ui.dock, { title: "Reflection against thickness", xLabel: "thickness (nm)", yLabel: "fraction reflected", yMin: 0 });
const colourName = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx < 0.01) return "black"; if (mx - mn < 0.15 * mx) return mx > 0.05 ? "white / grey" : "dark grey";
  const hue = (r === mx ? (g - b) / (mx - mn) : g === mx ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn)) * 60, H = (hue + 360) % 360;
  return H < 20 ? "red" : H < 45 ? "orange" : H < 70 ? "yellow" : H < 160 ? "green" : H < 200 ? "cyan" : H < 255 ? "blue" : H < 290 ? "violet" : H < 335 ? "magenta" : "red"; };

// ---------------- The loop ----------------
setScene("bubble");
let fr = 0;
ui.run(dt => { t += dt; }, dt => {
  draw(dt); if (fr++ % 6) return;
  const dh = thicknessAt(hover), d = dh != null ? dh : d0, th = (scene === "uniform" || scene === "chart" ? angle : 0) * Math.PI / 180, N3 = n3();
  chS.draw([{ pts: LAMS.concat([730]).map(l => [l, reflectance(l, d, nf, 1, N3, th)]), color: K.cssVar("--s1"), label: Math.round(d) + " nm" }], { xMin: 380, xMax: 730, yMax: Math.max(0.05, ...LAMS.map(l => reflectance(l, d, nf, 1, N3, th))) * 1.1 });
  const lam = LIGHTS[light][2] || 550, pts = []; for (let x = 0; x <= 1600; x += 8) pts.push([x, reflectance(lam, x, nf, 1, N3, th)]);
  chD.draw([{ pts, color: K.cssVar("--s0"), label: lam + " nm" }], { xMin: 0, xMax: 1600, vlines: [{ x: d, color: K.cssVar("--s2") }] });
  const col = colourOf(l => reflectance(l, d, nf, 1, N3, th));
  read.set("d", Math.round(d) + " nm"); read.set("R", (reflectance(550, d, nf, 1, N3, th) * 100).toFixed(1) + "%"); read.set("col", colourName(col.rgb)); read.set("age", scene === "bubble" ? (t * drain).toFixed(0) + " s (drained)" : "–");
  ui.hud(`<b style="font-size:15px">${{ bubble: "Soap bubble", wedge: "Wedge film", oil: "Oil on a wet road", uniform: "Even film, " + d0 + " nm", chart: "Newton's colour chart" }[scene]}</b><br>n = ${nf.toFixed(2)} on ${SUBSTRATES[sub][0].split(" (")[0]} · ${LIGHTS[light][1]}`);
});
window.filmTest = { setScene, setLight, age: s => t = s };
ui.tip("Every pixel's colour is worked out from the light reflected by the film's front and back surfaces, at 36 wavelengths", 8000);
}
