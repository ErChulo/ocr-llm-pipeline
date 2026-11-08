# Model-candidate source-attribution abstention (beta)

A model may emit a number that literally occurs in an injected appendix while failing to select the governing fact. A literal match and valid JSON Schema do **not** establish applicability.

The local `assessCandidateSourceAttribution` preflight checks each model-produced field against exact original-document evidence in that model's covered source section. If **every** matching literal is inside a locally detected AI-directed instruction, the candidate's attribution decision is `abstain` and automatic schema-valid acceptance stops. The original source, OCR text, source spans, candidate number, and audit remain unchanged; the proposed JSON remains editable. The user must correct or remove the candidate using authentic source evidence, revalidate, and explicitly confirm a selected citation. Source-citation screening is independently rechecked at final export.

If a matching literal is also present in a non-instruction passage, source applicability still needs human review. Missing literal or normalized boolean evidence is not automatically accepted: separate existing citation/evidence gates apply. The preflight does not infer a correct replacement value, distinguish statutory and plan authority, guarantee resistance to novel prompt injections, or establish that a clean passage is governing.

The real physical GGUF test report now records `attributionAbstained` separately from `actual` extracted JSON and strict model accuracy. A correctly **blocked** malicious 99 remains a **model factual error**, not a true positive. This is an additional safety signal, not score inflation. These evaluations use fictional data only, with the offline file:// browser and no runtime network requests. Production acceptance remains open.


## Explicit non-governing evidence (November 8 regression)

The same pre-validation source-attribution quarantine also recognizes a **narrow, expressly disclaimed** source category, such as `UNTRUSTED APPENDIX` and `EXAMPLE ONLY`. A model-selected literal that appears exclusively inside AI-directed instructions or disclaimed non-authoritative passages now abstains before declaring the proposed field schema-valid. A mixed set of those unsafe sources is also quarantined. A copy in an ordinary plan appendix, or in a non-disclaimed governing passage, stays **review-required**; the application never decides legal applicability automatically. A missing model/source audit explicitly abstains. No source text, model value, word box, or PDF coordinate is rewritten.

Tests use entirely fictional data. Known correct age 65 is not substituted for rejected age 99. The separate final export citation guard independently checks user-selected expressly disclaimed passages. Passing these heuristics does not establish statutory or plan authority and does not meet adversarial release acceptance.
