# Galaxy Collisions

A 3D teaching simulation of colliding and merging galaxies. It shows tidal tails and bridges, collisional ring galaxies, starbursts and mergers, and why dark matter halos make galaxies merge. It also shows why individual stars almost never collide.

## How to run

Open `galaxy-collisions.html` in Chrome or Edge. Nothing needs installing, and no internet is needed.

## Controls

- **Presets** (left): Antennae galaxies, Mice galaxies, Cartwheel ring, Milky Way & Andromeda, Satellite eaten, Prograde flyby, Retrograde flyby, No dark matter, Full N-body merger.
- **The galaxies:** visible mass of galaxy A, mass ratio B : A, dark matter halos on/off, halo mass (× visible mass).
- **The orbit:** closest approach (pericentre, kpc) and approach speed (× escape speed). Alternatively, choose "Milky Way & Andromeda (measured today)": 785 kpc apart, closing at 109 km/s, with Andromeda's sideways speed as a slider.
- **Disc orientations:** tilt and tilt direction of each disc. 0° = prograde (spins with the orbit), 180° = retrograde.
- **Simulation:** restricted (Toomre) model or self-gravitating N-body model (4000 particles, Barnes–Hut tree). You can also set gas on/off and the random seed. Press **Reset** to apply changes.
- **Quality** (number of stars in the restricted model): Low 2000, Medium 8000 (default), High 16 000, Ultra 24 000. More stars give finer tails and rings but cost more each frame; if the computer can't keep up, the speed note under the picture says so. The Milky Way & Andromeda preset uses half the chosen number because it runs 30× faster. Presets don't change your Quality choice, which is remembered in this browser (press **Reset** to apply a change). Batch runs use their own number of test stars ("Test stars per run"), so Quality doesn't change them.
- **View:** drag to rotate, scroll or use +/− to zoom, double-click to reset. Top/Side buttons, centre on either galaxy or the centre of mass, and auto zoom.
- **Speed:** 1× = 15 million years per second; ½× to 30×.

The right-hand panel shows a running explanation and readouts:

- time
- core separation and relative speed
- closest approach
- stars in tails, and stars escaping
- merged yes/no
- star-formation rate
- expected star–star collisions

It also has graphs of separation and tails over time.

## The model

Units: kpc, Myr and 10¹⁰ M☉, with G = 0.044985 kpc³ (10¹⁰ M☉)⁻¹ Myr⁻².

- **Each galaxy** has visible matter as a Plummer sphere (g = GMr/(r²+a²)^{3/2}, a ≈ 2.5 kpc for a Milky Way), plus an optional dark halo as a Hernquist sphere (g = GM/(r+a)², a ≈ 30 kpc). Sizes scale as M^{1/3}.
- **Stars** are massless test particles in an exponential disc, on circular orbits. They are moved with a leapfrog (kick–drift–kick) integrator in 1 Myr steps. The live "stars in tails" and "escaping" percentages are counted over these stars, so they are a little noisier at Low Quality (2000 stars) and smoother at High and Ultra.
- **The orbit** is set from energy and angular momentum: L = r_p √(2(ε − U(r_p)/μ)).
- **Dynamical friction** (Chandrasekhar): a = −4πG²M lnΛ ρ [erf X − 2X e^{−X²}/√π] v/v³, with X = v/(√2σ). The mass M is cut to the part inside the tidal radius. The cores are joined when they are closer than their combined core sizes and moving slower than half the local escape speed.
  - lnΛ = 0.5 is lower than the textbook 2–3. With a rigid, never-stripped halo, larger values make every pair merge on the first approach.
  - With this value the model reproduces the published Milky Way–Andromeda timing: with v_tan = 17 km/s, first pass at 4.2 Gyr and merger at 5.86 Gyr, compared with van der Marel et al. 2012's 3.9 and 5.86 Gyr. Equal-mass pairs merge after two or three passes.
- **Gas:** a quarter of the disc particles are gas clouds. Their density is counted in 1.5 kpc boxes.
  - Squeezed gas (more than 2.5× its starting density) is shown blue, as new stars forming.
  - Squeezed gas is "sticky": it is damped towards the box's mean velocity over 100 Myr, so colliding gas sinks inwards.
  - The star-formation rate follows the Schmidt law, ∝ ρ^1.5, with each cloud's boost capped at 10× (feedback).
- **Star–star collisions:** each star accumulates n σ v Δt (1 + v_esc*²/v²) through the other galaxy's stars. Here σ = π(2R☉)², n = ρ/0.5 M☉ and v_esc* = 618 km/s. The total is scaled up to the real number of stars.
- **N-body mode:** 4000 particles (halo 55%, bulge, disc). Velocities come from the Jeans equation. The force uses a Barnes–Hut tree with θ = 0.7, softening 1 kpc and 2 Myr steps.

**Left out:** gas pressure, shocks and cooling; feedback, apart from the cap; black holes; halo stripping and deformation (in the restricted model); other Local Group galaxies (the LMC and M33); cosmic expansion.

## Batch experiments

Batch runs use the restricted model with **800 test stars** and no drawing. Merger-time runs use no stars at all, only the two cores. Star outcomes are measured 400 Myr after the first closest approach. Typical results on a laptop:

| Experiment | Result | Theory / published |
|---|---|---|
| Closer pass → more tail stars (sweep r_p 8–60 kpc, prograde flyby) | Tail stars fall from about 18% at 8–17 kpc to 0% at 60 kpc | Impulse approximation predicts about 0%. Prograde resonance beats it. |
| Prograde, random orientations (50 runs) | 13.1 ± 2.0% in tails | Impulse approximation about 0% |
| Retrograde, random orientations (50 runs) | 0.0% in tails | Impulse approximation about 0%: agrees |
| Milky Way–Andromeda with measurement errors (200 runs; v_tan = 57 ± 33 km/s, plus distance and mass errors) | 28% merge within 10 Gyr; mean merger time 6.2 ± 1.8 Gyr (range 3.8–9.9) | 5.9 Gyr (van der Marel 2012); about 50% chance within 10 Gyr (Sawala et al. 2025) |
| Halo mass sweep (2–20× visible) | Merger time falls from 2.9 to 1.3 Gyr | No simple theory. Without halos: no merger. |
| Star–star collisions (prograde flyby, 50 runs) | 0.016 ± 0.011 collisions among 240 billion stars | Straight-line estimate N σ Σ: 0.013 |

All six experiments run in under 3 seconds each.

**Batch settings table.** The batch panel lists every starting setting a run uses: the orbit (chosen closest approach, or the measured Milky Way–Andromeda orbit), dark matter halos on/off, and the random variation between runs; galaxy A's mass, mass ratio, halo mass, closest approach and approach speed (or, for the Milky Way–Andromeda orbit, Andromeda's sideways speed, approach speed of 109.3 km/s and distance of 785 kpc), both discs' tilts and tilt directions, the size of the "disc orientations ±" variation (10° by default) and the number of test stars per run (800 by default). The last four used to be fixed in the code; their defaults are the old values, so every experiment gives the same result. Sweeping galaxy A's tilt tilts both discs, as before. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in, and **↺ Use my left-panel settings** copies the left panel into it.

The outcomes *time of first close pass* and *closest approach reached* now work in batch runs: before, a run with no test stars stopped after its first time step, so these two were always blank. (No one-click experiment records them.)

## Limitations

- In the restricted model, real halos are replaced by rigid spheres plus a friction formula, so merger times are uncertain by tens of percent.
- The N-body mode is grainy, and its discs thicken over about 1 Gyr.
- The gas is only a rough "sticky cloud" model. It shows where gas gets compressed, not real hydrodynamics.
