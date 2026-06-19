# Use the Shared Prismic Client

All Prismic access must go through `createClient()` from `src/foundation/prismic/prismicClient.ts`. This keeps route resolution, preview support, and cache behavior centralized.

## Use This When

- Reading Prismic content in app routes, feature data loaders, route handlers, or utilities.
- Adding new document types or page data helpers.

## Do

- Import `createClient` from `@/foundation/prismic/prismicClient` for app and feature code.
- Keep repository name, routes, fetch options, preview setup, and cache tags inside the shared client.
- Pass `ClientConfig` overrides into `createClient()` only when a caller has a specific need.

## Avoid

- Calling `@prismicio/client`'s base `createClient` outside the shared client module.
- Re-declaring Prismic routes, repository names, preview setup, or cache settings in feature code.

## Evidence

- `src/foundation/prismic/prismicClient.ts`
- `src/features/journal/data/getHomePageData.ts`
- `src/features/journal/data/getIssuePageData.ts`
- `src/features/journal/data/getArticlePageData.ts`
- `src/features/journal/data/getContentPageData.ts`
- `src/app/api/preview/route.ts`
