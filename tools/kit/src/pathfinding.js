/* =====================================================================
   PATHFINDING: DIJKSTRA AND A*
   A map is a GRAPH: places (nodes) joined by edges with a cost
   (distance, time). To find the cheapest route from a start node:
   DIJKSTRA'S ALGORITHM
     give the start a cost of 0 and every other node ∞
     REPEAT: take the unvisited node with the SMALLEST cost so far
             (from a priority queue), mark it visited, and for each
             neighbour: if cost(node) + edge < cost(neighbour), update
             the neighbour's cost and remember where it came from
     UNTIL the goal is visited. Follow the "came from" links back.
   It explores outwards in all directions, like ripples.
   A* ALGORITHM: the same, but the queue is ordered by
       f = g + h,   g = cost so far, h = a HEURISTIC estimate of the cost
   still to go (here the Manhattan distance |dx| + |dy|). It heads
   towards the goal and usually explores far fewer nodes, and it still
   finds the cheapest path if h never overestimates.
   GREEDY best-first uses h alone: fast, but its path can be poor.
   ===================================================================== */
// ---------------- 1. The grid map ----------------
const GW = 32, GH = 18, MUD = 5;     // mud cells cost 5 to enter; ordinary cells cost 1
const idx = (x, y) => y * GW + x;
function neighbours(i) { const x = i % GW, y = (i / GW) | 0, out = []; if (x > 0) out.push(i - 1); if (x < GW - 1) out.push(i + 1); if (y > 0) out.push(i - GW); if (y < GH - 1) out.push(i + GW); return out; }
const manh = (a, b) => Math.abs(a % GW - b % GW) + Math.abs(((a / GW) | 0) - ((b / GW) | 0));
// The search, as a generator that yields after every node it expands (so the page can animate it)
function* search(cells, s, t, alg) {
  const N = cells.length, g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), open = [];
  const h = i => alg === "dijkstra" ? 0 : manh(i, t), pri = i => alg === "greedy" ? h(i) : g[i] + h(i);
  g[s] = 0; open.push(s); let expanded = 0;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) { const a = pri(open[k]), b = pri(open[bi]); if (a < b - 1e-9 || (Math.abs(a - b) < 1e-9 && h(open[k]) < h(open[bi]))) bi = k; }   // smallest priority (ties: nearer the goal)
    const u = open.splice(bi, 1)[0]; if (done[u]) continue; done[u] = 1; expanded++;
    if (u === t) break;
    for (const v of neighbours(u)) { if (cells[v] === 1 || done[v]) continue; const ng = g[u] + (cells[v] === 2 ? MUD : 1); if (ng < g[v]) { g[v] = ng; from[v] = u; open.push(v); } }
    yield { g, from, done, open, u, expanded, pri };
  }
  const path = []; if (g[t] < Infinity) { for (let v = t; v !== -1; v = from[v]) path.push(v); path.reverse(); }
  yield { g, from, done, open, u: t, expanded, path, cost: g[t], finished: true, pri };
}
function runToEnd(cells, s, t, alg) { let last; for (const e of search(cells, s, t, alg)) last = e; return last; }
function randomMap(r, wall, mud) { const c = new Uint8Array(GW * GH); for (let i = 0; i < c.length; i++) { const u = r(); c[i] = u < wall ? 1 : u < wall + mud ? 2 : 0; } return c; }

// ---------------- 2. A small exam-style graph ----------------
const GN = { A: [60, 200], B: [200, 80], C: [200, 320], D: [360, 190], E: [500, 70], F: [520, 310], G: [660, 190] };
const GE = [["A", "B", 4], ["A", "C", 2], ["B", "C", 1], ["B", "D", 5], ["C", "D", 8], ["C", "F", 10], ["D", "E", 2], ["D", "F", 6], ["E", "G", 3], ["F", "G", 2], ["E", "F", 4]];
function* dijkstraGraph(start, goal) {
  const dist = {}, prev = {}, vis = {}; for (const k in GN) dist[k] = Infinity; dist[start] = 0; const order = [];
  while (true) { let u = null; for (const k in GN) if (!vis[k] && (u === null || dist[k] < dist[u])) u = k; if (u === null || dist[u] === Infinity) break; vis[u] = true; order.push(u);
    const upd = []; for (const [a, b, w] of GE) { const v = a === u ? b : b === u ? a : null; if (!v || vis[v]) continue; if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; upd.push(v); } }
    yield { dist: { ...dist }, prev: { ...prev }, vis: { ...vis }, u, upd, order: order.slice() }; if (u === goal) break; }
  const path = []; for (let v = goal; v; v = prev[v]) path.unshift(v); yield { dist, prev, vis, u: goal, order, path, finished: true };
}

// ---------------- 3. State ----------------
const DEF = { mode: "grid", alg: "astar", wall: 0.22, mud: 0.08, speed: 30, tool: "wall", start: "A", goal: "G" };
const P = Object.assign({}, DEF);
let cells = null, S = idx(2, 9), T = idx(29, 9), it = null, st = null, acc = 0, gIt = null, gSt = null, seed = 7;
function restart() { if (P.mode === "grid") { it = search(cells, S, T, P.alg); st = null; } else { gIt = dijkstraGraph(P.start, P.goal); gSt = null; } acc = 0; }
function newMap(sd) { seed = sd != null ? sd : Math.floor(Math.random() * 1e9); cells = randomMap(K.rng(seed), P.wall, P.mud); cells[S] = cells[T] = 0; restart(); }
function advance() { if (P.mode === "grid") { if (!it || (st && st.finished)) return; const r = it.next(); if (!r.done) st = r.value; } else { if (!gIt || (gSt && gSt.finished)) return; const r = gIt.next(); if (!r.done) gSt = r.value; } }

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Pathfinding: Dijkstra and A*", subject: "Computer Science",
  blurb: "Draw walls and mud, then watch Dijkstra spread out and A* head for the goal; or work through Dijkstra's table on a small graph",
  reset: () => restart(), step: () => advance(),
  levels: { std: "Graphs (9618)", adv: "A Level AI (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618: graphs as an abstract data type (A Level 19.1): nodes, edges and weights; representing a route-finding problem as a graph. A good introduction to the A Level algorithms.",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 18.1 Artificial Intelligence: using graphs to aid AI; Dijkstra's algorithm and the A* algorithm to find the shortest path, with the heuristic. Greedy best-first search is shown for comparison (beyond the syllabus)." } },
  missions: [
    { title: "Dijkstra's table", q: "Work through Dijkstra's algorithm from A to G on the small graph, one step at a time. Which node is chosen each time? Check the table against your own working.", hint: "Always the unvisited node with the smallest distance: A(0), C(2), B(3 via C), D(8 via B), E(10), F(12 via C), G(13 via E). Shortest A → G: A–C–B–D–E–G = 13.", setup: () => set({ mode: "graph" }) },
    { title: "Dijkstra on a map", q: "Run Dijkstra on the grid. What shape does the explored region grow in? Why does it explore away from the goal too?", hint: "A diamond (all cells with equal cost so far, using 4-way moves). Dijkstra knows nothing about where the goal is, so it explores in every direction equally.", setup: () => set({ mode: "grid", alg: "dijkstra", wall: 0.1, mud: 0 }) },
    { title: "A* heads for the goal", q: "Same map with A*. How many nodes does it expand compared with Dijkstra? Is its path just as short?", hint: "Far fewer: the heuristic pulls it towards the goal. The path cost is the same, because the Manhattan distance never overestimates the true cost (it is admissible).", setup: () => set({ mode: "grid", alg: "astar", wall: 0.1, mud: 0 }) },
    { title: "Mud", q: "Mud costs 5 to cross. Add mud and compare the paths. Does the shortest path always take the fewest steps?", hint: "No: the cheapest path may take a longer route around the mud. Dijkstra and A* minimise total cost, not the number of cells.", setup: () => set({ mode: "grid", alg: "astar", wall: 0.15, mud: 0.25 }) },
    { lvl: "adv", title: "Greedy is fast but not always right", q: "Switch to greedy best-first (h only) on a maze. Is its path the cheapest? Why?", hint: "It rushes towards the goal and often finds a path quickly, but it ignores the cost so far, so it can take a long detour or wade through mud. A* balances the two (f = g + h).", setup: () => set({ mode: "grid", alg: "greedy", wall: 0.25, mud: 0.15 }) },
  ],
  batch: [
    { title: "Dijkstra on an open grid", question: "With no walls or mud, how many cells does Dijkstra expand to reach a goal d steps away?", how: "Exact run for each distance (start in the middle of the grid, goal d steps to the right).", xLabel: "distance d", yLabel: "cells expanded", xs: [2, 4, 6, 8, 10, 12], reps: 1, yMin: 0, theory: d => 2 * d * d + 2 * d + 1, theoryLabel: "cells within distance d: 2d² + 2d + 1", run: d => { const c = new Uint8Array(GW * GH), s = idx(14, 9); return runToEnd(c, s, s + d, "dijkstra").expanded; }, note: "Dijkstra explores a whole diamond of radius d (slightly fewer, since it stops as soon as the goal is taken from the queue). That is O(d²) work." },
    { title: "A* on an open grid", question: "And A* with the Manhattan heuristic?", how: "Exact run for each distance.", xLabel: "distance d", yLabel: "cells expanded", xs: [2, 4, 6, 8, 10, 12], reps: 1, yMin: 0, theory: d => d + 1, theoryLabel: "d + 1 (straight there)", run: d => { const c = new Uint8Array(GW * GH), s = idx(14, 9); return runToEnd(c, s, s + d, "astar").expanded; }, note: "With no obstacles the heuristic is exact, so A* walks straight to the goal: O(d)." },
    { title: "A* against Dijkstra on random maps (A level)", question: "On random maps with 22% walls and 8% mud, what fraction of Dijkstra's work does A* do?", how: "Each run: a random map; nodes expanded by A* ÷ by Dijkstra (maps with no route are skipped).", yLabel: "A* expansions ÷ Dijkstra expansions", reps: 120, bins: 20, lo: 0, hi: 1, run: (x, r) => { const c = randomMap(r, 0.22, 0.08), s = idx(2, 9), t = idx(29, 9); c[s] = c[t] = 0; const d = runToEnd(c, s, t, "dijkstra"); if (!d.path.length) return null; return runToEnd(c, s, t, "astar").expanded / d.expanded; }, note: "Usually well under half. A* never does more work than Dijkstra with an admissible heuristic, apart from ties." },
    { title: "Is A* always optimal? (A level)", question: "Does A*'s path ever cost more than Dijkstra's?", how: "Each run: a random map; A* cost − Dijkstra cost.", yLabel: "A* cost − Dijkstra cost", reps: 120, bins: 10, lo: -0.5, hi: 9.5, theory: 0, theoryLabel: "0: both optimal", run: (x, r) => { const c = randomMap(r, 0.22, 0.08), s = idx(2, 9), t = idx(29, 9); c[s] = c[t] = 0; const d = runToEnd(c, s, t, "dijkstra"); if (!d.path.length) return null; return runToEnd(c, s, t, "astar").cost - d.cost; }, note: "Always 0: Manhattan distance never overestimates (each step costs at least 1), so A* is guaranteed to find a cheapest path." },
    { title: "How much worse is greedy? (beyond)", question: "How much more does greedy best-first's path cost than the best path?", how: "Each run: a random map; greedy cost − optimal cost.", yLabel: "extra cost", reps: 120, bins: 16, theory: 0, theoryLabel: "optimal", run: (x, r) => { const c = randomMap(r, 0.22, 0.08), s = idx(2, 9), t = idx(29, 9); c[s] = c[t] = 0; const d = runToEnd(c, s, t, "dijkstra"); if (!d.path.length) return null; return runToEnd(c, s, t, "greedy").cost - d.cost; }, note: "Usually worse, often by 10 or more: ignoring the cost so far means it is lured into mud and dead ends. Its strength is speed, not quality." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "19.1", text: "A graph is a set of nodes (vertices) joined by edges; edges may have weights (costs) and directions. Maps, networks and puzzles can be modelled as graphs." },
      { lvl: "adv", tag: "18.1", text: "Dijkstra: set all distances to ∞ except the start (0). Repeatedly visit the unvisited node with the smallest distance and update its neighbours' distances if a shorter route is found. Finds the shortest path from the start to every node (non-negative weights)." },
      { lvl: "adv", tag: "18.1", text: "A*: like Dijkstra but chooses the node with the smallest f = g + h, where g is the cost from the start and h is a heuristic estimate to the goal (e.g. Manhattan or straight-line distance). Explores fewer nodes; optimal if h never overestimates." },
      { lvl: "adv", tag: "18.1", text: "Both use a priority queue (open list) of nodes to explore and a visited (closed) list; following each node's 'previous node' back from the goal gives the path." },
    ],
    questions: [
      { lvl: "adv", marks: 5, q: "Use Dijkstra's algorithm to find the shortest path from A to G on the small graph (edges AB 4, AC 2, BC 1, BD 5, CD 8, CF 10, DE 2, DF 6, EG 3, FG 2, EF 4).", ans: "<ul><li>A 0; C 2; B 3 (via C); D 8 (via B)</li><li>E 10 (via D); F 12 (via C)</li><li>G 13 (via E)</li><li>path A → C → B → D → E → G</li><li>length 13</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain how A* differs from Dijkstra's algorithm and why it is usually faster.", ans: "<ul><li>A* adds a heuristic h (estimated cost to the goal) to the cost so far g</li><li>it expands the node with the lowest f = g + h, so it explores towards the goal</li><li>so fewer nodes are expanded (Dijkstra explores in all directions)</li></ul>" },
      { lvl: "adv", marks: 2, q: () => st && st.finished ? `On the map now, ${P.alg} expanded ${st.expanded} cells and found a path of cost ${st.cost === Infinity ? "–" : st.cost}. State one reason why a heuristic must not overestimate.` : "Run a search to the end first.", ans: "<ul><li>if h overestimates, A* may ignore the node on the best route (its f looks too large)</li><li>so the path found might not be the shortest</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Grid:</b> each cell is a node joined to its 4 neighbours. Ordinary cells cost 1 to enter, mud 5, walls cannot be entered. Click or drag to draw walls or mud (choose the tool); drag the start (green) or goal (red).</li><li>Light blue: in the open list (priority queue); darker: visited (expanded). Numbers show g (and f for A*) when the cells are big enough. The queue's first entries are listed on the right.</li><li><b>Graph:</b> Dijkstra's algorithm on a small weighted graph with the distance table, as in exam questions.</li></ul>
<h3>Simplifications</h3><ul><li>Only 4-way moves (no diagonals), so Manhattan distance is the right heuristic.</li><li>The priority queue is a simple list searched for its smallest entry each time (real programs use a heap); ties are broken towards the goal.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "grid", options: [["grid", "grid map"], ["graph", "small graph (Dijkstra's table)"]], on: v => set({ mode: v }) });
const gg = ui.group("Grid map"), gr = ui.group("Small graph");
C.alg = K.seg(gg, { label: "Algorithm", value: "astar", options: [["dijkstra", "Dijkstra"], ["astar", "A*"], ["greedy", "greedy (beyond)"]], on: v => { P.alg = v; restart(); } });
C.tool = K.seg(gg, { label: "Click and drag to draw", value: "wall", options: [["wall", "walls"], ["mud", "mud (cost 5)"], ["erase", "eraser"]], on: v => P.tool = v });
C.wall = K.slider(gg, { label: "Random walls", min: 0, max: 0.4, step: 0.02, value: 0.22, fmt: v => Math.round(v * 100) + "%", on: v => { P.wall = v; newMap(); } });
C.mud = K.slider(gg, { label: "Random mud", min: 0, max: 0.4, step: 0.02, value: 0.08, fmt: v => Math.round(v * 100) + "%", on: v => { P.mud = v; newMap(); } });
let rw = K.row(gg); K.btn(rw, "🎲 New map", () => newMap(), "primary"); K.btn(rw, "Clear map", () => { cells.fill(0); restart(); }, "danger");
C.start = K.seg(gr, { label: "From", value: "A", options: Object.keys(GN).map(k => [k, k]), on: v => { P.start = v; restart(); } });
C.goal = K.seg(gr, { label: "To", value: "G", options: Object.keys(GN).map(k => [k, k]), on: v => { P.goal = v; restart(); } });
C.speed = K.slider(ui.group("Speed"), { label: "Steps per second", min: 1, max: 200, step: 1, value: 30, on: v => P.speed = v });
const read = K.readout(ui.group("Numbers"), [["a", "Nodes expanded"], ["b", "In the queue"], ["c", "Path cost"], ["d", "Path length (cells)"]]);
function showCtl() { gg.style.display = P.mode === "grid" ? "" : "none"; gr.style.display = P.mode === "graph" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.alg === "greedy" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["mode", "alg", "tool", "wall", "mud", "start", "goal", "speed"]) C[k].set(P[k]); showCtl(); if (P.mode === "grid") newMap(1234 + Math.round(P.wall * 100) * 7 + Math.round(P.mud * 100)); else restart(); }

// ---------------- 6. Drawing and editing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Nodes expanded so far", xLabel: "step", yLabel: "nodes", yMin: 0 });
const chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let G = null, dragging = null, hist = [];
const layoutG = () => { const qw = 190, cs = Math.floor(Math.min((cv.w - qw - 30) / GW, (cv.h - 20) / GH)); return { cs, x0: 10, y0: (cv.h - cs * GH) / 2, qx: 10 + cs * GW + 16 }; };
const cellAt = p => { const { cs, x0, y0 } = G, x = Math.floor((p.x - x0) / cs), y = Math.floor((p.y - y0) / cs); return x >= 0 && x < GW && y >= 0 && y < GH ? idx(x, y) : -1; };
K.pointer(cv.el, {
  down: p => { if (P.mode !== "grid") return; const i = cellAt(p); if (i < 0) return; dragging = i === S ? "S" : i === T ? "T" : "paint"; paint(i); },
  drag: p => { if (!dragging) return; const i = cellAt(p); if (i >= 0) paint(i); }, up: () => dragging = null, hover: () => cv.el.style.cursor = P.mode === "grid" ? "crosshair" : "default"
});
function paint(i) { if (dragging === "S") { if (i !== T && cells[i] !== 1) { S = i; restart(); } return; } if (dragging === "T") { if (i !== S && cells[i] !== 1) { T = i; restart(); } return; } if (i === S || i === T) return; const v = P.tool === "wall" ? 1 : P.tool === "mud" ? 2 : 0; if (cells[i] !== v) { cells[i] = v; restart(); } }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "grid") {
    G = layoutG(); const { cs, x0, y0, qx } = G, pathSet = new Set(st && st.path ? st.path : []);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = idx(x, y), X = x0 + x * cs, Y = y0 + y * cs; let col = cells[i] === 1 ? "#4b5568" : cells[i] === 2 ? "#5a4325" : "#121b30";
      if (st && cells[i] !== 1) { if (st.done[i]) col = cells[i] === 2 ? "#6b5a3a" : "#1f3d6b"; else if (st.open.includes(i)) col = "#2f7fb5"; }
      if (pathSet.has(i)) col = "#ffb454"; c.fillStyle = col; c.fillRect(X + 1, Y + 1, cs - 2, cs - 2);
      if (st && cs >= 22 && st.g[i] < Infinity && cells[i] !== 1) TX(c, P.alg === "astar" ? `${st.g[i]}+${manh(i, T)}` : P.alg === "greedy" ? manh(i, T) : st.g[i], X + cs / 2, Y + cs / 2 + 4, "#dfe8f7", "center", "9px"); }
    for (const [i, col, lab] of [[S, "#3ddc84", "S"], [T, "#ff6b81", "G"]]) { const X = x0 + (i % GW) * cs, Y = y0 + ((i / GW) | 0) * cs; c.fillStyle = col; c.fillRect(X + 1, Y + 1, cs - 2, cs - 2); TX(c, lab, X + cs / 2, Y + cs / 2 + 4, "#000", "center", "600 12px"); }
    if (st && st.u != null && !st.finished) { const X = x0 + (st.u % GW) * cs, Y = y0 + ((st.u / GW) | 0) * cs; c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect(X + 1, Y + 1, cs - 2, cs - 2); c.lineWidth = 1; }
    // the priority queue (open list), best first
    TX(c, "PRIORITY QUEUE (open list)", qx, y0 + 12, "#5ad1ff", "left", "600 12px"); TX(c, P.alg === "dijkstra" ? "node    g" : P.alg === "astar" ? "node    g + h = f" : "node    h", qx, y0 + 30, "#8fa0bf", "left", "11px");
    if (st) { const q = [...new Set(st.open.filter(i => !st.done[i]))].sort((a, b) => st.pri(a) - st.pri(b)).slice(0, Math.floor((cs * GH - 50) / 17)); q.forEach((i, k) => TX(c, `(${i % GW},${(i / GW) | 0})`.padEnd(9) + (P.alg === "dijkstra" ? st.g[i] : P.alg === "astar" ? `${st.g[i]} + ${manh(i, T)} = ${st.g[i] + manh(i, T)}` : manh(i, T)), qx, y0 + 48 + k * 17, k === 0 ? "#ffd166" : "#c9d4ea", "left", "12px Consolas,monospace,")); }
    ui.hud(st && st.finished ? (st.path.length ? `<b>path found</b>: cost ${st.cost}, ${st.path.length - 1} moves<br>${st.expanded} nodes expanded` : "<b>no route</b> to the goal") : `${P.alg === "astar" ? "A*" : P.alg === "dijkstra" ? "Dijkstra" : "Greedy"}: ${st ? st.expanded : 0} expanded`);
  } else {
    const sx = (w - 320) / 720, sy = (h - 40) / 400, X = k => 20 + GN[k][0] * sx * 1.05, Y = k => 20 + GN[k][1] * sy, pathE = new Set(); if (gSt && gSt.path) for (let i = 1; i < gSt.path.length; i++) pathE.add([gSt.path[i - 1], gSt.path[i]].sort().join(""));
    for (const [a, b, wt] of GE) { const on = pathE.has([a, b].sort().join("")); c.strokeStyle = on ? "#ffb454" : "#5d6e93"; c.lineWidth = on ? 4 : 2; c.beginPath(); c.moveTo(X(a), Y(a)); c.lineTo(X(b), Y(b)); c.stroke(); c.lineWidth = 1; c.fillStyle = "#0b1222"; c.beginPath(); c.arc((X(a) + X(b)) / 2, (Y(a) + Y(b)) / 2, 11, 0, 6.3); c.fill(); TX(c, wt, (X(a) + X(b)) / 2, (Y(a) + Y(b)) / 2 + 4, "#ffe66d", "center", "600 12px"); }
    for (const k in GN) { const vis = gSt && gSt.vis[k], cur = gSt && gSt.u === k; c.fillStyle = cur ? "#ffb454" : vis ? "#1f3d6b" : "#121b30"; c.beginPath(); c.arc(X(k), Y(k), 20, 0, 6.3); c.fill(); c.strokeStyle = k === P.start ? "#3ddc84" : k === P.goal ? "#ff6b81" : "#8fa0bf"; c.lineWidth = 2.5; c.stroke(); c.lineWidth = 1; TX(c, k, X(k), Y(k) + 5, "#fff", "center", "600 15px"); const d = gSt ? gSt.dist[k] : (k === P.start ? 0 : Infinity); TX(c, d === Infinity ? "∞" : d, X(k), Y(k) - 26, "#7ee787", "center", "600 12px"); }
    // the distance table
    const tx = w - 280; TX(c, "node  distance  previous  visited", tx, 34, "#8fa0bf", "left", "12px Consolas,monospace,");
    Object.keys(GN).forEach((k, i) => { const d = gSt ? gSt.dist[k] : (k === P.start ? 0 : Infinity), pv = gSt && gSt.prev[k] || "–", vi = gSt && gSt.vis[k]; TX(c, `${k}     ${String(d === Infinity ? "∞" : d).padEnd(9)} ${pv.padEnd(9)} ${vi ? "✓ (" + (gSt.order.indexOf(k) + 1) + ")" : ""}`, tx, 58 + i * 22, gSt && gSt.upd && gSt.upd.includes(k) ? "#ffd166" : "#c9d4ea", "left", "13px Consolas,monospace,"); });
    ui.hud(gSt && gSt.finished ? `shortest ${P.start} → ${P.goal}: <b>${gSt.path.join(" → ")}</b>, length ${gSt.dist[P.goal]}` : gSt ? `visiting ${gSt.u}; updated: ${gSt.upd.join(", ") || "none"}` : "press Step or Play");
  }
}
function panels() {
  if (P.mode === "grid" && st) { read.set("a", st.expanded); read.set("b", new Set(st.open.filter(i => !st.done[i])).size); read.set("c", st.finished ? (st.cost === Infinity ? "no route" : st.cost) : "…"); read.set("d", st.finished && st.path.length ? st.path.length - 1 : "…"); hist.push(st.expanded); if (hist.length > 1000) hist.shift(); }
  else if (P.mode === "graph" && gSt) { read.set("a", gSt.order.length); read.set("b", "–"); read.set("c", gSt.finished ? gSt.dist[P.goal] : "…"); read.set("d", gSt.finished ? gSt.path.length - 1 + " edges" : "…"); }
  chA.draw([{ pts: hist.map((v, i) => [i, v]), color: K.cssVar("--s0"), label: "expanded" }]);
  if (P.mode === "grid") { // compare the three algorithms on the current map
    const r = ["dijkstra", "astar", "greedy"].map(a => runToEnd(cells, S, T, a)); chB.opts.title = "This map: nodes expanded (bars) and path cost (dots)"; chB.opts.xLabel = ""; chB.opts.yLabel = "count"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 1e-6 ? ["Dijkstra", "A*", "greedy"][Math.round(v)] || "" : "";
    chB.draw([{ pts: r.map((q, i) => [i, q.expanded]), type: "bars", w: 0.5, color: K.cssVar("--s0"), label: "expanded" }, { pts: r.map((q, i) => [i, q.cost === Infinity ? 0 : q.cost]), type: "dots", r: 6, color: K.cssVar("--s1"), label: "path cost" }], { xMin: -0.6, xMax: 2.6, yMin: 0 });
  } else { chB.opts.xFmt = null; chB.opts.title = ""; chB.draw([]); }
}
let frame = 0;
ui.run(dt => { acc += dt * (P.mode === "graph" ? Math.min(P.speed, 1.5) : P.speed); while (acc >= 1) { acc--; advance(); } }, () => { draw(); if (frame++ % 8 === 0) panels(); });
ui.onLevel = () => showCtl();
newMap(1234); set({});
ui.tip("Click and drag to draw walls or mud. Drag S or G to move them.", 7000);
