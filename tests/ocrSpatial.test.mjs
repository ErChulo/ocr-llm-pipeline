import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessSpatialOcrRows} from '../src/ocrSpatial.ts';
const word=(text,x,y,width=42,height=27)=>({text,confidence:91,bbox:{x0:x,y0:y,x1:x+width,y1:y+height}});
const original=[word('AGE',80,140),word('MONTHLY',440,140,120),word('FACTOR',570,140,110),
  word('58',80,239),word('0.9063',440,239,118),word('64',80,336),word('0.9813',440,336,118)];
const args={page:3,imageWidth:1000,imageHeight:540,text:'AGE MONTHLY FACTOR\n58 0.9063\n64 0.9813',words:original};
test('return measured PDF page and image pixel regions without fabricating geometry',()=>{
  const v=assessSpatialOcrRows(args);
  assert.equal(v.status,'candidates');
  assert.equal(v.pairs.length,2);
  assert.deepEqual(v.pairs.map(p=>[p.age.text,p.factor.text]),[['58','0.9063'],['64','0.9813']]);
  assert.deepEqual(v.pairs[0].region,{x0:80,y0:239,x1:558,y1:266});
  assert.equal(v.pairs[0].page,3);
  assert.equal(v.pairs[0].precision,'tesseract-raster-word-envelope');
  const ranges=v.pairs[0].transcriptRanges;
  assert.equal(args.text.slice(ranges.age.start,ranges.age.end),'58');
  assert.equal(args.text.slice(ranges.factor.start,ranges.factor.end),'0.9063');
});
test('actual pixel association is independent of input array and OCR reading order',()=>{
  const v=assessSpatialOcrRows({...args,words:[...original].reverse(),text:'64 0.9813\nAGE MONTHLY FACTOR\n58 0.9063'});
  assert.equal(v.status,'candidates');
  assert.deepEqual(v.pairs.map(p=>p.age.text),['58','64']);
});
test('incorrect or multiple factor candidates must abstain, not guess cells',()=>{
  const v=assessSpatialOcrRows({...args,words:[...original,word('0.7811',475,239)],text:args.text+'\n0.7811'});
  assert.equal(v.status,'abstain');
  assert.deepEqual(v.pairs,[]);
});
test('OCR missing an age, duplicate literal, or missing header must abstain',()=>{
  assert.equal(assessSpatialOcrRows({...args,text:args.text.replace('58','o8')}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,text:args.text+'\n58'}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,words:original.filter(w=>w.text!=='AGE')}).status,'abstain');
});
test('reject invalid positions, bad confidence, or untrusted complexity',()=>{
  assert.equal(assessSpatialOcrRows({...args,page:0}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,words:[...original,word('x',2000,50)]}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,words:[...original,{...original[3],confidence:NaN}]}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,words:new Array(10001).fill(original[0])}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,text:'x'.repeat(250001)}).status,'abstain');
  assert.equal(assessSpatialOcrRows({...args,words:[...original,...new Array(1000).fill(original[0])]}).status,'abstain');
});

test('abstain when an observed numeric service column separates age and factor',()=>{
  const service=word('20',290,239,40);
  const other=word('17',290,336,40);
  const v=assessSpatialOcrRows({...args,words:[...original,service,other],
    text:'AGE SERVICE MONTHLY FACTOR\\n58 20 0.9063\\n64 17 0.9813'});
  assert.equal(v.status,'abstain');
  assert.equal(v.reason,'intervening-numeric-column');
  assert.deepEqual(v.pairs,[]);
});
test('non-numeric wording between measured columns does not fabricate a cell',()=>{
  const v=assessSpatialOcrRows({...args,words:[...original,word('NOTE',290,239,55)]});
  assert.equal(v.status,'candidates');
  assert.equal(v.pairs.length,2);
});
