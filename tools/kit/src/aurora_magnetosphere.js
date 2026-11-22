/* =====================================================================
   AURORA AND THE MAGNETOSPHERE
   Earth is a magnet (a "dipole"). The Sun blows a wind of charged
   particles (the solar wind, 300–900 km/s) that carries the Sun's own
   magnetic field with it (the IMF). What happens depends on which way
   the IMF points:

     Bz NORTHWARD (the same way as Earth's field at the equator): the two
     fields do not join. Earth's field lines stay closed, the solar wind
     flows round, and there is little aurora.

     Bz SOUTHWARD (opposite): the fields cancel at a NULL point and join
     up ("reconnection"). Some of Earth's field lines become OPEN: one end
     on Earth, the other out in the solar wind. Solar-wind particles can
     now slide along them, spiralling round the field lines, down into the
     atmosphere near the poles, where they make oxygen and nitrogen glow:
     the aurora.

   The model is the textbook "open magnetosphere" of Dungey (1961): a dipole
   plus a uniform field Bz. The boundary between open and closed field lines
   reaches the ground at magnetic latitude λ with
              cos²λ = 1.5 (|Bz| / B_E)^(1/3)        (B_E = 31 000 nT)
   so a stronger southward field pushes the polar cap, and the aurora,
   towards the equator.

   Particles: each follows its field line (sliding along it) and drifts
   with the solar wind's electric field, E = −v × B (the "E cross B"
   drift), wherever its field line is connected to the solar wind. Field
   lines that are closed (both ends on Earth) are shielded from that
   electric field, and particles that reach them are trapped.
   ===================================================================== */
"use strict";
const BE = 31000;                  // Earth's field at the surface at the equator (nT)
const RE = 6371;                   // Earth's radius (km)
// the magnetic field (nT) at a point (x towards the Sun, z north; in Earth radii): dipole (moment pointing south) plus a uniform IMF Bz
function field(x, y, z, bz, out) { const r2 = x * x + y * y + z * z, r = Math.sqrt(r2), r5 = r2 * r2 * r, mz = -BE, md = mz * z;
  out[0] = 3 * md * x / r5; out[1] = 3 * md * y / r5; out[2] = (3 * md * z - mz * r2) / r5 + bz; return out; }
const theoryLat = bz => bz >= 0 ? NaN : 90 - Math.asin(Math.sqrt(1.5 * Math.cbrt(-bz / BE))) * 180 / Math.PI;   // the open–closed boundary (southward Bz only)
// Kp (a 0–9 index of how disturbed the magnetic field is), from the solar wind, by the approximate fit of Newell et al. (2008)
function kpIndex(bz, v, n) { const th = bz < 0 ? Math.PI : 0, dphi = Math.pow(v, 4 / 3) * Math.pow(Math.abs(bz), 2 / 3) * Math.pow(Math.sin(th / 2), 8 / 3); return Math.min(9, Math.max(0, 0.05 + 2.244e-4 * dphi + 2.844e-6 * Math.sqrt(n) * v * v)); }
const b = [0, 0, 0];
// is a field line open? Follow it outwards from a footpoint at magnetic latitude lat (radians); open if it escapes past 60 Earth radii
function footOpen(lat, lon, bz) { let x = Math.cos(lat) * Math.cos(lon), y = Math.cos(lat) * Math.sin(lon), z = Math.sin(lat); const s = z > 0 ? -1 : 1;
  for (let k = 0; k < 20000; k++) { field(x, y, z, bz, b); const B = Math.hypot(b[0], b[1], b[2]), r = Math.hypot(x, y, z), ds = 0.02 * Math.max(1, r * 0.5); x += s * ds * b[0] / B; y += s * ds * b[1] / B; z += s * ds * b[2] / B;
    const rr = Math.hypot(x, y, z); if (rr > 60) return true; if (rr < 0.99 && k > 10) return false; } return true; }
function tracedLat(bz) { let lo = 45 * Math.PI / 180, hi = 89.95 * Math.PI / 180; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (footOpen(m, 0, bz)) hi = m; else lo = m; } return (lo + hi) / 2 * 180 / Math.PI; }
/* Field-line topology on a grid over the meridian plane (the field is the same all round the z axis): 0 closed (both ends on Earth), 1 open, 2 solar wind (no end on Earth) */
const topoCache = new Map();
function topology(bz) {
  const key = bz.toFixed(2); if (topoCache.has(key)) return topoCache.get(key);
  const N = 140, G = new Uint8Array(N * N);
  const endOf = (rho, z, s) => { let x = rho, zz = z; for (let k = 0; k < 3000; k++) { field(x, 0, zz, bz, b); const B = Math.hypot(b[0], b[2]) || 1e-9, r = Math.hypot(x, zz), ds = 0.035 * Math.max(1, r * 0.6); x += s * ds * b[0] / B; zz += s * ds * b[2] / B; const rr = Math.hypot(x, zz); if (rr < 1) return 1; if (rr > 45) return 0; } return 0; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const rho = (i + 0.5) * 40 / N, z = -40 + (j + 0.5) * 80 / N; if (Math.hypot(rho, z) < 1) continue; const e = endOf(rho, z, 1) + endOf(rho, z, -1); G[i + j * N] = e === 2 ? 0 : e === 1 ? 1 : 2; }
  const t = { at(x, y, z) { const i = Math.min(N - 1, Math.hypot(x, y) / 40 * N | 0), j = Math.min(N - 1, Math.max(0, (z + 40) / 80 * N | 0)); return G[i + j * N]; } };
  if (topoCache.size > 40) topoCache.clear(); topoCache.set(key, t); return t;
}
/* One solar-wind particle (its guiding centre): starts 18 Earth radii sunward, slides along its field line at a random thermal speed
   (up to ±0.6 of the wind speed) and drifts at E×B/B² while its field line is connected to the solar wind. */
class Particle {
  constructor(r, vsw) { this.reset(r, vsw); }
  reset(r, vsw) { this.x = 18; this.y = (r() - 0.5) * 30; this.z = (r() - 0.5) * 30; this.vpar = (r() - 0.5) * 1.2 * vsw / RE; this.state = 0; this.trail = []; this.age = 0; this.ph = r() * 6.28; }   // state: 0 moving, 1 precipitated, 2 trapped, 3 gone
  step(bz, vsw, topo, dtMax) {
    const Ey = -vsw * bz; field(this.x, this.y, this.z, bz, b); const B2 = b[0] * b[0] + b[1] * b[1] + b[2] * b[2], B = Math.sqrt(B2);
    if (topo.at(this.x, this.y, this.z) === 0) { this.state = 2; return 0; }
    let vx = Ey * b[2] / B2, vz = -Ey * b[0] / B2; const vm = Math.hypot(vx, vz), cap = 3 * vsw; if (vm > cap) { vx *= cap / vm; vz *= cap / vm; }   // E×B drift (km/s), capped near the null where B → 0
    vx = vx / RE + this.vpar * b[0] / B; const vy = this.vpar * b[1] / B; vz = vz / RE + this.vpar * b[2] / B;
    const sp = Math.hypot(vx, vy, vz) || 1e-9, dt = Math.min(dtMax, 0.08 / sp);
    this.x += vx * dt; this.y += vy * dt; this.z += vz * dt; this.age += dt;
    const r = Math.hypot(this.x, this.y, this.z); if (r < 1.5) { this.state = 1; this.lat = Math.asin(this.z / r); this.lon = Math.atan2(this.y, this.x); } else if (r > 40 || this.x < -40) this.state = 3;
    return dt;
  }
}
// batch: send N particles and see what happens to them within an hour
function runParticles(bz, vsw, r, N = 300, T = 3600) { const topo = topology(bz); let hit = 0, lat = 0; for (let k = 0; k < N; k++) { const p = new Particle(r, vsw); while (p.state === 0 && p.age < T) p.step(bz, vsw, topo, 20); if (p.state === 1) { hit++; lat += Math.abs(p.lat) * 180 / Math.PI; } } return { frac: hit / N, lat: hit ? lat / hit : NaN }; }

if (typeof module !== "undefined") module.exports = { field, theoryLat, tracedLat, kpIndex, topology, runParticles, Particle };
else page();
function page() {
let bz = -5, vsw = 450, dens = 6, nPart = 1200, showLines = true, showParts = true, speed = 60, parts = [], hits = 0, hitLog = [], latHits = [], topo = topology(bz), pending = null, lineGeo = null;
const cam = { yaw: 2.3, pitch: 0.5, dist: 11 };
const ui = K.app({
  title: "Aurora and the Magnetosphere", subject: "Physics",
  blurb: "How the solar wind gets in, and lights up the polar sky",
  reset: () => setSW(-5, 450, 6),
  missions: [
    { title: "North or south?", q: "Set Bz to +5 nT (northward), then to −5 nT (southward). Watch the field lines and the particles. Which lets the solar wind in?", hint: "Northward: Earth's field lines stay closed (blue) and the particles drift round or are trapped; almost nothing reaches the poles. Southward: the fields cancel at a ring of null points and join up, so orange 'open' field lines appear, joining the polar regions to the solar wind; particles slide down them and the oval lights up. Aurora watchers check Bz first.", setup() { setSW(5, 450, 6); } },
    { title: "A storm pushes the aurora south", q: "Turn Bz from −2 nT down to −20 nT. Watch the boundary between orange (open) and blue (closed) field lines on the globe, and the 'open–closed boundary' readout. Where would people in the UK need to be to see the aurora in each case?", hint: "Stronger southward Bz opens more of Earth's field, so the polar cap and the auroral oval grow towards the equator: from about 76° to 69° magnetic latitude in this model. In real storms the oval reaches 50–55° and the aurora is seen across the UK (Britain is at about 52–58° magnetic latitude). The real oval sits a few degrees nearer the equator than this simple model's boundary.", setup() { setSW(-2, 450, 6); } },
    { title: "Kp: the aurora forecast", q: "Watch the Kp readout as you change Bz, the wind speed and the density. Which matters most? What Kp would bring the aurora to your town?", hint: "Southward Bz and speed matter most (Kp rises with v^(4/3)|Bz|^(2/3) for southward fields); density matters much less. Kp 5 or more is a geomagnetic storm; northern Scotland often sees aurora at Kp 5, southern England needs about Kp 7–8. Kp here comes from a fitted formula (Newell 2008), not from the model.", setup() { setSW(-5, 450, 6); } },
    { title: "Spiralling down field lines", q: "Zoom in on one hemisphere. Do the particles head straight for Earth? Where do they land: equator, mid-latitudes or near the poles?", hint: "They follow field lines (the spiral shows they are gyrating round them; it is drawn much bigger than real gyration, which is metres to kilometres). Charged particles can slide along a field line easily but hardly across it, so they can only reach the atmosphere where field lines connect to the solar wind: near the magnetic poles. That is why aurora happen at high latitudes, and in both hemispheres at once.", setup() { setSW(-8, 500, 6); cam.dist = 18; } },
    { title: "Why green and red?", q: "Look closely at the aurora on the night side. Why is most aurora green, with red at the top?", hint: "Incoming electrons excite oxygen atoms. At 100–200 km oxygen gives out green light (557.7 nm); higher up, where the air is thin, oxygen has time to give out red light (630 nm) before collisions take its energy. Nitrogen gives blue and purple at the bottom edge. The picture shows this layering in a simple way.", setup() { setSW(-12, 600, 10); cam.yaw = 2.4; cam.pitch = 0.6; cam.dist = 12; } }
  ],
  batch: [
    { title: "Where is the open–closed boundary?", question: "At what magnetic latitude does the boundary between open and closed field lines reach the ground, for southward Bz?", how: "Each run traces field lines outwards from footpoints at different latitudes (a random longitude) and finds by halving where they stop returning to Earth.", xLabel: "Bz (nT, southward is negative)", yLabel: "boundary magnetic latitude (°)", xs: [-1, -2, -5, -10, -15, -20, -30, -40], reps: 2, theory: theoryLat, theoryLabel: "cos²λ = 1.5(|Bz|/B_E)^⅓", run: (x, r) => tracedLat(x), note: "The traced boundary matches the formula to within about 0.2° (the step size of the tracing). Stronger southward fields open more flux, so the boundary, and the aurora just poleward of it, move towards the equator: about 77° at −1 nT, 69° at −20 nT. Every longitude gives the same answer because this simple field is the same all round the axis." },
    { title: "How much gets in?", question: "What fraction of solar-wind particles arriving at the magnetosphere end up in the atmosphere, for different Bz?", how: "Each run: 300 particles start 18 Earth radii sunward at random positions; each is followed for up to an hour. The result is the fraction that reach 1.5 Earth radii (and would precipitate).", xLabel: "Bz (nT)", yLabel: "fraction precipitating", xs: [-20, -10, -5, -2, 2, 5, 10], reps: 3, yMin: 0, run: (x, r) => runParticles(x, 450, r).frac, note: "With northward Bz no particles get in: every field line near Earth is closed and shielded. With southward Bz a large share (about 25–45% here) slide down open field lines. Runs vary because the particles start at random places and with random speeds along the field." },
    { title: "Faster wind, more aurora?", question: "How many particles precipitate per minute as the solar wind speed rises (Bz = −5 nT, 6 particles per cm³)?", how: "Each run: the fraction precipitating is found as above, then multiplied by the number of particles the wind brings to the front of the magnetosphere per minute, which is proportional to density × speed (shown in arbitrary units).", xLabel: "solar wind speed (km/s)", yLabel: "particles precipitating per minute (arbitrary units)", xs: [300, 400, 500, 600, 700, 800, 900], reps: 3, yMin: 0, fit: true, run: (x, r) => runParticles(-5, x, r).frac * 6 * x / 100, note: "In this model the fraction that gets in does not depend on speed (the drift and the sliding both scale with it), so the precipitation rate simply rises in proportion to the flux of particles arriving: a faster wind brings more. Real aurora also brighten because faster wind particles carry more energy each, and because reconnection runs faster." },
    { title: "Where do they land?", question: "At what magnetic latitude, on average, do the precipitating particles reach the atmosphere?", how: "Each run: 300 particles as above; the result is the mean magnetic latitude (north or south) of those that precipitate.", xLabel: "Bz (nT)", yLabel: "mean magnetic latitude of precipitation (°)", xs: [-20, -15, -10, -5, -2], reps: 3, theory: theoryLat, theoryLabel: "open–closed boundary", run: (x, r) => runParticles(x, 450, r).lat, note: "Particles land on open field lines, so always poleward of the open–closed boundary (the theory line), a few degrees inside the polar cap. Both move towards the equator as southward Bz strengthens. In the real magnetosphere the brightest aurora are at the boundary itself, fed by particles from the magnetotail, which this model leaves out." }
  ],
  notes: `<h3>What is being modelled</h3>
<ul><li><b>The field:</b> Earth's dipole (31 000 nT at the equator, pointing south) plus a uniform interplanetary field Bz carried by the solar wind (Dungey's 1961 "open magnetosphere", the simplest model with reconnection). The field-line colours show its topology: <span style="color:#6aa8ff">closed</span> (both ends on Earth), <span style="color:#ffaa55">open</span> (one end on Earth), grey (solar wind only).</li>
<li><b>The open–closed boundary</b> reaches the ground at cos²λ = 1.5(|Bz|/B_E)^⅓ for southward Bz (from the field's flux function); for northward Bz only tiny patches near the poles are open.</li>
<li><b>Particles</b> are solar-wind ions followed as guiding centres: they slide along their field line (random thermal speed up to ±0.6 of the wind speed) and drift with the solar wind's electric field E = −v × B (E×B/B²) while their field line is connected to the solar wind. On closed field lines they are trapped. A particle reaching 1.5 Earth radii is counted as precipitating. The spiral drawn round each path is the gyration, hugely exaggerated.</li>
<li><b>The aurora</b> on the globe glows where particles have recently precipitated (green below, red above), on the night side.</li>
<li><b>Kp</b> comes from Newell et al.'s (2008) approximate fit to observations: Kp ≈ 0.05 + 2.244×10⁻⁴ dΦ/dt + 2.844×10⁻⁶ √n v², with dΦ/dt = v^(4/3) B^(2/3) sin^(8/3)(θ/2). It is a guide, not part of the model.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>There is no magnetopause, bow shock or magnetotail: the real solar wind squashes the dayside field and stretches the nightside into a long tail, and those currents shape the field. Here the null points sit about 15–25 Earth radii out instead of 10.</li>
<li>The real aurora is fed mainly from the magnetotail, where open field lines reconnect again (the Dungey cycle), and electrons are accelerated just above the atmosphere. This model has no tail, so its precipitation lands inside the polar cap rather than in the oval itself.</li>
<li>No mirror force, no pitch angles, no ring current or radiation belts; Earth's dipole is upright (no tilt, no seasons) and the Earth is stylised.</li>
<li>Times are in real seconds but the picture runs many times faster; particles are a few thousand, not 10²⁸.</li></ul>
<p>See also <a href="../magnetism_induction/magnetism-induction.html">Magnetism and Electromagnetic Induction</a> (magnetic fields and forces on moving charges) and <a href="../../astrophysics/stellar_life_cycle/stellar-life-cycle.html">Stellar Life Cycle</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("The solar wind");
ctl.bz = K.slider(g, { label: "IMF Bz", min: -30, max: 10, step: 0.5, value: bz, fmt: v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + " nT" + (v < 0 ? " (south)" : v > 0 ? " (north)" : ""), on: v => { if (v === 0) v = 0.5; bz = v; retopo(); } });
ctl.v = K.slider(g, { label: "Speed", min: 250, max: 900, step: 10, value: vsw, fmt: v => v + " km/s", on: v => vsw = v });
ctl.n = K.slider(g, { label: "Density", min: 1, max: 40, step: 1, value: dens, fmt: v => v + " particles per cm³", on: v => dens = v });
let r1 = K.row(g); [["Quiet (north)", 3, 350, 4], ["Typical", -3, 420, 6], ["Storm", -15, 650, 15], ["Superstorm", -30, 900, 30]].forEach(([n, a, s, d]) => K.btn(r1, n, () => setSW(a, s, d), "small"));
g = ui.group("Show");
ctl.parts = K.slider(g, { label: "Particles", min: 200, max: 3000, step: 100, value: nPart, on: v => { nPart = v; } });
ctl.speed = K.slider(g, { label: "Speed (× real time)", min: 10, max: 300, step: 10, value: speed, fmt: v => "× " + v, on: v => speed = v }); ui.headerSpeed(ctl.speed, { label: "Speed" });
ctl.lines = K.toggle(g, { label: "Field lines", value: true, on: v => showLines = v });
ctl.showP = K.toggle(g, { label: "Particles", value: true, on: v => showParts = v });
r1 = K.row(g); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("aurora", view, cv));
K.note(g, "Drag to turn the view, scroll to zoom. The Sun is off to the right of the Earth, where the wind comes from.");
const read = K.readout(g, [["kp", "Kp (forecast index)"], ["lat", "open–closed boundary"], ["rate", "precipitating per minute"], ["ovl", "where they land"]]);
function setSW(a, s, d) { bz = a; vsw = s; dens = d; ctl.bz.set(a); ctl.v.set(s); ctl.n.set(d); retopo(); }
let topoT = 0; function retopo() { clearTimeout(topoT); topoT = setTimeout(() => { topo = topology(bz); lineGeo = null; latHits = []; }, 120); }

// ---------------- Field lines (traced on the CPU, drawn by the card) ----------------
function traceLine(x, y, z, s, maxR) { const pts = [[x, y, z]]; for (let k = 0; k < 2500; k++) { field(x, y, z, bz, b); const B = Math.hypot(b[0], b[1], b[2]) || 1e-9, r = Math.hypot(x, y, z), ds = 0.06 * Math.max(1, r * 0.5); x += s * ds * b[0] / B; y += s * ds * b[1] / B; z += s * ds * b[2] / B; const rr = Math.hypot(x, y, z); pts.push([x, y, z]); if (rr < 1 || rr > maxR) break; } return pts; }
function buildLines() {
  const P = [], C = [], add = (pts, col) => { for (let i = 1; i < pts.length; i++) { P.push(...pts[i - 1], ...pts[i]); C.push(...col, ...col); } };
  const cols = [[0.42, 0.66, 1, 0.55], [1, 0.67, 0.33, 0.75], [0.6, 0.62, 0.68, 0.3]];
  for (let k = 0; k < 8; k++) { const lon = k * Math.PI / 4;
    for (const latD of [40, 50, 58, 64, 68, 72, 75, 78, 81, 85]) for (const hem of [1, -1]) { const lat = latD * Math.PI / 180 * hem, x = Math.cos(lat) * Math.cos(lon), y = Math.cos(lat) * Math.sin(lon), z = Math.sin(lat);
      const pts = traceLine(x * 1.001, y * 1.001, z * 1.001, hem > 0 ? -1 : 1, 40), last = pts[pts.length - 1], open = Math.hypot(...last) > 2; add(pts, open ? cols[1] : cols[0]); } }
  for (let k = 0; k < 10; k++) { const zz = -30 + k * 6.6; for (const xx of [26, -26]) add(traceLine(xx, 0, zz, 1, 40).concat(), cols[2]); }   // a few solar-wind lines
  return { P: new Float32Array(P), C: new Float32Array(C) };
}

// ---------------- The graphics card ----------------
const view = K.gl.create(ui.stage, { dprMax: 1.5 });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, prBg, prLine, prPt, lines, pts, auroraT, auroraData = new Float32Array(4 * 180 * 90), aur = new Float32Array(180 * 90);
const VS3 = `uniform mat4 uVP; vec4 proj(vec3 p) { return uVP * vec4(p, 1.0); }`;
if (ok) {
  quad = K.gl.quad(gl); auroraT = K.gl.target(gl, 180, 90, { float: true, filter: "linear" });
  // the background and the Earth: each pixel casts a ray from the camera and checks whether it hits the globe or the aurora shell
  prBg = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform vec3 uEye, uFwd, uRight, uUp; uniform float uF, uAsp; uniform sampler2D uAur;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    float noise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float n = i.x + i.y * 57.0 + 113.0 * i.z;
      vec4 a = fract(sin(vec4(n, n + 1.0, n + 57.0, n + 58.0)) * 43758.5453), c = fract(sin(vec4(n + 113.0, n + 114.0, n + 170.0, n + 171.0)) * 43758.5453);
      vec4 m = mix(a, c, f.z); return mix(mix(m.x, m.y, f.x), mix(m.z, m.w, f.x), f.y); }
    vec2 hitSphere(vec3 o, vec3 d, float R) { float bq = dot(o, d), c = dot(o, o) - R * R, h = bq * bq - c; if (h < 0.0) return vec2(-1.0); h = sqrt(h); return vec2(-bq - h, -bq + h); }
    vec3 aurora(vec3 p) { float lat = asin(clamp(p.z / length(p), -1.0, 1.0)), lon = atan(p.y, p.x); return texture2D(uAur, vec2(lon / 6.2832 + 0.5, lat / 3.14159 + 0.5)).rgb; }
    void main() {
      vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0) * 2.0; vec3 d = normalize(uFwd * uF + uRight * q.x + uUp * q.y), sun = vec3(1.0, 0.0, 0.0);
      vec3 col = vec3(0.004, 0.006, 0.016) + vec3(0.7) * step(0.9985, hash(floor(d.xy * 400.0 + d.z * 97.0))) * 0.6;   // stars
      col += vec3(1.0, 0.85, 0.5) * pow(max(0.0, dot(d, sun)), 600.0) * 2.0;                                          // the Sun, far to the right
      vec2 e = hitSphere(uEye, d, 1.0), a = hitSphere(uEye, d, 1.045);
      // the aurora: glow added where the ray passes through the thin shell 100–300 km up, on the night side
      if (a.x > 0.0) { float tEnd = e.x > 0.0 ? e.x : a.y; vec3 glow = vec3(0.0); for (int i = 0; i < 10; i++) { float t = mix(a.x, tEnd, (float(i) + 0.5) / 10.0); vec3 p = uEye + d * t; float h = (length(p) - 1.0) / 0.045, night = 0.3 + 0.7 * smoothstep(0.15, -0.25, dot(normalize(p), sun));
          vec3 A = aurora(p); glow += A.r * night * (vec3(0.25, 1.0, 0.45) * smoothstep(0.75, 0.15, h) + vec3(1.0, 0.25, 0.3) * smoothstep(0.35, 1.0, h) * 0.6); } col += glow * (tEnd - a.x) * 6.0; }
      if (e.x > 0.0) { vec3 p = uEye + d * e.x, n = normalize(p); float light = max(0.0, dot(n, sun));
        float land = smoothstep(0.52, 0.58, noise(n * 2.4) * 0.65 + noise(n * 6.0) * 0.35), ice = smoothstep(0.82, 0.9, abs(n.z));
        vec3 day = mix(mix(vec3(0.03, 0.12, 0.32), vec3(0.18, 0.32, 0.12), land), vec3(0.9), ice);
        vec3 night = mix(vec3(0.004, 0.007, 0.018), vec3(0.01, 0.01, 0.012), land) + vec3(1.0, 0.75, 0.4) * land * step(0.88, hash(floor(n.xy * 90.0 + n.z * 37.0))) * 0.25 * (1.0 - ice);
        vec3 base = mix(night, day, smoothstep(-0.05, 0.25, light)) + vec3(0.25, 0.45, 0.9) * pow(1.0 - max(0.0, dot(n, -d)), 3.0) * (0.1 + 0.5 * light);
        // where field lines touch down: the aurora glow seen from above
        float nightSide = 0.25 + 0.75 * smoothstep(0.15, -0.25, dot(n, sun)); base += aurora(n * 1.02).r * nightSide * vec3(0.3, 1.0, 0.5) * 0.9;
        col = base + col * 0.0 + (col - (vec3(0.004, 0.006, 0.016))) * step(e.x, -1.0); }
      gl_FragColor = vec4(col, 1.0);
    }`);
  prLine = K.gl.program(gl, `precision highp float; attribute vec3 aPos; attribute vec4 aCol; varying vec4 vCol; varying vec3 vP; ${VS3} void main() { gl_Position = proj(aPos); vCol = aCol; vP = aPos; }`, `precision highp float; varying vec4 vCol; varying vec3 vP; uniform vec3 uEye; bool hidden(vec3 p) { vec3 d = p - uEye; float L = length(d); d /= L; float b = dot(uEye, d), c = dot(uEye, uEye) - 1.0, h = b * b - c; if (h < 0.0) return false; float t = -b - sqrt(h); return t > 0.0 && t < L - 0.01; } void main() { if (hidden(vP)) discard; gl_FragColor = vCol; }`);   // a line behind the globe is not drawn
  prPt = K.gl.program(gl, `precision highp float; attribute vec3 aPos; attribute vec4 aCol; uniform float uSize; varying vec4 vCol; varying vec3 vP; ${VS3} void main() { gl_Position = proj(aPos); vCol = aCol; gl_PointSize = uSize; vP = aPos; }`,
    `precision highp float; varying vec4 vCol; varying vec3 vP; uniform vec3 uEye; bool hidden(vec3 p) { vec3 d = p - uEye; float L = length(d); d /= L; float b = dot(uEye, d), c = dot(uEye, uEye) - 1.0, h = b * b - c; if (h < 0.0) return false; float t = -b - sqrt(h); return t > 0.0 && t < L - 0.01; } void main() { if (hidden(vP)) discard; vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vCol.rgb, vCol.a * (1.0 - r)); }`);
  lines = K.gl.points(gl, { aPos: 3, aCol: 4 }); pts = K.gl.points(gl, { aPos: 3, aCol: 4 });
}
// camera: yaw about the z axis, pitch up, looking at Earth from distance dist
function camera() { const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const eye = [cam.dist * cp * cy, cam.dist * cp * sy, cam.dist * sp], fwd = [-cp * cy, -cp * sy, -sp], right = [sy, -cy, 0], up = [-sp * cy, -sp * sy, cp]; return { eye, fwd, right, up }; }
function viewProj(c, asp, f) { const { eye, fwd, right, up } = c, n = 0.05, fr = 200, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // column-major 4×4: perspective(f) × look-at
  const V = [right[0], up[0], -fwd[0], 0, right[1], up[1], -fwd[1], 0, right[2], up[2], -fwd[2], 0, -dot(right, eye), -dot(up, eye), dot(fwd, eye), 1];
  const Pm = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0], M = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += Pm[k * 4 + i] * V[j * 4 + k]; M[j * 4 + i] = s; } return M; }
let grab = null;
K.pointer(cv.el, { down(p) { grab = { x: p.x, y: p.y, yaw: cam.yaw, pitch: cam.pitch }; }, drag(p) { if (!grab) return; cam.yaw = grab.yaw - (p.x - grab.x) * 0.008; cam.pitch = K.clamp(grab.pitch + (p.y - grab.y) * 0.008, -1.45, 1.45); }, up() { grab = null; } });
cv.el.addEventListener("wheel", e => { e.preventDefault(); cam.dist = K.clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 3, 80); }, { passive: false });

// ---------------- Simulation ----------------
function stepParticles(dtReal) {
  while (parts.length < nPart) parts.push(new Particle(Math.random, vsw)); if (parts.length > nPart) parts.length = nPart;
  const budget = dtReal * speed;   // seconds of model time this frame
  for (const p of parts) {
    if (p.state !== 0) { if (p.state === 1) { hits++; latHits.push(Math.abs(p.lat) * 180 / Math.PI); const i = Math.min(179, Math.max(0, ((p.lon / (2 * Math.PI) + 0.5) * 180) | 0)), j = Math.min(89, Math.max(0, ((p.lat / Math.PI + 0.5) * 90) | 0)); for (let dj = -1; dj <= 1; dj++) for (let di = -8; di <= 8; di++) { const jj = j + dj; if (jj >= 0 && jj < 90) aur[(i + di + 180) % 180 + jj * 180] += 1.2 * Math.exp(-(di * di) / 30 - dj * dj); } } p.reset(Math.random, vsw); continue; }
    let t = 0; while (t < budget && p.state === 0) t += p.step(bz, vsw, topo, budget);
    if (p.trail.length > 24) p.trail.shift(); p.trail.push([p.x, p.y, p.z]);
  }
  for (let i = 0; i < aur.length; i++) aur[i] *= Math.pow(0.5, dtReal / 3);   // the glow fades (half every 3 s of screen time)
  if (latHits.length > 3000) latHits.splice(0, latHits.length - 3000);
}
function draw() {
  const c = cv.ctx; c.clearRect(0, 0, cv.w, cv.h); if (!ok) return; const camv = camera(), asp = cv.w / cv.h, f = 1.6, VP = viewProj(camv, asp, f);
  K.gl.bindTarget(gl, null); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  for (let i = 0; i < aur.length; i++) auroraData[4 * i] = Math.min(4, aur[i]); auroraT.upload(auroraData);
  prBg.set({ uEye: camv.eye, uFwd: camv.fwd, uRight: camv.right, uUp: camv.up, uF: f, uAsp: asp, uAur: auroraT }); quad.draw(prBg);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  if (showLines) { if (!lineGeo) { lineGeo = buildLines(); lines.set("aPos", lineGeo.P).set("aCol", lineGeo.C); } prLine.set({ uVP: VP, uEye: camv.eye }); lines.draw(prLine, lineGeo.P.length / 3, gl.LINES); }
  if (showParts) {   // particles, with a short spiral trail (the gyration, exaggerated)
    const P = [], C = []; const tnow = performance.now() / 1000;
    for (const p of parts) { const n = p.trail.length; for (let i = 0; i < n; i++) { const q = p.trail[i], ph = p.ph + i * 0.9 + tnow * 3, rr = 0.12; P.push(q[0] + rr * Math.cos(ph) * 0.7, q[1] + rr * Math.sin(ph), q[2] + rr * Math.cos(ph) * 0.7); const a = (i + 1) / n; C.push(1, 0.85, 0.55, 0.35 * a); } }
    pts.set("aPos", new Float32Array(P)).set("aCol", new Float32Array(C)); prPt.set({ uVP: VP, uEye: camv.eye, uSize: 2.5 * view.dpr }); pts.draw(prPt, P.length / 3);
  }
  gl.disable(gl.BLEND);
  c.font = "600 12px Segoe UI,system-ui,sans-serif"; c.fillStyle = "rgba(255,220,150,.9)"; c.textAlign = "right"; c.fillText("to the Sun ⟶  (solar wind comes from here)", cv.w - 14, cv.h - 14);
}
const chR = K.chart(ui.dock, { title: "Particles precipitating", xLabel: "time (minutes)", yLabel: "per minute", yMin: 0 });
const chL = K.chart(ui.dock, { title: "Where they land", xLabel: "magnetic latitude (°)", yLabel: "particles", yMin: 0 });

// ---------------- The loop ----------------
let simT = 0, lastHits = 0, fr = 0;
ui.run(dt => { stepParticles(dt); simT += dt * speed; }, () => {
  draw(); if (fr++ % 15) return;
  const rate = (hits - lastHits) / (15 / 60 * speed / 60); lastHits = hits; hitLog.push([simT / 60, rate]); if (hitLog.length > 300) hitLog.shift();
  chR.draw([{ pts: hitLog, color: K.cssVar("--s1") }], {});
  const h = K.histogram(latHits.length ? latHits : [0], 25, 60, 90), th = theoryLat(bz);
  chL.draw([{ pts: h.pts, w: h.w, type: "bars", color: K.cssVar("--s2") }], { xMin: 60, xMax: 90, vlines: isFinite(th) ? [{ x: th, color: K.cssVar("--s0"), label: "open–closed boundary" }] : [] });
  const kp = kpIndex(bz, vsw, dens); read.set("kp", kp.toFixed(1) + (kp >= 5 ? " (storm)" : ""));
  read.set("lat", isFinite(th) ? th.toFixed(1) + "° magnetic latitude" : "only tiny patches near the poles are open");
  read.set("rate", rate.toFixed(0)); read.set("ovl", latHits.length ? (latHits.reduce((s, v) => s + v, 0) / latHits.length).toFixed(1) + "° (mean)" : "–");
  ui.hud(`<b style="font-size:15px">Bz ${bz > 0 ? "+" : "−"}${Math.abs(bz)} nT · ${vsw} km/s</b><br>Kp ${kp.toFixed(1)}${kp >= 5 ? " · geomagnetic storm" : ""}`);
});
window.aurTest = { setSW, run(sec) { for (let k = 0; k < sec * 30; k++) stepParticles(1 / 30); return hits; }, cam };
ui.tip("Orange field lines are open: they join the poles to the solar wind, and particles slide down them · try turning Bz south", 8000);
}
