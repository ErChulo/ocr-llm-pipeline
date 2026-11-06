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
