/**
 * Browser-local PDF text ingestion with verified PDF page numbers.
 * PDF.js is embedded, including its parsing code. The worker's side-effect
 * registers a main-thread handler for file://, with no CDN or fetch.
 * Scanned pages use the optional offline OCR callback; failed OCR blocks import.
 */
import { getDocument, OPS, AnnotationType } from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import type { SourceDocument, SourceRecord, SourceTextSpan, SourceReviewIssue } from './pipeline.ts';
import { ocrReviewIssue } from './ocrReview.ts';
import { countAmbiguousOcrNumericTokens } from './ocrNumericReview.ts';
import { hasMalformedNumericTableRow, preferFallbackForMalformedRows } from './ocrResolutionChoice.ts';
import { detectPdfLayoutRisks } from './pdfLayout.ts';
import { assessSpatialOcrRows, type SpatialAssessment } from './ocrSpatial.ts';

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 300;
const MAX_SOURCE_CHARS = 2_000_000;
const MIN_PAGE_TEXT_LENGTH = 1;
const MAX_OCR_CANVAS_PIXELS = 4_900_000;

import type { OcrResult } from './ocr.ts';
type OcrCallback = (canvas:HTMLCanvasElement)=>Promise<OcrResult>;

type TextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
};

type TextSpan = { start:number; end:number; box:SourceTextSpan['box']; precision:SourceTextSpan['precision'] };
function pdfPageTextWithSpans(items: TextItem[]): { text:string; spans:TextSpan[] } {
  const parts:string[]=[];
  const spans:TextSpan[]=[];
  let pos=0;
  const add=(value:string)=>{parts.push(value);pos+=value.length;};
  let previous:TextItem|undefined;
  for(const item of items){
    const value=item.str;
    if(value){
      const oldY=previous?.transform?.[5];
      const y=item.transform?.[5];
      const oldRight=previous?.transform && typeof previous.width==='number'
        ? previous.transform[4]+previous.width : null;
      const newX=item.transform?.[4];
      if(previous && !previous.hasEOL && typeof y==='number' && typeof oldY==='number'){
        if(Math.abs(y-oldY)>3) add('\n');
        else if(typeof newX==='number' && oldRight!==null && newX-oldRight>2 &&
          pos>0 && !/\s$/.test(parts.at(-1)||'') && !/^\s/.test(value)) add(' ');
      }
      const start=pos;
      add(value);
      const t=item.transform;
      const x=t?.[4], baseline=t?.[5], w=item.width;
      const height=Math.hypot(t?.[2]||0,t?.[3]||0);
      // PDF.js items can cover several characters. A text-item envelope is
      // NOT a precise glyph or quoted-substring bounding box.
      if([x,baseline,w,height].every(v=>typeof v==='number'&&Number.isFinite(v)) &&
        (w as number)>0 && height>0){
        spans.push({
          start,end:pos,
          box:{x:x as number,y:(baseline as number)-height,width:w as number,height},
          precision:'pdf-text-item-envelope'
        });
      }
    }
    if(item.hasEOL)add('\n');
    previous=item;
  }
  const raw=parts.join('');
  const leading=raw.length-raw.trimStart().length;
  const text=raw.trim();
  return {text,spans:spans.map(s=>({
    ...s,start:Math.max(0,s.start-leading),end:Math.min(text.length,s.end-leading)
  })).filter(s=>s.end>s.start)};
}

/**
 * Extract every page. A page with no text blocks export because it may contain
 * an image with plan provisions not represented in the text layer.
 */
export async function parsePdf(fileName: string, bytes: Uint8Array, ocr?:OcrCallback,
  options:{ocrMixedPages?:boolean}={}): Promise<SourceDocument> {
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error('PDF must be nonempty and no larger than 20 MB.');
  }
  const signature = new TextDecoder('latin1').decode(bytes.subarray(0, 8));
  if (!signature.startsWith('%PDF-')) throw new Error('The selected file does not have a PDF header.');

  // PDF.js transfers the provided ArrayBuffer to its worker; do not reuse it.
  const copied = Uint8Array.from(bytes);
  const task = getDocument({
    data: copied,
    useSystemFonts: true,
    disableFontFace: true,
    enableXfa: false,
    useWasm: false,
    stopAtErrors: true
  });
  try {
    const document = await task.promise;
    if (document.numPages < 1 || document.numPages > MAX_PAGES) {
      throw new Error('PDF page count exceeds the 300-page safety limit.');
    }
    const lines: string[] = [];
    const records: SourceRecord[] = [];
    let chars = 0;
    let ocrPages=0;
    let supplementalOcrPages=0;
    const warnings:string[]=[];
    const reviewIssues:SourceReviewIssue[]=[];
    for (let pageNo = 1; pageNo <= document.numPages; pageNo++) {
      const page = await document.getPage(pageNo);
      const textContent = await page.getTextContent();
      // PDF annotations and interactive form values may contain provisions
      // absent from selectable text. Do not fabricate page-text citations.
      const annotations=await page.getAnnotations({intent:'display'});
      const omittedAnnotations=annotations.filter(a=>a.annotationType!==AnnotationType.LINK);
      if(omittedAnnotations.length){
        warnings.push('PDF page '+pageNo+' has '+omittedAnnotations.length+
          ' non-link annotation or form field(s) omitted from the native text layer.');
        reviewIssues.push({id:'pdf:annotations:'+pageNo,category:'pdf_annotation_review',
          page:pageNo,
          message:'Page '+pageNo+' has annotations or interactive form fields that may contain omitted plan facts. '+
            'Inspect the original PDF in a viewer displaying annotations and form field values before export.'});
      }
      // A searchable heading does not imply the whole page is searchable.
      // Identify raster draw operations to disclose potentially missing text.
      const opList = await page.getOperatorList();
      const rasterOperations = new Set([
        OPS.paintImageXObject, OPS.paintImageXObjectRepeat,
        OPS.paintInlineImageXObject, OPS.paintInlineImageXObjectGroup,
        OPS.paintImageMaskXObject, OPS.paintImageMaskXObjectRepeat,
        OPS.paintImageMaskXObjectGroup
      ]);
      const containsImages=opList.fnArray.some(op=>rasterOperations.has(op));
      const items = textContent.items.filter((item): item is typeof item & TextItem => 'str' in item);
      const layoutRisks=detectPdfLayoutRisks(items,page.getViewport({scale:1}).width);
      if(layoutRisks.length){
        warnings.push('PDF page '+pageNo+' has potentially ambiguous text geometry: '+
          layoutRisks.join(', ')+'. Check column and table reading order against the original.');
        reviewIssues.push({id:'pdf:layout:'+pageNo,category:'pdf_layout_review',
          page:pageNo,message:'Page '+pageNo+' may contain columns, tabular spacing or rotated text. '+
            'Verify the reading order and all material figures in the original PDF before export.'});
      }
      const extracted=pdfPageTextWithSpans(items);
      let text=extracted.text;
      let scanned=false;
      let confidence=0;
      let supplementalText='';
      let supplementalConfidence=0;
      let spatial:SpatialAssessment|undefined;
      const runLocalPageOcr=async():Promise<OcrResult>=>{
        if(!ocr)throw new Error('OCR is required to process PDF page '+pageNo+'. No partial extraction was saved.');
        const original=page.getViewport({scale:1});
        if(!Number.isFinite(original.width)||!Number.isFinite(original.height)||
           original.width<=0||original.height<=0){
          throw new Error('Invalid PDF page geometry for OCR at page '+pageNo+'.');
        }
        // Render variants are obtained from the SAME PDF.js page. Neither
        // pass may infer page numbers or glyph/cell source coordinates.
        const renderAndRecognize=async(cap:number,maxSide:number):Promise<OcrResult>=>{
          const scale=Math.min(cap,maxSide/Math.max(original.width,original.height),
            Math.sqrt(MAX_OCR_CANVAS_PIXELS/(original.width*original.height)));
          const viewport=page.getViewport({scale});
          const canvas=globalThis.document.createElement('canvas');
          canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          if(canvas.width<1||canvas.height<1||canvas.width*canvas.height>5_000_000){
            throw new Error('PDF OCR canvas exceeds the local image safety limit.');
          }
          const context=canvas.getContext('2d',{willReadFrequently:true});
          if(!context)throw new Error('Canvas rendering is unavailable for OCR.');
          await page.render({canvas,canvasContext:context,viewport}).promise;
          return ocr(canvas);
        };
        const primary=await renderAndRecognize(2.8,2800);
        // Malformed multi-decimal numeric rows may come from rasterization.
        // A bounded second OCR pass is used ONLY when it independently reads
        // a valid alternative while preserving all already observed pairs.
        if(!hasMalformedNumericTableRow(primary.text))return primary;
        try{
          const lower=await renderAndRecognize(2.4,2400);
          if(preferFallbackForMalformedRows(primary,lower)){
            warnings.push('PDF page '+pageNo+
              ' selected a second local OCR transcription after a malformed numeric row. '+
              'This is unverified OCR, not a corrected or authenticated value. Compare the original page.');
            return lower;
          }
        }catch{
          warnings.push('PDF page '+pageNo+
            ' alternate OCR pass failed. The original unverified transcription was retained.');
        }
        return primary;
      };
      if(text.length<MIN_PAGE_TEXT_LENGTH){
        if(!ocr)throw new Error('Page '+pageNo+' has no extractable text. OCR is required; no partial extraction was saved.');
        const result=await runLocalPageOcr();
        text=result.text.trim();
        confidence=result.confidence;
        // Diagnostic ONLY: retain the actual page number and Tesseract pixel
        // envelopes from the OCR pass selected for this page. No inferred boxes,
        // automatic field approval, or promotion to source citations.
        spatial=assessSpatialOcrRows({page:pageNo,imageWidth:result.width,
          imageHeight:result.height,text,words:result.words??[]});
        scanned=true;
        ocrPages++;
        if(!text)throw new Error('OCR found no readable text on PDF page '+pageNo+'. Import was stopped.');
        if(confidence<75){
          warnings.push('OCR confidence on page '+pageNo+' is '+Math.round(confidence)+'%. Verify the page against its original image.');
        }
        // A count-only hint never rewrites the uncertain OCR transcription,
        // changes the authentic PDF page citation or invents cell coordinates.
        const ambiguousCount=countAmbiguousOcrNumericTokens(text);
        reviewIssues.push(ocrReviewIssue('pdf',confidence,pageNo,ambiguousCount));
      }
      if(!scanned && containsImages){
        if(options.ocrMixedPages){
          // Deliberate full-page OCR cross-check: it can repeat native text.
          // Record the unverified transcription SEPARATELY rather than
          // attributing OCR words to PDF.js-native text-item boxes.
          const result=await runLocalPageOcr();
          supplementalText=result.text.trim();
          supplementalConfidence=result.confidence;
          if(supplementalText)supplementalOcrPages++;
          const possibleNumericErrors=countAmbiguousOcrNumericTokens(supplementalText);
          if(possibleNumericErrors)warnings.push('Page '+pageNo+
            ' supplemental OCR has '+(possibleNumericErrors===100?'at least 100':possibleNumericErrors)+
            ' possibly ambiguous numeric token(s). Verify against the original. No text was changed.');
          warnings.push('Mixed page '+pageNo+' received supplemental full-page OCR. '
            +'It may repeat selectable text, and OCR did not isolate the image region.');
          reviewIssues.push({id:'pdf:mixed:'+pageNo,category:'mixed_pdf_page',
            page:pageNo,message:'Page '+pageNo+' combines selectable text with image content. '
              +'Supplemental full-page OCR was run separately and may repeat native text. '
              +'Compare both transcriptions with the original page before export.'});
        }else{
          warnings.push('Page '+pageNo+' contains images as well as selectable text. '
            +'Those images were not OCR checked; verify the complete page visually.');
          reviewIssues.push({id:'pdf:mixed:'+pageNo,category:'mixed_pdf_page',
            page:pageNo,message:'Page '+pageNo+' combines selectable text with image content. '
              +'The image was not OCR checked; inspect the original page for omitted information.'});
        }
      }
      const line = 'Page ' + pageNo + ':\n' + text + '\n\n';
      const start = chars;
      chars += line.length;
      if (chars > MAX_SOURCE_CHARS) throw new Error('Extracted PDF text exceeds the 2-million-character safety limit.');
      lines.push(line);
      records.push({
        start, end: chars, label: 'Page ' + pageNo,
        location: scanned
          ? { kind:'pdf-page-ocr',page:pageNo,confidence:Math.round(confidence) }
          : { kind:'pdf-page',page:pageNo },
        ...(scanned ? {ocrSpatial:spatial} : {
          // The prefix "Page N:\n" is generated by our parser. Character
          // offsets and geometry are tied to actual PDF.js text items.
          textSpans:extracted.spans.map(s=>({
            ...s,start:start+('Page '+pageNo+':\n').length+s.start,
            end:start+('Page '+pageNo+':\n').length+s.end
          }))
        })
      });
      if(supplementalText){
        const supplementLabel='Page '+pageNo+' supplementary OCR';
        const supplementLine=supplementLabel+':\n'+supplementalText+'\n\n';
        const supplementStart=chars;
        chars+=supplementLine.length;
        if(chars>MAX_SOURCE_CHARS)throw new Error(
          'Extracted PDF and supplemental OCR text exceed the 2-million-character safety limit.'
        );
        lines.push(supplementLine);
        records.push({
          start:supplementStart,end:chars,label:supplementLabel,
          location:{kind:'pdf-page-ocr-mixed',page:pageNo,
            confidence:Math.round(supplementalConfidence)}
        });
      }
      page.cleanup();
    }
    return {
      id: fileName, name: fileName,
      text: lines.join(''),
      mimeType: 'application/pdf', sizeBytes: bytes.byteLength,
      provenance: { source: ocrPages||supplementalOcrPages ? 'pdf-ocr' : 'pdf-native', precision: 'page', fileName },
      records,
      reviewIssues,
      warnings: [
        ...warnings,
        'PDF page numbers come from the document parser, not from the language model.',
        'PDF text-item boxes are approximate item envelopes, not exact word highlights. Verify against the PDF.',
        'Text reading order and tables may differ from the page layout. Verify important values against the PDF.',
        'Pages with no text are OCR processed. Images within pages that already contain text might still be missed unless supplemental OCR is explicitly requested. Supplemental full-page OCR may repeat native text.'
      ]
    };
  } catch (error) {
    if (error instanceof Error && /password/i.test(error.message)) {
      throw new Error('This PDF is password protected. Unlock it in an approved local application before import.');
    }
    throw error;
  } finally {
    await task.destroy();
  }
}
