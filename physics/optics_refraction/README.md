# Optics: Refraction, Dispersion, Lenses and Fibres

Snell's law and total internal reflection, prisms and dispersion, converging
and diverging lenses, and optical fibres, with a tab for each at the top of the
centre view. It replaces the old WJEC Physics Streamlit page "Optics
Refraction" (all five of its tabs).

Open `optics-refraction.html` in Chrome or Edge, with no install and no
internet needed.

## The five modes

- **Snell's law & TIR.** Choose a material pair (air → water, glass, diamond;
  water → glass; glass → air; diamond → air) or set n₁ and n₂, then set the
  angle of incidence or drag the ray (▶ Auto-scan sweeps it). Moving wavefronts
  show light slowing down and its wavelength shrinking in a denser material.
  The reflected ray's brightness comes from the Fresnel equations. The critical
  angle is marked, and TIR is shown when it happens. Graphs: θ₂ against θ₁, and
  the percentage reflected (s, p and average). Advanced adds a θ₁ → θ₂ table.
- **Prism.** Crown glass, flint glass or diamond (Cauchy's equation
  n = A + B/λ²), apex angle and angle of incidence. Seven colours are traced
  through the prism with Snell's law at both faces (colours that meet the second
  face beyond the critical angle are reflected). Readings: n at 400, 500, 589
  and 700 nm, angular dispersion, Δn, deviation and minimum deviation. Graphs:
  the dispersion curve and deviation against angle of incidence. Advanced: all
  materials on one curve, Cauchy coefficients, the minimum-deviation formula and
  a button to set minimum deviation.
- **Converging lens.** Real lenses (magnifying glass, 35 mm camera lens, human
  eye, projector) or your own f and u; drag the object. Three principal rays
  with virtual extensions, F, F′, 2F, 2F′, and the image. Readings: v, m, real or
  virtual, inverted or upright, power. The lens equation is checked with your
  numbers. Graphs: v against u and magnification against u, or in Advanced the
  1/v against 1/u straight line (and a table of v and m for u = 5–60 cm).
- **Diverging lens.** Short-sight glasses, a wide-angle camera element, a door
  peephole or your own values. Power in dioptres. Advanced: the lens maker's
  equation with n, R₁ and R₂.
- **Optical fibre.** Single-mode, multi-mode or endoscope fibre, or set the core
  and cladding indices and the ray angle. The ray is either guided by TIR or
  leaks into the cladding (refracted rays shown, fading at each bounce). The
  acceptance cone in air is drawn. Readings: critical angle, numerical aperture,
  acceptance angle, boundary angle, guided?, pulse spread per km. Graph: the
  extra delay of steeper rays (modal dispersion).

There are 12 presets, a Standard / Advanced (A-level) switch, a "What's
happening" story, physics notes and **📝 Exam practice** with live numbers:
the 3 Snell's-law questions from the old page plus 3 lens and 2 fibre
questions, each with marks, hints and a mark scheme.

## The physics

- Snell's law n₁ sin θ₁ = n₂ sin θ₂, n = c/v, sin θc = n₂/n₁.
- Fresnel reflectance for unpolarised light, R = (Rs + Rp)/2.
- Cauchy's equation n = A + B/λ² (A, B: crown 1.507, 4200 nm²; flint 1.590,
  8400 nm²; diamond 2.390, 22000 nm²); n = sin((A + Dmin)/2)/sin(A/2).
- Thin lens, real is positive: 1/u + 1/v = 1/f, m = v/u (shown negative for an
  inverted image), P = 1/f, lens maker's 1/f = (n − 1)(1/R₁ − 1/R₂).
- Fibres: NA = √(n_core² − n_clad²), delay t = L n_core/(c cos θ).

## Assumptions and simplifications

- Rays are thin and straight between boundaries; wavefronts are drawn hugely
  enlarged and in slow motion.
- Refractive indices are fixed (except the prism's Cauchy dispersion); no
  absorption.
- Thin-lens model with no aberrations; heights in the ray diagram are stretched
  to fit (distances along the axis are to scale).
- Step-index fibre with a perfect boundary; no bending loss.
- The old page wrote the lens equation as 1/f = 1/v − 1/u (a Cartesian form)
  but calculated with the real-is-positive form; this version uses real is
  positive throughout and its "lens equation check" now adds up correctly.

## Batch run

📊 **Batch run** repeats a simulated class practical many times, with random
reading errors (protractor ±1°, TIR onset ±0.5°, spectrometer ±0.1°, ruler
±2 mm on u, sharpest image ±5 mm; the fibre test launches 200 random rays per
run). Histograms for repeats, mean ± 1 SD against theory for sweeps, CSV
download.

One-click experiments (default seed 1):

| Experiment | Result | Theory |
|---|---|---|
| Glass block: n = sin i / sin r (500 repeats at 40°) | mean 1.50, SD 0.06 | 1.50 |
| Which angle of incidence is best? (10°–80°) | SD 0.20 at 10° falling to 0.03 at 80° | n = 1.50 at every angle |
| Critical angle method (500 repeats) | mean 1.50, SD 0.015 | 1.50 |
| Prism: n for each colour (minimum deviation) | 1.533 at 400 nm to 1.516 at 700 nm, SD ≈ 0.002 | Cauchy curve |
| Lens: find f from u and v (500 repeats) | mean 15.0 cm, SD 0.13 cm | 15 cm |
| Lens: how does v depend on u? | 59.9 cm at u = 20, 30.0 at 30, 20.0 at 60 | v = fu/(u − f) |
| Fibre: does a smaller Δn cut pulse spreading? | 354 ns/km (n_clad 1.40) to 16.6 ns/km (1.495) | 357 to 16.7 ns/km |
