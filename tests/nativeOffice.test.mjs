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


test('Word final-view extraction excludes deleted and moved-from text without losing inserted clauses',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const xml='<w:document xmlns:w="'+ns+'"><w:body>'+
  '<w:p><w:r><w:t xml:space="preserve">Normal retirement age </w:t></w:r>'+
    '<w:del><w:r><w:t>62</w:t></w:r></w:del>'+
    '<w:ins><w:r><w:t>65</w:t></w:r></w:ins></w:p>'+
  '<w:moveFrom><w:p><w:r><w:t>Removed paragraph</w:t></w:r></w:p></w:moveFrom>'+
  '<w:moveTo><w:p><w:r><w:t>Current paragraph</w:t></w:r></w:p></w:moveTo>'+
  '</w:body></w:document>';
 const result=parseDocx('tracked.docx',docx(xml));
 assert.match(result.text,/Normal retirement age 65/);
 assert.match(result.text,/Current paragraph/);
 assert.doesNotMatch(result.text,/Removed paragraph|62/);
 assert.deepEqual(result.records.map(r=>r.label),['Paragraph 1','Paragraph 2']);
 assert.ok(result.reviewIssues.some(x=>x.id==='docx:track-changes'));
 assert.ok(result.warnings.some(x=>x.includes('moved-from')));
});

test('Word content controls and custom XML do not suppress legitimate paragraphs and tables',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const xml='<w:document xmlns:w="'+ns+'"><w:body>'+
  '<w:sdt><w:sdtPr><w:alias w:val="Plan Provisions"/></w:sdtPr><w:sdtContent>'+
    '<w:p><w:r><w:t>Vesting after five years</w:t></w:r></w:p>'+
    '<w:customXml w:element="section">'+
      '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Early retirement</w:t></w:r></w:p></w:tc>'+
      '<w:tc><w:p><w:r><w:t>55 and 10</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'+
    '</w:customXml>'+
  '</w:sdtContent></w:sdt>'+
  '</w:body></w:document>';
 const result=parseDocx('content-controls.docx',docx(xml));
 assert.deepEqual(result.records.map(x=>x.label),[
  'Paragraph 1','Table 1 row 1 column 1','Table 1 row 1 column 2'
 ]);
 assert.match(result.text,/Vesting after five years/);
 assert.match(result.text,/Early retirement/);
 assert.match(result.text,/55 and 10/);
});

test('Directly hidden Word runs do not become source evidence, and visible false flags remain',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const xml='<w:document xmlns:w="'+ns+'"><w:body><w:p>'+
  '<w:r><w:t>Benefit 100</w:t></w:r>'+
  '<w:r><w:rPr><w:vanish/></w:rPr><w:t>Hidden actuarial override 900</w:t></w:r>'+
  '<w:r><w:rPr><w:webHidden w:val="0"/></w:rPr><w:t> Visible appendix</w:t></w:r>'+
  '</w:p></w:body></w:document>';
 const result=parseDocx('hidden.docx',docx(xml));
 assert.match(result.text,/Benefit 100/);
 assert.match(result.text,/Visible appendix/);
 assert.doesNotMatch(result.text,/Hidden actuarial override|900/);
 assert.ok(result.reviewIssues.some(x=>x.id==='docx:hidden-text'));
});

test('Deleted header and footnote paragraphs are excluded; revisions in these parts require review',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const zip=zipped({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'word/document.xml':'<w:document xmlns:w="'+ns+'"><w:body><w:p><w:r><w:t>Benefit rules</w:t></w:r></w:p></w:body></w:document>',
  'word/header1.xml':'<w:hdr xmlns:w="'+ns+'"><w:del><w:p><w:r><w:t>Obsolete header</w:t></w:r></w:p></w:del><w:p><w:r><w:t>Valid header</w:t></w:r></w:p></w:hdr>',
  'word/footnotes.xml':'<w:footnotes xmlns:w="'+ns+'"><w:footnote w:id="8"><w:del><w:p><w:r><w:t>Old exception</w:t></w:r></w:p></w:del><w:p><w:r><w:t>Current exception</w:t></w:r></w:p></w:footnote></w:footnotes>'
 });
 const result=parseDocx('revised-header.docx',zip);
 assert.match(result.text,/Valid header/);
 assert.match(result.text,/Current exception/);
 assert.doesNotMatch(result.text,/Obsolete header|Old exception/);
 assert.ok(result.reviewIssues.some(x=>x.id==='docx:track-changes'));
});

test('DOCX refuses alternate unreviewable content in footnotes, not only main body',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const zip=zipped({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'word/document.xml':'<w:document xmlns:w="'+ns+'"><w:body><w:p><w:r><w:t>Normal 65</w:t></w:r></w:p></w:body></w:document>',
  'word/footnotes.xml':'<w:footnotes xmlns:w="'+ns+'"><w:footnote w:id="8"><w:altChunk r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></w:footnote></w:footnotes>'
 });
 assert.throws(()=>parseDocx('unreviewable.docx',zip),/embedded alternate content/);
});


test('Excel formulas without cached values cannot become invented evidence placeholders',()=>{
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>65</v></c><c r="B1"><f>A1*2</f></c></row></sheetData></worksheet>';
 assert.throws(()=>parseXlsx('uncached.xlsx',xlsx({sheet})),/formula at Plan Data!B1 has no cached calculation result/);
 const empty='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><f>IF(FALSE,1,"")</f><v></v></c></row></sheetData></worksheet>';
 assert.throws(()=>parseXlsx('empty-cache.xlsx',xlsx({sheet:empty})),/no cached calculation result/);
});

test('cached formula results remain readable but mandate original Excel review',()=>{
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><f>60+5</f><v>65</v></c></row></sheetData></worksheet>';
 const result=parseXlsx('cached.xlsx',xlsx({sheet}));
 assert.match(result.text,/Plan Data!A1: 65/);
 assert.ok(result.reviewIssues.some(x=>x.id==='xlsx:formulas'));
 assert.ok(!result.text.includes('[formula without cached value]'));
});

test('spreadsheet calculation errors cannot masquerade as extracted plan values',()=>{
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>65</v></c><c r="B1" t="e"><f>1/0</f><v>#DIV/0!</v></c></row></sheetData></worksheet>';
 assert.throws(()=>parseXlsx('error.xlsx',xlsx({sheet})),/cell Plan Data!B1 contains a spreadsheet error/);
});


test('deeply nested DOCX XML is rejected without recursive call-stack failure',()=>{
 const deep='<w:container>'.repeat(145)+
   '<w:p><w:r><w:t>Fictional normal age 65</w:t></w:r></w:p>'+
   '</w:container>'.repeat(145);
 const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
   '<w:body>'+deep+'</w:body></w:document>';
 assert.throws(()=>parseDocx('deep.docx',docx(xml)),/Office XML exceeds supported nesting depth/);
});

test('deeply nested XLSX XML is rejected before extracting a partial value',()=>{
 const deep='<nested>'.repeat(145)+
   '<row r="1"><c r="A1"><v>65</v></c></row>'+
   '</nested>'.repeat(145);
 const xml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<sheetData>'+deep+'</sheetData></worksheet>';
 assert.throws(()=>parseXlsx('deep.xlsx',xlsx({sheet:xml})),/Office XML exceeds supported nesting depth/);
});


test('DOCX shape and foreign-namespace text cannot masquerade as a visible paragraph',async()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const xml='<w:document xmlns:w="'+ns+'" xmlns:x="urn:synthetic-untrusted">'+
   '<w:body><w:p>'+
   '<w:r><w:t>Normal retirement age 65</w:t></w:r>'+
   '<w:r><x:t>Normal retirement age 99</x:t></w:r>'+
   '<w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>Normal retirement age 98</w:t></w:r>'+
   '</w:p></w:txbxContent></w:drawing></w:r>'+
   '</w:p></w:body></w:document>';
 const parsed=parseDocx('fictional-shapes.docx',docx(xml));
 assert.match(parsed.text,/Paragraph 1: Normal retirement age 65/);
 assert.doesNotMatch(parsed.text,/98|99/);
 assert.equal(parsed.records.length,1);
 assert.deepEqual(parsed.records[0].location,{kind:'docx-paragraph',paragraph:1});
 assert.ok(parsed.reviewIssues.some(x=>x.id==='docx:drawings'));
 assert.ok(parsed.reviewIssues.some(x=>x.id==='docx:foreign-text'));
 const {auditLiteralEvidence}=await import('../src/evidence.ts');
 const {collectChunkCandidates,resolveCandidateValues}=await import('../src/chunkExtraction.ts');
 const {evaluateExportGate}=await import('../src/exportGate.ts');
 assert.equal(auditLiteralEvidence(parsed,{age:99})[0].status,'missing');
 assert.equal(auditLiteralEvidence(parsed,{age:98})[0].status,'missing');
 const chunks=[{chunk:1,start:0,end:parsed.text.length,text:parsed.text}];
 const audit=collectChunkCandidates(parsed,chunks,[{age:65}]);
 const value=resolveCandidateValues(audit).data;
 const checks=auditLiteralEvidence(parsed,value,audit);
 assert.equal(checks[0].status,'match');
 const gate={document:parsed,audit,value,schemaValid:true,busy:false,
   evidence:checks,selectedEvidence:{'/age':0},confirmedEvidence:{'/age':true},
   conflictsUnresolved:0,privacyRequired:false,privacyReviewed:false,
   sourceIssuesUnreviewed:parsed.reviewIssues.length};
 assert.equal(evaluateExportGate(gate).allowed,false,'omitted document content must be reviewed');
 assert.equal(evaluateExportGate({...gate,sourceIssuesUnreviewed:0}).allowed,true);
});

test('DOCX drawings in headers and notes also require original-document review',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const content='<w:document xmlns:w="'+ns+'"><w:body>'+
   '<w:p><w:r><w:t>Normal age 65</w:t></w:r></w:p>'+
   '</w:body></w:document>';
 const header='<w:hdr xmlns:w="'+ns+'"><w:p><w:r><w:t>Header title</w:t></w:r>'+
   '<w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>Hidden shape 99</w:t></w:r></w:p>'+
   '</w:txbxContent></w:drawing></w:r></w:p></w:hdr>';
 const footnote='<w:footnotes xmlns:w="'+ns+'"><w:footnote w:id="7"><w:p>'+
   '<w:r><w:t>Note text</w:t></w:r><w:r><w:drawing><w:txbxContent>'+
   '<w:p><w:r><w:t>Hidden note 97</w:t></w:r></w:p>'+
   '</w:txbxContent></w:drawing></w:r></w:p></w:footnote></w:footnotes>';
 const source=zipped({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'word/document.xml':content,
  'word/header1.xml':header,
  'word/footnotes.xml':footnote
 });
 const parsed=parseDocx('fictional-header.docx',source);
 assert.match(parsed.text,/Header title/);
 assert.match(parsed.text,/Note text/);
 assert.doesNotMatch(parsed.text,/Hidden shape 99|Hidden note 97/);
 assert.ok(parsed.reviewIssues.some(x=>x.id==='docx:drawings'));
});
test('DOCX with only unreadable drawing text must not claim any source evidence',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const xml='<w:document xmlns:w="'+ns+'"><w:body><w:p><w:drawing>'+
   '<w:txbxContent><w:p><w:r><w:t>Age 65</w:t></w:r></w:p></w:txbxContent>'+
   '</w:drawing></w:p></w:body></w:document>';
 assert.throws(()=>parseDocx('shape-only.docx',docx(xml)),/No readable text/);
});

test('XLSX phonetic guides are excluded from shared and inline cell values',async()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const shared='<sst xmlns="'+ns+'"><si><t>Normal 65</t>'+
   '<rPh sb="0" eb="9"><t>Override 99</t></rPh></si></sst>';
 const sheet='<worksheet xmlns="'+ns+'"><sheetData><row r="1">'+
   '<c r="A1" t="s"><v>0</v></c>'+
   '<c r="B1" t="inlineStr"><is><t>Vesting 10</t>'+
   '<rPh sb="0" eb="10"><t>Override 98</t></rPh></is></c>'+
   '</row></sheetData></worksheet>';
 const parsed=parseXlsx('fictional-phonetics.xlsx',xlsx({sheet,sharedStrings:shared}));
 assert.match(parsed.text,/Plan Data!A1: Normal 65/);
 assert.match(parsed.text,/Plan Data!B1: Vesting 10/);
 assert.doesNotMatch(parsed.text,/Override 99|Override 98/);
 assert.deepEqual(parsed.records.map(x=>x.location.cell),['A1','B1']);
 assert.ok(parsed.reviewIssues.some(x=>x.id==='xlsx:phonetic'));
 assert.ok(parsed.warnings.some(x=>/phonetic annotation/i.test(x)));
 const {auditLiteralEvidence}=await import('../src/evidence.ts');
 assert.equal(auditLiteralEvidence(parsed,{age:99})[0].status,'missing');
 assert.equal(auditLiteralEvidence(parsed,{age:65})[0].status,'match');
});


test('XLSX conflicting or repeated coordinates are rejected before any citation exists',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const sheet='<worksheet xmlns="'+ns+'"><sheetData><row r="1">'+
   '<c r="A1"><v>65</v></c><c r="A1"><v>99</v></c>'+
   '</row></sheetData></worksheet>';
 assert.throws(()=>parseXlsx('duplicate-coordinate.xlsx',xlsx({sheet})),
   /Duplicate Excel cell coordinate: Plan Data!A1/);
 const emptyDuplicate='<worksheet xmlns="'+ns+'"><sheetData><row r="1">'+
   '<c r="A1"/><c r="A1"><v>65</v></c>'+
   '</row></sheetData></worksheet>';
 assert.throws(()=>parseXlsx('empty-collision.xlsx',xlsx({sheet:emptyDuplicate})),
   /Duplicate Excel cell coordinate/);
});

test('XLSX rejects cells outside the actual worksheet coordinate grid',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const makeSheet=cell=>'<worksheet xmlns="'+ns+'"><sheetData><row r="'+(cell.match(/[0-9]+$/)?.[0]||'1')+'">'+
  '<c r="'+cell+'"><v>65</v></c></row></sheetData></worksheet>';
 for(const cell of ['XFE1','ZZZ1','A1048577']){
   assert.throws(()=>parseXlsx('outside.xlsx',xlsx({sheet:makeSheet(cell)})),
     /outside worksheet limits/,cell);
 }
 for(const cell of ['A0','A-1','a1','AAAA1']){
   assert.throws(()=>parseXlsx('invalid.xlsx',xlsx({sheet:makeSheet(cell)})),
     /Invalid cell reference/,cell);
 }
 const last=parseXlsx('maximum.xlsx',xlsx({sheet:makeSheet('XFD1048576')}));
 assert.equal(last.records[0].location.cell,'XFD1048576');
});

test('duplicate Excel worksheet names and sheet IDs have ambiguous provenance',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const relns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const first='<sheet name="Plan" sheetId="1" r:id="rId1"/>';
 const sheet='<worksheet xmlns="'+ns+'"><sheetData><row r="1"><c r="A1"><v>65</v></c></row></sheetData></worksheet>';
 const make=(second)=>zipped({
  'xl/workbook.xml':'<workbook xmlns="'+ns+'" xmlns:r="'+relns+'"><sheets>'+
    first+second+'</sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'+
    '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/>'+
    '</Relationships>',
  'xl/worksheets/sheet1.xml':sheet,'xl/worksheets/sheet2.xml':sheet
 });
 for(const second of [
  '<sheet name="plan" sheetId="2" r:id="rId2"/>',
  '<sheet name="Plan" sheetId="2" r:id="rId2"/>',
  '<sheet name="Another" sheetId="1" r:id="rId2"/>',
  '<sheet name="Another" r:id="rId2"/>'
 ]){
  assert.throws(()=>parseXlsx('duplicate-sheets.xlsx',make(second)),
    /duplicated worksheet identity|missing sheet ID/);
 }
});

test('XLSX refuses repeated relationship IDs and aliases to one underlying worksheet XML',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const relns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const workbook='<workbook xmlns="'+ns+'" xmlns:r="'+relns+'"><sheets>'+
   '<sheet name="Original" sheetId="1" r:id="rId1"/>'+
   '<sheet name="Amended" sheetId="2" r:id="rId2"/>'+
   '</sheets></workbook>';
 const sheet='<worksheet xmlns="'+ns+'"><sheetData><row r="1">'+
   '<c r="A1"><v>65</v></c></row></sheetData></worksheet>';
 const make=(rels)=>zipped({
  'xl/workbook.xml':workbook,
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels+'</Relationships>',
  'xl/worksheets/sheet1.xml':sheet
 });
 const duplicate='<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'+
   '<Relationship Id="rId1" Target="worksheets/sheet2.xml"/>';
 assert.throws(()=>parseXlsx('duplicate-rel.xlsx',make(duplicate)),
   /duplicate worksheet relationship IDs/);
 const alias='<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'+
   '<Relationship Id="rId2" Target="worksheets/sheet1.xml"/>';
 assert.throws(()=>parseXlsx('alias.xlsx',make(alias)),
   /share the same underlying XML source/);
});

test('Office ZIP duplicate entry filenames are refused, not silently overwritten',()=>{
 const first='word/header1.xml',second='word/header2.xml';
 const content='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:body><w:p><w:r><w:t>Age 65</w:t></w:r></w:p></w:body></w:document>';
 const data=zipped({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'word/document.xml':content,
  [first]:'<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Age 65</w:t></w:r></w:p></w:hdr>',
  [second]:'<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Age 99</w:t></w:r></w:p></w:hdr>'
 });
 const bytes=Uint8Array.from(data);
 const needle=new TextEncoder().encode(second),replacement=new TextEncoder().encode(first);
 let replacements=0;
 for(let i=0;i<=bytes.length-needle.length;i++){
  let matches=true;
  for(let k=0;k<needle.length;k++)if(bytes[i+k]!==needle[k]){matches=false;break;}
  if(!matches)continue;
  bytes.set(replacement,i);replacements++;i+=needle.length-1;
 }
 assert.equal(replacements,2,'local and central-directory names must both be altered');
 assert.throws(()=>parseDocx('duplicate-part.docx',bytes),
   /duplicate part names/);
});


test('OOXML foreign paragraph element cannot invent Word paragraph provenance',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const source='<w:document xmlns:w="'+ns+'" xmlns:fake="urn:fictional-attack"><w:body>'+
   '<w:p><w:r><w:t>Normal age 65</w:t></w:r></w:p>'+
   '<fake:p><w:r><w:t>Normal age 99</w:t></w:r></fake:p>'+
   '</w:body></w:document>';
 const result=parseDocx('foreign-paragraph.docx',docx(source));
 assert.equal(result.records.length,1);
 assert.match(result.text,/Normal age 65/);
 assert.doesNotMatch(result.text,/Normal age 99/);
 assert.ok(result.reviewIssues.some(issue=>issue.id==='docx:foreign-text'));
});
test('OOXML foreign wrappers within Word paragraphs cannot introduce false text',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const source='<w:document xmlns:w="'+ns+'" xmlns:fake="urn:fictional-attack"><w:body>'+
   '<w:p><w:r><w:t>Normal age 65</w:t></w:r>'+
   '<fake:r><w:t>Normal age 99</w:t></fake:r></w:p>'+
   '</w:body></w:document>';
 const result=parseDocx('foreign-run.docx',docx(source));
 assert.match(result.text,/Normal age 65/);
 assert.doesNotMatch(result.text,/Normal age 99/);
 assert.ok(result.reviewIssues.some(issue=>issue.id==='docx:foreign-text'));
});
test('XLSX foreign namespace cells and values cannot masquerade as native Excel facts',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const wrap=inner=>'<worksheet xmlns="'+ns+'" xmlns:fake="urn:fictional-attack">'+
   '<sheetData><row r="1">'+inner+'</row></sheetData></worksheet>';
 for(const item of [
  '<fake:c r="A1"><fake:v>99</fake:v></fake:c><c r="B1"><v>65</v></c>',
  '<c r="A1"><fake:v>99</fake:v></c>',
  '<c r="A1" t="inlineStr"><is><fake:t>99</fake:t></is></c>'
 ]){
  assert.throws(()=>parseXlsx('spoofed.xlsx',xlsx({sheet:wrap(item)})),
    /unexpected namespace/i);
 }
});
test('XLSX cell addresses must agree with their enclosing worksheet data row',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 for(const sheet of [
  '<worksheet xmlns="'+ns+'"><sheetData><row r="1"><c r="A2"><v>65</v></c></row></sheetData></worksheet>',
  '<worksheet xmlns="'+ns+'"><sheetData><row r="1"></row></sheetData><c r="A1"><v>65</v></c></worksheet>',
  '<worksheet xmlns="'+ns+'"><sheetData><row r="0"><c r="A1"><v>65</v></c></row></sheetData></worksheet>'
 ]){
  assert.throws(()=>parseXlsx('displaced.xlsx',xlsx({sheet})),
    /coordinates disagree|not in a worksheet data row/i);
 }
});
test('XLSX package relationships must use the correct relationship XML namespace',()=>{
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const relns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const source=zipped({
  'xl/workbook.xml':'<workbook xmlns="'+ns+'" xmlns:r="'+relns+'"><sheets>'+
   '<sheet name="Plan" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" xmlns:fake="urn:fictional-attack">'+
   '<fake:Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':'<worksheet xmlns="'+ns+'"><sheetData><row r="1">'+
    '<c r="A1"><v>65</v></c></row></sheetData></worksheet>'
 });
 assert.throws(()=>parseXlsx('bad-rel.xlsx',source),/unexpected namespace/i);
});
