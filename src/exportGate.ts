/**
 * Single authoritative export preflight. The GUI state is not a substitute for
 * validation at the point of export. Re-evaluate every criterion on every click.
 */
import type { SourceDocument } from './pipeline.ts';
import type { ExtractionAudit } from './chunkExtraction.ts';
import type { EvidenceCheck } from './evidence.ts';
import { evidenceReviewComplete } from './evidence.ts';

export type ExportGateInputs = {
  document: SourceDocument | null;
  audit: ExtractionAudit | null;
  value: unknown;
  schemaValid: boolean;
  busy: boolean;
  evidence: EvidenceCheck[];
  selectedEvidence: Record<string,number>;
  confirmedEvidence: Record<string,boolean>;
  conflictsUnresolved: number;
  privacyRequired: boolean;
  privacyReviewed: boolean;
  sourceIssuesUnreviewed?: number;
};
export type ExportGate = {allowed:boolean;reasons:string[]};

/**
 * Recheck the complete source/candidate chain at the moment of export.
 * Checking only the first and last spans can hide missing middle sections.
 * Candidate citations may refer only to sections that were actually read.
 */
function verifiedProvenance(audit:ExtractionAudit,sourceLength:number):boolean{
  if(!Array.isArray(audit.chunks)||!audit.chunks.length)return false;
  let previous=0;
  const spans=new Set<string>();
  for(let i=0;i<audit.chunks.length;i++){
    const chunk=audit.chunks[i];
    if(!chunk||!Number.isSafeInteger(chunk.chunk)||chunk.chunk!==i+1||
       !Number.isSafeInteger(chunk.start)||!Number.isSafeInteger(chunk.end)||
       chunk.start!==previous||chunk.end<=chunk.start||chunk.end>sourceLength)return false;
    spans.add(chunk.chunk+':'+chunk.start+':'+chunk.end);
    previous=chunk.end;
  }
  if(previous!==sourceLength||!audit.candidates||
     typeof audit.candidates!=='object')return false;
  for(const candidates of Object.values(audit.candidates)){
    if(!Array.isArray(candidates)||!candidates.length)return false;
    for(const candidate of candidates){
      if(!candidate||!Array.isArray(candidate.spans)||!candidate.spans.length)return false;
      for(const span of candidate.spans){
        if(!span||!spans.has(span.chunk+':'+span.start+':'+span.end))return false;
      }
    }
  }
  return true;
}

export function evaluateExportGate(input:ExportGateInputs):ExportGate{
  const reasons:string[]=[];
  const {document,audit,value}=input;
  if(!document)reasons.push('No source document is selected.');
  if(!audit)reasons.push('Extraction coverage was not verified.');
  if(document&&audit&&(audit.documentId!==document.id ||
      audit.documentName!==document.name ||
      audit.length!==document.text.length || audit.sourceText!==document.text ||
      audit.sourceSha256!==document.sourceSha256 ||
      audit.processedTextSha256!==document.processedTextSha256 ||
      !verifiedProvenance(audit,document.text.length))){
    reasons.push('The current document does not match the reviewed extraction.');
  }
  if(input.busy)reasons.push('A local operation is still running.');
  if(!input.schemaValid || value===null)reasons.push('The latest JSON has not passed schema validation.');
  if(input.conflictsUnresolved>0)reasons.push('One or more extracted values are still disputed.');
  if(!evidenceReviewComplete(input.evidence,input.selectedEvidence,input.confirmedEvidence)){
    reasons.push('Every nonempty field must have confirmed source evidence.');
  }
  if((input.sourceIssuesUnreviewed??0)>0){
    reasons.push('Source completeness issues must be reviewed in Documents before export.');
  }
  if(input.privacyRequired&&!input.privacyReviewed){
    reasons.push('Possible private data still needs review.');
  }
  return {allowed:reasons.length===0,reasons};
}
