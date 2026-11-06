import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/csv.ts';
test('CSV values retain row and column locations',()=>{
  const text='Code,Value\r\n"ER, rule","55/10"\r\n"SLA","Normal form"\r\n';
  const result=parseCsv('synthetic.csv',text);
  assert.equal(result.provenance.source,'csv-native');
  assert.equal(result.provenance.precision,'cell');
  assert.equal(result.records.length,6);
  assert.deepEqual(result.records[2].location,{kind:'csv-cell',row:2,column:1});
  assert.equal(result.records[3].location.column,2);
  assert.match(result.text,/Row 2 column 1: ER, rule/);
  assert.match(result.text,/Row 2 column 2: 55\/10/);
});
test('quoted embedded newlines and doubled quotes remain data',()=>{
  const p=parseCsv('s.csv','"Line one\nline two","uses ""quoted"" text"\n');
  assert.match(p.text,/Line one\nline two/);
  assert.match(p.text,/uses "quoted" text/);
  assert.equal(p.records[1].location.row,1);
});
test('invalid quoting is rejected and spreadsheet formulas never execute',()=>{
  assert.throws(()=>parseCsv('a.csv','"unterminated'),/no closing quotation/);
  assert.throws(()=>parseCsv('a.csv','"a"x,b'),/after a closing quotation/);
  const result=parseCsv('a.csv','=1+1,65');
  assert.match(result.text,/=1\+1/);
  assert.ok(result.warnings.some(x=>x.includes('never evaluated')));
});
test('empty CSV fails and UTF-8 BOM is stripped',()=>{
 assert.throws(()=>parseCsv('b.csv','   '),/no data/);
 const parsed=parseCsv('b.csv','\uFEFFone,two\n');
 assert.ok(!parsed.text.includes('\uFEFF'));
});
