# Development verification status — 2026-11-08

**Release:** 0.3.0-beta.1. **Not production-ready.** This is a dated, inspectable validation snapshot, not certification or an agency deployment authorization.

## Verified source and browser acceptance

- The reviewed baseline for this follow-up is main commit `3d1e84a03787cf4ccbd3554dcb7a9aa6a33dbccc`. Merged PR #54 added an independent three-page image-only fictional PDF matrix. [Measured offline `file://` results](MULTIPAGE_SCANNED_PDF_QA.md): **11/12** exact page-local literals, **5/6** same-line age/factor pairs, zero wrong-page target matches, three required page reviews, and zero external requests (CI 42488253190). The skewed third page missed age **58**. Row proximity is not verified spatial cell association.

- Latest verified main baseline: `ce0e7a62fef355c1d810b19635147f3fe857fdb5` (PR #58 merged). The [six-page rotated scan matrix](MULTIPAGE_SCANNED_PDF_QA.md) measured **22/24** exact page-local numeric tokens, **10/12** same-line row-pair proxies, and **0** wrong-page target literals. It missed fictional age 58 on the skewed page and age 57 on the 90° rotated page; 180°/270° pages each scored 4/4. These are OCR diagnostics, not spatial cell citations.
- After PR #58, **266/266** source tests and the single-file HTML build passed ([build CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42495080425)); [offline browser smoke](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42495080457) and [full Playwright acceptance](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42495080432) passed with six source-review requirements and zero browser network requests.
- After PR #56, **262/262** source tests passed, TypeScript compile and standalone HTML build passed ([CI run 42489238115](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42489238115)).
- Offline Chromium file URL smoke and full Playwright acceptance passed on the integrated PDF feature branch, with external browser requests blocked.
- Accessibility suite passed; this does not replace testing on the actual approved managed workstation.
- [PR #56](https://github.com/ErChulo/ocr-llm-pipeline/pull/56) extended conservative untrusted-source instruction warnings to multiline directives, invisible-character obfuscation and forged model roles; source tests, [offline browser smoke](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42489238111), and [accessibility](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42489238219) passed. This is a **review warning**, not a prompt-injection sanitizer or proof of resistance.
- Single high-contrast fictional scanned PDF table: 5/5 exact numeric literals recognized by local English OCR. An exact literal does not validate table-cell pairing, interpretations, or legal applicability. Every OCR page requires original-file review.
- Three deterministic single-page fictional physical scans (baseline, low contrast, skew/speckling) each measured **5/5** exact numeric literals in offline Chromium, separately from the new multi-page cohort. Browser artifacts preserve the observed counts; none certify table-cell pairing.

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
