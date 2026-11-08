import {test} from 'node:test';
import assert from 'node:assert/strict';
import {measuredPdfOcrTableSpans} from '../src/pdfOcrWordSpans.ts';
const word=(text,x,y,width=40)=>({text,confidence:89,bbox:{x0:x,y0:y,x1:x+width,y1:y+20}});
const words=[word('AGE',80,100),word('MONTHLY',440,100,80),word('FACTOR',530,100,80),
  word('58',80,200),word('0.9063',440,200,100),word('64',80,300),word('0.9813',440,300,100)];
const args={page:3,text:'AGE MONTHLY FACTOR\n58 0.9063\n64 0.9813',words,imageWidth:1000,
  imageHeight:500,viewportTransform:[2,0,0,-2,0,1000]};
test('PDF regions derive from only actual pixels and one parser-verified page',()=>{
  const r=measuredPdfOcrTableSpans(args);
  assert.equal(r.status,'candidates');
  assert.equal(r.rows.length,2);
  assert.equal(r.spans.length,4);
  assert.deepEqual(r.spans[0].box,{x:40,y:390,width:20,height:10});
  assert.equal(r.rows[0].page,3);
  assert.equal(r.rows[0].precision,'pdf-ocr-word-envelope');
  assert.equal(r.rows[0].status,'unverified-geometry');
  assert.equal(args.text.slice(r.rows[0].age.start,r.rows[0].age.end),'58');
});
test('rotated page maps actual raster rows without inventing page coordinates',()=>{
  const r=measuredPdfOcrTableSpans({...args,viewportTransform:[0,2,2,0,10,20]});
  assert.equal(r.status,'candidates');
  assert.deepEqual(r.spans[0].box,{x:90,y:35,width:10,height:20});
});
test('missing boxes, ambiguous texts and singular viewport abstain on all rows',()=>{
  assert.deepEqual(measuredPdfOcrTableSpans({...args,words:[]}).spans,[]);
  assert.equal(measuredPdfOcrTableSpans({...args,text:args.text+'\n58'}).status,'abstain');
  assert.equal(measuredPdfOcrTableSpans({...args,viewportTransform:[0,0,0,0,0,0]}).status,'abstain');
  assert.equal(measuredPdfOcrTableSpans({...args,viewportTransform:[]}).status,'abstain');
});
