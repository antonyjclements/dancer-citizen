---
title: Submissions Management
status: active
created: 2026-07-10
updated: 2026-07-10
tags:
  - submissions
  - aws
  - admin
  - public-site
related_decisions:
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
- The CMS API stores submission metadata in DynamoDB, stores uploaded files in S3, and sends SES notifications.
- Notification recipients are configured by `SUBMISSION_EMAIL_TO`, with the current default of `info@dancercitizen.org,editors@dancercitizen.org`.
- The form includes a honeypot field, API Gateway throttling, and reCAPTCHA v3 verification to reduce automated spam.
- Successful submissions route to `/submissions/thank-you` with a stable confirmation message.
- Admin users can review submissions at `/admin/submissions`.
- The first admin release uses a single environment-configured admin username/password hash, with AWS Cognito deferred until the editorial workflow needs managed users.
- Admin sessions use an HTTP-only signed cookie and admin downloads use short-lived signed S3 URLs so the submission files bucket remains private.

## Key Flows

### Submit Work

1. Submitter opens `/submissions`.
2. Submitter completes required metadata, optional abstract/video link, required certification, and optional file attachment.
3. Bot protection validates that the interaction is likely human before the backend accepts the submission.
4. The backend validates required fields and allowed attachment type/size.
5. The backend writes submission metadata to DynamoDB.
6. The backend stores the uploaded file in S3 when a file is attached.
7. The backend emails the configured editorial recipients.
8. The submitter is sent to or shown a dedicated thank-you experience confirming receipt.

### Review Submissions

1. Admin user opens a protected admin route.
2. Admin user enters the configured admin username and password.
3. Admin user sees a list of submissions with status, submitted date, name, email, title, and attachment availability.
4. Admin user opens a submission detail view to read metadata and abstract.
5. Admin user downloads the attached file through a secure, time-limited download URL or equivalent protected file handoff.

## Acceptance Criteria

- `/submissions` keeps the submission form embedded on the Dancer-Citizen website.
- Each accepted submission sends notification email to two or more configured recipient addresses.
- Each accepted submission writes structured metadata to DynamoDB.
- Each accepted submission with an attachment stores the file in S3.
- The backend records enough status information to distinguish received, file-stored, notified, notification-failed, and file-failed states.
- The public form rejects missing required fields, invalid email addresses, invalid video URLs, unsupported attachment types, oversized files, and missing certification.
- The public form has stronger bot protection than a honeypot alone before launch, using the selected CAPTCHA or managed bot-protection provider.
- Successful submission leads to a thank-you page or dedicated thank-you state with a stable confirmation message.
- Admin routes are not publicly accessible without authentication.
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
- Deferred: Upgrade admin authentication to AWS Cognito when the editorial workflow needs managed users, password resets, or multiple role-bearing accounts.
- Deferred: Should the admin list support search, filtering, CSV export, or status labels beyond the stored backend status?
- Deferred: Should the thank-you page be a real route such as `/submissions/thank-you`, or is an in-page confirmation acceptable for launch?

## Decision Links

- [Use React and Lambda BFF for AWS Delivery](../../decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md)
- [Use Simple Admin Auth for Submissions](../../decisions/2026-07-10-use-simple-admin-auth-for-submissions.md)
