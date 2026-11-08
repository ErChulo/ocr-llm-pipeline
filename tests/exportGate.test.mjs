import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExportGate } from '../src/exportGate.ts';
const d={id:'a',name:'a.txt',text:'Normal 65',sizeBytes:10,mimeType:'text/plain',
 provenance:{source:'local-text',precision:'document',fileName:'a.txt'}};
const audit={documentId:'a',documentName:'a.txt',sourceText:'Normal 65',length:9,chunks:[{start:0,end:9,chunk:1}],
 candidates:{},conflicts:[]};
const evidence=[{path:'/age',value:65,status:'match',
 matches:[{start:7,end:9,quote:'65',label:'Document',location:{kind:'document'}}]}];
const safe={document:d,audit,value:{age:65},schemaValid:true,busy:false,evidence,
 selectedEvidence:{'/age':0},confirmedEvidence:{'/age':true},
 conflictsUnresolved:0,privacyRequired:false,privacyReviewed:false};
test('complete evidence and validated extraction permit export',()=>{
 assert.deepEqual(evaluateExportGate(safe),{allowed:true,reasons:[]});
});
test('rejects changed document or mismatched audit',()=>{
 assert.equal(evaluateExportGate({...safe,document:{...d,text:'Evil text'}}).allowed,false);
 assert.equal(evaluateExportGate({...safe,audit:{...audit,length:3}}).allowed,false);
});
test('rejects unresolved conflicts, unfinished PII and unreviewed source matches',()=>{
 for(const item of [
  {...safe,conflictsUnresolved:1},
  {...safe,privacyRequired:true,privacyReviewed:false},
  {...safe,confirmedEvidence:{}},
  {...safe,selectedEvidence:{}},
  {...safe,schemaValid:false},
  {...safe,busy:true}
 ])assert.equal(evaluateExportGate(item).allowed,false);
});
test('no evidence and no document cannot be exported',()=>{
 assert.equal(evaluateExportGate({...safe,document:null,audit:null,evidence:[]}).allowed,false);
});

test('same text and filename but different original bytes cannot reuse evidence review',()=>{
 const source={...d,sourceSha256:'a'.repeat(64)};
 const record={...audit,sourceSha256:'b'.repeat(64)};
 const gate=evaluateExportGate({...safe,document:source,audit:record});
 assert.equal(gate.allowed,false);
 assert.ok(gate.reasons.some(reason=>reason.includes('does not match')));
});

test('identical original file hash but different OCR transcription hash blocks export',()=>{
 const document={...d,sourceSha256:'a'.repeat(64),processedTextSha256:'1'.repeat(64)};
 const reviewed={...audit,sourceSha256:'a'.repeat(64),processedTextSha256:'2'.repeat(64)};
 assert.equal(evaluateExportGate({...safe,document,audit:reviewed}).allowed,false);
});

test('source-completeness warnings block export until each item is acknowledged',()=>{
 assert.equal(evaluateExportGate({...safe,sourceIssuesUnreviewed:2}).allowed,false);
 assert.equal(evaluateExportGate({...safe,sourceIssuesUnreviewed:0}).allowed,true);
});


test('export refuses a gap or overlap in the middle of otherwise plausible source coverage',()=>{
 const doc={...d,text:'ABCDEFGHIJKLMNOPQRST'};
 const correct={...audit,sourceText:doc.text,length:doc.text.length,chunks:[
  {chunk:1,start:0,end:7},{chunk:2,start:7,end:14},{chunk:3,start:14,end:20}
 ]};
 assert.equal(evaluateExportGate({...safe,document:doc,audit:correct}).allowed,true);
 const malformed=[
  [{chunk:1,start:0,end:7},{chunk:2,start:8,end:14},{chunk:3,start:14,end:20}],
  [{chunk:1,start:0,end:7},{chunk:2,start:6,end:14},{chunk:3,start:14,end:20}],
  [{chunk:1,start:0,end:7},{chunk:3,start:7,end:14},{chunk:4,start:14,end:20}],
  [{chunk:1,start:0,end:7},{chunk:2,start:7,end:7},{chunk:3,start:7,end:20}]
 ];
 for(const chunks of malformed){
  assert.equal(evaluateExportGate({...safe,document:doc,audit:{...correct,chunks}}).allowed,false);
 }
});

test('candidate citations cannot refer to fabricated or altered source sections',()=>{
 const good={...audit,candidates:{'/age':[{value:65,spans:[{chunk:1,start:0,end:9}]}]}};
 assert.equal(evaluateExportGate({...safe,audit:good}).allowed,true);
 const forged=[
  [{value:65,spans:[{chunk:2,start:0,end:9}]}],
  [{value:65,spans:[{chunk:1,start:0,end:8}]}],
  [{value:65,spans:[]}],
  [{value:65,spans:[{chunk:1,start:1,end:9}]}]
 ];
 for(const candidates of forged){
  const altered={...audit,candidates:{'/age':candidates}};
  assert.equal(evaluateExportGate({...safe,audit:altered}).allowed,false);
 }
});

test('all multi-section candidate source spans must match an audited section exactly',()=>{
 const document={...d,text:'ABCDEFGHIJKLMNOPQRST'};
 const good={...audit,sourceText:document.text,length:20,
  chunks:[{chunk:1,start:0,end:10},{chunk:2,start:10,end:20}],
  candidates:{'/age':[{value:65,spans:[{chunk:1,start:0,end:10},{chunk:2,start:10,end:20}]}]}};
 assert.equal(evaluateExportGate({...safe,document,audit:good}).allowed,true);
 const bad={...good,candidates:{'/age':[{value:65,spans:[{chunk:2,start:9,end:20}]}]}};
 assert.equal(evaluateExportGate({...safe,document,audit:bad}).allowed,false);
});

test('previously confirmed evidence cannot authorize modified JSON',()=>{
  for(const changed of [
    {age:66}, {age:'65'}, {age:65,service:10},
    {}, {age:null}, {age:65,qualification:false}
  ]){
    const result=evaluateExportGate({...safe,value:changed});
    assert.equal(result.allowed,false,JSON.stringify(changed));
    assert.ok(result.reasons.some(r=>r.includes('no longer matches')));
  }
  assert.equal(evaluateExportGate({...safe,value:{age:65}}).allowed,true);
});
test('duplicate or substituted evidence checks cannot authorize export',()=>{
  const wrong={...evidence[0],value:66};
  const extra={...evidence[0],path:'/service',value:10};
  for(const checks of [[wrong],[...evidence,...evidence],[...evidence,extra],[]]){
    assert.equal(evaluateExportGate({...safe,evidence:checks}).allowed,false);
  }
});
test('reviewed nested arrays and JSON-pointer-escaped keys are bound exactly',()=>{
  const value={forms:['SLA','JS50'], 'age/normal':65,'qualification':false};
  const checks=[
    {path:'/forms/0',value:'SLA',status:'match',matches:evidence[0].matches},
    {path:'/forms/1',value:'JS50',status:'match',matches:evidence[0].matches},
    {path:'/age~1normal',value:65,status:'match',matches:evidence[0].matches},
    {path:'/qualification',value:false,status:'match',matches:evidence[0].matches}
  ];
  const selected=Object.fromEntries(checks.map(c=>[c.path,0]));
  const confirmed=Object.fromEntries(checks.map(c=>[c.path,true]));
  const input={...safe,value,evidence:checks,selectedEvidence:selected,confirmedEvidence:confirmed};
  assert.equal(evaluateExportGate(input).allowed,true);
  assert.equal(evaluateExportGate({...input,value:{...value,forms:['JS50','SLA']}}).allowed,false);
  assert.equal(evaluateExportGate({...input,value:{...value,qualification:null}}).allowed,false);
  assert.equal(evaluateExportGate({...input,value:{...value,'age/normal':66}}).allowed,false);
});
