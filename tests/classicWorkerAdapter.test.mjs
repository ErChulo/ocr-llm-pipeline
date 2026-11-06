import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('classic-worker post-build adapter is constrained and verified', () => {
  const build=JSON.parse(src('package.json')).scripts.build;
  assert.match(build,/scripts\/adapt-wllama-worker\.mjs/);
  assert.ok(build.indexOf('adapt-wllama-worker')<build.indexOf('verify-build'));
  const adapter=src('scripts/adapt-wllama-worker.mjs');
  assert.match(adapter,/assert\.equal\(matches\.length, 1/);
  assert.match(adapter,/type:"classic"/);
});
