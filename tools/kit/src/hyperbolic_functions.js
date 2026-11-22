/* =====================================================================
   HYPERBOLIC FUNCTIONS
       cosh x = (eˣ + e⁻ˣ)/2     sinh x = (eˣ − e⁻ˣ)/2     tanh x = sinh x / cosh x
   They are built from exponentials, but behave like cos and sin:
       cosh²x − sinh²x = 1   (compare cos²x + sin²x = 1)
   so the point (cosh t, sinh t) lies on the HYPERBOLA x² − y² = 1, just
   as (cos t, sin t) lies on the circle x² + y² = 1. In both cases the
   shaded "sector" from the x-axis to the point has area t/2.
   Osborn's rule turns a trig identity into a hyperbolic one: change each
   trig function to its hyperbolic version, and change the sign of any
   product of two sines (e.g. cos 2x = 1 − 2sin²x → cosh 2x = 1 + 2sinh²x).
   INVERSES are logarithms:
       arsinh x = ln(x + √(x² + 1)),  arcosh x = ln(x + √(x² − 1)) (x ≥ 1),
       artanh x = ½ ln((1 + x)/(1 − x)) (|x| < 1).
   CALCULUS: d/dx cosh x = sinh x, d/dx sinh x = cosh x.
   A chain hanging under its own weight takes the shape of y = a cosh(x/a):
   a CATENARY (not a parabola).
   ===================================================================== */
const cosh = Math.cosh, sinh = Math.sinh, tanh = Math.tanh;
const asinh = x => Math.log(x + Math.sqrt(x * x + 1)), acosh = x => Math.log(x + Math.sqrt(x * x - 1)), atanh = x => 0.5 * Math.log((1 + x) / (1 - x));
// arc length of y = a cosh(x/a) from −s to s is 2a sinh(s/a); sag = a cosh(s/a) − a
const catLen = (a, s) => 2 * a * sinh(s / a), catSag = (a, s) => a * (cosh(s / a) - 1);
// find a for a chain of length L hanging between posts 2s apart (halving the interval: longer chain = smaller a)
function catA(L, s) { let lo = 0.05, hi = 1e4; for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); catLen(m, s) > L ? lo = m : hi = m; } return Math.sqrt(lo * hi); }

const DEF = { mode: "graphs", fn: "cosh", parts: true, inv: false, t: 1, L: 12, span: 10 };
const P = Object.assign({}, DEF);
let tA = 0;

const ui = K.app({
  title: "Hyperbolic Functions", subject: "Further Mathematics",
  blurb: "cosh, sinh and tanh built from eˣ and e⁻ˣ, the hyperbola x² − y² = 1 beside the circle, inverses as logarithms, and a hanging chain",
  reset: () => { tA = 0; },
  levels: { std: "Definitions and graphs (9FM0)", adv: "Inverses and calculus (9FM0)", specs: {
    std: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, hyperbolic functions: definitions of sinh, cosh and tanh in terms of eˣ, their graphs and ranges, the identity cosh²x − sinh²x = 1 and other identities (Osborn's rule). Not in AS 8FM0.",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2: inverse hyperbolic functions and their logarithmic forms, differentiating and integrating hyperbolic functions (e.g. ∫ 1/√(x² + 1) dx = arsinh x). The catenary is an application, beyond the specification." } },
  missions: [
    { title: "cosh from two exponentials", q: "Show the two halves ½eˣ and ½e⁻ˣ. How does adding them give cosh x? Why is cosh x never less than 1?", hint: "cosh x is the average of eˣ and e⁻ˣ: for large x the eˣ half dominates; for large negative x the e⁻ˣ half. Their product is ¼, so the sum is smallest (1) when they are equal, at x = 0.", setup: () => set({ fn: "cosh", parts: true }) },
    { title: "sinh and tanh", q: "Look at sinh x and tanh x. Which is odd, which is even? What happens to tanh x for large x?", hint: "sinh and tanh are odd (rotational symmetry), cosh is even. tanh x → ±1: horizontal asymptotes y = ±1, because for large x, sinh and cosh are both almost ½eˣ.", setup: () => set({ fn: "tanh", parts: false }) },
    { title: "The hyperbola and the circle", q: "Move t. The point (cosh t, sinh t) is on x² − y² = 1; (cos t, sin t) is on x² + y² = 1. What is the shaded area in each case?", hint: "Both shaded areas are exactly t/2. For the circle, t is the angle; for the hyperbola, t is not an angle but it plays the same role. That is why they are called hyperbolic functions.", setup: () => set({ mode: "hyper", t: 1 }) },
    { title: "Hanging chain", q: "A 12 m chain hangs between posts 10 m apart. Turn on the parabola with the same ends and lowest point. Is the chain a parabola?", hint: "No: it is a catenary y = a cosh(x/a). Near the bottom they almost agree (cosh u ≈ 1 + u²/2), but the catenary rises more steeply near the posts. A suspension bridge's cable (carrying a level deck) IS a parabola.", setup: () => set({ mode: "chain", L: 12, span: 10 }) },
    { lvl: "adv", title: "Inverses as logarithms", q: "Show the inverse of sinh. Check that arsinh 2 = ln(2 + √5). Why does arcosh need x ≥ 1?", hint: "arsinh 2 = 1.4436 = ln(4.236). Solving sinh y = x: e^y − e^(−y) = 2x is a quadratic in e^y. cosh y ≥ 1, so arcosh is only defined for x ≥ 1 (and we take the positive root).", setup: () => set({ fn: "sinh", inv: true, parts: false }) },
  ],
  batch: [
    { title: "cosh²x − sinh²x = 1?", question: "For random x between −5 and 5, how far is cosh²x − sinh²x from 1?", how: "Each run: one random x; records (cosh²x − sinh²x) − 1 using the exponential definitions.", yLabel: "cosh²x − sinh²x − 1", reps: 300, bins: 20, theory: 0, theoryLabel: "0", run: (x, r) => { const v = 10 * r() - 5, c = (Math.exp(v) + Math.exp(-v)) / 2, s = (Math.exp(v) - Math.exp(-v)) / 2; return c * c - s * s - 1; }, note: "Zero apart from rounding (larger for large |x|, where cosh² and sinh² are big numbers almost equal: subtracting them loses digits)." },
    { title: "Hyperbolic sector area = t/2", question: "Is the area from the x-axis to (cosh t, sinh t) on the hyperbola really t/2?", how: "Area = area of the triangle O-(cosh t, 0)-(cosh t, sinh t) minus the area under the hyperbola from 1 to cosh t, found with 2000 strips.", xLabel: "t", yLabel: "sector area", xs: [0.25, 0.5, 1, 1.5, 2, 2.5, 3], reps: 1, yMin: 0, theory: t => t / 2, theoryLabel: "t/2", run: t => { const X = cosh(t), n = 2000, h = (X - 1) / n; let s = 0; for (let i = 0; i < n; i++) { const x = 1 + (i + 0.5) * h; s += Math.sqrt(x * x - 1) * h; } return X * sinh(t) / 2 - s; }, note: "A straight line of gradient ½: exactly like a circular sector of angle t, whose area is t/2." },
    { title: "Length of a hanging chain", question: "For y = a cosh(x/a) between x = −5 and 5, does adding up tiny straight pieces give 2a sinh(5/a)?", how: "Arc length found from 4000 small straight segments, for each a.", xLabel: "a (m)", yLabel: "chain length (m)", xs: [3, 4, 5, 6, 8, 10, 15], reps: 1, yMin: 10, theory: a => catLen(a, 5), theoryLabel: "2a sinh(5/a)", run: a => { let L = 0, px = -5, py = a * cosh(-5 / a); for (let i = 1; i <= 4000; i++) { const x = -5 + 10 * i / 4000, y = a * cosh(x / a); L += Math.hypot(x - px, y - py); px = x; py = y; } return L; }, note: "Arc length ∫√(1 + sinh²(x/a)) dx = ∫cosh(x/a) dx: the identity cosh² − sinh² = 1 makes the integral easy." },
    { title: "arsinh as a logarithm (A level)", question: "For random x, does ln(x + √(x² + 1)) undo sinh?", how: "Each run: random x between −10 and 10; records sinh(ln(x + √(x² + 1))) − x.", yLabel: "sinh(arsinh x) − x", reps: 300, bins: 20, theory: 0, theoryLabel: "0", run: (x, r) => { const v = 20 * r() - 10; return sinh(asinh(v)) - v; }, note: "Zero up to rounding: the logarithmic form comes from solving e^y − e^(−y) = 2x as a quadratic in e^y." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP2", text: "cosh x = ½(eˣ + e⁻ˣ) (even, range ≥ 1); sinh x = ½(eˣ − e⁻ˣ) (odd, all reals); tanh x = sinh x/cosh x (odd, range −1 < y < 1)." },
      { lvl: "std", tag: "CP2", text: "cosh²x − sinh²x = 1; sinh 2x = 2 sinh x cosh x; cosh 2x = cosh²x + sinh²x = 1 + 2sinh²x. Osborn's rule: replace a product of two sines by minus the product of two sinhs." },
      { lvl: "adv", tag: "CP2", text: "arsinh x = ln(x + √(x² + 1)); arcosh x = ln(x + √(x² − 1)), x ≥ 1; artanh x = ½ ln((1 + x)/(1 − x)), |x| < 1." },
      { lvl: "adv", tag: "CP2", text: "d/dx sinh x = cosh x, d/dx cosh x = sinh x, d/dx tanh x = sech²x. ∫ 1/√(x² + 1) dx = arsinh x + c; ∫ 1/√(x² − 1) dx = arcosh x + c." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Prove from the definitions that cosh²x − sinh²x = 1.", ans: "<ul><li>cosh²x = ¼(e^(2x) + 2 + e^(−2x))</li><li>sinh²x = ¼(e^(2x) − 2 + e^(−2x))</li><li>difference = ¼ × 4 = 1</li></ul>" },
      { lvl: "std", marks: 4, q: "Solve cosh x = 2, giving your answers as logarithms.", ans: "<ul><li>eˣ + e⁻ˣ = 4, so e^(2x) − 4eˣ + 1 = 0</li><li>eˣ = 2 ± √3</li><li>x = ln(2 + √3) or ln(2 − √3)</li><li>= ±ln(2 + √3) ≈ ±1.317</li></ul>" },
      { lvl: "adv", marks: 4, q: "Show that arsinh x = ln(x + √(x² + 1)).", ans: "<ul><li>let y = arsinh x, so x = sinh y = ½(e^y − e^(−y))</li><li>e^(2y) − 2xe^y − 1 = 0</li><li>e^y = x ± √(x² + 1); take + since e^y > 0</li><li>y = ln(x + √(x² + 1))</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A chain of length ${P.L} m hangs between posts ${P.span} m apart in the shape y = a cosh(x/a). Show that a satisfies 2a sinh(${P.span / 2}/a) = ${P.L}, and use the page to find the sag.`, ans: () => { const a = catA(P.L, P.span / 2); return `<ul><li>arc length = ∫ cosh(x/a) dx from −${P.span / 2} to ${P.span / 2} = 2a sinh(${P.span / 2}/a)</li><li>a ≈ ${a.toFixed(3)} m</li><li>sag = a(cosh(${P.span / 2}/a) − 1) ≈ ${catSag(a, P.span / 2).toFixed(3)} m</li></ul>`; } },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Graphs:</b> sinh, cosh and tanh drawn from their exponential definitions, optionally with the two halves ½eˣ and ±½e⁻ˣ, and (A level) the inverse function as the reflection in y = x.</li><li><b>Hyperbola and circle:</b> the point (cosh t, sinh t) and (cos t, sin t) with the "sector" of area t/2 shaded.</li><li><b>Chain:</b> for a chain of length L between posts, a is found from 2a sinh(s/a) = L by repeated halving; a parabola with the same ends and lowest point is drawn for comparison.</li></ul>
<h3>Simplifications</h3><ul><li>The chain is perfectly flexible and uniform, and does not stretch; the posts are at the same height.</li></ul>`,
});

const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "graphs", options: [["graphs", "graphs"], ["hyper", "hyperbola and circle"], ["chain", "hanging chain"]], on: v => set({ mode: v }) });
const gg = ui.group("Graphs"), gh = ui.group("Hyperbola"), gc = ui.group("Chain");
C.fn = K.seg(gg, { value: "cosh", options: [["cosh", "cosh x"], ["sinh", "sinh x"], ["tanh", "tanh x"], ["all", "all three"]], on: v => P.fn = v });
C.parts = K.toggle(gg, { label: "Show ½eˣ and ½e⁻ˣ", value: true, on: v => P.parts = v });
C.inv = K.toggle(gg, { label: "Show the inverse function (A level)", value: false, on: v => P.inv = v });
C.t = K.slider(gh, { label: "t", min: -2.5, max: 2.5, step: 0.05, value: 1, fmt: v => v.toFixed(2), on: v => P.t = v });
C.L = K.slider(gc, { label: "Chain length L", min: 10.2, max: 30, step: 0.2, value: 12, unit: "m", on: v => P.L = Math.max(v, P.span + 0.1) });
C.span = K.slider(gc, { label: "Distance between posts", min: 2, max: 20, step: 0.5, value: 10, unit: "m", on: v => { P.span = v; if (P.L <= v) { P.L = v + 0.2; C.L.set(P.L); } } });
C.para = K.toggle(gc, { label: "Compare with a parabola", value: true, on: v => P.para = v }); P.para = true;
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gg.style.display = P.mode === "graphs" ? "" : "none"; gh.style.display = P.mode === "hyper" ? "" : "none"; gc.style.display = P.mode === "chain" ? "" : "none"; C.inv.el.style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, { para: true }, o); if (o.inv && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["t", "L", "span"]) C[k].set(P[k]); for (const k of ["mode", "fn", "parts", "inv"]) C[k].set(P[k]); C.para.set(true); showCtl(); }

const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let V; const SX = x => V.ox + x * V.u, SY = y => V.oy - y * V.u, WX = px => (px - V.ox) / V.u;
function grid(c, w, h) { c.strokeStyle = "#16203a"; const st = V.u > 40 ? 1 : 2; for (let k = -40; k <= 40; k += st) { c.beginPath(); c.moveTo(SX(k), 0); c.lineTo(SX(k), h); c.moveTo(0, SY(k)); c.lineTo(w, SY(k)); c.stroke(); if (k) { TX(c, k, SX(k), V.oy + 13, "#5d6e93", "center", "10px"); TX(c, k, V.ox - 5, SY(k) + 4, "#5d6e93", "right", "10px"); } } c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(0, V.oy); c.lineTo(w, V.oy); c.moveTo(V.ox, 0); c.lineTo(V.ox, h); c.stroke(); }
function curve(c, f, col, lw = 2.5, dash, x0, x1) { c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); let pen = false; for (let px = 0; px <= cv.w; px += 1.5) { const x = WX(px); if ((x0 != null && x < x0) || (x1 != null && x > x1)) { pen = false; continue; } const y = f(x); if (!isFinite(y) || Math.abs(y) > 100) { pen = false; continue; } pen ? c.lineTo(px, SY(y)) : c.moveTo(px, SY(y)); pen = true; } c.stroke(); c.setLineDash([]); c.lineWidth = 1; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); tA += dt;
  if (P.mode === "graphs") {
    V = { u: Math.min(w / 10, h / 8), ox: w / 2, oy: h / 2 + (P.fn === "cosh" ? h * 0.25 : 0) }; grid(c, w, h);
    const F = { cosh: [cosh, "#ffb454", "cosh x", acosh, 1], sinh: [sinh, "#5ad1ff", "sinh x", asinh, -Infinity], tanh: [tanh, "#7ee787", "tanh x", atanh, -1] };
    const list = P.fn === "all" ? ["cosh", "sinh", "tanh"] : [P.fn];
    if (P.parts && P.fn !== "tanh") { curve(c, x => Math.exp(x) / 2, "rgba(255,123,156,.7)", 1.5, [5, 4]); curve(c, x => (P.fn === "sinh" ? -1 : 1) * Math.exp(-x) / 2, "rgba(196,161,255,.8)", 1.5, [5, 4]); TX(c, "½eˣ", SX(1.8), SY(Math.exp(1.8) / 2) - 6, "#ff7b9c"); TX(c, P.fn === "sinh" ? "−½e⁻ˣ" : "½e⁻ˣ", SX(-2.2), SY((P.fn === "sinh" ? -1 : 1) * Math.exp(2.2) / 2) - 6, "#c4a1ff", "right"); }
    if (list.includes("tanh")) for (const y of [1, -1]) { c.strokeStyle = "rgba(126,231,135,.4)"; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(0, SY(y)); c.lineTo(w, SY(y)); c.stroke(); c.setLineDash([]); }
    for (const k of list) { const [f, col, nm, inv, lo] = F[k]; curve(c, f, col, 3); TX(c, nm, SX(1.5) + 6, SY(f(1.5)) + (k === "tanh" ? 16 : 0), col, "left", "600 13px"); if (P.inv && ui.level === "adv") { curve(c, x => inv(x), col, 2, [8, 4], k === "cosh" ? 1 : k === "tanh" ? -0.999 : null, k === "tanh" ? 0.999 : null); curve(c, x => x, "rgba(255,255,255,.25)", 1, [2, 4]); TX(c, "ar" + nm.replace(" x", "") + " x", SX(3) + 4, SY(inv(3) || 0) - 6, col, "left", "12px"); } }
    const x = 2.5 * Math.sin(tA * 0.5); for (const k of list) { const [f, col] = F[k]; c.fillStyle = col; c.beginPath(); c.arc(SX(x), SY(f(x)), 5, 0, 6.3); c.fill(); }
    ui.hud(`x = ${x.toFixed(2)}<br>cosh x = ${cosh(x).toFixed(3)}, sinh x = ${sinh(x).toFixed(3)}<br>cosh² − sinh² = ${(cosh(x) ** 2 - sinh(x) ** 2).toFixed(6)}`);
  } else if (P.mode === "hyper") {
    V = { u: Math.min(w / 14, h / 9), ox: w / 2 - w * 0.08, oy: h / 2 }; grid(c, w, h);
    c.strokeStyle = "rgba(90,209,255,.5)"; c.lineWidth = 2; c.beginPath(); c.arc(V.ox, V.oy, V.u, 0, 6.3); c.stroke(); c.lineWidth = 1;
    for (const s of [1, -1]) { c.strokeStyle = "rgba(255,180,84,.7)"; c.lineWidth = 2; c.beginPath(); for (let t = -3; t <= 3.001; t += 0.02) { const X = SX(s * cosh(t)), Y = SY(sinh(t)); t === -3 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.stroke(); c.lineWidth = 1; }
    for (const s of [1, -1]) { c.strokeStyle = "rgba(255,255,255,.2)"; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(SX(-8), SY(-8 * s)); c.lineTo(SX(8), SY(8 * s)); c.stroke(); c.setLineDash([]); }
    const t = P.tc = P.t; // shaded hyperbolic sector: O → (1,0) → along the hyperbola to (cosh t, sinh t) → O
    c.fillStyle = "rgba(255,180,84,.25)"; c.beginPath(); c.moveTo(V.ox, V.oy); for (let k = 0; k <= 60; k++) { const u = t * k / 60; c.lineTo(SX(cosh(u)), SY(sinh(u))); } c.closePath(); c.fill();
    c.fillStyle = "rgba(90,209,255,.25)"; c.beginPath(); c.moveTo(V.ox, V.oy); c.arc(V.ox, V.oy, V.u, 0, -t, t > 0); c.closePath(); c.fill();
    const [hx, hy] = [cosh(t), sinh(t)]; c.fillStyle = "#ffb454"; c.beginPath(); c.arc(SX(hx), SY(hy), 6, 0, 6.3); c.fill(); TX(c, `(cosh t, sinh t) = (${hx.toFixed(2)}, ${hy.toFixed(2)})`, SX(hx) + 10, SY(hy) - 8, "#ffb454", "left", "600 12px");
    c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(SX(Math.cos(t)), SY(Math.sin(t)), 6, 0, 6.3); c.fill(); TX(c, `(cos t, sin t)`, SX(Math.cos(t)) - 10, SY(Math.sin(t)) - 10, "#5ad1ff", "right", "600 12px");
    TX(c, "x² − y² = 1", SX(3.2), SY(3.1), "#ffb454", "left", "13px"); TX(c, "x² + y² = 1", SX(-0.7), SY(1.2), "#5ad1ff", "right", "13px");
    ui.hud(`t = ${t.toFixed(2)}<br>both shaded areas = t/2 = ${(t / 2).toFixed(3)}`);
  } else {
    const s = P.span / 2, a = catA(P.L, s), sag = catSag(a, s), sc = Math.min((w - 140) / P.span, (h - 120) / Math.max(sag, 1)), ox = w / 2, top = 60, Y = y => top + (a + sag - y) * sc;
    c.fillStyle = "#13301f"; c.fillRect(0, h - 30, w, 30);
    for (const sx of [-s, s]) { c.fillStyle = "#5d6e93"; c.fillRect(ox + sx * sc - 4, Y(a + sag) - 4, 8, h - 30 - Y(a + sag) + 4); }
    if (P.para) { c.strokeStyle = "rgba(126,231,135,.8)"; c.setLineDash([6, 4]); c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 100; i++) { const x = -s + 2 * s * i / 100, y = a + sag * (x / s) ** 2; i ? c.lineTo(ox + x * sc, Y(y)) : c.moveTo(ox + x * sc, Y(y)); } c.stroke(); c.setLineDash([]); c.lineWidth = 1; TX(c, "parabola (same ends and lowest point)", ox, Y(a) + 34, "#7ee787", "center", "12px"); }
    c.strokeStyle = "#ffb454"; c.lineWidth = 4; c.beginPath(); for (let i = 0; i <= 200; i++) { const x = -s + 2 * s * i / 200, y = a * cosh(x / a); i ? c.lineTo(ox + x * sc, Y(y)) : c.moveTo(ox + x * sc, Y(y)); } c.stroke(); c.lineWidth = 1;
    for (let i = 0; i <= 40; i++) { const x = -s + 2 * s * i / 40; c.fillStyle = "#ffd9a0"; c.beginPath(); c.arc(ox + x * sc, Y(a * cosh(x / a)), 2.5, 0, 6.3); c.fill(); }
    c.strokeStyle = "#c9d4ea"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(ox, Y(a + sag)); c.lineTo(ox, Y(a)); c.stroke(); c.setLineDash([]); TX(c, `sag ${sag.toFixed(2)} m`, ox + 8, (Y(a + sag) + Y(a)) / 2, "#c9d4ea");
    ui.hud(`catenary y = a cosh(x/a), a = ${a.toFixed(3)} m<br>length 2a sinh(${s}/a) = ${catLen(a, s).toFixed(3)} m`);
  }
}
function panels() {
  if (P.mode === "chain") {
    const s = P.span / 2, a = catA(P.L, s); relabel(["Chain length", "a (from 2a sinh(s/a) = L)", "Sag", "Largest gap from the parabola"]); let gap = 0; const sag = catSag(a, s); for (let i = 0; i <= 200; i++) { const x = -s + 2 * s * i / 200; gap = Math.max(gap, Math.abs(a * cosh(x / a) - (a + sag * (x / s) ** 2))); }
    read.set("a", P.L + " m"); read.set("b", a.toFixed(4) + " m"); read.set("c", sag.toFixed(3) + " m"); read.set("d", (gap * 100).toFixed(1) + " cm");
    const S = []; for (let L = P.span + 0.2; L <= 30; L += 0.2) S.push([L, catSag(catA(L, s), s)]); chA.opts.title = "Sag against chain length (this span)"; chA.opts.xLabel = "length L (m)"; chA.opts.yLabel = "sag (m)"; chA.draw([{ pts: S, color: K.cssVar("--s1"), label: "sag" }], { vlines: [{ x: P.L }], yMin: 0 });
    const G = []; for (let i = 0; i <= 100; i++) { const x = -s + 2 * s * i / 100; G.push([x, (a * cosh(x / a) - (a + sag * (x / s) ** 2)) * 100]); } chB.opts.title = "Catenary minus parabola (cm)"; chB.opts.xLabel = "x (m)"; chB.opts.yLabel = "cm"; chB.draw([{ pts: G, color: K.cssVar("--s2"), label: "difference" }], { hlines: [{ y: 0 }] });
  } else if (P.mode === "hyper") {
    const t = P.t; relabel(["cosh t, sinh t", "cosh²t − sinh²t", "cos t, sin t", "Sector areas"]); read.set("a", `${cosh(t).toFixed(4)}, ${sinh(t).toFixed(4)}`); read.set("b", (cosh(t) ** 2 - sinh(t) ** 2).toFixed(6)); read.set("c", `${Math.cos(t).toFixed(4)}, ${Math.sin(t).toFixed(4)}`); read.set("d", `both ${(t / 2).toFixed(4)}`);
    const A = [], B = []; for (let u = -2.5; u <= 2.5001; u += 0.05) { A.push([u, cosh(u)]); B.push([u, Math.cos(u)]); } chA.opts.title = "cosh t and cos t"; chA.opts.xLabel = "t"; chA.opts.yLabel = ""; chA.draw([{ pts: A, color: K.cssVar("--s1"), label: "cosh t" }, { pts: B, color: K.cssVar("--s0"), label: "cos t" }], { vlines: [{ x: t }] });
    const A2 = [], B2 = []; for (let u = -2.5; u <= 2.5001; u += 0.05) { A2.push([u, sinh(u)]); B2.push([u, Math.sin(u)]); } chB.opts.title = "sinh t and sin t"; chB.opts.xLabel = "t"; chB.opts.yLabel = ""; chB.draw([{ pts: A2, color: K.cssVar("--s1"), label: "sinh t" }, { pts: B2, color: K.cssVar("--s0"), label: "sin t" }], { vlines: [{ x: t }] });
  } else {
    const x = 2.5 * Math.sin(tA * 0.5); relabel(["x", "cosh x, sinh x", "tanh x", ui.level === "adv" ? "arsinh x = ln(x + √(x² + 1))" : "cosh x − sinh x = e⁻ˣ"]); read.set("a", x.toFixed(3)); read.set("b", `${cosh(x).toFixed(4)}, ${sinh(x).toFixed(4)}`); read.set("c", tanh(x).toFixed(4)); read.set("d", ui.level === "adv" ? asinh(x).toFixed(4) : (cosh(x) - sinh(x)).toFixed(4));
    const D = [], E = []; for (let u = -3; u <= 3.001; u += 0.05) { D.push([u, sinh(u)]); E.push([u, cosh(u)]); } chA.opts.title = "Derivatives: d/dx cosh x = sinh x, d/dx sinh x = cosh x"; chA.opts.xLabel = "x"; chA.opts.yLabel = ""; chA.draw([{ pts: E, color: K.cssVar("--s1"), label: "cosh" }, { pts: D, color: K.cssVar("--s0"), label: "sinh" }], { vlines: [{ x }] });
    const I = []; for (let u = -10; u <= 10.001; u += 0.1) I.push([u, asinh(u)]); chB.opts.title = "arsinh x grows like ln(2x)"; chB.opts.xLabel = "x"; chB.opts.yLabel = ""; chB.draw([{ pts: I, color: K.cssVar("--s2"), label: "arsinh x" }, { pts: I.filter(q => q[0] > 0.3).map(q => [q[0], Math.log(2 * q[0])]), color: K.cssVar("--muted"), dash: [4, 4], label: "ln 2x" }]);
  }
}
let frame = 0;
ui.run(() => { }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
ui.onLevel = () => showCtl();
set({});
ui.tip("cosh x is the average of eˣ and e⁻ˣ. Try the hyperbola view to see why these are 'hyperbolic'.", 7000);
