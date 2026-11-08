import { test } from 'node:test';
import assert from 'node:assert/strict';
import {auditLiteralEvidence,evidenceReviewComplete,exportReviewedEvidence} from '../src/evidence.ts';

const doc={
 id:'synthetic',name:'plan.pdf',mimeType:'application/pdf',sizeBytes:900,
 provenance:{source:'pdf-native',precision:'page',fileName:'plan.pdf'},
 text:'Page 1:\nNormal retirement at age 65.\n\nPage 2:\nEarly retirement: 55 and 10 years.\n\n',
 records:[
  {start:0,end:38,label:'Page 1',location:{kind:'pdf-page',page:1}},
  {start:38,end:82,label:'Page 2',location:{kind:'pdf-page',page:2}}
 ]
};
test('exact evidence is located in actual source-page records',()=>{
 const actual=doc.text.indexOf('Page 2:');
 const d={...doc,records:[{start:0,end:actual,label:'Page 1',location:{kind:'pdf-page',page:1}},
   {start:actual,end:doc.text.length,label:'Page 2',location:{kind:'pdf-page',page:2}}]};
 const c=auditLiteralEvidence(d,{normal_age:65,eligibility:{age:55,service:10}});
 assert.equal(c.length,3);
 assert.equal(c[0].status,'match');
 assert.equal(c[0].matches[0].location.page,1);
 assert.equal(c[1].matches[0].location.page,2);
 assert.equal(c[2].matches[0].location.page,2);
 assert.equal(evidenceReviewComplete(c,{},{}),false);
 const pick=Object.fromEntries(c.map(x=>[x.path,0]));
 const check=Object.fromEntries(c.map(x=>[x.path,true]));
 assert.equal(evidenceReviewComplete(c,pick,check),true);
 assert.deepEqual(Object.keys(exportReviewedEvidence(c,pick,check)).sort(),c.map(x=>x.path).sort());
});
test('generated page labels cannot supply facts',()=>{
 const d={...doc,text:'Page 65:\nOnly placeholder data.\n',records:[{
  start:0,end:31,label:'Page 65',location:{kind:'pdf-page',page:65}
 }]};
 const c=auditLiteralEvidence(d,{retirementAge:65});
 assert.equal(c[0].matches.length,0);
});
test('fail closed for fabricated, normalized or unsupported values',()=>{
 const text='Retirement age is 1965, not 65. All benefits remain subject to approval.';
 const d={...doc,text,records:undefined};
 const c=auditLiteralEvidence(d,{age:650,accepted:true,blank:0,missing:'Totally made up'});
 assert.equal(c.length,4);
 assert.ok(c.every(x=>x.status==='missing'));
 assert.throws(()=>exportReviewedEvidence(c,{},{}),/blocked/);
});
test('numeric evidence requires token boundaries',()=>{
 const d={...doc,text:'Birth year 1965, age 65.5, final retirement 65.',records:undefined};
 const c=auditLiteralEvidence(d,{normalAge:65});
 assert.equal(c[0].matches.length,1);
 assert.ok(c[0].matches[0].quote.includes('final retirement 65'));
});
test('arrays and nested object values map to JSON pointer paths',()=>{
 const d={...doc,text:'SLA JS50 65',records:undefined};
 const c=auditLiteralEvidence(d,{forms:['SLA','JS50'],nested:{age:65}});
 assert.deepEqual(c.map(x=>x.path),['/forms/0','/forms/1','/nested/age']);
});

test('plain text colons do not masquerade as parser labels',()=>{
 const raw='Normal retirement age: 65. Early retirement at 55.';
 const d={...doc,text:raw,records:undefined};
 const checks=auditLiteralEvidence(d,{description:'Normal retirement age',age:65});
 assert.equal(checks[0].status,'match');
 assert.equal(checks[0].matches[0].start,0);
 assert.equal(checks[1].status,'match');
 assert.equal(checks[1].matches[0].start,raw.indexOf('65'));
});
test('special characters are literal, not regular expressions',()=>{
 const raw='The plan specifies [SLA] as an optional form.';
 const d={...doc,text:raw,records:undefined};
 const checks=auditLiteralEvidence(d,{form:'[SLA]'});
 assert.equal(checks[0].status,'match');
 assert.equal(raw.slice(checks[0].matches[0].start,checks[0].matches[0].end),'[SLA]');
});
test('Unicode source offsets are against unchanged text',()=>{
 const raw='İstanbul, normal form [SLA] and retirement 65.';
 const d={...doc,text:raw,records:undefined};
 const checks=auditLiteralEvidence(d,{form:'[SLA]',age:65});
 assert.equal(checks[0].status,'match');
 assert.equal(raw.slice(checks[0].matches[0].start,checks[0].matches[0].end),'[SLA]');
 assert.equal(raw.slice(checks[1].matches[0].start,checks[1].matches[0].end),'65');
});

test('PDF literal match contains actual PDF text-item envelopes for review', async()=>{
 const {parsePdf}=await import('../src/pdfText.ts');
 const {createSyntheticPdf}=await import('./pdf-fixture.mjs');
 const parsed=await parsePdf('synthetic.pdf',new Uint8Array(createSyntheticPdf([['Normal retirement age 65']])));
 const checked=auditLiteralEvidence(parsed,{age:65});
 assert.equal(checked[0].status,'match');
 const matched=checked[0].matches[0];
 assert.equal(matched.location.page,1);
 assert.ok(matched.textItemBoxes?.length>0);
 assert.equal(matched.textItemBoxes[0].precision,'pdf-text-item-envelope');
 const {evidenceSelectionsAnchoredToDocument}=await import('../src/evidence.ts');
 assert.equal(evidenceSelectionsAnchoredToDocument(parsed,checked,{'/age':0}),true);
 for(const forged of [
   {...matched,textItemBoxes:undefined},
   {...matched,textItemBoxes:[]},
   {...matched,textItemBoxes:matched.textItemBoxes.map(x=>({...x,x:x.x+10}))},
   {...matched,textItemBoxes:matched.textItemBoxes.map(x=>({...x,precision:'exact-word-box'}))}
 ]){
   assert.equal(evidenceSelectionsAnchoredToDocument(parsed,[
     {...checked[0],matches:[forged]}
   ],{'/age':0}),false);
 }
});

test('GGUF candidate matches must be within the model source section, not elsewhere',()=>{
 const first='Normal age is 65, and this section does not mention a later amendment.\n';
 const second='A later amendment says normal age is 67.\n';
 const d={...doc,text:first+second,records:undefined};
 const audit={
  documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:first.length},{chunk:2,start:first.length,end:d.text.length}],
  candidates:{'/age':[{value:67,spans:[{chunk:1,start:0,end:first.length}]}]},
  conflicts:[]
 };
 const restricted=auditLiteralEvidence(d,{age:67},audit);
 assert.equal(restricted[0].status,'missing');
 assert.equal(restricted[0].sourceScope,'model_sections');
 const whole=auditLiteralEvidence(d,{age:67});
 assert.equal(whole[0].status,'match');
});

test('explicit reviewer-edited values may find any source but require source confirmation',()=>{
 const text='Early age 55, normal age 65.';
 const d={...doc,text,records:undefined};
 const audit={
  documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:text.length}],
  candidates:{'/age':[{value:55,spans:[{chunk:1,start:0,end:text.length}]}]},conflicts:[]
 };
 const checks=auditLiteralEvidence(d,{age:65},audit);
 assert.equal(checks[0].status,'match');
 assert.equal(checks[0].sourceScope,'reviewer_edited');
 assert.equal(evidenceReviewComplete(checks,{},{}),false);
});

test('array element matches inherit the model candidate source span',()=>{
 const a='Normal forms SLA and JS50.\n',b='An unrelated glossary repeats JS50.\n';
 const d={...doc,text:a+b,records:undefined};
 const audit={documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:a.length},{chunk:2,start:a.length,end:d.text.length}],
  candidates:{'/forms':[{value:['SLA','JS50'],spans:[{chunk:1,start:0,end:a.length}]}]},conflicts:[]};
 const c=auditLiteralEvidence(d,{forms:['SLA','JS50']},audit);
 assert.equal(c[1].matches.length,1);
 assert.ok(c[1].matches[0].start<a.length);
 assert.equal(c[1].sourceScope,'model_sections');
});

test('exported citations disclose whether their candidate came from a model section',()=>{
 const source='Normal age 65.';
 const d={...doc,text:source,records:undefined};
 const audit={documentId:d.id,documentName:d.name,sourceText:source,length:source.length,
  chunks:[{chunk:1,start:0,end:source.length}],
  candidates:{'/age':[{value:65,spans:[{chunk:1,start:0,end:source.length}]}]},
  conflicts:[]};
 const checks=auditLiteralEvidence(d,{age:65},audit);
 const result=exportReviewedEvidence(checks,{'/age':0},{'/age':true});
 assert.equal(result['/age'].sourceScope,'model_sections');
 assert.equal(result['/age'].location.kind,'document');
});

test('human-supplied exact source passage supports a boolean without inventing a literal true value',()=>{
 const text='Vesting service may continue after the benefit accrual freeze date.';
 const d={...doc,text,records:undefined};
 const audit={documentId:d.id,documentName:d.name,sourceText:text,length:text.length,
  chunks:[{chunk:1,start:0,end:text.length}],
  candidates:{'/vesting_continues':[{value:true,spans:[{chunk:1,start:0,end:text.length}]}]},
  conflicts:[]};
 const none=auditLiteralEvidence(d,{vesting_continues:true},audit);
 assert.equal(none[0].status,'missing');
 const quote='Vesting service may continue after the benefit accrual freeze date';
 const supported=auditLiteralEvidence(d,{vesting_continues:true},audit,{'/vesting_continues':quote});
 assert.equal(supported[0].status,'match');
 assert.equal(supported[0].evidenceMethod,'reviewer_quoted_passage');
 assert.equal(supported[0].matches[0].evidenceMethod,'reviewer_quoted_passage');
 assert.equal(evidenceReviewComplete(supported,{},{}),false);
 assert.equal(evidenceReviewComplete(supported,{'/vesting_continues':0},{'/vesting_continues':true}),true);
});
test('invented, too-short and other-section reviewer quotations cannot unlock evidence',()=>{
 const first='Rule says vesting service continues.\n';
 const second='Unrelated section discusses disability.\n';
 const d={...doc,text:first+second,records:undefined};
 const audit={documentId:d.id,documentName:d.name,sourceText:d.text,length:d.text.length,
  chunks:[{chunk:1,start:0,end:first.length},{chunk:2,start:first.length,end:d.text.length}],
  candidates:{'/continued':[{value:true,spans:[{chunk:1,start:0,end:first.length}]}]},conflicts:[]};
 for(const quote of ['invented passage', 'service', 'Unrelated section discusses disability']){
  const check=auditLiteralEvidence(d,{continued:true},audit,{'/continued':quote});
  assert.equal(check[0].status,'missing');
 }
});


test('Positive numeric evidence is not borrowed from negative, signed, or accounting values',()=>{
 const text='Benefit -65. Offset −65. Adjustment -$65. Liability ($65).';
 const d={...doc,text,records:undefined};
 for(const value of [65,'65']){
  const check=auditLiteralEvidence(d,{amount:value});
  assert.equal(check[0].status,'missing','sign must not be stripped from '+JSON.stringify(value));
 }
 const negative=auditLiteralEvidence(d,{amount:-65});
 assert.equal(negative[0].status,'match','negative numeric value keeps its sign');
});

test('Numeric strings do not match grouped, decimal, exponential, or coded quantities',()=>{
 const text='Case A65 uses 1,650 units. Scale 65e3. Reference 1e65. Age 65.5.';
 const d={...doc,text,records:undefined};
 for(const value of [65,'65',650,'650']){
  const check=auditLiteralEvidence(d,{number:value});
  assert.equal(check[0].status,'missing','must not match a partial numeric token '+value);
 }
 const exact=auditLiteralEvidence({...d,text:text+' Normal age 65.'},{age:'65'});
 assert.equal(exact[0].status,'match');
 assert.equal(exact[0].matches.length,1);
 assert.match(exact[0].matches[0].quote,/Normal age 65/);
});

test('Pension age ranges need explicit interpretation instead of matching bare numeric strings',()=>{
 const text='Early eligibility 55-65; later text confirms age 65.';
 const d={...doc,text,records:undefined};
 const check=auditLiteralEvidence(d,{age:'65'});
 assert.equal(check[0].status,'match');
 assert.equal(check[0].matches.length,1);
 assert.equal(check[0].matches[0].start,text.lastIndexOf('65'));
});


test('pension form codes cannot borrow evidence from longer codes',()=>{
  const text='Available forms: SLA99, JS500, ALT_SLA and PREJS50X.';
  const d={...doc,text,records:undefined};
  for(const form of ['SLA','JS50']){
    const checks=auditLiteralEvidence(d,{form});
    assert.equal(checks[0].status,'missing',form+' is not a whole source code');
  }
  const source='Available forms: SLA, JS50.';
  const exact=auditLiteralEvidence({...d,text:source},{forms:['SLA','JS50']});
  assert.ok(exact.every(check=>check.status==='match'));
  assert.equal(exact[0].matches.length,1);
  assert.equal(exact[1].matches.length,1);
});

test('hyphenated and slash-joined codes do not prove standalone form codes',()=>{
  const d={...doc,text:'PRE-SLA SLA-5C SLA/JS50 and JS50-75.',records:undefined};
  for(const value of ['SLA','JS50']){
    assert.equal(auditLiteralEvidence(d,{code:value})[0].status,'missing');
  }
  const exact=auditLiteralEvidence({...d,text:'Forms: (SLA), JS50.'},{code:'SLA'});
  assert.equal(exact[0].status,'match');
});

test('text evidence respects complete words, punctuation and Unicode letters',()=>{
  const text='Participants receive services; A65Plan does not include the word service. Renégociation, préÉtage.';
  const d={...doc,text,records:undefined};
  assert.equal(auditLiteralEvidence(d,{value:'service'})[0].status,'match');
  assert.equal(auditLiteralEvidence(d,{value:'Étage'})[0].status,'missing');
  const onlyLong={...d,text:'Participants receive services and code A65Plan.'};
  for(const value of ['service','A65']){
    assert.equal(auditLiteralEvidence(onlyLong,{value})[0].status,'missing');
  }
});

test('reviewer supplied passage must appear as complete text boundaries',()=>{
  const d={...doc,text:'The source mentions pretended_service with no independent provision.',records:undefined};
  const unsupported=auditLiteralEvidence(d,{applies:true},undefined,
    {'/applies':'tended_service with no independent'});
  assert.equal(unsupported[0].status,'missing');
  const quoted=auditLiteralEvidence(d,{applies:true},undefined,
    {'/applies':'The source mentions pretended_service'});
  assert.equal(quoted[0].status,'match');
  assert.equal(quoted[0].evidenceMethod,'reviewer_quoted_passage');
});

test('evidence field-value identity rejects stale fields, even when confirmations are complete',async()=>{
  const {evidenceMatchesCurrentValue}=await import('../src/evidence.ts');
  const checks=auditLiteralEvidence({...doc,records:undefined},{age:65,form:'SLA'});
  assert.equal(evidenceMatchesCurrentValue({age:65,form:'SLA'},checks),true);
  assert.equal(evidenceMatchesCurrentValue({age:65,form:'JS50'},checks),false);
  assert.equal(evidenceMatchesCurrentValue({age:65},checks),false);
  assert.equal(evidenceMatchesCurrentValue({age:65,form:'SLA',other:0},checks),false);
  assert.equal(evidenceMatchesCurrentValue({age:65,form:null},checks),false);
  assert.equal(evidenceMatchesCurrentValue({age:65,form:'SLA'},[checks[0],checks[0]]),false);
});

test('selected citation source offsets, quote and location must remain authentic at export',async()=>{
 const {evidenceSelectionsAnchoredToDocument}=await import('../src/evidence.ts');
 const source='Normal retirement age 65. Vested participants receive a benefit.';
 const current={...doc,text:source,records:undefined};
 const checks=auditLiteralEvidence(current,{age:65});
 assert.equal(evidenceSelectionsAnchoredToDocument(current,checks,{'/age':0}),true);
 const original=checks[0].matches[0];
 for(const forged of [
   {...original,start:0},
   {...original,end:original.end+1},
   {...original,quote:'unrelated excerpt'},
   {...original,label:'Page 2'},
   {...original,location:{kind:'pdf-page',page:99}},
   {...original,evidenceMethod:'reviewer_quoted_passage'}
 ]){
   assert.equal(evidenceSelectionsAnchoredToDocument(current,[{
     ...checks[0],matches:[forged]
   }],{'/age':0}),false);
 }
});
test('reviewer quotes and parser-added labels are checked against real cells',async()=>{
 const {evidenceSelectionsAnchoredToDocument}=await import('../src/evidence.ts');
 const source='Row 1 column 1: Vesting service continues after the freeze.\\n';
 const current={...doc,text:source,records:[{
   start:0,end:source.length,label:'Row 1 column 1',
   location:{kind:'csv-cell',row:1,column:1}
 }]};
 const checks=auditLiteralEvidence(current,{continues:true},undefined,
   {'/continues':'Vesting service continues after the freeze'});
 assert.equal(checks[0].status,'match');
 assert.equal(evidenceSelectionsAnchoredToDocument(current,checks,{'/continues':0}),true);
 const labelMatch={...checks[0].matches[0],start:0,end:3};
 assert.equal(evidenceSelectionsAnchoredToDocument(current,[{
   ...checks[0],matches:[labelMatch]
 }],{'/continues':0}),false);
});

test('non-PDF citations cannot invent PDF highlight rectangles',async()=>{
 const {evidenceSelectionsAnchoredToDocument}=await import('../src/evidence.ts');
 const source='Normal retirement at age 65.';
 const sourceDoc={...doc,text:source,records:undefined};
 const checks=auditLiteralEvidence(sourceDoc,{age:65});
 assert.equal(evidenceSelectionsAnchoredToDocument(sourceDoc,checks,{'/age':0}),true);
 const forged={...checks[0].matches[0],textItemBoxes:[{
   x:0,y:0,width:80,height:10,precision:'pdf-text-item-envelope'
 }]};
 assert.equal(evidenceSelectionsAnchoredToDocument(sourceDoc,[{
   ...checks[0],matches:[forged]
 }],{'/age':0}),false);
});

test('reviewer OCR word highlights must exactly match parser-measured PDF envelopes',async()=>{
 const {evidenceSelectionsAnchoredToDocument}=await import('../src/evidence.ts');
 const source='Page 3:\nAGE MONTHLY FACTOR\n58 0.9063\n64 0.9813\n\n';
 const start=source.indexOf('58'),end=start+2;
 const box={x:40,y:390,width:20,height:10};
 const sourceDoc={...doc,text:source,records:[{
   start:0,end:source.length,label:'Page 3',
   location:{kind:'pdf-page-ocr',page:3,confidence:91},
   textSpans:[{start,end,box,precision:'pdf-ocr-word-envelope'}]
 }]};
 const checks=auditLiteralEvidence(sourceDoc,{age:58});
 assert.equal(checks[0].status,'match');
 const original=checks[0].matches[0];
 assert.equal(original.location.page,3);
 assert.deepEqual(original.textItemBoxes,[{...box,precision:'pdf-ocr-word-envelope'}]);
 assert.equal(evidenceSelectionsAnchoredToDocument(sourceDoc,checks,{'/age':0}),true);
 for(const forged of [
   {...original,textItemBoxes:[{...box,precision:'pdf-text-item-envelope'}]},
   {...original,textItemBoxes:[{...box,x:box.x+1,precision:'pdf-ocr-word-envelope'}]},
   {...original,textItemBoxes:[]},
   {...original,location:{kind:'pdf-page-ocr',page:4,confidence:91}},
   {...original,start:start+1}
 ]){
   assert.equal(evidenceSelectionsAnchoredToDocument(sourceDoc,[
     {...checks[0],matches:[forged]}
   ],{'/age':0}),false);
 }
});
