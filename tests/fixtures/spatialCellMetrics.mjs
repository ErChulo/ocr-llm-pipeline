/**
 * Independent, fixture-authored image-region ground truth versus actual
 * measured Tesseract spatial assessments. Test harness ONLY.
 * Annotation boxes are reference regions specified by the fictional fixture
 * author; NEVER pass them to the product as source or OCR coordinates.
 * A text-line pair is not an accepted spatial pair.
 */
const validRegion=r=>r && [r.x0,r.y0,r.x1,r.y1].every(Number.isFinite) &&
  r.x0>=0&&r.y0>=0&&r.x1>r.x0&&r.y1>r.y0&&r.x1<=1&&r.y1<=1;
// Minimum proportion of each ACTUALLY MEASURED OCR word rectangle that
// must lie in the independently authored ground-truth cell. Center-only
// scoring can accept large rectangles that straddle adjacent cells.
export const MIN_WORD_REGION_COVERAGE=0.95;
export const measuredWordInsideCell=(word,region,w,h)=>{
  const b=word?.bbox;
  if(!b||![b.x0,b.y0,b.x1,b.y1,w,h].every(Number.isFinite)||
    w<=0||h<=0||b.x0<0||b.y0<0||b.x1<=b.x0||b.y1<=b.y0||
    b.x1>w||b.y1>h)return false;
  const regionPx={x0:region.x0*w,y0:region.y0*h,
    x1:region.x1*w,y1:region.y1*h};
  const intersectW=Math.max(0,Math.min(b.x1,regionPx.x1)-Math.max(b.x0,regionPx.x0));
  const intersectH=Math.max(0,Math.min(b.y1,regionPx.y1)-Math.max(b.y0,regionPx.y0));
  return intersectW*intersectH/((b.x1-b.x0)*(b.y1-b.y0)) >= MIN_WORD_REGION_COVERAGE;
};

/**
 * @param {Array<{page:number,rows:Array<{age:string,factor:string,ageRegion:object,factorRegion:object}>}>} truth
 * @param {Array<{page:number,assessment:object}>} observed
 */
export function scoreSpatialCells(truth,observed){
  if(!Array.isArray(truth)||!truth.length||!Array.isArray(observed))
    throw new Error('Independent spatial ground truth and measured assessments are required.');
  const pages=new Set(),observedPages=new Set();
  for(const entry of truth){
    if(!Number.isSafeInteger(entry?.page)||entry.page<1||pages.has(entry.page)||
      !Array.isArray(entry.rows)||!entry.rows.length||
      entry.rows.some(row=>!row||typeof row.age!=='string'||typeof row.factor!=='string'||
        !validRegion(row.ageRegion)||!validRegion(row.factorRegion)))
      throw new Error('Invalid independently authored spatial annotation.');
    pages.add(entry.page);
  }
  for(const entry of observed){
    if(!Number.isSafeInteger(entry?.page)||!pages.has(entry.page)||observedPages.has(entry.page)||
      !entry.assessment||!['abstain','candidates'].includes(entry.assessment.status)||
      !Array.isArray(entry.assessment.pairs))
      throw new Error('Missing or untrusted page-local measured spatial assessment.');
    observedPages.add(entry.page);
  }
  if(observedPages.size!==pages.size)throw new Error('Missing measured OCR page assessment.');
  const perPage=truth.map(entry=>{
    const assessment=observed.find(obs=>obs.page===entry.page).assessment;
    if(assessment.status==='abstain' && assessment.pairs.length)
      throw new Error('Abstained pages may not contain accepted candidate pairs.');
    const accepted=assessment.status==='candidates'?assessment.pairs:[];
    const matchedRows=new Set();
    let correct=0,falseMatches=0,wrongPage=0;
    for(const candidate of accepted){
      const w=candidate?.imageWidth,h=candidate?.imageHeight;
      const valid=candidate?.precision==='tesseract-raster-word-envelope' &&
        Number.isSafeInteger(w)&&Number.isSafeInteger(h)&&w>0&&h>0&&
        w<=3600&&h<=3600&&w*h<=5_000_000;
      const expected=valid ? entry.rows.findIndex((row,i)=>!matchedRows.has(i) &&
        candidate.page===entry.page&&candidate.age?.text===row.age&&
        candidate.factor?.text===row.factor&&
        measuredWordInsideCell(candidate.age,row.ageRegion,w,h)&&
        measuredWordInsideCell(candidate.factor,row.factorRegion,w,h)) : -1;
      if(expected<0){falseMatches++;if(candidate?.page!==entry.page)wrongPage++;}
      else {matchedRows.add(expected);correct++;}
    }
    return {page:entry.page,groundTruth:entry.rows.length,accepted:accepted.length,
      correct,falseMatches,missed:entry.rows.length-correct,wrongPage,
      abstained:assessment.status==='abstain',reason:assessment.reason};
  });
  const sum=key=>perPage.reduce((n,p)=>n+p[key],0);
  const correct=sum('correct'),accepted=sum('accepted'),groundTruth=sum('groundTruth'),
    abstainedPages=perPage.filter(p=>p.abstained).length;
  return {
    groundTruthRows:groundTruth,acceptedPairs:accepted,correct,
    minMeasuredWordRegionCoverage:MIN_WORD_REGION_COVERAGE,
    falseMatches:sum('falseMatches'),missed:sum('missed'),wrongPage:sum('wrongPage'),
    abstainedPages,pages:perPage.length,
    // Precision is undefined rather than 100% when ALL pages abstain.
    precision:accepted?correct/accepted:null,recall:correct/groundTruth,
    acceptedCoverage:correct/groundTruth,abstentionRate:abstainedPages/perPage.length,
    perPage
  };
}
