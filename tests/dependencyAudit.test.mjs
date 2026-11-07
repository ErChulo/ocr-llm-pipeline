import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAudit} from '../scripts/check-dependency-audit.mjs';

const metadata=(values={})=>({metadata:{vulnerabilities:{
  info:0,low:0,moderate:0,high:0,critical:0,...values
}}});
test('clean production dependency report passes without inventing vulnerabilities',()=>{
 const result=summarizeAudit(metadata());
 assert.equal(result.total,0);
 assert.equal(result.passed,true);
});

test('high or critical findings block production; moderate findings stay visible',()=>{
 const moderate=summarizeAudit(metadata({moderate:3}));
 assert.equal(moderate.passed,true);
 assert.equal(moderate.total,3);
 const high=summarizeAudit(metadata({high:1,moderate:2}));
 assert.equal(high.passed,false);
 assert.equal(high.blocking,1);
 assert.equal(high.total,3);
 const critical=summarizeAudit(metadata({critical:2}));
 assert.equal(critical.passed,false);
 assert.equal(critical.blocking,2);
});

test('registry outages and missing severity metadata never count as zero',()=>{
 for(const input of [null,{},[],{error:{code:'ENOAUDIT'}},
   {metadata:{vulnerabilities:{high:0,critical:0}}}]){
   assert.throws(()=>summarizeAudit(input),/invalid report|invalid .* severity|no vulnerability metadata|error/);
 }
});

test('malformed or negative severity counts fail closed',()=>{
 for(const high of [-1,'0',NaN,Infinity,1.4]){
  assert.throws(()=>summarizeAudit(metadata({high})),/invalid high severity/);
 }
});
