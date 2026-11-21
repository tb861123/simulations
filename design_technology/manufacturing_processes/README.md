# Manufacturing Processes and Quality

A single, self-contained HTML file: five ways to make a polymer phone stand (3D printing, laser-cut acrylic, CNC machining, vacuum forming, injection moulding) compared on tooling, cost per part, time and accuracy, from one-off to a million; then parts coming off the machine, measured against a tolerance, with a control chart and tool wear. It needs no install and no
internet: **open `manufacturing-processes.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/manufacturing_processes.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `manufacturing-processes.html` by hand.

- **Standard (GCSE):** AQA GCSE Design and Technology (8552): scales of production, shaping and forming polymers, quality control and tolerances.
- **Advanced (A level):** AQA A level Product Design (7552) 3.1.4 forming and addition processes, 3.1.6 scales of production and quality control/assurance, 3.2.7 accuracy and tolerances, 3.2.9 design for manufacture, costing and break-even. Process capability (Cpk) is beyond the spec.

## What it shows

The chosen machine with its tooling cost and cycle time, parts riding a conveyor through a gauge (green within tolerance, red rejected), a histogram of sizes against the tolerance band, and a table of every process's cost per unit, order total and time for the chosen quantity (cheapest highlighted). Charts of cost per unit against quantity on log scales with the break-even quantity, and of each part's width (a control chart with warning and action lines at A level). Controls for quantity (1 to a million), process, machines, tolerance and tool wear.

## Batch run

| Experiment | What it compares |
|---|---|
| Cost per unit and quantity | log cost per unit against tooling ÷ n + cost per part |
| 3D print or mould? | cost ratio against the exact ratio (break-even ≈ 2,260) |
| Tolerance and rejects | % rejected against 2Φ(−tolerance ÷ σ) |
| Measuring capability (A level) | Cpk from 30 parts against the true Cpk |
