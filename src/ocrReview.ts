/**
 * A recognition confidence score is not factual validation. Every OCR
 * transcription must be compared with the original file before export.
 * Pure helper shared by image and scanned-PDF ingestion.
 */
import type { SourceReviewIssue } from './pipeline.ts';

export function ocrReviewIssue(
  source:'pdf'|'image',confidence:number,page?:number,ambiguousNumericTokens=0
):SourceReviewIssue{
  if(source==='pdf' && (!Number.isInteger(page)||!page||page<1)){
    throw new Error('OCR PDF source review requires an actual page number.');
  }
  const score=Number.isFinite(confidence)
    ? Math.min(100,Math.max(0,Math.round(confidence))) : 0;
  const low=score<75;
  // Count only; do not put source numerals or possible identifiers in
  // warnings. A heuristic ambiguity is not a recognized numeric correction.
  const count=Number.isSafeInteger(ambiguousNumericTokens)&&ambiguousNumericTokens>0
    ? Math.min(100,ambiguousNumericTokens):0;
  const numericWarning=count>0
    ? ' OCR contains '+(count===100?'at least 100':String(count))+
      ' number-like token(s) with possible letter/digit confusion (O/0, I/1, S/5, B/8, Z/2). Verify every numeric value against the original; nothing was auto-corrected.'
    : '';
  const context=source==='pdf'?'original PDF page '+page:'original image';
  return {
    id:source==='pdf'?'pdf:ocr:'+page:'image:ocr',
    category:low?'low_ocr_confidence':'ocr_unverified',
    ...(source==='pdf'?{page}:{}),
    message:(low?'Low OCR confidence ('+score+'%). ':'OCR confidence is '+score+'%; this does not verify accuracy. ')+
      'Compare all material names, dates, amounts, and formulas against the '+context+
      ' before export.'+numericWarning
  };
}
