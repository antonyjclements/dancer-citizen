# Centralize Prismic Document URL Rules

Prismic document URL generation must stay centralized so routing, previews, summaries, and UI links agree on the same paths. Use `getJournalDocumentHref()` or normalized `href` fields instead of rebuilding document paths inside components.

## Use This When

- Adding a new Prismic document type with a public URL.
- Linking to issue, article, content, or future journal documents.
- Creating view models, summaries, navigation props, cards, or related-content lists.

## Do

- Update `src/foundation/prismic/prismicRoutes.ts` when adding or changing a Prismic document route.
- Update the feature href helper, currently `src/features/journal/data/getJournalDocumentHref.ts`, in the same change.
- Prefer passing normalized `href` values from data loaders into UI components.
- Keep document type unions exhaustive so new types force URL-rule updates.

## Avoid

- Hardcoding `/issues/${uid}`, `/articles/${uid}`, or similar document paths inside components.
- Letting Prismic route definitions and UI href generation drift.
- Adding a new document type without deciding its public URL rule.

## Migration Note

Some existing issue-only components still hardcode `/issues/${uid}`. Treat those as migration targets when touching the area; new document links should use centralized href rules or normalized `href` props.

## Evidence

- `src/foundation/prismic/prismicRoutes.ts`
- `src/features/journal/data/getJournalDocumentHref.ts`
- `src/features/journal/data/getJournalDocumentSummary.ts`
- Migration targets: `src/features/journal/components/IssueArchiveGrid.tsx`, `src/features/journal/components/IssueNavigation.tsx`, `src/features/journal/components/LatestIssuePanel.tsx`
