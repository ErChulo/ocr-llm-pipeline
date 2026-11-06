# Whole-source JSON extraction — implementation notes

## Current behavior

The React **Extract JSON** route now divides an imported text document into consecutive, nonoverlapping sections and prompts the selected local GGUF model for each section. The algorithm checks **complete text coverage** before it reports a result. It does not skip text silently.

The aggregate stores:
- document name and ID;
- section index and exact start/end offsets into the imported text (JavaScript UTF-16 string indices);
- candidate values by JSON Pointer path;
- sections that produced each candidate; and
- conflicts when different sections produce incompatible values.

**These offsets identify the processed text sections. They are not proof of a fact, and they are not PDF pages, PDF regions, Word paragraphs, or Excel cells.**

## Safe outcomes

1. The parser must receive one complete JSON object per section.
2. If a section fails, is canceled, or is incomplete, the entire extraction is rejected for export.
3. Null, blank strings, and empty arrays are treated as missing (not factual claims). Zero and false remain meaningful.
4. Identical values from different sections are merged with their section references.
5. Contradictory values stay unresolved until the user selects a candidate. A selection is a human review decision, **not** independent source verification.
6. The user can edit the resulting JSON and run JSON Schema validation again.
7. The export button remains disabled unless all conflicts are resolved and the latest draft passes JSON Schema.
8. Exports carry structure-validation status **facts unverified**, the coverage record, and the candidate source-section audit.

## Limits and next milestone

- Estimated section size derives from model context and schema length. It is a character-based heuristic; only the model tokenizer can determine exact context use. Context overflow stops extraction; this prototype does not silently remove data.
- At most 256 sections are accepted per document. Longer documents require an explicit batch/checkpoint workflow in a later milestone. No partial export is permitted.
- This is **text extraction only**. PDF/DOCX/XLSX parsing, OCR, exact page/cell provenance, evidence quote verification, PII screening, and real offline GGUF acceptance tests are pending.
- Test fixtures are synthetic and contain no PBGC case data. Passing synthetic tests and CI does not establish actuarial accuracy.

## Reproduction

Run on a development machine:

    npm install
    npm test
    npm run build

The GitHub Actions workflow does the same and produces a single HTML bundle on successful compilation. Actual GGUF + file:// browser acceptance still requires an independent test.

## Context reservation and JSON generation

The source-section budget reserves the configured `maxTokens` output space before estimating how much text can fit in the selected model context. The budget remains a heuristic because character counts are not true LLM token counts. The local Wllama adapter requests JSON-object mode **only for extraction**, not for normal chat. Any model or tokenizer that cannot support a request must report an error; the app must not silently remove source text.
