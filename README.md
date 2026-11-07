# OCR + LLM Pipeline Studio

[![Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml)
[![Offline browser test](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version: beta](https://img.shields.io/badge/version-0.3.0--beta.1-002D72.svg)](CHANGELOG.md)

**Private-document-to-JSON research application. Beta; not approved for production PBGC data.** The release target is one offline HTML file that opens directly under `file://` in Chrome or Edge. GGUF model weights stay separate, selected by the user. No Python, Node, server, CDN, installation, or network is required on the target workstation once its hardware is independently validated.

## What is implemented

- **Local GGUF inference:** Wllama / WebAssembly model picker, chat and a local generation self-test. Small-model generation passed the `file://` Chromium workflow without external requests.
- **Source ingestion:** native text PDFs, English OCR for scanned PDF pages and PNG/JPEG/WebP images, DOCX, XLSX, CSV, TXT, MD, and Bulk OCR Studio JSONC/JSON exports. Source-location precision varies by format. DOCX import extracts paragraphs and tables inside content controls, omits explicitly deleted/moved-from and hidden runs, and requires revision/hidden-text review. XLSX import highlights hidden content, merged ranges and external data/graphics omissions for mandatory original-workbook review; spreadsheet formulas are not recalculated.
- **JSON extraction:** bounded whole-source sectioning, JSON Schema validation, conflict review, editable JSON, context-overflow restart, and rejection of incomplete or output-token-limited generation.
- **Source evidence:** literal value searches with parser-derived document/page/paragraph/table/cell locations. Users must inspect and confirm each match before export. Every OCR page or image requires original-source acknowledgement, even at high confidence; original images can be inspected inside the offline app. Literal matches and valid JSON **do not independently establish factual or actuarial accuracy**.
- **Safety:** local possible-PII flags, protected-export acknowledgement, SHA-256 fingerprints of original input files, and export gates that refuse changed source text, unresolved conflicts, missing evidence and invalid JSON. The privacy screen is not comprehensive.
- **Usability:** offline hash routing, black/white PBGC logo pairing, theme switch, collapsible printable Guide and a synthetic known-answer model check.

## Where it is verified

| Check | Evidence |
|---|---|
| Deterministic source tests and single-file build | [Build workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml) |
| Offline Chromium `file://` runtime | [Browser smoke workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml) |
| Practical instruction-following GGUF model benchmark | [Full end-to-end synthetic test passed](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42248309834) (4/4, JSON export, no network) |
| Current production readiness and blockers | [Roadmap](docs/ROADMAP.md) |

The browser smoke uses a tiny GGUF for **runtime verification only**. It does not prove large-model performance, extraction correctness on complex real pension plans, or operation on a managed PBGC workstation. The separate model benchmark measures a synthetic known-answer case and also does not certify accuracy.

## Run locally

Development machine:

```bash
npm install
npm test
npm run build
```

Download `ocr-llm-pipeline-single-html` from the successful [build workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml), extract `index.html`, and open it directly in the browser. Choose a separate GGUF file from local disk.

**No protected participant, plan-case or sensitive material should be committed to this repository or used before agency approval and the remaining security validation.** Model files are not in Git.

## Documentation

- [Short user guide](docs/USER_GUIDE.md) and in-app left Guide drawer with Print / Save PDF.
- [Design standard](DESIGN.md) and [product requirements](PRODUCT.md).
- [PDF ingestion](docs/PDF_INGESTION.md), [evidence/whole-source extraction](docs/WHOLE_DOCUMENT_EXTRACTION.md), [real GGUF benchmark](docs/REAL_MODEL_BENCHMARK.md).
- [Acceptance contract](docs/IMPLEMENTATION_ACCEPTANCE.md), [Impeccable setup](docs/IMPECCABLE_SETUP.md), [changelog](CHANGELOG.md).

[Bulk OCR Studio](https://github.com/ErChulo/bulk-ocr-studio) is **read-only**. This repository contains a separate importer and has never modified that project.

## Strict Content Security Policy

JSON Schema validation is performed by a CSP-compatible interpreter, not dynamic JavaScript code generation. Imported schemas may use local JSON Pointer references, but external schema references and potentially dangerous regular-expression rules are refused with explicit errors. The **Check schema** command under Extract JSON works without a loaded model. For more, see [acceptance requirements](docs/IMPLEMENTATION_ACCEPTANCE.md).

## Original PDF review and OCR correction

Choose **View original PDF** to inspect the actual PDF page locally; after selecting a source citation, choose **View source PDF page** to see the page with approximate text-item overlays. For scanned pages, use **Correct OCR text** to fix recognition errors. Corrections stay in browser memory and invalidate any previous JSON extraction/review. The original file fingerprint and page identity are preserved; corrected text is explicitly marked as human-entered. These features do not verify actuarial interpretations automatically.

### First real five-document benchmark

The official 0.5B GGUF achieved 90% **exact-field** micro precision/recall/F1 on five fictional pension inputs, with zero external network requests ([CI evidence](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42371798989)). Its one mismatch was an unambiguous date normalization, not a different calendar date. This is a small synthetic diagnostic, **not** production acceptance. See [measured cases](docs/REAL_CORPUS_BENCHMARK.md).
