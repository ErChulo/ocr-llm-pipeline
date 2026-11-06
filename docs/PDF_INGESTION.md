# Native PDF text ingestion — verified development milestone

**Date:** November 6, 2026  
**Source:** \`src/pdfText.ts\`, pinned Mozilla PDF.js \`6.5.438\`.  
**Automated test evidence:** 29 source tests passed and the single-file production build succeeded; experimental Chromium file:// smoke test extracted two synthetic PDF pages, loaded a small GGUF model and generated text while blocking external requests.

## What the parser does

1. Accept a locally selected PDF up to 20 MB with a PDF header.
2. Parse at most 300 pages and no more than 2 million characters of extracted text.
3. Visit all pages in order. Each page must have extractable text.
4. Preserve **actual parser-reported page numbers** in text labels and \`SourceDocument.records[].location.page\`.
5. Insert the full extracted text into the document list, then allow the user to select Extract JSON.
6. Refuse a partial result when any page lacks text, is password protected, or parsing fails.

The resulting provenance is **page-level**. Word/table geometry, actual page regions, and fact-level evidence are not yet verified. Text ordering can diverge from visual layout. PDF tables are not reconstructed into a semantic table. Do not infer cells or exact spans from page-only references.

## Test evidence

- [Source tests and standalone build](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42222998200) — 29 tests passed, one \`index.html\` uploaded.
- [Real Chromium file:// browser test](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42222998426) — page 1 and page 2 text verified; local GGUF loading and text generation verified; no HTTP(S) or WebSocket requests.

The test PDFs are generated in \`tests/pdf-fixture.mjs\` and contain only fabricated sample text. No case documents or personal information were committed. The tests do not establish reliable extraction of all real-world PDF layouts.

## Not implemented

- Offline OCR of scanned PDF pages or image attachments.
- Fidelity checks for columns, diagrams, forms, handwritten annotations or tables.
- A source-document PDF viewer with highlightable exact bounding boxes.
- Claim-level PDF citations in the JSON extraction review interface.
- Deployment tests with larger models or the managed PBGC workstation.

This work does not change \`bulk-ocr-studio\`.
