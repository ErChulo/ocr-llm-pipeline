# Standalone HTML security verification

The `npm run build` command now performs two independent checks:

1. **Packaging:** `scripts/verify-build.mjs` requires one `dist/index.html`, embedded Wllama/WASM assets, and no external JavaScript or CSS files.
2. **Release Content Security Policy:** `scripts/offlineBuildPolicy.mjs` rejects missing or duplicated CSP, forbidden origins in `connect-src`, `worker-src`, `script-src`, image/style/font directives, unsafe JavaScript evaluation, remote script/preload/style tags, frames/objects, and meta redirects.

The current file-mode runtime allows `data:` and `blob:` internal assets to initialize locally embedded WebAssembly workers; these are not HTTP(S) origins. Its `default-src`, `base-uri`, `object-src`, and `form-action` policies deny all sources. The browser acceptance workflow additionally intercepts and rejects outbound HTTP(S)/WebSocket requests while exercising the actual `file://` build.

**Limits:** Static analysis cannot prove that all transitive dependencies are free of defects, that the local model interprets plan provisions correctly, or that managed PBGC Chrome/Edge permits every local worker. Independent dependency review, data-privacy assessment, real workstation testing, and agency approval remain required before production use.

Tests: `tests/offlineBuildPolicy.test.mjs` and the GitHub Actions build/browser workflows.
