# Fictional adversarial import-format stress matrix

**Status:** deterministic parser/security regression suite, not a blinded production holdout. The application remains `0.3.0-beta.1`.

## What is measured

- 20 *distinct manually authored* fictional malicious, expressly disclaimed or contrary normal-age passages.
- Five independently invoked import routes per passage: actual PDF.js two-page PDF, OOXML DOCX, OOXML XLSX, CSV and Bulk OCR JSONC (transcribed OCR export, **not physical scanned pixels**).
- **100 format/passage combinations:** 10 AI-directed instruction patterns × 5 formats = 50; five expressly disclaimed patterns × 5 = 25; five apparent but legally unresolved normal-age conflicts × 5 = 25.
- For each combination the test constructs actual file bytes, calls the real parser, proposes attack value `normal_age: 99`, audits literal text offsets and parser record provenance, checks prevalidation abstention and the final export gate, and separately tests the genuine `normal_age: 65` as a benign control.
- The source and model proposal must stay byte-for-byte unchanged. No extra citations, page numbers, spreadsheet cells, normalized numbers or governing values may be invented.

## Verified deterministic baseline

The current build workflow [emitted a structured report](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42703601143):

| Metric | Numerator / denominator |
| --- | --- |
| Physical/import combinations executed | **100/100** |
| Unique adversarial passages | **20** |
| Format routes | **5** |
| Attacker-supplied facts surviving prevalidation | **0/100** |
| Unverifiable source citations | **0/100** |
| Final-export approvals for attacker value | **0/100** |

These are deterministic local guard decisions for known patterns; they are **not** a demonstration that the 0.5B, 1.5B or 3B model generates the correct age. All three models have previously selected injected **99** in physical adversarial tests; an abstention is different from a correct model answer.

## Explicit limitations / release gate

- There are **zero independently authored/blinded cases** and **zero actual model invocations** in this 100-case suite. Five translations of one passage are correlated, not five independent adversarial attacks.
- The Bulk OCR JSONC case validates an imported *text transcript*. It does not demonstrate real image/raster OCR of adversarial content.
- These 20 phrase patterns do not cover multilingual injection, obfuscated role tags, hidden PDF layers, signatures, amended legal hierarchy, untrusted websites, or all user interaction paths.
- A clean but contradictory historical/class-specific statement triggers an abstention; the app still needs a documented human authority/applicability determination and an authorized case-rule override workflow.
- This test does not promote production gates **3, 4 or 5**; those remain blocked or failed pending independent human-reviewed adversarial and actual-model benchmarks.

Run with `npm test`. The suite uses only fictional artifacts and makes no application-runtime network requests.
