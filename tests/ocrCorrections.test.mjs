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
 assert.equal(result.processedTextSha256,undefined);
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


test('mixed-PDF supplemental OCR remains an independently editable source record',()=>{
 const text='Page 1:\nNative retirement age 65\n\nPage 1 supplementary OCR:\nImage text 55\n\n';
 const at=text.indexOf('Page 1 supplementary OCR:');
 const d={...doc(),text,
   records:[
     {start:0,end:at,label:'Page 1',location:{kind:'pdf-page',page:1}},
     {start:at,end:text.length,label:'Page 1 supplementary OCR',
       location:{kind:'pdf-page-ocr-mixed',page:1,confidence:98}}
   ]
 };
 assert.deepEqual(ocrRecords(d).map(r=>r.index),[1]);
 assert.equal(currentOcrText(d,1),'Image text 55');
 const fixed=correctOcrText(d,1,'Verified image text 55');
 assert.match(fixed.text,/Native retirement age 65/);
 assert.match(fixed.text,/Verified image text 55/);
 assert.equal(fixed.records[1].location.kind,'pdf-page-ocr-mixed-reviewed');
 assert.equal(fixed.records[1].location.page,1);
 assert.equal(fixed.records[0].location.kind,'pdf-page');
 assert.equal(fixed.sourceSha256,d.sourceSha256);
});

test('OCR correction clears stale measured regions and shifts other page source offsets',()=>{
 const before=doc();
 const page2=before.records[1],page3=before.records[2];
 const ageAt=before.text.indexOf('5S');
 const otherAt=before.text.indexOf('10',page3.start);
 const box={x:10,y:20,width:30,height:12};
 const unverified=(page,start)=>({page,precision:'pdf-ocr-word-envelope',
   status:'unverified-geometry',
   age:{start,end:start+2,box},factor:{start,end:start+2,box}});
 page2.textSpans=[{start:ageAt,end:ageAt+2,box,precision:'pdf-ocr-word-envelope'}];
 page2.ocrSpatialRows=[unverified(2,ageAt)];
 page3.location.kind='pdf-page-ocr';
 page3.textSpans=[{start:otherAt,end:otherAt+2,box,precision:'pdf-ocr-word-envelope'}];
 page3.ocrSpatialRows=[unverified(3,otherAt)];
 const after=correctOcrText(before,1,'OCR confirmed age 55 instead of 5S');
 assert.equal(after.records[1].location.kind,'pdf-page-ocr-reviewed');
 assert.equal(after.records[1].textSpans,undefined);
 assert.equal(after.records[1].ocrSpatialRows,undefined,
   'a reviewer edit cannot inherit measured raster rectangles from earlier OCR');
 const shifted=after.records[2].start-page3.start;
 assert.notEqual(shifted,0);
 assert.equal(after.records[2].textSpans[0].start,otherAt+shifted);
 assert.equal(after.records[2].ocrSpatialRows[0].age.start,otherAt+shifted);
 assert.equal(after.records[2].ocrSpatialRows[0].factor.end,otherAt+shifted+2);
 assert.deepEqual(after.records[2].ocrSpatialRows[0].age.box,box);
 assert.equal(after.sourceSha256,before.sourceSha256);
 assert.equal(before.records[1].ocrSpatialRows.length,1,
   'original source metadata must remain unchanged');
});
