/* =====================================================================
   HEATING AND INSULATION
   Thermal energy moves from hot to cold by
     CONDUCTION  (vibrating particles pass energy on; metals are best,
                  trapped air is a poor conductor: an INSULATOR),
     CONVECTION  (warm fluid rises, carrying energy with it),
     RADIATION   (infrared; matt black surfaces emit and absorb best,
                  shiny silver surfaces worst).
   A hot object cools faster the hotter it is compared with its
   surroundings (Newton's law of cooling, beyond the spec):
        T − T_room falls exponentially, with a time constant τ.
   In a house, heat loss through each part = U × area × temperature
   difference (U-values, beyond the spec); insulation lowers U.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---------------- cooling cans ----------------
// k = 1/τ for a can of 200 g of water; each insulator adds "resistance" (in units of 1/k, seconds)
const K0 = 2.73e-4, INS = { none: { name: "bare can", add: 0 }, news: { name: "newspaper", add: 592 }, bubble: { name: "bubble wrap", add: 2587 }, cotton: { name: "cotton wool", add: 4402 }, felt: { name: "felt", add: 3094 }, foil: { name: "aluminium foil", add: 3379 } };
const kCan = (ins, layers) => 1 / (1 / K0 + INS[ins].add * layers);
// evaporation from an open can adds extra loss that grows quickly with temperature (why the fall curves upwards)
const evap = T => 2.0e-5 * (Math.exp(0.06 * (T - 20)) - 1);
function coolCan(T0, ins, layers, lid, secs = 600, Ta = 20) { let T = T0; const k = kCan(ins, layers), dt = 1; const hist = [[0, T]]; for (let t = 1; t <= secs; t++) { T -= (k * (T - Ta) + (lid ? 0 : evap(T)) * (T - Ta) / Math.max(1, T - Ta)) * dt; if (t % 15 === 0) hist.push([t, T]); } return { T, hist }; }
// ---------------- radiation ----------------
const SURF = { mblack: { name: "matt black", e: 0.95, col: "#111" }, sblack: { name: "shiny black", e: 0.845, col: "#2a2a30" }, mwhite: { name: "matt white", e: 0.795, col: "#e8e8e8" }, silver: { name: "shiny silver", e: 0.07, col: "#c8ccd4" } };
const leslie = (e, T, Ta = 20) => 1.741e-10 * e * ((T + 273) ** 4 - (Ta + 273) ** 4);   // thermopile reading (mV)
// coin drop: a plate absorbs from a heater; wax holding a coin melts at 20 + 0.57 × (absorbed ÷ loss) … modelled with τ = 184.5 s
function coinTime(e) { const X = 0.57; return e > X ? -184.5 * Math.log(1 - X / e) : Infinity; }
// ---------------- the house ----------------
const HOUSE = { walls: 100, windows: 15, floor: 50, loft: 50, vol: 250 };
const Uloft = d => 1 / (0.43 + d / 1000 / 0.04);   // W m⁻² K⁻¹, d in mm of mineral wool
const PRICE = 0.07, HOURS = 5800, TOUT = 8.6;      // 7p per kWh (gas), heating season hours, effective outside temperature
function houseLoss(o) {
  const parts = { walls: HOUSE.walls * (o.cavity ? 0.5 : 1.5), windows: HOUSE.windows * (o.glazing === "single" ? 5.0 : o.glazing === "double" ? 2.8 : 1.2), floor: HOUSE.floor * 0.6, loft: HOUSE.loft * Uloft(o.loft), air: 0.33 * o.ach * HOUSE.vol * (o.draught ? 0.6 : 1) };
  const UA = Object.values(parts).reduce((a, b) => a + b, 0), cost = UA * (o.Tin - TOUT) * HOURS / 1000 * PRICE / o.eff;
  return { parts, UA, cost, watts: UA * (o.Tin - o.Tnow) };
}

// ---------------- The page ----------------
const DEF = { view: "cans", T0: 80, ins: "none", layers: 1, lid: true, Ta: 20, surf: "mblack", Tcube: 80, loft: 270, cavity: false, glazing: "double", ach: 0.8, draught: false, Tin: 20, Tnow: 5, eff: 0.9, speed: 10 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 4), tC = 0, Tc = 80, histC = [], tR = 0, Tp = { mblack: 20, sblack: 20, mwhite: 20, silver: 20 }, dropped = {};
const ui = K.app({
  title: "Heating and Insulation", subject: "Physics",
  blurb: "Cooling cans and insulators, radiation from different surfaces, and the heat lost from a house: what insulation saves",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 4(b): conduction, convection and radiation; emission and absorption and the surface; reducing unwanted energy transfer (insulation); efficiency; the practical on thermal energy transfer (cooling cans, Leslie cube); 4(c) power = energy ÷ time. ΔQ = mcΔT is 4PH1 5(c).", adv: "WJEC Eduqas thermal physics: internal energy, heat and work, the first law ΔU = Q − W, Q = mcΔT; Stefan's law. Beyond the spec: U-values, Newton's law of cooling (ln graph), emissivity." } },
  missions: [
    { title: "Which insulator is best?", q: "Wrap the can in one layer of each material and record the fall in temperature over 10 minutes. Which keeps it warmest?", hint: "Cotton wool (about 4 °C fall against 9 °C bare): it traps the most air, a very poor conductor that cannot convect when trapped in small pockets.", setup() { set({ view: "cans", ins: "cotton" }); } },
    { title: "More layers", q: "Add layers of cotton wool one at a time. Does each layer save as much as the one before?", hint: "No: 9.1, 4.3, 2.8, 2.0 … °C. Each layer adds the same resistance, but the saving gets smaller: diminishing returns (like loft insulation).", setup() { set({ view: "cans", ins: "cotton", layers: 2 }); } },
    { title: "Take the lid off", q: "Compare a can with and without a lid, starting at 80 °C. Why does the lid help so much?", hint: "Without a lid, energy is lost by evaporation and convection from the water surface. Evaporation grows quickly with temperature, so hot drinks cool fast at first.", setup() { set({ view: "cans", lid: false }); } },
    { title: "The Leslie cube", q: "Measure the infrared from each face of a cube of hot water. Which surface emits most?", hint: "Matt black emits most and shiny silver least (about 1.35 mV against 0.10 mV), even though all four faces are at the same temperature.", setup() { set({ view: "rad" }); } },
    { title: "Black or shiny: the coin drop", q: "Heat four plates equally from a heater. Coins are stuck to the back with wax. Which drops first?", hint: "Matt black absorbs infrared best and drops first (about 3 minutes); shiny silver reflects most and may never get hot enough. Good emitters are good absorbers.", setup() { set({ view: "rad" }); } },
    { title: "Loft insulation", q: "Change the loft insulation from 0 to 300 mm. How much does it save each year? Where does most heat now escape?", hint: "About £500 a year, most of it in the first 100 mm. With a well-insulated loft the walls and air leaks lose the most: cavity wall insulation and draught-proofing are next.", setup() { set({ view: "house", loft: 0 }); } },
    { title: "Turn the thermostat down", q: "Lower the thermostat from 21 °C to 19 °C. How much is saved?", hint: "About 9% (roughly £130) for each degree: heat loss is proportional to the temperature difference with outside.", setup() { set({ view: "house", Tin: 21 }); } },
    { lvl: "adv", title: "Newton's law of cooling (beyond the spec)", q: "Plot ln(T − T_room) against time for the bare can. Is it a straight line? Find the time constant.", hint: "Yes (with a lid): gradient −k, so τ = 1/k ≈ 3700 s for the bare can. The same skill as capacitor discharge and radioactive decay.", setup() { set({ view: "cans", lid: true }); } }
  ],
  batch: [
    { title: "How precise is one cooling-can result?", question: "If 300 students do the bare-can experiment, how much do their 10-minute temperature falls vary?", how: "Start 80 °C, lid on; thermometer read to ±0.25 °C at start and end; start time ±5 s; room 20 ± 1 °C.", yLabel: "fall in 10 min (°C)", reps: 300, bins: 20, theory: 80 - coolCan(80, "none", 1, true).T, theoryLabel: "model", run: (x, r) => { const Ta = 20 + r.gauss(), T = coolCan(80, "none", 1, true, 600 + 5 * r.gauss(), Ta).T; return (80 + 0.25 * r.gauss()) - (T + 0.25 * r.gauss()); }, note: "Mean about 9.1 °C, SD about 0.5 °C: two cans must differ by more than about 1 °C before you can be confident one insulator is better." },
    { title: "Layers of cotton wool", question: "How does the temperature fall in 10 minutes depend on the number of layers?", how: "Cotton wool, lid on, start 80 °C; 5 repeats with thermometer error ±0.25 °C.", xLabel: "layers", yLabel: "fall in 10 min (°C)", xs: [0, 1, 2, 3, 4, 5], reps: 5, yMin: 0, theory: n => 80 - coolCan(80, "cotton", Math.round(n), true).T, theoryLabel: "model", run: (n, r) => 80 - coolCan(80, "cotton", n, true).T + 0.35 * r.gauss(), note: "Diminishing returns: the first layer halves the loss; later layers save less and less." },
    { title: "Which insulator is best?", question: "How much does one layer of each material reduce the temperature fall?", how: "0 bare · 1 newspaper · 2 bubble wrap · 3 cotton wool · 4 felt · 5 foil; lid on; 5 repeats.", xLabel: "material", yLabel: "fall in 10 min (°C)", xs: [0, 1, 2, 3, 4, 5], reps: 5, yMin: 0, theory: x => 80 - coolCan(80, ["none", "news", "bubble", "cotton", "felt", "foil"][Math.round(x)], 1, true).T, theoryLabel: "model", run: (x, r) => 80 - coolCan(80, ["none", "news", "bubble", "cotton", "felt", "foil"][x], 1, true).T + 0.35 * r.gauss(), note: "Cotton wool best, then foil (it reflects infrared back), felt and bubble wrap; one sheet of newspaper hardly helps." },
    { title: "Starting temperature (no lid)", question: "How does the 10-minute fall depend on the starting temperature?", how: "Bare can, no lid; 3 repeats.", xLabel: "start temperature (°C)", yLabel: "fall in 10 min (°C)", xs: [40, 50, 60, 70, 80, 90], reps: 3, yMin: 0, theory: T0 => T0 - coolCan(T0, "none", 1, false).T, theoryLabel: "model", run: (T0, r) => T0 - coolCan(T0, "none", 1, false).T + 0.35 * r.gauss(), note: "Roughly in proportion to how far above room temperature it starts (Newton's law of cooling), and a little more at high temperatures because evaporation from an open can grows quickly with temperature." },
    { title: "Leslie cube: the four faces", question: "What does a thermopile read from each face of a Leslie cube at 80 °C?", how: "0 matt black · 1 shiny black · 2 matt white · 3 shiny silver; reading ±0.02 mV.", xLabel: "face", yLabel: "thermopile reading (mV)", xs: [0, 1, 2, 3], reps: 5, yMin: 0, theory: x => leslie(Object.values(SURF)[Math.round(x)].e, 80), theoryLabel: "emissivity × σ(T⁴ − T₀⁴)", run: (x, r) => leslie(Object.values(SURF)[x].e, 80) + 0.02 * r.gauss(), note: "Matt black emits most, shiny silver least (about 14 times less). Colour matters less than shininess for infrared." },
    { title: "Black or shiny plate: coin drop", question: "How long until the wax melts and the coin drops from each plate?", how: "Plates equally far from a heater; time to ±3 s.", xLabel: "plate (0 matt black · 1 shiny black · 2 matt white)", yLabel: "time to drop (s)", xs: [0, 1, 2], reps: 5, yMin: 0, theory: x => coinTime(Object.values(SURF)[Math.round(x)].e), theoryLabel: "model", run: (x, r) => coinTime(Object.values(SURF)[x].e) + 3 * r.gauss(), note: "Matt black first (about 170 s), then shiny black and matt white. Shiny silver never gets hot enough: it reflects most of the infrared." },
    { title: "Loft insulation: how thick?", question: "How does the yearly heating bill depend on the thickness of loft insulation?", how: "Typical semi (walls 100 m², loft 50 m²), 20 °C, gas at 7p per kWh, boiler 90% efficient; each winter ±8% colder or milder.", xLabel: "loft insulation (mm)", yLabel: "heating cost (£ a year)", xs: [0, 25, 50, 100, 150, 200, 270, 300], reps: 5, yMin: 0, theory: d => houseLoss(Object.assign({}, DEF, { loft: d })).cost, theoryLabel: "average year", run: (d, r) => houseLoss(Object.assign({}, DEF, { loft: d })).cost * (1 + 0.08 * r.gauss()), note: "Most of the saving comes from the first 100 mm; beyond 270 mm (the UK recommendation) each extra centimetre saves little." },
    { title: "Turning the thermostat down", question: "How does the yearly cost depend on the thermostat setting?", how: "As above, 270 mm loft.", xLabel: "thermostat (°C)", yLabel: "heating cost (£ a year)", xs: [16, 17, 18, 19, 20, 21, 22, 23, 24], reps: 5, yMin: 0, fit: true, theory: T => houseLoss(Object.assign({}, DEF, { Tin: T })).cost, theoryLabel: "∝ (T − 8.6 °C)", run: (T, r) => houseLoss(Object.assign({}, DEF, { Tin: T })).cost * (1 + 0.08 * r.gauss()), note: "A straight line: about £130 (9%) per °C. Heat loss is proportional to the temperature difference with outside." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 4(b)", text: "Conduction: particles vibrate and pass energy to neighbours (free electrons make metals good conductors). Convection: warm fluid becomes less dense and rises. Radiation: infrared, needs no medium." },
      { lvl: "std", tag: "4PH1 4(b)", text: "Matt black surfaces are the best emitters and absorbers of infrared; shiny silver surfaces are the worst (they reflect it). Insulators trap air in small pockets to stop conduction and convection." },
      { lvl: "std", tag: "4PH1 4(b)", text: "Efficiency = useful energy out ÷ total energy in. Payback time = cost of insulation ÷ yearly saving." },
      { lvl: "adv", tag: "Eduqas thermal", text: "First law: ΔU = Q − W. Q = mcΔT. Stefan's law: P = εσAT⁴ (σ = 5.67 × 10⁻⁸ W m⁻² K⁻⁴)." },
      { lvl: "adv", tag: "Beyond the spec", text: "Heat loss rate = UAΔT. Newton's law of cooling: T − T_room = (T₀ − T_room)e^(−kt), so ln(T − T_room) against t is a straight line." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how cotton wool reduces the energy lost from a hot can.", ans: "<ul><li>it traps air, which is a poor conductor</li><li>the trapped air cannot move, so there is little convection</li><li>so energy is transferred more slowly</li></ul>" },
      { lvl: "std", marks: 2, q: () => { const h = houseLoss(Object.assign({}, P, { loft: 0 })), k = houseLoss(Object.assign({}, P, { loft: 270 })); return `Loft insulation costs £400 and cuts the yearly bill from £${h.cost.toFixed(0)} to £${k.cost.toFixed(0)}. Calculate the payback time.`; }, ans: () => { const h = houseLoss(Object.assign({}, P, { loft: 0 })), k = houseLoss(Object.assign({}, P, { loft: 270 })); return `<ul><li>saving = £${(h.cost - k.cost).toFixed(0)} a year</li><li>payback = 400 ÷ ${(h.cost - k.cost).toFixed(0)} = ${(400 / (h.cost - k.cost)).toFixed(1)} years</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "A room contains 60 kg of air (c = 1000 J kg⁻¹ K⁻¹). How much energy is needed to warm it by 5 K? Why does the room take far longer to warm than this suggests?", ans: "<ul><li>Q = mcΔT = 60 × 1000 × 5 = 300 kJ</li><li>the walls, floor and furniture must be warmed too (much larger heat capacity)</li><li>and energy is lost to outside at the same time</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Cooling cans: 200 g of water, dT/dt = −k(T − T_room) with k = 2.73 × 10⁻⁴ s⁻¹ bare; each layer of insulation adds to 1/k (cotton wool 4402 s, felt 3094 s, foil 3379 s, bubble wrap 2587 s, newspaper 592 s). Without a lid, evaporation adds 2.0 × 10⁻⁵(e^(0.06(T − 20)) − 1) K s⁻¹.</li>
<li>Leslie cube: thermopile reading ∝ emissivity × (T⁴ − T₀⁴); emissivities matt black 0.95, shiny black 0.845, matt white 0.795, shiny silver 0.07. Coin drop: plate warming with τ = 184.5 s; the wax melts when absorption overcomes losses.</li>
<li>House: heat loss = Σ UA ΔT (walls U 1.5, or 0.5 with cavity fill; windows 5.0 single, 2.8 double, 1.2 triple; floor 0.6; loft 1/(0.43 + d/0.04)) plus air leaks 0.33 × air changes × volume. Yearly cost = UA × (T_in − 8.6 °C) × 5800 h × 7p/kWh ÷ boiler efficiency.</li></ul>
<h3>Left out</h3><ul><li>Solar and internal gains, thermal mass and heating schedules, condensation, real weather. All numbers are illustrative.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/heating-insulation.html">original/heating-insulation.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "cans", options: [["cans", "☕ cooling cans"], ["rad", "🔆 radiation"], ["house", "🏠 the house"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 60, step: 1, value: 10, fmt: v => v + "×", on: v => P.speed = v });
grp.cans = g = ui.group("Cooling cans");
ctl.T0 = K.slider(g, { label: "Starting temperature", min: 40, max: 95, step: 1, value: 80, unit: "°C", on: v => P.T0 = v });
ctl.ins = K.seg(g, { value: "none", options: Object.entries(INS).map(([k, v]) => [k, v.name]), on: v => { P.ins = v; restartCan(); } });
ctl.layers = K.slider(g, { label: "Layers", min: 0, max: 5, step: 1, value: 1, on: v => { P.layers = v; restartCan(); } });
ctl.lid = K.toggle(g, { label: "Lid on", value: true, on: v => { P.lid = v; restartCan(); } });
let rr = K.row(g); K.btn(rr, "↺ Fresh can", () => restartCan(), "primary");
grp.rad = g = ui.group("Radiation");
ctl.Tcube = K.slider(g, { label: "Leslie cube water temperature", min: 30, max: 95, step: 1, value: 80, unit: "°C", on: v => P.Tcube = v });
ctl.surf = K.seg(g, { value: "mblack", options: Object.entries(SURF).map(([k, v]) => [k, v.name]), on: v => P.surf = v });
rr = K.row(g); K.btn(rr, "↺ Restart the coin drop", () => { tR = 0; for (const k in Tp) Tp[k] = 20; dropped = {}; });
grp.house = g = ui.group("The house");
ctl.loft = K.slider(g, { label: "Loft insulation", min: 0, max: 400, step: 5, value: 270, unit: "mm", on: v => P.loft = v });
ctl.cavity = K.toggle(g, { label: "Cavity wall insulation", value: false, on: v => P.cavity = v });
ctl.glazing = K.seg(g, { value: "double", options: [["single", "single glazing"], ["double", "double"], ["triple", "triple"]], on: v => P.glazing = v });
ctl.draught = K.toggle(g, { label: "Draught-proofing", value: false, on: v => P.draught = v });
ctl.Tin = K.slider(g, { label: "Thermostat", min: 15, max: 25, step: 0.5, value: 20, unit: "°C", on: v => P.Tin = v });
ctl.Tnow = K.slider(g, { label: "Outside now", min: -10, max: 20, step: 1, value: 5, unit: "°C", on: v => P.Tnow = v });
ctl.eff = K.slider(g, { label: "Boiler efficiency", min: 0.5, max: 1, step: 0.01, value: 0.9, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.eff = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
function restartCan() { tC = 0; Tc = P.T0; histC = [[0, Tc]]; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["T0", "layers", "Tcube", "loft", "Tin", "Tnow", "eff"]) ctl[k].set(P[k]); ctl.ins.set(P.ins); ctl.lid.set(P.lid); ctl.surf.set(P.surf); ctl.cavity.set(P.cavity); ctl.glazing.set(P.glazing); ctl.draught.set(P.draught); ctl.view.set(P.view); restartCan(); tR = 0; for (const k in Tp) Tp[k] = 20; dropped = {}; showGroups(); }

// ---------------- Simulation ----------------
function tick(dt) {
  const s = dt * P.speed;
  if (P.view === "cans" && tC < 1200) { const k = kCan(P.ins, P.layers); for (let i = 0; i < 10; i++) { Tc -= (k * (Tc - 20) + (P.lid ? 0 : evap(Tc))) * s / 10; tC += s / 10; } if (tC - histC[histC.length - 1][0] >= 10) histC.push([tC, Tc]); }
  if (P.view === "rad") { tR += s; for (const k in SURF) if (!dropped[k] && tR >= coinTime(SURF[k].e)) dropped[k] = tR; /* each coin drops when its plate reaches the wax's melting point */ }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const heatCol = T => { const u = K.clamp((T - 20) / 70, 0, 1); return `rgb(${Math.round(80 + 175 * u)},${Math.round(120 - 60 * u)},${Math.round(220 - 180 * u)})`; };
function drawCans(c, w, h) {
  const cx = w * 0.3, by = h * 0.8, cw = 120, ch = 170, wrap = P.layers * (P.ins === "none" ? 0 : 10);
  if (wrap) { c.fillStyle = { news: "#c8c0a8", bubble: "rgba(200,230,255,.6)", cotton: "#f4f4f4", felt: "#6a4a7a", foil: "#d8dce4" }[P.ins]; c.fillRect(cx - cw / 2 - wrap, by - ch - (P.lid ? 6 : 0), cw + 2 * wrap, ch + wrap); }
  c.fillStyle = "#9aa3b2"; c.fillRect(cx - cw / 2, by - ch, cw, ch); c.fillStyle = heatCol(Tc); c.fillRect(cx - cw / 2 + 5, by - ch + 20, cw - 10, ch - 25);
  if (P.lid) { c.fillStyle = "#7a8394"; c.fillRect(cx - cw / 2 - 6, by - ch - 8, cw + 12, 10); } else { const t = performance.now() / 1000; c.strokeStyle = "rgba(220,230,255,.35)"; for (let i = 0; i < 5; i++) { c.beginPath(); for (let k = 0; k <= 20; k++) { const y = by - ch - 10 - k * 4, x = cx - 40 + i * 20 + 6 * Math.sin(k * 0.6 + t * 2 + i); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); } TX(c, "steam: evaporation", cx, by - ch - 100, "#cfd8ea", "center", "11px"); }
  // thermometer
  c.fillStyle = "#eee"; c.fillRect(cx + 20, by - ch - 70, 8, ch + 50); c.fillStyle = "#ff4d4d"; const hh = (Tc - 0) / 100 * (ch + 40); c.fillRect(cx + 21, by - 20 - hh, 6, hh); TX(c, Tc.toFixed(1) + " °C", cx + 36, by - 20 - hh + 4, "#ff8a70", "left", "600 14px");
  // heat flow arrows, length ∝ rate
  const rate = kCan(P.ins, P.layers) * (Tc - 20) + (P.lid ? 0 : evap(Tc)); const L = Math.min(80, rate * 4e4); c.strokeStyle = "#ff8a70"; c.lineWidth = 2; for (const [x, y, dx] of [[cx - cw / 2 - wrap, by - ch / 2, -1], [cx + cw / 2 + wrap, by - ch / 2, 1]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * L, y); c.stroke(); } c.lineWidth = 1;
  TX(c, `${INS[P.ins].name}${P.ins !== "none" ? ` × ${P.layers}` : ""} · ${P.lid ? "lid on" : "no lid"} · ${(tC / 60).toFixed(1)} min · fallen ${(P.T0 - Tc).toFixed(1)} °C`, 20, 30, "#eef2f8", "left", "600 14px");
  // results table on the right
  const tx = w * 0.6; TX(c, "Fall in 10 minutes (model, lid on, from 80 °C):", tx, 70, "#cfd8ea", "left", "600 12.5px"); Object.entries(INS).forEach(([k, v], i) => { const f = 80 - coolCan(80, k, 1, true).T; TX(c, v.name, tx, 96 + i * 22, k === P.ins ? "#ffd166" : "#cfd8ea", "left", "12.5px"); c.fillStyle = k === P.ins ? "#ffd166" : "#3a4a6b"; c.fillRect(tx + 120, 86 + i * 22, f * 16, 12); TX(c, f.toFixed(1) + " °C", tx + 126 + f * 16, 96 + i * 22, "#8fa0bf", "left", "11px"); });
}
function drawRad(c, w, h) {
  // Leslie cube with a thermopile in front of the chosen face
  const cx = w * 0.22, cy = h * 0.35, s = 120; const faces = Object.entries(SURF);
  c.fillStyle = SURF[P.surf].col; c.fillRect(cx - s / 2, cy - s / 2, s, s); c.strokeStyle = "#cfd8ea"; c.strokeRect(cx - s / 2, cy - s / 2, s, s); TX(c, SURF[P.surf].name + " face", cx, cy + s / 2 + 18, "#cfd8ea", "center", "12px");
  const mv = leslie(SURF[P.surf].e, P.Tcube); c.fillStyle = "#555"; c.fillRect(cx + s / 2 + 70, cy - 14, 40, 28); TX(c, "thermopile", cx + s / 2 + 90, cy - 22, "#cfd8ea", "center", "11px"); TX(c, mv.toFixed(2) + " mV", cx + s / 2 + 90, cy + 34, "#7ee787", "center", "600 14px");
  const n = Math.round(mv * 6), t = performance.now() / 1000; c.strokeStyle = "#ff8a70"; for (let i = 0; i < n; i++) { const u = (t * 0.8 + i / Math.max(1, n)) % 1, y = cy - s / 2 + 10 + (i * 37 % (s - 20)); c.beginPath(); c.moveTo(cx + s / 2 + u * 60, y); c.lineTo(cx + s / 2 + u * 60 + 10, y); c.stroke(); }
  TX(c, `water at ${P.Tcube} °C`, cx, cy - s / 2 - 10, "#cfd8ea", "center", "12px");
  // coin drop: four plates facing a heater
  const hx = w * 0.62, top = 110; c.fillStyle = "#ff6b3d"; c.fillRect(hx - 20, top, 40, h * 0.62); TX(c, "radiant heater", hx, top - 10, "#ff8a70", "center", "12px");
  faces.forEach(([k, v], i) => { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), px = hx + side * 130, py = top + 30 + row * (h * 0.32); c.fillStyle = v.col; c.fillRect(px - 8, py, 16, h * 0.24); c.strokeStyle = "#cfd8ea"; c.strokeRect(px - 8, py, 16, h * 0.24); const fell = dropped[k] != null, cyc = fell ? Math.min(h * 0.88, py + h * 0.12 + (tR - dropped[k]) * 30) : py + h * 0.12; c.fillStyle = "#d4af37"; c.beginPath(); c.arc(px + side * 18, cyc, 9, 0, 6.3); c.fill(); TX(c, `${v.name}: ${fell ? "dropped at " + dropped[k].toFixed(0) + " s" : Number.isFinite(coinTime(v.e)) ? "waiting" : "never melts"}`, px + side * 34, py + 14, "#cfd8ea", side > 0 ? "left" : "right", "11.5px"); });
  TX(c, `${tR.toFixed(0)} s since the heater was switched on`, hx, h - 18, "#eef2f8", "center", "600 13px");
}
function drawHouse(c, w, h) {
  const r = houseLoss(P), x0 = 170, y0 = h * 0.82, W = w * 0.5, H = h * 0.42, total = Object.values(r.parts).reduce((a, b) => a + b, 0), parts = r.parts;
  c.fillStyle = "#3a2e2a"; c.fillRect(x0, y0 - H, W, H); c.fillStyle = "#59403a"; c.beginPath(); c.moveTo(x0 - 20, y0 - H); c.lineTo(x0 + W / 2, y0 - H - 120); c.lineTo(x0 + W + 20, y0 - H); c.fill();
  if (P.loft) { c.fillStyle = "#e8d080"; c.fillRect(x0, y0 - H - Math.min(30, P.loft / 10), W, Math.min(30, P.loft / 10)); }
  c.fillStyle = heatCol(P.Tin + 45); c.globalAlpha = 0.3; c.fillRect(x0 + 10, y0 - H + 10, W - 20, H - 20); c.globalAlpha = 1;
  for (let i = 0; i < 3; i++) { c.fillStyle = P.glazing === "single" ? "#7fb2e8" : P.glazing === "double" ? "#5a8fc8" : "#3d6fa8"; c.fillRect(x0 + 30 + i * (W - 60) / 3, y0 - H + 40, 60, 60); }
  if (P.cavity) { c.strokeStyle = "#e8d080"; c.lineWidth = 6; c.strokeRect(x0 + 3, y0 - H + 3, W - 6, H - 6); c.lineWidth = 1; }
  // heat-loss arrows, thickness ∝ watts through each part
  const Wt = k => parts[k] * (P.Tin - P.Tnow); const arrowW = (k, x1, y1, x2, y2) => { const wv = Wt(k); c.strokeStyle = "#ff6b3d"; c.lineWidth = Math.max(1, Math.min(22, wv / 80)); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.lineWidth = 1; TX(c, `${k}: ${wv.toFixed(0)} W`, x2 + (x2 > x1 ? 8 : -8), y2 + 4, "#ff8a70", x2 > x1 ? "left" : "right", "600 12px"); };
  arrowW("loft", x0 + W / 2, y0 - H - 40, x0 + W / 2 + 120, y0 - H - 130); arrowW("walls", x0 + W, y0 - H / 2, x0 + W + 90, y0 - H / 2); arrowW("windows", x0 + W, y0 - H + 70, x0 + W + 90, y0 - H + 40); arrowW("floor", x0 + W / 2, y0, x0 + W / 2 + 90, y0 + 30); arrowW("air", x0, y0 - H / 2, x0 - 60, y0 - H / 2 - 40);
  TX(c, `Heat loss now: ${r.watts.toFixed(0)} W (UA = ${r.UA.toFixed(0)} W/K × ${(P.Tin - P.Tnow).toFixed(0)} K) · yearly bill £${r.cost.toFixed(0)}`, 20, 30, "#eef2f8", "left", "600 14px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ cans: drawCans, rad: drawRad, house: drawHouse })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "cans") {
    const th = coolCan(P.T0, P.ins, P.layers, P.lid, 1200).hist;
    chA.opts.title = "Temperature against time"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "°C"; chA.draw([{ pts: th, color: "#3a4a6b", label: "model" }, { pts: histC, color: "#ff8a70", label: "this can" }], { xMin: 0, xMax: 1200 });
    if (ui.level === "adv") { chB.opts.title = "ln(T − T_room) against time"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "ln(T − 20)"; const lp = histC.filter(p => p[1] > 20.5).map(([t, T]) => [t, Math.log(T - 20)]); const ser = [{ pts: lp, type: "dots", r: 3, color: "#7ee787", label: "this can" }]; if (lp.length > 3) { const f = K.linfit(lp); ser.push({ pts: [[0, f.c], [1200, f.c + f.m * 1200]], color: "#7ee787", dash: [4, 3], label: `τ = ${(-1 / f.m).toFixed(0)} s` }); } chB.draw(ser, { xMin: 0, xMax: 1200 }); }
    else { const ls = []; for (let n = 0; n <= 5; n++) ls.push([n, 80 - coolCan(80, P.ins === "none" ? "cotton" : P.ins, n, true).T]); chB.opts.title = "Fall in 10 min against layers"; chB.opts.xLabel = "layers"; chB.opts.yLabel = "°C"; chB.draw([{ pts: ls, type: "bars", w: 0.6, color: "#c9a0ff", label: P.ins === "none" ? "cotton wool" : INS[P.ins].name }], { xMin: -0.6, xMax: 5.6, yMin: 0 }); }
    relabel(["temperature", "time", "fall so far", "rate of cooling", "energy lost (Q = mcΔT)"]);
    read.set("a", Tc.toFixed(1) + " °C"); read.set("b", (tC / 60).toFixed(1) + " min"); read.set("c", (P.T0 - Tc).toFixed(2) + " °C"); read.set("d", ((kCan(P.ins, P.layers) * (Tc - 20) + (P.lid ? 0 : evap(Tc))) * 60).toFixed(3) + " °C per min"); read.set("e", (0.2 * 4180 * (P.T0 - Tc) / 1000).toFixed(1) + " kJ (200 g of water)");
    ui.hud("Trapped air is a poor conductor and cannot convect");
  } else if (P.view === "rad") {
    const pts = Object.values(SURF).map((v, i) => [i, leslie(v.e, P.Tcube)]);
    chA.opts.title = "Leslie cube: each face"; chA.opts.xLabel = "0 matt black · 1 shiny black · 2 matt white · 3 silver"; chA.opts.yLabel = "mV"; chA.draw([{ pts, type: "bars", w: 0.6, color: "#ff8a70", label: "thermopile" }], { xMin: -0.6, xMax: 3.6, yMin: 0 });
    const tp = []; for (let T = 20; T <= 95; T += 1) tp.push([T, leslie(SURF[P.surf].e, T)]);
    chB.opts.title = "Reading against water temperature"; chB.opts.xLabel = "°C"; chB.opts.yLabel = "mV"; chB.draw([{ pts: tp, color: "#ffd166", label: SURF[P.surf].name }, { pts: [[P.Tcube, leslie(SURF[P.surf].e, P.Tcube)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 20, yMin: 0 });
    relabel(["thermopile now", "emissivity", "coin drop: matt black", "coin drop: shiny silver", "Stefan's law (A level)"]);
    read.set("a", leslie(SURF[P.surf].e, P.Tcube).toFixed(3) + " mV"); read.set("b", SURF[P.surf].e.toFixed(3)); read.set("c", coinTime(0.95).toFixed(0) + " s"); read.set("d", "never (reflects most)"); read.set("e", "P = εσAT⁴: ∝ T⁴ in kelvin");
    ui.hud("Good emitters are good absorbers: matt black best, shiny silver worst");
  } else {
    const r = houseLoss(P), ks = Object.keys(r.parts);
    chA.opts.title = "Where the heat goes"; chA.opts.xLabel = "walls · windows · floor · loft · air"; chA.opts.yLabel = "W per K"; chA.draw([{ pts: ks.map((k, i) => [i, r.parts[k]]), type: "bars", w: 0.6, color: "#ff8a70", label: "UA" }], { xMin: -0.6, xMax: 4.6, yMin: 0 });
    const lp = []; for (let d = 0; d <= 400; d += 10) lp.push([d, houseLoss(Object.assign({}, P, { loft: d })).cost]);
    chB.opts.title = "Yearly bill against loft insulation"; chB.opts.xLabel = "loft insulation (mm)"; chB.opts.yLabel = "£ a year"; chB.draw([{ pts: lp, color: "#7ee787", label: "bill" }, { pts: [[P.loft, r.cost]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0 });
    const base = houseLoss(Object.assign({}, P, { loft: 0 }));
    relabel(["heat loss now", "yearly bill", "saved by the loft insulation", "payback (£400 for 270 mm)", "per °C on the thermostat"]);
    read.set("a", r.watts.toFixed(0) + " W"); read.set("b", "£" + r.cost.toFixed(0)); read.set("c", "£" + (base.cost - r.cost).toFixed(0) + " a year"); read.set("d", (400 / Math.max(1, base.cost - houseLoss(Object.assign({}, P, { loft: 270 })).cost)).toFixed(1) + " years"); read.set("e", "£" + (r.UA * HOURS / 1000 * PRICE / P.eff).toFixed(0) + " a year");
    ui.hud("Heat loss = U × area × temperature difference");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Three views at the top of the controls. The can is cooling at 10× speed.", 6000);
