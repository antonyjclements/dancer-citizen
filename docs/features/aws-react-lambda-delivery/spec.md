---
title: AWS React Lambda Delivery
status: active
created: 2026-06-19
updated: 2026-07-11
tags:
  - aws
  - deployment
  - prismic
  - public-site
related_decisions:
  - docs/decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md
  - docs/decisions/2026-07-11-remove-legacy-next-runtime.md
related_standards:
  - docs/standards/prismic/centralize-prismic-document-url-rules.md
  - docs/standards/prismic/normalize-prismic-documents-at-data-boundary.md
  - docs/standards/prismic/use-shared-prismic-client.md
---

# AWS React Lambda Delivery

## Intent

The site is delivered as a low-cost AWS-native public experience: a Vite/React frontend hosted on S3 and CloudFront, backed by Lambda APIs that fetch and normalize Prismic content at request time.

## Users

- Readers using the public CloudFront-hosted site.
- Readers and social crawlers opening article, issue, and content URLs directly.
- Editors previewing draft Prismic content before publication.
- Developers deploying and validating the AWS delivery stack.

## Current Behavior

- `apps/react-site` contains the Vite/React public app and preserves public routes for home, issues, articles, and content pages.
- `apps/react-site` defaults to `/cms` for API requests and can use `VITE_CMS_API_BASE` for a deployed or proxied API.
- `apps/cms-api` contains Lambda handlers for normalized JSON CMS responses, route-specific HTML shells, preview cookies, and metadata lookup.
- `apps/cms-api` owns the AWS-delivered Prismic data boundary: issue ordering, linked table-of-contents order, article previous/next navigation, page-specific normalizations, media alt fallback data, and metadata extraction.
- `infra` contains the CDK stack for S3, CloudFront, API Gateway HTTP API, Lambda functions, CloudFront origin access control, cache behavior, and static asset deployment.
- The CMS API exposes `/cms/home`, `/cms/issues/:uid`, `/cms/articles/:uid`, `/cms/pages/:uid`, `/cms/meta?path=...`, `/cms/preview/start`, and `/cms/preview/exit`.
- The HTML-shell Lambda injects route-specific title, description, canonical, Open Graph, and Twitter tags before returning the React app shell.
- CDK embeds the current built Vite `index.html` into the HTML-shell Lambda at synth/deploy time so document-route HTML points at the current hashed static assets.
- CloudFront serves static asset requests from S3, routes `/cms/*` to the CMS API Lambda, and routes public document URLs for articles, issues, and configured top-level content pages to the HTML-shell Lambda.
- CloudFront routes legacy issue paths shaped like `/issue-13/` and `/issue-13/akari-komura/` to the HTML-shell Lambda, which returns permanent redirects to `/issues/issue-13` and `/articles/issue-13--akari-komura`.
- The S3 origin is private and readable by CloudFront through origin access control.
- Prismic preview stores the preview token in an HTTP-only cookie and sends preview responses with `Cache-Control: no-store`.
- The root package scripts include `dev:react`, `build:react`, `build:api`, `test:api`, and `cdk:synth`.

## Key Flows

### Read the AWS React Site

1. Reader opens the CloudFront URL.
2. CloudFront serves React static assets from S3.
3. The React app requests normalized page data from `/cms/*`.
4. The CMS Lambda fetches Prismic content, normalizes it, and returns stable JSON.
5. The React app renders the route client-side.

### Share or Crawl a Document URL

1. Reader, crawler, or unfurler requests `/articles/:uid`, `/issues/:uid`, or a configured content page.
2. CloudFront routes the request to the HTML-shell Lambda.
3. The Lambda resolves metadata from Prismic through the same normalization layer.
4. The Lambda returns an HTML shell with route-specific canonical, Open Graph, and Twitter tags plus the React app assets.

### Preview Draft Content

1. Editor starts Prismic preview through `/cms/preview/start`.
2. The CMS API sets an HTTP-only preview cookie and redirects to the resolved preview path.
3. CMS and HTML-shell responses use the preview cookie and return `Cache-Control: no-store`.
4. `/cms/preview/exit` clears the preview cookie and redirects to `/`.

### Deploy the AWS Stack

1. Developer builds the React app with `npm run build:react`.
2. Developer typechecks the CMS API with `npm run build:api`.
3. Developer runs `npm run cdk:synth` or `npm run deploy -w @dancer-citizen/infra`.
4. CDK bundles Lambda handlers, deploys static assets to S3, and outputs the CloudFront and CMS API URLs.

## Acceptance Criteria

- React app builds independently with Vite.
- CMS API typechecks and has unit coverage for issue ordering, linked table-of-contents order, page normalization, and image alt fallback behavior.
- CDK synth provisions S3, CloudFront, API Gateway HTTP API, CMS Lambda, HTML-shell Lambda, and bucket deployment.
- Article and issue document URLs route through the HTML-shell Lambda so social metadata is not generic SPA metadata.
- Legacy issue and issue-article URLs return permanent redirects to the current React route shape before metadata lookup or client rendering.
- Static asset routes are served from S3/CloudFront and `/cms/*` routes are served by the API Lambda.
- CMS API preview responses and HTML-shell preview responses are not cached when a preview cookie is present.
- Generated React `dist` output and CDK `cdk.out` output are ignored by repo lint/source control.

## Boundaries and Non-Goals

- The legacy Next runtime has been removed; React/CMS/infra are the maintained delivery path.
- The first target after cutover remains behavioral continuity, not redesign.
- Custom domain and certificate wiring are not yet parameterized in CDK.
- Local React development needs a reachable CMS API base URL or proxy.
- The CDK stack does not yet configure Prismic webhooks, Route 53 aliases, ACM certificates, or production/staging context presets.
- The stack does not deploy automatically from CI.

## Open Questions / TODOs

- Should the CDK stack accept hosted zone, certificate, and alternate domain names through context values?
- Should the preview token be exchanged for a Prismic ref instead of stored directly when Prismic preview behavior is validated end to end?
- Should shared rendering code be extracted between the CMS normalization layer and React renderer as the app grows?
- Which deployed staging URL should Prismic use for draft preview?

## Decision Links

- [Use React and Lambda BFF for AWS Delivery](../../decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md)
