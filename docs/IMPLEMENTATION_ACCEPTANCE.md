# Offline OCR + LLM pipeline: implementation acceptance contract

## Unchanged upstream
* NEVER write to ErChulo/bulk-ocr-studio (no commits, branches, PRs, tags or releases).
* For integration, import its JSONC envelope as untrusted local data. If portions are adapted into this repository, preserve copyright and MIT notices and document origin.

## Non-negotiable runtime
* Vite + React + TypeScript + WASM is a development stack, not a workstation dependency.
* Final deliverable: one portable `index.html` run directly from `file://` in managed Chrome/Edge, with no server, network, external API or installation on the target workstation.
* GGUF model weights remain user-selected local files outside HTML. Never download a model implicitly.
* Enforce no network calls in release mode; validate CSP against every worker, inline script, WASM loader and OCR language file. Build success alone does not establish air-gapped runtime success.

## M1 — Baseline (source exists)
* GGUF File picker; Wllama on-device chat; extraction from imported Bulk OCR Studio JSONC exports; document preview; Ajv JSON Schema validation; download output.
* CI compiles/validates source and bundles HTML. No claim of successful model inference until a real GGUF smoke test.

## M2 — Native ingest and OCR
* Direct local attachment of PDF, DOCX, XLSX, CSV, TXT, and images; binary `.doc` and `.xls` only with verified parsers.
* Prefer native text extraction over OCR; use offline Tesseract for scanned pages and images.
* Bundle PDF.js, Mammoth, SheetJS, Tesseract workers/WASM and English/Spanish OCR traineddata. If the result cannot fit or work in one HTML, report the limit rather than silently requiring a vendor directory.
* Allow page/image inspection and low-confidence OCR review.

## M3 — Evidence and trust
* Extracted facts must cite **available** provenance: PDF page and region, DOCX paragraph/table, XLSX sheet/cell, CSV row/column. Never synthesize citation coordinates.
* Partition long documents without silently truncating; show missing coverage and incomplete chunks.
* Maintain candidate, validation errors, evidence, reviewer decision and audit history separately.
* JSON Schema validity is structural only; human source review is required for legal/actuarial interpretations.
* Reimplement independent PII scanning, redaction and export gates; do not rely on unverified upstream metadata to claim compliance.

## M4 — Release verification
* npm test and npm build succeed with pinned dependency versions.
* GitHub Actions artifact contains **only** the self-contained HTML.
* On an offline workstation run the HTML via `file://`, load a small GGUF, perform generation, ingest each document type, extract JSON, validate and export; confirm there are no network attempts or missing worker assets.
* Confirm no PII/test documents or model weights are committed to this public repo.

## Future research
AirLLM-style one-layer-at-a-time disk streaming is a separate WASM inference backend. Wllama's split GGUF support is not transformer-layer streaming. See `AIRLLM_STREAMING_DESIGN.md` for the technical plan.

## P0 product and design acceptance (added 2026-11-05)

### Core functionality
* Offline GGUF execution is a release gate. A passing TypeScript build or a mock LLM is insufficient.
* AI-generated JSON must be parsed and validated against the supplied JSON Schema. Document-backed source claims require an independent check. No truth guarantee may be inferred from schema-valid status.
* Missing context and truncated document content must be visible and block silent acceptance.

### Design and documentation
* Apply \`DESIGN.md\` and \`PRODUCT.md\` before altering the interface. PBGC Blue #002D72 and Red #E4002B are sourced from the September 2025 agency style guide.
* Minimal black/high-contrast, restrained-gloss interface. Avoid dashboard ornamentation, developer diagnostics and needless reporting in the normal workspace.
* Place a separate, collapsible **Guide** drawer at the left. Make it keyboard accessible. Do not crowd the existing navigation.
* The guide must use short, ordered, ASD-STE100-inspired instructions; add feature visuals, progress examples and source/result comparisons. Do not claim formal ASD-STE100 conformity without verification.
* A **Print / Save PDF** control must print the guide only. QA the resulting PDF for readability, typography, correct page breaks, visible diagrams and no leaked user content.
* Source code for the drawer exists. A passing compile does not constitute a print-layout review.
* Impeccable is development-only design tooling. Attempt project-local installation in a connected development environment, then run audit/polish against DESIGN.md. Do not add to offline runtime or claim installation until verified.

### Status labels
* **Source implemented** = source merged.
* **CI verified** = automated tests and build passed.
* **Offline verified** = actual workstation test performed without network.
* **Fact verified** = extracted value reviewed against real provenance.

Do not collapse these labels into a generic “passing” claim.
