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
const NUMERIC_WORD=/(?:^|[^A-Za-z0-9_.+\-])(\d{1,3}|\d+\.\d{2,6})(?=$|[^A-Za-z0-9_.])/g;
function indexedNumericRanges(text:string):Map<string,{start:number;end:number}|null>|null{
  // A single bounded scan prevents adversarial 10k words × 2M characters work.
  if(text.length>250_000)return null;
  const result=new Map<string,{start:number;end:number}|null>();
  let scanned=0;
  for(const match of text.matchAll(NUMERIC_WORD)){
    if(++scanned>20_000)return null;
    const token=match[1],start=match.index+match[0].length-token.length;
    if(result.has(token))result.set(token,null); // duplicate: no unique source range
    else result.set(token,{start,end:start+token.length});
  }
  return result;
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
  const anchors=indexedNumericRanges(text);
  if(!anchors)return empty('excessive-transcript-complexity');
  const headerAge=words.filter(word=>word.text.toUpperCase()==='AGE');
  const headerFactor=words.filter(word=>word.text.toUpperCase()==='FACTOR');
  // Refuse repeated headers before any cross-product can exhaust memory.
  if(headerAge.length!==1||headerFactor.length!==1)return empty('ambiguous-or-missing-column-headers');
  const ageHeader=headerAge[0],factorHeader=headerFactor[0];
  if(ageHeader.bbox.x1>=factorHeader.bbox.x0 || !sameRow(ageHeader,factorHeader)){
    return empty('ambiguous-or-missing-column-headers');
  }
  const monthly=words.filter(word=>word.text.toUpperCase()==='MONTHLY' &&
    sameRow(word,factorHeader) && word.bbox.x0<factorHeader.bbox.x0);
  if(monthly.length>1)return empty('ambiguous-factor-header');
  const factorX=monthly[0]?.bbox.x0??factorHeader.bbox.x0;
  const headerBottom=Math.max(ageHeader.bbox.y1,factorHeader.bbox.y1);
  const tolerance=Math.max(18,w*0.055);
  const ages=words.filter(word=>AGE.test(word.text) &&
    word.bbox.y0>headerBottom && Math.abs(word.bbox.x0-ageHeader.bbox.x0)<=tolerance &&
    anchors.get(word.text)!=null);
  const factors=words.filter(word=>FACTOR.test(word.text) &&
    word.bbox.y0>headerBottom && Math.abs(word.bbox.x0-factorX)<=tolerance &&
    anchors.get(word.text)!=null);
  if(ages.length<2||factors.length<2)return empty('insufficient-unique-column-values');
  if(ages.length>256||factors.length>256)return empty('excessive-table-complexity');
  const provisional=ages.flatMap(age=>{
    const same=factors.filter(factor=>factor.bbox.x0>age.bbox.x1+w*0.1 && sameRow(age,factor));
    return same.length===1?[{age,factor:same[0]}]:[];
  });
  if(provisional.length<2)return empty('ambiguous-or-missing-row-neighbors');
  // A third numeric column between AGE and FACTOR makes the table layout
  // ambiguous: the nearest apparent factor is not proven to belong to AGE.
  // Refuse the *whole* table rather than selecting a convenient cell.
  const anyNumeric=/^[-+]?\\d+(?:\\.\\d+)?%?$/;
  const intervening=provisional.some(({age,factor})=>words.some(word=>
    word!==age && word!==factor && anyNumeric.test(word.text) &&
    word.bbox.x0>=age.bbox.x1 && word.bbox.x1<=factor.bbox.x0 &&
    sameRow(age,word) && sameRow(word,factor)
  ));
  if(intervening)return empty('intervening-numeric-column');
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
    transcriptRanges:{age:anchors.get(row.age.text)!,factor:anchors.get(row.factor.text)!}
  }))};
}
