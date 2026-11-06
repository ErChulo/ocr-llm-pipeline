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
