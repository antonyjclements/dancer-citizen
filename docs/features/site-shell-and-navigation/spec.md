---
title: Site Shell and Navigation
status: active
created: 2026-05-25
updated: 2026-07-10
tags:
  - layout
  - navigation
  - public-site
related_decisions: []
related_standards: []
---

# Site Shell and Navigation

## Intent

The site shell provides persistent branding, navigation, typography, global styling, footer context, and preview support around every public page.

## Users

- Readers navigating between journal sections.
- Mobile readers using the collapsed navigation menu.
- Editors previewing pages inside the public shell.

## Current Behavior

- The root layout sets English document language, loads Cormorant Garamond and DM Sans through Next font variables, and imports global CSS.
- The root layout defines default Next metadata: `metadataBase` from `NEXT_PUBLIC_SITE_URL` with a `https://dancercitizen.org` fallback, a site title template, a default description, and Open Graph site name/type defaults.
- Global CSS defines Tailwind theme tokens for display/body fonts, paper backgrounds, ink text, muted text, faint text, and rule color.
- The body uses a warm paper background and ink text by default.
- The header is fixed to the top of the viewport with a blurred paper background and bottom border.
- Header branding links to `/`.
- Desktop navigation links include `/about`, `/editors-staff`, `/submissions`, `/contributors`, `/in-the-moment`, and `/support-us`.
- The Support Us link should be the final item in the header menu, after In the Moment.
- Mobile navigation uses a client-side open/closed state, a button with `aria-expanded` and `aria-controls`, and closes after selecting a link.
- The footer includes brand description, contact details, support copy, a donation link, copyright, and ISSN placeholder.
- The footer donation link routes to the local `/support-us` page; the PayPal payment handoff lives on that content page rather than in the persistent footer.
- The root layout renders `SiteHeader`, page children, `SiteFooter`, and `PrismicPreview`.
- `PageSection` provides a reusable section wrapper with narrow and wide content widths, though current pages mostly use inline layout classes.
- The sibling React app provides its own header, navigation, footer, and global CSS for the AWS delivery path while preserving the same top-level routes.
- The React app labels the `/` navigation item as `Home`; the Next shell labels the same route as `Issues`.
- The React mobile navigation uses a hamburger button with `aria-expanded` and `aria-controls`, opens a stacked menu below the header, closes after selecting a link, and closes when Escape is pressed.
- The React app scrolls to the top of the viewport after client-side navigation to a new pathname or query string, while hash-only navigation can keep normal anchor behavior.
- The React app gets route-specific document metadata from the HTML-shell Lambda rather than from a framework root layout.

## Key Flows

### Navigate on Desktop

1. Reader sees the persistent header.
2. Reader selects a top-level nav link.
3. Next links route to the target page.

### Navigate on Mobile

1. Reader opens the hamburger button.
2. The mobile menu renders below the header.
3. Reader selects a link or presses Escape.
4. The menu closes after navigation is initiated or Escape is pressed.

### Navigate in the React App

1. Reader follows an internal React app link.
2. React Router changes the client-side route.
3. The viewport scroll position resets to the top of the new page for pathname or query-string changes.

### Read Page Shell

1. Root layout loads global fonts and theme CSS.
2. Header wraps the page content above the fold.
3. Footer provides persistent organizational context and support link.

## Acceptance Criteria

- Every app page renders inside the shared root layout.
- Header navigation is available on desktop and mobile.
- Header navigation presents Support Us last, after In the Moment.
- Mobile navigation exposes expanded/collapsed state to assistive technology.
- React client-side navigation resets scroll position to the top of the new page.
- The footer remains available after page content.
- The root layout includes Prismic preview support.
- Site typography uses the configured Next font variables.
- Default site metadata is present for pages that do not provide route-specific metadata.
- The AWS React delivery path returns route-specific metadata for document URLs before client-side rendering begins.

## Boundaries and Non-Goals

- Header navigation is hardcoded; it does not use Prismic `show_in_navigation` settings yet.
- The active navigation item is not highlighted based on the current route.
- The newsletter form belongs to the home page content, not the persistent shell.
- The persistent footer donation link is a local route; direct external payment integration is handled by `/support-us`.
- The README describes the current Next app plus the sibling React/Lambda/CDK migration path.
- React shell styling is a parity scaffold and does not yet replace the Next shell as the production source of truth.

## Open Questions / TODOs

- Should top-level navigation be driven by Prismic content page settings?
- Should active navigation state be shown?
- Should header branding use ink text instead of white on the current paper-deep background?

## Decision Links

- None yet.
