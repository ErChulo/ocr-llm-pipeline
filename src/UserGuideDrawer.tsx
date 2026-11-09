import { useEffect, useRef, useState } from 'react';
import './UserGuideDrawer.css';

type GuideSection = 'office' | 'workflow';

/**
 * Explicit offline hand-off: GitHub build artifact and GGUF are separate
 * local files. The guide contains no runtime downloader or external calls.
 */
const officeSteps = [
  { title: 'Get the application HTML', instructions: [
    'On an internet-connected computer where downloading is permitted, open the GitHub repository ErChulo/ocr-llm-pipeline.',
    'Open Actions, then Build and source tests. Select a successful run on the main branch.',
    'Under Artifacts, download ocr-llm-pipeline-single-html. Sign in to GitHub if the artifact requires it.',
    'Extract the ZIP file. Keep the extracted index.html. Do not use Code > Download ZIP: that contains source code, not the ready-to-open application.'
  ] },
  { title: 'Get a GGUF model separately', instructions: [
    'Download a compatible GGUF model from an approved, trustworthy model publisher while still on the permitted internet-connected computer.',
    'For a first fictional test, start with a small 0.5B GGUF model rather than a larger 1.5B or 3B model.',
    'Keep the GGUF file unchanged. If the model is split into multiple GGUF parts, keep every part together.',
    'The GGUF model is NOT included in the GitHub HTML artifact. The app does not download models for you.'
  ] },
  { title: 'Check office permission and transfer', instructions: [
    'Before moving either file to a managed office computer, obtain the required agency authorization for local HTML, WebAssembly and model files.',
    'Transfer index.html and the GGUF file or parts only by an approved method. Put them in a permitted local folder.',
    'No Python, Node.js, software installer, local server or internet connection is needed at runtime.',
    'If file transfer or execution is blocked by workplace policy, stop and ask the authorized support team. Do not bypass security controls.'
  ] },
  { title: 'Open the offline application', instructions: [
    'On the approved Windows 11 computer, locate the transferred index.html in File Explorer.',
    'Open it using the approved Chrome or Edge browser. The address should begin with file://, not http:// or https://.',
    'Keep the GGUF in a folder the browser can read. The HTML and GGUF do not have to be in the same folder.',
    'If the HTML is blocked, or the browser cannot open local files, report the restriction. Do not start a server or install a workaround.'
  ] },
  { title: 'Load and test the local model', instructions: [
    'In the app, select Choose model files. Select your local GGUF file, or all parts of a split GGUF.',
    'Select Load model. Read the result. If loading fails, record the exact error; a large model can exceed available memory.',
    'Select Test model. Confirm that local generation succeeds before importing any document.',
    'A successful model test verifies local generation only; it does not establish extraction accuracy or agency approval.'
  ] },
  { title: 'Run a fictional document check', instructions: [
    'Use a wholly fictional document only. Do not import real PBGC participants, case records or protected plan information.',
    'Select Attach OCR export / text. Open the fictional PDF, image or text file. In Documents, inspect the source. For a PDF, use View original PDF.',
    'Select Extract JSON. Use Check schema, then Extract and validate. Review each value against the original source before confirming evidence.',
    'Export reviewed JSON only after all mandatory checks pass. Save the result in an approved local location and report any errors to the development team.'
  ] }
];

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
    'Select the document. Review the source text.',
    'For PDFs, select View original PDF.',
    'If OCR text is wrong, select Correct OCR text.'
  ] },
  { title: '3. Extract JSON', instructions: [
    'Review the target JSON Schema.',
    'Select Extract and validate.',
    'Check the JSON fields against the source document.'
  ] },
  { title: '4. Export the result', instructions: [
    'Resolve any structural errors.',
    'Select a source location and confirm every value.',
    'Review possible personal-data warnings.',
    'Select Export reviewed JSON. Save the file locally.'
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
  const [guideSection, setGuideSection] = useState<GuideSection>('office');
  const [officeIndex, setOfficeIndex] = useState(0);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const shouldRestoreFocus=useRef(false);
  useEffect(() => {
    if (!open) {
      // The trigger is unmounted while the dialog is open; only after React
      // remounts it can keyboard focus reliably return to that same control.
      if(shouldRestoreFocus.current){
        triggerRef.current?.focus();
        shouldRestoreFocus.current=false;
      }
      return;
    }
    shouldRestoreFocus.current=true;
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  return <div className="guide-host">
    {!open && <button ref={triggerRef} className="guide-open" type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="guide-drawer">Guide</button>}
    {open && <>
      <div className="guide-scrim" onClick={() => setOpen(false)} aria-hidden="true"/>
      <aside id="guide-drawer" className="guide-drawer" role="dialog" aria-modal="true" aria-label="User guide">
        <div className="guide-toolbar">
          <strong>Quick guide</strong>
          <div>
            <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
            <button type="button" ref={closeRef} aria-label="Close guide" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
        <div className="guide-content" id="guide-sheet" role="region" aria-label="Guide instructions" tabIndex={0}>
          <div className="guide-cover">
            <p className="guide-overline">OCR + LLM PIPELINE STUDIO</p>
            <h1>Start here</h1>
            <p>First-time setup for offline Windows 11 and the application workflow.</p>
          </div>
          <div className="guide-section-switch" role="group" aria-label="Guide sections">
            <button type="button" aria-pressed={guideSection==='office'} onClick={()=>setGuideSection('office')}>Office setup</button>
            <button type="button" aria-pressed={guideSection==='workflow'} onClick={()=>setGuideSection('workflow')}>Using the app</button>
          </div>
          <div className="guide-office-wizard" hidden={guideSection!=='office'}>
            <p className="guide-setup-summary">Two separate local files are required: the built index.html and a compatible GGUF model. Prepare them outside the office using an authorized download and transfer process.</p>
            <p className="guide-progress" role="status" aria-live="polite">Office setup — step {officeIndex+1} of {officeSteps.length}</p>
            <section className="guide-step" aria-label="Current office setup step">
              <h2>{officeSteps[officeIndex].title}</h2>
              <ol>{officeSteps[officeIndex].instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
            </section>
            <div className="guide-step-nav">
              <button type="button" disabled={officeIndex===0} onClick={()=>setOfficeIndex(i=>Math.max(0,i-1))}>Previous step</button>
              <button type="button" onClick={()=>setOfficeIndex(i=>i===officeSteps.length-1?0:i+1)}>
                {officeIndex===officeSteps.length-1?'Review from step 1':'Next step'}
              </button>
            </div>
            <p className="guide-beta-warning">Beta application. Testing on a managed office computer requires agency permission. Never use protected records without approval.</p>
          </div>
          <div className="guide-print-office">
            <h2>Office setup — complete instructions</h2>
            {officeSteps.map((step,index)=><section className="guide-step" key={step.title}>
              <h2>{index+1}. {step.title}</h2>
              <ol>{step.instructions.map(instruction=><li key={instruction}>{instruction}</li>)}</ol>
            </section>)}
          </div>
          <div className="guide-workflow" hidden={guideSection!=='workflow'}>
            <WorkflowVisual/>
            {steps.map(step => <section className="guide-step" key={step.title}>
              <h2>{step.title}</h2>
              <ol>{step.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
            </section>)}
          </div>
          <section className="guide-step guide-caution">
            <h2>Important checks</h2>
            <p>A JSON Schema check verifies data structure. It does not verify the facts.</p>
            <p>Read the source document. Check each extracted value before you use it.</p>
            <p>Do not use protected records until security controls pass review.</p>
          </section>
          <section className="guide-step guide-availability">
            <h2>What works now?</h2>
            <p>Local GGUF, document import and OCR passed synthetic offline-browser tests. They remain experimental until workplace acceptance.</p>
            <p>English OCR recognizes scanned PDF pages and images. Always inspect numbers, dates, and formulas.</p>
          </section>
          <p className="guide-footnote">Instructions use an ASD-STE100-inspired style. Formal vocabulary compliance has not been certified.</p>
        </div>
      </aside>
    </>}
  </div>;
}
