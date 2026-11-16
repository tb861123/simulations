# Materials Science

A single, self-contained HTML file for A level physics (and iGCSE for the
practical and tensile test). It needs no install and no internet: **open
`youngs-modulus.html` in Chrome or Edge**.

It expands the earlier Young's Modulus simulation into a full materials
science lab. The earlier version and its worksheets are kept in
[`original/`](original/), and the new page's notes link to it.

★ Enhanced: built from `tools/kit/src/youngs_modulus.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `youngs-modulus.html` by hand.

- **Standard (A level):** WJEC Eduqas A level Physics, Component 1, Topic 1.5
  *Solids under stress*. It covers:
  - Hooke's law; stress, strain and the Young modulus
  - work done as the area under a force–extension graph (½Fx = ½kx²)
  - crystalline, amorphous and polymeric solids
  - stress–strain curves for ductile metals, brittle materials and rubber
  - edge dislocations, foreign atoms and grain boundaries
  - necking and ductile fracture
  - crack propagation and brittle fracture, and toughened glass
  - rubber and hysteresis
  - the specified practical: the Young modulus of a metal wire

  The Practical and Tensile test views also cover Pearson Edexcel International
  GCSE Physics (4PH1) 1(c): force–extension of springs, wires and rubber bands,
  and Hooke's law.
- **Advanced (stretch, beyond the spec):**
  - the Hall–Petch equation σy = σ0 + k ÷ √d
  - Griffith's crack equation (σf ∝ 1 ÷ √a) and stress concentration at a crack tip
  - the Schmid factor
  - the theoretical strength of a perfect crystal

The Revise tab has key ideas tagged to the spec and exam questions. Some
questions use the numbers on screen.

## Six views

| View | What you see | The model |
|---|---|---|
| 🔬 **Practical** | Searle's apparatus: a reference wire and a test wire (steel or copper) with a vernier scale. Add 0.25 kg masses one at a time; each load records a vernier reading. Measure the diameter with the micrometer in several places. The graph of extension against load gives the gradient, and E = L ÷ (A × gradient). | The same material model as the tensile test, under a fixed load. Readings have random errors: vernier SD 0.01 mm, micrometer SD 0.005 mm. Copper goes past its elastic limit within the masses available. |
| 📈 **Tensile test** | A wire or strip in grips, pulled until it breaks. You choose mild steel, copper, aluminium alloy, cast iron, glass, alumina ceramic, bone, rubber or polythene. It shows necking, cup-and-cone or flat brittle fracture, and polythene's travelling neck. **Release** unloads it. A card shows how the particles are arranged. | Typical published stress–strain curves. Metals and polythene are elastic, then flow plastically with work hardening, then neck. Brittle materials break at a stress that varies from sample to sample. Rubber has separate loading and unloading curves. |
| ⊥ **Atoms** | About 700 atoms in a perfect crystal or with one **edge dislocation**. The extra half-plane is outlined and a ⊥ marks the core. You can add larger **foreign atoms** on the slip plane. **Shear** it and watch the half-plane move one row of bonds at a time, leaving a step at the surface. | Molecular dynamics: Lennard-Jones forces between atoms and Newton's second law in tiny time steps. Atoms with 5 or 7 neighbours (defects) are shown orange. |
| ▦ **Grains** | A 240 × 150 μm slice of polycrystalline metal. Each grain is striped along its slip planes. Dislocations (⊥) glide out from sources, **pile up at grain boundaries** and turn red as they press harder. Green rings mark slip breaking through. Grain size and foreign atoms are adjustable. | A two-dimensional dislocation model. Dislocations repel one another (∝ 1/distance) and have to overcome a friction stress. They cross a boundary only when the stress at the head of the pile-up passes a critical value. |
| 💥 **Brittle** | A crystalline ceramic or an amorphous glass, with a notch (crack) 0–12 atoms deep and an option for **toughened** surface layers in compression. Bonds are coloured by strain, so you can see the stress concentrate at the crack tip and the crack run. | Atoms joined by springs that snap at about 10% stretch. After each step the atoms settle, then the most over-stretched bond breaks. |
| 〰 **Polymers** | Tangled chain molecules in rubber, with an adjustable number of cross-links, or in polythene, which has none. They straighten as the sample is stretched. The hysteresis loop is shaded, and bars show the work put in, the work given back and the energy lost as heat. | The rubber equation σ = G(λ − 1/λ²) with a term for the chains running out of slack. The unloading curve is lower than the loading curve. Polythene flows plastically. |

## Charts and readouts

Each view has two linked charts:

- **Practical:** extension against load with a best-fit line; plus the micrometer readings and their mean.
- **Tensile test:** stress–strain, with the elastic limit or yield, UTS and fracture marked, and a zoom on the elastic region; plus force–extension for this sample, where the area gives the work done in joules.
- **Atoms:** shear stress against shear strain; plus the slip stress from each test.
- **Grains:** stress–strain over the start of plastic flow; plus yield stress against 1 ÷ √d for every sample tested, with a best-fit line.
- **Brittle:** stress–strain; plus breaking stress against notch depth.
- **Polymers:** the loading and unloading loop; plus the energy bars.

Readouts include stress, strain, the Young modulus, work done per m³, the
dislocation's position, the stress concentration at the crack tip, and the
number of bonds broken.

## Investigate (missions)

Standard level:

1. Searle's method
2. Stay below the elastic limit
3. Hooke's law and the Young modulus
4. Reading a ductile metal's curve
5. Permanent stretch and work hardening
6. Tough or brittle?
7. Rubber and hysteresis
8. An edge dislocation
9. Foreign atoms
10. Grain boundaries
11. Cracks concentrate stress
12. Toughened glass
13. Crystalline or amorphous?
14. Cross-links

Advanced level adds:

- Theoretical strength
- Hall–Petch

## Batch run

Each experiment runs the model many times without drawing it. It plots each
result with the mean ± standard error and the SD, compares them with theory
or a best-fit line where there is one, and exports CSV.

| Experiment | What it does |
|---|---|
| Searle's method: measuring E for steel | A histogram of 200 students' results, each with vernier and micrometer errors, against the true 200 GPa. |
| Why use a long, thin wire? | Wire length 0.25–3 m: the spread of E shrinks as the wire gets longer. |
| Grain size and yield stress | Grain-scale model. Plots yield stress against 1 ÷ √d with a best-fit line (Hall–Petch). |
| Foreign atoms and yield stress | 0–2% foreign atoms. |
| Perfect crystal or dislocation? | Molecular dynamics: the shear stress to make a perfect crystal slip, against a crystal with one edge dislocation (about a sixth as much). Takes a few seconds. Foreign atoms are shown in the live Atoms view. |
| Crack length and breaking stress | Bond-network model, compared with Griffith's ∝ 1 ÷ √a. It fits from about 4 atoms deep; shallower notches fall below the line. |
| Scatter in the strength of glass | A histogram of 300 rods, each breaking at its deepest scratch. |
| Rubber: energy lost per cycle | The area of the hysteresis loop against the maximum strain. |
| Toughness of materials | Energy absorbed per m³ to fracture, for six materials. |

## Assumptions and simplifications

These are also listed in the simulation's notes.

- Everything is two-dimensional. Real dislocations are lines, and real grains are 3D with several slip systems.
- The atom model is a few nanometres across and is sheared very fast. Its stresses are in model units and show the pattern, not real values.
- In the grain model, each ⊥ stands for a group of dislocations. Its constants are tuned to give realistic yield stresses for mild steel.
- Mild steel's yield drop appears only in the tensile test.
- The brittle model's bonds are identical apart from a small scatter.
- Real cracks are thousands of atoms long and can branch.
- Temperature, loading rate and creep are not modelled.
