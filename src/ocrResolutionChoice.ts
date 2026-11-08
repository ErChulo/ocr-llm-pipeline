/**
 * Compare TWO measured OCR transcriptions of the same parser-verified PDF page.
 * No normalization, digit substitution or coordinate inference is permitted.
 * A reviewer must still verify the original page after either transcription.
 */
export type MeasuredOcr={text:string;confidence:number};
type Row={age:string;factor:string};
const validFactor=/^\d+\.\d{2,6}$/;
const malformedFactor=/^\d+(?:\.\d+){2,}$/;
function rows(text:string):Row[]{
  const found:Row[]=[];
  for(const line of text.split(/\r?\n/)){
    const match=/^[ \t]*(\d{1,3})[ \t]+(\S+)(?:[ \t]|$)/.exec(line);
    if(match)found.push({age:match[1],factor:match[2]});
  }
  return found;
}
function counts(pairs:Row[]):Map<string,number>{
  const result=new Map<string,number>();
  for(const r of pairs){
    const key=r.age+'|'+r.factor;
    result.set(key,(result.get(key)||0)+1);
  }
  return result;
}
function containsAll(a:Map<string,number>,b:Map<string,number>):boolean{
  for(const [key,n] of a)if((b.get(key)||0)<n)return false;
  return true;
}
export function hasMalformedNumericTableRow(text:string):boolean{
  return rows(text).some(r=>malformedFactor.test(r.factor));
}
export function preferFallbackForMalformedRows(
  first:MeasuredOcr,second:MeasuredOcr
):boolean{
  if(!first?.text||!second?.text||
     !Number.isFinite(first.confidence)||!Number.isFinite(second.confidence)||
     second.confidence<first.confidence-20)return false;
  const original=rows(first.text),other=rows(second.text);
  const bad=original.filter(r=>malformedFactor.test(r.factor));
  if(!bad.length||other.some(r=>malformedFactor.test(r.factor)))return false;
  const stable=original.filter(r=>validFactor.test(r.factor));
  const verified=other.filter(r=>validFactor.test(r.factor));
  if(!containsAll(counts(stable),counts(verified)))return false;
  // Each malformed row must be independently observed in the other OCR
  // pass at the SAME literal age, with one unambiguous decimal transcription.
  // This is layout evidence, not proof that the factor is factually correct.
  for(const row of bad){
    const sameAge=other.filter(r=>r.age===row.age);
    if(sameAge.length!==1||!validFactor.test(sameAge[0].factor))return false;
  }
  return true;
}
