# Working agreements for the simulations repo

Standing instructions from the project owner. These apply to every change.

## This is the only repo for simulation work

All simulation projects live here, grouped by subject. Each subject folder
holds one folder per simulation:

| Subject folder | Simulations |
|---|---|
| `physics/` | `gas_in_a_box`, `double_pendulum`, `nuclear_fusion`, `states_of_matter`, `youngs_modulus`, `projectile_motion`, `circular_motion`, `waves`, `optics_refraction`, `fields_orbits`, `photoelectric_effect`, `atomic_spectra`, `radioactive_decay`, `nuclear_fission`, `particle_physics`, `circuits`, `capacitors`, `magnetism_induction` |
| `chemistry/` | `collision_theory`, `dynamic_equilibrium`, `crystallisation`, `atomic_structure`, `bonding`, `organic_chemistry`, `periodic_groups`, `reactivity_metals`, `electrolysis`, `energy_changes`, `acids_salts_tests`, `chromatography` |
| `biology/` | `natural_selection`, `epidemics`, `predator_prey` |
| `engineering/` | `earthquake_buildings`, `traffic_flow`, `car_crash`, `aerofoil_flow` |
| `medical/` | `heart_circulation`, `nerve_impulse`, `antibiotic_resistance`, `gas_exchange` |
| `climate/` | `greenhouse_effect`, `ice_albedo`, `carbon_cycle`, `sea_level_rise`, `forest_fire`, `weather_chaos`, `flooding_hydrographs`, `river_landforms`, `coasts`, `glaciers`, `tropical_storms`, `tectonic_hazards`, `slopes_landslides`, `fieldwork_sampling` |
| `astrophysics/` | `planet_formation`, `stellar_life_cycle`, `exoplanet_hunting`, `galaxy_collisions`, `expanding_universe`, `gravitational_lensing`, `dark_matter`, `three_body_chaos` |
| `statistics/` | `central_limit_theorem`, `queues` |
| `economics/` | `supply_demand`, `taxes_price_controls`, `firms_competition`, `labour_market`, `circular_flow`, `running_the_economy`, `externalities`, `trade_exchange_rates`, `inequality` |
| `physical_education/` | `energy_systems`, `training_adaptation`, `sport_biomechanics`, `fitness_testing`, `skill_acquisition`, `arousal_performance`, `luck_and_skill` |

Every simulation is one self-contained HTML file: open it in Chrome
or Edge.

The old repos (`Fluid_dynamics`, `chem_sims`, `physics-sims`) are retired.
Never commit to them; make every change here. A new simulation goes in its
own folder inside the right subject folder and gets a row in the root
`README.md`, a line in the `SIMS` list in the front page `index.html`, and a
thumbnail `thumbs/<folder>.jpg` (a 640×360 screenshot).

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
A level for economics, PE and physical geography, with a Standard / Advanced level switch).
Comment code so a student can follow the science. List a model's
assumptions and simplifications inside the simulation itself.

Every single-file simulation has a "Batch run" mode: it runs the model many
times headlessly (repeat with new random seeds, or sweep one setting), plots
the results against theory with mean, SD and standard error, and exports CSV.
Give new simulations one too, with a few one-click batch experiments.

The owner uses laptops and Surface tablets in a desktop web browser.
Design for those screens (about 1280×720 and up); phone layouts are not
needed.
