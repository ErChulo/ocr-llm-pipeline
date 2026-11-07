/**
 * Minimal synthetic PDFs for deterministic parser tests. No PBGC records.
 * PDFs are built locally with exact cross-reference byte offsets.
 */
const escapeText = value => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
export function createSyntheticPdf(pages) {
  if (!Array.isArray(pages) || !pages.length) throw new Error('At least one page is needed');
  const numPages = pages.length;
  const fontId = 3 + 2 * numPages;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [' + pages.map((_, i) => (3 + 2*i) + ' 0 R').join(' ') + '] /Count ' + numPages + ' >>'
  ];
  for (let i = 0; i < numPages; i++) {
    const contents = pages[i].map((entry,n)=>{
      const position=typeof entry==='string'
        ? {text:entry,x:72,y:720-n*24}:entry;
      if(typeof position.text!=='string'||![position.x,position.y].every(Number.isFinite)){
        throw new Error('Invalid fictional PDF text fixture position.');
      }
      return 'BT /F1 14 Tf '+position.x+' '+position.y+' Td ('+
        escapeText(position.text)+') Tj ET\n';
    }).join('');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' + fontId + ' 0 R >> >> /Contents ' + (4+i*2) + ' 0 R >>');
    objects.push('<< /Length ' + Buffer.byteLength(contents, 'utf8') + ' >>\nstream\n' + contents + 'endstream');
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i=0; i<objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf,'utf8'));
    pdf += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n';
  }
  const xrefStart = Buffer.byteLength(pdf,'utf8');
  pdf += 'xref\n0 ' + (objects.length+1) + '\n0000000000 65535 f \n';
  for (let i=1; i<offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10,'0') + ' 00000 n \n';
  }
  pdf += 'trailer\n<< /Root 1 0 R /Size ' + (objects.length+1) + ' >>\nstartxref\n' + xrefStart + '\n%%EOF\n';
  return Buffer.from(pdf,'utf8');
}

/** Image-only PDF: one JPEG XObject and no text layer. */
export function createScannedPdf(jpeg,width,height,heading='') {
  if(!Buffer.isBuffer(jpeg)||jpeg.length<100||!Number.isInteger(width)||!Number.isInteger(height)||
     width<1||height<1)throw new Error('Invalid synthetic image');
  const prefix=heading ? 'BT /F1 18 Tf 20 '+(height-30)+' Td ('+heading+') Tj ET\n' : '';
  const content=prefix+'q\n'+width+' 0 0 '+height+' 0 0 cm\n/Im0 Do\nQ\n';
  const entries=[
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /XObject << /Im0 5 0 R >> /Font << /F1 6 0 R >> >> /Contents 4 0 R >>'),
    Buffer.from('<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'endstream'),
    Buffer.concat([
      Buffer.from('<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'),
      jpeg,Buffer.from('\nendstream')]),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  ];
  const out=[Buffer.from('%PDF-1.4\n')];const offsets=[0];let total=out[0].length;
  for(let i=0;i<entries.length;i++){
    offsets.push(total);
    const before=Buffer.from((i+1)+' 0 obj\n');
    const after=Buffer.from('\nendobj\n');
    out.push(before,entries[i],after);
    total+=before.length+entries[i].length+after.length;
  }
  const tail=['xref','0 '+(entries.length+1),'0000000000 65535 f ',
    ...offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n '),
    'trailer','<< /Root 1 0 R /Size '+(entries.length+1)+' >>',
    'startxref',String(total),'%%EOF',''].join('\n');
  out.push(Buffer.from(tail));
  return Buffer.concat(out);
}
