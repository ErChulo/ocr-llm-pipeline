/**
 * Self-contained offline English OCR. No network, local English traineddata.
 * All object URLs are created from code/data embedded in the HTML bundle.
 */
import { createWorker, OEM } from 'tesseract.js';
import tesseractWorker from 'virtual:ocr-worker';
import tesseractCore from 'virtual:ocr-core';
import englishDataUri from 'virtual:ocr-eng';

export type OcrResult = { text:string; confidence:number; width:number; height:number };

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
    // Base64 decoded from bundled HTML to an object URL accessible to this blob Worker.
    const languageResponse=await fetch(englishDataUri);
    if(!languageResponse.ok)throw new Error('Bundled English OCR language data is unavailable.');
    const languageBlob=await languageResponse.blob();
    const langUrl=blobUrl([languageBlob],'application/gzip');
    // The v7 worker requests this precise, virtual URL. Intercept only this asset
    // inside the worker; block all outbound HTTP(S) traffic.
    const prefix=[
      "'use strict';",
      "const _ocrFetch=self.fetch.bind(self);",
      'const _ocrEngURL='+JSON.stringify(langUrl)+';',
      'const _ocrVirtual='+JSON.stringify(VIRTUAL_ENG)+';',
      'self.fetch=function(input,opts){',
      'const url=String(input&&input.url||input);',
      'if(url===_ocrVirtual)return _ocrFetch(_ocrEngURL,opts);',
      'if(/^https?:/i.test(url))return Promise.reject(new Error("OCR worker refuses network requests: "+url));',
      'return _ocrFetch(input,opts);',
      '};'
    ].join('\n');
    const workerUrl=blobUrl([prefix,tesseractWorker],'text/javascript');
    const coreUrl=blobUrl([tesseractCore],'text/javascript');
    // Tesseract v7 treats corePath ending in ".js" as a direct JS file.
    // A URL fragment is ignored by Blob fetch but satisfies the suffix check.
    const worker=await createWorker('eng',OEM.LSTM_ONLY,{
      workerPath:workerUrl,workerBlobURL:false,
      corePath:coreUrl+'#.js',
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
  const text=(data.text||'').trim();
  const confidence=Number.isFinite(data.confidence)?Math.max(0,Math.min(100,data.confidence)):0;
  return {text,confidence,width:canvas.width,height:canvas.height};
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
