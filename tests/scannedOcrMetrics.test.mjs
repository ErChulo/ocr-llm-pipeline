import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreFictionalScannedPages} from './fixtures/scannedOcrMetrics.mjs';

const expected=[
 {page:1,rotation:0,rows:[['55','0.8750'],['65','1.0000']]},
 {page:2,rotation:90,rows:[['57','0.8234'],['63','0.9471']]}
];
test('exact fictional OCR scores are page-local, never implied cell coordinates',()=>{
 const result=scoreFictionalScannedPages({
  1:'AGE FACTOR\\n55 0.8750\\n65 1.0000',
  2:'57 0.8234\\n63 0.9471'
 },expected);
 assert.deepEqual(result.map(p=>p.literalsRecognized),[4,4]);
 assert.deepEqual(result.map(p=>p.rowPairsRecognized),[2,2]);
 assert.deepEqual(result.map(p=>p.wrongPageLiterals),[[],[]]);
 assert.deepEqual(result.map(p=>p.rotation),[0,90]);
});
test('decimal truncation, near misses and negative signed literals cannot earn exact credit',()=>{
 const result=scoreFictionalScannedPages({
  1:'555 0.875O\\n-65 1.00001\\n0.875\\n65%\\n',
  2:'57 0.8234\\n63 0.9471'
 },expected);
 assert.equal(result[0].literalsRecognized,0);
 assert.equal(result[0].rowPairsRecognized,0);
 assert.deepEqual(result[0].missingLiterals,['55','0.8750','65','1.0000']);
});
test('row swaps, broken lines and wrong-page values are reported, never silently paired',()=>{
 const result=scoreFictionalScannedPages({
  1:'55 1.0000\\n65 0.8750\\n57 0.8234',
  2:'57\\n0.8234\\n63 0.9471'
 },expected);
 assert.equal(result[0].literalsRecognized,4);
 assert.equal(result[0].rowPairsRecognized,0);
 assert.deepEqual(result[0].wrongPageLiterals,['57','0.8234']);
 assert.equal(result[1].literalsRecognized,4);
 assert.equal(result[1].rowPairsRecognized,1);
});
test('invalid numeric annotations, duplicate tokens and absent page OCR fail closed',()=>{
 assert.throws(()=>scoreFictionalScannedPages({},expected),/Missing actual OCR page/);
 assert.throws(()=>scoreFictionalScannedPages({1:'hi'},[{
  page:1,rows:[['55','0.8750'],['55','1.0000']]
 }]),/unique annotated numeric tokens/);
 assert.throws(()=>scoreFictionalScannedPages({1:'hi'},[{
  page:1,rows:[['55','0.87O0']]
 }]),/Invalid fictional numeric ground truth/);
});
