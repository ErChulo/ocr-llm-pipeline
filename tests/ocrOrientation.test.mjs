import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectMeasuredRasterOrientation,restoredOriginalRasterSpatial} from '../src/ocrOrientation.ts';

const word=(text,x,y,width=45,height=25)=>({
  text,confidence:94,bbox:{x0:x,y0:y,x1:x+width,y1:y+height}
});
const text='AGE MONTHLY FACTOR\n58 0.9063\n64 0.9813';
const uprightWords=[
  word('AGE',80,140),word('MONTHLY',440,140,100),word('FACTOR',560,140,90),
  word('58',80,239),word('0.9063',440,239,118),
  word('64',80,336),word('0.9813',440,336,118)
];
const pass=(turn,positive=false)=>({
  turn,width:turn===90||turn===270?1100:550,
  height:turn===90||turn===270?550:1100,
  confidence:positive?96:25,text:positive?text:'unreadable',
  words:positive?structuredClone(uprightWords):[]
});
test('measured quarter-turn recovery accepts one observed orientation and preserves original pixel frame',()=>{
  const inputs=[pass(0),pass(90,true),pass(180),pass(270)];
  const before=structuredClone(inputs);
  const v=selectMeasuredRasterOrientation(550,1100,inputs);
  assert.equal(v.status,'candidate-for-human-review');
  assert.equal(v.selected.turn,90);
  assert.equal(v.assessment.pairs.length,2);
  const original=restoredOriginalRasterSpatial({...v.assessment,
    pairs:v.assessment.pairs.map(p=>({...p,page:7}))},7,550,1100,90);
  assert.equal(original.status,'candidates');
  assert.deepEqual(original.pairs.map(p=>[p.page,p.age.text,p.factor.text]),
    [[7,'58','0.9063'],[7,'64','0.9813']]);
  assert.deepEqual(original.pairs[0].age.bbox,
    {x0:550-(239+25),y0:80,x1:550-239,y1:125});
  assert.equal(original.pairs[0].imageWidth,550);
  assert.equal(original.pairs[0].imageHeight,1100);
  assert.equal(original.pairs[0].precision,'tesseract-inverse-quarter-turn-envelope');
  assert.deepEqual(inputs,before,'source OCR passes must not be mutated');
});
test('competing or invalid measured orientations abstain without selecting best-looking facts',()=>{
  assert.equal(selectMeasuredRasterOrientation(550,1100,
    [pass(0),pass(90,true),pass(180),pass(270,true)]).reason,
    'competing-orientation-candidates');
  assert.equal(selectMeasuredRasterOrientation(550,1100,
    [pass(0),pass(90),pass(180),pass(270)]).status,'abstain');
  assert.equal(selectMeasuredRasterOrientation(550,1100,
    [pass(0),pass(90,true),pass(180)]).status,'abstain');
  const wrong=pass(90,true);wrong.width=999;
  assert.equal(selectMeasuredRasterOrientation(550,1100,
    [pass(0),wrong,pass(180),pass(270)]).reason,
    'inconsistent-measured-page-or-pixel-geometry');
  const forged=pass(90,true);forged.words[3].bbox.x1=4000;
  assert.equal(selectMeasuredRasterOrientation(550,1100,
    [pass(0),forged,pass(180),pass(270)]).reason,
    'inconsistent-measured-page-or-pixel-geometry');
});
test('an intervening measured numeric service column never creates an accepted orientation',()=>{
  const ambiguous=pass(90,true);
  ambiguous.text='AGE SERVICE MONTHLY FACTOR\n58 20 0.9063\n64 30 0.9813';
  ambiguous.words.push(word('20',290,239),word('30',290,336));
  const selection=selectMeasuredRasterOrientation(550,1100,
    [pass(0),ambiguous,pass(180),pass(270)]);
  assert.equal(selection.status,'abstain');
  assert.equal(selection.reason,'no-unique-measured-orientation-candidate');
});
test('bad page or measured geometry cannot be passed as inverse source provenance',()=>{
  const v=selectMeasuredRasterOrientation(550,1100,
    [pass(0),pass(90,true),pass(180),pass(270)]);
  assert.equal(restoredOriginalRasterSpatial(v.assessment,7,550,1100,90).status,'abstain');
  assert.equal(restoredOriginalRasterSpatial(v.assessment,1,550,1100,0).status,'abstain');
  assert.equal(restoredOriginalRasterSpatial(v.assessment,1,550,0,90).status,'abstain');
});
