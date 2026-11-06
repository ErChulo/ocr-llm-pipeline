declare module 'virtual:wllama-wasm' {
  const wasmDataUrl: string;
  export default wasmDataUrl;
}

declare module '*.png' { const url: string; export default url; }

declare module '*.svg' {
  const url: string;
  export default url;
}
