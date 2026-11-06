/**
 * Browser-local PDF text ingestion with verified PDF page numbers.
 * PDF.js is embedded, including its parsing code. The worker's side-effect
 * registers a main-thread handler for file://, with no CDN or fetch.
 * Scanned pages fail closed until the OCR milestone exists.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import type { SourceDocument, SourceRecord } from './pipeline.ts';

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 300;
const MAX_SOURCE_CHARS = 2_000_000;
const MIN_PAGE_TEXT_LENGTH = 1;

import type { OcrResult } from './ocr.ts';
type OcrCallback = (canvas:HTMLCanvasElement)=>Promise<OcrResult>;

type TextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
};

function pdfPageText(items: Array<TextItem>): string {
  const out: string[] = [];
  let previous: TextItem | undefined;
  for (const item of items) {
    const value = item.str;
    if (value) {
      const oldY = previous?.transform?.[5];
      const y = item.transform?.[5];
      const oldRight = previous?.transform && typeof previous.width === 'number'
        ? previous.transform[4] + previous.width
        : null;
      const newX = item.transform?.[4];
      if (previous && !previous.hasEOL && typeof y === 'number' && typeof oldY === 'number') {
        if (Math.abs(y - oldY) > 3) out.push('\n');
        else if (typeof newX === 'number' && oldRight !== null && newX - oldRight > 2 &&
          out.length > 0 && !/\s$/.test(out[out.length - 1]) && !/^\s/.test(value)) out.push(' ');
      }
      out.push(value);
    }
    if (item.hasEOL) out.push('\n');
    previous = item;
  }
  return out.join('').trim();
}

/**
 * Extract every page. A page with no text blocks export because it may contain
 * an image with plan provisions not represented in the text layer.
 */
export async function parsePdf(fileName: string, bytes: Uint8Array, ocr?:OcrCallback): Promise<SourceDocument> {
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
    const warnings:string[]=[];
    for (let pageNo = 1; pageNo <= document.numPages; pageNo++) {
      const page = await document.getPage(pageNo);
      const textContent = await page.getTextContent();
      const items = textContent.items.filter((item): item is typeof item & TextItem => 'str' in item);
      let text = pdfPageText(items);
      let scanned=false;
      let confidence=0;
      if (text.length < MIN_PAGE_TEXT_LENGTH) {
        if(!ocr)throw new Error('Page ' + pageNo + ' has no extractable text. OCR is required; no partial extraction was saved.');
        const original=page.getViewport({scale:1});
        const scale=Math.min(2.2,2400/Math.max(original.width,original.height));
        const viewport=page.getViewport({scale});
        const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        const context=canvas.getContext('2d',{willReadFrequently:true});
        if(!context)throw new Error('Canvas rendering is unavailable for OCR.');
        await page.render({canvas,canvasContext:context,viewport}).promise;
        const result=await ocr(canvas);
        text=result.text.trim();
        confidence=result.confidence;
        scanned=true;
        ocrPages++;
        if(!text)throw new Error('OCR found no readable text on PDF page '+pageNo+'. Import was stopped.');
        if(confidence<75)warnings.push('OCR confidence on page '+pageNo+' is '+Math.round(confidence)+'%. Verify the page against its original image.');
      }
      const line = 'Page ' + pageNo + ':\n' + text + '\n\n';
      const start = chars;
      chars += line.length;
      if (chars > MAX_SOURCE_CHARS) throw new Error('Extracted PDF text exceeds the 2-million-character safety limit.');
      lines.push(line);
      records.push({
        start, end: chars, label: 'Page ' + pageNo,
        location: scanned ? { kind: 'pdf-page-ocr', page: pageNo, confidence: Math.round(confidence) } : { kind: 'pdf-page', page: pageNo }
      });
      page.cleanup();
    }
    return {
      id: fileName, name: fileName,
      text: lines.join(''),
      mimeType: 'application/pdf', sizeBytes: bytes.byteLength,
      provenance: { source: ocrPages ? 'pdf-ocr' : 'pdf-native', precision: 'page', fileName },
      records,
      warnings: [
        ...warnings,
        'PDF page numbers come from the document parser, not from the language model.',
        'Text reading order and tables may differ from the page layout. Verify important values against the PDF.',
        'Pages with no text are OCR processed. Images within pages that already contain text might still be missed.'
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
