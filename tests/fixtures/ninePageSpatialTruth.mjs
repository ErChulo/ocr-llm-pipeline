/**
 * Independently authored regions for the nine-page FICTIONAL raster PDF
 * created by browser-smoke.mjs. These are broad, normalized (0..1) visual
 * cell ROIs in displayed page orientation, specified from the fixture layout
 * BEFORE examining any actual OCR word envelopes. They are evaluation labels,
 * NOT measured PDF source coordinates or user-facing citations.
 * This tiny, fixed fixture is NOT a blinded human-annotated production corpus.
 */
const ageX={x0:.06,x1:.20},factorX={x0:.40,x1:.75};
const rowY=[{y0:.37,y1:.51},{y0:.55,y1:.69}];
function row(age,factor,index){
  const y=rowY[index];
  return {age,factor,ageRegion:{...ageX,...y},
    factorRegion:{...factorX,...y}};
}
export const ninePageSpatialTruth=[
  {page:1,rows:[row('55','0.8750',0),row('65','1.0000',1)]},
  {page:2,rows:[row('60','0.8125',0),row('62','0.9375',1)]},
  {page:3,rows:[row('58','0.9063',0),row('64','0.9813',1)]},
  {page:4,rows:[row('57','0.8234',0),row('63','0.9471',1)]},
  {page:5,rows:[row('54','0.7791',0),row('66','1.0245',1)]},
  {page:6,rows:[row('56','0.8461',0),row('68','1.0691',1)]},
  {page:7,rows:[row('53','0.7346',0),row('67','1.0432',1)]},
  {page:8,rows:[row('59','0.9218',0),row('69','1.0837',1)]},
  {page:9,rows:[row('52','0.7124',0),row('70','1.1179',1)]}
];
