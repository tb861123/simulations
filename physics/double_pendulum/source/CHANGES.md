# Exploration improvements — 22 October 2026

1. **Persistent map experiments.** Named saves, periodic autosave, restore paused, delete, checkpoint download and import. IndexedDB stores settings and Float64 checkpoints, including divergence pairs. Portable files preserve binary precision. Playback and graph-view settings are restored too. Storage errors are visible and checkpoint downloads work independently of browser storage.
2. **Accuracy reporting.** Every map tracks peak normalised energy drift after each primary-trajectory RK4 step. A drift heat map, per-pixel readout and count above 0.1% help identify unresolved results. The inspector can compare a selected trajectory at Δt, Δt/2 and Δt/4 in a cancellable worker, showing energy peaks, first flips and final-state differences.
3. **Divergence map.** A sixth mode measures log10(d(t)/epsilon) between independently integrated nearby starts. The metric wraps angle differences and scales angular velocities. Values are explicitly finite-time diagnostics, with saturation and numerical limitations explained.
4. **Dynamic tile queue.** Small row tiles are assigned to whichever CPU worker becomes available. A barrier keeps each published field at one simulation time. Tile progress is shown. Checkpoints can be taken at a coherent barrier, and cancelling an experiment terminates its worker pool.
5. **Scientific exports.** Map PNGs include axes, colour scale and numerical ticks, model parameters, integration step, resolution and computed duration. Map CSV includes initial angles, first-flip times, divergence and energy drift where applicable.

Verification: TypeScript checking and production build passed. All 35 physics, production-worker, parallel-pool, checkpoint and convergence checks passed. Native Canvas exports were rendered and visually inspected. Updated reproducible benchmark samples are included in BENCHMARK.json.

Verification limit: browser inspection was blocked by the browser security policy. Actual live UI and IndexedDB operations have not been verified in a browser in this environment. Checkpoint file round trips, resumed calculations and the storage-unavailable fallback are tested. Browser saves are origin-specific and may be removed by clearing site data; downloaded checkpoints are the portable backup. Autosave can lose the latest approximately 15 seconds of progress on abrupt closure.

## Display-only colour changes

Colour palette now updates every map from retained numerical results, without recalculation, worker restart or progress changes. Legends and PNG exports follow the palette. Automated checks cover all map modes, numerical immutability and zero extra calculation tasks for completed and paused partial maps.

Validation after the colour update: production build succeeded and all 39 automated checks passed.

## Manual map workspace — 11 November 2026

Setup, Map and Trajectory have separate responsibilities. Recalculate map commits pending settings and the requested view; navigation previews original samples without launching a worker. The inspector plays a separate trajectory. View, Analysis, Investigation, Diagnostics and Validation group optional controls. Exports label the full calculated range and its applied settings.

Validation: production build and all 44 automated checks passed. The local HTTP smoke check was blocked by sandbox loopback access, so interactive browser verification was unavailable.


## ROYGBIV and analytic no-flip exclusion

Added a display-only ROYGBIV palette with linear time calibration (blue zero, green half-window, red full-window), matching screen and export legends, checkpoint palette support, and conserved-energy exclusion for first-flip cells. The inspector reports guaranteed all-time no-flip conditions and CSV exports include the classification. Energy-excluded cells are not integrated; their stored state is initial and their zero drift reflects no steps. Other white cells remain finite-horizon observations. Production build and all 47 automated checks passed.

