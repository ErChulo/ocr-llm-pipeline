import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectNormalAgeSourceConflict} from '../src/normalAgeConflict.ts';
import {collectChunkCandidates} from '../src/chunkExtraction.ts';
import {assessCandidateSourceAttribution} from '../src/sourceAttribution.ts';

const doc=(text,records)=>({
  id:'fictional',name:'fictional-provenance.txt',text,mimeType:'text/plain',
  sizeBytes:new TextEncoder().encode(text).length,
  provenance:{source:'local-text',precision:'document',fileName:'fictional-provenance.txt'},
  ...(records?{records}:{}),
});
const record=(start,end)=>({start,end,label:'Original parser record',
  location:{kind:'document'}});
const evaluate=(source,age)=>{
  const value={normal_age:age};
  const chunk={chunk:1,start:0,end:source.text.length,text:source.text};
  const audit=collectChunkCandidates(source,[chunk],[value]);
  return assessCandidateSourceAttribution(source,audit,value);
};

test('leading unindexed conflicting provision makes normal-age record coverage unscannable',()=>{
  const text='Hidden amendment: Normal retirement age 67.\n'+
    'Official indexed record: Normal retirement age 65.';
  const from=text.indexOf('Official');
  const source=doc(text,[record(from,text.length)]);
  const snapshot=structuredClone(source);
  const scan=inspectNormalAgeSourceConflict(source,'/normal_age');
  assert.equal(scan.state,'unscannable');
  assert.deepEqual(evaluate(source,65).abstentions,[{
    path:'/normal_age',reason:'unscannable-normal-age-source'
  }]);
  assert.deepEqual(source,snapshot,'original text, record locations and bytes remain untouched');
});
test('interior and trailing omitted source text cannot be silently skipped',()=>{
  const text='Normal retirement age 65.\n\n'+
    'Amendment: Normal retirement age 67.\n\n'+
    'Same document trailing text';
  const p=text.indexOf('Amendment'),q=text.indexOf('Same document');
  for(const records of [
    [record(0,p),record(q,text.length)],
    [record(0,p)],
    [record(p,text.length)]
  ]){
    const source=doc(text,records);
    assert.equal(inspectNormalAgeSourceConflict(source,'/normal_age').state,'unscannable');
    assert.equal(evaluate(source,65).decision,'abstain');
  }
});
test('whitespace gaps between genuinely indexed records do not create spurious abstention',()=>{
  const text='Normal age 65.\n\n  Normal age 65.  \n';
  const second=text.lastIndexOf('Normal');
  const source=doc(text,[
    record(0,text.indexOf('\n')),
    record(second,text.indexOf('  \n',second))
  ]);
  assert.equal(inspectNormalAgeSourceConflict(source,'/normal_age').state,'clear');
  assert.deepEqual(inspectNormalAgeSourceConflict(source,'/normal_age').distinctAges,[65]);
});
test('no parser records legitimately means one complete document source',()=>{
  const source=doc('Normal age 65.\nNormal age 67.');
  assert.equal(inspectNormalAgeSourceConflict(source,'/normal_age').state,'unresolved');
});
