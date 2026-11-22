/* =====================================================================
   BRIDGE BUILDER
   A bridge here is a TRUSS: straight members joined by pins at joints.
   A pinned member can only be stretched (TENSION, drawn blue) or squashed
   (COMPRESSION, drawn red): it cannot bend. Every frame the computer finds
   the force in every member so that each joint is in equilibrium
   (the forces on it add up to zero), using the "stiffness method": each
   member is a very stiff spring, k = EA/L.
   A member fails if it is pulled harder than its material can take
   (tension), or pushed harder than it can take before it bends sideways
   and BUCKLES (compression): long, thin members buckle easily (Euler).
   ===================================================================== */

// ---------------------------------------------------------------- physics (no drawing: the Batch run uses this too)
const G = 9.81;
/* Materials. E = stiffness (Young modulus, Pa), A = cross-section area (m²), I = second moment of area (m⁴, resistance
   to bending, which sets the buckling load), sigma = strength (Pa), rho = density (kg/m³), cost in £ per metre. */
const MATS = {
  steel: { name: "Steel tube", E: 200e9, A: 0.004, I: 1.0e-5, sigma: 275e6, rho: 7850, cost: 250, maxL: 12, col: [0.62, 0.66, 0.72], w: 6 },
  timber: { name: "Timber beam", E: 11e9, A: 0.012, I: 1.2e-5, sigma: 25e6, rho: 500, cost: 60, maxL: 8, col: [0.78, 0.56, 0.32], w: 8 },
  cable: { name: "Steel cable", E: 160e9, A: 0.0006, I: 0, sigma: 1500e6, rho: 7850, cost: 80, maxL: 40, col: [0.85, 0.85, 0.80], w: 2.5, tensionOnly: true },
  road: { name: "Road deck", E: 200e9, A: 0.006, I: 2.0e-5, sigma: 275e6, rho: 7850, cost: 300, maxL: 12, col: [0.36, 0.36, 0.40], w: 10, extraMass: 600 },   // + 600 kg/m of concrete road surface
};
const JOINT_COST = 100;
const len = (A, B) => Math.hypot(B.x - A.x, B.y - A.y);
// What a member can carry before it fails: in tension σA; in compression the smaller of σA (crushing) and π²EI/L² (Euler buckling)
function capacity(mat, L) {
  const m = MATS[mat], T = m.sigma * m.A, C = m.tensionOnly ? 0 : Math.min(T, Math.PI * Math.PI * m.E * m.I / (L * L));
  return { T, C };
}
const memberMass = (mat, L) => (MATS[mat].rho * MATS[mat].A + (MATS[mat].extraMass || 0)) * L;

/* Solve the truss. nodes: [{x, y, fixed}], members: [{a, b, mat, broken}], loads: Float64Array(2 × nodes) in newtons (x, y).
   Builds the stiffness matrix K (one row per free joint direction), solves K u = F for the joint movements u, then each
   member's force N = (EA/L) × (how much it stretched). N > 0 is tension, N < 0 compression.
   Cables cannot push: any cable found in compression goes slack (taken out) and the truss is solved again.
   If K cannot be solved the structure is a MECHANISM: it can move without stretching any member (it is not braced by
   triangles), so it collapses. */
function solve(nodes, members, loads) {
  const idx = new Int32Array(nodes.length).fill(-1); let n = 0;
  nodes.forEach((p, i) => { if (!p.fixed) { idx[i] = n; n += 2; } });
  const slack = new Uint8Array(members.length);
  for (let pass = 0; pass < 8; pass++) {
    const Kd = new Float64Array(n * n), F = new Float64Array(n);
    nodes.forEach((p, i) => { if (idx[i] >= 0) { F[idx[i]] = loads[2 * i]; F[idx[i] + 1] = loads[2 * i + 1]; } });
    let used = new Uint8Array(nodes.length);
    members.forEach((m, k) => {
      if (m.broken || slack[k]) return;
      const A = nodes[m.a], B = nodes[m.b], L = len(A, B), c = (B.x - A.x) / L, s = (B.y - A.y) / L, kk = MATS[m.mat].E * MATS[m.mat].A / L;
      const e = [c * c, c * s, s * s], d = [idx[m.a], idx[m.b]]; used[m.a] = used[m.b] = 1;
      // the 4×4 member stiffness, added into the big matrix
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const sign = i === j ? 1 : -1, r = d[i], q = d[j]; if (r < 0 || q < 0) continue;
        Kd[r * n + q] += sign * kk * e[0]; Kd[r * n + q + 1] += sign * kk * e[1]; Kd[(r + 1) * n + q] += sign * kk * e[1]; Kd[(r + 1) * n + q + 1] += sign * kk * e[2];
      }
    });
    // a joint with no members at all is not part of the bridge: pin it so it does not count as a mechanism
    nodes.forEach((p, i) => { if (idx[i] >= 0 && !used[i]) { const r = idx[i]; Kd[r * n + r] = 1; Kd[(r + 1) * n + r + 1] = 1; F[r] = F[r + 1] = 0; } });
    const u = gauss(Kd, F, n);
    if (!u) return { ok: false, slack };
    const U = new Float64Array(2 * nodes.length); nodes.forEach((p, i) => { if (idx[i] >= 0) { U[2 * i] = u[idx[i]]; U[2 * i + 1] = u[idx[i] + 1]; } });
    const N = new Float64Array(members.length); let again = false;
    members.forEach((m, k) => {
      if (m.broken || slack[k]) return;
      const A = nodes[m.a], B = nodes[m.b], L = len(A, B), c = (B.x - A.x) / L, s = (B.y - A.y) / L;
      N[k] = MATS[m.mat].E * MATS[m.mat].A / L * ((U[2 * m.b] - U[2 * m.a]) * c + (U[2 * m.b + 1] - U[2 * m.a + 1]) * s);
      if (MATS[m.mat].tensionOnly && N[k] < -1e-6) { slack[k] = 1; again = true; }
    });
    if (again) continue;
    let umax = 0; for (let i = 0; i < U.length; i++) umax = Math.max(umax, Math.abs(U[i]));
    if (umax > 2) return { ok: false, slack };    // moves by metres: practically a mechanism
    return { ok: true, U, N, slack, umax };
  }
  return { ok: false, slack };
}
// Gaussian elimination with partial pivoting (the method you would use by hand for simultaneous equations). null if singular.
function gauss(A, b, n) {
  const M = A.slice(), x = b.slice(); let big = 0; for (let i = 0; i < n; i++) big = Math.max(big, Math.abs(M[i * n + i]));
  const tiny = big * 1e-10;
  for (let c = 0; c < n; c++) {
    let p = c, pv = Math.abs(M[c * n + c]); for (let r = c + 1; r < n; r++) { const v = Math.abs(M[r * n + c]); if (v > pv) { pv = v; p = r; } }
    if (pv <= tiny) return null;
    if (p !== c) { for (let k = 0; k < n; k++) { const t = M[c * n + k]; M[c * n + k] = M[p * n + k]; M[p * n + k] = t; } const t = x[c]; x[c] = x[p]; x[p] = t; }
    for (let r = c + 1; r < n; r++) { const f = M[r * n + c] / M[c * n + c]; if (!f) continue; for (let k = c; k < n; k++) M[r * n + k] -= f * M[c * n + k]; x[r] -= f * x[c]; }
  }
  for (let r = n - 1; r >= 0; r--) { let s = x[r]; for (let k = r + 1; k < n; k++) s -= M[r * n + k] * x[k]; x[r] = s / M[r * n + r]; }
  return x;
}
// How close each member is to failing: 1 = at its limit. strength (optional): a factor per member for manufacturing variation
function utilisation(nodes, members, N, k, strength) {
  const m = members[k]; if (m.broken) return 0; const L = len(nodes[m.a], nodes[m.b]), cap = capacity(m.mat, L), f = strength ? strength[k] : 1;
  if (N[k] >= 0) return N[k] / (cap.T * f);
  return cap.C > 0 ? -N[k] / (cap.C * f) : 0;
}
// Loads from the weight of the bridge itself: half of each member's weight on each of its two joints
function selfWeight(nodes, members) {
  const F = new Float64Array(2 * nodes.length);
  for (const m of members) { if (m.broken) continue; const w = memberMass(m.mat, len(nodes[m.a], nodes[m.b])) * G; F[2 * m.a + 1] -= w / 2; F[2 * m.b + 1] -= w / 2; }
  return F;
}
/* A vehicle's axle loads, shared between the two deck joints either side of each axle (the lever rule).
   deck: the deck joints in order from left to right. */
const VEHICLES = {
  car: { name: "Car (2 tonnes)", axles: [[0, 0.5], [2.6, 0.5]], mass: 2000, len: 4.2 },
  truck: { name: "Lorry (20 tonnes)", axles: [[0, 0.3], [4, 0.35], [5.3, 0.35]], mass: 20000, len: 7.5 },
  heavy: { name: "Heavy lorry (40 tonnes)", axles: [[0, 0.2], [4, 0.2], [5.3, 0.2], [9, 0.2], [10.3, 0.2]], mass: 40000, len: 12 },
};
function vehicleLoads(nodes, deck, veh, front, F) {
  for (const [back, share] of VEHICLES[veh].axles) {
    const x = front - back, W = VEHICLES[veh].mass * share * G;
    for (let i = 0; i < deck.length - 1; i++) {
      const A = nodes[deck[i]], B = nodes[deck[i + 1]];
      if (x >= A.x && x <= B.x) { const f = (x - A.x) / (B.x - A.x); F[2 * deck[i] + 1] -= W * (1 - f); F[2 * deck[i + 1] + 1] -= W * f; break; }
    }
  }
  return F;
}
// Cost: every member by length and material, plus each extra joint you add (the deck joints and anchors come free)
function cost(nodes, members) {
  let c = 0; for (const m of members) c += MATS[m.mat].cost * len(nodes[m.a], nodes[m.b]);
  return c + JOINT_COST * nodes.filter(p => !p.fixed && !p.deck).length;
}

/* ---- Ready-made trusses (also used by the Batch run). Deck joints along y = 0 from x = 0 to span; the two ends are pinned.
   type: "warren" (zig-zag), "pratt" (verticals, diagonals sloping down towards the middle: they are in tension),
   "howe" (diagonals the other way: in compression), "arch" (an arch below the deck, springing from low anchors),
   "stayed" (cables from tall towers), "boxes" (squares with no diagonals: a mechanism). */
function makeDesign(type, span, panels, depth, mat = "steel") {
  const nodes = [], members = [], p = span / panels, deck = [];
  const add = (x, y, o = {}) => { nodes.push(Object.assign({ x: +x.toFixed(3), y: +y.toFixed(3), fixed: false }, o)); return nodes.length - 1; };
  const bar = (a, b, m = mat) => members.push({ a, b, mat: m, broken: false });
  for (let i = 0; i <= panels; i++) deck.push(add(i * p, 0, { deck: true, fixed: i === 0 || i === panels }));
  for (let i = 0; i < panels; i++) { bar(deck[i], deck[i + 1], "road"); members[members.length - 1].road = true; }
  if (type === "warren") {
    const top = []; for (let i = 0; i < panels; i++) top.push(add((i + 0.5) * p, depth));
    for (let i = 0; i < panels; i++) { bar(deck[i], top[i]); bar(top[i], deck[i + 1]); if (i) bar(top[i - 1], top[i]); }
  } else if (type === "pratt" || type === "howe" || type === "boxes") {
    const top = [null]; for (let i = 1; i < panels; i++) top.push(add(i * p, depth));
    bar(deck[0], top[1]); bar(top[panels - 1], deck[panels]);
    for (let i = 1; i < panels; i++) { bar(deck[i], top[i]); if (i > 1) bar(top[i - 1], top[i]); }
    if (type !== "boxes") for (let i = 1; i < panels - 1; i++) {
      const leftHalf = i < panels / 2;
      if (type === "pratt") leftHalf ? bar(top[i], deck[i + 1]) : bar(deck[i], top[i + 1]);
      else leftHalf ? bar(deck[i], top[i + 1]) : bar(top[i], deck[i + 1]);
    }
  } else if (type === "arch") {
    // a polygonal (roughly parabolic) arch below the deck, springing from anchors at (0, −depth) and (span, −depth),
    // with a post up to each deck joint and one diagonal per panel so that every panel is made of triangles
    const arch = [add(0, -depth, { fixed: true, anchor: true })];
    for (let i = 1; i < panels; i++) { const x = i * p, y = -depth * (1 - 4 * (x / span) * (1 - x / span)); arch.push(y > -0.3 ? deck[i] : add(x, y)); }
    arch.push(add(span, -depth, { fixed: true, anchor: true }));
    const have = new Set(), link = (u, v, m) => { if (u === v) return; const k = Math.min(u, v) + "-" + Math.max(u, v); if (!have.has(k)) { have.add(k); bar(u, v, m); } };
    for (let i = 0; i < panels; i++) link(arch[i], arch[i + 1]);
    for (let i = 1; i < panels; i++) link(arch[i], deck[i]);
    for (let i = 0; i < panels; i++) { if (i < panels / 2) link(arch[i], deck[i + 1]); else link(deck[i], arch[i + 1]); }
  } else if (type === "stayed") {
    // cables fan out from tower tops above each end of the bridge down to the deck joints
    const TL = add(0, depth, { fixed: true, anchor: true }), TR = add(span, depth, { fixed: true, anchor: true });
    for (let i = 1; i < panels; i++) bar(i <= panels / 2 ? TL : TR, deck[i], "cable");
  }
  return { nodes, members, deck };
}
// Breaking load of a design for a single load at the middle deck joint (linear analysis: forces grow in proportion to the load)
function breakingLoad(d, strength) {
  const mid = d.deck[Math.floor(d.deck.length / 2)], F = new Float64Array(2 * d.nodes.length); F[2 * mid + 1] = -1e5;   // 100 kN test load
  const r = solve(d.nodes, d.members, F); if (!r.ok) return 0;
  let worst = 0; for (let k = 0; k < d.members.length; k++) worst = Math.max(worst, utilisation(d.nodes, d.members, r.N, k, strength));
  return worst > 0 ? 100 / worst : Infinity;     // kN
}
// ---------------------------------------------------------------- end of physics

/* ---- Levels: span, deck panel length, vehicle, budget and extra anchor points (low on the cliff faces for an arch,
   or on top of towers for cables). Each budget was checked: there is a design that passes for less. */
const LEVELS = {
  l1: { name: "1 · First crossing", span: 12, panels: 3, veh: "car", budget: 6000, low: 3, tower: 0, goal: "Get the car across for less than £6,000." },
  l2: { name: "2 · Lorry route", span: 24, panels: 6, veh: "truck", budget: 24000, low: 4, tower: 0, goal: "Carry a 20-tonne lorry for less than £24,000." },
  l3: { name: "3 · The gorge", span: 40, panels: 10, veh: "truck", budget: 42000, low: 8, tower: 0, goal: "Cross the 40 m gorge for less than £42,000 (hint: the low anchors)." },
  l4: { name: "4 · Cable country", span: 48, panels: 12, veh: "truck", budget: 35000, low: 0, tower: 16, goal: "Span 48 m for less than £35,000 (hint: the tower tops)." },
  sandbox: { name: "Sandbox", span: 24, panels: 6, veh: "truck", budget: 0, low: 8, tower: 16, goal: "" },
};

// ---------------------------------------------------------------- page state
const S = {};
let lvKey = "l2", lv = LEVELS.l2, nodes = [], members = [], deck = [], mode = "build";   // "build", "test", "passed", "collapse"
let mat = "steel", tool = "build", undo = [], res = null, strength = null, vehX = 0, hist = { u: [], d: [] }, speed = 1, exag = 30, showF = false;
let sparks = [], drag = null, hover = null, msg = "", collapse = null, frame = 0, passedCost = 0;
const VSPEED = 7;   // the vehicle drives at 7 m/s (about 16 mph)

const ui = K.app({
  title: "Bridge Builder", subject: "Engineering", blurb: "Build a truss, drive a lorry over it, and see every member pull or push until something gives.",
  reset: () => backToBuild(),
  missions: [
    { title: "Squares wobble, triangles don't", q: "This bridge is made of squares. Press <b>▶ Drive across</b>. What happens? Now add one diagonal across each square (drag from corner to corner) and try again.",
      hint: "A square of pinned members can fold flat like a parallelogram without any member changing length: it is a mechanism. A triangle cannot change shape unless a member stretches or squashes, so trusses are built from triangles. The page warns 'Wobbly!' when your structure is a mechanism.",
      setup: () => { setLevel("l2"); loadExample("boxes"); } },
    { title: "First crossing", q: "Level 1: get the car over the 12 m gap for less than £6,000. Steel is strong but expensive; timber is cheap but weak, especially when squashed.",
      hint: "A timber Warren truss (zig-zag) about 3 m deep does it for about £5,700. Keep timber members short where they are in compression (red): long thin members buckle.",
      setup: () => { setLevel("l1"); } },
    { title: "Blue or red?", q: "Load the Pratt truss and drive the lorry across. Which members are blue (in tension: being stretched) and which are red (in compression: being squashed)? Then load the Howe truss. What changed?",
      hint: "Like a beam, a truss bends: the top chord is squashed (red) and the bottom chord (the road) is stretched (blue). In a Pratt truss the diagonals slope down towards the middle and are in tension; in a Howe truss they slope the other way and are in compression. Engineers put steel where there is compression and cheaper cables or rods where there is tension.",
      setup: () => { setLevel("l2"); loadExample("pratt"); } },
    { title: "Lorry route", q: "Level 2: carry a 20-tonne lorry over 24 m for less than £24,000.",
      hint: "Timber is too weak for the lorry. A steel Pratt or Howe truss about 3 m deep costs about £23,000. Hover over members to see the force in each and how close it is to breaking.",
      setup: () => { setLevel("l2"); } },
    { title: "How deep should a truss be?", q: "In the Sandbox, load a Pratt truss and change its depth from 1 m to 8 m. Watch the worst member's utilisation as the lorry crosses. Is deeper always better?",
      hint: "Deeper trusses have smaller chord forces (force ≈ bending moment ÷ depth), so at first deeper is stronger. But the vertical members get longer, and long members in compression buckle (Euler: buckling load ∝ 1/L²). There is a best depth, about 5 m here. The Batch run maps it.",
      setup: () => { setLevel("sandbox"); S.depth.set(2, true); loadExample("pratt"); } },
    { title: "Timber or steel?", q: "Load the Warren truss in timber and send the lorry. Which member breaks first, and is it stretched or squashed?",
      hint: "A squashed (red) top-chord member buckles first: often before the lorry even gets there, under the bridge's own weight. Timber is reasonably strong in tension, but a long timber strut buckles at a low load because timber is not very stiff (small E). Then the forces flow round the gap, the next member is overloaded, and the bridge collapses in a chain.",
      setup: () => { setLevel("l2"); S.mat.set("timber", true); loadExample("warren"); } },
    { title: "Arch over the gorge", q: "Level 3: 40 m for less than £42,000. A truss on top of the deck costs too much. Try the low anchors on the cliff faces.",
      hint: "An arch below the deck pushes outwards and downwards on the cliffs, which are strong. Almost every arch member is in compression (red), and the posts hold the road up. The Example 'Arch below' about 8 m deep costs about £41,000.",
      setup: () => { setLevel("l3"); } },
    { title: "Cables can only pull", q: "Level 4: 48 m for less than £35,000. Hang the road from the tower tops with steel cables.",
      hint: "Cables are strong and cheap for their strength, but only in tension: push on one and it goes slack (shown dashed). A fan of cables from each tower (cable-stayed, like the Queensferry Crossing) carries the deck. The road itself is squeezed (red) by the cables pulling inwards.",
      setup: () => { setLevel("l4"); S.mat.set("cable", true); } },
  ],
  batch: [
    { title: "Breaking load vs depth", question: "How does making a truss deeper change the load it can carry?", how: "A steel Pratt truss, 24 m long with 6 panels, loaded at the middle until the first member fails (no self weight). Every member's strength varies randomly by ±5%, as real steel does.",
      xLabel: "depth of the truss (m)", yLabel: "breaking load (kN)", xs: [1, 2, 3, 4, 5, 6, 7, 8, 10], reps: 5, yMin: 0,
      run: (x, r) => { const d = makeDesign("pratt", 24, 6, x); return breakingLoad(d, d.members.map(() => 1 + 0.05 * r.gauss())); },
      theory: x => 4 * x * capacity("steel", 4).C / 24 / 1000, theoryLabel: "beam theory: top chord fails (P = 4hC/L)",
      note: "Beam theory treats the truss as a beam: the bending moment at the middle (PL/4) is carried by the two chords, a distance h apart, so the chord force is PL/(4h). That predicts a straight line. It works until about 5 m; deeper than that the long vertical members buckle first (buckling load ∝ 1/length²) and the truss gets weaker." },
    { title: "Breaking load vs number of panels", question: "Does chopping the truss into more, shorter panels make it stronger?", how: "Steel Pratt truss, 24 m long and 3 m deep, loaded at the middle. Member strengths vary by ±5%.",
      xLabel: "number of panels", yLabel: "breaking load (kN)", xs: [4, 6, 8, 10, 12], reps: 5, yMin: 0,
      run: (x, r) => { const d = makeDesign("pratt", 24, x, 3); return breakingLoad(d, d.members.map(() => 1 + 0.05 * r.gauss())); },
      theory: x => 4 * 3 * capacity("steel", 24 / x).C / 24 / 1000, theoryLabel: "beam theory with Euler buckling of the top chord",
      note: "With few panels the top-chord members are long and buckle at low loads (π²EI/L²). Shorter panels raise the buckling load until it is more than the steel's crushing strength σA; after that, more panels add cost but no strength." },
    { title: "Which shape gives most for the money?", question: "Which kind of bridge carries the most load per £1000 spent?", how: "24 m span, 6 panels, all steel: 1 = Warren, 2 = Pratt, 3 = Howe (each 4 m deep), 4 = arch below (4 m), 5 = cable-stayed from 14 m towers. Load at the middle; member strengths vary by ±5%.",
      xLabel: "design (1 Warren, 2 Pratt, 3 Howe, 4 arch, 5 cable-stayed)", yLabel: "breaking load per £1000 (kN)", xs: [1, 2, 3, 4, 5], reps: 5, yMin: 0,
      run: (x, r) => { const d = makeDesign(["warren", "pratt", "howe", "arch", "stayed"][x - 1], 24, 6, x === 5 ? 14 : 4); return breakingLoad(d, d.members.map(() => 1 + 0.05 * r.gauss())) / (cost(d.nodes, d.members) / 1000); },
      note: "The cable-stayed design wins on this measure because cables use steel in tension, where none of it is wasted resisting buckling, and the towers (free here) do a lot of work. Real towers and anchorages are expensive, which is why short bridges are trusses or arches." },
    { title: "The weakest link", question: "If every member's strength varies a little, how much does the breaking load vary?", how: "A steel Pratt truss (24 m, 6 panels, 3 m deep), loaded at the middle, 200 times. Each time, every member's strength is changed randomly by about ±5%.",
      xLabel: "", yLabel: "breaking load (kN)", reps: 200, bins: 24,
      run: (x, r) => { const d = makeDesign("pratt", 24, 6, 3); return breakingLoad(d, d.members.map(() => 1 + 0.05 * r.gauss())); },
      theory: (() => breakingLoad(makeDesign("pratt", 24, 6, 3)))(), theoryLabel: "every member exactly as designed",
      note: "A truss fails when its first member fails. Here the two middle top-chord members carry the same, biggest force, so the bridge breaks at whichever of the two is weaker: the breaking load is usually a little below the design value, and the mean sits to the left of the theory line. More equally loaded members, more chances of a weak one: this is one reason engineers apply safety factors." },
    { title: "Sag vs load", question: "How far does the middle of the bridge sag as the load increases?", how: "Steel Pratt truss, 24 m, 6 panels, 3 m deep; a load of the given mass near the middle (placed within ±0.3 m at random); no self weight. We measure the middle joint's sag.",
      xLabel: "load (tonnes)", yLabel: "sag at the middle (mm)", xs: [5, 10, 20, 30, 40], reps: 4, yMin: 0,
      run: (x, r) => { const d = makeDesign("pratt", 24, 6, 3), F = new Float64Array(2 * d.nodes.length), xm = 12 + 0.3 * (2 * r() - 1), i = 3 - (xm < 12 ? 1 : 0), A = d.nodes[d.deck[i]], B = d.nodes[d.deck[i + 1]], f = (xm - A.x) / (B.x - A.x), W = x * 1000 * G;
        F[2 * d.deck[i] + 1] -= W * (1 - f); F[2 * d.deck[i + 1] + 1] -= W * f; const q = solve(d.nodes, d.members, F); return q.ok ? -q.U[2 * d.deck[3] + 1] * 1000 : null; },
      theory: x => { const P = x * 1000 * G, A1 = MATS.steel.A, A2 = MATS.road.A, I = A1 * A2 / (A1 + A2) * 9; return P * 24 ** 3 / (48 * 200e9 * I) * 1000; }, theoryLabel: "beam theory, δ = PL³/48EI (chords only)",
      note: "Sag is proportional to load (Hooke's law for the whole bridge), so the points lie on a straight line through the origin. Beam theory only counts the stretching of the two chords; the real truss sags more because the diagonals and verticals stretch too." },
  ],
  notes: `<h3>What is being calculated</h3><p>Every member is treated as a very stiff spring (stiffness <code>k = EA/L</code>: Young modulus × area ÷ length). The computer writes down, for every joint, that the forces on it add up to zero, and solves these simultaneous equations (the <b>stiffness method</b>, by Gaussian elimination) for how far each joint moves. Each member's force follows from how much it was stretched or squashed. The joints' movements are tiny (millimetres), so they are drawn exaggerated (see "Show the sag").</p>
  <h3>Tension and compression</h3><p>Blue members are in <b>tension</b> (pulled), red members in <b>compression</b> (pushed); the brighter the colour, the closer the member is to failing. A member in tension fails when the force exceeds its strength × area, <code>σA</code>. In compression it fails at the smaller of <code>σA</code> (crushing) and the Euler buckling load <code>π²EI/L²</code>: double a member's length and it buckles at a quarter of the load. Cables cannot push at all: they go slack.</p>
  <h3>Mechanisms</h3><p>If the equations cannot be solved, the structure can move without stretching any member: it is a mechanism (usually a square without a diagonal). It collapses. When a member breaks, the forces are worked out again without it; often a neighbour is then overloaded and the failure spreads. Once the bridge is a mechanism it falls, drawn with a simple falling-joints simulation.</p>
  <h3>Materials</h3><table style="width:100%;font-size:12.5px;color:var(--text);border-collapse:collapse"><tr><th></th><th>E (GPa)</th><th>area (cm²)</th><th>strength (MPa)</th><th>£ per m</th><th>max length</th></tr>
  <tr><td>Steel tube</td><td>200</td><td>40</td><td>275</td><td>250</td><td>12 m</td></tr><tr><td>Timber</td><td>11</td><td>120</td><td>25</td><td>60</td><td>8 m</td></tr><tr><td>Steel cable</td><td>160</td><td>6</td><td>1500 (tension only)</td><td>80</td><td>40 m</td></tr><tr><td>Road deck</td><td>200</td><td>60</td><td>275</td><td>300</td><td>–</td></tr></table>
  <p>Each extra joint costs £${JOINT_COST}. The road has 600 kg of concrete surface per metre as well as its steel.</p>
  <h3>Assumptions and simplifications</h3><ul><li>Joints are frictionless pins, so members carry only tension or compression, never bending.</li><li>Loads act only at joints: each axle's weight is shared between the two deck joints either side of it (the lever rule).</li><li>Static: the lorry drives slowly, so there is no bouncing or impact.</li><li>Small movements: the forces are worked out for the bridge's unloaded shape (fine while joints move millimetres).</li><li>Every member of a material has the same cross-section.</li><li>The bridge is flat (2-D): in reality there are two trusses side by side, braced together, and the load is shared between them.</li><li>Members that buckle or snap are removed instantly; real ones may bend first.</li><li>The anchors (cliff tops, cliff faces, tower tops) are perfectly rigid.</li><li>No wind, temperature or fatigue.</li></ul>
  <h3>Mouse</h3><p>Drag from a joint to an empty spot or another joint to add a member (snaps to a 1 m grid). Right-click (or choose Delete) to remove a member or joint. Hover to see a member's force.</p>`,
});

// ---------------------------------------------------------------- controls
let g = ui.group("Level");
S.level = K.seg(g, { value: lvKey, options: Object.entries(LEVELS).map(([k, v]) => [k, v.name]), on: v => setLevel(v) });
const goalNote = K.note(g, "");
const gSand = K.row(g);
S.span = K.slider(g, { label: "Span (sandbox)", min: 8, max: 60, step: 4, value: 24, fmt: v => v + " m (" + v / 4 + " panels)", on: v => { LEVELS.sandbox.span = v; LEVELS.sandbox.panels = v / 4; setLevel("sandbox"); } });
S.veh = K.seg(g, { label: "Vehicle (sandbox)", value: "truck", options: Object.entries(VEHICLES).map(([k, v]) => [k, v.name.split(" (")[0]]), on: v => { LEVELS.sandbox.veh = v; backToBuild(); } });

g = ui.group("Build");
S.mat = K.seg(g, { label: "Material for new members", value: mat, options: [["steel", "Steel"], ["timber", "Timber"], ["cable", "Cable"]], on: v => mat = v });
const matNote = K.note(g, "");
S.tool = K.seg(g, { label: "Mouse", value: tool, options: [["build", "Build"], ["delete", "Delete"]], on: v => tool = v });
{ const r = K.row(g); K.btn(r, "↶ Undo", () => doUndo()); K.btn(r, "Clear", () => { save(); baseLevel(); }); K.btn(r, "All → " , () => { save(); for (const m of members) if (!m.road) m.mat = mat; changed(); }).title = "Change every member to the chosen material"; }
K.note(g, "Drag from a joint to add a member. Right-click to delete.");

g = ui.group("Example designs");
S.ex = K.seg(g, { value: "pratt", options: [["warren", "Warren"], ["pratt", "Pratt"], ["howe", "Howe"], ["arch", "Arch below"], ["stayed", "Cable-stayed"], ["boxes", "Squares"]] });
S.depth = K.slider(g, { label: "Truss depth", min: 1, max: 10, step: 0.5, value: 3, fmt: v => v + " m" });
{ const r = K.row(g); K.btn(r, "Load example", () => loadExample(S.ex.value)); }
const exNote = K.note(g, "");

g = ui.group("Test");
{ const r = K.row(g); S.go = K.btn(r, "▶ Drive across", () => startTest(), "primary"); K.btn(r, "↺ Back to building", () => backToBuild()); }
S.exag = K.slider(g, { label: "Show the sag", min: 1, max: 200, step: 1, value: 30, fmt: v => "× " + v + (v === 1 ? " (true size)" : " (exaggerated)"), on: v => exag = v, tip: "Real sags are millimetres; this multiplies them so you can see the shape." });
S.forces = K.toggle(g, { label: "Label every member with its force", value: false, on: v => showF = v });
S.speed = K.slider(g, { label: "Speed", min: 0.25, max: 3, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(S.speed);

g = ui.group("Measurements");
const read = K.readout(g, [["cost", "Cost"], ["n", "Members"], ["worst", "Worst member now"], ["sag", "Biggest sag"], ["state", "Status"], ["veh", "Vehicle"]]);
const chA = K.chart(ui.dock, { title: "How close the worst member is to breaking", xLabel: "position of the vehicle's front (m)", yLabel: "% of its limit" });
const chB = K.chart(ui.dock, { title: "Sag", xLabel: "position of the vehicle's front (m)", yLabel: "biggest sag (mm)" });

// ---------------------------------------------------------------- building the bridge
function setLevel(k) {
  lvKey = k; lv = LEVELS[k]; S.level.set(k);
  S.span.el.style.display = S.veh.el.style.display = k === "sandbox" ? "" : "none";
  goalNote.innerHTML = lv.goal ? "<b>Goal:</b> " + lv.goal : "Any span, any vehicle, no budget.";
  exNote.innerHTML = (lv.low ? `Arch anchors ${lv.low} m down the cliffs. ` : "Arch below needs the low anchors (Levels 1–3, Sandbox). ") + (lv.tower ? `Towers ${lv.tower} m tall.` : "Cable-stayed needs towers (Level 4, Sandbox).");
  undo = []; baseLevel(); fitView();
}
// the deck joints and road, plus the anchors: everything the level gives you for free
function baseLevel() {
  const d = makeDesign("road", lv.span, lv.panels, 0); nodes = d.nodes; members = d.members; deck = d.deck;
  if (lv.low) { nodes.push({ x: 0, y: -lv.low, fixed: true, anchor: true }, { x: lv.span, y: -lv.low, fixed: true, anchor: true }); }
  if (lv.tower) { nodes.push({ x: 0, y: lv.tower, fixed: true, anchor: true, tower: true }, { x: lv.span, y: lv.tower, fixed: true, anchor: true, tower: true }); }
  backToBuild(); changed();
}
function loadExample(type) {
  save();
  if (type === "arch" && !lv.low) { ui.tip("This level has no low anchors for an arch. Try Level 3 or the Sandbox."); return; }
  if (type === "stayed" && !lv.tower) { ui.tip("This level has no towers. Try Level 4 or the Sandbox."); return; }
  const d = makeDesign(type, lv.span, lv.panels, type === "arch" ? lv.low : type === "stayed" ? lv.tower : S.depth.value, type === "stayed" ? "cable" : mat);
  // merge the design's anchors with the level's own anchors, so nothing is duplicated
  nodes = d.nodes; members = d.members; deck = d.deck;
  const want = [];
  if (lv.low) want.push([0, -lv.low], [lv.span, -lv.low]); if (lv.tower) want.push([0, lv.tower], [lv.span, lv.tower]);
  for (const [x, y] of want) if (!nodes.some(p => p.fixed && Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6)) nodes.push({ x, y, fixed: true, anchor: true, tower: y > 0 });
  nodes.forEach(p => { if (p.fixed && p.y > 0) p.tower = true; });
  S.ex.set(type); backToBuild(); changed();
}
function save() { undo.push(JSON.stringify({ nodes, members, deck })); if (undo.length > 60) undo.shift(); }
function doUndo() { const s = undo.pop(); if (!s) return; const o = JSON.parse(s); nodes = o.nodes; members = o.members; deck = o.deck; backToBuild(); changed(); }
// after any change: work out the forces from the bridge's own weight (with the vehicle parked off the bridge)
function changed() { members.forEach(m => m.broken = false); strength = null; analyse(-100); }
function analyse(front) {
  const F = selfWeight(nodes, members); if (front > -50) vehicleLoads(nodes, deck, lv.veh, front, F);
  res = solve(nodes, members, F); return res;
}
function addMember(a, b) {
  if (a === b) return false;
  if (members.some(m => !m.broken && ((m.a === a && m.b === b) || (m.a === b && m.b === a)))) return false;
  const L = len(nodes[a], nodes[b]); if (L > MATS[mat].maxL + 1e-9) { ui.tip(`Too long: ${MATS[mat].name} members can be at most ${MATS[mat].maxL} m (this one is ${L.toFixed(1)} m).`); return false; }
  if (nodes[a].fixed && nodes[b].fixed) return false;
  members.push({ a, b, mat, broken: false }); return true;
}
function removeAt(p) {
  const m = pickMember(p); const j = pickNode(p);
  if (j != null && !nodes[j].fixed && !nodes[j].deck) { save(); members = members.filter(q => q.a !== j && q.b !== j); dropNode(j); changed(); return; }
  if (m != null && !members[m].road) { save(); members.splice(m, 1); tidy(); changed(); }
}
function dropNode(j) { nodes.splice(j, 1); for (const m of members) { if (m.a > j) m.a--; if (m.b > j) m.b--; } deck = deck.map(d => d > j ? d - 1 : d); }
function tidy() { for (let j = nodes.length - 1; j >= 0; j--) if (!nodes[j].fixed && !nodes[j].deck && !members.some(m => m.a === j || m.b === j)) dropNode(j); }

// ---------------------------------------------------------------- testing: drive the vehicle across
function startTest() {
  changed(); if (!res.ok) { ui.tip("<b>Wobbly!</b> This structure is a mechanism: it can fold up without stretching any member. Add diagonals to make triangles."); collapseStart(); return; }
  mode = "test"; vehX = -1; hist = { u: [], d: [] }; sparks = []; ui.setPlaying(true);
  // real members are not all identical: each gets a strength within about ±3% of the design value
  const r = K.rng(Date.now() % 1e6); strength = members.map(() => 1 + 0.03 * r.gauss());
}
function backToBuild() { mode = "build"; collapse = null; vehX = -VEHICLES[lv.veh].len - 2; members.forEach(m => m.broken = false); hist = { u: [], d: [] }; sparks = []; msg = ""; if (nodes.length) analyse(-100); }
function worstNow() { let w = 0, k = -1; if (res && res.ok) for (let i = 0; i < members.length; i++) { const u = utilisation(nodes, members, res.N, i, strength); if (u > w) { w = u; k = i; } } return { w, k }; }
function step(dt) {
  if (mode === "collapse") { collapseStep(dt * speed); return; }
  if (mode !== "test") return;
  vehX += VSPEED * dt * speed;
  analyse(vehX);
  // break overloaded members one at a time (the worst first), working the forces out again after each break
  for (let n = 0; n < 20; n++) {
    if (!res.ok) { collapseStart(); return; }
    const { w, k } = worstNow(); if (w <= 1) break;
    breakMember(k, res.N[k] < 0 ? "buckled" : "snapped"); analyse(vehX);
  }
  const w = worstNow().w; let sag = 0; for (let i = 0; i < nodes.length; i++) sag = Math.max(sag, -res.U[2 * i + 1]);
  hist.u.push([vehX, w * 100]); hist.d.push([vehX, sag * 1000]);
  if (vehX - VEHICLES[lv.veh].len > lv.span + 1) {
    mode = "passed"; passedCost = cost(nodes, members);
    const ok = !lv.budget || passedCost <= lv.budget;
    msg = ok ? `✓ <b>The ${VEHICLES[lv.veh].name.split(" (")[0].toLowerCase()} made it!</b> Cost £${Math.round(passedCost).toLocaleString()}${lv.budget ? " (budget £" + lv.budget.toLocaleString() + ")" : ""}.` : `It crossed, but cost £${Math.round(passedCost).toLocaleString()}: over the £${lv.budget.toLocaleString()} budget. Can you do it more cheaply?`;
    ui.tip(msg, 7000);
  }
}
function breakMember(k, how) {
  const m = members[k]; m.broken = true; m.how = how;
  const A = nodes[m.a], B = nodes[m.b], r = Math.random;
  for (let i = 0; i < 26; i++) { const f = 0.3 + 0.4 * r(); sparks.push({ x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, vx: (r() - .5) * 8, vy: r() * 6, life: 1, hot: true }); }
  ui.tip(`💥 A ${MATS[m.mat].name.toLowerCase()} ${how}!`, 2500);
}
/* Collapse: once the bridge is a mechanism it falls. Joints become point masses under gravity; each surviving member keeps
   its length (a "position-based" simulation, nudging joints back to the right distances several times per step). */
function collapseStart() {
  mode = "collapse"; const U = res && res.ok ? res.U : null;
  collapse = { p: nodes.map((q, i) => ({ x: q.x, y: q.y, px: q.x, py: q.y, fixed: q.fixed })), t: 0, veh: null, splash: false };
  // where the vehicle is: which deck member, and how far along
  const vx = vehX - VEHICLES[lv.veh].len / 2;
  for (let i = 0; i < deck.length - 1; i++) { const A = nodes[deck[i]], B = nodes[deck[i + 1]]; if (vx >= A.x && vx <= B.x) collapse.veh = { a: deck[i], b: deck[i + 1], f: (vx - A.x) / (B.x - A.x) }; }
  if (!collapse.veh && vehX > -1) collapse.vehFree = { x: vx, y: 0.6, vy: 0 };
  ui.tip(!members.some(m => m.broken) ? "<b>Wobbly!</b> It folds up under its own weight." : vehX < 0 ? "It cannot even hold up its own weight!" : "The bridge is collapsing!", 4000);
}
function collapseStep(dt) {
  const C = collapse, h = Math.min(dt, 1 / 30) / 4, riverY = -riverDepth();
  for (let s = 0; s < 4; s++) {
    for (const q of C.p) { if (q.fixed) continue; const vx = (q.x - q.px) * 0.999, vy = (q.y - q.py) * 0.999; q.px = q.x; q.py = q.y; q.x += vx; q.y += vy - G * h * h; if (q.y < riverY + 0.3) { q.y = riverY + 0.3; q.px = q.x - vx * 0.3; if (!C.splash) { C.splash = true; splash(q.x, riverY); } } }
    for (let it = 0; it < 6; it++) for (const m of members) {
      if (m.broken) continue; const A = C.p[m.a], B = C.p[m.b], L0 = len(nodes[m.a], nodes[m.b]), dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1e-9;
      if (L > L0 * (m.road ? 1.004 : 1.02)) { m.broken = true; continue; }   // stretched too far while falling: it tears apart
      const wa = A.fixed ? 0 : 1, wb = B.fixed ? 0 : 1; if (!wa && !wb) continue; const c = (L - L0) / L / (wa + wb);
      A.x += dx * c * wa; A.y += dy * c * wa; B.x -= dx * c * wb; B.y -= dy * c * wb;
    }
  }
  if (C.veh && members.some(m => m.broken && ((m.a === C.veh.a && m.b === C.veh.b) || (m.a === C.veh.b && m.b === C.veh.a)))) { const A = C.p[C.veh.a], B = C.p[C.veh.b]; C.vehFree = { x: A.x + (B.x - A.x) * C.veh.f, y: A.y + (B.y - A.y) * C.veh.f + 0.2, vy: 0 }; C.veh = null; }
  if (C.vehFree) { C.vehFree.vy -= G * dt; C.vehFree.y += C.vehFree.vy * dt; if (C.vehFree.y < riverY) { if (!C.splash) splash(C.vehFree.x, riverY); C.splash = true; C.vehFree.y = riverY; } }
  C.t += dt;
}
function splash(x, y) { for (let i = 0; i < 60; i++) sparks.push({ x: x + (Math.random() - .5) * 3, y, vx: (Math.random() - .5) * 6, vy: 3 + Math.random() * 7, life: 1.4, hot: false }); }
const riverDepth = () => Math.max(6, (lv.low || 0) + 3, lv.span * 0.3);

// ---------------------------------------------------------------- camera (world in metres, y up)
const cam = { x: 12, y: 0, s: 20 };
const cv = ui.canvas(() => { if (!cam.fitted) requestAnimationFrame(fitView); });
function fitView() {
  if (cv.w < 10) return; cam.fitted = true;
  const x0 = -7, x1 = lv.span + 7, y0 = -riverDepth() - 1.5, y1 = Math.max(lv.tower + 3, 9);
  cam.s = Math.min(cv.w / (x1 - x0), cv.h / (y1 - y0)); cam.x = (x0 + x1) / 2; cam.y = (y0 + y1) / 2;
}
const SX = x => cv.w / 2 + (x - cam.x) * cam.s, SY = y => cv.h / 2 - (y - cam.y) * cam.s, WX = px => cam.x + (px - cv.w / 2) / cam.s, WY = py => cam.y - (py - cv.h / 2) / cam.s;
// where each joint is drawn: its real position plus its (exaggerated) movement, or its falling position in a collapse
function drawPos(i) {
  if (mode === "collapse" && collapse) return [collapse.p[i].x, collapse.p[i].y];
  const q = nodes[i]; if (res && res.ok && res.U) return [q.x + res.U[2 * i] * exag, q.y + res.U[2 * i + 1] * exag];
  return [q.x, q.y];
}
// member colour: its material, turning blue (tension) or red (compression) as it approaches its limit
function memberColour(k) {
  const m = members[k], base = MATS[m.mat].col; if (!res || !res.ok || mode === "collapse") return [...base, 0];
  const u = Math.min(1.2, utilisation(nodes, members, res.N, k, strength)), t = res.N[k] >= 0, sc = t ? [0.3, 0.62, 1] : [1, 0.28, 0.22], f = Math.min(1, u * 1.15);
  return [base[0] + (sc[0] - base[0]) * f, base[1] + (sc[1] - base[1]) * f, base[2] + (sc[2] - base[2]) * f, u];
}

// ---------------------------------------------------------------- WebGL drawing
/* The scene shader paints, at every pixel: the sky and sun, far hills, the two cliffs (layered rock with grass on top),
   the river with moving ripples, the towers, and in build mode a faint 1 m grid. */
const BG_FS = `precision highp float;
uniform vec2 uRes, uO; uniform float uDpr, uS, uSpan, uRiver, uTower, uLow, uTime, uGrid;
float hash(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec2 px = gl_FragCoord.xy / uDpr, w = (px - uO) / uS;                 // w: world position in metres
  float sy = px.y / uRes.y;
  vec3 col = mix(vec3(0.98, 0.78, 0.55), vec3(0.22, 0.45, 0.78), smoothstep(0.15, 0.95, sy));   // evening sky
  // two layers of distant hills, with the sun above them
  float h1 = 1.5 + 5.0 * fbm(vec2(w.x * 0.03 + 3.0, 1.0)), h2 = 0.3 + 3.0 * fbm(vec2(w.x * 0.06 + 9.0, 2.0));
  vec2 sun = vec2(uRes.x * 0.8, uRes.y * 0.86); float ds = length(px - sun);
  col += vec3(1.0, 0.8, 0.5) * (exp(-ds / 40.0) * 0.9 + exp(-ds / 260.0) * 0.25);
  col = mix(col, vec3(1.0, 0.97, 0.9), 1.0 - smoothstep(22.0, 24.0, ds));
  if (w.y < h1) col = mix(col, vec3(0.42, 0.50, 0.66), 0.9);
  if (w.y < h2) col = mix(col, vec3(0.30, 0.40, 0.50), 0.85);
  // looking down into the gorge: the far wall, darker and greener the deeper it goes
  if (w.y < 0.0) { float dd = clamp(-w.y / max(1.0, -uRiver), 0.0, 1.0); col = mix(vec3(0.28, 0.36, 0.34), vec3(0.12, 0.18, 0.2), dd) * (0.85 + 0.15 * fbm(w * 0.4)); }
  // river between the cliffs
  if (w.y < uRiver) {
    float wave = sin(w.x * 1.7 + uTime * 1.6) * 0.5 + sin(w.x * 3.1 - uTime * 2.3 + w.y * 4.0) * 0.5;
    col = mix(vec3(0.10, 0.32, 0.45), vec3(0.04, 0.14, 0.24), clamp((uRiver - w.y) / 6.0, 0.0, 1.0));
    col += vec3(0.25, 0.35, 0.4) * smoothstep(0.75, 1.0, wave) * exp(-(uRiver - w.y) * 0.8);
    col += vec3(0.9, 0.95, 1.0) * (1.0 - smoothstep(0.0, 0.12, uRiver - w.y)) * 0.6;   // bright surface line
  }
  // cliffs: rock faces that wobble a little, strata, and grass on top
  float eL = -0.6 * fbm(vec2(w.y * 0.35, 4.0));
  float eR = uSpan + 0.6 * fbm(vec2(w.y * 0.35, 8.0));
  bool rock = w.y < 0.0 && (w.x < eL || w.x > eR);
  if (rock) {
    float st = fbm(vec2(w.x * 0.15, w.y * 1.2)), lay = 0.5 + 0.5 * sin(w.y * 2.2 + st * 4.0);
    col = mix(vec3(0.42, 0.33, 0.26), vec3(0.62, 0.50, 0.38), lay * 0.6 + st * 0.4);
    float edge = min(abs(w.x - eL), abs(w.x - eR)); col *= 0.75 + 0.25 * smoothstep(0.0, 1.5, edge);
    if (w.y > -0.45) col = mix(vec3(0.30, 0.55, 0.22), vec3(0.42, 0.68, 0.28), noise(w * 6.0));
  }
  // towers on the cliff tops
  if (uTower > 0.0 && w.y > 0.0 && w.y < uTower + 0.5 && ((w.x > -1.4 && w.x < 0.3) || (w.x > uSpan - 0.3 && w.x < uSpan + 1.4))) {
    float side = w.x < uSpan * 0.5 ? (w.x + 1.4) / 1.7 : (w.x - uSpan + 0.3) / 1.7;
    col = vec3(0.72, 0.72, 0.70) * (0.8 + 0.2 * sin(side * 3.14)) * (0.92 + 0.08 * noise(w * 3.0));
  }
  // build grid: faint dots at every metre in the gap
  if (uGrid > 0.5 && !rock && w.x > -2.0 && w.x < uSpan + 2.0) {
    vec2 f = abs(fract(w + 0.5) - 0.5) * uS; float d = length(f);
    col = mix(col, vec3(1.0), (1.0 - smoothstep(0.6, 1.6, d)) * 0.35);
  }
  gl_FragColor = vec4(col, 1.0);
}`;
// members: a quad per member, shaded like a rounded bar; timber has grain, a slack cable is dashed
const BAR_VS = `attribute vec2 aPos; attribute vec4 aCol; attribute vec3 aUv; uniform vec2 uRes; varying vec4 vCol; varying vec3 vUv;
void main() { vCol = aCol; vUv = aUv; gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0); }`;
const BAR_FS = `precision mediump float; varying vec4 vCol; varying vec3 vUv; uniform float uGlow;
void main() {
  float a = abs(vUv.x);
  if (uGlow > 0.5) { float g = exp(-a * a * 3.0); gl_FragColor = vec4(vCol.rgb * g * vCol.a, 1.0); return; }
  if (a > 1.0) discard;
  float shade = 0.55 + 0.45 * sqrt(1.0 - a * a) + 0.25 * (1.0 - smoothstep(0.0, 0.35, abs(vUv.x + 0.45)));   // round bar with a highlight
  vec3 c = vCol.rgb * shade;
  if (vUv.z > 0.5 && vUv.z < 1.5) c *= 0.85 + 0.15 * sin(vUv.y * 0.9 + vUv.x * 2.0);    // timber grain
  if (vUv.z > 2.5 && vUv.z < 3.5 && fract(vUv.y / 7.0) > 0.55) discard;                     // slack cable: dashed
  if (vUv.z > 3.5) c = mix(c, vec3(0.95, 0.9, 0.5), (1.0 - smoothstep(0.0, 0.15, abs(vUv.x - 0.05))) * step(0.5, fract(vUv.y / 18.0)) * 0.7);   // road: dashed centre line
  gl_FragColor = vec4(c, 1.0);
}`;
const PT_VS = `attribute vec2 aPos; attribute vec4 aCol; attribute float aSize; uniform vec2 uRes, uDpr2; varying vec4 vCol;
void main() { vCol = aCol; gl_PointSize = aSize * uDpr2.x; gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0); }`;
const PT_FS = `precision mediump float; varying vec4 vCol; uniform float uSoft;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q); if (r > 1.0) discard;
  if (uSoft > 0.5) { gl_FragColor = vec4(vCol.rgb * vCol.a * exp(-r * r * 3.0), 1.0); return; }
  vec3 c = mix(vCol.rgb, vCol.rgb * 0.45, smoothstep(0.55, 0.75, r)); c += 0.25 * (1.0 - smoothstep(0.0, 0.5, length(q + 0.35)));
  gl_FragColor = vec4(c, 1.0); }`;
const gv = K.gl.create(ui.stage, { dprMax: 2, fallback: "No WebGL here: drawing a simpler picture without the graphics card.", onLost: () => { glOn = false; } });
ui.stage.insertBefore(gv.el, ui.stage.firstChild);   // the WebGL picture underneath; the 2D canvas (vehicle, labels, mouse) on top
let glOn = false; const P = {};
if (gv.ok) {
  try { const gl = gv.gl; P.bg = K.gl.program(gl, K.gl.QUAD_VS, BG_FS); P.bar = K.gl.program(gl, BAR_VS, BAR_FS); P.pt = K.gl.program(gl, PT_VS, PT_FS); P.quad = K.gl.quad(gl); P.geo = K.gl.points(gl, { aPos: 2, aCol: 4, aUv: 3 }); P.pts = K.gl.points(gl, { aPos: 2, aCol: 4, aSize: 1 }); glOn = true; }
  catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly: drawing a simpler picture without it."); }
}
function barGeometry(widthScale, glow) {
  const pos = [], col = [], uv = [];
  members.forEach((m, k) => {
    if (m.broken) return; const [ax, ay] = drawPos(m.a), [bx, by] = drawPos(m.b), x0 = SX(ax), y0 = SY(ay), x1 = SX(bx), y1 = SY(by);
    const c = memberColour(k); if (glow && c[3] < 0.6) return;
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, w = MATS[m.mat].w * widthScale * (glow ? 2.6 : 0.5) * Math.max(0.6, Math.min(1.6, cam.s / 22));
    const kind = m.mat === "timber" ? 1 : m.mat === "cable" ? (res && res.slack && res.slack[k] ? 3 : 2) : m.mat === "road" ? 4 : 0;
    const a = glow ? Math.min(1, (c[3] - 0.6) * 2.5) * (c[3] > 0.9 ? 0.75 + 0.25 * Math.sin(performance.now() / 90) : 1) : 1;
    const P4 = [[x0 + nx * w, y0 + ny * w, 1, 0], [x0 - nx * w, y0 - ny * w, -1, 0], [x1 + nx * w, y1 + ny * w, 1, L], [x1 - nx * w, y1 - ny * w, -1, L]];
    for (const i of [0, 1, 2, 2, 1, 3]) { pos.push(P4[i][0], P4[i][1]); col.push(c[0], c[1], c[2], a); uv.push(P4[i][2], P4[i][3], kind); }
  });
  return { pos, col, uv };
}
function glDraw() {
  const gl = gv.gl, W = cv.w, H = cv.h;
  gl.viewport(0, 0, gv.el.width, gv.el.height); gl.disable(gl.BLEND);
  P.bg.set({ uRes: [W, H], uDpr: gv.el.width / W, uO: [SX(0), H - SY(0)], uS: cam.s, uSpan: lv.span, uRiver: -riverDepth(), uTower: lv.tower, uLow: lv.low, uTime: performance.now() / 1000, uGrid: mode === "build" ? 1 : 0 });
  P.quad.draw(P.bg, null);
  const drawBars = (ws, glow) => { const b = barGeometry(ws, glow); if (!b.pos.length) return; P.geo.set("aPos", new Float32Array(b.pos)); P.geo.set("aCol", new Float32Array(b.col)); P.geo.set("aUv", new Float32Array(b.uv)); P.bar.set({ uRes: [W, H], uGlow: glow ? 1 : 0 }); P.geo.draw(P.bar, b.pos.length / 2, gl.TRIANGLES); };
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); drawBars(1, true);     // glow round members near their limit
  gl.disable(gl.BLEND); drawBars(1, false);
  // joints
  const pp = [], pc = [], ps = [], zoom = Math.max(0.7, Math.min(1.5, cam.s / 22));
  nodes.forEach((q, i) => { const [x, y] = drawPos(i); pp.push(SX(x), SY(y)); const c = q.fixed ? [0.95, 0.75, 0.3] : q.deck ? [0.75, 0.78, 0.85] : [0.92, 0.94, 1]; pc.push(...c, 1); ps.push((q.fixed ? 11 : 8) * zoom + (hover && hover.node === i ? 4 : 0)); });
  if (pp.length) { P.pts.set("aPos", new Float32Array(pp)); P.pts.set("aCol", new Float32Array(pc)); P.pts.set("aSize", new Float32Array(ps)); P.pt.set({ uRes: [W, H], uDpr2: [gv.el.width / W, 0], uSoft: 0 }); P.pts.draw(P.pt, pp.length / 2, gl.POINTS); }
  // sparks from snapping members, and the splash
  if (sparks.length) {
    const sp = [], sc = [], ss = []; for (const s of sparks) { sp.push(SX(s.x), SY(s.y)); if (s.hot) sc.push(1, 0.75 * s.life + 0.2, 0.3 * s.life, s.life); else sc.push(0.75, 0.88, 1, s.life * 0.8); ss.push(s.hot ? 7 : 9); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); P.pts.set("aPos", new Float32Array(sp)); P.pts.set("aCol", new Float32Array(sc)); P.pts.set("aSize", new Float32Array(ss)); P.pt.set({ uRes: [W, H], uDpr2: [gv.el.width / W, 0], uSoft: 1 }); P.pts.draw(P.pt, sp.length / 2, gl.POINTS); gl.disable(gl.BLEND);
  }
}

// ---------------------------------------------------------------- the 2D layer: vehicle, anchors, labels, tooltips (and the whole picture without WebGL)
function draw2DScene(c) {   // only when WebGL is not available
  const W = cv.w, H = cv.h, rv = SY(-riverDepth()); c.fillStyle = "#9cc3e6"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#2a5d78"; c.fillRect(0, rv, W, H - rv);
  c.fillStyle = "#8a6a50"; c.fillRect(0, SY(0), SX(0), H); c.fillRect(SX(lv.span), SY(0), W, H);
  c.fillStyle = "#4f8a35"; c.fillRect(0, SY(0), SX(0), 6); c.fillRect(SX(lv.span), SY(0), W, 6);
  if (lv.tower) { c.fillStyle = "#b8b8b4"; c.fillRect(SX(-1.4), SY(lv.tower), 1.7 * cam.s, lv.tower * cam.s); c.fillRect(SX(lv.span - 0.3), SY(lv.tower), 1.7 * cam.s, lv.tower * cam.s); }
  members.forEach((m, k) => { if (m.broken) return; const [ax, ay] = drawPos(m.a), [bx, by] = drawPos(m.b), col = memberColour(k); c.strokeStyle = `rgb(${col.slice(0, 3).map(v => v * 255 | 0)})`; c.lineWidth = MATS[m.mat].w * 0.9; c.beginPath(); c.moveTo(SX(ax), SY(ay)); c.lineTo(SX(bx), SY(by)); c.stroke(); });
  nodes.forEach((q, i) => { const [x, y] = drawPos(i); c.fillStyle = q.fixed ? "#f2c04d" : "#eef"; c.beginPath(); c.arc(SX(x), SY(y), q.fixed ? 5 : 4, 0, 6.3); c.fill(); });
  for (const s of sparks) { c.fillStyle = s.hot ? "rgba(255,190,80," + s.life + ")" : "rgba(200,230,255," + s.life + ")"; c.fillRect(SX(s.x) - 2, SY(s.y) - 2, 4, 4); }
}
function deckY(x) {   // height of the (drawn, sagging) road surface at x
  for (let i = 0; i < deck.length - 1; i++) { const [ax, ay] = drawPos(deck[i]), [bx, by] = drawPos(deck[i + 1]); if (x >= ax - 1e-9 && x <= bx + 1e-9) return ay + (by - ay) * (x - ax) / (bx - ax || 1); }
  return 0;
}
function drawVehicle(c) {
  const V = VEHICLES[lv.veh], zoomR = 0.45; let x0, y0, ang = 0;   // x0, y0: the middle of the vehicle's base
  if (mode === "collapse" && collapse) {
    if (collapse.veh) { const A = collapse.p[collapse.veh.a], B = collapse.p[collapse.veh.b], f = collapse.veh.f; x0 = A.x + (B.x - A.x) * f; y0 = A.y + (B.y - A.y) * f + 0.2; ang = Math.atan2(B.y - A.y, B.x - A.x); }
    else if (collapse.vehFree) { x0 = collapse.vehFree.x; y0 = collapse.vehFree.y; }
    else return;
  } else {
    const front = mode === "build" ? -0.6 : vehX, back = front - V.len; x0 = (front + back) / 2;
    const yb = x => x < 0 || x > lv.span ? 0 : deckY(x); y0 = (yb(front) + yb(back)) / 2 + 0.2; ang = Math.atan2(yb(front) - yb(back), V.len);
  }
  c.save(); c.translate(SX(x0), SY(y0)); c.rotate(-ang); const s = cam.s, L = V.len * s;
  const body = lv.veh === "car" ? "#e2553f" : lv.veh === "truck" ? "#3d7bd9" : "#7b5cd6";
  c.fillStyle = "#222"; for (const [back] of V.axles) { const x = (V.len / 2 - back) * s - (lv.veh === "car" ? 0.8 * s : 0.9 * s); c.beginPath(); c.arc(x, -zoomR * s, zoomR * s, 0, 6.3); c.fill(); }
  if (lv.veh === "car") { c.fillStyle = body; c.beginPath(); c.roundRect(-L / 2, -1.45 * s, L, 0.85 * s, 0.25 * s); c.fill(); c.beginPath(); c.roundRect(-L / 4, -2.05 * s, L * 0.5, 0.7 * s, 0.3 * s); c.fill(); c.fillStyle = "#bfe3ff"; c.fillRect(-L / 4 + 0.25 * s, -1.9 * s, L * 0.5 - 0.5 * s, 0.4 * s); }
  else { const cab = 1.9 * s; c.fillStyle = body; c.beginPath(); c.roundRect(L / 2 - cab, -2.9 * s, cab, 2.3 * s, 0.2 * s); c.fill(); c.fillStyle = "#bfe3ff"; c.fillRect(L / 2 - cab * 0.55, -2.6 * s, cab * 0.45, 0.8 * s); c.fillStyle = lv.veh === "truck" ? "#e9edf3" : "#d8d2ee"; c.fillRect(-L / 2, -3.3 * s, L - cab - 0.15 * s, 2.7 * s); c.fillStyle = "#555"; c.fillRect(-L / 2, -0.75 * s, L, 0.2 * s); }
  c.restore();
}
function drawOverlay() {
  const c = cv.ctx, W = cv.w, H = cv.h; c.clearRect(0, 0, W, H);
  if (glOn && gv.ok) glDraw(); else draw2DScene(c);
  // anchors: a small hatched base under each fixed joint
  c.strokeStyle = "rgba(40,30,20,.85)"; c.fillStyle = "rgba(242,192,77,.9)"; c.lineWidth = 1.5;
  nodes.forEach((q, i) => { if (!q.fixed) return; const [x, y] = drawPos(i), px = SX(x), py = SY(y), r = Math.max(6, cam.s * 0.35); c.beginPath(); c.moveTo(px, py); c.lineTo(px - r, py + r * 1.3); c.lineTo(px + r, py + r * 1.3); c.closePath(); c.globalAlpha = 0.65; c.fill(); c.globalAlpha = 1; c.stroke(); });
  drawVehicle(c);
  // force labels
  c.font = "11px Segoe UI,system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  if (showF && res && res.ok && mode !== "collapse") members.forEach((m, k) => {
    if (m.broken) return; const [ax, ay] = drawPos(m.a), [bx, by] = drawPos(m.b), N = res.N[k] / 1000, txt = (Math.abs(N) < 0.5 ? "0" : Math.abs(N).toFixed(0)) + (N > 0.5 ? " T" : N < -0.5 ? " C" : "");
    const x = SX((ax + bx) / 2), y = SY((ay + by) / 2); c.fillStyle = "rgba(10,14,24,.72)"; const w = c.measureText(txt).width + 8; c.fillRect(x - w / 2, y - 8, w, 16); c.fillStyle = N > 0.5 ? "#9fd0ff" : N < -0.5 ? "#ffb3a8" : "#ddd"; c.fillText(txt, x, y);
  });
  // the member being drawn
  if (drag && drag.type === "new") {
    const A = nodes[drag.a], [tx, ty] = drag.to, L = Math.hypot(tx - A.x, ty - A.y), ok = L <= MATS[mat].maxL + 1e-9 && L > 0.1;
    c.strokeStyle = ok ? "rgba(126,231,135,.95)" : "rgba(255,107,129,.95)"; c.setLineDash([6, 4]); c.lineWidth = 3; c.beginPath(); c.moveTo(SX(A.x), SY(A.y)); c.lineTo(SX(tx), SY(ty)); c.stroke(); c.setLineDash([]);
    c.fillStyle = ok ? "#7ee787" : "#ff6b81"; c.beginPath(); c.arc(SX(tx), SY(ty), 5, 0, 6.3); c.fill();
    c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText(`${L.toFixed(1)} m · £${Math.round(L * MATS[mat].cost)}${ok ? "" : " · too long"}`, SX(tx) + 10, SY(ty) - 12); c.textAlign = "center";
  }
  // tooltip for the member under the mouse
  if (hover && hover.member != null && !drag && res && res.ok && mode !== "collapse") {
    const k = hover.member, m = members[k]; if (!m.broken) {
      const L = len(nodes[m.a], nodes[m.b]), cap = capacity(m.mat, L), N = res.N[k], u = utilisation(nodes, members, res.N, k, strength), slack = res.slack && res.slack[k];
      const lines = [`${MATS[m.mat].name}, ${L.toFixed(2)} m`, slack ? "slack (a cable cannot push)" : Math.abs(N) < 50 ? "no force" : `${N > 0 ? "tension (stretched)" : "compression (squashed)"}: ${(Math.abs(N) / 1000).toFixed(1)} kN`,
        `can take ${(cap.T / 1000).toFixed(0)} kN pulling, ${cap.C ? (cap.C / 1000).toFixed(0) + " kN pushing" + (cap.C < cap.T - 1 ? " (buckling)" : "") : "0 pushing"}`, `${(u * 100).toFixed(0)}% of its limit`];
      c.font = "12px Segoe UI,system-ui,sans-serif"; const w = Math.max(...lines.map(t => c.measureText(t).width)) + 16, x = Math.min(W - w - 6, hover.px + 14), y = Math.max(6, hover.py - 70);
      c.fillStyle = "rgba(8,12,24,.88)"; c.beginPath(); c.roundRect(x, y, w, lines.length * 17 + 10, 6); c.fill(); c.textAlign = "left"; c.textBaseline = "top";
      lines.forEach((t, i) => { c.fillStyle = i === 1 ? (N > 0 ? "#9fd0ff" : "#ffb3a8") : i === 3 ? (u > 1 ? "#ff6b81" : u > 0.8 ? "#ffd166" : "#cfe") : "#e8edf6"; c.fillText(t, x + 8, y + 6 + i * 17); });
      c.textBaseline = "middle"; c.textAlign = "center";
    }
  }
  hud();
}
function hud() {
  const co = cost(nodes, members), over = lv.budget && co > lv.budget, lines = [];
  if (lv.goal) lines.push(`<b>Goal:</b> ${lv.goal}`);
  lines.push(`Cost: <b style="color:${over ? "#ff6b81" : "#7ee787"}">£${Math.round(co).toLocaleString()}</b>${lv.budget ? " of £" + lv.budget.toLocaleString() : ""}`);
  if (mode === "build") lines.push(res && !res.ok ? "<b style='color:#ff6b81'>Wobbly!</b> A mechanism: add diagonals to make triangles." : "Building: press <b>▶ Drive across</b> to test");
  else if (mode === "test") lines.push(`${VEHICLES[lv.veh].name} crossing…`);
  else if (mode === "passed") lines.push(msg);
  else if (mode === "collapse") lines.push("<b style='color:#ff6b81'>Collapsed.</b> ↺ Back to building, then strengthen the members that failed.");
  ui.hud(lines.join("<br>"));
}

// ---------------------------------------------------------------- mouse
function pickNode(p, tol = 13) { let best = null, bd = tol; nodes.forEach((q, i) => { const [x, y] = drawPos(i), d = Math.hypot(SX(x) - p.x, SY(y) - p.y); if (d < bd) { bd = d; best = i; } }); return best; }
function pickMember(p, tol = 8) {
  let best = null, bd = tol;
  members.forEach((m, k) => { if (m.broken) return; const [ax, ay] = drawPos(m.a), [bx, by] = drawPos(m.b), x0 = SX(ax), y0 = SY(ay), x1 = SX(bx), y1 = SY(by), dx = x1 - x0, dy = y1 - y0, t = K.clamp(((p.x - x0) * dx + (p.y - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1), d = Math.hypot(p.x - x0 - t * dx, p.y - y0 - t * dy); if (d < bd) { bd = d; best = k; } });
  return best;
}
const snap = p => { const j = pickNode(p); if (j != null) return [nodes[j].x, nodes[j].y, j]; return [Math.round(WX(p.x)), Math.round(WY(p.y)), null]; };
K.pointer(cv.el, {
  down(p) {
    if (mode !== "build") { if (mode === "passed" || mode === "collapse") { backToBuild(); } else return; }
    if (p.e.button === 2 || tool === "delete") { removeAt(p); return; }
    const j = pickNode(p); if (j != null) drag = { type: "new", a: j, to: [nodes[j].x, nodes[j].y] };
  },
  drag(p) { if (drag) { const [x, y] = snap(p); drag.to = [x, y]; } hover = { px: p.x, py: p.y }; },
  up(p) {
    if (!drag) return; const d = drag; drag = null; const [x, y, j] = snap(p);
    if (j === d.a || (j == null && Math.hypot(x - nodes[d.a].x, y - nodes[d.a].y) < 0.5)) return;
    if (j == null && y < -0.01 && (x < 0 || x > lv.span)) { ui.tip("That is inside the cliff. Use the yellow anchor points to fix to the rock."); return; }
    save(); let b = j, made = false;
    if (b == null) { nodes.push({ x, y, fixed: false }); b = nodes.length - 1; made = true; }
    if (!addMember(d.a, b)) { if (made) nodes.pop(); undo.pop(); return; }
    changed();
  },
  hover(p) { hover = { px: p.x, py: p.y, node: pickNode(p), member: pickNode(p) == null ? pickMember(p) : null }; },
  leave() { hover = null; },
});
cv.el.addEventListener("wheel", e => { e.preventDefault(); const r = cv.el.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, wx = WX(px), wy = WY(py); cam.s = K.clamp(cam.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 4, 200); cam.x = wx - (px - cv.w / 2) / cam.s; cam.y = wy + (py - cv.h / 2) / cam.s; }, { passive: false });
{ const r = K.row(ui.group("View")); K.btn(r, "Fit view", () => fitView()); K.btn(r, "📷 Screenshot", () => glOn ? K.gl.screenshot("bridge", gv.el, cv.el) : K.gl.screenshot("bridge", cv.el)); }

// ---------------------------------------------------------------- charts, readouts and the animation loop
function charts() {
  const span = [-1, lv.span + VEHICLES[lv.veh].len + 1];
  chA.draw([{ pts: hist.u, color: "#ff8a65", width: 2.2 }], { xMin: span[0], xMax: span[1], yMin: 0, yMax: Math.max(110, ...hist.u.map(p => p[1])), hlines: [{ y: 100, color: "#ff6b81", label: "breaks" }] });
  chB.draw([{ pts: hist.d, color: "#5ad1ff", width: 2.2 }], { xMin: span[0], xMax: span[1], yMin: 0 });
}
function readouts() {
  const co = cost(nodes, members); read.set("cost", `£${Math.round(co).toLocaleString()}${lv.budget ? " / " + (lv.budget / 1000) + "k" : ""}`);
  read.set("n", members.filter(m => !m.broken && !m.road).length + " (+ road)");
  const w = worstNow(); read.set("worst", res && res.ok ? `${(w.w * 100).toFixed(0)}%` + (w.k >= 0 ? (res.N[w.k] >= 0 ? " (pulled)" : " (pushed)") : "") : "–");
  let sag = 0; if (res && res.ok) for (let i = 0; i < nodes.length; i++) sag = Math.max(sag, -res.U[2 * i + 1]); read.set("sag", res && res.ok ? (sag * 1000).toFixed(1) + " mm" : "–");
  read.set("state", { build: res && !res.ok ? "wobbly!" : "building", test: "testing", passed: "crossed ✓", collapse: "collapsed" }[mode]);
  read.set("veh", VEHICLES[lv.veh].name);
  matNote.innerHTML = `${MATS[mat].name}: £${MATS[mat].cost}/m, longest ${MATS[mat].maxL} m. Holds ${(capacity(mat, 1).T / 1000).toFixed(0)} kN pulling; pushing, ${mat === "cable" ? "nothing (it goes slack)" : (capacity(mat, 4).C / 1000).toFixed(0) + " kN at 4 m, " + (capacity(mat, 8).C / 1000).toFixed(0) + " kN at 8 m (buckling)"}.`;
}
ui.run(dt => { step(dt); for (const s of sparks) { s.vy -= G * dt * 0.8; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.9; } sparks = sparks.filter(s => s.life > 0); }, () => {
  frame++; drawOverlay(); if (frame % 4 === 0) { charts(); readouts(); }
});
setLevel("l2"); loadExample("pratt"); undo = [];
setTimeout(() => { if (mode === "build") startTest(); }, 1200);
ui.tip("A steel truss with a lorry about to cross: blue members are stretched, red ones squashed. Build your own, or try the Investigate challenges.", 9000);
