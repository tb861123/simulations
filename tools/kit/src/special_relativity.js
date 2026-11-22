/* =====================================================================
   SPECIAL RELATIVITY
   Everything here is built from EVENTS (a place and a time) and
   WORLDLINES (the path of an object through space and time), stored in
   the platform's frame. To show what another observer sees, every event
   is passed through the Lorentz transformation:
        t' = γ (t - v x / c²)        x' = γ (x - v t)        γ = 1/√(1 - v²/c²)
   and the picture is then drawn for one instant of THAT observer's time.
   Time dilation, length contraction and the loss of simultaneity are
   never coded separately: they all fall out of those two lines.
   Units: c = 1 (so 1 unit of distance is how far light goes in 1 unit of time).
   ===================================================================== */
const gam = b => 1 / Math.sqrt(1 - b * b);
const boost = (t, x, b) => { const g = gam(b); return [g * (t - b * x), g * (x - b * t)]; };

// A worldline: straight segments between events [t, x] in the platform frame. Proper time (the object's own clock) is added up along it.
function line(pts, o = {}) { const tau = [0]; for (let i = 1; i < pts.length; i++) { const dt = pts[i][0] - pts[i - 1][0], dx = pts[i][1] - pts[i - 1][1]; tau.push(tau[i - 1] + Math.sqrt(Math.max(0, dt * dt - dx * dx))); } const L = Object.assign({ pts, tau, tau0: 0 }, o); L.tau0 = tauAtS(L, 0); return L; }
function tauAtS(L, t) { const p = L.pts; for (let i = 1; i < p.length; i++) if (t <= p[i][0] || i === p.length - 1) { const f = (t - p[i - 1][0]) / (p[i][0] - p[i - 1][0] || 1); return L.tau[i - 1] + (L.tau[i] - L.tau[i - 1]) * f; } return 0; }
// Where is this object at the instant T of an observer moving at speed b? Returns null if it does not exist then.
function at(L, b, T) {
  const p = L.pts; let [ta, xa] = boost(p[0][0], p[0][1], b);
  for (let i = 1; i < p.length; i++) { const [tb, xb] = boost(p[i][0], p[i][1], b); if (T >= ta && T <= tb) { const f = (T - ta) / (tb - ta || 1); return { x: xa + (xb - xa) * f, t: p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, tau: L.tau[i - 1] + (L.tau[i] - L.tau[i - 1]) * f - L.tau0 }; } ta = tb; xa = xb; }
  return null;
}
// The event where a flash of light sent from (t0, x0) in direction d (+1 or -1) meets a worldline
function lightHit(t0, x0, d, L) { const p = L.pts; for (let i = 1; i < p.length; i++) { const [ta, xa] = p[i - 1], [tb, xb] = p[i], u = (xb - xa) / (tb - ta), t = (xa - x0 + d * t0 - u * ta) / (d - u); if (t >= t0 - 1e-9 && t >= ta - 1e-9 && t <= tb + 1e-9) return [t, x0 + d * (t - t0)]; } return null; }
const pulse = (e0, e1, o) => line([e0, e1], Object.assign({ light: true }, o));
const FAR = 400;
const still = (x, o) => line([[-FAR, x], [FAR, x]], o), moving = (x0, v, o) => line([[-FAR, x0 - v * FAR], [FAR, x0 + v * FAR]], o);

// ---------------------------------------------------------------- the five thought experiments
const MU_LIFE = 2.2;  // mean lifetime of a muon at rest, microseconds
const SCENES = {
  clock: { name: "Light clocks", v: 0.6, ut: "ns", ux: ["m", 0.3], frames: v => [["Platform", 0], ["Train", v]],
    build(v) { const g = gam(v), W = { lines: {}, items: [], pulses: [], events: [] }, T = 48;
      W.lines.P = still(0); W.lines.C = moving(0, v); W.lines.r = moving(-5 / g, v); W.lines.f = moving(5 / g, v);
      W.items = [{ type: "ground", step: 1 }, { type: "body", a: "r", b: "f", color: "#c0453f", label: "train" }, { type: "clock", line: "P", color: "#5ad1ff", label: "platform clock", h: 4 }, { type: "clock", line: "C", color: "#ffb454", label: "train clock", h: 4 }];
      W.when = [[0, 0], [T, 0], [T, T * v]]; W.track = ["P", "r", "f"];
      W.info = q => { const p = at(W.lines.P, q.b, q.T), c = at(W.lines.C, q.b, q.T); return [["Platform clock has ticked", p ? Math.floor(Math.max(0, p.tau) / 8) : "–"], ["Train clock has ticked", c ? Math.floor(Math.max(0, c.tau) / 8) : "–"]]; }; return W; } },
  simul: { name: "Simultaneity", v: 0.5, ut: "ns", ux: ["m", 0.3], frames: v => [["Platform", 0], ["Train", v]],
    build(v) { const g = gam(v), W = { lines: {}, items: [], pulses: [], events: [] }, L0 = 40;
      W.lines.r = moving(-L0 / 2 / g, v); W.lines.f = moving(L0 / 2 / g, v); W.lines.c = moving(0, v);
      const hr = lightHit(0, 0, -1, W.lines.r), hf = lightHit(0, 0, 1, W.lines.f);
      W.pulses = [pulse([0, 0], hr), pulse([0, 0], hf)]; W.events = [{ e: [0, 0], label: "flash", color: "#ffe66d" }, { e: hr, label: "light reaches the rear", color: "#7ee787" }, { e: hf, label: "light reaches the front", color: "#ff7b9c" }];
      W.items = [{ type: "ground", step: 3 }, { type: "body", a: "r", b: "f", color: "#c0453f", label: "train" }, { type: "dot", line: "c", color: "#ffe66d", label: "lamp" }, { type: "det", line: "r", lit: hr[0], color: "#7ee787" }, { type: "det", line: "f", lit: hf[0], color: "#ff7b9c" }];
      W.when = [[-8, -8 * v], [hf[0] + 10, hf[1] + 10 * v], hr]; W.track = ["r", "f"];
      W.info = q => { const a = boost(hr[0], hr[1], q.b)[0], b2 = boost(hf[0], hf[1], q.b)[0]; return [["Light reaches rear at", a.toFixed(1) + " ns"], ["Light reaches front at", b2.toFixed(1) + " ns"], ["Gap between the two", Math.abs(a - b2) < 0.05 ? "0: simultaneous" : Math.abs(a - b2).toFixed(1) + " ns"]]; }; return W; } },
  tunnel: { name: "Train in the tunnel", v: 0.8, ut: "ns", ux: ["m", 0.3], frames: v => [["Tunnel", 0], ["Train", v]],
    build(v) { const g = gam(v), W = { lines: {}, items: [], pulses: [], events: [] }, L0 = 100, LT = 70, front0 = L0 / g, fits = front0 < LT - 0.5, dur = fits ? Math.min(6, 0.6 * (LT - front0) / v) : 4;
      W.lines.A = still(0); W.lines.B = still(LT); W.lines.r = moving(0, v); W.lines.f = moving(front0, v);
      W.events = [{ e: [0, 0], label: "entrance door shuts", color: "#7ee787" }, { e: [0, LT], label: "exit door shuts", color: "#ff7b9c" }];
      W.items = [{ type: "ground", step: 6 }, { type: "body", a: "r", b: "f", color: "#c0453f", label: "train" }, { type: "tunnel", a: "A", b: "B" }, { type: "door", line: "A", closed: [0, dur], color: "#7ee787" }, { type: "door", line: "B", closed: [0, dur], color: "#ff7b9c" }];
      W.when = [[-(front0 + 12) / v, -12], [(LT + 12) / v, LT + 12], [0, 0], [0, LT]]; W.track = ["A", "B", "r", "f"]; W.fits = fits;
      W.info = q => { const r = at(W.lines.r, q.b, q.T), f = at(W.lines.f, q.b, q.T), a = at(W.lines.A, q.b, q.T), b2 = at(W.lines.B, q.b, q.T), u = 0.3; const ea = boost(0, 0, q.b)[0], eb = boost(0, LT, q.b)[0];
        return [["Train length here", ((f.x - r.x) * u).toFixed(1) + " m"], ["Tunnel length here", ((b2.x - a.x) * u).toFixed(1) + " m"], ["Entrance shuts at", ea.toFixed(1) + " ns"], ["Exit shuts at", eb.toFixed(1) + " ns"]]; }; return W; } },
  twins: { name: "Twin paradox", v: 0.8, ut: "yr", ux: ["ly", 1], frames: v => [["Earth", 0], ["Ship going out", v], ["Ship coming back", -v]],
    build(v) { const W = { lines: {}, items: [], pulses: [], events: [] }, D = 4, tT = D / v, tR = 2 * D / v;
      W.lines.E = still(0); W.lines.S = still(D); W.lines.ship = line([[-FAR, 0], [0, 0], [tT, D], [tR, 0], [FAR, 0]]);
      W.sigE = []; W.sigS = [];
      for (let n = 1; n < tR; n++) { const h = lightHit(n, 0, 1, line([[0, 0], [tT, D], [tR, 0], [FAR, 0]])); if (h && h[0] <= tR + 1e-6) { W.pulses.push(pulse([n, 0], h, { color: "#5ad1ff" })); W.sigE.push(h); } }   // Earth sends a flash every year of Earth time
      const g = gam(v); for (let n = 1; n < tR / g; n++) { const ts = n * g, xs = ts <= tT ? v * ts : D - v * (ts - tT), h = lightHit(ts, xs, -1, W.lines.E); W.pulses.push(pulse([ts, xs], h, { color: "#ffb454" })); W.sigS.push(h); }   // the ship sends one every year of ship time
      W.events = [{ e: [0, 0], label: "departure", color: "#fff" }, { e: [tT, D], label: "turn-round", color: "#ffe66d" }, { e: [tR, 0], label: "reunion", color: "#7ee787" }];
      W.items = [{ type: "space" }, { type: "planet", line: "E", color: "#5ad1ff", label: "Earth", r: 13 }, { type: "planet", line: "S", color: "#ffd166", label: "star", r: 9 }, { type: "ship", line: "ship" }];
      W.when = [[-0.5, 0], [tR + 0.8, 0]]; W.track = ["E", "S", "ship"];
      W.info = q => { const e = at(W.lines.E, q.b, q.T), s = at(W.lines.ship, q.b, q.T), cnt = arr => arr.filter(h => boost(h[0], h[1], q.b)[0] <= q.T).length; const ce = x => K.clamp(x, 0, 1e9);
        return [["Earth twin has aged", ce(Math.min(e.tau, tR)).toFixed(2) + " yr"], ["Ship twin has aged", ce(Math.min(s.tau, tR / g)).toFixed(2) + " yr"], ["Flashes Earth has received", cnt(W.sigS)], ["Flashes ship has received", cnt(W.sigE)]]; }; return W; } },
  muons: { name: "Cosmic-ray muons", v: 0.995, ut: "µs", ux: ["km", 0.3], frames: v => [["Ground", 0], ["Muon", v]],
    build(v, o = {}) { const W = { lines: {}, items: [], pulses: [], events: [] }, H = 50, g = o.newton ? 1 : gam(v), r = K.rng(o.seed || 7), N = 40; let surv = 0;
      W.lines.top = still(0); W.lines.gnd = still(H); W.mu = [];
      for (let i = 0; i < N; i++) { const life = -MU_LIFE * Math.log(1 - r()), t0 = 0, tEnd = Math.min(t0 + life * g, t0 + H / v), hit = t0 + life * g >= t0 + H / v; if (hit) surv++; const L = line([[t0, 0], [tEnd, v * (tEnd - t0)]], { hit, lane: r() }); W.mu.push(L); }
      W.items = [{ type: "air", a: "top", b: "gnd" }, { type: "muons" }]; W.when = [[0, 0], [H / v + 0.25, H]]; W.track = ["top", "gnd"]; W.surv = surv; W.N = N;
      W.info = q => { const a = at(W.lines.top, q.b, q.T), b2 = at(W.lines.gnd, q.b, q.T), alive = W.mu.filter(m => at(m, q.b, q.T)).length; return [["Thickness of atmosphere here", (Math.abs(b2.x - a.x) * 0.3).toFixed(2) + " km"], ["Muons still flying", alive], ["Reached the ground", W.mu.filter(m => m.hit && boost(m.pts[1][0], m.pts[1][1], q.b)[0] <= q.T).length + " of " + N], ["Theory: fraction reaching ground", (Math.exp(-H / (v * g * MU_LIFE)) * 100).toFixed(1) + "%"]]; }; return W; } },
};
// Headless: fraction of n muons that reach the ground from height H (in units of c·µs) at speed v
function muonFraction(r, v, H, n, newton) { const g = newton ? 1 : gam(v); let c = 0; for (let i = 0; i < n; i++) if (-MU_LIFE * Math.log(1 - r()) * g >= H / v) c++; return c / n; }

// ---------------------------------------------------------------- page
let scene = "clock", W, v = 0.6, bView = 0, T = 0, tRange = [0, 1], xRange = [0, 1], rate = 1, newton = false, seed = 7; const S = {};
const ui = K.app({
  title: "Special Relativity", subject: "Physics", home: "../../index.html", blurb: "Five famous thought experiments, each watched from any moving frame, with a live spacetime diagram underneath.",
  reset: () => { seed = Date.now() % 1e6; rebuild(); },
  missions: [
    { title: "Moving clocks run slow", q: "Two identical light clocks: a flash bouncing between mirrors. One is on the platform, one on a train at 0.6c. Watch from the platform. Why must the train's clock tick more slowly, if light always travels at c?", hint: "Seen from the platform, the train's flash has to travel along a longer, zig-zag path. Light cannot go any faster to make up for it, so each tick takes longer: by the factor γ = 1/√(1 − v²/c²) = 1.25 at 0.6c. Nothing is wrong with the clock: time itself runs slow.", setup: () => { setScene("clock"); S.v.set(0.6, true); view(0); } },
    { title: "Who is really slow?", q: "Same clocks, but now ride on the train (<b>Watch from: Train</b>). Which clock ticks slowly now? Can both views be right?", hint: "From the train, it is the platform clock that zig-zags and runs slow. Each observer measures the other's clock as slow, and both are right: there is no experiment that says who is 'really' moving. The situation is symmetrical until someone turns round (see the twins).", setup: () => { setScene("clock"); S.v.set(0.6, true); view(1); } },
    { title: "At the same time?", q: "A lamp flashes in the exact middle of the carriage. On the train, the light reaches both ends together. Predict what the platform observer sees, then switch frames. Drag <b>Observer's speed</b> slowly and watch the diagram.", hint: "From the platform the rear of the train rushes to meet the light while the front runs away from it, so the rear lights up first. Events that are simultaneous for one observer are not for another. On the diagram, 'now' is a horizontal line: boosting the frame tilts the events so that different ones lie on the same line.", setup: () => { setScene("simul"); S.v.set(0.5, true); view(1); } },
    { title: "The train that should not fit", q: "A 30 m train and a 21 m tunnel. At 0.8c the tunnel crew see the train shrunk to 18 m and shut both doors on it at once. But on the train, the <i>tunnel</i> is shrunk to 12.6 m! How can a 30 m train be shut inside? Watch from the train.", hint: "From the train the doors do not shut at the same time: the exit door shuts and reopens first, well before the entrance door shuts behind the tail. The train is never inside with both doors closed. Both observers agree about every event (no door ever hits the train); they disagree only about which events are simultaneous. Below about 0.72c it genuinely does not fit.", setup: () => { setScene("tunnel"); S.v.set(0.8, true); view(0); } },
    { title: "The twins", q: "One twin flies to a star 4 light-years away at 0.8c and comes straight back. Both send a flash of light every birthday. How old is each at the reunion? Count the flashes each one receives on the way out and on the way back.", hint: "Earth twin: 10 years. Ship twin: 6 years. It is not symmetrical because the ship changes frame at the turn-round: its worldline has a kink, and the bent path through spacetime is the <i>shorter</i> one in proper time. The flashes prove it: each twin literally counts the other's birthdays (slowly while separating, rapidly while approaching).", setup: () => { setScene("twins"); S.v.set(0.8, true); view(0); } },
    { title: "Muons should not reach us", q: "Muons made 15 km up by cosmic rays live only 2.2 µs on average: enough to travel about 660 m. Switch <b>relativity off</b>: how many reach the ground? Switch it on. Then ride with the muons: how do <i>they</i> explain reaching the ground?", hint: "Without relativity almost none arrive; with it, a good fraction do, as detectors confirm every day. From the ground: the muons' clocks run about 10 times slow, so they live long enough. From the muon: its lifetime is normal, but the atmosphere is contracted to about 1.5 km and the ground rushes up in time. Two explanations, one result.", setup: () => { setScene("muons"); S.v.set(0.995, true); view(0); } },
    { title: "Is 300 mph relativistic?", q: "Set the train's speed as low as the slider goes (0.05c: 15,000 km every second). How big are the effects now? What would γ be for a real train?", hint: "At 0.05c, γ = 1.001: a tenth of a percent. For a 300 km/h train γ differs from 1 by about 4 parts in 10¹⁴. Relativity does not contradict everyday experience: it agrees with Newton whenever speeds are small. But GPS satellites must correct for it, or positions would drift by kilometres a day.", setup: () => { setScene("clock"); S.v.set(0.05, true); view(0); } },
  ],
  batch: [
    { title: "Muons reaching the ground", question: "How does the fraction of muons that survive depend on their speed?", how: "500 muons are created 15 km up, each with a random lifetime (mean 2.2 µs in its own frame). Result = % that reach the ground.", xLabel: "muon speed (fraction of c)", yLabel: "muons reaching the ground (%)", xs: [0.9, 0.95, 0.98, 0.99, 0.995, 0.998, 0.9995], reps: 8, yMin: 0,
      theory: x => Math.exp(-50 / (x * gam(x) * MU_LIFE)) * 100, theoryLabel: "e^(−t/γτ)", run: (x, r) => muonFraction(r, x, 50, 500) * 100, note: "Radioactive decay is random: each muon's lifetime is a matter of chance, so the number that survive out of 500 varies from run to run. Notice how sharply survival rises as v approaches c: the speed barely changes, but γ grows without limit." },
    { title: "Muons and altitude", question: "How quickly are muons lost on the way down?", how: "Muons at 0.995c (γ ≈ 10). 500 start at each height; result = % reaching the ground. This is the Rossi–Hall and Frisch–Smith experiment: count muons on a mountain and at sea level.", xLabel: "height where the muons are made (km)", yLabel: "muons reaching the ground (%)", xs: [2, 5, 10, 15, 20, 30], reps: 8, yMin: 0,
      theory: h => Math.exp(-(h / 0.3) / (0.995 * gam(0.995) * MU_LIFE)) * 100, theoryLabel: "with time dilation", run: (h, r) => muonFraction(r, 0.995, h / 0.3, 500) * 100, note: "Random decay again. Without time dilation the curve would fall about 10 times faster: from 2 km up only about 5% would arrive, and from 15 km none at all." },
    { title: "Measuring time dilation", question: "How much slower does a moving clock tick?", how: "A platform observer times 20 ticks of the train's light clock with a stopwatch that is accurate to ±2%. Result = (time per tick of the moving clock) ÷ (time per tick of an identical clock at rest).", xLabel: "train speed (fraction of c)", yLabel: "moving tick ÷ stationary tick", xs: [0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95], reps: 6, yMin: 0.8,
      theory: x => gam(x), theoryLabel: "γ = 1/√(1 − v²/c²)", run: (x, r) => { const W2 = SCENES.clock.build(x), c0 = at(W2.lines.C, 0, 0), c1 = at(W2.lines.C, 0, 40); return (40 / (c1.tau - c0.tau)) * (1 + r.gauss() * 0.02); }, note: "The scatter is measurement error in the stopwatch (2%), which is why real tests of time dilation needed atomic clocks flown on aircraft, or fast particles, to see the effect clearly." },
    { title: "Measuring length contraction", question: "How long is a moving train?", how: "A 30 m train passes a trackside sensor. The observer times how long it takes to pass (±2% timing error) and works out length = speed × time.", xLabel: "train speed (fraction of c)", yLabel: "measured length (m)", xs: [0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95], reps: 6, yMin: 0,
      theory: x => 30 / gam(x), theoryLabel: "L₀ / γ", run: (x, r) => { const W2 = SCENES.tunnel.build(x), tf = lightHitStill(W2.lines.f), tr = lightHitStill(W2.lines.r); return x * (tr - tf) * (1 + r.gauss() * 0.02) * 0.3; }, note: "The front and the rear are timed as they pass the same point, so no judgement about simultaneity at two places is needed. The scatter is the 2% timing error." },
  ],
  notes: `<h3>How it works</h3><p>Each scene is a set of worldlines and events stored in one frame. For any observer speed the program applies the Lorentz transformation to every event and draws the instant "now" for that observer. The top strip is what exists at that instant; the diagram underneath is the whole history, with time running up the page and the white line marking "now".</p>
  <h3>Reading the spacetime diagram</h3><ul><li>Each object is a line: vertical if it is at rest for this observer, sloping if it moves.</li><li>Light is drawn in yellow (or the sender's colour) and always has the same slope, in every frame: that is Einstein's second postulate.</li><li>Dots are events. Changing the observer's speed slides them along hyperbolas: their order in time can change, unless one could have caused the other.</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>One dimension of space (plus the height of the light clocks). No gravity: this is special, not general, relativity.</li><li>Objects change speed instantly (the ship's turn-round). Real acceleration takes time but does not change the result.</li><li>The pictures show where things <i>are</i> at one instant in the chosen frame, worked out after allowing for light travel time. They are not what a camera would see: light from distant parts takes longer to arrive, which distorts photographs differently.</li><li>Trains at 0.8c, doors that shut in nanoseconds and a 21 m tunnel are thought experiments. The muon numbers are real.</li><li>Muons all travel straight down at the same speed and lose no energy in the air.</li></ul>
  <h3>Equations</h3><p><code>γ = 1/√(1 − v²/c²)</code> &nbsp; <code>Δt = γΔτ</code> &nbsp; <code>L = L₀/γ</code> &nbsp; <code>t′ = γ(t − vx/c²)</code> &nbsp; <code>x′ = γ(x − vt)</code></p>`,
});
function lightHitStill(L) { const p = L.pts, u = (p[1][1] - p[0][1]) / (p[1][0] - p[0][0]); return p[0][0] + (0 - p[0][1]) / u; }   // time at which a moving point passes x = 0
let g = ui.group("Thought experiment");
S.scene = K.seg(g, { value: scene, options: Object.entries(SCENES).map(([k, s]) => [k, s.name]), on: k => setScene(k) });
S.v = K.slider(g, { label: "Speed of the train / ship / muons", min: 0.05, max: 0.999, step: 0.001, value: 0.6, fmt: x => x.toFixed(3) + " c · γ = " + gam(x).toFixed(x > 0.99 ? 1 : 3), on: x => { const was = frameIndex(); v = x; rebuild(was); } });
S.newton = K.toggle(g, { label: "Switch relativity off for the muons' lifetimes", value: false, on: x => { newton = x; rebuild(frameIndex()); } });
g = ui.group("Who is watching?");
const frameRow = K.$("div"); g.append(frameRow);
S.b = K.slider(g, { label: "Observer's speed", min: -0.99, max: 0.999, step: 0.001, value: 0, fmt: x => (x === 0 ? "at rest on the platform / Earth" : x.toFixed(3) + " c"), on: x => { bView = x; ranges(true); paintFrames(); }, tip: "Slide slowly to watch the diagram shear from one frame into another." });
g = ui.group("Time");
S.T = K.slider(g, { label: "Scrub through time", min: 0, max: 1000, step: 1, value: 0, fmt: () => T.toFixed(1) + " " + SCENES[scene].ut, on: x => { T = tRange[0] + (tRange[1] - tRange[0]) * x / 1000; ui.setPlaying(false); } });
S.rate = K.slider(g, { label: "Playback speed", min: 0.1, max: 3, step: 0.1, value: 1, fmt: x => x.toFixed(1) + "×", on: x => rate = x });
ui.headerSpeed(S.rate);   // playback speed lives in the header, beside Pause and Reset
g = ui.group("Measured in this frame");
const read = K.readout(g, [["g", "γ of the train / ship"], ["t", "Time now"], ["i0", "–"], ["i1", "–"], ["i2", "–"], ["i3", "–"]]);
const tiles = read.el.querySelectorAll("span");

let frameBtns = [];
function frames() { return SCENES[scene].frames(v); }
function frameIndex() { const i = frames().findIndex(f => Math.abs(f[1] - bView) < 1e-6); return i; }
function paintFrames() { frameBtns.forEach((b, i) => b.classList.toggle("on", Math.abs(frames()[i][1] - bView) < 1e-6)); }
function view(i) { bView = frames()[i][1]; S.b.set(bView); ranges(false); paintFrames(); T = tRange[0]; ui.setPlaying(true); }
function setScene(k) { scene = k; S.scene.set(k); v = SCENES[k].v; S.v.set(v); S.newton.el.style.display = k === "muons" ? "" : "none"; bView = 0; S.b.set(0); rebuild(0); ui.setPlaying(true); }
function rebuild(fi) {
  W = SCENES[scene].build(v, { newton, seed }); frameRow.innerHTML = ""; frameRow.className = "k-ctl";
  const seg = K.seg(frameRow, { label: "Watch from", value: null, options: frames().map((f, i) => [i, f[0] + " frame"]), on: i => view(i) }); frameBtns = [...seg.el.querySelectorAll("button")];
  if (fi != null && fi >= 0) { bView = frames()[fi][1]; S.b.set(bView); } ranges(false); paintFrames(); T = tRange[0];
}
// the stretch of this observer's time and space that contains all the action
function ranges(keepT) {
  const f = keepT ? (T - tRange[0]) / (tRange[1] - tRange[0] || 1) : 0; let t0 = 1e9, t1 = -1e9, x0 = 1e9, x1 = -1e9;
  for (const [t, x] of W.when) { const tt = boost(t, x, bView)[0]; t0 = Math.min(t0, tt); t1 = Math.max(t1, tt); }
  const pt = (t1 - t0) * 0.04; tRange = [t0 - pt, t1 + pt];
  for (const name of W.track) for (let k = 0; k <= 12; k++) { const p = at(W.lines[name], bView, tRange[0] + (tRange[1] - tRange[0]) * k / 12); if (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); } }
  const px = (x1 - x0) * 0.07 || 1; xRange = [x0 - px, x1 + px]; T = tRange[0] + f * (tRange[1] - tRange[0]);
}
// ---- Drawing ----
const cv = ui.canvas();
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, sc = SCENES[scene], q = { b: bView, T }, L = 62, R = w - 20, X = x => L + (x - xRange[0]) / (xRange[1] - xRange[0]) * (R - L), u = (R - L) / (xRange[1] - xRange[0]);
  const sh = Math.max(150, h * 0.36), gy = sh - 34, d0 = sh + 26, d1 = h - 30, TY = t => d1 - (t - tRange[0]) / (tRange[1] - tRange[0]) * (d1 - d0);
  c.fillStyle = "#070b16"; c.fillRect(0, 0, w, h);
  // ============ top strip: the world at this instant ============
  const sky = c.createLinearGradient(0, 0, 0, sh); sky.addColorStop(0, scene === "twins" ? "#03040c" : "#0d1836"); sky.addColorStop(1, scene === "twins" ? "#0a0f24" : "#1c2c55"); c.fillStyle = sky; c.fillRect(0, 0, w, sh);
  c.save(); c.beginPath(); c.rect(0, 0, w, sh); c.clip();
  const P = name => at(W.lines[name], bView, T);
  for (const it of W.items) {
    if (it.type === "ground") { c.fillStyle = "#26324f"; c.fillRect(0, gy, w, sh - gy); c.fillStyle = "#3d4c75"; c.fillRect(0, gy, w, 3); const g2 = gam(bView), st = it.step / sc.ux[1], k0 = Math.floor((xRange[0] + bView * T) * g2 / st) - 1, k1 = Math.ceil((xRange[1] + bView * T) * g2 / st) + 1; c.fillStyle = "#8fa0bf"; c.font = "10px Segoe UI,sans-serif"; c.textAlign = "center"; for (let k = k0; k <= k1; k++) { const x = X(k * st / g2 - bView * T); c.fillRect(x - 1, gy, 2, 9); c.fillText(k * it.step, x, gy + 21); } c.textAlign = "left"; c.fillText("marks on the platform (" + sc.ux[0] + ")", 8, sh - 4); }
    if (it.type === "space") { const r = K.rng(3); for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${.2 + r() * .6})`; c.fillRect(r() * w, r() * sh, 1.4, 1.4); } }
    if (it.type === "tunnel") { const a = P(it.a), b = P(it.b); if (a && b) { c.fillStyle = "#4a5674"; c.beginPath(); c.roundRect(X(a.x), gy - 62, X(b.x) - X(a.x), 20, [10, 10, 0, 0]); c.fill(); c.fillStyle = "rgba(74,86,116,.5)"; c.fillRect(X(a.x), gy - 42, X(b.x) - X(a.x), 42); c.fillStyle = "#c9d2e6"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(`tunnel: ${((b.x - a.x) * sc.ux[1]).toFixed(1)} ${sc.ux[0]} long`, (X(a.x) + X(b.x)) / 2, gy - 68); } }
    if (it.type === "air") { const a = P(it.a), b = P(it.b); if (a && b) { const gr = c.createLinearGradient(X(a.x), 0, X(b.x), 0); gr.addColorStop(0, "#081030"); gr.addColorStop(1, "#3b6fb5"); c.fillStyle = gr; c.fillRect(X(a.x), 22, X(b.x) - X(a.x), sh - 44); c.fillStyle = "#3f7a3d"; c.fillRect(X(b.x), 14, 14, sh - 28); c.fillStyle = "#dfe8f7"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillText("15 km up: muons made here ▸", X(a.x) - 6, 40); c.textAlign = "left"; c.fillText("◂ ground", X(b.x) + 20, 40); c.textAlign = "center"; c.fillText(`atmosphere: ${(Math.abs(b.x - a.x) * 0.3).toFixed(2)} km thick in this frame`, (X(a.x) + X(b.x)) / 2, sh - 8); } }
    if (it.type === "muons") for (const m of W.mu) { const p = at(m, bView, T), y = 30 + m.lane * (sh - 64); if (p) { c.fillStyle = "#ffe66d"; c.shadowColor = "#ffe66d"; c.shadowBlur = 8; c.beginPath(); c.arc(X(p.x), y, 3.2, 0, 6.3); c.fill(); c.shadowBlur = 0; } else { const e = boost(m.pts[1][0], m.pts[1][1], bView); if (e[0] < T) { if (m.hit) { c.fillStyle = "#7ee787"; c.fillRect(X(e[1]) + 2, y - 2, 8, 4); } else { c.strokeStyle = "rgba(255,123,156,.7)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(e[1]) - 3, y - 3); c.lineTo(X(e[1]) + 3, y + 3); c.moveTo(X(e[1]) + 3, y - 3); c.lineTo(X(e[1]) - 3, y + 3); c.stroke(); } } } }
    if (it.type === "body") { const a = P(it.a), b = P(it.b); if (a && b) { const x0 = X(a.x), x1 = X(b.x), bw = x1 - x0; c.fillStyle = it.color; c.beginPath(); c.roundRect(x0, gy - 34, bw, 26, [6, Math.min(14, bw / 3), 3, 3]); c.fill(); c.fillStyle = "rgba(255,240,200,.85)"; const nw = Math.max(1, Math.round((b.x - a.x) * gam(relV(it.a)) / 6)); for (let k = 0; k < nw; k++) c.fillRect(x0 + bw * (k + .25) / nw, gy - 29, bw / nw * .5, 9); c.fillStyle = "#1a1f33"; for (const f of [.15, .85]) { c.beginPath(); c.ellipse(x0 + bw * f, gy - 5, Math.min(6, bw * .08), 5, 0, 0, 6.3); c.fill(); } c.fillStyle = "#fff"; c.font = "600 11px Segoe UI,sans-serif"; const lab = `${it.label}: ${((b.x - a.x) * sc.ux[1]).toFixed(1)} ${sc.ux[0]} long`; if (scene === "clock") { c.textAlign = "right"; c.fillText(lab, x0 - 8, gy - 17); } else { c.textAlign = "center"; c.fillText(lab, (x0 + x1) / 2, gy - 40 - (scene === "tunnel" ? 46 : 22)); } } }
    if (it.type === "clock") { const p = P(it.line); if (p) { const x = X(p.x), top = gy - 34 - 12 - 52 + (it.line === "P" ? 46 : 0), bot = top + 52, hw = 11, tau = Math.max(0, p.tau), ph = (tau % (2 * it.h)) / it.h, yy = ph < 1 ? bot - ph * 52 : top + (ph - 1) * 52; if (it.line === "P") { /* stands on the platform */ }
        c.strokeStyle = "rgba(255,230,109,.55)"; c.lineWidth = 1.5; c.beginPath(); let first = true; for (let k = 0; k <= 60; k++) { const pp = at(W.lines[it.line], bView, T - k * 0.3); if (!pp || pp.tau < 0) break; const f2 = (pp.tau % (2 * it.h)) / it.h, y2 = f2 < 1 ? bot - f2 * 52 : top + (f2 - 1) * 52; first ? c.moveTo(X(pp.x), y2) : c.lineTo(X(pp.x), y2); first = false; } c.stroke();   // the path the flash has taken, as seen in this frame
        c.fillStyle = it.color; c.fillRect(x - hw, top - 4, hw * 2, 4); c.fillRect(x - hw, bot, hw * 2, 4); c.strokeStyle = it.color; c.lineWidth = 1; c.strokeRect(x - hw + .5, top, hw * 2 - 1, 52);
        c.fillStyle = "#ffe66d"; c.shadowColor = "#ffe66d"; c.shadowBlur = 10; c.beginPath(); c.arc(x, yy, 4, 0, 6.3); c.fill(); c.shadowBlur = 0;
        c.fillStyle = it.color; c.font = "700 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(`${Math.floor(tau / (2 * it.h))} ticks`, x + hw + 6, top + 14); c.font = "10.5px Segoe UI,sans-serif"; c.fillText(it.label, x + hw + 6, top + 28); } }
    if (it.type === "dot") { const p = P(it.line); if (p) { c.fillStyle = it.color; c.beginPath(); c.arc(X(p.x), gy - 21, 5, 0, 6.3); c.fill(); } }
    if (it.type === "det") { const p = P(it.line); if (p) { const on = p.t >= it.lit; c.fillStyle = on ? it.color : "#3a4466"; if (on) { c.shadowColor = it.color; c.shadowBlur = 16; } c.beginPath(); c.arc(X(p.x), gy - 44, 7, 0, 6.3); c.fill(); c.shadowBlur = 0; } }
    if (it.type === "door") { const p = P(it.line); if (p) { const shut = p.t >= it.closed[0] && p.t <= it.closed[1]; c.fillStyle = it.color; c.fillRect(X(p.x) - 3, gy - 42, 6, shut ? 42 : 8); if (shut) { c.shadowColor = it.color; c.shadowBlur = 14; c.fillRect(X(p.x) - 3, gy - 42, 6, 42); c.shadowBlur = 0; } } }
    if (it.type === "planet") { const p = P(it.line); if (p) { const gr = c.createRadialGradient(X(p.x) - 3, sh / 2 - 3, 1, X(p.x), sh / 2, it.r); gr.addColorStop(0, "#fff"); gr.addColorStop(.4, it.color); gr.addColorStop(1, "rgba(0,0,0,.6)"); c.fillStyle = gr; c.beginPath(); c.arc(X(p.x), sh / 2, it.r, 0, 6.3); c.fill(); c.fillStyle = "#c9d2e6"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(it.label, X(p.x), sh / 2 + it.r + 14); } }
    if (it.type === "ship") { const p = P(it.line); if (p) { const x = X(p.x), y = sh / 2 - 30, dir = p.t < 0 || p.t > 2 * 4 / v ? 0 : p.t < 4 / v ? 1 : -1; c.save(); c.translate(x, y); if (dir < 0) c.scale(-1, 1); c.fillStyle = "#e9eef8"; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -7); c.lineTo(-4, 0); c.lineTo(-8, 7); c.fill(); if (dir) { c.fillStyle = "#ffb454"; c.beginPath(); c.moveTo(-6, -3); c.lineTo(-18 - Math.random() * 6, 0); c.lineTo(-6, 3); c.fill(); } c.restore(); c.fillStyle = "#ffb454"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(`ship twin: ${K.clamp(p.tau, 0, 2 * 4 / v / gam(v)).toFixed(1)} yr older`, x, y - 14); const e = P("E"); if (e) { c.fillStyle = "#5ad1ff"; c.fillText(`Earth twin: ${K.clamp(e.tau, 0, 2 * 4 / v).toFixed(1)} yr older`, X(e.x), sh / 2 + 44); } } }
  }
  for (const pl of W.pulses) { const p = at(pl, bView, T); if (p) { const y = scene === "twins" ? sh / 2 - 12 + (pl.color === "#ffb454" ? -6 : 6) : gy - 21; c.fillStyle = pl.color || "#ffe66d"; c.shadowColor = c.fillStyle; c.shadowBlur = 12; c.beginPath(); c.arc(X(p.x), y, 4, 0, 6.3); c.fill(); c.shadowBlur = 0; } }
  c.restore();
  if (scene === "tunnel" && !W.fits) { c.fillStyle = "#ff6b81"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("At this speed the train is still longer than the tunnel, even for the tunnel crew: it does not fit.", w / 2, 18); }
  // ============ spacetime diagram ============
  c.fillStyle = "#0a1020"; c.fillRect(L, d0, R - L, d1 - d0); c.strokeStyle = "#24324f"; c.lineWidth = 1; c.strokeRect(L + .5, d0 + .5, R - L, d1 - d0);
  c.save(); c.beginPath(); c.rect(L, d0, R - L, d1 - d0); c.clip();
  c.strokeStyle = "#16223c"; const tn = niceStep((tRange[1] - tRange[0]) / 6); for (let t = Math.ceil(tRange[0] / tn) * tn; t < tRange[1]; t += tn) { c.beginPath(); c.moveTo(L, TY(t)); c.lineTo(R, TY(t)); c.stroke(); }
  const pathOf = (ln, col, wd, dash) => { c.strokeStyle = col; c.lineWidth = wd; c.setLineDash(dash || []); c.beginPath(); ln.pts.forEach((p, i) => { const [t, x] = boost(p[0], p[1], bView); i ? c.lineTo(X(x), TY(t)) : c.moveTo(X(x), TY(t)); }); c.stroke(); c.setLineDash([]); };
  const colOf = { P: "#5ad1ff", C: "#ffb454", r: "#e0605a", f: "#e0605a", c: "#8a5a55", A: "#8fa0bf", B: "#8fa0bf", E: "#5ad1ff", S: "#ffd166", ship: "#ffffff", top: "#4a5f8f", gnd: "#3f9a4d" };
  for (const pl of W.pulses) pathOf(pl, pl.color || "#ffe66d", 1.4);
  if (W.mu) for (const m of W.mu) pathOf(m, m.hit ? "rgba(255,230,109,.75)" : "rgba(255,230,109,.3)", 1);
  for (const k in W.lines) pathOf(W.lines[k], colOf[k] || "#8fa0bf", k === "ship" || k === "C" || k === "P" ? 2.6 : 1.8);
  if (W.items.some(i => i.type === "body")) { const a = W.lines.r.pts, b = W.lines.f.pts; c.fillStyle = "rgba(224,96,90,.16)"; c.beginPath(); for (const p of [a[0], a[1], b[1], b[0]]) { const [t, x] = boost(p[0], p[1], bView); c.lineTo(X(x), TY(t)); } c.fill(); }
  for (const ev of W.events) { const [t, x] = boost(ev.e[0], ev.e[1], bView); c.fillStyle = ev.color; c.beginPath(); c.arc(X(x), TY(t), 5.5, 0, 6.3); c.fill(); c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = X(x) > (L + R) / 2 ? "right" : "left"; c.fillText(`${ev.label}  (t = ${t.toFixed(1)})`, X(x) + (c.textAlign === "right" ? -9 : 9), TY(t) - 7); }
  c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(L, TY(T)); c.lineTo(R, TY(T)); c.stroke(); c.fillStyle = "#fff"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillText("NOW in this frame ▴", R - 6, TY(T) + 14);
  c.restore();
  c.fillStyle = "#8fa0bf"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "right"; for (let t = Math.ceil(tRange[0] / tn) * tn; t < tRange[1]; t += tn) c.fillText(t.toFixed(tn < 1 ? 1 : 0), L - 6, TY(t) + 4);
  c.save(); c.translate(14, (d0 + d1) / 2); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.fillText(`time in this frame (${sc.ut})  →`, 0, 0); c.restore();
  c.textAlign = "center"; c.fillText(`position in this frame: the diagram lines up with the picture above`, (L + R) / 2, h - 10);
  c.textAlign = "left"; c.fillStyle = "#c9d2e6"; c.font = "600 12px Segoe UI,sans-serif"; const fi = frameIndex(); c.fillText("SPACETIME DIAGRAM · " + (fi >= 0 ? frames()[fi][0].toUpperCase() + " FRAME" : `OBSERVER MOVING AT ${bView.toFixed(2)} c`), L, d0 - 8);
  ui.hud(`${fi >= 0 ? "Watching from the <b>" + frames()[fi][0].toLowerCase() + "</b> frame" : "Observer at " + bView.toFixed(2) + " c"}<br>t = ${T.toFixed(1)} ${sc.ut}`);
}
const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
function relV(name) { const p = W.lines[name].pts, u = (p[1][1] - p[0][1]) / (p[1][0] - p[0][0]); return (u - bView) / (1 - u * bView); }   // velocity of an object in the view frame (velocity addition)
let frame = 0;
ui.run(dt => { T += dt * rate * (tRange[1] - tRange[0]) / 9; if (T > tRange[1]) T = tRange[0]; }, () => {
  draw(); if (frame++ % 4) return; S.T.set(Math.round((T - tRange[0]) / (tRange[1] - tRange[0]) * 1000));
  read.set("g", gam(v).toFixed(3)); read.set("t", T.toFixed(1) + " " + SCENES[scene].ut); const info = W.info({ b: bView, T });
  for (let i = 0; i < 4; i++) { tiles[i + 2].textContent = info[i] ? info[i][0] : "–"; read.set("i" + i, info[i] ? info[i][1] : "–"); }
});
setScene("clock");
ui.tip("The flash in each clock travels at the same speed. Which one has further to go?", 8000);
