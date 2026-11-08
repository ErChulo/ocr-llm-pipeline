/**
 * Bounded quarter-turn recovery for genuinely measured Tesseract OCR word
 * boxes. No fixture answers, model output, or transcribed numeric values are
 * used to choose a rotation. Accepted geometry is ONLY an unverified review
 * candidate; source authority and factual correctness remain manual gates.
 */
import {assessSpatialOcrRows, type MeasuredOcrWord, type SpatialAssessment} from './ocrSpatial.ts';
import {reorientedBoxToOriginalPixels, type RasterQuarterTurn} from './ocrGeometryRotation.ts';

export type MeasuredOrientationPass={
  turn:RasterQuarterTurn; text:string; confidence:number;
  width:number; height:number; words:MeasuredOcrWord[];
};
export type OrientationChoice={
  status:'abstain'|'candidate-for-human-review';
  reason:string;
  selected?:MeasuredOrientationPass;
  assessment?:SpatialAssessment;
};
const turns:readonly RasterQuarterTurn[]=[0,90,180,270];
const abstain=(reason:string):OrientationChoice=>({status:'abstain',reason});
export function selectMeasuredRasterOrientation(
  originalWidth:number,originalHeight:number,passes:readonly MeasuredOrientationPass[]
):OrientationChoice {
  if(!Number.isSafeInteger(originalWidth)||!Number.isSafeInteger(originalHeight)||
     originalWidth<1||originalHeight<1||originalWidth>3600||originalHeight>3600||
     originalWidth*originalHeight>5_000_000||!Array.isArray(passes)||
     passes.length!==4||new Set(passes.map(p=>p?.turn)).size!==4||
     !turns.every(turn=>passes.some(p=>p?.turn===turn)))
    return abstain('incomplete-or-invalid-measured-orientation-suite');
  const candidates:{pass:MeasuredOrientationPass;assessment:SpatialAssessment}[]=[];
  for(const pass of passes){
    const w=pass.turn===90||pass.turn===270?originalHeight:originalWidth;
    const h=pass.turn===90||pass.turn===270?originalWidth:originalHeight;
    if(pass.width!==w||pass.height!==h||typeof pass.text!=='string'||
      !Number.isFinite(pass.confidence)||pass.confidence<0||pass.confidence>100||
      !Array.isArray(pass.words)||pass.words.length>10000)
      return abstain('inconsistent-measured-page-or-pixel-geometry');
    const assessment=assessSpatialOcrRows({
      page:1,imageWidth:w,imageHeight:h,text:pass.text,words:pass.words
    });
    if(assessment.reason==='untrusted-word-box'||assessment.reason==='invalid-source-geometry'||
      assessment.reason==='excessive-transcript-complexity')
      return abstain('inconsistent-measured-page-or-pixel-geometry');
    if(pass.confidence>=75&&assessment.status==='candidates'&&assessment.pairs.length>=2)
      candidates.push({pass,assessment});
  }
  if(candidates.length!==1)return abstain(candidates.length?
    'competing-orientation-candidates':'no-unique-measured-orientation-candidate');
  return {status:'candidate-for-human-review',
    reason:'unique-measured-orientation-with-unverified-facts',
    selected:candidates[0].pass,assessment:candidates[0].assessment};
}

/** Reexpress actual measured corrected-frame envelopes in original raster pixels. */
export function restoredOriginalRasterSpatial(
  assessment:SpatialAssessment,page:number,originalWidth:number,originalHeight:number,
  turn:RasterQuarterTurn
):SpatialAssessment {
  if(!Number.isSafeInteger(page)||page<1||turn===0||
     ![90,180,270].includes(turn)||assessment.status!=='candidates'||
     !Array.isArray(assessment.pairs)||assessment.pairs.length<2)
    return {status:'abstain',reason:'invalid-rotation-review-evidence',pairs:[]};
  try {
    return {status:'candidates',reason:'inverse-measured-quarter-turn-unverified',
      pairs:assessment.pairs.map(pair=>{
        if(pair.page!==page)throw new Error('Wrong source page');
        const ageBox=reorientedBoxToOriginalPixels(pair.age.bbox,originalWidth,originalHeight,turn);
        const factorBox=reorientedBoxToOriginalPixels(pair.factor.bbox,originalWidth,originalHeight,turn);
        const region=reorientedBoxToOriginalPixels(pair.region,originalWidth,originalHeight,turn);
        return {...pair,age:{...pair.age,bbox:ageBox},factor:{...pair.factor,bbox:factorBox},
          region,imageWidth:originalWidth,imageHeight:originalHeight,
          precision:'tesseract-inverse-quarter-turn-envelope' as const};
      })};
  }catch{
    return {status:'abstain',reason:'invalid-rotation-review-evidence',pairs:[]};
  }
}
