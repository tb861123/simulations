# Pathfinding: Dijkstra and A*

A single, self-contained HTML file: Draw walls and mud on a grid and watch Dijkstra's algorithm spread out while A* heads for the goal, with the priority queue, g and f values on show; or step through Dijkstra's distance table on a small weighted graph. It needs no install and no
internet: **open `pathfinding.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/pathfinding.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `pathfinding.html` by hand.

- **Graphs (9618):** Cambridge International AS & A Level Computer Science 9618: graphs as an abstract data type (A Level 19.1): nodes, edges and weights; representing a route-finding problem as a graph. A good introduction to the A Level algorithms.
- **A Level AI (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 18.1 Artificial Intelligence: using graphs to aid AI; Dijkstra's algorithm and the A* algorithm to find the shortest path, with the heuristic. Greedy best-first search is shown for comparison (beyond the syllabus).

## What it shows

Grid map: click and drag to draw walls or mud (cost 5), drag the start and goal, and watch the open list (light blue) and visited cells (dark blue) grow until the path appears, with the priority queue listed in order and a comparison of the three algorithms on the current map. Small graph: Dijkstra's algorithm step by step with the distance, previous-node and visited table.

Try this first: Run Dijkstra, then A*, on the same map. How many fewer nodes does A* expand?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Dijkstra on an open grid | 2: 9 ± 0 · 4: 33 ± 0 · 6: 73 ± 0 · 8: 129 ± 0 · 10: 199 ± 0 · 12: 271 ± 0 (mean ± SE, 1 runs each) (theory: cells within distance d: 2d² + 2d + 1) |
| A* on an open grid | 2: 3 ± 0 · 4: 5 ± 0 · 6: 7 ± 0 · 8: 9 ± 0 · 10: 11 ± 0 · 12: 13 ± 0 (mean ± SE, 1 runs each) (theory: d + 1 (straight there)) |
| A* against Dijkstra on random maps (A level) | mean 0.36, SD 0.158, SE 0.0144 from 120 runs |
| Is A* always optimal? (A level) | mean 0, SD 0, SE 0 from 120 runs (theory: 0: both optimal) |
| How much worse is greedy? (beyond) | mean 11.6, SD 7.89, SE 0.72 from 120 runs (theory: optimal) |

## The model

4-neighbour grid graph with costs 1 and 5; Dijkstra, A* (Manhattan heuristic) and greedy best-first with a simple priority queue. Assumptions and simplifications are listed inside the simulation under **The model**.
