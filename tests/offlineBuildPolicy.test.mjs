import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertOfflineSecurityPolicy} from '../scripts/offlineBuildPolicy.mjs';

const template=readFileSync(new URL('../index.html',import.meta.url),'utf8')
  .replace('<script type="module" src="/src/main.tsx"></script>','<script>embedded code</script>');
function check(value){return assertOfflineSecurityPolicy(value);}

test('release CSP allows only embedded data/wasm/blob assets and blocks external origins',()=>{
 const policies=check(template);
 assert.deepEqual(policies.get('default-src'),["'none'"]);
 assert.deepEqual(policies.get('connect-src'),['data:','blob:']);
 assert.deepEqual(policies.get('script-src'),["'unsafe-inline'","'wasm-unsafe-eval'",'blob:']);
});

test('remote network access and dynamic JavaScript eval cannot be whitelisted',()=>{
 for(const change of [
  x=>x.replace('connect-src data: blob:','connect-src data: blob: https://example.org'),
  x=>x.replace('worker-src blob:','worker-src https://example.org blob:'),
  x=>x.replace("'wasm-unsafe-eval'","'wasm-unsafe-eval' 'unsafe-eval'"),
  x=>x.replace("default-src 'none'","default-src 'self'"),
  x=>x.replace("object-src 'none'","object-src blob:"),
  x=>x.replace("form-action 'none'","form-action https://example.org")
 ]){
  assert.throws(()=>check(change(template)),/must completely deny|unauthorized source/);
 }
});

test('duplicate, missing or unquoted CSP declarations fail release validation',()=>{
 assert.throws(()=>check(template.replace('</head>',
   '<meta http-equiv="Content-Security-Policy" content="default-src *"></head>')),/Exactly one/);
 assert.throws(()=>check(template.replace('Content-Security-Policy','Other-Policy')),
   /Exactly one/);
 assert.throws(()=>check(template.replace('content="default-src','content=default-src')),
   /quoted content attribute/);
});

test('forbid remote script, preload, style, frame and redirect tags',()=>{
 const tags=[
  '<script src="https://untrusted.invalid/a.js"></script>',
  '<link rel="stylesheet" href="https://untrusted.invalid/a.css">',
  '<link rel="preload" href="https://untrusted.invalid/a.js">',
  '<iframe src="https://untrusted.invalid"></iframe>',
  '<object data="https://untrusted.invalid/x"></object>',
  '<meta http-equiv="refresh" content="0;url=https://untrusted.invalid">'
 ];
 for(const tag of tags){
  assert.throws(()=>check(template.replace('</body>',tag+'</body>')),
    /must not load|must not fetch|must not embed|must not redirect/);
 }
});
