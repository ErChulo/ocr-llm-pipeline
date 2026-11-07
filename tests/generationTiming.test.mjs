import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GenerationMeter,formatGenerationTiming} from '../src/generationTiming.ts';

test('generation timing keeps first output latency separate from total time',()=>{
 const m=new GenerationMeter(1000);
 m.noteText('',1200);
 m.noteText('abc',2400);
 m.noteText('𝛽',2700);
 const result=m.result(3000);
 assert.deepEqual(result,{
  elapsedMs:2000,firstTextMs:1400,emittedCharacters:5,charactersPerSecond:2.5
 });
 assert.match(formatGenerationTiming(result),/1\.4 s until first text/);
 assert.match(formatGenerationTiming(result),/2\.5 characters\/s end-to-end/);
});

test('no output reports zero throughput and no false first-token claim',()=>{
 const m=new GenerationMeter(50);
 assert.deepEqual(m.result(50),{
  elapsedMs:0,firstTextMs:null,emittedCharacters:0,charactersPerSecond:0
 });
 assert.match(formatGenerationTiming(m.result(150)),/no text received/);
});
