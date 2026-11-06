# DESIGN.md — OCR + LLM Pipeline Studio

**Status:** design specification, not a claim of completed UI compliance. 
**Source:** *PBGC Branding & Editorial Style Guide*, September 2025, in the connected PBGC reference library. The exact `DESIGN.md` requested was **not found** in the linked `pbgc-the-book-of-job` Drive folder; this design file is a project-specific interpretation of the official guide.

## Design character

Minimal, precise and quiet. A polished surface with restrained gloss. High contrast, strong alignment and clear focus. No decorative dashboards, dummy metrics, gratuitous gradients, excessive cards, or technical logs in the user workspace.

The interface must look like a professional PBGC case-processing tool. It must not imply an official PBGC endorsement.

## Color tokens

Official PBGC colors as stated in its guide:
- Primary blue **#002D72** (PBGC Blue).
- Primary red **#E4002B** (PBGC Red); reserve for serious errors, never everyday decoration.
- Supporting gray **#81807F**, black **#000000**, light blue-gray **#6E93C2**, medium blue **#004B8D**, green **#008065**, teal **#00A9A1**, and light green **#88B672**.

App surface tokens (design additions, **not** official PBGC palette):
- Canvas: **#000000**; surface: **#0C1017**; raised surface: **#131B26**.
- Hairline: **#253244**; primary text: **#FFFFFF**; secondary text: **#C6D2E1**.
- Focus: **#6E93C2**, thick enough to see on black.
- Use subtle glass/gloss only where it strengthens hierarchy, never as an opaque layer behind body text.
- Compliant high-contrast text, focus indicators, and user-requested reduced motion are mandatory.

## Typography and composition

The PBGC guide uses **Arial** and **Garamond**. Use Arial as the dominant UI font with system sans fallback. Garamond may be used sparingly for editorial print headings, not dense controls. Use a system monospace for JSON and source excerpts. Never bundle proprietary font files.

Normal UI body text at least 14 CSS px; controls at least 14 CSS px; large tap targets; generous line height. Use a predictable 8px spacing scale, strong headings, clear empty states, and no typography smaller than necessary. Use 10–12 pt for printed manual text, consistent with the PBGC guide.

## Layout and interaction

1. Keep **Attach → Select → Extract → Review → Export** visible and primary.
2. Local model loading is an essential action, not a technical telemetry panel.
3. Show progress and actionable errors only when needed. Do **not** render console output, tool diagnostics, badge lists, or detailed technical reports in the main workspace.
4. Put advanced inference settings in a collapsed settings area. Preserve keyboard navigation and focus visibility.
5. A **separate, collapsible left Guide drawer** must not replace the normal workspace navigation. Close with Escape or the close button. Include a **Print / Save PDF** action.
6. Print **only** the guide at readable size, with a title, page numbers if supported, captions and clear diagrams. Hide controls, browser-app chrome, and model data in print.
7. Use original, simple inline SVG workflow diagrams and labeled screenshots or step illustrations in the guide. Do not claim pending features are available.
8. Do not introduce the official PBGC logo unless the agency-approved artwork and proper permission are available; keep logo clear space and proportions intact if ever authorized.

## Technical accuracy and UX safety

- Distinguish **schema-valid** from **fact-verified** JSON.
- Present an evidence source for extracted assertions when its location is actually known; otherwise show document-level provenance or **not available**.
- Never hide truncated input or an incomplete chunk. Surface a plain-language review warning.
- Do not place participant or plan records in URLs, error telemetry, remote fonts, or network calls.
- Keep all design tools (Impeccable, Vite, Node) outside the target workstation runtime.

## Design review

Use Impeccable during development after it is installed in a developer checkout. Its role is to review UX, accessibility and visual anti-patterns against **this** file and `PRODUCT.md`. It does not override PBGC brand, offline restrictions, source provenance, or security controls. See [setup](docs/IMPECCABLE_SETUP.md).

## Official branding asset implementation

Official logo variants are embedded without recoloring or geometric modification. **White logo on dark UI**, **black logo on light UI**. Use consistent scale, minimum display width and ample clear space. These source images are not generated artwork. This application is an independent internal-oriented tool and must not claim PBGC endorsement. Details: `docs/BRANDING_ASSETS.md`.

## Exact logo and theme correction

The user approved a specific visual pairing, which supersedes earlier generic "white for dark / black for light" guidance:
- Dark app canvas and navigation: pure **#000000**, using untouched `logo-negro.png` from the branding directory.
- Light app canvas and navigation: pure **#FFFFFF**, using untouched `logo.svg` full-color PBGC artwork.
- No light/white logo on dark background or dark-text logo on light background substitution.
- Theme control is one small, visible sun/moon icon in the top navigation, with an accessible 44×44 click target; store preference when possible.
- Supporting cards may use subtly raised surfaces, but the page canvas, sidebar and navigation must match the logo's background.
- The dark logo has intentionally low artwork contrast. Maintain strong contrast for navigation labels and all form controls.

See `docs/BRANDING_ASSETS.md`.
