# Data Structures

A single, self-contained HTML file: A stack with TopOfStack, a circular queue with Front and Rear, a linked list in an array with a free list, and a binary search tree with insertion, searching and pre-, in- and post-order traversals: watch the pointers change. It needs no install and no
internet: **open `data-structures.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/data_structures.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `data-structures.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 10.4: abstract data types: stack, queue and linked list, how they are used, and how to implement them using arrays and pointers (TopOfStack; Front and Rear; StartPointer and a free list).
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 19.1: implementing ADTs from other ADTs, binary trees (insertion, searching, in-order, pre-order and post-order traversal), and comparing their performance.

## What it shows

Each ADT is drawn as 9618 exam questions show it: arrays of 8 slots with their pointers. Push, pop, enqueue, dequeue, insert, delete and find, with an operation log. The linked list is shown both as the array of nodes and as its logical chain, with the free list. A Level: a binary search tree drawn as a tree, animated searches and traversals, its height against a balanced tree.

Try this first: Insert 10, 20, 30, 40, 50, 60 into the tree in order. What shape do you get?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Searching a linked list | 5: 3.07 ± 0.0265 · 10: 5.53 ± 0.144 · 20: 10.2 ± 0.266 · 40: 21.1 ± 0.413 · 80: 40.5 ± 0.902 (mean ± SE, 4 runs each) (theory: (n + 1)/2) |
| Binary search tree: average search (A level) | 7: 3.2 ± 0.215 · 15: 4 ± 0.0558 · 31: 5.37 ± 0.188 · 63: 6.48 ± 0.122 · 127: 7.83 ± 0.244 · 255: 9.31 ± 0.325 (mean ± SE, 5 runs each) (theory: 2(1 + 1/n)Hₙ − 3) |
| Sorted input ruins a tree (A level) | 5: 5 ± 0 · 10: 10 ± 0 · 20: 20 ± 0 · 40: 40 ± 0 · 80: 80 ± 0 (mean ± SE, 1 runs each) (theory: n (a chain)) |
| Height of a random tree (A level) | mean 11.5, SD 1.39, SE 0.0802 from 300 runs (theory: balanced: log₂ 64 = 6) |
| In-order traversal sorts | mean 1, SD 0, SE 0 from 200 runs (theory: always) |

## The model

Array implementations with integer pointers (−1 = null); an unbalanced binary search tree. Assumptions and simplifications are listed inside the simulation under **The model**.
