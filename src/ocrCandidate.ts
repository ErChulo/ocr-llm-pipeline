/**
 * Conservative comparison of two independent OCR passes on the SAME pixels.
 * Numeric values are recognized observations, never inferred or corrected.
 * This heuristic is NOT verification of row/column relationships.
 */
export type OcrCandidate = {text:string;confidence:number};
export type OcrChoice = {selected:'default'|'sparse';reason:'unchanged'|'numeric-superset'};
const numericPattern=/(?<![\p{L}\p{N}_.])[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?![\p{L}\p{N}_.])/gu;
const rowPattern=/(?:^|[^\d.])(\d{1,3})[ \t]+(\d+\.\d{2,6})(?=$|[^\d.])/g;

function counts(text:string):Map<string,number>{
  const out=new Map<string,number>();
  for(const token of text.match(numericPattern)||[]){
    out.set(token,(out.get(token)||0)+1);
  }
  return out;
}
function observedPairs(text:string):Map<string,number>{
  const out=new Map<string,number>();
  for(const line of text.split(/\r?\n/)){
    rowPattern.lastIndex=0;
    for(const match of line.matchAll(rowPattern)){
      const key=match[1]+'|'+match[2];
      out.set(key,(out.get(key)||0)+1);
    }
  }
  return out;
}
function isMultisetSubset(a:Map<string,number>,b:Map<string,number>):boolean{
  for(const [token,count] of a)if((b.get(token)||0)<count)return false;
  return true;
}
function total(counts:Map<string,number>):number{
  let result=0;
  for(const count of counts.values())result+=count;
  return result;
}
export function chooseOcrCandidate(baseline:OcrCandidate,sparse:OcrCandidate):OcrChoice{
  const unchanged:OcrChoice={selected:'default',reason:'unchanged'};
  if(!baseline?.text?.trim()||!sparse?.text?.trim()||
     !Number.isFinite(baseline.confidence)||!Number.isFinite(sparse.confidence)||
     sparse.confidence<baseline.confidence-8)return unchanged;
  const baseNums=counts(baseline.text),moreNums=counts(sparse.text);
  const basePairs=observedPairs(baseline.text),morePairs=observedPairs(sparse.text);
  // Do not replace or drop a recognized numeric literal or established
  // same-line pair merely because an alternative pass is longer.
  if(total(baseNums)<2||!isMultisetSubset(baseNums,moreNums)||
     total(moreNums)<=total(baseNums)||basePairs.size<1||
     !isMultisetSubset(basePairs,morePairs)||
     total(morePairs)<=total(basePairs)||
     !Array.from(morePairs.keys()).some(pair=>!basePairs.has(pair)))return unchanged;
  return {selected:'sparse',reason:'numeric-superset'};
}
