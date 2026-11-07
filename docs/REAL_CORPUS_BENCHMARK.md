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
