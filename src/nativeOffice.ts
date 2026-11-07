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
// The source importer models the displayed final revision, not Word's
// "original" markup. Deleted/moved-from text must never support a citation.
function removedRevision(node: XmlNode): boolean {
  for(let current:XmlNode|null=node;current;current=current.parentNode){
    if(current.nodeType===1 &&
       (current.localName==='del'||current.localName==='moveFrom'))return true;
  }
  return false;
}
function hiddenRun(node: XmlNode): boolean {
  if(node.nodeType!==1||node.localName!=='r')return false;
  const props=children(node,'rPr')[0];
  if(!props)return false;
  return ['vanish','webHidden'].some(name=>children(props,name).some(flag=>{
    const val=flag.getAttribute('w:val')||
      flag.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','val')||
      flag.getAttribute('val');
    return val===null || !/^(?:0|false|off)$/i.test(val);
  }));
}
function textOf(node: XmlNode): string {
  let result='';
  function walk(n: XmlNode) {
    if (n.nodeType === 1) {
      if(n.localName==='del'||n.localName==='moveFrom'||n.localName==='delText'||
         hiddenRun(n))return;
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
  // Top-level content controls may wrap ordinary paragraphs/tables. Traverse
  // the displayed content, retaining reading order and parser-derived labels.
  function appendBlock(node: XmlNode):void {
    if(node.nodeType!==1)return;
    if(node.localName==='del'||node.localName==='moveFrom')return;
    if(node.localName==='p'){
      paragraph++;
      const value=textOf(node);
      if(value)entries.push({label:'Paragraph '+paragraph,value,
        location:{kind:'docx-paragraph',paragraph}});
    }else if(node.localName==='tbl'){
      table++;
      let row=0;
      for(const tr of children(node,'tr')){
        row++;
        let col=0;
        for(const tc of children(tr,'tc')){
          col++;
          const value=textOf(tc);
          if(value)entries.push({label:'Table '+table+' row '+row+' column '+col,
            value,location:{kind:'docx-cell',table,row,column:col}});
        }
      }
    }else if(node.localName==='sdt'){
      for(const content of children(node,'sdtContent'))
        for(const child of Array.from({length:content.childNodes.length},(_,i)=>content.childNodes.item(i)))
          if(child)appendBlock(child);
    }else if(['customXml','ins','moveTo'].includes(node.localName||'')){
      for(const child of Array.from({length:node.childNodes.length},(_,i)=>node.childNodes.item(i)))
        if(child)appendBlock(child);
    }
    if(entries.length>MAX_RECORDS)throw new Error('DOCX exceeds the maximum record limit.');
  }
  for(let i=0;i<body.childNodes.length;i++){
    const node=body.childNodes.item(i);
    if(node)appendBlock(node);
  }
  const warnings:string[]=[];
  for(const part of Object.keys(files).filter(n=>/^word\/(?:header|footer)\d+\.xml$/.test(n)).sort()){
    const section=part.includes('header')?'header':'footer';
    const content=xmlDoc(getPart(files,part));
    let paragraphNo=0;
    for(const p of descendants(content,'p')){
      paragraphNo++;
      if(removedRevision(p))continue;
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
      const value=descendants(note,'p').filter(p=>!removedRevision(p))
        .map(p=>textOf(p)).filter(Boolean).join('\n');
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
  const inspectedParts=Object.entries(files)
    .filter(([name])=>name==='word/document.xml'||/^word\/(?:header|footer)\d+\.xml$/.test(name)||
      name==='word/footnotes.xml'||name==='word/endnotes.xml')
    .map(([,bytes])=>xmlDoc(decoder.decode(bytes)));
  if(inspectedParts.some(part=>descendants(part,'altChunk').length)){
    throw new Error('DOCX contains embedded alternate content that this parser cannot inspect.');
  }
  const hasRevisions=inspectedParts.some(part=>
    ['ins','del','moveFrom','moveTo'].some(name=>descendants(part,name).length>0));
  const hasHiddenText=inspectedParts.some(part=>descendants(part,'r').some(hiddenRun));
  if(hasRevisions)warnings.push(
    'Tracked revisions exist. Deleted or moved-from text was excluded; inserted or moved-to text was included. Verify Word revision status.');
  if(hasHiddenText)warnings.push(
    'Directly hidden Word text was excluded. Inspect visibility and any style-based hiding in the original document.');
  const reviewIssues:SourceReviewIssue[]=[];
  if(omitted.some(n=>/^word\/(?:comments|commentsExtended)/i.test(n))){
    reviewIssues.push({id:'docx:comments',category:'office_unreviewed_content',
      message:'Word comments were omitted; inspect the original document for important qualifications.'});
  }
  if(hasRevisions){
    reviewIssues.push({id:'docx:track-changes',category:'office_unreviewed_content',
      message:'Tracked changes exist. The extraction excludes deleted/moved-from text and includes inserted/moved-to text. Verify the intended revision state and all affected clauses in Word.'});
  }
  if(hasHiddenText){
    reviewIssues.push({id:'docx:hidden-text',category:'office_unreviewed_content',
      message:'Directly hidden Word runs were excluded. Review the original document for hidden provisions or text hidden through styles before export.'});
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
  // OOXML relationships may be relative to xl/workbook.xml or absolute
  // package paths (/xl/worksheets/sheet1.xml). Never resolve remote URLs.
  if(!name || /[\\?#%]/.test(name) ||
      /^[a-z][a-z0-9+.-]*:/i.test(name) || name.startsWith('//')){
    throw new Error('Excel workbook references an invalid or external sheet path.');
  }
  const parts=(name.startsWith('/')?name.slice(1):'xl/'+name).split('/');
  if(parts.some(part=>part==='..'))throw new Error('Excel worksheet path traversal is not allowed.');
  const resolved=parts.filter(part=>part && part!=='.').join('/');
  if(!/^xl\/worksheets\/[^/]+\.xml$/.test(resolved)){
    throw new Error('Excel workbook references a non-worksheet path.');
  }
  return resolved;
}
const BUILTIN_DATE_FORMATS=new Set([14,15,16,17,18,19,20,21,22,45,46,47]);
function excelDateStyles(files:FileParts):Set<number>{
  const bytes=files['xl/styles.xml'];
  if(!bytes)return new Set();
  const xml=xmlDoc(decoder.decode(bytes));
  const custom=new Map<number,string>();
  for(const nf of descendants(xml,'numFmt')){
    const id=Number(nf.getAttribute('numFmtId'));
    const format=nf.getAttribute('formatCode');
    if(Number.isInteger(id)&&format)custom.set(id,format);
  }
  const styleBlock=descendants(xml,'cellXfs')[0];
  const styles=new Set<number>();
  if(!styleBlock)return styles;
  children(styleBlock,'xf').forEach((xf,index)=>{
    const formatId=Number(xf.getAttribute('numFmtId')||'0');
    const fmt=custom.get(formatId)||'';
    // Strip escaped, quoted and locale-labeled literals. Detect only
    // plausible date/time formats. Never silently convert Excel serials.
    const simplified=fmt.replace(/"[^"]*"/g,'').replace(/\\./g,'')
      .replace(/\[[^\]]*\]/g,'').replace(/_.|\*./g,'');
    if(BUILTIN_DATE_FORMATS.has(formatId) || /[dyhs]/i.test(simplified)){
      styles.add(index);
    }
  });
  return styles;
}

export function parseXlsx(fileName: string, data: Uint8Array): SourceDocument {
  const keep=(n:string)=>n==='xl/workbook.xml'||n==='xl/_rels/workbook.xml.rels'||
    n==='xl/sharedStrings.xml'||n==='xl/styles.xml'||n.startsWith('xl/worksheets/')&&n.endsWith('.xml');
  const {files,omitted}=officeArchive(data,keep);
  const workbook=xmlDoc(getPart(files,'xl/workbook.xml'));
  const rel=xmlDoc(getPart(files,'xl/_rels/workbook.xml.rels'));
  const relationships=new Map(descendants(rel,'Relationship').map(x=>[x.getAttribute('Id')||'',{
    target:x.getAttribute('Target')||'',mode:x.getAttribute('TargetMode')||'',
    type:x.getAttribute('Type')||''
  }]));
  const ss=files['xl/sharedStrings.xml'] ? descendants(xmlDoc(strFromU8(files['xl/sharedStrings.xml'])),'si')
    .map(item=>descendants(item,'t').map(x=>x.textContent||'').join('')) : [];
  const entries:Entry[]=[];
  const warnings:string[]=[];
  const dateStyles=excelDateStyles(files);
  const hiddenSheets:string[]=[];
  const hiddenRows:string[]=[];
  const hiddenColumns:string[]=[];
  const mergedCells:string[]=[];
  let chartSheets=0;
  let dateCells=0;
  const dateExamples:string[]=[];
  let formulas=0;
  for(const sheet of descendants(workbook,'sheet')) {
    const sheetName=sheet.getAttribute('name')||'Unnamed';
    const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'';
    const relationship=relationships.get(rid);
    if(!relationship?.target)throw new Error('No worksheet relationship for '+sheetName+'.');
    if(relationship.mode.toLowerCase()==='external'){
      throw new Error('External worksheet relationships are not accepted: '+sheetName+'.');
    }
    if(relationship.type && !relationship.type.endsWith('/worksheet')){
      if(relationship.type.endsWith('/chartsheet')){ chartSheets++; continue; }
      throw new Error('Unexpected sheet relationship type for '+sheetName+'.');
    }
    if(['hidden','veryHidden'].includes(sheet.getAttribute('state')||''))hiddenSheets.push(sheetName);
    const part=workbookTarget(relationship.target);
    const xml=xmlDoc(getPart(files,part));
    const hiddenRowCount=descendants(xml,'row').filter(x=>
      /^(?:1|true)$/i.test(x.getAttribute('hidden')||'') && descendants(x,'c').length>0).length;
    if(hiddenRowCount)hiddenRows.push(sheetName+' ('+hiddenRowCount+' rows)');
    const hiddenColumnCount=descendants(xml,'col').filter(x=>
      /^(?:1|true)$/i.test(x.getAttribute('hidden')||'')).length;
    if(hiddenColumnCount)hiddenColumns.push(sheetName+' ('+hiddenColumnCount+' column ranges)');
    const mergeCount=descendants(xml,'mergeCell').length;
    if(mergeCount)mergedCells.push(sheetName+' ('+mergeCount+' merged ranges)');
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
      const styleIndex=Number(c.getAttribute('s')||'0');
      if(!Number.isInteger(styleIndex)||styleIndex<0||styleIndex>100000)
        throw new Error('Invalid Excel cell style index at '+sheetName+'!'+cell);
      const dateStyled=dateStyles.has(styleIndex) && (type==='n'||type==='') &&
        value.trim()!=='' && Number.isFinite(Number(value));
      if(dateStyled){
        dateCells++;
        if(dateExamples.length<4)dateExamples.push(sheetName+'!'+cell);
      }
      if(f) {formulas++;if(!value)value='[formula without cached value]';}
      if(value.trim()) entries.push({label:sheetName+'!'+cell,value,
        location:{kind:'xlsx-cell',sheet:sheetName,cell,
          ...(dateStyled?{excelDateStyled:1}:{})}});
      if(entries.length>MAX_RECORDS)throw new Error('XLSX exceeds the maximum record limit.');
    }
  }
  if(formulas) warnings.push(formulas+' formula cells found. Cached values were read, not recalculated.');
  // These Office parts can contain information not represented by cells.
  // Never present a partial worksheet extraction as evidence-complete.
  const omittedVisuals=omitted.filter(n=>
    /^xl\/(?:media|charts|drawings|chartsheets|diagrams)\//i.test(n));
  const omittedAnnotations=omitted.filter(n=>
    /^xl\/(?:comments\d*\.xml|threadedComments\/|persons\/|embeddings\/)/i.test(n));
  const externalParts=omitted.filter(n=>
    /^xl\/(?:externalLinks\/|connections\.xml$|queryTables\/|pivotCache\/|pivotTables\/)/i.test(n));
  if(omittedVisuals.length||chartSheets)warnings.push('Workbook charts, drawings, or images were not extracted; inspect the original workbook.');
  if(omittedAnnotations.length)warnings.push('Workbook comments or embedded objects were not extracted; inspect the original workbook.');
  if(hiddenSheets.length||hiddenRows.length||hiddenColumns.length){
    warnings.push('Excel has hidden content: '+[
      ...hiddenSheets.map(x=>'hidden sheet '+x),
      ...hiddenRows.map(x=>'hidden rows in '+x),
      ...hiddenColumns.map(x=>'hidden columns in '+x)
    ].slice(0,8).join('; ')+'. Inspect the original workbook.');
  }
  if(mergedCells.length)warnings.push('Workbook contains merged cells: '+
    mergedCells.slice(0,5).join('; ')+'. Cell references identify anchors, not every displayed merged position.');
  if(externalParts.length)warnings.push('Workbook may use external links, queries, or pivot caches. Imported cell values were not refreshed.');
  if(dateCells){
    warnings.push(dateCells+' Excel numeric cells are date/time styled, including '+
      dateExamples.join(', ')+'. Their raw serials were retained; compare original displayed dates.');
  }else{
    warnings.push('Excel date formats are not converted. Numeric date serials without recognizable styles may remain.');
  }
  const reviewIssues:SourceReviewIssue[]=[];
  if(dateCells>0)reviewIssues.push({id:'xlsx:date-styles',category:'office_unreviewed_content',
    message:dateCells+' numeric date/time-styled cells were read as raw Excel serials, including '+
      dateExamples.join(', ')+'. Verify the original spreadsheet date displays before export.'});
  if(formulas>0)reviewIssues.push({id:'xlsx:formulas',category:'office_unreviewed_content',
    message:formulas+' formula cells were imported from cached results only. Check the original workbook calculations.'});
  if(omittedVisuals.length||chartSheets)reviewIssues.push({
    id:'xlsx:media',category:'office_unreviewed_content',
    message:'Workbook charts, drawings, chartsheets, diagrams, or images were omitted. Inspect the original workbook before export.'});
  if(hiddenSheets.length||hiddenRows.length||hiddenColumns.length)reviewIssues.push({
    id:'xlsx:hidden-content',category:'office_unreviewed_content',
    message:'The workbook includes hidden sheets, nonempty hidden rows, or hidden columns. Compare the original workbook, including hidden content, before export.'});
  if(mergedCells.length)reviewIssues.push({
    id:'xlsx:merged-cells',category:'office_unreviewed_content',
    message:'The workbook includes merged cell ranges. Confirm that extracted anchor values and surrounding labels are interpreted correctly.'});
  if(externalParts.length)reviewIssues.push({
    id:'xlsx:external-data',category:'office_unreviewed_content',
    message:'External data links, query tables, or pivot caches were omitted. Cached cell values may be outdated; inspect the original workbook before export.'});
  if(omittedAnnotations.length)reviewIssues.push({
    id:'xlsx:annotations',category:'office_unreviewed_content',
    message:'Workbook comments or embedded objects were omitted. Inspect the original workbook before export.'});
  const parsed=appendRecords(fileName,'xlsx',entries,warnings);
  parsed.reviewIssues=reviewIssues;
  return parsed;
}
