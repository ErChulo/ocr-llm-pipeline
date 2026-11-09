/**
 * Narrow, deterministic source-conflict detector for normal-retirement-age
 * claims. This does NOT resolve governing amendments, effective dates,
 * participant applicability, or source hierarchy. It only prevents a model
 * from silently choosing among contrary apparent original statements.
 *
 * Return original UTF-16 source offsets; never invent page/cell geometry,
 * alter source bytes, assign authority, or select a competing age.
 */
import type {SourceDocument} from './pipeline.ts';
import {selectedCitationIsInstructionRisk} from './sourceInstructionReview.ts';
import {selectedCitationExpresslyDisclaimed} from './disclaimedEvidence.ts';

export type NormalAgeClaim={age:number;start:number;end:number};
export type NormalAgeConflict={
  state:'not-applicable'|'clear'|'unresolved'|'unscannable';
  claims:NormalAgeClaim[];
  distinctAges:number[];
};
const MAX_SCAN_CHARS=2_000_000;
const MAX_CLAIMS=256;
/** Intentionally narrow: age 55 for EARLY retirement does not conflict. */
const labelledAge=/\bnormal(?:[ \t_-]+retirement)?[ \t_-]+age(?:[ \t]*\([ \t]*NRA[ \t]*\))?[ \t]*(?:(?:is|equals|of|at(?:[ \t]+age)?)\b|[:=])?[ \t]*(\d{1,3})(?![\d.])/gi;
function isNormalAgeField(path:string):boolean {
  if(typeof path!=='string')return false;
  const field=path.split('/').at(-1)?.replace(/~1/g,'/').replace(/~0/g,'~')??'';
  return /^(?:normal[_ -]?age|normal[_ -]?retirement[_ -]?age|normalretirementage|nra)$/i.test(field);
}
/**
 * "Unscannable" blocks preliminary acceptance, not merely the review UI.
 * The parser's record ranges are honored, preventing a label on one page,
 * spreadsheet cell, or paragraph from claiming a digit in another record.
 */
export function inspectNormalAgeSourceConflict(
  doc:SourceDocument,path:string
):NormalAgeConflict {
  const empty=(state:NormalAgeConflict['state']):NormalAgeConflict=>({
    state,claims:[],distinctAges:[]
  });
  if(!isNormalAgeField(path))return empty('not-applicable');
  if(!doc||typeof doc.text!=='string'||doc.text.length>MAX_SCAN_CHARS)
    return empty('unscannable');
  const ranges=doc.records?.length?doc.records:
    [{start:0,end:doc.text.length,label:'Document',location:{kind:'document'}}];
  if(ranges.length>10000)return empty('unscannable');
  let last=0;
  const claims:NormalAgeClaim[]=[];
  for(const record of ranges){
    if(!record||!Number.isSafeInteger(record.start)||!Number.isSafeInteger(record.end)||
       record.start<last||record.end>doc.text.length||record.end<=record.start)
      return empty('unscannable');
    last=record.end;
    const segment=doc.text.slice(record.start,record.end);
    let offset=record.start;
    for(const rawLine of segment.split('\n')){
      const line=rawLine.endsWith('\r')?rawLine.slice(0,-1):rawLine;
      // Original-source declarations, never normalized text or invented lines.
      for(const match of line.matchAll(labelledAge)){
        const token=match[1];
        const localStart=match.index+match[0].lastIndexOf(token);
        const start=offset+localStart,end=start+token.length;
        const age=Number(token);
        if(!Number.isInteger(age)||age<0||age>125)continue;
        if(selectedCitationIsInstructionRisk(doc.text,start,end)||
           selectedCitationExpresslyDisclaimed(doc.text,start,end))continue;
        claims.push({age,start,end});
        if(claims.length>MAX_CLAIMS)return empty('unscannable');
      }
      offset+=rawLine.length+1;
    }
  }
  const distinctAges=[...new Set(claims.map(claim=>claim.age))].sort((a,b)=>a-b);
  return {state:distinctAges.length>1?'unresolved':'clear',claims,distinctAges};
}
