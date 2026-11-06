---
title: Use Isolated Staging for Prismic Previews
date: 2026-11-05
status: active
tags:
  - aws
  - staging
  - prismic
related_specs:
  - docs/features/aws-react-lambda-delivery/spec.md
  - docs/features/prismic-preview-and-cache-revalidation/spec.md
supersedes: []
---

# Use Isolated Staging for Prismic Previews

## Context

Editors need to inspect unpublished content on a deployed copy of the public site. The React/Lambda delivery path already accepts Prismic preview tokens and forwards preview cookies, but the infrastructure had only one stack identity and inherited production notification settings.

## Decision

Use a separate `DancerCitizenStagingStack` at `staging.dancercitizen.org`, reading the same Prismic repository. Preserve the production stack identity and default deployment selection. Build staging into its own output directory, disable submission writes and email subscriptions, exclude production admin credentials, show a staging banner, and send noindex directives. Register `/cms/preview/start` as the staging preview route in Prismic.

The user approved this design in the staging-site conversation on 2026-11-05. Store non-secret hostname, existing certificate, and DNS-zone defaults in the staging CDK context so normal redeploys retain domain wiring.

## Consequences

- Staging deploys and caches content independently; draft sessions stay scoped to the staging hostname.
- Content edits use request-time preview queries and require no new code deployment.
- The publicly reachable staging site has its own AWS resources and associated usage costs. Noindex discourages search indexing and is not authentication.
- A real saved-draft check remains necessary after Prismic preview registration. Unit tests alone do not validate that external integration.

## Alternatives Considered

- Previewing solely on production would reuse the deployment but would not provide a separate place to validate code and content together.
- A separate Prismic repository would isolate content edits but add synchronization and schema-maintenance work that the editorial preview need does not require.

## Links

- `docs/features/aws-react-lambda-delivery/plan.md`
- `docs/features/aws-react-lambda-delivery/spec.md`
- `docs/features/prismic-preview-and-cache-revalidation/spec.md`
