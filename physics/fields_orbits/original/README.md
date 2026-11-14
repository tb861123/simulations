# Fields and Orbits

A teaching simulation for iGCSE and A level physics.

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1): Section 8(b) Motion in the Universe (g differs between planets and moons; gravity keeps moons, planets, satellites and comets in orbit; comets' elliptical orbits; orbital speed = 2πr/T), Section 1 (weight = mg) and Section 2 (electric charge: like charges repel, unlike attract). Field strength and potential formulas and binary stars are A level, so Standard keeps those tabs as a gentle introduction.
- **Advanced (A level):** WJEC Eduqas A level Physics (Component 2, Topic 6 Fields, including electric potential V = kQ/r and gravitational potential Vg = −GM/r; Component 2, Topic 8 Orbits and the wider Universe; Component 3, Topic 11 binary stars).

The level hint changes with the tab and the level, and a key-ideas box tags each idea (iGCSE 4PH1, A level Eduqas, beyond the spec). It replaces two pages of the old WJEC Streamlit app: **05 Electric & Gravitational Fields** and **09 Orbital Motion**.

## How to run

Open `fields-orbits.html` in Chrome or Edge. Nothing to install and no internet needed.

## What it shows

Four modes, chosen with the tabs at the top of the main view:

| Mode | What you see |
|---|---|
| **Electric fields** | 1–4 point charges. Colour map of the potential, equipotentials, field lines with arrowheads, field arrows. A probe reads E and V. Drag charges and the probe; click to drop test charges. |
| **Gravitational fields** | 1–3 point masses (log-scale mass sliders), the same map tools, g and Vg at the probe. |
| **Orbits (Kepler's laws)** | A planet or satellite round the Earth, the Sun or another star, animated with RK4. Kepler's 2nd-law equal-area sectors, an escape-speed ring, orbit type, measured a³/T² against GM/4π², an energy graph, Kepler's 3rd-law table for the planets. Drag on the picture to launch your own planets. |
| **Binary stars** | Two stars round their common centre of mass: orbits, velocities, r₁, r₂, v₁, v₂, period, and the total mass and mass ratio worked back from the orbit. |

**Standard / Advanced level.** Advanced adds: a launched test particle (RK4, real units) with an energy-conservation graph and an electric vs gravitational comparison view and table (fields); two-body motion with a fixed centre of mass, Hohmann transfers and the galaxy rotation curve (orbits); inclination and radial-velocity curves (binary stars). The Doppler wobble of a star with a planet is left to the separate *Exoplanet hunting* simulation.

**Quality (Low / Medium / High / Ultra)** sets how finely the field maps are drawn: the colour map and equipotentials use 70² up to 340² points, 8 to 24 field lines per source and a smaller step along each line. Canvases are sized for the screen's pixel ratio. While a source is dragged the map is drawn at Low, then redrawn.

## Controls

- Left panel: level (Standard (iGCSE) / Advanced (A level)), presets (7 electric, 7 gravitational, 12 orbit, 6 binary; "Mars around the Sun" is new, for orbital speed = 2πr/T), charges or masses (position, size, sign), probe position, launch settings, central mass, r₀ (log slider), v₀/v_circular, planet mass, Hohmann target radius, dark-matter halo speed and galaxy mass, the binary stars' masses, separation, phase, trail and inclination.
- Centre: mode tabs, layer toggles, Play/Pause, Reset, Clear, speed ½×–4×, Quality, Batch run.
- Right panel: what's happening, readings, graphs (field vs distance log–log, energy against time, rotation curve, radial velocity), physics notes, exam practice with live mark schemes, and "How the model works".

## The model and equations

- E = kQ/r², V = kQ/r, F = kQ₁Q₂/r² (k = 8.99×10⁹ N m² C⁻²); g = GM/r², Vg = −GM/r, F = GM₁M₂/r² (G = 6.67×10⁻¹¹ N m² kg⁻²). Fields are summed exactly at every pixel (vectors for E and g, scalars for V).
- v_circ = √(GM/r), v_esc = √(2GM/r), T² = 4π²a³/GM, energy per kg ½v² − GM/r.
- Binary: r₁ = M₂d/(M₁+M₂), r₂ = M₁d/(M₁+M₂), T² = 4π²d³/G(M₁+M₂), v = ωr, v_r = v sin i cos φ.
- Hohmann: a = (r₁+r₂)/2, Δv from the vis-viva equation, transfer time π√(a³/GM).
- Rotation curve: v² = GM_visible/r + v_DM².

## Assumptions and simplifications

Point charges and masses; a flat 2-D slice of a 3-D field (line spacing is only a rough guide to strength); colour map on a squashed (asinh) scale; dropped test particles show direction only. Orbits: Newtonian point masses, no other bodies, drag or relativity; central bodies not to scale; 1× shows one orbit in about 10 s. Binary stars: circular orbits, no mass transfer or gravitational-wave decay. Galaxy: visible mass at the centre, dark matter as a flat speed. Full list inside the simulation.

## Exam practice

Built from the numbers on screen, with mark schemes, for the open tab.

- **Standard (iGCSE 4PH1):** electric: attraction and repulsion, charging by friction, earthing when refuelling, force and distance; gravity: weight on the Earth and the Moon, why g differs, field direction; orbits: orbital speed = 2πr/T from the live orbit, the force that keeps a satellite up, comets against planets, why Mars takes longer; binary stars: why both move, same period.
- **Advanced (A level, Eduqas):** the old app's field-strength, force, orbital speed, period, escape speed and binary star questions, plus electric potential and work W = qV, why field lines cross equipotentials at right angles, gravitational potential (and why it is negative), and a satellite's potential, kinetic and total energy.

## Batch experiments

Run with **📊 Batch run**. Each experiment sets all its own inputs. Batch runs use exact formulas and fixed integration settings, not the Quality setting.

**Batch settings table.** The panel lists every setting the chosen outcome uses: for field probes, the distance, the charge (or mass), the probe's reading error (3% by default) and its position error (1 cm by default); for orbits, the central mass, orbit radius, launch speed, the random spread in launch speed and, for the energy test, the time steps per orbit and number of orbits; for binary stars, both masses, the separation and the measurement errors in d and T. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill in the whole table (press ▶ Run batch to run), and **↺ Use my left-panel settings** copies the left panel into it.

| Experiment | What it tests | Typical result |
|---|---|---|
| Does E fall as 1/r²? | probe with 3% meter error and ±1 cm position error, r = 0.5–5 m | log–log gradient −2.00 (theory −2) |
| Kepler's third law: T² ∝ r³? | simulated periods, 0.2–30 AU | gradient 1.500 (theory 1.5); 1 AU → 1 year |
| Does Kepler's 3rd law hold for ellipses? | 200 random launch speeds; measured a³/T² | 1.000 AU³/yr² (theory 1.000), SD 3×10⁻⁷ |
| Is energy conserved over orbits? | fixed-step RK4, 25–400 steps per orbit | drift 1.6% → 1.5×10⁻⁶ %; gradient −5.0 (theory −4 or steeper) |
| Where does escape speed start? | furthest distance vs launch speed 1.0–1.6 v_c | matches v²/(2v_c² − v²); escapes above √2 |
| Weigh Sirius A and B | d (2%) and T (1%) errors → M₁ + M₂ | 3.01 ± 0.20 M☉ (theory 3.00, SD 0.19) |

Results can be downloaded as CSV.

## Changes from the old app

- Gravitational mass sliders go to 10³¹ kg so the Earth–Moon and star presets can be edited; orbit and binary sliders are logarithmic so every preset fits (the old app clipped Alpha Centauri to 10 AU and TRAPPIST-1 b to 0.1 M☉).
- Sirius A & B separation corrected from 8.2 AU to 19.8 AU so the period is the stated 50 years.
- Halley's Comet launched at 1.4025 × circular speed (e = 0.967, T ≈ 75 years); the old 1.5 × would have escaped. The "parabolic" label is now kept for speeds within 0.005 of √2, and open/closed orbits are decided by the sign of the energy.
- The test-particle sliders reach ±100 nC and 1 mg so that electric trajectories visibly curve.
- The galaxy rotation curve has its own visible-mass slider (10⁹–10¹² M☉); the old one used the central star's mass, which made the visible-matter curve invisible.
- The binary-star tab gained three exam questions (it had none).
