/* =====================================================================
   ECOSYSTEMS AND SAMPLING
   FOOD WEBS: energy enters as sunlight, captured by producers. Only about
   10% of the energy at one trophic level reaches the next: the rest is
   used in respiration, lost as heat, or never eaten (waste, dead parts,
   faeces, which feed the decomposers). So food chains are short and
   pyramids of energy are always wider at the bottom.
   NUTRIENT CYCLES: atoms are recycled. In the nitrogen cycle, bacteria
   fix nitrogen gas, decomposers turn dead matter into ammonium,
   nitrifying bacteria turn ammonium into nitrate (needs oxygen),
   denitrifying bacteria turn nitrate back into nitrogen gas (in
   waterlogged soil).
   SAMPLING: we cannot count every plant, so we count in QUADRATS placed
   at random, then scale up: population ≈ mean per m² × area.
   SUCCESSION: bare ground is colonised by pioneers, then grasses, shrubs
   and trees, as soil builds up, until a stable climax community.
   EUTROPHICATION: fertiliser washed into a lake feeds algae; they block
   the light, plants die, bacteria decomposing them use up the oxygen,
   and fish die.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---- food web: oak woodland. level 1 producers … 4 top predators; eats: what each feeds on
const WEB = [
  { id: "oak", name: "oak tree", lvl: 1 }, { id: "grass", name: "grass", lvl: 1 },
  { id: "cat", name: "caterpillar", lvl: 2, eats: ["oak"] }, { id: "aphid", name: "aphid", lvl: 2, eats: ["oak", "grass"] }, { id: "rabbit", name: "rabbit", lvl: 2, eats: ["grass"] }, { id: "vole", name: "vole", lvl: 2, eats: ["grass", "oak"] },
  { id: "tit", name: "blue tit", lvl: 3, eats: ["cat", "aphid"] }, { id: "lady", name: "ladybird", lvl: 3, eats: ["aphid"] }, { id: "shrew", name: "shrew", lvl: 3, eats: ["cat", "lady"] },
  { id: "hawk", name: "sparrowhawk", lvl: 4, eats: ["tit"] }, { id: "owl", name: "owl", lvl: 4, eats: ["vole", "shrew"] }, { id: "fox", name: "fox", lvl: 4, eats: ["rabbit", "vole"] }
];
const SUN = 1.0e6;                                                                  // kJ of sunlight per m² per year (UK)
function energyChain(photo, eff, levels) { const e = [SUN * photo / 100]; for (let i = 1; i < levels; i++) e.push(e[i - 1] * eff / 100); return e; }
// ---- nitrogen cycle (kg N per hectare): stores and monthly rates
function nStep(s, o, dt) {
  const T = Math.max(0, (o.temp - 5) / 15), O2 = o.oxy, fix = (o.legume ? 12 : 1.5) / 12 + 0.3 / 12, fert = o.fert / 12;
  const uptake = 0.25 * s.no3 * T, decomp = 0.08 * s.dead * T, nitri = 0.6 * s.nh4 * T * O2, denit = 0.5 * s.no3 * T * Math.pow(1 - O2, 2), leach = 0.02 * s.no3 * o.rain, die = 0.06 * s.org, harvest = o.harvest ? 0.04 * s.org : 0;
  s.n2 += (denit - fix) * dt; s.org += (uptake + fix - die - harvest) * dt; s.dead += (die - decomp) * dt; s.nh4 += (decomp + fert * 0.5 - nitri) * dt; s.no3 += (nitri + fert * 0.5 - uptake - denit - leach) * dt;
  s.flux = { fix, uptake, decomp, nitri, denit, leach, die, harvest, fert };
}
const N0 = () => ({ n2: 1000, org: 120, dead: 80, nh4: 10, no3: 20 });
function nSteady(o) { const s = N0(); for (let k = 0; k < 600; k++) nStep(s, o, 1); return s; }
// ---- quadrats: a 40 m × 20 m field beside a wood (at x = 0). Five species, each preferring shade or open ground, growing in clumps
const SP = [{ id: "blue", name: "bluebell", col: "#6f7dff", shade: 1, dens: 30 }, { id: "ivy", name: "ground ivy", col: "#9b6fd0", shade: 0.7, dens: 18 }, { id: "butter", name: "buttercup", col: "#ffd166", shade: -0.6, dens: 14 }, { id: "dand", name: "dandelion", col: "#ffb347", shade: -0.8, dens: 8 }, { id: "daisy", name: "daisy", col: "#f0f0f0", shade: -1, dens: 26 }];
const FW = 40, FH = 20, light = x => 0.15 + 0.85 * (1 - Math.exp(-x / 8));            // light (fraction of full sun) rises away from the wood
function makeField(r) {
  const pl = [];
  for (const [k, s] of SP.entries()) {
    const clumps = []; for (let i = 0; i < 40; i++) clumps.push([r() * FW, r() * FH]);
    for (let i = 0; i < s.dens * FW * FH / 2; i++) {
      const c = clumps[Math.floor(r() * clumps.length)], x = c[0] + 2 * r.gauss(), y = c[1] + 2 * r.gauss(); if (x < 0 || x > FW || y < 0 || y > FH) continue;
      const L = light(x), pref = s.shade > 0 ? Math.pow(1 - L, s.shade) : Math.pow(L, -s.shade); if (r() < pref) pl.push({ x, y, k });
    }
  }
  return pl;
}
const inQ = (pl, qx, qy, side) => pl.filter(p => p.x >= qx && p.x < qx + side && p.y >= qy && p.y < qy + side);
function simpson(counts) { const N = counts.reduce((a, b) => a + b, 0); if (N < 2) return 0; return 1 - counts.reduce((s, n) => s + n * (n - 1), 0) / (N * (N - 1)); }
// ---- succession on a 60 × 30 grid: 0 bare, 1 pioneers (lichen, moss), 2 grasses, 3 shrubs, 4 birch, 5 oak (climax)
const STAGE = ["bare rock / soil", "pioneers", "grasses", "shrubs", "birch", "oak (climax)"], SCOL = ["#5a5048", "#8fa36a", "#6fc06a", "#3f9a54", "#2f7d55", "#1f5a3a"];
const NEED = [0, 0, 2, 6, 12, 20];                                                  // soil depth (cm) each stage needs to establish
function succStep(G, o, r) {
  const { nx, ny, st, soil } = G;
  for (let k = 0; k < nx * ny; k++) {
    const s = st[k]; soil[k] = Math.min(40, soil[k] + [0, 0.05, 0.12, 0.15, 0.15, 0.12][s]);
    const nb = [k - 1, k + 1, k - nx, k + nx].filter(q => q >= 0 && q < nx * ny).map(q => st[q]), next = s + 1;
    if (s < 5 && soil[k] >= NEED[next] && r() < (next === 1 ? 0.02 : 0.004 + 0.02 * nb.filter(v => v >= next).length) * (o.speedUp || 1)) st[k] = next;
    if (s >= 3 && r() < o.graze * 0.3) st[k] = 2;                                  // grazing keeps woody plants from growing (deflected succession)
    if (r() < o.fire * 0.002) st[k] = Math.min(st[k], 2);
  }
  G.year++;
}
function makeSucc(kind) { const nx = 60, ny = 30, G = { nx, ny, st: new Uint8Array(nx * ny), soil: new Float32Array(nx * ny), year: 0, hist: [] }; if (kind !== "rock") { G.st.fill(2); G.soil.fill(kind === "field" ? 10 : 6); } return G; }
// ---- eutrophication: a lake over 120 days after fertiliser washes in. Units are relative (oxygen in mg/L)
function lakeStep(s, o, dt) {
  const N = s.N, A = s.A, Pl = s.Pl, D = s.D, O = s.O, F = s.F, lightIn = 1 / (1 + A / 3);
  const algaeGrowth = 0.6 * A * N / (N + 1) * (1 - A / 40), plantGrowth = 0.05 * Pl * lightIn * (1 - Pl / 10), algaeDie = 0.15 * A, plantDie = 0.04 * Pl * (1 - lightIn) * 2;
  const decomp = 0.25 * D * O / (O + 1), O2prod = 0.08 * (algaeGrowth + plantGrowth * 4) * (A > 25 ? 0.5 : 1), O2use = 0.12 * decomp * 3 + 0.02 * F, reaer = 0.15 * (9 - O);
  s.N += (o.runoff * (s.t < 30 ? 1 : 0.1) - 0.3 * algaeGrowth + 0.3 * decomp - 0.02 * N) * dt; s.A += (algaeGrowth - algaeDie) * dt; s.Pl += (plantGrowth - plantDie) * dt; s.D += (algaeDie + plantDie - decomp) * dt;
  s.O = Math.max(0, s.O + (O2prod - O2use + reaer) * dt); s.F += (s.O < 3 ? -0.3 * F * (3 - s.O) / 3 : 0.01 * F * (1 - F / 10)) * dt; s.t += dt;
  s.N = Math.max(0, s.N); s.A = Math.max(0.05, s.A); s.Pl = Math.max(0, s.Pl); s.D = Math.max(0, s.D);
}
const LAKE0 = () => ({ N: 0.5, A: 1, Pl: 8, D: 1, O: 9, F: 10, t: 0 });
function lakeRun(runoff) { const s = LAKE0(); let minO = 9; for (let i = 0; i < 1200; i++) { lakeStep(s, { runoff }, 0.1); minO = Math.min(minO, s.O); } return { minO, F: s.F }; }

// ---------------- The page ----------------
const P = { view: "web", photo: 1, eff: 10, levels: 4, pyr: "energy", oxy: 0.7, temp: 15, fert: 0, rain: 1, legume: false, harvest: false, side: 1, zone: "all", sp: "blue", succ: "rock", graze: 0, fire: 0, runoff: 0 };
let rnd = K.rng(Date.now() % 99991 + 29), speed = 1, removed = new Set(), packets = [], NS = N0(), nHist = [], field = [], quads = [], lastQ = null, SG = null, lake = LAKE0(), lakeHist = [], tNow = 0;
const ui = K.app({
  title: "Ecosystems and Sampling", subject: "Biology",
  blurb: "Food webs and energy, the nitrogen cycle, quadrat sampling, succession and eutrophication",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) section 4: population, community, habitat, ecosystem; quadrats to estimate population size and study distribution; food chains and webs, trophic levels, pyramids of number, biomass and energy, and why only about 10% of energy passes on; the carbon and nitrogen cycles (Biology only); eutrophication and deforestation. Succession is A level.", adv: "OCR A level Biology A (H420): 4.2.1 biodiversity (random sampling, Simpson's index of diversity), 6.3.1 ecosystems (efficiency of energy transfer, NPP = GPP − R, the nitrogen cycle, succession, measuring distribution and abundance), 6.3.2 sustainability. PAG3 sampling." } },
  missions: [
    { title: "Remove a species", q: "In the woodland food web, remove the blue tits. What happens to the caterpillars, aphids and sparrowhawks?", hint: "Caterpillars and aphids have fewer predators, so they increase (and eat more oak). Sparrowhawks lose their only food here, so they decrease or move away. In a food web, one change spreads to many species.", setup() { set({ view: "web" }); } },
    { title: "Why only 10%?", q: "Follow the energy from sunlight to the top predators. What fraction of the producers' energy reaches the primary consumers? Where does the rest go?", hint: "About 10% passes on. The rest is used in respiration (released as heat), lost in waste and faeces, or in parts that are never eaten (roots, bones). That is why there are rarely more than four or five levels.", setup() { set({ view: "web", eff: 10 }); } },
    { title: "Pyramids", q: "Look at the pyramids of number, biomass and energy for the oak tree chain. Why is the pyramid of numbers an odd shape?", hint: "One oak tree feeds thousands of caterpillars, so the pyramid of numbers is narrow at the bottom. Pyramids of biomass and energy are the right way up, because the oak is huge. A pyramid of energy is always wider at the bottom.", setup() { set({ view: "web", pyr: "number" }); } },
    { title: "Nitrogen in waterlogged soil", q: "Make the soil waterlogged (low oxygen). What happens to the nitrate? Which bacteria are responsible? Why do farmers drain fields?", hint: "With little oxygen, nitrifying bacteria cannot make nitrate, and denitrifying bacteria turn nitrate back into nitrogen gas: the nitrate falls and plants grow poorly. Draining and ploughing let air in.", setup() { set({ view: "nitrogen", oxy: 0.1 }); } },
    { title: "Peas and beans", q: "Grow legumes. Why does the soil gain nitrogen?", hint: "Legumes have root nodules containing nitrogen-fixing bacteria (Rhizobium) that turn nitrogen gas into ammonia the plant can use. When they die, the nitrogen enters the soil: crop rotation uses this.", setup() { set({ view: "nitrogen", legume: true }); } },
    { title: "Estimate a population", q: "Place 10 random quadrats (1 m²). Estimate the number of daisies in the 800 m² field. Compare with the true number. Then place 40.", hint: "Population ≈ mean number per m² × 800. More quadrats give a more reliable estimate (the standard error falls as 1 ÷ √n). Quadrats must be placed at random, or the estimate is biased.", setup() { set({ view: "quadrat", sp: "daisy" }); } },
    { title: "Transect", q: "Run a belt transect from the wood into the open field. How do bluebells and daisies change with distance? Why?", hint: "Bluebells are commonest in the shade near the wood; daisies in the open, where there is more light. A transect shows how the distribution of a species changes with an abiotic factor (light).", setup() { set({ view: "quadrat", sp: "blue" }); transect(); } },
    { title: "Eutrophication", q: "Wash fertiliser into the lake. Explain the order of events that kills the fish.", hint: "Nitrate and phosphate → algae grow fast (algal bloom) → they block light so plants below die → algae and plants die → bacteria decomposing them respire and use up the oxygen → fish suffocate. It is the bacteria, not the algae, that use the oxygen.", setup() { set({ view: "lake", runoff: 1.2 }); } },
    { lvl: "adv", title: "Succession and grazing", q: "Run succession on bare rock. In what order do the stages appear? Then add grazing.", hint: "Pioneers (lichens, mosses) break rock and add humus; soil deepens; grasses, then shrubs, birch and finally oak (the climax community). Grazing stops woody plants establishing: deflected succession (a plagioclimax), as on moorland or chalk grassland.", setup() { set({ view: "succ", succ: "rock" }); } },
    { lvl: "adv", title: "Simpson's index", q: "Place 10 quadrats in zone A (near the wood) and 10 in zone B (open field). Which zone is more diverse?", hint: "D = 1 − Σn(n − 1) ÷ N(N − 1). Higher D (closer to 1) means more diverse: more species and more even numbers. Compare the two zones' values in the readings.", setup() { set({ view: "quadrat", zone: "A" }); } }
  ],
  batch: [
    { title: "How many quadrats are enough?", question: "How close is the population estimate of daisies to the true value, for different numbers of random quadrats?", how: "1 m² quadrats placed at random in the 40 m × 20 m field; error = |estimate − true| ÷ true. Theory: falls as 1 ÷ √n.", xLabel: "number of quadrats", yLabel: "error in the estimate (%)", xs: [5, 10, 20, 40, 80], reps: 8, yMin: 0, theory: n => 80 / Math.sqrt(n), theoryLabel: "∝ 1 ÷ √n", run: (x, r) => { const f = fieldCache(r), tr = f.filter(p => p.k === 4).length; let s = 0; for (let i = 0; i < x; i++) { const qx = r() * (FW - 1), qy = r() * (FH - 1); s += inQ(f, qx, qy, 1).filter(p => p.k === 4).length; } return Math.abs(s / x * FW * FH - tr) / tr * 100; }, note: "Clumped plants vary a lot from quadrat to quadrat, so a few quadrats can be far out. The error falls roughly as 1 ÷ √n: four times as many quadrats halve it." },
    { title: "Random or chosen?", question: "Does placing quadrats where you choose bias the estimate?", how: "10 quadrats: 1 = placed at random, 2 = placed where daisies look plentiful (the student picks the best-looking of 3 random spots). Bluebells-to-daisies estimate as % of the true daisy population.", xLabel: "1 random, 2 chosen by eye", yLabel: "estimate (% of true)", xs: [1, 2], reps: 10, run: (x, r) => { const f = fieldCache(r), tr = f.filter(p => p.k === 4).length; let s = 0; for (let i = 0; i < 10; i++) { let best = -1; for (let k = 0; k < (x === 1 ? 1 : 3); k++) { const qx = r() * (FW - 1), qy = r() * (FH - 1), n = inQ(f, qx, qy, 1).filter(p => p.k === 4).length; best = Math.max(best, n); } s += best; } return s / 10 * FW * FH / tr * 100; }, note: "Choosing 'good' spots overestimates the population: random placement (using random numbers for coordinates) avoids this bias." },
    { title: "Transfer efficiency and the top of the chain", question: "How much energy reaches the 4th trophic level, for different efficiencies of transfer?", how: "Sunlight 1 000 000 kJ/m²/year, 1% captured; each feeding step passes on the % shown (± 20% natural variation per step).", xLabel: "efficiency of each transfer (%)", yLabel: "energy at level 4 (kJ per m² per year)", xs: [5, 8, 10, 12, 15, 20], reps: 5, yMin: 0, theory: e => SUN * 0.01 * Math.pow(e / 100, 3), theoryLabel: "10 000 × (e/100)³", run: (x, r) => { let e = SUN * 0.01; for (let i = 0; i < 3; i++) e *= x / 100 * (1 + 0.2 * r.gauss()); return Math.max(0, e); }, note: "Energy falls as the efficiency cubed over three steps: at 10%, only 10 kJ of every 10 000 kJ in the plants reaches the top predators. Too little energy is left for a 6th or 7th level." },
    { title: "Soil oxygen and nitrate", question: "How does the amount of oxygen in the soil change the nitrate available to plants?", how: "Nitrogen-cycle model run to a steady state (50 years), from waterlogged (0) to well aerated (1). ±5% sampling error.", xLabel: "soil oxygen (0 waterlogged, 1 well aerated)", yLabel: "nitrate (kg N per hectare)", xs: [0.05, 0.2, 0.4, 0.6, 0.8, 1], reps: 3, yMin: 0, theory: o => nSteady({ oxy: o, temp: 15, fert: 0, rain: 1, legume: false, harvest: false }).no3, theoryLabel: "model", run: (x, r) => nSteady({ oxy: x, temp: 15, fert: 0, rain: 1, legume: false, harvest: false }).no3 * (1 + 0.05 * r.gauss()), note: "Waterlogged soil: little nitrification and lots of denitrification, so very little nitrate. Aerated soil: much more." },
    { title: "Fertiliser runoff and the fish", question: "How does the amount of fertiliser washed into a lake affect the lowest oxygen level and the fish?", how: "Lake model over 120 days; runoff in the first 30 days. ±0.2 mg/L oxygen meter.", xLabel: "fertiliser runoff (relative)", yLabel: "lowest dissolved oxygen (mg/L)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.5], reps: 3, yMin: 0, theory: x => lakeRun(x).minO, theoryLabel: "model", run: (x, r) => Math.max(0, lakeRun(x).minO + 0.2 * r.gauss()), note: "A little fertiliser is fine; beyond a threshold the algal bloom and its decay drive the oxygen below about 3 mg/L, where most fish die." },
    { title: "Grazing and succession", question: "After 300 years on bare rock, how much of the area is woodland (birch or oak), with different grazing pressures?", how: "Succession grid 60 × 30; grazing from none to heavy.", xLabel: "grazing (0 none … 0.1 heavy)", yLabel: "woodland after 300 years (%)", xs: [0, 0.01, 0.02, 0.04, 0.06, 0.1], reps: 3, yMin: 0, run: (x, r) => { const G = makeSucc("rock"); for (let y = 0; y < 300; y++) succStep(G, { graze: x, fire: 0 }, r); let n = 0; for (const s of G.st) if (s >= 4) n++; return n / G.st.length * 100; }, note: "Without grazing, woodland takes over; grazing holds the community at grassland (deflected succession)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 4.1", text: "Population: all the organisms of one species in an area. Community: all the populations. Habitat: where an organism lives. Ecosystem: a community and its physical environment." },
      { lvl: "std", tag: "4BI1 4.2", text: "Quadrats: place at random (random number coordinates), count or estimate % cover, repeat many times; population ≈ mean per m² × area. A transect samples along a line to show how distribution changes." },
      { lvl: "std", tag: "4BI1 4.6", text: "Food chains start with a producer; arrows show the direction of energy flow. Pyramids of number, biomass and energy; energy pyramids are always the right way up." },
      { lvl: "std", tag: "4BI1 4.8", text: "Only about 10% of energy passes from one level to the next; the rest is used in respiration, lost as heat, or lost in waste and uneaten parts." },
      { lvl: "std", tag: "4BI1 4.11B", text: "Nitrogen cycle: nitrogen-fixing bacteria (soil, root nodules) and lightning fix N₂; decomposers make ammonium; nitrifying bacteria make nitrate (needs oxygen); plants absorb nitrate; denitrifying bacteria return N₂ (waterlogged soil)." },
      { lvl: "std", tag: "4BI1 4(d)", text: "Eutrophication: fertiliser → algal bloom → light blocked, plants die → decomposing bacteria use oxygen → fish die." },
      { lvl: "adv", tag: "H420 6.3.1", text: "GPP − respiration = NPP (energy available to the next level). Efficiency = energy transferred ÷ energy available × 100." },
      { lvl: "adv", tag: "H420 4.2.1", text: "Simpson's index of diversity D = 1 − Σ(n/N)² (or 1 − Σn(n − 1)/N(N − 1)): from 0 to 1; higher means more diverse." },
      { lvl: "adv", tag: "H420 6.3.1", text: "Succession: pioneer species → intermediate communities → climax community; each stage changes the abiotic conditions (soil depth, shade) so others can establish. Grazing or burning can deflect it." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `10 quadrats of 1 m² contain ${quads.length ? quads.slice(-10).map(q => q.c[4]).join(", ") : "3, 0, 5, 2, 4, 1, 0, 6, 2, 3"} daisies. Estimate the population in an 800 m² field.`, ans: () => { const v = quads.length ? quads.slice(-10).map(q => q.c[4]) : [3, 0, 5, 2, 4, 1, 0, 6, 2, 3], m = v.reduce((a, b) => a + b, 0) / v.length; return `<ul><li>mean = ${m.toFixed(2)} per m²</li><li>population ≈ ${m.toFixed(2)} × 800</li><li>= ${Math.round(m * 800)} daisies</li></ul>`; } },
      { lvl: "std", marks: 2, q: () => `Producers in a food chain contain ${K.sig(energyChain(P.photo, P.eff, 2)[0], 3)} kJ/m² and primary consumers ${K.sig(energyChain(P.photo, P.eff, 2)[1], 3)} kJ/m². Calculate the efficiency of transfer.`, ans: () => `<ul><li>efficiency = ${K.sig(energyChain(P.photo, P.eff, 2)[1], 3)} ÷ ${K.sig(energyChain(P.photo, P.eff, 2)[0], 3)} × 100</li><li>= ${P.eff}%</li></ul>` },
      { lvl: "std", marks: 3, q: "Give three reasons why energy is lost between trophic levels.", ans: "<ul><li>respiration (released as heat)</li><li>parts not eaten (roots, bones)</li><li>waste: faeces and urine</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how fertiliser running into a lake can kill fish.", ans: "<ul><li>nitrates cause rapid growth of algae</li><li>algae block light; plants below die</li><li>bacteria decompose the dead plants and algae</li><li>their respiration uses up the oxygen, so fish suffocate</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why farmers grow peas or beans in rotation with other crops.", ans: "<ul><li>legumes have nitrogen-fixing bacteria in root nodules</li><li>which add nitrogen compounds (nitrates) to the soil for the next crop</li></ul>" },
      { lvl: "adv", marks: 3, q: "Calculate Simpson's index for a quadrat sample with 10 bluebells, 5 daisies and 5 buttercups.", ans: "<ul><li>N = 20; Σn(n − 1) = 90 + 20 + 20 = 130</li><li>D = 1 − 130 ÷ (20 × 19)</li><li>= 0.66</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li><b>Food web</b>: an oak woodland web (12 species). Removing a species marks its prey "fewer predators" and its predators "less food". Energy: UK sunlight 1 000 000 kJ/m²/year × photosynthesis efficiency, then × transfer efficiency at each step. Pyramids use typical numbers for an oak chain.</li>
<li><b>Nitrogen cycle</b> (kg N per hectare, monthly steps): fixation (more with legumes), uptake by plants, death, decomposition to ammonium, nitrification (needs oxygen), denitrification (in low oxygen), leaching (rain), fertiliser, harvest. Rates rise with temperature.</li>
<li><b>Quadrats</b>: a 40 m × 20 m field beside a wood; five species growing in clumps, each preferring shade or open ground (light rises away from the wood). Quadrats count every plant inside them; population ≈ mean per m² × 800 m².</li>
<li><b>Succession</b>: a 60 × 30 grid; each cell can move to the next stage once the soil is deep enough, more likely next to cells already there; plants build soil; grazing resets woody plants to grass.</li>
<li><b>Lake</b>: nitrate → algae (logistic) → shading kills plants → dead matter → decomposers use oxygen → fish die below about 3 mg/L.</li></ul>
<h3>Simplifications</h3>
<ul><li>All numbers are typical or illustrative; real ecosystems vary from year to year and place to place. The carbon cycle has its own simulation (climate/carbon_cycle); capture–recapture is in Predator and Prey.</li>
<li>The earlier version's pond web, carbon-cycle view, deforestation and fishery views, Spearman's rank and t-test are not included here.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/ecosystems.html">original/ecosystems.html</a>.</p>`
});
let FC = null; const fieldCache = r => FC || (FC = makeField(K.rng(12345)));

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "web", options: [["web", "🍃 Food web and energy"], ["nitrogen", "♻️ Nitrogen cycle"], ["quadrat", "🔲 Quadrats"], ["succ", "🌱 Succession"], ["lake", "🐟 Eutrophication"]], on: v => set({ view: v }) });
grp.web = g = ui.group("Food web");
K.note(g, "Click a species to remove it (click again to put it back).");
ctl.photo = K.slider(g, { label: "Photosynthesis captures", min: 0.5, max: 3, step: 0.1, value: 1, unit: "% of sunlight", on: v => P.photo = v });
ctl.eff = K.slider(g, { label: "Each transfer passes on", min: 2, max: 25, step: 1, value: 10, unit: "%", on: v => P.eff = v });
ctl.pyr = K.seg(g, { label: "Pyramid", value: "energy", options: [["number", "numbers"], ["biomass", "biomass"], ["energy", "energy"]], on: v => P.pyr = v });
grp.nitrogen = g = ui.group("Soil");
ctl.oxy = K.slider(g, { label: "Soil oxygen", min: 0, max: 1, step: 0.05, value: 0.7, fmt: v => v < 0.2 ? "waterlogged" : v < 0.5 ? "damp" : v < 0.8 ? "well drained" : "ploughed, aerated", on: v => P.oxy = v });
ctl.temp = K.slider(g, { label: "Temperature", min: 0, max: 30, step: 1, value: 15, unit: "°C", on: v => P.temp = v });
ctl.fert = K.slider(g, { label: "Fertiliser", min: 0, max: 200, step: 10, value: 0, unit: "kg N per ha per year", on: v => P.fert = v });
ctl.rain = K.slider(g, { label: "Rainfall (leaching)", min: 0, max: 3, step: 0.1, value: 1, fmt: v => v + "×", on: v => P.rain = v });
ctl.legume = K.toggle(g, { label: "Grow legumes (peas, beans, clover)", value: false, on: v => P.legume = v });
ctl.harvest = K.toggle(g, { label: "Harvest the crop each year", value: false, on: v => P.harvest = v });
grp.quadrat = g = ui.group("Sampling");
ctl.sp = K.seg(g, { label: "Species to estimate", value: "blue", options: SP.map(s => [s.id, s.name]), on: v => P.sp = v });
ctl.side = K.seg(g, { label: "Quadrat", value: 1, options: [[0.5, "0.25 m²"], [1, "1 m²"]], on: v => P.side = v });
ctl.zone = K.seg(g, { label: "Where", value: "all", options: [["all", "whole field"], ["A", "zone A (near wood)"], ["B", "zone B (open)"]], on: v => P.zone = v });
let rq = K.row(g); K.btn(rq, "+1 random quadrat", () => addQuad(), "primary"); K.btn(rq, "+10", () => { for (let i = 0; i < 10; i++) addQuad(); });
let rq2 = K.row(g); K.btn(rq2, "Belt transect", () => transect()); K.btn(rq2, "Clear", () => { quads = []; lastQ = null; });
grp.succ = g = ui.group("Succession");
ctl.succ = K.seg(g, { label: "Start from", value: "rock", options: [["rock", "bare rock (primary)"], ["field", "abandoned field (secondary)"]], on: v => { P.succ = v; SG = makeSucc(v); } });
ctl.graze = K.slider(g, { label: "Grazing", min: 0, max: 0.1, step: 0.005, value: 0, on: v => P.graze = v });
ctl.fire = K.slider(g, { label: "Fires", min: 0, max: 1, step: 0.05, value: 0, on: v => P.fire = v });
K.btn(K.row(g), "↺ Start again", () => { SG = makeSucc(P.succ); }, "primary");
grp.lake = g = ui.group("Lake");
ctl.runoff = K.slider(g, { label: "Fertiliser washed in", min: 0, max: 1.5, step: 0.05, value: 0, fmt: v => v ? v.toFixed(2) + " (relative)" : "none", on: v => { P.runoff = v; } });
K.btn(K.row(g), "↺ Start again", () => { lake = LAKE0(); lakeHist = []; }, "primary");
ctl.speed = K.slider(ui.group("Watch"), { label: "Speed", min: 0.25, max: 5, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function addQuad(qx, qy) {
  const s = P.side; if (qx === undefined) { const x0 = P.zone === "B" ? FW / 2 : 0, x1 = P.zone === "A" ? FW / 2 : FW; qx = x0 + rnd() * (x1 - x0 - s); qy = rnd() * (FH - s); }
  const inside = inQ(field, qx, qy, s), c = SP.map((sp, k) => inside.filter(p => p.k === k).length); lastQ = { x: qx, y: qy, s, c, zone: qx + s / 2 < FW / 2 ? "A" : "B", light: light(qx + s / 2) }; quads.push(lastQ);
}
function transect() { quads = []; for (let x = 0; x < FW; x += 2) addQuad(x, FH / 2 - P.side / 2); quads.forEach(q => q.tr = true); }
function set(o) {
  Object.assign(P, o); for (const k of ["photo", "eff", "oxy", "temp", "fert", "rain", "graze", "fire", "runoff"]) ctl[k].set(P[k]);
  for (const k of ["view", "pyr", "sp", "side", "zone", "succ"]) ctl[k].set(P[k]); ctl.legume.set(P.legume); ctl.harvest.set(P.harvest);
  for (const k in grp) grp[k].style.display = k === P.view ? "" : "none";
  if (o.view) { removed = new Set(); NS = N0(); nHist = []; quads = []; lastQ = null; SG = makeSucc(P.succ); lake = LAKE0(); lakeHist = []; if (!field.length) field = makeField(rnd); }
  relabel({ web: ["photosynthesis", "efficiency per step", "energy reaching level 4", "species removed"], nitrogen: ["nitrate in soil", "ammonium", "plants and animals", "nitrogen lost per year"], quadrat: ["quadrats", "estimated population", "true population", "Simpson's index A · B"], succ: ["year", "most common stage", "soil depth (mean)", "woodland"], lake: ["day", "algae", "dissolved oxygen", "fish"] }[P.view]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let nodePos = {};
K.pointer(cv.el, { down: (x, y) => { if (P.view !== "web") return; for (const n of WEB) { const p = nodePos[n.id]; if (p && Math.hypot(x - p[0], y - p[1]) < 30) { removed.has(n.id) ? removed.delete(n.id) : removed.add(n.id); return; } } } });
function effectOf(id) {
  if (removed.has(id)) return ["removed", "#7d8aa5"];
  const n = WEB.find(q => q.id === id), food = (n.eats || []).filter(e => !removed.has(e));
  if (n.eats && food.length === 0) return ["↓↓ no food left", "#ff5d6c"]; if (n.eats && food.length < n.eats.length) return ["↓ less food", "#ff8a70"];
  const preds = WEB.filter(q => (q.eats || []).includes(id)); if (preds.some(q => removed.has(q.id))) return ["↑ fewer predators", "#7fe3a0"];
  return ["", ""];
}
function drawWeb(c, w, h) {
  nodePos = {}; for (let L = 1; L <= 4; L++) { const row = WEB.filter(n => n.lvl === L); row.forEach((n, i) => nodePos[n.id] = [w * (i + 1) / (row.length + 1), h - 60 - (L - 1) * (h - 130) / 3]); TX(c, ["producers", "primary consumers", "secondary consumers", "tertiary consumers"][L - 1], 14, h - 60 - (L - 1) * (h - 130) / 3 - 26, "#7d8aa5", "left", "11px"); }
  for (const n of WEB) for (const e of n.eats || []) { const a = nodePos[e], b = nodePos[n.id], gone = removed.has(n.id) || removed.has(e); c.strokeStyle = gone ? "rgba(120,120,140,0.2)" : "rgba(255,209,102,0.45)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1] - 18); c.lineTo(b[0], b[1] + 18); c.stroke(); const ang = Math.atan2(b[1] + 18 - a[1] + 18, b[0] - a[0]); c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(b[0], b[1] + 18); c.lineTo(b[0] - 8 * Math.cos(ang - 0.4), b[1] + 18 - 8 * Math.sin(ang - 0.4)); c.lineTo(b[0] - 8 * Math.cos(ang + 0.4), b[1] + 18 - 8 * Math.sin(ang + 0.4)); c.fill(); }
  for (const p of packets) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(p.x, p.y, 3, 0, 6.3); c.fill(); }
  for (const n of WEB) { const [x, y] = nodePos[n.id], [eff, col] = effectOf(n.id), gone = removed.has(n.id); c.fillStyle = gone ? "#222b40" : ["", "#2f7d55", "#3a6dd0", "#c97a2f", "#a83a4a"][n.lvl]; c.beginPath(); c.arc(x, y, 18, 0, 6.3); c.fill(); TX(c, n.name, x, y + 32, gone ? "#56607a" : "#eef2f8", "center", "11.5px"); if (eff) TX(c, eff, x, y - 24, col, "center", "600 11px"); }
  TX(c, "Oak woodland food web (arrows: food → feeder)", 14, 22, "#eef2f8", "left", "600 13px");
}
function drawNitrogen(c, w, h) {
  const B = { n2: [w * 0.5, 50, "nitrogen gas in the air (N₂)"], org: [w * 0.18, h * 0.42, "plants and animals (proteins)"], dead: [w * 0.18, h * 0.8, "dead matter, urine, faeces"], nh4: [w * 0.5, h * 0.8, "ammonium (NH₄⁺)"], no3: [w * 0.82, h * 0.6, "nitrate (NO₃⁻)"] };
  const f = NS.flux || {}, arrows = [["n2", "org", f.fix, "nitrogen-fixing bacteria", true], ["no3", "org", f.uptake, "absorbed by roots"], ["org", "dead", f.die, "death, excretion"], ["dead", "nh4", f.decomp, "decomposers", true], ["nh4", "no3", f.nitri, "nitrifying bacteria (need O₂)", true], ["no3", "n2", f.denit, "denitrifying bacteria (no O₂)", true]];
  for (const [a, b, v, lab, bact] of arrows) { const A = B[a], Bb = B[b]; c.strokeStyle = bact ? "#6fb1ff" : "#aab6cc"; c.lineWidth = 1 + Math.min(10, (v || 0) * 1.5); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(Bb[0], Bb[1]); c.stroke(); TX(c, lab, (A[0] + Bb[0]) / 2 + (a === "nh4" ? -60 : 6), (A[1] + Bb[1]) / 2 - (a === "dead" ? 14 : a === "nh4" ? 18 : 6), bact ? "#6fb1ff" : "#aab6cc", "left", "11px"); }
  for (const k in B) { const [x, y, lab] = B[k], v = NS[k]; c.fillStyle = "#1b2438"; c.strokeStyle = "#56607a"; c.lineWidth = 1.5; c.beginPath(); c.roundRect ? c.roundRect(x - 90, y - 26, 180, 52, 8) : c.rect(x - 90, y - 26, 180, 52); c.fill(); c.stroke(); TX(c, lab, x, y - 6, "#eef2f8", "center", "11.5px"); TX(c, k === "n2" ? "huge store" : v.toFixed(1) + " kg N/ha", x, y + 14, "#ffd166", "center", "600 12px"); }
  if (P.fert) TX(c, `+ fertiliser ${P.fert} kg/ha/yr`, B.nh4[0] + 100, B.nh4[1] - 30, "#7fe3a0", "left", "11.5px");
  TX(c, `leaching to rivers: ${(f.leach || 0).toFixed(2)} kg/ha per month`, B.no3[0] - 90, B.no3[1] + 48, "#ff8a70", "left", "11px");
  TX(c, "blue arrows: bacteria · arrow width = rate", 14, h - 10, "#7d8aa5", "left", "11px");
}
function drawQuadrat(c, w, h) {
  const sc = Math.min((w - 60) / FW, (h - 110) / FH), ox = 30, oy = 50;
  const gr = c.createLinearGradient(ox, 0, ox + FW * sc, 0); gr.addColorStop(0, "#1f3a26"); gr.addColorStop(1, "#3e6a34"); c.fillStyle = gr; c.fillRect(ox, oy, FW * sc, FH * sc);
  c.fillStyle = "#1a2a1a"; c.fillRect(ox - 24, oy, 22, FH * sc); TX(c, "wood", ox - 13, oy - 6, "#7fe3a0", "center", "11px");
  for (const p of field) { c.fillStyle = SP[p.k].col; c.fillRect(ox + p.x * sc - 1, oy + p.y * sc - 1, 2, 2); }
  c.strokeStyle = "rgba(255,255,255,0.3)"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(ox + FW / 2 * sc, oy); c.lineTo(ox + FW / 2 * sc, oy + FH * sc); c.stroke(); c.setLineDash([]);
  TX(c, "zone A (near the wood)", ox + FW / 4 * sc, oy - 6, "#aab6cc", "center", "11px"); TX(c, "zone B (open field)", ox + FW * 0.75 * sc, oy - 6, "#aab6cc", "center", "11px");
  for (const q of quads) { c.strokeStyle = q === lastQ ? "#ff5d6c" : "#ffd166"; c.lineWidth = q === lastQ ? 2.5 : 1.5; c.strokeRect(ox + q.x * sc, oy + q.y * sc, q.s * sc, q.s * sc); }
  let lx = ox; SP.forEach(s => { c.fillStyle = s.col; c.fillRect(lx, h - 22, 10, 10); TX(c, s.name, lx + 14, h - 13, "#aab6cc", "left", "11px"); lx += c.measureText(s.name).width + 34; });
  if (lastQ) TX(c, `last quadrat: ${SP.map((s, k) => `${s.name} ${lastQ.c[k]}`).join(", ")} · light ${(lastQ.light * 100).toFixed(0)}%`, ox, oy + FH * sc + 22, "#ffd166", "left", "12px");
  TX(c, "A 40 m × 20 m field beside a wood", ox, 22, "#eef2f8", "left", "600 13px");
}
function drawSucc(c, w, h) {
  const G = SG, cs = Math.min((w - 40) / G.nx, (h - 80) / G.ny), ox = (w - G.nx * cs) / 2, oy = 40;
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) { const s = G.st[j * G.nx + i]; c.fillStyle = SCOL[s]; c.fillRect(ox + i * cs, oy + j * cs, cs - 0.5, cs - 0.5); }
  let lx = ox; STAGE.forEach((s, k) => { c.fillStyle = SCOL[k]; c.fillRect(lx, oy + G.ny * cs + 12, 12, 12); TX(c, s, lx + 16, oy + G.ny * cs + 22, "#aab6cc", "left", "11px"); lx += c.measureText(s).width + 36; });
  TX(c, `Year ${G.year}`, ox, 26, "#eef2f8", "left", "600 13px");
}
function drawLake(c, w, h) {
  const s = lake, lx = 40, ly = 60, lw = w - 80, lh = h - 140, green = Math.min(1, s.A / 25);
  c.fillStyle = `rgb(${Math.round(30 + 60 * green)},${Math.round(80 + 90 * green)},${Math.round(150 - 90 * green)})`; c.fillRect(lx, ly, lw, lh);
  c.fillStyle = "rgba(120,200,90,0.8)"; for (let i = 0; i < Math.round(s.A * 3); i++) { const x = lx + ((i * 97) % lw), y = ly + 4 + ((i * 31) % 20); c.fillRect(x, y, 3, 3); }
  for (let i = 0; i < Math.round(s.Pl * 3); i++) { const x = lx + 20 + ((i * 71) % (lw - 40)), y = ly + lh; c.strokeStyle = "#3a8a3a"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 40, x, y - 70); c.stroke(); }
  for (let i = 0; i < Math.round(s.F); i++) { const x = lx + 40 + ((i * 113 + tNow * 30) % (lw - 80)), y = ly + 60 + ((i * 47) % (lh - 100)); c.fillStyle = s.O < 3 ? "#7d8aa5" : "#ffb347"; c.beginPath(); c.ellipse(x, y, 12, 5, 0, 0, 6.3); c.fill(); }
  TX(c, `Day ${s.t.toFixed(0)} · oxygen ${s.O.toFixed(1)} mg/L${s.O < 3 ? " (fish suffocating)" : ""}`, lx, 40, "#eef2f8", "left", "600 13px");
  TX(c, "algae at the surface · rooted plants on the bottom · fish", lx, h - 50, "#aab6cc", "left", "11.5px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ web: drawWeb, nitrogen: drawNitrogen, quadrat: drawQuadrat, succ: drawSucc, lake: drawLake })[P.view](c, w, h); }

// ---------------- Charts ----------------
const PYR = { number: [1, 50000, 2000, 2], biomass: [5000, 50, 8, 0.4], energy: [] };
function charts() {
  if (P.view === "web") {
    const e = energyChain(P.photo, P.eff, 4);
    chA.opts.title = "Energy at each trophic level (log scale)"; chA.opts.xLabel = ""; chA.opts.yLabel = "kJ per m² per year"; chA.opts.xFmt = whole(v => ["sunlight", "producers", "primary", "secondary", "tertiary"][Math.round(v)] || ""); chA.opts.yFmt = null;
    chA.draw([{ pts: [[0, 6]].concat(e.map((v, i) => [i + 1, Math.log10(v)])), type: "bars", w: 0.6, color: "#ffd166" }], { xMin: -0.6, xMax: 4.6, yMin: 0, yMax: 6.5, yFmt: v => "10" + "⁰¹²³⁴⁵⁶"[Math.round(v)] });
    const vals = P.pyr === "energy" ? e : PYR[P.pyr], names = ["oak", "caterpillars", "blue tits", "sparrowhawks"], mx = Math.max(...vals);
    chB.opts.title = `Pyramid of ${P.pyr === "number" ? "numbers" : P.pyr} (oak chain)`; chB.opts.xLabel = P.pyr === "number" ? "number of organisms" : P.pyr === "biomass" ? "biomass (relative)" : "energy (relative)"; chB.opts.yLabel = ""; chB.opts.xFmt = null;
    chB.draw(vals.map((v, i) => ({ pts: [[-v / mx / 2, i], [v / mx / 2, i]], color: ["#2f7d55", "#3a6dd0", "#c97a2f", "#a83a4a"][i], width: 26, label: names[i] })), { xMin: -0.55, xMax: 0.55, yMin: -0.6, yMax: 3.6, yFmt: whole(v => "") });
    read.set("a", `${K.sig(e[0], 3)} kJ/m²/yr`); read.set("b", P.eff + "%"); read.set("c", `${K.sig(e[3], 3)} kJ/m²/yr`); read.set("d", removed.size ? [...removed].map(id => WEB.find(n => n.id === id).name).join(", ") : "none");
    ui.hud("Only about 10% of the energy passes from one level to the next");
  } else if (P.view === "nitrogen") {
    chA.opts.title = "Stores of nitrogen over time"; chA.opts.xLabel = "years"; chA.opts.yLabel = "kg N per hectare"; chA.opts.xFmt = null; chA.opts.yFmt = null;
    chA.draw([{ pts: nHist.map(q => [q[0], q[1]]), color: "#7fe3a0", label: "plants and animals" }, { pts: nHist.map(q => [q[0], q[2]]), color: "#ffb347", label: "nitrate" }, { pts: nHist.map(q => [q[0], q[3]]), color: "#6fb1ff", label: "ammonium" }], { xMin: Math.max(0, (nHist.length ? nHist[nHist.length - 1][0] : 0) - 20), yMin: 0 });
    const oo = [], nn = []; for (let o = 0; o <= 1.001; o += 0.1) { const s = nSteady({ ...P, oxy: o }); oo.push([o, s.no3]); nn.push([o, s.nh4]); }
    chB.opts.title = "Nitrate and ammonium against soil oxygen (steady state)"; chB.opts.xLabel = "soil oxygen"; chB.opts.yLabel = "kg N per hectare"; chB.opts.xFmt = null;
    chB.draw([{ pts: oo, color: "#ffb347", label: "nitrate" }, { pts: nn, color: "#6fb1ff", label: "ammonium" }], { xMin: 0, xMax: 1, yMin: 0, vlines: [{ x: P.oxy, color: "#eef2f8", label: "now" }] });
    const f = NS.flux || {};
    read.set("a", NS.no3.toFixed(1) + " kg/ha"); read.set("b", NS.nh4.toFixed(1) + " kg/ha"); read.set("c", NS.org.toFixed(1) + " kg/ha"); read.set("d", (((f.denit || 0) + (f.leach || 0)) * 12).toFixed(1) + " kg/ha");
    ui.hud(P.oxy < 0.3 ? "Waterlogged: denitrifying bacteria turn nitrate into nitrogen gas" : "Bacteria recycle nitrogen between the stores");
  } else if (P.view === "quadrat") {
    const k = SP.findIndex(s => s.id === P.sp), tr = field.filter(p => p.k === k).length, qs = quads.filter(q => !q.tr), run = [];
    let s = 0; qs.forEach((q, i) => { s += q.c[k] / (q.s * q.s); run.push([i + 1, s / (i + 1) * FW * FH]); });
    chA.opts.title = `Running estimate of the ${SP[k].name} population`; chA.opts.xLabel = "quadrats placed"; chA.opts.yLabel = "estimated population"; chA.opts.xFmt = null; chA.opts.yFmt = null;
    chA.draw([{ pts: run, color: "#ffd166", label: "estimate" }], { xMin: 0, xMax: Math.max(10, qs.length), yMin: 0, hlines: [{ y: tr, color: "#7fe3a0", label: "true " + tr }] });
    const tq = quads.filter(q => q.tr);
    chB.opts.title = tq.length ? "Kite diagram along the transect" : "Distribution with distance from the wood"; chB.opts.xLabel = "distance from the wood (m)"; chB.opts.yLabel = "number per quadrat"; chB.opts.xFmt = null;
    const src = tq.length ? tq : quads;
    chB.draw(SP.map((sp, kk) => ({ pts: src.map(q => [q.x + q.s / 2, q.c[kk]]).sort((a, b) => a[0] - b[0]), type: tq.length ? undefined : "dots", color: sp.col, label: sp.name, r: 4 })), { xMin: 0, xMax: FW, yMin: 0 });
    const zA = quads.filter(q => q.zone === "A"), zB = quads.filter(q => q.zone === "B"), sum = z => SP.map((_, kk) => z.reduce((a, q) => a + q.c[kk], 0));
    read.set("a", qs.length + (tq.length ? ` (+${tq.length} on the transect)` : "")); read.set("b", run.length ? Math.round(run[run.length - 1][1]).toString() : "–"); read.set("c", tr); read.set("d", `${zA.length ? simpson(sum(zA)).toFixed(2) : "–"} · ${zB.length ? simpson(sum(zB)).toFixed(2) : "–"}`);
    ui.hud("Population ≈ mean per m² × area of the field");
  } else if (P.view === "succ") {
    chA.opts.title = "Stages over time"; chA.opts.xLabel = "years"; chA.opts.yLabel = "% of the area"; chA.opts.xFmt = null; chA.opts.yFmt = null;
    chA.draw(STAGE.map((s, k) => ({ pts: SG.hist.map(q => [q[0], q[1][k]]), color: SCOL[k] === "#5a5048" ? "#a89a8a" : SCOL[k], label: s.split(" ")[0] })), { xMin: 0, xMax: Math.max(50, SG.year), yMin: 0, yMax: 100 });
    chB.opts.title = "Soil depth"; chB.opts.xLabel = "years"; chB.opts.yLabel = "mean soil depth (cm)"; chB.opts.xFmt = null;
    chB.draw([{ pts: SG.hist.map(q => [q[0], q[2]]), color: "#c9a27a", label: "soil" }], { xMin: 0, xMax: Math.max(50, SG.year), yMin: 0 });
    const cnt = STAGE.map((_, k) => SG.st.filter(v => v === k).length), top = cnt.indexOf(Math.max(...cnt));
    read.set("a", SG.year); read.set("b", STAGE[top]); read.set("c", (SG.soil.reduce((a, b) => a + b, 0) / SG.soil.length).toFixed(1) + " cm"); read.set("d", ((cnt[4] + cnt[5]) / SG.st.length * 100).toFixed(0) + "%");
    ui.hud(P.graze > 0.01 ? "Grazing deflects succession: woody plants cannot establish" : "Each stage changes the soil so the next can establish");
  } else {
    chA.opts.title = "Algae, plants and fish"; chA.opts.xLabel = "days"; chA.opts.yLabel = "amount (relative)"; chA.opts.xFmt = null; chA.opts.yFmt = null;
    chA.draw([{ pts: lakeHist.map(q => [q[0], q[1]]), color: "#7fe3a0", label: "algae" }, { pts: lakeHist.map(q => [q[0], q[2] * 3]), color: "#3a8a3a", label: "rooted plants × 3" }, { pts: lakeHist.map(q => [q[0], q[4] * 3]), color: "#ffb347", label: "fish × 3" }], { xMin: 0, xMax: Math.max(60, lake.t), yMin: 0 });
    chB.opts.title = "Dissolved oxygen"; chB.opts.xLabel = "days"; chB.opts.yLabel = "mg/L"; chB.opts.xFmt = null;
    chB.draw([{ pts: lakeHist.map(q => [q[0], q[3]]), color: "#6fb1ff", label: "oxygen" }], { xMin: 0, xMax: Math.max(60, lake.t), yMin: 0, yMax: 10, hlines: [{ y: 3, color: "#ff5d6c", label: "fish die below about 3" }] });
    read.set("a", lake.t.toFixed(0)); read.set("b", lake.A.toFixed(1)); read.set("c", lake.O.toFixed(1) + " mg/L"); read.set("d", lake.F.toFixed(1));
    ui.hud(lake.O < 3 ? "Decomposing bacteria have used up the oxygen" : lake.A > 10 ? "Algal bloom: light is blocked" : "A healthy lake");
  }
}

// ---------------- The loop ----------------
let frame = 0, acc = 0;
ui.run(dt => {
  if (!(dt > 0)) return; tNow += dt;
  if (P.view === "web") { if (Math.random() < dt * 8) { const n = WEB[2 + Math.floor(Math.random() * 10)]; const e = n.eats && n.eats.filter(x => !removed.has(x)); if (e && e.length && !removed.has(n.id)) { const a = nodePos[e[0]], b = nodePos[n.id]; if (a && b) packets.push({ x: a[0], y: a[1], tx: b[0], ty: b[1], t: 0 }); } } for (const p of packets) { p.t += dt; p.x += (p.tx - p.x) * dt * 2; p.y += (p.ty - p.y) * dt * 2; } packets = packets.filter(p => p.t < 1.2).slice(-80); }
  if (P.view === "nitrogen") { const months = dt * 6 * speed; nStep(NS, P, months); acc += months; if (acc > 0.5) { acc = 0; const yr = (nHist.length ? nHist[nHist.length - 1][0] : 0) + 0.5 / 12; nHist.push([yr, NS.org, NS.no3, NS.nh4]); if (nHist.length > 2000) nHist.shift(); } }
  if (P.view === "succ") { acc += dt * speed * 4; while (acc >= 1) { acc--; succStep(SG, P, rnd); const cnt = STAGE.map((_, k) => 0); for (const s of SG.st) cnt[s]++; SG.hist.push([SG.year, cnt.map(n => n / SG.st.length * 100), SG.soil.reduce((a, b) => a + b, 0) / SG.soil.length]); } }
  if (P.view === "lake" && lake.t < 150) { const days = dt * 4 * speed, n = Math.ceil(days / 0.1); for (let k = 0; k < n; k++) lakeStep(lake, P, days / n); lakeHist.push([lake.t, lake.A, lake.Pl, lake.O, lake.F]); }
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
field = makeField(rnd);
set({ view: "web" });
ui.tip("Five views at the top of the controls. In the food web, click a species to remove it.", 7000);
