---
status: completed
created: 2026-07-10
origin: docs/features/site-shell-and-navigation/spec.md
depth: standard
---

# Site Shell and Navigation Plan

## Problem and Scope

The site shell needs a parity and hardening pass across the current Next shell and the sibling AWS React shell. The shell must provide persistent branding, accessible top-level navigation, footer context, route metadata defaults, preview support where applicable, and predictable SPA navigation behavior in the React path.

In scope:

- Align top-level navigation items and order, including Support Us last after In the Moment.
- Preserve accessible mobile navigation behavior.
- Keep React SPA scroll reset centralized.
- Ensure the footer remains available and routes donation traffic through `/support-us`.
- Maintain Next root layout defaults and Prismic preview support.
- Ensure AWS React document routes receive metadata from the HTML-shell Lambda.
- Add acceptance-first tests and manual checks for shell behavior.

Out of scope:

- Driving navigation from Prismic `show_in_navigation`.
- Adding active navigation state.
- Redesigning the shell or changing brand direction.
- Moving direct payment integration into the persistent footer.
- Cutting production traffic over to the AWS React path.

Effective implementation test policy: `acceptance-first` because `docs/workflow/config.yml` does not define `workflow.implementation.test_policy`.

## Requirements Traceability

Source spec: `docs/features/site-shell-and-navigation/spec.md`

- Every app page renders inside the shared root layout.
- Header navigation is available on desktop and mobile.
- Header navigation presents Support Us last, after In the Moment.
- Mobile navigation exposes expanded/collapsed state to assistive technology.
- React client-side navigation resets scroll position to the top of a new pathname or query string, while hash-only navigation keeps normal anchor behavior.
- Footer remains available after page content and routes support traffic through `/support-us`.
- Root layout includes Prismic preview support, configured font variables, default metadata, and global styling.
- AWS React delivery path returns route-specific metadata for document URLs before client-side rendering.

## Relevant Existing Patterns

- Next root shell:
  - `src/app/layout.tsx`
  - `src/foundation/layout/SiteHeader.tsx`
  - `src/foundation/layout/SiteFooter.tsx`
  - `src/foundation/layout/PageSection.tsx`
  - `src/app/globals.css`
- React shell:
  - `apps/react-site/src/App.tsx`
  - `apps/react-site/src/styles.css`
  - `apps/react-site/src/pages/*`
  - `apps/react-site/src/components/Loading.tsx`
  - `apps/react-site/src/hooks.ts`
- AWS shell and routing:
  - `apps/cms-api/src/html-shell.ts`
  - `apps/cms-api/src/content.ts`
  - `infra/lib/dancer-citizen-web-stack.ts`
  - `apps/react-site/index.html`

Applicable standards:

- `docs/standards/react/make-mobile-navigation-accessible.md`
- `docs/standards/react/own-spa-navigation-reset.md`
- `docs/standards/react/use-skeletons-for-content-loading.md`
- `docs/standards/react/keep-react-pages-on-cms-api-boundary.md`
- `docs/standards/frontend/prevent-mobile-content-overflow.md`
- `docs/standards/aws/html-shell-metadata-from-cms.md`
- `docs/standards/aws/build-react-before-cdk-synth.md`

Relevant decision:

- `docs/decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md`

## Decisions

- Keep navigation hardcoded for this pass. Prismic-driven navigation remains deferred.
- Use the same public top-level route set in both shells: About, Editors / Staff, Submissions, Contributors, In the Moment, Support Us, with Support Us last.
- Keep direct payment handoff out of the persistent footer; the footer should route to `/support-us`.
- Own mobile navigation state in the shell with a real button and ARIA state.
- Own React scroll reset in one shell-level helper keyed to pathname and query string.
- Keep AWS document metadata in the HTML-shell Lambda, not React components or `index.html`.

## Implementation Units

### Unit 1: Align Top-Level Navigation Across Next and React Shells

Goal: Make the public header route set and ordering match the spec in both delivery paths.

Files likely touched:

- `src/foundation/layout/SiteHeader.tsx`
- `apps/react-site/src/App.tsx`
- `apps/react-site/src/styles.css`
- `docs/features/site-shell-and-navigation/spec.md` if an intentional delivery-path difference remains.

Behavior and contract changes:

- Header links should include `/about`, `/editors-staff`, `/submissions`, `/contributors`, `/in-the-moment`, and `/support-us`.
- Support Us must be the final header link.
- Branding should link to `/`.
- Any difference between Next and React labels for `/` should be intentional and documented; do not let top-level public route availability drift.

Tests:

- Add or update a shell test if a React/Next component test harness exists:
  - nav links render in expected order.
  - Support Us is last.
  - brand link targets `/`.
- If no component harness exists, verify through lint/build plus manual browser checks for both shells.

Manual checks:

- Desktop header shows all top-level links in order.
- Mobile menu shows the same links in order.

Edge cases:

- Long labels should not overflow or wrap awkwardly at tablet widths.
- Route labels should remain readable and not depend on hover-only affordances.

### Unit 2: Harden Accessible Mobile Navigation

Goal: Ensure mobile navigation is keyboard- and assistive-technology-friendly.

Files likely touched:

- `src/foundation/layout/SiteHeader.tsx`
- `apps/react-site/src/App.tsx`
- `apps/react-site/src/styles.css`

Behavior and contract changes:

- The mobile toggle must be `<button type="button">`.
- `aria-expanded` must reflect actual open/closed state.
- `aria-controls` must point to the mobile navigation container.
- Selecting a link closes the menu.
- React shell should close the menu on Escape.
- Next shell should close on link selection and should add Escape handling if practical without overcomplicating the current component.

Tests:

- Component test if harness exists:
  - clicking toggle opens/closes menu and changes `aria-expanded`.
  - clicking a nav link closes menu.
  - pressing Escape closes menu in React shell.
- Manual keyboard check:
  - Tab reaches the menu button.
  - Enter/Space toggles the menu.
  - Escape closes the React menu.

Edge cases:

- The mobile menu should not remain open after navigating to a new page.
- Desktop nav should not duplicate mobile nav in the accessibility tree when hidden by breakpoint styling.

### Unit 3: Centralize React SPA Navigation Reset

Goal: Preserve normal document-navigation feel in the React SPA without breaking anchors.

Files likely touched:

- `apps/react-site/src/App.tsx`
- `apps/react-site/src/pages/*` only if removing one-off scroll handling.

Behavior and contract changes:

- Keep scroll reset in a shell-level helper that uses `useLocation()`.
- Reset when `pathname` or `search` changes.
- Do not reset on hash-only changes so footnotes, references, and anchors keep normal behavior.
- Do not add `window.scrollTo()` in page components or individual link handlers.

Tests:

- Component or integration test if React router test harness exists:
  - pathname change calls `window.scrollTo(0, 0)`.
  - query-string change calls `window.scrollTo(0, 0)`.
  - hash-only change does not call scroll reset.
- Manual browser check:
  - scroll down, navigate to another route, viewport returns to top.
  - click an in-page reference/hash link, viewport moves to anchor normally.

Edge cases:

- Search-only navigations should reset because they represent a new page state.
- Hash-only changes must not be treated as route resets.

### Unit 4: Preserve Footer and Support Flow

Goal: Keep persistent footer context available after page content and route donations through the support page.

Files likely touched:

- `src/foundation/layout/SiteFooter.tsx`
- `apps/react-site/src/App.tsx`
- `apps/react-site/src/styles.css`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`

Behavior and contract changes:

- Footer appears after all public page content.
- Footer donation/support link points to `/support-us`.
- `/support-us` content page owns the external PayPal handoff and opens it in a new tab.

Tests:

- `apps/cms-api/src/content.test.ts`:
  - Support Us page normalization converts PayPal donation text into an external link with `_blank`.
- Manual browser checks:
  - Footer appears after home, issue, article, and content pages.
  - Footer support link opens the local support page.
  - Support page donation button opens PayPal externally.

Edge cases:

- Admin routes may share the public shell unless intentionally separated later; avoid exposing sensitive admin-only links in the public footer/header.

### Unit 5: Maintain Layout, Fonts, Preview, and Default Metadata in Next

Goal: Ensure the current production Next shell keeps its global document responsibilities.

Files likely touched:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/foundation/layout/PageSection.tsx`
- `src/foundation/layout/SiteHeader.tsx`
- `src/foundation/layout/SiteFooter.tsx`

Behavior and contract changes:

- Root layout sets `lang="en"`.
- Root layout loads configured font variables.
- Root layout imports global CSS.
- Root layout defines default metadata with `NEXT_PUBLIC_SITE_URL` fallback behavior.
- Root layout renders `SiteHeader`, children, `SiteFooter`, and `PrismicPreview`.
- Body retains warm paper background and ink text.

Tests:

- `npm run build`
- `npm run lint`
- Manual DOM/source check:
  - `html` language is English.
  - default metadata exists for pages without route-specific metadata.
  - Prismic preview support remains rendered.

Edge cases:

- Header fixed positioning should not cover page content after typography or spacing changes.
- Font fallback should not cause layout shifts large enough to clip navigation labels.

### Unit 6: Keep AWS React HTML Shell and Route Coverage Aligned

Goal: Ensure CloudFront/API Gateway routes and the React router serve all public shell pages with metadata-bearing HTML where needed.

Files likely touched:

- `apps/react-site/src/App.tsx`
- `apps/react-site/index.html`
- `apps/cms-api/src/html-shell.ts`
- `apps/cms-api/src/content.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `README.md`

Behavior and contract changes:

- React router includes all top-level public routes plus article, issue, thank-you/admin routes where already supported by related specs.
- CloudFront and API Gateway route article, issue, and configured content-page document requests through the HTML-shell Lambda.
- The HTML-shell Lambda injects route-specific metadata from CMS normalization before React hydration.
- React `index.html` remains generic and does not duplicate route-specific metadata logic.

Tests and verification:

- Add or update `apps/cms-api/src/html-shell.test.ts` if present or create focused tests:
  - known article/issue/content route receives injected metadata.
  - missing content route receives not-found metadata and `no-store`.
  - generic `index.html` metadata is replaced for document responses.
- `npm run build:react`
- `npm run build:api`
- `npm run cdk:synth` after `npm run build:react`
- Manual smoke checks:
  - `/`
  - `/about`
  - `/editors-staff`
  - `/submissions`
  - `/contributors`
  - `/in-the-moment`
  - `/support-us`
  - `/issues/<uid>`
  - `/articles/<uid>`

Edge cases:

- Static assets should continue using the S3 origin and optimized cache policy.
- Preview cookies should be forwarded to document routes and bypass cache when present.

### Unit 7: Responsive Shell Polish and Overflow Review

Goal: Prevent shell and CMS content from widening mobile viewports or overlapping.

Files likely touched:

- `src/app/globals.css`
- `src/foundation/layout/SiteHeader.tsx`
- `src/foundation/layout/SiteFooter.tsx`
- `apps/react-site/src/styles.css`
- `apps/react-site/src/components/Slices.tsx`
- `apps/react-site/src/pages/*`

Behavior and contract changes:

- Header, nav, footer, and CMS-rich content should fit mobile widths.
- Long links, citations, and imported content should wrap.
- Grid/flex children containing CMS text should be shrinkable with `min-width: 0` or equivalent constraints.
- Loading states should use shared skeletons rather than visible `Loading...` text.

Tests and verification:

- `npm run lint`
- `npm run build:react`
- Browser checks at mobile and desktop widths:
  - header links do not overlap.
  - mobile menu fits viewport width.
  - footer columns wrap cleanly.
  - article references and content-page links do not cause horizontal scrolling.
  - skeleton loading state appears for route-level CMS fetches.

Edge cases:

- Very long imported URLs and citation strings are the highest overflow risk.
- Tablet breakpoints can be tighter than phone or desktop; include at least one mid-width check.

## Test Plan

Automated:

- `npm run lint`
- `npm run build`
- `npm run build:react`
- `npm run build:api`
- `npm run test:api`
- `npm run cdk:synth` after `npm run build:react`

Manual/browser:

- Desktop and mobile header navigation order and accessibility state.
- Mobile menu keyboard interaction.
- React route scroll reset for route changes and hash-only navigation.
- Footer presence and support route behavior.
- HTML source/response metadata for document routes before hydration.
- Mobile overflow check for shell, content pages, article references, and long links.

## Risks and Open Questions

- The Next shell and React shell intentionally differ in implementation, but public route availability and navigation order should not drift.
- The React shell may include admin/submission routes from adjacent feature work; those should remain out of public top-level nav.
- Active navigation state is a user-experience improvement but remains deferred by spec.
- Header branding color remains an open design question in the spec; do not change it unless product/design confirms direction.
- Some verification may require browser tooling because layout and accessibility state are not fully proven by build/lint.

## Deferred Work

- Prismic-driven navigation from `show_in_navigation`.
- Active route highlighting.
- Reconsidering header brand color.
- Production cutover from Next to AWS React.
- Dedicated component test harness for React/Next shell interactions if the repo continues to grow.

## Handoff

Recommended next step: `aw-work docs/features/site-shell-and-navigation/plan.md`

Implementation should start by aligning route/nav constants and accessibility behavior, then verify React scroll reset and AWS route metadata, and finish with browser checks. Coordinate with `docs/features/public-journal-experience/plan.md` when touching `apps/react-site/src/App.tsx`, `apps/react-site/src/styles.css`, `apps/cms-api/src/content.ts`, or `infra/lib/dancer-citizen-web-stack.ts`.
