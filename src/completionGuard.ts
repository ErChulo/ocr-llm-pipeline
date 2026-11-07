/** Completion status from the local Wllama streaming response. */
export function assertGenerationComplete(finishReason:string|null|undefined):void{
  // Even syntactically valid JSON may omit fields if generation reaches
  // max_tokens before the model chooses its normal stopping point.
  if(finishReason==='length'||finishReason==='max_tokens'){
    throw new Error('Model output reached the maximum generation-token limit. The result was not accepted. Increase Max tokens or simplify the schema and extract again.');
  }
}
