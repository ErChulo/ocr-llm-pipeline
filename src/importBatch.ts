/**
 * Transactional, bounded import for the offline file:// document workspace.
 * Importing a pick of files must not start dozens of simultaneous OCR/PDF
 * parses or partially overwrite the source-review context when a file fails.
 */
import type { SourceDocument, ImportResult } from './pipeline.ts';

const MAX_FILES_PER_PICK=20;
const MAX_SESSION_DOCUMENTS=200;
const MAX_SESSION_TEXT_CHARS=4_000_000;
const MAX_SESSION_SOURCE_BYTES=80*1024*1024;
const MAX_FILE_BYTES=20*1024*1024;

type LocalFile = Pick<File,'name'|'size'>;
type ImportOne=(file:File)=>Promise<ImportResult>;
type Progress=(processed:number,total:number)=>void;
export type BatchResult={documents:SourceDocument[];notes:string[]};

function key(value:string):string {
  return value.normalize('NFC').toLocaleLowerCase('en-US');
}

/** Validate each file before running ANY importer. */
function preflight(files:readonly LocalFile[],existing:readonly SourceDocument[]):void {
  if(!files.length||files.length>MAX_FILES_PER_PICK)throw new Error(
    'Choose 1 to '+MAX_FILES_PER_PICK+' files per import batch.'
  );
  if(existing.length>=MAX_SESSION_DOCUMENTS)throw new Error(
    'The session has reached the 200-document limit. Start a new session.'
  );
  const incomingBytes=files.reduce((sum,f)=>{
    if(typeof f.name!=='string'||!f.name.trim()||f.name.length>500||
       !Number.isSafeInteger(f.size)||f.size<=0||f.size>MAX_FILE_BYTES){
      throw new Error('Each imported file needs a name and must be between 1 byte and 20 MB.');
    }
    return sum+f.size;
  },0);
  const existingBytes=existing.reduce((sum,doc)=>sum+doc.sizeBytes,0);
  if(existingBytes+incomingBytes>MAX_SESSION_SOURCE_BYTES)throw new Error(
    'Imported files exceed the 80 MB session memory limit. Start a new session.'
  );
}
function validateDoc(doc:SourceDocument):void {
  if(!doc||typeof doc.id!=='string'||!doc.id.trim()||
     typeof doc.name!=='string'||!doc.name.trim()||
     typeof doc.text!=='string'||!doc.text.trim()||
     !Number.isSafeInteger(doc.sizeBytes)||doc.sizeBytes<0||
     doc.sizeBytes>MAX_FILE_BYTES){
    throw new Error('A file produced an invalid document identity, source text, or size. Import was discarded.');
  }
  if(doc.text.length>2_000_000)throw new Error(
    'A document exceeds the 2-million-character source limit.'
  );
}
export async function importDocumentBatch(
  files:readonly File[], existing:readonly SourceDocument[],
  importOne:ImportOne, onProgress?:Progress
):Promise<BatchResult>{
  preflight(files,existing);
  const ids=new Set(existing.map(doc=>key(doc.id)));
  const names=new Set(existing.map(doc=>key(doc.name)));
  let totalDocs=existing.length;
  let totalChars=existing.reduce((sum,doc)=>sum+doc.text.length,0);
  let totalBytes=existing.reduce((sum,doc)=>sum+doc.sizeBytes,0);
  const documents:SourceDocument[]=[];
  const notes:string[]=[];
  for(let i=0;i<files.length;i++){
    // Sequential execution bounds peak OCR/WASM and PDF parsing workloads.
    // No caller-visible document list is mutated before all files succeed.
    const imported=await importOne(files[i]);
    if(!imported||!Array.isArray(imported.documents)||
       !imported.documents.length)throw new Error(
      'File '+(i+1)+' returned no source documents. No files were imported.'
    );
    for(const doc of imported.documents){
      validateDoc(doc);
      const id=key(doc.id),name=key(doc.name);
      if(ids.has(id)||names.has(name)){
        throw new Error(
          'Duplicate document identity or filename: '+doc.name+
          '. Rename the input or start a new session. No files were imported.'
        );
      }
      ids.add(id);names.add(name);
      totalDocs++;
      totalChars+=doc.text.length;
      totalBytes+=doc.sizeBytes;
      if(totalDocs>MAX_SESSION_DOCUMENTS)throw new Error(
        'The session exceeds 200 documents. No files were imported.'
      );
      if(totalChars>MAX_SESSION_TEXT_CHARS)throw new Error(
        'The session exceeds 4 million extracted characters. No files were imported.'
      );
      if(totalBytes>MAX_SESSION_SOURCE_BYTES)throw new Error(
        'The session exceeds 80 MB of retained source files. No files were imported.'
      );
      documents.push(doc);
    }
    notes.push(...(imported.notes??[]));
    onProgress?.(i+1,files.length);
  }
  return {documents,notes};
}
