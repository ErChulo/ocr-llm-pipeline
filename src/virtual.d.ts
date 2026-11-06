declare module 'virtual:wllama-wasm' {
  const wasmDataUrl: string;
  export default wasmDataUrl;
}

declare module '*.png' { const url: string; export default url; }

declare module '*.svg' {
  const url: string;
  export default url;
}

declare module 'virtual:wllama-compat-wasm' {
  const dataUrl: string;
  export default dataUrl;
}
declare module 'virtual:wllama-compat-worker' {
  const code: string;
  export default code;
}

declare module 'virtual:ocr-worker' { const workerCode: string; export default workerCode; }
declare module 'virtual:ocr-core' { const coreCode: string; export default coreCode; }
declare module 'virtual:ocr-eng' { const languageUri: string; export default languageUri; }
