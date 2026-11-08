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
