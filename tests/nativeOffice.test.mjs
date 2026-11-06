import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { parseDocx, parseXlsx } from '../src/nativeOffice.ts';

const zipped = files => zipSync(Object.fromEntries(Object.entries(files).map(([name,xml])=>[name,strToU8(xml)])), {level:0});
const docx = xml => zipped({
  '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'word/document.xml': xml
});
const xlsx = ({ sheet, sharedStrings = '' }) => zipped({
  'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plan Data" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml': sheet,
  ...(sharedStrings ? {'xl/sharedStrings.xml':sharedStrings} : {})
});

test('DOCX assigns authentic paragraph and table-cell coordinates', () => {
  const data=docx('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Normal retirement 65</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>ERD</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>55/10</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
  const result=parseDocx('synthetic.docx',data);
  assert.equal(result.provenance.precision,'paragraph');
  assert.deepEqual(result.records.map(r=>r.label),['Paragraph 1','Table 1 row 1 column 1','Table 1 row 1 column 2']);
  assert.equal(result.records[0].location.paragraph,1);
  assert.equal(result.records[2].location.column,2);
  assert.ok(result.text.includes('Normal retirement 65'));
});

test('XLSX preserves cell references and cached formulas without evaluating them', () => {
  const shared='<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Age</t></si></sst>';
  const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>65+0</f><v>65</v></c><c r="C1" t="inlineStr"><is><t>Normal</t></is></c></row></sheetData></worksheet>';
  const result=parseXlsx('synthetic.xlsx',xlsx({sheet,sharedStrings:shared}));
  assert.deepEqual(result.records.map(r=>r.label),['Plan Data!A1','Plan Data!B1','Plan Data!C1']);
  assert.deepEqual(result.records[1].location,{kind:'xlsx-cell',sheet:'Plan Data',cell:'B1'});
  assert.match(result.text,/Plan Data!B1: 65/);
  assert.ok(result.warnings.some(s=>s.includes('not recalculated')));
});

test('Office parser fails closed when the document text is unavailable', () => {
  assert.throws(()=>parseDocx('bad.docx',strToU8('bad')),/ZIP-based Office/);
  const blank=docx('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>');
  assert.throws(()=>parseDocx('blank.docx',blank),/No readable text/);
  const unsafe=docx('<!DOCTYPE x [<!ENTITY y "danger">]><w:document xmlns:w="x"><w:body/></w:document>');
  assert.throws(()=>parseDocx('unsafe.docx',unsafe),/External or custom XML entities/);
});

test('DOCX rejects a ZIP without its Office content manifest',()=>{
 const zippedOnly=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="x"><w:body/></w:document>')},{level:0});
 assert.throws(()=>parseDocx('fake.docx',zippedOnly),/missing \[Content_Types\]\.xml/);
});
test('DOCX rejects XML with an oversized inflated part',()=>{
 const veryLong='A'.repeat(16*1024*1024);
 const bytes=zipSync({
  '[Content_Types].xml':strToU8('<Types/>'),
  'word/document.xml':strToU8('<w:document xmlns:w="x"><w:body><w:p><w:t>'+veryLong+'</w:t></w:p></w:body></w:document>')
 },{level:9});
 assert.throws(()=>parseDocx('large.docx',bytes),/too large after decompression|decompressed-size/);
});

test('Word header, footer and footnote text are included with honest part IDs',()=>{
 const files={
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'word/document.xml':'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Retirement 65</w:t></w:r></w:p></w:body></w:document>',
  'word/header1.xml':'<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Amendment 2023</w:t></w:r></w:p></w:hdr>',
  'word/footer1.xml':'<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Plan footer</w:t></w:r></w:p></w:ftr>',
  'word/footnotes.xml':'<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="7"><w:p><w:r><w:t>Service excludes breaks.</w:t></w:r></w:p></w:footnote></w:footnotes>'
 };
 const data=zipped(files);
 const doc=parseDocx('notes.docx',data);
 assert.match(doc.text,/Retirement 65/);
 assert.match(doc.text,/Amendment 2023/);
 assert.match(doc.text,/Plan footer/);
 assert.match(doc.text,/Service excludes breaks/);
 const header=doc.records.find(x=>x.location.kind==='docx-header');
 assert.equal(header.location.part,'word/header1.xml');
 assert.equal(header.location.paragraph,1);
 const note=doc.records.find(x=>x.location.kind==='docx-footnote');
 assert.equal(note.location.noteId,7);
 assert.ok(doc.warnings.some(x=>x.includes('without a verified page location')));
});
