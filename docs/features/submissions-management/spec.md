---
title: Submissions Management
status: active
created: 2026-07-10
updated: 2026-09-28
tags:
  - submissions
  - aws
  - admin
  - public-site
related_decisions:
  - docs/decisions/2026-09-28-use-cognito-for-submissions-admin.md
  - docs/decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md
  - docs/decisions/2026-07-10-use-simple-admin-auth-for-submissions.md
related_standards:
  - docs/standards/aws/build-react-before-cdk-synth.md
  - docs/standards/react/keep-react-pages-on-cms-api-boundary.md
---

# Submissions Management

## Intent

The Dancer-Citizen should accept submissions directly on the website, notify the editorial team, store submission data and attached files in AWS, and provide a password-protected admin experience for reviewing submissions and downloading files.

## Users

- Writers and artists submitting work to the journal.
- Editors receiving submission notifications.
- Admin users reviewing submitted metadata and downloading attached files.
- Site maintainers operating the AWS-backed submission workflow.

## Current Behavior

- The React delivery path includes a direct submission form on `/submissions`.
- The form posts multipart data to `/cms/submissions`.
- The CMS API stores submission metadata in DynamoDB, stores uploaded files in S3, and publishes plain-text SNS notifications.
- Notification recipients are configured at CDK deployment time by `SUBMISSION_EMAIL_TO`, with the current default of `info@dancercitizen.org,editors@dancercitizen.org`.
- The form includes a honeypot field, API Gateway throttling, and reCAPTCHA v3 verification to reduce automated spam.
- Successful submissions route to `/submissions/thank-you` with a stable confirmation message.
- Admin users can review submissions at `/admin/submissions`.
- Admin authentication uses a dedicated AWS Cognito user pool with public registration disabled and one shared editorial account. First login supports setting a new password.
- Admin sessions use an HTTP-only, Secure, SameSite=Lax cookie with a one-hour Cognito access token and admin downloads use short-lived signed S3 URLs so the submission files bucket remains private.

## Key Flows

### Submit Work

1. Submitter opens `/submissions`.
2. Submitter completes required metadata, optional abstract/video link, required certification, and optional file attachment.
3. Bot protection validates that the interaction is likely human before the backend accepts the submission.
4. The backend validates required fields and allowed attachment type/size.
5. The backend writes submission metadata to DynamoDB.
6. The backend stores the uploaded file in S3 when a file is attached.
7. The backend publishes to the SNS topic; SNS emails confirmed editorial subscribers.
8. The submitter is sent to or shown a dedicated thank-you experience confirming receipt.

### Review Submissions

1. Admin user opens a protected admin route.
2. Admin user signs in using the shared Cognito account, changing a temporary password when required.
3. Admin user sees a list of submissions with status, submitted date, name, email, title, and attachment availability.
4. Admin user searches name, email, title and abstract with case-insensitive literal matching, continuing through batches until all records have been searched. Loaded results are sorted newest first.
5. Admin user opens a submission detail view to read metadata and abstract.
6. Admin user downloads the attached file through a secure, time-limited download URL or equivalent protected file handoff.

## Acceptance Criteria

- `/submissions` keeps the submission form embedded on the Dancer-Citizen website.

### SUB-001 — Submission notifications

- Each accepted submission publishes submission details to the configured SNS topic, with email subscriptions for the configured editorial recipients (two by default).
- Recipients must confirm SNS subscriptions before receiving email. No SES sender identity is required.
- Notifications include the submitter email, title, abstract, video link, and private S3 file location when supplied; a fixed subject avoids SNS subject length/control-character restrictions.
- Notifications exceeding 256 KiB are shortened at a UTF-8 character boundary, retaining the submission ID and a notice to review the full submission in the admin interface. Stored metadata is unchanged.
- `notified` means the publish was accepted, not inbox delivery. Missing topic configuration or publish failures record `notification_failed` without rejecting stored submissions.

### Storage and review

- Each accepted submission writes structured metadata to DynamoDB.
- Each accepted submission with an attachment stores the file in S3.
- The backend records enough status information to distinguish received, file-stored, notified, notification-failed, and file-failed states.
- The public form rejects missing required fields, invalid email addresses, invalid video URLs, unsupported attachment types, oversized files, and missing certification.
- The public form has stronger bot protection than a honeypot alone before launch, using the selected CAPTCHA or managed bot-protection provider.
- Successful submission leads to a thank-you page or dedicated thank-you state with a stable confirmation message.
- Admin submission data and downloads require a valid Cognito access token for the configured pool and client and an active Cognito user; the login shell is public.
- Search reaches records beyond the first 100 through continuation batches, including when a batch has no matches.
- Logout clears this browser session and displayed submission data without signing out other editors using the shared account.
- Admin responses are never cached; expired sessions return the user to login.
- Admin users can list submissions, inspect a submission, and download attached files without making the S3 bucket public.
- Admin file downloads use protected access, such as signed S3 URLs, rather than exposing raw public bucket objects.
- Local validation and unit tests cover successful submissions, validation failures, bot-protection failure, duplicate client submission IDs, notification failure behavior, and admin authorization failures.

## Boundaries and Non-Goals

- The admin page is for editorial review and download, not a full editorial workflow or peer-review management system.
- The initial admin experience does not need roles, per-editor permissions, status transitions, comments, scoring, or assignment.
- S3 submission files must remain private.
- Email notification failures should be visible in stored status, but they should not necessarily ask the submitter to resubmit if the submission and file were stored.
- The public form should remain embedded on the site rather than redirecting submitters to Wufoo or another third-party form.

## Open Questions / TODOs

- Blocking before launch: What are the final two recipient email addresses for submission notifications?
- Deferred: CSV export, status/date filters, individual editorial accounts and roles.

## Decision Links

- [Use React and Lambda BFF for AWS Delivery](../../decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md)
- [Use Simple Admin Auth for Submissions](../../decisions/2026-07-10-use-simple-admin-auth-for-submissions.md)
- [Use Cognito for Submissions Admin](../../decisions/2026-09-28-use-cognito-for-submissions-admin.md)
