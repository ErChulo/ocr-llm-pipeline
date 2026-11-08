/**
 * Recover exact decimal percentage PRESENTATION only, not a new rate.
 * No floats, rounding, unit conversion, cross-section searches or
 * applicability decisions. Original source still requires human review.
 */
export type RestoredSourcePercent={
  value:string;modelValue:string;sourceStart:number;sourceEnd:number
};
const percentLiteral=/(?<![\p{L}\p{N}_])[-+]?(?:\d+(?:\.\d+)?|\.\d+)[ \t]?%(?![\p{L}\p{N}_%])/gu;
const percentValue=/^([+-]?)(\d+(?:\.\d+)?|\.\d+)%$/;
function canonicalPercent(value:string):string|null {
  const match=percentValue.exec(value.trim().replace(/[ \t]+%$/,'%'));
  if(!match)return null;
  const [whole,part='']=match[2].split('.');
  const integer=(whole||'0').replace(/^0+(?=\d)/,'');
  const decimals=part.replace(/0+$/,'');
  return (match[1]==='-'?'-':'')+integer+(decimals?'.'+decimals:'')+'%';
}
export function restoreSourcePercent(modelValue:unknown,sourceText:string):RestoredSourcePercent|null {
  if(typeof modelValue!=='string'||modelValue.length>80||
     !sourceText||sourceText.length>20_000)return null;
  const normalized=canonicalPercent(modelValue);
  if(normalized===null)return null;
  const unique=new Map<string,{start:number;end:number}>();
  percentLiteral.lastIndex=0;
  for(const found of sourceText.matchAll(percentLiteral)){
    if(found.index===undefined)continue;
    const raw=found[0],start=found.index,end=start+raw.length;
    if(canonicalPercent(raw)!==normalized)continue;
    unique.set(raw,{start,end});
    if(unique.size>1)return null;
  }
  if(unique.size!==1)return null;
  const [value,location]=unique.entries().next().value!;
  if(value===modelValue)return null;
  return {value,modelValue,sourceStart:location.start,sourceEnd:location.end};
}
