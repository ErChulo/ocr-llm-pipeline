/**
 * Offline GGUF admission checks before allocating the WASM model runtime.
 * These checks are deliberately conservative. They do not interpret model
 * metadata, and browser memory available at runtime remains unknown.
 */
export type GgufPart={name:string;size:number};
export type GgufProfile={
  name:string;partCount:number;totalBytes:number;
  largeForSingleThread:boolean;advice:string;
};
const MAX_GGUF_PART_BYTES=2*1024*1024*1024;
const MAX_GGUF_PARTS=128;

export function inspectGgufParts(files:readonly GgufPart[]):GgufProfile{
  if(!files.length||files.length>MAX_GGUF_PARTS){
    throw new Error('Choose between 1 and 128 local GGUF model files.');
  }
  const names=new Set<string>();
  let totalBytes=0;
  for(const f of files){
    if(typeof f.name!=='string'||!/\.gguf$/i.test(f.name)){
      throw new Error('Choose only local GGUF files.');
    }
    if(!Number.isSafeInteger(f.size)||f.size<=0){
      throw new Error('Every GGUF part must be a non-empty local file.');
    }
    if(f.size>=MAX_GGUF_PART_BYTES){
      throw new Error('A GGUF part is 2 GiB or larger. Use an official pre-split GGUF with smaller parts.');
    }
    const n=f.name.toLowerCase();
    if(names.has(n))throw new Error('The GGUF model selection contains duplicate part names.');
    names.add(n);
    totalBytes+=f.size;
    if(!Number.isSafeInteger(totalBytes))throw new Error('Total GGUF file size exceeds the safe integer range.');
  }
  const ordered=[...files].sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const first=ordered[0];
  const suffix=/^(.*)-(\d{5})-of-(\d{5})\.gguf$/i;
  const shardMatches=ordered.map(f=>suffix.exec(f.name));
  if(shardMatches.some(Boolean)){
    if(shardMatches.some(x=>!x))throw new Error(
      'Do not mix GGUF split parts with standalone model files.'
    );
    const firstShard=shardMatches[0]!;
    const count=Number(firstShard[3]);
    if(count!==ordered.length||count<=1||count>MAX_GGUF_PARTS){
      throw new Error('The selected GGUF parts do not match their expected split count.');
    }
    const base=firstShard[1].toLowerCase();
    const numbers=new Set<number>();
    for(const match of shardMatches){
      if(!match||match[1].toLowerCase()!==base||Number(match[3])!==count){
        throw new Error('GGUF parts belong to different split models.');
      }
      numbers.add(Number(match[2]));
    }
    for(let i=1;i<=count;i++){
      if(!numbers.has(i))throw new Error('GGUF split part '+i+' is missing.');
    }
  }else if(files.length!==1){
    throw new Error('Multiple GGUF files must be a complete, consistently named split model.');
  }
  const largeForSingleThread=totalBytes>=1_500_000_000;
  return {
    name:first.name,partCount:files.length,totalBytes,largeForSingleThread,
    advice:largeForSingleThread
      ? 'Large GGUF model selected. This portable file:// build runs one CPU thread with no GPU offloading. Expect slow first output; try a smaller quantized model if necessary.'
      : 'Model size passed the local file checks. Inference speed and available WASM memory still require a runtime test.'
  };
}
