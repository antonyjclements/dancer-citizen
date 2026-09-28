---
generated: 2026-09-28
sessions_synthesized: 3
---

# Project Context Wiki

> Generated 2026-09-28 by aw-synthesize-memory from 3 session logs. Do not edit manually.
> After 30 days, verify against source specs, decisions, and learnings.

## Active Features

- AWS React Lambda Delivery: `docs/features/aws-react-lambda-delivery/spec.md`. Active living specification.
- Prismic Content Model and Slices: `docs/features/prismic-content-model-and-slices/spec.md`. Active living specification.
- Prismic Preview and Cache Behavior: `docs/features/prismic-preview-and-cache-revalidation/spec.md`. Active living specification.
- Public Journal Experience: `docs/features/public-journal-experience/spec.md`. Active living specification.
- Site Shell and Navigation: `docs/features/site-shell-and-navigation/spec.md`. Active living specification.
- Submissions Management: `docs/features/submissions-management/spec.md`. Active living specification.

## Recent Decisions

- Remove Legacy Next Runtime: `docs/decisions/2026-07-11-remove-legacy-next-runtime.md`.
- Use Simple Admin Auth for Submissions: `docs/decisions/2026-07-10-use-simple-admin-auth-for-submissions.md`.
- Do Not Inject Editor Role Labels: `docs/decisions/2026-07-10-do-not-inject-editor-role-labels.md`.
- Use React and Lambda BFF for AWS Delivery: `docs/decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md`.

## Top Learnings

- Recognize sandbox IPC errors before changing application code: `docs/learnings/2026-09-28-tsx-sandbox-ipc.md`.

## Tentative Learnings

- Preserve user-authored review fixes: `docs/learnings/2026-07-10-preserve-user-authored-review-fixes.md`.
- Preserve API route precedence: `docs/learnings/2026-09-28-preserve-api-route-precedence.md`.

## Known Dead Ends

- Exact biography-name matching fails when CMS names include credential suffixes; normalization uses name prefixes.
- Broad parameterized HTML routes previously intercepted CMS API requests.

## Useful Sources

- `README.md` describes local operation and SNS subscription confirmation.
- `docs/standards/aws/build-react-before-cdk-synth.md` explains the HTML-shell build dependency.
- Current submissions use SNS; the historical sessions described the superseded SES implementation.
