---
title: Prismic Preview and Cache Behavior
status: active
created: 2026-05-25
updated: 2026-11-05
tags:
  - prismic
  - preview
  - cache
related_decisions:
  - docs/decisions/2026-11-05-use-isolated-staging-for-prismic-previews.md
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

### PREV-001 — Preview session boundaries

- Missing preview tokens return 400 without setting a cookie; failed preview resolution returns a useful 400 rather than silently redirecting to published content.
- Preview redirects stay within the site, including rejecting protocol-relative destinations.
- Preview start/exit and preview JSON/HTML responses remain `no-store`.
- A preview cookie is scoped to its hostname; staging preview sessions do not enable production previews.
- Prismic's staging preview registration uses the staging origin and `/cms/preview/start`. A saved draft and linked page must be checked on the deployed site.

## Boundaries and Non-Goals

- The app does not currently implement Prismic webhook-driven invalidation.
- Preview behavior must be validated end to end after deployment.
- The delivery path does not use tag revalidation because Prismic content is fetched through Lambda APIs at request time.

## Open Questions / TODOs

- Complete the deployed saved-draft smoke test after configuring the staging preview registration.

## Decision Links

- None yet.
