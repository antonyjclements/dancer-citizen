# Normalize Prismic Documents at the Data Boundary

Feature data loaders should convert Prismic documents into page-specific view models before passing data to route components or UI components. UI components should receive stable, formatted values instead of reaching into raw `document.data` fields.

## Use This When

- Adding or changing Prismic-backed page data loaders.
- Passing Prismic document data into reusable components.
- Creating list, card, header, navigation, or summary props from CMS documents.

## Do

- Define explicit page data and view-model types in the feature layer.
- Normalize required fields such as `uid`, `tags`, titles, subtitles, dates, issue numbers, and hrefs before rendering.
- Use helper functions like `getJournalDocumentSummary()` for reusable document shapes.
- Apply fallback and formatting rules once at the data boundary.

## Avoid

- Passing raw Prismic documents directly into UI components.
- Formatting titles, dates, hrefs, or fallback labels repeatedly inside components.
- Letting components depend on Prismic field priority rules such as `tile_title || hero_title || title || uid`.

## Migration Note

Some existing journal components still receive typed Prismic documents directly. Treat those as migration targets when touching the area; new components should prefer normalized view models.

## Evidence

- `src/features/journal/data/getJournalDocumentSummary.ts`
- `src/features/journal/types/JournalDocumentSummary.ts`
- `src/features/journal/data/getIssuePageData.ts`
- `src/features/journal/components/IssueTableOfContents.tsx`
- Migration targets: `src/features/journal/components/ArticleHeader.tsx`, `src/features/journal/components/IssueArchiveGrid.tsx`, `src/features/journal/components/LatestIssuePanel.tsx`
