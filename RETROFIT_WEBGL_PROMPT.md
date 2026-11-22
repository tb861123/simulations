# Prompt: retrofit WebGL into the strong-benefit simulations

Run the "Shared WebGL helper" prompt in `EXPLORE_SIM_PROMPTS.md` first (this prompt stops if `K.gl` does not exist). Paste everything inside the block into a new chat.

~~~text
You are working in the simulations repo. Read CLAUDE.md and tools/kit/README.md first and follow them.

Task: retrofit a WebGL main view into the existing ★ Enhanced simulations that gain most from the GPU, one at a time, WITHOUT changing their science, controls, Investigate cards, Revise tabs, Standard/Advanced behaviour or Batch run results.

Prerequisite: the shared helper `K.gl` must exist in tools/kit/kit.js (and be documented in tools/kit/README.md). If it does not, stop and tell me to run the "Shared WebGL helper" prompt first. Use K.gl, not new boilerplate.

The simulations, in this order (pilots first):
1. turing_patterns (320x320 Gray-Scott, ping-pong float textures; aim for 1024x1024 or more, smooth colour ramps, paint with the mouse)
2. waves (320x320 ripple tank; smooth wavefronts and interference, higher resolution)
3. wind_tunnel (240-wide flow solver; GPU smoke/dye and streamlines at higher resolution)
4. aerofoil_flow (per-pixel flow drawing)
5. quantum_wave_lab (256x256 wavefunction and 1,400 particles; GPU colour-phase rendering)
6. forest_fire (200x200 spread; glowing embers and smoke)
7. lightning (188-wide field; glow and branching rendering)
Stop after the two pilots (1 and 2) and report before doing 3 to 7 if anything below fails.

Method for each simulation:
- Read tools/kit/src/<name>.js first and write down which parts are MODEL (state updates the student's results depend on) and which are DRAW (pixel/canvas output). Only the DRAW part moves to WebGL by default.
- Where the model itself is a grid update (turing_patterns, waves, quantum_wave_lab, wind_tunnel), you may move the live simulation step to the GPU for speed and resolution, but then:
  * KEEP the existing CPU model, unchanged, as the model used by Batch run, worksheets generation (`node worksheets.js`) and the headless tests. The Batch run must stay headless, seeded and reproducible, and must not need WebGL.
  * Add a check that the GPU and CPU models agree: run both from the same start for a fixed number of steps and compare a summary statistic (for example mean concentration, total energy, or wave amplitude at a probe), and report the difference in your summary. Agreement within a small tolerance is required; if it cannot be met, keep the model on the CPU and use the GPU for drawing only.
  * Label the on-screen resolution and make the on-screen readouts, charts and Investigate-card set-ups still work (they read model state, so make sure GPU state is read back only when needed and at a low rate).
- Keep all existing controls, sliders (including typeable values), presets, mouse interaction, playback-speed control in the header, sound where present, and the screenshot/PNG export working. Screenshots must still include the WebGL canvas (preserveDrawingBuffer or an explicit render before capture).
- If WebGL is unavailable or the context is lost, fall back to the existing 2D canvas path with a short visible notice (so the page never breaks, and old machines still work).
- Keep the visuals strictly better, not just different: smooth interpolation, no banding, good colour. Look at before and after screenshots yourself and say what changed.
- Keep it a single self-contained HTML file: build with `node build.js` from tools/kit/, never hand-edit built HTML. Re-run `node worksheets.js <name>` for each retrofitted simulation and confirm the worksheet test-run numbers have not changed (they should not, as Batch is unchanged). Do not touch any `original/` folders.
- Update the simulation's in-page assumptions list so it states the grid resolution and any numerical differences from before.

Testing (each simulation, in headless Chromium with software GL such as --use-gl=swiftshader or --enable-unsafe-swiftshader):
- No console errors; the page runs 10 seconds at its default settings; controls and every Investigate card's set-up still work; Batch run completes with the same results as on main before your change (record a before/after table).
- Take a 640x360 before/after screenshot pair; refresh thumbs/<folder>.jpg only if the new one looks clearly better.
- Measure frame time on the software renderer or, failing that, report that real-GPU frame rate could not be measured here.

Finish each simulation with its own commit. At the end, merge to main and push, delete the feature branch (say plainly if the remote delete fails), and end with an explicit "No setup needed" line. Report which simulations were done, which were left on 2D and why, and the GPU-vs-CPU agreement numbers.
~~~
