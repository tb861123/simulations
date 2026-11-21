/* =====================================================================
   LENSES, FOCAL LENGTH AND PERSPECTIVE
   A camera lens forms an image on the sensor. Its FOCAL LENGTH f sets how
   big things appear: an object of height h at distance d makes an image
   of height  h × f ÷ d  (for d much bigger than f).
     FIELD OF VIEW  = 2 × arctan(sensor width ÷ 2f): a short focal length
                      sees wide (wide-angle), a long one sees narrow (telephoto).
     CROP FACTOR    a smaller sensor sees a smaller part of the same image:
                      a 50 mm lens on a sensor 1.5 × smaller frames like 75 mm.
     PERSPECTIVE    depends only on WHERE the camera stands. Moving back and
                      zooming in to keep the subject the same size makes the
                      background look bigger and closer ('telephoto
                      compression'); moving in with a wide angle makes it
                      look small and far away.
     FOCUSING       the thin-lens equation 1/f = 1/u + 1/v: closer subjects
                      need the lens further from the sensor (v − f = f² ÷ (u − f)),
                      and magnification m = v ÷ u = f ÷ (u − f). Macro is m ≈ 1.
   Ray diagrams and the lens equation itself are in the physics simulation
   'Light: Refraction, Lenses and Fibres'.
   ===================================================================== */
const clamp = K.clamp, DEG = Math.PI / 180;
const SENSORS = { ff: { n: "Full frame (36 × 24 mm)", w: 36, h: 24, crop: 1 }, apsc: { n: "APS-C (23.6 × 15.7)", w: 23.6, h: 15.7, crop: 1.53 }, m43: { n: "Micro Four Thirds (17.3 × 13)", w: 17.3, h: 13, crop: 2.08 }, phone: { n: "Phone (7.5 × 5.6)", w: 7.5, h: 5.6, crop: 4.8 } };
const FOCALS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 35, 40, 50, 60, 70, 85, 100, 135, 150, 200, 300, 400, 600];
const fov = (sensorW, f) => 2 * Math.atan(sensorW / (2 * f)) / DEG;             // field of view (degrees) across the width
const imageHeight = (h, d, f) => h * f / (d * 1000 - f) * 1000;                  // mm on the sensor, from the thin-lens equation (m = f/(u − f))
const extension = (u, f) => f * f / (u * 1000 - f);                              // how far the lens moves out from its infinity position (mm)
const magnification = (u, f) => f / (u * 1000 - f);
// where to stand so that a subject of height hs fills a share 'fill' of the frame height
const distForFill = (hs, f, sensorH, fill) => (hs * f / (fill * sensorH) + f / 1000);
// depth of field (m) at subject distance s (m), f-number N, blur limit c = 0.03 mm × (sensor diagonal ÷ 43.3)
function dof(s, f, N, c) { const Hf = f * f / (N * c) / 1000; const near = Hf * s / (Hf + s), far = s < Hf ? Hf * s / (Hf - s) : Infinity; return far - near; }

// ---------------- The scene (metres): a person, a church tower and trees behind, mountains far away ----------------
const SUBJ_H = 1.8, CAM_H = 0.9;   // the camera is held level at chest height, so the person is centred in the frame
// a projection: a point at sideways x, height y, distance z (m) lands on the sensor at f·x/z, f·(y − camera height)/z (mm)
function proj(x, y, z, f) { return [f * x / z, f * (y - CAM_H) / z]; }

// ---------------- The page ----------------
const P = { fi: 11, sensor: "ff", mode: "zoom", dist: 4, D: 40, fill: 0.75, N: 2.8, aim: 0 };
let t = 0;
const F = () => FOCALS[P.fi];
const ui = K.app({
  title: "Lenses and Perspective", subject: "Photography",
  blurb: "Focal length, field of view, crop factor, 'telephoto compression', focusing and macro",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "AQA GCSE Photography (8206): lenses (wide-angle, standard, telephoto, zoom, macro), viewpoint and framing; field of view; how focal length and viewpoint change the picture. GCSE Physics: real images from a converging lens, magnification.",
      adv: "AQA A level Photography (7206) 3.8: viewpoint, composition, depth of field; 'appreciation of the use of lenses'. A level Physics context: the thin-lens equation 1/f = 1/u + 1/v, magnification v/u, angular field of view."
    }
  },
  missions: [
    { title: "Wide, standard, telephoto", q: "Stand still 4 m from the person and zoom from 14 mm to 300 mm. How does the field of view change? Which focal length gives a view like your eye's?", hint: "The field of view shrinks as the focal length grows (FOV = 2 arctan(36 ÷ 2f) on full frame): 104° at 14 mm, 40° at 50 mm, 7° at 300 mm. About 40–50 mm on full frame is called 'standard' because it looks natural, roughly like the central view of your eye.", setup() { set({ mode: "zoom", fi: 3 }); } },
    { title: "Telephoto compression is really distance", q: "Choose 'Keep the person the same size'. Change the focal length from 24 mm to 200 mm. The person stays the same: what happens to the church tower behind? Then look at the plan view: what actually changed?", hint: "To keep the person the same size you walk back as you zoom in. Because you are now much further away, the person and the tower are at more similar distances from you, so the tower looks much bigger relative to the person: 'compression'. The lens did not do it: standing in the same place with a wide lens and cropping would give the same perspective. Perspective depends only on where the camera is.", setup() { set({ mode: "fill", fi: 7 }); } },
    { title: "Wide-angle drama", q: "Keep the person the same size with a 14 mm lens. Where must you stand? How does the background look, and why do close-up portraits with wide lenses look odd?", hint: "You must stand very close (about 1 m), so the background is many times further away than the person and looks tiny and distant. Close up, the nose is much nearer than the ears, so it looks enlarged: the 'wide-angle distortion' of faces is really a perspective effect of standing close.", setup() { set({ mode: "fill", fi: 3 }); } },
    { title: "Crop factor", q: "Keep a 50 mm lens and switch from full frame to APS-C and Micro Four Thirds. What happens to the field of view? Which full-frame lens would give the same view?", hint: "A smaller sensor records only the middle of the image: the field of view narrows as if the focal length were longer by the crop factor. 50 mm on APS-C frames like 75–77 mm on full frame; on Micro Four Thirds like 100 mm. The perspective is the same, because you have not moved.", setup() { set({ mode: "zoom", fi: 11 }); } },
    { title: "Why phones have tiny lenses", q: "Choose the phone sensor and find the focal length that gives the same view as 24–28 mm on full frame. Then compare the depth of field.", hint: "A phone's main camera is about 5–6 mm focal length: with a crop factor of about 4.8 that frames like 26 mm. Its depth of field is enormous (everything sharp) because the real focal length is so short, which is why phones fake background blur in software ('portrait mode').", setup() { set({ mode: "zoom", sensor: "phone", fi: 0 }); } },
    { title: "Focusing and macro", lvl: "adv", q: "Use the thin-lens readings. Bring the person closer (0.3 m) with a 100 mm lens. How far must the lens move out to focus? At what distance is the magnification 1 (macro, life size)?", hint: "From 1/f = 1/u + 1/v, the lens must move out by f² ÷ (u − f): only 0.25 mm for a subject at 40 m, but 50 mm at 0.3 m. Magnification m = f ÷ (u − f) reaches 1 when u = 2f (20 cm for a 100 mm lens). Macro lenses can move their glass that far; extension tubes do the same job.", setup() { set({ mode: "zoom", fi: 15, dist: 0.3 }); } },
    { title: "Depth of field at the same framing", lvl: "adv", q: "Keep the person the same size and f/2.8. Read the depth of field at 24 mm and at 200 mm. Is a longer lens really 'shallower'?", hint: "Surprisingly, the depth of field across the person is almost the same: when the framing (magnification) and aperture are the same, DoF ≈ 2Nc(1 + m) ÷ m², which does not depend on focal length. What changes is the background: the telephoto magnifies it, so its blur looks much bigger, which is why telephotos seem to blur backgrounds more.", setup() { set({ mode: "fill", fi: 7, N: 2.8 }); } }
  ],
  batch: [
    { title: "Field of view: how much wall fits?", question: "How wide a strip of a distant wall fits across the frame, at each focal length?", how: "Full frame. The wall is about 20 m away, but each run the photographer paces it out with a random error (SD 0.4 m). Theory: width = distance × sensor width ÷ f = 20 × 36 ÷ f.", xLabel: "focal length (mm)", yLabel: "width of wall in frame (m)", xs: [14, 24, 35, 50, 85, 135, 200], reps: 8, yMin: 0, theory: f => 20 * 36 / f, theoryLabel: "d × 36 ÷ f", run: (f, r) => { const d = 20 + 0.4 * r.gauss(); return 2 * d * Math.tan(fov(36, f) / 2 * DEG); }, note: "Width ∝ 1/f: doubling the focal length halves the width (and quarters the area) in the frame. A plot of width against 1/f would be a straight line." },
    { title: "Telephoto 'compression'", question: "With the person framed the same each time, how big does a 25 m tower 40 m behind them look, relative to the person?", how: "The photographer stands where the person fills 75% of the frame height (pacing error SD 3%). Result: the tower's image height ÷ the person's. Theory: (25 ÷ 1.8) × s ÷ (s + 40), s = where you stand.", xLabel: "focal length (mm)", yLabel: "tower ÷ person (image heights)", xs: [14, 24, 35, 50, 85, 135, 200, 300], reps: 6, yMin: 0, theory: f => { const s = distForFill(SUBJ_H, f, 24, 0.75); return 25 / SUBJ_H * s / (s + 40); }, theoryLabel: "from distances only", run: (f, r) => { const s = distForFill(SUBJ_H, f, 24, 0.75) * (1 + 0.03 * r.gauss()); return imageHeight(25, s + 40, f) / imageHeight(SUBJ_H, s, f); }, note: "At 14 mm you stand about 1.4 m away, so the tower (41 m from you) looks less than half the person's height. At 300 mm you stand about 30 m away and the tower looks six times taller than the person. Only the distances matter: the focal length just decides where you have to stand." },
    { title: "Longer lens, more shake", question: "At 1/60 s hand-held, what share of shots are sharp at each focal length?", how: "Hand shake: random angular speed (each direction SD 0.02 rad/s). Blur on the sensor = angle turned × focal length; sharp if under 0.03 mm. 300 shots per run. Theory: 1 − e^(−c²/2σ²).", xLabel: "focal length (mm)", yLabel: "sharp shots (%)", xs: [14, 24, 35, 50, 85, 135, 200, 300], reps: 4, yMin: 0, yMax: 102, theory: f => { const sg = 0.02 / 60 * f; return 100 * (1 - Math.exp(-0.0009 / (2 * sg * sg))); }, theoryLabel: "Rayleigh theory", run: (f, r) => { let k = 0; for (let i = 0; i < 300; i++) { const b = Math.hypot(0.02 * r.gauss(), 0.02 * r.gauss()) / 60 * f; if (b < 0.03) k++; } return 100 * k / 300; }, note: "The same shake is magnified by the focal length, so long lenses need faster shutter speeds (the '1/focal length' rule) or stabilisation. At 1/60 s, a 50 mm lens gives mostly sharp shots, a 300 mm lens almost none." },
    { title: "Depth of field at the same framing", lvl: "adv", question: "With the person filling 75% of the frame at f/2.8, does the depth of field depend on the focal length?", how: "Full frame, c = 0.03 mm. The photographer paces the distance with a small random error (SD 3%). Theory: DoF ≈ 2Nc(1 + m) ÷ m² (independent of f for the same magnification m).", xLabel: "focal length (mm)", yLabel: "depth of field (cm)", xs: [24, 35, 50, 85, 135, 200], reps: 6, yMin: 0, theory: f => { const m = 0.75 * 24 / (SUBJ_H * 1000); return 100 * 2 * 2.8 * 0.03 * (1 + m) / (m * m) / 1000; }, theoryLabel: "2Nc(1 + m) ÷ m²", run: (f, r) => { const s = distForFill(SUBJ_H, f, 24, 0.75) * (1 + 0.03 * r.gauss()); return 100 * dof(s, f, 2.8, 0.03); }, note: "The depth of field is almost the same (about 1.7–2 m here) at every focal length; only the wide lens at close range gains a little, because it is nearer its hyperfocal distance. A telephoto background looks more blurred because it is magnified, not because the zone of sharpness is thinner." },
    { title: "Extension tubes and magnification", lvl: "adv", question: "How does magnification depend on the extra extension between a 50 mm lens and the sensor?", how: "A lens set to infinity, plus an extension tube. Magnification measured from a ruler in the photograph, with a reading error (SD 0.02). Theory: m = extension ÷ f.", xLabel: "extension (mm)", yLabel: "magnification", xs: [0, 10, 20, 30, 40, 50, 60], reps: 5, fit: true, theory: e => e / 50, theoryLabel: "m = e ÷ f", run: (e, r) => e / 50 + 0.02 * r.gauss(), note: "A straight line through the origin with gradient 1/f: 50 mm of extension on a 50 mm lens gives life size (m = 1). This is the thin-lens equation rearranged: v = f + e, and m = v/u = e/f." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Lenses", text: "Wide-angle lenses (short focal length, e.g. 14–35 mm on full frame) see a wide view; standard (about 50 mm) looks natural; telephoto (85 mm and longer) sees a narrow view and makes distant things bigger. A zoom lens has a variable focal length." },
      { lvl: "std", tag: "Perspective", text: "Perspective (how big near things look compared with far things) depends on where you stand, not on the lens. Telephoto 'compression' comes from standing far away; wide-angle 'distortion' of close faces comes from standing close." },
      { lvl: "std", tag: "Sensors", text: "A smaller sensor crops the image: multiply the focal length by the crop factor (1.5 for APS-C, 2 for Micro Four Thirds) to find the full-frame lens with the same view." },
      { lvl: "std", tag: "GCSE Physics", text: "A converging lens forms a real, inverted image of a distant object near its focal point. Magnification = image height ÷ object height." },
      { lvl: "adv", tag: "7206 3.8", text: "Choosing viewpoint and focal length: a long lens from far away flattens space (stacked hills, crowds); a wide lens close up exaggerates depth (leading lines, dramatic foregrounds). Both are compositional choices." },
      { lvl: "adv", tag: "Physics", text: "Thin lens: 1/f = 1/u + 1/v; m = v/u = f/(u − f). To focus closer the lens moves away from the sensor by f²/(u − f). Life-size macro (m = 1) needs u = v = 2f." },
      { lvl: "beyond", tag: "Beyond the spec", text: "At equal magnification and f-number, depth of field ≈ 2Nc(1 + m)/m², independent of focal length; field of view = 2 arctan(w/2f)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A 50 mm lens is used on an APS-C camera (crop factor 1.5). What focal length on a full-frame camera gives the same field of view?", ans: "<ul><li>50 × 1.5</li><li>= 75 mm</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why a photographer at the far end of a football pitch uses a long telephoto lens.", ans: "<ul><li>the players are far away, so with a short lens they would be tiny in the frame</li><li>a long focal length makes the image larger (image size ∝ f)</li><li>the narrow field of view fills the frame with the action</li></ul>" },
      { lvl: "std", marks: 3, q: () => `The camera is set to ${F()} mm on a ${SENSORS[P.sensor].n} sensor. Calculate the field of view across the frame, using FOV = 2 × arctan(sensor width ÷ 2f).`, ans: () => { const s = SENSORS[P.sensor]; return `<ul><li>sensor width ${s.w} mm; 2f = ${2 * F()} mm</li><li>arctan(${s.w} ÷ ${2 * F()}) = ${(fov(s.w, F()) / 2).toFixed(1)}°</li><li>FOV = ${fov(s.w, F()).toFixed(1)}°</li></ul>`; } },
      { lvl: "adv", marks: 4, q: "A 100 mm lens focuses on a flower 0.25 m away. Find the image distance and the magnification.", ans: "<ul><li>1/v = 1/f − 1/u = 1/100 − 1/250 = 0.006 mm⁻¹</li><li>v ≈ 167 mm (the lens is 67 mm further out than at infinity)</li><li>m = v/u = 167/250</li><li>≈ 0.67</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain, with reference to viewpoint, why a portrait taken with a 200 mm lens from far away looks different from one taken with a 24 mm lens from close up, even if the face is the same size.", ans: "<ul><li>with the 24 mm lens the camera is close: the nose is relatively much nearer than the ears, so it looks enlarged</li><li>the background is many times further than the face, so it looks small</li><li>with 200 mm the camera is far: face features at similar distances, natural or flattened proportions</li><li>the background is only a little further than the face, so it looks large ('compression'); perspective depends on camera position</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>A pinhole-style projection: a point at sideways position x, height y and distance z lands on the sensor at f·x/z, f·(y − 0.9 m)/z, with the camera held level at chest height (0.9 m). The scene: a person 1.8 m tall, a church tower 25 m tall and trees a chosen distance behind, and mountains 5 km away. In 'keep the same size' mode the camera is placed where the person fills 75% of the frame height (distance = 1.8 m × f ÷ (0.75 × sensor height)).</p>
<p>Readings use the thin-lens equation: lens extension f²/(u − f), magnification f/(u − f), and depth of field from the hyperfocal distance f²/(Nc), with the blur limit c scaled to the sensor (0.03 mm on full frame).</p>
<h3>Assumptions and simplifications</h3>
<ul><li>A perfect thin lens: no distortion (barrel or pincushion), vignetting or aberrations. Real wide-angle lenses bend straight lines near the edges unless corrected.</li>
<li>The camera is always level; tilting it upwards would make vertical lines converge.</li>
<li>Focal lengths are the real ones printed on the lens; phone makers quote the 'equivalent' (×4.8 here).</li>
<li>Depth of field uses the standard formula with one acceptable blur size; how sharp a print looks also depends on its size and viewing distance.</li></ul>
<p>For ray diagrams and the lens equation, see the physics simulation <a href="../../physics/optics_refraction/optics-refraction.html">Light: Refraction, Lenses and Fibres</a>. Exposure and depth of field in a photograph are in <a href="../exposure_triangle/exposure-triangle.html">The Exposure Triangle</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Lens and camera");
ctl.f = K.slider(g, { label: "Focal length", min: 0, max: FOCALS.length - 1, step: 1, value: P.fi, fmt: i => FOCALS[i] + " mm", on: v => { P.fi = v; } });
ctl.sensor = K.seg(g, { label: "Sensor", value: "ff", options: Object.keys(SENSORS).map(k => [k, SENSORS[k].n.split(" (")[0]]), on: v => P.sensor = v });
ctl.mode = K.seg(g, { label: "When you change focal length…", value: "zoom", options: [["zoom", "Stand still (zoom)"], ["fill", "Keep the person the same size (walk)"]], on: v => P.mode = v });
ctl.dist = K.slider(g, { label: "Distance to the person (when standing still)", min: 0.2, max: 60, step: 0.1, value: P.dist, fmt: v => v.toFixed(1) + " m", on: v => P.dist = v });
g = ui.group("Scene");
ctl.D = K.slider(g, { label: "Church tower behind the person", min: 5, max: 300, step: 5, value: P.D, fmt: v => v + " m", on: v => P.D = v });
ctl.N = K.slider(g, { label: "Aperture (for depth of field)", min: 1.4, max: 22, step: 0.1, value: P.N, fmt: v => "f/" + v.toFixed(1), on: v => P.N = v });
const read = K.readout(ui.group("Readings"), [["fov", "field of view (across)"], ["eq", "full-frame equivalent"], ["s", "camera to person"], ["ratio", "tower ÷ person (image)"], ["ext", "lens extension to focus"], ["m", "magnification"], ["dof", "depth of field"], ["hf", "hyperfocal distance"]]);
function subjDist() { const S = SENSORS[P.sensor]; return P.mode === "fill" ? distForFill(SUBJ_H, F(), S.h, P.fill) : P.dist; }
function set(o) { Object.assign(P, { fi: 11, sensor: "ff", mode: "zoom", dist: 4, D: 40, N: 2.8 }, o); ctl.f.set(P.fi); ctl.sensor.set(P.sensor); ctl.mode.set(P.mode); ctl.dist.set(P.dist); ctl.D.set(P.D); ctl.N.set(P.N); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Field of view against focal length", xLabel: "focal length (mm)", yLabel: "degrees", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Tower ÷ person, keeping the person the same size", xLabel: "focal length (mm)", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif";
function drawView(c, x0, y0, fw, fh) {
  const S = SENSORS[P.sensor], f = F(), s = subjDist(), sc = fw / S.w;                    // pixels per mm on the sensor
  const X = mm => x0 + fw / 2 + mm * sc, Y = mm => y0 + fh / 2 - mm * sc;                 // sensor mm → screen (image shown the right way up)
  c.save(); c.beginPath(); c.rect(x0, y0, fw, fh); c.clip();
  // sky and the horizon (at eye level, since the camera is level)
  const hz = Y(0); let gr = c.createLinearGradient(0, y0, 0, hz); gr.addColorStop(0, "#5d8fd6"); gr.addColorStop(1, "#cfe2ff"); c.fillStyle = gr; c.fillRect(x0, y0, fw, hz - y0);
  c.fillStyle = "#6f8f4e"; c.fillRect(x0, hz, fw, y0 + fh - hz);
  // mountains 5 km away (a fixed angular size: only the focal length changes how big they look)
  c.fillStyle = "#8aa0c0"; c.beginPath(); c.moveTo(X(-9e9), Y(proj(0, 0, 5000, f)[1])); for (let k = -40; k <= 40; k++) { const xm = k * 250, hm = 300 + 350 * Math.abs(Math.sin(k * 1.7)) + 200 * Math.sin(k * 0.6); const p = proj(xm, hm, 5000, f); c.lineTo(X(p[0]), Y(p[1])); } c.lineTo(X(9e9), Y(proj(0, 0, 5000, f)[1])); c.fill();
  // distance lines on the ground every 5 m (they crowd together towards the horizon)
  c.strokeStyle = "rgba(255,255,255,0.18)"; c.lineWidth = 1; for (let z = 5; z <= 400; z += z < 50 ? 5 : 25) { const p = proj(0, 0, z, f); c.beginPath(); c.moveTo(x0, Y(p[1])); c.lineTo(x0 + fw, Y(p[1])); c.stroke(); }
  // a path leading away
  c.fillStyle = "#b9a98a"; c.beginPath(); const pz = [0.5, 400]; const a1 = proj(-0.8, 0, pz[0], f), a2 = proj(-0.8, 0, pz[1], f), b2 = proj(0.8, 0, pz[1], f), b1 = proj(0.8, 0, pz[0], f); c.moveTo(X(a1[0]), Y(a1[1])); c.lineTo(X(a2[0]), Y(a2[1])); c.lineTo(X(b2[0]), Y(b2[1])); c.lineTo(X(b1[0]), Y(b1[1])); c.fill();
  // trees and the church tower, P.D behind the person (drawn far to near)
  const zt = s + P.D, items = [];
  for (const dx of [-30, -18, -9, 9, 18, 30, 45]) items.push({ z: zt + (dx % 2 ? 4 : 0), draw: () => { const b = proj(dx, 0, zt, f), tp = proj(dx, 12, zt, f), rw = 3 * f / zt * sc; c.fillStyle = "#4f3a26"; c.fillRect(X(b[0]) - rw * 0.12, Y(proj(dx, 4, zt, f)[1]), rw * 0.24, Y(b[1]) - Y(proj(dx, 4, zt, f)[1])); c.fillStyle = "#2f6b3a"; c.beginPath(); c.ellipse(X(b[0]), (Y(tp[1]) + Y(proj(dx, 4, zt, f)[1])) / 2, rw, (Y(proj(dx, 4, zt, f)[1]) - Y(tp[1])) / 2, 0, 0, 6.3); c.fill(); } });
  items.push({ z: zt, draw: () => { const bl = proj(-3, 0, zt, f), tr = proj(3, 25, zt, f), sp = proj(0, 33, zt, f), nave = proj(12, 12, zt, f); c.fillStyle = "#c9b9a0"; c.fillRect(X(bl[0]), Y(nave[1]), X(nave[0]) - X(bl[0]), Y(bl[1]) - Y(nave[1])); c.fillStyle = "#d8cbb5"; c.fillRect(X(bl[0]), Y(tr[1]), X(tr[0]) - X(bl[0]), Y(bl[1]) - Y(tr[1])); c.fillStyle = "#6a5a4a"; c.beginPath(); c.moveTo(X(bl[0]), Y(tr[1])); c.lineTo(X(sp[0]), Y(sp[1])); c.lineTo(X(tr[0]), Y(tr[1])); c.fill(); c.fillStyle = "#3a3f4a"; const cl = proj(0, 20, zt, f); c.beginPath(); c.arc(X(cl[0]), Y(cl[1]), 1.2 * f / zt * sc, 0, 6.3); c.fill(); } });
  // the person (height 1.8 m) at distance s, slightly right of centre
  items.push({ z: s, draw: () => { const px = 0.0, ft = proj(px, 0, s, f), hd = proj(px, 1.62, s, f), sh = proj(px, 1.45, s, f), k = f / s * sc; c.fillStyle = "#2d3e63"; c.beginPath(); c.moveTo(X(ft[0]) - 0.25 * k, Y(ft[1])); c.lineTo(X(ft[0]) - 0.24 * k, Y(sh[1])); c.lineTo(X(ft[0]) + 0.24 * k, Y(sh[1])); c.lineTo(X(ft[0]) + 0.25 * k, Y(ft[1])); c.fill(); c.fillStyle = "#e7b894"; c.beginPath(); c.ellipse(X(hd[0]), Y(hd[1]), 0.09 * k, 0.12 * k, 0, 0, 6.3); c.fill(); c.fillStyle = "#3b2618"; c.beginPath(); c.ellipse(X(hd[0]), Y(hd[1]) - 0.05 * k, 0.095 * k, 0.07 * k, 0, Math.PI, 0); c.fill(); } });
  items.sort((a, b) => b.z - a.z).forEach(it => it.draw());
  c.restore(); c.strokeStyle = "#eef2f8"; c.lineWidth = 1.5; c.strokeRect(x0, y0, fw, fh);
  // rule-of-thirds guides
  c.strokeStyle = "rgba(255,255,255,0.15)"; c.beginPath(); for (const k of [1, 2]) { c.moveTo(x0 + fw * k / 3, y0); c.lineTo(x0 + fw * k / 3, y0 + fh); c.moveTo(x0, y0 + fh * k / 3); c.lineTo(x0 + fw, y0 + fh * k / 3); } c.stroke();
}
function drawPlan(c, x0, y0, pw, ph) {
  const S = SENSORS[P.sensor], f = F(), s = subjDist(), far = Math.max(60, (s + P.D) * 1.15), sc = (ph - 40) / far, cx = x0 + pw / 2, cy = y0 + ph - 20;
  c.fillStyle = "#111a2e"; c.fillRect(x0, y0, pw, ph); c.strokeStyle = "#3a4560"; c.strokeRect(x0, y0, pw, ph);
  c.fillStyle = "#eef2f8"; c.font = "600 12px " + FONT; c.textAlign = "left"; c.fillText("Seen from above (plan)", x0 + 8, y0 + 16);
  const half = fov(S.w, f) / 2 * DEG; c.fillStyle = "rgba(255,209,102,0.15)"; c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - Math.tan(half) * far * sc, cy - far * sc); c.lineTo(cx + Math.tan(half) * far * sc, cy - far * sc); c.closePath(); c.save(); c.beginPath(); c.rect(x0, y0, pw, ph); c.clip(); c.fill(); c.restore();
  c.save(); c.beginPath(); c.rect(x0, y0, pw, ph); c.clip(); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - Math.tan(half) * far * 3 * sc, cy - far * 3 * sc); c.moveTo(cx, cy); c.lineTo(cx + Math.tan(half) * far * 3 * sc, cy - far * 3 * sc); c.stroke(); c.restore();
  c.fillStyle = "#e7b894"; c.beginPath(); c.arc(cx, cy - s * sc, 5, 0, 6.3); c.fill(); c.fillStyle = "#aab6cc"; c.font = "11px " + FONT; c.fillText("person " + s.toFixed(1) + " m", cx + 8, cy - s * sc + 4);
  c.fillStyle = "#d8cbb5"; c.fillRect(cx - 3 * sc - 2, cy - (s + P.D) * sc - 3, 6 * sc + 4, 6); c.fillStyle = "#aab6cc"; c.fillText("tower " + (s + P.D).toFixed(0) + " m", cx + 8, cy - (s + P.D) * sc + 4);
  c.fillStyle = "#5ab0ff"; c.fillRect(cx - 6, cy - 4, 12, 8); c.fillText("camera", cx + 10, cy + 4);
  c.fillStyle = "#7d8aa5"; c.fillText(`${fov(S.w, f).toFixed(0)}° field of view`, x0 + 8, y0 + ph - 6);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(() => { }, () => {
  const c = cv.ctx, w = cv.w, h = cv.h, S = SENSORS[P.sensor]; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const planW = Math.min(240, w * 0.28), avW = w - planW - 50, aspect = S.w / S.h, fw = Math.min(avW, (h - 60) * aspect), fh = fw / aspect;
  drawView(c, 20, 36, fw, fh); drawPlan(c, w - planW - 16, 36, planW, Math.min(h - 50, fh));
  const f = F(), s = subjDist();
  c.fillStyle = "#eef2f8"; c.font = "600 14px " + FONT; c.textAlign = "left";
  c.fillText(`${f} mm on ${S.n} · camera ${s.toFixed(1)} m from the person`, 20, 24);
  if (frame++ % 6) return;
  const fp = FOCALS.map(x => [x, fov(S.w, x)]); chA.draw([{ pts: fp, color: "#5ab0ff", label: S.n.split(" (")[0] }, { pts: FOCALS.map(x => [x, fov(36, x)]), color: "#7d8aa5", dash: [4, 4], label: "full frame" }, { pts: [[f, fov(S.w, f)]], type: "dots", color: "#ffd166", r: 6 }], { xMin: 0, xMax: 300, yMin: 0, yMax: 120 });
  const rp = FOCALS.filter(x => x >= 10 && x <= 300).map(x => { const ss = distForFill(SUBJ_H, x, S.h, P.fill); return [x, 25 / SUBJ_H * ss / (ss + P.D)]; });
  chB.draw([{ pts: rp, color: "#ffd166", label: "tower 25 m, " + P.D + " m behind" }, { pts: [[f, 25 / SUBJ_H * distForFill(SUBJ_H, f, S.h, P.fill) / (distForFill(SUBJ_H, f, S.h, P.fill) + P.D)]], type: "dots", color: "#ff5d6c", r: 6 }], { xMin: 0, xMax: 300, yMin: 0 });
  const c0 = 0.03 / S.crop, L = dof(s, f, P.N, c0), Hf = f * f / (P.N * c0) / 1000;
  read.set("fov", fov(S.w, f).toFixed(1) + "°"); read.set("eq", Math.round(f * S.crop) + " mm"); read.set("s", s.toFixed(2) + " m");
  read.set("ratio", (imageHeight(25, s + P.D, f) / imageHeight(SUBJ_H, s, f)).toFixed(2)); read.set("ext", extension(s, f) < 1 ? extension(s, f).toFixed(2) + " mm" : extension(s, f).toFixed(1) + " mm");
  read.set("m", magnification(s, f) >= 0.1 ? magnification(s, f).toFixed(2) : "1 : " + Math.round(1 / magnification(s, f))); read.set("dof", isFinite(L) ? (L < 1 ? (L * 100).toFixed(1) + " cm" : L.toFixed(2) + " m") : "to infinity"); read.set("hf", Hf.toFixed(1) + " m");
});
set({});
ui.tip("Change the focal length. The plan on the right shows where the camera is and what it sees.", 7000);
