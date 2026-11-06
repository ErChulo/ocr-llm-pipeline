/**
 * Experimental Wllama 3.8.1 adaptation for opaque file:// origins.
 * Fail the build if pinned code changes. No upstream source is modified.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const path = 'dist/index.html';
let html = readFileSync(path, 'utf8');
const regex = /new Worker\(([A-Za-z_$][\w$]*),\{type:"module"\}\)/g;
const matches = [...html.matchAll(regex)];
assert.equal(matches.length, 1, 'Expected exactly one Wllama blob module-worker constructor; check pinned Wllama.');
html = html.replace(regex, (_whole, urlVariable) => 'new Worker(' + urlVariable + ',{type:"classic"})');
writeFileSync(path, html);
console.log('Adapted one Wllama blob worker to classic type for local file URLs.');
