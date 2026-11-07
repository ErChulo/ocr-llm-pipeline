import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importDocumentBatch} from '../src/importBatch.ts';

const file=(name,text='A')=>new File([text],name,{type:'text/plain'});
const doc=(name,text='Plan provision age 65.',id=name)=>({
  id,name,text,mimeType:'text/plain',sizeBytes:new TextEncoder().encode(text).byteLength,
  provenance:{source:'local-text',precision:'document',fileName:name}
});
const importer=async f=>({documents:[doc(f.name)],notes:['Read '+f.name]});

test('files import sequentially, with no partial state until entire batch succeeds',async()=>{
  const files=[file('first.txt'),file('second.txt'),file('third.txt')];
  let active=0,maxActive=0;
  const sequence=[];
  const imported=async f=>{
    active++;maxActive=Math.max(active,maxActive);sequence.push('begin '+f.name);
    await new Promise(resolve=>setImmediate(resolve));
    sequence.push('end '+f.name);active--;
    return {documents:[doc(f.name)],notes:[]};
  };
  const progress=[];
  const old=[doc('original.txt')];
  const result=await importDocumentBatch(files,old,imported,(done,total)=>progress.push([done,total]));
  assert.equal(maxActive,1);
  assert.deepEqual(sequence,[
    'begin first.txt','end first.txt','begin second.txt','end second.txt',
    'begin third.txt','end third.txt'
  ]);
  assert.deepEqual(progress,[[1,3],[2,3],[3,3]]);
  assert.deepEqual(result.documents.map(x=>x.name),files.map(x=>x.name));
  assert.deepEqual(old.map(x=>x.name),['original.txt']);
});

test('a failure on the last selected file rejects the whole import batch',async()=>{
  const old=[doc('existing.txt')];
  const files=[file('first.txt'),file('bad.txt')];
  let called=0;
  await assert.rejects(importDocumentBatch(files,old,async f=>{
    called++;
    if(f.name==='bad.txt')throw new Error('OCR failed');
    return {documents:[doc(f.name)],notes:[]};
  }),/OCR failed/);
  assert.equal(called,2);
  assert.deepEqual(old.map(x=>x.name),['existing.txt']);
});

test('duplicated filenames or IDs cannot create ambiguous source identity',async()=>{
  await assert.rejects(importDocumentBatch([file('SLA.txt')],[doc('sla.TXT')],importer),/Duplicate document/);
  await assert.rejects(importDocumentBatch([file('first.txt'),file('second.txt')],[],
    async f=>({documents:[doc(f.name,'age 65','same-id')],notes:[]})
  ),/Duplicate document/);
  await assert.rejects(importDocumentBatch([file('one.txt')],[],
    async ()=>({documents:[doc('A.txt'),doc('a.TXT')],notes:[]})
  ),/Duplicate document/);
});

test('file selection and session document limits fail before accepting data',async()=>{
  await assert.rejects(importDocumentBatch(
    Array.from({length:21},(_,i)=>file('file'+i+'.txt')),[],importer
  ),/1 to 20 files/);
  const prior=Array.from({length:200},(_,i)=>doc('source-'+i+'.txt'));
  await assert.rejects(importDocumentBatch([file('new.txt')],prior,importer),/200-document limit/);
  const almost=Array.from({length:199},(_,i)=>doc('source-'+i+'.txt'));
  await assert.rejects(importDocumentBatch([file('new.txt')],almost,
    async()=>({documents:[doc('next.txt'),doc('another.txt')],notes:[]})
  ),/exceeds 200 documents/);
});

test('total extracted characters are limited across independently imported files',async()=>{
  const huge='A'.repeat(2_000_000);
  const files=[file('a.txt'),file('b.txt'),file('c.txt')];
  await assert.rejects(importDocumentBatch(files,[],
    async f=>({documents:[doc(f.name,huge)],notes:[]})
  ),/exceeds 4 million extracted characters/);
});

test('oversized selections and invalid source documents cannot be admitted',async()=>{
  await assert.rejects(importDocumentBatch([file('a.txt','')],[],importer),/1 byte and 20 MB/);
  await assert.rejects(importDocumentBatch([file('bad.txt')],[],async()=>({
    documents:[doc('bad.txt',' ')],notes:[]
  })),/invalid document identity/);
  await assert.rejects(importDocumentBatch([file('bad.txt')],[],async()=>({
    documents:[],notes:[]
  })),/no source documents/);
});

test('multi-document OCR imports count against the same session quota',async()=>{
  const data=await importDocumentBatch([file('bulk.jsonc')],[doc('existing.txt')],
    async()=>({documents:[doc('A.txt','age 65','source:a'),doc('B.txt','age 55','source:b')],
      notes:['two imported sources']})
  );
  assert.equal(data.documents.length,2);
  assert.deepEqual(data.notes,['two imported sources']);
});
