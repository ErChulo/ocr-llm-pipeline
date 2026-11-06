import { test } from 'node:test';
import assert from 'node:assert/strict';
import {BENCHMARK_SOURCE,benchmarkPrompt,scoreBenchmark} from '../src/modelBenchmark.ts';
test('synthetic benchmark contains no identifiable real person',()=>{
 assert.match(BENCHMARK_SOURCE,/FICTIONAL/);
 assert.match(benchmarkPrompt(),/JSON Schema/);
});
test('benchmark recognizes perfect structured extraction',()=>{
 const score=scoreBenchmark({normal_age:'65',early_age:'55',service_required:'10',
 normal_form:'50% joint and survivor annuity'});
 assert.equal(score.score,100);
 assert.equal(score.complete,true);
});
test('missing or invented values fail benchmark',()=>{
 const score=scoreBenchmark({normal_age:'65',early_age:'60',service_required:'10',
 normal_form:'50% joint and survivor annuity',fabricated:'true'});
 assert.equal(score.score,75);
 assert.deepEqual(score.incorrect,['early_age']);
 assert.deepEqual(score.unsupported,['fabricated']);
 assert.equal(score.complete,false);
});
