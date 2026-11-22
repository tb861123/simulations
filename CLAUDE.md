# Working agreements for the simulations repo

Standing instructions from the project owner. These apply to every change.

## This is the only repo for simulation work

All simulation projects live here, grouped by subject. Each subject folder
holds one folder per simulation:

| Subject folder | Simulations |
|---|---|
| `physics/` | `gas_in_a_box`, `simple_harmonic_motion`, `nuclear_fusion`, `states_of_matter`, `youngs_modulus`, `projectile_motion`, `circular_motion`, `waves`, `optics_refraction`, `fields_orbits`, `photoelectric_effect`, `atomic_spectra`, `radioactive_decay`, `nuclear_fission`, `particle_physics`, `circuits`, `capacitors`, `magnetism_induction`, `heating_insulation`, `density_pressure`, `energy_resources`, `quantum_wave_lab`, `special_relativity`, `wind_tunnel`, `lightning`, `chladni_plates` |
| `chemistry/` | `collision_theory`, `dynamic_equilibrium`, `crystallisation`, `atomic_structure`, `bonding`, `organic_chemistry`, `periodic_groups`, `reactivity_metals`, `electrolysis`, `energy_changes`, `acids_salts_tests`, `chromatography`, `moles_reacting_masses`, `electrochemical_cells`, `rate_equations`, `spectroscopy`, `transition_metals`, `organic_mechanisms` |
| `biology/` | `natural_selection`, `murmuration`, `turing_patterns`, `epidemics`, `predator_prey`, `membranes`, `enzymes`, `photosynthesis_respiration`, `inheritance`, `dna_cell_division`, `ecosystems`, `homeostasis`, `immunity`, `plant_transport`, `biotechnology` |
| `engineering/` | `earthquake_buildings`, `traffic_flow`, `car_crash`, `aerofoil_flow` |
| `medical/` (shown under "Biology and medicine" on the front page) | `heart_circulation`, `nerve_impulse`, `antibiotic_resistance`, `gas_exchange` |
| `climate/` | `greenhouse_effect`, `ice_albedo`, `carbon_cycle`, `sea_level_rise`, `forest_fire`, `weather_chaos`, `flooding_hydrographs`, `river_landforms`, `coasts`, `glaciers`, `tropical_storms`, `tectonic_hazards`, `slopes_landslides`, `fieldwork_sampling`, `globalisation_migration`, `urban_places`, `water_insecurity` |
| `astrophysics/` | `planet_formation`, `stellar_life_cycle`, `exoplanet_hunting`, `galaxy_collisions`, `expanding_universe`, `gravitational_lensing`, `dark_matter`, `three_body_chaos` |
| `mathematics/` | `calculus_explorer`, `numerical_methods`, `vectors_kinematics`, `mechanics_forces`, `complex_numbers`, `matrix_transformations`, `differential_equations`, `series_convergence`, `polar_curves`, `vectors_3d`, `markov_chains`, `hyperbolic_functions` |
| `statistics/` | `central_limit_theorem`, `queues`, `hypothesis_testing`, `distributions`, `regression_correlation`, `sampling_data` |
| `economics/` | `supply_demand`, `taxes_price_controls`, `firms_competition`, `labour_market`, `circular_flow`, `running_the_economy`, `externalities`, `trade_exchange_rates`, `inequality`, `behavioural_economics`, `development_economics`, `financial_markets` |
| `business/` | `breakeven_and_margins`, `cash_flow_forecast`, `investment_appraisal`, `inventory_and_supply_chain` |
| `politics/` | `electoral_systems`, `voting_paradoxes`, `gerrymandering` |
| `physical_education/` | `energy_systems`, `training_adaptation`, `sport_biomechanics`, `fitness_testing`, `skill_acquisition`, `arousal_performance`, `luck_and_skill` |
| `music/` | `inside_sound`, `strings`, `air_columns`, `build_timbre`, `pitch_intervals`, `rhythm_metre` |
| `history/` | `population_and_famine`, `arms_race_and_alliances`, `revolutions_and_unrest`, `great_depression` |
| `photography/` | `exposure_triangle`, `lens_optics`, `light_and_colour`, `composition_and_sampling` |
| `design_technology/` (shown as "Design and Technology") | `materials_properties`, `manufacturing_processes`, `ergonomics_anthropometrics` |
| `religious_studies/` (shown as "Religion, Philosophy and Ethics") | `ethical_dilemmas`, `argument_validity`, `problem_of_evil` |
| `computing/` | `sorting_algorithms`, `searching_and_hashing`, `pathfinding`, `data_structures`, `logic_gates` |

Every simulation is one self-contained HTML file: open it in Chrome
or Edge.

The old repos (`Fluid_dynamics`, `chem_sims`, `physics-sims`) are retired.
Never commit to them; make every change here. A new simulation goes in its
own folder inside the right subject folder and gets a row in the root
`README.md`, a line in the `SIMS` list in the front page `index.html`, and a
thumbnail `thumbs/<folder>.jpg` (a 640×360 screenshot).

All one hundred and sixty-one simulations are kit-built (formerly tagged "★ Enhanced"; the front page
no longer shows the tag, but `ENHANCED` in `index.html` still holds each one's "Try:" line). A new
simulation gets an `ENHANCED` entry too: `waves`,
`dynamic_equilibrium`, `natural_selection`, `nerve_impulse`,
`earthquake_buildings`, `forest_fire`, `three_body_chaos`,
`central_limit_theorem`, `supply_demand`, `luck_and_skill`,
`quantum_wave_lab`, `special_relativity`, `wind_tunnel`,
`gravitational_lensing`, `lightning`, `chladni_plates`, `murmuration`,
`gas_in_a_box`, `collision_theory`, `galaxy_collisions`, `epidemics`,
`fields_orbits`, `traffic_flow`, `optics_refraction`, `heart_circulation`,
`tropical_storms`, `turing_patterns`, `predator_prey`, `electrolysis`,
`running_the_economy`, `radioactive_decay`, `photoelectric_effect`,
`energy_systems`, `bonding`, `circuits`, `enzymes`, `greenhouse_effect`,
`organic_chemistry`, `training_adaptation`, `projectile_motion`,
`photosynthesis_respiration`, `externalities`, `flooding_hydrographs`, `queues`,
`energy_changes`, `gas_exchange`, `tectonic_hazards`, `car_crash`,
`firms_competition`, `arousal_performance`, `stellar_life_cycle`, `inheritance`,
`simple_harmonic_motion`, `membranes`, `antibiotic_resistance`, `exoplanet_hunting`,
`reactivity_metals`, `youngs_modulus`, `nuclear_fusion`, `states_of_matter`, `circular_motion`, `crystallisation`, `atomic_structure`, `periodic_groups`, `dna_cell_division`, `ecosystems`, `homeostasis`, `aerofoil_flow`, `ice_albedo`, `carbon_cycle`, `dark_matter`, `expanding_universe`, `planet_formation`, `taxes_price_controls`, `labour_market`, `circular_flow`, `sport_biomechanics`, `fitness_testing`, `skill_acquisition`, `atomic_spectra`, `nuclear_fission`, `particle_physics`, `acids_salts_tests`, `chromatography`, `moles_reacting_masses`, `immunity`, `plant_transport`, `biotechnology`, `inside_sound`, `strings`, `air_columns`, `build_timbre`, `pitch_intervals`, `rhythm_metre`, `sea_level_rise`, `weather_chaos`, `river_landforms`, `trade_exchange_rates`, `inequality`, `electrochemical_cells`, `capacitors`, `magnetism_induction`, `heating_insulation`, `coasts`, `glaciers`, `slopes_landslides`, `density_pressure`, `energy_resources`, `fieldwork_sampling`, `hypothesis_testing`, `distributions`, `regression_correlation`, `sampling_data`, `calculus_explorer`, `numerical_methods`, `vectors_kinematics`, `mechanics_forces`, `complex_numbers`, `matrix_transformations`, `rate_equations`, `spectroscopy`, `transition_metals`, `organic_mechanisms`, `differential_equations`, `series_convergence`, `polar_curves`, `vectors_3d`, `population_and_famine`, `arms_race_and_alliances`, `revolutions_and_unrest`, `great_depression`, `exposure_triangle`, `lens_optics`, `light_and_colour`, `composition_and_sampling`, `markov_chains`, `behavioural_economics`, `development_economics`, `financial_markets`, `hyperbolic_functions`, `sorting_algorithms`, `searching_and_hashing`, `pathfinding`, `breakeven_and_margins`, `cash_flow_forecast`, `investment_appraisal`, `inventory_and_supply_chain`, `electoral_systems`, `voting_paradoxes`, `gerrymandering`, `materials_properties`, `manufacturing_processes`, `ergonomics_anthropometrics`, `ethical_dilemmas`, `argument_validity`, `problem_of_evil`, `globalisation_migration`, `urban_places`, `water_insecurity`, `data_structures`, `logic_gates`. They are the one
place with a shared toolkit: edit `tools/kit/kit.*` or
`tools/kit/src/<name>.js`, then run `node build.js` from inside `tools/kit/`
to regenerate the single-file pages in their subject folders. Never edit
their built HTML by hand. Every ready-made investigation (Investigate card)
and every batch experiment has a printable worksheet: the kit builds them
(📄 Worksheet buttons inside the page), and `node worksheets.js` in
`tools/kit/` writes each one's `worksheets.html` with teacher notes and test-run
results. Re-run it after changing a kit simulation's investigations or batch
experiments. Kit pages are not handled by `tools/worksheets/` or `tools/tidy/`. Several have a Standard / Advanced
switch and a Revise tab (key ideas with spec tags, exam practice) built into
the kit: see `tools/kit/README.md`. Where an enhanced simulation
replaced an earlier one, the earlier version and its worksheets are kept in
that simulation's `original/` folder and linked from the new one's notes.

`tools/worksheets/` holds the teacher-side scripts that run every batch
experiment and generate each simulation's `worksheets.html`. Re-run them for
any simulation whose batch experiments change (see its README).

Each folder is self-contained: its scripts use paths relative to their own
folder, and commands run from inside that folder. Keep it that way. Don't
add cross-folder imports or shared files without being asked.

## Always merge to `main`

Finish work by merging to `main` and pushing. Don't leave it on a feature
branch waiting for a PR. Delete the feature branch afterwards.

Deleting a *remote* branch fails from the cloud environment (the credential
can push and merge but not delete refs). If that happens, say so plainly and
give the owner the link to delete it on GitHub, rather than leaving it
silently undone.

## Say whether setup needs re-running

End every change with an explicit line saying which applies:

- **No setup needed**: only code, HTML or docs changed. Pull and run.
- **Re-run setup**: only if a project ever gains a `requirements.txt` or
  setup script again and it changes. Name the folder and the command.
  (Every simulation is currently a single HTML file with nothing to install.)

## Audience and style

These are teaching simulations for school students (GCSE / iGCSE / WJEC, and
A level for economics, business, politics, design and technology, religious studies, PE, music, physical geography, biology, physics, chemistry, history and photography, with a Standard / Advanced level switch).
Comment code so a student can follow the science. List a model's
assumptions and simplifications inside the simulation itself.

Every single-file simulation has a "Batch run" mode: it runs the model many
times headlessly (repeat with new random seeds, or sweep one setting), plots
the results against theory with mean, SD and standard error, and exports CSV.
Give new simulations one too, with a few one-click batch experiments.

The owner uses laptops and Surface tablets in a desktop web browser.
Design for those screens (about 1280×720 and up); phone layouts are not
needed.
