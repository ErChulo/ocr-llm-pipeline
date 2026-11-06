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
