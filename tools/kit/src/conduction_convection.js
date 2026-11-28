/* =====================================================================
   CONDUCTION AND CONVECTION
   Two ways thermal energy moves through matter.
   CONDUCTION: particles vibrate and pass energy to their neighbours.
     Rate of flow  P = k A ΔT / L   (Fourier's law; k = thermal conductivity).
     Metals are best (free electrons); glass, wood, polystyrene and still
     air are poor conductors: INSULATORS.
   CONVECTION: a warm fluid expands, becomes less dense and RISES; cooler,
     denser fluid SINKS to take its place. The circulating loop is a
     convection current, and it carries energy much faster than conduction.
   This page has two views.
   1. A metal-rod experiment (wax holds a ball bearing at each pin; it drops
      when the wax melts) solved with the 1-D heat equation.
   2. A room in cross-section. Place a heater or an air conditioner anywhere
      and watch the air move. The air is a small fluid simulation: buoyancy
      (warm air is lighter) drives the flow, and a pressure projection keeps
      the air from piling up (incompressible). Switch off "air can move" to
      see conduction alone.
   ===================================================================== */

// ---------------- materials for the rod (SI units) ----------------
// k = thermal conductivity (W m⁻¹ K⁻¹); rc = density × specific heat capacity (J m⁻³ K⁻¹)
const MAT = {
  copper: { name: "Copper", k: 400, rc: 3.45e6, col: "#c8763a" },
  alum: { name: "Aluminium", k: 237, rc: 2.42e6, col: "#b8c0cc" },
  steel: { name: "Steel", k: 50, rc: 3.85e6, col: "#7f8794" },
  glass: { name: "Glass", k: 1.0, rc: 2.1e6, col: "#8fc4d6" },
  wood: { name: "Wood", k: 0.15, rc: 1.0e6, col: "#9a6b3c" },
  poly: { name: "Polystyrene", k: 0.033, rc: 0.04e6, col: "#e8e8e0" }
};
const MKEYS = Object.keys(MAT);
const ROD = { L: 0.25, r: 0.005, N: 100, hLoss: 10, pins: [0.05, 0.10, 0.15, 0.20], melt: 60, Ta: 20 };
const ROD_A = Math.PI * ROD.r * ROD.r;

// One run of the rod: heated end at Th, far end held at Tc, optional lagging.
// Implicit (backward-Euler) steps so that even copper is stable with dt = 0.5 s.
// Returns the final temperatures, the time each pin's wax melts, and the history at the 10 cm and 5 cm pins (columns 1 and 2).
function rodRun(mat, Th, Tc, lagged, tEnd, dt = 0.5) {
  const m = MAT[mat], N = ROD.N, dx = ROD.L / (N - 1), al = m.k / m.rc;
  const lam = lagged ? 0 : (2 * ROD.hLoss / ROD.r) / m.rc;   // side losses: 2h/r per volume, ÷ ρc
  const r = al * dt / (dx * dx), T = new Float64Array(N).fill(ROD.Ta);
  T[0] = Th; T[N - 1] = Tc;
  const pinI = ROD.pins.map(x => Math.round(x / dx)), drops = ROD.pins.map(() => NaN), hist = [];
  const cp = new Float64Array(N), dp = new Float64Array(N);
  let t = 0;
  while (t < tEnd - 1e-9) {
    // Thomas algorithm for  -r T[i-1] + (1 + 2r + lam dt) T[i] - r T[i+1] = T_old[i] + lam dt Ta
    const b = 1 + 2 * r + lam * dt;
    cp[0] = 0; dp[0] = Th;
    for (let i = 1; i < N - 1; i++) { const den = b + r * cp[i - 1]; cp[i] = -r / den; dp[i] = (T[i] + lam * dt * ROD.Ta + r * dp[i - 1]) / den; }
    T[N - 1] = Tc;
    for (let i = N - 2; i >= 1; i--) T[i] = dp[i] - cp[i] * T[i + 1];
    t += dt;
    pinI.forEach((p, i) => { if (isNaN(drops[i]) && T[p] >= ROD.melt) drops[i] = t; });
    if (Math.round(t / dt) % 2 === 0) hist.push([t, T[pinI[1]], T[pinI[0]]]);
  }
  const flux = i => -m.k * ROD_A * (T[i + 1] - T[i]) / dx;   // power along the rod, W
  return { T, drops, hist, flux, dx, mat: m, t };
}
// time at which the 10 cm pin passes a given melting temperature (history is every 1 s)
function dropAt(hist, melt, col = 1) { for (const q of hist) if (q[col] >= melt) return q[0]; return NaN; }
const rodCache = {};
function rodHist(mat) { return rodCache[mat] || (rodCache[mat] = rodRun(mat, 100, 20, false, 1200).hist); }

// ---------------- the room: a small fluid simulation ----------------
const ROOM = { W: 4.0, H: 2.5 };           // metres (a cross-section, 1 m deep)
const G = 9.8, TREF = 293;                  // gravity, reference temperature (K)
const DRAG = 0.15;                          // s⁻¹, stands in for friction with furniture and walls (weak, so a rising
                                            // plume keeps the momentum to turn and run along the ceiling as a jet)
const ALPHA_AIR = 2.2e-5, ALPHA_EDDY = 1e-3; // m² s⁻¹: conduction in still air; stirring by small eddies when air moves
const KWALL = 1 / 3000;                     // s⁻¹: heat leaking through the (well insulated) walls to the outside (τ = 50 min)
const XRATE = 0.05;                         // s⁻¹: how fast air touching a heater or cooler pulls toward its surface temperature
const HSIZE = [0.5, 0.2], CSIZE = [0.8, 0.15]; // heater and air conditioner sizes (m)
const WIN_H = 1.0;                          // window height (m)
const GLASS = 0.015;                         // s⁻¹: air touching a closed window pulls toward the outside temperature (glass conducts heat well)
const LIFE = 240;                           // s: smoke dots fade out and are replaced after this long (the air itself never loses them)

function makeRoom(nx, ny, rnd, T0 = 20) {
  // A staggered ("MAC") grid, the standard layout for fluid simulations:
  //   T  is stored at the centre of each cell            (nx × ny values)
  //   u  (sideways speed) on the left/right cell faces   ((nx + 1) × ny values)
  //   v  (upward speed)   on the bottom/top cell faces   (nx × (ny + 1) values)
  // So the air flowing into and out of every cell is known exactly, and the walls are
  // faces where the speed through them is zero.
  const N = nx * ny, NU = (nx + 1) * ny, NV = nx * (ny + 1), dx = ROOM.W / nx, dy = ROOM.H / ny;
  const R = { nx, ny, N, dx, dy, t: 0, T0, win: null, T: new Float64Array(N).fill(T0), u: new Float64Array(NU), v: new Float64Array(NV), p: new Float64Array(N), div: new Float64Array(N), T2: new Float64Array(N), u2: new Float64Array(NU), v2: new Float64Array(NV) };
  if (rnd) for (let k = 0; k < N; k++) R.T[k] += 0.05 * rnd.gauss();   // tiny random warm/cool patches break the symmetry, like real air
  // bilinear sample of a w × h field f at grid position (gx, gy)
  const samp = (f, w, h, gx, gy) => {
    gx = Math.min(Math.max(gx, 0), w - 1.000001); gy = Math.min(Math.max(gy, 0), h - 1.000001);
    const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = i + j * w;
    return (f[k] * (1 - fx) + f[k + 1] * fx) * (1 - fy) + (f[k + w] * (1 - fx) + f[k + w + 1] * fx) * fy;
  };
  // the same, with the position in metres
  const sT = (f, x, y) => samp(f, nx, ny, x / dx - 0.5, y / dy - 0.5);
  const sU = (f, x, y) => samp(f, nx + 1, ny, x / dx, y / dy - 0.5);
  const sV = (f, x, y) => samp(f, nx, ny + 1, x / dx - 0.5, y / dy);
  R.vel = (x, y) => [sU(R.u, x, y), sV(R.v, x, y)];                     // air velocity at any point (m/s)
  R.samp = (f, x, y) => sT(f, x, y);                                    // temperature-like field at any point
  // Exact pressure solver. The cosine patterns cos(πk(i + ½)/n) are the natural "modes" of a box with
  // closed walls, so the pressure equation is solved by splitting into those modes (a discrete cosine transform).
  const Cx = [], Cy = [], lx = new Float64Array(nx), ly = new Float64Array(ny);
  for (let k = 0; k < nx; k++) { Cx.push(Float64Array.from({ length: nx }, (_, i) => Math.cos(Math.PI * k * (i + 0.5) / nx))); lx[k] = (2 * Math.cos(Math.PI * k / nx) - 2) / (dx * dx); }
  for (let k = 0; k < ny; k++) { Cy.push(Float64Array.from({ length: ny }, (_, j) => Math.cos(Math.PI * k * (j + 0.5) / ny))); ly[k] = (2 * Math.cos(Math.PI * k / ny) - 2) / (dy * dy); }
  const A = new Float64Array(N), B = new Float64Array(N);
  function poisson(rhs, out) {        // solves  ∇²p = rhs  with no flow through the walls
    for (let j = 0; j < ny; j++) for (let k = 0; k < nx; k++) { let s = 0; const c = Cx[k], o = j * nx; for (let i = 0; i < nx; i++) s += c[i] * rhs[o + i]; A[k + o] = s; }
    for (let l = 0; l < ny; l++) for (let k = 0; k < nx; k++) { let s = 0; const c = Cy[l]; for (let j = 0; j < ny; j++) s += c[j] * A[k + j * nx]; B[k + l * nx] = s; }
    for (let l = 0; l < ny; l++) for (let k = 0; k < nx; k++) { const e = lx[k] + ly[l]; B[k + l * nx] = e ? B[k + l * nx] / e * (k ? 2 : 1) / nx * (l ? 2 : 1) / ny : 0; }
    for (let j = 0; j < ny; j++) for (let k = 0; k < nx; k++) { let s = 0; for (let l = 0; l < ny; l++) s += Cy[l][j] * B[k + l * nx]; A[k + j * nx] = s; }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0; const o = j * nx; for (let k = 0; k < nx; k++) s += Cx[k][i] * A[o + k]; out[o + i] = s; }
  }
  R.step = function (o, dt) {
    const { T, u, v } = R;
    // 1. heater and air conditioner: air in contact relaxes toward the surface temperature
    const patch = (cx, cy, sz, Ts) => {
      const i0 = Math.max(0, Math.floor((cx - sz[0] / 2) / dx)), i1 = Math.min(nx - 1, Math.floor((cx + sz[0] / 2) / dx));
      const j0 = Math.max(0, Math.floor((cy - sz[1] / 2) / dy)), j1 = Math.min(ny - 1, Math.floor((cy + sz[1] / 2) / dy));
      const a = Math.min(1, XRATE * dt);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) T[i + j * nx] += a * (Ts - T[i + j * nx]);
    };
    if (o.hOn) patch(o.hx, o.hy, HSIZE, o.hT);
    if (o.cOn) patch(o.cx, o.cy, CSIZE, o.cT);
    // 2. heat leaking out through the walls
    const kw = Math.min(1, KWALL * dt); for (let k = 0; k < N; k++) T[k] += kw * (o.Tout - T[k]);
    // 2b. the window. Shut: the cold glass cools the air touching it. Open: outside air swaps with room air
    R.win = null;
    const wj0 = o.win ? Math.max(0, Math.floor((o.wy - WIN_H / 2) / dy)) : 0, wj1 = o.win ? Math.min(ny - 1, Math.floor((o.wy + WIN_H / 2) / dy)) : -1;
    if (o.win) {
      const col = o.wSide === "L" ? 0 : nx - 1, into = o.wSide === "L" ? 1 : -1;   // `into` points from the wall into the room
      if (o.wOpen && o.air) R.win = { col, face: o.wSide === "L" ? 0 : nx, j0: wj0, j1: wj1, into };
      else { const a = Math.min(1, GLASS * (o.wOpen ? 3 : 1) * dt); for (let j = wj0; j <= wj1; j++) for (let m = 0; m < 3; m++) { const k = col + into * m + j * nx; T[k] += a * (o.Tout - T[k]); } }
    }
    let Tm = 0; for (let k = 0; k < N; k++) Tm += T[k]; Tm /= N;
    if (o.air) {
      // 3. buoyancy: air warmer than the room average accelerates upward, cooler air downward.
      //    (Only differences matter: a uniform push is cancelled by the pressure of the floor and ceiling.)
      const dec = Math.exp(-DRAG * dt);
      for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) { const k = i + j * nx, Tf = 0.5 * (T[k] + T[k - nx]); v[k] = (v[k] + G * (Tf - Tm) / TREF * dt) * dec; }
      for (let k = 0; k < NU; k++) u[k] *= dec;
      // 4. carry the velocity and the temperature along with the flow (semi-Lagrangian: look back
      //    along the flow to see where this bit of air came from, and copy what was there)
      const { u2, v2, T2 } = R;
      for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) { const x = i * dx, y = (j + 0.5) * dy, k = i + j * (nx + 1), uu = u[k], vv = sV(v, x, y); u2[k] = sU(u, x - uu * dt, y - vv * dt); }
      for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) { const x = (i + 0.5) * dx, y = j * dy, k = i + j * nx, uu = sU(u, x, y), vv = v[k]; v2[k] = sV(v, x - uu * dt, y - vv * dt); }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = (i + 0.5) * dx, y = (j + 0.5) * dy, k = i + j * nx, uu = sU(u, x, y), vv = sV(v, x, y); T2[k] = sT(T, x - uu * dt, y - vv * dt); }
      u.set(u2); v.set(v2); T.set(T2);
      // 4b. open window: denser (cooler) air flows in low down, lighter (warmer) air flows out high up
      //     (or the other way round if it is warmer outside). The speed grows with sqrt(g ΔT/T × height).
      if (R.win) {
        const { col, face, j0, j1, into } = R.win, dT = Tm - o.Tout, sgn = dT >= 0 ? 1 : -1, vmax = 1.0 * Math.sqrt(G * Math.abs(dT) / TREF * WIN_H);
        let sum = 0, n = 0;
        for (let j = j0; j <= j1; j++) { const yr = (j + 0.5) * dy - o.wy, inflow = yr * sgn < 0, k = face + j * (nx + 1); u[k] = (inflow ? into : -into) * vmax * Math.min(1, Math.abs(yr) / 0.2); sum += u[k]; n++; }
        for (let j = j0; j <= j1; j++) { const k = face + j * (nx + 1); u[k] -= sum / n; if (u[k] * into > 0) T[col + j * nx] = o.Tout; }   // as much air out as in; incoming air is outside air
      }
      // 5. pressure projection: remove any squashing or stretching so the air only circulates
      R.project();
    }
    // 6. conduction through the air (and stirring by small eddies if it is moving)
    const al = o.air ? ALPHA_EDDY : ALPHA_AIR, fx = al * dt / (dx * dx), fy = al * dt / (dy * dy), T2 = R.T2;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = i + j * nx, c = T[k], l = i > 0 ? T[k - 1] : c, r = i < nx - 1 ? T[k + 1] : c, d = j > 0 ? T[k - nx] : c, up = j < ny - 1 ? T[k + nx] : c;
      T2[k] = c + fx * (l + r - 2 * c) + fy * (d + up - 2 * c);
    }
    T.set(T2);
    R.t += dt;
  };
  R.project = function () {
    const { u, v, p, div } = R, W = R.win;
    // walls, floor and ceiling: no air passes through them, except through an open window
    for (let j = 0; j < ny; j++) { const open = W && j >= W.j0 && j <= W.j1; if (!(open && W.face === 0)) u[j * (nx + 1)] = 0; if (!(open && W.face === nx)) u[nx + j * (nx + 1)] = 0; }
    for (let i = 0; i < nx; i++) { v[i] = 0; v[i + ny * nx] = 0; }
    // net air flowing out of each cell
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = i + j * nx, ku = i + j * (nx + 1); div[k] = (u[ku + 1] - u[ku]) / dx + (v[k + nx] - v[k]) / dy; }
    // find the pressure whose push cancels it exactly, then apply that push
    poisson(div, p);
    for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) u[i + j * (nx + 1)] -= (p[i + j * nx] - p[i - 1 + j * nx]) / dx;
    for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) { const k = i + j * nx; v[k] -= (p[k] - p[k - nx]) / dy; }
  };
  // speed of the air at the centre of cell k (for readings)
  R.speedAt = k => { const i = k % nx, j = (k / nx) | 0, ku = i + j * (nx + 1); return Math.hypot(0.5 * (R.u[ku] + R.u[ku + 1]), 0.5 * (R.v[k] + R.v[k + nx])); };
  // layer averages used by readings and the batch experiments
  R.rowMean = j => { let s = 0; for (let i = 0; i < nx; i++) s += R.T[i + j * nx]; return s / nx; };
  R.meanBand = (y0, y1) => { let s = 0, n = 0; for (let j = 0; j < ny; j++) { const y = (j + 0.5) * dy; if (y >= y0 && y <= y1) { s += R.rowMean(j); n++; } } return n ? s / n : 20; };
  R.at = (x, y) => sT(R.T, x, y);
  return R;
}
const RD = 0.25;     // fixed time step (s) for the headless runs
// Headless room run for the batch experiments (coarse 32 × 20 grid, no drawing)
function roomRun(o, seconds, rnd) {
  const R = makeRoom(32, 20, rnd);
  for (let t = 0; t < seconds; t += RD) R.step(o, RD);
  return R;
}
const BASE = { hOn: false, hx: 0.8, hy: 0.15, hT: 50, cOn: false, cx: 3.0, cy: 2.35, cT: 8, air: true, Tout: 20 };

// ---------------- The page ----------------
const DEF = { view: "room", T0: 20, Tout: 20, win: false, wOpen: false, wSide: "R", wy: 1.3, hOn: true, hx: 0.8, hy: 0.15, hT: 50, cOn: false, cx: 3.0, cy: 2.35, cT: 8, air: true, smoke: true, dots: 700, crange: "30", tool: "heat", mat: "copper", Th: 100, Tc: 20, lagged: false, speed: 5 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 11);
let room = null, acc = 0, hist = [], smoke = [], rod = null, rodT = 0, rodDrops = [], rodHistLive = [];
const ui = K.app({
  title: "Conduction and Convection", subject: "Physics",
  blurb: "Heat a metal rod and watch the wax drop; then put a heater on the floor or an air conditioner on the ceiling of a room and watch convection currents form",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 4(b): conduction, convection and radiation; conduction in metals (free electrons) and in insulators; convection currents in fluids (density change); reducing unwanted energy transfer by insulation; the lagging and conduction practicals.", adv: "WJEC Eduqas thermal physics: conduction and thermal conductivity, rate of energy transfer P = kAΔT/L (Fourier's law); convection as bulk fluid motion driven by density differences. Beyond the spec: thermal diffusivity and why metals warm along their length quickly." } },
  missions: [
    { title: "A heater on the floor", q: "Switch on the heater on the floor of the cold room and watch with the smoke on. Describe the path the air takes. Where does the warm air end up?", hint: "Air touching the heater warms, expands and becomes less dense, so it rises in a plume to the ceiling, spreads along it, cools, and sinks down the far wall. That loop is a convection current. A hot ceiling layer builds up over a cooler floor layer.", setup() { set({ view: "room", hOn: true, hx: 0.8, hy: 0.15, cOn: false, air: true }); } },
    { title: "A heater on the ceiling", q: "Now drag the heater up to the ceiling. Does the room warm up as well as it did with the heater on the floor? Compare the temperature at the floor.", hint: "No. Warm air is less dense so it stays at the top: nothing makes it sink. The ceiling gets hot and the floor stays cold. This is why radiators are low down, and why a heater on the ceiling feels cold at your feet.", setup() { set({ view: "room", hOn: true, hx: 0.8, hy: 2.35, cOn: false, air: true }); } },
    { title: "An air conditioner on the ceiling", q: "Turn the heater off and place the air conditioner at the ceiling. What does the cold air do? Is the whole room cooled?", hint: "Cold air is denser, so it sinks in a stream and spreads across the floor, pushing the warmer air up. The whole room mixes and cools. A cooler at the ceiling works with convection; put it on the floor and the cold air just sits there.", setup() { set({ view: "room", hOn: false, cOn: true, cx: 3.0, cy: 2.35, air: true }); } },
    { title: "Air conditioner on the floor", q: "Move the air conditioner down to the floor. What happens to the air near the ceiling?", hint: "The cold air pools at the bottom and does not move: there is no convection current. Only the air by the floor cools. Cold sinks, so cooling belongs at the top and heating at the bottom.", setup() { set({ view: "room", hOn: false, cOn: true, cx: 3.0, cy: 0.1, air: true }); } },
    { title: "Heater and cooler together", q: "Switch on both the heater (floor, left) and the air conditioner (ceiling, right). What does the circulation look like?", hint: "They work together: warm air rises on the left, cold air sinks on the right, so one big loop forms and the air moves faster than with either alone. Good design for air conditioning of a room.", setup() { set({ view: "room", hOn: true, hx: 0.8, hy: 0.15, cOn: true, cx: 3.2, cy: 2.35, air: true }); } },
    { title: "A cold window", q: "Switch the heater off, make it 0 °C outside, and add a window (closed). Watch the air next to the glass. What does it do, and where do you feel it?", hint: "Air touching the cold glass cools, becomes denser and sinks, so a cold downdraught flows down the window and spreads across the floor: that is why you feel cold feet near a window even when it is shut.", setup() { set({ view: "room", hOn: false, win: true, wOpen: false, Tout: 0, speed: 10 }); } },
    { title: "Open the window", q: "It is 0 °C outside and 20 °C inside. Open the window. Where does the cold air come in and where does the warm air go out?", hint: "Cold, dense air enters low down and sinks across the floor; warm, light air leaves high up. A single window makes a two-way convection exchange. You can click the window to open and close it.", setup() { set({ view: "room", hOn: false, win: true, wOpen: true, Tout: 0, speed: 10 }); } },
    { title: "A hot room", q: "Set the starting temperature to 30 °C (outside 30 °C too), switch the heater off and put the air conditioner on the ceiling. How does the room cool down?", hint: "The cold air sinks from the unit and pushes the warm air up, so the whole room cools by convection. The colours are relative to the starting temperature.", setup() { set({ view: "room", T0: 30, Tout: 30, hOn: false, cOn: true, cx: 3.0, cy: 2.35, speed: 10 }); } },
    { title: "Conduction alone", q: "Put the heater on the floor and turn OFF “air can move”. Run it fast. How far does the heat spread, compared with when the air can move?", hint: "Air is a very poor conductor, so with no convection the heat hardly leaves the heater: after ten minutes it has spread a few centimetres. Convection is far faster than conduction in a fluid.", setup() { set({ view: "room", hOn: true, hx: 0.8, hy: 0.15, cOn: false, air: false, speed: 30 }); } },
    { title: "Which rod conducts best?", q: "Heat the copper rod, then the steel and glass rods. Which wax melts first? Which rods never drop their balls?", hint: "Copper first (about 26 s for the 5 cm pin), then aluminium, then steel (several minutes). Glass, wood and polystyrene never melt the wax in 20 min. Metals conduct best because their free electrons carry energy along as well as the vibrating atoms.", setup() { set({ view: "rod", mat: "copper", speed: 10 }); } },
    { title: "Lag the rod", q: "Use the copper rod and tick “lagged”. Compare the temperature along the rod with and without lagging.", hint: "Without lagging, energy leaks from the sides so the rod is cooler away from the heat. With lagging, the temperature falls in a straight line from the hot end to the cold end (all the energy goes down the rod).", setup() { set({ view: "rod", mat: "copper", lagged: true, speed: 10 }); } },
    { lvl: "adv", title: "Fourier's law", q: "Lag the copper rod and wait for a steady state. Change the hot-end temperature. How does the heat flow P depend on ΔT? Check P = kAΔT/L.", hint: "P is proportional to ΔT. For copper (k = 400), A = 7.85 × 10⁻⁵ m², L = 0.25 m and ΔT = 80 K, P = 400 × 7.85 × 10⁻⁵ × 80 ÷ 0.25 ≈ 10 W.", setup() { set({ view: "rod", mat: "copper", lagged: true, Th: 100, speed: 30 }); } }
  ],
  batch: [
    { title: "How precise is one pin-drop time?", question: "300 students heat a copper rod and time when the 10 cm wax melts. How much do their times vary?", how: "Copper rod, hot end 100 °C, wax melting point 60 ± 2 °C (real wax is not exact), stopwatch ±1.5 s.", yLabel: "drop time (s)", reps: 300, bins: 20, theory: dropAt(rodHist("copper"), 60), theoryLabel: "model at 60 °C", run: (x, r) => dropAt(rodHist("copper"), 60 + 2 * r.gauss()) + 1.5 * r.gauss(), note: "The spread comes from the wax's melting point and the stopwatch. Time for one rod: report the mean of several, and the standard error says how well you know it." },
    { title: "Which material conducts best?", question: "How long does the wax at 5 cm take to melt for each material?", how: "Hot end 100 °C, far end 20 °C, side losses on. Stopwatch ±1.5 s. 0 copper · 1 aluminium · 2 steel · 3 glass · 4 wood · 5 polystyrene.", xLabel: "material (0 Cu · 1 Al · 2 steel · 3 glass · 4 wood · 5 polystyrene)", yLabel: "drop time (s); 1200 = still not melted after 20 min", xs: [0, 1, 2, 3, 4, 5], reps: 4, yMin: 0, theory: x => { const t = dropAt(rodHist(MKEYS[x]), 60, 2); return isNaN(t) ? 1200 : t; }, theoryLabel: "model", run: (x, r) => { const t = dropAt(rodHist(MKEYS[x]), 60, 2); return isNaN(t) ? 1200 : t + 1.5 * r.gauss(); }, note: "Copper first, then aluminium, then steel (much later). For glass, wood and polystyrene the wax never melts within the 20 minutes of the test, so they are plotted at the 1200 s limit: poor conductors (insulators). The real time for them would be far longer still." },
    { title: "Fourier's law: heat flow against temperature difference", question: "How does the steady heat flow along a lagged copper rod depend on the temperature difference between its ends?", how: "Copper, lagged, L = 0.25 m, r = 5 mm; steady state after 10 min; power meter ±3%.", xLabel: "temperature difference ΔT (K)", yLabel: "heat flow P (W)", xs: [20, 40, 60, 80, 120, 160], reps: 4, yMin: 0, theory: x => MAT.copper.k * ROD_A * x / ROD.L, theoryLabel: "P = kAΔT/L", run: (x, r) => { const q = rodRun("copper", 20 + x, 20, true, 600, 1); return q.flux(50) * (1 + 0.03 * r.gauss()); }, note: "A straight line through the origin: double ΔT, double the power. The slope is kA/L ≈ 0.126 W/K for this rod." },
    { title: "Heater height: does the room warm?", question: "Where should a heater sit? Warm-up of the lower half of the room (below 1.25 m) after 8 minutes, for a heater at different heights.", how: "Heater 50 °C at x = 0.8 m, outside 20 °C, air free to move; thermometer ±0.1 °C; the air starts with tiny random temperature differences.", xLabel: "heater height above the floor (m)", yLabel: "warming of the lower half (°C)", xs: [0.15, 0.6, 1.2, 1.8, 2.35], reps: 4, yMin: 0, theory: x => roomRun(Object.assign({}, BASE, { hOn: true, hy: x }), 480, null).meanBand(0, 1.25) - 20, theoryLabel: "noise-free run", run: (x, r) => roomRun(Object.assign({}, BASE, { hOn: true, hy: x }), 480, r).meanBand(0, 1.25) - 20 + 0.1 * r.gauss(), note: "A heater on the floor warms the lower half most; above head height it does very little, and at the ceiling almost nothing. Warm air rises, so a floor heater stirs the whole room, while a high heater only warms the air above it and leaves the cold air at the bottom undisturbed. (A heater at 1.2 m sits inside the lower half, so it warms that band directly.) The model grid is coarse (32 × 20) so numbers are indicative." },
    { title: "Air conditioner height: does it cool?", question: "Where should an air conditioner sit? Cooling of the whole room (average) after 8 minutes, for the cooler at different heights.", how: "Start with the room at 28 °C and outside 28 °C; cooler surface 8 °C at x = 3.0 m; thermometer ±0.1 °C.", xLabel: "cooler height above the floor (m)", yLabel: "cooling of the whole room (°C)", xs: [0.1, 0.6, 1.2, 1.8, 2.35], reps: 4, yMin: 0, theory: x => 28 - acRun(x, null), theoryLabel: "noise-free run", run: (x, r) => 28 - acRun(x, r) + 0.1 * r.gauss(), note: "A cooler near the ceiling lets cold air sink through the whole room, so the whole room cools. Near the floor the cold air collects at the bottom and the rest of the room is barely cooled." },
    { title: "Convection or conduction only?", question: "Temperature at head height (1.2 m) on the far side of the room (x = 3 m) after 10 minutes, with the air able to move (1) or not (0).", how: "Heater 50 °C on the floor at x = 0.8 m; thermometer ±0.1 °C.", xLabel: "air can move? (0 no · 1 yes)", yLabel: "temperature rise at 1.2 m, x = 3 m (°C)", xs: [0, 1], reps: 6, yMin: 0, theory: x => roomRun(Object.assign({}, BASE, { hOn: true, air: !!x }), 600, null).at(3, 1.2) - 20, theoryLabel: "noise-free run", run: (x, r) => roomRun(Object.assign({}, BASE, { hOn: true, air: !!x }), 600, r).at(3, 1.2) - 20 + 0.1 * r.gauss(), note: "With convection the warm air circulates to the far side of the room and the temperature rises. With conduction alone nothing reaches it (air is a very poor conductor): convection is the key way heat moves in air." },
    { title: "Open the window: how fast does the room cool?", question: "It is 0 °C outside and 20 °C inside. How much does the room cool in 8 minutes with the window shut (0) or open (1)?", how: "No heater; window on the right wall, 1 m tall, centred 1.3 m up; air free to move; thermometer ±0.1 °C.", xLabel: "window (0 shut · 1 open)", yLabel: "average cooling of the room (°C)", xs: [0, 1], reps: 6, yMin: 0, theory: x => 20 - roomRun(Object.assign({}, BASE, { win: true, wOpen: !!x, wSide: "R", wy: 1.3, Tout: 0 }), 480, null).meanBand(0, ROOM.H), theoryLabel: "noise-free run", run: (x, r) => 20 - roomRun(Object.assign({}, BASE, { win: true, wOpen: !!x, wSide: "R", wy: 1.3, Tout: 0 }), 480, r).meanBand(0, ROOM.H) + 0.1 * r.gauss(), note: "Shut, the room loses energy slowly through the walls and the cold glass. Open, cold outside air pours in low down and warm air leaves at the top, so the room cools several times faster and is close to the outside temperature within 8 minutes: a window lets convection carry the energy out." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 4(b)", text: "Conduction: particles vibrate and pass energy to their neighbours. Metals conduct best because free electrons also carry energy. Insulators (glass, wood, polystyrene, still air) have no free electrons." },
      { lvl: "std", tag: "4PH1 4(b)", text: "Convection happens in fluids (liquids and gases). A warmed region expands, becomes less dense and rises; cooler, denser fluid sinks to replace it. This circulation is a convection current." },
      { lvl: "std", tag: "4PH1 4(b)", text: "Heaters go low in a room (warm air rises); coolers go high (cold air sinks). Put them the other way round and no convection current forms." },
      { lvl: "std", tag: "4PH1 4(b)", text: "Insulation works by trapping still air in small pockets: air is a poor conductor and cannot circulate, so conduction and convection are both stopped." },
      { lvl: "adv", tag: "Thermal physics", text: "Rate of energy transfer by conduction P = kAΔT/L: proportional to area and temperature difference, inversely proportional to length." },
      { lvl: "adv", tag: "Beyond the spec", text: "Thermal diffusivity α = k/ρc sets how fast a temperature change spreads: the time to reach distance L is about L²/α, so doubling the length quadruples the time." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a radiator is placed near the floor and heats the whole room.", ans: "<ul><li>air next to the radiator is warmed and expands</li><li>so it becomes less dense and rises</li><li>cooler, denser air sinks to take its place, so a convection current circulates and warms the room</li></ul>" },
      { lvl: "std", marks: 2, q: "Why does a metal spoon in hot soup get hot at the handle, but a wooden spoon does not?", ans: "<ul><li>metals have free electrons which carry energy quickly along the spoon (conduction)</li><li>wood has no free electrons, so it is a poor conductor</li></ul>" },
      { lvl: "std", marks: 2, q: "Why should an air conditioner be fitted high on a wall?", ans: "<ul><li>cold air is denser so it sinks</li><li>the cold air falls through the room and sets up a convection current that cools all the air</li></ul>" },
      { lvl: "adv", marks: 3, q: "A lagged copper rod is 0.25 m long with cross-section 7.9 × 10⁻⁵ m². One end is at 100 °C and the other at 20 °C. Find the power transferred. (k = 400 W m⁻¹ K⁻¹)", ans: "<ul><li>P = kAΔT/L</li><li>= 400 × 7.9 × 10⁻⁵ × 80 ÷ 0.25</li><li>≈ 10 W</li></ul>" },
      { lvl: "adv", marks: 3, q: "Why does the energy flow along the lagged rod give a straight-line temperature graph, but not for an unlagged one?", ans: "<ul><li>lagged: the same power must pass every cross-section, so the temperature gradient is constant</li><li>unlagged: some power escapes from the sides, so less passes along and the gradient gets smaller further from the heat (a curve)</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li><b>The rod</b>: the one-dimensional heat equation, ρc ∂T/∂t = k ∂²T/∂x² − (2h/r)(T − T_air), solved with backward-Euler steps of 0.5 s on 100 points. Length 25 cm, radius 5 mm, h = 10 W m⁻² K⁻¹ for side losses (none when lagged). Wax at each pin melts at 60 °C. Values of k and ρc (W m⁻¹ K⁻¹ and J m⁻³ K⁻¹): copper 400 and 3.45 × 10⁶, aluminium 237 and 2.42 × 10⁶, steel 50 and 3.85 × 10⁶, glass 1.0 and 2.1 × 10⁶, wood 0.15 and 1.0 × 10⁶, polystyrene 0.033 and 0.04 × 10⁶.</li>
<li><b>The room</b>: a cross-section 4 m × 2.5 m (1 m deep), 64 × 40 grid. Temperatures are stored at the centre of each cell and air speeds on the cell faces (a "staggered" grid), so the air flowing in and out of every cell is known exactly. Each step: (1) air touching the heater or air conditioner relaxes toward its surface temperature; (2) the walls leak heat to outside (time constant 50 min); (3) buoyancy: a = g(T − T_mean)/293 K; (4) the temperature and the velocity are carried by the flow; (5) a pressure projection keeps the air incompressible: the pressure is solved exactly every step, so no air is created or destroyed anywhere and it can only circulate; (6) conduction through the air.</li>
<li>Heater 0.5 m × 0.2 m, air conditioner 0.8 m × 0.15 m. The smoke is just tracer dots moving with the air (you choose how many). Because the air cannot be squashed, the dots stay evenly spread through the room while they circulate, as real smoke particles would. They cannot pass through the walls, floor or ceiling, and are replaced by new dots after 4 minutes (they fade out and in).</li>
<li><b>Window</b> (1 m tall, in the left or right wall): when shut, air touching the glass relaxes toward the outside temperature (rate 0.015 s⁻¹ over the 20 cm next to the glass), so cold glass makes a downdraught; when open, air is pushed through at a speed 1.0 √(g ΔT/T × height), cooler air in low down and warmer air out up high (or the reverse if it is warmer outside), with equal amounts in and out, and the incoming air is at the outside temperature. The room starts at the starting temperature you choose; colours show the difference from it.</li></ul>
<h3>Left out or simplified</h3>
<ul><li>The room is two-dimensional, so the flow does not go sideways. Real room air is turbulent: here a weak drag term (0.15 s⁻¹) and an extra "stirring" diffusivity (1 × 10⁻³ m² s⁻¹) stand in for friction and small eddies. The drag is kept weak so that a rising plume keeps its momentum when it hits the ceiling and spreads along it as a fast "ceiling jet", as it does in a real room. The speeds are about right but not exact.</li>
<li>When "air can move" is off, only conduction through air (α = 2.2 × 10⁻⁵ m² s⁻¹) is used, so the heat barely leaves the heater.</li>
<li>No radiation, no walls with thermal mass, no wind or sunshine through the window, no moisture. The heater and cooler are fixed-temperature surfaces, not thermostat-controlled.</li>
<li>Batch runs of the room use a coarser 32 × 20 grid so they finish quickly; the numbers are indicative, not exact.</li></ul>`
});

// batch helper: cooling a room that starts at 28 °C
function acRun(y, r) {
  const R = makeRoom(32, 20, r); R.T.fill(28); if (r) for (let k = 0; k < R.N; k++) R.T[k] += 0.05 * r.gauss();
  const o = Object.assign({}, BASE, { cOn: true, cy: y, cx: 3.0, Tout: 28 });
  for (let t = 0; t < 480; t += RD) R.step(o, RD);
  return R.meanBand(0, ROOM.H);
}

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "room", options: [["room", "🌬 convection: a room"], ["rod", "🔥 conduction: a rod"]], on: v => { P.view = v; showGroups(); if (v === "rod") restartRod(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 60, step: 1, value: 5, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);
grp.room = g = ui.group("Heater (heat source)");
ctl.hOn = K.toggle(g, { label: "Heater on", value: true, on: v => P.hOn = v });
ctl.hT = K.slider(g, { label: "Heater surface", min: 30, max: 80, step: 1, value: 50, unit: "°C", on: v => P.hT = v });
let rr = K.row(g); K.btn(rr, "⬇ on the floor", () => { set({ hOn: true, hx: P.hx, hy: 0.15 }, true); }); K.btn(rr, "⬆ on the ceiling", () => { set({ hOn: true, hx: P.hx, hy: ROOM.H - 0.15 }, true); });
grp.room2 = g = ui.group("Air conditioner (cooling source)");
ctl.cOn = K.toggle(g, { label: "Air conditioner on", value: false, on: v => P.cOn = v });
ctl.cT = K.slider(g, { label: "Cooler surface", min: 0, max: 18, step: 1, value: 8, unit: "°C", on: v => P.cT = v });
rr = K.row(g); K.btn(rr, "⬆ on the ceiling", () => { set({ cOn: true, cx: P.cx, cy: ROOM.H - 0.1 }, true); }); K.btn(rr, "⬇ on the floor", () => { set({ cOn: true, cx: P.cx, cy: 0.1 }, true); });
grp.room3 = g = ui.group("Air and drawing");
ctl.air = K.toggle(g, { label: "Air can move (convection)", value: true, on: v => P.air = v });
ctl.smoke = K.toggle(g, { label: "Show smoke (air movement)", value: true, on: v => P.smoke = v });
ctl.crange = K.seg(g, { label: "Colour range (from the starting temperature)", tip: "“fit to room” stretches the colours over the air in the room now, to show small differences", value: "30", options: [["10", "±10 °C"], ["20", "±20 °C"], ["30", "−15/+30 °C"], ["fit", "fit to room"]], on: v => P.crange = v });
ctl.dots = K.slider(g, { label: "Smoke dots (how many)", min: 100, max: 4000, step: 100, value: 700, on: v => { P.dots = v; setSmoke(v); } });
ctl.tool = K.seg(g, { value: "heat", options: [["heat", "click places: heater"], ["cool", "air conditioner"]], on: v => P.tool = v });
rr = K.row(g); K.btn(rr, "↺ Fresh room", () => restartRoom(), "primary");
grp.room4 = g = ui.group("Room temperature and window");
ctl.T0 = K.slider(g, { label: "Starting room temperature", min: 5, max: 35, step: 1, value: 20, unit: "°C", on: v => { P.T0 = v; restartRoom(); } });
ctl.Tout = K.slider(g, { label: "Outside temperature", min: -10, max: 40, step: 1, value: 20, unit: "°C", on: v => P.Tout = v });
ctl.win = K.toggle(g, { label: "Window in the wall", value: false, on: v => P.win = v });
ctl.wOpen = K.seg(g, { value: "shut", options: [["shut", "shut"], ["open", "open"]], on: v => P.wOpen = v === "open" });
ctl.wSide = K.seg(g, { value: "R", options: [["L", "left wall"], ["R", "right wall"]], on: v => P.wSide = v });
ctl.wy = K.slider(g, { label: "Window height (centre)", min: 0.5, max: 2.0, step: 0.1, value: 1.3, unit: "m", on: v => P.wy = v });
grp.rod = g = ui.group("The rod");
ctl.mat = K.seg(g, { value: "copper", options: MKEYS.map(k => [k, MAT[k].name]), on: v => { P.mat = v; restartRod(); } });
ctl.Th = K.slider(g, { label: "Hot end", min: 60, max: 200, step: 5, value: 100, unit: "°C", on: v => { P.Th = v; restartRod(); } });
ctl.Tc = K.slider(g, { label: "Far end", min: 0, max: 40, step: 1, value: 20, unit: "°C", on: v => { P.Tc = v; restartRod(); } });
ctl.lagged = K.toggle(g, { label: "Lagged (insulated sides)", value: false, on: v => { P.lagged = v; restartRod(); } });
rr = K.row(g); K.btn(rr, "↺ Restart the experiment", () => restartRod(), "primary");
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { const room = P.view === "room"; for (const k in grp) grp[k].style.display = (k === "rod") === !room ? "" : "none"; }
function restartRoom() {
  room = makeRoom(64, 40, rnd, P.T0); acc = 0; hist = [[0, P.T0, P.T0, P.T0]];
  smoke = []; setSmoke(P.dots);
}
// add or remove smoke dots to match the chosen number (new dots appear at random places in the room)
function setSmoke(n) {
  while (smoke.length > n) smoke.splice(Math.floor(rnd() * smoke.length), 1);
  while (smoke.length < n) smoke.push({ x: 0.05 + rnd() * (ROOM.W - 0.1), y: 0.05 + rnd() * (ROOM.H - 0.1), a: rnd() * 8 });
}
function restartRod() {
  rod = { T: null, t: 0 }; rodT = 0; rodDrops = ROD.pins.map(() => NaN); rodHistLive = [];
  rod.T = new Float64Array(ROD.N).fill(ROD.Ta); rod.T[0] = P.Th; rod.T[ROD.N - 1] = P.Tc;
}
function set(o, keep) {
  Object.assign(P, keep ? o : Object.assign({}, DEF, o));
  ctl.T0.set(P.T0); ctl.Tout.set(P.Tout); ctl.win.set(P.win); ctl.wOpen.set(P.wOpen ? "open" : "shut"); ctl.wSide.set(P.wSide); ctl.wy.set(P.wy);
  ctl.hOn.set(P.hOn); ctl.hT.set(P.hT); ctl.cOn.set(P.cOn); ctl.cT.set(P.cT); ctl.air.set(P.air); ctl.smoke.set(P.smoke); ctl.dots.set(P.dots); ctl.crange.set(P.crange); ctl.tool.set(P.tool);
  ctl.mat.set(P.mat); ctl.Th.set(P.Th); ctl.Tc.set(P.Tc); ctl.lagged.set(P.lagged); ctl.view.set(P.view); ctl.speed.set(P.speed);
  showGroups();
  if (!keep) { restartRoom(); restartRod(); } else if (P.view === "room") { hist = [[room.t, room.meanBand(0, 0.2), room.meanBand(1.1, 1.4), room.meanBand(ROOM.H - 0.2, ROOM.H)]]; }
}

// ---------------- Simulation ----------------
const DT = 0.1;
function tick(dt) {
  const s = dt * P.speed;
  if (P.view === "room") {
    acc += s; let n = 0;
    while (acc >= DT && n < 25) { room.step(P, DT); acc -= DT; n++; }
    if (acc > 2) acc = 0;
    if (!hist.length || room.t - hist[hist.length - 1][0] >= 6) hist.push([room.t, room.meanBand(0, 0.2), room.meanBand(1.1, 1.4), room.meanBand(ROOM.H - 0.2, ROOM.H)]);
    if (hist.length > 400) hist.shift();
    // smoke: dots drift with the air. They cannot pass through the walls, floor or ceiling: they stop at a surface and
    // slide along it with the air. Only an open window lets them out (a new dot comes in through the window instead).
    setSmoke(P.dots);
    let vfast = 0.05; for (let k = 0; k < room.N; k++) vfast = Math.max(vfast, room.speedAt(k));
    const nsub = Math.min(40, Math.ceil(s * vfast / (0.4 * room.dx))), h = s / nsub;
    for (const q of smoke) {
      // midpoint (2nd-order) steps, each short enough to move under half a grid cell: one big straight
      // step would cut the corner of every swirl and fling the dots outward onto the walls
      let px = q.x, py = q.y; const jig = 0.012 * Math.sqrt(s);
      for (let m = 0; m < nsub; m++) {
        const a = room.vel(px, py), b = room.vel(px + 0.5 * h * a[0], py + 0.5 * h * a[1]);
        px = K.clamp(px + h * b[0], 0.015, ROOM.W - 0.015); py = K.clamp(py + h * b[1], 0.015, ROOM.H - 0.015);
      }
      px += jig * rnd.gauss(); py += jig * rnd.gauss();
      q.a += s;
      const throughWindow = P.win && P.wOpen && P.air && (P.wSide === "L" ? px < 0.02 : px > ROOM.W - 0.02) && Math.abs(py - P.wy) < WIN_H / 2;
      if (throughWindow || q.a > LIFE) {
        // a dot that leaves through the window is replaced by one coming in with the outside air: through the
        // lower half of the window if the room is warmer than outside (cold air enters low), the upper half if not
        if (P.win && P.wOpen && P.air && (throughWindow || rnd() < 0.15)) { const low = room.meanBand(0, ROOM.H) >= P.Tout ? -1 : 1; q.x = P.wSide === "L" ? 0.05 : ROOM.W - 0.05; q.y = P.wy + low * rnd() * WIN_H * 0.45; }
        else { q.x = 0.05 + rnd() * (ROOM.W - 0.1); q.y = 0.05 + rnd() * (ROOM.H - 0.1); }
        if (!throughWindow) q.a = 0;   // a dot recycled through the window keeps its age, so it cannot circle the window for ever
        continue;
      }
      q.x = K.clamp(px, 0.015, ROOM.W - 0.015); q.y = K.clamp(py, 0.015, ROOM.H - 0.015);
    }
  } else if (rodT < 1800) {
    // step the rod by re-running to the new time (the rod is tiny, so this is cheap)
    rodT = Math.min(1800, rodT + s);
    const rr = rodRun(P.mat, P.Th, P.Tc, P.lagged, Math.floor(rodT / 0.5) * 0.5);
    rod.T = rr.T; rod.rr = rr; rodDrops = rr.drops;
    if (!rodHistLive.length || rodT - rodHistLive[rodHistLive.length - 1][0] >= 15) rodHistLive.push([rodT, ROD.pins.map(p => rr.T[Math.round(p / rr.dx)])]);
  }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// colour for a temperature T compared with T0: dark neutral at T0, rising through yellow and orange to red
// (and deep crimson) at T0 + hot, falling through blue to icy pale blue at T0 − cold
const HOT_STOPS = [[0, 30, 38, 60], [0.08, 92, 74, 48], [0.2, 228, 192, 62], [0.38, 247, 146, 44], [0.6, 238, 86, 34], [0.8, 214, 40, 32], [1, 186, 18, 42]];
const COLD_STOPS = [[0, 30, 38, 60], [0.3, 36, 84, 168], [0.65, 64, 150, 236], [1, 196, 232, 255]];
function ramp(stops, f) {
  f = Math.min(1, Math.max(0, f));
  for (let i = 1; i < stops.length; i++) if (f <= stops[i][0]) { const a = stops[i - 1], b = stops[i], u = (f - a[0]) / (b[0] - a[0]); return [0, 1, 2].map(c => Math.round(a[c + 1] + (b[c + 1] - a[c + 1]) * u)); }
  return stops[stops.length - 1].slice(1);
}
function tCol(T, T0 = 20, hot = 30, cold = 15) { const d = T - T0; return d >= 0 ? ramp(HOT_STOPS, hot > 0 ? d / hot : 0) : ramp(COLD_STOPS, cold > 0 ? -d / cold : 0); }
// the colour range chosen for the room: fixed around the starting temperature, or stretched to fit the air
// in the room now (ignoring the hottest and coldest 2 % of cells, so the heater and cooler surfaces do not set it).
// mid = the temperature drawn dark neutral; above it runs to red at mid + hot, below it to pale blue at mid − cold.
function roomRange(R) {
  if (P.crange !== "fit") { const h = +P.crange; return { mid: R.T0, hot: h, cold: h === 30 ? 15 : h }; }
  const a = Array.from(R.T).sort((x, y) => x - y), lo = a[Math.floor(0.02 * a.length)], hi = Math.max(lo + 1, a[Math.ceil(0.98 * a.length) - 1]);
  // keep the starting temperature as the neutral colour if it lies inside the range; if the whole room is warmer
  // (or cooler) than it started, use the whole hot (or cold) ramp across the room's own range
  const mid = R.T0 > lo && R.T0 < hi ? R.T0 : R.T0 <= lo ? lo : hi;
  return { mid, hot: hi - mid, cold: mid - lo };   // one of these may be 0: that side is not used
}
const rimg = document.createElement("canvas");
let geo = { x: 0, y: 0, w: 1, h: 1, s: 1 };
const toX = m => geo.x + m * geo.s, toY = m => geo.y + geo.h - m * geo.s;   // metres → pixels
function drawRoom(c, w, h) {
  const s = Math.min((w - 60) / ROOM.W, (h - 90) / ROOM.H);
  geo = { s, w: ROOM.W * s, h: ROOM.H * s, x: (w - ROOM.W * s) / 2, y: 62 + (h - 90 - ROOM.H * s) / 2 };
  const R = room, cr = roomRange(R); rimg.width = R.nx; rimg.height = R.ny;
  const ic = rimg.getContext("2d"), im = ic.createImageData(R.nx, R.ny);
  for (let j = 0; j < R.ny; j++) for (let i = 0; i < R.nx; i++) { const k = i + j * R.nx, col = tCol(R.T[k], cr.mid, cr.hot, cr.cold), o = 4 * (i + (R.ny - 1 - j) * R.nx); im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255; }
  ic.putImageData(im, 0, 0);
  c.imageSmoothingEnabled = true; c.drawImage(rimg, geo.x, geo.y, geo.w, geo.h);
  c.strokeStyle = "#cfd8ea"; c.lineWidth = 3; c.strokeRect(geo.x, geo.y, geo.w, geo.h); c.lineWidth = 1;
  // smoke
  if (P.smoke) { const ds = smoke.length > 2000 ? 1.6 : 2.2; c.fillStyle = "rgba(240,246,255,.55)"; for (const q of smoke) { const a = Math.min(1, q.a / 4, (LIFE - q.a) / 20); c.globalAlpha = Math.max(0, a) * 0.8; c.fillRect(toX(q.x) - ds / 2, toY(q.y) - ds / 2, ds, ds); } c.globalAlpha = 1; }
  // heater and air conditioner icons (drag them)
  if (P.hOn) { c.fillStyle = "#ff6b3d"; c.fillRect(toX(P.hx - HSIZE[0] / 2), toY(P.hy + HSIZE[1] / 2), HSIZE[0] * s, HSIZE[1] * s); c.strokeStyle = "#fff"; c.strokeRect(toX(P.hx - HSIZE[0] / 2), toY(P.hy + HSIZE[1] / 2), HSIZE[0] * s, HSIZE[1] * s); TX(c, `heater ${P.hT} °C`, toX(P.hx), toY(P.hy - HSIZE[1] / 2) + (P.hy < 0.6 ? -(HSIZE[1] * s) - 14 : 16), "#ffd1b8", "center", "600 12px"); }
  if (P.cOn) { c.fillStyle = "#3aa0ff"; c.fillRect(toX(P.cx - CSIZE[0] / 2), toY(P.cy + CSIZE[1] / 2), CSIZE[0] * s, CSIZE[1] * s); c.strokeStyle = "#fff"; c.strokeRect(toX(P.cx - CSIZE[0] / 2), toY(P.cy + CSIZE[1] / 2), CSIZE[0] * s, CSIZE[1] * s); TX(c, `air conditioner ${P.cT} °C`, toX(P.cx), toY(P.cy - CSIZE[1] / 2) + (P.cy > ROOM.H - 0.6 ? 18 + CSIZE[1] * s : -(CSIZE[1] * s) - 6), "#d6ebff", "center", "600 12px"); }
  // window (click it to open or shut it)
  if (P.win) {
    const wx = P.wSide === "L" ? geo.x : geo.x + geo.w, y0 = toY(P.wy + WIN_H / 2), y1 = toY(P.wy - WIN_H / 2);
    if (P.wOpen) { c.fillStyle = "rgba(255,255,255,.9)"; c.fillRect(wx - 5, y0 - 3, 10, 6); c.fillRect(wx - 5, y1 - 3, 10, 6); c.strokeStyle = "rgba(255,255,255,.5)"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(wx, y0); c.lineTo(wx, y1); c.stroke(); c.setLineDash([]); }
    else { c.fillStyle = "rgba(150,210,255,.6)"; c.fillRect(wx - 5, y0, 10, y1 - y0); c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect(wx - 5, y0, 10, y1 - y0); c.lineWidth = 1; }
    TX(c, `window ${P.wOpen ? "OPEN" : "shut"} · outside ${P.Tout} °C`, P.wSide === "L" ? wx + 12 : wx - 12, y0 - 8, "#eef2f8", P.wSide === "L" ? "left" : "right", "600 12px");
  }
  // thermometer scale
  // thermometer scale: bottom = coldest colour, top = hottest
  const lx = geo.x + geo.w + 14, span = cr.hot + cr.cold, nb = 60, lo = cr.mid - cr.cold, fT = v => (v - lo) / span;
  for (let i = 0; i < nb; i++) { const T = lo + (i + 0.5) * span / nb, col = tCol(T, cr.mid, cr.hot, cr.cold); c.fillStyle = `rgb(${col})`; c.fillRect(lx, geo.y + geo.h - (i + 1) * geo.h / nb, 12, geo.h / nb + 1); }
  const lab = v => (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1));
  TX(c, `${lab(cr.mid + cr.hot)} °C`, lx + 16, geo.y + 10, "#cfd8ea"); TX(c, `${lab(lo)}`, lx + 16, geo.y + geo.h, "#cfd8ea");
  const f0 = fT(R.T0); if (f0 > 0.06 && f0 < 0.94) TX(c, `${lab(R.T0)} start`, lx + 16, geo.y + geo.h * (1 - f0) + 4, "#cfd8ea");
  TX(c, `${(room.t / 60).toFixed(1)} min · start ${R.T0} °C · ${P.air ? "convection ON: air can move" : "conduction only: air cannot move"} · click to place a ${P.tool === "heat" ? "heater" : "cooler"}, drag to move`, 20, 28, "#eef2f8", "left", "600 14px");
}
function drawRod(c, w, h) {
  const rr = rod.rr || rodRun(P.mat, P.Th, P.Tc, P.lagged, 0.5), m = MAT[P.mat];
  const x0 = 100, x1 = w - 100, y = h * 0.45, th = 34, sx = (x1 - x0) / ROD.L;
  // flame at the hot end, ice at the far end
  c.fillStyle = "#ff7b2d"; c.beginPath(); c.moveTo(x0 - 70, y + 40); c.quadraticCurveTo(x0 - 50, y - 20, x0 - 30, y + 10); c.quadraticCurveTo(x0 - 15, y - 25, x0 - 5, y + 40); c.fill(); TX(c, `${P.Th} °C`, x0 - 38, y + 70, "#ffb089", "center", "600 12px");
  c.fillStyle = "#9ad4ff"; c.fillRect(x1 + 6, y - 26, 38, 52); TX(c, `${P.Tc} °C`, x1 + 25, y + 70, "#bfe3ff", "center", "600 12px");
  // the rod, coloured by local temperature (hot end up to 200 °C)
  for (let i = 0; i < ROD.N - 1; i++) { const T = rr.T[i], col = tCol(T, 20, Math.max(80, P.Th - 20), 20); c.fillStyle = `rgb(${col})`; c.fillRect(x0 + i * (x1 - x0) / (ROD.N - 1), y - th / 2, (x1 - x0) / (ROD.N - 1) + 1, th); }
  c.strokeStyle = m.col; c.lineWidth = 3; c.strokeRect(x0, y - th / 2, x1 - x0, th); c.lineWidth = 1;
  if (P.lagged) { c.strokeStyle = "#e8d080"; c.lineWidth = 8; c.strokeRect(x0 - 3, y - th / 2 - 8, x1 - x0 + 6, th + 16); c.lineWidth = 1; }
  TX(c, `${m.name}${P.lagged ? " (lagged)" : ""} · ${(rodT / 60).toFixed(1)} min · k = ${m.k} W m⁻¹ K⁻¹`, 20, 28, "#eef2f8", "left", "600 14px");
  // ball bearings stuck with wax
  ROD.pins.forEach((p, i) => {
    const px = x0 + p * sx, T = rr.T[Math.round(p / rr.dx)], dropped = !isNaN(rodDrops[i]);
    c.fillStyle = "#6a7388"; c.fillRect(px - 1, y + th / 2, 2, 10);
    c.fillStyle = "#d4a24a"; c.fillRect(px - 6, y + th / 2 + 8, 12, 6);   // wax
    const by = dropped ? y + th / 2 + 190 : y + th / 2 + 26; c.fillStyle = dropped ? "#9aa3b2" : "#cfd4de"; c.beginPath(); c.arc(px, by, 9, 0, 7); c.fill();
    TX(c, `${(p * 100).toFixed(0)} cm`, px, y - th / 2 - 22, "#cfd8ea", "center", "11px");
    TX(c, `${T.toFixed(0)} °C`, px, y - th / 2 - 8, "#ffd166", "center", "600 11.5px");
    TX(c, dropped ? `fell at ${rodDrops[i].toFixed(0)} s` : T >= ROD.melt ? "wax melting" : "wax solid", px, y + th / 2 + 52, dropped ? "#7ee787" : "#8793ad", "center", "11px");
  });
  TX(c, "wax melts at 60 °C and drops the ball", w / 2, h - 18, "#8793ad", "center", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); (P.view === "room" ? drawRoom : drawRod)(c, w, h); }

// ---------------- Place and drag the heater and air conditioner ----------------
let dragging = null;
const inRoom = p => p.x >= geo.x - 12 && p.x <= geo.x + geo.w + 12 && p.y >= geo.y && p.y <= geo.y + geo.h;
const toM = p => ({ x: K.clamp((p.x - geo.x) / geo.s, 0.1, ROOM.W - 0.1), y: K.clamp((geo.y + geo.h - p.y) / geo.s, 0.08, ROOM.H - 0.08) });
function moveSource(kind, m) {
  if (kind === "heat") { P.hx = m.x; P.hy = Math.min(Math.max(m.y, HSIZE[1] / 2 + 0.02), ROOM.H - HSIZE[1] / 2 - 0.02); P.hOn = true; ctl.hOn.set(true); }
  else { P.cx = m.x; P.cy = Math.min(Math.max(m.y, CSIZE[1] / 2 + 0.02), ROOM.H - CSIZE[1] / 2 - 0.02); P.cOn = true; ctl.cOn.set(true); }
}
K.pointer(cv.el, {
  down(p) {
    if (P.view !== "room" || !inRoom(p)) return;
    if (P.win && Math.abs(p.x - (P.wSide === "L" ? geo.x : geo.x + geo.w)) < 16 && p.y >= toY(P.wy + WIN_H / 2) && p.y <= toY(P.wy - WIN_H / 2)) { P.wOpen = !P.wOpen; ctl.wOpen.set(P.wOpen ? "open" : "shut"); return; }   // click the window to open or shut it
    const m = toM(p), dh = P.hOn ? Math.hypot(p.x - toX(P.hx), p.y - toY(P.hy)) : 1e9, dc = P.cOn ? Math.hypot(p.x - toX(P.cx), p.y - toY(P.cy)) : 1e9;
    dragging = Math.min(dh, dc) < 50 ? (dh < dc ? "heat" : "cool") : P.tool;   // grab the nearest source, else place the chosen one here
    moveSource(dragging, m);
  },
  drag(p) { if (dragging && P.view === "room") moveSource(dragging, toM(p)); },
  up() { if (dragging) { hist = [[room.t, room.meanBand(0, 0.2), room.meanBand(1.1, 1.4), room.meanBand(ROOM.H - 0.2, ROOM.H)]]; } dragging = null; }
});

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "room") {
    const prof = []; for (let j = 0; j < room.ny; j++) prof.push([room.rowMean(j), (j + 0.5) * room.dy]);
    chA.opts.title = "Temperature at each height (average across the room)"; chA.opts.xLabel = "temperature (°C)"; chA.opts.yLabel = "height (m)";
    chA.draw([{ pts: [[room.T0, 0], [room.T0, ROOM.H]], color: "#3a4a6b", dash: [4, 3], label: `start ${room.T0} °C` }, { pts: prof, color: "#ff8a70", label: "now" }], { yMin: 0, yMax: ROOM.H });
    chB.opts.title = "Temperature against time"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "°C";
    chB.draw([{ pts: hist.map(q => [q[0], q[3]]), color: "#ff8a70", label: "ceiling layer" }, { pts: hist.map(q => [q[0], q[2]]), color: "#ffd166", label: "head height" }, { pts: hist.map(q => [q[0], q[1]]), color: "#6ab0ff", label: "floor layer" }]);
    let vmax = 0; for (let k = 0; k < room.N; k++) vmax = Math.max(vmax, room.speedAt(k));
    relabel(["ceiling layer", "head height (1.1–1.4 m)", "floor layer", "ceiling − floor", "fastest air"]);
    const cl = room.meanBand(ROOM.H - 0.2, ROOM.H), hd = room.meanBand(1.1, 1.4), fl = room.meanBand(0, 0.2);
    read.set("a", cl.toFixed(1) + " °C"); read.set("b", hd.toFixed(1) + " °C"); read.set("c", fl.toFixed(1) + " °C"); read.set("d", (cl - fl).toFixed(1) + " K"); read.set("e", P.air ? vmax.toFixed(2) + " m/s" : "none (no convection)");
    ui.hud(P.air ? "Warm air rises, cool air sinks: a convection current" : "Air is a poor conductor: heat hardly spreads");
  } else {
    const rr = rod.rr || rodRun(P.mat, P.Th, P.Tc, P.lagged, 0.5), m = MAT[P.mat];
    const prof = []; for (let i = 0; i < ROD.N; i += 2) prof.push([i * rr.dx * 100, rr.T[i]]);
    chA.opts.title = "Temperature along the rod"; chA.opts.xLabel = "distance from the hot end (cm)"; chA.opts.yLabel = "°C";
    const ser = [{ pts: prof, color: "#ff8a70", label: "now" }, { pts: [[0, ROD.melt], [25, ROD.melt]], color: "#d4a24a", dash: [4, 3], label: "wax melts 60 °C" }];
    if (P.lagged && ui.level === "adv") ser.push({ pts: [[0, P.Th], [25, P.Tc]], color: "#7ee787", dash: [5, 3], label: "straight line (steady)" });
    chA.draw(ser, { xMin: 0, xMax: 25, yMin: 0 });
    if (ui.level === "adv") {
      chB.opts.title = "Heat flow along the rod against time"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "P (W)";
      const steady = m.k * ROD_A * (P.Th - P.Tc) / ROD.L;
      chB.draw([{ pts: [[0, steady], [1800, steady]], color: "#7ee787", dash: [5, 3], label: "kAΔT/L" }, { pts: [[rodT, rr.flux(50)]], type: "dots", r: 5, color: "#fff", label: "midpoint now" }], { xMin: 0, xMax: 1800, yMin: 0 });
    } else {
      chB.opts.title = "Pin temperatures against time"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "°C";
      const cols = ["#ff8a70", "#ffd166", "#7ee787", "#6ab0ff"];
      chB.draw(ROD.pins.map((p, i) => ({ pts: rodHistLive.map(q => [q[0], q[1][i]]), color: cols[i], label: `${(p * 100).toFixed(0)} cm` })).concat([{ pts: [[0, ROD.melt], [1800, ROD.melt]], color: "#d4a24a", dash: [4, 3], label: "melts" }]), { xMin: 0, xMax: 1800, yMin: 0 });
    }
    const mid = rr.flux(50), nd = rodDrops.filter(d => !isNaN(d)).length;
    relabel(["time", "pins dropped", "heat flow (midpoint)", "kAΔT/L (steady, lagged)", "thermal diffusivity k/ρc"]);
    read.set("a", (rodT / 60).toFixed(1) + " min"); read.set("b", nd + " of 4"); read.set("c", mid.toFixed(2) + " W"); read.set("d", (m.k * ROD_A * (P.Th - P.Tc) / ROD.L).toFixed(2) + " W"); read.set("e", (m.k / m.rc).toExponential(1) + " m²/s");
    ui.hud(m.k > 20 ? "Metals conduct best: free electrons carry the energy" : "Insulators: very poor conductors");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
ui.onLevel = () => { };
set({});
ui.tip("Click the room to place a heater, or drag it. Try it on the floor, then the ceiling.", 6000);
