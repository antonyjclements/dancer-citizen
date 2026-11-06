---
title: Check Upstream Before Infrastructure Work
scope: repo
created: 2026-09-28
trigger: correction
status: tentative
evidence-count: 1
unconfirmed-runs: 0
derived-from:
  - 2026-09-28-cognito-submissions-admin
tags:
  - aws
  - git
  - deployment
---

# Check Upstream Before Infrastructure Work

## Lesson

Fetch the current upstream branch before making deployment-sensitive changes or diagnosing intended production architecture. A local `origin/main` reference can be stale even when it matches local `main`.

## Applies When

- Extending the AWS stack or diagnosing a deployed submissions failure.
- Reconciling local code with a user's report of infrastructure changes.

## Do Instead

Fetch upstream and compare before declaring which notification service is intended. Preserve dirty work with a recoverable backup before integrating updates. Verify both the upstream infrastructure and local feature resources survive conflict resolution.

## Evidence

The owner corrected an SES diagnosis: upstream main already contained SNS notification delivery. Fetching revealed seven missing commits. Integrating main preserved SNS and the local Cognito additions. The separate missing-reCAPTCHA-secret error was confirmed from deployed logs.
