# Searching and Hashing

A single, self-contained HTML file: Linear and binary search step by step with low, mid and high pointers and comparison counts, then hash tables with MOD hashing, collisions, linear probing and chaining, and the effect of the load factor. It needs no install and no
internet: **open `searching-and-hashing.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/searching_and_hashing.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `searching-and-hashing.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 10: algorithms for a linear search and a binary search of an array (with pseudocode), and the conditions for a binary search (the data must be sorted).
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topics 13.2 and 19.1: performance of linear and binary search with Big O (O(n) and O(log n)); file organisation and access with hashing algorithms, collisions and how they are handled (open addressing/linear probing and overflow/chaining).

## What it shows

Searching: a sorted array of boxes; linear search checks each in turn, binary search shows low, mid and high and greys out the half it discards, with comparisons counted and charted for every item and every n. Hashing (A Level): keys inserted with address = key MOD table size, collisions resolved by linear probing (with clusters) or chaining (linked lists), the search path for a key, and probes against load factor.

Try this first: Binary search 31 items. What is the most comparisons it can ever need?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Linear search: average comparisons | 10: 5.54 ± 0.161 · 20: 10.2 ± 0.3 · 40: 21.5 ± 1.02 · 60: 30.3 ± 0.557 · 80: 41.3 ± 0.397 · 100: 49.3 ± 1.1 (mean ± SE, 5 runs each) (theory: (n + 1)/2) |
| Binary search: average comparisons | 7: 2.42 ± 0.0347 · 15: 3.26 ± 0.0594 · 31: 4.17 ± 0.0762 · 63: 5.12 ± 0.0323 · 127: 6.04 ± 0.0571 · 255: 6.98 ± 0.0712 · 511: 8.01 ± 0.0796 · 1023: 9.03 ± 0.0416 (mean ± SE, 5 runs each) (theory: exact average (≈ log₂ n − 1)) |
| Linear probing and the load factor (A level) | 0.1: 1.07 ± 0.0146 · 0.3: 1.22 ± 0.0124 · 0.5: 1.41 ± 0.0277 · 0.6: 1.69 ± 0.0639 · 0.7: 2.07 ± 0.0677 · 0.8: 3.2 ± 0.19 · 0.9: 6.21 ± 0.513 (mean ± SE, 4 runs each) (theory: ½(1 + 1/(1 − α))) |
| Chaining and the load factor (A level) | 0.25: 1.13 ± 0.0105 · 0.5: 1.23 ± 0.00502 · 1: 1.5 ± 0.0171 · 1.5: 1.76 ± 0.00879 · 2: 1.99 ± 0.0173 · 3: 2.51 ± 0.01 (mean ± SE, 4 runs each) (theory: 1 + α/2) |
| When is the first collision? (A level) | mean 25.5, SD 12.8, SE 0.641 from 400 runs (theory: expected ≈ 24.6) |

## The model

Exact search algorithms on random sorted data; MOD hashing of random keys. Assumptions and simplifications are listed inside the simulation under **The model**.
