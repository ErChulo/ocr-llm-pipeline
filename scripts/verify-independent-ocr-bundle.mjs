/**
 * Offline artifact-integrity verifier for externally annotated FICTIONAL
 * OCR holdouts. Reads actual local bytes, rejects paths/symlinks/duplicate
 * originals and compares SHA-256. Does not run OCR, adjudicate annotation
 * independence, confirm imagery is a genuine scan, or certify production.
 *
 * CLI: node scripts/verify-independent-ocr-bundle.mjs report.json index.json bundle-root
 */
import {readFile,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {scoreIndependentOcrAcceptance} from './score-independent-ocr-acceptance.mjs';

const LIMIT_BYTES=20*1024*1024;
const MAX_DOCUMENTS=200;
const sha=value=>createHash('sha256').update(value).digest('hex');
const cleanId=value=>typeof value==='string'&&value.length>0&&value.length<=160&&
 !/[\u0000-\u001f\u007f]/.test(value);
function safeRelative(name){
 if(typeof name!=='string'||name.length>512||!name||
    name.includes('\\')||name.includes(':')||name.startsWith('/')||
    isAbsolute(name)||name.split('/').some(part=>!part||part==='.'||part==='..')||
    /[\u0000-\u001f\u007f]/.test(name))
    throw new Error('Invalid bundle member path.');
 return name.split('/');
}
function beneath(root,file){
 const r=relative(root,file);
 return !!r&&!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r);
}
async function readVerifiedMember(root,name,maxBytes=LIMIT_BYTES){
 const parts=safeRelative(name);
 let step=root;
 for(const part of parts){
   step=resolve(step,part);
   if(!beneath(root,step))throw new Error('Bundle member escapes root.');
   const stat=await lstat(step);
   if(stat.isSymbolicLink())throw new Error('Symlinks are not allowed in OCR evidence bundles.');
 }
 const stat=await lstat(step);
 if(!stat.isFile()||stat.size<=0||stat.size>maxBytes)
   throw new Error('Invalid or oversized OCR evidence member.');
 const real=await realpath(step);
 if(!beneath(root,real))throw new Error('Bundle member escaped the root.');
 const bytes=await readFile(step);
 if(bytes.length!==stat.size)throw new Error('Source member changed during verification.');
 return {size:bytes.length,sha256:sha(bytes)};
}
export async function verifyIndependentOcrBundle(report,index,rootPath){
 // Start with the existing numerical scorer. Its independent and production
 // fields must remain false even if every user-reported metric is perfect.
 const scored=scoreIndependentOcrAcceptance(report);
 if(!index||typeof index!=='object'||Array.isArray(index)||
   !Array.isArray(index.originals)||!index.originals.length||
   index.originals.length>MAX_DOCUMENTS)
   throw new Error('Invalid original-file index.');
 const root=await realpath(rootPath);
 if(!(await lstat(root)).isDirectory())throw new Error('Bundle root must be a directory.');
 const annotation=await readVerifiedMember(root,index.annotationFile,8*1024*1024);
 if(annotation.sha256.toLowerCase()!==report.annotationsSha256.toLowerCase())
   throw new Error('Annotation bytes do not match declared SHA-256.');
 const byDoc=new Map(),physicalHashes=new Set(),paths=new Set();
 for(const original of index.originals){
   if(!original||typeof original!=='object'||Array.isArray(original)||
     !cleanId(original.documentId)||byDoc.has(original.documentId))
     throw new Error('Invalid or duplicated original-document identity.');
   const member=await readVerifiedMember(root,original.relativePath);
   if(physicalHashes.has(member.sha256))
     throw new Error('Identical original bytes cannot count as independent documents.');
   if(paths.has(original.relativePath)||original.relativePath===index.annotationFile)
     throw new Error('A bundle file cannot be reused as multiple evidence sources.');
   byDoc.set(original.documentId,member);
   physicalHashes.add(member.sha256);
   paths.add(original.relativePath);
 }
 const referenced=new Set();
 for(const page of report.pages){
   const original=byDoc.get(page.documentId);
   if(!original)throw new Error('Reported document has no archived original bytes.');
   if(original.sha256.toLowerCase()!==page.sourceSha256.toLowerCase())
     throw new Error('Original file bytes do not match reported source hash.');
   referenced.add(page.documentId);
 }
 if(referenced.size!==byDoc.size)
   throw new Error('Unreferenced originals cannot inflate document counts.');
 return {
   corpusId:scored.corpusId,
   originalDocumentsVerified:referenced.size,
   reportedPages:scored.totals.pages,
   originalFileByteVerification:'verified-against-archived-local-bytes',
   annotationFileSha256Verified:true,
   exactSourceHashesVerified:true,
   duplicateOriginalsRejected:true,
   mechanicalThresholdsMet:scored.mechanicalThresholdsMet,
   thresholds:scored.thresholds,
   independentlyAdjudicated:false,
   productionGatePassed:false,
   limitations:[
    'This verifies only file bytes and the declared annotation file hash; it does not prove scan authenticity, page correctness or independent authorship.',
    'Reported per-page OCR truth, measurements and source-page mapping still require external independent human review.',
    'All required GGUF, source-authority, security, privacy, accessibility and workplace production gates remain separate.'
   ]
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [reportFile,indexFile,root]=process.argv.slice(2);
 if(!reportFile||!indexFile||!root){
   process.stderr.write('Usage: node verify-independent-ocr-bundle.mjs report.json index.json bundle-root\\n');
   process.exitCode=2;
 }else{
   try{
     const report=JSON.parse(await readFile(reportFile,'utf8'));
     const index=JSON.parse(await readFile(indexFile,'utf8'));
     const result=await verifyIndependentOcrBundle(report,index,root);
     process.stdout.write(JSON.stringify(result,null,2)+'\\n');
   }catch(error){
     process.stderr.write('Offline OCR bundle verification failed: '+
       (error instanceof Error?error.message:'invalid evidence')+'\\n');
     process.exitCode=1;
   }
 }
}
