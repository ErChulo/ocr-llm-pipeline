import {useEffect,useRef,useState} from 'react';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import type {EvidenceMatch} from './evidence';
import {viewportRect} from './pdfGeometry';

type Box=NonNullable<EvidenceMatch['textItemBoxes']>[number];
const NO_BOXES:Box[]=[];
type Props={bytes:Uint8Array;initialPage:number;highlightBoxes?:Box[];onClose:()=>void};
type Rectangle={x:number;y:number;width:number;height:number};

export default function PdfPageViewer({bytes,initialPage,highlightBoxes=NO_BOXES,onClose}:Props){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const [pageNumber,setPageNumber]=useState(initialPage);
  const [pageCount,setPageCount]=useState(0);
  const [size,setSize]=useState({width:0,height:0});
  const [regions,setRegions]=useState<Rectangle[]>([]);
  const [failure,setFailure]=useState('');
  const [busy,setBusy]=useState(true);

  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    closeRef.current?.focus();
    return ()=>previous?.focus();
  },[]);
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[onClose]);

  useEffect(()=>{
    let cancelled=false;
    let task:ReturnType<typeof getDocument>|null=null;
    let pageRender:{cancel:()=>void;promise:Promise<unknown>}|null=null;
    (async()=>{
      setBusy(true);setFailure('');setRegions([]);
      try{
        task=getDocument({
          data:Uint8Array.from(bytes),useSystemFonts:true,
          disableFontFace:true,useWasm:false,stopAtErrors:true
        });
        const pdf=await task.promise;
        if(cancelled)return;
        setPageCount(pdf.numPages);
        if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>pdf.numPages)
          throw new Error('The requested PDF page does not exist.');
        const page=await pdf.getPage(pageNumber);
        if(cancelled)return;
        const unscaled=page.getViewport({scale:1});
        const scale=Math.min(1.45,920/unscaled.width);
        const viewport=page.getViewport({scale});
        const canvas=canvasRef.current;
        if(!canvas)return;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Canvas rendering is unavailable.');
        const pixelRatio=Math.min(2,window.devicePixelRatio||1);
        canvas.width=Math.ceil(viewport.width*pixelRatio);
        canvas.height=Math.ceil(viewport.height*pixelRatio);
        canvas.style.width=viewport.width+'px';
        canvas.style.height=viewport.height+'px';
        ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
        pageRender=page.render({canvas,canvasContext:ctx,viewport});
        await pageRender.promise;
        if(cancelled)return;
        const rectangles=(pageNumber===initialPage?highlightBoxes:NO_BOXES).flatMap(box=>{
          if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||
            box.width<=0||box.height<=0)return [];
          return [viewportRect(viewport.transform,box)];
        });
        setSize({width:viewport.width,height:viewport.height});
        setRegions(rectangles);
      }catch(error){
        if(cancelled)return;
        setFailure(error instanceof Error?error.message:'Could not render the PDF page.');
      }finally{if(!cancelled)setBusy(false);}
    })();
    return ()=>{
      cancelled=true;
      try{pageRender?.cancel();}catch{/* unmounted */}
      if(task)void task.destroy().catch(()=>undefined);
    };
  },[bytes,pageNumber,highlightBoxes]);

  return <div className="pdf-view-backdrop" role="presentation">
    <section className="pdf-view-dialog" role="dialog" aria-modal="true" aria-label="Original PDF page" tabIndex={-1}>
      <header className="pdf-view-header">
        <strong>Original PDF — page {pageNumber}{pageCount?' of '+pageCount:''}</strong>
        <button type="button" ref={closeRef} onClick={onClose} aria-label="Close PDF view">Close</button>
      </header>
      {failure&&<p role="alert" className="warning">{failure}</p>}
      {busy&&<p role="status">Rendering PDF page locally...</p>}
      <div className="pdf-view-scroller">
        <div className="pdf-view-canvas" style={{width:size.width||undefined,height:size.height||undefined}}>
          <canvas ref={canvasRef} aria-label={'PDF page '+pageNumber}/>
          {!busy&&regions.length>0&&<svg className="pdf-view-boxes" aria-hidden="true"
            viewBox={'0 0 '+size.width+' '+size.height} preserveAspectRatio="none">
            {regions.map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.width} height={r.height}/>)}
          </svg>}
        </div>
      </div>
      <footer className="pdf-view-controls">
        <button type="button" className="secondary" disabled={busy||pageNumber<=1}
          onClick={()=>{setPageNumber(n=>n-1);setSize({width:0,height:0});}}>Previous page</button>
        <button type="button" className="secondary" disabled={busy||pageNumber>=pageCount}
          onClick={()=>{setPageNumber(n=>n+1);setSize({width:0,height:0});}}>Next page</button>
      </footer>
      <p className="help">Highlighted boxes show approximate PDF text-item envelopes, not exact glyphs. Check the original page before confirming evidence. This view makes no network requests.</p>
    </section>
  </div>;
}
