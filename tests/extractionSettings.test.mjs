import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {factualExtractionSettings} from '../src/extractionSettings.ts';

test('factual extraction uses greedy sampling without changing context or output budgets',()=>{
 const chat={context:4096,maxTokens:512,temperature:0.9,topP:0.4};
 const factual=factualExtractionSettings(chat);
 assert.deepEqual(factual,{context:4096,maxTokens:512,temperature:0,topP:1});
 assert.deepEqual(chat,{context:4096,maxTokens:512,temperature:0.9,topP:0.4});
});

test('App uses factual settings for extraction while leaving conversation generation unchanged',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const begin=app.indexOf('  async function onExtract()');
 const end=app.indexOf('  async function onChat(',begin);
 assert.ok(begin>0&&end>begin);
 const extraction=app.slice(begin,end);
 assert.match(extraction,/factualExtractionSettings\(settings\)/);
 assert.match(extraction,/SYSTEM, factualSettings,/);
 const chat=app.slice(end,app.indexOf('  return <div className="shell">',end));
 assert.match(chat,/engine\.current\.generate\(next, SYSTEM, settings,/);
});
