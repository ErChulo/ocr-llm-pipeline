import { test } from 'node:test';
import assert from 'node:assert/strict';
import {auditLiteralEvidence,evidenceReviewComplete,exportReviewedEvidence} from '../src/evidence.ts';

const doc={
 id:'synthetic',name:'plan.pdf',mimeType:'application/pdf',sizeBytes:900,
 provenance:{source:'pdf-native',precision:'page',fileName:'plan.pdf'},
 text:'Page 1:\nNormal retirement at age 65.\n\nPage 2:\nEarly retirement: 55 and 10 years.\n\n',
 records:[
  {start:0,end:38,label:'Page 1',location:{kind:'pdf-page',page:1}},
  {start:38,end:82,label:'Page 2',location:{kind:'pdf-page',page:2}}
 ]
};
test('exact evidence is located in actual source-page records',()=>{
 const actual=doc.text.indexOf('Page 2:');
 const d={...doc,records:[{start:0,end:actual,label:'Page 1',location:{kind:'pdf-page',page:1}},
   {start:actual,end:doc.text.length,label:'Page 2',location:{kind:'pdf-page',page:2}}]};
 const c=auditLiteralEvidence(d,{normal_age:65,eligibility:{age:55,service:10}});
 assert.equal(c.length,3);
 assert.equal(c[0].status,'match');
 assert.equal(c[0].matches[0].location.page,1);
 assert.equal(c[1].matches[0].location.page,2);
 assert.equal(c[2].matches[0].location.page,2);
 assert.equal(evidenceReviewComplete(c,{},{}),false);
 const pick=Object.fromEntries(c.map(x=>[x.path,0]));
 const check=Object.fromEntries(c.map(x=>[x.path,true]));
 assert.equal(evidenceReviewComplete(c,pick,check),true);
 assert.deepEqual(Object.keys(exportReviewedEvidence(c,pick,check)).sort(),c.map(x=>x.path).sort());
});
test('generated page labels cannot supply facts',()=>{
 const d={...doc,text:'Page 65:\nOnly placeholder data.\n',records:[{
  start:0,end:31,label:'Page 65',location:{kind:'pdf-page',page:65}
 }]};
 const c=auditLiteralEvidence(d,{retirementAge:65});
 assert.equal(c[0].matches.length,0);
});
test('fail closed for fabricated, normalized or unsupported values',()=>{
 const text='Retirement age is 1965, not 65. All benefits remain subject to approval.';
 const d={...doc,text,records:undefined};
 const c=auditLiteralEvidence(d,{age:650,accepted:true,blank:0,missing:'Totally made up'});
 assert.equal(c.length,4);
 assert.ok(c.every(x=>x.status==='missing'));
 assert.throws(()=>exportReviewedEvidence(c,{},{}),/blocked/);
});
test('numeric evidence requires token boundaries',()=>{
 const d={...doc,text:'Birth year 1965, age 65.5, final retirement 65.',records:undefined};
 const c=auditLiteralEvidence(d,{normalAge:65});
 assert.equal(c[0].matches.length,1);
 assert.ok(c[0].matches[0].quote.includes('final retirement 65'));
});
test('arrays and nested object values map to JSON pointer paths',()=>{
 const d={...doc,text:'SLA JS50 65',records:undefined};
 const c=auditLiteralEvidence(d,{forms:['SLA','JS50'],nested:{age:65}});
 assert.deepEqual(c.map(x=>x.path),['/forms/0','/forms/1','/nested/age']);
});

test('plain text colons do not masquerade as parser labels',()=>{
 const raw='Normal retirement age: 65. Early retirement at 55.';
 const d={...doc,text:raw,records:undefined};
 const checks=auditLiteralEvidence(d,{description:'Normal retirement age',age:65});
 assert.equal(checks[0].status,'match');
 assert.equal(checks[0].matches[0].start,0);
 assert.equal(checks[1].status,'match');
 assert.equal(checks[1].matches[0].start,raw.indexOf('65'));
});
test('special characters are literal, not regular expressions',()=>{
 const raw='The plan specifies [SLA] as an optional form.';
 const d={...doc,text:raw,records:undefined};
 const checks=auditLiteralEvidence(d,{form:'[SLA]'});
 assert.equal(checks[0].status,'match');
 assert.equal(raw.slice(checks[0].matches[0].start,checks[0].matches[0].end),'[SLA]');
});
test('Unicode source offsets are against unchanged text',()=>{
 const raw='İstanbul, normal form [SLA] and retirement 65.';
 const d={...doc,text:raw,records:undefined};
 const checks=auditLiteralEvidence(d,{form:'[SLA]',age:65});
 assert.equal(checks[0].status,'match');
 assert.equal(raw.slice(checks[0].matches[0].start,checks[0].matches[0].end),'[SLA]');
 assert.equal(raw.slice(checks[1].matches[0].start,checks[1].matches[0].end),'65');
});

test('PDF literal match contains actual PDF text-item envelopes for review', async()=>{
 const {parsePdf}=await import('../src/pdfText.ts');
 const {createSyntheticPdf}=await import('./pdf-fixture.mjs');
 const parsed=await parsePdf('synthetic.pdf',new Uint8Array(createSyntheticPdf([['Normal retirement age 65']])));
 const checked=auditLiteralEvidence(parsed,{age:65});
 assert.equal(checked[0].status,'match');
 const matched=checked[0].matches[0];
 assert.equal(matched.location.page,1);
 assert.ok(matched.textItemBoxes?.length>0);
 assert.equal(matched.textItemBoxes[0].precision,'pdf-text-item-envelope');
});

test('GGUF candidate matches must be within the model source section, not elsewhere',()=>{
 const first='Normal age is 65, and this section does not mention a later amendment.\n';
 const second='A later amendment says normal age is 67.\n';
 const d={...doc,text:first+second,records:undefined};
 const audit={
  documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:first.length},{chunk:2,start:first.length,end:d.text.length}],
  candidates:{'/age':[{value:67,spans:[{chunk:1,start:0,end:first.length}]}]},
  conflicts:[]
 };
 const restricted=auditLiteralEvidence(d,{age:67},audit);
 assert.equal(restricted[0].status,'missing');
 assert.equal(restricted[0].sourceScope,'model_sections');
 const whole=auditLiteralEvidence(d,{age:67});
 assert.equal(whole[0].status,'match');
});

test('explicit reviewer-edited values may find any source but require source confirmation',()=>{
 const text='Early age 55, normal age 65.';
 const d={...doc,text,records:undefined};
 const audit={
  documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:text.length}],
  candidates:{'/age':[{value:55,spans:[{chunk:1,start:0,end:text.length}]}]},conflicts:[]
 };
 const checks=auditLiteralEvidence(d,{age:65},audit);
 assert.equal(checks[0].status,'match');
 assert.equal(checks[0].sourceScope,'reviewer_edited');
 assert.equal(evidenceReviewComplete(checks,{},{}),false);
});

test('array element matches inherit the model candidate source span',()=>{
 const a='Normal forms SLA and JS50.\n',b='An unrelated glossary repeats JS50.\n';
 const d={...doc,text:a+b,records:undefined};
 const audit={documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:a.length},{chunk:2,start:a.length,end:d.text.length}],
  candidates:{'/forms':[{value:['SLA','JS50'],spans:[{chunk:1,start:0,end:a.length}]}]},conflicts:[]};
 const c=auditLiteralEvidence(d,{forms:['SLA','JS50']},audit);
 assert.equal(c[1].matches.length,1);
 assert.ok(c[1].matches[0].start<a.length);
 assert.equal(c[1].sourceScope,'model_sections');
});
