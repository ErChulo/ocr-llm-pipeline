import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectMeasuredOrientationCandidates as decide} from './fixtures/orientationCandidateSelection.mjs';

const frame=(turn,positive=false,confidence=95)=>({
 turn,page:3,confidence,assessment:positive?{
  status:'candidates',reason:'measured-only',pairs:[0,1].map(i=>({
   page:3,precision:'tesseract-raster-word-envelope',
   imageWidth:turn===90||turn===270?1100:550,
   imageHeight:turn===90||turn===270?550:1100,
   age:{text:'55',bbox:{x0:70,y0:210+i*70,x1:110,y1:240+i*70}},
   factor:{text:'0.8750',bbox:{x0:440,y0:210+i*70,x1:550,y1:240+i*70}}
  }))
 }:{status:'abstain',reason:'missing-headers',pairs:[]}
});
test('only one geometrically valid high-confidence measured quarter-turn is proposed for review',()=>{
 const cases=[frame(0),frame(90,true),frame(180),frame(270)];
 const clone=structuredClone(cases);
 const result=decide(550,1100,3,cases);
 assert.equal(result.status,'candidate-for-human-review');
 assert.equal(result.selectedTurn,90);
 assert.equal(result.pairs,2);
 assert.deepEqual(cases,clone,'orientation selector cannot rewrite source evidence');
});
test('competing apparent table orientations must abstain instead of choosing by confidence',()=>{
 const v=decide(550,1100,3,[frame(0),frame(90,true,98),frame(180,true,95),frame(270)]);
 assert.equal(v.status,'abstain');
 assert.equal(v.reason,'competing-orientation-candidates');
 assert.equal(v.selectedTurn,null);
});
test('no readable, low-confidence, or incomplete raster suite abstains',()=>{
 const base=[frame(0),frame(90),frame(180),frame(270)];
 assert.equal(decide(550,1100,3,base).status,'abstain');
 assert.equal(decide(550,1100,3,[frame(0),frame(90,true,74),frame(180),frame(270)]).status,'abstain');
 assert.equal(decide(550,1100,3,base.slice(1)).status,'abstain');
 assert.equal(decide(550,1100,3,[frame(0),frame(90),frame(90),frame(270)]).status,'abstain');
});
test('fabricated page, impossible source boxes or wrong corrected raster sizes cannot be selected',()=>{
 const originals=[frame(0),frame(90,true),frame(180),frame(270)];
 for(const mutation of [
  c=>{c[1].page=4;},
  c=>{c[1].assessment.pairs[0].page=4;},
  c=>{c[1].assessment.pairs[0].imageWidth=550;},
  c=>{c[1].assessment.pairs[0].age.bbox.x1=3000;},
  c=>{c[1].confidence=NaN;}
 ]){
  const cases=structuredClone(originals);mutation(cases);
  const v=decide(550,1100,3,cases);
  assert.equal(v.status,'abstain');
  assert.equal(v.reason,'inconsistent-measured-page-or-pixel-geometry');
 }
 assert.equal(decide(-1,1100,3,originals).status,'abstain');
});
