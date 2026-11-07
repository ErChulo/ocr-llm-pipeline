/**
 * Deterministic quality metrics for SYNTHETIC, manually annotated pension
 * fixtures. This does not execute or evaluate a real GGUF by itself.
 *
 * A wrong value counts as both one false positive and one false negative.
 * A field that merely occurs somewhere in a document is not a correct answer.
 */
export type FieldIssue = { path:string; expected?:unknown; actual?:unknown };
export type ExtractionScore = {
  truePositive:number; falsePositive:number; falseNegative:number;
  precision:number; recall:number; f1:number; exactMatch:boolean;
  missing:FieldIssue[]; incorrect:FieldIssue[]; unsupported:FieldIssue[];
};
export type CorpusObservation = { id:string; expected:Record<string,unknown>; actual:unknown };
export type CorpusReport = {
  cases:number; exactCases:number;
  micro:Pick<ExtractionScore,'truePositive'|'falsePositive'|'falseNegative'|'precision'|'recall'|'f1'>;
  perCase:Array<{id:string;score:ExtractionScore}>;
};

function isRecord(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function escapePointer(key:string){return key.replace(/~/g,'~0').replace(/\//g,'~1');}
export function flattenScalarFields(value:unknown):Map<string,unknown>{
  const result=new Map<string,unknown>();
  const descend=(item:unknown,path:string,depth:number)=>{
    if(depth>30||result.size>1000)throw new Error('Synthetic evaluation exceeds bounded JSON complexity.');
    if(Array.isArray(item)){
      for(let i=0;i<item.length;i++)descend(item[i],path+'/'+i,depth+1);
    }else if(isRecord(item)){
      for(const [key,v] of Object.entries(item))descend(v,path+'/'+escapePointer(key),depth+1);
    }else if(item!==null&&item!==undefined){
      result.set(path,item);
    }
  };
  descend(value,'',0);
  return result;
}
function scoreRatio(numerator:number,denominator:number):number{
  // A corpus with neither expected nor predicted fields is not evidence of
  // extraction quality; report 0 rather than a misleading 100%.
  return denominator===0?0:numerator/denominator;
}
function metrics(tp:number,fp:number,fn:number){
  const precision=scoreRatio(tp,tp+fp);
  const recall=scoreRatio(tp,tp+fn);
  const f1=precision+recall===0?0:2*precision*recall/(precision+recall);
  return {truePositive:tp,falsePositive:fp,falseNegative:fn,precision,recall,f1};
}
export function scoreExtraction(expected:Record<string,unknown>,actual:unknown):ExtractionScore{
  if(!isRecord(expected))throw new Error('A synthetic ground truth object is required.');
  const exp=flattenScalarFields(expected);
  const got=flattenScalarFields(isRecord(actual)?actual:{});
  const missing:FieldIssue[]=[],incorrect:FieldIssue[]=[],unsupported:FieldIssue[]=[];
  let tp=0;
  for(const [path,truth] of exp){
    if(!got.has(path))missing.push({path,expected:truth});
    else if(Object.is(truth,got.get(path)))tp++;
    else incorrect.push({path,expected:truth,actual:got.get(path)});
  }
  for(const [path,value] of got){
    if(!exp.has(path))unsupported.push({path,actual:value});
  }
  const result=metrics(tp,incorrect.length+unsupported.length,missing.length+incorrect.length);
  return {...result,missing,incorrect,unsupported,
    exactMatch:exp.size>0 && result.falsePositive===0 && result.falseNegative===0};
}
export function scoreCorpus(observations:CorpusObservation[]):CorpusReport{
  if(!Array.isArray(observations)||!observations.length||observations.length>1000){
    throw new Error('Provide between 1 and 1000 synthetic cases.');
  }
  const seen=new Set<string>();
  const perCase=observations.map(({id,expected,actual})=>{
    if(!id||seen.has(id))throw new Error('Synthetic cases need unique nonempty IDs.');
    seen.add(id);
    return {id,score:scoreExtraction(expected,actual)};
  });
  const sums=perCase.reduce((acc,c)=>{
    acc.tp+=c.score.truePositive;
    acc.fp+=c.score.falsePositive;
    acc.fn+=c.score.falseNegative;
    return acc;
  },{tp:0,fp:0,fn:0});
  return {cases:perCase.length,exactCases:perCase.filter(c=>c.score.exactMatch).length,
    micro:metrics(sums.tp,sums.fp,sums.fn),perCase};
}
