# Normalize Prismic Documents at the Data Boundary

The CMS API should convert Prismic documents into page-specific view models before passing data to React pages or reusable UI components. UI components should receive stable, formatted values instead of reaching into raw `document.data` fields when practical.

## Use This When

- Adding or changing Prismic-backed CMS API page data.
- Passing Prismic document data into reusable components.
- Creating list, card, header, navigation, or summary props from CMS documents.

## Do

- Define explicit API response and view-model types.
- Normalize required fields such as `uid`, `tags`, titles, subtitles, dates, issue numbers, and hrefs before rendering.
- Use helper functions like `getSummary()` for reusable document shapes.
- Apply fallback and formatting rules once at the data boundary.

## Avoid

- Passing raw Prismic documents directly into UI components.
- Formatting titles, dates, hrefs, or fallback labels repeatedly inside components.
- Letting components depend on Prismic field priority rules such as `tile_title || hero_title || title || uid`.

## Evidence

- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/react-site/src/api.ts`
- `apps/react-site/src/pages/IssuePage.tsx`
- `apps/react-site/src/pages/ArticlePage.tsx`
