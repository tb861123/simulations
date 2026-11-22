/* =====================================================================
   SEARCHING AND HASHING
   LINEAR SEARCH: check each item in turn until you find the target or
   reach the end. Works on any list. Up to n comparisons: O(n).
   BINARY SEARCH: the list must be SORTED. Look at the middle item; if it
   is too small, throw away the left half, if too big the right half;
   repeat. Each comparison halves what is left, so at most about log₂ n
   comparisons: O(log n). 1 000 000 items need only 20.
   HASHING: a hash function turns a key straight into an address,
   e.g. address = key MOD table size. Finding a record takes one step…
   unless two keys hash to the same address (a COLLISION). Then either
     open addressing (linear probing): try the next free slot, or
     chaining (overflow): keep a linked list at each address.
   The fuller the table (the LOAD FACTOR α = keys ÷ slots), the more
   collisions, and the more probes each search needs.
   ===================================================================== */
// ---------------- 1. Searches (each records the positions it looks at) ----------------
function linear(a, t) { const look = []; for (let i = 0; i < a.length; i++) { look.push(i); if (a[i] === t) return { found: i, look }; } return { found: -1, look }; }
function binary(a, t) { const look = [], steps = []; let lo = 0, hi = a.length - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; look.push(mid); steps.push({ lo, hi, mid }); if (a[mid] === t) return { found: mid, look, steps }; if (a[mid] < t) lo = mid + 1; else hi = mid - 1; } steps.push({ lo, hi, mid: -1 }); return { found: -1, look, steps }; }
// average comparisons of a successful binary search over every position (for the theory line)
function binAvg(n) { const a = [...Array(n).keys()]; let s = 0; for (const t of a) s += binary(a, t).look.length; return s / n; }
// ---------------- 2. Hash tables ----------------
const hash = (k, m) => k % m;
function buildTable(keys, m, method) {
  const T = method === "chain" ? Array.from({ length: m }, () => []) : new Array(m).fill(null), probes = [];
  for (const k of keys) {
    if (method === "chain") { const h = hash(k, m); T[h].push(k); probes.push(T[h].length); continue; }
    let h = hash(k, m), p = 1; while (T[h] !== null && p <= m) { h = (h + 1) % m; p++; } if (p <= m) T[h] = k; probes.push(p);
  }
  return { T, probes };
}
function findInTable(tab, k, m, method) { const path = []; if (method === "chain") { const h = hash(k, m); path.push(h); const i = tab.T[h].indexOf(k); return { path, probes: i >= 0 ? i + 1 : tab.T[h].length + 1, found: i >= 0, h }; }
  let h = hash(k, m); for (let p = 1; p <= m; p++) { path.push(h); if (tab.T[h] === k) return { path, probes: p, found: true, h }; if (tab.T[h] === null) return { path, probes: p, found: false, h }; h = (h + 1) % m; } return { path, probes: m, found: false }; }
function randKeys(r, k, max) { const s = new Set(); while (s.size < k) s.add(1 + r.int(max)); return [...s]; }

// ---------------- 3. State ----------------
const DEF = { mode: "search", n: 31, alg: "binary", target: 0, m: 13, keys: 8, method: "probe", find: 0, speed: 1 };
const P = Object.assign({}, DEF);
let arr = [], res = null, shown = 0, acc = 0, tab = null, keyList = [], hres = null, rand = K.rng(Date.now() % 1e6);
function newList() { const s = randKeys(rand, P.n, 99); arr = s.sort((a, b) => a - b); if (!arr.includes(P.target)) P.target = arr[rand.int(arr.length)]; C.target && C.target.set(P.target); runSearch(); }
function runSearch() { res = P.alg === "linear" ? linear(arr, P.target) : binary(arr, P.target); shown = 0; acc = 0; }
function newTable() { keyList = randKeys(rand, P.method === "probe" ? Math.min(P.keys, P.m) : P.keys, 999); tab = buildTable(keyList, P.m, P.method); if (!keyList.includes(P.find)) P.find = keyList[keyList.length - 1]; hres = findInTable(tab, P.find, P.m, P.method); shown = 0; acc = 0; }

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Searching and Hashing", subject: "Computer Science",
  blurb: "Linear against binary search step by step, and hash tables with collisions, linear probing and chaining",
  reset: () => P.mode === "search" ? runSearch() : newTable(), step: () => { shown++; },
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 10: algorithms for a linear search and a binary search of an array (with pseudocode), and the conditions for a binary search (the data must be sorted).",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topics 13.2 and 19.1: performance of linear and binary search with Big O (O(n) and O(log n)); file organisation and access with hashing algorithms, collisions and how they are handled (open addressing/linear probing and overflow/chaining)." } },
  missions: [
    { title: "Linear search", q: "Find a value with a linear search in a list of 31 items. How many comparisons for the first item? The last? A value that is not there?", hint: "1 for the first, 31 for the last, and 31 (every item) to be sure it is absent. On average about (n + 1)/2 = 16 for an item that is present. Linear search does not need sorted data.", setup: () => set({ mode: "search", alg: "linear", n: 31 }) },
    { title: "Binary search", q: "Now binary search the same sized list. Watch low, mid and high. How many comparisons at most?", hint: "Each comparison halves the part still to search: 31 → 15 → 7 → 3 → 1, so at most 5 comparisons (log₂ 32 = 5). It only works because the list is sorted.", setup: () => set({ mode: "search", alg: "binary", n: 31 }) },
    { title: "Searching for something that isn't there", q: "Binary search for a value missing from the list (try 0). How does it know to stop?", hint: "When low passes high there is nothing left to search: the item is not present. That took about log₂ n comparisons, far fewer than a linear search's n.", setup: () => set({ mode: "search", alg: "binary", n: 31, target: 0 }) },
    { lvl: "adv", title: "A hash table", q: "Insert 8 keys into a table of 13 slots with address = key MOD 13. Do any keys collide? Where does linear probing put them?", hint: "When two keys give the same address, linear probing puts the second in the next free slot (wrapping round to 0). Searching for it must then follow the same path.", setup: () => set({ mode: "hash", m: 13, keys: 8, method: "probe" }) },
    { lvl: "adv", title: "Chaining", q: "Switch to chaining (overflow). How are collisions stored now? Can the table hold more keys than slots?", hint: "Each address holds a linked list (an overflow area); colliding keys join the list. Yes: the load factor can exceed 1, but long chains make searching slower.", setup: () => set({ mode: "hash", m: 13, keys: 10, method: "chain" }) },
    { lvl: "adv", title: "A nearly full table", q: "Linear probing: put 12 keys in 13 slots. How many probes does the last search need? Why do clusters form?", hint: "Clusters: a run of filled slots catches any key that hashes into it and makes the run longer. The average successful search needs about ½(1 + 1/(1 − α)) probes, about 6.5 when α = 0.92.", setup: () => set({ mode: "hash", m: 13, keys: 12, method: "probe" }) },
  ],
  batch: [
    { title: "Linear search: average comparisons", question: "Searching for a random item that is in the list, how many comparisons does a linear search make?", how: "Each point: 100 searches of a random list of n items for a random item in it; the mean.", xLabel: "n", yLabel: "mean comparisons", xs: [10, 20, 40, 60, 80, 100], reps: 5, yMin: 0, theory: n => (n + 1) / 2, theoryLabel: "(n + 1)/2", run: (n, r) => { let s = 0; for (let k = 0; k < 100; k++) { const a = [...Array(n).keys()]; s += linear(a, r.int(n)).look.length; } return s / 100; }, note: "Each position is equally likely, so on average half way. O(n): ten times the data, ten times the work." },
    { title: "Binary search: average comparisons", question: "How many comparisons does a successful binary search make on average?", how: "Each point: 100 searches of a sorted list of n items for a random item in it.", xLabel: "n", yLabel: "mean comparisons", xs: [7, 15, 31, 63, 127, 255, 511, 1023], reps: 5, yMin: 0, theory: n => binAvg(n), theoryLabel: "exact average (≈ log₂ n − 1)", run: (n, r) => { const a = [...Array(n).keys()]; let s = 0; for (let k = 0; k < 100; k++) s += binary(a, r.int(n)).look.length; return s / 100; }, note: "Each doubling of n adds only ONE comparison: O(log n). For 1023 items, about 9 on average and 10 at most." },
    { title: "Linear probing and the load factor (A level)", question: "How many probes does a successful search take in a table using linear probing, for different load factors?", how: "Table of 1009 slots filled with random keys; average probes over every key stored.", xLabel: "load factor α", yLabel: "mean probes per search", xs: [0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9], reps: 4, yMin: 0, theory: a => 0.5 * (1 + 1 / (1 - a)), theoryLabel: "½(1 + 1/(1 − α))", run: (a, r) => { const m = 1009, ks = randKeys(r, Math.round(a * m), 1e7), t = buildTable(ks, m, "probe"); return K.mean(t.probes); }, note: "Gentle up to about α = 0.7, then it shoots up: clusters of full slots grow and merge. Keep a probed table well under 70% full." },
    { title: "Chaining and the load factor (A level)", question: "With chaining, how many items must be checked to find a stored key?", how: "Table of 1009 slots; average position in its chain over every key stored.", xLabel: "load factor α", yLabel: "mean probes per search", xs: [0.25, 0.5, 1, 1.5, 2, 3], reps: 4, yMin: 0, theory: a => 1 + a / 2, theoryLabel: "1 + α/2", run: (a, r) => { const m = 1009, ks = randKeys(r, Math.round(a * m), 1e7), t = buildTable(ks, m, "chain"); return K.mean(t.probes); }, note: "Grows only slowly and steadily, even beyond α = 1. The cost is the extra memory for the linked lists." },
    { title: "When is the first collision? (A level)", question: "Keys are hashed at random into a table of 365 slots. How many keys until the first collision?", how: "Each run: random addresses until one repeats.", yLabel: "keys inserted when the first collision happens", reps: 400, bins: 24, theory: 1 + (() => { let q = 1, s = 0; for (let k = 1; k < 366; k++) { s += q; q *= (365 - k) / 365; } return s; })() - 1, theoryLabel: "expected ≈ 24.6", run: (x, r) => { const seen = new Set(); for (let k = 1; ; k++) { const h = r.int(365); if (seen.has(h)) return k; seen.add(h); } }, note: "The birthday problem: collisions start long before the table is full (half of the time by the 23rd key). That is why every hash table needs a collision policy." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "10.1", text: "Linear search: check each element from the start until found or the end is reached. Works on unsorted data." },
      { lvl: "std", tag: "10.1", text: "Binary search (sorted data only): compare with the middle element; discard the half that cannot contain the target; repeat until found or low > high." },
      { lvl: "adv", tag: "19.1", text: "Linear search O(n); binary search O(log n). Binary search needs the data sorted first (sorting costs time), so for one search of unsorted data linear search may be better." },
      { lvl: "adv", tag: "13.2", text: "Hashing calculates a record's address from its key (e.g. key MOD number of slots), giving direct access. A collision happens when two keys give the same address." },
      { lvl: "adv", tag: "13.2", text: "Collisions: open addressing (store in the next free slot: linear probing; searching follows the same path) or an overflow area / chaining (a list at each address). Performance falls as the table fills." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `A sorted array holds ${arr.length} items. State the maximum number of comparisons for a binary search and for a linear search, and explain the difference.`, ans: () => `<ul><li>binary: ${Math.ceil(Math.log2(arr.length + 1))}</li><li>linear: ${arr.length}</li><li>binary search halves the remaining items at each comparison; linear search removes only one</li></ul>` },
      { lvl: "std", marks: 2, q: "State one condition for a binary search and one situation where a linear search would be better.", ans: "<ul><li>the data must be sorted (and allow direct access to the middle item, e.g. an array)</li><li>a small or unsorted list searched only once (sorting first would cost more)</li></ul>" },
      { lvl: "adv", marks: 4, q: "Keys 27, 40, 14, 53 are inserted in that order into a table of 13 slots (0–12) using address = key MOD 13 and linear probing. Give the slot of each key.", ans: "<ul><li>27 MOD 13 = 1 → slot 1</li><li>40 MOD 13 = 1: collision → slot 2</li><li>14 MOD 13 = 1: collision → slots 2 full → slot 3</li><li>53 MOD 13 = 1: collision → slot 4</li></ul>" },
      { lvl: "adv", marks: 2, q: "Explain why a hash table using linear probing becomes slow when it is nearly full.", ans: "<ul><li>more collisions, and filled slots form clusters</li><li>a search must probe along a long cluster before finding the key (or an empty slot)</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Search:</b> a sorted array of distinct random numbers from 1 to 99. The search runs step by step: highlighted boxes have been compared; binary search shows low (L), mid (M) and high (H) and greys out the discarded part.</li><li><b>Hashing (A level):</b> random keys from 1 to 999 inserted in order with address = key MOD table size. Linear probing moves on one slot at a time (wrapping to 0); chaining adds the key to a list at its address. The search path of the chosen key is shown.</li></ul>
<h3>Simplifications</h3><ul><li>Comparisons are counted as one per item looked at (a real binary search may make two tests per step: "equal?" then "less?").</li><li>Real hash functions mix the bits of the key more thoroughly than MOD; deletions from a probed table need special 'deleted' markers, which are not shown.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "search", options: [["search", "searching a list"], ["hash", "hash tables (A level)"]], on: v => set({ mode: v }) });
const gs = ui.group("Searching"), gh = ui.group("Hash table");
C.alg = K.seg(gs, { value: "binary", options: [["linear", "linear search"], ["binary", "binary search"]], on: v => { P.alg = v; runSearch(); } });
C.n = K.slider(gs, { label: "Items in the list", min: 5, max: 63, step: 1, value: 31, on: v => { P.n = v; newList(); } });
C.target = K.slider(gs, { label: "Search for", min: 0, max: 100, step: 1, value: 0, on: v => { P.target = v; runSearch(); } });
let rw = K.row(gs); K.btn(rw, "🎲 New list", () => newList(), "primary"); K.btn(rw, "Pick an item in the list", () => { P.target = arr[rand.int(arr.length)]; C.target.set(P.target); runSearch(); });
C.m = K.slider(gh, { label: "Table size (slots)", min: 5, max: 23, step: 1, value: 13, on: v => { P.m = v; newTable(); } });
C.keys = K.slider(gh, { label: "Keys to insert", min: 1, max: 30, step: 1, value: 8, on: v => { P.keys = v; newTable(); } });
C.method = K.seg(gh, { label: "Collisions", value: "probe", options: [["probe", "open addressing: linear probing"], ["chain", "chaining (overflow lists)"]], on: v => { P.method = v; newTable(); } });
let rw2 = K.row(gh); K.btn(rw2, "🎲 New keys", () => newTable(), "primary"); K.btn(rw2, "Search for another key", () => { P.find = keyList[rand.int(keyList.length)]; hres = findInTable(tab, P.find, P.m, P.method); shown = 0; });
C.speed = K.slider(ui.group("Speed"), { label: "Steps per second", min: 0.25, max: 4, step: 0.25, value: 1, on: v => P.speed = v });
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gs.style.display = P.mode === "search" ? "" : "none"; gh.style.display = P.mode === "hash" ? "" : "none"; C.mode.el.querySelectorAll("button")[1].style.display = ui.level === "adv" ? "" : "none"; if (P.method === "probe") { P.keys = Math.min(P.keys, P.m); } }
function set(o) { Object.assign(P, DEF, o); if (P.mode === "hash" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["mode", "alg", "n", "m", "keys", "method", "speed"]) C[k].set(P[k]); showCtl(); newList(); if (!("target" in o)) { P.target = arr[Math.floor(arr.length * 0.7)]; } C.target.set(P.target); runSearch(); newTable(); }

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function box(c, x, y, w, h, fill, stroke, text, tcol = "#fff") { c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = stroke; c.strokeRect(x + .5, y + .5, w - 1, h - 1); if (text != null) TX(c, text, x + w / 2, y + h / 2 + 4, tcol, "center", w > 30 ? "600 13px" : "11px"); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "search") {
    const n = arr.length, cols = Math.min(n, 32), rows = Math.ceil(n / cols), bw = Math.min(46, (w - 40) / cols), bh = 40, x0 = (w - cols * bw) / 2, y0 = h / 2 - rows * (bh + 34) / 2;
    const k = Math.min(shown, res.look.length), looked = new Set(res.look.slice(0, k)), cur = k > 0 ? res.look[k - 1] : -1, st = P.alg === "binary" && res.steps ? res.steps[Math.min(k, res.steps.length - 1)] : null;
    TX(c, `${P.alg === "binary" ? "BINARY" : "LINEAR"} SEARCH for ${P.target}`, 20, 28, "#ffd166", "left", "600 15px");
    for (let i = 0; i < n; i++) { const x = x0 + (i % cols) * bw, y = y0 + Math.floor(i / cols) * (bh + 34); let fill = "#1b2a48", tc = "#fff"; if (st && (i < st.lo || i > st.hi)) { fill = "#121826"; tc = "#4a5670"; } if (looked.has(i)) fill = "#3a4a6e"; if (i === cur) fill = arr[i] === P.target ? "#2e9e5b" : "#c2410c"; box(c, x, y, bw - 3, bh, fill, "#3a4a6e", arr[i], tc); TX(c, i, x + bw / 2 - 1.5, y + bh + 12, "#5d6e93", "center", "10px");
      if (st && st.mid >= 0) { const lab = []; if (i === st.lo) lab.push("L"); if (i === st.mid) lab.push("M"); if (i === st.hi) lab.push("H"); if (lab.length) TX(c, lab.join(" "), x + bw / 2 - 1.5, y + bh + 26, "#ffb454", "center", "600 12px"); } }
    const doneNow = k >= res.look.length; ui.hud(`comparisons: <b>${k}</b><br>${doneNow ? (res.found >= 0 ? `found at index ${res.found}` : "not in the list") : cur >= 0 ? `A[${cur}] = ${arr[cur]} ${arr[cur] === P.target ? "=" : arr[cur] < P.target ? "<" : ">"} ${P.target}` : "starting…"}`);
  } else {
    const m = P.m, bh = Math.min(34, (h - 60) / m), x0 = 120, y0 = 40, bw = 90, k = Math.min(shown, hres.path.length), onPath = new Set(hres.path.slice(0, k));
    TX(c, `HASH TABLE: address = key MOD ${m}, ${P.method === "probe" ? "linear probing" : "chaining"}`, 20, 24, "#ffd166", "left", "600 14px");
    for (let i = 0; i < m; i++) { const y = y0 + i * bh; TX(c, i, x0 - 10, y + bh / 2 + 4, "#8fa0bf", "right", "12px");
      if (P.method === "probe") { const v = tab.T[i], home = v != null && hash(v, m) !== i; box(c, x0, y, bw, bh - 3, onPath.has(i) ? (v === P.find && i === hres.path[k - 1] ? "#2e9e5b" : "#c2410c") : v == null ? "#121826" : home ? "#3b2f5e" : "#1b2a48", "#3a4a6e", v == null ? "" : v + (home ? `  (home ${hash(v, m)})` : "")); }
      else { box(c, x0, y, 40, bh - 3, onPath.has(i) ? "#c2410c" : "#1b2a48", "#3a4a6e", ""); tab.T[i].forEach((v, j) => { const x = x0 + 60 + j * 70; c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(x - 20, y + bh / 2 - 1); c.lineTo(x, y + bh / 2 - 1); c.stroke(); const hit = onPath.has(i) && v === P.find && k >= hres.path.length; box(c, x, y + 2, 56, bh - 7, hit ? "#2e9e5b" : onPath.has(i) && j < hres.probes ? "#3a4a6e" : "#1b2a48", "#3a4a6e", v); }); } }
    // the keys in order of insertion, with their hash values
    const lx = w - 230; TX(c, "keys inserted (in order):", lx, 140, "#c9d4ea", "left", "600 12px"); keyList.forEach((key, i) => { if (i > 24) return; TX(c, `${key} MOD ${m} = ${hash(key, m)}${tab.probes[i] > 1 ? (P.method === "probe" ? `  → ${tab.probes[i] - 1} collision${tab.probes[i] > 2 ? "s" : ""}` : "  (collision)") : ""}`, lx, 162 + i * 18, key === P.find ? "#ffb454" : tab.probes[i] > 1 ? "#ff9aa9" : "#9fb0cf", "left", "12px"); });
    ui.hud(`find ${P.find}: home address ${hash(P.find, m)}<br>probes: <b>${k}</b>${k >= hres.path.length ? (hres.found ? " · found" : " · not found") : ""}<br>load factor α = ${(keyList.length / m).toFixed(2)}`);
  }
}
function panels() {
  if (P.mode === "search") {
    relabel(["Comparisons this search", "Worst case: linear, binary", "Average (present): linear, binary", "Data sorted?"]);
    read.set("a", Math.min(shown, res.look.length)); read.set("b", `${arr.length}, ${Math.ceil(Math.log2(arr.length + 1))}`); read.set("c", `${((arr.length + 1) / 2).toFixed(1)}, ${binAvg(arr.length).toFixed(2)}`); read.set("d", "yes (binary search needs it)");
    const L = [], B = []; for (let n = 1; n <= 1000; n += n < 50 ? 1 : 10) { L.push([n, n]); B.push([n, Math.ceil(Math.log2(n + 1))]); }
    chA.opts.title = "Worst-case comparisons"; chA.opts.xLabel = "n"; chA.opts.yLabel = "comparisons"; chA.draw([{ pts: L, color: K.cssVar("--s3"), label: "linear: n" }, { pts: B, color: K.cssVar("--s2"), label: "binary: ⌈log₂(n + 1)⌉" }], { yMin: 0, yMax: 60, vlines: [{ x: arr.length }] });
    const per = arr.map((_, i) => [i, (P.alg === "linear" ? linear(arr, arr[i]) : binary(arr, arr[i])).look.length]);
    chB.opts.title = `Comparisons to find each item (${P.alg} search)`; chB.opts.xLabel = "index of the item"; chB.opts.yLabel = "comparisons"; chB.draw([{ pts: per, type: "bars", w: 0.8, color: K.cssVar("--s0") }], { yMin: 0 });
  } else {
    relabel(["Keys / slots", "Load factor α", "Mean probes to find a key", "Theory (random keys)"]); const a = keyList.length / P.m;
    read.set("a", `${keyList.length} / ${P.m}`); read.set("b", a.toFixed(2)); read.set("c", K.mean(tab.probes).toFixed(2)); read.set("d", P.method === "probe" ? (a < 1 ? (0.5 * (1 + 1 / (1 - a))).toFixed(2) : "table full") : (1 + a / 2).toFixed(2));
    chA.opts.title = "Probes needed to find each key (in insertion order)"; chA.opts.xLabel = "key number"; chA.opts.yLabel = "probes"; chA.draw([{ pts: tab.probes.map((p, i) => [i + 1, p]), type: "bars", w: 0.8, color: K.cssVar("--s1") }], { yMin: 0 });
    const T1 = [], T2 = []; for (let x = 0.02; x <= 0.95; x += 0.01) { T1.push([x, 0.5 * (1 + 1 / (1 - x))]); T2.push([x, 1 + x / 2]); }
    chB.opts.title = "Average probes against load factor (theory)"; chB.opts.xLabel = "α"; chB.opts.yLabel = "probes"; chB.draw([{ pts: T1, color: K.cssVar("--s3"), label: "linear probing" }, { pts: T2, color: K.cssVar("--s2"), label: "chaining" }], { yMin: 0, yMax: 8, vlines: [{ x: Math.min(0.95, a) }] });
  }
}
let frame = 0;
ui.run(dt => { acc += dt * P.speed; while (acc >= 1) { acc--; shown++; const len = P.mode === "search" ? res.look.length : hres.path.length; if (shown > len + 3) shown = 0; } }, () => { draw(); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "hash") set({}); showCtl(); };
set({});
ui.tip("Orange: the item being compared. Binary search greys out the half it can throw away.", 7000);
