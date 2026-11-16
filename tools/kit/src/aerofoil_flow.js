/* =====================================================================
   AEROFOIL FLOW: HOW A WING MAKES LIFT
   Air flows round a wing. The shape (camber) and the angle of attack make
   the air flow faster over the top than underneath. Faster air has LOWER
   pressure (Bernoulli: p + ½ρv² stays the same along a streamline), so the
   pressure above the wing is lower than below: the difference pushes the
   wing up. That push is LIFT:
       lift per metre of wing L = ½ ρ v² c C_L
   (ρ = density of air, v = speed, c = chord, C_L = lift coefficient).
   The flow is worked out with the Hess–Smith PANEL METHOD: the surface is
   cut into straight panels; each carries a "source" (air flowing out of
   it) and the whole body carries a "vortex" (air circulating round it).
   Their strengths are chosen so that no air flows through the surface and
   the air leaves the sharp trailing edge smoothly (the KUTTA condition).
   Then  C_L = 2Γ ÷ (v c)  (Γ = circulation, the Kutta–Joukowski theorem).
   Potential flow has no viscosity, so it cannot show drag or stall.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const D2R = Math.PI / 180, RHO = 1.225;
// ---- geometry: NACA 4-digit aerofoils (m = camber, p = its position, t = thickness, as fractions of the chord) with cosine-spaced points, ordered
// from the trailing edge along the lower surface to the leading edge, then back along the upper surface (clockwise)
function naca(m, p, t, N) { // nodes from TE lower → LE → TE upper (clockwise), cosine spacing, closed TE
  const n = N / 2, up = [], lo = [];
  for (let i = 0; i <= n; i++) { const b = Math.PI * i / n, x = 0.5 * (1 - Math.cos(b)), yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0, dy = 0; if (m > 0) { if (x < p) { yc = m / (p * p) * (2 * p * x - x * x); dy = 2 * m / (p * p) * (p - x); } else { yc = m / ((1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x); dy = 2 * m / ((1 - p) ** 2) * (p - x); } }
    const th = Math.atan(dy); up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]); }
  const pts = []; for (let i = n; i >= 0; i--) pts.push(lo[i]); for (let i = 1; i <= n; i++) pts.push(up[i]); pts[pts.length - 1] = pts[0].slice(); return pts;
}
function rotate(pts, a) { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [0.25 + (x - 0.25) * c + y * s, -(x - 0.25) * s + y * c]); }
// ---- the Hess–Smith panel method (V∞ = 1). For each panel's middle (the control point): no flow through the surface.
// Unknowns: a source strength q on each panel and one vortex strength γ for the whole body; plus the Kutta condition
// (equal tangential speed on the two panels at the trailing edge). For a cylinder there is no sharp edge: γ is set by the spin.
function solve(nodes, alpha, kutta = true, gammaFixed = 0) {
  const N = nodes.length - 1, xm = [], ym = [], th = [], len = [];
  for (let j = 0; j < N; j++) { const [x1, y1] = nodes[j], [x2, y2] = nodes[j + 1]; xm.push((x1 + x2) / 2); ym.push((y1 + y2) / 2); th.push(Math.atan2(y2 - y1, x2 - x1)); len.push(Math.hypot(x2 - x1, y2 - y1)); }
  const L = [], B = [];
  for (let i = 0; i < N; i++) { L.push(new Float64Array(N)); B.push(new Float64Array(N)); for (let j = 0; j < N; j++) { if (i === j) { L[i][j] = 0; B[i][j] = Math.PI; continue; } const [x1, y1] = nodes[j], [x2, y2] = nodes[j + 1]; const r1 = Math.hypot(xm[i] - x1, ym[i] - y1), r2 = Math.hypot(xm[i] - x2, ym[i] - y2); L[i][j] = Math.log(r2 / r1); B[i][j] = Math.atan2((ym[i] - y2) * (xm[i] - x1) - (xm[i] - x2) * (ym[i] - y1), (xm[i] - x2) * (xm[i] - x1) + (ym[i] - y2) * (ym[i] - y1)); } }
  const M = kutta ? N + 1 : N, A = []; for (let i = 0; i < M; i++) A.push(new Float64Array(M + 1));
  const tp = 2 * Math.PI;
  for (let i = 0; i < N; i++) { let sv = 0; for (let j = 0; j < N; j++) { const d = th[i] - th[j]; A[i][j] = (Math.sin(d) * L[i][j] + Math.cos(d) * B[i][j]) / tp; sv += (Math.cos(d) * L[i][j] - Math.sin(d) * B[i][j]) / tp; }
    const rhs = Math.sin(th[i] - alpha); if (kutta) { A[i][N] = sv; A[i][M] = rhs; } else A[i][M] = rhs - gammaFixed * sv; }
  if (kutta) { let sv = 0; for (const k of [0, N - 1]) for (let j = 0; j < N; j++) { const d = th[k] - th[j]; A[N][j] += (Math.sin(d) * B[k][j] - Math.cos(d) * L[k][j]) / tp; sv += (Math.sin(d) * L[k][j] + Math.cos(d) * B[k][j]) / tp; } A[N][N] = sv; A[N][M] = -Math.cos(th[0] - alpha) - Math.cos(th[N - 1] - alpha); }
  // Gaussian elimination with partial pivoting
  for (let c = 0; c < M; c++) { let p = c; for (let r = c + 1; r < M; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; for (let r = c + 1; r < M; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k <= M; k++) A[r][k] -= f * A[c][k]; } }
  const xs = new Float64Array(M); for (let r = M - 1; r >= 0; r--) { let s = A[r][M]; for (let k = r + 1; k < M; k++) s -= A[r][k] * xs[k]; xs[r] = s / A[r][r]; }
  const q = xs.slice(0, N), gam = kutta ? xs[N] : gammaFixed, Vt = [], Cp = [];
  for (let i = 0; i < N; i++) { let v = Math.cos(th[i] - alpha); for (let j = 0; j < N; j++) { const d = th[i] - th[j]; v += q[j] * (Math.sin(d) * B[i][j] - Math.cos(d) * L[i][j]) / tp + gam * (Math.sin(d) * L[i][j] + Math.cos(d) * B[i][j]) / tp; } Vt.push(v); Cp.push(1 - v * v); }
  const per = len.reduce((a, b) => a + b, 0), Gam = gam * per;
  let fx = 0, fy = 0; for (let i = 0; i < N; i++) { const nx = -Math.sin(th[i]), ny = Math.cos(th[i]); fx += -Cp[i] * len[i] * nx; fy += -Cp[i] * len[i] * ny; }
  const CLp = fy * Math.cos(alpha) - fx * Math.sin(alpha);
  return { q, gam, Gam, CL: 2 * Gam, CLp, Cp, Vt, xm, ym, th, len, nodes, N };
}
// ---- velocity at any point in the flow: the free stream plus the effect of every panel (V∞ = 1)
function vel(S, x, y, alpha) {
  let u = Math.cos(alpha), v = Math.sin(alpha); const tp = 2 * Math.PI;
  for (let j = 0; j < S.N; j++) { const [x1, y1] = S.nodes[j], [x2, y2] = S.nodes[j + 1], r1 = Math.hypot(x - x1, y - y1), r2 = Math.hypot(x - x2, y - y2), lg = Math.log(r2 / r1), bt = Math.atan2((y - y2) * (x - x1) - (x - x2) * (y - y1), (x - x2) * (x - x1) + (y - y2) * (y - y1));
    const ul = (-S.q[j] * lg + S.gam * bt) / tp, vl = (S.q[j] * bt + S.gam * lg) / tp, c = Math.cos(S.th[j]), s = Math.sin(S.th[j]); u += ul * c - vl * s; v += ul * s + vl * c; }
  return [u, v];
}
// thin-aerofoil theory: zero-lift angle from the camber line, α₀ = −(1/π)∫ (dz/dx)(cos θ − 1) dθ
function alpha0(m, p) { if (!m) return 0; let s = 0; const n = 400; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n * Math.PI, x = 0.5 * (1 - Math.cos(t)), dz = x < p ? 2 * m / (p * p) * (p - x) : 2 * m / ((1 - p) ** 2) * (p - x); s += dz * (Math.cos(t) - 1) * Math.PI / n; } return -s / Math.PI; }
function cylinder(N) { const c = []; for (let i = 0; i <= N; i++) { const a = -2 * Math.PI * i / N; c.push([0.5 + 0.5 * Math.cos(a), 0.5 * Math.sin(a)]); } c[N] = c[0].slice(); return c; }
function inside(nodes, x, y) { let c = false; for (let i = 0, j = nodes.length - 2; i < nodes.length - 1; j = i++) { const [xi, yi] = nodes[i], [xj, yj] = nodes[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function bodyFor(o) { if (o.shape === "cyl") return cylinder(o.N); return rotate(naca(o.m / 100, o.p / 10, o.t / 100, o.N), o.shape === "cyl" ? 0 : o.a * D2R); }
function solveFor(o) { const nodes = bodyFor(o); if (o.shape === "cyl") { let per = 0; for (let j = 0; j < nodes.length - 1; j++) per += Math.hypot(nodes[j + 1][0] - nodes[j][0], nodes[j + 1][1] - nodes[j][1]); return solve(nodes, 0, false, o.spin * 4 * Math.PI * 0.5 / per); } return solve(nodes, 0); }
const clAt = (o, a) => solveFor(Object.assign({}, o, { a })).CL;

// ---------------- The page ----------------
const P = { shape: "naca", m: 0, p: 4, t: 12, a: 5, V: 30, c: 1, N: 100, spin: 0, view: "speed", stream: true, parts: true };
let speed = 1, S = null, grid = null, lines = [], particles = [], clCurve = null, clKey = "", dirty = true, rnd = K.rng(Date.now() % 99991 + 37);
const ui = K.app({
  title: "Aerofoil Flow", subject: "Engineering",
  blurb: "A 2D wind tunnel: how shape, angle of attack and spin make lift (panel-method flow solver)",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE physics and engineering: forces on a body moving through a fluid; pressure acts at right angles to a surface; faster flow, lower pressure; lift from a wing; the effect of speed and angle.", adv: "A level physics and engineering: Bernoulli's equation and the pressure coefficient Cp = 1 − (v/V∞)², lift L = ½ρv²cC_L, circulation and the Kutta–Joukowski theorem, thin-aerofoil theory C_L = 2π(α − α₀). The panel method itself is beyond the specifications." } },
  missions: [
    { title: "No angle, no lift", q: "A symmetric aerofoil (NACA 0012) at 0°: is there any lift? Look at the colours above and below.", hint: "The flow above and below is a mirror image: the air speeds up equally over both surfaces, so the pressures balance and there is no lift.", setup() { set({ m: 0, t: 12, a: 0 }); } },
    { title: "Tilt it", q: "Tilt the symmetric aerofoil to 5°. Where is the air fastest? Where is the pressure lowest? Which way does the lift act?", hint: "The air speeds up most over the top, near the front (red on the speed map); there the pressure is lowest. Underneath it is slower, so the pressure is higher. Higher pressure below, lower above: lift upwards.", setup() { set({ m: 0, t: 12, a: 5 }); } },
    { title: "Faster, more lift", q: "Double the wind speed from 30 to 60 m/s. How many times bigger is the lift?", hint: "Lift = ½ρv²cC_L: twice the speed gives four times the lift (C_L stays the same). That is why aircraft need long runways: they must reach a high speed before the lift beats their weight.", setup() { set({ a: 5, V: 30 }); } },
    { title: "Camber", q: "Give the aerofoil camber (NACA 4412) at 0°. Is there lift now?", hint: "Yes: a curved (cambered) aerofoil turns the air downwards even at 0°, so it makes lift; it has to be tilted slightly nose-down (about −4°) to make none. Most wings are cambered.", setup() { set({ m: 4, p: 4, t: 12, a: 0 }); } },
    { title: "Lift against angle", q: "Look at the C_L against α graph. How does lift change with angle? What really happens above about 15°?", hint: "In this model C_L rises in a straight line, about 0.11 per degree (2π per radian). Real wings stall at about 12–16°: the flow separates from the upper surface and lift falls suddenly. Potential flow cannot show that (no viscosity), so the dashed 'real wing' curve is a sketch.", setup() { set({ m: 2, p: 4, t: 12, a: 8 }); } },
    { title: "Spinning ball (Magnus effect)", q: "Switch to a cylinder. Is there lift? Now spin it. Which way does the lift act?", hint: "With no spin the flow is symmetric: no lift (and, in this ideal flow, no drag either: d'Alembert's paradox). Spin drags air round with it, so the air is faster on one side and slower on the other: a sideways force. That is how footballs and tennis balls curve.", setup() { set({ shape: "cyl", spin: 0 }); } },
    { lvl: "adv", title: "Bernoulli and Cp", q: "At 5°, find the lowest Cp on the upper surface. Use Cp = 1 − (v/V∞)² to find the air speed there, and the pressure drop at 30 m/s.", hint: "Cp ≈ −2 near the leading edge: (v/V∞)² = 3, v ≈ 1.7 × 30 = 52 m/s. Pressure drop = −Cp × ½ρV∞² ≈ 2 × 0.5 × 1.225 × 900 ≈ 1100 Pa below atmospheric.", setup() { set({ m: 0, t: 12, a: 5, V: 30 }); } },
    { lvl: "adv", title: "Thin-aerofoil theory", q: "Compare the panel method's C_L–α line with thin-aerofoil theory C_L = 2π(α − α₀). Then try a thick aerofoil (0024).", hint: "Both have a slope near 2π per radian (0.11 per degree). Thicker aerofoils give a slightly steeper slope in potential flow (real thick wings lose some of it to viscosity). Camber shifts the line left by the zero-lift angle α₀.", setup() { set({ m: 0, t: 24, a: 5 }); } }
  ],
  batch: [
    { title: "Lift against angle of attack", question: "How does C_L of a NACA 0012 depend on the angle of attack?", how: "Panel method (100 panels) from −4° to 12°. Theory: thin-aerofoil C_L = 2πα. Fitted gradient is per degree (2π per radian = 0.110 per degree).", xLabel: "angle of attack α (°)", yLabel: "lift coefficient C_L", xs: [-4, -2, 0, 2, 4, 6, 8, 10, 12], reps: 1, fit: true, theory: a => 2 * Math.PI * a * D2R, theoryLabel: "thin-aerofoil theory", run: x => clAt({ shape: "naca", m: 0, p: 4, t: 12, N: 100 }, x), note: "A straight line through the origin, gradient about 0.12 per degree: a little steeper than thin theory, because of the thickness. Real wings follow this up to about 12° and then stall." },
    { title: "Camber and lift at zero angle", question: "How much lift does a cambered aerofoil make at 0°?", how: "NACA m412 aerofoils (camber m from 0 to 6%), α = 0°. Theory: C_L = −2π α₀ from the camber line.", xLabel: "camber (% of chord)", yLabel: "C_L at 0°", xs: [0, 1, 2, 3, 4, 5, 6], reps: 1, fit: true, theory: m => -2 * Math.PI * alpha0(m / 100, 0.4), theoryLabel: "thin-aerofoil theory", run: x => clAt({ shape: "naca", m: x, p: 4, t: 12, N: 100 }, 0), note: "Lift at zero angle rises in proportion to the camber: about 0.13 per 1% of camber." },
    { title: "Does thickness change the lift slope?", question: "The slope of C_L against α for symmetric aerofoils of different thickness.", how: "Slope from C_L at 0° and 4°; NACA 00tt with t = 6% to 24%.", xLabel: "thickness (% of chord)", yLabel: "lift slope (per degree)", xs: [6, 9, 12, 15, 18, 21, 24], reps: 1, theory: () => 2 * Math.PI * D2R, theoryLabel: "2π per radian", run: x => clAt({ shape: "naca", m: 0, p: 4, t: x, N: 100 }, 4) / 4, note: "In potential flow thicker aerofoils give slightly more lift per degree (about 1 + 0.8 × t/c times thin theory). Real thick wings lose part of this to the boundary layer." },
    { title: "Lift against wind speed", question: "Lift per metre of wing (1 m chord, 5°) at different speeds.", how: "L = ½ρv²cC_L with ρ = 1.225 kg/m³. Theory curve uses the panel C_L.", xLabel: "wind speed (m/s)", yLabel: "lift per metre of wing (N)", xs: [10, 20, 30, 40, 50, 60], reps: 1, theory: v => 0.5 * RHO * v * v * clAt({ shape: "naca", m: 0, p: 4, t: 12, N: 100 }, 5), theoryLabel: "½ρv²cC_L", run: x => 0.5 * RHO * x * x * clAt({ shape: "naca", m: 0, p: 4, t: 12, N: 100 }, 5), note: "Lift rises with the square of the speed: double the speed, four times the lift." },
    { title: "Spinning cylinder (Magnus effect)", question: "How does the lift on a cylinder depend on how fast it spins?", how: "Spin ratio s = Γ ÷ (4πV∞R) from 0 to 1. Theory: C_L = 4πs (lift per unit length ÷ ½ρV²d).", xLabel: "spin ratio s", yLabel: "C_L (based on the diameter)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 1, fit: true, theory: s => 4 * Math.PI * s, theoryLabel: "4πs", run: x => solveFor({ shape: "cyl", N: 100, spin: x }).CLp, note: "Lift is proportional to the spin (Kutta–Joukowski: L = ρVΓ). Measured here by adding up the surface pressures, it matches 4πs." },
    { title: "Gusts: how much does the lift vary?", question: "A wing at 5° flies through gusts that change its angle at random (SD 1.5°). How much does C_L vary?", how: "200 random angles from a normal distribution around 5°; panel C_L at each.", yLabel: "C_L", reps: 200, bins: 20, theory: 0.606, theoryLabel: "C_L at 5°", run: (x, r) => clAt({ shape: "naca", m: 0, p: 4, t: 12, N: 60 }, 5 + 1.5 * r.gauss()) * 0.606 / clAt({ shape: "naca", m: 0, p: 4, t: 12, N: 60 }, 5), note: "C_L varies by about ±0.18: gusts make the lift jump up and down, which passengers feel as turbulence." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE forces", text: "A wing deflects air downwards; by Newton's third law the air pushes the wing upwards. Equivalently, air flows faster over the top, so the pressure there is lower than underneath." },
      { lvl: "std", tag: "GCSE forces", text: "Lift increases with speed (with the square of the speed), wing area, angle of attack (until the wing stalls) and air density." },
      { lvl: "std", tag: "GCSE forces", text: "Pressure acts at right angles to a surface; the difference in pressure × area gives a force." },
      { lvl: "adv", tag: "A level", text: "Bernoulli: along a streamline p + ½ρv² is constant, so faster flow has lower pressure. Pressure coefficient Cp = (p − p∞) ÷ ½ρV∞² = 1 − (v/V∞)²." },
      { lvl: "adv", tag: "A level", text: "Lift per unit span L = ½ρV²cC_L = ρVΓ (Kutta–Joukowski). Thin-aerofoil theory: C_L = 2π(α − α₀), α in radians." },
      { lvl: "adv", tag: "A level", text: "Real wings stall at about 12–16° when the boundary layer separates from the upper surface; potential flow has no viscosity and predicts no drag (d'Alembert's paradox)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain how an aircraft wing produces lift.", ans: "<ul><li>air flows faster over the upper surface than the lower one</li><li>so the pressure is lower above than below, giving an upward force</li></ul>" },
      { lvl: "std", marks: 2, q: () => `The lift on a wing at ${P.V} m/s is ${K.sig(0.5 * RHO * P.V * P.V * P.c * (S ? S.CL : 0.6), 3)} N per metre. What is it at ${2 * P.V} m/s?`, ans: () => `<ul><li>lift ∝ speed²: × 4</li><li>${K.sig(4 * 0.5 * RHO * P.V * P.V * P.c * (S ? S.CL : 0.6), 3)} N per metre</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `Calculate the lift per metre of span on a wing of chord ${P.c} m at ${P.V} m/s with C_L = ${(S ? S.CL : 0.6).toFixed(2)} (ρ = 1.225 kg/m³).`, ans: () => `<ul><li>L = ½ρv²cC_L</li><li>= 0.5 × 1.225 × ${P.V}² × ${P.c} × ${(S ? S.CL : 0.6).toFixed(2)}</li><li>= ${K.sig(0.5 * RHO * P.V * P.V * P.c * (S ? S.CL : 0.6), 3)} N</li></ul>` },
      { lvl: "adv", marks: 2, q: "At a point on the upper surface Cp = −1.5. Find the local air speed if V∞ = 40 m/s.", ans: "<ul><li>(v/V∞)² = 1 − Cp = 2.5</li><li>v = 40 × √2.5 = 63 m/s</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Hess–Smith panel method: N straight panels (default 100), each with a constant source strength, one vortex strength for the whole body, influences integrated exactly along each panel; N "no flow through the surface" equations plus the Kutta condition, solved by Gaussian elimination.</li>
<li>Pressure from Bernoulli: Cp = 1 − (v/V∞)². Lift from the circulation, C_L = 2Γ/(V∞c); also found by adding up the surface pressures, as a check (they agree within about 1%).</li>
<li>NACA 4-digit aerofoils (camber m %, its position p tenths, thickness t %), turned about the quarter chord; the wind always blows from the left. Cylinder: no sharp edge, so the circulation is set by the spin ratio s = Γ/(4πV∞R).</li>
<li>Thin-aerofoil theory C_L = 2π(α − α₀), with α₀ worked out from the camber line. The "real wing" curve is a sketch that stalls at about 15°.</li>
<li>Checked: NACA 0012 at 5° gives C_L = 0.61 (published inviscid value about 0.6); a cylinder's lowest Cp is −3.0 (exact −3).</li></ul>
<h3>Left out</h3>
<ul><li>Viscosity: no boundary layer, drag, separation or stall. Two dimensions only (an infinitely long wing). No compressibility (fine below about 100 m/s).</li>
<li>The earlier version's drawn and image shapes, slotted flap, vortex wake, pitching wing and boundary-layer model are not included here.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/aerofoil-flow.html">original/aerofoil-flow.html</a>. For real viscous flow (wakes, stall, vortex streets) see the <a href="../../physics/wind_tunnel/wind-tunnel.html">Wind Tunnel</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("Body");
ctl.shape = K.seg(g, { value: "naca", options: [["naca", "Aerofoil (NACA)"], ["cyl", "Cylinder"]], on: v => set({ shape: v, a: P.a, V: P.V }) });
grp.naca = g;
ctl.m = K.slider(g, { label: "Camber m", min: 0, max: 9, step: 1, value: 0, unit: "%", on: v => { P.m = v; dirty = true; } });
ctl.p = K.slider(g, { label: "Position of camber p", min: 2, max: 7, step: 1, value: 4, fmt: v => v * 10 + "% of chord", on: v => { P.p = v; dirty = true; } });
ctl.t = K.slider(g, { label: "Thickness t", min: 6, max: 30, step: 1, value: 12, unit: "%", on: v => { P.t = v; dirty = true; } });
ctl.spin = K.slider(g, { label: "Spin (cylinder) s = Γ ÷ 4πV∞R", min: -1.2, max: 1.2, step: 0.05, value: 0, on: v => { P.spin = v; dirty = true; } });
g = ui.group("Flow");
ctl.a = K.slider(g, { label: "Angle of attack α", min: -10, max: 20, step: 0.5, value: 5, unit: "°", on: v => { P.a = v; dirty = true; } });
ctl.V = K.slider(g, { label: "Wind speed V∞", min: 5, max: 80, step: 1, value: 30, unit: "m/s", on: v => P.V = v });
ctl.c = K.slider(g, { label: "Chord (size) c", min: 0.2, max: 3, step: 0.1, value: 1, unit: "m", on: v => P.c = v });
ctl.N = K.slider(g, { label: "Number of panels N", min: 20, max: 300, step: 10, value: 100, on: v => { P.N = v; dirty = true; } });
g = ui.group("View");
ctl.view = K.seg(g, { label: "Colour map", value: "speed", options: [["speed", "speed |v|/V∞"], ["cp", "pressure Cp"]], on: v => { P.view = v; img = null; } });
ctl.stream = K.toggle(g, { label: "Streamlines", value: true, on: v => P.stream = v });
ctl.parts = K.toggle(g, { label: "Smoke particles", value: true, on: v => P.parts = v });
ctl.speed = K.slider(g, { label: "Particle speed", min: 0.25, max: 3, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["cl", "lift coefficient C_L"], ["clp", "C_L from surface pressures"], ["L", "lift per metre of wing"], ["cpmin", "lowest Cp (fastest air)"], ["th", "thin-aerofoil theory"]]);
function set(o) {
  Object.assign(P, { shape: "naca", m: 0, p: 4, t: 12, a: 5, V: 30, c: 1, N: 100, spin: 0 }, o);
  for (const k of ["m", "p", "t", "a", "V", "c", "N", "spin"]) ctl[k].set(P[k]); ctl.shape.set(P.shape);
  for (const k of ["m", "p", "t"]) ctl[k].el.style.display = P.shape === "naca" ? "" : "none"; ctl.spin.el.style.display = P.shape === "cyl" ? "" : "none"; ctl.a.el.style.display = P.shape === "naca" ? "" : "none";
  dirty = true; particles = [];
}

// ---------------- Flow field on a grid, streamlines and particles ----------------
const X0 = -0.9, X1 = 2.1, Y0 = -0.85, Y1 = 0.85, GX = 150, GY = 85;
function computeField() {
  S = solveFor(P); const nodes = S.nodes, a = 0;
  const u = new Float32Array(GX * GY), v = new Float32Array(GX * GY), ins = new Uint8Array(GX * GY);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const x = X0 + (X1 - X0) * i / (GX - 1), y = Y0 + (Y1 - Y0) * j / (GY - 1), k = j * GX + i; if (inside(nodes, x, y)) { ins[k] = 1; continue; } const [uu, vv] = vel(S, x, y, a); u[k] = uu; v[k] = vv; }
  grid = { u, v, ins };
  // streamlines from seeds on the left
  lines = []; for (let s = 0; s < 26; s++) { let x = X0 + 0.01, y = Y0 + 0.03 + (Y1 - Y0 - 0.06) * s / 25; const pts = [[x, y]]; for (let k = 0; k < 700; k++) { const v1 = sample(x, y); if (!v1) break; const sp = Math.hypot(v1[0], v1[1]) || 1, h = 0.012; const xm = x + v1[0] / sp * h / 2, ym = y + v1[1] / sp * h / 2, v2 = sample(xm, ym); if (!v2) break; const sp2 = Math.hypot(v2[0], v2[1]) || 1; x += v2[0] / sp2 * h; y += v2[1] / sp2 * h; if (x > X1 || y < Y0 || y > Y1) break; pts.push([x, y]); } lines.push(pts); }
  img = null; dirty = false;
}
function sample(x, y) {
  const fi = (x - X0) / (X1 - X0) * (GX - 1), fj = (y - Y0) / (Y1 - Y0) * (GY - 1); if (fi < 0 || fj < 0 || fi >= GX - 1 || fj >= GY - 1) return null;
  const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j, k = j * GX + i; if (grid.ins[k] || grid.ins[k + 1] || grid.ins[k + GX] || grid.ins[k + GX + 1]) return null;
  const U = grid.u, V = grid.v; return [U[k] * (1 - a) * (1 - b) + U[k + 1] * a * (1 - b) + U[k + GX] * (1 - a) * b + U[k + GX + 1] * a * b, V[k] * (1 - a) * (1 - b) + V[k + 1] * a * (1 - b) + V[k + GX] * (1 - a) * b + V[k + GX + 1] * a * b];
}

// ---------------- Drawing ----------------
let img = null;
const cv = ui.canvas(() => { img = null; });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function ramp(t) { t = Math.max(0, Math.min(1, t)); const st = [[0, [40, 60, 160]], [0.35, [60, 170, 220]], [0.5, [90, 200, 120]], [0.7, [240, 220, 80]], [1, [230, 60, 50]]]; for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const f = (t - st[i - 1][0]) / (st[i][0] - st[i - 1][0]); return st[i - 1][1].map((v, k) => v + (st[i][1][k] - v) * f); } return st[st.length - 1][1]; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!grid) return;
  const sc = Math.min(w / (X1 - X0), (h - 30) / (Y1 - Y0)), ox = (w - (X1 - X0) * sc) / 2, oy = (h - (Y1 - Y0) * sc) / 2 + 10, X = x => ox + (x - X0) * sc, Y = y => oy + (Y1 - y) * sc;
  if (!img) { img = document.createElement("canvas"); img.width = GX; img.height = GY; const ix = img.getContext("2d"), id = ix.createImageData(GX, GY);
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const k = j * GX + i, o = ((GY - 1 - j) * GX + i) * 4; if (grid.ins[k]) { id.data[o] = 30; id.data[o + 1] = 36; id.data[o + 2] = 50; id.data[o + 3] = 255; continue; } const s = Math.hypot(grid.u[k], grid.v[k]), t = P.view === "speed" ? (s - 0.3) / 1.6 : 1 - (1 - s * s + 2) / 3; const col = ramp(t); id.data[o] = col[0]; id.data[o + 1] = col[1]; id.data[o + 2] = col[2]; id.data[o + 3] = 255; }
    ix.putImageData(id, 0, 0); }
  c.globalAlpha = 0.85; c.imageSmoothingEnabled = true; c.drawImage(img, X(X0), Y(Y1), (X1 - X0) * sc, (Y1 - Y0) * sc); c.globalAlpha = 1;
  if (P.stream) { c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 1; for (const L of lines) { c.beginPath(); L.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); } }
  if (P.parts) { c.fillStyle = "rgba(255,255,255,0.9)"; for (const p of particles) c.fillRect(X(p.x) - 1, Y(p.y) - 1, 2.5, 2.5); }
  // the body
  c.fillStyle = "#c9d3e6"; c.beginPath(); S.nodes.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.closePath(); c.fill();
  // stagnation point (where the surface speed changes sign near the front)
  for (let i = 1; i < S.N; i++) if (S.Vt[i - 1] * S.Vt[i] < 0 && S.xm[i] < 0.6) { c.fillStyle = "#ff5d6c"; c.beginPath(); c.arc(X(S.xm[i]), Y(S.ym[i]), 5, 0, 6.3); c.fill(); TX(c, "stagnation point", X(S.xm[i]) - 8, Y(S.ym[i]) + 18, "#ff5d6c", "right", "11px"); break; }
  // lift arrow
  const Lp = 0.5 * RHO * P.V * P.V * P.c * S.CL, lx = X(0.25), ly = Y(0.05); if (Math.abs(S.CL) > 0.01) { c.strokeStyle = "#7fe3a0"; c.fillStyle = "#7fe3a0"; c.lineWidth = 4; const len = Math.max(-150, Math.min(150, S.CL * 90)); c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx, ly - len); c.stroke(); c.beginPath(); c.moveTo(lx, ly - len - Math.sign(len) * 10); c.lineTo(lx - 8, ly - len); c.lineTo(lx + 8, ly - len); c.fill(); TX(c, `lift ${K.sig(Lp, 3)} N per metre`, lx + 12, ly - len / 2, "#7fe3a0", "left", "600 12px"); }
  TX(c, `${P.shape === "cyl" ? `cylinder, spin s = ${P.spin}` : `NACA ${P.m}${P.m ? P.p : 0}${String(P.t).padStart(2, "0")} at α = ${P.a}°`} · wind ${P.V} m/s from the left`, 14, 22, "#eef2f8", "left", "600 13px");
  TX(c, P.view === "speed" ? "colour: air speed (blue slow → red fast)" : "colour: pressure (red low → blue high)", 14, h - 10, "#aab6cc", "left", "11px");
}

// ---------------- Charts ----------------
function charts() {
  if (!S) return;
  const up = [], lo = [], N = S.N; for (let i = 0; i < N; i++) { const pt = [S.xm[i], -S.Cp[i]]; (i < N / 2 ? lo : up).push(pt); }
  chA.opts.title = "Pressure along the surface (−Cp, up = lower pressure)"; chA.opts.xLabel = P.shape === "cyl" ? "x" : "x (fraction of chord)"; chA.opts.yLabel = "−Cp"; chA.opts.xFmt = null;
  chA.draw([{ pts: up.sort((a, b) => a[0] - b[0]), color: "#ff8a70", label: "upper surface" }, { pts: lo.sort((a, b) => a[0] - b[0]), color: "#6fb1ff", label: "lower surface" }], { xMin: -0.05, xMax: 1.05 });
  if (P.shape === "naca") {
    const key = [P.m, P.p, P.t, P.N].join(); if (key !== clKey) { clKey = key; clCurve = []; for (let a = -6; a <= 20; a += 1) clCurve.push([a, clAt(Object.assign({}, P, { N: Math.min(P.N, 80) }), a)]); }
    const a0 = alpha0(P.m / 100, P.p / 10) / D2R, th = clCurve.map(([a]) => [a, 2 * Math.PI * (a - a0) * D2R]), real = clCurve.map(([a, cl]) => [a, a <= 14 ? cl : cl * Math.max(0.55, 1 - (a - 14) * 0.09)]);
    chB.opts.title = "Lift coefficient against angle of attack"; chB.opts.xLabel = "α (°)"; chB.opts.yLabel = "C_L"; chB.opts.xFmt = null;
    chB.draw([{ pts: clCurve, color: "#ffd166", label: "panel method" }, { pts: th, color: "#7fe3a0", dash: [5, 4], label: "thin-aerofoil theory" }, { pts: real, color: "#7d8aa5", dash: [2, 4], label: "real wing (sketch, stalls)" }, { pts: [[P.a, S.CL]], type: "dots", r: 6, color: "#ff5d6c" }], { xMin: -6, xMax: 20 });
    read.set("th", `${(2 * Math.PI * (P.a - a0) * D2R).toFixed(3)} (α₀ = ${a0.toFixed(2)}°)`);
  } else {
    const pts = []; for (let s = -1.2; s <= 1.21; s += 0.1) pts.push([s, 4 * Math.PI * s]);
    chB.opts.title = "Magnus effect: lift against spin"; chB.opts.xLabel = "spin ratio s"; chB.opts.yLabel = "C_L"; chB.opts.xFmt = null;
    chB.draw([{ pts, color: "#7fe3a0", label: "4πs" }, { pts: [[P.spin, S.CLp]], type: "dots", r: 6, color: "#ff5d6c", label: "this cylinder" }], { xMin: -1.2, xMax: 1.2 });
    read.set("th", `4πs = ${(4 * Math.PI * P.spin).toFixed(3)}`);
  }
  read.set("cl", S.CL.toFixed(3)); read.set("clp", S.CLp.toFixed(3)); read.set("L", `${K.sig(0.5 * RHO * P.V * P.V * P.c * S.CL, 3)} N`); read.set("cpmin", `${Math.min(...S.Cp).toFixed(2)} (v = ${(Math.sqrt(1 - Math.min(...S.Cp)) * P.V).toFixed(0)} m/s)`);
  ui.hud(P.shape === "cyl" ? (Math.abs(P.spin) < 0.01 ? "Symmetric flow: no lift (and no drag, in ideal flow)" : "Spin speeds the air up on one side: a sideways force") : Math.abs(S.CL) < 0.01 ? "Symmetric flow: no lift" : P.a > 14 ? "A real wing would have stalled by now" : "Faster air over the top, lower pressure: lift");
}

// ---------------- The loop ----------------
let frame = 0, lastChange = 0;
ui.run(dt => {
  if (!(dt > 0) || !grid) return;
  while (particles.length < 450) particles.push({ x: X0 + rnd() * 0.05 + (particles.length < 449 && rnd() < 0.6 ? rnd() * (X1 - X0) : 0), y: Y0 + rnd() * (Y1 - Y0) });
  for (const p of particles) { const v = sample(p.x, p.y); if (!v) { p.x = X0 + rnd() * 0.05; p.y = Y0 + rnd() * (Y1 - Y0); continue; } p.x += v[0] * dt * 0.35 * speed; p.y += v[1] * dt * 0.35 * speed; if (p.x > X1) { p.x = X0; p.y = Y0 + rnd() * (Y1 - Y0); } }
}, () => { if (dirty && performance.now() - lastChange > 60) { lastChange = performance.now(); computeField(); } draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Change the angle of attack and the shape. Faster air (red) over the top means lower pressure: that is lift.", 7000);
