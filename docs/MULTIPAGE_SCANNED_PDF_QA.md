# Fictional multi-page scanned-PDF OCR acceptance

**Status:** Experimental beta validation. This is not a production OCR accuracy certification.

## Corpus and provenance

The offline Chromium smoke test generates one entirely fictional, three-page PDF containing three independent JPEG image XObjects and **no selectable text layer**. No real plan, case, participant, or employee data is included. It exercises:

| PDF page | Fictional contents | Image condition |
| --- | --- | --- |
| 1 | ALPHA, age/factor pairs 55 → 0.8750; 65 → 1.0000 | High-contrast raster |
| 2 | BETA, 60 → 0.8125; 62 → 0.9375 | Reduced-contrast JPEG, table ruling |
| 3 | GAMMA, 58 → 0.9063; 64 → 0.9813 | Slightly skewed raster |

A separate Node/PDF.js source test verifies the same fixture format with real PDF **/Rotate 90** metadata, page count, distinct raster image operations, and a mixed native-heading page. **This does not mean that 90-degree rotated OCR recognition has passed.** The live three-page OCR corpus uses a slight image skew, not PDF /Rotate 90.

## Exact metrics

The browser runs from the final single-file `file://` HTML and blocks external HTTP(S)/WebSocket requests. The workflow uploads `tmp/fictional-multipage-scanned-pdf-ocr.json`. For each page, the artifact records:

- **Literal recognition**: count of exact expected age and factor tokens within that page's OCR text; denominator **4/page**, **12 total**. No inference or numeric normalization.
- **Adjacent row pairing**: count of expected age/factor pairs that appear in the same recognized line, separated only by whitespace; denominator **2/page**, **6 total**. This is an intentionally strict proxy, **not evidence of true spatial cell association**.
- **Wrong-page literals**: exact unique target values appearing under a different parser-derived page label; mandatory assertion of zero. Omitted tokens are not counted as correct.
- **Review/completeness**: require an original-page review issue **for each of the 3 pages**; original page 3 must be openable. Page citations remain `pdf-page-ocr`, with **no invented glyph/cell bounding boxes**.
- **Privacy/offline**: external request count must remain zero. The JSON diagnostic stores counts and matches only, not PDF bytes or unrestricted document content.

Metrics must be copied from the **actual CI artifact** after the run. A green test proves structural checks passed; it does not imply 12/12 literal matches or 6/6 row matches. Record low values rather than silently correcting OCR.

## Open production gates

Increase independently generated fictional samples across fonts, skew, rotations, blur, multiple columns, marginal notes, low-contrast scans, and multilingual/handwritten data. Measure cell association against visually annotated ground truth, confidence calibration, error rates and false-positive table associations, page-specific OCR failures, memory consumption, and page-order stability. Compare on actual target offline Windows Chrome/Edge. Model extraction accuracy and actuarial interpretation remain separate benchmarks.
