---
title: Prismic Preview and Cache Revalidation
status: active
created: 2026-05-25
updated: 2026-06-19
tags:
  - prismic
  - preview
  - cache
related_decisions: []
related_standards:
  - docs/standards/prismic/use-shared-prismic-client.md
---

# Prismic Preview and Cache Revalidation

## Intent

Editors can preview Prismic content in the Next app and trigger tag-based cache revalidation when Prismic content changes.

## Users

- Editors previewing draft Prismic content.
- Prismic webhook delivery calling the revalidation endpoint.
- Developers maintaining CMS integration behavior.

## Current Behavior

- The shared Prismic client enables auto previews for all Next client instances.
- The root layout mounts `PrismicPreview` with the configured repository name.
- `GET /api/preview` creates the shared Prismic client and delegates preview URL resolution to `redirectToPreviewURL`.
- `GET /api/exit-preview` exits preview mode through Prismic's Next helper.
- Production Prismic fetches are tagged with `prismic` and use `force-cache`.
- Non-production Prismic fetches revalidate every 5 seconds.
- `POST /api/revalidate` calls `revalidateTag("prismic", "max")`.
- If `PRISMIC_WEBHOOK_SECRET` is set, the revalidate endpoint requires a matching `secret` query parameter.
- If `PRISMIC_WEBHOOK_SECRET` is not set, the revalidate endpoint accepts any POST request.
- The revalidate endpoint returns JSON with `{ revalidated: true, now: Date.now() }` after triggering revalidation.
- The AWS React/Lambda delivery path has separate preview endpoints at `/cms/preview/start` and `/cms/preview/exit`.
- `/cms/preview/start` accepts a Prismic preview token, sets an HTTP-only `dc_prismic_ref` cookie, and redirects to the resolved preview path.
- `/cms/preview/exit` clears the `dc_prismic_ref` cookie and redirects to `/`.
- CMS API and HTML-shell responses use `Cache-Control: no-store` when a preview cookie is present.

## Key Flows

### Preview Draft Content

1. Editor initiates preview from Prismic.
2. Prismic calls `/api/preview` with request context.
3. The route handler creates the shared Prismic client.
4. `redirectToPreviewURL` resolves the preview destination.
5. The app renders with `PrismicPreview` available in the root layout.

### Exit Preview

1. Editor visits `/api/exit-preview`.
2. The route handler calls `exitPreview()`.
3. Preview mode ends.

### Revalidate Published Content

1. Prismic webhook sends a POST request to `/api/revalidate`.
2. If configured, the route verifies `secret`.
3. The route invalidates the `prismic` cache tag using stale-while-revalidate semantics.
4. The route returns a JSON success payload.

### Preview Draft Content Through AWS Delivery

1. Editor initiates preview against the CloudFront-hosted React site.
2. Prismic calls `/cms/preview/start` with its preview token.
3. The CMS API sets the preview cookie and redirects to the target route.
4. The HTML-shell Lambda and `/cms/*` JSON endpoints use the cookie and disable response caching.
5. Editor exits preview through `/cms/preview/exit`.

## Acceptance Criteria

- Preview and exit-preview route handlers use Prismic's Next integration helpers.
- The root layout includes `PrismicPreview` for the configured repository.
- Production Prismic fetches share the `prismic` cache tag.
- The revalidation endpoint invalidates the same `prismic` tag used by production fetches.
- Invalid webhook secrets return a 401 JSON response.
- Valid or unprotected webhook requests return a JSON success response.
- AWS preview start sets an HTTP-only preview cookie.
- AWS preview and exit responses use `Cache-Control: no-store`.
- AWS preview exit clears the preview cookie.

## Boundaries and Non-Goals

- The revalidation endpoint does not validate webhook signatures beyond the optional shared secret query parameter.
- The revalidation endpoint does not inspect which Prismic document changed.
- The app does not currently use path-based revalidation.
- Preview behavior is delegated to Prismic helpers rather than custom preview routing logic.
- AWS delivery preview is implemented separately from Next draft mode and must be validated end to end after deployment.
- The AWS delivery path does not use Next tag revalidation because Prismic content is fetched through Lambda APIs at request time.
- The local Prismic login helper writes CLI auth state for Slice Machine; it is not a runtime preview feature.

## Open Questions / TODOs

- Should `PRISMIC_WEBHOOK_SECRET` be required in production?
- Should revalidation log webhook events or rejected attempts?
- Should document-specific changes ever revalidate narrower tags or paths?
- Should preview behavior have an end-to-end smoke test?
- Should the AWS preview cookie store the raw preview token or a resolved Prismic ref after real Prismic preview testing?

## Decision Links

- None yet.
