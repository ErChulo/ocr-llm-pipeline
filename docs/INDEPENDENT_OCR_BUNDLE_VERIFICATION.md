# Offline original-byte integrity for fictional OCR holdouts

**Status:** engineering evidence tooling only; beta `0.3.0-beta.1`. This does **not** replace an independent blinded OCR accuracy benchmark.

The [acceptance scorer](../scripts/score-independent-ocr-acceptance.mjs) checks reported counts and metric thresholds, but source SHA-256 fields in an unverified JSON report are merely assertions. The [bundle verifier](../scripts/verify-independent-ocr-bundle.mjs) now checks those assertions against the *actual original file bytes* and the annotations file.

## Inputs

1. `report.json`: the existing scorer format, with a fictional corpus ID, candidate commit SHA, `annotationsSha256`, and per-page `documentId` and `sourceSha256`.
2. `index.json`: a literal list of all original fictional files. Example:

```json
{
  "annotationFile": "annotations.json",
  "originals": [
    {"documentId":"fictional-001","relativePath":"originals/fictional-001.pdf"}
  ]
}
```

3. A local folder containing exactly the referenced `annotations.json` and original fictional files (PDF/PNG/JPEG/etc.). Multiple page records for the *same* PDF cite that PDF's exact SHA-256. The verifier does not invent a page-level hash from a whole-file hash.

## Engineering-machine verification

```sh
node scripts/verify-independent-ocr-bundle.mjs report.json index.json /path/to/fictional-holdout
```

The script uses Node's built-in filesystem and SHA-256 only, without outbound requests. It rejects missing/tampered originals, modified annotations, traversal paths, symlinks, duplicate document IDs, duplicate physical file bytes masquerading as different independent documents, extra unreferenced originals and oversized members. Its JSON output includes `originalFileByteVerification: verified-against-archived-local-bytes` and the existing mechanical threshold results. **It always returns `independentlyAdjudicated: false` and `productionGatePassed: false`.** A valid small bundle passes integrity but does *not* meet corpus-size targets.

This is an engineering/CI verification command, **not** a command to execute on the restricted PBGC workstation, where no Node installation is required or authorized. This project must never upload protected participant or plan records.

## What it cannot verify

- Whether the original files are genuine scans or OCR-derived/generated text; the verifier reads bytes but does not inspect each page's pixels.
- Whether the pages and thousands of numeric annotations were independently selected, blinded, or correctly assigned.
- Whether per-page precision/recall counts came from the shipped single-file OCR executable, or whether each false association was counted.
- Governing plan authority, real GGUF factual accuracy, 100 independent attacks, managed-workstation security, and final authorized acceptance.

The acceptance register remains FAIL/BLOCKED on all eight gates until substantive independent evidence is supplied, not merely because this tool reports matching hashes.
