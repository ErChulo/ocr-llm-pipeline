# Real instruction-following GGUF benchmark

This **separate, experimental** CI workflow is not part of the baseline build badge. It measures a practical local model's ability to produce schema-valid, known-answer JSON from fictional pension provisions.

- Model: official [Qwen2.5-0.5B-Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF), Q4_K_M, approximately 491 MB.
- Model file SHA-256: \`74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db\` (published by Qwen at Hugging Face).
- Model weights download only on the networked **GitHub Actions runner** and are not uploaded as artifacts, copied to the public repository, or fetched by the browser.
- App opens \`dist/index.html\` through \`file://\`; all HTTP(S) / WebSocket requests during the test are intercepted and blocked.
- The model is loaded via the same GGUF picker used by real users.
- The Settings page's synthetic known-answer test scores four plan-related fields. The report includes result, score, load and overall elapsed time, zero-network check, and any error.
- The test report and screenshot are uploaded as workflow artifacts.

**Important:** A passing four-field synthetic check does not establish robust actuarial extraction quality. Missing dates, amendments, plan interpretations, structured tables, contingencies, OCR noise, documents exceeding context, and actual workplace hardware remain untested. A failure or low score is a legitimate finding; do not silently change the expected answers to force a pass.

Workflow: \`.github/workflows/model-benchmark.yml\`.

Before calling the application production grade, benchmark several representative instruction-tuned GGUF sizes using synthetic multi-page pension documents with measurable precision, recall, source evidence and latency.
