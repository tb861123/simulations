# Working agreements for the simulations repo

Standing instructions from the project owner. These apply to every change.

## This is the only repo for simulation work

All simulation projects live here, one folder each:

| Folder | Project | Run |
|---|---|---|
| `planet_formation/` | Planet formation simulator (single self-contained HTML file) | open `planet-formation.html` |
| `stellar_life_cycle/` | Stellar life cycle simulator (single self-contained HTML file) | open `stellar-life-cycle.html` |
| `forest_fire/` | Forest fire spread simulator (single self-contained HTML file) | open `forest-fire.html` |
| `fluid_dynamics/` | 2D CFD panel method (Python, Pygame, Numba) | `python main.py` |
| `chem_sims/` | Edexcel iGCSE Chemistry sims (HTML) | `run.bat` / `index.html` |
| `physics_sims/` | WJEC Physics sims (Streamlit) | `python setup_env.py`, then `streamlit run Home.py` |

The old repos (`Fluid_dynamics`, `chem_sims`, `physics-sims`) are retired.
Never commit to them; make every change here. A new simulation goes in a
new top-level folder and gets a row in the root `README.md`.

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
- **Re-run setup**: a project's `requirements.txt` changed, or its setup
  script changed (`physics_sims/setup_env.py`, `fluid_dynamics`'s
  `pip install -r requirements.txt`, `chem_sims/setup.bat`). Name the
  folder and the command.

## Audience and style

These are teaching simulations for school students (GCSE / iGCSE / WJEC).
Comment code so a student can follow the science. List a model's
assumptions and simplifications inside the simulation itself.

The owner uses laptops and Surface tablets in a desktop web browser.
Design for those screens (about 1280×720 and up); phone layouts are not
needed.
