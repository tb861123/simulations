/* =====================================================================
   LIGHT: REFRACTION, LENSES AND FIBRES
   An optical bench seen from above. Put glass blocks, prisms, lenses,
   mirrors, a raindrop or an optical fibre on it, shine light at them
   and drag everything about.

   The program knows only two laws. Every time a ray meets a surface:

     1. REFLECTION   angle of reflection = angle of incidence
     2. REFRACTION   n1 sin(i) = n2 sin(r)        (Snell's law)

   where n is the refractive index of each material (n = speed of light
   in a vacuum / speed in the material). If Snell's law would need
   sin(r) > 1 there is no refracted ray: total internal reflection.
   How the light is shared between the reflected and refracted rays
   comes from Fresnel's equations.

   Lenses are real pieces of glass with curved faces: nothing tells them
   to focus. Rainbows, sparkling diamonds, fibres and magnifying glasses
   all come out of rules 1 and 2. Lengths are in centimetres.
   ===================================================================== */
const DEG = Math.PI / 180;
// white light is traced as seven colours; their on-screen colours add up to white where the rays overlap
const WL = [0.42, 0.46, 0.50, 0.54, 0.58, 0.62, 0.67];                                            // wavelengths in micrometres
const WLC = [[90, 0, 200], [0, 60, 255], [0, 200, 170], [60, 255, 0], [240, 230, 0], [255, 120, 0], [255, 0, 0]];
const COLS = { white: [0, 1, 2, 3, 4, 5, 6], red: [6], green: [3], blue: [1] };
// refractive index for a colour: slightly higher for blue than red (dispersion; Cauchy's formula). `disp` 0 switches it off.
const indexFor = (S, wl) => S.n + (S.disp == null ? 0.008 : S.disp) * (S.n - 1) * 2 * (1 / (wl * wl) - 1 / (0.58 * 0.58));

/* ---- Shapes. Each is described, in its own coordinates, by straight edges [x1,y1,x2,y2] and arcs [cx,cy,r,a0,a1] (angles
        anticlockwise from a0 to a1), then moved and turned into place. ---- */
function localOutline(S) {
  const s = S.size || 1, L = [], A = [];
  if (S.kind === "block" || S.kind === "tank") { const w = (S.kind === "tank" ? 22 : 10) * s / 2, h = (S.kind === "tank" ? 12 : 6) * s / 2; L.push([-w, -h, w, -h], [w, -h, w, h], [w, h, -w, h], [-w, h, -w, -h]); }
  else if (S.kind === "prism") { const a = 9 * s, h = a * Math.sqrt(3) / 2; L.push([-a / 2, -h / 3, a / 2, -h / 3], [a / 2, -h / 3, 0, 2 * h / 3], [0, 2 * h / 3, -a / 2, -h / 3]); }
  else if (S.kind === "semi") { const r = 5 * s; L.push([0, r, 0, -r]); A.push([0, 0, r, -Math.PI / 2, Math.PI / 2]); }
  else if (S.kind === "drop") A.push([0, 0, 4 * s, 0, 2 * Math.PI]);
  else if (S.kind === "lens") { const h = 5 * s, R = Math.max(S.curve, h * 1.02), d = Math.sqrt(R * R - h * h), al = Math.asin(h / R); A.push([-d, 0, R, -al, al], [d, 0, R, Math.PI - al, Math.PI + al]); }
  else if (S.kind === "dlens") { const h = 5 * s, R = Math.max(S.curve, h * 1.02), al = Math.asin(h / R), t = 0.5, e = t + R - Math.sqrt(R * R - h * h); A.push([t + R, 0, R, Math.PI - al, Math.PI + al], [-t - R, 0, R, -al, al]); L.push([-e, h, e, h], [-e, -h, e, -h]); }
  else if (S.kind === "mirror") L.push([0, -5 * s, 0, 5 * s]);
  else if (S.kind === "cmirror") { const h = 5 * s, R = Math.max(S.curve, h * 1.02), al = Math.asin(h / R); A.push([-R, 0, R, -al, al]); }
  else if (S.kind === "fibre") { const w = 0.6, a = 14, b = 8, R = Math.max(S.curve, 1), cx = a, cy = R; L.push([0, -w, a, -w], [0, w, a, w], [0, -w, 0, w], [a + R - w, R, a + R - w, R + b], [a + R + w, R, a + R + w, R + b], [a + R - w, R + b, a + R + w, R + b]); A.push([cx, cy, R + w, -Math.PI / 2, 0]); if (R - w > 0.01) A.push([cx, cy, R - w, -Math.PI / 2, 0]); }
  return { L, A };
}
// every edge of every shape, in bench coordinates
function prims(shapes) {
  const out = [];
  for (const S of shapes) {
    const { L, A } = localOutline(S), c = Math.cos(S.rot), s = Math.sin(S.rot), mir = S.kind === "mirror" || S.kind === "cmirror";
    for (const l of L) out.push({ S, mir, x1: S.x + l[0] * c - l[1] * s, y1: S.y + l[0] * s + l[1] * c, x2: S.x + l[2] * c - l[3] * s, y2: S.y + l[2] * s + l[3] * c });
    for (const a of A) out.push({ S, mir, arc: true, cx: S.x + a[0] * c - a[1] * s, cy: S.y + a[0] * s + a[1] * c, r: a[2], a0: a[3] + S.rot, a1: a[4] + S.rot });
  }
  return out;
}
// where does a ray first meet an edge? Returns the distance and the edge's normal there.
function hit(P, ox, oy, dx, dy) {
  let best = 1e9, bp = null, nx = 0, ny = 0;
  for (const p of P) {
    if (!p.arc) { const ex = p.x2 - p.x1, ey = p.y2 - p.y1, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue; const t = ((p.x1 - ox) * ey - (p.y1 - oy) * ex) / den, u = ((p.x1 - ox) * dy - (p.y1 - oy) * dx) / den; if (t > 1e-6 && t < best && u >= 0 && u <= 1) { best = t; bp = p; const l = Math.hypot(ex, ey); nx = ey / l; ny = -ex / l; } }
    else { const fx = ox - p.cx, fy = oy - p.cy, b = fx * dx + fy * dy, c = fx * fx + fy * fy - p.r * p.r, D = b * b - c; if (D < 0) continue; const sq = Math.sqrt(D);
      for (const t of [-b - sq, -b + sq]) { if (t <= 1e-6 || t >= best) continue; const px = fx + dx * t, py = fy + dy * t; let a = Math.atan2(py, px) - p.a0; a -= Math.floor(a / (2 * Math.PI)) * 2 * Math.PI; if (a <= p.a1 - p.a0 + 1e-9) { best = t; bp = p; nx = px / p.r; ny = py / p.r; } } }
  }
  return bp ? { t: best, p: bp, nx, ny } : null;
}
/* Follow one ray through the bench. Adds every straight piece to `segs` as [x1, y1, x2, y2, brightness, colour, optical path at start, n].
   `events` (optional) collects what happened at each surface on the main path, for the angle read-outs. */
function trace(P, ray, segs, events, opts) {
  const stack = [ray], faint = opts && opts.faint != null ? opts.faint : 0.012; let count = 0;
  while (stack.length && count++ < 400) {
    const r = stack.pop(); let { x, y, dx, dy, I, wl, inside, opl, main } = r;
    for (let bounce = r.depth || 0; bounce < 40; bounce++) {
      const h = hit(P, x, y, dx, dy), nNow = inside ? indexFor(inside, WL[wl]) : 1;
      if (!h) { segs.push([x, y, x + dx * 200, y + dy * 200, I, wl, opl, nNow]); break; }
      const hx = x + dx * h.t, hy = y + dy * h.t; segs.push([x, y, hx, hy, I, wl, opl, nNow]); opl += nNow * h.t;
      let nx = h.nx, ny = h.ny, cosi = -(dx * nx + dy * ny); if (cosi < 0) { nx = -nx; ny = -ny; cosi = -cosi; }               // make the normal face the incoming ray
      const rx = dx + 2 * cosi * nx, ry = dy + 2 * cosi * ny;                                                                    // LAW 1: the reflected direction
      if (h.p.mir) { if (main && events) events.push({ x: hx, y: hy, nx, ny, i: Math.acos(Math.min(1, cosi)), mirror: true }); x = hx; y = hy; dx = rx; dy = ry; continue; }
      const S = h.p.S, leaving = inside === S, n1 = nNow, n2 = leaving ? 1 : indexFor(S, WL[wl]), sini = Math.sqrt(Math.max(0, 1 - cosi * cosi)), sinr = n1 / n2 * sini;   // LAW 2: Snell's law
      if (sinr >= 1) { if (main && events) events.push({ x: hx, y: hy, nx, ny, i: Math.acos(Math.min(1, cosi)), n1, n2, tir: true, R: 1 }); x = hx; y = hy; dx = rx; dy = ry; continue; }   // total internal reflection
      const cosr = Math.sqrt(1 - sinr * sinr), rs = (n1 * cosi - n2 * cosr) / (n1 * cosi + n2 * cosr), rp = (n1 * cosr - n2 * cosi) / (n1 * cosr + n2 * cosi), R = (rs * rs + rp * rp) / 2;   // Fresnel: the share reflected
      if (main && events) events.push({ x: hx, y: hy, nx, ny, i: Math.acos(Math.min(1, cosi)), r: Math.asin(sinr), n1, n2, R });
      if (I * R > faint && bounce < 30) stack.push({ x: hx, y: hy, dx: rx, dy: ry, I: I * R, wl, inside, opl, main: false, depth: bounce + 1 });
      const k = n1 / n2, tx = k * dx + (k * cosi - cosr) * nx, ty = k * dy + (k * cosi - cosr) * ny;                              // the refracted direction
      x = hx; y = hy; dx = tx; dy = ty; I *= 1 - R; inside = leaving ? null : S; if (I < Math.min(faint, 0.012)) break;
    }
  }
}
// the rays a source sends out: [x, y, dx, dy, colour]
function raysOf(src) {
  const out = [], c = Math.cos(src.ang), s = Math.sin(src.ang), cols = COLS[src.col || "white"];
  const add = (x, y, a) => { for (const wl of cols) out.push({ x, y, dx: Math.cos(a), dy: Math.sin(a), I: 1, wl, inside: null, opl: 0, main: out.length < cols.length }); };
  if (src.type === "ray") add(src.x, src.y, src.ang);
  else if (src.type === "beam") { const n = src.n || 9, w = src.width || 6; for (let k = 0; k < n; k++) { const o = (k / (n - 1) - .5) * w; add(src.x - s * o, src.y + c * o, src.ang); } }
  else { const n = src.n || 13, cone = (src.cone || 22) * DEG; for (let k = 0; k < n; k++) add(src.x, src.y, src.ang + (k / (n - 1) - .5) * 2 * cone); }
  if (src.type !== "ray") out.forEach((r, i) => r.main = Math.floor(i / cols.length) === Math.floor((src.type === "beam" ? (src.n || 9) : (src.n || 13)) / 2));
  return out;
}
const mk = (kind, x, y, rot, extra) => Object.assign({ kind, x, y, rot: rot * DEG, n: kind === "tank" || kind === "drop" ? 1.33 : 1.5, size: 1, curve: kind === "fibre" ? 6 : 12 }, extra);
const lamp = (type, x, y, ang, extra) => Object.assign({ src: true, type, x, y, ang: ang * DEG, col: "white" }, extra);
// helper for experiments: trace one ray and return what happened at each surface on its way
function probe(shapes, x, y, angDeg, wl = 4) { const ev = [], segs = []; trace(prims(shapes), { x, y, dx: Math.cos(angDeg * DEG), dy: Math.sin(angDeg * DEG), I: 1, wl, inside: null, opl: 0, main: true }, segs, ev, { faint: 2 }); return { ev, segs }; }
// where do the rays of a parallel beam cross the axis after a lens at the origin? (its focal length)
function focalLength(shape, h = 1) { const { segs } = probe([shape], -25, h, 0), q = segs[segs.length - 1], dy = q[3] - q[1], dx = q[2] - q[0]; return Math.abs(dy) < 1e-9 ? null : q[0] - q[1] * dx / dy; }

const F12 = focalLength(mk("lens", 0, 0, 0, { curve: 12, disp: 0 }), 0.2);   // focal length of the lens used in the lens-equation experiment

// ---------------- Scenes ----------------
const SCENES = {
  block: () => [[mk("block", 4, 0, 0, { size: 1.6 })], [lamp("ray", -10, 12.5, -50, { col: "red" })]],
  semi: () => [[mk("semi", 0, 0, 180, { size: 1.4 })], [lamp("ray", -14, -9.8, 35, { col: "red" })]],
  prism: () => [[mk("prism", 2, -1, 0, { size: 1.5, disp: 0.02 })], [lamp("ray", -20, -4.5, 16)]],
  lens: () => [[mk("lens", 0, 0, 0, { size: 1.3, curve: 14 })], [lamp("beam", -24, 0, 0, { col: "red", width: 9, n: 9 })]],
  dlens: () => [[mk("dlens", 0, 0, 0, { size: 1.3, curve: 14 })], [lamp("beam", -24, 0, 0, { col: "red", width: 9, n: 9 })]],
  image: () => [[mk("lens", 2, 0, 0, { size: 1.5, curve: 11 })], [lamp("lamp", -20, 2, 0, { col: "green", cone: 10, n: 9 }), lamp("lamp", -20, -2, 0, { col: "red", cone: 10, n: 9 })]],
  fibre: () => [[mk("fibre", -12, -6, 0, { curve: 7 })], [lamp("ray", -20, -8.6, 18, { col: "red" })]],
  drop: () => [[mk("drop", 6, 0, 0, { size: 1.5, disp: 0.02 })], [lamp("beam", -24, 4.6, 0, { width: 1.6, n: 5 })]],
  diamond: () => [[mk("prism", 0, 0, 180, { size: 1.6, n: 2.42, disp: 0.03 })], [lamp("ray", -18, 7, -14)]],
  periscope: () => [[mk("mirror", -8, 6, 45, {}), mk("mirror", -8, -6, 45, {})], [lamp("beam", -26, 6, 0, { col: "green", width: 3, n: 5 })]],
  empty: () => [[], [lamp("ray", -18, 0, 0)]]
};

// ---------------- The page ----------------
let shapes = [], sources = [], sel = null, pulses = false, weak = true, showAngles = true, tClock = 0, pts = [], lastKey = "";
function load(name) { const [a, b] = SCENES[name](); shapes = a; sources = b; sel = sources[0]; pts = []; weak = !["lens", "dlens", "image", "periscope"].includes(name); pulses = false; if (typeof ctl !== "undefined" && ctl.weak) { ctl.weak.set(weak); ctl.pulses.set(false); } syncPanel(); }
const mainSource = () => sel && sel.src ? sel : sources[0];

const ui = K.app({
  title: "Light: Refraction, Lenses and Fibres", subject: "Physics",
  blurb: "An optical bench where every ray obeys Snell's law and nothing else",
  reset: () => load("block"),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 3(d) Light and sound: reflection, refraction, n = sin i / sin r, critical angle, total internal reflection; the visible spectrum 3(c). Lenses are beyond the spec.", adv: "WJEC Eduqas A level Physics: refraction of light, n = c/v, n₁ sin θ₁ = n₂ sin θ₂, critical angle, optical fibres. Lenses, dispersion formulas and Fresnel reflection are beyond the spec." } },
  missions: [
    { title: "Bending light", q: "A red ray enters a glass block. Drag the ray box (or turn it with its handle) to change the angle of incidence i. Which way does the ray bend going in? Coming out? Work out sin i ÷ sin r for three different angles.", hint: "Going into glass the ray bends towards the normal (the dashed line at right angles to the surface); coming out it bends away again. sin i ÷ sin r comes to the same number every time, 1.5: the refractive index of the glass. That is Snell's law. Because the top and bottom faces are parallel, the ray leaves parallel to the way it came in, shifted sideways.", setup() { load("block"); } },
    { title: "Trapped inside: the critical angle", q: "The ray enters a semicircular block through its curved side, so it meets the flat face from inside the glass. Turn the ray box slowly to make the angle at the flat face bigger. What happens to the ray that escapes, and to the reflected one, as you approach about 42°?", hint: "As the angle inside grows, the escaping ray bends closer and closer to the surface and gets fainter while the reflected ray gets brighter. At the critical angle (sin c = 1/n, 41.8° for this glass) the escaping ray skims the surface; beyond it nothing gets out at all: total internal reflection. It only happens when light tries to leave a denser material.", setup() { load("semi"); } },
    { title: "Light down a pipe", q: "A ray is shone into the end of a glass fibre. Why does it follow the bend instead of shooting out of the side? Now reduce 'Curve radius' to bend the fibre more tightly. What eventually happens?", hint: "Each time the ray meets the wall it does so at more than the critical angle, so it is totally internally reflected and none leaks out. Bend the fibre too tightly and the ray meets the outside of the bend too squarely: light escapes. Real fibres are hair-thin, so that even a tight-looking loop is a gentle bend for the light. They carry the internet as pulses of infrared.", setup() { load("fibre"); } },
    { title: "Splitting white light", q: "A ray of white light meets a prism. What comes out? Which colour is bent most? Turn the prism and watch the spectrum.", hint: "The glass has a slightly higher refractive index for violet than for red, so violet is bent most and red least: the colours are spread into a spectrum (dispersion). Newton showed in 1666 that the prism does not add colour: white light is a mixture of all the colours. A second prism the other way up puts them back together: try adding one.", setup() { load("prism"); } },
    { title: "A lens is just curved glass", q: "Parallel rays meet a converging lens. Where do they cross? Now make the lens fatter (smaller 'Curve radius'), or change what it is made of. What happens to the focal length?", hint: "Each ray is bent by Snell's law at both faces. Because the faces are curved, rays further from the middle meet steeper glass and are bent more, so they all cross at the principal focus. A more curved lens, or one with a higher refractive index, bends light more and has a shorter focal length. Look closely: rays from the edge cross slightly before those near the middle (spherical aberration).", setup() { load("lens"); } },
    { title: "Making an image", q: "Two small lamps, green above red, shine on a lens. Find where the green rays meet again, and the red. Which is on top now? Move the lamps towards the lens. What happens to the image when they get closer than the focal length?", hint: "Rays from each lamp meet again at a point on the far side: a real image, upside down. A camera, a projector and your eye work like this. Bring the object closer and the image moves away and gets bigger. Closer than the focal length, the rays leaving the lens still spread out and never meet: they only appear to come from a point behind the lens (a virtual image). That is a magnifying glass.", setup() { load("image"); } },
    { title: "The diverging lens", q: "Parallel rays meet a lens that is thinner in the middle than at the edges. What happens to them? Where do they seem to come from?", hint: "The rays spread out as if they had all come from a single point behind the lens, its principal focus. A diverging lens cannot form a real image of a real object. It is used in glasses for short-sighted people, to spread the light a little before the eye's own lens brings it to a focus.", setup() { load("dlens"); } },
    { title: "A rainbow in one raindrop", q: "White sunlight enters the top half of a round water drop. Follow the light that reflects once off the back and comes out again. Roughly what angle does it make with the sunlight? Why are the colours separated?", hint: "The rays that reflect once inside the drop come back out bunched at about 42° to the incoming sunlight, red slightly more (42°) than violet (40°), because water bends violet more. Every drop sends you a different colour depending on its angle from your eye, so you see a bow: red on the outside, at 42° from the point opposite the Sun. Faint rays that reflect twice make the secondary bow.", setup() { load("drop"); } },
    { title: "Why diamonds sparkle", q: "This prism is made of diamond (n = 2.42). Compare what happens to the light with a glass prism (set the refractive index to 1.5). What is diamond's critical angle?", hint: "Diamond's critical angle is only 24°, so light inside it is totally internally reflected again and again before it finds a face it can leave through, and diamond's strong dispersion spreads the colours widely by then: flashes of colour ('fire'). Gem cutters choose the angles of the faces so that most of the light comes back out of the top.", setup() { load("diamond"); } },
    { lvl: "adv", title: "Why does light bend at all?", q: "Switch on 'Show pulses of light'. The dots mark pulses sent out together along a wide beam. What happens to their speed and spacing inside the glass? Turn the block so the beam meets it at an angle and watch the line of pulses.", hint: "Light travels more slowly in glass: v = c/n, so the pulses bunch up. If the beam meets the surface at an angle, one side of each line of pulses (a wavefront) enters the glass first and slows down while the other side is still in air, so the whole front swings round. The change of direction that keeps the fronts continuous is exactly Snell's law.", setup() { shapes = [mk("block", 6, 0, 25, { size: 2 })]; sources = [lamp("beam", -22, 0, 0, { col: "green", width: 7, n: 9 })]; sel = sources[0]; pulses = true; ctl.pulses.set(true); syncPanel(); } }
  ],
  batch: [
    { title: "Snell's law", question: "Is sin i ÷ sin r really constant?", how: "Each run: a ray enters glass (n = 1.5) at the chosen angle; the angle of refraction is 'read' with a random error of half a degree.", xLabel: "sin i", yLabel: "sin r", xs: [0.17, 0.34, 0.5, 0.64, 0.77, 0.87, 0.94], reps: 5, yMin: 0, fit: true, theory: x => x / 1.5, theoryLabel: "sin r = sin i / 1.5", run(x, rnd) { const i = Math.asin(x) / DEG, ev = probe([mk("block", 5, 0, 0, { size: 2, disp: 0 })], -15, -10 * Math.tan(i * DEG), i).ev; return ev.length ? Math.sin(ev[0].r + 0.5 * DEG * rnd.gauss()) : null; }, note: "The gradient of the best-fit line is 1/n. A half-degree error in reading a protractor matters least at large angles, where the ray is bent most." },
    { title: "Critical angle against refractive index", question: "How does the critical angle depend on the material?", how: "Each run: inside a semicircular block of the chosen refractive index, the angle is raised in small steps until no light escapes. The reading has a random error of half a degree.", xLabel: "refractive index", yLabel: "critical angle (degrees)", xs: [1.2, 1.33, 1.5, 1.7, 2.0, 2.42], reps: 5, yMin: 0, theory: n => Math.asin(1 / n) / DEG, theoryLabel: "sin c = 1/n", run(n, rnd) { const S = [mk("semi", 0, 0, 180, { size: 1.4, n, disp: 0 })]; for (let a = 5; a < 89; a += 0.25) { const ev = probe(S, -14 * Math.cos(a * DEG), -14 * Math.sin(a * DEG), a).ev; if (ev.length > 1 && ev[1].tir) return a + 0.5 * rnd.gauss(); } return null; } },
    { title: "What sets a lens's focal length?", question: "How does the focal length depend on how curved the faces are?", how: "Each run: a ray parallel to the axis, at a random height up to 1.5 cm, passes through a glass lens with faces of the chosen radius. The result is where it crosses the axis.", xLabel: "radius of each face (cm)", yLabel: "focal length (cm)", xs: [8, 10, 12, 15, 18, 22, 26, 30], reps: 6, yMin: 0, fit: true, theory: R => R / (2 * 0.5), theoryLabel: "thin lens: f = R / 2(n − 1)", run: (R, rnd) => focalLength(mk("lens", 0, 0, 0, { curve: R, disp: 0 }), 0.3 + 1.2 * rnd()), note: "The points sit a little above the thin-lens formula, most of all for strongly curved lenses: a real lens has thickness, and distances here are measured from its middle. Rays further from the axis are focused slightly short (spherical aberration): that is the scatter." },
    { title: "The lens equation", question: "For a lens, how is the image distance related to the object distance?", how: "Each run: a point lamp is placed on the axis of a lens (focal length about 12.5 cm) and two rays are traced to find where they meet. Distances are 'measured' with a random error of 2 mm.", xLabel: "1 / object distance (1/cm)", yLabel: "1 / image distance (1/cm)", xs: [0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.07], reps: 5, fit: true, theory: x => 1 / F12 - x, theoryLabel: "1/v = 1/f − 1/u", run(x, rnd) { const u = 1 / x, L = mk("lens", 0, 0, 0, { curve: 12, disp: 0 }), q = probe([L], -u, 0, Math.atan2(0.3, u) / DEG).segs.pop(), v = q[0] - q[1] * (q[2] - q[0]) / (q[3] - q[1]); return 1 / (v + 0.2 * rnd.gauss()); }, note: "A straight line of gradient −1: 1/u + 1/v = 1/f. Where it crosses either axis gives 1/f." },
    { title: "The rainbow angle", question: "At what angle does light come back out of a raindrop?", how: "Each run: one ray of red light hits a round water drop at a random height, reflects once inside and leaves. The result is the angle between the ray coming out and the sunlight going in.", xLabel: "", yLabel: "angle from the incoming sunlight (degrees)", reps: 600, bins: 42, lo: 0, hi: 42.6, theory: 42.3, theoryLabel: "rainbow angle", run(x, rnd) { const b = rnd(), n = 1.331, i = Math.asin(b), r = Math.asin(b / n); return (4 * r - 2 * i) / DEG; }, note: "Rays hit the drop at every height, but far more of them come out near 42° than at any other angle: the bars pile up at the right-hand edge. That bunching is the rainbow; no light at all comes out beyond it, which is why the sky is darker outside the bow." },
    { title: "How tightly can a fibre bend?", question: "How much light gets round a bend in a glass fibre?", how: "Each run: a ray enters a bare glass fibre (in air) at a random angle up to 20° and position. The result is the percentage of its light that reaches the far end.", xLabel: "radius of the bend (cm)", yLabel: "light reaching the far end (%)", xs: [0.8, 1, 1.5, 2, 3, 4, 6, 8], reps: 12, yMin: 0, yMax: 105, run(R, rnd) { const F = mk("fibre", 0, 0, 0, { curve: R, disp: 0 }), segs = [], a = (rnd() - .5) * 40 * DEG; trace(prims([F]), { x: -1, y: (rnd() - .5) * 0.6 - Math.tan(a), dx: Math.cos(a), dy: Math.sin(a), I: 1, wl: 4, inside: null, opl: 0, main: true }, segs, null, { faint: 0.002 }); let out = 0; for (const q of segs) if (Math.abs(q[1] - (R + 8)) < 1e-6 && q[3] > q[1] && q[7] === 1) out += q[4]; return 100 * out; }, note: "About 4% is always lost by reflection at each end face. Round a gentle bend, every reflection off the wall is total, so nothing more is lost. Below a certain radius rays start to meet the wall at less than the critical angle and leak out." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 3(d)", text: "Law of reflection: angle of incidence = angle of reflection, both measured from the normal." },
      { lvl: "std", tag: "4PH1 3(d)", text: "Refraction is the change in direction of light when it passes from one material to another. Into a denser material it bends towards the normal; out of it, away from the normal." },
      { lvl: "std", tag: "4PH1 3(d)", text: "Refractive index n = sin i / sin r (light going from air into the material)." },
      { lvl: "std", tag: "4PH1 3(d)", text: "Critical angle c: sin c = 1/n. Total internal reflection needs light travelling in the denser material AND an angle of incidence greater than c. Used in optical fibres and prisms." },
      { lvl: "std", tag: "4PH1 3(c)", text: "White light is a mixture of colours. A prism disperses it into the visible spectrum: red (bent least), orange, yellow, green, blue, indigo, violet (bent most)." },
      { lvl: "adv", tag: "A level Eduqas", text: "n = c/v: light travels more slowly in a material of higher refractive index. Snell's law in general: n₁ sin θ₁ = n₂ sin θ₂." },
      { lvl: "adv", tag: "A level Eduqas", text: "Optical fibres: a core surrounded by cladding of slightly lower refractive index. Rays taking different zig-zag paths arrive at different times (multimode dispersion), which smears pulses; thin 'monomode' fibres avoid it." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Thin lens: 1/u + 1/v = 1/f. A converging lens gives a real, inverted image of an object beyond its focal length and a virtual, upright, magnified one of an object inside it." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const e = firstEvent(); return e && e.r != null && e.n1 < e.n2 ? `Your ray meets the surface at an angle of incidence of ${(e.i / DEG).toFixed(1)}° and is refracted at ${(e.r / DEG).toFixed(1)}°. Calculate the refractive index of the material.` : "A ray of light enters a glass block at an angle of incidence of 50° and is refracted at 30.7°. Calculate the refractive index of the glass."; }, ans: () => { const e = firstEvent(), ok = e && e.r != null && e.n1 < e.n2, i = ok ? e.i / DEG : 50, r = ok ? e.r / DEG : 30.7; return `<ul><li>n = sin i / sin r</li><li>= sin ${i.toFixed(1)}° ÷ sin ${r.toFixed(1)}° = ${Math.sin(i * DEG).toFixed(3)} ÷ ${Math.sin(r * DEG).toFixed(3)}</li><li>= ${(Math.sin(i * DEG) / Math.sin(r * DEG)).toFixed(2)}</li></ul>`; } },
      { lvl: "std", marks: 3, q: () => `A transparent material has a refractive index of ${(sel && !sel.src ? sel.n : 1.5).toFixed(2)}. Calculate its critical angle.`, ans: () => { const n = sel && !sel.src ? sel.n : 1.5; return `<ul><li>sin c = 1/n</li><li>= 1 ÷ ${n.toFixed(2)} = ${(1 / n).toFixed(3)}</li><li>c = ${(Math.asin(1 / n) / DEG).toFixed(1)}°</li></ul>`; } },
      { lvl: "std", marks: 2, q: "State the two conditions needed for total internal reflection.", ans: "<ul><li>The light must be travelling in the more dense material towards a less dense one (for example from glass towards air)</li><li>The angle of incidence must be greater than the critical angle</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe an experiment to measure the refractive index of a rectangular glass block.", ans: "<ul><li>Place the block on paper and draw round it; shine a ray from a ray box at one face and mark the ray going in and coming out</li><li>Remove the block, join the points to draw the ray inside, and draw the normal where the ray enters</li><li>Measure the angle of incidence i and the angle of refraction r with a protractor; repeat for several angles</li><li>Plot sin i against sin r: the gradient is the refractive index (or calculate sin i / sin r each time and average)</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain how an optical fibre carries light round a bend, and give one use.", ans: "<ul><li>Light meets the wall of the fibre at an angle greater than the critical angle</li><li>so it is totally internally reflected, again and again, with none escaping</li><li>Use: communications (telephone, internet) or an endoscope for seeing inside the body</li></ul>" },
      { lvl: "std", marks: 2, q: "A ray of white light passes through a prism and forms a spectrum. State which colour is deviated most, and explain why the colours separate.", ans: "<ul><li>Violet is deviated most (red least)</li><li>The glass has a different refractive index for each colour (each colour travels at a different speed in glass)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Light travels from water (n = 1.33) into glass (n = 1.50) at an angle of incidence of 40.0°. Calculate the angle of refraction.", ans: "<ul><li>n₁ sin θ₁ = n₂ sin θ₂</li><li>sin θ₂ = 1.33 × sin 40.0° ÷ 1.50 = 0.570</li><li>θ₂ = 34.7°</li></ul>" },
      { lvl: "adv", marks: 2, q: "Calculate the speed of light in diamond (n = 2.42). (c = 3.00 × 10⁸ m/s)", ans: "<ul><li>v = c/n = 3.00 × 10⁸ ÷ 2.42</li><li>= 1.24 × 10⁸ m/s</li></ul>" },
      { lvl: "adv", marks: 3, q: "An optical fibre has a core of refractive index 1.50 and cladding of 1.45. Calculate the critical angle at the core–cladding boundary and explain why cladding is used.", ans: "<ul><li>sin c = n₂/n₁ = 1.45 ÷ 1.50 = 0.967</li><li>c = 75.2°</li><li>Cladding protects the core surface from scratches and contact (which would let light leak), and the large critical angle means only rays close to the axis are guided, reducing multimode dispersion</li></ul>" },
      { lvl: "adv", marks: 3, q: "A converging lens of focal length 12 cm forms an image of an object placed 20 cm from it. Calculate the image distance and describe the image.", ans: "<ul><li>1/v = 1/f − 1/u = 1/12 − 1/20 = 0.0333</li><li>v = 30 cm</li><li>Real, inverted and magnified (× 1.5)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Rays</b> travel in straight lines until they meet a surface. There, the reflected direction comes from the law of reflection and the refracted direction from Snell's law, using the true shape of the surface at that point.</li>
<li><b>Brightness:</b> Fresnel's equations (for unpolarised light) give the share of light reflected at each surface; the rest is refracted. Rays fainter than about 1% of the original are dropped.</li>
<li><b>Colour:</b> white light is traced as seven colours. Each material's refractive index is slightly higher for violet than for red, which is what spreads a spectrum.</li>
<li><b>Lenses</b> are solid shapes bounded by two circular arcs. Their focusing is not programmed in.</li>
<li><b>Pulses</b> move along each ray at speed c/n, so they slow down and bunch up in glass.</li>
<li><b>The graphs</b> show Snell's law and the reflected share for the surface your selected ray meets first.</li></ul>
<h3>Simplifications</h3>
<ul><li>The bench is flat: everything is a slice through three-dimensional objects, so a "lens" is really a slice of a cylinder and a "drop" a slice of a ball.</li>
<li>Light is treated as rays: no diffraction, interference or polarisation, so a focus is a perfect point and very thin fibres do not behave as real ones do.</li>
<li>Dispersion is exaggerated (about double that of ordinary glass, more for the prism, drop and diamond scenes) so that spectra are easy to see.</li>
<li>Materials are perfectly clear, and mirrors reflect everything.</li>
<li>The fibre is bare glass in air with no cladding, and much fatter than a real fibre.</li>
<li>Shapes should not overlap: where they do, the model does not know which material the light is in.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Set up the bench");
let r1 = K.row(g); for (const [k, name] of [["block", "Glass block"], ["semi", "Semicircle"], ["prism", "Prism"]]) K.btn(r1, name, () => load(k));
r1 = K.row(g); for (const [k, name] of [["lens", "Lens"], ["dlens", "Diverging"], ["image", "Image"], ["fibre", "Fibre"]]) K.btn(r1, name, () => load(k));
r1 = K.row(g); for (const [k, name] of [["drop", "Raindrop"], ["diamond", "Diamond"], ["periscope", "Periscope"], ["empty", "Empty"]]) K.btn(r1, name, () => load(k));
g = ui.group("Add to the bench");
r1 = K.row(g); for (const [k, name] of [["block", "Block"], ["prism", "Prism"], ["semi", "Semicircle"], ["lens", "Lens"]]) K.btn(r1, "+ " + name, () => addShape(k), "small");
r1 = K.row(g); for (const [k, name] of [["dlens", "Diverging lens"], ["mirror", "Mirror"], ["cmirror", "Curved mirror"]]) K.btn(r1, "+ " + name, () => addShape(k), "small");
r1 = K.row(g); for (const [k, name] of [["drop", "Drop"], ["tank", "Water tank"], ["fibre", "Fibre"]]) K.btn(r1, "+ " + name, () => addShape(k), "small"); K.btn(r1, "+ Ray box", () => { if (sources.length < 6) { sel = lamp("ray", -20, 8 - sources.length * 3, 0); sources.push(sel); syncPanel(); } }, "small");
function addShape(kind) { if (shapes.length >= 14) return; sel = mk(kind, 8 + (shapes.length % 3) * 2, 6 - (shapes.length % 4) * 3, kind === "mirror" ? 45 : 0, {}); shapes.push(sel); syncPanel(); }
const selGroup = g = ui.group("Selected: ray box");
ctl.type = K.seg(g, { label: "Light from the box", value: "ray", options: [["ray", "one ray"], ["beam", "parallel beam"], ["lamp", "spreading"]], on: v => { if (sel && sel.src) sel.type = v; } });
ctl.col = K.seg(g, { label: "Colour", value: "white", options: [["white", "white"], ["red", "red"], ["green", "green"], ["blue", "blue"]], on: v => { if (sel && sel.src) sel.col = v; } });
ctl.n = K.slider(g, { label: "Refractive index", min: 1, max: 2.6, step: 0.01, value: 1.5, fmt: v => v.toFixed(2) + (Math.abs(v - 1.33) < 0.006 ? " (water)" : Math.abs(v - 1.5) < 0.006 ? " (glass)" : Math.abs(v - 2.42) < 0.006 ? " (diamond)" : v === 1 ? " (air)" : ""), on: v => { if (sel && !sel.src) sel.n = v; } });
ctl.rot = K.slider(g, { label: "Turned through", min: -180, max: 180, step: 0.5, value: 0, unit: "°", on: v => { if (!sel) return; if (sel.src) sel.ang = v * DEG; else sel.rot = v * DEG; } });
ctl.size = K.slider(g, { label: "Size", min: 0.5, max: 2.5, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { if (sel && !sel.src) sel.size = v; else if (sel) sel.width = 6 * v; } });
ctl.curve = K.slider(g, { label: "Curve radius (lens faces, fibre bend)", min: 1, max: 40, step: 0.5, value: 12, unit: "cm", on: v => { if (sel && !sel.src) sel.curve = v; } });
r1 = K.row(g); K.btn(r1, "Remove it", () => { if (!sel) return; if (sel.src) { if (sources.length > 1) sources.splice(sources.indexOf(sel), 1); } else shapes.splice(shapes.indexOf(sel), 1); sel = sources[0]; syncPanel(); });
K.note(g, "Click an object to select it. Drag to move it; drag its round handle (or use the mouse wheel over it) to turn it.");
g = ui.group("What to show");
ctl.angles = K.toggle(g, { label: "Normals and angles for the selected ray", value: true, on: v => showAngles = v });
ctl.weak = K.toggle(g, { label: "Weak reflections", value: true, on: v => weak = v });
ctl.pulses = K.toggle(g, { label: "Show pulses of light", value: false, on: v => pulses = v });
const read = K.readout(g, [["i", "angle of incidence, i"], ["r", "angle of refraction, r"], ["n", "sin i ÷ sin r"], ["c", "critical angle"], ["R", "light reflected"], ["f", "rays meet"]]);
const NAMES = { block: "glass block", tank: "water tank", prism: "prism", semi: "semicircular block", drop: "drop", lens: "converging lens", dlens: "diverging lens", mirror: "mirror", cmirror: "curved mirror", fibre: "fibre" };
function syncPanel() {
  if (typeof selGroup === "undefined" || !sel) return; selGroup.querySelector("h3").textContent = "Selected: " + (sel.src ? "ray box" : NAMES[sel.kind]);
  ctl.type.el.style.display = ctl.col.el.style.display = sel.src ? "" : "none"; ctl.n.el.style.display = sel.src || sel.kind === "mirror" || sel.kind === "cmirror" ? "none" : ""; ctl.curve.el.style.display = !sel.src && ["lens", "dlens", "cmirror", "fibre"].includes(sel.kind) ? "" : "none";
  if (sel.src) { ctl.type.set(sel.type); ctl.col.set(sel.col); ctl.rot.set(Math.round(norm(sel.ang) / DEG * 2) / 2); ctl.size.set((sel.width || 6) / 6); } else { ctl.n.set(sel.n); ctl.rot.set(Math.round(norm(sel.rot) / DEG * 2) / 2); ctl.size.set(sel.size); ctl.curve.set(sel.curve); }
}
const norm = a => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const VIEW = 62, sc = () => cv.w / VIEW, X = x => cv.w / 2 + x * sc(), Y = y => cv.h / 2 - y * sc(), WX = px => (px - cv.w / 2) / sc(), WY = py => (cv.h / 2 - py) / sc();
let events = [], segsAll = [];
const firstEvent = () => events.find(e => !e.mirror) || null;
function retrace() {
  const P = prims(shapes); segsAll = []; events = []; const ms = mainSource();
  for (const s of sources) for (const r of raysOf(s)) { const mainRay = s === ms && r.main && r.wl === (COLS[s.col][Math.floor(COLS[s.col].length / 2)]); trace(P, Object.assign(r, { main: mainRay }), segsAll, mainRay ? events : null, { faint: weak ? 0.012 : 2 }); }
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, s = sc();
  c.fillStyle = "#05070d"; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(120,140,180,.08)"; c.lineWidth = 1; c.beginPath(); for (let x = -30; x <= 30; x += 2) { c.moveTo(X(x), 0); c.lineTo(X(x), h); } for (let y = -16; y <= 16; y += 2) { c.moveTo(0, Y(y)); c.lineTo(w, Y(y)); } c.stroke();
  // the glass
  for (const S of shapes) {
    const { L, A } = localOutline(S), mir = S.kind === "mirror" || S.kind === "cmirror"; c.save(); c.translate(X(S.x), Y(S.y)); c.rotate(-S.rot); c.scale(s, -s); c.beginPath();
    if (S.kind === "fibre") { const wd = 0.6, a = 14, b = 8, R = Math.max(S.curve, 1); c.moveTo(0, -wd); c.lineTo(a, -wd); c.arc(a, R, R + wd, -Math.PI / 2, 0); c.lineTo(a + R + wd, R + b); c.lineTo(a + R - wd, R + b); c.lineTo(a + R - wd, R); if (R - wd > 0.01) c.arc(a, R, R - wd, 0, -Math.PI / 2, true); c.lineTo(0, wd); c.closePath(); }
    else if (S.kind === "lens") { c.arc(A[0][0], A[0][1], A[0][2], A[0][3], A[0][4]); c.arc(A[1][0], A[1][1], A[1][2], A[1][3], A[1][4]); c.closePath(); }
    else if (S.kind === "dlens") { c.arc(A[0][0], 0, A[0][2], A[0][4], A[0][3], true); c.arc(A[1][0], 0, A[1][2], A[1][3], A[1][4]); c.closePath(); }
    else if (S.kind === "semi") { c.arc(0, 0, A[0][2], -Math.PI / 2, Math.PI / 2); c.closePath(); }
    else if (S.kind === "drop") c.arc(0, 0, A[0][2], 0, 6.3);
    else if (S.kind === "cmirror") c.arc(A[0][0], 0, A[0][2], A[0][3], A[0][4]);
    else { L.forEach((l, k) => { k ? c.lineTo(l[0], l[1]) : c.moveTo(l[0], l[1]); if (mir) c.lineTo(l[2], l[3]); }); if (!mir) c.closePath(); }
    c.restore();
    if (mir) { c.strokeStyle = "#dfe6f5"; c.lineWidth = 3; c.stroke(); } else { const t = K.clamp((S.n - 1) / 1.5, 0, 1); c.fillStyle = `rgba(${Math.round(120 + 60 * t)},${Math.round(190 - 20 * t)},255,${0.07 + 0.2 * t})`; c.fill(); c.strokeStyle = S === sel ? "#ffffff" : "rgba(170,205,255,.55)"; c.lineWidth = S === sel ? 1.8 : 1.1; c.stroke(); }
    if (S === sel) { const hx = X(S.x + Math.cos(S.rot) * handleR(S)), hy = Y(S.y + Math.sin(S.rot) * handleR(S)); c.strokeStyle = "#fff"; c.lineWidth = 1.2; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(X(S.x), Y(S.y)); c.lineTo(hx, hy); c.stroke(); c.setLineDash([]); c.fillStyle = "#ffd28a"; c.beginPath(); c.arc(hx, hy, 6, 0, 6.3); c.fill(); }
  }
  // the light: brightness adds where rays overlap
  c.globalCompositeOperation = "lighter"; c.lineCap = "round";
  for (const pass of [[5, 0.10], [1.6, 0.75]]) for (let wl = 0; wl < 7; wl++) {
    const col = WLC[wl]; for (const lvl of [1, 0.45, 0.15, 0.04]) { c.strokeStyle = `rgba(${col.join()},${Math.min(1, pass[1] * (lvl === 1 ? 1.3 : lvl === 0.45 ? 0.7 : lvl === 0.15 ? 0.3 : 0.12))})`; c.lineWidth = pass[0]; c.beginPath(); let any = false; for (const q of segsAll) { if (q[5] !== wl) continue; const I = q[4]; if (!(I <= lvl * 1.0001 && I > lvl * (lvl === 1 ? 0.45 : lvl === 0.45 ? 0.333 : lvl === 0.15 ? 0.267 : 0))) continue; c.moveTo(X(q[0]), Y(q[1])); c.lineTo(X(q[2]), Y(q[3])); any = true; } if (any) c.stroke(); }
  }
  if (pulses) { c.fillStyle = "#fff"; const gap = 2.4, off = (tClock * 9) % gap; for (const q of segsAll) { if (q[4] < 0.3) continue; const len = Math.hypot(q[2] - q[0], q[3] - q[1]), n = q[7]; for (let p = Math.ceil((q[6] - off) / gap) * gap + off; p < q[6] + n * Math.min(len, 80); p += gap) { const f = (p - q[6]) / n / len; c.beginPath(); c.arc(X(q[0] + (q[2] - q[0]) * f), Y(q[1] + (q[3] - q[1]) * f), 1.8, 0, 6.3); c.fill(); } } }
  c.globalCompositeOperation = "source-over";
  // normals and angles where the selected ray meets surfaces
  if (showAngles) for (const e of events.slice(0, 4)) {
    const ex = X(e.x), ey = Y(e.y), nl = 3.2 * s; c.strokeStyle = "rgba(255,255,255,.6)"; c.setLineDash([4, 4]); c.lineWidth = 1; c.beginPath(); c.moveTo(ex - e.nx * nl, ey + e.ny * nl); c.lineTo(ex + e.nx * nl, ey - e.ny * nl); c.stroke(); c.setLineDash([]);
    c.font = "600 11.5px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillStyle = "#ffe6a8"; c.fillText((e.mirror ? "" : "i = ") + (e.i / DEG).toFixed(1) + "°", ex + e.nx * nl * 1.25 + 14, ey - e.ny * nl * 1.25);
    if (e.r != null) { c.fillStyle = "#a8e6ff"; c.fillText("r = " + (e.r / DEG).toFixed(1) + "°", ex - e.nx * nl * 1.25 + 14, ey + e.ny * nl * 1.25 + 4); } else if (e.tir) { c.fillStyle = "#ff9d8a"; c.fillText("total internal reflection", ex - e.nx * nl * 1.3, ey + e.ny * nl * 1.3 + 4); }
  }
  // ray boxes
  for (const S of sources) { c.save(); c.translate(X(S.x), Y(S.y)); c.rotate(-S.ang); const bw = S.type === "beam" ? (S.width || 6) * s + 8 : 16; c.fillStyle = "#2a3246"; c.strokeStyle = S === sel ? "#fff" : "#7d8aa5"; c.lineWidth = S === sel ? 1.8 : 1; c.beginPath(); c.roundRect(-26, -bw / 2, 26, bw, 4); c.fill(); c.stroke(); c.fillStyle = S.col === "white" ? "#fff" : `rgb(${WLC[COLS[S.col][0]].join()})`; c.fillRect(-3, -bw / 2 + 3, 3, bw - 6); c.restore();
    if (S === sel) { const hx = X(S.x + Math.cos(S.ang) * 4), hy = Y(S.y + Math.sin(S.ang) * 4); c.fillStyle = "#ffd28a"; c.beginPath(); c.arc(hx, hy, 6, 0, 6.3); c.fill(); } }
  c.strokeStyle = c.fillStyle = "rgba(220,228,245,.7)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(16, h - 16); c.lineTo(16 + 5 * s, h - 16); c.stroke(); c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("5 cm", 16, h - 22);
}
const handleR = S => S.kind === "fibre" ? 5 : S.kind === "tank" ? 12.5 * S.size : S.kind === "mirror" || S.kind === "cmirror" ? 3 : 6.5 * (S.size || 1);
let grab = null;
K.pointer(cv.el, {
  down(p) {
    const x = WX(p.x), y = WY(p.y), near = (ax, ay, d) => Math.hypot(ax - x, ay - y) < d;
    if (sel) { const hr = sel.src ? 4 : handleR(sel), a = sel.src ? sel.ang : sel.rot; if (near(sel.x + Math.cos(a) * hr, sel.y + Math.sin(a) * hr, 12 / sc())) { grab = { o: sel, turn: true }; return; } }
    let best = null, bd = 1e9; for (const o of sources) { const d = Math.hypot(o.x - Math.cos(o.ang) * 1.5 - x, o.y - Math.sin(o.ang) * 1.5 - y); if (d < 2.5 && d < bd) { bd = d; best = o; } }
    if (!best) for (const o of shapes) { const cx = o.kind === "fibre" ? o.x + Math.cos(o.rot) * 7 : o.x, cy = o.kind === "fibre" ? o.y + Math.sin(o.rot) * 7 : o.y, d = Math.hypot(cx - x, cy - y); if (d < (o.kind === "tank" ? 9 : o.kind === "fibre" ? 7 : 5.5) * (o.size || 1) && d < bd) { bd = d; best = o; } }
    if (best) { sel = best; grab = { o: best, dx: best.x - x, dy: best.y - y }; syncPanel(); }
  },
  drag(p) { if (!grab) return; const x = WX(p.x), y = WY(p.y), o = grab.o; if (grab.turn) { const a = Math.atan2(y - o.y, x - o.x); if (o.src) o.ang = a; else o.rot = a; ctl.rot.set(Math.round(a / DEG * 2) / 2); } else { o.x = K.clamp(x + grab.dx, -30, 30); o.y = K.clamp(y + grab.dy, -15, 15); } },
  up() { grab = null; }
});
cv.el.addEventListener("wheel", e => { if (!sel) return; e.preventDefault(); const d = (e.deltaY > 0 ? -1 : 1) * (e.shiftKey ? 0.25 : 1) * DEG; if (sel.src) sel.ang = norm(sel.ang + d); else sel.rot = norm(sel.rot + d); ctl.rot.set(Math.round((sel.src ? sel.ang : sel.rot) / DEG * 2) / 2); }, { passive: false });

const chS = K.chart(ui.dock, { title: "Snell's law at the first surface", xLabel: "angle of incidence i (degrees)", yLabel: "angle of refraction r", xMin: 0, xMax: 90, yMin: 0, yMax: 92 });
const chR = K.chart(ui.dock, { title: "How much light is reflected there?", xLabel: "angle of incidence i (degrees)", yLabel: "% reflected", xMin: 0, xMax: 90, yMin: 0, yMax: 105 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { tClock += dt; }, () => {
  retrace(); draw(); if (frame++ % 5) return;
  const e = firstEvent();
  if (e && e.n1) {
    const key = e.n1.toFixed(3) + ">" + e.n2.toFixed(3); if (key !== lastKey) { pts = []; lastKey = key; } if (e.r != null && (!pts.length || Math.abs(pts[pts.length - 1][0] - e.i / DEG) > 0.4)) { pts.push([e.i / DEG, e.r / DEG]); if (pts.length > 300) pts.shift(); }
    const th = [], fr = [], crit = e.n1 > e.n2 ? Math.asin(e.n2 / e.n1) / DEG : null;
    for (let a = 0; a <= 90; a += 0.5) { const si = e.n1 / e.n2 * Math.sin(a * DEG); if (si < 1) { const ci = Math.cos(a * DEG), cr = Math.sqrt(1 - si * si), rs = (e.n1 * ci - e.n2 * cr) / (e.n1 * ci + e.n2 * cr), rp = (e.n1 * cr - e.n2 * ci) / (e.n1 * cr + e.n2 * ci); th.push([a, Math.asin(si) / DEG]); fr.push([a, 50 * (rs * rs + rp * rp)]); } else fr.push([a, 100]); }
    const vl = crit ? [{ x: crit, label: "critical angle " + crit.toFixed(1) + "°", color: "#ff9d8a" }] : [];
    chS.draw([{ pts: th, color: K.cssVar("--s1"), dash: [5, 4], label: `n₁ sin i = n₂ sin r  (${e.n1.toFixed(2)} → ${e.n2.toFixed(2)})` }, { pts, type: "dots", color: K.cssVar("--s0"), r: 2.2, alpha: .6, label: "your readings" }, { pts: e.r != null ? [[e.i / DEG, e.r / DEG]] : [], type: "dots", color: K.cssVar("--s2"), r: 5 }], { vlines: vl });
    chR.draw([{ pts: fr, color: K.cssVar("--s1"), label: "Fresnel's equations" }, { pts: [[e.i / DEG, 100 * e.R]], type: "dots", color: K.cssVar("--s2"), r: 5, label: "now" }], { vlines: vl });
    read.set("i", (e.i / DEG).toFixed(1) + "°"); read.set("r", e.r != null ? (e.r / DEG).toFixed(1) + "°" : "none (TIR)"); read.set("n", e.r != null && e.r > 0.01 ? (Math.sin(e.i) / Math.sin(e.r)).toFixed(3) : "–"); read.set("c", crit ? crit.toFixed(1) + "°" : "none this way"); read.set("R", (100 * e.R).toFixed(1) + "%");
  } else { chS.draw([], {}); chR.draw([], {}); for (const k of ["i", "r", "n", "c", "R"]) read.set(k, "–"); }
  // where do the selected source's rays meet after passing through a lens?
  const ms = mainSource(), lens = shapes.find(S => S.kind === "lens" || S.kind === "dlens"); let ftxt = "–";
  if (lens && ms && ms.type !== "ray") { const P = prims(shapes), fin = []; for (const r of raysOf(ms)) { if (r.wl !== COLS[ms.col][Math.floor(COLS[ms.col].length / 2)]) continue; const sg = []; trace(P, r, sg, null, { faint: 2 }); if (sg.length >= 3) fin.push(sg[sg.length - 1]); }
    if (fin.length >= 3) { const a = fin[1], b = fin[fin.length - 2], d1x = a[2] - a[0], d1y = a[3] - a[1], d2x = b[2] - b[0], d2y = b[3] - b[1], den = d1x * d2y - d1y * d2x; if (Math.abs(den) > 1e-6) { const t = ((b[0] - a[0]) * d2y - (b[1] - a[1]) * d2x) / den, px = a[0] + d1x * t, py = a[1] + d1y * t, dist = Math.hypot(px - lens.x, py - lens.y); ftxt = dist.toFixed(1) + " cm " + (t > 0 ? "beyond the lens" : "behind it (virtual)"); } else ftxt = "never (parallel)"; } }
  read.set("f", ftxt);
  ui.hud(e && e.n1 ? `<b style="font-size:14px">i = ${(e.i / DEG).toFixed(1)}°` + (e.r != null ? ` &nbsp; r = ${(e.r / DEG).toFixed(1)}°` : " &nbsp; total internal reflection") + `</b><br>${e.n1.toFixed(2)} → ${e.n2.toFixed(2)} · ${(100 * e.R).toFixed(0)}% reflected` + (ftxt !== "–" ? `<br>rays meet ${ftxt}` : "") : ftxt !== "–" ? `rays meet ${ftxt}` : "");
});
load("block");
ui.tip("Drag the ray box and the glass · drag a round handle to turn · every ray obeys Snell's law", 8000);
