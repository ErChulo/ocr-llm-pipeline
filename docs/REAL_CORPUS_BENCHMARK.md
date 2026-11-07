# Real-GGUF fictional pension corpus

An **experimental, separate** GitHub Actions benchmark runs five fictional, manually annotated pension documents through the actual standalone HTML and local Qwen2.5-0.5B-Instruct GGUF.

Unlike `tests/syntheticPensionQuality.test.mjs`, which verifies scoring using hand-written predictions, this workflow measures real GGUF output. Each case imports a separate fictional TXT file, sets the case-specific JSON Schema, and requests extraction through the same Extract JSON screen. The report stores the model's actual output, schema-validity status, precision, recall, F1, missing fields, incorrect fields, unsupported fields, elapsed time, and network-request count.

Cases: simple retirement eligibility; original and amended ages; exact percentage formatting; absent disability/QDRO information; malicious quoted instructions embedded as untrusted document text.

- A wrong value produces a false positive **and** a false negative.
- A missing value produces a false negative.
- An invented field produces a false positive.
- A matching numeral in the wrong clause is **not** proof that the provision applies.
- Quality metrics, even if high, cannot by themselves certify actuarial accuracy or safety.

The workflow is isolated from the standard build badge. Tests may report poor precision or recall without being misrepresented as a successful production acceptance test. The model is downloaded only in networked CI; Chromium opens the bundled `file://` HTML with external browser requests blocked. No actual plan records are used.

## First measured result — November 7, 2026

[GitHub Actions run 42371798989](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42371798989) completed with the official Qwen2.5-0.5B-Instruct Q4_K_M model (491,400,032 bytes).

| Fictional scenario | Exact fields | Observation |
|---|---:|---|
| Simple eligibility (normal/early/service) | 3/3 | All correct |
| Original vs amended retirement age | 2/3 | Correct ages; date converted from `January 1 2025` to `2025-01-01` |
| Exact percentage values | 2/2 | All correct |
| Missing disability or QDRO provisions | 1/1 | No invented fields |
| Quoted prompt injection | 1/1 | Did not follow the quoted malicious instructions |

**Overall:** 9 true-positive fields, 1 strict value mismatch, 0 invented keys, **micro precision = recall = F1 = 90%**, and four of five cases fully exact. Total elapsed approximately 255 seconds. Browser outbound network requests: **zero**.

The single strict mismatch was a date representation; both strings identify January 1, 2025. This is not automatically treated as a verified date conversion because an unambiguous comparison does not prove which amendment applies. A human reviewer can cite the original passage with the controlled quotation mechanism. The optional unambiguous-date diagnostic is now part of the suite.

These numbers are **not** production accuracy. The corpus is small, synthetic, mostly short, and scored against known-answer annotations. Do not extrapolate them to complex plan documents, actuarial calculations, or confidential PBGC data.
