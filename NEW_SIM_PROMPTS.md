# Copy-and-paste prompts for new simulations

One prompt per A level subject at Emanuel (2027-2029). Each is self-contained: copy everything inside a block into a new chat in this repo.

Part 1 covers subjects with no existing simulations. Part 2 covers subjects that already have simulations and need an audit against the specification first. Art & Design, Classical Civilisation, Drama, English Literature, Film Studies, Latin, French, German, Spanish and the EPQ have no natural simulation, so they have no prompt.

## Part 1: new subjects

### 1. Mathematics (Pearson Edexcel 9MA0)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Mathematics (Pearson Edexcel 9MA0)
Folder: statistics/ (statistics) and a new mathematics/ folder for pure and mechanics
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- hypothesis_testing: binomial and normal tests, significance level, Type I/II error and power, with simulated samples
- distributions: binomial, normal, Poisson; areas, inverse normal, normal approximation to the binomial
- regression_correlation: scatter, line of best fit, PMCC, outliers and leverage, extrapolation
- calculus_explorer: differentiation from first principles (chord to tangent), stationary points, area under a curve and trapezium/Riemann sums
- numerical_methods: Newton-Raphson, bisection, iteration x=g(x) cobwebs, trapezium rule
- vectors_kinematics: SUVAT, v-t and s-t graphs, vectors in 2D, projectiles with calculus
- mechanics_forces: moments, friction on slopes, connected particles, pulleys
- sampling_data: sampling methods, box plots, histograms, outliers, large data set style exploration
~~~

### 2. Further Mathematics (Pearson Edexcel 9FM0)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Further Mathematics (Pearson Edexcel 9FM0)
Folder: a new mathematics/ folder (shared with Mathematics; check what exists)
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- complex_numbers: Argand diagram, modulus-argument, roots of unity, loci
- matrix_transformations: 2x2 and 3x3, determinant as area/volume scale, invariant lines, eigenvectors
- differential_equations: slope fields, Euler method, first and second order, SHM/damping link
- polar_curves: r(theta) families, area, tangents
- markov_chains: transition matrices, steady state, absorbing states
- series_convergence: Maclaurin series approximating functions, radius of convergence
- hyperbolic_functions and vectors_3d: lines and planes, shortest distances
~~~

### 3. Computing (Cambridge International 9618, International A Level Computer Science)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Computing (Cambridge International 9618, International A Level Computer Science)
Folder: a new computing/ folder
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- sorting_algorithms: bubble, insertion, merge, quick; comparisons/swaps counters; Big-O curves
- searching_and_hashing: linear, binary, hash tables with collision methods
- pathfinding: Dijkstra and A* on an editable grid/graph, with the algorithm's data structures visible
- data_structures: stacks, queues, linked lists, binary trees (insert, traversals)
- logic_gates: build circuits, truth tables, Boolean simplification, half/full adder
- cpu_fetch_execute: Von Neumann registers, buses and a tiny assembly language, step by step
- turing_and_fsm: finite state machines and Turing machine with editable rules
- binary_and_floating_point: two's complement, floating-point representation, rounding error
- networking_and_encryption: packet routing, TCP handshake, Caesar/Vigenere/RSA toy example
- neural_networks_and_ml: tiny perceptron/decision tree learning on a 2D dataset
~~~

### 4. Psychology (AQA 7182)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Psychology (AQA 7182)
Folder: a new psychology/ folder
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- memory_models: multi-store and working memory, serial position, capacity and duration experiments (agents recall word lists)
- forgetting_curve: Ebbinghaus curve, interference and spaced repetition
- conformity_obedience: Asch and Milgram-style agent models with adjustable situational variables
- conditioning: classical and operant conditioning, schedules of reinforcement, extinction
- research_methods: sampling bias, experimental design, significance tests (Mann-Whitney, Wilcoxon, chi-squared, Spearman, sign test) with critical-value tables
- attachment_strange_situation and social_influence_minority: simple agent-based models
- biopsychology: neuron/synapse and fight-or-flight response (link to existing nerve_impulse; do not duplicate)
- approaches_and_inheritance: twin/adoption study heritability simulator
~~~

### 5. Business (Pearson Edexcel 9BS0)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Business (Pearson Edexcel 9BS0)
Folder: a new business/ folder (the economics/ folder already has circular_flow, firms_competition etc.; do not duplicate)
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- breakeven_and_margins: fixed/variable costs, margin of safety, sensitivity to price and volume
- cash_flow_forecast: monthly forecast, overdraft, effect of credit terms and seasonal sales
- investment_appraisal: payback, ARR, NPV with discount rate, risk and sensitivity
- boston_matrix_and_product_life_cycle: market share/growth, extension strategies, portfolio cash flows
- decision_trees: expected monetary value, risk attitude
- inventory_and_supply_chain: just-in-time versus buffer stock, lead times, bullwhip effect
- ratio_analysis: income statement and balance sheet ratios, effect of changes
- motivation_and_productivity: Taylor/Herzberg/Maslow staffing simulation (optional)
~~~

### 6. Politics (Pearson Edexcel 9PL0)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Politics (Pearson Edexcel 9PL0)
Folder: a new politics/ folder
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- electoral_systems: the same vote tally run through FPTP, AV, STV, AMS and party-list; seats vs votes, proportionality index
- voting_paradoxes: Condorcet cycles, Arrow's theorem, strategic voting, median voter
- party_systems_and_gerrymandering: constituency boundaries, gerrymander and wasted votes
- voter_behaviour: swing and turnout model, social class/age/issue voting
- parliament_legislation: bill passing, majority and rebellions, Lords ping-pong
- game_theory_politics: prisoner's dilemma, collective action, free riding
~~~

### 7. Design and Technology (AQA 7552, Product Design)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Design and Technology (AQA 7552, Product Design)
Folder: a new design_technology/ folder (check engineering/ for overlap)
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- materials_properties: stress-strain, hardness, toughness, material selection chart (Ashby style)
- mechanisms_levers_gears: lever classes, gear trains, cams, pulleys, mechanical advantage
- structures_and_trusses: loads, tension/compression, factor of safety, beam deflection
- manufacturing_processes: injection moulding, casting, CNC vs batch vs mass production cost per unit
- ergonomics_anthropometrics: percentile data, adjustability and design range
- sustainability_lifecycle: life cycle assessment of a product, recycling and embodied energy
~~~

### 8. Religion, Philosophy and Ethics (OCR H573, Religious Studies with Developments in Christian Thought)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Religion, Philosophy and Ethics (OCR H573, Religious Studies with Developments in Christian Thought)
Folder: a new religious_studies/ folder
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- ethical_dilemmas: trolley-problem family run through utilitarian (act/rule), Kantian, virtue and natural-law reasoning, showing where each agrees and differs
- utilitarian_calculus: Bentham hedonic calculus and preference utilitarianism on custom cases
- argument_validity: build syllogisms and see validity, soundness, fallacies; link to cosmological/ontological/teleological arguments
- problem_of_evil: structured map of the logical and evidential problem and each theodicy's response
- religious_experience_and_language: verification/falsification principle tester
~~~

### 9. History (OCR H505, History A)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: History (OCR H505, History A)
Folder: a new history/ folder (history is a weaker fit; build only models that genuinely teach, and say so if few qualify)
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- population_and_famine: Malthus model and Irish famine style food/pop dynamics
- arms_race_and_alliances: game-theory model of escalation before 1914
- revolutions_and_unrest: grievance, repression and mobilisation threshold model
- economic_cycles_and_depression: 1929 crash and recovery policy comparison
- timeline_causation_explorer: weighting short/long-term causes of an event
~~~

### 10. Photography (AQA 7206, Art and Design: Photography)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: build NEW teaching simulations for the A level subject below, as ★ Enhanced kit simulations.

Rules that apply to every simulation you build:
- One folder per simulation inside the subject folder named below (create the subject folder if it does not exist). Check existing folders first so you do not duplicate anything.
- Write the science in tools/kit/src/<name>.js, add a line to the SIMS table in tools/kit/build.js, run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Include: Standard / Advanced level switch, Revise tab (key ideas tagged to the specification, exam-style questions with mark schemes), ready-made Investigate cards, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV export, compare with theory), and an in-page list of the model's assumptions and simplifications.
- Comment the code so a student can follow the science. Design for 1280x720 and up (laptop/Surface), no phone layouts.
- Register each one: a row in root README.md, a line in the SIMS list and the ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (screenshot with the pre-installed Playwright Chromium). If you add a new subject folder, also add it to the CLAUDE.md table and the front-page grouping.
- Test each page in headless Chromium: no console errors, controls work, batch runs finish.
- Update the counts in CLAUDE.md (simulation total and Enhanced total).
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.
- Build one simulation at a time, committing after each, and tell me the list when done.

Subject: Photography (AQA 7206, Art and Design: Photography)
Folder: a new photography/ folder
Check the specification's content list online and build simulations that cover it. Candidate simulations (use, merge or replace to suit the specification; start with the most valuable):
- exposure_triangle: aperture, shutter speed, ISO with live histogram, noise, motion blur and depth of field
- lens_optics: focal length, field of view, perspective compression, thin-lens formula (link to optics_refraction, do not duplicate)
- light_and_colour: colour temperature, white balance, additive/subtractive mixing, lighting ratios
- composition_and_sampling: rule of thirds and digital resolution, pixel sampling, JPEG compression artefacts
- darkroom_chemistry: film development time, temperature and contrast (link to chemistry only if needed)
~~~

## Part 2: existing subjects (audit, then fill gaps)

### 11. Physics (Eduqas A420QS)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Physics (Eduqas A420QS)
Folder(s): physics/
Existing simulations to read first: waves, optics_refraction, circuits, capacitors, magnetism_induction, fields_orbits, gas_in_a_box, heating_insulation, projectile_motion, circular_motion, simple_harmonic_motion, radioactive_decay, nuclear_fission, particle_physics
physics/ has 26 simulations (see CLAUDE.md). Suspect gaps: momentum and collisions (1D/2D, elastic/inelastic), Doppler effect and redshift, two-slit/diffraction grating interference, Brownian motion and kinetic theory, gravitational and electric potential and field lines, Newton's laws and friction, thermal physics (specific heat, heat engines), capacitor discharge (check capacitors), alternating current and transformers (check magnetism_induction), stellar and cosmology topics (check astrophysics/).

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~

### 12. Biology (OCR H420, Biology A)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Biology (OCR H420, Biology A)
Folder(s): biology/ and medical/
Existing simulations to read first: natural_selection, inheritance, dna_cell_division, biotechnology, enzymes, membranes, immunity, homeostasis, ecosystems, plant_transport, photosynthesis_respiration, heart_circulation, nerve_impulse, gas_exchange
Suspect gaps: Hardy-Weinberg and population genetics, PCR and gel electrophoresis (check biotechnology), cell cycle and mitosis control, hormonal control of heart/blood glucose, gene expression (lac operon, transcription and translation), neuronal vs hormonal coordination, statistics for fieldwork (chi-squared, Spearman, Simpson's index), enzyme kinetics, ATP and respiration pathway, plant hormones, taxonomy and phylogenetics.

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~

### 13. Chemistry (Pearson Edexcel 9CH0)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Chemistry (Pearson Edexcel 9CH0)
Folder(s): chemistry/
Existing simulations to read first: collision_theory, dynamic_equilibrium, acids_salts_tests, energy_changes, electrochemical_cells, organic_chemistry, bonding, periodic_groups, moles_reacting_masses, chromatography
Suspect gaps: reaction kinetics (rate equations, orders, half-lives, Arrhenius), Kc and Kp calculations, acid-base titration curves and buffers, thermodynamics (Born-Haber, entropy, Gibbs), transition metal complexes and colour, spectroscopy (NMR, IR, mass spectrometry) and structure determination, organic mechanisms and synthesis routes, redox titrations, periodicity trends (check periodic_groups).

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~

### 14. Economics (Pearson Edexcel 9EC0, Economics A)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Economics (Pearson Edexcel 9EC0, Economics A)
Folder(s): economics/
Existing simulations to read first: supply_demand, taxes_price_controls, firms_competition, labour_market, circular_flow, running_the_economy, externalities, trade_exchange_rates, inequality
Suspect gaps: AD/AS and the multiplier, fiscal/monetary policy and central bank interest rates, Phillips curve, Lorenz curve and Gini (check inequality), market failure and cost-benefit analysis, monopoly and oligopoly game theory, development economics (Harrod-Domar, Lewis), globalisation and balance of payments, labour market minimum wage.

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~

### 15. Geography (Pearson Edexcel 9GE0)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Geography (Pearson Edexcel 9GE0)
Folder(s): climate/
Existing simulations to read first: greenhouse_effect, carbon_cycle, coasts, glaciers, river_landforms, flooding_hydrographs, tectonic_hazards, tropical_storms, slopes_landslides, fieldwork_sampling
Suspect gaps: hot desert systems and desertification, ecosystems under stress, population change and demographic transition model, migration and gravity model, urban change and urban heat island, globalisation and development indicators, water and carbon security (check carbon_cycle), data-response skills (chi-squared, Spearman, location quotient; check fieldwork_sampling).

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~

### 16. Physical Education (OCR H555)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Physical Education (OCR H555)
Folder(s): physical_education/
Existing simulations to read first: energy_systems, training_adaptation, sport_biomechanics, fitness_testing, skill_acquisition, arousal_performance, luck_and_skill
Suspect gaps: levers and linear/angular motion (check sport_biomechanics), cardiovascular response during exercise and Frank-Starling, group dynamics, motivation and goal setting, sports psychology (attribution, self-efficacy), Newtonian forces in sport, nutrition/ergogenic aids, sociocultural topics (probably not simulable).

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~

### 17. Music (Eduqas A660QS)

~~~text
You are working in the simulations repo (read CLAUDE.md and tools/kit/README.md first and follow them exactly).

Task: audit existing simulations against the specification below and fill genuine gaps.
Step 1: read the existing simulations named below (tools/kit/src/<name>.js, plus their Revise tab and Investigate cards) and compare them with the specification's content list (look it up online if needed; the Standard/Advanced and spec tags matter). Write a short table of spec topics: covered / partly covered / missing, and show it to me before building.
Step 2: for each topic marked missing that suits a simulation, build a new ★ Enhanced kit simulation. For topics only partly covered, extend the existing src file instead of creating a new one.

Subject: Music (Eduqas A660QS)
Folder(s): music/
Existing simulations to read first: inside_sound, strings, air_columns, build_timbre, pitch_intervals, rhythm_metre
Suspect gaps: harmony and chord progressions with voice-leading rules, tonality, modulation and cadences, notation/ear-training, melody construction and ornamentation, rhythm in different traditions (check rhythm_metre), instrument acoustics beyond strings/air columns, recording and EQ.

Rules for anything new: tools/kit/src/<name>.js + SIMS line in build.js + `node build.js` and `node worksheets.js <name>` from inside tools/kit/; never hand-edit built HTML. Include Standard/Advanced switch, Revise tab with spec tags, Investigate cards, Batch run with one-click experiments (mean, SD, SE, CSV), in-page assumptions list, commented code, 1280x720+ layout. Register in README.md, index.html (SIMS and ENHANCED) and thumbs/<folder>.jpg (640x360); update the counts and tables in CLAUDE.md. Test in headless Chromium. Finish by merging to main, pushing, deleting the feature branch, and end with a "No setup needed" line.
~~~
