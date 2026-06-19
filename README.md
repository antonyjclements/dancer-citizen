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
npm run dev:react
```

The React app expects the CMS API at `/cms` by default. For local API development, set `VITE_CMS_API_BASE` to a reachable API URL or proxy.

## Checks

```bash
npm run test:api
npm run build:api
npm run build:react
npm run cdk:synth
npm run lint
```

`npm run cdk:synth` should be run after `npm run build:react` when you want the HTML-shell Lambda to embed the current Vite asset references.

## AWS Migration Architecture

The migration keeps the Next app as the source of truth while building a sibling delivery stack:

- CloudFront serves static React assets from S3.
- API Gateway routes `/cms/*` requests to the CMS Lambda.
- API Gateway routes document URLs such as `/articles/:uid`, `/issues/:uid`, `/contributors`, `/submissions`, and `/support-us` to an HTML-shell Lambda.
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

CDK outputs the CloudFront URL and CMS API URL after deployment.
