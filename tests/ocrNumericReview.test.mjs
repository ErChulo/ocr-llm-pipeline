import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countAmbiguousOcrNumericTokens,MAX_NUMERIC_OCR_AMBIGUITIES}
  from '../src/ocrNumericReview.ts';

test('suspicious fictional OCR numerals are flagged without inferring their values',()=>{
 const original='AGE FACTOR\nS7 0.8O00\n5B O.8750\n65 1.0000\n';
 assert.equal(countAmbiguousOcrNumericTokens(original),4);
 assert.equal(original.includes('S7'),true,'the source remains untouched');
});
test('correct numeric literals and unrelated words have no ambiguity warning',()=>{
 for(const source of [
  'AGE 57 58 65 FACTOR 0.8750 1.0000',
  'FICTIONAL PLAN QPSA 65 AGE NORMAL BENEFIT',
  '2026-11-08 10,000 2.50%\nA pension calculation',
  'Fictional pension terms with no amounts'
 ]){
   assert.equal(countAmbiguousOcrNumericTokens(source),0,source);
 }
});
test('numeric ambiguity is count-only, cannot leak matched source text and is capped',()=>{
 const malicious='5B '.repeat(10000);
 assert.equal(countAmbiguousOcrNumericTokens(malicious),MAX_NUMERIC_OCR_AMBIGUITIES);
 assert.equal(countAmbiguousOcrNumericTokens(''),0);
 assert.equal(countAmbiguousOcrNumericTokens(null),0);
});
test('ambiguous tokens inside unrelated alphanumeric identifiers are not extracted',()=>{
 assert.equal(countAmbiguousOcrNumericTokens('CASEX5B23 E55SZZX A0B23CODE'),0);
 assert.equal(countAmbiguousOcrNumericTokens('S7 0.9O00 B2'),3,
   'short OCR-like tokens are only a warning and may contain false positives');
});
