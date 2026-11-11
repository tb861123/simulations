# Tidy layout

The shared side-panel layout used by every simulation:
- the level shown as one line, with the full note in a drop-down;
- presets in a menu;
- folding section headings, with seed, quality and picture under "More settings";
- Live / Graphs / Practical / Learn / Exam tabs on the right, with "More readings".

It only rearranges the page after the simulation has built it. It never changes a model or a batch experiment.

- `tidy.css` and `tidy.js`: the add-on. The header of `tidy.js` lists every setting.
- `configs/<folder>.json`: one simulation's settings (its level lines, and which blocks go on which tab).
- `inject.py <html> '<json>'`: copies the add-on and one config into a simulation file, inline. Each simulation stays a single self-contained file. Re-running it replaces the old copy.
- `apply.py [folder ...]`: re-injects from the configs. Run it after changing `tidy.js` or `tidy.css`, or after rebuilding a simulation.
