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
  'column_restart'|'rotated_text'|'aligned_tabular_cells';

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
  // Repeated, closely spaced cells may be a table even where no single
  // row contains a 'wide' gap. Detect the layout only: do NOT reorder PDF.js
  // text, merge cells, or infer row/column citations from these coordinates.
  if(hasAlignedTabularCells(items,width))risks.add('aligned_tabular_cells');
  return Array.from(risks);
}

/** Detect at least three distinct aligned rows with two separated cells. */
function hasAlignedTabularCells(items:readonly LayoutTextItem[],pageWidth:number):boolean{
  // Hard cap adversarial page complexity. Skipping a hint cannot authorize
  // export: text-layer order remains unverified and is disclosed separately.
  if(items.length>10_000)return false;
  const rows=new Map<number,{x:number;right:number}[]>();
  for(const item of items){
    const t=item.transform;
    if(!item.str.trim()||!t||t.length<6||
       !t.slice(0,6).every(Number.isFinite)||
       typeof item.width!=='number'||!Number.isFinite(item.width)||item.width<=0)continue;
    const [,b,c,d,x,y]=t;
    const h=Math.hypot(c,d);
    if(h<=0||Math.abs(b)>h*0.12||Math.abs(c)>h*0.12||
       x<0||x>pageWidth*1.1)continue;
    const key=Math.round(y/4);
    const row=rows.get(key)||[];
    row.push({x,right:x+item.width});
    rows.set(key,row);
  }
  const pairs:{left:number;right:number;row:number}[]=[];
  const minCellDistance=Math.max(45,pageWidth*0.075);
  const minCellGap=Math.max(12,pageWidth*0.02);
  for(const [row,cells] of rows){
    if(cells.length<2)continue;
    cells.sort((a,b)=>a.x-b.x);
    // Adjacent cell anchors, not individual words within narrative lines.
    for(let i=1;i<cells.length;i++){
      const left=cells[i-1],right=cells[i];
      if(right.x-left.x>=minCellDistance&&right.x-left.right>=minCellGap){
        pairs.push({left:left.x,right:right.x,row});
      }
    }
  }
  // 3 alignments are a review hint, not a structural or factual table claim.
  // Bounded pair count also avoids quadratic work on adversarial layouts.
  if(pairs.length>2500)return false;
  for(let i=0;i<pairs.length;i++){
    const a=pairs[i];
    const seen=new Set<number>([a.row]);
    for(let j=i+1;j<pairs.length;j++){
      const b=pairs[j];
      if(Math.abs(a.left-b.left)<=8&&Math.abs(a.right-b.right)<=8){
        seen.add(b.row);
        if(seen.size>=3)return true;
      }
    }
  }
  return false;
}
