# Atomic Structure and Isotopes

A simulation of atomic structure for Edexcel International GCSE Chemistry (Topic 1). Build
an atom or ion from protons, neutrons and electrons, watch the electron shells fill, make
isotopes, and work out relative atomic mass by "weighing" a random sample of atoms one at
a time, the way a mass spectrometer does.

## How to run

Open `atomic-structure.html` in Chrome or Edge. There is nothing to install and it works
offline.

## Levels (Standard / Advanced)

A **Standard (iGCSE) / Advanced (A level)** switch sits at the top of the left panel. Standard follows Pearson Edexcel International GCSE Chemistry (4CH1); Advanced follows Pearson Edexcel A level Chemistry (9CH0) and keeps everything in Standard. The choice is remembered in the browser. Key ideas carry spec tags (grey-green 4CH1, purple 9CH0, blue-grey beyond both). Exam practice has questions with mark schemes at both levels; questions marked "Your…" use the numbers on screen. Batch runs are the same at both levels.

- **Standard:** 4CH1 Section 1(c) Atomic structure and 1(d) The Periodic Table (with ions).
- **Advanced:** 9CH0 Topic 1 Atomic structure and the periodic table. Extra readings (the s, p, d
  configuration and first IE), six A level presets (s, p, d: potassium; copper, an exception, then
  Cu²⁺; successive IEs of aluminium; first IE dips at Al and S; TOF chlorine; TOF Cl₂ molecular
  ions) and nine A level exam questions. **A level box** (under the readings): orbital boxes for
  the atom or ion on screen (Hund's rule, 4s before 3d, Cu's exception, ions losing 4s first);
  successive ionisation energies (log scale, coloured by shell) and first IEs for H to Kr;
  a time-of-flight mass spectrometer (ions with the same kinetic energy, flight times, a spectrum
  from a random sample of detected ions, Ar from the peaks, X₂⁺ molecular-ion peaks).

## Controls

- **Presets** (12): Hydrogen; Carbon 2,4; Sodium 2,8,1; Sodium ion Na⁺; Chloride ion Cl⁻;
  Magnesium ion Mg²⁺; Argon (full shells); Carbon-14; Chlorine (Ar = 35.5); Deuterium;
  Copper (Ar = 63.5); Bromine (half and half). The ion presets show the atom first, then
  the electron flying off (or in).
- **Build the atom:** choose the element (hydrogen to calcium, plus copper and bromine),
  then add or take away protons, neutrons and electrons with the − / + buttons. Changing
  the protons changes the element; changing the neutrons makes another isotope; changing
  the electrons makes an ion (up to 3 electrons either way). Buttons for each natural
  isotope, "Neutral atom" and "Its usual ion".
- **Isotope sample:** natural abundances, or your own mix of the two main isotopes; exact
  isotope masses or mass numbers.
- **Display:** picture detail (Low / Medium / High / Ultra: 100 to 2000 atoms in the sample,
  glow and trails), electrons drawn in pairs like an exam diagram, electrons moving or still.
- **Centre:** the atom (nucleus of protons and neutrons, electron shells, the isotope symbol
  with mass number and atomic number, and the charge balance), and the isotope sample being
  weighed into a mass spectrum, with the running average mass against the true Ar.
  Play/Pause, New sample, speed (½×, 1×, 4×, 20×; 1× weighs 8 atoms a second),
  **Batch run**. Hover over any particle or spectrum bar for details.
- **Right panel:** "What's happening" commentary (including whether the nucleus is stable,
  radioactive with its half-life, or not known); readings (Z, A, electrons and arrangement,
  charge, group and period, stability, Ar); the data-book isotope abundances as a bar chart
  with the Ar line; the Ar calculation written out as in an exam answer; the table of
  relative masses and charges of the particles; key ideas; exam practice; and
  "How the model works (and what it leaves out)".
- The side panels can be resized or hidden (drag the dividers or use the header buttons),
  and the centre can go full screen.

## Merged in

This simulation replaces `chem_sims/02_Atomic_Structure.html`. From that page it keeps the
elements 1–20 with their shells, the ion charge control (now electron − / +), the isotope
(extra neutron) highlight, the live readout, the key equations, hover-to-inspect particles,
the five guided-tour steps (now presets: hydrogen, carbon 2,4, sodium 2,8,1, Na⁺, an
isotope) and its three exam questions with mark schemes. New: real isotope data and
abundances, relative atomic mass, the isotope sample and mass spectrum, copper and
bromine, stability data, the batch run and three live exam questions.

Dropped: the old page's drag-to-rotate of the atom (a flat shell diagram has nothing to
rotate) and its "add one neutron" isotope checkbox, which made sodium-24, a radioactive
isotope, look like an ordinary isotope. The neutron buttons and the natural-isotope buttons
replace it.

## The model

- Atomic number Z = protons; mass number A = protons + neutrons; charge = protons − electrons.
- Shells fill 2, 8, 8, then the fourth shell (elements 1–20); for copper and bromine the
  third shell holds 18 (2,8,18,1 and 2,8,18,7). Ions lose or gain electrons in the outer
  shell.
- Isotope masses (u) and abundances (%) are IUPAC/NIST values. Relative atomic mass:
  Ar = Σ(mass × abundance)/100.
- A random sample of N atoms has mean mass Ar and standard deviation
  SD = √(Σ p (m − Ar)² / N), where p is each isotope's fraction.

## Assumptions and simplifications

- Shell (Bohr) model: real electrons are in orbitals, not circular orbits. Not to scale: the
  real nucleus is about 100 000 times smaller than the atom.
- Stability is looked up from data: natural isotopes are stable (K-40 and Ca-48 are natural
  but radioactive), several well-known radioactive isotopes are listed with half-lives, other
  near misses are called radioactive, far-off combinations are marked as not existing.
- Natural abundances are fixed (really they vary slightly from place to place).
- Picture detail changes only the drawing. Batch runs use the sample size in their table.

## Batch experiments

Each run picks N atoms at random from the isotope mix and records their average mass, its
error, or the percentage of the second isotope. Every setting used is in the batch
settings table (element, natural or own mix, exact masses, N, % of the second isotope);
tick one numeric row to sweep it.

| Experiment | What it shows |
|---|---|
| Is chlorine's Ar really 35.5? | 500 samples of 100 atoms scatter around 35.48 with SD 0.086, as the theory predicts |
| Bigger samples, better answers? | the error in Ar falls as 1/√N (log–log gradient −0.5) |
| How does the mix set Ar? | Ar rises in a straight line from 35 to 37 with the % of chlorine-37 |
| Why is copper 63.5, not 63.6? | exact isotope masses give the data-book 63.55; mass numbers give 63.62 |
| Magnesium: three isotopes | the weighted average works for any number of isotopes: 24.32 |
| How common is carbon-13? | counting a rare isotope (1.07%) gives a big relative scatter (binomial SD) |

Each experiment uses fixed random seeds, so the results are reproducible. After changing the
experiments, re-run `tools/worksheets` to update the worksheets.
