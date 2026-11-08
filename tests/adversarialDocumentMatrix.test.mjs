/**
 * Synthetic, real-format adversarial provenance matrix.
 * Exercises actual PDF.js, DOCX XML, XLSX XML and CSV parsers, not a mock
 * document format, and refuses false provenance claims at export.
 *
 * These inputs and expected results are wholly fictional. They test
 * deterministic ingestion/evidence, NOT local GGUF factual accuracy.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {createSyntheticPdf} from './pdf-fixture.mjs';
import {parsePdf} from '../src/pdfText.ts';
import {parseDocx,parseXlsx} from '../src/nativeOffice.ts';
import {parseCsv} from '../src/csv.ts';
import {collectChunkCandidates,resolveCandidateValues} from '../src/chunkExtraction.ts';
import {auditLiteralEvidence,evidenceSelectionsAnchoredToDocument} from '../src/evidence.ts';
import {evaluateExportGate} from '../src/exportGate.ts';

const zip=parts=>zipSync(Object.fromEntries(Object.entries(parts)
 .map(([name,value])=>[name,strToU8(value)])),{level:0});
const wordNs='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const sheetNs='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relNs='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const docx=zip({
 '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
 'word/document.xml':'<w:document xmlns:w="'+wordNs+'"><w:body>'+
  '<w:p><w:r><w:t>Original normal retirement age 65</w:t></w:r></w:p>'+
  '<w:p><w:r><w:t>Later amendment normal retirement age 67</w:t></w:r></w:p>'+
  '</w:body></w:document>'
});
const xlsx=zip({
 'xl/workbook.xml':'<workbook xmlns="'+sheetNs+'" xmlns:r="'+relNs+'"><sheets>'+
   '<sheet name="Pension" sheetId="1" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
 'xl/worksheets/sheet1.xml':'<worksheet xmlns="'+sheetNs+'"><sheetData>'+
   '<row r="1"><c r="A1" t="inlineStr"><is><t>Original retirement age 65</t></is></c></row>'+
   '<row r="2"><c r="A2" t="inlineStr"><is><t>Amended retirement age 67</t></is></c></row>'+
   '</sheetData></worksheet>'
});
const csv='Original retirement age 65\r\nAmended retirement age 67\r\n';
const pdf=createSyntheticPdf([
 ['FICTIONAL PLAN: Original normal retirement age 65'],
 ['FICTIONAL PLAN: Amendment changes normal retirement age 67']
]);
async function cases(){
 return [
   {kind:'pdf',source:await parsePdf('fictional.pdf',new Uint8Array(pdf)),
    first:'pdf-page',second:'pdf-page'},
   {kind:'docx',source:parseDocx('fictional.docx',new Uint8Array(docx)),
    first:'docx-paragraph',second:'docx-paragraph'},
   {kind:'xlsx',source:parseXlsx('fictional.xlsx',new Uint8Array(xlsx)),
    first:'xlsx-cell',second:'xlsx-cell'},
   {kind:'csv',source:parseCsv('fictional.csv',csv),
    first:'csv-cell',second:'csv-cell'}
 ];
}
test('four physical document formats retain actual independent original/amended source coordinates',async()=>{
 for(const {kind,source,first,second} of await cases()){
   assert.equal(source.records.length,2,kind+' must expose two real source records');
   assert.equal(source.records[0].location.kind,first);
   assert.equal(source.records[1].location.kind,second);
   assert.equal(source.records[0].start,0);
   assert.equal(source.records.at(-1).end,source.text.length);
   assert.ok(source.records[0].end<=source.records[1].start);
   const chunks=source.records.map((r,i)=>({
    chunk:i+1,start:r.start,end:r.end,text:source.text.slice(r.start,r.end)
   }));
   const audit=collectChunkCandidates(source,chunks,[
    {retirement_age:65},{retirement_age:67}
   ]);
   assert.deepEqual(audit.conflicts.map(x=>x.path),['/retirement_age'],kind);
   assert.deepEqual(resolveCandidateValues(audit).unresolved,['/retirement_age'],kind);
   for(const choice of [0,1]){
     const {data,unresolved}=resolveCandidateValues(audit,{'/retirement_age':choice});
     assert.deepEqual(unresolved,[]);
     assert.equal(data.retirement_age,choice===0?65:67);
     const checks=auditLiteralEvidence(source,data,audit);
     assert.equal(checks.length,1,kind);
     assert.equal(checks[0].status,'match',kind);
     assert.ok(checks[0].matches.length>0,kind);
     assert.ok(checks[0].matches.every(match=>
       match.location.kind===(choice===0?first:second) &&
       match.start>=source.records[choice].start &&
       match.end<=source.records[choice].end),kind+' source record must be preserved');
     if(kind==='pdf')assert.ok(checks[0].matches.every(x=>x.location.page===choice+1));
     if(kind==='xlsx')assert.ok(checks[0].matches.every(x=>x.location.cell==='A'+(choice+1)));
     if(kind==='csv')assert.ok(checks[0].matches.every(x=>x.location.row===choice+1));
     const selected={'/retirement_age':0};
     assert.equal(evidenceSelectionsAnchoredToDocument(source,checks,selected),true);
     const gate={document:source,audit,value:data,schemaValid:true,busy:false,
       evidence:checks,selectedEvidence:selected,confirmedEvidence:{},
       conflictsUnresolved:0,privacyRequired:false,privacyReviewed:false,
       sourceIssuesUnreviewed:0};
     assert.equal(evaluateExportGate(gate).allowed,false,kind+' cannot export without reviewer confirmation');
     assert.equal(evaluateExportGate({...gate,confirmedEvidence:{'/retirement_age':true}}).allowed,true,kind);
     // Changing original text after the review must invalidate the audit even
     // if the candidate, evidence and schema remain unchanged.
     const modified={...source,text:source.text.replace('65','66')};
     assert.equal(evaluateExportGate({...gate,document:modified,
       confirmedEvidence:{'/retirement_age':true}}).allowed,false,kind);
   }
 }
});
test('same formatted value on different PDF pages keeps distinct page provenance',async()=>{
 const source=await parsePdf('same-number.pdf',new Uint8Array(createSyntheticPdf([
   ['Plan valuation interest 6.00%.'],
   ['Historic valuation interest 6.00%.']
 ])));
 const chunks=source.records.map((r,i)=>({
   chunk:i+1,start:r.start,end:r.end,text:source.text.slice(r.start,r.end)
 }));
 const audit=collectChunkCandidates(source,chunks,[
   {interest:'6%'},{interest:'6%'}
 ]);
 assert.deepEqual(audit.conflicts,[],'identical values need not be a factual conflict');
 const candidate=audit.candidates['/interest'][0];
 assert.equal(candidate.value,'6.00%');
 assert.deepEqual(candidate.spans,chunks.map(({chunk,start,end})=>({chunk,start,end})));
 const checks=auditLiteralEvidence(source,{interest:'6.00%'},audit);
 assert.deepEqual(checks[0].matches.map(x=>x.location.page),[1,2]);
 assert.ok(checks[0].matches.every(x=>x.textItemBoxes?.length>0),
   'PDF rectangles must remain parser-derived and page-specific');
});
