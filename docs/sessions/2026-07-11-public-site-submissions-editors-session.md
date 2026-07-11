---
title: Public site submissions and editors workflow
date: 2026-07-11
status: unprocessed
tags:
  - public-site
  - submissions
  - editors
  - review
---

## What Was Attempted

- Implemented the submissions-management plan with reCAPTCHA v3 verification, DynamoDB/S3/SES-backed submission handling, a thank-you page, and a simple password-protected admin submissions UI.
- Planned and executed public journal and site-shell work, including navigation parity, route metadata coverage, content-page normalization, issue/article API tests, and HTML-shell tests.
- Iterated on `/editors-staff` normalization so Jane Alexandre, Julie B. Johnson, Erica Moshman, and Emily Metzner appear first, followed by Past Editors and Moving the Map.
- Ran `aw-review` over specs and code, then corrected the review outcome when the user clarified that BiographyList role labels should not be injected by the CMS API.
- Captured a decision and learning about not injecting editor role labels and preserving user-authored review fixes.

## What Worked

- Inspecting live `/cms/pages/editors-staff` JSON exposed the actual CMS names with credential suffixes and showed why exact-name matching failed.
- Matching biography names by normalized prefix allowed names such as `Jane Alexandre, PhD` and `Julie B. Johnson, PhD` to be grouped correctly.
- API-level tests in `apps/cms-api/src/content.test.ts` pinned the Editors page order, section headings, `inMemoriam`, TOC ordering, metadata, and page normalization behavior.
- Rebuilding React before CDK synth kept the HTML-shell Lambda aligned with current Vite asset paths.

## Corrections Made

- User clarified the exact Editors top order and names: Jane Alexandre, Julie B. Johnson, Erica Moshman, Emily Metzner.
- User clarified that role labels should not be injected by `BiographyList` normalization; tests and spec were corrected to stop expecting `role`.
- User pointed out the running `npm run site` page did not reflect the latest API changes; the cause was an already-running/stale CMS API process.

## Dead Ends

- Initial editor matching by exact name and then by first name was insufficient because Prismic names include credential suffixes.
- `npm run cdk:synth` and `npm run site` hit sandbox `tsx` IPC restrictions; rerunning with escalation was required.

## Key Files

- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/cms-api/src/html-shell.test.ts`
- `apps/react-site/src/components/Slices.tsx`
- `apps/react-site/src/components/SubmissionForm.tsx`
- `apps/react-site/src/pages/AdminSubmissionsPage.tsx`
- `infra/lib/dancer-citizen-web-stack.ts`
- `docs/features/public-journal-experience/spec.md`
- `docs/decisions/2026-07-10-do-not-inject-editor-role-labels.md`
- `docs/learnings/2026-07-10-preserve-user-authored-review-fixes.md`

## Open Questions

- Final production recipient email addresses, reCAPTCHA keys, and admin secrets still need to be provisioned outside source.
