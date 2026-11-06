import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importText, stripJsoncComments } from '../src/pipeline.ts';

test('JSONC comments do not damage URL strings', () => {
  const data = JSON.parse(stripJsoncComments('{//c\n"url":"https://site.invalid/a"}'));
  assert.equal(data.url, 'https://site.invalid/a');
});
test('OCR JSONC envelope imports document and retains original ID', () => {
  const data = importText('batch.jsonc', '{//comment\n"metadata":{},"documents":[{"id":"42","name":"plan.pdf","extractedText":"NRD age 65","sizeBytes":12}]}');
  assert.equal(data.documents[0].id, '42');
  assert.equal(data.documents[0].text, 'NRD age 65');
  assert.equal(data.documents[0].provenance.precision, 'document');
});
test('text file imports as one document', () => {
  const data = importText('note.txt', 'content');
  assert.equal(data.documents.length, 1);
  assert.equal(data.documents[0].text, 'content');
});
