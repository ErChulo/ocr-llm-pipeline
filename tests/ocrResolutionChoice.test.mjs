import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasMalformedNumericTableRow,preferFallbackForMalformedRows}
  from '../src/ocrResolutionChoice.ts';

const wrong={text:'FICTIONAL PLAN IOTA\nAGE MONTHLY FACTOR\n52 0.7124\n70 1.11.79',
  confidence:91};
const good={text:'FICTIONAL PLAN IOTA\nAGE MONTHLY FACTOR\n52 0.7124\n70 1.1179',
  confidence:85};
test('detect multiple-decimal numeric row without inventing a correction',()=>{
  assert.equal(hasMalformedNumericTableRow(wrong.text),true);
  assert.equal(hasMalformedNumericTableRow(good.text),false);
  assert.equal(hasMalformedNumericTableRow('Version 1.11.79'),false);
});
test('choose separately recognized clean transcription only for a malformed row',()=>{
  assert.equal(preferFallbackForMalformedRows(wrong,good),true);
});
test('do not override already well-formed OCR or drop observed rows',()=>{
  assert.equal(preferFallbackForMalformedRows(good,wrong),false);
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:'70 1.1179',confidence:96
  }),false);
});
test('wrong age, duplicate age and changed stable numeric pair fail closed',()=>{
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:'52 0.7124\n71 1.1179',confidence:99
  }),false);
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:'52 0.7124\n70 1.1179\n70 1.0199',confidence:99
  }),false);
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:'52 0.7123\n70 1.1179',confidence:99
  }),false);
});
test('retain primary OCR if alternate is invalid, uncertain or still malformed',()=>{
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:'52 0.7124\n70 1.11.79',confidence:95
  }),false);
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:good.text,confidence:70
  }),false);
  assert.equal(preferFallbackForMalformedRows(wrong,{
    text:'52 0.7124\n70 1.1179',confidence:NaN
  }),false);
});

test('real PDF rendering age-glyph merge is detectable without invented correction',async()=>{
  const {hasImplausibleAgeTableRow,preferFallbackForImplausibleAges}=
    await import('../src/ocrResolutionChoice.ts');
  const first={text:'FICTIONAL TABLE\nAGE MONTHLY FACTOR\n585 0.8750\n65 1.0000',confidence:95};
  const lower={text:'FICTIONAL TABLE\nAGE MONTHLY FACTOR\n55 0.8750\n65 1.0000',confidence:93};
  assert.equal(hasImplausibleAgeTableRow(first.text),true);
  assert.equal(hasImplausibleAgeTableRow(lower.text),false);
  assert.equal(preferFallbackForImplausibleAges(first,lower),true);
  assert.equal(preferFallbackForImplausibleAges(lower,first),false);
});
test('bounded age reread abstains on changes to stable factors, missing rows or duplicate factors',async()=>{
  const {preferFallbackForImplausibleAges,hasImplausibleAgeTableRow}=
    await import('../src/ocrResolutionChoice.ts');
  const first={text:'AGE MONTHLY FACTOR\n585 0.8750\n65 1.0000',confidence:95};
  for(const text of [
    'AGE MONTHLY FACTOR\n55 0.8750\n65 1.0001',
    'AGE MONTHLY FACTOR\n55 0.8750',
    'AGE MONTHLY FACTOR\n55 0.8750\n55 1.0000',
    'AGE MONTHLY FACTOR\n585 0.8750\n65 1.0000',
    'AGE MONTHLY FACTOR\n55 1.0000\n65 0.8750',
    'AGE MONTHLY FACTOR\n55 0.8750\n65 1.0000\n60 1.0000',
    '55 0.8750\n65 1.0000'
  ]) assert.equal(preferFallbackForImplausibleAges(first,{text,confidence:95}),false,text);
  assert.equal(preferFallbackForImplausibleAges(first,{
    text:'AGE MONTHLY FACTOR\n55 0.8750\n65 1.0000',confidence:40
  }),false);
  assert.equal(hasImplausibleAgeTableRow('AGE MONTHLY FACTOR\n125 1.0000'),false);
  assert.equal(hasImplausibleAgeTableRow('AGE MONTHLY FACTOR\n126 1.0000'),true);
  assert.equal(hasImplausibleAgeTableRow('585 0.8750\n65 1.0000'),false);
});
