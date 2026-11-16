# Tidy layout

The shared side-panel layout used by every simulation:
- the level shown as one line, with the full note in a drop-down;
- presets in a menu;
- folding section headings, with seed, quality and picture under "More settings";
- Live / Graphs / Practical / Learn / Exam tabs on the right, with "More readings".

It only rearranges the page after the simulation has built it. It never changes a model or a batch experiment.

- `typein.js`: click the value beside any slider (or Tab to it and press Enter) to type an exact value. It reads what the page displays, so units, unit prefixes (μF, kΩ), powers of ten and log-scale sliders all work. `inject.py` adds it to every page it tidies; `apply.py` also adds it on its own (`inject.py <html> --typein-only`) to every other standalone page, including `original/` copies.
- `tidy.css` and `tidy.js`: the add-on. The header of `tidy.js` lists every setting.
- `configs/<folder>.json`: one simulation's settings (its level lines, and which blocks go on which tab).
- `inject.py <html> '<json>'`: copies the add-on and one config into a simulation file, inline. Each simulation stays a single self-contained file. Re-running it replaces the old copy.
- `apply.py [folder ...]`: re-injects from the configs. Run it after changing `tidy.js`, `tidy.css` or `typein.js`, or after rebuilding a simulation.
