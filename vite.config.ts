import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function embeddedWasm(): Plugin {
  const files: Record<string, string> = {
    'virtual:wllama-wasm': 'node_modules/@wllama/wllama/esm/wasm/wllama.wasm',
    'virtual:wllama-compat-wasm': 'node_modules/@wllama/wllama-compat/wasm/wllama.wasm',
    'virtual:wllama-compat-worker': 'node_modules/@wllama/wllama-compat/wasm/wllama.js'
  };
  return {
    name: 'embedded-wllama-wasm',
    enforce: 'pre',
    resolveId(id) { return Object.hasOwn(files, id) ? '\0' + id : undefined; },
    load(id) {
      if (!id.startsWith('\0virtual:') || !Object.hasOwn(files, id.slice(1))) return undefined;
      const file = resolve(process.cwd(), files[id.slice(1)]);
      if (!existsSync(file)) throw new Error('Required offline Wllama asset unavailable: ' + file);
      const bytes = readFileSync(file);
      if (id.endsWith('-worker')) {
        return 'export default ' + JSON.stringify(bytes.toString('utf8')) + ';';
      }
      if (bytes.subarray(0, 4).toString('hex') !== '0061736d') throw new Error('Invalid WASM header: ' + file);
      return 'export default ' + JSON.stringify('data:application/wasm;base64,' + bytes.toString('base64')) + ';';
    }
  };
}
function embeddedOcr(): Plugin {
  const files: Record<string, {path:string; mime?:string}> = {
    'virtual:ocr-worker': {path:'node_modules/tesseract.js/dist/worker.min.js'},
    'virtual:ocr-core': {path:'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js'},
    'virtual:ocr-eng': {path:'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',mime:'application/gzip'}
  };
  return {
    name: 'embedded-offline-ocr',
    enforce: 'pre',
    resolveId(id) { return Object.hasOwn(files,id) ? '\0'+id : undefined; },
    load(id) {
      const key=id.slice(1);
      if(!Object.hasOwn(files,key))return undefined;
      const spec=files[key];
      const path=resolve(process.cwd(),spec.path);
      if(!existsSync(path)) throw new Error('Offline OCR asset missing from npm dependencies: '+path);
      const bytes=readFileSync(path);
      if(spec.mime)return 'export default '+JSON.stringify('data:'+spec.mime+';base64,'+bytes.toString('base64'))+';';
      if(bytes.length<10000)throw new Error('OCR worker/core library is unexpectedly small: '+path);
      return 'export default '+JSON.stringify(bytes.toString('utf8'))+';';
    }
  };
}
function developmentCsp(): Plugin {
  return {
    name: 'local-development-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html
        .replace('connect-src data: blob:', "connect-src 'self' data: blob: ws://127.0.0.1:*")
        .replace("style-src 'unsafe-inline'", "style-src 'self' 'unsafe-inline'")
        .replace("script-src 'unsafe-inline'", "script-src 'self' 'unsafe-inline'");
    }
  };
}
export default defineConfig({
  base: './',
  plugins: [react(), embeddedWasm(), embeddedOcr(), developmentCsp(), viteSingleFile()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    sourcemap: false,
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
