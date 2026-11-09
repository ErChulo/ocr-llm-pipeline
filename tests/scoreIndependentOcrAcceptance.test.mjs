/**
 * These are *simulated integer counts*, not actual OCR observations.
 * They validate only fail-closed release-gate arithmetic and input integrity.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreIndependentOcrAcceptance,requiredScanConditions}
  from '../scripts/score-independent-ocr-acceptance.mjs';
const hash=n=>n.toString(16).padStart(64,'0');
function simulated(){
 let i=0;
 return {
  corpusId:'SIMULATED-COUNTS-NOT-REAL-OCR',
  sourceType:'fictional',annotationsSha256:hash(320),
  candidateCommitSha:hash(321),
  pages:Array.from({length:100},(_,d)=>Array.from({length:5},(_,p)=>{
    const mustAbstain=i===30;
    return {documentId:'fictional-document-'+(d+1),page:p+1,
     sourceSha256:hash(d+1),
     conditions:[requiredScanConditions[i++%requiredScanConditions.length]],
     numeric:{expected:10,correct:10,wrongPage:0},
     spatial:{expected:mustAbstain?0:2,correct:mustAbstain?0:2,
      falseAccepted:0,wrongPage:0,mustAbstain,abstained:mustAbstain}
    };
  })).flat()
 };
}
test('simulated 100 docs 500 pages 5000 numerals pass mechanical arithmetic but NEVER certification',()=>{
 const input=simulated(),r=scoreIndependentOcrAcceptance(input);
 assert.equal(r.totals.documents,100);
 assert.equal(r.totals.pages,500);
 assert.equal(r.totals.annotatedNumbers,5000);
 assert.equal(r.totals.spatialExpected,998);
 assert.equal(r.totals.ambiguityCorrectAbstentions,1);
 assert.equal(r.metrics.numericAccuracy,1);
 assert.equal(r.metrics.spatialPrecision,1);
 assert.equal(r.metrics.spatialRecall,1);
 assert.equal(r.mechanicalThresholdsMet,true);
 assert.equal(r.productionGatePassed,false);
 assert.equal(r.independentlyAdjudicated,false);
 assert.ok(Object.values(r.strata).every(s=>s.sufficientlySampled));
 assert.deepEqual(input,simulated(),'No source evidence may be rewritten');
});
test('a tiny flawless fixture cannot pass sample size or stratum gates',()=>{
 const x=simulated();x.pages=x.pages.slice(0,12);
 const r=scoreIndependentOcrAcceptance(x);
 assert.equal(r.totals.pages,12);
 assert.equal(r.thresholds.corpusSize,false);
 assert.equal(r.thresholds.eachCondition,false);
 assert.equal(r.mechanicalThresholdsMet,false);
 assert.equal(r.productionGatePassed,false);
});
test('fail on poor numeric accuracy regardless of perfect table pairing',()=>{
 const x=simulated();for(let i=0;i<30;i++)x.pages[i].numeric.correct=9;
 const r=scoreIndependentOcrAcceptance(x);
 assert.ok(r.metrics.numericAccuracy<.995);
 assert.equal(r.thresholds.numericAccuracy,false);
 assert.equal(r.mechanicalThresholdsMet,false);
});
test('fail when one scan condition is not adequately sampled or under 98 percent',()=>{
 const x=simulated(),t=requiredScanConditions[0];
 const targeted=x.pages.filter(p=>p.conditions.includes(t));
 for(let i=0;i<10;i++)targeted[i].numeric.correct=9;
 const r=scoreIndependentOcrAcceptance(x);
 assert.equal(r.strata[t].meetsAccuracy,false);
 assert.equal(r.thresholds.eachCondition,false);
 const y=simulated();for(const p of y.pages)p.conditions=['baseline'];
 const z=scoreIndependentOcrAcceptance(y);
 assert.equal(z.strata['rotated-270'].sufficientlySampled,false);
 assert.equal(z.thresholds.eachCondition,false);
});
test('one genuine wrong-page accepted candidate blocks spatial and page gate',()=>{
 const x=simulated();x.pages[10].spatial.correct=1;
 x.pages[10].spatial.falseAccepted=1;
 x.pages[10].spatial.wrongPage=1;
 const r=scoreIndependentOcrAcceptance(x);
 assert.equal(r.totals.spatialWrongPage,1);
 assert.equal(r.thresholds.sourcePageIntegrity,false);
 assert.equal(r.mechanicalThresholdsMet,false);
});
test('all-abstain never becomes 100-percent spatial precision',()=>{
 const x=simulated();
 for(const p of x.pages){
  p.spatial.expected=0;p.spatial.correct=0;p.spatial.falseAccepted=0;
  p.spatial.wrongPage=0;p.spatial.abstained=true;
 }
 const r=scoreIndependentOcrAcceptance(x);
 assert.equal(r.metrics.spatialPrecision,null);
 assert.equal(r.metrics.spatialRecall,null);
 assert.equal(r.thresholds.spatialPrecision,false);
 assert.equal(r.thresholds.spatialRecall,false);
});
test('known ambiguous pages must genuinely abstain, no accepted pair laundering',()=>{
 for(const changes of [
  {abstained:false},
  {correct:1,expected:1},
  {falseAccepted:1},
  {expected:2}
 ]){
  const x=simulated(),p=x.pages[30];
  Object.assign(p.spatial,changes);
  assert.throws(()=>scoreIndependentOcrAcceptance(x),/ambiguous|Abstained|ambiguity/);
 }
});
test('duplicate, missing source hashes, changed original document bytes or invalid counts refuse scoring',()=>{
 const broken=[
  x=>x.pages.push({...x.pages[0]}),
  x=>x.pages[1].sourceSha256=hash(888),
  x=>x.pages[0].sourceSha256='abc',
  x=>x.pages[0].numeric.expected=-1,
  x=>x.pages[0].numeric.correct=11,
  x=>x.pages[0].numeric.wrongPage=12,
  x=>x.pages[0].spatial.correct=3,
  x=>x.pages[0].spatial.falseAccepted=-1,
  x=>x.pages[0].spatial.wrongPage=1,
  x=>x.pages[0].conditions=['impossible'],
  x=>x.pages[0].conditions=['baseline','baseline']
 ];
 for(const modify of broken){
  const x=simulated();modify(x);
  assert.throws(()=>scoreIndependentOcrAcceptance(x),/Invalid|Duplicate|conflicting/);
 }
});
test('report cannot self-certify independence or production by setting flags',()=>{
 const x=simulated();x.independentlyAdjudicated=true;
 x.productionGatePassed=true;x.sourceReviewer='Self-asserted reviewer';
 const r=scoreIndependentOcrAcceptance(x);
 assert.equal(r.productionGatePassed,false);
 assert.equal(r.independentlyAdjudicated,false);
 assert.equal(r.mechanicalThresholdsMet,true);
 assert.match(r.independentReviewerVerification,/not-available/);
});
