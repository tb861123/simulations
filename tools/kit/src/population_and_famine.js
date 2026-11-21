/* =====================================================================
   POPULATION AND FAMINE
   Two linked models for historians.

   a. MALTHUS'S WORLD. Thomas Malthus (Essay on the Principle of
      Population, 1798) argued that population, left unchecked, grows
      geometrically while food grows only slowly, so living standards are
      pushed back to subsistence. In a farming economy with a fixed amount
      of land, each extra worker adds less food than the last
      (DIMINISHING RETURNS):
            food per head  y = A × (N₀ ÷ N)^α × harvest
      Births rise and deaths fall when food per head is high, so the
      population grows until y is pushed back down to the level where
      births = deaths (the "Malthusian equilibrium"). Better farming
      (bigger A) gives MORE PEOPLE, not richer people: the Malthusian trap.
      Malthus's two checks: POSITIVE checks raise deaths (famine, disease);
      PREVENTIVE checks lower births (later marriage). A strong preventive
      check holds people further above famine.
      The Industrial Revolution let technology grow faster than population,
      and fertility then fell (the demographic transition): the escape.

   b. IRELAND 1781–1901. The potato fed a fast-growing rural population on
      tiny plots. Blight (Phytophthora infestans) from 1845 destroyed most
      of the crop for several years. About a million people died of
      hunger and the diseases that follow it, and over a million emigrated
      (1845–51). The model asks how much the death toll depended on the
      blight itself and how much on choices: relief, food exports and
      emigration. After the Famine the population kept falling for
      decades (later marriage, consolidated farms, chain emigration).
   Historical census figures (whole island, millions) are drawn for
   comparison. The model is calibrated to them, so agreement before 1845
   is built in: the interesting question is what changes when you change
   the choices.
   ===================================================================== */
const clamp = K.clamp, ln = Math.log;
// ---------------- a. Malthus's world (one step = one year) ----------------
const ALPHA = 0.5, N0 = 4;    // α: how fast returns diminish; N₀: the population (millions) when A = 1 gives food per head 1
const birthRate = (y, p, modern) => 0.035 - 0.012 * p + 0.010 * ln(y) - (modern ? 0.016 * Math.max(0, ln(y) - 0.35) : 0);   // p = preventive check, 0 to 1
const deathRate = (y, famineAt = 0.7) => 0.030 - 0.020 * ln(y) + 0.25 * Math.max(0, famineAt - y);                         // positive check: famine below y = 0.7
// the equilibrium food per head, where births = deaths (with no famine): solve 0.035 − 0.012p + 0.010 ln y = 0.030 − 0.020 ln y + n
const yStar = (p, n = 0) => Math.exp((n + 0.030 - 0.035 + 0.012 * p) / 0.030);
// with technology growing at g a year, food per head stays steady only if population grows at n = g ÷ α
const ySteady = (g, p) => yStar(p, g / ALPHA);
class Malthus {
  constructor(o, r) {
    this.o = Object.assign({ g: 0.001, p: 0.3, sigma: 0.1, modern: false, irYear: 1760, start: 1300 }, o); this.r = r;
    this.year = this.o.start; this.A = 1; this.N = N0 * Math.pow(1 / yStar(this.o.p), 1 / ALPHA); this.y = yStar(this.o.p); this.h = 1;
    this.famines = 0; this.log = []; this.plagueYears = [];
  }
  step() {
    const o = this.o, ir = o.modern && this.year >= o.irYear;
    this.A *= 1 + (ir ? 0.015 : o.g);                                    // technology (better crops, tools, rotation): 1.5% a year after the Industrial Revolution
    this.h = Math.exp(o.sigma * this.r.gauss() - o.sigma * o.sigma / 2);  // the harvest: good and bad years at random (mean 1)
    this.y = this.A * Math.pow(N0 / this.N, ALPHA) * this.h;
    if (this.y < 0.7) this.famines++;
    const b = birthRate(this.y, o.p, ir), d = deathRate(this.y);
    this.N *= 1 + b - d; this.b = b; this.d = d; this.year++;
    this.log.push([this.year, this.N, this.y]); if (this.log.length > 800) this.log.shift();
  }
  plague(k = 0.4) { this.N *= 1 - k; this.plagueYears.push(this.year); }  // the Black Death killed perhaps 40–50% of England in 1348–50
}

// ---------------- b. Ireland 1781–1901 ----------------
// Effective potato yield each year as a fraction of normal (less was planted after 1846: seed potatoes were eaten)
const BLIGHT = { 1845: 0.6, 1846: 0.12, 1847: 0.3, 1848: 0.45, 1849: 0.6, 1850: 0.8 };
// Share of the food gap made up by relief and imports, as it happened: Peel's maize (1845–46), public works (1846–47, wages too low and too slow),
// soup kitchens (summer 1847, up to 3 million fed a day), then the Poor Law Extension Act put the cost on local rates (1847 on)
const RELIEF = { 1845: 0.6, 1846: 0.3, 1847: 0.55, 1848: 0.35, 1849: 0.4, 1850: 0.5, 1851: 0.6 };
const CENSUS = [[1821, 6.80], [1831, 7.77], [1841, 8.18], [1851, 6.55], [1861, 5.80], [1871, 5.41], [1881, 5.17], [1891, 4.70], [1901, 4.46]];
const IRL_DEF = { blight: 1, relief: 1, exports: true, emig: 1, post: true, noise: 0, reliefJitter: 0 };
class Ireland {
  constructor(o, r) { this.o = Object.assign({}, IRL_DEF, o); this.r = r; this.year = 1781; this.N = 4.05; this.P = 2.6; this.dead = 0; this.gone = 0; this.log = []; this.yearly = []; this.food = null; }
  step() {
    const o = this.o, yr = this.year, fam = yr >= 1845 && yr <= 1851, after = yr > 1851;
    const G = 1.6, X = 0.8;   // food kept from grain, dairy and meat, and the food exported (both in millions of people fed for a year; rough)
    // before 1845 the potato ground grows with the people (subdivision of plots, reclaimed bog and hillside): dependence on one crop rises
    if (yr < 1845) this.P = Math.max(this.P, 1.04 * this.N - G); else if (after) this.P = Math.max(0, Math.min(this.P, 1.04 * this.N - G - 0.6));
    let hp = 1; if (BLIGHT[yr] != null) hp = 1 - (1 - BLIGHT[yr]) * o.blight;
    if (o.noise && this.r) hp = clamp(hp * Math.exp(o.noise * this.r.gauss()), 0, 1.3);
    const potato = this.P * hp, kept = G + (after ? 0.6 : 0), stopped = !o.exports && fam ? X : 0;
    let y = (potato + kept + stopped) / this.N, relief = 0;
    if (fam && y < 1) { const share = clamp((RELIEF[yr] || 0) * o.relief * (1 + (o.reliefJitter && this.r ? o.reliefJitter * this.r.gauss() : 0)), 0, 1); relief = (1 - y) * share; y += relief; }
    y = Math.min(y, 1.1);
    // births: high and early marriage before the Famine (slowly falling as land ran out); later marriage afterwards
    const b = after && o.post ? 0.028 : 0.0365 - 0.00004 * (yr - 1781);
    // deaths: a normal level, plus hunger and the diseases that follow it (typhus, relapsing fever, dysentery) when food falls short
    const d0 = after ? 0.0185 : 0.021, d = d0 + 0.2 * Math.pow(Math.max(0, 0.97 - y), 1.2);
    // emigration: a steady flow after 1815, plus famine flight; after the Famine, chain emigration (letters and passage money from America)
    let e = (yr < 1815 ? 0.0012 : 0.0045) * o.emig + 0.12 * o.emig * Math.max(0, 0.97 - y);
    if (after && o.post) e = Math.max(e, (yr < 1880 ? 0.0185 : 0.016) * o.emig);
    const deaths = (d - d0) * this.N, em = e * this.N;
    if (fam) { this.dead += deaths; this.gone += em; }
    this.food = { yr, potato, kept, stopped, exported: fam && o.exports ? X : 0, relief: relief * this.N, need: this.N, y };
    this.yearly.push([yr, deaths * 1000, em * 1000]);
    this.N += (b - d - e) * this.N; this.year++; this.log.push([this.year, this.N]);
  }
  run(to = 1901) { while (this.year < to) this.step(); return this; }
}
const famineToll = (o, r) => new Ireland(o, r).run(1852);   // excess deaths and emigrants 1845–51 (millions)

// ---------------- The page ----------------
const P = { view: "malthus", g: 0.001, p: 0.3, sigma: 0.1, modern: false, speed: 12, autoPlague: false, irl: Object.assign({}, IRL_DEF), irlSpeed: 4 };
let rnd = K.rng(Date.now() % 99991 + 7), M, IR, acc = 0;
const ui = K.app({
  title: "Population and Famine", subject: "History",
  blurb: "Malthus's trap, the Black Death, and the Great Irish Famine: what was nature and what was choice?",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "GCSE History: thematic studies of population, health and living standards; causation (short- and long-term causes) and consequence. The model shows Malthus's idea of positive and preventive checks and the Black Death.",
      adv: "OCR A level History A (H505) Y316 Britain and Ireland 1791–1921: the Great Famine, government relief (Peel, Russell, the soup kitchens, the Poor Law), emigration and the land question. AO1 causation, consequence and significance; AO3 interpretations (the 'nationalist' and 'revisionist' views of British responsibility). Malthusian theory is context."
    }
  },
  missions: [
    { title: "The Malthusian trap", q: "Technology improves slowly (0.1% a year) for six centuries. Watch the population and food per head. Does better farming make people better off?", hint: "Population grows to match the extra food, so food per head stays near the equilibrium (about 0.95 on this scale). Six centuries of progress gave England more people, not richer people: the Malthusian trap.", setup() { set({ view: "malthus" }); } },
    { title: "The Black Death", q: "Press 'Plague' to kill 40% of the people. What happens to food per head (and so wages) in the years after? How long do the gains last?", hint: "With fewer people on the same land, each worker produces more, so food per head and real wages jump (this happened after 1348: the Statute of Labourers tried to hold wages down). As the population recovers over about a century, wages fall back. Historians link the higher wages to the end of serfdom and the Peasants' Revolt (1381).", setup() { set({ view: "malthus" }); M.plague(); ui.tip("Plague! 40% of the people have died."); } },
    { title: "Positive or preventive check?", q: "Set the preventive check to zero (everyone marries young), then to its maximum (late marriage, as in north-west Europe). Count the famine years. Which society lives better?", hint: "With no preventive check, births only balance deaths when people are close to starving, so bad harvests often cause famine (the positive check). Late marriage holds births down, so the equilibrium is well above famine level. Historians (Wrigley and Schofield) argue this 'European marriage pattern' kept England out of the worst famines after 1600.", setup() { set({ view: "malthus", p: 0 }); } },
    { title: "Escape from the trap", q: "Turn on the Industrial Revolution (1760). Does population growth swallow the gains this time? What has to happen to the birth rate?", hint: "Technology now grows at 1.5% a year, faster than population can follow, so food per head rises. As people get richer, fertility falls (the demographic transition), so the gains are kept. Malthus wrote in 1798, just as this escape began.", setup() { set({ view: "malthus", modern: true, speed: 20 }); } },
    { title: "Ireland: the population before 1845", q: "Run Ireland from 1781. How fast did the population grow, and what made that possible? Compare the model with the census dots.", hint: "From about 4 million to over 8 million in 60 years. The potato gave more food per acre than any grain, so plots could be split between sons and people married young. By 1841 about a third of the people depended almost entirely on the potato: a population exposed to the failure of one crop.", setup() { set({ view: "ireland" }); } },
    { title: "Ireland: the blight", q: "The run starts in 1840. Watch 1845–51. Read the food bar each year: how much of the gap did relief fill? Note the deaths and emigration totals.", hint: "The worst years were 1846–47 ('Black '47'). In this model about 1.1 million die and 1.1 million emigrate, close to historians' estimates (about 1 million deaths; over 1 million emigrants). Most deaths were from disease spread by hunger and crowded workhouses, not starvation alone.", setup() { set({ view: "ireland", irlSpeed: 2 }); IR.run(1840); } },
    { title: "Was it nature or choice?", lvl: "adv", q: "Change one choice at a time: relief generosity, stopping food exports, emigration. Which makes the biggest difference to the death toll? What does this suggest about the debate over British responsibility?", hint: "Halving the blight cuts deaths sharply, but so does doubling relief or keeping exported food at home. The blight was the trigger; how many died depended a great deal on policy. The 'revisionist' view stresses the scale of the natural disaster and the limits of 1840s government; 'nationalist' and post-revisionist historians (e.g. Kinealy) stress choices: laissez-faire, the end of the soup kitchens in 1847, the Gregory clause. A model cannot settle the moral question, but it shows the size of the choices.", setup() { set({ view: "ireland", irlSpeed: 6 }); } },
    { title: "Why did the population keep falling?", lvl: "adv", q: "Turn off 'post-Famine changes' and run to 1901. What would have happened without later marriage, consolidated farms and chain emigration?", hint: "The model recovers towards 7–8 million. The real census fell to 4.5 million by 1901: the long-term consequences (emigration as a way of life, the stem family) mattered more for the population than the Famine deaths themselves. A good example of distinguishing short- and long-term consequences.", setup() { set({ view: "ireland", irl: { post: false }, irlSpeed: 10 }); } }
  ],
  batch: [
    { title: "Does better technology make people richer?", question: "Pre-industrial economy: how does food per head after 500 years depend on how fast farming improves?", how: "Technology growth swept from 0 to 0.5% a year; random harvests (SD 10%), preventive check 0.3. Food per head averaged over years 400–500. Theory: the steady state where population grows at g ÷ α.", xLabel: "technology growth (% a year)", yLabel: "food per head (index)", xs: [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5], reps: 5, theory: x => ySteady(x / 100, 0.3), theoryLabel: "steady state", run: (x, r) => { const m = new Malthus({ g: x / 100, p: 0.3, sigma: 0.1 }, r); let s = 0; for (let i = 0; i < 500; i++) { m.step(); if (i >= 400) s += m.y; } return s / 100; }, note: "Faster technology only slightly raises food per head, because population growth absorbs most of it: at 0.1% a year (typical before 1700) people are barely better off. Points sit a little below the line because famine years kill extra people." },
    { title: "After the Black Death", question: "How many years does the population take to recover after 40% die?", how: "Malthus's world settled for 200 years, then plague kills 40%. Measure the years until the population is back to 95% of its old level. Random harvests (SD 10%). Theory: the same run with average harvests every year.", reps: 200, bins: 20, yLabel: "years to recover", theory: (() => { const m = new Malthus({ sigma: 0 }, K.rng(1)); for (let i = 0; i < 200; i++) m.step(); const n0 = m.N; m.plague(); let t = 0; while (m.N < 0.95 * n0 && t < 1000) { m.step(); t++; } return t; })(), theoryLabel: "average harvests", run: (x, r) => { const m = new Malthus({ sigma: 0.1 }, r); for (let i = 0; i < 200; i++) m.step(); const n0 = m.N; m.plague(); let t = 0; while (m.N < 0.95 * n0 && t < 1000) { m.step(); t++; } return t; }, note: "Recovery takes about 70 years in the model, with wide variation from the luck of the harvests. England's population did not regain its 1300 level until the 1500s or later: repeated plague outbreaks kept it down, which this single-plague model leaves out." },
    { title: "Late marriage and famine", question: "How often is there famine, depending on the preventive check?", how: "Preventive check from 0 (universal early marriage) to 1 (late marriage, many never marry). 1,000 years with random harvests (SD 10%); count famine years (food per head below 0.7) per century.", xLabel: "preventive check", yLabel: "famine years per century", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 5, yMin: 0, run: (x, r) => { const m = new Malthus({ g: 0, p: x, sigma: 0.1 }, r); for (let i = 0; i < 1000; i++) m.step(); return m.famines / 10; }, note: "Without a preventive check, the population lives close to the famine line and bad harvests often push it over. A stronger preventive check lifts the equilibrium, so famines become rare: Malthus's own hope (he called it 'moral restraint')." },
    { title: "Relief and the death toll", lvl: "adv", question: "How do excess deaths in 1845–51 depend on the generosity of relief?", how: "Ireland model; relief from none to twice the historical share of the food gap (capped at the whole gap); random potato yields (SD 10%) around the blight figures. Theory: the same run with exactly the blight figures.", xLabel: "relief (× historical)", yLabel: "excess deaths 1845–51 (thousands)", xs: [0, 0.5, 1, 1.5, 2], reps: 6, yMin: 0, theory: x => 1000 * famineToll({ relief: x }).dead, theoryLabel: "no random variation", run: (x, r) => 1000 * famineToll({ relief: x, noise: 0.1 }, r).dead, note: "Relief matters a great deal in the model: doubling it more than halves the deaths. In reality, relief was limited by money, administration, transport and ideology (laissez-faire and providentialism), which is exactly where historians disagree." },
    { title: "How certain is 'about a million'?", lvl: "adv", question: "If we are unsure of the blight's severity and the relief given, how wide is the range of excess deaths?", how: "Each run: blight severity and relief each vary at random by about 10–15%; random potato yields. Compare with the usual historians' estimate of about 1 million (range roughly 0.8–1.1 million).", reps: 200, bins: 22, yLabel: "excess deaths 1845–51 (thousands)", theory: 1000, theoryLabel: "historians' estimate", run: (x, r) => 1000 * famineToll({ blight: clamp(1 + 0.1 * r.gauss(), 0.6, 1.3), reliefJitter: 0.15, noise: 0.08 }, r).dead, note: "Small uncertainties in the inputs give a wide range of outputs. Historians face the same problem: there was no death registration in Ireland until 1864, so excess deaths are estimated from the 1841 and 1851 censuses and assumptions about births and emigration." },
    { title: "Exports or no exports?", lvl: "adv", question: "How much would keeping exported food in Ireland have reduced deaths?", how: "0 = food exports continue (as happened), 1 = exports stopped in 1845–51. Random potato yields (SD 10%).", xLabel: "exports stopped (0 = no, 1 = yes)", yLabel: "excess deaths 1845–51 (thousands)", xs: [0, 1], reps: 30, yMin: 0, run: (x, r) => 1000 * famineToll({ exports: !x, noise: 0.1 }, r).dead, note: "In the model stopping exports saves about a quarter of the lives. But the size of the effect rests on a rough guess at how much food was exported; historians (e.g. Ó Gráda, Kinealy) argue about this figure, and the exported food was owned by farmers who needed the money for rent." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Causation", text: "Long-term causes make an event possible (Ireland's dependence on the potato, subdivided plots, population growth); the trigger sets it off (blight, 1845); short-term causes and choices shape how bad it is (relief, exports, evictions)." },
      { lvl: "std", tag: "Malthus", text: "Malthus (1798): population grows faster than food unless checked. Positive checks raise the death rate (famine, disease, war); preventive checks lower the birth rate (later marriage)." },
      { lvl: "std", tag: "Consequence", text: "The Black Death (1348–50) killed perhaps 40–50% of England's people. Labour became scarce, so wages rose despite the Statute of Labourers (1351): one cause of the decline of serfdom and of the Peasants' Revolt (1381)." },
      { lvl: "std", tag: "Using models", text: "A model shows what follows from its assumptions. It can test 'what if' questions (counterfactuals), but its answer is only as good as its figures, many of which are estimates." },
      { lvl: "adv", tag: "Y316", text: "Peel bought £100,000 of American maize (1845) and set up public works; Russell's Whig government (1846) relied on public works and the market, then soup kitchens (Temporary Relief Act 1847, up to 3 million meals a day), then the Poor Law Extension Act (1847) put the cost on Irish rates. The Gregory clause denied relief to anyone holding more than a quarter acre." },
      { lvl: "adv", tag: "Y316", text: "Consequences: about 1 million excess deaths and over 1 million emigrants (1845–51); the population fell from 8.2 million (1841) to 6.6 million (1851) and 4.5 million (1901). Smallholdings were cleared, the Irish language declined, and resentment fed Young Ireland (1848), the Fenians and the land war." },
      { lvl: "adv", tag: "AO3 interpretations", text: "Nationalist interpretation (e.g. John Mitchel): Britain let Ireland starve. Revisionist (1950s–80s): a natural disaster beyond the capacity of the age. Post-revisionist (Kinealy, Ó Gráda, from the 1990s): ideology (laissez-faire, providentialism, Trevelyan) and policy choices made it far worse." },
      { lvl: "beyond", tag: "Beyond the spec", text: "In the model, food per head y = A(N₀/N)^α × harvest. Births = deaths sets the equilibrium; technology growth g gives population growth g ÷ α in the long run, with food per head barely changing." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain one long-term cause and one short-term cause of the Great Irish Famine.", ans: "<ul><li>long-term: dependence on the potato (about a third of people lived almost entirely on it), made possible by subdivision and high population growth</li><li>explained: the failure of one crop left millions with no other food</li><li>short-term: potato blight destroyed most of the crop in 1846</li><li>explained: there was no reserve, and relief was too small or too slow (public works paid too little)</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why wages rose in England after the Black Death.", ans: "<ul><li>about 40% or more of the population died</li><li>so labour became scarce while land was unchanged</li><li>workers could demand higher pay and move to other employers (despite the Statute of Labourers)</li></ul>" },
      { lvl: "std", marks: 3, q: () => `In the simulation, food per head is ${M ? M.y.toFixed(2) : "–"} and the population is ${M ? M.N.toFixed(1) : "–"} million. Use Malthus's ideas to predict what will happen to the population, and explain why.`, ans: "<ul><li>if food per head is above the equilibrium, births exceed deaths so the population grows (or falls if below)</li><li>more people on the same land means diminishing returns: food per head falls</li><li>until births = deaths again (the Malthusian equilibrium)</li></ul>" },
      { lvl: "adv", marks: 12, q: "'The Great Famine was caused more by British government policy than by the potato blight.' How far do you agree? (Use the model's results as one piece of evidence.)", ans: "<ul><li>case for blight: unprecedented, repeated failures 1845–49; Phytophthora not understood; no state of the 1840s had managed relief on this scale</li><li>case for policy: Peel's maize and the soup kitchens worked while they lasted; public works paid too little; soup kitchens closed in 1847; Poor Law put cost on bankrupt local rates; Gregory clause; exports continued; Trevelyan's providentialism</li><li>model: relief and exports change the death toll greatly, so policy mattered to the scale, though the blight was the trigger</li><li>limits of the model: export and relief figures are rough estimates; deaths mostly from disease</li><li>reach a supported judgement (e.g. blight necessary, policy decisive for the scale)</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain why historians' estimates of famine deaths vary.", ans: "<ul><li>no civil registration of deaths in Ireland until 1864</li><li>estimates come from the 1841 and 1851 censuses (themselves imperfect)</li><li>need assumptions about the births that would have happened and about emigration</li><li>so the range is roughly 0.8 to 1.1 million or more</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p><b>Malthus's world.</b> One farming economy, a year at a time. Food per head y = A × (N₀ ÷ N)<sup>0.5</sup> × harvest, where A is technology and N the population. Harvests vary at random. Birth rate = 0.035 − 0.012 × (preventive check) + 0.010 ln y; death rate = 0.030 − 0.020 ln y, plus extra famine deaths whenever y falls below 0.7. After the Industrial Revolution (if on), technology grows at 1.5% a year and richer people have fewer children.</p>
<p><b>Ireland 1781–1901.</b> Food each year (in millions of people fed) = potatoes + other food kept + (exports, if stopped) + relief. Before 1845 potato ground grows with the people. Blight yields are set for 1845–50; relief makes up the historical share of the shortfall each year (Peel's maize, public works, soup kitchens, Poor Law). Deaths and emigration rise when food per head falls below 0.97. After 1851, if 'post-Famine changes' are on, births fall and emigration stays high.</p>
<h3>Assumptions and simplifications</h3>
<ul><li>Everyone is alike: no classes, regions or landlords. In reality the west (Connacht, Munster) suffered far more than Ulster and Leinster.</li>
<li>Food is shared equally. Real famines are about who can <i>buy</i> food (Amartya Sen's 'entitlements'), not only how much exists.</li>
<li>Deaths depend only on food. In reality typhus, relapsing fever and dysentery killed most victims, spread by vagrancy and crowded workhouses; evictions (perhaps 250,000 people) are not modelled separately.</li>
<li>The relief shares, food kept and food exported are rough estimates chosen so the totals match historians' figures (about 1 million deaths, over 1 million emigrants). Change them and you change the answer: that is the point.</li>
<li>The pre-Famine population is fitted to the census, so agreement with the dots up to 1841 is not evidence that the model is right.</li>
<li>Malthus's world is not one real country: the numbers are chosen to show the mechanism, loosely like medieval England.</li>
<li>A model cannot judge intentions or morality: it only shows how much outcomes depended on each factor.</li></ul>
<h3>Historical figures used</h3>
<p>Census populations of Ireland (millions): 1821 6.80, 1831 7.77, 1841 8.18, 1851 6.55, 1861 5.80, 1871 5.41, 1881 5.17, 1891 4.70, 1901 4.46.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, groups = {};
let g = ui.group("What to show");
ctl.view = K.seg(g, { value: "malthus", options: [["malthus", "🌾 Malthus's world"], ["ireland", "🥔 Ireland 1781–1901"]], on: v => { P.view = v; showGroups(); } });
g = groups.malthus = ui.group("Malthus's world");
ctl.g = K.slider(g, { label: "Technology improves by", min: 0, max: 0.5, step: 0.01, value: 0.1, fmt: v => v.toFixed(2) + "% a year", tip: "Before 1700, about 0.05–0.1% a year", on: v => { P.g = v / 100; M.o.g = P.g; } });
ctl.p = K.slider(g, { label: "Preventive check (late marriage)", min: 0, max: 1, step: 0.05, value: P.p, fmt: v => v === 0 ? "none" : v.toFixed(2), on: v => { P.p = v; M.o.p = v; } });
ctl.sigma = K.slider(g, { label: "Harvest variability", min: 0, max: 0.3, step: 0.01, value: P.sigma, fmt: v => Math.round(v * 100) + "%", on: v => { P.sigma = v; M.o.sigma = v; } });
ctl.modern = K.toggle(g, { label: "Industrial Revolution from 1760", value: false, on: v => { P.modern = v; M.o.modern = v; } });
ctl.auto = K.toggle(g, { label: "Black Death in 1348", value: false, on: v => P.autoPlague = v });
K.btn(K.row(g), "☠ Plague: 40% die", () => { M.plague(); ui.tip("Plague! 40% of the people have died."); });
ctl.speed = K.slider(g, { label: "Speed", min: 2, max: 40, step: 1, value: P.speed, fmt: v => v + " years a second", on: v => P.speed = v });
g = groups.ireland = ui.group("Ireland: the choices");
ctl.blight = K.slider(g, { label: "Blight severity", min: 0, max: 1.2, step: 0.05, value: 1, fmt: v => v === 1 ? "as it happened" : Math.round(v * 100) + "% of the real loss", on: v => { P.irl.blight = v; restartIrl(); } });
ctl.relief = K.slider(g, { label: "Relief and imports", min: 0, max: 2, step: 0.05, value: 1, fmt: v => v === 1 ? "as it happened" : v === 0 ? "none" : v.toFixed(2) + " × historical", on: v => { P.irl.relief = v; restartIrl(); } });
ctl.exports = K.toggle(g, { label: "Food exports continue (as happened)", value: true, on: v => { P.irl.exports = v; restartIrl(); } });
ctl.emig = K.slider(g, { label: "Emigration", min: 0.2, max: 2, step: 0.05, value: 1, fmt: v => v === 1 ? "as it happened" : v.toFixed(2) + " × historical", on: v => { P.irl.emig = v; restartIrl(); } });
ctl.post = K.toggle(g, { label: "Post-Famine changes (later marriage, chain emigration)", value: true, on: v => { P.irl.post = v; restartIrl(); } });
ctl.irlSpeed = K.slider(g, { label: "Speed", min: 1, max: 15, step: 1, value: P.irlSpeed, fmt: v => v + " years a second", tip: "Slows to a year every 2 seconds during 1845–51 at the lowest speeds", on: v => P.irlSpeed = v });
K.btn(K.row(g), "↺ Start again from 1781", () => restartIrl(), "primary");
g = ui.group("Readings");
const read = K.readout(g, [["yr", "year"], ["pop", "population"], ["y", "food per head"], ["bd", "births / deaths (per 1,000)"], ["a", "–"], ["b", "–"]]);
function showGroups() { groups.malthus.style.display = P.view === "malthus" ? "" : "none"; groups.ireland.style.display = P.view === "ireland" ? "" : "none"; chA.opts.title = P.view === "malthus" ? "Population (millions)" : "Population of Ireland (millions): model and census"; chB.opts.title = P.view === "malthus" ? "Food per head (real wages)" : "Each year: excess deaths and emigrants (thousands)"; }
function restartMalthus() { M = new Malthus({ g: P.g, p: P.p, sigma: P.sigma, modern: P.modern }, rnd); }
function restartIrl() { IR = new Ireland(P.irl, rnd); acc = 0; }
function set(o) {
  Object.assign(P, { view: "malthus", g: 0.001, p: 0.3, sigma: 0.1, modern: false, speed: 12, autoPlague: false, irlSpeed: 4 }, o); P.irl = Object.assign({}, IRL_DEF, o.irl || {});
  ctl.view.set(P.view); ctl.g.set(P.g * 100); ctl.p.set(P.p); ctl.sigma.set(P.sigma); ctl.modern.set(P.modern); ctl.auto.set(P.autoPlague); ctl.speed.set(P.speed);
  ctl.blight.set(P.irl.blight); ctl.relief.set(P.irl.relief); ctl.exports.set(P.irl.exports); ctl.emig.set(P.irl.emig); ctl.post.set(P.irl.post); ctl.irlSpeed.set(P.irlSpeed);
  restartMalthus(); restartIrl(); showGroups();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Population (millions)", xLabel: "year", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Food per head", xLabel: "year", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif", people = m => (Math.round(m * 1000) * 1000).toLocaleString("en-GB");   // millions → "1,150,000"
function drawMalthus(c, w, h) {
  // left: the Malthus diagram (birth and death rates against food per head); right: the village
  const L = 70, T = 50, W = Math.min(w * 0.55, w - 360), H = h - 110, x0 = 0.5, x1 = 2.2, yr0 = 0, yr1 = 0.06;
  const X = v => L + (v - x0) / (x1 - x0) * W, Y = v => T + H - (v - yr0) / (yr1 - yr0) * H, ir = M.o.modern && M.year >= M.o.irYear;
  c.strokeStyle = "#3a4560"; c.lineWidth = 1; c.strokeRect(L, T, W, H);
  c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.textAlign = "center";
  for (let v = 0.5; v <= 2.2; v += 0.25) { c.fillText(v.toFixed(2), X(v), T + H + 16); }
  c.fillText("food per head (real wage)", L + W / 2, T + H + 34); c.textAlign = "right";
  for (let v = 0; v <= 0.06; v += 0.01) c.fillText(Math.round(v * 1000), L - 6, Y(v) + 4);
  c.save(); c.translate(L - 40, T + H / 2); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.fillText("per 1,000 people a year", 0, 0); c.restore();
  c.fillStyle = "rgba(255,93,108,0.12)"; c.fillRect(X(x0), T, X(0.7) - X(x0), H); c.fillStyle = "#ff8a95"; c.textAlign = "left"; c.fillText("famine", X(0.52), T + 16);
  const curve = (f, col, lab) => { c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i <= 120; i++) { const v = x0 + (x1 - x0) * i / 120, yy = clamp(f(v), 0, yr1); i ? c.lineTo(X(v), Y(yy)) : c.moveTo(X(v), Y(yy)); } c.stroke(); c.fillStyle = col; c.fillText(lab, X(1.9), Y(clamp(f(1.9), 0, yr1)) - 8); };
  curve(v => birthRate(v, M.o.p, ir), "#7fe3a0", "births"); curve(v => deathRate(v), "#ff8a95", "deaths");
  const ys = yStar(M.o.p); c.setLineDash([4, 4]); c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(X(ys), T); c.lineTo(X(ys), T + H); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#ffd166"; c.fillText("equilibrium y* = " + ys.toFixed(2), X(ys) + 5, T + 30);
  // the society now: births above deaths → growing (arrow right-to-left: more people, less food each)
  const yy = clamp(M.y, x0, x1); c.fillStyle = "#fff"; c.beginPath(); c.arc(X(yy), Y(clamp(M.b, 0, yr1)), 6, 0, 6.3); c.fill(); c.beginPath(); c.arc(X(yy), Y(clamp(M.d, 0, yr1)), 6, 0, 6.3); c.fill();
  c.strokeStyle = "#fff"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(yy), Y(clamp(M.b, 0, yr1))); c.lineTo(X(yy), Y(clamp(M.d, 0, yr1))); c.stroke(); c.setLineDash([]);
  c.font = "600 14px " + FONT; c.fillStyle = "#eef2f8"; c.textAlign = "left"; c.fillText("Malthus's diagram", L, T - 18);
  c.font = "12px " + FONT; c.fillStyle = "#aab6cc"; c.fillText(M.b > M.d ? "births > deaths: population grows, food per head falls ←" : "deaths > births: population falls, food per head rises →", L + 150, T - 18);
  // the village: fixed land (fields), people (one dot = 50,000), a grain heap per person
  const vx = L + W + 50, vw = w - vx - 30; if (vw < 150) return;
  c.font = "600 14px " + FONT; c.fillStyle = "#eef2f8"; c.fillText(`${M.year}: the same land, ${M.N.toFixed(1)} million people`, vx, T - 18);
  const rows = 8, cols = 8, fw = vw / cols, fh = (H * 0.45) / rows;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { c.fillStyle = `hsl(${45 + 50 * clamp(M.h - 0.7, 0, 0.6)}, 55%, ${22 + 18 * clamp(M.h, 0, 1.4) / 1.4}%)`; c.fillRect(vx + j * fw + 1, T + i * fh + 1, fw - 2, fh - 2); }
  c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.fillText(`harvest ${Math.round(M.h * 100)}% of normal`, vx, T + rows * fh + 16);
  const n = Math.round(M.N / 0.05), pr = Math.max(2, Math.min(5, Math.sqrt(vw * H * 0.4 / Math.max(1, n)) / 2.6)), per = Math.max(1, Math.floor(vw / (pr * 2.6)));
  for (let i = 0; i < Math.min(n, 900); i++) { const px = vx + (i % per) * pr * 2.6 + pr, py = T + rows * fh + 34 + Math.floor(i / per) * pr * 2.6; if (py > T + H + 30) break; c.fillStyle = M.y < 0.7 ? "#ff8a95" : M.y > 1.2 ? "#7fe3a0" : "#dfe6f3"; c.beginPath(); c.arc(px, py, pr, 0, 6.3); c.fill(); }
}
function drawIreland(c, w, h) {
  const f = IR.food, yr = IR.year; c.font = "600 15px " + FONT; c.fillStyle = "#eef2f8"; c.textAlign = "left";
  c.fillText(`Ireland, ${f ? f.yr : yr}`, 30, 34); c.font = "12px " + FONT; c.fillStyle = "#aab6cc";
  c.fillText(yr < 1845 ? "Before the Famine: the potato feeds a growing population" : yr <= 1851 ? "The Great Famine (An Gorta Mór)" : "After the Famine", 30, 54);
  // food bar for the year just simulated: what fed the people, against what they needed
  if (f) {
    const bx = 30, by = 90, bw = Math.min(w - 380, 620), unit = bw / Math.max(f.need * 1.15, f.potato + f.kept + f.stopped + f.relief + f.exported);
    c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText(`Food in ${f.yr} (millions of people fed for a year)`, bx, by - 10);
    let x = bx; const seg = (v, col, lab) => { if (v <= 0.005) return; c.fillStyle = col; c.fillRect(x, by, v * unit, 34); if (v * unit > 60) { c.fillStyle = "#0b1020"; c.font = "12px " + FONT; c.fillText(lab, x + 5, by + 21); } x += v * unit; };
    seg(f.potato, "#c9a96a", "potatoes " + f.potato.toFixed(1)); seg(f.kept, "#7fb3e3", "other food " + f.kept.toFixed(1)); seg(f.stopped, "#9be15d", "exports kept"); seg(f.relief, "#c58cff", "relief " + f.relief.toFixed(1));
    if (f.exported) { c.globalAlpha = 0.5; c.fillStyle = "#ff8a95"; c.fillRect(x + 4, by + 6, f.exported * unit, 22); c.globalAlpha = 1; c.fillStyle = "#ff8a95"; c.font = "12px " + FONT; c.fillText("exported →", x + 8, by + 21); }
    c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.setLineDash([5, 3]); c.beginPath(); c.moveTo(bx + f.need * unit, by - 4); c.lineTo(bx + f.need * unit, by + 40); c.stroke(); c.setLineDash([]);
    c.fillStyle = "#ffd166"; c.fillText("needed " + f.need.toFixed(1), bx + f.need * unit - 30, by + 54);
    c.fillStyle = f.y < 0.9 ? "#ff8a95" : "#aab6cc"; c.fillText(`food per head ${f.y.toFixed(2)}${f.y < 0.9 ? ": hunger and disease" : ""}`, bx, by + 54);
  }
  // people: one figure = 100,000. Alive, died in the Famine (excess), emigrated in the Famine
  const gx = 30, gy = 190, cell = Math.max(10, Math.min(24, (w - 360) / 22)), per = Math.floor((w - 360) / cell);
  const fig = (x, y, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y - 4, cell * 0.2, 0, 6.3); c.fill(); c.fillRect(x - cell * 0.18, y - 1, cell * 0.36, cell * 0.38); };
  const alive = Math.round(IR.N * 10), died = Math.round(IR.dead * 10), gone = Math.round(IR.gone * 10);
  c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("Each figure = 100,000 people", gx, gy - 12);
  let k = 0; const place = (n, col) => { for (let i = 0; i < n; i++, k++) fig(gx + (k % per) * cell + cell / 2, gy + Math.floor(k / per) * cell * 1.4 + cell, col); };
  place(alive, "#dfe6f3"); k = Math.ceil(k / per) * per + per; place(died, "#ff5d6c"); place(gone, "#5ab0ff");
  // tally box
  const tx = w - 300, ty = 190; c.fillStyle = "rgba(20,27,46,0.9)"; c.fillRect(tx, ty - 20, 270, 140); c.strokeStyle = "#3a4560"; c.strokeRect(tx, ty - 20, 270, 140);
  c.font = "13px " + FONT; const line = (t, v, col, i) => { c.fillStyle = col; c.fillText(t, tx + 12, ty + 6 + i * 24); c.textAlign = "right"; c.fillText(v, tx + 258, ty + 6 + i * 24); c.textAlign = "left"; };
  line("population now", IR.N.toFixed(2) + " million", "#dfe6f3", 0); line("excess deaths 1845–51", people(IR.dead), "#ff8a95", 1); line("emigrated 1845–51", people(IR.gone), "#5ab0ff", 2);
  c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.fillText("Historians: about 1 million died and", tx + 12, ty + 82); c.fillText("over 1 million emigrated (1845–51)", tx + 12, ty + 98);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (P.view === "malthus") {
    acc += dt * P.speed; while (acc >= 1) { acc -= 1; if (P.autoPlague && M.year === 1348) { M.plague(); ui.tip("1348: the Black Death arrives. About 40% die."); } M.step(); if (M.year > 2000) { restartMalthus(); } }
  } else if (IR.year < 1901) {
    const sp = IR.year >= 1845 && IR.year <= 1851 ? Math.min(P.irlSpeed, Math.max(0.5, P.irlSpeed / 3)) : P.irlSpeed;
    acc += dt * sp; while (acc >= 1 && IR.year < 1901) { acc -= 1; IR.step(); }
  }
}, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "malthus") drawMalthus(c, w, h); else drawIreland(c, w, h);
  if (frame++ % 4) return;
  if (P.view === "malthus") {
    chA.draw([{ pts: M.log.map(q => [q[0], q[1]]), color: "#5ab0ff", label: "population" }], { yMin: 0, vlines: M.plagueYears.filter(y => y >= (M.log[0] || [0])[0]).map(y => ({ x: y, color: "#ff5d6c", label: "plague" })) });
    chB.draw([{ pts: M.log.map(q => [q[0], q[2]]), color: "#ffd166", label: "food per head" }], { yMin: 0, hlines: [{ y: 0.7, color: "#ff5d6c", label: "famine line" }, { y: yStar(M.o.p), color: "#7fe3a0", label: "equilibrium" }] });
    read.set("yr", M.year); read.set("pop", M.N.toFixed(2) + " million"); read.set("y", M.y.toFixed(2)); read.set("bd", `${(M.b * 1000).toFixed(1)} / ${(M.d * 1000).toFixed(1)}`);
    read.set("a", "famine years so far: " + M.famines); read.set("b", "technology A = " + M.A.toFixed(2));
    ui.hud("");
  } else {
    chA.draw([{ pts: [[1781, 4.05]].concat(IR.log), color: "#5ab0ff", label: "model" }, { pts: CENSUS, type: "dots", color: "#ffd166", r: 4, label: "census" }], { xMin: 1780, xMax: 1902, yMin: 0, yMax: 9.5, bands: [{ x0: 1845, x1: 1852, color: "rgba(255,93,108,0.15)" }] });
    const yl = IR.yearly.filter(q => q[0] >= 1835);
    chB.draw([{ pts: yl.map(q => [q[0], q[1]]), type: "bars", w: 0.42, color: "#ff5d6c", label: "excess deaths" }, { pts: yl.map(q => [q[0] + 0.45, q[2]]), type: "bars", w: 0.42, color: "#5ab0ff", label: "emigrants" }], { xMin: 1834, xMax: 1902, yMin: 0 });
    const f = IR.food; read.set("yr", Math.min(IR.year, 1901)); read.set("pop", IR.N.toFixed(2) + " million"); read.set("y", f ? f.y.toFixed(2) : "–"); read.set("bd", "–");
    read.set("a", "excess deaths: " + people(IR.dead)); read.set("b", "emigrants: " + people(IR.gone));
    ui.hud(IR.year >= 1901 ? "<b>1901</b>: the run is over. Change a choice to run it again." : "");
  }
});
set({});
ui.tip("Malthus's world: watch the dots on the diagram. Switch to Ireland at the top of the controls.", 7000);
