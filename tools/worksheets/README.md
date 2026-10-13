# Worksheet and batch-check tools

Teacher-side tools. Students never need these.

- **`run-batch-experiments.js`** opens a simulation in a headless browser. It clicks
  each one-click batch experiment in turn on the same page, as a student would, and
  runs each to completion. It records the set-up, the results table, the
  explanation and the time taken in `runs/<simulation>.json`, and saves a
  screenshot in `shots/`. It doubles as a regression check: compare a
  simulation's results with the theory after changing it.
- **`make_worksheets.py`** turns `runs/*.json` into a printable `worksheets.html`
  beside each simulation. It makes one A4 page per experiment, then teacher
  notes with the explanation and the numbers from the test run.
- **`run_all.sh`** does both for every single-file simulation, which takes about
  an hour. Pass file paths to do only some.

## Needs

Node.js with Playwright (`npm install -g playwright`, then
`npx playwright install chromium`) and Python 3.

## Usage

```
cd tools/worksheets
./run_all.sh                                              # everything
./run_all.sh ../../physics/gas_in_a_box/gas-in-a-box.html  # one simulation
node run-batch-experiments.js ../../climate/forest_fire/forest-fire.html 3   # CPU slowed 3×, to time a slow laptop
```

Re-run after changing a simulation's batch experiments so its worksheets stay
in step. Results are reproducible, because each experiment uses a fixed seed.
