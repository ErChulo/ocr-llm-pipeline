# Fictional multi-page scanned-PDF OCR acceptance

**Status:** Experimental beta validation. This is not a production OCR accuracy certification.

## Measured GitHub Actions results — 2026-11-08

The [offline `file://` browser run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42488253190) **passed** its provenance and review assertions. Its archived diagnostic JSON reports:

| Page | Exact page-local literals | Same-line age/factor pairs |
| --- | ---: | ---: |
| ALPHA — clear scan | 4/4 | 2/2 |
| BETA — lower contrast, table ruling | 4/4 | 2/2 |
| GAMMA — slightly skewed | 3/4 | 1/2 |
| **Total** | **11/12 (91.67%)** | **5/6 (83.33%)** |

On the skewed page, **age 58 was not recognized**; the corresponding first row-pair failed. There were **zero** detected wrong-page target literals, **three** mandatory original-page review requirements, and **zero** external browser requests. The missed value was *not* automatically reconstructed, corrected or fabricated. This cohort has three pages, not three independent real-world documents.

The [verified source/build run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42488253166) passed **259/259** tests. The [full Playwright and accessibility run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42488253202) passed. In that separate **synthetic text-only real-GGUF** cohort, official Qwen2.5 0.5B again produced **7/8** exact cases, **93.75%** strict micro F1, with **360.637 seconds** elapsed on the model test. Do not combine the text-model and image-OCR denominators.

## Six-page rotated follow-up — observed November 8, 2026

Merged [PR #58](https://github.com/ErChulo/ocr-llm-pipeline/pull/58)
expanded the actual offline Chromium OCR fixture to **six entirely fictional
image-only PDF pages**. Pages 4–6 store counter-rotated raster pixels with
parser-recognized PDF `/Rotate` metadata; pages 1–3 retain the earlier
clear/low-contrast/skew cases unchanged. The
[passing browser CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42495080457)
uploaded `fictional-multipage-scanned-pdf-ocr.json` with these *measured* counts:

| Page | Rotation / scan condition | Exact numeric tokens | Same-line row-pair proxy |
| --- | --- | ---: | ---: |
| 1 | 0°, clear | 4/4 | 2/2 |
| 2 | 0°, low contrast with ruling | 4/4 | 2/2 |
| 3 | 0°, slight skew | 3/4 | 1/2 |
| 4 | 90°, counter-rotated source pixels | 3/4 | 1/2 |
| 5 | 180°, counter-rotated source pixels | 4/4 | 2/2 |
| 6 | 270°, counter-rotated source pixels | 4/4 | 2/2 |
| **Total** | **Six pages** | **22/24 (91.67%)** | **10/12 (83.33%)** |

The unrecognized tokens were fictional age **58** on the skewed page
and **57** on the 90°-rotated page. There were **zero exact wrong-page
target matches**, **six independent original-page review requirements**, and
**zero external browser requests**. The score is not a cell-level provenance
measure: the row-pair test is a same-line string proxy, and no raster glyph
coordinates or spatial cell addresses were generated.

The [source/build run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42495080425)
passed **266/266** tests and produced the single HTML. The
[full offline Playwright acceptance](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42495080432)
and accessibility jobs passed. These runs do not certify real-world OCR,
numeric fidelity, model factual correctness, workstation suitability,
or agency production authorization.

## Nine-page difficult-scan follow-up — observed November 8, 2026

[PR #65](https://github.com/ErChulo/ocr-llm-pipeline/pull/65)
extends the *same fictional image-only PDF* with three independent raster
pages: **small 18–21 px type**, **1.1 px blur with lower-quality JPEG**, and
**denser ruled table with unrelated footnote text**. These are deterministic
stress cases rather than representative real-world OCR prevalence estimates.

The [offline browser run 42501326436](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42501326436)
passed, and its archived `fictional-multipage-scanned-pdf-ocr.json` reports:

| Page(s) | Scan condition | Exact tokens | Same-line pair proxy |
| --- | --- | ---: | ---: |
| 1–6 | Clear, contrast, skew, and 90°/180°/270° rotations | 22/24 | 10/12 |
| 7 | Small typography | 4/4 | 2/2 |
| 8 | Mild blur and JPEG degradation | 4/4 | 2/2 |
| 9 | Ruled table with unrelated note | 4/4 | 2/2 |
| **All nine** | **One fully fictional PDF** | **34/36 (94.44%)** | **16/18 (88.89%)** |

The missed literals **58** (skew) and **57** (90° rotation) remain
unrecognized on pages 3 and 4; they were not reconstructed, guessed or
silently corrected. Exactly **zero** other-page target literal matches,
**nine** original-page review requirements and **zero** outbound Chromium
requests were observed. The original page 9 was openable. Numeric OCR
ambiguity warnings and reviewer acknowledgements do not prove factual
correctness. All table-pair scores are still **text-line proxies**, not
spatially verified cells or field-level evidence precision.

Do not interpret the rise from 22/24 to 34/36 as an accuracy improvement:
three additional, different fictional pages changed the denominator.
Actual small/blurred type can perform much worse, and the sample is tiny.

## Original three-page corpus and provenance

The original offline Chromium smoke test generated one entirely fictional, three-page PDF containing three independent JPEG image XObjects and **no selectable text layer**. No real plan, case, participant, or employee data is included. It exercises:

| PDF page | Fictional contents | Image condition |
| --- | --- | --- |
| 1 | ALPHA, age/factor pairs 55 → 0.8750; 65 → 1.0000 | High-contrast raster |
| 2 | BETA, 60 → 0.8125; 62 → 0.9375 | Reduced-contrast JPEG, table ruling |
| 3 | GAMMA, 58 → 0.9063; 64 → 0.9813 | Slightly skewed raster |

A separate Node/PDF.js source test verifies the same fixture format with real PDF **/Rotate 90** metadata, page count, distinct raster image operations, and a mixed native-heading page. **This does not mean that 90-degree rotated OCR recognition has passed.** The live three-page OCR corpus uses a slight image skew, not PDF /Rotate 90.

## Exact metrics

All cohorts run from the final single-file `file://` HTML and blocks external HTTP(S)/WebSocket requests. The workflow uploads `tmp/fictional-multipage-scanned-pdf-ocr.json`. For each page, the artifact records:

- **Literal recognition**: count of exact expected age and factor tokens within that page's OCR text; denominator **4/page** (**12** in the original cohort; **36** in the nine-page extension). No inference or numeric normalization.
- **Adjacent row pairing**: count of expected age/factor pairs that appear in the same recognized line, separated only by whitespace; denominator **2/page** (**6** original; **18** nine-page). This is an intentionally strict proxy, **not evidence of true spatial cell association**.
- **Wrong-page literals**: exact unique target values appearing under a different parser-derived page label; mandatory assertion of zero. Omitted tokens are not counted as correct.
- **Review/completeness**: require an original-page review issue **for every OCR page**; in the current nine-page extension, original page 9 must be openable. Page citations remain `pdf-page-ocr`, with **no invented glyph/cell bounding boxes**.
- **Privacy/offline**: external request count must remain zero. The JSON diagnostic stores counts and matches only, not PDF bytes or unrestricted document content.

Metrics must be copied from the **actual CI artifact** after the run. A green test proves structural checks passed; it does not imply perfect literal matches or row association. Record low values rather than silently correcting OCR.

## Open production gates

Increase independently generated fictional samples across fonts, skew, rotations, blur, multiple columns, marginal notes, low-contrast scans, and multilingual/handwritten data. Measure cell association against visually annotated ground truth, confidence calibration, error rates and false-positive table associations, page-specific OCR failures, memory consumption, and page-order stability. Compare on actual target offline Windows Chrome/Edge. Model extraction accuracy and actuarial interpretation remain separate benchmarks.
