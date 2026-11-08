import {test} from 'node:test';
import assert from 'node:assert/strict';
import {measuredTesseractWords} from '../src/ocrWords.ts';
const word=(text,x0=10,y0=20)=>({text,confidence:87,bbox:{x0,y0,x1:x0+20,y1:y0+10}});
const blocks=words=>[{paragraphs:[{lines:[{words}]}]}];
test('preserves measured OCR pixel words without interpreting confused digits',()=>{
  assert.deepEqual(measuredTesseractWords(blocks([word(' o8 '),word('0.9063',50,20)]),100,100),[
    {text:'o8',confidence:87,bbox:{x0:10,y0:20,x1:30,y1:30}},
    {text:'0.9063',confidence:87,bbox:{x0:50,y0:20,x1:70,y1:30}}
  ]);
});
test('absent or invalid structure cannot produce guessed positions',()=>{
  assert.deepEqual(measuredTesseractWords(null,100,100),[]);
  assert.deepEqual(measuredTesseractWords([{paragraphs:[{lines:null}]}],100,100),[]);
  assert.deepEqual(measuredTesseractWords(blocks([word('58',95,20)]),100,100),[]);
  assert.deepEqual(measuredTesseractWords(blocks([{...word('58'),confidence:NaN}]),100,100),[]);
});
test('malformed or excessive nested results fail closed',()=>{
  assert.deepEqual(measuredTesseractWords(new Array(1025).fill(blocks([word('58')])[0]),100,100),[]);
  assert.deepEqual(measuredTesseractWords(blocks(new Array(1025).fill(word('58'))),100,100),[]);
  assert.deepEqual(measuredTesseractWords(blocks([word('58')]),0,100),[]);
});
