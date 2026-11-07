import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ocrReviewIssue} from '../src/ocrReview.ts';

test('high confidence scanned-PDF OCR still requires page-level original review',()=>{
  const result=ocrReviewIssue('pdf',99.7,4);
  assert.deepEqual({id:result.id,page:result.page,category:result.category},{
    id:'pdf:ocr:4',page:4,category:'ocr_unverified'
  });
  assert.match(result.message,/100%; this does not verify accuracy/);
  assert.match(result.message,/PDF page 4/);
});

test('low confidence is explicitly identified but uses one review issue per page',()=>{
  const result=ocrReviewIssue('pdf',62.4,1);
  assert.equal(result.id,'pdf:ocr:1');
  assert.equal(result.category,'low_ocr_confidence');
  assert.match(result.message,/Low OCR confidence \(62%\)/);
});

test('image OCR never invents a PDF page number and always needs review',()=>{
  const image=ocrReviewIssue('image',98);
  assert.equal(image.id,'image:ocr');
  assert.equal(image.category,'ocr_unverified');
  assert.equal(image.page,undefined);
  assert.match(image.message,/original image/);
  const low=ocrReviewIssue('image',NaN);
  assert.equal(low.category,'low_ocr_confidence');
});

test('PDF review requires an authentic positive page number',()=>{
  for(const page of [undefined,0,-1,1.2]){
    assert.throws(()=>ocrReviewIssue('pdf',85,page),/actual page number/);
  }
});
