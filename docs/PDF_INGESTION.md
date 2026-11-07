# Local PDF ingestion and source review

**Beta status:** Source tests and build have passed; final browser acceptance of the newest PDF viewer and OCR-correction controls is tracked in the [offline Chromium workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml).

## What works

- Import text PDFs and English-scanned PDFs locally using bundled PDF.js and Tesseract.
- Preserve the actual parser-reported page number.
- Retain original PDF bytes **in browser memory only** so the user can open and inspect each page. These bytes are not part of the JSON export.
- For searchable text, preserve character offsets and PDF.js text-item coordinates. The reviewer can display **approximate text-item envelopes** on the original page. They are not exact glyph or quoted-substring boxes.
- The original page viewer supports page navigation and uses no server.
- For pages without a text layer, use English OCR and record the OCR confidence. **Every OCR-transcribed page requires explicit original-page review before JSON export, regardless of the confidence score.** Pages with both selectable text and images issue a separate warning because image-contained text might still be missed.
- For imported images, use **View original image** to compare the unmodified local file with OCR text. The original image stays in browser memory and is not exported. **Every image OCR transcription requires original-image review**, including high-confidence results.
- Correct an OCR transcription manually. Corrections invalidate earlier extraction/review, preserve the original file SHA-256 and page identity, and are marked as human-reviewed text.
- Refuse partial imports when OCR fails, a page is blank, limits are exceeded or the PDF is password protected.

## Important limits

- OCR may misread numbers, dates, names and formulas even at 100% reported confidence. Always compare with the PDF or image; confidence is only a diagnostic.
- Text embedded in an image on a page that already has text can remain unrecognized.
- Interactive PDF annotations, FreeText comments, and form fields can contain information missing from the selectable text. These require separate source review using an approved PDF viewer that displays annotations; the in-app PDF preview may not render them.
- PDF tables, columns, rotated text and complex layouts may not preserve logical reading order. A conservative geometry check flags suspicious pages for mandatory original-page review; absence of a warning **does not prove** reading-order correctness.
- Mixed pages can be reprocessed with **OCR mixed PDF pages**. This is an explicit user action, not automatic: the entire page is rendered and OCR text is stored as a separate page-derived record. It may repeat native text; compare against the original and manually correct errors. A prior manual correction disables this operation to prevent losing edited text.
- A PDF text-item envelope is **not** a verified box around every character or a claim-level factual citation.
- File-size and safety limits remain 20 MB, 300 pages and 2 million extracted characters.
- A human-confirmed text match is not independent verification of a pension provision.

## Automated evidence

- [Source build and tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml).
- [Offline Chromium runtime and PDF viewer](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml).
- [Actual 0.5B GGUF end-to-end extraction test](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42248309834).

All synthetic fixtures contain fictional text; no participant records were committed. The independent Bulk OCR Studio repository remains untouched.
