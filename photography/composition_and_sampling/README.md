# Pixels, Compression and Composition

A single, self-contained HTML file: resolution and print size, sampling and moiré, bit depth and banding, how JPEG compression works, and cropping with composition guides. It needs no install and no
internet: **open `composition-and-sampling.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/composition_and_sampling.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `composition-and-sampling.html` by hand.

- **Standard (GCSE):** AQA GCSE Photography (8206): digital processes (resolution, file formats, cropping) and composition (rule of thirds, framing); GCSE Computer Science context: pixels, colour depth, file size, lossy compression.
- **Advanced (A level):** AQA A level Photography (7206) 3.8: composition and digital processes (capture, editing, output and printing); context: the Nyquist limit, transform coding (DCT).

## What it shows

One scene (an evening sky, hills, a picket fence, a tree, a person in a striped shirt) four ways. **Resolution:** 0.01–45 megapixels, with or without an anti-aliasing filter (moiré on the fence and shirt), print size at 72, 150 or 300 dpi, samples per fence post against the Nyquist limit. **Bit depth:** 1–8 bits per channel, banding in the sky, dither. **JPEG:** the real method in miniature (Y Cb Cr, 8 × 8 DCT, standard quantisation tables scaled by quality), with a zoomed view showing the blocks, the thrown-away difference ×8, estimated file size and PSNR. **Composition:** a draggable crop with thirds, golden-section or centre guides and five aspect ratios, reporting where the tree and horizon sit.

The candidate darkroom-chemistry simulation was folded into The Exposure Triangle's film view (development time, temperature, pushing), rather than built separately.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| JPEG quality and file size | 28 × smaller at quality 10, 15 × at 75, 10 × at 90–95 |
| JPEG quality and image quality | PSNR 31 dB at quality 10, 39 dB at 75, 48 dB at 95 |
| Bit depth and rounding error | 28.6% at 1 bit to 0.11% at 8 bits (step ÷ √12) |
| Aliasing: what pattern do you see? | 0.40 at spacing 1, 0.26 at 1.5, 0.10 at 2 and 4 (folded frequency) |
| Saving again and again | PSNR 40 dB after one save, 32 after 8, 27 after 20 |
