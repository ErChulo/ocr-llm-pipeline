# Clarifications — model capacity, PBGC logos, SPA routing

## Model capacity

The current implementation uses `@wllama/wllama@3.8.1` with the default single-thread WebAssembly WASM binary, `n_threads: 1`, `n_gpu_layers: 0`, and contexts of 1024/2048/4096 tokens. It is **not** AirLLM disk-layer streaming and has not passed an actual GGUF offline runtime test.

Wllama documents a limit of roughly 2 GB **per file** for its ArrayBuffer interface; larger models require split GGUF files. WebAssembly 32-bit linear memory has a theoretical 4 GiB ceiling, with practical browser/device limits lower. Splitting a GGUF does **not** remove its in-memory weight requirements. There is no demonstrated maximum robust model in this repo.

Candidate qualification tiers (not promises):
- Smoke tests: 0.5B to 1.5B GGUF Q4, sized below ~1 GB.
- Advanced acceptance: 3B Q4 GGUF, e.g. Qwen2.5-3B-Instruct Q4_K_M, approximately 1.9–2.1 GB depending on converter; may require splitting and significant RAM headroom. Slow CPU generation is expected.
- 7B Q4 (~4 GB+ weights alone) and larger: **not an acceptable promise** for the current WASM32 single-thread/browser-only/file:// architecture. Needs different memory or inference design and verified browser support.

All model eligibility/status text must be derived from actual device tests, not just GGUF file size or model parameter count.

## Official PBGC logos

Verified in Google Drive `pbgc-the-book-of-job/PBGC_CASEWORK_CURATED/07_SOFTWARE_AND_ASSETS/03_Branding_Assets/images`:
- `PBGC_logo_name_hor_fc.png` (horizontal with agency name, full color).
- `PBGC_logo_name_hor_wt.png` (horizontal, white).
- `PBGC_logo_fc.png`, `PBGC_logo_wt.png`, `PBGC_logo_tagl_fc.png`, and others.

The September 2025 *PBGC Branding & Editorial Style Guide* instructs that official logos must keep proportions, color and clear space; PBGC approval is needed for external logo use. Because this GitHub repository is **public**, keep a branded placeholder in committed source unless the rights/approval for redistribution of an official logo are confirmed. Approved internal release builds may embed the selected logo as a data URL; never need a remote image URL at runtime. The official logos found in Drive are not to be modified.

## SPA / route and app manifests

The current React code mounts a single SPA with `Panel = 'documents' | 'chat'` using component state. It has **no** URL-based router and no web app manifest.

Required for navigation:
- Internal **hash-based routing** so `file://` and one HTML build continue to work.
- Route manifest in TypeScript (single source of truth for route IDs, paths, labels, permissions).
- Initial logical routes: `#/documents`, `#/extract`, `#/chat`, `#/guide`, `#/settings`. Preserve live GGUF model and loaded documents while switching routes.
- A responsive collapsible Guide drawer remains available from every route; it does not become an unwanted second full-screen workspace.

The request for a “manifesto” is interpreted provisionally as a **route manifest** and potentially a **web app manifest**. The latter is metadata for installed PWAs, not a requirement for a double-click `file://` app. Do not create a required external `.webmanifest` or a service worker that makes offline operation fail; an optional embedded manifest can be investigated separately.

## Release conditions

Verify `file://` navigation, model loads, extraction, schema validation, PII safeguards, source attribution, and browser no-network policy before claiming offline readiness. Do not modify `bulk-ocr-studio`.
