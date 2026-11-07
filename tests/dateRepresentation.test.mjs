import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unambiguousIsoDate,dateRepresentationAgreement} from '../src/dateRepresentation.ts';

test('source month-name date and model ISO value refer to same unambiguous calendar date',()=>{
 const c=dateRepresentationAgreement('January 1 2025','2025-01-01');
 assert.equal(c.exact,false);
 assert.equal(c.sameCalendarDate,true);
 assert.equal(c.normalizationOnly,true);
 assert.equal(c.expectedIso,'2025-01-01');
 assert.equal(c.actualIso,'2025-01-01');
});
test('Gregorian leap-year rules are enforced without Date.parse',()=>{
 assert.equal(unambiguousIsoDate('February 29 2024'),'2024-02-29');
 assert.equal(unambiguousIsoDate('February 29 2025'),null);
 assert.equal(unambiguousIsoDate('2025-02-29'),null);
 assert.equal(unambiguousIsoDate('1900-02-29'),null);
 assert.equal(unambiguousIsoDate('2000-02-29'),'2000-02-29');
});
test('ambiguous month/day strings are not silently interpreted',()=>{
 for(const value of ['01/02/2025','2/1/25','2025-13-01','Jan 01 2025','2025-01-00','2025-11-31']){
  assert.equal(unambiguousIsoDate(value),null);
 }
 const c=dateRepresentationAgreement('01/02/2025','2025-01-02');
 assert.equal(c.sameCalendarDate,false);
 assert.equal(c.normalizationOnly,false);
});
test('two different valid dates never compare equal',()=>{
 const c=dateRepresentationAgreement('January 1 2025','2025-01-02');
 assert.equal(c.sameCalendarDate,false);
});
