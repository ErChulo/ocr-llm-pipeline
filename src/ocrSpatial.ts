/**
 * Independent geometry-only OCR table-row candidates from measured Tesseract
 * word rectangles. This does not verify transcription, factual meaning, table
 * semantics, or the original image; no coordinates may be manufactured.
 */
export type MeasuredRasterBox={x0:number;y0:number;x1:number;y1:number};
export type MeasuredOcrWord={text:string;confidence:number;bbox:MeasuredRasterBox};
export type SpatialCandidate={
  page:number;
  age:MeasuredOcrWord;
  factor:MeasuredOcrWord;
  region:MeasuredRasterBox;
  imageWidth:number;
  imageHeight:number;
  precision:'tesseract-raster-word-envelope';
  transcriptRanges:{age:{start:number;end:number};factor:{start:number;end:number}};
};
export type SpatialAssessment={
  status:'candidates'|'abstain';
  reason:string;
  pairs:SpatialCandidate[];
};
const AGE=/^\d{1,3}$/;
const FACTOR=/^\d+\.\d{2,6}$/;
const MAX_WORDS=10000;
function inside(word:MeasuredOcrWord,w:number,h:number):boolean{
  const b=word?.bbox;
  return !!b && typeof word.text==='string' && word.text.length>0 && word.text.length<=100 &&
    Number.isFinite(word.confidence) && word.confidence>=0 && word.confidence<=100 &&
    [b.x0,b.y0,b.x1,b.y1].every(Number.isFinite) &&
    b.x0>=0 && b.y0>=0 && b.x1>b.x0 && b.y1>b.y0 && b.x1<=w && b.y1<=h;
}
function centerY(word:MeasuredOcrWord):number{
  return (word.bbox.y0+word.bbox.y1)/2;
}
function sameRow(a:MeasuredOcrWord,b:MeasuredOcrWord):boolean{
  const overlap=Math.min(a.bbox.y1,b.bbox.y1)-Math.max(a.bbox.y0,b.bbox.y0);
  const minHeight=Math.min(a.bbox.y1-a.bbox.y0,b.bbox.y1-b.bbox.y0);
  return overlap>0 && overlap>=minHeight*0.45 &&
    Math.abs(centerY(a)-centerY(b))<=Math.max(a.bbox.y1-a.bbox.y0,b.bbox.y1-b.bbox.y0)*0.45;
}
function uniqueRange(source:string,token:string):{start:number;end:number}|null{
  const p=source.indexOf(token);
  if(p<0 || source.indexOf(token,p+token.length)>=0)return null;
  const left=source[p-1]||'',right=source[p+token.length]||'';
  return !/[A-Za-z0-9_.+\-]/.test(left)&&!/[A-Za-z0-9_.]/.test(right)
    ? {start:p,end:p+token.length}:null;
}
const empty=(reason:string):SpatialAssessment=>({status:'abstain',reason,pairs:[]});
export function assessSpatialOcrRows(
  args:{page:number;imageWidth:number;imageHeight:number;text:string;words:readonly MeasuredOcrWord[]}
):SpatialAssessment {
  const {page,imageWidth:w,imageHeight:h,text,words}=args;
  if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||
     w<1||h<1||w>3600||h>3600||w*h>5_000_000||typeof text!=='string'||
     !Array.isArray(words)||words.length>MAX_WORDS)return empty('invalid-source-geometry');
  if(words.some(word=>!inside(word,w,h)))return empty('untrusted-word-box');
  const headerAge=words.filter(word=>word.text.toUpperCase()==='AGE');
  const headerFactor=words.filter(word=>word.text.toUpperCase()==='FACTOR');
  const headers=headerAge.flatMap(age=>headerFactor.filter(factor=>
    age.bbox.x1<factor.bbox.x0 && sameRow(age,factor))
    .map(factor=>({age,factor})));
  if(headers.length!==1)return empty('ambiguous-or-missing-column-headers');
  const {age:ageHeader,factor:factorHeader}=headers[0];
  const monthly=words.filter(word=>word.text.toUpperCase()==='MONTHLY' &&
    sameRow(word,factorHeader) && word.bbox.x0<factorHeader.bbox.x0);
  if(monthly.length>1)return empty('ambiguous-factor-header');
  const factorX=monthly[0]?.bbox.x0??factorHeader.bbox.x0;
  const headerBottom=Math.max(ageHeader.bbox.y1,factorHeader.bbox.y1);
  const tolerance=Math.max(18,w*0.055);
  const ages=words.filter(word=>AGE.test(word.text) &&
    word.bbox.y0>headerBottom && Math.abs(word.bbox.x0-ageHeader.bbox.x0)<=tolerance &&
    uniqueRange(text,word.text)!==null);
  const factors=words.filter(word=>FACTOR.test(word.text) &&
    word.bbox.y0>headerBottom && Math.abs(word.bbox.x0-factorX)<=tolerance &&
    uniqueRange(text,word.text)!==null);
  if(ages.length<2||factors.length<2)return empty('insufficient-unique-column-values');
  const provisional=ages.flatMap(age=>{
    const same=factors.filter(factor=>factor.bbox.x0>age.bbox.x1+w*0.1 && sameRow(age,factor));
    return same.length===1?[{age,factor:same[0]}]:[];
  });
  if(provisional.length<2)return empty('ambiguous-or-missing-row-neighbors');
  if(new Set(provisional.map(pair=>pair.factor)).size!==provisional.length ||
     ages.length!==provisional.length||factors.length!==provisional.length){
    return empty('unpaired-or-reused-numeric-cell');
  }
  const result=provisional.sort((a,b)=>centerY(a.age)-centerY(b.age));
  const uniqueLines=result.every((row,i)=>i===0||
    row.age.bbox.y0-result[i-1].age.bbox.y1>=0);
  if(!uniqueLines)return empty('overlapping-rows');
  return {status:'candidates',reason:'observed-ocr-word-geometry-not-verified',pairs:result.map(row=>({
    page,age:row.age,factor:row.factor,
    region:{x0:Math.min(row.age.bbox.x0,row.factor.bbox.x0),
      y0:Math.min(row.age.bbox.y0,row.factor.bbox.y0),
      x1:Math.max(row.age.bbox.x1,row.factor.bbox.x1),
      y1:Math.max(row.age.bbox.y1,row.factor.bbox.y1)},
    imageWidth:w,imageHeight:h,precision:'tesseract-raster-word-envelope',
    transcriptRanges:{age:uniqueRange(text,row.age.text)!,factor:uniqueRange(text,row.factor.text)!}
  }))};
}
