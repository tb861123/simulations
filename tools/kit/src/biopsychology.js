/* =====================================================================
   BIOPSYCHOLOGY: SYNAPSE, FIGHT OR FLIGHT, AND THE BODY CLOCK
   (The nerve impulse itself is in the Nerve Impulse simulation:
    medical/nerve_impulse. This one starts where the impulse arrives.)

   1. SYNAPTIC TRANSMISSION: an impulse reaches the presynaptic terminal,
      vesicles release NEUROTRANSMITTER into the cleft, it binds to
      receptors on the postsynaptic neuron. EXCITATORY transmitters make
      the inside less negative (an EPSP), INHIBITORY ones more negative
      (an IPSP). The postsynaptic neuron only fires if the total reaches
      THRESHOLD: SUMMATION, either many inputs at once (spatial) or one
      input firing rapidly (temporal). Transmitter is removed by REUPTAKE
      into the presynaptic neuron (SSRIs block this for serotonin).
   2. FIGHT OR FLIGHT: the hypothalamus detects a threat.
      Fast route, the SYMPATHOMEDULLARY (SAM) pathway: sympathetic nervous
      system → adrenal medulla → ADRENALINE (seconds): heart rate, breathing,
      glucose up; digestion down. The PARASYMPATHETIC system calms things
      afterwards ('rest and digest').
      Slower route, the HPA AXIS: hypothalamus (CRH) → pituitary (ACTH) →
      adrenal cortex → CORTISOL (minutes), with NEGATIVE FEEDBACK.
   3. BIOLOGICAL RHYTHMS (A level): the SCN is an ENDOGENOUS PACEMAKER that
      free-runs at a little over 24 h. Light (an EXOGENOUS ZEITGEBER) resets
      it each day. Without light cues (Siffre's cave) the sleep–wake cycle
      drifts; after a flight the clock needs days to re-entrain (jet lag).
   ===================================================================== */

// ---------------- 1. The synapse: a 'leaky integrate-and-fire' neuron ----------------
// V is the postsynaptic membrane potential at the axon hillock (mV). Each synapse s has a transmitter level N[s] in its cleft.
// dV/dt = −(V − Vrest)/τm + Σ w_s·N_s : the membrane leaks back to rest, transmitter pushes it up (w > 0) or down (w < 0).
const VREST = -70, VTH = -55, TAUM = 10;
const SYN = [{ name: "E1", w: 7.6, col: "#7ee787", ex: true }, { name: "E2", w: 7.6, col: "#5ad1ff", ex: true }, { name: "I", w: -7.6, col: "#ff6b81", ex: false }];
function newNeuron() { return { V: VREST, N: [0, 0, 0], refr: 0, t: 0, spikes: [], out: 0, queue: [] }; }
// advance by h ms. Q holds the drug settings: reuptake (fraction blocked), antag (fraction of receptors blocked)
function synStep(S, h, Q) {
  const tau = 1.5 / (1 - 0.85 * Q.reuptake);                  // transmitter clearance time: slower when reuptake is blocked
  for (let s = 0; s < 3; s++) S.N[s] -= S.N[s] / tau * h;
  let I = 0; for (let s = 0; s < 3; s++) I += SYN[s].w * S.N[s] * (s < 2 ? 1 - Q.antag : 1);
  if (S.refr > 0) { S.refr -= h; S.V = S.refr > 0 ? -75 : S.V; }
  else { S.V += (-(S.V - VREST) / TAUM + I) * h; if (S.V >= VTH) { S.spikes.push(S.t); S.out++; S.refr = 2; S.V = 40; } }   // threshold reached: an action potential leaves down the axon
  S.t += h;
}
const release = (S, s) => { S.N[s] += 1; };                   // one presynaptic impulse releases one 'packet' of transmitter
// output firing rate (Hz) for Poisson inputs at the given rates (Hz) over 'ms' milliseconds
function outRate(r, rates, Q, ms = 2000) { const S = newNeuron(), h = 0.05; for (let t = 0; t < ms; t += h) { for (let s = 0; s < 3; s++) if (r() < rates[s] * h / 1000) release(S, s); synStep(S, h, Q); } return S.out / (ms / 1000); }

// ---------------- 2. Fight or flight (time in minutes) ----------------
// stress signal s(t) from the hypothalamus → sympathetic activity → adrenaline (fast)
// and → CRH → ACTH → cortisol (slow), with cortisol damping CRH (negative feedback)
function newBody() { return { t: 0, s: 0, sym: 0, adr: 0, crh: 0.05, acth: 0.05, cort: 0.12, hist: [], pulse: 0 }; }
function bodyStep(B, h, Q, k = { a: 1, c: 1 }) {
  const input = Math.min(1.5, (B.pulse > 0 ? Q.threat : 0) + (Q.chronic ? 0.45 : 0)) * Q.appraisal; if (B.pulse > 0) B.pulse -= h;
  B.s = input;
  B.sym += (B.s - B.sym) / 0.15 * h;                                  // sympathetic nerves: within seconds
  B.adr += (B.sym - B.adr) / (1.5 * k.a) * h;                           // adrenaline from the adrenal medulla: a minute or two
  B.crh += (0.05 + B.s / (1 + Q.fb * 4 * B.cort) - B.crh) / 3 * h;      // CRH from the hypothalamus, damped by cortisol (negative feedback)
  B.acth += (B.crh - B.acth) / 8 * h;                                   // ACTH from the pituitary gland
  B.cort += (0.12 + 2.2 * (B.acth - 0.05) - B.cort) / (20 * k.c) * h;    // cortisol from the adrenal cortex: tens of minutes
  B.t += h;
}
const heartRate = (B, Q) => 68 + 85 * B.adr / (B.adr + 0.35) * (1 - Q.beta);
const glucose = B => 5 + 2.5 * B.adr + 1.5 * Math.max(0, B.cort - 0.12);

// ---------------- 3. Body clock (time in hours) ----------------
// phase φ of the SCN clock, in 'circadian hours'. ct = φ mod 24; ct 0 = the clock's 'morning' (waking), sleep from ct 16 to ct 24.
// Each hour the clock advances 24/τ (τ = free-running period). Light shifts it, depending on WHEN it arrives (phase response curve):
// light in the evening and early subjective night delays the clock, light late in the night and early morning advances it, light in the middle of the day does little.
// Here the body temperature minimum is at ct 22 (2 h before waking): light from ct 14 to 22 delays, light from ct 22 to ct 4 (the first hours after waking) advances.
const PRC = ct => { const x = ((ct - 14) % 24 + 24) % 24; return x < 8 ? -Math.sin(Math.PI * x / 8) : x < 14 ? Math.sin(Math.PI * (x - 8) / 6) : 0; };
function newClock() { return { t: 0, phi: 0, days: [], cur: { sleep: [], light: [] } }; }
// is it daylight at clock time t (hours)? 'shift' moves the local day (a flight east by +n hours means local time jumps forward n hours)
const dayLight = (t, Q) => { const lt = ((t + Q.shift) % 24 + 24) % 24; return lt >= Q.dawn && lt < Q.dusk; };
function clockStep(C, h, Q) {
  const ct = ((C.phi % 24) + 24) % 24, awake = ct < 16, L = awake ? (Q.cave ? 0.03 : dayLight(C.t, Q) ? Q.light : 0.05) : 0;   // daylight is far stronger than indoor lamps
  C.phi += h * (24 / Q.tau + 0.55 * L * PRC(ct));
  C.awake = awake; C.L = L; C.t += h;
}
// days for the clock to re-entrain after a time-zone change of 'shift' hours, starting from an entrained clock
function reentrainDays(r, shift, Q0) {
  const Q = Object.assign({}, Q0, { shift: 0 }), C = newClock(); C.phi = 23 + r.gauss() * 0.3; const h = 0.1;
  for (let t = 0; t < 24 * 30; t += h) clockStep(C, h, Q);          // settle into the 24 h day first
  const ref = (((C.phi - 24 / Q.tau * 0) % 24) + 24) % 24 - (C.t % 24); Q.shift = shift;   // clock phase relative to local time before the flight
  for (let d = 1; d <= 40; d++) { for (let t = 0; t < 24; t += h) clockStep(C, h, Q); let err = (((C.phi % 24) + 24) % 24) - ((C.t + shift) % 24) - ref; err = ((err % 24) + 36) % 24 - 12; if (Math.abs(err) < 1) return d; }
  return 40;
}

// ---------------- 4. State ----------------
const DEF = { mode: "synapse", r1: 0, r2: 0, rI: 0, reuptake: 0, antag: 0, sspeed: 25, threat: 1, appraisal: 1, chronic: false, fb: 1, beta: 0, bspeed: 1.5, tau: 24.5, light: 1, cave: false, shift: 0, dawn: 7, dusk: 22, cspeed: 3 };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), N = newNeuron(), B = newBody(), CL = newClock(), Vtr = [], Ntr = [], flights = [];
function restart() { N = newNeuron(); Vtr = []; Ntr = []; B = newBody(); CL = newClock(); CL.phi = 17.6;   // start already entrained (asleep from about 22:30)
  flights = []; }

// ---------------- 5. The page ----------------
const ui = K.app({
  title: "Biopsychology: Synapse, Stress and Rhythms", subject: "Psychology",
  blurb: "Fire excitatory and inhibitory synapses into a neuron, set off the fight-or-flight response through adrenaline and cortisol, and (A level) watch the body clock free-run and re-entrain",
  reset: () => restart(),
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS Psychology (7181) 3.2.1 Biopsychology: the divisions of the nervous system (central and peripheral, somatic and autonomic); the structure and function of sensory, relay and motor neurons; the process of synaptic transmission, including reference to neurotransmitters, excitation and inhibition; the function of the endocrine system (glands and hormones); the fight-or-flight response including the role of adrenaline.",
    adv: "AQA A level Psychology (7182) 3.2.2 Biopsychology: all of the AS content plus biological rhythms: circadian, infradian and ultradian rhythms and the difference between them; the effect of endogenous pacemakers and exogenous zeitgebers on the sleep/wake cycle. Also links to stress (HPA axis and cortisol) in the Stress option." } },
  missions: [
    { title: "One EPSP is not enough", q: "Press 'Fire E1' once. How far does the membrane move towards threshold? Does the neuron fire?", hint: "One EPSP lifts the membrane only about 8 mV, well short of the 15 mV needed to reach threshold (−55 mV). Then it leaks back to −70 mV.", setup: () => set({ mode: "synapse" }) },
    { title: "Spatial and temporal summation", q: "Now try 'E1 + E2 together' and then 'E1 three times quickly'. Which reach threshold?", hint: "Both can: spatial summation adds EPSPs from different synapses arriving together; temporal summation adds EPSPs from one synapse arriving in quick succession before each has leaked away.", setup: () => set({ mode: "synapse" }) },
    { title: "Inhibition", q: "Set E1 and E2 firing at 60 Hz so the neuron fires often. Then add the inhibitory synapse. What happens?", hint: "IPSPs push the membrane further from threshold, so the output rate falls or stops. Whether a neuron fires depends on the balance of excitation and inhibition (e.g. GABA is inhibitory).", setup: () => set({ mode: "synapse", r1: 60, r2: 60 }) },
    { title: "An SSRI", q: "With E1 firing at 40 Hz, block reuptake. What happens to the transmitter in the cleft and to the output?", hint: "The transmitter stays in the cleft longer, so each EPSP is bigger and lasts longer, and the postsynaptic neuron fires more. SSRIs (antidepressants) do this for serotonin.", setup: () => set({ mode: "synapse", r1: 40 }) },
    { title: "Fight or flight", q: "Switch to 'fight or flight' and press 'Sudden threat'. Which rises first, adrenaline or cortisol? How long does each last?", hint: "Adrenaline (the SAM pathway) rises within a minute and is gone in about 10. Cortisol (the HPA axis) rises slowly, peaks about 20 minutes after the threat and takes over an hour to fall back. The parasympathetic system then restores rest-and-digest.", setup: () => set({ mode: "stress" }, () => press()) },
    { title: "Chronic stress", q: "Switch on chronic stress. What happens to cortisol over a few hours? Why is that a problem?", hint: "Cortisol stays raised. Short-term it helps (glucose, less inflammation), but long-term high cortisol suppresses the immune system and is linked to heart disease and poor memory.", setup: () => set({ mode: "stress", chronic: true, bspeed: 6 }) },
    { lvl: "adv", title: "Siffre's cave", q: "Switch to 'body clock' and put the person in a cave (no daylight). Watch the actogram: what happens to the time they fall asleep each day?", hint: "It drifts later each day: the endogenous pacemaker (SCN) free-runs at about 24.5 h here. Siffre's sleep–wake cycle settled at a little over 24 hours. Without zeitgebers the clock is not reset.", setup: () => set({ mode: "clock", cave: true, cspeed: 20 }) },
    { lvl: "adv", title: "Jet lag", q: "Live normally for a few days, then fly 8 hours east (press 'Fly east'). How many days until sleep matches the new local time? Then try flying west.", hint: "Flying east needs the clock to ADVANCE, which is harder for a clock that naturally runs slow (τ > 24 h): here it takes well over a week, and longer than the same flight west. Flying west needs a delay, which the clock does more easily. Light is the zeitgeber doing the resetting.", setup: () => set({ mode: "clock", cspeed: 20 }) },
  ],
  batch: [
    { title: "Temporal summation", question: "How fast does the postsynaptic neuron fire when one excitatory synapse fires at different rates?", how: "Each run: 2 s of random (Poisson) impulses at E1 only; counts output action potentials.", xLabel: "E1 firing rate (Hz)", yLabel: "output firing rate (Hz)", xs: [10, 25, 50, 75, 100, 150, 200], reps: 5, yMin: 0, run: (x, r) => outRate(r, [x, 0, 0], { reuptake: 0, antag: 0 }), note: "Low rates do nothing (each EPSP fades before the next arrives). Above a few tens of Hz EPSPs pile up and the neuron starts firing: a threshold effect created by temporal summation." },
    { title: "Inhibition", question: "With E1 and E2 both firing at 60 Hz, how does the output change as the inhibitory synapse fires faster?", how: "Each run: 2 s, Poisson inputs.", xLabel: "inhibitory firing rate (Hz)", yLabel: "output firing rate (Hz)", xs: [0, 20, 40, 60, 80, 100, 140], reps: 5, yMin: 0, run: (x, r) => outRate(r, [60, 60, x], { reuptake: 0, antag: 0 }), note: "Inhibitory input subtracts from excitation. Enough inhibition silences the neuron completely." },
    { title: "Beta-blockers and heart rate", question: "How much does a beta-blocker reduce the peak heart rate after a sudden threat?", how: "Each run: one person (adrenaline and cortisol time constants vary ±20%), a sudden threat at full appraisal; the peak heart rate over the next 20 minutes.", xLabel: "beta-blocker effect (fraction of adrenaline effect blocked)", yLabel: "peak heart rate (bpm)", xs: [0, 0.2, 0.4, 0.6, 0.8], reps: 6, yMin: 60, theory: b => 68 + 85 * (1 - b) * 0.96 / (0.96 + 0.35), theoryLabel: "model, typical person", run: (b, r) => { const k = { a: 1 + 0.2 * (2 * r() - 1), c: 1 + 0.2 * (2 * r() - 1) }, Q = Object.assign({}, DEF, { beta: b }), Bd = newBody(); Bd.pulse = 5; let pk = 0; for (let t = 0; t < 20; t += 0.01) { bodyStep(Bd, 0.01, Q, k); pk = Math.max(pk, heartRate(Bd, Q)); } return pk; }, note: "Beta-blockers stop adrenaline acting on the heart, so the body still releases adrenaline but the heart does not race: used for performance anxiety." },
    { title: "Jet lag: days to re-entrain (A level)", question: "After a flight across time zones, how many days does the body clock take to catch up?", how: "Each run: a clock with τ = 24.5 h entrained to daylight 07:00–22:00, then local time shifts. Positive = east (clock must advance), negative = west (delay). Counts days until sleep is within 1 h of local time.", xLabel: "time zones crossed (+ east, − west)", yLabel: "days to re-entrain", xs: [-9, -6, -3, 3, 6, 9], reps: 4, yMin: 0, run: (x, r) => reentrainDays(r, x, Object.assign({}, DEF)), note: "Eastward flights take longer to recover from than westward ones of the same size: the clock runs slightly slow, so delaying (west) is easier than advancing (east)." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.2.2", text: "Synaptic transmission: impulse reaches the presynaptic terminal → vesicles release neurotransmitter → it diffuses across the cleft → binds to postsynaptic receptors → excitatory (EPSP, more likely to fire) or inhibitory (IPSP, less likely) → transmitter is removed by reuptake or enzymes. Transmission is one way." },
      { lvl: "std", tag: "3.2.2", text: "Summation: the postsynaptic neuron fires only if the summed excitatory and inhibitory inputs reach threshold. Spatial: many synapses at once. Temporal: one synapse firing rapidly." },
      { lvl: "std", tag: "3.2.2", text: "Fight or flight: amygdala → hypothalamus → sympathetic nervous system → adrenal medulla → adrenaline: heart rate, breathing, glucose and pupils increase, digestion and saliva decrease. The parasympathetic nervous system restores rest and digest." },
      { lvl: "std", tag: "3.2.2", text: "Endocrine system: glands release hormones into the blood (slower but longer-lasting than nerves). Pituitary = the 'master gland'. HPA axis: CRH → ACTH → cortisol, controlled by negative feedback." },
      { lvl: "adv", tag: "3.2.2", text: "Biological rhythms: circadian (about 24 h, e.g. sleep–wake), ultradian (< 24 h, e.g. sleep stages ~90 min), infradian (> 24 h, e.g. menstrual cycle, SAD). Endogenous pacemaker: the SCN. Exogenous zeitgebers: light (via the retina and melanopsin), social cues." },
      { lvl: "adv", tag: "3.2.2", text: "Evidence: Siffre (cave) free-running cycle a little over 24 h; Aschoff and Wever's bunker; DeCoursey's chipmunks (SCN destroyed). Evaluation: case studies, individual differences, artificial light in 'isolation' studies." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain the process of synaptic transmission.", ans: "<ul><li>an electrical impulse arrives at the presynaptic terminal</li><li>vesicles release neurotransmitter into the synaptic cleft</li><li>it diffuses across and binds to receptors on the postsynaptic membrane</li><li>this is excitatory or inhibitory, making the postsynaptic neuron more or less likely to fire; the transmitter is then removed (reuptake)</li></ul>" },
      { lvl: "std", marks: 4, q: "Outline the fight-or-flight response, including the role of adrenaline.", ans: "<ul><li>a threat is detected (amygdala) and the hypothalamus activates the sympathetic nervous system</li><li>the adrenal medulla releases adrenaline into the bloodstream</li><li>adrenaline increases heart rate and breathing, raises blood glucose, dilates pupils and slows digestion</li><li>when the threat passes the parasympathetic nervous system returns the body to rest and digest</li></ul>" },
      { lvl: "adv", marks: 4, q: "Using research, explain the roles of endogenous pacemakers and exogenous zeitgebers in the sleep–wake cycle.", ans: "<ul><li>the SCN is the main endogenous pacemaker, setting a free-running rhythm slightly longer than 24 h</li><li>Siffre's cave study: without daylight his cycle free-ran at just over 24 h</li><li>light is the main exogenous zeitgeber, resetting the SCN each day via the retina</li><li>e.g. jet lag: the rhythm takes days to re-entrain to new light cues; the two work together</li></ul>" },
    ]
  },
  notes: `<h3>The models</h3><ul><li><b>Synapse:</b> each presynaptic impulse releases a packet of transmitter that is cleared with a time constant of 1.5 ms (longer if reuptake is blocked). Bound transmitter pushes the membrane up (E1, E2) or down (I). The membrane leaks back to −70 mV with a 10 ms time constant; at −55 mV it fires an action potential (shown as a spike to +40 mV) and is refractory for 2 ms. An antagonist blocks a fraction of the excitatory receptors.</li><li><b>Fight or flight:</b> five linked first-order equations: hypothalamic stress signal → sympathetic activity (≈10 s) → adrenaline (≈1.5 min); CRH (3 min) → ACTH (8 min) → cortisol (30 min), with cortisol reducing CRH (negative feedback). Heart rate and glucose follow adrenaline (and cortisol). The numbers are relative, chosen to give realistic timings.</li><li><b>Body clock:</b> a phase oscillator with free-running period τ, reset by light through a phase response curve (light early in the subjective night delays the clock, late in the night advances it). The person sleeps for 8 of every 24 circadian hours and only sees light when awake.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Real neurons have thousands of synapses, dendrites that filter inputs and many transmitters and receptor types.</li><li>The stress model ignores individual differences in appraisal beyond one slider, and leaves out other hormones (e.g. noradrenaline, oxytocin in 'tend and befriend').</li><li>The body clock leaves out the homeostatic sleep drive, melatonin and social zeitgebers, and light intensity effects are simplified.</li></ul>`,
});

// ---------------- 6. Controls ----------------
const C = {};
let g = ui.group("Topic");
C.mode = K.seg(g, { value: "synapse", options: [["synapse", "synapse"], ["stress", "fight or flight"], ["clock", "body clock (A level)"]], on: v => set({ mode: v }) });
const gs = ui.group("Synapse");
let rw = K.row(gs); K.btn(rw, "Fire E1", () => release(N, 0)); K.btn(rw, "E1 + E2 together", () => { release(N, 0); release(N, 1); }); K.btn(rw, "E1 ×3 quickly", () => { release(N, 0); N.queue.push([N.t + 3, 0], [N.t + 6, 0]); }); K.btn(rw, "Fire I", () => release(N, 2));
C.r1 = K.slider(gs, { label: "E1 firing rate (excitatory)", min: 0, max: 200, step: 5, value: 0, unit: "Hz", on: v => P.r1 = v });
C.r2 = K.slider(gs, { label: "E2 firing rate (excitatory)", min: 0, max: 200, step: 5, value: 0, unit: "Hz", on: v => P.r2 = v });
C.rI = K.slider(gs, { label: "I firing rate (inhibitory)", min: 0, max: 200, step: 5, value: 0, unit: "Hz", on: v => P.rI = v });
C.reuptake = K.slider(gs, { label: "Reuptake blocked (e.g. an SSRI)", min: 0, max: 1, step: 0.05, value: 0, fmt: v => Math.round(100 * v) + "%", on: v => P.reuptake = v });
C.antag = K.slider(gs, { label: "Excitatory receptors blocked (antagonist drug)", min: 0, max: 1, step: 0.05, value: 0, fmt: v => Math.round(100 * v) + "%", on: v => P.antag = v });
C.sspeed = K.slider(gs, { label: "Speed (milliseconds per second)", min: 2, max: 200, step: 1, value: 25, on: v => P.sspeed = v });
ui.headerSpeed(C.sspeed);   // playback speed lives in the header, beside Pause and Reset
const gb = ui.group("Fight or flight");
const press = () => { B.pulse = 5; }; rw = K.row(gb);   // a threat lasts 5 minutes
 K.btn(rw, "⚡ Sudden threat", press, "primary");
C.threat = K.slider(gb, { label: "Size of the threat", min: 0.2, max: 1.5, step: 0.1, value: 1, on: v => P.threat = v });
C.appraisal = K.slider(gb, { label: "How threatening it seems (appraisal)", min: 0, max: 1.5, step: 0.1, value: 1, on: v => P.appraisal = v });
C.chronic = K.toggle(gb, { label: "Chronic stress (it never goes away)", value: false, on: v => P.chronic = v });
C.fb = K.slider(gb, { label: "Cortisol negative feedback strength", min: 0, max: 3, step: 0.1, value: 1, on: v => P.fb = v });
C.beta = K.slider(gb, { label: "Beta-blocker (blocks adrenaline at the heart)", min: 0, max: 0.9, step: 0.1, value: 0, fmt: v => Math.round(100 * v) + "%", on: v => P.beta = v });
C.bspeed = K.slider(gb, { label: "Speed (minutes per second)", min: 0.1, max: 10, step: 0.1, value: 1.5, on: v => P.bspeed = v });
ui.headerSpeed(C.bspeed);   // playback speed lives in the header, beside Pause and Reset
const gc = ui.group("Body clock");
C.tau = K.slider(gc, { label: "Free-running period τ of the SCN", min: 23.5, max: 25.5, step: 0.1, value: 24.5, unit: "h", on: v => P.tau = v });
C.cave = K.toggle(gc, { label: "Live in a cave (no daylight, like Siffre)", value: false, on: v => P.cave = v });
C.light = K.slider(gc, { label: "Strength of daylight as a zeitgeber", min: 0, max: 2, step: 0.1, value: 1, on: v => P.light = v });
rw = K.row(gc); K.btn(rw, "✈ Fly 8 h east", () => { P.shift += 8; flights.push([CL.t, "+8 h"]); }); K.btn(rw, "✈ Fly 8 h west", () => { P.shift -= 8; flights.push([CL.t, "−8 h"]); });
C.cspeed = K.slider(gc, { label: "Speed (hours per second)", min: 1, max: 60, step: 1, value: 3, on: v => P.cspeed = v });
ui.headerSpeed(C.cspeed);   // playback speed lives in the header, beside Pause and Reset
K.row(ui.controls); K.btn(ui.controls, "Start again", () => restart(), "danger");
const read = K.readout(ui.group("Now"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gs.style.display = P.mode === "synapse" ? "" : "none"; gb.style.display = P.mode === "stress" ? "" : "none"; gc.style.display = P.mode === "clock" ? "" : "none"; C.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; if (P.mode === "clock" && ui.level !== "adv") set({ mode: "synapse" }); }
function set(o, then) { Object.assign(P, DEF, o); for (const k of ["mode", "r1", "r2", "rI", "reuptake", "antag", "sspeed", "threat", "appraisal", "chronic", "fb", "beta", "bspeed", "tau", "cave", "light", "cspeed"]) C[k].set(P[k]); showCtl(); restart(); if (then) then(); }
ui.onLevel = showCtl;

// ---------------- 7. Running ----------------
let accC = 0;
function tick(dt) {
  if (P.mode === "synapse") {
    const ms = dt * P.sspeed, h = 0.05;
    for (let t = 0; t < ms; t += h) {
      const rates = [P.r1, P.r2, P.rI]; for (let s = 0; s < 3; s++) if (rand() < rates[s] * h / 1000) release(N, s);
      while (N.queue.length && N.queue[0][0] <= N.t) release(N, N.queue.shift()[1]);
      synStep(N, h, P); if (Math.round(N.t / h) % 4 === 0) { Vtr.push([N.t, N.V]); Ntr.push([N.t, N.N[0], N.N[1], N.N[2]]); }
    }
    while (Vtr.length && Vtr[0][0] < N.t - 120) Vtr.shift(); while (Ntr.length && Ntr[0][0] < N.t - 120) Ntr.shift();
  } else if (P.mode === "stress") {
    const mins = dt * P.bspeed; for (let t = 0; t < mins; t += 0.01) bodyStep(B, 0.01, P);
    B.hist.push([B.t, B.adr, B.cort, heartRate(B, P), glucose(B)]); while (B.hist.length && B.hist[0][0] < B.t - 240) B.hist.shift();
  } else {
    accC += dt * P.cspeed; const h = 0.1;   // the rows of the actogram follow LOCAL time (it changes after a flight)
    while (accC >= h) { accC -= h; const lday = t => Math.floor((t + P.shift) / 24), day = lday(CL.t); clockStep(CL, h, P); const hr = ((CL.t + P.shift) % 24 + 24) % 24; if (!CL.awake) CL.cur.sleep.push(hr); if (dayLight(CL.t, P) && !P.cave) CL.cur.light.push(hr); if (lday(CL.t) !== day) { CL.days.push(CL.cur); CL.cur = { sleep: [], light: [] }; if (CL.days.length > 60) CL.days.shift(); } }
  }
}

// ---------------- 8. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawSynapse(c, w, h) {
  // three presynaptic terminals on the left, each with a cleft full of transmitter, onto one postsynaptic neuron
  const px = w * 0.62, py = h * 0.5, R = Math.min(w, h) * 0.17;
  c.fillStyle = "#1d2b4a"; c.beginPath(); c.arc(px, py, R, 0, 6.3); c.fill(); c.strokeStyle = "#5d6e93"; c.stroke();
  TX(c, "postsynaptic neuron", px, py - R - 10, "#c9d4ea", "center", "600 12px");
  // axon hillock and axon leaving to the right; flashes when the neuron fires
  const fired = N.spikes.length && N.t - N.spikes[N.spikes.length - 1] < 2.5;
  c.strokeStyle = fired ? "#ffd166" : "#5d6e93"; c.lineWidth = fired ? 8 : 6; c.beginPath(); c.moveTo(px + R, py); c.lineTo(w - 20, py); c.stroke(); c.lineWidth = 1;
  TX(c, fired ? "ACTION POTENTIAL →" : "axon", w - 24, py - 14, fired ? "#ffd166" : "#8fa0bf", "right", "600 12px");
  // the membrane potential as a colour inside the cell
  const f = Math.max(0, Math.min(1, (N.V - VREST + 10) / 25)); c.fillStyle = `rgba(${Math.round(90 + 165 * f)},${Math.round(120 + 60 * f)},${Math.round(255 - 180 * f)},0.35)`; c.beginPath(); c.arc(px, py, R - 4, 0, 6.3); c.fill();
  TX(c, `${N.V.toFixed(1)} mV`, px, py + 6, "#fff", "center", "700 18px"); TX(c, `threshold −55 mV`, px, py + 26, "#8fa0bf", "center", "11px");
  for (let s = 0; s < 3; s++) {
    const ang = Math.PI * (0.78 + 0.22 * (s - 1)), tx = px + (R + 26) * Math.cos(ang), ty = py + (R + 26) * Math.sin(ang), sx = 30, sy = py + (s - 1) * h * 0.3;
    c.strokeStyle = SYN[s].col; c.lineWidth = 4; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + tx) / 2, sy, tx, ty); c.stroke(); c.lineWidth = 1;
    c.fillStyle = SYN[s].col; c.beginPath(); c.arc(tx, ty, 14, 0, 6.3); c.fill();   // presynaptic terminal (bouton)
    TX(c, SYN[s].name + (SYN[s].ex ? " excitatory" : " inhibitory"), sx, sy - 10, SYN[s].col, "left", "600 12px");
    // transmitter molecules in the cleft: more dots = more transmitter
    const n = Math.min(40, Math.round(N.N[s] * 14)), mx = (tx + px + (R) * Math.cos(ang)) / 2, my = (ty + py + R * Math.sin(ang)) / 2;
    for (let i = 0; i < n; i++) { const a = i * 2.39, rr = 3 + 2.2 * Math.sqrt(i); c.fillStyle = SYN[s].ex ? "#ffd166" : "#ff9aa9"; c.beginPath(); c.arc(mx + rr * Math.cos(a), my + rr * Math.sin(a), 1.8, 0, 6.3); c.fill(); }
  }
  TX(c, "dots in each gap = neurotransmitter in the synaptic cleft", 20, h - 14, "#8fa0bf", "left", "12px");
  ui.hud(`${N.out} action potentials · t = ${N.t.toFixed(0)} ms`);
}
function drawBody(c, w, h) {
  // a simple figure with the two pathways: SAM (left, fast) and HPA (right, slow)
  const cx = w * 0.3, top = 30, glow = (x, y, r, k, col, lab, al = "center") => { c.fillStyle = col; c.globalAlpha = 0.25 + 0.75 * Math.min(1, k); c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.globalAlpha = 1; if (lab) TX(c, lab, x + (al === "left" ? r + 6 : al === "right" ? -r - 6 : 0), y + (al === "center" ? r + 14 : 4), "#c9d4ea", al, "12px"); };
  c.strokeStyle = "#3a4a6c"; c.lineWidth = 2; c.beginPath(); c.arc(cx, top + 50, 45, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(cx, top + 95); c.lineTo(cx, h - 120); c.moveTo(cx - 70, top + 140); c.lineTo(cx + 70, top + 140); c.moveTo(cx, h - 120); c.lineTo(cx - 50, h - 30); c.moveTo(cx, h - 120); c.lineTo(cx + 50, h - 30); c.stroke(); c.lineWidth = 1;
  glow(cx, top + 48, 10, B.s, "#ffd166", "hypothalamus", "right"); glow(cx + 14, top + 66, 7, B.acth * 2, "#b388ff", "pituitary (ACTH)", "left");
  const hrB = heartRate(B, P), beat = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * hrB / 60 * 2 * Math.PI);   // beats in real time
  glow(cx - 14, top + 165, 12 + 3 * beat, (hrB - 68) / 70, "#ff6b81", `heart ${hrB.toFixed(0)} bpm`, "right");
  glow(cx - 22, top + 225, 9, B.adr, "#5ad1ff", "adrenal medulla → adrenaline", "right"); glow(cx + 22, top + 225, 9, (B.cort - 0.1) * 2, "#b388ff", "adrenal cortex → cortisol", "left");
  glow(cx + 8, top + 280, 11, 1 - B.sym, "#7ee787", "digestion (parasympathetic)", "left");
  // the pathway labels
  const x2 = w * 0.6; let y = 40; const ln = (s, col = "#c9d4ea", f = "13px") => { TX(c, s, x2, y, col, "left", f); y += 21; };
  ln("FAST: sympathomedullary pathway", "#5ad1ff", "700 13px"); ln("hypothalamus → sympathetic nervous system"); ln("→ adrenal medulla → adrenaline"); ln(`adrenaline ${B.adr.toFixed(2)}  (heart, breathing, glucose ↑)`, "#fff");
  y += 10; ln("SLOW: HPA axis", "#b388ff", "700 13px"); ln("hypothalamus (CRH) → pituitary (ACTH)"); ln("→ adrenal cortex → cortisol"); ln(`CRH ${B.crh.toFixed(2)} · ACTH ${B.acth.toFixed(2)} · cortisol ${B.cort.toFixed(2)}`, "#fff"); ln("cortisol damps CRH: negative feedback", "#8fa0bf", "12px");
  y += 10; ln(`blood glucose ${glucose(B).toFixed(1)} mmol/L`, "#ffd166", "600 13px"); ln(B.sym > 0.3 ? "SYMPATHETIC: fight or flight" : "PARASYMPATHETIC: rest and digest", B.sym > 0.3 ? "#ff9aa9" : "#7ee787", "700 14px");
  ui.hud(`time ${Math.floor(B.t / 60)} h ${Math.floor(B.t % 60)} min${P.chronic ? " · chronic stress" : ""}`);
}
function drawClock(c, w, h) {
  // the actogram: one row per day (newest at the bottom), 0–24 h across. Yellow = daylight; dark blue bar = asleep.
  const L = 60, R = w - 20, T = 40, rows = 30, rh = (h - T - 40) / rows, X = hr => L + hr / 24 * (R - L);
  TX(c, "Actogram: each row is one day (clock time across). Yellow = daylight, blue = asleep.", L, 22, "#c9d4ea", "left", "600 12px");
  for (let k = 0; k <= 24; k += 3) { TX(c, String(k).padStart(2, "0") + ":00", X(k), h - 22, "#8fa0bf", "center", "11px"); c.strokeStyle = "#1f2b45"; c.beginPath(); c.moveTo(X(k), T); c.lineTo(X(k), T + rows * rh); c.stroke(); }
  const all = CL.days.concat([CL.cur]).slice(-rows);
  all.forEach((d, i) => { const y = T + i * rh; c.fillStyle = "rgba(255,209,102,0.25)"; for (const hr of d.light) c.fillRect(X(hr), y, (R - L) * 0.1 / 24 + 0.6, rh - 1); c.fillStyle = "#5ad1ff"; for (const hr of d.sleep) c.fillRect(X(hr), y + rh * 0.2, (R - L) * 0.1 / 24 + 0.6, rh * 0.6); TX(c, "day " + (CL.days.length - all.length + i + 2), L - 6, y + rh * 0.75, "#8fa0bf", "right", "10px"); });
  const ct = ((CL.phi % 24) + 24) % 24, lt = ((CL.t + P.shift) % 24 + 24) % 24;
  ui.hud(`local time ${String(Math.floor(lt)).padStart(2, "0")}:${String(Math.floor((lt % 1) * 60)).padStart(2, "0")} · ${CL.awake ? "awake" : "asleep"}${P.cave ? " · in the cave" : ""}${P.shift ? ` · ${P.shift > 0 ? "+" : ""}${P.shift} h from home` : ""}`);
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (P.mode === "synapse") drawSynapse(c, w, h); else if (P.mode === "stress") drawBody(c, w, h); else drawClock(c, w, h); }
function panels() {
  chA.opts.xFmt = chB.opts.xFmt = null;
  if (P.mode === "synapse") {
    relabel(["Membrane potential", "Action potentials", "Output rate (last 100 ms)"]); read.set("a", N.V.toFixed(1) + " mV"); read.set("b", N.out); read.set("c", (N.spikes.filter(t => t > N.t - 100).length * 10) + " Hz");
    chA.opts.title = "Postsynaptic membrane potential (last 120 ms)"; chA.opts.xLabel = "time (ms)"; chA.opts.yLabel = "mV"; chA.draw([{ pts: Vtr, color: K.cssVar("--s0") }], { yMin: -80, yMax: 45, hlines: [{ y: VTH, label: "threshold", color: K.cssVar("--s3") }, { y: VREST, label: "resting" }] });
    chB.opts.title = "Neurotransmitter in each synaptic cleft"; chB.opts.xLabel = "time (ms)"; chB.opts.yLabel = "amount"; chB.draw(SYN.map((s, i) => ({ pts: Ntr.map(q => [q[0], q[i + 1]]), color: s.col, label: s.name })), { yMin: 0 });
  } else if (P.mode === "stress") {
    relabel(["Heart rate", "Adrenaline", "Cortisol"]); read.set("a", heartRate(B, P).toFixed(0) + " bpm"); read.set("b", B.adr.toFixed(2)); read.set("c", B.cort.toFixed(2));
    chA.opts.title = "Hormones in the blood (relative)"; chA.opts.xLabel = "time (minutes)"; chA.opts.yLabel = "level"; chA.draw([{ pts: B.hist.map(q => [q[0], q[1]]), color: "#5ad1ff", label: "adrenaline (SAM)" }, { pts: B.hist.map(q => [q[0], q[2]]), color: "#b388ff", label: "cortisol (HPA)" }], { yMin: 0 });
    chB.opts.title = "Heart rate"; chB.opts.xLabel = "time (minutes)"; chB.opts.yLabel = "beats per minute"; chB.draw([{ pts: B.hist.map(q => [q[0], q[3]]), color: "#ff6b81" }], { yMin: 50, yMax: 160 });
  } else {
    const ct = ((CL.phi % 24) + 24) % 24; relabel(["Day", "Clock's own time (ct)", "Free-running period τ"]); read.set("a", Math.floor(CL.t / 24) + 1); read.set("b", ct.toFixed(1) + " h"); read.set("c", P.tau + " h");
    // sleep onset (local clock time) for each day: flat when entrained, drifting when free-running
    const on = []; CL.days.forEach((d, i) => { if (!d.sleep.length) return; const srt = [...d.sleep].sort((a, b) => a - b); let best = srt[0]; for (let k = 1; k < srt.length; k++) if (srt[k] - srt[k - 1] > 0.15) { best = srt[k]; break; } on.push([i + 1, best]); });
    chA.opts.title = "Time of falling asleep each day (clock time)"; chA.opts.xLabel = "day"; chA.opts.yLabel = "hour"; chA.draw([{ pts: on, type: "dots", r: 3, color: K.cssVar("--s0") }], { yMin: 0, yMax: 24 });
    const pts = []; for (let x = 0; x < 24; x += 0.25) pts.push([x, PRC(x)]); chB.opts.title = "Phase response curve: effect of light at each circadian time"; chB.opts.xLabel = "circadian time (0 = clock's morning)"; chB.opts.yLabel = "shift (+ advance, − delay)"; chB.draw([{ pts, color: K.cssVar("--s1") }], { yMin: -1.1, yMax: 1.1, vlines: [{ x: ct, label: "now" }], hlines: [{ y: 0 }] });
  }
}
let frame = 0;
ui.run(tick, () => { draw(); if (frame++ % 6 === 0) panels(); });
set({});
ui.tip("Press 'Fire E1' and watch the membrane potential. Then try the summation buttons.", 7000);
