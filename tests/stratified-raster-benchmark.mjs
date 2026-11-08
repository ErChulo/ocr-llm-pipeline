/**
 * Measured, twelve-page, entirely fictional raster PDF benchmark.
 * Original JPEG XObjects are read by actual local Tesseract. Reference
 * regions come from the authored visual layout BEFORE OCR and cannot become
 * source citations. This is a development fixture, NOT a blinded holdout.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createWorker,OEM} from 'tesseract.js';
import {getDocument,OPS} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createMultiPageScannedPdf} from './pdf-fixture.mjs';
import {measuredTesseractWords} from '../src/ocrWords.ts';
import {assessSpatialOcrRows} from '../src/ocrSpatial.ts';
import {reorientedBoxToOriginalPixels} from '../src/ocrGeometryRotation.ts';
import {measuredWordInsideCell,MIN_WORD_REGION_COVERAGE} from './fixtures/spatialCellMetrics.mjs';

const cases=[
 {kind:'baseline',rows:[['55','0.8750'],['65','1.0000']]},
 {kind:'low-contrast',rows:[['60','0.8125'],['62','0.9375']]},
 {kind:'skew-plus',rows:[['58','0.9063'],['64','0.9813']]},
 {kind:'skew-minus',rows:[['57','0.8234'],['63','0.9471']]},
 {kind:'blur-jpeg',rows:[['59','0.9218'],['69','1.0837']]},
 {kind:'small-serif',rows:[['53','0.7346'],['67','1.0432']]},
 {kind:'ruled-table',rows:[['52','0.7124'],['70','1.1179']]},
 {kind:'pixels-rotated-90',rotation:90,rows:[['56','0.8461'],['68','1.0691']]},
 {kind:'pixels-rotated-180',rotation:180,rows:[['54','0.7791'],['66','1.0245']]},
 {kind:'pixels-rotated-270',rotation:270,rows:[['51','0.6947'],['71','1.1283']]},
 {kind:'intervening-service',requiredAbstention:true,rows:[['58','0.9063'],['64','0.9813']]},
 {kind:'numeric-note-clutter',rows:[['61','0.8917'],['73','1.1623']]}
];
const W=1100,H=550;
const originalCells=[
 {age:[60,196,160,270],factor:[420,196,655,270]},
 {age:[60,277,160,365],factor:[420,277,655,365]}
];
// Authored reference transform based ONLY on known raster drawing geometry.
// Do not use production inverse-geometry helpers or measured OCR coordinates.
function originalGoldRegion([x0,y0,x1,y1],rotation=0){
 switch(rotation){
  case 0:return [x0,y0,x1,y1];
  case 90:return [H-y1,x0,H-y0,x1];
  case 180:return [W-x1,H-y1,W-x0,H-y0];
  case 270:return [y0,W-x1,y1,W-x0];
  default:throw Error('Invalid fictional pixel rotation');
 }
}
const gold=cases.map((scenario,i)=>({
 page:i+1,
 rows:scenario.requiredAbstention?[]:scenario.rows.map(([age,factor],index)=>({
  age,factor,ageRect:originalGoldRegion(originalCells[index].age,scenario.rotation),
  factorRect:originalGoldRegion(originalCells[index].factor,scenario.rotation)
 }))
}));
const inBounds=(r,w,h)=>r.length===4&&r.every(Number.isFinite)&&
  r[0]>=0&&r[1]>=0&&r[2]>r[0]&&r[3]>r[1]&&r[2]<=w&&r[3]<=h;
const insideGold=(measured,r,w,h)=>measuredWordInsideCell({bbox:measured},{
 x0:r[0]/w,y0:r[1]/h,x1:r[2]/w,y1:r[3]/h
},w,h);
const literalPresent=(body,token)=>new RegExp(
 '(^|[^0-9A-Za-z_.+\\-])'+token.replaceAll('.','\\.')+'(?=$|[^0-9A-Za-z_.,])'
).test(body);

const external=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
let rasters=[];
try{
 const page=await browser.newPage();
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(/^(https?|wss?):/i.test(url)){external.push(url);await route.abort();}
  else await route.continue();
 });
 rasters=await page.evaluate(async (cases)=>Promise.all(cases.map(async s=>{
  const base=document.createElement('canvas');
  base.width=1100;base.height=550;
  const c=base.getContext('2d');
  const low=s.kind==='low-contrast',small=s.kind==='small-serif';
  c.fillStyle=low?'#ececec':'#fff';c.fillRect(0,0,1100,550);
  if(s.kind==='skew-plus'||s.kind==='skew-minus'){
   c.translate(550,275);
   c.rotate((s.kind==='skew-plus'?1.25:-1.25)*Math.PI/180);
   c.translate(-550,-275);
  }
  c.fillStyle=low?'#747474':'#111';
  c.font=small?'bold 22px Georgia':'bold 42px Arial';
  c.fillText('FICTIONAL TEST SCHEDULE',46,78);
  c.font=small?'bold 21px Georgia':'bold 32px Arial';
  c.fillText('AGE',72,170);c.fillText('MONTHLY FACTOR',445,170);
  c.font=small?'19px Georgia':'34px Arial';
  s.rows.forEach(([age,factor],i)=>{
   c.fillText(age,80,247+i*97);
   c.fillText(factor,440,247+i*97);
  });
  if(s.kind==='intervening-service'){
   c.font='bold 26px Arial';c.fillText('SERVICE',270,170);
   c.font='34px Arial';c.fillText('20',290,247);c.fillText('30',290,344);
  }
  if(s.kind==='ruled-table'){
   c.strokeStyle='#999';c.lineWidth=2;
   for(const y of [187,281,382]){
    c.beginPath();c.moveTo(53,y);c.lineTo(810,y);c.stroke();
   }
   c.beginPath();c.moveTo(395,185);c.lineTo(395,382);c.stroke();
  }
  if(s.kind==='numeric-note-clutter'){
   c.fillStyle='#777';c.font='20px Arial';
   c.fillText('Schedule reviewed 2025, example only',49,436);
   c.fillText('FORM 7A',650,470);
  }
  let drawn=base;
  if(s.kind==='blur-jpeg'){
   const b=document.createElement('canvas');b.width=1100;b.height=550;
   const cb=b.getContext('2d');
   cb.fillStyle='#fff';cb.fillRect(0,0,1100,550);
   cb.filter='blur(1.1px)';cb.drawImage(base,0,0);
   drawn=b;
  }
  if(s.rotation){
   const rotated=document.createElement('canvas');
   rotated.width=s.rotation===180?1100:550;
   rotated.height=s.rotation===180?550:1100;
   const cr=rotated.getContext('2d');
   cr.fillStyle='#fff';cr.fillRect(0,0,rotated.width,rotated.height);
   if(s.rotation===90){cr.translate(550,0);cr.rotate(Math.PI/2);}
   else if(s.rotation===180){cr.translate(1100,550);cr.rotate(Math.PI);}
   else{cr.translate(0,1100);cr.rotate(-Math.PI/2);}
   cr.drawImage(drawn,0,0);drawn=rotated;
  }
  const quality=s.kind==='blur-jpeg'?0.56:low?0.55:0.92;
  const jpeg=drawn.toDataURL('image/jpeg',quality).split(',')[1];
  let correctedJpeg=null;
  if(s.rotation){
   // A test-only probe: decode the ACTUAL JPEG encoded for this PDF page,
   // undo its authored quarter-turn, then independently measure OCR again.
   // Neither raster nor its geometry is selected by the deployed application.
   const decoded=new Image();
   decoded.src='data:image/jpeg;base64,'+jpeg;
   await decoded.decode();
   const corrected=document.createElement('canvas');
   corrected.width=1100;corrected.height=550;
   const cc=corrected.getContext('2d');
   cc.fillStyle='#fff';cc.fillRect(0,0,1100,550);
   if(s.rotation===90){cc.translate(0,550);cc.rotate(-Math.PI/2);}
   else if(s.rotation===180){cc.translate(1100,550);cc.rotate(Math.PI);}
   else{cc.translate(1100,0);cc.rotate(Math.PI/2);}
   cc.drawImage(decoded,0,0);
   correctedJpeg=corrected.toDataURL('image/jpeg',0.96).split(',')[1];
  }
  return {jpeg,correctedJpeg,width:drawn.width,height:drawn.height};
 })),cases);
 await page.close();
}finally{await browser.close();}
assert.equal(external.length,0,'Offline fictional fixture generation made external requests');
const images=rasters.map(x=>({
 jpeg:Buffer.from(x.jpeg,'base64'),width:x.width,height:x.height
}));
const correctedImages=rasters.map(r=>r.correctedJpeg?
 Buffer.from(r.correctedJpeg,'base64'):null);
const pdf=createMultiPageScannedPdf(images);
assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
const task=getDocument({data:Uint8Array.from(pdf),useWasm:false,disableFontFace:true});
try{
 const doc=await task.promise;
 assert.equal(doc.numPages,cases.length);
 for(let i=1;i<=cases.length;i++){
  const page=await doc.getPage(i);
  const operations=await page.getOperatorList();
  assert.ok(operations.fnArray.some(op=>[
   OPS.paintImageXObject,OPS.paintInlineImageXObject
  ].includes(op)),'Missing real image XObject on PDF page '+i);
  assert.equal((await page.getTextContent()).items.filter(x=>'str' in x)
   .map(x=>x.str).join('').trim(),'','Raster PDF must have no fabricated text layer');
  page.cleanup();
 }
}finally{await task.destroy();}
const worker=await createWorker('eng',OEM.LSTM_ONLY,{
 langPath:resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
 cacheMethod:'none',gzip:true
});
const metric={
 pageCount:cases.length,expectedRows:gold.reduce((sum,p)=>sum+p.rows.length,0),
 truePositive:0,falsePositive:0,falseNegative:0,acceptedPairs:0,
 abstainedPages:0,wrongPage:0,requiredAmbiguousAbstentions:0,
 recognizedNumericLiterals:0,expectedNumericLiterals:cases.length*4
};
const rows=[];
try{
 for(let i=0;i<cases.length;i++){
  const fixture=cases[i],source=images[i],page=i+1,reference=gold[i];
  assert.equal(reference.page,page);
  for(const r of reference.rows){
   assert.ok(inBounds(r.ageRect,source.width,source.height));
   assert.ok(inBounds(r.factorRect,source.width,source.height));
  }
  const {data}=await worker.recognize(source.jpeg,{}, {text:true,blocks:true});
  const ocrText=data.text||'';
  const words=measuredTesseractWords(data.blocks,source.width,source.height);
  const assessment=assessSpatialOcrRows({
   page,imageWidth:source.width,imageHeight:source.height,text:ocrText,words
  });
  if(assessment.status==='abstain')metric.abstainedPages++;
  if(fixture.requiredAbstention){
   assert.equal(assessment.status,'abstain',
    'Numeric service-column ambiguity must not produce accepted spatial pairs');
   metric.requiredAmbiguousAbstentions++;
  }
  const matched=new Set();
  let correct=0,falseMatches=0;
  for(const pair of assessment.pairs){
   metric.acceptedPairs++;
   if(pair.page!==page){metric.wrongPage++;falseMatches++;continue;}
   assert.equal(pair.precision,'tesseract-raster-word-envelope');
   const at=reference.rows.findIndex((r,j)=>!matched.has(j)&&
    r.age===pair.age.text&&r.factor===pair.factor.text&&
    insideGold(pair.age.bbox,r.ageRect,source.width,source.height)&&
    insideGold(pair.factor.bbox,r.factorRect,source.width,source.height));
   if(at>=0){matched.add(at);correct++;metric.truePositive++;}
   else{falseMatches++;metric.falsePositive++;}
  }
  const missed=reference.rows.length-matched.size;
  metric.falseNegative+=missed;
  const literalHits=fixture.rows.flat().filter(token=>literalPresent(ocrText,token)).length;
  metric.recognizedNumericLiterals+=literalHits;
  rows.push({page,condition:fixture.kind,rotation:fixture.rotation||0,
   rasterWidth:source.width,rasterHeight:source.height,
   confidence:data.confidence??null,wordCount:words.length,
   // Diagnostic only: actually measured OCR header words on fictional pages.
   // Source coordinates are NEVER reconstructed from the transcript.
   measuredHeaderWords:words.filter(w=>/^(AGE|FACTOR|MONTHLY)$/i.test(w.text))
    .map(w=>({text:w.text,confidence:w.confidence,bbox:w.bbox})),
   fictionalOcrExcerpt:ocrText.slice(0,180),
   numericLiteralHits:literalHits,numericLiteralDenominator:4,
   status:assessment.status,reason:assessment.reason,
   acceptedPairs:assessment.pairs.length,truePositive:correct,
   falsePositive:falseMatches,falseNegative:missed,
   eligibleReferenceRows:reference.rows.length});
 }
}finally{await worker.terminate();}
const ratio=(n,d)=>d?n/d:null;
const report={
 cohort:'twelve-page-fictional-stratified-JPEG-XObject-Tesseract-v1',
 source:'twelve raster-only pages in a parser-validated actual PDF',
 groundTruth:'fixed fixture-authored visual cell regions, never OCR-derived',
 provenance:'actual Tesseract word pixels and parser-derived PDF page numbers',
 scoring:'95% measured word-box area overlap inside independently authored cell',
 coverageThreshold:MIN_WORD_REGION_COVERAGE,
 originalPdfBytes:pdf.length,
 ...metric,
 acceptedPrecision:ratio(metric.truePositive,metric.truePositive+metric.falsePositive),
 recall:ratio(metric.truePositive,metric.truePositive+metric.falseNegative),
 abstentionRate:metric.abstainedPages/metric.pageCount,
 numericLiteralRecall:ratio(metric.recognizedNumericLiterals,metric.expectedNumericLiterals),
 externalRequests:external.length,cases:rows,status:'measured_not_certified',
 limitations:'Development fixture generated from known drawing layouts, not a blinded independent sample or 500-page production test. No PDF.js rerender-equivalence claim.'
};
mkdirSync('tmp',{recursive:true});
writeFileSync('tmp/stratified-raster-report.json',JSON.stringify(report,null,2)+'\n');
console.log('STRATIFIED REAL RASTER REPORT',JSON.stringify(report));
assert.equal(metric.wrongPage,0,'Wrong parser-derived page attribution');
assert.equal(metric.falsePositive,0,'Accepted false spatial association');
assert.equal(metric.requiredAmbiguousAbstentions,1);
assert.equal(external.length,0);
