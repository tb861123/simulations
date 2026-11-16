# The simulation kit

A small shared toolkit behind the ★ enhanced simulations (page frame, sliders,
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
youngs_modulus, nuclear_fusion, states_of_matter, circular_motion, crystallisation, atomic_structure, periodic_groups, dna_cell_division, ecosystems, homeostasis, aerofoil_flow, ice_albedo, carbon_cycle.

## Levels and the Revise tab

Pass `levels: { std, adv, specs: { std, adv } }` to `K.app` for a Standard /
Advanced switch (`ui.level`, `ui.onLevel`); investigations with `lvl: "adv"`
are hidden at Standard. Pass `revise: { ideas: [{ lvl, tag, text }],
questions: [{ lvl, q, marks, ans }] }` for a Revise tab; `q` and `ans` may be
functions so that questions can use the numbers on screen.
