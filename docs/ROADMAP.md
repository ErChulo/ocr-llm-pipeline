# Implementation roadmap

## Accepted baseline (source/CI)

- [x] Independent repository. The existing `bulk-ocr-studio` project is unchanged.
- [x] Vite, React, TypeScript and Wllama-based local model integration source.
- [x] Bulk OCR Studio JSONC / JSON / TXT / MD / CSV importer and source tests.
- [x] First local-model, document, JSON extraction and JSON Schema validation interface.
- [x] GitHub Actions source tests and production bundle build completed successfully.
- [x] README with working build badge; `DESIGN.md` and `PRODUCT.md`.
- [x] Collapsible **Guide** drawer with workflow diagram, clear instructions and Print / Save PDF browser action; code compiled by CI.

## P0 — not release-verified

- [ ] **Local LLM inference:** load an actual GGUF model; generate offline from `file://` in managed Chrome/Edge; prove zero network requests.
- [ ] **AI extraction into validated JSON:** compare with synthetic known-answer samples, enforce a user-selected JSON Schema, check source-backed facts, and fail safely on incomplete evidence.
- [x] Sectioned text processing with exact source coverage, deterministic conflict detection, and incomplete-section export blocking (source/CI).
- [ ] Verify accuracy and context bounds with a real GGUF; token budgets are provisional.
- [ ] Verify printed Guide as a readable PDF with diagrams and page breaks; add labeled feature screenshots and examples.
- [ ] Verify the actual offline HTML bundle and workers/WASM in Chrome/Edge (CI bundling alone is not sufficient).

## P1 — ingestion and safeguards

- [ ] Native PDF, DOCX, XLSX, image and Tesseract processing in this repository only.
- [ ] Real provenance for PDF pages/regions, DOCX paragraphs/tables, XLSX sheets/cells and CSV rows/columns.
- [ ] Full PII scanning, redaction, protected exports and independent security review.
- [ ] Accessibility, keyboard navigation, screen-size checks and GUI noise reduction.
- [ ] Run Impeccable's project-local install and design audit in a networked developer environment, using `DESIGN.md` and `PRODUCT.md`. Not installed in this environment.
- [ ] Validate printable guide against ASD-STE100 controlled vocabulary as appropriate; current style is inspired by STE, not certified.

## Research

- [ ] Evaluate AirLLM-style transformer-layer streaming separately from standard Wllama model loading.

**No model weights or protected records belong in this public repository.**

## Current navigation/theme work

- [x] File-safe hash route manifest for Documents, Extract JSON, Local chat and Settings.
- [x] Dark/light theme toggle with the user-selected black-background and white-background logo pair.
- [x] Original `logo-negro.png` and `logo.svg` imported into this repository only.
- [x] Responsive Guide drawer theme support.
- [ ] Verify manual keyboard flow and logo layout under both themes.
- [ ] Optional HTTPS PWA release build with manifest, icons, service worker and installability checks; **not** a dependency of the file:// version.

- [x] Fail closed when a source exceeds the current extraction coverage; no partial-document output is treated as valid. Export is disabled on JSON Schema failure.
- [x] Replace fixed 6,500-character rejection with full text sectioning up to a bounded number of sections; fail closed beyond the supported limit.
- [ ] Add persistent checkpoint/restart and multi-document batch extraction for exceptionally long plans.

- [x] Use pure black and pure white canvases matching the exact source logo backgrounds.
- [x] Small accessible sun/moon icon in the navigation bar; remove redundant settings-page theme controls.

- [x] Added an optional local-model generation self-test and prevented stale model status after failed loads. This does not replace offline acceptance with a real GGUF.

- [x] Embedded official Wllama compatibility WASM and worker locally, with no CDN fallback in the portable build (source/CI; browser test pending).
- [ ] Re-run file:// Chromium GGUF smoke test after compat integration; first attempt stalled while loading the model.

- [x] Moved the Guide trigger away from the official PBGC logo after examining actual browser screenshots; guide drawer and print layout preserved.

- [x] Native DOCX/XLSX parsing source with paragraph/table/cell and sheet/cell location metadata; tests and file:// integration still needed.
- [ ] Verify DOCX and XLSX parsers on synthetic workbooks, including formula caches, data formats and malformed archive handling.

- [x] Implement page-indexed local PDF text extraction, rejecting pages without text (29 tests, build and Chromium file:// acceptance passed on November 6, 2026).
- [ ] Add offline OCR for scanned PDF pages and images, then true region references and screenshot review.

## Native PDF milestone — verified November 6, 2026

- [x] Page-indexed native PDF text parsing with bounded memory and local-only assets.
- [x] Reject mixed text/image PDFs when any page lacks extractable text.
- [x] Verify two-page synthetic PDF in the bundled single-HTML Chromium file:// build.
- [x] Verify local GGUF text generation and zero HTTP(S)/WebSocket requests in the same browser run.
- [ ] Implement offline Tesseract OCR and scanned-page review.
- [ ] Add precise page-region/quotation evidence links from JSON fields; page-level parser records currently exist but are not proof of claim-level evidence.

- [x] Exact local source-text evidence candidates, parser-derived PDF/DOCX/XLSX references, and mandatory field-by-field review before JSON export. Independent semantic fact checking is still pending.
