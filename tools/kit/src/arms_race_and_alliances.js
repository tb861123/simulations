/* =====================================================================
   ARMS RACES AND ALLIANCES
   Two models of how great powers slide towards war.

   a. RICHARDSON'S ARMS RACE. Lewis Fry Richardson, a Quaker
      meteorologist who drove an ambulance in the First World War,
      described two rivals' arms (x and y) with two equations:
            change in x each year = k·y − a·x + g
            change in y each year = l·x − b·y + h
      k, l  REACTION: how strongly each side responds to the other's arms
      a, b  FATIGUE: the cost of arms, which holds each side back
      g, h  GRIEVANCE or AMBITION: arms built whatever the rival does
      If a·b > k·l, fatigue wins: both sides level off at a steady
      balance. If k·l > a·b, each side's fear of the other wins: the
      race runs away. Used here for the Anglo-German naval race
      (dreadnought-type ships, 1906–1914) and the Soviet–American
      nuclear arms race (thousands of warheads, 1945–1991).

   b. THE JULY CRISIS, 1914. A chain of decisions, each one likely but
      not certain: Austria-Hungary punishes Serbia (with Germany's 'blank
      cheque'); Russia backs Serbia and mobilises; Germany's single war
      plan (the Schlieffen Plan) means war with Russia is also war with
      France, through Belgium; the invasion of Belgium brings Britain in.
      On some days diplomacy can stop the chain (mediation). Run the
      month many times: how likely was a general European war, and how
      much did the alliances, the war plan and diplomacy matter?
      The chance of the whole chain = the chances of each link
      multiplied together, so it can be worked out exactly (the theory).
   ===================================================================== */
const clamp = K.clamp;
// ---------------- a. Richardson's equations, one year at a time ----------------
const RACES = {
  naval: { name: "Anglo-German naval race", x: "Britain", y: "Germany", unit: "dreadnought-type ships", start: 1906, end: 1914, x0: 1, y0: 0, xcol: "#5ab0ff", ycol: "#c9a96a",
    p: { k: 0.55, a: 0.2, g: 1.2, l: 0.27, b: 0.2, h: 1.5 },
    // capital ships of the dreadnought type completed (approximate; battlecruisers included)
    data: { x: [[1906, 1], [1908, 4], [1910, 10], [1912, 18], [1914, 30]], y: [[1906, 0], [1908, 0], [1910, 5], [1912, 12], [1914, 20]] },
    events: [[1906, "HMS Dreadnought launched"], [1908, "German Navy Law amendment"], [1909, "'We want eight!'"], [1912, "Germany turns to its army"]] },
  cold: { name: "Soviet–American nuclear arms race", x: "USA", y: "USSR", unit: "thousand nuclear warheads", start: 1945, end: 1991, x0: 0.002, y0: 0, xcol: "#5ab0ff", ycol: "#ff5d6c",
    p: { k: 0.25, a: 0.35, g: 0.6, l: 0.2, b: 0.2, h: 1.6 },
    // approximate stockpiles (thousands), from published estimates (Federation of American Scientists / NRDC)
    data: { x: [[1945, 0.002], [1950, 0.3], [1955, 2.4], [1960, 18.6], [1965, 31.1], [1970, 26], [1975, 27.5], [1980, 24.1], [1985, 23.4], [1990, 21.4]],
            y: [[1950, 0.005], [1955, 0.2], [1960, 1.6], [1965, 6.1], [1970, 11.6], [1975, 19.1], [1980, 30.1], [1985, 39.2], [1990, 37]] },
    events: [[1949, "first Soviet bomb"], [1962, "Cuban Missile Crisis"], [1972, "SALT I"], [1987, "INF Treaty"]] }
};
// the balance both sides settle at, if a·b > k·l (set both changes to zero and solve)
function steady(p) { const D = p.a * p.b - p.k * p.l; if (D <= 0) return null; return { x: (p.k * p.h + p.b * p.g) / D, y: (p.l * p.g + p.a * p.h) / D }; }
function richardson(p, x0, y0, years, r, noise = 0, treaty = null) {
  let x = x0, y = y0; const pts = [[0, x, y]];
  for (let t = 1; t <= years; t++) {
    const q = treaty && t >= treaty.at ? Object.assign({}, p, { k: p.k * 0.6, l: p.l * 0.6, g: p.g * 0.5, h: p.h * 0.5 }) : p;
    const sx = noise && r ? 1 + noise * r.gauss() : 1, sy = noise && r ? 1 + noise * r.gauss() : 1;   // good and bad budget years
    const dx = (q.k * y - q.a * x + q.g) * sx, dy = (q.l * x - q.b * y + q.h) * sy;
    x = Math.max(0, x + dx); y = Math.max(0, y + dy); pts.push([t, x, y]);
  }
  return pts;
}

// ---------------- b. The July Crisis ----------------
// Powers, placed roughly as on a map of Europe (fractions of the stage)
const POW = {
  BRI: { n: "Britain", pos: [0.12, 0.2], col: "#5ab0ff" }, FRA: { n: "France", pos: [0.16, 0.66], col: "#5ab0ff" }, BEL: { n: "Belgium", pos: [0.3, 0.4], col: "#9aa6bd" },
  GER: { n: "Germany", pos: [0.48, 0.28], col: "#c9a96a" }, AH: { n: "Austria-Hungary", pos: [0.58, 0.62], col: "#c9a96a" }, RUS: { n: "Russia", pos: [0.88, 0.22], col: "#5ab0ff" },
  SER: { n: "Serbia", pos: [0.76, 0.86], col: "#5ab0ff" }
};
const TIES = [["GER", "AH", "Dual Alliance 1879", 0.5], ["FRA", "RUS", "Franco-Russian Alliance 1894", 0.62], ["BRI", "FRA", "Entente Cordiale 1904", 0.5], ["BRI", "RUS", "Anglo-Russian Entente 1907", 0.5], ["RUS", "SER", "Slav solidarity", 0.5], ["BRI", "BEL", "Treaty of London 1839", 0.5]];   // [power, power, name, where along the line to write the name]
const JULY_DEF = { cheque: true, rigid: 0.8, med: 0.04, plan: true };
/* The links of the chain (o.rigid scales how firmly each power stands by its friends, 0 to 1; o.med is the chance per day that
   diplomacy halts the crisis in the windows when it could act). Each returns the chance of that step. */
const LINKS = o => ({
  ah: o.cheque ? 0.9 : 0.4,                                   // Austria-Hungary decides to crush Serbia (more likely with Germany's backing, 5 July)
  w1: 5,                                                      // days of possible mediation before the ultimatum (it was kept secret, so few)
  ru: 0.3 + 0.65 * o.rigid,                                   // Russia backs Serbia (after its humiliation in the Bosnian crisis, 1908)
  w2: 3,                                                      // 28–30 July: 'Halt in Belgrade', Grey's conference, the Willy–Nicky telegrams
  ge: o.plan ? 0.95 : 0.4 + 0.5 * o.rigid,                    // Germany goes to war once Russia mobilises (the timetable leaves no time)
  w3: o.plan ? 0 : 4,                                         // without a single plan, Germany could wait: more days for diplomacy
  fr: o.plan ? 1 : 0.3 + 0.65 * o.rigid,                      // France is in (the Schlieffen Plan attacks France first, whatever it decides)
  br: o.plan ? 0.9 : 0.15 + 0.5 * o.rigid                     // Britain: Belgium invaded (Schlieffen Plan) or loyalty to the Entente alone
});
// the exact chances of each outcome (multiply along the chain)
function julyTheory(o) {
  const L = LINKS(o), s = d => Math.pow(1 - o.med, d);
  const war0 = L.ah * s(L.w1);                                 // Austria declares war on Serbia
  const ru = war0 * L.ru * s(L.w2);                            // Russia mobilises and diplomacy fails
  const cont = ru * L.ge * s(L.w3);                            // Germany at war with Russia: a continental war
  const gen = cont * L.fr * L.br;                              // Britain in: a general European war
  return { peace: 1 - war0, local: war0 - cont, cont: cont - gen, gen };
}
// one simulated July, day by day (day 0 = 28 June 1914, the assassination at Sarajevo)
function julyRun(o, r, keepLog) {
  const L = LINKS(o), st = { BRI: 0, FRA: 0, BEL: 0, GER: 0, AH: 0, RUS: 0, SER: 0 }, log = [], ev = (day, t) => keepLog && log.push([day, t]);
  const mediate = (from, n) => { for (let d = 0; d < n; d++) if (r() < o.med) return from + d; return -1; };
  ev(0, "Archduke Franz Ferdinand assassinated in Sarajevo."); st.SER = 1; st.AH = 1;
  if (r() >= L.ah) { ev(10, "Austria-Hungary protests but decides not to go to war."); return { out: "peace", st, log }; }
  ev(7, o.cheque ? "5 July: Germany promises Austria-Hungary full support (the 'blank cheque')." : "Austria-Hungary decides to act, without a German promise.");
  let m = mediate(20, L.w1); if (m >= 0) { ev(m, "Diplomacy succeeds: Serbia's reply is accepted. Crisis over."); st.AH = 1; return { out: "peace", st, log }; }
  ev(25, "23 July: the Austro-Hungarian ultimatum to Serbia."); ev(30, "28 July: Austria-Hungary declares war on Serbia."); st.AH = 3; st.SER = 3;
  if (r() >= L.ru) { ev(31, "Russia protests but does not mobilise. A local Balkan war."); return { out: "local", st, log }; }
  st.RUS = 2; ev(32, "30 July: Russia orders general mobilisation.");
  m = mediate(30, L.w2); if (m >= 0) { ev(m + 1, "'Halt in Belgrade': Austria stops at Belgrade; Russia stands down. A local war."); st.RUS = 1; return { out: "local", st, log }; }
  if (r() >= L.ge) { ev(33, "Germany warns Russia but does not declare war. A local war."); st.GER = 1; return { out: "local", st, log }; }
  st.GER = 2; m = mediate(33, L.w3); if (m >= 0) { ev(m + 1, "With no deadline from a war plan, talks halt the slide. A local war."); st.GER = 1; return { out: "local", st, log }; }
  st.GER = 3; st.RUS = 3; ev(34, "1 August: Germany declares war on Russia.");
  if (r() >= L.fr) { ev(36, "France stays neutral. An eastern war: Germany and Austria-Hungary against Russia and Serbia."); return { out: "cont", st, log }; }
  st.FRA = 3; ev(36, o.plan ? "3 August: Germany declares war on France (the Schlieffen Plan attacks west first)." : "France honours its alliance with Russia.");
  if (o.plan) { st.BEL = 3; ev(37, "4 August: German troops enter Belgium."); }
  if (r() >= L.br) { ev(37, "Britain stays out. A continental war."); return { out: "cont", st, log }; }
  st.BRI = 3; ev(37, "4 August: Britain declares war on Germany. A general European war."); return { out: "gen", st, log };
}
const pGen = (o, r, n = 1) => { let k = 0; for (let i = 0; i < n; i++) if (julyRun(o, r).out === "gen") k++; return 100 * k / n; };

// ---------------- The page ----------------
const P = { view: "race", race: "naval", p: Object.assign({}, RACES.naval.p), noise: 0, treaty: false, july: Object.assign({}, JULY_DEF), speed: 1 };
let rnd = K.rng(Date.now() % 99991 + 3), runPts = [], tYear = 0, J = null, jDay = 0, tally = { peace: 0, local: 0, cont: 0, gen: 0 }, acc = 0;
const ui = K.app({
  title: "Arms Races and Alliances", subject: "History",
  blurb: "Richardson's arms race and the July Crisis: was the First World War likely, or a chain of unlucky choices?",
  reset: () => set({}),
  levels: {
    std: "Standard (GCSE)", adv: "Advanced (A level)", specs: {
      std: "GCSE History: the causes of the First World War (militarism, alliances, imperialism, nationalism; the naval race; the July Crisis) and the Cold War arms race (deterrence, the Cuban Missile Crisis, détente).",
      adv: "OCR A level History A (H505) Y218 International Relations 1890–1941 (the alliance system, the naval race, the July Crisis, the debate on responsibility) and Y223 The Cold War in Europe 1941–1995 (the nuclear arms race, détente, SALT, INF). AO1 causation and contingency; AO3 interpretations (Fischer, Taylor, Clark)."
    }
  },
  missions: [
    { title: "The dreadnought race", q: "Run the Anglo-German naval race from 1906. Who builds faster? Compare the model with the dots (ships completed). Why does each side keep building?", hint: "Each side builds partly in response to the other (reaction) and partly for its own reasons (Britain's empire and trade routes; Tirpitz's Navy Laws). Because the reactions are strong compared with the cost, the race accelerates: by 1914 Britain had about 30 and Germany about 20. Britain kept a lead because it reacted more strongly (the 'two-power standard', then Churchill's 60% margin).", setup() { set({ view: "race", race: "naval" }); } },
    { title: "Fatigue against fear", q: "Increase both sides' fatigue (the cost of arms) until a·b is bigger than k·l. What changes about the race?", hint: "When fatigue outweighs fear (a·b > k·l), both sides level off at a steady balance instead of racing upwards. The readout shows the balance point. This is the logic of arms limitation: make arms costlier or the reaction weaker.", setup() { set({ view: "race", race: "naval" }); setP({ a: 0.6, b: 0.6 }); } },
    { title: "Germany drops out", q: "In 1912 Germany spent its money on the army instead. Lower Germany's reaction (l) to zero. Does Britain stop building?", hint: "Britain's building slows towards a lower balance, but it does not stop at once: Britain still has its own needs (g) and Germany's ships still exist. Anglo-German naval talks (the Haldane mission, 1912) failed, but the race was cooling by 1914, which is why many historians look beyond it for the war's causes.", setup() { set({ view: "race", race: "naval" }); setP({ l: 0 }); } },
    { title: "The nuclear arms race", q: "Switch to the Cold War. Can the model match both stockpiles? Where does it fail, and why?", hint: "The model gets the broad rise and levelling off, but not the US peak in the mid-1960s followed by a fall while Soviet numbers kept rising. The US replaced many weapons with fewer, more accurate ones (and MIRVs: several warheads per missile): counting warheads misses changes in technology and strategy. Mutually assured destruction made a stable balance (a·b > k·l) more likely.", setup() { set({ view: "race", race: "cold" }); } },
    { title: "Arms control", q: "With the Cold War race, switch on arms-control treaties (SALT I, 1972). What happens to both stockpiles?", hint: "The treaty weakens both reactions and both sides' ambitions, so the balance point falls. Real treaties capped launchers (SALT I) and removed a class of missiles (INF, 1987); deep cuts came after 1991 (START).", setup() { set({ view: "race", race: "cold", treaty: true }); } },
    { title: "The July Crisis", q: "Switch to the July Crisis and play it once. Then press 'Run 100 Julys'. How often does a general European war follow from the assassination?", hint: "With the settings as in 1914 (blank cheque, rigid alliances, the Schlieffen Plan, little mediation), a general war follows in roughly half of the runs. War was likely, but not certain: each link in the chain could have broken. Historians argue about which link mattered most.", setup() { set({ view: "july" }); } },
    { title: "Was it the war plan?", lvl: "adv", q: "Turn off the Schlieffen Plan (Germany has a plan to fight Russia alone). How much less likely is a general war? Compare with A. J. P. Taylor's 'war by timetable'.", hint: "Without a single westward plan, Germany need not attack France at once, Belgium is not invaded and Britain has less reason to fight, and there are more days for diplomacy. The chance of general war falls sharply. This supports Taylor's view that mobilisation plans narrowed the choices, though Fischer would reply that the plan reflected German aims.", setup() { set({ view: "july", july: { plan: false } }); } },
    { title: "Blank cheque and loose alliances", lvl: "adv", q: "Remove the blank cheque, then loosen the alliances. Which change makes the bigger difference? What would Fritz Fischer and Christopher Clark say?", hint: "Removing the blank cheque cuts the chance at the very first link, so everything downstream becomes less likely: this is Fischer's emphasis on German responsibility. Loosening every alliance spreads responsibility across all the powers, Clark's 'sleepwalkers'. The model shows both matter; which is 'more important' is a historian's judgement.", setup() { set({ view: "july", july: { cheque: false } }); } }
  ],
  batch: [
    { title: "When does an arms race run away?", question: "How many ships after 30 years, depending on how strongly Britain reacts to German building?", how: "Naval-race model (Germany: l = 0.27, b = 0.2, h = 1.5; Britain: a = 0.2, g = 1.2), with random budget years (±20%). Britain's reaction k from 0 to 0.12. It runs away once k·l > a·b, i.e. k > 0.148. Theory: Richardson's balance point x* = (k·h + b·g) ÷ (a·b − k·l).", xLabel: "Britain's reaction k", yLabel: "British ships after 30 years", xs: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12], reps: 6, yMin: 0, theory: x => { const s = steady(Object.assign({}, RACES.naval.p, { k: x })); return s ? s.x : NaN; }, theoryLabel: "balance point", run: (x, r) => { const p = Object.assign({}, RACES.naval.p, { k: x }); const q = richardson(p, 1, 0, 30, r, 0.2); return q[q.length - 1][1]; }, note: "The balance point grows faster and faster as k approaches the limit where k·l = a·b: near the edge, a small increase in fear makes a big difference. After 30 years the runs are close to the balance but still below it when k is large, because they take longer to get there." },
    { title: "A general war: how likely?", question: "With the settings of 1914, what share of simulated Julys end in a general European war?", how: "Each run is a batch of 50 Julys; the result is the percentage of them ending in a general war. Theory: multiply the chances along the chain.", reps: 100, bins: 18, yLabel: "general war (% of 50 Julys)", theory: julyTheory(JULY_DEF).gen * 100, theoryLabel: "chain of chances", run: (x, r) => pGen(JULY_DEF, r, 50), note: "Each batch of 50 gives a slightly different percentage (sampling variation), centred on the theory. A historian has only one July 1914 to study: that single outcome cannot tell us how likely it was." },
    { title: "Alliances and the chance of general war", question: "How does the chance of a general war depend on how firmly the powers stand by their friends?", how: "Alliance rigidity from 0.1 (loose) to 1 (rigid); the other settings as in 1914. Each point: 200 Julys.", xLabel: "alliance rigidity", yLabel: "general war (%)", xs: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1], reps: 5, yMin: 0, theory: x => 100 * julyTheory(Object.assign({}, JULY_DEF, { rigid: x })).gen, theoryLabel: "chain of chances", run: (x, r) => pGen(Object.assign({}, JULY_DEF, { rigid: x }), r, 200), note: "With the Schlieffen Plan in place, rigidity matters mainly through Russia's decision to back Serbia, so the curve is a straight line. The plan made France's and Britain's choices almost automatic." },
    { title: "The Schlieffen Plan", lvl: "adv", question: "How much more likely is a general war with Germany's single war plan than without it?", how: "0 = Germany could fight Russia alone (no Schlieffen Plan), 1 = the Schlieffen Plan. Each point: 200 Julys.", xLabel: "Schlieffen Plan (0 = no, 1 = yes)", yLabel: "general war (%)", xs: [0, 1], reps: 12, yMin: 0, theory: x => 100 * julyTheory(Object.assign({}, JULY_DEF, { plan: !!x })).gen, theoryLabel: "chain of chances", run: (x, r) => pGen(Object.assign({}, JULY_DEF, { plan: !!x }), r, 200), note: "The plan nearly triples the chance of a general war in this model: it turns an eastern war into a western one, invades Belgium (bringing Britain in) and removes days for diplomacy." },
    { title: "Can diplomacy save the peace?", lvl: "adv", question: "How does the chance of general war fall as mediation gets more effective?", how: "Chance per day that mediation halts the crisis, from 0 to 20%, on the days when it could act. Each point: 200 Julys.", xLabel: "mediation success per day (%)", yLabel: "general war (%)", xs: [0, 2, 4, 6, 8, 10, 15, 20], reps: 5, yMin: 0, theory: x => 100 * julyTheory(Object.assign({}, JULY_DEF, { med: x / 100 })).gen, theoryLabel: "chain of chances", run: (x, r) => pGen(Object.assign({}, JULY_DEF, { med: x / 100 }), r, 200), note: "Only about eight days in July offered a real chance for diplomacy (the ultimatum was secret and the war plan left little time later). Even fairly effective mediation leaves a large chance of war: the shortage of time was itself a cause." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Long-term causes", text: "MAIN: Militarism (the naval race: HMS Dreadnought 1906, the German Navy Laws, 'We want eight' 1909), Alliances (Triple Alliance and Triple Entente), Imperialism (the Moroccan crises 1905 and 1911), Nationalism (Serbia, pan-Slavism)." },
      { lvl: "std", tag: "Short-term causes", text: "The July Crisis: assassination (28 June), the blank cheque (5 July), the ultimatum (23 July), war on Serbia (28 July), Russian mobilisation (30 July), Germany at war with Russia (1 August) and France (3 August), Belgium invaded and Britain at war (4 August)." },
      { lvl: "std", tag: "Arms race", text: "An arms race feeds on itself: each side builds because the other does. In the Cold War, mutually assured destruction (MAD) made nuclear war unwinnable, and treaties (the Test Ban Treaty 1963, SALT I 1972, INF 1987) limited the race." },
      { lvl: "std", tag: "Using models", text: "A chain of likely steps can still be unlikely overall: multiply the chances. Each link was a choice by real people, so the war was likely but not inevitable." },
      { lvl: "adv", tag: "Y218", text: "Alliances were defensive and conditional: the Entente Cordiale (1904) and Anglo-Russian Entente (1907) were not military alliances. Britain's guarantee of Belgium (Treaty of London, 1839) gave the reason to fight in 1914." },
      { lvl: "adv", tag: "AO3", text: "Fischer (1961): Germany sought war for its aims (the September Programme). Taylor (1969): 'war by timetable', mobilisation plans dragged the powers in. Clark (2012): The Sleepwalkers, responsibility shared, decisions made by small groups in many capitals." },
      { lvl: "adv", tag: "Y223", text: "The nuclear arms race: US monopoly to 1949; massive retaliation; the missile gap; the Cuban Missile Crisis (1962) and the hotline; SALT I and the ABM Treaty (1972); new missiles in Europe (SS-20, Pershing II); the INF Treaty (1987) removed a whole class of weapons." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Richardson's equations: x′ = ky − ax + g, y′ = lx − by + h. Stable if ab > kl, with the balance at x* = (kh + bg) ÷ (ab − kl)." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain why the naval race increased tension between Britain and Germany before 1914.", ans: "<ul><li>Britain depended on its navy to protect its empire and food imports, so saw the German fleet as a threat</li><li>the Dreadnought (1906) made older ships obsolete, so Germany could catch up</li><li>each side built more in response (Navy Laws; 'We want eight')</li><li>public opinion and the press stirred fear on both sides</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const t = julyTheory(P.july); return `In the simulation, a general war follows in ${(t.gen * 100).toFixed(0)}% of Julys with the current settings. Explain why the outcome is not the same in every run.`; }, ans: "<ul><li>each decision in the chain happens only with some chance</li><li>diplomacy might succeed on some days</li><li>so different runs take different paths, like a different July 1914</li></ul>" },
      { lvl: "std", marks: 2, q: "Using the model, explain why the invasion of Belgium mattered.", ans: "<ul><li>Britain had guaranteed Belgian neutrality (Treaty of London, 1839)</li><li>the invasion gave Britain a clear reason to declare war (in the model the chance of Britain joining rises from about 0.5 to 0.9)</li></ul>" },
      { lvl: "adv", marks: 12, q: "'The alliance system was the main reason a Balkan crisis became a European war in 1914.' How far do you agree?", ans: "<ul><li>for: alliances linked the Balkans to the great powers (Russia–Serbia, Germany–Austria-Hungary, France–Russia); in the model rigidity raises the chance of general war</li><li>against: alliances were defensive and conditional (Italy did not fight; Britain's ententes were not alliances)</li><li>the blank cheque turned a local quarrel into a test of the alliances (Fischer)</li><li>the Schlieffen Plan made a war with Russia into a war with France and Belgium (Taylor); in the model it roughly doubles the chance</li><li>Clark: shared decisions in many capitals; the shortness of time</li><li>judgement: alliances were the structure, but the war plan and the decisions of July were needed to set them off</li></ul>" },
      { lvl: "adv", marks: 4, q: "In Richardson's model, the British reaction is k = 0.55, fatigue a = 0.2; Germany has l = 0.27, b = 0.2. Will the race level off? Explain.", ans: "<ul><li>a·b = 0.04</li><li>k·l = 0.55 × 0.27 = 0.149</li><li>k·l > a·b, so reaction outweighs fatigue</li><li>the race runs away (does not level off) unless something changes</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p><b>Arms race.</b> Richardson's equations (1919, published 1960), stepped one year at a time: change in x = k·y − a·x + g, and the same for y. Budget years vary at random if you choose. The arms-control switch (Cold War) weakens both reactions by 40% and halves both ambitions from 1972. The dots are approximate historical figures: dreadnought-type ships completed (including battlecruisers), and published estimates of nuclear stockpiles.</p>
<p><b>July Crisis.</b> A chain of decisions with set chances (see the code, LINKS). Alliance rigidity raises the chance that Russia backs Serbia, and (without the Schlieffen Plan) that Germany, France and Britain stand by their partners. The Schlieffen Plan makes Germany go to war once Russia mobilises, attack France at once and invade Belgium, which makes Britain very likely to join. Mediation has a set chance of success on each day when it could act: about five days before the ultimatum, three before Russian mobilisation, and four more if Germany has no single war plan.</p>
<h3>Assumptions and simplifications</h3>
<ul><li>The chances in the July Crisis are judgements, not measurements. Historians would set them differently; that is the point of the sliders.</li>
<li>Powers are treated as single decision-makers. In reality decisions came from small groups (Kaiser, Bethmann Hollweg, Moltke; Berchtold, Conrad; Sazonov, Nicholas II; Grey and the Cabinet) who often disagreed.</li>
<li>Italy, the Ottoman Empire, Japan and the colonial empires are left out. Public opinion, socialist parties and the press are not modelled.</li>
<li>Richardson's model counts weapons, not their quality: it ignores technology (dreadnoughts, MIRVs, accuracy), alliances' combined strength, and the economy behind the spending. Its parameters here are fitted by eye.</li>
<li>Both models look at causes as forces; they cannot capture intentions, beliefs or misperceptions, which most historians think were central.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}, groups = {};
let g = ui.group("What to show");
ctl.view = K.seg(g, { value: "race", options: [["race", "⚓ Arms race"], ["july", "📅 The July Crisis 1914"]], on: v => { P.view = v; showGroups(); } });
g = groups.race = ui.group("Richardson's arms race");
ctl.race = K.seg(g, { value: "naval", options: [["naval", "Naval race 1906–14"], ["cold", "Cold War 1945–91"]], on: v => { P.race = v; P.p = Object.assign({}, RACES[v].p); syncP(); restartRace(); } });
const pl = {};
for (const [key, side, what] of [["k", "x", "reaction to the rival (k)"], ["a", "x", "fatigue: cost of arms (a)"], ["g", "x", "own ambition (g)"], ["l", "y", "reaction to the rival (l)"], ["b", "y", "fatigue: cost of arms (b)"], ["h", "y", "own ambition (h)"]])
  pl[key] = K.slider(g, { label: key, min: 0, max: key === "g" || key === "h" ? 3 : 1, step: 0.01, value: P.p[key], fmt: v => v.toFixed(2), on: v => { P.p[key] = v; restartRace(); } });
ctl.noise = K.slider(g, { label: "Random budget years", min: 0, max: 0.4, step: 0.05, value: 0, fmt: v => v ? "±" + Math.round(v * 100) + "%" : "none", on: v => { P.noise = v; restartRace(); } });
ctl.treaty = K.toggle(g, { label: "Arms-control treaties from 1972 (Cold War)", value: false, on: v => { P.treaty = v; restartRace(); } });
K.btn(K.row(g), "↺ Run the race again", () => restartRace(), "primary");
const readR = K.readout(g, [["x", "Britain"], ["y", "Germany"], ["d", "fatigue − fear: a·b − k·l"], ["s", "balance point"]]);
g = groups.july = ui.group("The July Crisis: the settings");
ctl.cheque = K.toggle(g, { label: "Germany's 'blank cheque' (5 July)", value: true, on: v => { P.july.cheque = v; newJuly(); } });
ctl.plan = K.toggle(g, { label: "Schlieffen Plan (attack France through Belgium)", value: true, on: v => { P.july.plan = v; newJuly(); } });
ctl.rigid = K.slider(g, { label: "Alliance rigidity", min: 0, max: 1, step: 0.05, value: P.july.rigid, fmt: v => v.toFixed(2) + (v >= 0.75 ? " (rigid)" : v <= 0.3 ? " (loose)" : ""), on: v => { P.july.rigid = v; newJuly(); } });
ctl.med = K.slider(g, { label: "Mediation succeeds, per day", min: 0, max: 0.2, step: 0.01, value: P.july.med, fmt: v => Math.round(v * 100) + "%", on: v => { P.july.med = v; newJuly(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 8, step: 0.5, value: 1, fmt: v => v + (v === 1 ? " day" : " days") + " a second", on: v => P.speed = v });
const jr = K.row(g); K.btn(jr, "▶ New July", () => newJuly(), "primary"); K.btn(jr, "Run 100 Julys", () => { for (let i = 0; i < 100; i++) tally[julyRun(P.july, rnd).out]++; }); K.btn(jr, "Clear tally", () => tally = { peace: 0, local: 0, cont: 0, gen: 0 });
const readJ = K.readout(g, [["gt", "general war (theory)"], ["gs", "general war (your tally)"], ["lt", "local war (theory)"], ["pt", "no war (theory)"]]);
function sideLabel() { const R = RACES[P.race]; for (const k of ["k", "a", "g"]) pl[k].el.querySelector("label span").textContent = R.x + ": " + { k: "reaction to rival (k)", a: "fatigue, cost of arms (a)", g: "own ambition (g)" }[k]; for (const k of ["l", "b", "h"]) pl[k].el.querySelector("label span").textContent = R.y + ": " + { l: "reaction to rival (l)", b: "fatigue, cost of arms (b)", h: "own ambition (h)" }[k]; }
function syncP() { for (const k in pl) pl[k].set(P.p[k]); sideLabel(); }
function setP(o) { Object.assign(P.p, o); syncP(); restartRace(); }
function showGroups() { groups.race.style.display = P.view === "race" ? "" : "none"; groups.july.style.display = P.view === "july" ? "" : "none"; ctl.treaty.el.style.display = P.race === "cold" ? "" : "none"; }
function restartRace() { const R = RACES[P.race]; runPts = richardson(P.p, R.x0, R.y0, R.end - R.start, rnd, P.noise, P.treaty && P.race === "cold" ? { at: 1972 - R.start } : null); tYear = 0; }
function newJuly() { J = julyRun(P.july, rnd, true); jDay = 0; }
function set(o) {
  Object.assign(P, { view: "race", race: "naval", noise: 0, treaty: false, speed: 1 }, o); P.p = Object.assign({}, RACES[P.race].p); P.july = Object.assign({}, JULY_DEF, o.july || {});
  ctl.view.set(P.view); ctl.race.set(P.race); ctl.noise.set(P.noise); ctl.treaty.set(P.treaty); ctl.cheque.set(P.july.cheque); ctl.plan.set(P.july.plan); ctl.rigid.set(P.july.rigid); ctl.med.set(P.july.med); ctl.speed.set(P.speed);
  syncP(); restartRace(); newJuly(); tally = { peace: 0, local: 0, cont: 0, gen: 0 }; showGroups();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Arms over time", xLabel: "year", yMin: 0 });
const chB = K.chart(ui.dock, { title: "The race in the x–y plane", xLabel: "x", yMin: 0 });
const FONT = "Segoe UI,system-ui,sans-serif";
function drawRace(c, w, h) {
  const R = RACES[P.race], n = Math.min(Math.floor(tYear), runPts.length - 1), cur = runPts[n], yr = R.start + n, s = steady(P.p), D = P.p.a * P.p.b - P.p.k * P.p.l;
  c.font = "600 15px " + FONT; c.fillStyle = "#eef2f8"; c.textAlign = "left"; c.fillText(`${R.name}: ${yr}`, 28, 34);
  c.font = "12px " + FONT; c.fillStyle = "#aab6cc"; c.fillText(`one icon = ${P.race === "naval" ? "one ship" : "500 warheads"}`, 28, 54);
  // each side's fleet or arsenal as rows of icons
  const per = P.race === "naval" ? 1 : 0.5, cols = Math.floor((w - 380) / 22);
  [[R.x, cur[1], R.xcol, 90], [R.y, cur[2], R.ycol, 90 + (h - 140) / 2]].forEach(([nm, v, col, y0]) => {
    c.fillStyle = col; c.font = "600 14px " + FONT; c.fillText(`${nm}: ${P.race === "naval" ? Math.round(v) + " ships" : (v * 1000).toFixed(0) + " warheads"}`, 28, y0);
    const nI = Math.min(Math.round(v / per), cols * 6);
    for (let i = 0; i < nI; i++) { const x = 34 + (i % cols) * 22, y = y0 + 18 + Math.floor(i / cols) * 22; c.fillStyle = col;
      if (P.race === "naval") { c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.lineTo(x + 6, y + 6); c.lineTo(x - 6, y + 6); c.closePath(); c.fill(); c.fillRect(x - 2, y - 6, 4, 6); }
      else { c.beginPath(); c.ellipse(x, y + 2, 3.5, 8, 0, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(x - 6, y + 10); c.lineTo(x, y + 5); c.lineTo(x + 6, y + 10); c.fill(); } }
    if (Math.round(v / per) > nI) { c.fillStyle = "#aab6cc"; c.font = "12px " + FONT; c.fillText("… and more", 34, y0 + 18 + 6 * 22 + 4); }
  });
  // the stability test
  const bx = w - 330, by = 80; c.fillStyle = "rgba(20,27,46,0.92)"; c.fillRect(bx, by, 300, 170); c.strokeStyle = "#3a4560"; c.strokeRect(bx, by, 300, 170);
  c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("Fear or fatigue?", bx + 14, by + 24); c.font = "13px " + FONT;
  c.fillStyle = "#aab6cc"; c.fillText(`fatigue  a·b = ${(P.p.a * P.p.b).toFixed(3)}`, bx + 14, by + 50); c.fillText(`fear       k·l = ${(P.p.k * P.p.l).toFixed(3)}`, bx + 14, by + 72);
  c.fillStyle = D > 0 ? "#7fe3a0" : "#ff8a95"; c.font = "600 13px " + FONT; c.fillText(D > 0 ? "a·b > k·l: the race levels off" : "k·l > a·b: the race runs away", bx + 14, by + 100);
  c.font = "12px " + FONT; c.fillStyle = "#aab6cc";
  if (s) { c.fillText(`balance: ${sigU(s.x)} / ${sigU(s.y)}`, bx + 14, by + 124); } else c.fillText("no balance point: both keep growing", bx + 14, by + 124);
  const evs = R.events.filter(e => e[0] <= yr); if (evs.length) { c.fillStyle = "#ffd166"; c.fillText(evs[evs.length - 1][0] + ": " + evs[evs.length - 1][1], bx + 14, by + 150); }
}
const sigU = v => P.race === "naval" ? v.toFixed(0) + " ships" : (v * 1000).toFixed(0) + " warheads";
const ST = ["at peace", "in crisis", "mobilising", "at war"], STC = ["#3a4560", "#ffd166", "#ffb347", "#ff5d6c"];
function drawJuly(c, w, h) {
  const shown = J.log.filter(e => e[0] <= jDay), day = Math.floor(jDay), date = new Date(Date.UTC(1914, 5, 28 + day));
  const W = w - 420, X = p => 50 + p[0] * W, Y = p => 60 + p[1] * (h - 130);
  c.font = "600 15px " + FONT; c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.fillText(date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), 30, 30);
  // alliance lines: solid for alliances, dashed for ententes and guarantees
  for (const [a, b, lab, f] of TIES) { const pa = POW[a].pos, pb = POW[b].pos; c.strokeStyle = /Alliance/.test(lab) ? "rgba(238,242,248,0.55)" : "rgba(238,242,248,0.3)"; c.setLineDash(/Alliance/.test(lab) ? [] : [5, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(X(pa), Y(pa)); c.lineTo(X(pb), Y(pb)); c.stroke(); c.setLineDash([]);
    c.fillStyle = "#7d8aa5"; c.font = "11px " + FONT; c.textAlign = "center"; c.textAlign = a === "GER" ? "left" : "center"; c.fillText(lab, X(pa) + (X(pb) - X(pa)) * f + (a === "GER" ? 10 : 0), Y(pa) + (Y(pb) - Y(pa)) * f - 5); }
  // the state of each power at today's date: replay the log up to today
  const st = { BRI: 0, FRA: 0, BEL: 0, GER: 0, AH: 0, RUS: 0, SER: 0 };
  if (day >= 0) { st.SER = 1; st.AH = 1; }
  for (const [d, t] of shown) { if (/declares war on Serbia/.test(t)) { st.AH = 3; st.SER = 3; } if (/Russia orders/.test(t)) st.RUS = 2; if (/declares war on Russia/.test(t)) { st.GER = 3; st.RUS = 3; } if (/war on France|France honours/.test(t)) { st.FRA = 3; st.GER = 3; } if (/enter Belgium/.test(t)) st.BEL = 3; if (/Britain declares/.test(t)) st.BRI = 3; if (/stands down|halt/.test(t)) st.RUS = Math.min(st.RUS, 1); if (/Germany warns/.test(t)) st.GER = 1; }
  for (const k in POW) { const p = POW[k], r = k === "BEL" || k === "SER" ? 15 : 24; c.fillStyle = STC[st[k]]; c.beginPath(); c.arc(X(p.pos), Y(p.pos), r, 0, 6.3); c.fill(); c.strokeStyle = p.col; c.lineWidth = 3; c.stroke();
    c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.textAlign = "center"; c.fillText(p.n, X(p.pos), Y(p.pos) + r + 16); c.font = "11px " + FONT; c.fillStyle = "#aab6cc"; c.fillText(ST[st[k]], X(p.pos), Y(p.pos) + r + 30); }
  // the diary of events
  const lx = w - 320; c.textAlign = "left"; c.fillStyle = "rgba(20,27,46,0.92)"; c.fillRect(lx, 20, 300, h - 40); c.strokeStyle = "#3a4560"; c.strokeRect(lx, 20, 300, h - 40);
  c.fillStyle = "#eef2f8"; c.font = "600 13px " + FONT; c.fillText("Diary of the crisis", lx + 12, 42); c.font = "12px " + FONT;
  let yy = 64; for (const [d, t] of shown) { const dt = new Date(Date.UTC(1914, 5, 28 + d)); c.fillStyle = "#ffd166"; c.fillText(dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), lx + 12, yy); c.fillStyle = "#dfe6f3"; yy = wrap(c, t.replace(/^\d+ (July|August): /, "").replace(/^./, ch => ch.toUpperCase()), lx + 64, yy, 226, 15) + 21; }
  if (jDay > J.log[J.log.length - 1][0] + 1) { const lab = { peace: "No war", local: "A local Balkan war", cont: "A continental war", gen: "A general European war" }[J.out]; c.fillStyle = J.out === "gen" ? "#ff5d6c" : J.out === "peace" ? "#7fe3a0" : "#ffb347"; c.font = "600 15px " + FONT; c.fillText("Outcome: " + lab, lx + 12, h - 34); }
}
function wrap(c, t, x, y, maxW, lh) { let line = ""; for (const wd of t.split(" ")) { const test = line ? line + " " + wd : wd; if (c.measureText(test).width > maxW && line) { c.fillText(line, x, y); y += lh; line = wd; } else line = test; } c.fillText(line, x, y); return y; }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.view === "race") tYear = Math.min(runPts.length - 1, tYear + dt * (P.race === "naval" ? 1 : 3));
  else jDay = Math.min(J.log[J.log.length - 1][0] + 2, jDay + dt * P.speed);
}, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "race") drawRace(c, w, h); else drawJuly(c, w, h);
  if (frame++ % 4) return;
  if (P.view === "race") {
    const R = RACES[P.race], n = Math.min(Math.floor(tYear), runPts.length - 1), pts = runPts.slice(0, n + 1), s = steady(P.p), cur = runPts[n];
    chA.opts.title = `${R.x} and ${R.y}: ${R.unit}`; chA.opts.xLabel = "year";
    chA.draw([{ pts: pts.map(q => [R.start + q[0], q[1]]), color: R.xcol, label: R.x }, { pts: pts.map(q => [R.start + q[0], q[2]]), color: R.ycol, label: R.y }, { pts: R.data.x, type: "dots", color: R.xcol, r: 4, label: "real " + R.x }, { pts: R.data.y, type: "dots", color: R.ycol, r: 4, label: "real " + R.y }], { xMin: R.start, xMax: R.start + runPts.length - 1, yMin: 0 });
    chB.opts.title = "The race in the plane: " + R.x + " (across) and " + R.y + " (up)"; chB.opts.xLabel = R.x + " (" + R.unit + ")";
    const ext = Math.max(5, ...runPts.map(q => Math.max(q[1], q[2]))) * 1.1, lineX = [], lineY = [];
    // the 'nullclines': where x stops changing (k·y − a·x + g = 0) and where y stops changing; they cross at the balance point
    for (let i = 0; i <= 20; i++) { const xx = ext * i / 20; if (P.p.k > 1e-6) lineX.push([xx, (P.p.a * xx - P.p.g) / P.p.k]); lineY.push([xx, (P.p.l * xx + P.p.h) / Math.max(1e-6, P.p.b)]); }
    chB.draw([{ pts: lineX, color: R.xcol, dash: [5, 4], width: 1.2, label: R.x + " stops changing" }, { pts: lineY, color: R.ycol, dash: [5, 4], width: 1.2, label: R.y + " stops changing" }, { pts: pts.map(q => [q[1], q[2]]), color: "#eef2f8" }, { pts: [[cur[1], cur[2]]].concat(s ? [[s.x, s.y]] : []), type: "dots", color: "#ffd166", r: 5 }], { xMin: 0, xMax: ext, yMin: 0, yMax: ext });
    readR.el.children[0].firstChild.textContent = R.x; readR.el.children[1].firstChild.textContent = R.y;
    readR.set("x", sigU(cur[1])); readR.set("y", sigU(cur[2])); readR.set("d", (P.p.a * P.p.b - P.p.k * P.p.l).toFixed(3)); readR.set("s", s ? sigU(s.x) + " / " + sigU(s.y) : "none: runs away");
    ui.hud("");
  } else {
    const t = julyTheory(P.july), n = tally.peace + tally.local + tally.cont + tally.gen, cats = [["peace", "no war"], ["local", "local war"], ["cont", "continental war"], ["gen", "general war"]];
    chA.opts.title = "Chance of each outcome (theory: multiply along the chain)"; chA.opts.xLabel = "";
    chA.draw([{ pts: cats.map((q, i) => [i, 100 * t[q[0]]]), type: "bars", w: 0.6, color: "#ffd166", label: "theory (%)" }], { xMin: -0.5, xMax: 3.5, yMin: 0, yMax: 100, xFmt: v => (cats[Math.round(v)] || [, ""])[1] });
    chB.opts.title = `Your tally of simulated Julys (${n})`; chB.opts.xLabel = "";
    chB.draw([{ pts: cats.map((q, i) => [i, n ? 100 * tally[q[0]] / n : 0]), type: "bars", w: 0.6, color: "#5ab0ff", label: "simulated (%)" }, { pts: cats.map((q, i) => [i, 100 * t[q[0]]]), type: "dots", color: "#ffd166", r: 5, label: "theory" }], { xMin: -0.5, xMax: 3.5, yMin: 0, yMax: 100, xFmt: v => (cats[Math.round(v)] || [, ""])[1] });
    readJ.set("gt", (100 * t.gen).toFixed(0) + "%"); readJ.set("gs", n ? (100 * tally.gen / n).toFixed(0) + "% of " + n : "–"); readJ.set("lt", (100 * t.local).toFixed(0) + "%"); readJ.set("pt", (100 * t.peace).toFixed(0) + "%");
    ui.hud("");
  }
});
set({});
ui.tip("Watch the two fleets grow. Switch to the July Crisis at the top of the controls.", 7000);
