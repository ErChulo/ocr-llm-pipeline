# Changelog

## Unreleased — Reliability and source-safety safeguards

- **Verified November 8, 2026:** merged PRs [#58](https://github.com/ErChulo/ocr-llm-pipeline/pull/58) and [#59](https://github.com/ErChulo/ocr-llm-pipeline/pull/59) after passing source/build, offline browser and real-GGUF CI checks. The integrated pull-request build passed **271/271** source tests. Six-page fictional rotated scan PDF OCR: **22/24 exact numeric literals**, **10/12 same-line row-pair proxies**, **zero wrong-page matches**. These are unverified OCR transcription diagnostics, not table-cell citations.
- Verified Qwen2.5 Q4_K_M real-model adversarial two-document extraction sweep (0.5B/1.5B/3B): **1/3**, **2/3**, **1/3** strict exact fields, respectively, under local `file://` with zero external requests. **All three erroneously chose age 99** from a malicious CSV quote instead of governing fictional age 65. 3B retained the survivor qualifier but failed strict verbatim phrasing. The complete eight-document physical holdout rerun retained 0.5B **16/18** and 1.5B **17/18** exact fields; do not pool the cohorts or claim unattended factual accuracy.
- Merged [PR #60](https://github.com/ErChulo/ocr-llm-pipeline/pull/60): warning for forged standalone multiline `SYSTEM`/`DEVELOPER` headings with extraction instructions, including zero-width obfuscation, while preserving original source bytes and offsets. This is a warning plus reviewer gate, **not** demonstrated prompt-injection prevention. [PR #61](https://github.com/ErChulo/ocr-llm-pipeline/pull/61) archived the measured rotated-scan OCR evidence. Release remains `0.3.0-beta.1`.

- Extend the conservative source-instruction warning to detect multiline AI-directed overrides, zero-width-character obfuscation, model role delimiters and role-spoofing headings. Normalize a temporary scan view only: original source text, offsets, fingerprints and extracted evidence are never rewritten. Add adversarial positives, benign pension-rule negatives and a fail-closed export regression. Detection still does not prove model resistance to prompt injection.

- Add a three-page, image-only fictional PDF OCR validation matrix in the offline browser, recording parser-derived page attribution, per-page exact literals, same-row age/factor pairing, wrong-page conflicts, and three independent original-page review requirements. Add a PDF.js source fixture that tests real /Rotate 90 metadata, native-versus-raster content and failure on missing OCR. Measured offline Chromium results: **11/12** page-local exact literals, **5/6** same-line age/factor pairs, zero wrong-page matches and zero network requests (CI 42488253190). The skewed page missed age **58**. Source/build **259/259**, full Playwright and accessibility passed; separate real Qwen 0.5B model output remained **93.75%** strict micro F1 (7/8 exact, 360.637 seconds). See archived JSON diagnostic; none of these results certify spatial cell accuracy or production readiness. See [benchmark method](docs/MULTIPAGE_SCANNED_PDF_QA.md).


- Expand the scanned-PDF Playwright OCR benchmark with deterministic fictional low-contrast and skewed-speckled JPEG conditions. Preserve the original page-review requirement and log all measured exact-token counts, not assumed accuracy; publish dated beta status and outstanding release gates.

- Recognize aligned compact PDF table rows that wide-gap detection missed; preserve exact text and page/citation provenance, require original-page review and add adversarial geometry tests. Record a separate entirely fictional raster-table OCR diagnostic in offline Playwright (unverified transcript; not an accuracy certification). Rebase older PR #51 on current PDF annotation and export gates.

- Flag omitted PDF annotations and form widgets for mandatory original-file inspection, excluding their values from native page text citations. Synthetic FreeText/AcroForm/link fixtures and offline Playwright checks cover this source completeness hazard; rebase a previously passing but outdated PR on current source safety gates.

- Final JSON export independently checks each current source-completeness warning ID against reviewer acknowledgements. Reject stale zero counts, malformed/duplicated warning identities, and unregistered embedded AI instruction risks; expand adversarial export-gate tests.

- Measure the independent eight-case physical PDF/DOCX/XLSX/CSV corpus with official offline GGUFs: Qwen 0.5B 88.89% strict F1, 6/8 exact; Qwen 1.5B 94.44%, 7/8 exact. Both models incorrectly followed an embedded CSV instruction-like appendix for normal age 99; separate source-location diagnostics revealed the wrong citation. Document a source-warning mitigation, model limitations, and zero browser network requests. Add Playwright verification that instruction acknowledgements are per-document.

- Add an offline untrusted-source instruction warning after document imports and OCR revisions. A fictional real-GGUF holdout chose age 99 from an instruction-like CSV appendix instead of the authentic plan age 65; a literal match was not a factual match. The app now requires the reviewer to inspect instruction-like source passages before export, without silently changing or deleting document text, evidence, or model output. This is a conservative heuristic, not prompt-injection prevention or actuarial verification.

- Add a separate eight-case **physical-document** fictional holdout and a checksum-verified offline 0.5B GGUF CI workflow. Cases exercise actual PDF/DOCX/XLSX/CSV import, numeric and date accuracy, conflicting amendments, two columns, hidden spreadsheet rows, survivor clauses and prompt injection. Report exact-field scores independently of parser-authentic source-location diagnostics; original text-only corpus and production acceptance remain unchanged.

- Benchmarked and **rejected** an eligibility-condition prompt expansion: 0.5B real offline eight-case accuracy fell from 93.75% to 87.5% strict micro F1. 1.5B remained at 100% without a gain. The previous prompt remains unchanged; see the documented measured regression.

- Harden OOXML source-location fidelity against namespace spoofing: reject non-spreadsheet elements masquerading as Excel cells, values or relationship metadata; do not treat foreign XML blocks as Word paragraphs, and disclose omitted foreign content for review. Reject orphaned Excel cells and row/cell-address discrepancies.

- Reject duplicate ZIP part names and ambiguous XLSX identities (duplicate sheet names/IDs, worksheet relationships/parts, repeated cell references). Reject column/row addresses outside Excel's official 16,384 by 1,048,576 worksheet grid. These are provenance-integrity checks; they do not validate actuarial correctness.

- Prevent DOCX drawing/textbox/OLE text and foreign-namespace text runs from being silently presented as ordinary paragraph evidence. Detect unprocessed graphics across document, header/footer and notes; require original-file acknowledgement.
- Exclude Excel phonetic annotations from visible shared-string and inline-string values and require original-workbook review. Synthetic OOXML tests cover ambiguous visual and cell-source content.

- Reject conflicting or escaped duplicate keys in model-generated JSON rather than silently accepting the last value. Add deterministic adversarial tests.
- Restore the exact original percentage spelling only from one unambiguous equivalent decimal percentage literal in the same model source section, retaining the model value in the audit and requiring manual source confirmation. No real-model quality improvement is claimed without measurement.

- Extend final privacy review to the exported document ID and filename. These metadata fields can contain identifiers even when source text and the extracted JSON are otherwise clean; unit tests confirm fail-closed handling without leaking matched values.

- Verify PDF text-item evidence boxes at final JSON export against the parser's overlapping text spans; reject shifted/forged rectangles, missing overlays, and invented PDF geometry for plain-text/CSV sources. Boxes remain approximate PDF.js text-item envelopes, not precise character highlights.

- Revalidate selected field citations against the current source record, actual character offsets, exact excerpt, parser-derived location and full-token value at every export. Reject stale or fabricated citation metadata, including incorrectly cited CSV cell labels. Human source verification remains required.

- Bind export-time evidence review to current JSON leaf paths and values; reject stale, substituted, added, removed, or duplicate confirmations.
- Screen both the imported source and the current JSON for possible identifiers, fail closed if output-only identifiers are discovered at export, and expire privacy acknowledgement whenever candidate JSON is edited or revalidated. This remains a limited local warning, not comprehensive PII detection or redaction.

- Measured the source-date restoration pipeline under real offline Chromium with verified GGUFs: 0.5B strict F1 **93.75%** (7/8 exact) and 1.5B **100%** (8/8 exact), zero browser network requests, on the eight fictional cases. Results describe the pipeline after source-based corrections, not raw model quality or production actuarial acceptance.

- Add narrow, auditable source-date presentation restoration: a model ISO or punctuated date may be replaced by the unique exact unambiguous date literal from the same source section, with the original model value retained and original-document review still mandatory. Conflicting wording, ambiguous formats, mismatched dates and cross-section dates never rewrite facts.
- Add negative tests for unrelated date sources, malformed calendars, conflicting source representations and non-date fields; benchmark on real Qwen before any score claim.

- Real bounded 3B benchmark passed: 7.4 s loading, 73.2 s until first text, 1.3 characters/s, 3/4 synthetic facts, no browser network ([CI 42421447866](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42421447866)). Long full-document extraction remains unverified and a release blocker for any advertised 3B support.
- Add a separately scoped real Qwen2.5-3B load/generation benchmark under `file://` with official SHA-256 and zero outbound requests. The new `MODEL_TEST_SCOPE=quality_only` path isolates loading/small inference from long full-document extraction; an explicit bounded test timeout prevents indefinite runs. Full 3B extraction acceptance remains open.

- Measured the real offline 0.5B Qwen eight-case corpus after verbatim prompt refinement: 87.5% strict micro F1, six of eight exact, zero external browser requests. Two remaining errors concern date-string normalization and missing a qualifying condition ([CI 42420035489](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42420035489)); no claim of production accuracy.
- Instruct JSON extraction to copy short, verbatim field values, preserve source date/percentage notation, and avoid whole-sentence answers for eligibility conditions; increase conservative prompt-context overhead. Strict benchmark evaluation is required before claiming any accuracy gain.
- Use deterministic sampling for structured factual JSON extraction, independent of chat defaults: temperature 0, top-p 1. This reduces random sampling variance but does not guarantee correct answers or identical results on different systems.
- Add invariant and UI-wiring tests; benchmark existing eight-case fictional Qwen extraction without modifying expected ground truths.

- Validate selected local GGUF segments before entering WebAssembly: fail closed on invalid, duplicate, incomplete or oversized split parts (2 GiB per part); surface the enforced CPU single-thread/no-GPU limitation for large models.
- Measure streaming first-text latency, wall-clock completion time and end-to-end character throughput in the actual local model self-test and synthetic extraction check. Character throughput is not a token-rate claim; 3B timeout diagnosis remains open.
- Add tests for GGUF part admission and deterministic timing plus an offline Chromium assertion that model performance metrics are visible.

- Record measured actual Qwen2.5-0.5B eight-case offline benchmark: 75% strict micro field precision/recall/F1, four of eight fully exact, 392.8 seconds, no browser network calls. Document observed date reformatting, normal-form extraction error, and conditional phrasing mismatch. This is below unattended production acceptance.

- Harden DOCX/XLSX XML parsing against deeply nested document structures with iterative 128-depth/500,000-node traversal limits and regression fixtures. Passing tests are defense-in-depth, not a comprehensive security audit.

- Add a separate eight-case real-GGUF accuracy workflow that checks official Qwen model SHA-256, tests the standalone offline Chromium app and records measured fictional-case quality. The historical five-case baseline remains separately reproducible; no unmeasured eight-case score is claimed.

- Add an opt-in eight-case GGUF accuracy benchmark under Settings, running entirely on the local workstation with fictional source text. Measure strict-field precision, recall, F1, case completeness, generation failures and elapsed time; save synthetic-only JSON results.
- Centralize the fictional pension corpus for UI and CI, preventing evaluation fixture drift. Add unit tests for exact scoring, adversarial source handling, cancellation and runtime failure. A passing stub test is not an actual GGUF accuracy result.

- Detect potentially ambiguous native-PDF reading order from PDF.js text-item geometry, including wide tabular gaps, reverse item placement, column restarts, and rotation. Require original-PDF page review before JSON export without fabricating coordinates or claiming to reconstruct tables.
- Add synthetic geometry tests and offline Chromium acceptance using a two-column PDF fixture.

- Add explicit supplemental English OCR for PDF pages containing both selectable text and raster images. Keep native text and OCR transcription in separate records with authentic page numbers; never ascribe OCR text to PDF.js-native text-item geometry.
- Require original-page review after the optional OCR pass; preserve the original input fingerprint and invalidate existing extractions. Corrected OCR text remains separately editable. Add browser acceptance and regression tests.
- Full-page OCR can repeat native text and is not automatic image-region isolation; accurate reconstruction of complex tables and columns remains a production gate.

- Replace concurrent batch import with a sequential, transactional importer: at most 20 chosen files, 200 session documents, 4 million extracted characters and 80 MB source files. Reject duplicate document names or IDs. On any failure, the existing session remains unchanged.
- Add deterministic batch quota/identity/atomicity tests and an offline browser rollback/success test. Limits are deliberately conservative for managed offline workstations.

- Detect hidden worksheets and nonempty hidden rows, hidden column ranges, and merged cell ranges. Require original-workbook review before JSON export.
- Flag external links, connections, query and pivot caches whose data are not refreshed by the offline importer.
- Handle absolute internal OOXML worksheet targets, reject remote or traversal targets, and skip chartsheets with explicit omitted-content review.
- Add synthetic regression cases for all of the above. This source change is not a claim of a completed CI run or production acceptance.
- Bound imported Bulk OCR JSON/JSONC to 200 documents, 2 million characters per document and 4 million per batch; reject blank sources and duplicate IDs. Validate supplied byte counts and require bounded local TXT/MD imports.
- Add importer boundary tests; automated acceptance status is tracked by the build workflow.


- Interpret DOCX text in final-revision view: exclude deleted and moved-from runs; include inserted and moved-to text; detect directly hidden runs. Require review of any tracked revisions or hidden text.
- Traverse top-level DOCX content controls and custom XML wrappers in reading order; reject embedded alternate content in every included Word part, including footnotes.
- Add synthetic tests for all behaviors. Passing source tests does not certify Word layout or tracked-revision interpretation in actual production files.

- Tighten literal numeric evidence to distinguish positive and negative values, numeric strings, grouped amounts, scientific notation, and alphanumeric codes; reviewer-supplied source quotations remain possible for nonliteral interpretations.
- Add deterministic numeric-boundary regression tests; literal matching is not independent actuarial verification.

- Make original-source acknowledgement mandatory for **all** OCR pages and images, regardless of recognizer confidence. Confidence alone is not evidence of fidelity.
- Keep original image bytes in browser memory and add a local image preview for direct comparison. Object URLs are revoked after closing or changing sources; image bytes are excluded from JSON export.
- Add deterministic review classification tests and offline browser checks for image display, scanned-PDF review and correction invalidation.

- Restart the full-document extraction with smaller sections on recognized model context-overflow errors (maximum two retries). Discard previous candidates; never mix attempts or silently truncate source text. Cancelled operations, invalid JSON, and unrelated errors remain fail-closed.
- Add synthetic tests for complete coverage after retry, bounded attempts, and cancellation behavior. Real GGUF context limits still require independent validation.

- Reject local Wllama completion streams terminated by the output token cap (`finish_reason: length`). A syntactically valid but token-limited JSON response is never treated as completed extraction.
- Add a deterministic completion-status test. Exact model stream behavior remains covered by the independent file:// browser workflow.

- Keep source chunks within their configured character budget and prevent boundaries inside UTF-16 surrogate pairs, combining marks, joined emoji, or contiguous numeric values; refuse unrepresentable oversized numeric sequences rather than splitting values. Add deterministic regression tests.

- Require full lexical matches for string-valued evidence; form codes and terms cannot be supported by substrings of longer identifiers, hyphenated codes, or slash-joined alternatives. Reviewer-quoted source passages remain available for interpreted facts.
- Add tests for code-prefix collisions, Unicode word boundaries and reviewer-quoted passages.

- Fail closed when Excel formula cells lack saved calculation results or contain spreadsheet errors; never insert a generated placeholder as if it were source data. Existing cached formula results continue to require original-workbook review.
- Add synthetic tests for missing caches, cached formulas, and Excel error cells.

## 0.3.0-beta.1 — November 6, 2026

- Single-file `file://` Chromium test covers local model generation, text PDF, scanned-PDF/image OCR and DOCX/XLSX/CSV source import.
- Parser-derived PDF page, Word paragraph/table, Excel cell and CSV row/column locations.
- Bounded whole-source JSON extraction, conflict review and strict Ajv validation.
- Reviewer-confirmed source-evidence matches required for export; source-identity and SHA-256 input fingerprints.
- Conservative local privacy warning and export acknowledgement.
- Synthetic known-answer GGUF check plus a separate experimental real Qwen 0.5B benchmark.
- Pure-black/pure-white PBGC-logo theme pairing, theme switch and printable Guide.

**Release status:** Beta. Protected case-data use, factual actuarial accuracy, broader model performance and managed-workstation compatibility have not passed production acceptance.
