<!-- Version-controlled snapshot. For interactive checkboxes and recorded progress, use GitHub issue #124. -->
# Office End-to-End Test — Windows 11 Dell Laptop

**Interactive checklist (click to mark steps done): [GitHub Issue #124](https://github.com/ErChulo/ocr-llm-pipeline/issues/124).**

This document is the permanent, version-controlled instruction copy. Checkbox selection in a rendered repository Markdown file may be read-only. Use the linked GitHub Issue to record your actual progress. All content here uses fictional data and is for authorized beta testing only.

---

**Purpose:** Test `OCR + LLM Pipeline Studio` on an approved Dell/Windows 11 office laptop using **fictional documents only**. The application remains **0.3.0-beta.1** and is **not authorized for PBGC production data**.

**How to use:** Open this issue while signed in to GitHub. Select each checkbox after the step succeeds. GitHub saves the checklist. If a step fails, leave it unchecked and add a comment with the exact error text, the browser, and the step number. No sensitive data in comments.

**Download links (stable entry points):**

- **Application:** [Build and source tests — all runs](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml). Select the **latest successful `main`** run, then **Artifacts → `ocr-llm-pipeline-single-html`**. Extract `index.html`. Do **not** use **Code → Download ZIP**; it contains source, not the built app.
- **Verified build snapshot (Nov 10, 2026):** [Build run #1206](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42726864113), commit `d72d1e97`. **Workflow artifacts expire.** When this artifact is no longer available, use the workflow link above and a newer successful `main` build.
- **Separate AI model:** [Qwen2.5-0.5B-Instruct Q4_K_M — official model page](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/blob/main/qwen2.5-0.5b-instruct-q4_k_m.gguf). [Direct model download](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf) (~491 MB), file `qwen2.5-0.5b-instruct-q4_k_m.gguf`. Known CI SHA-256: `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`.
- **Printable official guide:** [docs/USER_GUIDE.md](https://github.com/ErChulo/ocr-llm-pipeline/blob/main/docs/USER_GUIDE.md). The built application has **Guide → Office setup → Print / Save PDF**.

## A. Get the files

- [ ] **01. Download the application ZIP.** Open the build-workflow link above. Select a successful `main` run. Under **Artifacts**, select `ocr-llm-pipeline-single-html`. **Pass:** The ZIP file is in Downloads.
- [ ] **02. Extract `index.html`.** In File Explorer, right-click the ZIP and select **Extract All**. **Pass:** `index.html` exists.
- [ ] **03. Download the model.** Open the official Qwen model link. Select **Download**. **Pass:** The entire `.gguf` file is present; it is separate from the HTML.
- [ ] **04. Put both files in an approved folder.** Obtain all required office authorization before download or transfer. Move `index.html` and the model to an approved local folder, such as `OCR-LLM-Test`. **Pass:** You can find both files with File Explorer.

## B. Run the app

- [ ] **05. Open the application.** Right-click `index.html` → **Open with** → approved **Microsoft Edge** or **Chrome**. **Pass:** You see **OCR + LLM Pipeline Studio**. The URL begins `file:///`.
- [ ] **06. Load the AI model.** In **01 — Local GGUF model**, click **Choose model files** and select the `.gguf` file. Select **Load model**. **Pass:** The app reports that the model loaded.
- [ ] **07. Test the model.** Select **Test model**. **Pass:** The model produces a response and no load/runtime error is shown.

## C. Make fictional input

- [ ] **08. Create `fictional-plan.txt`.** Open Notepad, copy the text below, and save it in the approved test folder. **Pass:** Notepad can reopen it.
- [ ] **09. Create `fictional-plan.png`.** Open the fictional text in Notepad. Press **Windows + Shift + S**. Capture the text. Save the image using Snipping Tool. **Pass:** The image visibly contains the numbers 65, 55, and 10.

**Fictional input text — no real persons or plans:**

```text
FICTIONAL PENSION PLAN TEST

The normal retirement age shall be age 65.

Early retirement eligibility begins at
age 55 with 10 years of service.

This is a fictional test.
It contains no participant data.
```

## D. Test OCR and JSON export

- [ ] **10. Import the image.** In **02 — Local documents**, select **Attach OCR export / text** → `fictional-plan.png`. **Pass:** The document count increases and OCR text appears.
- [ ] **11. Verify OCR.** Open **Documents**. Compare the text with the image. **Pass:** The OCR has **65**, **55**, and **10**, with their proper meanings. If needed, select **Correct OCR text**, then record the original error.
- [ ] **12. Extract JSON.** Open **Extract JSON**. Keep the default JSON Schema. Select **Check schema**, then **Extract and validate**. **Pass:** A JSON candidate is produced without a schema error.
- [ ] **13. Verify source evidence.** Check that normal retirement age is **65** and early retirement eligibility is **age 55 with 10 years of service**. Inspect citations, confirm actual source matches, and resolve all warnings. If JSON changes, select **Validate edited JSON**. **Pass:** Every exported value has verified evidence. **Schema validity alone is insufficient.**
- [ ] **14. Export.** Select **Export reviewed JSON**. Save `ocr-llm-extraction.json` in an approved folder. Reopen it in Notepad. **Pass:** Export succeeds and values/evidence correspond to the source.
- [ ] **15. Record outcomes.** In a comment on this issue, state the browser, build run, the first failed step (if any), and the exact sanitized error message. **Pass:** The report does not contain any protected or internal PBGC document/participant data.

## Optional separate PDF check

- [ ] **16. Image-only PDF:** Print the fictional screenshot using **Microsoft Print to PDF** (if allowed), import the PDF, inspect OCR, and select **View original PDF**. **Pass:** The app shows the correct source page and values.

## Results (copy this into a comment and fill it in)

```text
Office test date:
Laptop / Windows version:
Browser (Edge or Chrome):
Application workflow run / commit:
App opens: PASS / FAIL / NOT TESTED
GGUF loads: PASS / FAIL / NOT TESTED
Model self-test: PASS / FAIL / NOT TESTED
Image OCR 65 / 55 / 10: PASS / FAIL / NOT TESTED
JSON extraction and schema: PASS / FAIL / NOT TESTED
Original-source verification: PASS / FAIL / NOT TESTED
Reviewed JSON export: PASS / FAIL / NOT TESTED
Optional scanned PDF: PASS / FAIL / NOT TESTED
First failed step:
Exact sanitized error:
```

**Stop conditions:** Stop if office policy blocks `file://`, a transfer, WebAssembly, GGUF loading, or browser permissions. Do not install packages, use a development server, work around security controls, or use real PBGC participant records for this beta evaluation.

**Scope:** Successful office testing verifies one fictional end-to-end workflow on one computer. It does not close the independent OCR, adversarial, source-authority, security, or production acceptance gates.

_Written in short, imperative, ASD-STE100-inspired English; not formally ASD-STE100-certified._