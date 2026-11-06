import { useEffect, useState } from 'react';
import './UserGuideDrawer.css';

const steps = [
  { title: '1. Load a model', instructions: [
    'Select Choose model files.',
    'Select a GGUF file on your computer.',
    'Select Load model. Read the status message.',
    'Select Test model to check local text generation.'
  ] },
  { title: '2. Add a document', instructions: [
    'Select Attach OCR export / text.',
    'Select a PDF, PNG, JPEG, WebP, DOCX, XLSX, JSONC, JSON or text file.',
    'Select the document. Review the source text.'
  ] },
  { title: '3. Extract JSON', instructions: [
    'Review the target JSON Schema.',
    'Select Extract and validate.',
    'Check the JSON fields against the source document.'
  ] },
  { title: '4. Export the result', instructions: [
    'Resolve any structural errors.',
    'Verify the facts in the source.',
    'Select Export JSON. Save the file locally.'
  ] },
  { title: '5. Ask a question', instructions: [
    'Select Local chat.',
    'Enter a question. Select Send.',
    'Review the answer before you use it.'
  ] },
];

function WorkflowVisual() {
  return <svg className="guide-diagram" role="img" aria-label="A local document goes to a local language model. The model generates candidate JSON. Verify the result." viewBox="0 0 510 128">
    <title>Local document to validated candidate JSON</title>
    <rect x="5" y="23" width="146" height="70" rx="10" fill="#131B26" stroke="#6E93C2" strokeWidth="2"/>
    <rect x="181" y="23" width="146" height="70" rx="10" fill="#131B26" stroke="#6E93C2" strokeWidth="2"/>
    <rect x="357" y="23" width="146" height="70" rx="10" fill="#131B26" stroke="#008065" strokeWidth="2"/>
    <path d="M155 58 H176 M169 52 l7 6 -7 6 M331 58 H352 M345 52 l7 6 -7 6" fill="none" stroke="#C6D2E1" strokeWidth="2" strokeLinecap="round"/>
    <g fill="#fff" fontSize="15" textAnchor="middle" fontFamily="Arial, sans-serif">
      <text x="78" y="55">Document</text><text x="78" y="74" fontSize="12" fill="#C6D2E1">Local file</text>
      <text x="254" y="55">Local model</text><text x="254" y="74" fontSize="12" fill="#C6D2E1">GGUF + WASM</text>
      <text x="430" y="55">JSON</text><text x="430" y="74" fontSize="12" fill="#C6D2E1">Check and review</text>
    </g>
    <text x="254" y="119" fill="#C6D2E1" fontFamily="Arial, sans-serif" fontSize="12" textAnchor="middle">Your files stay on this computer.</text>
  </svg>;
}

export default function UserGuideDrawer() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
  return <div className="guide-host">
    {!open && <button className="guide-open" type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="guide-drawer">Guide</button>}
    {open && <>
      <div className="guide-scrim" onClick={() => setOpen(false)} aria-hidden="true"/>
      <aside id="guide-drawer" className="guide-drawer" role="dialog" aria-modal="true" aria-label="User guide">
        <div className="guide-toolbar">
          <strong>Quick guide</strong>
          <div>
            <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
            <button type="button" aria-label="Close guide" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
        <div className="guide-content" id="guide-sheet">
          <div className="guide-cover">
            <p className="guide-overline">OCR + LLM PIPELINE STUDIO</p>
            <h1>Start here</h1>
            <p>Use a local model to extract information from a document.</p>
          </div>
          <WorkflowVisual/>
          {steps.map(step => <section className="guide-step" key={step.title}>
            <h2>{step.title}</h2>
            <ol>{step.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
          </section>)}
          <section className="guide-step guide-caution">
            <h2>Important checks</h2>
            <p>A JSON Schema check verifies data structure. It does not verify the facts.</p>
            <p>Read the source document. Check each extracted value before you use it.</p>
            <p>Do not use protected records until security controls pass review.</p>
          </section>
          <section className="guide-step guide-availability">
            <h2>What works now?</h2>
            <p>Current source supports local text and Bulk OCR Studio exports. The local model and extraction interface are experimental.</p>
            <p>English OCR is included for scanned PDF pages and images. Inspect every OCR result against the original.</p>
          </section>
          <p className="guide-footnote">Instructions use an ASD-STE100-inspired style. Formal vocabulary compliance has not been certified.</p>
        </div>
      </aside>
    </>}
  </div>;
}
