# OCR + LLM Pipeline Studio

[![Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version: 0.2.0](https://img.shields.io/badge/version-0.2.0-002D72.svg)](docs/ROADMAP.md)

A **browser-only, offline-first** document-to-JSON application. Developed with **Vite, React, TypeScript, WebAssembly and Wllama**. Its intended release is one HTML file, with a user-selected GGUF model stored separately.

> The build badge indicates automated source tests and compilation. It **does not** establish that actual GGUF inference, OCR, or all `file://` scenarios work.

## Critical features (P0)

1. **Local LLM inference.** Load a GGUF file from local disk. Run prompts through WebAssembly. Do not send documents to a server. **Release acceptance:** actual browser inference with Wi-Fi disabled and no network requests.
2. **AI extraction into validated JSON.** Parse local source text, ask the model for structured data, validate with Ajv and a selected JSON Schema, and export with source information. **Release acceptance:** test extraction on known samples; inspect source evidence; mark unverified claims for review. Passing JSON Schema is **not** proof that the data is correct.

Current code includes a local chat interface, a GGUF file selector, JSONC/JSON/TXT/MD/CSV import, experimental extraction and JSON Schema checks. **Direct PDF, DOCX, XLSX, image OCR, and fine-grained provenance are pending.** No real-model offline acceptance test has passed yet.

## Build and run

On a **development** computer with Node.js:

```bash
npm install
npm test
npm run build
```

The CI workflow runs these commands and uploads `dist/index.html` when it passes. For the target workstation, no Python, Node, local server, CDN, or network connection should be needed **after offline acceptance testing**. Select the GGUF model from local disk when prompted.

## Design and user documentation

- [DESIGN.md](DESIGN.md) — minimal, glossy, high-contrast PBGC-inspired visual standard. Grounded in the September 2025 PBGC Branding & Editorial Style Guide.
- [PRODUCT.md](PRODUCT.md) — user-first product behavior, priority rules and non-negotiable constraints.
- [Printable user guide](docs/USER_GUIDE.md) — short instructions in an ASD-STE100-inspired style. The application includes a separate **Guide** drawer with a visual workflow and **Print / Save PDF** action.
- [Implementation requirements](docs/IMPLEMENTATION_ACCEPTANCE.md) — release gates and technical acceptance criteria.
- [Impeccable setup](docs/IMPECCABLE_SETUP.md) — optional development-only design review tooling. It is not an application runtime dependency.
- [Roadmap](docs/ROADMAP.md) — implemented versus pending work.

## Safe source reuse

[Bulk OCR Studio](https://github.com/ErChulo/bulk-ocr-studio) is **read-only** for this project. The existing application's JSONC export format is supported by a separate importer. Its source and upstream history have not been changed.

This repository is public. **Do not commit PBGC case data, sensitive records, model weights, or personal information.**

## Status

Source implementation in active development; automated build status appears above. Browser-only GGUF inference and end-to-end evidence-grounded extraction require real workstation tests before release.

## Routing, themes and PWA

- The application is a React single-page application using hash URLs (`#/documents`, `#/extract`, `#/chat`, `#/settings`), which continue to work from `file://`. The route list is in [`src/routes.ts`](src/routes.ts).
- The app embeds the selected PBGC logo pair: **black-background `logo-negro.png` for dark**, **color `logo.svg` on white for light**. Using black on black or white on white would make the branding illegible. Assets are copied unchanged from the authorized reference directory for this app; see [asset provenance](docs/BRANDING_ASSETS.md). The app is not an official PBGC release.
- **Future PWA:** installation requires an HTTPS (or localhost) origin and a service worker. The portable HTML deliberately does not register one. See [PWA strategy](docs/PWA_STRATEGY.md). The developer can build two distributions from the same React source when PWA functionality is implemented.

**Repository visibility:** GitHub is currently public. Make the repository private if you do not want the embedded logo files publicly visible. Private repository access does not automatically grant logo rights or external-use approval.

### Theme switch

Use the small **sun/moon icon** in the top-right navigation bar. Dark mode uses a pure-black app canvas and the original `logo-negro.png`; light mode uses a pure-white app canvas and the original `logo.svg`. The chosen theme is stored locally when supported by the browser. No theme-specific remote assets are loaded.

## Whole-document extraction review

The current Extract JSON view processes **all imported text** in bounded sections rather than silently truncating the source. It records text-section offsets, flags contradictions for manual resolution, and blocks JSON export until conflicts are resolved and the latest candidate passes JSON Schema. Source locations refer only to extracted text; verified page/paragraph/cell provenance is still pending. See [whole-document extraction notes](docs/WHOLE_DOCUMENT_EXTRACTION.md).

## Office document import (experimental)

The app now accepts DOCX and XLSX files locally. DOCX text is labeled by paragraph/table location; XLSX values are labeled by sheet and cell. Formula results are read from cached workbook values, not recalculated. Headers, footers, embedded images, charts, unresolved changes, and Excel date formatting can be incomplete. Only tested parser-derived source locations may be cited; the user must review the original. This feature is not production-accepted.

## Native PDF text import

The PDF.js 6.5.438 parser is bundled locally with the application, including its no-network main-thread worker fallback. The imported text records the PDF's **actual page numbers**, not coordinates invented by AI. Every page must contain extractable text; image-only or blank pages fail closed until offline OCR is implemented. Tables, page ordering and drawings require source review. The PDF parser is subject to a 20 MB/300-page limit. It is not a document viewer and does not establish factual verification.
