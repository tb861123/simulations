/* =====================================================================
   POWERS OF TEN
   A zoom through 44 powers of ten, from the observable universe
   (about 10²⁷ m across) to a quark (smaller than 10⁻¹⁸ m).
   The zoom is logarithmic: every step of the slider multiplies or
   divides the width of the view by the same factor. Going from a person
   to the Earth is the same number of steps (about 7 powers of ten) as
   going from a person to a bacterium.
   Every size here is a real measurement; sources are in "The model".
   ===================================================================== */

// ---------------------------------------------------------------- the data (no drawing: the Batch run uses this too)
const LY = 9.4607e15, AU = 1.495978707e11;
/* The zoom chain, biggest first. d = diameter (or longest length) in metres; u = how uncertain or variable that size is
   (fractional, about one standard deviation); m = mass in kg where it makes sense; rel = where the next-smaller object's
   centre sits inside this one, in this object's radii (so the zoom heads for the right place); style = how it is drawn. */
const CHAIN = [
  { k: "universe", name: "Observable universe", d: 8.8e26, u: 0.02, m: 1.5e53, style: 0, rel: [0, 0], src: "Radius about 46.5 billion light-years (Planck Collaboration 2018 cosmology). We are at its centre by definition: it is everything light has had time to reach us from." },
  { k: "web", name: "Cosmic web: a supercluster wall", d: 1.3e25, u: 0.15, style: 1, rel: [0.2, -0.1], src: "The Sloan Great Wall, about 1.37 billion light-years long (Gott et al. 2005). Galaxies lie along filaments and walls round huge empty voids." },
  { k: "laniakea", name: "Laniakea Supercluster", d: 4.9e24, u: 0.2, m: 2e47, style: 2, rel: [-0.45, 0.25], src: "About 520 million light-years across, 100 000 galaxies (Tully et al. 2014, Nature)." },
  { k: "localgroup", name: "Local Group of galaxies", d: 9.5e22, u: 0.2, m: 4e42, style: 3, rel: [-0.25, 0.05], src: "About 10 million light-years across; the Milky Way and Andromeda are its two biggest members (van den Bergh 2000)." },
  { k: "milkyway", name: "Milky Way galaxy", d: 9.5e20, u: 0.15, m: 3e42, style: 4, rel: [0.27 * 2, 0.0], src: "About 100 000 light-years across (NASA); estimates range from 87 000 to 200 000. The Sun is about 26 000 light-years from the centre." },
  { k: "neighbours", name: "Our stellar neighbourhood", d: 1.89e17, u: 0, style: 5, rel: [0, 0], src: "A sphere 20 light-years across, holding about 130 stars (RECONS survey). The nearest, Proxima Centauri, is 4.24 light-years away." },
  { k: "oort", name: "Oort cloud (outer edge)", d: 2 * 1e5 * AU, u: 0.5, style: 6, rel: [0, 0], src: "Comets out to about 100 000 AU from the Sun (NASA); its size is uncertain: no Oort cloud object has been seen there directly." },
  { k: "neptune", name: "Neptune's orbit", d: 2 * 30.07 * AU, u: 0.001, style: 7, rel: [0, 0], src: "Neptune orbits 30.07 AU from the Sun (NASA planetary fact sheet). 1 AU = 149 597 870 700 m (IAU 2012)." },
  { k: "earthorbit", name: "Earth's orbit", d: 2 * AU, u: 0.001, style: 8, rel: [1, 0], src: "1 astronomical unit is the mean Earth–Sun distance, 149 597 870 700 m exactly by definition (IAU 2012)." },
  { k: "moonorbit", name: "Moon's orbit", d: 2 * 3.844e8, u: 0.01, style: 9, rel: [0, 0], src: "Mean Earth–Moon distance 384 400 km (NASA)." },
  { k: "earth", name: "Earth", d: 1.2742e7, u: 0.001, m: 5.972e24, style: 10, rel: [0.12, 0.62], src: "Mean radius 6371 km (NASA Earth fact sheet). London is about 51.5° north." },
  { k: "gb", name: "Great Britain", d: 9.7e5, u: 0.05, style: 11, rel: [0.18, -0.35], src: "About 970 km in a straight line from Land's End to John o' Groats." },
  { k: "london", name: "Greater London", d: 5.0e4, u: 0.1, style: 12, rel: [0.05, 0.02], src: "About 50 km across (Greater London Authority)." },
  { k: "pitch", name: "Football pitch", d: 105, u: 0.03, style: 13, rel: [0.1, 0.12], src: "105 m long (IFAB Laws of the Game recommended size)." },
  { k: "person", name: "Person", d: 1.7, u: 0.06, m: 70, style: 14, rel: [0.34, 0.08], src: "Average UK adult height about 1.7 m (ONS)." },
  { k: "hand", name: "Hand", d: 0.19, u: 0.08, m: 0.4, style: 15, rel: [0.1, 0.3], src: "Average adult hand length about 19 cm." },
  { k: "skin", name: "A patch of skin, 1 mm across", d: 1e-3, u: 0, style: 16, rel: [0.13, -0.2], src: "Defined size. Fingerprint ridges are about 0.5 mm apart." },
  { k: "cell", name: "Skin cell", d: 3.0e-5, u: 0.3, style: 17, rel: [0.08, 0.06], src: "Keratinocytes (outer skin cells) are about 30 µm across." },
  { k: "cellnucleus", name: "Cell nucleus", d: 6e-6, u: 0.3, style: 18, rel: [0.2, 0.1], src: "About 6 µm in mammalian cells (Alberts et al., Molecular Biology of the Cell). It holds 2 m of DNA, folded up." },
  { k: "dna", name: "DNA double helix", d: 2.0e-8, u: 0, style: 19, rel: [0.04, 0.12], src: "The helix is 2 nm wide and turns once every 3.4 nm (Watson and Crick 1953, from Franklin's X-ray data). A 20 nm stretch is shown." },
  { k: "atom", name: "Carbon atom", d: 1.4e-10, u: 0.15, m: 1.99e-26, style: 20, rel: [0, 0], src: "About 0.14 nm across (covalent radius 70 pm; Slater 1964). An atom has no sharp edge: this is where its electron cloud thins out." },
  { k: "nucleus", name: "Carbon nucleus", d: 4.94e-15, u: 0.02, m: 1.99e-26, style: 21, rel: [0.32, 0.18], src: "Charge radius 2.47 fm (Angeli and Marinova 2013). Six protons and six neutrons, 30 000 times smaller than the atom." },
  { k: "proton", name: "Proton", d: 1.68e-15, u: 0.01, m: 1.673e-27, style: 22, rel: [0.35, -0.2], src: "Charge radius 0.8414 fm (CODATA 2018). Three quarks held by gluons." },
  { k: "quark", name: "Quark", d: 1e-18, u: 0, style: 23, rel: [0, 0], src: "No size has ever been measured: experiments at the LHC show quarks are smaller than about 10⁻¹⁸ m, perhaps points. Drawn as a fuzzy dot." },
];
// More objects for comparisons (not on the zoom path)
const EXTRA = [
  { k: "hydrogen", name: "Hydrogen atom", d: 1.06e-10, u: 0.05, m: 1.674e-27, src: "Twice the Bohr radius, 2 × 52.9 pm (CODATA 2018)." },
  { k: "water", name: "Water molecule", d: 2.75e-10, u: 0.05, m: 2.99e-26, src: "About 0.275 nm (from the density of water)." },
  { k: "virus", name: "Coronavirus (SARS-CoV-2)", d: 1.0e-7, u: 0.2, m: 1e-18, src: "About 100 nm across, mass about 1 femtogram (Bar-On et al. 2020, eLife)." },
  { k: "ecoli", name: "Bacterium (E. coli)", d: 2e-6, u: 0.25, m: 1e-15, src: "About 2 µm long, 1 picogram (Milo and Phillips, Cell Biology by the Numbers)." },
  { k: "rbc", name: "Red blood cell", d: 7.8e-6, u: 0.08, m: 2.7e-14, src: "About 7.8 µm across (Turgeon, Clinical Haematology)." },
  { k: "hair", name: "Width of a human hair", d: 8e-5, u: 0.35, src: "Typically 17–180 µm (Ley 1999)." },
  { k: "sand", name: "Grain of sand", d: 5e-4, u: 0.4, m: 1.7e-7, src: "Medium sand is 0.25–0.5 mm (Wentworth scale); quartz, 2650 kg/m³." },
  { k: "ant", name: "Ant", d: 5e-3, u: 0.4, m: 3e-6, src: "A garden ant is about 5 mm long and weighs about 3 mg." },
  { k: "whale", name: "Blue whale", d: 30, u: 0.1, m: 1.5e5, src: "Up to about 30 m and 150 tonnes, the largest animal ever (NOAA)." },
  { k: "eiffel", name: "Eiffel Tower", d: 330, u: 0.01, src: "330 m tall including antennas." },
  { k: "everest", name: "Mount Everest (height)", d: 8849, u: 0.001, src: "8848.86 m above sea level (China–Nepal survey 2020)." },
  { k: "neutronstar", name: "Neutron star", d: 2.4e4, u: 0.15, m: 2.8e30, src: "About 24 km across with 1.4 times the Sun's mass (NICER 2019)." },
  { k: "moon", name: "Moon", d: 3.4748e6, u: 0.001, m: 7.342e22, src: "Mean radius 1737.4 km (NASA)." },
  { k: "jupiter", name: "Jupiter", d: 1.42984e8, u: 0.002, m: 1.898e27, src: "Equatorial diameter 142 984 km (NASA)." },
  { k: "betelgeuse", name: "Betelgeuse (a red supergiant)", d: 1.06e12, u: 0.25, m: 3.6e31, src: "About 760 times the Sun's radius (Joyce et al. 2020); its mass is about 18 Suns." },
  { k: "andromeda", name: "Andromeda galaxy", d: 2.1e21, u: 0.2, m: 2.5e42, style: 4, src: "About 220 000 light-years across (NASA)." },
  { k: "sun", name: "Sun", d: 1.3914e9, u: 0.001, m: 1.989e30, style: 24, src: "Nominal radius 695 700 km (IAU 2015 Resolution B3)." },
];
EXTRA.find(o => o.k === "moon").style = 25;
const ALL = CHAIN.concat(EXTRA), BYKEY = Object.fromEntries(ALL.map(o => [o.k, o]));
/* Where each chain object's centre is, measured from the point the zoom heads for (the "you are here" point, at the quark).
   Worked out from the smallest outwards (each centre = the previous centre + an offset in its own size), so tiny objects
   are never lost in the rounding of huge numbers. */
(function placeChain() {
  let x = 0, y = 0;
  for (let i = CHAIN.length - 1; i >= 0; i--) {
    const o = CHAIN[i]; o.cx = x; o.cy = y;
    if (i > 0) { const p = CHAIN[i - 1]; x -= p.rel[0] * p.d / 2; y -= p.rel[1] * p.d / 2; }   // the parent's centre, from this one's
  }
})();
// Objects drawn beside the zoom path, placed relative to a chain object's centre (in that object's radii)
const SIDE = [["sun", "earthorbit", 0, 0], ["moon", "moonorbit", -0.7, 0.71], ["andromeda", "localgroup", 0.55, -0.1]].map(([k, host, fx, fy]) => { const h = CHAIN.find(o => o.k === host), o = BYKEY[k]; return { o, cx: h.cx + fx * h.d / 2, cy: h.cy + fy * h.d / 2 }; });
// A random version of a size, using its uncertainty (sizes vary from one object to another, and are not perfectly known)
const MASSED = ALL.filter(o => o.m).sort((a, b) => a.d - b.d);   // objects with a known mass, smallest first
const sample = (o, r) => o.d * Math.exp((o.u || 0) * r.gauss());
const sampleM = (o, r) => o.m * Math.exp(0.5 * (o.u || 0) * r.gauss());
// ---------------------------------------------------------------- end of data

// ---------------------------------------------------------------- formatting sizes for people
const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const pow10 = n => "10" + String(n).split("").map(c => SUP[c] || c).join("");
const sci = (v, sf = 2) => { const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e; return Math.abs(e) < 4 ? (+v.toPrecision(sf + 1)).toLocaleString() : `${m.toFixed(sf - 1)} × ${pow10(e)}`; };
// a length with a sensible unit: fm, pm, nm, µm, mm, m, km, then AU and light-years
function fmtLen(d) {
  if (d >= 0.3 * LY) { const l = d / LY; return (l >= 1e6 ? sci(l, 2) : (+l.toPrecision(3)).toLocaleString()) + " light-years"; }
  if (d >= 0.1 * AU) return (+(d / AU).toPrecision(3)).toLocaleString() + " AU";
  if (d >= 1000) return (+(d / 1000).toPrecision(4)).toLocaleString() + " km";
  const units = [[1, "m"], [1e-3, "mm"], [1e-6, "µm"], [1e-9, "nm"], [1e-12, "pm"], [1e-15, "fm"], [1e-18, "am"]];
  for (const [f, u] of units) if (d >= f * 0.999 || u === "am") return (+(d / f).toPrecision(3)) + " " + u;
}
const ratioText = (a, b) => { const r = b.d / a.d; return r >= 1 ? `${sci(r)} ${a.name.toLowerCase()}s across ${b.name.toLowerCase().replace(/^an? /, "")}` : ""; };

// ---------------------------------------------------------------- the app
const S = {};
let z = Math.log10(1.7 * 4), zTarget = null, playDir = 0, rate = 1, frame = 0, showLabels = true, cmp = null;
const ui = K.app({
  title: "Powers of Ten", subject: "Explore", blurb: "Zoom smoothly through 44 powers of ten, from the edge of the observable universe to a quark.",
  reset: () => jump("person"),
  missions: [
    { title: "From you to everything", q: "Start at the person and press <b>Zoom out</b>. Count the powers of ten (watch the big number) until you reach the edge of the observable universe. Then predict: how many more powers of ten to get down to a quark?",
      hint: "From 1.7 m to 8.8 × 10²⁶ m is about 27 powers of ten. Down to a quark (smaller than 10⁻¹⁸ m) is at least another 18. Each power of ten is ten times bigger than the last, so these journeys are not 'a bit bigger' but billions of billions of times.",
      setup: () => { jump("person", true); } },
    { title: "Inside your hand", q: "Zoom in from a hand. Which comes first: the cell, the DNA or the atom? How many hydrogen atoms would fit across one skin cell? Use the comparison tool to check.",
      hint: "Skin cell (30 µm), then its nucleus (6 µm), DNA (2 nm wide), then an atom (0.14 nm). About 300 000 hydrogen atoms fit across one skin cell.",
      setup: () => { jump("hand", true); setCompare("hydrogen", "cell"); } },
    { title: "Atoms are empty", q: "Jump to the carbon atom, then zoom in until you find its nucleus. How many nuclei would fit across the atom? If the nucleus were a pea (7 mm), how big would the atom be?",
      hint: "About 28 000 nuclei across. A 7 mm pea nucleus would mean an atom about 200 m across: a football stadium with a pea in the middle and a few specks of electron cloud. Almost all the mass is in that pea; the rest is empty space. (Rutherford found this in 1911 by firing alpha particles through gold foil.)",
      setup: () => { jump("atom", true); setCompare("nucleus", "atom"); } },
    { title: "Hydrogen atoms across the Sun", q: "Predict first: how many hydrogen atoms would fit side by side across the Sun? 10⁹? 10¹⁵? 10¹⁹? Then use the comparison tool.",
      hint: "About 1.3 × 10¹⁹: thirteen billion billion. In the Batch run, the uncertainty in each size is used to work out how sure we can be of answers like this.",
      setup: () => { jump("earthorbit", true); setCompare("hydrogen", "sun"); } },
    { title: "The middle of everything", q: "On a logarithmic scale, what is halfway between a quark (10⁻¹⁸ m) and the observable universe (10²⁷ m)? Find it with the zoom slider. Is it a person?",
      hint: "Halfway in powers of ten is 10^4.5 m, about 30 km: the size of a city like London, not a person. On a logarithmic scale, 'middle' means the same number of times bigger than the small end as it is smaller than the big end.",
      setup: () => { jump("quark", true); } },
    { title: "How long would light take?", q: "Watch the 'light takes' readout as you zoom. Which is the first object that light takes more than a second to cross? More than a year?",
      hint: "Light crosses the Earth in 0.04 s and the Moon's orbit in 2.6 s. It takes 8.3 minutes from the Sun to the Earth, about a day to cross the Oort cloud's inner parts, 20 years to cross our stellar neighbourhood and 100 000 years to cross the Milky Way. When we look at distant galaxies we see them as they were long ago.",
      setup: () => { jump("moonorbit", true); } },
    { title: "Where are we?", q: "Zoom out from Earth to the observable universe, and watch where the Sun sits in the Milky Way and where the Milky Way sits in the Local Group. Are we at the centre of anything?",
      hint: "We are about halfway out in the Milky Way's disc (26 000 light-years from its centre), and the Milky Way is one of two big galaxies in the Local Group. We are at the centre of the observable universe only because it is defined by how far light has travelled to us: every observer anywhere is at the centre of their own.",
      setup: () => { jump("earth", true); } },
  ],
  batch: [
    { title: "How many fit across?", question: "How many of one thing fit across another, and how sure can we be?", how: "Each pair: 1 hydrogen atoms across a skin cell; 2 skin cells across a person; 3 people across Earth; 4 Earths across the Sun; 5 Suns across the Milky Way; 6 Milky Ways across the observable universe; 7 protons across a carbon atom; 8 hydrogen atoms across the Sun. Each run picks each size at random within its uncertainty (cells and people vary; galaxy edges are fuzzy).",
      xLabel: "pair (see the list above)", yLabel: "log₁₀ (how many fit across)", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 40,
      run: (x, r) => { const [a, b] = PAIRS[x - 1]; return Math.log10(sample(BYKEY[b], r) / sample(BYKEY[a], r)); },
      theory: x => Math.log10(BYKEY[PAIRS[Math.round(x) - 1][1]].d / BYKEY[PAIRS[Math.round(x) - 1][0]].d), theoryLabel: "using the best values",
      note: "The answers span 2 to 19 powers of ten, so they are plotted as log₁₀: 4 means 10 000. Pairs involving a cell, a person or a galaxy scatter most, because those sizes vary (people and cells) or are hard to define (where does a galaxy end?). Pairs of Earth and Sun barely scatter: they are measured to a fraction of a per cent." },
    { title: "How many fit inside?", question: "By volume, how many of the smaller thing would fit inside the bigger one?", how: "Same pairs as 'How many fit across?', but counting volume: (how many across)³. Sizes vary within their uncertainty each run.",
      xLabel: "pair (see 'How many fit across?')", yLabel: "log₁₀ (how many fit inside)", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 40,
      run: (x, r) => { const [a, b] = PAIRS[x - 1]; return 3 * Math.log10(sample(BYKEY[b], r) / sample(BYKEY[a], r)); },
      theory: x => 3 * Math.log10(BYKEY[PAIRS[Math.round(x) - 1][1]].d / BYKEY[PAIRS[Math.round(x) - 1][0]].d), theoryLabel: "using the best values",
      note: "Volume goes as length cubed, so the log is three times bigger, and so is the scatter: a 10% uncertainty in a length becomes about 30% in a volume. About 1.3 million Earths would fit inside the Sun." },
    { title: "Size against mass", question: "Do bigger things have proportionally more mass? Which are denser than water?", how: "Every object with a known mass, from a proton to the observable universe; sizes and masses vary within their uncertainty. Plotted as log₁₀(mass) against log₁₀(size).",
      xLabel: "log₁₀ (size in metres)", yLabel: "log₁₀ (mass in kg)", xs: MASSED.map(o => +Math.log10(o.d).toFixed(3)), reps: 6,
      run: (x, r) => { const o = MASSED.find(q => Math.abs(Math.log10(q.d) - x) < 1e-3); return Math.log10(sampleM(o, r)); },
      theory: x => Math.log10(1000 * Math.PI / 6) + 3 * x, theoryLabel: "a ball of water (density 1000 kg/m³)",
      note: "If everything had the density of water, the points would lie on the line (mass ∝ size³). People, whales and planets nearly do. Nuclei and neutron stars lie far above it (10¹⁷ kg/m³: matter crushed together). Galaxies and the universe lie far below it: they are almost entirely empty space." },
  ],
  notes: `<h3>What you are looking at</h3><p>A logarithmic zoom: the slider and wheel change the <b>power of ten</b> of the view's width, so every equal step multiplies the size by the same factor. Each object is drawn at its true size for the current view, centred where it really is relative to the next object down. The zoom always heads for one point: a quark, in a proton, in a carbon atom, in the DNA of a skin cell on the hand of a person on a football pitch in London.</p>
  <h3>Assumptions and simplifications</h3><ul><li>Sizes are real (sources below); the pictures are artist's impressions drawn by the graphics card, not photographs.</li><li>Many objects have no sharp edge (atoms, galaxies, the Oort cloud): the size given is a typical or agreed value, and the Batch run uses an uncertainty for each.</li><li>People, cells and hands vary; average values are used.</li><li>Positions are approximate (for example, where in the Milky Way the Sun is, and which way); the zoom is in a flat picture of a 3-D universe.</li><li>Orbits are drawn as circles. The Earth and Moon are shown where they would be at one moment.</li><li>Quarks have no measured size: they are drawn as a fuzzy dot smaller than the experimental limit.</li></ul>
  <h3>Sources for every size</h3><ul>${ALL.map(o => `<li><b>${o.name}</b>: ${fmtLen(o.d)}. ${o.src}</li>`).join("")}</ul>`,
});
const PAIRS = [["hydrogen", "cell"], ["cell", "person"], ["person", "earth"], ["earth", "sun"], ["sun", "milkyway"], ["milkyway", "universe"], ["proton", "atom"], ["hydrogen", "sun"]];

// ---------------------------------------------------------------- controls
const ZMAX = Math.log10(8.8e26 * 1.25), ZMIN = -18.6;
let g = ui.group("Zoom");
S.z = K.slider(g, { label: "Width of the view", min: ZMIN, max: ZMAX, step: 0.01, value: z, fmt: v => `10<sup>${v.toFixed(1)}</sup> m (${fmtLen(10 ** v)})`, on: v => { z = v; zTarget = null; playDir = 0; } });
{ const r = K.row(g); K.btn(r, "◀ Zoom in", () => { playDir = -1; zTarget = null; }); K.btn(r, "■ Stop", () => { playDir = 0; zTarget = null; }); K.btn(r, "Zoom out ▶", () => { playDir = 1; zTarget = null; }); }
S.rate = K.slider(g, { label: "Zoom speed (powers of ten per second)", min: 0.1, max: 4, step: 0.1, value: 1, fmt: v => v.toFixed(1), on: v => rate = v });
ui.headerSpeed(S.rate, { label: "Zoom speed" });
K.note(g, "Mouse wheel zooms too. Click a label to go there.");
const mkSelect = (parent, items, val, on) => { const s = document.createElement("select"); s.style.cssText = "width:100%;padding:6px;border-radius:7px;background:var(--panel2, #1b2333);color:var(--text);border:1px solid var(--line, #33405a);font:inherit;margin:2px 0 8px"; for (const [k, t] of items) { const o = document.createElement("option"); o.value = k; o.textContent = t; s.append(o); } s.value = val; s.onchange = () => on(s.value); parent.append(s); return s; };
g = ui.group("Jump to");
S.jump = mkSelect(g, CHAIN.map(o => [o.k, `${o.name} (${fmtLen(o.d)})`]), "person", v => jump(v));
g = ui.group("Compare two things");
const opts = ALL.slice().sort((a, b) => a.d - b.d).map(o => [o.k, `${o.name} (${o.k === "quark" ? "< 10⁻¹⁸ m" : fmtLen(o.d)})`]);
S.ca = mkSelect(g, opts, "hydrogen", v => setCompare(v, S.cb.value));
S.cb = mkSelect(g, opts, "sun", v => setCompare(S.ca.value, v));
const cmpNote = K.note(g, "");
S.cmpShow = K.toggle(g, { label: "Show the two side by side", value: false, on: v => { cmp = v ? { a: S.ca.value, b: S.cb.value } : null; } });
g = ui.group("View");
S.labels = K.toggle(g, { label: "Labels", value: true, on: v => showLabels = v });
{ const r = K.row(g); K.btn(r, "📷 Screenshot", () => glOn ? K.gl.screenshot("powers-of-ten", gv.el, cv.el) : K.gl.screenshot("powers-of-ten", cv.el)); }
g = ui.group("Measurements");
const read = K.readout(g, [["w", "View width"], ["p", "Power of ten"], ["obj", "Main object"], ["light", "Light takes to cross the view"]]);
const chA = K.chart(ui.dock, { title: "Where you are on the ladder of sizes", xLabel: "log₁₀ (size in metres)", yLabel: "" });

function jump(k, instant) { const o = BYKEY[k]; if (!o) return; const zt = Math.log10(o.d * 2.6); if (instant) { z = zt; zTarget = null; } else zTarget = zt; playDir = 0; if (CHAIN.includes(o)) S.jump.value = k; }
function setCompare(a, b) {
  S.ca.value = a; S.cb.value = b; const A = BYKEY[a], B = BYKEY[b]; let [s, l] = A.d <= B.d ? [A, B] : [B, A]; const r = l.d / s.d;
  cmpNote.innerHTML = `<b>${sci(r)}</b> ${s.name.toLowerCase()}${s.name.endsWith("s") ? "" : "s"} side by side would stretch across one ${l.name.toLowerCase()}.<br>By volume, about <b>${sci(r ** 3)}</b> would fit inside. The ${l.name.toLowerCase()} is ${(Math.log10(r)).toFixed(1)} powers of ten bigger.`;
  if (cmp) cmp = { a, b };
}
setCompare("hydrogen", "sun");

// ---------------------------------------------------------------- WebGL drawing
/* One fragment shader paints every visible object, biggest first, each from its own little recipe (a "style"):
   stars and filaments for the cosmic scales, a spiral galaxy, orbits, a sunlit Earth, a map of Britain and London,
   a football pitch, a person, a hand, fingerprint ridges, a sheet of cells, a nucleus, DNA, an electron cloud,
   protons and neutrons, and quarks. Everything is drawn in each object's own coordinates q (its radius = 1). */
const MAXL = 12;
const FS = `precision highp float;
uniform vec2 uRes; uniform float uDpr, uTime, uStars; uniform int uN; uniform vec4 uL[${MAXL}]; uniform vec4 uM[${MAXL}];
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
float ridge(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(noise(p) * 2.0 - 1.0)); p = p * 2.1 + 3.3; a *= 0.5; } return s; }
float stars(vec2 q, float cell, float dens, float sz) { vec2 g = q * cell, id = floor(g), f = fract(g) - 0.5; float h = hash(id); if (h < dens) return 0.0; vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5; return exp(-dot(f - o * 0.7, f - o * 0.7) / sz) * (0.4 + 0.6 * hash(id + 1.9)); }
vec2 vor(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = vec2(hash(i + g), hash(i + g + 5.3)); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return vec2(d1, d2); }
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float fade(float rho) { return 1.0 - smoothstep(1.15, 2.1, rho); }   // a soft round edge, so each scene blends into the bigger one around it
float disc(float rho, float px) { return 1.0 - smoothstep(1.0 - px, 1.0 + px, rho); }
vec3 sphereShade(vec2 q, vec3 base, vec2 ld) { float z = sqrt(max(0.0, 1.0 - dot(q, q))); float d = max(dot(normalize(vec3(q.x, q.y, z)), normalize(vec3(ld, 0.5))), 0.0); return base * (0.05 + 1.05 * d) + base * pow(1.0 - z, 3.0) * 0.6; }
// each style returns colour (rgb) and how opaque it is (a). q: position in the object's radii; px: one pixel in those units; s: a seed; t: time
vec4 style(int st, vec2 q, float px, float t) {
  float rho = length(q), ang = atan(q.y, q.x);
  if (st == 0) { float w = ridge(q * 5.0 + 2.0); vec3 c = vec3(0.45, 0.3, 0.9) * pow(w, 3.0) * 0.9 + vec3(1.0, 0.85, 1.0) * stars(q, 220.0, 0.9, 0.04) * pow(w, 2.0);
    c += vec3(1.0, 0.45, 0.2) * exp(-abs(rho - 1.0) / (0.015 + px)) * 0.8; return vec4(c, disc(rho, px) * 0.95 + exp(-abs(rho - 1.0) / 0.02) * 0.4); }
  if (st == 1) { float w = ridge(q * 3.0 + 9.0); return vec4(vec3(0.55, 0.42, 1.0) * pow(w, 2.5) + vec3(1.0) * stars(q, 300.0, 0.8, 0.05) * pow(w, 4.0) * 1.5, (1.0 - smoothstep(0.7, 1.0, rho)) * 0.9); }
  if (st == 2) { float f = fbm(q * 4.0) ; float gal = stars(q + vec2(f * 0.05), 90.0, 0.55, 0.05) + stars(q, 40.0, 0.8, 0.04); vec3 c = vec3(1.0, 0.88, 0.7) * gal * (1.2 - rho) + vec3(0.3, 0.25, 0.6) * f * 0.25 * (1.0 - rho); return vec4(c, (1.0 - smoothstep(0.6, 1.0, rho)) * 0.95); }
  if (st == 3) { float dw = stars(q, 18.0, 0.82, 0.06); return vec4(vec3(0.8, 0.85, 1.0) * dw + vec3(0.12, 0.12, 0.25) * exp(-rho * 2.0), (1.0 - smoothstep(0.75, 1.0, rho)) * 0.8); }
  if (st == 4) { float r2 = rho + 1e-4, arm = 0.5 + 0.5 * cos(2.0 * ang - 5.0 * log(r2) + fbm(q * 6.0) * 1.5), dust = smoothstep(0.35, 0.7, fbm(q * 14.0 + 3.0));
    float b = exp(-r2 * 12.0) * 2.2 + pow(arm, 2.5) * exp(-r2 * 1.5) * (0.6 + 0.4 * dust) + 0.08 * exp(-r2 * 2.0); vec3 c = mix(vec3(1.0, 0.85, 0.62), vec3(0.6, 0.75, 1.0), smoothstep(0.1, 0.6, r2)) * b + vec3(1.0) * stars(q, 260.0, 0.75, 0.03) * pow(arm, 2.0) * exp(-r2 * 2.0);
    return vec4(c, clamp(b * 1.2, 0.0, 1.0) * (1.0 - smoothstep(0.85, 1.05, rho))); }
  if (st == 5) { float s = stars(q, 7.0, 0.6, 0.004 + px * px * 30.0) * 1.6; float ring = exp(-pow((rho - 1.0) / (2.0 * px + 0.003), 2.0)) * step(0.5, fract(ang * 30.0)); return vec4(vec3(1.0, 0.92, 0.8) * s + vec3(0.4, 0.6, 1.0) * ring * 0.6, clamp(s + ring * 0.5, 0.0, 1.0) * disc(rho, px * 2.0 + 0.05)); }
  if (st == 6) { float n = stars(q, 60.0, 0.7, 0.03) * smoothstep(0.05, 1.0, rho); return vec4(vec3(0.6, 0.85, 1.0) * n * 0.7 + vec3(0.2, 0.35, 0.6) * 0.06 * smoothstep(0.2, 1.0, rho), (n * 0.7 + 0.15 * smoothstep(0.2, 1.0, rho)) * disc(rho, 0.08)); }
  if (st == 7 || st == 8 || st == 9) { float rings = 0.0;
    if (st == 7) { for (int i = 0; i < 8; i++) { float a = i == 0 ? 0.0129 : i == 1 ? 0.024 : i == 2 ? 0.0333 : i == 3 ? 0.0507 : i == 4 ? 0.173 : i == 5 ? 0.317 : i == 6 ? 0.638 : 1.0; rings += exp(-pow((rho - a) / (1.2 * px), 2.0)) * 0.55; } }
    else if (st == 8) { rings = exp(-pow((rho - 1.0) / (1.2 * px), 2.0)) * 0.7 + exp(-pow((rho - 0.723) / (1.2 * px), 2.0)) * 0.35 + exp(-pow((rho - 0.387) / (1.2 * px), 2.0)) * 0.35 + exp(-pow((rho - 1.524) / (1.2 * px), 2.0)) * 0.35; }
    else rings = exp(-pow((rho - 1.0) / (1.2 * px), 2.0)) * 0.55;
    return vec4(vec3(0.45, 0.65, 1.0), clamp(rings, 0.0, 1.0)); }
  if (st == 10) { if (rho > 1.0 + 2.0 * px) return vec4(vec3(0.4, 0.7, 1.0), exp(-(rho - 1.0) / (0.03 + px)) * 0.6);
    float land = smoothstep(0.52, 0.56, fbm(q * 2.2 + 11.0)), cloud = smoothstep(0.5, 0.75, fbm(q * 4.0 + vec2(t * 0.01, 0.0)));
    vec3 base = mix(vec3(0.05, 0.2, 0.55), mix(vec3(0.2, 0.45, 0.18), vec3(0.6, 0.5, 0.3), fbm(q * 8.0)), land); base = mix(base, vec3(0.95), cloud * 0.7);
    return vec4(sphereShade(q, base, vec2(-1.0, 0.25)), disc(rho, px)); }
  if (st == 11) { vec2 g = q * vec2(1.7, 0.95); float shape = length(g) + 0.35 * (fbm(q * 3.0 + 5.0) - 0.5) + 0.06 * (fbm(q * 18.0) - 0.5); float landm = 1.0 - smoothstep(0.78 - px, 0.78 + px, shape);
    vec3 sea = vec3(0.07, 0.25, 0.48) + 0.04 * noise(q * 40.0), land = mix(vec3(0.25, 0.48, 0.2), vec3(0.45, 0.5, 0.3), fbm(q * 10.0)); return vec4(mix(sea, land, landm), fade(rho)); }
  if (st == 12) { vec2 g = q * 9.0 + 0.3 * vec2(fbm(q * 3.0), fbm(q * 3.0 + 4.0)); vec2 f = abs(fract(g * 4.0) - 0.5); float street = 1.0 - smoothstep(0.03, 0.05 + px * 18.0, min(f.x, f.y));
    float river = 1.0 - smoothstep(0.015, 0.02 + px, abs(q.y - 0.18 * sin(q.x * 6.0) + 0.05)); float park = smoothstep(0.62, 0.66, fbm(q * 6.0 + 2.0)), city = 1.0 - smoothstep(0.75, 1.0, rho + 0.15 * fbm(q * 4.0));
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.85, 0.83, 0.8), street); c = mix(c, vec3(0.3, 0.55, 0.25), park); c = mix(c, vec3(0.2, 0.4, 0.6), river); c = mix(vec3(0.33, 0.52, 0.25), c, city); return vec4(c, fade(rho)); }
  if (st == 13) { vec2 a = abs(q); float stripe = step(0.5, fract(q.x * 7.0)); vec3 c = mix(vec3(0.2, 0.55, 0.22), vec3(0.24, 0.62, 0.25), stripe); float lw = 0.006 + px;
    float lines = max(step(abs(a.x - 1.0), lw) * step(a.y, 0.65), step(abs(a.y - 0.65), lw) * step(a.x, 1.0)); lines = max(lines, step(abs(q.x), lw) * step(a.y, 0.65)); lines = max(lines, step(abs(length(q) - 0.175), lw));
    lines = max(lines, step(abs(a.x - 0.686), lw) * step(a.y, 0.384)); lines = max(lines, step(abs(a.y - 0.384), lw) * step(0.686, a.x) * step(a.x, 1.0));
    c = mix(c, vec3(0.95), lines); return vec4(c, fade(rho)); }
  if (st == 14) { float d = length(q - vec2(0.0, 0.83)) - 0.12; d = min(d, sdCapsule(q, vec2(0.0, 0.62), vec2(0.0, 0.05), 0.15)); d = min(d, sdCapsule(q, vec2(-0.05, 0.05), vec2(-0.12, -0.95), 0.07)); d = min(d, sdCapsule(q, vec2(0.05, 0.05), vec2(0.12, -0.95), 0.07));
    d = min(d, sdCapsule(q, vec2(-0.14, 0.58), vec2(-0.3, 0.1), 0.055)); d = min(d, sdCapsule(q, vec2(0.14, 0.58), vec2(0.32, 0.12), 0.055)); float body = 1.0 - smoothstep(-px, px, d);
    vec3 c = q.y > 0.7 ? vec3(0.95, 0.78, 0.62) : q.y > 0.05 ? vec3(0.85, 0.25, 0.25) : vec3(0.2, 0.25, 0.45); return vec4(c * (0.85 + 0.15 * q.x * 3.0), body); }
  if (st == 15) { float d = sdCapsule(q, vec2(0.0, -0.75), vec2(0.0, -0.2), 0.33); d = min(d, sdCapsule(q, vec2(-0.24, -0.05), vec2(-0.28, 0.55), 0.085)); d = min(d, sdCapsule(q, vec2(-0.08, 0.0), vec2(-0.09, 0.78), 0.09)); d = min(d, sdCapsule(q, vec2(0.08, 0.0), vec2(0.1, 0.72), 0.09)); d = min(d, sdCapsule(q, vec2(0.24, -0.05), vec2(0.3, 0.5), 0.08)); d = min(d, sdCapsule(q, vec2(0.3, -0.45), vec2(0.58, -0.08), 0.1));
    float m = 1.0 - smoothstep(-px, px, d); return vec4(vec3(0.95, 0.76, 0.6) * (0.8 + 0.2 * smoothstep(0.0, -0.08, d)), m); }
  if (st == 16) { float r = length(q - vec2(0.3, -0.6)), w = r * 34.0 + fbm(q * 2.0) * 3.0, ridgeL = 0.5 + 0.5 * sin(w * 3.1416 * 2.0); float pore = stars(q, 22.0, 0.75, 0.02) * smoothstep(0.6, 1.0, ridgeL);
    vec3 c = mix(vec3(0.78, 0.55, 0.45), vec3(0.95, 0.75, 0.62), ridgeL) * (1.0 - 0.5 * pore); return vec4(c, fade(rho)); }
  if (st == 17) { vec2 v = vor(q * 1.6 + 7.0); float wall = 1.0 - smoothstep(0.03, 0.06 + px * 3.0, v.y - v.x), nuc = 1.0 - smoothstep(0.12, 0.15, v.x);
    vec3 c = mix(vec3(0.95, 0.8, 0.72), vec3(0.98, 0.88, 0.8), fbm(q * 9.0)); c = mix(c, vec3(0.6, 0.38, 0.55), nuc * 0.8); c = mix(c, vec3(0.75, 0.45, 0.42), wall); return vec4(c, fade(rho)); }
  if (st == 18) { float chrom = fbm(q * 7.0), memb = exp(-pow((rho - 1.0) / (0.025 + px), 2.0)); vec3 c = mix(vec3(0.45, 0.25, 0.5), vec3(0.75, 0.5, 0.78), smoothstep(0.35, 0.7, chrom)); c = mix(c, vec3(0.3, 0.12, 0.35), 1.0 - smoothstep(0.17, 0.2, length(q - vec2(-0.3, 0.25))));
    c += vec3(0.6, 0.4, 0.6) * memb; return vec4(c, max(disc(rho, px), 0.3 * smoothstep(1.6, 1.0, rho))); }
  if (st == 19) { vec2 r2 = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8); float ph = r2.y * 18.47; float x1 = 0.1 * sin(ph), x2 = 0.1 * sin(ph + 2.2);
    float s1 = exp(-pow((r2.x - x1) / (0.018 + px), 2.0)), s2 = exp(-pow((r2.x - x2) / (0.018 + px), 2.0)); float rung = step(abs(r2.x - (x1 + x2) * 0.5), abs(x1 - x2) * 0.5) * (1.0 - smoothstep(0.1, 0.25, abs(fract(r2.y * 30.0) - 0.5) * 2.0));
    float front1 = cos(ph) * 0.5 + 0.5, front2 = cos(ph + 2.2) * 0.5 + 0.5; vec3 c = vec3(0.12, 0.08, 0.16) + vec3(0.3, 0.2, 0.35) * fbm(q * 5.0) * 0.4;
    c = mix(c, mix(vec3(0.9, 0.5, 0.3), vec3(0.4, 0.8, 0.6), step(0.5, hash(vec2(floor(r2.y * 30.0), 1.0)))), rung * 0.8); c = mix(c, vec3(0.35, 0.6, 1.0) * (0.5 + 0.5 * front1), s1); c = mix(c, vec3(1.0, 0.55, 0.3) * (0.5 + 0.5 * front2), s2);
    return vec4(c, fade(rho)); }
  if (st == 20) { float s1 = exp(-rho * 4.0), p = exp(-rho * 2.2) * pow(abs(cos(ang - 0.5)), 6.0) * 0.6, p2 = exp(-rho * 2.2) * pow(abs(sin(ang - 0.5)), 6.0) * 0.6; float speck = stars(q + t * 0.02, 18.0, 0.55, 0.02);
    vec3 c = vec3(0.25, 0.55, 1.0) * (s1 * 0.9 + p + p2) + vec3(0.7, 0.9, 1.0) * speck * (s1 + p + p2) * 1.5; return vec4(c, clamp(s1 + p + p2 + 0.15, 0.0, 1.0) * (1.0 - smoothstep(1.0, 1.6, rho))); }
  if (st == 21) { vec3 c = vec3(0.0); float a = 0.0; for (int i = 0; i < 12; i++) { float fi = float(i); vec2 cen = 0.42 * vec2(cos(fi * 2.4), sin(fi * 2.4)) * sqrt((fi + 0.5) / 12.0) * 1.6 + 0.03 * vec2(sin(t * 3.0 + fi), cos(t * 2.0 + fi)); float d = length(q - cen) / 0.3;
      if (d < 1.0) { vec3 b = mod(fi, 2.0) < 0.5 ? vec3(0.95, 0.3, 0.25) : vec3(0.55, 0.6, 0.72); c = sphereShade((q - cen) / 0.3, b, vec2(-0.5, 0.6)); a = 1.0; } }
    return vec4(c + vec3(1.0, 0.6, 0.3) * exp(-rho * 2.0) * 0.15 * (1.0 - a), max(a, exp(-rho * 1.5) * 0.25)); }
  if (st == 22) { vec3 c = vec3(0.5, 0.2, 0.3) * exp(-rho * 1.5) * (0.6 + 0.4 * ridge(q * 4.0 + t * 0.3)); float a = exp(-rho * 1.2) * 0.85;
    for (int i = 0; i < 3; i++) { float fi = float(i); vec2 cen = 0.4 * vec2(cos(fi * 2.094 + t * 0.7), sin(fi * 2.094 + t * 0.7)); float d = length(q - cen); vec3 qc = i == 0 ? vec3(1.0, 0.25, 0.25) : i == 1 ? vec3(0.25, 1.0, 0.35) : vec3(0.3, 0.45, 1.0); c += qc * exp(-d * d / 0.008) * 1.5 + qc * exp(-d / 0.12) * 0.2; }
    return vec4(c, clamp(a + 0.2, 0.0, 1.0) * (1.0 - smoothstep(1.0, 1.5, rho))); }
  if (st == 23) { float d = rho; return vec4(vec3(1.0, 0.35, 0.3) * (exp(-d * d * 3.0) * 1.2 + exp(-d * 1.5) * 0.3), clamp(exp(-d * 1.2), 0.0, 1.0)); }
  if (st == 24) { float gran = fbm(q * 18.0 + t * 0.05), limb = sqrt(max(0.0, 1.0 - rho * rho)); vec3 c = vec3(1.0, 0.85, 0.55) * (0.6 + 0.45 * limb) * (0.9 + 0.2 * gran);
    float glow = exp(-max(rho - 1.0, 0.0) / 0.12) * 0.8 + exp(-max(rho - 1.0, 0.0) / 1.0) * 0.2; return vec4(rho < 1.0 ? c : vec3(1.0, 0.65, 0.3), rho < 1.0 ? disc(rho, px) : glow); }
  if (st == 25) { float cr = smoothstep(0.55, 0.62, fbm(q * 6.0 + 1.0)); return vec4(sphereShade(q, mix(vec3(0.62), vec3(0.42), cr), vec2(-1.0, 0.25)), disc(rho, px)); }
  return vec4(0.0);
}
void main() {
  vec2 px = gl_FragCoord.xy / uDpr; vec3 col = vec3(0.004, 0.006, 0.016);
  col += vec3(0.85, 0.9, 1.0) * (stars(px / uRes.y, 90.0, 0.93, 0.05) * 0.6 + stars(px / uRes.y + 3.0, 40.0, 0.95, 0.04)) * uStars;
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uN) break;
    vec4 L = uL[i], M = uM[i]; vec2 q = (px - L.xy) / L.z; q.y = q.y;
    if (abs(q.x) > 2.2 || abs(q.y) > 2.2) continue;
    vec4 s = style(int(L.w + 0.5), q, 1.0 / L.z, uTime + M.y);
    col = mix(col, s.rgb, clamp(s.a, 0.0, 1.0) * M.x);
  }
  gl_FragColor = vec4(col, 1.0);
}`;
const gv = K.gl.create(ui.stage, { dprMax: 1.5, message: "<b>This view needs WebGL</b>, which this browser or computer has switched off.<br>Try Chrome or Edge with graphics acceleration on. The comparison tool and the Batch run still work." });
let glOn = false; const P = {};
if (gv.ok) { try { P.p = K.gl.program(gv.gl, K.gl.QUAD_VS, FS); P.quad = K.gl.quad(gv.gl); glOn = true; } catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly."); } }
const cv = ui.canvas();

// ---------------------------------------------------------------- which objects are on screen, and where
function layers() {
  const V = 10 ** z, Wp = cv.w, out = [];
  const add = (o, cx, cy) => {
    const r = o.d / 2 / V * Wp; if (r < 0.6 || r > 40 * Wp) return;
    const x = Wp / 2 + cx / V * Wp, y = cv.h / 2 - cy / V * Wp; if (x + r < -Wp || x - r > 2 * Wp || y + r < -cv.h || y - r > 2 * cv.h) return;
    const op = Math.min(1, (r - 0.6) / 4) * (1 - K.clamp((r / Wp - 3) / 7, 0, 1));   // fade in as a dot; fade out once we are deep inside it
    out.push({ o, x, y, r, op });
  };
  for (const o of CHAIN) add(o, o.cx, o.cy);
  for (const s of SIDE) add(s.o, s.cx, s.cy);
  out.sort((a, b) => b.r - a.r);
  return out.slice(Math.max(0, out.length - MAXL));
}
function glDraw(L) {
  const gl = gv.gl, H = cv.h; gl.viewport(0, 0, gv.el.width, gv.el.height);
  const A = new Float32Array(4 * MAXL), B = new Float32Array(4 * MAXL);
  L.forEach((l, i) => { A.set([l.x, H - l.y, l.r, l.o.style], 4 * i); B.set([l.op, (l.o.d * 1e7) % 7, 0, 0], 4 * i); });
  P.p.set({ uRes: [cv.w, H], uDpr: gv.el.width / cv.w, uTime: performance.now() / 1000, uStars: K.clamp((z - 7) / 2, 0, 1), uN: L.length, uL: A, uM: B });
  P.quad.draw(P.p, null);
}
// ---------------------------------------------------------------- the 2D layer: labels, the scale bar, the big power of ten, the comparison panel
let labelHits = [];
function drawOverlay() {
  const c = cv.ctx, Wd = cv.w, H = cv.h, L = layers(); c.clearRect(0, 0, Wd, H);
  if (glOn && gv.ok) glDraw(L);
  labelHits = [];
  if (showLabels) {
    c.font = "13px Segoe UI,system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    for (const l of L) {
      if (l.r < 7 || l.r > 0.42 * Math.min(Wd, H)) continue;
      let ly = l.y + l.r + 16; if (ly > H - 40) ly = l.y - l.r - 16; const lx = K.clamp(l.x, 90, Wd - 90), size = l.o.k === "quark" ? "smaller than 10⁻¹⁸ m" : fmtLen(l.o.d);
      const t1 = l.o.name, w = Math.max(c.measureText(t1).width, c.measureText(size).width) + 16;
      c.fillStyle = "rgba(6,10,22,.7)"; c.beginPath(); c.roundRect(lx - w / 2, ly - 11, w, 36, 6); c.fill();
      c.fillStyle = "#f2f5fb"; c.fillText(t1, lx, ly); c.fillStyle = "#9fd0ff"; c.font = "12px Segoe UI,system-ui,sans-serif"; c.fillText(size, lx, ly + 15); c.font = "13px Segoe UI,system-ui,sans-serif";
      labelHits.push([lx - w / 2, ly - 11, w, 36, l.o.k]);
    }
  }
  // "you are here": the point the zoom heads for
  c.strokeStyle = "rgba(255,220,120,.55)"; c.lineWidth = 1; c.beginPath(); c.moveTo(Wd / 2 - 9, H / 2); c.lineTo(Wd / 2 - 3, H / 2); c.moveTo(Wd / 2 + 3, H / 2); c.lineTo(Wd / 2 + 9, H / 2); c.moveTo(Wd / 2, H / 2 - 9); c.lineTo(Wd / 2, H / 2 - 3); c.moveTo(Wd / 2, H / 2 + 3); c.lineTo(Wd / 2, H / 2 + 9); c.stroke();
  // scale bar: the biggest 1, 2 or 5 × 10ⁿ that fits in 160 pixels
  const mpp = 10 ** z / Wd; let e = Math.floor(Math.log10(160 * mpp)), len = 10 ** e; for (const m of [5, 2]) if (m * 10 ** e <= 160 * mpp) { len = m * 10 ** e; break; }
  const bw = len / mpp; c.strokeStyle = c.fillStyle = "#e8edf6"; c.lineWidth = 2; c.beginPath(); c.moveTo(20, H - 24); c.lineTo(20 + bw, H - 24); c.moveTo(20, H - 30); c.lineTo(20, H - 18); c.moveTo(20 + bw, H - 30); c.lineTo(20 + bw, H - 18); c.stroke();
  c.textAlign = "left"; c.font = "13px Segoe UI,system-ui,sans-serif"; c.fillText(`${fmtLen(len)}  (${len / 10 ** e === 1 ? "" : len / 10 ** e + " × "}${pow10(e)} m)`, 28 + bw, H - 24);
  // the big power of ten
  c.font = "600 34px Segoe UI,system-ui,sans-serif"; c.fillStyle = "rgba(255,255,255,.9)"; c.textBaseline = "top"; c.fillText(pow10(Math.round(z)) + " m", 18, 14);
  c.font = "13px Segoe UI,system-ui,sans-serif"; c.fillStyle = "rgba(200,215,240,.85)"; c.fillText("width of the view: " + fmtLen(10 ** z), 20, 54); c.textBaseline = "middle";
  if (cmp) comparePanel(c);
  hud(L);
}
function comparePanel(c) {
  const A = BYKEY[cmp.a], B = BYKEY[cmp.b], [s, l] = A.d <= B.d ? [A, B] : [B, A], Wd = cv.w, H = cv.h, pw = Math.min(520, Wd - 40), ph = 220, x0 = (Wd - pw) / 2, y0 = H - ph - 46;
  c.fillStyle = "rgba(6,10,22,.88)"; c.strokeStyle = "rgba(140,170,230,.4)"; c.beginPath(); c.roundRect(x0, y0, pw, ph, 10); c.fill(); c.stroke();
  const R = 80, ratio = l.d / s.d, r = R / ratio, cx = x0 + 120, cy = y0 + ph / 2 + 4;
  c.fillStyle = "rgba(255,200,120,.25)"; c.strokeStyle = "#ffc878"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.fill(); c.stroke();
  c.fillStyle = "#7fd0ff"; c.beginPath(); c.arc(cx + R + 30, cy, Math.max(1.5, Math.min(R, r)), 0, 6.3); c.fill();
  if (r < 3) { c.strokeStyle = "#7fd0ff"; c.lineWidth = 1; c.beginPath(); c.arc(cx + R + 30, cy, 9, 0, 6.3); c.stroke(); }
  c.textAlign = "left"; c.fillStyle = "#ffc878"; c.font = "600 13px Segoe UI,system-ui,sans-serif"; c.fillText(l.name + ": " + fmtLen(l.d), x0 + 250, y0 + 34);
  c.fillStyle = "#7fd0ff"; c.fillText(s.name + ": " + (s.k === "quark" ? "< 10⁻¹⁸ m" : fmtLen(s.d)), x0 + 250, y0 + 56);
  c.fillStyle = "#e8edf6"; c.font = "13px Segoe UI,system-ui,sans-serif";
  const lines = [`${sci(ratio)} times wider`, `${sci(ratio)} side by side across it`, `${sci(ratio ** 3)} would fit inside (by volume)`, `${Math.log10(ratio).toFixed(1)} powers of ten apart`, r < 1 ? `(the small one is far less than a pixel here)` : ""];
  lines.forEach((t, i) => c.fillText(t, x0 + 250, y0 + 88 + i * 22));
}
function hud(L) {
  const main = L.filter(l => l.r < 0.42 * Math.min(cv.w, cv.h) && CHAIN.includes(l.o)).sort((a, b) => b.r - a.r)[0];
  if (!main) { ui.hud(""); return; }
  const i = CHAIN.indexOf(main.o), up = CHAIN[i - 1], down = CHAIN[i + 1];
  ui.hud(`<b>${main.o.name}</b>: ${main.o.k === "quark" ? "smaller than 10⁻¹⁸ m" : fmtLen(main.o.d)}<br><span style="font-size:12px;color:#b9c6dc">${main.o.src.split(/(?<=\.) /)[0]}</span>` +
    (up ? `<br><span style="font-size:12px">${sci(up.d / main.o.d)} of them would fit across: ${up.name}</span>` : "") + (down && down.k !== "quark" ? `<br><span style="font-size:12px">${down.name}: ${sci(main.o.d / down.d)} would fit across this</span>` : ""));
}

// ---------------------------------------------------------------- mouse, loop
cv.el.addEventListener("wheel", e => { e.preventDefault(); z = K.clamp(z + (e.deltaY > 0 ? 0.08 : -0.08), ZMIN, ZMAX); zTarget = null; playDir = 0; }, { passive: false });
K.pointer(cv.el, { down(p) { for (const [x, y, w, h, k] of labelHits) if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) { jump(k); return; } } });
ui.run(dt => {
  if (playDir) { z = K.clamp(z + playDir * rate * dt, ZMIN, ZMAX); if (z === ZMIN || z === ZMAX) playDir = 0; }
  if (zTarget != null) { const d = zTarget - z, stepz = Math.sign(d) * Math.min(Math.abs(d), Math.max(0.02, Math.abs(d) * 3 * dt) * rate * 1.5); z += stepz; if (Math.abs(zTarget - z) < 0.002) { z = zTarget; zTarget = null; } }
}, () => {
  frame++; drawOverlay();
  if (frame % 6 === 0) {
    S.z.set(z);
    const V = 10 ** z, t = V / 2.998e8; read.set("w", fmtLen(V)); read.set("p", pow10(Math.round(z)) + " m");
    const L = layers().filter(l => l.r < 0.42 * Math.min(cv.w, cv.h) && CHAIN.includes(l.o)).sort((a, b) => b.r - a.r)[0]; read.set("obj", L ? L.o.name : "–");
    read.set("light", t < 1e-6 ? sci(t * 1e9) + " ns" : t < 1 ? sci(t * 1000) + " ms" : t < 3600 ? sci(t) + " s" : t < 3.156e7 * 2 ? sci(t / 86400) + " days" : sci(t / 3.156e7) + " years");
    chA.draw([{ pts: MASSED.map(o => [Math.log10(o.d), Math.log10(o.m)]), type: "dots", color: "#ffd166", r: 3.5 }, { pts: [[-19, Math.log10(1000 * Math.PI / 6) - 57], [28, Math.log10(1000 * Math.PI / 6) + 84]], color: "#5ad1ff", dash: [5, 4], label: "density of water" }],
      { title: "Size and mass of everything (the line marks the view's width)", xLabel: "log₁₀ (size in metres)", yLabel: "log₁₀ (kg)", xMin: -19, xMax: 28, yMin: -30, yMax: 56, vlines: [{ x: z, color: "#ff8a65", label: "view" }] });
  }
});
jump("person", true);
setTimeout(() => { if (Math.abs(z - Math.log10(1.7 * 2.6)) < 0.01) playDir = 1; }, 1500);
ui.tip("Zooming out from a person to the edge of the observable universe. Stop, zoom back in, or jump anywhere.", 9000);
