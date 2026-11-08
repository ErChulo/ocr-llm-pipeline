/**
 * Conservative, OFFLINE review indicator for quoted instructions embedded in
 * untrusted source documents. A model may obey these words or select their
 * numeric examples instead of actual plan provisions.
 *
 * This is NOT a prompt-injection sanitizer, an instruction classifier or a
 * factual filter. It never removes words, changes candidates or auto-decides
 * applicability. It requires a source-completeness acknowledgement, and
 * existing field-level citations and factual human review still apply.
 */
import type {SourceDocument,SourceReviewIssue} from './pipeline.ts';

const ISSUE_ID='source:instruction-risk';
const WARNING='Possible instructions to an AI extractor were found inside source text. Inspect the original before export.';

// Require both an imperative and AI-specific instruction language to reduce
// false flags for ordinary legal provisions such as "ignore prior service".
const overridePrompt=/\b(?:ignore|disregard|override|bypass|forget)\b[^\r\n]{0,96}\b(?:system|developer|extraction|model|prompt)\b[^\r\n]{0,40}\b(?:instructions?|rules?|prompts?|messages?)\b/i;
const previousPrompt=/\b(?:ignore|disregard|override)\b[^\r\n]{0,50}\b(?:previous|prior)\b[^\r\n]{0,30}\b(?:instructions?|messages?|prompts?)\b/i;
const impersonateRole=/\b(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)\b[^\r\n]{0,50}\b(?:assistant|system|developer)\b/i;
const modelRoleEnvelope=/<\|\s*(?:im_start|start_header_id)\s*\|>\s*(?:system|developer|assistant)\b/i;
const forgedRoleLine=/(?:^|\n)[ \t]*(?:#{1,6}[ \t]*)?(?:system|developer)[ \t]*:[ \t]*(?:ignore|disregard|override|bypass)\b/im;
const forgedRoleHeading=/(?:^|\r?\n)[ \t]{0,16}(?:#{1,6}[ \t]*)?(?:system|developer)(?:[ \t]+(?:prompt|message|instructions?))?[ \t]*:?[ \t]*\r?\n[ \t]{0,16}(?:ignore|disregard|override|bypass|return|output|extract|you[ \t]+must)\b/im;

// Normalize ONLY a temporary screening view. Original source text, source
// offsets, OCR transcription, SHA-256 fingerprints and evidence never change.
// The bounded instruction patterns below still determine whether to warn.
function instructionScreeningView(text:string):string {
  return text.replace(/[\u200B-\u200D\u2060\uFEFF]/g,'')
    .replace(/[\r\n\t\f\v]+/g,' ');
}


export function containsSourceInstructionRisk(text:string):boolean {
  if(typeof text!=='string'||!text)return false;
  // Structured role tokens are a strong prompt-injection signal even when the
  // adjacent command is separated by a newline. Plain legal references to
  // "the system" or "a developer" do not meet this condition.
  // Screen multiline Markdown/heading role spoofing without rewriting the
  // original OCR transcription or any parser-derived evidence offsets.
  const roleScreen=text.replace(/[\u200B-\u200D\u2060\uFEFF]/g,'');
  if(modelRoleEnvelope.test(text)||forgedRoleLine.test(text)||
     forgedRoleHeading.test(roleScreen))return true;
  const screening=instructionScreeningView(text);
  return overridePrompt.test(screening)||previousPrompt.test(screening)||
    impersonateRole.test(screening)||modelRoleEnvelope.test(screening);
}

export function withSourceInstructionReview(doc:SourceDocument):SourceDocument {
  const risky=containsSourceInstructionRisk(doc.text);
  const issues=(doc.reviewIssues||[]).filter(issue=>issue.id!==ISSUE_ID);
  const warnings=(doc.warnings||[]).filter(warning=>warning!==WARNING);
  if(risky){
    const issue:SourceReviewIssue={
      id:ISSUE_ID,category:'source_instruction_risk',
      message:'Possible instructions to an AI model appear in this source. Treat the passage as untrusted data, not a plan provision. Check any extracted value against the governing source before export.'
    };
    issues.push(issue);
    warnings.push(WARNING);
  }
  return {...doc,
    reviewIssues:issues.length?issues:undefined,
    warnings:warnings.length?warnings:undefined};
}
