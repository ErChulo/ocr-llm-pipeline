/**
 * Independent, human-authored ground truth for the geometry-only association
 * layer. These rectangles are intentionally explicit, not inferred from the
 * matcher or OCR transcript. They are synthetic measured-word fixtures, NOT
 * independently OCR'd raster scans or evidence of real-page extraction accuracy.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessSpatialOcrRows} from '../src/ocrSpatial.ts';

const word=(text,x,y,width=45,height=26)=>({
  text,confidence:91,bbox:{x0:x,y0:y,x1:x+width,y1:y+height}
});
const words=[
  word('AGE',80,140,60),word('MONTHLY',420,140,115),word('FACTOR',550,140,100),
  word('58',80,230,40),word('0.9063',420,230,100),
  word('64',80,330,40),word('0.9813',420,330,100)
];
const transcript='AGE MONTHLY FACTOR\n58 0.9063\n64 0.9813';
const gold=[
  {age:'58',factor:'0.9063',page:4,region:{x0:80,y0:230,x1:520,y1:256}},
  {age:'64',factor:'0.9813',page:4,region:{x0:80,y0:330,x1:520,y1:356}}
];
const numericSeparators=['1,200','$1,200','(15)','12/13','1e3','−18','20%'];
const cases=[
  {name:'clear age/factor cells',words,text:transcript,expected:gold,abstain:false},
  {name:'reordered OCR transcript',words:[...words].reverse(),
    text:'64 0.9813\nAGE MONTHLY FACTOR\n58 0.9063',expected:gold,abstain:false},
  {name:'missing age in OCR transcript',words,
    text:transcript.replace('58','5B'),expected:gold,abstain:true},
  ...numericSeparators.map((value)=>({
    name:'numeric third column '+value,
    words:[...words,word(value,290,230,65)],
    text:'AGE SERVICE MONTHLY FACTOR\n58 '+value+' 0.9063\n64 0.9813',
    expected:[],abstain:true
  }))
];
const key=(age,factor)=>JSON.stringify([age,factor]);
function score(){
  const stats={truePositive:0,falsePositive:0,falseNegative:0,abstained:0,cases:cases.length};
  for(const scenario of cases){
    const result=assessSpatialOcrRows({
      page:4,imageWidth:1000,imageHeight:600,
      text:scenario.text,words:scenario.words
    });
    assert.equal(result.status,scenario.abstain?'abstain':'candidates',scenario.name);
    if(result.status==='abstain')stats.abstained++;
    const expected=new Map(scenario.expected.map(x=>[key(x.age,x.factor),x]));
    const observed=new Set();
    for(const pair of result.pairs){
      const id=key(pair.age.text,pair.factor.text);
      assert.equal(observed.has(id),false,'duplicate spatial candidate in '+scenario.name);
      observed.add(id);
      const annotation=expected.get(id);
      if(annotation){
        stats.truePositive++;
        assert.equal(pair.page,annotation.page,scenario.name);
        assert.deepEqual(pair.region,annotation.region,scenario.name);
        assert.equal(pair.precision,'tesseract-raster-word-envelope');
        assert.equal(scenario.text.slice(pair.transcriptRanges.age.start,pair.transcriptRanges.age.end),pair.age.text);
        assert.equal(scenario.text.slice(pair.transcriptRanges.factor.start,pair.transcriptRanges.factor.end),pair.factor.text);
      }else stats.falsePositive++;
    }
    for(const id of expected.keys())if(!observed.has(id))stats.falseNegative++;
  }
  return {...stats,
    precision:stats.truePositive/(stats.truePositive+stats.falsePositive||1),
    recall:stats.truePositive/(stats.truePositive+stats.falseNegative||1),
    falseMatchRate:stats.falsePositive/(stats.truePositive+stats.falsePositive||1),
    abstentionRate:stats.abstained/stats.cases
  };
}
test('measured-word association against independently annotated fictional cell regions',()=>{
  const metrics=score();
  assert.deepEqual(metrics,{
    truePositive:4,falsePositive:0,falseNegative:2,abstained:8,cases:10,
    precision:1,recall:2/3,falseMatchRate:0,abstentionRate:0.8
  });
});
test('a salary, percentage, fraction, or accounting column prevents unproved cell attribution',()=>{
  for(const v of numericSeparators){
    const input=cases.find(x=>x.name==='numeric third column '+v);
    assert.ok(input);
    const result=assessSpatialOcrRows({
      page:4,imageWidth:1000,imageHeight:600,
      text:input.text,words:input.words
    });
    assert.equal(result.reason,'intervening-numeric-column',v);
    assert.deepEqual(result.pairs,[],v);
  }
});
