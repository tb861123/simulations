# simulations

Interactive science simulations for teaching. Each folder is a separate
project with its own README and is run independently.

| Folder | What it is | How to run |
|---|---|---|
| [`planet_formation/`](planet_formation/) | How a planetary system forms, from a collapsing cloud to a settled system with rocky planets and gas giants (GCSE level) | Open `planet-formation.html` in Chrome or Edge, with no install |
| [`fluid_dynamics/`](fluid_dynamics/) | 2D CFD: the Hess–Smith panel method for potential flow around aerofoils and other bodies | `pip install -r requirements.txt`, then `python main.py` |
| [`chem_sims/`](chem_sims/) | 20 Edexcel iGCSE Chemistry (4CH1) simulations | Double-click `run.bat`, or open `index.html` |
| [`stellar_life_cycle/`](stellar_life_cycle/) | A star's whole life, from nebula to white dwarf, neutron star or black hole, with layers, composition and the H–R diagram (GCSE level) | Open `stellar-life-cycle.html` in Chrome or Edge, with no install |
| [`physics_sims/`](physics_sims/) | 28 WJEC Physics simulations (Streamlit app) | `python setup_env.py` once, then `streamlit run Home.py` |

Run commands from inside the project's folder.

## History

`fluid_dynamics/`, `chem_sims/` and `physics_sims/` were moved here from
their own repositories (`tb861123/Fluid_dynamics`, `tb861123/chem_sims` and
`tb861123/physics-sims`) with their full commit history. Use
`git log -- <folder>` to see a project's history.
