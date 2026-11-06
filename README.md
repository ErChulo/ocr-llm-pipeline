# OCR + LLM Pipeline Studio

An **offline-first, browser-only** document extraction project built with Vite, React, TypeScript and WebAssembly. Initial local GGUF inference uses **Wllama** (llama.cpp WASM), not the Python AirLLM layer-offloading engine.

## Scope

- Read documents locally through the browser File API. No upload server or API key.
- Import Bulk OCR Studio JSONC exports, preserving original document IDs and filenames.
- Use a user-selected GGUF model for local chat and experimental JSON extraction.
- Validate candidate JSON against a local JSON Schema and retain review status.
- Target a single self-contained `dist/index.html`, with GGUF weights selected separately.
- Port OCR and office parsers in a later milestone. The upstream project is read-only.

**Do not add sensitive data, pension records or PII to this public repository.**

## Quick start (development machine)

```bash
npm install
npm run test
npm run build
```

Target computer: no Node, Python, internet, CDN or server required **after a verified standalone build**. The browser opens `dist/index.html` from disk and the user selects a GGUF file. This build **has not yet passed a real-model, offline file:// acceptance test**.

## Source relationship

- New repository: https://github.com/ErChulo/ocr-llm-pipeline
- Unmodified upstream OCR app: https://github.com/ErChulo/bulk-ocr-studio
- OCR JSONC format is documented in `docs/OCR_BRIDGE.md`.
- Architecture and progress: `docs/ROADMAP.md`.

The original OCR application is **not changed or overwritten**, and OCR vendor assets have not been copied into this repository. The existing upstream offline edition uses a directory with `vendor/` assets; repackaging all WASM, workers, and language models into one HTML remains an acceptance milestone.

## Status

Experimental initial implementation. Chat and GGUF loading are source implementations, **not proven working** until npm build and browser testing. JSONC import is deterministic; local-model extraction remains model-dependent and must be independently reviewed. A JSON Schema pass is a **structure** check, not proof of factual accuracy.
