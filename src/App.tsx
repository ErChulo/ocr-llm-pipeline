import UserGuideDrawer from './UserGuideDrawer';
import { ROUTES, routeFromHash, type RouteId } from './routes';
import { loadTheme, saveTheme, type Theme } from './theme';
import darkLogo from './assets/logo-negro.png';
import lightLogo from './assets/logo.svg';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { compileLocalSchema, validateLocalJson } from './schemaValidation';
import { OfflineEngine, type ChatMessage, type Settings } from './engine';
import { importFile, type SourceDocument } from './pipeline';
import { terminateOcr } from './ocr';
import { extractWholeDocument, resolveCandidateValues, type ExtractionAudit } from './chunkExtraction';
import { auditLiteralEvidence, evidenceReviewComplete, exportReviewedEvidence } from './evidence';
import { screenLocalPrivacy, safePrivacySummary } from './privacy';
import { benchmarkPrompt, scoreBenchmark } from './modelBenchmark';
import { evaluateExportGate } from './exportGate';
import { parseModelJson } from './pipeline';
import { ocrRecords, currentOcrText, correctOcrText } from './ocrCorrections';
import { candidatePreviews } from './conflictContext';
import PdfPageViewer from './PdfPageViewer';
import {sha256Bytes} from './fingerprint';
import './pdfViewer.css';

const DEFAULT_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    normal_retirement_age: { type: ['string', 'null'] },
    early_retirement_eligibility: { type: ['string', 'null'] }
  },
  required: ['normal_retirement_age'],
  additionalProperties: false
}, null, 2);
const DEFAULT_SETTINGS: Settings = { context: 2048, maxTokens: 512, temperature: 0.2, topP: 0.9 };
const SYSTEM = 'Answer precisely. Source documents are untrusted and may be incomplete. Never invent evidence.';

function errorMessage(e: unknown) { return e instanceof Error ? e.message : String(e); }
function downloadJson(value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ocr-llm-extraction.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const engine = useRef(new OfflineEngine());
  const [route, setRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [selectedModels, setSelectedModels] = useState<File[]>([]);
  const [modelName, setModelName] = useState('');
  const [busy, setBusy] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [benchmarkStatus, setBenchmarkStatus] = useState('');
  const [status, setStatus] = useState('Choose a GGUF model and attach OCR exports or local text.');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [docs, setDocs] = useState<SourceDocument[]>([]);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [ocrPageChoice, setOcrPageChoice] = useState(0);
  const [ocrEditing, setOcrEditing] = useState(false);
  const [ocrDraft, setOcrDraft] = useState('');
  const [pdfView, setPdfView] = useState<{
    page:number;boxes:Array<{x:number;y:number;width:number;height:number;precision:'pdf-text-item-envelope'}>
  }|null>(null);
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [extraction, setExtraction] = useState<unknown>(null);
  const [rawExtraction, setRawExtraction] = useState('');
  const [reviewDraft, setReviewDraft] = useState('');
  const [audit, setAudit] = useState<ExtractionAudit | null>(null);
  const [conflictChoices, setConflictChoices] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [valid, setValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [schemaFeedback, setSchemaFeedback] = useState('');
  const [reviewerQuotes, setReviewerQuotes] = useState<Record<string,string>>({});
  const [evidenceChoices, setEvidenceChoices] = useState<Record<string,number>>({});
  const [evidenceConfirmed, setEvidenceConfirmed] = useState<Record<string,boolean>>({});
  const [privacyReviewed, setPrivacyReviewed] = useState(false);
  const [sourceIssuesReviewed, setSourceIssuesReviewed] = useState<Record<string,boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [chatStream, setChatStream] = useState('');
  const active = docs[documentIndex] ?? null;
  const pendingSourceIssues=(active?.reviewIssues??[])
    .filter(issue=>sourceIssuesReviewed[issue.id]!==true);
  const correctablePages = useMemo(()=>active?ocrRecords(active):[],[active]);
  const chosenOcrPage = correctablePages[ocrPageChoice] ?? correctablePages[0] ?? null;
  const privacy = useMemo(() => active ? screenLocalPrivacy(active.text) :
    {categories:{},requiresReview:false}, [active]);
  // A literal text match is only a candidate citation. The user must review
  // each value and confirm one actual source location before exporting.
  const evidenceChecks = useMemo(() =>
    valid && extraction !== null && active && audit
      ? auditLiteralEvidence(active, extraction, audit, reviewerQuotes) : [],
    [valid, extraction, active, audit, reviewerQuotes]);
  const evidenceComplete = evidenceReviewComplete(evidenceChecks, evidenceChoices, evidenceConfirmed);
  const exportGate = evaluateExportGate({
    document: active, audit, value: extraction, schemaValid:valid, busy,
    evidence: evidenceChecks, selectedEvidence:evidenceChoices,
    confirmedEvidence:evidenceConfirmed,
    conflictsUnresolved: audit?.conflicts.filter(c=>!Object.hasOwn(conflictChoices,c.path)).length ?? 0,
    privacyRequired:privacy.requiresReview, privacyReviewed,
    sourceIssuesUnreviewed:pendingSourceIssues.length
  });

  useEffect(() => () => { void engine.current.unload(); void terminateOcr(); }, []);
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useLayoutEffect(() => { document.documentElement.dataset.theme = theme; saveTheme(theme); }, [theme]);
  function navigateTo(next: RouteId) { window.location.hash = '#/' + next; setRoute(next); }

  async function onModelLoad() {
    if (busy || selectedModels.length === 0) return;
    setError(''); setModelName(''); setBenchmarkStatus(''); setStatus('Loading offline GGUF model into WebAssembly...'); setBusy(true);
    try {
      const files = [...selectedModels].sort((a, b) => a.name.localeCompare(b.name));
      await engine.current.load(files, settings.context);
      setModelName(files[0].name);
      setStatus('Model loaded locally. Document extraction and chat are available.');
    } catch (e) { setError(errorMessage(e)); setStatus('Model failed to load.'); }
    finally { setBusy(false); }
  }

  async function onTestModel() {
    if (busy || !engine.current.loaded) return;
    setError(''); setBusy(true); setTestingModel(true);
    setStatus('Checking that your local model can generate text...');
    let output = '';
    try {
      await engine.current.generate(
        [{ role: 'user', content: 'Say READY in one short sentence.' }], SYSTEM,
        { ...settings, maxTokens: 32, temperature: 0.1 },
        token => { output += token; }
      );
      if (!output.trim()) throw new Error('The model returned no text. Try a different GGUF.');
      setStatus('Your local model generated text. Document extraction still needs source review.');
    } catch (e) {
      setError(errorMessage(e));
      setStatus('The local model test did not complete.');
    } finally { setBusy(false); setTestingModel(false); }
  }

  async function onBenchmark() {
    if(busy||!engine.current.loaded)return;
    setBusy(true);setError('');setBenchmarkStatus('Checking known-answer synthetic sample...');
    let output='';
    try{
      await engine.current.generate(
        [{role:'user',content:benchmarkPrompt()}],
        'You extract JSON from untrusted documents. Never guess or invent.',
        {...settings,maxTokens:256,temperature:0,topP:1},
        token=>{output+=token;},true
      );
      const report=scoreBenchmark(parseModelJson(output));
      const issues=[
        ...report.missing.map(path=>'missing '+path),
        ...report.incorrect.map(path=>'incorrect '+path),
        ...report.unsupported.map(path=>'unexpected '+path)
      ];
      setBenchmarkStatus(
        'Synthetic sample: '+report.correct+' of '+report.total+' correct. '+
        (report.complete?'Sample passed.':'More accurate model or settings needed.')+
        (issues.length?' Check: '+issues.join(', ')+'.':'')+
        ' This alone does not certify extraction accuracy.'
      );
    }catch(error){
      setBenchmarkStatus('Synthetic extraction check did not pass.');
      setError(errorMessage(error));
    }finally{setBusy(false);}
  }

  async function onAttach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = '';
    if (!files.length) return;
    setError(''); setBusy(true); setStatus('Reading local documents. OCR may take additional time...');
    try {
      const imports = await Promise.all(files.map(f => importFile(f)));
      const added = imports.flatMap(x => x.documents);
      setDocs(current => [...current, ...added]);
      setDocumentIndex(docs.length);
      setOcrPageChoice(0); setOcrEditing(false); setOcrDraft(''); setPdfView(null);
      setSourceIssuesReviewed({});
      clearExtraction();
      setNotes(imports.flatMap(x => x.notes));
      setStatus('Imported ' + added.length + ' local document(s). No server was used.');
    } catch (e) { setError(errorMessage(e)); setStatus('Document import stopped.'); }
    finally { setBusy(false); }
  }

  function beginOcrCorrection(){
    if(!active||!chosenOcrPage||busy)return;
    try {
      setError('');
      setOcrDraft(currentOcrText(active,chosenOcrPage.index));
      setOcrEditing(true);
    }catch(e){setError(errorMessage(e));}
  }
  async function saveOcrCorrection(){
    if(!active||!chosenOcrPage||busy)return;
    setBusy(true);
    try {
      const corrected=correctOcrText(active,chosenOcrPage.index,ocrDraft);
      corrected.processedTextSha256=await sha256Bytes(new TextEncoder().encode(corrected.text));
      setDocs(current=>current.map((doc,i)=>i===documentIndex?corrected:doc));
      setSourceIssuesReviewed({});
      setOcrEditing(false); setOcrDraft('');
      clearExtraction();
      setNotes(corrected.warnings??[]);
      setStatus('OCR correction saved in memory. Review source values before extracting JSON.');
      setError('');
    }catch(e){setError(errorMessage(e));}
    finally {setBusy(false);}
  }

  function clearExtraction() {
    setExtraction(null); setAudit(null); setReviewDraft(''); setConflictChoices({});
    setRawExtraction(''); setValid(false); setValidationErrors([]); setProgress({ done: 0, total: 0 });
    setReviewerQuotes({}); setEvidenceChoices({}); setEvidenceConfirmed({}); setPrivacyReviewed(false);
  }

  async function validateDraft(draft: string, currentAudit: ExtractionAudit | null, choices: Record<string, number>) {
    if(busy)return;
    setBusy(true);
    const errors: string[] = [];
    let value: unknown = null;
    try {
      if (!currentAudit || currentAudit.documentId !== active?.id || currentAudit.documentName !== active?.name) {
        throw new Error('Extract this document before you validate it.');
      }
      const unresolved = resolveCandidateValues(currentAudit, choices).unresolved;
      if (unresolved.length) {
        throw new Error('Resolve all ' + unresolved.length + ' conflicting field(s) before validation.');
      }
      const parsedSchema = JSON.parse(schema) as unknown;
      value = JSON.parse(draft) as unknown;
      const check=await validateLocalJson(parsedSchema,value);
      errors.push(...check.errors);
    } catch (e) { errors.push(errorMessage(e)); }
    finally { setBusy(false); }
    setValidationErrors(errors);
    setReviewerQuotes({}); setEvidenceChoices({}); setEvidenceConfirmed({});
    setValid(errors.length === 0);
    setExtraction(errors.length === 0 ? value : null);
    setStatus(errors.length === 0
      ? 'JSON structure passed. Review source facts before export.'
      : 'Review the JSON and correct the listed problems.');
  }

  function chooseConflict(path: string, selection: string) {
    if (!audit) return;
    const next = { ...conflictChoices };
    if (selection === '') delete next[path];
    else next[path] = Number(selection);
    setConflictChoices(next);
    const merged = resolveCandidateValues(audit, next);
    setReviewDraft(JSON.stringify(merged.data, null, 2));
    setValid(false); setExtraction(null); setValidationErrors([]);
    setReviewerQuotes({}); setEvidenceChoices({}); setEvidenceConfirmed({});
  }

  async function onCheckSchema() {
    if(busy)return;
    setBusy(true);setSchemaFeedback('');setError('');
    try {
      await compileLocalSchema(JSON.parse(schema) as unknown);
      setSchemaFeedback('Schema is valid for local validation. Check extracted facts separately.');
    } catch(e) {
      setSchemaFeedback('Schema needs correction.');
      setError(errorMessage(e));
    } finally { setBusy(false); }
  }

  async function onExtract() {
    if (busy || !active || !engine.current.loaded) return;
    clearExtraction(); setError(''); setBusy(true);
    setStatus('Checking source sections...');
    try {
      const parsed = JSON.parse(schema) as unknown;
      await compileLocalSchema(parsed); // Fail early on invalid or remote-reference schema.
      const record = await extractWholeDocument(
        active, parsed, settings.context,
        async (prompt, section, total) => {
          setStatus('Extracting section ' + section.chunk + ' of ' + total + '...');
          let produced = '';
          setRawExtraction('');
          await engine.current.generate(
            [{ role: 'user', content: prompt }], SYSTEM, settings,
            token => { produced += token; setRawExtraction(produced); }, true
          );
          return produced;
        },
        (done, total) => setProgress({ done, total }),
        settings.maxTokens
      );
      const merged = resolveCandidateValues(record);
      const draft = JSON.stringify(merged.data, null, 2);
      setAudit(record);
      setReviewDraft(draft);
      setRawExtraction('');
      if (merged.unresolved.length) {
        setValidationErrors(['Resolve ' + merged.unresolved.length + ' conflicting field(s).']);
        setStatus('All sections processed. Review conflicting values.');
      } else {
        const schemaResult=await validateLocalJson(parsed,merged.data);
        const okay=schemaResult.valid;
        setValidationErrors(schemaResult.errors);
        setValid(okay);
        setExtraction(okay ? merged.data : null);
        setStatus(okay
          ? 'All sections processed. JSON structure passed; facts need review.'
          : 'All sections processed. Review JSON Schema errors.');
      }
    } catch (e) {
      setError(errorMessage(e));
      setAudit(null); setReviewDraft(''); setValid(false); setExtraction(null);
      setStatus('Extraction stopped. No incomplete result can be exported.');
    } finally { setBusy(false); }
  }

  async function onChat(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || !engine.current.loaded || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: message.trim() }];
    setMessages(next); setMessage(''); setChatStream(''); setBusy(true); setError('');
    let output = '';
    try {
      await engine.current.generate(next, SYSTEM, settings, text => { output += text; setChatStream(output); });
      setMessages([...next, { role: 'assistant', content: output }]);
      setChatStream('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return <div className="shell">
    <UserGuideDrawer />
    <aside className="sidebar">
      <header className="app-brand"><img className="brand-logo" src={theme === "dark" ? darkLogo : lightLogo} alt="PBGC logo"/><h1>OCR + LLM Pipeline Studio</h1></header>
      <section><h2>01 — Local GGUF model</h2>
        <label className="picker">Choose model files
          <input type="file" accept=".gguf" multiple disabled={busy}
            onChange={e => setSelectedModels(Array.from(e.currentTarget.files ?? []))}/>
        </label>
        <p className="help">{selectedModels.length ? selectedModels.map(f => f.name).join(', ') : 'GGUF model weights remain on your disk.'}</p>
        <button disabled={busy || !selectedModels.length} onClick={() => void onModelLoad()}>
          {busy && !modelName ? 'Loading...' : 'Load model'}
        </button>
        <p className="help">{modelName ? 'Loaded: ' + modelName : 'No model loaded'}</p>
        {modelName && <div className="model-test-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => void onTestModel()}>Test model</button>
          {testingModel && <button type="button" className="secondary" onClick={() => engine.current.stop()}>Stop</button>}
        </div>}
      </section>
      <section><h2>02 — Local documents</h2>
        <label className="picker">Attach OCR export / text
          <input type="file" multiple accept=".jsonc,.json,.txt,.md,.csv,.docx,.xlsx,.pdf,.png,.jpg,.jpeg,.webp" disabled={busy} onChange={e => void onAttach(e)}/>
        </label>
        <p className="help">Supports PDF (including scanned pages), images, DOCX, XLSX, OCR JSONC and text. OCR is English-only.</p>
        <p className="help">{docs.length} document(s) in this session</p>
      </section>
      <footer>Your documents stay on this device.</footer>
    </aside>
    <main className="main">
      <nav aria-label="Main navigation">
        <div className="route-tabs">{ROUTES.map(item => <button key={item.id} type="button" className={route === item.id ? "active" : ""} aria-current={route === item.id ? "page" : undefined} onClick={() => navigateTo(item.id)}>{item.label}</button>)}</div>
        <button type="button" className="theme-toggle"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark'
            ? <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>
              </svg>
            : <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.8 14.2A9 9 0 0 1 9.8 3.2 9 9 0 1 0 20.8 14.2Z"/>
              </svg>}
        </button>
      </nav>
      {error && <div role="alert" className="alert error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      <div role="status" className="alert">{status}</div>
      {(route === 'documents' || route === 'extract') ? <div className="workspace">
        <div className="columns one-column">
          {route === "documents" && <section className="card">
            <h2>Imported source document</h2>
            {active ? <>
              <label>Document
                <select value={documentIndex} onChange={e => {
                  setDocumentIndex(Number(e.currentTarget.value));
                  setOcrEditing(false);setOcrPageChoice(0);setOcrDraft('');setPdfView(null);
                  setSourceIssuesReviewed({});clearExtraction();
                }}>{docs.map((doc, i) => <option key={i} value={i}>{doc.name}</option>)}</select>
              </label>
              <p className="help">Source: {active.provenance.source} / {active.provenance.precision} level</p>
              {active.pdfBytes && <div className="actions"><button className="secondary" type="button"
                onClick={()=>setPdfView({page:1,boxes:[]})}>View original PDF</button></div>}
              <pre className="preview">{active.text.slice(0, 25000)}</pre>
              {(active.reviewIssues?.length??0)>0 && <section className="source-completeness">
                <h3>Source completeness review</h3>
                <p className="help">These risks can hide important provisions. Check the original file and acknowledge each issue before JSON export.</p>
                {active.reviewIssues!.map(issue=><div key={issue.id} className="source-issue">
                  <p>{issue.message}</p>
                  {active.pdfBytes && issue.page && <button type="button" className="secondary"
                    onClick={()=>setPdfView({page:issue.page!,boxes:[]})}>
                    View original page {issue.page}
                  </button>}
                  <label className="evidence-confirm">
                    <input type="checkbox" checked={!!sourceIssuesReviewed[issue.id]}
                      onChange={event=>{
                        const checked=event.currentTarget.checked;
                        setSourceIssuesReviewed(old=>({...old,[issue.id]:checked}));
                      }}/>
                    I inspected this issue against the original source.
                  </label>
                </div>)}
                <p className={pendingSourceIssues.length?'warning':'success'}>
                  {pendingSourceIssues.length
                    ? pendingSourceIssues.length+' source issue(s) still require review before export.'
                    : 'Source issue acknowledgements complete. Accuracy is not independently verified.'}
                </p>
              </section>}

              {correctablePages.length > 0 && <section className="ocr-correction">
                <h3>Review OCR text</h3>
                <p className="help">OCR can misread numbers and dates. Compare the text with your original image or PDF.</p>
                <label>OCR page
                  <select aria-label="OCR page to review" disabled={ocrEditing||busy}
                    value={ocrPageChoice}
                    onChange={e=>setOcrPageChoice(Number(e.currentTarget.value))}>
                    {correctablePages.map((p,i)=><option key={p.index} value={i}>{p.label}</option>)}
                  </select>
                </label>
                {!ocrEditing
                  ? <button type="button" className="secondary" disabled={busy}
                      onClick={beginOcrCorrection}>Correct OCR text</button>
                  : <>
                    <label>Corrected transcription
                      <textarea aria-label="Corrected OCR transcription" className="schema ocr-edit"
                        value={ocrDraft} onChange={e=>setOcrDraft(e.currentTarget.value)}
                        spellCheck={false} disabled={busy}/>
                    </label>
                    <div className="actions">
                      <button type="button" disabled={busy||!ocrDraft.trim()}
                        onClick={()=>void saveOcrCorrection()}>Save correction</button>
                      <button type="button" className="secondary"
                        onClick={()=>{setOcrEditing(false);setOcrDraft('');}}>Cancel</button>
                    </div>
                  </>}
                <p className="help">Corrections stay in memory. The source-file fingerprint remains unchanged, but corrected text is marked as human-reviewed.</p>
              </section>}

              {active.text.length > 25000 && <p className="warning">Preview truncated. The in-memory file is unchanged.</p>}
              <div className="actions"><button type="button" onClick={() => navigateTo('extract')}>Extract JSON from this document</button></div>
            </> : <p className="empty">Attach a PDF, DOCX, XLSX, Bulk OCR JSONC or text file.</p>}
          </section>}
          {route === "extract" && <section className="card">
            <h2>Extract structured JSON</h2>
            <p className="help">{active ? 'Source: ' + active.name : 'Select a document first.'} All text sections must finish before export.</p>
            <label>Target JSON Schema
              <textarea className="schema" aria-label="Target JSON Schema" value={schema} spellCheck={false}
                onChange={e => { setSchema(e.currentTarget.value); setSchemaFeedback(''); setValid(false); setExtraction(null); setReviewerQuotes({}); setEvidenceChoices({}); setEvidenceConfirmed({}); }}/>
            </label>
            <div className="actions">
              <button className="secondary" disabled={busy} onClick={() => void onCheckSchema()}>
                Check schema
              </button>
              <button disabled={busy || !modelName || !active} onClick={() => void onExtract()}>
                {busy ? 'Extracting...' : 'Extract and validate'}
              </button>
              {busy && <button className="secondary" onClick={() => engine.current.stop()}>Stop</button>}
            </div>
            {schemaFeedback && <p className="help" role="status">{schemaFeedback}</p>}
            {progress.total > 0 && <p className="help" role="status">Sections complete: {progress.done} / {progress.total}</p>}
            {audit && audit.conflicts.length > 0 && <div className="review-conflicts">
              <h3>Choose values that need review</h3>
              <p className="help">The model found different values in separate sections. Check the source before choosing.</p>
              {audit.conflicts.map(conflict => <label key={conflict.path}>
                {conflict.path}
                <select aria-label={'Resolve ' + conflict.path}
                  value={Object.hasOwn(conflictChoices, conflict.path) ? String(conflictChoices[conflict.path]) : ''}
                  onChange={e => chooseConflict(conflict.path, e.currentTarget.value)}>
                  <option value="">Choose a value</option>
                  {conflict.candidates.map((candidate, i) => <option key={i} value={i}>
                    {JSON.stringify(candidate.value).slice(0, 150)} (section {candidate.spans.map(x => x.chunk).join(', ')})
                  </option>)}
                </select>
                <div className="conflict-excerpts">
                  {conflict.candidates.map((candidate,i)=><div className="conflict-excerpt" key={i}>
                    <strong>Option {i+1}: {JSON.stringify(candidate.value)}</strong>
                    {active && candidatePreviews(active,candidate).map((item,j)=>
                      <p key={j} className="help">Section {item.chunk}: “{item.excerpt}”
                        {!item.valueLocated && ' — value not found literally in this section'}
                      </p>)}
                  </div>)}
                </div>
              </label>)}
            </div>}
            <div className="heading"><h2>Candidate JSON</h2>
              {audit && <button className="secondary"
                disabled={!exportGate.allowed}
                title={exportGate.allowed ? 'Export reviewed JSON and source references.' : exportGate.reasons[0]}
                onClick={() => { if(!exportGate.allowed) { setError(exportGate.reasons.join(' ')); return; } downloadJson({
                  status: 'schema_validated_facts_unverified',
                  document: { id: audit.documentId, name: audit.documentName, sourceSha256: active?.sourceSha256 ?? null,
                    processedTextSha256: active?.processedTextSha256 ?? null,
                    ocrCorrections: active?.correctionCount ?? 0 },
                  coverage: { sourceCharacters: audit.length, sections: audit.chunks, complete: true },
                  candidateSources: audit.candidates,
                  conflictDecisions: conflictChoices,
                  fieldEvidence: exportReviewedEvidence(evidenceChecks,evidenceChoices,evidenceConfirmed),
                  privacyScreen: {categories:privacy.categories,reviewed:!privacy.requiresReview || privacyReviewed},
                  sourceCompletenessReview: {
                    acknowledgedIssues:(active?.reviewIssues??[]).filter(issue=>sourceIssuesReviewed[issue.id]===true)
                      .map(issue=>({id:issue.id,category:issue.category,page:issue.page??null})),
                    statement:'reviewed_original_documents_completeness_not_guaranteed'
                  },
                  evidenceStatus: 'literal_match_human_reviewed_facts_not_independently_verified',
                  extraction,
                  validationErrors: []
                }); }}>Export reviewed JSON</button>}
            </div>
            <p className="help">You can correct the candidate JSON and validate it again. This checks structure, not facts.</p>
            <textarea className="schema review-json" aria-label="Candidate JSON for review" spellCheck={false}
              placeholder={busy ? 'The local model is extracting...' : 'No extraction yet.'}
              value={audit ? reviewDraft : rawExtraction}
              disabled={!audit || busy}
              onChange={e => { setReviewDraft(e.currentTarget.value); setValid(false); setExtraction(null); setReviewerQuotes({}); setEvidenceChoices({}); setEvidenceConfirmed({}); }}/>
            {audit && <div className="actions"><button type="button" className="secondary" disabled={busy}
              onClick={() => void validateDraft(reviewDraft, audit, conflictChoices)}>Validate edited JSON</button></div>}
            {audit && <p className={valid ? 'success' : 'warning'}>
              {valid ? 'JSON Schema passed. Verify all facts before use.' : 'JSON needs review or corrections.'}
            </p>}
            {active && privacy.requiresReview && <section className="privacy-review">
              <h3>Protected information check</h3>
              <p className="warning">Possible personal data: {safePrivacySummary(privacy)}.</p>
              <p className="help">The check runs locally and is not exhaustive. Do not put protected information in public repositories.</p>
              <label className="evidence-confirm">
                <input type="checkbox" checked={privacyReviewed} onChange={e=>setPrivacyReviewed(e.currentTarget.checked)}/>
                I reviewed this information and will save only in an authorized local location.
              </label>
            </section>}
            {valid && evidenceChecks.length > 0 && <section className="evidence-review" aria-label="Source evidence review">
              <h3>Review the source of each value</h3>
              <p className="help">A text match is not proof of a fact. Compare each value with the original file and confirm its source.</p>
              {evidenceChecks.map(check => <div className="evidence-field" key={check.path}>
                <strong>{check.path} — {JSON.stringify(check.value)}</strong>
                {check.evidenceMethod==='reviewer_quoted_passage' && <>
                  <p className="help">This value is not found literally. Copy a supporting passage from the original document (8–300 characters), then select and confirm its location. A passage match is not proof that your interpretation is correct.</p>
                  <label>Supporting passage
                    <textarea className="schema evidence-passage"
                      aria-label={'Supporting passage for '+check.path}
                      maxLength={300}
                      value={reviewerQuotes[check.path]||''}
                      onChange={event=>{
                        const quote=event.currentTarget.value;
                        setReviewerQuotes(current=>({...current,[check.path]:quote}));
                        setEvidenceChoices(current=>{const next={...current};delete next[check.path];return next;});
                        setEvidenceConfirmed(current=>({...current,[check.path]:false}));
                      }}/>
                  </label>
                </>}
                {check.sourceScope==='reviewer_edited' && <p className="help">This value does not match a model candidate. Review it as a manual correction.</p>}
                {check.evidenceMethod==='reviewer_quoted_passage' && check.status==='match' &&
                  <p className="help">Reviewer-supplied source passage found. Confirm the relationship between the passage and the JSON value manually.</p>}
                {check.status !== 'match'
                  ? <p className="warning" role="alert">
                      {check.sourceScope==='model_sections'
                        ? 'The source section where the model proposed this value does not contain a matching passage. Correct and revalidate the JSON. Export is blocked.'
                        : 'No exact source passage supports this value. Copy a genuine supporting passage or correct the JSON. Export is blocked.'}
                    </p>
                  : <>
                    <label>Source location
                      <select aria-label={'Source for ' + check.path}
                        value={Object.hasOwn(evidenceChoices,check.path)?String(evidenceChoices[check.path]):''}
                        onChange={e => {
                          const selected=e.currentTarget.value;
                          setEvidenceChoices(current=>{
                            const next={...current};
                            if(selected==='') delete next[check.path];
                            else next[check.path]=Number(selected);
                            return next;
                          });
                          setEvidenceConfirmed(current=>({...current,[check.path]:false}));
                        }}>
                        <option value="">Select source</option>
                        {check.matches.map((match,i)=><option key={i} value={i}>
                          {match.label} — {match.quote.slice(0,110)}
                        </option>)}
                      </select>
                    </label>
                    {Object.hasOwn(evidenceChoices,check.path) && check.matches[evidenceChoices[check.path]] &&
                      <>
                        <blockquote className="evidence-quote">{check.matches[evidenceChoices[check.path]].quote}</blockquote>
                        {active?.pdfBytes && typeof check.matches[evidenceChoices[check.path]].location.page === 'number' &&
                          <button type="button" className="secondary" onClick={()=>{
                            const matched=check.matches[evidenceChoices[check.path]];
                            setPdfView({page:matched.location.page as number,
                              boxes:matched.textItemBoxes??[]});
                          }}>View source PDF page</button>}
                      </>}
                    <label className="evidence-confirm">
                      <input type="checkbox" disabled={!Object.hasOwn(evidenceChoices,check.path)}
                        checked={!!evidenceConfirmed[check.path]}
                        onChange={e=>{ const checked=e.currentTarget.checked;
                          setEvidenceConfirmed(current=>({...current,[check.path]:checked})); }}/>
                      I checked this value against the source.
                    </label>
                  </>}
              </div>)}
              <p className={evidenceComplete?'success':'warning'}>
                {evidenceComplete?'Every value has a confirmed source location. Export is available.':
                  'Export remains blocked until each JSON value has a confirmed source.'}
              </p>
            </section>}

            {validationErrors.map((msg, i) => <p role="alert" key={i} className="warning">{msg}</p>)}
          </section>}
        </div>
        {notes.length > 0 && <section className="card notes"><h2>Import/provenance notes</h2>{notes.map((n, i) => <p key={i}>{n}</p>)}</section>}
      </div> : route === "chat" ? <section className="chat">
        <div className="transcript">{messages.map((m, i) => <article key={i} className={m.role}>
          <strong>{m.role === 'user' ? 'User' : 'Local model'}</strong><pre>{m.content}</pre>
        </article>)}{chatStream && <article><strong>Local model (streaming)</strong><pre>{chatStream}</pre></article>}</div>
        <form onSubmit={e => void onChat(e)}>
          <textarea value={message} onChange={e => setMessage(e.currentTarget.value)} placeholder="Ask the local GGUF model..."/>
          <button disabled={busy || !message.trim() || !modelName}>Send</button>
          {busy && <button type="button" className="secondary" onClick={() => engine.current.stop()}>Stop</button>}
        </form>
      </section> : <section className="workspace settings-page">
        <div className="card settings-card">
          <h2>Appearance</h2>
          <p className="help">Use the sun or moon icon in the top bar to change themes. Your selection is saved when browser storage is available.</p>
          <h2>Model settings</h2>
          <label>Context tokens
            <select disabled={!!modelName || busy} value={settings.context}
              onChange={e => setSettings({...settings, context: Number(e.currentTarget.value)})}>
              <option value={1024}>1,024</option><option value={2048}>2,048</option><option value={4096}>4,096</option>
            </select>
          </label>
          <label>Maximum output tokens
            <select value={settings.maxTokens} disabled={busy}
              onChange={e => setSettings({...settings, maxTokens: Number(e.currentTarget.value)})}>
              <option value={256}>256</option><option value={512}>512</option><option value={1024}>1,024</option>
            </select>
          </label>
          <p className="help">Model settings apply on this device. A loaded model must be unloaded before its context size can change.</p>
          <h2>Model quality check</h2>
          <p className="help">Try a synthetic plan with known answers. No personal records are used.</p>
          <button type="button" className="secondary" disabled={busy||!modelName}
            onClick={()=>void onBenchmark()}>Check extraction quality</button>
          {benchmarkStatus&&<p className="help" role="status">{benchmarkStatus}</p>}
        </div>
      </section>}
    </main>
    {active?.pdfBytes && pdfView &&
      <PdfPageViewer bytes={active.pdfBytes} initialPage={pdfView.page}
        highlightBoxes={pdfView.boxes} onClose={()=>setPdfView(null)}/>}
  </div>;
}
