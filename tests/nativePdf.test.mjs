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

test('text-bearing PDF images require explicit visual completeness warning', async()=>{
 const {createScannedPdf}=await import('./pdf-fixture.mjs');
 const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooA//2Q==','base64');
 const parsed=await parsePdf('mixed.pdf',createScannedPdf(Buffer.from(jpeg),360,160,'PLAN HEADER'));
 assert.match(parsed.text,/PLAN HEADER/);
 assert.ok(parsed.warnings.some(msg=>msg.includes('not OCR checked')));
 assert.equal(parsed.records[0].location.kind,'pdf-page');
});

test('PDF.js text coordinates attach parser-derived text-item envelopes, not invented quote boxes', async () => {
  const pdf=createSyntheticPdf([['Plan early age 55','Normal retirement age 65']]);
  const extracted=await parsePdf('synthetic.pdf',new Uint8Array(pdf));
  const page=extracted.records[0];
  assert.ok(Array.isArray(page.textSpans) && page.textSpans.length>=2);
  const age=page.textSpans.find(s=>extracted.text.slice(s.start,s.end).includes('age 65'));
  assert.ok(age,'text span must match actual extracted item content');
  assert.equal(age.precision,'pdf-text-item-envelope');
  assert.ok(Number.isFinite(age.box.x)&&age.box.width>0&&age.box.height>0);
  assert.ok(age.start>=page.start&&age.end<=page.end);
});

test('text-bearing PDF with image content requires source-completeness acknowledgement',async()=>{
 const {createScannedPdf}=await import('./pdf-fixture.mjs');
 const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdSExJSktMTU5PUFFSU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooA//2Q==','base64');
 const parsed=await parsePdf('synthetic.pdf',createScannedPdf(jpeg,360,160,'PLAN HEADER'));
 assert.ok(parsed.reviewIssues?.some(x=>x.id==='pdf:mixed:1'&&x.page===1));
});
