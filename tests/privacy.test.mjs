import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenLocalPrivacy, safePrivacySummary } from '../src/privacy.ts';
test('privacy screen flags possible SSN and email without returning the identifiers',()=>{
 const input='Synthetic only: 123-45-6789 and example@invalid.example';
 const result=screenLocalPrivacy(input);
 assert.equal(result.requiresReview,true);
 assert.equal(result.categories.possible_ssn,1);
 assert.equal(result.categories.email,1);
 assert.equal(JSON.stringify(result).includes('123-45-6789'),false);
 assert.equal(safePrivacySummary(result).includes('example@'),false);
});
test('invalid SSN area and benefit age do not trigger SSN',()=>{
 const s=screenLocalPrivacy('Plan NRA 65, early 55/10; 000-12-3456, 666-12-3456, 900-12-3456');
 assert.equal(s.categories.possible_ssn,undefined);
});
test('valid Luhn card candidates require review',()=>{
 const result=screenLocalPrivacy('Fictional test number: 4111 1111 1111 1111');
 assert.equal(result.categories.payment_card,1);
});
test('ordinary plan prose produces no privacy warning',()=>{
 const s=screenLocalPrivacy('Normal retirement age 65. Early retirement requires age 55 and 10 service years.');
 assert.deepEqual(s.categories,{});
 assert.equal(s.requiresReview,false);
});
