# Offline accessibility regression testing

The standalone `file://` application now has a dedicated **network-blocked Chromium accessibility workflow** using pinned `@axe-core/playwright` and Playwright packages on GitHub Actions. These tools are installed **only on the CI runner**; they are not bundled into the application and require no PBGC workstation installation.

## Coverage

- Scan the Documents, Extract JSON, Local chat and Settings routes using automated WCAG 2.0, 2.1 and 2.2 Level A/AA rules.
- Scan the Guide dialog while it is open.
- Verify that opening the Guide focuses its close control, Escape dismisses it, and focus returns to the Guide trigger.
- Fail on any detected violation and save a synthetic-only JSON report identifying rule, affected selector and bounded failure summary.
- Fail if the browser attempts any HTTP(S) or WebSocket request.

## Limits

Passing automated accessibility checks is **not** WCAG certification. Manual acceptance still requires keyboard-only operation, screen-reader labels and announcements, high-contrast and large-text inspection, realistic file-picker and PDF interactions, and printing/reading the full Guide on the authorized Windows workstation. Do not upload participant records or plan documents to this CI workflow.

The test is `tests/browser-accessibility.mjs`; the workflow is `.github/workflows/accessibility.yml`.
