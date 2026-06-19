---
title: Public Journal Experience
status: active
created: 2026-05-25
updated: 2026-06-19
tags:
  - journal
  - prismic
  - public-site
related_decisions: []
related_standards:
  - docs/standards/prismic/centralize-prismic-document-url-rules.md
  - docs/standards/prismic/keep-page-queries-in-feature-data-loaders.md
  - docs/standards/prismic/normalize-prismic-documents-at-data-boundary.md
  - docs/standards/prismic/use-shared-prismic-client.md
---

# Public Journal Experience

## Intent

The site presents The Dancer-Citizen as an open-access, peer-reviewed journal and lets public readers browse issues, open issue pages, read article pages, and visit general content pages backed by Prismic.

## Users

- Readers browsing current and past issues.
- Readers opening articles or content pages from shared links.
- Editors publishing issue, article, and content documents in Prismic.

## Current Behavior

- The home page at `/` renders a static journal hero, the latest issue, an in-memory archive of older issues, a memorial panel, and a newsletter signup panel.
- Issues are loaded from Prismic `issue_page` documents ordered by `issue_number` descending on the home page.
- Home page latest and archive issue cards render issue thumbnails from `tile_thumbnail`, falling back to `hero_image`, and show a non-image issue placeholder only when Prismic has no usable thumbnail image.
- Issue pages live at `/issues/[uid]` and are fetched by UID from Prismic.
- Article pages live at `/articles/[uid]` and are fetched by UID from Prismic.
- General content pages live at `/[uid]` and are fetched by UID from Prismic.
- Missing Prismic documents for issue, article, or content pages call `notFound()`.
- Issue pages render an issue hero, non-legacy issue body slices, a generated table of contents, and previous/next issue navigation.
- Issue page `LinkedTiles` body slices are treated as imported legacy table-of-contents placeholders and are not rendered directly; when present, their linked document order drives the generated public TOC.
- If an issue has no `LinkedTiles` body slice, table of contents entries come from article/content documents tagged with the formatted issue tag for the current issue number.
- The issue table of contents excludes `issue_page` documents and orders entries by first publication date ascending.
- Article pages render a header, the Prismic body through `SliceZone`, references/works cited when present, and bottom article navigation.
- Article navigation links to the parent issue table of contents plus previous/next entries using the issue's curated table-of-contents order.
- Article navigation may include content pages such as "About the Contributors" when those documents are part of the curated issue order.
- Article pages generate article-specific title, description, canonical, Open Graph, and Twitter metadata from Prismic fields.
- The sibling AWS React delivery path preserves the same public route set and consumes normalized journal data from `/cms/home`, `/cms/issues/:uid`, `/cms/articles/:uid`, and `/cms/pages/:uid`.
- In the AWS React delivery path, route-specific article, issue, and content-page social metadata is returned by the HTML-shell Lambda before the React app hydrates.
- Prismic images render with non-empty alt text from the image field when available, falling back to nearby captions, credits, or titles.
- Content pages render a header and then the Prismic body through `SliceZone`.
- Contributor list slices decode imported legacy title-link payloads into readable contributor names, same-page anchors, issue labels, and inline `read more` links.
- The `/submissions` content page filters imported historical call-for-submissions slices down to the current public submissions copy, Wufoo form link, and Creative Commons/licensing copy.
- The `/support-us` content page converts the imported PayPal donation text into a button-style external link that opens in a new tab.
- Journal summaries normalize title, subtitle, issue number, publication date, and href for table-of-contents links.

## Key Flows

### Browse Issues

1. Reader visits `/`.
2. The home data loader fetches all issues from Prismic.
3. The first issue is shown as latest issue.
4. Remaining issues are shown in the archive grid.

### Read an Issue

1. Reader opens `/issues/[uid]`.
2. The issue data loader fetches the issue document.
3. The loader derives the issue tag from `issue_number`.
4. Linked document order from an imported `LinkedTiles` slice becomes the table of contents order when present.
5. Tagged child article/content documents become the fallback table of contents when no linked issue order is present.
6. The page renders issue slices and previous/next issue navigation.

### Read an Article or Content Page

1. Reader opens `/articles/[uid]` or `/[uid]`.
2. The relevant feature data loader fetches the Prismic document.
3. Article pages fetch the parent issue and derive previous/next links from its curated issue order.
4. The page renders a header and body slices.
5. If the document does not exist, Next renders the not-found experience.

### Read Through the AWS React Path

1. Reader opens the same public route on the CloudFront-hosted React site.
2. The React app fetches the corresponding normalized `/cms/*` JSON endpoint.
3. The CMS API applies the same journal ordering, navigation, page normalization, and metadata rules.
4. The React app renders the page client-side.

## Acceptance Criteria

- `/` displays a hero, latest issue when present, archive issues, memorial content, and newsletter panel.
- `/` displays issue thumbnails for latest and archive issue cards when Prismic provides `tile_thumbnail` or `hero_image`, with non-empty alt text for rendered images.
- `/issues/[uid]` displays the requested issue, non-legacy body slices, a single generated table of contents, and issue navigation.
- `/articles/[uid]` displays the requested article header, body slices, and issue navigation when the article is linked to an issue.
- `/articles/[uid]` exposes article-specific social sharing metadata and non-empty image alt text for rendered article media.
- `/[uid]` displays the requested content page header and body slices.
- `/contributors` displays contributor names and issue labels without exposing imported legacy JSON field payloads.
- `/submissions` does not display superseded Issue 15, Issue 19, or closed Issue 20 call text when the current live-page copy is available in Prismic.
- `/support-us` displays the PayPal donation call to action as a button with `target="_blank"`.
- Missing issue, article, and content UIDs result in `notFound()`.
- Issue ordering is descending on the home page and ascending for previous/next issue lookup.
- Issue table-of-contents entries use centralized journal href generation.
- Issue table-of-contents order matches the issue's curated linked document order when Prismic provides one.
- Prismic reads go through the shared client and page-level reads stay in feature data loaders.
- The AWS React delivery path preserves article-specific social metadata without falling back to a generic SPA `index.html`.

## Boundaries and Non-Goals

- The current site generates article metadata from Prismic documents, but issue and content pages still use default metadata.
- The AWS React delivery path can generate route-specific metadata for articles, issues, and configured content pages through its HTML-shell Lambda, but it is not yet the production cutover target.
- The current site does not implement sitemap generation, even though content models include hide-from-sitemap flags.
- The newsletter form is static markup and does not submit to a backend.
- The article issue backlink currently points to `/`, not the specific issue page.
- Issue archive and latest issue components currently receive typed Prismic documents directly; normalized view models are the preferred target for future touched work.

## Open Questions / TODOs

- Should article headers link back to the exact issue page instead of the home page?
- Should issue and content page `meta_title` and `meta_description` fields drive Next metadata?
- Should `hide_from_sitemap` and navigation settings have a public sitemap/navigation implementation?
- Should the newsletter form submit to a provider or be replaced with an external embed?

## Decision Links

- None yet.
