import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  splitWholeText, textChunkBudget, collectChunkCandidates,
  resolveCandidateValues, extractWholeDocument
} from '../src/chunkExtraction.ts';

const source = text => ({
  id: 'synthetic-no-pii', name: 'synthetic.txt', text,
  mimeType: 'text/plain', sizeBytes: text.length,
  provenance: { source: 'local-text', precision: 'document', fileName: 'synthetic.txt' }
});

test('long source is covered exactly once, including line breaks and emoji', () => {
  const text = Array.from({length: 35}, (_,i) => 'Para ' + i + ' ☑️.\n\n').join('');
  const chunks = splitWholeText(text, 215);
  assert.ok(chunks.length > 1);
  assert.equal(chunks[0].start, 0);
  assert.equal(chunks.at(-1).end, text.length);
  assert.equal(chunks.map(c => c.text).join(''), text);
  for (let i=1;i<chunks.length;i++) {
    assert.equal(chunks[i].start, chunks[i-1].end);
    assert.equal(chunks[i].chunk,i+1);
  }
});

test('empty text, invalid budget and excessive input fail closed', () => {
  assert.throws(() => splitWholeText(' \n ', 200), /no text/i);
  assert.throws(() => splitWholeText('a'.repeat(4000), 200, 2), /too many/i);
  assert.throws(() => textChunkBudget(1024,{type:'object', description:'x'.repeat(3000)}), /Not enough model context/i);
});

test('null values do not compete with facts in another section', () => {
  const doc=source('A'.repeat(520));
  const chunks=splitWholeText(doc.text,260);
  const audit=collectChunkCandidates(doc,chunks,[
    {retirement_age:null, count:0, eligibility:false},
    {retirement_age:65,count:0,eligibility:false}
  ]);
  assert.equal(audit.conflicts.length,0);
  const result=resolveCandidateValues(audit);
  assert.deepEqual(result.data,{count:0,eligibility:false,retirement_age:65});
});

test('conflicts require explicit review selection and store source sections', () => {
  const doc=source('A'.repeat(520));
  const chunks=splitWholeText(doc.text,260);
  const audit=collectChunkCandidates(doc,chunks,[
    { benefit: { age: 65, rate: '6%' }, forms: ['SLA'] },
    { benefit: { age: 62, rate: '6%' }, forms: ['SLA'] }
  ]);
  assert.deepEqual(audit.conflicts.map(x=>x.path),['/benefit/age']);
  assert.deepEqual(resolveCandidateValues(audit).unresolved,['/benefit/age']);
  assert.equal(audit.candidates['/benefit/rate'][0].spans.length,2);
  const chosen=resolveCandidateValues(audit,{'/benefit/age':1});
  assert.deepEqual(chosen.unresolved,[]);
  assert.deepEqual(chosen.data,{benefit:{age:62,rate:'6%'},forms:['SLA']});
  assert.throws(()=>resolveCandidateValues(audit,{'/benefit/age':99}),/Invalid review choice/i);
});

test('malicious JSON object key cannot pollute the object prototype', () => {
  const doc=source('A'.repeat(260));
  const chunks=splitWholeText(doc.text,260);
  const payload=JSON.parse('{"__proto__":{"isAdmin":true},"regular":"yes"}');
  const audit=collectChunkCandidates(doc,chunks,[payload]);
  const merged=resolveCandidateValues(audit);
  assert.equal(Object.prototype.isAdmin,undefined);
  assert.equal(merged.data.__proto__.isAdmin,true);
  assert.equal(JSON.stringify(merged.data).includes('"__proto__"'),true);
});

test('partial model outputs and changed chunk offsets cannot be exported', () => {
  const doc=source('A'.repeat(520));
  const chunks=splitWholeText(doc.text,260);
  assert.throws(()=>collectChunkCandidates(doc,chunks,[{a:1}]),/Incomplete section coverage/i);
  assert.throws(()=>collectChunkCandidates(doc,[{...chunks[0],end:200},chunks[1]],[{a:1},{b:2}]),/coverage/i);
});

test('synthetic local inference stub completes every section without a real GGUF', async () => {
  const doc=source('A'.repeat(5000));
  const progress=[];
  const result=await extractWholeDocument(
    doc, {type:'object', properties:{flag:{type:'boolean'}}}, 2048,
    async (_prompt,chunk,total) => JSON.stringify({flag:chunk.chunk===total}),
    (n,total)=>progress.push([n,total])
  );
  assert.ok(result.chunks.length > 1);
  assert.equal(result.chunks.at(-1).end,doc.text.length);
  assert.equal(progress.length,result.chunks.length);
  assert.deepEqual(result.conflicts.map(x=>x.path),['/flag']);
  assert.equal(resolveCandidateValues(result).unresolved.length,1);
});

test('invalid model output aborts without a partial audit', async () => {
  const doc=source('A'.repeat(5000));
  let calls=0;
  await assert.rejects(
    extractWholeDocument(doc,{type:'object'},2048,
      async () => {calls++;return calls===2?'invalid json':'{"age":65}';}
    ), /Section 2 returned invalid JSON/
  );
  assert.equal(calls,2);
});

test('section budgeting reserves context for output', () => {
  const schema={type:'object',properties:{age:{type:'integer'}}};
  const smallOutput=textChunkBudget(2048,schema,128);
  const largeOutput=textChunkBudget(2048,schema,1024);
  assert.ok(smallOutput>largeOutput);
  assert.throws(()=>textChunkBudget(1024,schema,1024),/Output tokens/);
});
test('JSON mode is used for source extraction, not normal chat', () => {
  const engineCode = readFileSync(new URL('../src/engine.ts',import.meta.url),'utf8');
  const appCode = readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(engineCode,/response_format: jsonMode/);
  assert.match(appCode,/setRawExtraction\(produced\); \}, true/);
});
