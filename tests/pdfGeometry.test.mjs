import {test} from 'node:test';
import assert from 'node:assert/strict';
import {viewportRect} from '../src/pdfGeometry.ts';
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
