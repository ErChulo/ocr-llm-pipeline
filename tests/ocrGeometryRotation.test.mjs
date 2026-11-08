import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reorientedBoxToOriginalPixels} from '../src/ocrGeometryRotation.ts';
const x={x0:100,y0:30,x1:220,y1:75};
test('original measured OCR pixel rectangles map by exact inverse 0/90/180/270 degree rotation',()=>{
 assert.deepEqual(reorientedBoxToOriginalPixels(x,550,1100,0),x);
 assert.deepEqual(reorientedBoxToOriginalPixels(x,550,1100,90),{x0:475,y0:100,x1:520,y1:220});
 assert.deepEqual(reorientedBoxToOriginalPixels(x,550,1100,180),{x0:330,y0:1025,x1:450,y1:1070});
 assert.deepEqual(reorientedBoxToOriginalPixels(x,550,1100,270),{x0:30,y0:880,x1:75,y1:1000});
});
test('quarter-turn round trip does not change source pixel envelope',()=>{
 const source={x0:291,y0:65,x1:344,y1:145};
 // Forward 90° counterclockwise unrotation yields x = source.y,
 // y = originalWidth - source.x, with original frame 550×1100.
 const corrected={x0:source.y0,y0:550-source.x1,
   x1:source.y1,y1:550-source.x0};
 assert.deepEqual(reorientedBoxToOriginalPixels(corrected,550,1100,90),source);
});
test('fail closed on unknown orientation, invalid pixels and out-of-bounds geometry',()=>{
 for(const bad of [null,{...x,x0:-1},{...x,x1:Infinity},{...x,x1:4000},{...x,y0:80}]){
  assert.throws(()=>reorientedBoxToOriginalPixels(bad,550,1100,90));
 }
 for(const a of [23,NaN,-1,360]){
  assert.throws(()=>reorientedBoxToOriginalPixels(x,550,1100,a));
 }
 assert.throws(()=>reorientedBoxToOriginalPixels(x,0,1100,90));
 assert.throws(()=>reorientedBoxToOriginalPixels(x,550,1100.5,90));
});
