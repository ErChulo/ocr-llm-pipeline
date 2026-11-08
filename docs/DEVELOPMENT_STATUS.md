# Development verification status — 2026-11-08

**Release:** 0.3.0-beta.1. **Not production-ready.** This is a dated, inspectable validation snapshot, not certification or an agency deployment authorization.

## Verified source and browser acceptance

- The reviewed baseline for this follow-up is main commit `3d1e84a03787cf4ccbd3554dcb7a9aa6a33dbccc`. PR #54 adds an independent three-page, image-only fictional PDF matrix. Its new per-page literal, adjacent-row and wrong-page diagnostics must be read from the [actual offline-browser artifact](MULTIPAGE_SCANNED_PDF_QA.md); no improvement or production acceptance is inferred from adding a test.


- Main baseline before this scan-matrix branch: e7199df40951c10e837788c1ee928b6dcfea9e0b (PDF annotation reviews and compact-table geometry).
- Baseline source CI: **256/256** passing, TypeScript compile and standalone HTML build passing.
- Offline Chromium file URL smoke and full Playwright acceptance passed on the integrated PDF feature branch, with external browser requests blocked.
- Accessibility suite passed; this does not replace testing on the actual approved managed workstation.
- Single high-contrast fictional scanned PDF table: 5/5 exact numeric literals recognized by local English OCR. An exact literal does not validate table-cell pairing, interpretations, or legal applicability. Every OCR page requires original-file review.
- This branch adds two deterministic, fictional physical scan variations: low-contrast JPEG and slightly skewed/speckled JPEG. Their **observed** per-fixture counts are published by the offline browser workflow as fictional-scanned-pdf-ocr.json. Never replace absent results with assumed scores.

## Separate real-GGUF cohorts — not interchangeable

- Real Qwen2.5 0.5B on the **eight-case synthetic text corpus**, recorded in verified CI on 2026-11-08: 7/8 exact cases, 15 true positives, one false positive, one false negative; strict micro F1 **93.75%**. Diagnostic only.
- Independent **physical-document** fictional eight-file holdout (PDF, DOCX, XLSX and CSV): 0.5B **16/18 exact fields** (88.89%), **6/8** exact cases; 1.5B **17/18 exact fields** (94.44%), **7/8** exact cases. Both chose an injected CSV value of 99 instead of the authentic plan age 65. Source-location diagnostics revealed the factual citation failure. See [physical holdout](PHYSICAL_HOLDOUT_BENCHMARK.md).
- These results are from different cohorts and cannot be combined or interpreted as general field precision/recall on actual plan documents.

## Unpassed production acceptance gates

1. Broader fictional scanned-PDF corpus including rotated pages, table gridlines, small/blurred type, challenging contrast, multi-page image-only scans and mixed raster/native content; report numeric errors and table association, not merely a document-wide token match.
2. Independent original-document review of geometric reading order, omitted annotation/form values, OCR duplication, and exact evidence-source consistency.
3. Reproduce 0.5B/1.5B/3B physical-document inference and report prompt-injection errors, abstention, speed and memory under representative device constraints.
4. Run actual **offline file://** acceptance on an authorized managed Windows Chrome/Edge workstation; CI on a networked runner with browser requests blocked is not equivalent.
5. Independent privacy, source-security, supply-chain, accessibility and actuarial-interpretation reviews. Model-valid JSON and reviewer acknowledgements do not prove factual correctness.

No PBGC participant or case data is permitted in tests or the repository. ErChulo/bulk-ocr-studio must remain unchanged.
