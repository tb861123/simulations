# Manual review checklist (owner-run, real browser)

Tick each line in **Chrome and Edge on your laptop**, and on a **Surface or other touch tablet**.
Open `three-body-chaos.html` directly, then again via `Start-Lab.cmd` (http://127.0.0.1:4173/).

## Start-up and calculation
- [ ] Page opens with no error banner; the Sample tab (and the left panel's *Initial geometry*) shows the initial geometry: A and B close together, C far to the left.
- [ ] A coarse map appears within a second or two and fills in to 100 × 100. Hatched = not yet calculated, dimmed = preview only.
- [ ] Status line shows done / left / unresolved / failed / provisional, **ETA as HH:MM:SS** (`—:—:—` while unknown), busy workers and samples per second.
- [ ] Pause stops progress, Resume continues, Cancel stops and keeps finished samples, Calc continues again.
- [ ] Typing in controls stays smooth while the map calculates (the UI never freezes). Lower the worker slider to 1 and confirm it still responds.

## Selecting and replaying
- [ ] Hover shows *b* and *v*; click a pixel: Sample tab shows exactly those values, generated positions and velocities, solver settings, outcome, status and reliability.
- [ ] No body moves when you click the map. (Left panel: *Place body* then clicking the small geometry picture does move it, in the pending set-up.)
- [ ] Trajectory replays from t = 0: play, pause, step, restart, speed, scrub, trail length, *Clear trace*, auto-frame, manual drag / wheel, track COM / A / B / C, velocity and acceleration arrows, candidate binary line.
- [ ] Graphs: distances, conservation, speeds, binary energy, momentum and COM; conservation errors are small and finite.
- [ ] Switching view frame (centre of mass ↔ as integrated) changes only the picture.

## Boundaries, regions, refinement
- [ ] Boundary overlay toggles; colours match the legend. Regions tab lists ranked regions with coordinates, outcomes, counts, reasons and reliability; hovering one outlines it on the map.
- [ ] *Zoom*, *Refine*, *Extend*, *Compare both sides*, *Validate* work from a region card. Zooming starts new calculation (watch counts reset for the new layer).
- [ ] Zoom box, wheel / trackpad zoom, drag pan, double-click zoom (shift = out), pinch on a tablet, Back / Forward / Reset, *Save region* chips.
- [ ] Auto-Explore Boundaries: pause / resume / cancel; status reports the stop reason; never claims completeness. Setting max depth 1 and a tiny budget stops quickly.
- [ ] Zoom deep until the amber warning about Float64 / tolerance appears.

## Comparison and confidence
- [ ] Compare both sides: two different outcomes, exact changed *b* and *v* listed, overlay and side-by-side, graphs incl. neighbour separation; caveat text mentions common times and "not a Lyapunov exponent".
- [ ] Compare perturbed (try *v* by 1e-6 and *binary phase* by 0.1).
- [ ] Validate: statuses appear; "Numerical reliability" map mode shows untested vs validated; independent reference table appears for a selected sample.

## Editing and colours
- [ ] Type `-`, `1e-3`, `.5` in mass / position fields without the field fighting you. Enter or Tab commits; nonsense reverts with an explanation; negative mass is clamped with a message; overlapping bodies are rejected.
- [ ] Edits show **Pending physical changes**; the map does not change until *Apply & recalculate*; *Discard* reverts. Changing the mass back and applying returns the earlier map at once.
- [ ] Colour swatches: spectrum click, brightness, Hex and R/G/B fields (0–255). The map, legend, trails and PNG recolour instantly and **no calculation restarts**.
- [ ] Presets: each loads, calculates and shows its evidence and limitations. (Pythagorean takes about a minute.)

## Save, resume, export
- [ ] Save to browser reports "✔ Saved …"; reload the page; the recovery banner offers the autosave; Restore opens it **paused**; Resume continues.
- [ ] Download file, then Import file (also try your own corrupted copy: it must be refused with reasons). Import `examples/example-investigation.tbcl.json.gz`.
- [ ] Exports open correctly: PNG (legend not clipped with many categories), samples CSV, trajectory CSV, configuration JSON, validation report, boundary regions JSON and edges CSV; each lists units, ranges, parameters, solver, criteria, horizon and versions.
- [ ] Batch run: pick each of the four experiments, Run, Download CSV.

## Layouts
- [ ] 1280 × 720 laptop: three columns, nothing clipped, no horizontal scroll.
- [ ] Surface / tablet landscape and portrait: *Settings | Map | Inspect* switcher, touch tap selects, pinch zooms.
- [ ] Browser zoom 125 % / 150 % still usable.

## Developer re-check
```
cd source && npm install && npm run build && npm test && npm run browser-check
```
