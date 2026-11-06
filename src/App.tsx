import UserGuideDrawer from './UserGuideDrawer';
import { ROUTES, routeFromHash, type RouteId } from './routes';
import { loadTheme, saveTheme, type Theme } from './theme';
import darkLogo from './assets/PBGC_logo_name_hor_wt.png';
import lightLogo from './assets/PBGC_logo_name_hor_bw.png';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Ajv from 'ajv';
import { OfflineEngine, type ChatMessage, type Settings } from './engine';
import { importFile, buildExtractionPrompt, parseModelJson, type SourceDocument } from './pipeline';

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
  const [status, setStatus] = useState('Choose a GGUF model and attach OCR exports or local text.');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [docs, setDocs] = useState<SourceDocument[]>([]);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [extraction, setExtraction] = useState<unknown>(null);
  const [rawExtraction, setRawExtraction] = useState('');
  const [valid, setValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [chatStream, setChatStream] = useState('');
  const active = docs[documentIndex] ?? null;

  useEffect(() => () => { void engine.current.unload(); }, []);
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; saveTheme(theme); }, [theme]);
  function navigateTo(next: RouteId) { window.location.hash = '#/' + next; setRoute(next); }

  async function onModelLoad() {
    if (busy || selectedModels.length === 0) return;
    setError(''); setStatus('Loading offline GGUF model into WebAssembly...'); setBusy(true);
    try {
      const files = [...selectedModels].sort((a, b) => a.name.localeCompare(b.name));
      await engine.current.load(files, settings.context);
      setModelName(files[0].name);
      setStatus('Model loaded locally. Document extraction and chat are available.');
    } catch (e) { setError(errorMessage(e)); setStatus('Model failed to load.'); }
    finally { setBusy(false); }
  }

  async function onAttach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = '';
    if (!files.length) return;
    setError('');
    try {
      const imports = await Promise.all(files.map(f => importFile(f)));
      const added = imports.flatMap(x => x.documents);
      setDocs(current => [...current, ...added]);
      setNotes(imports.flatMap(x => x.notes));
      setStatus('Imported ' + added.length + ' local document(s). No server was used.');
    } catch (e) { setError(errorMessage(e)); }
  }

  async function onExtract() {
    if (busy || !active || !engine.current.loaded) return;
    setError(''); setBusy(true); setExtraction(null); setRawExtraction(''); setValid(false);
    setValidationErrors([]);
    setStatus('Generating candidate JSON from ' + active.name + '...');
    let output = '';
    try {
      const parsed = JSON.parse(schema) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON Schema must be an object.');
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(parsed);
      const instructions = buildExtractionPrompt(active, parsed);
      if (instructions.truncated) {
        setNotes(current => [...current, 'WARNING: Model received only the first 6,500 characters of ' + active.name + '.']);
      }
      await engine.current.generate(
        [{ role: 'user', content: instructions.prompt }], SYSTEM, settings,
        text => { output += text; setRawExtraction(output); }
      );
      const data = parseModelJson(output);
      const structureValid = !!validate(data);
      setExtraction(data);
      setValid(structureValid);
      setValidationErrors((validate.errors ?? []).map(x => (x.instancePath || '(root)') + ' ' + x.message));
      setStatus(structureValid
        ? 'JSON Schema structure valid. Verify all extracted facts manually.'
        : 'Extracted JSON failed schema validation. Review required.');
    } catch (e) { setError(errorMessage(e)); setStatus('Extraction incomplete; review required.'); }
    finally { setBusy(false); }
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
      <header className="app-brand"><img className="brand-logo" src={theme === "dark" ? darkLogo : lightLogo} alt="Pension Benefit Guaranty Corporation"/><h1>OCR + LLM Pipeline Studio</h1></header>
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
      </section>
      <section><h2>02 — Local documents</h2>
        <label className="picker">Attach OCR export / text
          <input type="file" multiple accept=".jsonc,.json,.txt,.md,.csv" onChange={e => void onAttach(e)}/>
        </label>
        <p className="help">Bulk OCR Studio JSONC is supported. Direct PDF, Word and Excel parsing will follow.</p>
        <p className="help">{docs.length} document(s) in this session</p>
      </section>
      <footer>Your documents stay on this device.</footer>
    </aside>
    <main className="main">
      <nav aria-label="Main navigation"><div className="route-tabs">{ROUTES.map(item => <button key={item.id} type="button" className={route === item.id ? "active" : ""} aria-current={route === item.id ? "page" : undefined} onClick={() => navigateTo(item.id)}>{item.label}</button>)}</div></nav>
      {error && <div role="alert" className="alert error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      <div role="status" className="alert">{status}</div>
      {(route === 'documents' || route === 'extract') ? <div className="workspace">
        <div className="columns one-column">
          {route === "documents" && <section className="card">
            <h2>Imported source document</h2>
            {active ? <>
              <label>Document
                <select value={documentIndex} onChange={e => {
                  setDocumentIndex(Number(e.currentTarget.value)); setExtraction(null); setRawExtraction('');
                }}>{docs.map((doc, i) => <option key={i} value={i}>{doc.name}</option>)}</select>
              </label>
              <p className="help">Provenance: {active.provenance.source} / document-level only</p>
              <pre className="preview">{active.text.slice(0, 25000)}</pre>
              {active.text.length > 25000 && <p className="warning">Preview truncated. The in-memory file is unchanged.</p>}
              <div className="actions"><button type="button" onClick={() => navigateTo('extract')}>Extract JSON from this document</button></div>
            </> : <p className="empty">Import a Bulk OCR Studio JSONC export or a local text file.</p>}
          </section>}
          {route === "extract" && <section className="card">
            <h2>Target JSON Schema</h2>
            <p className="help">Extraction is model-generated. Schema validation does not establish factual correctness.</p>
            <textarea className="schema" value={schema} spellCheck={false} onChange={e => setSchema(e.currentTarget.value)}/>
            <div className="actions">
              <button disabled={busy || !modelName || !active} onClick={() => void onExtract()}>
                {busy ? 'Processing...' : 'Extract and validate'}
              </button>
              {busy && <button className="secondary" onClick={() => engine.current.stop()}>Stop</button>}
            </div>
            <div className="heading"><h2>Candidate JSON</h2>
              {extraction !== null && <button className="secondary" onClick={() => downloadJson({
                status: valid ? 'schema_validated_facts_unverified' : 'review_required',
                source: active?.provenance, document: active?.name,
                extraction, validationErrors
              })}>Export JSON</button>}
            </div>
            <pre className="preview result">{extraction !== null ? JSON.stringify(extraction, null, 2) : rawExtraction || 'No extraction yet.'}</pre>
            {extraction !== null && <p className={valid ? 'success' : 'warning'}>
              {valid ? 'JSON Schema passed. Facts still require review.' : 'Schema validation failed.'}
            </p>}
            {validationErrors.map((msg, i) => <p key={i} className="warning">{msg}</p>)}
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
          <p className="help">Choose a display theme. The official PBGC logo changes for contrast.</p>
          <div className="theme-buttons" role="group" aria-label="Display theme">
            <button type="button" className={theme === 'dark' ? 'selected' : 'secondary'} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button>
            <button type="button" className={theme === 'light' ? 'selected' : 'secondary'} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
          </div>
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
        </div>
      </section>}
    </main>
  </div>;
}
