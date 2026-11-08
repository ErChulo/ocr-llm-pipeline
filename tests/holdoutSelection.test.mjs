import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectPhysicalHoldoutCases} from './fixtures/holdoutSelection.mjs';
import {physicalHoldoutCases} from './fixtures/physicalHoldoutCases.mjs';

test('full physical holdout remains eight genuine fictional formats and unchanged',()=>{
 const selected=selectPhysicalHoldoutCases(physicalHoldoutCases);
 assert.equal(selected.length,8);
 assert.notEqual(selected,physicalHoldoutCases);
 assert.deepEqual(selected.map(s=>s.id),physicalHoldoutCases.map(s=>s.id));
});
test('explicit bounded adversarial cohort keeps requested order and formats',()=>{
 const ids='csv-quoted-instruction,docx-survivor-qualifiers';
 const samples=selectPhysicalHoldoutCases(physicalHoldoutCases,ids);
 assert.deepEqual(samples.map(s=>s.id),ids.split(','));
 assert.deepEqual(samples.map(s=>s.format),['csv','docx']);
});
test('invalid or duplicate model fixture selectors fail closed',()=>{
 for(const selector of ['',',','unknown-id',
  'csv-quoted-instruction,csv-quoted-instruction',
  'csv-quoted-instruction,', '  ']){
   assert.throws(()=>selectPhysicalHoldoutCases(physicalHoldoutCases,selector));
 }
 assert.throws(()=>selectPhysicalHoldoutCases([], 'all'));
});
