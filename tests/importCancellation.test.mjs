import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importDocumentBatch} from '../src/importBatch.ts';
const file=name=>new File(['fictional'],'fictional-'+name+'.txt',{type:'text/plain'});
const doc=name=>({
  id:name,name,text:'Fictional plan provision age 65.',
  sizeBytes:33,mimeType:'text/plain',
  provenance:{source:'local-text',precision:'document',fileName:name}
});
const importOne=async f=>({documents:[doc(f.name)],notes:[]});
test('an already cancelled import does not invoke any file importer',async()=>{
  const controller=new AbortController();
  controller.abort();
  let called=0;
  const existing=[doc('existing.txt')];
  await assert.rejects(importDocumentBatch([file('a')],existing,async f=>{
    called++;
    return importOne(f);
  },undefined,controller.signal),/cancelled.*No files were imported/);
  assert.equal(called,0);
  assert.deepEqual(existing.map(x=>x.id),['existing.txt']);
});
test('cancel after one of three completed files never starts the next file or commits a partial batch',async()=>{
  const controller=new AbortController();
  const seen=[];
  const original=[doc('preserved.txt')];
  await assert.rejects(importDocumentBatch([file('a'),file('b'),file('c')],
    original,async f=>{seen.push(f.name);return importOne(f);},
    ()=>controller.abort(),controller.signal),/cancelled.*No files were imported/);
  assert.deepEqual(seen,['fictional-a.txt']);
  assert.deepEqual(original.map(x=>x.id),['preserved.txt']);
});
test('cancel while active asynchronous importer is in flight discards its eventual result',async()=>{
  const controller=new AbortController();
  let started,release;
  const active=new Promise(r=>{started=r;});
  const pending=new Promise(r=>{release=r;});
  const seen=[];
  const operation=importDocumentBatch([file('a'),file('b')],[],
    async f=>{
      seen.push(f.name);
      started();
      await pending;
      return importOne(f);
    },undefined,controller.signal);
  await active;
  controller.abort();
  release();
  await assert.rejects(operation,/cancelled.*No files were imported/);
  assert.deepEqual(seen,['fictional-a.txt']);
});
test('uncancelled batches remain unchanged with optional signal',async()=>{
  const controller=new AbortController();
  const files=[file('a'),file('b')];
  const result=await importDocumentBatch(files,[],importOne,undefined,controller.signal);
  assert.deepEqual(result.documents.map(d=>d.name),files.map(f=>f.name));
});
