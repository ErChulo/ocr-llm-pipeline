# Selected-source instruction citation guard (beta)

## Failure mode

A fictional CSV contains an authentic retirement age of **65** in its first row
and a separate instruction-like appendix saying to output age **99**.
Previous tests showed actual Qwen 0.5B, 1.5B and 3B models selecting 99.
A source-wide prompt-injection warning requires human review, but merely
acknowledging that warning should never make the quoted 99 **governing evidence**.

## Change

The final JSON export gate now screens each **selected literal evidence
match** using the exact source text at its original UTF-16 offsets. It examines
the containing line and at most three immediately preceding lines for
AI-directed overrides, impersonated role headings and split instructions.
If the selected evidence comes from such a passage, export is blocked
**even after source-warning acknowledgement**. The reviewer must select
an authentic governing passage/value instead; the application never infers
which pension provision is authoritative and never silently changes model
output, source text, hashes, records, or citations.

This is a bounded local heuristic, **not** a prompt-injection sanitizer,
automatic legal-applicability decision or guarantee that untrusted facts
cannot be quoted elsewhere. An unusually long candidate context fails closed.
It can produce false positives when legitimate data appear in instruction-like
text or immediately after it; the prescribed response is to verify and
restate the fact from an independent authoritative source, not bypass review.
The existing source-wide warning still applies separately.

## Verification and limits

The fictional test suite checks CSV parser-derived row locations, a correct
earlier age 65, an incorrect later age 99, multiline/obfuscated role headings,
and an explicit reviewer acknowledgement. Both legitimate positive and
malicious negative examples are tested; no private records are used.

Remaining gates: independent red-team prompt injection on actual GGUF models,
field-level applicability verification, exact spatial OCR cell provenance,
user-centered handling of overblocking and real approved workstation testing.
Release remains `0.3.0-beta.1`, not production-ready.
