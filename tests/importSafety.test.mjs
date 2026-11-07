import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importText } from '../src/pipeline.ts';

const ocr = documents => JSON.stringify({metadata:{piiScanState:'unknown'},documents});

test('Bulk OCR JSONC import preserves source and isolates document IDs',()=>{
  const payload=ocr([
    {id:'alpha',name:'first.txt',extractedText:'Normal retirement at 65',sizeBytes:-1},
    {name:'second.txt',extractedText:'Early retirement at 55'}
  ]);
  const result=importText('export.jsonc','// generated locally\n'+payload);
  assert.equal(result.documents.length,2);
  assert.equal(result.documents[0].id,'alpha');
  assert.equal(result.documents[1].id,'export.jsonc:1');
  assert.equal(result.documents[0].sizeBytes,new TextEncoder().encode('Normal retirement at 65').length);
  assert.equal(result.documents[1].provenance.precision,'document');
  assert.ok(result.notes.some(n=>n.includes('PII review')));
});

test('Bulk OCR import rejects empty, duplicate and oversized document sets',()=>{
  assert.throws(()=>importText('empty.json',ocr([])),/1 to 200 documents/);
  assert.throws(()=>importText('many.json',ocr(
    Array.from({length:201},(_,i)=>({name:'doc'+i,extractedText:'text'}))
  )),/1 to 200 documents/);
  assert.throws(()=>importText('duplicate.json',ocr([
    {id:'same',name:'a',extractedText:'one'},
    {id:'same',name:'b',extractedText:'two'}
  ])),/duplicate document IDs/);
  assert.throws(()=>importText('blank.json',ocr([
    {name:'a',extractedText:'  '}
  ])),/no readable extracted text/);
  assert.throws(()=>importText('bad.json',ocr([
    {name:'  ',extractedText:'valid'}
  ])),/requires a nonempty name/);
});

test('Bulk OCR import enforces per-document and aggregate character limits',()=>{
  assert.throws(()=>importText('long.json',ocr([
    {name:'large',extractedText:'x'.repeat(2_000_001)}
  ])),/2 million character/);
  const portion='x'.repeat(1_400_000);
  assert.throws(()=>importText('batch.json',ocr([
    {name:'a',extractedText:portion},
    {name:'b',extractedText:portion},
    {name:'c',extractedText:portion}
  ])),/4 million character aggregate/);
});

test('Plain-text import rejects empty or too-large text without truncation',()=>{
  assert.throws(()=>importText('blank.txt',' \n '),/no readable content/);
  assert.throws(()=>importText('large.md','a'.repeat(2_000_001)),/2 million character/);
  const valid=importText('case.md','Retirement age 65');
  assert.equal(valid.documents[0].text,'Retirement age 65');
  assert.ok(valid.notes[0].includes('document-level'));
});
