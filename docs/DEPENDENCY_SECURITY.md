# Production dependency audit

This application loads all assets from a single HTML file at `file://`. The dependency audit runs **only on networked GitHub Actions**, never inside the workplace application.

## Verification

- The audit inspects production packages from the committed `package-lock.json` using `npm audit --omit=dev --audit-level=high --json`.
- The report parser rejects missing/invalid registry results and blocks the CI job when any **high** or **critical** severity count is nonzero.
- Moderate, low and informational findings are retained in the downloadable audit artifact and must still be considered during release review.
- The audit runs after relevant dependency changes, on manual dispatch, and weekly. Its output contains package-advisory information, not participant records.
- A clean npm advisory report **does not** establish source-code security, model safety, data privacy, the absence of unknown vulnerabilities, or agency approval.

Successful release acceptance additionally requires dependency provenance/integrity inspection, external security review, sandboxed offline browser tests, and tests with permission to use representative documents.

See `.github/workflows/dependency-security.yml` and `scripts/check-dependency-audit.mjs`.
