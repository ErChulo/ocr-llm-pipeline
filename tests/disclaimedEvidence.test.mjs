import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectedCitationExpresslyDisclaimed} from '../src/disclaimedEvidence.ts';
import {auditLiteralEvidence} from '../src/evidence.ts';
import {evaluateExportGate} from '../src/exportGate.ts';
const fixture=text=>({
 id:'fictional-disclaimer',name:'fictional.csv',text,
 sizeBytes:new TextEncoder().encode(text).length,mimeType:'text/csv',
 provenance:{source:'local-text',precision:'document',fileName:'fictional.csv'},
 sourceSha256:'1'.repeat(64),processedTextSha256:'2'.repeat(64)
});
const audit=doc=>({
 documentId:doc.id,documentName:doc.name,
 sourceText:doc.text,length:doc.text.length,
 sourceSha256:doc.sourceSha256,processedTextSha256:doc.processedTextSha256,
 chunks:[{chunk:1,start:0,end:doc.text.length}],candidates:{},conflicts:[]
});
test('fictional injected examples explicitly disclaimed as untrusted do not become source authority',()=>{
 for(const source of [
  'FICTIONAL PLAN: Normal age 65.\nUntrusted appendix: normal_age 99.',
  'FICTIONAL PLAN: Normal age 65.\nEXAMPLE ONLY\nnormal_age 99.',
  'FICTIONAL PLAN: Normal age 65.\nSAMPLE NOT GOVERNING\nnormal_age 99.',
  'FICTIONAL PLAN: Normal age 65.\nNOT A GOVERNING PROVISION\nnormal_age 99.',
  'FICTIONAL PLAN: Normal age 65.\nDo not use this example: normal_age 99.'
 ]){
  const at=source.lastIndexOf('99');
  assert.equal(selectedCitationExpresslyDisclaimed(source,at,at+2),true,source);
  const doc=fixture(source),value={normal_age:99},checks=auditLiteralEvidence(doc,value);
  assert.equal(checks[0].status,'match');
  const review=evaluateExportGate({
    document:doc,audit:audit(doc),value,schemaValid:true,busy:false,
    evidence:checks,selectedEvidence:{'/normal_age':0},
    confirmedEvidence:{'/normal_age':true},conflictsUnresolved:0,
    privacyRequired:false,privacyReviewed:false,
    sourceIssuesUnreviewed:0,sourceIssuesReviewed:{}
  });
  assert.equal(review.allowed,false,source);
  assert.ok(review.reasons.some(x=>/expressly disclaimed/i.test(x)),source);
 }
});
test('ordinary plan appendices and clean governing citations remain reviewable',()=>{
 const source='FICTIONAL PLAN: Normal retirement age 65.\n\nAppendix A: Early retirement age 55.\n';
 const truth=source.indexOf('65'),appendix=source.lastIndexOf('55');
 assert.equal(selectedCitationExpresslyDisclaimed(source,truth,truth+2),false);
 assert.equal(selectedCitationExpresslyDisclaimed(source,appendix,appendix+2),false);
 const doc=fixture(source),value={normal_age:65};
 const checks=auditLiteralEvidence(doc,value);
 const gate=evaluateExportGate({
  document:doc,audit:audit(doc),value,schemaValid:true,busy:false,
  evidence:checks,selectedEvidence:{'/normal_age':0},
  confirmedEvidence:{'/normal_age':true},conflictsUnresolved:0,
  privacyRequired:false,privacyReviewed:false,
  sourceIssuesUnreviewed:0,sourceIssuesReviewed:{}
 });
 assert.equal(gate.allowed,true,'non-disclaimed appendix does not imply invalidity');
});
test('a legitimate citation to an unrelated earlier provision is not tainted by a later example',()=>{
 const source='FICTIONAL PLAN: Normal age 65.\n\n'+
  'Untrusted appendix: Normal age 99.';
 assert.equal(selectedCitationExpresslyDisclaimed(source,source.indexOf('65'),source.indexOf('65')+2),false);
 assert.equal(selectedCitationExpresslyDisclaimed(source,source.lastIndexOf('99'),source.lastIndexOf('99')+2),true);
});
test('fabricated, giant or invalid source offsets fail closed',()=>{
 const source='Plan age 65.';
 for(const [s,e] of [[-1,1],[4,4],[4,900],[NaN,2]]){
  assert.equal(selectedCitationExpresslyDisclaimed(source,s,e),true);
 }
 assert.equal(selectedCitationExpresslyDisclaimed('EXAMPLE ONLY '+('x'.repeat(5000))+' 99',0,2),true);
});
