import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('local model test is optional, user-triggered, and does not claim JSON accuracy', () => {
  const src=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(src,/async function onTestModel\(\)/);
  assert.match(src,/disabled=\{busy\} onClick=\{\(\) => void onTestModel\(\)\}/);
  assert.match(src,/if \(!output\.trim\(\)\)/);
  assert.match(src,/Document extraction still needs source review/);
  assert.match(src,/setModelName\(''\)/);
});
