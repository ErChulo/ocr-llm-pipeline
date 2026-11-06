# Dual deployment plan: portable HTML and optional PWA

The app currently targets a **single portable HTML file** plus user-selected GGUF model files.

## Standalone mode — current priority

- Open `dist/index.html` from `file://` in Chrome or Edge.
- All WASM/worker/runtime assets must be inside the HTML. No server, installation, CDN or outside network connection.
- Use hash routing, not a history API rewrite rule.
- Never register a service worker. Service workers are not available for `file://`.
- Do not install a PWA plugin in this build by default.

## Installable PWA — future optional target

Build a second, **HTTPS-hosted** distribution from the same React application. A PWA is not a more compact form of the standalone HTML. It requires a secure origin, a web app manifest with properly sized app icons, installability criteria, and an offline caching strategy. Only cache application resources and explicitly user-approved non-sensitive content.

- `manifest.webmanifest`: name, ID, start URL, scope, display mode, colors, suitable icons.
- Service worker: versioned application shell cache; prevent caching model weights or protected documents by default.
- Preserve `#/documents` style navigation for consistency or adopt server routing only with an intentional hosting configuration.
- Test offline reload, software upgrade/migration, cache eviction, storage quotas, and no automatic remote model downloads.
- Do not register the PWA service worker in the portable one-file distribution.
- Never claim PBGC approval or make PWA icons from a PBGC logo without reviewing external distribution requirements.

**Status:** PWA packaging is a documented future enhancement; it is **not installed or configured** in this release.
