---
status: completed
created: 2026-07-10
origin: docs/features/public-journal-experience/spec.md
depth: standard
---

# Public Journal Experience Plan

## Problem and Scope

The public journal experience needs a final parity pass across the current Next site and the sibling AWS React delivery path. The plan focuses on reader-facing journal behavior: home/latest issue presentation, issue pages, article pages, content pages, imported legacy content normalization, table-of-contents links, route metadata, and content-specific refinements from editorial feedback.

In scope:

- Preserve and harden Prismic-backed issue, article, and content page behavior.
- Ensure the AWS React path consumes normalized `/cms/*` responses rather than direct Prismic reads.
- Close public refinements for About links, Support Us donation link, Editors / Staff grouping, In the Moment pending state, submissions-page filtering, and Issue 20 table-of-contents behavior.
- Add acceptance-first tests around content normalization, metadata, route behavior, and visible rendering.

Out of scope:

- Changing Prismic content models.
- Building sitemap generation from `hide_from_sitemap`.
- Making the newsletter form functional.
- Cutting production traffic over to the AWS React path.
- Replacing the current Next implementation as source of truth.

Effective implementation test policy: `acceptance-first` because `docs/workflow/config.yml` does not define `workflow.implementation.test_policy`.

## Requirements Traceability

Source spec: `docs/features/public-journal-experience/spec.md`

- Home page must show hero, latest issue, archive, memorial, newsletter, issue thumbnails, and keep "The Dancer-Citizen" on one line when viewport width allows.
- Issue pages must show non-legacy slices, exactly one generated table of contents, curated order from `LinkedTiles` when available, fallback tag order otherwise, and previous/next issue navigation.
- Article pages must show header, body, references, works cited, parent issue navigation, previous/next links, and article-specific metadata.
- Content pages must show headers and Prismic body content; `/about`, `/submissions`, `/support-us`, `/editors-staff`, and `/in-the-moment` have page-specific normalization requirements.
- Missing issue, article, and content UIDs must produce the not-found experience.
- Prismic access and URL generation must stay centralized.
- AWS React document routes must return route-specific metadata before hydration.

## Relevant Existing Patterns

- Next data loaders live under `src/features/journal/data/*` and are the current production source of truth.
- Next UI components live under `src/features/journal/components/*`.
- Shared Prismic utilities live under `src/foundation/prismic/*`, especially `prismicClient.ts`, `prismicRoutes.ts`, and `getImageFieldWithAlt.ts`.
- AWS CMS normalization lives in `apps/cms-api/src/content.ts` and is tested in `apps/cms-api/src/content.test.ts`.
- AWS HTML-shell metadata lives in `apps/cms-api/src/html-shell.ts`.
- React route pages live in `apps/react-site/src/pages/*` and fetch through `apps/react-site/src/api.ts`.
- React slice rendering lives in `apps/react-site/src/components/Slices.tsx`.
- React loading states use `apps/react-site/src/components/Loading.tsx` through `apps/react-site/src/hooks.ts`.

Applicable standards:

- `docs/standards/prismic/centralize-prismic-document-url-rules.md`
- `docs/standards/prismic/keep-page-queries-in-feature-data-loaders.md`
- `docs/standards/prismic/normalize-prismic-documents-at-data-boundary.md`
- `docs/standards/prismic/normalize-legacy-content-early.md`
- `docs/standards/prismic/use-shared-prismic-client.md`
- `docs/standards/react/keep-react-pages-on-cms-api-boundary.md`
- `docs/standards/react/keep-react-slices-in-parity-with-next.md`
- `docs/standards/react/use-skeletons-for-content-loading.md`
- `docs/standards/frontend/prevent-mobile-content-overflow.md`
- `docs/standards/aws/html-shell-metadata-from-cms.md`
- `docs/standards/aws/build-react-before-cdk-synth.md`

Relevant decision:

- `docs/decisions/2026-06-19-use-react-lambda-bff-for-aws-delivery.md`

## Decisions

- Treat the Next journal implementation as canonical until production cutover. React parity should follow Next behavior unless the spec explicitly calls out an AWS-only path.
- Keep Prismic reads, ordering, metadata, page-specific cleanup, and legacy normalization in data loaders or the CMS API boundary, not in React page components.
- Continue using `JournalSummary.href` and centralized URL helpers instead of constructing routes inside presentation components for new or touched code.
- Omit visible table-of-contents surfaces when they cannot provide working links; visible TOC entries must all link to normalized issue, article, or content-page hrefs.
- Use tests around normalization contracts first, then browser/manual checks for visual requirements such as hero wrapping and content overflow.

## Implementation Units

### Unit 1: Stabilize Journal URL, Summary, and Image Contracts

Goal: Make route generation, summaries, and image alt fallbacks consistent between Next and AWS paths.

Files likely touched:

- `src/features/journal/data/getJournalDocumentHref.ts`
- `src/features/journal/data/getJournalDocumentSummary.ts`
- `src/features/journal/components/IssueArchiveGrid.tsx`
- `src/features/journal/components/IssueNavigation.tsx`
- `src/features/journal/components/LatestIssuePanel.tsx`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/react-site/src/api.ts`

Behavior and contract changes:

- Ensure all issue, article, and content links use centralized href rules or normalized `href` values.
- Preserve non-empty alt text for issue, article, and content thumbnails in both paths.
- Keep legacy HTML stripped from summary titles, subtitles, and alt fallbacks.

Tests:

- Add or update `apps/cms-api/src/content.test.ts` scenarios:
  - `getSummary()` returns `/issues/:uid`, `/articles/:uid`, and `/:uid` for supported document types.
  - Thumbnail alt falls back to cleaned title when Prismic alt is blank.
  - Legacy HTML/entities are removed from summary title, subtitle, and alt fallback.
- Add or update tests near Next data helpers if a test harness exists; otherwise include a manual verification note in the unit handoff.

Edge cases:

- Missing UID should not create an invalid visible link.
- Broken or unsupported document links should be excluded from generated navigation surfaces.

### Unit 2: Harden Issue Page Table of Contents and Navigation

Goal: Ensure issue pages render a single generated TOC with working links and stable order.

Files likely touched:

- `src/features/journal/data/getIssuePageData.ts`
- `src/features/journal/components/IssueTableOfContents.tsx`
- `src/features/journal/components/LatestIssuePanel.tsx`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/react-site/src/pages/IssuePage.tsx`

Behavior and contract changes:

- Treat `LinkedTiles` slices as imported ordering hints, not directly rendered issue body content.
- Preserve curated linked document order when `LinkedTiles` is present.
- Fall back to issue-tagged article/content documents ordered by first publication date.
- Exclude `issue_page` documents from issue TOCs.
- Do not display a dead latest-Issue-20 table of contents on the home/latest panel; if a compact TOC is added later, every entry must link to `entry.href`.

Tests:

- `apps/cms-api/src/content.test.ts`:
  - `linkedTableOfContentsIDs()` preserves first-seen linked document order and removes duplicates.
  - `getIssue()` omits `LinkedTiles` slices from returned body.
  - `getIssue()` returns TOC summaries in linked order when IDs are present.
  - fallback children query excludes `issue_page` documents and sorts ascending by publication date.
- Manual browser checks:
  - `/issues/<issue-uid>` shows one table of contents.
  - Every visible TOC entry is clickable.
  - Latest issue home panel does not show a non-clickable TOC label.

Edge cases:

- Broken linked documents should be skipped without shifting valid entries.
- Issues without `issue_number` should return an empty fallback TOC rather than querying a malformed tag.

### Unit 3: Complete Article Rendering and Metadata Parity

Goal: Preserve article reading, references, works cited, issue navigation, and social metadata across Next and AWS paths.

Files likely touched:

- `src/features/journal/data/getArticlePageData.ts`
- `src/features/journal/components/ArticleHeader.tsx`
- `src/features/journal/components/ArticleNavigation.tsx`
- `src/features/journal/components/ArticleReferences.tsx`
- `src/app/articles/[uid]/page.tsx`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/html-shell.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/react-site/src/pages/ArticlePage.tsx`
- `apps/react-site/src/components/Slices.tsx`

Behavior and contract changes:

- Article issue backlink should use the parent issue href when available.
- Previous/next article links should follow the parent issue's curated TOC order and include content pages when they are part of that order.
- Article metadata should use Prismic `meta_title` and `meta_description` with sensible fallbacks.
- HTML-shell metadata must include escaped title, description, canonical URL, Open Graph, Twitter tags, and non-empty social image alt when an image is available.

Tests:

- `apps/cms-api/src/content.test.ts`:
  - `getArticle()` returns parent issue summary when article has a valid issue link.
  - previous/next entries come from curated issue order.
  - content pages in the issue order are eligible as previous/next neighbors.
  - `getMetadataForPath("/articles/:uid")` returns article type metadata and cleaned fallback description.
- Add or update `apps/cms-api/src/html-shell.test.ts` if present or create focused coverage:
  - article metadata is injected into the shell.
  - metadata values are escaped.
  - image alt tag is present when image exists.
  - 404 shell returns `cache-control: no-store`.
- Manual browser checks:
  - Article page references and works cited wrap on mobile.
  - Article navigation links go to the expected issue/article/content pages.

Edge cases:

- Articles with missing or broken issue links should render without previous/next navigation rather than failing.
- Long citations and URLs must not widen mobile viewports.

### Unit 4: Normalize Content Pages With Editorial Refinements

Goal: Make page-specific migrated content readable and clickable while keeping cleanup at the data/API boundary.

Files likely touched:

- `src/features/journal/data/getContentPageData.ts`
- `src/features/journal/components/ContentHeader.tsx`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/react-site/src/pages/ContentPage.tsx`
- `apps/react-site/src/components/Slices.tsx`
- `apps/react-site/src/styles.css`

Behavior and contract changes:

- `/about` should convert imported plain URL labels into clickable anchors.
- `/submissions` should keep the current public call, embedded site form surface, and licensing copy while omitting superseded Issue 15, Issue 19, and closed Issue 20 call text.
- `/support-us` should convert imported PayPal text into a button-style external link with `target="_blank"`.
- `/editors-staff` should group and order editors/staff as specified by the spec.
- `/in-the-moment` should be allowed to show a clear pending-content state until editorial content exists.

Tests:

- `apps/cms-api/src/content.test.ts`:
  - About plain URL labels become rich text hyperlink spans.
  - Submissions filtering removes old calls and legacy form-link text while preserving current call and licensing copy.
  - Support Us donation copy becomes an external PayPal hyperlink with `_blank`.
  - Editors / Staff grouping returns "Editors", "Past Guest Editors & Staff", and "Moving the Map" in order with required roles and Jane's `inMemoriam`.
- Manual browser checks:
  - `/about` links are clickable.
  - `/support-us` donation link opens externally.
  - `/editors-staff` order and section headings match the spec.
  - `/in-the-moment` shows pending content rather than a generic failure.

Edge cases:

- Page-specific normalization should leave unrelated content pages untouched except for generic plain URL linking.
- Missing expected biography names should not crash grouping; available known names should still be grouped.

### Unit 5: Bring React Slice Rendering to Required Public Parity

Goal: Ensure the AWS React path can render production-visible Prismic body slices without raw legacy payloads or unsupported placeholders for required pages.

Files likely touched:

- `apps/react-site/src/components/Slices.tsx`
- `apps/react-site/src/components/RichText.tsx`
- `apps/react-site/src/text.ts`
- `slices/*/index.tsx`
- `docs/features/prismic-content-model-and-slices/spec.md`

Behavior and contract changes:

- Compare each production-visible React slice with the matching Next Slice Machine component.
- Preserve rich text, quote, image, gallery, video, file link, contributor list, and biography list behavior required by public pages.
- Keep unsupported slices explicit only for slices confirmed not to be production-visible before cutover.
- Prevent raw imported JSON/link payloads from appearing in contributor lists.

Tests:

- Add component-level tests if a React test harness is introduced; otherwise cover cleanup helpers through small unit tests and document manual slice checks.
- `apps/cms-api/src/content.test.ts` or a new React-side test file:
  - contributor title-link payloads decode into readable labels and optional anchors.
  - legacy `read more (url)` text becomes a link when rendered.
  - image alt fallbacks are non-empty.
- Manual browser checks:
  - `/contributors` does not expose imported JSON payloads.
  - image, gallery, video, quote, file link, and biography slices render acceptably on desktop and mobile.

Edge cases:

- Unsupported slice diagnostics should not be mistaken for loading states.
- External video links without a parseable YouTube ID should remain accessible as links.

### Unit 6: Verify AWS HTML-Shell Routes and Public React Route Coverage

Goal: Ensure every public journal route required by the spec has CloudFront/API Gateway routing and route-specific metadata where applicable.

Files likely touched:

- `apps/cms-api/src/html-shell.ts`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/handler.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `apps/react-site/src/App.tsx`
- `README.md`

Behavior and contract changes:

- HTML-shell Lambda should own document-route metadata for `/articles/:uid`, `/issues/:uid`, and configured content page routes.
- CloudFront and API Gateway should route public document paths to the HTML-shell Lambda before React hydrates.
- React app should include route entries for all top-level public pages and not-found fallback.

Tests and verification:

- `npm run build:react`
- `npm run build:api`
- `npm run cdk:synth` after `npm run build:react`
- Add or update HTML-shell unit tests:
  - configured content routes resolve metadata through `getMetadataForPath()`.
  - missing CMS documents return a 404 metadata shell with `no-store`.
- Manual smoke checks against local site or deployed preview:
  - `/`
  - `/issues/<uid>`
  - `/articles/<uid>`
  - `/about`
  - `/contributors`
  - `/editors-staff`
  - `/in-the-moment`
  - `/submissions`
  - `/support-us`

Edge cases:

- Preview ref cookies should bypass cache.
- Static asset requests should remain served from S3, not the HTML shell.

## Test Plan

Automated:

- `npm run test:api`
- `npm run build:api`
- `npm run build:react`
- `npm run lint`
- `npm run cdk:synth` after `npm run build:react`

Manual/browser:

- Verify home hero, latest issue, archive, memorial, and newsletter content on desktop and mobile.
- Verify issue TOC links, previous/next issue navigation, and absence of duplicate/dead TOC surfaces.
- Verify article references, works cited, previous/next links, and issue backlink.
- Verify `/about`, `/contributors`, `/submissions`, `/support-us`, `/editors-staff`, and `/in-the-moment`.
- Inspect metadata source for article, issue, and content page document responses before hydration.
- Check mobile widths for long links, citations, imported content, and table-of-contents entries.

## Risks and Open Questions

- Some acceptance criteria span both the current Next source of truth and the AWS React path; implementation should avoid "fixing" React in a way that silently diverges from Next.
- Existing branch work already contains partial fixes. The implementation pass should preserve working changes and add missing coverage rather than reworking everything.
- The latest home Issue 20 compact TOC question remains product-sensitive: the plan assumes omission is acceptable unless every visible entry can link.
- Content-page metadata for Next remains a known boundary; AWS can provide route-specific metadata through the HTML shell, but Next issue/content metadata expansion is not included unless prioritized.
- Visual parity needs browser review because API tests cannot prove typography, wrapping, or responsive layout quality.

## Deferred Work

- Sitemap generation from `hide_from_sitemap` and navigation settings.
- Prismic-driven top-level navigation.
- Functional newsletter signup.
- Full production cutover from Next to AWS React.
- Removing temporary React unsupported-slice diagnostics after all production slices are covered.

## Handoff

Recommended next step: `aw-work docs/features/public-journal-experience/plan.md`

Implementation should start with CMS normalization/API tests, then React rendering and shell route coverage, then browser verification. Keep changes narrow to public journal behavior and coordinate with `docs/features/site-shell-and-navigation/plan.md` when touching `apps/react-site/src/App.tsx`, `apps/react-site/src/styles.css`, or CloudFront route configuration.
