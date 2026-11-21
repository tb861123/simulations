/* =====================================================================
   TRANSITION METALS AND COLOUR
   A transition metal ion surrounded by LIGANDS (H₂O, NH₃, Cl⁻, OH⁻ …)
   is a COMPLEX ION. The ligands' lone pairs split the five d orbitals
   into two groups a small energy ΔE apart. A d electron can jump up by
   absorbing a photon of exactly that energy:
        ΔE = h f = h c ÷ λ
   so the complex absorbs some colours of white light; we see the rest
   (the COMPLEMENTARY colour). Change the ligand, the coordination number
   or the oxidation state and ΔE changes, so the colour changes.
   d⁰ (Sc³⁺) and d¹⁰ (Zn²⁺) ions are colourless: no d–d jump is possible.
   The colour of every solution here is CALCULATED: each complex's
   absorption bands (λmax, ε) make an absorption spectrum; the light that
   gets through is weighted by the eye's three colour sensitivities
   (CIE 1931 curves) and turned into screen red, green and blue.
   ===================================================================== */
const hc = 6.626e-34 * 3e8, NA = 6.022e23;
/* ---- The eye: CIE 1931 colour-matching functions (Wyman, Sloan and Shirley's fit) ---- */
const gp = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
const xbar = l => 1.056 * gp(l, 599.8, 37.9, 31) + 0.362 * gp(l, 442, 16, 26.7) - 0.065 * gp(l, 501.1, 20.4, 26.2);
const ybar = l => 0.821 * gp(l, 568.8, 46.9, 40.5) + 0.286 * gp(l, 530.9, 16.3, 31.1);
const zbar = l => 1.217 * gp(l, 437, 11.8, 36) + 0.681 * gp(l, 459, 26, 13.8);
function toRGB(X, Y, Z) { return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z]; }
const WHITE = (() => { let X = 0, Y = 0, Z = 0; for (let l = 380; l <= 780; l += 5) { X += xbar(l); Y += ybar(l); Z += zbar(l); } return toRGB(X / Y, 1, Z / Y); })();
// the colour seen through a solution whose absorbance at each wavelength is A(λ)
function seen(A) { let X = 0, Y = 0, Z = 0, Yw = 0; for (let l = 380; l <= 780; l += 5) { const T = Math.pow(10, -A(l)); X += T * xbar(l); Y += T * ybar(l); Z += T * zbar(l); Yw += ybar(l); }
  return toRGB(X / Yw, Y / Yw, Z / Yw).map((v, i) => { const u = Math.max(0, Math.min(1, v / WHITE[i])); return Math.round(255 * (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055)); }); }
const rgbStr = c => `rgb(${c.join(",")})`;
// the colour of light of one wavelength (for the spectrum strip)
function specRGB(l) { const c = toRGB(xbar(l), ybar(l), zbar(l)), m = Math.max(...c, 1e-9); return c.map(v => Math.round(255 * Math.pow(Math.max(0, v / m), 0.6))); }
/* ---- The complexes: absorption bands [λmax (nm), ε (dm³ mol⁻¹ cm⁻¹), width (cm⁻¹)], d-electron count, shape ----
   Values are typical literature ones (rounded). ct: a charge-transfer band, not d–d. */
const CX = {
  Cu_aq: { f: "[Cu(H₂O)₆]²⁺", name: "hexaaquacopper(II)", d: 9, geo: "oct", b: [[800, 12, 6500]], ox: 2 },
  Cu_NH3: { f: "[Cu(NH₃)₄(H₂O)₂]²⁺", name: "tetraamminediaquacopper(II)", d: 9, geo: "oct", b: [[600, 52, 6000]], ox: 2 },
  CuCl4: { f: "[CuCl₄]²⁻", name: "tetrachlorocuprate(II)", d: 9, geo: "tet", b: [[1050, 60, 6000], [385, 1500, 4000, "ct"]], ox: 2, c: 0.02 },
  Cu_EDTA: { f: "[Cu(EDTA)]²⁻", name: "copper(II)–EDTA", d: 9, geo: "oct", b: [[735, 90, 6000]], ox: 2 },
  Co_aq: { f: "[Co(H₂O)₆]²⁺", name: "hexaaquacobalt(II)", d: 7, geo: "oct", b: [[515, 5, 2600]], ox: 2 },
  CoCl4: { f: "[CoCl₄]²⁻", name: "tetrachlorocobaltate(II)", d: 7, geo: "tet", b: [[690, 560, 2500], [630, 350, 2500]], ox: 2, c: 0.01 },
  Co_NH3: { f: "[Co(NH₃)₆]²⁺", name: "hexaamminecobalt(II)", d: 7, geo: "oct", b: [[465, 6, 2800]], ox: 2 },
  Co3_NH3: { f: "[Co(NH₃)₆]³⁺", name: "hexaamminecobalt(III)", d: 6, geo: "oct", low: true, b: [[475, 56, 2600], [340, 46, 2600]], ox: 3 },
  Ni_aq: { f: "[Ni(H₂O)₆]²⁺", name: "hexaaquanickel(II)", d: 8, geo: "oct", b: [[395, 5.2, 3500], [720, 2.1, 3500], [655, 1.8, 2500]], ox: 2, c: 0.4 },
  Ni_NH3: { f: "[Ni(NH₃)₆]²⁺", name: "hexaamminenickel(II)", d: 8, geo: "oct", b: [[355, 5, 3500], [575, 4.5, 3500]], ox: 2, c: 0.3 },
  Fe2_aq: { f: "[Fe(H₂O)₆]²⁺", name: "hexaaquairon(II)", d: 6, geo: "oct", b: [[970, 2, 5500]], ox: 2, c: 0.4 },
  Fe3_aq: { f: "[Fe(H₂O)₆]³⁺ (partly [Fe(H₂O)₅OH]²⁺)", name: "hexaaquairon(III)", d: 5, geo: "oct", b: [[300, 2000, 9000, "ct"]], ox: 3, c: 0.005 },
  FeSCN: { f: "[Fe(SCN)(H₂O)₅]²⁺", name: "thiocyanatoiron(III)", d: 5, geo: "oct", b: [[450, 4700, 5500, "ct"]], ox: 3, c: 0.001 },
  Cr_aq: { f: "[Cr(H₂O)₆]³⁺", name: "hexaaquachromium(III)", d: 3, geo: "oct", b: [[575, 13, 4000], [410, 15, 4000]], ox: 3 },
  Cr_OH6: { f: "[Cr(OH)₆]³⁻", name: "hexahydroxochromate(III)", d: 3, geo: "oct", b: [[600, 22, 2600], [430, 25, 2600]], ox: 3 },
  Cr_NH3: { f: "[Cr(NH₃)₆]³⁺", name: "hexaamminechromium(III)", d: 3, geo: "oct", b: [[530, 38, 2800], [370, 30, 2600]], ox: 3 },
  Mn_aq: { f: "[Mn(H₂O)₆]²⁺", name: "hexaaquamanganese(II)", d: 5, geo: "oct", b: [[400, 0.03, 900]], ox: 2 },
  MnO4: { f: "MnO₄⁻", name: "manganate(VII)", d: 0, geo: "tet", b: [[525, 2400, 2000, "ct"], [545, 1600, 900, "ct"], [505, 1500, 900, "ct"]], ox: 7 },
  Zn_aq: { f: "[Zn(H₂O)₆]²⁺", name: "hexaaquazinc(II)", d: 10, geo: "oct", b: [], ox: 2 },
  Zn_OH4: { f: "[Zn(OH)₄]²⁻", name: "tetrahydroxozincate", d: 10, geo: "tet", b: [], ox: 2 },
  Zn_NH3: { f: "[Zn(NH₃)₄]²⁺", name: "tetraamminezinc(II)", d: 10, geo: "tet", b: [], ox: 2 },
  V5: { f: "VO₂⁺", name: "dioxovanadium(V)", d: 0, geo: "oct", b: [[310, 2600, 9000, "ct"]], ox: 5, c: 0.005 },
  V4: { f: "VO²⁺", name: "oxovanadium(IV)", d: 1, geo: "oct", b: [[760, 17, 3000], [625, 8, 2000]], ox: 4 },
  V3: { f: "[V(H₂O)₆]³⁺", name: "hexaaquavanadium(III)", d: 2, geo: "oct", b: [[400, 8, 4500], [600, 6, 4500]], ox: 3 },
  V2: { f: "[V(H₂O)₆]²⁺", name: "hexaaquavanadium(II)", d: 3, geo: "oct", b: [[560, 4, 2400], [850, 3, 2400]], ox: 2 },
  Ti3: { f: "[Ti(H₂O)₆]³⁺", name: "hexaaquatitanium(III)", d: 1, geo: "oct", b: [[500, 5, 3000]], ox: 3 },
  Sc3: { f: "[Sc(H₂O)₆]³⁺", name: "hexaaquascandium(III)", d: 0, geo: "oct", b: [], ox: 3 }
};
// (band widths w are full widths at half height, in cm⁻¹)
// absorbance of a complex at λ (nm) for concentration c (mol dm⁻³) and path l (cm): each band a Gaussian in wavenumber
const absorb = (k, c, l = 1.5) => lam => { let A = 0; for (const [lm, e, w] of CX[k].b) { const dv = 1e7 / lam - 1e7 / lm; const sg = w / 2.355; A += e * c * l * Math.exp(-dv * dv / (2 * sg * sg)); } return A; };
// tube concentration: 0.1 mol dm⁻³, or less for strongly absorbing species so the tube is not black (largest visible absorbance about 1.3)
const peakVis = k => { const A = absorb(k, 1); let m = 0; for (let l = 400; l <= 700; l += 5) m = Math.max(m, A(l)); return m; };
const cOf = k => CX[k].c || Math.min(0.1, 1.3 / (peakVis(k) || 1e-9));
// colorimeter: the top standard gives an absorbance of about 1 with the best filter (rounded to one significant figure)
const scaleOf = k => { const e = Math.max(...FILTERS.map(f => filterA(k, 1e-4, f[1]) / 1e-4)); return +K.sig(1 / e, 1); };
/* ---- Precipitates (seen as cloudy suspensions: colour given) ---- */
const PPT = { Cu_ppt: ["Cu(OH)₂(H₂O)₄", [120, 170, 230], "pale blue"], Co_ppt: ["Co(OH)₂(H₂O)₄", [70, 100, 200], "blue"], Co3_ppt: ["Co(OH)₃(H₂O)₃", [150, 110, 70], "beige-brown"], Ni_ppt: ["Ni(OH)₂(H₂O)₄", [110, 190, 100], "green"], Fe2_ppt: ["Fe(OH)₂(H₂O)₄", [80, 130, 80], "dark green"],
  Fe3_ppt: ["Fe(OH)₃(H₂O)₃", [190, 95, 35], "orange-brown"], Cr_ppt: ["Cr(OH)₃(H₂O)₃", [110, 140, 110], "grey-green"], Mn_ppt: ["Mn(OH)₂(H₂O)₄", [225, 215, 200], "off-white"], Mn3_ppt: ["MnO(OH)", [110, 70, 40], "brown"], Zn_ppt: ["Zn(OH)₂(H₂O)₄", [235, 235, 235], "white"] };
const REAG = [["OHf", "NaOH (a few drops)"], ["OHx", "NaOH (excess)"], ["NH3f", "NH₃(aq) (a few drops)"], ["NH3x", "NH₃(aq) (excess)"], ["HCl", "concentrated HCl"], ["H2O", "water (dilute)"], ["SCN", "KSCN(aq)"], ["EDTA", "EDTA⁴⁻"], ["Zn", "zinc + acid"], ["air", "leave in air"]];
/* ---- What happens: [from, reagent, to, equation, what you see] ---- */
const T_ = [
  ["Cu_aq", "OHf", "Cu_ppt", "[Cu(H₂O)₆]²⁺ + 2OH⁻ → Cu(OH)₂(H₂O)₄ + 2H₂O", "pale blue precipitate"], ["Cu_aq", "OHx", "Cu_ppt", "[Cu(H₂O)₆]²⁺ + 2OH⁻ → Cu(OH)₂(H₂O)₄ + 2H₂O", "pale blue precipitate; does not dissolve in excess"],
  ["Cu_aq", "NH3f", "Cu_ppt", "[Cu(H₂O)₆]²⁺ + 2NH₃ → Cu(OH)₂(H₂O)₄ + 2NH₄⁺", "pale blue precipitate (NH₃ acts as a base)"], ["Cu_aq", "NH3x", "Cu_NH3", "[Cu(H₂O)₆]²⁺ + 4NH₃ → [Cu(NH₃)₄(H₂O)₂]²⁺ + 4H₂O", "deep blue solution"],
  ["Cu_ppt", "NH3x", "Cu_NH3", "Cu(OH)₂(H₂O)₄ + 4NH₃ → [Cu(NH₃)₄(H₂O)₂]²⁺ + 2OH⁻ + 2H₂O", "the precipitate dissolves to a deep blue solution (ligand exchange)"],
  ["Cu_aq", "HCl", "CuCl4", "[Cu(H₂O)₆]²⁺ + 4Cl⁻ ⇌ [CuCl₄]²⁻ + 6H₂O", "yellow-green solution: 6-coordinate octahedral → 4-coordinate tetrahedral (Cl⁻ is larger than H₂O)"], ["CuCl4", "H2O", "Cu_aq", "[CuCl₄]²⁻ + 6H₂O ⇌ [Cu(H₂O)₆]²⁺ + 4Cl⁻", "back to blue: the equilibrium moves left"],
  ["Cu_aq", "EDTA", "Cu_EDTA", "[Cu(H₂O)₆]²⁺ + EDTA⁴⁻ → [Cu(EDTA)]²⁻ + 6H₂O", "slightly deeper blue: 2 particles → 7 particles, ΔS strongly positive (the chelate effect)"], ["Cu_NH3", "EDTA", "Cu_EDTA", "[Cu(NH₃)₄(H₂O)₂]²⁺ + EDTA⁴⁻ → [Cu(EDTA)]²⁻ + 4NH₃ + 2H₂O", "paler blue: EDTA replaces six ligands at once"],
  ["Co_aq", "OHf", "Co_ppt", "[Co(H₂O)₆]²⁺ + 2OH⁻ → Co(OH)₂(H₂O)₄ + 2H₂O", "blue precipitate (turns beige-brown in air)"], ["Co_aq", "OHx", "Co_ppt", "[Co(H₂O)₆]²⁺ + 2OH⁻ → Co(OH)₂(H₂O)₄ + 2H₂O", "blue precipitate, insoluble in excess"],
  ["Co_aq", "NH3f", "Co_ppt", "[Co(H₂O)₆]²⁺ + 2NH₃ → Co(OH)₂(H₂O)₄ + 2NH₄⁺", "blue precipitate"], ["Co_aq", "NH3x", "Co_NH3", "[Co(H₂O)₆]²⁺ + 6NH₃ → [Co(NH₃)₆]²⁺ + 6H₂O", "straw-coloured solution, darkening in air"],
  ["Co_ppt", "NH3x", "Co_NH3", "Co(OH)₂(H₂O)₄ + 6NH₃ → [Co(NH₃)₆]²⁺ + 2OH⁻ + 4H₂O", "the precipitate dissolves: straw-coloured solution"], ["Co_NH3", "air", "Co3_NH3", "4[Co(NH₃)₆]²⁺ + O₂ + 2H₂O → 4[Co(NH₃)₆]³⁺ + 4OH⁻", "darkens to brown-orange: oxidised to cobalt(III)"],
  ["Co_ppt", "air", "Co3_ppt", "Co(OH)₂ is oxidised by O₂ to Co(OH)₃", "turns beige-brown"], ["Co_aq", "HCl", "CoCl4", "[Co(H₂O)₆]²⁺ + 4Cl⁻ ⇌ [CoCl₄]²⁻ + 6H₂O", "deep blue solution (tetrahedral complexes absorb much more strongly)"], ["CoCl4", "H2O", "Co_aq", "[CoCl₄]²⁻ + 6H₂O ⇌ [Co(H₂O)₆]²⁺ + 4Cl⁻", "back to pink"],
  ["Ni_aq", "OHf", "Ni_ppt", "[Ni(H₂O)₆]²⁺ + 2OH⁻ → Ni(OH)₂(H₂O)₄ + 2H₂O", "green precipitate"], ["Ni_aq", "OHx", "Ni_ppt", "[Ni(H₂O)₆]²⁺ + 2OH⁻ → Ni(OH)₂(H₂O)₄ + 2H₂O", "green precipitate, insoluble in excess"], ["Ni_aq", "NH3f", "Ni_ppt", "[Ni(H₂O)₆]²⁺ + 2NH₃ → Ni(OH)₂(H₂O)₄ + 2NH₄⁺", "green precipitate"],
  ["Ni_aq", "NH3x", "Ni_NH3", "[Ni(H₂O)₆]²⁺ + 6NH₃ → [Ni(NH₃)₆]²⁺ + 6H₂O", "blue-violet solution"], ["Ni_ppt", "NH3x", "Ni_NH3", "Ni(OH)₂(H₂O)₄ + 6NH₃ → [Ni(NH₃)₆]²⁺ + 2OH⁻ + 4H₂O", "the precipitate dissolves: blue-violet solution"],
  ["Fe2_aq", "OHf", "Fe2_ppt", "[Fe(H₂O)₆]²⁺ + 2OH⁻ → Fe(OH)₂(H₂O)₄ + 2H₂O", "green precipitate"], ["Fe2_aq", "OHx", "Fe2_ppt", "[Fe(H₂O)₆]²⁺ + 2OH⁻ → Fe(OH)₂(H₂O)₄ + 2H₂O", "green precipitate, insoluble in excess"], ["Fe2_aq", "NH3f", "Fe2_ppt", "[Fe(H₂O)₆]²⁺ + 2NH₃ → Fe(OH)₂(H₂O)₄ + 2NH₄⁺", "green precipitate"], ["Fe2_aq", "NH3x", "Fe2_ppt", "[Fe(H₂O)₆]²⁺ + 2NH₃ → Fe(OH)₂(H₂O)₄ + 2NH₄⁺", "green precipitate, insoluble in excess"],
  ["Fe2_ppt", "air", "Fe3_ppt", "4Fe(OH)₂ + O₂ + 2H₂O → 4Fe(OH)₃", "turns orange-brown at the surface: iron(II) oxidised to iron(III)"],
  ["Fe3_aq", "OHf", "Fe3_ppt", "[Fe(H₂O)₆]³⁺ + 3OH⁻ → Fe(OH)₃(H₂O)₃ + 3H₂O", "orange-brown precipitate"], ["Fe3_aq", "OHx", "Fe3_ppt", "[Fe(H₂O)₆]³⁺ + 3OH⁻ → Fe(OH)₃(H₂O)₃ + 3H₂O", "orange-brown precipitate, insoluble in excess"], ["Fe3_aq", "NH3f", "Fe3_ppt", "[Fe(H₂O)₆]³⁺ + 3NH₃ → Fe(OH)₃(H₂O)₃ + 3NH₄⁺", "orange-brown precipitate"], ["Fe3_aq", "NH3x", "Fe3_ppt", "[Fe(H₂O)₆]³⁺ + 3NH₃ → Fe(OH)₃(H₂O)₃ + 3NH₄⁺", "orange-brown precipitate, insoluble in excess"],
  ["Fe3_aq", "SCN", "FeSCN", "[Fe(H₂O)₆]³⁺ + SCN⁻ → [Fe(SCN)(H₂O)₅]²⁺ + H₂O", "blood-red solution: the test for Fe³⁺"],
  ["Cr_aq", "OHf", "Cr_ppt", "[Cr(H₂O)₆]³⁺ + 3OH⁻ → Cr(OH)₃(H₂O)₃ + 3H₂O", "grey-green precipitate"], ["Cr_aq", "OHx", "Cr_OH6", "[Cr(H₂O)₆]³⁺ + 6OH⁻ → [Cr(OH)₆]³⁻ + 6H₂O", "dark green solution: the hydroxide is amphoteric"], ["Cr_ppt", "OHx", "Cr_OH6", "Cr(OH)₃(H₂O)₃ + 3OH⁻ → [Cr(OH)₆]³⁻ + 3H₂O", "the precipitate dissolves in excess: dark green solution (amphoteric)"],
  ["Cr_aq", "NH3f", "Cr_ppt", "[Cr(H₂O)₆]³⁺ + 3NH₃ → Cr(OH)₃(H₂O)₃ + 3NH₄⁺", "grey-green precipitate"], ["Cr_aq", "NH3x", "Cr_NH3", "[Cr(H₂O)₆]³⁺ + 6NH₃ → [Cr(NH₃)₆]³⁺ + 6H₂O", "purple solution"], ["Cr_ppt", "NH3x", "Cr_NH3", "Cr(OH)₃(H₂O)₃ + 6NH₃ → [Cr(NH₃)₆]³⁺ + 3OH⁻ + 3H₂O", "the precipitate dissolves: purple solution"],
  ["Mn_aq", "OHf", "Mn_ppt", "[Mn(H₂O)₆]²⁺ + 2OH⁻ → Mn(OH)₂(H₂O)₄ + 2H₂O", "off-white precipitate, darkening in air"], ["Mn_aq", "OHx", "Mn_ppt", "[Mn(H₂O)₆]²⁺ + 2OH⁻ → Mn(OH)₂(H₂O)₄ + 2H₂O", "off-white precipitate, insoluble in excess"], ["Mn_aq", "NH3f", "Mn_ppt", "[Mn(H₂O)₆]²⁺ + 2NH₃ → Mn(OH)₂(H₂O)₄ + 2NH₄⁺", "off-white precipitate"], ["Mn_aq", "NH3x", "Mn_ppt", "[Mn(H₂O)₆]²⁺ + 2NH₃ → Mn(OH)₂(H₂O)₄ + 2NH₄⁺", "off-white precipitate"],
  ["Mn_ppt", "air", "Mn3_ppt", "Mn(OH)₂ is oxidised by O₂ to MnO(OH) and MnO₂", "darkens to brown"],
  ["Zn_aq", "OHf", "Zn_ppt", "[Zn(H₂O)₆]²⁺ + 2OH⁻ → Zn(OH)₂(H₂O)₄ + 2H₂O", "white precipitate"], ["Zn_aq", "OHx", "Zn_OH4", "[Zn(H₂O)₆]²⁺ + 4OH⁻ → [Zn(OH)₄]²⁻ + 6H₂O", "colourless solution (amphoteric)"], ["Zn_ppt", "OHx", "Zn_OH4", "Zn(OH)₂(H₂O)₄ + 2OH⁻ → [Zn(OH)₄]²⁻ + 4H₂O", "the white precipitate dissolves: colourless solution"],
  ["Zn_aq", "NH3f", "Zn_ppt", "[Zn(H₂O)₆]²⁺ + 2NH₃ → Zn(OH)₂(H₂O)₄ + 2NH₄⁺", "white precipitate"], ["Zn_aq", "NH3x", "Zn_NH3", "[Zn(H₂O)₆]²⁺ + 4NH₃ → [Zn(NH₃)₄]²⁺ + 6H₂O", "colourless solution"], ["Zn_ppt", "NH3x", "Zn_NH3", "Zn(OH)₂(H₂O)₄ + 4NH₃ → [Zn(NH₃)₄]²⁺ + 2OH⁻ + 4H₂O", "the white precipitate dissolves: colourless solution"],
  ["V5", "Zn", "V4", "2VO₂⁺ + Zn + 4H⁺ → 2VO²⁺ + Zn²⁺ + 2H₂O", "yellow → green (a mixture of yellow and blue) → blue: vanadium(IV)"], ["V4", "Zn", "V3", "2VO²⁺ + Zn + 4H⁺ → 2V³⁺ + Zn²⁺ + 2H₂O", "blue → green: vanadium(III)"], ["V3", "Zn", "V2", "2V³⁺ + Zn → 2V²⁺ + Zn²⁺", "green → violet: vanadium(II)"], ["V2", "air", "V3", "4V²⁺ + O₂ + 4H⁺ → 4V³⁺ + 2H₂O", "violet → green: oxidised back by the air"]
];
const IONS = [["Cu_aq", "Cu²⁺", true], ["Fe2_aq", "Fe²⁺", true], ["Fe3_aq", "Fe³⁺", true], ["Co_aq", "Co²⁺"], ["Ni_aq", "Ni²⁺"], ["Cr_aq", "Cr³⁺"], ["Mn_aq", "Mn²⁺"], ["Zn_aq", "Zn²⁺"], ["V5", "vanadium(V)"]];
const nameOf = k => CX[k] ? CX[k].f : PPT[k][0];
/* ---- d-electron energy levels: fill the lower set first (high spin: each orbital singly before pairing) ---- */
function fillD(n, geo, low) { const lowerN = geo === "oct" ? 3 : 2, orb = new Array(5).fill(0), order = [];
  if (low) { for (let i = 0; i < lowerN; i++) order.push(i); for (let i = 0; i < lowerN; i++) order.push(i); for (let i = lowerN; i < 5; i++) order.push(i); for (let i = lowerN; i < 5; i++) order.push(i); }
  else { for (let i = 0; i < 5; i++) order.push(i); for (let i = 0; i < 5; i++) order.push(i); }
  for (let k = 0; k < n; k++) orb[order[k]]++; return orb; }
/* ---- Colorimetry: a filter passes a band of light; absorbance read through it (with noise) ---- */
const FILTERS = [["violet", 430], ["blue", 470], ["green", 530], ["yellow", 580], ["orange", 610], ["red", 660]];
function filterA(k, c, fl) { const A = absorb(k, c, 1); let s = 0, n = 0; for (let l = fl - 25; l <= fl + 25; l += 5) { s += Math.pow(10, -A(l)); n++; } return -Math.log10(s / n); }
const readA = (k, c, fl, noise, r) => filterA(k, c, fl) + noise * r.gauss();
// a student's calibration: standards 0.02–0.10, straight line through them, then the unknown read off
function unknownFrom(k, fl, noise, cu, r, sc = 0.02) { const pts = [0.2, 0.4, 0.6, 0.8, 1].map(f => [f * sc, readA(k, f * sc, fl, noise, r)]), f = K.linfit(pts); return (readA(k, cu, fl, noise, r) - f.c) / f.m; }
/* ---- Catalysis ---- */
// S₂O₈²⁻ + 2I⁻ → 2SO₄²⁻ + I₂ : slow alone (two negative ions repel); Fe²⁺/Fe³⁺ carry electrons across, rate ∝ [Fe]
function persulfate(fe, t) { const k0 = 0.0025, kc = 1.2, k = k0 + kc * fe, s0 = 0.01; return s0 * (1 - Math.exp(-k * 0.2 * t)); }       // [I₂] made (I⁻ 0.2 mol dm⁻³ in excess)
// 2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂ + 8H₂O : autocatalysed by the Mn²⁺ it makes (60 °C)
function permanganate(mn0, tEnd, dt = 0.5, k1 = 0.002, k2 = 9) { let m = 0.002, mn = mn0, out = [[0, m]]; for (let t = dt; t <= tEnd + 1e-9; t += dt) { const r = (k1 + k2 * mn) * m; m = Math.max(0, m - r * dt); mn += r * dt; out.push([t, m]); } return out; }
const tHalf = pts => { for (let i = 1; i < pts.length; i++) if (pts[i][1] <= 0.001) return pts[i][0]; return null; };

// ---------------- The page ----------------
const DEF = { view: "tube", ion: "Cu_aq", cx: "Cu_NH3", sol: "Cu_NH3", filt: 3, cu: 0.45, noise: 0.01, fe: 0, mn0: 0, cat: "per" };
const P = Object.assign({}, DEF); let state = "Cu_aq", log = [], calib = [], t = 0, unk = null, rnd = K.rng(Date.now() % 9973 + 3), fade = 0, prevCol = null;
const ui = K.app({
  title: "Transition Metals and Colour", subject: "Chemistry",
  blurb: "Add sodium hydroxide, ammonia and chloride to metal ions; see why complexes are coloured; measure concentrations with a colorimeter; transition-metal catalysts",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 2(h) chemical tests: identifying Cu²⁺, Fe²⁺ and Fe³⁺ ions with sodium hydroxide solution (colours of the precipitates); transition metals form coloured compounds and act as catalysts (2(d)–2(e)).", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 15 Transition metals: d-electron configurations, complex ions, ligands and coordination numbers, shapes (octahedral, tetrahedral, square planar), colour from d-orbital splitting (ΔE = hf), ligand exchange with NH₃, Cl⁻ and EDTA, the chelate effect (entropy), reactions of aqueous ions with OH⁻ and NH₃ (amphoteric Cr(OH)₃), vanadium oxidation states with zinc, heterogeneous and homogeneous catalysis (Fe²⁺ with S₂O₈²⁻ and I⁻; autocatalysis by Mn²⁺); colorimetry." } },
  missions: [
    { title: "Test for Cu²⁺, Fe²⁺ and Fe³⁺", q: "Add a few drops of sodium hydroxide to each of the three ions. Record the colour of each precipitate.", hint: "Cu²⁺: pale blue precipitate (copper(II) hydroxide). Fe²⁺: green precipitate (iron(II) hydroxide). Fe³⁺: orange-brown precipitate (iron(III) hydroxide). The colour identifies the ion.", setup() { set({ ion: "Cu_aq" }); } },
    { title: "Iron(II) goes rusty", q: "Make the green iron(II) hydroxide precipitate and leave it in air. What happens and why?", hint: "It turns orange-brown at the surface: oxygen oxidises iron(II) to iron(III). Test iron(II) quickly, or the result looks like iron(III).", setup() { set({ ion: "Fe2_aq" }); } },
    { title: "Coloured or colourless?", q: "Compare Zn²⁺ and Cu²⁺ solutions. Why is one coloured?", hint: "Zn²⁺ is d¹⁰: every d orbital is full, so no electron can jump to a higher one and no visible light is absorbed. Cu²⁺ (d⁹) has a gap in the upper set, so it absorbs red-orange light and looks blue.", setup() { set({ ion: "Zn_aq" }); } },
    { lvl: "adv", title: "Ammonia: base, then ligand", q: "Cu²⁺: add a few drops of ammonia, then excess. Explain both changes.", hint: "First NH₃ acts as a base, removing H⁺ from water ligands: Cu(OH)₂(H₂O)₄ precipitates. In excess it replaces four water ligands (ligand exchange): deep blue [Cu(NH₃)₄(H₂O)₂]²⁺ dissolves. Stronger-field NH₃ raises ΔE, so the absorbed light moves to shorter wavelength (600 nm).", setup() { set({ ion: "Cu_aq" }); } },
    { lvl: "adv", title: "Chloride changes the shape", q: "Add concentrated HCl to Cu²⁺, then dilute with water. Why does the coordination number change?", hint: "Cl⁻ ions are larger than H₂O molecules, so only four fit: tetrahedral [CuCl₄]²⁻, yellow-green. It is an equilibrium: adding water moves it back to the blue aqua ion.", setup() { set({ ion: "Cu_aq" }); } },
    { lvl: "adv", title: "Amphoteric hydroxides", q: "Cr³⁺ with a few drops then excess sodium hydroxide. Then Zn²⁺. Which precipitates dissolve in excess?", hint: "Cr(OH)₃ and Zn(OH)₂ are amphoteric: they react with excess OH⁻ to form soluble [Cr(OH)₆]³⁻ (dark green) and [Zn(OH)₄]²⁻ (colourless). Cu, Fe, Ni, Co and Mn hydroxides do not.", setup() { set({ ion: "Cr_aq" }); } },
    { lvl: "adv", title: "Vanadium's rainbow", q: "Add zinc and acid to vanadium(V) again and again. List each colour and oxidation state.", hint: "VO₂⁺ yellow (+5) → VO²⁺ blue (+4) (passing through green, a mixture) → V³⁺ green (+3) → V²⁺ violet (+2). Zinc is a strong enough reducing agent to reach +2. Left in air, V²⁺ is oxidised back to green V³⁺.", setup() { set({ ion: "V5" }); } },
    { lvl: "adv", title: "Why colour?", q: "Go to Why colour? Compare [Cu(H₂O)₆]²⁺, [Cu(NH₃)₄(H₂O)₂]²⁺ and [CuCl₄]²⁻. How do the ligand and shape change ΔE and the colour?", hint: "NH₃ splits the d orbitals more than H₂O: bigger ΔE, shorter λ absorbed (800 → 600 nm), deeper blue. Tetrahedral complexes split less (about 4/9 as much), so [CuCl₄]²⁻ absorbs in the infrared; its yellow comes from a charge-transfer band in the violet.", setup() { set({ view: "colour", cx: "Cu_aq" }); } },
    { lvl: "adv", title: "The colorimeter", q: "Measure the absorbance of the five standards, draw the calibration line, then find the unknown concentration. Which filter gives the steepest line?", hint: "Choose the filter of the colour the solution ABSORBS (complementary to the colour you see): for deep blue copper–ammonia, orange or yellow. The steeper the calibration line, the more precisely you can read the unknown.", setup() { set({ view: "colori" }); } },
    { lvl: "adv", title: "A homogeneous catalyst", q: "Catalysis: peroxodisulfate and iodide with no iron, then with Fe²⁺. Why does iron help when the two ions react so slowly alone?", hint: "S₂O₈²⁻ and I⁻ are both negative, so they repel: high Ea. Fe²⁺ is oxidised by S₂O₈²⁻ to Fe³⁺, which oxidises I⁻ back to I₂ and is reduced to Fe²⁺: two steps between oppositely charged ions. Iron can do this because it has variable oxidation states.", setup() { set({ view: "cat", cat: "per", fe: 0 }); } },
    { lvl: "adv", title: "Autocatalysis", q: "Manganate(VII) and ethanedioate at 60 °C: why is it slow at first and then speeds up? Add some Mn²⁺ at the start.", hint: "Mn²⁺ is a product and also the catalyst, so the reaction speeds itself up (autocatalysis): an S-shaped curve. Adding Mn²⁺ at the start removes the slow beginning.", setup() { set({ view: "cat", cat: "mn", mn0: 0 }); } }
  ],
  batch: [
    { title: "Beer–Lambert: absorbance against concentration", question: "Is the absorbance of [Cu(NH₃)₄(H₂O)₂]²⁺ proportional to its concentration?", how: "Yellow filter (580 nm), 1 cm cell, meter noise ±0.01.", xLabel: "concentration (mol dm⁻³)", yLabel: "absorbance", xs: [0, 0.004, 0.008, 0.012, 0.016, 0.02], reps: 5, yMin: 0, fit: true, theory: c => filterA("Cu_NH3", c, 580), theoryLabel: "A = εcl", run: (c, r) => readA("Cu_NH3", c, 580, 0.01, r), note: "A straight line through the origin: A = εcl. (Bands are wide, so a filter sees almost a single ε.)" },
    { title: "Which filter?", question: "How big is the error in the unknown concentration with each filter?", how: "Unknown 0.009 mol dm⁻³ copper–ammonia; five standards 0.004–0.020; |measured − true|. 1 violet, 2 blue, 3 green, 4 yellow, 5 orange, 6 red.", xLabel: "filter", yLabel: "|error| (mol dm⁻³)", xs: [1, 2, 3, 4, 5, 6], reps: 40, yMin: 0, run: (i, r) => Math.abs(unknownFrom("Cu_NH3", FILTERS[i - 1][1], 0.01, 0.009, r) - 0.009), note: "Violet and blue light mostly pass through a blue solution, so the calibration line is shallow and the same meter error becomes a concentration error several times larger. Use the complementary colour (orange or yellow)." },
    { title: "One class's unknown", question: "If 300 students each make a five-point calibration and measure the unknown with the yellow filter, how close are they?", how: "Unknown 0.009 mol dm⁻³; standards 0.004–0.020; meter noise ±0.01 absorbance.", yLabel: "concentration found (mol dm⁻³)", reps: 300, bins: 24, theory: 0.009, theoryLabel: "true value", run: (x, r) => unknownFrom("Cu_NH3", 580, 0.01, 0.009, r), note: "Most are within a few thousandths of a mol dm⁻³." },
    { lvl: "adv", title: "Iron as a catalyst", question: "How does the initial rate of S₂O₈²⁻ + I⁻ depend on the amount of Fe²⁺ added?", how: "Initial rate of I₂ formation over the first 20 s, from readings with ±2% noise.", xLabel: "[Fe²⁺] (mol dm⁻³ × 1000)", yLabel: "initial rate (mol dm⁻³ s⁻¹ × 10⁵)", xs: [0, 1, 2, 3, 4, 5], reps: 6, yMin: 0, fit: true, theory: x => 1e5 * (persulfate(x / 1000, 1e-3) / 1e-3), theoryLabel: "model", run: (x, r) => { const pts = [0, 5, 10, 15, 20].map(tt => [tt, persulfate(x / 1000, tt) * (1 + 0.02 * r.gauss())]); return 1e5 * K.linfit(pts).m; }, note: "The rate rises in a straight line with the catalyst: the catalysed path adds to the slow uncatalysed one." },
    { lvl: "adv", title: "Autocatalysis: adding Mn²⁺ at the start", question: "How long does the purple take to fade to half, with different amounts of Mn²⁺ added at the start?", how: "MnO₄⁻ 0.002 mol dm⁻³, excess ethanedioate, 60 °C; rate = (k₁ + k₂[Mn²⁺])[MnO₄⁻]; temperature ±1 °C changes k by about 6%.", xLabel: "Mn²⁺ added (mol dm⁻³ × 1000)", yLabel: "time to half (s)", xs: [0, 0.25, 0.5, 1, 2, 4], reps: 6, yMin: 0, theory: x => tHalf(permanganate(x / 1000, 2000)), theoryLabel: "model", run: (x, r) => { const f = 1 + 0.06 * r.gauss(); return tHalf(permanganate(x / 1000, 2000, 0.5, 0.002 * f, 9 * f)); }, note: "With no Mn²⁺ the start is slow (waiting for the catalyst to be made). A little Mn²⁺ removes the delay." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 2(h)", text: "Sodium hydroxide solution tests for metal ions: Cu²⁺ gives a blue precipitate, Fe²⁺ a green precipitate, Fe³⁺ a brown (orange-brown) precipitate." },
      { lvl: "std", tag: "4CH1", text: "Transition metals form coloured compounds and are often catalysts (iron in the Haber process). Zn²⁺ compounds are white: zinc is not a typical transition metal." },
      { lvl: "adv", tag: "9CH0 15", text: "A transition metal forms at least one stable ion with an incomplete d sub-shell. Sc³⁺ (d⁰) and Zn²⁺ (d¹⁰) are colourless." },
      { lvl: "adv", tag: "9CH0 15", text: "Ligands donate lone pairs (dative bonds). Octahedral 6-coordinate (small ligands H₂O, NH₃); tetrahedral 4-coordinate (larger Cl⁻); square planar (cisplatin). Bidentate: en, C₂O₄²⁻; hexadentate: EDTA⁴⁻." },
      { lvl: "adv", tag: "9CH0 15", text: "Colour: ligands split the d orbitals by ΔE; light of frequency f = ΔE/h is absorbed and the complementary colour is seen. ΔE depends on the metal, its oxidation state, the ligand and the coordination number." },
      { lvl: "adv", tag: "9CH0 15", text: "Chelate effect: [Cu(H₂O)₆]²⁺ + EDTA⁴⁻ → [Cu(EDTA)]²⁻ + 6H₂O increases the number of particles, so ΔS is positive and ΔG negative: chelates are very stable." },
      { lvl: "adv", tag: "9CH0 15", text: "OH⁻ and a little NH₃ remove H⁺ from aqua ions to give neutral hydroxide precipitates. Excess NH₃ dissolves Cu, Ni, Co, Zn hydroxides (ammine complexes); excess OH⁻ dissolves Cr(OH)₃ and Zn(OH)₂ (amphoteric)." },
      { lvl: "adv", tag: "9CH0 15", text: "Catalysts: variable oxidation states let a transition metal ion take part in a two-step path of lower Ea (Fe²⁺/Fe³⁺ with S₂O₈²⁻ and I⁻). Autocatalysis: a product (Mn²⁺) catalyses the reaction." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe a test to show that a solution contains iron(III) ions rather than iron(II) ions.", ans: "<ul><li>add sodium hydroxide solution</li><li>iron(III): orange-brown precipitate</li><li>iron(II) would give a green precipitate</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why [Cu(H₂O)₆]²⁺ is blue.", ans: "<ul><li>water ligands split the d orbitals into two energy levels</li><li>an electron absorbs (red/orange) light of energy ΔE = hf and is promoted</li><li>the remaining (complementary) light, blue, is transmitted/seen</li></ul>" },
      { lvl: "adv", marks: 2, q: () => { const b = CX[P.cx].b.filter(x => !x[3])[0]; return b ? `A complex absorbs most strongly at ${b[0]} nm. Calculate ΔE in kJ mol⁻¹.` : "A complex absorbs most strongly at 600 nm. Calculate ΔE in kJ mol⁻¹."; }, ans: () => { const b = CX[P.cx].b.filter(x => !x[3])[0], l = b ? b[0] : 600; return `<ul><li>E = hc/λ = 6.63×10⁻³⁴ × 3.00×10⁸ ÷ ${l}×10⁻⁹ = ${(hc / (l * 1e-9)).toExponential(2)} J</li><li>× 6.02×10²³ ÷ 1000 = ${(hc / (l * 1e-9) * NA / 1000).toFixed(0)} kJ mol⁻¹</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain, in terms of entropy, why EDTA⁴⁻ replaces ammonia ligands around Cu²⁺.", ans: "<ul><li>[Cu(NH₃)₄(H₂O)₂]²⁺ + EDTA⁴⁻ → [Cu(EDTA)]²⁻ + 4NH₃ + 2H₂O: 2 particles become 7</li><li>so ΔS(system) is large and positive</li><li>ΔH is small (similar bonds), so ΔG = ΔH − TΔS is negative: feasible</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Each complex has absorption bands (λmax, molar absorptivity ε, width at half height) from typical literature values, rounded. The absorbance spectrum is the sum of Gaussian bands (in wavenumber): A(λ) = Σ ε c l e^(−(Δν̃)²/2σ²), σ = width ÷ 2.355.</li>
<li>Seen colour: the light transmitted, T = 10^(−A), is weighted by the CIE 1931 colour-matching functions (the fit by Wyman, Sloan and Shirley, 2013), under an equal-energy white light, and converted to sRGB. Tubes are 1.5 cm across and 0.1 mol dm⁻³, or more dilute for strongly coloured species (so that the largest visible absorbance is about 1.3), as you would make them in the lab.</li>
<li>Precipitates are drawn as cloudy suspensions with a fixed colour.</li>
<li>Splitting diagrams fill electrons high spin (one per orbital before pairing), except cobalt(III) ammine, which is low spin.</li>
<li>Colorimeter: a filter passes 50 nm of light; the meter reads absorbance with random noise (±0.01).</li>
<li>Catalysis: S₂O₈²⁻ + 2I⁻ with rate (k₀ + k_c[Fe])[S₂O₈²⁻][I⁻], iodide in excess. Autocatalysis: rate = (k₁ + k₂[Mn²⁺])[MnO₄⁻], ethanedioate and acid in excess. Rate constants are illustrative.</li></ul>
<h3>Simplifications</h3>
<ul><li>Every reagent is added in the amount described and reaction is instant; mixtures (part-way) are not shown, except through the words.</li><li>[Fe(H₂O)₆]³⁺ looks yellow-brown in the tube because some has lost H⁺ to give [Fe(H₂O)₅(OH)]²⁺ with a charge-transfer band; the model uses one band for this.</li><li>Real school solutions of Cr³⁺ often look green because sulfate or chloride replaces some water ligands.</li><li>The purple of chromium(III) with excess ammonia follows the specification; the pure hexaammine is yellow-orange.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "tube", options: [["tube", "🧪 Test tubes"], ["colour", "🌈 Why colour?"], ["colori", "📏 Colorimeter"], ["cat", "⚙ Catalysis"]], on: v => { P.view = v; sync(); } });
const gT = ui.group("Test tube"); ctl.ion = K.seg(gT, { label: "Start with", value: "Cu_aq", options: IONS.map(([k, n]) => [k, n]), on: v => { P.ion = v; fresh(); } });
const rbox = K.$("div"); rbox.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 8px"; gT.append(rbox); const rbtns = REAG.map(([k, n]) => { const b = K.btn(rbox, n, () => addReagent(k), "small"); return [k, b]; });
K.btn(K.row(gT), "🧪 Fresh tube", () => fresh(), "primary");
const gC = ui.group("Complex"); const csel = K.$("select"); csel.style.cssText = "width:100%;padding:5px;background:#16203a;color:inherit;border:1px solid #3a4a6b;border-radius:6px"; csel.innerHTML = Object.keys(CX).map(k => `<option value="${k}">${CX[k].f}</option>`).join(""); csel.onchange = () => { P.cx = csel.value; }; gC.append(csel);
const gM = ui.group("Colorimeter");
const msel = K.$("select"); msel.style.cssText = csel.style.cssText; ["Cu_NH3", "Cu_aq", "Ni_aq", "Co_aq", "CoCl4", "Cr_aq", "FeSCN", "MnO4"].forEach(k => msel.innerHTML += `<option value="${k}">${CX[k].f}</option>`); msel.onchange = () => { P.sol = msel.value; calib = []; unk = null; }; gM.append(msel);
ctl.filt = K.seg(gM, { label: "Filter", value: 3, options: FILTERS.map(([n], i) => [i, n]), on: v => { P.filt = v; calib = []; unk = null; } });
ctl.noise = K.slider(gM, { label: "Meter noise (SD)", min: 0, max: 0.05, step: 0.005, value: 0.01, fmt: v => "±" + v.toFixed(3), on: v => P.noise = v });
let rr = K.row(gM); K.btn(rr, "📏 Measure the standards", () => { const sc = scaleC(); calib = [0.2, 0.4, 0.6, 0.8, 1].map(f => [f * sc, readA(P.sol, f * sc, FILTERS[P.filt][1], P.noise, rnd)]); }, "primary"); K.btn(rr, "❓ Measure the unknown", () => { unk = readA(P.sol, P.cu * scaleC(), FILTERS[P.filt][1], P.noise, rnd); });
const gK = ui.group("Catalysis"); ctl.cat = K.seg(gK, { value: "per", options: [["per", "S₂O₈²⁻ + I⁻"], ["mn", "MnO₄⁻ + C₂O₄²⁻ (autocatalysis)"]], on: v => { P.cat = v; t = 0; } });
ctl.fe = K.slider(gK, { label: "Fe²⁺ catalyst added", min: 0, max: 0.005, step: 0.0005, value: 0, fmt: v => v.toFixed(4) + " mol dm⁻³", on: v => { P.fe = v; t = 0; } });
ctl.mn0 = K.slider(gK, { label: "Mn²⁺ added at the start", min: 0, max: 0.004, step: 0.00025, value: 0, fmt: v => v.toFixed(5) + " mol dm⁻³", on: v => { P.mn0 = v; t = 0; } });
K.btn(K.row(gK), "↺ Mix again", () => t = 0, "primary");
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
const scaleC = () => scaleOf(P.sol);
function sync() { ctl.view.set(P.view); ctl.ion.set(P.ion); csel.value = P.cx; msel.value = P.sol; ctl.filt.set(P.filt); ctl.noise.set(P.noise); ctl.cat.set(P.cat); ctl.fe.set(P.fe); ctl.mn0.set(P.mn0);
  gT.style.display = P.view === "tube" ? "" : "none"; gC.style.display = P.view === "colour" ? "" : "none"; gM.style.display = P.view === "colori" ? "" : "none"; gK.style.display = P.view === "cat" ? "" : "none";
  const adv = ui.level === "adv"; ctl.ion.el.querySelectorAll("button").forEach((b, i) => b.style.display = adv || IONS[i][2] ? "" : "none"); rbtns.forEach(([k, b]) => b.style.display = adv || k === "OHf" || k === "OHx" || k === "air" ? "" : "none"); }
function set(o) { Object.assign(P, DEF, o); calib = []; unk = null; t = 0; fresh(); sync(); }
function fresh() { state = P.ion; log = [{ eq: `Start: ${nameOf(state)}${CX[state] ? " (" + CX[state].name + ")" : ""}`, see: "" }]; prevCol = null; fade = 1; }
function addReagent(k) { const tr = T_.find(x => x[0] === state && x[1] === k), rn = REAG.find(x => x[0] === k)[1];
  prevCol = tubeCol(state); if (tr) { state = tr[2]; log.push({ r: rn, eq: tr[3], see: tr[4] }); fade = 0; } else log.push({ r: rn, eq: "", see: "no visible change" }); if (log.length > 8) log.splice(1, 1); }
const tubeCol = k => CX[k] ? seen(absorb(k, cOf(k))) : PPT[k][1];

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
function tube(c, x, y, w, h, col, cloudy, label) {
  c.fillStyle = "rgba(255,255,255,.06)"; c.fillRect(x, y, w, h); const top = y + h * 0.3;
  c.fillStyle = rgbStr(col); c.beginPath(); c.moveTo(x, top); c.lineTo(x, y + h - w / 2); c.arc(x + w / 2, y + h - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w, top); c.closePath(); c.fill();
  if (cloudy) { const r = K.rng(5); for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${col.map(v => Math.min(255, v + 40)).join(",")},.5)`; c.beginPath(); c.arc(x + 3 + r() * (w - 6), top + r() * (h * 0.7 - w / 2) + (i > 100 ? h * 0.2 : 0), 1.5 + r() * 2.5, 0, 6.3); c.fill(); } }
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h - w / 2); c.arc(x + w / 2, y + h - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w, y); c.stroke(); c.lineWidth = 1;
  if (label) TX(c, label, x + w / 2, y + h + 18, "#cfd8ea", "center", "12px");
}
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "tube") {
    fade = Math.min(1, fade + (dt || 0.016) * 1.5); const now = tubeCol(state), col = prevCol && fade < 1 ? now.map((v, i) => Math.round(prevCol[i] + (v - prevCol[i]) * fade)) : now;
    tube(c, 50, 50, 70, h - 130, col, !!PPT[state], nameOf(state)); TX(c, CX[state] ? "solution" : "precipitate (" + PPT[state][2] + ")", 85, h - 40, "#8fa0bf", "center", "11.5px");
    // a rack of the starting aqua ions for comparison
    let x = 170; TX(c, "The starting solutions", x, 34, "#8fa0bf", "left", "600 11.5px"); IONS.filter(i => adv || i[2]).forEach(([k, n], i) => { tube(c, x + i * 38, 46, 24, 110, tubeCol(k), false, ""); TX(c, n, x + i * 38 + 12, 176, "#aab6cc", "center", "10.5px"); });
    let y = 214; TX(c, "What you did, what you saw", x, y, "#eef2f8", "left", "600 13px"); y += 20;
    for (const L of log) { if (L.r) { TX(c, "+ " + L.r, x, y, "#ffd166", "left", "600 12px"); y += 16; } if (adv && L.eq) { y = WRAP(c, L.eq, x + 12, y, w - x - 30, 15, "#cfd8ea", "12px"); } else if (!L.r) { TX(c, L.eq, x, y, "#cfd8ea", "left", "12px"); y += 16; } if (L.see) y = WRAP(c, "→ " + L.see, x + 12, y, w - x - 30, 15, "#7ee787", "11.5px"); y += 4; }
    if (!adv) TX(c, "Equations are shown at A level", w - 14, h - 10, "#8fa0bf", "right", "11px");
  } else if (P.view === "colour") {
    const X = CX[P.cx], col = seen(absorb(P.cx, cOf(P.cx))); tube(c, 40, 50, 60, h - 140, col, false, X.f.length > 20 ? "" : X.f);
    TX(c, X.f, 140, 34, "#eef2f8", "left", "600 15px"); TX(c, `${X.name}: metal oxidation state +${X.ox}, d${["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰"][X.d]}, ${X.geo === "oct" ? "octahedral" : "tetrahedral"}`, 140, 54, "#aab6cc", "left", "12px");
    // splitting diagram
    const dd = X.b.filter(b => !b[3]).sort((a, b) => b[1] - a[1])[0], lam = dd ? dd[0] : null, dE = lam ? hc / (lam * 1e-9) * NA / 1000 : null;
    const ox = 160, oy = 110, gap = dE ? Math.min(150, Math.max(40, dE * 0.65)) : 80, ybot = oy + 200, ytop = ybot - gap, orb = fillD(X.d, X.geo, X.low), lowN = X.geo === "oct" ? 3 : 2;
    TX(c, "d orbitals in the complex", ox, oy - 14, "#8fa0bf", "left", "600 11.5px");
    for (let i = 0; i < 5; i++) { const lower = i < lowN, k = lower ? i : i - lowN, n = lower ? lowN : 5 - lowN, yy = lower ? ybot : ytop, xx = ox + 30 + (k - (n - 1) / 2) * 46 + 50; c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; c.beginPath(); c.moveTo(xx - 18, yy); c.lineTo(xx + 18, yy); c.stroke(); c.lineWidth = 1;
      for (let e = 0; e < orb[i]; e++) { const ex = xx + (e ? 6 : -6), up = e === 0; c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.moveTo(ex, yy - 3); c.lineTo(ex, yy - 22); c.stroke(); c.beginPath(); if (up) { c.moveTo(ex - 4, yy - 16); c.lineTo(ex, yy - 22); c.lineTo(ex + 4, yy - 16); } else { c.moveTo(ex - 4, yy - 9); c.lineTo(ex, yy - 3); c.lineTo(ex + 4, yy - 9); } c.stroke(); c.lineWidth = 1; } }
    c.strokeStyle = "#8fa0bf"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(ox + 230, ytop); c.lineTo(ox + 230, ybot); c.stroke(); c.setLineDash([]); TX(c, dE ? `ΔE ≈ ${dE.toFixed(0)} kJ/mol` : "no d–d jump", ox + 238, (ytop + ybot) / 2 + 4, "#ffd166", "left", "600 12.5px");
    const canJump = X.d > 0 && X.d < 10; let y = ybot + 34;
    y = WRAP(c, !canJump ? `d${X.d === 0 ? "⁰" : "¹⁰"}: ${X.d === 0 ? "there are no d electrons to promote" : "the upper orbitals are full, so no electron can move up"}. ${X.b.length ? "Any colour comes from charge transfer, not d–d." : "No visible light is absorbed: colourless."}` :
      `An electron in the lower set absorbs a photon with E = ΔE and jumps to the upper set. ΔE = hc/λ, so it absorbs λ ≈ ${lam} nm${lam > 750 ? " (in the near infrared; the tail reaches the red end of the visible)" : ""}. We see what is left.`, ox, y, w - ox - 20, 16, "#cfd8ea", "12px");
    if (X.b.some(b => b[3])) y = WRAP(c, "This complex also has a strong charge-transfer band (an electron moves between ligand and metal) near " + X.b.find(b => b[3])[0] + " nm.", ox, y + 4, w - ox - 20, 16, "#8fa0bf", "11.5px");
    // colour wheel
    const wx = w - 110, wy = 120, R = 70, hues = [["red", 660], ["orange", 610], ["yellow", 580], ["green", 530], ["blue", 470], ["violet", 420]]; hues.forEach(([n, l], i) => { c.fillStyle = rgbStr(specRGB(l)); c.beginPath(); c.moveTo(wx, wy); c.arc(wx, wy, R, i * Math.PI / 3 - Math.PI / 2, (i + 1) * Math.PI / 3 - Math.PI / 2); c.closePath(); c.fill(); const a = (i + 0.5) * Math.PI / 3 - Math.PI / 2; TX(c, n, wx + Math.cos(a) * (R + 16), wy + Math.sin(a) * (R + 16) + 4, "#cfd8ea", "center", "10.5px"); });
    TX(c, "absorbed ↔ seen: opposite", wx, wy + R + 34, "#8fa0bf", "center", "11px");
    if (!adv) TX(c, "d-orbital splitting is A level", w - 14, h - 10, "#8fa0bf", "right", "11px");
  } else if (P.view === "colori") {
    const X = CX[P.sol], sc = scaleC(), fl = FILTERS[P.filt]; TX(c, `Colorimeter: ${X.f}`, 30, 34, "#eef2f8", "left", "600 14px");
    c.fillStyle = "#e8e8e8"; c.beginPath(); c.arc(70, 160, 18, 0, 6.3); c.fill(); TX(c, "lamp", 70, 196, "#8fa0bf", "center", "11px");
    c.fillStyle = rgbStr(specRGB(fl[1])); c.fillRect(110, 130, 22, 60); TX(c, fl[0] + " filter", 121, 210, "#8fa0bf", "center", "11px");
    c.strokeStyle = rgbStr(specRGB(fl[1])); c.lineWidth = 6; c.beginPath(); c.moveTo(132, 160); c.lineTo(190, 160); c.stroke();
    const A = unk == null ? (calib.length ? calib[calib.length - 1][1] : 0) : unk, Tt = Math.pow(10, -A); c.globalAlpha = Math.max(0.05, Tt); c.beginPath(); c.moveTo(250, 160); c.lineTo(310, 160); c.stroke(); c.globalAlpha = 1; c.lineWidth = 1;
    c.fillStyle = rgbStr(seen(absorb(P.sol, P.cu * sc))); c.fillRect(190, 120, 60, 80); c.strokeStyle = "#fff"; c.strokeRect(190, 120, 60, 80); TX(c, "cuvette (1 cm)", 220, 216, "#8fa0bf", "center", "11px");
    c.fillStyle = "#3a4a6b"; c.fillRect(310, 135, 40, 50); TX(c, "detector", 330, 200, "#8fa0bf", "center", "11px");
    let y = 260; TX(c, "Standards", 30, y, "#eef2f8", "left", "600 12.5px"); y += 18; calib.forEach(([cc, a]) => { TX(c, `${K.sig(cc, 2)} mol dm⁻³: A = ${a.toFixed(3)}`, 30, y, "#cfd8ea", "left", "12px"); y += 16; }); if (!calib.length) TX(c, "Press 📏 Measure the standards.", 30, y, "#8fa0bf", "left", "11.5px");
    let x = 400; y = 60; y = WRAP(c, "Beer–Lambert law: absorbance A = ε c l, so A is proportional to concentration. A calibration line from standards turns the unknown's absorbance into a concentration.", x, y, w - x - 20, 16, "#cfd8ea", "12px");
    y = WRAP(c, "Choose the filter whose colour the solution absorbs most: the complementary colour to the one you see.", x, y + 6, w - x - 20, 16, "#8fa0bf", "11.5px");
    if (unk != null && calib.length) { const f = K.linfit(calib), cu = (unk - f.c) / f.m; TX(c, `Unknown: A = ${unk.toFixed(3)} → ${K.sig(cu, 3)} mol dm⁻³`, x, y + 20, "#7ee787", "left", "600 13px"); TX(c, `(true value ${K.sig(P.cu * sc, 3)})`, x, y + 38, "#8fa0bf", "left", "11.5px"); }
  } else {
    TX(c, P.cat === "per" ? "S₂O₈²⁻ + 2I⁻ → 2SO₄²⁻ + I₂" : "2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂ + 8H₂O   (60 °C)", 30, 34, "#eef2f8", "left", "600 14px");
    let col; if (P.cat === "per") { const i2 = persulfate(P.fe, t) / 8; col = seen(l => 750 * i2 * 1.5 * Math.exp(-((1e7 / l - 1e7 / 460) ** 2) / (2 * 3500 ** 2))); }
    else { const pts = permanganate(P.mn0, t, 0.5), m = pts[pts.length - 1][1]; col = seen(absorb("MnO4", m / 4)); }
    tube(c, 50, 60, 70, h - 140, col, false, "");
    let y = 70; const x = 160;
    const steps = P.cat === "per" ? (P.fe > 0 ? [["S₂O₈²⁻ + 2Fe²⁺ → 2SO₄²⁻ + 2Fe³⁺", "step 1: oppositely charged ions attract"], ["2Fe³⁺ + 2I⁻ → 2Fe²⁺ + I₂", "step 2: Fe²⁺ is regenerated"]] : [["S₂O₈²⁻ + 2I⁻ → 2SO₄²⁻ + I₂", "one step: two negative ions must collide, so they repel: high Ea, slow"]])
      : [["MnO₄⁻ + 4Mn²⁺ + 8H⁺ → 5Mn³⁺ + 4H₂O", "Mn²⁺ (a product) reacts with MnO₄⁻"], ["2Mn³⁺ + C₂O₄²⁻ → 2Mn²⁺ + 2CO₂", "Mn²⁺ is regenerated: autocatalysis"]];
    if (adv) for (const [s, n] of steps) { TX(c, s, x, y, "#cfd8ea", "left", "13px"); TX(c, n, x, y + 16, "#8fa0bf", "left", "11.5px"); y += 42; }
    y = WRAP(c, P.cat === "per" ? "Iron can change between +2 and +3, so it gives the reaction a new path with two steps between oppositely charged ions. This is homogeneous catalysis: the catalyst is in the same phase (aqueous) as the reactants." : "The purple fades slowly at first, then quickly, then slowly again (an S-shaped curve): the reaction makes its own catalyst.", x, y + 6, w - x - 20, 16, "#cfd8ea", "12px");
    TX(c, `${t.toFixed(0)} s`, 85, h - 50, "#ffd166", "center", "600 13px");
  }
  ui.hud("");
}

// ---------------- Charts and readings ----------------
function charts() {
  const adv = ui.level === "adv"; chA.opts.xFmt = null; chB.opts.xFmt = null;
  const spec = (k, c, l = 1.5) => { const A = absorb(k, c, l), pts = []; for (let lam = 350; lam <= 850; lam += 5) pts.push([lam, A(lam)]); return pts; };
  if (P.view === "tube" || P.view === "colour") {
    const k = P.view === "tube" ? (CX[state] ? state : null) : P.cx;
    chA.opts.title = k ? `Absorption spectrum of ${CX[k].f}` : "Precipitate: a suspension scatters light"; chA.opts.xLabel = "wavelength (nm)"; chA.opts.yLabel = "absorbance";
    chA.draw(k ? [{ pts: spec(k, cOf(k)).map(p => [p[0], Math.min(3, p[1])]), color: "#ffb454", label: "light absorbed" }] : [], { xMin: 350, xMax: 850, yMin: 0, bands: [{ x0: 350, x1: 380, color: "rgba(160,100,255,.12)" }, { x0: 750, x1: 850, color: "rgba(255,60,60,.08)" }] });
    // second chart: the visible spectrum strip as transmitted light
    if (k) { const A = absorb(k, cOf(k)), pts = []; for (let lam = 380; lam <= 780; lam += 5) pts.push([lam, 100 * Math.pow(10, -A(lam))]); chB.opts.title = "Light that gets through (what you see)"; chB.opts.xLabel = "wavelength (nm)"; chB.opts.yLabel = "% transmitted";
      chB.draw([{ pts, color: "#5ad1ff", label: "transmitted" }], { xMin: 380, xMax: 780, yMin: 0, yMax: 105, bands: [[380, 450, 420], [450, 495, 470], [495, 570, 530], [570, 590, 580], [590, 620, 605], [620, 780, 660]].map(([a, b, l]) => ({ x0: a, x1: b, color: `rgba(${specRGB(l).join(",")},.18)` })) }); }
    else { chB.opts.title = "–"; chB.draw([], {}); }
    label(0, "species"); label(1, "λ absorbed most"); label(2, "ΔE"); label(3, "colour seen");
    const kk = k || state; read.set("a", nameOf(kk)); const dd = k ? CX[k].b.filter(b => !b[3]).sort((a, b) => b[1] - a[1])[0] : null; read.set("b", dd ? dd[0] + " nm" : "–"); read.set("c", dd && adv ? (hc / (dd[0] * 1e-9) * NA / 1000).toFixed(0) + " kJ/mol" : "–"); const cc = tubeCol(kk); read.set("d", `<span style="display:inline-block;width:46px;height:12px;background:${rgbStr(cc)};border:1px solid #888"></span>`);
  } else if (P.view === "colori") {
    const sc = scaleC(), fl = FILTERS[P.filt][1], ser = [{ pts: calib, type: "dots", r: 5, color: "#5ad1ff", label: "standards" }];
    if (calib.length > 1) { const f = K.linfit(calib); ser.push({ pts: [[0, f.c], [sc * 1.05, f.c + f.m * sc * 1.05]], color: "#7ee787", label: "calibration line" }); if (unk != null) ser.push({ pts: [[(unk - f.c) / f.m, unk]], type: "dots", r: 6, color: "#ffd166", label: "unknown" }); }
    chA.opts.title = "Calibration"; chA.opts.xLabel = "concentration (mol dm⁻³)"; chA.opts.yLabel = "absorbance"; chA.draw(ser, { xMin: 0, xMax: sc * 1.05, yMin: 0 });
    chB.opts.title = "Absorption spectrum and the filter"; chB.opts.xLabel = "wavelength (nm)"; chB.opts.yLabel = "absorbance (1 cm)"; chB.draw([{ pts: spec(P.sol, sc, 1), color: "#ffb454", label: "" }], { xMin: 350, xMax: 850, yMin: 0, bands: [{ x0: fl - 25, x1: fl + 25, color: `rgba(${specRGB(fl).join(",")},.3)` }] });
    label(0, "filter"); label(1, "gradient (ε × l)"); label(2, "unknown A"); label(3, "unknown c");
    read.set("a", FILTERS[P.filt][0] + ` (${fl} nm)`); const f = calib.length > 1 ? K.linfit(calib) : null; read.set("b", f ? K.sig(f.m, 3) + " dm³ mol⁻¹" : "–"); read.set("c", unk != null ? unk.toFixed(3) : "–"); read.set("d", f && unk != null ? K.sig((unk - f.c) / f.m, 3) + " mol dm⁻³" : "–");
  } else {
    if (P.cat === "per") { const pts = [], p0 = []; for (let tt = 0; tt <= 300; tt += 3) { pts.push([tt, 1000 * persulfate(P.fe, tt)]); p0.push([tt, 1000 * persulfate(0, tt)]); }
      chA.opts.title = "Iodine made"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "[I₂] (mol dm⁻³ × 1000)"; chA.draw([{ pts: p0, color: "#8fa0bf", dash: [5, 4], label: "no catalyst" }, { pts, color: "#ffb454", label: `Fe²⁺ ${P.fe}` }, { pts: [[Math.min(t, 300), 1000 * persulfate(P.fe, Math.min(t, 300))]], type: "dots", r: 5, color: "#fff", label: "now" }], { xMin: 0, xMax: 300, yMin: 0 });
      chB.opts.title = "Energy profile"; chB.opts.xLabel = "progress of reaction"; chB.opts.yLabel = "energy"; const prof = []; for (let s = 0; s <= 1; s += 0.01) prof.push([s, 30 - 40 * s + 90 * Math.exp(-((s - 0.5) ** 2) / 0.012)]); const prof2 = []; for (let s = 0; s <= 1; s += 0.01) prof2.push([s, 30 - 40 * s + 45 * Math.exp(-((s - 0.3) ** 2) / 0.006) + 40 * Math.exp(-((s - 0.7) ** 2) / 0.006)]);
      chB.draw([{ pts: prof, color: "#8fa0bf", label: "uncatalysed" }].concat(P.fe > 0 ? [{ pts: prof2, color: "#7ee787", label: "with Fe²⁺: two lower humps" }] : []), { yMin: -20 });
      label(0, "time"); label(1, "[I₂]"); label(2, "initial rate"); label(3, "speed-up"); read.set("a", t.toFixed(0) + " s"); read.set("b", K.sig(persulfate(P.fe, t), 3)); read.set("c", K.sig(persulfate(P.fe, 1e-3) / 1e-3, 3) + " mol dm⁻³ s⁻¹"); read.set("d", "× " + ((0.0025 + 1.2 * P.fe) / 0.0025).toFixed(1));
    } else { const pts = permanganate(P.mn0, 600, 1), p0 = permanganate(0, 600, 1), th = tHalf(permanganate(P.mn0, 2000));
      chA.opts.title = "Manganate(VII) left"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "[MnO₄⁻] (mol dm⁻³ × 1000)"; chA.draw([{ pts: p0.map(p => [p[0], 1000 * p[1]]), color: "#8fa0bf", dash: [5, 4], label: "no Mn²⁺ added" }, { pts: pts.map(p => [p[0], 1000 * p[1]]), color: "#c4a1ff", label: "this run" }, { pts: [[Math.min(t, 600), 1000 * pts[Math.min(600, Math.round(t))][1]]], type: "dots", r: 5, color: "#fff", label: "now" }], { xMin: 0, xMax: 600, yMin: 0 });
      const rt = []; for (let i = 1; i < pts.length; i++) rt.push([pts[i][0], 1e6 * (pts[i - 1][1] - pts[i][1])]); chB.opts.title = "Rate (falls, then rises, then falls)"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "rate (× 10⁶)"; chB.draw([{ pts: rt, color: "#7ee787", label: "rate" }], { xMin: 0, xMax: 600, yMin: 0 });
      label(0, "time"); label(1, "[MnO₄⁻]"); label(2, "time to half"); label(3, "–"); read.set("a", t.toFixed(0) + " s"); read.set("b", K.sig(pts[Math.min(600, Math.round(t))][1], 3)); read.set("c", th ? th.toFixed(0) + " s" : "–"); read.set("d", "–"); }
  }
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(dt => { if (P.view === "cat" && dt > 0) t = Math.min(600, t + dt * 10); }, dt => { draw(dt); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Choose an ion and add reagents. Every colour is calculated from the complex's absorption spectrum.", 7000);
