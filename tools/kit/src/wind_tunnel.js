/* =====================================================================
   WIND TUNNEL
   A real (viscous) fluid simulation using the lattice Boltzmann method.
   The air is a grid of cells. Each cell holds nine numbers: how much
   fluid is heading in each of nine directions (staying put, 4 straight,
   4 diagonal). Every time step has two parts:
     1. COLLIDE  within each cell the nine streams relax towards the
                 balanced mix for that cell's density and velocity
                 (how fast they relax sets the viscosity)
     2. STREAM   every stream moves one cell in its own direction;
                 anything that hits a solid cell bounces straight back
   Averaged over many cells this reproduces the Navier–Stokes equations.
   The bounce-back also tells us the force on the body: every bounce
   hands it a little momentum. Add them all up: lift and drag.
   ===================================================================== */
const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1], EY = [0, 0, 1, 0, -1, 1, 1, -1, -1], OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6], WT = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];

class Tunnel {
  constructor(nx, ny) { this.nx = nx; this.ny = ny; const n = nx * ny; this.n = n; this.f = new Float32Array(9 * n); this.g = new Float32Array(9 * n); this.solid = new Uint8Array(n); this.rho = new Float32Array(n).fill(1); this.ux = new Float32Array(n); this.uy = new Float32Array(n); this.u0 = 0.1; this.nu = 0.02; this.t = 0; this.Fx = 0; this.Fy = 0; this.reset(); }
  eq(i, rho, ux, uy) { const eu = EX[i] * ux + EY[i] * uy; return WT[i] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * (ux * ux + uy * uy)); }
  reset(noise = 0, rand) { const { n, f } = this; for (let c = 0; c < n; c++) { const vy = noise ? (rand() - .5) * noise : 0; for (let i = 0; i < 9; i++) f[i * n + c] = this.eq(i, 1, this.u0, vy); this.ux[c] = this.u0; this.uy[c] = 0; this.rho[c] = 1; } this.t = 0; }
  step() {
    const { nx, ny, n, f, g, solid, rho, ux, uy } = this, om = 1 / (3 * this.nu + 0.5), u0 = this.u0;
    // 1. COLLIDE
    for (let c = 0; c < n; c++) {
      if (solid[c]) continue;
      const f0 = f[c], f1 = f[n + c], f2 = f[2 * n + c], f3 = f[3 * n + c], f4 = f[4 * n + c], f5 = f[5 * n + c], f6 = f[6 * n + c], f7 = f[7 * n + c], f8 = f[8 * n + c];
      const r = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8, vx = (f1 + f5 + f8 - f3 - f6 - f7) / r, vy = (f2 + f5 + f6 - f4 - f7 - f8) / r; rho[c] = r; ux[c] = vx; uy[c] = vy;
      const u2 = 1 - 1.5 * (vx * vx + vy * vy), a = r * om / 9, b = r * om / 36, k = 1 - om;
      f[c] = k * f0 + r * om * (4 / 9) * u2;
      f[n + c] = k * f1 + a * (u2 + 3 * vx + 4.5 * vx * vx); f[3 * n + c] = k * f3 + a * (u2 - 3 * vx + 4.5 * vx * vx);
      f[2 * n + c] = k * f2 + a * (u2 + 3 * vy + 4.5 * vy * vy); f[4 * n + c] = k * f4 + a * (u2 - 3 * vy + 4.5 * vy * vy);
      const p = vx + vy, q = vx - vy;
      f[5 * n + c] = k * f5 + b * (u2 + 3 * p + 4.5 * p * p); f[7 * n + c] = k * f7 + b * (u2 - 3 * p + 4.5 * p * p);
      f[8 * n + c] = k * f8 + b * (u2 + 3 * q + 4.5 * q * q); f[6 * n + c] = k * f6 + b * (u2 - 3 * q + 4.5 * q * q);
    }
    // 2. STREAM, with bounce-back off solid cells (each bounce pushes on the body)
    let Fx = 0, Fy = 0;
    for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
      const c = x + y * nx; if (solid[c]) continue;
      g[c] = f[c];
      for (let i = 1; i < 9; i++) { const s = c - EX[i] - EY[i] * nx; if (solid[s]) { const o = OPP[i], v = f[o * n + c]; g[i * n + c] = v; Fx += 2 * v * EX[o]; Fy += 2 * v * EY[o]; } else g[i * n + c] = f[i * n + s]; }
    }
    // tunnel edges: steady wind in at the left, top and bottom; fluid leaves freely at the right
    for (let i = 0; i < 9; i++) { const e = this.eq(i, 1, u0, 0), o = i * n; for (let x = 0; x < nx; x++) { g[o + x] = e; g[o + x + (ny - 1) * nx] = e; } for (let y = 0; y < ny; y++) { g[o + y * nx] = e; g[o + nx - 1 + y * nx] = g[o + nx - 2 + y * nx]; } }
    this.f = g; this.g = f; this.Fx = Fx; this.Fy = Fy; this.t++;
  }
  clear() { this.solid.fill(0); }
  // ---- shapes: each fills the "solid" map and returns the reference length used for the coefficients ----
  ellipse(cx, cy, a, b) { for (let y = 0; y < this.ny; y++) for (let x = 0; x < this.nx; x++) if (((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1) this.solid[x + y * this.nx] = 1; return 2 * b; }
  box(cx, cy, w, h) { for (let y = Math.round(cy - h / 2); y < cy + h / 2; y++) for (let x = Math.round(cx - w / 2); x < cx + w / 2; x++) this.solid[x + y * this.nx] = 1; return h; }
  // NACA 4-digit aerofoil: camber m (% chord) at 40% chord, thickness t (% chord), turned nose-up by alpha degrees about its quarter-chord
  aerofoil(cx, cy, chord, m, t, alpha) {
    const a = -alpha * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), p = 0.4; m /= 100; t /= 100;
    for (let y = 1; y < this.ny - 1; y++) for (let x = 1; x < this.nx - 1; x++) {
      const dx = x - cx, dy = y - cy, xs = (dx * ca - dy * sa) / chord + 0.25, ys = -(dx * sa + dy * ca) / chord;     // into the wing's own axes (ys up)
      if (xs < 0 || xs > 1) continue;
      const yc = xs < p ? m / (p * p) * (2 * p * xs - xs * xs) : m / ((1 - p) ** 2) * (1 - 2 * p + 2 * p * xs - xs * xs);
      const yt = 5 * t * (0.2969 * Math.sqrt(xs) - 0.126 * xs - 0.3516 * xs * xs + 0.2843 * xs ** 3 - 0.1036 * xs ** 4);
      if (Math.abs(ys - yc) <= Math.max(yt, 0.6 / chord)) this.solid[x + y * this.nx] = 1;
    }
    return chord;
  }
  coeffs(L) { const q = 0.5 * this.u0 * this.u0 * L; return { cd: this.Fx / q, cl: -this.Fy / q }; }   // screen y points down, so lift is -Fy
}
// Headless run on a smaller tunnel: build a shape, let the flow settle, then average the force coefficients
function measure(rand, o) {
  const T = new Tunnel(150, 60); T.u0 = o.u0 || 0.1; let L;
  if (o.shape === "aerofoil") L = T.aerofoil(42, 30, 34, o.camber == null ? 2 : o.camber, 12, o.alpha || 0); else if (o.shape === "ellipse") L = T.ellipse(40, 30, 6 * o.fine, 6); else L = T.ellipse(36, 30, 6, 6);
  T.nu = T.u0 * L / (o.re || 150); T.reset(0.02, rand);
  const steps = o.steps || 2600, from = steps - (o.avg || 1100) - rand.int(120); let cd = 0, cl = 0, k = 0, last = 0, cross = [];
  for (let s = 0; s < steps; s++) { T.step(); if (s >= from) { const c = T.coeffs(L); cd += c.cd; cl += c.cl; k++; if (last < 0 && c.cl >= 0) cross.push(s); last = c.cl; } }
  return { cd: cd / k, cl: cl / k, freq: cross.length > 2 ? (cross.length - 1) / (cross[cross.length - 1] - cross[0]) : 0, drag: cd / k * 0.5 * T.u0 * T.u0 * L };
}

// ---------------------------------------------------------------- page
const NX = 240, NY = 120, tun = new Tunnel(NX, NY);
let shape = "aerofoil", Lref = 60, view = "vort", speed = 5, smoke = true, parts = [], tool = "none", log = { cl: [], cd: [] }, avg = { cl: 0, cd: 0 }, pins = [], rand = K.rng(Date.now()), lastPt = null, emitT = 0; const S = {};
const ui = K.app({
  title: "Wind Tunnel", subject: "Physics", home: "../../index.html", blurb: "Real viscous flow, solved live. Put any shape in the wind and measure its lift and drag.",
  reset: () => build(true),
  missions: [
    { title: "Where does lift come from?", q: "A wing at 0°. Raise the <b>angle of attack</b> a few degrees at a time and watch the green lift arrow and the smoke. Which way is the air behind the wing deflected? Switch the view to Pressure.", hint: "The tilted wing turns the airflow downwards; by Newton's third law the air pushes the wing up. In the pressure view you can see the same thing another way: lower pressure above the wing, higher below. Both descriptions are correct: they are two views of one flow.", setup: () => { S.shape.set("aerofoil", true); S.alpha.set(0, true); S.view.set("speed", true); } },
    { title: "The price of lift", q: "Keep raising the angle: 10°, 15°, 20°, 25°, 30°. Use <b>📌 Record this point</b> at each angle to build the lift and drag curves. What happens to the flow over the top of the wing? At which angle is lift ÷ drag best?", hint: "Beyond about 12–15° the air can no longer follow the top surface: it separates and the wing starts shedding vortices, so the forces wobble. Drag climbs much faster than lift, so lift ÷ drag peaks at a modest angle and then falls. On a full-size aircraft wing the same separation makes the lift itself collapse suddenly: a stall. This small, slow wing (low Reynolds number) loses efficiency instead of dropping out of the sky, much as an insect's wing does.", setup: () => { S.shape.set("aerofoil", true); S.alpha.set(10, true); S.view.set("vort", true); pins = []; } },
    { title: "The singing wire", q: "A cylinder. Wait for the wake to settle into a pattern. What is the pattern, and what does the lift graph do? Double the wind speed: what happens to the frequency?", hint: "Vortices peel off alternately from top and bottom: a Kármán vortex street. Each one tugs the cylinder sideways, so the lift oscillates. The frequency is proportional to wind speed (and inversely to diameter), which is why wires hum in the wind, and why a steady wind destroyed the Tacoma Narrows bridge.", setup: () => { S.shape.set("cylinder", true); S.view.set("vort", true); S.u.set(0.1, true); } },
    { title: "Streamlining", q: "Compare the drag coefficient of the flat plate, the cylinder and the teardrop: all three are the same height. Record each one. Which matters more for drag: the front or the back?", hint: "The teardrop has several times less drag than the plate. Most of the drag of a blunt shape comes from the low-pressure wake behind it, so tapering the <i>back</i> to let the flow close up gently matters most. That is why fast cars, fish and cycling helmets taper at the rear.", setup: () => { S.shape.set("plate", true); S.view.set("press", true); pins = []; } },
    { title: "Syrup or air?", q: "Raise the viscosity until the Reynolds number is below about 30. What happens to the vortex street behind the cylinder? Lower it again.", hint: "At low Reynolds number viscosity damps every wobble and the flow is smooth and steady (laminar), like honey round a spoon. Above about 45 the wake becomes unstable and vortices shed. The Reynolds number Re = speed × size ÷ viscosity decides which regime you are in: a bacterium and a whale live in different worlds.", setup: () => { S.shape.set("cylinder", true); S.view.set("vort", true); S.nu.set(-1.1, true); } },
    { title: "Slipstreaming", q: "Blank tunnel. Use the <b>Draw</b> tool to draw two cyclists (two blobs), one behind the other. Drag is shown for everything in the tunnel together. Compare close together and far apart. Why do cyclists ride nose to tail?", hint: "The rider behind sits in the slow, low-pressure wake of the leader and meets much less oncoming air, so the total drag is far less than double. Racing cyclists save up to 30–40% of their effort by drafting; geese fly in a V for a related reason.", setup: () => { S.shape.set("blank", true); S.tool.set("draw", true); S.view.set("speed", true); } },
    { title: "Design a better wing", q: "At 6° angle of attack, change <b>camber</b> and <b>thickness</b>. Record each design. Which gives the best lift-to-drag ratio (shown in the measurements)? Why do gliders have long, thin wings?", hint: "A little camber raises lift at the same angle for little extra drag. Very thick wings add drag; very thin ones stall early. Lift-to-drag ratio is the figure of merit: it is the distance a glider travels forward for every metre it sinks.", setup: () => { S.shape.set("aerofoil", true); S.alpha.set(6, true); S.view.set("speed", true); pins = []; } },
  ],
  batch: [
    { title: "Lift curve", question: "How does lift depend on angle of attack, and how close is it to simple theory?", how: "A cambered wing (2% camber, 12% thick) at Reynolds number 150 in a small, coarse tunnel. Each run lets the flow settle and then averages the lift coefficient. Takes about a minute.", xLabel: "angle of attack (degrees)", yLabel: "lift coefficient", xs: [-4, 0, 4, 8, 12, 16, 22, 28], reps: 2,
      theory: a => 2 * Math.PI * (a + 2.1) * Math.PI / 180, theoryLabel: "thin-wing theory with no viscosity",
      run: (a, r) => measure(r, { shape: "aerofoil", alpha: a }).cl, note: "Each run starts from slightly different random swirls and averages over a different stretch of time, which matters once the wing is shedding vortices (at high angles). The measured lift rises with angle but falls further and further below the frictionless theory: at this low Reynolds number the boundary layer is thick and the flow separates from the top of the wing. Full-size wings at high Reynolds number follow the theory line closely up to about 15°, then stall abruptly." },
    { title: "Streamlining and drag", question: "How much does stretching a shape cut its drag?", how: "Ellipses of the same height (frontal area) but different length. Fineness = length ÷ height: 0.3 is a plate facing the wind, 1 is a cylinder, 4 is a slender teardrop-like shape. Re = 150.", xLabel: "fineness (length ÷ height)", yLabel: "drag coefficient", xs: [0.3, 0.6, 1, 1.5, 2, 3, 4], reps: 2, yMin: 0,
      run: (x, r) => measure(r, { shape: "ellipse", fine: x }).cd, note: "Blunt shapes shed vortices, so their drag fluctuates and the average depends on which stretch of time is measured. At this low Reynolds number skin friction is a large part of the drag, so very long shapes stop improving; at high Reynolds number the gains from streamlining are bigger still." },
    { title: "Vortex shedding frequency", question: "How does the frequency of the vortex street depend on wind speed?", how: "A cylinder 12 cells across at Re = 150. Frequency is found by counting oscillations of the lift force.", xLabel: "wind speed (cells per step)", yLabel: "shedding frequency (per 1000 steps)", xs: [0.05, 0.07, 0.09, 0.11, 0.13], reps: 2, fit: true, yMin: 0,
      run: (u, r) => { const m = measure(r, { shape: "cylinder", u0: u, steps: Math.round(420 / u), avg: Math.round(260 / u) }); return m.freq ? m.freq * 1000 : null; }, note: "A straight line through the origin means frequency ∝ speed: the Strouhal relationship f = St·v/D, with St ≈ 0.2 for a cylinder. The count is of whole oscillations in a fixed time, so it can be out by a fraction of a cycle." },
    { title: "Drag and speed", question: "If you double the speed, what happens to the drag force?", how: "A cylinder at fixed Reynolds number 150. x is the wind speed squared.", xLabel: "wind speed squared", yLabel: "drag force (model units)", xs: [0.0025, 0.0049, 0.0081, 0.0121, 0.0169], reps: 2, fit: true, yMin: 0,
      run: (u2, r) => { const u = Math.sqrt(u2); return measure(r, { shape: "cylinder", u0: u, steps: Math.round(300 / u), avg: Math.round(140 / u) }).drag; }, note: "A straight line through the origin means drag ∝ speed²: doubling your cycling speed takes four times the force, and eight times the power." },
  ],
  notes: `<h3>The method</h3><p>Lattice Boltzmann (D2Q9, single relaxation time) on a 240 × 120 grid. Each cell holds nine populations of fluid moving in nine directions. Collide, then stream; solid cells bounce fluid back, which gives a no-slip surface. The force on the body is the total momentum handed over by those bounces.</p>
  <h3>What you can measure</h3><ul><li><b>Lift coefficient</b> C<sub>L</sub> = lift ÷ (½ρv² × chord) and <b>drag coefficient</b> C<sub>D</sub>, defined the same way (using the body's height for blunt shapes, and the cylinder's size for drawn shapes).</li><li><b>Reynolds number</b> Re = speed × size ÷ viscosity.</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>Two dimensions: a slice through an infinitely long wing or cylinder. No wing tips, no 3-D turbulence.</li><li>Low Reynolds number (about 20 to 600). A real aircraft wing is at several million: its boundary layer is far thinner, its lift higher and its drag much lower. The patterns here are right; the numbers are those of an insect-sized wing in treacly air.</li><li>The tunnel is small for its model: the Batch run's tunnel is only 60 cells high round a wing of 34-cell chord, and the top and bottom walls hold the wind at a fixed speed. Squeezing the flow past the model like this (called blockage) makes the measured lift and drag coefficients larger than they would be in open air, especially at high angles of attack. Real wind tunnels are many times taller than the model, or correct for blockage.</li><li>The fluid is very slightly compressible (it is how the method works). Wind speed is kept well below the model's speed of sound.</li><li>The tunnel edges blow at the free-stream speed, so wakes that reach the top or bottom are straightened artificially. Vortices leaving at the right-hand end can reflect weakly.</li><li>Shapes are built from square cells, so curved surfaces are slightly stepped and thin trailing edges are at least one cell thick.</li><li>For accurate lift and pressure on full-size wings see the Aerofoil Flow simulation (panel method), which ignores viscosity instead.</li><li>The flow is worked out on the 240 × 120 grid by the ordinary processor (CPU), exactly as before, so the forces, readouts and Batch run are unchanged. The graphics card (WebGL) only draws it: it blends smoothly between cells, smooths the outline of the body on screen (in the model the body is still made of square cells), and draws the smoke as soft dots. Without WebGL the tunnel is drawn in 2D as before.</li></ul>`,
});
let g = ui.group("Shape in the tunnel");
S.shape = K.seg(g, { value: shape, options: [["aerofoil", "Wing"], ["cylinder", "Cylinder"], ["plate", "Flat plate"], ["tear", "Teardrop"], ["square", "Square"], ["blank", "Blank"]], on: v => { shape = v; build(true); } });
S.alpha = K.slider(g, { label: "Angle of attack", min: -10, max: 35, step: 1, value: 8, unit: "°", on: () => build(false) });
S.camber = K.slider(g, { label: "Wing camber", min: 0, max: 8, step: 0.5, value: 2, unit: "% of chord", on: () => build(false) });
S.thick = K.slider(g, { label: "Wing thickness", min: 6, max: 30, step: 1, value: 12, unit: "% of chord", on: () => build(false) });
S.tool = K.seg(g, { label: "Draw your own", value: "none", options: [["none", "Off"], ["draw", "✎ Draw solid"], ["erase", "⌫ Erase"]], on: v => { tool = v; if (v !== "none") ui.tip("Drag in the tunnel to " + (v === "draw" ? "add solid material" : "remove material"), 4000); } });
g = ui.group("The air");
S.u = K.slider(g, { label: "Wind speed", min: 0.03, max: 0.13, step: 0.005, value: 0.1, fmt: v => v.toFixed(3) + " cells per step", on: v => tun.u0 = v });
S.nu = K.slider(g, { label: "Viscosity", min: -2.1, max: -0.7, step: 0.05, value: -1.7, fmt: v => Math.pow(10, v).toFixed(3) + " · Re ≈ " + Math.round(tun.u0 * Lref / Math.pow(10, v)), on: v => tun.nu = Math.pow(10, v), tip: "Low viscosity (high Reynolds number) = thin, lively flow. High viscosity = syrup." });
g = ui.group("View");
S.view = K.seg(g, { value: view, options: [["vort", "Vorticity"], ["speed", "Speed"], ["press", "Pressure"]], on: v => view = v, tip: "Vorticity shows spin: red anticlockwise, blue clockwise." });
S.smoke = K.toggle(g, { label: "Smoke streams", value: true, on: v => { smoke = v; parts = []; } });
S.speed = K.slider(g, { label: "Simulation speed", min: 2, max: 12, step: 1, value: 5, fmt: v => v + " steps per frame", on: v => speed = v });
ui.headerSpeed(S.speed);   // playback speed lives in the header, beside Pause and Reset
g = ui.group("Force balance");
const read = K.readout(g, [["cl", "Lift coefficient"], ["cd", "Drag coefficient"], ["ld", "Lift ÷ drag"], ["re", "Reynolds number"]]);
const rp = K.row(g); K.btn(rp, "📌 Record this point", () => { pins.push({ a: S.alpha.value, cl: avg.cl, cd: avg.cd, shape }); }, "primary"); K.btn(rp, "Clear points", () => pins = []);
K.note(g, "Wait for the readings to settle (or to wobble steadily) before recording. Recorded points build the right-hand chart.");

function build(restart) {
  tun.clear(); const cy = NY / 2, a = S.alpha.value;
  if (shape === "aerofoil") Lref = tun.aerofoil(78, cy, 60, S.camber.value, S.thick.value, a);
  if (shape === "cylinder") Lref = tun.ellipse(60, cy, 10, 10);
  if (shape === "plate") Lref = tun.box(60, cy, 3, 20);
  if (shape === "square") Lref = tun.box(60, cy, 20, 20);
  if (shape === "tear") { tun.aerofoil(64, cy, 62, 0, 32, a); Lref = 20; }
  if (shape === "blank") Lref = 20;
  for (const k of ["alpha", "camber", "thick"]) S[k].el.style.opacity = shape === "aerofoil" || (k === "alpha" && shape === "tear") ? 1 : 0.35;
  if (restart) { tun.reset(0.06, rand); parts = []; log = { cl: [], cd: [] }; }
  S.nu.set(S.nu.value);
}
// ---- Drawing ----
const img = document.createElement("canvas"); img.width = NX; img.height = NY; const ictx = img.getContext("2d"), idata = ictx.createImageData(NX, NY), px = idata.data;
/* ---- The graphics card (WebGL) draws the flow ----
   The lattice Boltzmann model is still worked out on the CPU (Tunnel.step), exactly as before. Each frame the
   quantity being shown (spin, speed or pressure) is worked out for every cell as before and handed to the
   graphics card, which colours every SCREEN pixel: it blends smoothly between cells (bicubic interpolation),
   smooths the outline of the body, and draws the smoke as soft glowing dots. Without WebGL: the old 2D drawing. */
const gv = K.gl.create(ui.stage, { dprMax: 2, antialias: false, fallback: "No WebGL here: drawing the tunnel without the graphics card.", onLost: () => { wgl.on = false; } });
const wgl = { on: false };
const FLOW_FS = `precision highp float;
uniform sampler2D uT; uniform vec2 uN; uniform float uView; varying vec2 vUv;
${K.gl.BICUBIC}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uN - 0.5; vec4 q = bicubic(uT, uN, p); float v = q.r; vec3 c;   // r: the quantity shown, g: solid
  if (uView < 0.5) {        // spin (vorticity): blue one way, red the other (the same colours as the 2D drawing)
    float a = min(1.0, abs(v)), s = sqrt(a);
    c = v > 0.0 ? vec3(12.0 + 60.0 * s, 18.0 + 120.0 * s + 70.0 * a, 34.0 + 221.0 * s) : vec3(12.0 + 243.0 * s, 18.0 + 70.0 * s + 110.0 * a * a, 34.0 + 40.0 * a);
  } else if (uView < 1.5) { // speed
    c = 255.0 * vec3(clamp(v * 2.6 - 1.0, 0.0, 1.0), clamp(v < 0.55 ? v * 1.5 : 1.2 - (v - 0.55) * 1.4, 0.0, 1.0), clamp(v < 0.5 ? 0.25 + v * 1.5 : 1.0 - (v - 0.5) * 3.0, 0.0, 1.0));
  } else {                  // pressure: red above, blue below the pressure far away
    float a = min(1.0, abs(v));
    c = v > 0.0 ? vec3(30.0 + 225.0 * a, 34.0 + 120.0 * a * a, 48.0 - 20.0 * a) : vec3(30.0 - 10.0 * a, 34.0 + 150.0 * a, 48.0 + 207.0 * a);
  }
  c = mix(c, vec3(208.0, 214.0, 226.0), smoothstep(0.3, 0.7, q.g));   // the body, with a smooth edge
  gl_FragColor = vec4(c / 255.0, 1.0);
}`;
const SMOKE_VS = `attribute vec2 aPos; uniform vec2 uN; uniform float uSize; void main() { gl_Position = vec4(aPos.x / uN.x * 2.0 - 1.0, 1.0 - aPos.y / uN.y * 2.0, 0.0, 1.0); gl_PointSize = uSize; }`;
const SMOKE_FS = `precision mediump float; uniform vec4 uCol; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q); gl_FragColor = vec4(uCol.rgb, uCol.a * exp(-r2 * 2.5) * step(r2, 1.0)); }`;
if (gv.ok && K.gl.floatType(gv.gl).kind !== "byte") {
  try { wgl.prog = K.gl.program(gv.gl, K.gl.QUAD_VS, FLOW_FS); wgl.smoke = K.gl.program(gv.gl, SMOKE_VS, SMOKE_FS); wgl.pts = K.gl.points(gv.gl, { aPos: 2 }); wgl.quad = K.gl.quad(gv.gl); wgl.tex = K.gl.target(gv.gl, NX, NY, { float: true }); wgl.buf = new Float32Array(4 * NX * NY); wgl.pbuf = new Float32Array(0); wgl.on = true; }
  catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly: drawing the tunnel without it."); }
} else if (gv.ok) K.gl.notice(ui.stage, "This graphics card cannot store decimal numbers in textures: drawing the tunnel without it.");
window.__glInfo = () => ({ gpu: wgl.on, grid: NX + " × " + NY, model: "CPU", webgl: gv.ok ? (gv.gl2 ? 2 : 1) : 0 });
const cv = ui.canvas(); let vr = { s: 1, ox: 0, oy: 0 };
function paintGL(s, ox, oy) {
  const { ux, uy, rho, solid } = tun, u0 = tun.u0, B = wgl.buf, gl = gv.gl;
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {   // the same quantities as the 2D drawing below, before they are turned into colours
    const c = x + y * NX; let v;
    if (view === "vort") v = x > 2 && x < NX - 3 && y > 3 && y < NY - 4 ? (uy[c + 1] - uy[c - 1] - ux[c + NX] + ux[c - NX]) / u0 * 3 : 0;
    else if (view === "speed") v = Math.min(1.9, Math.hypot(ux[c], uy[c]) / u0) / 1.9;
    else v = (rho[c] - 1) / (u0 * u0) / 1.6;
    B[4 * c] = v; B[4 * c + 1] = solid[c];
  }
  // inside the body there is no flow to show; give each solid cell the average of the fluid next to it, so the
  // smooth blending at the edge does not pull in a dark line from the empty inside
  for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) {
    const c = x + y * NX; if (!solid[c]) continue; let t = 0, n = 0;
    for (const d of [1, -1, NX, -NX]) if (!solid[c + d]) { t += B[4 * (c + d)]; n++; }
    if (n) B[4 * c] = t / n;
  }
  wgl.tex.upload(B);
  K.gl.bindTarget(gl, null); gl.clearColor(0.02, 0.027, 0.05, 1); gl.clear(gl.COLOR_BUFFER_BIT); K.gl.viewportRect(gv, ox, oy, NX * s, NY * s);
  wgl.prog.set({ uT: wgl.tex, uN: [NX, NY], uView: view === "vort" ? 0 : view === "speed" ? 1 : 2 }); wgl.quad.draw(wgl.prog);
  if (smoke && parts.length) {
    if (wgl.pbuf.length < 2 * parts.length) wgl.pbuf = new Float32Array(4 * parts.length);
    parts.forEach((p, i) => { wgl.pbuf[2 * i] = p.x; wgl.pbuf[2 * i + 1] = p.y; });
    wgl.pts.set("aPos", wgl.pbuf.subarray(0, 2 * parts.length));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    wgl.smoke.set({ uN: [NX, NY], uSize: Math.max(2, 1.25 * s) * gv.dpr, uCol: view === "speed" ? [1, 1, 1, 0.75] : [0.92, 0.94, 1, 0.6] }); wgl.pts.draw(wgl.smoke, parts.length);
    gl.disable(gl.BLEND);
  }
}
function paint() {
  const { ux, uy, rho, solid } = tun, u0 = tun.u0;
  if (wgl.on) {
    const c = cv.ctx, s = Math.min(cv.w / NX, cv.h / NY), ox = (cv.w - NX * s) / 2, oy = (cv.h - NY * s) / 2; vr = { s, ox, oy };
    paintGL(s, ox, oy); c.clearRect(0, 0, cv.w, cv.h); overlay(c, s, ox, oy); return;
  }
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const c = x + y * NX, j = c * 4; let r, g2, b;
    if (solid[c]) { r = 208; g2 = 214; b = 226; }
    else if (view === "vort") { // curl of the velocity: how fast the fluid is spinning
      const w = x > 2 && x < NX - 3 && y > 3 && y < NY - 4 ? (uy[c + 1] - uy[c - 1] - ux[c + NX] + ux[c - NX]) / u0 * 3 : 0, a = Math.min(1, Math.abs(w)), s = Math.sqrt(a);
      if (w > 0) { r = 12 + 60 * s; g2 = 18 + 120 * s + 70 * a; b = 34 + 221 * s; } else { r = 12 + 243 * s; g2 = 18 + 70 * s + 110 * a * a; b = 34 + 40 * a; }
    } else if (view === "speed") { const v = Math.min(1.9, Math.hypot(ux[c], uy[c]) / u0) / 1.9; r = 255 * Math.min(1, Math.max(0, v * 2.6 - 1.0)); g2 = 255 * Math.min(1, Math.max(0, v < .55 ? v * 1.5 : 1.2 - (v - .55) * 1.4)); b = 255 * Math.max(0, Math.min(1, v < .5 ? .25 + v * 1.5 : 1 - (v - .5) * 3)); }
    else { const p = (rho[c] - 1) / (u0 * u0) / 1.6, a = Math.min(1, Math.abs(p)); if (p > 0) { r = 30 + 225 * a; g2 = 34 + 120 * a * a; b = 48 - 20 * a; } else { r = 30 - 10 * a; g2 = 34 + 150 * a; b = 48 + 207 * a; } }
    px[j] = r; px[j + 1] = g2; px[j + 2] = b; px[j + 3] = 255;
  }
  ictx.putImageData(idata, 0, 0);
  const c = cv.ctx, s = Math.min(cv.w / NX, cv.h / NY), ox = (cv.w - NX * s) / 2, oy = (cv.h - NY * s) / 2; vr = { s, ox, oy };
  c.fillStyle = "#05070d"; c.fillRect(0, 0, cv.w, cv.h); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(img, ox, oy, NX * s, NY * s);
  if (smoke) { c.fillStyle = view === "speed" ? "rgba(255,255,255,.75)" : "rgba(235,240,255,.6)"; for (const p of parts) c.fillRect(ox + p.x * s - 1, oy + p.y * s - 1, 2.2, 2.2); }
  overlay(c, s, ox, oy);
}
function overlay(c, s, ox, oy) {
  // force arrows from the centre of the body
  let sx = 0, sy = 0, k = 0; for (let i = 0; i < tun.n; i += 3) if (tun.solid[i]) { sx += i % NX; sy += i / NX | 0; k++; }
  if (k) { const bx = ox + (sx / k + .5) * s, by = oy + (sy / k + .5) * s, arrow = (dx, dy, col, txt) => { const len = Math.hypot(dx, dy); if (len < 4) return; c.strokeStyle = c.fillStyle = col; c.lineWidth = 3.5; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + dx, by + dy); c.stroke(); const a = Math.atan2(dy, dx); c.beginPath(); c.moveTo(bx + dx + 9 * Math.cos(a), by + dy + 9 * Math.sin(a)); c.lineTo(bx + dx + 7 * Math.cos(a + 2.4), by + dy + 7 * Math.sin(a + 2.4)); c.lineTo(bx + dx + 7 * Math.cos(a - 2.4), by + dy + 7 * Math.sin(a - 2.4)); c.fill(); c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(txt, bx + dx + 22 * Math.cos(a), by + dy + 22 * Math.sin(a) + 4); };
    arrow(0, -K.clamp(avg.cl * 70, -150, 150), "#7ee787", "lift"); arrow(K.clamp(avg.cd * 70, -150, 200), 0, "#ff7b9c", "drag"); }
  c.fillStyle = "#dfe8f7"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("wind ➜", ox + 10, oy + 18);
}
const toGrid = p => ({ x: (p.x - vr.ox) / vr.s, y: (p.y - vr.oy) / vr.s });
function dab(q) { const rad = tool === "draw" ? 2.5 : 5; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const x = Math.round(q.x + dx), y = Math.round(q.y + dy); if (dx * dx + dy * dy <= rad * rad && x > 3 && y > 3 && x < NX - 4 && y < NY - 4) { const c = x + y * NX; if (tool === "draw") tun.solid[c] = 1; else if (tun.solid[c]) { tun.solid[c] = 0; for (let i = 0; i < 9; i++) tun.f[i * tun.n + c] = tun.eq(i, 1, tun.u0 * .3, 0); } } } }
K.pointer(cv.el, { down(p) { if (tool === "none") return; lastPt = toGrid(p); dab(lastPt); }, drag(p) { if (!lastPt) return; const q = toGrid(p), n = Math.max(1, Math.ceil(Math.hypot(q.x - lastPt.x, q.y - lastPt.y))); for (let k = 1; k <= n; k++) dab({ x: lastPt.x + (q.x - lastPt.x) * k / n, y: lastPt.y + (q.y - lastPt.y) * k / n }); lastPt = q; }, up() { lastPt = null; } });
const chF = K.chart(ui.dock, { title: "Force coefficients against time", xLabel: "time (steps)", yLabel: "coefficient" });
const chP = K.chart(ui.dock, { title: "Your recorded points", xLabel: "angle of attack (degrees)", yLabel: "coefficient" });
let frame = 0;
ui.run(() => {
  for (let k = 0; k < speed; k++) {
    tun.step(); const co = tun.coeffs(Lref); if (!isFinite(co.cl) || Math.abs(co.cl) > 50) { tun.reset(0.01, rand); ui.tip("The flow became unstable (too fast or too thin) and was restarted. Try a little more viscosity.", 6000); break; }
    avg.cl += (co.cl - avg.cl) * 0.004; avg.cd += (co.cd - avg.cd) * 0.004;
    if (tun.t % 8 === 0) { log.cl.push([tun.t, co.cl]); log.cd.push([tun.t, co.cd]); if (log.cl.length > 500) { log.cl.shift(); log.cd.shift(); } }
    if (smoke) { // smoke particles are carried along at the local fluid velocity
      for (const p of parts) { const c = (p.x | 0) + (p.y | 0) * NX; p.x += tun.ux[c]; p.y += tun.uy[c]; }
      if (++emitT % 5 === 0) for (let y = 4; y < NY - 2; y += 5) parts.push({ x: 1.5, y: y + (emitT % 2 ? 0 : 2.5) });
    }
  }
  if (smoke) parts = parts.filter(p => p.x < NX - 2 && p.x > 1 && p.y > 1 && p.y < NY - 2 && !tun.solid[(p.x | 0) + (p.y | 0) * NX]);
}, () => {
  paint(); if (frame++ % 3) return;
  chF.draw([{ pts: log.cl, color: "#7ee787", label: "lift" }, { pts: log.cd, color: "#ff7b9c", label: "drag" }]);
  const wing = pins.filter(p => p.shape === "aerofoil" || p.shape === "tear"), other = pins.filter(p => !(p.shape === "aerofoil" || p.shape === "tear"));
  if (other.length && !wing.length) chP.draw([{ pts: other.map((p, i) => [i + 1, p.cd]), type: "bars", w: 0.6, color: "#ff7b9c", label: "drag coefficient" }], { title: "Your recorded shapes, in order: " + other.map(p => p.shape).join(", "), xLabel: "recording number", xMin: 0.3, xMax: Math.max(4, other.length) + .7 });
  else chP.draw([{ pts: wing.map(p => [p.a, p.cl]), type: "dots", color: "#7ee787", r: 4.5, label: "lift" }, { pts: wing.map(p => [p.a, p.cd]), type: "dots", color: "#ff7b9c", r: 4.5, label: "drag" }], { title: "Your recorded points", xLabel: "angle of attack (degrees)", xMin: -12, xMax: 36 });
  read.set("cl", avg.cl.toFixed(2)); read.set("cd", avg.cd.toFixed(2)); read.set("ld", Math.abs(avg.cd) > 0.02 ? (avg.cl / avg.cd).toFixed(1) : "–"); read.set("re", Math.round(tun.u0 * Lref / tun.nu));
});
tun.nu = Math.pow(10, -1.7); build(true);
ui.tip("Change the angle of attack and watch the lift arrow · try the other shapes", 7000);
