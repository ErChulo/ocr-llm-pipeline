/**
 * Original-JPEG / Tesseract regression for repeated factors in an entirely
 * fictional table. Source word pixels are measured; authored rectangles are
 * scoring references ONLY, never exported source evidence.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createWorker,OEM} from 'tesseract.js';
import {getDocument,OPS} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createScannedPdf} from './pdf-fixture.mjs';
import {measuredTesseractWords} from '../src/ocrWords.ts';
import {assessSpatialOcrRows} from '../src/ocrSpatial.ts';
import {measuredWordInsideCell} from './fixtures/spatialCellMetrics.mjs';

const W=1100,H=550;
const expected=[
 {age:'58',factor:'1.0000',ageCell:[60,196,160,270],factorCell:[420,196,655,270]},
 {age:'64',factor:'1.0000',ageCell:[60,277,160,365],factorCell:[420,277,655,365]}
];
const external=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
let jpeg;
try{
 const page=await browser.newPage();
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(/^(https?|wss?):/i.test(url)){external.push(url);await route.abort();}
  else await route.continue();
 });
 jpeg=Buffer.from(await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=1100;canvas.height=550;
  const c=canvas.getContext('2d');
  c.fillStyle='#fff';c.fillRect(0,0,1100,550);
  c.fillStyle='#111';c.font='bold 42px Arial';
  c.fillText('FICTIONAL TEST SCHEDULE',46,78);
  c.font='bold 32px Arial';
  c.fillText('AGE',72,170);c.fillText('MONTHLY FACTOR',445,170);
  c.font='34px Arial';
  c.fillText('58',80,247);c.fillText('1.0000',440,247);
  c.fillText('64',80,344);c.fillText('1.0000',440,344);
  return canvas.toDataURL('image/jpeg',0.92).split(',')[1];
 }), 'base64');
 await page.close();
}finally{await browser.close();}
assert.deepEqual(external,[],'Test must generate source raster without network');
const pdf=createScannedPdf(jpeg,W,H);
const documentTask=getDocument({data:Uint8Array.from(pdf),useWasm:false,disableFontFace:true});
try{
 const doc=await documentTask.promise;
 assert.equal(doc.numPages,1);
 const page=await doc.getPage(1);
 assert.equal((await page.getTextContent()).items.length,0,
  'Original fictional source must have no fabricated text layer');
 const ops=await page.getOperatorList();
 assert.ok(ops.fnArray.some(fn=>fn===OPS.paintImageXObject),
  'Original PDF must contain actual JPEG XObject');
 page.cleanup();
}finally{await documentTask.destroy();}
const worker=await createWorker('eng',OEM.LSTM_ONLY,{
 langPath:resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
 cacheMethod:'none',gzip:true
});
let report;
try{
 const {data}=await worker.recognize(jpeg,{}, {text:true,blocks:true});
 const text=data.text??'';
 const words=measuredTesseractWords(data.blocks,W,H);
 const assessment=assessSpatialOcrRows({page:1,imageWidth:W,imageHeight:H,text,words});
 const box=(measured,r)=>measuredWordInsideCell({bbox:measured},
  {x0:r[0]/W,y0:r[1]/H,x1:r[2]/W,y1:r[3]/H},W,H);
 const unmatched=new Set(expected.map((_,i)=>i));
 let truePositive=0,falsePositive=0;
 for(const pair of assessment.pairs){
  const index=expected.findIndex((row,i)=>unmatched.has(i)&&
   pair.page===1&&pair.age.text===row.age&&pair.factor.text===row.factor&&
   box(pair.age.bbox,row.ageCell)&&box(pair.factor.bbox,row.factorCell));
  if(index<0)falsePositive++;
  else{unmatched.delete(index);truePositive++;}
  assert.equal(text.slice(pair.transcriptRanges.age.start,
    pair.transcriptRanges.age.end),pair.age.text,'Age citation must be an exact OCR substring');
  assert.equal(text.slice(pair.transcriptRanges.factor.start,
    pair.transcriptRanges.factor.end),pair.factor.text,'Factor citation must be an exact OCR substring');
 }
 report={
  cohort:'fictional-original-JPEG-repeated-factor-v1',
  source:'one raster-only PDF page, actual JPEG XObject',
  sourceProvenance:'parser PDF page + Tesseract measured word rectangles',
  groundTruth:'fixed independently drawn cell regions, never a source citation',
  pageCount:1,expectedPairs:expected.length,truePositive,falsePositive,
  falseNegative:unmatched.size,wrongPage:assessment.pairs.filter(p=>p.page!==1).length,
  status:assessment.status,reason:assessment.reason,
  acceptedPrecision:truePositive+falsePositive?truePositive/(truePositive+falsePositive):null,
  recall:truePositive/expected.length,
  originalJpegBytes:jpeg.length,externalRequests:external.length,
  observedText:text,observedWords:words.map(w=>({text:w.text,bbox:w.bbox})),
  limitation:'Known development fixture, not independent blinded production evidence'
 };
 mkdirSync('tmp',{recursive:true});
 writeFileSync('tmp/repeated-factor-raster-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('REPEATED FACTOR RASTER REPORT',JSON.stringify(report));
 assert.equal(assessment.status,'candidates');
 assert.equal(truePositive,2,'Both repeated OCR factor rows must be traceably associated');
 assert.equal(falsePositive,0,'Never accept a false association');
 assert.equal(unmatched.size,0,'No silently omitted eligible row');
}finally{await worker.terminate();}
