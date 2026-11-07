/**
 * Runs a realistic fictional pension corpus against an ACTUAL local GGUF via
 * the same offline HTML, import and extraction UI as a normal user.
 *
 * Measures model output, not a hardcoded mock. All text and annotations are
 * fabricated; no real PBGC case or participant material is ever used.
 */
import { chromium } from 'playwright';
import { resolve,basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync,writeFileSync,readFileSync,statSync,existsSync } from 'node:fs';
import { syntheticCases } from './fixtures/syntheticPensionCases.mjs';
import { scoreCorpus } from '../src/syntheticQuality.ts';
import {dateRepresentationAgreement} from '../src/dateRepresentation.ts';
import assert from 'node:assert/strict';

mkdirSync('tmp',{recursive:true});
const model=resolve(process.env.MODEL_FILE||'tmp/qwen2.5-0.5b-instruct-q4_k_m.gguf');
assert.ok(existsSync(model),'Select a checksum-verified local GGUF test file.');
const sampleIds=['simple-eligibility','historical-vs-amended','rate-precision',
  'unknown-data','quoted-injection'];
const samples=sampleIds.map(id=>syntheticCases.find(x=>x.id===id));
assert.ok(samples.every(Boolean),'Missing a synthetic benchmark source.');
const report={
  model:process.env.MODEL_LABEL||'Qwen2.5-0.5B-Instruct Q4_K_M',
  modelBytes:statSync(model).size,
  fixtureCount:samples.length,source:'fictional-only',origin:'file://',
  cases:[],externalRequests:[],status:'starting',startedAt:new Date().toISOString()
};
const persist=()=>writeFileSync('tmp/real-corpus-report.json',JSON.stringify(report,null,2));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const started=Date.now();
let qualityFailure=false;
try{
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(/^(https?|wss?):/i.test(url)){report.externalRequests.push(url);await route.abort();}
    else await route.continue();
  });
  page.on('pageerror',e=>console.error('[browser error]',e.message.slice(0,240)));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href+'#/documents',
    {waitUntil:'domcontentloaded'});
  await page.locator('input[type="file"][accept=".gguf"]').setInputFiles(model);
  await page.getByRole('button',{name:'Load model'}).click();
  await page.getByText('Loaded: '+basename(model)).waitFor({timeout:360000});
  report.loadMs=Date.now()-started;
  report.status='running';
  persist();
  for(const sample of samples){
    const item={id:sample.id,category:sample.category,status:'pending',elapsedMs:0,
      schemaValid:false,actual:{},errors:[]};
    report.cases.push(item);
    const phaseStarted=Date.now();
    try{
      await page.getByRole('button',{name:'Documents',exact:true}).click();
      await page.locator('input[type="file"][accept*=".txt"]').setInputFiles({
        name:sample.id+'.txt',mimeType:'text/plain',buffer:Buffer.from(sample.source)
      });
      await page.waitForFunction(expected=>
        document.querySelector('.preview')?.textContent?.includes(expected),
        sample.source.slice(0,36),{timeout:12000});
      await page.getByRole('button',{name:'Extract JSON',exact:true}).click();
      const properties=Object.fromEntries(Object.entries(sample.expected)
        .map(([key,value])=>[key,{type:typeof value}]));
      const schema={type:'object',properties,additionalProperties:false};
      await page.getByRole('textbox',{name:'Target JSON Schema'}).fill(JSON.stringify(schema));
      await page.getByRole('button',{name:'Check schema'}).click();
      await page.getByText(/Schema is valid for local validation/).waitFor({timeout:12000});
      await page.getByRole('button',{name:'Extract and validate'}).click();
      await page.waitForFunction(()=>{
        const input=document.querySelector('textarea[aria-label="Candidate JSON for review"]');
        const error=Array.from(document.querySelectorAll('[role="alert"]'))
          .some(n=>n.textContent?.trim());
        const running=Array.from(document.querySelectorAll('button'))
          .some(n=>n.textContent?.trim()==='Extracting...');
        if(running)return false;
        return (input?.value?.trim() || error) ? 'complete' : false;
      },null,{timeout:200000});
      const raw=await page.getByRole('textbox',{name:'Candidate JSON for review'}).inputValue();
      const alerts=await page.locator('[role="alert"]').allTextContents();
      item.errors=alerts.map(x=>x.slice(0,180));
      item.schemaValid=await page.getByText('JSON Schema passed. Verify all facts before use.').count()>0;
      if(raw.trim()){
        try{item.actual=JSON.parse(raw);}catch{item.status='invalid_json';}
      }
      if(item.status==='pending')item.status='measured';
    }catch(error){
      item.status='runtime_error';
      item.errors.push(String(error).slice(0,240));
      qualityFailure=true;
      // Reset the browser after an actual runtime failure to avoid false scores
      // for subsequent documents from a stale UI state.
      break;
    }finally{
      item.elapsedMs=Date.now()-phaseStarted;
      console.log('[fictional corpus]',item.id,item.status,item.elapsedMs,'ms');
      persist();
    }
  }
  const observations=report.cases.map(item=>{
    const source=samples.find(x=>x.id===item.id);
    return {id:item.id,expected:source.expected,actual:item.actual};
  });
  if(observations.length){
    const dateChecks=[];
    for(const item of report.cases){
      const sample=samples.find(x=>x.id===item.id);
      for(const path of sample.datePaths||[]){
        // The fixed corpus annotates dates explicitly. No arbitrary string
        // is parsed or reinterpreted as a date.
        const key=path.slice(1);
        dateChecks.push({caseId:item.id,path,
          ...dateRepresentationAgreement(sample.expected[key],item.actual?.[key])});
      }
    }
    report.dateRepresentationChecks=dateChecks;
    const score=scoreCorpus(observations);
    report.micro=score.micro;
    report.exactCases=score.exactCases;
    report.scores=score.perCase.map(x=>({id:x.id,precision:x.score.precision,
      recall:x.score.recall,f1:x.score.f1,
      missing:x.score.missing.map(f=>f.path),
      incorrect:x.score.incorrect.map(f=>f.path),
      unsupported:x.score.unsupported.map(f=>f.path)}));
  }
  report.elapsedMs=Date.now()-started;
  report.status=qualityFailure?'runtime_error':'measured_not_certified';
  report.externalRequestCount=report.externalRequests.length;
  assert.equal(report.externalRequestCount,0,'Browser must make zero external requests.');
  console.log('REAL MODEL CORPUS RESULTS:',JSON.stringify({
    cases:report.cases.length,exactCases:report.exactCases,
    micro:report.micro,status:report.status,elapsedMs:report.elapsedMs
  }));
  await page.screenshot({path:'tmp/real-corpus-final.png',fullPage:true}).catch(()=>{});
}finally{
  persist();
  await browser.close();
}
if(qualityFailure)process.exitCode=1;
