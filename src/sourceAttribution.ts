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

export type AttributionAbstention={
  path:string;
  reason:'only-ai-instruction-literal'|'only-explicitly-disclaimed-literal'|'mixed-disqualified-literal'|'missing-source-audit';
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
  const abstentions:AttributionAbstention[]=checks.flatMap(check=>{
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
  });
  return {
    decision:abstentions.length?'abstain':'review-required',
    abstentions,unmatchedPaths:checks.filter(c=>c.status!=='match').map(c=>c.path)
  };
}
export function attributionAbstentionMessage(review:CandidateAttribution):string {
  const paths=review.abstentions.map(x=>x.path).join(', ')||'unknown field';
  return 'Source attribution abstained: '+paths+
    '. All matching literal passages are AI-directed instructions, expressly disclaimed examples, or otherwise unavailable for source authority. '+
    'The model proposal has not been replaced. Correct it against an authentic applicable passage and validate again.';
}
