import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectPdfLayoutRisks} from '../src/pdfLayout.ts';

const item=(text,x,y,width=30,hasEOL=false)=>({
  str:text,transform:[12,0,0,12,x,y],width,hasEOL
});

test('ordinary single-column lines do not create arbitrary layout warnings',()=>{
 const items=[
  item('Normal',72,720,45),item('retirement',125,720,65),
  item('age',198,720,20),item('65',224,720,14,true),
  item('Early retirement',72,696,110),
  item('age 55',190,696,48)
 ];
 assert.deepEqual(detectPdfLayoutRisks(items,612),[]);
});

test('wide same-line spacing suggests a table or multiple columns',()=>{
 const items=[item('Normal 65',72,720,88),item('Early 55',415,720,68)];
 assert.deepEqual(detectPdfLayoutRisks(items,612),['wide_same_line_gap']);
});

test('out-of-order same-line content is flagged without rewriting text',()=>{
 const items=[item('Right 55',410,720,65),item('Left 65',72,720,56)];
 assert.deepEqual(detectPdfLayoutRisks(items,612),['reverse_same_line_order']);
});

test('column restarts are distinguished from normal next-line movement',()=>{
 const items=[item('Bottom of first column',72,300,120,true),
   item('Top of second column',400,725,160)];
 assert.deepEqual(detectPdfLayoutRisks(items,612),['column_restart']);
});

test('rotated text creates a review issue even when it is the only text item',()=>{
 const items=[{str:'Rotated 90 degrees',transform:[0,14,-14,0,300,300],width:90}];
 assert.deepEqual(detectPdfLayoutRisks(items,612),['rotated_text']);
});

test('missing and invalid geometry never creates fabricated page coordinates',()=>{
 const items=[
  {str:'Normal age 65'},
  {str:'Early 55',transform:[1,2,3]},
  {str:'Service 10',transform:[NaN,0,0,12,400,300],width:100}
 ];
 assert.deepEqual(detectPdfLayoutRisks(items,612),[]);
});
