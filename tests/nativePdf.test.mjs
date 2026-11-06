import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePdf } from '../src/pdfText.ts';
import { createSyntheticPdf } from './pdf-fixture.mjs';

test('PDF parser extracts every page and records its actual page number', async () => {
  const source = createSyntheticPdf([
    ['Normal retirement age 65', 'Early retirement 55 and 10 years'],
    ['Normal form: 50 percent joint and survivor']
  ]);
  const parsed = await parsePdf('synthetic.pdf',new Uint8Array(source));
  assert.equal(parsed.provenance.source,'pdf-native');
  assert.equal(parsed.provenance.precision,'page');
  assert.deepEqual(parsed.records.map(r=>r.label),['Page 1','Page 2']);
  assert.equal(parsed.records[0].location.page,1);
  assert.equal(parsed.records[1].location.page,2);
  assert.match(parsed.text,/Page 1:\n/);
  assert.match(parsed.text,/Normal retirement age 65/);
  assert.match(parsed.text,/Page 2:\n/);
  assert.match(parsed.text,/Normal form: 50 percent joint and survivor/);
  assert.equal(parsed.records[0].start,0);
  assert.equal(parsed.records.at(-1).end,parsed.text.length);
  assert.ok(parsed.warnings.some(x=>x.includes('might still be missed')));
});

test('one scanned or empty page blocks partial-document extraction', async () => {
  const file=createSyntheticPdf([['Text on first page'],[]]);
  await assert.rejects(
    parsePdf('mixed.pdf',new Uint8Array(file)),
    /Page 2 has no extractable text.*OCR is required/
  );
});

test('PDF headers, zero byte input, and oversized data fail safely', async () => {
  await assert.rejects(parsePdf('bad.pdf',new Uint8Array([1,2,3,4,5,6,7,8])),/PDF header/);
  await assert.rejects(parsePdf('blank.pdf',new Uint8Array(0)),/nonempty/);
  await assert.rejects(parsePdf('huge.pdf',new Uint8Array(20*1024*1024+1)),/20 MB/);
});
