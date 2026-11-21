/* =====================================================================
   SPECTROSCOPY AND STRUCTURE
   Four ways of looking at a molecule, each answering a different question:
     MASS SPECTRUM   the molecular ion M⁺ gives the relative molecular mass;
                     fragments (CH₃CO⁺ at 43, CH₂OH⁺ at 31 …) give pieces.
                     ¹³C (1.1% of carbon) makes an M+1 peak ≈ 1.1% × (number of C);
                     chlorine (³⁵Cl : ³⁷Cl ≈ 3 : 1) and bromine (⁷⁹Br : ⁸¹Br ≈ 1 : 1)
                     make M and M+2 pairs.
     INFRARED        bonds absorb at their own wavenumbers: O–H 3200–3550 (broad),
                     acid O–H 2500–3300 (very broad), C=O 1680–1750, C≡N about 2250.
     ¹³C NMR         one peak per carbon ENVIRONMENT; the chemical shift δ (ppm)
                     says what the carbon is joined to (C=O about 170–210).
     ¹H NMR          one signal per proton environment; area ∝ number of H;
                     split by n neighbouring H into n + 1 lines (the n + 1 rule),
                     spacing J (≈ 7 Hz) the same on every machine.
   The spectra here are built from tabulated data for each molecule; the
   machine adds noise that shrinks as √(number of scans).
   ===================================================================== */
const ENVC = ["#5ad1ff", "#ffb454", "#7ee787", "#ff7b9c", "#c4a1ff", "#ffe66d"];
const J = 7;                                                              // coupling constant (Hz) between neighbouring protons
/* The molecules. s: structure as [text, environment] pieces; ms: [m/z, % of the tallest, ion, contains halogen?];
   ir: [wavenumber, depth %, width, bond, key]; c13: [δ, environment, label]; h1: [δ, number of H, lines (0 = multiplet), environment, label, exchanges with D₂O?] */
const MOLS = [
  { name: "ethanol", f: "C₂H₆O", nC: 2, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["OH", 2]],
    ms: [[46, 22, "CH₃CH₂OH⁺ (M⁺)"], [45, 45, "CH₃CHOH⁺"], [31, 100, "CH₂OH⁺"], [29, 25, "C₂H₅⁺"], [27, 22, "C₂H₃⁺"], [15, 8, "CH₃⁺"]],
    ir: [[3350, 70, 260, "O–H (alcohol)", "OH"], [2970, 55, 60, "C–H", "CH"], [1050, 65, 40, "C–O", ""]], c13: [[58, 1, "CH₂–O"], [18, 0, "CH₃"]],
    h1: [[1.2, 3, 3, 0, "CH₃"], [3.7, 2, 4, 1, "CH₂"], [2.6, 1, 1, 2, "OH", true]] },
  { name: "propan-1-ol", f: "C₃H₈O", nC: 3, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CH₂", 2], ["–"], ["OH", 3]],
    ms: [[60, 10, "C₃H₇OH⁺ (M⁺)"], [42, 15, "C₃H₆⁺"], [31, 100, "CH₂OH⁺"], [29, 18, "C₂H₅⁺"], [27, 20, "C₂H₃⁺"]],
    ir: [[3340, 70, 260, "O–H (alcohol)", "OH"], [2960, 60, 60, "C–H", "CH"], [1060, 60, 40, "C–O", ""]], c13: [[64, 2, "CH₂–O"], [26, 1, "CH₂"], [10, 0, "CH₃"]],
    h1: [[0.9, 3, 3, 0, "CH₃"], [1.6, 2, 6, 1, "CH₂"], [3.6, 2, 3, 2, "CH₂–O"], [2.3, 1, 1, 3, "OH", true]] },
  { name: "propan-2-ol", f: "C₃H₈O", nC: 3, s: [["(CH₃)₂", 0], ["–"], ["CH", 1], ["–"], ["OH", 2]],
    ms: [[60, 3, "M⁺"], [45, 100, "CH₃CHOH⁺"], [43, 15, "C₃H₇⁺"], [27, 12, "C₂H₃⁺"]],
    ir: [[3350, 70, 260, "O–H (alcohol)", "OH"], [2970, 60, 60, "C–H", "CH"], [1130, 55, 40, "C–O", ""]], c13: [[64, 1, "CH–O"], [25, 0, "2 × CH₃"]],
    h1: [[1.2, 6, 2, 0, "2 × CH₃"], [4.0, 1, 7, 1, "CH"], [2.2, 1, 1, 2, "OH", true]] },
  { name: "propanal", f: "C₃H₆O", nC: 3, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CHO", 2]],
    ms: [[58, 70, "M⁺"], [57, 40, "C₂H₅CO⁺"], [29, 100, "CHO⁺ / C₂H₅⁺"], [28, 60, "CO⁺"], [27, 35, "C₂H₃⁺"]],
    ir: [[2980, 45, 60, "C–H", "CH"], [2720, 25, 30, "C–H (aldehyde)", ""], [1730, 85, 35, "C=O (aldehyde)", "CO"]], c13: [[203, 2, "CHO"], [37, 1, "CH₂"], [6, 0, "CH₃"]],
    h1: [[1.1, 3, 3, 0, "CH₃"], [2.5, 2, 5, 1, "CH₂"], [9.8, 1, 3, 2, "CHO"]] },
  { name: "propanone", f: "C₃H₆O", nC: 3, s: [["CH₃", 0], ["–"], ["CO", 1], ["–"], ["CH₃", 0]],
    ms: [[58, 30, "M⁺"], [43, 100, "CH₃CO⁺"], [15, 20, "CH₃⁺"]],
    ir: [[3000, 35, 50, "C–H", "CH"], [1715, 90, 35, "C=O (ketone)", "CO"], [1220, 55, 30, "C–C(=O)–C", ""]], c13: [[207, 1, "C=O"], [31, 0, "2 × CH₃"]],
    h1: [[2.2, 6, 1, 0, "2 × CH₃"]] },
  { name: "butanone", f: "C₄H₈O", nC: 4, s: [["CH₃", 0], ["–"], ["CO", 1], ["–"], ["CH₂", 2], ["–"], ["CH₃", 3]],
    ms: [[72, 25, "M⁺"], [57, 8, "C₂H₅CO⁺"], [43, 100, "CH₃CO⁺"], [29, 18, "C₂H₅⁺"]],
    ir: [[2980, 45, 60, "C–H", "CH"], [1715, 90, 35, "C=O (ketone)", "CO"]], c13: [[209, 1, "C=O"], [37, 2, "CH₂"], [29, 0, "CH₃–CO"], [8, 3, "CH₃"]],
    h1: [[2.1, 3, 1, 0, "CH₃–CO"], [2.4, 2, 4, 2, "CH₂"], [1.0, 3, 3, 3, "CH₃"]] },
  { name: "ethanoic acid", f: "C₂H₄O₂", nC: 2, s: [["CH₃", 0], ["–"], ["CO", 1], ["–"], ["OH", 2]],
    ms: [[60, 70, "M⁺"], [45, 90, "COOH⁺"], [43, 100, "CH₃CO⁺"], [15, 20, "CH₃⁺"]],
    ir: [[2950, 65, 700, "O–H (acid)", "OHa"], [1710, 90, 35, "C=O (acid)", "CO"], [1290, 50, 40, "C–O", ""]], c13: [[178, 1, "COOH"], [21, 0, "CH₃"]],
    h1: [[2.1, 3, 1, 0, "CH₃"], [11.5, 1, 1, 2, "COOH", true]] },
  { name: "propanoic acid", f: "C₃H₆O₂", nC: 3, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CO", 2], ["–"], ["OH", 3]],
    ms: [[74, 80, "M⁺"], [57, 30, "C₂H₅CO⁺"], [45, 60, "COOH⁺"], [29, 100, "C₂H₅⁺"], [28, 70, "C₂H₄⁺"]],
    ir: [[2960, 65, 700, "O–H (acid)", "OHa"], [1712, 90, 35, "C=O (acid)", "CO"], [1240, 50, 40, "C–O", ""]], c13: [[181, 2, "COOH"], [28, 1, "CH₂"], [9, 0, "CH₃"]],
    h1: [[1.2, 3, 3, 0, "CH₃"], [2.4, 2, 4, 1, "CH₂"], [11.7, 1, 1, 3, "COOH", true]] },
  { name: "ethyl ethanoate", f: "C₄H₈O₂", nC: 4, s: [["CH₃", 0], ["–"], ["CO", 1], ["–O–"], ["CH₂", 2], ["–"], ["CH₃", 3]],
    ms: [[88, 10, "M⁺"], [70, 12, "C₄H₆O⁺"], [61, 15, "CH₃COOH₂⁺"], [45, 15, "C₂H₅O⁺"], [43, 100, "CH₃CO⁺"], [29, 20, "C₂H₅⁺"]],
    ir: [[2980, 40, 60, "C–H", "CH"], [1742, 90, 35, "C=O (ester)", "CO"], [1240, 75, 40, "C–O (ester)", ""]], c13: [[171, 1, "C=O"], [60, 2, "CH₂–O"], [21, 0, "CH₃–CO"], [14, 3, "CH₃"]],
    h1: [[2.0, 3, 1, 0, "CH₃–CO"], [4.1, 2, 4, 2, "O–CH₂"], [1.3, 3, 3, 3, "CH₃"]] },
  { name: "methyl propanoate", f: "C₄H₈O₂", nC: 4, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CO", 2], ["–O–"], ["CH₃", 3]],
    ms: [[88, 20, "M⁺"], [59, 30, "COOCH₃⁺"], [57, 100, "C₂H₅CO⁺"], [29, 60, "C₂H₅⁺"]],
    ir: [[2980, 40, 60, "C–H", "CH"], [1740, 90, 35, "C=O (ester)", "CO"], [1200, 75, 40, "C–O (ester)", ""]], c13: [[175, 2, "C=O"], [51, 3, "O–CH₃"], [27, 1, "CH₂"], [9, 0, "CH₃"]],
    h1: [[1.1, 3, 3, 0, "CH₃"], [2.3, 2, 4, 1, "CH₂"], [3.7, 3, 1, 3, "O–CH₃"]] },
  { name: "1-bromopropane", f: "C₃H₇Br", nC: 3, hal: "Br", s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CH₂", 2], ["–Br"]],
    ms: [[122, 25, "C₃H₇⁷⁹Br⁺ (M⁺)", true], [43, 100, "C₃H₇⁺"], [41, 35, "C₃H₅⁺"], [27, 30, "C₂H₃⁺"]],
    ir: [[2965, 55, 60, "C–H", "CH"], [1250, 35, 30, "C–H bend", ""], [560, 55, 30, "C–Br", ""]], c13: [[36, 2, "CH₂–Br"], [26, 1, "CH₂"], [13, 0, "CH₃"]],
    h1: [[1.0, 3, 3, 0, "CH₃"], [1.9, 2, 6, 1, "CH₂"], [3.4, 2, 3, 2, "CH₂–Br"]] },
  { name: "2-chloropropane", f: "C₃H₇Cl", nC: 3, hal: "Cl", s: [["(CH₃)₂", 0], ["–"], ["CH", 1], ["–Cl"]],
    ms: [[78, 20, "C₃H₇³⁵Cl⁺ (M⁺)", true], [63, 15, "C₂H₄³⁵Cl⁺", true], [43, 100, "C₃H₇⁺"], [27, 25, "C₂H₃⁺"]],
    ir: [[2975, 55, 60, "C–H", "CH"], [1385, 35, 30, "C–H bend", ""], [740, 55, 30, "C–Cl", ""]], c13: [[54, 1, "CH–Cl"], [27, 0, "2 × CH₃"]],
    h1: [[1.5, 6, 2, 0, "2 × CH₃"], [4.2, 1, 7, 1, "CH–Cl"]] },
  { name: "propanenitrile", f: "C₃H₅N", nC: 3, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["C≡N", 2]],
    ms: [[55, 40, "M⁺"], [54, 100, "C₂H₄CN⁺"], [28, 60, "C₂H₄⁺"]],
    ir: [[2990, 40, 60, "C–H", "CH"], [2250, 70, 25, "C≡N", "CN"]], c13: [[120, 2, "C≡N"], [11, 1, "CH₂"], [10, 0, "CH₃"]],
    h1: [[1.3, 3, 3, 0, "CH₃"], [2.4, 2, 4, 1, "CH₂"]] },
  { name: "propylamine", f: "C₃H₉N", nC: 3, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CH₂", 2], ["–"], ["NH₂", 3]],
    ms: [[59, 10, "M⁺"], [30, 100, "CH₂NH₂⁺"], [28, 15, "C₂H₄⁺"], [27, 10, "C₂H₃⁺"]],
    ir: [[3370, 45, 50, "N–H", "NH"], [3290, 40, 50, "N–H", "NH"], [2960, 60, 60, "C–H", "CH"], [1600, 40, 40, "N–H bend", ""]], c13: [[44, 2, "CH₂–N"], [27, 1, "CH₂"], [11, 0, "CH₃"]],
    h1: [[0.9, 3, 3, 0, "CH₃"], [1.5, 2, 6, 1, "CH₂"], [2.7, 2, 3, 2, "CH₂–N"], [1.1, 2, 1, 3, "NH₂", true]] },
  { name: "hexane", f: "C₆H₁₄", nC: 6, s: [["CH₃", 0], ["–"], ["CH₂", 1], ["–"], ["CH₂", 2], ["–"], ["CH₂", 2], ["–"], ["CH₂", 1], ["–"], ["CH₃", 0]],
    ms: [[86, 15, "M⁺"], [71, 5, "C₅H₁₁⁺"], [57, 100, "C₄H₉⁺"], [43, 80, "C₃H₇⁺"], [29, 40, "C₂H₅⁺"]],
    ir: [[2960, 75, 70, "C–H", "CH"], [1465, 40, 30, "C–H bend", ""], [1380, 30, 25, "C–H bend", ""]], c13: [[32, 2, "CH₂ (middle)"], [23, 1, "CH₂"], [14, 0, "CH₃"]],
    h1: [[0.9, 6, 3, 0, "2 × CH₃"], [1.3, 8, 0, 1, "4 × CH₂"]] },
  { name: "but-1-ene", f: "C₄H₈", nC: 4, s: [["CH₂", 0], ["="], ["CH", 1], ["–"], ["CH₂", 2], ["–"], ["CH₃", 3]],
    ms: [[56, 40, "M⁺"], [41, 100, "C₃H₅⁺"], [39, 30, "C₃H₃⁺"], [27, 30, "C₂H₃⁺"]],
    ir: [[3080, 35, 30, "=C–H", ""], [2970, 55, 60, "C–H", "CH"], [1645, 45, 25, "C=C", "CC"], [910, 60, 25, "=C–H bend", ""]], c13: [[140, 1, "=CH"], [113, 0, "=CH₂"], [27, 2, "CH₂"], [13, 3, "CH₃"]],
    h1: [[5.0, 2, 0, 0, "=CH₂"], [5.8, 1, 0, 1, "=CH"], [2.0, 2, 5, 2, "CH₂"], [1.0, 3, 3, 3, "CH₃"]] },
  { name: "methylbenzene", f: "C₇H₈", nC: 7, s: [["C₆H₅", 0], ["–"], ["CH₃", 1]],
    ms: [[92, 60, "M⁺"], [91, 100, "C₇H₇⁺"], [65, 12, "C₅H₅⁺"]],
    ir: [[3030, 30, 40, "C–H (arene)", ""], [2920, 30, 40, "C–H", "CH"], [1605, 35, 20, "C=C (arene)", "AR"], [1495, 40, 20, "C=C (arene)", "AR"], [730, 70, 25, "C–H bend", ""]], c13: [[138, 0, "C (ring, joined to CH₃)"], [129, 0, "CH (ring)"], [128, 0, "CH (ring)"], [125, 0, "CH (ring)"], [21, 1, "CH₃"]],
    h1: [[7.2, 5, 0, 0, "C₆H₅"], [2.3, 3, 1, 1, "CH₃"]] }
];
const MI = n => MOLS.findIndex(m => m.name === n);
const SPLIT = ["multiplet", "singlet", "doublet", "triplet", "quartet", "quintet", "sextet", "septet"];
// Pascal's triangle gives the relative heights of the n + 1 lines
const pascal = n => { let row = [1]; for (let i = 0; i < n; i++) row = row.map((v, j) => v + (row[j - 1] || 0)).concat(1); return row; };
// a Lorentzian line shape (the natural shape of a spectral line); w = full width at half height
const lor = (x, x0, w) => 1 / (1 + (2 * (x - x0) / w) ** 2);
// the mass spectrum with isotope peaks: M+1 from carbon-13 (1.1% per C), M+2 from ³⁷Cl or ⁸¹Br
function msPeaks(m) {
  const out = []; for (const [mz, I, ion, hal] of m.ms) { out.push([mz, I, ion]);
    if (I === Math.max(...m.ms.filter(p => p[0] === m.ms[0][0]).map(p => p[1])) && mz === m.ms[0][0]) out.push([mz + 1, I * 0.011 * m.nC, "M+1 (one ¹³C)"]);
    if (hal) out.push([mz + 2, I * (m.hal === "Cl" ? 24.2 / 75.8 : 49.3 / 50.7), m.hal === "Cl" ? "³⁷Cl version" : "⁸¹Br version"]); }
  const top = Math.max(...out.map(p => p[1])); return out.map(p => [p[0], 100 * p[1] / top, p[2]]);
}
// counting ions: each peak's height has a random error from counting (√N); total ions grow with scans
function msMeasured(m, scans, r) { const N = 400 * scans; return msPeaks(m).map(([mz, I, ion]) => { const n = N * I / 100, c = Math.max(0, n + Math.sqrt(n + 1) * r.gauss()); return [mz, 100 * c / N, ion]; }); }
// a fingerprint of small peaks below 1500 cm⁻¹, different for every molecule
function fingerprint(i) { const r = K.rng(100 + i * 31), out = []; for (let k = 0; k < 7; k++) out.push([600 + 900 * r(), 10 + 25 * r(), 12 + 20 * r(), "", ""]); return out; }
function irCurve(m, i, scans, r) { const bands = m.ir.concat(fingerprint(i)), pts = []; const nz = 2.5 / Math.sqrt(scans); for (let v = 4000; v >= 500; v -= 4) { let a = 0; for (const [v0, d, wd] of bands) a += d * lor(v, v0, wd) / 100; pts.push([-v, Math.max(0, Math.min(100, 100 * Math.exp(-a * 1.4) + nz * r.gauss()))]); } return pts; }
function c13Curve(m, MHz, scans, r) { const pts = [], nz = 6 / Math.sqrt(scans), w = 1.2 / (MHz / 4); for (let d = 220; d >= -5; d -= 0.25) pts.push([-d, nz * r.gauss()]); const xs = new Set(); for (const [d0] of m.c13) for (let k = -6; k <= 6; k++) xs.add(+(d0 + k * w * 0.5).toFixed(4)); for (const d of xs) pts.push([-d, nz * r.gauss()]); pts.sort((a, b) => a[0] - b[0]);
  for (const p of pts) for (const [d0, env] of m.c13) p[1] += (env === 0 && m.c13.length > 4 ? 70 : 100) * lor(-p[0], d0, w); return pts; }
// the ¹H lines: each environment split into n + 1 lines J Hz apart (a broad hump for a "multiplet")
function h1Lines(m, MHz, d2o) { const L = []; for (const [d0, nH, lines, env, lab, ex] of m.h1) { if (d2o && ex) continue; if (!lines) { for (let k = -3; k <= 3; k++) L.push({ d: d0 + k * 0.035, a: nH * Math.exp(-k * k / 4) / 3.4, env }); continue; } const p = pascal(lines - 1), s = p.reduce((a, b) => a + b, 0); p.forEach((v, k) => L.push({ d: d0 + (k - (lines - 1) / 2) * J / MHz, a: nH * v / s, env, broad: ex })); } return L; }
function h1Curve(m, MHz, scans, d2o, r) { const L = h1Lines(m, MHz, d2o), wHz = 1.2, xs = new Set(); for (let d = 12.5; d >= -0.5; d -= 0.01) xs.add(+d.toFixed(3));
  for (const l of L) { const w = (l.broad ? 6 : wHz) / MHz; for (let k = -8; k <= 8; k++) xs.add(+(l.d + k * w * 0.4).toFixed(5)); } for (let k = -8; k <= 8; k++) xs.add(+(k * wHz / MHz * 0.4).toFixed(5));
  const nz = 0.03 / Math.sqrt(scans), arr = [...xs].sort((a, b) => b - a).map(d => { let y = 0; for (const l of L) y += l.a * lor(d, l.d, (l.broad ? 6 : wHz) / MHz) * MHz / 400; y += 0.6 * lor(d, 0, wHz / MHz) * MHz / 400; return [-d, y + nz * r.gauss()]; }); return arr; }
// the integration trace: running total of area from left to right, scaled so the smallest group of H = 1 step
function integration(m, d2o) { const env = m.h1.filter(h => !(d2o && h[5])); return env; }
/* ---- An automatic "student" who identifies a molecule from noisy evidence (for the batch run) ---- */
function features(m, i, used, scans, r) {
  const f = {};
  if (used >= 1) { const pk = msMeasured(m, scans, r).filter(p => p[1] > 3 * 100 / Math.sqrt(400 * scans) + 0.5), hi = Math.max(...pk.filter(p => !/M\+1|³⁷Cl|⁸¹Br/.test(p[2])).map(p => p[0])); f.M = hi; }
  if (used >= 2) f.ir = m.ir.filter(b => b[4] && b[4] !== "CH" && b[1] * (1 + 0.1 * r.gauss()) > 25).map(b => b[4]).sort().filter((v, k, a) => a.indexOf(v) === k).join(",");
  if (used >= 3) { const seen = new Set(m.c13.map(c => c[0])); let n = seen.size; for (const a of m.c13) for (const b of m.c13) if (a !== b && Math.abs(a[0] - b[0]) < 1.5 && r() < 0.5) { n--; break; } f.c = Math.max(1, n); }
  if (used >= 4) f.h = m.h1.map(h => h[1] + ":" + h[2]).sort().join(",");
  return f;
}
const truth = (m, used) => { const f = {}; if (used >= 1) f.M = m.ms[0][0]; if (used >= 2) f.ir = m.ir.filter(b => b[4] && b[4] !== "CH").map(b => b[4]).sort().filter((v, k, a) => a.indexOf(v) === k).join(","); if (used >= 3) f.c = new Set(m.c13.map(c => c[0])).size; if (used >= 4) f.h = m.h1.map(h => h[1] + ":" + h[2]).sort().join(","); return f; };
function identify(used, scans, r) { const i = r.int(MOLS.length), m = MOLS[i], f = features(m, i, used, scans, r); let cands = MOLS.filter(c => { const t = truth(c, used); return Object.keys(f).every(k => t[k] === f[k]); }); if (!cands.length) cands = MOLS; return r.pick(cands) === m ? 100 : 0; }
// signal-to-noise of the tallest ¹H line, measured by a student from a noisy spectrum
function snr(scans, r) { const m = MOLS[0], pts = h1Curve(m, 400, scans, false, r), base = pts.filter(p => -p[0] > 9 && -p[0] < 12).map(p => p[1]), peak = Math.max(...pts.filter(p => Math.abs(-p[0] - 1.2) < 0.05).map(p => p[1])); return peak / K.sd(base); }
// integration ratio CH₃ : CH₂ for ethanol from a noisy spectrum (sum of the curve over each group)
function intRatio(scans, r) { const pts = h1Curve(MOLS[0], 400, scans, false, r), area = (a, b) => pts.filter(p => -p[0] > a && -p[0] < b).reduce((s, p) => s + p[1], 0); return area(1.1, 1.3) / area(3.6, 3.8); }
// depth of the dip between the CH₃ triplet (0.9) and CH₂ sextet (1.6) of propan-1-ol: 1 = fully resolved, 0 = merged
function dip(MHz, r, noisy = true) { const m = MOLS[1], L = h1Lines(m, MHz, false).filter(l => l.d < 2), lw = 1.2 / MHz * 4;      // a poorly shimmed magnet: lines 4 × wider
  const y = d => L.reduce((s, l) => s + l.a * lor(d, l.d, lw), 0) + (noisy ? 0.02 * r.gauss() : 0); const top = Math.min(Math.max(...[0.9].map(y)), ...[1.6].map(y)); let lo = Infinity; for (let d = 0.9 + 3 * J / MHz; d <= 1.6 - 5 * J / MHz / 2; d += 0.001) lo = Math.min(lo, y(d)); return isFinite(lo) ? Math.max(0, 1 - lo / top) : 0; }

// ---------------- The page ----------------
const DEF = { mol: 0, MHz: 400, scans: 16, labels: true, d2o: false, mystery: false, formula: true, zoom: 1 };
const P = Object.assign({}, DEF); let seed = 1, myst = 0, guess = null, score = [0, 0];
const ui = K.app({
  title: "Spectroscopy and Structure", subject: "Chemistry",
  blurb: "Mass spectra, infrared, ¹³C and ¹H NMR for real organic molecules: assign the peaks, then work out a mystery molecule from its spectra",
  reset: () => set({}),
  levels: { std: "Standard (AS)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel A level Chemistry (9CH0) Topic 7 Modern analytical techniques I: mass spectrometry (the molecular ion, fragmentation, M+1 and isotope peaks) and infrared spectroscopy (absorptions of O–H, C=O, C–H, N–H, C≡N; using the data booklet). (Not in iGCSE.)", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 19 Modern analytical techniques II: ¹³C NMR (number of carbon environments, chemical shift) and ¹H NMR (environments, relative peak areas, the n + 1 splitting rule, TMS, D₂O to find O–H and N–H), combined with mass spectra and IR to deduce structures." } },
  missions: [
    { title: "The molecular ion", q: "Ethanol. Which peak in the mass spectrum gives the relative molecular mass? What is the tallest peak (the base peak)?", hint: "The molecular ion M⁺ is the peak at the highest m/z (46), ignoring the tiny M+1 peak. The base peak at 31 is CH₂OH⁺: the C–C bond breaks easily next to the O.", setup() { set({ mol: 0 }); } },
    { title: "Fragments tell you pieces", q: "Compare propanal and propanone (both C₃H₆O, Mr 58). Which fragment tells them apart?", hint: "Propanone gives a huge peak at 43 (CH₃CO⁺); propanal gives 29 (CHO⁺ and C₂H₅⁺). A ketone breaks either side of the C=O.", setup() { set({ mol: 4 }); } },
    { title: "Chlorine and bromine", q: "Look at 2-chloropropane and then 1-bromopropane. Why are there two molecular ion peaks two apart? What are their heights?", hint: "Chlorine is 75.8% ³⁵Cl and 24.2% ³⁷Cl, so M : M+2 ≈ 3 : 1. Bromine is about half ⁷⁹Br and half ⁸¹Br, so M : M+2 ≈ 1 : 1. Every fragment that still has the halogen shows the same pair.", setup() { set({ mol: 11 }); } },
    { title: "Alcohol, acid or neither?", q: "Compare the IR spectra of ethanol, ethanoic acid and propanone. Which absorptions identify each?", hint: "Ethanol: a broad O–H at 3200–3550 and no C=O. Ethanoic acid: a very broad O–H from 2500 to 3300 and a C=O at 1710. Propanone: a strong C=O at 1715 and no O–H.", setup() { set({ mol: 6 }); } },
    { title: "Is the oxidation finished?", q: "Ethanol is oxidised to ethanoic acid. How would IR show that the product contains no ethanol left, and that it is an acid?", hint: "The alcohol's O–H (3200–3550, sharp-ish) is replaced by the much broader acid O–H (2500–3300) and a strong C=O near 1710 appears.", setup() { set({ mol: 0 }); } },
    { lvl: "adv", title: "Counting environments", q: "¹³C NMR of propan-1-ol, then propan-2-ol. How many peaks does each give, and why?", hint: "Propan-1-ol has three different carbons (three peaks). Propan-2-ol has two: the two CH₃ groups are identical by symmetry. The CH–O and CH₂–O carbons are near 64 ppm because O pulls electrons away from them.", setup() { set({ mol: 1 }); } },
    { lvl: "adv", title: "The n + 1 rule", q: "¹H NMR of ethanol. Explain the triplet, quartet and singlet, and the 3 : 2 : 1 heights of the integration.", hint: "CH₃ has 2 neighbouring H (on CH₂) → 3 lines; CH₂ has 3 neighbours → 4 lines. O–H exchanges quickly so it is not split and does not split: a singlet. Areas are in the ratio of the numbers of H: 3 : 2 : 1.", setup() { set({ mol: 0 }); } },
    { lvl: "adv", title: "Shake with D₂O", q: "Ethanol, then propanoic acid: turn on D₂O. Which peak disappears and why?", hint: "O–H (and N–H) protons swap with deuterium, which does not show in ¹H NMR. The peak that vanishes is the O–H. Useful for spotting alcohols, acids and amines.", setup() { set({ mol: 0, d2o: true }); } },
    { lvl: "adv", title: "Higher field", q: "Propan-1-ol at 60 MHz, then 400 MHz. Zoom on the CH₃ triplet. What changes, and what stays the same?", hint: "The splitting J stays 7 Hz, but the gap between signals in Hz is δ × MHz, so at higher field the multiplets spread apart and stop overlapping. In ppm, the lines of a multiplet crowd together at high field.", setup() { set({ mol: 1, MHz: 60 }); } },
    { lvl: "adv", title: "Isomeric esters", q: "Ethyl ethanoate and methyl propanoate are both C₄H₈O₂. Use the ¹H NMR to tell them apart.", hint: "Ethyl ethanoate: a singlet at 2.0 (CH₃ next to C=O) and the quartet at 4.1 (CH₂ next to O). Methyl propanoate: a singlet at 3.7 (CH₃ on O) and the quartet at 2.3 (CH₂ next to C=O). The shift tells you what each group is joined to.", setup() { set({ mol: 8 }); } },
    { lvl: "adv", title: "Mystery molecules", q: "Turn on Mystery molecule. Use all four spectra to work it out, then choose your answer and check. How many can you get in a row?", hint: "Start with M⁺ (Mr, and Cl/Br pairs), then IR (which functional groups), then ¹³C (how many carbon environments), then ¹H (groups and neighbours).", setup() { set({ mystery: true }); } }
  ],
  batch: [
    { title: "M+1 and the number of carbons", question: "Does the height of the M+1 peak (as a % of M) rise by 1.1 for each carbon?", how: "Alkanes C₂ to C₁₀; 4000 ions in the molecular ion peak, counted with √N error.", xLabel: "number of carbon atoms", yLabel: "M+1 height (% of M)", xs: [2, 3, 4, 5, 6, 8, 10], reps: 10, yMin: 0, fit: true, theory: n => 1.1 * n, theoryLabel: "1.1 × n", run: (n, r) => { const NM = 4000, n1 = NM * 0.011 * n; return 100 * (n1 + Math.sqrt(n1) * r.gauss()) / (NM + Math.sqrt(NM) * r.gauss()); }, note: "A straight line through the origin, gradient 1.1: the number of carbons = (M+1 height ÷ M height) × 100 ÷ 1.1." },
    { title: "Chlorine: how close to 3 : 1?", question: "What M : M+2 ratio does a quick scan of 2-chloropropane give?", how: "About 600 ions in the M⁺ pair.", yLabel: "M ÷ (M+2)", reps: 400, bins: 24, theory: 75.8 / 24.2, theoryLabel: "³⁵Cl ÷ ³⁷Cl", run: (x, r) => { const n = 600, a = n * 0.758 + Math.sqrt(n * 0.758) * r.gauss(), b = n * 0.242 + Math.sqrt(n * 0.242) * r.gauss(); return a / b; }, note: "Centred on 3.1 with a spread from counting. Bromine would give about 1.0." },
    { lvl: "adv", title: "Scans and signal-to-noise", question: "How does the signal-to-noise ratio of a ¹H spectrum grow with the number of scans?", how: "Ethanol at 400 MHz; S/N = tallest CH₃ line ÷ SD of the empty baseline from 9 to 12 ppm.", xLabel: "number of scans", yLabel: "signal-to-noise", xs: [1, 4, 16, 64, 256], reps: 6, yMin: 0, theory: n => snr(1, K.rng(1)) * 0 + 0, run: (n, r) => snr(n, r), note: "Four times the scans doubles S/N: noise averages away as √n. 256 scans take 256 times as long for only 16 times the S/N." },
    { lvl: "adv", title: "How accurate is the 3 : 2 integration?", question: "Measure the CH₃ : CH₂ area ratio of ethanol at different numbers of scans.", how: "400 MHz; areas summed over each multiplet from a noisy spectrum.", xLabel: "number of scans", yLabel: "CH₃ ÷ CH₂ area", xs: [1, 4, 16, 64], reps: 12, theory: () => 1.5, theoryLabel: "3 ÷ 2", run: (n, r) => intRatio(n, r), note: "With few scans the ratio scatters; with more, it settles on 1.5 = 3 H ÷ 2 H. Always round integrations to the nearest simple whole-number ratio." },
    { lvl: "adv", title: "Higher field, better resolved?", question: "How well are the CH₃ triplet and CH₂ sextet of propan-1-ol separated on different spectrometers?", how: "A rather poorly shimmed magnet (lines 5 Hz wide); dip depth between the two signals: 1 = back to baseline, 0 = merged.", xLabel: "spectrometer frequency (MHz)", yLabel: "dip between signals", xs: [60, 100, 200, 300, 400, 600], reps: 6, yMin: 0, yMax: 1.1, theory: f => dip(f, null, false), theoryLabel: "noise-free", run: (f, r) => dip(f, r), note: "J stays 7 Hz but the gap between signals (0.7 ppm) is 42 Hz at 60 MHz and 420 Hz at 600 MHz: higher fields pull signals apart." },
    { lvl: "adv", title: "How much evidence do you need?", question: "A mystery molecule from the 17 here. How often does a careful student identify it using only the mass spectrum, then adding IR, ¹³C and ¹H NMR?", how: "1 = mass spectrum only, 2 = + IR, 3 = + ¹³C NMR, 4 = + ¹H NMR. 16 scans. If several molecules fit the evidence, the student guesses between them.", xLabel: "techniques used", yLabel: "% identified correctly", xs: [1, 2, 3, 4], reps: 60, yMin: 0, yMax: 105, run: (u, r) => identify(u, 16, r), note: "Mr alone cannot tell isomers apart (propanal and propanone, the two esters, the propanols). Each technique removes more candidates; with ¹H NMR almost every structure is fixed." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "9CH0 7", text: "Mass spectrum: the molecular ion M⁺ (highest m/z, ignoring isotope peaks) gives Mr. The tallest peak is the base peak. Fragments are positive ions formed when M⁺ breaks; only ions are detected." },
      { lvl: "std", tag: "9CH0 7", text: "Common fragments: 15 CH₃⁺, 29 C₂H₅⁺ or CHO⁺, 31 CH₂OH⁺, 43 CH₃CO⁺ or C₃H₇⁺, 45 COOH⁺. Chlorine gives M : M+2 ≈ 3 : 1; bromine 1 : 1." },
      { lvl: "std", tag: "9CH0 7", text: "Infrared: bonds absorb IR at characteristic wavenumbers. O–H alcohol 3200–3550 (broad); O–H acid 2500–3300 (very broad); C=O 1680–1750; N–H 3300–3500; C≡N 2200–2260. Below 1500 cm⁻¹ is the fingerprint region." },
      { lvl: "adv", tag: "9CH0 19", text: "¹³C NMR: one peak for each carbon environment; δ shows the surroundings (C=O 160–220, C–O 50–90, C–C 5–55). Equivalent carbons (by symmetry) give one peak." },
      { lvl: "adv", tag: "9CH0 19", text: "¹H NMR: number of signals = number of proton environments; relative areas (integration) = ratio of numbers of H; n neighbouring H on adjacent carbons split a signal into n + 1 lines. TMS is the reference at δ = 0." },
      { lvl: "adv", tag: "9CH0 19", text: "O–H and N–H protons usually give broad singlets, do not split their neighbours, and disappear when D₂O is added. Solvents are deuterated (CDCl₃) so they give no ¹H signal." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A compound C₃H₆O shows a strong IR absorption at 1715 cm⁻¹ and none at 3200–3550 cm⁻¹. Its base peak is at m/z = 43. Identify it.", ans: "<ul><li>C=O present, no O–H: a carbonyl compound</li><li>43 = CH₃CO⁺, so propanone, CH₃COCH₃</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why a chloroalkane shows two molecular ion peaks two mass units apart, in the ratio 3 : 1.", ans: "<ul><li>chlorine has two isotopes, ³⁵Cl and ³⁷Cl</li><li>in the natural abundance ratio about 3 : 1</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const m = MOLS[P.mol]; return `Predict the ¹H NMR spectrum of ${m.name}: the number of signals, their relative areas and their splitting.`; }, ans: () => { const m = MOLS[P.mol]; return "<ul>" + m.h1.map(h => `<li>δ ≈ ${h[0]}: ${h[4]}, ${h[1]} H, ${h[5] ? "broad singlet (exchanges)" : SPLIT[h[2]]}</li>`).join("") + "</ul>"; } },
      { lvl: "adv", marks: 2, q: "Why does propan-2-ol give only two peaks in its ¹³C NMR spectrum?", ans: "<ul><li>the two CH₃ carbons are in identical environments (symmetry)</li><li>so there are only two carbon environments: CH₃ and CH–OH</li></ul>" },
      { lvl: "adv", marks: 2, q: "A ¹H NMR signal is a quartet. What does this tell you about the neighbouring carbon atoms?", ans: "<ul><li>3 H on adjacent carbon(s) (n + 1 = 4)</li><li>usually a CH₃ group next door</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Each spectrum is built from tabulated data for the molecule (positions and relative sizes of peaks from standard reference spectra, rounded).</li>
<li>Mass spectrum: peaks as % of the base peak. The M+1 peak is 1.1% × (number of C) of M⁺. Chlorine adds M+2 at 24.2/75.8 of M; bromine at 49.3/50.7. Heights carry counting error (√N, with 400 ions × scans in the base peak).</li>
<li>Infrared: each absorption is a Lorentzian band of the given depth and width; transmittance = 100 e^(−total absorbance). Small fingerprint bands below 1500 cm⁻¹ are made up (different for each molecule) to look like a real fingerprint region.</li>
<li>¹³C NMR: proton-decoupled, so one line per environment; heights are equal except quaternary-like ring carbons, which are smaller.</li>
<li>¹H NMR: each signal is split by the n + 1 rule into lines J = 7 Hz apart, with heights from Pascal's triangle. Gaps in ppm are J ÷ (spectrometer MHz). O–H and N–H are broad singlets that do not couple and vanish with D₂O. Where neighbours on two sides differ (alkene CH, aromatic rings, the middle CH₂ groups of hexane) a real spectrum is complex: shown as a multiplet.</li>
<li>Noise falls as 1/√(scans).</li></ul>
<h3>Simplifications</h3>
<ul><li>All coupling constants are 7 Hz; real ones range from 0 to 18 Hz.</li><li>The n + 1 rule assumes all neighbouring H couple equally (true for these simple chains).</li><li>Chemical shifts are typical values; they depend slightly on the solvent and concentration (especially O–H).</li><li>Mass spectra show only the main fragments.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Molecule");
const sel = K.$("select"); sel.style.cssText = "width:100%;padding:5px;margin:2px 0 8px;background:#16203a;color:inherit;border:1px solid #3a4a6b;border-radius:6px"; sel.innerHTML = MOLS.map((m, i) => `<option value="${i}">${m.name} (${m.f})</option>`).join(""); sel.onchange = () => { P.mol = +sel.value; redraw(); }; g.append(sel);
ctl.mystery = K.toggle(g, { label: "🕵 Mystery molecule", value: false, on: v => { P.mystery = v; if (v) newMystery(); redraw(); } });
ctl.formula = K.toggle(g, { label: "Give the molecular formula", value: true, on: v => { P.formula = v; redraw(); } });
const ans = K.$("select"); ans.style.cssText = sel.style.cssText; ans.innerHTML = `<option value="-1">Your answer…</option>` + MOLS.map((m, i) => `<option value="${i}">${m.name}</option>`).join(""); g.append(ans);
let rr = K.row(g); K.btn(rr, "✔ Check", () => { if (+ans.value < 0) return; guess = +ans.value; score[1]++; if (guess === myst) score[0]++; redraw(); }, "primary"); K.btn(rr, "🎲 Next mystery", () => { newMystery(); redraw(); });
g = ui.group("Spectrometers");
ctl.MHz = K.slider(g, { label: "NMR frequency", min: 60, max: 600, step: 20, value: 400, unit: "MHz", on: v => { P.MHz = v; redraw(); } });
ctl.scans = K.slider(g, { label: "Number of scans", min: 0, max: 8, step: 1, value: 4, fmt: v => String(2 ** v), on: v => { P.scans = 2 ** v; redraw(); } });
ctl.d2o = K.toggle(g, { label: "Shake with D₂O (¹H NMR)", value: false, on: v => { P.d2o = v; redraw(); } });
ctl.labels = K.toggle(g, { label: "Show what each peak is", value: true, on: v => { P.labels = v; redraw(); } });
ctl.zoom = K.slider(g, { label: "Zoom on ¹H signal number", min: 1, max: 5, step: 1, value: 1, on: v => { P.zoom = v; redraw(); } });
K.btn(K.row(g), "↻ Run the spectrometers again", () => { seed++; redraw(); });
const read = K.readout(ui.group("Readings"), [["M", "M⁺ (m/z)"], ["base", "base peak"], ["c", "¹³C peaks"], ["h", "¹H signals"], ["sn", "signal-to-noise"], ["sc", "mystery score"]]);
function newMystery() { const r = K.rng(Date.now() % 100000); let k; do { k = r.int(MOLS.length); } while (k === myst && MOLS.length > 1); myst = k; guess = null; ans.value = "-1"; }
function set(o) { Object.assign(P, DEF, o); sel.value = P.mol; ctl.mystery.set(P.mystery); ctl.formula.set(P.formula); ctl.MHz.set(P.MHz); ctl.scans.set(Math.log2(P.scans)); ctl.d2o.set(P.d2o); ctl.labels.set(P.labels); ctl.zoom.set(P.zoom); if (P.mystery) newMystery(); redraw(); }
const cur = () => P.mystery ? myst : P.mol;

// ---------------- Layout: a strip on the left, four spectra in a grid ----------------
const left = K.$("div"); left.style.cssText = "position:absolute;left:0;top:0;bottom:0;width:31%;"; ui.stage.append(left);
const grid = K.$("div"); grid.style.cssText = "position:absolute;left:31%;right:0;top:0;bottom:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1px;background:#24324f"; ui.stage.append(grid);
const cell = () => { const d = K.$("div"); d.style.cssText = "background:#0b1020;position:relative;min-height:0"; grid.append(d); return d; };
const chMS = K.chart(cell(), {}), chIR = K.chart(cell(), {}), chC = K.chart(cell(), {}), chH = K.chart(cell(), {});
const cv = K.canvas(left, () => drawLeft());
const chZ = K.chart(ui.dock, {}), chI = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
function drawLeft() {
  const c = cv.ctx, w = cv.w, h = cv.h, i = cur(), m = MOLS[i], adv = ui.level === "adv", hide = P.mystery && guess === null; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  let y = 26; TX(c, hide ? "🕵 Mystery molecule" : m.name, 14, y, "#eef2f8", "left", "600 16px"); y += 22;
  if (!hide || P.formula) TX(c, m.f + (hide ? "" : `   Mr = ${m.ms[0][0]}`), 14, y, "#cfd8ea", "left", "13px"); y += 30;
  if (!hide) { let x = 14; c.font = "600 17px Segoe UI,sans-serif"; for (const [txt, env] of m.s) { const wd = c.measureText(txt).width; if (x + wd > w - 10) { x = 14; y += 26; } TX(c, txt, x, y, env == null ? "#8fa0bf" : ENVC[env], "left", "600 17px"); x += wd + 1; } y += 30;
    if (adv) { TX(c, "¹H environments", 14, y, "#8fa0bf", "left", "600 11.5px"); y += 16; m.h1.forEach(hh => { const gone = P.d2o && hh[5]; TX(c, `δ ${hh[0].toFixed(1)}  ${hh[4]}: ${hh[1]}H, ${hh[5] ? "broad singlet" : SPLIT[hh[2]]}${gone ? " (gone with D₂O)" : ""}`, 22, y, gone ? "#56607a" : ENVC[hh[3]], "left", "11.5px"); y += 16; });
      y += 6; TX(c, "¹³C environments", 14, y, "#8fa0bf", "left", "600 11.5px"); y += 16; m.c13.forEach(cc => { TX(c, `δ ${cc[0]}  ${cc[2]}`, 22, y, ENVC[cc[1]], "left", "11.5px"); y += 16; }); }
    else { TX(c, "Infrared absorptions", 14, y, "#8fa0bf", "left", "600 11.5px"); y += 16; m.ir.forEach(b => { TX(c, `${b[0]} cm⁻¹  ${b[3]}`, 22, y, "#cfd8ea", "left", "11.5px"); y += 16; }); }
  } else { y = WRAP(c, "Work it out from the four spectra. Mass spectrum: Mr, and Cl or Br pairs. IR: which groups. ¹³C: how many carbon environments. ¹H: groups, neighbours and numbers of H.", 14, y, w - 28, 16, "#cfd8ea", "12px"); }
  if (P.mystery && guess !== null) { y += 10; const ok = guess === myst; TX(c, ok ? `✔ Yes: ${m.name}` : `✘ Not ${MOLS[guess].name}: it is ${m.name}`, 14, y, ok ? "#7ee787" : "#ff6b81", "left", "600 13px"); }
  if (P.mystery) TX(c, `Score: ${score[0]} / ${score[1]}`, 14, h - 14, "#ffd166", "left", "600 12.5px");
  if (!adv) WRAP(c, "NMR is A level (Topic 19): switch to Advanced to see the environments.", 14, h - 40, w - 28, 15, "#8fa0bf", "11px");
}
// ---------------- Spectra (redrawn only when something changes) ----------------
let dirty = true; const redraw = () => { dirty = true; };
function drawAll() {
  const i = cur(), m = MOLS[i], r = K.rng(seed * 977 + i), adv = ui.level === "adv", lab = P.labels && !(P.mystery && guess === null);
  // mass spectrum
  const ms = msMeasured(m, P.scans, r), mmax = Math.max(...ms.map(p => p[0])) + 6;
  chMS.opts.title = "Mass spectrum"; chMS.opts.xLabel = "m/z"; chMS.opts.yLabel = "relative abundance (%)";
  chMS.draw([{ pts: ms.map(p => [p[0], p[1]]), type: "bars", w: 0.7, color: "#5ad1ff", label: "" }], { xMin: 10, xMax: Math.max(65, mmax), yMin: 0, yMax: 108, vlines: lab ? ms.filter(p => p[1] > 12).map((p, k) => ({ x: p[0], color: "rgba(255,255,255,.0)", label: `${p[0]}`, row: k % 2 })) : [] });
  // infrared (wavenumber runs right to left, as on real spectra)
  chIR.opts.title = "Infrared spectrum"; chIR.opts.xLabel = "wavenumber (cm⁻¹)"; chIR.opts.yLabel = "transmittance (%)"; chIR.opts.xFmt = v => String(Math.round(-v));
  chIR.draw([{ pts: irCurve(m, i, P.scans, r), color: "#ffb454", width: 1.4, label: "" }], { xMin: -4000, xMax: -500, yMin: 0, yMax: 105, bands: [{ x0: -1500, x1: -500, color: "rgba(255,255,255,.04)" }], vlines: lab ? m.ir.filter(b => b[1] >= 40).map((b, k) => ({ x: -b[0], color: "rgba(255,180,84,.35)", label: b[3].split(" (")[0], row: k % 2 })) : [] });
  // ¹³C NMR
  chC.opts.title = adv ? "¹³C NMR spectrum" : "¹³C NMR (A level)"; chC.opts.xLabel = "chemical shift δ (ppm)"; chC.opts.yLabel = ""; chC.opts.xFmt = v => String(Math.round(-v));
  chC.draw(adv ? [{ pts: c13Curve(m, P.MHz, P.scans, r), color: "#7ee787", width: 1.3, label: "" }] : [], { xMin: -220, xMax: 5, yMin: -10, yMax: 115, vlines: adv && lab ? m.c13.map((cc, k) => ({ x: -cc[0], color: ENVC[cc[1]] + "55", label: String(cc[0]), row: k % 2 })) : [] });
  // ¹H NMR with integration trace
  const hc = adv ? h1Curve(m, P.MHz, P.scans, P.d2o, r) : [], top = Math.max(1e-6, ...hc.map(p => p[1]));
  const env = m.h1.filter(hh => !(P.d2o && hh[5])), minH = Math.min(...env.map(hh => hh[1]));
  let acc = 0; const integ = []; if (adv) { const sorted = env.slice().sort((a, b) => b[0] - a[0]); integ.push([-12.5, 0]); for (const hh of sorted) { const w2 = hh[2] ? (hh[2] * J / P.MHz) / 2 + 0.03 : 0.15; integ.push([-(hh[0] + w2), acc]); acc += hh[1] / minH; integ.push([-(hh[0] - w2), acc]); } integ.push([0.5, acc]); }
  const sc = top / Math.max(1, acc) * 0.9;
  chH.opts.title = adv ? `¹H NMR spectrum (${P.MHz} MHz)` : "¹H NMR (A level)"; chH.opts.xLabel = "chemical shift δ (ppm)"; chH.opts.yLabel = ""; chH.opts.xFmt = v => (-v).toFixed(0);
  chH.draw(adv ? [{ pts: hc, color: "#c4a1ff", width: 1.2, label: "" }, { pts: integ.map(p => [p[0], p[1] * sc]), color: "rgba(255,209,102,.7)", width: 1.2, label: "integration" }] : [], { xMin: -12.5, xMax: 0.5, yMin: -0.05 * top, yMax: top * 1.12, vlines: adv && lab ? env.map((hh, k) => ({ x: -hh[0], color: ENVC[hh[3]] + "44", label: `${hh[1]}H ${hh[5] ? "s (br)" : ["m", "s", "d", "t", "q", "5", "6", "7"][hh[2]]}`, row: k % 2 })).concat([{ x: 0, color: "rgba(255,255,255,.2)", label: "TMS", row: 1 }]) : [] });
  // dock: one ¹H signal zoomed (in Hz from its centre) and the molecular-ion region of the mass spectrum
  const zi = Math.min(P.zoom, env.length) - 1, zh = env[zi]; if (adv && zh) { const L = h1Lines(m, P.MHz, P.d2o).filter(l => l.env === zh[3]), pts = []; for (let x = -40; x <= 40; x += 0.1) { let y = 0; for (const l of L) y += l.a * lor(zh[0] + x / P.MHz, l.d, (l.broad ? 6 : 1.2) / P.MHz); pts.push([x, y]); }
    chZ.opts.title = `Zoom: signal ${zi + 1} at δ ${zh[0]} (${zh[4]})`; chZ.opts.xLabel = "Hz from the centre (lines are J = 7 Hz apart)"; chZ.draw([{ pts, color: ENVC[zh[3]], label: zh[5] ? "broad singlet" : SPLIT[zh[2]] }], { xMin: -40, xMax: 40, yMin: 0 }); }
  else { chZ.opts.title = "Zoom on a ¹H signal (A level)"; chZ.draw([], {}); }
  const M = m.ms[0][0], near = ms.filter(p => p[0] >= M - 2 && p[0] <= M + 3), mtop = Math.max(...near.map(p => p[1]), 1);
  chI.opts.title = "Around the molecular ion"; chI.opts.xLabel = "m/z"; chI.opts.yLabel = "% of M⁺"; chI.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v)) : "";
  chI.draw([{ pts: near.map(p => [p[0], 100 * p[1] / (ms.find(q => q[0] === M) || [0, mtop])[1]]), type: "bars", w: 0.5, color: "#5ad1ff", label: "" }], { xMin: M - 2.5, xMax: M + 3.5, yMin: 0, vlines: [{ x: M + 1, color: "rgba(255,209,102,.3)", label: `M+1 ≈ 1.1 × ${m.nC} = ${(1.1 * m.nC).toFixed(1)}%` }] });
  // readings
  const base = ms.reduce((a, b) => b[1] > a[1] ? b : a); read.set("M", P.mystery && guess === null ? String(M) + (m.hal ? ` and ${M + 2}` : "") : `${M}${m.hal ? ` and ${M + 2} (${m.hal})` : ""}`); read.set("base", `${base[0]}${lab ? " " + base[2] : ""}`);
  read.set("c", adv ? String(new Set(m.c13.map(cc => cc[0])).size) : "A level"); read.set("h", adv ? `${env.length} (${env.map(hh => hh[1] / minH).map(v => +v.toFixed(1)).join(" : ")})` : "A level");
  read.set("sn", adv ? snr(P.scans, K.rng(seed)).toFixed(0) : "–"); read.set("sc", `${score[0]} / ${score[1]}`);
  drawLeft(); ui.hud(""); dirty = false;
}
ui.onLevel = () => redraw(); ui.onTheme = () => redraw();
ui.run(() => { }, () => { if (dirty) drawAll(); });
set({});
ui.tip("Four spectra of the same molecule. Choose a molecule, or switch on Mystery molecule and work it out.", 7000);
