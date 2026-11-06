# Local PDF ingestion and source review

**Beta status:** Source tests and build have passed; final browser acceptance of the newest PDF viewer and OCR-correction controls is tracked in the [offline Chromium workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml).

## What works

- Import text PDFs and English-scanned PDFs locally using bundled PDF.js and Tesseract.
- Preserve the actual parser-reported page number.
- Retain original PDF bytes **in browser memory only** so the user can open and inspect each page. These bytes are not part of the JSON export.
- For searchable text, preserve character offsets and PDF.js text-item coordinates. The reviewer can display **approximate text-item envelopes** on the original page. They are not exact glyph or quoted-substring boxes.
- The original page viewer supports page navigation and uses no server.
- For pages without a text layer, use English OCR and record the OCR confidence. Pages with both selectable text and images issue a warning because image-contained text might still be missed.
- Correct an OCR transcription manually. Corrections invalidate earlier extraction/review, preserve the original file SHA-256 and page identity, and are marked as human-reviewed text.
- Refuse partial imports when OCR fails, a page is blank, limits are exceeded or the PDF is password protected.

## Important limits

- OCR may misread numbers, dates, names and formulas. Always compare with the PDF.
- Text embedded in an image on a page that already has text can remain unrecognized.
- PDF tables, columns, rotated text and complex layouts may not preserve logical reading order.
- A PDF text-item envelope is **not** a verified box around every character or a claim-level factual citation.
- File-size and safety limits remain 20 MB, 300 pages and 2 million extracted characters.
- A human-confirmed text match is not independent verification of a pension provision.

## Automated evidence

- [Source build and tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml).
- [Offline Chromium runtime and PDF viewer](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml).
- [Actual 0.5B GGUF end-to-end extraction test](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42248309834).

All synthetic fixtures contain fictional text; no participant records were committed. The independent Bulk OCR Studio repository remains untouched.
