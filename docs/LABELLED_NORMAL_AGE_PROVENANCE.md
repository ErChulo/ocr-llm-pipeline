# Exact field-to-original-source normal age attribution

**Beta guard.** An exact numeral anywhere in a document cannot automatically support `normal_age` or `normal_retirement_age`.

## Why

A fictional plan states `normal retirement age 65`, and separately reports that a participant died at age `99`. A local model may incorrectly output `normal_age: 99`. The number 99 **does occur in the source**, so a naive exact-literal match is not adequate evidence of the normal-age field.

## Narrow deterministic behavior

- Only explicitly labelled *normal-retirement-age* source claims and original UTF-16 numeral offsets are admitted as corroborating evidence for a plain numeric normal-age field, when at least one such labelled claim is available.
- A proposed value appearing **only in a different field** (such as a participant age, other year's value, or a quotation without a normal-age label) abstains **before schema-success**. Never auto-rewrite 99 to 65.
- The final export boundary independently checks that the **actual selected citation** points to the labelled age token, not a same-valued participant age elsewhere in the document. A clicked confirmation cannot override this.
- Existing source conflict detection still prevents automatic selection between original age 65 and amendment age 67. Instructions and explicitly disclaimed examples remain excluded from authoritative proof.
- Source records, parser PDF pages, DOCX paragraphs, XLSX cells, CSV row/column locations and original bytes are never altered. No Tesseract coordinates are invented.

## Limits

This is deliberately narrow: plain numeric ages (`65`, numeric 65) in known normal-age field names with directly parsed labels. It does not validate phrases such as `age sixty-five`, OCR-misaligned clauses, implicit references, plan effective dates, participant-specific legal applicability, or all alternative field naming conventions. If no exact normal-age label exists, the app cannot infer one; reviewer evidence requirements remain. A labelled statement may still be obsolete and is **never automatically declared governing**.

A model producing 99 despite a governing 65 remains a raw model error, even if this guard safely abstains. Actual 0.5B/1.5B/3B and independent larger-corpus model accuracy gates remain failed or blocked. The app remains `0.3.0-beta.1`, not production-ready.
