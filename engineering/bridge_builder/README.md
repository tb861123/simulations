# Bridge Builder

A single, self-contained HTML file about trusses and bridges. It needs no
install and no internet: **open `bridge-builder.html` in Chrome or Edge**. The
main view runs on the graphics card (WebGL); without WebGL the page draws a
simpler 2D picture, and the Batch run works either way.

Built with the kit from `tools/kit/src/bridge_builder.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `bridge-builder.html` by hand. It is an
"explore" simulation: no Standard / Advanced switch and no Revise tab.

## What you see

Drag from joint to joint to build a truss of steel tubes, timber beams or
steel cables over a gap, then drive a car or lorry across. Every member is
coloured by its force: blue when stretched (tension), red when squashed
(compression), glowing as it nears its limit. Overloaded members snap or
buckle, the forces are worked out again, and the failure can spread until the
bridge falls into the river. Four levels with budgets (a timber footbridge, a
lorry route, an arch over a gorge, a cable-stayed span) and a Sandbox; example
designs (Warren, Pratt, Howe, arch, cable-stayed, and squares that wobble).
Hover over a member for its force and limits.

## The model

Pin-jointed truss, solved by the stiffness method (each member a spring
EA/L; Gaussian elimination for the joint movements). Members fail in tension
at σA and in compression at the smaller of σA and Euler's π²EI/L²; cables are
tension-only and go slack. A structure that cannot be solved is a mechanism and
collapses (a simple falling-joints animation). Self weight is included; axle
loads are shared between deck joints by the lever rule. Assumptions are listed
in the page's "The model" tab.

## Batch run

Breaking load against truss depth and number of panels (compared with beam
theory, chord force = M/h, with Euler buckling), load per £1000 for five
shapes, the spread of breaking loads from ±5% member strengths (the weakest
link), and sag against load (compared with δ = PL³/48EI). `worksheets.html`
has a printable sheet for each investigation and experiment, with teacher notes
and test-run results.
