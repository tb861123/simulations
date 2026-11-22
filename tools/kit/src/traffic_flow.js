/* =====================================================================
   TRAFFIC FLOW AND PHANTOM JAMS
   Why does motorway traffic grind to a halt for no reason, then clear
   again with no accident or roadworks in sight?

   Each vehicle here follows one rule, the "Intelligent Driver Model"
   (Treiber, Hennecke and Helbing, 2000). A driver wants to:
     * speed up towards the speed they would like to go, and
     * keep a safe gap to the vehicle in front: a minimum gap, plus a
       time gap (so many seconds behind), plus extra if closing fast.

       acceleration = a × [ 1 − (v / v_want)⁴ − (gap_wanted / gap)² ]

   Add small human imperfections (a moment's inattention) and, above a
   certain density, a tiny slow-down grows as it passes from driver to
   driver until someone stops. The jam that results travels BACKWARDS
   along the road at 10 to 20 km/h while the cars go forwards through it.
   Nobody caused it and no single driver can see it: it is a wave.

   UNITS: metres, seconds, m/s (shown as km/h and mph).
   ===================================================================== */
const KMH = 3.6, MPH = 2.237;
// driver types: wanted time gap T (s), acceleration a (m/s²), comfortable braking b, minimum gap s0 (m), length (m), top speed as a fraction of the limit
const TYPES = [
  { name: "car", T: 1.3, a: 0.7, b: 1.8, s0: 2, len: 4.5, vf: 1, lapse: 1 },
  { name: "lorry", T: 1.8, a: 0.4, b: 1.5, s0: 3, len: 14, vf: 0.8, lapse: 0.6 },
  { name: "self-driving car", T: 1.6, a: 1.6, b: 1.5, s0: 3, len: 4.5, vf: 1, lapse: 0 }   // never inattentive, accelerates briskly, brakes gently and early
];
// the Intelligent Driver Model: acceleration of a driver doing v, a distance gap behind a vehicle that is slower by dv
function idm(v, gap, dv, P, vWant) {
  const want = P.s0 + Math.max(0, v * P.T + v * dv / (2 * Math.sqrt(P.a * P.b)));
  return P.a * (1 - Math.pow(v / vWant, 4) - (want / Math.max(gap, 0.5)) ** 2);
}
// steady flow predicted by the model if every driver were identical and perfectly steady: returns [[density per km, flow per hour]...]
function theoryCurve(limit, P = TYPES[0]) { const out = []; for (let k = 0; k <= 60; k++) { const v = limit * (1 - k / 60) * 0.999, gap = (P.s0 + v * P.T) / Math.sqrt(1 - Math.pow(v / limit, 4)), rho = 1000 / (gap + P.len); out.push([rho, rho * v * 3.6]); } out.push([1000 / (P.s0 + P.len), 0]); return out; }

class Road {
  /* o = { L (length of the loop, m), lanes, n (vehicles), limit (m/s), lorries (%), auto (% self-driving), lapse (inattention, 0–3),
           works (true: the outside lane is closed for 300 m) } */
  constructor(o, rand) {
    this.o = o; this.rand = rand; this.L = o.L; this.lanes = o.lanes; this.t = 0; this.cars = []; this.works = o.works && o.lanes > 1 ? [o.L * 0.55, o.L * 0.55 + Math.min(300, o.L * 0.2)] : null; this.wave = null; this.passed = 0;
    for (let k = 0; k < o.n; k++) this.add(k, o.n);
    this.byLane = []; this.sort();
  }
  add(k, n) {
    const r = this.rand, o = this.o, u = r(), type = u < o.auto / 100 ? 2 : u < (o.auto + o.lorries) / 100 ? 1 : 0, P = TYPES[type], lane = type === 1 ? k % Math.min(2, this.lanes) : k % this.lanes;
    this.cars.push({ x: (Math.floor(k / this.lanes) + 0.5 * (lane % 2)) * this.L / Math.ceil(n / this.lanes) % this.L, v: 0, a: 0, lane, y: lane, type, P, pref: 0.9 + 0.2 * r(), nap: 0, brake: 0, lc: r() * 3, id: k });
  }
  sort() { for (let l = 0; l < this.lanes; l++) this.byLane[l] = []; for (const c of this.cars) this.byLane[c.lane].push(c); for (const a of this.byLane) a.sort((p, q) => p.x - q.x); }
  // the vehicle ahead of position x in a lane (and the one behind), with the gaps to them
  around(lane, x, self) {
    const a = this.byLane[lane], n = a.length; let lead = null, foll = null;
    if (n) { let i = 0; while (i < n && (a[i].x < x || a[i] === self)) i++; lead = a[i % n]; if (lead === self) lead = n > 1 ? a[(i + 1) % n] : null; let j = i - 1; foll = a[(j + n) % n]; if (foll === self) foll = n > 1 ? a[(j - 1 + 2 * n) % n] : null; }
    return { lead, foll };
  }
  gapTo(c, lead) { return lead ? ((lead.x - c.x + this.L) % this.L || this.L) - lead.P.len : 1e6; }
  // acceleration car c would have in a given lane
  accIn(c, lane, limit) {
    const { lead } = this.around(lane, c.x, c); let gap = this.gapTo(c, lead), dv = lead ? c.v - lead.v : 0;
    const w = this.works; if (w && lane === this.lanes - 1) { const d = (w[0] - c.x + this.L) % this.L; if (d < gap && d < 400) { gap = d; dv = c.v; } if (c.x >= w[0] && c.x < w[1]) return -9; }   // a closed lane is a wall
    return idm(c.v, gap, dv, c.P, Math.max(1, limit * c.P.vf * c.pref));
  }
  limitAt(x) { return this.o.limit; }
  step(dt) {
    const o = this.o, r = this.rand, L = this.L; this.sort();
    for (const c of this.cars) {
      const lim = this.limitAt(c.x); let a = this.accIn(c, c.lane, lim);
      // ---- changing lane: only if it is safe for the driver behind, and worth it ----
      c.lc -= dt;
      if (this.lanes > 1 && c.lc <= 0) {
        c.lc = 1 + r();
        for (const l2 of [c.lane - 1, c.lane + 1]) {
          if (l2 < 0 || l2 >= this.lanes || (c.type === 1 && l2 > 1 && this.lanes > 2)) continue;
          const w = this.works; if (w && l2 === this.lanes - 1 && (w[0] - c.x + L) % L < 500) continue; if (w && l2 === this.lanes - 1 && c.x >= w[0] && c.x < w[1]) continue;
          const { lead, foll } = this.around(l2, c.x, c), gapF = this.gapTo(c, lead), gapB = foll ? this.gapTo(foll, c) : 1e6;
          if (gapF < c.P.s0 + 1 || gapB < 2 + foll.v * 0.5) continue; if (foll && idm(foll.v, gapB, foll.v - c.v, foll.P, lim) < -2.5) continue;
          const a2 = this.accIn(c, l2, lim), blocked = a < -4;                    // blocked: in a lane that is about to end
          if (a2 > a + (l2 < c.lane ? -0.05 : 0.35) || (blocked && a2 > -3)) { c.lane = l2; a = a2; this.sort(); break; }   // keep left unless overtaking
        }
      }
      // ---- human imperfection: now and then a driver's attention lapses for a second or so and they ease off ----
      if (c.nap > 0) { c.nap -= dt; a = Math.min(a, -0.4); } else if (r() < 0.012 * o.lapse * c.P.lapse * dt * (c.v > 2 ? 1 : 0.2)) c.nap = 0.6 + r() * 1.2;
      if (c.brake > 0) { c.brake -= dt; a = Math.min(a, -4); }                    // someone tapped this car's brakes
      c.a = Math.max(-8, a);
    }
    for (const c of this.cars) { c.v = Math.max(0, c.v + c.a * dt); const nx = c.x + c.v * dt; if (nx >= L) this.passed++; c.x = nx % L; c.y += (c.lane - c.y) * Math.min(1, dt * 1.5); }
    this.t += dt; this.track(dt);
  }
  // follow the middle of the slow-moving traffic round the loop, to measure how fast the jam itself moves
  track(dt) {
    let sx = 0, sy = 0, n = 0; for (const c of this.cars) if (c.v < 4) { const th = 6.2832 * c.x / this.L; sx += Math.cos(th); sy += Math.sin(th); n++; }
    this.stopped = n; if (n < 3 || Math.hypot(sx, sy) / n < 0.5) { this.wave = null; return; }
    const pos = Math.atan2(sy, sx) / 6.2832 * this.L; if (!this.wave) { this.wave = { pos, t: 0, dist: 0, speed: null }; return; }
    let d = pos - this.wave.pos; if (d > this.L / 2) d -= this.L; if (d < -this.L / 2) d += this.L; this.wave.pos = pos; this.wave.dist += d; this.wave.t += dt; if (this.wave.t > 20) this.wave.speed = this.wave.dist / this.wave.t;
  }
  speed() { let s = 0; for (const c of this.cars) s += c.v; return s / (this.cars.length || 1); }
  density() { return this.cars.length / (this.L / 1000) / this.lanes; }               // vehicles per km per lane
  flow() { return this.density() * this.speed() * 3.6; }                               // vehicles per hour per lane = density × speed
}
// A run without drawing: settle for `warm` seconds, then average for `secs`. Returns { speed (km/h), flow, stopped (%), wave (km/h) }.
function trial(o, rnd, warm = 240, secs = 240) {
  const road = new Road(Object.assign({ L: 1000, lanes: 1, n: 30, limit: 31.3, lorries: 0, auto: 0, lapse: 1, works: false }, o), rnd); let sv = 0, ss = 0, k = 0, p0 = 0;
  for (let t = 0; t < warm + secs; t += 0.2) { road.step(0.2); if (t >= warm) { if (!k) p0 = road.passed; sv += road.speed(); ss += road.stopped || 0; k++; } }
  return { speed: sv / k * KMH, flow: (road.passed - p0) / secs * 3600 / road.lanes, stopped: 100 * ss / k / road.cars.length, wave: road.wave && road.wave.speed != null ? road.wave.speed * KMH : null };
}

// ---------------- The page ----------------
const P = { L: 2000, lanes: 3, n: 150, limit: 31.3, lorries: 10, auto: 0, lapse: 1, works: false };
let road, rate = 4, fd = [], seedNo = 3, stLast = 0, fdLast = 0, tapped = null;
function restart() { road = new Road(Object.assign({}, P), K.rng(seedNo = (seedNo * 17 + 5) % 99991)); fd = []; stLast = fdLast = 0; if (typeof stc !== "undefined" && stc.ctx) { stc.ctx.fillStyle = "#0a0f1c"; stc.ctx.fillRect(0, 0, stc.w, stc.h); } }

const ui = K.app({
  title: "Traffic Flow and Phantom Jams", subject: "Engineering",
  blurb: "Jams from nothing, waves that travel backwards, and how to dissolve them",
  reset: () => set({ L: 2000, lanes: 3, n: 150, limit: 31.3, lorries: 10, auto: 0, lapse: 1, works: false }),
  missions: [
    { title: "A jam from nothing", q: "15 cars on a 230 m circular test track, after a famous Japanese experiment of 2008 in which drivers were asked simply to keep a steady 30 km/h. There is no obstacle. Watch for a minute or two. What happens?", hint: "Small differences grow: one driver eases off for a moment, the next has to brake a little harder, the next harder still, until someone stops. A 'phantom' jam has formed with no cause that anyone could point to. In the real experiment (22 small cars, driven closer together than this model's drivers allow) it took a few minutes; here it varies each time you restart.", setup() { set({ L: 230, lanes: 1, n: 15, limit: 60 / KMH, lorries: 0, auto: 0, lapse: 3, works: false, rate: 2 }); } },
    { title: "Which way does the jam move?", q: "Follow one car with your eye, then follow the cluster of red brake lights. Which way does each go round? Now look at the stripe pattern on the left-hand diagram (position across, time down).", hint: "Cars move forwards through the jam, but the jam itself moves backwards, at 10 to 15 km/h here (15 to 20 on real motorways): cars join at the back faster than they leave at the front. On the space–time diagram each red stripe slopes backwards. This speed is nearly the same on every motorway in the world, because it is set by how long drivers take to pull away.", setup() { set({ L: 1000, lanes: 1, n: 45, limit: 31.3, lorries: 0, auto: 0, lapse: 1.5, works: false, rate: 4 }); } },
    { title: "How many cars is too many?", q: "Start with 20 vehicles per km and raise the number of vehicles a step at a time, waiting a while at each. Watch the dot move on the flow–density graph. At what density does the flow (vehicles per hour) reach its maximum? What happens beyond that?", hint: "At low density everyone drives at the limit, so more cars means more flow. Near 25 to 30 vehicles per km per lane the flow peaks at around 2000 vehicles an hour. Add more and jams form: speed collapses and the flow FALLS, so more cars on the road means fewer get through. The road's capacity is a real limit.", setup() { set({ L: 1000, lanes: 1, n: 15, limit: 31.3, lorries: 0, auto: 0, lapse: 1, works: false, rate: 6 }); } },
    { title: "Tap the brakes", q: "The traffic is dense but flowing, and these drivers never lose attention, so it would flow like this for ever. Click any car to make its driver brake sharply for two seconds. Follow what happens to the cars behind it over the next minute.", hint: "At this density one sharp brake is enough: the slow-down is passed back and amplified, and a jam is born that outlives its cause by many minutes. Try the same thing with 15 fewer cars: the disturbance dies away. Whether a disturbance grows or fades depends on the density, which is why jams appear at busy times.", setup() { set({ L: 1000, lanes: 1, n: 40, limit: 31.3, lorries: 0, auto: 0, lapse: 0, works: false, rate: 4 }); } },
    { title: "Slow down to speed up", q: "This busy road keeps jamming at the 70 mph limit. Note the flow. Now lower the speed limit to 50 mph and wait a few minutes. What happens to the jams and to the flow?", hint: "At a lower limit drivers leave gaps that are large for their speed and need to brake less sharply, so small slow-downs fade instead of growing. The traffic moves steadily, and steady traffic at 50 can carry a little more than stop-and-go traffic. In this model the gain is modest (see the batch run) and it only appears on a busy road: on a quiet one a lower limit just slows everyone down. This is the idea behind variable speed limits on 'smart' motorways.", setup() { set({ L: 1000, lanes: 1, n: 36, limit: 31.3, lorries: 0, auto: 0, lapse: 1.5, works: false, rate: 6 }); } },
    { title: "Roadworks", q: "One lane is closed for 300 m. Watch where vehicles merge and where the queue forms. How does the flow compare with the same traffic and no roadworks?", hint: "Three lanes of traffic must fit through two, so the closure can pass at most about two thirds of what the open road can. If more than that arrives, a queue grows back from the merge. Merging late and taking turns ('zip merging') uses the closing lane's full length and keeps the queue shorter than merging early.", setup() { set({ L: 2000, lanes: 3, n: 150, limit: 31.3, lorries: 10, auto: 0, lapse: 1, works: true, rate: 6 }); } },
    { title: "A few robots", q: "A jammed ring of human drivers. Raise 'Self-driving cars' to 10%, then 20%, then 40%, waiting a couple of minutes each time. How many are needed to dissolve the jam?", hint: "The self-driving cars here never lose attention, keep a slightly longer gap and brake gently and early, so they soak up a slow-down instead of amplifying it. A modest share is enough to calm the whole stream: experiments on real roads (Arizona 2017, Nashville 2022) found that one specially driven car among about twenty could smooth a jam and cut fuel use.", setup() { set({ L: 1000, lanes: 1, n: 42, limit: 31.3, lorries: 0, auto: 0, lapse: 1.5, works: false, rate: 6 }); } },
    { title: "Lorries", q: "Run the three-lane road with no lorries, then with 30%. What happens to the flow and to the way cars use the lanes?", hint: "Lorries are long, slower and slow to accelerate. Cars bunch behind them and pull out to overtake, and every lane change makes the driver behind in the new lane brake. The road carries fewer vehicles per hour, and jams start more easily. This is why some motorways ban lorries from overtaking at busy times.", setup() { set({ L: 2000, lanes: 3, n: 170, limit: 31.3, lorries: 0, auto: 0, lapse: 1, works: false, rate: 6 }); } }
  ],
  batch: [
    { title: "The fundamental diagram", question: "How does the flow of traffic depend on how densely the road is packed?", how: "Each run: a 1 km single-lane ring with the chosen number of cars, settled for 4 minutes and then measured for 4 minutes.", xLabel: "density (vehicles per km)", yLabel: "flow (vehicles per hour)", xs: [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 90], reps: 5, yMin: 0, run: (n, r) => trial({ n }, r).flow, note: "Up to the peak the runs agree closely: everyone drives at the limit. Beyond it the traffic is unstable, and whether and when a jam forms depends on chance, so the flow varies from run to run." },
    { title: "Speed against density", question: "How does average speed fall as the road fills up?", how: "The same runs as the fundamental diagram, showing average speed.", xLabel: "density (vehicles per km)", yLabel: "average speed (km/h)", xs: [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 90], reps: 5, yMin: 0, run: (n, r) => trial({ n }, r).speed },
    { title: "How fast does a jam travel?", question: "At what speed does the jam itself move along the road?", how: "Each run: 45 cars on a 1 km ring, left until a jam forms; the centre of the slow traffic is tracked. Negative means backwards.", xLabel: "", yLabel: "speed of the jam (km/h)", reps: 60, bins: 20, lo: -30, hi: 0, run: (x, r) => trial({ n: 45, lapse: 1.5 }, r, 300, 200).wave, note: "Jams on real motorways travel backwards at 15 to 20 km/h almost everywhere. The speed is set by how quickly drivers pull away from the front of the queue, not by how fast the traffic was going." },
    { title: "Does a lower limit help?", question: "On a busy road, how does the flow depend on the speed limit?", how: "Each run: 36 cars on a 1 km single-lane ring with inattentive drivers.", xLabel: "speed limit (mph)", yLabel: "flow (vehicles per hour)", xs: [30, 40, 50, 60, 70], reps: 6, yMin: 0, run: (x, r) => trial({ n: 36, limit: x / MPH, lapse: 1.5 }, r).flow, note: "On an empty road a lower limit always means a lower flow. On a busy road the highest flow comes at an intermediate limit, which keeps the traffic out of the stop-and-go state." },
    { title: "Self-driving cars", question: "What share of self-driving cars is needed to stop jams forming?", how: "Each run: 42 vehicles on a 1 km ring. The result is the percentage of vehicles crawling (below 15 km/h), averaged over 4 minutes.", xLabel: "self-driving cars (%)", yLabel: "vehicles crawling (%)", xs: [0, 5, 10, 20, 30, 50, 75, 100], reps: 6, yMin: 0, run: (x, r) => trial({ n: 42, auto: x, lapse: 1.5 }, r).stopped, note: "With few self-driving cars it matters where in the stream they happen to be, so runs differ." },
    { title: "Inattention", question: "How much does drivers' inattention matter?", how: "Each run: 36 cars on a 1 km ring; the horizontal axis is how often drivers' attention lapses compared with normal.", xLabel: "inattention (× normal)", yLabel: "flow (vehicles per hour)", xs: [0, 0.25, 0.5, 1, 1.5, 2, 3], reps: 6, yMin: 0, run: (x, r) => trial({ n: 36, lapse: x }, r).flow }
  ],
  notes: `<h3>What is being modelled</h3>
<ul><li><b>The road</b> is a closed loop (230 m to 3 km, 1 to 3 lanes), so no vehicles enter or leave and the density stays fixed.</li>
<li><b>Each driver</b> follows the Intelligent Driver Model: accelerate towards the speed limit (each driver's preferred speed is within 10% of it), and keep a safe gap that grows with speed and with closing speed. Cars want a 1.3 s time gap, lorries 1.8 s.</li>
<li><b>Inattention:</b> at random, on average about once every 80 seconds, a driver stops responding properly for around a second and eases off.</li>
<li><b>Lane changes:</b> a driver moves over if it gives clearly better progress and would not force the driver behind in the new lane to brake hard; drivers return to the left when they can. Lorries stay out of the third lane.</li>
<li><b>Self-driving cars</b> never lose attention, keep a 1.6 s gap, accelerate briskly and brake gently.</li>
<li><b>Flow</b> = density × average speed. The dashed curve on the flow–density graph is what the model predicts for identical, perfectly steady drivers.</li>
<li><b>Jam speed</b> is measured by following the centre of the slow-moving vehicles.</li></ul>
<h3>Simplifications</h3>
<ul><li>A ring road has no junctions, hills, bends that matter, weather or accidents. Real jams are usually triggered at a junction or a hill and then travel back as waves like these.</li>
<li>Drivers differ only in preferred speed. There is no tailgating, lane-hogging, rubbernecking or anticipation of traffic several cars ahead.</li>
<li>Vehicles never collide: the model's braking is always (just) enough.</li>
<li>Roadworks are a blocked lane with no reduced limit or narrowed lanes.</li>
<li>The self-driving cars are a simple, cautious rule, not a model of any real system.</li>
<li>Vehicles drive on the left with lane 1 on the outside of the loop.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/traffic-flow.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The road");
ctl.L = K.seg(g, { value: 2000, options: [[230, "230 m test track"], [1000, "1 km"], [2000, "2 km"], [3000, "3 km"]], on: v => { const d = P.n / P.L; P.L = v; if (v === 230) { P.lanes = 1; ctl.lanes.set(1); } P.n = Math.max(4, Math.round(d * v)); fixN(); restart(); } });
ctl.lanes = K.seg(g, { label: "Lanes", value: 3, options: [[1, "1"], [2, "2"], [3, "3"]], on: v => { P.n = Math.round(P.n * v / P.lanes); P.lanes = v; fixN(); restart(); } });
ctl.n = K.slider(g, { label: "Vehicles on the road", min: 4, max: 400, step: 1, value: P.n, fmt: v => v + " (" + (v / (P.L / 1000) / P.lanes).toFixed(0) + " per km per lane)", on: v => { P.n = v; fixN(); restart(); } });
ctl.limit = K.slider(g, { label: "Speed limit", min: 20, max: 80, step: 5, value: 70, fmt: v => v + " mph (" + (v * 1.609).toFixed(0) + " km/h)", on: v => { P.limit = v / MPH; road.o.limit = P.limit; } });
ctl.works = K.toggle(g, { label: "Roadworks: outside lane closed for 300 m", value: false, on: v => { P.works = v; restart(); } });
g = ui.group("The drivers");
ctl.lorries = K.slider(g, { label: "Lorries", min: 0, max: 50, step: 5, value: P.lorries, unit: "%", on: v => { P.lorries = v; restart(); } });
ctl.auto = K.slider(g, { label: "Self-driving cars", min: 0, max: 100, step: 5, value: 0, unit: "%", on: v => { P.auto = v; retype(); } });
ctl.lapse = K.slider(g, { label: "Inattention", min: 0, max: 3, step: 0.05, value: 1, fmt: v => v === 0 ? "none: perfect drivers" : "× " + v.toFixed(2), on: v => { P.lapse = v; road.o.lapse = v; } });
let r1 = K.row(g); K.btn(r1, "↺ Start again", () => restart(), "primary"); K.btn(r1, "Brake a random car", () => { const c = road.cars[Math.floor(Math.random() * road.cars.length)]; c.brake = 2; tapped = c; });
K.note(g, "Click any vehicle to tap its brakes for two seconds.");
g = ui.group("Watch");
ctl.rate = K.slider(g, { label: "Speed", min: 1, max: 12, step: 1, value: rate, fmt: v => v + "× real time", on: v => rate = v });
ui.headerSpeed(ctl.rate);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["den", "density"], ["flow", "flow per lane"], ["v", "average speed"], ["stop", "crawling (under 15 km/h)"], ["wave", "jam is moving at"], ["t", "time"]]);
function fixN() { const max = Math.floor(P.L * P.lanes / 8); if (P.n > max) P.n = max; ctl.n.set(P.n); }
// change which vehicles are self-driving without restarting the traffic
function retype() { const cars = road.cars.filter(c => c.type !== 1), want = Math.round(P.auto / 100 * road.cars.length); let have = cars.filter(c => c.type === 2).length; road.o.auto = P.auto; for (const c of cars.sort(() => Math.random() - .5)) { if (have < want && c.type === 0) { c.type = 2; c.P = TYPES[2]; have++; } else if (have > want && c.type === 2) { c.type = 0; c.P = TYPES[0]; have--; } } }
function set(o) {
  Object.assign(P, { L: o.L, lanes: o.lanes, n: o.n, limit: o.limit, lorries: o.lorries, auto: o.auto, lapse: o.lapse, works: o.works });
  ctl.L.set(P.L); ctl.lanes.set(P.lanes); ctl.n.set(P.n); ctl.limit.set(Math.round(P.limit * MPH / 5) * 5); ctl.works.set(P.works); ctl.lorries.set(P.lorries); ctl.auto.set(P.auto); ctl.lapse.set(P.lapse); if (o.rate) { rate = o.rate; ctl.rate.set(rate); } restart();
}

// ---------------- Drawing: the road from above, at night ----------------
const cv = ui.canvas(() => { });
// the loop is a "stadium": two straights joined by two half-circles (a plain circle for the test track). pos(x, lane) gives screen position and heading.
function geom() { const w = cv.w, h = cv.h, R = Math.min(h / 2 - 34, w / 2 - 40), S = P.L === 230 ? 0 : Math.max(0, w - 2 * R - 70), per = 2 * S + 2 * Math.PI * R; return { R, S, per, cx: w / 2, cy: h / 2 + 4, ppm: per / P.L, lw: P.L === 230 ? 20 : P.L <= 1000 ? 11 : 8 }; }
function pos(G, x, lane, out) {
  let d = x * G.ppm; const R = G.R - (lane - (P.lanes - 1) / 2) * G.lw, S = G.S;   // lane 0 is the outside of the loop
  if (d < S) { out[0] = G.cx - S / 2 + d; out[1] = G.cy + R; out[2] = 0; return; } d -= S;
  const arc = Math.PI * G.R; if (d < arc) { const a = d / G.R; out[0] = G.cx + S / 2 + Math.sin(a) * R; out[1] = G.cy + Math.cos(a) * R; out[2] = -a; return; } d -= arc;
  if (d < S) { out[0] = G.cx + S / 2 - d; out[1] = G.cy - R; out[2] = Math.PI; return; } d -= S;
  const a = d / G.R; out[0] = G.cx - S / 2 - Math.sin(a) * R; out[1] = G.cy - Math.cos(a) * R; out[2] = Math.PI - a;
}
const speedCol = v => { const f = K.clamp(v / 31, 0, 1); return f < 0.5 ? `rgb(255,${Math.round(60 + 320 * f)},60)` : `rgb(${Math.round(255 - 380 * (f - 0.5))},220,${Math.round(60 + 80 * (f - .5))})`; };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, G = geom(), q = [0, 0, 0];
  const bg = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7); bg.addColorStop(0, "#0c1420"); bg.addColorStop(1, "#05080f"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  // tarmac and lane markings
  const path = (R) => { c.beginPath(); c.moveTo(G.cx - G.S / 2, G.cy + R); c.lineTo(G.cx + G.S / 2, G.cy + R); c.arc(G.cx + G.S / 2, G.cy, R, Math.PI / 2, -Math.PI / 2, true); c.lineTo(G.cx - G.S / 2, G.cy - R); c.arc(G.cx - G.S / 2, G.cy, R, -Math.PI / 2, Math.PI / 2, true); c.closePath(); };
  c.lineWidth = P.lanes * G.lw + 6; c.strokeStyle = "#1c222e"; path(G.R); c.stroke(); c.lineWidth = 1.2; c.strokeStyle = "rgba(230,235,245,.55)"; path(G.R + P.lanes * G.lw / 2 + 1.5); c.stroke(); path(G.R - P.lanes * G.lw / 2 - 1.5); c.stroke();
  c.setLineDash([6, 9]); c.strokeStyle = "rgba(230,235,245,.3)"; for (let l = 1; l < P.lanes; l++) { path(G.R - (l - P.lanes / 2) * G.lw); c.stroke(); } c.setLineDash([]);
  if (road.works) { c.strokeStyle = "#ff9f1c"; c.lineWidth = G.lw - 2; c.setLineDash([4, 4]); c.beginPath(); for (let x = road.works[0]; x <= road.works[1]; x += 6) { pos(G, x, P.lanes - 1, q); x === road.works[0] ? c.moveTo(q[0], q[1]) : c.lineTo(q[0], q[1]); } c.stroke(); c.setLineDash([]); pos(G, road.works[0], P.lanes + 1.2, q); c.fillStyle = "#ffb347"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("lane closed", q[0], q[1]); }
  // direction arrow and a scale
  c.fillStyle = "rgba(200,212,235,.6)"; c.font = "12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("traffic drives this way  →", G.cx, G.cy + G.R + P.lanes * G.lw / 2 + 22); c.fillText(P.L === 230 ? "230 m round" : P.L / 1000 + " km round · " + P.lanes + " lane" + (P.lanes > 1 ? "s" : ""), G.cx, G.cy + 4);
  // vehicles: body coloured by speed, white headlights, red brake lights when slowing
  const wd = Math.max(2.4, G.lw * 0.55);
  for (const car of road.cars) {
    pos(G, car.x, car.y, q); const len = Math.max(4, car.P.len * G.ppm), braking = car.a < -0.6;
    c.save(); c.translate(q[0], q[1]); c.rotate(q[2]);
    if (braking) { c.fillStyle = "rgba(255,40,30,.35)"; c.beginPath(); c.arc(-len, 0, wd * 1.6, 0, 6.3); c.fill(); } else if (car.v > 3) { c.fillStyle = "rgba(255,245,210,.10)"; c.beginPath(); c.moveTo(0, -wd / 2); c.lineTo(len * 0.9 + 14, -wd * 1.4); c.lineTo(len * 0.9 + 14, wd * 1.4); c.lineTo(0, wd / 2); c.fill(); }
    c.fillStyle = speedCol(car.v); c.beginPath(); c.roundRect(-len, -wd / 2, len, wd, Math.min(2.5, wd / 3)); c.fill();
    if (car.type === 1) { c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-len, -wd / 2, len * 0.72, wd); } else if (car.type === 2) { c.strokeStyle = "#7fe3ff"; c.lineWidth = 1.5; c.strokeRect(-len - 1, -wd / 2 - 1, len + 2, wd + 2); }
    if (braking) { c.fillStyle = "#ff3b2f"; c.fillRect(-len - 1, -wd / 2, 2, wd); }
    c.restore();
    if (car === tapped && car.brake > 0) { c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.arc(q[0], q[1], 14, 0, 6.3); c.stroke(); }
  }
  // key
  c.textAlign = "left"; c.font = "11px Segoe UI,sans-serif"; let kx = 14; for (const [v, name] of [[0, "stopped"], [10, "slow"], [20, ""], [31, "fast"]]) { c.fillStyle = speedCol(v); c.fillRect(kx, h - 18, 16, 8); c.fillStyle = "#b9c4d8"; c.fillText(name, kx + 20, h - 10); kx += name ? 28 + c.measureText(name).width : 18; }
  if (P.auto) { c.strokeStyle = "#7fe3ff"; c.strokeRect(kx + 4, h - 19, 16, 10); c.fillText("self-driving", kx + 26, h - 10); }
}
K.pointer(cv.el, { down(p) { const G = geom(), q = [0, 0, 0]; let best = null, bd = 18; for (const car of road.cars) { pos(G, car.x, car.y, q); const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < bd) { bd = d; best = car; } } if (best) { best.brake = 2; tapped = best; } } });

// the space–time diagram: one thin row of pixels is added every half-second, showing where the vehicles are and how fast
const stBox = K.$("div", "k-chart"); ui.dock.append(stBox); const stc = K.canvas(stBox, c => { c.ctx.fillStyle = "#0a0f1c"; c.ctx.fillRect(0, 0, c.w, c.h); });
function stRow() {
  const c = stc.ctx, w = stc.w, h = stc.h, top = 22, L0 = 44; c.drawImage(stc.el, L0 * stc.dpr, top * stc.dpr, (w - L0) * stc.dpr, (h - top - 1) * stc.dpr, L0, top + 1, w - L0, h - top - 1);
  c.fillStyle = "#0a0f1c"; c.fillRect(L0, top, w - L0, 1); for (const car of road.cars) { if (P.lanes > 1 && car.lane !== 0) continue; c.fillStyle = speedCol(car.v); c.fillRect(L0 + car.x / road.L * (w - L0 - 6), top, Math.max(1.5, car.P.len / road.L * (w - L0)), 1); }
  c.fillStyle = K.cssVar("--panel"); c.fillRect(0, 0, w, top); c.fillRect(0, 0, L0, h); c.fillStyle = K.cssVar("--text"); c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("Where the jams are" + (P.lanes > 1 ? " (outside lane)" : ""), L0, 11);
  c.fillStyle = K.cssVar("--muted"); c.font = "11px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillText("position along the road →", w - 6, 11); c.save(); c.translate(12, h / 2 + 10); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.fillText("← earlier · now ↑", 0, 0); c.restore();
}
const chF = K.chart(ui.dock, { title: "Flow against density", xLabel: "density (vehicles per km per lane)", yLabel: "flow (veh/h per lane)", yMin: 0, xMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  let left = rate * Math.max(dt, 1 / 120); while (left > 1e-6) { const d = Math.min(0.1, left); road.step(d); left -= d; }
  if (road.t - stLast >= 0.5) { stLast = road.t; stRow(); }
  if (road.t - fdLast >= 5) { fdLast = road.t; fd.push([road.density(), road.flow()]); if (fd.length > 400) fd.shift(); }
}, () => {
  draw(); if (frame++ % 6) return;
  const den = road.density(), v = road.speed(), wv = road.wave && road.wave.speed != null ? road.wave.speed * KMH : null;
  chF.draw([{ pts: theoryCurve(road.o.limit), color: K.cssVar("--s1"), dash: [5, 4], label: "perfectly steady drivers" }, { pts: fd, type: "dots", color: K.cssVar("--s0"), r: 2.2, alpha: .5, label: "this road, every 5 s" }, { pts: [[den, road.flow()]], type: "dots", color: K.cssVar("--s2"), r: 5.5, label: "now" }], { xMax: Math.max(100, den * 1.2) });
  read.set("den", den.toFixed(0) + " per km"); read.set("flow", road.flow().toFixed(0) + " per hour"); read.set("v", (v * KMH).toFixed(0) + " km/h (" + (v * MPH).toFixed(0) + " mph)"); read.set("stop", (road.stopped || 0) + " of " + road.cars.length);
  read.set("wave", wv == null ? "no jam" : wv.toFixed(0) + " km/h" + (wv < -2 ? " (backwards)" : "")); read.set("t", Math.floor(road.t / 60) + " min " + Math.floor(road.t % 60) + " s");
  ui.hud(`<b style="font-size:15px">${road.flow().toFixed(0)} vehicles an hour</b> per lane<br>average speed ${(v * MPH).toFixed(0)} mph · ${(road.stopped || 0)} crawling${wv != null && wv < -2 ? `<br><span style="color:#ff8a70">jam moving backwards at ${(-wv).toFixed(0)} km/h</span>` : ""}`);
});
restart();
ui.tip("Every vehicle follows one simple rule · click a car to tap its brakes", 8000);
