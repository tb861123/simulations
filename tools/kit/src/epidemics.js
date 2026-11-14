/* =====================================================================
   EPIDEMICS AND VACCINATION
   A town of a few thousand people. Everyone has a home and a household;
   children go to a class at school, most adults go to a workplace, and
   some evenings people visit a shop or cafe. An infectious person can
   pass the disease to people who are in the same place at the same time.

   Each person is in one of these states:
       S  susceptible   has never had it and can catch it
       E  exposed       has caught it but cannot yet pass it on
       I  infectious    can pass it on (with or without symptoms)
       R  recovered     immune           (or D: died)
       V  protected by a vaccine

   Every hour the model asks, for every susceptible person: who else is
   in the same room, and how many of them are infectious? The chance of
   catching the disease in that hour rises with that number.

   R0 ("R nought") is the average number of people one case infects when
   nobody is immune. The model is tuned so that the R0 you set on the
   slider is what the disease achieves in this town with no measures.
   ===================================================================== */
const S = 0, E = 1, I = 2, REC = 3, DEAD = 4, VAC = 5;
const MIX = 0, HOSP = 1, HOME = 2, CLASS = 3, WORK = 4, VENUE = 5;
// how intense contact is in each kind of place (relative close-contact hours per hour spent there)
const CONTACT = [1, 0, 0.5, 1.2, 0.6, 2.0];
const h01 = (i, d, k) => { const s = Math.sin(i * 12.9898 + d * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };   // a repeatable "random" number from 0 to 1 for person i on day d
/* In a town, an infectious person spends much of the day with the same few people, who are soon all infected or immune,
   so the raw infectiousness has to be higher than under equal mixing to reach the same R0. This factor was found by
   measuring R0 in the model town (see the batch run "Does the town match its R0?"). */
const townFactor = R0 => 1.9 + 0.3 * R0;

class Town {
  constructor(n, rand, M, mix) {
    this.n = n; this.rand = rand; this.M = M; this.mix = !!mix; this.t = 0;
    const u8 = () => new Uint8Array(n), f32 = () => new Float32Array(n), i32 = () => new Int32Array(n);
    this.st = u8(); this.home = i32(); this.day = i32().fill(-1); this.kid = u8(); this.tI = f32(); this.tSym = f32(); this.tR = f32(); this.asym = u8(); this.dies = u8(); this.hosp = u8(); this.vacc = u8();
    this.uIso = f32(); this.uW = f32(); this.nInf = new Uint16Array(n); this.loc = i32(); this.ox = f32(); this.oy = f32();
    // ---- build the households, classes, workplaces and venues ----
    const type = [MIX, HOSP]; let i = 0; this.nHomes = 0; const kids = [], adults = [];
    while (i < n) {
      const u = rand(), size = Math.min(n - i, u < .28 ? 1 : u < .62 ? 2 : u < .78 ? 3 : u < .93 ? 4 : 5), h = type.length; type.push(HOME); this.nHomes++; const retired = size <= 2 && rand() < 0.3;
      for (let k = 0; k < size; k++, i++) { this.home[i] = h; this.kid[i] = k >= 2 ? 1 : 0; if (k >= 2) kids.push(i); else if (!retired) adults.push(i); this.uIso[i] = rand(); this.uW[i] = rand(); this.ox[i] = rand(); this.oy[i] = rand(); }
    }
    this.firstClass = type.length; for (let k = 0; k < kids.length; k++) { if (k % 25 === 0) type.push(CLASS); this.day[kids[k]] = type.length - 1; }
    this.firstWork = type.length; for (let k = 0; k < adults.length;) { const size = 5 + Math.floor(rand() * rand() * 60); type.push(WORK); for (let q = 0; q < size && k < adults.length; q++, k++) this.day[adults[k]] = type.length - 1; }
    this.firstVenue = type.length; this.nVenues = Math.max(3, Math.round(n / 250)); for (let k = 0; k < this.nVenues; k++) type.push(VENUE);
    this.ptype = Uint8Array.from(type); const np = type.length; this.cnt = new Float32Array(np); this.inf = new Float32Array(np); this.rep = new Int32Array(np); this.hq = new Float32Array(np);
    // ---- vaccinate before the outbreak: a vaccinated person is fully protected with probability = efficacy ----
    for (let k = 0; k < n; k++) if (rand() < M.vacc / 100) { this.vacc[k] = 1; if (rand() < M.eff / 100) this.st[k] = VAC; }
    this.where = [0, 0, 0, 0, 0, 0]; this.newToday = 0; this.daily = []; this.log = []; this.recent = []; this.cum = 0; this.peak = 0; this.peakDay = 0; this.events = null; this.gen1 = [];
  }
  seed(k) { let tries = 0; while (k > 0 && tries++ < 10000) { const i = Math.floor(this.rand() * this.n); if (this.st[i] === S) { this.infect(i, -1, MIX); this.tI[i] = this.t + this.rand() * 24; this.tR[i] = this.tI[i] + this.M.inf * 24 * (0.6 + 0.8 * this.rand()); this.tSym[i] = this.tI[i] + this.M.presym * 24; this.seeded = (this.seeded || 0) + 1; k--; } } }
  infect(i, by, where) {
    const M = this.M, r = this.rand; this.st[i] = E;
    this.tI[i] = this.t + M.lat * 24 * (0.6 + 0.8 * r());                      // exposed (latent) period: cannot pass it on yet
    this.tR[i] = this.tI[i] + M.inf * 24 * (0.6 + 0.8 * r());                  // then infectious until this time
    this.tSym[i] = this.tI[i] + M.presym * 24;                                 // symptoms start a little after becoming infectious
    this.asym[i] = r() < M.asym / 100 ? 1 : 0; this.dies[i] = r() < M.cfr / 100 ? 1 : 0; this.hosp[i] = !this.asym[i] && r() < M.hosp / 100 ? 1 : 0;
    if (by >= 0) { this.nInf[by]++; this.where[where]++; } this.newToday++; this.cum++;
    if (this.events && this.events.length < 60) this.events.push(i);
  }
  // where is person i at this hour?
  place(i, hour, dayNo) {
    const M = this.M, t = this.t, st = this.st[i];
    if (st === I && t >= this.tSym[i] && !this.asym[i]) {
      if (this.hosp[i]) return HOSP;                                           // seriously ill: in hospital, not passing it on
      if (this.uIso[i] < M.iso / 100) { if (M.hq) this.hq[this.home[i]] = t + 240; return this.home[i]; }   // has symptoms and stays at home
    }
    if (this.mix) return MIX;
    if (this.hq[this.home[i]] > t) return this.home[i];                        // someone at home is ill: the whole household stays in
    const d = this.day[i];
    if (d >= 0 && hour >= 8) { if (this.kid[i]) { if (hour < 15 && !M.schoolsClosed) return d; } else if (hour < 17 && this.uW[i] >= M.wfh / 100) return d; }
    if (hour >= 17 && hour < 20 && h01(i, dayNo, 1) < 0.35 * (1 - M.dist / 100)) return this.firstVenue + Math.floor(h01(i, dayNo, 2) * this.nVenues);
    return this.home[i];
  }
  tick() {   // one hour
    const { n, st, loc, cnt, inf, rep, ptype, rand, M } = this, t = this.t, hour = t % 24, dayNo = Math.floor(t / 24);
    // the raw infectiousness: chance per hour of infecting one particular close contact
    const tau = (this.mix ? 1 : townFactor(M.R0)) * M.R0 / (24 * M.inf * (1 - 0.5 * M.asym / 100));
    const outside = (1 - M.dist / 100) * (M.masks ? 0.6 : 1);                 // distancing and masks cut transmission outside the home
    cnt.fill(0); inf.fill(0);
    for (let i = 0; i < n; i++) {
      let s = st[i];
      if (s === E && t >= this.tI[i]) s = st[i] = I; else if (s === I && t >= this.tR[i]) { s = st[i] = this.dies[i] ? DEAD : REC; this.recent.push([t, this.nInf[i]]); if (this.gen1.length < 40) this.gen1.push(this.nInf[i]); }
      if (s === DEAD) { loc[i] = -1; continue; }
      const g = loc[i] = this.place(i, hour, dayNo); if (g === HOSP) continue;
      cnt[g]++; if (s === I) { const w = this.asym[i] ? 0.5 : 1; inf[g] += w; if (rand() < w / inf[g]) rep[g] = i; }       // people without symptoms are taken to be half as infectious
    }
    for (let i = 0; i < n; i++) {
      if (st[i] !== S) continue; const g = loc[i]; if (!(inf[g] > 0)) continue; const ty = ptype[g];
      // THE RULE: the hourly risk grows with the share of the other people in the room who are infectious
      const risk = tau * CONTACT[ty] * (ty === HOME ? 1 : outside) * inf[g] / Math.max(1, cnt[g] - 1);
      if (rand() < 1 - Math.exp(-risk)) this.infect(i, rep[g], ty);
    }
    this.t++;
    if (this.t % 24 === 0) { const c = this.counts(); this.daily.push([this.t / 24, this.newToday]); this.newToday = 0; this.log.push([this.t / 24, c]); if (c[I] > this.peak) { this.peak = c[I]; this.peakDay = this.t / 24; } while (this.recent.length && this.recent[0][0] < this.t - 120) this.recent.shift(); }
  }
  counts() { const c = [0, 0, 0, 0, 0, 0, 0]; for (let i = 0; i < this.n; i++) { c[this.st[i]]++; if (this.st[i] === I && this.hosp[i] && this.t >= this.tSym[i]) c[6]++; } return c; }
  rNow() { if (this.recent.length < 5) return null; let s = 0; for (const q of this.recent) s += q[1]; return s / this.recent.length; }   // average number infected by people who stopped being infectious in the last 5 days
  over() { const c = this.counts(); return c[E] + c[I] === 0; }
}
// What the textbook SEIR equations predict when everyone mixes equally. Returns [[day, S, E, I, R] ...] as fractions.
function seir(M, n, seeds, days) {
  let s = 1 - M.vacc / 100 * M.eff / 100 - seeds / n, e = seeds / n, i = 0, r = 0; const out = [], beta = M.R0 / M.inf * (1 - M.dist / 100) * (M.masks ? 0.6 : 1), h = 0.05;
  for (let t = 0; t <= days; t += h) { if (Math.abs(t - Math.round(t)) < h / 2) out.push([Math.round(t), s, e, i, r]); const a = beta * s * i, b = e / M.lat, c = i / M.inf; s -= a * h; e += (a - b) * h; i += (b - c) * h; r += c * h; }
  return out;
}
// the "final size equation": the fraction z eventually infected satisfies z = s0 (1 - exp(-R0 z)), where s0 is the fraction susceptible at the start
function finalSize(R0, s0 = 1) { let z = 0.9; for (let k = 0; k < 200; k++) z = s0 * (1 - Math.exp(-R0 * z)); return z; }
const DISEASES = {
  covid: { name: "COVID-like", R0: 3, lat: 3, inf: 6, presym: 1.5, asym: 35, cfr: 1, hosp: 5 },
  flu: { name: "Seasonal flu", R0: 1.5, lat: 2, inf: 4, presym: 0.5, asym: 30, cfr: 0.1, hosp: 1 },
  measles: { name: "Measles", R0: 15, lat: 10, inf: 8, presym: 3, asym: 0, cfr: 0.2, hosp: 10 },
  ebola: { name: "Ebola-like", R0: 1.8, lat: 9, inf: 8, presym: 0, asym: 0, cfr: 50, hosp: 20 }
};
const BASE = { vacc: 0, eff: 95, dist: 0, masks: false, schoolsClosed: false, wfh: 0, iso: 0, hq: false };
// A whole outbreak without drawing, for the batch experiments
function outbreak(o, rnd, days = 250) { const M = Object.assign({}, DISEASES.covid, BASE, o), T = new Town(o.n || 800, rnd, M, o.mix); T.seed(o.seeds || 5); for (let d = 0; d < days * 24; d++) { T.tick(); if (d % 24 === 0 && T.over()) break; } return T; }

// ---------------- The page ----------------
const M = Object.assign({}, DISEASES.covid, BASE);
let town, N = 1500, seeds = 5, mix = false, dayLen = 2.5, tNow = 0, theory = [], flashes = [], seedNo = 1;
const pos = { x: null, y: null, fx: null, fy: null, tx: null, ty: null, t0: null, cur: null };
function restart() {
  town = new Town(N, K.rng(seedNo = (seedNo * 31 + 7) % 99991), M, mix); town.events = []; town.seed(seeds); tNow = 0; flashes = [];
  for (const k of ["x", "y", "fx", "fy", "tx", "ty", "t0"]) pos[k] = new Float32Array(N); pos.cur = new Int32Array(N).fill(-2);
  if (typeof layout === "function") layout(); theory = seir(M, N, seeds, 300);
}

const ui = K.app({
  title: "Epidemics and Vaccination", subject: "Biology",
  blurb: "A whole town, hour by hour: how a disease spreads and how to stop it",
  reset: () => { set(Object.assign({ disease: "covid", n: 1500, seeds: 5, mix: false }, BASE)); },
  missions: [
    { title: "Patient zero", q: "Five people in the town have caught a new disease (yellow: infected but not yet infectious; red: infectious). Follow the red dots through a few days. Where do people catch it, and how does it get from one household to another?", hint: "Inside a home it spreads quickly to the rest of the household, but a household is small. It reaches new households through the places where people from different homes mix: classes, workplaces, shops and cafés. Those links are what turn a few cases into an epidemic. The readings show where infections happened.", setup() { set(Object.assign({ disease: "covid", n: 1500, seeds: 5, mix: false, speed: 5 }, BASE)); } },
    { title: "What R0 means", q: "Run seasonal flu (R0 = 1.5), then measles (R0 = 15). Compare the height of the peak, how soon it comes and how many people escape infection altogether.", hint: "R0 is the average number of people each case infects when nobody is immune. Flu at 1.5 spreads slowly and many people never catch it. Measles at 15 tears through almost everyone in a few weeks. The epidemic turns over when enough people are immune that each case infects fewer than one other (R falls below 1), not when everyone has had it.", setup() { set(Object.assign({ disease: "flu", n: 1500, seeds: 5, mix: false, speed: 1 }, BASE)); } },
    { title: "Vaccination and herd immunity", q: "The disease has R0 = 3. Run it with 0%, then 40%, then 70% of the town vaccinated (blue dots). At 70%, what happens to the people who are NOT vaccinated?", hint: "At 40% there is still an epidemic, though smaller. At about 70% it fizzles: each case meets so many immune people that it infects fewer than one other, so chains of infection die out. The unvaccinated are protected by the people around them. That is herd immunity, and the threshold is 1 − 1/R0 (67% for R0 = 3; about 93% for measles).", setup() { set(Object.assign({ disease: "covid", n: 1500, seeds: 5, mix: false, speed: 1 }, BASE, { vacc: 0, eff: 100 })); } },
    { title: "Flatten the curve", q: "The dashed line is the number of hospital beds. Run with no measures and see how far the purple 'in hospital' line overshoots it. Start again with contacts outside the home cut by 50%. What changes: the total number infected, the peak, or both?", hint: "Cutting contacts lowers R. The peak is much lower and later, so fewer people need a bed at the same moment and the hospital may cope. The total infected falls too, but by less. If the measures are lifted while many are still susceptible, the epidemic takes off again: try switching distancing off part-way through.", setup() { set(Object.assign({ disease: "covid", n: 2500, seeds: 8, mix: false, speed: 1 }, BASE)); } },
    { title: "Close the schools?", q: "Run the outbreak and read off where infections happened. Then start again with schools closed. How much difference does it make to the peak? What is the cost?", hint: "Classes link many households, so closing schools removes a major route and lowers the peak. But children still catch it at home and in shops, so it does not stop the outbreak alone. Real decisions weigh this against the harm of lost schooling, and it matters how much children actually spread the particular disease.", setup() { set(Object.assign({ disease: "covid", n: 2500, seeds: 8, mix: false, speed: 1 }, BASE)); } },
    { title: "Isolate the ill", q: "With the Ebola-like disease, set 'Ill people stay at home' to 80% and run it. Then do the same for the COVID-like disease. Why does isolation work so much better for one than the other?", hint: "With the Ebola-like disease people are only infectious once they have symptoms, and everyone gets symptoms, so isolating the ill catches nearly all transmission. The COVID-like disease spreads for a day or two before symptoms start, and a third of cases never have symptoms: the 'silent' spreaders are missed. This is why COVID-19 needed testing and tracing, and Ebola outbreaks can be stopped by finding and isolating cases.", setup() { set(Object.assign({ disease: "ebola", n: 1500, seeds: 8, mix: false, speed: 1 }, BASE, { iso: 80 })); } },
    { title: "Town or textbook?", q: "The dashed curve is the textbook SEIR equations, which assume everyone mixes equally with everyone else. Run the town and compare. Then switch to 'everyone mixes equally' and run it again.", hint: "With equal mixing the model follows the equations closely. The town does not: the disease races through a household or a class, where people spend hours together, so the early rise is faster and comes in bursts as it reaches each new group. Real epidemics are lumpy like this, which is one reason forecasts based on simple equations go wrong.", setup() { set(Object.assign({ disease: "covid", n: 2500, seeds: 8, mix: false, speed: 1 }, BASE)); } },
    { title: "Luck", q: "Just ONE case of flu arrives in the town. Run it, then press 'Start again' five or six times. Does an epidemic always follow?", hint: "Often it does not. With R0 = 1.5 the first case infects 0, 1, 2 or 3 people by chance, and if the first few happen to infect nobody the chain dies out. Simple theory says an outbreak with R0 = 1.5 takes off only about 6 times in 10. Many real introductions of a disease fizzle like this and are never noticed.", setup() { set(Object.assign({ disease: "flu", n: 1500, seeds: 1, mix: true, speed: 0.4 }, BASE)); } }
  ],
  batch: [
    { title: "Bigger R0, bigger outbreak", question: "What share of the population is eventually infected, for different values of R0?", how: "Each run: 800 people who all mix equally, 5 first cases, run until the outbreak is over.", xLabel: "R0", yLabel: "infected by the end (%)", xs: [0.6, 0.9, 1.2, 1.5, 2, 2.5, 3, 4, 5], reps: 8, yMin: 0, yMax: 100, theory: x => x <= 1 ? 0 : 100 * finalSize(x), theoryLabel: "final size equation", run: (x, r) => { const T = outbreak({ R0: x, mix: true }, r); return 100 * T.cum / T.n; }, note: "Just above R0 = 1 the outcome is a lottery: the same disease sometimes dies out after a handful of cases and sometimes infects a third of the town. Well above 1, runs agree closely." },
    { title: "Vaccination and herd immunity", question: "How many of the unvaccinated catch the disease as vaccine coverage rises?", how: "Each run: 800 people mixing equally, R0 = 3, a vaccine that always works, 5 first cases. The result is the percentage of unvaccinated people infected.", xLabel: "vaccinated (%)", yLabel: "unvaccinated people infected (%)", xs: [0, 10, 20, 30, 40, 50, 60, 67, 75, 85], reps: 8, yMin: 0, yMax: 100, theory: v => { const s0 = 1 - v / 100; return s0 * 3 <= 1 ? 0 : 100 * finalSize(3, s0) / s0; }, theoryLabel: "theory (threshold 1 − 1/R0 = 67%)", run(v, r) { const T = outbreak({ R0: 3, mix: true, vacc: v, eff: 100 }, r); let un = 0; for (let i = 0; i < T.n; i++) if (!T.vacc[i]) un++; return 100 * T.cum / (un || 1); }, note: "Vaccinating someone protects them, and also everyone they would have infected. Near the threshold, chance decides whether the first few cases start a small outbreak or none at all. Above it the points do not reach zero, because the 5 first cases and the few people they infect directly are counted." },
    { title: "Does one case start an epidemic?", question: "When a single case arrives, how often does an epidemic follow?", how: "Each run: 600 people mixing equally and one first case. The result is 100 if more than 5% of the town was infected, 0 if the chain died out, so the mean is the percentage of introductions that took off.", xLabel: "R0", yLabel: "introductions that became epidemics (%)", xs: [0.8, 1.2, 1.5, 2, 2.5, 3, 4, 6], reps: 40, yMin: 0, yMax: 100, theory: x => x <= 1 ? 0 : 100 * finalSize(x), theoryLabel: "simple theory", run: (x, r) => outbreak({ R0: x, mix: true, n: 600, seeds: 1 }, r).cum > 30 ? 100 : 0, note: "Every single run is all-or-nothing, which is why the faint dots sit at 0 and 100. Only the mean of many runs shows the probability." },
    { title: "Flatten the curve", question: "How does the peak fall as contacts outside the home are cut?", how: "Each run: the town of 800 with homes, school and work, COVID-like disease (R0 = 3), 5 first cases. The result is the highest percentage of the town infectious at the same time.", xLabel: "contacts outside the home cut by (%)", yLabel: "peak infectious at once (%)", xs: [0, 10, 20, 30, 40, 50, 60, 70, 80], reps: 6, yMin: 0, run: (x, r) => { const T = outbreak({ dist: x }, r, 400); return 100 * T.peak / T.n; }, note: "Households still pass the disease on at home whatever happens outside, so the peak does not reach zero until outside contacts are cut very hard." },
    { title: "Isolating the ill: two diseases", question: "How well does asking ill people to stay at home work?", how: "Each run: the town of 800 with the COVID-like disease (infectious before symptoms; a third never show symptoms). The result is the percentage infected by the end. Compare with the next experiment.", xLabel: "ill people who stay at home (%)", yLabel: "infected by the end (%)", xs: [0, 20, 40, 60, 80, 100], reps: 6, yMin: 0, yMax: 100, run: (x, r) => { const T = outbreak({ iso: x }, r, 400); return 100 * T.cum / T.n; } },
    { title: "Isolating the ill: Ebola-like", question: "The same measure against a disease that only spreads once symptoms show.", how: "Each run: the town of 800 with the Ebola-like disease (R0 = 1.8, no spread before symptoms, everyone shows symptoms).", xLabel: "ill people who stay at home (%)", yLabel: "infected by the end (%)", xs: [0, 20, 40, 60, 80, 100], reps: 6, yMin: 0, yMax: 100, run: (x, r) => { const T = outbreak(Object.assign({}, DISEASES.ebola, { iso: x, hosp: 0, cfr: 0 }), r, 600); return 100 * T.cum / T.n; }, note: "Here isolation alone can end the outbreak, because no transmission is hidden. (Hospital admission is switched off in this experiment so that only staying at home is being tested.)" },
    { title: "Does the town match its R0?", question: "Is the R0 on the slider what the disease really achieves in the town?", how: "Each run: the town of 800, 5 first cases, nobody immune. The result is the average number of people infected by the first 40 people to recover.", xLabel: "R0 set on the slider", yLabel: "R0 measured", xs: [1, 1.5, 2, 3, 4, 6, 8], reps: 8, yMin: 0, theory: x => x, theoryLabel: "equal", run(x, r) { const T = outbreak({ R0: x, asym: 0 }, r, 60); return T.gen1.length >= 10 ? T.gen1.reduce((a, b) => a + b, 0) / T.gen1.length : null; }, note: "This is how the model was tuned. The measured value falls a little short at high R0, because the earliest cases have already used up some of the people around them before the first 40 recover." }
  ],
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1): 2(h) vaccination and memory cells (2.63B), 1(b) pathogens. How a disease spreads through a population is beyond the spec.", adv: "OCR A level Biology A (H420) 4.1.1 Communicable diseases, disease prevention and the immune system." } },
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 1(b)", text: "Infectious diseases are caused by pathogens (bacteria, viruses, fungi and protoctists) that pass from one person to another." },
      { lvl: "std", tag: "4BI1 2.63B", text: "A vaccine contains dead or weakened pathogens, or parts of them. It makes the body produce antibodies and memory cells without causing the disease, so a later infection is met by a faster, larger response." },
      { lvl: "beyond", tag: "Beyond the spec", text: "R<sub>0</sub> is the average number of people one case infects when nobody is immune. An outbreak grows while R is above 1 and dies out when it falls below 1." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Herd immunity: when enough people are immune (more than 1 − 1/R<sub>0</sub>), each case infects fewer than one other on average, which also protects people who cannot be vaccinated." },
      { lvl: "adv", tag: "H420 4.1.1", text: "Communicable diseases are transmitted directly (contact, droplets, body fluids) or indirectly (vectors, contaminated food and water). Crowding and poor ventilation increase transmission." },
      { lvl: "adv", tag: "H420 4.1.1", text: "Vaccination gives artificial active immunity. Mass (herd) vaccination protects a whole population; ring vaccination targets the contacts of each new case." },
      { lvl: "adv", tag: "H420 4.1.1", text: "An epidemic is a rapid rise in cases in one area; a pandemic spreads across countries and continents. Asymptomatic carriers make control harder because they transmit without being identified." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain how vaccination protects a person against a disease.", ans: "<ul><li>The vaccine contains dead, weakened or part of the pathogen (antigens)</li><li>Lymphocytes (white blood cells) respond by making antibodies</li><li>Memory cells are produced and remain in the blood</li><li>On infection, antibodies are made faster and in greater quantity, so the pathogen is destroyed before it causes illness</li></ul>" },
      { lvl: "std", marks: 3, q: () => `In your town ${M.vacc}% of people are vaccinated. Explain how vaccinating a large proportion of a population can protect people who have not been vaccinated.`, ans: "<ul><li>Vaccinated people do not catch the disease, so they do not pass it on</li><li>An infected person therefore meets few people they can infect, and the chain of transmission is broken</li><li>The pathogen is unlikely to reach the unvaccinated (herd immunity)</li></ul>" },
      { lvl: "std", marks: 2, q: "Suggest two ways, other than vaccination, of reducing the spread of a disease that is passed on in droplets from coughs and sneezes.", ans: "<ul><li>Any two from: isolating infected people; wearing masks; keeping apart / avoiding crowds; hand washing; better ventilation</li></ul>" },
      { lvl: "std", marks: 2, q: "Give two reasons why some people with an infectious disease pass it on without knowing.", ans: "<ul><li>They can be infectious before their symptoms start</li><li>Some infected people never develop symptoms</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `The disease in your simulation has R0 = ${M.R0}. Calculate the proportion of the population that must be immune to prevent an epidemic, and the vaccine coverage needed if the vaccine is ${M.eff}% effective.`, ans: () => `<ul><li>Threshold = 1 − 1/R<sub>0</sub> = 1 − 1/${M.R0}</li><li>= ${(100 * (1 - 1 / M.R0)).toFixed(0)}% immune</li><li>Coverage needed = ${(100 * (1 - 1 / M.R0)).toFixed(0)} ÷ ${M.eff / 100} = ${(100 * (1 - 1 / M.R0) / (M.eff / 100)).toFixed(0)}%${(1 - 1 / M.R0) / (M.eff / 100) > 1 ? " (more than everyone: this vaccine alone cannot give herd immunity)" : ""}</li></ul>` },
      { lvl: "adv", marks: 4, q: "Compare active and passive immunity, giving one natural and one artificial example of each.", ans: "<ul><li>Active: the body makes its own antibodies and memory cells; slow to develop but long lasting</li><li>Passive: antibodies are supplied from outside; immediate but short lived, with no memory cells</li><li>Active examples: natural = recovering from an infection; artificial = vaccination</li><li>Passive examples: natural = antibodies across the placenta or in breast milk; artificial = injection of antibodies</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why isolating people with symptoms stopped outbreaks of Ebola far more effectively than it stopped COVID-19.", ans: "<ul><li>People with Ebola are infectious only once they have symptoms, so isolating them prevents most transmission</li><li>COVID-19 can be transmitted before symptoms appear</li><li>and by people who never develop symptoms, who are not identified and isolated</li></ul>" },
      { lvl: "adv", marks: 3, q: "Suggest why a disease may spread differently in a real town from the prediction of a model in which everyone mixes equally.", ans: "<ul><li>People have repeated contact with the same small groups (household, class, workplace)</li><li>so the disease spreads quickly within a group but only reaches new groups through the links between them</li><li>and people who share contacts are soon immune, so the number of susceptible contacts falls faster than the population average</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>An individual-based model: every person is followed separately, hour by hour.</p>
<ul><li><b>The town:</b> households of 1 to 5 people. Third and later members are children, who share a class of 25 at school (8 am to 3 pm). Most adults share a workplace of 5 to 65 people (8 am to 5 pm). On about a third of evenings each person visits one of the shops and cafés (5 to 8 pm). Otherwise people are at home.</li>
<li><b>Catching it:</b> each hour, a susceptible person's risk depends on the proportion of the other people in the same place who are infectious, and on the kind of place (crowded venues and classes count for more than a quiet office).</li>
<li><b>The illness:</b> exposed (not yet infectious) for the incubation time, then infectious for the infectious period (each varies by ±40% between people). Symptoms start a set time after becoming infectious. A set share never show symptoms and are half as infectious.</li>
<li><b>Severe cases</b> go to hospital when symptoms start and infect nobody there. A set share of cases die.</li>
<li><b>Vaccine:</b> given before the outbreak. Each vaccinated person is completely protected with probability equal to the efficacy; otherwise the vaccine does nothing for them.</li>
<li><b>R now</b> is measured: the average number of people infected by those who stopped being infectious in the last five days.</li>
<li><b>Dashed curve:</b> the SEIR differential equations with the same R0 and periods, which assume everyone mixes equally.</li></ul>
<h3>Simplifications</h3>
<ul><li>No weekends, holidays, travel in or out of the town, hospital staff, or age differences in illness.</li>
<li>Everyone in a room is equally likely to infect everyone else in it; there is no distance, ventilation or time spent face to face.</li>
<li>Immunity after recovery or successful vaccination is complete and lasts for ever; the disease does not mutate.</li>
<li>People obey the rules perfectly from the moment you set them. Masks simply cut transmission outside the home by 40%.</li>
<li>The disease settings are rough, round-number versions of the real diseases, for comparison only.</li>
<li>The hospital has beds for 0.5% of the town; running out of beds does not change the death rate here, though in reality it would.</li>
<li>Batch runs use 600 to 800 people. In such a small town chance matters more than in a city.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its spec notes, exam practice and worksheets, is still here: <a href="original/epidemics.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The disease");
ctl.disease = K.seg(g, { value: "covid", options: [["covid", "COVID-like"], ["flu", "Flu"], ["measles", "Measles"], ["ebola", "Ebola-like"]], on: v => { set({ disease: v }); } });
ctl.R0 = K.slider(g, { label: "R<sub>0</sub>: people each case infects", min: 0.5, max: 18, step: 0.1, value: M.R0, on: v => { M.R0 = v; theory = seir(M, N, seeds, 300); } });
ctl.lat = K.slider(g, { label: "Incubation (not yet infectious)", min: 1, max: 14, step: 0.5, value: M.lat, unit: "days", on: v => { M.lat = v; } });
ctl.inf = K.slider(g, { label: "Infectious for", min: 2, max: 14, step: 0.5, value: M.inf, unit: "days", on: v => { M.inf = v; } });
const dnote = K.note(g, "");
g = ui.group("Before it starts");
ctl.vacc = K.slider(g, { label: "Vaccinated", min: 0, max: 100, step: 1, value: 0, unit: "%", on: v => { M.vacc = v; restart(); } });
ctl.eff = K.slider(g, { label: "Vaccine efficacy", min: 30, max: 100, step: 5, value: 95, unit: "%", on: v => { M.eff = v; restart(); } });
ctl.seeds = K.slider(g, { label: "First cases", min: 1, max: 30, step: 1, value: seeds, on: v => { seeds = v; restart(); } });
ctl.n = K.slider(g, { label: "People in the town", min: 300, max: 5000, step: 100, value: N, on: v => { N = v; restart(); } });
ctl.mix = K.seg(g, { value: false, options: [[false, "A real town"], [true, "Everyone mixes equally"]], on: v => { mix = v; restart(); } });
let r1 = K.row(g); K.btn(r1, "▶ Start again", () => restart(), "primary");
g = ui.group("Measures (change any time)");
ctl.dist = K.slider(g, { label: "Contacts outside home cut by", min: 0, max: 90, step: 5, value: 0, unit: "%", on: v => { M.dist = v; theory = seir(M, N, seeds, 300); } });
ctl.iso = K.slider(g, { label: "Ill people stay at home", min: 0, max: 100, step: 5, value: 0, unit: "%", on: v => { M.iso = v; } });
ctl.hq = K.toggle(g, { label: "…and so does their household", value: false, on: v => { M.hq = v; } });
ctl.schoolsClosed = K.toggle(g, { label: "Schools closed", value: false, on: v => { M.schoolsClosed = v; } });
ctl.wfh = K.slider(g, { label: "Adults working from home", min: 0, max: 90, step: 5, value: 0, unit: "%", on: v => { M.wfh = v; } });
ctl.masks = K.toggle(g, { label: "Masks outside the home", value: false, on: v => { M.masks = v; theory = seir(M, N, seeds, 300); } });
g = ui.group("Watch");
ctl.speed = K.seg(g, { label: "One day takes", value: dayLen, options: [[5, "5 s"], [2.5, "2.5 s"], [1, "1 s"], [0.4, "0.4 s"]], on: v => dayLen = v });
const read = K.readout(g, [["day", "day"], ["r", "R now"], ["hit", "herd immunity needs"], ["peak", "peak infectious"], ["tot", "infected so far"], ["dead", "deaths"], ["wh", "caught at home"], ["ws", "at school"], ["ww", "at work"], ["wv", "shops and cafés"]]);
function set(o) {
  if (o.disease) { Object.assign(M, DISEASES[o.disease]); ctl.disease.set(o.disease); for (const k of ["R0", "lat", "inf"]) ctl[k].set(M[k]); }
  for (const k of ["vacc", "eff", "dist", "iso", "wfh"]) if (o[k] != null) { M[k] = o[k]; ctl[k].set(o[k]); }
  for (const k of ["hq", "schoolsClosed", "masks"]) if (o[k] != null) { M[k] = o[k]; ctl[k].set(o[k]); }
  if (o.n != null) { N = o.n; ctl.n.set(N); } if (o.seeds != null) { seeds = o.seeds; ctl.seeds.set(seeds); } if (o.mix != null) { mix = o.mix; ctl.mix.set(mix); } if (o.speed != null) { dayLen = o.speed; ctl.speed.set(o.speed); }
  dnote.innerHTML = `${M.name}: symptoms ${M.presym ? M.presym + " days after" : "as soon as"} becoming infectious · ${M.asym}% never show symptoms · ${M.hosp}% need hospital · ${M.cfr}% die`;
  restart();
}

// ---------------- The map ----------------
let places = null, bgDay = null, cell = 14, layout;
const cv = ui.canvas(() => { if (layout && town) layout(); });
layout = function () {
  const W = cv.w, H = cv.h, T = town, np = T.ptype.length; places = { x: new Float32Array(np), y: new Float32Array(np), w: new Float32Array(np), h: new Float32Array(np) };
  const put = (k, x, y, w, h) => { places.x[k] = x; places.y[k] = y; places.w[k] = w; places.h[k] = h; };
  put(MIX, 14, 14, W - 28, H - 28);
  const C = { x: W * 0.26, y: H * 0.2, w: W * 0.48, h: H * 0.6 };                       // the town centre
  const grid = (first, count, x, y, w, h, gap) => { const cols = Math.max(1, Math.round(Math.sqrt(count * w / h))), rows = Math.ceil(count / cols), cw = w / cols, ch = h / rows; for (let k = 0; k < count; k++) put(first + k, x + (k % cols) * cw + gap / 2, y + Math.floor(k / cols) * ch + gap / 2, cw - gap, ch - gap); };
  const nC = T.firstWork - T.firstClass, nW = T.firstVenue - T.firstWork;
  const sch = { x: C.x + 6, y: C.y + 22, w: C.w * 0.3 - 10, h: C.h - 30 }, wk = { x: C.x + C.w * 0.3 + 6, y: C.y + 22, w: C.w * 0.42 - 10, h: C.h - 30 }, vn = { x: C.x + C.w * 0.72 + 6, y: C.y + 22, w: C.w * 0.28 - 12, h: C.h * 0.62 - 26 }, hp = { x: vn.x, y: C.y + C.h * 0.62 + 20, w: vn.w, h: C.h * 0.38 - 28 };
  grid(T.firstClass, nC, sch.x, sch.y, sch.w, sch.h, 3); grid(T.firstWork, nW, wk.x, wk.y, wk.w, wk.h, 4); grid(T.firstVenue, T.nVenues, vn.x, vn.y, vn.w, vn.h, 5); put(HOSP, hp.x, hp.y, hp.w, hp.h);
  // houses fill the rest of the map in a grid, leaving streets; shrink the houses until they all fit
  let slots = []; for (cell = 26; cell >= 7; cell -= 0.5) { slots = []; for (let y = 10, r = 0; y + cell < H - 6; y += cell, r++) { if (r % 5 === 4) { y += cell * 0.45 - cell; continue; } for (let x = 10, q = 0; x + cell < W - 6; x += cell, q++) { if (q % 6 === 5) { x += cell * 0.45 - cell; continue; } if (x + cell > C.x - 8 && x < C.x + C.w + 8 && y + cell > C.y - 8 && y < C.y + C.h + 8) continue; slots.push([x, y]); } } if (slots.length >= T.nHomes) break; }
  const rr = K.rng(5); for (let k = slots.length - 1; k > 0; k--) { const j = Math.floor(rr() * (k + 1));[slots[k], slots[j]] = [slots[j], slots[k]]; }
  for (let k = 0; k < T.nHomes; k++) { const s = slots[k % slots.length]; put(HOME + k, s[0] + 1, s[1] + 1, cell - 3, cell - 3); }
  // paint the town once
  bgDay = document.createElement("canvas"); bgDay.width = W * cv.dpr; bgDay.height = H * cv.dpr; const c = bgDay.getContext("2d"); c.scale(cv.dpr, cv.dpr);
  c.fillStyle = "#0b1320"; c.fillRect(0, 0, W, H);
  const box = (R, fill, label) => { c.fillStyle = fill; c.strokeStyle = "rgba(160,180,220,.28)"; c.lineWidth = 1; c.beginPath(); c.roundRect(R.x - 4, R.y - 18, R.w + 8, R.h + 22, 7); c.fill(); c.stroke(); c.fillStyle = "rgba(200,214,240,.8)"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(label, R.x, R.y - 6); };
  if (!T.mix) {
    box(sch, "#14233a", "SCHOOL"); box(wk, "#1a2030", "WORKPLACES"); box(vn, "#231c30", "SHOPS, CAFÉS"); box(hp, "#2a1820", "HOSPITAL");
    for (let k = 2; k < np; k++) { const ty = T.ptype[k]; c.fillStyle = ty === HOME ? "#18243a" : ty === CLASS ? "#1d3352" : ty === WORK ? "#262f45" : "#34284a"; c.strokeStyle = ty === HOME ? "rgba(140,165,210,.22)" : "rgba(170,190,230,.3)"; c.beginPath(); c.roundRect(places.x[k], places.y[k], places.w[k], places.h[k], ty === HOME ? 2 : 4); c.fill(); c.stroke(); }
    c.fillStyle = "#e0566a"; c.fillRect(hp.x + hp.w - 20, hp.y - 14, 10, 3.4); c.fillRect(hp.x + hp.w - 16.7, hp.y - 17.3, 3.4, 10);
  } else { c.strokeStyle = "rgba(160,180,220,.25)"; c.setLineDash([6, 6]); c.strokeRect(10, 10, W - 20, H - 20); c.setLineDash([]); box(hp, "#2a1820", "HOSPITAL"); c.fillStyle = "rgba(200,214,240,.55)"; c.font = "12px Segoe UI,sans-serif"; c.fillText("Everyone mixes equally with everyone else: no homes, classes or workplaces", 22, 30); }
  pos.cur.fill(-2);
};
const COL = ["#8fa6c8", "#ffd166", "#ff4d5e", "#55c98a", "#555", "#4cc9f0"];
const glow = (() => { const s = document.createElement("canvas"); s.width = s.height = 32; const c = s.getContext("2d"), gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,90,100,.75)"); gr.addColorStop(1, "rgba(255,60,80,0)"); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); return s; })();
function target(i, g, out) {   // where to draw person i when they are in place g
  if (g === MIX) { const k = Math.floor(tNow / 4); out[0] = 20 + h01(i, k, 3) * (cv.w - 40); out[1] = 20 + h01(i, k, 4) * (cv.h - 40); return; }
  const w = places.w[g], h = places.h[g], m = Math.min(3, w * 0.2); out[0] = places.x[g] + m + town.ox[i] * (w - 2 * m); out[1] = places.y[g] + m + town.oy[i] * (h - 2 * m);
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, T = town, n = T.n, hour = tNow % 24, tmp = [0, 0];
  c.drawImage(bgDay, 0, 0, w, h);
  const night = T.mix ? 0 : K.clamp(hour < 6 ? 1 : hour < 8 ? (8 - hour) / 2 : hour < 19 ? 0 : hour < 21 ? (hour - 19) / 2 : 1, 0, 1);
  if (night > 0) { c.fillStyle = `rgba(3,6,16,${0.42 * night})`; c.fillRect(0, 0, w, h); c.fillStyle = `rgba(255,214,130,${0.5 * night})`; const s = Math.max(1.5, cell * 0.16); for (let k = HOME; k < HOME + T.nHomes; k++) if (k % 5 !== 0) c.fillRect(places.x[k] + places.w[k] - s - 1.5, places.y[k] + 1.5, s, s); }   // lit windows
  // move each person towards where they should be; journeys take about an hour and a half of town time
  const rad = K.clamp(cell * 0.13, 1.3, 2.6), mixKey = Math.floor(tNow / 4);
  for (let i = 0; i < n; i++) {
    const g = T.loc[i], key = g === MIX ? -10 - mixKey : g; if (g < 0) continue;
    if (pos.cur[i] !== key) { target(i, g, tmp); if (pos.cur[i] === -2) { pos.x[i] = tmp[0]; pos.y[i] = tmp[1]; } pos.fx[i] = pos.x[i]; pos.fy[i] = pos.y[i]; pos.tx[i] = tmp[0]; pos.ty[i] = tmp[1]; pos.t0[i] = tNow + (g === MIX ? 0 : h01(i, 7, 5) * 0.5); pos.cur[i] = key; }
    let f = (tNow - pos.t0[i]) / (g === MIX ? 4 : 1.5); f = f < 0 ? 0 : f > 1 ? 1 : f; f = f * f * (3 - 2 * f); pos.x[i] = pos.fx[i] + (pos.tx[i] - pos.fx[i]) * f; pos.y[i] = pos.fy[i] + (pos.ty[i] - pos.fy[i]) * f;
  }
  c.globalCompositeOperation = "lighter"; for (let i = 0; i < n; i++) if (T.st[i] === I && T.loc[i] !== HOSP) c.drawImage(glow, pos.x[i] - rad * 4, pos.y[i] - rad * 4, rad * 8, rad * 8); c.globalCompositeOperation = "source-over";
  for (const s of [S, REC, VAC, E, I]) { c.fillStyle = COL[s]; c.beginPath(); const r2 = s === I || s === E ? rad * 1.25 : rad; for (let i = 0; i < n; i++) if (T.st[i] === s && T.loc[i] >= 0) { c.moveTo(pos.x[i] + r2, pos.y[i]); c.arc(pos.x[i], pos.y[i], r2, 0, 6.3); } c.fill(); }
  // a ring where someone has just been infected
  for (const i of T.events) flashes.push([i, 1]); T.events.length = 0;
  c.lineWidth = 1.5; for (let k = flashes.length - 1; k >= 0; k--) { const q = flashes[k]; c.strokeStyle = `rgba(255,220,120,${q[1]})`; c.beginPath(); c.arc(pos.x[q[0]], pos.y[q[0]], 3 + (1 - q[1]) * 16, 0, 6.3); c.stroke(); q[1] -= 0.04; if (q[1] <= 0) flashes.splice(k, 1); }
  // key
  c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; let kx = 14; const ky = h - 13; c.fillStyle = "rgba(6,10,20,.78)"; c.fillRect(6, h - 25, 520, 22);
  for (const [s, name] of [[S, "susceptible"], [E, "exposed"], [I, "infectious"], [REC, "recovered"], [VAC, "protected by vaccine"]]) { c.fillStyle = COL[s]; c.beginPath(); c.arc(kx + 4, ky, 4, 0, 6.3); c.fill(); c.fillStyle = "#cfd8ea"; c.fillText(name, kx + 12, ky); kx += c.measureText(name).width + 28; }
  c.textBaseline = "alphabetic";
}
const chS = K.chart(ui.dock, { title: "", xLabel: "day", yLabel: "% of the town", yMin: 0 });
const chN = K.chart(ui.dock, { title: "New infections each day", xLabel: "day", yLabel: "people", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  tNow += dt * 24 / dayLen; let guard = 0;
  while (town.t < Math.floor(tNow) && guard++ < 30) town.tick();
  if (town.t < Math.floor(tNow) - 1) tNow = town.t;
  if (town.t > 72 && town.t % 24 === 0 && town.over() && !town.done) { town.done = true; ui.tip(`The outbreak is over after ${Math.round(town.t / 24)} days: ${(100 * town.cum / town.n).toFixed(0)}% of the town was infected`, 9000); }
}, () => {
  draw(); if (frame++ % 6) return;
  const T = town, n = T.n, c = T.counts(), days = Math.max(40, T.t / 24 + 5), P = k => T.log.map(q => [q[0], 100 * q[1][k] / n]), beds = 0.5;
  chS.draw([{ pts: P(S), color: COL[S], label: "susceptible" }, { pts: P(E), color: COL[E], label: "exposed" }, { pts: P(I), color: COL[I], label: "infectious", width: 2.4 }, { pts: P(REC), color: COL[REC], label: "recovered" }, { pts: T.log.map(q => [q[0], 100 * q[1][6] / n]), color: "#c58cff", label: "in hospital" },
  { pts: theory.filter(q => q[0] <= days).map(q => [q[0], 100 * q[3]]), color: COL[I], dash: [5, 4], width: 1.2, label: "equations" }], { xMin: 0, xMax: days, hlines: M.hosp >= 3 ? [{ y: beds, label: "hospital beds", color: "#c58cff" }] : [] });
  chN.draw([{ pts: T.daily, type: "bars", w: 0.8, color: K.cssVar("--s1") }], { xMin: 0, xMax: days });
  const r = T.rNow(), hit = M.R0 > 1 ? 100 * (1 - 1 / M.R0) : 0, wsum = T.where[HOME] + T.where[CLASS] + T.where[WORK] + T.where[VENUE] + T.where[MIX] || 1, pc = k => (100 * T.where[k] / wsum).toFixed(0) + "%";
  read.set("day", Math.floor(T.t / 24)); read.set("r", r == null ? "–" : r.toFixed(2)); read.set("hit", hit.toFixed(0) + "% immune"); read.set("peak", T.peak + " (day " + T.peakDay + ")"); read.set("tot", T.cum + " (" + (100 * T.cum / n).toFixed(0) + "%)"); read.set("dead", c[DEAD]);
  read.set("wh", T.mix ? "–" : pc(HOME)); read.set("ws", T.mix ? "–" : pc(CLASS)); read.set("ww", T.mix ? "–" : pc(WORK)); read.set("wv", T.mix ? "–" : pc(VENUE));
  const hh = Math.floor(tNow % 24); ui.hud(`<b style="font-size:15px">Day ${Math.floor(tNow / 24) + 1}</b> · ${String(hh).padStart(2, "0")}:00<br><span style="color:${COL[I]}">${c[I]} infectious</span> · <span style="color:${COL[E]}">${c[E]} exposed</span><br>R now: ${r == null ? "–" : r.toFixed(2)}${c[DEAD] ? " · " + c[DEAD] + " died" : ""}`);
});
set({ disease: "covid" });
ui.tip("Each dot is a person · red can pass the disease on to people in the same room", 8000);
