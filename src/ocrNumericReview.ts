/**
 * Diagnostic-only numeric OCR ambiguity screen.
 *
 * Detects number-like OCR tokens that mix decimal digits with glyphs often
 * confused for numerals (O/0, I/l/1, S/5, B/8, Z/2). It does NOT decide the
 * intended value, perform OCR correction, estimate probabilities, or create
 * word/cell coordinates. Return only a bounded COUNT: never echo possible
 * identifiers or participant values into logs or review summaries.
 */
const numericLike=/[0-9OoIiLlSsBbZz]+(?:[.,][0-9OoIiLlSsBbZz]+)?/g;
const likelyConfusable=/[OoIiLlSsBbZz]/;
const asciiWord=/[A-Za-z0-9_]/;
export const MAX_NUMERIC_OCR_AMBIGUITIES=100;

/** Clamps at 100; a result of 100 means AT LEAST 100 potential ambiguities. */
export function countAmbiguousOcrNumericTokens(text:string):number{
  if(typeof text!=='string'||!text)return 0;
  let count=0;
  for(const match of text.matchAll(numericLike)){
    const token=match[0],start=match.index,end=start+token.length;
    if(asciiWord.test(text[start-1]||'')||asciiWord.test(text[end]||''))continue;
    if(!/[0-9]/.test(token)||!likelyConfusable.test(token))continue;
    count++;
    if(count>=MAX_NUMERIC_OCR_AMBIGUITIES)return MAX_NUMERIC_OCR_AMBIGUITIES;
  }
  return count;
}
