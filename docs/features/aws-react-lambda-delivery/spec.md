---
title: AWS React Lambda Delivery
status: active
created: 2026-06-19
updated: 2026-11-05
tags:
  - aws
  - deployment
  - prismic
  - public-site
related_decisions:
  - docs/decisions/2026-11-05-use-isolated-staging-for-prismic-previews.md
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
- Staging uses a separate `DancerCitizenStagingStack` and a staging-mode React build in `apps/react-site/dist-staging`; the default production stack remains `DancerCitizenWebStack`.
- Staging reads the same Prismic repository, shows a staging banner with an exit-preview link, and rejects submission writes. Its SNS topic has no editorial email subscriptions and it does not inherit production admin credentials.
- Staging can use its CloudFront URL or a configured custom hostname, existing ACM certificate, and optional Route 53 alias records.
- Staging serves `X-Robots-Tag: noindex, nofollow` on every CloudFront behavior and includes a robots meta tag in its HTML. This discourages indexing; staging is not password protected.

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

### STAGE-001 — Separate staging deployment

- Selecting staging creates only `DancerCitizenStagingStack`, with separate buckets, APIs, functions, table, distribution, and topic. Default commands continue selecting only the existing production stack.
- Invalid environment names and incomplete domain/certificate/DNS configuration fail before deployment.
- Staging ignores production `SITE_URL`, admin secrets, reCAPTCHA settings, and email recipients.

### STAGE-002 — Staging content preview

- Staging reads the `dancercitizen` Prismic repository and uses same-origin `/cms` requests with preview cookies.
- The staging build has a visible banner and `/cms/preview/exit` link on every page; production has neither the banner nor staging robots tags.
- Production and staging builds use separate output directories; staging synth requires a built staging shell.

### STAGE-003 — Staging side effects

- Staging submission POSTs return an explanatory 405 with `Allow: OPTIONS` and `no-store` before accessing submission storage or notifications. Using 405 avoids CloudFront's existing 403 SPA fallback.
- The staging form disables submission and explains why; the stack creates no SNS email subscriptions.

### STAGE-004 — Staging indexing and domain

- Every staging CloudFront behavior includes an overriding `X-Robots-Tag: noindex, nofollow` policy, including static assets and `/cms/*`.
- An optional custom domain requires an existing ACM certificate in `us-east-1`. Optional Route 53 A/AAAA records point only the supplied staging hostname at the staging distribution.
- Environment configuration does not attach staging aliases or robots policies to production.

### STAGE-005 — Staging rollout verification

- Build, API tests, infrastructure tests, lint, and staging synth pass before deployment.
- Inspect the staging template/change set before deploying only the staging stack; verify DNS, HTTPS, asset loading, robots headers, preview start/exit, and disabled submissions afterward.
- Validate a real saved Prismic draft, linked content/navigation, and an independent published-content session before declaring editorial preview fully verified.

## Boundaries and Non-Goals

- The legacy Next runtime has been removed; React/CMS/infra are the maintained delivery path.
- The first target after cutover remains behavioral continuity, not redesign.
- Local React development needs a reachable CMS API base URL or proxy.
- Prismic preview registration is an external repository setting; creating a staging stack does not register it automatically.
- Staging uses an existing ACM certificate; new certificate issuance and production custom-domain migration are outside this change.
- Staging does not support submission testing or inherit production admin sessions.
- The CDK stack does not configure Prismic webhooks.
- The stack does not deploy automatically from CI.

## Open Questions / TODOs

- Should shared rendering code be extracted between the CMS normalization layer and React renderer as the app grows?
- Should staging require an editor login in a later release?

## Decision Links

- [Use React and Lambda BFF for AWS Delivery](../../decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md)
