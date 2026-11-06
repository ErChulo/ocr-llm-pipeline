import { Wllama } from '@wllama/wllama';
import wasmUrl from 'virtual:wllama-wasm';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type Settings = { context: number; maxTokens: number; temperature: number; topP: number };
export class OfflineEngine {
  private model: Wllama | null = null;
  private controller: AbortController | null = null;
  get loaded(): boolean { return this.model?.isModelLoaded() ?? false; }
  async load(files: File[], nCtx: number) {
    if (!files.length || files.some(f => !/\.gguf$/i.test(f.name))) throw new Error('Choose local GGUF files.');
    const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name));
    const header = new TextDecoder().decode(await sorted[0].slice(0, 4).arrayBuffer());
    if (header !== 'GGUF') throw new Error('Invalid GGUF file header.');
    await this.unload();
    const model = new Wllama({ default: wasmUrl }, {
      suppressNativeLog: true,
      logger: { debug: () => {}, log: () => {}, warn: console.warn, error: console.error }
    });
    model.setCompat(null);
    this.model = model;
    try { await model.loadModel(sorted, { n_ctx: nCtx, n_threads: 1, n_gpu_layers: 0, n_parallel: 1 }); }
    catch (error) { await this.unload(); throw error; }
  }
  async generate(messages: ChatMessage[], system: string, settings: Settings, onText: (text: string) => void) {
    if (!this.model?.isModelLoaded()) throw new Error('Load a GGUF model first.');
    if (this.controller) throw new Error('Generation already running.');
    const c = new AbortController();
    this.controller = c;
    try {
      const all = [...(system.trim() ? [{role: 'system' as const, content: system.trim()}] : []), ...messages];
      const stream = await this.model.createChatCompletion({
        messages: all, stream: true, abortSignal: c.signal,
        max_tokens: settings.maxTokens, temperature: settings.temperature,
        top_p: settings.topP, cache_prompt: true
      });
      for await (const chunk of stream) {
        if (c.signal.aborted) throw new Error('Generation canceled. No partial result was saved.');
        const txt = chunk.choices[0]?.delta?.content;
        if (txt) onText(txt);
      }
      if (c.signal.aborted) throw new Error('Generation canceled. No partial result was saved.');
    } finally {
      if (this.controller === c) this.controller = null;
    }
  }
  stop() { this.controller?.abort(); }
  async unload() {
    this.stop();
    const old = this.model; this.model = null;
    if (old) { try { await old.exit(); } catch (error) { console.warn('Unload error', error); } }
  }
}
