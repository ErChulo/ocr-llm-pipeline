import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('evidence checkbox captures its checked state before React updater executes',()=>{
 const src=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(src,/const checked=e\.currentTarget\.checked;\s*setEvidenceConfirmed\(current=>/);
 assert.doesNotMatch(src,/setEvidenceConfirmed\(current=>\(\{\.\.\.current,\[check\.path\]:e\.currentTarget\.checked/);
});
