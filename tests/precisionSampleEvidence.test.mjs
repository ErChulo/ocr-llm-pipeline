import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zeroErrorPrecisionEvidence} from './fixtures/precisionSampleEvidence.mjs';

test('18/18 on a small fixed cohort is not 99.5% precision evidence at one-sided 95%',()=>{
 const v=zeroErrorPrecisionEvidence({correct:18,accepted:18});
 assert.equal(v.observedPrecision,1);
 assert.ok(Math.abs(v.oneSidedExactLowerIfZeroErrors-0.8466824460427218)<1e-12);
 assert.equal(v.minIndependentZeroErrorTrials,598);
 assert.equal(v.mathematicalSampleConditionMet,false);
 assert.match(v.certification,/not-certified/);
});
test('exact mathematical sample condition needs 598 error-free independent trials, still not certification',()=>{
 const below=zeroErrorPrecisionEvidence({correct:597,accepted:597});
 const at=zeroErrorPrecisionEvidence({correct:598,accepted:598});
 assert.equal(below.mathematicalSampleConditionMet,false);
 assert.equal(at.mathematicalSampleConditionMet,true);
 assert.ok(at.oneSidedExactLowerIfZeroErrors>=.995);
 assert.match(at.certification,/assumption-unverified/);
});
test('observed false matches or no accepted pairs have no invented zero-error lower limit',()=>{
 const wrong=zeroErrorPrecisionEvidence({correct:999,accepted:1000});
 assert.equal(wrong.oneSidedExactLowerIfZeroErrors,null);
 assert.equal(wrong.mathematicalSampleConditionMet,false);
 assert.equal(wrong.observedPrecision,.999);
 const empty=zeroErrorPrecisionEvidence({correct:0,accepted:0});
 assert.equal(empty.observedPrecision,null);
 assert.equal(empty.oneSidedExactLowerIfZeroErrors,null);
 assert.equal(empty.mathematicalSampleConditionMet,false);
});
test('invalid counts and confidence thresholds fail closed',()=>{
 for(const opts of [{correct:19,accepted:18},{correct:-1,accepted:18},
   {correct:18.5,accepted:19},{correct:0,accepted:0,confidence:1},
   {correct:0,accepted:0,targetPrecision:0},
   {correct:0,accepted:0,targetPrecision:NaN}]){
   assert.throws(()=>zeroErrorPrecisionEvidence(opts),/Invalid precision evidence/);
 }
});
