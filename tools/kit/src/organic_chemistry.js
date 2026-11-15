/* =====================================================================
   CRUDE OIL, CRACKING AND POLYMERS
   Crude oil is a mixture of hydrocarbons, mostly ALKANES: chains of
   carbon atoms with hydrogen round the outside, formula CnH2n+2.

   Five linked parts, each a model built from molecules:
     1. Distil:  the longer the chain, the stronger the forces between
                 molecules, the higher the boiling point. In a column that
                 is hot at the bottom and cool at the top, each molecule
                 rises until it is cooler than its boiling point, then
                 condenses. The fractions sort themselves out.
     2. Crack:   long alkanes are broken on a hot catalyst into shorter
                 alkanes and ALKENES (CnH2n, with a C=C double bond).
     3. Burn:    a hydrocarbon + oxygen → carbon dioxide + water, if there
                 is enough oxygen. If not: carbon monoxide and soot.
     4. Polymerise: alkene monomers join into long chains (addition
                 polymers) when a radical opens their double bonds.
     5. Chlorinate (A level): methane + chlorine in UV light, by a
                 free-radical chain reaction.
   ===================================================================== */

// ---------- Alkanes and boiling points (data, °C) ----------
const BPT = [[1, -162], [2, -89], [3, -42], [4, -0.5], [5, 36], [6, 69], [7, 98], [8, 126], [9, 151], [10, 174], [11, 196], [12, 216], [13, 235], [14, 254], [15, 271], [16, 287], [17, 302], [18, 316], [19, 330], [20, 343], [25, 402], [30, 450], [40, 525], [60, 620], [80, 680]];
function bp(n) { for (let i = 1; i < BPT.length; i++) if (n <= BPT[i][0]) { const [a, A] = BPT[i - 1], [b, B] = BPT[i]; return A + (B - A) * (n - a) / (b - a); } return 680; }
const NAMES = ["", "methane", "ethane", "propane", "butane", "pentane", "hexane", "heptane", "octane", "nonane", "decane", "undecane", "dodecane"];
const formula = (n, ene) => "C" + sub(n) + "H" + sub(ene ? 2 * n : 2 * n + 2);
const sub = n => n === 1 ? "" : String(n).replace(/\d/g, d => "₀₁₂₃₄₅₆₇₈₉"[d]);
// The column: trays at fixed heights (0 = bottom, 1 = top). What each collects depends on its temperature.
const TRAYS = [{ z: 1.0, name: "Refinery gases", use: "bottled gas for heating and cooking", col: "#bfe3ff" }, { z: 0.74, name: "Gasoline (petrol)", use: "fuel for cars", col: "#ffe680" }, { z: 0.54, name: "Kerosene", use: "fuel for aircraft", col: "#ffc266" }, { z: 0.34, name: "Diesel", use: "fuel for lorries, trains and some cars", col: "#ff9a52" }, { z: 0.14, name: "Fuel oil", use: "fuel for ships and power stations", col: "#d9693a" }, { z: 0, name: "Bitumen", use: "surfacing roads and roofs", col: "#6b4a3a" }];
const TPROF = [[0, 1], [0.14, 0.974], [0.34, 0.855], [0.54, 0.671], [0.74, 0.408], [1, 0]];
const CRUDE = { light: { name: "Light crude", m: 9 }, medium: { name: "Medium crude", m: 13 }, heavy: { name: "Heavy crude", m: 20 } };
// chain lengths in crude oil: a spread around a typical length (log-normal)
const crudeN = (m, r) => K.clamp(Math.round(Math.exp(Math.log(m) + 0.6 * gauss(r))), 1, 70);
const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * r()); };
const Phi = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
// theory: the share of crude with chain length n
const pN = (n, m) => n === 1 ? Phi((Math.log(1.5) - Math.log(m)) / 0.6) : n === 70 ? 1 - Phi((Math.log(69.5) - Math.log(m)) / 0.6) : Phi((Math.log(n + 0.5) - Math.log(m)) / 0.6) - Phi((Math.log(n - 0.5) - Math.log(m)) / 0.6);

class Column {
  /* o: { crude (typical chain length m), Tf (furnace °C), mix (how imperfect the trays are, °C) } */
  constructor(o, rand) { this.o = Object.assign({ m: 13, Tf: 400, mix: 10 }, o); this.rand = rand; this.mol = []; this.got = TRAYS.map(() => []); this.cond = []; this.acc = 0; }
  // temperature falls up the column: set at each tray (as a share of the way from 20 °C to the furnace) and straight lines between
  T(z) { const pts = TPROF; for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) { const [a, A] = pts[i - 1], [b, B] = pts[i]; return 20 + (this.o.Tf - 20) * (A + (B - A) * (z - a) / (b - a)); } return 20; }
  feed(n) {                                               // crude enters at the bottom, heated in the furnace
    if (bp(n) > this.o.Tf) { this.got[5].push(n); return; }          // too long to boil: stays liquid, runs out as bitumen
    this.mol.push({ n, z: 0.02, x: (this.rand() - 0.5) * 0.8, v: 0.18 + 0.1 * this.rand(), tb: bp(n) + this.o.mix * gauss(this.rand) });
  }
  step(dt, rate = 10) {
    this.acc += rate * dt; while (this.acc >= 1) { this.acc--; this.feed(crudeN(this.o.m, this.rand)); }
    for (let i = this.mol.length - 1; i >= 0; i--) {
      const q = this.mol[i]; q.z += q.v * dt; q.x = K.clamp(q.x + 0.3 * gauss(this.rand) * Math.sqrt(dt), -0.45, 0.45);
      // THE RULE: once the vapour is cooler than its boiling point, it condenses and drips onto the tray below
      if (this.T(q.z) < q.tb) { const k = TRAYS.findIndex(t => t.z <= q.z); this.got[k].push(q.n); this.cond.push([q.n, this.T(q.z)]); if (this.cond.length > 400) this.cond.shift(); this.mol.splice(i, 1); }
      else if (q.z >= 1) { this.got[0].push(q.n); this.mol.splice(i, 1); }
    }
  }
}

// ---------- Cracking ----------
// rate of cracking per second: k = A e^(−Ea/RT). The catalyst gives a lower-energy route (smaller Ea).
const kCrack = (T, cat) => cat ? 3.7e6 * Math.exp(-120000 / (8.314 * (T + 273))) : 1e9 * Math.exp(-200000 / (8.314 * (T + 273)));
// one cracking: break a random C–C bond. One piece must be an alkene (there are not enough H atoms for two alkanes).
function crackSplit(n, r) {          // returns [alkane, alkene]
  let cut = 1 + Math.floor(r() * (n - 1)); let a = cut, b = n - cut;
  if (a < 2 && b < 2) return null; if (b < 2) [a, b] = [b, a];   // the alkene needs at least 2 carbons
  return [{ n: a, ene: false }, { n: b, ene: true }];
}
class Cracker {
  /* o: { n (feed alkane), T (°C), cat (catalyst on), res (seconds in the hot tube) } */
  constructor(o, rand) { this.o = Object.assign({ n: 10, T: 650, cat: true, res: 2 }, o); this.rand = rand; this.mol = []; this.out = []; this.acc = 0; this.last = null; this.fed = 0; this.cracked = 0; }
  step(dt, rate = 10) {
    const o = this.o, k = kCrack(o.T, o.cat); this.acc += rate * dt;
    while (this.acc >= 1) { this.acc--; this.mol.push({ n: o.n, ene: false, x: 0, y: (this.rand() - 0.5) * 0.7, orig: true, done: false }); this.fed++; }
    for (let i = this.mol.length - 1; i >= 0; i--) {
      const q = this.mol[i]; q.x += dt / o.res; q.y = K.clamp(q.y + 0.25 * gauss(this.rand) * Math.sqrt(dt), -0.4, 0.4);
      // in the hot tube a molecule cracks with probability k × dt each moment (alkenes and short chains are left alone)
      if (!q.ene && q.n >= 3 && this.rand() < k * dt * Math.min(1, (q.n - 2) / 8)) {
        const pr = crackSplit(q.n, this.rand); if (pr) { if (q.orig) this.cracked++; this.last = [q.n, pr[0].n, pr[1].n]; this.mol.splice(i, 1); for (const p of pr) this.mol.push(Object.assign(p, { x: q.x, y: q.y + (p.ene ? 0.06 : -0.06), orig: false, flash: 0.6 })); continue; }
      }
      if (q.flash) q.flash -= dt;
      if (q.x >= 1) { this.out.push(q); this.mol.splice(i, 1); }
    }
    if (this.out.length > 3000) this.out.splice(0, 1000);
  }
}
// batch helper: share of feed molecules cracked at least once
function crackShare(o, r, N = 300) { const k = kCrack(o.T, o.cat); let c = 0; for (let i = 0; i < N; i++) if (r() < 1 - Math.exp(-k * Math.min(1, (o.n - 2) / 8) * o.res)) c++; return 100 * c / N; }

// ---------- Combustion ----------
// each molecule CnH(2n+2) gets a local share of oxygen that varies (imperfect mixing).
// Hydrogen burns to water first; each carbon then gets 1 O (→ CO) or 2 O (→ CO₂) if there is enough, otherwise it stays as soot.
const FUEL = { methane: { n: 1 }, octane: { n: 8 }, dodecane: { n: 12, name: "kerosene (C₁₂)" }, eicosane: { n: 20, name: "fuel oil (C₂₀)" } };
function burnOne(n, phi, r, mix = 0.12) {
  const need = 2 * n + (n + 1), localO = Math.max(0, need * phi * (1 + mix * gauss(r)));   // O atoms needed for complete combustion: 2 per C, 1 per H₂O
  let O = localO - (n + 1); const res = { co2: 0, co: 0, c: 0, h2o: n + 1 };
  if (O < 0) { res.h2o = Math.max(0, Math.round(n + 1 + O)); O = 0; }
  for (let i = 0; i < n; i++) { if (O >= 1) { res.co++; O--; } else res.c++; }
  for (let i = 0; i < res.co && O >= 1; ) { res.co--; res.co2++; O--; }
  return res;
}
const energyOf = q => 394 * q.co2 + 111 * q.co + 286 * q.h2o;    // kJ per mole of fuel, roughly (from enthalpies of formation)
function burnMany(n, phi, r, N = 200) { const t = { co2: 0, co: 0, c: 0, h2o: 0, E: 0 }; for (let i = 0; i < N; i++) { const q = burnOne(n, phi, r); for (const k of ["co2", "co", "c", "h2o"]) t[k] += q[k]; t.E += energyOf(q); } return t; }

// ---------- Addition polymerisation (well mixed, random events) ----------
const MONO = {
  ethene: { name: "ethene", poly: "poly(ethene)", sub: ["H", "H", "H", "H"], use: "plastic bags, bottles, cling film", col: "#9ad0ff" },
  propene: { name: "propene", poly: "poly(propene)", sub: ["H", "CH₃", "H", "H"], use: "crates, ropes, carpets", col: "#b6f0a0" },
  chloroethene: { name: "chloroethene", poly: "poly(chloroethene), PVC", sub: ["H", "Cl", "H", "H"], use: "window frames, pipes, cable insulation", col: "#7fe3a0" },
  tfe: { name: "tetrafluoroethene", poly: "poly(tetrafluoroethene), PTFE", sub: ["F", "F", "F", "F"], use: "non-stick pans, waterproof clothing", col: "#e3b6ff" }
};
class Reactor {
  /* M monomers, I initiator radicals. Events: a radical end adds a monomer; two radical ends meet and join (termination). */
  constructor(M, I, rand) { this.rand = rand; this.M = M; this.M0 = M; this.chains = []; for (let i = 0; i < I; i++) this.chains.push({ len: 0, live: true, x: rand(), y: rand(), pts: [] }); this.dead = []; this.t = 0; }
  live() { return this.chains.filter(c => c.live); }
  step(dt) {
    const kp = 0.02, kt = 0.01; let R = this.live().length;
    // event rates: propagation kp·R·M, termination kt·R(R−1)/2. Pick events at random (Gillespie's method).
    let tleft = dt; while (tleft > 0) {
      const a1 = kp * R * this.M, a2 = kt * R * (R - 1) / 2, a = a1 + a2; if (!a) break; const wait = -Math.log(this.rand() || 1e-9) / a; if (wait > tleft) break; tleft -= wait; this.t += wait;
      const live = this.live();
      if (this.rand() * a < a1) { const c = live[Math.floor(this.rand() * live.length)]; c.len++; this.M--; c.grew = 0.3; }
      else { const i = Math.floor(this.rand() * live.length); let j = Math.floor(this.rand() * (live.length - 1)); if (j >= i) j++; const A = live[i], B = live[j]; A.len += B.len; A.live = false; B.live = false; B.len = 0; B.gone = true; A.joined = 0.6; R -= 2; }
      R = this.live().length;
    }
    this.chains = this.chains.filter(c => !c.gone);
  }
  lengths() { return this.chains.map(c => c.len).filter(l => l > 0); }
}
function polymerise(M, I, r) { const p = new Reactor(M, I, r); p.step(1e12); const L = p.lengths(); return L.reduce((a, b) => a + b, 0) / Math.max(1, L.length); }

// ---------- Free-radical chlorination of methane (A level) ----------
// species: CH4, CH3Cl, CH2Cl2, CHCl3, CCl4 (index = number of Cl), Cl2, HCl, radicals Cl• and R•(index)
class Chlor {
  constructor(nCH4, nCl2, uv, rand) { this.rand = rand; this.m = [nCH4, 0, 0, 0, 0]; this.Cl2 = nCl2; this.HCl = 0; this.Cl = 0; this.R = [0, 0, 0, 0]; this.ethane = 0; this.uv = uv; this.t = 0; this.ev = []; }
  step(dt) {
    let tl = dt; const r = this.rand;
    while (tl > 0) {
      const Rt = this.R.reduce((a, b) => a + b, 0);
      const rates = [this.uv * 0.01 * this.Cl2];                                     // initiation: UV splits Cl₂ → 2Cl•
      for (let i = 0; i < 4; i++) rates.push(0.02 * this.Cl * this.m[i] * (4 - i)); // propagation 1: Cl• takes an H (more H, more chances)
      for (let i = 0; i < 4; i++) rates.push(0.05 * this.R[i] * this.Cl2);          // propagation 2: R• + Cl₂ → RCl + Cl•
      rates.push(0.5 * this.Cl * (this.Cl - 1) / 2, 0.5 * this.Cl * Rt, 0.5 * Rt * (Rt - 1) / 2);   // terminations
      const a = rates.reduce((x, y) => x + y, 0); if (!a) return; const w = -Math.log(r() || 1e-9) / a; if (w > tl) { this.t += tl; return; } tl -= w; this.t += w;
      let u = r() * a, k = 0; while (u > rates[k]) { u -= rates[k]; k++; }
      const pickR = () => { let v = r() * Rt; for (let i = 0; i < 4; i++) { if (v < this.R[i]) return i; v -= this.R[i]; } return 0; };
      if (k === 0) { this.Cl2--; this.Cl += 2; this.ev.push("init"); }
      else if (k <= 4) { const i = k - 1; this.m[i]--; this.Cl--; this.HCl++; this.R[i]++; this.ev.push("p1"); }
      else if (k <= 8) { const i = k - 5; this.R[i]--; this.Cl2--; this.m[i + 1]++; this.Cl++; this.ev.push("p2"); }
      else if (k === 9) { this.Cl -= 2; this.Cl2++; this.ev.push("t"); }
      else if (k === 10) { const i = pickR(); this.R[i]--; this.Cl--; this.m[i + 1]++; this.ev.push("t"); }
      else { const i = pickR(); this.R[i]--; const j = pickR(); if (this.R[j] > 0) this.R[j]--; this.ethane++; this.ev.push("t"); }
      if (this.ev.length > 40) this.ev.shift();
    }
  }
}
function chlorShare(ratio, r) { const c = new Chlor(200, Math.round(200 * ratio), 1, r); for (let k = 0; k < 3000 && c.Cl2 > 0; k++) c.step(1); const tot = c.m[1] + c.m[2] + c.m[3] + c.m[4]; return 100 * c.m[1] / Math.max(1, tot); }
// theory: substitution in steps, each in proportion to the number of H atoms left, until the chlorine is used up
function chlorTheory(ratio) { let m = [1, 0, 0, 0, 0], cl = ratio; const h = 0.002; while (cl > 0) { const rates = [0, 1, 2, 3].map(i => m[i] * (4 - i)), s = rates.reduce((a, b) => a + b, 0); if (!s) break; for (let i = 0; i < 4; i++) { const d = h * rates[i] / s; m[i] -= d; m[i + 1] += d; } cl -= h; } const tot = m[1] + m[2] + m[3] + m[4]; return Math.max(0, 100 * m[1] / tot); }

// ---------------- The page ----------------
const P = { mode: "distil", crude: "medium", Tf: 400, mix: 10, n: 10, T: 650, cat: true, res: 2, fuel: "octane", phi: 1.2, mono: "ethene", M: 600, I: 12, ratio: 1, uv: 1 };
let col, crk, rx, chl, speed = 1, rnd = K.rng(Date.now() % 99991 + 53), flame = [], burnTot = { co2: 0, co: 0, c: 0, h2o: 0, E: 0, n: 0 }, burnAcc = 0;
function restart() {
  col = new Column({ m: CRUDE[P.crude].m, Tf: P.Tf, mix: P.mix }, rnd); crk = new Cracker({ n: P.n, T: P.T, cat: P.cat, res: P.res }, rnd);
  rx = new Reactor(P.M, P.I, rnd); chl = new Chlor(160, Math.round(160 * P.ratio), P.uv, rnd); flame = []; burnTot = { co2: 0, co: 0, c: 0, h2o: 0, E: 0, n: 0 };
}
const ui = K.app({
  title: "Crude Oil, Cracking and Polymers", subject: "Chemistry",
  blurb: "From crude oil to plastic, one molecule at a time",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 4(b) Crude oil, 4(c) Alkanes, 4(d) Alkenes, 4(h) Synthetic polymers: fractional distillation, combustion, cracking, the bromine water test and addition polymerisation.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 6 Organic chemistry I: alkanes (fractional distillation, cracking, combustion, free-radical substitution: initiation, propagation, termination) and alkenes (addition polymers, disposal of polymers)." } },
  missions: [
    { title: "Separating crude oil", q: "Watch the molecules rise up the column. Where do the short chains end up, and where do the long ones? Why?", hint: "Longer chains have stronger forces between molecules (intermolecular forces), so higher boiling points. They condense low down where it is hot. Short chains stay as gas until near the cool top. Each tray collects a fraction: a mixture of chains with similar boiling points, not a single compound.", setup() { set({ mode: "distil" }); } },
    { title: "A cooler furnace", q: "Turn the furnace down to 300 °C. What happens to the amount of bitumen? Why does the refinery not just heat it to 600 °C?", hint: "Fewer molecules boil, so more is left at the bottom as residue. Very hot oil starts to crack and char in the furnace; real refineries send the residue to a second column at low pressure, where boiling points are lower.", setup() { set({ mode: "distil", Tf: 300 }); } },
    { title: "Cracking decane", q: "Decane is cracked over a hot catalyst. Read the equations. What two kinds of molecule are always made? Test the products with bromine water.", hint: "Cracking makes a shorter alkane and an alkene: e.g. C₁₀H₂₂ → C₈H₁₈ + C₂H₄. There are not enough hydrogen atoms for both pieces to be alkanes. Alkenes have a C=C double bond, which reacts with bromine: orange bromine water turns colourless. Alkanes leave it orange.", setup() { set({ mode: "crack", n: 10 }); } },
    { title: "Why crack?", q: "The right-hand chart compares what the column supplies with what people want. Which fractions are in short supply? Which are left over? How does cracking help?", hint: "Crude oil has more long chains than people want, and less petrol and diesel. Cracking turns the surplus of long chains into shorter, more useful ones, plus alkenes to make polymers.", setup() { set({ mode: "distil" }); } },
    { title: "No catalyst", q: "Turn the catalyst off. How hot must the tube be to crack as much? What does the catalyst do?", hint: "Without the catalyst you need about 850 °C instead of 600–700 °C. The catalyst provides a route with a lower activation energy, so more collisions have enough energy to break bonds at a lower temperature.", setup() { set({ mode: "crack", cat: false }); } },
    { title: "Burning: enough oxygen?", q: "Burn octane with plenty of oxygen, then turn the oxygen down to 0.6. What new products appear? Why are they dangerous?", hint: "Complete combustion: carbon dioxide and water, a blue flame. With too little oxygen: incomplete combustion makes carbon monoxide (toxic: it stops blood carrying oxygen, and has no smell) and soot (carbon particles: blackening and breathing problems). Less energy is released too.", setup() { set({ mode: "burn", phi: 1.3 }); } },
    { title: "Addition polymers", q: "Ethene molecules join into poly(ethene). What happens to the double bond? How many monomers end up in a typical chain?", hint: "A radical opens the C=C double bond; the chain grows one monomer at a time, with no other product (addition). Chains are hundreds of monomers long, and not all the same length. The repeat unit is drawn with the extension bonds.", setup() { set({ mode: "polymer", mono: "ethene" }); } },
    { title: "Longer chains", q: "Halve the amount of initiator. What happens to the chain length? Why?", hint: "Fewer radicals start fewer chains, so each one gets more monomers: mean chain length ≈ 2 × monomers ÷ initiator radicals (each chain ends by two growing ends joining). Longer chains tangle more: stronger, higher melting plastics.", setup() { set({ mode: "polymer", I: 6 }); } },
    { lvl: "adv", title: "Free-radical substitution", q: "Methane and chlorine in UV light. Find the initiation, the two propagation steps and the termination steps in the event list. Why does one photon make many molecules of chloromethane?", hint: "Initiation: Cl₂ → 2Cl• (UV breaks the weakest bond). Propagation: Cl• + CH₄ → HCl + •CH₃, then •CH₃ + Cl₂ → CH₃Cl + Cl•: the radical is regenerated, a chain reaction. Termination: two radicals meet (Cl• + •CH₃ → CH₃Cl, •CH₃ + •CH₃ → C₂H₆). Each initiation leads to many propagation cycles.", setup() { set({ mode: "chlor", ratio: 0.5 }); } },
    { lvl: "adv", title: "Excess chlorine: a mixture", q: "Raise the chlorine to 3 times the methane. What products do you get now? How would you make mostly chloromethane?", hint: "Chlorine radicals attack CH₃Cl, CH₂Cl₂ and CHCl₃ as well, so further substitution gives a mixture, up to CCl₄. Use excess methane to make CH₃Cl the main product. Free-radical substitution is hard to control.", setup() { set({ mode: "chlor", ratio: 3 }); } }
  ],
  batch: [
    { title: "Boiling point and chain length", question: "At what temperature does each alkane condense in the column?", how: "Each run: 40 molecules of one chain length go up a column heated to 600 °C (trays a little imperfect); the mean condensing temperature for the chosen chain length is recorded.", xLabel: "carbon atoms in the chain", yLabel: "condensing temperature (°C)", xs: [5, 6, 8, 10, 12, 14, 16, 18, 20], reps: 3, run(x, r) { const c = new Column({ m: x, Tf: 600, mix: 10 }, r); for (let k = 0; k < 40; k++) c.feed(x); for (let s = 0; s < 12; s += 0.05) c.step(0.05, 0); const v = c.cond.filter(q => q[0] === x).map(q => q[1]); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); }, theory: bp, theoryLabel: "data-book boiling point", note: "Boiling point rises with chain length, steeply at first and then more gently: each extra CH₂ adds a little more attraction between molecules." },
    { title: "Furnace temperature and the residue", question: "How much of the crude oil is left at the bottom as bitumen?", how: "Each run: 400 molecules of medium crude enter the column; the percentage that does not boil in the furnace is recorded.", xLabel: "furnace temperature (°C)", yLabel: "left as residue (%)", xs: [250, 300, 350, 400, 450, 500], reps: 4, yMin: 0, run(x, r) { const c = new Column({ m: 13, Tf: x }, r); for (let k = 0; k < 400; k++) c.feed(crudeN(13, r)); return 100 * c.got[5].length / 400; }, theory(x) { let s = 0; for (let n = 1; n <= 70; n++) if (bp(n) > x) s += pN(n, 13); return 100 * s; }, theoryLabel: "share of crude with boiling point above the furnace", note: "The residue falls as the furnace gets hotter, in steps: each step is one more chain length that now boils." },
    { title: "Heavy crude, less petrol", question: "How does the typical chain length of the crude oil change how much gasoline it gives?", how: "Each run: 400 molecules of crude with the chosen typical chain length go through the column (furnace 400 °C); the share collected in the gasoline tray is recorded.", xLabel: "typical chain length of the crude", yLabel: "gasoline (%)", xs: [6, 8, 10, 13, 16, 20, 25], reps: 3, yMin: 0, run(x, r) { const c = new Column({ m: x, Tf: 400, mix: 10 }, r); for (let k = 0; k < 400; k++) c.feed(crudeN(x, r)); for (let s = 0; s < 12; s += 0.05) c.step(0.05, 0); return 100 * c.got[1].length / 400; }, note: "Light crude gives much more petrol: it fetches a higher price. Heavy crude needs more cracking." },
    { title: "Cracking and temperature (with catalyst)", question: "What share of decane is cracked at each temperature?", how: "Each run: 300 decane molecules spend 2 seconds in the tube with the catalyst.", xLabel: "temperature (°C)", yLabel: "decane cracked (%)", xs: [450, 500, 550, 600, 650, 700, 750], reps: 3, yMin: 0, yMax: 100, run: (x, r) => crackShare({ n: 10, T: x, cat: true, res: 2 }, r), theory: x => 100 * (1 - Math.exp(-kCrack(x, true) * 2)), theoryLabel: "1 − e^(−kt), k = A e^(−Ea/RT)", note: "An S-shaped rise: rate constants grow exponentially with temperature (Arrhenius), until almost every molecule is cracked." },
    { title: "Cracking without a catalyst", question: "How much hotter must it be without the catalyst?", how: "As before, but with no catalyst (thermal cracking).", xLabel: "temperature (°C)", yLabel: "decane cracked (%)", xs: [600, 700, 750, 800, 850, 900, 950], reps: 3, yMin: 0, yMax: 100, run: (x, r) => crackShare({ n: 10, T: x, cat: false, res: 2 }, r), theory: x => 100 * (1 - Math.exp(-kCrack(x, false) * 2)), theoryLabel: "1 − e^(−kt), higher Ea", note: "The same curve, about 200 °C hotter: the catalyst lowers the activation energy (here 120 kJ/mol instead of 200)." },
    { title: "Oxygen and carbon monoxide", question: "How much of octane's carbon ends up as carbon monoxide as the oxygen supply changes?", how: "Each run: 200 octane molecules burn with the chosen oxygen supply (1 = exactly enough for complete combustion), with imperfect mixing.", xLabel: "oxygen supply (× the amount needed)", yLabel: "carbon as CO (%)", xs: [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4], reps: 3, yMin: 0, run(x, r) { const t = burnMany(8, x, r); return 100 * t.co / (8 * 200); }, theory(x) { const O = Math.max(0, 25 * x - 9); return 100 * K.clamp(O <= 8 ? O : 16 - O, 0, 8) / 8; }, theoryLabel: "perfect mixing", note: "With perfect mixing there would be no CO at all above 1. Real flames mix imperfectly, so some CO forms even with a little extra oxygen: engines and boilers are run with excess air." },
    { title: "Oxygen and energy", question: "How much energy does burning octane release as the oxygen supply changes?", how: "Each run: 200 octane molecules; energy released per mole of octane, from the products.", xLabel: "oxygen supply (× the amount needed)", yLabel: "energy released (kJ/mol)", xs: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2], reps: 3, yMin: 0, run(x, r) { return burnMany(8, x, r).E / 200; }, note: "Incomplete combustion wastes energy: carbon monoxide and soot still had energy to give. Full combustion gives about 5500 kJ/mol." },
    { title: "Initiator and chain length", question: "How does the amount of initiator change the average polymer chain length?", how: "Each run: 600 ethene molecules with the chosen number of initiator radicals; the run continues until the monomer is used up.", xLabel: "initiator radicals", yLabel: "mean chain length (monomers)", xs: [4, 6, 8, 12, 16, 24, 32], reps: 3, yMin: 0, run: (x, r) => polymerise(600, x, r), theory: x => 2 * 600 / x, theoryLabel: "2 × monomers ÷ initiator", note: "Fewer initiator radicals, longer chains: the monomer is shared among fewer chains. Industry controls chain length, and so the properties of the plastic, this way." },
    { lvl: "adv", title: "Chlorine ratio and the products", question: "What share of the chlorinated products is chloromethane, for different amounts of chlorine?", how: "Each run: 200 methane with chlorine in the chosen ratio, in UV light, until the chlorine is used up.", xLabel: "Cl₂ : CH₄ ratio", yLabel: "CH₃Cl among products (%)", xs: [0.2, 0.5, 1, 1.5, 2, 3, 4], reps: 3, yMin: 0, yMax: 100, run: (x, r) => chlorShare(x, r), theory: chlorTheory, theoryLabel: "random substitution, in proportion to H atoms", note: "With excess methane nearly all the product is CH₃Cl; with excess chlorine the products are more substituted (CH₂Cl₂ … CCl₄)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 4.6", text: "Crude oil is a mixture of hydrocarbons. Fractional distillation separates it into fractions: refinery gases, gasoline, kerosene, diesel, fuel oil and bitumen." },
      { lvl: "std", tag: "4CH1 4.7–4.8", text: "Going down the column, the fractions have longer chains, higher boiling points, are more viscous, darker and harder to ignite." },
      { lvl: "std", tag: "4CH1 4.9–4.11", text: "Complete combustion gives CO₂ and H₂O. Incomplete combustion gives CO (toxic: reduces the blood's ability to carry oxygen) and soot. Burning fuels can also make sulfur dioxide and nitrogen oxides (acid rain)." },
      { lvl: "std", tag: "4CH1 4.13–4.15", text: "Cracking breaks long-chain alkanes into shorter alkanes and alkenes, using a silica or alumina catalyst at 600–700 °C. It matches supply to demand and makes alkenes." },
      { lvl: "std", tag: "4CH1 4.18–4.23", text: "Alkanes CnH2n+2 are saturated; alkenes CnH2n have a C=C double bond. Bromine water turns from orange to colourless with alkenes." },
      { lvl: "std", tag: "4CH1 4.44–4.47", text: "Addition polymers form when many alkene monomers join; the double bond opens. Draw the repeat unit with extension bonds. Addition polymers are inert and non-biodegradable; burning can release toxic gases." },
      { lvl: "adv", tag: "9CH0 6", text: "Free-radical substitution: initiation (Cl₂ → 2Cl• in UV), propagation (Cl• + CH₄ → HCl + •CH₃; •CH₃ + Cl₂ → CH₃Cl + Cl•), termination (two radicals combine). Further substitution gives a mixture." },
      { lvl: "adv", tag: "9CH0 6", text: "Cracking can be thermal or catalytic; reforming turns straight chains into branched and cyclic ones to improve petrol. Polymer disposal: landfill, incineration (energy, but toxic gases such as HCl from PVC), recycling, feedstock recycling." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how fractional distillation separates crude oil into fractions.", ans: "<ul><li>Crude oil is heated and the vapour passes up a column which is hotter at the bottom and cooler at the top</li><li>Fractions condense at different heights according to their boiling points</li><li>Long chains (high boiling point) condense low down; short chains rise higher</li></ul>" },
      { lvl: "std", marks: 2, q: "Complete the equation for cracking decane into octane and one other product: C₁₀H₂₂ → C₈H₁₈ + ____. Name the other product.", ans: "<ul><li>C₂H₄</li><li>ethene</li></ul>" },
      { lvl: "std", marks: 2, q: "Describe a test to show that a hydrocarbon is an alkene.", ans: "<ul><li>Add bromine water and shake</li><li>It turns from orange to colourless</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why carbon monoxide is dangerous and when it forms.", ans: "<ul><li>Forms in incomplete combustion, when there is not enough oxygen</li><li>It combines with haemoglobin in red blood cells</li><li>reducing the ability of blood to carry oxygen (and it is colourless and odourless)</li></ul>" },
      { lvl: "std", marks: 2, q: () => crk.last ? `In the simulation, ${formula(crk.last[0])} cracked into ${formula(crk.last[1])} and one other molecule. Give its formula and say how you know it is an alkene.` : "In a cracking reaction, C₁₂H₂₆ → C₈H₁₈ + X. Give the formula of X and say how you know it is an alkene.", ans: () => crk.last ? `<ul><li>${formula(crk.last[2], true)} (balance C and H)</li><li>It fits CnH2n: the general formula of an alkene</li></ul>` : "<ul><li>C₄H₈</li><li>It fits CnH2n</li></ul>" },
      { lvl: "std", marks: 2, q: "Draw the repeat unit of poly(propene) and name the type of polymerisation.", ans: "<ul><li>–[CH₂–CH(CH₃)]– with extension bonds on both sides</li><li>addition polymerisation</li></ul>" },
      { lvl: "adv", marks: 4, q: "Write the mechanism for the reaction of methane with chlorine to form chloromethane, naming each stage.", ans: "<ul><li>Initiation: Cl₂ → 2Cl• (UV light)</li><li>Propagation: Cl• + CH₄ → HCl + •CH₃</li><li>Propagation: •CH₃ + Cl₂ → CH₃Cl + Cl•</li><li>Termination: e.g. •CH₃ + Cl• → CH₃Cl or 2•CH₃ → C₂H₆</li></ul>" },
      { lvl: "adv", marks: 2, q: "Explain why the reaction of methane with chlorine gives a mixture of products, and how the yield of chloromethane can be increased.", ans: "<ul><li>Cl• radicals also substitute H atoms in chloromethane etc., giving CH₂Cl₂, CHCl₃, CCl₄</li><li>Use excess methane</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Crude oil</b> is a mixture of alkanes with chain lengths spread around a typical value (a log-normal spread). Boiling points are data-book values for straight-chain alkanes.</li>
<li><b>Distil:</b> the furnace boils every molecule whose boiling point is below the furnace temperature; the rest is the residue (bitumen). The column cools from the furnace temperature at the bottom to 20 °C at the top; each tray is set at a fixed share of the way (for a 400 °C furnace: 390, 345, 275 and 175 °C). A rising molecule condenses once the column is cooler than its boiling point (give or take a few degrees, as real trays are imperfect) and drips onto the tray below it.</li>
<li><b>Crack:</b> each alkane in the hot tube cracks at a rate k = A e^(−Ea/RT): Ea = 120 kJ/mol with the catalyst, 200 kJ/mol without. A random C–C bond breaks; one piece is an alkene. Long pieces may crack again.</li>
<li><b>Burn:</b> each molecule gets a local share of oxygen that varies by about 12% (imperfect mixing). Hydrogen burns to water first; carbon gets one oxygen (CO) or two (CO₂) while oxygen lasts; any left becomes soot. Energy uses approximate enthalpies of formation.</li>
<li><b>Polymerise:</b> well mixed, with events chosen at random in proportion to their rates (Gillespie's method): a growing chain end adds a monomer, or two chain ends meet and join.</li>
<li><b>Chlorinate (A level):</b> the same random-event method for the free-radical chain: initiation, two propagation steps (H taken in proportion to the number of H atoms), and three terminations.</li></ul>
<h3>Simplifications</h3>
<ul><li>Crude oil is treated as straight-chain alkanes only; real crude also has branched alkanes, cycloalkanes, aromatics and sulfur compounds.</li>
<li>Real columns use bubble caps, reflux and side strippers, and are not at a single pressure; the residue is often re-distilled under vacuum.</li>
<li>Cracking really goes through radicals or carbocations and gives a wider mixture, including branched products and hydrogen.</li>
<li>Polymer chains do not branch; real poly(ethene) (LDPE) has many branches.</li>
<li>Molecules are drawn hugely magnified and in small numbers.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/organic-chemistry.html">original/organic-chemistry.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("Part of the story");
ctl.mode = K.seg(g, { value: "distil", options: [["distil", "1 · Distil"], ["crack", "2 · Crack"], ["burn", "3 · Burn"], ["polymer", "4 · Polymerise"]], on: v => set({ mode: v }) });
ctl.mode2 = K.seg(g, { value: "", options: [["chlor", "5 · Chlorinate (A level)"]], on: v => set({ mode: v }) });
g = grp.distil = ui.group("Fractional distillation");
ctl.crude = K.seg(g, { label: "Crude oil", value: "medium", options: Object.entries(CRUDE).map(([k, c]) => [k, c.name.split(" ")[0]]), on: v => { P.crude = v; col.o.m = CRUDE[v].m; } });
ctl.Tf = K.slider(g, { label: "Furnace temperature", min: 250, max: 450, step: 5, value: 400, unit: " °C", on: v => { P.Tf = v; col.o.Tf = v; } });
ctl.mix = K.slider(g, { label: "How imperfect the trays are", min: 0, max: 40, step: 1, value: 10, unit: " °C", on: v => { P.mix = v; col.o.mix = v; } });
K.btn(K.row(g), "Empty the trays", () => { col = new Column({ m: CRUDE[P.crude].m, Tf: P.Tf, mix: P.mix }, rnd); });
g = grp.crack = ui.group("Cracking");
ctl.n = K.slider(g, { label: "Alkane fed in", min: 4, max: 30, step: 1, value: 10, fmt: v => formula(v) + (NAMES[v] ? " (" + NAMES[v] + ")" : ""), on: v => { P.n = v; crk.o.n = v; } });
ctl.T = K.slider(g, { label: "Temperature", min: 400, max: 1000, step: 10, value: 650, unit: " °C", on: v => { P.T = v; crk.o.T = v; } });
ctl.cat = K.toggle(g, { label: "Catalyst (silica or alumina)", value: true, on: v => { P.cat = v; crk.o.cat = v; } });
ctl.res = K.slider(g, { label: "Time in the hot tube", min: 0.5, max: 6, step: 0.1, value: 2, unit: " s", on: v => { P.res = v; crk.o.res = v; } });
K.btn(K.row(g), "Collect fresh products", () => { crk.out = []; crk.fed = 0; crk.cracked = 0; });
g = grp.burn = ui.group("Combustion");
ctl.fuel = K.seg(g, { label: "Fuel", value: "octane", options: Object.keys(FUEL).map(k => [k, k]), on: v => { P.fuel = v; burnTot = { co2: 0, co: 0, c: 0, h2o: 0, E: 0, n: 0 }; } });
ctl.phi = K.slider(g, { label: "Oxygen supply", min: 0.3, max: 1.6, step: 0.05, value: 1.2, fmt: v => "× " + v.toFixed(2) + (v >= 1 ? " (enough)" : " (too little)"), on: v => { P.phi = v; burnTot = { co2: 0, co: 0, c: 0, h2o: 0, E: 0, n: 0 }; } });
g = grp.polymer = ui.group("Addition polymerisation");
ctl.mono = K.seg(g, { label: "Monomer", value: "ethene", options: Object.entries(MONO).map(([k, m]) => [k, k === "tfe" ? "TFE" : m.name]), on: v => { P.mono = v; } });
ctl.M = K.slider(g, { label: "Monomer molecules", min: 100, max: 1500, step: 50, value: 600, on: v => { P.M = v; rx = new Reactor(P.M, P.I, rnd); } });
ctl.I = K.slider(g, { label: "Initiator radicals", min: 2, max: 40, step: 1, value: 12, on: v => { P.I = v; rx = new Reactor(P.M, P.I, rnd); } });
K.btn(K.row(g), "↺ Start again", () => { rx = new Reactor(P.M, P.I, rnd); }, "primary");
g = grp.chlor = ui.group("Methane + chlorine in UV light");
ctl.ratio = K.slider(g, { label: "Cl₂ : CH₄", min: 0.1, max: 4, step: 0.1, value: 1, on: v => { P.ratio = v; chl = new Chlor(160, Math.round(160 * v), P.uv, rnd); } });
ctl.uv = K.slider(g, { label: "UV light", min: 0, max: 3, step: 0.1, value: 1, on: v => { P.uv = v; chl.uv = v; } });
K.btn(K.row(g), "↺ Start again", () => { chl = new Chlor(160, Math.round(160 * P.ratio), P.uv, rnd); }, "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);   // the four tiles are relabelled for each part
function set(o) {
  const mode = o.mode || P.mode;
  Object.assign(P, { crude: "medium", Tf: 400, mix: 10, n: 10, T: 650, cat: true, res: 2, fuel: "octane", phi: 1.2, mono: "ethene", M: 600, I: 12, ratio: 1, uv: 1 }, o, { mode });
  for (const k of ["Tf", "mix", "n", "T", "res", "phi", "M", "I", "ratio", "uv"]) ctl[k].set(P[k]); ctl.cat.set(P.cat); ctl.crude.set(P.crude); ctl.fuel.set(P.fuel); ctl.mono.set(P.mono);
  ctl.mode.set(mode === "chlor" ? "" : mode); ctl.mode2.set(mode === "chlor" ? "chlor" : "");
  for (const k in grp) grp[k].style.display = k === mode ? "" : "none";
  restart();
}
ui.onLevel = () => { if (ui.level !== "adv" && P.mode === "chlor") set({ mode: "distil" }); };

// ---------------- Drawing helpers ----------------
const cv = ui.canvas(() => { });
// a chain of n carbon atoms as a zigzag; an alkene shows its C=C double bond in green
function chain(c, x, y, n, s, ene, alpha = 1) {
  const shown = Math.min(n, 14), step = s * 1.1; c.globalAlpha = alpha; c.strokeStyle = "#cfd8e6"; c.lineWidth = Math.max(1, s * 0.35); c.beginPath();
  for (let i = 0; i < shown; i++) { const px = x + (i - shown / 2) * step, py = y + (i % 2 ? s * 0.5 : -s * 0.5); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
  if (ene && shown > 1) { c.strokeStyle = "#5fe38a"; c.lineWidth = Math.max(1.5, s * 0.5); c.beginPath(); c.moveTo(x - shown / 2 * step, y - s * 0.5); c.lineTo(x + (1 - shown / 2) * step, y + s * 0.5); c.stroke(); }
  c.fillStyle = "#9aa4b8"; for (let i = 0; i < shown; i++) { c.beginPath(); c.arc(x + (i - shown / 2) * step, y + (i % 2 ? s * 0.5 : -s * 0.5), s * 0.55, 0, 6.3); c.fill(); }
  if (n > 14) { c.fillStyle = "#aab6cc"; c.font = "10px Segoe UI,sans-serif"; c.fillText("…", x + shown / 2 * step + 2, y + 3); }
  c.globalAlpha = 1;
}
const stats = arr => { if (!arr.length) return "—"; const s = arr.slice().sort((a, b) => a - b); return `C${sub(s[Math.floor(s.length * 0.1)])}–C${sub(s[Math.floor(s.length * 0.9)])}`; };
// rough demand for each fraction (% of the market) to compare with supply from the column
const DEMAND = [4, 30, 10, 30, 18, 8];

function drawDistil(c, w, h) {
  const cx = w * 0.32, top = 40, bot = h - 60, cw = Math.min(170, w * 0.2), H = bot - top, Y = z => bot - z * H;
  // the column, coloured from hot (bottom) to cool (top)
  const gr = c.createLinearGradient(0, bot, 0, top); gr.addColorStop(0, "#7a2d1a"); gr.addColorStop(1, "#1a2a44"); c.fillStyle = gr; c.beginPath(); c.roundRect(cx - cw / 2, top, cw, H, 14); c.fill();
  c.fillStyle = "#ff7a2a"; c.beginPath(); c.moveTo(cx - 40, bot + 40); for (let k = 0; k < 7; k++) c.lineTo(cx - 40 + k * 13, bot + 22 - 10 * Math.abs(Math.sin(performance.now() / 150 + k))); c.lineTo(cx + 40, bot + 40); c.fill();
  c.fillStyle = "#eef2f8"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "center"; c.textAlign = "left"; c.fillText(`furnace ${P.Tf} °C`, cx + 50, bot + 34);
  const tot = col.got.reduce((a, b) => a + b.length, 0) || 1;
  TRAYS.forEach((t, i) => {
    const y = Y(t.z) + (i === 5 ? -6 : 0); c.strokeStyle = "#cfd8e6"; c.lineWidth = 2; if (i > 0 && i < 5) { c.beginPath(); c.moveTo(cx - cw / 2, y); c.lineTo(cx + cw / 2, y); c.stroke(); }
    c.strokeStyle = t.col; c.beginPath(); c.moveTo(cx + cw / 2, y); c.lineTo(cx + cw / 2 + 40, y); c.stroke();
    const pct = 100 * col.got[i].length / tot, bx = cx + cw / 2 + 46; c.fillStyle = t.col; c.fillRect(bx, y - 7, Math.max(2, pct * 2.4), 14);
    c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.font = "600 12.5px Segoe UI,sans-serif"; c.fillText(`${t.name}  ${pct.toFixed(0)}%`, bx + Math.max(2, pct * 2.4) + 8, y - 1);
    c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText(`${stats(col.got[i])} · ${i === 0 ? "below " + Math.round(col.T(1)) : i === 5 ? "above " + Math.round(col.T(0.14)) : Math.round(col.T(TRAYS[i - 1].z)) + "–" + Math.round(col.T(TRAYS[i].z))} °C · ${t.use}`, bx + Math.max(2, pct * 2.4) + 8, y + 12);
    if (i > 0 && i < 5) { c.textAlign = "right"; c.fillStyle = "#aab6cc"; c.fillText(Math.round(col.T(t.z)) + " °C", cx - cw / 2 - 6, y + 4); }
  });
  for (const q of col.mol) chain(c, cx + q.x * cw * 0.7, Y(q.z), q.n, 3, false, 0.95);
  c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("Fractional distillation of " + CRUDE[P.crude].name.toLowerCase(), 14, 24);
  c.font = "11.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText("hot at the bottom, cool at the top: each molecule condenses where the column is cooler than its boiling point", 14, h - 8);
}
function drawCrack(c, w, h) {
  const x0 = 60, x1 = w - 260, yc = h * 0.38, th = Math.min(150, h * 0.3), X = x => x0 + x * (x1 - x0), Y = y => yc + y * th;
  c.fillStyle = "#2a1a14"; c.beginPath(); c.roundRect(x0 - 10, yc - th / 2 - 8, x1 - x0 + 20, th + 16, 18); c.fill();
  const glow = K.clamp((P.T - 400) / 600, 0, 1); c.fillStyle = `rgba(255,${Math.round(120 - 60 * glow)},40,${0.12 + 0.3 * glow})`; c.fillRect(x0, yc - th / 2, x1 - x0, th);
  if (P.cat) { c.fillStyle = "#c9c2b0"; for (let x = x0 + 8; x < x1; x += 16) { c.beginPath(); c.arc(x, yc + th / 2 - 6, 4, 0, 6.3); c.fill(); c.beginPath(); c.arc(x + 8, yc - th / 2 + 6, 4, 0, 6.3); c.fill(); } }
  for (const q of crk.mol) { chain(c, X(q.x), Y(q.y), q.n, 2.4, q.ene); if (q.flash > 0) { c.fillStyle = `rgba(255,240,150,${q.flash})`; c.beginPath(); c.arc(X(q.x), Y(q.y), 10, 0, 6.3); c.fill(); } }
  c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(`Cracking ${formula(P.n)} at ${P.T} °C ${P.cat ? "over a catalyst" : "(no catalyst)"}`, 14, 24);
  c.font = "11.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText("alkanes fed in →", x0, yc - th / 2 - 16); c.textAlign = "right"; c.fillText("→ products", x1, yc - th / 2 - 16);
  // the latest equation
  if (crk.last) { c.textAlign = "center"; c.font = "600 17px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; const [a, b, e] = crk.last; c.fillText(`${formula(a)}  →  ${formula(b)}  +  ${formula(e, true)}`, (x0 + x1) / 2, yc + th / 2 + 40); c.font = "11.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText(`${NAMES[a] || "alkane"} → ${NAMES[b] || "alkane"} (alkane) + ${b && e ? (NAMES[e] || "").replace("ane", "ene") || "alkene" : "alkene"} (alkene)`, (x0 + x1) / 2, yc + th / 2 + 58); }
  // bromine water test on the collected products
  const ene = crk.out.filter(q => q.ene).length, colr = K.clamp(1 - ene / 25, 0, 1), tx = w - 190, ty = 70, tw = 46, tH = 150;
  for (const [i, lab, cc] of [[0, "feed (alkane)", 1], [1, "products", colr]]) { const x = tx + i * 90; c.strokeStyle = "#cfd8e6"; c.lineWidth = 2; c.beginPath(); c.roundRect(x, ty, tw, tH, [0, 0, 20, 20]); c.stroke(); c.fillStyle = `rgba(${Math.round(240)},${Math.round(130 + 110 * (1 - cc))},${Math.round(30 + 200 * (1 - cc))},${0.2 + 0.7 * cc})`; c.beginPath(); c.roundRect(x + 3, ty + tH * 0.35, tw - 6, tH * 0.65 - 3, [0, 0, 18, 18]); c.fill(); c.fillStyle = "#aab6cc"; c.textAlign = "center"; c.fillText(lab, x + tw / 2, ty + tH + 16); }
  c.fillStyle = "#eef2f8"; c.font = "600 12.5px Segoe UI,sans-serif"; c.fillText("bromine water", tx + 68, ty - 12); c.font = "11.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText(colr < 0.3 ? "decolourised: alkenes present" : "orange", tx + 68, ty + tH + 34);
}
function drawBurn(c, w, h) {
  const cx = w * 0.35, base = h - 70, phi = P.phi, n = FUEL[P.fuel].n;
  c.fillStyle = "#59606e"; c.fillRect(cx - 18, base, 36, 60);
  // flame: blue and clean with enough oxygen; yellow and smoky without
  const sooty = K.clamp((1.05 - phi) / 0.6, 0, 1), fh = 160 + 80 * sooty;
  for (let k = 0; k < 3; k++) { const t = performance.now() / 120 + k; c.fillStyle = sooty > 0.15 ? `rgba(255,${Math.round(190 - 60 * k)},${Math.round(60 - 20 * k)},${0.35 + 0.2 * sooty})` : `rgba(${80 + 40 * k},${140 + 30 * k},255,0.4)`; c.beginPath(); c.moveTo(cx - 22 + k * 6, base); c.quadraticCurveTo(cx - 30 + 6 * Math.sin(t), base - fh * (1 - k * 0.25) / 2, cx + 3 * Math.sin(t * 1.3), base - fh * (1 - k * 0.25)); c.quadraticCurveTo(cx + 30 + 6 * Math.sin(t * 0.8), base - fh * (1 - k * 0.25) / 2, cx + 22 - k * 6, base); c.fill(); }
  // products rising
  const sym = { co2: ["CO₂", "#e8ecf2"], h2o: ["H₂O", "#7fc8ff"], co: ["CO", "#ff6b6b"], c: ["C", "#222"] };
  for (const f of flame) { c.globalAlpha = K.clamp(f.life, 0, 1); if (f.k === "c") { c.fillStyle = "#111"; c.beginPath(); c.arc(f.x, f.y, 4, 0, 6.3); c.fill(); } else { c.fillStyle = sym[f.k][1]; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(sym[f.k][0], f.x, f.y); } } c.globalAlpha = 1;
  const t = burnTot, tc = Math.max(1, t.co2 + t.co + t.c);
  c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText(`Burning ${FUEL[P.fuel].name || P.fuel} (${formula(n)}) with ${phi >= 1 ? "enough" : "too little"} oxygen`, 14, 24);
  const bx = w * 0.62; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("Where the carbon goes", bx, 70);
  [["co2", "carbon dioxide (complete)"], ["co", "carbon monoxide (toxic)"], ["c", "soot (carbon)"]].forEach(([k, lab], i) => { const v = t[k] / tc; c.fillStyle = sym[k][1] === "#222" ? "#555" : sym[k][1]; c.fillRect(bx, 84 + i * 34, Math.max(2, v * 220), 20); c.fillStyle = "#eef2f8"; c.font = "12px Segoe UI,sans-serif"; c.fillText(`${lab}: ${(100 * v).toFixed(0)}%`, bx, 84 + i * 34 + 32 - 2); });
  c.font = "600 15px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; const best = energyOf({ co2: n, co: 0, c: 0, h2o: n + 1 }); c.fillText(`Energy: ${(t.E / Math.max(1, t.n)).toFixed(0)} kJ per mole of fuel`, bx, 200); c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText(`(complete combustion would give about ${best} kJ)`, bx, 218);
  c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; const o2 = (3 * n + 1) / 2; c.fillText(`Complete: ${formula(n)} + ${o2 % 1 ? (2 * o2) + "/2" : o2} O₂ → ${n === 1 ? "" : n + " "}CO₂ + ${n + 1} H₂O`, bx, 260);
}
function drawPolymer(c, w, h) {
  const m = MONO[P.mono]; c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText(`${m.name} → ${m.poly}`, 14, 24);
  // monomers as small double-bonded pairs, scattered; chains as random walks whose length shows the number of monomers
  const bx = 14, by = 40, bw = w * 0.6, bh = h - 70, rr = K.rng(7);
  const shown = Math.min(rx.M, 500); c.strokeStyle = "#5fe38a"; c.lineWidth = 1.6; for (let i = 0; i < shown; i++) { const x = bx + rr() * bw, y = by + rr() * bh, a = rr() * 3; c.beginPath(); c.moveTo(x - 3 * Math.cos(a), y - 3 * Math.sin(a)); c.lineTo(x + 3 * Math.cos(a), y + 3 * Math.sin(a)); c.stroke(); }
  for (const ch of rx.chains) { const r2 = K.rng(Math.floor(ch.x * 1e6) + 1); let x = bx + ch.x * bw, y = by + ch.y * bh, a = r2() * 6.3; c.strokeStyle = ch.live ? m.col : "#8c96aa"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y); for (let i = 0; i < ch.len; i++) { a += (r2() - 0.5) * 1.2; x = K.clamp(x + 3 * Math.cos(a), bx, bx + bw); y = K.clamp(y + 3 * Math.sin(a), by, by + bh); c.lineTo(x, y); } c.stroke(); if (ch.live) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, y, 3.5, 0, 6.3); c.fill(); } }
  // the repeat unit
  const ux = w * 0.68, uy = 90, s = m.sub; c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("monomer", ux, 60); c.fillText("repeat unit", ux + 150, 60);
  const draw2 = (x, y, dbl, ext) => { c.font = "600 15px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("C", x, y + 5); c.fillText("C", x + 44, y + 5); c.strokeStyle = "#eef2f8"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 8, y - (dbl ? 3 : 0)); c.lineTo(x + 36, y - (dbl ? 3 : 0)); if (dbl) { c.moveTo(x + 8, y + 3); c.lineTo(x + 36, y + 3); } c.stroke();
    c.font = "13px Segoe UI,sans-serif"; [[x, y - 30, s[0]], [x, y + 36, s[2]], [x + 44, y - 30, s[1]], [x + 44, y + 36, s[3]]].forEach(([xx, yy, t]) => { c.fillText(t, xx, yy); c.beginPath(); c.moveTo(xx, yy + (yy < y ? 4 : -14)); c.lineTo(xx, yy < y ? y - 9 : y + 9); c.stroke(); });
    if (ext) { c.beginPath(); c.moveTo(x - 28, y); c.lineTo(x - 8, y); c.moveTo(x + 52, y); c.lineTo(x + 72, y); c.stroke(); c.font = "38px Segoe UI,sans-serif"; c.fillText("(", x - 16, y + 13); c.fillText(")", x + 60, y + 13); c.font = "13px Segoe UI,sans-serif"; c.fillText("n", x + 74, y + 24); } };
  c.fillStyle = "#eef2f8"; draw2(ux, uy + 30, true, false); draw2(ux + 165, uy + 30, false, true);
  c.textAlign = "left"; c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText("Uses: " + m.use, ux, uy + 110);
  c.fillText("yellow dot: a growing chain end (radical)", ux, uy + 130); c.fillText("grey: finished chains · green dashes: monomers", ux, uy + 148);
}
function drawChlor(c, w, h) {
  c.textAlign = "left"; c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("CH₄ + Cl₂ in UV light: free-radical substitution", 14, 24);
  const names = ["CH₄", "CH₃Cl", "CH₂Cl₂", "CHCl₃", "CCl₄"], cols = ["#9ad0ff", "#7fe3a0", "#ffd166", "#ff9a52", "#ff6b6b"];
  const bx = 30, by = 60, bw = w * 0.5, bh = h - 120, tot = chl.m.reduce((a, b) => a + b, 0) + chl.Cl2 + chl.HCl, rr = K.rng(11);
  const items = []; chl.m.forEach((v, i) => { for (let k = 0; k < v; k++) items.push([names[i], cols[i]]); }); for (let k = 0; k < chl.Cl2; k++) items.push(["Cl₂", "#b6f0a0"]); for (let k = 0; k < chl.HCl; k++) items.push(["HCl", "#8c96aa"]);
  c.font = "10px Segoe UI,sans-serif"; c.textAlign = "center"; for (const [t, cc] of items) { c.fillStyle = cc; c.fillText(t, bx + rr() * bw, by + rr() * bh); }
  const rad = chl.Cl + chl.R.reduce((a, b) => a + b, 0); c.fillStyle = "#fff"; for (let k = 0; k < rad; k++) { c.beginPath(); c.arc(bx + Math.random() * bw, by + Math.random() * bh, 3, 0, 6.3); c.fill(); }
  // event list
  const ex = w * 0.6; c.textAlign = "left"; c.font = "600 13px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; c.fillText("The steps", ex, 60);
  const steps = [["init", "Initiation", "Cl₂ → 2Cl•  (UV)"], ["p1", "Propagation", "Cl• + CH₄ → HCl + •CH₃"], ["p2", "Propagation", "•CH₃ + Cl₂ → CH₃Cl + Cl•"], ["t", "Termination", "two radicals → a molecule"]];
  const cnt = k => chl.ev.filter(e => e === k).length;
  steps.forEach(([k, a, b], i) => { c.fillStyle = ["#ffd166", "#7fe3a0", "#7fe3a0", "#ff9a52"][i]; c.font = "600 12.5px Segoe UI,sans-serif"; c.fillText(a, ex, 90 + i * 40); c.font = "12.5px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; c.fillText(b, ex, 106 + i * 40); c.fillStyle = "#aab6cc"; c.fillText(`${cnt(k)} of the last 40 events`, ex + 190, 106 + i * 40); });
  c.font = "600 13px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; c.fillText("Products", ex, 270); chl.m.forEach((v, i) => { if (!i) return; c.fillStyle = cols[i]; c.fillRect(ex, 280 + (i - 1) * 22, v * 1.2, 14); c.fillStyle = "#eef2f8"; c.font = "12px Segoe UI,sans-serif"; c.fillText(`${names[i]} ${v}`, ex + v * 1.2 + 6, 292 + (i - 1) * 22); });
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#080c15"; c.fillRect(0, 0, w, h); ({ distil: drawDistil, crack: drawCrack, burn: drawBurn, polymer: drawPolymer, chlor: drawChlor })[P.mode](c, w, h); }

const chA = K.chart(ui.dock, { title: "", xLabel: "", yLabel: "" });
const chB = K.chart(ui.dock, { title: "", xLabel: "", yLabel: "" });
function charts() {
  const o = (ch, t, x, y) => { ch.opts.title = t; ch.opts.xLabel = x; ch.opts.yLabel = y; };
  if (P.mode === "distil") {
    o(chA, "Boiling point and chain length", "carbon atoms", "°C"); const th = []; for (let n = 1; n <= 30; n++) th.push([n, bp(n)]);
    chA.draw([{ pts: th, color: K.cssVar("--s1"), dash: [5, 4], label: "data book" }, { pts: col.cond, type: "dots", color: K.cssVar("--s2"), r: 2.5, label: "condensed here" }], { xMin: 0, xMax: 30 });
    o(chB, "Supply from this crude and demand", "fraction (top → bottom)", "%"); const tot = col.got.reduce((a, b) => a + b.length, 0) || 1;
    chB.draw([{ pts: TRAYS.map((t, i) => [i + 0.82, 100 * col.got[i].length / tot]), w: 0.34, type: "bars", color: K.cssVar("--s0"), label: "supply" }, { pts: TRAYS.map((t, i) => [i + 1.18, DEMAND[i]]), w: 0.34, type: "bars", color: "#ffb347", label: "demand" }], { xMin: 0.4, xMax: 6.6, yMin: 0, xFmt: v => ["", "gas", "petrol", "kero", "diesel", "fuel oil", "bitumen"][Math.round(v)] || "" });
  } else if (P.mode === "crack") {
    o(chA, "Chain lengths of the products", "carbon atoms", "molecules"); const al = new Array(31).fill(0), en = new Array(31).fill(0); for (const q of crk.out) (q.ene ? en : al)[Math.min(30, q.n)]++;
    chA.draw([{ pts: al.map((v, i) => [i - 0.2, v]), w: 0.4, type: "bars", color: "#8a94a8", label: "alkanes" }, { pts: en.map((v, i) => [i + 0.2, v]), w: 0.4, type: "bars", color: "#5fe38a", label: "alkenes" }], { xMin: 0, xMax: Math.max(12, P.n + 1), yMin: 0 });
    o(chB, "Share cracked against temperature", "temperature (°C)", "% cracked"); const a = [], b = []; for (let T = 400; T <= 1000; T += 10) { a.push([T, 100 * (1 - Math.exp(-kCrack(T, true) * P.res))]); b.push([T, 100 * (1 - Math.exp(-kCrack(T, false) * P.res))]); }
    chB.draw([{ pts: a, color: "#5fe38a", width: 2, label: "with catalyst" }, { pts: b, color: "#ff9a52", width: 2, label: "no catalyst" }, { pts: [[P.T, 100 * crk.cracked / Math.max(1, crk.fed)]], type: "dots", color: "#fff", r: 5, label: "this tube" }], { xMin: 400, xMax: 1000, yMin: 0, yMax: 100 });
  } else if (P.mode === "burn") {
    const n = FUEL[P.fuel].n, r = K.rng(5), a = [], b = [], e = []; for (let f = 0.3; f <= 1.6; f += 0.05) { const t = burnMany(n, f, r, 60); a.push([f, 100 * t.co2 / (60 * n)]); b.push([f, 100 * t.co / (60 * n)]); e.push([f, 100 * t.c / (60 * n)]); }
    o(chA, "Where the carbon goes", "oxygen supply (× needed)", "% of carbon"); chA.draw([{ pts: a, color: "#e8ecf2", width: 2, label: "CO₂" }, { pts: b, color: "#ff6b6b", width: 2, label: "CO" }, { pts: e, color: "#777", width: 2, label: "soot" }], { xMin: 0.3, xMax: 1.6, yMin: 0, yMax: 100, vlines: [{ x: P.phi, color: "#ffffff88", label: "now" }] });
    o(chB, "Energy released", "oxygen supply (× needed)", "kJ per mol of fuel"); const en = []; for (let f = 0.3; f <= 1.6; f += 0.05) en.push([f, burnMany(n, f, r, 40).E / 40]); chB.draw([{ pts: en, color: "#ffd166", width: 2, label: "energy" }], { xMin: 0.3, xMax: 1.6, yMin: 0, vlines: [{ x: P.phi, color: "#ffffff88", label: "now" }] });
  } else if (P.mode === "polymer") {
    const L = rx.lengths(), mx = Math.max(50, ...L), bins = 20, bw = Math.ceil(mx / bins), hist = new Array(bins + 1).fill(0); for (const l of L) hist[Math.min(bins, Math.floor(l / bw))]++;
    o(chA, "Chain lengths", "monomers per chain", "chains"); chA.draw([{ pts: hist.map((v, i) => [(i + 0.5) * bw, v]), w: bw * 0.9, type: "bars", color: MONO[P.mono].col }], { xMin: 0, xMax: (bins + 1) * bw, yMin: 0, vlines: L.length ? [{ x: L.reduce((a, b) => a + b, 0) / L.length, color: "#fff", label: "mean" }] : [] });
    o(chB, "Monomer left", "time", "monomers"); rx.hist = rx.hist || []; if (!rx.hist.length || rx.t - rx.hist[rx.hist.length - 1][0] > 0.2) rx.hist.push([rx.t, rx.M]); chB.draw([{ pts: rx.hist, color: "#5fe38a", width: 2, label: "monomer" }], { xMin: 0, yMin: 0, yMax: P.M });
  } else {
    o(chA, "Products as the chlorine is used", "time", "molecules"); chl.hist = chl.hist || []; if (!chl.hist.length || chl.t - chl.hist[chl.hist.length - 1][0] > 0.2) chl.hist.push([chl.t, ...chl.m, chl.Cl2]);
    const cols = ["#9ad0ff", "#7fe3a0", "#ffd166", "#ff9a52", "#ff6b6b"], nm = ["CH₄", "CH₃Cl", "CH₂Cl₂", "CHCl₃", "CCl₄"]; chA.draw(nm.map((t, i) => ({ pts: chl.hist.map(r => [r[0], r[i + 1]]), color: cols[i], width: 2, label: t })).concat([{ pts: chl.hist.map(r => [r[0], r[6]]), color: "#b6f0a0", dash: [4, 3], label: "Cl₂" }]), { xMin: 0, yMin: 0 });
    o(chB, "CH₃Cl among products against chlorine ratio", "Cl₂ : CH₄", "% CH₃Cl"); const th = []; for (let r = 0.1; r <= 4; r += 0.1) th.push([r, chlorTheory(r)]); const tot = chl.m[1] + chl.m[2] + chl.m[3] + chl.m[4];
    chB.draw([{ pts: th, color: K.cssVar("--s1"), dash: [5, 4], label: "theory" }].concat(tot ? [{ pts: [[P.ratio, 100 * chl.m[1] / tot]], type: "dots", color: "#fff", r: 5, label: "this run" }] : []), { xMin: 0, xMax: 4, yMin: 0, yMax: 100 });
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const h = dt * speed;
  if (P.mode === "distil") col.step(h);
  else if (P.mode === "crack") crk.step(h);
  else if (P.mode === "burn") {
    burnAcc += h * 4; const n = FUEL[P.fuel].n;
    while (burnAcc >= 1) { burnAcc--; const q = burnOne(n, P.phi, rnd); burnTot.n++; burnTot.E += energyOf(q); for (const k of ["co2", "co", "c", "h2o"]) { burnTot[k] += q[k]; if (q[k] && rnd() < 0.6) flame.push({ k, x: cv.w * 0.35 + 30 * gauss(rnd), y: cv.h - 160, vy: -40 - 30 * rnd(), life: 2.5 }); } }
    for (let i = flame.length - 1; i >= 0; i--) { const f = flame[i]; f.y += f.vy * h; f.x += 10 * gauss(rnd) * h; f.life -= h; if (f.life <= 0) flame.splice(i, 1); }
  }
  else if (P.mode === "polymer") rx.step(h * 4);
  else chl.step(h * 3);
}, () => {
  draw(); if (frame++ % 8) return; charts();
  let rows;
  if (P.mode === "distil") { const tot = col.got.reduce((a, b) => a + b.length, 0); rows = [["molecules separated", tot], ["still rising", col.mol.length], ["bitumen (did not boil)", tot ? (100 * col.got[5].length / tot).toFixed(0) + "%" : "—"], ["gasoline", tot ? (100 * col.got[1].length / tot).toFixed(0) + "%" : "—"]]; }
  else if (P.mode === "crack") { const ene = crk.out.filter(q => q.ene).length; rows = [["feed molecules", crk.fed], ["cracked", crk.fed ? (100 * crk.cracked / crk.fed).toFixed(0) + "%" : "—"], ["alkenes made", ene], ["rate constant k", K.sig(kCrack(P.T, P.cat), 2) + " per s"]]; }
  else if (P.mode === "burn") { const tc = Math.max(1, burnTot.co2 + burnTot.co + burnTot.c); rows = [["fuel molecules burnt", burnTot.n], ["carbon as CO₂", (100 * burnTot.co2 / tc).toFixed(0) + "%"], ["carbon as CO", (100 * burnTot.co / tc).toFixed(0) + "%"], ["soot", (100 * burnTot.c / tc).toFixed(0) + "%"]]; }
  else if (P.mode === "polymer") { const L = rx.lengths(); rows = [["monomers left", rx.M], ["chains", L.length], ["still growing", rx.live().length], ["mean chain length", L.length ? (L.reduce((a, b) => a + b, 0) / L.length).toFixed(0) : "—"]]; }
  else rows = [["CH₄ left", chl.m[0]], ["Cl₂ left", chl.Cl2], ["HCl made", chl.HCl], ["radicals now", chl.Cl + chl.R.reduce((a, b) => a + b, 0)]];
  rows.forEach(([lab, v], i) => { read.set("abcd"[i], v); const l = read.el.children[i].firstElementChild; if (l.textContent !== lab) l.textContent = lab; });
  ctl.mode2.el.style.display = ui.level === "adv" ? "" : "none";
});
set({ mode: "distil" });
ui.tip("Pick a part of the story: distil, crack, burn, polymerise", 7000);
