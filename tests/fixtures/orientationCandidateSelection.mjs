/**
 * TEST-ONLY orientation candidate selector. It never sees authored ground
 * truth, never changes OCR, and never approves factual citations.
 * Each candidate must come from the SAME actual source frame after an
 * independently measured quarter-turn OCR pass, with parser page preserved.
 */
const turns=[0,90,180,270];
const boundsValid=(word,width,height)=>{
 const b=word?.bbox;
 return !!b&&[b.x0,b.y0,b.x1,b.y1].every(Number.isFinite)&&
  b.x0>=0&&b.y0>=0&&b.x1>b.x0&&b.y1>b.y0&&
  b.x1<=width&&b.y1<=height;
};
const abstain=reason=>({status:'abstain',reason,selectedTurn:null,pairs:0});
export function selectMeasuredOrientationCandidates(
 originalWidth,originalHeight,page,candidates
){
 if(!Number.isSafeInteger(originalWidth)||!Number.isSafeInteger(originalHeight)||
  originalWidth<=0||originalHeight<=0||originalWidth>3600||
  originalHeight>3600||originalWidth*originalHeight>5_000_000||
  !Number.isSafeInteger(page)||page<1||!Array.isArray(candidates)||
  candidates.length!==4||new Set(candidates.map(c=>c?.turn)).size!==4||
  !turns.every(t=>candidates.some(c=>c?.turn===t)))
  return abstain('incomplete-or-invalid-measured-orientation-suite');
 for(const item of candidates){
  const expectedWidth=[90,270].includes(item.turn)?originalHeight:originalWidth;
  const expectedHeight=[90,270].includes(item.turn)?originalWidth:originalHeight;
  const assessment=item.assessment;
  if(item.page!==page||typeof item.confidence!=='number'||
   !Number.isFinite(item.confidence)||item.confidence<0||item.confidence>100||
   !assessment||!['candidates','abstain'].includes(assessment.status)||
   !Array.isArray(assessment.pairs)||assessment.pairs.length>256||
   (assessment.status==='abstain'&&assessment.pairs.length>0)||
   assessment.pairs.some(p=>p.page!==page||
     p.imageWidth!==expectedWidth||p.imageHeight!==expectedHeight||
     p.precision!=='tesseract-raster-word-envelope'||
     !boundsValid(p.age,expectedWidth,expectedHeight)||
     !boundsValid(p.factor,expectedWidth,expectedHeight)))
    return abstain('inconsistent-measured-page-or-pixel-geometry');
 }
 // Multiple viable alternatives are ambiguity, never pick largest confidence
 // or a convenient upright orientation. A single viable proposal remains
 // unverified and requires source-image review before any application use.
 const viable=candidates.filter(c=>c.confidence>=75&&
   c.assessment.status==='candidates'&&c.assessment.pairs.length>=2);
 if(viable.length!==1)return abstain(viable.length?'competing-orientation-candidates':
  'no-unique-measured-orientation-candidate');
 return {status:'candidate-for-human-review',
  reason:'unique-measured-orientation-with-unverified-facts',
  selectedTurn:viable[0].turn,pairs:viable[0].assessment.pairs.length};
}
