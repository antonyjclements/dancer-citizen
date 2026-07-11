---
title: Prismic Preview and Cache Behavior
status: active
created: 2026-05-25
updated: 2026-07-11
tags:
  - prismic
  - preview
  - cache
related_decisions:
  - docs/decisions/2026-07-11-remove-legacy-next-runtime.md
related_standards:
  - docs/standards/prismic/use-shared-prismic-client.md
---

# Prismic Preview and Cache Behavior

## Intent

Editors can preview Prismic content through the React/CMS delivery path while preview responses avoid CDN/browser caching.

## Users

- Editors previewing draft Prismic content.
- Developers maintaining CMS integration behavior.

## Current Behavior

- The React/Lambda delivery path has preview endpoints at `/cms/preview/start` and `/cms/preview/exit`.
- `/cms/preview/start` accepts a Prismic preview token, sets an HTTP-only `dc_prismic_ref` cookie, and redirects to the resolved preview path.
- `/cms/preview/exit` clears the `dc_prismic_ref` cookie and redirects to `/`.
- CMS API and HTML-shell responses use `Cache-Control: no-store` when a preview cookie is present.
- The delivery path does not use framework-level tag revalidation because Prismic content is fetched through Lambda APIs at request time.

## Key Flows

### Preview Draft Content

1. Editor initiates preview from Prismic.
2. Prismic calls `/cms/preview/start` with its preview token.
3. The CMS API resolves the preview destination, sets the preview cookie, and redirects to the target route.
4. The HTML-shell Lambda and `/cms/*` JSON endpoints use the cookie and disable response caching.

### Exit Preview

1. Editor visits `/cms/preview/exit`.
2. The CMS API clears the preview cookie.
3. The editor is redirected to `/`.

## Acceptance Criteria

- Preview start sets an HTTP-only preview cookie.
- Preview and exit responses use `Cache-Control: no-store`.
- Preview exit clears the preview cookie.
- HTML-shell preview responses use the preview cookie when resolving route metadata.
- CMS JSON preview responses use the preview cookie when fetching normalized content.

## Boundaries and Non-Goals

- The app does not currently implement Prismic webhook-driven invalidation.
- Preview behavior must be validated end to end after deployment.
- The delivery path does not use tag revalidation because Prismic content is fetched through Lambda APIs at request time.

## Open Questions / TODOs

- Should preview behavior have an end-to-end smoke test?
- Should the preview cookie store the raw preview token or a resolved Prismic ref after real Prismic preview testing?

## Decision Links

- None yet.
