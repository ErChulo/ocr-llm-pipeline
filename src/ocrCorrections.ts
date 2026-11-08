/**
 * In-memory, human-confirmed OCR transcription corrections.
 * Preserve the original file SHA-256 and original page identifier.
 * Never call a corrected string "native PDF text" or fabricate a bounding box.
 */
import type { SourceDocument, SourceRecord } from './pipeline.ts';
import {withSourceInstructionReview} from './sourceInstructionReview.ts';

const MAX_CORRECTED_CHARS=200_000;
const MAX_DOCUMENT_CHARS=2_000_000;
export type CorrectableRecord = {index:number;label:string;kind:string};

function isCorrectable(kind:unknown):kind is string{
  return typeof kind==='string'&&
    ['pdf-page-ocr','pdf-page-ocr-reviewed','pdf-page-ocr-mixed',
      'pdf-page-ocr-mixed-reviewed','image','image-ocr-reviewed'].includes(kind);
}
export function ocrRecords(doc:SourceDocument):CorrectableRecord[]{
  return (doc.records||[]).flatMap((record,index)=>{
    const kind=record.location.kind;
    return isCorrectable(kind)?[{index,label:record.label,kind}]:[];
  });
}
function recordValue(doc:SourceDocument,record:SourceRecord):string{
  if(!Number.isInteger(record.start)||!Number.isInteger(record.end)||record.start<0||
    record.end>doc.text.length||record.end<=record.start){
    throw new Error('OCR record offsets are inconsistent with the imported source.');
  }
  const text=doc.text.slice(record.start,record.end);
  const prefix=record.label+':\n';
  if(!text.startsWith(prefix)||!text.endsWith('\n'))throw new Error('OCR source record framing is invalid.');
  return text.slice(prefix.length).trimEnd();
}
export function currentOcrText(doc:SourceDocument,index:number):string{
  const record=doc.records?.[index];
  if(!record||!isCorrectable(record.location.kind))throw new Error('This document section does not contain editable OCR text.');
  return recordValue(doc,record);
}
export function correctOcrText(doc:SourceDocument,index:number,edited:string):SourceDocument{
  if(typeof edited!=='string'||!edited.trim())throw new Error('Corrected OCR text must not be empty.');
  if(edited.length>MAX_CORRECTED_CHARS)throw new Error('OCR correction exceeds 200,000 characters.');
  if(!doc.records||!doc.records[index]||!isCorrectable(doc.records[index].location.kind)){
    throw new Error('Only imported OCR pages and image OCR text may be corrected.');
  }
  const normalized=edited.replace(/\r\n?/g,'\n').trim();
  const original=currentOcrText(doc,index);
  if(normalized===original)return doc;
  const updated:SourceRecord[]=[];
  let output='',last=0;
  for(let i=0;i<doc.records.length;i++){
    const record=doc.records[i];
    if(record.start<last||record.end>doc.text.length){
      throw new Error('Source records overlap or exceed the imported document.');
    }
    const gap=doc.text.slice(last,record.start);
    output+=gap;
    const before=output.length;
    const replacement=i===index
      ? record.label+':\n'+normalized+'\n\n'
      : doc.text.slice(record.start,record.end);
    output+=replacement;
    const shift=before-record.start;
    const oldKind=record.location.kind;
    const location=i===index
      ? {...record.location,kind:oldKind==='image'||oldKind==='image-ocr-reviewed'
        ? 'image-ocr-reviewed'
        : oldKind==='pdf-page-ocr-mixed'||oldKind==='pdf-page-ocr-mixed-reviewed'
          ? 'pdf-page-ocr-mixed-reviewed' : 'pdf-page-ocr-reviewed'}
      : {...record.location};
    updated.push({
      ...record,start:before,end:output.length,location,
      ...(i===index?{textSpans:undefined}:record.textSpans?{
        textSpans:record.textSpans.map(span=>({...span,start:span.start+shift,end:span.end+shift}))
      }:{})
    });
    last=record.end;
  }
  output+=doc.text.slice(last);
  if(output.length>MAX_DOCUMENT_CHARS)throw new Error('Corrected document exceeds the size limit.');
  const marker='Human-corrected OCR text is a reviewed transcription, not native PDF text; verify against the original.';
  const warnings=[...(doc.warnings||[])];
  if(!warnings.includes(marker))warnings.push(marker);
  return withSourceInstructionReview({
    ...doc,text:output,records:updated,warnings,
    // Always retain the fingerprint of ORIGINAL FILE bytes; never hash
    // corrected text and misrepresent it as the imported file fingerprint.
    correctionCount:(doc.correctionCount||0)+1,
    processedTextSha256:undefined // invalidate digest until the edited text is hashed again
  });
}
