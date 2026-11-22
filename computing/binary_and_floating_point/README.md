# Binary and Floating Point

A single, self-contained HTML file: Click bits to see a byte as unsigned, two's complement, hex, BCD and ASCII; add two bytes with carries, the carry flag and overflow; then build normalised floating-point numbers and see why 0.1 cannot be stored exactly. It needs no install and no
internet: **open `binary-and-floating-point.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/binary_and_floating_point.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `binary-and-floating-point.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 1.1: binary, denary, hexadecimal and BCD; one's and two's complement; binary addition and subtraction and overflow; binary prefixes; ASCII and Unicode character sets.
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 13.3: floating-point representation with a two's complement mantissa and exponent, normalisation, the trade-off between range and precision, conversion between denary and floating point, rounding errors, and overflow and underflow.

## What it shows

One byte: click the bits and read the value every way at once, with the two's complement place values. Binary addition: two bytes added column by column with the carries, the carry flag and the overflow flag explained. Floating point (A Level): mantissa and exponent bits with their place values, normalisation, the nearest representation of any number you type with its error, all the representable values, and the rounding error across a range of numbers.

Try this first: Add 105 and 55 in 8-bit two's complement. Why is the answer negative?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How often does 8-bit addition overflow? | mean 0.25, SD 0.0304, SE 0.00175 from 300 runs (theory: exact count: 16 384/65 536 = ¼) |
| Precision and mantissa bits (A level) | 4: -4.46 ± 0.0248 · 6: -6.44 ± 0.0153 · 8: -8.51 ± 0.0206 · 10: -10.5 ± 0.0129 · 12: -12.5 ± 0.0205 · 16: -16.4 ± 0.0117 · 20: -20.5 ± 0.00983 (mean ± SE, 4 runs each) (theory: ≈ log₂(0.35 × 2^−(m−1))) |
| Range and exponent bits (A level) | 2: 0.989 ± 0 · 3: 2.99 ± 0 · 4: 6.99 ± 0 · 5: 15 ± 0 · 6: 31 ± 0 · 7: 63 ± 0 · 8: 127 ± 0 (mean ± SE, 1 runs each) (theory: ≈ 2^(e−1) − 1) |
| Adding 0.1 again and again (A level) | 1: -3.91e-4 ± 0 · 5: 0 ± 0 · 10: 0 ± 0 · 20: -0.0625 ± 0 · 40: -0.188 ± 0 · 60: 0.25 ± 0 · 80: 0.75 ± 0 · 100: 1.25 ± 0 (mean ± SE, 1 runs each) (theory: exact arithmetic) |

## The model

8-bit integers; an exam-style floating-point format (two's complement mantissa and exponent, round to nearest), not IEEE 754. Assumptions and simplifications are listed inside the simulation under **The model**.
