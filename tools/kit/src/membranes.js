/* =====================================================================
   MEMBRANES AND MOVEMENT
   Substances move into and out of cells across the cell membrane:
     * DIFFUSION: particles spread from where they are more concentrated
       to where they are less, by random movement. No energy needed.
     * OSMOSIS: water diffuses across a partially permeable membrane from
       a dilute solution (high water potential) to a concentrated one.
     * ACTIVE TRANSPORT: carrier proteins use energy (ATP) from
       respiration to move particles AGAINST the concentration gradient.
     * Facilitated diffusion (A level): through channel or carrier proteins.
   Rate of diffusion (Fick's law) ∝ surface area × concentration
   difference ÷ thickness, and faster when warmer.

   Particles here really do move at random, and cross the membrane only
   where they hit a pore (or a protein). The patterns come from that.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---- the particle box: x from 0 to 1, membrane at x = 0.5 ----
class Box {
  /* o = { proc: "diff" | "osmo" | "active" | "facil", nL, nR (solute left and right), T (°C), pores (0–1 surface area), thick (relative thickness), resp (0–1), carriers } */
  constructor(o, r) {
    this.o = Object.assign({ proc: "diff", nL: 120, nR: 20, T: 25, pores: 0.5, thick: 1, resp: 1, carriers: 8 }, o); this.r = r; this.t = 0; this.crossed = 0; this.mem = 0.5;
    const mk = (n, side, kind) => Array.from({ length: n }, () => ({ x: side ? 0.5 + r() * 0.48 + 0.01 : r() * 0.48 + 0.01, y: r(), kind }));
    this.P = mk(this.o.nL, 0, "s").concat(mk(this.o.nR, 1, "s"));
    if (this.o.proc === "osmo") this.P = this.P.concat(mk(150, 0, "w"), mk(150, 1, "w"));
    this.carr = Array.from({ length: this.o.carriers }, (_, i) => ({ y: (i + 0.5) / this.o.carriers, busy: 0, p: null }));
    const np = Math.max(1, Math.round(12 * this.o.pores)); this.poreYs = Array.from({ length: np }, (_, i) => (i + 0.5) / np);   // pores spread evenly along the membrane
  }
  canCross(p, fromLeft) {   // can this particle pass through the membrane here? (fromLeft: which side it started on)
    const o = this.o; if (o.proc === "osmo") { if (p.kind !== "w") return false; const sol = fromLeft ? this.sL / this.mem : this.sR / (1 - this.mem); return this.r() < 0.5 / o.thick * Math.max(0.05, 1 - 0.006 * sol); }   // partially permeable: water only; solute molecules hold water back, so fewer water molecules leave the concentrated side
    if (o.proc === "active" || o.proc === "facil") return false;                                           // only via the proteins (handled below)
    return this.poreYs.some(py => Math.abs(p.y - py) < 0.025) && this.r() < 0.6 / o.thick;                // through a pore
  }
  step(dt) {
    if (this.o.proc === "osmo") { this.sL = 0; this.sR = 0; for (const p of this.P) if (p.kind === "s") { if (p.x < this.mem) this.sL++; else this.sR++; } }
    const o = this.o, r = this.r, sp = 0.09 * Math.sqrt((o.T + 273) / 298) * Math.sqrt(dt);        // random steps: faster when warmer
    for (const p of this.P) {
      if (p.held) continue;
      const ox = p.x; p.x += sp * r.gauss(); p.y = (p.y + sp * r.gauss() + 1) % 1;
      if (p.x < 0.005) p.x = 0.01 - p.x; if (p.x > 0.995) p.x = 1.99 - p.x;
      if ((ox - this.mem) * (p.x - this.mem) < 0) { if (this.canCross(p, ox < this.mem)) { if (p.kind === "s" && ox < this.mem) this.crossed++; if (p.kind === "s" && ox > this.mem) this.crossed--; } else p.x = 2 * this.mem - p.x; }
    }
    // proteins in the membrane: carriers grab a particle that bumps into them
    if (o.proc === "active" || o.proc === "facil") for (const c of this.carr) {
      if (c.p) { c.busy -= dt; if (c.busy <= 0) { c.p.held = false; c.p.x = c.dir > 0 ? this.mem + 0.02 : this.mem - 0.02; c.p.y = c.y; if (c.dir > 0) this.crossed++; else this.crossed--; c.p = null; } continue; }
      if (o.proc === "active" && r() > o.resp * dt * 6) continue;                                      // no ATP from respiration, no pumping
      for (const p of this.P) { if (p.held || p.kind !== "s") continue; const left = p.x < this.mem; if (o.proc === "active" && !left) continue; if (Math.abs(p.x - this.mem) < 0.03 && Math.abs(p.y - c.y) < 0.04) { c.p = p; p.held = true; c.dir = left ? 1 : -1; c.busy = o.proc === "active" ? 0.6 : 0.4; break; } }
    }
    if (o.proc === "osmo") { const wL = this.P.filter(p => p.kind === "w" && p.x < this.mem).length, wR = this.P.filter(p => p.kind === "w" && p.x >= this.mem).length; const target = K.clamp(wL / (wL + wR), 0.2, 0.8); this.mem += (target - this.mem) * 0.015; }   // each side's volume follows the water it holds
    this.t += dt;
  }
  count() { let L = 0, R = 0; for (const p of this.P) if (p.kind === "s") { if (p.x < this.mem || (p.held && p.x < this.mem)) L++; else R++; } return [L, R]; }
}
// ---- agar cubes: the coloured acid front moves in as √(2Dt) from every face ----
const D_AGAR = 0.0018;                                                       // cm² per second (illustrative)
const agarTime = side => Math.pow(side / 2, 2) / (2 * D_AGAR) / 60;          // minutes for the front to reach the centre
const agarDone = (side, tMin) => { const d = Math.min(side / 2, Math.sqrt(2 * D_AGAR * tMin * 60)), inner = Math.max(0, side - 2 * d); return 1 - Math.pow(inner / side, 3); };   // fraction of the cube changed colour
// ---- potato cylinders in sucrose: water moves until the water potentials are equal ----
const PSI_TISSUE = -0.75;                                                    // MPa: about the same as 0.3 mol/dm³ sucrose
const psiSucrose = c => -2.45 * c;                                           // solute potential of sucrose at 20 °C (ψ = −iCRT, approximately)
const massChange = (c, hours = 24) => 22 * Math.tanh((psiSucrose(c) - PSI_TISSUE) / 0.9) * (1 - Math.exp(-hours / 6));   // % change in mass

// ---------------- The page ----------------
const P = { mode: "box", proc: "diff", nL: 120, nR: 20, T: 25, pores: 0.5, thick: 1, resp: 1, sides: [0.5, 1, 2, 3], conc: 0.4, hours: 0 };
let rnd = K.rng(Date.now() % 99991 + 59), box = null, log = [], speed = 1, agarT = 0, potato = [], potT = 0;
const ui = K.app({
  title: "Membranes and Movement", subject: "Biology",
  blurb: "Diffusion, osmosis and active transport, surface area to volume, and potato cylinders",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(d) movement of substances into and out of cells: diffusion, osmosis and active transport; factors affecting the rate (surface area to volume ratio, distance, temperature, concentration gradient); practical: diffusion and osmosis in living and non-living systems.", adv: "OCR A level Biology A (H420) 2.1.5 biological membranes: diffusion, facilitated diffusion (channel and carrier proteins), active transport, osmosis and water potential; the effects of solutions of different water potential on plant and animal cells." } },
  missions: [
    { title: "Diffusion", q: "Start with lots of particles on the left and few on the right. Watch them move at random. Which way is the NET movement? When does it stop?", hint: "Each particle moves at random, but there are more on the left to cross from there, so more cross left to right than right to left: net movement down the concentration gradient. When the concentrations are equal, particles still cross both ways, but equally: no net movement (dynamic equilibrium).", setup() { set({ proc: "diff" }); } },
    { title: "What changes the rate?", q: "Try a warmer temperature, more pores (surface area) and a thicker membrane. Which make diffusion faster? Watch the 'crossed per second' readout.", hint: "Faster when warmer (particles move faster), with more surface area, and with a steeper concentration gradient; slower with a thicker membrane (longer distance). Fick's law: rate ∝ area × difference in concentration ÷ thickness. Lungs, gut and leaves are adapted to maximise this.", setup() { set({ proc: "diff", T: 5 }); } },
    { title: "Osmosis", q: "Now the membrane only lets water (blue) through. The right side has more sugar (yellow). Which way does water move, and what happens to the volumes?", hint: "Water moves from the dilute side (more free water molecules) to the concentrated side, so the right side swells. Sugar molecules are too big to pass through. That is osmosis: the diffusion of water across a partially permeable membrane.", setup() { set({ proc: "osmo", nL: 10, nR: 80 }); } },
    { title: "Active transport", q: "Carrier proteins move particles from left to right even when the right already has more. What happens if you turn respiration down to zero (like cyanide poisoning)?", hint: "Active transport moves particles against the concentration gradient, using energy (ATP) from respiration. With no respiration the carriers stop, and only diffusion would happen. Root hair cells take up mineral ions this way, and the gut absorbs glucose.", setup() { set({ proc: "active", nL: 80, nR: 60 }); } },
    { title: "Surface area to volume", q: "Agar cubes of side 0.5, 1, 2 and 3 cm are put in acid. Which turns completely pink first? Compare their surface area to volume ratios.", hint: "The acid moves in by diffusion from every face. The small cube has a large surface area for its volume (12 : 1 for 0.5 cm, 2 : 1 for 3 cm) and a short distance to the centre, so it changes colour first. Time to reach the centre grows as the square of the distance. That is why large organisms need exchange surfaces and transport systems.", setup() { set({ mode: "agar" }); } },
    { title: "Potato and sucrose", q: "Potato cylinders are left in sucrose solutions from 0 to 1 mol/dm³. Which gain mass and which lose it? Where would they not change?", hint: "In water and weak solutions, water enters the potato cells by osmosis: they gain mass and become turgid. In strong solutions water leaves: they lose mass and become flaccid. The line crosses zero at about 0.3 mol/dm³: there the solution has the same concentration (water potential) as the cell sap.", setup() { set({ mode: "potato" }); } },
    { lvl: "adv", title: "Facilitated diffusion", q: "Use carrier proteins for facilitated diffusion. Does the rate keep rising as the concentration difference grows? Compare with simple diffusion through pores.", hint: "Facilitated diffusion is passive (down the gradient, no ATP), but limited by the number of carrier proteins. When they are all busy, the rate levels off (saturation), unlike simple diffusion, which keeps rising in proportion to the difference.", setup() { set({ proc: "facil", nL: 160, nR: 10 }); } },
    { lvl: "adv", title: "Water potential", q: "In the potato view, look at the water potentials. Which way does water move between the cell (ψ about −0.75 MPa) and a 0.6 mol/dm³ solution (ψ about −1.5 MPa)?", hint: "Water moves from higher (less negative) to lower (more negative) water potential: out of the cell into the solution. The cell becomes flaccid and eventually plasmolysed (the membrane pulls away from the cell wall). Pure water has ψ = 0, the highest possible.", setup() { set({ mode: "potato", conc: 0.6 }); } }
  ],
  batch: [
    { title: "Agar cubes: size and time", question: "How long does acid take to reach the centre of agar cubes of different sizes?", how: "Cubes of side 0.25 to 3 cm; the time for the colour to change all through is judged by eye (±5%). Theory: t = (side ÷ 2)² ÷ 2D, proportional to side².", xLabel: "side of the cube (cm)", yLabel: "time to change colour (minutes)", xs: [0.25, 0.5, 1, 1.5, 2, 2.5, 3], reps: 4, yMin: 0, theory: s => agarTime(s), theoryLabel: "∝ side²", run: (x, r) => agarTime(x) * (1 + 0.05 * r.gauss()), note: "Double the size, four times as long. Diffusion is fast over short distances and very slow over long ones." },
    { title: "Potato cylinders in sucrose", question: "How does the percentage change in mass depend on the sucrose concentration?", how: "Cylinders left for 24 hours in 0 to 1.0 mol/dm³ sucrose; each cylinder differs a little (±1.5%). Theory: water moves from higher to lower water potential, so mass change ∝ (ψ cell − ψ solution) for small differences.", xLabel: "sucrose (mol/dm³)", yLabel: "change in mass (%)", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0], reps: 3, theory: c => massChange(c), theoryLabel: "model", run: (x, r) => massChange(x) + 1.5 * r.gauss(), note: "The line crosses zero at about 0.3 mol/dm³: the concentration with the same water potential as the potato cells (isotonic)." },
    { title: "Temperature and diffusion", question: "How does temperature change the rate of diffusion across the membrane?", how: "240 particles on the left, 20 on the right; particles crossing (net) in 20 seconds of model time; 0 to 60 °C.", xLabel: "temperature (°C)", yLabel: "net particles crossed", xs: [0, 10, 20, 30, 40, 50, 60], reps: 8, yMin: 0, run: (x, r) => { const b = new Box({ proc: "diff", T: x, nL: 240 }, r); for (let k = 0; k < 400; k++) b.step(0.05); return b.crossed; }, note: "Warmer particles move faster, so more reach the membrane each second. Particle speed goes as the square root of the absolute temperature, so from 0 °C to 60 °C diffusion is only about 10–20% faster here: the trend is small compared with the chance scatter, so look at the means. (In living cells, high temperatures also damage the membrane.)" },
    { title: "Membrane thickness", question: "How does the thickness of the membrane change the rate of diffusion?", how: "240 particles on the left, 20 on the right; relative thickness 0.5 to 4; net particles crossed in 20 seconds.", xLabel: "relative thickness", yLabel: "net particles crossed", xs: [0.5, 1, 1.5, 2, 3, 4], reps: 6, yMin: 0, run: (x, r) => { const b = new Box({ proc: "diff", thick: x, nL: 240 }, r); for (let k = 0; k < 400; k++) b.step(0.05); return b.crossed; }, note: "Thicker membranes slow diffusion (Fick's law: rate ∝ 1 ÷ thickness). The fall is gentler than that here because, as fewer cross, the gradient stays steep for longer." },
    { title: "Active transport and respiration", question: "How does the rate of active transport depend on respiration (the ATP supply)?", how: "80 particles on the left, 60 on the right (against the gradient); net carried across in 8 s; respiration from 0 (cyanide) to full.", xLabel: "respiration rate (relative)", yLabel: "particles carried to the right", xs: [0, 0.1, 0.25, 0.5, 0.75, 1], reps: 4, yMin: 0, run: (x, r) => { const b = new Box({ proc: "active", nL: 80, nR: 60, resp: x }, r); for (let k = 0; k < 160; k++) b.step(0.05); return b.crossed; }, note: "No respiration, no transport against the gradient. As respiration rises the carriers work faster, until each carrier is working flat out." },
    { lvl: "adv", title: "Facilitated diffusion saturates", question: "How does the rate of facilitated diffusion depend on the concentration on the high side?", how: "Carrier proteins only (8 of them); 10 to 300 particles on the left, 10 on the right; net crossed in 8 s.", xLabel: "particles on the left", yLabel: "net particles crossed", xs: [10, 40, 80, 120, 180, 240, 300], reps: 3, yMin: 0, run: (x, r) => { const b = new Box({ proc: "facil", nL: x, nR: 10 }, r); for (let k = 0; k < 160; k++) b.step(0.05); return b.crossed; }, note: "The rate levels off once the carriers are all busy: the number of carrier proteins limits facilitated diffusion." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2.15", text: "Diffusion: net movement of particles from a high to a low concentration (down a gradient), by random movement; passive." },
      { lvl: "std", tag: "4BI1 2.15", text: "Osmosis: net movement of water across a partially permeable membrane from a dilute solution (high water concentration) to a concentrated solution." },
      { lvl: "std", tag: "4BI1 2.15", text: "Active transport: movement against a concentration gradient using energy from respiration, by carrier proteins." },
      { lvl: "std", tag: "4BI1 2.16", text: "The rate of movement increases with surface area to volume ratio, a steeper concentration gradient and higher temperature, and decreases with distance (thickness)." },
      { lvl: "std", tag: "4BI1 2.17", text: "Practicals: agar cubes in acid (or dye) for surface area to volume; potato cylinders in sucrose solutions: plot % change in mass and find where it crosses zero." },
      { lvl: "adv", tag: "H420 2.1.5", text: "Facilitated diffusion uses channel or carrier proteins; it is passive and limited by the number of proteins (rate saturates)." },
      { lvl: "adv", tag: "H420 2.1.5", text: "Water potential ψ (kPa or MPa): pure water 0, solutions negative. Water moves from higher to lower ψ. Plant cells in low ψ solutions become plasmolysed; animal cells shrink (crenate) or burst (lyse)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a 1 cm agar cube changes colour all through faster than a 3 cm cube.", ans: "<ul><li>the small cube has a larger surface area to volume ratio</li><li>the distance from the surface to the centre is shorter</li><li>so acid diffuses to the centre in less time</li></ul>" },
      { lvl: "std", marks: 3, q: "A potato cylinder in 0.8 mol/dm³ sucrose lost mass. Explain why.", ans: "<ul><li>the solution is more concentrated than the cell sap (lower water potential)</li><li>water leaves the cells by osmosis</li><li>through the partially permeable membrane, so the mass falls</li></ul>" },
      { lvl: "std", marks: 2, q: "A cylinder's mass changed from 2.40 g to 2.64 g. Calculate the percentage change in mass.", ans: "<ul><li>change = 0.24 g; 0.24 ÷ 2.40 × 100</li><li>= +10%</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why root hair cells need to respire to take up mineral ions from the soil.", ans: "<ul><li>ions are more concentrated inside the root than in the soil</li><li>so they must be moved against the gradient by active transport, which needs ATP from respiration</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why the rate of facilitated diffusion levels off at high concentrations, while simple diffusion does not.", ans: "<ul><li>facilitated diffusion needs carrier (or channel) proteins</li><li>at high concentrations all the carriers are in use (saturated)</li><li>simple diffusion through the bilayer is limited only by the gradient</li></ul>" },
      { lvl: "adv", marks: 3, q: "Red blood cells are put in pure water and in a strong salt solution. Describe and explain what happens in each.", ans: "<ul><li>water: higher ψ outside, water enters by osmosis, the cells swell and burst (lysis)</li><li>salt: lower ψ outside, water leaves, the cells shrink (crenated)</li><li>animal cells have no cell wall to resist swelling</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Particles</b> take random steps (Brownian motion), with a step size that grows with √(absolute temperature). The membrane is in the middle; a particle that reaches it crosses only through a pore (diffusion: the number of pores is the surface area, and the chance of getting through falls with thickness), only if it is water (osmosis), or only by being carried by a protein (facilitated diffusion and active transport). Otherwise it bounces back.</li>
<li><b>Osmosis</b>: the membrane moves as water collects on one side, showing the change in volume.</li>
<li><b>Active transport</b>: carriers take particles from left to right only, and only when ATP is available (the respiration slider); each trip takes 0.6 s. <b>Facilitated diffusion</b>: carriers move particles either way, 0.4 s per trip.</li>
<li><b>Agar cubes</b>: the colour front moves in from every face a distance √(2Dt) (D = 0.0018 cm² s⁻¹, illustrative).</li>
<li><b>Potato</b>: the change in mass depends on the difference between the solution's water potential and the tissue's (−0.75 MPa) and the solution's (−2.45 MPa per mol/dm³ of sucrose), levelling off for big differences, and approaching its final value over about 6 hours.</li></ul>
<h3>Simplifications</h3>
<ul><li>A few hundred particles stand for billions of molecules; the box is two-dimensional.</li>
<li>Real membranes are a phospholipid bilayer with proteins; small non-polar molecules also cross the bilayer itself.</li>
<li>The earlier version also had the beetroot membrane-permeability practical and endocytosis; they are not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/membranes.html">original/membranes.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "box", options: [["box", "🫧 Across a membrane"], ["agar", "🧊 Agar cubes"], ["potato", "🥔 Potato and osmosis"]], on: v => set({ mode: v }) });
grp.box = g = ui.group("Across a membrane");
ctl.proc = K.seg(g, { value: "diff", options: [["diff", "Diffusion"], ["osmo", "Osmosis"], ["active", "Active transport"], ["facil", "Facilitated (A level)"]], on: v => set({ mode: "box", proc: v }) });
ctl.nL = K.slider(g, { label: "Particles on the left", min: 0, max: 300, step: 10, value: 120, on: v => { P.nL = v; newBox(); } });
ctl.nR = K.slider(g, { label: "Particles on the right", min: 0, max: 300, step: 10, value: 20, on: v => { P.nR = v; newBox(); } });
ctl.T = K.slider(g, { label: "Temperature", min: 0, max: 60, step: 1, value: 25, unit: "°C", on: v => { P.T = v; box.o.T = v; } });
ctl.pores = K.slider(g, { label: "Surface area (pores)", min: 0.1, max: 1, step: 0.05, value: 0.5, fmt: v => Math.max(1, Math.round(12 * v)) + " pores", on: v => { P.pores = v; newBox(); } });
ctl.thick = K.slider(g, { label: "Membrane thickness", min: 0.5, max: 4, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => { P.thick = v; box.o.thick = v; } });
ctl.resp = K.slider(g, { label: "Respiration (ATP supply)", min: 0, max: 1, step: 0.05, value: 1, fmt: v => v === 0 ? "none (cyanide)" : Math.round(v * 100) + "%", on: v => { P.resp = v; box.o.resp = v; } });
K.btn(K.row(g), "↺ Start again", () => newBox(), "primary");
grp.agar = g = ui.group("Agar cubes in acid");
K.note(g, "Cubes of side 0.5, 1, 2 and 3 cm, made with indicator, dropped into acid at the same moment.");
K.btn(K.row(g), "↺ Drop them in again", () => agarT = 0, "primary");
grp.potato = g = ui.group("Potato cylinders");
ctl.conc = K.slider(g, { label: "Sucrose concentration to look at", min: 0, max: 1, step: 0.05, value: 0.4, unit: "mol/dm³", on: v => { P.conc = v; } });
K.btn(K.row(g), "↺ Start the 24 hours again", () => newPotato(), "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 6, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function newBox() { box = new Box({ proc: P.proc, nL: P.nL, nR: P.nR, T: P.T, pores: P.pores, thick: P.thick, resp: P.resp }, rnd); log = []; }
function newPotato() { potT = 0; potato = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0].map(c => ({ c, m0: 2 + 0.6 * rnd(), err: 1.2 * rnd.gauss() })); }
function set(o) {
  Object.assign(P, { proc: "diff", nL: 120, nR: 20, T: 25, pores: 0.5, thick: 1, resp: 1, conc: 0.4 }, o);
  for (const k of ["nL", "nR", "T", "pores", "thick", "resp", "conc"]) ctl[k].set(P[k]); ctl.mode.set(P.mode); ctl.proc.set(P.proc);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none"; ctl.resp.el.style.display = P.proc === "active" ? "" : "none"; ctl.pores.el.style.display = P.proc === "diff" ? "" : "none";
  newBox(); agarT = 0; newPotato(); speed = o.speed || 1; ctl.speed.set(speed);
  ctl.proc.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none";
  chA.opts.title = { box: "Particles on each side", agar: "Share of each cube changed colour", potato: "Change in mass against sucrose concentration" }[P.mode];
  chB.opts.title = { box: "What changes the rate (Fick's law)", agar: "Surface area to volume ratio", potato: "Mass change over 24 hours" }[P.mode];
  relabel({ box: ["left", "right", "net crossed", "crossing per second"], agar: ["time", "0.5 cm cube", "1 cm cube", "3 cm cube"], potato: ["hours", "chosen solution", "its water potential", "mass change"] }[P.mode]);
}
ui.onLevel = () => set({ mode: P.mode });

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawBox(c, w, h) {
  const b = box, x0 = 40, y0 = 50, bw = w - 80, bh = h - 100, X = x => x0 + x * bw, Y = y => y0 + y * bh;
  c.fillStyle = "#101a2c"; c.fillRect(x0, y0, bw, bh); const mx = X(b.mem);
  // the membrane: a phospholipid bilayer, thicker when thickness is set higher, with pores or proteins
  const th = 6 + 6 * b.o.thick; c.fillStyle = "#c9a96a"; c.fillRect(mx - th / 2, y0, th, bh); c.fillStyle = "#e8d4a0"; for (let y = y0; y < y0 + bh; y += 8) { c.beginPath(); c.arc(mx - th / 2, y + 4, 3, 0, 6.3); c.arc(mx + th / 2, y + 4, 3, 0, 6.3); c.fill(); }
  if (b.o.proc === "diff") { c.fillStyle = "#101a2c"; for (const py of b.poreYs) c.fillRect(mx - th / 2 - 2, Y(py) - 0.025 * bh, th + 4, 0.05 * bh); }
  if (b.o.proc === "active" || b.o.proc === "facil") for (const k of b.carr) { c.fillStyle = b.o.proc === "active" ? "#ff8a70" : "#7fe3a0"; c.beginPath(); c.roundRect(mx - th / 2 - 6, Y(k.y) - 12, th + 12, 24, 6); c.fill(); if (k.p) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(mx, Y(k.y), 5, 0, 6.3); c.fill(); } }
  for (const p of b.P) { if (p.held) continue; c.fillStyle = p.kind === "w" ? "rgba(90,176,255,0.75)" : "#ffd166"; c.beginPath(); c.arc(X(p.x), Y(p.y), p.kind === "w" ? 2.5 : 4.5, 0, 6.3); c.fill(); }
  const [L, R] = b.count(); T(c, `left: ${L}`, x0 + 10, y0 - 14, "#eef2f8", "left", "600 13px"); T(c, `right: ${R}`, x0 + bw - 10, y0 - 14, "#eef2f8", "right", "600 13px");
  T(c, { diff: "membrane with pores: particles cross only through them", osmo: "partially permeable membrane: only water (blue) can cross; sugar (yellow) cannot", active: "carrier proteins pump particles to the right, using ATP", facil: "carrier proteins let particles through in either direction, without ATP" }[b.o.proc], w / 2, h - 18, "#aab6cc", "center", "12px");
}
function drawAgar(c, w, h) {
  const sides = [0.5, 1, 2, 3], scale = Math.min((w - 120) / 7.5, (h - 160) / 3.2), y0 = 80;
  let x = 40; sides.forEach(s => { const px = s * scale, f = Math.min(s / 2, Math.sqrt(2 * D_AGAR * agarT * 60)), inner = Math.max(0, s - 2 * f) * scale, cy = y0 + (3.2 * scale - px) / 2;
    c.fillStyle = "#ff8ab8"; c.fillRect(x, cy, px, px); c.fillStyle = "#e8e0c8"; c.fillRect(x + (px - inner) / 2, cy + (px - inner) / 2, inner, inner); c.strokeStyle = "#eef2f8"; c.strokeRect(x, cy, px, px);
    T(c, `${s} cm`, x + px / 2, y0 + 3.2 * scale + 22, "#eef2f8", "center", "600 13px"); T(c, `SA : V = ${(6 / s).toFixed(1)} : 1`, x + px / 2, y0 + 3.2 * scale + 42, "#ffd166", "center", "12px"); T(c, agarDone(s, agarT) > 0.999 ? `all pink after ${agarTime(s).toFixed(1)} min` : `${Math.round(100 * agarDone(s, agarT))}% changed`, x + px / 2, y0 + 3.2 * scale + 62, "#aab6cc", "center", "11.5px"); x += px + 30; });
  T(c, `${agarT.toFixed(1)} minutes in acid`, 40, 40, "#eef2f8", "left", "600 15px"); T(c, "pink = acid has arrived (the cut faces of each cube are shown)", w - 20, 40, "#aab6cc", "right");
}
function drawPotato(c, w, h) {
  const n = potato.length, cw = (w - 60) / n, y0 = 90;
  potato.forEach((p, i) => { const ch = massChange(p.c, potT) + p.err * Math.min(1, potT / 24), x = 30 + i * cw + cw / 2, len = 70 * (1 + ch / 100), wid = 18 * (1 + ch / 200);
    c.fillStyle = "rgba(90,176,255,0.12)"; c.fillRect(x - cw / 2 + 6, y0, cw - 12, 150); c.fillStyle = ch >= 0 ? "#f0e0a0" : "#c9b070"; c.fillRect(x - wid / 2, y0 + 75 - len / 2, wid, len);
    T(c, p.c.toFixed(1), x, y0 + 172, "#eef2f8", "center", "600 12px"); T(c, (ch >= 0 ? "+" : "") + ch.toFixed(1) + "%", x, y0 + 192, ch >= 0 ? "#7fe3a0" : "#ff8a70", "center", "12px"); });
  T(c, "sucrose (mol/dm³)", 30, y0 + 214, "#aab6cc"); T(c, `${potT.toFixed(1)} hours`, 30, 40, "#eef2f8", "left", "600 15px");
  // a plant cell in the chosen solution: turgid, flaccid or plasmolysed
  const cx = w * 0.5, cy = h - 90, d = psiSucrose(P.conc) - PSI_TISSUE, shrink = K.clamp(-d / 1.2, 0, 0.45) * Math.min(1, potT / 6);
  c.strokeStyle = "#7fe3a0"; c.lineWidth = 4; c.strokeRect(cx - 70, cy - 40, 140, 80); c.fillStyle = "rgba(127,227,160,0.35)"; c.beginPath(); c.roundRect(cx - 66 + 66 * shrink, cy - 36 + 36 * shrink, 132 * (1 - shrink), 72 * (1 - shrink), 10); c.fill();
  T(c, `cell in ${P.conc} mol/dm³: ${d > 0.05 ? "turgid (water in)" : d < -0.05 ? (shrink > 0.2 ? "plasmolysed (water out)" : "flaccid (water out)") : "no net change"}`, cx, cy + 62, "#eef2f8", "center", "600 12px");
  if (ui.level === "adv") T(c, `ψ cell ${PSI_TISSUE} MPa · ψ solution ${psiSucrose(P.conc).toFixed(2)} MPa`, cx, cy - 52, "#ffd166", "center", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ box: drawBox, agar: drawAgar, potato: drawPotato })[P.mode](c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed;
  if (P.mode === "box") { const n = Math.max(1, Math.round(s / 0.02)); for (let k = 0; k < n; k++) box.step(s / n); if (!log.length || box.t - log[log.length - 1][0] > 0.2) { const [L, R] = box.count(); log.push([box.t, L, R, box.crossed]); if (log.length > 400) log.shift(); } }
  else if (P.mode === "agar") agarT = Math.min(agarTime(3) * 1.05, agarT + s * 2);
  else potT = Math.min(24, potT + s * 0.6);
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "box") {
    if (!log.length) return; const L = log, last = L[L.length - 1], prev = L.find(q => q[0] >= last[0] - 2) || L[0], rate = (last[3] - prev[3]) / Math.max(0.2, last[0] - prev[0]);
    chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "solute particles"; chA.opts.xFmt = null; chA.draw([{ pts: L.map(q => [q[0], q[1]]), color: "#ffd166", label: "left" }, { pts: L.map(q => [q[0], q[2]]), color: "#6fb1ff", label: "right" }], { yMin: 0 });
    const f = (P.nL - P.nR) * P.pores * Math.sqrt((P.T + 273) / 298) / P.thick, bars = [["gradient", Math.abs(P.nL - P.nR) / 300], ["area", P.pores], ["temperature", (P.T + 273) / 333], ["1 ÷ thickness", 1 / P.thick / 2]];
    chB.opts.xLabel = ""; chB.opts.yLabel = "relative size"; chB.opts.xFmt = whole(v => (bars[Math.round(v)] || [""])[0]); chB.draw([{ pts: bars.map((b, i) => [i, b[1]]), type: "bars", w: 0.6, color: "#7fe3a0", label: "your settings (rate ∝ their product)" }], { xMin: -0.6, xMax: 3.6, yMin: 0, yMax: 1.1 });
    read.set("a", last[1]); read.set("b", last[2]); read.set("c", last[3]); read.set("d", rate.toFixed(1) + " a second");
    ui.hud(`${{ diff: "Diffusion", osmo: "Osmosis", active: "Active transport", facil: "Facilitated diffusion" }[P.proc]}<br>${Math.abs(last[1] - last[2]) < 6 && P.proc !== "active" ? "about equal: no net movement" : last[3] >= 0 ? "net movement left → right" : "net movement right → left"}`);
  } else if (P.mode === "agar") {
    chA.opts.xLabel = "minutes"; chA.opts.yLabel = "changed (%)"; chA.opts.xFmt = null; const tm = agarTime(3) * 1.05; chA.draw([0.5, 1, 2, 3].map((s, i) => { const pts = []; for (let t = 0; t <= agarT; t += tm / 100) pts.push([t, 100 * agarDone(s, t)]); return { pts, color: K.col(i), label: s + " cm" }; }), { xMin: 0, xMax: tm, yMin: 0, yMax: 105 });
    chB.opts.xLabel = "side (cm)"; chB.opts.yLabel = "SA : V (per cm)"; chB.opts.xFmt = null; const sv = []; for (let s = 0.25; s <= 3; s += 0.05) sv.push([s, 6 / s]); chB.draw([{ pts: sv, color: "#ffd166", label: "6 ÷ side" }, { pts: [0.5, 1, 2, 3].map(s => [s, 6 / s]), type: "dots", color: "#fff", r: 5 }], { xMin: 0, xMax: 3.2, yMin: 0 });
    read.set("a", agarT.toFixed(1) + " min"); read.set("b", Math.round(100 * agarDone(0.5, agarT)) + "%"); read.set("c", Math.round(100 * agarDone(1, agarT)) + "%"); read.set("d", Math.round(100 * agarDone(3, agarT)) + "%");
    ui.hud("small cubes: big surface area for their volume");
  } else {
    const done = potato.map(p => [p.c, massChange(p.c, potT) + p.err * Math.min(1, potT / 24)]), fit = done.filter(q => q[0] >= 0.1 && q[0] <= 0.6), lf = K.linfit(fit), cross = -lf.c / lf.m;
    chA.opts.xLabel = "sucrose (mol/dm³)"; chA.opts.yLabel = "change in mass (%)"; chA.opts.xFmt = null; const th = []; for (let c2 = 0; c2 <= 1; c2 += 0.02) th.push([c2, massChange(c2, potT)]);
    chA.draw([{ pts: th, color: "#7d8aa5", dash: [5, 4], label: "model" }, { pts: done, type: "dots", color: "#ffd166", r: 5, label: "your cylinders" }], { xMin: 0, xMax: 1, hlines: [{ y: 0, color: "#7fe3a0" }], vlines: potT > 6 ? [{ x: cross, color: "#7fe3a0", label: `crosses zero ≈ ${cross.toFixed(2)}` }] : [] });
    chB.opts.xLabel = "hours"; chB.opts.yLabel = "change in mass (%)"; chB.opts.xFmt = null; const tc = []; for (let t = 0; t <= potT; t += 0.25) tc.push([t, massChange(P.conc, t)]); chB.draw([{ pts: tc, color: "#ffd166", label: P.conc + " mol/dm³" }], { xMin: 0, xMax: 24 });
    read.set("a", potT.toFixed(1)); read.set("b", P.conc + " mol/dm³"); read.set("c", psiSucrose(P.conc).toFixed(2) + " MPa"); read.set("d", massChange(P.conc, potT).toFixed(1) + "%");
    ui.hud(`water moves from high to low water potential<br>cells: ${PSI_TISSUE} MPa`);
  }
});
set({});
ui.tip("Particles move at random; they cross only where the membrane lets them · switch views at the top of the controls", 7000);
