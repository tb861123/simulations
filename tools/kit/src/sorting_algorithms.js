/* =====================================================================
   SORTING ALGORITHMS
   Each algorithm is written as a GENERATOR: it sorts the array but
   pauses ("yields") every time it compares two items or moves one, so
   the page can animate it and count the work done.
     BUBBLE SORT    : pass through the list swapping neighbours that are
                      the wrong way round; repeat until a pass makes no
                      swaps.                      O(n²) comparisons
     INSERTION SORT : take each item in turn and slide it left into its
                      place among the sorted items before it.
                      O(n²) in general, but only O(n) if nearly sorted
     MERGE SORT     : split in half, sort each half (recursively), then
                      merge the two sorted halves.     O(n log n)
     QUICK SORT     : choose a pivot, put smaller items before it and
                      larger after it, then sort each side.
                      O(n log n) on average, O(n²) at worst
   Big O describes how the work grows as n grows: doubling n roughly
   quadruples an O(n²) sort but only slightly more than doubles an
   O(n log n) one.
   ===================================================================== */
// ---------------- 1. The algorithms (pseudocode lines are numbered for highlighting) ----------------
const CODE = {
  bubble: ["REPEAT", "  Swapped ← FALSE", "  FOR i ← 0 TO Last − 1", "    IF A[i] > A[i + 1] THEN", "      swap A[i] and A[i + 1]", "      Swapped ← TRUE", "    ENDIF", "  NEXT i", "  Last ← Last − 1", "UNTIL NOT Swapped"],
  insertion: ["FOR i ← 1 TO n − 1", "  Item ← A[i]", "  j ← i − 1", "  WHILE j ≥ 0 AND A[j] > Item", "    A[j + 1] ← A[j]", "    j ← j − 1", "  ENDWHILE", "  A[j + 1] ← Item", "NEXT i"],
  merge: ["MergeSort(A):", "  IF length(A) ≤ 1 THEN RETURN A", "  split A into Left and Right halves", "  MergeSort(Left); MergeSort(Right)", "  WHILE both halves have items", "    take the smaller front item", "  copy any items left over"],
  quick: ["QuickSort(A, lo, hi):", "  IF lo ≥ hi THEN RETURN", "  Pivot ← A[hi]", "  FOR each j from lo to hi − 1", "    IF A[j] < Pivot THEN move it to the left part", "  put Pivot between the parts", "  QuickSort(left part); QuickSort(right part)"],
};
function* bubble(a) {
  let last = a.length - 1, swapped;
  do { swapped = false; yield { line: 1 };
    for (let i = 0; i < last; i++) { yield { t: "cmp", i, j: i + 1, line: 3 }; if (a[i] > a[i + 1]) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; swapped = true; yield { t: "swap", i, j: i + 1, line: 4 }; } }
    yield { t: "done", from: last, line: 8 }; last--;
  } while (swapped && last >= 0);
  yield { t: "done", from: 0, line: 9 };
}
function* insertion(a) {
  for (let i = 1; i < a.length; i++) { const item = a[i]; let j = i - 1; yield { t: "pick", i, line: 1 };
    while (j >= 0) { yield { t: "cmp", i: j, j: j + 1, line: 3 }; if (a[j] <= item) break; a[j + 1] = a[j]; yield { t: "move", i: j + 1, line: 4 }; j--; }
    a[j + 1] = item; yield { t: "move", i: j + 1, line: 7 }; }
  yield { t: "done", from: 0, line: 8 };
}
function* mergeSort(a, lo = 0, hi = a.length) {
  if (hi - lo <= 1) return; const mid = (lo + hi) >> 1; yield { t: "range", lo, hi, line: 2 };
  yield* mergeSort(a, lo, mid); yield* mergeSort(a, mid, hi);
  const L = a.slice(lo, mid), R = a.slice(mid, hi); let i = 0, j = 0, k = lo;
  while (i < L.length && j < R.length) { yield { t: "cmp", i: lo + i, j: mid + j, line: 5 }; a[k++] = L[i] <= R[j] ? L[i++] : R[j++]; yield { t: "move", i: k - 1, line: 5 }; }
  while (i < L.length) { a[k++] = L[i++]; yield { t: "move", i: k - 1, line: 6 }; } while (j < R.length) { a[k++] = R[j++]; yield { t: "move", i: k - 1, line: 6 }; }
  if (lo === 0 && hi === a.length) yield { t: "done", from: 0, line: 6 };
}
function* quick(a, lo = 0, hi = a.length - 1, top = true) {
  if (lo < hi) { const p = a[hi]; let s = lo; yield { t: "pivot", i: hi, lo, hi, line: 2 };
    for (let j = lo; j < hi; j++) { yield { t: "cmp", i: j, j: hi, line: 4 }; if (a[j] < p) { [a[s], a[j]] = [a[j], a[s]]; if (s !== j) yield { t: "swap", i: s, j, line: 4 }; s++; } }
    [a[s], a[hi]] = [a[hi], a[s]]; yield { t: "swap", i: s, j: hi, line: 5 };
    yield* quick(a, lo, s - 1, false); yield* quick(a, s + 1, hi, false); }
  if (top) yield { t: "done", from: 0, line: 6 };
}
const ALG = { bubble: { name: "bubble sort", g: bubble }, insertion: { name: "insertion sort", g: insertion }, merge: { name: "merge sort (A level)", g: mergeSort, adv: true }, quick: { name: "quick sort (beyond)", g: quick, adv: true } };
// count the work for one run (used by the batch runs)
function cost(alg, a) { const c = { cmp: 0, moves: 0 }; for (const e of ALG[alg].g(a)) { if (e.t === "cmp") c.cmp++; if (e.t === "swap" || e.t === "move") c.moves++; } return c; }
function makeData(kind, n, r) {
  const a = Array.from({ length: n }, (_, i) => i + 1);
  if (kind === "random" || kind === "few") for (let i = n - 1; i > 0; i--) { const j = r.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  if (kind === "reversed") a.reverse();
  if (kind === "nearly") for (let k = 0; k < Math.max(1, n / 20); k++) { const i = r.int(n - 1); [a[i], a[i + 1]] = [a[i + 1], a[i]]; }
  if (kind === "few") for (let i = 0; i < n; i++) a[i] = Math.ceil(a[i] / n * 4) * n / 4;
  return a;
}
const H = n => { let s = 0; for (let k = 1; k <= n; k++) s += 1 / k; return s; };

// ---------------- 2. State ----------------
const DEF = { alg: "bubble", data: "random", n: 20, speed: 6, race: false };
const P = Object.assign({}, DEF);
let lanes = [], acc = 0, seed = 1, hist = [];
function newLane(alg, base) { const a = base.slice(); return { alg, a, it: ALG[alg].g(a), ev: {}, cmp: 0, moves: 0, done: false, sorted: a.length, line: 0, hl: [] }; }
function restart() { seed = Math.floor(Math.random() * 1e9); const base = makeData(P.data, P.n, K.rng(seed)); hist = []; lanes = P.race ? Object.keys(ALG).filter(k => !ALG[k].adv || ui.level === "adv").map(k => newLane(k, base)) : [newLane(P.alg, base)]; acc = 0; }
function stepLane(L) { if (L.done) return; const r = L.it.next(); if (r.done) { L.done = true; L.sorted = 0; L.hl = []; return; } const e = r.value; L.ev = e; if (e.line != null) L.line = e.line; if (e.t === "cmp") { L.cmp++; L.hl = [e.i, e.j]; } if (e.t === "swap" || e.t === "move") { L.moves++; L.hl = e.t === "swap" ? [e.i, e.j] : [e.i]; if (K.sound.on) K.sound.tone(200 + 600 * L.a[e.i] / P.n, { dur: 0.05, vol: 0.05 }); } if (e.t === "done") L.sorted = Math.min(L.sorted, e.from); if (e.t === "pick") L.hl = [e.i]; }

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Sorting Algorithms", subject: "Computer Science",
  blurb: "Watch bubble, insertion, merge and quick sort work step by step, with pseudocode, comparison and move counters, a race, and Big O curves",
  reset: () => restart(), step: () => lanes.forEach(stepLane), sound: "a short beep for each move, pitched by the value moved",
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 10 and 11: algorithms written in pseudocode with iteration and selection, including the bubble sort and insertion sort; tracing algorithms with trace tables.",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 19.1: bubble sort and insertion sort compared, the performance of algorithms and Big O notation for time complexity (O(1), O(n), O(n²), O(log n), O(n log n)); recursion (merge sort as an example). Quick sort goes beyond the syllabus." } },
  missions: [
    { title: "Bubble sort, pass by pass", q: "Watch one pass of bubble sort on 10 items. Where does the largest value end up after the first pass? Why is the last item never compared again?", hint: "After pass 1 the largest value has 'bubbled' to the end; after pass k the last k items are in place (shaded green), so each pass can stop one place earlier (Last ← Last − 1).", setup: () => set({ alg: "bubble", n: 10, speed: 3 }) },
    { title: "When can bubble sort stop early?", q: "Use nearly-sorted data. How many passes does bubble sort need? What does the Swapped flag do?", hint: "If a whole pass makes no swaps, the list is sorted and the REPEAT…UNTIL NOT Swapped loop stops. On already-sorted data that is after one pass: n − 1 comparisons, O(n).", setup: () => set({ alg: "bubble", data: "nearly", n: 30, speed: 6 }) },
    { title: "Insertion sort", q: "Insertion sort on 15 random items. Follow the highlighted pseudocode. What happens to the items while the WHILE loop runs?", hint: "Each larger item is copied one place to the right to make a gap, and the saved Item drops into the gap. The left part (i items) is always sorted.", setup: () => set({ alg: "insertion", n: 15, speed: 4 }) },
    { title: "The worst case", q: "Reversed data: count the comparisons for bubble and insertion sort with n = 20. Compare with n(n − 1)/2 = 190.", hint: "Both need 190 comparisons for reversed data: every pair is the wrong way round, so every pair must be compared. That is the worst case, O(n²).", setup: () => set({ alg: "insertion", data: "reversed", n: 20, speed: 8 }) },
    { lvl: "adv", title: "Race them", q: "Race all four sorts on 100 random items. Which finishes first? Now try nearly-sorted data.", hint: "Random: merge and quick sort win easily (about 550 and 650 comparisons against about 2500 for insertion and 4900 for bubble). Nearly sorted: insertion sort wins, while plain quick sort (last item as pivot) gets slower.", setup: () => set({ race: true, n: 100, speed: 9 }) },
    { lvl: "adv", title: "Big O: doubling n", q: "Use the Batch run 'Comparisons as n grows'. When n doubles, by what factor do bubble sort's comparisons grow? Merge sort's?", hint: "Bubble/insertion: ×4 (O(n²)). Merge: a little over ×2 (O(n log n)). For n = 1 000 000, n² is 10¹², but n log₂ n is only about 2 × 10⁷.", setup: () => set({ alg: "merge", n: 64, speed: 8 }) },
  ],
  batch: [
    { title: "Swaps in bubble sort", question: "On random data, how many swaps does bubble sort make?", how: "Each point: one random list of n items; records the number of swaps.", xLabel: "n", yLabel: "swaps", xs: [5, 10, 20, 40, 60, 80, 100], reps: 6, yMin: 0, theory: n => n * (n - 1) / 4, theoryLabel: "n(n − 1)/4", run: (n, r) => cost("bubble", makeData("random", n, r)).moves, note: "Each swap fixes exactly one pair that is the wrong way round (an inversion). A random list has, on average, half of all n(n − 1)/2 pairs inverted." },
    { title: "Comparisons in insertion sort", question: "On random data, how many comparisons does insertion sort make?", how: "Each point: one random list of n items.", xLabel: "n", yLabel: "comparisons", xs: [5, 10, 20, 40, 60, 80, 100], reps: 6, yMin: 0, theory: n => n * (n - 1) / 4 + n - H(n), theoryLabel: "n(n − 1)/4 + n − Hₙ", run: (n, r) => cost("insertion", makeData("random", n, r)).cmp, note: "About half of bubble sort's: O(n²) still, but insertion sort stops each WHILE loop as soon as it finds the item's place." },
    { title: "Comparisons as n grows (A level)", question: "How do merge sort's comparisons grow with n on random data?", how: "Each point: one random list.", xLabel: "n", yLabel: "comparisons", xs: [8, 16, 32, 64, 128, 256], reps: 5, yMin: 0, theory: n => n * Math.log2(n) - 1.25 * n, theoryLabel: "≈ n log₂ n − 1.25n", run: (n, r) => cost("merge", makeData("random", n, r)).cmp, note: "O(n log n): doubling n a little more than doubles the work. Merge sort's count hardly varies from list to list." },
    { title: "Quick sort on random data (beyond)", question: "How many comparisons does quick sort (last item as pivot) make on random data?", how: "Each point: one random list.", xLabel: "n", yLabel: "comparisons", xs: [8, 16, 32, 64, 128, 256], reps: 5, yMin: 0, theory: n => 2 * (n + 1) * H(n) - 4 * n, theoryLabel: "2(n + 1)Hₙ − 4n", run: (n, r) => cost("quick", makeData("random", n, r)).cmp, note: "On average about 1.39 n log₂ n, but it varies more than merge sort, and on already-sorted data this version degrades to n(n − 1)/2." },
    { title: "Insertion sort loves nearly sorted data", question: "If only k neighbouring pairs of a sorted list of 100 are swapped, how many comparisons does insertion sort make?", how: "Each point: one list of 100 with k random neighbour swaps.", xLabel: "neighbour swaps k", yLabel: "comparisons", xs: [0, 2, 5, 10, 20, 40], reps: 6, yMin: 0, theory: k => 99 + k, theoryLabel: "≈ (n − 1) + k", run: (k, r) => { const a = Array.from({ length: 100 }, (_, i) => i + 1); for (let q = 0; q < k; q++) { const i = r.int(99); [a[i], a[i + 1]] = [a[i + 1], a[i]]; } return cost("insertion", a).cmp; }, note: "One comparison per item plus one per inversion: close to O(n). (Overlapping swaps can cancel or add inversions, so the points scatter a little.)" },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "9618 10/11", text: "Bubble sort compares neighbours and swaps them if they are in the wrong order; after each pass the largest remaining item is in place. A flag (Swapped) lets it stop when a pass makes no swaps." },
      { lvl: "std", tag: "9618 10/11", text: "Insertion sort builds a sorted part on the left; each new item is inserted by shifting larger items one place right. Efficient for small or nearly-sorted lists." },
      { lvl: "std", tag: "9618", text: "A trace table records the value of each variable after each step. Use it to check an algorithm by hand." },
      { lvl: "adv", tag: "19.1", text: "Big O gives the order of growth of time (or memory) with n: bubble and insertion O(n²) worst/average, O(n) best (sorted data, with the flag); merge sort O(n log n) always; quick sort O(n log n) average, O(n²) worst." },
      { lvl: "adv", tag: "19.2", text: "Merge sort is recursive: a base case (lists of length 0 or 1 are sorted) and a general case (split, sort each half, merge). It needs extra memory for merging." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Show the state of the list 5, 1, 4, 2, 8 after each pass of a bubble sort.", ans: "<ul><li>pass 1: 1, 4, 2, 5, 8</li><li>pass 2: 1, 2, 4, 5, 8</li><li>pass 3: no swaps, so the sort stops</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why insertion sort is faster than bubble sort on a list that is almost in order.", ans: "<ul><li>each item only moves a short distance, so the inner WHILE loop stops after one or two comparisons</li><li>so about n comparisons in total, whereas bubble sort still compares along the whole list on each pass</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const L = lanes[0]; return L ? `A ${ALG[L.alg].name} of ${P.n} items made ${L.cmp} comparisons. Estimate how many it would make for ${P.n * 4} items of the same kind, and state its time complexity.` : "Run a sort first."; }, ans: () => { const L = lanes[0]; if (!L) return ""; const sq = L.alg === "bubble" || L.alg === "insertion"; return `<ul><li>${sq ? "O(n²)" : "O(n log n)"}</li><li>${sq ? "4² = 16 times as many" : "a little over 4 times as many"}</li><li>about ${sq ? 16 * L.cmp : Math.round(L.cmp * 4 * Math.log2(4 * P.n) / Math.log2(P.n))} comparisons</li></ul>`; } },
      { lvl: "adv", marks: 2, q: "Merge sort is O(n log n) but needs extra memory. Explain what the extra memory is used for.", ans: "<ul><li>merging two sorted halves needs a temporary copy of the halves (or a second array)</li><li>so memory is O(n), unlike bubble and insertion sort which sort in place</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Each sort is a generator: it really sorts the array but pauses at every comparison and every move, so you can see each step and the counters are exact.</li><li>Bars: orange = being compared, red = just moved or swapped, green = known to be in its final place. The pseudocode line running now is highlighted.</li><li>Moves count swaps (bubble, quick) or copies of one item (insertion, merge).</li></ul>
<h3>Simplifications</h3><ul><li>Real running time also depends on memory, caching and the language; counting comparisons and moves is the usual way to compare algorithms.</li><li>Quick sort uses the last item as its pivot (Lomuto's method); real libraries choose pivots more cleverly.</li><li>"Few values" data has many equal items.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Algorithm");
C.alg = K.seg(g, { value: "bubble", options: Object.entries(ALG).map(([k, v]) => [k, v.name]), on: v => { P.alg = v; P.race = false; C.race.set(false); restart(); } });
C.race = K.toggle(g, { label: "Race all the algorithms on the same data", value: false, on: v => { P.race = v; restart(); } });
g = ui.group("Data");
C.data = K.seg(g, { value: "random", options: [["random", "random"], ["nearly", "nearly sorted"], ["reversed", "reversed"], ["few", "few values"]], on: v => { P.data = v; restart(); } });
C.n = K.slider(g, { label: "Number of items n", min: 5, max: 200, step: 1, value: 20, on: v => { P.n = v; restart(); } });
C.speed = K.slider(g, { label: "Speed (steps per second)", min: 1, max: 12, step: 1, value: 6, fmt: v => String(Math.round(Math.pow(2, v - 1))), on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
let rw = K.row(g); K.btn(rw, "🎲 New data", () => restart(), "primary");
const read = K.readout(ui.group("Counters"), [["cmp", "Comparisons"], ["mv", "Swaps / moves"], ["th", "n(n − 1)/2 and n log₂ n"], ["st", "Status"]]);
function showCtl() { C.alg.el.querySelectorAll("button").forEach((b, i) => b.style.display = !Object.values(ALG)[i].adv || ui.level === "adv" ? "" : "none"); }
function set(o) { Object.assign(P, DEF, o); if ((ALG[P.alg].adv || P.race) && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["alg", "race", "data", "n", "speed"]) C[k].set(P[k]); showCtl(); restart(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Comparisons so far", xLabel: "steps", yLabel: "comparisons", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Big O: work for n items", xLabel: "n", yLabel: "comparisons", yMin: 0 });
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawLane(c, L, x0, y0, w, h, showCode) {
  const n = L.a.length, cw = showCode ? w * 0.64 : w, bw = cw / n, mx = Math.max(...L.a);
  TX(c, `${ALG[L.alg].name}: ${L.cmp} comparisons, ${L.moves} moves${L.done ? "  ✓ sorted" : ""}`, x0, y0 + 14, L.done ? "#7ee787" : "#fff", "left", "600 13px");
  const top = y0 + 24, bh = h - 30;
  for (let i = 0; i < n; i++) { const v = L.a[i], hh = v / mx * bh; let col = "#3d7fbf"; if (L.sorted <= i || L.done) col = "#2e9e5b"; if (L.ev.t === "pivot" && i === L.ev.i) col = "#c4a1ff"; if (L.ev.t === "range" && i >= L.ev.lo && i < L.ev.hi) col = "#4a6aa0"; if (L.hl.includes(i)) col = L.ev.t === "cmp" ? "#ffb454" : "#ff6b81"; c.fillStyle = col; c.fillRect(x0 + i * bw + (bw > 4 ? 1 : 0), top + bh - hh, Math.max(1, bw - (bw > 4 ? 2 : 0)), hh); if (bw > 22) TX(c, v, x0 + (i + 0.5) * bw, top + bh - hh - 4, "#c9d4ea", "center", "10px"); }
  if (showCode) { const lines = CODE[L.alg], lx = x0 + cw + 20, lh = Math.min(22, (bh - 50) / lines.length), top = y0 + 74; c.fillStyle = "#101a30"; c.fillRect(lx - 10, top - 4, w - cw - 10, lines.length * lh + 12); lines.forEach((s, k) => { if (k === L.line && !L.done) { c.fillStyle = "rgba(255,180,84,.22)"; c.fillRect(lx - 8, top + k * lh, w - cw - 14, lh); } TX(c, s, lx, top + k * lh + lh * 0.72, k === L.line && !L.done ? "#ffd9a0" : "#9fb0cf", "left", "12px Consolas,monospace,"); }); }
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (!lanes.length) return; const k = lanes.length, lh = (h - 20) / k;
  lanes.forEach((L, i) => drawLane(c, L, 20, 10 + i * lh, w - 40, lh - 12, k === 1));
  const L = lanes[0]; ui.hud(k === 1 ? `${L.done ? "sorted" : "orange: comparing · red: moved · green: in place"}` : "Race: same data for every algorithm");
}
function panels() {
  const L = lanes[0]; if (!L) return; const n = P.n;
  read.set("cmp", lanes.map(q => q.cmp).join(" · ")); read.set("mv", lanes.map(q => q.moves).join(" · ")); read.set("th", `${n * (n - 1) / 2} and ${Math.round(n * Math.log2(n))}`); read.set("st", lanes.every(q => q.done) ? "all sorted" : "sorting…");
  hist.push(lanes.map(q => q.cmp)); if (hist.length > 600) hist.shift();
  chA.draw(lanes.map((q, i) => ({ pts: hist.map((hh, s) => [s, hh[i]]).filter(p => p[1] != null), color: K.cssVar("--s" + i), label: ALG[q.alg].name.split(" (")[0] })));
  const N2 = [], NL = []; for (let m = 2; m <= 200; m += 2) { N2.push([m, m * (m - 1) / 2]); NL.push([m, m * Math.log2(m)]); }
  chB.draw([{ pts: N2, color: K.cssVar("--s3"), label: "n(n − 1)/2: O(n²)" }, { pts: NL, color: K.cssVar("--s2"), label: "n log₂ n" }].concat(lanes.filter(q => q.done).map((q, i) => ({ pts: [[n, q.cmp]], type: "dots", r: 5, color: K.cssVar("--s" + lanes.indexOf(q)) }))), { vlines: [{ x: n, label: "n = " + n }] });
}
let frame = 0;
ui.run(dt => { acc += dt * Math.pow(2, P.speed - 1); let k = 0; while (acc >= 1 && k++ < 5000) { acc--; lanes.forEach(stepLane); } }, () => { draw(); if (frame++ % 6 === 0) panels(); });
ui.onLevel = () => { showCtl(); if (ui.level !== "adv" && (ALG[P.alg].adv || P.race)) set({}); };
set({});
hist = [];
ui.tip("Orange bars are being compared; red ones just moved. Follow the highlighted pseudocode.", 7000);
