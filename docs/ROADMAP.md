# Roadmap — beta validation

**Version:** 0.3.0-beta.1. CI verification is not security certification or workplace approval.

## Implemented and source-tested

- [x] Standalone bundled HTML under `file://`, local GGUF and WebAssembly worker.
- [x] Small GGUF real-browser load and text generation with zero external requests.
- [x] PDF text and scanned page OCR; English image OCR; DOCX, XLSX, CSV and text import.
- [x] Synthetic PDF, scanned PDF, image OCR, DOCX, XLSX, CSV browser acceptance on local HTML.
- [x] Source offsets and actual parser-derived PDF page, DOCX paragraph/table, XLSX sheet/cell and CSV row/column references.
- [x] JSON Schema validation, bounded sectioning, exact source coverage, Unicode/numeric section-boundary safeguards and conflict review with original-source excerpts for competing values; reviewer must decide which plan provision applies.
- [x] Mandatory field-level *candidate text evidence* confirmation before export; model-originated values are checked only against their source sections, numeric and lexical tokens require complete boundaries, and reviewers may supply an exact supporting passage for interpreted/boolean fields. Passage existence never establishes factual correctness.
- [x] Source identity check, original file SHA-256, and fail-closed export validation.
- [x] Sequential all-or-nothing multi-file import with session-level document, text, byte and duplicate-identity limits; browser acceptance covers rollback and success.
- [x] Conservative possible-SSN/email/phone/payment-card screening and acknowledgement.
- [x] User-chosen dark/white logo pair, theme toggle, app routes and printable Guide.
- [x] Optional eight-case built-in fictional model benchmark with strict field scores, per-case status, elapsed time and downloadable JSON. The app and source tests share one canonical fictional corpus; actual full eight-case GGUF scores still need measurement on representative hardware.
- [x] Real instruction-tuned Qwen2.5-0.5B GGUF: four of four known-answer fields and end-to-end TXT → JSON → source review → export passed under `file://` with zero network requests ([verified CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42248309834)).

## Remaining production gates — not yet accepted

- [x] Official Qwen2.5-1.5B-Instruct Q4_K_M: successful local file URL inference and full JSON export; **3/4** known-answer score ([CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42281102968)).
- [x] Five-case synthetic pension corpus, real 0.5B GGUF: **90% micro exact precision/recall/F1**, 4/5 entirely exact; sole discrepancy was equivalent date notation ([CI 42371798989](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42371798989)).
- [ ] Broader adversarial accuracy, precision/recall, cross-document applicability, context overflow, latency and RAM on 0.5B/1.5B/3B. A separate, checksum-verified real 0.5B eight-case CI benchmark now provides an additional reproducible measurement. A bounded two-retry context-overflow fallback has source tests; 3B end-to-end extraction has repeatedly timed out and still needs real-model testing.
- [ ] Manual offline verification on the authorized managed PBGC Windows Chrome/Edge workstation.
- [x] Implement original PDF page viewer and approximate PDF.js text-item evidence overlays; browser verification tracked separately.
- [x] Mixed PDF raster/text pages now trigger a **required original-source acknowledgement** before JSON export.
- [x] Optional whole-page supplemental OCR on mixed raster/text pages, retaining native PDF.js text separately and requiring original-page review; separate evidence and correction records are tested in browser.
- [x] Geometry-based review gate flags suspicious PDF column jumps, table-like wide gaps, reading-order reversals and rotated text; synthetic tests and browser review cover examples.
- [ ] Precise image-region isolation, OCR deduplication, cross-column reading-order recovery and exact glyph/quoted-substring highlights remain open.
- [x] Human-editable OCR transcription with original-file fingerprint and page provenance preserved; correction invalidates prior extraction review.
- [x] All scanned PDF pages and images now require original-source review, regardless of confidence; image originals can be viewed locally. Corrections reset prior acknowledgement.
- [ ] OCR confidence visualization, larger multilingual corpus, handwriting, varied scans, multipage layouts and columns.
- [ ] Thorough DOCX/XLSX layout and fidelity checks: headers/footers, tracked changes, dates/styles, formulas, merged cells, comments, embedded graphics. **Partial source implementation:** DOCX tracked-revision visibility, direct hidden text, content controls and altChunk review safeguards; XLSX date-style alerts, missing formula caches, cell errors, hidden content, merged ranges, chartsheets, comments, external data/link omissions, and malicious sheet relationship rejection have targeted regression tests. Real-file visual fidelity verification remains open.
- [ ] Factual verification beyond literal text matches; full cross-document conflict resolution, no silent assumptions.
- [ ] Comprehensive PII handling, redaction/export security, threat modeling and independent agency review.
- [ ] Full accessibility/keyboard/printable guide acceptance; verify PDF print output and ASD-STE100-inspired language.
- [x] Bounded iterative XML traversal for DOCX/XLSX; reject deeply nested or excessive XML nodes. Synthetic hostile files covered by regression tests.
- [x] Direct dependencies exact-pinned; transitive `package-lock.json` committed; CI uses `npm ci` to reject drift.
- [ ] Independent supply-chain audit of dependencies and worker assets before production; lockfile updates are manual, not silent.
- [ ] Optional Impeccable design review on development machine, not in workplace runtime.
- [ ] Optional PWA build (requires HTTPS/security context distinct from mandatory `file://` mode).
- [ ] Restartable indexing and batch support for very large documents beyond current 256 section limit.

## Boundaries

The repository does not change `ErChulo/bulk-ocr-studio`. CI fixtures contain no real participant data. Keep GGUF weights separate from Git. A passing JSON Schema or manually approved quote is **not proof** that a pension provision was interpreted correctly.

## Known file limits

Individual inputs are bounded to 20 MB; PDF page limit is 300, extracted PDF text 2 million characters, OCR canvas 5 million pixels, source extraction at most 256 sections. Some image-rich or unusually large files are therefore intentionally rejected rather than partially accepted.

## Schema-validation hardening

- [x] Replaced runtime JavaScript-code-generating Ajv validation with a CSP-safe interpreted validator.
- [x] Block external JSON Schema references, dynamic anchors, unsupported dialects and regex rules; enforce bounded schema complexity.
- [x] Add user-triggered offline schema preflight; browser tests exercise valid and malicious schemas under `file://`.
- [ ] Revisit safe schema pattern handling with a regex engine that cannot cause exponential backtracking and formal security review.
