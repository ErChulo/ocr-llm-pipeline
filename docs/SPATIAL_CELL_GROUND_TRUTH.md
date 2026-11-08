# Spatial cell ground-truth unit benchmark (fictional)

This bounded benchmark in `tests/spatialCellGroundTruth.test.mjs` uses **independently hand-annotated** expected age/factor pairs and raster-pixel rectangles. The fixed word rectangles are synthetic input to the geometry matcher, not output from a fresh Tesseract scan. Its purpose is to check pair selection and fail-closed behavior independently of the matcher's implementation.

The cases cover unambiguous rows, reordered transcript text, a missing OCR numeral, and seven independently specified intervening numeric-cell formats (comma-separated, currency, accounting, fractional, scientific, Unicode sign, percentage). The reference marks intentionally ambiguous layouts as having **no permissible cell association**. Missing OCR text retains its original two reference pairs and counts as recall loss when the matcher abstains.

Definitions:

- **True positive:** candidate's age/factor literal pair agrees with a permissible independent reference pair and the page and measured region match the annotation.
- **False positive:** any returned age/factor pair without a permissible reference match.
- **False negative:** a permissible annotated pair that was not returned, including OCR omissions.
- **Precision:** TP / (TP + FP), where zero returned pairs are scored as zero for that case; corpus aggregation is count-weighted.
- **Recall:** TP / (TP + FN).
- **False-match rate:** FP / (TP + FP), reported separately from case abstention.
- **Abstention rate:** complete-table abstentions / fixture cases.

For this fixed 10-case unit cohort, the test's expected counts are TP=4, FP=0, FN=2, and 8 table abstentions (precision=1, recall=2/3, false-match rate=0, abstention rate=0.8). These are fixture-level assertions, **not verified CI results** until the corresponding workflow passes, and **not** general OCR or production quality rates. The intentionally high abstention proportion reflects deliberately unsafe layouts.

**Open acceptance gate:** Independently annotate actual fictional scanned-PDF pages with page/image-region provenance and compare genuine Tesseract word boxes to image-ground-truth cell regions across skew, rotation, degradation, density, multi-column layouts and unseen typography. Do not equate source-text row co-occurrence, synthetic rectangles, or this unit benchmark with real-raster spatial precision/recall. No pixel region is invented at runtime.
