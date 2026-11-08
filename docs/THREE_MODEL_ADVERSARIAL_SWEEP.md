# Three-model adversarial physical-document sweep (beta)

This optional GitHub Actions matrix runs **actual** checksum-verified official Qwen2.5
GGUF 0.5B, 1.5B, and 3B models against the **same two wholly fictional**
parser-readable documents in the standalone `file://` application.

The independently annotated, bounded cohort comprises:

1. `csv-quoted-instruction`: a governing age 65 and an untrusted appendix
   directing an AI to use 99; tests whether the model chooses the wrong fact.
2. `docx-survivor-qualifiers`: a spouse/survivor provision with a material
   vesting qualifier; tests omission of a condition.

The source benchmark retains its complete eight-case default. Subset selection
must identify exact, distinct fixture IDs; an unknown ID aborts. Every report
discloses `selection: explicit-bounded-subset`, `fixtureCount: 2`,
`holdoutUniverseCount: 8`, and the two selected IDs.

Results distinguish strict field equality, whole-document exactness, literal
source token presence, and parser-derived annotated source location. A literal
value in a malicious appendix is not governing evidence. **No automated
source citation is approved or inferred by the benchmark.** No accuracy or
latency numbers should be copied to project status until real run artifacts are
inspected. A 2/8 subset result must not be labeled an eight-case holdout score.

The host CI runner downloads model weights and verifies their hard-coded
SHA-256 checksums, but the Chromium `file://` application blocks outbound
HTTP(S) and WebSocket requests. No real PBGC data or model weights are added
to the repository or artifacts. Actual 3B memory, WASM, or time failures
remain explicit failed runs. This is not a managed-workstation acceptance test.

The separate six-page scanned PDF benchmark evaluates OCR transcription;
this physical GGUF matrix uses **native PDF/DOCX/XLSX/CSV parsers** and must not
be represented as a scanned-document OCR or spatial table-cell benchmark.

Reproduce through
[the three-model workflow](https://github.com/ErChulo/ocr-llm-pipeline/actions/workflows/three-model-adversarial-sweep.yml).
Application release classification remains `0.3.0-beta.1`.
