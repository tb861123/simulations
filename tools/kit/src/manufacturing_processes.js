/* =====================================================================
   MANUFACTURING PROCESSES, SCALES OF PRODUCTION AND QUALITY
   Every process has a FIXED (set-up / tooling) cost, paid once, and a
   cost PER PART (material, machine time, labour):
        cost per unit = tooling ÷ quantity + cost per part
   Processes with expensive tooling (an injection-moulding die can cost
   tens of thousands of pounds) are only cheap when spread over huge
   quantities; processes with no tooling (3D printing, CNC) suit one-offs
   and prototypes. So the best process depends on the SCALE OF PRODUCTION:
   one-off → batch → mass → continuous.
   No process makes every part exactly the same size. Each part's size
   varies randomly around the setting (standard deviation σ), and tools
   wear so the setting drifts. A part is accepted if it is within the
   TOLERANCE (e.g. 60.00 ± 0.10 mm). QUALITY CONTROL measures parts and
   plots them on a control chart so drift is caught before parts are
   out of tolerance. Process capability Cpk = (tolerance − |drift|) ÷ 3σ:
   above about 1.33 almost no parts are rejected.
   ===================================================================== */
const gbp = v => v >= 100 ? "£" + Math.round(v).toLocaleString("en-GB") : "£" + v.toFixed(2);
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
// ---------------- Processes for a polymer phone stand (illustrative 2026 costs) ----------------
// tool = tooling/set-up £; mat, mach, lab = £ per part; cyc = minutes per part per machine; sd = size scatter (mm); lead = days before the first part
const PROC = [
  { k: "print", name: "3D printing (FDM)", tool: 0, mat: 0.6, mach: 4.5, lab: 1.0, cyc: 90, sd: 0.12, lead: 0, col: "#c9a0ff", scale: "one-off / prototype", waste: 5 },
  { k: "laser", name: "Laser-cut + line-bent acrylic", tool: 20, mat: 1.2, mach: 1.5, lab: 1.5, cyc: 6, sd: 0.08, lead: 1, col: "#5ad1ff", scale: "one-off / small batch", waste: 25 },
  { k: "cnc", name: "CNC machined from solid", tool: 150, mat: 3.0, mach: 15, lab: 1.0, cyc: 20, sd: 0.02, lead: 2, col: "#cfd8ea", scale: "one-off / batch (precise)", waste: 60 },
  { k: "vac", name: "Vacuum formed", tool: 400, mat: 0.8, mach: 0.35, lab: 1.5, cyc: 1.5, sd: 0.2, lead: 5, col: "#7ee787", scale: "batch", waste: 30 },
  { k: "inj", name: "Injection moulded", tool: 12000, mat: 0.25, mach: 0.5, lab: 0.05, cyc: 0.5, sd: 0.04, lead: 42, col: "#ffd166", scale: "mass / continuous", waste: 2 }
];
const byK = k => PROC.find(p => p.k === k);
const vc = p => p.mat + p.mach + p.lab;
const unitCost = (p, n) => p.tool / n + vc(p);
const cheapest = n => PROC.slice().sort((a, b) => unitCost(a, n) - unitCost(b, n))[0];
const daysToMake = (p, n, machines) => p.lead + n * p.cyc / 60 / (8 * machines);      // 8-hour days
const rejectFrac = (tol, sd, drift = 0) => 1 - (Phi((tol - drift) / sd) - Phi((-tol - drift) / sd));

// ---------------- The page ----------------
const DEF = { proc: "inj", qty: 1000, tol: 0.1, wear: 0, machines: 1, speed: 1, compare: "print" };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), parts = [], drift = 0, made = 0, rejects = 0, tt = 0, belt = [];
const ui = K.app({
  title: "Manufacturing Processes and Quality", subject: "Design and Technology",
  blurb: "Five ways to make a phone stand: tooling against cost per part, scales of production, break-even quantities, tolerances and quality control charts",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "AQA GCSE Design and Technology (8552) 3.2 Specialist technical principles: scales of production (prototype/one-off, batch, mass, continuous), shaping and forming polymers (3D printing, laser cutting, vacuum forming, injection moulding), quality control and tolerances.", adv: "AQA A level Product Design (7552) 3.1.4 Forming, redistribution and addition processes; 3.1.6 Modern industrial and commercial practice (scales of production, quality control and assurance); 3.2.7 Accuracy in design and manufacture (tolerances); 3.2.9 Design for manufacture; maths: costing and break-even. Process capability (Cpk) is beyond the spec." } },
  missions: [
    { title: "One phone stand", q: "You need just one stand. Which process is cheapest? Why is injection moulding so expensive for one?", hint: "3D printing: about £6 with no tooling. Injection moulding needs a £12,000 steel mould, so one part costs over £12,000.", setup() { set({ qty: 1, proc: "print" }); } },
    { title: "A million stands", q: "Now make a million. Which process is cheapest per stand now?", hint: "Injection moulding: the £12,000 tool adds only 1.2p per part, and each part costs about 80p. 3D printing would still be £6 each and take centuries on one printer.", setup() { set({ qty: 1e6, proc: "inj" }); } },
    { title: "Where's the crossover?", q: "Compare 3D printing with injection moulding on the cost graph. At what quantity do they cost the same?", hint: "Break-even quantity = difference in tooling ÷ difference in cost per part = 12,000 ÷ (6.10 − 0.80) ≈ 2,260 stands. Below that, print; above, mould.", setup() { set({ qty: 2000, proc: "inj", compare: "print" }); } },
    { title: "Scales of production", q: "Slide the quantity from 1 to a million. Which process wins at each scale?", hint: "Up to about 10: 3D printing. About 10–250: laser-cut acrylic (small batch). About 250–6,000: vacuum forming (batch). Above about 6,000: injection moulding (mass). Each has a range where it is cheapest; CNC is never cheapest here, but it is the most accurate.", setup() { set({ qty: 50, proc: "laser" }); } },
    { title: "Within tolerance?", q: "Make vacuum-formed stands with a tolerance of ±0.10 mm. How many are rejected? Which process could meet the tolerance?", hint: "Vacuum forming varies by ±0.2 mm (SD), so most parts fail ±0.10. CNC (σ = 0.02 mm) or injection moulding (0.04 mm) easily meet it: choose the process for the accuracy needed, not just the cost.", setup() { set({ proc: "vac", qty: 500 }); } },
    { lvl: "adv", title: "Catch the drift", q: "Turn on tool wear. Watch the control chart. When should production stop and the tool be reset?", hint: "The mean creeps upwards. Stop when points pass the warning or action lines (or several in a row on one side), before parts leave the tolerance: quality control catches the problem, quality assurance prevents it.", setup() { set({ proc: "inj", wear: 0.5, qty: 5000 }); } },
    { lvl: "adv", title: "Capability", q: "For injection moulding, tighten the tolerance until rejects appear. What is Cpk at that point?", hint: "Rejects become noticeable as Cpk falls below about 1 (tolerance = 3σ = ±0.12 mm). Industry usually wants Cpk ≥ 1.33.", setup() { set({ proc: "inj", tol: 0.15 }); } }
  ],
  batch: [
    { title: "Cost per unit and quantity", question: "How does the cost of each injection-moulded stand fall as more are made?", how: "Tooling £12,000; cost per part £0.80, varying ±5% with material prices.", xLabel: "quantity (log₁₀)", yLabel: "cost per unit (£, log₁₀)", xs: [1, 2, 3, 4, 5, 6], reps: 5, theory: x => Math.log10(12000 / 10 ** x + 0.8), theoryLabel: "tooling ÷ n + cost per part", run: (x, r) => Math.log10(12000 / 10 ** x + 0.8 * (1 + 0.05 * r.gauss())), note: "On log scales the cost falls in a straight line (tooling dominates) until it levels off at the cost per part (80p): beyond about 100,000 parts more volume hardly helps." },
    { title: "3D print or mould?", question: "How does the cost of a moulded stand compare with a printed one at different quantities?", how: "Ratio of cost per unit, injection moulding ÷ 3D printing; part costs ±5%.", xLabel: "quantity (log₁₀)", yLabel: "moulding cost ÷ printing cost", xs: [2, 2.5, 3, 3.25, 3.5, 3.75, 4, 5], reps: 5, yMin: 0, theory: x => unitCost(byK("inj"), 10 ** x) / unitCost(byK("print"), 10 ** x), theoryLabel: "exact ratio", run: (x, r) => (12000 / 10 ** x + 0.8 * (1 + 0.05 * r.gauss())) / (6.1 * (1 + 0.05 * r.gauss())), note: "The ratio crosses 1 at about 2,260 parts (10^3.35): the break-even quantity = 12,000 ÷ (6.10 − 0.80)." },
    { title: "Tolerance and rejects", question: "How does the reject rate depend on the tolerance for injection-moulded parts?", how: "σ = 0.04 mm, no drift; 1,000 parts per run.", xLabel: "tolerance ± (mm)", yLabel: "parts rejected (%)", xs: [0.02, 0.04, 0.06, 0.08, 0.1, 0.12], reps: 5, yMin: 0, theory: t => 100 * rejectFrac(t, 0.04), theoryLabel: "2Φ(−tolerance ÷ σ)", run: (t, r) => { let n = 0; for (let i = 0; i < 1000; i++) if (Math.abs(0.04 * r.gauss()) > t) n++; return n / 10; }, note: "±1σ rejects 32%, ±2σ 4.6%, ±3σ 0.3%. A tolerance tighter than the process can hold means expensive scrap; designers specify only the accuracy the product needs." },
    { title: "Measuring capability (A level)", question: "If Cpk is estimated from 30 measured parts, how close is it to the true value?", how: "Tolerance ±0.10 mm, injection moulding σ = 0.04 mm, no drift: true Cpk = 0.10 ÷ (3 × 0.04) = 0.83.", yLabel: "Cpk from 30 parts", reps: 300, bins: 20, theory: 0.1 / 0.12, theoryLabel: "true Cpk", run: (x, r) => { const v = []; for (let i = 0; i < 30; i++) v.push(0.04 * r.gauss()); return (0.1 - Math.abs(K.mean(v))) / (3 * K.sd(v)); }, note: "Thirty parts give Cpk to about ±15%, and on average a little low (chance offsets in the sample mean count as drift): small samples can make a process look better or worse than it is. That is why capability studies use many parts." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "8552 3.2", text: "Scales of production: one-off/prototype (bespoke, skilled labour, high unit cost), batch (set quantities, jigs and templates), mass (large numbers, automated, low unit cost), continuous (24/7, e.g. bottles, sheet materials)." },
      { lvl: "std", tag: "8552 3.2", text: "Injection moulding: expensive mould, very low cost per part, fast and accurate: mass production. Vacuum forming: cheap mould, batch production of thin shells. 3D printing and laser cutting: no tooling, prototypes and one-offs." },
      { lvl: "std", tag: "8552 3.2", text: "Tolerance: the permitted variation in a dimension (e.g. 60 ± 0.1 mm). Quality control checks products against it (go/no-go gauges, measuring samples)." },
      { lvl: "adv", tag: "7552 3.1.6", text: "Quality control inspects products and rejects faults; quality assurance builds quality into every stage (procedures, training, ISO 9001) to prevent faults. Statistical process control plots samples on control charts to spot drift." },
      { lvl: "adv", tag: "7552 3.2.9", text: "Design for manufacture: choose a process to suit the quantity, material and accuracy; reduce parts and operations; allow draft angles and even wall thickness for moulding; break-even quantity = Δtooling ÷ Δcost per part." },
      { lvl: "beyond", tag: "Beyond", text: "Process capability Cpk = (half-tolerance − |offset|) ÷ 3σ. Cpk ≥ 1.33 usually wanted (fewer than about 63 parts per million rejected)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => { const p = byK(P.proc); return `${p.name}: tooling ${gbp(p.tool)}, ${gbp(vc(p))} per part. Calculate the cost per unit for ${P.qty.toLocaleString()} stands.`; }, ans: () => { const p = byK(P.proc); return `<ul><li>${gbp(p.tool)} ÷ ${P.qty.toLocaleString()} + ${gbp(vc(p))}</li><li>= ${gbp(unitCost(p, P.qty))}</li></ul>`; } },
      { lvl: "std", marks: 4, q: "Explain why injection moulding is used for mass production but not for prototypes.", ans: "<ul><li>The steel mould is very expensive (1) so the cost is only low per part when spread over many thousands (1).</li><li>Each part is cheap and quick to make, accurate and repeatable (1); a prototype is one part whose design may change, so 3D printing with no tooling is better (1).</li></ul>" },
      { lvl: "adv", marks: 3, q: "Process A: tooling £800, £3.20 per part. Process B: tooling £5,000, £1.10 per part. Above what quantity is B cheaper?", ans: "<ul><li>800 + 3.20n = 5,000 + 1.10n (1)</li><li>2.10n = 4,200 (1)</li><li>n = 2,000 parts (1)</li></ul>" },
      { lvl: "adv", marks: 6, q: "Discuss the difference between quality control and quality assurance in the manufacture of a moulded product.", ans: "<ul><li>QC: inspection of parts/samples against tolerances, control charts, rejecting faulty parts; reactive.</li><li>QA: procedures, mould maintenance, training, supplier checks, standards (ISO 9001); proactive, prevents faults.</li><li>Both needed; QA reduces cost of scrap; QC detects drift such as tool wear.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Cost per unit = tooling ÷ quantity + (material + machine time + labour per part). Days to make = lead time (tooling) + quantity × cycle time ÷ (8 h × number of machines).</li>
<li>Each part's measured size = 60.00 mm + drift + σ × a random normal number. A part is rejected if it is outside 60.00 ± tolerance. With tool wear on, the drift grows slowly until you reset the tool.</li>
<li>Control chart: the mean of each sample of 5 parts, with warning lines at ±2σ/√5 and action lines at ±3σ/√5 (σ = the process's known spread). Cpk = (tolerance − |drift|) ÷ 3σ.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Illustrative costs for one small polymer product; real quotes vary with material, size, complexity and supplier.</li><li>Costs per part don't fall with quantity (no bulk material discounts or learning), and tooling never wears out.</li><li>Every process makes the same design (in practice each needs its own design for manufacture).</li><li>Sizes vary normally; only one dimension is checked.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The order");
ctl.qty = K.slider(g, { label: "Quantity to make", min: 0, max: 6, step: 0.05, value: 3, fmt: v => Math.round(10 ** v).toLocaleString("en-GB"), on: v => { P.qty = Math.round(10 ** v); } });
ctl.proc = K.seg(g, { label: "Process", value: "inj", options: PROC.map(p => [p.k, p.name]), on: v => { P.proc = v; restart(); } });
ctl.compare = K.seg(g, { label: "Compare costs with", value: "print", options: PROC.map(p => [p.k, p.name.split(" ")[0]]), on: v => P.compare = v });
ctl.machines = K.slider(g, { label: "Machines working at once", min: 1, max: 20, step: 1, value: 1, on: v => P.machines = v });
g = ui.group("Quality");
ctl.tol = K.slider(g, { label: "Tolerance on the 60 mm width", min: 0.02, max: 0.5, step: 0.01, value: 0.1, fmt: v => "± " + v.toFixed(2) + " mm", on: v => P.tol = v });
ctl.wear = K.slider(g, { label: "Tool wear (A level)", min: 0, max: 1, step: 0.05, value: 0, fmt: v => v ? (v < 0.4 ? "slow" : v < 0.8 ? "medium" : "fast") : "none", on: v => P.wear = v });
let rr = K.row(g); K.btn(rr, "🔧 Reset the tool", () => { drift = 0; parts.push({ reset: true }); }, "primary"); K.btn(rr, "Clear", () => restart());
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
const read = K.readout(ui.group("Readings"), [["unit", "cost per unit"], ["total", "total cost of the order"], ["best", "cheapest process for this quantity"], ["be", "break-even with the compared process"], ["days", "time to make the order"], ["rej", "rejected so far (theory)"], ["cpk", "Cpk now (beyond spec)"]]);
function restart() { parts = []; drift = 0; made = 0; rejects = 0; belt = []; }
function set(o) { Object.assign(P, DEF, o); ctl.qty.set(Math.log10(Math.max(1, P.qty))); for (const k of ["proc", "compare", "machines", "tol", "wear", "speed"]) ctl[k].set(P[k]); restart(); }
// ---------------- Simulation: parts come off the machine and are measured ----------------
function tick(dt) {
  const p = byK(P.proc); tt += dt * P.speed * 6;
  while (tt >= 1) {
    tt -= 1; made++; drift += P.wear * p.sd * 0.012;
    const size = 60 + drift + p.sd * rnd.gauss(), ok = Math.abs(size - 60) <= P.tol; if (!ok) rejects++;
    parts.push({ n: made, size, ok }); if (parts.length > 400) parts.shift(); belt.push({ x: 0, ok, size }); if (belt.length > 14) belt.shift();
  }
  belt.forEach(b => b.x += dt * P.speed * 0.3);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, p = byK(P.proc); c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  TX(c, `${p.name} · ${P.qty.toLocaleString()} phone stands · ${p.scale}`, 20, 30, "#eef2f8", "left", "600 15px");
  // the machine, the conveyor and the gauge
  const my = h * 0.34, mx = 40; c.fillStyle = "#2b3a5c"; c.fillRect(mx, my - 60, 130, 110); c.fillStyle = p.col; c.fillRect(mx + 14, my - 46, 102, 26); TX(c, p.name.split(" ")[0], mx + 65, my - 28, "#0b1020", "center", "700 13px");
  TX(c, `tooling ${gbp(p.tool)}`, mx + 65, my, "#cfd8ea", "center", "12px"); TX(c, `${p.cyc < 1 ? p.cyc * 60 + " s" : p.cyc + " min"} per part`, mx + 65, my + 18, "#cfd8ea", "center", "12px"); TX(c, `${p.waste}% material wasted`, mx + 65, my + 36, "#8fa0bf", "center", "11px");
  const bx0 = mx + 140, bx1 = w * 0.62; c.fillStyle = "#1a2238"; c.fillRect(bx0, my + 20, bx1 - bx0, 16); for (let x = bx0; x < bx1; x += 22) { c.fillStyle = "#2a3550"; c.fillRect(x + ((performance.now() / 20) % 22), my + 22, 3, 12); }
  const gx = bx0 + (bx1 - bx0) * 0.55; c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.strokeRect(gx - 22, my - 40, 44, 56); c.lineWidth = 1; TX(c, "gauge", gx, my - 46, "#ffd166", "center", "11px");
  belt.forEach(b => { const x = bx0 + b.x * (bx1 - bx0); if (x > bx1) return; const measured = x > gx; c.fillStyle = measured ? (b.ok ? "#7ee787" : "#ff5c5c") : p.col; c.beginPath(); c.moveTo(x, my + 20); c.lineTo(x + 10, my - 2); c.lineTo(x + 26, my - 2); c.lineTo(x + 18, my + 20); c.fill(); if (measured && !b.ok) TX(c, "✗", x + 14, my - 8, "#ff5c5c", "center", "600 14px"); });
  TX(c, `last part: ${parts.length && parts[parts.length - 1].size ? parts[parts.length - 1].size.toFixed(3) + " mm" : "–"}`, gx, my + 54, "#cfd8ea", "center", "12px");
  // cost table for every process at this quantity
  const tx = 30, ty = h * 0.56; let y = ty;
  ["process", "tooling", "per part", "cost per unit", "order total", "time"].forEach((hd, i) => TX(c, hd, tx + [0, 260, 340, 440, 540, 620][i], y, "#8fa0bf", i ? "right" : "left", "11.5px"));
  const best = cheapest(P.qty);
  PROC.forEach((q, i) => { y = ty + 20 + i * 21; if (q === best) { c.fillStyle = "rgba(126,231,135,0.14)"; c.fillRect(tx - 4, y - 14, 630, 20); } c.fillStyle = q.col; c.fillRect(tx, y - 9, 9, 9); TX(c, q.name + (q.k === P.proc ? "  ◀" : ""), tx + 14, y, "#cfd8ea", "left", (q.k === P.proc ? "600 " : "") + "12px"); TX(c, gbp(q.tool), tx + 260, y, "#cfd8ea", "right", "12px"); TX(c, gbp(vc(q)), tx + 340, y, "#cfd8ea", "right", "12px"); TX(c, gbp(unitCost(q, P.qty)), tx + 440, y, q === best ? "#7ee787" : "#cfd8ea", "right", "600 12px"); TX(c, gbp(unitCost(q, P.qty) * P.qty), tx + 540, y, "#cfd8ea", "right", "12px"); const d = daysToMake(q, P.qty, P.machines); TX(c, d < 365 ? d.toFixed(d < 10 ? 1 : 0) + " days" : (d / 365).toFixed(1) + " years", tx + 620, y, d > 365 ? "#ff8a70" : "#cfd8ea", "right", "12px"); });
  TX(c, "green row = cheapest per unit at this quantity", tx, y + 22, "#8fa0bf", "left", "11px");
  // tolerance picture: the distribution of sizes against the tolerance band
  const dx = w * 0.66, dw = w - dx - 24, dy0 = 110, dh = h * 0.32, sp = Math.max(4 * p.sd + Math.abs(drift), P.tol * 1.4), X = v => dx + (v - 60 + sp) / (2 * sp) * dw;
  TX(c, "Sizes made (mm) and the tolerance", dx, dy0 - 10, "#eef2f8", "left", "600 12.5px");
  c.fillStyle = "rgba(126,231,135,0.12)"; c.fillRect(X(60 - P.tol), dy0, X(60 + P.tol) - X(60 - P.tol), dh);
  const recent = parts.filter(q => q.size).slice(-200), hg = K.histogram(recent.map(q => q.size), 24, 60 - sp, 60 + sp), hmax = Math.max(1, ...hg.pts.map(q => q[1]));
  hg.pts.forEach(([v, n]) => { c.fillStyle = Math.abs(v - 60) <= P.tol ? "#7ee787" : "#ff5c5c"; const bh = n / hmax * (dh - 20); c.fillRect(X(v - hg.w / 2) + 1, dy0 + dh - bh, X(v + hg.w / 2) - X(v - hg.w / 2) - 2, bh); });
  c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(dx, dy0 + dh); c.lineTo(dx + dw, dy0 + dh); c.stroke();
  [60 - P.tol, 60, 60 + P.tol].forEach(v => TX(c, v.toFixed(2), X(v), dy0 + dh + 14, "#8fa0bf", "center", "10.5px"));
}

// ---------------- Charts and readings ----------------
function charts() {
  const p = byK(P.proc), adv = ui.level === "adv";
  chA.opts.title = "Cost per unit against quantity"; chA.opts.xLabel = "quantity (log scale)"; chA.opts.yLabel = "£ per unit (log)";
  const ser = PROC.map(q => { const pts = []; for (let i = 0; i <= 60; i++) { const x = i / 10; pts.push([x, Math.log10(unitCost(q, 10 ** x))]); } return { pts, color: q.col, label: q.name.split(" ")[0], width: q.k === P.proc || q.k === P.compare ? 2.6 : 1.2, dash: q.k === P.proc || q.k === P.compare ? [] : [4, 3] }; });
  const a = byK(P.compare), dT = p.tool - a.tool, dV = vc(a) - vc(p), be = dV !== 0 && dT / dV > 0 ? dT / dV : null;
  chA.draw(ser, { xMin: 0, xMax: 6, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? (10 ** Math.round(v)).toLocaleString("en-GB") : "", yFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? "£" + (10 ** Math.round(v)).toLocaleString("en-GB") : "", vlines: [{ x: Math.log10(P.qty), color: "#fff", label: "now" }].concat(be ? [{ x: Math.log10(be), color: "#ffd166", label: "break-even", row: 1 }] : []) });
  // control chart: means of samples of 5
  chB.opts.title = adv ? "Control chart: mean of each sample of 5" : "Width of each part measured"; chB.opts.xLabel = "part number"; chB.opts.yLabel = "mm";
  const meas = parts.filter(q => q.size); let pts = [];
  if (adv) { for (let i = 0; i + 5 <= meas.length; i += 5) { const g5 = meas.slice(i, i + 5); pts.push([g5[4].n, K.mean(g5.map(q => q.size))]); } }
  else pts = meas.map(q => [q.n, q.size]);
  const s5 = p.sd / Math.sqrt(5), hl = [{ y: 60 + P.tol, color: "#ff5c5c", label: "tolerance" }, { y: 60 - P.tol, color: "#ff5c5c" }];
  if (adv) hl.push({ y: 60 + 3 * s5, color: "#ff8a70", label: "action" }, { y: 60 - 3 * s5, color: "#ff8a70" }, { y: 60 + 2 * s5, color: "#ffd166", label: "warning" }, { y: 60 - 2 * s5, color: "#ffd166" });
  chB.draw([{ pts, type: adv ? "line" : "dots", r: 2.5, color: p.col, label: p.name.split(" ")[0] }].concat(adv ? [{ pts, type: "dots", r: 3, color: p.col }] : []), { hlines: hl });
  const cpk = (P.tol - Math.abs(drift)) / (3 * p.sd), best = cheapest(P.qty), days = daysToMake(p, P.qty, P.machines);
  read.set("unit", gbp(unitCost(p, P.qty))); read.set("total", gbp(unitCost(p, P.qty) * P.qty)); read.set("best", best.name); read.set("be", be ? `${Math.round(be).toLocaleString()} parts` : "never (one is always cheaper)");
  read.set("days", days < 365 ? days.toFixed(1) + " working days" : (days / 250).toFixed(1) + " working years"); read.set("rej", `${made ? (100 * rejects / made).toFixed(1) : 0}% (${(100 * rejectFrac(P.tol, p.sd, drift)).toFixed(1)}%)`); read.set("cpk", cpk.toFixed(2) + (cpk >= 1.33 ? " capable" : cpk >= 1 ? " marginal" : " not capable"));
  ui.hud("cost per unit = tooling ÷ quantity + cost per part");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Slide the quantity: the cheapest process changes from 3D printing to injection moulding.", 7000);
