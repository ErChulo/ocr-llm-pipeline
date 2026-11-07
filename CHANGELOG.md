# Changelog

## Unreleased — Office ingestion safeguards

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
