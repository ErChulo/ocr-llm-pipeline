/**
 * A recognition confidence score is not factual validation. Every OCR
 * transcription must be compared with the original file before export.
 * Pure helper shared by image and scanned-PDF ingestion.
 */
import type { SourceReviewIssue } from './pipeline.ts';

export function ocrReviewIssue(source:'pdf'|'image',confidence:number,page?:number):SourceReviewIssue{
  if(source==='pdf' && (!Number.isInteger(page)||!page||page<1)){
    throw new Error('OCR PDF source review requires an actual page number.');
  }
  const score=Number.isFinite(confidence)
    ? Math.min(100,Math.max(0,Math.round(confidence))) : 0;
  const low=score<75;
  const context=source==='pdf'?'PDF page '+page:'original image';
  return {
    id:source==='pdf'?'pdf:ocr:'+page:'image:ocr',
    category:low?'low_ocr_confidence':'ocr_unverified',
    ...(source==='pdf'?{page}:{}),
    message:(low?'Low OCR confidence ('+score+'%). ':'OCR confidence is '+score+'%; this does not verify accuracy. ')+
      'Compare all material names, dates, amounts, and formulas on '+context+
      ' with the original before export.'
  };
}
