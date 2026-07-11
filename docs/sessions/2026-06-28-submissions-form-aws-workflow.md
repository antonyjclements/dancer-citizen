---
title: Submissions form AWS workflow
date: 2026-06-28
status: unprocessed
tags:
  - submissions
  - aws
  - react
---

## What Was Attempted

- Rebuilt the missing Dancer-Citizen pages and navigation in `apps/react-site`, including `/editors-staff`, the header logo, hero/body copy placement, and a direct `/submissions` form.
- Added `npm run site` to run the React app and CMS API together with colored log prefixes.
- Implemented `POST /cms/submissions` with DynamoDB record storage, S3 file storage, and SES notifications.
- Added CDK resources and permissions for the submissions table, file bucket, API POST route, SES sending, and API throttling.
- Reviewed the feature with `aw-review`, then fixed findings around abuse protection, partial failures, upload type validation, and missing tests.

## What Worked

- Keeping React behind the CMS API boundary preserved the migration shape while allowing the Submissions page to render a local form.
- Moving submission persistence into `apps/cms-api/src/submissions.ts` made it straightforward to test with mocked AWS SDK clients.
- Creating the DynamoDB record before file upload and recording notification status avoids encouraging duplicate resubmissions when SES fails.
- `npm run site` successfully gives one terminal for both local services, with the CMS API on `127.0.0.1:8787` and Vite on `127.0.0.1:5173`.

## Corrections Made

- User rejected added hero images; hero image changes were removed.
- User asked for hero paragraph text to move into the first body paragraph; page rendering was adjusted accordingly.
- User asked to replicate the original external submission form directly on `/submissions`; the implementation shifted from link-out behavior to an integrated React form.
- Review findings required hardening the first implementation before considering the feature complete.

## Dead Ends

- `npm run cdk:synth` failed inside the sandbox because `tsx` could not create a temporary IPC pipe under `/var/folders`; rerunning with escalation verified the CDK template.
- A live successful submission was not tested locally because it would require real AWS credentials/resources and would send/store real data.

## Key Files

- `apps/react-site/src/components/SubmissionForm.tsx`
- `apps/react-site/src/pages/ContentPage.tsx`
- `apps/react-site/src/App.tsx`
- `apps/react-site/src/styles.css`
- `apps/cms-api/src/submissions.ts`
- `apps/cms-api/src/submissions.test.ts`
- `apps/cms-api/src/handler.ts`
- `apps/cms-api/src/dev-server.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `scripts/site-dev.mjs`
- `README.md`

## Open Questions

- Whether the submission endpoint should add stronger bot protection beyond honeypot plus API Gateway throttling, such as Turnstile/CAPTCHA or WAF managed rules.
- Whether accepted attachment formats should remain limited to PDF, DOC, DOCX, RTF, and TXT.
