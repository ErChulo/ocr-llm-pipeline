# PRODUCT.md

## Product

**OCR + LLM Pipeline Studio** is a local-first document reader that converts inspected documents into structured candidate JSON.

## Primary outcomes — P0

- **LLM inference on the user's computer** from a local GGUF model, offline, without API calls.
- **AI-powered JSON extraction** against an explicit JSON Schema, with validation feedback and source review before export.

Neither feature may be advertised as production-ready without a documented real-browser acceptance test. Structural validation must never be described as factual validation.

## User workflow

1. Open the single HTML application.
2. Select and load a local GGUF model.
3. Attach a file or import a Bulk OCR Studio export.
4. Select a document and a target JSON Schema.
5. Extract candidate JSON.
6. Review schema errors and verify claims in the source.
7. Download the reviewed JSON.

## Non-negotiable constraints

- The user's \`bulk-ocr-studio\` repository is read-only.
- No installs or local servers on the target workstation. Model files are stored outside the HTML file.
- The final UI is minimal, glossy, PBGC-inspired and high-contrast. Keep implementation detail out of the workspace.
- Include a **collapsible left Guide drawer** with short ASD-STE100-style instructions, original visuals, and **Print / Save PDF**.
- Source provenance and PII protection matter more than fluent-looking AI output.

## Definition of done

Real offline local generation, known-answer JSON extraction, schema verification, factual spot-checks, worker/WASM packaging, secure export checks, and printable guide acceptance must all pass.
