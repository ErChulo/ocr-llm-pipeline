import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreSpatialCells} from './fixtures/spatialCellMetrics.mjs';
import {assessSpatialOcrRows} from '../src/ocrSpatial.ts';

// Fictional test boxes simulate measured OCR geometry; this unit test does
// NOT validate Tesseract or satisfy the independently measured browser gate.
const word=(text,x,y,width=42,height=27)=>({text,confidence:91,bbox:{
  x0:x,y0:y,x1:x+width,y1:y+height}});
const words=[word('AGE',80,140),word('MONTHLY',440,140,120),
  word('FACTOR',570,140,110),word('58',80,239),word('0.9063',440,239,118),
  word('64',80,336),word('0.9813',440,336,118)];
const actual=assessSpatialOcrRows({page:3,imageWidth:1000,imageHeight:540,
  text:'AGE MONTHLY FACTOR\n58 0.9063\n64 0.9813',words});
// The expected regions are authored independently of the matcher output.
const truth=[{page:3,rows:[
  {age:'58',factor:'0.9063',ageRegion:{x0:0.06,y0:0.39,x1:0.20,y1:0.53},
    factorRegion:{x0:0.40,y0:0.39,x1:0.67,y1:0.53}},
  {age:'64',factor:'0.9813',ageRegion:{x0:0.06,y0:0.57,x1:0.20,y1:0.71},
    factorRegion:{x0:0.40,y0:0.57,x1:0.67,y1:0.71}}
]}];

test('spatial precision and recall require BOTH correct values and independently annotated cell regions',()=>{
  assert.equal(actual.status,'candidates');
  const m=scoreSpatialCells(truth,[{page:3,assessment:actual}]);
  assert.equal(m.correct,2);assert.equal(m.falseMatches,0);
  assert.equal(m.missed,0);assert.equal(m.acceptedPairs,2);
  assert.equal(m.precision,1);assert.equal(m.recall,1);
  assert.equal(m.abstentionRate,0);
});
test('swapped row values and displaced boxes are false matches, not string-only success',()=>{
  const swapped={...actual,pairs:actual.pairs.map((pair,i)=>({
    ...pair,factor:actual.pairs[1-i].factor
  }))};
  const bad=scoreSpatialCells(truth,[{page:3,assessment:swapped}]);
  assert.equal(bad.correct,0);assert.equal(bad.falseMatches,2);
  assert.equal(bad.missed,2);assert.equal(bad.precision,0);
  const displaced={...actual,pairs:actual.pairs.map(p=>({...p,
    age:{...p.age,bbox:{x0:900,y0:239,x1:950,y1:266}}
  }))};
  assert.equal(scoreSpatialCells(truth,[{page:3,assessment:displaced}]).correct,0);
});
test('abstaining never earns perfect precision or fabricated coverage',()=>{
  const m=scoreSpatialCells(truth,[{page:3,assessment:{
    status:'abstain',reason:'unverified-geometry',pairs:[]
  }}]);
  assert.equal(m.precision,null);assert.equal(m.recall,0);
  assert.equal(m.abstainedPages,1);assert.equal(m.abstentionRate,1);
  assert.equal(m.missed,2);
});
test('wrong-page predictions and duplicate candidates are counted as errors',()=>{
  const wrong={...actual,pairs:[{...actual.pairs[0],page:4}]};
  const m=scoreSpatialCells(truth,[{page:3,assessment:wrong}]);
  assert.equal(m.wrongPage,1);assert.equal(m.falseMatches,1);
  const repeat={...actual,pairs:[actual.pairs[0],actual.pairs[0]]};
  const r=scoreSpatialCells(truth,[{page:3,assessment:repeat}]);
  assert.equal(r.correct,1);assert.equal(r.falseMatches,1);
  assert.equal(r.precision,.5);
});
test('malformed or incomplete independent annotations and missing observed pages fail closed',()=>{
  assert.throws(()=>scoreSpatialCells(truth,[]),/Missing measured OCR page/);
  assert.throws(()=>scoreSpatialCells(truth,[{page:3,assessment:actual},
    {page:3,assessment:actual}]),/untrusted page-local/);
  assert.throws(()=>scoreSpatialCells([{page:3,rows:[{age:'58',factor:'0.9063',
    ageRegion:{x0:0,y0:0,x1:2,y1:1},factorRegion:{x0:0,y0:0,x1:1,y1:1}}]}],
    [{page:3,assessment:actual}]),/Invalid independently authored/);
  assert.throws(()=>scoreSpatialCells(truth,[{page:3,assessment:{
    status:'abstain',reason:'unknown',pairs:actual.pairs
  }}]),/Abstained pages may not/);
});

test('center-only match is insufficient when measured word rectangle crosses an annotated cell boundary',()=>{
  const target=actual.pairs[0];
  const straddling={...target,age:{...target.age,bbox:{
    x0:100,y0:239,x1:260,y1:266
  }}};
  // x-center=180 lies within the authored age cell [60,200], but
  // 60/160 pixels of the word are outside that cell. It is NOT a TP.
  const partial={...actual,pairs:[straddling,actual.pairs[1]]};
  const m=scoreSpatialCells(truth,[{page:3,assessment:partial}]);
  assert.equal(m.correct,1);
  assert.equal(m.falseMatches,1);
  assert.equal(m.missed,1);
  assert.equal(m.precision,0.5);
  assert.equal(m.recall,0.5);
  assert.equal(m.minMeasuredWordRegionCoverage,0.95);
});
test('a barely intersecting measured word is rejected even if a familiar numeral matches',()=>{
  const first=actual.pairs[0];
  const almostOutside={...first,factor:{...first.factor,bbox:{
    x0:655,y0:239,x1:757,y1:266
  }}};
  const m=scoreSpatialCells(truth,[{page:3,assessment:{
    ...actual,pairs:[almostOutside,actual.pairs[1]]
  }}]);
  assert.equal(m.falseMatches,1);
  assert.equal(m.correct,1);
});
