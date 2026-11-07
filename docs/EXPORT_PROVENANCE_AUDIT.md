# Export provenance integrity gate

The application revalidates source coverage and candidate provenance on **every export action**, independently of the visual completion indicators.

A verified extraction must have:

- The same document ID, filename, original byte fingerprint, corrected-source fingerprint and full source text that were reviewed.
- A contiguous, nonoverlapping section sequence starting at UTF-16 source offset zero and ending at the exact final source character. Section identifiers must increase by one.
- Every model candidate trace bound to an exact, existing source section. An invented section number, altered start/end offset, missing span, or gap blocks export.
- A current JSON Schema pass, no unresolved conflicts, a reviewer-confirmed source citation for every nonempty value, mandatory OCR/source-completeness reviews, and privacy review when local identifier screening requires it.

This deterministic check prevents a stale or inconsistent *in-memory audit* from authorizing an export. It does **not** verify legal interpretations, calculate benefits, or establish that the reviewer selected the correct interpretation. No final downloaded output is called actuarially fact-verified automatically.

Code: `src/exportGate.ts`. Tests: `tests/exportGate.test.mjs`.
