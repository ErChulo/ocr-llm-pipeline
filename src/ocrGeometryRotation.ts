/**
 * Exact inverse quarter-turn mapping from a reoriented OCR canvas to the
 * original raster frame. The input box MUST come from actual measured pixels.
 * This function maps rectangles; it does not create or infer OCR measurements.
 * No PDF coordinate transform or page identifier is supplied here.
 */
import type {MeasuredRasterBox} from './ocrSpatial.ts';
export type RasterQuarterTurn=0|90|180|270;
export function reorientedBoxToOriginalPixels(
  measured:MeasuredRasterBox,originalWidth:number,originalHeight:number,
  originalClockwiseTurn:RasterQuarterTurn
):MeasuredRasterBox {
  if(!Number.isSafeInteger(originalWidth)||!Number.isSafeInteger(originalHeight)||
     originalWidth<=0||originalHeight<=0||originalWidth>3600||originalHeight>3600||
     originalWidth*originalHeight>5_000_000||
     ![0,90,180,270].includes(originalClockwiseTurn))throw new Error('Invalid original raster frame.');
  const correctedWidth=originalClockwiseTurn===90||originalClockwiseTurn===270
    ?originalHeight:originalWidth;
  const correctedHeight=originalClockwiseTurn===90||originalClockwiseTurn===270
    ?originalWidth:originalHeight;
  if(!measured||![measured.x0,measured.y0,measured.x1,measured.y1].every(Number.isFinite)||
     measured.x0<0||measured.y0<0||measured.x1<=measured.x0||
     measured.y1<=measured.y0||measured.x1>correctedWidth||
     measured.y1>correctedHeight)throw new Error('Measured OCR rectangle is outside the corrected raster frame.');
  const b=measured,w=originalWidth,h=originalHeight;
  switch(originalClockwiseTurn){
    case 0:return {...b};
    case 90:return {x0:w-b.y1,y0:b.x0,x1:w-b.y0,y1:b.x1};
    case 180:return {x0:w-b.x1,y0:h-b.y1,x1:w-b.x0,y1:h-b.y0};
    case 270:return {x0:b.y0,y0:h-b.x1,x1:b.y1,y1:h-b.x0};
  }
}
