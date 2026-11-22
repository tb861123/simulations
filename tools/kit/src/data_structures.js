/* =====================================================================
   DATA STRUCTURES (ABSTRACT DATA TYPES)
   STACK  (LIFO: last in, first out): push on top, pop from the top.
          One pointer: TopOfStack. Used for subroutine calls, undo, and
          checking brackets.
   QUEUE  (FIFO: first in, first out): add at the rear, remove from the
          front. A CIRCULAR queue in an array wraps the pointers round
          (Rear ← (Rear + 1) MOD Size) so freed space is reused.
   LINKED LIST: each node holds data and a POINTER to the next node.
          Inserting or deleting only changes pointers; no items move.
          Unused nodes are kept in a FREE LIST (as in 9618 questions).
   BINARY SEARCH TREE: each node has a left pointer (smaller items) and
          a right pointer (larger items). Searching goes left or right at
          each node, so a well-balanced tree needs about log₂ n steps.
          Traversals: in-order (left, node, right) gives sorted order;
          pre-order (node, left, right); post-order (left, right, node).
   ===================================================================== */
// ---------------- 1. The structures ----------------
const CAP = 8;                         // array size used by the stack, queue and linked list
function newStack() { return { a: new Array(CAP).fill(null), top: -1 }; }
function push(S, v) { if (S.top === CAP - 1) return "overflow: the stack is full"; S.a[++S.top] = v; return `push ${v}: TopOfStack ← ${S.top}`; }
function pop(S) { if (S.top < 0) return "underflow: the stack is empty"; const v = S.a[S.top]; S.a[S.top--] = null; return `pop → ${v}: TopOfStack ← ${S.top}`; }
function newQueue() { return { a: new Array(CAP).fill(null), front: 0, rear: -1, n: 0 }; }
function enq(Q, v) { if (Q.n === CAP) return "the queue is full"; Q.rear = (Q.rear + 1) % CAP; Q.a[Q.rear] = v; Q.n++; return `enqueue ${v}: Rear ← ${Q.rear}`; }
function deq(Q) { if (Q.n === 0) return "the queue is empty"; const v = Q.a[Q.front]; Q.a[Q.front] = null; Q.front = (Q.front + 1) % CAP; Q.n--; return `dequeue → ${v}: Front ← ${Q.front}`; }
// linked list in an array: nodes {data, next}; StartPointer and FreeListPointer; −1 is the null pointer
function newList() { const nodes = Array.from({ length: CAP }, (_, i) => ({ data: null, next: i < CAP - 1 ? i + 1 : -1 })); return { nodes, start: -1, free: 0 }; }
function listInsert(L, v) { // insert in ascending order
  if (L.free === -1) return { msg: "no free nodes left", visit: [] }; const n = L.free; L.free = L.nodes[n].next; L.nodes[n].data = v;
  let prev = -1, cur = L.start; const visit = []; while (cur !== -1 && L.nodes[cur].data < v) { visit.push(cur); prev = cur; cur = L.nodes[cur].next; }
  L.nodes[n].next = cur; if (prev === -1) L.start = n; else L.nodes[prev].next = n; return { msg: `insert ${v} into node ${n}: ${prev === -1 ? "StartPointer" : "node " + prev + "'s pointer"} ← ${n}`, visit, hit: n };
}
function listDelete(L, v) { let prev = -1, cur = L.start; const visit = []; while (cur !== -1 && L.nodes[cur].data !== v) { visit.push(cur); prev = cur; cur = L.nodes[cur].next; } if (cur === -1) return { msg: `${v} is not in the list`, visit };
  if (prev === -1) L.start = L.nodes[cur].next; else L.nodes[prev].next = L.nodes[cur].next; L.nodes[cur].data = null; L.nodes[cur].next = L.free; L.free = cur; return { msg: `delete ${v}: node ${cur} returned to the free list`, visit, hit: cur }; }
function listFind(L, v) { let cur = L.start; const visit = []; while (cur !== -1) { visit.push(cur); if (L.nodes[cur].data === v) return { visit, found: true }; cur = L.nodes[cur].next; } return { visit, found: false }; }
// binary search tree (nodes in an array: data, left, right)
function newTree() { return { nodes: [], root: -1 }; }
function treeInsert(T, v) { const path = []; if (T.root === -1) { T.nodes.push({ data: v, left: -1, right: -1 }); T.root = 0; return path; } let cur = T.root; while (true) { path.push(cur); const nd = T.nodes[cur]; if (v === nd.data) return path; const side = v < nd.data ? "left" : "right"; if (nd[side] === -1) { T.nodes.push({ data: v, left: -1, right: -1 }); nd[side] = T.nodes.length - 1; return path; } cur = nd[side]; } }
function treeFind(T, v) { const path = []; let cur = T.root; while (cur !== -1) { path.push(cur); if (T.nodes[cur].data === v) return { path, found: true }; cur = v < T.nodes[cur].data ? T.nodes[cur].left : T.nodes[cur].right; } return { path, found: false }; }
function traverse(T, kind) { const out = []; const go = i => { if (i === -1) return; const n = T.nodes[i]; if (kind === "pre") out.push(i); go(n.left); if (kind === "in") out.push(i); go(n.right); if (kind === "post") out.push(i); }; go(T.root); return out; }
function height(T, i = T.root) { return i === -1 ? 0 : 1 + Math.max(height(T, T.nodes[i].left), height(T, T.nodes[i].right)); }
function depthSum(T, i = T.root, d = 1) { return i === -1 ? 0 : d + depthSum(T, T.nodes[i].left, d + 1) + depthSum(T, T.nodes[i].right, d + 1); }
const H = n => { let s = 0; for (let k = 1; k <= n; k++) s += 1 / k; return s; };
function shuffled(r, n) { const a = [...Array(n).keys()].map(i => i + 1); for (let i = n - 1; i > 0; i--) { const j = r.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------------- 2. State ----------------
const DEF = { mode: "stack", val: 42, trav: "in" };
const P = Object.assign({}, DEF);
let S = newStack(), Q = newQueue(), L = newList(), T = newTree(), msg = "", hl = [], anim = null, log = [], rand = K.rng(Date.now() % 1e6);
const note = m => { msg = m; log.push(m); if (log.length > 8) log.shift(); };
const rv = () => 1 + rand.int(99);
function reset() { S = newStack(); Q = newQueue(); L = newList(); T = newTree(); msg = ""; hl = []; anim = null; log = []; }

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Data Structures", subject: "Computer Science",
  blurb: "Stacks, circular queues, linked lists with a free list, and binary search trees: watch the pointers change as you add, remove, search and traverse",
  reset: () => reset(),
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 10.4: abstract data types: stack, queue and linked list, how they are used, and how to implement them using arrays and pointers (TopOfStack; Front and Rear; StartPointer and a free list).",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 19.1: implementing ADTs from other ADTs, binary trees (insertion, searching, in-order, pre-order and post-order traversal), and comparing their performance." } },
  missions: [
    { title: "A stack is LIFO", q: "Push 3, 7, 5, then pop twice. Which items come off, and in what order? What is TopOfStack now?", hint: "5 then 7: last in, first out. TopOfStack goes 0, 1, 2, then back to 1 and 0. Popping does not need to erase the value, only move the pointer.", setup: () => set({ mode: "stack" }, () => { for (const v of [3, 7, 5]) note(push(S, v)); }) },
    { title: "Overflow and underflow", q: "Keep pushing until the stack is full. What happens with one more push? Then pop until empty, and once more.", hint: "Pushing onto a full stack is an overflow error; popping an empty stack is underflow. An array-based stack has a fixed size, so the code must check TopOfStack before each operation.", setup: () => set({ mode: "stack" }) },
    { title: "A circular queue", q: "Enqueue 5 items, dequeue 3, then enqueue 5 more. Where does Rear go after the last slot (index 7)?", hint: "Rear wraps round to 0: Rear ← (Rear + 1) MOD 8. Without wrapping, a linear queue would report 'full' even with empty slots at the front.", setup: () => set({ mode: "queue" }) },
    { title: "Linked list: insertion moves pointers, not data", q: "Insert 30, 10, 20 into the linked list. Which nodes do they go into? How does the list keep them in order?", hint: "They take nodes 0, 1, 2 from the free list in that order, but the pointers are set so the list reads 10 → 20 → 30. Nothing moves in the array.", setup: () => set({ mode: "list" }, () => { for (const v of [30, 10, 20]) note(listInsert(L, v).msg); }) },
    { title: "Deleting from a linked list", q: "Delete 20. What happens to its node? Where will the next inserted item go?", hint: "The previous node's pointer skips over it, and the node is put back at the head of the free list, so it is reused by the next insertion.", setup: () => set({ mode: "list" }, () => { for (const v of [30, 10, 20, 25]) note(listInsert(L, v).msg); }) },
    { lvl: "adv", title: "Building a binary search tree", q: "Insert 50, 30, 70, 20, 40, 60, 80. Then do an in-order traversal. What do you notice?", hint: "A perfectly balanced tree of height 3. In-order (left, root, right) visits 20, 30, 40, 50, 60, 70, 80: sorted order.", setup: () => set({ mode: "tree" }, () => { for (const v of [50, 30, 70, 20, 40, 60, 80]) treeInsert(T, v); }) },
    { lvl: "adv", title: "A bad insertion order", q: "Insert 10, 20, 30, 40, 50, 60 in that order. What shape is the tree? How many comparisons to find 60?", hint: "Every item goes right: the tree is a long chain (a linked list). Finding 60 takes 6 comparisons, O(n) not O(log n). Random insertion order usually gives a bushy tree.", setup: () => set({ mode: "tree" }, () => { for (const v of [10, 20, 30, 40, 50, 60]) treeInsert(T, v); }) },
    { lvl: "adv", title: "Pre-order and post-order", q: "Build the tree 50, 30, 70, 20, 40 and run pre-order and post-order traversals. Write down each order.", hint: "Pre-order (root first): 50, 30, 20, 40, 70. Post-order (root last): 20, 40, 30, 70, 50. Post-order is used to delete a tree; pre-order to copy it.", setup: () => set({ mode: "tree", trav: "pre" }, () => { for (const v of [50, 30, 70, 20, 40]) treeInsert(T, v); }) },
  ],
  batch: [
    { title: "Searching a linked list", question: "How many nodes must be visited to find a random item in a sorted linked list of n items?", how: "Each point: 200 searches for random items present in the list; mean nodes visited.", xLabel: "items n", yLabel: "mean nodes visited", xs: [5, 10, 20, 40, 80], reps: 4, yMin: 0, theory: n => (n + 1) / 2, theoryLabel: "(n + 1)/2", run: (n, r) => { let s = 0; for (let k = 0; k < 200; k++) s += 1 + r.int(n); return s / 200; }, note: "A linked list can only be followed from the start, even if it is sorted: no binary search, so O(n)." },
    { title: "Binary search tree: average search (A level)", question: "If n items are inserted in random order, how many comparisons does a search for a stored item take on average?", how: "Each point: one random insertion order; the mean depth of the n nodes.", xLabel: "items n", yLabel: "mean comparisons", xs: [7, 15, 31, 63, 127, 255], reps: 5, yMin: 0, theory: n => 2 * (1 + 1 / n) * H(n) - 3, theoryLabel: "2(1 + 1/n)Hₙ − 3", run: (n, r) => { const t = newTree(); for (const v of shuffled(r, n)) treeInsert(t, v); return depthSum(t) / n; }, note: "About 1.39 log₂ n: random trees are bushy, only about 39% worse than a perfectly balanced tree (log₂ n)." },
    { title: "Sorted input ruins a tree (A level)", question: "What is the height of a binary search tree when items are inserted already sorted?", how: "Exact: insert 1, 2, …, n in order.", xLabel: "items n", yLabel: "height", xs: [5, 10, 20, 40, 80], reps: 1, yMin: 0, theory: n => n, theoryLabel: "n (a chain)", run: n => { const t = newTree(); for (let v = 1; v <= n; v++) treeInsert(t, v); return height(t); }, note: "Each new item goes to the right of the last: a chain of height n, so searching is O(n). Self-balancing trees (AVL, red-black) fix this; they are beyond 9618." },
    { title: "Height of a random tree (A level)", question: "How tall is a binary search tree built from 63 items in random order? (Perfectly balanced: 6.)", how: "Each run: one random insertion order of 63 items.", yLabel: "height", reps: 300, bins: 12, lo: 5.5, hi: 17.5, theory: 6, theoryLabel: "balanced: log₂ 64 = 6", run: (x, r) => { const t = newTree(); for (const v of shuffled(r, 63)) treeInsert(t, v); return height(t); }, note: "Usually 10 to 12: taller than perfectly balanced, but far below the 63 of a chain." },
    { title: "In-order traversal sorts", question: "Is an in-order traversal of a binary search tree always in ascending order?", how: "Each run: 30 random distinct items inserted; records 1 if the in-order traversal is sorted, 0 if not.", yLabel: "sorted? (1 = yes)", reps: 200, bins: 2, lo: -0.5, hi: 1.5, theory: 1, theoryLabel: "always", run: (x, r) => { const t = newTree(); for (const v of shuffled(r, 30)) treeInsert(t, v); const o = traverse(t, "in").map(i => t.nodes[i].data); return o.every((v, i) => !i || o[i - 1] < v) ? 1 : 0; }, note: "Every time: everything in a node's left subtree is smaller and everything in its right subtree larger. Inserting then traversing is a sort (a 'tree sort')." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "10.4", text: "Stack: LIFO, one pointer (TopOfStack, −1 when empty); push increments then stores, pop returns then decrements. Check for overflow (full) and underflow (empty). Uses: procedure calls and return addresses, undo, evaluating expressions." },
      { lvl: "std", tag: "10.4", text: "Queue: FIFO, Front and Rear pointers. Circular queue: Rear ← (Rear + 1) MOD Size, and keep a count to tell full from empty. Uses: print queues, buffers, scheduling." },
      { lvl: "std", tag: "10.4", text: "Linked list: nodes of data + pointer; StartPointer to the first node; −1 (null) ends the list. Unused nodes form a free list (FreeListPointer). Insertion and deletion only change pointers." },
      { lvl: "adv", tag: "19.1", text: "Binary search tree: left subtree < node < right subtree. Search/insert follow one path from the root: O(log n) if balanced, O(n) if it degenerates into a chain." },
      { lvl: "adv", tag: "19.1", text: "Traversals: pre-order (node, left, right), in-order (left, node, right: gives sorted order), post-order (left, right, node). Usually written recursively." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "A stack is empty. The operations push 4, push 9, pop, push 2, push 6, pop are carried out. State the contents of the stack and the value of TopOfStack.", ans: "<ul><li>after push 4, push 9, pop: [4]</li><li>after push 2, push 6, pop: [4, 2]</li><li>TopOfStack = 1 (with the first element at index 0)</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why a circular queue is used instead of a simple linear queue in an array.", ans: "<ul><li>in a linear queue, dequeued slots at the front cannot be reused, so the queue appears full</li><li>a circular queue wraps the pointers round (MOD size), reusing the space</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe how a new item is inserted into a sorted linked list implemented with arrays.", ans: "<ul><li>take a node from the free list (FreeListPointer ← its pointer) and store the data</li><li>follow the list from StartPointer to find the node after which it belongs</li><li>set the new node's pointer to that node's pointer, then that node's pointer to the new node (or StartPointer if it goes first)</li></ul>" },
      { lvl: "adv", marks: 3, q: () => T.root === -1 ? "Build a tree first (Tree mode)." : `For the tree on screen, write the in-order, pre-order and post-order traversals.`, ans: () => T.root === -1 ? "" : `<ul><li>in-order: ${traverse(T, "in").map(i => T.nodes[i].data).join(", ")}</li><li>pre-order: ${traverse(T, "pre").map(i => T.nodes[i].data).join(", ")}</li><li>post-order: ${traverse(T, "post").map(i => T.nodes[i].data).join(", ")}</li></ul>` },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Stack, queue and linked list use an array of 8 slots, exactly as in 9618 exam questions; pointers are shown as arrows and as numbers.</li><li>The linked list is kept in ascending order; free nodes are chained together from FreeListPointer.</li><li>The binary search tree has no size limit here; duplicates are ignored.</li><li>Traversals are animated in the chosen order.</li></ul>
<h3>Simplifications</h3><ul><li>Values are whole numbers 1–99. Real structures hold records.</li><li>The tree is not self-balancing.</li><li>In Python or Java these ADTs are often provided ready-made (lists, deques, maps); building them from arrays shows how they work.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Structure");
C.mode = K.seg(g, { value: "stack", options: [["stack", "stack"], ["queue", "circular queue"], ["list", "linked list"], ["tree", "binary search tree (A level)"]], on: v => set({ mode: v }) });
g = ui.group("Operations");
C.val = K.slider(g, { label: "Value", min: 1, max: 99, step: 1, value: 42, on: v => P.val = v });
const ops = K.$("div"); g.append(ops);
C.trav = K.seg(g, { label: "Traversal", value: "in", options: [["pre", "pre-order"], ["in", "in-order"], ["post", "post-order"]], on: v => P.trav = v });
const read = K.readout(ui.group("Pointers"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function buildOps() {
  ops.innerHTML = ""; const r = K.row(ops), r2 = K.row(ops), v = () => P.val, nv = () => { P.val = rv(); C.val.set(P.val); };
  if (P.mode === "stack") { K.btn(r, "Push value", () => { note(push(S, v())); nv(); }, "primary"); K.btn(r, "Pop", () => note(pop(S))); }
  if (P.mode === "queue") { K.btn(r, "Enqueue value", () => { note(enq(Q, v())); nv(); }, "primary"); K.btn(r, "Dequeue", () => note(deq(Q))); }
  if (P.mode === "list") { K.btn(r, "Insert value", () => { const q = listInsert(L, v()); note(q.msg); anim = { path: q.visit, hit: q.hit, t: 0 }; nv(); }, "primary"); K.btn(r, "Delete value", () => { const q = listDelete(L, v()); note(q.msg); anim = { path: q.visit, hit: q.hit, t: 0 }; }); K.btn(r2, "Find value", () => { const q = listFind(L, v()); note(`find ${v()}: ${q.found ? "found" : "not found"} after visiting ${q.visit.length} node(s)`); anim = { path: q.visit, t: 0 }; }); }
  if (P.mode === "tree") { K.btn(r, "Insert value", () => { const p = treeInsert(T, v()); note(`insert ${v()}: compared with ${p.map(i => T.nodes[i].data).join(", ") || "nothing (new root)"}`); anim = { path: p.concat([T.nodes.findIndex(n => n.data === v())]), t: 0 }; nv(); }, "primary"); K.btn(r, "Search for value", () => { const q = treeFind(T, v()); note(`search ${v()}: ${q.found ? "found" : "not found"} after ${q.path.length} comparison(s)`); anim = { path: q.path, t: 0 }; }); K.btn(r2, "▶ Traverse", () => { const o = traverse(T, P.trav); note(`${P.trav}-order: ${o.map(i => T.nodes[i].data).join(", ")}`); anim = { path: o, t: 0, trav: true }; }); K.btn(r2, "Add 10 random", () => { for (let k = 0; k < 10; k++) treeInsert(T, rv()); }); }
  K.btn(r2, "Empty it", () => { if (P.mode === "stack") S = newStack(); if (P.mode === "queue") Q = newQueue(); if (P.mode === "list") L = newList(); if (P.mode === "tree") T = newTree(); note("emptied"); }, "danger");
  C.trav.el.style.display = P.mode === "tree" ? "" : "none"; C.mode.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none";
}
function set(o, then) { Object.assign(P, DEF, o); if (P.mode === "tree" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); reset(); C.mode.set(P.mode); C.trav.set(P.trav); buildOps(); if (then) then(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function box(c, x, y, w, h, fill, text, stroke = "#3a4a6e", tc = "#fff") { c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = stroke; c.lineWidth = 1.5; c.strokeRect(x + .5, y + .5, w - 1, h - 1); c.lineWidth = 1; if (text != null) TX(c, text, x + w / 2, y + h / 2 + 5, tc, "center", "600 14px"); }
function arrow(c, x0, y0, x1, y1, col) { const a = Math.atan2(y1 - y0, x1 - x0); c.strokeStyle = c.fillStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 9 * Math.cos(a - 0.4), y1 - 9 * Math.sin(a - 0.4)); c.lineTo(x1 - 9 * Math.cos(a + 0.4), y1 - 9 * Math.sin(a + 0.4)); c.fill(); c.lineWidth = 1; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (anim) anim.t += dt * 1.6; const ak = anim ? Math.floor(anim.t) : -1, active = anim && ak < anim.path.length ? anim.path[ak] : null, seen = anim ? new Set(anim.path.slice(0, ak + 1)) : new Set();
  if (P.mode === "stack") {
    const bw = 140, bh = Math.min(46, (h - 120) / CAP), x = w / 2 - bw / 2, y0 = h - 60;
    TX(c, "STACK (array of 8)", x + bw / 2, 30, "#ffd166", "center", "600 14px");
    for (let i = 0; i < CAP; i++) { const y = y0 - (i + 1) * bh; box(c, x, y, bw, bh - 3, S.a[i] == null ? "#121826" : i === S.top ? "#c2410c" : "#1f3d6b", S.a[i]); TX(c, i, x - 12, y + bh / 2 + 3, "#8fa0bf", "right", "12px"); }
    if (S.top >= 0) arrow(c, x + bw + 90, y0 - (S.top + 0.5) * bh, x + bw + 8, y0 - (S.top + 0.5) * bh, "#ffb454"); TX(c, `TopOfStack = ${S.top}`, x + bw + 96, y0 - (Math.max(S.top, 0) + 0.5) * bh + 4, "#ffb454", "left", "600 13px");
  } else if (P.mode === "queue") {
    const cx = w / 2, cy = h / 2 + 10, R = Math.min(w, h) * 0.3, r0 = R * 0.55;
    TX(c, "CIRCULAR QUEUE (array of 8)", cx, 30, "#ffd166", "center", "600 14px");
    for (let i = 0; i < CAP; i++) { const a0 = -Math.PI / 2 + i * 2 * Math.PI / CAP, a1 = a0 + 2 * Math.PI / CAP - 0.03; c.fillStyle = Q.a[i] == null ? "#121826" : "#1f3d6b"; c.beginPath(); c.arc(cx, cy, R, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill(); c.strokeStyle = "#3a4a6e"; c.stroke(); const am = (a0 + a1) / 2; if (Q.a[i] != null) TX(c, Q.a[i], cx + Math.cos(am) * (R + r0) / 2, cy + Math.sin(am) * (R + r0) / 2 + 5, "#fff", "center", "600 15px"); TX(c, i, cx + Math.cos(am) * (r0 - 14), cy + Math.sin(am) * (r0 - 14) + 4, "#8fa0bf", "center", "11px"); }
    const ptr = (i, col, lab, off) => { const am = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / CAP; arrow(c, cx + Math.cos(am) * (R + 50 + off), cy + Math.sin(am) * (R + 50 + off), cx + Math.cos(am) * (R + 6), cy + Math.sin(am) * (R + 6), col); TX(c, lab, cx + Math.cos(am) * (R + 62 + off), cy + Math.sin(am) * (R + 62 + off) + 4, col, "center", "600 12px"); };
    ptr(Q.front, "#7ee787", "Front", 0); if (Q.rear >= 0) ptr(Q.rear, "#ffb454", "Rear", 22); TX(c, `${Q.n} item${Q.n === 1 ? "" : "s"}`, cx, cy + 5, "#c9d4ea", "center", "600 14px");
  } else if (P.mode === "list") {
    const bw = Math.min(96, (w - 80) / CAP), x0 = (w - CAP * bw) / 2, y0 = 70;
    TX(c, "LINKED LIST in an array: each node holds data and a pointer", 20, 28, "#ffd166", "left", "600 14px");
    for (let i = 0; i < CAP; i++) { const x = x0 + i * bw, n = L.nodes[i], inUse = n.data != null; box(c, x, y0, bw - 6, 34, active === i ? "#c2410c" : seen.has(i) ? "#3a4a6e" : inUse ? "#1f3d6b" : "#121826", n.data); box(c, x, y0 + 36, bw - 6, 26, "#101a30", n.next, "#3a4a6e", "#ffd9a0"); TX(c, "node " + i, x + bw / 2 - 3, y0 + 80, "#8fa0bf", "center", "11px"); }
    TX(c, "data", x0 - 8, y0 + 22, "#8fa0bf", "right"); TX(c, "pointer", x0 - 8, y0 + 54, "#8fa0bf", "right");
    TX(c, `StartPointer = ${L.start}     FreeListPointer = ${L.free}`, x0, y0 + 112, "#c9d4ea", "left", "600 13px");
    // the list drawn as a chain in its logical order, then the free list
    const chain = (start, y, col, label) => { TX(c, label, 20, y + 22, col, "left", "600 12px"); let cur = start, k = 0, x = 150; const guard = new Set(); while (cur !== -1 && !guard.has(cur)) { guard.add(cur); box(c, x, y, 56, 34, col === "#7ee787" ? "#1f3d6b" : "#121826", L.nodes[cur].data != null ? L.nodes[cur].data : "–"); TX(c, "node " + cur, x + 28, y + 48, "#8fa0bf", "center", "10px"); const nx = L.nodes[cur].next; if (nx !== -1) arrow(c, x + 56, y + 17, x + 84, y + 17, col); x += 84; cur = nx; k++; } TX(c, "∅ (−1)", x + 4, y + 22, "#8fa0bf"); };
    chain(L.start, y0 + 150, "#7ee787", "the list:"); chain(L.free, y0 + 230, "#8fa0bf", "free list:");
  } else {
    TX(c, "BINARY SEARCH TREE", 20, 28, "#ffd166", "left", "600 14px");
    if (T.root === -1) { TX(c, "empty: insert a value", w / 2, h / 2, "#8fa0bf", "center", "14px"); }
    else { const pos = {}, hgt = height(T), lv = (h - 90) / Math.max(1, hgt - 1 || 1); const place = (i, x0, x1, d) => { if (i === -1) return; pos[i] = [(x0 + x1) / 2, 60 + d * Math.min(80, lv)]; place(T.nodes[i].left, x0, (x0 + x1) / 2, d + 1); place(T.nodes[i].right, (x0 + x1) / 2, x1, d + 1); }; place(T.root, 20, w - 20, 0);
      const r = Math.max(10, Math.min(22, (w - 40) / Math.pow(2, Math.min(hgt, 7)) / 1.2));
      for (const i in pos) { const n = T.nodes[i]; for (const ch of [n.left, n.right]) if (ch !== -1) { c.strokeStyle = "#5d6e93"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(...pos[i]); c.lineTo(...pos[ch]); c.stroke(); c.lineWidth = 1; } }
      for (const i in pos) { const [x, y] = pos[i], k = +i; c.fillStyle = active === k ? "#c2410c" : seen.has(k) ? (anim && anim.trav ? "#2e9e5b" : "#3a4a6e") : "#1f3d6b"; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.strokeStyle = "#8fa0bf"; c.stroke(); TX(c, T.nodes[k].data, x, y + 5, "#fff", "center", r > 14 ? "600 13px" : "10px"); if (anim && anim.trav && seen.has(k)) TX(c, anim.path.indexOf(k) + 1, x + r, y - r, "#7ee787", "left", "600 11px"); } }
  }
  ui.hud(msg ? msg : "use the buttons in Operations");
}
function panels() {
  if (P.mode === "stack") { relabel(["TopOfStack", "Items", "Free slots"]); read.set("a", S.top); read.set("b", S.top + 1); read.set("c", CAP - S.top - 1); }
  else if (P.mode === "queue") { relabel(["Front, Rear", "Items", "Next Rear = (Rear + 1) MOD 8"]); read.set("a", `${Q.front}, ${Q.rear}`); read.set("b", Q.n); read.set("c", (Q.rear + 1) % CAP); }
  else if (P.mode === "list") { relabel(["StartPointer", "FreeListPointer", "List in order"]); read.set("a", L.start); read.set("b", L.free); const o = []; for (let cur = L.start, k = 0; cur !== -1 && k < CAP; cur = L.nodes[cur].next, k++) o.push(L.nodes[cur].data); read.set("c", o.join(" → ") || "empty"); }
  else { relabel(["Nodes", "Height (balanced would be)", "Mean comparisons to find"]); read.set("a", T.nodes.length); read.set("b", `${height(T)} (${Math.ceil(Math.log2(T.nodes.length + 1))})`); read.set("c", T.nodes.length ? (depthSum(T) / T.nodes.length).toFixed(2) : "–"); }
  chA.opts.title = "Operation log"; chA.opts.xLabel = ""; chA.opts.yLabel = ""; chA.draw([]); const ctx = chA.el.querySelector("canvas").getContext("2d"); ctx.font = "12px Consolas,monospace"; ctx.fillStyle = K.cssVar("--text"); log.slice(-7).forEach((m, i) => ctx.fillText(m.slice(0, 60), 60, 44 + i * 18));
  const pts = []; for (let n = 1; n <= 255; n *= 2) pts.push([n, Math.log2(n + 1)]); const pts2 = [[1, 1], [255, 255]];
  chB.opts.title = "Search cost: balanced tree (log₂ n) against a list or chain (n)"; chB.opts.xLabel = "items n"; chB.opts.yLabel = "comparisons (worst)"; chB.draw([{ pts: pts2, color: K.cssVar("--s3"), label: "list / chain: n" }, { pts, color: K.cssVar("--s2"), label: "balanced tree: log₂(n + 1)" }].concat(P.mode === "tree" && T.nodes.length ? [{ pts: [[T.nodes.length, height(T)]], type: "dots", r: 6, color: K.cssVar("--s1"), label: "your tree" }] : []), { yMin: 0, yMax: 40, xMin: 0, xMax: 260 });
}
let frame = 0;
ui.run(() => { }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "tree") set({}); else buildOps(); };
set({});
ui.tip("Use the buttons under Operations. Watch the pointers change.", 7000);
