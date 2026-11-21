# simulations

Interactive science simulations for teaching (GCSE / iGCSE / WJEC level).
They are grouped into one folder per subject, and each simulation sits in its
own folder with its own README.

**Start here: open [`index.html`](index.html)** in Chrome or Edge. It lists
every simulation by subject with a picture, a search box and links to each
one's worksheets.

Most simulations are a single HTML file: open it in Chrome or Edge, with no
install and no internet needed. Run any other commands from inside the
project's own folder.

## How the simulations are built

All one hundred and sixteen simulations are built with the shared toolkit (the
front page no longer marks any as "★ Enhanced", since every one is): one hundred and two rebuilt showpieces, which replaced the earlier versions in
their folders, and seven newer ones (Quantum Wave Lab, Special Relativity, Wind
Tunnel, Lightning, Sound Made Visible, Murmuration, Turing Patterns). They share a small
toolkit in [`tools/kit/`](tools/kit/) and have guided investigations in place
of worksheets. The earlier Three-Body Chaos Lab is kept in
`astrophysics/three_body_chaos/original_lab/`, and the earlier Gravitational
Lensing simulation in `astrophysics/gravitational_lensing/original/`. The earlier
Gas in a Box, Collision Theory, Galaxy Collisions, Epidemics, Fields and
Orbits, Traffic Flow, Optics, Heart and Circulation, Tropical Storms, Foxes and
Rabbits, Electrolysis, Running the Economy, Radioactive Decay, Photoelectric
Effect, Energy Systems, Bonding, Circuits, Enzymes, the Greenhouse Effect, Crude Oil,
Cracking and Polymers, Training and Adaptation, Projectile Motion, Photosynthesis and
Respiration, Market Failure and Externalities, Flooding and Storm Hydrographs, Supermarket
Queues, Energy Changes, Lungs and Gas Exchange, Tectonic Hazards, Car Crash Safety, Firms
and Competition, Arousal and Performance, Stellar Life Cycle, Inheritance, Simple Harmonic
Motion, Membranes and Movement, Antibiotic Resistance, Exoplanet Hunting, Reactivity of
Metals, Young's Modulus (now Materials Science), Nuclear Fusion, States of Matter, Circular Motion, Crystallisation, Atomic Structure, Groups 1 and 7, DNA and Cell Division, Ecosystems, Homeostasis, Aerofoil Flow, Ice–Albedo Tipping Points, Carbon Cycle, Dark Matter, Expanding Universe, Planet Formation, Taxes and Price Controls, Labour Market, Circular Flow, Sport Biomechanics, Fitness Testing, Skill Acquisition, Atomic Spectra, Nuclear Fission, Particle Physics, Acids, Salts and Tests, Chromatography, Moles and Reacting Masses, Immunity, Plant Transport, Biotechnology, Inside a Sound, Strings, Air Columns, Build a Timbre, Pitch and Intervals, Rhythm and Metre, Sea Level Rise, Weather Chaos, Rivers and Landforms, Trade and Exchange Rates, Inequality, Electrochemical Cells, Capacitors, Magnetism and Induction, Heating and Insulation, Coasts, Glaciers, and Weathering, Slopes and Landslides are likewise kept in each folder's `original/`, with their worksheets,
and are linked from "The model" tab of the new versions.

## Typing slider values

In every simulation you can click the value shown beside a slider (or Tab to
it and press Enter), type an exact value and press Enter. The unit is
optional: "2.2", "2.2 mF" and "2200 μF" all work on a slider showing farads.
Values beyond the slider's range go to the nearest end.

## Batch run

Every single-file simulation has a **📊 Batch run** button. It runs the model
many times without drawing, either repeating with different random luck or
sweeping one setting. It plots the results against the theory and gives the
mean, spread and standard error. Results can be downloaded as CSV. Each
simulation has ready-made batch experiments that pose a question, such as
"Does pV = NkT hold?", and a note on why the results scatter around the theory.

## Sound

Simulations where hearing helps can play sound (Web Audio, nothing to
install). Sound is always **off when a page opens**, so a room of laptops
stays quiet: press the play or sound button to hear it. Use headphones in class.

- **Music** (all six): every note, chord, timbre and rhythm plays with ▶ Play.
- **Gas in a Box**: ticks for molecules hitting the walls (busier = higher pressure).
- **Simple Harmonic Motion**: a light-gate beep once per period.
- **Lightning**: thunder arriving about 3 s per km after the flash.
- **Nerve Impulse**: an audio monitor that pops as each impulse passes electrode B.
- **Heart and Circulation** (heart sounds), **Radioactive Decay** (Geiger
  clicks) and **Chladni Plates** (the plate's note) have their own sound switch.

Kit pages turn this on with the `sound` option (a 🔇/🔊 button in the header)
and the shared `K.sound` helper: see `tools/kit/README.md`.

## Worksheets

Every simulation has a `worksheets.html` beside it: printable A4 sheets
(set-up, prediction, results to fill in, questions), then teacher notes. Open it
and press **Print** (or save as PDF).

- **Kit simulations:** one sheet for every ready-made investigation (the
  cards in the **Investigate** tab) and one for every batch experiment. The
  teacher notes give what to look for, the theory and the result of a test run
  of each batch experiment. The same sheets can be printed from inside the
  simulation: each investigation card and each batch experiment has a
  **📄 Worksheet** button, and the Investigate tab has buttons for all of them
  (with or without teacher notes). They are made by the shared kit, so a new
  or changed investigation always has an up-to-date sheet. Regenerate the
  files with `node worksheets.js` in [`tools/kit/`](tools/kit/) (after
  `node build.js`).
- **The other simulations:** one sheet per batch experiment, generated by the
  scripts in [`tools/worksheets/`](tools/worksheets/), which run every batch
  experiment in a headless browser. Re-run them after changing a simulation's
  batch experiments.

## Physics

| Folder | What it is | How to run |
|---|---|---|
| [`physics/gas_in_a_box/`](physics/gas_in_a_box/) | Gas in a Box ★: every atom followed; pressure, the gas laws, Maxwell–Boltzmann speeds, Brownian motion and diffusion from collisions alone (also listed under Chemistry) | Open `gas-in-a-box.html` |
| [`physics/simple_harmonic_motion/`](physics/simple_harmonic_motion/) | Simple Harmonic Motion ★: pendulums and springs, SHM graphs and energy, damping, forced oscillation and resonance, Barton's pendulums; plus a double-pendulum chaos tab | Open `simple-harmonic-motion.html` |
| [`physics/states_of_matter/`](physics/states_of_matter/) | States of matter ★: particles, heating and cooling curves, specific heat capacity, latent heat and the method of mixtures (also listed under Chemistry) | Open `states-of-matter.html` |
| [`physics/youngs_modulus/`](physics/youngs_modulus/) | Materials Science ★: Young's modulus and Searle's method; stress–strain curves for ductile, brittle and polymer solids; edge dislocations and foreign atoms (atoms model); grain boundaries and Hall–Petch; crack propagation and toughened glass; rubber hysteresis and cross-links | Open `youngs-modulus.html` |
| [`physics/projectile_motion/`](physics/projectile_motion/) | Projectile Motion ★: two motions at once (shadows, time markers, velocity arrows), range and angle, energy; drag, wind and spin at A level | Open `projectile-motion.html` |
| [`physics/circular_motion/`](physics/circular_motion/) | Circular motion ★: ball on a string, banked bends, loop-the-loop, conical pendulum | Open `circular-motion.html` |
| [`physics/waves/`](physics/waves/) | Ripple Tank ★: a 2-D wave-equation solver. Interference, slits, refraction, lenses, mirrors and Doppler; draw your own walls and glass | Open `waves.html` |
| [`physics/optics_refraction/`](physics/optics_refraction/) | Light: Refraction, Lenses and Fibres ★: a ray-traced optical bench with blocks, prisms, real lenses, a fibre and a raindrop | Open `optics-refraction.html` |
| [`physics/fields_orbits/`](physics/fields_orbits/) | Fields and Orbits ★: electric and gravitational fields you can sculpt and tilt, launched ions and satellites, Kepler's laws, escape speed (also listed under Astrophysics) | Open `fields-orbits.html` |
| [`physics/circuits/`](physics/circuits/) | Electric Circuits ★: series and parallel with flowing charge, sensors, I–V curves, internal resistance | Open `circuits.html` |
| [`physics/capacitors/`](physics/capacitors/) | Capacitors ★: charging and discharging, τ = RC, ln V against t, energy ½CV² and the half lost in R, series and parallel | Open `capacitors.html` |
| [`physics/magnetism_induction/`](physics/magnetism_induction/) | Magnetism and induction ★: F = BIL sin θ, orbits r = mv/qB, Faraday and Lenz with a moving magnet, transformers, the d.c. motor and commutator | Open `magnetism-induction.html` |
| [`physics/photoelectric_effect/`](physics/photoelectric_effect/) | The Photoelectric Effect ★: photons, work function, stopping potential, Millikan's h, the gold-leaf electroscope | Open `photoelectric-effect.html` |
| [`physics/atomic_spectra/`](physics/atomic_spectra/) | Atomic spectra ★: energy levels, emission and absorption lines, ΔE = hc/λ, diffraction grating, lasers and population inversion | Open `atomic-spectra.html` |
| [`physics/radioactive_decay/`](physics/radioactive_decay/) | Radioactive Decay ★: random decay and half-life of real isotopes; α, β and γ through paper, aluminium and lead | Open `radioactive-decay.html` |
| [`physics/nuclear_fission/`](physics/nuclear_fission/) | Nuclear fission ★: chain reactions, k and critical mass, control rods, mass defect and binding energy per nucleon | Open `nuclear-fission.html` |
| [`physics/particle_physics/`](physics/particle_physics/) | Particle physics ★: the atom and isotopes, quarks and hadrons, conservation of Q, B, L and S, bubble chamber, Feynman diagrams | Open `particle-physics.html` |
| [`physics/nuclear_fusion/`](physics/nuclear_fusion/) | Nuclear fusion ★: the Coulomb barrier, quantum tunnelling, the Gamow peak, and the temperature and pressure needed in stars and reactors | Open `nuclear-fusion.html` |
| [`physics/heating_insulation/`](physics/heating_insulation/) | Heating and insulation ★: cooling cans and insulators, Leslie cube and coin drop, a house's heat loss, insulation savings and payback | Open `heating-insulation.html` |
| [`physics/density_pressure/`](physics/density_pressure/) | Density and pressure ★: density practicals with errors and uncertainty, eureka can bias, p = F/A, hρg, floating and Archimedes, terminal velocity and Stokes' law | Open `density-pressure.html` |
| [`physics/energy_resources/`](physics/energy_resources/) | Energy resources ★: power stations and Sankey diagrams, Run Britain hour by hour, I²R losses and transformers, wind power ∝ v³ and the model turbine, GB generation 2000–2024 | Open `energy-resources.html` |
| [`physics/quantum_wave_lab/`](physics/quantum_wave_lab/) | Quantum Wave Lab ★: the 2-D Schrödinger equation live. Tunnelling, double slit one particle at a time, uncertainty, measurement (A level and beyond) | Open `quantum-wave-lab.html` |
| [`physics/special_relativity/`](physics/special_relativity/) | Special relativity ★: light clocks, simultaneity, train and tunnel, twin paradox, muons, from any frame, with a spacetime diagram | Open `special-relativity.html` |
| [`physics/wind_tunnel/`](physics/wind_tunnel/) | Wind tunnel ★: viscous flow by the lattice Boltzmann method, with vortex streets, lift and drag (complements Aerofoil Flow) | Open `wind-tunnel.html` |
| [`physics/lightning/`](physics/lightning/) | Lightning ★: a branching leader grown by the dielectric breakdown model, with rods, towers and trees to build and a strike tally | Open `lightning.html` |
| [`physics/chladni_plates/`](physics/chladni_plates/) | Sound Made Visible ★: Chladni figures on plates and a drum, resonance curve, movable driver, sound | Open `chladni-plates.html` |

## Chemistry

| Folder | What it is | How to run |
|---|---|---|
| [`chemistry/collision_theory/`](chemistry/collision_theory/) | Collision Theory and Rates ★: reacting molecules, activation energy, catalysts, surface area, runaway reactions, the Arrhenius plot | Open `collision-theory.html` |
| [`chemistry/dynamic_equilibrium/`](chemistry/dynamic_equilibrium/) | Dynamic Equilibrium ★: A + B ⇌ AB with real particle collisions; Le Chatelier, K and Q, energy profile | Open `dynamic-equilibrium.html` |
| [`chemistry/atomic_structure/`](chemistry/atomic_structure/) | Atomic structure ★: build atoms and ions, isotopes, weighing atoms for Ar; s, p, d and ionisation energies at A level | Open `atomic-structure.html` |
| [`chemistry/bonding/`](chemistry/bonding/) | Bonding and Structure ★: ionic, covalent and metallic bonds forming; heat, conduct and hammer the structure | Open `bonding.html` |
| [`chemistry/organic_chemistry/`](chemistry/organic_chemistry/) | Crude Oil, Cracking and Polymers ★: molecules in a fractionating column, cracking and the bromine test, combustion, addition polymers, free-radical substitution | Open `organic-chemistry.html` |
| [`chemistry/periodic_groups/`](chemistry/periodic_groups/) | Groups 1 and 7 ★: alkali metals with water, halogen states and displacement, trends down the groups | Open `periodic-groups.html` |
| [`chemistry/reactivity_metals/`](chemistry/reactivity_metals/) | Reactivity ★: metals with water and acid, displacement with temperature rises, extraction (blast furnace, electrolysis), redox | Open `reactivity-metals.html` |
| [`chemistry/electrolysis/`](chemistry/electrolysis/) | Electrolysis ★: ions drifting to the electrodes, products at each, half-equations, Faraday's law | Open `electrolysis.html` |
| [`chemistry/energy_changes/`](chemistry/energy_changes/) | Energy Changes ★: bonds breaking and forming on a profile, cup calorimetry with extrapolation, burning alcohols, ΔG at A level | Open `energy-changes.html` |
| [`chemistry/acids_salts_tests/`](chemistry/acids_salts_tests/) | Acids, salts and tests ★: pH and indicators, titration and pH curves, solubility and precipitation, ion and gas tests with unknowns, buffers | Open `acids-salts-tests.html` |
| [`chemistry/chromatography/`](chemistry/chromatography/) | Chromatography ★: paper chromatography and Rf, purity and identification, method mistakes, TLC and gas chromatography | Open `chromatography.html` |
| [`chemistry/crystallisation/`](chemistry/crystallisation/) | Crystallisation ★: crystals growing in cooling magma (granite, basalt, obsidian) and in salt solutions; solubility curves, seeds, JMAK theory | Open `crystallisation.html` |
| [`chemistry/moles_reacting_masses/`](chemistry/moles_reacting_masses/) | Moles and reacting masses ★: the mole, limiting reactants, empirical formula and water of crystallisation practicals, gas volumes, atom economy | Open `moles-reacting-masses.html` |
| [`chemistry/electrochemical_cells/`](chemistry/electrochemical_cells/) | Electrochemical cells ★: displacement and reactivity, simple cells, half-cells and E°, CP10, fuel and storage cells, redox titrations | Open `electrochemical-cells.html` |

## Biology and medicine

Biology sims follow Edexcel International GCSE Biology (4BI1) at Standard level and OCR A level Biology A (H420) at Advanced. The medical sims live in `medical/` but appear in this section of the front page.

| Folder | What it is | How to run |
|---|---|---|
| [`biology/natural_selection/`](biology/natural_selection/) | Natural Selection ★: moths on changing bark with real camouflage, mutation, extinction and a "be the bird" mode | Open `natural-selection.html` |
| [`biology/murmuration/`](biology/murmuration/) | Murmuration ★: a 3-D flock of starlings from three local rules, with a hunting falcon | Open `murmuration.html` |
| [`biology/turing_patterns/`](biology/turing_patterns/) | Turing Patterns ★: spots, stripes and mazes from a reaction–diffusion model; paint, heal, and map the patterns | Open `turing-patterns.html` |
| [`biology/epidemics/`](biology/epidemics/) | Epidemics and Vaccination ★: a town followed hour by hour; R0, herd immunity, flattening the curve, isolation | Open `epidemics.html` |
| [`biology/predator_prey/`](biology/predator_prey/) | Foxes and Rabbits ★: every animal followed; population cycles, carrying capacity, culling, refuges, extinction | Open `predator-prey.html` |
| [`biology/membranes/`](biology/membranes/) | Membranes and Movement ★: particles crossing by diffusion, osmosis and active transport, agar cubes (SA:V), potato osmosis, water potential | Open `membranes.html` |
| [`biology/enzymes/`](biology/enzymes/) | Enzymes ★: molecules colliding and fitting; temperature, pH, denaturing, substrate and enzyme concentration, inhibitors, Vmax, Q10 | Open `enzymes.html` |
| [`biology/photosynthesis_respiration/`](biology/photosynthesis_respiration/) | Photosynthesis and Respiration ★: pondweed and limiting factors, leaf gas exchange and indicator tubes, respirometer, RQ and the Calvin cycle | Open `photosynthesis-respiration.html` |
| [`biology/inheritance/`](biology/inheritance/) | Inheritance ★: fruit-fly breeding lab, Punnett squares, pedigrees, dihybrid crosses, sex linkage, linkage, epistasis, chi-squared | Open `inheritance.html` |
| [`biology/dna_cell_division/`](biology/dna_cell_division/) | DNA and cell division ★: the double helix, protein synthesis from a real gene, mutations, mitosis, root tip squash, meiosis | Open `dna-cell-division.html` |
| [`biology/ecosystems/`](biology/ecosystems/) | Ecosystems ★: food webs and energy pyramids, the nitrogen cycle, quadrats and transects, succession, eutrophication | Open `ecosystems.html` |
| [`biology/homeostasis/`](biology/homeostasis/) | Homeostasis ★: blood glucose and diabetes, thermoregulation, the kidney and ADH, negative and positive feedback | Open `homeostasis.html` |
| [`biology/immunity/`](biology/immunity/) | Immunity ★: primary and secondary responses, memory cells, vaccination, passive immunity, antibiotics and viruses | Open `immunity.html` |
| [`biology/plant_transport/`](biology/plant_transport/) | Plant transport ★: xylem and phloem, transpiration and the potometer, cohesion–tension, phototropism and geotropism | Open `plant-transport.html` |
| [`biology/biotechnology/`](biology/biotechnology/) | Biotechnology ★: glasshouse limiting factors and profit, fertiliser and leaching, fermenters, genetic engineering, selective breeding | Open `biotechnology.html` |

### Medical and anatomical (`medical/` folder)

| Folder | What it is | How to run |
|---|---|---|
| [`medical/heart_circulation/`](medical/heart_circulation/) | Heart and Circulation ★: a beating heart from pressure and flow; valves, blood pressure, exercise, heart disease, ECG, pressure–volume loop | Open `heart-circulation.html` |
| [`medical/nerve_impulse/`](medical/nerve_impulse/) | Nerve Impulse ★: Hodgkin–Huxley equations along an axon; threshold, refractory period, myelin, MS lesion, channel block | Open `nerve-impulse.html` |
| [`medical/antibiotic_resistance/`](medical/antibiotic_resistance/) | Antibiotic Resistance ★: bacteria, drug levels and the immune system in one patient; stopping early, missed doses, resistance | Open `antibiotic-resistance.html` |
| [`medical/gas_exchange/`](medical/gas_exchange/) | Lungs and Gas Exchange ★: breathing chest, an alveolus with red cells loading oxygen, altitude, exercise, lung disease, carbon monoxide, dissociation curve | Open `gas-exchange.html` |

## Engineering

| Folder | What it is | How to run |
|---|---|---|
| [`engineering/earthquake_buildings/`](engineering/earthquake_buildings/) | Earthquake Engineering ★: a shake table for three buildings; resonance, bracing, base isolation, tuned mass damper | Open `earthquake-buildings.html` |
| [`engineering/traffic_flow/`](engineering/traffic_flow/) | Traffic Flow and Phantom Jams ★: jams from nothing, backward-travelling waves, roadworks, self-driving cars | Open `traffic-flow.html` |
| [`engineering/car_crash/`](engineering/car_crash/) | Car Crash Safety ★: slow-motion crashes with crumple zones, seatbelts and airbags (momentum and impulse), plus a collisions lab (also listed under Physics) | Open `car-crash.html` |
| [`engineering/aerofoil_flow/`](engineering/aerofoil_flow/) | Aerofoil flow ★: a 2D wind tunnel with the panel method; pressure, streamlines, lift, camber and the Magnus effect | Open `aerofoil-flow.html` |

## Climate and physical geography

Geography sims follow Edexcel GCSE Geography A (1GA0) at Standard level and Edexcel A level Geography (9GE0) at Advanced.

| Folder | What it is | How to run |
|---|---|---|
| [`climate/greenhouse_effect/`](climate/greenhouse_effect/) | The Greenhouse Effect ★: sunlight and infrared packets, the energy balance, feedbacks, volcanoes, Venus and Mars, 1850 to 2100 | Open `greenhouse-effect.html` |
| [`climate/ice_albedo/`](climate/ice_albedo/) | Ice–albedo ★: the ice–albedo feedback, snowball Earth, tipping points and hysteresis (energy balance model) | Open `ice-albedo.html` |
| [`climate/carbon_cycle/`](climate/carbon_cycle/) | Carbon cycle ★: stores and flows from 1750 to 2300, the ocean and land sinks, acidification, emission scenarios | Open `carbon-cycle.html` |
| [`climate/sea_level_rise/`](climate/sea_level_rise/) | Sea Level Rise ★: thermal expansion and land ice, five pathways to 2300, storm surges and return periods, sea walls, committed rise | Open `sea-level-rise.html` |
| [`climate/forest_fire/`](climate/forest_fire/) | Wildfire ★: fire spread with wind, slope, drought and embers; percolation tipping point; firebreak challenge | Open `forest-fire.html` |
| [`climate/weather_chaos/`](climate/weather_chaos/) | Weather Chaos ★: the butterfly effect, Lorenz 63 and 96, forecast horizon, Lyapunov exponents, ensembles | Open `weather-chaos.html` |
| [`climate/flooding_hydrographs/`](climate/flooding_hydrographs/) | Flooding and Storm Hydrographs ★: drainage basin and hillslope flows, storm hydrographs, lag time, urbanisation, flood management, case studies, flood frequency | Open `flooding-hydrographs.html` |
| [`climate/river_landforms/`](climate/river_landforms/) | Rivers and Landforms ★: Bradshaw model, fieldwork and Spearman's rank, Hjulström curve, meanders and oxbow lakes, waterfalls and gorges, the Tees | Open `river-landforms.html` |
| [`climate/coasts/`](climate/coasts/) | Coasts ★: wave height and fetch, constructive and destructive waves, headlands and bays, cave to stump, longshore drift and spits, Holderness and terminal groyne syndrome, the Bruun rule | Open `coasts.html` |
| [`climate/glaciers/`](climate/glaciers/) | Glaciers ★: mass balance and the ELA, advance and retreat with moraines, warm-based sliding, corrie aspect, V- to U-shaped valleys, freeze–thaw | Open `glaciers.html` |
| [`climate/tropical_storms/`](climate/tropical_storms/) | Tropical Storms ★: grow, steer and land a hurricane; surge and impacts, a whole season, a warmer world | Open `tropical-storms.html` |
| [`climate/tectonic_hazards/`](climate/tectonic_hazards/) | Tectonic Hazards ★: plate boundaries and the Benioff zone, P and S waves and triangulation, a tsunami crossing the ocean, disaster risk | Open `tectonic-hazards.html` |
| [`climate/slopes_landslides/`](climate/slopes_landslides/) | Weathering, slopes and landslides ★: freeze–thaw and chemical weathering against climate, the factor of safety and pore water pressure, roots, undercut cliffs, soil creep, landslides and rainfall thresholds | Open `slopes-landslides.html` |
| [`climate/fieldwork_sampling/`](climate/fieldwork_sampling/) | Fieldwork ★: sampling methods and bias, mean, median and IQR, scatter graphs and box plots, Spearman's rank, chi-squared, Student's t-test, power and false alarms | Open `fieldwork-sampling.html` |

## Astrophysics

| Folder | What it is | How to run |
|---|---|---|
| [`astrophysics/planet_formation/`](astrophysics/planet_formation/) | Planet formation ★: embryos to planets over 100 Myr; the frost line, runaway gas giants, giant impacts, red dwarfs | Open `planet-formation.html` |
| [`astrophysics/stellar_life_cycle/`](astrophysics/stellar_life_cycle/) | Stellar Life Cycle ★: a star's whole life, its black-body spectrum and its H–R track | Open `stellar-life-cycle.html` |
| [`astrophysics/exoplanet_hunting/`](astrophysics/exoplanet_hunting/) | Exoplanet Hunting ★: transits and the Doppler wobble, folding light curves, Kepler's third law, the habitable zone | Open `exoplanet-hunting.html` |
| [`astrophysics/galaxy_collisions/`](astrophysics/galaxy_collisions/) | Galaxy Collisions ★: hundreds of thousands of stars; tidal tails, rings, streams, mergers, the Milky Way and Andromeda | Open `galaxy-collisions.html` |
| [`astrophysics/expanding_universe/`](astrophysics/expanding_universe/) | Expanding universe ★: red-shift, a galaxy survey with standard candles, Hubble's law, H₀ and the age of the universe | Open `expanding-universe.html` |
| [`astrophysics/gravitational_lensing/`](astrophysics/gravitational_lensing/) | Black Holes and Gravitational Lensing ★: a ray-traced black hole with accretion disc, Einstein rings and arcs, microlensing planets, Eddington 1919 | Open `gravitational-lensing.html` |
| [`astrophysics/dark_matter/`](astrophysics/dark_matter/) | Dark matter ★: rotation curves of five galaxies, Doppler slit spectra, halo fitting with χ², MOND | Open `dark-matter.html` |
| [`astrophysics/three_body_chaos/`](astrophysics/three_body_chaos/) | Three-Body Chaos ★: N-body gravity with a "twin universe" to watch prediction fail (the earlier outcome-map lab is in `original_lab/`) | Open `three-body-chaos.html` |

## Mathematics

Standard level follows Pearson Edexcel AS Mathematics (8MA0); Advanced follows A level Mathematics (9MA0). The statistics simulations for these courses are in the Statistics section below.

| Folder | What it is | How to run |
|---|---|---|
| [`mathematics/calculus_explorer/`](mathematics/calculus_explorer/) | Calculus Explorer: differentiation from first principles (chord to tangent), the gradient function, stationary points with f'' and points of inflection, concave/convex, areas by rectangles and the trapezium rule against the exact integral (A level Mathematics) | Open `calculus-explorer.html` |
| [`mathematics/numerical_methods/`](mathematics/numerical_methods/) | Numerical Methods: change of sign and bisection (and how asymptotes and repeated roots fool it), iteration x = g(x) with staircase and cobweb diagrams, convergence and divergence, Newton–Raphson and its failures, error charts showing linear and quadratic convergence (A level Mathematics) | Open `numerical-methods.html` |
| [`mathematics/vectors_kinematics/`](mathematics/vectors_kinematics/) | Kinematics and Vectors: s–t and v–t graphs with tangent gradients and signed areas, SUVAT, variable acceleration (s = pt³ + qt² + rt), distance vs displacement; draggable 2D vectors (a ± b, λa, unit vectors, direction); projectiles as r and v vectors with range against angle (A level Mathematics) | Open `vectors-kinematics.html` |

## Statistics

| Folder | What it is | How to run |
|---|---|---|
| [`statistics/central_limit_theorem/`](statistics/central_limit_theorem/) | Central Limit Theorem ★: draw any population, watch sample means form a bell curve; live confidence intervals | Open `central-limit-theorem.html` |
| [`statistics/queues/`](statistics/queues/) | Supermarket Queues ★: random arrivals, utilisation and Erlang C, one snake or many queues, variability, Little's law | Open `queues.html` |
| [`statistics/hypothesis_testing/`](statistics/hypothesis_testing/) | Hypothesis Testing: binomial tests (one- and two-tailed, critical regions, actual significance level, p-values) and the normal test for a mean; Type I/II errors and power from hundreds of simulated tests (A level Mathematics) | Open `hypothesis-testing.html` |
| [`statistics/distributions/`](statistics/distributions/) | Probability Distributions: a Galton board builds B(n, p) ball by ball (nCr routes, P(X ≤ b), mean and variance); normal areas, inverse normal and points of inflection; normal approximation with continuity correction; Poisson as an extension (A level Mathematics) | Open `distributions.html` |
| [`statistics/regression_correlation/`](statistics/regression_correlation/) | Regression and Correlation: draggable scatter diagram with the least-squares line, residuals and squared residuals, PMCC, outliers and leverage, interpolation vs extrapolation, correlation vs causation, critical values of r, and log graphs for y = axⁿ (Kepler's planets) and y = kbˣ (A level Mathematics) | Open `regression-correlation.html` |
| [`statistics/sampling_data/`](statistics/sampling_data/) | Sampling and Data: an illustrative large data set of daily weather (8 stations, 1987 and 2015); census and five sampling methods, cleaning tr and n/a, box plots with outliers, histograms with frequency density, cumulative frequency, mean, σ, quartiles and IQR (A level Mathematics) | Open `sampling-data.html` |

## Economics

Standard level follows Edexcel International GCSE Economics (4EC1); Advanced follows Edexcel A level Economics A (9EC0).

| Folder | What it is | How to run |
|---|---|---|
| [`economics/supply_demand/`](economics/supply_demand/) | The Trading Pit ★: supply and demand from haggling buyers and sellers; tax, price cap and floor | Open `supply-demand.html` |
| [`economics/taxes_price_controls/`](economics/taxes_price_controls/) | Taxes and price controls ★: tax incidence and elasticity, subsidies, maximum and minimum prices, black markets, deadweight loss, UK examples | Open `taxes-price-controls.html` |
| [`economics/firms_competition/`](economics/firms_competition/) | Firms and Competition ★: cost and revenue curves, MC = MR, entry and exit across market structures, the prisoner's dilemma | Open `firms-competition.html` |
| [`economics/labour_market/`](economics/labour_market/) | Labour market ★: wages from MRP and reservation wages, minimum wage, monopsony with MCL, two markets and mobility | Open `labour-market.html` |
| [`economics/circular_flow/`](economics/circular_flow/) | Circular flow ★: five sectors, injections and withdrawals, the multiplier round by round, the accelerator, AD/AS and output gaps | Open `circular-flow.html` |
| [`economics/running_the_economy/`](economics/running_the_economy/) | Running the Economy ★: five targets, Bank Rate, fiscal and supply-side policy, shocks, the real UK 1997–2025, money creation | Open `running-the-economy.html` |
| [`economics/externalities/`](economics/externalities/) | Market Failure and Externalities ★: externalities with the welfare-loss triangle, taxes, subsidies, limits, information, cap and trade, public goods, lemons | Open `externalities.html` |
| [`economics/trade_exchange_rates/`](economics/trade_exchange_rates/) | Trade and Exchange Rates ★: comparative advantage and terms of trade, tariffs, quotas and customs unions, the market for pounds, Marshall–Lerner and the J-curve, real GBP 2000–2025 | Open `trade-exchange-rates.html` |
| [`economics/inequality/`](economics/inequality/) | Inequality ★: Lorenz and Gini, income against wealth, UK taxes and benefits, poverty, inheritance, the trading game, Kuznets and Laffer curves | Open `inequality.html` |

## Physical Education

Standard level follows OCR GCSE (9–1) Physical Education (J587); Advanced follows OCR A level Physical Education (H555).

| Folder | What it is | How to run |
|---|---|---|
| [`physical_education/energy_systems/`](physical_education/energy_systems/) | Energy Systems ★: ATP, PC, glycogen and oxygen tanks in races, intervals and games; deficit, OBLA, EPOC, recovery | Open `energy-systems.html` |
| [`physical_education/training_adaptation/`](physical_education/training_adaptation/) | Training and Adaptation ★: Q = SV × HR in a session, then weeks of training: principles, methods, fitness and fatigue, adaptations, tapering, injury risk (also listed under Biology) | Open `training-adaptation.html` |
| [`physical_education/sport_biomechanics/`](physical_education/sport_biomechanics/) | Sport biomechanics ★: levers, planes and axes, stability, force plates and impulse, projectiles with spin, tuck and spin, bounce | Open `sport-biomechanics.html` |
| [`physical_education/fitness_testing/`](physical_education/fitness_testing/) | Fitness testing ★: 11 tests on a simulated squad, ratings, protocols, test–retest reliability, validity, training and the smallest worthwhile change | Open `fitness-testing.html` |
| [`physical_education/skill_acquisition/`](physical_education/skill_acquisition/) | Skill acquisition ★: Hick's law (test yourself), information processing and the PRP, practice types, guidance, feedback, classification, schema | Open `skill-acquisition.html` |
| [`physical_education/arousal_performance/`](physical_education/arousal_performance/) | Arousal and Performance ★: inverted-U, drive, catastrophe, ZOF, mental preparation, social facilitation, Ringelmann | Open `arousal-performance.html` |
| [`physical_education/luck_and_skill/`](physical_education/luck_and_skill/) | Luck, Skill and the League ★: does the best team win? League against cup, home advantage, the sacked-manager bounce | Open `luck-and-skill.html` |

## Music

Standard level follows GCSE Music (with the GCSE Physics of sound); Advanced
follows A level Music and A level Physics (stationary waves, beats). Every page
plays its sounds with the Web Audio API: press Play, and use headphones in class.
The audit of the earlier music pack is kept in [`music/original_audit/`](music/original_audit/).

| Folder | What it is | How to run |
|---|---|---|
| [`music/inside_sound/`](music/inside_sound/) | Inside a Sound ★: compressions and rarefactions, oscilloscope traces, waveforms and harmonics, decibels, speed of sound in air, water and steel | Open `inside-sound.html` |
| [`music/strings/`](music/strings/) | Strings ★: f = (1/2L)√(T/μ), frets, plucking position and missing harmonics, pluck, strike and bow, the sonometer practical, stiff strings | Open `strings.html` |
| [`music/air_columns/`](music/air_columns/) | Air Columns ★: open and closed pipes, odd harmonics, finger holes, overblowing, temperature and tuning, end correction, resonance tube | Open `air-columns.html` |
| [`music/build_timbre/`](music/build_timbre/) | Build a Timbre ★: Fourier synthesis, instrument presets, ADSR envelope, spectral centroid, the missing fundamental, autocorrelation pitch | Open `build-timbre.html` |
| [`music/pitch_intervals/`](music/pitch_intervals/) | Pitch and Intervals ★: keyboard and stave, interval names and spelling, equal temperament against just intonation, beats, consonance and roughness | Open `pitch-intervals.html` |
| [`music/rhythm_metre/`](music/rhythm_metre/) | Rhythm and Metre ★: step sequencer, BPM, simple, compound and irregular metres, backbeat, syncopation score, swing, polyrhythm, human timing | Open `rhythm-metre.html` |

## History

`engineering/fluid_dynamics/` (now retired), `chemistry/chem_sims/` (now retired) and `physics/physics_sims/` (now retired)
were moved here from their own repositories (`tb861123/Fluid_dynamics`,
`tb861123/chem_sims` and `tb861123/physics-sims`) with their full commit
history. Use `git log --follow -- <folder>` to see a project's history. The Python
fluid dynamics app has since been replaced by `engineering/aerofoil_flow/`;
its code is still in the history. The WJEC Streamlit app has likewise been
replaced by the single-file physics simulations (every one of its 28 pages
was converted or merged), and so has the Edexcel iGCSE chemistry app: its
20 pages became the single-file chemistry simulations.
