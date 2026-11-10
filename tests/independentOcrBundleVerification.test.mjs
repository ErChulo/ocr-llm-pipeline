import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyIndependentOcrBundle} from '../scripts/verify-independent-ocr-bundle.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function prepare(){
 const root=mkdtempSync(join(tmpdir(),'fictional-ocr-bundle-'));
 mkdirSync(join(root,'originals'));
 const pdf=Buffer.from('%PDF-1.4\nEntirely fictional test bytes, not a scanned-PDF accuracy test\n');
 const annotations=Buffer.from('{"normal_retirement_age":65,"annotation":"fictional"}\n');
 writeFileSync(join(root,'originals','a.pdf'),pdf);
 writeFileSync(join(root,'annotations.json'),annotations);
 const report={
   corpusId:'fictional-original-byte-integrity',
   sourceType:'fictional',
   candidateCommitSha:'a'.repeat(40),
   annotationsSha256:sha(annotations),
   pages:[{documentId:'doc-a',page:1,sourceSha256:sha(pdf),conditions:['baseline'],
      numeric:{expected:1,correct:1,wrongPage:0},
      spatial:{expected:1,correct:1,falseAccepted:0,wrongPage:0,
       mustAbstain:false,abstained:false}}]
 };
 const index={annotationFile:'annotations.json',
   originals:[{documentId:'doc-a',relativePath:'originals/a.pdf'}]};
 return {root,pdf,annotations,report,index};
}
async function using(f){
 const x=prepare();
 try{return await f(x);}finally{rmSync(x.root,{recursive:true,force:true});}
}
test('real local original bytes and exact annotation SHA verify, but no production certification',async()=>{
 await using(async({root,report,index})=>{
   const original=structuredClone(report);
   const result=await verifyIndependentOcrBundle(report,index,root);
   assert.equal(result.originalDocumentsVerified,1);
   assert.equal(result.reportedPages,1);
   assert.equal(result.originalFileByteVerification,'verified-against-archived-local-bytes');
   assert.equal(result.annotationFileSha256Verified,true);
   assert.equal(result.exactSourceHashesVerified,true);
   assert.equal(result.independentlyAdjudicated,false);
   assert.equal(result.productionGatePassed,false);
   assert.equal(result.mechanicalThresholdsMet,false,'small test is not a 500-page holdout');
   assert.deepEqual(report,original,'input claims remain untouched');
 });
});
test('tampered original source and tampered annotation bytes are rejected',async()=>{
 await using(async({root,report,index})=>{
   writeFileSync(join(root,'originals','a.pdf'),'changed fictional bytes');
   await assert.rejects(verifyIndependentOcrBundle(report,index,root),/Original file bytes/);
 });
 await using(async({root,report,index})=>{
   writeFileSync(join(root,'annotations.json'),'altered annotation');
   await assert.rejects(verifyIndependentOcrBundle(report,index,root),/Annotation bytes/);
 });
});
test('relative-path escapes, reused metadata paths and symlinks are forbidden',async()=>{
 await using(async({root,report,index})=>{
   for(const path of ['../outside.pdf','/etc/passwd','originals/../a.pdf','originals\\a.pdf','']){
     await assert.rejects(verifyIndependentOcrBundle(report,
       {...index,originals:[{documentId:'doc-a',relativePath:path}]},root),
       /Invalid bundle member path/);
   }
   await assert.rejects(verifyIndependentOcrBundle(report,
     {...index,originals:[{documentId:'doc-a',relativePath:'annotations.json'}]},root),
     /Original file bytes|reused|source hash/i);
   symlinkSync(join(root,'originals','a.pdf'),join(root,'originals','alias.pdf'));
   await assert.rejects(verifyIndependentOcrBundle(report,
     {...index,originals:[{documentId:'doc-a',relativePath:'originals/alias.pdf'}]},root),
     /Symlinks are not allowed/);
 });
});
test('duplicate source bytes, duplicate IDs and unreferenced originals cannot inflate coverage',async()=>{
 await using(async({root,pdf,report,index})=>{
   writeFileSync(join(root,'originals','b.pdf'),pdf);
   const originals=[...index.originals,
     {documentId:'doc-b',relativePath:'originals/b.pdf'}];
   await assert.rejects(verifyIndependentOcrBundle(report,
     {...index,originals},root),/Identical original bytes/);
   await assert.rejects(verifyIndependentOcrBundle(report,
     {...index,originals:[index.originals[0],index.originals[0]]},root),
     /duplicated original-document identity/);
   writeFileSync(join(root,'originals','b.pdf'),'different fictional source bytes');
   await assert.rejects(verifyIndependentOcrBundle(report,
     {...index,originals},root),/Unreferenced originals/);
 });
});
