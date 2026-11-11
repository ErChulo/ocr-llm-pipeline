# OCR + LLM Pipeline Studio

[![Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml)
[![Offline browser test](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml/badge.svg?branch=main)](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version: beta](https://img.shields.io/badge/version-0.3.0--beta.1-002D72.svg)](CHANGELOG.md)

**Offline document OCR, local GGUF language-model extraction, source review and JSON export.**

**Release: `0.3.0-beta.1` — beta, not production-ready.** The project is not authorized to handle protected PBGC participant or plan-case information. Use only entirely fictional test documents unless you obtain explicit agency authorization and the remaining production acceptance gates pass.

## Start here: office end-to-end test

### [Open the 16-step CLICKABLE OFFICE TEST CHECKLIST](https://github.com/ErChulo/ocr-llm-pipeline/issues/124)

The GitHub Issue provides **interactive checkboxes** that record completion, explicit Pass conditions, exact download URLs, fictional input text, an optional scanned-PDF test and a result-report template. Sign in to GitHub and click the checkboxes as you complete each step. Do not post internal or protected data in issue comments.

- **Permanent instructions in the repository:** [docs/OFFICE_TEST_CHECKLIST.md](docs/OFFICE_TEST_CHECKLIST.md). This is a version-controlled copy. Repository Markdown checkboxes may be read-only; use [Issue #124](https://github.com/ErChulo/ocr-llm-pipeline/issues/124) to mark progress.
- **Built-in application guide:** **Guide → Office setup**, six screens, with **Print / Save PDF**.
- **Detailed user instructions:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

### What you must download

You need **two separate files**. The compiled HTML does **not** contain the GGUF model. Both files must be transferred or downloaded by an **office-approved** method.

| File | Where to get it | What you do |
| --- | --- | --- |
| Application: `index.html` | [GitHub Actions — Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml) | Open the **latest successful `main`** run. Under **Artifacts**, download `ocr-llm-pipeline-single-html`. Extract the ZIP to obtain `index.html`. |
| AI model: `qwen2.5-0.5b-instruct-q4_k_m.gguf` | [Official Qwen2.5-0.5B-Instruct Q4_K_M model file](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/blob/main/qwen2.5-0.5b-instruct-q4_k_m.gguf) | Download the GGUF file separately (approximately 491 MB). No model weights are supplied in the application artifact. |

**Direct model download:** https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf

**Verified model SHA-256 used by CI:** `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`.

**Verified application build snapshot:** [successful `main` build run #1206, November 10, 2026](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42726864113), commit `d72d1e97`. **GitHub workflow artifacts expire.** If its ZIP is no longer available, return to the general workflow page above and choose a newer successful `main` build. Do not assume a run-specific artifact will remain downloadable indefinitely. The workflow URL and repository checklist are the durable entry points.

**Do not use GitHub's Code → Download ZIP as the runnable app.** It downloads source code, not the compiled `index.html`.

### Office requirements

- A permitted Windows 11 laptop and approved **Microsoft Edge or Chrome**.
- Authorization for local HTML, JavaScript, WebAssembly (WASM), GGUF model weights, file transfer and local storage.
- Sufficient available memory for model loading and OCR. Office hardware performance has **not** been established by the development tests.
- One approved folder for the two files and **fictional** test data. The GGUF can reside elsewhere if the browser can read it.
- **No** Python, Node.js, Tesseract installation, PowerShell setup, development server, CDN, external API, or runtime network connection is required by the compiled app.

If a policy prevents the file transfer, `file://` execution, WebAssembly, or local model loading, **stop and report the restriction**. Do not bypass agency controls. GitHub access alone does not imply execution approval.

### Quick test — in order

The [clickable checklist](https://github.com/ErChulo/ocr-llm-pipeline/issues/124) gives one checkbox and a Pass condition for every step. The complete instructions are also [stored in Git](docs/OFFICE_TEST_CHECKLIST.md).

1. Open [Build and source tests](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml). Select a successful **`main`** run. Download the **`ocr-llm-pipeline-single-html`** artifact.
2. In File Explorer, right-click the ZIP and select **Extract All**. Confirm that `index.html` exists.
3. Download the [official Qwen 0.5B Q4_K_M GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/blob/main/qwen2.5-0.5b-instruct-q4_k_m.gguf) as a **separate** file.
4. Put `index.html` and the GGUF into an **approved** folder.
5. Open `index.html` with approved **Edge** or **Chrome**. Confirm that the application appears and the address starts with `file:///`.
6. In **01 — Local GGUF model**, select **Choose model files** → the GGUF file → **Load model**. Confirm loaded status.
7. Select **Test model**. Confirm that the model generates a response without an error.
8. In Notepad, make `fictional-plan.txt` using the fictional passage below.
9. Press **Windows + Shift + S** to capture the Notepad text. Save it as `fictional-plan.png` using Snipping Tool.
10. In **02 — Local documents**, select **Attach OCR export / text** and import the PNG. Confirm that a document appears.
11. Open **Documents**. Compare OCR output with the source. Check **65**, **55**, and **10**. Use **Correct OCR text** where available if necessary.
12. Open **Extract JSON**. Keep the supplied default schema. Select **Check schema**, then **Extract and validate**.
13. Inspect every JSON candidate and its original-source citation. Confirm normal age **65** and early eligibility **55 with 10 years**. Resolve conflicts and review warnings; use **Validate edited JSON** if you change a value.
14. Select **Export reviewed JSON** only after every gate permits it. Save `ocr-llm-extraction.json` and inspect its values and evidence with Notepad.
15. Record browser, build run, Pass/Fail by stage, and the first exact **sanitized** error in [Issue #124](https://github.com/ErChulo/ocr-llm-pipeline/issues/124).
16. **Optional:** Print the fictional image to an image-only PDF with **Microsoft Print to PDF** (if permitted). Import it, inspect OCR and select **View original PDF**. Confirm the correct page.

**Fictional input:**

```text
FICTIONAL PENSION PLAN TEST

The normal retirement age shall be age 65.

Early retirement eligibility begins at
age 55 with 10 years of service.

This is a fictional test.
It contains no participant data.
```

**Expected result:** Image OCR preserves the values **65**, **55**, **10** with their meanings. The local model can generate JSON under the supplied schema; the reviewer can check source references and export an evidence-bearing result. If a value is wrong or evidence is missing, **do not treat the test as passed**. A correct schema is not proof of a correct fact.

**Report failures:** Copy the exact error message (remove any sensitive data). Report the first failed step, which browser was used, the build run and whether the model loaded. The [Issue #124 report template](https://github.com/ErChulo/ocr-llm-pipeline/issues/124) includes each major check.

## What the application does

This is a **local, offline** source-to-JSON research tool. The single built HTML file contains its user interface and bundled browser runtime. The model is supplied separately by the user. No external server is required after authorized local setup.

| Stage | Implemented behavior | User responsibility |
| --- | --- | --- |
| Import | Read PDF, PNG/JPEG/WebP, DOCX, XLSX, CSV, TXT, MD and supported JSON/JSONC. | Check completeness and source type. |
| OCR | Run English OCR locally for scanned PDFs and images. Mixed selectable/raster PDF review is supported. | Compare with the original image and correct recognition errors. |
| Model | Run a locally selected compatible GGUF through WebAssembly/Wllama. | Verify model load and quality; small self-test is not an accuracy certification. |
| Extract | Request bounded source-to-JSON extraction and check a local JSON Schema. | Resolve omitted, disputed or incomplete fields. |
| Source evidence | Search literals and attach available document/page/paragraph/table/cell provenance. Detect some unsafe source-instruction patterns. | Verify source applicability and every cited value; do not assume a match proves correctness. |
| Review and export | Reject certain incomplete or unverified results and export a reviewed JSON bundle with fingerprints. | Complete citation review and save only authorized files. |

### Implemented guardrails and operational limits

- Strict offline Content Security Policy: browser data processing does not use remote runtime APIs. External schema references are refused.
- The **GGUF file remains on the local disk**; it is not part of the built HTML. Split GGUF models require every part. A single part of 2 GiB or more is refused.
- File batch import is transactional and cancellable between operations: a failed/cancelled pending batch is discarded, without changing previously loaded documents. A currently running OCR operation may finish before cancellation is applied.
- Session limits: **20 selected files per batch**, **200 documents per session**, **4 million extracted characters** and **80 MB source files per session**. Restart the page to begin a new session.
- Original PDF pages can be inspected locally. For scanned pages, **Correct OCR text** stores user-entered corrections in session memory and resets stale extraction/review.
- Potential reading-order problems, some PDF annotations/form widgets, hidden/revised DOCX content and hidden/external XLSX data trigger review. Office imports do not recalculate spreadsheet formulas and may omit content that is not rendered.
- Source fingerprints, some prompt-injection/source-conflict detectors, duplicate JSON-key rejection, source citation checks, possible personal-data warnings and export gates help prevent unsupported output. These checks are **not** an independent security audit or guarantee of source authority.
- **Settings → Check extraction quality** offers a small fictional known-answer diagnostic. It is not a production accuracy measure.
- The user interface provides a theme switch and a six-screen **Guide → Office setup** walkthrough, including **Print / Save PDF**.

## Verification and limitations

These are **development results on fictional sources**, not independent production acceptance and not workplace certification.

| Test | What has been measured | Limitation |
| --- | --- | --- |
| Source tests and compiled single HTML | [Successful main build](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42726864113), **420/420 source tests**, on the verified Nov 10 snapshot. | Build success does not prove managed Windows 11 deployment. |
| Offline browser | [Offline Chromium smoke](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/browser-smoke.yml) exercises `file://`, local GGUF and zero external browser requests. | Not the user's office browser, group policy or device. |
| Integrated fictional scanned PDF | [Integrated raster benchmark](docs/INTEGRATED_RASTER_BROWSER_BENCHMARK.md) reported **48/48 numeric literals** and **22/22 eligible spatial associations** on one corrected, fixed 12-page development fixture. | A different **raw original-JPEG** experiment remains **16/22** (72.73%) spatial association recall. These are distinct cohorts; do not pool. |
| Actual local instruction model | [Full Playwright workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/full-playwright-acceptance.yml) tested official Qwen 0.5B against a small fictional eight-case set, with **7/8 exact cases** and approximately **93.75% strict micro F1** in specified verified runs. | Model accuracy varies with the cohort; this is not a 100-case blinded holdout. |
| Adversarial document content | [Source authority notes](docs/NORMAL_AGE_CONFLICT_GUARD.md) show fail-closed source guards that reject or abstain on some conflicts and injected values. | Actual 0.5B/1.5B/3B models still selected a malicious **age 99** in a tiny fictional attack test. Guard abstention is **not** a corrected model answer. |
| Full synthetic export | [Verified fictional end-to-end path](docs/REAL_MODEL_BENCHMARK.md) exercised import, GGUF, schema, citation review and JSON download without outgoing requests. | Does not establish actuarial interpretation or production-grade reliability. |

**All eight independent production acceptance gates remain FAIL or BLOCKED.** Unmet areas include independently adjudicated OCR accuracy at meaningful scale, adversarial source authority, stronger factual precision, security/privacy review, accessibility/operations sign-off and a successful **authorized** managed-office pilot. See [production acceptance gates](docs/PRODUCTION_ACCEPTANCE_GATES.md), [development status](docs/DEVELOPMENT_STATUS.md) and [roadmap](docs/ROADMAP.md).

Known limitations:

- An OCR token or table-cell match can be **wrong**, and an exact text match may come from an **inapplicable** amendment.
- The app provides page-level PDF source review, but **exact raster-image region highlighting is not fully established**.
- Local GGUF model quality is not stable across different input difficulties. Larger 3B GGUF tests have shown slow completion and timeout risks.
- A green build or fictional test does **not** certify security, source authority, legal plan provisions, privacy, accuracy or compatibility with agency restrictions.
- **Do not use protected PBGC files** before security authorization and production acceptance. Do not upload agency data to GitHub Issues.

## Development (outside the restricted office environment)

A development computer with Node.js and the approved dependency chain can build/test the source:

```bash
npm ci --no-audit --no-fund
npm test
npm run build
```

The output is `dist/index.html`. GitHub Actions publishes that file as `ocr-llm-pipeline-single-html` when the [build workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/build.yml) succeeds. **The office test uses the artifact**, not these commands or an installer.

The separate project [`ErChulo/bulk-ocr-studio`](https://github.com/ErChulo/bulk-ocr-studio) is **not modified by this repository**. This app can import supported JSON/JSONC exports from that project.

## Documentation

| Reference | Contents |
| --- | --- |
| [Interactive office checklist (GitHub Issue #124)](https://github.com/ErChulo/ocr-llm-pipeline/issues/124) | Clickable progress, downloads, 16 test steps, expected results and report template. |
| [Office checklist in Git](docs/OFFICE_TEST_CHECKLIST.md) | Permanent version-controlled copy of the complete procedure. |
| [User guide](docs/USER_GUIDE.md) | Six-screen office setup and day-to-day operation. |
| [Implementation acceptance](docs/IMPLEMENTATION_ACCEPTANCE.md) | Formal technical behavior and verification expectations. |
| [Production acceptance gates](docs/PRODUCTION_ACCEPTANCE_GATES.md) | Release-blocking evidence and independent acceptance thresholds. |
| [Development status](docs/DEVELOPMENT_STATUS.md) | Dated measured results, including limitations and unresolved gaps. |
| [Roadmap](docs/ROADMAP.md) and [changelog](CHANGELOG.md) | Remaining development and version history. |
| [PDF ingestion](docs/PDF_INGESTION.md) and [whole-document extraction](docs/WHOLE_DOCUMENT_EXTRACTION.md) | Parser/OCR behavior, source evidence and JSON workflow. |
| [Real GGUF benchmark](docs/REAL_MODEL_BENCHMARK.md) | Fictional local model and browser evaluation. |
| [Design](DESIGN.md) and [requirements](PRODUCT.md) | Product architecture and requirements. |

**Office test entry point:** https://github.com/ErChulo/ocr-llm-pipeline/issues/124

_Office procedures use short, imperative, ASD-STE100-inspired English. No formal ASD-STE100 certification is claimed._
