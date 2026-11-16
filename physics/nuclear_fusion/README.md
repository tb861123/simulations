# Nuclear Fusion

A single, self-contained HTML file for iGCSE and A level physics. It needs no
install and no internet: **open `nuclear-fusion.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/nuclear_fusion.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `nuclear-fusion.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/) and
linked from the notes.

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  7(c) fission and fusion (fusion powers stars; it needs a very high
  temperature and pressure because positive nuclei repel; it is hard to
  achieve on Earth), with 5(d) (kelvin temperature ∝ mean kinetic energy) and
  8(c) (stars fuse hydrogen into helium).
- **Advanced (A level):** WJEC Eduqas nuclear energy (mass defect, E = mc²),
  fields (the barrier U = kQ₁Q₂/r) and kinetic theory (³⁄₂kT). Tunnelling, the
  Gamow peak and reaction rates are beyond the spec.

## What you see

A potential-energy diagram (distance on a log scale from 0.5 fm to 10⁵ fm):
the Coulomb barrier, a schematic strong-force well, and lines for kT, ³⁄₂kT and
the Gamow peak. Nuclei arrive from the right with energies drawn from the gas:
most turn back on the barrier; a few tunnel through and fuse, and the reaction
equation and energy released are shown. **Zoom** shows the incoming energies
against the barrier.

- **Reactions (9):** ¹H + ¹H (the Sun), ¹H + ²H, D–D, D–T, ²H + ³He,
  ³He + ³He, ¹H + ⁷Li, ¹H + ¹⁴N (the slowest step of the CNO cycle), ¹²C + ¹²C.
- **Places (7):** room temperature, the Sun's surface and core, a tokamak
  (ITER), laser fusion (NIF), a red giant's core, a massive star's core. Or set
  the temperature (300 K to 10¹⁰ K) and pressure (1 to 10²⁴ Pa) yourself.
- **Quantum tunnelling** on or off.
- **Demonstration odds:** real chances are tiny, so each reaction has a fixed
  1-2-5 boost (chosen so about 1 collision in 10 fuses at its usual place). It
  does not change with temperature or pressure, so comparisons stay fair.
  **True odds** removes it; **⏩ Skip to the next fusion** draws how many
  collisions bounce off before one gets through. **📌 Record this run** keeps
  each run's counts and estimate.
- **Charts:** the Gamow peak (Boltzmann factor, tunnelling chance and their
  product) and ⟨σv⟩ against temperature for four reactions.
- **Readings:** kT and ³⁄₂kT, the barrier (and how many kT), the chance per
  collision with and without tunnelling, the Gamow peak (and E_G at A level),
  the power released per m³ and the average wait for one nucleus.

## Investigate

Why so hot? · The Sun needs quantum physics · Hotter is much faster · Squeeze
it · The easiest fuel · Bigger charges, hotter stars · (A level) The classical
temperature · Energy from the mass defect · The Gamow peak.

## Batch run

| Experiment | Result when tested |
|---|---|
| Is the Sun hot enough without tunnelling? | Chance per collision at the Sun's core 10⁻⁴·⁵ with tunnelling, 10⁻¹⁹⁰ without |
| Do the fusing nuclei sit at the Gamow peak? | D–T at 10 keV: Monte Carlo mean 46.7 keV, exact 46.7 keV |
| How rare is fusion in a tokamak? | 2730 ± 180 per million collisions (model 2710) |
| How steeply does the Sun's rate rise with temperature? | log–log gradient 3.8 (about T⁴) |
| Why do heavy stars use the CNO cycle? | gradient 17 |
| Squeeze it | gradient 2.00: rate ∝ P² |
| How long does a proton in the Sun wait to fuse? | exponential waits, mean 3.6 billion years |

## The model

Barrier U = 1.44 MeV·fm × Z₁Z₂/r outside R = 1.2(A₁^⅓ + A₂^⅓) fm; collision
energies spread as E e^(−E/kT); tunnelling chance e^(−√(E_G/E)) with
E_G = 2μc²(παZ₁Z₂)²; ⟨σv⟩ from the Gamow integral with a constant S-factor;
n = P/((1 + Z)kT). Checks: p + p barrier 600 keV, Gamow peak 6.1 keV in the
Sun's core, D–T ⟨σv⟩ at 10 keV 1.1 × 10⁻²² m³/s (accepted). Left out:
electron screening, resonances, real stellar mixtures, degenerate electrons.
