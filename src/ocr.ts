/**
 * Self-contained offline English OCR. No network, local English traineddata.
 * All object URLs are created from code/data embedded in the HTML bundle.
 */
import { createWorker, OEM, PSM } from 'tesseract.js';
import { chooseOcrCandidate } from './ocrCandidate.ts';
import tesseractWorker from 'virtual:ocr-worker';
import tesseractCore from 'virtual:ocr-core';
import englishDataUri from 'virtual:ocr-eng';

export type OcrResult = { text:string; confidence:number; width:number; height:number; strategy?:'default'|'sparse' };

let pendingWorker:Promise<Awaited<ReturnType<typeof createWorker>>>|null=null;
let activeUrls:string[]=[];
const VIRTUAL_ENG='https://ocr-assets.invalid/eng.traineddata.gz';
const MAX_IMAGE_PIXELS=5_000_000;
const MAX_DIM=3600;

function revokeAssets(){
  for(const u of activeUrls) URL.revokeObjectURL(u);
  activeUrls=[];
}
function blobUrl(contents:BlobPart[],type:string):string {
  const url=URL.createObjectURL(new Blob(contents,{type}));
  activeUrls.push(url);
  return url;
}
async function makeWorker(){
  try{
    // Embed language bytes directly into the classic worker. Blob URLs made by a
    // file:// document may be inaccessible to a blob:null worker in Chromium.
    const languageBase64=englishDataUri.split(',')[1];
    if(!languageBase64 || languageBase64.length<1000)throw new Error('Embedded English OCR language data is missing.');

    // The v7 worker requests this precise, virtual URL. Intercept only this asset
    // inside the worker; block all outbound HTTP(S) traffic.
    const prefix=[
      "'use strict';",
      "const _ocrFetch=self.fetch.bind(self);",
      'const _ocrBase64='+JSON.stringify(languageBase64)+';',
      'const _ocrVirtual='+JSON.stringify(VIRTUAL_ENG)+';',
      'let _ocrLanguageBytes=null;',
      'self.fetch=function(input,opts){',
      'const url=String(input&&input.url||input);',
      'if(url===_ocrVirtual){',
      'if(!_ocrLanguageBytes){const b=atob(_ocrBase64);const out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);_ocrLanguageBytes=out;}',
      'return Promise.resolve(new Response(_ocrLanguageBytes,{status:200,headers:{"content-type":"application/gzip"}}));',
      '}',
      'if(/^https?:/i.test(url))return Promise.reject(new Error("OCR worker refuses network requests: "+url));',
      'console.error("[OCR local fetch]",url.slice(0,120));',
      'return _ocrFetch(input,opts);',
      '};'
    ].join('\n');
    // Chromium may reject importScripts(blob:null/...) from a file:// worker.
    // Execute the self-contained Emscripten core in this same classic Worker
    // before the Tesseract dispatcher starts. No secondary importScripts call.
    const workerUrl=blobUrl([prefix,'\n',tesseractCore,'\n',tesseractWorker],'text/javascript');
    const worker=await createWorker('eng',OEM.LSTM_ONLY,{
      workerPath:workerUrl,workerBlobURL:false,
      corePath:'https://ocr-assets.invalid/embedded-core.js',
      langPath:VIRTUAL_ENG.replace(/\/eng\.traineddata\.gz$/,''),
      cacheMethod:'none',
      gzip:true,
      errorHandler:(error:unknown)=>console.error('Offline OCR worker:',error)
    });
    return worker;
  }catch(error){
    revokeAssets();
    throw error;
  }
}
async function getWorker(){
  if(!pendingWorker)pendingWorker=makeWorker().catch(error=>{pendingWorker=null;throw error;});
  return pendingWorker;
}
function sizeOk(width:number,height:number){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||
     width>MAX_DIM||height>MAX_DIM||width*height>MAX_IMAGE_PIXELS){
    throw new Error('OCR image is too large. Maximum 3,600 pixels per side and 5 million pixels.');
  }
}
export async function recognizeCanvas(canvas:HTMLCanvasElement):Promise<OcrResult>{
  sizeOk(canvas.width,canvas.height);
  const worker=await getWorker();
  const {data}=await worker.recognize(canvas,{}, {text:true,blocks:true});
  const baseline={
    text:(data.text||'').trim(),
    confidence:Number.isFinite(data.confidence)?Math.max(0,Math.min(100,data.confidence)):0
  };
  // A second, independent segmentation may recover omitted table entries.
  // Never generate missing numbers or merge snippets between passes.
  let alternative:typeof baseline|null=null;
  try{
    await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
    const {data:other}=await worker.recognize(canvas,{}, {text:true,blocks:false});
    alternative={
      text:(other.text||'').trim(),
      confidence:Number.isFinite(other.confidence)?Math.max(0,Math.min(100,other.confidence)):0
    };
  }catch(error){
    console.warn('Secondary local OCR segmentation failed; primary OCR retained.',error);
  }finally{
    // Workers are shared across PDF pages and image imports.
    await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO});
  }
  const choice=alternative?chooseOcrCandidate(baseline,alternative):{
    selected:'default' as const,reason:'unchanged' as const
  };
  const selected=choice.selected==='sparse'&&alternative?alternative:baseline;
  return {...selected,width:canvas.width,height:canvas.height,strategy:choice.selected};
}
export async function recognizeImage(file:File):Promise<OcrResult>{
  if(file.size===0||file.size>20*1024*1024)throw new Error('Image must be between 1 byte and 20 MB.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Only PNG, JPEG and WebP images are supported for OCR.');
  const bitmap=await createImageBitmap(file);
  try{
    sizeOk(bitmap.width,bitmap.height);
    const canvas=document.createElement('canvas');
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('Canvas rendering is unavailable.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap,0,0);
    return await recognizeCanvas(canvas);
  }finally{bitmap.close();}
}
export function ocrLanguage():string{return 'English (embedded)';}
export async function terminateOcr():Promise<void>{
  const pending=pendingWorker;
  pendingWorker=null;
  if(pending){try{(await pending).terminate();}catch{/* cleanup after failure */}}
  revokeAssets();
}
