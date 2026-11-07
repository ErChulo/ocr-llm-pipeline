# Playwright end-to-end acceptance (offline)

This workflow is the nearest repeatable surrogate for a person operating the standalone HTML application on a workstation. It **does not** access or control a PBGC workstation.

Run `.github/workflows/full-playwright-acceptance.yml` in GitHub Actions. The workflow has three independent Chromium/Playwright jobs:

| Acceptance requirement | Automated browser evidence |
| --- | --- |
| Download and open `index.html` | Build the actual single-file artifact, load via `file://`, check page heading, theme toggle and embedded worker preflight |
| Check offline document import | Import synthetic selectable PDFs (multiple pages), PDF with ambiguous columns, English OCR image, image-only scanned PDF, and mixed raster/native PDF; inspect source review and corrected transcription |
| Check DOCX/XLSX | Import synthetic DOCX, revised/hidden DOCX, XLSX cached values and CSV, inspect paragraph and cell citations |
| Load and generate with local GGUF | Select checksum-verified tiny GGUF, load browser WebAssembly, generate model text and validate timing metrics; no server is used |
| Perform real source-to-JSON extraction | Select checksum-verified official Qwen 0.5B GGUF and run eight fictional pension cases through the real Extract JSON UI; record strict F1, exact cases, timing and status |
| Review accessibility | Open all four routes and the Guide, run axe WCAG A/AA checks, inspect Escape and keyboard-focus restoration |
| Enforce privacy/network isolation | Block all HTTP(S)/WebSocket browser requests, assert zero external attempts, and use fictional documents only |

The networked GitHub runner downloads fixed, SHA-256-verified model fixtures *before* browser tests. **The browser itself runs with external requests blocked.** It cannot establish the policy, performance, browser flags, file picker, installed fonts, or resource restrictions on an authorized agency-managed Windows workstation.

Artifacts: single-file HTML and PNG screenshots; fictitious JSON quality report; automated accessibility report. These do not contain participant data or private documents. View the workflow run and download the named artifacts; inspect any failed steps rather than suppressing results.

This workflow establishes *technical behavior under Linux Chromium*, not actuarial validity, real-document accuracy, organizational security approval, or production release acceptance.
