# Nuclear Fission and Chain Reactions

A single, self-contained HTML file: neutrons split nuclei in a sphere of fuel
and set off chain reactions. It needs no install and no internet: **open
`nuclear-fission.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/nuclear_fission.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `nuclear-fission.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel 4PH1 7(c): fission, the chain reaction,
  control rods and moderator, balanced nuclear equations.
- **Advanced (A level):** WJEC Eduqas nuclear energy: E = mc², mass defect,
  binding energy per nucleon; k and critical mass tagged beyond the spec.

## What it shows

A slice through a sphere of U-235 or Pu-239: neutrons fly random distances and
escape, are absorbed by control rods, or split a nucleus (2 or 3 new neutrons).
Set k directly or from the fuel mass; control rods; starting neutrons. Charts:
neutrons per generation against N₀kⁿ; k against mass (Standard) or the binding
energy per nucleon curve (Advanced). A mass table gives Δm = 0.186 u = 173 MeV.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| What is the critical mass of U-235? | k = 0.995 at 52 kg (1.00) |
| Does plutonium need less? | k = 1.02 at 10 kg (1.00) |
| Do control rods work? | k 1.08 → 0.42 as rods absorb 0–60% (straight line) |
| How long is a chain when k < 1? | fissions per neutron follow (k/ν)/(1 − k), short near k = 1 (heavy tail) |
| Will one neutron start a runaway? | 5%, 23%, 49%, 70%, 89% for k 1.05–2.2 (1 − extinction probability) |
| Energy per fission | 164 ± 5 MeV (SEMF) against 173 MeV for Ba-141 + Kr-92 |
