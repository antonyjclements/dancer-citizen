# Keep Page Queries in Feature Data Loaders

React pages should fetch normalized CMS API responses instead of querying Prismic directly. Keep React page files focused on params, composition, and rendering while the CMS API owns Prismic queries and page-shaped return objects.

## Use This When

- Adding or changing a page under `apps/react-site/src/pages`.
- Adding Prismic-backed page data to the CMS API.
- Moving query logic that is growing inside a React page component.

## Do

- Put page-specific Prismic reads and normalization in `apps/cms-api/src/content.ts`.
- Return named API response types from `apps/react-site/src/api.ts`.
- Let React pages call CMS endpoints through shared hooks/helpers and render from normalized responses.
- Return 404s from the CMS API when a missing Prismic document means the page does not exist.

## Avoid

- Calling Prismic query methods directly in React page components.
- Mixing multi-query CMS orchestration into `apps/react-site/src/pages/**`.
- Repeating page data shaping logic across React page components.

## Exceptions

- CMS API route handlers may call the shared Prismic client directly when wiring preview or API behavior.

## Evidence

- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/handler.ts`
- `apps/react-site/src/api.ts`
- `apps/react-site/src/pages/HomePage.tsx`
- `apps/react-site/src/pages/IssuePage.tsx`
- `apps/react-site/src/pages/ArticlePage.tsx`
- `apps/react-site/src/pages/ContentPage.tsx`
