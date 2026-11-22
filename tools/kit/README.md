# The simulation kit

A small shared toolkit behind the simulations (page frame, sliders,
charts, Investigate cards, Batch run window). So that every simulation stays a
single self-contained HTML file, the kit is copied into each page by a build
step:

```
kit.css      shared styles
kit.js       shared toolkit (K.app, K.slider, K.chart, batch run…)
src/*.js     one script per simulation: the science lives here
build.js     writes <subject>/<folder>/<name>.html from the three parts
```

To change a simulation, edit its file in `src/` (or the kit), then run from
inside this folder:

```
node build.js
```

Do not edit the built `.html` files by hand: the next build overwrites them.

Every `K.slider` lets the user click its value and type an exact one (units and
prefixes optional). The kit tries each slider position through the slider's own
`fmt` and picks the closest display, so log scales and custom formats work with
no extra code. Sliders whose display is only words are not typeable.
To add a simulation, write `src/<name>.js`, add a line to the `SIMS` table in
`build.js`, and list its folder in `ENHANCED` in the front page `index.html`.

Built with the kit: waves, dynamic_equilibrium, natural_selection,
nerve_impulse, earthquake_buildings, forest_fire, three_body_chaos,
central_limit_theorem, supply_demand, luck_and_skill, quantum_wave_lab,
special_relativity, wind_tunnel, gravitational_lensing, lightning,
chladni_plates, murmuration, gas_in_a_box, collision_theory,
galaxy_collisions, epidemics, fields_orbits, traffic_flow, optics_refraction,
heart_circulation, tropical_storms, turing_patterns, predator_prey,
electrolysis, running_the_economy, radioactive_decay, photoelectric_effect,
energy_systems, bonding, circuits, enzymes, greenhouse_effect,
organic_chemistry, training_adaptation, projectile_motion,
photosynthesis_respiration, externalities, flooding_hydrographs, queues,
energy_changes, gas_exchange, tectonic_hazards, car_crash, firms_competition,
arousal_performance, stellar_life_cycle, inheritance, simple_harmonic_motion,
membranes, antibiotic_resistance, exoplanet_hunting, reactivity_metals,
youngs_modulus, nuclear_fusion, states_of_matter, circular_motion, crystallisation, atomic_structure, periodic_groups, dna_cell_division, ecosystems, homeostasis, aerofoil_flow, ice_albedo, carbon_cycle, dark_matter, expanding_universe, planet_formation, taxes_price_controls, labour_market, circular_flow, sport_biomechanics, fitness_testing, skill_acquisition, atomic_spectra, nuclear_fission, particle_physics, acids_salts_tests, chromatography, moles_reacting_masses, immunity, plant_transport, biotechnology, inside_sound, strings, air_columns, build_timbre, pitch_intervals, rhythm_metre, sea_level_rise, weather_chaos, river_landforms, trade_exchange_rates, inequality, electrochemical_cells, capacitors, magnetism_induction, heating_insulation, hypothesis_testing, distributions, regression_correlation, sampling_data, calculus_explorer, numerical_methods, vectors_kinematics, mechanics_forces, complex_numbers, matrix_transformations, rate_equations, spectroscopy, transition_metals, organic_mechanisms, differential_equations, series_convergence, polar_curves, vectors_3d, population_and_famine, arms_race_and_alliances, revolutions_and_unrest, great_depression, exposure_triangle, lens_optics, light_and_colour, composition_and_sampling, markov_chains, behavioural_economics, development_economics, financial_markets, hyperbolic_functions, sorting_algorithms, searching_and_hashing, pathfinding, breakeven_and_margins, cash_flow_forecast, investment_appraisal, inventory_and_supply_chain, electoral_systems, voting_paradoxes, gerrymandering, materials_properties, manufacturing_processes, ergonomics_anthropometrics, ethical_dilemmas, argument_validity, problem_of_evil, globalisation_migration, urban_places, water_insecurity, data_structures, logic_gates, cpu_fetch_execute, binary_and_floating_point, muscles_neuromuscular, exercise_regulation, nutrition_ergogenic_aids, sport_psychology, networking_and_encryption, neural_networks_and_ml, turing_and_fsm, memory_models, harmony_cadences, keys_modulation, structure_texture, modern_techniques, forgetting_curve, conformity_obedience, conditioning, research_methods, approaches_and_inheritance, biopsychology, attachment_strange_situation, cosmic_distance_ladder, coasts, glaciers, slopes_landslides, density_pressure, energy_resources, fieldwork_sampling, slime_mould_networks, ant_colony, creature_evolution, fractal_explorer, strange_attractors, gravity_slingshots, life_automata, bridge_builder.

## Speed control in the header

A simulation's playback-speed control (a `K.slider` or `K.seg`) goes in the
header bar beside Pause / Step / Reset: make it as usual, then call
`ui.headerSpeed(ctl.speed)` (optionally `{ label: "Short name" }`). It is the
same control, so `ctl.speed.set(...)` and investigations still work. If the
group it was made in is hidden (a mode that does not use it), the header copy
hides too. Only move controls that change how fast the animation plays, not a
model setting such as a tempo, a presentation rate or a physical speed.

## Sound

Pass `sound: "what you will hear"` to `K.app` to add a 🔇/🔊 button to the
header. Sound starts off on every page load. Then call the shared helper anywhere:
`K.sound.tone(freq, { dur, vol, type, at, glide })`, `K.sound.noise({ dur,
vol, filter, freq, sweep, at })`, `K.sound.click()`, or `const h =
K.sound.hum(); h.set(freq, vol)` every frame for a continuous tone (it fades
by itself if not updated). All of these do nothing while sound is off, so
batch runs and worksheet generation stay silent. `K.sound.on` says whether
it is on. Used by Gas in a Box, Simple Harmonic Motion, Lightning and Nerve
Impulse; the music pages, Heart and Circulation, Radioactive Decay and
Chladni Plates have their own Play buttons or sound switches.

## Levels and the Revise tab

Pass `levels: { std, adv, specs: { std, adv } }` to `K.app` for a Standard /
Advanced switch (`ui.level`, `ui.onLevel`); investigations with `lvl: "adv"`
are hidden at Standard. Pass `revise: { ideas: [{ lvl, tag, text }],
questions: [{ lvl, q, marks, ans }] }` for a Revise tab; `q` and `ans` may be
functions so that questions can use the numbers on screen.

## Worksheets

Every investigation (`missions`) and every batch experiment (`batch`) gets a
printable A4 worksheet automatically: set-up steps, the question, a
prediction, a table to record results, and questions to think about. Inside a
page, each investigation card and each batch experiment has a **📄 Worksheet**
button, and the Investigate tab prints all of them (with or without teacher
notes). Teacher notes use each investigation's `hint`, each experiment's
`note` and its `theory`. Nothing extra is needed in a simulation's source.

`node worksheets.js` (after `node build.js`) writes `worksheets.html` beside
every kit page, adding the result of a test run of each batch experiment
(fixed seeds) to the teacher notes. Pass folder names to do only some:
`node worksheets.js waves enzymes`. It needs Playwright.

## WebGL

`K.gl` is a small shared helper for drawing with the graphics card, used by the
"explore" simulations. (Galaxy Collisions and Gravitational Lensing were
written earlier and have their own WebGL code.) Write shaders in GLSL ES 1.00
(`attribute`, `varying`, `texture2D`, `gl_FragColor`): they run on WebGL2 and
WebGL1 alike. Keep the science and every Batch run on the CPU so that they
work without WebGL; use the GPU for the picture.

| Function | What it does |
|---|---|
| `K.gl.create(parent, { dprMax, alpha, antialias, webgl1, onResize, message })` | Adds a canvas filling `parent` (use `ui.stage`) and returns a view `{ el, gl, gl2, ok, w, h, dpr }`. Tries WebGL2, then WebGL1. Keeps the canvas sharp up to `dprMax` (default 1.5) device pixels per CSS pixel and resizes with its parent, calling `onResize(view)`. `preserveDrawingBuffer` is on, so screenshots work. If WebGL is missing, `ok` is false and a clear message is shown over the stage instead; it also says so if the context is lost. A page that can still draw without WebGL (a retrofitted 2D simulation) passes `fallback: "html"`: then a missing or lost context shows that short note in the corner (`K.gl.notice`) instead of covering the stage, and `onLost(view)` is called so the page can switch back to its 2D drawing. |
| `K.gl.program(gl, vertexSrc, fragmentSrc)` | Compiles and links. A compile error throws with the shader's log and the offending line. Returns `{ prog, use(), set({...}) }`: `set` knows each uniform's type, so `p.set({ uTime: 1.5, uRes: [w, h], uMat: m3, uState: target })` works; textures (or targets) get their own texture units automatically. `aPos` is always attribute 0. |
| `K.gl.QUAD_VS`, `K.gl.quad(gl)` | A full-screen quad for fragment-shader simulations and pictures (fractals, grids, ray tracing). `QUAD_VS` passes `vUv` (0–1). `q.draw(program, target)` draws into a target, or to the screen if `target` is `null`; leave it out to keep the current framebuffer. |
| `K.gl.floatType(gl, { blend })` | Finds the best texture format the card can draw into, by trying: 32-bit float, then 16-bit (half) float, then bytes. With `blend: true` (the target will be drawn into with blending, e.g. particles adding up their deposits) 32-bit floats are used only if the card can blend them (`EXT_float_blend`), otherwise half floats. Returns `{ type, internal, format, kind: "float" \| "half" \| "byte", linear }`. |
| `K.gl.target(gl, w, h, { float, blend, filter, wrap, data })` | One texture with its framebuffer. `float: true` uses `floatType` (passing `blend`); `filter` `"nearest"` (default) or `"linear"`; `wrap` `"clamp"` (default) or `"repeat"`. `t.upload(Float32Array)` sets it (4 numbers per texel; converted to half floats or bytes as needed), `t.read()` copies it back as floats, or `t.read(x, y, w, h)` just a rectangle (slow: tests and occasional measurements only), `t.dispose()`. |
| `K.gl.pingpong(gl, w, h, opts)` | Two targets for stepping a grid on the GPU (reaction–diffusion, automata, fluids): draw from `pp.read` into `pp.write`, then `pp.swap()`. `pp.upload(data)` fills both. |
| `K.gl.bindTarget(gl, target)` | Draw into a target (viewport set to its size), or `null` for the screen. |
| `K.gl.points(gl, { aPos: 3, aCol: 4, ... })` | GPU particles (or lines and triangles): one buffer per attribute. `g.set("aPos", Float32Array)` uploads, `g.draw(program, count, mode)` draws (`mode` defaults to `gl.POINTS`; pass `gl.LINES`, `gl.LINE_STRIP` or `gl.TRIANGLES` for others). Use `gl_PointSize` in the vertex shader and `gl_PointCoord` for round, glowing dots; additive blending (`gl.blendFunc(gl.ONE, gl.ONE)`) makes dense crowds glow. |
| `K.gl.screenshot(name, ...canvases)` | Layers the canvases in order (the WebGL view first, then a 2D label canvas from `ui.canvas`) into one PNG and downloads it as `name.png`. With `name` `false` it returns the PNG as a data URL instead. |
| `K.gl.noGL(parent, html)` | Shows the "needs WebGL" message (used by `create`). |
| `K.gl.BICUBIC` | GLSL to paste into a fragment shader: `bicubic(tex, gridSize, p)` reads a grid texture smoothly (clamped Catmull-Rom, no rings round sharp spikes), `p` in cells. Used to draw a coarse model grid at full screen resolution. |
| `K.gl.viewportRect(view, x, y, w, h)` | Draw to the screen inside a rectangle given in CSS pixels from the top left, as on a 2D canvas (e.g. a letterboxed picture). |
| `K.gl.notice(parent, html)` | A small note in the bottom-left corner of the stage that does not block it, e.g. "No WebGL here: drawing in 2D". `""` hides it. |

`gl_test.html` in this folder uses every helper (a diffusing hot spot stepped
on the GPU, a ring of points, a deliberate shader error and a screenshot);
`node gl_test.js` opens it in headless Chromium with WebGL2, with WebGL1 and
with WebGL switched off, and checks the results. It is not on the front page.

### Retrofitted simulations

Some older simulations now draw (and sometimes step) with WebGL while keeping
their CPU model for the Batch run, worksheets and investigations' set-ups:
Turing Patterns (GPU model and drawing, with a "Detail (graphics card)"
group and a GPU-against-CPU check), Ripple Tank, Wind Tunnel, Quantum Wave
Lab, Wildfire and Lightning (drawing only), and Aerofoil Flow (the exact
panel-method flow at every pixel). Each falls back to its 2D drawing without
WebGL (`fallback` / `onLost`), and says in "The model" what runs where, the
grid resolution and any numerical differences.
