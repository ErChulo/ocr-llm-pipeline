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
    text:'AGE SERVICE MONTHLY FACTOR\n58 20 0.9063\n64 17 0.9813'});
  assert.equal(v.status,'abstain');
  assert.equal(v.reason,'intervening-numeric-column');
  assert.deepEqual(v.pairs,[]);
});
test('non-numeric wording between measured columns does not fabricate a cell',()=>{
  const v=assessSpatialOcrRows({...args,words:[...original,word('NOTE',290,239,55)]});
  assert.equal(v.status,'candidates');
  assert.equal(v.pairs.length,2);
});

test('partially overlapping numeric cells abstain instead of hiding third-column ambiguity',()=>{
  for(const [x,width] of [[110,45],[420,35],[540,36]]){
    const v=assessSpatialOcrRows({...args,
      words:[...original,word('17',x,239,width)],
      text:args.text+'\n17'});
    assert.equal(v.status,'abstain','numeric box x='+x+' must never authorize a pair');
    assert.equal(v.reason,'intervening-numeric-column');
    assert.deepEqual(v.pairs,[]);
  }
});
test('numeric notes fully outside observed row corridor do not invent ambiguity',()=>{
  for(const [x,width] of [[10,30],[700,38]]){
    const v=assessSpatialOcrRows({...args,
      words:[...original,word('17',x,239,width)],
      text:args.text+'\n17'});
    assert.equal(v.status,'candidates','outside numeric box at x='+x);
    assert.equal(v.pairs.length,2);
  }
});

test('actual fictional skewed header rectangles permit collinear AGE-MONTHLY-FACTOR rows',()=>{
 const variants=[
  [word('AGE',76,138,67,23),word('MONTHLY',449,146,153,25),
   word('FACTOR',614,149,127,25),[238,245],[336,343]],
  [word('AGE',71,157,67,24),word('MONTHLY',444,147,153,25),
   word('FACTOR',608,144,129,25),[245,238],[343,336]]
 ];
 for(const [age,month,factor,first,second] of variants){
  const observed=[age,month,factor,
   word('58',80,first[0],42,27),word('0.9063',450,first[1],118,27),
   word('64',80,second[0],42,27),word('0.9813',450,second[1],118,27)];
  const v=assessSpatialOcrRows({...args,words:observed});
  assert.equal(v.status,'candidates','three actually measured sloped headers must align');
  assert.deepEqual(v.pairs.map(p=>[p.age.text,p.factor.text]),
   [['58','0.9063'],['64','0.9813']]);
 }
});
test('skew tolerance requires unique collinear measured MONTHLY corroboration',()=>{
 const a=word('AGE',76,138,67,23),
  m=word('MONTHLY',449,146,153,25),f=word('FACTOR',614,149,127,25);
 const data=original.slice(3);
 const input=[a,m,f,...data];
 assert.equal(assessSpatialOcrRows({...args,words:input}).status,'candidates');
 const tests=[
  [a,f,...data], // no middle header: cannot justify nonparallel alignment
  [a,word('MONTHLY',449,139,153,25),f,...data], // off collinear line
  [word('AGE',76,122,67,23),m,f,...data], // >2-degree header slope
  [a,m,word('MONTHLY',440,147,153,25),f,...data] // duplicated header
 ];
 for(const words of tests){
  const v=assessSpatialOcrRows({...args,words});
  assert.equal(v.status,'abstain','unsafe header geometry must not be normalized');
  assert.deepEqual(v.pairs,[]);
 }
});
test('measured skewed headers never bypass intervening numeric-column abstention',()=>{
 const words=[
  word('AGE',76,138,67,23),word('MONTHLY',449,146,153,25),
  word('FACTOR',614,149,127,25),
  word('58',80,238,42,27),word('0.9063',450,245,118,27),
  word('64',80,336,42,27),word('0.9813',450,343,118,27),
  word('20',290,241,42,27),word('30',290,339,42,27)
 ];
 const v=assessSpatialOcrRows({...args,words,
  text:'AGE SERVICE MONTHLY FACTOR\n58 20 0.9063\n64 30 0.9813'});
 assert.equal(v.status,'abstain');
 assert.equal(v.reason,'intervening-numeric-column');
});

test('leading-decimal intervening cells fail closed rather than yielding false age/factor provenance',()=>{
 for(const token of ['.75','-.75','+.75','$.75','(.75)','−.75','.75%','.75e2']){
  const blocker=word(token,290,239,62);
  const v=assessSpatialOcrRows({...args,words:[...original,blocker],
    text:args.text+'\\n'+token});
  assert.equal(v.status,'abstain',token);
  assert.equal(v.reason,'intervening-numeric-column',token);
  assert.deepEqual(v.pairs,[],token);
 }
});

test('measured headers with literal trailing colons recover rows without changing pixel provenance',()=>{
  const altered=original.map(w=>['AGE','MONTHLY','FACTOR'].includes(w.text)?{...w,text:w.text+':'}:w);
  const result=assessSpatialOcrRows({...args,words:altered,
    text:'AGE: MONTHLY: FACTOR:\n58 0.9063\n64 0.9813'});
  assert.equal(result.status,'candidates');
  assert.deepEqual(result.pairs.map(p=>[p.age.text,p.factor.text]),
    [['58','0.9063'],['64','0.9813']]);
  assert.deepEqual(result.pairs[0].age.bbox,original[3].bbox);
  assert.deepEqual(result.pairs[0].factor.bbox,original[4].bbox);
});
test('punctuated headers preserve ambiguity checks and reject fuzzy OCR guesses',()=>{
  const punctuated=original.map(w=>['AGE','MONTHLY','FACTOR'].includes(w.text)?{...w,text:w.text+':'}:w);
  const numeric=word('20',290,239,40);
  const blocked=assessSpatialOcrRows({...args,words:[...punctuated,numeric],
    text:'AGE: SERVICE MONTHLY: FACTOR:\n58 20 0.9063\n64 0.9813'});
  assert.equal(blocked.status,'abstain');
  assert.equal(blocked.reason,'intervening-numeric-column');
  for(const token of ['AGE::','A6E','FACTOR.','FACT0R']){
    const base=punctuated.map(w=>w.text==='AGE:'?{...w,text:token}:w);
    assert.equal(assessSpatialOcrRows({...args,words:base}).status,'abstain');
  }
  const duplicate=assessSpatialOcrRows({...args,
    words:[...punctuated,word('AGE',75,140)]});
  assert.equal(duplicate.status,'abstain');
});
