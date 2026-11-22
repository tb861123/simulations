/* =====================================================================
   ELECTRIC CIRCUITS
   A current is a flow of charge: I = Q / t. A cell gives each coulomb of
   charge energy (its voltage, or EMF); the charge gives that energy up
   in the components it passes through. Three rules decide everything:

     * a component's resistance links voltage and current:  V = I R
       (for a lamp, a diode or a sensor, R itself changes)
     * in SERIES the same current flows through every component and the
       voltages add up to the supply voltage
     * in PARALLEL each branch has the full voltage and the currents add
       up to the current from the supply

   Each circuit is solved exactly from those rules (Kirchhoff's laws).
   The moving dots show charge flowing: faster where the current is
   bigger. Real electrons drift the other way, and very slowly.
   ===================================================================== */
const COMP = {
  resistor: { name: "fixed resistor" },
  lamp: { name: "filament lamp" },
  ldr: { name: "LDR (light-dependent resistor)" },
  therm: { name: "thermistor (NTC)" },
  diode: { name: "diode" }
};
const ENV = { R2: 20, lux: 200, temp: 20 };
// resistance of an LDR (falls in bright light) and an NTC thermistor (falls when hot): typical school components
const ldrR = lux => K.clamp(12000 * Math.pow(Math.max(lux, 0.1) / 1, -0.75), 10, 1e6);
const thermR = tC => 2000 * Math.exp(3600 * (1 / (tC + 273.15) - 1 / 298.15));
// the lamp gets hotter, so its resistance rises with current: about 4 Ω cold, 12 Ω at its rated 0.5 A
const lampR = I => 4 + 8 * Math.pow(Math.abs(I) / 0.5, 1.3);
// voltage across component x when current I flows through it
function vOf(x, I) {
  if (x === "resistor") return I * ENV.R2; if (x === "lamp") return I * lampR(I); if (x === "ldr") return I * ldrR(ENV.lux); if (x === "therm") return I * thermR(ENV.temp);
  if (x === "diode") return I > 0 ? 0.05 * Math.log(1 + I / 1e-8) : I * 1e7;      // conducts forwards above about 0.6 V; blocks backwards
}
// current through component x for a voltage V across it (solved by halving the interval: V rises steadily with I)
function iOf(x, V) { let lo = -1, hi = 20; if (V < 0 && x !== "diode") { return -iOf(x, -V); } if (V <= 0 && x === "diode") return V / 1e7; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (vOf(x, m) > V) hi = m; else lo = m; } return (lo + hi) / 2; }
/* SERIES: e.m.f. E, internal resistance r, fixed resistor R1 and component x in one loop. Find I with E = I(r + R1) + V_x(I). */
function series(E, r, R1, x) { let lo = 0, hi = E / Math.max(r + R1, 1e-6) + 1e-9; for (let k = 0; k < 60; k++) { const I = (lo + hi) / 2; if (I * (r + R1) + vOf(x, I) > E) hi = I; else lo = I; } const I = (lo + hi) / 2; return { I, V1: I * R1, Vx: vOf(x, I), Vt: E - I * r, Ix: I, I1: I }; }
/* PARALLEL: R1 and x side by side across the cell's terminals. Find the terminal voltage V with E − V = r (V/R1 + I_x(V)). */
function parallel(E, r, R1, x) { let lo = 0, hi = E; for (let k = 0; k < 60; k++) { const V = (lo + hi) / 2; if (E - V > r * (V / R1 + iOf(x, V))) lo = V; else hi = V; } const V = (lo + hi) / 2, I1 = V / R1, Ix = iOf(x, V); return { I: I1 + Ix, I1, Ix, V1: V, Vx: V, Vt: V }; }

// ---------------- The page ----------------
const P = { mode: "series", E: 6, r: 0, R1: 20, x: "lamp", Vsup: 3, load: 10, rInt: 0.5, eInt: 1.5 };
let speed = 1, dots = {}, ivlog = [], vtlog = [], sweep = null, rnd = K.rng(Date.now() % 99991 + 41);
const ui = K.app({
  title: "Electric Circuits", subject: "Physics",
  blurb: "Series and parallel, sensors, I–V curves and internal resistance, with the charge flowing",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) Section 2 Electricity: series and parallel circuits, V = IR, I–V characteristics, LDRs and thermistors, Q = It, E = QV, P = IV.", adv: "WJEC Eduqas A level Physics: resistance and D.C. circuits. Kirchhoff's laws, potential dividers, 1/R = 1/R₁ + 1/R₂, EMF and internal resistance, I–V characteristics." } },
  missions: [
    { title: "One loop: series", q: "A 20 Ω resistor and a lamp in series with a 6 V cell. Read the current at each ammeter position (the readings next to each component). Then read the voltage across each. What do you notice?", hint: "The current is the same everywhere in a series circuit: charge cannot pile up anywhere, so the same amount passes every point each second. The voltages across the components add up to the 6 V of the cell: each coulomb gives up all the energy it was given. The bigger resistance takes the bigger share of the voltage.", setup() { set({ mode: "series", x: "lamp" }); } },
    { title: "Two paths: parallel", q: "Switch to parallel. Now the resistor and lamp are side by side. Read the voltage across each and the current in each branch. How do they compare with the current from the cell?", hint: "Each branch gets the full voltage of the cell. The currents in the branches add up to the current from the cell (charge splits at a junction and rejoins). Adding another branch draws more current from the cell, so the total resistance of the circuit falls. This is how the circuits in a house are wired: every appliance gets the full mains voltage and can be switched on its own.", setup() { set({ mode: "parallel", x: "lamp" }); } },
    { title: "Is the lamp an ordinary resistor?", q: "Switch to the 'I–V characteristics' bench with the fixed resistor, and press 'Sweep the voltage'. What shape is the graph? Now try the filament lamp, then the diode.", hint: "Resistor: a straight line through the origin: current is proportional to voltage (Ohm's law), so its resistance is constant. Lamp: the line curves over: as the current rises the filament gets hotter, its atoms vibrate more and get in the way of the charges, so its resistance rises. Diode: almost no current backwards, and none forwards until about 0.6 V, then the current rises steeply. A diode lets current flow one way only.", setup() { set({ mode: "iv", x: "resistor" }); sweep = -6; } },
    { title: "A street light: the LDR", q: "An LDR in series with a fixed resistor. Slide the light level from dark to bright daylight. What happens to the LDR's resistance, the current, and the voltage across the LDR?", hint: "In bright light the LDR's resistance falls (from about 10 kΩ in the dark to a few hundred ohms), so more current flows and the LDR takes a smaller share of the voltage. The voltage across it is high in the dark and low in the light: that change can switch a street light on at dusk. This arrangement is a potential divider.", setup() { set({ mode: "series", x: "ldr", R1: 1000 }); } },
    { title: "A fire alarm: the thermistor", q: "A thermistor in series with a fixed resistor. Heat the thermistor from 0 °C to 100 °C. How does its resistance change? How could this switch on an alarm?", hint: "This NTC thermistor's resistance falls as it gets hotter, from several kilohms when cold to under 200 Ω at 100 °C. So the current rises and the voltage across the fixed resistor rises: when it passes a set value it can trigger an alarm or switch off a heater. Thermistors are used in thermostats, car engines and digital thermometers.", setup() { set({ mode: "series", x: "therm", R1: 1000 }); } },
    { title: "Why does a battery go flat?", q: "The 'EMF and internal resistance' bench: a 1.5 V cell with a small internal resistance. Lower the load resistance step by step, drawing more current. What happens to the voltage at the terminals? Where does the 'lost' energy go?", hint: "The terminal voltage falls as the current rises: V = ε − Ir. Some of each coulomb's energy is used up inside the cell itself, warming it. A cell that is being run hard gets warm and seems weaker. A car battery has a tiny internal resistance, so it can supply the hundreds of amps a starter motor needs.", setup() { set({ mode: "emf" }); } },
    { title: "Energy and power", q: "Back to the series circuit. Each component's power is shown. Calculate P = IV for the lamp and check. How much energy does it transfer in one minute?", hint: "Power = current × voltage. Energy = power × time, so in 60 s the lamp transfers P × 60 joules. Also, each coulomb passing through the lamp transfers energy equal to the voltage: E = QV. The cell's power is shared between the components.", setup() { set({ mode: "series", x: "lamp" }); } },
    { lvl: "adv", title: "Measuring EMF and internal resistance", q: "On the EMF bench, change the load and note the terminal voltage V and the current I several times (or press 'Sweep the load'). Plot V against I. What are the intercept and the gradient?", hint: "A straight line: V = ε − Ir. The intercept on the V axis is the EMF ε (the terminal voltage when no current flows), and the gradient is −r. This is the standard A level practical. The batch run does it with realistic meter errors.", setup() { set({ mode: "emf", rInt: 1.2, eInt: 1.5 }); } },
    { lvl: "adv", title: "The potential divider", q: "Series circuit with two fixed resistors (choose 'fixed resistor' as the second component). Set R₁ = 20 Ω and R₂ = 60 Ω with a 6 V cell. Predict the voltage across R₂ before reading it. Now replace R₂ with the LDR and find R₁ so the output is 3 V at 200 lux.", hint: "V_out = V_in × R₂ ÷ (R₁ + R₂) = 6 × 60 ÷ 80 = 4.5 V. Kirchhoff's second law: the e.m.f. equals the sum of the voltages round the loop. To get 3 V across the LDR, R₁ must equal the LDR's resistance at 200 lux, so the voltage is shared equally.", setup() { set({ mode: "series", x: "resistor", R1: 20 }); ENV.R2 = 60; ctl.R2.set(60); } }
  ],
  batch: [
    { title: "Ohm's law", question: "For a fixed resistor, how does the current depend on the voltage?", how: "Each run: a 20 Ω resistor; the voltmeter and ammeter each have a random error of 1% plus their last digit (0.01 V, 1 mA).", xLabel: "voltage (V)", yLabel: "current (A)", xs: [1, 2, 3, 4, 5, 6], reps: 5, yMin: 0, fit: true, theory: V => V / 20, theoryLabel: "I = V / 20 Ω", run(V, r) { ENV.R2 = 20; return Math.round((iOf("resistor", V) * (1 + 0.01 * r.gauss())) * 1000 + r.gauss() * 0.5) / 1000; }, note: "A straight line through the origin: the gradient is 1/R. If the resistor got warm its resistance would creep up and the line would curve, which is what happens in a lamp." },
    { title: "The filament lamp", question: "Is a filament lamp an ohmic conductor?", how: "Each run: the lamp's current at the chosen voltage, with the same meter errors.", xLabel: "voltage (V)", yLabel: "current (A)", xs: [0.5, 1, 2, 3, 4, 5, 6], reps: 5, yMin: 0, theory: V => iOf("lamp", V), theoryLabel: "model lamp", run: (V, r) => iOf("lamp", V) * (1 + 0.01 * r.gauss()) + 0.0005 * r.gauss(), note: "The curve bends over: the hotter the filament, the higher its resistance (from about 4 Ω cold to 12 Ω at full brightness)." },
    { title: "EMF and internal resistance", question: "How does the terminal voltage of a cell depend on the current it supplies?", how: "Each run: a 1.5 V cell with internal resistance 1.2 Ω; the load is set to give the chosen current; voltmeter error 1% plus 0.01 V.", xLabel: "current (A)", yLabel: "terminal voltage (V)", xs: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8], reps: 5, fit: true, theory: I => 1.5 - 1.2 * I, theoryLabel: "V = ε − Ir", run: (I, r) => (1.5 - 1.2 * I) * (1 + 0.01 * r.gauss()) + 0.005 * r.gauss(), note: "The intercept is the EMF and the gradient is −r. Repeating readings and drawing the best-fit line reduces the effect of the random errors." },
    { title: "Thermistor", question: "How does the resistance of a thermistor depend on temperature?", how: "Each run: the thermistor in a water bath at the chosen temperature (thermometer good to ±1 °C); its resistance is read with an ohmmeter.", xLabel: "temperature (°C)", yLabel: "resistance (Ω)", xs: [0, 10, 20, 30, 40, 50, 60, 80, 100], reps: 4, yMin: 0, theory: t => thermR(t), theoryLabel: "NTC thermistor", run: (t, r) => thermR(t + r.gauss()) * (1 + 0.01 * r.gauss()) },
    { title: "LDR", question: "How does the resistance of an LDR depend on the light level?", how: "Each run: the LDR under the chosen light level (light meter good to 5%).", xLabel: "light level (lux)", yLabel: "resistance (Ω)", xs: [10, 30, 100, 300, 1000, 3000, 10000], reps: 4, yMin: 0, theory: l => ldrR(l), theoryLabel: "LDR", run: (l, r) => ldrR(l * (1 + 0.05 * r.gauss())) * (1 + 0.02 * r.gauss()), note: "The resistance falls steeply at first, then levels off. On logarithmic axes the graph would be a straight line." },
    { title: "Resistors in parallel", question: "How does the total resistance change as more 30 Ω resistors are connected in parallel?", how: "Each run: the chosen number of nominally 30 Ω resistors (each within ±5% of its value) in parallel; the total is measured.", xLabel: "number of resistors in parallel", yLabel: "total resistance (Ω)", xs: [1, 2, 3, 4, 5, 6], reps: 6, yMin: 0, theory: n => 30 / n, theoryLabel: "1/R = 1/R₁ + 1/R₂ + …", run(n, r) { let g = 0; for (let k = 0; k < n; k++) g += 1 / (30 * (1 + 0.05 * (2 * r() - 1))); return 1 / g; }, note: "Each extra path makes it easier for the current to flow, so the total resistance falls, and is always less than the smallest single resistor." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 2", text: "Current is the rate of flow of charge: Q = It. In a series circuit the current is the same everywhere; in parallel the branch currents add up to the total." },
      { lvl: "std", tag: "4PH1 2", text: "Voltage is the energy transferred per unit charge: E = QV. In series the voltages across components add up to the supply voltage; parallel branches each have the full voltage." },
      { lvl: "std", tag: "4PH1 2", text: "V = IR. A fixed resistor at constant temperature gives a straight-line I–V graph; a filament lamp's resistance rises as it heats up; a diode only conducts in one direction." },
      { lvl: "std", tag: "4PH1 2", text: "An LDR's resistance falls as light increases; a thermistor's resistance falls as temperature increases." },
      { lvl: "std", tag: "4PH1 2", text: "Power P = IV = I²R; energy transferred E = IVt." },
      { lvl: "adv", tag: "A level Eduqas", text: "Kirchhoff's first law: the sum of currents into a junction equals the sum out (conservation of charge). Second law: round any loop the sum of EMFs equals the sum of p.d.s (conservation of energy)." },
      { lvl: "adv", tag: "A level Eduqas", text: "Resistors in series: R = R₁ + R₂; in parallel: 1/R = 1/R₁ + 1/R₂. Potential divider: V_out = V_in R₂ / (R₁ + R₂)." },
      { lvl: "adv", tag: "A level Eduqas", text: "EMF ε: energy given per coulomb by the source. Terminal p.d. V = ε − Ir, where r is the internal resistance; the 'lost volts' Ir are used inside the cell." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const s = solve(); return `In your series circuit the current is ${s.I.toFixed(3)} A and the voltage across R₁ is ${s.V1.toFixed(2)} V. Calculate the resistance of R₁ and the charge that flows through it in 2 minutes.`; }, ans: () => { const s = solve(); return `<ul><li>R = V ÷ I = ${s.V1.toFixed(2)} ÷ ${s.I.toFixed(3)} = ${(s.V1 / s.I).toFixed(1)} Ω</li><li>Q = It = ${s.I.toFixed(3)} × 120</li><li>= ${(s.I * 120).toFixed(1)} C</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Two lamps are connected in parallel to a 6 V battery. State the voltage across each lamp and explain why.", ans: "<ul><li>6 V across each</li><li>Each branch is connected directly across the battery's terminals</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe how the resistance of a filament lamp changes as the current through it increases, and explain why.", ans: "<ul><li>The resistance increases</li><li>The filament gets hotter</li><li>Its ions vibrate more, so electrons collide with them more often</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe an experiment to find how the current through a component depends on the voltage across it.", ans: "<ul><li>Connect the component in series with an ammeter and a variable resistor (or variable supply); a voltmeter in parallel with the component</li><li>Change the voltage in steps and record the current each time</li><li>Reverse the supply connections for negative values</li><li>Plot a graph of current against voltage</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain how a thermistor and a fixed resistor in series could be used to switch on a fan when a room gets hot.", ans: "<ul><li>As temperature rises the thermistor's resistance falls</li><li>so the voltage across the thermistor falls and the voltage across the fixed resistor rises</li><li>when the voltage across the fixed resistor reaches a set value it switches on the fan (e.g. through a relay or transistor)</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const s = solve(), lamp = P.x === "lamp"; return `Calculate the power of the ${COMP[P.x].name} in your circuit, and the energy it transfers in one minute.`; }, ans: () => { const s = solve(); return `<ul><li>P = IV = ${s.Ix.toFixed(3)} × ${s.Vx.toFixed(2)}</li><li>= ${(s.Ix * s.Vx).toFixed(3)} W</li><li>E = Pt = ${(s.Ix * s.Vx * 60).toFixed(1)} J</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "A cell of EMF 1.50 V and internal resistance 0.80 Ω is connected to a 4.2 Ω resistor. Calculate the terminal p.d.", ans: "<ul><li>I = ε ÷ (R + r) = 1.50 ÷ 5.0 = 0.30 A</li><li>V = ε − Ir = 1.50 − 0.30 × 0.80</li><li>= 1.26 V</li></ul>" },
      { lvl: "adv", marks: 3, q: "A potential divider has R₁ = 2.2 kΩ and an LDR of resistance 6.8 kΩ in darkness, across a 9.0 V supply. Calculate the output voltage across the LDR, and state what happens to it in bright light.", ans: "<ul><li>V_out = 9.0 × 6.8 ÷ (2.2 + 6.8)</li><li>= 6.8 V</li><li>In bright light the LDR's resistance falls, so V_out falls</li></ul>" },
      { lvl: "adv", marks: 2, q: "State Kirchhoff's two laws and the conservation law behind each.", ans: "<ul><li>First: total current into a junction = total current out (conservation of charge)</li><li>Second: in any closed loop, the sum of the EMFs = the sum of the p.d.s (conservation of energy)</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li>Each circuit is solved exactly from V = IR for every component and Kirchhoff's laws (current conserved at junctions; voltages round a loop add up to the EMF). For components whose resistance changes, the answer is found by trial (halving the range each time) until it is consistent.</li>
<li><b>Filament lamp:</b> about 4 Ω cold, rising to 12 Ω at its rated 0.5 A (6 V), as the filament heats.</li>
<li><b>Diode:</b> the diode equation, I = I₀(e^(V/0.05) − 1): almost nothing until about 0.6 V forwards, almost nothing at all backwards.</li>
<li><b>LDR:</b> about 12 kΩ at 1 lux, falling as light^−0.75. <b>Thermistor:</b> 2 kΩ at 25 °C, falling exponentially with temperature (B = 3600 K).</li>
<li><b>Cells</b> have an EMF and (if set) an internal resistance. Meters are ideal on screen; the batch runs add realistic reading errors.</li>
<li><b>The moving dots</b> show conventional current (from + to −), at a speed proportional to the current.</li></ul>
<h3>Simplifications</h3>
<ul><li>Wires have no resistance and meters do not disturb the circuit.</li>
<li>The lamp heats up instantly; real filaments take a fraction of a second, which is why bulbs often fail when switched on.</li>
<li>Real electrons drift from − to + at less than a millimetre per second; the dots are a picture of the current, not of electrons.</li>
<li>No a.c. here: the earlier version has an a.c. tab (beyond the spec) and a resistivity bench.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/circuits.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Bench");
ctl.mode = K.seg(g, { value: "series", options: [["series", "Series"], ["parallel", "Parallel"], ["iv", "I–V characteristics"], ["emf", "EMF and internal r"]], on: v => { ui.mission(null); P.mode = v; showMode(); } });
const compGroup = g = ui.group("The components");
ctl.x = K.seg(g, { label: "Second component", value: "lamp", options: Object.entries(COMP).map(([k, c]) => [k, c.name.split(" ")[0].replace("filament", "lamp").replace("fixed", "resistor")]), on: v => { P.x = v; ivlog = []; } });
ctl.E = K.slider(g, { label: "Cell voltage (EMF)", min: 0, max: 12, step: 0.1, value: 6, unit: "V", on: v => P.E = v });
ctl.R1 = K.slider(g, { label: "R₁ (fixed resistor)", min: 1, max: 5000, step: 1, value: 20, unit: "Ω", on: v => P.R1 = v });
ctl.R2 = K.slider(g, { label: "R₂ (if the second is a resistor)", min: 1, max: 500, step: 1, value: 20, unit: "Ω", on: v => ENV.R2 = v });
ctl.lux = K.slider(g, { label: "Light on the LDR", min: 1, max: 10000, step: 1, value: 200, fmt: v => v + " lux" + (v < 5 ? " (dark night)" : v < 100 ? " (dusk)" : v < 1000 ? " (indoors)" : " (daylight)"), on: v => ENV.lux = v });
ctl.temp = K.slider(g, { label: "Temperature of the thermistor", min: -10, max: 120, step: 1, value: 20, unit: "°C", on: v => ENV.temp = v });
ctl.r = K.slider(g, { label: "Internal resistance of the cell", min: 0, max: 5, step: 0.1, value: 0, unit: "Ω", on: v => P.r = v });
const ivGroup = g = ui.group("Supply");
ctl.Vsup = K.slider(g, { label: "Voltage across the component", min: -6, max: 6, step: 0.01, value: 3, unit: "V", on: v => P.Vsup = v });
let r1 = K.row(g); K.btn(r1, "Sweep the voltage", () => { sweep = -6; ivlog = []; }, "primary"); K.btn(r1, "Clear", () => ivlog = []);
const emfGroup = g = ui.group("The cell and its load");
ctl.eInt = K.slider(g, { label: "EMF, ε", min: 1, max: 12, step: 0.1, value: 1.5, unit: "V", on: v => P.eInt = v });
ctl.rInt = K.slider(g, { label: "Internal resistance, r", min: 0, max: 5, step: 0.1, value: 0.5, unit: "Ω", on: v => P.rInt = v });
ctl.load = K.slider(g, { label: "Load resistance, R", min: 0.2, max: 50, step: 0.1, value: 10, unit: "Ω", on: v => P.load = v });
r1 = K.row(g); K.btn(r1, "Sweep the load", () => { sweep = 50; vtlog = []; }, "primary"); K.btn(r1, "Clear", () => vtlog = []);
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed of the dots", min: 0.2, max: 4, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["I", "current from the cell"], ["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
function showMode() { const m = P.mode; ctl.mode.set(m); compGroup.style.display = m === "series" || m === "parallel" ? "" : "none"; ivGroup.style.display = m === "iv" ? "" : "none"; emfGroup.style.display = m === "emf" ? "" : "none"; if (m === "iv") { compGroup.style.display = ""; for (const k of ["E", "R1", "r"]) ctl[k].el.style.display = "none"; } else for (const k of ["E", "R1"]) ctl[k].el.style.display = ""; ctl.r.el.style.display = ui.level === "adv" && (m === "series" || m === "parallel") ? "" : "none"; dots = {}; }
function set(o) { Object.assign(P, { mode: "series", E: 6, r: 0, R1: 20, x: "lamp", Vsup: 3, load: 10, rInt: 0.5, eInt: 1.5 }, o); Object.assign(ENV, { R2: 20, lux: 200, temp: 20 }); for (const k of ["E", "R1", "r", "Vsup", "load", "rInt", "eInt"]) ctl[k].set(P[k]); ctl.x.set(P.x); ctl.R2.set(20); ctl.lux.set(200); ctl.temp.set(20); ivlog = []; vtlog = []; sweep = null; showMode(); }
function solve() { if (P.mode === "parallel") return parallel(P.E, P.r, P.R1, P.x); if (P.mode === "iv") { const I = iOf(P.x, P.Vsup); return { I, Ix: I, Vx: P.Vsup, V1: 0, I1: I, Vt: P.Vsup }; } if (P.mode === "emf") { const I = P.eInt / (P.load + P.rInt); return { I, Vt: P.eInt - I * P.rInt, V1: I * P.load, I1: I, Ix: I, Vx: 0 }; } return series(P.E, P.r, P.R1, P.x); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
// a wire path as a list of points; dots travel along it at a speed set by its current
function along(path, d) { let L = 0; for (let i = 1; i < path.length; i++) { const s = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (d <= L + s) { const f = (d - L) / s; return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f]; } L += s; } return path[path.length - 1]; }
const plen = path => { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; };
function flow(c, key, path, I, dt) { const L = plen(path), n = Math.round(L / 28); const st = dots[key] || (dots[key] = { off: 0 }); st.off = (st.off + I * speed * 160 * dt) % 28; c.fillStyle = "#ffd166"; for (let k = 0; k < n; k++) { const p = along(path, (k * 28 + st.off) % L); c.beginPath(); c.arc(p[0], p[1], 3.2, 0, 6.3); c.fill(); } }
function wire(c, path) { c.strokeStyle = "#7d889e"; c.lineWidth = 3; c.beginPath(); path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
function cell(c, x, y, label) { c.fillStyle = "#080c15"; c.fillRect(x - 24, y - 22, 48, 44); c.strokeStyle = "#eef2f8"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 8, y - 20); c.lineTo(x - 8, y + 20); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(x + 8, y - 11); c.lineTo(x + 8, y + 11); c.stroke(); c.fillStyle = "#ff8a8a"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("+", x - 16, y - 24); c.fillStyle = "#6fb1ff"; c.fillText("−", x + 16, y - 24); c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText(label, x, y + 40); }
function component(c, kind, x, y, vert, I, V, label) {
  c.save(); c.translate(x, y); if (vert) c.rotate(Math.PI / 2); c.fillStyle = "#080c15"; c.fillRect(-36, -18, 72, 36);
  const P2 = Math.abs(I * V);
  if (kind === "lamp") { const glow = K.clamp(P2 / 3, 0, 1); if (glow > 0.02) { const gr = c.createRadialGradient(0, 0, 2, 0, 0, 60); gr.addColorStop(0, `rgba(255,236,150,${0.9 * glow})`); gr.addColorStop(1, "rgba(255,200,80,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 60, 0, 6.3); c.fill(); } c.strokeStyle = "#eef2f8"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 16, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(-11, -11); c.lineTo(11, 11); c.moveTo(11, -11); c.lineTo(-11, 11); c.stroke(); }
  else if (kind === "diode") { c.fillStyle = "#eef2f8"; c.beginPath(); c.moveTo(-14, -14); c.lineTo(-14, 14); c.lineTo(12, 0); c.fill(); c.strokeStyle = "#eef2f8"; c.lineWidth = 3; c.beginPath(); c.moveTo(13, -14); c.lineTo(13, 14); c.stroke(); }
  else { const hot = K.clamp(P2 / 2, 0, 1); c.strokeStyle = `rgb(${Math.round(230 + 25 * hot)},${Math.round(236 - 120 * hot)},${Math.round(248 - 180 * hot)})`; c.lineWidth = 2.5; c.strokeRect(-26, -10, 52, 20);
    if (kind === "ldr") { c.beginPath(); c.arc(0, 0, 22, 0, 6.3); c.stroke(); c.strokeStyle = "#ffd166"; c.lineWidth = 1.5; for (const o of [-8, 6]) { c.beginPath(); c.moveTo(o - 14, -32); c.lineTo(o - 4, -22); c.lineTo(o - 9, -23); c.moveTo(o - 4, -22); c.lineTo(o - 5, -27); c.stroke(); } }
    if (kind === "therm") { c.beginPath(); c.moveTo(-30, 16); c.lineTo(24, -16); c.lineTo(32, -16); c.stroke(); } }
  c.restore();
  c.fillStyle = "#eef2f8"; c.font = "600 12.5px Segoe UI,sans-serif"; c.textAlign = "center"; const ly = vert ? y : y + 36, lx = vert ? x + 56 : x;
  c.textAlign = vert ? "left" : "center"; c.fillText(label, vert ? x + 44 : x, vert ? y - 20 : ly); c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#7fe3a0"; c.fillText(Math.abs(V).toFixed(2) + " V", vert ? x + 44 : x, vert ? y - 2 : ly + 17); c.fillStyle = "#ffd166"; c.fillText(fmtI(I), vert ? x + 44 : x, vert ? y + 15 : ly + 33);
}
const fmtI = I => Math.abs(I) < 0.001 ? (I * 1e6).toFixed(0) + " µA" : Math.abs(I) < 1 ? (I * 1000).toFixed(1) + " mA" : I.toFixed(2) + " A";
function meter(c, x, y, ch, val, col) { c.fillStyle = "#121a2b"; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 20, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = col; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(ch, x, y + 5); c.font = "600 12px Consolas,monospace"; c.fillText(val, x, y + 38); }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, s = solve(), m = P.mode; c.fillStyle = "#080c15"; c.fillRect(0, 0, w, h);
  const L = w * 0.14, R = w * 0.52, T = h * 0.2, B = h * 0.78, cx = (L + R) / 2, name = COMP[P.x].name;
  if (m === "series") {
    const path = [[cx - 30, T], [L, T], [L, B], [R, B], [R, T], [cx + 30, T], [cx - 30, T]];
    wire(c, path.slice(0, 6)); flow(c, "s", [[cx - 24, T], [L, T], [L, B], [R, B], [R, T], [cx + 24, T]], s.I, dt);
    cell(c, cx, T, P.E.toFixed(1) + " V" + (P.r ? ", r = " + P.r + " Ω" : "")); component(c, "resistor", L, (T + B) / 2, true, s.I, s.V1, "R₁ = " + P.R1 + " Ω"); component(c, P.x, R, (T + B) / 2, true, s.Ix, s.Vx, name + (P.x === "resistor" ? " R₂ = " + ENV.R2 + " Ω" : ""));
    meter(c, cx, B, "A", fmtI(s.I), "#ffd166");
  } else if (m === "parallel") {
    const M = (L + R) / 2 + 40; wire(c, [[cx - 30, T], [L, T], [L, B], [R, B], [R, T], [cx + 30, T]]); wire(c, [[M, T], [M, B]]);
    flow(c, "m1", [[cx - 24, T], [L, T], [L, B], [M, B]], s.I, dt); flow(c, "b1", [[M, B], [M, T]], 0, dt); flow(c, "m2", [[M, T], [cx + 24, T]], s.I, dt);
    flow(c, "x", [[M, B], [R, B], [R, T], [M, T]], s.Ix, dt); flow(c, "r1", [[M, B], [M, T]], s.I1, dt);
    cell(c, cx - 40, T, P.E.toFixed(1) + " V"); component(c, "resistor", M, (T + B) / 2, true, s.I1, s.V1, "R₁ = " + P.R1 + " Ω"); component(c, P.x, R, (T + B) / 2, true, s.Ix, s.Vx, name);
    meter(c, (L + M) / 2, B, "A", fmtI(s.I), "#ffd166");
  } else if (m === "iv") {
    wire(c, [[cx - 30, T], [L, T], [L, B], [R, B], [R, T], [cx + 30, T]]); flow(c, "iv", [[cx - 24, T], [L, T], [L, B], [R, B], [R, T], [cx + 24, T]], s.I * (P.x === "diode" || P.x === "lamp" ? 3 : 1), dt);
    c.fillStyle = "#080c15"; c.fillRect(cx - 34, T - 24, 68, 48); c.strokeStyle = "#eef2f8"; c.lineWidth = 2; c.beginPath(); c.arc(cx, T, 20, 0, 6.3); c.stroke(); c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; c.textAlign = "center"; c.fillText("variable supply " + P.Vsup.toFixed(2) + " V", cx, T - 32); c.fillText("~", cx, T + 5);
    component(c, P.x, R, (T + B) / 2, true, s.I, s.Vx, name); meter(c, (L + R) / 2, B, "A", fmtI(s.I), "#ffd166");
    c.strokeStyle = "#7fe3a0"; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(R, T + 30); c.lineTo(R + 90, T + 30); c.lineTo(R + 90, B - 30); c.lineTo(R, B - 30); c.stroke(); c.setLineDash([]); meter(c, R + 90, (T + B) / 2, "V", s.Vx.toFixed(2) + " V", "#7fe3a0");
  } else {
    // the cell: an ideal EMF and its internal resistance inside a dashed box
    const bx = cx - 90, bw = 180; wire(c, [[L, T], [bx, T]]); wire(c, [[bx + bw, T], [R, T], [R, B], [L, B], [L, T]]); wire(c, [[bx, T], [bx + bw, T]]);
    flow(c, "emf", [[bx + bw, T], [R, T], [R, B], [L, B], [L, T], [bx, T], [bx + bw, T]], s.I * 0.5, dt);
    c.strokeStyle = "rgba(220,230,250,.5)"; c.setLineDash([6, 5]); c.lineWidth = 1.5; c.strokeRect(bx - 6, T - 40, bw + 12, 80); c.setLineDash([]); cell(c, bx + 40, T, "ε = " + P.eInt.toFixed(1) + " V"); component(c, "resistor", bx + 130, T, false, s.I, s.I * P.rInt, "r = " + P.rInt + " Ω");
    component(c, "resistor", R, (T + B) / 2, true, s.I, s.V1, "load R = " + P.load.toFixed(1) + " Ω"); meter(c, (L + R) / 2, B, "A", fmtI(s.I), "#ffd166");
    c.strokeStyle = "#7fe3a0"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(bx - 6, T); c.lineTo(bx - 6, T + 100); c.lineTo(bx + bw + 6, T + 100); c.lineTo(bx + bw + 6, T); c.stroke(); c.setLineDash([]); meter(c, cx, T + 100, "V", s.Vt.toFixed(2) + " V", "#7fe3a0");
    c.fillStyle = "#cfd8ea"; c.font = "12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("lost inside the cell: Ir = " + (s.I * P.rInt).toFixed(2) + " V", cx, T - 50);
  }
  // energy story on the right
  const tx = w * 0.7, rows = m === "emf" ? [["EMF ε", P.eInt.toFixed(2) + " V"], ["terminal p.d.", s.Vt.toFixed(2) + " V"], ["lost volts Ir", (s.I * P.rInt).toFixed(2) + " V"], ["power to the load", (s.I * s.V1).toFixed(2) + " W"], ["power wasted in the cell", (s.I * s.I * P.rInt).toFixed(2) + " W"]]
    : m === "iv" ? [["voltage", s.Vx.toFixed(2) + " V"], ["current", fmtI(s.I)], ["resistance V/I", Math.abs(s.I) > 1e-6 ? (s.Vx / s.I).toPrecision(3) + " Ω" : "very large"], ["power", (s.I * s.Vx).toFixed(3) + " W"]]
    : [["supply", P.E.toFixed(2) + " V"], [m === "series" ? "V₁ + V₂" : "V across each branch", m === "series" ? (s.V1 + s.Vx).toFixed(2) + " V" : s.Vx.toFixed(2) + " V"], [m === "series" ? "same current everywhere" : "I₁ + I₂", m === "series" ? fmtI(s.I) : fmtI(s.I1) + " + " + fmtI(s.Ix)], [COMP[P.x].name.split(" (")[0] + "'s resistance", (Math.abs(s.Ix) > 1e-9 ? s.Vx / s.Ix : Infinity).toPrecision(3) + " Ω"], ["total power", (s.I * (P.E - s.I * P.r)).toFixed(3) + " W"]];
  c.textAlign = "left"; rows.forEach(([a, b], i) => { c.fillStyle = "#aab6cc"; c.font = "12.5px Segoe UI,sans-serif"; c.fillText(a, tx, T + i * 40); c.fillStyle = "#eef2f8"; c.font = "600 16px Segoe UI,sans-serif"; c.fillText(b, tx, T + i * 40 + 19); });
}
const ch1 = K.chart(ui.dock, { title: "", yMin: null });
const ch2 = K.chart(ui.dock, { title: "" });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (sweep != null) { if (P.mode === "iv") { P.Vsup = sweep; ctl.Vsup.set(sweep); const I = iOf(P.x, sweep); ivlog.push([sweep, I * 1000 * (1 + 0.01 * rnd.gauss())]); sweep += dt * 3; if (sweep > 6) sweep = null; } else if (P.mode === "emf") { P.load = sweep; ctl.load.set(sweep); const I = P.eInt / (P.load + P.rInt); vtlog.push([I, (P.eInt - I * P.rInt) * (1 + 0.005 * rnd.gauss())]); sweep *= Math.pow(0.4, dt); if (sweep < 0.25) sweep = null; } else sweep = null; }
}, dt => {
  draw(Math.min(dt, 0.05)); if (frame++ % 6) return; const s = solve(), m = P.mode;
  if (m === "iv" || m === "series" || m === "parallel") { const pts = []; for (let v = -6; v <= 6; v += 0.05) pts.push([v, iOf(P.x, v) * 1000]); ch1.draw([{ pts, color: K.cssVar("--s1"), dash: [5, 4], label: COMP[P.x].name }, { pts: ivlog, type: "dots", color: K.cssVar("--s0"), r: 2, alpha: .6, label: "sweep" }, { pts: [[s.Vx, s.Ix * 1000]], type: "dots", color: "#fff", r: 5 }], { title: "I–V characteristic", xLabel: "voltage (V)", yLabel: "current (mA)", xMin: -6, xMax: 6 }); }
  else { const pts = []; for (let I = 0; I <= P.eInt / P.rInt * 1.01 && I < 30; I += P.eInt / Math.max(P.rInt, 0.05) / 80) pts.push([I, P.eInt - I * P.rInt]); ch1.draw([{ pts, color: K.cssVar("--s1"), dash: [5, 4], label: "V = ε − Ir" }, { pts: vtlog, type: "dots", color: K.cssVar("--s0"), r: 2.5, label: "readings" }, { pts: [[s.I, s.Vt]], type: "dots", color: "#fff", r: 5 }], { title: "Terminal p.d. against current", xLabel: "current (A)", yLabel: "terminal p.d. (V)", yMin: 0, xMin: 0 }); }
  if (P.x === "ldr" && m !== "emf") { const pts = []; for (let l = 1; l <= 10000; l *= 1.15) pts.push([Math.log10(l), ldrR(l)]); ch2.draw([{ pts, color: K.cssVar("--s0"), label: "LDR resistance" }, { pts: [[Math.log10(ENV.lux), ldrR(ENV.lux)]], type: "dots", color: "#fff", r: 5 }], { title: "LDR: resistance against light", xLabel: "light level (lux, ×10ⁿ)", yLabel: "resistance (Ω)", yMin: 0, xFmt: v => Math.abs(v - Math.round(v)) < .01 ? "10^" + Math.round(v) : "" }); }
  else if (P.x === "therm" && m !== "emf") { const pts = []; for (let t = -10; t <= 120; t += 2) pts.push([t, thermR(t)]); ch2.draw([{ pts, color: K.cssVar("--s0"), label: "thermistor resistance" }, { pts: [[ENV.temp, thermR(ENV.temp)]], type: "dots", color: "#fff", r: 5 }], { title: "Thermistor: resistance against temperature", xLabel: "temperature (°C)", yLabel: "resistance (Ω)", yMin: 0, xFmt: null }); }
  else if (m === "emf") { const pts = []; for (let R = 0.2; R <= 50; R *= 1.08) { const I = P.eInt / (R + P.rInt); pts.push([R, I * I * R]); } ch2.draw([{ pts, color: K.cssVar("--s2"), label: "power to the load" }, { pts: [[P.load, s.I * s.I * P.load]], type: "dots", color: "#fff", r: 5 }], { title: "Power delivered against load resistance", xLabel: "load R (Ω)", yLabel: "power (W)", yMin: 0, xFmt: null, vlines: [{ x: P.rInt, label: "R = r: most power" }] }); }
  else { const pts = [], pts2 = []; for (let E = 0; E <= 12; E += 0.2) { const q = m === "parallel" ? parallel(E, P.r, P.R1, P.x) : series(E, P.r, P.R1, P.x); pts.push([E, q.V1]); pts2.push([E, q.Vx]); } ch2.draw([{ pts, color: K.cssVar("--s0"), label: "across R₁" }, { pts: pts2, color: K.cssVar("--s1"), label: "across " + P.x }], { title: "How the voltage is shared", xLabel: "supply voltage (V)", yLabel: "voltage (V)", yMin: 0, xFmt: null, vlines: [{ x: P.E, label: "now" }] }); }
  const labs = m === "emf" ? [["a", "terminal p.d."], ["b", "lost volts"], ["c", "power to load"], ["d", "efficiency"], ["e", ""]] : m === "iv" ? [["a", "voltage"], ["b", "resistance"], ["c", "power"], ["d", ""], ["e", ""]] : [["a", "V across R₁"], ["b", "V across " + P.x], ["c", "I through R₁"], ["d", "I through " + P.x], ["e", P.x + " resistance"]];
  const vals = m === "emf" ? [s.Vt.toFixed(2) + " V", (s.I * P.rInt).toFixed(2) + " V", (s.I * s.V1).toFixed(2) + " W", Math.round(100 * P.load / (P.load + P.rInt)) + "%", ""] : m === "iv" ? [s.Vx.toFixed(2) + " V", Math.abs(s.I) > 1e-6 ? (s.Vx / s.I).toPrecision(3) + " Ω" : "very large", (s.I * s.Vx).toFixed(3) + " W", "", ""] : [s.V1.toFixed(2) + " V", s.Vx.toFixed(2) + " V", fmtI(s.I1), fmtI(s.Ix), Math.abs(s.Ix) > 1e-9 ? (s.Vx / s.Ix).toPrecision(3) + " Ω" : "very large"];
  const sp = read.el.querySelectorAll("span"); labs.forEach(([k, l], i) => { sp[i + 1].textContent = l; sp[i + 1].parentNode.style.display = l ? "" : "none"; read.set(k, vals[i]); }); read.set("I", fmtI(s.I));
  ui.hud("");
});
ui.onLevel = () => showMode();
set({});
ui.tip("Yellow dots show the current: faster where more current flows · change any component and the circuit re-solves", 8000);
