/**
 * Mechanical acceptance-threshold scoring for *externally annotated* OCR
 * evidence. Does NOT run OCR or certify independent authorship, image
 * authenticity, reviewer identity, workplace use or production readiness.
 * Every number is an assertion to be checked against separate artifacts.
 */
export const requiredScanConditions=Object.freeze([
  'baseline','low-contrast','blur','skew-positive','skew-negative',
  'rotated-90','rotated-180','rotated-270','small-serif','jpeg-artifacts',
  'ruled-table','mixed-layout'
]);
const REQUIRED_DOCUMENTS=100,REQUIRED_PAGES=500,REQUIRED_NUMBERS=5000;
const MIN_CONDITION_PAGES=20;
const int=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const sha=txt=>typeof txt==='string'&&/^[0-9a-f]{64}$/i.test(txt);
const id=txt=>typeof txt==='string'&&txt.length>0&&txt.length<=160&&
  !/[\u0000-\u001f\u007f]/.test(txt);
const numberRatio=(a,b)=>b===0?null:a/b;
const notPlain=(x)=>!x||typeof x!=='object'||Array.isArray(x);
export function scoreIndependentOcrAcceptance(report){
  if(notPlain(report)||!id(report.corpusId)||
    report.sourceType!=='fictional'||
    !sha(report.annotationsSha256)||!sha(report.candidateCommitSha)||
    !Array.isArray(report.pages)||report.pages.length===0||
    report.pages.length>20000)
    throw new Error('Missing or invalid fictional holdout manifest.');
  const seen=new Set(),docs=new Map(),perPage=[];
  const totals={documents:0,pages:0,annotatedNumbers:0,correctNumbers:0,
    wrongPageNumeric:0,spatialExpected:0,spatialCorrect:0,
    spatialFalseAccepted:0,spatialFalseNegative:0,
    spatialWrongPage:0,ambiguityRequiredPages:0,
    ambiguityCorrectAbstentions:0};
  const stratified=new Map(requiredScanConditions.map(name=>
    [name,{pages:0,expected:0,correct:0}]));
  for(const p of report.pages){
    if(notPlain(p)||!id(p.documentId)||!int(p.page,1)||
      !sha(p.sourceSha256)||!Array.isArray(p.conditions)||
      !p.conditions.length||new Set(p.conditions).size!==p.conditions.length||
      p.conditions.some(t=>!stratified.has(t))||
      notPlain(p.numeric)||!int(p.numeric.expected,1)||
      !int(p.numeric.correct)||p.numeric.correct>p.numeric.expected||
      !int(p.numeric.wrongPage)||p.numeric.wrongPage>p.numeric.expected||
      notPlain(p.spatial)||!int(p.spatial.expected)||
      !int(p.spatial.correct)||p.spatial.correct>p.spatial.expected||
      !int(p.spatial.falseAccepted)||!int(p.spatial.wrongPage)||
      p.spatial.wrongPage>p.spatial.falseAccepted||
      typeof p.spatial.abstained!=='boolean'||
      typeof p.spatial.mustAbstain!=='boolean'){
      throw new Error('Invalid original-page OCR annotation or measurement.');
    }
    const key=p.documentId+'\u0000'+p.page;
    if(seen.has(key))throw new Error('Duplicate ground-truth document/page.');
    seen.add(key);
    const existing=docs.get(p.documentId);
    if(existing&&existing!==p.sourceSha256)
      throw new Error('Same document ID is bound to conflicting original source hashes.');
    docs.set(p.documentId,p.sourceSha256);
    if(p.spatial.abstained&&(p.spatial.correct+p.spatial.falseAccepted)!==0)
      throw new Error('Abstained spatial page cannot contain accepted candidates.');
    if(p.spatial.mustAbstain&&
      (!p.spatial.abstained||p.spatial.correct+p.spatial.falseAccepted!==0))
      throw new Error('Known ambiguous page contains a spatial acceptance.');
    if(p.spatial.mustAbstain&&p.spatial.expected!==0)
      throw new Error('Mandatory ambiguity page must exclude only its labelled ambiguous pairs before scoring.');
    totals.pages++;
    totals.annotatedNumbers+=p.numeric.expected;
    totals.correctNumbers+=p.numeric.correct;
    totals.wrongPageNumeric+=p.numeric.wrongPage;
    totals.spatialExpected+=p.spatial.expected;
    totals.spatialCorrect+=p.spatial.correct;
    totals.spatialFalseAccepted+=p.spatial.falseAccepted;
    totals.spatialFalseNegative+=p.spatial.expected-p.spatial.correct;
    totals.spatialWrongPage+=p.spatial.wrongPage;
    if(p.spatial.mustAbstain){
      totals.ambiguityRequiredPages++;
      if(p.spatial.abstained)totals.ambiguityCorrectAbstentions++;
    }
    for(const tag of p.conditions){
      const state=stratified.get(tag);
      state.pages++;
      state.expected+=p.numeric.expected;
      state.correct+=p.numeric.correct;
    }
    perPage.push({documentId:p.documentId,page:p.page,
      conditions:[...p.conditions],numericAccuracy:p.numeric.correct/p.numeric.expected,
      expected:p.numeric.expected,correct:p.numeric.correct,
      spatialCorrect:p.spatial.correct,
      spatialFalseAccepted:p.spatial.falseAccepted,
      spatialFalseNegative:p.spatial.expected-p.spatial.correct,
      spatialWrongPage:p.spatial.wrongPage,abstained:p.spatial.abstained});
  }
  totals.documents=docs.size;
  const spatialAccepted=totals.spatialCorrect+totals.spatialFalseAccepted;
  const precision=numberRatio(totals.spatialCorrect,spatialAccepted);
  const recall=numberRatio(totals.spatialCorrect,totals.spatialExpected);
  const numericAccuracy=numberRatio(totals.correctNumbers,totals.annotatedNumbers);
  const strata=Object.fromEntries([...stratified].map(([name,stats])=>[name,{
    ...stats,accuracy:numberRatio(stats.correct,stats.expected),
    sufficientlySampled:stats.pages>=MIN_CONDITION_PAGES,
    meetsAccuracy:stats.pages>=MIN_CONDITION_PAGES&&
      stats.expected>0&&stats.correct/stats.expected>=0.98
  }]));
  const thresholds={
    corpusSize:totals.documents>=REQUIRED_DOCUMENTS&&totals.pages>=REQUIRED_PAGES&&
      totals.annotatedNumbers>=REQUIRED_NUMBERS,
    numericAccuracy:numericAccuracy!==null&&numericAccuracy>=0.995&&
      totals.wrongPageNumeric===0,
    eachCondition:Object.values(strata).every(s=>s.meetsAccuracy),
    spatialPrecision:precision!==null&&precision>=0.995,
    spatialRecall:recall!==null&&recall>=0.97,
    sourcePageIntegrity:totals.spatialWrongPage===0&&totals.wrongPageNumeric===0,
    mandatoryAmbiguityAbstentions:totals.ambiguityRequiredPages>0&&
      totals.ambiguityRequiredPages===totals.ambiguityCorrectAbstentions
  };
  return {
    corpusId:report.corpusId,
    candidateCommitSha:report.candidateCommitSha,
    annotationsSha256:report.annotationsSha256,
    sourceType:'fictional',totals,
    metrics:{numericAccuracy,spatialPrecision:precision,
      spatialRecall:recall,spatialAccepted,spatialAbstentionPolicy:'all explicitly labelled ambiguous pages must abstain'},
    strata,thresholds,
    mechanicalThresholdsMet:Object.values(thresholds).every(Boolean),
    independentlyAdjudicated:false,
    independentReviewerVerification:'not-available-from-machine-readable-metrics',
    originalFileByteVerification:'requires-external-source-archive-and-hashes',
    productionGatePassed:false,
    limitations:[
      'User-supplied metrics and hashes are not proof that physical images or ground truth were independently verified.',
      'Correlated pages and rows do not provide independent-trial confidence guarantees.',
      'Source authority, actual GGUF reliability, security, accessibility and workstation acceptance are separate gates.'
    ]
  };
}
