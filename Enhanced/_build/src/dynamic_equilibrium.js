/* =====================================================================
   DYNAMIC EQUILIBRIUM
   A box of particles in which   A + B  ⇌  AB.
   Forward step: an A and a B that collide hard enough (energy along the
   line of centres above Ea,forward) stick together.
   Reverse step: each AB has, every instant, a chance of shaking apart
   that follows the Arrhenius factor exp(-Ea,reverse / T).
   Equilibrium is not put in by hand. It appears when the two rates,
   each set by the rules above, happen to balance.
   ===================================================================== */
const BW = 640, BH = 400;          // box size in model units (the piston can shrink the width)
const RA = 5, RB = 5, RAB = 7;     // particle radii

class Box {
  constructor(rand, o = {}) {
    this.r = rand; this.T = o.T || 1; this.EaF = o.EaF != null ? o.EaF : 2.5; this.EaR = o.EaR != null ? o.EaR : 4.5; this.W = o.W || BW;
    this.p = []; this.t = 0; this.fwd = 0; this.rev = 0; this.flash = [];
    this.add(0, o.nA != null ? o.nA : 70); this.add(1, o.nB != null ? o.nB : 70); this.add(2, o.nAB || 0);
  }
  // kind: 0 = A, 1 = B, 2 = AB.  Speeds come from the temperature (Maxwell–Boltzmann): ½mv² ~ T
  make(kind, x, y) { const m = kind === 2 ? 2 : 1, s = Math.sqrt(this.T / m); return { k: kind, m, x, y, vx: this.r.gauss() * s, vy: this.r.gauss() * s, a: this.r() * 6.28, w: (this.r() - .5) * .2 }; }
  add(kind, n) { for (let i = 0; i < n; i++) this.p.push(this.make(kind, 10 + this.r() * (this.W - 20), 10 + this.r() * (BH - 20))); }
  remove(kind, n) { for (let i = this.p.length - 1; i >= 0 && n > 0; i--) if (this.p[i].k === kind) { this.p.splice(i, 1); n--; } }
  count() { const c = [0, 0, 0]; for (const q of this.p) c[q.k]++; return c; }
  step(dt) {
    const P = this.p, W = this.W, T = this.T; this.t += dt;
    // move, bounce off the walls
    for (const q of P) {
      q.x += q.vx * dt * 60; q.y += q.vy * dt * 60; q.a += q.w; const rad = q.k === 2 ? RAB : RA;
      if (q.x < rad) { q.x = rad; q.vx = Math.abs(q.vx); } if (q.x > W - rad) { q.x = W - rad; q.vx = -Math.abs(q.vx); }
      if (q.y < rad) { q.y = rad; q.vy = Math.abs(q.vy); } if (q.y > BH - rad) { q.y = BH - rad; q.vy = -Math.abs(q.vy); }
    }
    // collisions between every pair
    const dead = new Set(), born = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i]; if (dead.has(a)) continue; const ra = a.k === 2 ? RAB : RA;
      for (let j = i + 1; j < P.length; j++) {
        const b = P[j]; if (dead.has(b)) continue; const dx = b.x - a.x, dy = b.y - a.y, R = ra + (b.k === 2 ? RAB : RB), d2 = dx * dx + dy * dy;
        if (d2 > R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn >= 0) continue;   // already separating
        // FORWARD REACTION: an A meets a B. Is the collision energy (along the line of centres) above Ea?
        if (a.k + b.k === 1) {
          const mu = 0.5, E = 0.5 * mu * vn * vn;
          if (E > this.EaF) { const ab = this.make(2, (a.x + b.x) / 2, (a.y + b.y) / 2); ab.vx = (a.vx + b.vx) / 2; ab.vy = (a.vy + b.vy) / 2; dead.add(a); dead.add(b); born.push(ab); this.fwd++; this.flash.push({ x: ab.x, y: ab.y, t: 1, c: 0 }); break; }
        }
        // otherwise an ordinary elastic bounce (momentum and kinetic energy conserved)
        const imp = 2 * vn / (1 / a.m + 1 / b.m); a.vx += imp / a.m * nx; a.vy += imp / a.m * ny; b.vx -= imp / b.m * nx; b.vy -= imp / b.m * ny;
        const ov = (R - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      }
    }
    // REVERSE REACTION: each AB breaks up with probability  rate × dt,  rate = 3 exp(-Ea,reverse / T)
    const pr = 3 * Math.exp(-this.EaR / T) * dt;
    for (const q of P) if (q.k === 2 && !dead.has(q) && this.r() < pr) {
      const th = this.r() * 6.28, cx = Math.cos(th), cy = Math.sin(th), s = Math.sqrt(T) * .8;
      const a = this.make(0, q.x + cx * RA, q.y + cy * RA), b = this.make(1, q.x - cx * RA, q.y - cy * RA);
      a.vx = q.vx + cx * s; a.vy = q.vy + cy * s; b.vx = q.vx - cx * s; b.vy = q.vy - cy * s; dead.add(q); born.push(a, b); this.rev++; this.flash.push({ x: q.x, y: q.y, t: 1, c: 1 });
    }
    if (dead.size) this.p = P.filter(q => !dead.has(q)).concat(born);
    // thermostat: the box sits in a water bath that holds the temperature steady
    let ke = 0; for (const q of this.p) ke += 0.5 * q.m * (q.vx * q.vx + q.vy * q.vy);
    const Tnow = ke / (this.p.length || 1), f = Math.sqrt(1 + 0.1 * (T / (Tnow || T) - 1)); for (const q of this.p) { q.vx *= f; q.vy *= f; }
  }
  // Concentrations (particles per 10 000 square units) and the reaction quotient Q = [AB] / ([A][B])
  conc() { const c = this.count(), A = this.W * BH / 1e4; return c.map(n => n / A); }
  Q() { const c = this.conc(); return c[0] * c[1] > 0 ? c[2] / (c[0] * c[1]) : NaN; }
}
// Headless run for batch experiments: run to equilibrium, then average Q over the second half
function equilibrium(rand, o, tEnd = 100) { const b = new Box(rand, o); let q = 0, n = 0, ab = 0; for (let t = 0; t < tEnd; t += 1 / 30) { b.step(1 / 30); if (t > tEnd * .5) { const v = b.Q(); if (isFinite(v)) { q += v; n++; } ab += b.count()[2]; } } return { K: q / n, ab: ab / (tEnd * 15), box: b }; }

// ---------------------------------------------------------------- page
let box, hist, rateF = 0, rateR = 0, lastF = 0, lastR = 0, speed = 1; const S = {};
const COL = ["#5ad1ff", "#ffb454", "#c4a1ff"];
const ui = K.app({
  title: "Dynamic Equilibrium", subject: "Chemistry", blurb: "A + B ⇌ AB, particle by particle. Disturb it and watch Le Chatelier's principle emerge.",
  reset: () => restart(),
  missions: [
    { title: "What does 'dynamic' mean?", q: "Wait until the concentration lines go flat. Has the reaction stopped? Watch the flashes in the box and the <b>rates</b> chart.", hint: "The flashes never stop. At equilibrium the forward and reverse rates are equal (and not zero), so the amounts stay constant even though particles keep reacting.", setup: () => restart() },
    { title: "Start from the other side", q: "This box starts with only AB. Predict: will it end up with the same mixture as a box that starts with A and B?", hint: "Yes, with the same total atoms it reaches the same equilibrium from either direction. Compare the Q tile with the first investigation: Q settles at the same K.", setup: () => { restart({ nA: 0, nB: 0, nAB: 70 }); } },
    { title: "Add more A", q: "At equilibrium, press <b>+20 A</b>. Before you do: what will happen to the amounts of B and AB?", hint: "Extra A means more A–B collisions, so the forward rate jumps above the reverse rate. B falls and AB rises until the rates match again. Q dips below K, then climbs back to it.", setup: () => restart() },
    { title: "Squeeze it", q: "Drag the <b>Volume</b> slider down to compress the gas. Which side has fewer particles? Which way does the equilibrium move?", hint: "A + B (2 particles) ⇌ AB (1 particle). Compressing raises every concentration, which speeds up the forward (two-particle) step more than the reverse (one-particle) step, so more AB forms: the side with fewer particles.", setup: () => restart() },
    { title: "Heat an exothermic reaction", q: "Here the forward reaction is exothermic (look at the energy profile). Raise the temperature. Does the yield of AB go up or down? Does equilibrium arrive sooner or later?", hint: "Both rates rise, so equilibrium is reached sooner. The reverse step has the bigger activation energy, so it gains more from heating: the yield of AB falls. This is the Haber-process compromise.", setup: () => { restart(); } },
    { title: "Make it endothermic", q: "Swap the activation energies so that Ea(forward) is larger than Ea(reverse). Now what does heating do to the yield?", hint: "Now the forward step is endothermic and gains more from heating, so the yield of AB rises with temperature.", setup: () => { S.eaf.set(4.2, true); S.ear.set(2.6, true); S.T.set(1.2, true); restart(); } },
    { title: "A catalyst", q: "This reaction is slow. Lower <b>both</b> activation energies by the same amount, say 1.5 (that is what a catalyst does). What changes: the equilibrium position, or the time to reach it?", hint: "Only the time. K depends on the difference Ea(f) − Ea(r) = ΔH, which a catalyst does not change.", setup: () => { S.eaf.set(3.5, true); S.ear.set(5.5, true); S.T.set(1, true); restart(); } },
  ],
  batch: [
    { title: "Is K really constant?", question: "Do different starting mixtures give the same K?", how: "T = 1.0. The box starts with 140 atoms split differently between A + B and AB each time.", xLabel: "AB particles at the start (out of 70 possible)", yLabel: "K = [AB] / [A][B]", xs: [0, 14, 28, 42, 56, 70], reps: 5, yMin: 0,
      run: (x, r) => equilibrium(r, { nA: 70 - x, nB: 70 - x, nAB: x }).K, fit: true, note: "Only a hundred or so particles are in the box, so the numbers of A, B and AB fluctuate all the time. Real samples contain ~10²³ particles and the fluctuations are far too small to see. A flat best-fit line means K does not depend on the starting mixture." },
    { title: "K and temperature (exothermic)", question: "How does K change with temperature when ΔH is negative?", how: "Ea(forward) = 2.5, Ea(reverse) = 4.5, so ΔH = −2.0. Plotted as ln K against 1/T (a van 't Hoff plot).", xLabel: "1 / T", yLabel: "ln K", xs: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0], reps: 5,
      run: (x, r) => Math.log(equilibrium(r, { T: 1 / x }, 120).K), fit: true, note: "The gradient of the best-fit line estimates −ΔH (in the model's units, with k = 1): expect about +1.2 to +1.5. It falls short of 2 because hot particles also collide more often (collision rate ∝ √T), which helps the forward step. A positive gradient here means K falls as T rises: the signature of an exothermic reaction." },
    { title: "Yield and pressure", question: "Does squeezing the box give more AB?", how: "T = 1.0, 70 A + 70 B. The box width is changed; yield = percentage of A that ends up as AB.", xLabel: "volume (% of full box)", yLabel: "yield of AB (%)", xs: [30, 45, 60, 75, 90, 100], reps: 5,
      run: (x, r) => equilibrium(r, { W: BW * x / 100 }).ab / 70 * 100, note: "The count of AB wanders up and down around its equilibrium value, so each run's time-average is slightly different." },
    { title: "Fluctuations at equilibrium", question: "How much does the amount of AB wobble?", how: "One box, default settings, sampled once at the end of each of many runs.", xLabel: "", yLabel: "number of AB particles at t = 60", reps: 150, bins: 18,
      run: (x, r) => { const b = new Box(r); for (let t = 0; t < 60; t += 1 / 30) b.step(1 / 30); return b.count()[2]; }, note: "Equilibrium is a balance of random events, so the count is a distribution, not one number. The relative size of the wobble shrinks like 1/√N as the number of particles grows." },
  ],
  notes: `<h3>The rules</h3><ul><li>Particles are hard discs moving in 2-D. Their speeds follow the Maxwell–Boltzmann distribution for the set temperature.</li><li><b>Forward:</b> when A hits B, they join if the collision energy along the line of centres exceeds <code>Ea(forward)</code>.</li><li><b>Reverse:</b> each AB breaks up at a rate <code>3·exp(−Ea(reverse)/T)</code>.</li><li>ΔH = Ea(forward) − Ea(reverse).</li></ul>
  <h3>What you can measure</h3><p>Concentration = particles per 10 000 square units. <code>Q = [AB] / ([A][B])</code>; at equilibrium Q = K.</p>
  <h3>Assumptions and simplifications</h3><ul><li>Two dimensions, a few hundred particles at most: so you see fluctuations that a real mole-sized sample hides.</li><li>A thermostat (a "water bath") holds the temperature, so the heat released or absorbed by the reaction does not warm or cool the box.</li><li>Energy units are arbitrary, with Boltzmann's constant set to 1.</li><li>Particles are structureless: no orientation requirement for a successful collision.</li><li>The reverse step is a simple probability per second, not a collision-activated break-up.</li><li>Ideal behaviour: no attractions between particles.</li></ul>`,
});
let g = ui.group("Conditions");
S.T = K.slider(g, { label: "Temperature", min: 0.5, max: 2, step: 0.05, value: 1, fmt: v => v.toFixed(2), on: v => box.T = v });
S.V = K.slider(g, { label: "Volume", min: 30, max: 100, step: 1, value: 100, unit: "%", on: v => { box.W = BW * v / 100; for (const q of box.p) if (q.x > box.W - 8) q.x = box.W - 8 - Math.random() * 20; } });
g = ui.group("Add or remove");
for (const [k, name] of [[0, "A"], [1, "B"], [2, "AB"]]) { const r = K.row(g); const cvar = `var(--s${[0, 1, 4][k]})`; K.btn(r, `+20 ${name}`, () => box.add(k, 20)).style.color = cvar; K.btn(r, `−20 ${name}`, () => box.remove(k, 20)).style.color = cvar; }
g = ui.group("Energy profile");
const prof = K.$("div"); prof.style.cssText = "height:120px;position:relative;margin-bottom:8px;border:1px solid var(--line);border-radius:10px;overflow:hidden"; g.append(prof); const pc = K.canvas(prof);
S.eaf = K.slider(g, { label: "Ea (forward)", min: 0.5, max: 6, step: 0.1, value: 2.5, fmt: v => v.toFixed(1), on: v => box.EaF = v });
S.ear = K.slider(g, { label: "Ea (reverse)", min: 0.5, max: 6, step: 0.1, value: 4.5, fmt: v => v.toFixed(1), on: v => box.EaR = v });
g = ui.group("Live numbers");
const read = K.readout(g, [["a", "[A]"], ["b", "[B]"], ["ab", "[AB]"], ["q", "Q = [AB]/[A][B]"], ["dh", "ΔH"], ["t", "time"]]);
S.speed = K.slider(g, { label: "Speed", min: 1, max: 8, step: 1, value: 1, fmt: v => v + "×", on: v => speed = v });

function restart(o) {
  box = new Box(K.rng(Date.now()), Object.assign({ T: S.T.value, EaF: S.eaf.value, EaR: S.ear.value, W: BW * S.V.value / 100 }, o || {}));
  hist = { a: [], b: [], ab: [], f: [], r: [], q: [] }; lastF = lastR = rateF = rateR = 0; nextSample = 0;
}
let nextSample = 0;
const chC = K.chart(ui.dock, { title: "Concentrations", xLabel: "time", yLabel: "particles per unit area", yMin: 0 });
const chR = K.chart(ui.dock, { title: "Reaction rates", xLabel: "time", yLabel: "rate", yMin: 0 });
const cv = ui.canvas();

function drawProfile() { // energy against reaction coordinate: reactants, the hump (activation energy), products
  const c = pc.ctx, w = pc.w, h = pc.h; c.clearRect(0, 0, w, h); const ef = S.eaf.value, er = S.ear.value, dH = ef - er;
  const top = Math.max(ef, ef - dH) , y0 = Math.max(0, -dH), sc = (h - 34) / (Math.max(ef, er) + .2), Y = e => h - 14 - (e + y0) * sc;
  c.strokeStyle = K.cssVar("--text"); c.lineWidth = 2; c.beginPath(); c.moveTo(8, Y(0)); c.lineTo(w * .28, Y(0)); c.bezierCurveTo(w * .42, Y(0), w * .42, Y(ef), w * .5, Y(ef)); c.bezierCurveTo(w * .58, Y(ef), w * .58, Y(dH), w * .72, Y(dH)); c.lineTo(w - 8, Y(dH)); c.stroke();
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = COL[0]; c.textAlign = "left"; c.fillText("A + B", 10, Y(0) - 5); c.fillStyle = COL[2]; c.textAlign = "right"; c.fillText("AB", w - 10, Y(dH) - 5);
  c.fillStyle = K.cssVar("--muted"); c.textAlign = "center"; c.fillText(dH < 0 ? "exothermic →" : dH > 0 ? "endothermic →" : "ΔH = 0", w / 2, h - 3);
  // the dashed line shows the typical thermal energy at this temperature
  c.setLineDash([3, 3]); c.strokeStyle = K.cssVar("--warn"); c.beginPath(); c.moveTo(8, Y(box.T)); c.lineTo(w * .3, Y(box.T)); c.stroke(); c.setLineDash([]); c.fillStyle = K.cssVar("--warn"); c.textAlign = "left"; c.fillText("typical energy", 10, Y(box.T) - 3);
}
function draw() {
  const c = cv.ctx, s = Math.min((cv.w - 40) / BW, (cv.h - 40) / BH), ox = (cv.w - BW * s) / 2, oy = (cv.h - BH * s) / 2;
  const bg = c.createRadialGradient(cv.w / 2, cv.h / 2, 50, cv.w / 2, cv.h / 2, cv.w * .7); bg.addColorStop(0, "#0e1830"); bg.addColorStop(1, "#050810"); c.fillStyle = bg; c.fillRect(0, 0, cv.w, cv.h);
  // the box and its piston
  c.fillStyle = "rgba(90,209,255,.04)"; c.fillRect(ox, oy, box.W * s, BH * s); c.strokeStyle = "#3a4f7c"; c.lineWidth = 2; c.strokeRect(ox, oy, BW * s, BH * s);
  if (box.W < BW - 1) { const px = ox + box.W * s; const gp = c.createLinearGradient(px, 0, px + 14, 0); gp.addColorStop(0, "#8ea3c9"); gp.addColorStop(1, "#44557a"); c.fillStyle = gp; c.fillRect(px, oy, 14, BH * s); c.fillStyle = "#2b3857"; c.fillRect(px + 14, oy + BH * s / 2 - 8, (BW - box.W) * s - 14, 16); }
  // reaction flashes: cyan-white = bond made, pink = bond broken
  box.flash = box.flash.filter(f => f.t > 0);
  for (const f of box.flash) { const x = ox + f.x * s, y = oy + f.y * s, r = (1.3 - f.t) * 22 * s; const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, f.c ? `rgba(255,120,160,${f.t * .8})` : `rgba(210,255,255,${f.t * .9})`); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); f.t -= 0.07; }
  // particles (shaded spheres); AB is drawn as an A and a B stuck together
  const ball = (x, y, r, col) => { const gr = c.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); gr.addColorStop(0, "#fff"); gr.addColorStop(.25, col); gr.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.fillStyle = gr; c.globalAlpha = .55; c.fill(); c.globalAlpha = 1; };
  for (const q of box.p) { const x = ox + q.x * s, y = oy + q.y * s; if (q.k === 2) { c.strokeStyle = COL[2]; c.lineWidth = 2; c.beginPath(); c.arc(x, y, RAB * 1.35 * s, 0, 6.3); c.stroke(); const dx = Math.cos(q.a) * RA * .75 * s, dy = Math.sin(q.a) * RA * .75 * s; ball(x - dx, y - dy, RA * s, COL[0]); ball(x + dx, y + dy, RA * s, COL[1]); } else ball(x, y, RA * s, COL[q.k]); }
  const n = box.count(); ui.hud(`<span style="color:${COL[0]}">● A ${n[0]}</span> &nbsp; <span style="color:${COL[1]}">● B ${n[1]}</span> &nbsp; <span style="color:${COL[2]}">●● AB ${n[2]}</span>`);
}
let frame = 0;
ui.run(dt => {
  for (let k = 0; k < speed; k++) box.step(1 / 30);
  if (box.t >= nextSample) { // sample twice per time unit
    nextSample = box.t + 0.5; const c = box.conc();
    rateF += ((box.fwd - lastF) / 0.5 - rateF) * .25; rateR += ((box.rev - lastR) / 0.5 - rateR) * .25; lastF = box.fwd; lastR = box.rev;
    hist.a.push([box.t, c[0]]); hist.b.push([box.t, c[1]]); hist.ab.push([box.t, c[2]]); hist.f.push([box.t, rateF]); hist.r.push([box.t, rateR]);
    for (const k in hist) if (hist[k].length > 600) hist[k].shift();
  }
}, () => {
  draw(); if (frame++ % 4) return; drawProfile();
  chC.draw([{ pts: hist.a, color: COL[0], label: "A", dash: [7, 5], width: 2.4 }, { pts: hist.b, color: COL[1], label: "B" }, { pts: hist.ab, color: COL[2], label: "AB" }]);
  chR.draw([{ pts: hist.f, color: "#7ee787", label: "forward (A + B → AB)" }, { pts: hist.r, color: "#ff7b9c", label: "reverse (AB → A + B)" }]);
  const c = box.conc(), q = box.Q(); read.set("a", c[0].toFixed(2)); read.set("b", c[1].toFixed(2)); read.set("ab", c[2].toFixed(2)); read.set("q", isFinite(q) ? q.toFixed(2) : "–"); read.set("dh", (S.eaf.value - S.ear.value).toFixed(1)); read.set("t", box.t.toFixed(0));
});
restart();
ui.tip("Bright flash = bond made · pink flash = bond broken · open Investigate for things to try");
