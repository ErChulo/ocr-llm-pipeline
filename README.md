# OCR + LLM Pipeline Studio

[![Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version: 0.2.0](https://img.shields.io/badge/version-0.2.0-002D72.svg)](docs/ROADMAP.md)

A **browser-only, offline-first** document-to-JSON application. Developed with **Vite, React, TypeScript, WebAssembly and Wllama**. Its intended release is one HTML file, with a user-selected GGUF model stored separately.

> The build badge indicates automated source tests and compilation. It **does not** establish that actual GGUF inference, OCR, or all \`file://\` scenarios work.

## Critical features (P0)

1. **Local LLM inference.** Load a GGUF file from local disk. Run prompts through WebAssembly. Do not send documents to a server. **Release acceptance:** actual browser inference with Wi-Fi disabled and no network requests.
2. **AI extraction into validated JSON.** Parse local source text, ask the model for structured data, validate with Ajv and a selected JSON Schema, and export with source information. **Release acceptance:** test extraction on known samples; inspect source evidence; mark unverified claims for review. Passing JSON Schema is **not** proof that the data is correct.

Current code includes a local chat interface, a GGUF file selector, JSONC/JSON/TXT/MD/CSV import, experimental extraction and JSON Schema checks. **Direct PDF, DOCX, XLSX, image OCR, and fine-grained provenance are pending.** No real-model offline acceptance test has passed yet.

## Build and run

On a **development** computer with Node.js:

\`\`\`bash
npm install
npm test
npm run build
\`\`\`

The CI workflow runs these commands and uploads \`dist/index.html\` when it passes. For the target workstation, no Python, Node, local server, CDN, or network connection should be needed **after offline acceptance testing**. Select the GGUF model from local disk when prompted.

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
