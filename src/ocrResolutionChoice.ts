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

/** AGE-labelled schedules may contain OCR merges such as 55 -> 585.
 * A measured alternate raster is a new transcription, never an inferred edit.
 * Stop on ambiguous repeated factors, row loss or any change to stable rows.
 */
const maxPlausibleActuarialAge=125;
const plausibleAge=(age:string)=>Number.isInteger(Number(age))&&
  Number(age)>=0&&Number(age)<=maxPlausibleActuarialAge;
const hasAgeFactorHeader=(text:string)=>text.split(/\r?\n/).some(line=>
  /\bAGE\b/i.test(line)&&/\bFACTOR\b/i.test(line));
export function hasImplausibleAgeTableRow(text:string):boolean{
  return typeof text==='string'&&hasAgeFactorHeader(text)&&
    rows(text).some(row=>validFactor.test(row.factor)&&!plausibleAge(row.age));
}
export function preferFallbackForImplausibleAges(
  first:MeasuredOcr,second:MeasuredOcr
):boolean{
  if(!first?.text||!second?.text||
     !Number.isFinite(first.confidence)||!Number.isFinite(second.confidence)||
     second.confidence<first.confidence-20||
     !hasImplausibleAgeTableRow(first.text)||
     !hasAgeFactorHeader(second.text))return false;
  const primary=rows(first.text),other=rows(second.text);
  if(primary.length<2||primary.length!==other.length||
     primary.some(row=>!validFactor.test(row.factor))||
     other.some(row=>!validFactor.test(row.factor)||!plausibleAge(row.age)))
    return false;
  const stable=primary.filter(row=>plausibleAge(row.age));
  const bad=primary.filter(row=>!plausibleAge(row.age));
  if(!bad.length||!containsAll(counts(stable),counts(other)))return false;
  const stableAges=new Set(stable.map(row=>row.age));
  const stableFactors=new Set(stable.map(row=>row.factor));
  const consumed=new Set<string>();
  for(const malformed of bad){
    // The observed factor on the malformed primary row must be unchanged.
    // A duplicated factor or age collision provides no unique row identity.
    const options=other.filter(row=>row.factor===malformed.factor);
    if(stableFactors.has(malformed.factor)||options.length!==1||
       stableAges.has(options[0].age)||consumed.has(options[0].age))return false;
    consumed.add(options[0].age);
  }
  return true;
}
