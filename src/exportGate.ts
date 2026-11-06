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
};
export type ExportGate = {allowed:boolean;reasons:string[]};

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
      audit.chunks.length===0 || audit.chunks[0].start!==0 ||
      audit.chunks.at(-1)?.end!==document.text.length)){
    reasons.push('The current document does not match the reviewed extraction.');
  }
  if(input.busy)reasons.push('A local operation is still running.');
  if(!input.schemaValid || value===null)reasons.push('The latest JSON has not passed schema validation.');
  if(input.conflictsUnresolved>0)reasons.push('One or more extracted values are still disputed.');
  if(!evidenceReviewComplete(input.evidence,input.selectedEvidence,input.confirmedEvidence)){
    reasons.push('Every nonempty field must have confirmed source evidence.');
  }
  if(input.privacyRequired&&!input.privacyReviewed){
    reasons.push('Possible private data still needs review.');
  }
  return {allowed:reasons.length===0,reasons};
}
