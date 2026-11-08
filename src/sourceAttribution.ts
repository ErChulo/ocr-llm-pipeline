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

export type AttributionAbstention={
  path:string;
  reason:'only-ai-instruction-literal';
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
    decision:'abstain',abstentions:[{path:'/',reason:'only-ai-instruction-literal'}],unmatchedPaths:[]
  };
  const checks=auditLiteralEvidence(doc,value,audit);
  const abstentions:AttributionAbstention[]=checks
    .filter(check=>check.status==='match' &&
      check.evidenceMethod==='literal_value' && check.matches.length>0 &&
      check.matches.every(match=>
        selectedCitationIsInstructionRisk(doc.text,match.start,match.end)))
    .map(check=>({path:check.path,reason:'only-ai-instruction-literal'}));
  return {
    decision:abstentions.length?'abstain':'review-required',
    abstentions,unmatchedPaths:checks.filter(c=>c.status!=='match').map(c=>c.path)
  };
}
export function attributionAbstentionMessage(review:CandidateAttribution):string {
  const paths=review.abstentions.map(x=>x.path).join(', ')||'unknown field';
  return 'Source attribution abstained: '+paths+
    '. The only matching literal source passages appear inside possible AI-directed instructions. '+
    'The model proposal has not been replaced. Correct it against an authentic governing provision and validate again.';
}
