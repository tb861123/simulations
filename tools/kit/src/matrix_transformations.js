/* =====================================================================
   MATRIX TRANSFORMATIONS
   A 2 × 2 matrix M = (a b; c d) moves every point (x, y) to
       (ax + by, cx + dy).
   Its COLUMNS are where the unit vectors go: i → (a, c), j → (b, d).
   So to find a matrix, ask "where do i and j end up?"
   The DETERMINANT det M = ad − bc is the AREA SCALE FACTOR; if it is
   negative the shape is flipped over (orientation reversed); if it is 0
   the plane is squashed onto a line (or a point): M is SINGULAR and has
   no inverse.
   NM means "do M first, then N" (matrices act from right to left), and
   in general NM ≠ MN.
   An INVARIANT LINE is mapped onto itself; a line of INVARIANT POINTS
   has every point fixed. Lines through the origin that are invariant are
   along eigenvectors: Mv = λv.
   In 3D a 3 × 3 matrix's columns are the images of i, j and k, and its
   determinant is the VOLUME scale factor.
   ===================================================================== */
// ---------------- 1. Matrix tools ----------------
const det2 = m => m[0] * m[3] - m[1] * m[2];
const mul2 = (n, m) => [n[0] * m[0] + n[1] * m[2], n[0] * m[1] + n[1] * m[3], n[2] * m[0] + n[3] * m[2], n[2] * m[1] + n[3] * m[3]];   // N × M
const app2 = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const inv2 = m => { const d = det2(m); return Math.abs(d) < 1e-12 ? null : [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d]; };
const lerpM = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// invariant lines through the origin: real eigenvectors of M (solve λ² − (a + d)λ + det = 0)
function eig2(m) {
  const tr = m[0] + m[3], dt = det2(m), disc = tr * tr - 4 * dt; if (disc < -1e-12) return [];
  const out = []; for (const s of disc < 1e-12 ? [1] : [1, -1]) { const l = (tr + s * Math.sqrt(Math.max(0, disc))) / 2; let v = Math.abs(m[1]) > 1e-9 ? [m[1], l - m[0]] : Math.abs(m[2]) > 1e-9 ? [l - m[3], m[2]] : (Math.abs(m[0] - l) < 1e-9 ? [1, 0] : [0, 1]); const L = Math.hypot(v[0], v[1]); out.push({ l, v: [v[0] / L, v[1] / L] }); if (disc < 1e-12 && Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9) out.push({ l, v: Math.abs(v[0]) > 0.5 ? [0, 1] : [1, 0] }); }
  return out;
}
const det3 = m => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
const app3 = (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]];
const f2 = v => (Math.abs(v) < 5e-4 ? 0 : +v.toFixed(3));

// ---------------- 2. Ready-made transformations ----------------
const rad = d => d * Math.PI / 180;
const PRESETS = {
  rot: { name: "rotation by θ", m: q => [Math.cos(rad(q.t)), -Math.sin(rad(q.t)), Math.sin(rad(q.t)), Math.cos(rad(q.t))], uses: "t" },
  refl: { name: "reflection in y = x tan θ", m: q => [Math.cos(rad(2 * q.t)), Math.sin(rad(2 * q.t)), Math.sin(rad(2 * q.t)), -Math.cos(rad(2 * q.t))], uses: "t" },
  enl: { name: "enlargement, scale k", m: q => [q.k, 0, 0, q.k], uses: "k" },
  sx: { name: "stretch parallel to x, factor k", m: q => [q.k, 0, 0, 1], uses: "k" },
  sy: { name: "stretch parallel to y, factor k", m: q => [1, 0, 0, q.k], uses: "k" },
  shear: { name: "shear, x-axis fixed", m: q => [1, q.k, 0, 1], uses: "k" },
  sing: { name: "a singular matrix", m: q => [1, 2, 0.5, 1], uses: "" },
  custom: { name: "type your own", m: q => q.M.slice(), uses: "" },
};
const P3 = {
  rz: { name: "rotation about the z-axis", m: t => [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0, 0, 0, 1] },
  rx: { name: "rotation about the x-axis", m: t => [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)] },
  rfz: { name: "reflection in z = 0", m: () => [1, 0, 0, 0, 1, 0, 0, 0, -1] },
  rfxy: { name: "reflection in x = y", m: () => [0, 1, 0, 1, 0, 0, 0, 0, 1] },
  st: { name: "stretch (2, 1, 0.5)", m: () => [2, 0, 0, 0, 1, 0, 0, 0, 0.5] },
  en: { name: "enlargement × 1.5", m: () => [1.5, 0, 0, 0, 1.5, 0, 0, 0, 1.5] },
  sh: { name: "a shear", m: () => [1, 0.8, 0, 0, 1, 0, 0, 0, 1] },
};

// ---------------- 3. State ----------------
const DEF = { view: "2d", preset: "rot", t: 90, k: 2, M: [1, 1, 0, 1], shape: "F", comp: false, preset2: "refl", t2: 0, showInv: true, showGrid: true, p3: "rz", t3: 90 };
const P = JSON.parse(JSON.stringify(DEF));
let anim = 0, drag = null;
const matA = () => PRESETS[P.preset].m(P), matB = () => PRESETS[P.preset2].m({ t: P.t2, k: P.k, M: P.M });
const matNow = () => P.comp ? mul2(matB(), matA()) : matA();   // "A then B" is BA
const SHAPES = { F: [[0, 0], [0, 3], [2, 3], [2, 2.4], [0.6, 2.4], [0.6, 1.8], [1.6, 1.8], [1.6, 1.2], [0.6, 1.2], [0.6, 0]], square: [[0, 0], [1, 0], [1, 1], [0, 1]], tri: [[1, 0], [3, 1], [1, 2]] };

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Matrix Transformations", subject: "Further Mathematics",
  blurb: "Watch a 2 × 2 matrix move the plane: columns as images of i and j, determinant as area, invariant lines, composition, and 3 × 3 matrices in 3D",
  reset: () => { anim = 0; },
  levels: { std: "AS Further Maths (8FM0)", adv: "A level Further Maths (9FM0)", specs: {
    std: "Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 3: matrices as linear transformations of the plane (reflections, rotations, enlargements, stretches), finding a matrix from the images of i and j, successive transformations (NM: M first), the determinant as the area scale factor and orientation, singular matrices and inverses, invariant points and invariant lines.",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 3: 3 × 3 matrices as transformations in 3D (rotations about the axes, reflections in planes, enlargements, stretches), the determinant as the volume scale factor. Eigenvalues and eigenvectors (Mv = λv) go beyond the Core Pure content." } },
  missions: [
    { title: "Columns are images of i and j", q: "Choose 'type your own' and drag the tips of the red (i) and green (j) arrows. Read the matrix. What are its columns?", hint: "The first column is where i = (1, 0) goes; the second is where j = (0, 1) goes. To write down any linear transformation's matrix, find the images of i and j.", setup: () => set({ preset: "custom", M: [1, 1, 0, 1] }) },
    { title: "Rotation by 90°", q: "Rotation by 90° anticlockwise. Where do i and j go? Check the matrix (0 −1; 1 0). Is the area of the F changed?", hint: "i → j = (0, 1) and j → −i = (−1, 0). det = 1: the area is unchanged and the F is not flipped (rotations are direct isometries).", setup: () => set({ preset: "rot", t: 90 }) },
    { title: "Reflection flips", q: "Reflect in y = x. What is the determinant? Look at the F: what has happened to it?", hint: "M = (0 1; 1 0), det = −1: the area is the same but the F reads backwards (orientation reversed). Every reflection has determinant −1.", setup: () => set({ preset: "refl", t: 45 }) },
    { title: "Determinant = area scale factor", q: "Stretch parallel to x by k. How does the area of the unit square change? Try a shear: why is the area unchanged?", hint: "A stretch by k multiplies area by k = det. A shear (1 k; 0 1) has det 1: the square becomes a parallelogram with the same base and height.", setup: () => set({ preset: "sx", k: 2, shape: "square" }) },
    { title: "Squashed flat: singular matrices", q: "Choose the singular matrix (1 2; 0.5 1). What happens to the whole plane? Why can't it be undone?", hint: "det = 1 − 1 = 0: every point lands on the line y = x/2, so the area becomes 0. Many points go to the same image, so there is no inverse.", setup: () => set({ preset: "sing" }) },
    { title: "Order matters", q: "Do a reflection in the x-axis and then a rotation by 90°. Now swap the order (choose rotation first). Is it the same transformation?", hint: "No: reflection then rotation gives (0 1; 1 0) (reflection in y = x), but rotation then reflection gives (0 −1; −1 0) (reflection in y = −x). Matrix multiplication is not commutative: NM ≠ MN.", setup: () => set({ preset: "refl", t: 0, comp: true, preset2: "rot", t2: 90 }) },
    { title: "Invariant lines", q: "Stretch parallel to y by 2. Which lines through the origin are mapped to themselves? Is every point on them fixed?", hint: "The x-axis is a line of invariant points (every point fixed, λ = 1). The y-axis is an invariant line but its points move along it (doubled, λ = 2).", setup: () => set({ preset: "sy", k: 2 }) },
    { title: "Shear: one invariant line", q: "The shear (1 1; 0 1). How many invariant lines through the origin are there?", hint: "Only one: the x-axis, a line of invariant points. A rotation (other than 0° or 180°) has none at all: no real eigenvalues.", setup: () => set({ preset: "shear", k: 1 }) },
    { lvl: "adv", title: "3D: volume scale factor", q: "Switch to 3D. Compare the determinants of a rotation, a reflection in z = 0, a stretch (2, 1, 0.5) and an enlargement × 1.5. What does each do to the cube's volume?", hint: "Rotation det 1 (volume kept), reflection −1 (volume kept, flipped), stretch 2 × 1 × 0.5 = 1 (volume kept, shape changed!), enlargement 1.5³ = 3.375.", setup: () => set({ view: "3d", p3: "st" }) },
  ],
  batch: [
    { title: "Random matrices: how often is the shape flipped?", question: "If the four entries are random numbers between −1 and 1, how often is the determinant negative?", how: "Each run: 200 random matrices; records the fraction with det < 0.", yLabel: "fraction with det < 0", reps: 300, bins: 20, theory: 0.5, theoryLabel: "½ by symmetry", run: (x, r) => { let k = 0; for (let i = 0; i < 200; i++) if (det2([2 * r() - 1, 2 * r() - 1, 2 * r() - 1, 2 * r() - 1]) < 0) k++; return k / 200; }, note: "Swapping the two columns changes the sign of det but not the chance of the matrix, so exactly half flip the plane." },
    { title: "Enlargement and area", question: "An enlargement by k: how does the area of a random triangle scale?", how: "Each run: a random triangle; records area(image) ÷ area(original).", xLabel: "scale factor k", yLabel: "area ratio", xs: [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5], reps: 3, yMin: 0, theory: k => k * k, theoryLabel: "det = k²", run: (k, r) => { const T = [[r(), r()], [r(), r()], [r(), r()]], A = t => Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2, M = [k, 0, 0, k]; return A(T.map(p => app2(M, p))) / A(T); }, note: "Exactly k² for every triangle: the determinant scales EVERY area by the same factor, whatever the shape or position. A negative k is a rotation by 180° as well." },
    { title: "det(AB) = det A × det B", question: "For random matrices A and B, how far is det(AB) from det A × det B?", how: "Each run: one random pair (entries −1 to 1); records det(AB) − det A det B.", yLabel: "det(AB) − det(A)det(B)", reps: 300, bins: 20, lo: -1e-15, hi: 1e-15, theory: 0, theoryLabel: "0 exactly", run: (x, r) => { const A = [0, 0, 0, 0].map(() => 2 * r() - 1), B = [0, 0, 0, 0].map(() => 2 * r() - 1); return det2(mul2(A, B)) - det2(A) * det2(B); }, note: "Zero apart from computer rounding (about 10⁻¹⁶): area scale factors multiply when transformations are combined." },
    { title: "Random matrices: are there invariant lines?", question: "With random entries between −1 and 1, how often does a 2 × 2 matrix have invariant lines through the origin (real eigenvalues)?", how: "Each run: 200 random matrices; records the fraction with (a + d)² − 4 det ≥ 0.", yLabel: "fraction with real eigenvalues", reps: 300, bins: 20, run: (x, r) => { let k = 0; for (let i = 0; i < 200; i++) { const m = [2 * r() - 1, 2 * r() - 1, 2 * r() - 1, 2 * r() - 1]; if ((m[0] + m[3]) ** 2 - 4 * det2(m) >= 0) k++; } return k / 200; }, note: "About 68% (a computer estimate from millions of matrices gives 0.680): most random matrices have two invariant lines through the origin; the rest turn every line (complex eigenvalues, like a rotation)." },
    { title: "Rotating n times by 360°/n", question: "Apply a rotation by 360°/n, n times. How far does the point (1, 0) end up from where it started?", how: "Exact calculation in computer arithmetic.", xLabel: "n", yLabel: "distance from (1, 0)", xs: [3, 4, 6, 12, 24, 60, 360], reps: 1, yMin: 0, theory: () => 0, theoryLabel: "0 (Rⁿ = I)", run: n => { const t = 2 * Math.PI / n, R = [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)]; let p = [1, 0]; for (let i = 0; i < n; i++) p = app2(R, p); return Math.hypot(p[0] - 1, p[1]); }, note: "Rⁿ = I exactly, but each step rounds a little; after 360 steps the error is still only about 10⁻¹³." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP3", text: "The columns of M are the images of i and j. Rotation by θ anticlockwise: (cos θ −sin θ; sin θ cos θ). Reflection in y = x tan θ: (cos 2θ sin 2θ; sin 2θ −cos 2θ). Enlargement k: (k 0; 0 k)." },
      { lvl: "std", tag: "CP3", text: "NM means apply M first, then N. Matrix multiplication is associative but not commutative." },
      { lvl: "std", tag: "CP3", text: "det(ab; cd) = ad − bc = area scale factor; negative means orientation is reversed. det = 0: singular, no inverse. M⁻¹ = (1/det)(d −b; −c a); (AB)⁻¹ = B⁻¹A⁻¹." },
      { lvl: "std", tag: "CP3", text: "Invariant point: Mx = x. Line of invariant points: every point fixed. Invariant line: every point maps to a point on the same line. To find them, substitute y = mx (+ c) and compare." },
      { lvl: "adv", tag: "CP3", text: "3 × 3 matrices: columns are the images of i, j, k. Rotations about the x-, y- and z-axes; reflections in x = 0, y = 0, z = 0 (and planes like x = y). det = volume scale factor." },
      { lvl: "beyond", tag: "beyond", text: "Eigenvectors: Mv = λv. Lines through the origin along real eigenvectors are invariant; λ = 1 gives a line of invariant points. Find λ from det(M − λI) = 0." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const m = matNow(); return `M = (${f2(m[0])} ${f2(m[1])}; ${f2(m[2])} ${f2(m[3])}). A shape of area 5 is transformed by M. Find the area of its image and say whether its orientation is reversed.`; }, ans: () => { const m = matNow(), d = det2(m); return `<ul><li>det M = ${f2(m[0])} × ${f2(m[3])} − ${f2(m[1])} × ${f2(m[2])} = ${f2(d)}</li><li>area = 5 × |det M| = ${f2(5 * Math.abs(d))}</li><li>${d < 0 ? "det < 0: orientation reversed" : d > 0 ? "det > 0: orientation kept" : "det = 0: squashed onto a line"}</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Find the matrix for a reflection in the x-axis followed by a rotation of 90° anticlockwise, and describe it as a single transformation.", ans: "<ul><li>reflection X = (1 0; 0 −1), rotation R = (0 −1; 1 0)</li><li>RX = (0 1; 1 0)</li><li>a reflection in the line y = x</li></ul>" },
      { lvl: "std", marks: 4, q: "Find the invariant lines of M = (1 0; 0 2) of the form y = mx.", ans: "<ul><li>(x, mx) → (x, 2mx)</li><li>on the line if 2mx = m·x, so m = 0: y = 0 (the x-axis)</li><li>also x = 0 (the y-axis): (0, y) → (0, 2y)</li><li>y = 0 is a line of invariant points</li></ul>" },
      { lvl: "adv", marks: 3, q: "Find the determinant of the stretch (2 0 0; 0 1 0; 0 0 0.5) and describe the effect on a cube of volume 8 cm³.", ans: "<ul><li>det = 2 × 1 × 0.5 = 1</li><li>volume of image = 8 cm³</li><li>the shape changes (a cuboid 2× as long, half as high) but its volume does not</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>The shape (and the grid) is transformed point by point by M. ▶ replays the change from the identity to M, so you can watch where each point goes.</li><li>Red and green arrows are the images of i and j: the columns of M. In "type your own", drag their tips.</li><li>Invariant lines through the origin are found from the real eigenvectors; a line of invariant points (λ = 1) is drawn solid.</li><li>3D: the unit cube and its image under a 3 × 3 matrix, drawn in perspective and slowly turning.</li></ul>
<h3>Simplifications</h3><ul><li>Only invariant lines through the origin are drawn; a transformation can also have invariant lines that do not pass through the origin (e.g. a shear keeps every line parallel to its fixed axis).</li><li>Tips snap to 0.25 when dragged.</li><li>The animation interpolates the matrix entries in a straight line, which is not how a rotation "really" turns (the shape shrinks a little half way).</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("View");
C.view = K.seg(g, { value: "2d", options: [["2d", "2 × 2 in the plane"], ["3d", "3 × 3 in space (A level)"]], on: v => { P.view = v; showCtl(); anim = 0; } });
const g2 = ui.group("Transformation M"), g3 = ui.group("3D transformation");
C.preset = K.seg(g2, { value: "rot", options: Object.entries(PRESETS).map(([k, v]) => [k, v.name]), on: v => { P.preset = v; showCtl(); anim = 0; } });
C.t = K.slider(g2, { label: "θ", min: -180, max: 180, step: 5, value: 90, unit: "°", on: v => { P.t = v; anim = 1; } });
C.k = K.slider(g2, { label: "k", min: -3, max: 3, step: 0.25, value: 2, fmt: v => v.toFixed(2), on: v => { P.k = v; anim = 1; } });
C.comp = K.toggle(g2, { label: "Then apply a second transformation N (shows NM)", value: false, on: v => { P.comp = v; showCtl(); anim = 0; } });
C.preset2 = K.seg(g2, { value: "refl", options: Object.entries(PRESETS).filter(([k]) => k !== "custom" && k !== "sing").map(([k, v]) => [k, v.name]), on: v => { P.preset2 = v; anim = 0; } });
C.t2 = K.slider(g2, { label: "θ for N", min: -180, max: 180, step: 5, value: 0, unit: "°", on: v => { P.t2 = v; anim = 1; } });
C.shape = K.seg(g2, { label: "Shape", value: "F", options: [["F", "letter F"], ["square", "unit square"], ["tri", "triangle"]], on: v => P.shape = v });
C.showInv = K.toggle(g2, { label: "Show invariant lines through the origin", value: true, on: v => P.showInv = v });
C.showGrid = K.toggle(g2, { label: "Show the transformed grid", value: true, on: v => P.showGrid = v });
let rw = K.row(g2); K.btn(rw, "▶ Replay", () => { anim = 0; ui.setPlaying(true); }, "primary");
C.p3 = K.seg(g3, { value: "rz", options: Object.entries(P3).map(([k, v]) => [k, v.name]), on: v => { P.p3 = v; anim = 0; } });
C.t3 = K.slider(g3, { label: "Angle (rotations)", min: -180, max: 180, step: 5, value: 90, unit: "°", on: v => { P.t3 = v; anim = 1; } });
const read = K.readout(ui.group("Numbers"), [["m", "Matrix"], ["det", "Determinant"], ["inv", "Inverse"], ["il", "Invariant lines through O"]]);
function showCtl() {
  g2.style.display = P.view === "2d" ? "" : "none"; g3.style.display = P.view === "3d" ? "" : "none";
  C.t.el.style.display = PRESETS[P.preset].uses === "t" ? "" : "none"; C.k.el.style.display = PRESETS[P.preset].uses === "k" || (P.comp && PRESETS[P.preset2].uses === "k") ? "" : "none";
  C.preset2.el.style.display = P.comp ? "" : "none"; C.t2.el.style.display = P.comp && PRESETS[P.preset2].uses === "t" ? "" : "none";
  C.view.el.querySelectorAll("button")[1].style.display = ui.level === "adv" ? "" : "none";
}
function set(o) { Object.assign(P, JSON.parse(JSON.stringify(DEF)), o); if (P.view === "3d" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["view", "preset", "t", "k", "comp", "preset2", "t2", "shape", "showInv", "showGrid", "p3", "t3"]) C[k].set(P[k]); anim = 0; showCtl(); }

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
let V = null, spin = 0;
const S = p => [V.ox + p[0] * V.u, V.oy - p[1] * V.u], W = (x, y) => [(x - V.ox) / V.u, (V.oy - y) / V.u];
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrow(c, p, col, w = 3) { const [x0, y0] = S([0, 0]), [x1, y1] = S(p), a = Math.atan2(y1 - y0, x1 - x0); c.strokeStyle = c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (Math.hypot(x1 - x0, y1 - y0) > 8) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 11 * Math.cos(a - 0.4), y1 - 11 * Math.sin(a - 0.4)); c.lineTo(x1 - 11 * Math.cos(a + 0.4), y1 - 11 * Math.sin(a + 0.4)); c.fill(); } c.lineWidth = 1; }
K.pointer(cv.el, {
  down: p => { if (P.view !== "2d" || P.preset !== "custom" || P.comp) return; const m = P.M, [ix, iy] = S([m[0], m[2]]), [jx, jy] = S([m[1], m[3]]); drag = Math.hypot(p.x - ix, p.y - iy) < Math.hypot(p.x - jx, p.y - jy) ? "i" : "j"; dragTo(p); },
  drag: p => dragTo(p), up: () => drag = null, hover: () => cv.el.style.cursor = P.preset === "custom" && P.view === "2d" ? "grab" : "default"
});
function dragTo(p) { if (!drag) return; const [x, y] = W(p.x, p.y), sn = v => K.clamp(Math.round(v * 4) / 4, -4, 4); if (drag === "i") { P.M[0] = sn(x); P.M[2] = sn(y); } else { P.M[1] = sn(x); P.M[3] = sn(y); } anim = 1; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (ui.playing) anim = Math.min(1, anim + dt / 2);
  const ease = anim < 1 ? anim * anim * (3 - 2 * anim) : 1;
  if (P.view === "3d") return draw3(c, w, h, ease, dt);
  V = { u: Math.min(w, h) / 13, ox: w / 2, oy: h / 2 + Math.min(w, h) * 0.08 };
  const Mfull = matNow(), M = P.comp ? (ease < 0.5 ? lerpM([1, 0, 0, 1], matA(), ease * 2) : lerpM(matA(), Mfull, ease * 2 - 1)) : lerpM([1, 0, 0, 1], Mfull, ease);
  // the original grid, faint; the transformed grid
  c.strokeStyle = "#141d33"; for (let k = -12; k <= 12; k++) { const [x] = S([k, 0]), [, y] = S([0, k]); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(0, V.oy); c.lineTo(w, V.oy); c.moveTo(V.ox, 0); c.lineTo(V.ox, h); c.stroke();
  if (P.showGrid) { c.strokeStyle = "rgba(90,209,255,.18)"; for (let k = -10; k <= 10; k++) { for (const [a, b] of [[[k, -10], [k, 10]], [[-10, k], [10, k]]]) { const [x1, y1] = S(app2(M, a)), [x2, y2] = S(app2(M, b)); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } } }
  // invariant lines (of the final matrix)
  if (P.showInv && anim >= 1) for (const e of eig2(Mfull)) { const L = 20, [x1, y1] = S([-e.v[0] * L, -e.v[1] * L]), [x2, y2] = S([e.v[0] * L, e.v[1] * L]); c.strokeStyle = Math.abs(e.l - 1) < 1e-9 ? "#ffe66d" : "rgba(255,230,109,.6)"; c.lineWidth = Math.abs(e.l - 1) < 1e-9 ? 3 : 2; c.setLineDash(Math.abs(e.l - 1) < 1e-9 ? [] : [8, 6]); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); c.lineWidth = 1; const [lx, ly] = S([e.v[0] * 3.6, e.v[1] * 3.6]); TX(c, Math.abs(e.l - 1) < 1e-9 ? "invariant points" : `invariant line (×${f2(e.l)})`, lx + 6, ly - 6, "#ffe66d", "left", "11px"); }
  // the shape before (outline) and after (filled)
  const shp = SHAPES[P.shape], poly = (pts, fill, stroke, lw) => { c.beginPath(); pts.forEach((p, i) => { const [x, y] = S(p); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); c.lineWidth = 1; };
  poly(shp, null, "rgba(255,255,255,.35)", 1.5); const img = shp.map(p => app2(M, p)); poly(img, det2(M) < 0 ? "rgba(255,123,156,.35)" : "rgba(126,231,135,.3)", det2(M) < 0 ? "#ff7b9c" : "#7ee787", 2.5);
  const [cx, cy] = S(app2(M, [0.3, 0.3])); TX(c, "●", cx, cy + 4, "#fff", "center", "10px");   // a marker in one corner shows the orientation
  arrow(c, [M[0], M[2]], "#ff6b6b"); arrow(c, [M[1], M[3]], "#3ddc84"); const [ix, iy] = S([M[0], M[2]]), [jx, jy] = S([M[1], M[3]]);
  TX(c, `i → (${f2(M[0])}, ${f2(M[2])})`, ix + 8, iy + 16, "#ff6b6b", "left", "600 12px"); TX(c, `j → (${f2(M[1])}, ${f2(M[3])})`, jx + 8, jy - 8, "#3ddc84", "left", "600 12px");
  if (P.preset === "custom" && !P.comp) for (const [x, y] of [[ix, iy], [jx, jy]]) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9, 0, 6.3); c.stroke(); c.lineWidth = 1; }
  const d = det2(M); ui.hud(`M = (${f2(Mfull[0])} ${f2(Mfull[1])} ; ${f2(Mfull[2])} ${f2(Mfull[3])})${P.comp ? "  = N × M₁" : ""}<br>det = ${f2(det2(Mfull))}: area × ${f2(Math.abs(det2(Mfull)))}${det2(Mfull) < 0 ? ", flipped" : det2(Mfull) === 0 ? ", squashed flat" : ""}${anim < 1 ? "<br>(animating…)" : ""}`);
}
function draw3(c, w, h, ease, dt) {
  spin += dt * 0.25; const M = lerpM([1, 0, 0, 0, 1, 0, 0, 0, 1], P3[P.p3].m(rad(P.t3)), ease), D = det3(P3[P.p3].m(rad(P.t3)));
  // simple perspective camera that slowly turns around the scene
  const cy = Math.cos(spin), sy = Math.sin(spin), el = 0.45, u = Math.min(w, h) / 3.6;
  const proj = p => { let x = p[0] * cy - p[1] * sy, y = p[0] * sy + p[1] * cy, z = p[2]; const y2 = y * Math.cos(el) - z * Math.sin(el), z2 = y * Math.sin(el) + z * Math.cos(el), f = 7 / (7 + y2); return [w / 2 + x * u * f, h / 2 + 30 - z2 * u * f]; };
  const line = (a, b, col, lw = 1.5, dash) => { const [x1, y1] = proj(a), [x2, y2] = proj(b); c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); c.lineWidth = 1; };
  for (const [a, col, nm] of [[[2.6, 0, 0], "#ff6b6b", "x"], [[0, 2.6, 0], "#3ddc84", "y"], [[0, 0, 2.6], "#5ad1ff", "z"]]) { line([0, 0, 0], a, col + "66", 1); const [x, y] = proj(a); TX(c, nm, x + 4, y, col); }
  const V8 = []; for (let i = 0; i < 8; i++) V8.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]); const E = []; for (let i = 0; i < 8; i++) for (let b = 1; b < 8; b <<= 1) if (!(i & b)) E.push([i, i | b]);
  for (const [a, b] of E) line(V8[a], V8[b], "rgba(255,255,255,.3)", 1, [4, 4]);
  for (const [a, b] of E) line(app3(M, V8[a]), app3(M, V8[b]), D < 0 ? "#ff7b9c" : "#7ee787", 2.5);
  for (const [k, col, nm] of [[0, "#ff6b6b", "i"], [1, "#3ddc84", "j"], [2, "#5ad1ff", "k"]]) { const e = [0, 0, 0]; e[k] = 1; const im = app3(M, e); line([0, 0, 0], im, col, 3.5); const [x, y] = proj(im); TX(c, nm + " → (" + im.map(f2).join(", ") + ")", x + 6, y - 6, col, "left", "600 12px"); }
  ui.hud(`${P3[P.p3].name}<br>det = ${f2(D)}: volume × ${f2(Math.abs(D))}${D < 0 ? ", reflected" : ""}`);
}
function panels() {
  if (P.view === "3d") { const M = P3[P.p3].m(rad(P.t3)); read.set("m", `(${M.slice(0, 3).map(f2).join(" ")} ; ${M.slice(3, 6).map(f2).join(" ")} ; ${M.slice(6).map(f2).join(" ")})`); read.set("det", f2(det3(M)) + " (volume scale factor)"); read.set("inv", Math.abs(det3(M)) > 1e-9 ? "exists" : "none (singular)"); read.set("il", "–");
    const keys = Object.keys(P3); chA.opts.xFmt = v => Math.abs(v - Math.round(v)) < 1e-6 && keys[Math.round(v)] ? ["Rz", "Rx", "refl z", "refl x=y", "stretch", "enlarge", "shear"][Math.round(v)] : ""; chA.opts.title = "Determinant of each 3D transformation"; chA.opts.xLabel = ""; chA.opts.yLabel = "det";
    chA.draw([{ pts: keys.map((k, i) => [i, det3(P3[k].m(rad(P.t3)))]), type: "bars", w: 0.6, color: K.cssVar("--s2") }], { xMin: -0.6, xMax: keys.length - 0.4, hlines: [{ y: 0 }] });
    const E = []; for (let q = 0; q <= 2.001; q += 0.05) E.push([q, q ** 3]); chB.opts.xFmt = null; chB.opts.title = "Enlargement by s: volume scale factor s³"; chB.opts.xLabel = "s"; chB.opts.yLabel = "det"; chB.draw([{ pts: E, color: K.cssVar("--s1"), label: "s³" }], { vlines: [{ x: 1.5, label: "× 1.5 → 3.375" }] }); return; }
  chA.opts.xFmt = null;
  const M = matNow(), d = det2(M), iv = inv2(M), ev = eig2(M);
  read.set("m", `(${f2(M[0])} ${f2(M[1])} ; ${f2(M[2])} ${f2(M[3])})`); read.set("det", `${f2(d)}${d < 0 ? " (flips)" : ""}`); read.set("inv", iv ? `(${iv.map(f2).slice(0, 2).join(" ")} ; ${iv.map(f2).slice(2).join(" ")})` : "none: det = 0");
  read.set("il", ev.length ? ev.map(e => (Math.abs(e.v[0]) < 1e-9 ? "x = 0" : `y = ${f2(e.v[1] / e.v[0])}x`) + (Math.abs(e.l - 1) < 1e-9 ? " (points fixed)" : ` (×${f2(e.l)})`)).join("; ") : "none (no real eigenvalues)");
  // chart A: area scale factor as the preset parameter varies; chart B: where i and j go as θ (or k) varies
  const pts = [], key = PRESETS[P.preset].uses; if (key === "t") for (let t = -180; t <= 180; t += 5) pts.push([t, det2(PRESETS[P.preset].m({ t, k: P.k }))]); else if (key === "k") for (let k = -3; k <= 3.001; k += 0.1) pts.push([k, det2(PRESETS[P.preset].m({ t: P.t, k }))]);
  chA.opts.title = "Determinant (area scale factor) as " + (key === "t" ? "θ" : "k") + " changes"; chA.opts.xLabel = key === "t" ? "θ (°)" : "k"; chA.opts.yLabel = "det"; chA.draw(pts.length ? [{ pts, color: K.cssVar("--s2"), label: "det" }] : [], { hlines: [{ y: 0 }], vlines: pts.length ? [{ x: key === "t" ? P.t : P.k }] : [] });
  const I = [], J = []; if (key) { for (let s = 0; s <= 60; s++) { const v = key === "t" ? -180 + 6 * s : -3 + 0.1 * s, m = PRESETS[P.preset].m({ t: v, k: v }); I.push([m[0], m[2]]); J.push([m[1], m[3]]); } }
  chB.opts.title = "Paths of the images of i and j as the parameter varies"; chB.opts.xLabel = "x"; chB.opts.yLabel = "y"; chB.draw(key ? [{ pts: I, color: "#ff6b6b", label: "image of i" }, { pts: J, color: "#3ddc84", label: "image of j" }, { pts: [[M[0], M[2]], [M[1], M[3]]], type: "dots", r: 5, color: K.cssVar("--text") }] : [{ pts: [[M[0], M[2]]], type: "dots", r: 6, color: "#ff6b6b", label: "i" }, { pts: [[M[1], M[3]]], type: "dots", r: 6, color: "#3ddc84", label: "j" }], { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 });
}
let frame = 0;
ui.run(() => { }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.view === "3d") set({}); showCtl(); };
set({});
ui.tip("Red and green arrows are the images of i and j: the columns of the matrix.", 7000);
