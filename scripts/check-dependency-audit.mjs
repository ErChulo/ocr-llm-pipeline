/**
 * Fail-closed production dependency audit gate for GitHub Actions.
 * This is intentionally not included in the offline browser bundle.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function summarizeAudit(document){
  if(!document||typeof document!=='object'||Array.isArray(document)||
     document.error){
    throw new Error('Dependency audit returned an error or invalid report.');
  }
  const levels=document.metadata?.vulnerabilities;
  if(!levels||typeof levels!=='object'){
    throw new Error('Dependency audit has no vulnerability metadata; cannot certify zero findings.');
  }
  const counts={};
  for(const level of ['info','low','moderate','high','critical']){
    if(!Number.isSafeInteger(levels[level])||levels[level]<0){
      throw new Error('Dependency audit has an invalid '+level+' severity count.');
    }
    counts[level]=levels[level];
  }
  const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
  if(!Number.isSafeInteger(total))throw new Error('Dependency audit counts overflow.');
  return {counts,total,blocking:counts.high+counts.critical,
    passed:counts.high===0&&counts.critical===0};
}

const entry=process.argv[1]?resolve(process.argv[1]):'';
if(entry===fileURLToPath(import.meta.url)){
  const source=process.argv[2];
  if(!source){
    console.error('Usage: node scripts/check-dependency-audit.mjs <npm-audit.json>');
    process.exitCode=2;
  }else{
    try{
      const report=summarizeAudit(JSON.parse(readFileSync(source,'utf8')));
      console.log('PRODUCTION DEPENDENCY AUDIT:',JSON.stringify(report));
      if(!report.passed){
        console.error('High/critical production dependency vulnerabilities block release.');
        process.exitCode=1;
      }
    }catch(e){
      console.error('Audit could not be verified:',e instanceof Error?e.message:String(e));
      process.exitCode=2;
    }
  }
}
