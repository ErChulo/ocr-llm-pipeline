# OCR + LLM Pipeline Studio

[![Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml)
[![Offline browser test](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version: beta](https://img.shields.io/badge/version-0.3.0--beta.1-002D72.svg)](CHANGELOG.md)

**Private-document-to-JSON research application. Beta; not approved for production PBGC data.** The release target is one offline HTML file that opens directly under `file://` in Chrome or Edge. GGUF model weights stay separate, selected by the user. No Python, Node, server, CDN, installation, or network is required on the target workstation once its hardware is independently validated.

## What is implemented

- **Local GGUF inference:** Wllama / WebAssembly model picker, chat and a local generation self-test. Small-model generation passed the `file://` Chromium workflow without external requests.
- **Source ingestion:** native text PDFs, English OCR for scanned PDF pages and PNG/JPEG/WebP images, DOCX, XLSX, CSV, TXT, MD, and Bulk OCR Studio JSONC/JSON exports. Source-location precision varies by format.
- **JSON extraction:** bounded whole-source sectioning, JSON Schema validation, conflict review, editable JSON, and fail-closed handling of incomplete sections.
- **Source evidence:** literal value searches with parser-derived document/page/paragraph/table/cell locations. Users must inspect and confirm each match before export. Literal matches and valid JSON **do not independently establish factual or actuarial accuracy**.
- **Safety:** local possible-PII flags, protected-export acknowledgement, SHA-256 fingerprints of original input files, and export gates that refuse changed source text, unresolved conflicts, missing evidence and invalid JSON. The privacy screen is not comprehensive.
- **Usability:** offline hash routing, black/white PBGC logo pairing, theme switch, collapsible printable Guide and a synthetic known-answer model check.

## Where it is verified

| Check | Evidence |
|---|---|
| Deterministic source tests and single-file build | [Build workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml) |
| Offline Chromium `file://` runtime | [Browser smoke workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml) |
| Practical instruction-following GGUF model benchmark | [Separate experimental workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/model-benchmark.yml) |
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
