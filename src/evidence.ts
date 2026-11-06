/**
 * Deterministic, source-text evidence candidates.
 * An exact match is NOT independent factual verification. User review required.
 * Never turn a text section offset into a fabricated PDF/page/region citation.
 */
import type { SourceDocument, SourceRecord } from './pipeline.ts';

export type EvidenceMatch = {
  start: number;
  end: number;
  quote: string;
  label: string;
  location: Record<string, string | number>;
};
export type EvidenceCheck = {
  path: string;
  value: string | number | boolean;
  matches: EvidenceMatch[];
  status: 'match' | 'missing' | 'unsupported';
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
  if (typeof value !== 'number') return true;
  // "65" must not match "1965", "650", or "65.5".
  const before=source[start-1]||'', after=source[end]||'';
  return !/[0-9]/.test(before) && !/[0-9]/.test(after) &&
    !(after==='.' && /[0-9]/.test(source[end+1]||'')) &&
    !(before==='.' && /[0-9]/.test(source[start-2]||''));
}
function findMatches(doc: SourceDocument,value: unknown): EvidenceMatch[] {
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
      if (boundaryOkay(doc.text,at,end,value)) {
        matches.push({
          start:at,end,
          quote:doc.text.slice(Math.max(contentStart,at-WINDOW),Math.min(record.end,end+WINDOW)).trim(),
          label:record.label,
          location:{...record.location}
        });
      }
    }
  }
  return matches;
}
export function auditLiteralEvidence(doc: SourceDocument, extraction: unknown): EvidenceCheck[] {
  if (!object(extraction)) throw new Error('Only JSON objects can be reviewed.');
  return fields(extraction).map(({path,value}):EvidenceCheck=>{
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return {path,value:String(value),matches:[],status:'unsupported'};
    }
    const matches=findMatches(doc,value);
    return {path,value,matches,status:matches.length?'match':'missing'};
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
