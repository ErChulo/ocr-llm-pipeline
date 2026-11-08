import {test} from 'node:test';
import assert from 'node:assert/strict';
import {viewportRect,inverseViewportRect} from '../src/pdfGeometry.ts';
test('affine PDF viewport converts bottom-left coordinates to top-left',()=>{
 const p=viewportRect([1,0,0,-1,0,792],{x:72,y:700,width:100,height:14});
 assert.deepEqual(p,{x:72,y:78,width:100,height:14});
});
test('rotated PDF viewport uses all four corners',()=>{
 const p=viewportRect([0,1,1,0,10,20],{x:25,y:30,width:50,height:10});
 assert.deepEqual(p,{x:40,y:45,width:10,height:50});
});
test('invalid PDF geometry is rejected',()=>{
 assert.throws(()=>viewportRect([1,0,0],{x:1,y:2,width:3,height:4}),/Invalid/);
 assert.throws(()=>viewportRect([1,0,0,1,0,0],{x:1,y:2,width:0,height:4}),/Invalid/);
});

test('inverse maps measured pixels back to actual PDF space after Y flip',()=>{
  assert.deepEqual(inverseViewportRect([2,0,0,-2,0,100],
    {x:20,y:40,width:30,height:10}),{x:10,y:25,width:15,height:5});
});
test('inverse maps 90 degree rotated measured raster rectangle into PDF space',()=>{
  assert.deepEqual(inverseViewportRect([0,2,2,0,10,20],
    {x:40,y:60,width:20,height:30}),{x:20,y:15,width:15,height:10});
});
test('singular viewport or invalid input never yields invented OCR source boxes',()=>{
  assert.throws(()=>inverseViewportRect([0,0,0,0,0,0],
    {x:20,y:40,width:30,height:10}),/invert/);
  assert.throws(()=>inverseViewportRect([1,0,0,-1,0,100],
    {x:20,y:40,width:0,height:10}),/Invalid/);
});
