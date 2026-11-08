/**
 * Offline actual-Tesseract word-envelope benchmark, from independently
 * annotated fictional raster image cells embedded in a real scanned PDF.
 * OCR reads the exact JPEG XObjects authored for the PDF; it does not claim
 * to measure the separate PDF.js resampling path or approve pension facts.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createWorker,OEM} from 'tesseract.js';
import {createMultiPageScannedPdf} from './pdf-fixture.mjs';
import {measuredTesseractWords} from '../src/ocrWords.ts';
import {assessSpatialOcrRows} from '../src/ocrSpatial.ts';
import {reorientedBoxToOriginalPixels} from '../src/ocrGeometryRotation.ts';

mkdirSync('tmp',{recursive:true});
const refs=[
 {page:1,kind:'ordinary-two-column',gold:[
  {age:'55',factor:'0.8750',ageRect:[65,206,145,259],factorRect:[437,206,630,259]},
  {age:'65',factor:'1.0000',ageRect:[65,285,145,340],factorRect:[437,285,630,340]}
 ]},
 {page:2,kind:'intervening-numeric-service-column',gold:[]},
 {page:3,kind:'rotated-90-degree-text',gold:[
  {age:'55',factor:'0.8750',ageRect:[291,65,344,145],factorRect:[291,437,344,630]},
  {age:'65',factor:'1.0000',ageRect:[210,65,265,145],factorRect:[210,437,265,630]}
 ]}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
let jpegs=[];
const correctedJpegs=[];
const external=[];
try{
 const page=await browser.newPage();
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(/^(https?|wss?):/i.test(url)){external.push(url);await route.abort();}
  else await route.continue();
 });
 for(const scenario of refs){
  const raster=await page.evaluate(async ({kind})=>{
   const rotated=kind==='rotated-90-degree-text';
   const canvas=document.createElement('canvas');
   canvas.width=rotated?550:1100;canvas.height=rotated?1100:550;
   const c=canvas.getContext('2d');
   c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);
   if(rotated){c.translate(550,0);c.rotate(Math.PI/2);}
   c.fillStyle='#111';
   c.font='bold 44px Arial';c.fillText('FICTIONAL BENEFIT SCHEDULE',46,78);
   c.font='bold 32px Arial';c.fillText('AGE',72,170);c.fillText('MONTHLY FACTOR',445,170);
   c.font='34px Arial';
   c.fillText('55',72,247);c.fillText('0.8750',445,247);
   c.fillText('65',72,324);c.fillText('1.0000',445,324);
   if(kind==='intervening-numeric-service-column'){
    c.font='bold 26px Arial';c.fillText('SERVICE',270,170);
    c.font='34px Arial';c.fillText('20',290,247);c.fillText('30',290,324);
   }
   const jpeg=canvas.toDataURL('image/jpeg',0.97).split(',')[1];
   let correctedJpeg=null;
   if(rotated){
     // Decode the JPEG actually embedded in the PDF, then undo precisely
     // the applied clockwise quarter-turn in another local raster canvas.
     const decoded=new Image();
     decoded.src='data:image/jpeg;base64,'+jpeg;
     await decoded.decode();
     const corrected=document.createElement('canvas');
     corrected.width=canvas.height;corrected.height=canvas.width;
     const cc=corrected.getContext('2d');
     cc.fillStyle='#fff';cc.fillRect(0,0,corrected.width,corrected.height);
     cc.translate(0,corrected.height);cc.rotate(-Math.PI/2);
     cc.drawImage(decoded,0,0);
     correctedJpeg=corrected.toDataURL('image/jpeg',0.97).split(',')[1];
   }
   return {jpeg,correctedJpeg,width:canvas.width,height:canvas.height};
  },{kind:scenario.kind});
  jpegs.push({jpeg:Buffer.from(raster.jpeg,'base64'),width:raster.width,height:raster.height});
  correctedJpegs.push(raster.correctedJpeg?Buffer.from(raster.correctedJpeg,'base64'):null);
 }
 await page.close();
}finally{await browser.close();}
assert.equal(external.length,0,'Browser fixture creation must have zero external requests');
const pdf=createMultiPageScannedPdf(jpegs);
assert.ok(pdf.subarray(0,5).toString()==='%PDF-','Three JPEG images must be embedded in a real PDF');
const trained=resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int');
const worker=await createWorker('eng',OEM.LSTM_ONLY,{
 langPath:trained,cacheMethod:'none',gzip:true
});
const metric={truePositive:0,falsePositive:0,falseNegative:0,abstained:0,cases:refs.length};
const pageResults=[];
const centerInside=(b,r)=>((b.x0+b.x1)/2>=r[0]&&(b.x0+b.x1)/2<=r[2]&&
 (b.y0+b.y1)/2>=r[1]&&(b.y0+b.y1)/2<=r[3]);
try{
 for(let i=0;i<refs.length;i++){
  const source=refs[i],image=jpegs[i];
  const {data}=await worker.recognize(image.jpeg,{}, {text:true,blocks:true});
  const words=measuredTesseractWords(data.blocks,image.width,image.height);
  const scored=assessSpatialOcrRows({
   page:source.page,imageWidth:image.width,imageHeight:image.height,
   text:data.text||'',words
  });
  if(scored.status==='abstain')metric.abstained++;
  const matched=new Set();
  let tp=0,fp=0;
  for(const p of scored.pairs){
   assert.equal(p.page,source.page,'only author-defined original PDF page may be cited');
   assert.equal(p.imageWidth,image.width);
   assert.equal(p.imageHeight,image.height);
   assert.equal(p.precision,'tesseract-raster-word-envelope');
   assert.equal((data.text||'').slice(p.transcriptRanges.age.start,p.transcriptRanges.age.end),p.age.text);
   assert.equal((data.text||'').slice(p.transcriptRanges.factor.start,p.transcriptRanges.factor.end),p.factor.text);
   const annotation=source.gold.find((g,j)=>!matched.has(j)&&g.age===p.age.text&&
    g.factor===p.factor.text&&centerInside(p.age.bbox,g.ageRect)&&
    centerInside(p.factor.bbox,g.factorRect));
   if(annotation){
    const pos=source.gold.indexOf(annotation);
    matched.add(pos);tp++;metric.truePositive++;
   }else{fp++;metric.falsePositive++;}
  }
  const fn=source.gold.length-matched.size;metric.falseNegative+=fn;
  let orientationProbe=null;
  if(correctedJpegs[i]){
    const corrected=await worker.recognize(correctedJpegs[i],{}, {text:true,blocks:true});
    const unrotatedWords=measuredTesseractWords(corrected.data.blocks,image.height,image.width);
    const assessment=assessSpatialOcrRows({
      page:source.page,imageWidth:image.height,imageHeight:image.width,
      text:corrected.data.text||'',words:unrotatedWords
    });
    const observed=assessment.pairs.map(pair=>({
      age:pair.age.text,factor:pair.factor.text,page:pair.page,
      ageBox:reorientedBoxToOriginalPixels(pair.age.bbox,image.width,image.height,90),
      factorBox:reorientedBoxToOriginalPixels(pair.factor.bbox,image.width,image.height,90),
      region:reorientedBoxToOriginalPixels(pair.region,image.width,image.height,90)
    }));
    const found=new Set();
    let correct=0,incorrect=0;
    for(const pair of observed){
      const at=source.gold.findIndex((g,j)=>!found.has(j)&&
        g.age===pair.age&&g.factor===pair.factor&&
        centerInside(pair.ageBox,g.ageRect)&&centerInside(pair.factorBox,g.factorRect));
      if(at>=0){found.add(at);correct++;}else incorrect++;
      assert.equal(pair.page,source.page);
      assert.ok(pair.region.x0>=0&&pair.region.y0>=0&&
        pair.region.x1<=image.width&&pair.region.y1<=image.height);
    }
    assert.equal(incorrect,0,'Do not attribute a rotated OCR cell to the wrong original-region.');
    orientationProbe={
      status:assessment.status,reason:assessment.reason,
      actualSourceTransform:'inverse of an observed 90-degree canvas rotation',
      correctedRasterDimensions:{width:image.height,height:image.width},
      sourceRasterDimensions:{width:image.width,height:image.height},
      confidence:corrected.data.confidence??null,
      correct,falseMatches:incorrect,missed:source.gold.length-correct,
      candidates:observed
    };
  }
  pageResults.push({page:source.page,kind:source.kind,wordCount:words.length,
   ocrConfidence:data.confidence??null,status:scored.status,reason:scored.reason,
   truePositive:tp,falsePositive:fp,falseNegative:fn,orientationProbe,
   candidates:scored.pairs.map(p=>({
    age:p.age.text,factor:p.factor.text,page:p.page,region:p.region,
    imageWidth:p.imageWidth,imageHeight:p.imageHeight,precision:p.precision
   })),expectedCount:source.gold.length});
 }
}finally{await worker.terminate();}
const ratio=(n,d)=>d?n/d:null;
const report={
 cohort:'three-page-fictional-real-raster-tesseract-cell-groundtruth',
 sourceImage:'JPEG XObjects embedded in generated three-page PDF; Tesseract reads those original JPEG bytes',
 originalFileBytes:pdf.length,source:'entirely-fictional-generated',
 models:'actual offline Tesseract.js v7 and local pinned eng traineddata',
 provenance:'original JPEG pixel rectangles plus authored PDF page number; no PDF.js rerender equivalence claimed',
 ...metric,
 precision:ratio(metric.truePositive,metric.truePositive+metric.falsePositive),
 recall:ratio(metric.truePositive,metric.truePositive+metric.falseNegative),
 falseMatchRate:ratio(metric.falsePositive,metric.truePositive+metric.falsePositive),
 abstentionRate:metric.abstained/metric.cases,
 externalRequestCount:external.length,
 results:pageResults,status:'measured_not_certified'
};
writeFileSync('tmp/spatial-raster-report.json',JSON.stringify(report,null,2));
console.log('ACTUAL OCR CELL REPORT',JSON.stringify(report));
assert.equal(metric.falsePositive,0,'Unsafe cell attribution: benchmark found false positive spatial pair(s)');
