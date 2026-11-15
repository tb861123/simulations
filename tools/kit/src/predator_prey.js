/* =====================================================================
   FOXES AND RABBITS
   A meadow, seen from above. Grass grows; rabbits eat grass and breed;
   foxes eat rabbits and breed. Every animal is followed individually,
   one day at a time, and each follows a few simple rules:

   GRASS    each patch regrows towards full cover, fastest when half-grown.
   RABBIT   hops towards greener grass, eats, uses up energy, breeds when
            well fed, and dies if it starves, grows old or is caught.
   FOX      when hungry, heads for the nearest rabbit it can see, catches it some of
            the time, uses up energy, breeds when well fed, and starves
            if it goes too long without a meal.

   Nobody tells the populations to go up and down. The famous cycles
   (many rabbits -> foxes thrive -> rabbits crash -> foxes starve ->
   rabbits recover) come out of animals meeting, eating and breeding.

   UNITS: metres and days. Each grass patch is 10 m x 10 m.
   ===================================================================== */
const CELL = 10, SIGHT = 60;
const DEF = {
  grow: 0.06,      // grass regrowth rate per day
  breed: 0.012,    // chance per day that a well-fed adult rabbit has a kit
  hunt: 0.35,      // chance a fox catches a rabbit it has spotted
  need: 1,         // how much energy a fox uses (1 = normal)
  refuge: 0,       // percentage of the meadow that is warren or bramble where foxes cannot catch rabbits
  cull: 0,         // percentage of foxes shot each year
  fbreed: 0.008,   // chance per day that a well-fed adult fox raises a cub
  sight: 40,       // how far a fox can spot a rabbit (m)
  terr: 4,         // most foxes (including itself) in the surrounding 180 m square for a fox to breed
  meal: 1.0,       // energy a fox gets from one rabbit (it uses 0.085 a day, so a rabbit lasts about 12 days)
  wary: 10         // rabbits in a 60 m square needed before a fox is sure to find one
};
class Meadow {
  constructor(gw, gh, rand, P) {
    this.gw = gw; this.gh = gh; this.W = gw * CELL; this.H = gh * CELL; this.rand = rand; this.P = Object.assign({}, DEF, P); this.day = 0;
    this.grass = new Float32Array(gw * gh).fill(0.8); this.safe = new Uint8Array(gw * gh); this.rab = []; this.fox = []; this.kills = null; this.hw = Math.ceil(this.W / SIGHT); this.hh = Math.ceil(this.H / SIGHT); this.hash = [];
    this.setRefuges(); this.births = 0; this.eaten = 0; this.starved = 0;
  }
  setRefuges() { this.safe.fill(0); const r = K.rng(99), n = Math.round(this.P.refuge / 100 * this.gw * this.gh / 12); for (let k = 0; k < n; k++) { const cx = Math.floor(r() * this.gw), cy = Math.floor(r() * this.gh); for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) if ((dx < 2 && dy < 2) || r() < 0.3) this.safe[((cy + dy + this.gh) % this.gh) * this.gw + (cx + dx + this.gw) % this.gw] = 1; } }
  addRabbits(n) { const r = this.rand; for (let k = 0; k < n; k++) this.rab.push({ x: r() * this.W, y: r() * this.H, e: 0.6 + r() * 0.6, age: 100 + r() * 600, dead: false }); }
  addFoxes(n) { const r = this.rand; for (let k = 0; k < n; k++) this.fox.push({ x: r() * this.W, y: r() * this.H, e: 0.6 + 0.6 * r(), age: 300 + r() * 900, hx: r() * 6.283, dead: false }); }
  step() {   // one day
    const { gw, gh, W, H, grass, rand, P } = this, r = rand;
    // ---- GRASS: logistic regrowth, with a little reseeding so bare ground recovers ----
    for (let i = 0; i < grass.length; i++) { const g = grass[i]; grass[i] = g + P.grow * g * (1 - g) + 0.0015 * (1 - g); }
    // ---- RABBITS ----
    const rab = this.rab, kits = [];
    for (const a of rab) {
      const cx = Math.min(gw - 1, a.x / CELL | 0), cy = Math.min(gh - 1, a.y / CELL | 0), here = grass[cy * gw + cx];
      // hop: usually a short random hop, but if the grass here is poor, towards the greenest neighbouring patch
      let ang = r() * 6.283, d = 6 + r() * 10;
      if (here < 0.35) { let best = here, bx = 0, by = 0; for (let k = 0; k < 4; k++) { const dx = [1, -1, 0, 0][k], dy = [0, 0, 1, -1][k], g2 = grass[((cy + dy + gh) % gh) * gw + (cx + dx + gw) % gw]; if (g2 > best + r() * 0.1) { best = g2; bx = dx; by = dy; } } if (bx || by) { ang = Math.atan2(by, bx) + (r() - .5); d = 12; } }
      a.x = (a.x + Math.cos(ang) * d + W) % W; a.y = (a.y + Math.sin(ang) * d + H) % H;
      const i = Math.min(gh - 1, a.y / CELL | 0) * gw + Math.min(gw - 1, a.x / CELL | 0), bite = Math.max(0, Math.min(grass[i] - 0.08, 0.04));   /* the lowest growth cannot be grazed */ grass[i] -= bite; a.e += bite * 1.6 - 0.03;        // eat, and pay the daily cost of living
      a.age++; if (a.e > 1.2) a.e = 1.2;
      if (a.e <= 0) { a.dead = true; this.starved++; } else if (a.age > 1500) a.dead = true;
      else if (a.e > 0.9 && a.age > 100 && r() < P.breed) { a.e -= 0.35; kits.push({ x: a.x, y: a.y, e: 0.5, age: 0, dead: false }); this.births++; }
    }
    for (const k of kits) rab.push(k);
    // ---- FOXES: sort the rabbits into 60 m squares so each fox only looks nearby ----
    const hw = this.hw, hh = this.hh, hash = this.hash; for (let i = 0; i < hw * hh; i++) (hash[i] || (hash[i] = [])).length = 0;
    for (const a of rab) if (!a.dead) hash[Math.min(hh - 1, a.y / SIGHT | 0) * hw + Math.min(hw - 1, a.x / SIGHT | 0)].push(a);
    const cubs = [], cullP = P.cull / 100 / 365, fcount = this.fcount || (this.fcount = new Uint8Array(hw * hh)); fcount.fill(0); for (const f of this.fox) fcount[Math.min(hh - 1, f.y / SIGHT | 0) * hw + Math.min(hw - 1, f.x / SIGHT | 0)]++;
    const near = (x, y) => { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += fcount[((y + dy + hh) % hh) * hw + (x + dx + hw) % hw]; return s; };   // foxes in the surrounding 180 m square
    for (const f of this.fox) {
      const hx = Math.min(hw - 1, f.x / SIGHT | 0), hy = Math.min(hh - 1, f.y / SIGHT | 0); let prey = null, bd = P.sight * P.sight; const local = hash[hy * hw + hx].length;
      // a hungry fox looks for rabbits. Where rabbits are scarce they are wary and stay near cover, so they are much harder to find
      if (f.e < 1.3 && r() < local / P.wary) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const a of hash[((hy + dy + hh) % hh) * hw + (hx + dx + hw) % hw]) { if (a.dead) continue; let ddx = a.x - f.x, ddy = a.y - f.y; if (ddx > W / 2) ddx -= W; if (ddx < -W / 2) ddx += W; if (ddy > H / 2) ddy -= H; if (ddy < -H / 2) ddy += H; const d2 = ddx * ddx + ddy * ddy; if (d2 < bd) { bd = d2; prey = a; f.tx = ddx; f.ty = ddy; } }
      if (prey) {
        const d = Math.sqrt(bd), go = Math.min(d, 50); f.x = (f.x + f.tx / (d || 1) * go + W) % W; f.y = (f.y + f.ty / (d || 1) * go + H) % H; f.hx = Math.atan2(f.ty, f.tx);
        const hidden = this.safe[Math.min(gh - 1, prey.y / CELL | 0) * gw + Math.min(gw - 1, prey.x / CELL | 0)];
        if (d <= 50 && !hidden && r() < P.hunt) { prey.dead = true; f.e += P.meal; this.eaten++; if (this.kills && this.kills.length < 80) this.kills.push([prey.x, prey.y, 1]); }      // a kill: one rabbit is about twelve days' food
      } else { f.hx += (r() - .5) * 1.2; f.x = (f.x + Math.cos(f.hx) * 30 + W) % W; f.y = (f.y + Math.sin(f.hx) * 30 + H) % H; }                                                  // nothing in sight: roam
      f.e -= 0.085 * P.need; f.age++;
      if (f.e <= 0) f.dead = true; else if (f.age > 3200 || r() < cullP) f.dead = true;
      else if (f.e > 1.0 && f.age > 300 && r() < P.fbreed && near(hx, hy) <= P.terr) {     /* foxes are territorial: no cubs are raised where foxes are crowded */ f.e -= 0.4; cubs.push({ x: f.x, y: f.y, e: 0.6, age: 0, hx: r() * 6.283, dead: false }); }
    }
    for (const c of cubs) this.fox.push(c);
    this.rab = rab.filter(a => !a.dead); this.fox = this.fox.filter(f => !f.dead); this.day++;
  }
  cover() { let s = 0; for (let i = 0; i < this.grass.length; i++) s += this.grass[i]; return 100 * s / this.grass.length; }
}
// A run without drawing (a 600 m × 300 m meadow unless told otherwise). Returns yearly series and summary figures.  o = { gw, gh, rabbits, foxes, years, P }
function run(o, rnd) {
  const m = new Meadow(o.gw || 60, o.gh || 30, rnd, o.P); m.addRabbits(o.rabbits == null ? 300 : o.rabbits); m.addFoxes(o.foxes == null ? 7 : o.foxes); const R = [], F = [], years = o.years || 25;
  for (let d = 0; d < years * 365; d++) { m.step(); if (d % 30 === 0) { R.push(m.rab.length); F.push(m.fox.length); } if (!m.rab.length) break; }
  const half = R.slice(Math.floor(R.length / 3)), mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1), mr = mean(half), sd = Math.sqrt(mean(half.map(v => (v - mr) ** 2)));
  return { R, F, meanR: mr, meanF: mean(F.slice(Math.floor(F.length / 3))), cv: sd / (mr || 1), foxesLeft: m.fox.length, rabbitsLeft: m.rab.length, years: m.day / 365 };
}
// how many months the fox numbers lag behind the rabbit numbers: the shift that makes the two curves match best
function lag(R, F) { const n = R.length, mr = R.reduce((a, b) => a + b, 0) / n, mf = F.reduce((a, b) => a + b, 0) / n; let best = 0, bv = -1e9; for (let L = 0; L <= 40; L++) { let s = 0; for (let i = 0; i + L < n; i++) s += (R[i] - mr) * (F[i + L] - mf); s /= (n - L); if (s > bv) { bv = s; best = L; } } return best; }

// ---------------- The page ----------------
const P = Object.assign({}, DEF), SIZES = { small: [36, 18, 120, 3], medium: [72, 36, 500, 10], large: [128, 64, 1600, 30] };
let size = "large", meadow, rate = 40, acc = 0, log = [], phase = [], rnd = K.rng(Date.now() % 99991 + 11);
function restart(rabbits, foxes) { const [gw, gh, nr, nf] = SIZES[size]; meadow = new Meadow(gw, gh, rnd, P); meadow.P = P; meadow.kills = []; meadow.addRabbits(rabbits == null ? nr : rabbits); meadow.addFoxes(foxes == null ? nf : foxes); log = []; phase = []; acc = 0; }

const ui = K.app({
  title: "Foxes and Rabbits", subject: "Biology",
  blurb: "A meadow where every animal is followed, and populations rise and crash by themselves",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 4(a) The organism in the environment and 4(b) Feeding relationships: populations, communities, and the factors that affect population size.", adv: "OCR A level Biology A (H420) 6.3.2 Populations and sustainability: limiting factors, carrying capacity, predator–prey relationships; 6.3.1 Ecosystems." } },
  missions: [
    { title: "Boom and bust", q: "Watch the meadow and the left-hand graph for ten years or so. Describe what happens to the number of rabbits and the number of foxes. Which peaks first?", hint: "The numbers rise and fall in cycles. Plenty of rabbits means foxes are well fed and breed, so fox numbers rise; more foxes eat more rabbits, so rabbits fall; with few rabbits, foxes starve and their numbers fall; with few foxes, rabbits recover, and round it goes. The fox peak always comes after the rabbit peak. The classic real example is the snowshoe hare and the lynx in Canada, recorded for over a century in fur-trapping records.", setup() { set({}); } },
    { title: "Take away the foxes", q: "There are no foxes in this meadow. What happens to the rabbits? Do they increase for ever? Watch the grass as well.", hint: "The rabbits multiply fast, then run out of food: the grass is eaten down and the population levels off, with rabbits starving as fast as they are born. The meadow can only support a certain number: its carrying capacity. Without predators the rabbits are limited by food instead, and the meadow is grazed bare. This is what happened when rabbits were introduced to Australia.", setup() { set({ foxes: 0, rabbits: 60 }); } },
    { title: "A disease strikes", q: "Let the cycles settle, then press 'Rabbit disease' (it kills 80% of the rabbits, as myxomatosis did in Britain in the 1950s). Follow both populations for the next few years.", hint: "Rabbits crash at once. The foxes do not die at once but go hungry: their numbers fall over the following months. With few foxes and plenty of grass, the surviving rabbits then recover quickly, often overshooting. A change to one species travels through the food chain, with a delay. In Britain, buzzards and foxes declined after myxomatosis, and the grassland changed too.", setup() { set({}); } },
    { title: "Culling the predator", q: "A gamekeeper shoots foxes. Set 'Foxes culled each year' to 40% and watch for a few years. What happens to the rabbits? Is that what the farmer next door wants?", hint: "With fewer foxes, more rabbits survive, and the average number of rabbits rises: more damage to crops and grass. Removing a predator often causes its prey to boom. This is why wolves were brought back to Yellowstone, where too many deer were stripping the vegetation.", setup() { set({}); } },
    { title: "Somewhere to hide", q: "Add refuges: patches of bramble and warren (dark) where foxes cannot catch rabbits. Try 15%, then 40%. What happens to the size of the swings? What happens to the foxes with 40%?", hint: "A few refuges make the system steadier: foxes can never catch the last rabbits, so the rabbit population never crashes as low and recovers sooner. With too many refuges the foxes can hardly find a meal and die out. In real ecosystems hiding places, difficult terrain and prey that are hard to catch all help predator and prey to coexist.", setup() { set({ refuge: 15 }); } },
    { title: "A small island", q: "The same animals on a much smaller meadow. Run it several times with 'Start again'. What usually happens, and why does it not happen on the big meadow?", hint: "On a small patch the numbers are small, so when rabbits are scarce a run of bad luck can wipe out the last few foxes (or the last few rabbits), and once a species has gone it cannot come back. On a big meadow the animals in different places are out of step with each other, so somewhere there are always survivors to recolonise the rest. This is one reason small nature reserves lose species, and why wildlife corridors matter.", setup() { set({ size: "small" }); } },
    { lvl: "adv", title: "The loop", q: "The right-hand graph plots foxes against rabbits. Which way round the loop does the system go? Where on the loop are the rabbits increasing fastest? What would a perfectly steady ecosystem look like on this graph?", hint: "The path goes round anticlockwise: many rabbits and few foxes (bottom right) → foxes rise (top right) → rabbits fall (top left) → foxes fall (bottom left) → rabbits rise again. A steady ecosystem would be a single point. The Lotka–Volterra equations predict closed loops; here chance and the grass make the loops wander, shrinking and growing from cycle to cycle.", setup() { set({}); } },
    { lvl: "adv", title: "Better hunters, fewer foxes?", q: "Raise 'Fox hunting success' from 35% towards 80%. You might expect more successful foxes to do better. What happens to the swings, and to the foxes' chance of surviving at all?", hint: "More efficient predators drive the prey lower, then starve: the swings get more violent and the risk of extinction rises. Predators that are 'too good' destroy their own food supply. The same thing can happen if the prey's food supply is enriched, which also makes the cycles more violent (the 'paradox of enrichment').", setup() { set({}); } }
  ],
  batch: [
    { title: "Carrying capacity", question: "With no foxes, how many rabbits can the meadow support?", how: "Each run: a 600 × 300 m meadow with no foxes, 12 years. The result is the average number of rabbits over the last 8 years.", xLabel: "grass regrowth rate (per day)", yLabel: "rabbits the meadow supports", xs: [0.02, 0.03, 0.04, 0.06, 0.08, 0.1], reps: 4, yMin: 0, fit: true, run: (x, r) => run({ foxes: 0, rabbits: 100, years: 12, P: { grow: x } }, r).meanR, note: "The number of rabbits is set by how fast the grass can regrow: about double the regrowth, double the rabbits. That number is the meadow's carrying capacity." },
    { title: "Do the foxes survive?", question: "How does the size of the meadow affect the foxes' chance of surviving 25 years?", how: "Each run: a meadow of the chosen area with the same density of animals to start. The result is 100 if any foxes are left after 25 years, 0 if not, so the mean is the percentage of meadows that kept their foxes.", xLabel: "area of meadow (hectares)", yLabel: "meadows with foxes after 25 years (%)", xs: [4.5, 8, 12.5, 18, 32, 50], reps: 8, yMin: 0, yMax: 100, run(x, r) { const gh = Math.round(Math.sqrt(x * 100 / 2)), gw = gh * 2; return run({ gw, gh, rabbits: Math.round(x * 17), foxes: Math.max(2, Math.round(x * 0.4)), years: 25 }, r).foxesLeft > 0 ? 100 : 0; }, note: "Each run is all-or-nothing: the foxes either last or they do not. Small populations are at the mercy of chance." },
    { title: "Who peaks first?", question: "By how many months do the fox numbers lag behind the rabbit numbers?", how: "Each run: a 720 × 360 m meadow for 30 years. The fox curve is slid back in time until it matches the rabbit curve best; the result is the shift needed.", xLabel: "", yLabel: "fox peak comes after rabbit peak by (months)", reps: 24, bins: 16, lo: 0, hi: 32, run(x, r) { const q = run({ gw: 72, gh: 36, rabbits: 500, foxes: 10, years: 30 }, r); return q.foxesLeft && q.R.length > 100 ? lag(q.R, q.F) : null; }, note: "The predators always follow the prey, never the other way round: it takes time for well-fed foxes to raise cubs, and time for hungry foxes to starve." },
    { title: "Culling foxes", question: "How does shooting foxes change the number of rabbits?", how: "Each run: a 720 × 360 m meadow for 20 years with the chosen share of foxes shot each year. The result is the average number of rabbits.", xLabel: "foxes culled each year (%)", yLabel: "average number of rabbits", xs: [0, 10, 20, 30, 40, 50, 60], reps: 4, yMin: 0, run: (x, r) => run({ gw: 72, gh: 36, rabbits: 500, foxes: 10, years: 20, P: { cull: x } }, r).meanR },
    { title: "Refuges and stability", question: "Do hiding places make the populations steadier?", how: "Each run: a 720 × 360 m meadow for 20 years with the chosen share of refuge. The result is how much the rabbit numbers swing: their standard deviation as a percentage of their mean.", xLabel: "refuge (% of the meadow)", yLabel: "size of the swings in rabbit numbers (%)", xs: [0, 5, 10, 15, 20, 30, 40], reps: 4, yMin: 0, run: (x, r) => 100 * run({ gw: 72, gh: 36, rabbits: 500, foxes: 10, years: 20, P: { refuge: x } }, r).cv },
    { title: "Hunting success", question: "What happens as foxes get better at catching rabbits?", how: "Each run: a 720 × 360 m meadow for 20 years. The result is the average number of foxes (zero if they died out).", xLabel: "fox hunting success (%)", yLabel: "average number of foxes", xs: [10, 20, 30, 40, 50, 65, 80], reps: 5, yMin: 0, run: (x, r) => { const q = run({ gw: 72, gh: 36, rabbits: 500, foxes: 10, years: 20, P: { hunt: x / 100 } }, r); return q.meanF; }, note: "Too poor a hunter starves; too good a hunter wipes out its food. The largest fox population is in between." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 4(a)", text: "A population is all the organisms of one species living in a habitat. Its size is affected by food supply, predation, disease and competition." },
      { lvl: "std", tag: "4BI1 4(b)", text: "Food chain: grass → rabbit → fox. Grass is the producer, the rabbit the primary consumer, the fox the secondary consumer. A change in one population affects the others." },
      { lvl: "std", tag: "4BI1 4(a)", text: "Predator and prey numbers rise and fall in cycles, with the predator's changes following the prey's." },
      { lvl: "adv", tag: "H420 6.3.2", text: "Carrying capacity: the maximum population size an environment can support indefinitely, set by limiting factors. Density-dependent factors (food, predation, disease) act more strongly as a population grows." },
      { lvl: "adv", tag: "H420 6.3.2", text: "Predator–prey relationships show delayed negative feedback: each population limits the other, producing oscillations with the predator lagging the prey." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Lotka–Volterra equations: dR/dt = aR − bRF and dF/dt = cRF − dF give closed cycles. Real populations add chance, a limit on prey food and space, which change the picture." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain why the numbers of a predator and its prey often rise and fall in cycles.", ans: "<ul><li>When prey are numerous, predators have plenty of food, so more survive and breed: predator numbers rise</li><li>More predators eat more prey, so prey numbers fall</li><li>With less food, predators starve or breed less: predator numbers fall</li><li>With fewer predators, more prey survive and breed, so prey numbers rise again</li></ul>" },
      { lvl: "std", marks: 2, q: "On a graph of predator and prey numbers against time, the predator's peaks come slightly after the prey's. Explain why.", ans: "<ul><li>It takes time for the extra food to be turned into more predators (they must breed and the young grow up)</li><li>and time for predators to starve when prey become scarce</li></ul>" },
      { lvl: "std", marks: 3, q: "A disease kills most of the rabbits in an area. Predict and explain the effect on (a) the foxes and (b) the grass.", ans: "<ul><li>(a) Fox numbers fall, because there is less food, so some starve or fail to breed (or they switch to other prey)</li><li>(b) The grass grows more, because fewer rabbits are eating it</li><li>Credit the idea that the effects are delayed / pass along the food chain</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Your meadow has ${meadow.rab.length} rabbits and ${meadow.fox.length} foxes in ${(meadow.W * meadow.H / 10000).toFixed(0)} hectares. Calculate the population density of each, per hectare.`, ans: () => { const a = meadow.W * meadow.H / 10000; return `<ul><li>density = number ÷ area</li><li>rabbits: ${meadow.rab.length} ÷ ${a.toFixed(0)} = ${(meadow.rab.length / a).toFixed(1)} per hectare</li><li>foxes: ${meadow.fox.length} ÷ ${a.toFixed(0)} = ${(meadow.fox.length / a).toFixed(2)} per hectare</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Suggest why there are always far fewer foxes than rabbits in a meadow.", ans: "<ul><li>Energy is lost at each stage of a food chain (in respiration, movement, heat and waste)</li><li>so only a small part of the energy in the rabbits is available to support foxes</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain what is meant by carrying capacity, and name two limiting factors that could set it for a population of rabbits.", ans: "<ul><li>The maximum stable population size that the environment can support over a long period</li><li>Any two limiting factors: food supply (grass), predation, disease, space / burrow sites, competition</li><li>Credit: density-dependent factors act more strongly as the population rises, bringing it back towards the carrying capacity</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain why a species is more likely to die out in a small, isolated habitat than in a large one, even if the population density is the same.", ans: "<ul><li>The total population is smaller</li><li>so chance events (a poor breeding season, disease, a few deaths) have a larger effect and can remove every individual</li><li>Less genetic diversity / inbreeding may reduce survival</li><li>Isolation means no immigration from elsewhere to restore the population</li></ul>" },
      { lvl: "adv", marks: 3, q: "Conservationists removed an introduced predator from an island, and the number of rabbits (also introduced) rose sharply, damaging the vegetation. Use ideas about population control to explain this, and suggest what should have been done.", ans: "<ul><li>The predator had been limiting the rabbit population (a density-dependent factor)</li><li>With predation removed, more rabbits survived and bred until food became limiting, by which time the vegetation was overgrazed</li><li>Both introduced species should be controlled together / effects on the whole food web considered first</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>An individual-based model: every rabbit and fox is followed separately, one day at a time, on a meadow of 10 m grass patches. The meadow wraps round at its edges.</p>
<ul><li><b>Grass</b> regrows logistically in each patch (fastest when half-grown) with a trickle of reseeding.</li>
<li><b>Rabbits</b> hop 6 to 16 m a day, heading for a greener neighbouring patch if theirs is poor. They eat up to 4% of a patch a day. Living costs energy; a rabbit with none left starves. A well-fed adult (over 100 days old) has a 1.2% chance a day of producing a kit. They live at most about 4 years.</li>
<li><b>Foxes</b> that are hungry look for rabbits within 40 m and catch the nearest 35% of the time. Where rabbits are scarce they are wary and much harder to find. One rabbit is about 12 days' energy; a fox with none left starves. A well-fed adult fox (over 300 days old) raises about three cubs a year, but only where there are few other foxes nearby (foxes are territorial). They live at most about 9 years.</li>
<li><b>Refuges</b> are patches where a fox cannot make a kill.</li>
<li>All the settings can be changed while it runs.</li></ul>
<h3>Simplifications</h3>
<ul><li>No seasons, weather, sexes, territories or family groups. Real rabbits and foxes breed in spring; real foxes are territorial, which limits their density.</li>
<li>Foxes eat only rabbits. Real foxes switch to voles, worms, beetles and fruit when rabbits are scarce, which is one reason clear fox–rabbit cycles are not seen in Britain. Clean cycles are found where a specialist predator has one main prey, as with lynx and snowshoe hare.</li>
<li>Rates are chosen to give clear cycles on a meadow this small, in a time you can watch. A real fox needs a territory of a square kilometre or more.</li>
<li>Nothing arrives from outside: once a species has died out in the meadow it cannot return unless you add some.</li>
<li>Batch runs use smaller meadows than the largest one on screen.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/predator-prey.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The animals and the grass");
ctl.grow = K.slider(g, { label: "Grass regrowth", min: 0.01, max: 0.12, step: 0.005, value: P.grow, fmt: v => (v * 100).toFixed(1) + "% a day", on: v => P.grow = v });
ctl.breed = K.slider(g, { label: "Rabbit breeding", min: 0.004, max: 0.04, step: 0.002, value: P.breed, fmt: v => (v * 100).toFixed(1) + "% chance a day", on: v => P.breed = v });
ctl.hunt = K.slider(g, { label: "Fox hunting success", min: 0.05, max: 0.9, step: 0.05, value: P.hunt, fmt: v => Math.round(v * 100) + "%", on: v => P.hunt = v });
ctl.need = K.slider(g, { label: "Energy a fox needs", min: 0.5, max: 2, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => P.need = v });
ctl.refuge = K.slider(g, { label: "Refuges for rabbits", min: 0, max: 50, step: 5, value: 0, unit: "% of meadow", on: v => { P.refuge = v; meadow.setRefuges(); bgT = -1; } });
ctl.cull = K.slider(g, { label: "Foxes culled each year", min: 0, max: 80, step: 5, value: 0, unit: "%", on: v => P.cull = v });
g = ui.group("Events");
let r1 = K.row(g); K.btn(r1, "Rabbit disease (kills 80%)", () => { for (const a of meadow.rab) if (Math.random() < 0.8) a.dead = true; meadow.rab = meadow.rab.filter(a => !a.dead); }); K.btn(r1, "Cull half the foxes", () => { meadow.fox = meadow.fox.filter(() => Math.random() < 0.5); });
r1 = K.row(g); K.btn(r1, "Add 10 foxes", () => meadow.addFoxes(10)); K.btn(r1, "Add 100 rabbits", () => meadow.addRabbits(100));
g = ui.group("The meadow");
ctl.size = K.seg(g, { value: "large", options: [["small", "small (6 ha)"], ["medium", "medium (26 ha)"], ["large", "large (82 ha)"]], on: v => { size = v; restart(); } });
r1 = K.row(g); K.btn(r1, "↺ Start again", () => restart(), "primary");
ctl.rate = K.slider(g, { label: "Speed", min: 5, max: 120, step: 5, value: rate, fmt: v => v + " days a second", on: v => rate = v });
const read = K.readout(g, [["yr", "time"], ["r", "rabbits"], ["f", "foxes"], ["g", "grass cover"], ["ratio", "rabbits per fox"], ["eat", "rabbits eaten this year"]]);
function set(o) {
  Object.assign(P, DEF, { refuge: o.refuge || 0 }); ctl.grow.set(P.grow); ctl.breed.set(P.breed); ctl.hunt.set(P.hunt); ctl.need.set(1); ctl.refuge.set(P.refuge); ctl.cull.set(0); size = o.size || "large"; ctl.size.set(size); rate = 40; ctl.rate.set(40); restart(o.rabbits, o.foxes); bgT = -1;
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
let gimg = null, gctx = null, gdata = null, bgT = -1, yearEat = 0, lastEat = 0;
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, m = meadow, sx = w / m.W, sy = h / m.H;
  if (!gimg || gimg.width !== m.gw) { gimg = document.createElement("canvas"); gimg.width = m.gw; gimg.height = m.gh; gctx = gimg.getContext("2d"); gdata = gctx.createImageData(m.gw, m.gh); }
  const d = gdata.data; for (let i = 0, j = 0; i < m.grass.length; i++, j += 4) { const gq = m.grass[i], s = m.safe[i]; d[j] = s ? 34 : 122 - 84 * gq; d[j + 1] = s ? 58 : 96 + 52 * gq; d[j + 2] = s ? 30 : 58 - 22 * gq; d[j + 3] = 255; }   // bare earth brown to lush green; refuges dark
  gctx.putImageData(gdata, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(gimg, 0, 0, w, h);
  const rs = Math.max(1.3, Math.min(3, 2.6 * sx / 0.7)), big = m.W < 500;
  c.fillStyle = "rgba(20,30,15,.35)"; c.beginPath(); for (const a of m.rab) { c.rect(a.x * sx - rs / 2 + 1, a.y * sy - rs / 2 + 1.2, rs, rs); } c.fill();
  c.fillStyle = "#f3ead8"; c.beginPath(); for (const a of m.rab) { const x = a.x * sx, y = a.y * sy; c.moveTo(x + rs * .75, y); c.arc(x, y, rs * (a.age < 100 ? 0.5 : 0.75), 0, 6.3); if (big) { c.rect(x - rs * .5, y - rs * 1.5, rs * .3, rs); c.rect(x + rs * .2, y - rs * 1.5, rs * .3, rs); } } c.fill();
  for (const f of m.fox) { const x = f.x * sx, y = f.y * sy, L = Math.max(4, rs * 2.2), cs = Math.cos(f.hx), sn = Math.sin(f.hx); c.strokeStyle = "#d1541c"; c.lineWidth = Math.max(2.4, rs * 1.3); c.lineCap = "round"; c.beginPath(); c.moveTo(x - cs * L, y - sn * L); c.lineTo(x + cs * L * .6, y + sn * L * .6); c.stroke(); c.strokeStyle = "#fff3e2"; c.lineWidth = Math.max(1.6, rs * .8); c.beginPath(); c.moveTo(x - cs * L, y - sn * L); c.lineTo(x - cs * L * .6, y - sn * L * .6); c.stroke(); c.fillStyle = "#2a160c"; c.beginPath(); c.arc(x + cs * L * .7, y + sn * L * .7, Math.max(1.2, rs * .45), 0, 6.3); c.fill(); }
  c.strokeStyle = "rgba(255,70,50,.8)"; c.lineWidth = 1.5; for (let i = m.kills.length - 1; i >= 0; i--) { const q = m.kills[i]; c.globalAlpha = q[2]; c.beginPath(); c.arc(q[0] * sx, q[1] * sy, 4 + (1 - q[2]) * 9, 0, 6.3); c.stroke(); q[2] -= 0.06; if (q[2] <= 0) m.kills.splice(i, 1); } c.globalAlpha = 1;
  c.fillStyle = "rgba(8,14,10,.6)"; c.fillRect(8, h - 26, 300, 20); c.fillStyle = "#eef2e8"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(`${m.W} m × ${m.H} m · cream: rabbits · orange: foxes` + (P.refuge ? " · dark: refuges" : ""), 14, h - 12);
}
const chT = K.chart(ui.dock, { title: "Populations", xLabel: "time (years)", yLabel: "animals", yMin: 0 });
const chP = K.chart(ui.dock, { title: "Foxes against rabbits", xLabel: "rabbits", yLabel: "foxes", yMin: 0, xMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  acc += rate * Math.max(dt, 1 / 120); let n = 0;
  while (acc >= 1 && n++ < 6) { acc--; meadow.step(); if (meadow.day % 365 === 0) { yearEat = meadow.eaten - lastEat; lastEat = meadow.eaten; }
    if (meadow.day % 10 === 0) { const t = meadow.day / 365; log.push([t, meadow.rab.length, meadow.fox.length, meadow.cover()]); phase.push([meadow.rab.length, meadow.fox.length]); if (log.length > 1500) log.splice(0, 2); if (phase.length > 420) phase.shift(); } }
  if (acc > 6) acc = 0;
}, () => {
  draw(); if (frame++ % 6) return;
  const m = meadow, t = m.day / 365, t0 = log.length ? log[0][0] : 0, kR = Math.max(1, ...log.map(q => q[1])) / 100;
  chT.draw([{ pts: log.map(q => [q[0], q[1]]), color: "#f3ead8", label: "rabbits", width: 2.2 }, { pts: log.map(q => [q[0], q[2] * 10]), color: "#ff7a3c", label: "foxes × 10", width: 2.2 }, { pts: log.map(q => [q[0], q[3] * kR]), color: "#6fcf7a", label: "grass cover", width: 1.2 }], { xMin: t0, xMax: Math.max(t0 + 8, t) });
  chP.draw([{ pts: phase, color: K.cssVar("--s0"), width: 1.5 }, { pts: phase.length ? [phase[phase.length - 1]] : [], type: "dots", color: "#fff", r: 4.5 }], {});
  read.set("yr", t.toFixed(1) + " years"); read.set("r", m.rab.length); read.set("f", m.fox.length); read.set("g", m.cover().toFixed(0) + "%"); read.set("ratio", m.fox.length ? (m.rab.length / m.fox.length).toFixed(0) : "–"); read.set("eat", yearEat || "–");
  ui.hud(`<b style="font-size:15px">Year ${Math.floor(t) + 1}</b><br><span style="color:#f3ead8">${m.rab.length} rabbits</span> · <span style="color:#ff7a3c">${m.fox.length} foxes</span><br>grass cover ${m.cover().toFixed(0)}%` + (!m.fox.length && t > 0.2 ? `<br><span style="color:#ffb060">the foxes have died out</span>` : "") + (!m.rab.length ? `<br><span style="color:#ffb060">the rabbits have died out</span>` : ""));
});
restart();
ui.tip("Every animal is followed · rabbits eat grass, foxes eat rabbits · nothing else is programmed", 8000);
