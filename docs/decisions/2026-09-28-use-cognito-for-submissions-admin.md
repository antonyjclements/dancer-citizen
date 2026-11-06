---
title: Use Cognito for Submissions Admin
date: 2026-09-28
status: active
tags:
  - submissions
  - admin
  - security
  - aws
related_specs:
  - docs/features/submissions-management/spec.md
supersedes:
  - docs/decisions/2026-07-10-use-simple-admin-auth-for-submissions.md
---

# Use Cognito for Submissions Admin

## Context

The owner requested an admin web application for browsing/searching submissions behind Cognito, with one shared account initially. The existing page and API already support reading submissions and private file downloads.

## Decision

Replace the environment-configured password/hash and custom signed session with a dedicated Cognito user pool and one shared editorial account. Disable self-registration. Reuse the site admin page, support Cognito's temporary-password challenge, and keep one-hour access tokens in HTTP-only cookies. Verify pool/client/token-use/signature/expiry and check Cognito account validity on protected requests. Logout clears the browser cookie without globally signing out other editors.

This supersedes only the authentication portion of the previous decision; public-form reCAPTCHA and private S3 downloads are unchanged.

## Consequences

- Credentials are provisioned through Cognito outside source control; the stack creates the shared username without an invitation or committed password.
- Deployment invalidates the previous custom sessions without changing stored submissions.
- Shared credentials do not provide individual editor attribution; individual accounts and roles remain deferred.
- Cognito availability is required for admin access, and rejected or revoked tokens cannot reach submission data.
- Search uses bounded scan continuation without a new search service or table migration; cost grows with submission volume.

## Alternatives Considered

Keep custom password auth: conflicts with the owner's Cognito requirement. Separate admin deployment and hosted login: unnecessary for the existing protected API/page boundary and shared account scope.

## Links

- `docs/features/submissions-management/spec.md`
- `docs/features/submissions-management/plan.md`
