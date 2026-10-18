# Photoelectric Effect

A single, self-contained HTML file for WJEC Eduqas A level Physics, Component 2,
Topic 6 (Photons and wave–particle duality). It needs no install and no internet:
**open `photoelectric-effect.html` in Chrome or Edge**.

It replaces the old WJEC Streamlit page *Photoelectric Effect*
(`physics_sims/pages/13_Photoelectric_Effect.py`) and keeps its controls, graphs,
notes and exam questions. The old page's third tab (hydrogen energy level
transitions) now lives in the Atomic spectra simulation
(`../atomic_spectra/atomic-spectra.html`), which this page links to, so the
content is not duplicated.

## Two views (tabs at the top of the centre panel)

1. **Photons on a metal.** A lamp sends photons (wave packets coloured by their
   wavelength; UV drawn violet) onto a metal. If hf ≥ φ each photon frees one
   electron, which flies off at a speed ∝ √KE. If hf < φ nothing escapes, however
   bright the light. Click a photon to see its energy. The metal glows when the
   light is within 4% of the threshold. Graph: KE<sub>max</sub> against frequency
   for all six metals (same gradient h); Advanced extends the lines back to the
   intercept −φ and adds the energy-budget bar chart E = φ + KE<sub>max</sub>.
2. **Photocell: stopping voltage.** Light falls on the cathode; electrons cross a
   vacuum gap to the anode and slow down in a retarding field (slow ones turn
   back). A battery sets the anode voltage V and an ammeter reads the current.
   Graph: the I–V characteristic for 0.5×, 1× and 2× intensity, all reaching zero
   at the same −V<sub>s</sub>. Advanced adds Millikan's V<sub>s</sub>–f graph
   (gradient h/e).

## Controls

- **Level:** Standard or Advanced (A level).
- Photons view: **metal** (Cs, Na, K, Zn, Cu, Pt), **wavelength** 200–800 nm,
  **intensity** 0.1–5×; Advanced: show the energy budget bar chart.
- Photocell view: **metal**, **frequency** 4–20 × 10¹⁴ Hz, **intensity scale**
  0.5–3×, **anode voltage** −7 to +3 V; Advanced: show the V<sub>s</sub>–f graph.
- Play/Pause, Reset, speed ½×–4×, **animation quality** (Low/Medium/High/Ultra:
  number of particles, glow and trails only, never the physics).
- Presets (12): blue light on caesium; red light on caesium; very bright red light;
  dim violet light; right at the threshold; visible light on zinc; UV on zinc;
  platinum (deep UV only); brighter light, same V<sub>s</sub>; higher frequency,
  bigger V<sub>s</sub>; find the stopping voltage; Millikan's straight line.

Readouts: E<sub>photon</sub>, φ, KE<sub>max</sub>, λ₀, f, f₀ (Advanced: fastest
electron speed and its de Broglie wavelength); for the photocell f, f₀, V<sub>s</sub>,
λ, current, saturation current (Advanced: h/e, electrons per second). Physics notes
for each view (Standard and Advanced text), and 3 exam questions with live mark
schemes using the current metal and wavelength.

## The model

    E = hf = hc/λ          KE_max = hf − φ          λ₀ = hc/φ,  f₀ = φ/h
    eV_s = hf − φ   →   V_s = (h/e)(f − f₀)

h = 6.626 × 10⁻³⁴ J s, c = 3.00 × 10⁸ m/s, e = 1.602 × 10⁻¹⁹ C (as in the old page).
Work functions: Cs 2.10, K 2.30, Na 2.36, Zn 4.3, Cu 4.7, Pt 5.65 eV.

Assumptions: emitted electrons have kinetic energies spread evenly from 0 to
KE<sub>max</sub> (deeper electrons lose some energy), so the current falls in a
straight line from saturation at V = 0 to zero at −V<sub>s</sub>; intensity 1 is
10¹² photons/s with 20% quantum efficiency (saturation current 32 nA). Left out:
reflection, heating, contact potential, electrons knocked off the anode, space
charge, thermionic emission. The animation is slowed down enormously.

## Batch run

Runs a model photocell experiment many times with no drawing: voltmeter readings
have a random error (normal, 0.01 V resolution), electrons are counted in 10 ns
windows (Poisson numbers), and LED peak wavelengths have a random uncertainty.
Repeat or sweep mode, histogram or mean ± SD with theory, summary statistics and
CSV download. One-click experiments:

1. **Stopping voltage against frequency** (caesium, 6–18 × 10¹⁴ Hz): straight line;
   h = e × gradient (within about 1%), φ from the intercept.
2. **Planck's constant from LEDs** (200 students, 6 LEDs): mean 6.63 × 10⁻³⁴ J s,
   SD about 3%.
3. **Work function from the intercept** (sodium): mean 2.36 eV, SD about 0.11 eV.
4. **Does brighter light give a bigger V<sub>s</sub>?** No: flat at 1.21 V.
5. **Is the current proportional to intensity?** Yes: about 32 nA per unit.
6. **Is there a threshold frequency?** Zero current below 5.08 × 10¹⁴ Hz.
