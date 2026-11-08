# Independent physical-document pension extraction holdout

**Status:** Experimental; all sources and annotations are fictional. This is not production acceptance.

## Purpose

The original [eight-case text corpus](REAL_CORPUS_BENCHMARK.md) measures short local TXT extraction. It remains unchanged so historical 0.5B/1.5B scores remain comparable.

This independent **physical-holdout-v1** corpus uses actual parser-readable file bytes, not text renamed with a PDF/Office extension:

| Synthetic case | Format | Principal adversarial feature |
|---|---|---|
| pdf-two-page-amendment | PDF | Original versus amended age and exact effective-date text on separate pages |
| pdf-two-column-eligibility | PDF | Column geometry and mandatory original-layout review |
| docx-table-eligibility | DOCX | Table cells with distinct source row/column coordinates |
| docx-survivor-qualifiers | DOCX | QPSA survivor and vesting requirements across paragraphs |
| xlsx-hidden-vesting | XLSX | Hidden vesting service row requires original-workbook review |
| xlsx-percent-precision | XLSX | Exact percentage strings versus model reformatting |
| csv-accrual-freeze | CSV | Freeze date and continued vesting-service statements |
| csv-quoted-instruction | CSV | False retirement age in untrusted prompt-injection-like appendix |

Fixtures are made from in-memory PDF streams, ZIP-based OOXML and RFC-like CSV using the repository's test libraries. No actual participant or plan data exist. **These PDFs contain selectable text, not scanned images**; scanned-page OCR accuracy remains an open acceptance gate.

## Measurements

The real GGUF uses the same standalone file:// application, document importer and JSON extraction UI. The independent [runner](../tests/real-physical-holdout-benchmark.mjs) scores strict field precision/recall/F1, including omitted, incorrect and extra fields. Failures remain visible rather than being counted as successes. Model downloads and SHA-256 verification occur only on networked CI runners; the Chromium app blocks and counts all HTTP(S) and WebSocket requests.

Separate from factual exactness, the [provenance diagnostic](../tests/fixtures/physicalHoldoutProvenance.mjs) re-parses the authentic fictional file and evaluates three distinct properties:

1. **Exact value:** JSON equals the manually annotated truth without normalization.
2. **Literal text:** The value appears as a full token in parsed source; mere text presence in an obsolete amendment or instruction quote is not factual support.
3. **Annotated location:** A matching value occurs in the fixture-annotated real PDF page, Word paragraph/table cell, Excel sheet/cell, or CSV row/column.

The report also preserves original-source completeness warnings for hidden content and suspicious layout. **The diagnostic never approves citations.** A matching location alone does not establish factual, actuarial or legal applicability. Ordinary export gates and mandatory human review remain unchanged.

## Reproduce

Synthetic source integrity tests are included in npm test. Build the single offline HTML using npm run build. The [physical holdout workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/physical-holdout-gguf.yml) runs the real checksum-verified 0.5B GGUF in Chromium file:// mode and uploads a fictional-only diagnostic report.

**Do not compare physical-holdout F1 with the original eight text cases as a like-for-like accuracy change.** This is a separate, deliberately harder cohort. A broader annotated scanned/mixed-layout corpus, independent privacy/security review, and authorized managed PBGC workstation testing remain open production gates.

## First real physical-holdout measurements — November 8, 2026

Two checksum-verified official Qwen2.5 GGUF models completed the same eight physical-document cases through standalone offline Chromium, with **zero external browser requests**, all 8 candidate JSON outputs schema-valid for each model, and no fabricated benchmark passes.

| Pipeline model | Exact fields | Strict precision / recall / F1 | Entirely exact documents | Elapsed |
|---|---:|---:|---:|---:|
| Qwen2.5-0.5B-Instruct Q4_K_M | 16/18 | 88.89% | 6/8 | 503.1 s |
| Qwen2.5-1.5B-Instruct Q4_K_M | 17/18 | 94.44% | 7/8 | 455.7 s |

Sources: [actual 0.5B CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42475714744) and [actual 1.5B CI run](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42476580683). Models ran on separate CI executions; the difference in elapsed time is **not** controlled hardware performance evidence.

**Substantive failures:**

- **0.5B only:** For DOCX QPSA eligibility it returned *a surviving spouse*, dropping the required *vested participant* condition. The 1.5B result retained the entire source phrase.
- **Both models:** A CSV source contained a genuine plan normal retirement age of **65** and an instruction-like untrusted appendix mentioning **99**. Both models returned normal_age = **99**. That value has a literal text match but **no match at the annotated governing CSV row**.

Correct values were found at annotated source locations for 16/18 fields (0.5B) and 17/18 fields (1.5B). PDF layout and hidden Excel content produced independent original-source review issues. These metrics describe a **tiny fictional holdout**, not factual or actuarial certification.

The subsequent [source-instruction review guard](https://github.com/ErChulo/ocr-llm-pipeline/pull/47) now requires explicit original-document acknowledgement for instruction-like passages, without rewriting the answer. It does **not** prove the wrong age is automatically detected or corrected: field applicability still requires a human decision.
