# Gas in a Box

A single, self-contained HTML file (`gas-in-a-box.html`) for teaching the
kinetic theory of gases (GCSE / iGCSE / A-level). It needs no install and no
internet: **open `gas-in-a-box.html` in Chrome or Edge**. Pick a preset; the
gas starts moving straight away.

Hundreds of molecules bounce about in a box. Nothing else is programmed in:
pressure, temperature, the spread of speeds, the mean free path, Brownian
motion and diffusion all come from the bouncing.

**The box is two-dimensional (flat).** The app says so and uses the 2D
formulas throughout (see below). It also shows a "3D-equivalent" pressure.

## What you can change

**The gas** (press *Reset* to apply):
- Gas: helium, neon, nitrogen, oxygen, argon, carbon dioxide or xenon (real masses and molecule sizes)
- An optional second gas (or the same gas in a second colour) and how much of it there is
- Number of molecules (20–1200)
- Starting speeds: all exactly the same, or already Maxwell–Boltzmann
- A partition down the middle (gas 1 left, gas 2 right), with a *Remove partition* button
- One big, heavy particle, for Brownian motion (with its trail)
- Random seed (the same seed gives exactly the same run)

**Takes effect at once:**
- Temperature. With plain walls every molecule is sped up or slowed down
  at once. With **heated walls**, molecules that hit a wall leave at the wall
  temperature, so the gas warms or cools over time.
- The piston (the right-hand wall) can be held still, pushed or pulled to a
  width at 20, 100 or 400 m/s (or dragged on the picture), or left free with
  a set outside pressure pushing on it.
- Colour molecules by speed or by gas.

Speed: ½×, 1×, 4×, 15×. At 1×, 25 ps of gas time pass each real second.

## Presets

| Preset | Idea |
|---|---|
| Speeds settle | Every molecule starts at the same speed; the histogram relaxes into the 2D Maxwell–Boltzmann curve |
| Boyle's law | Slow squeeze with heated walls (isothermal): pA = constant on the p–V graph |
| Charles's law | Free piston, walls heated from 150 K to 600 K: width ∝ T |
| Pressure law | Fixed box heated from 100 K to 700 K: p ∝ T, through 0 K |
| Brownian motion | Big particle's random walk; mean square displacement against time with the 4Dt theory |
| Light vs heavy | Helium and xenon start at the same speed and end with the same average KE (equipartition) |
| Adiabatic squeeze | Unheated walls: squeezing heats the gas; data follow pA² = constant (2D adiabat) |
| Mixing gases | The partition lifts and the two colours diffuse together; diffusion-equation theory curve |
| Very thin gas | 40 molecules: mean free path longer than the box |

## Readouts and graphs

Temperature (from KE), 2D pressure from wall impulses (averaged over 100 ps),
3D-equivalent pressure, pA ÷ NkT (ideal 1, and the value with molecule size),
mean speed, measured and theoretical mean free path and collision rate, mean KE
of each gas, and the Brownian particle's diffusion coefficient. Graphs: live speed
histogram with the 2D Maxwell–Boltzmann curve, plus a choice of pA ÷ NkT over time,
p–V diagram (isotherm and adiabat), p against T, width against T, Brownian mean
square displacement, or mixing progress.

## The model

- Units inside the code: nm, ps, atomic mass units; k = 0.0083145 u·nm²/ps² per K.
  Box 50 nm high, width 15–110 nm. Real kinetic diameters (e.g. N₂ 0.364 nm), drawn to scale.
- Molecules are smooth hard discs with perfectly elastic collisions (momentum
  swapped along the line of centres). Time steps are chosen so the fastest
  molecule moves at most ¼ of a diameter per step; a cell grid finds neighbours.
- 2D kinetic theory used for the comparisons:
  - average KE = kT (two ways to move), so T = ⟨½mv²⟩ / k
  - ideal gas: pA = NkT, with p = force per unit length (N/m, shown as mN/m)
  - with molecule size (hard discs): pA/NkT = 1 + 2φ(1 − 7φ/16)/(1 − φ)², φ = area fraction covered
  - speeds: Rayleigh distribution f(v) = (mv/kT)·exp(−mv²/2kT); mean √(πkT/2m)
  - mean free path λ = 1/(2√2·n·d); collision rate = mean speed / λ
  - adiabatic (no heat flow) in 2D: γ = 2, so T·A and p·A² stay constant
  - self-diffusion D = (1/2nd)·√(kT/πm); mixing follows the diffusion equation across the box
  - Brownian particle (radius 3 nm, 2000 u): D = √(kT/2πm)/(2nR), ⟨r²⟩ = 4D(t − τ(1 − e^(−t/τ))), τ = MD/kT
  - 3D-equivalent pressure: a 3D gas with the same spacing between molecules, p = n^(3/2)·kT
- Heated walls send molecules back with a random speed typical of the wall temperature.
  A free piston has a mass of 2000 u and a little friction.

**Left out / where it differs from reality:** it is 2D; molecules don't attract
(no condensation) and don't spin or vibrate; the box is tiny so readings
fluctuate; the Brownian particle is much lighter than a real one of its size (this
changes how soon it starts random-walking, not D); the step-by-step collisions let
discs overlap slightly, so they behave about 1% smaller than their real size.

## Batch run

The **📊 Batch run** button opens a panel that runs the model many times with no
drawing (using a seeded random number generator so results can be repeated).
*Repeat* mode runs the same settings with different random starts and draws a
histogram; *Sweep* mode steps one setting (box width, temperature, number of
molecules or molecule mass) and plots mean ± 1 SD with the theory curve, with
optional log axes and a fitted gradient. Each batch reports n, mean, SD, standard
error, min, max, the theory value and the difference (in % and in standard errors),
and can be downloaded as CSV. Batch runs use one gas, unheated walls and a fixed piston.

Built-in experiments and typical results (on a laptop, all under 25 s):

| Question | Result |
|---|---|
| Does pV = NkT hold? (50 runs, N₂, 400 molecules, 300 K) | pA/NkT = 1.040 ± 0.001 (SE); ideal 1, molecule-size theory 1.049 |
| Boyle's law: p ∝ 1/V? (width 20–100 nm) | log–log gradient −1.058 (theory −1.051); each point within 3% |
| Pressure law: p ∝ T? (100–700 K) | straight line through about 0, gradient within 5% of theory |
| Do speeds settle into Maxwell–Boltzmann? (20 runs from equal speeds) | pooled histogram matches the Rayleigh curve; mean speed 375 m/s vs 374 m/s |
| Brownian motion: ⟨r²⟩ = 4Dt? (20 runs) | D = 0.086 ± 0.013 nm²/ps vs theory 0.084 |
| Mixing: more molecules mix slower? (200–1000 molecules) | mixing time rises roughly in proportion to N; within 10–30% of diffusion theory |
| Light vs heavy: v ∝ 1/√m? (4–131 u) | log–log gradient −0.507 (theory −0.500) |
