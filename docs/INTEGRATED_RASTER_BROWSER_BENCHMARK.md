# Integrated twelve-page raster acceptance experiment

**November 9 additional deployed orientation regression, merged PR #119:** A *different*, fixed three-page original-JPEG cohort embedded 90°, 180° and 270° pixel rotations in PDFs with no `/Rotate` metadata and ran through the same actual standalone `file://` application. Measured **12/12** numeric literal recoveries, **6/6** original-visual-cell-ROI-corroborated Tesseract pairs, zero FP, zero wrong-page and zero outbound browser requests; source review remained mandatory ([offline CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42724087277)). These denominators belong only to the three-page regression, **not** to the twelve-page integrated benchmark or raw original-JPEG cohort.


**Release remains `0.3.0-beta.1`. This development benchmark never certifies production or office authorization.**

## Question

Does the **actual, standalone, offline file:// application** retain the parser-derived PDF pages and correctly measured pixel envelopes when it imports the same twelve original-JPEG raster PDF pages already covered by the independent raw Tesseract benchmark?

The raw original-JPEG benchmark (not deployed application) found **16/22** eligible spatial associations, zero observed false matches, because raw OCR could not recognize six rotated pairs. Separate standalone orientation-selector experiments recovered **6/6** on three rotated pages. Those measurements must not be combined without testing the app that users actually run.

## Verified fixed-fixture result (PR #110, Nov 8, 2026)

- Before the correction, the actual single-file app accepted an incorrect observed age **585** for a printed age **55** on page 1 after a high-resolution PDF.js OCR render. Measured result: **21/22 TP, 1 FP, 1 FN, 47/48 exact numeric literals**. This is a genuine source transcription defect, not a mistaken table reference.
- The revised algorithm refuses AGE cells above 125 and may use an independently measured, bounded lower-resolution OCR pass **only** when it uniquely replaces the implausible age while preserving every other valid row and the exact associated factor. Otherwise it abstains and requires original-page human review.
- On that same twelve-page fictional, non-blinded PDF, the shipped offline `file://` application measured **22/22 TP; 0 FP, 0 FN, 0 wrong-page; 48/48 exact numeric literals; 1/1 required ambiguous-column abstention; and 0 runtime network requests** ([CI evidence](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42554052994)).
- The separate uncorrected original-JPEG raw Tesseract benchmark remains **16/22 TP (72.73% recall)**. The improved 22/22 figure is the **deployed application's corrected-raster development result**, not a revised raw OCR score or a representative precision estimate.
- Source and build tests: **362/362 passed**. Actual Qwen 0.5B quality remains **7/8 exact cases**, strict micro F1 **93.75%**, without adversarial authority certification ([CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42554052982)). All mandatory production gates remain open.

## Reproducible method

1. `tests/stratified-raster-benchmark.mjs` independently authors 12 entirely fictional images, embeds their original JPEG bytes into a parser-valid, image-only PDF and writes `tmp/stratified-raster-original.pdf`. Original authored cell rectangles are the ground truth; OCR cannot see the answers or their rectangles.
2. Build and open the actual shipped `dist/index.html` under `file://` in Chromium, with every outgoing network request intercepted and blocked.
3. Import exactly that PDF through the application's ordinary file picker and await all 12 PDF parser page records; **do not** inject OCR text, box coordinates, an alternate orientation choice or fixture-derived values into the application.
4. Read each application's unverified `ocrSpatial` diagnostic from the rendered user interface. Score measured word boxes against **independently authored** original image regions after normalizing between the actual renderer's pixel dimensions and the original JPEG's geometry. Score age and factor transcription on the correct parser page, not merely anywhere in the file.
5. Report TP, FP, FN, wrong-page associations, exact numeric tokens (numerator/denominator), explicitly required ambiguous-column abstentions, and outbound request count. A false or missing association makes CI fail. The parser's actual original page numbers and underlying Tesseract measurements must be preserved.
6. Never treat any diagnostic rectangle or literal as an accepted factual citation. Source authority, numeric truth, and governing provisions still require independent human verification.

## Acceptance for this controlled experiment

- The expected eligible reference count is 22 (24 authored rows minus two rows intentionally excluded for intervening numeric-column ambiguity).
- **22/22** source-coordinate-corroborated eligible row pairs, zero false associations, zero wrong-page pairs, and mandatory abstention on the intervening service-column page.
- **48/48** fictional numeric tokens present on their own parser pages, zero HTTP(S)/WebSocket requests, no runtime download, no silent correction.
- Log all per-page conditions, actual model-free OCR statuses and source-pixel coordinate precision.

A failure is actionable evidence about the deployment path, not permission to loosen an accuracy constraint. Passing would establish only this *known development fixture*; the 500-page blinded, independent corpus, controlled source authority, and authorized Windows workplace acceptance remain outstanding.

## CI

[Integrated twelve-page offline application OCR verification](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/integrated-raster-browser.yml).

Output artifacts contain fictional-only aggregate and per-page JSON reports. They do not contain PBGC data or a model file.
