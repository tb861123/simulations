# Prompts for visual "explore" simulations

Fun, exploratory simulations with a WebGL main view, no Standard/Advanced switch and no Revise tab. Each is placed in the subject folder it fits best, or in a new `explore/` folder if it fits none.

**Run prompt 0 first** (the shared WebGL helper); the rest depend on it. After that, each prompt is self-contained and can be pasted into its own new chat. Because every one edits `tools/kit/build.js`, `index.html`, `README.md` and `CLAUDE.md`, run them one at a time or expect small merge conflicts.

## Dropped from the first brainstorm (already in the repo)

- **Double pendulum**: already inside simple_harmonic_motion.
- **Lorenz attractor**: already inside weather_chaos (the attractor gallery uses other attractors).
- **Reaction-diffusion zoo (Gray-Scott)**: already turing_patterns.
- **Black hole viewer**: already gravitational_lensing (ray-traced Schwarzschild).
- **Flocking with predator**: murmuration already has a falcon.
- **Cymatics / drumhead**: chladni_plates already has a drum.
- **Fluid smoke and ink**: wind_tunnel and aerofoil_flow already show smoke and vortices.
- **Rocket and orbit puzzles**: fields_orbits already launches and covers Hohmann transfers.
- **Terraforming**: overlaps greenhouse_effect, ice_albedo and exoplanet_hunting.

## Prompt 0: shared WebGL helper

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them.

Task: add a small shared WebGL helper to the kit, `K.gl`, so that new simulations can use WebGL without each re-writing the boilerplate. Several new "explore" simulations will depend on it, so keep it small, stable and documented.

Look first at how tools/kit/src/galaxy_collisions.js and gravitational_lensing.js already do WebGL (do not rewrite them unless trivial; just learn from them).

K.gl should provide, at least: creating a canvas + context (WebGL2 with WebGL1 fallback, preserveDrawingBuffer for screenshots), a clear "WebGL not available" message, compile/link shader programs with readable error messages, a full-screen-quad helper for fragment-shader simulations, float/half-float ping-pong framebuffers (for reaction-diffusion, fluids, automata) with feature detection, a GPU point-particle helper, resize/devicePixelRatio handling, and a screenshot-to-PNG helper. Add a short "WebGL" section to tools/kit/README.md describing each function.

Prove it with one tiny working demonstration: add a minimal test page under tools/kit/ (not registered on the front page) that uses each helper, and test it in headless Chromium (software GL flags such as --use-gl=swiftshader).

Finish by merging to main and pushing, deleting the feature branch, and end with an explicit "No setup needed" line.
~~~

## Simulation prompts

### 1. Slime mould networks (`biology/slime_mould_networks`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Slime mould networks
Folder: biology/slime_mould_networks  (name the src file after the folder)
Brief: Physarum: thousands of agents sense, deposit and follow chemical trails; the network self-optimises into efficient routes. Place food sources (or load a city/rail map such as the Tokyo rail system) and watch it rediscover real networks. Controls: sensor angle and distance, turn angle, deposit, decay, agent count, trail blur. Visual: glowing veins on dark. Batch: total network length and average path length vs sensor angle/decay; compare with minimum spanning tree length. Do NOT reuse turing_patterns (which already covers Gray-Scott chemistry and mentions slime mould only in passing).
~~~

### 2. Ant colony foraging (`biology/ant_colony`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Ant colony foraging
Folder: biology/ant_colony  (name the src file after the folder)
Brief: Ants leave pheromone, trails form, then adapt when you draw an obstacle or move the food. Controls: colony size, evaporation, exploration randomness, number of food patches; paint walls. Visual: ant swarm plus glowing pheromone field. Batch: food collected per minute vs evaporation rate and vs colony size, showing an optimum. Keep it distinct from the slime mould simulation (discrete agents with nest and food, not a transport network).
~~~

### 3. Creature evolution arena (`biology/creature_evolution`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Creature evolution arena
Folder: biology/creature_evolution  (name the src file after the folder)
Brief: Soft or jointed creatures (springs and muscles) learn to walk, jump or swim over generations through selection, mutation and crossover. Terrain you can edit; watch fitness rise. Visual: many creatures racing in parallel, with a gallery of ancestors. Batch: fitness vs generation across seeds, and vs mutation rate. natural_selection already covers moth-colour style selection, so make this about body plans and behaviour emerging.
~~~

### 4. Fractal explorer (`explore/fractal_explorer`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Fractal explorer
Folder: explore/fractal_explorer  (name the src file after the folder)
Brief: Infinitely zoomable Mandelbrot and Julia sets (GPU, with perturbation or double-single precision to go deep), and a Newton-fractal mode. Click a point in Mandelbrot to see its Julia set live; animate colour palettes; a zoom-tour mode. Batch: iterations to escape along a line, and a box-counting estimate of the boundary dimension. (lightning.js only has DLA fractals, so this is new.)
~~~

### 5. Strange attractor gallery (`explore/strange_attractors`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Strange attractor gallery
Folder: explore/strange_attractors  (name the src file after the folder)
Brief: A gallery of 3D strange attractors rendered as millions of GPU particles with glowing trails: Rossler, Aizawa, Thomas, Halvorsen, Chen, Clifford/de Jong (2D maps) and more, with orbit camera and parameter sliders to morph them. Do not make Lorenz the focus: weather_chaos already has Lorenz 63 and simple_harmonic_motion already has the double pendulum; link to them instead. Batch: Lyapunov exponent estimate vs parameter, and divergence of two nearby starts.
~~~

### 6. Life and cellular automata playground (`explore/life_automata`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Life and cellular automata playground
Folder: explore/life_automata  (name the src file after the folder)
Brief: Conway's Life on a huge GPU grid with a pattern library (glider, glider gun, spaceships, oscillators), draw/erase, speed and zoom, plus Wolfram 1D rules (rule 30, 90, 110) scrolling down the screen, and life-like rulesets (HighLife, Seeds, Day and Night). Visual: age colouring and trails. Batch: soup density vs survival/final population, and rule-class statistics. (No cellular automata exist in the repo.)
~~~

### 7. Sandpile avalanches (`physics/sandpile_avalanches`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Sandpile avalanches
Folder: physics/sandpile_avalanches  (name the src file after the folder)
Brief: Self-organised criticality: grains dropped one at a time, topple at a threshold, avalanches cascade; log-log avalanche size distribution builds up live. 2D heap with colour by height, plus a toggle to a falling-sand 'hourglass' view with segregation. Batch: power-law exponent estimate vs grid size, avalanche-size distribution. (tectonic_hazards and glaciers mention avalanches only in passing.)
~~~

### 8. Thin-film interference colours (`physics/thin_film_colours`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Thin-film interference colours
Folder: physics/thin_film_colours  (name the src file after the folder)
Brief: Soap bubbles, oil slicks and wedge films: thickness, refractive index and angle give interference colours, rendered physically from the spectrum (GPU). A swirling bubble with draining film, a thickness slider, a wedge film view, and the Newton's colour chart. Batch: reflected intensity vs thickness for chosen wavelengths vs theory. (optics_refraction and waves do not cover thin films.)
~~~

### 9. Aurora and the magnetosphere (`physics/aurora_magnetosphere`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Aurora and the magnetosphere
Folder: physics/aurora_magnetosphere  (name the src file after the folder)
Brief: Charged particles from the solar wind spiral along Earth's dipole field lines and hit the atmosphere to make aurora. 3D view with orbit camera, particle GPU trails, solar wind speed/density and field-orientation (Bz) controls, a Kp-index readout and an aurora oval on the globe. Batch: particle precipitation vs Bz and speed. Keep it clear of magnetism_induction (which is about induced EMF, not planetary fields).
~~~

### 10. Fourier epicycles (`explore/fourier_epicycles`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Fourier epicycles
Folder: explore/fourier_epicycles  (name the src file after the folder)
Brief: Draw any shape or pick presets (a bird, the Emanuel crest outline if one can be traced simply, a heart); it is rebuilt from rotating circles (the discrete Fourier transform) and traced out, with a slider for how many circles. Optional Play button turns the same harmonics into sound. Batch: reconstruction error vs number of circles. inside_sound and build_timbre already have 1D Fourier spectra; this is the 2D/epicycle visual, so link to them.
~~~

### 11. Powers of ten (`explore/powers_of_ten`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Powers of ten
Folder: explore/powers_of_ten  (name the src file after the folder)
Brief: A smooth logarithmic zoom through the universe, from the cosmic web (1e26 m) down to quarks (1e-18 m), with real objects, labels, a live scale bar and comparison objects (how many X fit across Y). A 'jump to' list, a free-zoom slider and a two-object size comparison tool. Batch: ratio explorer (how many hydrogen atoms across the Sun, etc.) tabulated with CSV. Needs little modelling; visual polish and accurate data matter most. Cite the sizes.
~~~

### 12. Domino and chain reactions (`engineering/domino_chains`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Domino and chain reactions
Folder: engineering/domino_chains  (name the src file after the folder)
Brief: A 2D/3D physics sandbox where you place dominoes, ramps, balls and levers and set off chain reactions. Tipping thresholds, wave speed of the toppling front, branching and splitting. Batch: front speed vs domino spacing (compare with the published models), and success rate vs spacing/height ratio. Use a simple rigid-body integrator written for the page (no external libraries).
~~~

### 13. Bridge builder (`engineering/bridge_builder`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Bridge builder
Folder: engineering/bridge_builder  (name the src file after the folder)
Brief: Build trusses from joints and members on a budget; a vehicle crosses; members colour from blue (tension) to red (compression) and snap when overloaded. Material choice (steel, timber, cable) with strength and cost, and level goals (span, load, cost). Batch: breaking load vs number of members/shape, compared with simple beam theory. Keep distinct from earthquake_buildings (a shake table, not static truss design).
~~~

### 14. Gravity-assist sandbox (`astrophysics/gravity_slingshots`)

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them, with the exceptions below (the owner has approved these for "explore" simulations).

Task: build the simulation below as a ★ Enhanced kit simulation whose focus is VISUAL IMPACT and EXPLORATION: something a student wants to play with for its own sake, with real science underneath.

Exceptions to the usual rules:
- NO Standard / Advanced switch and NO Revise tab (leave `levels` and `revise` out of K.app).
- Use WebGL for the main view (fragment shaders, GPU particles or instanced drawing as suits). Fall back with a clear message if WebGL is unavailable. Keep the Batch run headless and CPU-side so it works without WebGL.

Still required:
- Use the shared WebGL helper `K.gl` in tools/kit/kit.js if it exists (check first). If it does not exist yet, tell me to run the "Shared WebGL helper" prompt first and stop. (Existing galaxy_collisions.js and gravitational_lensing.js have their own WebGL code; do not rewrite them.)
- The science lives in tools/kit/src/<name>.js; add a line to the SIMS table in tools/kit/build.js; run `node build.js` then `node worksheets.js <name>` from inside tools/kit/. Never hand-edit built HTML.
- Beautiful by default (good colour, smooth motion, sensible starting state that looks great on load), with a few playful controls, click/drag interaction, presets, and a screenshot button. 60 fps on a Surface-class laptop at 1280x720 and up; no phone layouts.
- Ready-made Investigate cards written as "try this" challenges, a Batch run mode with a few one-click experiments (mean, SD, standard error, CSV, compared with theory where one exists), and an in-page list of the model's assumptions and simplifications. Comment the code so a student can follow the science.
- Register it: a row in root README.md, a line in the SIMS list and ENHANCED list in index.html, a 640x360 thumbnail thumbs/<folder>.jpg (Playwright Chromium; use software GL flags such as --use-gl=swiftshader or --enable-unsafe-swiftshader if needed). Update the CLAUDE.md table and the simulation/Enhanced counts. If it goes in a new `explore/` folder, add that folder to the CLAUDE.md table and add an "Explore" group to the front page.
- Test in headless Chromium: no console errors, controls work, batch run completes.
- Finish by merging to main and pushing, deleting the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line.

Simulation: Gravity-assist sandbox
Folder: astrophysics/gravity_slingshots  (name the src file after the folder)
Brief: Many-body gravity sandbox: place a star, planets and a probe, then plan flybys; trajectory predictor, delta-v budget, a Voyager-style tour challenge, and a view of energy gained from a moving planet. Controls for planet mass/velocity and flyby distance. Batch: speed gain vs flyby periapsis and approach angle vs the slingshot formula. Check three_body_chaos (chaos with three bodies) and fields_orbits (launches in a fixed field) and avoid duplicating them: this one is about deliberately using a moving body to gain speed.
~~~
