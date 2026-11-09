# Independent OCR release-evidence scoring contract

**Purpose:** Evaluate the arithmetic, coverage and minimum sample requirements of the OCR production gates. This tool is a **scorer**, not an OCR engine, benchmark source, source-archive verifier, independent auditor or release-candidate certifier.

Module: `scripts/score-independent-ocr-acceptance.mjs` (`scoreIndependentOcrAcceptance`). Unit tests: `tests/scoreIndependentOcrAcceptance.test.mjs`.

## Required input structure

```json
{
  "corpusId": "independent-fictional-corpus-version-id",
  "sourceType": "fictional",
  "annotationsSha256": "64-character SHA-256 hexadecimal digest",
  "candidateCommitSha": "40- or 64-character Git commit digest",
  "pages": [
    {
      "documentId": "fictional-document-001",
      "page": 1,
      "sourceSha256": "64-character digest of original document bytes",
      "conditions": ["baseline"],
      "numeric": {"expected": 10, "correct": 10, "wrongPage": 0},
      "spatial": {
        "expected": 2, "correct": 2, "falseAccepted": 0,
        "wrongPage": 0, "mustAbstain": false, "abstained": false
      }
    }
  ]
}
```

Every page is keyed by `documentId` and original parser page number. The document hash must agree across all pages of that document. Annotations must come from an **independent original-image review**, not from OCR output. Values in a JSON manifest are untrusted assertions until source rasters, frozen annotations and observed application measurements are separately verified.

## Automated requirements

| Acceptance variable | Machine check |
| --- | --- |
| Original fictional documents | At least **100** unique IDs, with consistent source SHA-256 |
| Original scanned pages | At least **500** unique document/page pairs |
| Original numeric annotations | At least **5,000**, counted once per original page |
| Numeric exact accuracy | `correct/annotated >= 0.995`; zero numeric wrong-page claims |
| Scan-condition minimum | At least **20 pages per required stratum** and `correct/annotated >= 0.98` |
| Spatial accepted precision | `TP/(TP+FP) >= 0.995`; undefined if all abstain |
| Spatial eligible recall | `TP/(TP+FN) >= 0.97`; undefined if no eligible rows |
| Source-page provenance | Zero wrong-page accepted spatial pairs |
| Known intervening numeric-column ambiguity | Every explicitly annotated ambiguous page must abstain |

The required strata are baseline, low contrast, blur, positive/negative skew, all three quarter-turn rotations, small-serif text, JPEG artifacts, ruled tables and mixed layout. The minimum 20 pages per condition is a conservative **engineering precondition**; it does **not** itself establish statistical power, independence, representative deployment prevalence or release approval.

**Statistical caution:** Even 598 accepted error-free *independent* spatial pairs are required merely to put the one-sided 95% exact binomial lower limit above 99.5%. Pairs from a shared OCR page are correlated; this binomial calculation is not production certification.

## Explicitly not automated

- The scorer **cannot verify that ground truth was independently authored** or frozen before model selection; source hashes in a manifest are claims until checked against the actual archived bytes.
- It **cannot prove** zero invented source coordinates, citation authority, participant applicability, adversarial instruction immunity, model factual accuracy, supply-chain security, WCAG manual testing or workstation approval.
- Its return fields `productionGatePassed` and `independentlyAdjudicated` are **always false**, even when all mathematical thresholds are met. Human adjudication and separately recorded evidence must complete the release decision.
- The included 100-document/500-page/5,000-number *unit test* uses **simulated counts only**; it does not report a single new real Tesseract recognition or independent measurement.

No PBGC participant data or prohibited workplace data may be used.
