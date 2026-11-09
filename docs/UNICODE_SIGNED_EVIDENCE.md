# Unicode signed-value source-citation guard

This deterministic safeguard prevents unsigned numeric or currency claims from citing typographically signed or accounting-parenthesized original values, including Unicode minus/dash variants and invisible formatting between the sign and amount. It never edits original source bytes, original Tesseract/PDF positions or the model's proposed JSON.

The following leading qualifiers are treated as **sign-context ambiguity**, not evidence of a positive amount: ASCII `+` and `-`, Unicode minus `−`, en/em/figure/nonbreaking dashes, small/fullwidth variants, and fullwidth plus. A prefix may contain original whitespace, a currency symbol or zero-width formatting. Accounting parentheses enclosing a value may also contain invisible formatting; the matched positive substring must not be accepted.

Actual signed source literals (including Unicode signs) remain available for review **only when copied exactly**; the evidence layer never silently normalizes signed values. A separate authentic unsigned source occurrence remains selectable while signed copies are excluded.

## Coverage and limitations

- Unit regressions exercise currency strings, percentage strings, integers, 11 sign forms, five invisible separators, accounting parentheses, and exact UTF-16 offset preservation.
- Passing this guard does not establish financial meaning, accounting presentation rules, denominator accuracy, legal applicability, expected benefits, model factual accuracy or universal Unicode spoofing resistance.
- These are fictional local evidence tests, not a large real-OCR holdout. Release stays `0.3.0-beta.1`, all production gates remain open.
