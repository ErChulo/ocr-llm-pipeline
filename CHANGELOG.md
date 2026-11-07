# Changelog

## Unreleased — XLSX import fidelity safeguards (source committed)

- Detect hidden worksheets and nonempty hidden rows, hidden column ranges, and merged cell ranges. Require original-workbook review before JSON export.
- Flag external links, connections, query and pivot caches whose data are not refreshed by the offline importer.
- Handle absolute internal OOXML worksheet targets, reject remote or traversal targets, and skip chartsheets with explicit omitted-content review.
- Add synthetic regression cases for all of the above. This source change is not a claim of a completed CI run or production acceptance.
- Bound imported Bulk OCR JSON/JSONC to 200 documents, 2 million characters per document and 4 million per batch; reject blank sources and duplicate IDs. Validate supplied byte counts and require bounded local TXT/MD imports.
- Add importer boundary tests; automated acceptance status is tracked by the build workflow.


## 0.3.0-beta.1 — November 6, 2026

- Single-file `file://` Chromium test covers local model generation, text PDF, scanned-PDF/image OCR and DOCX/XLSX/CSV source import.
- Parser-derived PDF page, Word paragraph/table, Excel cell and CSV row/column locations.
- Bounded whole-source JSON extraction, conflict review and strict Ajv validation.
- Reviewer-confirmed source-evidence matches required for export; source-identity and SHA-256 input fingerprints.
- Conservative local privacy warning and export acknowledgement.
- Synthetic known-answer GGUF check plus a separate experimental real Qwen 0.5B benchmark.
- Pure-black/pure-white PBGC-logo theme pairing, theme switch and printable Guide.

**Release status:** Beta. Protected case-data use, factual actuarial accuracy, broader model performance and managed-workstation compatibility have not passed production acceptance.
