import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectGgufParts} from '../src/ggufPreflight.ts';
const part=(name,size)=>({name,size});

test('small standalone GGUF is accepted without unsupported acceleration claims',()=>{
 const report=inspectGgufParts([part('stories260K.gguf',1200000)]);
 assert.equal(report.partCount,1);
 assert.equal(report.largeForSingleThread,false);
 assert.equal(report.totalBytes,1200000);
});

test('large quantized GGUF warns about the single-CPU-thread offline runtime',()=>{
 const report=inspectGgufParts([part('Qwen-3B-Q4_K_M.gguf',2100000000)]);
 assert.equal(report.largeForSingleThread,true);
 assert.match(report.advice,/one CPU thread/);
 assert.match(report.advice,/no GPU offloading/);
});

test('2 GiB single-part files require splitting to avoid browser size limits',()=>{
 assert.throws(()=>inspectGgufParts([part('large.gguf',2147483648)]),/2 GiB or larger/);
});

test('split GGUF parts must have consistent names and exhaustive indices',()=>{
 const good=[
  part('Qwen-00002-of-00003.gguf',200),
  part('Qwen-00001-of-00003.gguf',300),
  part('Qwen-00003-of-00003.gguf',100)
 ];
 assert.equal(inspectGgufParts(good).totalBytes,600);
 assert.throws(()=>inspectGgufParts(good.slice(0,2)),/expected split count/);
 assert.throws(()=>inspectGgufParts([good[0],good[0],good[2]]),/duplicate part names/);
 assert.throws(()=>inspectGgufParts([
  part('Qwen-00001-of-00003.gguf',20),part('Qwen-00002-of-00003.gguf',20),
  part('Other-00003-of-00003.gguf',20)
 ]),/different split models/);
 assert.throws(()=>inspectGgufParts([
  part('Qwen-00001-of-00002.gguf',20),part('other.gguf',20)
 ]),/Do not mix/);
 assert.throws(()=>inspectGgufParts([part('a.gguf',20),part('b.gguf',20)]),
   /complete, consistently named split/);
});

test('non-GGUF, zero-byte, empty and duplicated selections fail preflight',()=>{
 assert.throws(()=>inspectGgufParts([]),/between 1 and 128/);
 assert.throws(()=>inspectGgufParts([part('a.txt',30)]),/only local GGUF/);
 assert.throws(()=>inspectGgufParts([part('a.gguf',0)]),/non-empty local file/);
 assert.throws(()=>inspectGgufParts([part('Model.gguf',20),part('model.gguf',10)]),
   /duplicate part names/);
});
