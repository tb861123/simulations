# simulations

Interactive science simulations for teaching (GCSE / iGCSE / WJEC level).
They are grouped into one folder per subject, and each simulation sits in its
own folder with its own README.

Most simulations are a single HTML file: open it in Chrome or Edge, with no
install and no internet needed. Run any other commands from inside the
project's own folder.

## Batch run

Every single-file simulation has a **📊 Batch run** button. It runs the model
many times without drawing, either repeating with different random luck or
sweeping one setting. It plots the results against the theory and gives the
mean, spread and standard error. Results can be downloaded as CSV. Each
simulation has ready-made batch experiments that pose a question, such as
"Does pV = NkT hold?", and a note on why the results scatter around the theory.

## Physics

| Folder | What it is | How to run |
|---|---|---|
| [`physics/gas_in_a_box/`](physics/gas_in_a_box/) | Kinetic theory: speeds settling into the Maxwell–Boltzmann curve, gas laws, Brownian motion, mixing | Open `gas-in-a-box.html` |
| [`physics/double_pendulum/`](physics/double_pendulum/) | Chaos: two pendulums starting a hair apart drift apart exponentially | Open `double-pendulum.html` |
| [`physics/physics_sims/`](physics/physics_sims/) | 28 WJEC Physics simulations (Streamlit app) | `python setup_env.py` once, then `streamlit run Home.py` |

## Chemistry

| Folder | What it is | How to run |
|---|---|---|
| [`chemistry/collision_theory/`](chemistry/collision_theory/) | Collision theory: temperature, concentration, catalysts and surface area, with the Arrhenius plot | Open `collision-theory.html` |
| [`chemistry/dynamic_equilibrium/`](chemistry/dynamic_equilibrium/) | Reversible reactions, Le Chatelier's principle and the Haber process | Open `dynamic-equilibrium.html` |
| [`chemistry/crystallisation/`](chemistry/crystallisation/) | Cooling rate and crystal size: granite, basalt, obsidian, salt crystals, dendrites | Open `crystallisation.html` |
| [`chemistry/chem_sims/`](chemistry/chem_sims/) | 20 Edexcel iGCSE Chemistry (4CH1) simulations | Double-click `run.bat`, or open `index.html` |

## Biology

| Folder | What it is | How to run |
|---|---|---|
| [`biology/natural_selection/`](biology/natural_selection/) | Natural selection in six species (moths, beetles, hares, finches, guppies, snails) with predators and changing habitats | Open `natural-selection.html` |
| [`biology/epidemics/`](biology/epidemics/) | Epidemics, vaccination and herd immunity (SEIR) | Open `epidemics.html` |
| [`biology/predator_prey/`](biology/predator_prey/) | Foxes, rabbits and grass: population cycles and Lotka–Volterra | Open `predator-prey.html` |

## Engineering

| Folder | What it is | How to run |
|---|---|---|
| [`engineering/earthquake_buildings/`](engineering/earthquake_buildings/) | Tall buildings in earthquakes: resonance, tuned mass dampers, base isolation | Open `earthquake-buildings.html` |
| [`engineering/traffic_flow/`](engineering/traffic_flow/) | Traffic flow and phantom jams, smart motorways, lane closures | Open `traffic-flow.html` |
| [`engineering/car_crash/`](engineering/car_crash/) | Car crash safety: crumple zones, seatbelts and airbags (momentum and impulse) | Open `car-crash.html` |
| [`engineering/fluid_dynamics/`](engineering/fluid_dynamics/) | 2D CFD: the Hess–Smith panel method for flow around aerofoils | `pip install -r requirements.txt`, then `python main.py` |

## Medical and anatomical

| Folder | What it is | How to run |
|---|---|---|
| [`medical/heart_circulation/`](medical/heart_circulation/) | The heart and double circulation: valves, blood pressure, pressure–volume loop | Open `heart-circulation.html` |
| [`medical/nerve_impulse/`](medical/nerve_impulse/) | Nerve impulses (Hodgkin–Huxley): myelin, threshold, refractory period, MS | Open `nerve-impulse.html` |
| [`medical/antibiotic_resistance/`](medical/antibiotic_resistance/) | Antibiotic resistance evolving during a course of treatment | Open `antibiotic-resistance.html` |
| [`medical/gas_exchange/`](medical/gas_exchange/) | Lungs and gas exchange: Fick's law, altitude, exercise, lung disease | Open `gas-exchange.html` |

## Climate science

| Folder | What it is | How to run |
|---|---|---|
| [`climate/greenhouse_effect/`](climate/greenhouse_effect/) | The greenhouse effect and Earth's energy balance; Venus and Mars | Open `greenhouse-effect.html` |
| [`climate/ice_albedo/`](climate/ice_albedo/) | Ice–albedo feedback, Snowball Earth and tipping points | Open `ice-albedo.html` |
| [`climate/carbon_cycle/`](climate/carbon_cycle/) | The carbon cycle and CO₂ from 1750 to 2300 under emissions scenarios | Open `carbon-cycle.html` |
| [`climate/sea_level_rise/`](climate/sea_level_rise/) | Sea level rise: where the water comes from, flooding and storm surges | Open `sea-level-rise.html` |
| [`climate/forest_fire/`](climate/forest_fire/) | How a woodland fire spreads with wind, dryness, slope, trees, undergrowth, firebreaks and rivers | Open `forest-fire.html` |

## Astrophysics

| Folder | What it is | How to run |
|---|---|---|
| [`astrophysics/planet_formation/`](astrophysics/planet_formation/) | How a planetary system forms, from a collapsing cloud to rocky planets and gas giants | Open `planet-formation.html` |
| [`astrophysics/stellar_life_cycle/`](astrophysics/stellar_life_cycle/) | A star's whole life, from nebula to white dwarf, neutron star or black hole | Open `stellar-life-cycle.html` |
| [`astrophysics/exoplanet_hunting/`](astrophysics/exoplanet_hunting/) | Finding exoplanets by transits and the Doppler wobble | Open `exoplanet-hunting.html` |
| [`astrophysics/galaxy_collisions/`](astrophysics/galaxy_collisions/) | Galaxy collisions and mergers, tidal tails, Milky Way and Andromeda | Open `galaxy-collisions.html` |
| [`astrophysics/expanding_universe/`](astrophysics/expanding_universe/) | Hubble's law, redshift and the age of the universe | Open `expanding-universe.html` |
| [`astrophysics/gravitational_lensing/`](astrophysics/gravitational_lensing/) | Gravitational lensing: Einstein rings, arcs, microlensing, Eddington 1919 | Open `gravitational-lensing.html` |
| [`astrophysics/dark_matter/`](astrophysics/dark_matter/) | Evidence for dark matter from galaxy rotation curves | Open `dark-matter.html` |

## Statistics

| Folder | What it is | How to run |
|---|---|---|
| [`statistics/central_limit_theorem/`](statistics/central_limit_theorem/) | Galton board and the central limit theorem (and where it fails) | Open `central-limit-theorem.html` |
| [`statistics/queues/`](statistics/queues/) | Supermarket queues and queueing theory | Open `queues.html` |

## History

`engineering/fluid_dynamics/`, `chemistry/chem_sims/` and `physics/physics_sims/`
were moved here from their own repositories (`tb861123/Fluid_dynamics`,
`tb861123/chem_sims` and `tb861123/physics-sims`) with their full commit
history. Use `git log --follow -- <folder>` to see a project's history.
