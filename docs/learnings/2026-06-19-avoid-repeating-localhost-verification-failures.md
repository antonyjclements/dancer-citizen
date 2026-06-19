---
title: Avoid Repeating Localhost Verification Failures
scope: repo
created: 2026-06-19
trigger: interruption
tags:
  - verification
  - frontend
  - workflow
---

# Avoid Repeating Localhost Verification Failures

## Lesson

When browser verification for this site repeatedly fails because of localhost, viewport, or package-resolution issues, stop retrying the same path and switch to the fastest useful verification for the change.

## Applies When

- Working on Dancer Citizen frontend fixes.
- Localhost or in-app browser checks hit the same connection, viewport, or tooling problem more than once.
- The user needs a small CSS or layout fix quickly.

## Do Instead

- Run build/lint or targeted tests first.
- Use code inspection and narrow CSS assertions for simple responsive fixes.
- Only request heavier browser/package/network verification when it adds clear value and is not repeating a known failure path.

## Evidence

- The user interrupted a mobile UI fix because verification was taking too long and repeated known localhost issues.
