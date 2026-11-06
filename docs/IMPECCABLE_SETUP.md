# Impeccable — development setup

Impeccable is a **developer/agent design tool**, not a library the offline application needs at runtime.

Official project: https://github.com/pbakaus/impeccable and https://impeccable.style/

In a **networked development checkout** of this repository:

\`\`\`bash
npx impeccable install
\`\`\`

Select project-local installation and the agent/IDE you use. Then use its \`init\`, \`document\`, \`audit\`, \`critique\` and \`polish\` workflows with root \`DESIGN.md\` and \`PRODUCT.md\` as the project source of truth. Keep project-specific design context under version control after inspecting generated changes.

**Status:** Installation on a development machine is **not verified**. The current execution environment cannot resolve npm registry URLs. Do not list an Impeccable badge as passing or claim the tool was installed until the CLI runs successfully.

Impeccable checks must not:
- alter the read-only \`bulk-ocr-studio\` repository;
- introduce CDN dependencies, remote assets, telemetry or unsupported CSS;
- overwrite the PBGC palette, accessibility requirements or required layout;
- block production build when not installed.
