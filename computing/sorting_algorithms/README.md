# Sorting Algorithms

A single, self-contained HTML file: Watch bubble, insertion, merge and quick sort work step by step beside highlighted pseudocode, count comparisons and moves, race them on the same data, and see Big O in action. It needs no install and no
internet: **open `sorting-algorithms.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/sorting_algorithms.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `sorting-algorithms.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 10 and 11: algorithms written in pseudocode with iteration and selection, including the bubble sort and insertion sort; tracing algorithms with trace tables.
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 19.1: bubble sort and insertion sort compared, the performance of algorithms and Big O notation for time complexity (O(1), O(n), O(n²), O(log n), O(n log n)); recursion (merge sort as an example). Quick sort goes beyond the syllabus.

## What it shows

Bars for the items, with the pair being compared in orange, items just moved in red and items known to be in place in green, next to the pseudocode with the running line highlighted. Counters for comparisons and moves; charts of comparisons so far and of n(n − 1)/2 against n log₂ n. Race all four sorts on identical data, or try nearly sorted, reversed and few-value lists. Sound (optional) beeps each move.

Try this first: Give bubble sort nearly-sorted data. How many passes does it need now?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Swaps in bubble sort | 5: 6.5 ± 1.18 · 10: 21.8 ± 0.946 · 20: 92.5 ± 4.3 · 40: 377 ± 13.8 · 60: 899 ± 17.2 · 80: 1590 ± 29.7 · 100: 2450 ± 82 (mean ± SE, 6 runs each) (theory: n(n − 1)/4) |
| Comparisons in insertion sort | 5: 8.33 ± 0.615 · 10: 28.5 ± 0.957 · 20: 108 ± 3.97 · 40: 412 ± 13.2 · 60: 953 ± 16.9 · 80: 1670 ± 29.4 · 100: 2540 ± 81.9 (mean ± SE, 6 runs each) (theory: n(n − 1)/4 + n − Hₙ) |
| Comparisons as n grows (A level) | 8: 15.8 ± 0.374 · 16: 46 ± 1.14 · 32: 124 ± 1.24 · 64: 305 ± 2.6 · 128: 741 ± 1.36 · 256: 1710 ± 8.73 (mean ± SE, 5 runs each) (theory: ≈ n log₂ n − 1.25n) |
| Quick sort on random data (beyond) | 8: 17.6 ± 1.89 · 16: 49.6 ± 2.93 · 32: 134 ± 11.7 · 64: 358 ± 15.6 · 128: 907 ± 44 · 256: 2070 ± 73.9 (mean ± SE, 5 runs each) (theory: 2(n + 1)Hₙ − 4n) |
| Insertion sort loves nearly sorted data | 0: 99 ± 0 · 2: 101 ± 0.167 · 5: 104 ± 0 · 10: 107 ± 0.615 · 20: 116 ± 0.989 · 40: 127 ± 1.29 (mean ± SE, 6 runs each) (theory: ≈ (n − 1) + k) |

## The model

Each algorithm is a generator that sorts the real array and pauses at each comparison and move. Assumptions and simplifications are listed inside the simulation under **The model**.
