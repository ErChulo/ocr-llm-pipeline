# Production acceptance gates — release-blocking evidence register

**Status date:** 2026-11-08. **Release:** `0.3.0-beta.1` (**NOT production-ready**).
This document records proposed exit criteria and measured evidence separately.
Passing CI, or an exact result on a small fictional fixture, is not production certification.
No real PBGC participants, cases, or identifying data may be used.

### November 8 supplementary evidence — merged PR #103 (no gate closure)

- Exact numeric proposals with no literal source support now deterministically abstain before schema-valid preliminary success. The value and original source/audit trail remain untouched. Real 0.5B/1.5B/3B Qwen two-document physical adversarial runs **still generated malicious age 99** in each model: raw exact-field counts **1/3, 2/3, 1/3**, respectively. One wrong-value abstention was recorded for each model ([CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42527112343)). **An abstention is not a model true positive**; neither factual-model nor adversarial production gate moves from FAIL.
- Integrated main after PRs #102 and #103 passed **352/352** source tests, standalone build and offline smoke ([build CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42527752950)). This does not establish original-source authority, effective-date hierarchy, or independent blinded adversarial coverage. Gates 3, 4, 5 remain blocked/failed.


### November 8 supplementary evidence — PR #102 (no gate closure)

- Source/build **349/349** successful; offline browser/Playwright/accessibility successful, actual Qwen2.5 0.5B still **7/8 exact cases / 93.75% micro F1** ([CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42526704751)).
- Original JPEG **raw** spatial cohort remains **16 TP / 0 FP / 6 FN = 72.73% recall** over 22 annotated eligible pairs. The deployed pure orientation selector, *measured separately* on its three rotated pages, selected **3/3** correct turns and **6 TP / 0 FP / 0 wrong-page / 0 FN**, with 12/12 corrected literal tokens ([CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42526704773)). Do not pool the two readings or infer a population 99.5% precision from six observations.
- An authentic standalone `file://` browser import of a fictional sideways-original-pixels JPEG-PDF with **no PDF `/Rotate`** recovered **4/4** referenced numeric literals, retained actual page 1 and original-page review, and made **zero HTTP(S) requests** ([CI](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42526704771)). Mapped rectangles are inverse-transformed **measured OCR pixel envelopes from an actual PDF.js render**, not inferred original-JPEG/PDF content coordinates; renderer-to-source image geometry remains unverified for all page layouts.
- Gates 1/2/3/4/5/6/7/8 remain **BLOCKED or FAIL**, not PASS. This is a fixed developer fixture, not the mandatory independent 100-document/500-page/5,000-numeral holdout, source-authority review or authorized workplace evaluation. Release stays `0.3.0-beta.1`.


## Decision policy

- **PASS** — all thresholds independently verified on the required population and signed off.
- **FAIL** — an observed defect or metric violates a required threshold.
- **BLOCKED** — required verification, sample size, independent review, or authorization is missing.
- **WAIVED** — narrowly documented and explicitly authorized exception; never treat it as PASS. A waiver does not override applicable security or organizational approval requirements.
- No automatic promotion or release when any mandatory gate is FAIL, BLOCKED, or awaiting authorization.
- Every report must include its artifact hash/commit, test methodology, corpus version, measurement date, exact numerator/denominator, confidence/coverage details where appropriate, and reviewer identity or an explicit "not reviewed" marker.
- Keep **source test counts**, **OCR literal accuracy**, **same-line row proxies**, **spatial cell associations**, and **GGUF field extraction** as separate non-interchangeable measures.

## Gate dashboard

| Gate | Decision | Current measured evidence | Outstanding exit requirements |
| --- | --- | --- | --- |
| 1. OCR accuracy | **BLOCKED** | The fixed nine-page PDF.js-rendered fictional fixture measured **36/36 numeric literals** ([CI 42505286557](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42505286557)). A **different** original-JPEG 12-page raster corpus measured **36/48 literals (75%)** at baseline; measured skew-header association improved but raw rotated JPEG recognition remains 0/12 numeric literals ([PR #96 CI 42519473344](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42519473344)). Known-angle and blind test-only reorientation each recovered **12/12** rotated literals ([PR #98 CI 42520269262](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42520269262)), without changing deployed OCR behavior. | At least 100 independent fictional documents / 500 pages / 5,000 annotated numbers, previously unseen holdout; >=99.5% eligible numeric accuracy and >=98% per adequately sampled scan condition, uncertainty and exclusions separately measured. |
| 2. Spatial cell association | **BLOCKED** | Fixed nine-page browser fixture: **18/18 spatial TP, zero FP**, source-authentic Tesseract pixel envelopes ([PR #82 CI 42514886112](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42514886112)). Separate 12-page original-JPEG real raster: **12/22 TP → 16/22 TP (72.73% recall), zero FP, six FN**, after strictly corroborated ±1.25° header-skew handling ([PR #96 CI 42519473344](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42519473344)). Test-only four-way blind orientation: **3/3 correct turns, 6/6 original-frame spatial associations, zero FP/wrong-page** ([PR #98 CI 42520269262](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42520269262)). Not integrated with PDF.js renderer or workplace deployment. | Independent large blinded cell corpus; >=99.5% accepted precision and >=97% recall, zero wrong-page claims; representative skew/rotations/mixed columns; calibrate abstention, coordinate transforms and original-source verification. |
| 3. Factual source provenance | **BLOCKED** | Parser-derived page/record and original-source review gates exist; [PR #81](https://github.com/ErChulo/ocr-llm-pipeline/pull/81) added instruction-only literal abstention and [PR #91](https://github.com/ErChulo/ocr-llm-pipeline/pull/91) disclaimed-example abstention. Neither is an authority resolver. Experimental raster cell envelopes remain non-export diagnostics. | 100% traceable exported field evidence with zero fabricated citations; independent source-hierarchy, effective-date, amendment, and applicability validation; abstain on unknown governing provisions. |
| 4. Adversarial instructions | **FAIL** | Actual 0.5B, 1.5B, and 3B Qwen2.5 GGUF models each **still generated injected age 99** in the two-file adversarial suite. [PR #81](https://github.com/ErChulo/ocr-llm-pipeline/pull/81) verified one instruction-only prevalidation abstention per model; [PR #91](https://github.com/ErChulo/ocr-llm-pipeline/pull/91) further quarantines explicitly non-governing examples. Blocking a candidate is **not** raw model correctness, general authority resolution, or universal prompt-injection immunity. | 100 independent fictional adversarial cases spanning PDF, DOCX, XLSX, CSV and OCR, zero accepted attacker-controlled critical facts and zero unauthorized actions, correct age 65 or explicit abstention for 0.5B/1.5B/3B on the known exploit, benign false-positive controls. |
| 5. GGUF factual reliability | **FAIL** | Two-file adversarial GGUF result still 0.5B **1/3**, 1.5B **2/3**, 3B **1/3** strict exact raw fields, with each model selecting malicious age 99 despite later abstention. Separate fixed eight-case model runs vary; cannot pool or claim accepted-fact reliability from green CI. | Blinded 0.5B/1.5B/3B factual and provenance holdouts; >=99% accepted critical-field precision and zero unflagged unsupported facts, recall/coverage/abstention, p50/p95 latency, peak RAM and model-load failures on target workstation. |
| 6. Offline security/privacy | **BLOCKED** | Offline Chromium `file://` CI has demonstrated zero outbound browser requests in selected fictional tests; CI runner may download dependencies and GGUF **before** local app execution. | Verify complete workflow and final distributable with zero runtime HTTP(S), WebSocket, CDN, API or telemetry; malicious-file, oversized input, ZIP bomb, memory, interruption, privacy, supply-chain and independent high-severity findings reviews; verify bulk-ocr-studio unchanged. |
| 7. Functional/accessibility | **BLOCKED** | [PR #96](https://github.com/ErChulo/ocr-llm-pipeline/pull/96) passed **331/331** source tests ([build CI 42519473337](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42519473337)), standalone build, offline browser, accessibility and full Playwright with real 0.5B ([CI 42519473514](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42519473514)). These are automated checks, not independent manual accessibility or release approval. | All critical-path normal/negative/recovery checks, manual keyboard/screen-reader/WCAG 2.2 AA audits, no high/critical defects and full release-commit regression verification. |
| 8. Workstation and authorization | **BLOCKED** | No verified authorized target-workstation acceptance or organizational production authorization. | Exact standalone HTML on authorized Windows 11 Chrome/Edge without installations, administrator privileges or network; representative RAM/latency/input-size measurements, recovery documentation, independent security/privacy/domain review, written human acceptance and required organizational authorization. |

## Gate-by-gate exit tests

### 1 — OCR robustness

1. Freeze an independently created fictional set of at least **100 documents, 500 scanned pages, and 5,000 numeric tokens**, with unseen test samples and versioned ground truth.
2. Include skew (positive and negative), 90/180/270-degree rotations, severe blur, low contrast, small serif/sans fonts, JPEG artifacts, ruled/multi-column tables and mixed native/raster pages. Report sample counts by condition.
3. Compute exact numeric token hits/eligible annotated numbers; require **>=99.5%** on the eligible automatic-extraction subset and **>=98%** within each adequately sampled condition. Define eligibility *before* evaluating the holdout, and report exclusions, errors and confidence.
4. Every uncertain/unreadable value must be review-flagged, never reconstructed or silently filled. Wrong-page attribution must be zero.

### 2 — Spatial evidence

1. Independently label page, row, column and region/cell geometry from the original fictional image, without consulting OCR measurements or model outputs.
2. Calculate **TP**, **FP**, **FN**, accepted precision `TP/(TP+FP)` (undefined if no accepted pairs), recall `TP/(TP+FN)`, accepted coverage, page error rate, and abstention frequency. Never score all-abstain as 100% precision.
3. Require **>=99.5%** accepted precision, **>=97%** recall, zero accepted wrong-page associations, and abstention for all known ambiguous intervening-column cases.
4. Derive reported candidate regions exclusively from authentic measured Tesseract pixels plus actual PDF parser page and viewport. A test fixture's authored region is *ground truth*, not a source citation. Manual OCR edits must invalidate stale associations.
5. No raw or transformed source rectangles may be invented. A geometrically plausible row is still unverified factual evidence until reviewed.

**Sampling limitation (additional evidence, not a substitute for any gate):** Even if 18 of 18 accepted associations are correct on a fixed fictional cohort, 100% observed precision is not proof of >=99.5% true precision. Under a hypothetical independent Bernoulli sampling model, the **exact one-sided 95% Clopper-Pearson lower bound** is `0.05^(1/18) = 84.668%`. With zero observed failures, **at least 598 independent pairs** would be needed merely for that statistical lower bound to reach 99.5%. Real table rows on the same pages are dependent and development fixtures are not blinded, so neither 18/18 nor 598/598 can substitute for independently stratified, source-authentic production testing. See `tests/precisionSampleEvidence.test.mjs` for the arithmetic and the explicit refusal to invent a zero-error bound when failures occur.

### 3 — Source truth and applicability

1. Ensure **100%** of exported nonempty facts have inspectable document identity, source location and original-file review trace.
2. Reject fabricated citations, contradictory evidence without explicit resolution, stale confirmation and unsupported interpretations.
3. Enforce documented effective dates, amendment priority and participant applicability, or abstain when documentary authority cannot be established.
4. Use independently verified export fixtures with **zero** accepted critical claims unsupported by their governing evidence.

### 4 — Adversarial resilience

1. Freeze at least **100** independent fictional attacks across CSV, PDF, DOCX, XLSX and scanned OCR, including malicious headings/roles, in-band instructions, forged governing documents, Unicode splitting, appendix text, conflicting tables and citations.
2. Test real Qwen 0.5B/1.5B/3B and the export guard; the known **99 versus 65** exploit must produce authentic **65** or an explicit abstention, never silent acceptance of 99.
3. Require **zero** unauthorized instruction executions or accepted attacker-controlled critical claims in this cohort, and report benign-case false alarms separately.
4. Preserve all source bytes, fingerprints, parser coordinates and audit history. Never assert universal prompt-injection immunity.

### 5 — Actual GGUF reliability

1. Use independently blinded fictional physical-document holdouts for 0.5B, 1.5B and 3B verified GGUF weights; preserve model revisions and SHA-256.
2. Record accepted critical-field precision **>=99%**, recall, F1, document-level exactness, hallucinations, field-source citation accuracy, abstention and accepted coverage. An abstention is not a true positive.
3. Require **zero** unflagged unsupported critical fields in the final cohort.
4. Measure p50/p95 inference and startup latency, peak browser/WASM RAM, failures and machine/browser characteristics. Freeze actual Windows workstation performance limits before PASS.
5. Any model below the threshold must be restricted to explicitly reviewed outputs.

### 6 — Air-gapped privacy/security

1. Run the exact final distributable as `file://` with all runtime network routes blocked; **zero** external HTTP(S), WebSocket, telemetry or asset fetches.
2. Verify local PDF/OCR/WASM/Office processing and no source data exfiltration.
3. Test malformed/oversized files, decompression bombs, untrusted resource references, memory exhaustion, cancellation, security policy and dependency audit.
4. Have **zero** known unmitigated high/critical security findings, and verify no changes to `ErChulo/bulk-ocr-studio`.

### 7 — Functional and accessible acceptance

1. Require **100% passing** source tests, TypeScript, standalone build, offline Playwright and automated accessibility checks on the release commit.
2. Manually verify keyboard navigation, screen-reader announcements, focus restoration, contrast, errors and WCAG 2.2 AA.
3. Document passing normal, abnormal and recovery paths for every critical workflow; no unresolved high/critical defects.
4. Block any release on factual/provenance/privacy regression, regardless of unchanged test totals.

### 8 — Deployment approval

1. Test the exact shipped HTML on an **authorized** representative Windows 11 Chrome/Edge workstation, entirely without internet, software installation, administrator permissions or servers.
2. Verify file imports, real GGUF models, latency/RAM limits, recovery procedures and original-file human review.
3. Complete independent security, accessibility, privacy and factual-domain review.
4. Obtain explicit human release acceptance and all required organizational deployment approval. No model or CI job can grant these approvals.

## Measurement discipline and open work

- Spatial candidate regions and field citations are distinct data types and must remain distinct in the UI, scoring and exports.
- Pin corpora and maintain clean development-versus-holdout separation; no post-test tuning followed by calling the same holdout independent.
- A PASS requires linked results, versioned fixture annotations, clear numerators/denominators, failure inspection, and reviewer authorization.
- Current highest-priority unresolved release blockers are **adversarial authoritative-source selection** and **unseen independently annotated spatial evidence validation**.


### Pending safety regression — PR #101 (2026-11-08)
- The measured-word spatial candidate matcher now has a proposed leading-decimal intervening-column abstention rule and eight fictional regression checks. This is a narrow defect fix. Gate 2 remains **BLOCKED** until independent source-authentic raster measurement meets its existing precision, recall, zero-wrong-page and source-coordinate requirements. The change neither improves the established 16/22 original-JPEG recall measurement nor changes release classification.
