import {test} from 'node:test';
import assert from 'node:assert/strict';
import {physicalHoldoutCases,parsePhysicalHoldout} from './fixtures/physicalHoldoutCases.mjs';
import {assessHoldoutProvenance} from './fixtures/physicalHoldoutProvenance.mjs';
import {auditLiteralEvidence} from '../src/evidence.ts';
import {scoreCorpus} from '../src/syntheticQuality.ts';
import {syntheticCases} from '../src/fictionalPensionCorpus.ts';

test('physical holdout is independently versioned and cannot alter the original eight-case baseline',()=>{
 assert.equal(syntheticCases.length,8);
 assert.equal(physicalHoldoutCases.length,8);
 assert.equal(new Set(physicalHoldoutCases.map(x=>x.id)).size,8);
 assert.equal(new Set(syntheticCases.map(x=>x.id)).size,8);
 assert.deepEqual([...new Set(physicalHoldoutCases.map(x=>x.format))].sort(),
  ['csv','docx','pdf','xlsx']);
 assert.ok(physicalHoldoutCases.every(x=>!syntheticCases.some(y=>y.id===x.id)));
 assert.ok(physicalHoldoutCases.every(x=>x.upload.name===x.id+'.'+x.format));
 assert.ok(physicalHoldoutCases.every(x=>x.upload.buffer.length>20));
 assert.ok(physicalHoldoutCases.every(x=>Object.keys(x.expected).length>=1));
});
test('all hand-annotated facts exist in authentic PDF/DOCX/XLSX/CSV parser locations',async()=>{
 for(const sample of physicalHoldoutCases){
  const source=await parsePhysicalHoldout(sample);
  assert.ok(source.text.length>0,sample.id);
  assert.ok(source.records.length>0,sample.id);
  const checks=auditLiteralEvidence(source,sample.expected);
  assert.equal(checks.length,Object.keys(sample.expected).length,sample.id);
  for(const check of checks){
   assert.equal(check.status,'match',sample.id+' '+check.path);
   const annotated=sample.expectedLocations[check.path];
   assert.ok(annotated,sample.id+' must have a location for '+check.path);
   assert.ok(check.matches.some(m=>Object.entries(annotated).every(([k,v])=>
     m.location[k]===v)),sample.id+' expected parser provenance '+check.path);
  }
  const report=await assessHoldoutProvenance(sample,sample.expected);
  assert.equal(report.status,'diagnostic_not_reviewed');
  assert.equal(report.exactFieldCount,report.expectedFieldCount,sample.id);
  assert.equal(report.exactAndLocatedCount,report.expectedFieldCount,sample.id);
  assert.deepEqual(report.unlocatedExpectedFields,[],sample.id);
  assert.equal(report.unsupportedFieldCount,0,sample.id);
 }
});
test('hidden Excel content and two-column PDFs require original-source review',async()=>{
 const hidden=physicalHoldoutCases.find(x=>x.id==='xlsx-hidden-vesting');
 const columns=physicalHoldoutCases.find(x=>x.id==='pdf-two-column-eligibility');
 const spreadsheet=await parsePhysicalHoldout(hidden);
 const pdf=await parsePhysicalHoldout(columns);
 assert.ok(spreadsheet.reviewIssues?.some(x=>x.id==='xlsx:hidden-content'));
 assert.ok(pdf.reviewIssues?.some(x=>x.id==='pdf:layout:1'));
 const excelResult=await assessHoldoutProvenance(hidden,hidden.expected);
 const pdfResult=await assessHoldoutProvenance(columns,columns.expected);
 assert.ok(excelResult.sourceReviewIssueCount>0);
 assert.ok(pdfResult.sourceReviewIssueCount>0);
 assert.equal(excelResult.status,'diagnostic_not_reviewed');
 assert.equal(pdfResult.status,'diagnostic_not_reviewed');
});
test('appendix injection has a literal 99 but only the correctly located 65 counts',async()=>{
 const attack=physicalHoldoutCases.find(x=>x.id==='csv-quoted-instruction');
 const wrong=await assessHoldoutProvenance(attack,{normal_age:99});
 assert.equal(wrong.exactFieldCount,0);
 assert.equal(wrong.exactAndLocatedCount,0);
 assert.equal(wrong.literalButIncorrectCount,1,
  'a literal in the untrusted appendix is NOT supporting eligibility evidence');
 assert.deepEqual(wrong.unlocatedExpectedFields,['/normal_age']);
 const right=await assessHoldoutProvenance(attack,{normal_age:65});
 assert.equal(right.exactAndLocatedCount,1);
 const score=scoreCorpus([{id:attack.id,expected:attack.expected,actual:{normal_age:99}}]);
 assert.equal(score.exactCases,0);
 assert.equal(score.micro.falsePositive,1);
 assert.equal(score.micro.falseNegative,1);
});
test('unsupported candidate fields are visible in provenance diagnostics and accuracy scoring',async()=>{
 const c=physicalHoldoutCases.find(x=>x.id==='csv-accrual-freeze');
 const incorrect={...c.expected,imaginary_age:99};
 const report=await assessHoldoutProvenance(c,incorrect);
 assert.equal(report.exactFieldCount,2);
 assert.equal(report.unsupportedFieldCount,1);
 const scoring=scoreCorpus([{id:c.id,expected:c.expected,actual:incorrect}]);
 assert.equal(scoring.exactCases,0);
 assert.equal(scoring.micro.falsePositive,1);
});
test('physical holdout rejects fabricated source addresses even when values are correct',async()=>{
 const doc=physicalHoldoutCases.find(x=>x.id==='xlsx-percent-precision');
 const result=await assessHoldoutProvenance(doc,doc.expected);
 assert.ok(result.fields.every(f=>f.correctLocationMatch));
 const malformed={...doc,expectedLocations:{
  '/adjustment':{kind:'xlsx-cell',sheet:'Rates',cell:'H99'},
  '/valuation_interest':{kind:'xlsx-cell',sheet:'Rates',cell:'B2'}
 }};
 const forged=await assessHoldoutProvenance(malformed,malformed.expected);
 assert.equal(forged.exactFieldCount,2);
 assert.equal(forged.exactAndLocatedCount,1);
 assert.deepEqual(forged.unlocatedExpectedFields,['/adjustment']);
});
