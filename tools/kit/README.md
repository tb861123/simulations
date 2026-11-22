# The simulation kit

A small shared toolkit behind the simulations (page frame, sliders,
charts, Investigate cards, Batch run window). So that every simulation stays a
single self-contained HTML file, the kit is copied into each page by a build
step:

```
kit.css      shared styles
kit.js       shared toolkit (K.app, K.slider, K.chart, batch run…)
src/*.js     one script per simulation: the science lives here
build.js     writes <subject>/<folder>/<name>.html from the three parts
```

To change a simulation, edit its file in `src/` (or the kit), then run from
inside this folder:

```
node build.js
```

Do not edit the built `.html` files by hand: the next build overwrites them.

Every `K.slider` lets the user click its value and type an exact one (units and
prefixes optional). The kit tries each slider position through the slider's own
`fmt` and picks the closest display, so log scales and custom formats work with
no extra code. Sliders whose display is only words are not typeable.
To add a simulation, write `src/<name>.js`, add a line to the `SIMS` table in
`build.js`, and list its folder in `ENHANCED` in the front page `index.html`.

Built with the kit: waves, dynamic_equilibrium, natural_selection,
nerve_impulse, earthquake_buildings, forest_fire, three_body_chaos,
central_limit_theorem, supply_demand, luck_and_skill, quantum_wave_lab,
special_relativity, wind_tunnel, gravitational_lensing, lightning,
chladni_plates, murmuration, gas_in_a_box, collision_theory,
galaxy_collisions, epidemics, fields_orbits, traffic_flow, optics_refraction,
heart_circulation, tropical_storms, turing_patterns, predator_prey,
electrolysis, running_the_economy, radioactive_decay, photoelectric_effect,
energy_systems, bonding, circuits, enzymes, greenhouse_effect,
organic_chemistry, training_adaptation, projectile_motion,
photosynthesis_respiration, externalities, flooding_hydrographs, queues,
energy_changes, gas_exchange, tectonic_hazards, car_crash, firms_competition,
arousal_performance, stellar_life_cycle, inheritance, simple_harmonic_motion,
membranes, antibiotic_resistance, exoplanet_hunting, reactivity_metals,
youngs_modulus, nuclear_fusion, states_of_matter, circular_motion, crystallisation, atomic_structure, periodic_groups, dna_cell_division, ecosystems, homeostasis, aerofoil_flow, ice_albedo, carbon_cycle, dark_matter, expanding_universe, planet_formation, taxes_price_controls, labour_market, circular_flow, sport_biomechanics, fitness_testing, skill_acquisition, atomic_spectra, nuclear_fission, particle_physics, acids_salts_tests, chromatography, moles_reacting_masses, immunity, plant_transport, biotechnology, inside_sound, strings, air_columns, build_timbre, pitch_intervals, rhythm_metre, sea_level_rise, weather_chaos, river_landforms, trade_exchange_rates, inequality, electrochemical_cells, capacitors, magnetism_induction, heating_insulation, hypothesis_testing, distributions, regression_correlation, sampling_data, calculus_explorer, numerical_methods, vectors_kinematics, mechanics_forces, complex_numbers, matrix_transformations, rate_equations, spectroscopy, transition_metals, organic_mechanisms, differential_equations, series_convergence, polar_curves, vectors_3d, population_and_famine, arms_race_and_alliances, revolutions_and_unrest, great_depression, exposure_triangle, lens_optics, light_and_colour, composition_and_sampling, markov_chains, behavioural_economics, development_economics, financial_markets, hyperbolic_functions, sorting_algorithms, searching_and_hashing, pathfinding, breakeven_and_margins, cash_flow_forecast, investment_appraisal, inventory_and_supply_chain, electoral_systems, voting_paradoxes, gerrymandering, materials_properties, manufacturing_processes, ergonomics_anthropometrics, ethical_dilemmas, argument_validity, problem_of_evil.

## Sound

Pass `sound: "what you will hear"` to `K.app` to add a 🔇/🔊 button to the
header. Sound starts off on every page load. Then call the shared helper anywhere:
`K.sound.tone(freq, { dur, vol, type, at, glide })`, `K.sound.noise({ dur,
vol, filter, freq, sweep, at })`, `K.sound.click()`, or `const h =
K.sound.hum(); h.set(freq, vol)` every frame for a continuous tone (it fades
by itself if not updated). All of these do nothing while sound is off, so
batch runs and worksheet generation stay silent. `K.sound.on` says whether
it is on. Used by Gas in a Box, Simple Harmonic Motion, Lightning and Nerve
Impulse; the music pages, Heart and Circulation, Radioactive Decay and
Chladni Plates have their own Play buttons or sound switches, coasts, glaciers, slopes_landslides, density_pressure, energy_resources, fieldwork_sampling.

## Levels and the Revise tab

Pass `levels: { std, adv, specs: { std, adv } }` to `K.app` for a Standard /
Advanced switch (`ui.level`, `ui.onLevel`); investigations with `lvl: "adv"`
are hidden at Standard. Pass `revise: { ideas: [{ lvl, tag, text }],
questions: [{ lvl, q, marks, ans }] }` for a Revise tab; `q` and `ans` may be
functions so that questions can use the numbers on screen.

## Worksheets

Every investigation (`missions`) and every batch experiment (`batch`) gets a
printable A4 worksheet automatically: set-up steps, the question, a
prediction, a table to record results, and questions to think about. Inside a
page, each investigation card and each batch experiment has a **📄 Worksheet**
button, and the Investigate tab prints all of them (with or without teacher
notes). Teacher notes use each investigation's `hint`, each experiment's
`note` and its `theory`. Nothing extra is needed in a simulation's source.

`node worksheets.js` (after `node build.js`) writes `worksheets.html` beside
every kit page, adding the result of a test run of each batch experiment
(fixed seeds) to the teacher notes. Pass folder names to do only some:
`node worksheets.js waves enzymes`. It needs Playwright.
