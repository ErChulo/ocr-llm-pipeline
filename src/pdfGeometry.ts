/**
 * Transform a PDF user-space rectangle through PDF.js PageViewport's affine
 * matrix. Coordinates are page-local; PDF.js handles page rotation/crop.
 * This is still an approximate text-item envelope, not an exact glyph box.
 */
export type PdfRectangle={x:number;y:number;width:number;height:number};
export function viewportRect(transform:number[],box:PdfRectangle):PdfRectangle{
  if(transform.length!==6 || !transform.every(Number.isFinite) ||
    ![box.x,box.y,box.width,box.height].every(Number.isFinite) ||
    box.width<=0 || box.height<=0){
    throw new Error('Invalid PDF transform or text-item rectangle.');
  }
  const [a,b,c,d,e,f]=transform;
  const p=(x:number,y:number)=>({x:a*x+c*y+e,y:b*x+d*y+f});
  const corners=[
    p(box.x,box.y),p(box.x+box.width,box.y),
    p(box.x,box.y+box.height),p(box.x+box.width,box.y+box.height)
  ];
  const xs=corners.map(v=>v.x),ys=corners.map(v=>v.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs);
  const minY=Math.min(...ys),maxY=Math.max(...ys);
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
}
