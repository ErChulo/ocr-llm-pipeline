import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVmRssBytes,parseChildPids,startLocalPeakRssSampler} from './fixtures/linuxMemorySampler.mjs';
test('read Linux RSS only from exact resident-memory line',()=>{
 assert.equal(parseVmRssBytes('Name:\tchrome\nVmRSS: 12345 kB\n'),12345*1024);
 for(const invalid of ['VmSize: 12345 kB','VmRSS: -1 kB','VmRSS: infinity kB',null,{}])
  assert.equal(parseVmRssBytes(invalid),null);
 assert.deepEqual(parseChildPids(' 12 3 12 23\n'),[12,3,23]);
 assert.deepEqual(parseChildPids('bad -3 0'),[]);
});
test('sample availability and bounded RSS without any network call',async()=>{
 const missing=startLocalPeakRssSampler(-1,120);
 assert.equal(missing.snapshot().available,false);
 assert.equal(missing.stop().peakObservedCombinedRssBytes,null);
 const sampled=startLocalPeakRssSampler(process.pid,100);
 try{
  sampled.beginCase();
  await new Promise(resolve=>setTimeout(resolve,115));
  const c=sampled.endCase(),r=sampled.snapshot();
  if(r.available){
   assert.ok(c.samples>=1);
   assert.ok(c.peakObservedCombinedRssBytes>0);
   assert.ok(r.peakObservedCombinedRssBytes>=c.peakObservedCombinedRssBytes);
  }else assert.equal(c.peakObservedCombinedRssBytes,null);
 }finally{sampled.stop();}
 assert.throws(()=>startLocalPeakRssSampler(process.pid,0),/interval/);
});
