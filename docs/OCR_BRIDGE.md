# Bulk OCR Studio bridge: read-only

Source examined: https://github.com/ErChulo/bulk-ocr-studio
Original **must remain unchanged**.

The offline v1.10.2 app has a function `generateJsoncString()` in
`o-bulk-ocr-studio/index.html`. It packages a metadata object and a documents array,
with fields `id`, `name`, `mimeType`, `sizeBytes`,
`wordCount`, `lowConfidenceWordsCount`, and `extractedText`.
The JSONC envelope includes // comments. The metadata has `piiScanState`,
`piiRedactionApplied`, and `piiFindings`.

The importer in the new app removes comments safely without breaking URLs in
JSON strings, then maps each document to a local source record. This is a
**data transfer bridge**, NOT a runtime dependency on Bulk OCR Studio.

**Limit:** source JSONC does not include verifiable page regions, Word paragraph
IDs, or spreadsheet cell addresses. Provenance precision is *document* only;
the app must never invent finer-grained citations.

**PII:** Metadata flags do not constitute independent compliance certification.
Keep source documents and any extracted identifiers outside this public repo.
Reimplement review/export gates before use with protected information.

**Future native OCR:** Adapt MIT-licensed upstream parsing modules and bundle
the required vendor assets into the new project with preserved attribution,
without writing to Bulk OCR Studio. It currently vendors PDF.js, Tesseract.js,
Mammoth, SheetJS, zip.js, English and Spanish OCR data, and workers.
