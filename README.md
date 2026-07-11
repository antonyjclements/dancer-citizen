# Dancer Citizen Site

This repository contains the current Next.js implementation of The Dancer-Citizen site and a sibling AWS-native migration path.

## Apps

- `src/` is the existing Next.js public site.
- `apps/react-site` is a Vite/React single-page app intended for S3 + CloudFront hosting.
- `apps/cms-api` is a Lambda backend-for-frontend that reads Prismic and returns normalized page JSON.
- `infra` is the AWS CDK app that provisions S3, CloudFront, API Gateway HTTP API, Lambda functions, and static asset deployment.

## Local Development

Install dependencies:

```bash
npm install
```

Run the existing Next site:

```bash
npm run dev
```

Run the React migration app:

```bash
npm run site
```

This starts the CMS API and React app in one terminal with colored log prefixes. The CMS API dev server listens on `http://127.0.0.1:8787`, and Vite proxies `/cms/*` there by default. The React site opens at the Vite URL, usually `http://127.0.0.1:5173`.

The CMS API reads Prismic directly. `PRISMIC_REPOSITORY_NAME` defaults to `dancercitizen`, so no local environment variable is required for the default repository.

The Submissions page posts multipart form data to `/cms/submissions`. In AWS, submissions are written to DynamoDB, uploaded files are stored in S3, and notification emails are sent through SES to `info@dancercitizen.org` and `editors@dancercitizen.org`. The form accepts PDF, DOC, DOCX, RTF, and TXT attachments. The API includes a honeypot field, API Gateway throttling, and reCAPTCHA verification to reduce automated spam.

Local successful submission testing requires AWS credentials plus the deployed resource environment variables. For local form work without reCAPTCHA keys, run the CMS API with `SUBMISSION_RECAPTCHA_DISABLED=true`; do not use that setting in production.

Admin users can review submissions at `/admin/submissions`. The first admin release uses one environment-configured admin username/password hash and an HTTP-only signed session cookie. File downloads remain private: the admin API verifies the session, reads the DynamoDB record, and returns a short-lived signed S3 download URL. For local HTTP testing, set `SUBMISSIONS_ADMIN_COOKIE_SECURE=false`; production should leave secure cookies enabled.

## Checks

```bash
npm run test:api
npm run build:api
npm run build:react
npm run cdk:synth
npm run lint
```

`npm run cdk:synth` should be run after `npm run build:react` when you want the HTML-shell Lambda to embed the current Vite asset references.

## Agentic Workflow

This repo uses Agentic Workflow for specs, planning, review, capture, and shipping gates. Start with `AGENTS.md` for task routing, and see `docs/workflow/README.md` plus `docs/workflow/gates.md` for the configured workflow steps, freshness gates, telemetry, and org-knowledge settings.

## AWS Migration Architecture

The migration keeps the Next app as the source of truth while building a sibling delivery stack:

- CloudFront serves static React assets from S3.
- API Gateway routes `/cms/*` requests to the CMS Lambda.
- API Gateway routes document URLs such as `/articles/:uid`, `/issues/:uid`, `/admin`, `/contributors`, `/editors-staff`, `/in-the-moment`, `/submissions`, and `/support-us` to an HTML-shell Lambda.
- The HTML-shell Lambda injects route-specific title, description, canonical, Open Graph, and Twitter tags, then returns the React app shell.
- The CMS Lambda fetches Prismic content at request time and normalizes issue ordering, article navigation, works cited, references, media data, and page-specific content fixes.
- Prismic preview uses an HTTP-only preview cookie and disables caching for preview responses.

## Deployment

Build the React app and synthesize/deploy the CDK stack:

```bash
npm run build:react
npm run build:api
npm run cdk:synth
npm run deploy -w @dancer-citizen/infra
```

Optional environment variables:

- `SITE_URL`: public site origin used for canonical and CORS values. Defaults to `https://dancercitizen.org`.
- `PRISMIC_REPOSITORY_NAME`: defaults to `dancercitizen` in the Lambda code.
- `SUBMISSION_EMAIL_FROM`: SES sender address for submission notifications. Defaults to `info@dancercitizen.org`; this identity must be verified in SES.
- `SUBMISSION_EMAIL_TO`: comma-separated notification recipients. Defaults to `info@dancercitizen.org,editors@dancercitizen.org`.
- `SUBMISSION_RECAPTCHA_SECRET`: reCAPTCHA secret key used by the CMS API to verify submission tokens.
- `SUBMISSION_RECAPTCHA_ACTION`: expected reCAPTCHA v3 action. Defaults to `submission`.
- `SUBMISSION_RECAPTCHA_MIN_SCORE`: minimum accepted reCAPTCHA v3 score. Defaults to `0.5`.
- `VITE_RECAPTCHA_SITE_KEY`: reCAPTCHA site key used by the React submission form at build time.
- `VITE_RECAPTCHA_ACTION`: reCAPTCHA v3 action used by the React submission form at build time. Defaults to `submission`.
- `SUBMISSIONS_ADMIN_USERNAME`: admin username for `/admin/submissions`.
- `SUBMISSIONS_ADMIN_PASSWORD_HASH`: SHA-256 admin password hash in `sha256:<hex>` format. Generate one locally with `node -e "const {createHash}=require('node:crypto'); console.log('sha256:'+createHash('sha256').update(process.argv[1]).digest('hex'))" 'your-password'`.
- `SUBMISSIONS_ADMIN_SESSION_SECRET`: random secret used to sign admin session cookies.
- `SUBMISSIONS_ADMIN_COOKIE_SECURE`: defaults to `true`; set to `false` only for local HTTP testing.
- `SUBMISSIONS_ADMIN_SESSION_TTL_SECONDS`: optional admin session lifetime. Defaults to 8 hours.
- `SUBMISSION_DOWNLOAD_URL_TTL_SECONDS`: optional signed S3 download URL lifetime. Defaults to 5 minutes.

CDK outputs the CloudFront URL, CMS API URL, submission files bucket, and submissions table after deployment.
