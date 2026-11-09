# User guide — OCR + LLM Pipeline Studio

This beta application includes a built-in **Guide** with an **Office setup** walkthrough (six screens), a **Using the app** section, and **Print / Save PDF**. The office directions below are for a permitted offline Windows 11 evaluation with entirely fictional files. They are not deployment authorization.

## Office setup — before first use

**You need two separate files:** the built standalone `index.html` application and a compatible `.gguf` model. The GGUF is **not** inside the GitHub HTML artifact. This workflow needs no Node.js, Python, installer, development server, CDN, API, or runtime internet connection.

1. **Get the HTML outside the office:** On an internet-connected computer where downloading is permitted, open [Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml). Choose a successful `main` run. Under **Artifacts**, download `ocr-llm-pipeline-single-html`. Extract the ZIP to get `index.html`. **Do not choose GitHub's Code → Download ZIP** for the runnable application.
2. **Get a GGUF separately:** Obtain a compatible model from an approved trustworthy publisher. For an initial fictional test, start with a small 0.5B GGUF before attempting 1.5B or 3B. Keep all files if the GGUF is split. Model weights are not distributed in the app download.
3. **Authorize and transfer:** Obtain required agency permission for local HTML, WebAssembly, GGUF files and permitted storage. Transfer the HTML and model only through an approved channel to an approved folder on the managed computer. If policy blocks transfer, **stop** rather than working around it.
4. **Open the HTML:** On the approved Windows 11 workstation, open `index.html` from File Explorer using approved Chrome or Edge. Confirm that its URL begins with `file://`. The model can be in a different local directory that the browser can read. Do **not** start a local web server or install development tools. If policy blocks the page or local-file access, consult approved support.
5. **Load and test the model:** In the app choose **Choose model files** (select every part of a split model), then **Load model** and **Test model**. Read the exact status/error. An individual large model may fail because of RAM, browser or policy restrictions; a text-generation self-test is not a factual accuracy test.
6. **Test only with fictional data:** Choose **Attach OCR export / text**, select a wholly fictional file, inspect **Documents** and **View original PDF** where applicable, use **Extract JSON** → **Check schema** → **Extract and validate**, verify every value against the original source, and use **Export reviewed JSON** only when all checks pass. Save to an approved local folder. Never use protected PBGC participant or case records before formal authorization.

**Stop conditions:** If the workstation rejects file transfer, `file://`, local GGUF loading, or WASM execution, record the error and seek authorized technical support. Do not bypass agency controls. Automated CI results do not establish office-workstation compatibility or security approval.

## Day-to-day workflow after setup

1. Open `index.html` in Chrome or Edge. You do not need a local server.
2. Select **Choose model files**. Select the GGUF file. Select **Load model**.
3. Select **Test model**. Read the status. If the model fails, select a different compatible file.
4. Select **Attach OCR export / text**. Choose a PDF, PNG, JPG, WebP, DOCX, XLSX, CSV, TXT, MD or supported JSONC/JSON export.
5. Select **Documents**. Review the imported text and source notes. For PDFs, choose **View original PDF**. For scanned pages, choose **Correct OCR text**.
6. Select **Extract JSON**, review the JSON Schema, select **Check schema**, then **Extract and validate**.
7. Resolve conflicts only after verifying the original source. Edit JSON if necessary and select **Validate edited JSON**.
8. Review each value's source citation and confirm the evidence. Review any possible personal-data warning.
9. Select **Export reviewed JSON** and save it locally in an approved folder.

For model exploration, select **Settings** then **Check extraction quality**, which runs a fictional benchmark. A successful small test does not establish real-document reliability.

## Important limitations

- Schema validation verifies data structure, **not factual correctness**.
- OCR can misread numbers, dates, tables or formulas. Inspect the original.
- PDF references are page-level; exact region highlighting is not fully established.
- Office formats can omit unrendered content; formulas are not recalculated.
- Large or problematic files can exceed resource limits. Do not export incomplete results.
- No production authorization, managed-workstation compatibility, or independent release acceptance is implied.

## Print the complete guide

In the application, open **Guide** and select **Print / Save PDF**. Printing includes **all six Office setup steps** and the application workflow, regardless of which on-screen step is selected. The instructions are ASD-STE100-inspired; formal certification has not been performed.
