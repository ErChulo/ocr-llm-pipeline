# Conflicting normal-age source claims — fail-closed beta guard

This deliberately narrow safety check refuses to treat a model-selected normal-retirement age as authoritative when the same imported document contains two distinct, apparently declarative normal-age statements (for example, an original provision specifying **65** and an amendment specifying **67**).

## Exact behavior

1. Scan original parser text and record boundaries for explicit `normal retirement age`, `normal age`, `normal_age`, or standalone `NRA` statements containing a literal integer, including same-record `shall be age`, `will be age`, and `NRA:` clauses. Track the exact original text offsets. Do not infer cross-cell, cross-paragraph or cross-page numeric associations.
2. Exclude literal appearances solely inside already recognized AI instruction text or expressly disclaimed nongoverning examples. These passages retain their existing separate security checks.
3. For an extracted field `normal_age`, `normal_retirement_age`, `normalRetirementAge` or `nra`, **two distinct remaining values** mean an unresolved conflict. The entire candidate fails prevalidation, regardless of which candidate the LLM suggested. No source is silently chosen, and no substitute value is generated.
4. Recheck at the final export gate even when the source, schema and evidence confirmation controls were previously satisfied. Incomplete/malformed source scan states also block that field.
5. Identical repeated values and a separate explicitly labelled **early** retirement age are not treated as normal-age conflicts. Source review and factual verification remain mandatory.

## Scope and limitations

- This is **not** a general legal effective-date engine, plan amendment priority system, participant class eligibility rule or source-authority adjudicator.
- It can miss different wordings, ambiguous plan language, free-form tables or claims split across source records. Some ambiguous class-specific but genuine sources will be conservatively blocked.
- A contradictory document requires a formally documented human determination of the governing plan, amendment date and participant applicability. The current beta has no authoritative case-rule override UI; **do not** edit the original document to launder the desired answer.
- The guard does not prove that the LLM has learned to ignore injected instructions. Deterministic abstention is separate from model accuracy.
- All tests are fictional. No PBGC records or real participant data are used. Release remains `0.3.0-beta.1`; production gates remain open.
