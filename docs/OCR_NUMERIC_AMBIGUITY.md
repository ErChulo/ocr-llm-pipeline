# Local OCR numeric ambiguity warning — experimental beta

The importer now counts OCR tokens containing a mix of ASCII digits and
visually confusable letters: **O/0, I/l/1, S/5, B/8, Z/2**. For example,
a scanned fictional factor may be transcribed as `0.8O00` rather than
`0.8000`. Numeric recognition is **not corrected automatically**: OCR text,
its SHA-256 processing history, original page numbers, document records and
source citation precision stay unchanged.

The same single mandatory source-review issue shows a **count-only**
diagnostic for scanned PDF and image OCR. Supplemental full-page OCR of
mixed PDF pages adds a count-only warning while retaining the existing
mixed-page review issue. Numeric examples or potential identifiers from the
user's document are never copied into warning logs or diagnostic counts.
A value of 100 means **at least 100** suspect number-like tokens.

This is a **heuristic review aid**, not a verifier. It can miss entirely
omitted numbers, swapped digits, missing decimal places and substitutions
that remain valid digits. It can flag codes like `B2` even if the code was
recognized correctly. A zero count does not mean numeric OCR is accurate,
and confidence is not a factual correctness score. It neither maps words to
table cells nor creates raster text bounding boxes; spatial provenance must
be tested separately.

Tests are wholly fictional. Real offline Chrome/Edge testing, broader
numerical accuracy and visual table-cell association remain unpassed gates.
The application remains `0.3.0-beta.1` (beta, not production-ready).
