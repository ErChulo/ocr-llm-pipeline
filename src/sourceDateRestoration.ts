/**
 * A strictly source-anchored date-format repair.
 *
 * The model may convert "January 1 2025" to "2025-01-01".
 * Only one distinct unambiguous date wording is allowed inside the actual
 * model section. No Date.parse, guessed punctuation, fuzzy similarity,
 * cross-document searches, or silent legal interpretation are involved.
 *
 * This is presentation repair only; all repaired values still require
 * explicit source-location and factual review before export.
 */
import {unambiguousIsoDate} from './dateRepresentation.ts';

const spelledDate=/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+[0-9]{1,2},?\s+[0-9]{4}\b/gi;
const numericDate=/\b[0-9]{4}-[0-9]{2}-[0-9]{2}\b/g;

export type RestoredSourceDate={
  value:string;
  modelValue:string;
  sourceStart:number;
  sourceEnd:number;
};

export function sourceDateField(key:string):boolean{
  return /(?:^|[_-])(?:date|dt)$/i.test(key);
}

/** Return null whenever no unique, exact source representation can be proven. */
export function restoreSourceDate(
  modelValue:unknown, sourceText:string
):RestoredSourceDate|null{
  if(typeof modelValue!=='string'||modelValue.length>80||!sourceText)return null;
  const calendar=unambiguousIsoDate(modelValue);
  if(!calendar)return null;
  const unique=new Map<string,{start:number;end:number}>();
  for(const re of [spelledDate,numericDate]){
    re.lastIndex=0;
    for(const found of sourceText.matchAll(re)){
      if(found.index===undefined)continue;
      const match=found[0];
      const start=found.index,end=start+match.length;
      // Reject text embedded in a longer identifier or numeric code.
      if(/[\p{L}\p{N}_]/u.test(sourceText[start-1]??'')||
         /[\p{L}\p{N}_]/u.test(sourceText[end]??''))continue;
      if(unambiguousIsoDate(match)!==calendar)continue;
      unique.set(match,{start,end});
      if(unique.size>1)return null;
    }
  }
  if(unique.size!==1)return null;
  const [value,position]=unique.entries().next().value!;
  // Already sourced literally; do not create artificial "recovery" metadata.
  if(value===modelValue)return null;
  return {value,modelValue,sourceStart:position.start,sourceEnd:position.end};
}
