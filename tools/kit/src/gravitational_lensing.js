/* =====================================================================
   BLACK HOLES AND GRAVITATIONAL LENSING
   Mass bends light. This page follows that one idea from its gentlest
   form to its most extreme, in four views:

     1. BLACK HOLE   light rays are traced backwards from every pixel of
                     the screen through the curved space around a
                     non-spinning (Schwarzschild) black hole. The picture
                     is whatever those rays end up hitting: the glowing
                     disc of gas, the starry sky, or the hole itself.
     2. LENSED SKY   far from the mass the bending is tiny, and one
                     equation does the whole job (the lens equation):
                         β = θ − α(θ)
                     "light seen arriving from direction θ really set
                     out from direction β". This makes Einstein rings,
                     arcs and crosses.
     3. MICROLENSING a star (perhaps with a planet) drifts in front of
                     a distant star and briefly magnifies it.
     4. ECLIPSE 1919 Eddington's test: do stars beside the Sun shift by
                     Einstein's 1.75 arcseconds, or Newton's 0.87?

   Lengths near the black hole are in units of its Schwarzschild radius
   r_s = 2GM/c² (the size of the event horizon).
   The two picture views are drawn by the graphics card (a WebGL
   "shader": a tiny program run once for every pixel).
   ===================================================================== */

// ---------------- 1. Physics that runs on the processor (used by the charts and the batch runs) ----------------
const G = 6.674e-11, C = 2.998e8, MSUN = 1.989e30, PC = 3.086e16, AU = 1.496e11, ARCSEC = Math.PI / 648000;

/* One photon passing a black hole. In the plane of its path, with u = r_s / r and φ the angle swept,
   general relativity gives      d²u/dφ² = −u + 1.5 u²
   The "−u" alone would be a straight line; the extra 1.5u² is the bending.
   b is the impact parameter: how far from the hole the photon was aimed (in r_s).
   Returns whether it was captured, how far it was turned (radians) and the path. */
function shoot(b, wantPath) {
  let u = 0, w = 1 / b, phi = 0; const h = 0.004, f = x => -x + 1.5 * x * x, path = [];
  for (let i = 0; i < 20000; i++) {
    // Runge–Kutta step (4th order) for the pair (u, w = du/dφ)
    const k1u = w, k1w = f(u), k2u = w + h / 2 * k1w, k2w = f(u + h / 2 * k1u), k3u = w + h / 2 * k2w, k3w = f(u + h / 2 * k2u), k4u = w + h * k3w, k4w = f(u + h * k3u);
    u += h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u); w += h / 6 * (k1w + 2 * k2w + 2 * k3w + k4w); phi += h;
    if (wantPath && i % 6 === 0 && u > 0.02) path.push([-Math.cos(phi) / u, Math.sin(phi) / u]);
    if (u >= 1) return { captured: true, turn: Infinity, path };            // crossed the event horizon
    if (u <= 0) return { captured: false, turn: phi - Math.PI, path };      // back out to infinity: a straight line would have swept exactly π
  }
  return { captured: true, turn: Infinity, path };
}
const BCRIT = Math.sqrt(27) / 2;   // photons aimed closer than 2.598 r_s are captured: this sets the size of the shadow

// Distances in an expanding universe (flat, H0 = 70 km/s/Mpc, 30% matter, 70% dark energy). Returns metres.
function comoving(z) { let s = 0; const n = 200; for (let i = 0; i < n; i++) { const x = (i + .5) * z / n; s += 1 / Math.sqrt(0.3 * (1 + x) ** 3 + 0.7); } return s * z / n * C / 70e3 * 1e6 * PC; }
function distances(zl, zs) { const cl = comoving(zl), cs = comoving(zs); return { Dl: cl / (1 + zl), Ds: cs / (1 + zs), Dls: (cs - cl) / (1 + zs) }; }
// Einstein radius (arcseconds) of mass M (solar masses): the size of the ring when source, lens and observer line up
function einsteinArcsec(M, zl, zs) { const d = distances(zl, zs); return Math.sqrt(4 * G * M * MSUN / (C * C) * d.Dls / (d.Dl * d.Ds)) / ARCSEC; }

// The four lens models, as bending angle α at position (x, y). Everything is in units of the Einstein radius.
const MEMBERS = [[0.55, 0.2], [-0.4, 0.5], [-0.6, -0.35], [0.3, -0.6]];   // galaxies inside the cluster
function alpha(kind, x, y, shear) {
  const r2 = x * x + y * y + 1e-9, r = Math.sqrt(r2);
  if (kind === 0) return [x / r2, y / r2];                                 // all the mass at a point: α ∝ 1/θ
  if (kind === 1) return [x / r, y / r];                                   // galaxy in a dark-matter halo: α is the same size everywhere
  if (kind === 2) return [x / r + shear * x, y / r - shear * y];           // the same, squashed: gives four images
  const s = 1.25 / (0.25 + Math.sqrt(r2 + 0.0625)); let ax = x * s, ay = y * s; // cluster: smooth halo with a soft centre…
  for (const [mx, my] of MEMBERS) { const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy) + 1e-6; ax += 0.08 * dx / d; ay += 0.08 * dy / d; } // …plus lumps
  return [ax, ay];
}
const paczynski = u => (u * u + 2) / (u * Math.sqrt(u * u + 4));          // magnification by a single point lens, source u Einstein radii off-axis

/* Star + planet lens. Positions are complex numbers z = x + iy in Einstein radii. The lens equation
   ζ = z − m1/(z̄ − z1) − m2/(z̄ − z2) becomes a 5th-order polynomial in z; its roots are the images. */
function pmul(a, b) { const na = a.length / 2, nb = b.length / 2, r = new Float64Array(2 * (na + nb - 1)); for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) { r[2 * (i + j)] += a[2 * i] * b[2 * j] - a[2 * i + 1] * b[2 * j + 1]; r[2 * (i + j) + 1] += a[2 * i] * b[2 * j + 1] + a[2 * i + 1] * b[2 * j]; } return r; }
function padd(a, b, sb) { const n = Math.max(a.length, b.length), r = new Float64Array(n); for (let i = 0; i < a.length; i++) r[i] += a[i]; for (let i = 0; i < b.length; i++) r[i] += sb * b[i]; return r; }
function pscale(a, re, im) { const r = new Float64Array(a.length); for (let i = 0; i < a.length; i += 2) { r[i] = a[i] * re - a[i + 1] * im; r[i + 1] = a[i] * im + a[i + 1] * re; } return r; }
function roots(c) {               // Durand–Kerner iteration: improves all the roots together
  const n = c.length / 2 - 1, lr = c[2 * n], li = c[2 * n + 1], l2 = lr * lr + li * li, a = new Float64Array(2 * (n + 1));
  for (let k = 0; k <= n; k++) { a[2 * k] = (c[2 * k] * lr + c[2 * k + 1] * li) / l2; a[2 * k + 1] = (c[2 * k + 1] * lr - c[2 * k] * li) / l2; }
  const zr = new Float64Array(n), zi = new Float64Array(n);
  for (let k = 0; k < n; k++) { const ang = 2 * Math.PI * k / n + 0.4; zr[k] = 1.3 * Math.cos(ang); zi[k] = 1.3 * Math.sin(ang); }
  for (let it = 0; it < 300; it++) {
    let maxd = 0;
    for (let k = 0; k < n; k++) {
      let pr = 1, pi = 0; for (let j = n - 1; j >= 0; j--) { const tr = pr * zr[k] - pi * zi[k] + a[2 * j], ti = pr * zi[k] + pi * zr[k] + a[2 * j + 1]; pr = tr; pi = ti; }
      let dr = 1, di = 0; for (let j = 0; j < n; j++) if (j !== k) { const xr = zr[k] - zr[j], xi = zi[k] - zi[j], tr = dr * xr - di * xi; di = dr * xi + di * xr; dr = tr; }
      const dd = dr * dr + di * di; if (dd === 0) { zr[k] += 1e-6; continue; }
      const qr = (pr * dr + pi * di) / dd, qi = (pi * dr - pr * di) / dd; zr[k] -= qr; zi[k] -= qi; maxd = Math.max(maxd, Math.abs(qr) + Math.abs(qi));
    }
    if (maxd < 1e-12) break;
  }
  return [zr, zi];
}
// q = planet mass / star mass, s = their separation. Star and planet sit on the x axis with their centre of mass at 0.
function binaryGeom(q, s) { const m1 = 1 / (1 + q), m2 = q / (1 + q); return { m1, m2, z1: -s * m2, z2: s * m1 }; }
function binaryImages(B, zx, zy) {   // images [x, y, magnification] of a point source at (zx, zy), and their total brightness A
  const { m1, m2, z1, z2 } = B, l1 = new Float64Array([-z1, 0, 1, 0]), l2 = new Float64Array([-z2, 0, 1, 0]), Dp = pmul(l1, l2);
  const N = padd(padd(pscale(Dp, zx, -zy), pscale(l2, m1, 0), 1), pscale(l1, m2, 0), 1), P1 = padd(N, pscale(Dp, z1, 0), -1), P2 = padd(N, pscale(Dp, z2, 0), -1);
  const poly = padd(padd(pmul(pmul(new Float64Array([-zx, -zy, 1, 0]), P1), P2), pscale(pmul(Dp, P2), m1, 0), -1), pscale(pmul(Dp, P1), m2, 0), -1);
  const [zr, zi] = roots(poly); let A = 0; const imgs = [];
  for (let k = 0; k < zr.length; k++) {
    const x = zr[k], y = zi[k], d1r = x - z1, d1i = -y, d2r = x - z2, d2i = -y, n1 = d1r * d1r + d1i * d1i, n2 = d2r * d2r + d2i * d2i;
    const ex = x - (m1 * d1r / n1 + m2 * d2r / n2), ey = y + (m1 * d1i / n1 + m2 * d2i / n2);
    if (Math.hypot(ex - zx, ey - zy) > 1e-5) continue;       // the polynomial has some false roots: keep only real images
    const wr = m1 * (d1r * d1r - d1i * d1i) / (n1 * n1) + m2 * (d2r * d2r - d2i * d2i) / (n2 * n2), wi = -2 * m1 * d1r * d1i / (n1 * n1) - 2 * m2 * d2r * d2i / (n2 * n2);
    const mu = 1 / (1 - (wr * wr + wi * wi)); A += Math.abs(mu); imgs.push([x, y, mu]);
  }
  return { A, imgs };
}
// A whole microlensing event: brightness against time (in Einstein-crossing times) with and without the planet
function lightCurve(q, s, u0, angle, n) {
  const B = binaryGeom(q, s), ca = Math.cos(angle), sa = Math.sin(angle), out = [];
  for (let i = 0; i < n; i++) {
    const t = -2 + 4 * i / (n - 1), x = t * ca - u0 * sa, y = t * sa + u0 * ca;
    const single = paczynski(Math.hypot(x - B.z1, y) / Math.sqrt(B.m1)); out.push([t, q > 0 ? binaryImages(B, x, y).A : single, single, x, y]);
  }
  return out;
}
// The planet counts as "found" if it changes the brightness by more than 5% for three measurements in a row
function planetFound(curve) { let run = 0; for (const p of curve) { if (Math.abs(p[1] - p[2]) / p[2] > 0.05) { if (++run >= 3) return true; } else run = 0; } return false; }

// Eddington's stars: position (solar radii from the Sun's centre) of the stars on the 1919 plates (made up, but typical)
const STARS = (() => { const r = K.rng(1919), a = []; for (let i = 0; i < 13; i++) { const b = 1.6 + 6.5 * Math.pow(r(), 1.3), an = r() * 6.283; a.push({ b, an, mag: 0.5 + r() }); } return a; })();
// Measure every star with random plate error, then find the best-fitting "deflection at the Sun's edge" assuming it falls as 1/b
function plates(rand, noise, law) {
  const pts = STARS.map(s => [s.b, law / s.b + rand.gauss() * noise]); let num = 0, den = 0;
  for (const [b, d] of pts) { num += d / b; den += 1 / (b * b); }
  return { pts, fit: num / den, err: noise / Math.sqrt(den) };
}

// ---------------- 2. The page ----------------
const S = {
  mode: "hole",
  // black hole view
  dist: 30, tilt: 8, yaw: 0, view: 14, disc: true, rout: 11, doppler: true, temp: 4.5, sky: 0, galOff: 0, rings: true, mass: 1, b: 4,
  // lensed sky view
  lens: 1, logM: 12, zl: 0.5, zs: 2, src: 0, sx: 0.25, sy: 0.1, size: 0.5, fov: 5, shear: 0.18, dark: true, lensLight: true, drift: false,
  // microlensing
  mStar: 0.3, planet: true, mPlanet: 1, sep: 1.25, u0: 0.12, ang: -15, noise: 2, t: -2,
  // eclipse
  law: 1.75, exag: 300, plateNoise: 0.25
};
let quality = "auto", time = 0, dirty = true, rand = K.rng(7);

const ui = K.app({
  title: "Black Holes and Gravitational Lensing", subject: "Astrophysics",
  blurb: "Mass bends light: from a 1.75″ nudge at the Sun to the shadow of a black hole",
  reset: () => { setMode(S.mode, true); },
  missions: [
    { title: "How big is the shadow?", q: "The event horizon has radius 1 r<sub>s</sub>. Is the black shadow you see the same size? Turn the gas disc off and compare the shadow with the dashed prediction rings.", hint: "The shadow is 2.6 r<sub>s</sub> in radius: over two and a half times bigger than the hole. Any light aimed closer than that is bent round and captured, so the hole casts a shadow much larger than itself. This is the shadow the Event Horizon Telescope photographed.", setup() { setMode("hole"); set({ disc: false, tilt: 8, dist: 30, view: 8, sky: 0, rings: true }); } },
    { title: "Seeing behind the hole", q: "Look at the disc nearly edge-on. A flat disc should look like a thin line. Why can you see an arch over the top of the hole, and another underneath?", hint: "The arch is the far side of the disc: light leaving its top face is bent over the hole towards you. The band underneath is the far side's <i>underneath</i>, bent round below. Drag upwards to look from above and watch the arch flatten into an ordinary ring.", setup() { setMode("hole"); set({ disc: true, tilt: 4, dist: 30, view: 14, sky: 0, doppler: true }); } },
    { title: "Why is one side brighter?", q: "The gas orbits at up to half the speed of light. One side of the disc is much brighter than the other. Which side is coming towards you? Switch 'Doppler and redshift' off to check.", hint: "Gas rushing towards you has its light squeezed to bluer, brighter colours and beamed forwards (brightness goes up as the 4th power of the shift). The receding side is dimmed and reddened. Look from directly above (tilt 90°): the asymmetry vanishes, because nothing is moving towards you.", setup() { setMode("hole"); set({ disc: true, tilt: 12, dist: 40, view: 14, doppler: true, sky: 0 }); } },
    { title: "From black hole to Einstein ring", q: "A galaxy sits exactly behind the hole, far away. Pull the camera back from 20 to 200 r<sub>s</sub>. What happens to the galaxy's image, and does the dashed ring predict it?", hint: "The galaxy is smeared into a ring: light passing on every side of the hole is bent towards you. The dashed ring is the simple weak-bending formula, radius √(2 r<sub>s</sub> × distance). It works well far out, where bending is small. That formula is all the 'Lensed sky' view uses.", setup() { setMode("hole"); set({ disc: false, tilt: 0, dist: 150, view: 40, sky: 2, galOff: 0, rings: true }); } },
    { title: "Rings, arcs and a cross", q: "Drag the background galaxy across the lens. When do you get two images, long arcs, or a full ring? Then switch the lens to 'Elliptical' with a quasar source: how many images now?", hint: "A full ring needs perfect alignment and a round lens. Just off-centre it breaks into two arcs; further out, one bright image and one faint one on the opposite side. A squashed lens cannot make a ring: it makes four images instead (an Einstein cross).", setup() { setMode("sky"); set({ lens: 1, src: 0, sx: 0.5, sy: 0.2, logM: 12, fov: 5, size: 0.5 }); } },
    { title: "Weigh the dark matter", q: "This cluster of galaxies bends the light of galaxies far behind it into arcs. Switch the dark matter off, leaving only the mass in stars and gas. What happens to the arcs?", hint: "The arcs shrink to almost nothing. The visible matter is only about 15% of what is needed to bend light this much, so lensing is one of the clearest pieces of evidence for dark matter. The radius of the arcs measures the total mass inside them.", setup() { setMode("sky"); set({ lens: 3, src: 2, sx: 0.3, sy: 0.2, logM: 14.8, zl: 0.3, zs: 2, fov: 70, dark: true }); } },
    { title: "Catch a planet", q: "A star drifts in front of a distant star and magnifies it. Its planet adds a brief extra blip. Change the planet's orbit size and the path. Where does the planet have to be to show up?", hint: "The background map shows how bright the far star would look at each position. The planet matters only where the map has sharp orange patches (caustics), and they are biggest when the planet is about one Einstein radius from its star. Elsewhere the light curve is indistinguishable from a star alone.", setup() { setMode("micro"); set({ planet: true, mPlanet: 1, sep: 1.25, u0: 0.12, ang: -15, noise: 2, t: -2 }); } },
    { title: "Einstein or Newton?", q: "It is 29 May 1919. Stars near the eclipsed Sun should be shifted outwards: by 1.75″ at the Sun's edge if Einstein is right, 0.87″ if Newton is. Take plates and decide. Is one set of plates enough?", hint: "The shifts are tiny compared with the blur of a photographic plate, so single stars prove little. The fitted value from all the stars together, with its uncertainty, is what counts: it should sit several uncertainties away from Newton. Raise the plate error to 0.5″ and the answer is no longer convincing.", setup() { setMode("eclipse"); set({ law: 1.75, exag: 300, plateNoise: 0.25 }); newPlates(); } }
  ],
  batch: [
    { title: "How much is light bent?", question: "Does the simple formula for light bending work close to a black hole?", how: "Fires one photon at each distance and follows it exactly.", xLabel: "aimed this far from the hole (r_s)", yLabel: "angle turned (degrees)", xs: [2.7, 2.8, 3, 3.3, 3.7, 4.2, 5, 6, 8, 10, 14, 20], reps: 1, yMin: 0, yMax: 200, theory: b => 2 / b * 180 / Math.PI, theoryLabel: "simple formula 2 r_s / b", run: b => shoot(b).turn * 180 / Math.PI, note: "No randomness here: every photon aimed the same way does the same thing. The dashed curve is Einstein's weak-bending formula (the one that gives 1.75″ at the Sun). Far out the two agree. Close in, the true bending is much bigger, and at 2.6 r<sub>s</sub> the photon circles the hole and never escapes." },
    { title: "Measure the shadow", question: "Fire 400 photons at random: how big a target is the black hole?", how: "Each run fires photons aimed up to 6 r_s from the centre and counts how many are swallowed.", xLabel: "", yLabel: "capture radius (r_s)", reps: 200, bins: 24, lo: 2.1, hi: 3.1, theory: BCRIT, theoryLabel: "√27/2", run(x, r) { let hit = 0; for (let i = 0; i < 400; i++) if (shoot(6 * Math.sqrt(r()) + 1e-3).captured) hit++; return 6 * Math.sqrt(hit / 400); }, note: "The hole swallows every photon aimed within 2.598 r<sub>s</sub>, so its 'target area' is far bigger than the horizon. With only 400 photons the count is a matter of chance, so each run gives a slightly different radius; the mean of many runs homes in on √27/2." },
    { title: "Einstein or Newton? (1919)", question: "Repeat Eddington's expedition 300 times. How often would the plates mislead?", how: "Each run measures 13 stars with 0.25″ plate error and fits the deflection at the Sun's edge.", xLabel: "", yLabel: "fitted deflection at the Sun's edge (arcsec)", reps: 300, bins: 30, lo: 0.6, hi: 2.9, theory: 1.75, theoryLabel: "Einstein", run: (x, r) => plates(r, 0.25, 1.75).fit, note: "Newton's prediction is 0.87″. Almost no expedition lands that low, so the result is convincing even though each star alone is hopelessly noisy. The real 1919 results were 1.98 ± 0.16″ (Sobral) and 1.61 ± 0.40″ (Príncipe)." },
    { title: "Weighing with light", question: "Is the Einstein radius proportional to √mass?", how: "For each mass, two images of a quasar are measured (with 0.03″ error) and the ring radius worked out.", xLabel: "lens mass (10¹¹ solar masses)", yLabel: "Einstein radius (arcsec)", xs: [1, 2, 4, 6, 9, 12, 16, 20], reps: 8, yMin: 0, theory: m => einsteinArcsec(m * 1e11, 0.5, 2), theoryLabel: "θ_E ∝ √M", run(m, r) { const tE = einsteinArcsec(m * 1e11, 0.5, 2), u = 0.2 + 0.6 * r(), a = (u + Math.sqrt(u * u + 4)) / 2 * tE + r.gauss() * 0.03, b = (Math.sqrt(u * u + 4) - u) / 2 * tE + r.gauss() * 0.03; return Math.sqrt(Math.abs(a * b)); }, note: "A point lens makes two images, at distances θ₊ and θ₋ on either side. Wherever the source is, θ₊ × θ₋ = θ_E², so two measured positions give the ring radius, and the ring radius gives the mass. Four times the mass gives twice the ring." },
    { title: "Microlensing peak", question: "Does a closer line-up give a brighter peak, as theory says?", how: "Each run is one event with 2% measurement error; the brightest measurement is recorded.", xLabel: "closest approach u₀ (Einstein radii)", yLabel: "peak magnification", xs: [0.1, 0.15, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 1], reps: 8, yMin: 0, theory: paczynski, theoryLabel: "A(u₀)", run(u0, r) { let m = 0; for (let i = 0; i < 81; i++) { const t = -2 + i / 20, a = paczynski(Math.hypot(t, u0)) * (1 + 0.02 * r.gauss()); if (a > m) m = a; } return m; }, note: "The points sit a little above the curve: taking the <i>biggest</i> of many noisy measurements picks out the luckiest one, a small systematic bias that more repeats will not remove." },
    { title: "Where must a planet be?", question: "How does the chance of spotting a Jupiter depend on its distance from its star?", how: "Each run is one event with a random path. Result is 1 if the planet changed the brightness by more than 5%, else 0.", xLabel: "planet–star separation (Einstein radii)", yLabel: "fraction of planets found", xs: [0.5, 0.65, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.8, 2.2], reps: 30, yMin: 0, yMax: 1, run: (s, r) => planetFound(lightCurve(0.003, s, 0.02 + 0.6 * r(), r() * 6.283, 240)) ? 1 : 0, note: "Each run is a yes or a no, so the dots sit at 0 and 1; the mean is the fraction found. It peaks near 1 Einstein radius (a few AU for a typical star): the 'lensing zone'. Microlensing therefore finds cool planets in wide orbits that other methods miss." }
  ],
  notes: `<h3>What is being modelled</h3>
<p><b>Black hole.</b> For every pixel a light ray is followed backwards from the camera through the Schwarzschild geometry (a non-spinning, uncharged black hole) in about 300 small steps, using the exact equation for the path of light, u″ = −u + 1.5u² with u = r<sub>s</sub>/r. Rays that reach the horizon are black. Rays that cross the plane of the disc between the innermost stable orbit (3 r<sub>s</sub>) and the outer edge pick up its glow. The rest carry on to the sky.</p>
<p><b>The disc.</b> Thin, flat, opaque, on circular orbits. Its temperature follows the standard thin-disc law, hottest just outside the inner edge. Each patch is shifted in colour and brightness by its orbital motion (Doppler) and by climbing out of the gravity well (gravitational redshift), using the exact formula for circular orbits; observed brightness scales as the 4th power of the shift.</p>
<p><b>Lensed sky.</b> The thin-lens equation β = θ − α(θ): all bending is taken to happen in one plane at the lens. Lens models: point mass (α ∝ 1/θ), a galaxy in an isothermal halo (constant α), the same with a sideways stretch, and a cluster with a soft core and four member galaxies. Distances use an expanding universe (H₀ = 70, Ω<sub>m</sub> = 0.3, Ω<sub>Λ</sub> = 0.7).</p>
<p><b>Microlensing.</b> Point lenses and a point source. Star plus planet is solved exactly (a 5th-order polynomial, Witt &amp; Mao 1995). The lens is 4 kpc away, the source 8 kpc, moving at 5 milliarcsec per year.</p>
<p><b>Eclipse.</b> Deflection 1.75″ × R<sub>☉</sub>/b (Einstein) or half that (Newton), with random plate error on each star.</p>
<h3>Simplifications</h3>
<ul><li>The black hole does not spin. Real ones do, which squashes the shadow slightly and drags the disc inwards.</li>
<li>The disc is infinitely thin with a painted-on texture; real discs are turbulent, thick near the hole and partly see-through. Its colours are for the eye: a real disc this hot glows mostly in X-rays.</li>
<li>The camera hovers at a fixed point. It is not orbiting or falling.</li>
<li>The "Elliptical" lens is a round galaxy plus a uniform stretch, not a true elliptical mass.</li>
<li>The cluster is a cartoon, not a fitted model of a real cluster, and "visible matter only" simply keeps 15% of the mass.</li>
<li>The lens's own light, dust and blurring by the atmosphere are left out. The star fields and galaxies are generated by the program, not real images.</li>
<li>Microlensing ignores the size of the source star, which in reality rounds off the sharpest spikes.</li></ul>`
});

// ---------------- 3. Controls ----------------
const ctl = {}, groups = {};
const g0 = ui.group("View");
ctl.mode = K.seg(g0, { value: "hole", options: [["hole", "Black hole"], ["sky", "Lensed sky"], ["micro", "Microlensing"], ["eclipse", "Eclipse 1919"]], on: v => setMode(v) });
const reg = (key, c) => { ctl[key] = c; return c; }, mark = () => { dirty = true; };
const sl = (g, key, o) => reg(key, K.slider(g, Object.assign({ value: S[key], on: v => { S[key] = v; mark(); o.then && o.then(v); } }, o)));
const tg = (g, key, label, then) => reg(key, K.toggle(g, { label, value: S[key], on: v => { S[key] = v; mark(); then && then(v); } }));

// --- black hole
let g = groups.hole = ui.group("Camera");
sl(g, "dist", { label: "Distance from the hole", min: 6, max: 200, step: 1, unit: "r<sub>s</sub>" });
sl(g, "tilt", { label: "Height above the disc", min: -90, max: 90, step: 1, unit: "°", tip: "Or drag the picture" });
sl(g, "view", { label: "Width of view", min: 4, max: 60, step: 1, fmt: v => "±" + v + " r<sub>s</sub>" });
let g2 = groups.hole2 = ui.group("The scene");
tg(g2, "disc", "Glowing gas disc"); tg(g2, "doppler", "Doppler and redshift"); tg(g2, "rings", "Show prediction rings");
sl(g2, "rout", { label: "Disc outer edge", min: 5, max: 25, step: 1, unit: "r<sub>s</sub>" });
sl(g2, "temp", { label: "Disc colour temperature", min: 3, max: 20, step: 0.5, fmt: v => v * 1000 + " K" });
reg("sky", K.seg(g2, { label: "Behind the hole", value: 0, options: [[0, "Stars"], [1, "Grid"], [2, "A galaxy"]], on: v => { S.sky = v; mark(); } }));
sl(g2, "galOff", { label: "Galaxy off-centre by", min: 0, max: 0.3, step: 0.005, fmt: v => (v * 57.3).toFixed(1) + "°" });
reg("mass", K.seg(g2, { label: "Which black hole?", value: 1, options: [[0, "10 M☉"], [1, "Sgr A*"], [2, "M87*"]], on: v => { S.mass = v; } }));
let g3 = groups.hole3 = ui.group("Fire a single photon");
sl(g3, "b", { label: "Aimed this far from the centre", min: 0.5, max: 12, step: 0.05, unit: "r<sub>s</sub>", then: drawPaths });
const readH = K.readout(g3, [["turn", "turned through"], ["fate", "fate"], ["rs", "r<sub>s</sub> of this hole"], ["shadow", "shadow seen from Earth"]]);
// --- lensed sky
g = groups.sky = ui.group("The lens");
reg("lens", K.seg(g, { value: 1, options: [[0, "Point", "A compact mass: a star or black hole"], [1, "Galaxy", "A round galaxy in its dark-matter halo"], [2, "Elliptical", "A squashed galaxy: makes four images"], [3, "Cluster", "A cluster of galaxies with lumps"]], on: v => { S.lens = v; mark(); magLog = []; } }));
sl(g, "logM", { label: "Mass inside the ring", min: 9, max: 15.5, step: 0.05, fmt: v => K.sig(Math.pow(10, v - Math.floor(v)), 2) + " × 10<sup>" + Math.floor(v) + "</sup> M☉" });
sl(g, "zl", { label: "Lens redshift", min: 0.05, max: 1.5, step: 0.05, then: v => { if (S.zs < v + 0.1) ctl.zs.set(v + 0.1, true); } });
sl(g, "zs", { label: "Source redshift", min: 0.2, max: 5, step: 0.05, then: v => { if (v < S.zl + 0.1) ctl.zl.set(Math.max(0.05, v - 0.1), true); } });
sl(g, "shear", { label: "Squash (elliptical only)", min: 0, max: 0.4, step: 0.01 });
tg(g, "dark", "Dark matter (cluster only)"); tg(g, "lensLight", "Show the lens's own light");
g2 = groups.sky2 = ui.group("The background source");
reg("src", K.seg(g2, { value: 0, options: [[0, "Galaxy"], [1, "Grid"], [2, "Deep field"], [3, "Quasar"]], on: v => { S.src = v; mark(); magLog = []; } }));
sl(g2, "size", { label: "Source size", min: 0.1, max: 1.5, step: 0.05, unit: "θ<sub>E</sub>", then: () => magLog = [] });
sl(g2, "fov", { label: "Width of view", min: 0.5, max: 200, step: 0.5, fmt: v => "±" + v + "″" });
let r1 = K.row(g2); K.btn(r1, "Fit view to the ring", () => ctl.fov.set(K.clamp(Math.round(thetaE() * 2.6 * 2) / 2, 0.5, 200), true)); K.btn(r1, "Centre the source", () => { S.sx = 0; S.sy = 0; mark(); });
tg(g2, "drift", "Drift the source across", () => { magLog = []; S.sx = -S.fov / thetaE() * 0.9; });
K.note(g2, "Drag the picture to move the source.");
const readS = K.readout(g2, [["te", "Einstein radius"], ["kpc", "ring size at the lens"], ["mag", "total magnification"], ["dl", "lens distance"]]);
// --- microlensing
g = groups.micro = ui.group("The event");
sl(g, "mStar", { label: "Lens star mass", min: 0.1, max: 1.5, step: 0.05, unit: "M☉", then: remap });
sl(g, "u0", { label: "Closest approach u₀", min: 0.01, max: 1, step: 0.01, unit: "θ<sub>E</sub>", then: recurve });
sl(g, "ang", { label: "Direction of travel", min: -90, max: 90, step: 1, unit: "°", then: recurve });
sl(g, "noise", { label: "Measurement error", min: 0, max: 8, step: 0.5, unit: "%", then: recurve });
tg(g, "planet", "The star has a planet", remap);
sl(g, "mPlanet", { label: "Planet mass", min: 0.03, max: 10, step: 0.01, fmt: v => v < 0.3 ? (v * 318).toFixed(0) + " Earths" : v.toFixed(2) + " Jupiters", then: remap });
sl(g, "sep", { label: "Planet's distance from star", min: 0.4, max: 2.5, step: 0.01, fmt: v => v.toFixed(2) + " θ<sub>E</sub> = " + (v * microScale().au).toFixed(1) + " AU", then: remap });
const readM = K.readout(g, [["tE", "crossing time"], ["peak", "peak brightness"], ["dev", "planet's biggest effect"], ["found", "planet detected?"]]);
// --- eclipse
g = groups.eclipse = ui.group("29 May 1919");
reg("law", K.seg(g, { label: "Which theory is true?", value: 1.75, options: [[1.75, "Einstein 1.75″"], [0.875, "Newton 0.87″"], [0, "No bending"]], on: v => { S.law = v; newPlates(); } }));
sl(g, "exag", { label: "Exaggerate the shifts", min: 1, max: 1000, step: 1, fmt: v => "× " + v });
sl(g, "plateNoise", { label: "Plate error per star", min: 0.05, max: 0.6, step: 0.01, unit: "″", then: () => newPlates() });
K.btn(K.row(g), "📷 Take new plates", () => newPlates(), "primary");
const readE = K.readout(g, [["fit", "your result"], ["sig", "away from Newton"], ["n", "stars measured"], ["sun", "Sun's radius"]]);
K.note(g, "Hollow circles: where each star really is. Dots: where it appears with the Sun in front. The Sun's radius is 960″, so the true shifts are far too small to see: hence the exaggeration.");

function set(o) { for (const k in o) { S[k] = o[k]; if (ctl[k]) ctl[k].set(o[k]); } mark(); magLog = []; if (S.mode === "micro") remap(); drawPaths(); }
const DEF = JSON.parse(JSON.stringify(S));
function setMode(m, restore) {
  S.mode = m; ctl.mode.set(m);
  if (restore) { const keep = {}; for (const k in DEF) if (k !== "mode") keep[k] = DEF[k]; set(keep); }
  for (const k in groups) groups[k].style.display = k.startsWith(m) ? "" : "none";
  glc.style.display = m === "hole" || m === "sky" ? "" : "none";
  dockH.style.display = m === "hole" ? "" : "none"; chDef.el.style.display = m === "hole" ? "" : "none";
  chMag.el.style.display = m === "sky" ? "" : "none"; chLc.el.style.display = m === "micro" ? "" : "none"; chEd.el.style.display = m === "eclipse" ? "" : "none";
  mark(); magLog = []; ui.hud("");
  if (m === "micro") remap(); if (m === "eclipse" && !plate) newPlates(); if (m === "hole") setTimeout(drawPaths, 30);
  ui.tip({ hole: "Drag to fly round the black hole", sky: "Drag to move the background source behind the lens", micro: "The far star drifts behind the lens star: watch the light curve", eclipse: "Take plates of the stars round the eclipsed Sun" }[m], 6000);
}
const thetaE = () => einsteinArcsec(Math.pow(10, S.logM), S.zl, S.zs);          // arcsec
const massF = () => S.lens === 3 && !S.dark ? 0.15 : 1;                            // "visible matter only" keeps 15% of the cluster

// ---------------- 4. The picture: a shader that runs once per pixel ----------------
const glc = document.createElement("canvas"); ui.stage.append(glc);
const gl = glc.getContext("webgl", { antialias: false, preserveDrawingBuffer: true }) || glc.getContext("experimental-webgl");
const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform int uMode;
uniform float uDist, uTilt, uView, uRout, uTemp, uDisc, uDoppler, uYaw, uGalOff; uniform int uSky;
uniform int uLens, uSrcType; uniform float uFov, uSrcSize, uShear, uMassF, uLensLight; uniform vec2 uSrc;
// ---- small helpers: repeatable "random" numbers and smooth noise, used to paint stars and gas ----
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n=h21(p); return vec2(n,h21(p+n+3.7)); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+1.),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+7.1; a*=.5; } return s; }
// colour of a glowing body at temperature t (thousands of kelvin)
vec3 bb(float t){ t=clamp(t,1.,40.); vec3 c;
  c.r = t<6.6 ? 1. : clamp(1.29*pow(t-6.,-.1332),0.,1.);
  c.g = t<6.6 ? clamp(.39*log(t*10.)-.632,0.,1.) : clamp(1.13*pow(t-6.,-.0755),0.,1.);
  c.b = t>=6.6 ? 1. : (t<=2. ? 0. : clamp(.543*log(t*10.-10.)-1.196,0.,1.));
  return c; }
// ---- things to look at ----
vec3 galaxy(vec2 p){ p.y*=1.7; float r=length(p), a=atan(p.y,p.x);
  float arm=.5+.5*cos(2.*a-5.5*log(r+.04)), disk=exp(-r*3.2), core=exp(-r*r*45.), dust=fbm(p*9.+3.);
  vec3 c=vec3(.35,.5,1.)*disk*(.25+1.5*arm*arm*(.5+.9*dust))+vec3(1.,.85,.6)*core*1.7+vec3(1.,.4,.55)*disk*pow(arm,8.)*step(.62,dust);
  return c*smoothstep(1.4,.6,r); }
vec3 deep(vec2 p){ vec3 c=vec3(0.);
  for(int k=0;k<2;k++){ float sc=k==0?1.7:3.9; vec2 q=p*sc+float(k)*17.3, id=floor(q), f=fract(q)-.5; vec2 rnd=h22(id+3.1);
    float sz=.05+.15*rnd.x*rnd.x, an=rnd.y*6.283; vec2 d=f-(h22(id+9.7)-.5)*.5; d=mat2(cos(an),-sin(an),sin(an),cos(an))*d; d.y*=1.+2.5*h21(id+5.5);
    c+=mix(vec3(1.,.6,.35),vec3(.45,.65,1.),h21(id+1.3))*exp(-dot(d,d)/(sz*sz))*(.5+.9*rnd.x); }
  return c; }
vec3 gridp(vec2 p){ vec2 q=abs(fract(p)-.5); float l=smoothstep(.47,.5,max(q.x,q.y)); vec2 id=floor(p);
  vec3 base=mix(vec3(.05,.09,.2),vec3(.09,.2,.22),mod(id.x+id.y,2.)); if(p.x*p.y<0.) base=base.grb*1.2;
  return base+l*vec3(.3,.75,1.); }
vec3 stars(vec3 d){ vec2 uv=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.))); vec3 c=vec3(0.);
  for(int k=0;k<3;k++){ float sc=k==0?28.:(k==1?55.:110.); vec2 q=uv*sc+float(k)*31.7, id=floor(q), f=fract(q)-.5; vec2 rnd=h22(id);
    float on=step(k==0?.55:.4,rnd.x), br=pow(h21(id+7.7),k==0?5.:9.)*(k==0?5.:3.)+.12; vec2 o=(h22(id+2.2)-.5)*.7;
    float g=exp(-dot(f-o,f-o)*(k==0?260.:160.)); c+=on*br*g*mix(vec3(1.,.8,.6),vec3(.7,.85,1.),rnd.y); }
  float band=exp(-pow(dot(d,normalize(vec3(.35,.9,.25))),2.)*14.); float neb=fbm(uv*vec2(3.,5.)+2.);
  c+=band*(vec3(.16,.14,.22)*neb*1.3+vec3(.22,.12,.1)*pow(neb,3.)*1.5); return c; }
vec3 sphgrid(vec3 d){ float lo=degrees(atan(d.z,d.x))/15., la=degrees(asin(clamp(d.y,-1.,1.)))/15.; vec2 p=vec2(lo,la); return gridp(p); }
// what a ray sees once it has escaped to the distant sky, heading in direction d
vec3 sky(vec3 d){ float cy=cos(uYaw), sy=sin(uYaw); d=vec3(cy*d.x+sy*d.z,d.y,-sy*d.x+cy*d.z);
  if(uSky==1) return sphgrid(d);
  vec3 c=stars(d)*(uSky==2?.5:1.);
  if(uSky==2){ float ct=cos(uTilt), st=sin(uTilt); vec3 g0=vec3(0.,-st,ct), e1=vec3(1.,0.,0.), e2=vec3(0.,ct,st); // a galaxy exactly behind the hole
    if(dot(d,g0)>0.) c+=galaxy((vec2(dot(d,e1),dot(d,e2))-vec2(uGalOff,0.))/.07)*1.6; }
  return c; }
// ---- VIEW 1: follow a light ray backwards from the camera past the black hole (lengths in r_s) ----
vec3 traceHole(vec2 uv){
  float ct=cos(uTilt), st=sin(uTilt), r0=uDist;
  vec3 ro=r0*vec3(0.,st,-ct), fw=vec3(0.,-st,ct), rt=vec3(1.,0.,0.), up=vec3(0.,ct,st);
  vec3 dl=normalize(fw+(uv.x*rt+uv.y*up)*(uView/uDist));          // direction the camera looks for this pixel
  // A camera hovering near the hole sees directions squeezed towards it; convert to the direction used by the path equation.
  vec3 er=ro/r0; float ca=dot(dl,-er), sa=sqrt(max(0.,1.-ca*ca));
  float b=r0*sa/sqrt(1.-1./r0), sc=clamp(b/sqrt(r0*r0+b*b/r0),0.,1.);
  vec3 tn=dl+ca*er; tn=tn/max(length(tn),1e-6);
  vec3 v=-er*sqrt(1.-sc*sc)*sign(ca)+tn*sc, p=ro;
  vec3 hv=cross(p,v); float h2=dot(hv,hv), vinf=sqrt(max(1e-4,1.-h2/(r0*r0*r0)));   // h: angular momentum of the ray, which never changes
  float rmax=max(r0*1.03,45.), al=0.; vec3 col=vec3(0.); bool swallowed=false;
  vec3 a=-1.5*h2*p/pow(dot(p,p),2.5);                              // the bending "force": this is the 1.5u² term
  for(int i=0;i<320;i++){
    float r=length(p); if(r<1.){ swallowed=true; break; } if(r>rmax && dot(p,v)>0.) break;
    float dt=clamp(.055*r,.02,6.)/max(length(v),.5);
    v+=a*dt*.5; vec3 p2=p+v*dt; a=-1.5*h2*p2/pow(dot(p2,p2),2.5); v+=a*dt*.5;       // leapfrog step
    if(p.y*p2.y<0. && uDisc>.5){                                   // the ray has just passed through the plane of the disc
      vec3 hp=mix(p,p2,p.y/(p.y-p2.y)); float rr=length(hp);
      if(rr>3. && rr<uRout){
        float x=rr/3., flux=(1.-sqrt(1./x))/(x*x*x)/.0567, T=pow(max(flux,0.),.25);   // thin-disc heating: brightest just outside the inner edge
        float om=sqrt(.5/(rr*rr*rr));                              // orbital angular speed of the gas (Kepler)
        float Ly=-dot(cross(hp,v),vec3(0.,1.,0.))/vinf;            // how much the photon is travelling "with" the orbit
        float gsh=uDoppler>.5 ? sqrt(1.-1.5/rr)/(1.-om*Ly)/sqrt(1.-1./r0) : 1.;      // received / emitted frequency
        // swirling texture: blobs of gas carried round and sheared by the faster inner orbits
        float tex=0.; for(int k=0;k<2;k++){ float ph=fract(uTime*.012+float(k)*.5), tau=(ph+1.)*42., an=om*tau; vec2 q=mat2(cos(an),-sin(an),sin(an),cos(an))*hp.xz;
          tex+=fbm(q*1.25+float(k)*9.)*(1.-abs(2.*ph-1.)); }
        tex=.55+1.1*tex*tex+.12*sin(rr*5.+fbm(hp.xz)*4.);
        float edge=smoothstep(3.,3.25,rr)*smoothstep(uRout,uRout*.72,rr);
        vec3 c=pow(bb(uTemp*T*gsh),vec3(1.6))*flux*pow(gsh,4.)*tex*1.25;
        float ad=edge*.97; col+=(1.-al)*ad*c; al+=(1.-al)*ad; if(al>.985) break;
      } }
    p=p2;
  }
  if(!swallowed) col+=(1.-al)*sky(normalize(v));
  return col;
}
// ---- VIEW 2: the lens equation. Positions in Einstein radii. ----
vec2 bend(vec2 t){ float r2=dot(t,t)+1e-9, r=sqrt(r2);
  if(uLens==0) return t/r2; if(uLens==1) return t/r; if(uLens==2) return t/r+uShear*vec2(t.x,-t.y);
  vec2 a=t*1.25/(.25+sqrt(r2+.0625));
  a+=.08*normalize(t-vec2(.55,.2)+1e-6); a+=.08*normalize(t-vec2(-.4,.5)+1e-6); a+=.08*normalize(t-vec2(-.6,-.35)+1e-6); a+=.08*normalize(t-vec2(.3,-.6)+1e-6);
  return a; }
vec3 blob(vec2 t,float s){ float r2=dot(t,t)/(s*s); return vec3(1.,.82,.55)*.9/(1.+r2*r2*3.+r2*8.); }
vec3 traceSky(vec2 uv){ vec2 th=uv*uFov, be=th-uMassF*bend(th); vec3 c;   // th: where we look. be: where that light really came from.
  if(uSrcType==0) c=galaxy((be-uSrc)/uSrcSize)*1.5+deep(be*.35+40.)*.1;
  else if(uSrcType==1) c=gridp((be-uSrc)*2.)+vec3(1.,.7,.2)*smoothstep(uSrcSize*.3,uSrcSize*.25,length(be-uSrc));
  else if(uSrcType==2) c=deep((be-uSrc)*.9);
  else { float d2=dot(be-uSrc,be-uSrc)/.0025; c=vec3(.75,.85,1.)*3.*exp(-d2)+vec3(.3,.4,1.)*.5/(1.+d2*.4)+deep(be*.35+40.)*.1; }
  if(uLensLight>.5){ if(uLens==3){ c+=blob(th,.3*uMassF+.1); c+=blob(th-vec2(.55,.2),.07)+blob(th-vec2(-.4,.5),.07)+blob(th-vec2(-.6,-.35),.07)+blob(th-vec2(.3,-.6),.07); }
    else c+=blob(vec2(th.x*(uLens==2?1.+uShear*2.:1.),th.y),uLens==0?.035:.14)*(uLens==0?2.:1.); }
  return c; }
void main(){ vec2 uv=(gl_FragCoord.xy*2.-uRes)/uRes.y; vec3 c=uMode==0?traceHole(uv):traceSky(uv);
  c=1.-exp(-c*1.25); c=pow(c,vec3(.8)); c+=(h21(gl_FragCoord.xy+uTime)-.5)/255.; gl_FragColor=vec4(c,1.); }`;
let prog = null; const U = {};
if (gl) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  prog = gl.createProgram(); gl.attachShader(prog, mk(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}")); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); prog = null; }
  else {
    gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one big triangle covering the screen
    gl.enableVertexAttribArray(0); gl.bindAttribLocation(prog, 0, "p"); gl.vertexAttribPointer(gl.getAttribLocation(prog, "p"), 2, gl.FLOAT, false, 0, 0);
    for (const n of ["uRes", "uTime", "uMode", "uDist", "uTilt", "uView", "uRout", "uTemp", "uDisc", "uDoppler", "uYaw", "uGalOff", "uSky", "uLens", "uSrcType", "uFov", "uSrcSize", "uShear", "uMassF", "uLensLight", "uSrc"]) U[n] = gl.getUniformLocation(prog, n);
  }
}
let scale = 0.8, slow = 0, quick = 0;
function renderGL(dt) {
  if (!prog) return;
  // picture sharpness adapts to the graphics card: fewer pixels if frames are slow
  if (quality === "auto" && S.mode === "hole" && ui.playing) { if (dt > 0.04) { if (++slow > 12) { scale = Math.max(0.3, scale * 0.82); slow = 0; } } else slow = 0; if (dt < 0.019) { if (++quick > 90) { scale = Math.min(1.25, scale * 1.12); quick = 0; } } else quick = 0; }
  const k = quality === "sharp" ? Math.min(window.devicePixelRatio || 1, 2) : quality === "fast" ? 0.45 : scale, w = Math.max(2, Math.round(ui.stage.clientWidth * k)), h = Math.max(2, Math.round(ui.stage.clientHeight * k));
  if (glc.width !== w || glc.height !== h) { glc.width = w; glc.height = h; }
  gl.viewport(0, 0, w, h); gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uTime, time); gl.uniform1i(U.uMode, S.mode === "hole" ? 0 : 1);
  gl.uniform1f(U.uDist, S.dist); gl.uniform1f(U.uTilt, S.tilt * Math.PI / 180); gl.uniform1f(U.uView, S.view); gl.uniform1f(U.uRout, S.rout); gl.uniform1f(U.uTemp, S.temp);
  gl.uniform1f(U.uDisc, S.disc ? 1 : 0); gl.uniform1f(U.uDoppler, S.doppler ? 1 : 0); gl.uniform1f(U.uYaw, S.yaw); gl.uniform1f(U.uGalOff, S.galOff); gl.uniform1i(U.uSky, S.sky);
  const tE = thetaE(); gl.uniform1i(U.uLens, S.lens); gl.uniform1i(U.uSrcType, S.src); gl.uniform1f(U.uFov, S.fov / tE); gl.uniform1f(U.uSrcSize, S.size); gl.uniform1f(U.uShear, S.shear); gl.uniform1f(U.uMassF, massF()); gl.uniform1f(U.uLensLight, S.lensLight ? 1 : 0); gl.uniform2f(U.uSrc, S.sx, S.sy);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------------- 5. Overlay drawing (labels, rings, and the two views that need no ray tracing) ----------------
const cv = ui.canvas(() => mark());
const dockH = document.createElement("div"); dockH.style.position = "relative"; ui.dock.append(dockH); let pc = null;
const chDef = K.chart(ui.dock, { title: "How far is light turned?", xLabel: "aimed this far from the centre (r_s)", yLabel: "angle turned (degrees)", xMin: 0, xMax: 12, yMin: 0, yMax: 200 });
const chMag = K.chart(ui.dock, { title: "Brightness of the source as it moves", xLabel: "source position (Einstein radii from the centre)", yLabel: "magnification", yMin: 0 });
const chLc = K.chart(ui.dock, { title: "Light curve of the distant star", xLabel: "time (days from closest approach)", yLabel: "brightness (× normal)" });
const chEd = K.chart(ui.dock, { title: "Measured shift of each star", xLabel: "distance from the Sun's centre (solar radii)", yLabel: "shift (arcsec)", xMin: 1, xMax: 8.5, yMin: -0.6, yMax: 2 });
const DEFL = (() => { const ex = [], wk = []; for (let b = 2.61; b <= 12; b += 0.03) ex.push([b, shoot(b).turn * 57.2958]); for (let b = 0.5; b <= 12; b += 0.1) wk.push([b, 2 / b * 57.2958]); return { ex, wk }; })();
const FAN = (() => { const a = []; for (let b = 0.6; b <= 9; b += 0.6) a.push(shoot(b, true)); return a; })();   // a fan of photons for the side-on diagram

function drawPaths() {   // top-down picture of photons passing the hole
  if (S.mode !== "hole" || !pc || !pc.w) return; const c = pc.ctx, w = pc.w, h = pc.h, s = Math.min(w / 30, h / 16), ox = w * 0.5, oy = h * 0.58;
  c.fillStyle = "#070b16"; c.fillRect(0, 0, w, h);
  const line = (p, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(0, oy - p.b * s); let first = true; for (const [x, y] of p.path) { const X = ox + x * s, Y = oy - y * s; first && X > 0 ? (c.lineTo(X, Y), first = false) : c.lineTo(X, Y); } c.stroke(); };
  FAN.forEach((p, i) => { p.b = 0.6 + i * 0.6; line(p, p.captured ? "rgba(255,110,110,.45)" : "rgba(110,200,255,.45)", 1); });
  const me = shoot(S.b, true); me.b = S.b; line(me, "#ffd866", 2.4);
  c.setLineDash([4, 4]); c.strokeStyle = "#8b98b8"; c.lineWidth = 1; c.beginPath(); c.arc(ox, oy, 1.5 * s, 0, 6.3); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#000"; c.beginPath(); c.arc(ox, oy, s, 0, 6.3); c.fill(); c.strokeStyle = "#5b6a90"; c.stroke();
  c.fillStyle = "#dfe8f7"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("Photons passing the hole (seen from above)", 10, 16);
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8b98b8"; c.fillText("dashed: photon sphere, 1.5 r_s", 10, h - 8); c.fillStyle = "#ff8f8f"; c.fillText("captured", w - 150, 16); c.fillStyle = "#7fd0ff"; c.fillText("escapes", w - 80, 16);
  chDef.draw([{ pts: DEFL.ex, color: K.cssVar("--s0"), label: "exact" }, { pts: DEFL.wk, color: K.cssVar("--s1"), dash: [6, 4], label: "simple formula 2r_s/b" }], { vlines: [{ x: S.b, color: "#ffd866", label: "your photon" }, { x: BCRIT, color: "#ff8f8f", label: "captured inside 2.6", row: 1 }] });
  readH.set("turn", me.captured ? "–" : (me.turn * 57.2958).toFixed(1) + "°"); readH.set("fate", me.captured ? "captured" : me.turn > Math.PI ? "loops round, escapes" : "escapes");
}
function drawHole() {
  const c = cv.ctx, w = cv.w, h = cv.h, px = r => r / S.view * h / 2; c.clearRect(0, 0, w, h);
  const M = [10, 4.3e6, 6.5e9][S.mass], rs = 2 * G * M * MSUN / (C * C), dEarth = [0, 8.28e3 * PC, 16.8e6 * PC][S.mass];
  // apparent radius of the shadow for a hovering camera: sin(angle) = 2.598 √(1 − 1/r) / r
  const sinA = BCRIT * Math.sqrt(1 - 1 / S.dist) / S.dist, shadowPx = sinA / Math.sqrt(1 - sinA * sinA) * S.dist / S.view * h / 2;
  if (S.rings) {
    c.setLineDash([5, 5]); c.lineWidth = 1.3; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left";
    c.strokeStyle = c.fillStyle = "rgba(255,216,102,.9)"; c.beginPath(); c.arc(w / 2, h / 2, shadowPx, 0, 6.3); c.stroke(); c.setLineDash([]); c.beginPath(); c.moveTo(w / 2 + shadowPx * 0.71, h / 2 - shadowPx * 0.71); c.lineTo(w / 2 + shadowPx * 0.71 + 60, h / 2 - shadowPx * 0.71 - 60); c.stroke(); c.fillText("edge of the shadow, 2.6 r_s", w / 2 + shadowPx * 0.71 + 64, h / 2 - shadowPx * 0.71 - 62); c.setLineDash([5, 5]);
    c.strokeStyle = c.fillStyle = "rgba(150,170,210,.8)"; c.beginPath(); c.arc(w / 2, h / 2, px(1), 0, 6.3); c.stroke(); if (px(1) > 14) { c.textAlign = "center"; c.fillText("horizon", w / 2, h / 2 - 2); c.fillText("1 r_s", w / 2, h / 2 + 12); c.textAlign = "left"; }
    if (S.sky === 2 && !S.disc) { const rE = Math.sqrt(2 * S.dist); c.strokeStyle = c.fillStyle = "rgba(126,231,135,.9)"; c.beginPath(); c.arc(w / 2, h / 2, px(rE), 0, 6.3); c.stroke(); c.fillText("Einstein ring, √(2 r_s d)", w / 2 + px(rE) * 0.72 + 6, h / 2 + px(rE) * 0.72 + 14); }
    c.setLineDash([]);
  }
  const fmtLen = m => m < 1e6 ? (m / 1e3).toFixed(0) + " km" : m < AU * 0.05 ? K.sig(m / 1e9, 2) + " million km" : K.sig(m / AU, 2) + " AU";
  readH.set("rs", fmtLen(rs)); readH.set("shadow", dEarth ? (2 * BCRIT * rs / dEarth / ARCSEC * 1e6).toFixed(0) + " µas" : "–");
  const tOrb = 2 * Math.PI * Math.sqrt(2 * 27) * rs / C;   // period of the innermost stable orbit, seen from far away
  ui.hud(`camera ${S.dist} r<sub>s</sub> away, ${S.tilt}° above the disc<br>innermost orbit: 3 r<sub>s</sub>, half the speed of light<br>one lap there takes ${tOrb < 1 ? (tOrb * 1000).toFixed(1) + " ms" : tOrb < 7200 ? (tOrb / 60).toFixed(0) + " min" : (tOrb / 86400).toFixed(1) + " days"}`);
}
// total brightness of the lensed source compared with unlensed: count the light arriving over a grid of sky directions
let magLog = [], lastMag = 1;
function magnification() {
  const N = 260, f = S.fov / thetaE(), mf = massF(), sg = S.src === 3 ? 0.0354 : S.size * 0.35, cell = 2 * f / N; let sum = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -f + (i + .5) * cell, y = -f + (j + .5) * cell, a = alpha(S.lens, x, y, S.shear), dx = x - mf * a[0] - S.sx, dy = y - mf * a[1] - S.sy, d2 = (dx * dx + dy * dy) / (2 * sg * sg); if (d2 < 12) sum += Math.exp(-d2); }
  return sum * cell * cell / (2 * Math.PI * sg * sg);
}
function drawSky() {
  const c = cv.ctx, w = cv.w, h = cv.h, tE = thetaE(), pxE = tE / S.fov * h / 2 * (S.lens === 0 ? Math.sqrt(massF()) : massF()); c.clearRect(0, 0, w, h);
  if (S.lens < 2) { c.setLineDash([5, 5]); c.strokeStyle = "rgba(126,231,135,.75)"; c.lineWidth = 1.2; c.beginPath(); c.arc(w / 2, h / 2, pxE, 0, 6.3); c.stroke(); c.setLineDash([]); c.fillStyle = "rgba(126,231,135,.9)"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("Einstein radius", w / 2 + pxE * .72 + 5, h / 2 - pxE * .72 - 4); }
  // where the source really is
  const sx = w / 2 + S.sx * tE / S.fov * h / 2, sy = h / 2 - S.sy * tE / S.fov * h / 2; if (S.src !== 2) { c.strokeStyle = "rgba(255,216,102,.95)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - 8, sy); c.lineTo(sx + 8, sy); c.moveTo(sx, sy - 8); c.lineTo(sx, sy + 8); c.stroke();
  c.fillStyle = "rgba(255,216,102,.95)"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("true position", sx, sy + 21); }
  // scale bar
  const nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].find(v => v / S.fov * h / 2 > 70) || 100, bl = nice / S.fov * h / 2; c.strokeStyle = c.fillStyle = "#dfe8f7"; c.lineWidth = 2; c.beginPath(); c.moveTo(16, h - 18); c.lineTo(16 + bl, h - 18); c.stroke(); c.textAlign = "left"; c.fillText(nice + " arcsec", 16, h - 24);
  const d = distances(S.zl, S.zs); lastMag = magnification(); if ((S.src === 0 || S.src === 3) && !grab && !S.drift && (!magLog.length || magLog[magLog.length - 1][0] !== S.sx)) magLog.push([S.sx, lastMag]);
  readS.set("te", K.sig(tE * (S.lens === 0 ? Math.sqrt(massF()) : massF()), 3) + "″"); readS.set("kpc", K.sig(tE * ARCSEC * d.Dl / PC / 1e3, 3) + " kpc"); readS.set("mag", S.src === 1 || S.src === 2 ? "–" : "× " + K.sig(lastMag, 3)); readS.set("dl", K.sig(d.Dl / PC / 1e9 * 3.262, 3) + " Gly");
  const u = Math.hypot(S.sx, S.sy), th = []; if (S.lens === 0) for (let x = -3; x <= 3.001; x += 0.02) th.push([x, paczynski(Math.hypot(x, S.sy) + 1e-3)]);
  chMag.draw([{ pts: th, color: K.cssVar("--s1"), dash: [6, 4], label: S.lens === 0 ? "point-lens theory" : "" }, { pts: magLog, type: "dots", r: 2.2, color: K.cssVar("--s0"), label: "counted from the picture" }], { xMin: -3, xMax: 3, yMax: S.lens === 0 ? Math.min(12, paczynski(Math.abs(S.sy) + 0.05) * 1.2) : null, vlines: [{ x: S.sx, color: "#ffd866" }] });
  ui.hud(S.lens === 3 ? (S.dark ? "all the mass: stars, gas and dark matter" : "visible matter only: 15% of the mass") : u < 0.03 && S.lens < 2 ? "perfect line-up: a full Einstein ring" : "");
}
// ---- microlensing ----
function microScale() { const Dl = 4e3 * PC, Ds = 8e3 * PC, th = Math.sqrt(4 * G * S.mStar * MSUN / (C * C) * (Ds - Dl) / (Dl * Ds)); return { mas: th / ARCSEC * 1e3, au: th * Dl / AU, tE: th / ARCSEC * 1e3 / 5 * 365.25 }; }  // 5 mas per year relative motion
let mapImg = null, mapT = 0, curve = [], data = [];
const MW = 180, MH = 90, MX = 2.6;   // magnification map: 180 × 90 cells covering ±2.6 by ±1.3 Einstein radii
function remap() { clearTimeout(mapT); recurve(); mapT = setTimeout(buildMap, 160); if (ctl.sep) ctl.sep.set(S.sep); }
function buildMap() {
  const q = S.planet ? S.mPlanet * 9.55e-4 / S.mStar : 0, B = binaryGeom(q, S.sep), im = document.createElement("canvas"); im.width = MW; im.height = MH; const x = im.getContext("2d"), id = x.createImageData(MW, MH);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const sx = -MX + (i + .5) * 2 * MX / MW, sy = (MH / 2 - j - .5) * 2 * MX / MW, one = paczynski(Math.hypot(sx - B.z1, sy) / Math.sqrt(B.m1) + 1e-3), A = q > 0 ? binaryImages(B, sx, sy).A : one;
    // dim blue: brightness with the star alone (log scale). Orange: the planet makes it brighter here. Dark: the planet makes it fainter.
    const v = K.clamp(Math.log(one) / Math.log(40), 0, 1), d = K.clamp(Math.log(A / one) * 4, -1, 1), up = Math.max(0, d), dn = Math.max(0, -d), k = (i + j * MW) * 4;
    id.data[k] = (10 + 150 * v * v + 245 * up) * (1 - .8 * dn); id.data[k + 1] = (16 + 190 * v * v + 150 * up) * (1 - .8 * dn); id.data[k + 2] = (34 + 221 * Math.pow(v, 1.2) + 20 * up) * (1 - .7 * dn); id.data[k + 3] = 255;
  }
  x.putImageData(id, 0, 0); mapImg = im; mark();
}
function recurve() {
  const q = S.planet ? S.mPlanet * 9.55e-4 / S.mStar : 0; curve = lightCurve(q, S.sep, S.u0, S.ang * Math.PI / 180, 500);
  const r = K.rng(Math.round(S.u0 * 1000 + S.ang * 7 + S.noise * 13 + 5)); data = []; for (let i = 0; i < curve.length; i += 4) data.push([curve[i][0], curve[i][1] * (1 + S.noise / 100 * r.gauss())]);
  mark();
}
function drawMicro() {
  const c = cv.ctx, w = cv.w, h = cv.h, s = Math.max(w / (2 * MX), h / (2 * MX * MH / MW)), ox = w / 2, oy = h / 2, sc = microScale(); c.fillStyle = "#04060c"; c.fillRect(0, 0, w, h);
  if (mapImg) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(mapImg, ox - MX * s, oy - MX * MH / MW * s, 2 * MX * s, 2 * MX * MH / MW * s); }
  const q = S.planet ? S.mPlanet * 9.55e-4 / S.mStar : 0, B = binaryGeom(q, S.sep), X = x => ox + x * s, Y = y => oy - y * s;
  c.setLineDash([5, 5]); c.strokeStyle = "rgba(126,231,135,.7)"; c.lineWidth = 1.2; c.beginPath(); c.arc(X(B.z1), oy, s * Math.sqrt(B.m1), 0, 6.3); c.stroke(); c.setLineDash([]);
  // the source's track
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; c.beginPath(); curve.forEach((p, i) => i ? c.lineTo(X(p[3]), Y(p[4])) : c.moveTo(X(p[3]), Y(p[4]))); c.stroke();
  const i = K.clamp(Math.round((S.t + 2) / 4 * (curve.length - 1)), 0, curve.length - 1), p = curve[i]; if (!p) return;
  // the images we would see if we could resolve them: stretched round the ring
  const imgs = q > 0 ? binaryImages(B, p[3], p[4]).imgs : (() => { const u = Math.hypot(p[3], p[4]) || 1e-3, a = (u + Math.sqrt(u * u + 4)) / 2, b = (u - Math.sqrt(u * u + 4)) / 2, m = paczynski(u); return [[p[3] / u * a, p[4] / u * a, (m + 1) / 2], [p[3] / u * b, p[4] / u * b, (m - 1) / 2]]; })();
  for (const [x, y, mu] of imgs) { const an = Math.atan2(y - 0, x - B.z1), m = Math.min(Math.abs(mu), 40); c.save(); c.translate(X(x), Y(y)); c.rotate(-an); c.fillStyle = "rgba(160,205,255,.92)"; c.shadowColor = "#8cc4ff"; c.shadowBlur = 12; c.beginPath(); c.ellipse(0, 0, 4.5, 4.5 * Math.max(0.35, m), 0, 0, 6.3); c.fill(); c.restore(); }
  c.fillStyle = "#ffe9a8"; c.shadowColor = "#ffd866"; c.shadowBlur = 16; c.beginPath(); c.arc(X(B.z1), oy, 6, 0, 6.3); c.fill(); c.shadowBlur = 0;
  if (q > 0) { c.fillStyle = "#ff9d6b"; c.beginPath(); c.arc(X(B.z2), oy, 3.5, 0, 6.3); c.fill(); c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("planet", X(B.z2), oy + 16); }
  c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.arc(X(p[3]), Y(p[4]), 5, 0, 6.3); c.stroke();
  c.fillStyle = "#dfe8f7"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("lens star", X(B.z1) + 9, oy - 9); c.fillText("true position of the far star", X(p[3]) + 9, Y(p[4]) - 8);
  c.fillStyle = "#8b98b8"; c.fillText("Blue glow: how bright the far star looks at each position with the lens star alone. Orange: where the planet adds extra brightness.", 12, h - 10);
  const T = sc.tE, now = S.t * T;
  chLc.draw([{ pts: curve.map(p => [p[0] * T, p[2]]), color: K.cssVar("--s1"), dash: [6, 4], label: "star alone" }, { pts: curve.map(p => [p[0] * T, p[1]]), color: K.cssVar("--s2"), label: "with planet", alpha: q > 0 ? 1 : 0 }, { pts: data.filter(d => d[0] <= S.t).map(d => [d[0] * T, d[1]]), type: "dots", r: 2.3, color: K.cssVar("--s0"), label: "measurements" }], { xMin: -2 * T, xMax: 2 * T, yMin: 0.8, vlines: [{ x: now, color: "#ffd866" }] });
  let dev = 0, peak = 0; for (const p of curve) { dev = Math.max(dev, Math.abs(p[1] - p[2]) / p[2]); peak = Math.max(peak, p[1]); }
  readM.set("tE", T.toFixed(1) + " days"); readM.set("peak", "× " + K.sig(peak, 3)); readM.set("dev", q > 0 ? (dev * 100).toFixed(1) + "%" : "–"); readM.set("found", q > 0 ? (planetFound(curve) && dev * 100 > 2.5 * S.noise ? "yes" : "no: hidden") : "–");
  ui.hud(`Einstein radius ${sc.mas.toFixed(2)} milliarcsec = ${sc.au.toFixed(1)} AU at the lens<br>day ${now.toFixed(1)}: brightness × ${K.sig(p[1], 3)}`);
}
// ---- eclipse ----
let plate = null;
function newPlates() { plate = plates(rand, S.plateNoise, S.law); mark(); }
function drawEclipse() {
  const c = cv.ctx, w = cv.w, h = cv.h, R = Math.min(w, h) / 17, ox = w / 2, oy = h / 2; const bg = c.createRadialGradient(ox, oy, R, ox, oy, Math.max(w, h) * 0.7); bg.addColorStop(0, "#1a2340"); bg.addColorStop(.3, "#0a1024"); bg.addColorStop(1, "#04060c"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  // the corona: streamers of hot gas, visible only when the Moon hides the Sun
  c.save(); c.translate(ox, oy); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) { const a = i * 2.399 + Math.sin(i * 7.1) * 0.2, len = R * (2.2 + 2.6 * Math.abs(Math.sin(i * 1.7 + 0.5)) * (0.4 + Math.abs(Math.cos(a)))), g = c.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); g.addColorStop(0, "rgba(255,244,225,.22)"); g.addColorStop(1, "rgba(255,244,225,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(Math.cos(a - 0.09) * R * 0.9, Math.sin(a - 0.09) * R * 0.9); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.lineTo(Math.cos(a + 0.09) * R * 0.9, Math.sin(a + 0.09) * R * 0.9); c.fill(); }
  const glow = c.createRadialGradient(0, 0, R * 0.95, 0, 0, R * 2.6); glow.addColorStop(0, "rgba(255,250,235,.95)"); glow.addColorStop(.12, "rgba(255,240,215,.4)"); glow.addColorStop(1, "rgba(255,240,215,0)"); c.fillStyle = glow; c.beginPath(); c.arc(0, 0, R * 2.6, 0, 6.3); c.fill(); c.restore();
  c.fillStyle = "#000"; c.beginPath(); c.arc(ox, oy, R, 0, 6.3); c.fill();
  c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center";
  STARS.forEach((s, i) => {
    const x0 = ox + Math.cos(s.an) * s.b * R, y0 = oy + Math.sin(s.an) * s.b * R, sh = (plate ? plate.pts[i][1] : 0) / 960 * S.exag * R, x1 = x0 + Math.cos(s.an) * sh, y1 = y0 + Math.sin(s.an) * sh;
    c.strokeStyle = "rgba(160,175,205,.7)"; c.lineWidth = 1; c.beginPath(); c.arc(x0, y0, 4, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.fillStyle = "#fff"; c.shadowColor = "#bcd6ff"; c.shadowBlur = 8; c.beginPath(); c.arc(x1, y1, 1.6 + s.mag, 0, 6.3); c.fill(); c.shadowBlur = 0;
  });
  c.fillStyle = "#5d6a8c"; c.fillText("the Moon", ox, oy - 2); c.fillText("hiding the Sun", ox, oy + 11);
  if (!plate) return; const curveOf = k => { const a = []; for (let b = 1; b <= 8.5; b += 0.1) a.push([b, k / b]); return a; };
  chEd.draw([{ pts: curveOf(1.75), color: K.cssVar("--s1"), label: "Einstein" }, { pts: curveOf(0.875), color: K.cssVar("--s3"), dash: [6, 4], label: "Newton" }, { pts: curveOf(plate.fit), color: K.cssVar("--s2"), dash: [2, 3], label: "best fit to your plates" }, { pts: plate.pts.map(p => [p[0], p[1], S.plateNoise]), type: "err", color: K.cssVar("--s0"), r: 3, label: "your stars" }]);
  readE.set("fit", plate.fit.toFixed(2) + " ± " + plate.err.toFixed(2) + "″"); readE.set("sig", ((plate.fit - 0.875) / plate.err).toFixed(1) + " uncertainties"); readE.set("n", STARS.length); readE.set("sun", "960″");
  ui.hud(`Fitted deflection at the Sun's edge: <b>${plate.fit.toFixed(2)} ± ${plate.err.toFixed(2)}″</b><br>Einstein predicts 1.75″ · Newton 0.87″`);
}

pc = K.canvas(dockH, () => drawPaths());
// ---------------- 6. Mouse and the animation loop ----------------
let grab = null;
K.pointer(cv.el, {
  down(p) { grab = { x: p.x, y: p.y, tilt: S.tilt, yaw: S.yaw }; if (S.mode === "sky") moveSrc(p); },
  drag(p) { if (!grab) return; if (S.mode === "hole") { S.tilt = K.clamp(Math.round(grab.tilt + (p.y - grab.y) * 0.3), -90, 90); S.yaw = grab.yaw + (p.x - grab.x) * 0.006; ctl.tilt.set(S.tilt); mark(); } else if (S.mode === "sky") moveSrc(p); },
  up() { grab = null; }
});
function moveSrc(p) { const k = S.fov / thetaE() / (cv.h / 2); S.sx = (p.x - cv.w / 2) * k; S.sy = -(p.y - cv.h / 2) * k; if (Math.hypot(S.sx, S.sy) < 0.04) S.sx = S.sy = 0; if (S.drift) ctl.drift.set(false, true); logMag(); mark(); }
function logMag() { if (S.src === 1 || S.src === 2) return; magLog.push([S.sx, magnification()]); if (magLog.length > 600) magLog.shift(); }
const gQ = ui.group("Picture"); K.seg(gQ, { label: "Sharpness", value: "auto", options: [["fast", "Fast"], ["auto", "Auto"], ["sharp", "Sharp"]], on: v => { quality = v; mark(); }, tip: "Auto lowers the sharpness if your graphics card struggles." });
if (!prog) K.note(gQ, "<b style='color:var(--warn)'>This browser has no WebGL, so the black hole and lensed sky pictures cannot be drawn.</b> Microlensing, the eclipse and the batch runs still work.");
ui.run(dt => {
  time += dt;
  if (S.mode === "hole" && S.disc) dirty = true;                       // the gas keeps swirling
  if (S.mode === "sky" && S.drift) { S.sx += dt * 0.35; if (S.sx > S.fov / thetaE() * 0.9) { S.sx = -S.fov / thetaE() * 0.9; magLog = []; } logMag(); dirty = true; }
  if (S.mode === "micro") { S.t += dt * 0.28; if (S.t > 2.3) S.t = -2; dirty = true; }
}, dt => {
  if (!dirty) return; dirty = false;
  if (S.mode === "hole") { renderGL(dt); drawHole(); } else if (S.mode === "sky") { renderGL(dt); drawSky(); } else if (S.mode === "micro") drawMicro(); else drawEclipse();
});
setMode("hole");
