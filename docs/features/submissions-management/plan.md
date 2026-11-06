---
status: completed
created: 2026-09-28
origin: docs/features/submissions-management/spec.md
depth: deep
---

# Cognito Submissions Admin

## Scope and Decisions

Extend the existing `/admin/submissions` application with Cognito authentication and search. Use one shared `editor` account in a dedicated pool with self-registration disabled. Keep credentials and tokens out of JavaScript storage and source control. Use the existing login form with Cognito password authentication and support the first-login new-password challenge. Issue a one-hour HTTP-only cookie containing the access token; verify issuer, client, token use, signature and expiry and check Cognito user validity on every protected request. Logout clears this browser's cookie; it must not globally sign out other editors sharing the account.

Search is case-insensitive literal matching across name, email, title and abstract. Scan at most 100 records per request and return an opaque continuation cursor even for empty matching pages. The UI offers continuation until the search is complete. Sort accumulated results newest first; DynamoDB scan does not guarantee global chronological pages. Avoid a table migration or search service at this scale.

## Requirements and Implementation Units

1. Authentication and infrastructure: replace custom password/signature code in `apps/cms-api/src/admin.ts`; add a dedicated retained Cognito pool, app client and shared user in `infra/lib/dancer-citizen-web-stack.ts`. Return generic invalid-credential errors, handle Cognito throttling and first-password challenge, reject malformed inputs before AWS calls. Authenticate list/detail/download before data access. Permit JSON same-origin login/logout requests only. Configure pool/client in Lambda. No passwords in CDK or deployment output.
2. Search API: add validated `q` and `cursor` parameters in `apps/cms-api/src/admin.ts`, preserve private file metadata boundaries and no-store responses. Cursor only accepts this table's string partition key. Return `nextCursor` and filter each bounded scan in application code for case-insensitive matching.
3. UI: update `apps/react-site/src/api.ts` and `pages/AdminSubmissionsPage.tsx` with search, continuation, count, clear empty/error states, session-expiry handling, logout and first-password challenge. Prevent stale list/detail requests from exposing previous selections or reappearing after logout. Preserve keyboard labels, shared loading skeletons, mobile wrapping and safe external links.
4. Operations/docs: update README and spec; record the decision superseding simple admin auth. Provision the shared user without sending an invitation; an operator sets a temporary password through Cognito outside source control. No live deployment or real data mutation as part of local verification.

## Standards

- `docs/standards/aws/build-react-before-cdk-synth.md`
- `docs/standards/react/keep-react-pages-on-cms-api-boundary.md`
- `docs/standards/frontend/prevent-mobile-content-overflow.md`
- `docs/standards/react/use-skeletons-for-content-loading.md`
- `docs/standards/prismic/keep-preview-and-cache-rules-explicit.md`
- `docs/standards/workflow/use-fast-reliable-verification.md`

## Acceptance-First Verification

`apps/cms-api/src/admin.test.ts`: successful login and cookie flags; invalid credentials; new-password challenge and completion; malformed JSON; foreign-origin/form login; rejected/expired/wrong-pool tokens; disabled user; protected list/detail/download; logout; search each field case-insensitively; empty matching page with continuation; cursor round-trip/invalid cursor; safe metadata and missing files.

`apps/cms-api/src/admin-infra.test.ts`: CDK assertions for pool registration, app client/password flow/token TTL, suppressed shared-user invitation, configuration and private storage. React build must precede synthesis. Run full API tests, API/React builds, infra typecheck and synth. Inspect desktop/mobile UI with mock data when browser tooling permits. A real Cognito first-login and signed-download smoke test is required after deployment and initial password setup.

## Rollout and Risks

Deployment invalidates old custom sessions. Existing submission records and files are unchanged. Cognito is a dependency on every admin request and failures must not grant access. Shared credentials cannot attribute actions to individual editors. Search cost scales with table size; continue until no cursor remains before describing results as complete. Later move to indexed search if volume warrants it.

The user authorized Cognito and a shared account. No product questions block implementation. Review this plan against authorization boundaries, bounded pagination and acceptance coverage before implementation. No configured human reviewers. Deploy/account password setup remains an explicit operational follow-up.

## Deferred

Roles, assignments, status editing, CSV export, a separate admin hostname and self-service password recovery.

## Verification Result

Acceptance-first checks passed: 65 API/infrastructure tests, API/React builds, infra typecheck, scoped ESLint and diff whitespace check. CDK synthesis passed with `npm run synth -w @dancer-citizen/infra -- --app 'node --import tsx bin/app.ts' --quiet`; the normal tsx CLI was blocked by sandbox IPC permissions. Browser checks used fictional local data and covered invalid login, first-password challenge, login, details, empty search batches, continuation, logout and a 390px viewport with long URLs and no horizontal overflow. Live Cognito and S3 smoke checks await deployment/password setup.

Sequential document/code review covered security, API contracts, frontend races, bounded database access, tests, standards and deployment. Fixed CloudFront's global 403-to-HTML interaction by using 400/409 for login validation/setup failures; fixed nested main landmarks in embedded loading states. No unresolved implementation findings. Human review was not requested; the owner explicitly selected Cognito/shared credentials and no reviewers are configured. README updated for account setup and operating behavior. Capture decision: `docs/decisions/2026-09-28-use-cognito-for-submissions-admin.md`. No commit, push or deployment performed. Pre-existing root package script and `.aw/` content preserved.
