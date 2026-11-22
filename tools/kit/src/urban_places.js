/* =====================================================================
   CHANGING URBAN PLACES
   A city of 40 × 40 blocks, about 1600 households:
     BID-RENT       land is dearest at the centre (the CBD), where it is
                    most accessible; shops and offices outbid homes there,
                    and value falls with distance (bid-rent theory).
     DIVERSE PLACES households belong to two groups (say, two ethnic or
                    cultural groups). Each is content if at least a share
                    of its neighbours are like it; if not, it moves.
                    Even mild preferences make strongly SEGREGATED places
                    (Schelling's model).
     REGENERATION   investing in a run-down area raises its land value;
                    richer newcomers arrive and poorer residents are priced
                    out (GENTRIFICATION) unless homes are kept affordable.
     URBAN HEAT     built-up, paved blocks store heat and stay warmer than
                    green ones: the URBAN HEAT ISLAND.
   Indicators: an index of deprivation for each block, the dissimilarity
   index (segregation) and the LOCATION QUOTIENT, LQ = (share of a group in
   an area) ÷ (its share of the whole city).
   ===================================================================== */
const G = 40, C0 = (G - 1) / 2;
const dCBD = (x, y) => Math.hypot(x - C0, y - C0) / C0;                          // 0 at the centre, about 1 at the edge
// bid-rent: commercial land use bids most near the centre, then dense housing, then suburbs, then farmland at the edge
const landUse = (x, y) => { const d = dCBD(x, y); return d < 0.18 ? "cbd" : d < 0.45 ? "inner" : d < 0.85 ? "suburb" : "rural"; };
const LUC = { cbd: "#8a7cff", inner: "#d98b5f", suburb: "#7fbf7f", rural: "#2f5d3a" };
const baseValue = (x, y) => 900 * Math.exp(-3.2 * dCBD(x, y)) + 60;          // £ per m² (illustrative)
/* A city: each cell has a household with group (0 or 1), income (0–1), and whether it is an original (pre-regeneration) resident. */
function newCity(o, r) {
  const cells = []; for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const u = landUse(x, y), occ = u === "cbd" ? 0.35 : u === "rural" ? 0.25 : 0.93;
    // poorer households start nearer the old industrial east side of the inner city
    const east = x > C0 + 4 && Math.abs(y - C0) < 9 && dCBD(x, y) < 0.7, inc = Math.max(0.05, Math.min(1, 0.35 + 0.5 * dCBD(x, y) - (east ? 0.3 : 0) + 0.15 * r.gauss()));
    cells.push({ x, y, use: u, h: r() < occ ? { g: r() < o.share ? 1 : 0, inc, orig: true } : null, regen: 0, u: r(), green: u === "rural" ? 0.9 : u === "suburb" ? 0.45 : u === "inner" ? 0.15 : 0.05 }); }
  return { cells, t: 0, moves: 0, displaced: 0, regenArea: o.regen ? regenCells() : [] };
}
const regenCells = () => { const out = []; for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (x > C0 + 4 && Math.abs(y - C0) < 9 && dCBD(x, y) < 0.7) out.push(y * G + x); return out; };
const nbrs = (cs, i) => { const x = i % G, y = Math.floor(i / G), out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < G && Y < G) out.push(cs[Y * G + X]); } return out; };
const value = c => baseValue(c.x, c.y) * (1 + 1.4 * c.regen) * (1 + 0.3 * c.green);
/* One round: unhappy households (too few like neighbours) move to a random empty block they can afford; regeneration lifts land values in its area,
   and residents who can no longer afford the rent move out unless their home is in the affordable share. */
function step(city, o, r) {
  const cs = city.cells, empty = []; cs.forEach((c, i) => { if (!c.h && c.use !== "cbd") empty.push(i); });
  if (o.regen) for (const i of city.regenArea) { cs[i].regen = Math.min(1, cs[i].regen + 0.06); if (o.green) cs[i].green = Math.min(0.5, cs[i].green + 0.02); }
  let moved = 0;
  for (let k = 0; k < cs.length; k++) { const i = r.int(cs.length), c = cs[i]; if (!c.h) continue;
    const nb = nbrs(cs, i).filter(n => n.h), same = nb.filter(n => n.h.g === c.h.g).length, happy = nb.length === 0 || same / nb.length >= o.tol;
    const rentShare = value(c) / 900 * 0.6, priced = c.regen > 0.2 && c.h.inc < rentShare && c.u >= o.afford;            // can they still afford this block? (a share of homes, chosen once, stay affordable)
    if ((happy && !priced) || !empty.length) continue;
    // look at a few empty blocks and take the first one they can afford (and, if they care, with enough like neighbours)
    for (let t = 0; t < 12; t++) { const ei = r.int(empty.length), j = empty[ei], e = cs[j]; if (e.h || e.use === "cbd") continue; if (value(e) / 900 * 0.6 > c.h.inc + 0.1) continue;
      const nb2 = nbrs(cs, j).filter(n => n.h && n !== c), same2 = nb2.filter(n => n.h.g === c.h.g).length; if (nb2.length && same2 / nb2.length < o.tol && t < 10) continue;
      if (priced && c.h.orig) city.displaced++; e.h = c.h; c.h = null; empty[ei] = i; moved++; break; }
    // incomers to a regenerating area are richer
    if (!c.h && c.regen > 0.2 && r() < 0.6) c.h = { g: r() < o.share ? 1 : 0, inc: Math.min(1, 0.65 + 0.25 * r()), orig: false };
  }
  city.t++; city.moves = moved; return moved;
}
// dissimilarity index over 8 × 8 districts of 5 × 5 blocks: ½ Σ |aᵢ/A − bᵢ/B| (0 = evenly mixed, 1 = completely apart)
function dissimilarity(city) { const a = new Array(64).fill(0), b = new Array(64).fill(0); for (const c of city.cells) if (c.h) { const k = Math.floor(c.y / 5) * 8 + Math.floor(c.x / 5); c.h.g ? b[k]++ : a[k]++; } const A = a.reduce((s, v) => s + v, 0), B = b.reduce((s, v) => s + v, 0); let s = 0; for (let k = 0; k < 64; k++) s += Math.abs(a[k] / A - b[k] / B); return s / 2; }
// location quotient of group 1 in the regeneration area (or any list of blocks)
function lq(city, idx) { let g1 = 0, n = 0, G1 = 0, N = 0; city.cells.forEach((c, i) => { if (!c.h) return; N++; if (c.h.g) G1++; if (idx.includes(i)) { n++; if (c.h.g) g1++; } }); return n && G1 ? (g1 / n) / (G1 / N) : NaN; }
// deprivation (0–100): low income, empty or derelict blocks, little green space
const depr = c => c.use === "cbd" ? 15 : Math.max(0, Math.min(100, 100 * (0.7 * (1 - (c.h ? c.h.inc : 0.3)) + 0.2 * (c.h ? 0 : 1) + 0.1 * (1 - c.green))));
// air temperature on a still summer night: rural 16 °C plus up to 5 °C from built, paved surfaces, smoothed over neighbours
function temps(city, extraGreen = 0) { const cs = city.cells, raw = cs.map(c => 16 + 5 * (1 - Math.min(1, c.green + extraGreen)) * (c.use === "rural" ? 0.3 : 1)), out = raw.slice(); for (let i = 0; i < cs.length; i++) { const nb = nbrs(cs, i); let s = raw[i]; for (const n of nb) s += raw[n.y * G + n.x]; out[i] = s / (nb.length + 1); } return out; }
const uhi = (city, extraGreen = 0) => { const T = temps(city, extraGreen); let cbd = 0, nc = 0, rur = 0, nr = 0; city.cells.forEach((c, i) => { if (dCBD(c.x, c.y) < 0.2) { cbd += T[i]; nc++; } if (c.use === "rural") { rur += T[i]; nr++; } }); return cbd / nc - rur / nr; };
function runSchelling(tol, r, rounds = 25, share = 0.4) { const o = { tol, share, regen: false, afford: 0.3, green: false }, city = newCity(o, r); for (let k = 0; k < rounds; k++) step(city, o, r); return dissimilarity(city); }

// ---------------- The page ----------------
const DEF = { layer: "group", tol: 0.35, share: 0.4, regen: false, afford: 0.2, green: false, extraGreen: 0 };
const P = Object.assign({}, DEF); let city = null, seed = 1, rnd = K.rng(1), running = true, acc = 0, hist = [];
const ui = K.app({
  title: "Changing Urban Places", subject: "Geography",
  blurb: "A city of 1600 households: land values and bid-rent, mixed and segregated neighbourhoods, regeneration and gentrification, deprivation and the urban heat island",
  reset: () => set({ layer: P.layer }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 4 Changing cities: urban land use (CBD, inner city, suburbs, rural–urban fringe), inequality and deprivation within a city, regeneration and its effects, making cities more sustainable (green space).", adv: "Pearson Edexcel A level Geography (9GE0) Topic 4A Regenerating places (economic and social inequality, the need for regeneration, rebranding, the effects on different groups: gentrification and displacement) and 4B Diverse places (demographic and cultural diversity, segregation and its causes, measuring diversity with the location quotient and the index of dissimilarity, perceptions of places). The urban heat island and Schelling's model extend the specification." } },
  missions: [
    { title: "Land use and land value", q: "Layer: land use, then land value. How does land value change from the CBD to the edge? Why does the CBD have so few homes?", hint: "Land is most accessible at the centre, so shops and offices outbid housing there (bid-rent theory). Values fall steeply with distance; homes get bigger and greener towards the suburbs and the rural–urban fringe.", setup() { set({ layer: "use" }); } },
    { title: "Where is deprivation?", q: "Layer: deprivation. Where are the most deprived blocks? What do they have in common?", hint: "The old industrial inner east: low incomes, empty and derelict buildings, little green space. Deprivation is concentrated, not spread evenly.", setup() { set({ layer: "depr" }); } },
    { title: "Regeneration", q: "Switch on regeneration of the inner east and watch 20 rounds. What happens to land value, deprivation and the people who lived there?", hint: "Investment raises land values and lowers measured deprivation, but much of the improvement comes from richer people moving in. Many original residents are priced out (displaced): gentrification.", setup() { set({ layer: "value", regen: true }); } },
    { title: "Mild preferences, strong segregation", q: "Layer: groups. Everyone is happy as long as at least 35% of their neighbours are like them: hardly prejudiced. Watch the pattern. How segregated does the city become?", hint: "Schelling's surprise: the index of dissimilarity climbs well above the random level. Small individual preferences add up to strongly segregated places, without anyone wanting segregation.", setup() { set({ layer: "group", tol: 0.35 }); } },
    { lvl: "adv", title: "Affordable housing", q: "Regeneration with 0% affordable homes, then 70%. Compare the number of original residents displaced and the deprivation score.", hint: "Keeping homes affordable (social housing, rent controls, section 106 agreements) lets original residents stay. Deprivation falls less on paper, because the poorer people are still there, but the community is not broken up.", setup() { set({ layer: "income", regen: true, afford: 0 }); } },
    { lvl: "adv", title: "Location quotient", q: "Read the location quotient of group B in the inner east, before and after segregation develops. What do LQ > 1 and LQ < 1 mean?", hint: "LQ = share of group B in the area ÷ share in the city. LQ > 1: over-represented; < 1: under-represented; 1: the same as the city. As the city separates, LQs move away from 1.", setup() { set({ layer: "group", tol: 0.5 }); } },
    { lvl: "adv", title: "Cooling the city", q: "Layer: night temperature. How much warmer is the CBD than the countryside? Add green roofs and parks (extra green cover) and compare.", hint: "Paved, built-up blocks store heat and release it at night: the urban heat island, several °C. More vegetation (evapotranspiration, shade) cools the centre: a sustainable urban strategy.", setup() { set({ layer: "temp" }); } }
  ],
  batch: [
    { title: "Schelling: preference and segregation", question: "How segregated does the city become for each level of preference for like neighbours?", how: "40 × 40 city, two groups (40% and 60%), 25 rounds; index of dissimilarity over 64 districts. 0 = mixed, 1 = completely separated.", xLabel: "minimum share of like neighbours wanted", yLabel: "index of dissimilarity", xs: [0, 0.2, 0.3, 0.4, 0.5, 0.6], reps: 4, yMin: 0, yMax: 1, run: (t, r) => runSchelling(t, r), note: "Even 30–40% preferences produce strong segregation: the whole is more extreme than its parts. With no preference the index stays near its random value (about 0.15 here, from small districts)." },
    { title: "Bid-rent: land value against distance", question: "How does land value fall with distance from the CBD?", how: "Blocks sampled at each distance; values vary by ±15% (views, transport links).", xLabel: "distance from the CBD (km, edge = 10 km)", yLabel: "land value (£ per m²)", xs: [0, 1, 2, 4, 6, 8, 10], reps: 10, yMin: 0, theory: d => 900 * Math.exp(-3.2 * d / 10) + 60, theoryLabel: "bid-rent curve", run: (d, r) => (900 * Math.exp(-3.2 * d / 10) + 60) * (1 + 0.15 * r.gauss()), note: "A steep fall close to the centre, flattening out: accessibility is worth most where it is greatest." },
    { lvl: "adv", title: "Affordable housing and displacement", question: "How many original residents of the regeneration area are displaced, for each share of homes kept affordable?", how: "20 rounds of regeneration of the inner east; tolerance 0.3.", xLabel: "share of homes kept affordable", yLabel: "original residents displaced", xs: [0, 0.2, 0.4, 0.6, 0.8], reps: 4, yMin: 0, run: (a, r) => { const o = Object.assign({}, DEF, { regen: true, afford: a, tol: 0.3 }), c = newCity(o, r); for (let k = 0; k < 20; k++) step(c, o, r); return c.displaced; }, note: "Displacement falls steadily as more homes stay affordable. Regeneration can improve a place without replacing its people, but it costs public money or developers' profit." },
    { lvl: "adv", title: "Green cover and the heat island", question: "How much does extra vegetation cool the CBD at night?", how: "Urban heat island intensity = CBD temperature − rural temperature on a still summer night; ±0.3 °C weather noise.", xLabel: "extra green cover added (fraction)", yLabel: "UHI intensity (°C)", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5], reps: 5, yMin: 0, theory: e => uhi(newCity(DEF, K.rng(3)), e), theoryLabel: "model", run: (e, r) => uhi(newCity(DEF, r), e) + 0.3 * r.gauss(), note: "Each extra tenth of green cover cools the centre by about half a degree in this model." },
    { lvl: "adv", title: "The LQ of a random area", question: "With no preferences at all, how far from 1 is the location quotient of group B in a 300-block area, just by chance?", how: "A freshly mixed city each time (no moves).", yLabel: "location quotient", reps: 200, bins: 20, theory: 1, theoryLabel: "LQ = 1", run: (x, r) => lq(newCity(DEF, r), regenCells()), note: "Chance alone gives LQs between about 0.85 and 1.15 here: a measured LQ needs to be well outside that before it shows real concentration." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1GA0 4", text: "Urban land use: CBD (shops, offices, highest land values), inner city (terraces, old industry), suburbs (larger homes, more green space), rural–urban fringe. Land values fall with distance from the CBD." },
      { lvl: "std", tag: "1GA0 4", text: "Deprivation is concentrated in some areas (low income, unemployment, poor housing). Regeneration invests to improve them, but benefits are not shared equally." },
      { lvl: "adv", tag: "9GE0 4A", text: "Regeneration and rebranding change places; gentrification raises values and displaces lower-income residents. Success can be judged by income, employment, deprivation (IMD) and who still lives there." },
      { lvl: "adv", tag: "9GE0 4B", text: "Diverse places: segregation arises from choice, discrimination and housing markets. Measures: location quotient LQ = (area share) ÷ (city share); index of dissimilarity (0 = mixed, 1 = separate)." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Schelling's model: mild individual preferences produce strong segregation. The urban heat island: built surfaces store heat, so city centres stay several °C warmer at night." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why land values are highest in the CBD.", ans: "<ul><li>the CBD is the most accessible place (transport routes meet)</li><li>so many businesses want to locate there</li><li>competition for limited land raises its value; shops and offices outbid housing</li></ul>" },
      { lvl: "adv", marks: 2, q: () => city ? `In the inner east, group B is ${(100 * shareIn()).toFixed(0)}% of residents; across the city it is ${(100 * shareCity()).toFixed(0)}%. Calculate the location quotient and interpret it.` : "Calculate a location quotient.", ans: () => city ? `<ul><li>LQ = ${(100 * shareIn()).toFixed(0)} ÷ ${(100 * shareCity()).toFixed(0)} = ${(shareIn() / shareCity()).toFixed(2)}</li><li>${shareIn() > shareCity() ? "over-represented in the area (LQ > 1)" : "under-represented in the area (LQ < 1)"}</li></ul>` : "" },
      { lvl: "adv", marks: 4, q: "Assess whether regeneration benefits all groups in a place.", ans: "<ul><li>benefits: investment, jobs, better housing and environment, falling deprivation statistics</li><li>but rising rents and prices displace poorer residents (gentrification)</li><li>falling deprivation may come from population change, not improvement for original residents</li><li>affordable housing and community involvement can spread benefits</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>City:</b> 40 × 40 blocks; land use by distance from the centre (CBD, inner city, suburbs, rural fringe); land value 900e^(−3.2d) + 60 £/m², raised by regeneration (up to × 2.4) and green space.</li>
<li><b>Households:</b> two groups (group B is 40% unless changed) and an income from 0 to 1 that rises towards the suburbs and is lower in the old inner east.</li>
<li><b>Moving (Schelling):</b> a household is content if at least the chosen share of its occupied neighbours (of 8) are in its group; if not, it looks at up to 12 empty blocks it can afford and moves to one with enough like neighbours.</li>
<li><b>Regeneration:</b> each round raises the inner east's regeneration level; residents whose income is below the new rent share are priced out unless their home is in the affordable share. Incomers are richer.</li>
<li><b>Deprivation</b> (0–100) = 70% low income + 20% empty or derelict + 10% lack of green space. <b>Night temperature</b> = 16 °C + 5 °C × (1 − green cover), smoothed over neighbours.</li></ul>
<h3>Simplifications</h3><ul><li>Two groups only; real diversity has many dimensions (ethnicity, age, class, religion).</li><li>No new building, transport or jobs; incomes do not change except by people moving.</li><li>All numbers are illustrative.</li></ul>`
});
const inEast = () => regenCells();
const shareIn = () => { let g1 = 0, n = 0; for (const i of inEast()) { const c = city.cells[i]; if (c.h) { n++; if (c.h.g) g1++; } } return n ? g1 / n : 0; };
const shareCity = () => { let g1 = 0, n = 0; for (const c of city.cells) if (c.h) { n++; if (c.h.g) g1++; } return n ? g1 / n : 0; };

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Map layer");
ctl.layer = K.seg(g, { value: "group", options: [["use", "Land use"], ["value", "Land value"], ["group", "Groups"], ["income", "Income"], ["depr", "Deprivation"], ["temp", "Night temperature"]], on: v => P.layer = v });
g = ui.group("People");
ctl.tol = K.slider(g, { label: "Like neighbours wanted (at least)", min: 0, max: 0.75, step: 0.05, value: 0.35, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.tol = v });
ctl.share = K.slider(g, { label: "Group B share of the city", min: 0.1, max: 0.5, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.share = v; restart(); } });
g = ui.group("Policy");
ctl.regen = K.toggle(g, { label: "Regenerate the inner east", value: false, on: v => { P.regen = v; if (v && city) city.regenArea = regenCells(); } });
ctl.afford = K.slider(g, { label: "Homes kept affordable", min: 0, max: 1, step: 0.1, value: 0.2, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.afford = v });
ctl.green = K.toggle(g, { label: "Regeneration includes parks", value: false, on: v => P.green = v });
ctl.extraGreen = K.slider(g, { label: "Green roofs and street trees (extra cover)", min: 0, max: 0.5, step: 0.05, value: 0, fmt: v => "+" + (v * 100).toFixed(0) + "%", on: v => P.extraGreen = v });
let rr = K.row(g); K.btn(rr, "↺ New city", () => { seed++; restart(); }, "primary"); K.btn(rr, "⏯ Moving on/off", () => running = !running);
const read = K.readout(ui.group("Indicators"), [["t", "round"], ["d", "index of dissimilarity"], ["lq", "LQ of group B, inner east"], ["dep", "deprivation, inner east"], ["dis", "original residents displaced"], ["uhi", "heat island (CBD − rural)"]]);
function sync() { ctl.layer.set(P.layer); ctl.tol.set(P.tol); ctl.share.set(P.share); ctl.regen.set(P.regen); ctl.afford.set(P.afford); ctl.green.set(P.green); ctl.extraGreen.set(P.extraGreen); const adv = ui.level === "adv"; ctl.afford.el.style.display = adv ? "" : "none"; ctl.share.el.style.display = adv ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); sync(); restart(); }
function restart() { rnd = K.rng(seed * 6007 + 11); city = newCity(P, rnd); hist = []; running = true; acc = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const ramp = (v, a, b) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return `hsl(${240 - 240 * t},70%,${30 + 30 * t}%)`; };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!city) return;
  const s = Math.min((h - 40) / G, (w * 0.62) / G), x0 = 20, y0 = 20, T = P.layer === "temp" ? temps(city, P.extraGreen) : null, regenSet = new Set(city.regenArea);
  city.cells.forEach((cl, i) => { let col;
    if (P.layer === "use") col = LUC[cl.use]; else if (P.layer === "value") col = ramp(Math.log(value(cl)), Math.log(80), Math.log(1300)); else if (P.layer === "temp") col = ramp(T[i], 16, 21);
    else if (P.layer === "depr") col = ramp(depr(cl), 10, 80); else if (P.layer === "income") col = cl.h ? ramp(cl.h.inc, 0, 1) : "#1a2238"; else col = cl.h ? (cl.h.g ? "#ffb454" : "#5ad1ff") : (cl.use === "cbd" ? "#3a3560" : "#1a2238");
    c.fillStyle = col; c.fillRect(x0 + cl.x * s, y0 + cl.y * s, s - 0.6, s - 0.6);
    if (P.layer === "group" && cl.h && !cl.h.orig) { c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(x0 + cl.x * s + s * 0.35, y0 + cl.y * s + s * 0.35, s * 0.3, s * 0.3); } });
  if (P.regen) { c.strokeStyle = "#ffd166"; c.setLineDash([5, 4]); c.lineWidth = 2; const xs = city.regenArea.map(i => i % G), ys = city.regenArea.map(i => Math.floor(i / G)); c.strokeRect(x0 + Math.min(...xs) * s, y0 + Math.min(...ys) * s, (Math.max(...xs) - Math.min(...xs) + 1) * s, (Math.max(...ys) - Math.min(...ys) + 1) * s); c.setLineDash([]); c.lineWidth = 1; }
  let tx = x0 + G * s + 24, ty = 40; const tw = w - tx - 16;
  const legends = { use: [["#8a7cff", "CBD: shops and offices"], ["#d98b5f", "inner city: dense housing, old industry"], ["#7fbf7f", "suburbs"], ["#2f5d3a", "rural–urban fringe"]], group: [["#5ad1ff", "group A"], ["#ffb454", "group B"], ["#1a2238", "empty block"], ["#ffffff", "white dot: newcomer"]],
    value: [[ramp(1, 0, 1), "high land value"], [ramp(0, 0, 1), "low"]], income: [[ramp(1, 0, 1), "high income"], [ramp(0, 0, 1), "low income"]], depr: [[ramp(1, 0, 1), "most deprived"], [ramp(0, 0, 1), "least deprived"]], temp: [[ramp(1, 0, 1), "21 °C"], [ramp(0, 0, 1), "16 °C"]] };
  TX(c, { use: "Land use", value: "Land value", group: "Who lives where", income: "Household income", depr: "Index of deprivation", temp: "Night temperature (still summer night)" }[P.layer], tx, ty, "#eef2f8", "left", "600 14px"); ty += 24;
  for (const [col, t] of legends[P.layer]) { c.fillStyle = col; c.fillRect(tx, ty - 10, 14, 12); TX(c, t, tx + 22, ty, "#cfd8ea", "left", "12px"); ty += 20; }
  ty += 10; if (P.regen) { TX(c, "Dashed box: the regeneration area (inner east)", tx, ty, "#ffd166", "left", "12px"); ty += 20; }
  TX(c, `Round ${city.t} · ${city.moves} households moved last round`, tx, ty, "#8fa0bf", "left", "11.5px");
  ui.hud("");
}
// ---------------- Charts ----------------
function charts() { if (!city) return;
  chA.opts.title = "Over time"; chA.opts.xLabel = "round"; chA.opts.yLabel = "index / ÷100";
  chA.draw([{ pts: hist.map(q => [q.t, q.d]), color: "#ffb454", label: "dissimilarity" }, { pts: hist.map(q => [q.t, q.dep / 100]), color: "#ff6b81", label: "deprivation, inner east ÷ 100" }, { pts: hist.map(q => [q.t, q.lq]), color: "#7ee787", label: "LQ group B, inner east" }], { xMin: 0, yMin: 0 });
  // a transect from west to east through the centre
  const row = Math.round(C0), T = temps(city, P.extraGreen), tr = []; for (let x = 0; x < G; x++) { const cl = city.cells[row * G + x]; tr.push([x / (G - 1) * 20 - 10, P.layer === "temp" ? T[row * G + x] : P.layer === "depr" ? depr(cl) : P.layer === "income" ? (cl.h ? cl.h.inc * 100 : NaN) : value(cl)]); }
  chB.opts.title = "West–east transect through the CBD"; chB.opts.xLabel = "km from the centre (west −, east +)"; chB.opts.yLabel = { temp: "°C", depr: "deprivation", income: "income × 100" }[P.layer] || "£ per m²"; chB.draw([{ pts: tr, color: "#5ad1ff", label: { temp: "night temperature", depr: "deprivation", income: "income" }[P.layer] || "land value" }], { xMin: -10, xMax: 10 });
  const east = inEast(); let dep = 0, n = 0; for (const i of east) { dep += depr(city.cells[i]); n++; }
  read.set("t", city.t); read.set("d", dissimilarity(city).toFixed(2)); read.set("lq", lq(city, east).toFixed(2)); read.set("dep", (dep / n).toFixed(0)); read.set("dis", city.displaced); read.set("uhi", uhi(city, P.extraGreen).toFixed(1) + " °C");
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(dt => { if (!running || !(dt > 0) || !city) return; acc += dt * 2; if (acc >= 1) { acc = 0; if (city.t < 60) { step(city, P, rnd); const east = inEast(); let dep = 0; for (const i of east) dep += depr(city.cells[i]); hist.push({ t: city.t, d: dissimilarity(city), dep: dep / east.length, lq: lq(city, east) }); } } }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Each square is a block of homes. Households move if too few neighbours are like them, or if regeneration prices them out.", 7000);
