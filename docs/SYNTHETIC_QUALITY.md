# Synthetic pension extraction quality corpus

This contains **only fictional source documents and manually annotated values**. There are no PBGC case records or member identifiers. The fixtures live in `tests/fixtures/syntheticPensionCases.mjs`; the deterministic evaluator lives in `src/syntheticQuality.ts`.

Eight independent scenarios cover: simple eligibility, superseding amendments, rate precision, normal benefit forms, missing information, adversarial quoted instructions, survivor eligibility, and accrual freezes versus vesting. Tests verify source coverage, conflict non-resolution, quote boundaries, and field-level precision / recall / F1.

For each expected field, the evaluator assigns one TP only when both key and exact value match. An incorrect value contributes **one FP and one FN**; an invented key contributes one FP; a missing key one FN. Micro precision, recall and F1 aggregate these counts. An empty ground-truth document is not called a successful extraction.

**Important:** Existing source tests use *prewritten correct and incorrect JSON outputs*, not real LLM inference. A perfect score on these fixtures proves the **scorer** is implemented correctly, not that Qwen or any other GGUF reliably solves these scenarios.

The planned next benchmark is to feed the fixtures into the actual offline model and record real performance. Document precedence cannot be inferred merely because an amendment appears later, and a literal quote match does not establish applicability or regulatory correctness.
