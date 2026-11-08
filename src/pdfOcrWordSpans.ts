/**
 * Candidate-only table row source spans from REAL Tesseract word rectangles
 * and the ACTUAL PDF.js viewport of the same recognized raster.
 * These envelopes are never used as factual verification or exact cell boxes.
 */
import {assessSpatialOcrRows} from './ocrSpatial.ts';
import {inverseViewportRect} from './pdfGeometry.ts';
import type {MeasuredOcrWord} from './ocrSpatial.ts';
import type {SourceOcrSpatialRow,SourceTextSpan} from './pipeline.ts';
export type PdfOcrSpatialAssessment={status:'candidates'|'abstain';reason:string;
  spans:SourceTextSpan[];rows:SourceOcrSpatialRow[]};
const empty=(reason:string):PdfOcrSpatialAssessment=>({status:'abstain',reason,spans:[],rows:[]});
export function measuredPdfOcrTableSpans(args:{page:number;text:string;
  words:readonly MeasuredOcrWord[];imageWidth:number;imageHeight:number;
  viewportTransform:number[]}):PdfOcrSpatialAssessment{
  if(!Array.isArray(args.viewportTransform)||args.viewportTransform.length!==6||
    !args.viewportTransform.every(Number.isFinite))return empty('missing-original-viewport-transform');
  const assessment=assessSpatialOcrRows(args);
  if(assessment.status!=='candidates')return empty(assessment.reason);
  const rows:SourceOcrSpatialRow[]=[];
  const spans:SourceTextSpan[]=[];
  try{
    for(const pair of assessment.pairs){
      const range=pair.transcriptRanges;
      if(args.text.slice(range.age.start,range.age.end)!==pair.age.text||
         args.text.slice(range.factor.start,range.factor.end)!==pair.factor.text){
        return empty('OCR-transcript-word-mismatch');
      }
      const rect=(word:MeasuredOcrWord)=>{
        const b=word.bbox;
        return inverseViewportRect(args.viewportTransform,{x:b.x0,y:b.y0,
          width:b.x1-b.x0,height:b.y1-b.y0});
      };
      const ageBox=rect(pair.age),factorBox=rect(pair.factor);
      const age={...range.age,box:ageBox},factor={...range.factor,box:factorBox};
      rows.push({page:args.page,precision:'pdf-ocr-word-envelope',
        status:'unverified-geometry',age,factor});
      spans.push({...age,precision:'pdf-ocr-word-envelope'},
        {...factor,precision:'pdf-ocr-word-envelope'});
    }
  }catch{return empty('invalid-or-uninvertible-PDF-viewport');}
  return {status:'candidates',reason:'measured-word-envelope-original-review-required',spans,rows};
}
