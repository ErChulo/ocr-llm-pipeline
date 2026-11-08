/** Conservative LOCAL identifier screening. Does not return or log matched values. */
export type PrivacyCategory = 'possible_ssn'|'email'|'payment_card'|'phone';
export type PrivacySummary = { categories: Partial<Record<PrivacyCategory,number>>; requiresReview:boolean };
function plausibleSSN(area:number,group:number,serial:number):boolean {
  return area>0 && area!==666 && area<900 && group>0 && serial>0;
}
function luhn(number:string):boolean {
  if(number.length<13||number.length>19)return false;
  let sum=0,double=false;
  for(let i=number.length-1;i>=0;i--){
    let digit=Number(number[i]);
    if(double){digit*=2;if(digit>9)digit-=9;}
    sum+=digit;double=!double;
  }
  return sum%10===0;
}
function countUnique(text:string, pattern:RegExp, valid:(match:string)=>boolean):number {
  const used=new Set<string>();
  for(const m of text.matchAll(pattern)){
    if(valid(m[0]))used.add(m.index+'-'+(m.index+m[0].length));
    if(used.size>10000)throw new Error('Document has too many possible identifiers for safe review.');
  }
  return used.size;
}
export function screenLocalPrivacy(text:string):PrivacySummary{
  if(typeof text!=='string')throw new Error('Privacy screen requires local document text.');
  const summary:PrivacySummary={categories:{},requiresReview:false};
  const found:Record<PrivacyCategory,number>={
    possible_ssn:countUnique(text,/\b\d{3}[- ]\d{2}[- ]\d{4}\b/g,m=>{
      const ds=m.replace(/\D/g,'');
      return plausibleSSN(Number(ds.slice(0,3)),Number(ds.slice(3,5)),Number(ds.slice(5)));
    }),
    email:countUnique(text,/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,()=>true),
    payment_card:countUnique(text,/\b(?:\d[ -]?){12,18}\d\b/g,m=>luhn(m.replace(/\D/g,''))),
    phone:countUnique(text,/(?:\+1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g,()=>true)
  };
  for(const [kind,count] of Object.entries(found) as [PrivacyCategory,number][]){
    if(count>0){summary.categories[kind]=count;summary.requiresReview=true;}
  }
  return summary;
}
export function safePrivacySummary(summary:PrivacySummary):string{
  const labels:Record<PrivacyCategory,string>={
    possible_ssn:'possible SSNs',email:'email addresses',payment_card:'possible payment cards',phone:'phone numbers'
  };
  return (Object.entries(summary.categories) as [PrivacyCategory,number][])
    .map(([kind,count])=>count+' '+labels[kind]).join('; ');
}

/**
 * Conservative local screen for BOTH the imported source and the current
 * JSON result. The maximum per-category count avoids double-reporting an
 * identifier merely because a JSON value repeats its source.
 * No negative finding certifies an output free of private information.
 */
export function screenPrivacySurfaces(sourceText:string,candidate:unknown,exportedMetadata:unknown=null):PrivacySummary{
  const source=screenLocalPrivacy(sourceText);
  const serialized=candidate===null||candidate===undefined?'':JSON.stringify(candidate);
  if(typeof serialized!=='string')throw new Error('Current JSON could not be screened for private data.');
  const output=screenLocalPrivacy(serialized);
  // Names and document IDs also leave the workstation inside the reviewed
  // JSON envelope, even if neither the source text nor model values contain
  // them. Treat metadata as another export surface.
  const metadataJson=exportedMetadata===null?'':JSON.stringify(exportedMetadata);
  if(typeof metadataJson!=='string')throw new Error('Export metadata could not be screened for private data.');
  const metadata=screenLocalPrivacy(metadataJson);
  const categories:PrivacySummary['categories']={};
  for(const kind of ['possible_ssn','email','payment_card','phone'] as PrivacyCategory[]){
    const count=Math.max(source.categories[kind]??0,
      output.categories[kind]??0,metadata.categories[kind]??0);
    if(count)categories[kind]=count;
  }
  return {categories,requiresReview:Object.keys(categories).length>0};
}
