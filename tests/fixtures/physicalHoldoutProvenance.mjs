/**
 * Diagnostic only: compare literal candidate matches to manually annotated
 * REAL parser locations in independent fictional physical source documents.
 *
 * Matching text does not prove that a provision is applicable, and this
 * evaluator never confirms evidence or bypasses export review.
 */
import {auditLiteralEvidence} from '../../src/evidence.ts';
import {parsePhysicalHoldout} from './physicalHoldoutCases.mjs';

function locationMatches(actual,expected){
  return !!actual&&Object.entries(expected).every(([key,value])=>actual[key]===value);
}
export async function assessHoldoutProvenance(sample,actual){
  const doc=await parsePhysicalHoldout(sample);
  const candidate=actual!==null&&typeof actual==='object'&&!Array.isArray(actual)?actual:{};
  const checks=auditLiteralEvidence(doc,candidate);
  const lookup=new Map(checks.map(check=>[check.path,check]));
  const fields=Object.entries(sample.expected).map(([key,truth])=>{
    const path='/'+key.replace(/~/g,'~0').replace(/\//g,'~1');
    const check=lookup.get(path);
    const lexical=check?.matches?.length>0;
    const matchesAnnotatedLocation=!!check?.matches?.some(m=>
      locationMatches(m.location,sample.expectedLocations[path]));
    const exact=Object.hasOwn(candidate,key)&&Object.is(candidate[key],truth);
    return {path,exact,literalMatch:lexical,
      correctLocationMatch:matchesAnnotatedLocation,
      status:check?.status||'missing'};
  });
  const unsupported=checks.filter(check=>!Object.hasOwn(sample.expected,check.path.slice(1)));
  return {
    documentFormat:sample.format,
    parserPrecision:doc.provenance.precision,
    sourceReviewIssueCount:doc.reviewIssues?.length||0,
    sourceReviewIssueCategories:[...new Set((doc.reviewIssues||[]).map(x=>x.category))],
    expectedFieldCount:fields.length,
    exactFieldCount:fields.filter(f=>f.exact).length,
    exactAndLocatedCount:fields.filter(f=>f.exact&&f.correctLocationMatch).length,
    // Literal support from a DIFFERENT source clause is not a correct field.
    literalButIncorrectCount:fields.filter(f=>!f.exact&&f.literalMatch).length,
    unlocatedExpectedFields:fields.filter(f=>!f.correctLocationMatch).map(f=>f.path),
    unsupportedFieldCount:unsupported.length,
    // These are parser-derived candidate matches, not reviewer approvals.
    status:'diagnostic_not_reviewed',
    fields
  };
}
