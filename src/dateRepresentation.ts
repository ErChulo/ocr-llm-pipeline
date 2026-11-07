/**
 * Strict calendar-date representation comparison for a REVIEW DIAGNOSTIC.
 * It does not rewrite source facts or automatically resolve plan applicability.
 * Only ISO YYYY-MM-DD and unambiguous English month-name dates are accepted.
 */
const months=['january','february','march','april','may','june',
  'july','august','september','october','november','december'];
function daysInMonth(year:number,month:number){
  if(month===2)return year%4===0&&(year%100!==0||year%400===0)?29:28;
  return [4,6,9,11].includes(month)?30:31;
}
export function unambiguousIsoDate(value:unknown):string|null{
  if(typeof value!=='string')return null;
  const text=value.trim();
  let year:number,month:number,day:number;
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if(iso){
    year=Number(iso[1]);month=Number(iso[2]);day=Number(iso[3]);
  }else{
    const english=/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i.exec(text);
    if(!english)return null;
    month=months.indexOf(english[1].toLowerCase())+1;
    day=Number(english[2]);year=Number(english[3]);
  }
  if(year<1600||year>9999||month<1||month>12||day<1||
    day>daysInMonth(year,month))return null;
  return [year,month,day].map((v,i)=>String(v).padStart(i===0?4:2,'0')).join('-');
}
export function dateRepresentationAgreement(expected:unknown,actual:unknown){
  const expectedIso=unambiguousIsoDate(expected);
  const actualIso=unambiguousIsoDate(actual);
  return {
    exact:Object.is(expected,actual),
    sameCalendarDate:expectedIso!==null&&actualIso!==null&&expectedIso===actualIso,
    expectedIso,actualIso,
    // A mismatch that is solely a change of presentation is not automatically
    // repaired in the exported document or awarded exact field accuracy.
    normalizationOnly:expected!==actual&&expectedIso!==null&&expectedIso===actualIso
  };
}
