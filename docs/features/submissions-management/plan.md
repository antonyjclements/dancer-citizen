---
status: completed
created: 2026-07-10
origin: docs/features/submissions-management/spec.md
depth: deep
---

# Submissions Management Implementation Plan

## Problem and Scope

The site already has the beginning of an embedded submissions workflow in the AWS React delivery path: `/submissions` posts multipart form data to `/cms/submissions`, the CMS API writes DynamoDB records, uploads files to S3, and sends SES notifications. The remaining work is to make that workflow launch-ready, add an authenticated admin surface for review and private downloads, and apply the latest editorial refinements across the public React shell.

This plan covers:

- Submissions bot protection, thank-you behavior, notification configuration, and backend hardening.
- A first-version admin page protected by one environment-configured username/password or password hash.
- Private S3 download handoff through short-lived signed S3 URLs returned only by authenticated admin API responses.
- Public page refinements for home, latest issue TOC, About links, editors/staff ordering, In the Moment pending content, and header navigation.

Out of scope for this pass:

- AWS Cognito, password resets, multi-user roles, comments, assignments, scoring, or a full peer-review workflow.
- Replacing the current Prismic content model.
- Pixel-perfect parity with the legacy site beyond the requested refinements.

## Requirements Traceability

- `docs/features/submissions-management/spec.md`
  - Embedded `/submissions` form remains on-site.
  - Accepted submissions notify two configured email recipients, write DynamoDB metadata, and store files in S3.
  - Backend status distinguishes received, stored, notified, notification-failed, and file-failed states.
  - Public form rejects invalid fields, unsupported files, oversized files, and missing certification.
  - Bot protection is stronger than honeypot-only before launch.
  - Success leads to a dedicated thank-you route or stable thank-you state.
  - Admin routes require authentication.
  - Admin users can list submissions, inspect details, and download files without public S3 objects.
- `docs/features/public-journal-experience/spec.md`
  - Home title keeps "The Dancer-Citizen" on one line when viewport width allows.
  - Latest Issue 20 TOC is either omitted when unlinked or rendered with working links.
  - About links are clickable.
  - Editors/staff ordering and grouping match the editorial request.
  - In the Moment can remain pending until content arrives.
- `docs/features/site-shell-and-navigation/spec.md`
  - Header navigation presents Support Us last, after In the Moment.

## Relevant Existing Patterns

- React routes fetch normalized API data through `apps/react-site/src/api.ts`, `getJson()`, `submitFormData()`, and `useAsyncData()`.
- React content pages render normalized CMS payloads through `apps/react-site/src/pages/ContentPage.tsx` and `apps/react-site/src/components/Slices.tsx`.
- The CMS API route dispatcher lives in `apps/cms-api/src/handler.ts`.
- Submission persistence and email behavior already live in `apps/cms-api/src/submissions.ts`, with tests in `apps/cms-api/src/submissions.test.ts`.
- CDK already provisions `SubmissionFilesBucket`, `SubmissionsTable`, SES permissions, `/cms/{proxy+}`, and CloudFront routing in `infra/lib/dancer-citizen-web-stack.ts`.
- Content normalization and page-specific legacy cleanup live in `apps/cms-api/src/content.ts`, with tests in `apps/cms-api/src/content.test.ts`.

## Applicable Standards

- `docs/standards/aws/build-react-before-cdk-synth.md`: run `npm run build:react` before `npm run cdk:synth` because CDK embeds the current Vite `index.html`.
- `docs/standards/frontend/prevent-mobile-content-overflow.md`: admin tables, links, abstracts, and CMS rich text must not widen mobile viewports.
- `docs/standards/react/keep-react-pages-on-cms-api-boundary.md`: React pages should use CMS API endpoints rather than reading Prismic or AWS directly.
- `docs/standards/react/make-mobile-navigation-accessible.md`: keep the existing explicit mobile menu state while changing nav order.
- `docs/standards/react/own-spa-navigation-reset.md`: add routes without moving scroll reset into individual pages.
- `docs/standards/workflow/use-fast-reliable-verification.md`: use targeted builds/tests first and fall back cleanly if browser tooling is unavailable.

## Decisions

- First admin auth will use a single environment-configured admin credential or hash, not Cognito. This is the fastest launch path and enough for a small editorial team. Cognito is deferred for managed accounts, password resets, and roles.
- Admin file access must go through protected API logic that returns short-lived signed S3 download URLs after authorization. The S3 bucket stays private; Lambda should not proxy file bytes unless signed URLs prove unusable.
- First-version admin sessions should use an HTTP-only, `Secure`, `SameSite=Lax` cookie containing a short-lived HMAC-signed session token. Password comparison should use an environment-provided hash and timing-safe comparison; do not store admin credentials or session tokens in `localStorage`.
- Bot protection should be implemented as a replaceable verification boundary in the CMS API. If the team wants Google reCAPTCHA specifically at implementation time, wire that provider first; otherwise use the same boundary for Turnstile or hCaptcha.
- The first thank-you experience can be an in-app route or a dedicated stable success state, but implementation should prefer a route if it is quick because it is easier to share, revisit, and test.

## Implementation Units

### Unit 1: Public Shell and Content Refinements

Goal: finish the editorial polish requests that do not depend on submissions infrastructure.

Likely files:

- `apps/react-site/src/App.tsx`
- `apps/react-site/src/pages/HomePage.tsx`
- `apps/react-site/src/pages/ContentPage.tsx`
- `apps/react-site/src/components/Slices.tsx`
- `apps/react-site/src/styles.css`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `infra/lib/dancer-citizen-web-stack.ts`

Behavior:

- Move Support Us to the final header nav position after In the Moment.
- Ensure `/in-the-moment` is routed through the HTML shell and can render a pending-content state.
- Keep the home H1 on one line where the viewport can support it, with responsive fallback that avoids overflow on narrow screens.
- Remove or link any latest-issue TOC surface that currently appears non-clickable.
- Ensure About page links render as anchors through the RichText/Slices path.
- Normalize or render editors/staff content so Erica, Julie, Jane, and Emily appear first, with Julie as "Co-Founding Editor", Jane as "Founding Editor" plus "In Memoriam", past guest editors/staff grouped together, and Moving the Map grouped separately.

Tests and checks:

- Update `apps/cms-api/src/content.test.ts` for any normalization added for editors/staff, in-the-moment, or linked rich text.
- Run `npm run build:react`.
- Run `npm run test:api` if CMS normalization changes.
- Manual/browser check: `/`, `/about`, `/editors-staff`, `/in-the-moment`, `/support-us` on desktop and mobile widths if local browser tooling is available.

Edge cases:

- Long names, URLs, and imported legacy JSON must wrap on mobile.
- Header nav must still close after link selection and Escape.
- Do not hardcode Prismic fetching in React pages.

### Unit 2: Bot Protection Boundary

Goal: add stronger spam protection without coupling the whole submissions backend to one provider forever.

Likely files:

- `apps/react-site/src/components/SubmissionForm.tsx`
- `apps/react-site/src/api.ts`
- `apps/cms-api/src/submissions.ts`
- `apps/cms-api/src/submissions.test.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `README.md`

Behavior:

- Add a bot-protection token field to the public form.
- Verify the token in the CMS API before DynamoDB, S3, or SES side effects.
- Configure provider secret/site key through environment variables.
- Return a validation error when verification fails or is missing.
- Keep the existing honeypot and API Gateway throttling as layered protection.

Tests and checks:

- Add `apps/cms-api/src/submissions.test.ts` cases for missing token, failed verification, successful verification, and provider/network failure.
- Mock token verification rather than calling the live provider in unit tests.
- Run `npm run test:api`.
- Run `npm run build:api`.
- Run `npm run build:react`.

Implementation checkpoint:

- Confirm provider before coding. Default to Google reCAPTCHA if the client explicitly wants "reCAPTCHA"; otherwise prefer the least intrusive provider that the team can configure quickly.

### Unit 3: Thank-You Experience

Goal: give submitters a clear stable confirmation after successful submission.

Likely files:

- `apps/react-site/src/App.tsx`
- `apps/react-site/src/components/SubmissionForm.tsx`
- `apps/react-site/src/pages/SubmissionThankYouPage.tsx`
- `apps/react-site/src/styles.css`
- `infra/lib/dancer-citizen-web-stack.ts`

Behavior:

- On successful submission, route to `/submissions/thank-you` or render a dedicated thank-you state with the submission ID.
- If using a route, add React Router and CloudFront/API Gateway HTML-shell routing for `/submissions/thank-you`.
- Keep the message stable and non-sensitive; do not expose file keys, admin-only details, or raw email delivery state.

Tests and checks:

- Run `npm run build:react`.
- Manual/browser check: submit-form success path with mocked/local API response if available.
- If route behavior is implemented in API/CDK, run `npm run build:react` then `npm run cdk:synth`.

Edge cases:

- Duplicate submits should not encourage resubmission if the backend accepted the first one.
- Failed notification should not be shown as a submitter-facing failure when the submission was stored.

### Unit 4: Admin API Auth and Submission Listing

Goal: expose submission records only to authenticated admins.

Likely files:

- `apps/cms-api/src/handler.ts`
- `apps/cms-api/src/submissions.ts`
- `apps/cms-api/src/admin.ts` or `apps/cms-api/src/submissions-admin.ts`
- `apps/cms-api/src/submissions.test.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `README.md`

Behavior:

- Add environment-configured admin credentials, preferably `SUBMISSIONS_ADMIN_USERNAME` plus `SUBMISSIONS_ADMIN_PASSWORD_HASH` or equivalent.
- Add protected API endpoints such as:
  - `POST /cms/admin/login` or credential check endpoint.
  - `GET /cms/admin/submissions` for list data.
  - `GET /cms/admin/submissions/:submissionId` for detail data.
- Use an HTTP-only, `Secure`, `SameSite=Lax` cookie containing a short-lived HMAC-signed session token for admin session state.
- Require a `SUBMISSIONS_ADMIN_SESSION_SECRET` or equivalent signing secret in production, and fail closed when required admin auth configuration is missing.
- Query DynamoDB for submission list/detail using least-privilege table permissions.
- Return only safe file metadata in list/detail responses.

Tests and checks:

- Add unit tests for unauthorized requests, invalid credentials, valid login/session, list response shape, detail response shape, and missing record behavior.
- Add unit tests for missing admin auth configuration, expired session tokens, tampered session tokens, and no-store admin responses.
- Run `npm run test:api`.
- Run `npm run build:api`.

Edge cases:

- Avoid logging passwords, hashes, tokens, or abstracts in Lambda logs.
- Set `Cache-Control: no-store` for all admin responses.
- Consider DynamoDB scan pagination; first version can return a limited list with a clear follow-up if volume grows.

### Unit 5: Private File Downloads

Goal: let admins download attached files without public bucket access.

Likely files:

- `apps/cms-api/src/submissions.ts`
- `apps/cms-api/src/admin.ts` or `apps/cms-api/src/submissions-admin.ts`
- `apps/cms-api/src/submissions.test.ts`
- `infra/lib/dancer-citizen-web-stack.ts`

Behavior:

- Add a protected endpoint such as `GET /cms/admin/submissions/:submissionId/file`.
- Verify admin authorization before looking up the record.
- Confirm the requested submission has stored file metadata.
- Return a short-lived signed S3 URL generated after authorization.
- Grant the API function read access to the submission files bucket, scoped to the existing bucket.
- Add `@aws-sdk/s3-request-presigner` to the CMS API workspace if no existing helper can generate signed S3 URLs.

Tests and checks:

- Add unit tests for unauthorized download, no-file record, missing record, signed URL success path, and signed URL expiration configuration.
- Run `npm run test:api`.
- Run `npm run build:api`.
- Run `npm run build:react` before `npm run cdk:synth` if CDK changes follow React route changes.

Edge cases:

- Signed URLs should expire quickly.
- Do not expose bucket names or keys in public/admin UI unless necessary.
- Ensure failed download requests are `no-store`.

### Unit 6: Admin React UI

Goal: provide a simple editor-facing admin page for login, listing, details, and downloads.

Likely files:

- `apps/react-site/src/App.tsx`
- `apps/react-site/src/api.ts`
- `apps/react-site/src/pages/AdminLoginPage.tsx`
- `apps/react-site/src/pages/AdminSubmissionsPage.tsx`
- `apps/react-site/src/styles.css`
- `infra/lib/dancer-citizen-web-stack.ts`

Behavior:

- Add `/admin` or `/admin/submissions` route.
- Show login form when no valid admin session exists.
- After login, fetch and display submissions with submitted date, status, name, email, title, and attachment availability.
- Let admins open a detail view with abstract, video URL, status, and file download action.
- Keep the UI compact and utilitarian, not a landing page.
- Ensure tables/cards wrap on mobile and no submission data widens the viewport.

Tests and checks:

- Run `npm run build:react`.
- Manual/browser check login, unauthorized state, list/detail, and download link behavior with local mocked or deployed API.
- If route added to CloudFront/API Gateway, run `npm run build:react` then `npm run cdk:synth`.

Edge cases:

- Empty list state.
- Expired/invalid session.
- Long abstracts, long titles, long file names, and long URLs.

### Unit 7: Infrastructure, README, and Deployment Verification

Goal: keep deploy/setup instructions aligned with the new secure submissions workflow.

Likely files:

- `infra/lib/dancer-citizen-web-stack.ts`
- `README.md`
- `package.json` if scripts need adjustment
- `apps/cms-api/package.json` if new AWS SDK packages are needed

Behavior:

- Add required environment variables for admin auth and bot protection.
- Add DynamoDB read permissions for admin list/detail and S3 read permissions for protected downloads.
- Add HTML-shell routing for admin/thank-you routes when needed.
- Add required admin auth configuration to Lambda environment without hardcoding secrets in CDK source.
- Update README with local development, deployment env vars, SES recipient configuration, bot-protection setup, admin credential setup, and verification notes.

Tests and checks:

- `npm run test:api`
- `npm run build:api`
- `npm run build:react`
- `npm run cdk:synth` after React build
- Manual deployed smoke check when AWS credentials and environment variables are available.

Edge cases:

- CDK synth must not silently embed fallback HTML after React route changes.
- Admin and submission responses should be uncached.
- SES sender identity and final recipients must be configured in AWS before live submissions.

## Test Plan

Effective policy: `acceptance-first`.

Automated:

- `apps/cms-api/src/submissions.test.ts`
  - Valid submission stores DynamoDB record, uploads allowed file, and sends email.
  - Missing required field, invalid email, invalid video URL, unsupported file, oversized file, and missing certification are rejected before AWS writes.
  - Honeypot and bot-token failures are rejected before AWS writes.
  - Duplicate client submission IDs are handled predictably.
  - SES failure records `notification_failed` while returning accepted submission.
  - Admin unauthorized, invalid login, valid login, list, detail, no-file download, and signed download cases.
- `apps/cms-api/src/content.test.ts`
  - Editors/staff normalization, About link normalization if needed, submissions current-copy filtering, and route/content handling for In the Moment.

Build/typecheck:

- `npm run test:api`
- `npm run build:api`
- `npm run build:react`
- `npm run cdk:synth` after `npm run build:react` when infrastructure or routes change.

Manual:

- Public pages: `/`, `/about`, `/editors-staff`, `/submissions`, `/submissions/thank-you` if route-based, `/in-the-moment`, `/support-us`.
- Admin pages: login failure, login success, list, detail, download, expired/invalid session.
- Mobile widths: header menu behavior, home title fallback, admin list/detail wrapping, long links in About/content pages.

## Risks and Open Questions

- Final live notification recipients still need confirmation. Current default is `info@dancercitizen.org,editors@dancercitizen.org`.
- Bot-protection provider setup can block launch if the site key/secret is not available.
- Admin auth launch depends on provisioning a password hash and session secret outside source control.
- A single admin password is intentionally simple; rotate it if shared too broadly and upgrade to Cognito when multiple managed users are needed.
- DynamoDB `Scan` is acceptable for a small first admin list but should be paginated and monitored if submission volume grows.
- A live successful submission cannot be fully verified without AWS credentials/resources and will send/store real data.

## Deferred Work

- AWS Cognito admin auth.
- Per-user roles, audit trail, comments, assignments, status transitions, scoring, and CSV export.
- Search/filtering in the admin list beyond simple first-version ordering.
- Full WAF managed bot controls if CAPTCHA alone is insufficient.
- Automated browser tests for admin flows if the project later adds a browser test harness.

## Handoff

Recommended next step:

```text
Use aw-work docs/features/submissions-management/plan.md
```

Start with Unit 1 if the team wants visible editorial fixes first. Start with Units 2, 4, and 5 if launch security for submissions/admin is the priority.
