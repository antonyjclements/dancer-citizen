---
title: Legacy issue redirects for React delivery
date: 2026-07-11
status: unprocessed
tags:
  - redirects
  - react
  - cms-api
  - aws
---

## What Was Attempted

- Added legacy issue URL redirects for the AWS React delivery path only, avoiding the legacy Next app.
- Implemented HTTP-level redirects in the CMS HTML-shell Lambda and client-side fallbacks in the React router.
- Updated CloudFront/API Gateway routing so `issue-*` paths reach the HTML-shell Lambda.
- Removed the legacy Next runtime and Slice Machine scaffolding after the user asked to keep only `apps/react-site` and `apps/cms-api`.
- Investigated the deployed "Unable to load the journal" failure from CloudFront and CloudWatch logs.
- Updated living specs for the AWS React delivery and public journal experience.

## What Worked

- A small deterministic redirect resolver maps `/issue-13/` to `/issues/issue-13` and `/issue-13/akari-komura/` to `/articles/issue-13--akari-komura`.
- HTML-shell redirects happen before metadata lookup, preserving query strings and avoiding unnecessary Prismic reads.
- The CloudWatch `content_page` UID `cms/home` error showed `/cms/home` was reaching the HTML metadata Lambda instead of the CMS API Lambda.
- Replacing broad API Gateway routes `/{issueUid}` and `/{issueUid}/{articleUid}` with an HTML `$default` route preserved legacy HTML handling while letting explicit `/cms/{proxy+}` routes win.
- API tests, React build, CMS API build, full build, lint, and CDK synth validated the broader local changes; CDK synth needed to run outside the sandbox because `tsx` IPC pipe creation was blocked.

## Corrections Made

- The user clarified that the Next app is legacy and only `apps/react-site` plus `apps/cms-api` should be used.
- The user clarified that `issue-x` was a numeric placeholder, not a literal non-numeric issue slug. The redirect matcher was restored to numeric `issue-\d+` paths only.
- The deployed homepage failure was initially suspected as a missing Prismic env value; live checks and CloudWatch logs corrected that to an API Gateway route precedence problem.

## Dead Ends

- Briefly broadened the matcher to any `issue-*` slug after over-reading the placeholder example. Reverted to numeric-only matching and kept the focused API tests passing.
- Initial `npm run cdk:synth` failed in the sandbox with `listen EPERM` on a `tsx` pipe; rerunning with escalation succeeded.
- Adding broad parameterized API Gateway routes for legacy paths allowed `/cms/home` to match the HTML Lambda path; avoid broad public catch-alls when explicit API prefixes share the same API.

## Key Files

- apps/cms-api/src/legacy-redirects.ts
- apps/cms-api/src/legacy-redirects.test.ts
- apps/cms-api/src/html-shell.ts
- apps/cms-api/src/html-shell.test.ts
- apps/react-site/src/legacyRedirects.ts
- apps/react-site/src/App.tsx
- infra/lib/dancer-citizen-web-stack.ts
- package.json
- eslint.config.mjs
- docs/features/aws-react-lambda-delivery/spec.md
- docs/features/public-journal-experience/spec.md
- docs/decisions/2026-07-11-remove-legacy-next-runtime.md

## Open Questions

- The `www.dancercitizen.org` 403 still needs a custom CloudFront alias, ACM certificate, and DNS alignment before the production domain can serve the new distribution.
