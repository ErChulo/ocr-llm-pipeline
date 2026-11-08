import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parsePdf } from '../src/pdfText.ts';
import { createMultiPageScannedPdf } from './pdf-fixture.mjs';

// A tiny valid, public-domain-style generated JPEG. No people or case records.
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooA//2Q==','base64');

test('fictional multipage raster PDF preserves page boundaries, rotation and native/raster separation',async()=>{
  const pdf=createMultiPageScannedPdf([
    {jpeg,width:360,height:160},
    {jpeg,width:360,height:160,rotation:90},
    {jpeg,width:360,height:160,rotation:180},
    {jpeg,width:360,height:160,rotation:270},
    {jpeg,width:360,height:160,heading:'FICTIONAL NATIVE HEADING'}
  ]);
  const task=getDocument({data:Uint8Array.from(pdf),useWasm:false,disableFontFace:true});
  try{
    const doc=await task.promise;
    assert.equal(doc.numPages,5);
    for(let i=1;i<=5;i++){
      const page=await doc.getPage(i);
      const ops=await page.getOperatorList();
      assert.ok(ops.fnArray.some(op=>[
        OPS.paintImageXObject,OPS.paintInlineImageXObject
      ].includes(op)),'every page has a distinct PDF image source');
      const strings=(await page.getTextContent()).items
        .filter(item=>'str' in item).map(item=>item.str).join(' ');
      if(i<5)assert.equal(strings.trim(),'','scans must not gain invented selectable text');
      else assert.match(strings,/FICTIONAL NATIVE HEADING/);
      const rotation=[0,0,90,180,270,0][i];
      assert.equal(page.rotate,rotation);
      const viewport=page.getViewport({scale:1});
      assert.equal(viewport.width,rotation===90||rotation===270?160:360);
      assert.equal(viewport.height,rotation===90||rotation===270?360:160);
      page.cleanup();
    }
  }finally{await task.destroy();}
});

test('no OCR callback blocks even a multipage raster document without saving partial evidence',async()=>{
  const pdf=createMultiPageScannedPdf([
    {jpeg,width:360,height:160},{jpeg,width:360,height:160}
  ]);
  await assert.rejects(
    parsePdf('fictional-multipage.pdf',new Uint8Array(pdf)),
    /Page 1 has no extractable text.*OCR is required.*no partial extraction was saved/i
  );
});

test('multipage raster fixtures reject invalid inputs and cannot forge rotation',()=>{
  assert.throws(()=>createMultiPageScannedPdf([]),/1–300 pages/);
  assert.throws(()=>createMultiPageScannedPdf([{jpeg,width:360,height:160,rotation:45}]),/Invalid fictional scanned PDF page/);
  assert.throws(()=>createMultiPageScannedPdf([{jpeg,width:360,height:160,rotation:360}]),/Invalid fictional scanned PDF page/);
  assert.throws(()=>createMultiPageScannedPdf([{jpeg,width:4000,height:160}]),/Invalid fictional scanned PDF page/);
  assert.throws(()=>createMultiPageScannedPdf([{jpeg:Buffer.alloc(4),width:360,height:160}]),/Invalid fictional scanned PDF page/);
});
