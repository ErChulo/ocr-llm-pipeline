import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ocrRecords,currentOcrText,correctOcrText} from '../src/ocrCorrections.ts';

function doc(){
 const text='Page 1:\nNative text 65\n\nPage 2:\nOCR guessed 5S\n\nPage 3:\nOther native 10\n\n';
 const mk=(label,kind,from,to,page)=>({
  start:from,end:to,label,location:{kind,page}
 });
 const a=text.indexOf('Page 2:'),b=text.indexOf('Page 3:');
 return {id:'doc',name:'doc.pdf',text,sourceSha256:'a'.repeat(64),
  mimeType:'application/pdf',sizeBytes:200,
  provenance:{source:'pdf-ocr',precision:'page',fileName:'doc.pdf'},
  records:[mk('Page 1','pdf-page',0,a,1),mk('Page 2','pdf-page-ocr',a,b,2),mk('Page 3','pdf-page',b,text.length,3)]
 };
}
test('one OCR page can be corrected without changing native source text or original hash',()=>{
 const old=doc();
 assert.deepEqual(ocrRecords(old).map(x=>x.label),['Page 2']);
 assert.equal(currentOcrText(old,1),'OCR guessed 5S');
 const result=correctOcrText(old,1,'OCR confirmed 55');
 assert.match(result.text,/Page 2:\nOCR confirmed 55/);
 assert.equal(result.sourceSha256,old.sourceSha256);
 assert.equal(result.records[1].location.kind,'pdf-page-ocr-reviewed');
 assert.equal(result.records[2].start,result.text.indexOf('Page 3:'));
 assert.match(result.text,/Native text 65/);
 assert.match(result.text,/Other native 10/);
 assert.equal(result.correctionCount,1);
 assert.equal(old.correctionCount,undefined);
 assert.match(result.warnings.join(' '),/reviewed transcription/);
});
test('OCR correction rejects empty, oversized and editing native text',()=>{
 const d=doc();
 assert.throws(()=>correctOcrText(d,0,'something'),/Only imported OCR/);
 assert.throws(()=>correctOcrText(d,1,'  '),/must not be empty/);
 assert.throws(()=>correctOcrText(d,1,'x'.repeat(200001)),/200,000/);
});
test('after a second edit, source ranges and actual page references remain accurate',()=>{
 const original=doc();
 const first=correctOcrText(original,1,'65 and 55');
 const again=correctOcrText(first,1,'65 and 55 with 10 years');
 assert.equal(again.correctionCount,2);
 assert.equal(again.records[1].location.page,2);
 assert.equal(again.records[2].end,again.text.length);
 assert.equal(currentOcrText(again,1),'65 and 55 with 10 years');
});
test('image OCR can be reviewed with no fabricated PDF page number',()=>{
 const d={...doc(),text:'Image OCR:\nAGE 5S\n',
  records:[{start:0,end:18,label:'Image OCR',location:{kind:'image',confidence:70}}]};
 d.records[0].end=d.text.length;
 const fixed=correctOcrText(d,0,'AGE 55');
 assert.equal(fixed.records[0].location.kind,'image-ocr-reviewed');
 assert.equal(fixed.records[0].location.page,undefined);
});
