import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseOcrCandidate} from '../src/ocrCandidate.ts';

const primary={text:'AGE FACTOR\n58 0.9063\n64 0.9813',confidence:90};
test('select an independent numeric and row-pair superset without inventing values',()=>{
  const missing={text:'AGE FACTOR\n0.9063\n64 0.9813',confidence:92};
  const observed={text:'AGE FACTOR\n58 0.9063\n64 0.9813',confidence:89};
  assert.deepEqual(chooseOcrCandidate(missing,observed),{
    selected:'sparse',reason:'numeric-superset'
  });
});
test('do not replace a conflicting observed numeric literal',()=>{
  const conflicting={text:'AGE FACTOR\n59 0.9063\n64 0.9813\n70 1.0100',confidence:99};
  assert.equal(chooseOcrCandidate(primary,conflicting).selected,'default');
});
test('do not replace if baseline numeric pair is lost or reassociated',()=>{
  assert.equal(chooseOcrCandidate(primary,{
    text:'AGE FACTOR\n58 0.9813\n64 0.9063\n66 1.0000',confidence:99
  }).selected,'default');
});
test('do not choose low-confidence numeric additions or replacements',()=>{
  assert.equal(chooseOcrCandidate(primary,{
    text:'AGE FACTOR\n58 0.9063\n64 0.9813\n66 1.0000',confidence:81
  }).selected,'default');
});
test('do not prefer extra non-row numeric clutter or a duplicate value',()=>{
  assert.equal(chooseOcrCandidate(primary,{
    text:primary.text+'\nNOTE 2025',confidence:95
  }).selected,'default');
  assert.equal(chooseOcrCandidate(primary,{
    text:primary.text+'\n64 0.9813',confidence:95
  }).selected,'default');
});
test('no numeric evidence and invalid inputs fail closed',()=>{
  assert.equal(chooseOcrCandidate({text:'no table',confidence:50},{
    text:'58 0.9063',confidence:100
  }).selected,'default');
  assert.equal(chooseOcrCandidate(primary,{text:'64 0.9813',confidence:NaN}).selected,'default');
});
