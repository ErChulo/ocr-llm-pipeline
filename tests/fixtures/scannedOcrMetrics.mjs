/**
 * Exact, page-local fictional OCR diagnostics. Test harness only.
 * Never repairs OCR, infers PDF cells, or converts a token hit into evidence.
 * Age/factor pairing is a same-line proxy, not geometric cell association.
 */
const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const literalPresent=(body,token)=>new RegExp(
  '(^|[^0-9A-Za-z_.+\\-−–])'+escapeRegExp(token)+'(?=$|[^0-9A-Za-z_.,%])'
).test(body);

export function scoreFictionalScannedPages(bodyByPage,expectedPages){
  if(!Array.isArray(expectedPages)||!expectedPages.length)
    throw new Error('Expected fictional page annotations are required.');
  const expectedTokens=expectedPages.flatMap(p=>p.rows.flat());
  if(new Set(expectedTokens).size!==expectedTokens.length)
    throw new Error('Page-local scoring requires unique annotated numeric tokens.');
  if(new Set(expectedPages.map(p=>p.page)).size!==expectedPages.length)
    throw new Error('Duplicate expected PDF page numbers.');
  return expectedPages.map(entry=>{
    if(!Number.isSafeInteger(entry.page)||entry.page<1||
      !Array.isArray(entry.rows)||!entry.rows.length||
      entry.rows.some(pair=>!Array.isArray(pair)||pair.length!==2||
        pair.some(value=>typeof value!=='string'||!/^[0-9]+(?:\.[0-9]+)?$/.test(value))))
      throw new Error('Invalid fictional numeric ground truth.');
    const body=bodyByPage[entry.page];
    if(typeof body!=='string')throw new Error('Missing actual OCR page '+entry.page+'.');
    const literals=entry.rows.flat();
    const literalHits=Object.fromEntries(literals.map(value=>[value,literalPresent(body,value)]));
    const rowPairHits=entry.rows.map(([age,factor])=>
      new RegExp('(?:^|\\n)\\s*'+escapeRegExp(age)+'[ \\t]+'+
        escapeRegExp(factor)+'(?=\\s|$)').test(body));
    const wrongPageLiterals=expectedPages.filter(other=>other.page!==entry.page)
      .flatMap(other=>other.rows.flat()).filter(value=>literalPresent(body,value));
    return {
      page:entry.page,rotation:entry.rotation??0,
      literalsRecognized:Object.values(literalHits).filter(Boolean).length,
      literalDenominator:literals.length,literalHits,
      missingLiterals:literals.filter(value=>!literalHits[value]),
      rowPairsRecognized:rowPairHits.filter(Boolean).length,
      rowPairDenominator:entry.rows.length,rowPairHits,
      wrongPageLiterals,characters:body.length
    };
  });
}
