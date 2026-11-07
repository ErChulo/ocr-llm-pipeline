/**
 * Actual GGUF on-device extraction with a small but instruction-tuned model.
 * Browser opens a self-contained file URL, blocks all external requests, and
 * runs the same user-visible known-answer benchmark offered in Settings.
 * Unlike a mock or tiny random-model smoke test, this measures extraction.
 */
import { chromium } from 'playwright';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

mkdirSync('tmp',{recursive:true});
const model=resolve(process.env.MODEL_FILE || 'tmp/qwen2.5-0.5b-instruct-q4_k_m.gguf');
assert.ok(existsSync(model),'Qwen GGUF must be downloaded and hash-checked by CI');
const browser=await chromium.launch({headless:true,args:['--disable-gpu','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const external=[];
const report={
  fixture:'synthetic pension provisions; no private records',
  model:process.env.MODEL_LABEL || 'Official Qwen2.5-0.5B-Instruct Q4_K_M',
  modelBytes:statSync(model).size,
  modelSha256:process.env.MODEL_SHA256 || '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
  origin:'file://',networkRequests:0,result:'not_completed',score:null,
  phase:'launch',phaseTrace:[],browserErrors:[]
};
const t0=Date.now();
function checkpoint(phase){
  report.phase=phase;
  report.phaseTrace.push({phase,elapsedMs:Date.now()-t0});
  // Save partial diagnostic evidence even if CI terminates the test process.
  writeFileSync('tmp/real-model-report.json',JSON.stringify(report,null,2));
  console.log('[benchmark phase]',phase,'elapsedMs=',Date.now()-t0);
}
async function browserMetrics(){
  try {
    const client=await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    const result=await client.send('Performance.getMetrics');
    await client.detach();
    const desired=['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','TaskDuration'];
    return Object.fromEntries(result.metrics.filter(m=>desired.includes(m.name))
      .map(m=>[m.name,m.value]));
  }catch{return {status:'unavailable'};}
}
async function diagnosticSnapshot(){
  const ui=await page.evaluate(()=>{
    const text=selector=>Array.from(document.querySelectorAll(selector))
      .map(e=>(e.textContent||'').trim().slice(0,300)).filter(Boolean).slice(0,10);
    return {
      route:location.hash,phaseStatus:text('[role="status"]'),
      alerts:text('[role="alert"]'),evidenceCount:document.querySelectorAll('.evidence-field').length,
      buttons:Array.from(document.querySelectorAll('button')).filter(x=>x.disabled)
        .map(x=>x.textContent?.trim().slice(0,70)).filter(Boolean).slice(0,12),
      reviewDraft:document.querySelector('textarea[aria-label="Review and edit extracted JSON"]')?.value?.slice(0,1000)||'',
      appStatus:text('.status')
    };
  }).catch(error=>({status:'browser_unavailable',error:String(error).slice(0,240)}));
  return {ui,metrics:await browserMetrics()};
}
checkpoint('browser_created');
try {
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(/^(https?|wss?):/i.test(url)){external.push(url);await route.abort();}
    else await route.continue();
  });
  page.on('pageerror',e=>{
    report.browserErrors.push(e.message.slice(0,250));
    console.error('[page error]',e.message);
  });
  page.on('console',m=>{if(m.type()==='error')console.error('[console error]',m.text().slice(0,400));});
  await page.goto(pathToFileURL(resolve('dist/index.html')).href+'#/settings',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/OCR \+ LLM Pipeline Studio/i}).waitFor({timeout:15000});
  await page.locator('input[type="file"][accept=".gguf"]').setInputFiles(model);
  await page.getByRole('button',{name:'Load model'}).click();
  checkpoint('model_file_selected');
  await page.getByText('Loaded: '+basename(model)).waitFor({timeout:360000});
  checkpoint('model_loaded');
  report.loadMs=Date.now()-t0;
  await page.getByRole('button',{name:'Check extraction quality'}).click();
  await page.getByText(/Synthetic sample: \d of 4 correct/).waitFor({timeout:420000});
  const text=await page.getByText(/Synthetic sample: \d of 4 correct/).innerText();
  const found=text.match(/Synthetic sample: (\d) of 4 correct/);
  assert.ok(found,'Model must return a parsed known-answer JSON report.');
  report.score=Number(found[1]);
  checkpoint('known_answer_scored');
  report.syntheticFeedback=text.slice(0,600);
  report.result=report.score===4?'all_four_correct':'partial_or_incorrect';
  report.elapsedMs=Date.now()-t0;
  report.networkRequests=external.length;
  assert.equal(external.length,0,'The app must make zero external network requests.');
  await page.screenshot({path:'tmp/real-model-quality.png',fullPage:true});

  // Full application test: import, extract, validate, confirm citation and
  // download. This is not a mocked LLM, and no production participant data.
  const fictional=[
    'FICTIONAL TEST DOCUMENT. NEVER USE FOR A REAL PLAN.',
    'This plan has normal_retirement_age: 65.',
    'This plan has early_retirement_eligibility: age 55 after 10 years of service.',
    'Use only the fictional values stated in this document.'
  ].join('\n');
  const expectedHash=createHash('sha256').update(Buffer.from(fictional)).digest('hex');
  await page.getByRole('button',{name:'Documents',exact:true}).click();
  await page.locator('input[type="file"][accept*=".txt"]').setInputFiles({
    name:'fictional-extraction.txt',mimeType:'text/plain',buffer:Buffer.from(fictional)
  });
  await page.getByText(/normal_retirement_age: 65/).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Extract JSON',exact:true}).click();
  await page.getByRole('button',{name:'Extract and validate'}).click();
  checkpoint('extraction_started');
  const completion=await page.waitForFunction(()=>{
    if(document.querySelector('.evidence-field'))return 'evidence';
    const error=document.querySelector('[role="alert"]');
    if(error?.textContent?.trim())return 'application_error';
    return false;
  },null,{timeout:420000});
  const disposition=await completion.jsonValue();
  if(disposition==='application_error'){
    report.failureDetail=await diagnosticSnapshot();
    throw new Error('The application rejected the model extraction before evidence review.');
  }
  checkpoint('evidence_review_rendered');
  const reviewedFields=await page.locator('.evidence-field').count();
  assert.ok(reviewedFields>=2,'Model must produce both requested plan fields.');
  for(let i=0;i<reviewedFields;i++){
    const field=page.locator('.evidence-field').nth(i);
    const missing=await field.getByText(/No exact source text supports this value/).count();
    assert.equal(missing,0,'Every model value needs real source text.');
    await field.locator('select').selectOption('0');
    await field.locator('input[type="checkbox"]').check();
  }
  await page.getByRole('button',{name:'Export reviewed JSON'}).waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:'Export reviewed JSON'}).isEnabled(),true,
    'Export must remain locked until source review finishes.');
  const downloadPending=page.waitForEvent('download',{timeout:15000});
  await page.getByRole('button',{name:'Export reviewed JSON'}).click();
  const download=await downloadPending;
  const artifactPath='tmp/real-model-extraction.json';
  await download.saveAs(artifactPath);
  const exported=JSON.parse(readFileSync(artifactPath,'utf8'));
  assert.equal(exported.coverage.complete,true);
  assert.equal(exported.document.sourceSha256,expectedHash);
  assert.equal(exported.document.processedTextSha256,expectedHash);
  assert.equal(String(exported.extraction.normal_retirement_age).trim(),'65');
  const early=String(exported.extraction.early_retirement_eligibility||'');
  assert.match(early,/55/);
  assert.match(early,/10/);
  assert.ok(Object.keys(exported.fieldEvidence).length>=2);
  checkpoint('export_verified');
  report.fullPipeline='passed';
  report.exportedFields=Object.keys(exported.fieldEvidence).length;
  report.pipelineMs=Date.now()-t0-report.loadMs;
  console.log('REAL GGUF END-TO-END: source import, JSON, evidence review and export passed.');

  console.log('REAL GGUF QUALITY:',JSON.stringify(report));
} catch(error) {
  report.result='test_failed';
  checkpoint('test_failed');
  report.elapsedMs=Date.now()-t0;
  report.networkRequests=external.length;
  report.error=String(error).slice(0,500);
  const alerts=await page.locator('[role="alert"]').allTextContents().catch(()=>[]);
  report.alerts=alerts.map(v=>v.slice(0,200));
  report.failureDetail=await diagnosticSnapshot();
  await page.screenshot({path:'tmp/real-model-failure.png',fullPage:true}).catch(()=>undefined);
  throw error;
} finally {
  writeFileSync('tmp/real-model-report.json',JSON.stringify(report,null,2));
  await browser.close();
}
