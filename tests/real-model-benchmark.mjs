/**
 * Actual GGUF on-device extraction with a small but instruction-tuned model.
 * Browser opens a self-contained file URL, blocks all external requests, and
 * runs the same user-visible known-answer benchmark offered in Settings.
 * Unlike a mock or tiny random-model smoke test, this measures extraction.
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('tmp',{recursive:true});
const model=resolve('tmp/qwen2.5-0.5b-instruct-q4_k_m.gguf');
assert.ok(existsSync(model),'Qwen GGUF must be downloaded and hash-checked by CI');
const browser=await chromium.launch({headless:true,args:['--disable-gpu','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const external=[];
const report={
  fixture:'synthetic pension provisions; no private records',
  model:'Qwen2.5-0.5B-Instruct Q4_K_M (official Qwen GGUF)',
  modelSha256:'74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
  origin:'file://',networkRequests:0,result:'not_completed',score:null
};
const t0=Date.now();
try {
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(/^(https?|wss?):/i.test(url)){external.push(url);await route.abort();}
    else await route.continue();
  });
  page.on('pageerror',e=>console.error('[page error]',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('[console error]',m.text().slice(0,400));});
  await page.goto(pathToFileURL(resolve('dist/index.html')).href+'#/settings',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/OCR \+ LLM Pipeline Studio/i}).waitFor({timeout:15000});
  await page.locator('input[type="file"][accept=".gguf"]').setInputFiles(model);
  await page.getByRole('button',{name:'Load model'}).click();
  await page.getByText('Loaded: qwen2.5-0.5b-instruct-q4_k_m.gguf').waitFor({timeout:180000});
  report.loadMs=Date.now()-t0;
  await page.getByRole('button',{name:'Check extraction quality'}).click();
  await page.getByText(/Synthetic sample: \d of 4 correct/).waitFor({timeout:180000});
  const text=await page.getByText(/Synthetic sample: \d of 4 correct/).innerText();
  const found=text.match(/Synthetic sample: (\d) of 4 correct/);
  assert.ok(found,'Model must return a parsed known-answer JSON report.');
  report.score=Number(found[1]);
  report.result=report.score===4?'all_four_correct':'partial_or_incorrect';
  report.elapsedMs=Date.now()-t0;
  report.networkRequests=external.length;
  assert.equal(external.length,0,'The app must make zero external network requests.');
  await page.screenshot({path:'tmp/real-model-quality.png',fullPage:true});
  console.log('REAL GGUF QUALITY:',JSON.stringify(report));
} catch(error) {
  report.result='test_failed';
  report.elapsedMs=Date.now()-t0;
  report.networkRequests=external.length;
  report.error=String(error).slice(0,500);
  const alerts=await page.locator('[role="alert"]').allTextContents().catch(()=>[]);
  report.alerts=alerts.map(v=>v.slice(0,200));
  await page.screenshot({path:'tmp/real-model-failure.png',fullPage:true}).catch(()=>undefined);
  throw error;
} finally {
  writeFileSync('tmp/real-model-report.json',JSON.stringify(report,null,2));
  await browser.close();
}
