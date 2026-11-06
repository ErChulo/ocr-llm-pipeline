# Experimental real-browser GGUF smoke test

A separate GitHub Actions workflow builds the standalone HTML, downloads a tiny GGUF fixture **on the networked CI runner**, starts a headless Chromium browser, opens the HTML from \`file://\`, and blocks HTTPS and WebSocket requests.

It tests:
1. React renders a local HTML file.
2. The dark/light toggle changes background color.
3. A GGUF file selected through the file picker can load.
4. **Test model** produces nonempty text through Wllama.
5. There are no external requests during the \`file://\` session.

The 260K-parameter tiny model (1.19 MB) is a runtime fixture from \`ggml-org/models-moved\`, not an instruction-following model. It does **not** demonstrate actuarial data-extraction quality or practical GGUF model performance. Its SHA256 is checked in CI. No model weights are committed.

Workflow: \`.github/workflows/browser-smoke.yml\`.
Script: \`tests/browser-smoke.mjs\`.
Screenshots are uploaded only as workflow artifacts. Neither Playwright nor its browser is required for the standalone app.

**Status:** The test is experimental. Only a completed passing run counts as evidence; source compilation is not a real browser acceptance test. Office workstation and Windows Edge validation remain separate.
