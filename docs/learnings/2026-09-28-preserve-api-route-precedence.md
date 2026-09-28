---
title: Preserve API Route Precedence
scope: repo
created: 2026-09-28
trigger: dead-end
status: tentative
evidence-count: 1
unconfirmed-runs: 0
derived-from:
  - 2026-07-11-legacy-issue-redirects
tags:
  - aws
  - verification
---

# Preserve API Route Precedence

## Lesson

Broad parameterized HTML routes can intercept /cms/home before the CMS proxy route. Keep explicit CMS routes and use the HTML default route for unmatched document requests; verify the intended Lambda integration when debugging content lookup errors.

## Evidence

- 2026-07-11-legacy-issue-redirects
