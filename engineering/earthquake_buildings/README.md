# Earthquakes and Tall Buildings

A teaching simulation (GCSE / iGCSE level) showing why buildings sway in
earthquakes, why buildings of some heights suffer most, and how engineers
protect them with tuned mass dampers, base isolation, bracing and dampers.

## How to run

Open `earthquake-buildings.html` in Chrome or Edge. There is nothing to install
and it works offline.

## What you see

- **Centre:** one or two buildings swaying on moving ground. The sway is
  drawn bigger than life (the "Exaggerate the sway" slider). Each storey is
  coloured by its inter-storey drift right now: green (small), gold (cracking
  starts), red (severe damage or collapse risk). Storeys that have cracked or
  failed at any time are marked ✕ / ✖. A strip below shows the ground
  acceleration against time.
- **Right:** a story of what is happening, readouts (natural period, the rule
  of thumb T ≈ 0.1 × storeys, peak roof displacement, peak drift, peak roof
  acceleration in g, bearing movement, damper swing) and two graphs: roof sway
  against time, and the frequency response (how far the roof swings for steady
  shaking at each frequency, with the natural frequencies marked).
- **Left:** presets and controls.

## Controls

- Building: number of storeys (1–40), frame material (steel, concrete,
  timber), bracing (extra stiffness ×1–4), added dampers (extra damping).
- Tuned mass damper: mass (% of the building), tuning, damping, and a button
  for Den Hartog's best tuning.
- Base isolation: isolated period and bearing damping.
- Second building beside it: none, the same building without the protection,
  or a different height.
- Shaking: steady sine wave (frequency and size, both live), a slow sweep up
  through frequencies, a random earthquake (magnitude, peak acceleration on
  rock, soil type, earthquake number), or "push the top and let go".
- Play / Pause, Reset, speeds ¼× to 10× (1× = real time).

## Presets

Resonance sweep · Shake at resonance · Push and let go · Short stiff vs tall
bendy · Mexico City 1985 · Tuned mass damper (with vs without) · Base-isolated
hospital · Bracing · Added dampers · Timber vs concrete.

## The model

Each floor is a lumped mass m joined to the floor below by a shear spring
(storey stiffness k) and damping. Relative to the ground, floor i obeys

    m ü_i = −k(u_i − u_(i−1)) + k(u_(i+1) − u_i) − damping − m a_g(t)

solved with 4th-order Runge–Kutta (time step 5 ms or less).

- Materials: steel 600 t per floor, 2% damping; concrete 900 t, 5%;
  timber 250 t, 4%. Storey stiffness is set so T₁ ≈ 0.1 N (steel),
  0.09 N (concrete), 0.11 N (timber).
- Natural frequencies are found exactly (eigenvalues of the tridiagonal
  mass–spring chain, by Sturm-sequence bisection). For identical storeys,
  ω_n = 2√(k/m) sin((2n−1)π / (2(2N+1))).
- Damping is Rayleigh damping set to the material's ratio in modes 1 and 2.
- Tuned mass damper: an extra mass on the roof on its own spring and dashpot;
  Den Hartog's best tuning f_d/f₁ = 1/(1+μ), ζ = √(3μ/(8(1+μ)³)).
- Base isolation: a base slab on rubber bearings whose stiffness gives the
  chosen isolated period, with 5–30% damping.
- Earthquakes: white noise through a Kanai–Tajimi soil filter (rock 3 Hz,
  stiff soil 2 Hz, soft soil 1 Hz, lake-bed clay 0.5 Hz with low damping),
  a 0.15 Hz high-pass filter, and a rise–hold–decay envelope whose strong
  part lasts longer for bigger magnitudes. Scaled so its peak equals the
  rock acceleration × the soil amplification (×1, ×1.25, ×1.6, ×4).
- Frequency response (theory): the steady-state solution of
  (K − ω²M + iωC)U = −M·A, solved with complex arithmetic.

### Assumptions and simplifications

Identical storeys 3.5 m tall; sideways shaking only (no twisting or vertical
motion); the frame stays linear, so cracked storeys are shown but do not get
softer, collapse, or change the period; no soil–structure interaction or
foundation rocking; no pounding between neighbouring buildings; the random
earthquakes lack the pulses and long surface waves of real records.

## Batch run

The **📊 Batch run** button opens a panel that runs the model many times with
no drawing (`runOnce(params, seed)`, seeded mulberry32 random numbers).
Repeat mode runs many random earthquakes (optionally varying the quake size by
±30%, a setting in the table), with an optional with/without comparison (damper, isolation, bracing,
added damping). Sweep mode changes one setting (shaking frequency, storeys,
rock acceleration, damper tuning, added damping). Results show a histogram or
mean ± 1 SD, the theory overlay, summary statistics (n, mean, SD, standard
error, min, max, theory, difference in % and in standard errors, % of runs
past the cracking limit) and fits. Results can be downloaded as CSV.

**Batch settings table.** The batch panel lists every starting setting a run
uses: the building (storeys, frame material, bracing, added damping, the tuned
mass damper's mass, tuning and damping, Den Hartog tuning, base isolation
period and damping), the ground motion (sine frequency and size, sweep top
frequency, earthquake magnitude, rock acceleration, soil, "shake at the
frame's own frequency"), and two things that used to be fixed: the random
quake-size spread (30%) and the largest time step (10 ms). Defaults are the
old values, so results are unchanged. The experiments start from the page's
opening preset ("Short stiff vs tall bendy") with their own settings on top.
Tick one setting to vary it and give from / to / step (+ adds the step, ×
multiplies by it; up to 60 steps, previewed as you type); every other setting
stays at the value shown, and a run uses exactly what the table shows.
Unticking goes back to Repeat. One-click experiments fill the whole table in
from fixed default settings, never from the left panel, so they give the same
results in any order; **↺ Use my left-panel settings** copies the left panel
into the table instead.

Batch experiments (results from testing):

| Experiment | Result |
|---|---|
| Resonance of a one-storey building (sweep 2–12 Hz) | Matches the damped-oscillator curve to 0.2% on average; peak at 6.37 Hz |
| Resonances of a 10-storey building (0.3–6 Hz) | Matches the steady-state theory (0.0%); peaks at modes 1–3 (0.95, 2.83, 4.65 Hz) |
| Is T ≈ 0.1 × storeys? (free vibration, 1–40 storeys) | Measured T = 0.053 + 0.0999 N, equal to the exact theory; close to the rule of thumb |
| Tuned mass damper in 200 earthquakes | Mean peak drift 1.08% → 0.68%; runs past cracking 49.5% → 7% |
| Base isolation for a hospital (200 quakes, 0.4 g rock) | Mean peak roof acceleration 1.19 g → 0.13 g |
| Damper tuning at resonance | Smallest swing near 1/(1+μ) ≈ 0.97; matches steady-state theory |

Real buildings scatter around these results because each earthquake is
different and real buildings are not uniform.
