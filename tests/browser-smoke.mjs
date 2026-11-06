/**
 * Experimental real-browser acceptance probe. A tiny model is only a loading
 * and generation fixture, never a document extraction accuracy benchmark.
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { statSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createSyntheticPdf, createScannedPdf } from './pdf-fixture.mjs';

mkdirSync('tmp', { recursive: true });
const fixture = resolve('tmp/stories260K.gguf');
assert.ok(statSync(fixture).size > 1_000_000, 'Fixture must contain the GGUF weights');
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const external = [];
try {
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (/^(https?|wss?):/i.test(url)) {
      external.push(url);
      await route.abort();
    } else await route.continue();
  });
  page.on('console', message => {
    if (message.type() === 'error') process.stderr.write('[browser console] ' + message.text() + '\n');
  });
  page.on('pageerror', e => process.stderr.write('[browser error] ' + e.message + '\n'));
  page.on('worker', w => {
    process.stderr.write('[worker spawned] ' + w.url() + '\n');
    w.on('close', () => process.stderr.write('[worker closed] ' + w.url() + '\n'));
  });
  page.on('requestfailed', req => process.stderr.write('[request failed] ' + req.url() + ' ' + req.failure()?.errorText + '\n'));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => {
      console.error('[CSP violation]', e.violatedDirective, e.blockedURI, e.sourceFile);
    });
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args.map(x => x instanceof ErrorEvent
        ? { message: x.message, filename: x.filename, lineno: x.lineno, colno: x.colno, type: x.type }
        : x));
    };
  });
  const localUrl = pathToFileURL(resolve('dist/index.html')).href + '#/documents';
  await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /OCR \+ LLM Pipeline Studio/i }).waitFor({ timeout: 10000 });
  const preflight = await page.evaluate(async () => {
    const state = {
      origin: location.origin, protocol: location.protocol,
      secure: isSecureContext, isolated: crossOriginIsolated,
      jspi: typeof WebAssembly.Suspending !== 'undefined'
    };
    const worker = await Promise.race([
      new Promise(resolve => {
        const url = URL.createObjectURL(new Blob(['self.postMessage("alive")'], { type: 'text/javascript' }));
        try {
          const w = new Worker(url, { type: 'classic' });
          w.onmessage = e => { w.terminate(); URL.revokeObjectURL(url); resolve({ ok:true, value:e.data }); };
          w.onerror = e => { w.terminate(); URL.revokeObjectURL(url); resolve({ ok:false, message:e.message, filename:e.filename }); };
        } catch(e) { URL.revokeObjectURL(url); resolve({ ok:false, error:String(e) }); }
      }),
      new Promise(resolve => setTimeout(()=>resolve({ ok:false, error:'blob worker timed out' }), 4000))
    ]);
    return { ...state, worker };
  });
  console.log('[browser preflight]', JSON.stringify(preflight));
  assert.equal(preflight.worker.ok, true, 'A basic blob worker must run on file:// for Wllama to work.');
    await page.screenshot({ path: 'tmp/smoke-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.screenshot({ path: 'tmp/smoke-light.png', fullPage: true });
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    'rgb(255, 255, 255)',
    'Light theme must be pure white'
  );

  // Test native document parsing in the true standalone file:// build.
  const pdf = createSyntheticPdf([['Normal retirement age 65'], ['Early retirement age 55']]);
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: pdf
  });
  await page.locator('.preview').getByText(/Normal retirement age 65/).waitFor({ timeout: 30000 });
  assert.match(await page.locator('.preview').innerText(), /Page 2:[\s\S]*Early retirement age 55/);
  await page.screenshot({ path: 'tmp/smoke-pdf.png', fullPage: true });

  // Image OCR uses English traineddata, WASM and Worker embedded in the HTML.
  // Synthetic sans-serif text is the expected local recognition fixture.
  const png64=await page.evaluate(() => {
    const canvas=document.createElement('canvas');
    canvas.width=950;canvas.height=230;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,950,230);
    ctx.fillStyle='black';ctx.font='bold 68px Arial';
    ctx.fillText('RETIREMENT AGE 65',42,145);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type="file"][accept*=".png"]').setInputFiles({
    name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png64,'base64')
  });
  await page.getByText(/Imported 1 local document\(s\)/).waitFor({timeout:150000});
  const currentPreview = await page.locator('.preview').innerText();
  if (!currentPreview.startsWith('Image OCR:')) {
    await page.locator('.card select').first().selectOption({label:'synthetic.png'});
  }
  await page.locator('.preview').getByText(/RETIREMENT AGE 65/i).waitFor({timeout:150000});
  assert.match(await page.locator('.preview').innerText(), /^Image OCR:/);
  console.log('REAL BROWSER: embedded English OCR recognized synthetic PNG entirely offline.');
  await page.screenshot({path:'tmp/smoke-ocr.png',fullPage:true});

  const jpeg64=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=950;canvas.height=230;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,950,230);
    ctx.fillStyle='black';ctx.font='bold 68px Arial';
    ctx.fillText('RETIREMENT AGE 65',42,145);
    return canvas.toDataURL('image/jpeg',0.98).split(',')[1];
  });
  const scanPdf=createScannedPdf(Buffer.from(jpeg64,'base64'),950,230);
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name:'scanned-synthetic.pdf',mimeType:'application/pdf',buffer:scanPdf
  });
  await page.waitForFunction(
    () => document.querySelector('.preview')?.textContent?.startsWith('Page 1:'),
    null,{timeout:150000}
  );
  assert.match(await page.locator('.preview').innerText(), /RETIREMENT AGE 65/i);
  console.log('REAL BROWSER: image-only scanned PDF page OCR succeeded entirely offline.');
  await page.screenshot({path:'tmp/smoke-scanned-pdf.png',fullPage:true});

  console.log('REAL BROWSER: PDF.js extracted both pages with page labels from file://.');

  await page.locator('input[type="file"][accept=".gguf"]').setInputFiles(fixture);
  await page.getByRole('button', { name: 'Load model' }).click();
  await page.getByText('Loaded: stories260K.gguf').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Test model' }).click();
  await page.getByText(/Your local model generated text/i).waitFor({ timeout: 90000 });
  assert.equal(external.length, 0, 'No external network requests are allowed during file:// runtime');
  console.log('REAL BROWSER: local HTML + GGUF loading + text generation completed without external network requests.');
} catch (err) {
  const text = await page.locator('[role="alert"]').allTextContents().catch(() => []);
  const statuses = await page.locator('[role="status"]').allTextContents().catch(() => []);
  console.error('Browser alerts:', text, 'status:', statuses);
  await page.screenshot({ path: 'tmp/smoke-failure.png', fullPage: true }).catch(() => undefined);
  throw err;
} finally {
  await browser.close();
}
