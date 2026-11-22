/* =====================================================================
   THE COSMIC DISTANCE LADDER
   Nobody can stretch a tape measure to a galaxy. Astronomers measure
   distances with a chain of methods, each one reaching further than the
   last and each CALIBRATED by the one below it, where their ranges overlap:

   1  RADAR        time an echo from Venus:  d = c t ÷ 2.  Kepler's laws give
                   the shape of the Solar System in AU, so one radar distance
                   fixes the size of the astronomical unit (AU) in metres.
   2  PARALLAX     as Earth orbits the Sun (baseline 1 AU) a nearby star seems
                   to shift against far-away ones by an angle p:
                   d (parsecs) = 1 ÷ p (arcseconds).  Good to a few kpc (Gaia).
   3  CEPHEIDS     pulsating stars whose period P tells you their luminosity
                   (Leavitt's law):  M = −2.43 (log₁₀P − 1) − 4.05.
                   Calibrate the law with Cepheids whose parallax we know,
                   then compare M with the apparent magnitude m of a Cepheid
                   in another galaxy:  m − M = 5 log₁₀(d ÷ 10 pc).
   4  SUPERNOVAE   Type Ia supernovae all peak at about M = −19.3 (a billion
                   times brighter than a Cepheid), so they reach 1000s of Mpc.
                   Their M is calibrated in galaxies whose Cepheids we measured.
   5  HUBBLE       the supernova distances against red-shift speeds give
                   Hubble's law v = H₀ d.  Then any red-shift gives a distance.

   Standard candles use the inverse-square law: an object of luminosity L
   at distance d has brightness  b = L ÷ 4πd².  Magnitudes are a log scale
   of brightness: 5 magnitudes = 100 times dimmer.
   ===================================================================== */
const C_KM = 299792.458, AU_KM = 1.495978707e8, PC_AU = 206264.806, PC_LY = 3.2616;
const LEAV = { a: -2.43, b: -4.05 };                     // Leavitt law in V light (Benedict et al. 2007)
const LV = (logP, b = LEAV.b) => LEAV.a * (logP - 1) + b;   // absolute magnitude of a Cepheid of period 10^logP days
const SIG_PL = 0.15;                                      // real Cepheids scatter about the law by about 0.15 mag
const SN_M0 = -19.3, ALPHA = 2.0;                          // Type Ia peak M; brighter ones fade more slowly (stretch s)
const ORB = { venus: { a: 0.7233, T: 224.70, name: "Venus" }, mars: { a: 1.5237, T: 686.98, name: "Mars" }, earth: { a: 1, T: 365.256 } };
const INST = { bessel: { sig: 20, name: "Bessel's telescope (1838)" }, hip: { sig: 1, name: "Hipparcos satellite (1997)" }, gaia: { sig: 0.025, name: "Gaia satellite (2022)" } };   // parallax precision, milliarcseconds
const TEL = { ground: { lim: 22.5, name: "Large ground telescope" }, hst: { lim: 28, name: "Hubble Space Telescope" }, jwst: { lim: 29.5, name: "James Webb Space Telescope" } };   // faintest Cepheid it can measure (mag)
const STARS = [["Proxima Centauri", 1.302], ["61 Cygni", 3.49], ["Vega", 7.68], ["Polaris (a Cepheid)", 133], ["δ Cephei", 272], ["Betelgeuse", 168], ["Galactic centre", 8178]];
const GALS = [["Large Magellanic Cloud", 0.0496, "irr"], ["Andromeda (M31)", 0.77, "sp"], ["M81", 3.6, "sp"], ["M101", 6.7, "sp"], ["M100 (Virgo cluster)", 16.1, "sp"], ["NGC 4639", 22.0, "sp"], ["NGC 1015", 35.0, "sp"]];
// galaxies with both Cepheids and a Type Ia supernova (distances like those found by the SH0ES team), Mpc
const HOSTS = [["M101", 6.7], ["NGC 4536", 15.0], ["NGC 1448", 17.0], ["NGC 3982", 20.0], ["NGC 7250", 20.0], ["NGC 2442", 20.5], ["NGC 4639", 22.0], ["NGC 4038", 22.3], ["NGC 5584", 22.6], ["NGC 3370", 26.0], ["NGC 3021", 26.6], ["NGC 1309", 29.4], ["NGC 5917", 31.0], ["NGC 1015", 35.0], ["UGC 9391", 38.0], ["NGC 0105", 40.0]];

// ---------- small helpers ----------
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹", supN = n => String(n).replace("-", "⁻").replace(/\d/g, d => SUPS[d]);
const sci = (v, n = 3) => { if (v == null || !isFinite(v)) return "–"; if (v === 0) return "0"; const e = Math.floor(Math.log10(Math.abs(v)) + 1e-12); if (e >= -2 && e < 4) return String(+v.toPrecision(n)); return `${(v / 10 ** e).toFixed(n - 1)} × 10${supN(e)}`; };
function fmtDist(pc, n = 3) {                            // a distance in parsecs, in the most readable unit
  if (pc == null || !isFinite(pc)) return "–"; const a = Math.abs(pc);
  if (a < 1e-3) { const au = pc * PC_AU; return au < 0.02 ? sci(au * AU_KM, n) + " km" : K.sig(au, n) + " AU"; }
  if (a < 1e3) return K.sig(pc, n) + " pc"; if (a < 1e6) return K.sig(pc / 1e3, n) + " kpc"; if (a < 1e9) return K.sig(pc / 1e6, n) + " Mpc"; return K.sig(pc / 1e9, n) + " Gpc";
}
const fmtLy = pc => { const ly = pc * PC_LY; return ly < 1e3 ? K.sig(ly, 3) + " light-years" : ly < 1e6 ? K.sig(ly / 1e3, 3) + " thousand light-years" : ly < 1e9 ? K.sig(ly / 1e6, 3) + " million light-years" : K.sig(ly / 1e9, 3) + " billion light-years"; };
const fmtTime = s => s < 1e-3 ? K.sig(s * 1e6, 2) + " μs" : s < 1 ? K.sig(s * 1e3, 2) + " ms" : K.sig(s, 2) + " s";
const pct = v => v == null || !isFinite(v) ? "–" : v < 0.01 ? sci(v, 2) + "%" : K.sig(v, 2) + "%";
const fmtAng = mas => mas >= 1000 ? K.sig(mas / 1000, 3) + "″" : K.sig(mas, 3) + " mas";
const muToMpc = mu => 10 ** ((mu - 25) / 5);              // distance modulus m − M  →  distance in Mpc
const mpcToMu = d => 5 * Math.log10(d) + 25;

// ---------- Rung 1: radar (circular orbits, all planets lined up on day 0) ----------
const pos = (k, day) => { const o = ORB[k], th = 2 * Math.PI * day / o.T; return [o.a * Math.cos(th), o.a * Math.sin(th)]; };
const earthTo = (k, day) => { const e = pos("earth", day), t = pos(k, day); return Math.hypot(t[0] - e[0], t[1] - e[1]); };
// a planet almost behind the Sun (as seen from Earth) is lost in the Sun's radio noise
function behindSun(k, day) { const e = pos("earth", day), t = pos(k, day), ux = t[0] - e[0], uy = t[1] - e[1], L = Math.hypot(ux, uy), cosA = (-e[0] * ux - e[1] * uy) / L; return L > 1 && cosA > Math.cos(6 * Math.PI / 180); }
function radarPulse(k, day, sigT, r) {
  const dAU = earthTo(k, day), tTrue = 2 * dAU * AU_KM / C_KM, tMeas = tTrue + sigT * r.gauss(), dKm = C_KM * tMeas / 2;   // there and back: d = ct/2
  return { k, day, dAU, tTrue, tMeas, dKm, AU: dKm / dAU, e: C_KM * sigT / 2 / (dAU * AU_KM) };   // Kepler gives dAU, so 1 AU = dKm ÷ dAU
}

// ---------- Rung 3: Cepheids in a galaxy at dMpc (b = the zero point we calibrated) ----------
function hostCepheids(dMpc, o, b, r) {
  const lim = TEL[o.tel].lim, mu0 = mpcToMu(dMpc), ceph = [];
  for (let i = 0; i < o.nCeph; i++) {
    const logP = 0.4 + 1.4 * r(), Mt = LV(logP) + SIG_PL * r.gauss(), mt = Mt + mu0 + o.dust;     // true mean apparent magnitude (dust makes it fainter)
    const sph = 0.03 + 0.25 * 10 ** (0.4 * (mt - lim)), m = mt + sph * r.gauss(), ph = r(), amp = 0.3 + 0.35 * r(), spot = r();
    const det = mt < lim, mu = m - LV(logP, b);           // the distance modulus this one Cepheid gives
    ceph.push({ logP, P: 10 ** logP, m, mt, sph, ph, amp, det, mu, spot, w: 1 / (SIG_PL ** 2 + sph ** 2) });
  }
  // Near the telescope's limit only the brighter-than-average Cepheids of a given period are seen, which would make the galaxy
  // look too close (Malmquist bias). So, like real astronomers, use only periods whose Cepheids should all be well above the limit.
  const fit = list => { let a = 0, s = 0; for (const q of list) { a += q.w; s += q.w * q.mu; } return a ? [s / a, 1 / Math.sqrt(a)] : [NaN, NaN]; };
  const found = ceph.filter(q => q.det), first = fit(found)[0], safe = found.filter(q => LV(q.logP, b) + first < lim - 0.5);
  for (const q of found) q.used = safe.length >= 2 ? safe.includes(q) : true;
  const [mu, smu] = fit(found.filter(q => q.used));
  return { dTrue: dMpc, mu0, ceph, nDet: ceph.filter(c => c.det).length, mu, smu, d: muToMpc(mu) };
}
// ---------- Rung 4: one Type Ia supernova ----------
// light curve: F(t) relative to peak, t in days from peak, stretch s (s > 1 fades more slowly and is brighter)
const snFlux = (t, s) => t < 0 ? (t < -22 * s ? 0 : Math.exp(-0.5 * (t / (7 * s)) ** 2)) : 0.8 * Math.exp(-t / (11 * s)) + 0.2 * Math.exp(-t / (50 * s));
const dm15 = s => -2.5 * Math.log10(snFlux(15, s));       // how many magnitudes it fades in 15 days after peak
function drawSN(r) { const s = K.clamp(1 + 0.15 * r.gauss(), 0.6, 1.4); return { s, sm: s + 0.03 * r.gauss(), Mt: SN_M0 - ALPHA * (s - 1) + 0.12 * r.gauss(), ph: 0.03 * r.gauss(), seed: 1 + r.int(1e6), x: r(), y: r() }; }
const snStd = (sn, m, corr) => corr ? m + ALPHA * (sn.sm - 1) : m;     // stretch correction: what it would peak at if s were 1
const snSig = corr => corr ? 0.13 : 0.33;                 // scatter of peak M with and without the correction

// ---------- Climb the whole ladder once: every rung calibrates the next ----------
function fitH(pts) {                                      // weighted least-squares line through the origin, v = H d
  if (pts.length < 2) return { H: NaN, err: NaN };
  // each point's error: its own motion (sv) plus the supernova's scatter, a fixed fraction fr of the distance. Weights use the
  // distance expected from the speed (v ÷ H), not the measured one, or points that scattered too close would count for more.
  let H = 70; const W = q => 1 / (q.sv * q.sv + (q.fr * q.v) ** 2);
  for (let it = 0; it < 3; it++) { let sxy = 0, sxx = 0; for (const q of pts) { const w = W(q); sxy += w * q.dEst * q.v; sxx += w * q.dEst * q.dEst; } H = sxy / sxx; }
  let sxx = 0, chi = 0; for (const q of pts) { const w = W(q); sxx += w * q.dEst * q.dEst; chi += w * (q.v - H * q.dEst) ** 2; }
  return { H, err: Math.sqrt(1 / sxx) * Math.sqrt(Math.max(1, chi / Math.max(1, pts.length - 1))) };
}
function climb(o) {
  const R = k => K.rng(((o.seed >>> 0) * 31 + k * 7919 + 1) >>> 0), L = {};   // each rung has its own random numbers
  // 1 Radar: the size of the AU
  let pulses = o.pulses && o.pulses.length ? o.pulses : null;
  if (!pulses) { const r = R(1); pulses = []; for (let i = 0; i < 5; i++) { let day, n = 0; do day = r() * 584; while (behindSun("venus", day) && n++ < 20); pulses.push(radarPulse("venus", day, 10 ** o.sigT, r)); } }
  L.pulses = pulses; L.AU = K.mean(pulses.map(q => q.AU)); L.eAU = Math.sqrt(pulses.reduce((s, q) => s + q.e * q.e, 0)) / pulses.length; L.fAU = L.AU / AU_KM;
  // 2 Parallax of Milky Way Cepheids calibrates Leavitt's law (we fit its zero point b; the slope is taken as known)
  const r2 = R(2), sp = o.sp != null ? o.sp : INST[o.inst].sig; L.cal = []; let sw = 0, swb = 0;
  for (let i = 0; i < o.nCal; i++) {
    const d = 300 + 2700 * r2(), logP = 0.4 + 1.2 * r2(), Mt = LV(logP) + SIG_PL * r2.gauss(), m = Mt + 5 * Math.log10(d / 10) + 0.02 * r2.gauss();
    const pm = 1000 / d + sp * r2.gauss(), ok = pm > 0;   // measured parallax (mas); a negative one is useless
    const dm = ok ? 1000 / pm * L.fAU : NaN, Md = ok ? m - 5 * Math.log10(dm / 10) : NaN, s = ok ? Math.sqrt(SIG_PL ** 2 + 0.0004 + (2.1715 * sp / pm) ** 2) : Infinity;   // baseline = our radar AU
    L.cal.push({ d, logP, m, pm, dm, Md, s, ok }); if (ok) { sw += 1 / (s * s); swb += (Md - LV(logP, 0)) / (s * s); }
  }
  L.nCalOk = L.cal.filter(q => q.ok).length; L.bFit = sw ? swb / sw : NaN; L.b = L.bFit + (o.zp || 0); L.sb = sw ? 1 / Math.sqrt(sw) : NaN;
  // 3 Cepheids in the galaxy on show, and in the galaxies that also had a supernova
  L.disp = hostCepheids(GALS[o.gal][1], o, L.b, R(3));
  const r4 = R(4), corr = o.stretch, sSN = snSig(corr); L.hosts = []; let swM = 0, swMM = 0;
  for (let i = 0; i < o.nHost; i++) {
    const h = hostCepheids(HOSTS[i][1], o, L.b, r4), sn = drawSN(r4); h.name = HOSTS[i][0]; h.sn = sn;
    h.mSN = sn.Mt + h.mu0 + o.dust + sn.ph; h.MSN = snStd(sn, h.mSN, corr) - h.mu; h.sM = Math.sqrt(sSN ** 2 + h.smu ** 2); h.ok = h.nDet >= 2;
    if (h.ok) { swM += 1 / h.sM ** 2; swMM += h.MSN / h.sM ** 2; } L.hosts.push(h);
  }
  L.nHostOk = L.hosts.filter(h => h.ok).length; L.M = o.perfectCal ? SN_M0 : swM ? swMM / swM : NaN; L.sMr = swM ? 1 / Math.sqrt(swM) : NaN; L.sMtot = Math.sqrt(L.sMr ** 2 + L.sb ** 2);
  // 4 and 5 distant supernovae: distance from the calibrated M, speed from the red-shift, then Hubble's law
  const r5 = R(5); L.flow = [];
  for (let i = 0; i < o.nSN; i++) {
    const d = Math.max(3, o.dmax * Math.cbrt(Math.max(0.001, r5()))), sn = drawSN(r5), v = o.H0 * d + o.vpec * r5.gauss() + 20 * r5.gauss();
    const m = sn.Mt + mpcToMu(d) + sn.ph, mS = snStd(sn, m, corr), dEst = muToMpc(mS - L.M);
    L.flow.push({ d, v, z: v / C_KM, m, mS, dEst, sn, sv: Math.hypot(o.vpec, 20), fr: 0.4605 * sSN });
  }
  const f = fitH(L.flow.filter(q => isFinite(q.dEst))); L.H = f.H; L.sH = f.err;
  L.sHtot = L.H * Math.sqrt((L.sH / L.H) ** 2 + (0.4605 * (o.perfectCal ? 0 : L.sMtot)) ** 2 + L.eAU ** 2);
  return L;
}

// ---------------- The page ----------------
const P0 = () => ({ view: "ladder", seed: 7, tgt: "venus", sigT: -6, inst: "gaia", star: Math.log10(1.302), nCal: 40, gal: 1, tel: "hst", nCeph: 25, zp: 0, dust: 0, nHost: 10, stretch: true, H0: 70, nSN: 40, dmax: 400, vpec: 300, zT: 0.05, pulses: [] });
let P = P0(), L = climb(P), climbs = [], speed = 1, plog = [], cSel = -1, snPick = 0, pulse = null, hover = null;
const T = { day: 40, year: 0, ceph: 0, sn: -18 };
const ui = K.app({
  title: "The Cosmic Distance Ladder", subject: "Astrophysics",
  blurb: "Radar, parallax, Cepheids, supernovae and Hubble's law: each rung calibrates the next",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE physics and astronomy: radar (distance = speed × time ÷ 2), the light-year, parallax (nearer stars shift more), standard candles and the inverse-square law, red-shift and the expanding universe.", adv: "A level physics (AQA astrophysics option, OCR, WJEC Eduqas, Edexcel): the parsec and d = 1/p, absolute magnitude and m − M = 5 log₁₀(d/10 pc), Cepheids and Type Ia supernovae as standard candles, Hubble's law v = H₀d and z ≈ v/c, age ≈ 1/H₀; random and systematic uncertainties." } },
  missions: [
    { title: "Why a ladder?", q: "Look at the ladder. Which method reaches furthest? Why can it not be used for nearby objects, and what does each rung need from the rung below?", hint: "Hubble's law reaches the edge of the universe but needs H₀, which comes from supernova distances. Supernovae need their brightness calibrated by Cepheids in the same galaxies; Cepheids need parallax; parallax needs the size of Earth's orbit, from radar. Each method works where the one below overlaps it.", setup() { set({ view: "ladder" }); } },
    { title: "Radar echo from Venus", q: "Send a radar pulse to Venus when it is closest. How long does the echo take? Use d = ct ÷ 2 to find the distance, then the size of the AU.", hint: "About 276 s there and back, so d = 3.00 × 10⁸ × 276 ÷ 2 ≈ 4.1 × 10¹⁰ m (41 million km). Kepler's laws say Venus is then 0.277 AU away, so 1 AU = 4.1 × 10¹⁰ ÷ 0.277 ≈ 1.50 × 10¹¹ m.", setup() { set({ view: "radar" }); T.day = 0; } },
    { title: "The gradient is the AU", q: "Send pulses at several different dates (let the planets move between them). Plot radar distance against Kepler distance. What is the gradient?", hint: "A straight line through the origin: the gradient is the length of 1 AU in km (about 150 million). Kepler's laws give every distance in the Solar System in AU; radar turns AU into metres.", setup() { set({ view: "radar" }); } },
    { title: "Measure Proxima Centauri", q: "Watch the nearest star shift as Earth orbits the Sun. What is its parallax angle, and how far away is it in parsecs and light-years?", hint: "p = 0.768″ (half the total back-and-forth shift). d = 1/p = 1.30 pc = 4.2 light-years. That angle is about the width of a coin seen from 6 km away.", setup() { set({ view: "parallax", star: Math.log10(1.302), inst: "hip" }); } },
    { title: "How far can parallax reach?", q: "With Hipparcos, increase the distance until the error is 10%. Then switch to Gaia. How much further can Gaia reach?", hint: "With an uncertainty of 1 mas, a 10% measurement needs p = 10 mas: d = 100 pc. Gaia (0.025 mas) reaches 10% at 4000 pc, forty times further. Beyond that the shift is lost in the measurement error, so we need another method.", setup() { set({ view: "parallax", star: 2, inst: "hip" }); } },
    { title: "Leavitt's law", q: "In Andromeda, compare short- and long-period Cepheids. Which are brighter? How does Leavitt's law plus the apparent magnitude give the distance?", hint: "Longer period = more luminous. The period gives M (from the law calibrated by parallax). The difference m − M (about 24.4) gives d = 10^((m − M + 5)/5) pc ≈ 0.77 Mpc. In 1925 this proved Andromeda is a separate galaxy.", setup() { set({ view: "cepheid", gal: 1, tel: "ground" }); } },
    { title: "Too faint to see", q: "Look for Cepheids in NGC 1015 (35 Mpc) with a ground telescope, then Hubble, then JWST. Why does the Cepheid rung stop?", hint: "At 35 Mpc even the brightest Cepheids are around magnitude 27: invisible from the ground, only the longest-period ones are seen by Hubble, more by JWST. Beyond about 40 Mpc we need something brighter: supernovae.", setup() { set({ view: "cepheid", gal: 6, tel: "ground" }); } },
    { lvl: "adv", title: "Baade's mistake (1952)", q: "Give the Cepheid calibration a zero-point error of +1.5 mag (Cepheids assumed fainter than they are). What happens to the distance of Andromeda, and to H₀?", hint: "Every distance comes out half as big (10^(−1.5/5) = 0.50) and H₀ twice as big. Before Baade found that there are two kinds of Cepheid, the universe seemed half its size and younger than the Earth. A systematic error climbs the whole ladder.", setup() { set({ view: "cepheid", gal: 1, zp: 1.5 }); } },
    { title: "Five billion Suns", q: "Watch a Type Ia supernova rise and fade. At its peak M = −19.3. How much more luminous is it than a Cepheid (M ≈ −4)?", hint: "15 magnitudes brighter = 10^(15/2.5) = a million times a Cepheid, about 5 billion times the Sun. That is why supernovae can be seen in galaxies hundreds of Mpc away.", setup() { set({ view: "sn" }); T.sn = -20; } },
    { lvl: "adv", title: "Slow fade, bright supernova", q: "Switch off the stretch correction. How much does the calibrated peak M scatter between galaxies, and how does H₀'s uncertainty change?", hint: "Without it the peaks scatter by about 0.33 mag (15% in distance); using the fact that slow faders are brighter (the Phillips relation) cuts it to about 0.13 mag (6%). The H₀ uncertainty roughly halves.", setup() { set({ view: "sn", stretch: false }); } },
    { title: "Measure H₀", q: "Plot supernova distance against speed (from the red-shift). Is it a straight line? What is the Hubble constant, and the age of the universe 1/H₀?", hint: "v = H₀d, about 70 km/s per Mpc in this model; 1/H₀ ≈ 14 billion years. Now any galaxy's distance follows from its red-shift alone: the top rung of the ladder.", setup() { set({ view: "hubble" }); } },
    { title: "Why use far-away supernovae?", q: "Use supernovae only out to 20 Mpc. Look at H₀ from each supernova on its own (the right-hand chart). Why are nearby ones so scattered?", hint: "Galaxies also move through space at a few hundred km/s. Nearby that is as big as the expansion speed, so v/d scatters wildly. Far away the expansion speed is thousands of km/s and the extra motion hardly matters.", setup() { set({ view: "hubble", dmax: 20 }); } },
    { lvl: "adv", title: "Errors climb the ladder", q: "Use Bessel's or Hipparcos's parallaxes to calibrate the Cepheids. Press 'Climb again' a few times. How good is H₀ now? Which rung limits the answer with Gaia?", hint: "With poor parallaxes the Cepheid zero point is uncertain by tenths of a magnitude, so H₀ is uncertain by 5–20% however many supernovae you use. With Gaia the limit is the number of galaxies with both Cepheids and a supernova.", setup() { set({ view: "ladder", inst: "hip" }); } },
    { lvl: "adv", title: "The Hubble tension", q: "The early universe (Planck satellite) predicts H₀ = 67.4; the distance ladder gives 73. What zero-point error in the Cepheids would explain the difference?", hint: "73/67.4 = 1.083, so 5 log₁₀(1.083) = 0.17 mag. A hidden 0.17 mag error in the Cepheid or supernova calibration (or new physics) is needed. JWST has checked the Cepheids and the tension has not gone away.", setup() { set({ view: "ladder", H0: 73, zp: -0.17 }); } }
  ],
  batch: [
    { title: "Radar: does averaging pulses help?", question: "With a 1 ms timing error, how does the error in the AU change with the number of pulses averaged?", how: "Pulses to Venus at closest approach (0.277 AU); |AU measured − AU true| in km.", xLabel: "number of pulses", yLabel: "error in the AU (km)", xs: [1, 4, 16, 64], reps: 20, yMin: 0, theory: n => 0.798 * (C_KM * 1e-3 / 2) / (1 - ORB.venus.a) / Math.sqrt(n), theoryLabel: "∝ 1 ÷ √N", run: (n, r) => { let s = 0; for (let i = 0; i < n; i++) s += radarPulse("venus", 0, 1e-3, r).AU; return Math.abs(s / n - AU_KM); }, note: "Random timing errors average out: 16 pulses give a quarter of the error of one. A 1 ms error is 150 km in distance; real radar timing is much better, so the AU is now known to a few metres." },
    { title: "Parallax: the error grows with distance", question: "With Gaia (0.025 mas), how does the percentage error of a parallax distance change as the star gets further away?", how: "One measurement per run; |d measured − d| ÷ d.", xLabel: "distance of the star (pc)", yLabel: "error in distance (%)", xs: [500, 1000, 2000, 4000, 8000], reps: 40, yMin: 0, theory: d => 79.8 * 0.025 * d / 1000, theoryLabel: "∝ d (0.8σ ÷ p)", fit: true, run: (d, r) => { const pm = 1000 / d + 0.025 * r.gauss(); return pm > 0 ? 100 * Math.abs(1000 / pm - d) / d : null; }, note: "The parallax angle p = 1/d gets smaller while the measurement error stays the same, so the percentage error grows in proportion to distance. That is why parallax only reaches a few thousand parsecs, and why we need standard candles." },
    { title: "Calibrating Cepheids: how many do we need?", question: "How accurately do Milky Way Cepheids with Gaia parallaxes fix the zero point of Leavitt's law?", how: "|zero point fitted − true (−4.05)| in magnitudes, Gaia parallaxes.", xLabel: "number of Milky Way Cepheids", yLabel: "error in zero point (mag)", xs: [5, 10, 20, 40, 80], reps: 20, yMin: 0, theory: n => 0.798 * 0.17 / Math.sqrt(n), theoryLabel: "∝ 1 ÷ √N", run: (n, r) => Math.abs(climb(Object.assign(P0(), { nCal: n, seed: r.int(1e9) })).bFit - LEAV.b), note: "Each Cepheid scatters about the law by about 0.15 mag, so the zero point improves as 1/√N. 0.02 mag is a 1% error in every distance above this rung." },
    { title: "A systematic error climbs the ladder", question: "If the Cepheid calibration is wrong by a few tenths of a magnitude, what happens to H₀?", how: "Complete ladders with the zero-point error shown; everything else as normal.", xLabel: "Cepheid zero-point error (mag)", yLabel: "H₀ (km/s per Mpc)", xs: [-0.3, -0.15, 0, 0.15, 0.3], reps: 8, theory: x => 70 * 10 ** (x / 5), theoryLabel: "70 × 10^(error/5)", run: (x, r) => climb(Object.assign(P0(), { zp: x, seed: r.int(1e9) })).H, note: "Every Cepheid distance, every supernova calibration and every supernova distance shifts by the same factor: 0.15 mag is 7% in H₀. No amount of extra data at higher rungs can fix it." },
    { title: "Does the stretch correction help?", question: "How much more accurate is H₀ when we correct each supernova for how fast it fades?", how: "0 = peak brightness used as it is; 1 = corrected for stretch. |H₀ − 70|.", xLabel: "stretch correction (0 off, 1 on)", yLabel: "error in H₀ (km/s per Mpc)", xs: [0, 1], reps: 30, yMin: 0, run: (x, r) => Math.abs(climb(Object.assign(P0(), { stretch: x === 1, seed: r.int(1e9) })).H - 70), note: "Without the correction peak brightnesses scatter by about 0.33 mag; with it about 0.13. Only ten galaxies calibrate the supernovae, so that scatter matters a lot." },
    { title: "Why far-away supernovae?", question: "With a perfect calibration, how does the error in H₀ depend on how far away the supernovae are?", how: "20 supernovae out to the distance shown; peculiar velocities 300 km/s; supernova M known exactly.", xLabel: "furthest supernova (Mpc)", yLabel: "error in H₀ (km/s per Mpc)", xs: [20, 50, 100, 200, 400, 800], reps: 20, yMin: 0, run: (x, r) => Math.abs(climb(Object.assign(P0(), { dmax: x, nSN: 20, perfectCal: true, seed: r.int(1e9) })).H - 70), note: "Nearby, a galaxy's own motion (a few hundred km/s) is as big as its expansion speed. Far away it is a small fraction, so the fit is better, until the supernovae's own scatter (6% each) sets the limit." },
    { title: "How much does Gaia help?", question: "How does the precision of the parallaxes at the bottom of the ladder affect H₀ at the top?", how: "Complete ladders with Milky Way Cepheids measured to the parallax precision shown (mas). |H₀ − 70|.", xLabel: "parallax uncertainty (mas)", yLabel: "error in H₀ (km/s per Mpc)", xs: [0.025, 0.1, 0.25, 0.5, 1], reps: 12, yMin: 0, run: (x, r) => Math.abs(climb(Object.assign(P0(), { sp: x, seed: r.int(1e9) })).H - 70), note: "Milky Way Cepheids are 300–3000 pc away (parallaxes 0.3–3 mas). Errors of 0.5–1 mas make their distances, and so everything above, very uncertain. Gaia (0.025 mas) makes this rung one of the most accurate." },
    { title: "H₀ from 300 complete ladders", question: "If 300 teams each climbed the whole ladder, what values of H₀ would they get?", how: "Default settings: Gaia, 40 Milky Way Cepheids, 10 calibration galaxies, 40 supernovae to 400 Mpc.", yLabel: "H₀ (km/s per Mpc)", reps: 300, bins: 24, theory: 70, theoryLabel: "true", run: (x, r) => climb(Object.assign(P0(), { seed: r.int(1e9) })).H, note: "A bell-shaped spread around 70 with SD about 2 (3%). Most of the spread comes from the few galaxies that calibrate the supernovae." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Space is far too big to measure directly, so astronomers use a chain of methods, each calibrated by the one before where their ranges overlap: the cosmic distance ladder." },
      { lvl: "std", tag: "GCSE", text: "Radar: distance = speed × time ÷ 2 (the signal goes there and back). Radio waves travel at the speed of light, 3.0 × 10⁸ m/s." },
      { lvl: "std", tag: "GCSE", text: "A light-year is the distance light travels in a year: 9.46 × 10¹⁵ m. The Sun is 8.3 light-minutes away; the nearest star 4.2 light-years." },
      { lvl: "std", tag: "GCSE", text: "Parallax: as the Earth orbits the Sun, a nearby star seems to move against much more distant stars. The further away the star, the smaller the shift." },
      { lvl: "std", tag: "GCSE", text: "Standard candles are objects whose luminosity is known (Cepheid variables from their period, Type Ia supernovae). Brightness falls as 1/d², so a candle 4 times dimmer is 2 times further away." },
      { lvl: "std", tag: "GCSE", text: "Red-shift: the further a galaxy, the faster it moves away (Hubble's law), evidence that the universe is expanding." },
      { lvl: "adv", tag: "A level", text: "1 parsec is the distance at which 1 AU subtends 1 arcsecond: d (pc) = 1 / p (″). 1 pc = 3.09 × 10¹⁶ m = 3.26 light-years; 1 AU = 1.50 × 10¹¹ m." },
      { lvl: "adv", tag: "A level", text: "Absolute magnitude M is the apparent magnitude m an object would have at 10 pc: m − M = 5 log₁₀(d / 10 pc). 5 magnitudes = a factor of 100 in brightness; intensity I = L / 4πd²." },
      { lvl: "adv", tag: "A level", text: "Cepheids obey a period–luminosity law (here M = −2.43(log₁₀P − 1) − 4.05); Type Ia supernovae peak at M ≈ −19.3, after correcting for how fast they fade." },
      { lvl: "adv", tag: "A level", text: "Hubble's law v = H₀d with z = Δλ/λ ≈ v/c; H₀ ≈ 70 km s⁻¹ Mpc⁻¹; the age of the universe ≈ 1/H₀ ≈ 14 billion years." },
      { lvl: "adv", tag: "A level", text: "Random errors shrink as 1/√N with more data; a systematic error in a lower rung (a calibration) is carried up to every rung above it." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A radar pulse sent to Venus returns after 276 s. Calculate the distance to Venus. (Speed of light = 3.0 × 10⁸ m/s.)", ans: "<ul><li>distance there and back = 3.0 × 10⁸ × 276 = 8.28 × 10¹⁰ m</li><li>distance to Venus = half of this = 4.1 × 10¹⁰ m</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why parallax cannot be used to measure the distance to another galaxy.", ans: "<ul><li>the further the star, the smaller the parallax shift</li><li>for a galaxy the shift is far smaller than the measurement uncertainty, so it cannot be detected</li></ul>" },
      { lvl: "std", marks: 2, q: "Two Cepheids have the same period. One appears 9 times dimmer than the other. How many times further away is it? Explain.", ans: "<ul><li>same period, so the same luminosity (they are standard candles)</li><li>brightness ∝ 1/d², so 9 times dimmer means √9 = 3 times further away</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why the methods are called a 'ladder'.", ans: "<ul><li>each method only works over a limited range of distances</li><li>the methods overlap, so a nearer method is used to calibrate the next (e.g. parallax gives the luminosity of Cepheids)</li><li>errors in a lower rung are carried up to all the rungs above</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const pc = 10 ** P.star; return `A star has a parallax of ${fmtAng(1000 / pc)}. Find its distance in parsecs, light-years and metres.`; }, ans: () => { const pc = 10 ** P.star; return `<ul><li>d = 1/p = 1 ÷ ${K.sig(1 / pc, 3)}″ = ${K.sig(pc, 3)} pc</li><li>× 3.26 = ${K.sig(pc * PC_LY, 3)} light-years</li><li>× 3.09 × 10¹⁶ = ${sci(pc * 3.086e16, 3)} m</li></ul>`; } },
      { lvl: "adv", marks: 4, q: "A Cepheid in a distant galaxy has a period of 30 days and a mean apparent magnitude of 25.0. Use M = −2.43(log₁₀P − 1) − 4.05 to find the distance to the galaxy in Mpc.", ans: "<ul><li>log₁₀30 = 1.477, so M = −2.43 × 0.477 − 4.05 = −5.21</li><li>m − M = 25.0 + 5.21 = 30.21</li><li>d = 10^((30.21 + 5)/5) pc = 10^7.04 pc</li><li>= 1.1 × 10⁷ pc = 11 Mpc</li></ul>" },
      { lvl: "adv", marks: 4, q: "A Type Ia supernova (M = −19.3) reaches a peak apparent magnitude of 19.0. Find its distance, and the red-shift z expected if H₀ = 70 km s⁻¹ Mpc⁻¹.", ans: "<ul><li>m − M = 38.3, so d = 10^((38.3 + 5)/5) pc = 10^8.66 pc = 457 Mpc</li><li>v = H₀d = 70 × 457 = 3.2 × 10⁴ km/s</li><li>z = v/c = 3.2 × 10⁴ ÷ 3.0 × 10⁵ = 0.11</li></ul>" },
      { lvl: "adv", marks: 3, q: "The Cepheid calibration is later found to be 0.2 mag too faint. Explain the effect on H₀, and why observing more supernovae will not fix it.", ans: "<ul><li>Cepheids are really brighter, so every distance was underestimated by a factor 10^(−0.2/5) = 0.91</li><li>H₀ = v/d was about 10% too large</li><li>it is a systematic error, the same for every object, so it does not average out</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Radar:</b> circular orbits for Venus, Earth and Mars, all lined up on day 0. Kepler's third law gives each distance in AU; a radar pulse gives it in km (d = ct/2) with a random timing error; 1 AU = d(km) ÷ d(AU), averaged over the pulses. A planet within 6° of the Sun (behind it) cannot be measured.</li>
<li><b>Parallax:</b> measured parallax = true (1000/d mas) + a random error of the instrument's size (Bessel 20 mas, Hipparcos 1 mas, Gaia 0.025 mas); d = 1/p, using our radar AU as the baseline.</li>
<li><b>Cepheids:</b> Leavitt's law M = −2.43(log₁₀P − 1) − 4.05 with 0.15 mag real scatter. 40 Milky Way Cepheids 300–3000 pc away, with parallaxes, fix the zero point (the slope is taken as known). In a galaxy, a Cepheid is found only if its mean magnitude is brighter than the telescope's limit; the measuring error grows near the limit. Near the limit only the brighter-than-average Cepheids of each period are found (Malmquist bias), so only periods whose Cepheids should all be at least 0.5 mag brighter than the limit are used. The distance modulus is the weighted mean of m − M.</li>
<li><b>Supernovae:</b> peak M = −19.3 − 2(s − 1) + 0.12 mag scatter, where the stretch s (spread 0.15) says how slowly it fades. The stretch correction uses the measured s. Calibrated in up to 16 galaxies that also have Cepheids (distances like the SH0ES team's), then used for up to 200 supernovae spread evenly through space.</li>
<li><b>Hubble's law:</b> v = H₀d + the galaxy's own (peculiar) motion + 20 km/s measuring error; speed from the red-shift v = cz. Weighted straight-line fit through the origin; the quoted uncertainty adds the calibration errors of the lower rungs. Age ≈ 977.8 ÷ H₀ billion years.</li></ul>
<h3>Simplifications</h3>
<ul><li>Circular, flat planetary orbits; no light-travel or atmospheric effects on radar.</li>
<li>One parallax measurement per star; no Lutz–Kelker or Malmquist bias corrections (though they appear by themselves at large errors).</li>
<li>Dust (A level) dims Cepheids and supernovae in the same galaxy equally; real dust is corrected using colours.</li>
<li>Low red-shift only (v = cz); no cosmic acceleration, K-corrections or metallicity effects. Real Cepheid work uses infrared light; the Milky Way calibration also uses other anchors (the LMC's eclipsing binaries, the maser galaxy NGC 4258).</li>
<li>Galaxies are drawn the same size on screen whatever their distance (as if zoomed in).</li></ul>
<h3>Other rungs</h3>
<p>Real astronomers also use main-sequence fitting of star clusters, eclipsing binaries, the tip of the red giant branch, masers, the Tully–Fisher relation and gravitational-wave "standard sirens". The Hubble tension (67.4 from Planck v 73 from the ladder) is one of the big open questions in cosmology.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
const VIEWS = [["ladder", "🪜 The ladder"], ["radar", "📡 Radar"], ["parallax", "🌍 Parallax"], ["cepheid", "✨ Cepheids"], ["sn", "💥 Supernovae"], ["hubble", "🌈 Hubble's law"]];
let g = ui.group("Rung of the ladder");
ctl.view = K.seg(g, { value: "ladder", options: VIEWS, on: v => setView(v) });
let rr = K.row(g); K.btn(rr, "🎲 Climb again (new measurements)", () => { P.seed = 1 + Math.floor(Math.random() * 1e8); recompute(true); }, "primary");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
ui.headerSpeed(ctl.speed);
// The ladder overview
grp.ladder = g = ui.group("The whole ladder");
K.note(g, "Click a rung (or a box at the bottom) to open it. Every rung's settings feed the rungs above it.");
const rdL = K.readout(g, [["H", "H₀ at the top"], ["age", "age of the universe 1/H₀"], ["err", "total uncertainty in H₀"], ["big", "biggest source of error"]]);
// Radar
grp.radar = g = ui.group("Radar");
ctl.tgt = K.seg(g, { label: "Target", value: "venus", options: [["venus", "Venus"], ["mars", "Mars"]], on: v => P.tgt = v });
ctl.sigT = K.slider(g, { label: "Timing error per pulse", min: -6, max: 1, step: 0.25, value: -6, fmt: v => fmtTime(10 ** v), tip: "Radar in 1961 timed echoes to a few μs. Try a big error to see it climb the ladder.", on: v => { P.sigT = v; P.pulses = []; recompute(); } });
rr = K.row(g); K.btn(rr, "📡 Send a pulse", () => sendPulse(), "primary"); K.btn(rr, "Clear", () => { P.pulses = []; recompute(); });
const rdR = K.readout(g, [["t", "latest echo time"], ["d", "latest distance = ct ÷ 2"], ["au", "1 AU from the pulses"], ["n", "pulses used"]]);
// Parallax
grp.parallax = g = ui.group("Parallax");
ctl.star = K.slider(g, { label: "Distance of the star", min: 0.1, max: 4.3, step: 0.01, value: P.star, fmt: v => fmtDist(10 ** v) + " (" + fmtLy(10 ** v) + ")", on: v => { P.star = v; plog = []; } });
ctl.preset = K.seg(g, { value: null, options: STARS.map(([n, d]) => [d, n.replace(" (a Cepheid)", "")]), on: v => { ctl.star.set(Math.log10(v), true); } });
ctl.inst = K.seg(g, { label: "Instrument", value: "gaia", options: Object.entries(INST).map(([k, o]) => [k, o.name.replace(/ (telescope|satellite)/, "")]), on: v => { P.inst = v; plog = []; recompute(); } });
K.note(g, "The instrument also measures the Milky Way Cepheids that calibrate the next rung.");
rr = K.row(g); K.btn(rr, "📏 Measure now", () => measureParallax(), "primary"); K.btn(rr, "Clear", () => plog = []);
const rdP = K.readout(g, [["p", "parallax angle p (true)"], ["d", "distance d = 1/p"], ["e", "uncertainty"], ["n", "measurements (one a year)"]]);
// Cepheids
grp.cepheid = g = ui.group("Cepheid variables");
ctl.gal = K.seg(g, { label: "Galaxy", value: 1, options: GALS.map(([n], i) => [i, n.replace(/ \(.*\)/, "")]), on: v => { P.gal = v; cSel = -1; recompute(); } });
ctl.tel = K.seg(g, { label: "Telescope", value: "hst", options: Object.entries(TEL).map(([k, o]) => [k, o.name.replace(" Space Telescope", "").replace("Large ground telescope", "Ground")]), on: v => { P.tel = v; cSel = -1; recompute(); } });
ctl.nCeph = K.slider(g, { label: "Cepheids looked for in each galaxy", min: 5, max: 60, step: 1, value: 25, on: v => { P.nCeph = v; cSel = -1; recompute(); } });
ctl.nCal = K.slider(g, { label: "Milky Way Cepheids with parallaxes", min: 3, max: 120, step: 1, value: 40, tip: "These calibrate Leavitt's law (middle chart).", on: v => { P.nCal = v; recompute(); } });
ctl.zp = K.slider(g, { label: "Zero-point error in the calibration", min: -2, max: 2, step: 0.01, value: 0, fmt: v => (v > 0 ? "+" : "") + v.toFixed(2) + " mag", tip: "+ means Cepheids are assumed fainter than they really are (like before 1952).", on: v => { P.zp = v; recompute(); } });
ctl.dust = K.slider(g, { label: "Dust dimming in the galaxies", min: 0, max: 1, step: 0.05, value: 0, unit: "mag", tip: "Not corrected: does it affect the galaxy's distance? H₀?", on: v => { P.dust = v; recompute(); } });
const rdC = K.readout(g, [["n", "Cepheids found"], ["mu", "distance modulus m − M"], ["d", "distance"], ["true", "accepted distance"]]);
// Supernovae
grp.sn = g = ui.group("Type Ia supernovae");
rr = K.row(g); K.btn(rr, "💥 Next supernova", () => { snPick = (snPick + 1) % Math.max(1, L.flow.length); T.sn = -20; }, "primary");
ctl.nHost = K.slider(g, { label: "Galaxies with Cepheids and a supernova", min: 2, max: 16, step: 1, value: 10, tip: "These calibrate the supernovae (right-hand chart).", on: v => { P.nHost = v; recompute(); } });
ctl.stretch = K.toggle(g, { label: "Correct for stretch (slow faders are brighter)", value: true, on: v => { P.stretch = v; recompute(); } });
const rdS = K.readout(g, [["m", "peak apparent magnitude"], ["M", "calibrated peak M"], ["d", "distance"], ["true", "accepted distance"]]);
// Hubble's law
grp.hubble = g = ui.group("Hubble's law");
ctl.H0 = K.slider(g, { label: "True H₀ in this universe", min: 50, max: 90, step: 0.5, value: 70, unit: "km/s per Mpc", on: v => { P.H0 = v; recompute(); } });
ctl.nSN = K.slider(g, { label: "Distant supernovae", min: 5, max: 200, step: 5, value: 40, on: v => { P.nSN = v; snPick = 0; recompute(); } });
ctl.dmax = K.slider(g, { label: "Furthest supernova", min: 10, max: 800, step: 10, value: 400, unit: "Mpc", on: v => { P.dmax = v; recompute(); } });
ctl.vpec = K.slider(g, { label: "Galaxies' own motions", min: 0, max: 1000, step: 10, value: 300, unit: "km/s", on: v => { P.vpec = v; recompute(); } });
ctl.zT = K.slider(g, { label: "Red-shift z of a far galaxy", min: 0.005, max: 0.2, step: 0.005, value: 0.05, fmt: v => v.toFixed(3), tip: "Use Hubble's law as a ruler: d = cz ÷ H₀.", on: v => P.zT = v });
const rdH = K.readout(g, [["H", "H₀ fitted"], ["age", "age 1/H₀"], ["zT", "far galaxy: d = cz ÷ H₀"], ["n", "supernovae used"]]);
const advOnly = [ctl.zp, ctl.dust, ctl.stretch];

function recompute(newClimb) { L = climb(P); if (newClimb && isFinite(L.H)) climbs.push(L.H); if (climbs.length > 60) climbs.shift(); if (snPick >= L.flow.length) snPick = 0; }
function setView(v) {
  P.view = v; ctl.view.set(v); for (const k in grp) grp[k].style.display = k === v ? "" : "none";
  chC.el.style.display = v === "cepheid" ? "" : "none"; ui.mission(null);
}
function applyLevel() { const adv = ui.level === "adv"; for (const c of advOnly) c.el.style.display = adv ? "" : "none"; if (!adv && (P.zp || P.dust || !P.stretch)) { P.zp = 0; P.dust = 0; P.stretch = true; ctl.zp.set(0); ctl.dust.set(0); ctl.stretch.set(true); recompute(); } }
ui.onLevel = applyLevel;
function set(o) {
  const keep = P.view; P = Object.assign(P0(), o); if (!o.view) P.view = keep;
  for (const k of ["sigT", "star", "nCeph", "nCal", "zp", "dust", "nHost", "H0", "nSN", "dmax", "vpec", "zT"]) ctl[k].set(P[k]);
  ctl.tgt.set(P.tgt); ctl.inst.set(P.inst); ctl.gal.set(P.gal); ctl.tel.set(P.tel); ctl.stretch.set(P.stretch);
  plog = []; cSel = -1; snPick = 0; pulse = null; climbs = []; recompute(true); setView(P.view);
}

// ---------------- Actions ----------------
function sendPulse() {
  if (pulse) return;
  if (behindSun(P.tgt, T.day)) { ui.tip(`${ORB[P.tgt].name} is behind the Sun: its echo is lost in the Sun's radio noise. Wait for it to move.`, 4000); return; }
  pulse = { k: P.tgt, day: T.day, q: 0, res: radarPulse(P.tgt, T.day, 10 ** P.sigT, K.rng(Date.now() % 1e9)) };
}
function measureParallax() { const pt = 1000 / 10 ** P.star, s = INST[P.inst].sig, pm = pt + s * K.rng(Date.now() % 1e9 + plog.length * 17).gauss(); plog.push({ pm, d: pm > 0 ? 1000 / pm : NaN }); if (plog.length > 40) plog.shift(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {}), chC = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.textBaseline = "alphabetic"; c.fillText(s, x, y); };
function wrap(c, s, x, y, maxW, lh = 17, col = "#c9d3e6", f = "12.5px") { c.font = f + " Segoe UI,system-ui,sans-serif"; const words = s.split(" "); let line = ""; for (const wd of words) { const t = line ? line + " " + wd : wd; if (c.measureText(t).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = wd; } else line = t; } if (line) { TX(c, line, x, y, col, "left", f); y += lh; } return y; }
const steps = (c, x, y, w, items) => { for (const [s, col] of items) { y = wrap(c, s, x, y, w, 17, col || "#c9d3e6") + 6; } return y; };
const RUNGS = [
  { id: "radar", name: "📡 Radar echoes", eq: "d = ct ÷ 2", lo: -8.1, hi: -4.4, col: "#5ad1ff" },
  { id: "parallax", name: "🌍 Parallax", eq: "d = 1/p", lo: 0, hi: 4.2, col: "#7ee787" },
  { id: "cepheid", name: "✨ Cepheid variables", eq: "period → luminosity", lo: 2.1, hi: 7.6, col: "#ffe66d" },
  { id: "sn", name: "💥 Type Ia supernovae", eq: "peak M ≈ −19.3", lo: 6.8, hi: 9.9, col: "#ffb454" },
  { id: "hubble", name: "🌈 Hubble's law", eq: "d = v ÷ H₀", lo: 7.5, hi: 10.15, col: "#ff7b9c" }];
const OBJ = [["Moon", -7.9], ["Venus", -5.87], ["Sun", -5.31], ["Neptune", -3.84], ["Proxima Cen", 0.11], ["Polaris", 2.12], ["Galactic centre", 3.91], ["LMC", 4.70], ["Andromeda", 5.89], ["Virgo cluster", 7.22], ["Coma cluster", 8.0], ["z = 1 supernovae", 9.53], ["edge of the universe", 10.15]];
let hits = [];                                            // clickable areas in the ladder view
function drawLadder(c, w, h) {
  const X0 = -8.7, X1 = 10.7, Lm = 20, Rm = w - 20, X = lg => Lm + (lg - X0) / (X1 - X0) * (Rm - Lm);
  const top = 44, axisY = Math.round(h * 0.6), rowH = (axisY - top - 10) / 5; hits = [];
  TX(c, "The cosmic distance ladder: each method calibrates the one above it where they overlap", 16, 24, "#eef2f8", "left", "600 14px");
  // rungs, bottom (radar) to top (Hubble)
  const rowY = i => axisY - 10 - (i + 1) * rowH;
  for (let i = 0; i < RUNGS.length - 1; i++) {              // overlaps where one rung calibrates the next
    const a = RUNGS[i], b = RUNGS[i + 1], lo = Math.max(a.lo, b.lo), hi = Math.min(a.hi, b.hi);
    if (hi > lo) { c.fillStyle = "rgba(255,255,255,0.07)"; c.fillRect(X(lo), rowY(i + 1) + rowH * 0.15, X(hi) - X(lo), rowH * 1.7); TX(c, "calibrate", (X(lo) + X(hi)) / 2, rowY(i) + rowH * 0.12, "#8fa0bf", "center", "10.5px"); }
  }
  RUNGS.forEach((r, i) => {
    const y = rowY(i) + rowH * 0.2, bh = rowH * 0.6, x0 = X(r.lo), x1 = X(r.hi), on = hover === r.id;
    c.globalAlpha = on ? 0.55 : 0.32; c.fillStyle = r.col; c.beginPath(); c.roundRect(x0, y, x1 - x0, bh, 8); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = r.col; c.lineWidth = on ? 2.5 : 1.2; c.stroke();
    const lab = `${r.name}   ${r.eq}`; c.font = "600 12.5px Segoe UI,system-ui,sans-serif"; const tw = c.measureText(lab).width;
    if (tw < x1 - x0 - 12) TX(c, lab, x0 + 8, y + bh / 2 + 4, "#eef2f8", "left", "600 12.5px"); else if (x1 + tw + 10 < w) TX(c, lab, x1 + 8, y + bh / 2 + 4, r.col, "left", "600 12.5px"); else TX(c, lab, x0 - 8, y + bh / 2 + 4, r.col, "right", "600 12.5px");
    hits.push({ id: r.id, x0: Math.min(x0, x1 + tw + 10 < w ? x0 : x0 - tw - 10), x1: x1 + (tw < x1 - x0 - 12 ? 0 : tw + 10), y0: y, y1: y + bh });
  });
  // radar gives parallax its baseline: a dashed arrow
  const ra = RUNGS[0], pa = RUNGS[1], ay0 = rowY(0) + rowH * 0.5, ay1 = rowY(1) + rowH * 0.5;
  c.strokeStyle = "#8fa0bf"; c.setLineDash([5, 4]); c.lineWidth = 1.3; c.beginPath(); c.moveTo(X(ra.hi), ay0); c.bezierCurveTo(X(ra.hi) + 80, ay0, X(pa.lo) - 80, ay1, X(pa.lo) - 4, ay1); c.stroke(); c.setLineDash([]);
  TX(c, "the AU is parallax's baseline", (X(ra.hi) + X(pa.lo)) / 2, (ay0 + ay1) / 2 - 6, "#8fa0bf", "center", "10.5px");
  // the distance axis
  c.strokeStyle = "#5d6b85"; c.lineWidth = 1; c.beginPath(); c.moveTo(Lm, axisY); c.lineTo(Rm, axisY); c.stroke();
  for (const [lg, s] of [[-5.31, "1 AU"], [0, "1 pc"], [3, "1 kpc"], [6, "1 Mpc"], [9, "1 Gpc"]]) { c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(X(lg), axisY - 5); c.lineTo(X(lg), axisY + 5); c.stroke(); TX(c, s, X(lg), axisY + 17, "#c9d3e6", "center", "600 11px"); }
  for (const [lg, s] of [[-8.01, "light-second"], [-0.51, "light-year"], [5.49, "million ly"], [8.49, "billion ly"]]) { c.fillStyle = "#4f5c78"; c.fillRect(X(lg) - 0.5, axisY - 4, 1, 4); TX(c, s, X(lg), axisY - 7, "#5d6b85", "center", "10px"); }
  OBJ.forEach(([n, lg], i) => { const x = X(lg), y = axisY + 32 + (i % 3) * 13; c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, axisY, 2.5, 0, 6.3); c.fill(); c.strokeStyle = "rgba(255,209,102,0.25)"; c.beginPath(); c.moveTo(x, axisY + 3); c.lineTo(x, y - 9); c.stroke(); TX(c, n, Math.min(Math.max(x, 40), w - 55), y, "#aab6cc", "center", "10.5px"); });
  TX(c, "distance (logarithmic scale: each step is ×10)", Rm, axisY + 70, "#5d6b85", "right", "10px");
  // the chain of results along the bottom
  const by = axisY + 78, bh = h - by - 10; if (bh < 50) return;
  const bw = (w - 32 - 4 * 18) / 5, hS = HOSTS[0], h0 = L.hosts[0];
  const box = [
    ["📡 Radar → 1 AU", `${sci(L.AU * 1e3, 5)} m`, `± ${pct(L.eAU * 100)} (${L.pulses.length} pulses)`],
    ["🌍 Parallax → Cepheid law", `zero point M = ${L.b.toFixed(2)}`, `± ${L.sb.toFixed(3)} mag (${L.nCalOk} stars)`],
    ["✨ Cepheids → galaxies", h0 && h0.ok ? `${hS[0]}: ${h0.d.toFixed(1)} Mpc` : "too faint", `${L.nHostOk} of ${P.nHost} galaxies measured`],
    ["💥 Supernovae → far galaxies", `peak M = ${isFinite(L.M) ? L.M.toFixed(2) : "–"}`, `± ${K.sig(L.sMtot, 2)} mag · ${L.flow.length} supernovae`],
    ["🌈 Hubble's law → universe", `H₀ = ${isFinite(L.H) ? L.H.toFixed(1) : "–"} ± ${K.sig(L.sHtot, 2)}`, `age ≈ ${isFinite(L.H) ? (977.8 / L.H).toFixed(1) : "–"} billion years`]];
  box.forEach((b, i) => {
    const x = 16 + i * (bw + 18), col = RUNGS[i].col, on = hover === RUNGS[i].id;
    c.fillStyle = on ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"; c.strokeStyle = col; c.lineWidth = on ? 2 : 1; c.beginPath(); c.roundRect(x, by, bw, bh, 9); c.fill(); c.stroke();
    TX(c, b[0], x + 9, by + 19, col, "left", "600 11.5px"); TX(c, b[1], x + 9, by + 40, "#eef2f8", "left", "600 13px"); TX(c, b[2], x + 9, by + 59, "#8fa0bf", "left", "11px");
    if (i < 4) { c.fillStyle = "#8fa0bf"; c.beginPath(); const ax = x + bw + 4, ayy = by + bh / 2; c.moveTo(ax, ayy - 5); c.lineTo(ax + 10, ayy); c.lineTo(ax, ayy + 5); c.fill(); }
    hits.push({ id: RUNGS[i].id, x0: x, x1: x + bw, y0: by, y1: by + bh });
  });
}
function drawRadar(c, w, h) {
  const cx = w * 0.3, cy = h * 0.52, S = Math.min(w * 0.27, h * 0.44) / 1.55;
  const toS = p => [cx + p[0] * S, cy - p[1] * S];
  c.strokeStyle = "rgba(140,160,200,0.25)"; c.lineWidth = 1; for (const k of ["venus", "earth", "mars"]) { c.beginPath(); c.arc(cx, cy, ORB[k].a * S, 0, 6.3); c.stroke(); }
  const g0 = c.createRadialGradient(cx, cy, 0, cx, cy, 16); g0.addColorStop(0, "#fff6c8"); g0.addColorStop(0.5, "#ffc94d"); g0.addColorStop(1, "rgba(255,180,60,0)"); c.fillStyle = g0; c.beginPath(); c.arc(cx, cy, 16, 0, 6.3); c.fill();
  const E = toS(pos("earth", T.day));
  for (const [k, col, r] of [["venus", "#ffe0a0", 5], ["earth", "#5ab0ff", 5.5], ["mars", "#ff7b5a", 4.5]]) { const p = toS(pos(k, T.day)); c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, 6.3); c.fill(); TX(c, k === "earth" ? "Earth" : ORB[k].name, p[0] + 8, p[1] - 6, col, "left", "11.5px"); }
  const Tg = toS(pos(P.tgt, T.day)), blocked = behindSun(P.tgt, T.day);
  c.strokeStyle = blocked ? "rgba(255,107,129,0.5)" : "rgba(126,231,135,0.25)"; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(E[0], E[1]); c.lineTo(Tg[0], Tg[1]); c.stroke(); c.setLineDash([]);
  if (pulse) {                                            // the pulse travels out and back (slowed right down)
    const q = pulse.q, f = q < 0.5 ? q * 2 : 2 - q * 2, x = E[0] + (Tg[0] - E[0]) * f, y = E[1] + (Tg[1] - E[1]) * f;
    c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); c.moveTo(E[0], E[1]); c.lineTo(x, y); c.stroke();
    c.fillStyle = "#b8ffbf"; c.beginPath(); c.arc(x, y, 4, 0, 6.3); c.fill();
    TX(c, `⏱ ${(q * pulse.res.tTrue).toFixed(1)} s`, E[0] + 10, E[1] + 18, "#b8ffbf", "left", "600 13px");
  }
  TX(c, `day ${Math.floor(T.day % 584)} of Venus's 584-day cycle`, 14, h - 14, "#7d8aa5", "left", "11px");
  TX(c, blocked ? `${ORB[P.tgt].name} is behind the Sun: no echo possible` : `${ORB[P.tgt].name} is ${earthTo(P.tgt, T.day).toFixed(3)} AU away today (Kepler's laws)`, 14, 22, blocked ? "#ff8a9c" : "#eef2f8", "left", "600 12.5px");
  // the method, with the latest pulse's numbers
  const q = L.pulses[L.pulses.length - 1], x0 = w * 0.6, tw = w * 0.38; let y = 66;
  TX(c, "Measuring the astronomical unit", x0, y, "#5ad1ff", "left", "600 14px"); y += 24;
  const adv = ui.level === "adv";
  y = steps(c, x0, y, tw, [
    [`1. Send a radio pulse to ${q ? ORB[q.k].name : "Venus"} and time its echo: t = ${q ? q.tMeas.toFixed(adv ? 6 : 1) : "–"} s.`],
    [`2. It went there and back, so d = c × t ÷ 2 = 3.00 × 10⁸ × ${q ? q.tMeas.toFixed(1) : "t"} ÷ 2 = ${q ? sci(q.dKm * 1e3, 4) : "–"} m.`],
    [`3. Kepler's third law (T² ∝ r³) gives the orbits' sizes in AU, so on that day the distance was ${q ? q.dAU.toFixed(4) : "–"} AU.`],
    [`4. So 1 AU = ${q ? sci(q.dKm * 1e3, 4) : "d"} m ÷ ${q ? q.dAU.toFixed(4) : "–"} = ${q ? sci(q.AU * 1e3, 5) : "–"} m.`, "#ffd166"],
    [`Average of ${L.pulses.length} pulse${L.pulses.length > 1 ? "s" : ""}${P.pulses.length ? "" : " (taken automatically; send your own to replace them)"}: 1 AU = ${sci(L.AU * 1e3, 6)} m ± ${pct(L.eAU * 100)}.`, "#7ee787"],
    [`Accepted value: 1.495 978 707 × 10¹¹ m. Light takes ${(AU_KM / C_KM).toFixed(0)} s (8.3 minutes) to cross it.`, "#8fa0bf"]]);
}
// background stars for the parallax telescope view (fixed)
const BG = (() => { const r = K.rng(4242), a = []; for (let i = 0; i < 70; i++) a.push([r(), r(), 0.6 + r() * 1.6]); return a; })();
function drawParallax(c, w, h) {
  const d = 10 ** P.star, p = 1000 / d, sig = INST[P.inst].sig, ph = 2 * Math.PI * T.year, adv = ui.level === "adv";
  // left: Earth's orbit and the lines of sight (not to scale)
  const cx = w * 0.2, cy = h * 0.66, R = Math.min(w * 0.13, h * 0.2), sx = cx, sy = 70;
  c.strokeStyle = "rgba(140,160,200,0.3)"; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke();
  c.fillStyle = "#ffc94d"; c.beginPath(); c.arc(cx, cy, 8, 0, 6.3); c.fill();
  const ex = cx + R * Math.cos(ph), ey = cy + R * Math.sin(ph) * 0.35;
  c.strokeStyle = "rgba(126,231,135,0.5)"; c.setLineDash([4, 4]); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * R, cy); c.lineTo(sx, sy); c.stroke(); } c.setLineDash([]);
  c.strokeStyle = "rgba(255,255,255,0.3)"; c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.stroke(); TX(c, "2 AU", cx, cy + 16, "#8fa0bf", "center", "10.5px"); TX(c, "1 AU", cx + R / 2, cy - 5, "#8fa0bf", "center", "10px");
  c.fillStyle = "#5ab0ff"; c.beginPath(); c.arc(ex, ey, 5.5, 0, 6.3); c.fill(); TX(c, "Earth", ex + 8, ey + 14, "#5ab0ff", "left", "11px");
  c.fillStyle = "#fff"; c.beginPath(); c.arc(sx, sy, 4, 0, 6.3); c.fill(); TX(c, "star", sx + 8, sy + 4, "#eef2f8", "left", "11px");
  c.strokeStyle = "#ffd166"; c.beginPath(); c.arc(sx, sy, 26, Math.PI / 2 - 0.12, Math.PI / 2, false); c.stroke(); TX(c, "p", sx + 6, sy + 36, "#ffd166", "left", "600 12px");
  TX(c, "Looking down on the Solar System (not to scale)", 14, 22, "#eef2f8", "left", "600 12.5px");
  TX(c, `The star is really ${sci(d * PC_AU, 3)} AU away`, 14, h - 14, "#7d8aa5", "left", "11px");
  // middle: the view through the telescope, greatly magnified
  const S = Math.min(w * 0.33, h * 0.62), vx = w * 0.39, vy = 40, half = Math.max(1.6 * p, 4 * sig), k = (S / 2) / half;   // pixels per mas
  c.fillStyle = "#02040a"; c.fillRect(vx, vy, S, S); c.strokeStyle = "#2b3a5c"; c.strokeRect(vx + 0.5, vy + 0.5, S, S);
  c.save(); c.beginPath(); c.rect(vx, vy, S, S); c.clip();
  for (const [bx, by, br] of BG) { c.fillStyle = "rgba(220,230,255,0.7)"; c.beginPath(); c.arc(vx + bx * S, vy + by * S, br, 0, 6.3); c.fill(); }
  const mx = vx + S / 2, my = vy + S / 2, off = -p * Math.cos(ph) * k;      // the star moves opposite to the Earth
  for (const s of [-1, 1]) { c.strokeStyle = "rgba(255,209,102,0.35)"; c.setLineDash([2, 3]); c.beginPath(); c.arc(mx + s * p * k, my, 6, 0, 6.3); c.stroke(); c.setLineDash([]); }
  c.fillStyle = "rgba(255,138,112,0.16)"; c.beginPath(); c.arc(mx + off, my, Math.max(3, sig * k), 0, 6.3); c.fill();   // how well the position can be measured
  c.fillStyle = "#fff"; c.beginPath(); c.arc(mx + off, my, 4, 0, 6.3); c.fill();
  if (2 * p * k > 30) { c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(mx - p * k, my + 22); c.lineTo(mx + p * k, my + 22); c.stroke(); TX(c, `total shift 2p = ${fmtAng(2 * p)}`, mx, my + 36, "#ffd166", "center", "11px"); }
  c.restore();
  const bar = 10 ** Math.floor(Math.log10(half * 0.6)); c.fillStyle = "#c9d3e6"; c.fillRect(vx + 10, vy + S - 14, bar * k, 2); TX(c, fmtAng(bar), vx + 10, vy + S - 20, "#c9d3e6", "left", "10.5px");
  TX(c, "Through the telescope (magnified)", vx, vy - 8, "#eef2f8", "left", "600 12.5px");
  TX(c, `field ${fmtAng(2 * half)} wide: the Moon is ${sci(1.8e6 / (2 * half), 2)} times wider`, vx, vy + S + 16, "#7d8aa5", "left", "11px");
  TX(c, "red haze: measurement uncertainty ± " + fmtAng(sig), vx, vy + S + 31, "#ff8a70", "left", "11px");
  // right: the sums
  const x0 = vx + S + 18, tw = w - x0 - 12; let y = 66;
  const pm = plog.length ? K.mean(plog.map(q => q.pm)) : NaN, spm = plog.length ? sig / Math.sqrt(plog.length) : sig;
  TX(c, "Parallax", x0, y, "#7ee787", "left", "600 14px"); y += 22;
  y = steps(c, x0, y, tw, [
    ["As Earth goes round the Sun, the near star seems to move back and forth against the far-away ones."],
    [`Parallax angle p = half the shift = ${fmtAng(p)}${p < 1000 ? ` = ${sci(p / 1000, 3)}″` : ""}.`, "#ffd166"],
    [adv ? `d = 1/p (p in arcseconds) = ${fmtDist(d)} = ${fmtLy(d)}.` : `The smaller the shift, the further the star: this one is ${fmtDist(d)} (${fmtLy(d)}) away.`, "#eef2f8"],
    [plog.length ? `Your ${plog.length} measurement${plog.length > 1 ? "s" : ""}: p = ${fmtAng(pm)} ± ${fmtAng(spm)}, so d = ${pm > 0 ? fmtDist(1000 / pm) : "can't tell (p ≤ 0)"}${pm > 0 ? " ± " + pct(Math.min(999, 100 * spm / pm)) : ""}.` : "Measurements are taken once a year as Earth orbits.", "#7ee787"],
    [sig / p > 0.5 ? "The shift is smaller than the measurement error: parallax cannot measure this star. We need another method." : `Uncertainty ${pct(100 * sig / p)} for one measurement.`, sig / p > 0.5 ? "#ff8a9c" : "#8fa0bf"]]);
  if (adv) steps(c, x0, y, tw, [["1 parsec: the distance at which 1 AU looks 1″ across. 1 pc = 206 265 AU = 3.09 × 10¹⁶ m = 3.26 ly.", "#8fa0bf"]]);
}
// procedural galaxy images (cached): a spiral or an irregular blob of stars
const galCache = {};
function galaxyPts(key, type) {
  if (galCache[key]) return galCache[key]; const r = K.rng(key.split("").reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0), pts = [];
  const tilt = 0.45 + 0.4 * r(), rot = r() * 6.28;
  for (let i = 0; i < 1600; i++) {
    let x, y;
    if (type === "irr") { const bar = i < 700; x = bar ? (r() - 0.5) * 1.2 + 0.08 * r.gauss() : 0.35 * r.gauss() + 0.1; y = bar ? 0.1 * r.gauss() : 0.3 * r.gauss(); }
    else if (i < 350) { x = 0.12 * r.gauss(); y = 0.12 * r.gauss(); }
    else { const arm = i % 2, rho = 0.1 + 0.85 * r(), th = arm * Math.PI + 2.4 * Math.log(rho / 0.1) + 0.25 * r.gauss(); x = rho * Math.cos(th); y = rho * Math.sin(th); }
    const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = (x * Math.sin(rot) + y * Math.cos(rot)) * tilt; pts.push([xr, yr, r()]);
  }
  return (galCache[key] = pts);
}
function drawGalaxy(c, pts, gx, gy, R, alpha = 1) { for (const [x, y, b] of pts) { c.fillStyle = `rgba(${200 + 55 * b | 0},${200 + 30 * b | 0},255,${(0.25 + 0.5 * b) * alpha})`; c.fillRect(gx + x * R, gy + y * R, 1.4, 1.4); } const g0 = c.createRadialGradient(gx, gy, 0, gx, gy, R * 0.3); g0.addColorStop(0, `rgba(255,240,210,${0.5 * alpha})`); g0.addColorStop(1, "rgba(255,240,210,0)"); c.fillStyle = g0; c.beginPath(); c.arc(gx, gy, R * 0.3, 0, 6.3); c.fill(); }
const cephMag = (q, t) => { const x = 2 * Math.PI * (t / q.P + q.ph); return -q.amp * 0.5 * (Math.sin(x) + 0.35 * Math.sin(2 * x) + 0.12 * Math.sin(3 * x)) / 1.15; };   // fast rise, slow fade (− = brighter)
let cephSpots = [];
function drawCepheid(c, w, h) {
  const G = GALS[P.gal], H = L.disp, pts = galaxyPts(G[0], G[2]), gx = w * 0.26, gy = h * 0.52, R = Math.min(w * 0.24, h * 0.46), adv = ui.level === "adv";
  drawGalaxy(c, pts, gx, gy, R); cephSpots = [];
  const det = H.ceph.filter(q => q.det); if (cSel < 0 || cSel >= det.length) cSel = det.length ? det.reduce((bi, q, i, a) => q.P > a[bi].P ? i : bi, 0) : -1;
  det.forEach((q, i) => { const pt = pts[350 + Math.floor(q.spot * (pts.length - 351))], x = gx + pt[0] * R, y = gy + pt[1] * R, br = -cephMag(q, T.ceph); cephSpots.push([x, y, i]);
    c.fillStyle = `rgba(255,230,109,${0.55 + 0.45 * br / q.amp})`; c.beginPath(); c.arc(x, y, 2.5 + 2 * (br / q.amp + 0.6), 0, 6.3); c.fill();
    if (i === cSel) { c.strokeStyle = "#5ad1ff"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 10, 0, 6.3); c.stroke(); } });
  TX(c, `${G[0]} · ${TEL[P.tel].name}`, 14, 22, "#eef2f8", "left", "600 12.5px");
  TX(c, `${H.nDet} of ${P.nCeph} Cepheids bright enough to measure · click one to choose it`, 14, h - 14, "#7d8aa5", "left", "11px");
  const x0 = w * 0.54, tw = w * 0.44; let y = 66; const q = det[cSel];
  TX(c, "Cepheid variables: standard candles", x0, y, "#ffe66d", "left", "600 14px"); y += 22;
  if (!q) { steps(c, x0, y, tw, [["No Cepheids are bright enough to measure in this galaxy with this telescope. Try a bigger telescope, or a nearer galaxy.", "#ff8a9c"], ["This is where the Cepheid rung runs out (about 40 Mpc even with Hubble or JWST): supernovae are a million times brighter.", "#8fa0bf"]]); return; }
  const M = LV(q.logP, L.b), mu = q.m - M, dq = muToMpc(mu) * 1e6, dim = 10 ** (mu / 2.5);
  y = steps(c, x0, y, tw, [
    [`1. Time its brightness cycle (left chart): period P = ${q.P.toFixed(1)} days.`],
    [adv ? `2. Leavitt's law (calibrated by parallax, middle chart): M = −2.43(log₁₀${q.P.toFixed(1)} − 1) ${L.b < 0 ? "−" : "+"} ${Math.abs(L.b).toFixed(2)} = ${M.toFixed(2)}.` : `2. Longer period = more luminous. Leavitt's law (calibrated with Milky Way Cepheids measured by parallax) says this one is ${K.sig(10 ** ((4.83 - M) / 2.5), 2)} times as luminous as the Sun.`],
    [adv ? `3. Its mean apparent magnitude m = ${q.m.toFixed(2)}, so m − M = ${mu.toFixed(2)} and d = 10^((m − M + 5)/5) pc = ${fmtDist(dq)}.` : `3. It looks ${sci(dim, 2)} times dimmer than it would from 10 pc. Brightness ∝ 1/d², so it is √(${sci(dim, 2)}) × 10 pc = ${fmtDist(dq)} away.`, "#ffd166"],
    [`All ${H.nDet} Cepheids together: d = ${fmtDist(H.d * 1e6)} ± ${(46 * Math.hypot(H.smu, L.sb)).toFixed(0)}% (${fmtLy(H.d * 1e6)}).`, "#7ee787"],
    [`Accepted distance: ${fmtDist(G[1] * 1e6)}.${P.zp ? " (Calibration error switched on!)" : ""}${P.dust ? " (Dust not corrected!)" : ""}`, "#8fa0bf"]]);
}
function drawSupernova(c, w, h) {
  const q = L.flow[snPick], adv = ui.level === "adv"; if (!q) return;
  const pts = galaxyPts("sn" + q.sn.seed, "sp"), gx = w * 0.26, gy = h * 0.5, R = Math.min(w * 0.22, h * 0.4); drawGalaxy(c, pts, gx, gy, R, 0.8);
  const pt = pts[400 + Math.floor(q.sn.x * 1100)], sx = gx + pt[0] * R * 0.9, sy = gy + pt[1] * R * 0.9, F = snFlux(T.sn, q.sn.s);
  if (F > 0.002) { const rad = 4 + 22 * Math.sqrt(F), g0 = c.createRadialGradient(sx, sy, 0, sx, sy, rad); g0.addColorStop(0, "rgba(255,255,255,1)"); g0.addColorStop(0.3, `rgba(190,220,255,${0.9 * Math.sqrt(F)})`); g0.addColorStop(1, "rgba(150,190,255,0)"); c.fillStyle = g0; c.beginPath(); c.arc(sx, sy, rad, 0, 6.3); c.fill(); }
  TX(c, `Supernova ${snPick + 1} of ${L.flow.length} · day ${T.sn.toFixed(0)} from peak`, 14, 22, "#eef2f8", "left", "600 12.5px");
  TX(c, "A white dwarf in a binary gains mass and explodes at the same mass every time (about 1.4 Suns).", 14, h - 14, "#7d8aa5", "left", "11px");
  const x0 = w * 0.54, tw = w * 0.44; let y = 66, dmS = dm15(q.sn.s);
  TX(c, "Type Ia supernovae: the brightest standard candles", x0, y, "#ffb454", "left", "600 14px"); y += 22;
  const mu = q.mS - L.M, dim = 10 ** (mu / 2.5);
  const items = [[`1. Follow its light curve (left chart). Peak apparent magnitude m = ${q.m.toFixed(2)}.`]];
  if (P.stretch) items.push([`2. It fades ${dmS.toFixed(2)} mag in 15 days (stretch ${q.sn.sm.toFixed(2)}). ${q.sn.sm > 1 ? "Slow faders are brighter" : "Fast faders are fainter"}: corrected m = ${q.mS.toFixed(2)}.`]);
  items.push([`${P.stretch ? 3 : 2}. Calibrated in ${L.nHostOk} galaxies whose Cepheids we measured (right chart): peak M = ${L.M.toFixed(2)} ± ${L.sMtot.toFixed(2)}, about ${sci(10 ** ((4.83 - L.M) / 2.5), 1)} times the Sun.`]);
  items.push([adv ? `${P.stretch ? 4 : 3}. m − M = ${mu.toFixed(2)}, so d = 10^((m − M + 5)/5) pc = ${fmtDist(q.dEst * 1e6)} ± ${(46 * snSig(P.stretch)).toFixed(0)}%.` : `${P.stretch ? 4 : 3}. It looks ${sci(dim, 2)} times dimmer than from 10 pc, so it is √ of that × 10 pc = ${fmtDist(q.dEst * 1e6)} away.`, "#ffd166"]);
  items.push([`Accepted distance: ${fmtDist(q.d * 1e6)} (${fmtLy(q.d * 1e6)}). The light left it ${fmtLy(q.d * 1e6).replace("light-", "")} ago.`, "#8fa0bf"]);
  steps(c, x0, y, tw, items);
}
const LINES = [393.4, 396.8, 486.1, 517.3, 589.3, 656.3];
function spectrum(c, x, y, w, h, z, label) {
  const lo = 380, hi = 760; for (let i = 0; i < w; i += 2) { const l = lo + (hi - lo) * i / w; c.fillStyle = `hsl(${270 - (l - 380) / 380 * 270},80%,45%)`; c.fillRect(x + i, y, 2, h); }
  c.fillStyle = "#000"; for (const l0 of LINES) { const l = l0 * (1 + z); if (l > lo && l < hi) c.fillRect(x + (l - lo) / (hi - lo) * w - 1.5, y, 3, h); }
  TX(c, label, x, y - 6, "#eef2f8", "left", "600 12px"); for (const l of [400, 500, 600, 700]) TX(c, l + " nm", x + (l - lo) / (hi - lo) * w, y + h + 13, "#7d8aa5", "center", "10px");
}
function drawHubble(c, w, h) {
  const q = L.flow[snPick], adv = ui.level === "adv", sw = w * 0.52; if (!q) return;
  spectrum(c, 20, 44, sw, 28, 0, "Lab spectrum (calcium, hydrogen, magnesium, sodium lines)");
  spectrum(c, 20, 118, sw, 28, q.z, `Supernova ${snPick + 1}'s galaxy: z = ${q.z.toFixed(4)}`);
  spectrum(c, 20, 192, sw, 28, P.zT, `A far galaxy (no supernova): z = ${P.zT.toFixed(3)}`);
  let y = 258; const Lp = (s, col = "#c9d3e6") => { y = wrap(c, s, 20, y, sw, 18, col, "13px") + 4; };
  Lp(`Red-shift z = Δλ ÷ λ. Speed v = c z = ${(q.v).toFixed(0)} km/s; distance from its supernova d = ${q.dEst.toFixed(0)} Mpc.`);
  Lp(`For this galaxy alone, v ÷ d = ${(q.v / q.dEst).toFixed(1)} km/s per Mpc. The best line through all of them: H₀ = ${isFinite(L.H) ? L.H.toFixed(1) : "–"} ± ${K.sig(L.sHtot, 2)}.`, "#ffd166");
  Lp(`Now Hubble's law is a ruler: the far galaxy is at d = cz ÷ H₀ = ${(C_KM * P.zT).toFixed(0)} ÷ ${L.H.toFixed(1)} = ${(C_KM * P.zT / L.H).toFixed(0)} Mpc (${fmtLy(C_KM * P.zT / L.H * 1e6)}).`, "#7ee787");
  Lp(`Age of the universe ≈ 1/H₀ = ${(977.8 / L.H).toFixed(1)} billion years${adv ? " (977.8 ÷ H₀ converts km/s per Mpc into billions of years)" : ""}.`, "#8fa0bf");
  // right: a sketch of space: from us, every galaxy moves away, faster the further it is
  const ox = w * 0.6, oy = 60, ow = w * 0.38, oh = h - 110, cx = ox + ow / 2, cy = oy + oh / 2, Rg = Math.min(ow, oh) / 2 - 30;
  c.strokeStyle = "rgba(140,160,200,0.15)"; for (const f of [0.33, 0.66, 1]) { c.beginPath(); c.arc(cx, cy, Rg * f, 0, 6.3); c.stroke(); }
  c.fillStyle = "#5ab0ff"; c.beginPath(); c.arc(cx, cy, 5, 0, 6.3); c.fill(); TX(c, "us", cx, cy + 18, "#5ab0ff", "center", "11px");
  const r = K.rng(99); for (let i = 0; i < 22; i++) { const dd = 0.2 + 0.8 * r(), an = r() * 6.283, x = cx + Math.cos(an) * dd * Rg, y2 = cy + Math.sin(an) * dd * Rg; c.fillStyle = "#c9a0ff"; c.beginPath(); c.ellipse(x, y2, 5, 2.5, an * 3, 0, 6.3); c.fill(); c.strokeStyle = "rgba(255,138,112,0.8)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 7 * Math.cos(an), y2 + 7 * Math.sin(an)); c.lineTo(x + (7 + dd * 30) * Math.cos(an), y2 + (7 + dd * 30) * Math.sin(an)); c.stroke(); }
  TX(c, "further away → faster away (arrows: speed)", cx, oy + oh + 22, "#ff8a70", "center", "11.5px");
}

// ---------------- Charts ----------------
const negFmt = v => (-v).toFixed(1);
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(Math.round(v)) : "";
function charts() {
  const v = P.view, m = [chA, chB, chC]; for (const ch of m) { ch.opts.xFmt = null; ch.opts.yFmt = null; ch.opts.yZero = false; }
  if (v === "ladder") {
    const parts = [L.eAU * 100, 46 * L.sb, 46 * Math.hypot(L.sb, K.mean(L.hosts.filter(q => q.ok).map(q => q.smu)) || 0), 46 * L.sMtot, 100 * L.sHtot / L.H];
    const names = ["radar", "parallax", "Cepheids", "supernovae", "H₀"];
    Object.assign(chA.opts, { title: "Uncertainty in distance at each rung (it builds up)", xLabel: "", yLabel: "uncertainty (%)", xFmt: whole(i => names[i - 1] || "") });
    chA.draw(parts.map((p, i) => ({ pts: [[i + 1, isFinite(p) ? p : 0]], type: "bars", w: 0.6, color: RUNGS[i].col })), { xMin: 0.4, xMax: 5.6, yMin: 0 });
    Object.assign(chB.opts, { title: "H₀ from each climb of the ladder", xLabel: "climb number", yLabel: "H₀ (km/s per Mpc)" });
    chB.draw([{ pts: climbs.map((H, i) => [i + 1, H]), type: "dots", r: 4, color: "#ff7b9c", label: "your climbs" }], { xMin: 0, xMax: Math.max(10, climbs.length + 1), hlines: [{ y: P.H0, label: "true " + P.H0 }] });
    const big = [["radar timing", parts[0]], ["parallax calibration", 46 * L.sb], ["few supernova calibrators", 46 * L.sMr], ["Hubble-diagram scatter", 100 * L.sH / L.H]].sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
    rdL.set("H", isFinite(L.H) ? L.H.toFixed(1) + " km/s per Mpc" : "–"); rdL.set("age", isFinite(L.H) ? (977.8 / L.H).toFixed(2) + " billion years" : "–"); rdL.set("err", isFinite(L.sHtot) ? `± ${L.sHtot.toFixed(1)} (${(100 * L.sHtot / L.H).toFixed(1)}%)` : "–"); rdL.set("big", big[0]);
    ui.hud(`H₀ = ${isFinite(L.H) ? L.H.toFixed(1) : "–"} ± ${K.sig(L.sHtot, 2)} km/s per Mpc`);
  } else if (v === "radar") {
    const ps = L.pulses;
    Object.assign(chA.opts, { title: "Radar v Kepler distance", xLabel: "distance from Kepler's laws (AU)", yLabel: "radar distance (million km)" });
    chA.draw([{ pts: ps.map(q => [q.dAU, q.dKm / 1e6]), type: "dots", r: 4, color: "#5ad1ff", label: "pulses" }, { pts: [[0, 0], [2.6, 2.6 * L.AU / 1e6]], color: "#7ee787", label: "gradient = 1 AU" }], { xMin: 0, xMax: 2.6, yMin: 0 });
    const ys = ps.map(q => q.AU / 1e6), lo = Math.min(...ys, 149.598), hi = Math.max(...ys, 149.598), pad = Math.max((hi - lo) * 0.15, 0.002);
    Object.assign(chB.opts, { title: "1 AU from each pulse", xLabel: "pulse", yLabel: "1 AU (million km)" });
    chB.draw([{ pts: ps.map((q, i) => [i + 1, q.AU / 1e6]), type: "dots", r: 4, color: "#ffd166", label: "each pulse" }], { xMin: 0, xMax: ps.length + 1, yMin: lo - pad, yMax: hi + pad, hlines: [{ y: AU_KM / 1e6, label: "accepted 149.598" }] });
    const q = ps[ps.length - 1]; rdR.set("t", q ? q.tMeas.toFixed(ui.level === "adv" ? 6 : 2) + " s" : "–"); rdR.set("d", q ? sci(q.dKm * 1e3, 4) + " m" : "–"); rdR.set("au", sci(L.AU * 1e3, 6) + " m"); rdR.set("n", ps.length + (P.pulses.length ? "" : " (automatic)"));
    ui.hud("d = c t ÷ 2");
  } else if (v === "parallax") {
    const d = 10 ** P.star, curve = s => { const a = []; for (let lg = 0; lg <= 4.5; lg += 0.05) a.push([lg, Math.min(100, s * 10 ** lg / 10)]); return a; };
    Object.assign(chA.opts, { title: "One parallax: uncertainty", xLabel: "distance (pc, logarithmic)", yLabel: "uncertainty (%)", xFmt: whole(i => fmtDist(10 ** i, 1)) });
    chA.draw([{ pts: curve(20), color: "#ffb454", label: "1838" }, { pts: curve(1), color: "#5ad1ff", label: "Hipparcos" }, { pts: curve(0.025), color: "#7ee787", label: "Gaia" }, { pts: [[P.star, Math.min(100, INST[P.inst].sig * d / 10)]], type: "dots", r: 6, color: "#ffffff", label: "this star" }], { xMin: 0, xMax: 4.5, yMin: 0, yMax: 100, hlines: [{ y: 10, label: "10%" }] });
    Object.assign(chB.opts, { title: "Your measurements of this star", xLabel: "year", yLabel: "distance (pc)" });
    chB.draw([{ pts: plog.map((q, i) => [i + 1, isFinite(q.d) ? q.d : null]), type: "dots", r: 4, color: "#ffd166", label: "measured d = 1/p" }], { xMin: 0, xMax: Math.max(10, plog.length + 1), yMin: 0, yMax: d * 2.5, hlines: [{ y: d, label: "true " + fmtDist(d) }] });
    rdP.set("p", fmtAng(1000 / d)); rdP.set("d", fmtDist(d) + " = " + K.sig(d * PC_LY, 3) + " ly"); rdP.set("e", `± ${pct(Math.min(999, 100 * INST[P.inst].sig * d / 1000))} each`); rdP.set("n", plog.length);
    ui.hud(ui.level === "adv" ? "d (pc) = 1 ÷ p (arcseconds)" : "smaller shift → further away");
  } else if (v === "cepheid") {
    const H = L.disp, det = H.ceph.filter(q => q.det), q = det[cSel];
    Object.assign(chA.opts, { title: q ? `Light curve: P = ${q.P.toFixed(1)} days` : "Light curve", xLabel: "time (days)", yLabel: "magnitude (up = brighter)", yFmt: negFmt });
    if (q) { const pts = [], obs = [], rN = K.rng(Math.floor(q.spot * 1e6)); for (let i = 0; i <= 200; i++) { const t = 2 * q.P * i / 200; pts.push([t, -(q.m + cephMag(q, t))]); } for (let t = 0; t <= 2 * q.P; t += q.P / 9) obs.push([t, -(q.m + cephMag(q, t) + q.sph * rN.gauss())]); chA.draw([{ pts, color: "#ffe66d", width: 1.4, alpha: 0.5 }, { pts: obs, type: "dots", r: 3, color: "#ffe66d", label: "observations" }], { xMin: 0, xMax: 2 * q.P, vlines: [{ x: T.ceph % (2 * q.P), color: "#5ad1ff" }] }); } else chA.draw([], {});
    const cal = L.cal.filter(c => c.ok && c.s < 1.2);
    Object.assign(chB.opts, { title: "Milky Way (parallax)", xLabel: "log₁₀(period in days)", yLabel: "absolute magnitude M", yFmt: negFmt });
    chB.draw([{ pts: cal.map(c => [c.logP, -c.Md, c.s]), type: "err", r: 2.5, color: "#7ee787", alpha: 0.8, label: `${L.nCalOk} stars` }, { pts: [[0.3, -LV(0.3, L.b)], [1.9, -LV(1.9, L.b)]], color: "#ffe66d", label: "fitted law" }], { xMin: 0.3, xMax: 1.9, yMin: 1, yMax: 8 });
    const lim = TEL[P.tel].lim, mu = isFinite(H.mu) ? H.mu : H.mu0, fnt = Math.min(H.mu0 + P.dust - 1.2, lim + 0.5);
    Object.assign(chC.opts, { title: `${GALS[P.gal][0].replace(/ \(.*\)/, "")}: m`, xLabel: "log₁₀(period in days)", yLabel: "apparent magnitude m", yFmt: negFmt });
    chC.draw([{ pts: det.filter(c => !c.used).map(c => [c.logP, -c.m, c.sph]), type: "err", r: 2.5, color: "#8fa0bf", alpha: 0.6, label: "not used" }, { pts: det.filter(c => c.used).map(c => [c.logP, -c.m, c.sph]), type: "err", r: 3, color: "#ffe66d", label: "used" }, { pts: [[0.3, -LV(0.3, L.b) - mu], [1.9, -LV(1.9, L.b) - mu]], color: "#5ad1ff", label: "law + (m − M)" }], { xMin: 0.3, xMax: 1.9, yMin: -fnt, yMax: -(H.mu0 + P.dust - 7.5), hlines: lim + 0.5 < H.mu0 + P.dust - 1.2 ? [{ y: -lim, color: "#ff6b81", label: "telescope limit" }] : [] });
    rdC.set("n", `${H.nDet} of ${P.nCeph}`); rdC.set("mu", isFinite(H.mu) ? `${H.mu.toFixed(2)} ± ${Math.hypot(H.smu, L.sb).toFixed(2)}` : "–"); rdC.set("d", isFinite(H.mu) ? fmtDist(H.d * 1e6) : "too faint"); rdC.set("true", fmtDist(GALS[P.gal][1] * 1e6));
    ui.hud(ui.level === "adv" ? "m − M = 5 log₁₀(d ÷ 10 pc)" : "brightness ∝ 1 ÷ d²");
  } else if (v === "sn") {
    const q = L.flow[snPick]; if (!q) return; const rN = K.rng(q.sn.seed), curve = [], obs = [];
    for (let t = -20; t <= 70; t += 1) { const F = snFlux(t, q.sn.s); curve.push([t, F > 0.003 ? -(q.m - 2.5 * Math.log10(F)) : null]); }
    for (let t = -18; t <= Math.min(70, T.sn); t += 3) { const F = snFlux(t, q.sn.s); if (F > 0.01) obs.push([t, -(q.m - 2.5 * Math.log10(F) + 0.04 * rN.gauss())]); }
    Object.assign(chA.opts, { title: `Light curve: fades ${dm15(q.sn.s).toFixed(2)} mag in 15 days`, xLabel: "days from peak", yLabel: "magnitude (up = brighter)", yFmt: negFmt });
    chA.draw([{ pts: curve, color: "#ffb454", alpha: 0.35, width: 1.2 }, { pts: obs, type: "dots", r: 3.2, color: "#ffb454", label: "observations" }], { xMin: -20, xMax: 70, yMin: -(q.m + 4.5), yMax: -(q.m - 0.4), vlines: [{ x: T.sn, color: "#5ad1ff" }] });
    const hs = L.hosts.filter(h => h.ok);
    Object.assign(chB.opts, { title: "Calibrating supernovae with Cepheids", xLabel: "galaxy's distance from its Cepheids (Mpc)", yLabel: "peak absolute magnitude M", yFmt: negFmt });
    chB.draw([{ pts: hs.map(h => [h.d, -h.MSN, h.sM]), type: "err", r: 4, color: "#ffb454", label: `${hs.length} galaxies` }, { pts: [[0, -L.M], [45, -L.M]], color: "#7ee787", label: `mean M = ${L.M.toFixed(2)}` }], { xMin: 0, xMax: 45, yMin: 18.2, yMax: 20.4, hlines: [{ y: -SN_M0, label: "true" }] });
    rdS.set("m", q.m.toFixed(2) + (P.stretch ? ` (corrected ${q.mS.toFixed(2)})` : "")); rdS.set("M", `${L.M.toFixed(2)} ± ${L.sMtot.toFixed(2)}`); rdS.set("d", fmtDist(q.dEst * 1e6)); rdS.set("true", fmtDist(q.d * 1e6));
    ui.hud(ui.level === "adv" ? "m − M = 5 log₁₀(d ÷ 10 pc)" : "brighter than a whole galaxy for a few weeks");
  } else if (v === "hubble") {
    const fl = L.flow, dmx = Math.max(10, ...fl.map(q => q.dEst)) * 1.05, q = fl[snPick];
    Object.assign(chA.opts, { title: "Hubble diagram", xLabel: "distance from the supernova (Mpc)", yLabel: "speed from red-shift (km/s)" });
    chA.draw([{ pts: fl.map(q => [q.dEst, q.v]), type: "dots", r: 3.2, color: "#ffd166", label: "supernovae" }, { pts: q ? [[q.dEst, q.v]] : [], type: "dots", r: 6, color: "#5ad1ff" }, { pts: [[0, 0], [dmx, L.H * dmx]], color: "#7ee787", label: `fit H₀ = ${L.H.toFixed(1)}` }, { pts: [[0, 0], [dmx, P.H0 * dmx]], color: "#56607a", dash: [5, 4], label: `true ${P.H0}` }], { xMin: 0, xMax: dmx, yMin: 0 });
    Object.assign(chB.opts, { title: "H₀ from each supernova on its own (v ÷ d)", xLabel: "distance (Mpc)", yLabel: "v ÷ d (km/s per Mpc)" });
    chB.draw([{ pts: fl.map(q => [q.dEst, q.v / q.dEst]), type: "dots", r: 3.2, color: "#ff7b9c", label: "each supernova" }], { xMin: 0, xMax: dmx, yMin: 0, yMax: 160, hlines: [{ y: L.H, color: "#7ee787", dash: [], label: "fit" }] });
    rdH.set("H", `${L.H.toFixed(1)} ± ${L.sHtot.toFixed(1)} km/s per Mpc`); rdH.set("age", (977.8 / L.H).toFixed(2) + " billion years"); rdH.set("zT", (C_KM * P.zT / L.H).toFixed(0) + " Mpc"); rdH.set("n", fl.length);
    ui.hud(ui.level === "adv" ? "v = H₀ d,  z ≈ v ÷ c" : "v = H₀ d");
  }
}

// ---------------- Clicks ----------------
K.pointer(cv.el, {
  down: p => {
    if (P.view === "ladder") { const hit = hits.find(b => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1); if (hit) setView(hit.id); }
    else if (P.view === "cepheid") { let best = -1, bd = 300; for (const [x, y, i] of cephSpots) { const dd = (x - p.x) ** 2 + (y - p.y) ** 2; if (dd < bd) { bd = dd; best = i; } } if (best >= 0) cSel = best; }
    else if (P.view === "radar") sendPulse();
  },
  hover: p => { if (P.view !== "ladder") return; const hit = hits.find(b => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1); hover = hit ? hit.id : null; cv.el.style.cursor = hit ? "pointer" : ""; },
  leave: () => { hover = null; }
});

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed;
  T.day += 30 * s; const y0 = Math.floor(T.year); T.year += 0.25 * s; if (P.view === "parallax" && Math.floor(T.year) > y0) measureParallax();
  T.ceph += 3 * s; T.sn += 8 * s; if (T.sn > 75) T.sn = -20;
  if (pulse) { pulse.q += dt / 2.5; if (pulse.q >= 1) { P.pulses.push(pulse.res); if (P.pulses.length > 30) P.pulses.shift(); pulse = null; recompute(); } }
}, () => {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#05070f"; c.fillRect(0, 0, w, h);
  ({ ladder: drawLadder, radar: drawRadar, parallax: drawParallax, cepheid: drawCepheid, sn: drawSupernova, hubble: drawHubble })[P.view](c, w, h);
  if (frame++ % 5 === 0) charts();
});
applyLevel(); set({});
ui.tip("Click a rung of the ladder to open it, or use the buttons in Controls.", 7000);
