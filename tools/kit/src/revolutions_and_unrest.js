/* =====================================================================
   REVOLUTIONS AND UNREST
   Why do regimes that look secure collapse suddenly, and why does
   unrest come in bursts? Two models from social science.

   a. CROWD THRESHOLDS (Mark Granovetter, 1978). Each person in a crowd
      has a THRESHOLD: the number of others who must already be rioting
      before they will join. A few people with threshold 0 start; anyone
      whose threshold is at or below the crowd size joins; repeat. The
      crowd stops growing where the number of people with thresholds
      ≤ n equals n. Two crowds with almost the same average mood can end
      completely differently: the outcome depends on the whole chain of
      thresholds, not the average.

   b. REBELLION (Joshua Epstein, 2002). People on a grid, and police.
      Each person has a HARDSHIP H (0–1) and a RISK AVERSION R.
         GRIEVANCE      G = H × (1 − L)       L = the regime's LEGITIMACY
         ARREST RISK    P = 1 − exp(−2.3 × ⌊police ÷ rebels nearby⌋)
         A person rebels openly if  G − R × P > 0.1
      Police arrest a rebel they can see; prisoners are jailed for a
      random time. Because people only see their neighbourhood, unrest
      can spread in a sudden burst when a patch of police is missing
      or legitimacy dips. Used here for Russia, 1905 and 1917.
   ===================================================================== */
const clamp = K.clamp;
// ---------------- a. Granovetter's threshold model ----------------
// The normal distribution's cumulative chance Φ(z) (Abramowitz and Stegun's approximation, accurate to about 1 in 10⁷)
function Phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
// thresholds for N people: rounded normal (mean, sd), never below 0; 'inst' people are instigators with threshold 0
function drawThresholds(N, mean, sd, inst, r) { const t = []; for (let i = 0; i < N; i++) t.push(i < inst ? 0 : Math.max(0, Math.round(mean + sd * r.gauss()))); return t; }
// run the crowd: n(next) = number with threshold ≤ n(now), until it stops changing
function crowdSteps(th) { const steps = [0]; let n = 0; for (;;) { const m = th.filter(x => x <= n).length; if (m === n) break; n = m; steps.push(n); } return steps; }
// theory: a very large crowd with the same distribution. Fixed point of n = inst + (N − inst) × P(threshold ≤ n), starting from 0
function crowdTheory(N, mean, sd, inst) { let n = 0; for (let i = 0; i < 500; i++) { const m = inst + (N - inst) * (sd > 0 ? Phi((Math.floor(n) + 0.5 - mean) / sd) : (Math.floor(n) >= mean ? 1 : 0)); if (Math.abs(m - n) < 1e-6) break; n = m; } return n; }

// ---------------- b. Epstein's civil violence model ----------------
const KARREST = 2.3, TH = 0.1;
class Rebellion {
  constructor(o, r) {
    this.o = Object.assign({ size: 40, cit: 0.7, cops: 0.04, vision: 6, L: 0.82, jail: 30, hard: 1, move: true }, o); this.r = r;
    const S = this.o.size, n = S * S; this.cell = new Int32Array(n).fill(-1); this.agents = []; this.t = 0; this.log = []; this.peak = 0;
    const order = []; for (let i = 0; i < n; i++) order.push(i); for (let i = n - 1; i > 0; i--) { const j = r.int(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    const nc = Math.round(n * this.o.cops), np = Math.round(n * this.o.cit); let k = 0;
    for (let i = 0; i < nc; i++) this.add({ cop: true }, order[k++]);
    for (let i = 0; i < np; i++) this.add({ cop: false, H: r(), R: r(), active: false, jail: 0 }, order[k++]);
    // every place's neighbours within sight, worked out once (the grid wraps round at the edges)
    const offs = [], v = this.o.vision; for (let dy = -v; dy <= v; dy++) for (let dx = -v; dx <= v; dx++) if ((dx || dy) && dx * dx + dy * dy <= v * v) offs.push([dx, dy]);
    this.m = offs.length; this.nb = new Int32Array(n * this.m); this.tmp = new Int32Array(this.m);
    for (let pos = 0; pos < n; pos++) { const x = pos % S, y = (pos - x) / S; offs.forEach(([dx, dy], k) => this.nb[pos * this.m + k] = ((y + dy + S) % S) * S + (x + dx + S) % S); }
  }
  add(a, pos) { a.id = this.agents.length; a.pos = pos; this.agents.push(a); this.cell[pos] = a.id; }
  around(pos) { return this.nb.subarray(pos * this.m, pos * this.m + this.m); }
  grievance(a) { return Math.min(1, a.H * this.o.hard) * (1 - this.o.L); }
  step() {
    const r = this.r, A = this.agents, ord = A.filter(a => a.cop || a.jail === 0).map(a => a.id);
    for (let i = ord.length - 1; i > 0; i--) { const j = r.int(i + 1); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    for (const id of ord) {
      const a = A[id]; if (!a.cop && a.jail > 0) continue;
      let near = this.around(a.pos);
      // move to a random empty place within sight
      if (this.o.move) { let ne = 0; for (const p of near) if (this.cell[p] < 0) this.tmp[ne++] = p; if (ne) { const p = this.tmp[r.int(ne)]; this.cell[a.pos] = -1; a.pos = p; this.cell[p] = a.id; near = this.around(a.pos); } }
      if (a.cop) {
        // arrest one active rebel in sight, chosen at random
        let nr = 0; for (const p of near) { const q = this.cell[p]; if (q >= 0 && !A[q].cop && A[q].active) this.tmp[nr++] = q; }
        if (nr) { const q = A[this.tmp[r.int(nr)]]; this.cell[a.pos] = -1; a.pos = q.pos; this.cell[a.pos] = a.id; q.active = false; q.jail = 1 + r.int(this.o.jail); q.pos = -1; }
      } else {
        // decide whether to rebel: grievance minus (risk aversion × estimated chance of arrest)
        let c = 0, act = 1; for (const p of near) { const q = this.cell[p]; if (q < 0) continue; if (A[q].cop) c++; else if (A[q].active) act++; }
        const P = 1 - Math.exp(-KARREST * Math.floor(c / act));
        a.active = this.grievance(a) - a.R * P > TH;
      }
    }
    // prisoners serve their time, then return to an empty place
    for (const a of A) if (!a.cop && a.jail > 0) { a.jail--; if (a.jail === 0) { let p; do p = r.int(this.cell.length); while (this.cell[p] >= 0); a.pos = p; this.cell[p] = a.id; } }
    this.t++; const s = this.stats(); this.log.push([this.t, s.active, s.jailed, this.o.L * 100]); if (this.log.length > 600) this.log.shift(); if (s.active > this.peak) this.peak = s.active;
  }
  stats() { let act = 0, jail = 0, n = 0, gr = 0; for (const a of this.agents) if (!a.cop) { n++; if (a.jail > 0) jail++; else if (a.active) act++; gr += this.grievance(a); } return { active: 100 * act / n, jailed: 100 * jail / n, grievance: gr / n, n }; }
  // remove a share of the police (they mutiny and stop arresting people)
  mutiny(f) { const cops = this.agents.filter(a => a.cop && a.pos >= 0); for (const c of cops) if (this.r() < f) { this.cell[c.pos] = -1; c.pos = -1; c.gone = true; } this.agents = this.agents.filter(a => !a.gone); this.agents.forEach((a, i) => { a.id = i; if (a.pos >= 0) this.cell[a.pos] = i; }); }
  addCops(f) { const n = Math.round(this.cell.length * f); for (let i = 0; i < n; i++) { let p, tries = 0; do p = this.r.int(this.cell.length); while (this.cell[p] >= 0 && ++tries < 5000); if (this.cell[p] < 0) this.add({ cop: true }, p); } }
}
// batch helpers
function meanActive(o, r, warm = 50, ticks = 150) { const m = new Rebellion(o, r); let s = 0; for (let i = 0; i < warm + ticks; i++) { m.step(); if (i >= warm) s += m.stats().active; } return s / ticks; }
function legitimacyPath(sudden, r) { const m = new Rebellion({ L: 0.9, size: 34 }, r); for (let i = 0; i < 30; i++) m.step(); let peak = 0; for (let i = 0; i < 170; i++) { m.o.L = sudden ? (i < 1 ? 0.9 : 0.62) : Math.max(0.62, 0.9 - 0.28 * i / 120); m.step(); peak = Math.max(peak, m.stats().active); } return peak; }

// ---------------- The page ----------------
const P = { view: "crowd", N: 100, mean: 22, sd: 10, inst: 2, classic: false, L: 0.82, cops: 0.04, hard: 1, jail: 30, vision: 6, speed: 8 };
let rnd = K.rng(Date.now() % 99991 + 11), crowd = null, cStep = 0, cAcc = 0, reb = null, rAcc = 0;
const ui = K.app({
  title: "Revolutions and Unrest", subject: "History",
  blurb: "Grievance, repression and the tipping point: why regimes fall suddenly (Russia 1905 and 1917)",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "GCSE History: Russia 1894–1924 (discontent, Bloody Sunday and the 1905 revolution, the October Manifesto, the First World War and the February and October revolutions); causes of revolution: long-term grievances and short-term triggers.",
      adv: "OCR A level History A (H505) Y219 Russia 1894–1941: the 1905 revolution, repression and reform under Stolypin, the impact of war, the February Revolution and the collapse of tsarism. AO1 causation (long-term, short-term, triggers; the role of individuals against structures); AO3 interpretations (liberal, Soviet, revisionist 'history from below')."
    }
  },
  missions: [
    { title: "The riot that nearly wasn't", q: "Load Granovetter's classic crowd: 100 people with thresholds 0, 1, 2, … 99. Run it. Then press 'Change one person' (the threshold-1 person becomes a 2). What happens now?", hint: "With thresholds 0, 1, 2, … each new rioter tips the next: all 100 riot. Change one person and the chain breaks at once: only the instigator riots. The two crowds are almost identical, yet newspapers would describe one as 'a mob of radicals' and the other as 'a lone troublemaker'. Small differences in a few people can decide big events.", setup() { set({ view: "crowd", classic: true }); } },
    { title: "Same mood, different outcomes", q: "Crowd thresholds average 22, spread 10. Press 'New crowd' several times. Does the crowd always behave the same way?", hint: "About half the time the riot fizzles at a few people; otherwise almost everyone joins. The average mood is identical: what differs is whether there happen to be enough low-threshold people to carry the chain over the gap. This is why revolutions are so hard to predict, even by the people taking part.", setup() { set({ view: "crowd" }); } },
    { title: "Grievance and legitimacy", q: "Switch to the rebellion model. With legitimacy 0.82, watch the share of open rebels. Is unrest steady, or does it come in bursts?", hint: "It comes in sudden bursts ('punctuated equilibrium'): a local patch with few police tips into open rebellion, it spreads until the police arrest enough people, then quiet returns while prisoners are in jail. The regime looks stable most of the time.", setup() { set({ view: "rebel" }); } },
    { title: "1905: Bloody Sunday", q: "Press 'Bloody Sunday' (legitimacy falls sharply, as when troops fired on Father Gapon's peaceful march, January 1905). Then press 'October Manifesto' and 'Stolypin repression'. Which ends the unrest?", hint: "The loss of legitimacy multiplies everyone's grievance, so a wave of rebellion follows (strikes, mutiny on the Potemkin, peasant risings). Concessions (the October Manifesto: a Duma, civil rights) restore some legitimacy; repression (more police, field courts, 'Stolypin's neckties') raises the risk of arrest. Both reduce open rebellion, but repression does not reduce grievance: it is still there, hidden.", setup() { set({ view: "rebel", L: 0.85 }); } },
    { title: "1917: war and mutiny", q: "Press 'War and shortages' (hardship rises), then 'Garrison mutinies' (most of the police and soldiers stop obeying). What happens? Why did February 1917 succeed when 1905 failed?", hint: "In 1905 the army stayed loyal (once the war with Japan ended) and repressed the revolution. In February 1917 the war had raised hardship everywhere (bread queues, inflation) and destroyed legitimacy (defeats, Rasputin), and the Petrograd garrison mutinied: with no one to arrest them, rebels have nothing to fear and the rebellion becomes general. The Tsar abdicated within days.", setup() { set({ view: "rebel", L: 0.75 }); } },
    { title: "Hidden grievance", lvl: "adv", q: "Set legitimacy low (0.6) but add lots of police. Compare the readings: open rebels, average grievance. Then remove most of the police at once. What does this suggest about regimes that look stable?", hint: "Heavy policing keeps open rebellion near zero while grievance stays high: preference falsification (Timur Kuran). Observers, and the regime itself, cannot see how much opposition there is, so when repression weakens, the explosion is a surprise. This helps explain why 1917 (and 1989 in eastern Europe) shocked contemporaries.", setup() { set({ view: "rebel", L: 0.6, cops: 0.09 }); } },
    { title: "Slow decline or sudden shock?", lvl: "adv", q: "Use the batch run 'Slow decline or sudden shock?': legitimacy falls from 0.9 to 0.62 either at once or gradually. Which gives the bigger burst of rebellion?", hint: "A sudden fall gives a far larger peak: everyone's grievance jumps together, so many people cross the threshold at once and overwhelm the police. A gradual fall lets the police pick off the few who rebel at each stage. Epstein found the same: a regime that loses legitimacy slowly may never face a revolution, one that loses it suddenly (Bloody Sunday, a lost war) is in danger.", setup() { set({ view: "rebel" }); ui.openBatch(); } }
  ],
  batch: [
    { title: "Spread of opinions and the size of the riot", question: "How does the final crowd depend on how varied people's thresholds are?", how: "100 people, thresholds normal with mean 25 and the spread swept; 2 instigators. Each point is the mean of 30 random crowds. Theory: a very large crowd with the same distribution (the fixed point of n = 2 + 98 × P(threshold ≤ n)).", xLabel: "spread of thresholds (SD)", yLabel: "final crowd (people)", xs: [2, 5, 8, 10, 12, 15, 20, 25, 30], reps: 30, yMin: 0, yMax: 102, theory: x => crowdTheory(100, 25, x, 2), theoryLabel: "very large crowd", run: (x, r) => { const s = crowdSteps(drawThresholds(100, 25, x, 2, r)); return s[s.length - 1]; }, note: "With little variety, nobody is near the instigators, so the riot fizzles. With more variety there are enough low-threshold people to build a chain, and the crowd tips. Single crowds scatter widely near the tipping point: the mean hides that each crowd is either small or large." },
    { title: "Same average, different crowds", question: "If thresholds average 22 (SD 10), how big is the final crowd?", how: "300 random crowds of 100 (2 instigators). Theory: the very large crowd with the same distribution.", reps: 300, bins: 25, lo: 0, hi: 100, yLabel: "final crowd (people)", theory: crowdTheory(100, 22, 10, 2), theoryLabel: "very large crowd", run: (x, r) => { const s = crowdSteps(drawThresholds(100, 22, 10, 2, r)); return s[s.length - 1]; }, note: "The histogram has two humps: about half the crowds fizzle and half riot almost completely, and almost none end in between. The mean describes no actual crowd. The theory (an enormous crowd) always tips: in a real crowd of 100, chance gaps in the chain of thresholds stop it half the time. Historians face this: knowing the general mood does not tell you whether a particular day will become a revolution." },
    { title: "Legitimacy and rebellion", question: "How much open rebellion is there, on average, as the regime's legitimacy falls?", how: "Epstein's model (40 × 40, 70% people, 4% police, vision 6). Mean share of people openly rebelling over 150 steps, after 50 to settle.", xLabel: "legitimacy L", yLabel: "openly rebelling (%)", xs: [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6], reps: 3, yMin: 0, run: (x, r) => meanActive({ L: x }, r), note: "At 0.9 and above there is no open rebellion. Below that it rises as more people's grievance outweighs their fear, coming in bursts, so single runs vary. At low legitimacy it levels off near 7% because the police keep arresting rebels: by then a large share of the people are in prison." },
    { title: "Police and rebellion", question: "How does the number of police change the amount of open rebellion when legitimacy is low (0.7)?", how: "Police density from 1% to 10% of places; legitimacy 0.7. Mean share openly rebelling over 150 steps.", xLabel: "police (% of places)", yLabel: "openly rebelling (%)", xs: [1, 2, 3, 4, 6, 8, 10], reps: 3, yMin: 0, run: (x, r) => meanActive({ L: 0.7, cops: x / 100 }, r), note: "More police raise everyone's estimated risk of arrest, so fewer rebel openly. But grievance is unchanged: the opposition is hidden, not removed (see the investigation 'Hidden grievance')." },
    { title: "Slow decline or sudden shock?", lvl: "adv", question: "Does a sudden fall in legitimacy cause a bigger burst of rebellion than a gradual fall to the same level?", how: "Legitimacy falls from 0.9 to 0.62, either at once (1) or steadily over 120 steps (0). Peak share openly rebelling. 34 × 34 grid.", xLabel: "sudden (1) or gradual (0)", yLabel: "peak openly rebelling (%)", xs: [0, 1], reps: 8, yMin: 0, run: (x, r) => legitimacyPath(!!x, r), note: "The sudden shock gives a much larger peak: many people cross the threshold at the same moment and the police cannot arrest them fast enough. The gradual fall reaches the same final legitimacy with a smaller peak." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Causation", text: "Long-term causes (peasant poverty, industrial workers' conditions, autocracy with no say for the people) build grievance; short-term causes (defeat by Japan 1904–05; the First World War) add hardship and cut legitimacy; triggers (Bloody Sunday, January 1905; bread queues and strikes, February 1917) set it off." },
      { lvl: "std", tag: "1905", text: "The 1905 revolution was survived because the regime made concessions (the October Manifesto, a Duma), the army stayed loyal once peace was made with Japan, and opponents were divided. Then repression: Stolypin's field courts." },
      { lvl: "std", tag: "1917", text: "February 1917 succeeded because the war had raised hardship and destroyed the Tsar's legitimacy (defeats, the Tsar at the front, Rasputin), and the Petrograd garrison joined the protesters: no force was left to repress them." },
      { lvl: "std", tag: "Using models", text: "A threshold model explains sudden change: people join when enough others have. Small differences can tip a crowd one way or the other, so revolutions are hard to predict." },
      { lvl: "adv", tag: "Y219", text: "Repression and reform: Okhrana, exile, Stolypin's 'wager on the strong' (land reform) and his 'neckties'. The Fundamental Laws (1906) kept autocracy. Historians debate whether tsarism was reforming successfully before 1914 (optimists) or doomed (pessimists)." },
      { lvl: "adv", tag: "AO3", text: "Liberal historians (e.g. Pipes): 1917 was the work of a determined minority and the war. Soviet historians: the inevitable product of class conflict, led by the Bolsheviks. Revisionists ('history from below', e.g. Figes, Smith, Fitzpatrick): popular grievance and self-organisation of workers, soldiers and peasants." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Epstein's model: grievance G = H(1 − L); rebel if G − R·P > T, with P = 1 − e^(−2.3 ⌊C/A⌋). Kuran's 'preference falsification': under repression, people hide their views, so revolutions surprise everyone." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain why the Tsar survived the 1905 revolution.", ans: "<ul><li>the October Manifesto divided the opposition (liberals accepted it)</li><li>the army stayed loyal and crushed the Moscow rising and the soviets</li><li>peace with Japan (Treaty of Portsmouth) freed troops</li><li>repression afterwards (Stolypin's field courts)</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const s = reb ? reb.stats() : null; return `In the simulation, legitimacy is ${P.L.toFixed(2)} and ${s ? s.active.toFixed(0) : "–"}% of people are openly rebelling. Explain why raising legitimacy would reduce the rebellion.`; }, ans: "<ul><li>grievance = hardship × (1 − legitimacy)</li><li>higher legitimacy lowers everyone's grievance</li><li>so fewer people have a grievance that outweighs their fear of arrest</li></ul>" },
      { lvl: "std", marks: 2, q: "In a crowd of 100 with thresholds 0, 1, 2, … 99, everyone riots. Explain why changing one person's threshold from 1 to 2 stops the riot.", ans: "<ul><li>after the instigator (threshold 0) joins, only 1 is rioting</li><li>nobody now has threshold 1, so nobody else joins: the chain is broken</li></ul>" },
      { lvl: "adv", marks: 12, q: "'The First World War was the main reason for the collapse of tsarism in February 1917.' How far do you agree?", ans: "<ul><li>war: defeats, casualties, inflation and food shortages raised hardship; the Tsar at the front took personal blame; Rasputin and the Tsarina discredited the regime (legitimacy)</li><li>long-term: autocracy's refusal to share power; peasant and worker grievances; the failure of the Dumas</li><li>the decisive short-term factor: the Petrograd garrison's mutiny (no repression possible), and the generals and Duma leaders who advised abdication</li><li>the model: hardship and legitimacy build grievance; loss of repressive force turns hidden grievance into open revolution</li><li>judgement: war as the catalyst acting on long-term weaknesses</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how a model of preference falsification helps explain why the February Revolution surprised contemporaries, including Lenin.", ans: "<ul><li>under repression people hide their opposition, so open protest underestimates grievance</li><li>neither the regime nor the revolutionaries can see how close to the threshold people are</li><li>when a few join (e.g. women's bread march, 23 February), others follow in a cascade</li><li>Lenin in January 1917 said he might not live to see the revolution</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p><b>Crowd thresholds.</b> 100 people, each with a threshold (how many must already riot before they join). Thresholds are drawn from a normal distribution with the chosen mean and spread (rounded, never below 0), plus a number of instigators with threshold 0. Each step, everyone whose threshold is at or below the current crowd joins. The theory line is the same rule for a very large crowd.</p>
<p><b>Rebellion.</b> Joshua Epstein's 'civil violence' model (2002), as in the NetLogo Rebellion model: a 40 × 40 grid that wraps round at the edges. People have hardship and risk aversion drawn at random between 0 and 1. Grievance = hardship × (1 − legitimacy); a person rebels openly if grievance − risk aversion × estimated arrest risk > 0.1. Arrest risk depends on the police and open rebels within sight (radius 6). Each police officer arrests one rebel in sight; prisoners serve a random 1–30 steps. Everyone moves to a random empty place in sight each step.</p>
<p>The Russian events are buttons: <b>Bloody Sunday</b> (legitimacy − 0.15), <b>October Manifesto</b> (+ 0.1), <b>Stolypin repression</b> (twice the police), <b>war and shortages</b> (hardship × 1.4), <b>garrison mutinies</b> (80% of police vanish).</p>
<h3>Assumptions and simplifications</h3>
<ul><li>Everyone is alike apart from two random numbers. There are no classes, nationalities, parties or leaders (no Lenin, no Kerensky): the model cannot show the role of individuals or ideas, only of conditions.</li>
<li>Rebellion is one thing. Real unrest ranged from strikes and petitions to mutiny and land seizures; the October Revolution was a planned seizure of power by one party, not a crowd cascade.</li>
<li>Legitimacy is one number shared by everyone. In reality it differed between peasants, workers, soldiers and the educated classes, and changed with news and rumour.</li>
<li>Police obey perfectly until they 'mutiny'; prisons never fill; nobody is killed.</li>
<li>The numbers (thresholds, 0.1, 2.3, the event sizes) are illustrative, not measured. The model shows a mechanism; it is not evidence about Russia.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}, groups = {};
let g = ui.group("What to show");
ctl.view = K.seg(g, { value: "crowd", options: [["crowd", "👥 Crowd thresholds"], ["rebel", "✊ Rebellion: Russia"]], on: v => { P.view = v; showGroups(); } });
g = groups.crowd = ui.group("Granovetter's crowd (100 people)");
ctl.mean = K.slider(g, { label: "Average threshold", min: 0, max: 60, step: 1, value: P.mean, fmt: v => v + " people", on: v => { P.mean = v; P.classic = false; newCrowd(); } });
ctl.sd = K.slider(g, { label: "Spread of thresholds (SD)", min: 0, max: 30, step: 1, value: P.sd, fmt: v => v + " people", on: v => { P.sd = v; P.classic = false; newCrowd(); } });
ctl.inst = K.slider(g, { label: "Instigators (threshold 0)", min: 0, max: 10, step: 1, value: P.inst, on: v => { P.inst = v; P.classic = false; newCrowd(); } });
let row = K.row(g); K.btn(row, "🎲 New crowd", () => newCrowd(), "primary"); K.btn(row, "▶ Run again", () => { cStep = 0; cAcc = 0; });
row = K.row(g); K.btn(row, "Classic: 0, 1, 2 … 99", () => { P.classic = true; newCrowd(); }); K.btn(row, "Change one person", () => { if (crowd) { const i = crowd.th.indexOf(1); if (i >= 0) crowd.th[i] = 2; crowd.steps = crowdSteps(crowd.th); cStep = 0; cAcc = 0; ui.tip(i >= 0 ? "The person with threshold 1 now has threshold 2." : "Nobody has threshold 1."); } });
g = groups.rebel = ui.group("Rebellion: Epstein's model");
ctl.L = K.slider(g, { label: "Legitimacy of the regime", min: 0.3, max: 1, step: 0.01, value: P.L, fmt: v => v.toFixed(2), on: v => { P.L = v; reb.o.L = v; } });
ctl.hard = K.slider(g, { label: "Hardship (× normal)", min: 0.5, max: 1.6, step: 0.05, value: 1, fmt: v => v.toFixed(2) + " ×", on: v => { P.hard = v; reb.o.hard = v; } });
ctl.cops = K.slider(g, { label: "Police (share of places)", min: 0, max: 0.12, step: 0.005, value: P.cops, fmt: v => (v * 100).toFixed(1) + "%", tip: "Changes restart the grid", on: v => { P.cops = v; newReb(); } });
ctl.jail = K.slider(g, { label: "Longest prison term", min: 1, max: 80, step: 1, value: P.jail, fmt: v => v + " steps", on: v => { P.jail = v; reb.o.jail = v; } });
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 20, step: 1, value: P.speed, fmt: v => v + " steps a second", on: v => P.speed = v });
g.append(K.$("div", "", "<b style='font-size:12px;color:var(--muted)'>RUSSIA: EVENTS</b>"));
row = K.row(g);
K.btn(row, "Bloody Sunday (1905)", () => { setL(P.L - 0.15); ui.tip("January 1905: troops fire on a peaceful march. Legitimacy falls."); });
K.btn(row, "October Manifesto", () => { setL(P.L + 0.1); ui.tip("October 1905: a Duma and civil rights promised. Legitimacy rises."); });
K.btn(row, "Stolypin repression", () => { reb.addCops(P.cops); ui.tip("1906–07: field courts and more police. Twice the police."); });
row = K.row(g);
K.btn(row, "War and shortages (1916)", () => { ctl.hard.set(Math.min(1.6, P.hard * 1.4), true); ui.tip("War: inflation, bread queues, casualties. Hardship × 1.4."); });
K.btn(row, "Garrison mutinies (Feb 1917)", () => { reb.mutiny(0.8); ui.tip("February 1917: the Petrograd garrison joins the crowds. 80% of police gone."); });
K.btn(K.row(g), "↺ Restart the grid", () => newReb(), "primary");
g = ui.group("Readings");
const read = K.readout(g, [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
function setL(v) { ctl.L.set(clamp(v, 0.3, 1), true); }
function showGroups() { groups.crowd.style.display = P.view === "crowd" ? "" : "none"; groups.rebel.style.display = P.view === "rebel" ? "" : "none"; const lab = P.view === "crowd" ? ["crowd now", "final crowd", "theory (large crowd)", "people in the crowd"] : ["openly rebelling", "in prison", "average grievance", "peak rebellion"]; [...read.el.children].forEach((d, i) => d.firstChild.textContent = lab[i]); }
function newCrowd() { const th = P.classic ? Array.from({ length: 100 }, (_, i) => i) : drawThresholds(100, P.mean, P.sd, P.inst, rnd); crowd = { th, steps: crowdSteps(th) }; cStep = 0; cAcc = 0; }
function newReb() { reb = new Rebellion({ L: P.L, cops: P.cops, hard: P.hard, jail: P.jail, vision: P.vision }, rnd); }
function set(o) {
  Object.assign(P, { view: "crowd", mean: 22, sd: 10, inst: 2, classic: false, L: 0.82, cops: 0.04, hard: 1, jail: 30, speed: 8 }, o);
  ctl.view.set(P.view); ctl.mean.set(P.mean); ctl.sd.set(P.sd); ctl.inst.set(P.inst); ctl.L.set(P.L); ctl.hard.set(P.hard); ctl.cops.set(P.cops); ctl.jail.set(P.jail); ctl.speed.set(P.speed);
  newCrowd(); newReb(); showGroups();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "", xLabel: "", yMin: 0 });
const chB = K.chart(ui.dock, { title: "", xLabel: "", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif";
function drawCrowd(c, w, h) {
  const n = crowd.steps[Math.min(cStep, crowd.steps.length - 1)], order = crowd.th.map((t, i) => [t, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const size = Math.min((w - 80) / 10, (h - 90) / 10), x0 = (w - size * 10) / 2, y0 = 60;
  c.font = "600 15px " + FONT; c.fillStyle = "#eef2f8"; c.textAlign = "left"; c.fillText(`Step ${Math.min(cStep, crowd.steps.length - 1)}: ${n} rioting`, 24, 32);
  c.font = "12px " + FONT; c.fillStyle = "#aab6cc"; c.fillText("Each person shows their threshold: they join once at least that many are rioting. Sorted from lowest to highest.", 24, 50);
  order.forEach(([t, i], k) => {
    const x = x0 + (k % 10) * size, y = y0 + Math.floor(k / 10) * size, on = k < n, next = !on && t <= n;
    c.fillStyle = on ? "#ff5d6c" : next ? "#ffb347" : "#243049"; c.beginPath(); c.arc(x + size / 2, y + size / 2, size * 0.38, 0, 6.3); c.fill();
    c.fillStyle = on ? "#0b1020" : "#dfe6f3"; c.font = `600 ${Math.max(10, size * 0.3)}px ${FONT}`; c.textAlign = "center"; c.fillText(t, x + size / 2, y + size / 2 + size * 0.11);
  });
}
function drawRebel(c, w, h) {
  const S = reb.o.size, cs = Math.floor(Math.min((h - 20) / S, (w - 300) / S)), gx = 16, gy = (h - cs * S) / 2;
  c.fillStyle = "#0e1424"; c.fillRect(gx, gy, cs * S, cs * S);
  for (const a of reb.agents) {
    if (a.pos < 0) continue; const x = gx + (a.pos % S) * cs, y = gy + Math.floor(a.pos / S) * cs;
    if (a.cop) { c.fillStyle = "#5ab0ff"; c.fillRect(x + 1, y + 1, cs - 2, cs - 2); continue; }
    if (a.active) c.fillStyle = "#ff3b4e"; else { const gv = reb.grievance(a); c.fillStyle = `hsl(${45 - 30 * gv}, ${30 + 50 * gv}%, ${22 + 30 * gv}%)`; }
    c.beginPath(); c.arc(x + cs / 2, y + cs / 2, cs * 0.42, 0, 6.3); c.fill();
  }
  // key and prison
  const kx = gx + cs * S + 24; let ky = gy + 10; c.font = "13px " + FONT; c.textAlign = "left";
  for (const [col, t] of [["#ff3b4e", "openly rebelling"], ["hsl(30,70%,45%)", "quiet, high grievance"], ["hsl(45,30%,25%)", "quiet, low grievance"], ["#5ab0ff", "police"]]) { c.fillStyle = col; c.beginPath(); c.arc(kx + 7, ky, 7, 0, 6.3); c.fill(); c.fillStyle = "#dfe6f3"; c.fillText(t, kx + 22, ky + 4); ky += 24; }
  const s = reb.stats(), jailed = Math.round(s.jailed * s.n / 100);
  ky += 10; c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText(`Prison: ${jailed} people`, kx, ky); ky += 10;
  const per = Math.floor((w - kx - 20) / 9); for (let i = 0; i < Math.min(jailed, per * 18); i++) { c.fillStyle = "#7d8aa5"; c.fillRect(kx + (i % per) * 9, ky + Math.floor(i / per) * 9, 7, 7); }
  c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.fillText(`step ${reb.t} · legitimacy ${reb.o.L.toFixed(2)} · hardship × ${reb.o.hard.toFixed(2)}`, kx, h - 20);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.view === "crowd") { cAcc += dt * 1.5; while (cAcc >= 1) { cAcc--; if (cStep < crowd.steps.length - 1) cStep++; } }
  else { rAcc += dt * P.speed; let k = 0; while (rAcc >= 1 && k++ < 4) { rAcc--; reb.step(); } }
}, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "crowd") drawCrowd(c, w, h); else drawRebel(c, w, h);
  if (frame++ % 4) return;
  if (P.view === "crowd") {
    // the cobweb: number with threshold ≤ n against n; the crowd grows while the curve is above the diagonal
    const cum = [], N = crowd.th.length; for (let n = 0; n <= N; n++) cum.push([n, crowd.th.filter(t => t <= n).length]);
    const st = crowd.steps.slice(0, cStep + 1), web = []; st.forEach((n, i) => { web.push([n, n]); if (i + 1 < st.length) web.push([n, st[i + 1]]); });
    chA.opts.title = "Who would join, for each crowd size"; chA.opts.xLabel = "people rioting now"; chA.opts.yLabel = "";
    chA.draw([{ pts: [[0, 0], [N, N]], color: "#7d8aa5", dash: [4, 4], label: "crowd = next crowd" }, { pts: cum, color: "#ffd166", label: "thresholds ≤ crowd" }, { pts: web, color: "#ff5d6c", label: "the riot" }], { xMin: 0, xMax: N, yMin: 0, yMax: N });
    const hist = K.histogram(crowd.th, 20, 0, 100);
    chB.opts.title = "Thresholds in this crowd"; chB.opts.xLabel = "threshold (people)";
    chB.draw([{ pts: hist.pts, w: hist.w, type: "bars", color: "#5ab0ff", alpha: 0.8 }], { xMin: 0, xMax: 100, yMin: 0 });
    const fin = crowd.steps[crowd.steps.length - 1];
    read.set("a", crowd.steps[Math.min(cStep, crowd.steps.length - 1)]); read.set("b", cStep >= crowd.steps.length - 1 ? fin : "…"); read.set("c", P.classic ? "–" : crowdTheory(100, P.mean, P.sd, P.inst).toFixed(0)); read.set("d", 100);
  } else {
    const s = reb.stats();
    chA.opts.title = "Openly rebelling and in prison (% of people)"; chA.opts.xLabel = "step";
    chA.draw([{ pts: reb.log.map(q => [q[0], q[1]]), color: "#ff3b4e", label: "rebelling" }, { pts: reb.log.map(q => [q[0], q[2]]), color: "#7d8aa5", label: "in prison" }], { yMin: 0 });
    chB.opts.title = "Legitimacy of the regime"; chB.opts.xLabel = "step";
    chB.draw([{ pts: reb.log.map(q => [q[0], q[3] / 100]), color: "#ffd166", label: "legitimacy" }], { yMin: 0, yMax: 1 });
    read.set("a", s.active.toFixed(1) + "%"); read.set("b", s.jailed.toFixed(1) + "%"); read.set("c", s.grievance.toFixed(2)); read.set("d", reb.peak.toFixed(1) + "%");
  }
});
set({});
ui.tip("Red circles are rioting. Each number is how many others a person needs to see first.", 7000);
