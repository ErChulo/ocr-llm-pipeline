/**
 * Post-model source-attribution quarantine. A candidate whose ONLY literal
 * occurrences are inside AI-directed instructions is not verified evidence:
 * abstain BEFORE schema-valid success, preserving the original model proposal
 * in the editable review draft. Never replace it with another plausible fact.
 *
 * This bounded check is not semantic source authority adjudication. All other
 * candidates still require manual citation and source applicability review.
 */
import type {SourceDocument} from './pipeline.ts';
import type {ExtractionAudit} from './chunkExtraction.ts';
import {auditLiteralEvidence} from './evidence.ts';
import {selectedCitationIsInstructionRisk} from './sourceInstructionReview.ts';
import {selectedCitationExpresslyDisclaimed} from './disclaimedEvidence.ts';
import {inspectNormalAgeSourceConflict,normalAgeCitationUnrelatedToLabelledClaim} from './normalAgeConflict.ts';

export type AttributionAbstention={
  path:string;
  reason:'only-ai-instruction-literal'|'only-explicitly-disclaimed-literal'|'mixed-disqualified-literal'|'missing-source-audit'|'source-absent-numeric-literal'|
    'unresolved-normal-age-source-claims'|'unscannable-normal-age-source'|
    'normal-age-literal-unrelated-to-labelled-claim';
};
export type CandidateAttribution={
  decision:'abstain'|'review-required';
  abstentions:AttributionAbstention[];
  unmatchedPaths:string[];
};
export function assessCandidateSourceAttribution(
  doc:SourceDocument|null,audit:ExtractionAudit|null,value:unknown
):CandidateAttribution {
  if(!doc||!audit)return {
    decision:'abstain',abstentions:[{path:'/',reason:'missing-source-audit'}],unmatchedPaths:[]
  };
  const checks=auditLiteralEvidence(doc,value,audit);
  // Model-generated numeric facts that do not occur as an exact original
  // source literal must not obtain even schema-valid preliminary acceptance.
  // Never infer that a normalized, computed or visually confusable number is
  // supported. Reviewers may edit the proposal to a source-verifiable value.
  // Other nonliteral strings and booleans retain the existing manual citation
  // path; their textual representation may require a quoted source passage.
  const numericCandidate=/^[+\-−]?\s*(?:[$€£]\s*)?(?:\d+(?:[.,]\d+)*|\.\d+)\s*%?$/;
  const unsupportedNumeric:AttributionAbstention[]=checks.filter(check=>
    check.status!=='match' &&
    (typeof check.value==='number'&&Number.isFinite(check.value) ||
     typeof check.value==='string'&&numericCandidate.test(check.value.trim()))
  ).map(check=>({path:check.path,reason:'source-absent-numeric-literal'}));
  // Literal matching is not governing-source adjudication. Two credible
  // but conflicting normal-age statements require an explicit applicability
  // resolution rather than accepting a model-picked value (even an exact one).
  const sourceConflicts:AttributionAbstention[]=[];
  for(const check of checks){
    if(check.status!=='match')continue;
    const conflict=inspectNormalAgeSourceConflict(doc,check.path);
    if(conflict.state==='unresolved'){
      sourceConflicts.push({path:check.path,reason:'unresolved-normal-age-source-claims'});
    }else if(conflict.state==='unscannable'){
      sourceConflicts.push({path:check.path,reason:'unscannable-normal-age-source'});
    }else if(conflict.state==='clear'&&conflict.claims.length){
      const clean=check.matches.filter(match=>
        !selectedCitationIsInstructionRisk(doc.text,match.start,match.end)&&
        !selectedCitationExpresslyDisclaimed(doc.text,match.start,match.end));
      // A matching participant age or other numeric figure is not a normal-
      // retirement-age provision. Do not generate substitute evidence.
      // Leave solely instruction/disclaimed matches to the existing guard.
      if(clean.length&&clean.every(match=>
        normalAgeCitationUnrelatedToLabelledClaim(doc,check.path,check.value,match)
      )){
        sourceConflicts.push({
          path:check.path,reason:'normal-age-literal-unrelated-to-labelled-claim'
        });
      }
    }
  }
  const abstentions:AttributionAbstention[]=[...unsupportedNumeric,...sourceConflicts,...checks.flatMap(check=>{
    if(check.status!=='match'||check.evidenceMethod!=='literal_value'||
       check.matches.length===0)return [];
    const risk=check.matches.map(match=>({
      instruction:selectedCitationIsInstructionRisk(doc.text,match.start,match.end),
      disclaimed:selectedCitationExpresslyDisclaimed(doc.text,match.start,match.end)
    }));
    // Any clean literal requires source review, not automatic selection. Only
    // a candidate with NO qualifying occurrence is quarantined pre-validation.
    if(risk.some(x=>!x.instruction&&!x.disclaimed))return [];
    const reason:AttributionAbstention['reason']=
      risk.every(x=>x.instruction)?'only-ai-instruction-literal':
      risk.every(x=>x.disclaimed)?'only-explicitly-disclaimed-literal':
      'mixed-disqualified-literal';
    return [{path:check.path,reason}];
  })];
  return {
    decision:abstentions.length?'abstain':'review-required',
    abstentions,unmatchedPaths:checks.filter(c=>c.status!=='match').map(c=>c.path)
  };
}
export function attributionAbstentionMessage(review:CandidateAttribution):string {
  const paths=review.abstentions.map(x=>x.path).join(', ')||'unknown field';
  return 'Source attribution abstained: '+paths+
    '. A numeric proposal has no matching original source literal, appears only in instructions/non-governing examples, or the numeric literal is outside a labelled normal-age source provision, or the source has incompatible apparent normal-retirement-age claims that need an applicability determination. '+
    'The model proposal was not replaced or approved. Resolve the governing source and effective-date applicability using an authorized review process before using the value.';
}
