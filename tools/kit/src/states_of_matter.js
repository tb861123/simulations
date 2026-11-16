/* =====================================================================
   STATES OF MATTER AND HEATING
   Particles in a SOLID vibrate about fixed places; in a LIQUID they
   touch but slide past each other; in a GAS they fly about freely.
   Heating a substance does one of two things:
     * raises its temperature (particles move faster):   Q = m c ΔT
     * changes its state at a fixed temperature (bonds are broken, the
       temperature stays the same until the change is complete): Q = m L
   So a heating curve has sloping parts (warming) and flat parts
   (melting at the melting point, boiling at the boiling point).
   With a heater of power P, the energy supplied is Q = P t.
   The model keeps track of the energy supplied and works out the
   temperature, and how much has melted or boiled, from it.
   A level: internal energy, specific latent heat and the method of
   mixtures (heat lost by a hot block = heat gained by cold water).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// c in J/(kg K) for solid, liquid, gas; L in J/kg; temperatures in °C; lo / hi: the temperature range shown
const SUB = {
  water: { name: "water", cs: 2100, cl: 4200, cg: 2010, Lf: 334000, Lv: 2260000, Tm: 0, Tb: 100, lo: -50, hi: 200, col: "#6fb1ff", names: ["ice", "water", "steam"] },
  ethanol: { name: "ethanol", cs: 970, cl: 2440, cg: 1420, Lf: 108000, Lv: 855000, Tm: -114, Tb: 78, lo: -150, hi: 150, col: "#c9a0ff", names: ["solid ethanol", "liquid ethanol", "ethanol vapour"] },
  lead: { name: "lead", cs: 128, cl: 142, cg: 104, Lf: 24700, Lv: 858000, Tm: 327, Tb: 1749, lo: 20, hi: 600, col: "#9fa6b2", names: ["solid lead", "molten lead", "lead vapour"] },
  aluminium: { name: "aluminium", cs: 900, cl: 1180, cg: 900, Lf: 397000, Lv: 10.9e6, Tm: 660, Tb: 2470, lo: 20, hi: 720, col: "#cfd6de", names: ["solid aluminium", "molten aluminium", "aluminium vapour"] },
  iron: { name: "iron", cs: 450, cl: 820, cg: 450, Lf: 247000, Lv: 6.09e6, Tm: 1538, Tb: 2862, lo: 20, hi: 1700, col: "#c9a27a", names: ["solid iron", "molten iron", "iron vapour"] }
};
const LOSS = { perfect: ["perfectly insulated", 0], lagged: ["lagged (0.5 W/K)", 0.5], open: ["open beaker (2 W/K)", 2], poor: ["very poor (8 W/K)", 8] };
const ROOM = 20;
// the energy needed (J) to reach each stage boundary, starting from a solid at the lowest temperature shown
function stages(s, m) {
  const hiSolid = Math.min(s.Tm, s.hi), H1 = m * s.cs * (hiSolid - s.lo), H2 = H1 + (s.Tm <= s.hi ? m * s.Lf : 0), H3 = H2 + m * s.cl * Math.max(0, Math.min(s.Tb, s.hi) - s.Tm);
  const H4 = H3 + (s.Tb <= s.hi ? m * s.Lv : 0), H5 = H4 + m * s.cg * Math.max(0, s.hi - s.Tb);
  return [H1, H2, H3, H4, H5];
}
// from the energy H: temperature, fraction molten, fraction boiled, and the stage (0 solid, 1 melting, 2 liquid, 3 boiling, 4 gas)
function state(s, m, H) {
  const [H1, H2, H3, H4, H5] = stages(s, m); H = Math.max(0, Math.min(H5, H));
  if (H < H1) return { T: s.lo + H / (m * s.cs), fm: 0, fb: 0, st: 0 };
  if (H < H2) return { T: s.Tm, fm: (H - H1) / (H2 - H1), fb: 0, st: 1 };
  if (H < H3) return { T: s.Tm + (H - H2) / (m * s.cl), fm: 1, fb: 0, st: 2 };
  if (H < H4) return { T: s.Tb, fm: 1, fb: (H - H3) / (H4 - H3), st: 3 };
  return { T: s.Tb + (H - H4) / (m * s.cg), fm: 1, fb: 1, st: 4 };
}
// the energy H for a temperature (half changed at exactly the melting or boiling point)
function energyAt(s, m, T) {
  const [H1, H2, H3, H4] = stages(s, m);
  if (T < s.Tm) return m * s.cs * (T - s.lo); if (T === s.Tm) return (H1 + H2) / 2;
  if (T < s.Tb) return H2 + m * s.cl * (T - s.Tm); if (T === s.Tb) return (H3 + H4) / 2; return H4 + m * s.cg * (T - s.Tb);
}
// heating with heat lost to (or gained from) a room at 20 °C: dH/dt = P − k(T − 20). Steps of dt seconds
function heatFor(s, m, H, P, k, secs, dt = 0.5) { for (let t = 0; t < secs; t += dt) H += (P - k * (state(s, m, H).T - ROOM)) * dt; return H; }
function timeTo(s, m, H, P, k, target, cap = 20000) { let t = 0; while (t < cap) { H += (P - k * (state(s, m, H).T - ROOM)) * 0.5; t += 0.5; if (target(H)) return t; } return NaN; }
// method of mixtures: a hot block into cold water (no heat lost to the surroundings)
const BLOCK = { copper: { name: "copper", c: 385 }, aluminium: { name: "aluminium", c: 900 }, iron: { name: "iron", c: 450 }, lead: { name: "lead", c: 128 } };
const mixT = o => (o.mb * BLOCK[o.b].c * o.Tb + o.mw * 4200 * o.Tw) / (o.mb * BLOCK[o.b].c + o.mw * 4200);

// ---------------- The page ----------------
const P = { view: "heat", sub: "water", m: 1, Pw: 2000, T0: -30, loss: "perfect", setT: false, b: "copper", mb: 0.2, Tb: 100, mw: 0.2, Tw: 20 };
let rnd = K.rng(Date.now() % 99991 + 5), speed = 1, H = 0, dir = 0, t = 0, path = [], parts = [], hits = 0, hitRate = 0, mixT0 = 0;
const ui = K.app({
  title: "States of Matter and Heating", subject: "Physics",
  blurb: "Particles in solids, liquids and gases; heating and cooling curves, specific heat capacity and latent heat",
  reset: () => set({ sub: P.sub, view: P.view }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) Section 5(c) Change of state: the arrangement and motion of particles in solids, liquids and gases; heating and changes of state; temperature–time graphs; specific heat capacity ΔQ = mcΔT and its practical. Also Edexcel International GCSE Chemistry (4CH1) Topic 1 (states of matter).", adv: "WJEC Eduqas A level Physics, thermal physics: internal energy, specific heat capacity, specific latent heat Q = mL, and the method of mixtures." } },
  missions: [
    { title: "Ice to steam", q: "Heat 1 kg of ice from −30 °C to steam. Sketch the heating curve. What are the two flat parts, and why is the temperature constant there?", hint: "Flat part 1: melting at 0 °C. Flat part 2: boiling at 100 °C. While a substance changes state, the energy supplied breaks the bonds between particles instead of making them move faster, so the temperature stays the same until the change is complete.", setup() { set({ sub: "water", T0: -30 }); dir = 1; } },
    { title: "Why is boiling so long?", q: "In the ice-to-steam run, compare the time spent melting with the time spent boiling. Why is boiling about 7 times longer?", hint: "The specific latent heat of vaporisation (2 260 000 J/kg) is about 7 times the latent heat of fusion (334 000 J/kg). Melting only loosens the particles; boiling must pull them completely apart, against all their attractions.", setup() { set({ sub: "water", T0: -30 }); dir = 1; } },
    { title: "Particles in each state", q: "Set the temperature to −30 °C, 45 °C and 160 °C. Describe the arrangement and motion of the particles in each state.", hint: "Solid: regular arrangement, touching, vibrating about fixed positions. Liquid: random arrangement, touching, sliding past each other. Gas: random, far apart, moving fast in all directions and hitting the walls (that is gas pressure). Higher temperature: faster particles.", setup() { set({ sub: "water", setT: true, T0: -30 }); } },
    { title: "A cooling curve", q: "Start with steam at 160 °C and press Cool. Where does the temperature stay constant, and what is happening to the particles there?", hint: "At 100 °C the steam condenses and at 0 °C the water freezes. While a substance condenses or freezes, it gives out latent heat as bonds form, so the temperature stays constant even though energy is being removed.", setup() { set({ sub: "water", T0: 160 }); dir = -1; } },
    { title: "Specific heat capacity practical", q: "Heat a 1 kg aluminium block with a 50 W heater for 10 minutes. Use c = Q ÷ (mΔT) with Q = Pt. How close is your answer to 900 J/(kg K)?", hint: "Q = 50 W × 600 s = 30 000 J; ΔT ≈ 33 °C; c = 30 000 ÷ (1 × 33) ≈ 900 J/(kg K). In a real experiment some energy is lost to the surroundings, so ΔT is smaller and c comes out too large: insulate the block (and check the Batch run).", setup() { set({ sub: "aluminium", m: 1, Pw: 50, T0: 20 }); dir = 1; } },
    { title: "Poor insulation", q: "Heat 1 kg of water with 500 W in a very poorly insulated container. Does it ever boil?", hint: "Heat lost = 8 W/K × (T − 20). It levels off when the loss equals the 500 W supplied: 8(T − 20) = 500, T ≈ 82 °C. It never boils. Insulation matters.", setup() { set({ sub: "water", Pw: 500, T0: 20, loss: "poor" }); dir = 1; } },
    { title: "Lead heats up fast", q: "Heat 1 kg of lead and 1 kg of water with the same heater. Which warms faster? Why?", hint: "Lead's specific heat capacity (128 J/(kg K)) is about 33 times smaller than water's (4200), so the same energy raises its temperature 33 times more. Water's high c is why it is used in central heating and why the sea warms and cools slowly.", setup() { set({ sub: "lead", T0: 20, Pw: 2000 }); dir = 1; } },
    { lvl: "adv", title: "Specific latent heat", q: "How much energy is needed to turn 1 kg of water at 100 °C into steam? How long does a 2 kW kettle take?", hint: "Q = mL = 1 × 2.26 × 10⁶ = 2.26 MJ; t = Q ÷ P = 1130 s, about 19 minutes. (Heating it from 20 °C to 100 °C takes only 336 kJ, under 3 minutes.)", setup() { set({ sub: "water", T0: 95 }); dir = 1; } },
    { lvl: "adv", title: "Method of mixtures", q: "Drop 0.2 kg of copper at 100 °C into 0.2 kg of water at 20 °C. Predict the final temperature, then check. Where does the energy go?", hint: "Heat lost by the copper = heat gained by the water: 0.2 × 385 × (100 − T) = 0.2 × 4200 × (T − 20), so T = 26.7 °C. The internal energy of the copper falls and that of the water rises by the same amount (if no energy is lost).", setup() { set({ view: "mix" }); } }
  ],
  batch: [
    { title: "Measuring c of water: what do heat losses do?", question: "How does heat lost to the room change the measured specific heat capacity of water?", how: "0.25 kg of water from 20 °C, 50 W for 10 minutes; c = Pt ÷ (mΔT). Thermometer error ±0.3 °C, timing ±0.5 s. Heat loss from 0 to 2 W/K.", xLabel: "heat loss to the room (W/K)", yLabel: "c measured (J per kg per K)", xs: [0, 0.25, 0.5, 1, 1.5, 2], reps: 6, theory: () => 4200, theoryLabel: "true c", run: (x, r) => { const s = SUB.water, m = 0.25, Ht = heatFor(s, m, energyAt(s, m, 20), 50, x, 600 + 0.5 * r.gauss()), dT = state(s, m, Ht).T - 20 + 0.3 * r.gauss() - 0.3 * r.gauss(); return 50 * 600 / (m * dT); }, note: "With no losses the answer scatters around 4200. As losses grow the water warms less, so ΔT is too small and c comes out too big. Insulating the beaker reduces this systematic error." },
    { title: "How precise is one measurement of c?", question: "200 students each measure c of water once (no heat losses). How much do their answers vary?", how: "0.25 kg, 50 W, 10 minutes; thermometer ±0.3 °C on both readings, timing ±0.5 s.", yLabel: "c measured (J per kg per K)", reps: 200, bins: 24, theory: 4200, theoryLabel: "true c", run: (x, r) => { const s = SUB.water, m = 0.25, Ht = heatFor(s, m, energyAt(s, m, 20), 50, 0, 600), dT = state(s, m, Ht).T - 20 + 0.3 * r.gauss() - 0.3 * r.gauss(); return 50 * (600 + 0.5 * r.gauss()) / (m * dT); }, note: "Random errors spread the answers by about ±1.5% around the true value. Averaging repeats (or using a bigger temperature rise) reduces the spread." },
    { title: "Does doubling the mass double the time to boil?", question: "Time to bring water from 20 °C to the boil with a 2 kW kettle, for different masses.", how: "No heat loss. Theory: t = mcΔT ÷ P = m × 4200 × 80 ÷ 2000 = 168 s per kg. Stopwatch ±0.5 s.", xLabel: "mass of water (kg)", yLabel: "time to reach 100 °C (s)", xs: [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2], reps: 4, fit: true, theory: m => m * 168, theoryLabel: "mcΔT ÷ P", run: (x, r) => timeTo(SUB.water, x, energyAt(SUB.water, x, 20), 2000, 0, Hh => state(SUB.water, x, Hh).T >= 100) + 0.5 * r.gauss(), note: "A straight line through the origin: time ∝ mass. The gradient (168 s per kg) is c × ΔT ÷ P." },
    { title: "Time to boil against heater power", question: "How long does 1 kg of water take to reach 100 °C with different heaters, when it loses 1 W/K to the room?", how: "From 20 °C; heater 300 W to 3 kW. Theory (no loss): t = 336 000 ÷ P.", xLabel: "heater power (W)", yLabel: "time to reach 100 °C (s)", xs: [300, 500, 750, 1000, 1500, 2000, 3000], reps: 3, theory: p => 336000 / p, theoryLabel: "no heat loss", run: (x, r) => timeTo(SUB.water, 1, energyAt(SUB.water, 1, 20), x, 1, Hh => state(SUB.water, 1, Hh).T >= 100) + 0.5 * r.gauss(), note: "Doubling the power halves the time (t ∝ 1/P) for powerful heaters. Weak heaters take longer than the theory, because a bigger share of their power leaks away while they work." },
    { title: "Measuring the latent heat of fusion of ice", question: "How does heat from the room change the measured latent heat of fusion?", how: "0.2 kg of ice at 0 °C, 100 W heater; L = Pt ÷ m, where t is the time to melt. The room (20 °C) adds k × 20 W. Timing ±1 s.", xLabel: "heat gained from the room (W/K)", yLabel: "L measured (J/kg)", xs: [0, 0.5, 1, 1.5, 2], reps: 5, theory: () => 334000, theoryLabel: "true L", run: (x, r) => { const s = SUB.water, m = 0.2, H0 = stages(s, m)[0]; const tm = timeTo(s, m, H0, 100, x, Hh => state(s, m, Hh).fm >= 1); return 100 * (tm + r.gauss()) / m; }, note: "Energy leaking in from the room helps melt the ice, so it melts sooner and L comes out too small. The usual fix: run a control funnel with no heater and subtract the ice it melts." },
    { title: "Method of mixtures (copper into water)", question: "200 students drop 0.2 kg of copper at 100 °C into 0.2 kg of water at 20 °C. What final temperature do they measure?", how: "The block cools by 1 to 5 °C while it is carried to the beaker; thermometer ±0.3 °C. Theory: the ideal result with no losses.", yLabel: "final temperature (°C)", reps: 200, bins: 20, theory: mixT({ b: "copper", mb: 0.2, Tb: 100, mw: 0.2, Tw: 20 }), theoryLabel: "ideal", run: (x, r) => mixT({ b: "copper", mb: 0.2, Tb: 100 - 1 - 4 * r(), mw: 0.2, Tw: 20 }) + 0.3 * r.gauss(), note: "The mean is a little below the ideal value: a systematic error, because the block always loses some heat on the way. Random errors alone would scatter evenly around the ideal." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 5(c)", text: "Solid: particles close together in a regular arrangement, vibrating about fixed positions. Liquid: close together, random arrangement, moving past each other. Gas: far apart, random, moving fast in all directions." },
      { lvl: "std", tag: "4PH1 5(c)", text: "Melting, boiling, condensing, freezing happen at a constant temperature: energy goes into breaking (or is released by forming) bonds between particles, not into changing their speed." },
      { lvl: "std", tag: "4PH1 5(c)", text: "Specific heat capacity: the energy needed to raise the temperature of 1 kg by 1 °C. ΔQ = m × c × ΔT." },
      { lvl: "std", tag: "4PH1 5(c)", text: "Practical: heat a known mass with an electric heater (energy = power × time, or from a joulemeter), measure ΔT, c = ΔQ ÷ (mΔT). Insulate to reduce heat loss, which makes c too large." },
      { lvl: "std", tag: "4CH1 1", text: "Evaporation happens at the surface at any temperature; boiling happens throughout the liquid, at the boiling point." },
      { lvl: "adv", tag: "Eduqas thermal", text: "Specific latent heat: energy to change the state of 1 kg without changing its temperature. Q = mL (L_f for melting, L_v for boiling)." },
      { lvl: "adv", tag: "Eduqas thermal", text: "Internal energy = the sum of the kinetic and potential energies of the particles. Heating at a change of state raises the potential energy; heating otherwise raises the kinetic energy (temperature)." },
      { lvl: "adv", tag: "Eduqas thermal", text: "Method of mixtures: with no losses, energy lost by the hot object = energy gained by the cold one: m₁c₁(T₁ − T) = m₂c₂(T − T₂)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `Calculate the energy needed to heat ${P.m} kg of ${SUB[P.sub].names[1]} by 10 °C (c = ${SUB[P.sub].cl} J/(kg K)).`, ans: () => `<ul><li>ΔQ = mcΔT</li><li>= ${P.m} × ${SUB[P.sub].cl} × 10</li><li>= ${(P.m * SUB[P.sub].cl * 10).toLocaleString()} J</li></ul>` },
      { lvl: "std", marks: 3, q: "A 50 W heater warms a 1 kg aluminium block by 32 °C in 10 minutes. Calculate c, and explain why it is larger than the accepted 900 J/(kg K).", ans: "<ul><li>Q = Pt = 50 × 600 = 30 000 J</li><li>c = 30 000 ÷ (1 × 32) = 940 J/(kg K)</li><li>some energy was lost to the surroundings, so ΔT was smaller than it should be</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why the temperature of melting ice stays at 0 °C while it is heated.", ans: "<ul><li>the energy is used to break the bonds between particles (change of state)</li><li>not to increase their kinetic energy, so the temperature does not rise</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe the arrangement and motion of particles in a solid, a liquid and a gas.", ans: "<ul><li>solid: regular, close, vibrate about fixed positions</li><li>liquid: random, close, move past each other</li><li>gas: random, far apart, move quickly in all directions</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const s = SUB[P.sub]; return `Calculate the energy needed to melt ${P.m} kg of ${s.names[0]} at its melting point and the time a ${P.Pw} W heater would take (L_f = ${s.Lf.toLocaleString()} J/kg).`; }, ans: () => { const s = SUB[P.sub], Q = P.m * s.Lf; return `<ul><li>Q = mL = ${P.m} × ${s.Lf.toLocaleString()} = ${Q.toLocaleString()} J</li><li>t = Q ÷ P = ${K.sig(Q / P.Pw, 3)} s</li></ul>`; } },
      { lvl: "adv", marks: 3, q: () => `A ${P.mb} kg ${BLOCK[P.b].name} block at ${P.Tb} °C is put into ${P.mw} kg of water at ${P.Tw} °C. Find the final temperature (c = ${BLOCK[P.b].c} and 4200 J/(kg K)).`, ans: () => `<ul><li>${P.mb} × ${BLOCK[P.b].c} × (${P.Tb} − T) = ${P.mw} × 4200 × (T − ${P.Tw})</li><li>T = ${mixT(P).toFixed(1)} °C</li><li>assuming no energy is lost to the surroundings</li></ul>` }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>The energy supplied is tracked. The heating curve is built from Q = mcΔT for each state (each with its own c) and Q = mL for each change of state, so the temperature and the fraction melted or boiled follow from the energy. At exactly the melting or boiling point (when you set the temperature) the substance is half changed.</li>
<li>Heater mode: energy changes at the heater's power (removed at the same rate when cooling) minus a loss k(T − 20 °C) to a room at 20 °C. At 1× speed, one minute of heating passes each second.</li>
<li>Particles: about 90, coloured by speed (blue slow, red fast); speed ∝ √(kelvin temperature). Melting starts at the surface; boiling bubbles appear throughout. "Wall hits per second" counts gas particles hitting the walls: that is gas pressure.</li>
<li>Method of mixtures: m₁c₁(T₁ − T) = m₂c₂(T − T₂), with the two temperatures approaching T exponentially.</li></ul>
<h3>Simplifications</h3>
<ul><li>Two dimensions and far fewer particles than real; gas particles would really be about 10 times further apart; gas particles do not collide with each other.</li>
<li>c does not change with temperature; pressure is always 1 atmosphere; the sample is all at one temperature; the container takes no heat.</li>
<li>Metals are heated only a little past their melting points (aluminium to 720 °C, iron to 1700 °C).</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/states-of-matter.html">original/states-of-matter.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "heat", options: [["heat", "🔥 Heating and cooling"], ["mix", "🥤 Method of mixtures"]], on: v => set({ view: v, sub: P.sub }) });
grp.heat = g = ui.group("Substance");
ctl.sub = K.seg(g, { value: "water", options: Object.keys(SUB).map(k => [k, SUB[k].name]), on: v => set({ sub: v }) });
ctl.setT = K.seg(g, { label: "What controls it?", value: false, options: [[false, "Heater (energy)"], [true, "Set the temperature"]], on: v => { P.setT = v; showCtl(); if (v) ctl.T.set(state(SUB[P.sub], P.m, H).T); } });
ctl.T = K.slider(g, { label: "Temperature", min: -50, max: 200, step: 1, value: 20, unit: "°C", on: v => { H = energyAt(SUB[P.sub], P.m, v); } });
ctl.m = K.slider(g, { label: "Mass", min: 0.1, max: 5, step: 0.1, value: 1, unit: "kg", on: v => { const T = state(SUB[P.sub], P.m, H); P.m = v; H = energyAt(SUB[P.sub], v, T.T); } });
ctl.Pw = K.slider(g, { label: "Heater power", min: 50, max: 5000, step: 50, value: 2000, unit: "W", on: v => P.Pw = v });
ctl.T0 = K.slider(g, { label: "Starting temperature", min: -50, max: 200, step: 1, value: -30, unit: "°C", on: v => { P.T0 = v; restart(); } });
ctl.loss = K.seg(g, { label: "Insulation", value: "perfect", options: Object.keys(LOSS).map(k => [k, LOSS[k][0]]), on: v => P.loss = v });
let r1 = K.row(g); ctl.heat = K.btn(r1, "🔥 Heat", () => { dir = dir === 1 ? 0 : 1; }, "primary"); ctl.cool = K.btn(r1, "❄ Cool", () => { dir = dir === -1 ? 0 : -1; }); K.btn(r1, "↺ Start again", () => restart());
grp.mix = g = ui.group("Hot block into cold water");
ctl.b = K.seg(g, { label: "Block", value: "copper", options: Object.keys(BLOCK).map(k => [k, BLOCK[k].name]), on: v => { P.b = v; mixStart(); } });
ctl.mb = K.slider(g, { label: "Mass of block", min: 0.05, max: 1, step: 0.05, value: 0.2, unit: "kg", on: v => { P.mb = v; mixStart(); } });
ctl.Tb = K.slider(g, { label: "Block temperature", min: 40, max: 300, step: 5, value: 100, unit: "°C", on: v => { P.Tb = v; mixStart(); } });
ctl.mw = K.slider(g, { label: "Mass of water", min: 0.05, max: 1, step: 0.05, value: 0.2, unit: "kg", on: v => { P.mw = v; mixStart(); } });
ctl.Tw = K.slider(g, { label: "Water temperature", min: 0, max: 40, step: 1, value: 20, unit: "°C", on: v => { P.Tw = v; mixStart(); } });
K.btn(K.row(g), "▶ Drop it in again", () => mixStart(), "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 10, step: 0.5, value: 1, fmt: v => v + "× (" + K.sig(v, 2) + " min per s)", on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { for (const k of ["m", "Pw", "T0"]) ctl[k].el.style.display = P.setT ? "none" : ""; ctl.loss.el.style.display = P.setT ? "none" : ""; ctl.heat.parentNode.style.display = P.setT ? "none" : ""; ctl.T.el.style.display = P.setT ? "" : "none"; }
function restart() { const s = SUB[P.sub]; H = energyAt(s, P.m, Math.max(s.lo, Math.min(s.hi, P.T0))); t = 0; dir = 0; path = [[0, state(s, P.m, H).T, 0]]; }
function mixStart() { mixT0 = 0; }
function set(o) {
  Object.assign(P, { view: "heat", m: 1, Pw: 2000, loss: "perfect", setT: false }, o);
  const s = SUB[P.sub]; if (o.T0 === undefined) P.T0 = s === SUB.water ? -30 : s.lo; P.T0 = Math.max(s.lo, Math.min(s.hi, P.T0));
  ctl.view.set(P.view); ctl.sub.set(P.sub); ctl.setT.set(P.setT); ctl.m.set(P.m); ctl.Pw.set(P.Pw); ctl.loss.set(P.loss);
  ctl.T0.el.querySelector("input").min = s.lo; ctl.T0.el.querySelector("input").max = s.hi; ctl.T0.set(P.T0);
  ctl.T.el.querySelector("input").min = s.lo; ctl.T.el.querySelector("input").max = s.hi;
  for (const k of ["b", "mb", "Tb", "mw", "Tw"]) ctl[k].set(P[k]);
  grp.heat.style.display = P.view === "heat" ? "" : "none"; grp.mix.style.display = P.view === "mix" ? "" : "none"; showCtl();
  restart(); if (P.setT) ctl.T.set(P.T0); makeParts(); mixStart();
  relabel(P.view === "heat" ? ["temperature", "state", "energy supplied", "time", "particle speed (vs 20 °C)"] : ["final temperature (theory)", "block now", "water now", "energy lost by block", "energy gained by water"]);
}

// ---------------- Particles ----------------
// N particles; each has a lattice site (used when solid). Phase 0 solid, 1 liquid, 2 gas
const N = 90, COLS = 15;
function makeParts() { parts = []; for (let i = 0; i < N; i++) parts.push({ i, ph: 0, x: 0, y: 0, vx: 0, vy: 0, sx: i % COLS, sy: Math.floor(i / COLS) }); }
// set how many particles are in each phase: melting takes the highest solid particles first, boiling the highest liquid ones
function settlePhases(fm, fb) {
  const nL = Math.round(N * fm * (1 - fb)), nG = Math.round(N * fm * fb), nS = N - nL - nG;
  const wantPh = p => p.rank < nS ? 0 : p.rank < nS + nL ? 1 : 2;
  parts.forEach(p => p.rank = p.sy * COLS + (p.sy % 2 ? COLS - 1 - p.sx : p.sx));
  for (const p of parts) { const w = wantPh(p); if (w !== p.ph) { if (w === 2) { p.vx = (Math.random() - 0.5) * 2; p.vy = -Math.random() * 2; } p.ph = w; } }
}
function stepParts(dt, T, box) {
  const v0 = Math.sqrt((T + 273) / 293), r = box.r;
  let nS = 0, nL = 0; for (const p of parts) { if (p.ph === 0) nS++; else if (p.ph === 1) nL++; }
  const rowsSolid = Math.ceil(nS / COLS), liqTop = box.y1 - (rowsSolid + Math.ceil(nL / COLS) + 0.6) * 2 * r;
  for (const p of parts) {
    if (p.ph === 0) { const hx = box.x0 + (p.sx + 0.5 + (p.sy % 2 ? 0.25 : -0.25)) * (box.x1 - box.x0) / COLS, hy = box.y1 - (p.sy + 0.5) * 2 * r * 0.95; const a = r * 0.18 * v0; p.x = hx + a * Math.sin(performance.now() / 70 + p.i * 2.1); p.y = hy + a * Math.cos(performance.now() / 83 + p.i * 1.3); }
    else if (p.ph === 1) {
      p.vx += (Math.random() - 0.5) * 60 * v0 * dt; p.vy += (Math.random() - 0.5) * 60 * v0 * dt + 30 * dt; p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx * dt * 60 * 0.3; p.y += p.vy * dt * 60 * 0.3;
      p.x = Math.max(box.x0 + r, Math.min(box.x1 - r, p.x)); p.y = Math.max(liqTop + r, Math.min(box.y1 - r - rowsSolid * 2 * r * 0.95, p.y));
    } else {
      const sp = 260 * v0; const vv = Math.hypot(p.vx, p.vy) || 1; p.vx = p.vx / vv * sp; p.vy = p.vy / vv * sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < box.x0 + r) { p.x = box.x0 + r; p.vx = Math.abs(p.vx); hits++; } if (p.x > box.x1 - r) { p.x = box.x1 - r; p.vx = -Math.abs(p.vx); hits++; }
      if (p.y < box.y0 + r) { p.y = box.y0 + r; p.vy = Math.abs(p.vy); hits++; } const floor = Math.min(box.y1, liqTop) - r; if (p.y > floor) { p.y = floor; p.vy = -Math.abs(p.vy); }
    }
  }
  // liquid particles push apart so they stay touching but do not overlap
  const L = parts.filter(p => p.ph === 1);
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) { const dx = L[b].x - L[a].x, dy = L[b].y - L[a].y, d = Math.hypot(dx, dy); if (d < 2 * r && d > 0) { const k = (2 * r - d) / d * 0.5; L[a].x -= dx * k; L[a].y -= dy * k; L[b].x += dx * k; L[b].y += dy * k; } }
}
function initPos(box) { for (const p of parts) { p.x = box.x0 + (p.sx + 0.5) * (box.x1 - box.x0) / COLS; p.y = box.y1 - (p.sy + 0.5) * 2 * box.r; p.vx = Math.random() - 0.5; p.vy = Math.random() - 0.5; } }

// ---------------- Drawing ----------------
let box = null;
const cv = ui.canvas(() => { box = null; });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const speedCol = v => { const u = Math.max(0, Math.min(1, (v - 0.6) / 1.4)); return `rgb(${Math.round(80 + 175 * u)},${Math.round(160 + 60 * (1 - Math.abs(u - 0.5) * 2) - 40 * u)},${Math.round(255 - 205 * u)})`; };
function drawHeat(c, w, h) {
  const s = SUB[P.sub], st = state(s, P.m, H), bw = Math.min(420, w * 0.45), bh = Math.min(360, h - 120);
  if (!box) { const r = bw / COLS / 2; box = { x0: w * 0.08, x1: w * 0.08 + bw, y0: h - 40 - bh, y1: h - 40, r }; initPos(box); }
  c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.strokeRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  if (!P.setT && dir) { c.fillStyle = dir > 0 ? "rgba(255,120,60,0.6)" : "rgba(110,170,255,0.6)"; for (let i = 0; i < 6; i++) c.fillRect(box.x0 + 10 + i * (box.x1 - box.x0 - 20) / 6, box.y1 + 6, (box.x1 - box.x0) / 9, 8); TX(c, dir > 0 ? "heater on" : "cooling", (box.x0 + box.x1) / 2, box.y1 + 30, dir > 0 ? "#ff8a70" : "#6fb1ff", "center", "600 12px"); }
  const v0 = Math.sqrt((st.T + 273) / 293);
  for (const p of parts) { c.fillStyle = speedCol(v0 * (p.ph === 2 ? 1.15 : 1)); c.beginPath(); c.arc(p.x, p.y, box.r * 0.9, 0, 6.3); c.fill(); }
  if (P.setT === false && st.st === 3) { c.strokeStyle = "rgba(255,255,255,0.5)"; for (let i = 0; i < 6; i++) { const bx = box.x0 + ((performance.now() / 9 + i * 97) % (box.x1 - box.x0)), by = box.y1 - ((performance.now() / 4 + i * 61) % 80); c.beginPath(); c.arc(bx, by, 4, 0, 6.3); c.stroke(); } }
  // solid bonds
  c.strokeStyle = "rgba(255,255,255,0.15)"; c.lineWidth = 1; const S = parts.filter(p => p.ph === 0);
  for (const p of S) for (const q of S) if (q.i > p.i && Math.hypot(q.x - p.x, q.y - p.y) < 2.4 * box.r) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  // thermometer
  const tx = box.x1 + 50, ty0 = box.y0 + 10, ty1 = box.y1 - 10, f = (st.T - s.lo) / (s.hi - s.lo);
  c.fillStyle = "#222b40"; c.fillRect(tx - 6, ty0, 12, ty1 - ty0); c.fillStyle = "#ff5d6c"; c.fillRect(tx - 4, ty1 - f * (ty1 - ty0), 8, f * (ty1 - ty0)); c.beginPath(); c.arc(tx, ty1 + 8, 10, 0, 6.3); c.fill();
  for (const [T, lab] of [[s.Tm, "melts"], [s.Tb, "boils"]]) if (T >= s.lo && T <= s.hi) { const y = ty1 - (T - s.lo) / (s.hi - s.lo) * (ty1 - ty0); c.fillStyle = "#aab6cc"; c.fillRect(tx + 8, y, 10, 1); TX(c, `${T} °C ${lab}`, tx + 22, y + 4, "#aab6cc", "left", "11px"); }
  TX(c, `${st.T.toFixed(1)} °C`, tx, ty0 - 10, "#ff8a70", "center", "600 14px");
  const words = ["solid", "melting", "liquid", "boiling", "gas"][st.st], x = box.x1 + 150; let y = box.y0 + 60;
  const L = (q, col = "#eef2f8", fnt = "13px") => { TX(c, q, x, y, col, "left", fnt); y += 22; };
  L(`${P.m} kg of ${s.names[Math.min(2, Math.floor((st.st + 1) / 2))]}`, "#eef2f8", "600 15px"); L(words === "melting" ? `melting: ${(st.fm * 100).toFixed(0)}% molten` : words === "boiling" ? `boiling: ${(st.fb * 100).toFixed(0)}% turned to gas` : words, "#ffd166", "600 13px");
  for (const line of [["Particles vibrate about fixed", "positions in a regular pattern."], ["Energy breaks bonds:", "the temperature stays the same."], ["Particles touch but", "slide past each other."], ["Energy pulls particles right apart:", "the temperature stays the same."], ["Particles fly about freely", "and hit the walls."]][st.st]) L(line, "#aab6cc", "12px");
  if (st.st >= 3) L(`wall hits per second: ${hitRate.toFixed(0)} (gas pressure)`, "#7fe3a0", "12px");
  L(`heat ${dir > 0 ? "in" : dir < 0 ? "out" : "–"}: ${P.setT ? "–" : (dir * P.Pw).toFixed(0) + " W"}, lost to the room: ${(LOSS[P.loss][1] * (st.T - ROOM)).toFixed(0)} W`, "#aab6cc", "12px");
}
function drawMix(c, w, h) {
  const Tf = mixT(P), k = 0.25, tt = mixT0, Tb = Tf + (P.Tb - Tf) * Math.exp(-k * tt), Tw = Tf + (P.Tw - Tf) * Math.exp(-k * tt);
  const bx = w * 0.32, by = h - 60, bw = 220, bh = 200;
  c.fillStyle = "rgba(111,177,255,0.28)"; c.fillRect(bx - bw / 2, by - bh * 0.75, bw, bh * 0.75); c.strokeStyle = "#c9d3e6"; c.lineWidth = 2; c.strokeRect(bx - bw / 2, by - bh, bw, bh);
  const hot = Math.max(0, Math.min(1, (Tb - 20) / 200)); c.fillStyle = `rgb(${180 + 75 * hot},${120 - 40 * hot},${80 - 40 * hot})`; const bs = 30 + 50 * Math.sqrt(P.mb); c.fillRect(bx - bs / 2, by - bs - 4, bs, bs);
  TX(c, `${BLOCK[P.b].name} ${Tb.toFixed(1)} °C`, bx, by - bs - 14, "#ff8a70", "center", "600 13px"); TX(c, `water ${Tw.toFixed(1)} °C`, bx, by - bh * 0.75 + 20, "#6fb1ff", "center", "600 13px");
  const x = w * 0.5; let y = 130; const L = (q, col = "#eef2f8", f = "13px") => { TX(c, q, x, y, col, "left", f); y += 24; };
  L("Energy lost by the block = energy gained by the water", "#eef2f8", "600 14px");
  L(`m₁c₁(T₁ − T) = m₂c₂(T − T₂)`, "#ffd166");
  L(`${P.mb} × ${BLOCK[P.b].c} × (${P.Tb} − T) = ${P.mw} × 4200 × (T − ${P.Tw})`, "#aab6cc");
  L(`T = ${Tf.toFixed(2)} °C`, "#7fe3a0", "600 15px");
  L("Assumes no energy is lost to the air or the beaker.", "#7d8aa5", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); (P.view === "heat" ? drawHeat : drawMix)(c, w, h); }

// ---------------- Charts ----------------
const stageCol = ["#6fb1ff", "#c9a0ff", "#7fe3a0", "#ffd166", "#ff8a70"];
function charts() {
  if (P.view === "mix") {
    const Tf = mixT(P), bp = [], wp = []; for (let tt = 0; tt <= 30; tt += 0.25) { bp.push([tt, Tf + (P.Tb - Tf) * Math.exp(-0.25 * tt)]); wp.push([tt, Tf + (P.Tw - Tf) * Math.exp(-0.25 * tt)]); }
    chA.opts.title = "Temperatures after dropping the block in"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "temperature (°C)"; chA.opts.xFmt = null;
    chA.draw([{ pts: bp.filter(p => p[0] <= mixT0), color: "#ff8a70", label: "block" }, { pts: wp.filter(p => p[0] <= mixT0), color: "#6fb1ff", label: "water" }], { xMin: 0, xMax: 30, yMin: 0, yMax: Math.max(P.Tb, 40) * 1.05, hlines: [{ y: Tf, color: "#7fe3a0", label: "final " + Tf.toFixed(1) + " °C" }] });
    const lost = P.mb * BLOCK[P.b].c * (P.Tb - Tf), gain = P.mw * 4200 * (Tf - P.Tw);
    chB.opts.title = "Energy transferred"; chB.opts.xLabel = ""; chB.opts.yLabel = "energy (J)"; chB.opts.xFmt = whole(v => ["lost by block", "gained by water"][Math.round(v)] || "");
    chB.draw([{ pts: [[0, lost], [1, gain]], type: "bars", w: 0.6, color: "#ffd166" }], { xMin: -0.6, xMax: 1.6, yMin: 0 });
    read.set("a", Tf.toFixed(2) + " °C"); const Tb = Tf + (P.Tb - Tf) * Math.exp(-0.25 * mixT0), Tw = Tf + (P.Tw - Tf) * Math.exp(-0.25 * mixT0); read.set("b", Tb.toFixed(1) + " °C"); read.set("c", Tw.toFixed(1) + " °C"); read.set("d", Math.round(lost).toLocaleString() + " J"); read.set("e", Math.round(gain).toLocaleString() + " J");
    ui.hud("Heat flows from hot to cold until both are at the same temperature"); return;
  }
  const s = SUB[P.sub], st = state(s, P.m, H), segs = [];
  let cur = null; for (const p of path) { if (!cur || cur.st !== p[2]) { cur = { st: p[2], pts: cur ? [cur.pts[cur.pts.length - 1]] : [] }; segs.push(cur); } cur.pts.push([p[0] / 60, p[1]]); }
  chA.opts.title = P.setT ? "Heating curve for this substance (temperature against energy)" : "Temperature against time"; chA.opts.xLabel = P.setT ? "energy supplied (kJ)" : "time (minutes)"; chA.opts.yLabel = "temperature (°C)"; chA.opts.xFmt = null;
  if (P.setT) { const pts = [], [, , , , H5] = stages(s, P.m); for (let i = 0; i <= 200; i++) pts.push([H5 * i / 200 / 1000, state(s, P.m, H5 * i / 200).T]); chA.draw([{ pts, color: "#6fb1ff", label: "heating curve" }, { pts: [[H / 1000, st.T]], type: "dots", r: 6, color: "#ffd166", label: "now" }], { yMin: s.lo, yMax: s.hi }); }
  else chA.draw(segs.map(q => ({ pts: q.pts, color: stageCol[q.st], width: 2.4 })), { xMin: 0, xMax: Math.max(1, t / 60 * 1.1), yMin: s.lo, yMax: s.hi, hlines: [{ y: s.Tm, color: "#56607a", label: "melting point" }].concat(s.Tb <= s.hi ? [{ y: s.Tb, color: "#56607a", label: "boiling point" }] : []) });
  const [H1, H2, H3, H4, H5] = stages(s, P.m), E = [H1, H2 - H1, H3 - H2, H4 - H3, H5 - H4].map(v => v / 1000);
  chB.opts.title = "Energy for each stage (from the lowest temperature)"; chB.opts.xLabel = ""; chB.opts.yLabel = "energy (kJ)"; chB.opts.xFmt = whole(v => ["warm solid", "melt mL", "warm liquid", "boil mL", "warm gas"][Math.round(v)] || "");
  chB.draw(E.map((e, i) => ({ pts: [[i, e]], type: "bars", w: 0.6, color: stageCol[i], alpha: i === st.st ? 1 : 0.45 })), { xMin: -0.6, xMax: 4.6, yMin: 0 });
  read.set("a", `${st.T.toFixed(1)} °C (${(st.T + 273).toFixed(0)} K)`); read.set("b", ["solid", `melting (${(st.fm * 100).toFixed(0)}%)`, "liquid", `boiling (${(st.fb * 100).toFixed(0)}%)`, "gas"][st.st]);
  read.set("c", K.sig((H - energyAt(s, P.m, Math.max(s.lo, Math.min(s.hi, P.T0)))) / 1000, 4) + " kJ"); read.set("d", (t / 60).toFixed(1) + " min"); read.set("e", `× ${Math.sqrt((st.T + 273) / 293).toFixed(2)} (KE × ${((st.T + 273) / 293).toFixed(2)})`);
  ui.hud(st.st === 1 || st.st === 3 ? "Changing state: the temperature stays constant while bonds break" : P.setT ? "Drag the temperature slider" : dir ? "Heating curve being drawn" : "Press 🔥 Heat or ❄ Cool");
}

// ---------------- The loop ----------------
let frame = 0, hitT = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.view === "mix") { mixT0 = Math.min(30, mixT0 + dt * speed * 2); return; }
  const s = SUB[P.sub];
  if (!P.setT && dir) { const secs = dt * 60 * speed, n = Math.ceil(secs / 2); for (let k = 0; k < n; k++) { const T = state(s, P.m, H).T; H += (dir * P.Pw - LOSS[P.loss][1] * (T - ROOM)) * secs / n; } t += secs; const [, , , , H5] = stages(s, P.m); if (H >= H5 || H <= 0) { H = Math.max(0, Math.min(H5, H)); dir = 0; } const st = state(s, P.m, H); path.push([t, st.T, st.st]); if (path.length > 4000) path = path.filter((_, i) => i % 2 === 0); }
  else if (!P.setT) { const T = state(s, P.m, H).T, loss = LOSS[P.loss][1] * (T - ROOM); if (loss) { H -= loss * dt * 60 * speed; t += dt * 60 * speed; path.push([t, state(s, P.m, H).T, state(s, P.m, H).st]); } }
  const st = state(s, P.m, H); settlePhases(st.fm, st.fb); if (box) stepParts(dt, st.T, box);
  hitT += dt; if (hitT > 1) { hitRate = hits / hitT; hits = 0; hitT = 0; }
}, () => {
  draw(); if (frame++ % 5) return; charts();
  if (ctl.heat) { ctl.heat.textContent = dir === 1 ? "⏸ Stop heating" : "🔥 Heat"; ctl.cool.textContent = dir === -1 ? "⏸ Stop cooling" : "❄ Cool"; }
});
set({ sub: "water", T0: -30 });
ui.tip("Press 🔥 Heat to turn ice into water and then steam, and watch the heating curve. Or switch to 'Set the temperature'.", 7000);
