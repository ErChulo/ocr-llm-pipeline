/**
 * Experimental real-browser acceptance probe. A tiny model is only a loading
 * and generation fixture, never a document extraction accuracy benchmark.
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { statSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createSyntheticPdf, createScannedPdf, createMultiPageScannedPdf, createAnnotatedPdf } from './pdf-fixture.mjs';
import { zipSync, strToU8 } from 'fflate';

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

  await page.getByRole('button',{name:'View original PDF'}).click();
  await page.getByRole('dialog',{name:'Original PDF page'}).waitFor({timeout:15000});
  assert.equal(await page.getByRole('button',{name:'Close PDF view'}).evaluate(el=>el===document.activeElement),true);
  await page.locator('.pdf-view-canvas canvas').waitFor({timeout:15000});
  await page.waitForFunction(()=>{
    const canvas=document.querySelector('.pdf-view-canvas canvas');
    return canvas && canvas.width>=400 && canvas.height>=400;
  },null,{timeout:20000});
  assert.match(await page.getByRole('dialog',{name:'Original PDF page'}).innerText(),/page 1 of 2/);
  await page.getByRole('button',{name:'Next page'}).click();
  await page.getByText(/Original PDF — page 2 of 2/).waitFor({timeout:20000});
  await page.getByRole('button',{name:'Close PDF view'}).click();
  assert.equal(await page.getByRole('dialog',{name:'Original PDF page'}).count(),0);
  console.log('REAL BROWSER: original PDF pages rendered and navigated under file URL.');

  // Batch import is atomic: a duplicate in a multi-file pick must leave the
  // previously selected document and source review state unchanged.
  const filePicker=page.locator('input[type="file"][accept*=".pdf"]');
  await filePicker.setInputFiles([
    {name:'batch-duplicate.txt',mimeType:'text/plain',buffer:Buffer.from('Early retirement 55')},
    {name:'batch-duplicate.txt',mimeType:'text/plain',buffer:Buffer.from('Normal retirement 65')}
  ]);
  await page.getByRole('alert').getByText(/Duplicate document identity or filename/i)
    .waitFor({timeout:10000});
  await page.getByText('1 document(s) in this session').waitFor({timeout:10000});
  assert.match(await page.locator('.preview').innerText(),/Normal retirement age 65/);
  await filePicker.setInputFiles([
    {name:'batch-one.txt',mimeType:'text/plain',buffer:Buffer.from('Normal retirement age 65.')},
    {name:'batch-two.txt',mimeType:'text/plain',buffer:Buffer.from('Early retirement 55 with service 10.')}
  ]);
  await page.getByText('3 document(s) in this session').waitFor({timeout:10000});
  await page.locator('.card select').first().selectOption({label:'synthetic.pdf'});
  assert.match(await page.locator('.preview').innerText(),/Page 2:/);
  console.log('REAL BROWSER: document batch rolls back on duplicate and commits all on success.');

  // A two-column text layer can contain all text yet still be unsafe to
  // interpret in parser order. The app must surface an original-page review.
  const twoColumnPdf=createSyntheticPdf([[
    {text:'Normal retirement 65',x:72,y:720},
    {text:'Early retirement 55',x:430,y:720}
  ]]);
  await filePicker.setInputFiles({
    name:'two-column-synthetic.pdf',mimeType:'application/pdf',buffer:twoColumnPdf
  });
  const pdfLayoutPanel=page.locator('.source-completeness');
  await pdfLayoutPanel.getByText(/may contain columns, tabular spacing or rotated text/i)
    .waitFor({timeout:30000});
  assert.equal(await pdfLayoutPanel.locator('input[type="checkbox"]').count(),1);
  await page.getByRole('button',{name:'View original page 1'}).click();
  await page.getByRole('dialog',{name:'Original PDF page'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Close PDF view'}).click();
  await page.locator('.card select').first().selectOption({label:'synthetic.pdf'});
  console.log('REAL BROWSER: multi-column PDF text geometry requires original-source review.');

  // FreeText and form widgets can contain material information omitted from
  // the selectable text layer; the UI must demand original-file review.
  await filePicker.setInputFiles({name:'fictional-annotated.pdf',
    mimeType:'application/pdf',buffer:createAnnotatedPdf('FreeText')});
  const annotationReview=page.locator('.source-completeness');
  await annotationReview.getByText(/annotations or interactive form fields/i).waitFor({timeout:30000});
  assert.equal(await annotationReview.locator('input[type="checkbox"]').count(),1);
  assert.doesNotMatch(await page.locator('.preview').innerText(),/Unverified retirement exception/);
  await filePicker.setInputFiles({name:'fictional-widget.pdf',
    mimeType:'application/pdf',buffer:createAnnotatedPdf('Widget')});
  await annotationReview.getByText(/annotations or interactive form fields/i).waitFor({timeout:30000});
  assert.equal(await annotationReview.locator('input[type="checkbox"]').count(),1);
  assert.doesNotMatch(await page.locator('.preview').innerText(),/AgeOverride/);
  await page.locator('.card select').first().selectOption({label:'synthetic.pdf'});
  console.log('REAL BROWSER: omitted PDF annotation and widget values require source review.');




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
  const imageReview=page.locator('.source-completeness');
  await imageReview.getByText(/original image before export/i).waitFor({timeout:15000});
  assert.equal(await imageReview.locator('input[type="checkbox"]').count(),1);
  await page.getByRole('button',{name:'View original image'}).click();
  const originalImage=page.locator('.original-image-preview img');
  await originalImage.waitFor({timeout:10000});
  assert.equal(await originalImage.evaluate(img=>img.complete&&img.naturalWidth===950),true);
  assert.match(await originalImage.getAttribute('src'),/^blob:/);
  await page.getByRole('button',{name:'Close original image'}).click();
  assert.equal(await originalImage.count(),0);
  await page.getByRole('button',{name:'Extract JSON',exact:true}).click();
  await page.getByRole('button',{name:'Review source issues in Documents'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Review source issues in Documents'}).click();
  await imageReview.locator('input[type="checkbox"]').check();
  await imageReview.getByText(/Source issue acknowledgements complete/i).waitFor({timeout:10000});
  await page.screenshot({path:'tmp/smoke-ocr.png',fullPage:true});
  console.log('REAL BROWSER: every image OCR result requires original-image source review.');

  // Correct transcription in the browser and verify source integrity is
  // clearly distinguished from OCR and no data leaves the local document.
  await page.getByRole('button',{name:'Correct OCR text'}).click();
  const transcription=page.getByRole('textbox',{name:'Corrected OCR transcription'});
  await transcription.waitFor({timeout:5000});
  assert.match(await transcription.inputValue(),/RETIREMENT AGE 65/i);
  await transcription.fill('RETIREMENT AGE 65 HUMAN CONFIRMED');
  await page.getByRole('button',{name:'Save correction'}).click();
  await page.locator('.preview').getByText(/RETIREMENT AGE 65 HUMAN CONFIRMED/).waitFor({timeout:6000});
  assert.equal((await page.locator('.preview').innerText()).trim(),
    'Image OCR:\nRETIREMENT AGE 65 HUMAN CONFIRMED');
  await imageReview.getByText(/1 source issue\(s\) still require review/i).waitFor({timeout:10000});
  console.log('REAL BROWSER: OCR correction invalidates previous source acknowledgement.');


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
  const scannedReview=page.locator('.source-completeness');
  await scannedReview.getByText(/PDF page 1 before export/i).waitFor({timeout:10000});
  assert.equal(await scannedReview.locator('input[type="checkbox"]').count(),1);
  await page.getByRole('button',{name:'View original page 1'}).click();
  await page.getByRole('dialog',{name:'Original PDF page'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Close PDF view'}).click();
  await scannedReview.locator('input[type="checkbox"]').check();
  console.log('REAL BROWSER: scanned PDF OCR requires original-page review regardless of confidence.');

  // Measured fictional scanned table. This is diagnostic OCR accuracy, not
  // automatic pension interpretation or model/GGUF extraction accuracy.
  // Use a raster JPEG inside a real PDF: no selectable text layer or PII.
  const scannedTableJpeg=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=1100;canvas.height=550;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,1100,550);
    ctx.fillStyle='#111';
    ctx.font='bold 44px Arial';
    ctx.fillText('FICTIONAL BENEFIT SCHEDULE',46,78);
    ctx.font='bold 32px Arial';
    ctx.fillText('AGE',72,170);
    ctx.fillText('MONTHLY FACTOR',445,170);
    ctx.font='34px Arial';
    ctx.fillText('55',72,247);ctx.fillText('0.8750',445,247);
    ctx.fillText('65',72,324);ctx.fillText('1.0000',445,324);
    ctx.fillText('SERVICE 10 YEARS',72,433);
    return canvas.toDataURL('image/jpeg',0.96).split(',')[1];
  });
  const scannedTablePdf=createScannedPdf(Buffer.from(scannedTableJpeg,'base64'),1100,550);
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name:'fictional-scanned-table.pdf',mimeType:'application/pdf',buffer:scannedTablePdf
  });
  await page.locator('.card select').first().locator('option')
    .filter({hasText:'fictional-scanned-table.pdf'}).waitFor({state:'attached',timeout:150000});
  await page.locator('.card select').first().selectOption({label:'fictional-scanned-table.pdf'});
  await page.locator('.source-completeness').getByText(/PDF page 1 before export/i)
    .waitFor({timeout:150000});
  const scannedTableText=await page.locator('.preview').innerText();
  assert.match(scannedTableText,/^Page 1:/);
  const expectedTable=['55','65','0.8750','1.0000','10'];
  const tableHits=Object.fromEntries(expectedTable.map(token=>[
    token,new RegExp('(^|[^0-9.])'+token.replace('.','\\.')+'($|[^0-9.])').test(scannedTableText)
  ]));
  const exactTableFields=Object.values(tableHits).filter(Boolean).length;
  assert.equal(external.length,0,'scanned PDF OCR must stay offline');
  assert.equal(await page.locator('.source-completeness input[type="checkbox"]').count(),1);
  console.log('REAL BROWSER: fictional scanned-table OCR literal exact fields '+
    exactTableFields+'/'+expectedTable.length+'; diagnostic only, requires source review.');

  const fictionalScans=[{
    fixture:'fictional-scanned-table.pdf',variation:'high-contrast-baseline',
    exactFieldCount:exactTableFields,literalMatches:tableHits
  }];
  // Adversarial but entirely fictional scan conditions. These are measured
  // holdouts, never a fixed pass threshold or silent source correction.
  for(const variation of ['low-contrast-jpeg','slightly-skewed-speckled-jpeg']){
    const jpegBase64=await page.evaluate((variation)=>{
      const canvas=document.createElement('canvas');
      canvas.width=1100;canvas.height=550;
      const ctx=canvas.getContext('2d');
      const isLow=variation==='low-contrast-jpeg';
      ctx.fillStyle=isLow?'#eee':'#f8f8f8';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      if(!isLow){
        ctx.translate(550,275);
        ctx.rotate(1.3*Math.PI/180);
        ctx.translate(-550,-275);
      }
      ctx.fillStyle=isLow?'#777':'#252525';
      ctx.font='bold 44px Arial';
      ctx.fillText('FICTIONAL BENEFIT SCHEDULE',46,78);
      ctx.font='bold 32px Arial';
      ctx.fillText('AGE',72,170);
      ctx.fillText('MONTHLY FACTOR',445,170);
      ctx.font='34px Arial';
      ctx.fillText('55',72,247);ctx.fillText('0.8750',445,247);
      ctx.fillText('65',72,324);ctx.fillText('1.0000',445,324);
      ctx.fillText('SERVICE 10 YEARS',72,433);
      if(!isLow){
        // Deterministic photocopy speckling: no Math.random, no remote data.
        let seed=48903;
        ctx.fillStyle='#777';
        for(let i=0;i<450;i++){
          seed=(1664525*seed+1013904223)>>>0;
          const x=seed%canvas.width;
          seed=(1664525*seed+1013904223)>>>0;
          const y=seed%canvas.height;
          ctx.fillRect(x,y,1,1);
        }
      }
      return canvas.toDataURL('image/jpeg',isLow?0.52:0.65).split(',')[1];
    },variation);
    const name='fictional-scan-'+variation+'.pdf';
    const pdf=createScannedPdf(Buffer.from(jpegBase64,'base64'),1100,550);
    await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
      name,mimeType:'application/pdf',buffer:pdf
    });
    await page.locator('.card select').first().locator('option')
      .filter({hasText:name}).waitFor({state:'attached',timeout:150000});
    await page.locator('.card select').first().selectOption({label:name});
    await page.locator('.source-completeness').getByText(/PDF page 1 before export/i)
      .waitFor({timeout:150000});
    const actual=await page.locator('.preview').innerText();
    assert.match(actual,/^Page 1:/,'scanned provenance must remain page derived');
    const literalMatches=Object.fromEntries(expectedTable.map(token=>[
      token,new RegExp('(^|[^0-9.])'+token.replace('.','\\.')+'($|[^0-9.])').test(actual)
    ]));
    const exactFieldCount=Object.values(literalMatches).filter(Boolean).length;
    fictionalScans.push({fixture:name,variation,exactFieldCount,literalMatches});
    assert.equal(await page.locator('.source-completeness input[type="checkbox"]').count(),1,
      'all scanned text must remain unverified pending original-page review');
    assert.equal(external.length,0,'degraded scanned PDF must remain offline');
    console.log('REAL BROWSER: '+variation+' fictional raster OCR '+exactFieldCount+
      '/'+expectedTable.length+' exact literals; requires source review.');
  }
  writeFileSync('tmp/fictional-scanned-pdf-ocr.json',JSON.stringify({
    cohort:'fictional scanned PDF visual-condition matrix',
    status:'measured_not_certified',kind:'physical-raster-pdf',
    evidenceStatus:'unverified_ocr_transcription',
    expectedTable,denominatorPerFixture:expectedTable.length,
    cases:fictionalScans,networkRequests:external.length,
    citationPrecision:'pdf-page-ocr (no fabricated cell or glyph boxes)',
    limitations:'Exact token occurrence is not cell association, reading order or factual support.'
  },null,2)+'\n');



  // Multi-page, image-only holdout: each page has distinct fictional facts.
  // Capture literal accuracy, wrong-page citations and row association
  // separately. Only page-level PDF provenance is available for raster OCR.
  const multiScanJpegs=await page.evaluate(()=>{
    const plans=[
      {title:'FICTIONAL PLAN ALPHA',rows:[['55','0.8750'],['65','1.0000']]},
      {title:'FICTIONAL PLAN BETA',rows:[['60','0.8125'],['62','0.9375']]},
      {title:'FICTIONAL PLAN GAMMA',rows:[['58','0.9063'],['64','0.9813']]}
    ];
    return plans.map((plan,i)=>{
      const canvas=document.createElement('canvas');
      canvas.width=1000;canvas.height=540;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle=i===1?'#e8e8e8':'#fff';
      ctx.fillRect(0,0,1000,540);
      if(i===2){
        ctx.translate(500,270);
        ctx.rotate(1.25*Math.PI/180);
        ctx.translate(-500,-270);
      }
      ctx.fillStyle=i===1?'#686868':'#111';
      ctx.font='bold 41px Arial';
      ctx.fillText(plan.title,52,78);
      ctx.font='bold 34px Arial';
      ctx.fillText('AGE',80,164);
      ctx.fillText('MONTHLY FACTOR',440,164);
      if(i===1){
        ctx.strokeStyle='#b9b9b9';ctx.lineWidth=2;
        for(const y of [188,287,384]){
          ctx.beginPath();ctx.moveTo(52,y);ctx.lineTo(835,y);ctx.stroke();
        }
        ctx.beginPath();ctx.moveTo(385,184);ctx.lineTo(385,388);ctx.stroke();
      }
      ctx.font='36px Arial';
      for(let r=0;r<plan.rows.length;r++){
        const y=248+r*97;
        ctx.fillText(plan.rows[r][0],80,y);
        ctx.fillText(plan.rows[r][1],440,y);
      }
      ctx.font='25px Arial';
      ctx.fillText('SYNTHETIC TEST ONLY',52,474);
      return canvas.toDataURL('image/jpeg',i===1?0.58:0.88).split(',')[1];
    });
  });
  const multiScanPdf=createMultiPageScannedPdf(multiScanJpegs.map(jpeg64=>({
    jpeg:Buffer.from(jpeg64,'base64'),width:1000,height:540
  })));
  const multiScanName='fictional-three-page-scanned-schedules.pdf';
  await filePicker.setInputFiles({
    name:multiScanName,mimeType:'application/pdf',buffer:multiScanPdf
  });
  await page.locator('.card select').first().locator('option')
    .filter({hasText:multiScanName}).waitFor({state:'attached',timeout:180000});
  await page.locator('.card select').first().selectOption({label:multiScanName});
  const multiReview=page.locator('.source-completeness');
  await multiReview.getByText(/PDF page 3 before export/i).waitFor({timeout:180000});
  const multipageText=await page.locator('.preview').innerText();
  const pageMatches=[...multipageText.matchAll(/(?:^|\n)Page (\d+):\n([\s\S]*?)(?=\nPage \d+:\n|$)/g)];
  assert.deepEqual(pageMatches.map(match=>Number(match[1])),[1,2,3],
    'OCR text must keep all three parser-derived page labels in order');
  const bodyByPage=Object.fromEntries(pageMatches.map(match=>[Number(match[1]),match[2]]));
  const expectedPages=[
    {page:1,rows:[['55','0.8750'],['65','1.0000']]},
    {page:2,rows:[['60','0.8125'],['62','0.9375']]},
    {page:3,rows:[['58','0.9063'],['64','0.9813']]}
  ];
  const hasLiteral=(body,token)=>new RegExp('(^|[^0-9.])'+
    token.replaceAll('.','\\.')+'($|[^0-9.])').test(body);
  const pageResults=expectedPages.map(entry=>{
    const body=bodyByPage[entry.page];
    const literals=entry.rows.flat();
    const literalHits=Object.fromEntries(literals.map(value=>[value,hasLiteral(body,value)]));
    // A candidate pair counts only when OCR keeps a row on one line.
    // Cross-column matches elsewhere are NOT counted as correct table cells.
    const rowPairHits=entry.rows.map(([age,factor])=>
      new RegExp('(?:^|\\n)\\s*'+age+'\\s+'+factor.replace('.','\\.')+
        '(?:\\s|$)').test(body));
    const wrongPageLiterals=expectedPages.filter(other=>other.page!==entry.page)
      .flatMap(other=>other.rows.flat())
      .filter(value=>hasLiteral(body,value));
    return {
      page:entry.page,
      literalsRecognized:Object.values(literalHits).filter(Boolean).length,
      literalDenominator:literals.length,literalHits,
      rowPairsRecognized:rowPairHits.filter(Boolean).length,
      rowPairDenominator:entry.rows.length,rowPairHits,
      wrongPageLiterals,characters:body.length
    };
  });
  assert.ok(pageResults.every(result=>result.wrongPageLiterals.length===0),
    'a unique fictional numeric fact must not be attributed to another PDF page');
  assert.equal(await multiReview.locator('input[type="checkbox"]').count(),3,
    'all three OCR pages independently require original-page review');
  await page.getByRole('button',{name:'View original page 3'}).click();
  await page.getByText(/Original PDF — page 3 of 3/).waitFor({timeout:20000});
  await page.getByRole('button',{name:'Close PDF view'}).click();
  assert.equal(external.length,0,'multipage OCR must not make network requests');
  writeFileSync('tmp/fictional-multipage-scanned-pdf-ocr.json',JSON.stringify({
    cohort:'independent three-page fictional scanned PDF',
    source:'image-only JPEG XObjects in one real multi-page PDF',
    evidenceStatus:'unverified_ocr_transcription',
    citationPrecision:'parser-derived pdf-page-ocr; no cell or glyph boxes',
    pageResults,wrongPageCitationErrors:pageResults.reduce(
      (sum,item)=>sum+item.wrongPageLiterals.length,0),
    networkRequests:external.length,
    limitations:'A row-pair regex is only a diagnostic; visually verify original cell association and reading order.'
  },null,2)+'\n');
  console.log('REAL BROWSER: fictional multi-page OCR measured '+
    pageResults.map(item=>item.literalsRecognized+'/'+item.literalDenominator+
      ' literals, '+item.rowPairsRecognized+'/'+item.rowPairDenominator+
      ' exact adjacent row pairs on page '+item.page).join('; ')+
    '; three mandatory source reviews; zero wrong-page matches.');

  // Mixed-content PDFs can hide provisions in images despite a valid text
  // layer. Require the user's explicit original-page review before export.
  const mixedPdf=createScannedPdf(Buffer.from(jpeg64,'base64'),950,230,'FICTIONAL PLAN HEADER');
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name:'mixed-synthetic.pdf',mimeType:'application/pdf',buffer:mixedPdf
  });
  const sourcePanel=page.locator('.source-completeness');
  await sourcePanel.getByText(/combines selectable text with image content/i).waitFor({timeout:30000});

  // Run supplemental local OCR explicitly. Keep PDF.js native text and
  // unverified OCR words as separate page-derived evidence records.
  await page.getByRole('button',{name:'OCR mixed PDF pages'}).click();
  await page.locator('.preview').getByText(/Page 1 supplementary OCR:/)
    .waitFor({timeout:150000});
  const mixedPreview=await page.locator('.preview').innerText();
  assert.match(mixedPreview,/Page 1:\nFICTIONAL PLAN HEADER/);
  assert.match(mixedPreview,/Page 1 supplementary OCR:/);
  await sourcePanel.getByText(/Supplemental full-page OCR was run separately/i)
    .waitFor({timeout:10000});
  assert.equal(await sourcePanel.locator('input[type="checkbox"]').count(),1);
  assert.equal(await page.getByRole('button',{name:'OCR mixed PDF pages'}).isDisabled(),true);
  await page.screenshot({path:'tmp/smoke-mixed-pdf-supplemental.png',fullPage:true});
  console.log('REAL BROWSER: supplemental mixed PDF OCR kept separate from native PDF text.');

  await page.getByRole('button',{name:'Extract JSON',exact:true}).click();
  await page.getByRole('button',{name:'Review source issues in Documents'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Review source issues in Documents'}).click();
  await sourcePanel.locator('input[type="checkbox"]').check();
  await sourcePanel.getByText(/Source issue acknowledgements complete/i).waitFor({timeout:10000});
  await page.getByRole('button',{name:'View original page 1'}).click();
  await page.getByRole('dialog',{name:'Original PDF page'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Close PDF view'}).click();
  console.log('REAL BROWSER: mixed PDF supplemental OCR requires original-page review.');

  await page.screenshot({path:'tmp/smoke-scanned-pdf.png',fullPage:true});

  console.log('REAL BROWSER: PDF.js extracted both pages with page labels from file://.');

  // Exercise ZIP-based Office and CSV import in the actual offline file build,
  // not merely in Node parser unit tests.
  const docxMarkup='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Normal retirement 65</w:t></w:r></w:p></w:body></w:document>';
  const docxFile=zipSync({
    '[Content_Types].xml':strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'word/document.xml':strToU8(docxMarkup)
  },{level:0});
  await page.locator('input[type="file"][accept*=".docx"]').setInputFiles({
    name:'synthetic.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:Buffer.from(docxFile)
  });
  await page.waitForFunction(() =>
    document.querySelector('.preview')?.textContent?.includes('Paragraph 1: Normal retirement 65'),
    null,{timeout:30000}
  );
  console.log('REAL BROWSER: DOCX paragraph provenance verified offline.');

  // Verify that the bundled browser actually uses final-view DOCX text and
  // requires the original-document review for unaccepted revisions / hidden runs.
  const revisedDocxMarkup='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
    '<w:p><w:r><w:t xml:space="preserve">Normal retirement </w:t></w:r>'+
      '<w:del><w:r><w:t>62</w:t></w:r></w:del>'+
      '<w:ins><w:r><w:t>65</w:t></w:r></w:ins>'+
      '<w:r><w:rPr><w:vanish/></w:rPr><w:t>Secret obsolete amendment</w:t></w:r></w:p>'+
    '<w:sdt><w:sdtContent><w:p><w:r><w:t>Vesting service 5</w:t></w:r></w:p></w:sdtContent></w:sdt>'+
    '</w:body></w:document>';
  const revisedDocxFile=zipSync({
    '[Content_Types].xml':strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'word/document.xml':strToU8(revisedDocxMarkup)
  },{level:0});
  await page.locator('input[type="file"][accept*=".docx"]').setInputFiles({
    name:'synthetic-revisions.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:Buffer.from(revisedDocxFile)
  });
  await page.waitForFunction(() =>
    document.querySelector('.preview')?.textContent?.includes('Paragraph 2: Vesting service 5'),
    null,{timeout:30000}
  );
  const revisedText=await page.locator('.preview').innerText();
  assert.match(revisedText,/Paragraph 1: Normal retirement 65/);
  assert.doesNotMatch(revisedText,/Secret obsolete amendment|Normal retirement 62/);
  const revisedReview=page.locator('.source-completeness');
  await revisedReview.getByText(/Tracked changes exist/i).waitFor({timeout:10000});
  await revisedReview.getByText(/Directly hidden Word runs were excluded/i).waitFor({timeout:10000});
  assert.equal(await revisedReview.locator('input[type="checkbox"]').count(),2);
  await page.getByRole('button',{name:'Extract JSON',exact:true}).click();
  await page.getByRole('button',{name:'Review source issues in Documents'}).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Review source issues in Documents'}).click();
  for(let i=0;i<2;i++)await revisedReview.locator('input[type="checkbox"]').nth(i).check();
  await revisedReview.getByText(/Source issue acknowledgements complete/i).waitFor({timeout:10000});
  await page.screenshot({path:'tmp/smoke-docx-revisions.png',fullPage:true});
  console.log('REAL BROWSER: DOCX revision/hidden-text exclusions and source review verified offline.');


  const sheetXml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>NormalAge</t></is></c><c r="B1"><v>65</v></c></row></sheetData></worksheet>';
  const xlsxFile=zipSync({
    'xl/workbook.xml':strToU8('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plan Data" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml':strToU8(sheetXml)
  },{level:0});
  await page.locator('input[type="file"][accept*=".xlsx"]').setInputFiles({
    name:'synthetic.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer:Buffer.from(xlsxFile)
  });
  await page.waitForFunction(() =>
    document.querySelector('.preview')?.textContent?.includes('Plan Data!B1: 65'),
    null,{timeout:30000}
  );
  console.log('REAL BROWSER: XLSX sheet/cell provenance verified offline.');

  await page.locator('input[type="file"][accept*=".csv"]').setInputFiles({
    name:'synthetic.csv',mimeType:'text/csv',
    buffer:Buffer.from('Field,Value\r\nNormalAge,65\r\n')
  });
  await page.waitForFunction(() =>
    document.querySelector('.preview')?.textContent?.includes('Row 2 column 2: 65'),
    null,{timeout:30000}
  );
  console.log('REAL BROWSER: CSV row/column provenance verified offline.');

  await page.getByRole('button',{name:'Extract JSON',exact:true}).click();
  // Schema validation must run in strict CSP without compiling dynamic JavaScript.
  await page.getByRole('button',{name:'Check schema'}).click();
  await page.getByText(/Schema is valid for local validation/i).waitFor({timeout:25000});
  console.log('REAL BROWSER: JSON Schema validates with CSP unsafe-eval prohibited.');
  // A user-provided remote $ref must be rejected before any network access.
  const editor=page.getByRole('textbox',{name:'Target JSON Schema'});
  const normalSchema=await editor.inputValue();
  await editor.fill(JSON.stringify({type:'object',properties:{age:{$ref:'https://external.invalid/schema'}}}));
  await page.getByRole('button',{name:'Check schema'}).click();
  await page.getByRole('alert').getByText(/Only local JSON Pointer \$ref values are allowed/i).waitFor({timeout:25000});
  await editor.fill(normalSchema);
  await page.getByRole('button',{name:'Check schema'}).click();
  await page.getByText(/Schema is valid for local validation/i).waitFor({timeout:25000});
  await page.getByRole('button',{name:'Documents',exact:true}).click();

  await page.locator('input[type="file"][accept=".gguf"]').setInputFiles(fixture);
  await page.getByRole('button', { name: 'Load model' }).click();
  await page.getByText('Loaded: stories260K.gguf').waitFor({ timeout: 30000 });

  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const corpusButton=page.getByRole('button',{name:'Run eight-case benchmark'});
  await corpusButton.waitFor({timeout:10000});
  assert.equal(await corpusButton.isEnabled(),true);
  await page.getByText(/Measure your actual local model on eight fictional provisions/i)
    .waitFor({timeout:10000});
  await page.getByRole('button',{name:'Documents',exact:true}).click();
  console.log('REAL BROWSER: on-device eight-case fictional benchmark UI is available offline.');

  await page.getByRole('button', { name: 'Test model' }).click();
  await page.getByText(/Your local model generated text/i).waitFor({ timeout: 90000 });
  const performanceStatus=await page.getByText(/Your local model generated text/i).innerText();
  assert.match(performanceStatus,/s until first text/);
  assert.match(performanceStatus,/characters\/s end-to-end/);
  console.log('REAL BROWSER: local GGUF first-output latency and character throughput reported.');

  // Verify the Guide really prints as a standalone readable PDF, not a
  // screenshot of the application or leaked imported document content.
  await page.getByRole('button',{name:'Guide',exact:true}).click();
  await page.getByRole('dialog',{name:'User guide'}).waitFor({timeout:10000});
  assert.equal(await page.getByRole('button',{name:'Close guide'}).evaluate(el=>el===document.activeElement),true);
  await page.emulateMedia({media:'print'});
  const guideBytes=await page.pdf({
    path:'tmp/guide-print.pdf',
    printBackground:true,
    preferCSSPageSize:true
  });
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const guideTask=getDocument({
    data:Uint8Array.from(guideBytes),
    disableFontFace:true,useSystemFonts:true,useWasm:false
  });
  const guidePdf=await guideTask.promise;
  assert.ok(guidePdf.numPages>=1 && guidePdf.numPages<=3,
    'Printable guide should fit into 1–3 A4 pages');
  let guideText='';
  for(let n=1;n<=guidePdf.numPages;n++){
    const p=await guidePdf.getPage(n);
    const pageText=await p.getTextContent();
    guideText+=' '+pageText.items.filter(x=>'str' in x).map(x=>x.str).join(' ');
    const v=p.getViewport({scale:1});
    assert.ok(v.width>=590 && v.width<=600 && v.height>=840 && v.height<=845,
      'Print should use A4 paper');
  }
  assert.match(guideText,/Start here/i);
  assert.match(guideText,/Load a model/i);
  assert.match(guideText,/Export the result/i);
  assert.doesNotMatch(guideText,/scanned-synthetic\.pdf|synthetic\.csv|RETIREMENT AGE 65/,
    'Guide-only print may not include imported user data');
  await guideTask.destroy();
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Close guide'}).click();
  assert.equal(await page.getByRole('dialog',{name:'User guide'}).count(),0);
  console.log('REAL BROWSER: printable A4 guide contains instructions without source data.');
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
