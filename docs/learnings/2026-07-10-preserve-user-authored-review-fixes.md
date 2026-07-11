---
title: Preserve User-Authored Review Fixes
scope: repo
created: 2026-07-10
trigger: correction
status: tentative
evidence-count: 1
unconfirmed-runs: 0
derived-from: []
tags:
  - review
  - workflow
  - specs
---

# Preserve User-Authored Review Fixes

## Lesson

When reviewing this repo, do not assume a failing test means code should be changed to match the test if the user has recently edited the code intentionally.

## Applies When

- Running `aw-review` or a review-like pass over a dirty worktree.
- A test expectation conflicts with recently changed behavior.
- The behavior relates to editorial/product content that may have been corrected by the user.

## Do Instead

- Inspect whether the user-authored code change is the intended source of truth.
- If the code is intentional, update the test/spec to match the code rather than reverting the behavior.
- Ask before overriding a recent user correction when intent is ambiguous.

## Evidence

- The user corrected a review fix that reintroduced CMS API editor role injection; the intended behavior was to remove the role expectation from tests.
