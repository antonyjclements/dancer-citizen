---
title: Deploy Production From Main
date: 2026-11-14
status: active
tags:
  - deployment
  - git
related_specs: []
supersedes: []
---

# Deploy Production From Main

## Context

The site and Prismic can change independently. Issue 21 had a listing date in Prismic before production had the corresponding filter. The filter was still in the local working tree.

## Decision

For each production release, commit and push all release changes, merge them into `main`, and deploy the merged revision. Verify production against the released behavior. The project owner confirmed this sequence during the Issue 21 release on November 14, 2026.

## Consequences

Production releases have a published source revision that operators can inspect and redeploy.

## Alternatives Considered

Deploying from the working tree can put production ahead of source control and leave future deployments without the same changes.

## Links

- `README.md#deployment`
