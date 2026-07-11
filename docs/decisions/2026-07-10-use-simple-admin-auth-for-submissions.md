---
title: Use Simple Admin Auth for Submissions
date: 2026-07-10
status: active
tags:
  - submissions
  - admin
  - security
  - aws
related_specs:
  - docs/features/submissions-management/spec.md
supersedes: []
---

# Use Simple Admin Auth for Submissions

## Context

The submissions workflow needs an admin page where editors can view submitted metadata and download attached files. The team considered a full managed identity provider, but the first release is intended for a small editorial workflow and should avoid unnecessary launch complexity.

## Decision

Use a single environment-configured admin username and password hash for the first admin release. Admin login creates a short-lived HMAC-signed session token stored in an HTTP-only, `Secure`, `SameSite=Lax` cookie. Attached files stay private in S3 and are downloaded through authenticated API requests that return short-lived signed S3 URLs.

Use reCAPTCHA v3 as the first stronger bot-protection provider for public submissions, with the backend verifying token success, expected action, and minimum score before DynamoDB, S3, or SES side effects.

## Consequences

- The first admin release can ship without Cognito user-pool setup, password-reset flows, or role design.
- Production deploys must provide admin username, password hash, session secret, and reCAPTCHA keys outside source control.
- Admin access is intentionally simple and should be upgraded when multiple managed users, password resets, roles, or audit trails become necessary.
- Download URLs can expire quickly while keeping the submission files bucket private.

## Alternatives Considered

- AWS Cognito. More scalable for managed users and future roles, but heavier than needed for the first editorial admin tool.
- Edge/basic auth. Simpler page gating, but less useful for API authorization and signed download flows.
- Honeypot-only submissions protection. Already present as a layer, but insufficient as the stronger pre-launch bot-protection control.

## Links

- `docs/features/submissions-management/spec.md`
- `docs/features/submissions-management/plan.md`
