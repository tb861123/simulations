# Particle Physics

A single, self-contained HTML file. No install and no internet are needed:
**open `particle-physics.html` in Chrome or Edge**.

## Levels

- **Standard (iGCSE):** quarks, leptons and conservation laws are **not** in
  Pearson Edexcel International GCSE Physics (4PH1), and the level hint says
  so. Standard uses the sim for the 4PH1 Section 7 ideas it shows: protons,
  neutrons and electrons (relative masses and charges), atomic and mass
  numbers, isotopes, and β⁻ decay. Six iGCSE questions.
- **Advanced (A level):** WJEC Eduqas particles and nuclear structure (the old
  page's Component 3, Topic 7): quarks, leptons, hadrons, the four forces, and
  conservation of Q, B and L. The old page's four questions plus classifying
  particles, μ⁻ → e⁻ + γ, e⁺e⁻ annihilation photons, and the four forces.
  Strangeness, lepton-family numbers and Feynman diagrams are tagged "Beyond
  the spec" (to be checked).

The level switch has a hint naming the spec, and a key-ideas box tags each
idea. A 12th preset was added (Pion decay: π⁺ → μ⁺ + νμ).

It replaces the old WJEC Streamlit page *Particle Physics*
(`physics_sims/pages/25_Particle_Physics.py`) and keeps its three tabs, data,
notes and exam questions.

## Tabs

- **Particles and quarks:** a quark confinement animation (quarks bounce, then bind
  through gluons into p, n, π⁺, π⁻, K⁺, K⁻, Λ⁰, Σ⁺ or p̄; antiquarks shown as rings),
  the Standard Model cards (6 quarks, 6 leptons, 4 gauge bosons with charge and
  mass), baryon and meson tables, and **build your own hadron** (any 2 or 3 quarks
  or antiquarks → charge, B, S, type and name, or why it is not allowed).
- **Conservation laws:** load an example or build a reaction (1–4 reactants, 1–5
  products from 20 particles). Cards check Q, B, L and S with the old page's rules
  and an overall verdict; a cartoon bubble-chamber picture shows the tracks
  (charged tracks curve opposite ways, neutral dashed, neutrinos unseen; forbidden
  reactions marked). Advanced adds L_e and L_μ checks and the quantum-number table.
- **Feynman diagrams:** β⁻ decay, β⁺ decay, electron capture, e⁺e⁻ annihilation,
  muon decay and Compton scattering, drawn as time passes, with descriptions and
  (Advanced) the conservation checks for each.

## Presets

Proton: uud · Neutron: udd · Mesons · Strange particles · β⁻ decay: allowed? ·
Forbidden: p → e⁺ + γ · Strangeness changes (Λ⁰ → p + π⁻) · Kaon production · Pion decay ·
Feynman: β⁻ decay · Feynman: annihilation · Feynman: muon decay.

## The model

Standard quantum numbers; the checker adds them up on each side. Q, B and L must
balance; if only S changes by 1 the reaction is weak-only; a change of 2 or more is
forbidden in one step. Energy, momentum, spin and the tau family are not checked
(listed in the page).

## Batch run

Random reactions (particles picked with equal chances from the 20) are checked
against the laws; the exact probability comes from counting every combination.
The batch settings table lists every setting; tick one to vary it.

| Experiment | Result |
|---|---|
| How often is charge conserved by chance? (1 → 2) | 29.6% ± 2.0% (exact 29.6%) |
| Q, B and L all at once? | 4.6% (exact 4.5%) |
| More products, less chance? | 35% with 1 product down to 21% with 5, on the exact curve |
| Does strangeness make it rarer? (2 → 2) | 2.01% (exact 2.01%) |
| Why are beta electrons spread out? | Electron energies 0–0.78 MeV, mean 0.295 MeV (spectrum mean 0.303) |

## Exam practice

The old page's 4 questions with mark schemes.
