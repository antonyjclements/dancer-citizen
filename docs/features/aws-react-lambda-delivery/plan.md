---
status: completed
created: 2026-11-05
origin: User-approved staging-site proposal
depth: standard
---

# Staging Content Preview

## Problem and Scope

Editors need a deployed preview destination for unpublished Prismic content. Add a separate AWS staging deployment and validate the existing preview flow. Preserve production stack identity and the user's existing content/workflow edits. No production deployment, Prismic publishing, Git commit, or PR is included.

## Requirements Traceability

- Living intent: `docs/features/aws-react-lambda-delivery/spec.md`, staging acceptance sections.
- Preview contract: `docs/features/prismic-preview-and-cache-revalidation/spec.md`, preview session boundaries.
- Human review: the user approved the proposed separate stack, hostname, shared Prismic repository, banner, noindex policy, isolated side effects, and preview validation with “Ok go ahead.” This plan makes those approved choices concrete without requiring a second approval.
- Test policy: `acceptance-first`; map acceptance criteria below before implementation.

## Existing Patterns and Standards

Reuse `infra/lib/dancer-citizen-web-stack.ts`, the Lambda CMS boundary, route resolver, and host-scoped preview cookie. Follow `docs/standards/aws/build-react-before-cdk-synth.md`, `docs/standards/aws/html-shell-metadata-from-cms.md`, `docs/standards/prismic/keep-preview-and-cache-rules-explicit.md`, `docs/standards/prismic/use-shared-prismic-client.md`, `docs/standards/prismic/centralize-prismic-document-url-rules.md`, `docs/standards/react/keep-react-pages-on-cms-api-boundary.md`, `docs/standards/frontend/prevent-mobile-content-overflow.md`, and `docs/standards/traceability.md`.

## Decisions

- Select one environment per CDK invocation; default remains production. Staging uses a distinct stack ID, separate `dist-staging`, and prefixed environment configuration to prevent accidental production deployment or secret reuse.
- Disable staging submissions in both UI and API and omit email subscriptions. Keep AWS resources isolated using the existing stack construct.
- Use the existing wildcard certificate and DNS zone when deploying `staging.dancercitizen.org`; no production record changes. Non-secret hostname/certificate/zone defaults live under `context.staging` in `infra/cdk.json` so subsequent deploys retain the hostname; prefixed environment variables can override them.
- Add noindex at CloudFront for all behaviors and in staging HTML. Staging remains publicly reachable and draft access still requires a Prismic preview session.
- Register the existing `/cms/preview/start` route in Prismic; do not create another content repository or rebuild for content edits.

## Implementation Units

### U1 — Environment selection and infrastructure

Files: `infra/bin/app.ts`, `infra/lib/deployment-config.ts`, `infra/lib/dancer-citizen-web-stack.ts`, `infra/test/staging.test.ts`, package scripts.

Add validated staging configuration, separate output directory selection, custom domain/certificate/optional DNS aliases, noindex policy, and isolated settings. Preserve production logical IDs. Test default selection, invalid environments, config validation, production secret isolation, staging resources/route precedence/cookie forwarding, robots coverage, and A/AAAA aliases. Verify both templates; inspect staging before deployment.

### U2 — Editor experience and preview boundaries

Files: React app, global CSS, Vite config, submission form, CMS handler, `apps/cms-api/src/preview.test.ts`.

Build staging with a banner, ordinary anchor for exit-preview, robots meta, same-origin CMS, and disabled submit button. Reject writes server-side before calling submissions. Test missing/invalid tokens, safe redirects, cookie attributes/ref propagation/clearing, no-store, and staging write rejection. Existing HTML-shell tests cover metadata/ref behavior. Verify desktop/mobile visually when available.

### U3 — Documentation, review, and rollout

Files: `README.md`, affected living specs, this plan, ignored local progress; no unrelated files.

Document deploy/synth commands, optional domain wiring, preview registration, rollback, and manual saved-draft checks. Run scoped tests, both builds, lint, synth, code review, and workflow compliance. Deploy only staging if credentials allow. Smoke-test HTTPS/DNS/API/assets/headers/start/exit/rejected submissions. Configure Prismic through an available authenticated interface or report that exact remaining external step.

## Test Plan

| Acceptance | Evidence |
| --- | --- |
| Environment/resource isolation, validation, production compatibility | `infra/test/staging.test.ts`, staging/production synth, staging-only change set |
| Banner, robots HTML, separate builds | both React builds, built-output assertions, browser desktop/mobile check |
| Submission isolation | API test asserting no submission call; infrastructure test asserting no SNS subscriptions; deployed POST returns 405 (403 is rewritten by the existing SPA fallback) |
| Preview redirect, cookie, ref, no-store, exit | `apps/cms-api/src/preview.test.ts`, existing HTML-shell tests, deployed smoke checks |
| Domain, TLS, cache policy, robots headers | infrastructure assertions and deployed HTTPS requests |
| Editorial draft workflow | manual saved-draft check with authenticated Prismic access; report pending if unavailable |

## Risks, Rollout, and Rollback

- Use AWS profile `antonyjclements`; deploy only `DancerCitizenStagingStack` in `us-east-1`. Read the change set first and leave production untouched.
- Existing user changes are included in the staging content API build but are never reverted, committed, or deployed to production by this work.
- Preview APIs need a genuine Prismic token for draft verification. A mocked unit test does not prove the external integration works.
- If rollout fails, leave production unchanged, inspect staging events, and fix staging. Do not delete retained buckets/tables or the stack without separate authorization.
- No CI automation, per-PR environments, staging authentication, or production DNS/certificate changes.

## Handoff

Implement U1–U3 through `aw-work`, review this written plan with `aw-review` before code changes, and report actual deployment and editorial verification status separately.
