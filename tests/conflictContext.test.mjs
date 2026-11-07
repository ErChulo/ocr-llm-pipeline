import {test} from 'node:test';
import assert from 'node:assert/strict';
import {candidatePreviews} from '../src/conflictContext.ts';
const first='Original plan: normal retirement age 65 effective in 2018.\n';
const second='An amendment effective January 2025 sets normal retirement age 67.\n';
const doc={id:'fictional',name:'plan.txt',text:first+second,sizeBytes:200,mimeType:'text/plain',
 provenance:{source:'local-text',precision:'document',fileName:'plan.txt'}};
test('candidate snippets show the real amended vs original rule locations',()=>{
 const firstOption={value:65,spans:[{chunk:1,start:0,end:first.length}]};
 const secondOption={value:67,spans:[{chunk:2,start:first.length,end:doc.text.length}]};
 const a=candidatePreviews(doc,firstOption,120)[0];
 const b=candidatePreviews(doc,secondOption,120)[0];
 assert.equal(a.chunk,1);
 assert.equal(b.chunk,2);
 assert.match(a.excerpt,/2018/);
 assert.match(b.excerpt,/2025/);
 assert.equal(a.valueLocated,true);
 assert.equal(b.valueLocated,true);
 assert.equal(doc.text.slice(b.start,b.end).replace(/\s+/g,' ').trim(),b.excerpt);
});
test('when model value does not occur, snippet is clearly not a confirmed match',()=>{
 const p=candidatePreviews(doc,{value:99,spans:[{chunk:1,start:0,end:first.length}]})[0];
 assert.equal(p.valueLocated,false);
 assert.ok(!p.excerpt.includes('99'));
});
test('source preview never fabricates invalid offsets',()=>{
 assert.throws(()=>candidatePreviews(doc,{value:67,spans:[{chunk:2,start:10000,end:10200}]}),/invalid/);
 assert.throws(()=>candidatePreviews(doc,{value:65,spans:[]},20),/between 80 and 500/);
});
