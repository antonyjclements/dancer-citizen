---
title: Use React and Lambda BFF for AWS Delivery
date: 2026-06-19
status: active
tags:
  - aws
  - architecture
  - prismic
  - public-site
related_specs:
  - docs/features/aws-react-lambda-delivery/spec.md
supersedes: []
---

# Use React and Lambda BFF for AWS Delivery

## Context

The current public site is a runtime Next.js application backed by Prismic. For a lower-cost AWS deployment, the team considered keeping a full Next runtime, using S3 and CloudFront only for preview/static delivery, or moving to a static React app with Lambda APIs that read Prismic on demand.

The chosen approach needs to keep CMS updates visible without rebuilding the frontend for every content edit, preserve article and issue routes, support route-specific social metadata, and keep Prismic preview available during migration.

## Decision

Build the AWS migration as a sibling Vite/React site hosted by S3 and CloudFront, with an API Gateway HTTP API and Lambda BFF responsible for Prismic reads, preview handling, content normalization, and metadata lookup.

CloudFront routes static assets to S3, `/cms/*` requests to the CMS API Lambda, and public document routes to an HTML-shell Lambda that injects route-specific title, canonical, Open Graph, and Twitter metadata before serving the React shell.

The existing Next.js implementation remains the source of truth until the React/Lambda version passes parity checks.

## Consequences

- CMS content can be fetched at request time through Lambda APIs, so normal Prismic edits do not require rebuilding and redeploying the React app.
- The Prismic normalization boundary moves behind the BFF, which keeps frontend route components simpler and gives both JSON APIs and metadata rendering one shared content contract.
- Social sharing remains compatible with crawler expectations because document routes return metadata-bearing HTML instead of generic SPA markup.
- The deployment model uses low-cost AWS primitives, but adds responsibility for Lambda/API cache headers, preview cookies, and HTML-shell routing.
- The migration can be validated side by side with the current Next site before any production cutover.

## Alternatives Considered

- Continue deploying the full Next.js runtime on AWS. This keeps server rendering in one framework but carries higher runtime cost and operational weight for this site.
- Use S3 and CloudFront only for preview/static content while leaving the public site on Next.js. This reduces only part of the cost and does not solve the desired low-cost public delivery path.
- Build a pure static React site with Prismic data baked at build time. This is simple to host, but requires rebuilds for routine CMS changes and complicates draft preview.
- Use a React SPA without a metadata shell. This is cheaper and simpler, but would regress article-specific Open Graph and Twitter sharing.

## Links

- docs/features/aws-react-lambda-delivery/spec.md
