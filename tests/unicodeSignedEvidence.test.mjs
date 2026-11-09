import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditLiteralEvidence,evidenceSelectionsAnchoredToDocument}
  from '../src/evidence.ts';
const doc=text=>({
  id:'fictional-evidence',name:'fictional.txt',text,
  provenance:{source:'local-text',precision:'document',fileName:'fictional.txt'}
});
const signs=['−','–','—','‒','‑','‐','﹣','－','＋','+','-'];
const invisible=['\u200B','\u200C','\u200D','\u2060','\uFEFF'];
test('Unicode minus and plus lookalikes cannot fund unsigned actuarial amounts',()=>{
 for(const sign of signs){
  for(const literal of ['$500.00','€600.00','£700.00','12.50%',65,'65']){
   for(const divider of ['',...invisible]){
    const source=doc('FICTIONAL SOURCE: '+sign+divider+literal+'.');
    const result=auditLiteralEvidence(source,{amount:literal});
    assert.equal(result[0].status,'missing',
      JSON.stringify({sign,divider,literal}));
    assert.deepEqual(result[0].matches,[]);
   }
  }
 }
});
test('invisible-separated accounting negatives cannot fund positive currency or percentage citations',()=>{
 for(const value of ['$500.00','€600.00','£700.00','12.50%',65]){
  for(const gap of ['',...invisible]){
   for(const prefix of ['(', '('+gap]){
    const text='FICTIONAL LIABILITY: '+prefix+value+gap+').';
    const result=auditLiteralEvidence(doc(text),{value});
    assert.equal(result[0].status,'missing',text);
   }
  }
 }
});
test('one authentic unsigned literal stays selectable despite confusable signed copies',()=>{
 const text='FICTIONAL PRESENT VALUE $500.00; prior debit −\u200B$500.00; '+
  'prior error —$500.00; accounting (\u2060$500.00\u2060).';
 const d=doc(text),result=auditLiteralEvidence(d,{value:'$500.00'});
 assert.equal(result[0].status,'match');
 assert.equal(result[0].matches.length,1);
 const found=result[0].matches[0];
 assert.equal(d.text.slice(found.start,found.end),'$500.00');
 assert.equal(found.start,text.indexOf('$500.00'));
 assert.equal(evidenceSelectionsAnchoredToDocument(d,result,{'/value':0}),true);
});
test('an exact genuinely signed source token remains reviewable without sign inference',()=>{
 for(const sign of ['-','−','–','—','＋']){
  const literal=sign+'$250.50';
  const source=doc('FICTIONAL VALUATION: '+literal+'.');
  const result=auditLiteralEvidence(source,{amount:literal});
  assert.equal(result[0].status,'match',literal);
  assert.equal(result[0].matches.length,1);
  assert.equal(source.text.slice(result[0].matches[0].start,
    result[0].matches[0].end),literal);
 }
});
test('zero-width formatting does not move original source offsets or synthesize geometry',()=>{
 const text='FICTIONAL PLAN: −\u200B$500 and signed \u2060−\u200B65.';
 const snapshot=text;
 const d=doc(text);
 assert.equal(auditLiteralEvidence(d,{amount:'$500'})[0].status,'missing');
 assert.equal(auditLiteralEvidence(d,{age:65})[0].status,'missing');
 assert.equal(d.text,snapshot);
 assert.equal(d.records,undefined);
});
