/* =====================================================================
   SUPERMARKET QUEUES
   Customers arrive at random moments and take a random time to serve.
   Even when the tills could keep up ON AVERAGE, queues form, because
   sometimes several people turn up at once, or one person takes ages.
   As the tills get busier (the utilisation ρ approaches 1) the waiting
   time does not grow steadily: it explodes.

   The model is a discrete-event simulation: the clock jumps from one
   event (an arrival, or a till finishing) to the next. Theory to compare:
     ρ = λ ÷ (c μ)            utilisation: λ arrivals a minute, c tills, μ = 1 ÷ mean service time
     Erlang C                  the chance of having to wait, and the mean wait, for c tills
     Pollaczek–Khinchine       one till: Wq = ρ ÷ (1 − ρ) × (1 + CV²) ÷ 2 × mean service time
     Little's law              people waiting = λ × mean wait
   ===================================================================== */

// ---- random service times: a gamma distribution with the chosen mean and coefficient of variation (CV = SD ÷ mean) ----
function gammaRand(k, r) {     // Marsaglia and Tsang's method, shape k
  if (k < 1) return gammaRand(k + 1, r) * Math.pow(r() || 1e-12, 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { x = r.gauss(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; }
}
const serviceTime = (mean, cv, r) => cv < 0.02 ? mean : gammaRand(1 / (cv * cv), r) * mean * cv * cv;

// ---- theory ----
function erlangC(lam, mu, c) {   // chance an arriving customer has to wait, with c servers (M/M/c)
  const a = lam / mu; if (a >= c) return 1; let s = 0, term = 1; for (let k = 0; k < c; k++) { if (k) term *= a / k; s += term; } const last = term * a / c * c / (c - a); return last / (s + last);
}
function theoryWq(o) {   // mean wait in the queue (minutes), M/G/c with the Allen–Cunneen correction for service variability
  const mu = 1 / o.svc; if (o.lam >= o.c * mu) return Infinity; return erlangC(o.lam, mu, o.c) / (o.c * mu - o.lam) * (1 + o.cv * o.cv) / 2;
}
const theoryPwait = (o, t) => { const mu = 1 / o.svc; if (o.lam >= o.c * mu) return 1; return erlangC(o.lam, mu, o.c) * Math.exp(-(o.c * mu - o.lam) * t / ((1 + o.cv * o.cv) / 2)); };   // chance of waiting longer than t

/* ---- the shop ----
   o = { lam (arrivals a minute), svc (mean service, min), cv, c (tills), layout: "sep" (a queue per till) or "snake" (one shared queue),
         jockey (switch to a shorter queue), rush (lunchtime peak), balk (give up if more than this many are ahead; 0 = never) } */
class Shop {
  constructor(o, r) {
    this.o = Object.assign({ lam: 1.2, svc: 2, cv: 1, c: 3, layout: "sep", jockey: false, rush: false, balk: 0, day: 480 }, o); this.r = r;
    this.t = 0; this.tills = Array.from({ length: this.o.c }, () => ({ cur: null, end: Infinity, q: [] })); this.snake = []; this.all = []; this.lost = 0; this.id = 0;
    this.lamMax = this.o.lam * (this.o.rush ? 2.5 : 1); this.nextArr = this.gap(); this.qArea = 0;
  }
  lamAt(t) { return this.o.rush ? this.o.lam * (1 + 1.5 * Math.exp(-Math.pow(((t % this.o.day) - this.o.day * 0.55) / 45, 2))) : this.o.lam; }   // a lunchtime rush peaking at 2.5 × the usual rate
  gap() { return -Math.log(1 - this.r()) / this.lamMax; }
  waiting() { return this.o.layout === "snake" ? this.snake.length : this.tills.reduce((s, k) => s + k.q.length, 0); }
  start(cu, ti) { const k = this.tills[ti]; cu.ts = this.t; cu.till = ti; k.cur = cu; k.end = this.t + serviceTime(this.o.svc, this.o.cv, this.r); cu.te = k.end; }
  arrive() {
    const o = this.o, cu = { id: this.id++, ta: this.t, ts: null, te: null, till: -1, lane: -1 };
    // thinning: arrivals come at the peak rate and some are skipped, so the rate follows the time of day
    if (this.r() > this.lamAt(this.t) / this.lamMax) return null;
    if (o.layout === "snake") {
      if (o.balk && this.snake.length >= o.balk) { this.lost++; return null; }
      this.all.push(cu); const free = this.tills.findIndex(k => !k.cur); if (free >= 0) this.start(cu, free); else { cu.lane = 0; this.snake.push(cu); }
    } else {
      // choose the queue with fewest people in it (counting the one being served); ties broken at random
      let best = [], m = Infinity; this.tills.forEach((k, i) => { const n = k.q.length + (k.cur ? 1 : 0); if (n < m) { m = n; best = [i]; } else if (n === m) best.push(i); });
      if (o.balk && m > o.balk) { this.lost++; return null; }
      this.all.push(cu); const i = best[this.r.int(best.length)]; if (!this.tills[i].cur) this.start(cu, i); else { cu.lane = i; this.tills[i].q.push(cu); }
    }
    return cu;
  }
  finish(i) {
    const k = this.tills[i], o = this.o; k.cur = null; k.end = Infinity;
    if (o.layout === "snake") { if (this.snake.length) this.start(this.snake.shift(), i); return; }
    if (k.q.length) { this.start(k.q.shift(), i); return; }
    if (o.jockey) {   // the last person in the longest queue walks across to the free till
      let j = -1, m = 0; this.tills.forEach((x, n) => { if (x.q.length > m) { m = x.q.length; j = n; } }); if (j >= 0) { const cu = this.tills[j].q.pop(); cu.jumped = true; this.start(cu, i); }
    }
  }
  advance(T) {   // run the clock forward to time T, event by event
    for (;;) {
      let ti = -1, te = this.nextArr; this.tills.forEach((k, i) => { if (k.end < te) { te = k.end; ti = i; } });
      if (te > T) { this.qArea += this.waiting() * (T - this.t); this.t = T; return; }
      this.qArea += this.waiting() * (te - this.t); this.t = te;
      if (ti < 0) { this.arrive(); this.nextArr = this.t + this.gap(); } else this.finish(ti);
    }
  }
  // results for customers who arrived between t0 and t1 and have started being served
  stats(t0 = 0, t1 = Infinity) {
    const cs = this.all.filter(cu => cu.ts != null && cu.ta >= t0 && cu.ta < t1), w = cs.map(cu => cu.ts - cu.ta).sort((a, b) => a - b);
    // overtaken: someone who arrived after you started being served before you
    const byA = this.all.slice().sort((a, b) => a.ta - b.ta); let minLater = Infinity, over = 0, n = 0; for (let k = byA.length - 1; k >= 0; k--) { const cu = byA[k]; const s = cu.ts == null ? Infinity : cu.ts; if (cu.ta >= t0 && cu.ta < t1 && cu.ts != null) { n++; if (minLater < s) over++; } if (s < minLater) minLater = s; }
    return { n: w.length, mean: K.mean(w), p95: w.length ? w[Math.floor(0.95 * (w.length - 1))] : 0, max: w.length ? w[w.length - 1] : 0, under5: w.length ? w.filter(x => x < 5).length / w.length : 1, over: n ? over / n : 0, waits: w };
  }
}
// a long run for the batch: 60 minutes to warm up, then measure
function longRun(o, r, mins = 2400) { const s = new Shop(o, r); s.advance(60); const a0 = s.qArea; s.advance(60 + mins); const st = s.stats(60, 60 + mins); st.Lq = (s.qArea - a0) / mins; return st; }
function oneDay(o, r) { const s = new Shop(Object.assign({ day: 480 }, o), r); s.advance(480); s.o.lam = 0; s.lamMax = 1e-9; s.nextArr = Infinity; s.advance(2000); return s.stats(0, 480); }   // the doors close at 8 hours, everyone inside is served

// ---------------- The page ----------------
const P = { lam: 1.2, svc: 2, cv: 1, c: 3, layout: "sep", jockey: false, rush: false, balk: 0 };
let rnd = K.rng(Date.now() % 99991 + 23), shop, speed = 1, log = [], walkers = [], peeps = new Map();
const ui = K.app({
  title: "Supermarket Queues", subject: "Statistics",
  blurb: "Random arrivals, random service, and why waits explode as the tills get busy",
  reset: () => set({}),
  missions: [
    { title: "Busy but coping?", q: "Three tills, a customer every 50 seconds or so (1.2 a minute), 2 minutes each to serve. The tills are busy 80% of the time. Why does anyone have to wait at all, if the tills can serve 1.5 a minute?", hint: "Arrivals are random: sometimes three people arrive in a minute, sometimes nobody for three minutes. Service times vary too. The tills cannot store up their idle time for later, so a burst of customers has to queue. The mean wait is about 2 minutes here, matching the Erlang C formula.", setup() { set({}); } },
    { title: "Close to the limit", q: "Push the arrival rate up to 1.4 a minute (ρ = 0.93). What happens to the waits? Now add a fourth till. How much difference does one till make?", hint: "Waiting time is roughly proportional to 1 ÷ (1 − ρ), so it shoots up as ρ approaches 1: at ρ = 0.93 the mean wait is about 6 minutes, with long spells far worse. One extra till drops ρ to 0.7 and the wait to under a minute. Small changes in capacity matter enormously near the limit.", setup() { set({ lam: 1.4 }); } },
    { title: "One snake or separate queues?", q: "Watch separate queues for a few minutes, then switch to one snake queue feeding all the tills (as at a bank or airport). Compare the mean wait, the longest wait and the 'overtaken' readout.", hint: "With separate queues you can get stuck behind someone slow while another queue races ahead: a third or more of customers are overtaken by someone who arrived later. One snake queue is first come, first served: nobody is overtaken, the longest waits are much shorter and the mean is a little lower too, because no till sits idle while people wait elsewhere.", setup() { set({ lam: 1.3 }); } },
    { title: "Does variability matter?", q: "One till, a customer every 2.5 minutes, 2 minutes each: ρ = 0.8. Set the service variability (CV) to 0 (every customer takes exactly 2 minutes), then 1, then 2. What happens to the wait?", hint: "The utilisation is the same each time, but the wait grows with the variability: Wq = ρ ÷ (1 − ρ) × (1 + CV²) ÷ 2 × service time. CV 0 gives 4 minutes, CV 1 gives 8, CV 2 gives 20. Express tills work partly by separating quick customers from slow ones, cutting the variability.", setup() { set({ c: 1, lam: 0.4, cv: 0 }); } },
    { title: "Lunchtime rush", q: "Turn on the lunchtime rush: the arrival rate peaks at 2.5 times the usual around 1 pm. Watch the 'people waiting' graph. When is the queue longest: at the peak, or after it?", hint: "The queue keeps growing for as long as people arrive faster than the tills can serve them, so it is longest AFTER the peak in arrivals, and takes a long time to clear. Staff need to open extra tills before the rush, not when the queue is already long.", setup() { set({ rush: true, lam: 0.9, speed: 15 }); } },
    { title: "Giving up", q: "Push the shop into overload (2 customers a minute for 3 tills: ρ = 1.33), then let customers give up if more than 5 people are ahead of them. What happens to the queue and the waits?", hint: "Without giving up, an overloaded queue grows without limit. When customers walk away (balking), the queue stays bounded and the people who stay wait less, but the shop loses sales: count the customers lost. Real shops face exactly this trade-off.", setup() { set({ lam: 2, balk: 0, speed: 4 }); } },
    { title: "Jockeying", q: "With separate queues, let customers switch to a till that has just become free. Does it help as much as a snake queue?", hint: "Jockeying stops tills sitting idle while people wait, so the mean wait gets close to the snake queue's. But it is still unfair: the person who jumps gets ahead of people who arrived before them.", setup() { set({ lam: 1.3, jockey: true }); } }
  ],
  batch: [
    { title: "Why do queues explode as ρ → 1?", question: "How does the mean wait depend on how busy the tills are?", how: "3 tills, 2-minute service (CV 1), one snake queue; arrival rate from 0.3 to 1.4 a minute (ρ from 0.2 to 0.93). Each run: 60 minutes to warm up, then 40 hours measured. Theory: Erlang C.", xLabel: "arrival rate λ (per minute)", yLabel: "mean wait (minutes)", xs: [0.3, 0.5, 0.7, 0.9, 1.0, 1.1, 1.2, 1.3, 1.35, 1.4], reps: 4, yMin: 0, theory: x => theoryWq({ lam: x, svc: 2, cv: 1, c: 3 }), theoryLabel: "Erlang C", run: (x, r) => longRun({ lam: x, svc: 2, cv: 1, c: 3, layout: "snake" }, r).mean, note: "Flat at first, then a steep climb: the wait goes as roughly 1 ÷ (1 − ρ). Close to ρ = 1 single runs scatter wildly, because a long queue, once formed, takes a long time to clear." },
    { title: "How much does one day vary?", question: "With the same settings every day, how much does the mean wait differ from day to day?", how: "300 eight-hour days, 3 tills, λ = 1.2 a minute, 2-minute service (ρ = 0.8), separate queues.", reps: 300, bins: 24, theory: theoryWq({ lam: 1.2, svc: 2, cv: 1, c: 3 }), theoryLabel: "Erlang C (one snake)", yLabel: "mean wait in a day (minutes)", run: (x, r) => oneDay({ lam: 1.2, svc: 2, cv: 1, c: 3, layout: "sep" }, r).mean, note: "Most days are close to the average, but a few bad days are much worse (a long right tail): one unlucky burst early on can spoil the whole day. Separate queues sit a little above the snake-queue theory." },
    { title: "Separate queues against one snake", question: "How much longer is the wait with a queue per till than with one shared snake queue?", how: "3 tills, 2-minute service, separate queues (people join the shortest, no switching); arrival rate swept. The dashed line is the theory for ONE snake queue.", xLabel: "arrival rate λ (per minute)", yLabel: "mean wait (minutes)", xs: [0.6, 0.8, 1.0, 1.1, 1.2, 1.3, 1.35], reps: 4, yMin: 0, theory: x => theoryWq({ lam: x, svc: 2, cv: 1, c: 3 }), theoryLabel: "one snake (Erlang C)", run: (x, r) => longRun({ lam: x, svc: 2, cv: 1, c: 3, layout: "sep" }, r).mean, note: "Separate queues are always a little slower, because a till can sit idle while people wait in another queue." },
    { title: "How often are you overtaken?", question: "With separate queues, what share of customers are served after someone who arrived later?", how: "3 tills, 2-minute service, separate queues; arrival rate swept. With one snake queue the answer would always be 0%.", xLabel: "arrival rate λ (per minute)", yLabel: "customers overtaken (%)", xs: [0.4, 0.6, 0.8, 1.0, 1.2, 1.3, 1.4], reps: 4, yMin: 0, run: (x, r) => 100 * longRun({ lam: x, svc: 2, cv: 1, c: 3, layout: "sep" }, r).over, note: "The busier the shop, the more often the queue you chose turns out slower than the one next to it." },
    { title: "Does variability matter?", question: "With one till at ρ = 0.8, how does the wait depend on the variability of service times?", how: "One till, λ = 0.4 a minute, 2-minute service; CV from 0 (all the same) to 2. 80 hours measured each run. Theory: Pollaczek–Khinchine.", xLabel: "service-time CV", yLabel: "mean wait (minutes)", xs: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2], reps: 4, yMin: 0, theory: x => theoryWq({ lam: 0.4, svc: 2, cv: x, c: 1 }), theoryLabel: "Pollaczek–Khinchine", run: (x, r) => longRun({ lam: 0.4, svc: 2, cv: x, c: 1, layout: "snake" }, r, 4800).mean, note: "Same average workload, very different waits: the wait grows with (1 + CV²). At high CV a few very long services dominate, so single runs scatter widely." },
    { title: "How many tills so that 95% wait under 5 minutes?", question: "With 2 customers a minute taking 3 minutes each, how many tills are needed?", how: "One snake queue; 7 to 10 tills; share served within 5 minutes. Theory: 1 − C e^(−(cμ − λ) × 5).", xLabel: "tills", yLabel: "served within 5 minutes (%)", xs: [7, 8, 9, 10], reps: 5, yMin: 0, yMax: 102, theory: c => 100 * (1 - theoryPwait({ lam: 2, svc: 3, cv: 1, c: Math.round(c) }, 5)), run: (x, r) => 100 * longRun({ lam: 2, svc: 3, cv: 1, c: x, layout: "snake" }, r).under5, note: "Six tills could serve everyone on average (ρ = 1) but the queue would grow without end. Seven reach about 88%, eight about 99%: service targets need well over the bare minimum of tills." },
    { title: "Little's law", question: "Is the average number of people waiting equal to the arrival rate × the mean wait?", how: "3 tills, 2-minute service, snake queue; the number waiting is averaged over time. Theory: Lq = λ × Wq (Erlang C).", xLabel: "arrival rate λ (per minute)", yLabel: "people waiting (time average)", xs: [0.6, 0.8, 1.0, 1.1, 1.2, 1.3], reps: 4, yMin: 0, theory: x => x * theoryWq({ lam: x, svc: 2, cv: 1, c: 3 }), theoryLabel: "λ × Wq", run: (x, r) => longRun({ lam: x, svc: 2, cv: 1, c: 3, layout: "snake" }, r).Lq, note: "Little's law holds for any queue in a steady state, whatever the distributions: it only needs people to arrive and leave." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Statistics", text: "Random events: arrivals at random times are modelled with probabilities. A frequency histogram of waiting times is skewed to the right: most waits are short, a few are very long." },
      { lvl: "std", tag: "GCSE Statistics", text: "Mean, median and percentiles summarise a distribution. For skewed data the mean is pulled up by the long tail, so the median or the 95th percentile can describe it better." },
      { lvl: "std", tag: "GCSE Statistics", text: "Simulation uses random numbers to model a process many times; more runs give more reliable averages (the standard error falls as 1 ÷ √n)." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Utilisation ρ = λ ÷ (c μ). If ρ ≥ 1 the queue grows without limit; as ρ → 1 the mean wait grows roughly as 1 ÷ (1 − ρ)." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Variability matters: for one server Wq = ρ ÷ (1 − ρ) × (1 + CV²) ÷ 2 × mean service time (Pollaczek–Khinchine)." },
      { lvl: "beyond", tag: "Beyond the spec", text: "One shared queue is faster and fairer than separate queues with the same number of servers. Little's law: average number waiting = arrival rate × average wait." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Customers arrive at 1.2 a minute and each takes 2 minutes to serve. There are 3 tills. Calculate the utilisation ρ = λ × service time ÷ number of tills.", ans: "<ul><li>ρ = 1.2 × 2 ÷ 3</li><li>= 0.8 (the tills are busy 80% of the time)</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why the mean waiting time is greater than the median waiting time.", ans: "<ul><li>the distribution is positively skewed</li><li>a few very long waits pull the mean up, but do not affect the median much</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const st = shop ? shop.stats() : null; return `In the simulation, ${st ? st.n : 0} customers have been served, with a mean wait of ${st ? st.mean.toFixed(2) : "–"} minutes. Explain why running the shop for longer would give a more reliable mean.`; }, ans: "<ul><li>waits vary a lot between customers and between busy and quiet spells</li><li>a larger sample reduces the effect of chance bursts</li><li>the standard error of the mean falls as the number of customers grows</li></ul>" },
      { lvl: "beyond", marks: 3, q: "A shop has one till, with service taking exactly 2 minutes (CV = 0), and a customer every 2.5 minutes. Use Wq = ρ ÷ (1 − ρ) × (1 + CV²) ÷ 2 × service time to find the mean wait. What would it be if CV = 1?", ans: "<ul><li>ρ = 2 ÷ 2.5 = 0.8; ρ ÷ (1 − ρ) = 4</li><li>CV = 0: 4 × 0.5 × 2 = 4 minutes</li><li>CV = 1: 4 × 1 × 2 = 8 minutes</li></ul>" },
      { lvl: "beyond", marks: 2, q: "On average 6 people are waiting in a queue and customers arrive at 1.5 a minute. Use Little's law to find the mean wait.", ans: "<ul><li>Wq = Lq ÷ λ = 6 ÷ 1.5</li><li>= 4 minutes</li></ul>" },
      { lvl: "beyond", marks: 3, q: "Explain why a single snake queue gives shorter and fairer waits than a separate queue for each till.", ans: "<ul><li>with separate queues a till can be idle while people wait in another queue</li><li>a single queue keeps every till busy whenever anyone is waiting, so the mean wait is lower</li><li>first come, first served: nobody is overtaken, so the longest waits are shorter</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Arrivals</b> form a Poisson process: the gaps between customers are random (exponential), with an average of 1 ÷ λ minutes. The lunchtime rush makes the rate rise to 2.5 times normal around the middle of the day.</li>
<li><b>Service times</b> follow a gamma distribution with the chosen mean and coefficient of variation (CV = SD ÷ mean): CV 0 means every customer takes the same time, CV 1 is the exponential distribution.</li>
<li><b>Separate queues</b>: a new customer joins the queue with the fewest people (counting the one being served), choosing at random between equal queues. With <b>jockeying</b>, when a till becomes free with nobody in its queue, the last person in the longest queue moves to it. <b>One snake</b>: a single first-come, first-served queue feeding every till.</li>
<li><b>Giving up</b>: a customer leaves at once if more than the chosen number are ahead of them.</li>
<li>The clock jumps from event to event (a discrete-event simulation). Batch runs warm up for an hour before measuring, so the shop has reached its usual state.</li></ul>
<h3>Theory used</h3>
<ul><li>Utilisation ρ = λ ÷ (cμ), μ = 1 ÷ mean service time.</li>
<li>Erlang C gives the chance of waiting and the mean wait for c servers with exponential times; the Allen–Cunneen factor (1 + CV²) ÷ 2 adjusts it for other service-time variability (exact for one till: Pollaczek–Khinchine).</li>
<li>Little's law: the time-average number waiting = λ × mean wait.</li>
<li>The formulas assume a steady arrival rate, identical tills, nobody giving up and a shop open for ever. With a rush hour, giving up or separate queues they are only a guide.</li></ul>
<h3>Simplifications</h3>
<ul><li>All customers are alike apart from their random service time: no trolleys and baskets, no express or self-checkout tills, no staff opening spare tills (the earlier version had these).</li>
<li>Walking to a till takes no time; switching queues happens only when a till becomes free.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/queues.html">original/queues.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Customers");
ctl.lam = K.slider(g, { label: "Arrival rate λ", min: 0.1, max: 3, step: 0.05, value: P.lam, fmt: v => v.toFixed(2) + " a minute", on: v => { P.lam = v; shop.o.lam = v; shop.lamMax = v * (P.rush ? 2.5 : 1); } });
ctl.rush = K.toggle(g, { label: "Lunchtime rush (2.5 × at the peak)", value: false, on: v => { P.rush = v; restart(); } });
ctl.balk = K.slider(g, { label: "Give up if more than this many are ahead", min: 0, max: 15, step: 1, value: 0, fmt: v => v ? v + " people" : "never give up", on: v => { P.balk = v; shop.o.balk = v; } });
g = ui.group("Service");
ctl.svc = K.slider(g, { label: "Mean service time", min: 0.5, max: 6, step: 0.1, value: P.svc, unit: "min", on: v => { P.svc = v; shop.o.svc = v; } });
ctl.cv = K.slider(g, { label: "Variability of service (CV)", min: 0, max: 2, step: 0.05, value: P.cv, tip: "0 = everyone takes exactly the same time; 1 = exponential", on: v => { P.cv = v; shop.o.cv = v; } });
g = ui.group("Tills (changes restart the shop)");
ctl.c = K.slider(g, { label: "Tills open", min: 1, max: 10, step: 1, value: P.c, on: v => { P.c = v; restart(); } });
ctl.layout = K.seg(g, { label: "Queues", value: "sep", options: [["sep", "A queue per till"], ["snake", "One snake queue"]], on: v => { P.layout = v; restart(); } });
ctl.jockey = K.toggle(g, { label: "Customers switch to a free till", value: false, on: v => { P.jockey = v; restart(); } });
g = ui.group("Watch");
K.btn(K.row(g), "↺ Start again", () => restart(), "primary");
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 30, step: 0.5, value: 1, fmt: v => v + " shop minutes a second", on: v => speed = v });
const read = K.readout(g, [["rho", "how busy (ρ)"], ["mean", "mean wait"], ["p95", "95% wait less than"], ["u5", "served within 5 min"], ["over", "overtaken by a later arrival"], ["lost", "customers lost"]]);
function restart() { shop = new Shop(Object.assign({}, P), rnd); log = []; walkers = []; peeps = new Map(); }
function set(o) { Object.assign(P, { lam: 1.2, svc: 2, cv: 1, c: 3, layout: "sep", jockey: false, rush: false, balk: 0 }, o); for (const k of ["lam", "svc", "cv", "c", "balk"]) ctl[k].set(P[k]); ctl.layout.set(P.layout); ctl.jockey.set(P.jockey); ctl.rush.set(P.rush); speed = o.speed || 1; ctl.speed.set(speed); restart(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "People waiting", xLabel: "shop time (minutes)", yLabel: "people in queues", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Waiting times", xLabel: "wait (minutes)", yLabel: "customers", yMin: 0 });
const waitCol = w => w < 2 ? "#7fe3a0" : w < 5 ? "#ffd166" : w < 10 ? "#ffb347" : "#ff5d6c";
function layoutTargets(w, h) {     // where each customer should stand
  const c = shop.o.c, tx = w - 130, gap = Math.min(70, (h - 90) / c), y0 = h / 2 - gap * (c - 1) / 2, T = new Map(), sp = 24;
  shop.tills.forEach((k, i) => { const y = y0 + i * gap; if (k.cur) T.set(k.cur.id, [tx - 26, y]); k.q.forEach((cu, j) => T.set(cu.id, [tx - 60 - j * sp, y])); });
  if (shop.o.layout === "snake") { const per = Math.max(4, Math.floor((tx - 260) / sp)); shop.snake.forEach((cu, j) => { const row = Math.floor(j / per), col = j % per, x = row % 2 ? 160 + col * sp : 160 + (per - 1 - col) * sp; T.set(cu.id, [x, h / 2 - 60 + row * 26]); }); }
  return { T, tx, gap, y0 };
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  c.fillStyle = "#141b2e"; c.fillRect(20, 40, w - 40, h - 70);
  const L = layoutTargets(w, h);
  // entrance and tills
  c.fillStyle = "#2a3550"; c.fillRect(20, h / 2 - 30, 10, 60); c.fillStyle = "#aab6cc"; c.font = "12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("entrance", 34, h / 2 + 46);
  shop.tills.forEach((k, i) => { const y = L.y0 + i * L.gap; c.fillStyle = k.cur ? "#3d5a8a" : "#2a3550"; c.fillRect(L.tx, y - 14, 44, 28); c.fillStyle = "#eef2f8"; c.textAlign = "center"; c.fillText("till " + (i + 1), L.tx + 22, y + 4);
    if (k.cur) { const f = K.clamp((shop.t - k.cur.ts) / Math.max(1e-6, k.end - k.cur.ts), 0, 1); c.fillStyle = "#7fe3a0"; c.fillRect(L.tx, y + 16, 44 * f, 4); } });
  if (shop.o.layout === "snake") { c.strokeStyle = "rgba(201,169,106,0.4)"; c.setLineDash([3, 3]); c.strokeRect(146, h / 2 - 76, L.tx - 250, Math.max(40, Math.ceil(shop.snake.length / Math.max(4, Math.floor((L.tx - 260) / 24)) + 0.01) * 26 + 6)); c.setLineDash([]); }
  // customers glide towards where they should stand; leavers walk out to the right
  const seen = new Set();
  for (const [id, [x, y]] of L.T) { seen.add(id); let p = peeps.get(id); if (!p) { p = { x: 30, y: h / 2, cu: shop.all.find(q => q.id === id) }; peeps.set(id, p); } p.x += (x - p.x) * 0.2; p.y += (y - p.y) * 0.2; }
  for (const [id, p] of peeps) if (!seen.has(id)) { walkers.push(p); peeps.delete(id); }
  for (const p of walkers) { p.x += 6; p.y += (p.y < h / 2 ? -1 : 1); } walkers = walkers.filter(p => p.x < w);
  for (const p of peeps.values()) { const cu = p.cu, wt = (cu.ts != null ? cu.ts : shop.t) - cu.ta; c.fillStyle = waitCol(wt); c.beginPath(); c.arc(p.x, p.y, 8, 0, 6.3); c.fill(); if (cu.jumped) { c.strokeStyle = "#c58cff"; c.lineWidth = 2; c.stroke(); } }
  c.globalAlpha = 0.5; for (const p of walkers) { c.fillStyle = "#7d8aa5"; c.beginPath(); c.arc(p.x, p.y, 7, 0, 6.3); c.fill(); } c.globalAlpha = 1;
  c.textAlign = "left"; c.fillStyle = "#aab6cc"; c.font = "12px Segoe UI,sans-serif"; let kx = 30; for (const [col, t] of [["#7fe3a0", "waited < 2 min"], ["#ffd166", "2–5"], ["#ffb347", "5–10"], ["#ff5d6c", "> 10 min"]]) { c.fillStyle = col; c.beginPath(); c.arc(kx + 5, h - 14, 5, 0, 6.3); c.fill(); c.fillStyle = "#aab6cc"; c.fillText(t, kx + 14, h - 10); kx += c.measureText(t).width + 34; }
  const hh = Math.floor(8 + shop.t / 60) % 24, mm = Math.floor(shop.t % 60); c.textAlign = "right"; c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.fillText(`🕒 ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, w - 24, h - 10);
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; shop.advance(shop.t + dt * speed); if (!log.length || shop.t - log[log.length - 1][0] >= 0.5) { log.push([shop.t, shop.waiting()]); if (log.length > 600) log.shift(); } }, () => {
  draw(); if (frame++ % 6) return;
  const o = shop.o, rho = o.lam * o.svc / o.c, st = shop.stats(), wq = theoryWq(o);
  chA.draw([{ pts: log, color: "#5ab0ff", label: "people waiting" }], { yMin: 0, hlines: isFinite(wq) && !o.rush ? [{ y: o.lam * wq, color: "#ffd166", label: "theory average (λ × Wq)" }] : [] });
  const bw = Math.max(0.5, Math.ceil(Math.max(5, st.p95 * 1.4) / 16 * 2) / 2), nb = 16, bars = Array.from({ length: nb }, (_, i) => [(i + 0.5) * bw, 0]); for (const x of st.waits) { const i = Math.floor(x / bw); if (i < nb) bars[i][1]++; }
  const th = isFinite(wq) && !o.rush ? bars.map(([x]) => [x, st.n * ((1 - theoryPwait(o, x + bw / 2)) - (1 - (x - bw / 2 <= 0 ? 1 : theoryPwait(o, x - bw / 2))))]) : [];
  chB.draw([{ pts: bars, type: "bars", w: bw, color: "#5ab0ff", alpha: 0.8, label: "simulation" }].concat(th.length ? [{ pts: th, type: "dots", color: "#ffd166", r: 4, label: "theory (snake queue)" }] : []), { xMin: 0, xMax: nb * bw, yMin: 0 });
  read.set("rho", rho.toFixed(2) + (rho >= 1 ? " (overloaded!)" : "")); read.set("mean", st.mean.toFixed(2) + " min" + (isFinite(wq) && !o.rush ? ` (theory ${wq.toFixed(2)})` : "")); read.set("p95", st.p95.toFixed(1) + " min"); read.set("u5", Math.round(100 * st.under5) + "%"); read.set("over", Math.round(100 * st.over) + "%"); read.set("lost", shop.lost);
  ui.hud(`<b>${shop.waiting()}</b> waiting · ${shop.tills.filter(k => k.cur).length} of ${o.c} tills busy<br>ρ = ${rho.toFixed(2)}${rho >= 1 ? ' <b style="color:#ff5d6c">more arrive than can be served</b>' : ""}<br>${st.n} served · mean wait ${st.mean.toFixed(1)} min`);
  ctl.jockey.el.style.display = P.layout === "sep" ? "" : "none";
});
set({});
ui.tip("Each dot is a customer, coloured by how long they have waited · the clock shows shop time", 7000);
