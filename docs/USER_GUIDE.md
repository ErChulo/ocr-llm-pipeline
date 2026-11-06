# User guide — OCR + LLM Pipeline Studio

This short guide explains the current **beta**. The app includes a separate left-hand **Guide** drawer with a diagram and a print command.

## Before you start

Save one compatible GGUF model on your computer. Obtain the standalone `index.html` from a successful build. Do not use protected case records before your workplace approves the app.

## Steps

1. Open `index.html` in Chrome or Edge. You do not need a local server.
2. Select **Choose model files**. Select the GGUF file. Select **Load model**.
3. Select **Test model**. Read the status. If the model fails, select a different file.
4. Select **Attach OCR export / text**. Choose a PDF, PNG, JPG, WebP, DOCX, XLSX, CSV, TXT, MD or supported JSONC/JSON export.
5. Select **Documents**. Choose the document. Review the imported text and source notes. The app uses English OCR for images and PDF pages that contain no text.
6. Select **Extract JSON**. Review the JSON Schema. Select **Extract and validate**.
7. If sections disagree, select the correct candidate **after you check the source**.
8. If necessary, edit the JSON. Select **Validate edited JSON**.
9. Review **each** field against the original source. Choose a source location and confirm the match.
10. If the app finds possible personal data, review the warning and confirm authorized local handling.
11. Select **Export reviewed JSON**. Save it in an approved local folder.

For model exploration, select **Settings** and **Check extraction quality**. That command tests fictional plan provisions. A passing small test does not prove real-case accuracy.

## Important limitations

- A JSON Schema check verifies structure, **not facts**.
- OCR may misread numbers, dates, tables and formulas. Inspect the original.
- PDF references are page-level; exact PDF region highlighting is not yet available.
- DOCX headers, footers and revisions; Excel dates and formula recalculation; and images embedded in text-bearing PDF pages may be incomplete.
- Very large sources can exceed the limit. The app must not silently export incomplete results.
- The user-facing privacy warning is not a complete security review.

## Print this guide

Open **Guide** in the application, then select **Print / Save PDF**. In the browser's print dialog, select **Save as PDF**.

The language is inspired by ASD-STE100 but has not undergone formal controlled-language certification.
