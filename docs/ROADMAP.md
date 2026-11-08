# Roadmap — beta validation

**Version:** 0.3.0-beta.1. CI verification is not security certification or workplace approval.

## Implemented and source-tested

- [x] At final export, match every parser-derived source-warning ID to an explicit reviewer acknowledgment; stale UI counts, forged/duplicate warning IDs and a missing AI-instruction warning fail closed.

- [x] Prompt-like instructions embedded in PDF, Office, CSV, OCR or local text now add an explicit original-source review issue; import, supplemental OCR and corrected OCR paths invalidate previous review state. Text, citations and model answers are never silently rewritten. Detector is deliberately conservative, not comprehensive injection prevention.

- [x] Independent eight-case **physical** fictional pension holdout includes PDF multi-page amendments and columns, DOCX tables/survivors, XLSX hidden rows/percentage fidelity and CSV dates/instruction injection. Each annotated fact and location is checked against the actual parser; diagnostic evidence is never treated as reviewer approval. [Methodology](PHYSICAL_HOLDOUT_BENCHMARK.md). A separate real-GGUF file:// benchmark is experimental; scores must not be inferred from previous text-only tests.

- [x] OOXML namespace-confusion tests: foreign XML elements cannot impersonate Word paragraphs, worksheet cells, cell content, or workbook relationships. Excel cells require authentic worksheet data-row ancestry and consistent explicit row coordinates; malformed source locations are rejected.

- [x] Fail closed on adversarial Office ZIP duplicate member names, Excel worksheet-name/ID/part/relationship collisions, duplicated cell references, and out-of-bounds cell addresses. Synthetic ZIP/OOXML regressions protect source-coordinate uniqueness and prevent conflicting values appearing under one citation.

- [x] Adversarial DOCX and XLSX fixtures now distinguish native paragraph/cell text from omitted drawing/textbox and phonetic annotation content, including header-origin material. Source review remains mandatory for omitted content.

- [x] Source-level adversarial extraction tests for duplicate JSON members, percent-value ambiguity, conflicting amendments, injected instructions and citation boundaries. Percentage notation restoration is source-scoped and audited, not an actuarial inference or measured GGUF accuracy improvement.

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
- [x] Optional eight-case built-in fictional model benchmark with strict field scores, per-case status, elapsed time and downloadable JSON. The app and source tests share one canonical fictional corpus; the 0.5B eight-case GGUF run has been measured in CI, but representative PBGC workstation testing is outstanding.
- [x] GGUF preflight validates non-empty parts, split continuity and the browser 2 GiB per-part limit. The model test now displays actual first-text latency and end-to-end character throughput; 3B speed feasibility remains unproven on `file://` and cannot be inferred from these metrics alone.
- [x] Real instruction-tuned Qwen2.5-0.5B GGUF: four of four known-answer fields and end-to-end TXT → JSON → source review → export passed under `file://` with zero network requests ([verified CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42248309834)).

- [x] Measured source-anchored date restoration on the actual offline eight-case fictional corpus: Qwen 0.5B **93.75% pipeline strict micro F1 and 7/8 exact** ([run 42422220985](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42422220985)); Qwen 1.5B **100% pipeline strict micro F1 and 8/8 exact** ([run 42422221025](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42422221025)). These are post-processing results, not raw-model accuracy or production acceptance.
- [x] Candidate-level date presentation repair only when there is exactly one corroborating unambiguous source literal within that model section. Preserve original model output and prompt for human evidence review; no application of actuarial rules or arbitrary date interpretation.

## Remaining production gates — not yet accepted

- [x] Independent real-GGUF physical-document holdout completed: 0.5B strict F1 **88.89%** (16/18, 6/8 exact), 1.5B **94.44%** (17/18, 7/8 exact), zero Chromium network requests. Both models incorrectly selected age 99 from a malicious CSV appendix rather than governing age 65; 0.5B also omitted a survivor condition. See [measured physical holdout](PHYSICAL_HOLDOUT_BENCHMARK.md). This is a separate cohort from the original eight text-only cases and **not** production acceptance.

- [x] Controlled eligibility-prompt trial rejected: 0.5B regressed from 93.75% to 87.5% strict micro F1 (7/8 to 6/8 exact); 1.5B remained 100%. Previous prompt preserved in main. See [decision record](REAL_CORPUS_BENCHMARK.md) and [closed PR #43](https://github.com/ErChulo/ocr-llm-pipeline/pull/43).

- [x] Real eight-case official Qwen2.5-1.5B-Instruct Q4_K_M: **87.5% strict micro F1, 6/8 exact**, 286.1 s, no network requests; both incorrect fields were reworded dates ([CI run 42420311141](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42420311141)). This does not meet unattended release acceptance.
- [x] Official Qwen2.5-1.5B-Instruct Q4_K_M: successful local file URL inference and full JSON export; **3/4** known-answer score ([CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42281102968)).
- [x] Five-case synthetic pension corpus, real 0.5B GGUF: **90% micro exact precision/recall/F1**, 4/5 entirely exact; sole discrepancy was equivalent date notation ([CI 42371798989](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42371798989)).
- [x] Actual 0.5B GGUF eight-case prompt benchmark improved strict micro F1 from **68.75% to 87.5%** and exact cases from **4/8 to 6/8**, while still failing exact date wording and complete survivor-condition extraction ([CI run 42420035489](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42420035489)). Not production accepted.
- [x] Extraction prompts now require minimal verbatim source values for dates, conditions and benefit forms; synthetic source tests protect the instruction. Independent model accuracy results must still determine whether the change is beneficial.
- [x] Structured JSON extraction now uses greedy sampling (temperature 0, top-p 1) independently of chat, reducing avoidable sampling variation. Quality must still be measured and reviewed on an actual model.
- [x] Bounded **real** 3B load/four-field benchmark: model loaded in 7.4 s, first output after 73.2 s, **1.3 characters/s**, 3/4 correct, zero network requests ([CI 42421447866](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42421447866)). **Full 3B document extraction/export remains unsupported as a verified production path**; long extraction previously exceeded 420 s.
- [ ] Broader adversarial accuracy, precision/recall, cross-document applicability, context overflow, latency and RAM on 0.5B/1.5B/3B. **Measured 0.5B eight-case benchmark: 75% strict micro F1, 4/8 exact, 392.8s, zero browser network** ([CI 42408879295](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42408879295)); larger models and representative source validation remain open. A separate, checksum-verified real 0.5B eight-case CI benchmark now provides an additional reproducible measurement. A bounded two-retry context-overflow fallback has source tests; 3B end-to-end extraction has repeatedly timed out and still needs real-model testing.
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
