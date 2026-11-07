import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertGenerationComplete} from '../src/completionGuard.ts';

test('a model stream terminated by max_tokens is never accepted',()=>{
  for(const reason of ['length','max_tokens']){
    assert.throws(()=>assertGenerationComplete(reason),/maximum generation-token limit/);
  }
});

test('normal termination and absent optional status remain compatible',()=>{
  for(const reason of ['stop',null,undefined]){
    assert.doesNotThrow(()=>assertGenerationComplete(reason));
  }
});

test('offline model adapter checks final streaming completion reason',()=>{
  const source=readFileSync(new URL('../src/engine.ts',import.meta.url),'utf8');
  assert.match(source,/choice\?\.finish_reason/);
  assert.match(source,/assertGenerationComplete\(finishReason\)/);
});
