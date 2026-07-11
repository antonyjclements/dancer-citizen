---
title: Do Not Inject Editor Role Labels
date: 2026-07-10
status: active
tags:
  - public-site
  - editors
  - prismic
related_specs:
  - docs/features/public-journal-experience/spec.md
supersedes: []
---

# Do Not Inject Editor Role Labels

## Context

The Editors / Staff page needs custom ordering for Jane Alexandre, Julie B. Johnson, Erica Moshman, and Emily Metzner, plus editorial grouping for past editors and Moving the Map contributors. During review, the CMS API normalization briefly injected `role` values for Jane and Julie to satisfy an outdated test expectation.

The user clarified that the role-label injection was not desired and that tests should not expect injected roles.

## Decision

The CMS API may normalize Editors / Staff ordering and may mark Jane Alexandre with `inMemoriam`, but it must not synthesize `role` labels such as "Founding Editor" or "Co-Founding Editor" for BiographyList items.

If role text should appear publicly, it should come from Prismic content or a future explicit content-model decision, not from hidden CMS API enrichment.

## Consequences

- Tests should verify editor ordering, section grouping, and Jane Alexandre's `In Memoriam` marker.
- Tests should not assert injected `role` values for Jane Alexandre or Julie B. Johnson.
- React rendering can continue displaying `item.role` when the API/content provides it, but the Editors / Staff normalizer should not create it.

## Alternatives Considered

- Inject role labels in the CMS API for the known editors. Rejected because it hides editorial text in code and contradicted the user's correction.
- Remove all Editors / Staff normalization and rely entirely on Prismic order. Rejected because the page still needs deterministic grouping and top ordering.

## Links

- docs/features/public-journal-experience/spec.md
- apps/cms-api/src/content.ts
- apps/cms-api/src/content.test.ts
