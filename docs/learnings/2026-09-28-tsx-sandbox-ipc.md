---
title: Recognize tsx Sandbox IPC Failures
scope: repo
created: 2026-09-28
trigger: dead-end
status: active
evidence-count: 3
unconfirmed-runs: 0
derived-from:
  - 2026-06-28-submissions-form-aws-workflow
  - 2026-07-11-public-site-submissions-editors-session
  - 2026-07-11-legacy-issue-redirects
tags:
  - aws
  - verification
---

# Recognize tsx Sandbox IPC Failures

## Lesson

When CDK synth fails with listen EPERM on a tsx temporary pipe, the sandbox is blocking local IPC. Retry through the approved escalation path; do not change application code to resolve that environment failure. Build React before synthesizing.

## Evidence

- 2026-06-28-submissions-form-aws-workflow
- 2026-07-11-public-site-submissions-editors-session
- 2026-07-11-legacy-issue-redirects
