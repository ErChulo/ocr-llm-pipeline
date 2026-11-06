/**
 * Strict RFC 4180-like CSV parser for local census and plan inputs.
 * Never evaluates formulas or assumes the first row is a header.
 * Parser-derived row/column indexes refer to the original CSV structure.
 */
import type { SourceDocument, SourceRecord } from './pipeline.ts';

const MAX_CELLS=100000;
const MAX_RENDERED=2_000_000;

export function parseCsv(fileName:string,raw:string):SourceDocument {
  const data=raw.charCodeAt(0)===0xFEFF?raw.slice(1):raw;
  if(!data.trim())throw new Error('CSV contains no data.');
  const records:SourceRecord[]=[];
  const fragments:string[]=[];
  let total=0,cell=1,row=1,quoted=false,closed=false,value='';
  function commitCell(){
    if(value.trim()){
      const label='Row '+row+' column '+cell;
      const rendered=label+': '+value+'\n';
      if(total+rendered.length>MAX_RENDERED)throw new Error('CSV extracted text exceeds 2 million characters.');
      records.push({start:total,end:total+rendered.length,label,location:{kind:'csv-cell',row,column:cell}});
      fragments.push(rendered);
      total+=rendered.length;
    }
    value='';closed=false;
    cell++;
    if(row>1_000_000||cell>16384||records.length>MAX_CELLS)throw new Error('CSV has too many rows or cells.');
  }
  function newRow(){
    commitCell();
    row++;
    cell=1;
  }
  for(let i=0;i<data.length;i++){
    const ch=data[i];
    if(quoted){
      if(ch==='"'){
        if(data[i+1]==='"'){value+='"';i++;}
        else{quoted=false;closed=true;}
      }else value+=ch;
      continue;
    }
    if(ch===','){commitCell();continue;}
    if(ch==='\r'||ch==='\n'){
      newRow();
      if(ch==='\r'&&data[i+1]==='\n')i++;
      continue;
    }
    if(closed){
      if(ch===' '||ch==='\t')continue;
      throw new Error('Invalid CSV: characters after a closing quotation mark at row '+row+'.');
    }
    if(ch==='"'){
      if(value.length)throw new Error('Invalid CSV: quotation mark inside an unquoted cell at row '+row+'.');
      quoted=true;
      continue;
    }
    value+=ch;
  }
  if(quoted)throw new Error('Invalid CSV: an opening quotation mark has no closing quotation mark.');
  if(value.length||cell>1)commitCell();
  if(!records.length)throw new Error('CSV contains no nonempty cells.');
  return {
    id:fileName,name:fileName,text:fragments.join(''),mimeType:'text/csv',
    sizeBytes:new TextEncoder().encode(raw).byteLength,
    provenance:{source:'csv-native',precision:'cell',fileName},
    records,
    warnings:[
      'CSV row/column locations come from the original file. The first row is not assumed to be a header.',
      'Every CSV value is treated as text. Spreadsheet formulas are never evaluated.'
    ]
  };
}
