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
