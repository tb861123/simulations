/* =====================================================================
   LIGHT AND COLOUR
   1. COLOUR TEMPERATURE. Hot objects glow: a candle flame (about 1900 K)
      is orange, a tungsten bulb (2700–3200 K) yellow, sunlight (about
      5500 K) white, shade under a blue sky (7000–10000 K) bluish. The
      camera's WHITE BALANCE divides out the colour of the light so that
      a grey card looks grey. Set it wrong and the picture gets a cast;
      AUTO white balance guesses, assuming the scene averages to grey.
   2. MIXING COLOUR. Lights ADD (additive mixing): red + green = yellow,
      all three = white (screens, the camera sensor). Inks, dyes and
      filters SUBTRACT (subtractive mixing): each absorbs part of the
      light, so cyan + magenta = blue, all three = black (prints).
   3. STUDIO LIGHTING. A small lamp's light spreads out over an area
      that grows as distance²: illuminance E = I ÷ d² (INVERSE SQUARE
      LAW). Twice as far = a quarter of the light = 2 stops darker. The
      LIGHTING RATIO compares the lit side of a face with the shadow side.
      A big light source (softbox) gives soft shadows with gradual edges;
      a small one gives hard shadows (the penumbra is narrow).
   ===================================================================== */
const clamp = K.clamp;
// ---------------- colour of a glowing (black) body at temperature T ----------------
// a well-known curve fit to the colour of black-body light (Tanner Helland), returned as linear RGB, normalised so green = 1
function bbRGB(T) {
  const t = T / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const lin = v => Math.pow(clamp(v, 0, 255) / 255, 2.2), L = [lin(r), lin(g), lin(b)];
  return L.map(v => v / Math.max(L[1], 1e-6));
}
const toSRGB = v => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
const rgbCss = a => `rgb(${toSRGB(a[0])},${toSRGB(a[1])},${toSRGB(a[2])})`;
const mired = T => 1e6 / T;
// the still-life: surfaces and how much red, green and blue light each reflects (linear)
const PATCHES = [
  ["grey card", [0.18, 0.18, 0.18]], ["white shirt", [0.8, 0.8, 0.78]], ["skin", [0.45, 0.3, 0.22]], ["red apple", [0.5, 0.06, 0.05]],
  ["lemon", [0.6, 0.5, 0.05]], ["leaves", [0.08, 0.22, 0.05]], ["blue mug", [0.04, 0.09, 0.4]], ["black cloth", [0.03, 0.03, 0.03]]
];
// what the camera records: reflectance × light colour ÷ white balance colour (all per channel)
// (the white balance can be a temperature, or the three channel corrections that auto white balance chose)
const record = (refl, T, Twb, k = 1) => { const L = bbRGB(T), W = Array.isArray(Twb) ? Twb : bbRGB(Twb); return refl.map((v, i) => k * v * L[i] / W[i]); };
// auto white balance by the 'grey world' assumption: whatever colour the whole frame averages to is taken to be the colour of the light.
// It returns the assumed light colour (red, green, blue relative to green), which the camera then divides out.
function autoWB(scene, T) { const L = bbRGB(T), m = [0, 1, 2].map(i => scene.reduce((s, p) => s + p.refl[i] * p.area * L[i], 0)); return m.map(v => v / m[1]); }
// the colour temperature closest to an assumed light colour (matching blue ÷ red)
function nearestT(W) { let best = 5000, be = 1e9; for (let T = 1800; T <= 12000; T += 25) { const B = bbRGB(T), e = Math.abs(Math.log(B[2] / B[0]) - Math.log(W[2] / W[0])); if (e < be) { be = e; best = T; } } return best; }
// how far the grey card is from neutral: the largest difference between a channel and the card's average, in %
const castPct = rgb => { const m = (rgb[0] + rgb[1] + rgb[2]) / 3; return 100 * Math.max(...rgb.map(v => Math.abs(v / m - 1))); };
// colour cast of the grey card in 'mireds' (positive = too orange, negative = too blue): the difference between the light and the white balance
const castMired = (T, Twb) => mired(T) - mired(Twb);

// ---------------- studio light on a face ----------------
const lux = (I, d) => I / (d * d);                  // inverse square law: lamp intensity I (candela), distance d (m)
const stops = r => Math.log2(r);
// soft and hard shadows: the blurred edge (penumbra) of a shadow, by similar triangles
const penumbra = (size, dLight, dWall) => size * dWall / dLight;

// ---------------- The page ----------------
const P = { view: "wb", T: 5500, Twb: 5500, auto: false, add: [1, 1, 1], sub: [1, 1, 1], key: { d: 1.5, ang: 45, size: 0.15, I: 800 }, fill: { on: true, d: 3, I: 800 }, grass: 0 };
const ui = K.app({
  title: "Light and Colour", subject: "Photography",
  blurb: "Colour temperature and white balance, additive and subtractive mixing, the inverse square law and studio lighting",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "AQA GCSE Photography (8206): lighting (natural and artificial, direction, hard and soft, key and fill), colour and white balance; formal elements (colour, tone). GCSE Physics: colour, filters, black-body radiation (temperature and colour).",
      adv: "AQA A level Photography (7206) 3.8: lighting in the studio and on location, colour (balance, temperature, casts); film and digital processes. Physics context: inverse square law (I ∝ 1/d²), black-body radiation (Wien's law), additive and subtractive colour."
    }
  },
  missions: [
    { title: "Tungsten light, daylight setting", q: "The still life is lit by a tungsten bulb (2900 K) but the white balance is set to daylight (5500 K). What colour is the grey card? Now set the white balance to tungsten.", hint: "Tungsten light has much less blue than daylight, so with the daylight setting everything looks orange. Matching the white balance to the light divides out its colour and the grey card becomes grey again. Photographers often keep a little warmth on purpose, for mood.", setup() { set({ view: "wb", T: 2900, Twb: 5500 }); } },
    { title: "Cold shade", q: "Light from blue sky in the shade is about 8000 K. What happens with the daylight setting? Which setting fixes it?", hint: "Shade lit only by blue sky is bluer than direct sun, so skin looks cold and grey. Setting the white balance to 'shade' (about 7500–8000 K) warms it up. Mixed light (sun and shade, or a window and a bulb) cannot be corrected everywhere at once.", setup() { set({ view: "wb", T: 8000, Twb: 5500 }); } },
    { title: "Fooling auto white balance", q: "Switch on auto white balance in daylight. Then fill more and more of the frame with green leaves. What happens to the grey card?", hint: "Auto white balance assumes the whole scene averages to grey ('grey world'). A frame full of green leaves is not grey, so the camera thinks the light is green and adds magenta: the grey card turns pinkish. A grey card in the shot (or a custom white balance) avoids this.", setup() { set({ view: "wb", T: 5500, Twb: 5500, auto: true, grass: 0 }); } },
    { title: "Adding light", q: "Turn on the red, green and blue lights. What colours appear where two overlap? Where all three overlap? Dim the blue: what happens to the white?", hint: "Red + green = yellow, green + blue = cyan, blue + red = magenta; all three = white. This is additive mixing: every screen and camera sensor builds colours from red, green and blue. Dimming blue turns the white yellowish: exactly a warm colour cast.", setup() { set({ view: "mix" }); } },
    { title: "Subtracting light", q: "Look at the cyan, magenta and yellow filters on white light. What does each absorb? What colour is cyan + magenta, and all three?", hint: "Cyan absorbs red, magenta absorbs green, yellow absorbs blue. Cyan + magenta lets only blue through; all three absorb everything: black. Printers use cyan, magenta, yellow and black (CMYK) inks for this reason.", setup() { set({ view: "mix" }); } },
    { title: "Inverse square law", q: "Studio view, fill light off. Move the key light from 1 m to 2 m from the face. By how many stops does the light fall? Check with the light meter readings.", hint: "Twice the distance spreads the same light over four times the area, so E = I ÷ d² falls to a quarter: 2 stops. That is why a small move of a close light makes a big difference, and why a light far away gives an even light across a group.", setup() { set({ view: "studio", fill: { on: false }, key: { d: 1 } }); } },
    { title: "Lighting ratio", q: "Turn on the fill light from the camera side. Move it until the lit side is 4 times brighter than the shadow side (a 4:1 ratio, 2 stops). Where is the fill light?", hint: "The lit side gets key + fill, the shadow side only fill. A 4:1 ratio needs the fill to give a third of the key's light. With equal lamps that is √3 ≈ 1.7 times as far away as the key. Low ratios (2:1) look bright and open ('high key'); high ratios (8:1 or more) look dramatic.", setup() { set({ view: "studio", key: { d: 1.5 }, fill: { on: true, d: 4 } }); } },
    { title: "Hard and soft light", q: "Make the key light small (a bare bulb), then large (a 1 m softbox). How does the shadow on the wall change? Then move the softbox further away.", hint: "The edge of a shadow is blurred where part of the light source is hidden (the penumbra); width ≈ source size × (distance from object to wall) ÷ (distance from light to object). A big source close to the subject gives soft, flattering light; the same softbox far away looks smaller, so the light gets harder.", setup() { set({ view: "studio", key: { size: 0.03 } }); } }
  ],
  batch: [
    { title: "The inverse square law", question: "How does the light meter reading depend on the distance from a lamp?", how: "Lamp of 800 candela; the meter is held at each distance with a small random error in position (SD 2 cm) and a reading error of 2%. Theory: E = I ÷ d².", xLabel: "distance (m)", yLabel: "illuminance (lux)", xs: [0.5, 0.75, 1, 1.5, 2, 3, 4], reps: 6, yMin: 0, theory: d => lux(800, d), theoryLabel: "E = I ÷ d²", run: (d, r) => lux(800, d + 0.02 * r.gauss()) * (1 + 0.02 * r.gauss()), note: "Close to the lamp, a 2 cm error in position makes a big difference, so the scatter is largest there. A graph of E against 1/d² is a straight line through the origin with gradient I." },
    { title: "Fill distance and lighting ratio", question: "With the key light at 1.5 m, how does the lighting ratio depend on where the fill light is?", how: "Equal 800 cd lamps. Ratio = (key + fill) ÷ fill, from meter readings with 3% error. Theory: 1 + (d_fill ÷ d_key)².", xLabel: "fill light distance (m)", yLabel: "lighting ratio (lit ÷ shadow)", xs: [1.5, 2, 2.5, 3, 4, 5], reps: 6, yMin: 0, theory: d => 1 + Math.pow(d / 1.5, 2), theoryLabel: "1 + (d_fill ÷ d_key)²", run: (d, r) => { const k = lux(800, 1.5) * (1 + 0.03 * r.gauss()), f = lux(800, d) * (1 + 0.03 * r.gauss()); return (k + f) / f; }, note: "With the fill as close as the key, the ratio is 2:1 (1 stop). Moving the fill back makes the ratio rise with the square of its distance: 3 m gives 5:1." },
    { title: "Soft and hard shadows", question: "How wide is the blurred edge of the shadow on the wall, for different light sizes?", how: "Face 1 m from the light and 1 m from the wall; penumbra measured from the photo with a random error (SD 0.5 cm). Theory: width = size × 1 m ÷ 1 m.", xLabel: "light source size (cm)", yLabel: "penumbra width (cm)", xs: [2, 10, 20, 40, 60, 100], reps: 6, yMin: 0, fit: true, theory: s => penumbra(s, 1, 1), theoryLabel: "similar triangles", run: (s, r) => Math.max(0, penumbra(s, 1, 1) + 0.5 * r.gauss()), note: "A straight line through the origin: the penumbra is proportional to the size of the light as seen from the subject. A bare bulb gives a sharp edge; a metre-wide softbox, a very gradual one." },
    { title: "Auto white balance and a green scene", question: "How far is auto white balance fooled as more of the frame is filled with green leaves?", how: "Daylight (5500 K). Half of the rest of the frame is a grey backdrop, half a random mix of the other still-life colours. Auto white balance assumes the average is grey. Result: the grey card's colour cast (largest channel difference, %); about 3% is just noticeable.", xLabel: "share of the frame that is leaves (%)", yLabel: "cast on the grey card (%)", xs: [0, 10, 20, 30, 40, 60, 80], reps: 8, yMin: 0, run: (x, r) => { const rest = PATCHES.filter(p => p[0] !== "leaves"), w = rest.map(() => 0.2 + r()), tot = w.reduce((a, b) => a + b, 0), f = 1 - x / 100, sc = [{ refl: [0.22, 0.22, 0.21], area: f / 2 }, { refl: PATCHES[5][1], area: x / 100 }]; rest.forEach((p, i) => sc.push({ refl: p[1], area: f / 2 * w[i] / tot })); return castPct(record([0.18, 0.18, 0.18], 5500, autoWB(sc, 5500))); }, note: "With a varied scene the cast is small, though it wanders with the scene's colours. As green leaves take over, the camera decides the light is green and removes green from everything: the grey card turns magenta, and the cast grows to tens of percent. A grey card in the shot, or a custom white balance, fixes it." },
    { title: "Colour temperature and the blue–red balance", lvl: "adv", question: "How does the blue ÷ red ratio of the light depend on its colour temperature?", how: "A grey card photographed with a fixed daylight white balance, under black-body light at each temperature; reading error 2%. Theory: the black-body curve.", xLabel: "colour temperature (K)", yLabel: "blue ÷ red on the grey card", xs: [2000, 2700, 3200, 4000, 5500, 6500, 8000, 10000], reps: 5, yMin: 0, theory: T => { const c = record([0.18, 0.18, 0.18], T, 5500); return c[2] / c[0]; }, theoryLabel: "black body", run: (T, r) => { const c = record([0.18, 0.18, 0.18], T, 5500); return c[2] / c[0] * (1 + 0.02 * r.gauss()); }, note: "Hotter sources give out relatively more blue light (Wien's law: the peak wavelength ∝ 1/T), so the ratio climbs steeply from candlelight to blue sky. The steps that look equal to the eye are roughly equal steps in mireds, not kelvin." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Colour temperature", text: "Light sources have a colour temperature in kelvin: candle about 1900 K, tungsten 2700–3200 K (warm, orange), daylight about 5500 K, shade or overcast 6500–8000 K (cool, blue). Lower = warmer-looking." },
      { lvl: "std", tag: "White balance", text: "White balance tells the camera the colour of the light so it can make white and grey look neutral. A wrong setting gives a colour cast. Auto white balance assumes the scene averages to grey, so a frame dominated by one colour can fool it." },
      { lvl: "std", tag: "Mixing", text: "Additive (light): red, green and blue primaries; R + G = yellow, G + B = cyan, B + R = magenta, all = white. Subtractive (inks and filters): cyan, magenta, yellow; each absorbs one additive primary; all = black (CMYK printing)." },
      { lvl: "std", tag: "Lighting", text: "Key light (main light, sets the shadows), fill light (lightens the shadows), backlight or rim light (separates subject from background). Hard light (small source) gives crisp shadows; soft light (large source such as a softbox or cloudy sky) gives gradual shadows." },
      { lvl: "std", tag: "Inverse square law", text: "Doubling the distance from a small light quarters the illuminance (2 stops less). E = I ÷ d²." },
      { lvl: "adv", tag: "7206 3.8", text: "Lighting ratio = lit side ÷ shadow side (key + fill) ÷ fill. 2:1 is open and even; 4:1 is classic portrait; 8:1 and above is dramatic (low key, chiaroscuro). Each doubling is one stop." },
      { lvl: "adv", tag: "Physics", text: "Black-body radiation: hotter bodies emit more at short wavelengths (Wien: λmax = 2.9 × 10⁻³ m K ÷ T), so they look bluer. Colour shifts are perceived more evenly in mireds (10⁶ ÷ T): correction filters are rated in mireds." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Penumbra width ≈ source size × (object–shadow distance) ÷ (source–object distance), by similar triangles: a source's apparent size, not its real size, decides how soft the light is." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A photograph taken indoors under tungsten bulbs with the white balance set to daylight looks orange. Explain why, and how to fix it.", ans: "<ul><li>tungsten light has less blue and more red than daylight, but the camera assumes daylight</li><li>set the white balance to tungsten (about 3000 K), or use a custom white balance from a grey card</li></ul>" },
      { lvl: "std", marks: 2, q: "What colour is produced when red and blue light overlap on a white wall? What colour is produced when cyan and yellow filters overlap on white light?", ans: "<ul><li>red + blue light = magenta (additive)</li><li>cyan absorbs red, yellow absorbs blue, so only green passes (subtractive)</li></ul>" },
      { lvl: "std", marks: 3, q: () => `The key light is ${P.key.d.toFixed(1)} m from the face. The photographer moves it to ${(P.key.d * 2).toFixed(1)} m. Explain what happens to the exposure needed.`, ans: "<ul><li>twice the distance spreads the light over four times the area (inverse square law)</li><li>the illuminance falls to a quarter</li><li>so the exposure must increase by 2 stops (e.g. open the aperture two stops or use four times the shutter time)</li></ul>" },
      { lvl: "adv", marks: 4, q: "Equal lamps: the key is 1.2 m from the face, the fill 2.4 m on the camera side. Calculate the lighting ratio and express it in stops.", ans: "<ul><li>fill gives (1.2 ÷ 2.4)² = ¼ of the key's light</li><li>lit side = 1 + ¼ = 1.25, shadow side = ¼</li><li>ratio = 1.25 ÷ 0.25 = 5 : 1</li><li>log₂5 ≈ 2.3 stops</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why a softbox gives softer shadows close to the subject than far away.", ans: "<ul><li>shadow edges are soft where only part of the source is hidden (penumbra)</li><li>penumbra width ∝ source size ÷ distance to the subject (its apparent size)</li><li>far away, the softbox looks small from the subject, so the penumbra is narrow: harder light</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p><b>White balance.</b> Each light's colour is that of a black body at its colour temperature (a standard curve fit). Each surface reflects set fractions of red, green and blue. The camera records reflectance × light ÷ white-balance colour, channel by channel; auto white balance finds the temperature whose colour best matches the scene's average ('grey world').</p>
<p><b>Mixing.</b> Coloured lights are added channel by channel; filters multiply the light passing through (cyan passes green and blue, magenta red and blue, yellow red and green).</p>
<p><b>Studio.</b> Point lamps with an intensity in candela; illuminance E = I ÷ d² × cos(angle) on each part of a sphere (the head), plus the fill light from beside the camera. The shadow on the wall has a soft edge of width source size × wall distance ÷ light distance.</p>
<h3>Assumptions and simplifications</h3>
<ul><li>Real light sources are not perfect black bodies: fluorescent and LED lights have spiky spectra and often a green or magenta tint, which needs a second correction.</li>
<li>Three colour channels only: real colour depends on whole spectra (metamerism: two colours can match under one light and not another).</li>
<li>The head is a matte sphere (no shine, no nose); light bounced from walls is ignored.</li>
<li>The inverse square law holds for small sources at distances a few times their size; very close to a large softbox the light falls off more slowly.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}, groups = {};
let g = ui.group("What to show");
ctl.view = K.seg(g, { value: "wb", options: [["wb", "🌡️ White balance"], ["mix", "🎨 Mixing colour"], ["studio", "💡 Studio lighting"]], on: v => { P.view = v; showGroups(); } });
g = groups.wb = ui.group("Light and white balance");
const tfmt = v => v + " K";
ctl.T = K.slider(g, { label: "Colour temperature of the light", min: 1800, max: 12000, step: 100, value: P.T, fmt: tfmt, on: v => P.T = v });
let row = K.row(g); for (const [T, n] of [[1900, "Candle"], [2900, "Tungsten"], [5500, "Sun"], [6500, "Cloud"], [8000, "Shade"]]) K.btn(row, n, () => ctl.T.set(T, true));
ctl.Twb = K.slider(g, { label: "Camera white balance setting", min: 1800, max: 12000, step: 100, value: P.Twb, fmt: tfmt, on: v => { P.Twb = v; ctl.auto.set(false, true); } });
ctl.auto = K.toggle(g, { label: "Auto white balance (grey world)", value: false, on: v => P.auto = v });
ctl.grass = K.slider(g, { label: "Leaves filling the frame", min: 0, max: 0.9, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => P.grass = v });
g = groups.mix = ui.group("Mixing colour");
ctl.ar = K.slider(g, { label: "Red light", min: 0, max: 1, step: 0.05, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => P.add[0] = v });
ctl.ag = K.slider(g, { label: "Green light", min: 0, max: 1, step: 0.05, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => P.add[1] = v });
ctl.ab = K.slider(g, { label: "Blue light", min: 0, max: 1, step: 0.05, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => P.add[2] = v });
ctl.sc = K.slider(g, { label: "Cyan filter strength", min: 0, max: 1, step: 0.05, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => P.sub[0] = v });
ctl.sm = K.slider(g, { label: "Magenta filter strength", min: 0, max: 1, step: 0.05, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => P.sub[1] = v });
ctl.sy = K.slider(g, { label: "Yellow filter strength", min: 0, max: 1, step: 0.05, value: 1, fmt: v => Math.round(v * 100) + "%", on: v => P.sub[2] = v });
g = groups.studio = ui.group("Studio lighting");
ctl.kd = K.slider(g, { label: "Key light distance", min: 0.5, max: 4, step: 0.05, value: P.key.d, fmt: v => v.toFixed(2) + " m", on: v => P.key.d = v });
ctl.ka = K.slider(g, { label: "Key light angle from the camera", min: 0, max: 90, step: 5, value: P.key.ang, fmt: v => v + "°", tip: "45° is classic portrait lighting; 90° is side (split) lighting", on: v => P.key.ang = v });
ctl.ks = K.slider(g, { label: "Key light size", min: 0.02, max: 1.2, step: 0.01, value: P.key.size, fmt: v => v < 0.06 ? "bare bulb (" + Math.round(v * 100) + " cm)" : Math.round(v * 100) + " cm softbox", on: v => P.key.size = v });
ctl.fon = K.toggle(g, { label: "Fill light (beside the camera)", value: true, on: v => P.fill.on = v });
ctl.fd = K.slider(g, { label: "Fill light distance", min: 0.5, max: 6, step: 0.05, value: P.fill.d, fmt: v => v.toFixed(2) + " m", on: v => P.fill.d = v });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const labs = { wb: ["light", "white balance", "grey-card cast", "auto WB guess"], mix: ["light where all three lights overlap", "light through all three filters", "–", "–"], studio: ["lit side", "shadow side", "lighting ratio", "shadow edge (penumbra)"] };
function showGroups() { for (const k of ["wb", "mix", "studio"]) groups[k].style.display = P.view === k ? "" : "none"; [...read.el.children].forEach((d, i) => { d.firstChild.textContent = labs[P.view][i]; d.style.display = labs[P.view][i] === "–" ? "none" : ""; }); }
function set(o) {
  P.view = o.view || "wb"; P.T = o.T || 5500; P.Twb = o.Twb || 5500; P.auto = !!o.auto; P.grass = o.grass || 0; P.add = [1, 1, 1]; P.sub = [1, 1, 1];
  P.key = Object.assign({ d: 1.5, ang: 45, size: 0.15, I: 800 }, o.key || {}); P.fill = Object.assign({ on: true, d: 3, I: 800 }, o.fill || {});
  ctl.view.set(P.view); ctl.T.set(P.T); ctl.Twb.set(P.Twb); ctl.auto.set(P.auto); ctl.grass.set(P.grass); [ctl.ar, ctl.ag, ctl.ab].forEach(s => s.set(1)); [ctl.sc, ctl.sm, ctl.sy].forEach(s => s.set(1));
  ctl.kd.set(P.key.d); ctl.ka.set(P.key.ang); ctl.ks.set(P.key.size); ctl.fon.set(P.fill.on); ctl.fd.set(P.fill.d); showGroups();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "", yMin: 0 });
const chB = K.chart(ui.dock, { title: "", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif";
function sceneWB() { const n = PATCHES.length, f = 1 - P.grass, sc = PATCHES.map(p => ({ refl: p[1], area: f / 2 / n })); sc.push({ refl: [0.22, 0.22, 0.21], area: f / 2 }, { refl: PATCHES[5][1], area: P.grass }); return sc; }   // half the frame is the grey backdrop
function drawWB(c, w, h) {
  const Twb = P.auto ? autoWB(sceneWB(), P.T) : P.Twb, TwbK = Array.isArray(Twb) ? nearestT(Twb) : Twb, sx = 30, sy = 50, cw = Math.min((w - 340) / 4, 150), chh = cw * 0.75;
  c.font = "600 15px " + FONT; c.fillStyle = "#eef2f8"; c.textAlign = "left"; c.fillText(`Still life under ${P.T} K light · camera set to ${P.auto ? "auto (about " + TwbK + " K)" : TwbK + " K"}`, sx, 30);
  // a backdrop of leaves filling part of the frame
  const fw = cw * 4 + 30, fh = chh * 2 + 50; c.fillStyle = rgbCss(record([0.22, 0.22, 0.21], P.T, Twb)); c.fillRect(sx - 10, sy - 10, fw, fh);
  if (P.grass > 0) { c.fillStyle = rgbCss(record(PATCHES[5][1], P.T, Twb)); c.fillRect(sx - 10, sy - 10, fw * P.grass, fh); }
  PATCHES.forEach(([n, refl], i) => { const x = sx + (i % 4) * (cw + 6), y = sy + Math.floor(i / 4) * (chh + 22); c.fillStyle = rgbCss(record(refl, P.T, Twb)); c.fillRect(x, y, cw, chh); c.strokeStyle = "rgba(0,0,0,0.4)"; c.strokeRect(x, y, cw, chh); c.fillStyle = "#eef2f8"; c.font = "12px " + FONT; c.fillText(n, x, y + chh + 14); });
  // the light source's colour and the white balance colour, as swatches
  const bx = w - 290; c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("The light itself", bx, 60); c.fillStyle = rgbCss(bbRGB(P.T).map(v => v * 0.8)); c.beginPath(); c.arc(bx + 40, 110, 34, 0, 6.3); c.fill();
  c.fillStyle = "#eef2f8"; c.fillText("Camera assumes", bx + 130, 60); c.fillStyle = rgbCss((Array.isArray(Twb) ? Twb : bbRGB(Twb)).map(v => v * 0.8)); c.beginPath(); c.arc(bx + 170, 110, 34, 0, 6.3); c.fill();
  // a kelvin scale
  const ky = 190, kx0 = bx, kx1 = w - 30, KX = T => kx0 + (mired(1800) - mired(T)) / (mired(1800) - mired(12000)) * (kx1 - kx0);
  for (let i = 0; i <= 100; i++) { const T = 1e6 / (mired(1800) - (mired(1800) - mired(12000)) * i / 100); c.fillStyle = rgbCss(bbRGB(T).map(v => v * 0.8)); c.fillRect(kx0 + (kx1 - kx0) * i / 100, ky, (kx1 - kx0) / 100 + 1, 18); }
  c.fillStyle = "#aab6cc"; c.font = "11px " + FONT; c.textAlign = "center"; for (const [T, n] of [[1900, "candle"], [2900, "tungsten"], [5500, "sun"], [8000, "shade"]]) c.fillText(n, KX(T), ky + 32);
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(KX(P.T), ky - 2); c.lineTo(KX(P.T) - 6, ky - 12); c.lineTo(KX(P.T) + 6, ky - 12); c.fill();
  c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(KX(TwbK), ky + 20); c.lineTo(KX(TwbK) - 6, ky + 30); c.lineTo(KX(TwbK) + 6, ky + 30); c.fill();
  c.textAlign = "left"; c.fillStyle = "#aab6cc"; c.fillText("▼ light   ▲ white balance (scale in equal steps of mireds)", kx0, ky + 50);
  return Twb;
}
function drawMix(c, w, h) {
  const R = Math.min(h / 4.2, w / 9), cx1 = w * 0.27, cx2 = w * 0.72, cy = h * 0.52;
  c.fillStyle = "#000"; c.fillRect(20, 40, w / 2 - 30, h - 60); c.fillStyle = "#fff"; c.fillRect(w / 2 + 10, 40, w / 2 - 30, h - 60);
  c.font = "600 14px " + FONT; c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.fillText("Additive: coloured lights on a dark wall", 24, 30); c.fillText("Subtractive: filters (or inks) on white light", w / 2 + 14, 30);
  const off = [[0, -0.55], [-0.5, 0.35], [0.5, 0.35]];
  c.globalCompositeOperation = "lighter"; [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((col, i) => { const k = P.add[i]; c.fillStyle = `rgb(${Math.round(255 * col[0] * k)},${Math.round(255 * col[1] * k)},${Math.round(255 * col[2] * k)})`; c.beginPath(); c.arc(cx1 + off[i][0] * R, cy + off[i][1] * R, R, 0, 6.3); c.fill(); });
  c.globalCompositeOperation = "multiply"; [[0, 1, 1], [1, 0, 1], [1, 1, 0]].forEach((col, i) => { const k = P.sub[i]; c.fillStyle = `rgb(${Math.round(255 * (1 - k * (1 - col[0])))},${Math.round(255 * (1 - k * (1 - col[1])))},${Math.round(255 * (1 - k * (1 - col[2])))})`; c.beginPath(); c.arc(cx2 + off[i][0] * R, cy + off[i][1] * R, R, 0, 6.3); c.fill(); });
  c.globalCompositeOperation = "source-over"; c.font = "12px " + FONT; c.textAlign = "center";
  [["red", 0], ["green", 1], ["blue", 2]].forEach(([n, i]) => { c.fillStyle = "#aab6cc"; c.fillText(n, cx1 + off[i][0] * R * 1.9, cy + off[i][1] * R * 1.9 + 4); });
  [["cyan", 0], ["magenta", 1], ["yellow", 2]].forEach(([n, i]) => { c.fillStyle = "#333"; c.fillText(n, cx2 + off[i][0] * R * 1.9, cy + off[i][1] * R * 1.9 + 4); });
}
function drawStudio(c, w, h) {
  const k = P.key, f = P.fill, ang = k.ang * Math.PI / 180, Ek = lux(k.I, k.d), Ef = f.on ? lux(f.I, f.d) : 0;
  // the head: a matte sphere seen from the camera. Light from the key (direction ang to the camera's right) and the fill (from the camera)
  const R = Math.min(h * 0.3, w * 0.16), cx = w * 0.42, cy = h * 0.5, kd = [Math.sin(ang), 0.15, Math.cos(ang)], maxE = lux(k.I, 0.5) + lux(f.I, 0.5);
  // the shadow on the wall behind, with a soft edge (penumbra) from the light's size
  const pen = penumbra(k.size, k.d, 1) * R * 1.4, shx = cx - Math.tan(ang) * R * 0.6 - R * 0.3;
  const grd = c.createRadialGradient(shx, cy, Math.max(1, R * 1.05 - pen / 2), shx, cy, R * 1.05 + pen / 2 + 1); const wallE = Math.min(1, (Ek * Math.cos(ang) * 0.5 + Ef * 0.7) / maxE * 2.2), sh = Math.min(1, Ef * 0.7 / maxE * 2.2);
  c.fillStyle = `rgb(${toSRGB(0.6 * wallE)},${toSRGB(0.6 * wallE)},${toSRGB(0.58 * wallE)})`; c.fillRect(20, 20, w - 340, h - 40);
  grd.addColorStop(0, `rgb(${toSRGB(0.6 * sh)},${toSRGB(0.6 * sh)},${toSRGB(0.58 * sh)})`); grd.addColorStop(1, `rgba(${toSRGB(0.6 * wallE)},${toSRGB(0.6 * wallE)},${toSRGB(0.58 * wallE)},0)`);
  c.fillStyle = grd; c.beginPath(); c.arc(shx, cy, R * 1.05 + pen / 2 + 1, 0, 6.3); c.fill();
  const N = Math.ceil(R * 2), id = c.createImageData(N, N), d = id.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = (i - N / 2) / R, y = (N / 2 - j) / R, r2 = x * x + y * y; const o = (j * N + i) * 4; if (r2 > 1) { d[o + 3] = 0; continue; } const z = Math.sqrt(1 - r2);
    const E = Ek * Math.max(0, x * kd[0] + y * kd[1] + z * kd[2]) + Ef * Math.max(0, z); const v = clamp(E / maxE * 2.2, 0, 1); d[o] = toSRGB(0.62 * v); d[o + 1] = toSRGB(0.42 * v); d[o + 2] = toSRGB(0.32 * v); d[o + 3] = 255; }
  const tmp = document.createElement("canvas"); tmp.width = N; tmp.height = N; tmp.getContext("2d").putImageData(id, 0, 0); c.drawImage(tmp, cx - N / 2, cy - N / 2);
  // plan view of the set
  const px = w - 300, py = 30, pw = 270, ph = 240, s = 50, cam = [px + pw / 2, py + ph - 20], head = [px + pw / 2, py + ph - 20 - 2.5 * s * 0.9];
  c.fillStyle = "#111a2e"; c.fillRect(px, py, pw, ph); c.strokeStyle = "#3a4560"; c.strokeRect(px, py, pw, ph); c.fillStyle = "#eef2f8"; c.font = "600 12px " + FONT; c.textAlign = "left"; c.fillText("The set, from above", px + 8, py + 16);
  c.fillStyle = "#e7b894"; c.beginPath(); c.arc(head[0], head[1], 8, 0, 6.3); c.fill(); c.fillStyle = "#5ab0ff"; c.fillRect(cam[0] - 6, cam[1] - 4, 12, 8); c.fillStyle = "#aab6cc"; c.font = "11px " + FONT; c.fillText("camera", cam[0] + 10, cam[1] + 4);
  const kp = [head[0] + Math.sin(ang) * k.d * s * 0.9, head[1] + Math.cos(ang) * k.d * s * 0.9]; c.strokeStyle = "#ffd166"; c.lineWidth = Math.max(2, k.size * 30); c.beginPath(); c.moveTo(kp[0] - Math.cos(ang) * k.size * 20, kp[1] + Math.sin(ang) * k.size * 20); c.lineTo(kp[0] + Math.cos(ang) * k.size * 20, kp[1] - Math.sin(ang) * k.size * 20); c.stroke(); c.lineWidth = 1;
  c.fillStyle = "#ffd166"; c.fillText("key", kp[0] + 8, kp[1]);
  if (f.on) { const fp = [head[0] - 18, head[1] + f.d * s * 0.9]; c.fillStyle = "#c58cff"; c.beginPath(); c.arc(fp[0], Math.min(fp[1], py + ph - 6), 6, 0, 6.3); c.fill(); c.fillText(fp[1] > py + ph ? "fill (further)" : "fill", fp[0] - 40, Math.min(fp[1], py + ph - 6)); }
  c.fillStyle = "#eef2f8"; c.font = "13px " + FONT; c.fillText(`key: ${Ek.toFixed(0)} lux at the face`, px, py + ph + 24); c.fillText(f.on ? `fill: ${Ef.toFixed(0)} lux` : "fill: off", px, py + ph + 44);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(() => { }, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  let Twb = P.Twb; if (P.view === "wb") Twb = drawWB(c, w, h); else if (P.view === "mix") drawMix(c, w, h); else drawStudio(c, w, h);
  if (frame++ % 6) return;
  if (P.view === "wb") {
    const g = record([0.18, 0.18, 0.18], P.T, Twb), TwbK = Array.isArray(Twb) ? nearestT(Twb) : Twb, cast = P.auto ? 0 : castMired(P.T, Twb);
    chA.opts.title = "Grey card as recorded (red, green, blue)"; chA.opts.xLabel = "";
    chA.draw([{ pts: [[0, g[0]], [1, g[1]], [2, g[2]]], type: "bars", w: 0.6, color: "#aab6cc" }], { xMin: -0.5, xMax: 2.5, yMin: 0, yMax: 0.6, hlines: [{ y: 0.18, color: "#7fe3a0", label: "neutral 0.18" }], xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? ["red", "green", "blue"][Math.round(v)] || "" : "" });
    chB.opts.title = "Colour of black-body light: blue ÷ red"; chB.opts.xLabel = "colour temperature (K)";
    const pts = []; for (let T = 1800; T <= 12000; T += 200) { const L = bbRGB(T); pts.push([T, L[2] / L[0]]); }
    chB.draw([{ pts, color: "#5ab0ff", label: "blue ÷ red" }, { pts: [[P.T, bbRGB(P.T)[2] / bbRGB(P.T)[0]]], type: "dots", color: "#ffd166", r: 6, label: "the light now" }], { xMin: 1800, xMax: 12000, yMin: 0 });
    read.set("a", P.T + " K (" + Math.round(mired(P.T)) + " mired)"); read.set("b", P.auto ? "auto" : TwbK + " K"); read.set("c", P.auto ? (castPct(g) < 3 ? "neutral" : (g[1] < g[0] && g[1] < g[2] ? "magenta " : g[2] > g[0] ? "bluish " : "warm ") + castPct(g).toFixed(0) + "%") : Math.abs(cast) < 10 ? "neutral" : (cast > 0 ? "too orange by " : "too blue by ") + Math.abs(cast).toFixed(0) + " mired"); read.set("d", P.auto ? "about " + TwbK + " K" : "(auto off)");
  } else if (P.view === "mix") {
    chA.opts.title = "Additive: light reaching the wall (red, green, blue)"; chA.opts.xLabel = ""; chB.opts.title = "Subtractive: light through all three filters"; chB.opts.xLabel = "";
    const through = [1 - P.sub[0], 1 - P.sub[1], 1 - P.sub[2]];
    chA.draw([{ pts: P.add.map((v, i) => [i, v]), type: "bars", w: 0.6, color: "#aab6cc" }], { xMin: -0.5, xMax: 2.5, yMin: 0, yMax: 1.05, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? ["red", "green", "blue"][Math.round(v)] || "" : "" });
    chB.draw([{ pts: through.map((v, i) => [i, v]), type: "bars", w: 0.6, color: "#aab6cc" }], { xMin: -0.5, xMax: 2.5, yMin: 0, yMax: 1.05, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? ["red", "green", "blue"][Math.round(v)] || "" : "" });
    read.set("a", P.add.map(v => Math.round(v * 100) + "%").join(" · ")); read.set("b", through.map(v => Math.round(v * 100) + "%").join(" · "));
  } else {
    const k = P.key, f = P.fill, Ek = lux(k.I, k.d), Ef = f.on ? lux(f.I, f.d) : 0, lit = Ek + Ef, shd = Math.max(Ef, 0.5);
    chA.opts.title = "Inverse square law: illuminance from the key"; chA.opts.xLabel = "distance (m)";
    const pts = []; for (let d = 0.5; d <= 4; d += 0.05) pts.push([d, lux(k.I, d)]);
    chA.draw([{ pts, color: "#ffd166", label: "E = I ÷ d²" }, { pts: [[k.d, Ek]], type: "dots", color: "#ff5d6c", r: 6 }], { xMin: 0, xMax: 4, yMin: 0 });
    chB.opts.title = "Lighting ratio against fill distance"; chB.opts.xLabel = "fill distance (m)";
    const rp = []; for (let d = 0.5; d <= 6; d += 0.1) rp.push([d, 1 + lux(k.I, k.d) / lux(f.I, d)]);
    chB.draw([{ pts: rp, color: "#c58cff", label: "ratio" }].concat(f.on ? [{ pts: [[f.d, lit / Ef]], type: "dots", color: "#ff5d6c", r: 6 }] : []), { xMin: 0, xMax: 6, yMin: 0, yMax: 20 });
    read.set("a", lit.toFixed(0) + " lux"); read.set("b", Ef.toFixed(0) + " lux"); read.set("c", f.on ? `${(lit / Ef).toFixed(1)} : 1 (${stops(lit / Ef).toFixed(1)} stops)` : "no fill: black shadows"); read.set("d", (penumbra(k.size, k.d, 1) * 100).toFixed(1) + " cm");
  }
});
set({});
ui.tip("Change the light and the white balance. The grey card should look grey.", 7000);
