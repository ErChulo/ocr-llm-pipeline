import { unzipSync, strFromU8 } from 'fflate';
import { DOMParser, type Node as XmlNode, type Element as XmlElement } from '@xmldom/xmldom';
import type { SourceDocument, SourceRecord, SourceReviewIssue } from './pipeline.ts';

const MAX_ARCHIVE = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED = 40 * 1024 * 1024;
const MAX_TEXT = 2 * 1024 * 1024;
const MAX_RECORDS = 25000;
const MAX_XML_PART = 15 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
type FileParts = Record<string, Uint8Array>;
type Entry = { label: string; value: string; location: Record<string, string | number> };

function officeArchive(data: Uint8Array, chosen: (name: string) => boolean) {
  if (data.length > MAX_ARCHIVE || data.length < 4 || data[0] !== 80 || data[1] !== 75) {
    throw new Error('Not a supported ZIP-based Office document, or file exceeds 20 MB.');
  }
  const omitted: string[] = [];
  let used = 0, entries = 0;
  const files = unzipSync(data, {
    filter: entry => {
      if (++entries > 5000) throw new Error('The Office archive contains too many entries.');
      if (!chosen(entry.name)) { omitted.push(entry.name); return false; }
      if (entry.originalSize > MAX_XML_PART || entry.originalSize < 0 ||
        used + entry.originalSize > MAX_UNCOMPRESSED) {
        throw new Error('Office archive is too large after decompression.');
      }
      used += entry.originalSize;
      return true;
    }
  });
  // Filter declarations in a ZIP are not a substitute for checking the
  // actual inflated buffers. Reject inconsistent or unexpectedly large parts.
  let actualBytes=0;
  for(const [name,bytes] of Object.entries(files)){
    if(bytes.length>MAX_XML_PART){
      throw new Error('Office XML part exceeds the decompressed-size limit: '+name);
    }
    actualBytes+=bytes.length;
    if(actualBytes>MAX_UNCOMPRESSED){
      throw new Error('Office archive exceeds the total decompressed-size limit.');
    }
  }
  return { files, omitted };
}
function getPart(files: FileParts, name: string): string {
  const bytes = files[name];
  if (!bytes) throw new Error('The Office file is missing ' + name + '.');
  return decoder.decode(bytes);
}
function xmlDoc(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('External or custom XML entities are not accepted.');
  const parsed = new DOMParser().parseFromString(text, 'text/xml');
  if (parsed.getElementsByTagName('parsererror').length) throw new Error('Invalid Office XML.');
  return parsed;
}
function children(node: XmlNode, localName: string): XmlElement[] {
  const found: XmlElement[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child && child.nodeType === 1 && child.localName === localName) found.push(child as XmlElement);
  }
  return found;
}
function descendants(node: XmlNode, localName: string): XmlElement[] {
  const all: XmlElement[] = [];
  function descend(n: XmlNode) {
    for (let i=0;i<n.childNodes.length;i++) {
      const x=n.childNodes.item(i);
      if (!x) continue;
      if (x.nodeType === 1 && x.localName === localName) all.push(x as XmlElement);
      descend(x);
    }
  }
  descend(node);
  return all;
}
function textOf(node: XmlNode): string {
  let result='';
  function walk(n: XmlNode) {
    if (n.nodeType === 1) {
      if (n.localName === 't') { result += n.textContent ?? ''; return; }
      if (n.localName === 'tab') { result += '\t'; return; }
      if (n.localName === 'br' || n.localName === 'cr') { result += '\n'; return; }
    }
    for (let i=0;i<n.childNodes.length;i++) {
      const child=n.childNodes.item(i);
      if (child) walk(child);
    }
  }
  walk(node);
  return result.trim();
}
function appendRecords(fileName: string, kind: 'docx'|'xlsx', entries: Entry[], warnings: string[]): SourceDocument {
  if (!entries.length) throw new Error('No readable text was found in this Office document.');
  const records: SourceRecord[] = [];
  const lines: string[] = [];
  let pos=0;
  for (const entry of entries) {
    const item=entry.label + ': ' + entry.value + '\n';
    if (pos + item.length > MAX_TEXT) throw new Error('Extracted Office text exceeds the safety limit of 2 million characters.');
    lines.push(item);
    records.push({ start: pos, end: pos + item.length, label: entry.label, location: entry.location });
    pos += item.length;
  }
  return {
    id: fileName, name: fileName, text: lines.join(''), mimeType: kind === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 0,
    provenance: { source: kind === 'docx' ? 'docx-native' : 'xlsx-native', precision: kind === 'docx' ? 'paragraph' : 'cell', fileName },
    records,
    warnings
  };
}
export function parseDocx(fileName: string, data: Uint8Array): SourceDocument {
  const {files, omitted}=officeArchive(data,n=>n==='word/document.xml'||n==='[Content_Types].xml' ||
    /^word\/(?:header|footer)\d+\.xml$/.test(n) ||
    n==='word/footnotes.xml'||n==='word/endnotes.xml');
  // Require the Office content-type manifest; do not accept arbitrary ZIP files.
  const types=xmlDoc(getPart(files,'[Content_Types].xml'));
  if(!descendants(types,'Types').length){
    throw new Error('DOCX content-type manifest is invalid.');
  }
  const doc=xmlDoc(getPart(files,'word/document.xml'));
  const body=descendants(doc,'body')[0];
  if (!body) throw new Error('DOCX does not contain a document body.');
  const entries:Entry[]=[];
  let paragraph=0,table=0;
  for (const node of Array.from({length:body.childNodes.length},(_,i)=>body.childNodes.item(i))) {
    if (!node || node.nodeType!==1) continue;
    if (node.localName==='p') {
      paragraph++;
      const value=textOf(node);
      if(value) entries.push({label:'Paragraph '+paragraph,value,location:{kind:'docx-paragraph',paragraph}});
    } else if (node.localName==='tbl') {
      table++;
      let row=0;
      for (const tr of children(node,'tr')) {
        row++;
        let col=0;
        for(const tc of children(tr,'tc')) {
          col++;
          const value=textOf(tc);
          if(value) entries.push({label:'Table '+table+' row '+row+' column '+col,value,
            location:{kind:'docx-cell',table,row,column:col}});
        }
      }
    }
    if(entries.length>MAX_RECORDS)throw new Error('DOCX exceeds the maximum record limit.');
  }
  const warnings:string[]=[];
  for(const part of Object.keys(files).filter(n=>/^word\/(?:header|footer)\d+\.xml$/.test(n)).sort()){
    const section=part.includes('header')?'header':'footer';
    const content=xmlDoc(getPart(files,part));
    let paragraphNo=0;
    for(const p of descendants(content,'p')){
      paragraphNo++;
      const value=textOf(p);
      if(value){
        entries.push({
          label:part+' paragraph '+paragraphNo,
          value,
          location:{kind:'docx-'+section,part,paragraph:paragraphNo}
        });
      }
    }
    warnings.push('Word '+section+' content was read from '+part+
      '. The file does not establish which page repeats this content.');
  }
  for(const section of ['footnotes','endnotes'] as const){
    const part='word/'+section+'.xml';
    if(!files[part])continue;
    const content=xmlDoc(getPart(files,part));
    for(const note of descendants(content,section==='footnotes'?'footnote':'endnote')){
      const rawId=note.getAttribute('w:id') ||
        note.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','id');
      if(rawId===null || !/^\d+$/.test(rawId))continue;
      const noteId=Number(rawId);
      if(!Number.isSafeInteger(noteId))throw new Error('Word note ID exceeds safe range.');
      const value=descendants(note,'p').map(p=>textOf(p)).filter(Boolean).join('\n');
      if(value)entries.push({
        label:section+' '+noteId,
        value,
        location:{kind:'docx-'+(section==='footnotes'?'footnote':'endnote'),part,noteId}
      });
    }
    warnings.push('Word '+section+' were included by note ID, without a verified page location.');
  }
  if (omitted.some(n=>/^word\/(?:comments|commentsExtended)/i.test(n)))
    warnings.push('Word comments are not included in the extracted source.');
  if(entries.length>MAX_RECORDS)throw new Error('DOCX exceeds the maximum record limit.');
  if (omitted.some(n=>/^word\/media\//i.test(n)) || descendants(doc,'drawing').length ||
      descendants(doc,'pict').length) warnings.push('Images and drawing text are not OCR processed.');
  if (descendants(doc,'altChunk').length) throw new Error('DOCX contains embedded alternate content that this parser cannot inspect.');
  if (descendants(doc,'ins').length||descendants(doc,'del').length) warnings.push('Track changes exist. Review accepted and deleted text in Word.');
  const reviewIssues:SourceReviewIssue[]=[];
  if(omitted.some(n=>/^word\/(?:comments|commentsExtended)/i.test(n))){
    reviewIssues.push({id:'docx:comments',category:'office_unreviewed_content',
      message:'Word comments were omitted; inspect the original document for important qualifications.'});
  }
  if(descendants(doc,'ins').length||descendants(doc,'del').length){
    reviewIssues.push({id:'docx:track-changes',category:'office_unreviewed_content',
      message:'The DOCX contains tracked changes. Inspect accepted and deleted clauses in Word.'});
  }
  if(omitted.some(n=>/^word\/media\//i.test(n))||
    descendants(doc,'drawing').length||descendants(doc,'pict').length){
    reviewIssues.push({id:'docx:drawings',category:'office_unreviewed_content',
      message:'DOCX drawings or images may contain plan text that this parser did not read.'});
  }
  const parsed=appendRecords(fileName,'docx',entries,warnings);
  parsed.reviewIssues=reviewIssues;
  return parsed;
}
function workbookTarget(name: string) {
  const clean=name.replace(/^\/+/,'');
  const resolved=new URL(clean,'https://local.invalid/xl/').pathname.slice(1);
  if (!resolved.startsWith('xl/')) throw new Error('Excel workbook references an invalid sheet path.');
  return resolved;
}
export function parseXlsx(fileName: string, data: Uint8Array): SourceDocument {
  const keep=(n:string)=>n==='xl/workbook.xml'||n==='xl/_rels/workbook.xml.rels'||
    n==='xl/sharedStrings.xml'||n.startsWith('xl/worksheets/')&&n.endsWith('.xml');
  const {files,omitted}=officeArchive(data,keep);
  const workbook=xmlDoc(getPart(files,'xl/workbook.xml'));
  const rel=xmlDoc(getPart(files,'xl/_rels/workbook.xml.rels'));
  const relationships=new Map(descendants(rel,'Relationship').map(x=>[x.getAttribute('Id')||'',x.getAttribute('Target')||'']));
  const ss=files['xl/sharedStrings.xml'] ? descendants(xmlDoc(strFromU8(files['xl/sharedStrings.xml'])),'si')
    .map(item=>descendants(item,'t').map(x=>x.textContent||'').join('')) : [];
  const entries:Entry[]=[];
  const warnings:string[]=[];
  let formulas=0;
  for(const sheet of descendants(workbook,'sheet')) {
    const sheetName=sheet.getAttribute('name')||'Unnamed';
    const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'';
    const target=relationships.get(rid);
    if(!target)throw new Error('No worksheet relationship for '+sheetName+'.');
    const part=workbookTarget(target);
    const xml=xmlDoc(getPart(files,part));
    for(const c of descendants(xml,'c')) {
      const cell=c.getAttribute('r')||'';
      if(!/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(cell))throw new Error('Invalid cell reference: '+cell);
      const type=c.getAttribute('t')||'';
      const f=children(c,'f')[0];
      const v=children(c,'v')[0]?.textContent||'';
      let value='';
      if(type==='s'){
        const idx=Number(v);
        if(!Number.isInteger(idx)||idx<0||idx>=ss.length)throw new Error('Invalid shared-string index at '+sheetName+'!'+cell);
        value=ss[idx];
      } else if(type==='inlineStr') {
        const inline=children(c,'is')[0];
        value=inline ? descendants(inline,'t').map(x=>x.textContent||'').join('') : '';
      } else if(type==='b') value=v==='1'?'TRUE':v==='0'?'FALSE':v;
      else if(type==='str'||type==='n'||type===''||type==='e'||type==='d') value=v;
      else throw new Error('Unsupported Excel cell type at '+sheetName+'!'+cell+': '+type);
      if(f) {formulas++;if(!value)value='[formula without cached value]';}
      if(value.trim()) entries.push({label:sheetName+'!'+cell,value,
        location:{kind:'xlsx-cell',sheet:sheetName,cell}});
      if(entries.length>MAX_RECORDS)throw new Error('XLSX exceeds the maximum record limit.');
    }
  }
  if(formulas) warnings.push(formulas+' formula cells found. Cached values were read, not recalculated.');
  if(omitted.some(n=>/^xl\/media\//.test(n)))warnings.push('Workbook images and charts are not extracted.');
  warnings.push('Excel date styles are not interpreted; numeric date serials need review.');
  const reviewIssues:SourceReviewIssue[]=[];
  if(formulas>0)reviewIssues.push({id:'xlsx:formulas',category:'office_unreviewed_content',
    message:formulas+' formula cells were imported from cached results only. Check the original workbook calculations.'});
  if(omitted.some(n=>/^xl\/media\//.test(n)))reviewIssues.push({
    id:'xlsx:media',category:'office_unreviewed_content',
    message:'Some images or charts were omitted. Inspect the original workbook.'});
  const parsed=appendRecords(fileName,'xlsx',entries,warnings);
  parsed.reviewIssues=reviewIssues;
  return parsed;
}
