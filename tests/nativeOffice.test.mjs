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

test('date-formatted Excel numeric cells are flagged for manual review without guessing dates',()=>{
 const workbook='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dates" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const rels='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>';
 const styles='<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>';
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" s="1"><v>45500</v></c><c r="B1"><v>55</v></c></row></sheetData></worksheet>';
 const bytes=zipped({
  'xl/workbook.xml':workbook,
  'xl/_rels/workbook.xml.rels':rels,
  'xl/styles.xml':styles,
  'xl/worksheets/sheet1.xml':sheet
 });
 const parsed=parseXlsx('synthetic.xlsx',bytes);
 assert.match(parsed.text,/Dates!A1: 45500/);
 assert.equal(parsed.records[0].location.excelDateStyled,1);
 assert.equal(parsed.records[1].location.excelDateStyled,undefined);
 assert.ok(parsed.reviewIssues.some(x=>x.id==='xlsx:date-styles'));
 assert.match(parsed.reviewIssues.find(x=>x.id==='xlsx:date-styles').message,/Verify the original/);
});

test('XLSX charts and comments require acknowledgement even without embedded images',()=>{
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>100</v></c></row></sheetData></worksheet>';
 const workbook='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plan Data" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const rels='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>';
 const bytes=zipped({
  'xl/workbook.xml':workbook,
  'xl/_rels/workbook.xml.rels':rels,
  'xl/worksheets/sheet1.xml':sheet,
  'xl/charts/chart1.xml':'<chart/>',
  'xl/drawings/drawing1.xml':'<drawing/>',
  'xl/comments1.xml':'<comments/>'
 });
 const parsed=parseXlsx('chart-comments.xlsx',bytes);
 assert.match(parsed.text,/Plan Data!A1: 100/);
 assert.ok(parsed.reviewIssues.some(x=>x.id==='xlsx:media'));
 assert.ok(parsed.reviewIssues.some(x=>x.id==='xlsx:annotations'));
 assert.ok(parsed.warnings.some(x=>x.includes('charts')));
 assert.ok(parsed.warnings.some(x=>x.includes('comments')));
});


test('XLSX flags hidden cells, merged ranges and external data; absolute package sheet targets work',()=>{
 const workbook='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hidden Plan" state="veryHidden" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const rels='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>';
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" hidden="1"/></cols><sheetData><row r="1" hidden="1"><c r="A1"><v>65</v></c></row></sheetData><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells></worksheet>';
 const data=zipped({
  'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':rels,
  'xl/worksheets/sheet1.xml':sheet,
  'xl/externalLinks/externalLink1.xml':'<externalLink/>'
 });
 const result=parseXlsx('hidden.xlsx',data);
 assert.match(result.text,/Hidden Plan!A1: 65/);
 assert.deepEqual(result.reviewIssues.map(x=>x.id).sort(),[
  'xlsx:external-data','xlsx:hidden-content','xlsx:merged-cells'
 ]);
 assert.ok(result.warnings.some(x=>x.includes('hidden sheet Hidden Plan')));
 assert.ok(result.warnings.some(x=>x.includes('merged cells')));
});

test('XLSX never follows external worksheet relationships or traversal targets',()=>{
 const workbook='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plan" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>65</v></c></row></sheetData></worksheet>';
 const makeData=relationship=>zipped({
  'xl/workbook.xml':workbook,
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+relationship+'</Relationships>',
  'xl/worksheets/sheet1.xml':sheet
 });
 assert.throws(()=>parseXlsx('external.xlsx',makeData(
  '<Relationship Id="rId1" TargetMode="External" Target="https://example.invalid/xl/worksheets/sheet1.xml"/>'
 )),/External worksheet relationships/);
 assert.throws(()=>parseXlsx('remote.xlsx',makeData(
  '<Relationship Id="rId1" Target="https://example.invalid/xl/worksheets/sheet1.xml"/>'
 )),/invalid or external sheet path/);
 assert.throws(()=>parseXlsx('traversal.xlsx',makeData(
  '<Relationship Id="rId1" Target="../xl/worksheets/sheet1.xml"/>'
 )),/path traversal/);
});

test('XLSX skips chartsheets but blocks export until omitted chart content is reviewed',()=>{
 const workbook='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plan" sheetId="1" r:id="rId1"/><sheet name="Chart 1" sheetId="2" r:id="rId2"/></sheets></workbook>';
 const rels='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/><Relationship Id="rId2" Target="chartsheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartsheet"/></Relationships>';
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>65</v></c></row></sheetData></worksheet>';
 const parsed=parseXlsx('chartsheet.xlsx',zipped({
  'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':rels,
  'xl/worksheets/sheet1.xml':sheet,'xl/chartsheets/sheet1.xml':'<chartsheet/>'
 }));
 assert.match(parsed.text,/Plan!A1: 65/);
 assert.ok(parsed.reviewIssues.some(x=>x.id==='xlsx:media'));
});
