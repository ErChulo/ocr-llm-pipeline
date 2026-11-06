# User guide — OCR + LLM Pipeline Studio

*Draft guide for new users. The app also presents these steps in a collapsible left drawer with a visual flow and print action.*

## Before you start

Get a GGUF model file. Save it on the local computer.

The app accepts text PDFs, DOCX, XLSX, Bulk OCR Studio JSONC, JSON, TXT, MD and CSV files. Scanned PDFs and images need OCR, which is not yet supported.

## Workflow

\`\`\`text
LOCAL DOCUMENT ──→ LOCAL MODEL ──→ CANDIDATE JSON
                         │                 │
                         └──── SOURCE REVIEW + SCHEMA CHECK
\`\`\`

### 1. Load a model

1. Open the application in the browser.
2. Select **Choose model files**.
3. Select the GGUF file.
4. Select **Load model**.
5. Read the status message.
6. Select **Test model** to check local text generation.

The model must load before you extract JSON.

### 2. Add a document

1. Select **Attach OCR export / text**.
2. Select a local file.
3. Select the document in the list.
4. Review the source text.

Do not use the tool with protected case files until its security controls are verified.

### 3. Extract JSON

1. Review the JSON Schema.
2. Select **Extract and validate**.
3. Read the validation result.
4. Compare each output field with the source.
5. Correct errors before you use the results.

**Important:** A valid JSON structure does not prove that the information is correct.

### 4. Save the result

1. Review the candidate JSON.
2. Select **Export JSON**.
3. Save the file in an approved local folder.

### 5. Use the local chat

1. Select **Local chat**.
2. Enter your question.
3. Select **Send**.
4. Review the response.

### Print this guide

1. Open **Guide** on the left.
2. Select **Print / Save PDF**.
3. Choose **Save as PDF** in the browser print window.

## Current limitations

- Local GGUF loading and text generation passed a small-model offline Chromium test. Your workstation and larger models still require testing.
- Extraction processes text in bounded sections. Review the coverage and each source fact. Very long documents can exceed the supported section limit.
- JSON Schema validation checks shape and data types. You must verify facts against the document.
- PDF page, DOCX paragraph/table and XLSX cell locations are parser-derived. OCR and PDF image-region locations remain pending.

This guide uses an ASD-STE100-inspired writing style. It has not been certified against the full controlled vocabulary.
