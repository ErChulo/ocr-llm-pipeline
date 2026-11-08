/**
 * Deterministic, source-text evidence candidates.
 * An exact match is NOT independent factual verification. User review required.
 * Never turn a text section offset into a fabricated PDF/page/region citation.
 */
import type { SourceDocument, SourceRecord } from './pipeline.ts';
import type { ExtractionAudit, SourceSpan } from './chunkExtraction.ts';

export type EvidenceMatch = {
  start: number;
  end: number;
  quote: string;
  label: string;
  location: Record<string, string | number>;
  textItemBoxes?: Array<{ x:number; y:number; width:number; height:number; precision:'pdf-text-item-envelope'|'pdf-ocr-word-envelope' }>;
  sourceScope?: 'model_sections' | 'reviewer_edited';
  evidenceMethod?: 'literal_value' | 'reviewer_quoted_passage';
};
export type EvidenceCheck = {
  path: string;
  value: string | number | boolean;
  matches: EvidenceMatch[];
  status: 'match' | 'missing' | 'unsupported';
  sourceScope?: 'model_sections' | 'reviewer_edited';
  evidenceMethod?: 'literal_value' | 'reviewer_quoted_passage';
};

const MAX_MATCHES = 32;
const MAX_FIELDS = 512;
const WINDOW = 48;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function pathPart(part: string) { return part.replace(/~/g, '~0').replace(/\//g, '~1'); }
function fields(value: unknown, path = '', into: Array<{path:string; value: unknown}> = []): Array<{path:string;value:unknown}> {
  const obj = object(value);
  if (obj) {
    for (const [key, item] of Object.entries(obj)) {
      fields(item,path+'/'+pathPart(key),into);
      if (into.length > MAX_FIELDS) throw new Error('JSON contains more than 512 values to review.');
    }
  } else if (Array.isArray(value)) {
    for (let i=0;i<value.length;i++) {
      fields(value[i],path+'/'+i,into);
      if (into.length > MAX_FIELDS) throw new Error('JSON contains more than 512 values to review.');
    }
  } else if (value !== null && value !== undefined) {
    into.push({path, value});
  }
  return into;
}

function bodyStart(text: string, record: SourceRecord): number {
  // Strip only a metadata label actually inserted by the parser.
  // Plain text colons are part of the user's document.
  const prefix = record.label + ':';
  if (!text.startsWith(prefix, record.start)) return record.start;
  const after = text[record.start + prefix.length];
  return after === '\n' || after === ' '
    ? record.start + prefix.length + 1
    : record.start;
}
function recordsFor(doc: SourceDocument): Array<SourceRecord> {
  if (doc.records?.length) return doc.records;
  return [{start:0,end:doc.text.length,label:'Document',location:{kind:'document'}}];
}
function tokenFor(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  // True/false often summarizes complex conditions; the literal English text
  // "true" or "false" is not evidence of that claim.
  return null;
}
function boundaryOkay(source: string,start: number,end: number,value: unknown): boolean {
  // Match whole numeric tokens, including numeric strings from JSON schemas.
  const token=typeof value==='number' && Number.isFinite(value)?String(value):
    typeof value==='string'?value.trim():'';
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)){
    if(typeof value!=='string')return true;
    // A code or quoted phrase must not be supported by a substring of a
    // longer token (e.g. "SLA" from "SLA99", "service" from "services").
    // Hyphens and slashes between words can also change a pension form code.
    const word=/[\p{L}\p{N}\p{M}_]/u;
    const characters=Array.from(token);
    const first=characters[0]??'',last=characters.at(-1)??'';
    const before=source[start-1]||'',after=source[end]||'';
    const prev=source[start-2]||'',next=source[end+1]||'';
    // A positive percentage must not borrow textual evidence from a
    // negative or explicitly signed percentage. Parenthesized amounts can
    // be accounting negatives; refuse rather than infer the sign.
    if(/^(?:\d+(?:\.\d+)?|\.\d+)[ \t]?%$/.test(token)){
      if(/[-+−–]\s*$/.test(source.slice(Math.max(0,start-8),start)))return false;
      if(before==='('&&after===')')return false;
    }
    if(word.test(first) && word.test(before))return false;
    if(word.test(last) && word.test(after))return false;
    if(word.test(first) && /[-–/]/.test(before) && word.test(prev))return false;
    if(word.test(last) && /[-–/]/.test(after) && word.test(next))return false;
    return true;
  }
  const before=source[start-1]||'', after=source[end]||'';
  const prev=source[start-2]||'', next=source[end+1]||'';
  // Do not cite part of a larger number, field code, amount, or exponent.
  if(/[0-9A-Za-z_]/.test(before)||/[0-9A-Za-z_]/.test(after))return false;
  if((before==='.'||before===',')&&/[0-9]/.test(prev))return false;
  if((after==='.'||after===',')&&/[0-9]/.test(next))return false;
  // Positive values must not be backed by a negative or signed quantity.
  if(!/^[+-]/.test(token)){
    if(/[-+−–]/.test(before))return false;
    if(/[-+−–]\s*[$€£]?\s*$/.test(source.slice(Math.max(0,start-8),start)))return false;
  }
  // Parentheses may indicate a negative accounting amount.
  if(after===')' && before==='(')return false;
  if(after===')' && before==='$' && prev==='(')return false;
  // Scientific notation is not the same as the bare mantissa/exponent.
  if(/^[eE][+-]?\d/.test(source.slice(end,end+4)))return false;
  if(/[eE]/.test(before)&&/[0-9]/.test(prev))return false;
  return true;
}
/**
 * When a field exactly matches a value returned by the GGUF, only offer
 * evidence inside the source section(s) used to produce that candidate.
 * Review-edited values are allowed to search the full document, but still
 * require explicit human source confirmation.
 */
function candidateSectionSpans(audit: ExtractionAudit | undefined,path:string,value:unknown)
  : SourceSpan[] | null {
  if(!audit) return null;
  const segments=path.split('/').slice(1).map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'));
  for(let count=segments.length;count>=1;count--){
    const candidatePath='/'+segments.slice(0,count).map(x=>x.replace(/~/g,'~0').replace(/\//g,'~1')).join('/');
    const options=audit.candidates[candidatePath];
    if(!options)continue;
    const spans:SourceSpan[]=[];
    for(const option of options){
      let current:unknown=option.value;
      for(const segment of segments.slice(count)){
        if(Array.isArray(current) && /^\d+$/.test(segment)){
          current=current[Number(segment)];
        }else if(current&&typeof current==='object'&&!Array.isArray(current)){
          current=(current as Record<string,unknown>)[segment];
        }else{current=undefined;break;}
      }
      if(Object.is(current,value))spans.push(...option.spans);
    }
    if(spans.length)return spans;
  }
  return null;
}
function findMatches(doc: SourceDocument,value: unknown,allowed:SourceSpan[] | null=null): EvidenceMatch[] {
  const target=tokenFor(value);
  if (!target || target.length > 800) return [];
  const matches: EvidenceMatch[]=[];
  // Regex matching returns offsets into the ORIGINAL source. Lowercasing the
  // entire Unicode string can change its length and corrupt citation offsets.
  const needle = new RegExp(target.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&'), 'gi');
  for (const record of recordsFor(doc)) {
    if (!Number.isInteger(record.start) || !Number.isInteger(record.end) ||
      record.start<0 || record.end>doc.text.length || record.end<=record.start) {
      throw new Error('Document source ranges are invalid. Evidence review is blocked.');
    }
    const contentStart=bodyStart(doc.text,record);
    if (contentStart>record.end) throw new Error('Document record label exceeds its range.');
    needle.lastIndex=contentStart;
    while (needle.lastIndex<record.end && matches.length<MAX_MATCHES) {
      const matched=needle.exec(doc.text);
      if(!matched || matched.index+matched[0].length>record.end) break;
      const at=matched.index;
      const end=at+matched[0].length;
      if (boundaryOkay(doc.text,at,end,value) &&
        (!allowed || allowed.some(section=>at>=section.start&&end<=section.end))) {
        matches.push({
          start:at,end,
          quote:doc.text.slice(Math.max(contentStart,at-WINDOW),Math.min(record.end,end+WINDOW)).trim(),
          label:record.label,
          location:{...record.location},
          ...(record.textSpans ? { textItemBoxes:record.textSpans
            .filter(s=>s.start<end&&s.end>at)
            .map(s=>({ ...s.box, precision:s.precision })) } : {})
        });
      }
    }
  }
  return matches;
}
export function auditLiteralEvidence(doc: SourceDocument, extraction: unknown,
  audit?: ExtractionAudit, reviewerQuotes:Record<string,string>={}): EvidenceCheck[] {
  if (!object(extraction)) throw new Error('Only JSON objects can be reviewed.');
  return fields(extraction).map(({path,value}):EvidenceCheck=>{
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return {path,value:String(value),matches:[],status:'unsupported'};
    }
    const scoped=candidateSectionSpans(audit,path,value);
    const originalMatches=findMatches(doc,value,scoped);
    const rawQuote=reviewerQuotes[path]?.trim()||'';
    // A reviewer can cite an exact passage for a boolean or normalized value.
    // Merely typing "true" or inventing a quote must never satisfy evidence.
    const quoteMatches=rawQuote.length>=8&&rawQuote.length<=300
      ? findMatches(doc,rawQuote,scoped) : [];
    const method: 'literal_value' | 'reviewer_quoted_passage'=
      originalMatches.length?'literal_value':'reviewer_quoted_passage';
    const matches=originalMatches.length?originalMatches:quoteMatches;
    const sourceScope=audit?(scoped?'model_sections':'reviewer_edited'):undefined;
    return {path,value,
      matches:matches.map(match=>({
        ...match, evidenceMethod:method,
        ...(sourceScope?{sourceScope}:{})
      })),
      status:matches.length?'match':'missing',
      evidenceMethod:method,
      ...(sourceScope?{sourceScope}:{})};
  });
}
/**
 * Bind reviewer confirmations to the EXACT current JSON leaf set and values.
 * Schema-valid JSON can still change after a previous evidence review; an
 * unrelated or stale list of confirmations must never authorize its export.
 * Null and absent fields need no citations, but old citations cannot survive
 * their removal. JSON-pointer paths preserve array indices and escaped keys.
 */
export function evidenceMatchesCurrentValue(value:unknown,checks:EvidenceCheck[]):boolean {
  if(!object(value)||!Array.isArray(checks))return false;
  try {
    const leaves=fields(value);
    if(!leaves.length||leaves.length!==checks.length)return false;
    const expected=new Map(leaves.map(leaf=>[leaf.path,leaf.value]));
    if(expected.size!==leaves.length)return false;
    const visited=new Set<string>();
    for(const check of checks){
      if(!check||typeof check.path!=='string'||visited.has(check.path)||
         !expected.has(check.path)||!Object.is(expected.get(check.path),check.value)){
        return false;
      }
      visited.add(check.path);
    }
    return true;
  } catch {
    // Malformed or overly large edited JSON must fail closed at export.
    return false;
  }
}


/** Recheck selected source quotes, text offsets and parser record locations at export. */
export function evidenceSelectionsAnchoredToDocument(
  doc:SourceDocument,checks:EvidenceCheck[],selections:Record<string,number>
):boolean {
  if(!doc||typeof doc.text!=='string'||!Array.isArray(checks))return false;
  try {
    const records=recordsFor(doc);
    let previous=0;
    for(const record of records){
      if(!Number.isSafeInteger(record.start)||!Number.isSafeInteger(record.end)||
         record.start<previous||record.end<=record.start||record.end>doc.text.length)return false;
      previous=record.end;
    }
    for(const check of checks){
      if(!check||!Array.isArray(check.matches))return false;
      const index=selections[check.path];
      if(!Number.isSafeInteger(index)||index<0||index>=check.matches.length)return false;
      const match=check.matches[index];
      if(!match||!Number.isSafeInteger(match.start)||!Number.isSafeInteger(match.end)||
         match.start<0||match.end<=match.start||match.end>doc.text.length)return false;
      let low=0,high=records.length-1,record:SourceRecord|undefined;
      while(low<=high){
        const mid=(low+high)>>>1;
        const current=records[mid];
        if(match.start<current.start)high=mid-1;
        else if(match.start>=current.end)low=mid+1;
        else{record=current;break;}
      }
      if(!record||match.end>record.end||match.label!==record.label||
         !match.location||typeof match.location!=='object')return false;
      const location=Object.entries(record.location);
      if(Object.keys(match.location).length!==location.length||
         location.some(([key,value])=>match.location[key]!==value))return false;
      // PDF.js evidence boxes are approximate text-item envelopes, not
      // exact glyph coordinates. Never permit an exported review to supply
      // different boxes than the PDF parser recorded for the selected text.
      const expectedBoxes=record.textSpans?.filter(s=>
        s.start<match.end&&s.end>match.start
      ).map(s=>({...s.box,precision:s.precision}));
      if(expectedBoxes){
        if(!Array.isArray(match.textItemBoxes)||
           match.textItemBoxes.length!==expectedBoxes.length)return false;
        for(let i=0;i<expectedBoxes.length;i++){
          const expected=expectedBoxes[i],actual=match.textItemBoxes[i];
          if(!actual || Object.keys(actual).length!==5||
             (['x','y','width','height'] as const).some(k=>
               !Number.isFinite(actual[k])||actual[k]!==expected[k])||
             actual.precision!==expected.precision)return false;
        }
      }else if(match.textItemBoxes!==undefined){
        // A non-PDF source may not claim PDF coordinates.
        return false;
      }
      const contentStart=bodyStart(doc.text,record);
      if(match.start<contentStart)return false;
      const excerpt=doc.text.slice(
        Math.max(contentStart,match.start-WINDOW),
        Math.min(record.end,match.end+WINDOW)
      ).trim();
      if(excerpt!==match.quote)return false;
      const matchedText=doc.text.slice(match.start,match.end);
      const method=check.evidenceMethod??'literal_value';
      if(match.evidenceMethod && match.evidenceMethod!==method)return false;
      if(method==='reviewer_quoted_passage'){
        if(matchedText.length<8||matchedText.length>300||
           !boundaryOkay(doc.text,match.start,match.end,matchedText))return false;
      }else if(method==='literal_value'){
        const token=tokenFor(check.value);
        // Match the same case-insensitive literal that evidence discovery
        // matched; never accept a different substring at the old offset.
        if(!token||token.length>800||
           token.toLowerCase()!==matchedText.toLowerCase()||
           !boundaryOkay(doc.text,match.start,match.end,check.value))return false;
      }else return false;
    }
    return true;
  }catch{return false;}
}

export function evidenceReviewComplete(
  checks: EvidenceCheck[],
  selections: Record<string,number>,
  confirmed: Record<string,boolean>
): boolean {
  if (!checks.length) return false;
  return checks.every(check => check.status==='match' && confirmed[check.path]===true &&
    Object.hasOwn(selections,check.path) &&
    Number.isInteger(selections[check.path]) &&
    selections[check.path]>=0 && selections[check.path]<check.matches.length);
}
export function exportReviewedEvidence(
  checks: EvidenceCheck[], selections: Record<string,number>,
  confirmed: Record<string,boolean>
): Record<string,EvidenceMatch> {
  if (!evidenceReviewComplete(checks,selections,confirmed)) {
    throw new Error('Evidence review is incomplete; JSON export is blocked.');
  }
  const result:Record<string,EvidenceMatch>=Object.create(null);
  for (const check of checks) {
    Object.defineProperty(result,check.path,{
      value:check.matches[selections[check.path]],enumerable:true,writable:true,configurable:true
    });
  }
  return result;
}
