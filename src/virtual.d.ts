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
