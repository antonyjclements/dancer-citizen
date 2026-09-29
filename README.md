# Dancer Citizen Site

This repository contains the React/CMS API implementation of The Dancer-Citizen site and the AWS infrastructure used to deliver it.

## Apps

- `apps/react-site` is the Vite/React public site hosted from S3 through CloudFront.
- `apps/cms-api` is a Lambda backend-for-frontend that reads Prismic and returns normalized page JSON.
- `infra` is the AWS CDK app that provisions S3, CloudFront, API Gateway HTTP API, Lambda functions, and static asset deployment.

## Local Development

Install dependencies:

```bash
npm install
```

Run the local site:

```bash
npm run site
```

This starts the CMS API and React app in one terminal with colored log prefixes. The CMS API dev server listens on `http://127.0.0.1:8787`, and Vite proxies `/cms/*` there by default. The React site opens at the Vite URL, usually `http://127.0.0.1:5173`.

The CMS API reads Prismic directly. `PRISMIC_REPOSITORY_NAME` defaults to `dancercitizen`, so no local environment variable is required for the default repository.

The Submissions page posts multipart form data to `/cms/submissions`. In AWS, submissions are written to DynamoDB, uploaded files are stored in S3, and notification emails are sent through SNS to `info@dancercitizen.org` and `editors@dancercitizen.org`. The form accepts PDF, DOC, DOCX, RTF, and TXT attachments. The API includes a honeypot field, API Gateway throttling, and reCAPTCHA verification to reduce automated spam.

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

## AWS Architecture

- CloudFront serves static React assets from S3.
- API Gateway routes `/cms/*` requests to the CMS Lambda.
- API Gateway routes document URLs such as `/articles/:uid`, `/issues/:uid`, `/admin`, `/contributors`, `/editors-staff`, `/in-the-moment`, `/submissions`, and `/support-us` to an HTML-shell Lambda.
- The HTML-shell Lambda injects route-specific title, description, canonical, Open Graph, and Twitter tags, then returns the React app shell.
- The CMS Lambda fetches Prismic content at request time and normalizes issue ordering, article navigation, works cited, references, media data, and page-specific content fixes.
- Prismic preview uses an HTTP-only preview cookie and disables caching for preview responses.
- Legacy issue URLs such as `/issue-13/` and `/issue-13/akari-komura/` redirect to the current `/issues/issue-13` and `/articles/issue-13--akari-komura` route shape.

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
- `SUBMISSION_NOTIFICATION_TOPIC_ARN`: required by the API to publish notifications; CDK supplies this automatically. For local API testing against AWS, set it to the deployed topic ARN.
- `SUBMISSION_EMAIL_TO`: comma-separated SNS email subscribers, read by CDK at deployment time. Defaults to `info@dancercitizen.org,editors@dancercitizen.org`.
- `SUBMISSION_RECAPTCHA_SECRET`: reCAPTCHA secret key used by the CMS API to verify submission tokens.
- `SUBMISSION_RECAPTCHA_ACTION`: expected reCAPTCHA v3 action. Defaults to `submission`.
- `SUBMISSION_RECAPTCHA_MIN_SCORE`: minimum accepted reCAPTCHA v3 score. Defaults to `0.5`.
- `VITE_RECAPTCHA_SITE_KEY`: reCAPTCHA site key used by the React submission form at build time.
- `VITE_RECAPTCHA_ACTION`: reCAPTCHA v3 action used by the React submission form at build time. Defaults to `submission`.
- `SUBMISSIONS_ADMIN_USER_POOL_ID` and `SUBMISSIONS_ADMIN_CLIENT_ID`: supplied automatically by CDK; set them from stack outputs when running the API locally.
- `SUBMISSIONS_ADMIN_COOKIE_SECURE`: defaults to `true`; set to `false` only for local HTTP testing.
- `SUBMISSION_DOWNLOAD_URL_TTL_SECONDS`: optional signed S3 download URL lifetime. Defaults to 5 minutes.

CDK outputs the CloudFront URL, CMS API URL, submission files bucket, submissions table, and notification topic ARN after deployment.

After deployment, each recipient must click **Confirm subscription** in the email from Amazon SNS before notifications can arrive. Confirm both default addresses (or all configured replacements), then send a test submission and verify receipt in every inbox. Changing `SUBMISSION_EMAIL_TO` requires another deployment and confirmation by new subscribers. No SES identity verification or sandbox exit is needed; `SUBMISSION_EMAIL_FROM` is no longer used. SNS sends plain-text notifications with an AWS-managed sender and unsubscribe link. Notifications over 256 KiB are shortened safely and include a notice directing editors to the full stored submission at `/admin/submissions`; contact the submitter using the email address in the message body. For shared mailing lists, protect against accidental group unsubscription using [AWS's subscription guidance](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html).

A stored `notified` status means SNS accepted the publish, not that each inbox received it; unconfirmed or unsubscribed recipients will not receive messages. Publish/configuration failures remain `notification_failed` without rejecting an otherwise stored submission. SNS has usage-based charges beyond applicable free allowances; see [SNS pricing](https://aws.amazon.com/sns/pricing/).

## Submissions admin

Open `/admin/submissions` to browse submissions, search names/email addresses/titles/abstracts, view details and download private attachments. Search is case-insensitive literal matching. Each request scans up to 100 records; use **Load next 100 records** or **Search next 100 records** until the page reports that all records have been searched. A batch can have no matches while more records remain. Loaded results are sorted newest first, but older batches can contain newer submissions because DynamoDB scans are unordered.

CDK creates a dedicated Cognito user pool, an app client and one shared `editor` user, with self-registration disabled and no invitation email. The stack outputs `SubmissionsAdminUserPoolId`, `SubmissionsAdminClientId` and `SubmissionsAdminUsername`. No password is committed, synthesized or returned in stack outputs.

After deployment, set a temporary password for `editor` in the AWS Cognito console (select the output user pool, then the user, then **Set password**). Use at least 12 characters with uppercase, lowercase, a number and a symbol. Sign in at `/admin/submissions` with that temporary password; the app prompts for a new password. Share the final credential with editors using your password manager. If the temporary password expires, set another through Cognito. An operator can also use the AWS CLI `admin-set-user-password` operation with securely supplied input; avoid putting real passwords into shell history.

The API validates Cognito access tokens for the configured pool/client and checks account validity before list, detail and download requests. Sessions expire after one hour and require signing in again. **Sign out** clears this browser's cookie; it deliberately does not globally sign out other editors using the same account. To revoke shared access, disable the user or use Cognito's admin global sign-out, then rotate the password. Previously issued S3 links remain valid for their short expiry window. Password recovery is handled by the site maintainer for this shared account.

Deploying this change invalidates the former custom admin sessions. The old `SUBMISSIONS_ADMIN_USERNAME`, `SUBMISSIONS_ADMIN_PASSWORD_HASH`, `SUBMISSIONS_ADMIN_SESSION_SECRET` and session-TTL settings are no longer used. Existing DynamoDB records and private S3 files are preserved.

For local admin use, configure `AWS_REGION`, AWS credentials for the existing submission resources, `SUBMISSIONS_TABLE_NAME`, the two Cognito identifiers above, and `SUBMISSIONS_ADMIN_COOKIE_SECURE=false`. Use the React dev server's `/cms` proxy. Local authentication still uses the configured Cognito pool; there is no development auth bypass.

After deployment verify invalid login, temporary-password setup, successful login, searching through all batches, detail/download access, sign-out, and unauthenticated API rejection. Unit tests mock AWS; they do not replace a deployed Cognito smoke test.
