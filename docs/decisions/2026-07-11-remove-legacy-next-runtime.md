---
title: Remove Legacy Next Runtime
date: 2026-07-11
status: active
tags:
  - aws
  - architecture
  - react
  - public-site
related_specs:
  - docs/features/aws-react-lambda-delivery/spec.md
  - docs/features/public-journal-experience/spec.md
  - docs/features/site-shell-and-navigation/spec.md
  - docs/features/prismic-preview-and-cache-revalidation/spec.md
supersedes:
  - docs/decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md
---

# Remove Legacy Next Runtime

## Context

The React/Lambda delivery path had been built alongside the original Next.js site. The prior decision kept Next as the source of truth until the React/CMS path passed enough parity checks.

The team has now chosen to remove the legacy Next runtime and maintain only the React app, CMS API, and AWS infrastructure.

## Decision

Remove the legacy Next application, its runtime configuration, Next-specific Prismic/Slice Machine component wiring, and root package scripts/dependencies.

The maintained delivery path is now:

- `apps/react-site` for the public React app.
- `apps/cms-api` for Prismic reads, preview handling, normalization, submissions, admin APIs, and metadata lookup.
- `infra` for S3, CloudFront, API Gateway, Lambda, and deployment wiring.

## Consequences

- Root `npm run dev` starts the React/CMS local development stack instead of Next.
- Root `npm run build` builds the React app and CMS API instead of running `next build`.
- The CMS API is the canonical Prismic data and metadata boundary.
- React slice rendering is the canonical public rendering implementation.
- Next preview, tag revalidation, and Slice Machine component runtime documentation is obsolete.

## Alternatives Considered

- Keep Next in the repository as a dormant fallback. This would leave stale dependencies, scripts, docs, and duplicated route behavior for future agents to maintain.
- Keep only the Next source files while disabling package scripts. This would still preserve a confusing second implementation with no active verification path.

## Links

- docs/features/aws-react-lambda-delivery/spec.md
- docs/features/public-journal-experience/spec.md
- docs/features/site-shell-and-navigation/spec.md
- docs/features/prismic-preview-and-cache-revalidation/spec.md
