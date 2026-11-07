/**
 * Conservative geometry-only review hints for PDF.js selectable text.
 *
 * This cannot reconstruct table reading order. It only flags risky geometry
 * so that the user must inspect the actual page before relying on extraction.
 */
export type LayoutTextItem={
  str:string;
  hasEOL?:boolean;
  width?:number;
  transform?:number[];
};
export type PdfLayoutRisk='wide_same_line_gap'|'reverse_same_line_order'|
  'column_restart'|'rotated_text';

export function detectPdfLayoutRisks(
  items:readonly LayoutTextItem[],pageWidth:number
):PdfLayoutRisk[]{
  const risks=new Set<PdfLayoutRisk>();
  const width=Number.isFinite(pageWidth)&&pageWidth>0?pageWidth:612;
  let prev:LayoutTextItem|null=null;
  for(const item of items){
    if(!item.str.trim()||!item.transform||item.transform.length<6)continue;
    const [a,b,c,d,x,y]=item.transform;
    if(![a,b,c,d,x,y].every(Number.isFinite))continue;
    const height=Math.hypot(c,d);
    if(height>0 && (Math.abs(b)>height*0.12||Math.abs(c)>height*0.12)){
      risks.add('rotated_text');
    }
    if(prev?.transform && prev.transform.length>=6){
      const p=prev.transform;
      const px=p[4],py=p[5];
      const pw=prev.width;
      const textHeight=Math.max(3,Math.min(height,22)*0.4);
      if(Number.isFinite(px)&&Number.isFinite(py)){
        const dy=y-py;
        if(Math.abs(dy)<=textHeight && !prev.hasEOL){
          if(typeof pw==='number'&&Number.isFinite(pw)){
            const gap=x-(px+pw);
            if(gap>Math.max(85,width*0.14))risks.add('wide_same_line_gap');
          }
          if(x<px-Math.max(45,width*0.07))risks.add('reverse_same_line_order');
        }
        // PDF drawing order can finish a left column and restart at its
        // top in a right column. Such ordering needs visual corroboration.
        if(dy>Math.max(60,height*4) &&
           x>px+Math.max(90,width*0.16)){
          risks.add('column_restart');
        }
      }
    }
    prev=item;
  }
  return Array.from(risks);
}
