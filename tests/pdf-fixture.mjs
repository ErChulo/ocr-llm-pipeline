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
    const contents = pages[i].map((value, n) => 'BT /F1 14 Tf 72 ' + (720 - n * 24) + ' Td (' + escapeText(value) + ') Tj ET\n').join('');
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
