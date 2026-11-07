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

## On-device eight-case benchmark (development feature)

The Settings route now offers an optional **Run eight-case benchmark** action for the currently loaded GGUF. It uses the same eight canonical fictional cases as source tests: normal/early retirement, amended age, percentage strings, normal form, unknown-data abstention, quoted prompt injection, survivor conditions, and separation/accrual freeze. The actual model's outputs are scored with strict field-level micro precision/recall/F1 and per-case exact matches. Invalid JSON or model generation errors are recorded as failed cases and lower the score; a canceled run produces no report. The result can be downloaded as `ocr-local-model-corpus-benchmark.json` and shared without private plan data.

This local feature has deterministic automated tests and browser-control coverage, but **no new eight-case accuracy score may be claimed until a specific model completes the full run**. In particular, the historical five-case 90% diagnostic above must not be mislabeled as an eight-case result. Neither score establishes factual or actuarial correctness in real pension documents.

## Reproducible real-model eight-case run

The independent `.github/workflows/eight-case-gguf-benchmark.yml` workflow downloads the **official checksum-verified Qwen2.5-0.5B-Instruct Q4_K_M** model on the networked GitHub Actions runner, builds the standalone HTML, and opens it through `file://` with outbound Chromium requests blocked. The runner sets `BENCHMARK_CASES=all` to evaluate all eight canonical fictional cases, while the earlier five-case baseline remains reproducible with the script's default mode. The report includes the cases, strict micro precision/recall/F1, exact cases, failures, elapsed times and date-format diagnostics.

The workflow is intentionally separate from routine build status. A passing workflow means a reproducible synthetic diagnostic executed, **not** that a production accuracy threshold or actuarial interpretation has been certified. Once a complete run is verified, record the actual model score and run URL here without altering expected answers.

## Verified eight-case real-model result — November 7, 2026

[GitHub Actions run 42408879295](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42408879295) completed successfully with the official checksum-verified **Qwen2.5-0.5B-Instruct Q4_K_M** model, in a Chromium `file://` session with **zero browser network requests**.

- **8 fictional cases**, **4/8 entirely exact**, 12 true-positive fields, 4 false positives and 4 false negatives, **strict micro precision = recall = F1 = 75%**. Elapsed time: **392.8 seconds** (~6.5 minutes), including model loading and eight source runs.
- Entirely exact: simple eligibility, rate precision, unknown data, and quoted prompt injection.
- Historical amendment date: returned `2025-01-01` instead of the source's `January 1 2025`; exact string mismatch and literal citation review blocked unsubstantiated normalization.
- Normal form: returned `FICTIONAL PLAN` rather than the documented `SLA` for single participants. This is a **substantively incorrect extraction**.
- Survivor condition: returned `QPSA eligibility requires a vested participant with a surviving spouse.` instead of the expected exact condition `vested participant with a surviving spouse`; the underlying meaning overlaps but the field is not exact.
- Separation/freeze date: returned `2022-08-01` instead of `August 1 2022`. The source-evidence gate blocked unsupported literal date representation.

The older five-case run scored 90% strict F1; its corpus is different, so the 75% eight-case result is **not** a like-for-like regression measurement. Both are small fictional datasets, not representative pension plan accuracy. Current 0.5B quality is inadequate for unattended production extraction. Verify whether 1.5B/3B GGUF results justify their higher runtime and memory costs before release.

## Independent real Qwen 1.5B eight-case evaluation

A second, optional workflow in `.github/workflows/1p5b-gguf-benchmark.yml` loads the previously checksum-verified official Qwen2.5-1.5B-Instruct Q4_K_M GGUF on a networked GitHub Actions runner, then runs the standalone application under `file://` with external browser requests blocked. It evaluates all eight canonical fictional cases through the same interactive source-to-JSON path. Its per-case timeout is 300 seconds; timeout is a reported failure, never an invented successful extraction.

The download occurs **only on GitHub Actions**, not on any workplace computer. The workflow uploads only fictional-case diagnostics and a screenshot, not model weights or private files. **Measured result (November 7, 2026):** The complete official 1.5B model scored **87.5% strict micro F1** with **6/8 exact cases**, 286.1 seconds overall, and zero outbound browser requests ([CI run 42420311141](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42420311141)). The two incorrect field values were reformatted dates with added punctuation. The contemporaneous 0.5B prompt benchmark also scored 87.5%, but had a different error distribution and a different CI runner. These limited synthetic results do **not** establish that the larger model is more accurate, faster on equivalent hardware, or safe for production actuarial work.
