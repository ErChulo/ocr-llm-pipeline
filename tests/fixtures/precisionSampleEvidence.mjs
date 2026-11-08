/**
 * Mathematical SAMPLE-SIZE diagnostic for an observed zero-error cohort.
 * The one-sided exact Clopper-Pearson lower limit is alpha^(1/n) only
 * when all n Bernoulli trials succeed; otherwise return null, NOT a
 * fabricated lower confidence limit. Actual scan pairs are correlated,
 * so this conditional statistic NEVER certifies production accuracy.
 */
export function zeroErrorPrecisionEvidence(args){
  const {correct,accepted,confidence=0.95,targetPrecision=0.995}=args??{};
  if(!Number.isSafeInteger(correct)||!Number.isSafeInteger(accepted)||
    correct<0||accepted<0||correct>accepted||
    !Number.isFinite(confidence)||confidence<=0||confidence>=1||
    !Number.isFinite(targetPrecision)||targetPrecision<=0||targetPrecision>=1)
    throw new Error('Invalid precision evidence counts or targets.');
  const zeroErrors=accepted>0&&correct===accepted;
  const oneSidedExactLowerIfZeroErrors=zeroErrors
    ?Math.exp(Math.log(1-confidence)/accepted):null;
  const minIndependentZeroErrorTrials=Math.ceil(
    Math.log(1-confidence)/Math.log(targetPrecision));
  return {
    correct,accepted,observedPrecision:accepted?correct/accepted:null,
    confidence,targetPrecision,oneSidedExactLowerIfZeroErrors,
    minIndependentZeroErrorTrials,
    mathematicalSampleConditionMet:zeroErrors &&
      oneSidedExactLowerIfZeroErrors>=targetPrecision,
    certification:'not-certified-independent-trial-assumption-unverified'
  };
}
