import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreSourceDate,sourceDateField} from '../src/sourceDateRestoration.ts';
import {collectChunkCandidates,resolveCandidateValues} from '../src/chunkExtraction.ts';
import {auditLiteralEvidence,evidenceReviewComplete} from '../src/evidence.ts';

const doc=text=>({id:'fictional',name:'fictional.txt',text,mimeType:'text/plain',
 sizeBytes:text.length,provenance:{source:'local-text',precision:'document',fileName:'fictional.txt'}});
const singleChunk=text=>[{chunk:1,start:0,end:text.length,text}];

test('unambiguous ISO date can recover only exact source wording',()=>{
 const source='Amendment effective January 1 2025 changes normal age to 67.';
 assert.deepEqual(restoreSourceDate('2025-01-01',source),{
  value:'January 1 2025',modelValue:'2025-01-01',
  sourceStart:source.indexOf('January 1 2025'),
  sourceEnd:source.indexOf('January 1 2025')+'January 1 2025'.length
 });
 const withComma='Amendment effective January 1, 2025 changes normal age.';
 assert.equal(restoreSourceDate('2025-01-01',withComma).value,'January 1, 2025');
 assert.equal(restoreSourceDate('January 1, 2025',source).value,'January 1 2025');
});

test('already sourced strings are not fabricated date restorations',()=>{
 const source='Effective January 1 2025. Another date: January 2 2025.';
 assert.equal(restoreSourceDate('January 1 2025',source),null);
 assert.equal(restoreSourceDate('2025-01-01','Only 2025-01-01 is in this source.'),null);
 assert.equal(restoreSourceDate('2025-01-02',source).value,'January 2 2025');
});

test('multiple genuinely different presentations remain ambiguous and unmodified',()=>{
 const source='Original January 1 2025; appendix January 1, 2025.';
 assert.equal(restoreSourceDate('2025-01-01',source),null);
 assert.equal(restoreSourceDate('2025-01-01','Other plan: January 2 2025.'),null);
 assert.equal(restoreSourceDate('2025-02-29','February 29 2025.'),null);
 assert.equal(restoreSourceDate('01/02/2025','January 2 2025.'),null);
});

test('restoration rejects embedded date strings and non-date fields',()=>{
 const embedded='ID-A2025-01-01B and xJanuary 1 2025_end';
 assert.equal(restoreSourceDate('2025-01-01',embedded),null);
 assert.equal(sourceDateField('plan_amendment_date'),true);
 assert.equal(sourceDateField('freeze_date'),true);
 assert.equal(sourceDateField('DATE'),true);
 assert.equal(sourceDateField('normal_form'),false);
 assert.equal(sourceDateField('age'),false);
});

test('candidate collection retains original model value and actual source section',()=>{
 const text='Amendment effective January 1 2025 changes normal age.';
 const audit=collectChunkCandidates(doc(text),singleChunk(text),[
  {amendment_date:'2025-01-01',normal_age:67}
 ]);
 const candidate=audit.candidates['/amendment_date'][0];
 assert.equal(candidate.value,'January 1 2025');
 assert.deepEqual(candidate.sourceDateRestoredFrom,['2025-01-01']);
 assert.deepEqual(candidate.spans,[{chunk:1,start:0,end:text.length}]);
 assert.equal(resolveCandidateValues(audit).data.amendment_date,'January 1 2025');
});

test('no cross-section restoration; the source chunk must contain the date',()=>{
 const first='Amendment effective January 1 2025. '.repeat(8);
 const second='Normal benefit is based on service.';
 const source=first+second;
 const chunks=[
   {chunk:1,start:0,end:first.length,text:first},
   {chunk:2,start:first.length,end:source.length,text:second}
 ];
 const audit=collectChunkCandidates(doc(source),chunks,[
   {amendment_date:null},{amendment_date:'2025-01-01'}
 ]);
 assert.equal(audit.candidates['/amendment_date'][0].value,'2025-01-01');
 assert.equal(audit.candidates['/amendment_date'][0].sourceDateRestoredFrom,undefined);
});

test('non-date strings are never transformed even when date-like',()=>{
 const source='Reference: January 1 2025.';
 const audit=collectChunkCandidates(doc(source),singleChunk(source),[
  {normal_form:'2025-01-01'}
 ]);
 assert.equal(audit.candidates['/normal_form'][0].value,'2025-01-01');
});


test('restored exact source dates still require a selected and confirmed citation',()=>{
 const text='FICTIONAL PLAN. Effective January 1 2025, normal age changes to 67.';
 const d=doc(text),audit=collectChunkCandidates(d,singleChunk(text),[
  {amendment_date:'2025-01-01'}
 ]);
 const value=resolveCandidateValues(audit).data;
 const check=auditLiteralEvidence(d,value,audit);
 assert.equal(check.length,1);
 assert.equal(check[0].status,'match');
 assert.equal(check[0].sourceScope,'model_sections');
 assert.equal(check[0].evidenceMethod,'literal_value');
 assert.equal(evidenceReviewComplete(check,{},{}),false);
 assert.equal(evidenceReviewComplete(check,{'/amendment_date':0},{'/amendment_date':true}),true);
});

test('different dates in separate source chunks remain an explicit conflict',()=>{
 const a='Original normal date January 1 2025. ';
 const b='Amendment date January 2 2025.';
 const source=a+b;
 const chunks=[
  {chunk:1,start:0,end:a.length,text:a},
  {chunk:2,start:a.length,end:source.length,text:b}
 ];
 const audit=collectChunkCandidates(doc(source),chunks,[
  {amendment_date:'2025-01-01'},
  {amendment_date:'2025-01-02'}
 ]);
 assert.deepEqual(audit.conflicts.map(x=>x.path),['/amendment_date']);
 assert.deepEqual(audit.conflicts[0].candidates.map(x=>x.value),
  ['January 1 2025','January 2 2025']);
 assert.deepEqual(resolveCandidateValues(audit).unresolved,['/amendment_date']);
});
