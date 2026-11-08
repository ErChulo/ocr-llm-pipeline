/** Read ONLY actual nested Tesseract v7 measured word envelopes. Fail closed. */
import type {MeasuredOcrWord} from './ocrSpatial.ts';
const MAX_WORDS=10000;
const MAX_NODES=30000;
const MAX_SUBLIST=1024;
function validList(value:unknown):value is unknown[]{
  return Array.isArray(value)&&value.length<=MAX_SUBLIST;
}
function object(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)
    ? value as Record<string,unknown>:null;
}
export function measuredTesseractWords(blocks:unknown,width:number,height:number):MeasuredOcrWord[]{
  if(!validList(blocks)||!Number.isFinite(width)||!Number.isFinite(height)||
     width<1||height<1||width>3600||height>3600||width*height>5_000_000)return [];
  const result:MeasuredOcrWord[]=[];
  let nodes=0;
  for(const block of blocks){
    const paragraphs=object(block)?.paragraphs;
    if(!validList(paragraphs))return [];
    for(const para of paragraphs){
      if(++nodes>MAX_NODES)return [];
      const lines=object(para)?.lines;
      if(!validList(lines))return [];
      for(const line of lines){
        if(++nodes>MAX_NODES)return [];
        const words=object(line)?.words;
        if(!validList(words))return [];
        for(const raw of words){
          if(++nodes>MAX_NODES||result.length>=MAX_WORDS)return [];
          const word=object(raw),box=object(word?.bbox);
          const rawText=word?.text;
          const value=typeof rawText==='string'?rawText.trim():'';
          const confidence=word?.confidence;
          if(!word||!box||!value||value.length>100||
             typeof confidence!=='number'||!Number.isFinite(confidence)||
             confidence<0||confidence>100)return [];
          const {x0,y0,x1,y1}=box;
          if(![x0,y0,x1,y1].every(v=>typeof v==='number'&&Number.isFinite(v))||
             (x0 as number)<0||(y0 as number)<0||
             (x1 as number)<=(x0 as number)||(y1 as number)<=(y0 as number)||
             (x1 as number)>width||(y1 as number)>height)return [];
          result.push({text:value,confidence,
            bbox:{x0:x0 as number,y0:y0 as number,x1:x1 as number,y1:y1 as number}});
        }
      }
    }
  }
  return result;
}
