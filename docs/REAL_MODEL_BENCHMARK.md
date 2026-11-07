# Real instruction-following GGUF benchmark

This **separate, experimental** CI workflow is not part of the baseline build badge. It measures a practical local model's ability to produce schema-valid, known-answer JSON from fictional pension provisions.

- Model: official [Qwen2.5-0.5B-Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF), Q4_K_M, approximately 491 MB.
- Model file SHA-256: `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db` (published by Qwen at Hugging Face).
- Model weights download only on the networked **GitHub Actions runner** and are not uploaded as artifacts, copied to the public repository, or fetched by the browser.
- App opens `dist/index.html` through `file://`; all HTTP(S) / WebSocket requests during the test are intercepted and blocked.
- The model is loaded via the same GGUF picker used by real users.
- The Settings page's synthetic known-answer test scores four plan-related fields. The report includes result, score, load and overall elapsed time, zero-network check, and any error.
- The test report and screenshot are uploaded as workflow artifacts.

**Important:** A passing four-field synthetic check does not establish robust actuarial extraction quality. Missing dates, amendments, plan interpretations, structured tables, contingencies, OCR noise, documents exceeding context, and actual workplace hardware remain untested. A failure or low score is a legitimate finding; do not silently change the expected answers to force a pass.

Workflow: `.github/workflows/model-benchmark.yml`.

Before calling the application production grade, benchmark several representative instruction-tuned GGUF sizes using synthetic multi-page pension documents with measurable precision, recall, source evidence and latency.

## Integrated export-path coverage

The integrated benchmark imports a synthetic TXT pension document through the UI, requests JSON from the real GGUF model, validates the resulting JSON Schema, selects and confirms source matches, exports via the actual browser download action, and checks the saved JSON's source-file SHA-256 and expected benefit ages. This is still a small synthetic acceptance case, not a production actuarial benchmark.


## CSP-safe end-to-end gate

The full pipeline browser benchmark now runs automatically on changes to extraction, evidence, export, and schema-validation source files. The app uses an interpreted local JSON Schema validator. This avoids Ajv's dynamic JavaScript compilation, which was blocked by the strict offline Content Security Policy. Earlier attempts uncovered and prompted fixes for CSP-based schema validation and a React checkbox event-handling bug. A subsequent complete test passed on November 6, 2026.

## Verified full-pipeline result — November 6, 2026

[GitHub Actions run 42248309834](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42248309834) **passed** with the official Qwen2.5-0.5B-Instruct Q4_K_M GGUF. Its log records:

- Synthetic four-field pension-plan extraction: **4 of 4 correct**.
- Single-page fictional TXT import, actual Wllama extraction, JSON Schema validation, reviewer selection of literal source text, and browser JSON download: **passed**.
- Export verification: two documented fields, original input SHA-256 matched, source coverage marked complete, expected ages/service present.
- External network requests during the `file://` browser run: **0**.
- Measured model load: **6,746 ms**; test elapsed **84,497 ms** through the known-answer check; full-pipeline elapsed thereafter roughly **162,313 ms**.
- The code and test fixtures contain no real pension participant records.

This confirms that the **small synthetic end-to-end path** worked. It does *not* validate complex plans, a larger GGUF, OCR correction accuracy, adversarial documents, PBGC hardware, or regulatory interpretation.

## Phase diagnostics (November 2026)

The integration test records checkpoints for loading, known-answer scoring, extraction, citation review and export. If extraction fails, it captures bounded UI messages, any parser or schema errors, and optional Chromium JS heap metrics. These diagnostics use **fictional** documents only; the browser remains offline. A large-model timeout is not automatically classified as a memory failure or a hallucination: the report distinguishes an application-level error from a timeout and records the last completed phase. JavaScript heap metrics do not measure all WebAssembly allocations.

## 3B development limitation

The official 3B GGUF passed file verification but did not complete the full extraction/export test before the 420-second per-step timeout in [CI run 42370925133](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42370925133). This is a known runtime/accuracy acceptance failure, not evidence of a corrupt model. New phase diagnostics are included in subsequent benchmark source for distinguishing slow generation, schema errors, and browser resource exhaustion. No 3B production-readiness claim is made.

## Bounded 3B feasibility test

The separate [3B feasibility workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/3b-feasibility.yml) runs a checksum-verified official Qwen2.5-3B-Instruct Q4_K_M (~2.105 GB) against the same single-file offline browser. It measures **model loading plus the four-field synthetic model-quality check only**, with a nine-minute step cutoff. It reports checkpoint phases and download-free/offline-browser status without attempting long full-document extraction. The full 3B pipeline has previously exceeded a 420-second extraction wait and remains **unverified**. Distinguishing the fast loading phase from the slow generation phase is essential before changing the runtime backend or claiming production support.
