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
- [ ] Replace the current limited prompt slice with complete chunk coverage and explicit missing-chunk feedback.
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
- [x] Dark/light theme toggle with contrast-appropriate official logo variants.
- [x] Original official PBGC logo files imported into this repository only.
- [x] Responsive Guide drawer theme support.
- [ ] Verify manual keyboard flow and logo layout under both themes.
- [ ] Optional HTTPS PWA release build with manifest, icons, service worker and installability checks; **not** a dependency of the file:// version.

- [x] Fail closed when a source exceeds the current extraction coverage; no partial-document output is treated as valid. Export is disabled on JSON Schema failure.
- [ ] Replace the interim coverage guard with complete chunked extraction and explicit source coverage audit.
