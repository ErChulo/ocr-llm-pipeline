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
  textItemBoxes?: Array<{ x:number; y:number; width:number; height:number; precision:'pdf-text-item-envelope' }>;
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
  // Both number-typed values and numeric strings need token boundaries.
  // Schemas often represent pension ages / amounts as strings.
  const token=typeof value==='number' && Number.isFinite(value)?String(value):
    typeof value==='string'?value.trim():'';
  if(!/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$/.test(token)){
    return true;
  }
  const before=source[start-1]||'',after=source[end]||'';
  const prev=source[start-2]||'',next=source[end+1]||'';
  // Reject substrings of longer decimal, alphanumeric and grouped tokens.
  if(/[0-9A-Za-z_]/.test(before)||/[0-9A-Za-z_]/.test(after))return false;
  if((before==='.'||before===',')&&/[0-9]/.test(prev))return false;
  if((after==='.'||after===',')&&/[0-9]/.test(next))return false;
  // Do not cite positive numbers from negative/signed source amounts,
  // including -65, -$65, Unicode minus, or 65 embedded in a range.
  if(!/^[+-]/.test(token) && /[-+−–]/.test(before))return false;
  if(/[-+−–]\\s*[$€£]?\\s*$/.test(source.slice(Math.max(0,start-8),start)) &&
     !/^[+-]/.test(token))return false;
  // Accounting negatives such as (65) and ($65) are not positive 65.
  if(after===')'&&(before==='('||(before==='
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
&&prev==='(')))return false;
  // 65e3 and 1e65 must not count as the numeric value 65.
  if(/^[eE][+-]?\\d/.test(source.slice(end,end+4)))return false;
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
