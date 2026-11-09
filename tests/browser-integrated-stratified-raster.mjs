/**
 * Application-level offline OCR evaluation on the SAME twelve original-JPEG
 * fictional PDF pages scored by the independent raster script. All measured
 * associations come from the shipped file:// app, not the test-only selector.
 * This fixed development fixture is NOT a blinded production holdout.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {measuredWordInsideCell} from './fixtures/spatialCellMetrics.mjs';

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
const referenceCells=[
 {age:[60,196,160,270],factor:[420,196,655,270]},
 {age:[60,277,160,365],factor:[420,277,655,365]}
];
// Test-only authored pixel transforms. No Tesseract or production transform
// function is used to establish the reference geometry.
function goldRegion([x0,y0,x1,y1],turn=0){
 switch(turn){
  case 0:return [x0,y0,x1,y1];
  case 90:return [H-y1,x0,H-y0,x1];
  case 180:return [W-x1,H-y1,W-x0,H-y0];
  case 270:return [y0,W-x1,y1,W-x0];
  default:throw new Error('Invalid fictional raster orientation');
 }
}
function inRegion(bbox,rect,width,height,turn){
 const w=turn===90||turn===270?H:W;
 const h=turn===90||turn===270?W:H;
 const r={x0:rect[0]/w,y0:rect[1]/h,x1:rect[2]/w,y1:rect[3]/h};
 return measuredWordInsideCell({bbox},r,width,height);
}
const pdf=readFileSync(resolve('tmp/stratified-raster-original.pdf'));
assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const external=[];
let report=null;
try {
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(/^(https?|wss?):/i.test(url)){external.push(url);await route.abort();}
  else await route.continue();
 });
 await page.goto(pathToFileURL(resolve('dist/index.html')).href+'#/documents',
  {waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:/OCR \+ LLM Pipeline Studio/})
  .waitFor({timeout:20000});
 await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
  name:'fictional-stratified-original.pdf',mimeType:'application/pdf',buffer:pdf
 });
 await page.waitForFunction(()=>{
  const preview=document.querySelector('pre.preview');
  return preview?.textContent?.includes('Page 12:')===true;
 },null,{timeout:480000});
 const text=await page.locator('pre.preview').innerText();
 const pageBodies=new Map();
 const parts=[...text.matchAll(/^Page (\d+):\s*\n([\s\S]*?)(?=^Page \d+:|$)/gm)];
 for(const part of parts)pageBodies.set(Number(part[1]),part[2]);
 assert.equal(pageBodies.size,12,'Parser must preserve all twelve original page identities');
 const spatial=JSON.parse(await page.locator('pre[aria-label="Measured OCR spatial diagnostics"]').innerText());
 assert.equal(spatial.length,12,'Every scanned source page must retain a spatial status');
 let truePositive=0,falsePositive=0,falseNegative=0,wrongPage=0;
 let exactNumericHits=0,expectedNumeric=0,ambiguousAbstentions=0;
 const pages=[];
 for(let i=0;i<cases.length;i++){
  const entry=cases[i],number=i+1,turn=entry.rotation??0;
  const diagnostic=spatial.find(s=>s.page===number);
  assert.ok(diagnostic,'Missing source-identified OCR assessment for page '+number);
  const assessment=diagnostic.assessment;
  const pageText=pageBodies.get(number)??'';
  const tokens=pageText.match(/\d+(?:\.\d+)?/g)??[];
  const literalHits=entry.rows.flat().filter(token=>tokens.includes(token)).length;
  expectedNumeric+=entry.rows.length*2;exactNumericHits+=literalHits;
  const expected=entry.requiredAbstention?[]:entry.rows.map(([age,factor],j)=>({
   age,factor,
   ageRect:goldRegion(referenceCells[j].age,turn),
   factorRect:goldRegion(referenceCells[j].factor,turn)
  }));
  const matched=new Set();
  let tp=0,fp=0;
  for(const pair of assessment.pairs??[]){
   if(pair.page!==number){wrongPage++;falsePositive++;fp++;continue;}
   const at=expected.findIndex((gold,j)=>!matched.has(j)&&
    pair.age.text===gold.age&&pair.factor.text===gold.factor&&
    inRegion(pair.age.bbox,gold.ageRect,pair.imageWidth,pair.imageHeight,turn)&&
    inRegion(pair.factor.bbox,gold.factorRect,pair.imageWidth,pair.imageHeight,turn));
   if(at<0){falsePositive++;fp++;}
   else{matched.add(at);truePositive++;tp++;}
  }
  if(entry.requiredAbstention){
   assert.equal(assessment.status,'abstain',
    'Measured third numeric column must not be silently associated');
   ambiguousAbstentions++;
  }
  const fn=expected.length-matched.size;
  falseNegative+=fn;
  pages.push({page:number,condition:entry.kind,status:assessment.status,
   reason:assessment.reason,acceptedPairs:assessment.pairs?.length??0,
   truePositive:tp,falsePositive:fp,falseNegative:fn,
   numericLiteralHits:literalHits,numericLiteralExpected:entry.rows.length*2,
   originalPage:diagnostic.page,
   coordinateFrame:assessment.pairs?.[0]?.precision??null});
 }
 report={
  cohort:'twelve-page-fictional-original-JPEG-deployed-file-browser',
  source:'same parser-validated JPEG XObject PDF as independent raw raster benchmark',
  measuredBy:'shipped standalone index.html through file:// Chromium document import',
  groundTruth:'authored original image cell regions; not OCR/model-derived',
  pageCount:cases.length,expectedPairs:22,truePositive,falsePositive,
  falseNegative,wrongPage,ambiguousAbstentions,
  acceptedPrecision:truePositive+falsePositive?truePositive/(truePositive+falsePositive):null,
  recall:truePositive/(truePositive+falseNegative),
  exactNumericHits,expectedNumeric,
  numericLiteralRecall:exactNumericHits/expectedNumeric,
  externalRequests:external.length,pages,
  limitation:'Same fixed development fixture. OCR diagnostic pairs are not approved facts; no blinded source-authority, workplace, or large-sample claim.'
 };
 mkdirSync('tmp',{recursive:true});
 writeFileSync('tmp/integrated-stratified-browser-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('INTEGRATED STRATIFIED FILE BROWSER REPORT',JSON.stringify(report));
 assert.equal(external.length,0,'Standalone HTML must not make outbound requests');
 assert.equal(wrongPage,0,'No wrong-page spatial association');
 assert.equal(falsePositive,0,'No false original-raster cell pairing');
 assert.equal(ambiguousAbstentions,1,'Intervening numeric cells must still abstain');
 assert.equal(truePositive,22,'Integrated OCR must recover all authored pairs in this development fixture');
 assert.equal(falseNegative,0,'No missing eligible original-JPEG table row');
 assert.equal(exactNumericHits,48,'All fictional source numerals must be present on their parser pages');
}finally {
 await browser.close();
}
