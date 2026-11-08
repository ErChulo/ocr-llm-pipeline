/**
 * Deterministic fixture selection for a bounded *fictional* model evaluation.
 * "all" retains the existing eight-case holdout. A subset is never reported
 * as the full cohort and cannot silently skip unknown or duplicate IDs.
 */
export function selectPhysicalHoldoutCases(allCases,selection='all'){
  if(!Array.isArray(allCases)||allCases.length===0||
     allCases.some(sample=>typeof sample?.id!=='string'||!sample.id)||
     new Set(allCases.map(sample=>sample.id)).size!==allCases.length)
    throw new Error('Invalid full physical holdout corpus.');
  if(selection==='all')return [...allCases];
  if(typeof selection!=='string'||selection.length>512||!selection.trim())
    throw new Error('Invalid physical holdout selection.');
  const ids=selection.split(',').map(id=>id.trim());
  if(ids.some(id=>!id)||new Set(ids).size!==ids.length)
    throw new Error('Physical holdout IDs must be distinct and nonempty.');
  const lookup=new Map(allCases.map(sample=>[sample.id,sample]));
  return ids.map(id=>{
    const sample=lookup.get(id);
    if(!sample)throw new Error('Unknown fictional physical holdout fixture: '+id);
    return sample;
  });
}
