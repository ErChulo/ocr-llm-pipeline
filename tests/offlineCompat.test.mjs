import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(new URL('../' + path,import.meta.url),'utf8');
test('offline WASM runtime includes a non-CDN compat worker and wasm', () => {
  const pkg=JSON.parse(source('package.json'));
  assert.equal(pkg.dependencies['@wllama/wllama-compat'],'3.8.1');
  const vite=source('vite.config.ts');
  assert.match(vite,/virtual:wllama-compat-wasm/);
  assert.match(vite,/virtual:wllama-compat-worker/);
  const engine=source('src/engine.ts');
  assert.match(engine,/setCompat\(\{ wasm: compatWasmUrl, worker: \{ code: compatWorkerCode \}/);
  assert.doesNotMatch(engine,/setCompat\(null\)/);
});
