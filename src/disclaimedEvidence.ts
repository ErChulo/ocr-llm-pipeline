/**
 * A selected citation may literally match a value yet explicitly disclaim
 * being a governing/source-applicable fact. This strictly bounded screen
 * handles ONLY express labels; it does not interpret amendment hierarchy,
 * dates, participant groups, legal applicability or plain "Appendix" headings.
 * No text, citation offset or parser metadata is modified.
 */
const disclaimer=/\b(?:untrusted|non[-\s]?governing|non[-\s]?authoritative)\s+(?:appendix|example|sample|section|data)\b|\b(?:example|sample|illustration|test\s+data|mock\s+output)\s+(?:only|not\s+(?:applicable|authoritative|governing))\b|\b(?:not|never)\s+(?:(?:a|an|the)\s+)?(?:governing|authoritative|applicable)\s+(?:plan\s+)?(?:provision|rule|fact|source)\b|\b(?:do\s+not|never)\s+(?:use|apply|cite)\s+(?:this\s+|the\s+)?(?:sample|example|illustration|untrusted\s+appendix)\b/i;
export function selectedCitationExpresslyDisclaimed(
  text:string,start:number,end:number
):boolean {
  if(typeof text!=='string'||!Number.isSafeInteger(start)||
     !Number.isSafeInteger(end)||start<0||end<=start||end>text.length)return true;
  // Scan only the local line and up to two preceding lines. This catches a
  // short "EXAMPLE ONLY" heading but avoids taint from unrelated old sections.
  const lineStart=text.lastIndexOf('\n',start-1)+1;
  const endNewline=text.indexOf('\n',end);
  const lineEnd=endNewline<0?text.length:endNewline;
  let from=lineStart;
  for(let i=0;i<2&&from>0;i++)from=text.lastIndexOf('\n',from-2)+1;
  if(lineEnd-from>4096)return true; // unreadably long context abstains
  return disclaimer.test(text.slice(from,lineEnd).replace(/[\u200B-\u200D\u2060\uFEFF]/g,''));
}
