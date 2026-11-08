# Quarter-turn measured-raster provenance research

The offline browser benchmark in `tests/real-spatial-raster-benchmark.mjs` now runs a **separate, non-production diagnostic** on the genuine original JPEG pixels of the fictional 90-degree-rotated page. Chromium decodes that JPEG, restores an upright image by an exact counterclockwise quarter-turn, and actual pinned Tesseract recognizes it again. Its measured word rectangles pass through the existing geometry-only row matcher.

Each returned cell rectangle is transformed back into the original **550×1100 source JPEG frame** using the inverse of the *actual* quarter-turn:
`(x0,y0,x1,y1) -> (W-y1,x0,W-y0,x1)`.
This transformation is exact for 90-degree axis-aligned boxes; it never guesses or invents a word rectangle. The PDF page number remains the parser-authored page. Independent fixture-authored image rectangles are used only for scoring, not for producing citations.

The report preserves **two separate metrics**: uncorrected OCR baseline and an experimental orientation-normalization probe. It does not select alternate OCR text or source boxes in the deployed application and does not claim that the app now handles arbitrary rotated scans. No transform is accepted without known original raster dimensions and observed rotation. Before any production integration, evaluate angle selection, image resampling, PDF.js viewport transformation, complexity limits, wrong-angle false positives and memory/latency. The beta gate remains open.
