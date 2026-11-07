/**
 * Show the original source sections for competing model candidates.
 * A nearby string is context for human review, not automatic precedence.
 */
import type { Candidate } from './chunkExtraction.ts';
import type { SourceDocument } from './pipeline.ts';
export type CandidatePreview={
  chunk:number;start:number;end:number;excerpt:string;valueLocated:boolean;
};
export function candidatePreviews(doc:SourceDocument,candidate:Candidate,maxChars=170):CandidatePreview[]{
  if(!Number.isInteger(maxChars)||maxChars<80||maxChars>500)
    throw new Error('Review excerpt size must be between 80 and 500 characters.');
  return candidate.spans.slice(0,3).map(span=>{
    if(!Number.isInteger(span.start)||!Number.isInteger(span.end)||
      span.start<0||span.end>doc.text.length||span.end<=span.start)
      throw new Error('Model candidate source offsets are invalid.');
    const section=doc.text.slice(span.start,span.end);
    const needle=typeof candidate.value==='string'||typeof candidate.value==='number'
      ? String(candidate.value):'';
    const hit=needle ? section.toLocaleLowerCase('en-US')
      .indexOf(needle.toLocaleLowerCase('en-US')) : -1;
    const anchor=hit>=0?hit:0;
    const start=Math.max(0,Math.min(anchor-Math.floor(maxChars/3),section.length-maxChars));
    const end=Math.min(section.length,start+maxChars);
    const excerpt=section.slice(start,end).replace(/\s+/g,' ').trim();
    return {chunk:span.chunk,start:span.start+start,end:span.start+end,
      excerpt,valueLocated:hit>=0};
  });
}
