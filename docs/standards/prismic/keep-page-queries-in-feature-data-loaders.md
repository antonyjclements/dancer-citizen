# Keep Page Queries in Feature Data Loaders

Page routes should call feature-level `get*PageData()` functions instead of querying Prismic inline. Keep app route files focused on params, composition, and rendering while data loaders own CMS queries and page-shaped return objects.

## Use This When

- Adding or changing a page under `src/app`.
- Adding Prismic-backed page data for a feature.
- Moving query logic that is growing inside a route component.

## Do

- Put page-specific Prismic reads in `src/features/<feature>/data/get*PageData.ts`.
- Return a named `*PageData` type from each page data loader.
- Let route components await the loader, derive small presentation-only values if needed, and render components.
- Keep `notFound()` handling in the loader when a missing Prismic document means the page does not exist.

## Avoid

- Calling `client.getByUID`, `client.getAllByType`, or other Prismic query methods directly in page components.
- Mixing multi-query CMS orchestration into `src/app/**/page.tsx`.
- Repeating page data shaping logic across route components.

## Exceptions

- API or integration route handlers may call the shared `createClient()` directly when wiring framework behavior, such as Prismic previews.

## Evidence

- `src/app/page.tsx`
- `src/app/issues/[uid]/page.tsx`
- `src/app/articles/[uid]/page.tsx`
- `src/app/[uid]/page.tsx`
- `src/features/journal/data/getHomePageData.ts`
- `src/features/journal/data/getIssuePageData.ts`
- `src/features/journal/data/getArticlePageData.ts`
- `src/features/journal/data/getContentPageData.ts`
- `src/app/api/preview/route.ts`
