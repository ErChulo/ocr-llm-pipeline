/** CI-only Linux process-tree RSS sampling. Never bundled in standalone HTML. */
import {readFileSync,existsSync} from 'node:fs';
export function parseVmRssBytes(status){
  if(typeof status!=='string')return null;
  const m=status.match(/^VmRSS:\s*([0-9]+)\s*kB\s*$/m);
  if(!m)return null;
  const kib=Number(m[1]);
  return Number.isSafeInteger(kib)&&kib>=0?kib*1024:null;
}
export function parseChildPids(text){
  if(typeof text!=='string')return [];
  return [...new Set(text.trim().split(/\s+/).filter(Boolean).map(Number)
    .filter(n=>Number.isSafeInteger(n)&&n>0))];
}
const read=path=>{try{return readFileSync(path,'utf8')}catch{return null}};
function processTreeRss(pid){
  if(!Number.isSafeInteger(pid)||pid<1)return null;
  const visited=new Set(),stack=[pid];
  let rssBytes=0,processCount=0;
  while(stack.length){
    const current=stack.pop();
    if(visited.has(current))continue;
    visited.add(current);
    if(visited.size>512)return null;
    const rss=parseVmRssBytes(read('/proc/'+current+'/status'));
    if(rss!==null){rssBytes+=rss;processCount++;}
    const children=read('/proc/'+current+'/task/'+current+'/children');
    if(children!==null)stack.push(...parseChildPids(children));
  }
  return processCount?{rssBytes,processCount}:null;
}
export function startLocalPeakRssSampler(browserPid,intervalMs=300){
  if(!Number.isSafeInteger(intervalMs)||intervalMs<100||intervalMs>5000)
    throw new Error('Invalid memory sampling interval.');
  const available=process.platform==='linux'&&
    Number.isSafeInteger(browserPid)&&browserPid>0&&
    existsSync('/proc/'+browserPid+'/status');
  const report={
    method:'sampled-Linux-proc-process-tree-RSS',
    metric:'peak observed RSS; not PSS, exact instantaneous peak, WASM allocation or target Windows memory',
    scope:'living Chromium process tree plus Node benchmark runner',
    intervalMs,available,samples:0,
    peakBrowserTreeRssBytes:null,peakRunnerRssBytes:null,
    peakObservedCombinedRssBytes:null,maxBrowserProcessCount:0
  };
  let casePeak=0,caseSamples=0;
  const sample=()=>{
    if(!available)return;
    const browser=processTreeRss(browserPid);
    if(!browser)return;
    const runner=process.memoryUsage().rss;
    const combined=browser.rssBytes+runner;
    report.samples++;
    report.peakBrowserTreeRssBytes=Math.max(report.peakBrowserTreeRssBytes??0,browser.rssBytes);
    report.peakRunnerRssBytes=Math.max(report.peakRunnerRssBytes??0,runner);
    report.peakObservedCombinedRssBytes=Math.max(report.peakObservedCombinedRssBytes??0,combined);
    report.maxBrowserProcessCount=Math.max(report.maxBrowserProcessCount,browser.processCount);
    caseSamples++;casePeak=Math.max(casePeak,combined);
  };
  sample();
  const interval=setInterval(sample,intervalMs);
  interval.unref?.();
  return {
    beginCase:()=>{casePeak=0;caseSamples=0;sample();},
    endCase:()=>{sample();return {samples:caseSamples,
      peakObservedCombinedRssBytes:caseSamples?casePeak:null};},
    snapshot:()=>({...report}),
    stop:()=>{clearInterval(interval);sample();return {...report};}
  };
}
